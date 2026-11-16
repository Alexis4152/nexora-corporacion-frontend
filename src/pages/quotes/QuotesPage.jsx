import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { opsApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { useAsync, useDebounced } from '../../hooks/useAsync'
import DataTable from '../../components/DataTable'
import Money from '../../components/Money'
import { PageHeader, SearchInput, Select, StatusBadge } from '../../components/ui'
import { QUOTE_STATUS } from '../../utils/labels'
import { date } from '../../utils/format'
import QuoteEditor from './QuoteEditor'

export default function QuotesPage() {
  const { can, user } = useAuth()
  const { users } = useCatalog()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [owner, setOwner] = useState('me')
  const [page, setPage] = useState(0)
  const debounced = useDebounced(q, 300)
  const ownerId = owner === 'me' ? user?.id : owner || undefined
  const { data, loading, reload } = useAsync(() => opsApi.quotes({ q: debounced, status, ownerId, page, size: 25 }), [debounced, status, ownerId, page])
  const creating = params.get('new') === '1'
  useEffect(() => setPage(0), [debounced, status, owner])
  return (
    <>
      <PageHeader eyebrow="Comercial" title="Cotizaciones" description="Versionadas: una cotización enviada no se edita, se crea una versión nueva. Genera PDF con la marca corporativa."
        actions={can('quotes.manage') && <button className="btn-primary" onClick={() => setParams({ new: '1' })}><Plus className="h-4 w-4" />Nueva cotización</button>} />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-white/[.06]">
          <SearchInput value={q} onChange={setQ} placeholder="Folio, título o cliente…" className="w-full sm:w-72" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} wrapClass="w-full sm:w-44" aria-label="Estado"><option value="">Vigentes</option>{Object.entries(QUOTE_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select value={owner} onChange={(e) => setOwner(e.target.value)} wrapClass="w-full sm:w-48" aria-label="Responsable">
            <option value="me">Mis cotizaciones</option><option value="">Todo el equipo</option>{users.filter((u) => u.id !== user?.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
          <span className="ml-auto text-xs muted">{data?.totalElements ?? '…'} cotizaciones</span>
        </div>
        <DataTable loading={loading} rows={data?.content} page={data} onPage={setPage} onRowClick={(r) => navigate(`/cotizaciones/${r.id}`)} columns={[
          { key: 'folio', header: 'Cotización', render: (r) => <div><p className="font-mono text-xs font-semibold">{r.folio} · v{r.versionNo}</p><p className="text-sm font-medium">{r.title}</p></div> },
          { key: 'targetName', header: 'Para', render: (r) => <div><p className="text-sm">{r.targetName}</p><p className="text-[11px] muted">{r.customerId ? 'Cliente' : 'Prospecto'}</p></div> },
          { key: 'total', header: 'Total', align: 'right', render: (r) => <Money value={r.total} strong /> },
          { key: 'validUntil', header: 'Vigencia', render: (r) => date(r.validUntil) },
          { key: 'status', header: 'Estado', render: (r) => <StatusBadge map={QUOTE_STATUS} value={r.status} /> },
          { key: 'ownerName', header: 'Responsable', hideOnMobile: true },
        ]} />
      </div>
      {creating && <QuoteEditor prospectId={params.get('prospectId')} customerId={params.get('customerId')} onClose={() => setParams({})} onDone={(r) => { setParams({}); reload(); navigate(`/cotizaciones/${r.quote.id}`) }} />}
    </>
  )
}

