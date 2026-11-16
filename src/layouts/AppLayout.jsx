import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Building2, CalendarDays, ChevronDown, ClipboardList, Command, CreditCard, FileText, Gauge, KeyRound, LayoutGrid, LifeBuoy, LineChart,
  LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plug, Plus, Receipt, Repeat, ScrollText, Settings, ShieldCheck, Target, UserCircle, Users, Wallet, X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { useBranding } from '../context/BrandingContext'
import { useQuick } from '../context/QuickActions'
import { ActionMenu, Avatar, NexoraMark, Spinner, ThemeToggle } from '../components/ui'
import NotificationBell from '../components/NotificationBell'
import CommandPalette from '../components/CommandPalette'
import ProductIcon from '../components/ProductIcon'
import { ROLE_NAMES } from '../utils/labels'

const NAV = [
  { section: 'General', items: [
    { to: '/', label: 'Dashboard', icon: Gauge, any: ['dashboard.read'], end: true },
    { to: '/calendario', label: 'Calendario', icon: CalendarDays, any: ['calendar.read'] },
  ] },
  { section: 'Comercial', items: [
    { to: '/crm', label: 'CRM · Prospectos', icon: Target, any: ['prospects.read'] },
    { to: '/clientes', label: 'Clientes', icon: Users, any: ['customers.read'] },
    { to: '/cotizaciones', label: 'Cotizaciones', icon: FileText, any: ['quotes.read'] },
    { to: '/suscripciones', label: 'Suscripciones', icon: Repeat, any: ['subscriptions.read'] },
  ] },
  { section: 'Finanzas', items: [
    { to: '/cobranza/pagos', label: 'Pagos', icon: CreditCard, any: ['payments.read'] },
    { to: '/cobranza/cartera', label: 'Cuentas por cobrar', icon: Wallet, any: ['collections.read'] },
    { to: '/cobranza/cargos', label: 'Cargos', icon: Receipt, any: ['charges.read'] },
    { to: '/gastos', label: 'Gastos', icon: ClipboardList, any: ['expenses.read'] },
  ] },
  { section: 'Inteligencia', items: [
    { to: '/metricas', label: 'Métricas SaaS', icon: LineChart, any: ['reports.financial_read'] },
    { to: '/reportes', label: 'Reportes', icon: BarChart3, any: ['reports.commercial_read', 'reports.financial_read'] },
  ] },
  { section: 'Operación', items: [
    { to: '/soporte', label: 'Soporte', icon: LifeBuoy, any: ['support.read'] },
    { to: '/catalogo', label: 'Catálogo de productos', icon: LayoutGrid, any: ['products.read'] },
  ] },
  { section: 'Administración', items: [
    { to: '/usuarios', label: 'Usuarios', icon: Users, any: ['users.read', 'users.manage'] },
    { to: '/roles', label: 'Roles y permisos', icon: ShieldCheck, any: ['roles.manage'] },
    { to: '/auditoria', label: 'Auditoría', icon: ScrollText, any: ['audit.read'] },
    { to: '/integraciones', label: 'Integraciones', icon: Plug, any: ['integrations.manage'] },
    { to: '/configuracion', label: 'Configuración', icon: Settings, any: ['settings.read', 'settings.manage'] },
  ] },
]

/**
 * Shell: sidebar oscuro colapsable con navegación por permisos y sub-menú de productos (dinámico desde el catálogo),
 * barra superior con búsqueda global, acciones rápidas, alertas, tema y menú de usuario. En móvil, cajón lateral.
 */
