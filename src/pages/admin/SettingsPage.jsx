import { useEffect, useState } from 'react'
import { Building2, Clock4, Eye, Mail, Play, Save, SlidersHorizontal, Wallet, Bell } from 'lucide-react'
import { notificationsApi, settingsApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useBranding } from '../../context/BrandingContext'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { Badge, Button, Card, Checkbox, Input, Modal, PageHeader, Pagination, Select, Skeleton, Switch, Tabs, Textarea } from '../../components/ui'
import DataTable from '../../components/DataTable'
import { NOTIFICATION_CATEGORY } from '../../utils/labels'
import { dateTime, timeAgo } from '../../utils/format'

const ZONES = ['America/Mexico_City', 'America/Cancun', 'America/Merida', 'America/Monterrey', 'America/Chihuahua', 'America/Mazatlan', 'America/Hermosillo', 'America/Tijuana']

export default function SettingsPage() {
  const { can } = useAuth()
  const [tab, setTab] = useState('company')
  return (
    <>
      <PageHeader eyebrow="Configuración corporativa" title="Configuración" description="Parámetros de negocio guardados en la base de datos (sin tocar archivos). Los secretos e infraestructura viven en variables de entorno." />
      <Tabs value={tab} onChange={setTab} items={[{ key: 'company', label: 'Empresa', icon: Building2 }, { key: 'finance', label: 'Finanzas y cobranza', icon: Wallet },
        { key: 'alerts', label: 'Alertas', icon: Bell }, { key: 'templates', label: 'Plantillas', icon: Mail }, { key: 'outbox', label: 'Correos enviados', icon: Mail }, { key: 'jobs', label: 'Tareas programadas', icon: Clock4 }]} />
      <div className="mt-6">
        {(tab === 'company' || tab === 'finance' || tab === 'alerts') && <SettingsForm tab={tab} canEdit={can('settings.manage')} />}
        {tab === 'alerts' && <div className="mt-6"><Preferences canEdit={can('settings.manage')} /></div>}
        {tab === 'templates' && <Templates canEdit={can('settings.manage')} />}
        {tab === 'outbox' && <Outbox canEdit={can('settings.manage')} />}
        {tab === 'jobs' && <Jobs canEdit={can('settings.manage')} />}
      </div>
    </>
  )
}

const FIELDS = {
  company: [['company.name', 'Nombre corporativo', 'text'], ['company.legalName', 'Razón social', 'text'], ['company.email', 'Correo de contacto', 'text'], ['company.phone', 'Teléfono', 'text'],
    ['company.website', 'Sitio web', 'text'], ['company.primaryColor', 'Color principal', 'color'], ['company.accentColor', 'Color de acento', 'color'], ['business.timezone', 'Zona horaria de negocio', 'zone']],
  finance: [['finance.currency', 'Moneda corporativa', 'text'], ['finance.taxRate', 'Tasa de IVA (0.16 = 16 %)', 'decimal'], ['finance.pricesIncludeTax', 'Precios con IVA incluido por defecto', 'bool'],
    ['billing.defaultGraceDays', 'Días de gracia por defecto', 'int'], ['billing.defaultTrialDays', 'Días de prueba por defecto', 'int'], ['billing.chargeLeadDays', 'Emitir cargos con anticipación de (días)', 'int'],
    ['billing.dueSoonDays', '«Próximo a vencer» dentro de (días)', 'int'], ['collections.agingBuckets', 'Intervalos de antigüedad de cartera (días)', 'list'],
    ['collections.reminderBeforeDays', 'Aviso previo al vencimiento (días antes)', 'int'], ['collections.reminderOnDue', 'Aviso el día del vencimiento', 'bool'],
    ['collections.reminderAfterDays', 'Recordatorios por atraso (días)', 'list'], ['collections.customerEmails', 'Enviar correos de cobranza a clientes', 'bool']],
  alerts: [['alerts.trialEndingDays', 'Alertar pruebas que terminan en (días)', 'int'], ['alerts.prospectStaleDays', 'Prospecto sin seguimiento después de (días)', 'int'],
    ['alerts.largePaymentAmount', 'Pago importante a partir de ($)', 'decimal'], ['alerts.renewalDays', 'Alertar renovaciones manuales en (días)', 'int']],
}

