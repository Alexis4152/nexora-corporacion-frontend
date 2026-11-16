import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api'
import { refreshSession, setAccessToken, setMustChangeHandler, setSessionExpiredHandler } from '../api/client'

const AuthContext = createContext(null)

/**
 * Sesión. Al montar intenta restaurarla con la cookie httpOnly (/auth/refresh). Los permisos deciden menús y botones;
 * el backend revalida TODO: esto es experiencia de usuario, nunca la barrera de seguridad.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const apply = useCallback((s) => {
    setAccessToken(s?.accessToken ?? null)
    setUser(s?.user ?? null)
  }, [])

  useEffect(() => {
    let cancelled = false
    setSessionExpiredHandler(() => setUser(null))
    setMustChangeHandler(() => setUser((u) => (u ? { ...u, mustChangePassword: true } : u)))
    refreshSession()
      .then((s) => !cancelled && apply(s))
      .catch(() => !cancelled && apply(null))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [apply])

  const login = useCallback(async (email, password) => {
    const s = await authApi.login(email, password)
    if (s.mfaRequired) return s
    apply(s)
    return s
  }, [apply])

  const verifyMfa = useCallback(async (token, code) => {
    const s = await authApi.mfa(token, code)
    apply(s)
    return s
  }, [apply])

  const logout = useCallback(async () => {
    try { await authApi.logout() } finally { apply(null) }
  }, [apply])

  const reload = useCallback(async () => {
    const me = await authApi.me()
    setUser(me)
    return me
  }, [])

  const value = useMemo(() => {
    const perms = new Set(user?.permissions || [])
    return {
      user, loading, login, verifyMfa, logout, reload, setUser,
      can: (p) => perms.has(p),
      canAny: (...ps) => ps.some((p) => perms.has(p)),
      isSuper: user?.roles?.includes('SUPER_ADMIN') ?? false,
    }
  }, [user, loading, login, verifyMfa, logout, reload])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)

