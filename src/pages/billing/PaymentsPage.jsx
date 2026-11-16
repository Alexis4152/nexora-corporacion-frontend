import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Plus } from 'lucide-react'
import { billingApi } from '../../api'
import { download, errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useQuick } from '../../context/QuickActions'
import { useToast } from '../../context/ToastContext'
import { useAsync, useDebounced } from '../../hooks/useAsync'
import { useQueryState } from '../../hooks/useQueryState'
import DataTable from '../../components/DataTable'
import Money from '../../components/Money'
import { ActionMenu, Checkbox, PageHeader, SearchInput, Select, StatusBadge } from '../../components/ui'
import { METHODS, PAYMENT_STATUS } from '../../utils/labels'
import { addDays, date, todayIso } from '../../utils/format'

export default function PaymentsPage() {
  const { can } = useAuth()
  const quick = useQuick()
  const toast = useToast()
  const navigate = useNavigate()
  const [f, set] = useQueryState({ q: '', status: '', method: '', from: addDays(todayIso(), -90), to: todayIso(), withCredit: '', page: '0', sort: '' })
  const [q, setQ] = useState(f.q)
  const debounced = useDebounced(q, 300)
  useEffect(() => { if (debounced !== f.q) set({ q: debounced }) }, [debounced]) // eslint-disable-line
  const { data, loading, reload } = useAsync(() => billingApi.payments({ ...f, withCredit: f.withCredit === 'true' || undefined, page: Number(f.page), size: 25 }),
    [f.q, f.status, f.method, f.from, f.to, f.withCredit, f.page, f.sort])
  const exportAs = (format) => download('/reports/payments/export', { format, from: f.from, to: f.to }).catch((e) => toast.error(errorMessage(e)))
  return (
    <>
      <PageHeader eyebrow="Cobranza" title="Pagos" description="Un pago registrado no es lo mismo que conciliado: capturado → confirmado → conciliado. Nada se borra: se rechaza o se revierte."
        actions={<>
          {can('reports.export') && <ActionMenu label="Exportar" trigger={<span className="inline-flex items-center gap-1.5"><Download className="h-4 w-4" />Exportar</span>}
            items={[{ label: 'Excel (.xlsx)', run: () => exportAs('xlsx') }, { label: 'CSV', run: () => exportAs('csv') }, { label: 'PDF', run: () => exportAs('pdf') }]} />}
          {can('payments.create') && <button className="btn-primary" onClick={() => quick.open('payment', { onDone: reload })}><Plus className="h-4 w-4" />Registrar pago</button>}
        </>} />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-white/[.06]">
          <SearchInput value={q} onChange={setQ} placeholder="Folio, referencia o cliente…" className="w-full sm:w-64" />
          <Select value={f.status} onChange={(e) => set({ status: e.target.value })} wrapClass="w-full sm:w-40" aria-label="Estado"><option value="">Todos los estados</option>{Object.entries(PAYMENT_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select value={f.method} onChange={(e) => set({ method: e.target.value })} wrapClass="w-full sm:w-40" aria-label="Método"><option value="">Todos los métodos</option>{Object.entries(METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <input type="date" className="input h-10 w-auto" value={f.from} onChange={(e) => set({ from: e.target.value })} aria-label="Desde" />
          <input type="date" className="input h-10 w-auto" value={f.to} onChange={(e) => set({ to: e.target.value })} aria-label="Hasta" />
          <div className="px-1"><Checkbox checked={f.withCredit === 'true'} onChange={(v) => set({ withCredit: v ? 'true' : '' })} label="Con saldo a favor" /></div>
        </div>
        <DataTable loading={loading} rows={data?.content} page={data} onPage={(p) => set({ page: String(p) })} sort={f.sort} onSort={(s) => set({ sort: s })}
          onRowClick={(r) => navigate(`/cobranza/pagos/${r.id}`)} columns={[
            { key: 'folio', header: 'Pago', sort: 'folio', render: (r) => <div><p className="font-mono text-xs font-semibold">{r.folio}</p><p className="text-sm font-medium">{r.customerName}</p></div> },
            { key: 'receivedOn', header: 'Fecha', sort: 'received', render: (r) => date(r.receivedOn) },
            { key: 'method', header: 'Método', render: (r) => <div><p className="text-sm">{METHODS[r.method]}</p><p className="font-mono text-[11px] muted">{r.reference || '—'}</p></div> },
            { key: 'amount', header: 'Importe', align: 'right', sort: 'amount', render: (r) => <Money value={r.amount} strong /> },
            { key: 'unapplied', header: 'Saldo a favor', align: 'right', render: (r) => <Money value={r.unapplied} tone={Number(r.unapplied) ? 'green' : 'muted'} /> },
            { key: 'status', header: 'Estado', render: (r) => <StatusBadge map={PAYMENT_STATUS} value={r.status} /> },
            { key: 'registeredBy', header: 'Registró', hideOnMobile: true },
          ]} />
      </div>
    </>
  )
}

