import { useEffect, useState } from 'react'
import { Ban, Pencil, Plus, Tags } from 'lucide-react'
import { opsApi } from '../api'
import { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { useQuick } from '../context/QuickActions'
import { useToast } from '../context/ToastContext'
import { useAsync, useDebounced } from '../hooks/useAsync'
import DataTable from '../components/DataTable'
import Money from '../components/Money'
import { ActionMenu, Badge, Button, Card, Checkbox, ConfirmDialog, Input, Modal, PageHeader, ProductChip, SearchInput, Select, Switch } from '../components/ui'
import { HBars } from '../components/charts'
import PeriodPicker, { periodOf } from '../components/PeriodPicker'
import { date, money } from '../utils/format'

const PERIODICITY = { ONE_TIME: 'Única vez', MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', ANNUAL: 'Anual' }

export default function ExpensesPage() {
  const { can } = useAuth()
  const { activeProducts } = useCatalog()
  const quick = useQuick()
  const toast = useToast()
  const [period, setPeriod] = useState({ preset: 'year', ...periodOf('year') })
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [productId, setProductId] = useState('')
  const [voided, setVoided] = useState(false)
  const [page, setPage] = useState(0)
  const debounced = useDebounced(q, 300)
  const cats = useAsync(() => opsApi.categories(), [])
  const { data, loading, reload } = useAsync(() => opsApi.expenses({ q: debounced, from: period.from, to: period.to, categoryId, productId: productId === 'company' ? '' : productId,
    companyOnly: productId === 'company' || undefined, includeVoided: voided, page, size: 25, sort: '-date' }), [debounced, period.from, period.to, categoryId, productId, voided, page])
  const [voiding, setVoiding] = useState(null)
  const [catsOpen, setCatsOpen] = useState(false)
  useEffect(() => setPage(0), [debounced, period.from, period.to, categoryId, productId])
  return (
    <>
      <PageHeader eyebrow="Control de gastos" title="Gastos y rentabilidad" description="Gastos de la empresa o de cada producto. La rentabilidad mostrada es una estimación: solo es tan completa como los gastos capturados."
        actions={<>
          {can('expenses.manage') && <button className="btn-secondary" onClick={() => setCatsOpen(true)}><Tags className="h-4 w-4" />Categorías</button>}
          {can('expenses.manage') && <button className="btn-primary" onClick={() => quick.open('expense', { onDone: reload })}><Plus className="h-4 w-4" />Registrar gasto</button>}
        </>} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-white/[.06]">
            <PeriodPicker value={period} onChange={setPeriod} />
            <SearchInput value={q} onChange={setQ} placeholder="Concepto o proveedor" className="w-full sm:w-52" />
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} wrapClass="w-full sm:w-44" aria-label="Categoría"><option value="">Todas las categorías</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Select value={productId} onChange={(e) => setProductId(e.target.value)} wrapClass="w-full sm:w-44" aria-label="Asociado"><option value="">Empresa y productos</option><option value="company">Solo empresa</option>{activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
            <Checkbox checked={voided} onChange={setVoided} label="Incluir anulados" />
          </div>
          <DataTable loading={loading} rows={data?.page.content} page={data?.page} onPage={setPage} columns={[
            { key: 'concept', header: 'Concepto', render: (r) => <div className={r.voidedAt ? 'opacity-50' : ''}><p className="font-semibold">{r.concept}</p><p className="text-xs muted">{r.supplier || '—'}{r.voidedAt && ` · anulado: ${r.voidReason}`}</p></div> },
            { key: 'expenseDate', header: 'Fecha', render: (r) => date(r.expenseDate) },
            { key: 'categoryName', header: 'Categoría', render: (r) => <span className="text-sm">{r.categoryName}{r.acquisitionCost && <Badge tone="violet" className="ml-1">CAC</Badge>}</span> },
            { key: 'productCode', header: 'Asociado', render: (r) => (r.productCode ? <ProductChip code={r.productCode} color={r.productColor} /> : <span className="text-xs muted">Empresa</span>) },
            { key: 'periodicity', header: 'Periodicidad', hideOnMobile: true, render: (r) => PERIODICITY[r.periodicity] },
            { key: 'amount', header: 'Importe', align: 'right', render: (r) => <Money value={r.amount} strong tone={r.voidedAt ? 'muted' : ''} /> },
            { key: 'x', header: '', render: (r) => can('expenses.manage') && !r.voidedAt && <ActionMenu items={[{ icon: Pencil, label: 'Editar', run: () => quick.open('expense', { expense: r, onDone: reload }) }, { icon: Ban, label: 'Anular', danger: true, run: () => setVoiding(r) }]} /> },
          ]} />
        </div>
        <div className="space-y-6">
          <Card title="Total del periodo"><p className="font-display text-3xl font-extrabold tabular">{data ? money(data.total) : '—'}</p><p className="mt-1 text-xs muted">Gastos vigentes con los filtros aplicados</p></Card>
          <Card title="Por categoría"><HBars data={(data?.byCategory || []).map((c) => ({ label: c.label, value: c.value }))} format="money" /></Card>
        </div>
      </div>
      <ConfirmDialog open={!!voiding} title="Anular gasto" tone="danger" confirmLabel="Anular" reasonLabel="Motivo" message={voiding && `${voiding.concept} · ${money(voiding.amount)}`} onClose={() => setVoiding(null)}
        onConfirm={async (r) => { try { await opsApi.voidExpense(voiding.id, r); toast.success('Gasto anulado'); setVoiding(null); reload() } catch (e) { toast.error(errorMessage(e)) } }} />
      {catsOpen && <CategoriesModal cats={cats} onClose={() => { setCatsOpen(false); cats.reload() }} />}
    </>
  )
}

function CategoriesModal({ cats, onClose }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [acq, setAcq] = useState(false)
  const add = async () => { try { await opsApi.createCategory({ name, acquisitionCost: acq }); setName(''); setAcq(false); cats.reload() } catch (e) { toast.error(errorMessage(e)) } }
  const toggleAcq = async (c) => { try { await opsApi.updateCategory(c.id, { name: c.name, acquisitionCost: !c.acquisitionCost }); cats.reload() } catch (e) { toast.error(errorMessage(e)) } }
  return (
    <Modal open onClose={onClose} title="Categorías de gasto" icon={Tags} description="Marca como «costo de adquisición» lo que cuenta para el CAC (publicidad, comisiones).">
      <ul className="divide-y divide-slate-100 dark:divide-white/[.06]">
        {cats.data?.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-2.5"><span className="flex-1 text-sm font-medium">{c.name}</span><span className="text-xs muted">{c.expenses} gastos</span>
            <span className="flex items-center gap-2 text-xs muted">CAC <Switch size="sm" checked={c.acquisitionCost} onChange={() => toggleAcq(c)} label={`Costo de adquisición ${c.name}`} /></span></li>
        ))}
      </ul>
      <div className="mt-4 flex items-end gap-2"><Input label="Nueva categoría" value={name} onChange={(e) => setName(e.target.value)} wrapClass="flex-1" maxLength={60} />
        <div className="pb-2"><Checkbox checked={acq} onChange={setAcq} label="CAC" /></div><Button disabled={!name.trim()} onClick={add}>Agregar</Button></div>
    </Modal>
  )
}

