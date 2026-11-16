import { forwardRef, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDownRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, Loader2, Moon, MoreHorizontal, Search, Sun, X } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { hueFor, initials } from '../utils/format'

/* ── Marca ─────────────────────────────────────────────────────────────────── */
export function NexoraMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="nxc-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--brand-300))" />
          <stop offset="1" stopColor="rgb(var(--brand-700))" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0b0d17" />
      <path d="M17 46V18h6.5l17 18.5V18H47v28h-6.5L23.5 27.5V46z" fill="url(#nxc-g)" />
      <circle cx="48" cy="16" r="4" fill="rgb(var(--accent-400))" />
    </svg>
  )
}

/* ── Formularios ───────────────────────────────────────────────────────────── */
export function Field({ label, error, hint, htmlFor, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label htmlFor={htmlFor} className="label">{label}{required && <span className="text-rose-500"> *</span>}</label>}
      {children}
      {error ? <p className="field-error" role="alert">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef(function Input({ label, error, hint, required, icon: Icon, suffix, className = '', wrapClass = '', ...props }, ref) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} htmlFor={props.id || id} required={required} className={wrapClass}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        <input ref={ref} id={props.id || id} aria-invalid={!!error} className={`input ${Icon ? 'pl-10' : ''} ${suffix ? 'pr-14' : ''} ${error ? 'input-error' : ''} ${className}`} {...props} />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">{suffix}</span>}
      </div>
    </Field>
  )
})

const CHEVRON = "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_.85rem_center] bg-no-repeat"

export function Select({ label, error, hint, required, children, wrapClass = '', className = '', ...props }) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} required={required} className={wrapClass}>
      <select id={id} className={`input appearance-none pr-9 ${CHEVRON} ${error ? 'input-error' : ''} ${className}`} {...props}>{children}</select>
    </Field>
  )
}

export function Textarea({ label, error, hint, required, rows = 3, wrapClass = '', ...props }) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} required={required} className={wrapClass}>
      <textarea id={id} rows={rows} className={`input resize-y ${error ? 'input-error' : ''}`} {...props} />
    </Field>
  )
}

export function PasswordInput({ label, error, hint, showChecks = false, required, ...props }) {
  const [visible, setVisible] = useState(false)
  const id = useId()
  const v = props.value || ''
  const checks = [
    [v.length >= 12, '12+ caracteres'], [/\p{Lu}/u.test(v), 'Mayúscula'], [/\p{Ll}/u.test(v), 'Minúscula'],
    [/\d/.test(v), 'Número'], [/[^\p{L}\d]/u.test(v), 'Símbolo'],
  ]
  const score = checks.filter((c) => c[0]).length
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} required={required}>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} aria-invalid={!!error} className={`input pr-11 ${error ? 'input-error' : ''}`} {...props} />
        <button type="button" onClick={() => setVisible((x) => !x)} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showChecks && v && (
        <div className="mt-2.5 space-y-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? (score < 3 ? 'bg-rose-500' : score < 5 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-slate-200 dark:bg-white/10'}`} />)}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {checks.map(([ok, l]) => <span key={l} className={`inline-flex items-center gap-1 ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}><Check className="h-3 w-3" />{l}</span>)}
          </div>
        </div>
      )}
    </Field>
  )
}

export function Switch({ checked, onChange, disabled, label, size = 'md' }) {
  const dims = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11'
  const knob = size === 'sm' ? 'h-4 w-4 data-[on=true]:translate-x-4' : 'h-5 w-5 data-[on=true]:translate-x-5'
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${dims} ${checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-white/15'}`}>
      <span data-on={checked} className={`rounded-full bg-white shadow transition-transform ${knob}`} />
    </button>
  )
}

export function Checkbox({ checked, onChange, label, description, disabled }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs muted">{description}</span>}
      </span>
    </label>
  )
}

/* ── Feedback ──────────────────────────────────────────────────────────────── */
export const Spinner = ({ className = 'h-5 w-5' }) => <Loader2 className={`animate-spin ${className}`} />

export function Button({ loading, children, variant = 'primary', size, className = '', ...props }) {
  return (
    <button className={`btn-${variant} ${size ? `btn-${size}` : ''} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10',
}

export function Badge({ tone = 'slate', children, dot, className = '' }) {
  return <span className={`chip ${TONES[tone] || TONES.slate} ${className}`}>{dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{children}</span>
}

/** Insignia de estado a partir de un mapa {CLAVE: [etiqueta, tono]}. */
export function StatusBadge({ map, value, dot = true }) {
  const [text, tone] = map[value] || [value || '—', 'slate']
  return <Badge tone={tone} dot={dot}>{text}</Badge>
}

export function ProductChip({ code, color, name, size = 'sm' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg font-semibold ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}
      style={{ background: `${color || '#6366f1'}1a`, color: color || '#6366f1' }} title={name}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color || '#6366f1' }} />
      {code}
    </span>
  )
}

export function Avatar({ name = '', size = 'h-9 w-9 text-xs', className = '' }) {
  const hue = hueFor(name)
  return (
    <div className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${size} ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 50) % 360} 65% 42%))` }}>{initials(name)}</div>
  )
}

