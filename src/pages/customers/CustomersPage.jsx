import { useNavigate } from 'react-router-dom'
import { Download, Plus } from 'lucide-react'
import { customersApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { useQuick } from '../../context/QuickActions'
import { useAsync, useDebounced } from '../../hooks/useAsync'
import { useQueryState } from '../../hooks/useQueryState'
import DataTable from '../../components/DataTable'
import Money from '../../components/Money'
import { Avatar, Badge, Checkbox, PageHeader, ProductChip, SearchInput, Select, StatusBadge } from '../../components/ui'
import { RELATIONSHIP } from '../../utils/labels'
import { date } from '../../utils/format'
import { useEffect, useState } from 'react'

const REL_FILTERS = [['', 'Todos'], ['ACTIVE', 'Activos'], ['TRIAL', 'En prueba'], ['SUSPENDED', 'Suspendidos'], ['CANCELLED', 'Cancelados'], ['NO_SUBSCRIPTION', 'Sin suscripción']]

export default function CustomersPage() {
  const { can } = useAuth()
  const { activeProducts, users, byCode } = useCatalog()
  const quick = useQuick()
  const navigate = useNavigate()
  const [f, set] = useQueryState({ q: '', relationship: '', productId: '', tagId: '', ownerId: '', overdue: '', page: '0', sort: 'tradeName', archived: '' })
  const [q, setQ] = useState(f.q)
  const debounced = useDebounced(q, 300)
  useEffect(() => { if (debounced !== f.q) set({ q: debounced }) }, [debounced]) // eslint-disable-line
  const [tags, setTags] = useState([])
  useEffect(() => { customersApi.tags().then(setTags).catch(() => {}) }, [])
  const { data, loading, reload } = useAsync(() => customersApi.list({ ...f, overdue: f.overdue === 'true' || undefined, archived: f.archived === 'true', page: Number(f.page), size: 25 }),
    [f.q, f.relationship, f.productId, f.tagId, f.ownerId, f.overdue, f.page, f.sort, f.archived])
  const money = data?.content?.[0]?.mrr !== undefined && data?.content?.[0]?.mrr !== null

  return (
    <>
      <PageHeader eyebrow="Directorio corporativo" title="Clientes" description="Una empresa, un registro: contrate uno o varios productos. Abre un cliente para ver su ficha 360°."
        actions={can('customers.create') && <button className="btn-primary" onClick={() => quick.open('customer', { onDone: (r) => navigate(`/clientes/${r.id}`) })}><Plus className="h-4 w-4" />Nuevo cliente</button>} />
      <div className="no-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1">
        {REL_FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => set({ relationship: k })} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${f.relationship === k ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10'}`}>{l}</button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-white/[.06]">
          <SearchInput value={q} onChange={setQ} placeholder="Nombre, correo, código, teléfono…" className="w-full sm:w-80" />
          <Select value={f.productId} onChange={(e) => set({ productId: e.target.value })} wrapClass="w-full sm:w-44" aria-label="Producto"><option value="">Todos los productos</option>{activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          <Select value={f.tagId} onChange={(e) => set({ tagId: e.target.value })} wrapClass="w-full sm:w-44" aria-label="Etiqueta"><option value="">Todas las etiquetas</option>{tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
          <Select value={f.ownerId} onChange={(e) => set({ ownerId: e.target.value })} wrapClass="w-full sm:w-44" aria-label="Ejecutivo"><option value="">Todos los ejecutivos</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          {money && <div className="px-1"><Checkbox checked={f.overdue === 'true'} onChange={(v) => set({ overdue: v ? 'true' : '' })} label="Con adeudo vencido" /></div>}
          <div className="px-1"><Checkbox checked={f.archived === 'true'} onChange={(v) => set({ archived: v ? 'true' : '' })} label="Archivados" /></div>
          <span className="ml-auto text-xs muted">{data?.totalElements ?? '…'} clientes</span>
        </div>
        <DataTable loading={loading} rows={data?.content} page={data} onPage={(p) => set({ page: String(p) })} sort={f.sort} onSort={(s) => set({ sort: s })}
          onRowClick={(r) => navigate(`/clientes/${r.id}`)}
          columns={[
            { key: 'tradeName', header: 'Cliente', sort: 'tradeName', render: (r) => (
              <div className="flex items-center gap-3"><Avatar name={r.tradeName} />
                <div className="min-w-0"><p className="truncate font-semibold">{r.tradeName}</p><p className="truncate text-xs muted"><span className="font-mono">{r.code}</span> · {r.email}</p>
                  {r.tags.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{r.tags.map((t) => <span key={t.id} className="rounded px-1.5 text-[10px] font-semibold" style={{ background: `${t.color}22`, color: t.color }}>{t.name}</span>)}</div>}
                </div></div>
            ) },
            { key: 'products', header: 'Productos', render: (r) => <div className="flex flex-wrap gap-1">{r.products.length ? r.products.map((c) => <ProductChip key={c} code={c} color={byCode[c]?.color} />) : <span className="text-xs muted">—</span>}</div> },
            { key: 'relationship', header: 'Relación', render: (r) => <StatusBadge map={RELATIONSHIP} value={r.relationship} /> },
            money && { key: 'mrr', header: 'MRR', align: 'right', sort: 'mrr', render: (r) => <Money value={r.mrr} tone={Number(r.mrr) ? '' : 'muted'} /> },
            money && { key: 'balance', header: 'Saldo', align: 'right', sort: 'overdue', render: (r) => (
              <div className="text-right"><Money value={r.balance} tone={Number(r.balance) ? '' : 'muted'} />{Number(r.overdue) > 0 && <p className="text-[11px] font-semibold text-rose-600">Vencido <Money value={r.overdue} /> · {r.daysOverdue} d</p>}</div>
            ) },
            { key: 'ownerName', header: 'Ejecutivo', hideOnMobile: true, render: (r) => r.ownerName || <span className="muted">—</span> },
            { key: 'customerSince', header: 'Cliente desde', sort: 'since', hideOnMobile: true, render: (r) => date(r.customerSince) },
          ]} />
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-1 text-xs muted"><Download className="h-3 w-3" />Exporta el directorio desde Reportes → Ingresos por cliente. <Badge>Los importes solo se ven con permiso financiero</Badge></p>
      <span className="hidden">{String(reload).length}</span>
    </>
  )
}

