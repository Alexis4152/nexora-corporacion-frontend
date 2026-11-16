import { CalendarRange } from 'lucide-react'
import { addDays, firstOfMonth, todayIso } from '../utils/format'

/** Periodos de análisis rápidos + personalizado. value = {preset, from, to} */
export function periodOf(preset) {
  const t = todayIso()
  const [y, m] = t.split('-').map(Number)
  switch (preset) {
    case 'today': return { from: t, to: t }
    case 'last30': return { from: addDays(t, -29), to: t }
    case 'lastMonth': {
      const d = new Date(Date.UTC(y, m - 2, 1))
      const end = new Date(Date.UTC(y, m - 1, 0))
      return { from: d.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
    }
    case 'quarter': return { from: addDays(t, -89), to: t }
    case 'year': return { from: `${y}-01-01`, to: t }
    case 'last12': return { from: `${y - 1}-${String(m).padStart(2, '0')}-01`, to: t }
    default: return { from: firstOfMonth(t), to: t }
  }
}

const PRESETS = [['month', 'Este mes'], ['lastMonth', 'Mes anterior'], ['last30', '30 días'], ['quarter', '90 días'], ['year', 'Este año'], ['last12', '12 meses'], ['custom', 'Personalizado']]

export default function PeriodPicker({ value, onChange }) {
  const pick = (preset) => (preset === 'custom' ? onChange({ ...value, preset }) : onChange({ preset, ...periodOf(preset) }))
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <select className="input h-9 w-auto appearance-none pl-9 pr-8 text-[13px] font-semibold" value={value.preset} onChange={(e) => pick(e.target.value)} aria-label="Periodo">
          {PRESETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {value.preset === 'custom' && (
        <>
          <input type="date" className="input h-9 w-auto text-[13px]" value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value })} aria-label="Desde" />
          <span className="text-xs muted">a</span>
          <input type="date" className="input h-9 w-auto text-[13px]" value={value.to} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value })} aria-label="Hasta" />
        </>
      )}
    </div>
  )
}

