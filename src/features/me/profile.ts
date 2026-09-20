// Design Ref: §5.4 /me — 내 프로필 입력 검증 (순수 함수). DB 는 컬럼 권한으로 수정 가능한 컬럼만 허용한다 (005_rls.sql).
export const PROFILE_LIMITS = { name: 50, company: 100, position: 100, bio: 500, url: 300 } as const

export interface ProfileInput {
  name: string
  company: string
  position: string
  bio: string
  github_url: string
  linkedin_url: string
  website_url: string
}

export type ProfileField = keyof ProfileInput

export interface ProfileValue {
  name: string
  company: string | null
  position: string | null
  bio: string | null
  github_url: string | null
  linkedin_url: string | null
  website_url: string | null
}

export type ProfileValidation = { ok: true; value: ProfileValue } | { ok: false; errors: Partial<Record<ProfileField, string>> }

/** https 주소이고, hosts 를 지정하면 그 도메인(또는 하위 도메인)이어야 한다. 통과하면 정규화된 주소를 돌려준다 */
export function normalizeUrl(raw: string, hosts?: readonly string[]): string | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null
  if (hosts) {
    const host = url.hostname.toLowerCase()
    if (!hosts.some((h) => host === h || host.endsWith(`.${h}`))) return null
  }
  return url.toString()
}

export function validateProfile(input: ProfileInput): ProfileValidation {
  const errors: Partial<Record<ProfileField, string>> = {}
  const L = PROFILE_LIMITS

  const name = input.name.trim()
  if (!name) errors.name = '이름을 입력해 주세요.'
  else if (name.length > L.name) errors.name = `이름은 ${L.name}자 이내로 입력해 주세요.`

  const company = input.company.trim()
  if (company.length > L.company) errors.company = `회사는 ${L.company}자 이내로 입력해 주세요.`
  const position = input.position.trim()
  if (position.length > L.position) errors.position = `직책은 ${L.position}자 이내로 입력해 주세요.`
  const bio = input.bio.trim()
  if (bio.length > L.bio) errors.bio = `소개는 ${L.bio}자 이내로 입력해 주세요.`

  const url = (field: ProfileField, label: string, hosts?: readonly string[]): string | null => {
    const raw = input[field].trim()
    if (!raw) return null
    if (raw.length > L.url) {
      errors[field] = `${label} 주소가 너무 깁니다.`
      return null
    }
    const ok = normalizeUrl(raw, hosts)
    if (!ok) errors[field] = hosts ? `${label} 주소를 https://${hosts[0]}/… 형식으로 입력해 주세요.` : `${label} 주소는 https:// 로 시작해야 합니다.`
    return ok
  }
  const github = url('github_url', 'GitHub', ['github.com'])
  const linkedin = url('linkedin_url', 'LinkedIn', ['linkedin.com'])
  const website = url('website_url', '웹사이트')

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: { name, company: company || null, position: position || null, bio: bio || null, github_url: github, linkedin_url: linkedin, website_url: website },
  }
}
