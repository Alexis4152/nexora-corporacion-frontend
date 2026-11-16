import { useEffect, useState } from 'react'
import { LifeBuoy } from 'lucide-react'
import { opsApi } from '../api'
import { errorMessage, fieldErrors } from '../api/client'
import { useCatalog } from '../context/CatalogContext'
import { useToast } from '../context/ToastContext'
import { Button, Input, Modal, Select, Textarea } from '../components/ui'
import { CustomerPicker } from './pickers'
import { TICKET_CATEGORY, TICKET_PRIORITY } from '../utils/labels'

export default function TicketForm({ open, onClose, onDone, customer: preset, ticket }) {
  const toast = useToast()
  const { activeProducts, users } = useCatalog()
  const [customer, setCustomer] = useState(preset || null)
  const [f, setF] = useState({})
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    setErrors({})
    setCustomer(ticket ? { id: ticket.ticket.customerId, tradeName: ticket.ticket.customerName } : preset || null)
    setF(ticket ? { productId: ticket.ticket.productId || '', subject: ticket.ticket.subject, description: ticket.description, category: ticket.ticket.category, priority: ticket.ticket.priority, assigneeId: ticket.ticket.assigneeId || '' }
      : { productId: '', subject: '', description: '', category: 'INCIDENT', priority: 'MEDIUM', assigneeId: '' })
  }, [open, preset, ticket])
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: null })) }
  const submit = async () => {
    const found = {}
    if (!customer) found.customer = 'Elige el cliente'
    if (!f.subject?.trim()) found.subject = 'Escribe el asunto'
    if (!f.description?.trim()) found.description = 'Describe la incidencia'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const body = { ...f, customerId: customer.id, productId: f.productId ? Number(f.productId) : null, assigneeId: f.assigneeId ? Number(f.assigneeId) : null }
      const r = ticket ? await opsApi.updateTicket(ticket.ticket.id, body) : await opsApi.createTicket(body)
      toast.success(ticket ? 'Ticket actualizado' : `Ticket ${r.ticket.folio} creado`)
      onDone?.(r)
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={ticket ? 'Editar ticket' : 'Nuevo ticket de soporte'} icon={LifeBuoy} size="max-w-2xl"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button onClick={submit} loading={busy}>{ticket ? 'Guardar' : 'Crear ticket'}</Button></>}>
      <div className="space-y-4">
        <CustomerPicker value={customer} onChange={setCustomer} error={errors.customer} required disabled={!!preset || !!ticket} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Producto" value={f.productId} onChange={set('productId')}><option value="">General</option>{activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          <Select label="Categoría" value={f.category} onChange={set('category')}>{Object.entries(TICKET_CATEGORY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select label="Prioridad" value={f.priority} onChange={set('priority')}>{Object.entries(TICKET_PRIORITY).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
        </div>
        <Input label="Asunto" required value={f.subject} onChange={set('subject')} error={errors.subject} maxLength={200} />
        <Textarea label="Descripción" required value={f.description} onChange={set('description')} error={errors.description} rows={5} maxLength={5000} />
        {!ticket && <Select label="Responsable" value={f.assigneeId} onChange={set('assigneeId')}><option value="">Sin asignar</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>}
      </div>
    </Modal>
  )
}

