// Design Ref: §4.2 POST /api/resources/[id]/download — 열람 권한 확인 → 서명 URL(60초) → 다운로드 수·로그.
//   mode 'download'(기본): 첨부 다운로드용 URL, download_count +1 · 로그 (record_download RPC)
//   mode 'view'          : 미리보기용 URL(5분), 카운트하지 않는다
// 열람 권한은 RLS 가 판단한다(내가 볼 수 없는 자료는 조회 자체가 안 된다). 없는 자료와 권한 없는 자료는 같은 404 로 응답한다.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiError } from '@/lib/api/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { detectDevice } from '@/lib/device'
import { downloadFilename, withDownloadName } from '@/features/library/fileType'

const DOWNLOAD_URL_TTL = 60
const VIEW_URL_TTL = 300

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { supabase, user, profile } = await getSessionProfile()
  if (!user) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
  if (!profile || profile.status !== 'active') return apiError('FORBIDDEN', '열람 권한이 없습니다.', 403)

  if (!z.uuid().safeParse(params.id).success) return apiError('NOT_FOUND', '자료를 찾을 수 없습니다.', 404)

  let mode: 'download' | 'view' = 'download'
  try {
    const body = await request.json()
    if (body?.mode === 'view') mode = 'view'
  } catch {
    // 본문이 없으면 기본값(download)
  }

  const { data: r, error } = await supabase
    .from('resources')
    .select('id, title, storage_path, external_url, is_published')
    .eq('id', params.id)
    .maybeSingle()
  if (error) {
    console.error('[download] select', error)
    return apiError('INTERNAL', '일시적인 오류입니다. 잠시 후 다시 시도해 주세요.', 500)
  }
  // 미공개 자료는 운영진만 (RLS 가 이미 걸러 주지만 한 번 더 확인)
  if (!r || (!r.is_published && profile.role !== 'admin')) return apiError('NOT_FOUND', '자료를 찾을 수 없습니다.', 404)

  const countIt = mode === 'download' && r.is_published

  const record = async () => {
    if (!countIt) return null
    const { error: recErr } = await supabase.rpc('record_download', {
      p_resource: r.id,
      p_device: detectDevice(request.headers.get('user-agent')),
    })
    if (!recErr) return null
    if (recErr.code === '42501') return apiError('FORBIDDEN', '열람 권한이 없습니다.', 403)
    if (recErr.code === 'P0002') return apiError('NOT_FOUND', '자료를 찾을 수 없습니다.', 404)
    console.error('[download] record_download', recErr)
    return apiError('INTERNAL', '일시적인 오류입니다. 잠시 후 다시 시도해 주세요.', 500)
  }

  // 외부 링크 자료
  if (!r.storage_path) {
    if (!r.external_url) return apiError('NOT_FOUND', '자료를 찾을 수 없습니다.', 404)
    const failed = await record()
    if (failed) return failed
    return NextResponse.json({ url: r.external_url, external: true })
  }

  // 저장된 파일: 서명 URL 을 먼저 만들고(실패하면 카운트하지 않는다) 그다음 기록한다
  const ttl = mode === 'view' ? VIEW_URL_TTL : DOWNLOAD_URL_TTL
  // download 옵션을 쓰지 않는다: SDK 가 파일명을 이중 인코딩한다 (withDownloadName 참고)
  const { data: signed, error: signErr } = await supabase.storage.from('resources').createSignedUrl(r.storage_path, ttl)
  if (signErr || !signed) {
    console.error('[download] sign', signErr)
    return apiError('NOT_FOUND', '파일을 찾을 수 없습니다. 운영진에게 문의해 주세요.', 404)
  }

  const failed = await record()
  if (failed) return failed
  const url = mode === 'download' ? withDownloadName(signed.signedUrl, downloadFilename(r.title, r.storage_path)) : signed.signedUrl
  return NextResponse.json({ url, external: false, expiresIn: ttl })
}
