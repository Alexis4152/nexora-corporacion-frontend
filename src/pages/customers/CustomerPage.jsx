import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Archive, CalendarClock, CreditCard, FileText, HandCoins, HeartPulse, LifeBuoy, Mail, MapPin, Pencil, Phone, Plus, Repeat, StickyNote, Tag, Trash2, UserPlus, Wallet,
} from 'lucide-react'
import { billingApi, customersApi, opsApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { useQuick } from '../../context/QuickActions'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { ActionMenu, Avatar, Badge, Button, Card, Checkbox, ConfirmDialog, DescList, EmptyState, Input, Kpi, Modal, ProductChip, Select, Skeleton, StatusBadge, Tabs, Textarea } from '../../components/ui'
import DataTable from '../../components/DataTable'
import DocumentsPanel from '../../components/DocumentsPanel'
import Money from '../../components/Money'
import { ProductTile } from '../../components/ProductIcon'
import { ACTIVITY_TYPES, CHARGE_STATUS, COLLECTION_ACTION, COLLECTION_STATUS, MOVEMENTS, PAYMENT_STATUS, PERIODS, PERIOD_SHORT, RELATIONSHIP, SUBSCRIPTION_STATUS, TICKET_PRIORITY, TICKET_STATUS, EVENT_TYPES, label } from '../../utils/labels'
import { date, dateTime, money, timeAgo, todayIso } from '../../utils/format'

export default function CustomerPage() {
  const { id } = useParams()
  const { can } = useAuth()
  const quick = useQuick()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'resumen'
  const setTab = (t) => setParams((p) => { p.set('tab', t); return p }, { replace: true })
  const { data, loading, reload } = useAsync(() => customersApi.overview(id), [id])
  const [archive, setArchive] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  if (loading && !data) return <Skeleton className="h-[600px]" />
  if (!data) return <div className="card"><EmptyState title="Cliente no encontrado" /></div>
  const c = data.customer
  const m = data.money
  const h = data.health
  const subs = data.subscriptions || []

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="mesh relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <Avatar name={c.tradeName} size="h-16 w-16 text-xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{c.tradeName}</h1>
                <StatusBadge map={RELATIONSHIP} value={data.relationship.relationship} />
                {c.archived && <Badge>Archivado</Badge>}
              </div>
              <p className="mt-1 text-sm muted"><span className="font-mono">{c.code}</span>{c.legalName && ` · ${c.legalName}`} · Cliente desde {date(c.customerSince)}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                <span className="inline-flex items-center gap-1.5"><UserPlus className="h-4 w-4 text-slate-400" />{c.contactName}</span>
                <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 link"><Mail className="h-4 w-4" />{c.email}</a>
                {c.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" />{c.phone}</span>}
                {c.city && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{c.city}, {c.state}</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {c.tags.map((t) => <span key={t.id} className="rounded-lg px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${t.color}22`, color: t.color }}>{t.name}</span>)}
                {can('customers.update') && <button onClick={() => setTagsOpen(true)} className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-dashed ring-slate-300 hover:bg-white dark:ring-white/20"><Tag className="h-3 w-3" />Etiquetas</button>}
              </div>
            </div>
            <HealthGauge health={h} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {can('subscriptions.create') && <button className="btn-primary" onClick={() => quick.open('subscription', { customer: { id: c.id, tradeName: c.tradeName, code: c.code }, onDone: reload })}><Repeat className="h-4 w-4" />Nueva suscripción</button>}
            {can('payments.create') && <button className="btn-accent" onClick={() => quick.open('payment', { customer: { id: c.id, tradeName: c.tradeName, code: c.code }, onDone: reload })}><CreditCard className="h-4 w-4" />Registrar pago</button>}
            {can('support.manage') && <button className="btn-secondary" onClick={() => quick.open('ticket', { customer: { id: c.id, tradeName: c.tradeName, code: c.code }, onDone: reload })}><LifeBuoy className="h-4 w-4" />Ticket</button>}
            {can('customers.update') && <button className="btn-secondary" onClick={() => quick.open('customer', { customer: c, onDone: reload })}><Pencil className="h-4 w-4" />Editar</button>}
            {can('customers.archive') && <ActionMenu items={[{ icon: Archive, label: c.archived ? 'Restaurar cliente' : 'Archivar cliente', run: () => setArchive(true), danger: !c.archived }]} />}
          </div>
        </div>
        {m && (
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-t border-slate-100 dark:divide-white/[.06] dark:border-white/[.06] sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
            <Strip l="MRR" v={<Money value={m.mrr} />} />
            <Strip l="Total cobrado" v={<Money value={m.total_collected} />} />
            <Strip l="Total facturado" v={<Money value={m.total_billed} />} />
            <Strip l="Saldo pendiente" v={<Money value={m.balance} tone={Number(m.balance) ? '' : 'muted'} />} />
            <Strip l="Vencido" v={<Money value={m.overdue} tone={Number(m.overdue) ? 'red' : 'muted'} />} sub={m.days_overdue ? `${m.days_overdue} días` : null} />
            <Strip l="Saldo a favor" v={<Money value={m.credit} tone={Number(m.credit) ? 'green' : 'muted'} />} sub={m.last_payment_on ? `Último pago ${date(m.last_payment_on)}` : 'Sin pagos'} />
          </div>
        )}
      </section>

      <Tabs value={tab} onChange={setTab} items={[
        { key: 'resumen', label: 'Resumen' },
        can('subscriptions.read') && { key: 'suscripciones', label: 'Suscripciones', count: subs.length },
        (can('charges.read') || can('collections.read')) && { key: 'cobranza', label: 'Cobranza' },
        can('support.read') && { key: 'soporte', label: 'Soporte', count: data.support?.open || null },
        { key: 'actividad', label: 'Actividad comercial' },
        { key: 'notas', label: 'Notas' },
        can('documents.read') && { key: 'documentos', label: 'Documentos' },
        { key: 'timeline', label: 'Línea de tiempo' },
      ]} />

      {tab === 'resumen' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <h2 className="section-title">Productos contratados</h2>
            {!subs.length ? <div className="card"><EmptyState icon={Repeat} title="Sin suscripciones" description="Crea la primera suscripción de este cliente." compact /></div> : (
              <div className="grid gap-4 md:grid-cols-2">{subs.map((s) => <SubCard key={s.id} s={s} />)}</div>
            )}
          </div>
          <div className="space-y-6">
            <Card title="Salud comercial" subtitle="Regla explicable: cada factor suma o resta puntos">
              <ul className="space-y-2.5">
                {h.factors.length === 0 && <li className="text-sm muted">Sin factores de riesgo. Cliente saludable.</li>}
                {h.factors.map((f) => (
                  <li key={f.key} className="flex items-start gap-3">
                    <span className={`mt-0.5 rounded-md px-1.5 text-xs font-bold tabular ${f.points < 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'}`}>{f.points > 0 ? `+${f.points}` : f.points}</span>
                    <span><span className="block text-sm font-medium">{f.label}</span><span className="block text-xs muted">{f.detail}</span></span>
                  </li>
                ))}
              </ul>
            </Card>
            <ContactsCard customerId={c.id} contacts={data.contacts} onChange={reload} />
            <Card title="Datos generales">
              <DescList cols={1} items={[['RFC', c.rfc || '—'], c.fiscalMasked ? ['Datos fiscales', 'Protegidos para tu rol'] : ['Régimen / CP fiscal', `${c.taxRegime || '—'} · ${c.taxZip || '—'}`],
                ['Tipo', c.personType === 'MORAL' ? 'Persona moral' : 'Persona física'], ['Giro', c.industry], ['Dirección', c.address], ['Ejecutivo', c.ownerName], ['Observaciones', c.notes]]} />
              {c.sourceProspectId && <Link to={`/crm?p=${c.sourceProspectId}`} className="mt-4 inline-block text-sm link">Ver historial del prospecto →</Link>}
            </Card>
          </div>
        </div>
      )}
      {tab === 'suscripciones' && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{subs.map((s) => <SubCard key={s.id} s={s} />)}</div>}
      {tab === 'cobranza' && <CollectionsTab customer={c} money={m} onChange={reload} />}
      {tab === 'soporte' && <SupportTab customerId={c.id} />}
      {tab === 'actividad' && <ActivityTab customerId={c.id} />}
      {tab === 'notas' && <NotesTab customerId={c.id} />}
      {tab === 'documentos' && <Card><DocumentsPanel ownerType="CUSTOMER" ownerId={c.id} defaultCategory="CONTRACT" /></Card>}
      {tab === 'timeline' && <TimelineTab customerId={c.id} />}

      <ConfirmDialog open={archive} title={c.archived ? 'Restaurar cliente' : 'Archivar cliente'} tone={c.archived ? 'primary' : 'danger'} confirmLabel={c.archived ? 'Restaurar' : 'Archivar'}
        message={c.archived ? 'Volverá a aparecer en el directorio.' : 'Solo se archivan clientes sin suscripciones vigentes ni saldo. Su historial se conserva.'}
        onClose={() => setArchive(false)} onConfirm={async () => { try { await customersApi.archive(c.id, !c.archived); setArchive(false); reload() } catch (e) { toast.error(errorMessage(e)) } }} />
      {tagsOpen && <TagsModal customer={c} onClose={() => setTagsOpen(false)} onDone={() => { setTagsOpen(false); reload() }} />}
      <span className="hidden">{navigate.length}</span>
    </div>
  )
}

function Strip({ l, v, sub }) {
  return <div className="px-5 py-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{l}</p><p className="mt-1 font-display text-lg font-bold">{v}</p>{sub && <p className="text-[11px] muted">{sub}</p>}</div>
}

function HealthGauge({ health }) {
  const color = health.level === 'HEALTHY' ? '#10b981' : health.level === 'ATTENTION' ? '#f59e0b' : '#ef4444'
  const text = health.level === 'HEALTHY' ? 'Saludable' : health.level === 'ATTENTION' ? 'Atención' : 'En riesgo'
  const c = 2 * Math.PI * 34
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-3 ring-1 ring-slate-200/70 backdrop-blur dark:bg-white/[.04] dark:ring-white/10">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90"><circle cx="40" cy="40" r="34" fill="none" strokeWidth="8" className="stroke-slate-100 dark:stroke-white/10" />
          <circle cx="40" cy="40" r="34" fill="none" strokeWidth="8" strokeLinecap="round" stroke={color} strokeDasharray={`${(health.score / 100) * c} ${c}`} /></svg>
        <span className="absolute inset-0 grid place-items-center font-display text-xl font-extrabold">{health.score}</span>
      </div>
      <div><p className="flex items-center gap-1 text-xs font-semibold muted"><HeartPulse className="h-3.5 w-3.5" />Salud comercial</p><p className="font-display text-base font-bold" style={{ color }}>{text}</p></div>
    </div>
  )
}

function SubCard({ s }) {
  const { byId } = useCatalog()
  const p = byId[s.productId]
  return (
    <Link to={`/suscripciones/${s.id}`} className="card group block p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start gap-3">
        <ProductTile product={p || { color: s.productColor }} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{s.productName}</p>
          <p className="text-xs muted">{s.planName} · {PERIODS[s.billingPeriod]} · <span className="font-mono">{s.code}</span></p>
        </div>
        <StatusBadge map={SUBSCRIPTION_STATUS} value={s.status} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div><p className="font-display text-xl font-extrabold tabular">{money(s.price)}<span className="text-xs font-medium muted">{PERIOD_SHORT[s.billingPeriod]}</span></p>
          {s.discountType !== 'NONE' && <p className="text-[11px] font-semibold text-emerald-600">Descuento {s.discountType === 'PERCENT' ? `${Number(s.discountValue)} %` : money(s.discountValue)}</p>}</div>
        <div className="text-right"><StatusBadge map={COLLECTION_STATUS} value={s.collectionStatus} dot={false} />
          {s.overdueAmount > 0 && <p className="mt-1 text-xs font-semibold text-rose-600">Vencido {money(s.overdueAmount)}</p>}</div>
      </div>
      <p className="mt-3 border-t border-slate-100 pt-3 text-xs muted dark:border-white/[.06]">
        {s.status === 'TRIAL' ? `Prueba termina el ${date(s.trialEndsOn)}` : s.currentPeriodEnd ? `Periodo hasta ${date(s.currentPeriodEnd)}${s.cancelAtPeriodEnd ? ' · se cancela al terminar' : s.autoRenew ? ' · renueva sola' : ' · renovación manual'}` : `Inicia ${date(s.startDate)}`}
      </p>
    </Link>
  )
}

function ContactsCard({ customerId, contacts, onChange }) {
  const { can } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const save = async () => {
    try {
      if (form.id) await customersApi.updateContact(customerId, form.id, form)
      else await customersApi.addContact(customerId, form)
      setForm(null)
      onChange()
    } catch (e) { toast.error(errorMessage(e)) }
  }
  return (
    <Card title="Contactos" actions={can('customers.update') && <button className="btn-ghost btn-sm" onClick={() => setForm({ name: '', position: '', email: '', phone: '', primary: false, billing: false })}><Plus className="h-3.5 w-3.5" />Agregar</button>}>
      {!contacts?.length ? <p className="text-sm muted">Sin contactos adicionales.</p> : (
        <ul className="space-y-3">
          {contacts.map((x) => (
            <li key={x.id} className="flex items-start gap-3">
              <Avatar name={x.name} size="h-8 w-8 text-[10px]" />
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{x.name} {x.primary && <Badge tone="brand">Principal</Badge>} {x.billing && <Badge tone="green">Cobranza</Badge>}</p>
                <p className="truncate text-xs muted">{[x.position, x.email, x.phone].filter(Boolean).join(' · ')}</p></div>
              {can('customers.update') && <ActionMenu items={[{ icon: Pencil, label: 'Editar', run: () => setForm(x) }, { icon: Trash2, label: 'Eliminar', danger: true, run: async () => { await customersApi.deleteContact(customerId, x.id); onChange() } }]} />}
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar contacto' : 'Nuevo contacto'} size="max-w-lg"
        footer={<><button className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button><Button onClick={save}>Guardar</Button></>}>
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Puesto" value={form.position || ''} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            <Input label="Correo" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Teléfono" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
            <Checkbox checked={form.primary} onChange={(v) => setForm({ ...form, primary: v })} label="Contacto principal" />
            <Checkbox checked={form.billing} onChange={(v) => setForm({ ...form, billing: v })} label="Recibe avisos de cobranza" />
          </div>
        )}
      </Modal>
    </Card>
  )
}

function CollectionsTab({ customer, money: m, onChange }) {
  const { can } = useAuth()
  const { users } = useCatalog()
  const toast = useToast()
  const statement = useAsync(() => (can('charges.read') ? customersApi.statement(customer.id) : Promise.resolve(null)), [customer.id])
  const charges = useAsync(() => (can('charges.read') ? billingApi.charges({ customerId: customer.id, size: 100 }) : Promise.resolve(null)), [customer.id])
  const actions = useAsync(() => (can('collections.read') ? billingApi.actions({ customerId: customer.id }) : Promise.resolve([])), [customer.id])
  const [form, setForm] = useState(null)
  const save = async () => {
    try {
      await billingApi.addAction({ customerId: customer.id, ...form, promiseAmount: form.type === 'PROMISE' ? form.promiseAmount : null, promiseDate: form.type === 'PROMISE' ? form.promiseDate : null,
        nextActionOn: form.nextActionOn || null, responsibleUserId: form.responsibleUserId ? Number(form.responsibleUserId) : null })
      setForm(null)
      toast.success('Gestión registrada')
      actions.reload()
      onChange()
    } catch (e) { toast.error(errorMessage(e)) }
  }
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        {charges.data && (
          <Card title="Cargos" subtitle="Cada suscripción con su propio saldo" pad={false}>
            <DataTable rows={charges.data.content} dense columns={[
              { key: 'folio', header: 'Cargo', render: (r) => <div><p className="font-mono text-xs font-semibold">{r.folio}</p><p className="max-w-[260px] truncate text-xs muted">{r.description}</p></div> },
              { key: 'productCode', header: 'Producto', render: (r) => r.productCode ? <ProductChip code={r.productCode} color={r.productColor} /> : '—' },
              { key: 'dueDate', header: 'Vence', render: (r) => <span className={r.daysOverdue ? 'font-semibold text-rose-600' : ''}>{date(r.dueDate)}</span> },
              { key: 'total', header: 'Total', align: 'right', render: (r) => <Money value={r.total} /> },
              { key: 'balance', header: 'Saldo', align: 'right', render: (r) => <Money value={r.balance} tone={Number(r.balance) ? '' : 'muted'} strong /> },
              { key: 'status', header: 'Estado', render: (r) => <StatusBadge map={CHARGE_STATUS} value={r.status} /> },
            ]} />
          </Card>
        )}
        {statement.data && (
          <Card title="Estado de cuenta" subtitle={statement.data.note} pad={false}>
            <DataTable rows={[...statement.data.movements].reverse().map((x, i) => ({ ...x, _k: `${x.kind}-${x.ref_id}-${i}` }))} rowKey="_k" dense columns={[
              { key: 'date', header: 'Fecha', render: (r) => date(r.date) },
              { key: 'description', header: 'Concepto', render: (r) => <div><p className="text-sm">{r.description}</p><p className="font-mono text-[11px] muted">{r.folio}</p></div> },
              { key: 'debit', header: 'Cargo', align: 'right', render: (r) => (Number(r.debit) ? <Money value={r.debit} /> : '') },
              { key: 'credit', header: 'Abono', align: 'right', render: (r) => (Number(r.credit) ? <Money value={r.credit} tone="green" /> : '') },
              { key: 'balance', header: 'Saldo', align: 'right', render: (r) => <Money value={r.balance} strong /> },
            ]} />
          </Card>
        )}
      </div>
      <div className="space-y-6">
        {m && (
          <div className="grid grid-cols-2 gap-3">
            <Kpi icon={Wallet} tone="amber" label="Saldo" value={money(m.balance)} />
            <Kpi icon={HandCoins} tone="red" label="Vencido" value={money(m.overdue)} sub={m.oldest_overdue && `Desde ${date(m.oldest_overdue)}`} />
          </div>
        )}
        {can('collections.read') && (
          <Card title="Gestiones de cobranza" actions={can('collections.manage') && <button className="btn-ghost btn-sm" onClick={() => setForm({ type: 'CALL', notes: '', nextActionOn: '', responsibleUserId: '', promiseDate: todayIso(), promiseAmount: '' })}><Plus className="h-3.5 w-3.5" />Registrar</button>}>
            {!actions.data?.length ? <p className="text-sm muted">Sin gestiones registradas.</p> : (
              <ol className="space-y-4">
                {actions.data.map((a) => (
                  <li key={a.id} className="border-l-2 border-brand-200 pl-3 dark:border-brand-500/30">
                    <p className="text-sm font-semibold">{COLLECTION_ACTION[a.type]}{a.promiseAmount && ` · ${money(a.promiseAmount)} el ${date(a.promiseDate)}`}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{a.notes}</p>
                    <p className="text-[11px] muted">{a.createdByName} · {timeAgo(a.createdAt)}{a.nextActionOn && ` · siguiente acción ${date(a.nextActionOn)} (${a.responsibleName})`}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        )}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title="Registrar gestión de cobranza" icon={HandCoins}
        footer={<><button className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button><Button onClick={save} disabled={!form?.notes?.trim()}>Guardar</Button></>}>
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{Object.entries(COLLECTION_ACTION).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
            <Select label="Responsable" value={form.responsibleUserId} onChange={(e) => setForm({ ...form, responsibleUserId: e.target.value })}><option value="">Yo</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
            {form.type === 'PROMISE' && <><Input label="Fecha prometida" type="date" value={form.promiseDate} onChange={(e) => setForm({ ...form, promiseDate: e.target.value })} />
              <Input label="Importe prometido" value={form.promiseAmount} onChange={(e) => setForm({ ...form, promiseAmount: e.target.value.replace(/[^\d.]/g, '') })} /></>}
            <Textarea label="Notas" required wrapClass="sm:col-span-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            <Input label="Próxima acción" type="date" min={todayIso()} value={form.nextActionOn} onChange={(e) => setForm({ ...form, nextActionOn: e.target.value })} />
          </div>
        )}
      </Modal>
    </div>
  )
}

function SupportTab({ customerId }) {
  const navigate = useNavigate()
  const { data, loading } = useAsync(() => opsApi.tickets({ customerId, size: 50 }), [customerId])
  return (
    <div className="card overflow-hidden">
      <DataTable loading={loading} rows={data?.content} onRowClick={(r) => navigate(`/soporte/${r.id}`)} columns={[
        { key: 'subject', header: 'Ticket', render: (r) => <div><p className="font-semibold">{r.subject}</p><p className="font-mono text-xs muted">{r.folio}</p></div> },
        { key: 'productCode', header: 'Producto', render: (r) => (r.productCode ? <ProductChip code={r.productCode} color={r.productColor} /> : '—') },
        { key: 'priority', header: 'Prioridad', render: (r) => <StatusBadge map={TICKET_PRIORITY} value={r.priority} /> },
        { key: 'status', header: 'Estado', render: (r) => <StatusBadge map={TICKET_STATUS} value={r.status} /> },
        { key: 'createdAt', header: 'Creado', render: (r) => timeAgo(r.createdAt) },
      ]} empty={<EmptyState icon={LifeBuoy} title="Sin tickets" compact />} />
    </div>
  )
}

function ActivityTab({ customerId }) {
  const { can } = useAuth()
  const toast = useToast()
  const { data, reload } = useAsync(() => customersApi.activities(customerId), [customerId])
  const [f, setF] = useState({ type: 'CALL', subject: '', body: '' })
  const add = async (e) => {
    e.preventDefault()
    try { await customersApi.addActivity(customerId, { ...f, completed: true }); setF({ type: 'CALL', subject: '', body: '' }); reload() } catch (err) { toast.error(errorMessage(err)) }
  }
  return (
    <Card>
      {can('customers.update') && (
        <form onSubmit={add} className="mb-6 grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} aria-label="Tipo">{['CALL', 'MESSAGE', 'EMAIL', 'MEETING', 'NOTE', 'COMMITMENT'].map((k) => <option key={k} value={k}>{ACTIVITY_TYPES[k]}</option>)}</Select>
          <Input placeholder="Asunto" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} maxLength={200} />
          <Button type="submit" disabled={!f.subject.trim()}>Registrar</Button>
        </form>
      )}
      <ol className="space-y-4">
        {data?.map((a) => (
          <li key={a.id} className="flex gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
            <div><p className="text-sm font-semibold">{a.subject}</p><p className="text-xs muted">{ACTIVITY_TYPES[a.type]} · {a.userName} · {dateTime(a.completedAt || a.createdAt)}</p>{a.body && <p className="mt-1 text-sm">{a.body}</p>}</div></li>
        ))}
        {data?.length === 0 && <li className="text-sm muted">Sin actividad comercial registrada.</li>}
      </ol>
    </Card>
  )
}

function NotesTab({ customerId }) {
  const { user } = useAuth()
  const toast = useToast()
  const { data, reload } = useAsync(() => customersApi.notes(customerId), [customerId])
  const [body, setBody] = useState('')
  const add = async () => {
    try { await customersApi.addNote(customerId, { body, pinned: false }); setBody(''); reload() } catch (e) { toast.error(errorMessage(e)) }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title="Nueva nota interna" className="h-fit">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Visible solo para el equipo de Nexora" maxLength={4000} />
        <Button className="mt-3 w-full" disabled={!body.trim()} onClick={add}><StickyNote className="h-4 w-4" />Guardar nota</Button>
      </Card>
      <div className="space-y-3 lg:col-span-2">
        {data?.map((n) => (
          <div key={n.id} className={`card p-4 ${n.pinned ? 'ring-2 ring-amber-300 dark:ring-amber-500/40' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="whitespace-pre-line text-sm">{n.body}</p>
              <ActionMenu items={[{ icon: StickyNote, label: n.pinned ? 'Desfijar' : 'Fijar arriba', run: async () => { await customersApi.pinNote(customerId, n.id); reload() } },
                n.createdBy === user.id && { icon: Trash2, label: 'Eliminar', danger: true, run: async () => { await customersApi.deleteNote(customerId, n.id); reload() } }]} />
            </div>
            <p className="mt-2 text-[11px] muted">{n.authorName} · {dateTime(n.createdAt)}</p>
          </div>
        ))}
        {data?.length === 0 && <div className="card"><EmptyState icon={StickyNote} title="Sin notas" compact /></div>}
      </div>
    </div>
  )
}

const KIND = { SUBSCRIPTION: [Repeat, 'bg-brand-500'], PAYMENT: [CreditCard, 'bg-emerald-500'], CHARGE: [FileText, 'bg-amber-500'], ACTIVITY: [CalendarClock, 'bg-violet-500'],
  NOTE: [StickyNote, 'bg-slate-400'], COLLECTION: [HandCoins, 'bg-orange-500'], TICKET: [LifeBuoy, 'bg-sky-500'] }

function TimelineTab({ customerId }) {
  const { data, loading } = useAsync(() => customersApi.timeline(customerId), [customerId])
  if (loading) return <Skeleton className="h-96" />
  return (
    <Card>
      <ol className="relative space-y-5 border-l border-slate-200 pl-7 dark:border-white/10">
        {data?.map((e, i) => {
          const [Icon, bg] = KIND[e.kind] || [FileText, 'bg-slate-400']
          const sub = e.kind === 'SUBSCRIPTION' ? `${label(EVENT_TYPES, e.type)} · ${e.detail || ''}` : e.kind === 'PAYMENT' ? `${label(PAYMENT_STATUS, e.type)} · ${e.detail}` : e.detail
          const body = (
            <>
              <span className={`absolute -left-[39px] grid h-7 w-7 place-items-center rounded-full text-white ring-4 ring-white dark:ring-ink-900 ${bg}`}><Icon className="h-3.5 w-3.5" /></span>
              <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold">{e.title}</p><span className="text-xs muted">{dateTime(e.at)}</span></div>
              {sub && <p className="mt-0.5 line-clamp-2 text-xs muted">{sub}</p>}
              {e.extra && e.kind === 'SUBSCRIPTION' && e.extra !== 'NONE' && <StatusBadge map={MOVEMENTS} value={e.extra} dot={false} />}
            </>
          )
          return <li key={i} className="relative">{e.link ? <Link to={e.link} className="block hover:opacity-80">{body}</Link> : body}</li>
        })}
      </ol>
    </Card>
  )
}

function TagsModal({ customer, onClose, onDone }) {
  const toast = useToast()
  const { data: tags, reload } = useAsync(() => customersApi.tags(), [])
  const [selected, setSelected] = useState(new Set(customer.tags.map((t) => t.id)))
  const [name, setName] = useState('')
  const save = async () => { try { await customersApi.setTags(customer.id, [...selected]); onDone() } catch (e) { toast.error(errorMessage(e)) } }
  const create = async () => { try { const t = await customersApi.createTag({ name, color: '#6366f1' }); setName(''); setSelected((s) => new Set([...s, t.id])); reload() } catch (e) { toast.error(errorMessage(e)) } }
  return (
    <Modal open onClose={onClose} title="Etiquetas del cliente" icon={Tag} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button onClick={save}>Guardar</Button></>}>
      <div className="flex flex-wrap gap-2">
        {tags?.map((t) => (
          <button key={t.id} onClick={() => setSelected((s) => { const n = new Set(s); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n })}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ring-2 transition ${selected.has(t.id) ? '' : 'opacity-50 ring-transparent'}`} style={{ background: `${t.color}22`, color: t.color, '--tw-ring-color': t.color }}>{t.name}</button>
        ))}
      </div>
      <div className="mt-5 flex gap-2"><Input placeholder="Nueva etiqueta" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} wrapClass="flex-1" /><button className="btn-secondary" disabled={!name.trim()} onClick={create}>Crear</button></div>
    </Modal>
  )
}
