import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Plus, Receipt, Scissors } from 'lucide-react'
import { billingApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { useToast } from '../../context/ToastContext'
import { useAsync, useDebounced } from '../../hooks/useAsync'
import { useQueryState } from '../../hooks/useQueryState'
import DataTable from '../../components/DataTable'
import Money from '../../components/Money'
import { Button, Checkbox, ConfirmDialog, DescList, Drawer, Input, Modal, PageHeader, ProductChip, SearchInput, Select, Skeleton, StatusBadge, Textarea } from '../../components/ui'
import { CustomerPicker } from '../../forms/pickers'
import { CHARGE_STATUS, CHARGE_TYPE } from '../../utils/labels'
import { addDays, date, dateTime, moneyInput, todayIso } from '../../utils/format'

export default function ChargesPage() {
  const { can } = useAuth()
  const { activeProducts } = useCatalog()
  const [f, set] = useQueryState({ q: '', status: 'PENDING', productId: '', overdue: '', from: '', to: '', page: '0', sort: '' })
  const [q, setQ] = useState(f.q)
  const debounced = useDebounced(q, 300)
  useEffect(() => { if (debounced !== f.q) set({ q: debounced }) }, [debounced]) // eslint-disable-line
  const { data, loading, reload } = useAsync(() => billingApi.charges({ ...f, overdue: f.overdue === 'true' || undefined, page: Number(f.page), size: 25 }),
    [f.q, f.status, f.productId, f.overdue, f.from, f.to, f.page, f.sort])
  const [open, setOpen] = useState(null)
  const [creating, setCreating] = useState(false)
  return (
    <>
      <PageHeader eyebrow="Cobranza" title="Cargos" description="Documento interno de cobro por periodo (no es CFDI). Se anulan, nunca se borran; los ajustes quedan auditados."
        actions={can('charges.create') && <button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Cargo manual</button>} />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-white/[.06]">
          <SearchInput value={q} onChange={setQ} placeholder="Folio, cliente o concepto…" className="w-full sm:w-64" />
          <Select value={f.status} onChange={(e) => set({ status: e.target.value })} wrapClass="w-full sm:w-40" aria-label="Estado"><option value="">Todos</option><option value="PENDING">Con saldo</option>{Object.entries(CHARGE_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select value={f.productId} onChange={(e) => set({ productId: e.target.value })} wrapClass="w-full sm:w-44" aria-label="Producto"><option value="">Todos los productos</option>{activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          <input type="date" className="input h-10 w-auto" value={f.from} onChange={(e) => set({ from: e.target.value })} aria-label="Vence desde" />
          <input type="date" className="input h-10 w-auto" value={f.to} onChange={(e) => set({ to: e.target.value })} aria-label="Vence hasta" />
          <div className="px-1"><Checkbox checked={f.overdue === 'true'} onChange={(v) => set({ overdue: v ? 'true' : '' })} label="Vencidos" /></div>
        </div>
        <DataTable loading={loading} rows={data?.content} page={data} onPage={(p) => set({ page: String(p) })} sort={f.sort} onSort={(s) => set({ sort: s })} onRowClick={(r) => setOpen(r.id)} columns={[
          { key: 'folio', header: 'Cargo', sort: 'folio', render: (r) => <div><p className="font-mono text-xs font-semibold">{r.folio}</p><p className="max-w-[280px] truncate text-xs muted">{r.description}</p></div> },
          { key: 'customerName', header: 'Cliente', sort: 'customer', render: (r) => <Link to={`/clientes/${r.customerId}?tab=cobranza`} onClick={(e) => e.stopPropagation()} className="hover:underline">{r.customerName}</Link> },
          { key: 'productCode', header: 'Producto', render: (r) => (r.productCode ? <ProductChip code={r.productCode} color={r.productColor} /> : <span className="text-xs muted">{CHARGE_TYPE[r.type]}</span>) },
          { key: 'dueDate', header: 'Vence', sort: 'due', render: (r) => <div><p className={r.daysOverdue ? 'font-semibold text-rose-600' : ''}>{date(r.dueDate)}</p>{r.daysOverdue > 0 && <p className="text-[11px] text-rose-500">{r.daysOverdue} días</p>}</div> },
          { key: 'total', header: 'Total', align: 'right', sort: 'total', render: (r) => <Money value={r.total} /> },
          { key: 'balance', header: 'Saldo', align: 'right', sort: 'balance', render: (r) => <Money value={r.balance} tone={Number(r.balance) ? '' : 'muted'} strong /> },
          { key: 'status', header: 'Estado', render: (r) => <StatusBadge map={CHARGE_STATUS} value={r.status} /> },
        ]} />
      </div>
      {open && <ChargeDrawer id={open} onClose={() => setOpen(null)} onChanged={reload} />}
      {creating && <NewChargeModal onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload() }} />}
    </>
  )
}

function ChargeDrawer({ id, onClose, onChanged }) {
  const { can } = useAuth()
  const toast = useToast()
  const { data: d, loading, reload } = useAsync(() => billingApi.charge(id), [id])
  const [voiding, setVoiding] = useState(false)
  const [adjust, setAdjust] = useState(null)
  const done = () => { reload(); onChanged() }
  const c = d?.charge
  return (
    <Drawer open onClose={onClose} title={c ? `Cargo ${c.folio}` : 'Cargo'} subtitle={c && <StatusBadge map={CHARGE_STATUS} value={c.status} />} width="max-w-xl"
      footer={c && c.status !== 'VOID' && <>
        {c.balance > 0 && can('charges.adjust') && <button className="btn-secondary" onClick={() => setAdjust({ amount: '', reason: '' })}><Scissors className="h-4 w-4" />Ajuste / bonificación</button>}
        {Number(c.paidAmount) === 0 && can('charges.void') && <button className="btn-ghost text-rose-600" onClick={() => setVoiding(true)}><Ban className="h-4 w-4" />Anular</button>}
      </>}>
      {loading || !d ? <Skeleton className="h-80" /> : (
        <div className="space-y-6">
          <div className="rounded-2xl bg-slate-50 p-5 dark:bg-white/[.03]">
            <p className="text-sm font-medium">{c.description}</p>
            <div className="mt-4 space-y-1.5 text-sm tabular">
              <Line l="Importe" v={<Money value={d.amount} />} />
              {Number(d.discount) > 0 && <Line l="Descuento" v={<>− <Money value={d.discount} /></>} />}
              <Line l="Subtotal" v={<Money value={d.subtotal} />} />
              <Line l="IVA" v={<Money value={d.tax} />} />
              <Line l="Total" v={<Money value={c.total} strong />} />
              <Line l="Pagado" v={<Money value={c.paidAmount} tone="green" />} />
              {Number(c.adjustedAmount) > 0 && <Line l="Ajustes a favor" v={<Money value={c.adjustedAmount} />} />}
              <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-white/10"><span className="font-semibold">Saldo</span><span className="font-display text-lg font-extrabold"><Money value={c.balance} /></span></div>
            </div>
          </div>
          <DescList items={[['Cliente', <Link key="c" to={`/clientes/${c.customerId}`} className="link">{c.customerName}</Link>], ['Suscripción', c.subscriptionId ? <Link key="s" to={`/suscripciones/${c.subscriptionId}`} className="link">{c.subscriptionCode}</Link> : '—'],
            ['Tipo', CHARGE_TYPE[c.type]], ['Periodo', c.periodStart ? `${date(c.periodStart)} – ${date(c.periodEnd)}` : '—'], ['Emitido', date(c.issueDate)], ['Vence', date(c.dueDate)],
            d.voidedAt && ['Anulado', `${dateTime(d.voidedAt)} · ${d.voidReason}`]]} />
          {d.allocations.length > 0 && (
            <div><p className="label">Pagos aplicados</p>
              <ul className="space-y-2">{d.allocations.map((a) => <li key={a.id} className="flex justify-between text-sm"><Link to={`/cobranza/pagos/${a.paymentId}`} className="font-mono link">{a.paymentFolio}</Link><span className={a.reversedAt ? 'line-through muted' : 'font-semibold'}><Money value={a.amount} /></span></li>)}</ul></div>
          )}
          {d.adjustments.length > 0 && (
            <div><p className="label">Ajustes</p>
              <ul className="space-y-2">{d.adjustments.map((a) => <li key={a.id} className="text-sm"><b><Money value={a.amount} /></b> · {a.reason} <span className="text-xs muted">· {a.userName} · {dateTime(a.createdAt)}</span></li>)}</ul></div>
          )}
          <p className="flex items-center gap-1.5 text-xs muted"><Receipt className="h-3.5 w-3.5" />El CFDI fiscal se emitirá por separado al integrar un PAC (ver Integraciones).</p>
        </div>
      )}
      <ConfirmDialog open={voiding} title="Anular cargo" tone="danger" confirmLabel="Anular" reasonLabel="Motivo de la anulación" onClose={() => setVoiding(false)}
        message="El cargo deja de contar como adeudo. Se pedirá tu contraseña." onConfirm={async (r) => { try { await billingApi.voidCharge(id, r); toast.success('Cargo anulado'); setVoiding(false); done() } catch (e) { toast.error(errorMessage(e)) } }} />
      <Modal open={!!adjust} onClose={() => setAdjust(null)} title="Ajuste a favor del cliente" icon={Scissors} size="max-w-md" description="Condonación, bonificación o corrección. Reduce el saldo del cargo y queda auditado."
        footer={<><button className="btn-secondary" onClick={() => setAdjust(null)}>Cancelar</button><Button disabled={!adjust?.amount || !adjust?.reason?.trim()}
          onClick={async () => { try { await billingApi.adjust(id, adjust); toast.success('Ajuste registrado'); setAdjust(null); done() } catch (e) { toast.error(errorMessage(e)) } }}>Registrar</Button></>}>
        {adjust && <div className="space-y-4"><Input label="Importe" value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: moneyInput(e.target.value) })} /><Textarea label="Motivo" required value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} rows={2} /></div>}
      </Modal>
    </Drawer>
  )
}

