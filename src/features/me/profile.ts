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

/** 링크 필드 (오류 문구의 {label} 은 me.fields.<field> 를 번역한 값) */
export type UrlField = 'github_url' | 'linkedin_url' | 'website_url'

/** 입력 오류: key 는 me.profileErrors.* 문구이고 나머지는 문구의 자리표시자 값이다 */
export type ProfileError =
  | { key: 'nameRequired' }
  | { key: 'nameTooLong' | 'companyTooLong' | 'positionTooLong' | 'bioTooLong'; max: number }
  | { key: 'urlTooLong' | 'urlHttps'; field: UrlField }
  | { key: 'urlHost'; field: UrlField; host: string }

export type ProfileValidation = { ok: true; value: ProfileValue } | { ok: false; errors: Partial<Record<ProfileField, ProfileError>> }

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
  const errors: Partial<Record<ProfileField, ProfileError>> = {}
  const L = PROFILE_LIMITS

  const name = input.name.trim()
  if (!name) errors.name = { key: 'nameRequired' }
  else if (name.length > L.name) errors.name = { key: 'nameTooLong', max: L.name }

  const company = input.company.trim()
  if (company.length > L.company) errors.company = { key: 'companyTooLong', max: L.company }
  const position = input.position.trim()
  if (position.length > L.position) errors.position = { key: 'positionTooLong', max: L.position }
  const bio = input.bio.trim()
  if (bio.length > L.bio) errors.bio = { key: 'bioTooLong', max: L.bio }

  const url = (field: UrlField, hosts?: readonly string[]): string | null => {
    const raw = input[field].trim()
    if (!raw) return null
    if (raw.length > L.url) {
      errors[field] = { key: 'urlTooLong', field }
      return null
    }
    const ok = normalizeUrl(raw, hosts)
    if (!ok) errors[field] = hosts ? { key: 'urlHost', field, host: hosts[0] } : { key: 'urlHttps', field }
    return ok
  }
  const github = url('github_url', ['github.com'])
  const linkedin = url('linkedin_url', ['linkedin.com'])
  const website = url('website_url')

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: { name, company: company || null, position: position || null, bio: bio || null, github_url: github, linkedin_url: linkedin, website_url: website },
  }
}
