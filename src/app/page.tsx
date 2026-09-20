import { redirect } from 'next/navigation'

export default async function RootPage() {
  // Supabase가 설정된 후에는 세션 확인 후 /feed로 리다이렉트
  // 현재는 /login으로 바로 이동
  redirect('/login')
}
