// Design Ref: §8.6 — dev 시드. 매 실행마다 픽스처를 초기 상태로 되돌린다(멱등).
import type { TestProject } from 'vitest/node'
// ProvidedContext(tokens) 타입 확장은 session.ts 에 있다. globalSetup 은 vitest 를 런타임 import 할 수 없어
// session.ts 를 import 하지 않고, tsconfig 가 포함하는 파일로서의 타입 선언만 사용한다.
import {
  FIXED,
  STORAGE_PATHS,
  SUPABASE_URL,
  TEST_EMAIL_PATTERN,
  TEST_USERS,
  cohortIdByNumber,
  loginForToken,
  looseService,
  passwordFor,
  serviceClient,
  type TestUserKey,
} from './helpers'

export default async function setup(project: TestProject) {
  const svc = serviceClient()
  const host = new URL(SUPABASE_URL).host
  console.log(`[rls] 대상 프로젝트: ${host}`)

  // 1) 마이그레이션 적용 여부
  const probe = await svc.from('cohorts').select('id').limit(1)
  if (probe.error) {
    throw new Error(
      `cohorts 조회 실패(${probe.error.message}). supabase/README.md 대로 마이그레이션(npm run db:bundle)을 먼저 적용하세요.`,
    )
  }

  // 2) 안전장치: 실데이터가 있는 프로젝트(prod)에서 실행되는 것을 막는다
  const { count } = await svc.from('profiles').select('id', { count: 'exact', head: true })
  const { count: testCount } = await svc
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .like('email', 'rls-%@example.com')
  if ((count ?? 0) - (testCount ?? 0) > 20) {
    throw new Error('테스트 계정 외 프로필이 20개를 넘습니다. 운영 프로젝트로 보여 테스트를 중단합니다.')
  }

  // 3) 기수: 17기 재학, 12기 졸업
  const c17 = await cohortIdByNumber(17)
  const c12 = await cohortIdByNumber(12)
  await svc.from('cohorts').update({ is_active: true }).eq('id', c17)
  await svc.from('cohorts').update({ is_active: false }).eq('id', c12)

  // 4) 명단 (pending 사용자는 일부러 명단에 넣지 않는다)
  const rosterRows = (['admin', 'student', 'grad'] as TestUserKey[]).map((k) => ({
    email: TEST_USERS[k].email,
    name: TEST_USERS[k].name,
    cohort_id: TEST_USERS[k].cohort === 17 ? c17 : c12,
    role: TEST_USERS[k].role,
  }))
  const r = await svc.from('roster').upsert(rosterRows, { onConflict: 'email' })
  if (r.error) throw new Error(`roster upsert 실패: ${r.error.message}`)

  // 5) 계정 (가입 트리거가 profiles 를 만든다). 프로필 없는 잔존 계정은 지우고 다시 만든다.
  for (const key of Object.keys(TEST_USERS) as TestUserKey[]) {
    await ensureUser(key)
  }

  // 6) 프로필 상태 초기화
  const ids = await profileIds()
  const loose = looseService()
  const flags = { notify_new_resource: true, notify_announcement: true, company: null }
  const resets = [
    loose.from('profiles').update({ role: 'admin', status: 'active', cohort_id: c17, ...flags }).eq('id', ids.admin),
    loose.from('profiles').update({ role: 'member', status: 'active', cohort_id: c17, ...flags }).eq('id', ids.student),
    loose.from('profiles').update({ role: 'member', status: 'active', cohort_id: c12, ...flags }).eq('id', ids.grad),
    loose.from('profiles').update({ role: 'member', status: 'pending', cohort_id: null, ...flags }).eq('id', ids.pending),
  ]
  for (const res of await Promise.all(resets)) {
    if (res.error) throw new Error(`프로필 초기화 실패: ${res.error.message}`)
  }

  // 7) 픽스처 초기화
  const resIds = Object.values(FIXED.resource)
  const annIds = Object.values(FIXED.announcement)
  await svc.from('notification_jobs').delete().in('ref_id', [...resIds, ...annIds])
  await svc.from('activity_log').delete().in('user_id', Object.values(ids))
  await svc.from('announcement_reads').delete().in('user_id', Object.values(ids))
  await svc.from('resources').delete().in('id', resIds)
  await svc.from('announcements').delete().in('id', annIds)

  // 8) Storage 객체 (열람 권한 테스트용)
  for (const path of Object.values(STORAGE_PATHS)) {
    const up = await svc.storage.from('resources').upload(path, new Blob(['rls-test']), { upsert: true, contentType: 'text/plain' })
    if (up.error) throw new Error(`Storage 업로드 실패(${path}): ${up.error.message}. 005_rls.sql 의 버킷 생성을 확인하세요.`)
  }

  const uploader = ids.admin
  const base = { uploader_id: uploader, category: 'lecture' as const, tags: ['rls-test'] }
  const ins = await svc.from('resources').insert([
    { ...base, id: FIXED.resource.c17, cohort_id: c17, title: 'RLS 17기 자료', storage_path: STORAGE_PATHS.c17, is_published: true, published_at: new Date().toISOString() },
    { ...base, id: FIXED.resource.c12, cohort_id: c12, title: 'RLS 12기 자료', storage_path: STORAGE_PATHS.c12, is_published: true, published_at: new Date().toISOString() },
    { ...base, id: FIXED.resource.common, cohort_id: null, title: 'RLS 전체 공용 자료', external_url: 'https://example.com/common', is_published: true, published_at: new Date().toISOString() },
    { ...base, id: FIXED.resource.c12Draft, cohort_id: c12, title: 'RLS 12기 미공개 자료', external_url: 'https://example.com/draft', is_published: false },
  ])
  if (ins.error) throw new Error(`resources 시드 실패: ${ins.error.message}`)

  const hourAgo = new Date(Date.now() - 3600_000).toISOString()
  const annIns = await svc.from('announcements').insert([
    { id: FIXED.announcement.published, author_id: uploader, title: 'RLS 게시된 공지', body: '본문', is_pinned: true, published_at: hourAgo },
    // 일괄 insert 는 행마다 키가 다르면 빠진 키를 null 로 보내므로 NOT NULL 컬럼(is_pinned)을 명시한다
    { id: FIXED.announcement.draft, author_id: uploader, title: 'RLS 임시저장 공지', body: '본문', is_pinned: false, published_at: null },
  ])
  if (annIns.error) throw new Error(`announcements 시드 실패: ${annIns.error.message}`)

  // 9) 계정당 1번만 로그인해 토큰을 모든 테스트 파일에 공유한다 (session.ts 의 signedInClient)
  const tokens = {} as Record<TestUserKey, string>
  for (const key of Object.keys(TEST_USERS) as TestUserKey[]) tokens[key] = await loginForToken(key)
  project.provide('tokens', tokens)

  console.log('[rls] 시드 완료')
}