export function EmptyState({ icon: Icon, title, description, action, compact }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'px-4 py-8' : 'px-6 py-16'}`}>
      {Icon && <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20"><Icon className="h-5 w-5" /></div>}
      <h3 className="font-display text-base font-bold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export const Skeleton = ({ className = 'h-4 w-full' }) => <div className={`skeleton ${className}`} />

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <p className="text-sm text-rose-600 dark:text-rose-400">{message}</p>
      {onRetry && <button className="btn-secondary btn-sm" onClick={onRetry}>Reintentar</button>}
    </div>
  )
}

export function Pagination({ page, totalPages, total, onChange }) {
  if (!totalPages || totalPages <= 1) return total != null ? <div className="border-t border-slate-100 px-4 py-3 text-xs muted dark:border-white/[.06]">{total} registro(s)</div> : null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm dark:border-white/[.06]">
      <span className="muted text-xs">Página {page + 1} de {totalPages}{total != null && ` · ${total} registros`}</span>
      <div className="flex gap-1.5">
        <button className="btn-secondary btn-sm" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></button>
        <button className="btn-secondary btn-sm" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)} aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

export function Tabs({ items, value, onChange, className = '' }) {
  return (
    <div className={`no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 px-1 dark:border-white/10 ${className}`} role="tablist">
      {items.filter(Boolean).map((t) => {
        const active = t.key === value
        const Icon = t.icon
        return (
          <button key={t.key} role="tab" aria-selected={active} onClick={() => onChange(t.key)}
            className={`relative inline-flex shrink-0 items-center gap-2 px-3 pb-3 pt-1 text-sm font-semibold transition ${active ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
            {Icon && <Icon className="h-4 w-4" />}
            {t.label}
            {t.count != null && <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>{t.count}</span>}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />}
          </button>
        )
      })}
    </div>
  )
}

