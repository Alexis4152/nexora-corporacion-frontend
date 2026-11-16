import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { customersApi } from '../api'
import { errorMessage, fieldErrors } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { useToast } from '../context/ToastContext'
import { Button, Input, Modal, Select, Textarea } from '../components/ui'
import { email, onlyDigits, phone, required, rfc, validate, zip } from '../utils/validators'

const EMPTY = { personType: 'MORAL', tradeName: '', legalName: '', contactName: '', rfc: '', taxRegime: '', taxZip: '', email: '', phone: '', whatsapp: '',
  address: '', city: '', state: '', country: 'MX', industry: '', ownerUserId: '', notes: '' }
const REGIMES = [['601', '601 · General de Ley Personas Morales'], ['603', '603 · Personas Morales sin fines de lucro'], ['605', '605 · Sueldos y salarios'],
  ['606', '606 · Arrendamiento'], ['612', '612 · Actividades Empresariales y Profesionales'], ['621', '621 · Incorporación Fiscal'], ['626', '626 · RESICO']]

/** Alta/edición de cliente. Los datos fiscales solo se editan con permiso fiscal (si no, llegan enmascarados). */
export default function CustomerForm({ open, onClose, onDone, customer, initial }) {
  const toast = useToast()
  const { can, user } = useAuth()
  const { users } = useCatalog()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const fiscal = can('customers.fiscal_read') || !customer
  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(customer ? { ...EMPTY, ...Object.fromEntries(Object.entries(customer).map(([k, v]) => [k, v ?? ''])), rfc: customer.fiscalMasked ? '' : customer.rfc || '' } : { ...EMPTY, ownerUserId: user?.id ? String(user.id) : '', ...initial })
  }, [open, customer, initial]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => { const v = e?.target ? e.target.value : e; setForm((f) => ({ ...f, [k]: v })); setErrors((x) => ({ ...x, [k]: null })) }

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form, { tradeName: [required('el nombre comercial')], contactName: [required('el contacto')], email: [required('el correo'), email],
      phone: [phone], rfc: [rfc], taxZip: [zip] })
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    const body = { ...form, rfc: form.rfc?.toUpperCase() || null, ownerUserId: form.ownerUserId || null, tagIds: customer?.tags?.map((t) => t.id) }
    try {
      const r = customer ? await customersApi.update(customer.id, body) : await customersApi.create(body)
      toast.success(customer ? 'Cliente actualizado' : `Cliente ${r.code} registrado`)
      onDone?.(r)
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={customer ? `Editar ${customer.tradeName}` : 'Registrar cliente'} icon={Building2} size="max-w-3xl"
      description="Un cliente es una empresa o persona única: contrate uno o varios productos, se registra una sola vez."
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button onClick={submit} loading={busy}>{customer ? 'Guardar cambios' : 'Registrar cliente'}</Button></>}>
      <form onSubmit={submit} className="space-y-6" noValidate>
        <section className="grid gap-4 sm:grid-cols-2">
          <Select label="Tipo de persona" value={form.personType} onChange={set('personType')}><option value="MORAL">Persona moral</option><option value="FISICA">Persona física</option></Select>
          <Input label="Nombre comercial" required value={form.tradeName} onChange={set('tradeName')} error={errors.tradeName} maxLength={150} />
          <Input label="Contacto principal" required value={form.contactName} onChange={set('contactName')} error={errors.contactName} maxLength={150} />
          <Input label="Correo" type="email" required value={form.email} onChange={set('email')} error={errors.email} maxLength={150} />
          <Input label="Teléfono" inputMode="numeric" value={form.phone} onChange={(e) => set('phone')(onlyDigits(e.target.value))} error={errors.phone} placeholder="10 dígitos" />
          <Input label="WhatsApp" inputMode="numeric" value={form.whatsapp} onChange={(e) => set('whatsapp')(onlyDigits(e.target.value, 13))} error={errors.whatsapp} />
        </section>
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Datos fiscales {!fiscal && '· protegidos'}</h3>
          {fiscal ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Razón social" value={form.legalName} onChange={set('legalName')} maxLength={250} />
              <Input label="RFC" value={form.rfc} onChange={(e) => set('rfc')(e.target.value.toUpperCase())} error={errors.rfc} maxLength={13}
                hint={form.personType === 'MORAL' ? '12 caracteres' : '13 caracteres'} />
              <Select label="Régimen fiscal" value={form.taxRegime} onChange={set('taxRegime')}><option value="">Sin especificar</option>{REGIMES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
              <Input label="Código postal fiscal" inputMode="numeric" value={form.taxZip} onChange={(e) => set('taxZip')(onlyDigits(e.target.value, 5))} error={errors.taxZip} />
            </div>
          ) : <p className="rounded-xl bg-slate-50 p-3 text-sm muted dark:bg-white/[.03]">Tu rol no puede ver ni modificar los datos fiscales de este cliente.</p>}
        </section>
        <section className="grid gap-4 sm:grid-cols-3">
          <Input label="Dirección" wrapClass="sm:col-span-3" value={form.address} onChange={set('address')} maxLength={300} />
          <Input label="Ciudad" value={form.city} onChange={set('city')} maxLength={100} />
          <Input label="Estado" value={form.state} onChange={set('state')} maxLength={100} />
          <Input label="Giro" value={form.industry} onChange={set('industry')} maxLength={80} />
        </section>
        <section className="grid gap-4 sm:grid-cols-2">
          <Select label="Ejecutivo asignado" value={form.ownerUserId} onChange={set('ownerUserId')}><option value="">Sin asignar</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          <Textarea label="Observaciones" value={form.notes} onChange={set('notes')} rows={2} maxLength={2000} />
        </section>
      </form>
    </Modal>
  )
}

