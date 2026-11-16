import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ClipboardList, Coins, Hourglass, HandCoins, Repeat, Rocket, Target, XCircle, CalendarClock } from 'lucide-react'
import { analyticsApi } from '../api'
import { useAsync } from '../hooks/useAsync'
import { PageHeader, Segmented, Skeleton } from '../components/ui'
import { todayIso } from '../utils/format'

const TYPES = {
  CHARGE_DUE: ['Cobro', Coins, 'bg-amber-500'], RENEWAL: ['Renovación', Repeat, 'bg-emerald-500'], CANCELLATION: ['Cancelación', XCircle, 'bg-rose-500'],
  TRIAL_END: ['Fin de prueba', Hourglass, 'bg-sky-500'], FOLLOW_UP: ['Seguimiento', Target, 'bg-violet-500'], DEMO: ['Demostración', Rocket, 'bg-fuchsia-500'],
  ACTIVITY: ['Actividad', CalendarClock, 'bg-indigo-500'], COLLECTION: ['Cobranza', HandCoins, 'bg-orange-500'], PROMISE: ['Promesa de pago', HandCoins, 'bg-orange-600'],
  QUOTE_EXPIRES: ['Cotización', ClipboardList, 'bg-slate-500'],
}
const WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function CalendarPage() {
  const [month, setMonth] = useState(todayIso().slice(0, 7))
  const [view, setView] = useState('month')
  const [filter, setFilter] = useState(new Set(Object.keys(TYPES)))
  const [y, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const last = new Date(Date.UTC(y, m, 0))
  const from = first.toISOString().slice(0, 10)
  const to = last.toISOString().slice(0, 10)
  const { data, loading } = useAsync(() => analyticsApi.calendar(from, to), [from, to])
  const events = useMemo(() => (data || []).filter((e) => filter.has(e.type)), [data, filter])
  const byDay = useMemo(() => events.reduce((acc, e) => { (acc[e.date] ||= []).push(e); return acc }, {}), [events])
  const offset = (first.getUTCDay() + 6) % 7
  const cells = [...Array(offset).fill(null), ...Array.from({ length: last.getUTCDate() }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)]
  const shift = (n) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); setMonth(d.toISOString().slice(0, 7)) }
  const today = todayIso()
  const title = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first)
  const toggle = (k) => setFilter((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })

  return (
    <>
      <PageHeader eyebrow="Agenda corporativa" title="Calendario" description="Próximos cobros, renovaciones, fin de pruebas, seguimientos, demostraciones y gestiones de cobranza."
        actions={<Segmented value={view} onChange={setView} options={[['month', 'Mes'], ['agenda', 'Agenda']]} />} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button className="btn-secondary btn-sm h-9 w-9 px-0" onClick={() => shift(-1)} aria-label="Mes anterior"><ChevronLeft className="h-4 w-4" /></button>
          <button className="btn-secondary btn-sm h-9" onClick={() => setMonth(today.slice(0, 7))}>Hoy</button>
          <button className="btn-secondary btn-sm h-9 w-9 px-0" onClick={() => shift(1)} aria-label="Mes siguiente"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <h2 className="font-display text-xl font-bold capitalize">{title}</h2>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          {Object.entries(TYPES).map(([k, [l, , dot]]) => (
            <button key={k} onClick={() => toggle(k)} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition ${filter.has(k) ? 'ring-slate-300 dark:ring-white/20' : 'opacity-40 ring-slate-200 dark:ring-white/10'}`}>
              <span className={`h-2 w-2 rounded-full ${dot}`} />{l}
            </button>
          ))}
        </div>
      </div>
      {loading && !data ? <Skeleton className="h-[520px]" /> : view === 'month' ? (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-7 border-b border-slate-100 bg-slate-50/70 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-white/[.06] dark:bg-white/[.02] md:grid">
            {WEEK.map((d) => <div key={d} className="py-2.5">{d}</div>)}
          </div>
          <div className="hidden grid-cols-7 md:grid">
            {cells.map((d, i) => (
              <div key={i} className={`min-h-[118px] border-b border-r border-slate-100 p-1.5 dark:border-white/[.06] ${!d ? 'bg-slate-50/50 dark:bg-white/[.01]' : ''}`}>
                {d && (
                  <>
                    <p className={`mb-1 grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${d === today ? 'bg-brand-600 text-white' : 'muted'}`}>{Number(d.slice(8))}</p>
                    <ul className="space-y-0.5">
                      {(byDay[d] || []).slice(0, 4).map((e, j) => {
                        const [, , dot] = TYPES[e.type] || []
                        return <li key={j}><Link to={e.link} title={`${e.title} · ${e.subtitle}`} className={`flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] hover:bg-slate-100 dark:hover:bg-white/5 ${e.overdue ? 'text-rose-600' : ''}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} /><span className="truncate">{e.title}</span></Link></li>
                      })}
                      {(byDay[d] || []).length > 4 && <li className="px-1.5 text-[10.5px] font-semibold text-brand-600">+{byDay[d].length - 4} más</li>}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="md:hidden"><Agenda byDay={byDay} today={today} /></div>
        </div>
      ) : <div className="card"><Agenda byDay={byDay} today={today} /></div>}
    </>
  )
}

function Agenda({ byDay, today }) {
  const days = Object.keys(byDay).sort()
  if (!days.length) return <p className="p-10 text-center text-sm muted">Sin eventos en este mes.</p>
  return (
    <div className="divide-y divide-slate-100 dark:divide-white/[.06]">
      {days.map((d) => (
        <div key={d} className="flex gap-4 p-4">
          <div className={`w-14 shrink-0 text-center ${d === today ? 'text-brand-600' : ''}`}>
            <p className="font-display text-2xl font-extrabold">{Number(d.slice(8))}</p>
            <p className="text-[10px] font-semibold uppercase muted">{new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`))}</p>
          </div>
          <ul className="flex-1 space-y-1.5">
            {byDay[d].map((e, i) => {
              const [l, Icon, dot] = TYPES[e.type] || ['', CalendarClock, 'bg-slate-400']
              return (
                <li key={i}><Link to={e.link} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-white/[.03]">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white ${dot}`}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{e.title}</span><span className="block truncate text-xs muted">{l} · {e.subtitle}</span></span>
                  {e.overdue && <span className="text-[11px] font-semibold text-rose-600">Atrasado</span>}
                </Link></li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

