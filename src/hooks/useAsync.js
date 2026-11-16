import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../api/client'

/** Carga de datos con estado de carga/error y recarga manual; ignora respuestas de peticiones viejas. */
export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)
  const seq = useRef(0)
  const run = useCallback(async () => {
    const id = ++seq.current
    setLoading(true)
    setError(null)
    try {
      const r = await fn()
      if (id === seq.current) setData(r)
      return r
    } catch (e) {
      if (id === seq.current) setError(errorMessage(e))
      return null
    } finally {
      if (id === seq.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { if (immediate) run() }, [run, immediate])
  return { data, loading, error, reload: run, setData }
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

