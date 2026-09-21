-- ============================================================
-- AI4CEO 졸업생 포털 v1 — 009_profile_locale
-- Plan: docs/01-plan/features/portal-i18n-en.plan.md — 알림 메일을 수신자가 쓰는 언어(en/ko)로 보낸다.
--
--   1) profiles.locale: 기본 'en'. 회원이 화면에서 언어를 바꾸면 클라이언트가 함께 저장한다.
--   2) notification_recipients() 가 locale 도 돌려준다 (service role 전용, 반환 형식이 바뀌므로 지우고 다시 만든다).
-- 여러 번 실행해도 안전하다.
-- ============================================================

alter table public.profiles add column if not exists locale text not null default 'en';

alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles add constraint profiles_locale_check check (locale in ('en', 'ko'));

-- 회원이 자기 언어 설정만 바꿀 수 있다 (다른 컬럼 권한은 005 그대로)
grant update (locale) on public.profiles to authenticated;

-- 알림 수신자: 활성 + 수신 동의 + 열람 권한 있음 + 아직 발송 안 됨 (+ 언어)
drop function if exists public.notification_recipients(text, uuid);
create function public.notification_recipients(p_kind text, p_ref uuid)
returns table (user_id uuid, email text, name text, locale text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.email, p.name, p.locale
    from public.profiles p
   where p.status = 'active'
     and case p_kind when 'resource' then p.notify_new_resource else p.notify_announcement end
     and case p_kind
           when 'resource' then exists (
             select 1 from public.resources r
              where r.id = p_ref and r.is_published
                and public.can_user_view_cohort(p.id, r.cohort_id))
           else exists (
             select 1 from public.announcements a
              where a.id = p_ref and a.published_at is not null)
         end
     and not exists (
       select 1
         from public.notification_deliveries d
         join public.notification_jobs j on j.id = d.job_id
        where j.kind = p_kind and j.ref_id = p_ref
          and d.user_id = p.id and d.status = 'sent');
$$;

-- 함수를 다시 만들면 권한이 기본값(누구나 실행)으로 돌아가므로 005 와 같게 service role 전용으로 되돌린다
revoke all on function public.notification_recipients(text, uuid) from public, anon, authenticated;
grant execute on function public.notification_recipients(text, uuid) to service_role;
