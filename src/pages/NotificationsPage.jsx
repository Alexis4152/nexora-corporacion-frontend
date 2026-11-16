import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck } from 'lucide-react'
import { notificationsApi } from '../api'
import { useAsync } from '../hooks/useAsync'
import { EmptyState, PageHeader, Pagination, Segmented, Skeleton } from '../components/ui'
import { SEVERITY } from '../components/NotificationBell'
import { NOTIFICATION_CATEGORY } from '../utils/labels'
import { dateTime, timeAgo } from '../utils/format'
import { Bell } from 'lucide-react'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('')
  const [unread, setUnread] = useState('all')
  const [page, setPage] = useState(0)
  const { data, loading, reload } = useAsync(() => notificationsApi.list({ category, unread: unread === 'unread' ? true : undefined, page, size: 25 }), [category, unread, page])
  const open = async (n) => {
    if (!n.readAt) await notificationsApi.read(n.id).catch(() => {})
    if (n.link) navigate(n.link)
    else reload()
  }
  return (
    <>
      <PageHeader eyebrow="Centro de alertas" title="Notificaciones" description="Eventos reales del sistema según las preferencias de tu rol."
        actions={<button className="btn-secondary" onClick={async () => { await notificationsApi.readAll(); reload() }}><CheckCheck className="h-4 w-4" />Marcar todo como leído</button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented value={unread} onChange={(v) => { setUnread(v); setPage(0) }} options={[['all', 'Todas'], ['unread', 'Sin leer']]} />
        <select className="input h-9 w-auto text-[13px]" value={category} onChange={(e) => { setCategory(e.target.value); setPage(0) }} aria-label="Categoría">
          <option value="">Todas las categorías</option>{Object.entries(NOTIFICATION_CATEGORY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden">
        {loading && !data ? <div className="space-y-3 p-5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          : !data?.content.length ? <EmptyState icon={Bell} title="Sin notificaciones" description="Cuando ocurra algo importante lo verás aquí." />
            : (
              <ul className="divide-y divide-slate-100 dark:divide-white/[.06]">
                {data.content.map((n) => {
                  const [cls, Icon] = SEVERITY[n.severity] || SEVERITY.INFO
                  return (
                    <li key={n.id}>
                      <button onClick={() => open(n)} className={`flex w-full gap-4 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-white/[.02] ${n.readAt ? 'opacity-65' : ''}`}>
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${cls}`}><Icon className="h-5 w-5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{n.title}</span>
                          {n.body && <span className="mt-0.5 block text-sm muted">{n.body}</span>}
                          <span className="mt-1 block text-xs text-slate-400" title={dateTime(n.createdAt)}>{NOTIFICATION_CATEGORY[n.category]} · {timeAgo(n.createdAt)}</span>
                        </span>
                        {!n.readAt && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.totalElements} onChange={setPage} />}
      </div>
    </>
  )
}

