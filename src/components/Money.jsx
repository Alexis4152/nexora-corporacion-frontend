import { money } from '../utils/format'

/** Importe con tono semántico opcional. */
export default function Money({ value, tone, className = '', strong }) {
  const color = tone === 'red' ? 'text-rose-600 dark:text-rose-400' : tone === 'green' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'muted' ? 'text-slate-400' : ''
  return <span className={`tabular ${strong ? 'font-semibold' : ''} ${color} ${className}`}>{money(value)}</span>
}

