import axios from 'axios'

/**
 * Cliente HTTP único. El access token vive SOLO en memoria (nunca en localStorage); al recargar se recupera con
 * /auth/refresh usando la cookie httpOnly. Dos piezas clave:
 *  - Refresh de vuelo único: el refresh token es de un solo uso, así que varias respuestas 401 esperan la MISMA renovación.
 *  - Reautenticación: si el backend responde 403 REAUTH_REQUIRED, se pide la contraseña y se reintenta la operación.
 */
export const API_BASE = import.meta.env.VITE_API_URL || '/api'
const api = axios.create({ baseURL: `${API_BASE}/v1`, withCredentials: true, timeout: 60000 })

let accessToken = null
let onSessionExpired = null
let onReauth = null
let onMustChange = null

export const setAccessToken = (t) => { accessToken = t }
export const setSessionExpiredHandler = (h) => { onSessionExpired = h }
export const setReauthHandler = (h) => { onReauth = h }
export const setMustChangeHandler = (h) => { onMustChange = h }

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  return config
})

let refreshPromise = null
async function doRefresh(retryOnce) {
  try {
    return await api.post('/auth/refresh')
  } catch (err) {
    if (retryOnce && err.response?.status === 401) {
      await new Promise((r) => setTimeout(r, 900))
      return api.post('/auth/refresh')
    }
    throw err
  }
}

export function refreshSession(retryOnce = false) {
  if (!refreshPromise) {
    refreshPromise = doRefresh(retryOnce)
      .then((res) => {
        setAccessToken(res.data.data.accessToken)
        return res.data.data
      })
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password', '/auth/mfa', '/auth/reauth']

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config || {}
    const status = err.response?.status
    const code = err.response?.data?.code
    const isAuthCall = AUTH_PATHS.some((p) => original.url?.includes(p))
    if (status === 401 && !isAuthCall && !original._retried && accessToken) {
      original._retried = true
      try {
        const { accessToken: fresh } = await refreshSession(true)
        original.headers.Authorization = `Bearer ${fresh}`
        return api(original)
      } catch (e) {
        setAccessToken(null)
        onSessionExpired?.()
        return Promise.reject(e)
      }
    }
    if (status === 403 && code === 'REAUTH_REQUIRED' && onReauth && !original._reauth) {
      original._reauth = true
      const ok = await onReauth()
      if (ok) return api(original)
    }
    if (status === 403 && code === 'MUST_CHANGE_PASSWORD') onMustChange?.()
    return Promise.reject(err)
  },
)

export function errorMessage(err, fallback = 'Ocurrió un error. Intenta de nuevo.') {
  if (!err?.response) return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.'
  if (err.response.status === 429) return 'Demasiadas solicitudes. Espera unos minutos.'
  const msg = err.response.data?.message
  const rid = err.response.data?.requestId
  if (err.response.status >= 500 && rid) return `${msg || fallback} (referencia ${rid.slice(0, 8)})`
  return msg || fallback
}

export const fieldErrors = (err) => err?.response?.data?.errors || {}
export const errorCode = (err) => err?.response?.data?.code

/** Descarga un archivo autenticado (exportaciones, PDF, documentos). */
export async function download(url, params, fallbackName = 'archivo') {
  const res = await api.get(url, { params, responseType: 'blob' })
  const cd = res.headers['content-disposition'] || ''
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd)
  const name = match ? decodeURIComponent(match[1] || match[2]) : fallbackName
  const href = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = href
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 2000)
}

/** Abre un PDF autenticado en una pestaña nueva. */
export async function openPdf(url) {
  const res = await api.get(url, { responseType: 'blob' })
  const href = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  window.open(href, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(href), 60000)
}

export default api

