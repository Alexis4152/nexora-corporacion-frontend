import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import AuthLayout from '../../layouts/AuthLayout'
import { Button, Input } from '../../components/ui'
import { authApi } from '../../api'
import { errorMessage } from '../../api/client'
import { Alert } from './LoginPage'

export default function ForgotPage() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setError('Escribe un correo válido'); return }
    setBusy(true)
    setError('')
    try { setMsg((await authApi.forgot(email.trim())).message) } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return (
    <AuthLayout eyebrow="Recuperar acceso" title="Restablece tu contraseña" subtitle="Te enviaremos un enlace de un solo uso que vence en 30 minutos."
      footer={<Link to="/login" className="link">← Volver a iniciar sesión</Link>}>
      {msg ? <Alert tone="green">{msg}</Alert> : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          {error && <Alert>{error}</Alert>}
          <Input label="Correo electrónico" type="email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={150} autoFocus />
          <Button type="submit" size="lg" className="w-full" loading={busy}>Enviar enlace</Button>
        </form>
      )}
    </AuthLayout>
  )
}

