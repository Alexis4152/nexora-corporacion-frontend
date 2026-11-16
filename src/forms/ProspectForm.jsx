import { useEffect, useState } from 'react'
import { Target, X } from 'lucide-react'
import { crmApi } from '../api'
import { errorMessage, fieldErrors } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { useToast } from '../context/ToastContext'
import { Button, Input, Modal, Select, Textarea } from '../components/ui'
import { SOURCES } from '../utils/labels'
import { moneyInput } from '../utils/format'
import { onlyDigits, phone, required, validate } from '../utils/validators'

const EMPTY = { contactName: '', businessName: '', phone: '', whatsapp: '', email: '', city: '', state: '', industry: '', source: 'WEBSITE', ownerUserId: '',
  estimatedBudget: '', estimatedValue: '', nextContactAt: '', comments: '', interests: [] }

export default function ProspectForm({ open, onClose, onDone, prospect }) {
  const toast = useToast()
  const { user, can } = useAuth()
  const { activeProducts, users } = useCatalog()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(prospect ? { ...EMPTY, ...Object.fromEntries(Object.entries(prospect).map(([k, v]) => [k, v ?? ''])),
      nextContactAt: prospect.nextContactAt ? new Date(prospect.nextContactAt).toISOString().slice(0, 16) : '', interests: prospect.interests || [] }
      : { ...EMPTY, ownerUserId: String(user.id) })
  }, [open, prospect, user])
  const set = (k) => (e) => { const v = e?.target ? e.target.value : e; setForm((f) => ({ ...f, [k]: v })); setErrors((x) => ({ ...x, [k]: null })) }
  const toggleProduct = (id) => setForm((f) => ({ ...f, interests: f.interests.some((i) => i.productId === id) ? f.interests.filter((i) => i.productId !== id) : [...f.interests, { productId: id, planId: null }] }))
  const setPlan = (productId, planId) => setForm((f) => ({ ...f, interests: f.interests.map((i) => (i.productId === productId ? { ...i, planId: planId ? Number(planId) : null } : i)) }))

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form, { businessName: [required('el negocio')], contactName: [required('el contacto')], phone: [phone],
      email: [(v) => (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Correo no válido' : null)] })
    if (!form.interests.length) found.interests = 'Elige al menos un producto de interés'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    const body = { ...form, ownerUserId: form.ownerUserId ? Number(form.ownerUserId) : null, estimatedBudget: form.estimatedBudget || null,
      estimatedValue: form.estimatedValue || null, nextContactAt: form.nextContactAt ? new Date(form.nextContactAt).toISOString() : null, probability: prospect?.probability ?? null }
    try {
      const r = prospect ? await crmApi.update(prospect.id, body) : await crmApi.create(body)
      toast.success(prospect ? 'Prospecto actualizado' : 'Prospecto registrado')
      onDone?.(r)
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={prospect ? 'Editar prospecto' : 'Registrar prospecto'} icon={Target} size="max-w-3xl"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button onClick={submit} loading={busy}>{prospect ? 'Guardar' : 'Registrar prospecto'}</Button></>}>
      <form onSubmit={submit} className="space-y-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Negocio" required value={form.businessName} onChange={set('businessName')} error={errors.businessName} maxLength={150} />
          <Input label="Contacto" required value={form.contactName} onChange={set('contactName')} error={errors.contactName} maxLength={150} />
          <Input label="Correo" type="email" value={form.email} onChange={set('email')} error={errors.email} maxLength={150} />
          <Input label="Teléfono" inputMode="numeric" value={form.phone} onChange={(e) => set('phone')(onlyDigits(e.target.value))} error={errors.phone} placeholder="10 dígitos" />
          <Input label="Ciudad" value={form.city} onChange={set('city')} maxLength={100} />
          <Input label="Estado" value={form.state} onChange={set('state')} maxLength={100} />
          <Input label="Giro comercial" value={form.industry} onChange={set('industry')} maxLength={80} />
          <Select label="Fuente" value={form.source} onChange={set('source')}>{Object.entries(SOURCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        </div>
        <div>
          <p className="label">Productos de interés <span className="text-rose-500">*</span></p>
          <div className="flex flex-wrap gap-2">
            {activeProducts.map((p) => {
              const on = form.interests.some((i) => i.productId === p.id)
              return (
                <button type="button" key={p.id} onClick={() => toggleProduct(p.id)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition ${on ? 'text-white ring-transparent' : 'ring-slate-200 hover:bg-slate-50 dark:ring-white/10 dark:hover:bg-white/5'}`}
                  style={on ? { background: p.color } : {}}>
                  {p.name.replace(/^NEXORA\s+/i, '')}{on && <X className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </div>
          {errors.interests && <p className="field-error">{errors.interests}</p>}
          {form.interests.length > 0 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {form.interests.map((i) => {
                const p = activeProducts.find((x) => x.id === i.productId)
                return p && (
                  <Select key={i.productId} label={`Plan de interés · ${p.name.replace(/^NEXORA\s+/i, '')}`} value={i.planId || ''} onChange={(e) => setPlan(i.productId, e.target.value)}>
                    <option value="">Aún no definido</option>{p.plans.filter((pl) => pl.active).map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                  </Select>
                )
              })}
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Presupuesto estimado" inputMode="decimal" value={form.estimatedBudget} onChange={(e) => set('estimatedBudget')(moneyInput(e.target.value))} />
          <Input label="Valor de la oportunidad (anual)" inputMode="decimal" value={form.estimatedValue} onChange={(e) => set('estimatedValue')(moneyInput(e.target.value))} />
          <Input label="Próximo contacto" type="datetime-local" value={form.nextContactAt} onChange={set('nextContactAt')} />
          {can('prospects.read_all') && (
            <Select label="Ejecutivo responsable" value={form.ownerUserId} onChange={set('ownerUserId')}>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          )}
          <Textarea label="Comentarios" wrapClass={can('prospects.read_all') ? 'sm:col-span-2' : 'sm:col-span-3'} value={form.comments} onChange={set('comments')} rows={2} maxLength={4000} />
        </div>
      </form>
    </Modal>
  )
}

