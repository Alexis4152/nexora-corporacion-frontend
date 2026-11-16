import { useEffect, useRef, useState } from 'react'
import { Building2, Search, X } from 'lucide-react'
import { customersApi } from '../api'
import { useDebounced } from '../hooks/useAsync'
import { Field, Spinner } from '../components/ui'

/** Selector de cliente con búsqueda en el servidor. value = {id, tradeName, code} */
export function CustomerPicker({ label = 'Cliente', value, onChange, error, required, disabled }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const debounced = useDebounced(q, 220)
  const box = useRef(null)
  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    customersApi.list({ q: debounced, size: 8, sort: 'tradeName' }).then((p) => alive && setItems(p.content)).catch(() => {}).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [debounced, open])
  useEffect(() => {
    const close = (e) => !box.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <Field label={label} error={error} required={required}>
      <div className="relative" ref={box}>
        {value ? (
          <div className={`input flex items-center gap-2 ${error ? 'input-error' : ''}`}>
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="flex-1 truncate font-medium">{value.tradeName}</span>
            <span className="font-mono text-[11px] text-slate-400">{value.code}</span>
            {!disabled && <button type="button" onClick={() => onChange(null)} className="text-slate-400 hover:text-slate-600" aria-label="Quitar cliente"><X className="h-4 w-4" /></button>}
          </div>
        ) : (
          <>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`input pl-10 ${error ? 'input-error' : ''}`} placeholder="Busca por nombre, correo o código" value={q} disabled={disabled}
              onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} />
          </>
        )}
        {open && !value && (
          <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200 dark:bg-ink-850 dark:ring-white/10">
            {loading && <div className="flex justify-center p-3"><Spinner className="h-4 w-4 text-brand-500" /></div>}
            {!loading && items.length === 0 && <p className="p-3 text-center text-xs muted">Sin coincidencias</p>}
            {items.map((c) => (
              <button type="button" key={c.id} onClick={() => { onChange({ id: c.id, tradeName: c.tradeName, code: c.code, email: c.email }); setOpen(false); setQ('') }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5">
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{c.tradeName}</span><span className="block truncate text-xs muted">{c.email}</span></span>
                <span className="font-mono text-[11px] text-slate-400">{c.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Field>
  )
}

