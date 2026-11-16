import { useEffect, useMemo, useState } from 'react'
import { Lock, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { usersApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { Badge, Button, ConfirmDialog, Input, Modal, PageHeader, Skeleton } from '../../components/ui'

const MODULES = { dashboard: 'Dashboard', products: 'Productos y planes', customers: 'Clientes', prospects: 'CRM', subscriptions: 'Suscripciones', billing: 'Cargos y pagos',
  collections: 'Cobranza', reports: 'Reportes', expenses: 'Gastos', support: 'Soporte', quotes: 'Cotizaciones', documents: 'Documentos', calendar: 'Calendario', users: 'Usuarios y roles', audit: 'Auditoría', settings: 'Configuración' }

export default function RolesPage() {
  const toast = useToast()
  const roles = useAsync(() => usersApi.roles(), [])
  const perms = useAsync(() => usersApi.permissions(), [])
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState(null)
  const [creating, setCreating] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [busy, setBusy] = useState(false)
  const role = roles.data?.find((r) => r.id === selected) || roles.data?.[0]
  useEffect(() => { if (role) setDraft(new Set(role.permissions)) }, [role?.id, roles.data]) // eslint-disable-line
  const grouped = useMemo(() => (perms.data || []).reduce((acc, p) => { (acc[p.module] ||= []).push(p); return acc }, {}), [perms.data])
  const locked = role?.code === 'SUPER_ADMIN'
  const dirty = role && draft && (draft.size !== role.permissions.length || role.permissions.some((p) => !draft.has(p)))
  const toggle = (code) => setDraft((d) => { const n = new Set(d); n.has(code) ? n.delete(code) : n.add(code); return n })
  const save = async () => {
    setBusy(true)
    try { await usersApi.updateRole(role.id, { name: role.name, description: role.description, permissions: [...draft] }); toast.success('Permisos actualizados; aplican de inmediato'); roles.reload() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  const create = async () => {
    try { const r = await usersApi.createRole({ ...creating, permissions: [] }); toast.success('Rol creado'); setCreating(null); await roles.reload(); setSelected(r.id) } catch (e) { toast.error(errorMessage(e)) }
  }
  return (
    <>
      <PageHeader eyebrow="Seguridad" title="Roles y permisos" description="Permisos granulares por módulo y acción. El backend los aplica en cada endpoint y, cuando corresponde, a nivel de registro."
        actions={<button className="btn-primary" onClick={() => setCreating({ code: '', name: '', description: '' })}><Plus className="h-4 w-4" />Nuevo rol</button>} />
      {roles.loading || perms.loading ? <Skeleton className="h-[520px]" /> : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <ul className="space-y-2">
            {roles.data.map((r) => (
              <li key={r.id}><button onClick={() => setSelected(r.id)} className={`card w-full p-4 text-left transition ${role?.id === r.id ? 'ring-2 ring-brand-500' : 'hover:shadow-lift'}`}>
                <div className="flex items-center justify-between gap-2"><p className="font-semibold">{r.name}</p>{r.system && <Badge>Sistema</Badge>}</div>
                <p className="mt-0.5 text-xs muted">{r.users} usuario(s) · {r.permissions.length} permisos</p>
              </button></li>
            ))}
          </ul>
          {role && draft && (
            <div className="card">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-white/[.06]">
                <div><h2 className="font-display text-xl font-bold">{role.name} <span className="font-mono text-xs muted">{role.code}</span></h2><p className="text-sm muted">{role.description}</p></div>
                <div className="flex gap-2">
                  {!role.system && <button className="btn-ghost text-rose-600" onClick={() => setRemoving(true)}><Trash2 className="h-4 w-4" />Eliminar</button>}
                  {!locked && <Button loading={busy} disabled={!dirty} onClick={save}><Save className="h-4 w-4" />Guardar cambios</Button>}
                </div>
              </div>
              {locked && <p className="flex items-center gap-2 border-b border-slate-100 bg-violet-50 px-5 py-3 text-sm text-violet-800 dark:border-white/[.06] dark:bg-violet-500/10 dark:text-violet-200"><Lock className="h-4 w-4" />El super administrador siempre tiene todos los permisos.</p>}
              <div className="divide-y divide-slate-100 dark:divide-white/[.06]">
                {Object.entries(grouped).map(([mod, list]) => (
                  <div key={mod} className="grid gap-3 p-5 md:grid-cols-[200px_1fr]">
                    <div><p className="font-semibold">{MODULES[mod] || mod}</p><p className="text-xs muted">{list.filter((p) => draft.has(p.code)).length} de {list.length}</p></div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {list.map((p) => (
                        <label key={p.code} className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition ${draft.has(p.code) ? 'bg-brand-50/60 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/30' : 'ring-slate-200 dark:ring-white/10'} ${locked ? 'cursor-default' : ''}`}>
                          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600" checked={draft.has(p.code)} disabled={locked} onChange={() => toggle(p.code)} />
                          <span><span className="block text-sm font-medium">{p.description}</span><span className="font-mono text-[10.5px] muted">{p.code}</span>{p.sensitive && <Badge tone="orange" className="ml-1.5">Sensible</Badge>}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <Modal open={!!creating} onClose={() => setCreating(null)} title="Nuevo rol" icon={ShieldCheck} size="max-w-md" footer={<><button className="btn-secondary" onClick={() => setCreating(null)}>Cancelar</button><Button disabled={!creating?.code || !creating?.name} onClick={create}>Crear rol</Button></>}>
        {creating && <div className="space-y-4"><Input label="Código" value={creating.code} onChange={(e) => setCreating({ ...creating, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} placeholder="COBRANZA_EXTERNA" />
          <Input label="Nombre" value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} /><Input label="Descripción" value={creating.description} onChange={(e) => setCreating({ ...creating, description: e.target.value })} /></div>}
      </Modal>
      <ConfirmDialog open={removing} title="Eliminar rol" tone="danger" confirmLabel="Eliminar" message="Solo se eliminan roles sin usuarios asignados." onClose={() => setRemoving(false)}
        onConfirm={async () => { try { await usersApi.deleteRole(role.id); setRemoving(false); setSelected(null); roles.reload() } catch (e) { toast.error(errorMessage(e)) } }} />
    </>
  )
}

