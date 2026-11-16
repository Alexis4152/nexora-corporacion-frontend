import { createContext, useContext, useEffect, useState } from 'react'
import { settingsApi } from '../api'
import { applyBrand } from '../utils/theme'

const BrandingContext = createContext({ companyName: 'Nexora Systems', currency: 'MXN', timezone: 'America/Mexico_City' })

/** Marca corporativa configurable: nombre y colores (se aplican como variables CSS). Requiere sesión. */
export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({ companyName: 'Nexora Systems', currency: 'MXN', timezone: 'America/Mexico_City' })
  const load = () => settingsApi.branding().then((b) => {
    setBranding(b)
    applyBrand(b.primaryColor, b.accentColor)
  }).catch(() => {})
  useEffect(() => { load() }, [])
  return <BrandingContext.Provider value={{ ...branding, reload: load }}>{children}</BrandingContext.Provider>
}
export const useBranding = () => useContext(BrandingContext)

