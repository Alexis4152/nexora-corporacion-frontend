import { ChevronDown, ChevronUp } from 'lucide-react'
import { EmptyState, Pagination, Skeleton } from './ui'

/**
 * Tabla con orden, carga y paginación. En pantallas chicas se convierte en tarjetas (sin scroll horizontal):
 * la primera columna es el título y las demás se muestran como pares etiqueta/valor (salvo {@code hideOnMobile}).
 */
export default function DataTable({ columns, rows, loading, empty, onRowClick, sort, onSort, page, onPage, rowKey = 'id', dense }) {
  const cols = columns.filter(Boolean)
  const toggleSort = (c) => {
    if (!c.sort || !onSort) return
    const desc = sort === c.sort ? `-${c.sort}` : c.sort
    onSort(sort === `-${c.sort}` ? c.sort : desc)
  }
  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px]">
          <thead className="table-head bg-slate-50/70 dark:bg-white/[.02]">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className={`${c.align === 'right' ? 'text-right' : ''} ${c.sort ? 'cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200' : ''} ${c.className || ''}`} onClick={() => toggleSort(c)}>
                  <span className={`inline-flex items-center gap-1 ${c.align === 'right' ? 'flex-row-reverse' : ''}`}>
                    {c.header}
                    {c.sort && (sort === c.sort ? <ChevronUp className="h-3 w-3" /> : sort === `-${c.sort}` ? <ChevronDown className="h-3 w-3" /> : null)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !rows?.length ? [...Array(6)].map((_, i) => (
              <tr key={i} className="table-row">{cols.map((c) => <td key={c.key}><Skeleton className="h-4 w-full max-w-[160px]" /></td>)}</tr>
            )) : rows?.map((r, i) => (
              <tr key={r[rowKey] ?? i} className={`table-row ${onRowClick ? 'cursor-pointer' : ''} ${dense ? '[&>td]:py-2.5' : ''}`} onClick={() => onRowClick?.(r)}>
                {cols.map((c) => <td key={c.key} className={`${c.align === 'right' ? 'text-right' : ''} ${c.cellClass || ''}`}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-100 md:hidden dark:divide-white/[.06]">
        {loading && !rows?.length ? [...Array(4)].map((_, i) => <div key={i} className="space-y-2 p-4"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>)
          : rows?.map((r, i) => (
            <div key={r[rowKey] ?? i} className={`p-4 ${onRowClick ? 'cursor-pointer active:bg-slate-50 dark:active:bg-white/[.03]' : ''}`} onClick={() => onRowClick?.(r)}>
              <div className="mb-2 min-w-0 text-sm font-semibold">{cols[0].render ? cols[0].render(r) : r[cols[0].key]}</div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {cols.slice(1).filter((c) => !c.hideOnMobile && c.header).map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{c.header}</dt>
                    <dd className="truncate text-sm">{c.render ? c.render(r) : r[c.key] ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
      </div>
      {!loading && rows && rows.length === 0 && (empty || <EmptyState title="Sin resultados" description="Ajusta los filtros para ver más registros." compact />)}
      {page && <Pagination page={page.page} totalPages={page.totalPages} total={page.totalElements} onChange={onPage} />}
    </div>
  )
}

