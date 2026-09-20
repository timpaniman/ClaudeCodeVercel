-- ============================================================
-- ⚠️  DEV 전용 재설정 스크립트 — 운영(prod) 프로젝트에서 절대 실행하지 말 것
--
-- 마이그레이션(001~006)을 고쳐서 다시 적용해야 할 때, v1 객체를 모두 지운다.
-- 지우는 것: public 스키마의 **v1 테이블·함수·enum**(이름으로 지정), auth.users 가입 트리거, Storage 정책
-- 지우지 않는 것: 다른 앱의 객체(sessions, documents, messages, match_documents 등),
--               auth.users 계정 (먼저 `npm run test:rls:cleanup` 으로 테스트 계정을 지울 것),
--               Storage 버킷 'resources' 와 그 안의 파일 (직접 삭제가 막혀 있음)
--
-- 안전장치: 프로필이 20개를 넘으면(= 실데이터로 보이면) 중단한다.
-- ============================================================

do $$
begin
  if to_regclass('public.profiles') is not null
     and (select count(*) from public.profiles) > 20 then
    raise exception 'profiles 가 20개를 넘습니다. 운영 데이터로 보여 재설정을 중단합니다.';
  end if;
end $$;

drop policy if exists storage_resources_read        on storage.objects;
drop policy if exists storage_resources_admin_write on storage.objects;

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists
  public.notification_deliveries,
  public.notification_jobs,
  public.announcement_reads,
  public.announcements,
  public.activity_log,
  public.resources,
  public.roster,
  public.profiles,
  public.cohorts
cascade;

-- v1 함수만 이름으로 지정해 지운다. (public 스키마 전체를 지우면 다른 앱의 match_documents 등이 사라진다)
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in (
         'can_user_view_cohort', 'is_active_member', 'is_admin', 'can_view_cohort',
         'handle_new_user', 'resources_before_write', 'set_updated_at',
         'admin_import_roster', 'admin_set_member_status', 'publish_resource',
         'publish_announcement', 'record_download', 'log_activity',
         'directory_members', 'admin_stats', 'notification_recipients'
       )
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

drop type if exists public.member_status cascade;
drop type if exists public.user_role     cascade;