function SettingsForm({ tab, canEdit }) {
  const toast = useToast()
  const { reload: reloadBrand } = useBranding()
  const { data, loading, reload } = useAsync(() => settingsApi.all(), [])
  const [values, setValues] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (data) setValues(Object.assign({}, ...Object.values(data))) }, [data])
  if (loading || !data) return <Skeleton className="h-80" />
  const set = (k, v) => setValues((x) => ({ ...x, [k]: v }))
  const save = async () => {
    setBusy(true)
    const changes = Object.fromEntries(FIELDS[tab].map(([k, , type]) => [k, type === 'int' ? Number(values[k]) : type === 'decimal' ? Number(values[k]) : type === 'list' ? (Array.isArray(values[k]) ? values[k] : String(values[k]).split(',').map((x) => Number(x.trim())).filter(Boolean)) : values[k]]))
    try { await settingsApi.save(changes); toast.success('Configuración guardada'); reload(); reloadBrand() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  return (
    <Card title={tab === 'company' ? 'Identidad corporativa' : tab === 'finance' ? 'Finanzas, facturación y cobranza' : 'Umbrales de alertas'}
      actions={canEdit && <Button loading={busy} onClick={save}><Save className="h-4 w-4" />Guardar</Button>}>
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS[tab].map(([k, l, type]) => {
          const v = values[k]
          if (type === 'bool') return <div key={k} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[.03]"><span className="text-sm font-medium">{l}</span><Switch checked={!!v} onChange={(x) => set(k, x)} disabled={!canEdit} label={l} /></div>
          if (type === 'color') return <div key={k}><p className="label">{l}</p><div className="flex items-center gap-2"><input type="color" value={v || '#000000'} disabled={!canEdit} onChange={(e) => set(k, e.target.value)} className="h-10 w-14 rounded-lg border border-slate-200 bg-transparent" /><Input value={v || ''} disabled={!canEdit} onChange={(e) => set(k, e.target.value)} wrapClass="flex-1" /></div></div>
          if (type === 'zone') return <Select key={k} label={l} value={v} disabled={!canEdit} onChange={(e) => set(k, e.target.value)}>{ZONES.map((z) => <option key={z} value={z}>{z}</option>)}</Select>
          if (type === 'list') return <Input key={k} label={l} value={Array.isArray(v) ? v.join(', ') : v ?? ''} disabled={!canEdit} onChange={(e) => set(k, e.target.value)} hint="Separados por coma, ascendentes" />
          return <Input key={k} label={l} value={v ?? ''} disabled={!canEdit} onChange={(e) => set(k, e.target.value)} />
        })}
      </div>
      {tab === 'finance' && <p className="mt-5 text-xs muted">Los correos a clientes solo se envían con un SMTP configurado en Integraciones; sin él cada intento queda registrado como omitido (nunca se simula un envío).</p>}
    </Card>
  )
}