export default function AppLayout() {
  const { user, canAny, can, logout } = useAuth()
  const { activeProducts } = useCatalog()
  const { companyName } = useBranding()
  const quick = useQuick()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawer, setDrawer] = useState(false)
  const [palette, setPalette] = useState(false)
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('nxc-sidebar') === '1' } catch { return false } })

  useEffect(() => setDrawer(false), [location.pathname])
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const toggleCollapsed = () => setCollapsed((c) => { try { localStorage.setItem('nxc-sidebar', c ? '0' : '1') } catch { /* local */ } return !c })

  const sections = NAV.map((s) => ({ ...s, items: s.items.filter((i) => canAny(...i.any)) })).filter((s) => s.items.length)
  const role = (user?.roles || []).map((r) => ROLE_NAMES[r] || r).join(' · ')
  const showProducts = can('dashboard.read') && can('products.read')

  const linkCls = (active, mini) => `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition ${mini ? 'justify-center px-0' : ''} ${active ? 'bg-white/[.08] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/.06)]' : 'text-slate-400 hover:bg-white/[.04] hover:text-slate-100'}`

  const sidebar = (mini) => (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-3 px-4 pb-3 pt-5 ${mini ? 'justify-center px-2' : ''}`}>
        <NexoraMark className="h-9 w-9 shrink-0" />
        {!mini && <div className="min-w-0"><p className="truncate font-display text-[15px] font-bold text-white">Nexora Corporación</p><p className="truncate text-[11px] text-slate-500">{companyName}</p></div>}
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3 scrollbar-thin">
        {sections.map((section, si) => (
          <div key={section.section}>
            {!mini && <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-600">{section.section}</p>}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} title={mini ? item.label : undefined} className={({ isActive }) => linkCls(isActive, mini)}>
                    {({ isActive }) => (<>
                      {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-300 to-brand-500" />}
                      <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-brand-300' : ''}`} />
                      {!mini && <span className="truncate">{item.label}</span>}
                    </>)}
                  </NavLink>
                </li>
              ))}
            </ul>
            {si === 0 && showProducts && activeProducts.length > 0 && (
              <div className="mt-5">
                {!mini && <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-600">Productos</p>}
                <ul className="space-y-0.5">
                  {activeProducts.map((p) => (
                    <li key={p.id}>
                      <NavLink to={`/productos/${p.code}`} title={mini ? p.name : undefined} className={({ isActive }) => linkCls(isActive, mini)}>
                        <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md" style={{ background: `${p.color}33`, color: p.color }}><ProductIcon icon={p.icon} className="h-3 w-3" /></span>
                        {!mini && <span className="flex-1 truncate">{p.name.replace(/^NEXORA\s+/i, '')}</span>}
                        {!mini && p.activeSubscriptions > 0 && <span className="text-[10px] tabular text-slate-500">{p.activeSubscriptions}</span>}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[.06] p-3">
        <NavLink to="/cuenta" className={({ isActive }) => `${linkCls(isActive, mini)}`} title="Mi cuenta">
          <Avatar name={`${user?.firstName} ${user?.lastName}`} size="h-7 w-7 text-[10px]" />
          {!mini && <span className="min-w-0"><span className="block truncate text-[13px] text-slate-200">{user?.firstName} {user?.lastName}</span><span className="block truncate text-[10.5px] text-slate-500">{role}</span></span>}
        </NavLink>
      </div>
    </div>
  )

  const quickItems = [
    can('customers.create') && { icon: Building2, label: 'Cliente', run: () => quick.open('customer') },
    can('prospects.create') && { icon: Target, label: 'Prospecto', run: () => quick.open('prospect') },
    can('subscriptions.create') && { icon: Repeat, label: 'Suscripción', run: () => quick.open('subscription') },
    can('payments.create') && { icon: CreditCard, label: 'Registrar pago', run: () => quick.open('payment') },
    can('support.manage') && { icon: LifeBuoy, label: 'Ticket de soporte', run: () => quick.open('ticket') },
    can('expenses.manage') && { icon: ClipboardList, label: 'Gasto', run: () => quick.open('expense') },
  ]

  return (
    <div className="flex min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden bg-ink-900 transition-[width] duration-300 lg:block ${collapsed ? 'w-[76px]' : 'w-[260px]'}`}>{sidebar(collapsed)}</aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[284px] bg-ink-900 shadow-2xl animate-slide-in">
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-5 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5" aria-label="Cerrar menú"><X className="h-4 w-4" /></button>
            {sidebar(false)}
          </aside>
        </div>
      )}
      <div className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-300 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-slate-200/70 bg-white/80 px-3 backdrop-blur-xl dark:border-white/[.06] dark:bg-ink-950/80 sm:px-6">
          <button onClick={() => setDrawer(true)} className="btn-ghost btn-icon lg:hidden" aria-label="Abrir menú"><Menu className="h-5 w-5" /></button>
          <button onClick={toggleCollapsed} className="btn-ghost btn-icon hidden lg:inline-flex" aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}>
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>
          <button onClick={() => setPalette(true)} className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-slate-100/80 px-3.5 text-sm text-slate-400 ring-1 ring-inset ring-transparent transition hover:ring-slate-200 dark:bg-white/[.05] dark:hover:ring-white/10 sm:max-w-md">
            <Command className="h-4 w-4 shrink-0" /><span className="truncate">Buscar clientes, folios, prospectos…</span>
            <span className="kbd ml-auto hidden sm:inline-flex">Ctrl K</span>
          </button>
          <div className="flex-1" />
          {quickItems.some(Boolean) && <ActionMenu items={quickItems} label="Crear" width={220} trigger={<span className="inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Nuevo</span></span>} />}
          <NotificationBell />
          <ThemeToggle className="text-slate-500 dark:text-slate-400" />
          <UserMenu user={user} role={role} onLogout={async () => { await logout(); navigate('/login', { replace: true }) }} />
        </header>
        <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<div className="grid h-72 place-items-center"><Spinner className="h-6 w-6 text-brand-500" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  )
}

function UserMenu({ user, role, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-white/5" aria-haspopup="menu" aria-expanded={open}>
        <Avatar name={`${user?.firstName} ${user?.lastName}`} size="h-8 w-8 text-[11px]" />
        <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-200 animate-scale-in dark:bg-ink-850 dark:ring-white/10">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
            <p className="truncate text-xs muted">{user?.email}</p>
            <p className="mt-1 text-[11px] font-semibold text-brand-600 dark:text-brand-300">{role}</p>
          </div>
          <button onClick={() => { setOpen(false); navigate('/cuenta') }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/5"><UserCircle className="h-4 w-4 text-slate-400" />Mi cuenta y seguridad</button>
          <button onClick={() => { setOpen(false); navigate('/cambiar-password') }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/5"><KeyRound className="h-4 w-4 text-slate-400" />Cambiar contraseña</button>
          <button onClick={onLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"><LogOut className="h-4 w-4" />Cerrar sesión</button>
        </div>
      )}
    </div>
  )
}

