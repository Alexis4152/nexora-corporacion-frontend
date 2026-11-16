import { Navigate, useLocation } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { EmptyState, Spinner } from './ui'

export function FullPageLoader() {
  return <div className="grid min-h-screen place-items-center"><Spinner className="h-7 w-7 text-brand-500" /></div>
}

/** Exige sesión; con contraseña temporal, fuerza el cambio. La protección real es del backend. */
export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (user.mustChangePassword && location.pathname !== '/cambiar-password') return <Navigate to="/cambiar-password" replace />
  return children
}

export function RequirePermission({ any, children }) {
  const { canAny } = useAuth()
  if (!canAny(...any)) {
    return <div className="card"><EmptyState icon={ShieldOff} title="Sin acceso a esta sección" description="Tu rol no tiene permiso para ver esta información. Si lo necesitas, pídelo a un administrador." /></div>
  }
  return children
}

export function Can({ permission, any, children, fallback = null }) {
  const { can, canAny } = useAuth()
  const ok = permission ? can(permission) : canAny(...(any || []))
  return ok ? children : fallback
}

