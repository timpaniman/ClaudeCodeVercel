'use client'

// Design Ref: §5.4 /admin/resources/new — 운영진 자료 등록·수정.
// 파일은 브라우저에서 Storage 로 직접 올린다(운영진 JWT, Storage RLS). 서버를 거치지 않아 대용량에도 서버 부하가 없다.
// v1 은 업로드 진행률 대신 "업로드 중" 표시를 쓴다 (supabase-js 기본 업로드는 진행 이벤트가 없다).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, MAX_WEEK, type Category } from '@/features/library/params'
import { buildStoragePath, formatFileSize, inferFileType, isSafeExternalUrl, MAX_UPLOAD_BYTES, UPLOAD_EXTENSIONS, validateUpload } from '@/features/library/fileType'
import { parseTags } from '@/features/library/tags'
import { noticeQuery, publishWithNotify } from '../publishClient'

export interface ResourceFormInitial {
  id: string
  title: string
  description: string
  category: Category
  cohortId: number | null
  weekNumber: number | null
  tags: string[]
  isPublished: boolean
  storagePath: string | null
  externalUrl: string | null
}

interface Props {
  mode: 'create' | 'edit'
  cohorts: { id: number; number: number }[]
  userId: string
  initial?: ResourceFormInitial
  /** 이메일 서비스가 설정되어 있어 알림을 보낼 수 있는가 */
  emailEnabled?: boolean
}

const field =
  'w-full min-h-12 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
const selectField = 'w-full min-h-12 bg-gray-900 border border-white/15 rounded-xl px-3 text-base text-white focus:outline-none focus:border-indigo-500'
const label = 'block text-sm font-medium text-gray-300 mb-2'

