import { useRef, useState } from 'react'
import { Download, FileText, Paperclip, Trash2, UploadCloud } from 'lucide-react'
import { opsApi } from '../api'
import { download, errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { Badge, ConfirmDialog, EmptyState, Select, Skeleton, Spinner } from './ui'
import { DOC_CATEGORY } from '../utils/labels'
import { dateTime } from '../utils/format'

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.xlsx,.docx,.xml'

/** Documentos del registro (contratos, comprobantes, evidencias). El backend valida tipo por firma y permisos. */
export default function DocumentsPanel({ ownerType, ownerId, defaultCategory = 'OTHER' }) {
  const { can } = useAuth()
  const toast = useToast()
  const input = useRef(null)
  const [category, setCategory] = useState(defaultCategory)
  const [busy, setBusy] = useState(false)
  const [remove, setRemove] = useState(null)
  const { data, loading, reload } = useAsync(() => opsApi.documents(ownerType, ownerId), [ownerType, ownerId])
  const upload = async (files) => {
    if (!files?.length) return
    setBusy(true)
    for (const file of files) {
      const form = new FormData()
      form.append('ownerType', ownerType)
      form.append('ownerId', ownerId)
      form.append('category', category)
      form.append('file', file)
      try { await opsApi.upload(form); toast.success(`${file.name} adjuntado`) } catch (e) { toast.error(`${file.name}: ${errorMessage(e)}`) }
    }
    setBusy(false)
    if (input.current) input.current.value = ''
    reload()
  }
  const kb = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`)
  return (
    <div className="space-y-4">
      {can('documents.upload') && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-5 dark:border-white/10 sm:flex-row sm:items-center"
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files) }}>
          <UploadCloud className="h-8 w-8 text-brand-500" />
          <div className="flex-1"><p className="text-sm font-semibold">Arrastra archivos o selecciónalos</p><p className="text-xs muted">PDF, imágenes, Excel, Word o XML (CFDI) · máx. 10 MB</p></div>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} wrapClass="sm:w-44" aria-label="Categoría">{Object.entries(DOC_CATEGORY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <button className="btn-primary" onClick={() => input.current?.click()} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}Adjuntar</button>
          <input ref={input} type="file" multiple hidden accept={ACCEPT} onChange={(e) => upload(e.target.files)} />
        </div>
      )}
      {loading ? <Skeleton className="h-20" /> : !data?.length ? <EmptyState icon={FileText} title="Sin documentos" description="Adjunta contratos, comprobantes o evidencias." compact /> : (
        <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200/70 dark:divide-white/[.06] dark:ring-white/[.07]">
          {data.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><FileText className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.title}</p>
                <p className="text-xs muted"><Badge>{DOC_CATEGORY[d.category]}</Badge> · {kb(d.sizeBytes)} · {d.uploadedBy} · {dateTime(d.createdAt)}</p>
              </div>
              {can('documents.read') && <button className="btn-ghost btn-sm h-8 w-8 px-0" onClick={() => download(`/documents/${d.id}/download`, null, d.originalName).catch((e) => toast.error(errorMessage(e)))} aria-label="Descargar"><Download className="h-4 w-4" /></button>}
              {can('documents.delete') && <button className="btn-ghost btn-sm h-8 w-8 px-0 text-rose-500" onClick={() => setRemove(d)} aria-label="Retirar"><Trash2 className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!remove} title="Retirar documento" tone="danger" confirmLabel="Retirar" message={`«${remove?.title}» dejará de mostrarse. Queda registro en la auditoría.`}
        onClose={() => setRemove(null)} onConfirm={async () => { try { await opsApi.deleteDocument(remove.id); toast.success('Documento retirado'); setRemove(null); reload() } catch (e) { toast.error(errorMessage(e)) } }} />
    </div>
  )
}

