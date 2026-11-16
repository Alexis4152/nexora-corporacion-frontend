import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Inbox, Plus, Siren, Timer } from 'lucide-react'
import { opsApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { useQuick } from '../../context/QuickActions'
import { useAsync, useDebounced } from '../../hooks/useAsync'
import DataTable from '../../components/DataTable'
import { Avatar, Checkbox, Kpi, PageHeader, ProductChip, SearchInput, Select, StatusBadge } from '../../components/ui'
import { TICKET_CATEGORY, TICKET_PRIORITY, TICKET_STATUS } from '../../utils/labels'
import { num, timeAgo } from '../../utils/format'

export default function TicketsPage() {
  const { can } = useAuth()
  const { activeProducts, users } = useCatalog()
  const quick = useQuick()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [productId, setProductId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [openOnly, setOpenOnly] = useState(true)
  const [mine, setMine] = useState(false)
  const [page, setPage] = useState(0)
  const debounced = useDebounced(q, 300)
  const metrics = useAsync(() => opsApi.ticketMetrics({ productId }), [productId])
  const { data, loading, reload } = useAsync(() => opsApi.tickets({ q: debounced, status, priority, productId, assigneeId, openOnly, mine, page, size: 25 }), [debounced, status, priority, productId, assigneeId, openOnly, mine, page])
  const m = metrics.data
  return (
    <>
      <PageHeader eyebrow="Soporte" title="Tickets" description="Incidencias por cliente y producto, con tiempos de atención. Los clientes con problemas frecuentes bajan su salud comercial."
        actions={can('support.manage') && <button className="btn-primary" onClick={() => quick.open('ticket', { onDone: (r) => navigate(`/soporte/${r.ticket.id}`) })}><Plus className="h-4 w-4" />Nuevo ticket</button>} />
      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Inbox} label="Abiertos" value={m ? num(m.open) : '—'} loading={metrics.loading} sub={m && `${m.last30} creados en 30 días`} />
        <Kpi icon={Siren} tone="red" label="Alta prioridad abiertos" value={m ? num(m.urgent) : '—'} loading={metrics.loading} />
        <Kpi icon={Clock} tone="sky" label="Primera respuesta" value={m?.avg_first_response_hours != null ? `${num(m.avg_first_response_hours)} h` : '—'} loading={metrics.loading} sub="Promedio, 90 días" />
        <Kpi icon={Timer} tone="green" label="Tiempo de resolución" value={m?.avg_resolution_hours != null ? `${num(m.avg_resolution_hours)} h` : '—'} loading={metrics.loading} sub="Promedio, 90 días" />
      </section>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-white/[.06]">
          <SearchInput value={q} onChange={setQ} placeholder="Folio, asunto o cliente…" className="w-full sm:w-60" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} wrapClass="w-full sm:w-40" aria-label="Estado"><option value="">Estado</option>{Object.entries(TICKET_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} wrapClass="w-full sm:w-36" aria-label="Prioridad"><option value="">Prioridad</option>{Object.entries(TICKET_PRIORITY).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select value={productId} onChange={(e) => setProductId(e.target.value)} wrapClass="w-full sm:w-40" aria-label="Producto"><option value="">Producto</option>{activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} wrapClass="w-full sm:w-44" aria-label="Responsable"><option value="">Responsable</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          <Checkbox checked={openOnly} onChange={setOpenOnly} label="Solo abiertos" />
          <Checkbox checked={mine} onChange={setMine} label="Asignados a mí" />
        </div>
        <DataTable loading={loading} rows={data?.content} page={data} onPage={setPage} onRowClick={(r) => navigate(`/soporte/${r.id}`)} columns={[
          { key: 'subject', header: 'Ticket', render: (r) => <div><p className="font-semibold">{r.subject}</p><p className="text-xs muted"><span className="font-mono">{r.folio}</span> · {r.customerName} · {TICKET_CATEGORY[r.category]}</p></div> },
          { key: 'productCode', header: 'Producto', render: (r) => (r.productCode ? <ProductChip code={r.productCode} color={r.productColor} /> : '—') },
          { key: 'priority', header: 'Prioridad', render: (r) => <StatusBadge map={TICKET_PRIORITY} value={r.priority} /> },
          { key: 'status', header: 'Estado', render: (r) => <StatusBadge map={TICKET_STATUS} value={r.status} /> },
          { key: 'assigneeName', header: 'Responsable', render: (r) => (r.assigneeName ? <span className="inline-flex items-center gap-2"><Avatar name={r.assigneeName} size="h-6 w-6 text-[9px]" />{r.assigneeName}</span> : <span className="text-xs text-amber-600">Sin asignar</span>) },
          { key: 'updatedAt', header: 'Actividad', render: (r) => <span className="text-xs muted">{timeAgo(r.updatedAt)}</span> },
        ]} />
      </div>
      <span className="hidden">{String(reload).length}</span>
    </>
  )
}

