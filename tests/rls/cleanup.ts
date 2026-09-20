// dev 프로젝트의 RLS 테스트 계정·자료·명단·Storage 객체를 삭제한다.
// 사용: npm run test:rls:cleanup   (supabase/dev-reset.sql 실행 전에 먼저 실행)
import { FIXED, STORAGE_PATHS, SUPABASE_URL, TEST_EMAIL_PATTERN, serviceClient } from './helpers'

async function main() {
  const svc = serviceClient()
  console.log(`[rls-cleanup] 대상 프로젝트: ${new URL(SUPABASE_URL).host}`)

  const { data } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const users = (data?.users ?? []).filter((u) => u.email && TEST_EMAIL_PATTERN.test(u.email))
  const ids = users.map((u) => u.id)
  const emails = users.map((u) => u.email as string)

  if (ids.length) {
    // resources.uploader_id / announcements.author_id 는 cascade 가 아니므로 먼저 지운다
    await svc.from('notification_jobs').delete().in('ref_id', [...Object.values(FIXED.resource), ...Object.values(FIXED.announcement)])
    await svc.from('resources').delete().in('uploader_id', ids)
    await svc.from('announcements').delete().in('author_id', ids)
  }
  await svc.from('roster').delete().like('email', 'rls-%@example.com')
  await svc.storage.from('resources').remove(Object.values(STORAGE_PATHS))

  for (const u of users) {
    const { error } = await svc.auth.admin.deleteUser(u.id)
    if (error) console.warn(`  ! ${u.email} 삭제 실패: ${error.message}`)
  }
  console.log(`[rls-cleanup] 계정 ${users.length}개, 명단/자료/객체 정리 완료`, emails)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
