import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { z } from 'zod'
import { CohortBadge } from '@/components/ui/CohortBadge'
import { getSessionProfile } from '@/lib/auth/session'
import { detectDevice } from '@/lib/device'
import { formatDate } from '@/lib/utils'
import { DownloadButton, ExternalLinkButton } from '@/features/library/components/DownloadButton'
import { FileTypeIcon } from '@/features/library/components/FileTypeIcon'
import { ResourceViewer } from '@/features/library/components/ResourceViewer'
import { formatFileSize, resourceKind } from '@/features/library/fileType'
import { CATEGORY_LABEL } from '@/features/library/params'
import { getResource } from '@/features/library/queries'

export default async function ResourceDetailPage({ params }: { params: { id: string } }) {
  if (!z.uuid().safeParse(params.id).success) notFound()

  const { supabase, profile } = await getSessionProfile()
  // RLS 가 열람 권한을 판단한다. 없는 자료와 권한 없는 자료는 같은 404 로 처리한다.
  const resource = await getResource(supabase, params.id)
  if (!resource) notFound()

  let cohortNumber: number | null = null
  if (resource.cohort_id !== null) {
    const { data } = await supabase.from('cohorts').select('number').eq('id', resource.cohort_id).maybeSingle()
    cohortNumber = data?.number ?? null
  }

  // 열람 기록 (통계용). 실패해도 화면은 그대로 보여 준다.
  if (resource.is_published) {
    try {
      await supabase.rpc('log_activity', {
        p_event: 'view_resource',
        p_ref: resource.id,
        p_device: detectDevice(headers().get('user-agent')),
      })
    } catch {
      /* 무시 */
    }
  }

  const kind = resourceKind(resource)
  const isAdmin = profile?.role === 'admin'
  const date = resource.published_at ?? resource.created_at

  return (
    <article className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Link href="/library" className="inline-flex items-center gap-2 min-h-11 text-base text-gray-400 hover:text-white">
        <ArrowLeft size={18} aria-hidden /> 자료 목록
      </Link>

      {!resource.is_published && (
        <div role="status" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-base text-amber-200">
          아직 공개되지 않은 자료입니다. 운영진에게만 보입니다.
        </div>
      )}

      <header className="flex gap-4">
        <FileTypeIcon kind={kind} size="lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-2xl font-bold text-white leading-snug break-words">{resource.title}</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-gray-400">
            {cohortNumber !== null ? (
              <CohortBadge cohortNumber={cohortNumber} size="md" />
            ) : (
              <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-gray-200">공용</span>
            )}
            <span>{CATEGORY_LABEL[resource.category]}</span>
            {resource.week_number !== null && <span>· {resource.week_number}주차</span>}
            <span>· {formatDate(date)}</span>
            <span>· 다운로드 {resource.download_count}회</span>
            {resource.file_size !== null && <span>· {formatFileSize(resource.file_size)}</span>}
          </div>
        </div>
      </header>

      {resource.tags.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="태그">
          {resource.tags.map((t) => (
            <li key={t}>
              <Link href={`/library?q=${encodeURIComponent(t)}`} className="inline-flex items-center min-h-9 rounded-full bg-white/5 px-3 text-sm text-gray-300 hover:bg-white/10">
                #{t}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {resource.description && <p className="text-base leading-relaxed text-gray-200 whitespace-pre-wrap break-words">{resource.description}</p>}

      <ResourceViewer supabase={supabase} resource={resource} />

      <div className="flex flex-wrap items-start gap-3">
        {resource.storage_path ? (
          <DownloadButton resourceId={resource.id} />
        ) : resource.external_url ? (
          <ExternalLinkButton resourceId={resource.id} url={resource.external_url} />
        ) : null}

        {isAdmin && (
          <Link
            href={`/admin/resources/${resource.id}/edit`}
            className="inline-flex items-center gap-2 min-h-12 px-5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-base font-medium text-gray-100"
          >
            <Pencil size={16} aria-hidden /> 수정
          </Link>
        )}
      </div>
    </article>
  )
}
