import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, Download, FileSpreadsheet, FileText, Info, Sheet } from 'lucide-react'
import { analyticsApi } from '../api'
import { download, errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { Card, EmptyState, PageHeader, Select, Skeleton } from '../components/ui'
import { Chart, HBars, Legend, fmt } from '../components/charts'
import PeriodPicker, { periodOf } from '../components/PeriodPicker'
import { CANCEL_REASONS, LOST_REASONS, SOURCES, STAGES, SUBSCRIPTION_STATUS, PERIODS, PAYMENT_STATUS, METHODS, EVENT_TYPES, label } from '../utils/labels'
import { date } from '../utils/format'

const DECODE = { stage: STAGES, reason: { ...CANCEL_REASONS, ...LOST_REASONS }, source: SOURCES, status: { ...SUBSCRIPTION_STATUS, ...PAYMENT_STATUS }, period: PERIODS, method: METHODS, type: EVENT_TYPES }

export default function ReportsPage() {
  const { can } = useAuth()
  const { activeProducts } = useCatalog()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const catalog = useAsync(() => analyticsApi.reports(), [])
  const type = params.get('r') || 'income-monthly'
  const [period, setPeriod] = useState({ preset: 'last12', ...periodOf('last12') })
  const [productId, setProductId] = useState('')
  const report = useAsync(() => analyticsApi.report(type, { from: period.from, to: period.to, productId }), [type, period.from, period.to, productId])
  useEffect(() => { if (catalog.data && !catalog.data.some((r) => r.type === type) && catalog.data[0]) setParams({ r: catalog.data[0].type }) }, [catalog.data]) // eslint-disable-line
  const groups = useMemo(() => (catalog.data || []).reduce((acc, r) => { (acc[r.group] ||= []).push(r); return acc }, {}), [catalog.data])
  const r = report.data
  const exportAs = (format) => download(`/reports/${type}/export`, { format, from: period.from, to: period.to, productId: productId || undefined }).catch((e) => toast.error(errorMessage(e)))
  const cell = (row, col) => {
    const v = row[col.key]
    if (col.format === 'date') return date(v)
    if (col.format === 'text' && DECODE[col.key] && v) return label(DECODE[col.key], v)
    return col.format === 'text' ? (v ?? '—') : fmt(v, col.format === 'count' ? 'number' : col.format)
  }
  return (
    <>
      <PageHeader eyebrow="Business Intelligence" title="Reportes" description="Cada reporte declara su base. Las exportaciones usan exactamente los mismos filtros y permisos que la pantalla, y quedan auditadas." />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-5">
          {catalog.loading ? <Skeleton className="h-96" /> : Object.entries(groups).map(([g, items]) => (
            <div key={g}>
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">{g}</p>
              <ul className="space-y-0.5">
                {items.map((it) => (
                  <li key={it.type}><button onClick={() => setParams({ r: it.type })} className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition ${it.type === type ? 'bg-brand-600 text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>{it.title}</button></li>
                ))}
              </ul>
            </div>
          ))}
        </aside>
        <div className="min-w-0 space-y-5">
          <div className="card flex flex-wrap items-center gap-2 p-4">
            <PeriodPicker value={period} onChange={setPeriod} />
            <Select value={productId} onChange={(e) => setProductId(e.target.value)} wrapClass="w-full sm:w-48" aria-label="Producto"><option value="">Todos los productos</option>{activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
            {can('reports.export') && (
              <div className="flex gap-1.5 sm:ml-auto">
                <button className="btn-secondary btn-sm" onClick={() => exportAs('xlsx')}><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>
                <button className="btn-secondary btn-sm" onClick={() => exportAs('csv')}><Sheet className="h-3.5 w-3.5" />CSV</button>
                <button className="btn-secondary btn-sm" onClick={() => exportAs('pdf')}><FileText className="h-3.5 w-3.5" />PDF</button>
              </div>
            )}
          </div>
          {report.error ? <div className="card"><EmptyState icon={BarChart3} title="No se pudo generar" description={report.error} /></div> : report.loading && !r ? <Skeleton className="h-[480px]" /> : r && (
            <>
              <div className="card p-5 sm:p-6">
                <h2 className="font-display text-xl font-extrabold">{r.title}</h2>
                <p className="mt-1 flex items-start gap-1.5 text-sm muted"><Info className="mt-0.5 h-4 w-4 shrink-0" />{r.basis}</p>
                <p className="mt-1 text-xs text-slate-400">Periodo {date(r.from)} – {date(r.to)} · {r.currency}</p>
                {r.totals?.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {r.totals.slice(0, 6).map((t) => <div key={t.key} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/[.03]"><p className="text-[11px] muted">{t.label}</p><p className="font-display text-lg font-bold tabular">{fmt(t.value, t.format === 'count' ? 'number' : t.format)}</p></div>)}
                  </div>
                )}
                {r.chart && r.chart.points.length > 0 && (
                  <div className="mt-6">
                    <div className="mb-2 flex justify-end"><Legend series={r.chart.series} /></div>
                    {r.chart.kind === 'hbar'
                      ? <HBars data={r.chart.points.map((p) => ({ label: DECODE.reason[p.label] || DECODE.stage[p.label]?.[0] || p.label, value: p.values[0] }))} format={r.chart.format} />
                      : <Chart kind={r.chart.kind === 'line' ? 'line' : 'bar'} points={r.chart.points.map((p) => ({ ...p, label: STAGES[p.label]?.[0] || p.label }))} series={r.chart.series} format={r.chart.format} height={260} />}
                  </div>
                )}
              </div>
              <Card pad={false} title={`${r.rows.length} fila(s)`}>
                <div className="max-h-[560px] overflow-auto scrollbar-thin">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="table-head sticky top-0 bg-slate-50 dark:bg-ink-850"><tr>{r.columns.map((c) => <th key={c.key} className={c.format === 'text' || c.format === 'date' ? '' : 'text-right'}>{c.label}</th>)}</tr></thead>
                    <tbody>
                      {r.rows.map((row, i) => (
                        <tr key={i} className="table-row">{r.columns.map((c) => <td key={c.key} className={c.format === 'text' || c.format === 'date' ? '' : 'text-right tabular'}>{cell(row, c)}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                  {!r.rows.length && <EmptyState title="Sin datos en el periodo" compact />}
                </div>
                {r.notes?.length > 0 && <div className="border-t border-slate-100 px-5 py-3 text-xs muted dark:border-white/[.06]">{r.notes.map((n) => <p key={n}>{n}</p>)}</div>}
              </Card>
            </>
          )}
          <p className="flex items-center gap-1.5 text-xs muted"><Download className="h-3 w-3" />Las celdas que empiezan con = + − @ se neutralizan en CSV/Excel para evitar fórmulas maliciosas.</p>
        </div>
      </div>
    </>
  )
}