export function Segmented({ options, value, onChange, size = 'md' }) {
  return (
    <div className={`inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/[.06] ${size === 'sm' ? 'text-xs' : 'text-[13px]'}`} role="group">
      {options.map(([k, l, Icon]) => (
        <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={value === k}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 font-semibold transition ${size === 'sm' ? 'h-7' : 'h-8'} ${value === k ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
          {Icon && <Icon className="h-3.5 w-3.5" />}{l}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className="input pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value && <button className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => onChange('')} aria-label="Limpiar"><X className="h-3.5 w-3.5" /></button>}
    </div>
  )
}

export function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* visible para copiar a mano */ }
  }
  return (
    <div>
      {label && <p className="label">{label}</p>}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pl-3.5 dark:border-white/10 dark:bg-white/[.03]">
        <span className="flex-1 truncate font-mono text-sm">{value}</span>
        <button type="button" onClick={copy} className="btn-secondary btn-sm">{copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copiado' : 'Copiar'}</button>
      </div>
    </div>
  )
}

export function ThemeToggle({ className = '' }) {
  const { dark, toggle } = useTheme()
  return (
    <button onClick={toggle} className={`btn-ghost btn-icon ${className}`} aria-label={dark ? 'Usar tema claro' : 'Usar tema oscuro'} title={dark ? 'Tema claro' : 'Tema oscuro'}>
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  )
}

/* ── Indicadores ───────────────────────────────────────────────────────────── */
export function Delta({ value, inverse = false, suffix = '%' }) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  const good = inverse ? n <= 0 : n >= 0
  const Icon = n >= 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular ${good ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
      <Icon className="h-3 w-3" />{Math.abs(n).toFixed(1)}{suffix}
    </span>
  )
}

export function Kpi({ icon: Icon, label, value, sub, delta, inverse, tone = 'brand', loading, onClick, children }) {
  const tones = {
    brand: 'from-brand-500 to-brand-700', accent: 'from-accent-400 to-accent-600', green: 'from-emerald-400 to-emerald-600',
    amber: 'from-amber-400 to-orange-500', red: 'from-rose-400 to-rose-600', sky: 'from-sky-400 to-sky-600', violet: 'from-violet-400 to-fuchsia-600', slate: 'from-slate-500 to-slate-700',
  }
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`card group relative min-w-0 overflow-hidden p-4 text-left sm:p-5 ${onClick ? 'transition hover:-translate-y-0.5 hover:shadow-lift' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium muted">{label}</p>
        {Icon && <span className={`hidden h-9 w-9 shrink-0 sm:grid place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm ${tones[tone]}`}><Icon className="h-[18px] w-[18px]" /></span>}
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-32" /> : (
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <p className="font-display text-[19px] font-bold leading-tight tracking-tight tabular sm:text-[26px]">{value}</p>
          {delta !== undefined && <Delta value={delta} inverse={inverse} />}
        </div>
      )}
      {sub && <p className="mt-1 text-xs muted">{sub}</p>}
      {children}
    </Tag>
  )
}

export function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <div className="mb-6 animate-fade-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.18em] text-brand-600 dark:text-brand-400">{eyebrow}</p>}
          <h1 className="font-display text-[28px] font-extrabold tracking-tight sm:text-[32px]">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-[15px] muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function Card({ title, subtitle, actions, children, className = '', pad = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-0 pt-5 sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="section-title">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex min-w-0 max-w-full flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className={pad ? 'p-5 sm:p-6' : ''}>{children}</div>
    </section>
  )
}

export function DescList({ items, cols = 2 }) {
  return (
    <dl className={`grid gap-x-6 gap-y-4 ${cols === 3 ? 'sm:grid-cols-3' : cols === 1 ? '' : 'sm:grid-cols-2'}`}>
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k}</dt>
          <dd className="mt-0.5 break-words text-sm font-medium">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

/* ── Modal y panel lateral ─────────────────────────────────────────────────── */
function useOverlay(open, onClose, ref) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setTimeout(() => ref.current?.querySelector('[autofocus],input:not([type=hidden]),select,textarea')?.focus(), 30)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose, ref])
}

export function Modal({ open, onClose, title, description, children, footer, size = 'max-w-lg', icon: Icon }) {
  const panel = useRef(null)
  useOverlay(open, onClose, panel)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={panel} className={`relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 animate-scale-in dark:bg-ink-900 dark:ring-white/10 sm:rounded-3xl ${size}`}>
        <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/[.06]">
          {Icon && <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Icon className="h-5 w-5" /></div>}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold">{title}</h2>
            {description && <p className="mt-0.5 text-sm muted">{description}</p>}
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm -mr-2 h-8 w-8 px-0" aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/[.06] dark:bg-white/[.02] sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-2xl', headerExtra }) {
  const panel = useRef(null)
  useOverlay(open, onClose, panel)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <aside ref={panel} className={`absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl animate-slide-in dark:bg-ink-900 ${width}`}>
        <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/[.06]">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl font-bold">{title}</h2>
            {subtitle && <div className="mt-1 text-sm muted">{subtitle}</div>}
          </div>
          {headerExtra}
          <button onClick={onClose} className="btn-ghost btn-sm h-8 w-8 px-0" aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/[.06]">{footer}</div>}
      </aside>
    </div>,
    document.body,
  )
}

/** Confirmación para operaciones destructivas; con {@code reasonLabel} exige escribir el motivo. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', tone = 'primary', loading, onConfirm, onClose, reasonLabel, children }) {
  const [reason, setReason] = useState('')
  useEffect(() => { if (open) setReason('') }, [open])
  return (
    <Modal open={open} onClose={onClose} title={title} size="max-w-md"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <Button variant={tone} loading={loading} disabled={reasonLabel && !reason.trim()} onClick={() => onConfirm(reason.trim())}>{confirmLabel}</Button></>}>
      <div className="space-y-4">
        {message && <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}
        {children}
        {reasonLabel && <Textarea label={reasonLabel} required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} />}
      </div>
    </Modal>
  )
}

/* ── Menú de acciones (portal: ninguna tarjeta lo recorta) ─────────────────── */
export function ActionMenu({ items, label = 'Acciones', width = 230, trigger }) {
  const [pos, setPos] = useState(null)
  const button = useRef(null)
  const menu = useRef(null)
  const visible = items.filter(Boolean)
  useEffect(() => {
    if (!pos) return undefined
    const close = () => setPos(null)
    const down = (e) => { if (!button.current?.contains(e.target) && !menu.current?.contains(e.target)) close() }
    const key = (e) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [pos])
  if (!visible.length) return null
  const toggle = (e) => {
    e.stopPropagation()
    if (pos) return setPos(null)
    const r = button.current.getBoundingClientRect()
    const h = visible.length * 40 + 12
    const up = window.innerHeight - r.bottom < h + 8 && r.top > h
    const left = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8)
    return setPos(up ? { left, bottom: window.innerHeight - r.top + 4 } : { left, top: r.bottom + 4 })
  }
  return (
    <>
      <button ref={button} type="button" className={trigger ? 'btn-secondary' : 'btn-ghost btn-sm h-8 w-8 px-0'} onClick={toggle} aria-label={label} aria-haspopup="menu" aria-expanded={!!pos}>
        {trigger || <MoreHorizontal className="h-4 w-4" />}
      </button>
      {pos && createPortal(
        <div ref={menu} role="menu" style={{ position: 'fixed', width, ...pos }} className="z-[60] rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-200 animate-scale-in dark:bg-ink-850 dark:ring-white/10">
          {visible.map((it) => (
            <button key={it.label} type="button" role="menuitem" disabled={it.disabled} onClick={(e) => { e.stopPropagation(); setPos(null); it.run() }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm outline-none disabled:opacity-40 ${it.danger ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
              {it.icon && <it.icon className="h-4 w-4 opacity-70" />}{it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

