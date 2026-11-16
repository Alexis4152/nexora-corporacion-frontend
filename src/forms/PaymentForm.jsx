import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Wand2 } from 'lucide-react'
import { billingApi } from '../api'
import { errorMessage, fieldErrors } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button, Checkbox, Input, Modal, Segmented, Select, Skeleton, Textarea } from '../components/ui'
import { CustomerPicker } from './pickers'
import { METHODS } from '../utils/labels'
import { date, money, moneyInput, todayIso, uuid } from '../utils/format'

/**
 * Registro de pago con aplicación a cargos. La llave de idempotencia se genera al abrir el formulario: un doble clic
 * o un reintento por red caída nunca registra dos pagos.
 */
export default function PaymentForm({ open, onClose, onDone, customer: preset }) {
  const toast = useToast()
  const { can } = useAuth()
  const [customer, setCustomer] = useState(preset || null)
  const [charges, setCharges] = useState(null)
  const [f, setF] = useState({})
  const [alloc, setAlloc] = useState({})
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [key, setKey] = useState(uuid())
  useEffect(() => {
    if (!open) return
    setCustomer(preset || null)
    setErrors({})
    setAlloc({})
    setKey(uuid())
    setF({ amount: '', receivedOn: todayIso(), method: 'SPEI', reference: '', notes: '', allocationMode: 'AUTO', confirmNow: can('payments.confirm') })
  }, [open, preset, can])
  useEffect(() => {
    if (!customer) { setCharges(null); return }
    setCharges(null)
    billingApi.charges({ customerId: customer.id, status: 'PENDING', size: 100, sort: 'due' }).then((p) => {
      setCharges(p.content)
      const total = p.content.reduce((a, c) => a + Number(c.balance), 0)
      setF((x) => ({ ...x, amount: x.amount || (total > 0 ? total.toFixed(2) : '') }))
    }).catch(() => setCharges([]))
  }, [customer])
  const set = (k) => (e) => { const v = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e; setF((x) => ({ ...x, [k]: v })); setErrors((x) => ({ ...x, [k]: null })) }
  const open$ = useMemo(() => (charges || []).reduce((a, c) => a + Number(c.balance), 0), [charges])
  const amount = Number(f.amount || 0)
  const preview = useMemo(() => {
    if (f.allocationMode === 'NONE') return { applied: 0 }
    if (f.allocationMode === 'MANUAL') return { applied: Object.values(alloc).reduce((a, v) => a + Number(v || 0), 0) }
    let left = amount
    const plan = {}
    for (const c of charges || []) { if (left <= 0) break; const take = Math.min(left, Number(c.balance)); plan[c.id] = take; left -= take }
    return { applied: amount - left, plan }
  }, [f.allocationMode, alloc, amount, charges])
  const credit = Math.max(0, amount - preview.applied)
  const needsRef = !['CASH', 'OTHER'].includes(f.method)

  const submit = async () => {
    const found = {}
    if (!customer) found.customer = 'Elige el cliente'
    if (!(amount > 0)) found.amount = 'Escribe el importe'
    if (needsRef && !f.reference.trim()) found.reference = 'Escribe la referencia'
    if (f.allocationMode === 'MANUAL' && preview.applied > amount) found.amount = 'Lo aplicado supera el importe del pago'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const allocations = f.allocationMode === 'MANUAL' ? Object.entries(alloc).filter(([, v]) => Number(v) > 0).map(([chargeId, v]) => ({ chargeId: Number(chargeId), amount: v })) : null
      const r = await billingApi.register({ customerId: customer.id, amount: f.amount, receivedOn: f.receivedOn, method: f.method, reference: f.reference || null,
        notes: f.notes, allocationMode: f.allocationMode, allocations, confirmNow: f.confirmNow }, key)
      toast.success(`Pago ${r.payment.folio} registrado`)
      onDone?.(r)
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar pago" icon={CreditCard} size="max-w-4xl"
      description="El pago se aplica a cargos pendientes; lo que sobre queda como saldo a favor del cliente."
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button onClick={submit} loading={busy}>Registrar {amount > 0 ? money(amount) : 'pago'}</Button></>}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <CustomerPicker value={customer} onChange={setCustomer} error={errors.customer} required disabled={!!preset} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Importe" required inputMode="decimal" value={f.amount} onChange={(e) => set('amount')(moneyInput(e.target.value))} error={errors.amount} />
            <Input label="Fecha de pago" type="date" max={todayIso()} value={f.receivedOn} onChange={set('receivedOn')} />
            <Select label="Método" value={f.method} onChange={set('method')}>{Object.entries(METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
            <Input label="Referencia bancaria" required={needsRef} value={f.reference} onChange={set('reference')} error={errors.reference} maxLength={80} placeholder={needsRef ? 'Clave de rastreo / folio' : 'Opcional'} />
          </div>
          <Textarea label="Observaciones" value={f.notes} onChange={set('notes')} rows={2} maxLength={1000} />
          {can('payments.confirm') && <Checkbox checked={f.confirmNow} onChange={set('confirmNow')} label="Confirmar de inmediato" description="El dinero ya está verificado en la cuenta. Si no, queda como capturado para que Finanzas lo confirme." />}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="label mb-0">Aplicación</p>
            <Segmented size="sm" value={f.allocationMode} onChange={set('allocationMode')} options={[['AUTO', 'Automática'], ['MANUAL', 'Manual'], ['NONE', 'Saldo a favor']]} />
          </div>
          <div className="max-h-[320px] overflow-y-auto rounded-2xl ring-1 ring-slate-200 scrollbar-thin dark:ring-white/10">
            {!customer && <p className="p-6 text-center text-sm muted">Elige un cliente para ver sus cargos pendientes.</p>}
            {customer && charges === null && <div className="space-y-2 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>}
            {customer && charges?.length === 0 && <p className="p-6 text-center text-sm muted">El cliente no tiene cargos pendientes. El pago quedará como saldo a favor.</p>}
            {charges?.map((c) => {
              const auto = preview.plan?.[c.id]
              return (
                <div key={c.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-white/[.06]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.description}</p>
                    <p className="text-xs muted"><span className="font-mono">{c.folio}</span> · vence {date(c.dueDate)}{c.daysOverdue > 0 && <span className="text-rose-500"> · {c.daysOverdue} días de atraso</span>}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular">{money(c.balance)}</p>
                    {f.allocationMode === 'AUTO' && auto > 0 && <p className="text-[11px] font-semibold text-emerald-600">aplica {money(auto)}</p>}
                  </div>
                  {f.allocationMode === 'MANUAL' && (
                    <div className="flex w-32 items-center gap-1">
                      <input className="input h-9 text-right" inputMode="decimal" value={alloc[c.id] || ''} onChange={(e) => setAlloc((a) => ({ ...a, [c.id]: moneyInput(e.target.value) }))} placeholder="0.00" />
                      <button type="button" title="Aplicar saldo completo" className="btn-ghost btn-sm h-9 w-9 px-0" onClick={() => setAlloc((a) => ({ ...a, [c.id]: Number(c.balance).toFixed(2) }))}><Wand2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {customer && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat l="Pendiente" v={money(open$)} />
              <Stat l="Se aplica" v={money(preview.applied)} tone="text-emerald-600 dark:text-emerald-400" />
              <Stat l="Saldo a favor" v={money(credit)} tone={credit > 0 ? 'text-brand-600 dark:text-brand-300' : ''} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Stat({ l, v, tone = '' }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[.03]"><p className="text-[11px] muted">{l}</p><p className={`font-display text-sm font-bold tabular ${tone}`}>{v}</p></div>
}

