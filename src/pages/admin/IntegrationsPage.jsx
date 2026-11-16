import { useEffect, useState } from 'react'
import { KeyRound, Mail, Plug, Plus, Send, Trash2 } from 'lucide-react'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useCatalog } from '../../context/CatalogContext'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import DataTable from '../../components/DataTable'
import { Badge, Button, Card, Checkbox, ConfirmDialog, CopyField, Input, Modal, PageHeader, Select, Skeleton, Switch } from '../../components/ui'
import { dateTime, timeAgo } from '../../utils/format'

export default function IntegrationsPage() {
  const toast = useToast()
  const { products } = useCatalog()
  const list = useAsync(() => adminApi.integrations(), [])
  const keys = useAsync(() => adminApi.apiKeys(), [])
  const smtp = list.data?.find((i) => i.code === 'SMTP')
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [newKey, setNewKey] = useState(null)
  const [created, setCreated] = useState(null)
  const [revoke, setRevoke] = useState(null)
  useEffect(() => { if (smtp) setF({ host: smtp.config.host || '', port: smtp.config.port || 587, username: smtp.config.username || '', password: '', from: smtp.config.from || '', starttls: smtp.config.starttls !== false, enabled: smtp.enabled }) }, [smtp?.lastTestAt, list.data]) // eslint-disable-line
  const save = async () => { setBusy(true); try { await adminApi.saveSmtp({ ...f, port: Number(f.port) }); toast.success('SMTP guardado'); list.reload() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) } }
  const test = async () => { setBusy(true); try { const r = await adminApi.testSmtp(); r.lastTestOk ? toast.success(r.lastTestMessage) : toast.error(r.lastTestMessage); list.reload() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) } }
  return (
    <>
      <PageHeader eyebrow="Integraciones" title="Integraciones y API" description="Solo se activan integraciones reales y verificadas. Las credenciales se guardan cifradas (AES-256-GCM) y nunca se devuelven." />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Correo SMTP" subtitle="Recuperación de contraseña, alertas y cobranza" className="xl:col-span-2"
          actions={smtp && <Badge tone={smtp.enabled ? 'green' : 'slate'} dot>{smtp.enabled ? 'Activo' : 'Inactivo'}</Badge>}>
          {!f ? <Skeleton className="h-48" /> : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="Servidor" wrapClass="sm:col-span-2" value={f.host} onChange={(e) => setF({ ...f, host: e.target.value })} placeholder="smtp.tu-proveedor.com" />
                <Input label="Puerto" value={f.port} onChange={(e) => setF({ ...f, port: e.target.value.replace(/\D/g, '') })} />
                <Input label="Usuario" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
                <Input label="Contraseña" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder={smtp.hasSecret ? '•••••• guardada (vacío = conservar)' : ''} autoComplete="new-password" />
                <Input label="Remitente" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} placeholder="no-reply@nexora.mx" />
              </div>
              <div className="flex flex-wrap items-center gap-5"><Checkbox checked={f.starttls} onChange={(v) => setF({ ...f, starttls: v })} label="STARTTLS" /><span className="flex items-center gap-2 text-sm">Activar <Switch checked={f.enabled} onChange={(v) => setF({ ...f, enabled: v })} label="Activar SMTP" /></span></div>
              {smtp.lastTestAt && <p className={`text-xs ${smtp.lastTestOk ? 'text-emerald-600' : 'text-rose-600'}`}>Última prueba {timeAgo(smtp.lastTestAt)}: {smtp.lastTestMessage}</p>}
              <div className="flex gap-2"><Button loading={busy} onClick={save}><Mail className="h-4 w-4" />Guardar</Button><button className="btn-secondary" disabled={busy || !smtp.enabled} onClick={test}><Send className="h-4 w-4" />Enviar correo de prueba</button></div>
            </div>
          )}
        </Card>
        <Card title="Próximas integraciones" subtitle="Interfaz preparada; se activan al contratar un proveedor real">
          <ul className="space-y-3">
            {list.data?.filter((i) => !i.available).map((i) => (
              <li key={i.code} className="rounded-xl bg-slate-50 p-3 dark:bg-white/[.03]"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{i.name}</p><Badge>Pendiente</Badge></div><p className="mt-1 text-xs muted">{i.description}</p></li>
            ))}
          </ul>
        </Card>
        <Card title="API de licencias para productos Nexora" subtitle="Cada producto consulta el estado de SUS clientes con su llave. Solo informa: Corporación nunca suspende sistemas automáticamente." className="xl:col-span-3"
          actions={<button className="btn-primary btn-sm" onClick={() => setNewKey({ productId: products[0]?.id || '', name: '' })}><Plus className="h-3.5 w-3.5" />Nueva llave</button>}>
          <div className="mb-4 rounded-xl bg-ink-900 p-4 font-mono text-xs text-slate-200">
            <p className="text-slate-400"># Consulta (llave por producto, encabezado X-Api-Key)</p>
            <p>GET /api/integration/v1/license?customer=CL-01016</p>
            <p className="text-slate-400"># Respuesta: estado de suscripción, estado de cobranza, plan, límites y fin de periodo</p>
          </div>
          <DataTable loading={keys.loading} rows={keys.data} dense columns={[
            { key: 'name', header: 'Llave', render: (r) => <div><p className="font-semibold">{r.name}</p><p className="font-mono text-xs muted">{r.prefix}…</p></div> },
            { key: 'productCode', header: 'Producto' },
            { key: 'active', header: 'Estado', render: (r) => (r.active ? <Badge tone="green">Activa</Badge> : <Badge tone="red">Revocada {r.revokedAt && dateTime(r.revokedAt)}</Badge>) },
            { key: 'lastUsedAt', header: 'Último uso', render: (r) => (r.lastUsedAt ? timeAgo(r.lastUsedAt) : 'Nunca') },
            { key: 'createdAt', header: 'Creada', render: (r) => dateTime(r.createdAt) },
            { key: 'x', header: '', render: (r) => r.active && <button className="btn-ghost btn-sm text-rose-600" onClick={() => setRevoke(r)}><Trash2 className="h-3.5 w-3.5" />Revocar</button> },
          ]} />
        </Card>
      </div>
      <Modal open={!!newKey} onClose={() => setNewKey(null)} title="Nueva llave de API" icon={KeyRound} size="max-w-md"
        footer={<><button className="btn-secondary" onClick={() => setNewKey(null)}>Cancelar</button><Button disabled={!newKey?.name?.trim()} onClick={async () => { try { setCreated(await adminApi.createKey(newKey)); setNewKey(null); keys.reload() } catch (e) { toast.error(errorMessage(e)) } }}>Crear</Button></>}>
        {newKey && <div className="space-y-4"><Select label="Producto" value={newKey.productId} onChange={(e) => setNewKey({ ...newKey, productId: e.target.value })}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          <Input label="Nombre" value={newKey.name} onChange={(e) => setNewKey({ ...newKey, name: e.target.value })} placeholder="Producción HOTEL" /></div>}
      </Modal>
      <Modal open={!!created} onClose={() => setCreated(null)} title="Llave creada" icon={Plug} size="max-w-lg" description="Cópiala ahora: en la base solo queda su hash y no se puede volver a mostrar.">
        {created && <CopyField label="Llave de API" value={created.key} />}
      </Modal>
      <ConfirmDialog open={!!revoke} title="Revocar llave" tone="danger" confirmLabel="Revocar" message={`El producto dejará de poder consultar licencias con ${revoke?.prefix}…`} onClose={() => setRevoke(null)}
        onConfirm={async () => { try { await adminApi.revokeKey(revoke.id); setRevoke(null); keys.reload() } catch (e) { toast.error(errorMessage(e)) } }} />
    </>
  )
}
