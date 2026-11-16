import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, CreditCard, Repeat, Trophy } from 'lucide-react'
import { crmApi } from '../../api'
import { errorCode, errorMessage, fieldErrors } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { Button, Checkbox, Input, Modal, Segmented, Select, Skeleton, Switch } from '../../components/ui'
import { CustomerPicker } from '../../forms/pickers'
import { METHODS, PERIODS } from '../../utils/labels'
import { money, moneyInput, todayIso } from '../../utils/format'
import { onlyDigits } from '../../utils/validators'

/**
 * Oportunidad ganada → cliente + suscripción + primer pago, en UNA operación transaccional del backend. Si el correo o
 * RFC ya existe, obliga a ligarla al cliente existente (nunca duplica).
 */
export default function ConvertWizard({ prospectId, onClose, onDone }) {
  const { can } = useAuth()
  const { byId } = useCatalog()
  const toast = useToast()
  const navigate = useNavigate()
  const { data: p, loading } = useAsync(() => crmApi.get(prospectId), [prospectId])
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState('new')
  const [existing, setExisting] = useState(null)
  const [c, setC] = useState({})
  const [s, setS] = useState({})
  const [pay, setPay] = useState({ enabled: false })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!p) return
    if (p.duplicateCustomerId) { setMode('existing'); setExisting({ id: p.duplicateCustomerId, tradeName: p.duplicateCustomerName }) }
    setC({ personType: 'MORAL', tradeName: p.businessName, legalName: '', contactName: p.contactName, rfc: '', taxRegime: '', taxZip: '', email: p.email || '', phone: p.phone || '',
      city: p.city || '', state: p.state || '', country: 'MX', industry: p.industry || '', ownerUserId: p.ownerUserId })
    const i = p.interests[0]
    const prod = byId[i?.productId]
    setS({ productId: i?.productId || '', planId: i?.planId || prod?.plans.find((x) => x.highlighted)?.id || prod?.plans[0]?.id || '', billingPeriod: 'MONTHLY', price: '', startDate: todayIso(), trial: false, couponCode: '' })
  }, [p, byId])
  const product = byId[s.productId]
  const plan = product?.plans.find((x) => String(x.id) === String(s.planId))
  const listPrice = plan?.prices.find((x) => x.billingPeriod === s.billingPeriod)
  const base = s.price !== '' && s.price != null ? Number(s.price) : Number(listPrice?.amount || 0)
  const total = listPrice?.taxIncluded ? base : base * 1.16
  useEffect(() => { setPay((x) => ({ ...x, amount: total ? total.toFixed(2) : '' })) }, [total])

  const submit = async () => {
    setBusy(true)
    setErrors({})
    try {
      const body = {
        existingCustomerId: mode === 'existing' ? existing?.id : null,
        customer: mode === 'new' ? { ...c, rfc: c.rfc || null, ownerUserId: c.ownerUserId || null } : null,
        productId: Number(s.productId), planId: Number(s.planId), billingPeriod: s.billingPeriod, price: s.price === '' ? null : s.price, startDate: s.startDate,
        trial: s.trial, trialDays: s.trial ? 14 : null, couponCode: s.couponCode || null,
        firstPayment: !s.trial && pay.enabled ? { amount: pay.amount, method: pay.method || 'SPEI', reference: pay.reference || null, receivedOn: pay.receivedOn || todayIso() } : null,
      }
      const r = await crmApi.convert(prospectId, body)
      toast.success(`¡Ganada! ${r.customerCode} con ${r.subscriptionCode}`)
      onDone?.()
      navigate(`/clientes/${r.customerId}`)
    } catch (e) {
      const code = errorCode(e)
      if (code?.startsWith('DUPLICATE_CUSTOMER:')) { setMode('existing'); setExisting({ id: Number(code.split(':')[1]), tradeName: 'Cliente existente' }); setStep(0) }
      setErrors(fieldErrors(e))
      toast.error(errorMessage(e))
    } finally { setBusy(false) }
  }

  const steps = [['Cliente', Building2], ['Contratación', Repeat], ['Primer pago', CreditCard]]
  const canNext = step === 0 ? (mode === 'existing' ? !!existing : c.tradeName && c.contactName && c.email) : step === 1 ? s.productId && s.planId : true
  return (
    <Modal open onClose={onClose} title="Convertir oportunidad en cliente" icon={Trophy} size="max-w-3xl" description={p ? `${p.businessName} · se conserva todo su historial comercial` : ''}
      footer={<>
        {step > 0 && <button className="btn-secondary" onClick={() => setStep(step - 1)}>Atrás</button>}
        {step < 2 ? <Button disabled={!canNext} onClick={() => setStep(step + 1)}>Continuar</Button> : <Button variant="accent" loading={busy} onClick={submit}><CheckCircle2 className="h-4 w-4" />Confirmar conversión</Button>}
      </>}>
      {loading || !p ? <Skeleton className="h-72" /> : (
        <div className="space-y-6">
          <ol className="flex items-center gap-2">
            {steps.map(([l, Icon], i) => (
              <li key={l} className="flex flex-1 items-center gap-2">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${i <= step ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}><Icon className="h-4 w-4" /></span>
                <span className={`hidden text-sm font-semibold sm:inline ${i === step ? '' : 'muted'}`}>{l}</span>
                {i < steps.length - 1 && <span className={`h-px flex-1 ${i < step ? 'bg-brand-400' : 'bg-slate-200 dark:bg-white/10'}`} />}
              </li>
            ))}
          </ol>
          {step === 0 && (
            <div className="space-y-4">
              <Segmented value={mode} onChange={setMode} options={[['new', 'Cliente nuevo'], ['existing', 'Usar cliente existente']]} />
              {mode === 'existing' ? <CustomerPicker value={existing} onChange={setExisting} required /> : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select label="Tipo de persona" value={c.personType} onChange={(e) => setC({ ...c, personType: e.target.value })}><option value="MORAL">Persona moral</option><option value="FISICA">Persona física</option></Select>
                  <Input label="Nombre comercial" required value={c.tradeName} onChange={(e) => setC({ ...c, tradeName: e.target.value })} error={errors['customer.tradeName']} />
                  <Input label="Razón social" value={c.legalName} onChange={(e) => setC({ ...c, legalName: e.target.value })} />
                  <Input label="RFC" value={c.rfc} onChange={(e) => setC({ ...c, rfc: e.target.value.toUpperCase() })} maxLength={13} error={errors['customer.rfc']} />
                  <Input label="Contacto" required value={c.contactName} onChange={(e) => setC({ ...c, contactName: e.target.value })} />
                  <Input label="Correo" required type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} error={errors['customer.email']} />
                  <Input label="Teléfono" value={c.phone} onChange={(e) => setC({ ...c, phone: onlyDigits(e.target.value) })} />
                  <Input label="Código postal fiscal" value={c.taxZip} onChange={(e) => setC({ ...c, taxZip: onlyDigits(e.target.value, 5) })} />
                </div>
              )}
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Producto" value={s.productId} onChange={(e) => { const pr = byId[e.target.value]; setS({ ...s, productId: e.target.value, planId: pr?.plans[0]?.id || '' }) }}>
                {p.interests.map((i) => byId[i.productId]).filter(Boolean).concat(Object.values(byId).filter((x) => x.active && !p.interests.some((i) => i.productId === x.id)))
                  .map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
              </Select>
              <Select label="Plan" value={s.planId} onChange={(e) => setS({ ...s, planId: e.target.value })}>{product?.plans.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
              <Select label="Periodicidad" value={s.billingPeriod} onChange={(e) => setS({ ...s, billingPeriod: e.target.value })}>
                {Object.entries(PERIODS).map(([k, l]) => { const pr = plan?.prices.find((x) => x.billingPeriod === k); return <option key={k} value={k}>{l}{pr ? ` · ${money(pr.amount)}` : ''}</option> })}
              </Select>
              <Input label="Precio pactado" value={s.price} onChange={(e) => setS({ ...s, price: moneyInput(e.target.value) })} placeholder={listPrice ? money(listPrice.amount) : 'Captura el precio'} />
              <Input label="Fecha de inicio" type="date" value={s.startDate} onChange={(e) => setS({ ...s, startDate: e.target.value })} />
              <Input label="Cupón" value={s.couponCode} onChange={(e) => setS({ ...s, couponCode: e.target.value.toUpperCase() })} disabled={s.trial} />
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-white/[.03] sm:col-span-2">
                <div><p className="text-sm font-semibold">Iniciar con prueba gratuita de 14 días</p><p className="text-xs muted">No se emite cargo hasta convertirla a plan pagado.</p></div>
                <Switch checked={s.trial} onChange={(v) => setS({ ...s, trial: v })} label="Prueba gratuita" />
              </div>
            </div>
          )}
          {step === 2 && (
            s.trial ? <p className="rounded-xl bg-sky-50 p-4 text-sm text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">Es una prueba gratuita: no lleva primer pago.</p> : !can('payments.create') ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm muted dark:bg-white/[.03]">Tu rol no registra pagos. Finanzas aplicará el primer pago al cargo que se emitirá.</p>
            ) : (
              <div className="space-y-4">
                <Checkbox checked={pay.enabled} onChange={(v) => setPay({ ...pay, enabled: v })} label="Registrar el primer pago ahora" description={`Total del primer periodo: ${money(total)} (con IVA)`} />
                {pay.enabled && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Importe" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: moneyInput(e.target.value) })} />
                    <Select label="Método" value={pay.method || 'SPEI'} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{Object.entries(METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
                    <Input label="Referencia" value={pay.reference || ''} onChange={(e) => setPay({ ...pay, reference: e.target.value })} maxLength={80} />
                    <Input label="Fecha de pago" type="date" max={todayIso()} value={pay.receivedOn || todayIso()} onChange={(e) => setPay({ ...pay, receivedOn: e.target.value })} />
                  </div>
                )}
                <div className="rounded-2xl bg-gradient-to-br from-ink-900 to-ink-800 p-5 text-sm text-white">
                  <p className="font-semibold">Al confirmar se crea, en una sola operación:</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-white/70">
                    <li>{mode === 'existing' ? `Venta ligada a ${existing?.tradeName}` : `Cliente ${c.tradeName}`}</li>
                    <li>Suscripción {product?.name} · {plan?.name} · {PERIODS[s.billingPeriod]}</li>
                    <li>El cargo del primer periodo{pay.enabled ? ' y su pago aplicado' : ''}</li>
                    <li>El prospecto queda como ganado, con su historial intacto</li>
                  </ul>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </Modal>
  )
}

