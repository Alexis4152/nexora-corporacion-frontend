import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowUpRight, BarChart3, Bell, Building2, CalendarClock, ClipboardList, Coins, CreditCard, Flame, HandCoins, Hourglass, PauseCircle, Percent,
  PiggyBank, Repeat, Rocket, Target, TrendingUp, UserCheck, UserMinus, UserPlus, Users, Wallet, XCircle,
} from 'lucide-react'
import { analyticsApi, customersApi } from '../api'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { useQuick } from '../context/QuickActions'
import { Card, EmptyState, ErrorState, Kpi, ProductChip, Skeleton } from '../components/ui'
import { Chart, Donut, Funnel, HBars, Legend, Sparkline } from '../components/charts'
import PeriodPicker, { periodOf } from '../components/PeriodPicker'
import { SUBSCRIPTION_STATUS, STAGES, label } from '../utils/labels'
import { date, int, money, moneyCompact, pct } from '../utils/format'

const STATUS_COLORS = { ACTIVE: '#10b981', GRACE: '#f59e0b', TRIAL: '#0ea5e9', SUSPENDED: '#ef4444', CANCEL_SCHEDULED: '#fb923c', CANCELLED: '#94a3b8', EXPIRED: '#cbd5e1', PENDING_ACTIVATION: '#64748b' }
const EVENT_ICON = { CHARGE_DUE: Coins, RENEWAL: Repeat, CANCELLATION: XCircle, TRIAL_END: Hourglass, FOLLOW_UP: Target, DEMO: Rocket, ACTIVITY: CalendarClock, COLLECTION: HandCoins, PROMISE: HandCoins, QUOTE_EXPIRES: ClipboardList }

