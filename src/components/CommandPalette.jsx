import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, CreditCard, FileText, LifeBuoy, Receipt, Repeat, Search, Target, User, Users } from 'lucide-react'
import { analyticsApi } from '../api'
import { useDebounced } from '../hooks/useAsync'
import { Spinner } from './ui'

const TYPES = {
  CUSTOMER: ['Cliente', Users], PROSPECT: ['Prospecto', Target], SUBSCRIPTION: ['Suscripción', Repeat], PAYMENT: ['Pago', CreditCard],
  CHARGE: ['Cargo', Receipt], TICKET: ['Ticket', LifeBuoy], QUOTE: ['Cotización', FileText], PRODUCT: ['Producto', Box], USER: ['Usuario', User],
}

/** Búsqueda global (Ctrl/⌘ + K). El backend solo devuelve lo que el usuario puede ver. */
export default function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const debounced = useDebounced(q, 220)
  const navigate = useNavigate()
  const input = useRef(null)

  useEffect(() => {
    if (open) { setQ(''); setResults([]); setActive(0); setTimeout(() => input.current?.focus(), 20) }
  }, [open])

  useEffect(() => {
    if (debounced.trim().length < 2) { setResults([]); return }
    let alive = true
    setLoading(true)
    analyticsApi.search(debounced).then((r) => alive && (setResults(r), setActive(0))).catch(() => {}).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [debounced])

  if (!open) return null
  const go = (r) => { onClose(); navigate(r.link) }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && results[active]) go(results[active])
    if (e.key === 'Escape') onClose()
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Búsqueda global">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-scale-in dark:bg-ink-900 dark:ring-white/10">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-white/[.06]">
          {loading ? <Spinner className="h-5 w-5 text-brand-500" /> : <Search className="h-5 w-5 text-slate-400" />}
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Busca clientes, folios, prospectos, tickets…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400" />
          <span className="kbd">ESC</span>
        </div>
        <ul className="max-h-[52vh] overflow-y-auto p-2 scrollbar-thin">
          {q.trim().length < 2 && <li className="px-3 py-8 text-center text-sm muted">Escribe al menos 2 caracteres. Puedes buscar por nombre, correo, código, folio o referencia.</li>}
          {q.trim().length >= 2 && !loading && results.length === 0 && <li className="px-3 py-8 text-center text-sm muted">Sin resultados para «{q}»</li>}
          {results.map((r, i) => {
            const [label, Icon] = TYPES[r.type] || [r.type, Search]
            return (
              <li key={`${r.type}-${r.id}`}>
                <button onMouseEnter={() => setActive(i)} onClick={() => go(r)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === active ? 'bg-brand-50 dark:bg-brand-500/10' : ''}`}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.title}</span>
                    <span className="block truncate text-xs muted">{r.subtitle}</span>
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

