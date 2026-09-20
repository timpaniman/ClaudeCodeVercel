import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { AdminNav } from '@/features/admin/components/AdminNav'
import { getSessionProfile } from '@/lib/auth/session'

// 접근 제어의 기준은 middleware(비운영진은 /home 으로) + RLS. 여기서는 렌더링 직전에 한 번 더 확인한다.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await getSessionProfile()
  if (!profile || profile.status !== 'active' || profile.role !== 'admin') redirect('/home')

  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending')

  return (
    <AppShell>
      <AdminNav pendingCount={count ?? 0} />
      {children}
    </AppShell>
  )
}