function greeting() {
  const h = Number(new Intl.DateTimeFormat('es-MX', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Mexico_City' }).format(new Date()))
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export default function DashboardPage() {
  const { user, can } = useAuth()
  if (!can('dashboard.read')) {
    return <div className="card"><EmptyState icon={Building2} title={`Hola, ${user.firstName}`} description="Usa el menú para entrar a los módulos que tu rol tiene habilitados." /></div>
  }
  return <Executive />
}

function Executive() {
  const { user, can } = useAuth()
  const { activeProducts } = useCatalog()
  const quick = useQuick()
  const navigate = useNavigate()
  const [period, setPeriod] = useState({ preset: 'month', ...periodOf('month') })
  const [productId, setProductId] = useState('')
  const [planId, setPlanId] = useState('')
  const product = activeProducts.find((p) => String(p.id) === String(productId))
  const { data, loading, error, reload } = useAsync(() => analyticsApi.dashboard({ from: period.from, to: period.to, productId, planId }), [period.from, period.to, productId, planId])
  const upcoming = useAsync(() => (can('calendar.read') ? analyticsApi.calendar(period.to > new Date().toISOString().slice(0, 10) ? new Date().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)) : Promise.resolve([])), [])
  const risk = useAsync(() => (can('customers.read') ? customersApi.atRisk(6) : Promise.resolve([])), [])
  const m = data?.money
  const c = data?.customers
  const p = data?.prospects
  const s = data?.subscriptions
  const ch = data?.charts
  const today = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' }).format(new Date())
  const mrrSeries = useMemo(() => ch?.mrrEvolution?.points?.map((x) => x.values[0]) || [], [ch])

  const actions = [
    can('customers.create') && [Building2, 'Registrar cliente', () => quick.open('customer', { onDone: (r) => navigate(`/clientes/${r.id}`) })],
    can('prospects.create') && [Target, 'Registrar prospecto', () => quick.open('prospect', { onDone: () => navigate('/crm') })],
    can('subscriptions.create') && [Repeat, 'Crear suscripción', () => quick.open('subscription', { onDone: (r) => navigate(`/suscripciones/${r.row.id}`) })],
    can('payments.create') && [CreditCard, 'Registrar pago', () => quick.open('payment', { onDone: reload })],
    can('collections.read') && [AlertTriangle, 'Consultar adeudos', () => navigate('/cobranza/cartera')],
    can('expenses.manage') && [ClipboardList, 'Registrar gasto', () => quick.open('expense')],
    (can('reports.financial_read') || can('reports.commercial_read')) && [BarChart3, 'Generar reporte', () => navigate('/reportes')],
    [Bell, 'Revisar alertas', () => navigate('/notificaciones')],
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-ink-900 p-6 text-white shadow-lift sm:p-8">
        <div className="mesh absolute inset-0 opacity-90" />
        <div className="grid-lines absolute inset-0 opacity-60" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-brand-200/90">{today}</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{greeting()}, {user.firstName}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/65">El estado real de Nexora: clientes, ingresos recurrentes, cobranza y embudo comercial.</p>
            {m && (
              <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
                <div>
                  <p className="text-xs text-white/55">MRR actual</p>
                  <p className="font-display text-4xl font-extrabold tabular tracking-tight">{money(m.mrr)}</p>
                  {m.mrrGrowth != null && <p className={`mt-1 text-xs font-semibold ${m.mrrGrowth >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{m.mrrGrowth >= 0 ? '▲' : '▼'} {Math.abs(m.mrrGrowth)} % vs. inicio del periodo</p>}
                </div>
                <div><p className="text-xs text-white/55">ARR</p><p className="font-display text-2xl font-bold tabular">{moneyCompact(m.arr)}</p></div>
                <div><p className="text-xs text-white/55">Clientes que pagan</p><p className="font-display text-2xl font-bold tabular">{int(m.payingCustomers)}</p></div>
                <div className="hidden w-48 sm:block"><Sparkline values={mrrSeries} color="rgb(var(--accent-300))" height={48} /></div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
            <PeriodPicker value={period} onChange={setPeriod} />
            <div className="flex gap-2">
              <select className="input h-9 w-auto border-white/10 bg-white/10 text-[13px] text-white" value={productId} onChange={(e) => { setProductId(e.target.value); setPlanId('') }} aria-label="Producto">
                <option value="">Todos los productos</option>{activeProducts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              {product && (
                <select className="input h-9 w-auto border-white/10 bg-white/10 text-[13px] text-white" value={planId} onChange={(e) => setPlanId(e.target.value)} aria-label="Plan">
                  <option value="">Todos los planes</option>{product.plans.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {actions.map(([Icon, l, run]) => (
          <button key={l} onClick={run} className="card inline-flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-[13px] font-semibold transition hover:-translate-y-0.5 hover:shadow-lift">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Icon className="h-4 w-4" /></span>{l}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}

      {data?.financial && (
        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Kpi icon={Wallet} tone="accent" label="Cobrado en el periodo" value={m ? money(m.collectedPeriod) : '—'} delta={m?.collectedVariation} loading={loading && !m}
            sub={m && `Hoy ${money(m.collectedToday)} · Año ${moneyCompact(m.collectedYear)}`} />
          <Kpi icon={HandCoins} tone="amber" label="Cuentas por cobrar" value={m ? money(m.receivable) : '—'} loading={loading && !m} onClick={() => navigate('/cobranza/cartera')}
            sub={m && <span>Vencido <b className="text-rose-500">{money(m.overdue)}</b></span>} />
          <Kpi icon={CalendarClock} tone="sky" label="Pagos próximos a vencer" value={m ? money(m.due_soon) : '—'} loading={loading && !m} sub={m && `${m.due_soon_count} cargo(s) en los próximos días`} />
          <Kpi icon={PiggyBank} tone="violet" label="Facturado en el periodo" value={m ? money(m.billedPeriod) : '—'} delta={m?.billedVariation} loading={loading && !m} sub="Cargos emitidos con IVA" />
          <Kpi icon={TrendingUp} tone="brand" label="Crecimiento del MRR" value={m?.mrrGrowth != null ? pct(m.mrrGrowth) : '—'} loading={loading && !m} sub="Contra el MRR al inicio del periodo" />
          <Kpi icon={Coins} tone="green" label="Ingreso promedio por cliente" value={m?.arpa != null ? money(m.arpa) : '—'} loading={loading && !m} sub="ARPA mensual sin IVA" />
          <Kpi icon={Flame} tone="red" label="Churn de clientes" value={m?.customerChurnRate != null ? pct(m.customerChurnRate) : '—'} loading={loading && !m} inverse sub="Clientes que dejaron de pagar en el periodo" />
          <Kpi icon={Hourglass} tone="slate" label="Capturado sin confirmar" value={m ? money(m.capturedPending) : '—'} loading={loading && !m} sub="Pagos registrados pendientes de verificar" onClick={() => navigate('/cobranza/pagos?status=CAPTURED')} />
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
        <Kpi icon={Users} label="Clientes únicos" value={c ? int(c.total) : '—'} loading={loading && !c} onClick={() => navigate('/clientes')} />
        <Kpi icon={UserCheck} tone="green" label="Activos" value={c ? int(c.active) : '—'} loading={loading && !c} onClick={() => navigate('/clientes?relationship=ACTIVE')} />
        <Kpi icon={Hourglass} tone="sky" label="En prueba" value={c ? int(c.trial) : '—'} loading={loading && !c} onClick={() => navigate('/clientes?relationship=TRIAL')} />
        <Kpi icon={PauseCircle} tone="red" label="Suspendidos" value={c ? int(c.suspended) : '—'} loading={loading && !c} onClick={() => navigate('/clientes?relationship=SUSPENDED')} />
        <Kpi icon={UserMinus} tone="slate" label="Cancelados" value={c ? int(c.cancelled) : '—'} loading={loading && !c} onClick={() => navigate('/clientes?relationship=CANCELLED')} />
        <Kpi icon={AlertTriangle} tone="amber" label="Con pagos vencidos" value={c ? int(c.with_overdue) : '—'} loading={loading && !c} onClick={() => navigate('/clientes?overdue=true')} />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <Kpi icon={Target} tone="violet" label="Prospectos activos" value={p ? int(p.active) : '—'} loading={loading && !p} onClick={() => navigate('/crm')}
          sub={p?.weighted_pipeline != null && `Pipeline ponderado ${moneyCompact(p.weighted_pipeline)}`} />
        <Kpi icon={UserPlus} tone="brand" label="Prospectos nuevos" value={p ? int(p.new_in_period) : '—'} loading={loading && !p}
          delta={p && p.new_prev ? ((p.new_in_period - p.new_prev) * 100) / p.new_prev : undefined} />
        <Kpi icon={Rocket} tone="green" label="Convertidos" value={p ? int(p.converted_in_period) : '—'} loading={loading && !p} sub={p?.conversion_rate != null && `Conversión ${pct(p.conversion_rate)}`} />
        <Kpi icon={Repeat} tone="accent" label="Nuevas suscripciones" value={s ? int(s.new_in_period) : '—'} loading={loading && !s}
          delta={s && s.new_prev ? ((s.new_in_period - s.new_prev) * 100) / s.new_prev : undefined} sub={s && `${s.trials_started} prueba(s) iniciada(s)`} />
        <Kpi icon={XCircle} tone="red" label="Suscripciones canceladas" value={s ? int(s.cancelled_in_period) : '—'} loading={loading && !s} inverse
          delta={s && s.cancelled_prev ? ((s.cancelled_in_period - s.cancelled_prev) * 100) / s.cancelled_prev : undefined} />
      </section>

      {data?.financial && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card title="Ingresos de los últimos 12 meses" subtitle="Cobrado (dinero recibido) y facturado (cargos emitidos). No se suman." className="xl:col-span-2"
            actions={<Legend series={ch?.revenue12m?.series} />}>
            {!ch ? <Skeleton className="h-64" /> : <Chart points={ch.revenue12m.points} series={ch.revenue12m.series} format="money" height={260} />}
          </Card>
          <Card title="Ingresos por producto" subtitle="Pagos aplicados en el periodo">
            {!ch ? <Skeleton className="h-64" /> : <HBars data={ch.revenueByProduct.map((r) => ({ label: r.label.replace(/^NEXORA\s+/i, ''), value: r.value, color: r.color }))} format="money" empty="Sin cobros aplicados en el periodo" />}
          </Card>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        {data?.financial && (
          <Card title="Evolución del MRR" subtitle="Ingreso recurrente mensual al cierre de cada mes" className="xl:col-span-2">
            {!ch ? <Skeleton className="h-60" /> : <Chart kind="line" points={ch.mrrEvolution.points} series={ch.mrrEvolution.series} format="money" height={240} />}
          </Card>
        )}
        <Card title="Estados de suscripción" subtitle="Distribución actual" className={data?.financial ? '' : 'xl:col-span-1'}>
          {!ch ? <Skeleton className="h-44" /> : <Donut data={ch.statusDistribution.map((r) => ({ label: label(SUBSCRIPTION_STATUS, r.label), value: r.value, color: STATUS_COLORS[r.label] }))} sub="suscripciones" />}
        </Card>
        {!data?.financial && (
          <Card title="Embudo comercial" subtitle="Prospectos por etapa" className="xl:col-span-2">
            {!ch ? <Skeleton className="h-44" /> : <Funnel data={['NEW', 'CONTACTED', 'QUALIFIED', 'DEMO_SCHEDULED', 'DEMO_DONE', 'QUOTE_SENT', 'NEGOTIATION', 'WON'].map((k) => ({ label: label(STAGES, k), value: ch.funnel.find((x) => x.label === k)?.value || 0 }))} />}
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="Clientes activos por producto" subtitle="Suscripciones vigentes">
          {!ch ? <Skeleton className="h-44" /> : <Donut data={ch.activeByProduct.map((r) => ({ label: r.label.replace(/^NEXORA\s+/i, ''), value: r.value, color: r.color }))} sub="activas" />}
        </Card>
        <Card title="Altas y bajas por mes" subtitle="Activaciones contra cancelaciones y expiraciones" actions={<Legend series={ch?.newVsCancelled?.series} colors={['#10b981', '#f43f5e']} />}>
          {!ch ? <Skeleton className="h-44" /> : <Chart points={ch.newVsCancelled.points} series={ch.newVsCancelled.series} colors={['#10b981', '#f43f5e']} height={200} />}
        </Card>
        <Card title="Prospectos por producto" subtitle="Oportunidades abiertas por interés">
          {!ch ? <Skeleton className="h-44" /> : <HBars data={ch.prospectsByProduct.map((r) => ({ label: r.label.replace(/^NEXORA\s+/i, ''), value: r.value, color: r.color }))} />}
        </Card>
      </div>

      {data?.financial && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card title="Cobranza realizada vs. pendiente" subtitle="Cargos por mes de vencimiento" actions={<Legend series={ch?.collectedVsPending?.series} colors={['rgb(var(--accent-500))', '#f59e0b']} />}>
            {!ch ? <Skeleton className="h-52" /> : <Chart points={ch.collectedVsPending.points} series={ch.collectedVsPending.series} stacked colors={['rgb(var(--accent-500))', '#f59e0b']} format="money" height={220} />}
          </Card>
          <Card title="Productos más rentables" subtitle="Cobrado aplicado menos gastos del producto (estimado)">
            {!ch ? <Skeleton className="h-52" /> : (
              <ul className="space-y-3">
                {[...ch.profitableProducts].sort((a, b) => (b.income - b.expenses) - (a.income - a.expenses)).map((r) => {
                  const result = Number(r.income) - Number(r.expenses)
                  return (
                    <li key={r.label} className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                      <span className="flex-1 truncate text-sm">{r.label.replace(/^NEXORA\s+/i, '')}</span>
                      <span className="text-right text-xs tabular muted">{moneyCompact(r.income)} − {moneyCompact(r.expenses)}</span>
                      <span className={`w-24 text-right text-sm font-bold tabular ${result >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>{moneyCompact(result)}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
          <Card title="Clientes con mayor facturación" subtitle="Total cobrado histórico">
            {!ch ? <Skeleton className="h-52" /> : (
              <ol className="space-y-2.5">
                {ch.topCustomers.map((r, i) => (
                  <li key={r.id}>
                    <Link to={`/clientes/${r.id}`} className="flex items-center gap-3 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[.03]">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500 dark:bg-white/5">{i + 1}</span>
                      <span className="flex-1 truncate text-sm font-medium">{r.label}</span>
                      <span className="text-sm font-semibold tabular">{money(r.value)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        {data?.financial && (
          <Card title="Embudo comercial" subtitle="Prospectos abiertos y ganados en el periodo">
            {!ch ? <Skeleton className="h-52" /> : <Funnel data={['NEW', 'CONTACTED', 'QUALIFIED', 'DEMO_SCHEDULED', 'DEMO_DONE', 'QUOTE_SENT', 'NEGOTIATION', 'WON'].map((k) => ({ label: label(STAGES, k), value: ch.funnel.find((x) => x.label === k)?.value || 0 }))} />}
          </Card>
        )}
        <Card title="Próximos 7 días" subtitle="Cobros, renovaciones, seguimientos y demostraciones" actions={<Link to="/calendario" className="btn-ghost btn-sm">Calendario <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
          {upcoming.loading ? <Skeleton className="h-52" /> : !upcoming.data?.length ? <p className="py-10 text-center text-sm muted">Sin pendientes en los próximos días.</p> : (
            <ul className="max-h-[300px] space-y-1 overflow-y-auto pr-1 scrollbar-thin">
              {upcoming.data.slice(0, 30).map((e, i) => {
                const Icon = EVENT_ICON[e.type] || CalendarClock
                return (
                  <li key={i}>
                    <Link to={e.link} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-white/[.03]">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${e.overdue ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : 'bg-slate-100 text-slate-500 dark:bg-white/5'}`}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{e.title}</span><span className="block truncate text-xs muted">{e.subtitle}</span></span>
                      <span className="shrink-0 text-xs font-semibold muted">{date(e.date).replace(/ de \d{4}$/, '')}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
        <Card title="Clientes en riesgo" subtitle="Salud comercial explicable (atrasos, tickets, cancelaciones)" actions={<Link to="/clientes?sort=-daysOverdue" className="btn-ghost btn-sm">Ver <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
          {risk.loading ? <Skeleton className="h-52" /> : !risk.data?.length ? <p className="py-10 text-center text-sm muted">Ningún cliente en riesgo. 🎉</p> : (
            <ul className="space-y-2">
              {risk.data.map((r) => (
                <li key={r.customerId}>
                  <Link to={`/clientes/${r.customerId}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-white/[.03]">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-sm font-extrabold ${r.score < 50 ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'}`}>{r.score}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{r.name}</span><span className="block truncate text-xs muted">{r.factors.map((f) => f.label).join(' · ')}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data?.financial && ch?.subscriptionsHistory && (
        <Card title="Evolución histórica de suscripciones" subtitle="Suscripciones activas al cierre de cada mes">
          <Chart kind="line" points={ch.subscriptionsHistory.points} series={ch.subscriptionsHistory.series} colors={['rgb(var(--accent-500))']} height={200} />
        </Card>
      )}
      {!data?.financial && <p className="text-center text-xs muted">Los indicadores financieros solo se muestran a roles con acceso a información financiera.</p>}
      <div className="flex flex-wrap justify-center gap-2 pb-2">{activeProducts.map((x) => <Link key={x.id} to={`/productos/${x.code}`}><ProductChip code={x.name.replace(/^NEXORA\s+/i, '')} color={x.color} size="md" /></Link>)}</div>
    </div>
  )
}

