import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, MessageSquare, Pencil, Settings2 } from 'lucide-react'
import { opsApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { useQuick } from '../../context/QuickActions'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { Avatar, Button, Card, DescList, EmptyState, Modal, ProductChip, Select, Skeleton, StatusBadge, Textarea } from '../../components/ui'
import DocumentsPanel from '../../components/DocumentsPanel'
import { TICKET_CATEGORY, TICKET_PRIORITY, TICKET_STATUS } from '../../utils/labels'
import { dateTime } from '../../utils/format'

const NEXT = { OPEN: ['IN_REVIEW', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'], IN_REVIEW: ['IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['IN_REVIEW', 'WAITING_CUSTOMER', 'RESOLVED'], WAITING_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'], RESOLVED: ['CLOSED', 'IN_PROGRESS'], CLOSED: ['IN_PROGRESS'] }

export default function TicketPage() {
  const { id } = useParams()
  const { can, user } = useAuth()
  const { users } = useCatalog()
  const quick = useQuick()
  const toast = useToast()
  const { data: d, loading, reload } = useAsync(() => opsApi.ticket(id), [id])
  const [comment, setComment] = useState('')
  const [resolve, setResolve] = useState(null)
  const [busy, setBusy] = useState(false)
  if (loading && !d) return <Skeleton className="h-[500px]" />
  if (!d) return <div className="card"><EmptyState title="Ticket no encontrado" /></div>
  const t = d.ticket
  const manage = can('support.manage')
  const run = async (fn) => { setBusy(true); try { await fn(); reload() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) } }
  const status = (to) => (to === 'RESOLVED' || to === 'CLOSED') && !d.resolution ? setResolve({ to, text: '' }) : run(() => opsApi.ticketStatus(id, { status: to }))
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <section className="card p-6">
          <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold muted">{t.folio}</span><StatusBadge map={TICKET_STATUS} value={t.status} /><StatusBadge map={TICKET_PRIORITY} value={t.priority} />{t.productCode && <ProductChip code={t.productCode} color={t.productColor} />}</div>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">{t.subject}</h1>
          <p className="mt-1 text-sm muted"><Link to={`/clientes/${t.customerId}?tab=soporte`} className="link">{t.customerName}</Link> · {TICKET_CATEGORY[t.category]} · abierto {dateTime(t.createdAt)}</p>
          <p className="mt-4 whitespace-pre-line text-[15px]">{d.description}</p>
          {d.resolution && <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"><p className="font-semibold">Solución</p><p className="whitespace-pre-line">{d.resolution}</p></div>}
          {manage && (
            <div className="mt-5 flex flex-wrap gap-2">
              {NEXT[t.status].map((s) => <button key={s} className={s === 'RESOLVED' ? 'btn-accent btn-sm' : 'btn-secondary btn-sm'} disabled={busy} onClick={() => status(s)}>{s === 'RESOLVED' && <CheckCircle2 className="h-3.5 w-3.5" />}{TICKET_STATUS[s][0]}</button>)}
              <button className="btn-ghost btn-sm" onClick={() => quick.open('ticket', { ticket: d, onDone: reload })}><Pencil className="h-3.5 w-3.5" />Editar</button>
            </div>
          )}
        </section>
        <Card title="Conversación interna">
          <ol className="space-y-4">
            {d.comments.map((c) => c.system ? (
              <li key={c.id} className="flex items-center gap-2 text-xs muted"><Settings2 className="h-3.5 w-3.5" />{c.body} · {c.authorName} · {dateTime(c.createdAt)}</li>
            ) : (
              <li key={c.id} className="flex gap-3">
                <Avatar name={c.authorName || '?'} size="h-8 w-8 text-[10px]" />
                <div className={`min-w-0 flex-1 rounded-2xl px-4 py-3 ${c.authorId === user.id ? 'bg-brand-50 dark:bg-brand-500/10' : 'bg-slate-50 dark:bg-white/[.03]'}`}>
                  <p className="text-xs font-semibold">{c.authorName} <span className="font-normal muted">· {dateTime(c.createdAt)}</span></p>
                  <p className="mt-1 whitespace-pre-line text-sm">{c.body}</p>
                </div>
              </li>
            ))}
            {!d.comments.length && <li className="text-sm muted">Sin comentarios.</li>}
          </ol>
          {manage && (
            <div className="mt-5 flex gap-2">
              <Textarea wrapClass="flex-1" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escribe un comentario interno…" maxLength={5000} />
              <Button className="self-end" disabled={!comment.trim()} loading={busy} onClick={() => run(async () => { await opsApi.comment(id, comment); setComment('') })}><MessageSquare className="h-4 w-4" />Enviar</Button>
            </div>
          )}
        </Card>
        {can('documents.read') && <Card title="Evidencias"><DocumentsPanel ownerType="TICKET" ownerId={t.id} defaultCategory="EVIDENCE" /></Card>}
      </div>
      <Card title="Atención" className="h-fit">
        <DescList cols={1} items={[['Primera respuesta', t.firstResponseAt ? dateTime(t.firstResponseAt) : 'Pendiente'], ['Resuelto', t.resolvedAt ? dateTime(t.resolvedAt) : '—'], ['Cerrado', d.closedAt ? dateTime(d.closedAt) : '—']]} />
        {manage && (
          <div className="mt-5"><Select label="Responsable" value={t.assigneeId || ''} onChange={(e) => run(() => opsApi.assignTicket(id, e.target.value ? Number(e.target.value) : null))}>
            <option value="">Sin asignar</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></div>
        )}
      </Card>
      <Modal open={!!resolve} onClose={() => setResolve(null)} title="Registrar la solución" icon={CheckCircle2}
        footer={<><button className="btn-secondary" onClick={() => setResolve(null)}>Cancelar</button><Button disabled={!resolve?.text?.trim()} onClick={() => { const r = resolve; setResolve(null); run(() => opsApi.ticketStatus(id, { status: r.to, resolution: r.text })) }}>Guardar</Button></>}>
        <Textarea label="¿Cómo se resolvió?" rows={4} value={resolve?.text || ''} onChange={(e) => setResolve({ ...resolve, text: e.target.value })} />
      </Modal>
    </div>
  )
}

