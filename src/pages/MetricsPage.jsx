import { useState } from 'react'
import { BookOpen, Coins, Flame, Gauge, Repeat, Scale, Target, TrendingUp, Users } from 'lucide-react'
import { analyticsApi } from '../api'
import { useAsync } from '../hooks/useAsync'
import { useCatalog } from '../context/CatalogContext'
import { Card, Kpi, PageHeader, Segmented, Select, Skeleton, Tabs } from '../components/ui'
import { Chart, Legend } from '../components/charts'
import { money, moneyCompact, monthLabel, pct } from '../utils/format'

export default function MetricsPage() {
  const { activeProducts } = useCatalog()
  const [months, setMonths] = useState(12)
  const [productId, setProductId] = useState('')
  const [tab, setTab] = useState('mrr')
  const { data, loading } = useAsync(() => analyticsApi.saas({ months, productId }), [months, productId])
  const cohorts = useAsync(() => (tab === 'cohorts' ? analyticsApi.cohorts({ months: 12, productId }) : Promise.resolve(null)), [tab, productId])
  const rows = data?.months || []
  const last = rows[rows.length - 1]
  const prev = rows[rows.length - 2]
  const u = data?.unitEconomics
  const delta = (a, b) => (b && Number(b) ? ((Number(a) - Number(b)) * 100) / Math.abs(Number(b)) : undefined)
  return (
    <>
      <PageHeader eyebrow="Indicadores SaaS" title="Métricas de ingreso recurrente" description="MRR sin IVA, normalizado a mes y con descuentos vigentes. Las pruebas y suscripciones suspendidas no aportan MRR."
        actions={<>
          <Select value={productId} onChange={(e) => setProductId(e.target.value)} aria-label="Producto"><option value="">Toda la empresa</option>{activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          <Segmented value={months} onChange={setMonths} options={[[6, '6 m'], [12, '12 m'], [24, '24 m']]} />
        </>} />
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi icon={Repeat} label="MRR" value={last ? money(last.mrrEnd) : '—'} delta={last && delta(last.mrrEnd, prev?.mrrEnd)} loading={loading} sub={last && `Neto del mes ${money(last.netNewMrr)}`} />
        <Kpi icon={TrendingUp} tone="accent" label="ARR" value={last ? moneyCompact(last.arr) : '—'} loading={loading} sub="MRR × 12 (contrato vigente)" />
        <Kpi icon={Gauge} tone="green" label="NRR (mes)" value={last?.nrr != null ? pct(last.nrr) : '—'} loading={loading} sub={last?.grr != null && `GRR ${pct(last.grr)}`} />
        <Kpi icon={Flame} tone="red" label="Churn de clientes (mes)" value={last?.customerChurnRate != null ? pct(last.customerChurnRate) : '—'} inverse loading={loading}
          sub={last && `${last.churnedCustomers} de ${last.customersStart} clientes · ingresos ${pct(last.revenueChurnRate)}`} />
        <Kpi icon={Users} tone="sky" label="ARPA" value={last?.arpa != null ? money(last.arpa) : '—'} delta={last && delta(last.arpa, prev?.arpa)} loading={loading} sub={last && `${last.customersEnd} clientes con MRR`} />
        <Kpi icon={Coins} tone="violet" label="LTV" value={u?.ltv != null ? money(u.ltv) : '—'} loading={loading} sub={u ? (u.ltv != null ? `ARPA ÷ churn promedio ${pct(u.avgMonthlyCustomerChurn, 2)}` : u.ltvReason) : ''} />
        <Kpi icon={Target} tone="amber" label="CAC" value={u?.cac != null ? money(u.cac) : '—'} loading={loading} sub={u ? (u.cac != null ? `${moneyCompact(u.acquisitionSpend)} ÷ ${u.newCustomers3m} clientes (3 m)` : u.cacReason) : ''} />
        <Kpi icon={Scale} tone="brand" label="LTV / CAC" value={u?.ltvToCac != null ? `${Number(u.ltvToCac).toFixed(1)}×` : '—'} loading={loading} sub={u?.ltvToCac != null ? (u.ltvToCac >= 3 ? 'Saludable (≥ 3×)' : 'Por debajo de 3×') : 'Requiere LTV y CAC confiables'} />
      </section>
      <Tabs className="mt-6" value={tab} onChange={setTab} items={[{ key: 'mrr', label: 'Movimientos de MRR' }, { key: 'retention', label: 'Retención' }, { key: 'cohorts', label: 'Cohortes' }, { key: 'defs', label: 'Fórmulas', icon: BookOpen }]} />
      <div className="mt-6 space-y-6">
        {tab === 'mrr' && (
          <>
            <Card title="Composición del crecimiento" subtitle="New + Expansion + Reactivation − Contraction − Churn" actions={<Legend series={['New', 'Expansion', 'Reactivation', 'Contraction', 'Churn']} colors={['#10b981', 'rgb(var(--brand-500))', '#0ea5e9', '#f59e0b', '#f43f5e']} />}>
              {loading ? <Skeleton className="h-64" /> : <Chart points={rows.map((r) => ({ label: r.month, values: [r.newMrr, r.expansionMrr, r.reactivationMrr, r.contractionMrr, r.churnMrr] }))}
                series={['New', 'Expansion', 'Reactivation', 'Contraction', 'Churn']} colors={['#10b981', 'rgb(var(--brand-500))', '#0ea5e9', '#f59e0b', '#f43f5e']} format="money" height={280} />}
            </Card>
            <Card title="Detalle mensual" pad={false}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="table-head bg-slate-50/70 dark:bg-white/[.02]"><tr>{['Mes', 'MRR inicial', 'New', 'Expansion', 'Contraction', 'Churn', 'Reactivation', 'MRR final', 'Clientes', 'Churn cl.', 'NRR', 'GRR', 'ARPA'].map((h) => <th key={h} className={h === 'Mes' ? '' : 'text-right'}>{h}</th>)}</tr></thead>
                  <tbody>
                    {[...rows].reverse().map((r) => (
                      <tr key={r.month} className="table-row">
                        <td className="font-semibold capitalize">{monthLabel(r.month)}</td>
                        <td className="text-right tabular">{money(r.mrrStart)}</td>
                        <td className="text-right tabular text-emerald-600">{money(r.newMrr)}</td>
                        <td className="text-right tabular text-brand-600 dark:text-brand-300">{money(r.expansionMrr)}</td>
                        <td className="text-right tabular text-amber-600">{money(r.contractionMrr)}</td>
                        <td className="text-right tabular text-rose-600">{money(r.churnMrr)}</td>
                        <td className="text-right tabular text-sky-600">{money(r.reactivationMrr)}</td>
                        <td className="text-right font-semibold tabular">{money(r.mrrEnd)}</td>
                        <td className="text-right tabular">{r.customersEnd}</td>
                        <td className="text-right tabular">{pct(r.customerChurnRate)}</td>
                        <td className="text-right tabular">{pct(r.nrr)}</td>
                        <td className="text-right tabular">{pct(r.grr)}</td>
                        <td className="text-right tabular">{money(r.arpa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
        {tab === 'retention' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="NRR y GRR" subtitle="Retención neta y bruta de ingresos por mes" actions={<Legend series={['NRR', 'GRR']} />}>
              <Chart kind="line" points={rows.map((r) => ({ label: r.month, values: [r.nrr ?? 0, r.grr ?? 0] }))} series={['NRR', 'GRR']} format="percent" height={260} />
            </Card>
            <Card title="Churn" subtitle="Clientes e ingresos perdidos por mes" actions={<Legend series={['Clientes', 'Ingresos']} colors={['#f43f5e', '#f59e0b']} />}>
              <Chart points={rows.map((r) => ({ label: r.month, values: [r.customerChurnRate ?? 0, r.revenueChurnRate ?? 0] }))} series={['Clientes', 'Ingresos']} colors={['#f43f5e', '#f59e0b']} format="percent" height={260} />
            </Card>
            <Card title="MRR y ARPA" subtitle="Evolución" className="xl:col-span-2">
              <Chart kind="line" points={rows.map((r) => ({ label: r.month, values: [r.mrrEnd] }))} series={['MRR']} format="money" height={220} />
            </Card>
          </div>
        )}
        {tab === 'cohorts' && (
          <Card title="Cohortes de clientes" subtitle={cohorts.data?.definition}>
            {cohorts.loading || !cohorts.data ? <Skeleton className="h-80" /> : <CohortGrid data={cohorts.data.cohorts} />}
          </Card>
        )}
        {tab === 'defs' && (
          <div className="grid gap-4 md:grid-cols-2">
            {data?.definitions.map((d) => (
              <div key={d.key} className="card p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">{d.key}</p><p className="mt-1 font-display font-bold">{d.name}</p><p className="mt-2 text-sm muted">{d.formula}</p></div>
            ))}
            <div className="card p-5 md:col-span-2">
              <p className="font-display font-bold">Reglas que nunca se rompen</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm muted">
                <li>Cobrado (dinero recibido), facturado (cargos emitidos), devengado (servicio prestado) y MRR (contrato vigente) son conceptos distintos y nunca se suman.</li>
                <li>El MRR histórico sale del libro inmutable de eventos de suscripción: un mes cerrado no cambia aunque hoy cambie un contrato.</li>
                <li>Los movimientos se clasifican a nivel cliente: si un cliente cancela un producto pero conserva otro, es Contraction, no Churn.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function CohortGrid({ data }) {
  const [metric, setMetric] = useState('retention')
  const maxOffset = Math.max(0, ...data.map((c) => c.cells.length - 1))
  const color = (v) => (v == null ? 'transparent' : `rgb(var(--brand-500) / ${Math.max(0.08, Math.min(1, Number(v) / 100)) * 0.9})`)
  return (
    <div className="space-y-4">
      <Segmented size="sm" value={metric} onChange={setMetric} options={[['retention', 'Clientes retenidos'], ['revenueRetention', 'Retención de ingresos']]} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-xs">
          <thead><tr className="text-slate-500"><th className="p-2 text-left">Cohorte</th><th className="p-2 text-right">Clientes</th>{[...Array(maxOffset + 1)].map((_, i) => <th key={i} className="p-2 text-center">M{i}</th>)}</tr></thead>
          <tbody>
            {data.filter((c) => c.customers > 0).map((c) => (
              <tr key={c.cohort}>
                <td className="whitespace-nowrap p-2 font-semibold capitalize">{monthLabel(c.cohort)}</td>
                <td className="p-2 text-right tabular">{c.customers}</td>
                {[...Array(maxOffset + 1)].map((_, i) => {
                  const cell = c.cells[i]
                  const v = cell?.[metric]
                  return <td key={i} className="p-0.5"><div className={`grid h-9 place-items-center rounded-md font-semibold tabular ${v != null && v > 55 ? 'text-white' : ''}`} style={{ background: color(v) }} title={cell ? `${cell.retained} clientes · ${money(cell.mrr)}` : ''}>{v != null ? `${Math.round(v)}%` : ''}</div></td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

