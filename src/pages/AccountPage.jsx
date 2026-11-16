import { useState } from 'react'
import { KeyRound, LaptopMinimal, LogOut, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import { accountApi } from '../api'
import { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { Avatar, Badge, Button, Card, DescList, Input, Modal, PageHeader, Skeleton } from '../components/ui'
import { ROLE_NAMES } from '../utils/labels'
import { dateTime, timeAgo } from '../utils/format'
import { Link } from 'react-router-dom'

export default function AccountPage() {
  const { user, reload } = useAuth()
  const toast = useToast()
  const sessions = useAsync(() => accountApi.sessions(), [])
  const [setup, setSetup] = useState(null)
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState(null)
  const [disable, setDisable] = useState(false)
  const [busy, setBusy] = useState(false)

  const start = async () => {
    try { setSetup(await accountApi.mfaSetup()); setCode('') } catch (e) { toast.error(errorMessage(e)) }
  }
  const enable = async () => {
    setBusy(true)
    try { const r = await accountApi.mfaEnable(code); setSetup(null); setCodes(r.codes); await reload(); toast.success('Verificación en dos pasos activada') } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  const turnOff = async () => {
    setBusy(true)
    try { await accountApi.mfaDisable(code); setDisable(false); await reload(); toast.success('Verificación en dos pasos desactivada') } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  const regenerate = async () => {
    try { setCodes((await accountApi.recoveryCodes()).codes) } catch (e) { toast.error(errorMessage(e)) }
  }
  const revoke = async (id) => { await accountApi.revokeSession(id).catch((e) => toast.error(errorMessage(e))); sessions.reload() }
  const revokeOthers = async () => { const n = await accountApi.revokeOthers().catch((e) => toast.error(errorMessage(e))); toast.success(`Se cerraron ${n ?? 0} sesión(es)`); sessions.reload() }

  return (
    <>
      <PageHeader eyebrow="Mi cuenta" title="Perfil y seguridad" description="Tu identidad, verificación en dos pasos y sesiones abiertas." />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Perfil">
          <div className="mb-5 flex items-center gap-4">
            <Avatar name={`${user.firstName} ${user.lastName}`} size="h-14 w-14 text-lg" />
            <div><p className="font-display text-lg font-bold">{user.firstName} {user.lastName}</p><p className="text-sm muted">{user.email}</p></div>
          </div>
          <DescList cols={1} items={[['Puesto', user.jobTitle], ['Roles', <div key="r" className="flex flex-wrap gap-1">{user.roles.map((r) => <Badge key={r} tone="brand">{ROLE_NAMES[r] || r}</Badge>)}</div>],
            ['Permisos efectivos', `${user.permissions.length} permisos`]]} />
          <Link to="/cambiar-password" className="btn-secondary mt-5 w-full"><KeyRound className="h-4 w-4" />Cambiar contraseña</Link>
        </Card>
        <Card title="Verificación en dos pasos (TOTP)" subtitle="Google Authenticator, Microsoft Authenticator, 1Password, Authy" className="xl:col-span-2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${user.mfaEnabled ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'}`}>
              {user.mfaEnabled ? <ShieldCheck className="h-7 w-7" /> : <ShieldOff className="h-7 w-7" />}
            </span>
            <div className="flex-1">
              <p className="font-semibold">{user.mfaEnabled ? 'Activa' : 'Desactivada'}</p>
              <p className="text-sm muted">{user.mfaEnabled ? 'Al iniciar sesión se pide un código de tu teléfono además de la contraseña.' : 'Recomendado para todos, obligatorio en la práctica para roles con acceso financiero.'}</p>
            </div>
            {user.mfaEnabled ? (
              <div className="flex gap-2"><button className="btn-secondary" onClick={regenerate}>Nuevos códigos de recuperación</button><button className="btn-ghost text-rose-600" onClick={() => { setDisable(true); setCode('') }}>Desactivar</button></div>
            ) : <Button onClick={start}><Smartphone className="h-4 w-4" />Activar</Button>}
          </div>
        </Card>
        <Card title="Sesiones abiertas" subtitle="Cada inicio de sesión es una sesión independiente que puedes cerrar" className="xl:col-span-3"
          actions={<button className="btn-secondary btn-sm" onClick={revokeOthers}><LogOut className="h-3.5 w-3.5" />Cerrar las demás</button>}>
          {sessions.loading ? <Skeleton className="h-24" /> : (
            <ul className="divide-y divide-slate-100 dark:divide-white/[.06]">
              {sessions.data?.map((s) => (
                <li key={s.id} className="flex items-center gap-4 py-3">
                  <LaptopMinimal className="h-5 w-5 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.userAgent || 'Navegador desconocido'}</p>
                    <p className="text-xs muted">IP {s.ip || '—'} · inició {dateTime(s.createdAt)} · actividad {timeAgo(s.lastSeenAt)}</p>
                  </div>
                  {s.current ? <Badge tone="green" dot>Esta sesión</Badge> : <button className="btn-ghost btn-sm text-rose-600" onClick={() => revoke(s.id)}>Cerrar</button>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={!!setup} onClose={() => setSetup(null)} title="Activar verificación en dos pasos" icon={Smartphone} size="max-w-lg">
        {setup && (
          <div className="space-y-4 text-sm">
            <p>1. Escanea el código con tu app de autenticación.</p>
            <img src={setup.qrDataUri} alt="Código QR para la app de autenticación" className="mx-auto h-48 w-48 rounded-xl bg-white p-2 ring-1 ring-slate-200" />
            <p className="text-center text-xs muted">¿No puedes escanear? Captura esta clave: <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{setup.secret.match(/.{1,4}/g).join(' ')}</span></p>
            <p>2. Escribe el código de 6 dígitos que muestra la app.</p>
            <Input inputMode="numeric" autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="text-center font-mono text-lg tracking-[.4em]" placeholder="000000" />
            <Button className="w-full" loading={busy} disabled={code.length !== 6} onClick={enable}>Verificar y activar</Button>
          </div>
        )}
      </Modal>
      <Modal open={!!codes} onClose={() => setCodes(null)} title="Códigos de recuperación" icon={KeyRound}
        description="Guárdalos en un lugar seguro. Cada uno sirve UNA vez si pierdes tu teléfono. No se volverán a mostrar.">
        <div className="grid grid-cols-2 gap-2">{codes?.map((c) => <span key={c} className="rounded-lg bg-slate-100 py-2 text-center font-mono text-sm font-semibold dark:bg-white/5">{c}</span>)}</div>
        <button className="btn-secondary mt-4 w-full" onClick={() => { navigator.clipboard?.writeText(codes.join('\n')); toast.success('Códigos copiados') }}>Copiar todos</button>
      </Modal>
      <Modal open={disable} onClose={() => setDisable(false)} title="Desactivar verificación en dos pasos" icon={ShieldOff} size="max-w-md">
        <div className="space-y-4">
          <p className="text-sm muted">Escribe un código actual de tu app. Se pedirá también tu contraseña.</p>
          <Input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="text-center font-mono tracking-[.4em]" placeholder="000000" />
          <Button variant="danger" className="w-full" loading={busy} disabled={code.length !== 6} onClick={turnOff}>Desactivar</Button>
        </div>
      </Modal>
    </>
  )
}
