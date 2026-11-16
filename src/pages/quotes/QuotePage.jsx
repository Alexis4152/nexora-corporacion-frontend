import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Copy, FileDown, Pencil, Send, XCircle } from 'lucide-react'
import { opsApi } from '../../api'
import { errorMessage, openPdf } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { Button, Card, EmptyState, Skeleton, StatusBadge } from '../../components/ui'
import DocumentsPanel from '../../components/DocumentsPanel'
import { PERIODS, QUOTE_STATUS } from '../../utils/labels'
import { date, dateTime, money } from '../../utils/format'
import QuoteEditor from './QuoteEditor'

export default function QuotePage() {
  const { id } = useParams()
  const { can } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { data: d, loading, reload } = useAsync(() => opsApi.quote(id), [id])
  const [editing, setEditing] = useState(false)
  if (loading && !d) return <Skeleton className="h-[500px]" />
  if (!d) return <div className="card"><EmptyState title="Cotización no encontrada" /></div>
  const q = d.quote
  const run = async (fn, ok) => { try { const r = await fn(); toast.success(ok); return r } catch (e) { toast.error(errorMessage(e)) } finally { reload() } }
  const manage = can('quotes.manage')
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <section className="card overflow-hidden">
          <div className="mesh p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold muted">{q.folio} · versión {q.versionNo}</span><StatusBadge map={QUOTE_STATUS} value={q.status} /></div>
            <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">{q.title}</h1>
            <p className="mt-1 text-sm muted">Para <Link className="link" to={q.customerId ? `/clientes/${q.customerId}` : `/crm?p=${q.prospectId}`}>{q.targetName}</Link> · vigente hasta {date(q.validUntil)} · {q.ownerName}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => openPdf(`/quotes/${id}/pdf`).catch((e) => toast.error(errorMessage(e)))}><FileDown className="h-4 w-4" />Ver PDF</button>
              {manage && q.status === 'DRAFT' && <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Editar</button>}
              {manage && q.status === 'DRAFT' && <Button onClick={() => run(() => opsApi.quoteStatus(id, 'SENT'), 'Marcada como enviada')}><Send className="h-4 w-4" />Marcar enviada</Button>}
              {manage && q.status === 'SENT' && <Button variant="accent" onClick={() => run(() => opsApi.quoteStatus(id, 'ACCEPTED'), 'Cotización aceptada')}><CheckCircle2 className="h-4 w-4" />Aceptada</Button>}
              {manage && q.status === 'SENT' && <button className="btn-ghost text-rose-600" onClick={() => run(() => opsApi.quoteStatus(id, 'REJECTED'), 'Cotización rechazada')}><XCircle className="h-4 w-4" />Rechazada</button>}
              {manage && q.status !== 'ACCEPTED' && <button className="btn-ghost" onClick={async () => { const r = await run(() => opsApi.quoteVersion(id), 'Nueva versión creada'); if (r) navigate(`/cotizaciones/${r.quote.id}`) }}><Copy className="h-4 w-4" />Nueva versión</button>}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="table-head bg-slate-50/70 dark:bg-white/[.02]"><tr><th>Concepto</th><th className="text-right">Cant.</th><th className="text-right">Precio</th><th className="text-right">Descuento</th><th className="text-right">Importe</th></tr></thead>
              <tbody>{d.items.map((i) => <tr key={i.id} className="table-row"><td><p className="font-medium">{i.description}</p>{i.billingPeriod && <p className="text-xs muted">{PERIODS[i.billingPeriod]}</p>}</td>
                <td className="text-right">{i.quantity}</td><td className="text-right tabular">{money(i.unitPrice)}</td><td className="text-right tabular">{money(i.discount)}</td><td className="text-right font-semibold tabular">{money(i.lineTotal)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="flex justify-end border-t border-slate-100 p-5 dark:border-white/[.06]">
            <div className="w-64 space-y-1 text-sm tabular">
              <div className="flex justify-between"><span className="muted">Subtotal</span><span>{money(q.subtotal)}</span></div>
              <div className="flex justify-between"><span className="muted">Descuento</span><span>− {money(q.discount)}</span></div>
              <div className="flex justify-between"><span className="muted">IVA</span><span>{money(q.tax)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-display text-xl font-extrabold dark:border-white/10"><span>Total</span><span>{money(q.total)}</span></div>
            </div>
          </div>
          {d.conditions && <p className="border-t border-slate-100 px-6 py-4 text-sm muted dark:border-white/[.06]">{d.conditions}</p>}
        </section>
        {can('documents.read') && <Card title="Documentos"><DocumentsPanel ownerType="QUOTE" ownerId={q.id} defaultCategory="QUOTE" /></Card>}
      </div>
      <Card title="Versiones" className="h-fit">
        <ol className="space-y-2">
          {d.versions.map((v) => (
            <li key={v.id}><Link to={`/cotizaciones/${v.id}`} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${v.id === q.id ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/[.03]'}`}>
              <span><span className="block text-sm font-semibold">Versión {v.versionNo}</span><span className="block text-xs muted">{dateTime(v.createdAt)}</span></span>
              <span className="text-right"><StatusBadge map={QUOTE_STATUS} value={v.status} dot={false} /><span className="block text-xs font-semibold tabular">{money(v.total)}</span></span>
            </Link></li>
          ))}
        </ol>
      </Card>
      {editing && <QuoteEditor quote={d} onClose={() => setEditing(false)} onDone={() => { setEditing(false); reload() }} />}
    </div>
  )
}
