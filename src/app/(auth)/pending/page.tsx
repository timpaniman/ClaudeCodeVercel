import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth/session'
import { PendingForm } from '@/features/auth/components/PendingForm'

export default async function PendingPage() {
  const { profile } = await getSessionProfile()
  if (!profile) redirect('/login')
  if (profile.status === 'active') redirect('/home')

  const rejected = profile.status === 'rejected'

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-xl mx-auto mb-4">
            AI
          </div>
          <h1 className="text-2xl font-bold text-white">{rejected ? '승인되지 않았습니다' : '승인 대기 중입니다'}</h1>
          <p className="text-gray-400 text-base mt-2 break-all">{profile.email}</p>
        </div>

        {rejected ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-base text-gray-300 leading-relaxed">
            가입 신청이 승인되지 않았습니다. 잘못된 결정이라고 생각하시면 운영진에게 문의해 주세요.
          </div>
        ) : (
          <>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-base text-gray-300 leading-relaxed">
              이 이메일은 졸업생 명단에서 확인되지 않았습니다. 아래 정보를 남겨 주시면 운영진이 확인한 뒤 승인합니다.
              승인되면 다음 접속부터 바로 이용하실 수 있습니다.
            </div>
            <PendingForm
              initial={{
                name: profile.name,
                requestedCohort: profile.requested_cohort,
                company: profile.company ?? '',
              }}
            />
          </>
        )}

        <form action="/auth/signout" method="post" className="text-center">
          <button type="submit" className="min-h-11 px-4 text-sm text-gray-400 hover:text-white underline underline-offset-4">
            다른 이메일로 로그인
          </button>
        </form>
      </div>
    </div>
  )
}