export function ResourceForm({ mode, cohorts, userId, initial, emailEnabled = false }: Props) {
  const t = useTranslations('admin.resourceForm')
  const tu = useTranslations('admin.upload')
  const tt = useTranslations('library.tagErrors')
  const tl = useTranslations('library')
  const tc = useTranslations('common')
  const router = useRouter()
  const isEdit = mode === 'edit'

  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'lecture')
  const [cohortId, setCohortId] = useState(initial?.cohortId ? String(initial.cohortId) : '')
  const [week, setWeek] = useState(initial?.weekNumber ? String(initial.weekNumber) : '')
  const [tagsText, setTagsText] = useState(initial?.tags.join(', ') ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [source, setSource] = useState<'file' | 'link'>(initial ? (initial.storagePath ? 'file' : 'link') : 'file')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [url, setUrl] = useState(initial?.externalUrl ?? '')
  const [publish, setPublish] = useState(false)
  const [notify, setNotify] = useState(false)
  const [busy, setBusy] = useState<'idle' | 'uploading' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)

  const cohortNumber = cohortId ? (cohorts.find((c) => String(c.id) === cohortId)?.number ?? null) : null
  const working = busy !== 'idle'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (working) return
    setError(null)

    const cleanTitle = title.trim()
    if (!cleanTitle) return setError(t('errTitle'))
    if (cleanTitle.length > 200) return setError(t('errTitleLong'))
    if (description.length > 5000) return setError(t('errDescriptionLong'))

    const parsedTags = parseTags(tagsText)
    if (parsedTags.error) {
      const e = parsedTags.error
      return setError(tt(e.key, { max: e.max, tag: 'tag' in e ? e.tag : '' }))
    }

    if (!isEdit || !initial?.storagePath) {
      if (source === 'file' && !isEdit) {
        if (!file) return setError(t('errNoFile'))
        const problem = validateUpload(file)
        if (problem) return setError(tu(problem.key, { extensions: 'extensions' in problem ? problem.extensions : '', max: 'max' in problem ? problem.max : 0 }))
      }
      if (source === 'link') {
        if (!isSafeExternalUrl(url.trim())) return setError(t('errLinkHttps'))
      }
    }

    const supabase = createClient()
    const common = {
      title: cleanTitle,
      description: description.trim() || null,
      category,
      cohort_id: cohortId ? Number(cohortId) : null,
      week_number: week ? Number(week) : null,
      tags: parsedTags.tags,
    }

    // ---- 수정 ----
    if (isEdit && initial) {
      setBusy('saving')
      const { error: upErr } = await supabase
        .from('resources')
        .update({ ...common, ...(initial.storagePath ? {} : { external_url: url.trim() }) })
        .eq('id', initial.id)
      if (upErr) {
        setBusy('idle')
        return setError(t('errSave'))
      }
      router.push('/admin/resources')
      router.refresh()
      return
    }

    // ---- 등록 ----
    const id = crypto.randomUUID()
    let storagePath: string | null = null

    if (source === 'file' && file) {
      setBusy('uploading')
      storagePath = buildStoragePath(cohortNumber, id, file.name)
      const { error: upErr } = await supabase.storage.from('resources').upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })
      if (upErr) {
        setBusy('idle')
        return setError(upErr.message.includes('exceeded') ? t('errFileTooBig') : t('errUpload'))
      }
    }

    setBusy('saving')
    const { error: insErr } = await supabase.from('resources').insert({
      id,
      uploader_id: userId,
      ...common,
      storage_path: storagePath,
      external_url: source === 'link' ? url.trim() : null,
      file_type: source === 'file' && file ? inferFileType(file.name) : null,
      file_size: source === 'file' && file ? file.size : null,
      is_published: false,
    })
    if (insErr) {
      // 행 저장에 실패하면 방금 올린 파일이 고아로 남지 않게 정리한다
      if (storagePath) await supabase.storage.from('resources').remove([storagePath])
      setBusy('idle')
      return setError(t('errSave'))
    }

    let query = ''
    if (publish) {
      const wantNotify = notify && emailEnabled
      let failed = false
      if (wantNotify) {
        // 공개 + 이메일 알림 (서버가 발송까지 처리한다)
        const r = await publishWithNotify('resource', id, true)
        failed = !r.ok
        if (r.ok) query = noticeQuery(r.notification)
      } else {
        const { error: pubErr } = await supabase.rpc('publish_resource', { p_id: id, p_notify: false })
        failed = !!pubErr
      }
      if (failed) {
        setBusy('idle')
        setError(t('errPublishAfterSave'))
        router.refresh()
        return
      }
    }
    router.push(`/admin/resources${query}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-6" data-testid="resource-form" noValidate>
      {error && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-base px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className={label}>{t('title')}</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required className={field} placeholder={t('titlePlaceholder')} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="category" className={label}>{t('category')}</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className={selectField}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{tl(`categories.${c}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cohort" className={label}>{t('cohort')}</label>
          <select id="cohort" value={cohortId} onChange={(e) => setCohortId(e.target.value)} className={selectField}>
            <option value="">{t('commonAll')}</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>{tc('cohort', { number: c.number })}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="week" className={label}>{t('week')} <span className="text-gray-500 font-normal">{t('optional')}</span></label>
          <select id="week" value={week} onChange={(e) => setWeek(e.target.value)} className={selectField}>
            <option value="">{t('none')}</option>
            {Array.from({ length: MAX_WEEK }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>{t('weekOption', { number: w })}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 자료 원본: 등록 시에만 선택. 수정에서는 파일을 바꾸지 않는다 */}
      {!isEdit && (
        <fieldset className="space-y-3">
          <legend className={label}>{t('source')}</legend>
          <div role="radiogroup" className="flex gap-2">
            {(['file', 'link'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={source === s}
                onClick={() => setSource(s)}
                className={`min-h-11 px-5 rounded-full text-base font-medium ${source === s ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
              >
                {s === 'file' ? t('sourceFile') : t('sourceLink')}
              </button>
            ))}
          </div>

          {source === 'file' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const dropped = e.dataTransfer.files?.[0]
                if (dropped) setFile(dropped)
              }}
              className={`space-y-2 rounded-2xl border-2 border-dashed p-4 transition-colors ${dragging ? 'border-indigo-400 bg-indigo-600/10' : 'border-white/15'}`}
            >
              <p className="text-base text-gray-300">{t('drop')}</p>
              <input
                type="file"
                data-testid="resource-file"
                accept={UPLOAD_EXTENSIONS.map((x) => `.${x}`).join(',')}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-base text-gray-300 file:mr-4 file:min-h-11 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-5 file:text-base file:font-semibold file:text-white hover:file:bg-indigo-500"
              />
              <p className="text-sm text-gray-500">
                {t('limits', { extensions: UPLOAD_EXTENSIONS.join(', '), max: MAX_UPLOAD_BYTES / 1024 / 1024 })}
              </p>
              {file && <p className="text-sm text-gray-300">{t('selectedFile', { name: file.name, size: formatFileSize(file.size) })}</p>}
            </div>
          ) : (
            <div>
              <label htmlFor="url" className="sr-only">{t('linkLabel')}</label>
              <input id="url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('linkPlaceholder')} className={field} />
              <p className="text-sm text-gray-500 mt-2">{t('linkNote')}</p>
            </div>
          )}
        </fieldset>
      )}

      {isEdit && initial && !initial.storagePath && (
        <div>
          <label htmlFor="url" className={label}>{t('linkLabel')}</label>
          <input id="url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} className={field} />
        </div>
      )}
      {isEdit && initial?.storagePath && (
        <p className="text-sm text-gray-500">{t('fileLocked')}</p>
      )}

      <div>
        <label htmlFor="tags" className={label}>{t('tags')} <span className="text-gray-500 font-normal">{t('tagsHint')}</span></label>
        <input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder={t('tagsPlaceholder')} className={field} />
      </div>

      <div>
        <label htmlFor="description" className={label}>{t('description')} <span className="text-gray-500 font-normal">{t('optional')}</span></label>
        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={5000} className={`${field} resize-y`} />
      </div>

      {!isEdit && (
        <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <legend className="px-1 text-sm font-medium text-gray-300">{t('publishing')}</legend>
          <label className="flex items-center gap-3 min-h-11 text-base text-gray-200 cursor-pointer">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="h-5 w-5 accent-indigo-500" />
            {t('publishNow')}
          </label>
          <label className={`flex items-center gap-3 min-h-11 text-base ${emailEnabled && publish ? 'text-gray-200 cursor-pointer' : 'text-gray-500'}`}>
            <input
              type="checkbox"
              data-testid="notify-checkbox"
              checked={notify && publish && emailEnabled}
              disabled={!emailEnabled || !publish}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-5 w-5 accent-indigo-500"
            />
            {t('notify')}
            {!emailEnabled ? t('notifyNoEmail') : !publish ? t('notifyNeedPublish') : ''}
          </label>
          <p className="text-sm text-gray-500">{t('publishNote')}</p>
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={working}
          className="inline-flex items-center justify-center gap-2 min-h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-base font-semibold"
        >
          {working && <Loader2 size={18} className="animate-spin" aria-hidden />}
          {busy === 'uploading' ? t('uploading') : busy === 'saving' ? t('saving') : isEdit ? t('submitSave') : t('submitCreate')}
        </button>
        <button type="button" onClick={() => router.push('/admin/resources')} disabled={working} className="min-h-12 px-4 text-base text-gray-400 hover:text-white disabled:opacity-50">
          {t('cancel')}
        </button>
      </div>
      {busy === 'uploading' && <p role="status" className="text-sm text-gray-400">{t('uploadWait')}</p>}
    </form>
  )
}
