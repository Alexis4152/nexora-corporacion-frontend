import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const read = () => { try { return localStorage.getItem('nxc-theme') } catch { return null } }

/** Claro / oscuro por navegador (preferencia local, no dato de negocio). */
export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])
  useEffect(() => {
    if (read()) return undefined
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = (e) => setDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const toggle = useCallback(() => setDark((d) => {
    try { localStorage.setItem('nxc-theme', d ? 'light' : 'dark') } catch { /* solo esta visita */ }
    return !d
  }), [])
  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>
}
export const useTheme = () => useContext(ThemeContext)

