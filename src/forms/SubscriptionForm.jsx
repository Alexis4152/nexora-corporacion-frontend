import { useEffect, useMemo, useState } from 'react'
import { Repeat, Sparkles } from 'lucide-react'
import { subscriptionsApi } from '../api'
import { errorCode, errorMessage, fieldErrors } from '../api/client'
import { useBranding } from '../context/BrandingContext'
import { useCatalog } from '../context/CatalogContext'
import { useToast } from '../context/ToastContext'
import { Button, Checkbox, Input, Modal, Select, Switch, Textarea } from '../components/ui'
import { CustomerPicker } from './pickers'
import { METHODS, PERIODS } from '../utils/labels'
import { money, moneyInput, todayIso } from '../utils/format'
import { ProductTile } from '../components/ProductIcon'

const MONTHS = { MONTHLY: 1, QUARTERLY: 3, SEMIANNUAL: 6, ANNUAL: 12 }

/** Alta de suscripción con resumen en vivo (descuento, IVA, total del periodo y MRR equivalente). */
export default function SubscriptionForm({ open, onClose, onDone, customer: presetCustomer, productId: presetProduct }) {
  const toast = useToast()
  const { taxRate = 0.16 } = useBranding()
  const { activeProducts, users } = useCatalog()
  const [customer, setCustomer] = useState(presetCustomer || null)
  const [f, setF] = useState({})
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [duplicate, setDuplicate] = useState(false)
  useEffect(() => {
    if (!open) return
    setCustomer(presetCustomer || null)
    setErrors({})
    setDuplicate(false)
    setF({ productId: presetProduct || '', planId: '', billingPeriod: 'MONTHLY', price: '', startDate: todayIso(), trial: false, trialDays: '', autoRenew: true,
      graceDays: '', preferredPaymentMethod: 'SPEI', discountMode: 'NONE', discountType: 'PERCENT', discountValue: '', discountCycles: '', couponCode: '', notes: '', allowDuplicate: false, sellerUserId: '' })
  }, [open, presetCustomer, presetProduct])
  const set = (k) => (e) => { const v = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e; setF((x) => ({ ...x, [k]: v })); setErrors((x) => ({ ...x, [k]: null })) }
  const product = activeProducts.find((p) => String(p.id) === String(f.productId))
  const plans = product?.plans.filter((p) => p.active) || []
  const plan = plans.find((p) => String(p.id) === String(f.planId))
  const catalogPrice = plan?.prices.find((p) => p.billingPeriod === f.billingPeriod)

  useEffect(() => { if (product && !plans.some((p) => String(p.id) === String(f.planId))) setF((x) => ({ ...x, planId: plans.find((p) => p.highlighted)?.id || plans[0]?.id || '' })) }, [f.productId]) // eslint-disable-line

  const summary = useMemo(() => {
    const list = catalogPrice ? Number(catalogPrice.amount) : null
    const price = f.price !== '' ? Number(f.price) : list
    if (price == null || Number.isNaN(price)) return null
    let discount = 0
    if (f.discountMode === 'MANUAL' && f.discountValue) discount = f.discountType === 'PERCENT' ? (price * Number(f.discountValue)) / 100 : Math.min(price, Number(f.discountValue))
    const taxIncluded = catalogPrice?.taxIncluded ?? false
    const gross = price - discount
    const subtotal = taxIncluded ? gross / (1 + Number(taxRate)) : gross
    const tax = taxIncluded ? gross - subtotal : subtotal * Number(taxRate)
    return { list, price, discount, subtotal, tax, total: subtotal + tax, mrr: subtotal / MONTHS[f.billingPeriod], taxIncluded }
  }, [catalogPrice, f.price, f.discountMode, f.discountType, f.discountValue, f.billingPeriod, taxRate])

  const submit = async () => {
    const found = {}
    if (!customer) found.customer = 'Elige el cliente'
    if (!f.productId) found.productId = 'Elige el producto'
    if (!f.planId) found.planId = 'Elige el plan'
    if (!catalogPrice && f.price === '') found.price = 'El plan no tiene precio para esta periodicidad: indica el precio pactado'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const body = { customerId: customer.id, productId: Number(f.productId), planId: Number(f.planId), billingPeriod: f.billingPeriod, price: f.price === '' ? null : f.price,
        startDate: f.startDate, trial: f.trial, trialDays: f.trial && f.trialDays ? Number(f.trialDays) : null, autoRenew: f.autoRenew,
        graceDays: f.graceDays === '' ? null : Number(f.graceDays), preferredPaymentMethod: f.preferredPaymentMethod,
        discountType: f.discountMode === 'MANUAL' ? f.discountType : 'NONE', discountValue: f.discountMode === 'MANUAL' && f.discountValue ? f.discountValue : null,
        discountCycles: f.discountMode === 'MANUAL' && f.discountCycles ? Number(f.discountCycles) : null, couponCode: f.discountMode === 'COUPON' ? f.couponCode : null,
        notes: f.notes, allowDuplicate: f.allowDuplicate, sellerUserId: f.sellerUserId ? Number(f.sellerUserId) : null }
      const r = await subscriptionsApi.create(body)
      toast.success(`Suscripción ${r.row.code} creada`)
      onDone?.(r)
    } catch (err) {
      if (errorCode(err) === 'DUPLICATE_SUBSCRIPTION') setDuplicate(true)
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva suscripción" icon={Repeat} size="max-w-4xl"
      description="Cliente → Producto → Plan. Cada suscripción conserva su propio precio pactado y condiciones."
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button onClick={submit} loading={busy}>{f.trial ? 'Iniciar prueba gratuita' : 'Crear suscripción'}</Button></>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <CustomerPicker value={customer} onChange={setCustomer} error={errors.customer} required disabled={!!presetCustomer} />
          <div>
            <p className="label">Producto <span className="text-rose-500">*</span></p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {activeProducts.map((p) => (
                <button type="button" key={p.id} onClick={() => set('productId')(String(p.id))}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-left text-xs font-semibold ring-1 transition ${String(f.productId) === String(p.id) ? 'ring-2' : 'ring-slate-200 hover:bg-slate-50 dark:ring-white/10 dark:hover:bg-white/5'}`}
                  style={String(f.productId) === String(p.id) ? { '--tw-ring-color': p.color, background: `${p.color}12` } : {}}>
                  <ProductTile product={p} size="h-7 w-7" iconClass="h-3.5 w-3.5" /><span className="truncate">{p.name.replace(/^NEXORA\s+/i, '')}</span>
                </button>
              ))}
            </div>
            {errors.productId && <p className="field-error">{errors.productId}</p>}
          </div>
          {product && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Plan" required value={f.planId} onChange={set('planId')} error={errors.planId}>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}{p.custom ? ' (a la medida)' : ''}</option>)}
              </Select>
              <Select label="Periodicidad" value={f.billingPeriod} onChange={set('billingPeriod')}>
                {Object.entries(PERIODS).map(([k, l]) => {
                  const pr = plan?.prices.find((x) => x.billingPeriod === k)
                  return <option key={k} value={k}>{l}{pr ? ` · ${money(pr.amount)}` : ' · sin precio de lista'}</option>
                })}
              </Select>
              <Input label="Precio pactado" inputMode="decimal" value={f.price} onChange={(e) => set('price')(moneyInput(e.target.value))} error={errors.price}
                placeholder={catalogPrice ? money(catalogPrice.amount) : 'Captura el precio'} hint={catalogPrice ? 'Vacío = precio de lista vigente' : 'Plan sin precio de lista para esta periodicidad'} />
              <Input label="Fecha de inicio" type="date" value={f.startDate} onChange={set('startDate')} hint="Futura = queda pendiente de activación" />
            </div>
          )}
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[.03]">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-semibold">Prueba gratuita</p><p className="text-xs muted">Al terminar NO se cobra sola: se convierte a plan pagado a mano.</p></div>
              <Switch checked={f.trial} onChange={set('trial')} label="Prueba gratuita" />
            </div>
            {f.trial && <Input wrapClass="mt-3 max-w-[200px]" label="Días de prueba" inputMode="numeric" value={f.trialDays} onChange={(e) => set('trialDays')(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder={String(plan?.trialDays ?? product?.defaultTrialDays ?? 14)} />}
          </div>
          {!f.trial && (
            <div className="space-y-3">
              <p className="label">Descuento</p>
              <div className="flex flex-wrap gap-2">
                {[['NONE', 'Sin descuento'], ['COUPON', 'Cupón'], ['MANUAL', 'Descuento pactado']].map(([k, l]) => (
                  <button type="button" key={k} onClick={() => set('discountMode')(k)} className={`rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 ${f.discountMode === k ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-200 dark:ring-white/10'}`}>{l}</button>
                ))}
              </div>
              {f.discountMode === 'COUPON' && <Input label="Código de cupón" value={f.couponCode} onChange={(e) => set('couponCode')(e.target.value.toUpperCase())} maxLength={30} />}
              {f.discountMode === 'MANUAL' && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Select label="Tipo" value={f.discountType} onChange={set('discountType')}><option value="PERCENT">Porcentaje</option><option value="AMOUNT">Importe fijo</option></Select>
                  <Input label={f.discountType === 'PERCENT' ? 'Porcentaje' : 'Importe'} inputMode="decimal" value={f.discountValue} onChange={(e) => set('discountValue')(moneyInput(e.target.value))} />
                  <Input label="Periodos" inputMode="numeric" value={f.discountCycles} onChange={(e) => set('discountCycles')(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Siempre" />
                </div>
              )}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Método preferido" value={f.preferredPaymentMethod} onChange={set('preferredPaymentMethod')}>{Object.entries(METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
            <Input label="Días de gracia" inputMode="numeric" value={f.graceDays} onChange={(e) => set('graceDays')(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder={String(product?.defaultGraceDays ?? 5)} />
            <div className="flex items-end pb-2"><Checkbox checked={f.autoRenew} onChange={set('autoRenew')} label="Renovación automática" /></div>
          </div>
          <Select label="Vendedor" value={f.sellerUserId} onChange={set('sellerUserId')} hint="Quién cerró la venta; cuenta para su desempeño">
            <option value="">Ejecutivo asignado al cliente</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
          <Textarea label="Observaciones" value={f.notes} onChange={set('notes')} rows={2} maxLength={2000} />
          {duplicate && <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/20"><Checkbox checked={f.allowDuplicate} onChange={set('allowDuplicate')} label="Es una suscripción adicional (otra sucursal o razón)" description="El cliente ya tiene una suscripción vigente de este producto." /></div>}
        </div>
        <aside className="h-fit rounded-2xl bg-gradient-to-br from-ink-900 to-ink-800 p-5 text-white lg:sticky lg:top-0">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-300"><Sparkles className="h-3.5 w-3.5" />Resumen</p>
          {product && plan && summary ? (
            <div className="mt-4 space-y-3 text-sm">
              <div><p className="text-white/50">Producto y plan</p><p className="font-semibold">{product.name} · {plan.name}</p></div>
              <div className="space-y-1.5 border-t border-white/10 pt-3 tabular">
                {summary.list != null && summary.price !== summary.list && <Row l="Precio de lista" v={money(summary.list)} muted />}
                <Row l={`Precio ${PERIODS[f.billingPeriod].toLowerCase()}`} v={money(summary.price)} />
                {summary.discount > 0 && <Row l="Descuento" v={`− ${money(summary.discount)}`} />}
                <Row l="Subtotal" v={money(summary.subtotal)} />
                <Row l={`IVA ${(Number(taxRate) * 100).toFixed(0)} %${summary.taxIncluded ? ' (incluido)' : ''}`} v={money(summary.tax)} />
                <div className="flex items-baseline justify-between border-t border-white/10 pt-2"><span className="text-white/60">Total por periodo</span><span className="font-display text-xl font-extrabold">{money(summary.total)}</span></div>
              </div>
              <div className="rounded-xl bg-white/[.06] p-3 ring-1 ring-white/10">
                <p className="text-[11px] text-white/50">Aporte al MRR {f.trial ? '(al convertir)' : ''}</p>
                <p className="font-display text-lg font-bold text-accent-300">{money(summary.mrr)}<span className="text-xs font-medium text-white/50"> /mes sin IVA</span></p>
              </div>
            </div>
          ) : <p className="mt-4 text-sm text-white/50">Elige producto, plan y periodicidad para ver el resumen.</p>}
        </aside>
      </div>
    </Modal>
  )
}

function Row({ l, v, muted }) {
  return <div className={`flex justify-between gap-3 ${muted ? 'text-white/40 line-through' : ''}`}><span className="text-white/60">{l}</span><span>{v}</span></div>
}

