import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, HandCoins } from 'lucide-react'
import { billingApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { useQuick } from '../../context/QuickActions'
import { useAsync, useDebounced } from '../../hooks/useAsync'
import { useQueryState } from '../../hooks/useQueryState'
import DataTable from '../../components/DataTable'
import Money from '../../components/Money'
import { ActionMenu, Checkbox, PageHeader, ProductChip, SearchInput, Select, Skeleton } from '../../components/ui'
import { COLLECTION_ACTION } from '../../utils/labels'
import { date, money, timeAgo } from '../../utils/format'

const BUCKET_COLORS = ['#10b981', '#facc15', '#fb923c', '#f97316', '#ef4444', '#b91c1c', '#7f1d1d']

export default function ReceivablesPage() {
  const { can } = useAuth()
  const { users, byCode } = useCatalog()
  const quick = useQuick()
  const navigate = useNavigate()
  const [f, set] = useQueryState({ q: '', bucket: '', responsibleId: '', overdueOnly: '', page: '0', sort: '' })
  const [q, setQ] = useState(f.q)
  const debounced = useDebounced(q, 300)
  useEffect(() => { if (debounced !== f.q) set({ q: debounced }) }, [debounced]) // eslint-disable-line
  const aging = useAsync(() => billingApi.aging(), [])
  const { data, loading, reload } = useAsync(() => billingApi.receivables({ ...f, overdueOnly: f.overdueOnly === 'true', page: Number(f.page), size: 25 }),
    [f.q, f.bucket, f.responsibleId, f.overdueOnly, f.page, f.sort])
  const total = aging.data?.reduce((a, b) => a + Number(b.amount), 0) || 0
  const overdue = aging.data?.filter((b) => b.key !== 'current').reduce((a, b) => a + Number(b.amount), 0) || 0
  return (
    <>
      <PageHeader eyebrow="Cobranza" title="Cuentas por cobrar" description="Cartera por antigüedad (intervalos configurables), morosidad por cliente y seguimiento de gestiones." />
      <section className="card mb-6 p-5 sm:p-6">
        {aging.loading ? <Skeleton className="h-28" /> : (
          <>
            <div className="mb-5 flex flex-wrap items-end gap-x-10 gap-y-2">
              <div><p className="text-xs muted">Cartera total</p><p className="font-display text-3xl font-extrabold tabular">{money(total)}</p></div>
              <div><p className="text-xs muted">Vencida</p><p className="font-display text-2xl font-extrabold tabular text-rose-600">{money(overdue)}</p></div>
              <div><p className="text-xs muted">% vencido</p><p className="font-display text-2xl font-extrabold tabular">{total ? `${((overdue * 100) / total).toFixed(1)} %` : '—'}</p></div>
            </div>
            <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
              {aging.data.map((b, i) => Number(b.amount) > 0 && <div key={b.key} style={{ width: `${(Number(b.amount) * 100) / total}%`, background: BUCKET_COLORS[i] }} title={`${b.label}: ${money(b.amount)}`} />)}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {aging.data.map((b, i) => (
                <button key={b.key} onClick={() => set({ bucket: f.bucket === b.key ? '' : b.key })} className={`rounded-xl p-3 text-left ring-1 transition ${f.bucket === b.key ? 'ring-2 ring-brand-500' : 'ring-slate-200 hover:bg-slate-50 dark:ring-white/10 dark:hover:bg-white/[.03]'}`}>
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold muted"><span className="h-2 w-2 rounded-full" style={{ background: BUCKET_COLORS[i] }} />{b.label}</p>
                  <p className="mt-1 font-display text-base font-bold tabular">{money(b.amount)}</p>
                  <p className="text-[11px] muted">{b.customers} cliente(s) · {b.charges} cargo(s)</p>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-white/[.06]">
          <SearchInput value={q} onChange={setQ} placeholder="Cliente o código…" className="w-full sm:w-64" />
          <Select value={f.responsibleId} onChange={(e) => set({ responsibleId: e.target.value })} wrapClass="w-full sm:w-52" aria-label="Responsable"><option value="">Todos los responsables</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          <div className="px-1"><Checkbox checked={f.overdueOnly === 'true'} onChange={(v) => set({ overdueOnly: v ? 'true' : '' })} label="Solo con vencido" /></div>
          <span className="ml-auto text-xs muted">{data?.totalElements ?? '…'} clientes con saldo</span>
        </div>
        <DataTable loading={loading} rows={data?.content} rowKey="customerId" page={data} onPage={(p) => set({ page: String(p) })} sort={f.sort} onSort={(s) => set({ sort: s })}
          onRowClick={(r) => navigate(`/clientes/${r.customerId}?tab=cobranza`)} columns={[
            { key: 'customerName', header: 'Cliente', sort: 'customer', render: (r) => <div><p className="font-semibold">{r.customerName}</p><p className="text-xs muted">{r.phone || r.email}</p></div> },
            { key: 'products', header: 'Productos', render: (r) => <div className="flex flex-wrap gap-1">{r.products.map((c) => <ProductChip key={c} code={c} color={byCode[c]?.color} />)}</div> },
            { key: 'openAmount', header: 'Saldo', align: 'right', sort: 'open', render: (r) => <Money value={r.openAmount} /> },
            { key: 'overdueAmount', header: 'Vencido', align: 'right', sort: 'overdue', render: (r) => <div className="text-right"><Money value={r.overdueAmount} tone={Number(r.overdueAmount) ? 'red' : 'muted'} strong />{r.overduePeriods > 0 && <p className="text-[11px] muted">{r.overduePeriods} periodo(s)</p>}</div> },
            { key: 'daysOverdue', header: 'Atraso', sort: 'days', render: (r) => (r.daysOverdue ? <span className={`font-semibold ${r.daysOverdue > 30 ? 'text-rose-600' : 'text-amber-600'}`}>{r.daysOverdue} días</span> : <span className="muted">Al día</span>) },
            { key: 'lastPaymentOn', header: 'Último pago', hideOnMobile: true, render: (r) => (r.lastPaymentOn ? <div><p className="text-sm">{date(r.lastPaymentOn)}</p><p className="text-[11px] muted">{money(r.lastPaymentAmount)}</p></div> : <span className="muted">Nunca</span>) },
            { key: 'lastActionAt', header: 'Última gestión', hideOnMobile: true, render: (r) => (r.lastActionAt ? <div><p className="text-sm">{COLLECTION_ACTION[r.lastActionType]}</p><p className="text-[11px] muted">{timeAgo(r.lastActionAt)}</p></div> : <span className="text-xs text-amber-600">Sin gestión</span>) },
            { key: 'nextActionOn', header: 'Próxima acción', sort: 'nextAction', render: (r) => (r.nextActionOn ? <div><p className="text-sm">{date(r.nextActionOn)}</p><p className="text-[11px] muted">{r.responsibleName}</p></div> : <span className="muted">—</span>) },
            { key: 'x', header: '', render: (r) => (
              <ActionMenu items={[
                can('payments.create') && { icon: CreditCard, label: 'Registrar pago', run: () => quick.open('payment', { customer: { id: r.customerId, tradeName: r.customerName, code: r.customerCode }, onDone: () => { reload(); aging.reload() } }) },
                can('collections.manage') && { icon: HandCoins, label: 'Registrar gestión', run: () => navigate(`/clientes/${r.customerId}?tab=cobranza`) },
              ]} />
            ) },
          ]} />
      </div>
    </>
  )
}

