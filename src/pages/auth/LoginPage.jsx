import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound, Mail, ShieldCheck } from 'lucide-react'
import AuthLayout from '../../layouts/AuthLayout'
import { Button, Input, PasswordInput } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { email as emailRule, required, validate } from '../../utils/validators'

export default function LoginPage() {
  const { user, loading, login, verifyMfa } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [mfa, setMfa] = useState(null)
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)
  if (!loading && user) return <Navigate to={user.mustChangePassword ? '/cambiar-password' : '/'} replace />
  const from = location.state?.from && /^\/(?![/\\])/.test(location.state.from) ? location.state.from : '/'
  const done = (s) => navigate(s.user.mustChangePassword ? '/cambiar-password' : from, { replace: true })
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: null })) }

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form, { email: [required('tu correo'), emailRule], password: [required('tu contraseña')] })
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setServerError('')
    try {
      const s = await login(form.email.trim(), form.password)
      if (s.mfaRequired) setMfa(s.mfaToken)
      else done(s)
    } catch (err) {
      setErrors(fieldErrors(err))
      setServerError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const submitMfa = async (e) => {
    e.preventDefault()
    setBusy(true)
    setServerError('')
    try {
      done(await verifyMfa(mfa, code.trim()))
    } catch (err) {
      setServerError(errorMessage(err))
      if (err.response?.status === 401) { setMfa(null); setCode('') }
    } finally {
      setBusy(false)
    }
  }

  if (mfa) {
    return (
      <AuthLayout eyebrow="Verificación en dos pasos" title="Confirma que eres tú" subtitle="Escribe el código de 6 dígitos de tu app de autenticación o un código de recuperación.">
        <form onSubmit={submitMfa} className="space-y-5" noValidate>
          {serverError && <Alert>{serverError}</Alert>}
          <Input label="Código" autoFocus inputMode="numeric" autoComplete="one-time-code" icon={ShieldCheck} value={code} maxLength={11}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9A-Za-z-]/g, '').toUpperCase())} placeholder="123 456" className="tracking-[.3em] font-mono" />
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={code.length < 6}>Verificar <ArrowRight className="h-4 w-4" /></Button>
          <button type="button" className="w-full text-center text-sm link" onClick={() => { setMfa(null); setCode('') }}>← Usar otra cuenta</button>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout eyebrow="Acceso corporativo" title="Bienvenido de nuevo" subtitle="Inicia sesión para administrar el negocio de Nexora."
      footer={<span className="inline-flex items-center gap-1.5 text-xs"><KeyRound className="h-3.5 w-3.5" />Acceso exclusivo para personal autorizado. Toda actividad queda auditada.</span>}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {serverError && <Alert>{serverError}</Alert>}
        <Input label="Correo electrónico" type="email" autoComplete="username" icon={Mail} placeholder="tu@nexora.mx" value={form.email} onChange={set('email')} error={errors.email} maxLength={150} />
        <div>
          <PasswordInput label="Contraseña" autoComplete="current-password" placeholder="••••••••••••" value={form.password} onChange={set('password')} error={errors.password} maxLength={72} />
          <div className="mt-2 text-right"><Link to="/recuperar" className="text-[13px] link">¿Olvidaste tu contraseña?</Link></div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Iniciar sesión <ArrowRight className="h-4 w-4" /></Button>
      </form>
    </AuthLayout>
  )
}

export function Alert({ children, tone = 'red' }) {
  const cls = tone === 'green' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
  return <div className={`rounded-xl border px-4 py-3 text-sm ${cls}`} role="alert">{children}</div>
}

