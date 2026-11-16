import { BarChart3, ShieldCheck, Sparkles, Wallet } from 'lucide-react'
import { NexoraMark, ThemeToggle } from '../components/ui'

/** Pantalla dividida de acceso: marca a la izquierda, formulario a la derecha (en móvil solo el formulario). */
export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-ink-950">
      <aside className="aurora relative hidden w-[46%] max-w-[720px] overflow-hidden text-white lg:flex lg:flex-col">
        <div className="grid-lines absolute inset-0" />
        <div className="relative z-10 flex items-center gap-3 p-10">
          <NexoraMark className="h-10 w-10" />
          <div><p className="font-display text-lg font-bold leading-tight">Nexora Corporación</p><p className="text-xs text-white/55">Plataforma interna · Nexora Systems</p></div>
        </div>
        <div className="relative z-10 mt-auto p-10 pb-14">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-accent-300 ring-1 ring-white/15"><Sparkles className="h-3.5 w-3.5" />CRM · Suscripciones · Cobranza · BI</p>
          <h2 className="font-display text-5xl font-extrabold leading-[1.04] tracking-tight xl:text-6xl">
            El estado real<br />de Nexora, <span className="bg-gradient-to-r from-brand-200 to-accent-300 bg-clip-text text-transparent">en un solo lugar.</span>
          </h2>
          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            {[[Wallet, 'Cobranza', 'Cobrado y por cobrar, sin confundirlos'], [BarChart3, 'MRR y churn', 'Indicadores SaaS con fórmulas claras'], [ShieldCheck, 'Seguro', 'MFA, permisos y auditoría']].map(([Icon, t, d]) => (
              <div key={t} className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10 backdrop-blur-xl">
                <Icon className="mb-2 h-5 w-5 text-brand-300" /><p className="text-sm font-semibold">{t}</p><p className="mt-0.5 text-[11px] leading-snug text-white/55">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
      <main className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between p-5 sm:p-8">
          <div className="flex items-center gap-2.5 lg:invisible"><NexoraMark className="h-9 w-9" /><span className="font-display font-bold">Nexora Corporación</span></div>
          <ThemeToggle className="text-slate-500 dark:text-slate-400" />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
          <div className="w-full max-w-[400px] animate-fade-up">
            {eyebrow && <p className="mb-3 text-[11px] font-bold uppercase tracking-[.2em] text-brand-600 dark:text-brand-400">{eyebrow}</p>}
            <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-sm muted">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  )
}
