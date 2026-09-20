-- ============================================================
-- AI4CEO 졸업생 포털 v1 — 005_rls
-- Design Ref: §7.1 (RLS 정책), §7.2 (권한 매트릭스)
--
-- 원칙
--   1) anon 은 아무것도 못 한다.
--   2) authenticated 는 아래에서 명시적으로 부여한 권한만 가진다 (최소 권한).
--   3) 행 단위 규칙은 RLS, 컬럼 단위 규칙은 GRANT 로 이중 방어한다.
--   4) notification_jobs / notification_deliveries 는 service role 전용 (권한·정책 없음).
--
-- 기존 002_rls_policies.sql(폐기) 대비 수정한 결함
--   - profiles_update 가 컬럼 제한 없이 본인 행 전체 수정 허용 → role='admin' 상승 가능
--   - resources / profiles SELECT 가 모든 로그인 사용자에게 개방
-- ============================================================

-- ------------------------------------------------------------
-- 1) 기본 권한 회수 — **v1 객체만** 대상으로 한다.
--    이 프로젝트(dev)는 다른 앱(Python RAG: sessions, documents, messages, match_documents)과
--    공유되므로 `on all tables/functions in schema public` 이나 `alter default privileges` 로
--    스키마 전체를 건드리면 안 된다. 앞으로 만드는 v1 테이블은 각 마이그레이션에서
--    명시적으로 revoke/grant 한다 (Supabase 기본값은 anon/authenticated 에게 전체 권한을 준다).
-- ------------------------------------------------------------
revoke all on table
  public.cohorts, public.profiles, public.roster, public.resources,
  public.announcements, public.announcement_reads, public.activity_log,
  public.notification_jobs, public.notification_deliveries
from anon, authenticated;

revoke all on sequence public.cohorts_id_seq, public.activity_log_id_seq from anon, authenticated;

revoke all on function
  public.can_user_view_cohort(uuid, int),
  public.is_active_member(),
  public.is_admin(),
  public.can_view_cohort(int),
  public.handle_new_user(),
  public.resources_before_write(),
  public.set_updated_at(),
  public.admin_import_roster(jsonb),
  public.admin_set_member_status(uuid, public.member_status, int),
  public.publish_resource(uuid, boolean),
  public.publish_announcement(uuid, boolean),
  public.record_download(uuid, text),
  public.log_activity(text, uuid, text),
  public.directory_members(int),
  public.admin_stats(),
  public.notification_recipients(text, uuid)
from public, anon, authenticated;

-- ------------------------------------------------------------
-- 2) RLS 활성화
-- ------------------------------------------------------------
alter table public.cohorts                 enable row level security;
alter table public.profiles                enable row level security;
alter table public.roster                  enable row level security;
alter table public.resources               enable row level security;
alter table public.announcements           enable row level security;
alter table public.announcement_reads      enable row level security;
alter table public.activity_log            enable row level security;
alter table public.notification_jobs       enable row level security;  -- 정책 없음 = service role 전용
alter table public.notification_deliveries enable row level security;  -- 정책 없음 = service role 전용

-- ------------------------------------------------------------
-- 3) 테이블 권한 (RLS가 행을 다시 거른다)
-- ------------------------------------------------------------
grant select, insert, update, delete on public.cohorts             to authenticated;
grant usage, select on sequence public.cohorts_id_seq              to authenticated;

grant select on public.profiles to authenticated;
-- role / status / cohort_id / email 은 수정 불가. 변경은 RPC(admin_set_member_status 등)로만.
grant update (name, company, "position", bio, avatar_url, github_url, linkedin_url,
              website_url, notify_new_resource, notify_announcement, consented_at,
              requested_cohort)
  on public.profiles to authenticated;

grant select, insert, update, delete on public.roster              to authenticated;
grant select, insert, update, delete on public.resources           to authenticated;
grant select, insert, update, delete on public.announcements       to authenticated;
grant select, insert, update         on public.announcement_reads  to authenticated;
grant select                         on public.activity_log        to authenticated;

-- ------------------------------------------------------------
-- 4) 정책
-- ------------------------------------------------------------

-- profiles: 본인 + 운영진만 직접 조회. 다른 회원은 directory_members() RPC (이메일 제외)
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- cohorts: 활성 회원 조회 / 운영진 관리
create policy cohorts_select_member on public.cohorts
  for select to authenticated
  using (public.is_active_member());

create policy cohorts_admin on public.cohorts
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- roster: 운영진 전용
create policy roster_admin on public.roster
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- resources: 공개 + 기수 권한(can_view_cohort) / 운영진은 미공개 포함 전체
create policy resources_select_member on public.resources
  for select to authenticated
  using (is_published and public.can_view_cohort(cohort_id));

create policy resources_admin on public.resources
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- announcements: 게시된 것만 활성 회원 / 운영진 전체
create policy announcements_select_member on public.announcements
  for select to authenticated
  using (public.is_active_member() and published_at is not null and published_at <= now());

create policy announcements_admin on public.announcements
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- announcement_reads: 본인 것만
create policy announcement_reads_own on public.announcement_reads
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_active_member());

-- activity_log: 운영진 조회만 (기록은 log_activity / record_download RPC)
create policy activity_log_admin_select on public.activity_log
  for select to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------
-- 5) 함수 실행 권한 (기본은 아무에게도 없음)
-- ------------------------------------------------------------
grant execute on function public.is_active_member()                                   to authenticated;
grant execute on function public.is_admin()                                           to authenticated;
grant execute on function public.can_view_cohort(int)                                 to authenticated;
grant execute on function public.admin_import_roster(jsonb)                           to authenticated;
grant execute on function public.admin_set_member_status(uuid, public.member_status, int) to authenticated;
grant execute on function public.publish_resource(uuid, boolean)                      to authenticated;
grant execute on function public.publish_announcement(uuid, boolean)                  to authenticated;
grant execute on function public.record_download(uuid, text)                          to authenticated;
grant execute on function public.log_activity(text, uuid, text)                       to authenticated;
grant execute on function public.directory_members(int)                               to authenticated;
grant execute on function public.admin_stats()                                        to authenticated;

-- service role 전용
grant execute on function public.notification_recipients(text, uuid)                 to service_role;
grant execute on function public.can_user_view_cohort(uuid, int)                      to service_role;

-- ------------------------------------------------------------
-- 6) Storage: private 버킷 `resources`
--    경로 규칙: {cohort_number|common}/{resource_uuid}/{파일명}
--    읽기: 운영진 또는 (공개 + 기수 열람 권한이 있는 자료) / 쓰기: 운영진
--    file_size_limit 50MB — Supabase 플랜의 전역 한도가 더 낮으면 그 값이 적용된다.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('resources', 'resources', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists storage_resources_read on storage.objects;
create policy storage_resources_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resources'
    and (
      public.is_admin()
      or exists (
        select 1 from public.resources r
         where r.storage_path = name
           and r.is_published
           and public.can_view_cohort(r.cohort_id)
      )
    )
  );

drop policy if exists storage_resources_admin_write on storage.objects;
create policy storage_resources_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'resources' and public.is_admin())
  with check (bucket_id = 'resources' and public.is_admin());
