import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const ToastContext = createContext(null)
const STYLES = {
  success: { icon: CheckCircle2, color: 'text-emerald-500', bar: 'bg-emerald-500' },
  error: { icon: AlertTriangle, color: 'text-rose-500', bar: 'bg-rose-500' },
  info: { icon: Info, color: 'text-brand-500', bar: 'bg-brand-500' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t.slice(-3), { id, type, message }])
    setTimeout(() => dismiss(id), type === 'error' ? 6500 : 3800)
  }, [dismiss])
  const api = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push])
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6" aria-live="polite">
        {toasts.map((t) => {
          const s = STYLES[t.type]
          const Icon = s.icon
          return (
            <div key={t.id} className="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl bg-white/95 p-4 pl-5 shadow-lift ring-1 ring-slate-200/80 backdrop-blur animate-fade-up dark:bg-ink-850/95 dark:ring-white/10">
              <span className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} />
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.color}`} />
              <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
export const useToast = () => useContext(ToastContext)

