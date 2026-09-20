// Design Ref: §5.4 /library/[id] — PDF·이미지 미리보기, 영상 임베드, 코드 보기+복사. (서버 컴포넌트)
import type { ServerClient } from '@/lib/auth/session'
import { MAX_TEXT_PREVIEW_BYTES, isTextPreviewable, parseVideoEmbed, resourceKind } from '../fileType'
import type { ResourceRow } from '../queries'
import { CopyButton } from './CopyButton'
import { SignedPreview } from './SignedPreview'

export async function ResourceViewer({ supabase, resource }: { supabase: ServerClient; resource: ResourceRow }) {
  const kind = resourceKind(resource)

  if (kind === 'video' && resource.external_url) {
    const embed = parseVideoEmbed(resource.external_url)
    if (!embed) return null // 임베드할 수 없는 주소는 "링크 열기" 버튼만 보여 준다
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        <iframe
          src={embed.embedUrl}
          title={resource.title}
          className="h-full w-full"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      </div>
    )
  }

  if ((kind === 'pdf' || kind === 'image') && resource.storage_path) {
    return <SignedPreview resourceId={resource.id} kind={kind} title={resource.title} />
  }

  if (kind === 'code' && resource.storage_path && isTextPreviewable(resource.storage_path, resource.file_size)) {
    const { data, error } = await supabase.storage.from('resources').download(resource.storage_path)
    if (error || !data) return null
    // React 가 텍스트를 이스케이프하므로 HTML/스크립트 파일이어도 실행되지 않는다
    const text = (await data.text()).slice(0, MAX_TEXT_PREVIEW_BYTES)
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <CopyButton text={text} />
        </div>
        <pre
          className="max-h-[70vh] overflow-auto rounded-2xl border border-white/10 bg-gray-900 p-4 text-sm leading-relaxed text-gray-100"
          data-testid="code-preview"
        >
          <code>{text}</code>
        </pre>
      </div>
    )
  }

  return null
}
