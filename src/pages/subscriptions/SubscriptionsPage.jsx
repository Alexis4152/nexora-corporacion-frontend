import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { subscriptionsApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { useQuick } from '../../context/QuickActions'
import { useAsync, useDebounced } from '../../hooks/useAsync'
import { useQueryState } from '../../hooks/useQueryState'
import DataTable from '../../components/DataTable'
import Money from '../../components/Money'
import { PageHeader, ProductChip, SearchInput, Select, StatusBadge } from '../../components/ui'
import { COLLECTION_STATUS, PERIODS, PERIOD_SHORT, SUBSCRIPTION_STATUS } from '../../utils/labels'
import { date, money } from '../../utils/format'

export default function SubscriptionsPage() {
  const { can } = useAuth()
  const { activeProducts, byId, users } = useCatalog()
  const quick = useQuick()
  const navigate = useNavigate()
  const [f, set] = useQueryState({ q: '', status: 'LIVE', collection: '', productId: '', planId: '', period: '', sellerId: '', page: '0', sort: '' })
  const [q, setQ] = useState(f.q)
  const debounced = useDebounced(q, 300)
  useEffect(() => { if (debounced !== f.q) set({ q: debounced }) }, [debounced]) // eslint-disable-line
  const { data, loading } = useAsync(() => subscriptionsApi.list({ ...f, page: Number(f.page), size: 25 }), [f.q, f.status, f.collection, f.productId, f.planId, f.period, f.sellerId, f.page, f.sort])
  const product = byId[f.productId]
  return (
    <>
      <PageHeader eyebrow="Motor de suscripciones" title="Suscripciones" description="Ciclo de vida y estado de cobranza son independientes: una suscripción puede estar activa y con un pago vencido."
        actions={can('subscriptions.create') && <button className="btn-primary" onClick={() => quick.open('subscription', { onDone: (r) => navigate(`/suscripciones/${r.row.id}`) })}><Plus className="h-4 w-4" />Nueva suscripción</button>} />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-white/[.06]">
          <SearchInput value={q} onChange={setQ} placeholder="Código o cliente…" className="w-full sm:w-64" />
          <Select value={f.status} onChange={(e) => set({ status: e.target.value })} wrapClass="w-full sm:w-48" aria-label="Estado">
            <option value="">Todos los estados</option><option value="LIVE">Vigentes</option>{Object.entries(SUBSCRIPTION_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          <Select value={f.collection} onChange={(e) => set({ collection: e.target.value })} wrapClass="w-full sm:w-48" aria-label="Cobranza">
            <option value="">Toda la cobranza</option>{Object.entries(COLLECTION_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          <Select value={f.productId} onChange={(e) => set({ productId: e.target.value, planId: '' })} wrapClass="w-full sm:w-44" aria-label="Producto"><option value="">Todos los productos</option>{activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          {product && <Select value={f.planId} onChange={(e) => set({ planId: e.target.value })} wrapClass="w-full sm:w-40" aria-label="Plan"><option value="">Todos los planes</option>{product.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}
          <Select value={f.period} onChange={(e) => set({ period: e.target.value })} wrapClass="w-full sm:w-36" aria-label="Periodicidad"><option value="">Periodicidad</option>{Object.entries(PERIODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select value={f.sellerId} onChange={(e) => set({ sellerId: e.target.value })} wrapClass="w-full sm:w-44" aria-label="Vendedor"><option value="">Todos los vendedores</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          <span className="ml-auto text-xs muted">{data?.totalElements ?? '…'} suscripciones</span>
        </div>
        <DataTable loading={loading} rows={data?.content} page={data} onPage={(p) => set({ page: String(p) })} sort={f.sort} onSort={(s) => set({ sort: s })}
          onRowClick={(r) => navigate(`/suscripciones/${r.id}`)} columns={[
            { key: 'code', header: 'Suscripción', sort: 'code', render: (r) => <div><p className="font-mono text-xs font-semibold">{r.code}</p><Link to={`/clientes/${r.customerId}`} onClick={(e) => e.stopPropagation()} className="text-sm font-medium hover:underline">{r.customerName}</Link></div> },
            { key: 'product', header: 'Producto · plan', render: (r) => <div className="flex items-center gap-2"><ProductChip code={r.productCode} color={r.productColor} /><span className="text-sm">{r.planName}</span></div> },
            { key: 'price', header: 'Precio', align: 'right', sort: 'price', render: (r) => <span className="tabular">{money(r.price)}<span className="text-xs muted">{PERIOD_SHORT[r.billingPeriod]}</span></span> },
            { key: 'mrr', header: 'MRR', align: 'right', sort: 'mrr', render: (r) => <Money value={r.mrr} tone={Number(r.mrr) ? '' : 'muted'} /> },
            { key: 'status', header: 'Estado', render: (r) => <StatusBadge map={SUBSCRIPTION_STATUS} value={r.status} /> },
            { key: 'collectionStatus', header: 'Cobranza', render: (r) => <div><StatusBadge map={COLLECTION_STATUS} value={r.collectionStatus} dot={false} />{r.overdueAmount > 0 && <p className="mt-0.5 text-[11px] font-semibold text-rose-600">{money(r.overdueAmount)} · {r.daysOverdue} d</p>}</div> },
            { key: 'currentPeriodEnd', header: 'Fin de periodo', sort: 'periodEnd', render: (r) => (r.status === 'TRIAL' ? <span className="text-sky-600">Prueba al {date(r.trialEndsOn)}</span> : date(r.currentPeriodEnd)) },
            { key: 'sellerName', header: 'Vendedor', hideOnMobile: true, render: (r) => r.sellerName || <span className="muted">—</span> },
          ]} />
      </div>
    </>
  )
}