function Line({ l, v }) {
  return <div className="flex justify-between gap-3"><span className="muted">{l}</span><span>{v}</span></div>
}

function NewChargeModal({ onClose, onDone }) {
  const toast = useToast()
  const [customer, setCustomer] = useState(null)
  const [f, setF] = useState({ type: 'SETUP', description: '', amount: '', taxIncluded: false, dueDate: addDays(todayIso(), 7) })
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try { await billingApi.createCharge({ ...f, customerId: customer.id }); toast.success('Cargo generado'); onDone() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title="Cargo manual" icon={Receipt} size="max-w-lg" description="Implementación, servicios adicionales u otros conceptos fuera de la suscripción."
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button loading={busy} disabled={!customer || !f.description.trim() || !f.amount} onClick={submit}>Generar cargo</Button></>}>
      <div className="space-y-4">
        <CustomerPicker value={customer} onChange={setCustomer} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Tipo" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="SETUP">Implementación</option><option value="SERVICE">Servicio</option><option value="OTHER">Otro</option></Select>
          <Input label="Importe" value={f.amount} onChange={(e) => setF({ ...f, amount: moneyInput(e.target.value) })} />
          <Input label="Concepto" wrapClass="sm:col-span-2" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={300} />
          <Input label="Vence" type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
          <div className="flex items-end pb-2"><Checkbox checked={f.taxIncluded} onChange={(v) => setF({ ...f, taxIncluded: v })} label="El importe incluye IVA" /></div>
        </div>
      </div>
    </Modal>
  )
}
