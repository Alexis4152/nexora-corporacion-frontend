import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout'
import { Button, PasswordInput } from '../../components/ui'
import { authApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { passwordProblem } from '../../utils/validators'
import { Alert } from './LoginPage'

export default function ChangePasswordPage() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [f, setF] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const p = passwordProblem(f.next, user?.email) || (f.next !== f.confirm ? 'Las contraseñas no coinciden' : null)
    if (p) { setError(p); return }
    setBusy(true)
    setError('')
    try {
      const u = await authApi.changePassword(f.current, f.next)
      setUser(u)
      toast.success('Contraseña actualizada. Cerramos tus otras sesiones.')
      navigate('/', { replace: true })
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return (
    <AuthLayout eyebrow={user?.mustChangePassword ? 'Primer acceso' : 'Seguridad'} title={user?.mustChangePassword ? 'Crea tu contraseña personal' : 'Cambiar contraseña'}
      subtitle={user?.mustChangePassword ? 'Tu acceso usa una contraseña temporal. Cámbiala para continuar.' : 'Al cambiarla se cierran tus demás sesiones.'}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <Alert>{error}</Alert>}
        <PasswordInput label={user?.mustChangePassword ? 'Contraseña temporal' : 'Contraseña actual'} value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} autoComplete="current-password" />
        <PasswordInput label="Nueva contraseña" showChecks value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} autoComplete="new-password" maxLength={72} />
        <PasswordInput label="Confírmala" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} autoComplete="new-password" maxLength={72} />
        <div className="flex gap-2">
          {!user?.mustChangePassword && <button type="button" className="btn-secondary flex-1" onClick={() => navigate(-1)}>Cancelar</button>}
          <Button type="submit" size="lg" className="flex-1" loading={busy}>Guardar contraseña</Button>
        </div>
      </form>
    </AuthLayout>
  )
}

