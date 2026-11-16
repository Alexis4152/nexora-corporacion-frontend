import { useState } from 'react'
import { Download, ScrollText } from 'lucide-react'
import { adminApi } from '../../api'
import { download, errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAsync, useDebounced } from '../../hooks/useAsync'
import { Badge, Drawer, EmptyState, PageHeader, Pagination, SearchInput, Select, Skeleton } from '../../components/ui'
import { dateTime } from '../../utils/format'

const RESULT = { SUCCESS: 'green', DENIED: 'amber', FAILED: 'red' }

export default function AuditPage() {
  const { can } = useAuth()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [module, setModule] = useState('')
  const [result, setResult] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(null)
  const debounced = useDebounced(q, 300)
  const modules = useAsync(() => adminApi.auditModules(), [])
  const { data, loading } = useAsync(() => adminApi.audit({ q: debounced, module, result, from, to, page, size: 40 }), [debounced, module, result, from, to, page])
  const moduleList = [...new Set((modules.data || []).map((m) => m.module))]
  const pretty = (s) => { try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s } }
  return (
    <>
      <PageHeader eyebrow="Seguridad" title="Auditoría" description="Bitácora inmutable (la base de datos impide modificarla o borrarla). Incluye usuario, IP, identificador de correlación y valores cambiados sin secretos."
        actions={can('reports.export') && <button className="btn-secondary" onClick={() => download('/audit/export', { format: 'csv', module, result, from, to }).catch((e) => toast.error(errorMessage(e)))}><Download className="h-4 w-4" />Exportar CSV</button>} />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-white/[.06]">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="Acción, usuario o detalle…" className="w-full sm:w-64" />
          <Select value={module} onChange={(e) => { setModule(e.target.value); setPage(0) }} wrapClass="w-full sm:w-44" aria-label="Módulo"><option value="">Todos los módulos</option>{moduleList.map((m) => <option key={m} value={m}>{m}</option>)}</Select>
          <Select value={result} onChange={(e) => { setResult(e.target.value); setPage(0) }} wrapClass="w-full sm:w-36" aria-label="Resultado"><option value="">Resultado</option><option value="SUCCESS">Éxito</option><option value="DENIED">Denegado</option><option value="FAILED">Fallido</option></Select>
          <input type="date" className="input h-10 w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Desde" />
          <input type="date" className="input h-10 w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Hasta" />
        </div>
        {loading && !data ? <div className="p-5"><Skeleton className="h-96" /></div> : !data?.content.length ? <EmptyState icon={ScrollText} title="Sin eventos" /> : (
          <ul className="divide-y divide-slate-100 dark:divide-white/[.06]">
            {data.content.map((a) => (
              <li key={a.id}><button onClick={() => setOpen(a)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/[.02]">
                <span className="w-40 shrink-0 text-xs tabular muted">{dateTime(a.created_at)}</span>
                <Badge tone={RESULT[a.result]}>{a.result}</Badge>
                <span className="font-mono text-xs font-semibold">{a.action}</span>
                <span className="text-xs muted">{a.module}{a.entity_type && ` · ${a.entity_type} #${a.entity_id ?? ''}`}</span>
                <span className="ml-auto truncate text-xs">{a.actor_email || 'Sistema'}</span>
              </button></li>
            ))}
          </ul>
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.totalElements} onChange={setPage} />}
      </div>
      {open && (
        <Drawer open onClose={() => setOpen(null)} title={open.action} subtitle={`${open.module} · ${dateTime(open.created_at)}`} width="max-w-xl">
          <dl className="space-y-3 text-sm">
            {[['Resultado', open.result], ['Usuario', open.actor_email || 'Sistema'], ['Entidad', open.entity_type ? `${open.entity_type} #${open.entity_id}` : '—'], ['Detalle', open.detail], ['IP', open.ip], ['Correlación', open.correlation_id]].map(([k, v]) => (
              <div key={k}><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k}</dt><dd className="break-all font-medium">{v || '—'}</dd></div>
            ))}
            {open.before_data && <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Antes</dt><pre className="mt-1 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/[.03]">{pretty(open.before_data)}</pre></div>}
            {open.after_data && <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Después</dt><pre className="mt-1 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/[.03]">{pretty(open.after_data)}</pre></div>}
          </dl>
        </Drawer>
      )}
    </>
  )
}

