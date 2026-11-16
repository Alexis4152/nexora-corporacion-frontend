import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ExternalLink, Hourglass, PauseCircle, Plus, Repeat, Target, TrendingUp, UserCheck, Wallet, XCircle } from 'lucide-react'
import { analyticsApi } from '../api'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { useQuick } from '../context/QuickActions'
import { Badge, Card, EmptyState, Kpi, Skeleton, StatusBadge } from '../components/ui'
import { Chart, HBars, Legend } from '../components/charts'
import { ProductTile } from '../components/ProductIcon'
import PeriodPicker, { periodOf } from '../components/PeriodPicker'
import { COLLECTION_STATUS, PERIODS, SUBSCRIPTION_STATUS } from '../utils/labels'
import { date, int, money, moneyCompact } from '../utils/format'

export default function ProductDashboardPage() {
  const { code } = useParams()
  const { byCode } = useCatalog()
  const product = byCode[code]
  if (!product) return <div className="card"><EmptyState title="Producto no encontrado" description="Verifica el catálogo." /></div>
  return <ProductView key={product.id} product={product} />
}

function ProductView({ product }) {
  const { can } = useAuth()
  const quick = useQuick()
  const navigate = useNavigate()
  const [period, setPeriod] = useState({ preset: 'month', ...periodOf('month') })
  const { data, loading, reload } = useAsync(() => analyticsApi.product(product.id, { from: period.from, to: period.to }), [product.id, period.from, period.to])
  const m = data?.money
  const sc = data?.subscriptionCounts
  const ch = data?.charts
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lift sm:p-8" style={{ background: `linear-gradient(135deg, ${product.color}, #0b0d17 85%)` }}>
        <div className="grid-lines absolute inset-0 opacity-50" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <ProductTile product={product} size="h-14 w-14" iconClass="h-7 w-7" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.2em] text-white/70">{product.category}</p>
              <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{product.name}</h1>
              <p className="mt-1 text-sm text-white/70">{product.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
                {m && <div><p className="text-xs text-white/55">MRR del producto</p><p className="font-display text-3xl font-extrabold tabular">{money(m.mrr)}</p></div>}
                {sc && <div><p className="text-xs text-white/55">Suscripciones activas</p><p className="font-display text-3xl font-extrabold tabular">{int(sc.active)}</p></div>}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <PeriodPicker value={period} onChange={setPeriod} />
            <div className="flex gap-2">
              {product.systemUrl && <a href={product.systemUrl} target="_blank" rel="noreferrer" className="btn-secondary btn-sm border-0 bg-white/10 text-white ring-white/20 hover:bg-white/20"><ExternalLink className="h-3.5 w-3.5" />Abrir sistema</a>}
              {can('subscriptions.create') && <button className="btn-sm btn bg-white text-ink-900 hover:bg-white/90" onClick={() => quick.open('subscription', { productId: String(product.id), onDone: reload })}><Plus className="h-3.5 w-3.5" />Nueva suscripción</button>}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi icon={UserCheck} tone="green" label="Clientes activos" value={sc ? int(sc.active) : '—'} loading={loading && !sc} sub={sc && `${sc.grace} en gracia`} onClick={() => navigate(`/suscripciones?productId=${product.id}&status=ACTIVE`)} />
        <Kpi icon={Hourglass} tone="sky" label="En prueba gratuita" value={sc ? int(sc.trial) : '—'} loading={loading && !sc} onClick={() => navigate(`/suscripciones?productId=${product.id}&status=TRIAL`)} />
        <Kpi icon={PauseCircle} tone="red" label="Suspendidas" value={sc ? int(sc.suspended) : '—'} loading={loading && !sc} />
        <Kpi icon={XCircle} tone="slate" label="Canceladas" value={sc ? int(sc.cancelled) : '—'} loading={loading && !sc} />
        <Kpi icon={Target} tone="violet" label="Prospectos interesados" value={data?.prospects ? int(data.prospects.active) : '—'} loading={loading && !data} onClick={() => navigate(`/crm?productId=${product.id}`)} />
        {m && <Kpi icon={Wallet} tone="accent" label="Ventas del periodo" value={money(m.collectedPeriod)} delta={m.collectedVariation} sub="Cobrado aplicado a este producto" />}
        {m && <Kpi icon={AlertTriangle} tone="amber" label="Cuentas por cobrar" value={money(m.receivable)} sub={`Vencido ${money(m.overdue)}`} />}
        <Kpi icon={Repeat} tone="brand" label="Nuevas contrataciones" value={data?.subscriptions ? int(data.subscriptions.new_in_period) : '—'} loading={loading && !data}
          sub={data?.subscriptions && `${data.subscriptions.cancelled_in_period} cancelación(es) en el periodo`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        {m && (
          <Card title="Histórico de ingresos" subtitle="Cobrado aplicado y facturado del producto" className="xl:col-span-2" actions={<Legend series={ch?.revenue12m?.series} />}>
            {!ch ? <Skeleton className="h-60" /> : <Chart points={ch.revenue12m.points} series={ch.revenue12m.series} format="money" height={240} colors={[product.color, '#94a3b8']} />}
          </Card>
        )}
        <Card title="Planes más contratados" subtitle="Suscripciones vigentes por plan">
          {!data ? <Skeleton className="h-52" /> : <HBars data={data.topPlans.map((r) => ({ ...r, color: product.color }))} />}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {m && (
          <Card title="Evolución del MRR" subtitle="Al cierre de cada mes">
            {!ch ? <Skeleton className="h-52" /> : <Chart kind="line" points={ch.mrrEvolution.points} series={ch.mrrEvolution.series} format="money" height={220} colors={[product.color]} />}
          </Card>
        )}
        <Card title="Altas y bajas" subtitle="Por mes" actions={<Legend series={ch?.newVsCancelled?.series} colors={['#10b981', '#f43f5e']} />}>
          {!ch ? <Skeleton className="h-52" /> : <Chart points={ch.newVsCancelled.points} series={ch.newVsCancelled.series} colors={['#10b981', '#f43f5e']} height={220} />}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Próximos vencimientos" subtitle="Renovaciones y fin de pruebas en 30 días" pad={false}>
          <ul className="divide-y divide-slate-100 dark:divide-white/[.06]">
            {!data ? <li className="p-5"><Skeleton className="h-32" /></li> : data.upcoming.length === 0 ? <li className="p-8 text-center text-sm muted">Sin vencimientos próximos</li> : data.upcoming.map((u) => (
              <li key={`${u.kind}-${u.id}`}><Link to={`/suscripciones/${u.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/[.02]">
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{u.customer}</span><span className="block text-xs muted">{u.kind === 'TRIAL_END' ? 'Fin de prueba' : u.auto_renew ? 'Renovación automática' : 'Renovación manual'} · {u.code}</span></span>
                <span className="text-xs font-semibold">{date(u.date)}</span></Link></li>
            ))}
          </ul>
        </Card>
        {data?.arrears && (
          <Card title="Clientes con atrasos" subtitle="Saldo vencido de este producto" pad={false}>
            <ul className="divide-y divide-slate-100 dark:divide-white/[.06]">
              {data.arrears.length === 0 ? <li className="p-8 text-center text-sm muted">Nadie con atraso 🎉</li> : data.arrears.map((a) => (
                <li key={a.id}><Link to={`/clientes/${a.customer_id}?tab=cobranza`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/[.02]">
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{a.customer}</span><span className="block text-xs text-rose-500">{a.days_overdue} días · <StatusBadge map={COLLECTION_STATUS} value={a.collection_status} dot={false} /></span></span>
                  <span className="text-sm font-bold tabular text-rose-600">{money(a.overdue_amount)}</span></Link></li>
              ))}
            </ul>
          </Card>
        )}
        <Card title="Rendimiento comercial" subtitle="Últimos 90 días">
          {!data ? <Skeleton className="h-32" /> : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini l="Abiertos" v={int(data.commercial.open)} />
                <Mini l="Ganados" v={int(data.commercial.won90)} tone="text-emerald-600" />
                <Mini l="Perdidos" v={int(data.commercial.lost90)} tone="text-rose-600" />
              </div>
              {data.commercial.won90 + data.commercial.lost90 > 0 && (
                <div>
                  <div className="mb-1 flex justify-between text-xs"><span className="muted">Tasa de cierre</span><b>{Math.round((data.commercial.won90 * 100) / (data.commercial.won90 + data.commercial.lost90))} %</b></div>
                  <div className="h-2 overflow-hidden rounded-full bg-rose-100 dark:bg-rose-500/20"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(data.commercial.won90 * 100) / (data.commercial.won90 + data.commercial.lost90)}%` }} /></div>
                </div>
              )}
              <div className="border-t border-slate-100 pt-3 dark:border-white/[.06]">
                <p className="mb-2 text-xs font-semibold muted">Planes y precios vigentes</p>
                <ul className="space-y-1.5">
                  {product.plans.filter((p) => p.active).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5">{p.name}{p.highlighted && <Badge tone="brand">Popular</Badge>}</span>
                      <span className="text-xs tabular muted">{p.prices.length ? p.prices.map((x) => `${moneyCompact(x.amount)} ${PERIODS[x.billingPeriod].slice(0, 3).toLowerCase()}`).join(' · ') : 'A la medida'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>
      </div>
      <p className="text-center text-xs muted"><TrendingUp className="mr-1 inline h-3 w-3" />Un cliente con varios productos cuenta una vez en el dashboard corporativo y una vez en el de cada producto. Estados: {Object.values(SUBSCRIPTION_STATUS).slice(1, 4).map((x) => x[0]).join(', ')}…</p>
    </div>
  )
}

function Mini({ l, v, tone = '' }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[.03]"><p className="text-[11px] muted">{l}</p><p className={`font-display text-xl font-extrabold tabular ${tone}`}>{v}</p></div>
}

