const LOCALE = 'es-MX'
const moneyFmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'MXN' })
const compactFmt = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })
const numFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 })
const intFmt = new Intl.NumberFormat(LOCALE)

/** Importes: el backend manda BigDecimal; aquí solo se formatean. */
export function money(v, currency = 'MXN') {
  if (v === null || v === undefined || v === '') return '—'
  return currency === 'MXN' ? moneyFmt.format(Number(v)) : new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(Number(v))
}
export const moneyCompact = (v) => (v === null || v === undefined ? '—' : Math.abs(Number(v)) >= 10000 ? `$${compactFmt.format(Number(v))}` : money(v).replace(/\.00$/, ''))
export const num = (v) => (v === null || v === undefined ? '—' : numFmt.format(Number(v)))
export const int = (v) => (v === null || v === undefined ? '—' : intFmt.format(Number(v)))
export const pct = (v, digits = 1) => (v === null || v === undefined ? '—' : `${Number(v).toFixed(digits)} %`)

const DAY = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const SHORT = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' })
const MONTH = new Intl.DateTimeFormat(LOCALE, { month: 'short', year: '2-digit', timeZone: 'UTC' })
const MONTH_LONG = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' })
const DT = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' })

const asDay = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00Z`)
/** Fechas de negocio (YYYY-MM-DD): se formatean sin convertir zona (son fechas, no instantes). */
export const date = (iso) => (iso ? DAY.format(asDay(iso)) : '—')
export const shortDate = (iso) => (iso ? SHORT.format(asDay(iso)) : '—')
export const monthLabel = (ym) => (ym ? MONTH.format(new Date(`${ym}-15T12:00:00Z`)) : '—')
export const monthLong = (ym) => (ym ? MONTH_LONG.format(new Date(`${ym}-15T12:00:00Z`)) : '—')
export const dateTime = (iso) => (iso ? DT.format(new Date(iso)) : '—')

export function timeAgo(iso) {
  if (!iso) return 'nunca'
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })
  for (const [u, n] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (Math.abs(s) >= n) return rtf.format(-Math.round(s / n), u)
  }
  return 'hace un momento'
}

export function daysUntil(iso, today = new Date()) {
  if (!iso) return null
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((asDay(iso).getTime() - 43200000 - t) / 86400000)
}

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
export function hueFor(text = '') {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

export const todayIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Mexico_City' })
export const isoDate = (d) => d.toLocaleDateString('sv-SE')
export function addDays(iso, n) {
  const d = asDay(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export const firstOfMonth = (iso = todayIso()) => `${iso.slice(0, 7)}-01`

export function moneyInput(value) {
  const clean = String(value).replace(/[^\d.]/g, '')
  const [i, ...rest] = clean.split('.')
  return rest.length ? `${i.slice(0, 10)}.${rest.join('').slice(0, 2)}` : i.slice(0, 10)
}

export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`)

