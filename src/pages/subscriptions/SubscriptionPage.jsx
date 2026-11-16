import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Ban, CalendarClock, CreditCard, Gift, Pause, Play, Repeat, RotateCcw, Settings2, Sparkles, TrendingUp, Undo2, UserRound, XCircle, Zap } from 'lucide-react'
import { billingApi, subscriptionsApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { useQuick } from '../../context/QuickActions'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { Button, Card, Checkbox, ConfirmDialog, DescList, EmptyState, Input, Modal, Segmented, Select, Skeleton, StatusBadge, Tabs, Textarea } from '../../components/ui'
import DataTable from '../../components/DataTable'
import DocumentsPanel from '../../components/DocumentsPanel'
import Money from '../../components/Money'
import { ProductTile } from '../../components/ProductIcon'
import { CANCEL_REASONS, CHARGE_STATUS, COLLECTION_STATUS, EVENT_TYPES, METHODS, MOVEMENTS, PERIODS, PERIOD_SHORT, SUBSCRIPTION_STATUS, label } from '../../utils/labels'
import { date, dateTime, money, moneyInput, shortDate } from '../../utils/format'

export default function SubscriptionPage() {
  const { id } = useParams()
  const { can } = useAuth()
  const { byId, users } = useCatalog()
  const quick = useQuick()
  const toast = useToast()
  const { data: d, loading, reload } = useAsync(() => subscriptionsApi.get(id), [id])
  const charges = useAsync(() => (can('charges.read') ? billingApi.charges({ subscriptionId: id, size: 60 }) : Promise.resolve(null)), [id])
  const [tab, setTab] = useState('charges')
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  if (loading && !d) return <Skeleton className="h-[600px]" />
  if (!d) return <div className="card"><EmptyState title="Suscripción no encontrada" /></div>
  const s = d.row
  const product = byId[s.productId]
  const act = (key) => d.allowedActions.includes(key)
  const run = async (fn, okMsg) => {
    setBusy(true)
    try { await fn(); toast.success(okMsg); setModal(null); reload(); charges.reload() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  const customer = { id: s.customerId, tradeName: s.customerName, code: s.customerCode }

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="relative p-6 sm:p-8" style={{ background: `linear-gradient(120deg, ${s.productColor}1f, transparent 60%)` }}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <ProductTile product={product || { color: s.productColor }} size="h-14 w-14" iconClass="h-7 w-7" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-extrabold tracking-tight">{s.productName} · {s.planName}</h1>
                <StatusBadge map={SUBSCRIPTION_STATUS} value={s.status} />
                <StatusBadge map={COLLECTION_STATUS} value={s.collectionStatus} dot={false} />
              </div>
              <p className="mt-1 text-sm muted"><span className="font-mono">{s.code}</span> · <Link to={`/clientes/${s.customerId}`} className="link">{s.customerName}</Link> · {PERIODS[s.billingPeriod]}</p>
              <div className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
                <Big l="Precio pactado" v={<>{money(s.price)}<span className="text-sm font-medium muted">{PERIOD_SHORT[s.billingPeriod]}</span></>} sub={Number(d.listPrice) !== Number(s.price) ? `Lista ${money(d.listPrice)}` : d.taxIncluded ? 'IVA incluido' : 'Más IVA'} />
                <Big l="MRR" v={money(s.mrr)} sub="Sin IVA, con descuento" />
                {d.openAmount != null && <Big l="Saldo de esta suscripción" v={<Money value={d.openAmount} tone={Number(s.overdueAmount) ? 'red' : ''} />} sub={s.overdueAmount > 0 ? `Vencido ${money(s.overdueAmount)} · ${s.daysOverdue} días` : 'Sin atraso'} />}
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {act('ACTIVATE') && can('subscriptions.create') && <Button onClick={() => run(() => subscriptionsApi.activate(id), 'Suscripción activada')} loading={busy}><Play className="h-4 w-4" />Activar ahora</Button>}
            {act('CONVERT_TRIAL') && can('subscriptions.update') && <Button variant="accent" onClick={() => setModal('convert')}><Sparkles className="h-4 w-4" />Convertir a plan pagado</Button>}
            {act('CHANGE_PLAN') && can('subscriptions.update') && <button className="btn-secondary" onClick={() => setModal('plan')}><TrendingUp className="h-4 w-4" />Cambiar plan</button>}
            {act('DISCOUNT') && can('subscriptions.update') && <button className="btn-secondary" onClick={() => setModal('discount')}><Gift className="h-4 w-4" />Descuento</button>}
            {act('RENEW') && can('subscriptions.update') && <button className="btn-secondary" onClick={() => run(() => subscriptionsApi.renew(id), 'Renovación confirmada')}><RotateCcw className="h-4 w-4" />Confirmar renovación</button>}
            {can('payments.create') && s.status !== 'TRIAL' && <button className="btn-secondary" onClick={() => quick.open('payment', { customer, onDone: () => { reload(); charges.reload() } })}><CreditCard className="h-4 w-4" />Registrar pago</button>}
            {act('REACTIVATE') && can('subscriptions.suspend') && <Button variant="accent" onClick={() => setModal('reactivate')}><Zap className="h-4 w-4" />Reactivar</Button>}
            {act('UNDO_CANCEL') && can('subscriptions.cancel') && <button className="btn-secondary" onClick={() => run(() => subscriptionsApi.undoCancel(id), 'Cancelación revertida')}><Undo2 className="h-4 w-4" />Revertir cancelación</button>}
            {act('TERMS') && can('subscriptions.update') && <button className="btn-ghost" onClick={() => setModal('terms')}><Settings2 className="h-4 w-4" />Condiciones</button>}
            {act('SUSPEND') && can('subscriptions.suspend') && <button className="btn-ghost text-amber-600" onClick={() => setModal('suspend')}><Pause className="h-4 w-4" />Suspender</button>}
            {act('CANCEL') && can('subscriptions.cancel') && <button className="btn-ghost text-rose-600" onClick={() => setModal('cancel')}><XCircle className="h-4 w-4" />Cancelar</button>}
          </div>
        </div>
        {d.pendingPlanId && (
          <div className="flex flex-wrap items-center gap-3 border-t border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <CalendarClock className="h-4 w-4" />
            <span className="flex-1">Cambio programado para el {date(s.currentPeriodEnd && addDay(s.currentPeriodEnd))}: <b>{d.pendingPlanName}</b> · {PERIODS[d.pendingBillingPeriod]} · {money(d.pendingPrice)}</span>
            {can('subscriptions.update') && <button className="btn-secondary btn-sm" onClick={() => run(() => subscriptionsApi.cancelPending(id), 'Cambio programado cancelado')}>Cancelar cambio</button>}
          </div>
        )}
        {s.cancelAtPeriodEnd && <div className="border-t border-orange-200 bg-orange-50 px-6 py-3 text-sm text-orange-800 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">Se cancelará al terminar el periodo ({date(s.currentPeriodEnd)}). Motivo: {label(CANCEL_REASONS, d.cancellationReason)}.</div>}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Tabs value={tab} onChange={setTab} items={[can('charges.read') && { key: 'charges', label: 'Cargos', count: charges.data?.totalElements }, { key: 'events', label: 'Historial', count: d.events.length }, can('documents.read') && { key: 'docs', label: 'Documentos' }]} />
          {tab === 'charges' && charges.data && (
            <div className="card overflow-hidden">
              <DataTable rows={charges.data.content} dense columns={[
                { key: 'folio', header: 'Cargo', render: (r) => <div><p className="font-mono text-xs font-semibold">{r.folio}</p><p className="max-w-[300px] truncate text-xs muted">{r.description}</p></div> },
                { key: 'period', header: 'Periodo', render: (r) => (r.periodStart ? `${shortDate(r.periodStart)} – ${shortDate(r.periodEnd)}` : '—') },
                { key: 'dueDate', header: 'Vence', render: (r) => <span className={r.daysOverdue ? 'font-semibold text-rose-600' : ''}>{date(r.dueDate)}</span> },
                { key: 'total', header: 'Total', align: 'right', render: (r) => <Money value={r.total} /> },
                { key: 'balance', header: 'Saldo', align: 'right', render: (r) => <Money value={r.balance} tone={Number(r.balance) ? '' : 'muted'} strong /> },
                { key: 'status', header: 'Estado', render: (r) => <StatusBadge map={CHARGE_STATUS} value={r.status} /> },
              ]} empty={<EmptyState title="Sin cargos" description={s.status === 'TRIAL' ? 'Las pruebas gratuitas no generan cargos.' : 'Aún no se emite el primer cargo.'} compact />} />
            </div>
          )}
          {tab === 'events' && (
            <Card>
              <ol className="relative space-y-5 border-l border-slate-200 pl-7 dark:border-white/10">
                {d.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[35px] grid h-6 w-6 place-items-center rounded-full bg-brand-100 ring-4 ring-white dark:bg-brand-500/20 dark:ring-ink-900"><Repeat className="h-3 w-3 text-brand-600 dark:text-brand-300" /></span>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold">{label(EVENT_TYPES, e.type)} {e.movement !== 'NONE' && <StatusBadge map={MOVEMENTS} value={e.movement} dot={false} />}</p>
                      <span className="text-xs muted">Efectivo {date(e.effectiveOn)} · {dateTime(e.createdAt)}</span>
                    </div>
                    <p className="text-xs muted">{e.fromStatus ? `${label(SUBSCRIPTION_STATUS, e.fromStatus)} → ` : ''}{label(SUBSCRIPTION_STATUS, e.toStatus)} · {e.userName || 'Sistema'}</p>
                    {Number(e.mrrBefore) !== Number(e.mrrAfter) && <p className="mt-1 text-xs font-semibold tabular">MRR {money(e.mrrBefore)} <ArrowRight className="inline h-3 w-3" /> {money(e.mrrAfter)}</p>}
                    {e.data && Object.keys(e.data).length > 0 && <p className="mt-1 text-[11px] text-slate-400">{Object.entries(e.data).filter(([, v]) => typeof v !== 'object').map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>}
                  </li>
                ))}
              </ol>
            </Card>
          )}
          {tab === 'docs' && <Card><DocumentsPanel ownerType="SUBSCRIPTION" ownerId={s.id} defaultCategory="CONTRACT" /></Card>}
        </div>
        <Card title="Condiciones">
          <DescList cols={1} items={[
            ['Vendedor', <span key="seller" className="inline-flex items-center gap-2">{s.sellerName || '—'}{can('subscriptions.update') && <button className="link text-xs" onClick={() => setModal('seller')}>Cambiar</button>}</span>],
            ['Inicio', date(s.startDate)], s.trialEndsOn && ['Fin de prueba', date(s.trialEndsOn)],
            ['Periodo actual', s.currentPeriodStart ? `${date(s.currentPeriodStart)} – ${date(s.currentPeriodEnd)}` : '—'],
            ['Siguiente cobro', s.nextChargeOn ? date(s.nextChargeOn) : '—'],
            ['Renovación', s.autoRenew ? 'Automática' : 'Manual (requiere confirmación)'],
            ['Días de gracia', `${d.graceDays} días`], ['Método preferido', METHODS[d.preferredPaymentMethod] || '—'],
            ['Descuento', s.discountType === 'NONE' ? 'Sin descuento' : `${s.discountType === 'PERCENT' ? `${Number(s.discountValue)} %` : money(s.discountValue)}${d.discountCyclesRemaining != null ? ` · ${d.discountCyclesRemaining} periodo(s) más` : ' · permanente'}${d.couponCode ? ` · cupón ${d.couponCode}` : ''}`],
            d.cancelledOn && ['Cancelada el', `${date(d.cancelledOn)} · ${label(CANCEL_REASONS, d.cancellationReason)}`],
            d.suspendedAt && ['Suspendida', dateTime(d.suspendedAt)], d.notes && ['Observaciones', d.notes],
          ]} />
        </Card>
      </div>

      <ChangePlanModal open={modal === 'plan'} onClose={() => setModal(null)} s={s} product={product} busy={busy} onSubmit={(b) => run(() => subscriptionsApi.changePlan(id, b), 'Plan actualizado')} />
      <DiscountModal open={modal === 'discount'} onClose={() => setModal(null)} busy={busy} onSubmit={(b) => run(() => subscriptionsApi.discount(id, b), 'Descuento actualizado')} />
      <CancelModal open={modal === 'cancel'} onClose={() => setModal(null)} s={s} busy={busy} canWaive={can('charges.void')} onSubmit={(b) => run(() => subscriptionsApi.cancel(id, b), 'Cancelación registrada')} />
      <TermsModal open={modal === 'terms'} onClose={() => setModal(null)} d={d} busy={busy} onSubmit={(b) => run(() => subscriptionsApi.terms(id, b), 'Condiciones actualizadas')} />
      <SellerModal open={modal === 'seller'} onClose={() => setModal(null)} s={s} users={users} busy={busy} onSubmit={(b) => run(() => subscriptionsApi.seller(id, b), 'Vendedor actualizado')} />
      <ConfirmDialog open={modal === 'suspend'} title="Suspender suscripción" tone="danger" confirmLabel="Suspender" reasonLabel="Motivo de la suspensión" loading={busy}
        message="Se retira del MRR hasta que se reactive. No suspende el sistema del cliente: eso lo decide cada producto con su política." onClose={() => setModal(null)}
        onConfirm={(reason) => run(() => subscriptionsApi.suspend(id, reason), 'Suscripción suspendida')} />
      <ConfirmDialog open={modal === 'reactivate'} title="Reactivar suscripción" confirmLabel="Reactivar" loading={busy} onClose={() => setModal(null)}
        message={s.status === 'SUSPENDED' && s.currentPeriodEnd >= new Date().toISOString().slice(0, 10) ? 'Continúa el periodo vigente y vuelve a sumar al MRR.' : 'Inicia un periodo nuevo desde hoy y se emite su cargo.'}
        onConfirm={() => run(() => subscriptionsApi.reactivate(id), 'Suscripción reactivada')} />
      <ConfirmDialog open={modal === 'convert'} title="Convertir prueba a plan pagado" confirmLabel="Convertir" loading={busy} onClose={() => setModal(null)}
        message={`Se activa ${s.planName} desde hoy y se emite el primer cargo por ${money(s.price)} más IVA. Confirma que el cliente aceptó.`}
        onConfirm={() => run(() => subscriptionsApi.convertTrial(id), '¡Prueba convertida!')} />
    </div>
  )
}

const addDay = (iso) => { const x = new Date(`${iso}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10) }

function Big({ l, v, sub }) {
  return <div><p className="text-xs muted">{l}</p><p className="font-display text-2xl font-extrabold tabular">{v}</p>{sub && <p className="text-[11px] muted">{sub}</p>}</div>
}

function ChangePlanModal({ open, onClose, s, product, busy, onSubmit }) {
  const [f, setF] = useState(null)
  useEffect(() => { setF(open ? { planId: s.planId, billingPeriod: s.billingPeriod, price: '', effective: 'END_OF_PERIOD' } : null) }, [open]) // eslint-disable-line
  const plan = product?.plans.find((p) => String(p.id) === String(f?.planId))
  const price = plan?.prices.find((p) => p.billingPeriod === f?.billingPeriod)
  const newPrice = f?.price ? Number(f.price) : Number(price?.amount || 0)
  const upgrade = newPrice > Number(s.price) && f?.billingPeriod === s.billingPeriod
  const live = s.status === 'ACTIVE' || s.status === 'GRACE'
  return (
    <Modal open={open && !!f} onClose={onClose} title="Cambiar plan o periodicidad" icon={TrendingUp} size="max-w-xl"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button loading={busy} onClick={() => onSubmit({ ...f, planId: Number(f.planId), price: f.price || null })}>Aplicar cambio</Button></>}>
      {f && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Plan" value={f.planId} onChange={(e) => setF({ ...f, planId: e.target.value })}>{product?.plans.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
            <Select label="Periodicidad" value={f.billingPeriod} onChange={(e) => setF({ ...f, billingPeriod: e.target.value, effective: e.target.value !== s.billingPeriod ? 'END_OF_PERIOD' : f.effective })}>
              {Object.entries(PERIODS).map(([k, l]) => { const pr = plan?.prices.find((x) => x.billingPeriod === k); return <option key={k} value={k}>{l}{pr ? ` · ${money(pr.amount)}` : ''}</option> })}
            </Select>
            <Input label="Precio pactado" wrapClass="sm:col-span-2" value={f.price} onChange={(e) => setF({ ...f, price: moneyInput(e.target.value) })} placeholder={price ? money(price.amount) : 'Captura el precio'} hint={`Actual: ${money(s.price)}${PERIOD_SHORT[s.billingPeriod]}`} />
          </div>
          {live && (
            <div className="space-y-2">
              <p className="label">¿Cuándo aplica?</p>
              <Segmented value={f.effective} onChange={(v) => setF({ ...f, effective: v })} options={[['END_OF_PERIOD', 'Al terminar el periodo'], ['IMMEDIATE', 'Inmediato con prorrateo']]} />
              <p className="text-xs muted">{f.effective === 'IMMEDIATE'
                ? upgrade ? 'Se cobra hoy la diferencia proporcional a los días restantes del periodo y el MRR sube de inmediato.' : 'Solo para subir de plan en la misma periodicidad. Las reducciones aplican al final del periodo, sin reembolsos.'
                : 'El cargo del siguiente periodo ya saldrá con el nuevo plan; si ya se emitió y no tiene pagos, se reemite.'}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function DiscountModal({ open, onClose, busy, onSubmit }) {
  const [f, setF] = useState({ type: 'PERCENT', value: '', cycles: '', reason: '' })
  return (
    <Modal open={open} onClose={onClose} title="Aplicar descuento" icon={Gift} size="max-w-md"
      footer={<><button className="btn-secondary" onClick={() => onSubmit({ type: 'NONE', value: 0, cycles: null, reason: 'Se retira el descuento' })}>Quitar descuento</button>
        <Button loading={busy} onClick={() => onSubmit({ ...f, value: f.value || 0, cycles: f.cycles ? Number(f.cycles) : null })}>Aplicar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Tipo" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="PERCENT">Porcentaje</option><option value="AMOUNT">Importe fijo</option></Select>
        <Input label={f.type === 'PERCENT' ? 'Porcentaje' : 'Importe por periodo'} value={f.value} onChange={(e) => setF({ ...f, value: moneyInput(e.target.value) })} />
        <Input label="Periodos con descuento" value={f.cycles} onChange={(e) => setF({ ...f, cycles: e.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="Permanente" />
        <Input label="Motivo" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} maxLength={300} />
      </div>
      <p className="mt-3 text-xs muted">Aplica al MRR desde hoy y a los cargos que aún no se emiten. Los cargos ya emitidos se ajustan desde Cargos.</p>
    </Modal>
  )
}

function CancelModal({ open, onClose, s, busy, canWaive, onSubmit }) {
  const live = s.status === 'ACTIVE' || s.status === 'GRACE'
  const [f, setF] = useState({ mode: 'END_OF_PERIOD', reason: 'PRICE', detail: '', waiveOpenBalance: false })
  const mode = live ? f.mode : 'IMMEDIATE'
  return (
    <Modal open={open} onClose={onClose} title="Cancelar suscripción" icon={Ban} size="max-w-lg"
      footer={<><button className="btn-secondary" onClick={onClose}>Volver</button><Button variant="danger" loading={busy} onClick={() => onSubmit({ ...f, mode })}>Registrar cancelación</Button></>}>
      <div className="space-y-4">
        {live && <Segmented value={f.mode} onChange={(v) => setF({ ...f, mode: v })} options={[['END_OF_PERIOD', 'Al final del periodo'], ['IMMEDIATE', 'Inmediata']]} />}
        <p className="text-sm muted">{mode === 'END_OF_PERIOD' ? `Sigue activa hasta el ${date(s.currentPeriodEnd)} y no se renueva. Puedes revertirla antes de esa fecha.` : 'Termina hoy. Se anulan los cargos de periodos futuros sin pagos; el adeudo existente se conserva salvo que lo condones.'}</p>
        <Select label="Motivo" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>{Object.entries(CANCEL_REASONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Textarea label="Detalle" value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} rows={2} maxLength={500} />
        {mode === 'IMMEDIATE' && canWaive && Number(s.overdueAmount) > 0 && <Checkbox checked={f.waiveOpenBalance} onChange={(v) => setF({ ...f, waiveOpenBalance: v })} label={`Condonar el saldo pendiente (${money(s.overdueAmount)} vencido)`} description="Queda registrado como ajuste auditado. Requiere confirmar tu contraseña." />}
      </div>
    </Modal>
  )
}

function SellerModal({ open, onClose, s, users, busy, onSubmit }) {
  const [f, setF] = useState(null)
  useEffect(() => { setF(open ? { sellerUserId: s.sellerUserId ? String(s.sellerUserId) : '', reason: '' } : null) }, [open]) // eslint-disable-line
  return (
    <Modal open={open && !!f} onClose={onClose} title="Cambiar vendedor" icon={UserRound} size="max-w-md"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button loading={busy} disabled={!f?.sellerUserId} onClick={() => onSubmit({ sellerUserId: Number(f.sellerUserId), reason: f.reason })}>Guardar</Button></>}>
      {f && (
        <div className="space-y-4">
          <Select label="Vendedor" value={f.sellerUserId} onChange={(e) => setF({ ...f, sellerUserId: e.target.value })}><option value="">Elige…</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          <Input label="Motivo" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} maxLength={300} placeholder="Corrección, venta compartida…" />
          <p className="text-xs muted">Solo cambia a quién se atribuye la venta en los reportes; no afecta importes, cargos ni MRR. Queda en la auditoría.</p>
        </div>
      )}
    </Modal>
  )
}

function TermsModal({ open, onClose, d, busy, onSubmit }) {
  const [f, setF] = useState(null)
  useEffect(() => { setF(open ? { autoRenew: d.row.autoRenew, graceDays: d.graceDays, preferredPaymentMethod: d.preferredPaymentMethod || '', notes: d.notes || '' } : null) }, [open]) // eslint-disable-line
  return (
    <Modal open={open && !!f} onClose={onClose} title="Condiciones de la suscripción" icon={Settings2} size="max-w-md"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button loading={busy} onClick={() => onSubmit({ ...f, graceDays: Number(f.graceDays) })}>Guardar</Button></>}>
      {f && (
        <div className="space-y-4">
          <Checkbox checked={f.autoRenew} onChange={(v) => setF({ ...f, autoRenew: v })} label="Renovación automática" description="Si se desactiva, al terminar el periodo expira salvo que se confirme la renovación." />
          <Input label="Días de gracia" value={f.graceDays} onChange={(e) => setF({ ...f, graceDays: e.target.value.replace(/\D/g, '').slice(0, 2) })} />
          <Select label="Método de pago preferido" value={f.preferredPaymentMethod} onChange={(e) => setF({ ...f, preferredPaymentMethod: e.target.value })}><option value="">Sin preferencia</option>{Object.entries(METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Textarea label="Observaciones" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={3} />
        </div>
      )}
    </Modal>
  )
}


