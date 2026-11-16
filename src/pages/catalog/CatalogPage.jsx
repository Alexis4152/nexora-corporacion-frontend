import { useState } from 'react'
import { BadgePercent, History, Pencil, Plus, Power, Star, Tag } from 'lucide-react'
import { catalogApi } from '../../api'
import { errorMessage, fieldErrors } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { ActionMenu, Badge, Button, Card, Checkbox, EmptyState, Input, Modal, PageHeader, Select, Skeleton, Switch, Tabs, Textarea } from '../../components/ui'
import DataTable from '../../components/DataTable'
import ProductIcon, { ICON_OPTIONS, ProductTile } from '../../components/ProductIcon'
import { PERIODS } from '../../utils/labels'
import { date, dateTime, money, moneyInput } from '../../utils/format'

export default function CatalogPage() {
  const { can } = useAuth()
  const { reload: reloadCatalog } = useCatalog()
  const toast = useToast()
  const [tab, setTab] = useState('products')
  const { data, loading, reload } = useAsync(() => catalogApi.products(true), [])
  const coupons = useAsync(() => (tab === 'coupons' ? catalogApi.coupons() : Promise.resolve(null)), [tab])
  const [selected, setSelected] = useState(null)
  const [productForm, setProductForm] = useState(null)
  const [planForm, setPlanForm] = useState(null)
  const [priceForm, setPriceForm] = useState(null)
  const [history, setHistory] = useState(null)
  const [couponForm, setCouponForm] = useState(null)
  const done = () => { reload(); reloadCatalog() }
  const product = data?.find((p) => p.id === selected) || data?.[0]
  return (
    <>
      <PageHeader eyebrow="Catálogo dinámico" title="Productos y planes" description="Nada está fijo en el código: productos, planes, precios por periodicidad y cupones se administran aquí. Cambiar un precio conserva el histórico."
        actions={can('products.manage') && tab === 'products' && <button className="btn-primary" onClick={() => setProductForm({})}><Plus className="h-4 w-4" />Nuevo producto</button>} />
      <Tabs value={tab} onChange={setTab} items={[{ key: 'products', label: 'Productos', count: data?.length }, { key: 'coupons', label: 'Cupones y promociones', icon: BadgePercent }]} />
      {tab === 'products' && (loading ? <Skeleton className="mt-6 h-[480px]" /> : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <ul className="space-y-2">
            {data.map((p) => (
              <li key={p.id}>
                <button onClick={() => setSelected(p.id)} className={`card flex w-full items-center gap-3 p-3 text-left transition ${product?.id === p.id ? 'ring-2 ring-brand-500' : 'hover:shadow-lift'} ${!p.active ? 'opacity-60' : ''}`}>
                  <ProductTile product={p} />
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.name}</p><p className="truncate text-xs muted">{p.tagline || p.category}</p></div>
                  <div className="text-right"><p className="text-sm font-bold tabular">{p.activeSubscriptions}</p><p className="text-[10px] muted">activas</p></div>
                </button>
              </li>
            ))}
          </ul>
          {product && (
            <div className="space-y-6">
              <section className="card overflow-hidden">
                <div className="p-6" style={{ background: `linear-gradient(120deg, ${product.color}22, transparent 70%)` }}>
                  <div className="flex flex-wrap items-start gap-4">
                    <ProductTile product={product} size="h-14 w-14" iconClass="h-7 w-7" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-2xl font-extrabold">{product.name}</h2><Badge tone={product.active ? 'green' : 'slate'} dot>{product.active ? 'Activo' : 'Inactivo'}</Badge><span className="font-mono text-xs muted">{product.code}</span></div>
                      <p className="mt-1 text-sm muted">{product.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <Badge>Prueba {product.defaultTrialDays} días</Badge><Badge>Gracia {product.defaultGraceDays} días</Badge>
                        <Badge tone={product.renewalPolicy === 'AUTO' ? 'brand' : 'slate'}>Renovación {product.renewalPolicy === 'AUTO' ? 'automática' : 'manual'}</Badge>
                        <Badge tone={product.suspensionPolicy === 'AUTO_AFTER_GRACE' ? 'orange' : 'slate'}>{product.suspensionPolicy === 'AUTO_AFTER_GRACE' ? 'Suspende al terminar la gracia' : 'Suspensión manual'}</Badge>
                      </div>
                    </div>
                    {can('products.manage') && (
                      <div className="flex gap-2">
                        <button className="btn-secondary btn-sm" onClick={() => setProductForm(product)}><Pencil className="h-3.5 w-3.5" />Editar</button>
                        <button className="btn-ghost btn-sm" onClick={async () => { try { await catalogApi.productActive(product.id, !product.active); done() } catch (e) { toast.error(errorMessage(e)) } }}><Power className="h-3.5 w-3.5" />{product.active ? 'Desactivar' : 'Activar'}</button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
              <div className="flex items-center justify-between"><h3 className="section-title">Planes</h3>{can('plans.manage') && <button className="btn-secondary btn-sm" onClick={() => setPlanForm({ productId: product.id })}><Plus className="h-3.5 w-3.5" />Nuevo plan</button>}</div>
              {!product.plans.length ? <div className="card"><EmptyState icon={Tag} title="Sin planes" description="Crea el primer plan con sus precios por periodicidad." compact /></div> : (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {product.plans.map((pl) => (
                    <article key={pl.id} className={`card relative flex flex-col p-5 ${pl.highlighted ? 'ring-2' : ''} ${!pl.active ? 'opacity-60' : ''}`} style={pl.highlighted ? { '--tw-ring-color': product.color } : {}}>
                      {pl.highlighted && <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: product.color }}><Star className="h-3 w-3" />Más vendido</span>}
                      <div className="flex items-start justify-between gap-2">
                        <div><p className="font-display text-lg font-bold">{pl.name}</p><p className="font-mono text-[11px] muted">{pl.code}{pl.custom && ' · a la medida'}</p></div>
                        {can('plans.manage') && <ActionMenu items={[{ icon: Pencil, label: 'Editar plan', run: () => setPlanForm(pl) }, { icon: BadgePercent, label: 'Cambiar precio', run: () => setPriceForm({ plan: pl, billingPeriod: pl.prices[0]?.billingPeriod || 'MONTHLY', amount: '', taxIncluded: false }) },
                          { icon: History, label: 'Histórico de precios', run: async () => setHistory({ plan: pl, rows: await catalogApi.priceHistory(pl.id) }) }]} />}
                      </div>
                      <ul className="mt-4 space-y-1.5">
                        {pl.prices.length ? pl.prices.map((x) => (
                          <li key={x.id} className="flex items-baseline justify-between text-sm"><span className="muted">{PERIODS[x.billingPeriod]}</span><span className="font-display text-base font-bold tabular">{money(x.amount)}<span className="text-[11px] font-medium muted">{x.taxIncluded ? ' IVA incl.' : ' + IVA'}</span></span></li>
                        )) : <li className="text-sm muted">Sin precio de lista (se pacta por cliente)</li>}
                      </ul>
                      <ul className="mt-4 flex-1 space-y-1 border-t border-slate-100 pt-3 text-xs muted dark:border-white/[.06]">
                        {pl.features.slice(0, 6).map((f) => <li key={f}>✓ {f}</li>)}
                        {(pl.maxUsers || pl.maxBranches) && <li>Límites: {pl.maxUsers ? `${pl.maxUsers} usuarios` : 'usuarios ilimitados'} · {pl.maxBranches ? `${pl.maxBranches} sucursales` : 'sucursales ilimitadas'}</li>}
                      </ul>
                      <p className="mt-3 text-xs font-semibold">{pl.activeSubscriptions} suscripción(es) vigente(s)</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {tab === 'coupons' && (
        <div className="mt-6 card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-white/[.06]"><p className="text-sm muted">Descuentos aplicables al contratar. Cada uso queda contado.</p>
            {can('plans.manage') && <button className="btn-primary btn-sm" onClick={() => setCouponForm({ code: '', description: '', discountType: 'PERCENT', discountValue: '', durationCycles: '', productId: '', validFrom: '', validUntil: '', maxRedemptions: '' })}><Plus className="h-3.5 w-3.5" />Nuevo cupón</button>}</div>
          <DataTable loading={coupons.loading} rows={coupons.data} columns={[
            { key: 'code', header: 'Código', render: (r) => <div><p className="font-mono font-bold">{r.code}</p><p className="text-xs muted">{r.description}</p></div> },
            { key: 'discount', header: 'Descuento', render: (r) => (r.discountType === 'PERCENT' ? `${Number(r.discountValue)} %` : money(r.discountValue)) },
            { key: 'durationCycles', header: 'Duración', render: (r) => (r.durationCycles ? `${r.durationCycles} periodo(s)` : 'Permanente') },
            { key: 'productId', header: 'Producto', render: (r) => (r.productId ? data?.find((p) => p.id === r.productId)?.name : 'Todos') },
            { key: 'validUntil', header: 'Vigencia', render: (r) => (r.validUntil ? `Hasta ${date(r.validUntil)}` : 'Sin vencimiento') },
            { key: 'redemptions', header: 'Usos', render: (r) => `${r.redemptions}${r.maxRedemptions ? ` / ${r.maxRedemptions}` : ''}` },
            { key: 'active', header: 'Activo', render: (r) => can('plans.manage') ? <Switch size="sm" checked={r.active} onChange={async (v) => { await catalogApi.couponActive(r.id, v); coupons.reload() }} label="Activo" /> : (r.active ? 'Sí' : 'No') },
          ]} />
        </div>
      )}
      {productForm && <ProductModal product={productForm.id ? productForm : null} onClose={() => setProductForm(null)} onDone={() => { setProductForm(null); done() }} />}
      {planForm && <PlanModal plan={planForm.id ? planForm : null} productId={planForm.productId} onClose={() => setPlanForm(null)} onDone={() => { setPlanForm(null); done() }} />}
      {priceForm && <PriceModal form={priceForm} onClose={() => setPriceForm(null)} onDone={() => { setPriceForm(null); done() }} />}
      {couponForm && <CouponModal form={couponForm} products={data || []} onClose={() => setCouponForm(null)} onDone={() => { setCouponForm(null); coupons.reload() }} />}
      <Modal open={!!history} onClose={() => setHistory(null)} title={`Histórico de precios · ${history?.plan.name}`} icon={History} size="max-w-xl">
        <ul className="divide-y divide-slate-100 dark:divide-white/[.06]">
          {history?.rows.map((r) => <li key={r.id} className="flex items-center justify-between py-2.5 text-sm"><span>{PERIODS[r.billingPeriod]} · <b className="tabular">{money(r.amount)}</b>{r.taxIncluded ? ' IVA incl.' : ''}</span>
            <span className="text-xs muted">{dateTime(r.validFrom)} → {r.validTo ? dateTime(r.validTo) : <Badge tone="green">Vigente</Badge>}</span></li>)}
        </ul>
      </Modal>
    </>
  )
}

function ProductModal({ product, onClose, onDone }) {
  const toast = useToast()
  const [f, setF] = useState(product ? { ...product, marketingUrl: product.marketingUrl || '', systemUrl: product.systemUrl || '' }
    : { code: '', name: '', tagline: '', description: '', category: '', color: '#6366f1', icon: 'box', marketingUrl: '', systemUrl: '', defaultTrialDays: 14, defaultGraceDays: 5, renewalPolicy: 'AUTO', suspensionPolicy: 'MANUAL', sortOrder: 10 })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e })
  const submit = async () => {
    setBusy(true)
    try { product ? await catalogApi.updateProduct(product.id, f) : await catalogApi.createProduct(f); toast.success('Producto guardado'); onDone() } catch (e) { setErrors(fieldErrors(e)); toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={product ? `Editar ${product.name}` : 'Nuevo producto'} size="max-w-3xl" footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button loading={busy} onClick={submit}>Guardar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Código" required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} disabled={!!product} error={errors.code} hint="No cambia una vez creado" />
        <Input label="Nombre comercial" required value={f.name} onChange={set('name')} error={errors.name} />
        <Input label="Lema" value={f.tagline || ''} onChange={set('tagline')} />
        <Input label="Categoría" value={f.category || ''} onChange={set('category')} />
        <Textarea label="Descripción" wrapClass="sm:col-span-2" rows={2} value={f.description || ''} onChange={set('description')} />
        <div><p className="label">Color identificativo</p><div className="flex items-center gap-2"><input type="color" value={f.color} onChange={set('color')} className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-transparent" /><Input value={f.color} onChange={set('color')} wrapClass="flex-1" error={errors.color} /></div></div>
        <div><p className="label">Ícono</p><div className="flex flex-wrap gap-1.5">{ICON_OPTIONS.map((ic) => <button type="button" key={ic} onClick={() => setF({ ...f, icon: ic })} className={`grid h-10 w-10 place-items-center rounded-lg ring-1 ${f.icon === ic ? 'text-white ring-transparent' : 'ring-slate-200 dark:ring-white/10'}`} style={f.icon === ic ? { background: f.color } : {}} aria-label={ic}><ProductIcon icon={ic} /></button>)}</div></div>
        <Input label="URL comercial" value={f.marketingUrl} onChange={set('marketingUrl')} error={errors.marketingUrl} placeholder="https://" />
        <Input label="URL del sistema" value={f.systemUrl} onChange={set('systemUrl')} error={errors.systemUrl} placeholder="https://" />
        <Input label="Días de prueba por defecto" value={f.defaultTrialDays} onChange={(e) => setF({ ...f, defaultTrialDays: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
        <Input label="Días de gracia por defecto" value={f.defaultGraceDays} onChange={(e) => setF({ ...f, defaultGraceDays: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
        <Select label="Política de renovación" value={f.renewalPolicy} onChange={set('renewalPolicy')}><option value="AUTO">Automática</option><option value="MANUAL">Manual (requiere confirmación)</option></Select>
        <Select label="Política de suspensión" value={f.suspensionPolicy} onChange={set('suspensionPolicy')}><option value="MANUAL">Manual: solo alerta al terminar la gracia</option><option value="AUTO_AFTER_GRACE">Automática al terminar la gracia</option></Select>
      </div>
    </Modal>
  )
}

function PlanModal({ plan, productId, onClose, onDone }) {
  const toast = useToast()
  const [f, setF] = useState(plan ? { ...plan, features: plan.features.join('\n'), maxUsers: plan.maxUsers ?? '', maxBranches: plan.maxBranches ?? '', trialDays: plan.trialDays ?? '' }
    : { productId, code: '', name: '', description: '', features: '', maxUsers: '', maxBranches: '', trialDays: '', highlighted: false, custom: false, active: true, sortOrder: 0, prices: { MONTHLY: '', ANNUAL: '' }, taxIncluded: false })
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    const body = { ...f, productId: plan?.productId || productId, features: f.features.split('\n').map((x) => x.trim()).filter(Boolean), usageLimits: plan?.usageLimits || {},
      maxUsers: f.maxUsers ? Number(f.maxUsers) : null, maxBranches: f.maxBranches ? Number(f.maxBranches) : null, trialDays: f.trialDays === '' ? null : Number(f.trialDays),
      prices: plan ? undefined : Object.entries(f.prices).filter(([, v]) => v !== '').map(([k, v]) => ({ billingPeriod: k, amount: v, taxIncluded: f.taxIncluded })) }
    try { plan ? await catalogApi.updatePlan(plan.id, body) : await catalogApi.createPlan(body); toast.success('Plan guardado'); onDone() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={plan ? `Editar plan ${plan.name}` : 'Nuevo plan'} size="max-w-2xl" footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button loading={busy} onClick={submit}>Guardar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Código" value={f.code} disabled={!!plan} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} />
        <Input label="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Textarea label="Descripción" wrapClass="sm:col-span-2" rows={2} value={f.description || ''} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <Textarea label="Características (una por línea)" wrapClass="sm:col-span-2" rows={4} value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} />
        <Input label="Usuarios permitidos" value={f.maxUsers} onChange={(e) => setF({ ...f, maxUsers: e.target.value.replace(/\D/g, '') })} placeholder="Ilimitados" />
        <Input label="Sucursales" value={f.maxBranches} onChange={(e) => setF({ ...f, maxBranches: e.target.value.replace(/\D/g, '') })} placeholder="Ilimitadas" />
        <Input label="Días de prueba" value={f.trialDays} onChange={(e) => setF({ ...f, trialDays: e.target.value.replace(/\D/g, '') })} placeholder="Los del producto" />
        <div className="space-y-2 pt-6"><Checkbox checked={f.highlighted} onChange={(v) => setF({ ...f, highlighted: v })} label="Destacado" /><Checkbox checked={f.custom} onChange={(v) => setF({ ...f, custom: v })} label="Personalizado (precio por cliente)" /><Checkbox checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Disponible para contratar" /></div>
        {!plan && (
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[.03] sm:col-span-2">
            <p className="label">Precios de lista (vacío = sin esa periodicidad)</p>
            <div className="grid gap-3 sm:grid-cols-4">
              {Object.entries(PERIODS).map(([k, l]) => <Input key={k} label={l} value={f.prices[k] || ''} onChange={(e) => setF({ ...f, prices: { ...f.prices, [k]: moneyInput(e.target.value) } })} />)}
            </div>
            <div className="mt-3"><Checkbox checked={f.taxIncluded} onChange={(v) => setF({ ...f, taxIncluded: v })} label="Los precios incluyen IVA" /></div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function PriceModal({ form, onClose, onDone }) {
  const toast = useToast()
  const [f, setF] = useState(form)
  const current = f.plan.prices.find((p) => p.billingPeriod === f.billingPeriod)
  const submit = async () => { try { await catalogApi.changePrice(f.plan.id, { billingPeriod: f.billingPeriod, amount: f.amount, taxIncluded: f.taxIncluded }); toast.success('Precio actualizado'); onDone() } catch (e) { toast.error(errorMessage(e)) } }
  return (
    <Modal open onClose={onClose} title={`Precio · ${f.plan.name}`} icon={BadgePercent} size="max-w-md" description="Las suscripciones existentes conservan su precio pactado. El precio anterior queda en el histórico."
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button>{current && <button className="btn-ghost text-rose-600" onClick={async () => { await catalogApi.retirePrice(f.plan.id, f.billingPeriod); onDone() }}>Retirar periodicidad</button>}<Button disabled={!f.amount} onClick={submit}>Guardar precio</Button></>}>
      <div className="space-y-4">
        <Select label="Periodicidad" value={f.billingPeriod} onChange={(e) => setF({ ...f, billingPeriod: e.target.value })}>{Object.entries(PERIODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <p className="text-sm muted">Vigente: {current ? <b>{money(current.amount)}{current.taxIncluded ? ' IVA incluido' : ' + IVA'}</b> : 'sin precio'}</p>
        <Input label="Nuevo precio" value={f.amount} onChange={(e) => setF({ ...f, amount: moneyInput(e.target.value) })} />
        <Checkbox checked={f.taxIncluded} onChange={(v) => setF({ ...f, taxIncluded: v })} label="Incluye IVA" />
      </div>
    </Modal>
  )
}

function CouponModal({ form, products, onClose, onDone }) {
  const toast = useToast()
  const [f, setF] = useState(form)
  const submit = async () => {
    try {
      await catalogApi.createCoupon({ ...f, discountValue: f.discountValue, durationCycles: f.durationCycles ? Number(f.durationCycles) : null, productId: f.productId ? Number(f.productId) : null,
        validFrom: f.validFrom || null, validUntil: f.validUntil || null, maxRedemptions: f.maxRedemptions ? Number(f.maxRedemptions) : null })
      toast.success('Cupón creado'); onDone()
    } catch (e) { toast.error(errorMessage(e)) }
  }
  return (
    <Modal open onClose={onClose} title="Nuevo cupón" icon={BadgePercent} size="max-w-xl" footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button disabled={!f.code || !f.discountValue} onClick={submit}>Crear cupón</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Código" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} />
        <Input label="Descripción" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <Select label="Tipo" value={f.discountType} onChange={(e) => setF({ ...f, discountType: e.target.value })}><option value="PERCENT">Porcentaje</option><option value="AMOUNT">Importe fijo</option></Select>
        <Input label="Valor" value={f.discountValue} onChange={(e) => setF({ ...f, discountValue: moneyInput(e.target.value) })} />
        <Input label="Periodos con descuento" value={f.durationCycles} onChange={(e) => setF({ ...f, durationCycles: e.target.value.replace(/\D/g, '') })} placeholder="Permanente" />
        <Select label="Producto" value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value })}><option value="">Todos</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        <Input label="Válido desde" type="date" value={f.validFrom} onChange={(e) => setF({ ...f, validFrom: e.target.value })} />
        <Input label="Válido hasta" type="date" value={f.validUntil} onChange={(e) => setF({ ...f, validUntil: e.target.value })} />
        <Input label="Usos máximos" value={f.maxRedemptions} onChange={(e) => setF({ ...f, maxRedemptions: e.target.value.replace(/\D/g, '') })} placeholder="Ilimitados" />
      </div>
    </Modal>
  )
}

