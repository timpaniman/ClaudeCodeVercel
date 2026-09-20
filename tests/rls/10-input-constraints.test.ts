// 008_input_constraints — 화면 검증을 우회해 PostgREST 로 직접 저장해도 DB 가 막는지 확인한다 (Check 단계 보안 검토 C1/H1/M1/M3 대응)
// 008 을 적용하지 않은 프로젝트에서는 이 파일의 테스트가 실패한다 (007 때와 같은 방식).
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { deleteAuthUserByEmail, getUserIds, looseService, passwordFor, serviceClient } from './helpers'
import { signedInClient } from './session'

let ids: Awaited<ReturnType<typeof getUserIds>>
const created: string[] = []

beforeAll(async () => {
  ids = await getUserIds()
})

afterAll(async () => {
  // 시험 중 바꾼 값을 원래대로 (service role 은 컬럼 권한·제약과 무관하게 복구)
  await looseService()
    .from('profiles')
    .update({ website_url: null, github_url: null, linkedin_url: null, bio: null, company: null })
    .eq('id', ids.student)
  await serviceClient().from('resources').delete().eq('title', 'RLS 제약 시험 자료')
  for (const email of created) await deleteAuthUserByEmail(email)
})

const CHECK_VIOLATION = '23514'

describe('profiles 링크·길이 제약 (직접 호출)', () => {
  test.each([
    ['javascript:', 'javascript:alert(document.domain)'],
    ['data:', 'data:text/html,<script>alert(1)</script>'],
    ['http (https 아님)', 'http://example.com'],
    ['공백 포함', 'https://example.com/a b'],
    ['300자 초과', 'https://example.com/' + 'a'.repeat(300)],
  ])('website_url 에 %s 주소를 저장할 수 없다', async (_name, value) => {
    const student = await signedInClient('student')
    const r = await student.from('profiles').update({ website_url: value }).eq('id', ids.student)
    expect(r.error?.code).toBe(CHECK_VIOLATION)
  })

  test('github_url·linkedin_url 도 같은 규칙', async () => {
    const student = await signedInClient('student')
    expect((await student.from('profiles').update({ github_url: 'javascript:1' }).eq('id', ids.student)).error?.code).toBe(CHECK_VIOLATION)
    expect((await student.from('profiles').update({ linkedin_url: 'ftp://x.com' }).eq('id', ids.student)).error?.code).toBe(CHECK_VIOLATION)
  })

  test('https 주소와 정상 길이는 저장된다', async () => {
    const student = await signedInClient('student')
    const r = await student
      .from('profiles')
      .update({ website_url: 'https://example.com/', github_url: 'https://github.com/x', bio: 'b'.repeat(500), company: 'c'.repeat(100) })
      .eq('id', ids.student)
    expect(r.error).toBeNull()
  })

  test('bio 501자·company 101자는 거부된다 (디렉토리 응답 크기 제한)', async () => {
    const student = await signedInClient('student')
    expect((await student.from('profiles').update({ bio: 'b'.repeat(501) }).eq('id', ids.student)).error?.code).toBe(CHECK_VIOLATION)
    expect((await student.from('profiles').update({ company: 'c'.repeat(101) }).eq('id', ids.student)).error?.code).toBe(CHECK_VIOLATION)
  })

  test('avatar_url 은 회원이 직접 바꿀 수 없다 (권한 없음)', async () => {
    const student = await signedInClient('student')
    const r = await student.from('profiles').update({ avatar_url: 'https://evil.example/a.png' }).eq('id', ids.student)
    expect(r.error?.code).toBe('42501')
  })
})

describe('resources.external_url 제약', () => {
  test('운영진이라도 https 가 아닌 외부 링크는 저장할 수 없다', async () => {
    const admin = await signedInClient('admin')
    for (const bad of ['javascript:alert(1)', 'http://example.com/v', 'https://exa mple.com']) {
      const r = await admin.from('resources').insert({ uploader_id: ids.admin, title: 'RLS 제약 시험 자료', category: 'lecture', external_url: bad })
      expect(r.error?.code).toBe(CHECK_VIOLATION)
    }
    const ok = await admin.from('resources').insert({ uploader_id: ids.admin, title: 'RLS 제약 시험 자료', category: 'lecture', external_url: 'https://youtu.be/dQw4w9WgXcQ' })
    expect(ok.error).toBeNull()
  })
})

describe('가입 트리거: 긴 이름', () => {
  test('가입 요청 메타데이터의 이름이 200자를 넘어도 가입은 성공하고 이름은 200자로 잘린다', async () => {
    const email = `rls-tmp-${Date.now()}-long@example.com`
    created.push(email)
    const { data, error } = await serviceClient().auth.admin.createUser({
      email,
      password: passwordFor(email),
      email_confirm: true,
      user_metadata: { name: '가'.repeat(500) },
    })
    expect(error).toBeNull()
    const { data: p } = await looseService().from('profiles').select('name, status').eq('id', data.user!.id).single()
    expect(p?.status).toBe('pending')
    expect(p?.name).toHaveLength(200)
  })
})