async function profileIds(): Promise<Record<TestUserKey, string>> {
  const svc = serviceClient()
  const { data, error } = await svc.from('profiles').select('id, email').like('email', 'rls-%@example.com')
  if (error) throw new Error(error.message)
  const out = {} as Record<TestUserKey, string>
  for (const key of Object.keys(TEST_USERS) as TestUserKey[]) {
    const row = data?.find((p) => p.email === TEST_USERS[key].email)
    if (!row) throw new Error(`${key} 프로필 생성 실패 — 가입 트리거(004_functions.sql)를 확인하세요.`)
    out[key] = row.id
  }
  return out
}

async function ensureUser(key: TestUserKey) {
  const svc = serviceClient()
  const { email, name } = TEST_USERS[key]
  if (!TEST_EMAIL_PATTERN.test(email)) throw new Error('테스트 이메일 패턴 오류')

  const find = async () => {
    const { data } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
    return data?.users.find((u) => u.email === email)
  }

  let existing = await find()
  if (existing) {
    const { data: prof } = await svc.from('profiles').select('id').eq('id', existing.id).maybeSingle()
    if (!prof) {
      await svc.auth.admin.deleteUser(existing.id)
      existing = undefined
    } else {
      await svc.auth.admin.updateUserById(existing.id, { password: passwordFor(email) })
      return
    }
  }

  const { error } = await svc.auth.admin.createUser({
    email,
    password: passwordFor(email),
    email_confirm: true,
    user_metadata: { name },
  })
  if (error) throw new Error(`${key} 계정 생성 실패: ${error.message}`)
}
