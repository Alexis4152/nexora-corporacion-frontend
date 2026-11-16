import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, Check, FileText, Mail, MessageSquare, Pencil, Phone, Rocket, Trophy, Users } from 'lucide-react'
import { crmApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { useQuick } from '../../context/QuickActions'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { Badge, Button, DescList, Drawer, Input, ProductChip, Select, Skeleton, StatusBadge, Tabs, Textarea } from '../../components/ui'
import DocumentsPanel from '../../components/DocumentsPanel'
import { ACTIVITY_TYPES, LOST_REASONS, OPEN_STAGES, SOURCES, STAGES, label } from '../../utils/labels'
import { dateTime, money, timeAgo } from '../../utils/format'
import { canMove } from './stages'

const ACT_ICON = { CALL: Phone, MESSAGE: MessageSquare, EMAIL: Mail, MEETING: Users, DEMO: Rocket, NOTE: FileText, COMMITMENT: Check, STAGE_CHANGE: Check, CONVERSION: Trophy }

export default function ProspectDrawer({ id, onClose, onChanged, onConvert }) {
  const { can } = useAuth()
  const { byId } = useCatalog()
  const quick = useQuick()
  const toast = useToast()
  const { data: p, loading, reload } = useAsync(() => crmApi.get(id), [id])
  const [tab, setTab] = useState('activity')
  const [act, setAct] = useState({ type: 'CALL', subject: '', body: '', scheduledAt: '', completed: true })
  const [busy, setBusy] = useState(false)
  const changed = () => { reload(); onChanged?.() }
  const stage = async (to, extra = {}) => {
    try { await crmApi.stage(id, { stage: to, ...extra }); toast.success(`Etapa: ${label(STAGES, to)}`); changed() } catch (e) { toast.error(errorMessage(e)) }
  }
  const addActivity = async (e) => {
    e.preventDefault()
    if (!act.subject.trim()) return
    setBusy(true)
    try {
      await crmApi.addActivity(id, { ...act, scheduledAt: act.scheduledAt ? new Date(act.scheduledAt).toISOString() : null, completed: !act.scheduledAt })
      setAct({ type: 'CALL', subject: '', body: '', scheduledAt: '', completed: true })
      toast.success('Actividad registrada')
      changed()
    } catch (err) { toast.error(errorMessage(err)) } finally { setBusy(false) }
  }
  const complete = async (a) => { try { await crmApi.completeActivity(a.id, 'Realizada'); changed() } catch (e) { toast.error(errorMessage(e)) } }
  const next = p && OPEN_STAGES[OPEN_STAGES.indexOf(p.stage) + 1]

  return (
    <Drawer open onClose={onClose} title={p?.businessName || 'Prospecto'} width="max-w-3xl"
      subtitle={p && <div className="flex flex-wrap items-center gap-2"><StatusBadge map={STAGES} value={p.stage} /><span>{p.contactName}</span>{p.ownerName && <span>· {p.ownerName}</span>}</div>}
      headerExtra={p && can('prospects.update') && p.stage !== 'WON' && <button className="btn-ghost btn-sm" onClick={() => quick.open('prospect', { prospect: p, onDone: changed })}><Pencil className="h-3.5 w-3.5" />Editar</button>}
      footer={p && can('prospects.update') && p.stage !== 'WON' && <>
        {p.stage !== 'LOST' && p.stage !== 'DISCARDED' && <button className="btn-ghost text-rose-600" onClick={() => stage('LOST', { lostReason: 'OTHER', lostDetail: 'Marcado desde la ficha' })}>Perdida</button>}
        {(p.stage === 'LOST' || p.stage === 'DISCARDED') && <button className="btn-secondary" onClick={() => stage('CONTACTED')}>Reabrir</button>}
        {next && next !== 'WON' && <button className="btn-secondary" onClick={() => stage(next)}>Avanzar a {label(STAGES, next)}</button>}
        {can('prospects.convert') && canMove(p.stage, 'WON') && <Button variant="accent" onClick={() => onConvert(id)}><Trophy className="h-4 w-4" />Ganada · convertir en cliente</Button>}
      </>}>
      {loading && !p ? <Skeleton className="h-96" /> : p && (
        <div className="space-y-6">
          {p.convertedCustomerId && (
            <Link to={`/clientes/${p.convertedCustomerId}`} className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20">
              <Trophy className="h-5 w-5" /><span className="flex-1">Convertido en cliente el {dateTime(p.convertedAt)}.</span><b>Ver cliente →</b>
            </Link>
          )}
          {p.duplicateCustomerId && !p.convertedCustomerId && (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20">
              Ya existe el cliente <Link className="font-semibold underline" to={`/clientes/${p.duplicateCustomerId}`}>{p.duplicateCustomerName}</Link> con el mismo correo. Al convertir, liga la venta a ese cliente.
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-4">
            <Box l="Valor estimado" v={p.estimatedValue ? money(p.estimatedValue) : '—'} />
            <Box l="Probabilidad" v={`${p.probability}%`} />
            <Box l="Presupuesto" v={p.estimatedBudget ? money(p.estimatedBudget) : '—'} />
            <Box l="En la etapa desde" v={timeAgo(p.stageChangedAt)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {OPEN_STAGES.map((s) => (
              <button key={s} disabled={!can('prospects.update') || !canMove(p.stage, s)} onClick={() => stage(s)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ring-1 transition disabled:cursor-default ${p.stage === s ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-200 hover:bg-slate-50 disabled:opacity-40 dark:ring-white/10 dark:hover:bg-white/5'}`}>
                {label(STAGES, s)}
              </button>
            ))}
          </div>
          <Tabs value={tab} onChange={setTab} items={[{ key: 'activity', label: 'Seguimiento', count: p.activities.length }, { key: 'info', label: 'Datos' }, can('documents.read') && { key: 'docs', label: 'Documentos' }]} />
          {tab === 'activity' && (
            <div className="space-y-5">
              {can('prospects.update') && p.stage !== 'WON' && (
                <form onSubmit={addActivity} className="space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/[.03]">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Select value={act.type} onChange={(e) => setAct({ ...act, type: e.target.value })} aria-label="Tipo">{['CALL', 'MESSAGE', 'EMAIL', 'MEETING', 'DEMO', 'NOTE', 'COMMITMENT'].map((k) => <option key={k} value={k}>{ACTIVITY_TYPES[k]}</option>)}</Select>
                    <Input wrapClass="sm:col-span-2" placeholder="Asunto (ej. Llamada de seguimiento)" value={act.subject} onChange={(e) => setAct({ ...act, subject: e.target.value })} maxLength={200} />
                  </div>
                  <Textarea placeholder="Notas de la conversación, acuerdos…" rows={2} value={act.body} onChange={(e) => setAct({ ...act, body: e.target.value })} maxLength={4000} />
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-xs muted"><CalendarPlus className="h-4 w-4" />Programar para</div>
                    <input type="datetime-local" className="input h-9 w-auto text-[13px]" value={act.scheduledAt} onChange={(e) => setAct({ ...act, scheduledAt: e.target.value })} aria-label="Fecha programada" />
                    <span className="text-xs muted">(vacío = ya realizada)</span>
                    <Button size="sm" className="ml-auto" loading={busy} type="submit">Registrar</Button>
                  </div>
                </form>
              )}
              <ol className="relative space-y-4 border-l border-slate-200 pl-6 dark:border-white/10">
                {p.activities.map((a) => {
                  const Icon = ACT_ICON[a.type] || FileText
                  const pending = !a.completedAt && a.scheduledAt
                  return (
                    <li key={a.id} className="relative">
                      <span className={`absolute -left-[35px] grid h-7 w-7 place-items-center rounded-full ring-4 ring-white dark:ring-ink-900 ${pending ? 'bg-amber-100 text-amber-600' : a.type === 'STAGE_CHANGE' ? 'bg-slate-100 text-slate-500 dark:bg-white/10' : 'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300'}`}><Icon className="h-3.5 w-3.5" /></span>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold">{a.subject}</p>
                        <span className="text-xs muted">{dateTime(a.completedAt || a.scheduledAt || a.createdAt)}</span>
                      </div>
                      <p className="text-xs muted">{ACTIVITY_TYPES[a.type]}{a.userName && ` · ${a.userName}`}{a.outcome && ` · ${a.outcome}`}</p>
                      {a.body && <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{a.body}</p>}
                      {pending && can('prospects.update') && <button className="btn-secondary btn-sm mt-2" onClick={() => complete(a)}><Check className="h-3.5 w-3.5" />Marcar realizada</button>}
                    </li>
                  )
                })}
                {!p.activities.length && <li className="text-sm muted">Sin actividad todavía.</li>}
              </ol>
            </div>
          )}
          {tab === 'info' && (
            <div className="space-y-5">
              <DescList items={[['Contacto', p.contactName], ['Correo', p.email], ['Teléfono', p.phone], ['WhatsApp', p.whatsapp], ['Ciudad', [p.city, p.state].filter(Boolean).join(', ')],
                ['Giro', p.industry], ['Fuente', SOURCES[p.source]], ['Próximo contacto', p.nextContactAt ? dateTime(p.nextContactAt) : '—'], ['Registrado', dateTime(p.createdAt)],
                p.lostReason && ['Motivo de pérdida', `${label(LOST_REASONS, p.lostReason)}${p.lostDetail ? ` · ${p.lostDetail}` : ''}`]]} />
              <div><p className="label">Productos de interés</p><div className="flex flex-wrap gap-2">{p.interests.map((i) => { const pr = byId[i.productId]; const pl = pr?.plans.find((x) => x.id === i.planId); return <span key={i.productId} className="inline-flex items-center gap-1.5"><ProductChip code={pr?.code} color={pr?.color} size="md" />{pl && <Badge>{pl.name}</Badge>}</span> })}</div></div>
              {p.comments && <div><p className="label">Comentarios</p><p className="whitespace-pre-line text-sm">{p.comments}</p></div>}
              {can('quotes.manage') && <Link to={`/cotizaciones?new=1&prospectId=${p.id}`} className="btn-secondary"><FileText className="h-4 w-4" />Crear cotización</Link>}
            </div>
          )}
          {tab === 'docs' && <DocumentsPanel ownerType="PROSPECT" ownerId={p.id} defaultCategory="COMMERCIAL" />}
        </div>
      )}
    </Drawer>
  )
}

function Box({ l, v }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[.03]"><p className="text-[11px] muted">{l}</p><p className="truncate font-display text-[15px] font-bold tabular">{v}</p></div>
}

