import { useState } from 'react'
import { KeyRound, LogOut, Pencil, Plus, Power, ShieldOff, Unlock, UserPlus } from 'lucide-react'
import { usersApi } from '../../api'
import { errorMessage, fieldErrors } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import DataTable from '../../components/DataTable'
import { ActionMenu, Avatar, Badge, Button, CopyField, Input, Modal, PageHeader } from '../../components/ui'
import { timeAgo } from '../../utils/format'
import { onlyDigits } from '../../utils/validators'

export default function UsersPage() {
  const { can, user: me } = useAuth()
  const toast = useToast()
  const { data, loading, reload } = useAsync(() => usersApi.list(), [])
  const roles = useAsync(() => usersApi.roles(), [])
  const [form, setForm] = useState(null)
  const [temp, setTemp] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const manage = can('users.manage')
  const run = async (fn, ok) => { try { const r = await fn(); if (ok) toast.success(ok); reload(); return r } catch (e) { toast.error(errorMessage(e)) } }
  const save = async () => {
    setBusy(true)
    setErrors({})
    try {
      const body = { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone || '', jobTitle: form.jobTitle, roleIds: form.roleIds }
      if (form.id) { await usersApi.update(form.id, body); toast.success('Usuario actualizado') } else setTemp(await usersApi.create(body))
      setForm(null)
      reload()
    } catch (e) { setErrors(fieldErrors(e)); toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  return (
    <>
      <PageHeader eyebrow="Seguridad" title="Usuarios" description="Sin registro público: los accesos los crea un administrador con contraseña temporal. Los cambios de acceso piden confirmar tu contraseña."
        actions={manage && <button className="btn-primary" onClick={() => setForm({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '', roleIds: [] })}><UserPlus className="h-4 w-4" />Nuevo usuario</button>} />
      <div className="card overflow-hidden">
        <DataTable loading={loading} rows={data} columns={[
          { key: 'name', header: 'Usuario', render: (r) => <div className="flex items-center gap-3"><Avatar name={`${r.firstName} ${r.lastName}`} /><div><p className="font-semibold">{r.firstName} {r.lastName} {r.id === me.id && <Badge tone="brand">Tú</Badge>}</p><p className="text-xs muted">{r.email}{r.jobTitle && ` · ${r.jobTitle}`}</p></div></div> },
          { key: 'roles', header: 'Roles', render: (r) => <div className="flex flex-wrap gap-1">{r.roles.map((x) => <Badge key={x.id} tone={x.code === 'SUPER_ADMIN' ? 'violet' : 'brand'}>{x.name}</Badge>)}</div> },
          { key: 'status', header: 'Estado', render: (r) => <div className="flex flex-wrap gap-1">{r.active ? <Badge tone="green" dot>Activo</Badge> : <Badge dot>Inactivo</Badge>}{r.locked && <Badge tone="red">Bloqueado</Badge>}</div> },
          { key: 'mfa', header: 'MFA', render: (r) => (r.mfaEnabled ? <Badge tone="green">Activo</Badge> : <Badge tone="amber">Sin MFA</Badge>) },
          { key: 'lastLoginAt', header: 'Último acceso', render: (r) => <span className="text-xs muted">{timeAgo(r.lastLoginAt)}</span> },
          { key: 'x', header: '', render: (r) => manage && (
            <ActionMenu items={[
              { icon: Pencil, label: 'Editar y roles', run: () => setForm({ ...r, phone: r.phone || '', roleIds: r.roles.map((x) => x.id) }) },
              { icon: KeyRound, label: 'Contraseña temporal', run: async () => { const t = await run(() => usersApi.resetPassword(r.id)); if (t) setTemp(t) } },
              r.mfaEnabled && { icon: ShieldOff, label: 'Restablecer MFA', run: () => run(() => usersApi.resetMfa(r.id), 'MFA restablecido') },
              r.locked && { icon: Unlock, label: 'Desbloquear', run: () => run(() => usersApi.unlock(r.id), 'Cuenta desbloqueada') },
              { icon: LogOut, label: 'Cerrar sus sesiones', run: () => run(() => usersApi.revokeSessions(r.id), 'Sesiones cerradas') },
              r.id !== me.id && { icon: Power, label: r.active ? 'Desactivar' : 'Activar', danger: r.active, run: () => run(() => usersApi.active(r.id, !r.active), r.active ? 'Usuario desactivado' : 'Usuario activado') },
            ]} />
          ) },
        ]} />
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar usuario' : 'Nuevo usuario'} icon={Plus} size="max-w-2xl"
        footer={<><button className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button><Button loading={busy} disabled={!form?.roleIds?.length} onClick={save}>{form?.id ? 'Guardar' : 'Crear y generar contraseña'}</Button></>}>
        {form && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} error={errors.firstName} />
              <Input label="Apellidos" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} error={errors.lastName} />
              <Input label="Correo" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
              <Input label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: onlyDigits(e.target.value) })} error={errors.phone} />
              <Input label="Puesto" wrapClass="sm:col-span-2" value={form.jobTitle || ''} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            </div>
            <div>
              <p className="label">Roles <span className="text-rose-500">*</span></p>
              <div className="grid gap-2 sm:grid-cols-2">
                {roles.data?.map((r) => {
                  const on = form.roleIds.includes(r.id)
                  return (
                    <button type="button" key={r.id} onClick={() => setForm({ ...form, roleIds: on ? form.roleIds.filter((x) => x !== r.id) : [...form.roleIds, r.id] })}
                      className={`rounded-xl p-3 text-left ring-1 transition ${on ? 'bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-500/10' : 'ring-slate-200 hover:bg-slate-50 dark:ring-white/10 dark:hover:bg-white/[.03]'}`}>
                      <p className="text-sm font-semibold">{r.name}</p><p className="text-xs muted">{r.description}</p><p className="mt-1 text-[11px] text-slate-400">{r.permissions.length} permisos</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!temp} onClose={() => setTemp(null)} title="Contraseña temporal" icon={KeyRound} size="max-w-md" description="Compártela por un canal seguro. Se pedirá cambiarla en el primer acceso; no se volverá a mostrar.">
        {temp && <div className="space-y-4"><CopyField label="Usuario" value={temp.email} /><CopyField label="Contraseña temporal" value={temp.temporaryPassword} /></div>}
      </Modal>
    </>
  )
}

