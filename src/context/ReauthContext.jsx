import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { authApi } from '../api'
import { errorMessage, setReauthHandler } from '../api/client'
import { Button, Modal, PasswordInput } from '../components/ui'

const ReauthContext = createContext(null)

/**
 * Cuando una operación sensible responde REAUTH_REQUIRED, se pide la contraseña en un modal y la operación original
 * se reintenta sola al confirmar (ver api/client.js). Si se cancela, la operación falla con su mensaje.
 */
export function ReauthProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const resolver = useRef(null)

  const ask = useCallback(() => new Promise((resolve) => {
    resolver.current = resolve
    setPassword('')
    setError('')
    setOpen(true)
  }), [])

  useEffect(() => { setReauthHandler(ask); return () => setReauthHandler(null) }, [ask])

  const close = (ok) => {
    setOpen(false)
    resolver.current?.(ok)
    resolver.current = null
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await authApi.reauth(password)
      close(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ReauthContext.Provider value={ask}>
      {children}
      <Modal open={open} onClose={() => close(false)} title="Confirma tu identidad" icon={ShieldCheck} size="max-w-md"
        description="Es una operación sensible. Escribe tu contraseña para continuar (vale 10 minutos).">
        <form onSubmit={submit} className="space-y-4">
          <PasswordInput label="Contraseña" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => close(false)}>Cancelar</button>
            <Button type="submit" loading={busy} disabled={!password}>Confirmar</Button>
          </div>
        </form>
      </Modal>
    </ReauthContext.Provider>
  )
}
export const useReauth = () => useContext(ReauthContext)

