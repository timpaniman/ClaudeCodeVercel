'use client'

// Design Ref: §5.4 /admin/resources/new — 운영진 자료 등록·수정.
// 파일은 브라우저에서 Storage 로 직접 올린다(운영진 JWT, Storage RLS). 서버를 거치지 않아 대용량에도 서버 부하가 없다.
// v1 은 업로드 진행률 대신 "업로드 중" 표시를 쓴다 (supabase-js 기본 업로드는 진행 이벤트가 없다).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, CATEGORY_LABEL, MAX_WEEK, type Category } from '@/features/library/params'
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
    if (!cleanTitle) return setError('제목을 입력해 주세요.')
    if (cleanTitle.length > 200) return setError('제목은 200자 이내로 입력해 주세요.')
    if (description.length > 5000) return setError('설명은 5,000자 이내로 입력해 주세요.')

    const parsedTags = parseTags(tagsText)
    if (parsedTags.error) return setError(parsedTags.error)

    if (!isEdit || !initial?.storagePath) {
      if (source === 'file' && !isEdit) {
        if (!file) return setError('올릴 파일을 선택해 주세요.')
        const problem = validateUpload(file)
        if (problem) return setError(problem)
      }
      if (source === 'link') {
        if (!isSafeExternalUrl(url.trim())) return setError('링크는 https:// 로 시작하는 주소만 등록할 수 있습니다.')
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
        return setError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
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
        return setError(upErr.message.includes('exceeded') ? '파일이 허용 크기를 넘습니다.' : '파일을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.')
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
      return setError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
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
        setError('자료는 저장됐지만 공개하지 못했습니다. 목록에서 "공개"를 눌러 주세요.')
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
        <label htmlFor="title" className={label}>제목</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required className={field} placeholder="예: 12기 3주차 RAG 강의노트" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="category" className={label}>카테고리</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className={selectField}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cohort" className={label}>기수</label>
          <select id="cohort" value={cohortId} onChange={(e) => setCohortId(e.target.value)} className={selectField}>
            <option value="">공용 (전체 기수)</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>{c.number}기</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="week" className={label}>주차 <span className="text-gray-500 font-normal">(선택)</span></label>
          <select id="week" value={week} onChange={(e) => setWeek(e.target.value)} className={selectField}>
            <option value="">없음</option>
            {Array.from({ length: MAX_WEEK }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>{w}주차</option>
            ))}
          </select>
        </div>
      </div>

      {/* 자료 원본: 등록 시에만 선택. 수정에서는 파일을 바꾸지 않는다 */}
      {!isEdit && (
        <fieldset className="space-y-3">
          <legend className={label}>자료 원본</legend>
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
                {s === 'file' ? '파일 올리기' : '외부 링크'}
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
              <p className="text-base text-gray-300">파일을 여기로 끌어오거나 아래에서 선택하세요.</p>
              <input
                type="file"
                data-testid="resource-file"
                accept={UPLOAD_EXTENSIONS.map((x) => `.${x}`).join(',')}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-base text-gray-300 file:mr-4 file:min-h-11 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-5 file:text-base file:font-semibold file:text-white hover:file:bg-indigo-500"
              />
              <p className="text-sm text-gray-500">
                {UPLOAD_EXTENSIONS.join(', ')} · 최대 {MAX_UPLOAD_BYTES / 1024 / 1024}MB. 큰 영상은 외부 링크(YouTube 비공개 등)로 등록해 주세요.
              </p>
              {file && <p className="text-sm text-gray-300">선택한 파일: {file.name} ({formatFileSize(file.size)})</p>}
            </div>
          ) : (
            <div>
              <label htmlFor="url" className="sr-only">외부 링크 주소</label>
              <input id="url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtu.be/…" className={field} />
              <p className="text-sm text-gray-500 mt-2">https:// 주소만 등록할 수 있습니다. YouTube·Vimeo 는 화면에서 바로 재생됩니다.</p>
            </div>
          )}
        </fieldset>
      )}

      {isEdit && initial && !initial.storagePath && (
        <div>
          <label htmlFor="url" className={label}>외부 링크 주소</label>
          <input id="url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} className={field} />
        </div>
      )}
      {isEdit && initial?.storagePath && (
        <p className="text-sm text-gray-500">저장된 파일은 수정 화면에서 바꿀 수 없습니다. 파일을 바꾸려면 새 자료로 등록하고 기존 자료를 삭제해 주세요.</p>
      )}

      <div>
        <label htmlFor="tags" className={label}>태그 <span className="text-gray-500 font-normal">(쉼표로 구분, 선택)</span></label>
        <input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="예: RAG, 프롬프트, 실습" className={field} />
      </div>

      <div>
        <label htmlFor="description" className={label}>설명 <span className="text-gray-500 font-normal">(선택)</span></label>
        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={5000} className={`${field} resize-y`} />
      </div>

      {!isEdit && (
        <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <legend className="px-1 text-sm font-medium text-gray-300">공개 설정</legend>
          <label className="flex items-center gap-3 min-h-11 text-base text-gray-200 cursor-pointer">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="h-5 w-5 accent-indigo-500" />
            저장하고 바로 공개
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
            이메일 알림 발송
            {!emailEnabled ? ' (이메일 서비스 설정 전)' : !publish ? ' (바로 공개를 선택하면 사용할 수 있습니다)' : ''}
          </label>
          <p className="text-sm text-gray-500">공개하지 않고 저장하면 운영진에게만 보입니다. 목록에서 검수한 뒤 공개할 수 있습니다.</p>
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={working}
          className="inline-flex items-center justify-center gap-2 min-h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-base font-semibold"
        >
          {working && <Loader2 size={18} className="animate-spin" aria-hidden />}
          {busy === 'uploading' ? '파일 올리는 중…' : busy === 'saving' ? '저장 중…' : isEdit ? '저장' : '등록'}
        </button>
        <button type="button" onClick={() => router.push('/admin/resources')} disabled={working} className="min-h-12 px-4 text-base text-gray-400 hover:text-white disabled:opacity-50">
          취소
        </button>
      </div>
      {busy === 'uploading' && <p role="status" className="text-sm text-gray-400">파일 크기에 따라 시간이 걸릴 수 있습니다. 창을 닫지 말고 기다려 주세요.</p>}
    </form>
  )
}
