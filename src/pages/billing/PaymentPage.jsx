import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeCheck, CheckCheck, CircleDollarSign, Landmark, RotateCcw, Undo2, Wand2, XCircle } from 'lucide-react'
import { billingApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { Button, Card, ConfirmDialog, DescList, EmptyState, Input, Modal, Select, Skeleton, StatusBadge, Textarea } from '../../components/ui'
import DataTable from '../../components/DataTable'
import DocumentsPanel from '../../components/DocumentsPanel'
import Money from '../../components/Money'
import { METHODS, PAYMENT_STATUS } from '../../utils/labels'
import { date, dateTime, money, moneyInput, todayIso } from '../../utils/format'

const FLOW = ['CAPTURED', 'CONFIRMED', 'RECONCILED']

export default function PaymentPage() {
  const { id } = useParams()
  const { can } = useAuth()
  const toast = useToast()
  const { data: d, loading, reload } = useAsync(() => billingApi.payment(id), [id])
  const [modal, setModal] = useState(null)
  const [unapply, setUnapply] = useState(null)
  const [busy, setBusy] = useState(false)
  if (loading && !d) return <Skeleton className="h-[500px]" />
  if (!d) return <div className="card"><EmptyState title="Pago no encontrado" /></div>
  const p = d.payment
  const run = async (fn, ok) => {
    setBusy(true)
    try { await fn(); toast.success(ok); setModal(null); setUnapply(null); reload() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  const valid = FLOW.includes(p.status)
  const step = FLOW.indexOf(p.status)
  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="mesh p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-mono text-sm font-semibold muted">{p.folio}</p>
              <h1 className="mt-1 font-display text-4xl font-extrabold tabular tracking-tight">{money(p.amount)}</h1>
              <p className="mt-2 text-sm muted"><Link to={`/clientes/${p.customerId}?tab=cobranza`} className="link">{p.customerName}</Link> · {METHODS[p.method]}{p.reference && ` · ${p.reference}`} · recibido el {date(p.receivedOn)}</p>
              <div className="mt-3"><StatusBadge map={PAYMENT_STATUS} value={p.status} /></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.status === 'CAPTURED' && can('payments.confirm') && <Button onClick={() => run(() => billingApi.confirm(id), 'Pago confirmado')} loading={busy}><BadgeCheck className="h-4 w-4" />Confirmar</Button>}
              {p.status === 'CONFIRMED' && can('payments.confirm') && <Button onClick={() => run(() => billingApi.reconcile(id), 'Pago conciliado')} loading={busy}><Landmark className="h-4 w-4" />Conciliar</Button>}
              {valid && Number(p.unapplied) > 0 && can('payments.create') && <button className="btn-secondary" onClick={() => run(() => billingApi.apply(id, []), 'Saldo aplicado a los cargos más antiguos')}><Wand2 className="h-4 w-4" />Aplicar saldo a favor</button>}
              {(p.status === 'CONFIRMED' || p.status === 'RECONCILED') && Number(p.unapplied) > 0 && can('payments.refund') && <button className="btn-secondary" onClick={() => setModal('refund')}><RotateCcw className="h-4 w-4" />Devolver</button>}
              {(p.status === 'CAPTURED' || p.status === 'CONFIRMED') && can('payments.confirm') && <button className="btn-ghost text-amber-600" onClick={() => setModal('reject')}><XCircle className="h-4 w-4" />Rechazar</button>}
              {valid && can('payments.reverse') && <button className="btn-ghost text-rose-600" onClick={() => setModal('reverse')}><Undo2 className="h-4 w-4" />Revertir</button>}
            </div>
          </div>
          {valid && (
            <ol className="mt-8 grid grid-cols-3 gap-2">
              {FLOW.map((s, i) => (
                <li key={s} className={`rounded-xl px-3 py-2.5 text-center text-xs font-semibold ring-1 ${i <= step ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20' : 'ring-slate-200 muted dark:ring-white/10'}`}>
                  {i <= step && <CheckCheck className="mr-1 inline h-3.5 w-3.5" />}{PAYMENT_STATUS[s][0]}
                  <p className="mt-0.5 text-[10px] font-normal">{s === 'CAPTURED' ? dateTime(p.createdAt) : s === 'CONFIRMED' ? (d.confirmedAt ? dateTime(d.confirmedAt) : 'Dinero verificado') : (d.reconciledAt ? dateTime(d.reconciledAt) : 'Cotejado con el banco')}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 dark:divide-white/[.06] dark:border-white/[.06]">
          <Cell l="Aplicado a cargos" v={<Money value={p.allocated} />} />
          <Cell l="Devuelto" v={<Money value={p.refunded} tone={Number(p.refunded) ? '' : 'muted'} />} />
          <Cell l="Saldo a favor" v={<Money value={p.unapplied} tone={Number(p.unapplied) ? 'green' : 'muted'} />} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Aplicaciones" subtitle="A qué cargos se aplicó el pago. Desaplicar regresa el importe como saldo a favor." pad={false}>
            <DataTable rows={d.allocations} dense columns={[
              { key: 'chargeFolio', header: 'Cargo', render: (r) => <div><p className="font-mono text-xs font-semibold">{r.chargeFolio}</p><p className="max-w-[320px] truncate text-xs muted">{r.chargeDescription}</p></div> },
              { key: 'amount', header: 'Importe', align: 'right', render: (r) => <Money value={r.amount} strong tone={r.reversedAt ? 'muted' : ''} /> },
              { key: 'createdAt', header: 'Aplicado', render: (r) => dateTime(r.createdAt) },
              { key: 'reversedAt', header: 'Estado', render: (r) => (r.reversedAt ? <span className="text-xs text-rose-600">Revertida · {r.reversalReason}</span> : <span className="text-xs text-emerald-600">Vigente</span>) },
              { key: 'x', header: '', render: (r) => !r.reversedAt && can('payments.reverse') && <button className="btn-ghost btn-sm text-rose-600" onClick={() => setUnapply(r)}>Desaplicar</button> },
            ]} empty={<EmptyState icon={CircleDollarSign} title="Sin aplicaciones" description="Todo el pago está como saldo a favor." compact />} />
          </Card>
          {d.refunds.length > 0 && (
            <Card title="Devoluciones" pad={false}>
              <DataTable rows={d.refunds} dense columns={[{ key: 'refundedOn', header: 'Fecha', render: (r) => date(r.refundedOn) }, { key: 'amount', header: 'Importe', align: 'right', render: (r) => <Money value={r.amount} /> },
                { key: 'method', header: 'Método', render: (r) => METHODS[r.method] }, { key: 'reason', header: 'Motivo' }, { key: 'userName', header: 'Registró' }]} />
            </Card>
          )}
          {can('documents.read') && <Card title="Comprobantes"><DocumentsPanel ownerType="PAYMENT" ownerId={p.id} defaultCategory="RECEIPT" /></Card>}
        </div>
        <Card title="Detalle">
          <DescList cols={1} items={[['Registró', `${p.registeredBy || '—'} · ${dateTime(p.createdAt)}`], d.confirmedBy && ['Confirmó', `${d.confirmedBy} · ${dateTime(d.confirmedAt)}`],
            d.rejectedAt && ['Rechazado', `${dateTime(d.rejectedAt)} · ${d.rejectReason}`], d.reversedAt && ['Revertido', `${dateTime(d.reversedAt)} · ${d.reversalReason}`], ['Observaciones', d.notes]]} />
        </Card>
      </div>

      <ConfirmDialog open={modal === 'reject'} title="Rechazar pago" tone="danger" confirmLabel="Rechazar" reasonLabel="¿Por qué se rechaza?" loading={busy} onClose={() => setModal(null)}
        message="El dinero no llegó (transferencia devuelta, depósito no localizado). Se desaplica de todos los cargos." onConfirm={(r) => run(() => billingApi.reject(id, r), 'Pago rechazado')} />
      <ConfirmDialog open={modal === 'reverse'} title="Revertir pago" tone="danger" confirmLabel="Revertir" reasonLabel="Motivo del reverso" loading={busy} onClose={() => setModal(null)}
        message="Reverso auditable (error de captura, contracargo). Los cargos vuelven a tener saldo. Se pedirá tu contraseña." onConfirm={(r) => run(() => billingApi.reverse(id, r), 'Pago revertido')} />
      <ConfirmDialog open={!!unapply} title="Desaplicar del cargo" tone="danger" confirmLabel="Desaplicar" reasonLabel="Motivo" loading={busy} onClose={() => setUnapply(null)}
        message={unapply && `${money(unapply.amount)} dejarán de aplicarse a ${unapply.chargeFolio} y quedarán como saldo a favor del pago.`} onConfirm={(r) => run(() => billingApi.unapply(unapply.id, r), 'Aplicación revertida')} />
      <RefundModal open={modal === 'refund'} max={p.unapplied} busy={busy} onClose={() => setModal(null)} onSubmit={(b) => run(() => billingApi.refund(id, b), 'Devolución registrada')} />
    </div>
  )
}

function Cell({ l, v }) {
  return <div className="px-5 py-4 text-center"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{l}</p><p className="mt-1 font-display text-lg font-bold">{v}</p></div>
}

function RefundModal({ open, max, busy, onClose, onSubmit }) {
  const [f, setF] = useState({ amount: '', refundedOn: todayIso(), method: 'SPEI', reference: '', reason: '' })
  return (
    <Modal open={open} onClose={onClose} title="Registrar devolución" icon={RotateCcw} size="max-w-md" description={`Hasta ${money(max)} de saldo a favor. Se pedirá tu contraseña.`}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button loading={busy} disabled={!f.amount || !f.reason.trim()} onClick={() => onSubmit(f)}>Registrar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Importe" value={f.amount} onChange={(e) => setF({ ...f, amount: moneyInput(e.target.value) })} />
        <Input label="Fecha" type="date" max={todayIso()} value={f.refundedOn} onChange={(e) => setF({ ...f, refundedOn: e.target.value })} />
        <Select label="Método" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{Object.entries(METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Input label="Referencia" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <Textarea label="Motivo" required wrapClass="sm:col-span-2" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} rows={2} />
      </div>
    </Modal>
  )
}

