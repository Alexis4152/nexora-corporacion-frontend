import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlarmClock, Columns3, Flame, List, Plus, Trophy } from 'lucide-react'
import { crmApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { useQuick } from '../../context/QuickActions'
import { useToast } from '../../context/ToastContext'
import { useAsync, useDebounced } from '../../hooks/useAsync'
import DataTable from '../../components/DataTable'
import { Avatar, Badge, Checkbox, ConfirmDialog, PageHeader, ProductChip, SearchInput, Segmented, Select, Skeleton, StatusBadge } from '../../components/ui'
import { LOST_REASONS, OPEN_STAGES, SOURCES, STAGES, label } from '../../utils/labels'
import { date, moneyCompact, timeAgo } from '../../utils/format'
import { canMove } from './stages'
import ProspectDrawer from './ProspectDrawer'
import ConvertWizard from './ConvertWizard'

const BOARD = [...OPEN_STAGES, 'WON', 'LOST']

export default function CrmPage() {
  const { can } = useAuth()
  const { activeProducts, users, byCode } = useCatalog()
  const quick = useQuick()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState('board')
  const [q, setQ] = useState('')
  const [productId, setProductId] = useState(params.get('productId') || '')
  const [ownerId, setOwnerId] = useState('')
  const [source, setSource] = useState('')
  const [stale, setStale] = useState(false)
  const [page, setPage] = useState(0)
  const debounced = useDebounced(q, 300)
  const filters = { q: debounced, productId, ownerId, source, stale: stale || undefined }
  const board = useAsync(() => (view === 'board' ? crmApi.board(filters) : Promise.resolve(null)), [view, debounced, productId, ownerId, source, stale])
  const list = useAsync(() => (view === 'list' ? crmApi.list({ ...filters, page, size: 25, sort: '-created' }) : Promise.resolve(null)), [view, debounced, productId, ownerId, source, stale, page])
  const [columns, setColumns] = useState([])
  const [dragging, setDragging] = useState(null)
  const [over, setOver] = useState(null)
  const [losing, setLosing] = useState(null)
  const [lostReason, setLostReason] = useState('PRICE')
  const [converting, setConverting] = useState(null)
  const openId = params.get('p')
  useEffect(() => { if (board.data) setColumns(board.data) }, [board.data])
  const reload = () => { board.reload(); list.reload() }
  const productColor = (codeKey) => byCode[codeKey]?.color

  const move = async (card, to, extra = {}) => {
    if (!canMove(card.stage, to)) {
      toast.error(`No se puede pasar de ${label(STAGES, card.stage)} a ${label(STAGES, to)}`)
      return
    }
    if (to === 'WON') { setConverting(card.id); return }
    if (to === 'LOST' && !extra.lostReason) { setLosing({ card, to }); return }
    const prev = columns
    setColumns((cols) => cols.map((c) => ({ ...c, cards: c.stage === to ? [{ ...card, stage: to }, ...c.cards] : c.cards.filter((x) => x.id !== card.id),
      count: c.stage === to ? c.count + 1 : c.stage === card.stage ? c.count - 1 : c.count })))
    try {
      await crmApi.stage(card.id, { stage: to, ...extra })
      toast.success(`${card.businessName} → ${label(STAGES, to)}`)
      board.reload()
    } catch (e) {
      setColumns(prev)
      toast.error(errorMessage(e))
    }
  }

  const totals = useMemo(() => {
    const open = columns.filter((c) => OPEN_STAGES.includes(c.stage))
    return { count: open.reduce((a, c) => a + c.count, 0), value: open.reduce((a, c) => a + Number(c.value), 0), weighted: open.reduce((a, c) => a + Number(c.weightedValue), 0) }
  }, [columns])

  return (
    <>
      <PageHeader eyebrow="CRM" title="Prospectos y oportunidades" description={can('prospects.read_all') ? 'Todo el embudo comercial del equipo.' : 'Tus oportunidades asignadas.'}
        actions={<>
          <Segmented value={view} onChange={setView} options={[['board', 'Tablero', Columns3], ['list', 'Lista', List]]} />
          {can('prospects.create') && <button className="btn-primary" onClick={() => quick.open('prospect', { onDone: reload })}><Plus className="h-4 w-4" />Nuevo prospecto</button>}
        </>}>
        {view === 'board' && (
          <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-xl">
            <Stat l="Oportunidades abiertas" v={totals.count} />
            <Stat l="Valor del pipeline" v={moneyCompact(totals.value)} />
            <Stat l="Ponderado por probabilidad" v={moneyCompact(totals.weighted)} accent />
          </div>
        )}
      </PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="Buscar negocio, contacto, correo…" className="w-full sm:w-72" />
        <Select value={productId} onChange={(e) => setProductId(e.target.value)} wrapClass="w-full sm:w-48" aria-label="Producto"><option value="">Todos los productos</option>{activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        {can('prospects.read_all') && <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} wrapClass="w-full sm:w-48" aria-label="Ejecutivo"><option value="">Todo el equipo</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>}
        <Select value={source} onChange={(e) => setSource(e.target.value)} wrapClass="w-full sm:w-44" aria-label="Fuente"><option value="">Todas las fuentes</option>{Object.entries(SOURCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <div className="px-1"><Checkbox checked={stale} onChange={setStale} label="Sin seguimiento" /></div>
      </div>

      {view === 'board' ? (
        board.loading && !columns.length ? <div className="flex gap-4 overflow-hidden">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[480px] w-72 shrink-0" />)}</div> : (
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-thin sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            {BOARD.map((stage) => {
              const col = columns.find((c) => c.stage === stage) || { cards: [], count: 0, value: 0 }
              const [title, tone] = STAGES[stage]
              const allowed = dragging && canMove(dragging.stage, stage)
              return (
                <div key={stage} onDragOver={(e) => { if (allowed) { e.preventDefault(); setOver(stage) } }} onDragLeave={() => setOver(null)}
                  onDrop={(e) => { e.preventDefault(); setOver(null); if (dragging) move(dragging, stage); setDragging(null) }}
                  className={`flex w-[290px] shrink-0 flex-col rounded-2xl p-2 transition ${over === stage ? 'bg-brand-50 ring-2 ring-brand-400 dark:bg-brand-500/10' : dragging && !allowed ? 'bg-slate-100/50 opacity-50 dark:bg-white/[.01]' : 'bg-slate-100/70 dark:bg-white/[.03]'}`}>
                  <div className="flex items-center justify-between px-2 pb-2 pt-1">
                    <div className="flex items-center gap-2">
                      {stage === 'WON' ? <Trophy className="h-4 w-4 text-emerald-500" /> : <span className={`h-2 w-2 rounded-full ${tone === 'green' ? 'bg-emerald-500' : tone === 'red' ? 'bg-rose-500' : tone === 'amber' ? 'bg-amber-500' : tone === 'orange' ? 'bg-orange-500' : tone === 'violet' ? 'bg-violet-500' : tone === 'sky' ? 'bg-sky-500' : tone === 'brand' ? 'bg-brand-500' : 'bg-slate-400'}`} />}
                      <p className="text-[13px] font-bold">{title}</p>
                      <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold text-slate-500 dark:bg-white/10">{col.count}</span>
                    </div>
                    {Number(col.value) > 0 && <span className="text-[11px] font-semibold tabular muted">{moneyCompact(col.value)}</span>}
                  </div>
                  {(stage === 'WON' || stage === 'LOST') && <p className="px-2 pb-2 text-[10.5px] muted">Últimos 30 días</p>}
                  <div className="flex max-h-[calc(100vh-330px)] min-h-[120px] flex-col gap-2 overflow-y-auto pr-0.5 scrollbar-thin">
                    {col.cards.map((card) => (
                      <article key={card.id} draggable={can('prospects.update') && card.stage !== 'WON'} onDragStart={() => setDragging(card)} onDragEnd={() => { setDragging(null); setOver(null) }}
                        onClick={() => setParams((p) => { p.set('p', card.id); return p })}
                        className="cursor-pointer rounded-xl bg-white p-3 shadow-soft ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-lift dark:bg-ink-850 dark:ring-white/[.07]">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-snug">{card.businessName}</p>
                          {card.stale && <span title="Sin seguimiento reciente"><Flame className="h-4 w-4 shrink-0 text-orange-500" /></span>}
                        </div>
                        <p className="mt-0.5 truncate text-xs muted">{card.contactName}{card.city ? ` · ${card.city}` : ''}</p>
                        <div className="mt-2 flex flex-wrap gap-1">{card.products.map((c) => <ProductChip key={c} code={c} color={productColor(c)} />)}</div>
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${card.probability}%` }} /></div>
                          <span className="text-[11px] font-bold tabular muted">{card.probability}%</span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-semibold tabular">{card.estimatedValue ? moneyCompact(card.estimatedValue) : '—'}</span>
                          {card.nextContactAt && card.stage !== 'WON' && card.stage !== 'LOST' ? (
                            <span className={`inline-flex items-center gap-1 ${new Date(card.nextContactAt) < new Date() ? 'font-semibold text-rose-600' : 'muted'}`}><AlarmClock className="h-3 w-3" />{date(card.nextContactAt)}</span>
                          ) : card.stage === 'LOST' ? <span className="text-rose-500">{label(LOST_REASONS, card.lostReason)}</span> : <span className="muted">{timeAgo(card.stageChangedAt)}</span>}
                          {card.ownerName && <Avatar name={card.ownerName} size="h-5 w-5 text-[8px]" />}
                        </div>
                      </article>
                    ))}
                    {!col.cards.length && <p className="py-6 text-center text-xs text-slate-400">Arrastra aquí</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        <div className="card overflow-hidden">
          <DataTable loading={list.loading} rows={list.data?.content} page={list.data} onPage={setPage} onRowClick={(r) => setParams((p) => { p.set('p', r.id); return p })}
            columns={[
              { key: 'businessName', header: 'Negocio', render: (r) => <div><p className="font-semibold">{r.businessName}</p><p className="text-xs muted">{r.contactName} · {r.email}</p></div> },
              { key: 'stage', header: 'Etapa', render: (r) => <StatusBadge map={STAGES} value={r.stage} /> },
              { key: 'products', header: 'Interés', render: (r) => <div className="flex flex-wrap gap-1">{r.products.map((c) => <ProductChip key={c} code={c} color={productColor(c)} />)}</div> },
              { key: 'estimatedValue', header: 'Valor', align: 'right', render: (r) => (r.estimatedValue ? moneyCompact(r.estimatedValue) : '—') },
              { key: 'probability', header: 'Prob.', align: 'right', render: (r) => `${r.probability}%` },
              { key: 'source', header: 'Fuente', render: (r) => SOURCES[r.source] },
              { key: 'ownerName', header: 'Ejecutivo', hideOnMobile: true },
              { key: 'nextContactAt', header: 'Próximo contacto', render: (r) => (r.nextContactAt ? date(r.nextContactAt) : '—') },
              { key: 'stale', header: '', render: (r) => r.stale && <Badge tone="orange">Sin seguimiento</Badge> },
            ]} />
        </div>
      )}

      {openId && <ProspectDrawer id={Number(openId)} onClose={() => setParams((p) => { p.delete('p'); return p })} onChanged={reload} onConvert={(id) => setConverting(id)} />}
      {converting && <ConvertWizard prospectId={converting} onClose={() => setConverting(null)} onDone={() => { setConverting(null); reload() }} />}
      <ConfirmDialog open={!!losing} title="Marcar como perdida" tone="danger" confirmLabel="Marcar perdida" onClose={() => setLosing(null)}
        message={`${losing?.card.businessName} saldrá del embudo activo. El motivo alimenta el reporte de pérdidas.`}
        onConfirm={(detail) => { const l = losing; setLosing(null); move(l.card, 'LOST', { lostReason, lostDetail: detail || null }) }}>
        <Select label="Motivo" value={lostReason} onChange={(e) => setLostReason(e.target.value)}>{Object.entries(LOST_REASONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
      </ConfirmDialog>
    </>
  )
}

function Stat({ l, v, accent }) {
  return <div className="card px-4 py-3"><p className="text-[11px] muted">{l}</p><p className={`font-display text-lg font-extrabold tabular ${accent ? 'text-brand-600 dark:text-brand-300' : ''}`}>{v}</p></div>
}

