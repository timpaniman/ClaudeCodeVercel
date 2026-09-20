import { Avatar } from '@/components/ui/Avatar'
import { CohortBadge } from '@/components/ui/CohortBadge'
import { normalizeUrl } from '@/features/me/profile'
import type { Member } from '../members'

const linkClass =
  'inline-flex items-center min-h-9 rounded-full bg-white/5 px-3 text-sm text-gray-200 hover:bg-white/10 underline-offset-4 hover:underline'

// Design Ref: §5.4 /directory — 아바타 · 이름 · 회사·직책 · 링크. 이메일은 표시하지 않는다.
export function MemberCard({ member, cohortNumber }: { member: Member; cohortNumber?: number | null }) {
  const org = [member.company, member.position].filter(Boolean).join(' · ')
  // 저장 시 검증을 우회해 들어온 값(javascript: 등)이 링크로 그려지지 않도록 렌더 직전에 다시 걸러낸다 (이 주소들은 다른 회원이 클릭한다)
  const safe = (raw: string | null | undefined) => (raw ? normalizeUrl(raw) : null)
  const links = [
    { href: safe(member.githubUrl), label: 'GitHub' },
    { href: safe(member.linkedinUrl), label: 'LinkedIn' },
    { href: safe(member.websiteUrl), label: '웹사이트' },
  ].filter((l): l is { href: string; label: string } => !!l.href)

  return (
    <li className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4" data-testid="member-card">
      <Avatar src={member.avatarUrl} name={member.name} size="lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-white break-words">{member.name}</h3>
          {cohortNumber != null && <CohortBadge cohortNumber={cohortNumber} size="sm" />}
        </div>
        {org && <p className="text-base text-gray-300 break-words">{org}</p>}
        {member.bio && <p className="text-sm leading-relaxed text-gray-400 line-clamp-3 break-words">{member.bio}</p>}
        {links.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1" aria-label={`${member.name} 링크`}>
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.href} target="_blank" rel="noopener noreferrer nofollow" className={linkClass}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}
