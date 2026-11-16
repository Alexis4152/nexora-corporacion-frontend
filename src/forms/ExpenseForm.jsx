import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { opsApi } from '../api'
import { errorMessage, fieldErrors } from '../api/client'
import { useCatalog } from '../context/CatalogContext'
import { useToast } from '../context/ToastContext'
import { Button, Input, Modal, Select, Textarea } from '../components/ui'
import { moneyInput, todayIso } from '../utils/format'

const PERIODICITY = { ONE_TIME: 'Única vez', MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', ANNUAL: 'Anual' }

export default function ExpenseForm({ open, onClose, onDone, expense }) {
  const toast = useToast()
  const { activeProducts } = useCatalog()
  const [cats, setCats] = useState([])
  const [f, setF] = useState({})
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    opsApi.categories().then((c) => setCats(c.filter((x) => x.active))).catch(() => {})
    setErrors({})
    setF(expense ? { ...expense, productId: expense.productId || '', supplier: expense.supplier || '', notes: expense.notes || '', amount: String(expense.amount) }
      : { concept: '', amount: '', expenseDate: todayIso(), categoryId: '', productId: '', supplier: '', periodicity: 'ONE_TIME', notes: '' })
  }, [open, expense])
  const set = (k) => (e) => { const v = e?.target ? e.target.value : e; setF((x) => ({ ...x, [k]: v })); setErrors((x) => ({ ...x, [k]: null })) }
  const submit = async () => {
    const found = {}
    if (!f.concept?.trim()) found.concept = 'Escribe el concepto'
    if (!(Number(f.amount) > 0)) found.amount = 'Importe mayor a cero'
    if (!f.categoryId) found.categoryId = 'Elige la categoría'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const body = { ...f, categoryId: Number(f.categoryId), productId: f.productId ? Number(f.productId) : null }
      if (expense) await opsApi.updateExpense(expense.id, body)
      else await opsApi.createExpense(body)
      toast.success(expense ? 'Gasto actualizado' : 'Gasto registrado')
      onDone?.()
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={expense ? 'Editar gasto' : 'Registrar gasto'} icon={ClipboardList} size="max-w-2xl"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button onClick={submit} loading={busy}>{expense ? 'Guardar' : 'Registrar gasto'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Concepto" required wrapClass="sm:col-span-2" value={f.concept} onChange={set('concept')} error={errors.concept} maxLength={200} />
        <Input label="Importe" required inputMode="decimal" value={f.amount} onChange={(e) => set('amount')(moneyInput(e.target.value))} error={errors.amount} />
        <Input label="Fecha" type="date" value={f.expenseDate} onChange={set('expenseDate')} />
        <Select label="Categoría" required value={f.categoryId} onChange={set('categoryId')} error={errors.categoryId}>
          <option value="">Elige…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}{c.acquisitionCost ? ' · costo de adquisición' : ''}</option>)}
        </Select>
        <Select label="Asociado a" value={f.productId} onChange={set('productId')}><option value="">Empresa en general</option>{activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        <Input label="Proveedor" value={f.supplier} onChange={set('supplier')} maxLength={150} />
        <Select label="Periodicidad" value={f.periodicity} onChange={set('periodicity')}>{Object.entries(PERIODICITY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Textarea label="Observaciones" wrapClass="sm:col-span-2" value={f.notes} onChange={set('notes')} rows={2} maxLength={1000} />
      </div>
    </Modal>
  )
}
