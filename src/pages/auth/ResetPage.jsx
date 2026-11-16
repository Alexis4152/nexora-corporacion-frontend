import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout'
import { Button, PasswordInput } from '../../components/ui'
import { authApi } from '../../api'
import { errorMessage } from '../../api/client'
import { passwordProblem } from '../../utils/validators'
import { Alert } from './LoginPage'

export default function ResetPage() {
  const { token } = useParams()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const p = passwordProblem(pw) || (pw !== pw2 ? 'Las contraseñas no coinciden' : null)
    if (p) { setError(p); return }
    setBusy(true)
    setError('')
    try { setDone((await authApi.reset(token, pw)).message) } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return (
    <AuthLayout eyebrow="Nueva contraseña" title="Crea tu nueva contraseña" footer={<Link to="/login" className="link">← Iniciar sesión</Link>}>
      {done ? <Alert tone="green">{done}</Alert> : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          {error && <Alert>{error}</Alert>}
          <PasswordInput label="Nueva contraseña" showChecks value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" maxLength={72} />
          <PasswordInput label="Confírmala" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" maxLength={72} />
          <Button type="submit" size="lg" className="w-full" loading={busy}>Guardar contraseña</Button>
        </form>
      )}
    </AuthLayout>
  )
}