function Preferences({ canEdit }) {
  const toast = useToast()
  const { data, loading, reload } = useAsync(() => notificationsApi.preferences(), [])
  const [rows, setRows] = useState([])
  useEffect(() => { if (data) setRows(data) }, [data])
  if (loading) return <Skeleton className="h-64" />
  const roles = [...new Map(rows.map((r) => [r.roleId, r.roleName])).entries()]
  const cats = Object.keys(NOTIFICATION_CATEGORY)
  const get = (roleId, cat) => rows.find((r) => r.roleId === roleId && r.category === cat)
  const toggle = (roleId, cat, field) => setRows((rs) => rs.map((r) => (r.roleId === roleId && r.category === cat ? { ...r, [field]: !r[field] } : r)))
  return (
    <Card title="Preferencias de alertas por rol" subtitle="Qué categorías recibe cada rol en su centro de alertas (A) y por correo (C)"
      actions={canEdit && <Button onClick={async () => { try { await notificationsApi.savePreferences(rows); toast.success('Preferencias guardadas'); reload() } catch (e) { toast.error(errorMessage(e)) } }}><Save className="h-4 w-4" />Guardar</Button>} pad={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="table-head bg-slate-50/70 dark:bg-white/[.02]"><tr><th>Rol</th>{cats.map((c) => <th key={c} className="text-center">{NOTIFICATION_CATEGORY[c]}</th>)}</tr></thead>
          <tbody>
            {roles.map(([id, name]) => (
              <tr key={id} className="table-row">
                <td className="font-semibold">{name}</td>
                {cats.map((c) => { const p = get(id, c); return (
                  <td key={c} className="text-center">
                    <div className="inline-flex gap-1">
                      <button disabled={!canEdit} onClick={() => toggle(id, c, 'inApp')} className={`h-7 w-7 rounded-md text-[11px] font-bold ${p?.inApp ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/5'}`} title="Centro de alertas">A</button>
                      <button disabled={!canEdit} onClick={() => toggle(id, c, 'email')} className={`h-7 w-7 rounded-md text-[11px] font-bold ${p?.email ? 'bg-accent-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/5'}`} title="Correo">C</button>
                    </div>
                  </td>) })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Templates({ canEdit }) {
  const toast = useToast()
  const { data, loading, reload } = useAsync(() => notificationsApi.templates(), [])
  const [edit, setEdit] = useState(null)
  const [preview, setPreview] = useState(null)
  if (loading) return <Skeleton className="h-64" />
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((t) => (
          <div key={t.code} className="card p-5">
            <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{t.name}</p><p className="font-mono text-[11px] muted">{t.code}</p></div><Badge tone={t.active ? 'green' : 'slate'}>{t.active ? 'Activa' : 'Inactiva'}</Badge></div>
            <p className="mt-3 text-sm font-medium">{t.subject}</p>
            <div className="mt-4 flex gap-2">
              <button className="btn-secondary btn-sm" onClick={async () => setPreview(await notificationsApi.previewTemplate(t.code, t))}><Eye className="h-3.5 w-3.5" />Vista previa</button>
              {canEdit && <button className="btn-ghost btn-sm" onClick={() => setEdit({ ...t })}><SlidersHorizontal className="h-3.5 w-3.5" />Editar</button>}
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Plantilla · ${edit?.name}`} size="max-w-3xl" description="Variables: {{cliente}} {{producto}} {{folio}} {{importe}} {{vencimiento}} {{dias}} {{empresa}}. Los valores se escapan automáticamente."
        footer={<><button className="btn-secondary" onClick={() => setEdit(null)}>Cancelar</button><Button onClick={async () => { try { await notificationsApi.saveTemplate(edit.code, edit); toast.success('Plantilla guardada'); setEdit(null); reload() } catch (e) { toast.error(errorMessage(e)) } }}>Guardar</Button></>}>
        {edit && <div className="space-y-4"><Input label="Asunto" value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /><Textarea label="Cuerpo (HTML simple)" rows={10} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} className="font-mono text-xs" /><Checkbox checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Activa" /></div>}
      </Modal>
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.subject} size="max-w-2xl">
        {preview && <iframe title="Vista previa" sandbox="" srcDoc={preview.body} className="h-80 w-full rounded-xl bg-white ring-1 ring-slate-200" />}
      </Modal>
    </>
  )
}

function Outbox({ canEdit }) {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const { data, loading, reload } = useAsync(() => notificationsApi.deliveries({ status, page, size: 25 }), [status, page])
  const tone = { SENT: 'green', PENDING: 'sky', FAILED: 'red', SKIPPED: 'amber' }
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 p-4 dark:border-white/[.06]">
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} wrapClass="w-48" aria-label="Estado"><option value="">Todos</option><option value="SENT">Enviados</option><option value="PENDING">Pendientes</option><option value="SKIPPED">Omitidos (sin SMTP)</option><option value="FAILED">Fallidos</option></Select>
        <p className="text-xs muted">Cada intento queda registrado con su resultado y error.</p>
      </div>
      <DataTable loading={loading} rows={data?.content} columns={[
        { key: 'subject', header: 'Correo', render: (r) => <div><p className="font-medium">{r.subject}</p><p className="text-xs muted">{r.recipient}{r.customerName && ` · ${r.customerName}`}</p></div> },
        { key: 'status', header: 'Estado', render: (r) => <Badge tone={tone[r.status]}>{r.status}</Badge> },
        { key: 'attempts', header: 'Intentos' },
        { key: 'lastError', header: 'Resultado', render: (r) => <span className="text-xs muted">{r.lastError || (r.sentAt ? `Enviado ${dateTime(r.sentAt)}` : '—')}</span> },
        { key: 'x', header: '', render: (r) => canEdit && (r.status === 'FAILED' || r.status === 'SKIPPED') && <button className="btn-ghost btn-sm" onClick={async () => { await notificationsApi.retryDelivery(r.id); reload() }}>Reintentar</button> },
      ]} />
      {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.totalElements} onChange={setPage} />}
    </div>
  )
}

const JOBS = { 'subscriptions.activate': 'Activar suscripciones programadas', 'subscriptions.trials': 'Expirar pruebas sin convertir', 'subscriptions.renewals': 'Cerrar y renovar periodos',
  'billing.charges': 'Emitir cargos anticipados', 'billing.dunning': 'Reglas de gracia y suspensión', 'alerts.generate': 'Generar alertas', 'collections.reminders': 'Recordatorios de cobranza' }

function Jobs({ canEdit }) {
  const toast = useToast()
  const { data, loading, reload } = useAsync(() => settingsApi.jobs(), [])
  const [busy, setBusy] = useState(false)
  const run = async () => { setBusy(true); try { await settingsApi.runCycle(); toast.success('Ciclo ejecutado'); reload() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) } }
  if (loading) return <Skeleton className="h-64" />
  return (
    <div className="space-y-6">
      <Card title="Tareas programadas" subtitle="Corren cada hora en una sola instancia a la vez (candado en PostgreSQL). Son idempotentes: repetirlas no duplica cargos."
        actions={canEdit && <Button loading={busy} onClick={run}><Play className="h-4 w-4" />Ejecutar ciclo ahora</Button>}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.latest.map((j) => (
            <div key={j.job} className="rounded-2xl p-4 ring-1 ring-slate-200 dark:ring-white/10">
              <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{JOBS[j.job] || j.job}</p><Badge tone={j.status === 'SUCCESS' ? 'green' : j.status === 'SKIPPED' ? 'slate' : 'red'}>{j.status}</Badge></div>
              <p className="mt-1 font-mono text-[11px] muted">{j.job}</p>
              <p className="mt-2 text-xs muted">Última ejecución {timeAgo(j.started_at)} · {j.processed} procesados{j.failed ? ` · ${j.failed} fallidos` : ''}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Ejecuciones con actividad" pad={false}>
        <DataTable rows={data.recent} dense columns={[{ key: 'job', header: 'Tarea', render: (r) => JOBS[r.job] || r.job }, { key: 'business_date', header: 'Fecha de negocio' },
          { key: 'started_at', header: 'Inicio', render: (r) => dateTime(r.started_at) }, { key: 'processed', header: 'Procesados', align: 'right' }, { key: 'failed', header: 'Fallidos', align: 'right' },
          { key: 'status', header: 'Estado', render: (r) => <Badge tone={r.status === 'SUCCESS' ? 'green' : 'red'}>{r.status}</Badge> }]} />
      </Card>
    </div>
  )
}

