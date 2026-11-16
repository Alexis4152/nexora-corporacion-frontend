import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Filtros persistentes en la URL (se conservan al recargar y al compartir el enlace). */
export function useQueryState(defaults = {}) {
  const [params, setParams] = useSearchParams()
  const values = { ...defaults }
  for (const k of Object.keys(defaults)) {
    if (params.has(k)) values[k] = params.get(k)
  }
  for (const [k, v] of params.entries()) if (!(k in values)) values[k] = v
  const set = useCallback((patch) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v === '' || v === null || v === undefined || v === defaults[k]) next.delete(k)
        else next.set(k, String(v))
      }
      if (!('page' in patch) && next.has('page')) next.delete('page')
      return next
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setParams])
  return [values, set]
}
