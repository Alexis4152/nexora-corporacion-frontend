import { useEffect, useState } from 'react'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { crmApi, opsApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useBranding } from '../../context/BrandingContext'
import { useCatalog } from '../../context/CatalogContext'
import { useToast } from '../../context/ToastContext'
import { Button, Input, Modal, Segmented, Select, Textarea } from '../../components/ui'
import { CustomerPicker } from '../../forms/pickers'
import { PERIODS } from '../../utils/labels'
import { addDays, money, moneyInput, todayIso } from '../../utils/format'

const emptyItem = () => ({ productId: '', planId: '', billingPeriod: 'ANNUAL', description: '', quantity: 1, unitPrice: '', discount: '' })

export default function QuoteEditor({ quote, prospectId, customerId, onClose, onDone }) {
  const toast = useToast()
  const { taxRate = 0.16 } = useBranding()
  const { activeProducts, byId } = useCatalog()
  const [target, setTarget] = useState(prospectId ? 'prospect' : 'customer')
  const [customer, setCustomer] = useState(null)
  const [prospects, setProspects] = useState([])
  const [f, setF] = useState({ prospectId: prospectId || '', title: '', validUntil: addDays(todayIso(), 15), conditions: 'Precios en MXN más IVA. Incluye capacitación en línea y soporte por correo.', discount: '', items: [emptyItem()] })
  const [busy, setBusy] = useState(false)
  useEffect(() => { crmApi.list({ openOnly: true, size: 100 }).then((p) => setProspects(p.content)).catch(() => {}) }, [])
  useEffect(() => {
    if (!quote) return
    setTarget(quote.quote.customerId ? 'customer' : 'prospect')
    if (quote.quote.customerId) setCustomer({ id: quote.quote.customerId, tradeName: quote.quote.targetName })
    setF({ prospectId: quote.quote.prospectId || '', title: quote.quote.title, validUntil: quote.quote.validUntil, conditions: quote.conditions || '', discount: String(quote.quote.discount),
      items: quote.items.map((i) => ({ ...i, productId: i.productId || '', planId: i.planId || '', billingPeriod: i.billingPeriod || '', unitPrice: String(i.unitPrice), discount: String(i.discount) })) })
  }, [quote])
  useEffect(() => { if (customerId && !quote) setCustomer({ id: Number(customerId), tradeName: 'Cliente' }) }, [customerId, quote])
  const setItem = (i, patch) => setF((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }))
  const pickPlan = (i, planId) => {
    const it = f.items[i]
    const pr = byId[it.productId]
    const plan = pr?.plans.find((p) => String(p.id) === String(planId))
    const price = plan?.prices.find((p) => p.billingPeriod === (it.billingPeriod || 'ANNUAL')) || plan?.prices[0]
    setItem(i, { planId, billingPeriod: price?.billingPeriod || it.billingPeriod, unitPrice: price ? String(price.amount) : it.unitPrice, description: plan ? `${pr.name} · Plan ${plan.name}` : it.description })
  }
  const lines = f.items.map((it) => Math.max(0, Number(it.unitPrice || 0) * Number(it.quantity || 0) - Number(it.discount || 0)))
  const subtotal = lines.reduce((a, b) => a + b, 0)
  const disc = Math.min(subtotal, Number(f.discount || 0))
  const tax = (subtotal - disc) * Number(taxRate)
  const submit = async () => {
    setBusy(true)
    try {
      const body = { customerId: target === 'customer' ? customer?.id : null, prospectId: target === 'prospect' ? Number(f.prospectId) : null, title: f.title, validUntil: f.validUntil,
        conditions: f.conditions, discount: f.discount || 0, items: f.items.map((it) => ({ productId: it.productId ? Number(it.productId) : null, planId: it.planId ? Number(it.planId) : null,
          billingPeriod: it.billingPeriod || null, description: it.description, quantity: Number(it.quantity), unitPrice: it.unitPrice || 0, discount: it.discount || 0 })) }
      const r = quote ? await opsApi.updateQuote(quote.quote.id, body) : await opsApi.createQuote(body)
      toast.success('Cotización guardada')
      onDone?.(r)
    } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={quote ? `Editar ${quote.quote.folio}` : 'Nueva cotización'} icon={FileText} size="max-w-5xl"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button loading={busy} disabled={!f.title.trim() || (target === 'customer' ? !customer : !f.prospectId)} onClick={submit}>Guardar borrador</Button></>}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Segmented value={target} onChange={setTarget} options={[['customer', 'Para un cliente'], ['prospect', 'Para un prospecto']]} /></div>
          {target === 'customer' ? <CustomerPicker value={customer} onChange={setCustomer} required /> : (
            <Select label="Prospecto" value={f.prospectId} onChange={(e) => setF({ ...f, prospectId: e.target.value })}><option value="">Elige…</option>{prospects.map((p) => <option key={p.id} value={p.id}>{p.businessName}</option>)}</Select>
          )}
          <Input label="Título" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} placeholder="Propuesta NEXORA HOTEL · Plan Profesional" />
          <Input label="Vigente hasta" type="date" min={todayIso()} value={f.validUntil} onChange={(e) => setF({ ...f, validUntil: e.target.value })} />
          <Input label="Descuento general" value={f.discount} onChange={(e) => setF({ ...f, discount: moneyInput(e.target.value) })} placeholder="0.00" />
        </div>
        <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200 dark:ring-white/10">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="table-head bg-slate-50 dark:bg-white/[.03]"><tr><th>Producto / plan</th><th>Concepto</th><th>Periodo</th><th className="text-right">Cant.</th><th className="text-right">Precio</th><th className="text-right">Desc.</th><th className="text-right">Importe</th><th /></tr></thead>
            <tbody>
              {f.items.map((it, i) => {
                const pr = byId[it.productId]
                return (
                  <tr key={i} className="table-row align-top">
                    <td className="w-48"><div className="flex flex-col gap-1.5">
                      <select className="input h-9 text-xs" value={it.productId} onChange={(e) => setItem(i, { productId: e.target.value, planId: '' })} aria-label="Producto"><option value="">Concepto libre</option>{activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                      {pr && <select className="input h-9 text-xs" value={it.planId} onChange={(e) => pickPlan(i, e.target.value)} aria-label="Plan"><option value="">Plan…</option>{pr.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
                    </div></td>
                    <td><input className="input h-9" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} maxLength={300} aria-label="Concepto" /></td>
                    <td className="w-32"><select className="input h-9 text-xs" value={it.billingPeriod} onChange={(e) => setItem(i, { billingPeriod: e.target.value })} aria-label="Periodo"><option value="">—</option>{Object.entries(PERIODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
                    <td className="w-20"><input className="input h-9 text-right" value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value.replace(/\D/g, '').slice(0, 3) })} aria-label="Cantidad" /></td>
                    <td className="w-28"><input className="input h-9 text-right" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: moneyInput(e.target.value) })} aria-label="Precio" /></td>
                    <td className="w-24"><input className="input h-9 text-right" value={it.discount} onChange={(e) => setItem(i, { discount: moneyInput(e.target.value) })} aria-label="Descuento" /></td>
                    <td className="w-28 pt-5 text-right font-semibold tabular">{money(lines[i])}</td>
                    <td className="w-10 pt-3">{f.items.length > 1 && <button className="btn-ghost btn-sm h-8 w-8 px-0 text-rose-500" onClick={() => setF({ ...f, items: f.items.filter((_, j) => j !== i) })} aria-label="Quitar"><Trash2 className="h-4 w-4" /></button>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-start justify-between gap-4 border-t border-slate-100 p-4 dark:border-white/[.06]">
            <button className="btn-secondary btn-sm" onClick={() => setF({ ...f, items: [...f.items, emptyItem()] })}><Plus className="h-3.5 w-3.5" />Agregar concepto</button>
            <div className="w-64 space-y-1 text-sm tabular">
              <div className="flex justify-between"><span className="muted">Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between"><span className="muted">Descuento</span><span>− {money(disc)}</span></div>
              <div className="flex justify-between"><span className="muted">IVA {(Number(taxRate) * 100).toFixed(0)} %</span><span>{money(tax)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-display text-lg font-extrabold dark:border-white/10"><span>Total</span><span>{money(subtotal - disc + tax)}</span></div>
            </div>
          </div>
        </div>
        <Textarea label="Condiciones" rows={3} value={f.conditions} onChange={(e) => setF({ ...f, conditions: e.target.value })} maxLength={4000} />
      </div>
    </Modal>
  )
}

