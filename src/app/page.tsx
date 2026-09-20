import { redirect } from 'next/navigation'

export default async function RootPage() {
  // 로그인 여부·상태에 따른 이동은 middleware(routeGuard)가 처리한다: 비로그인 → /login, 활성 회원 → /home
  redirect('/login')
}
