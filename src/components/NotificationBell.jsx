import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, Info, ShieldAlert } from 'lucide-react'
import { notificationsApi } from '../api'
import { NOTIFICATION_CATEGORY } from '../utils/labels'
import { timeAgo } from '../utils/format'

export const SEVERITY = {
  CRITICAL: ['text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300', ShieldAlert],
  WARNING: ['text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300', AlertTriangle],
  SUCCESS: ['text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300', CheckCircle2],
  INFO: ['text-sky-600 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-300', Info],
}

/** Campanita: consulta el resumen cada 30 s (sin estado en memoria del servidor: sirve con varias instancias). */
export default function NotificationBell() {
  const [summary, setSummary] = useState({ unread: 0, critical: 0 })
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(null)
  const btn = useRef(null)
  const panel = useRef(null)
  const navigate = useNavigate()

  const refresh = () => notificationsApi.summary().then(setSummary).catch(() => {})
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 30000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [])
  useEffect(() => {
    if (!open) return undefined
    notificationsApi.list({ size: 12 }).then((p) => setItems(p.content)).catch(() => setItems([]))
    const close = (e) => { if (!btn.current?.contains(e.target) && !panel.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const openItem = async (n) => {
    if (!n.readAt) { await notificationsApi.read(n.id).catch(() => {}); refresh() }
    setOpen(false)
    if (n.link) navigate(n.link)
  }
  const readAll = async () => {
    await notificationsApi.readAll()
    setItems((xs) => xs?.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })))
    refresh()
  }
  const rect = btn.current?.getBoundingClientRect()
  return (
    <>
      <button ref={btn} onClick={() => setOpen((o) => !o)} className="btn-ghost btn-icon relative" aria-label={`Notificaciones, ${summary.unread} sin leer`}>
        <Bell className="h-[18px] w-[18px]" />
        {summary.unread > 0 && (
          <span className={`absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-ink-950 ${summary.critical ? 'bg-rose-500' : 'bg-brand-600'}`}>
            {summary.unread > 99 ? '99+' : summary.unread}
          </span>
        )}
      </button>
      {open && rect && createPortal(
        <div ref={panel} style={{ position: 'fixed', top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right - 8) }}
          className="z-[60] w-[min(400px,calc(100vw-16px))] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-scale-in dark:bg-ink-850 dark:ring-white/10">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[.06]">
            <p className="font-display font-bold">Notificaciones</p>
            {summary.unread > 0 && <button onClick={readAll} className="btn-ghost btn-sm"><CheckCheck className="h-3.5 w-3.5" />Marcar todo</button>}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto scrollbar-thin">
            {items === null && <li className="p-6 text-center text-sm muted">Cargando…</li>}
            {items?.length === 0 && <li className="p-8 text-center text-sm muted">Todo al día. No hay alertas.</li>}
            {items?.map((n) => {
              const [cls, Icon] = SEVERITY[n.severity] || SEVERITY.INFO
              return (
                <li key={n.id}>
                  <button onClick={() => openItem(n)} className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/[.03] ${n.readAt ? 'opacity-70' : ''}`}>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${cls}`}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold leading-snug">{n.title}</span>
                      {n.body && <span className="mt-0.5 block line-clamp-2 text-xs muted">{n.body}</span>}
                      <span className="mt-1 block text-[10.5px] text-slate-400">{NOTIFICATION_CATEGORY[n.category]} · {timeAgo(n.createdAt)}</span>
                    </span>
                    {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  </button>
                </li>
              )
            })}
          </ul>
          <button onClick={() => { setOpen(false); navigate('/notificaciones') }} className="block w-full border-t border-slate-100 py-3 text-center text-sm font-semibold text-brand-600 hover:bg-slate-50 dark:border-white/[.06] dark:text-brand-300 dark:hover:bg-white/[.03]">
            Ver centro de alertas
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}

