// 개발 전용: dev 프로젝트의 RLS 테스트 계정으로 로그인한 세션을 브라우저 쿠키 형식으로 만든다.
// 메일 코드를 받을 수 없는 테스트 계정(example.com)으로 화면을 확인할 때 쓴다. 운영 프로젝트에서는 쓰지 않는다.
//
//   npx tsx scripts/dev-session.ts <admin|student|grad|pending> [출력파일]
//
// 출력 파일(JSON)에는 브라우저에 넣을 쿠키 목록이 들어간다. 토큰은 화면에 출력하지 않는다.
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SUPABASE_URL, TEST_USERS, anonClient, passwordFor, type TestUserKey } from '../tests/rls/helpers'

// @supabase/ssr 0.10 의 쿠키 규칙: 이름 sb-<프로젝트ref>-auth-token, 값 "base64-" + base64url(JSON), 3180자 단위 분할(.0, .1 …)
const MAX_CHUNK = 3180

async function main() {
  const key = process.argv[2] as TestUserKey
  if (!key || !(key in TEST_USERS)) {
    console.error('사용법: npx tsx scripts/dev-session.ts <admin|student|grad|pending> [출력파일]')
    process.exit(1)
  }
  const out = process.argv[3] ?? join(tmpdir(), `dev-session-${key}.json`)

  const { email } = TEST_USERS[key]
  const { data, error } = await anonClient().auth.signInWithPassword({ email, password: passwordFor(email) })
  if (error || !data.session) throw new Error(`로그인 실패: ${error?.message}`)

  const ref = new URL(SUPABASE_URL).hostname.split('.')[0]
  const name = `sb-${ref}-auth-token`
  const value = 'base64-' + Buffer.from(JSON.stringify(data.session), 'utf8').toString('base64url')

  const cookies =
    value.length <= MAX_CHUNK
      ? [{ name, value }]
      : Array.from({ length: Math.ceil(value.length / MAX_CHUNK) }, (_, i) => ({
          name: `${name}.${i}`,
          value: value.slice(i * MAX_CHUNK, (i + 1) * MAX_CHUNK),
        }))

  writeFileSync(out, JSON.stringify({ email, expiresAt: data.session.expires_at, cookies }))
  console.log(`[dev-session] ${key} (${email}) 쿠키 ${cookies.length}개 → ${out}`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
