-- ============================================================
-- AI4CEO 졸업생 포털 v1 — 004_functions
-- Design Ref: §3.4 (헬퍼 함수, 가입 트리거, RPC)
--
-- 모든 함수는 SECURITY DEFINER + search_path 고정('')이다.
--   - RLS 정책 안에서 profiles를 조회해도 재귀하지 않는다.
--   - 실행 권한은 005_rls.sql에서 함수별로 부여한다 (기본은 아무에게도 주지 않음).
-- ============================================================

-- ------------------------------------------------------------
-- 열람 규칙
--   운영진        : 모든 기수
--   전체 공용(NULL): 활성 회원 모두
--   졸업생        : 내 기수가 비활성(is_active=false)이면 모든 기수
--   재학생        : 본 기수만
--   기수 미지정 회원은 공용만 볼 수 있다.
-- ------------------------------------------------------------
create function public.can_user_view_cohort(p_user uuid, cid int) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    left join public.cohorts c on c.id = p.cohort_id
    where p.id = p_user
      and p.status = 'active'
      and ( p.role = 'admin'
            or cid is null
            or coalesce(not c.is_active, false)
            or p.cohort_id = cid )
  );
$$;

create function public.is_active_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
     where id = (select auth.uid()) and status = 'active'
  );
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
     where id = (select auth.uid()) and status = 'active' and role = 'admin'
  );
$$;

create function public.can_view_cohort(cid int) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_user_view_cohort((select auth.uid()), cid);
$$;

-- ------------------------------------------------------------
-- 가입 트리거: 명단(roster) 대조
--   명단에 있음 → active + 기수/역할 자동 부여, roster.claimed 표시
--   명단에 없음 → pending (신청 정보는 user_metadata에서 가져옴)
-- requested_cohort가 숫자가 아니어도 가입이 실패하지 않도록 정규식으로 검사한다.
-- ------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r       public.roster%rowtype;
  v_email text := lower(new.email);
  v_req   int;
  v_name  text;
begin
  select * into r
    from public.roster
   where email = v_email and claimed_by is null
   for update;

  if found then
    insert into public.profiles (id, email, name, cohort_id, role, status)
    values (new.id, v_email, r.name, r.cohort_id, r.role, 'active');

    update public.roster
       set claimed_by = new.id, claimed_at = now()
     where id = r.id;
  else
    v_req := case
      when (new.raw_user_meta_data->>'requested_cohort') ~ '^[0-9]{1,3}$'
        then (new.raw_user_meta_data->>'requested_cohort')::int
    end;
    v_name := nullif(btrim(coalesce(new.raw_user_meta_data->>'name', '')), '');

    insert into public.profiles (id, email, name, status, requested_cohort)
    values (new.id, v_email, coalesce(v_name, split_part(v_email, '@', 1)), 'pending', v_req);
  end if;

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- resources: search_text 유지 (updated_at은 다운로드 수 증가만일 때 갱신하지 않는다)
-- ------------------------------------------------------------
create function public.resources_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.search_text := lower(
    coalesce(new.title, '') || ' ' ||
    coalesce(new.description, '') || ' ' ||
    coalesce(array_to_string(new.tags, ' '), '')
  );
  if tg_op = 'INSERT' or new.download_count = old.download_count then
    new.updated_at := now();
  end if;
  return new;
end $$;

create trigger resources_before_write
  before insert or update on public.resources
  for each row execute function public.resources_before_write();

-- ============================================================
-- RPC
-- ============================================================

-- 명단 일괄 등록 (운영진). 검증은 API(zod)에서 먼저 하고, 여기서는 최종 방어만 한다.
--   - 이미 가입(claimed)한 명단은 수정하지 않는다 (skipped)
--   - 이메일이 일치하는 기존 pending/rejected 회원을 자동으로 active 처리한다
create function public.admin_import_roster(rows jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r          jsonb;
  v_email    text;
  v_cohort   int;
  v_claimed  boolean;
  v_role     public.user_role;
  v_inserted int := 0;
  v_updated  int := 0;
  v_skipped  int := 0;
  v_activated int := 0;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if rows is null or jsonb_typeof(rows) <> 'array' then
    raise exception 'rows must be a json array' using errcode = '22023';
  end if;

  for r in select value from jsonb_array_elements(rows) loop
    v_email := lower(btrim(coalesce(r->>'email', '')));
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'invalid email: %', coalesce(r->>'email', '') using errcode = '22023';
    end if;

    select id into v_cohort from public.cohorts where number = (r->>'cohort_number')::int;
    if v_cohort is null then
      raise exception 'unknown cohort: %', r->>'cohort_number' using errcode = '22023';
    end if;

    v_role := coalesce(nullif(r->>'role', ''), 'member')::public.user_role;

    select (claimed_by is not null) into v_claimed from public.roster where email = v_email;
    if not found then
      insert into public.roster (email, name, cohort_id, role, imported_by)
      values (v_email, btrim(r->>'name'), v_cohort, v_role, (select auth.uid()));
      v_inserted := v_inserted + 1;
    elsif v_claimed then
      v_skipped := v_skipped + 1;
    else
      update public.roster
         set name = btrim(r->>'name'), cohort_id = v_cohort, role = v_role,
             imported_by = (select auth.uid()), imported_at = now()
       where email = v_email;
      v_updated := v_updated + 1;
    end if;
  end loop;

  with matched as (
    select p.id as uid, ro.id as rid, ro.name as rname, ro.cohort_id as rcohort, ro.role as rrole
      from public.profiles p
      join public.roster ro on ro.email = p.email
     where p.status in ('pending', 'rejected') and ro.claimed_by is null
  ), upd as (
    update public.profiles p
       set status = 'active', cohort_id = m.rcohort, role = m.rrole, name = m.rname
      from matched m
     where p.id = m.uid
    returning p.id as uid
  )
  update public.roster ro
     set claimed_by = m.uid, claimed_at = now()
    from matched m
    join upd on upd.uid = m.uid
   where ro.id = m.rid;
  get diagnostics v_activated = row_count;

  return jsonb_build_object(
    'inserted', v_inserted, 'updated', v_updated,
    'skipped', v_skipped, 'activated', v_activated
  );
end $$;

-- 회원 승인/거절 (운영진). p_cohort는 cohorts.id 이다.
create function public.admin_set_member_status(
  p_user uuid, p_status public.member_status, p_cohort int default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_cohort int;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) and p_status <> 'active' then
    raise exception 'cannot deactivate yourself' using errcode = '22023';
  end if;

  select coalesce(p_cohort, cohort_id) into v_cohort from public.profiles where id = p_user;
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  if p_status = 'active' and v_cohort is null then
    raise exception 'cohort required' using errcode = '22023';
  end if;
  if p_cohort is not null and not exists (select 1 from public.cohorts where id = p_cohort) then
    raise exception 'unknown cohort' using errcode = '22023';
  end if;

  update public.profiles set status = p_status, cohort_id = v_cohort where id = p_user;
end $$;

-- 자료 공개. p_notify=true면 알림 job 적재(이미 있으면 무시). 일괄 공개는 p_notify=false.
create function public.publish_resource(p_id uuid, p_notify boolean default true) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_job uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.resources
     set is_published = true, published_at = coalesce(published_at, now())
   where id = p_id;
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;

  if p_notify then
    insert into public.notification_jobs (kind, ref_id) values ('resource', p_id)
    on conflict (kind, ref_id) do nothing
    returning id into v_job;
  end if;
  return v_job;
end $$;

create function public.publish_announcement(p_id uuid, p_notify boolean default true) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_job uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.announcements
     set published_at = coalesce(published_at, now())
   where id = p_id;
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;

  if p_notify then
    insert into public.notification_jobs (kind, ref_id) values ('announcement', p_id)
    on conflict (kind, ref_id) do nothing
    returning id into v_job;
  end if;
  return v_job;
end $$;

-- 다운로드 기록: 열람 권한 확인 → 다운로드 수 +1 → 로그
create function public.record_download(p_resource uuid, p_device text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  perform 1
     from public.resources r
    where r.id = p_resource and r.is_published and public.can_view_cohort(r.cohort_id);
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;

  update public.resources set download_count = download_count + 1 where id = p_resource;
  insert into public.activity_log (user_id, event, ref_id, device)
  values ((select auth.uid()), 'download_resource', p_resource, p_device);
end $$;

-- 활동 기록. 'visit'은 하루(KST) 1회만 남긴다. 다운로드는 record_download로만 기록한다.
create function public.log_activity(
  p_event text, p_ref uuid default null, p_device text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_event not in ('login', 'visit', 'view_resource', 'view_announcement') then
    raise exception 'invalid event' using errcode = '22023';
  end if;

  if p_event = 'visit' and exists (
       select 1 from public.activity_log a
        where a.user_id = v_uid and a.event = 'visit'
          and (a.created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date
     ) then
    return;
  end if;

  insert into public.activity_log (user_id, event, ref_id, device)
  values (v_uid, p_event, p_ref, p_device);
end $$;

-- 멤버 디렉토리: 공개 컬럼만 반환한다 (이메일 제외)
create function public.directory_members(p_cohort_id int default null)
returns table (
  id uuid, name text, company text, "position" text, bio text, avatar_url text,
  github_url text, linkedin_url text, website_url text, cohort_id int
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, p.company, p."position", p.bio, p.avatar_url,
         p.github_url, p.linkedin_url, p.website_url, p.cohort_id
    from public.profiles p
   where public.is_active_member()
     and p.status = 'active'
     and (p_cohort_id is null or p.cohort_id = p_cohort_id)
   order by p.name;
$$;

-- 관리자 통계 대시보드용 집계 (활동 기준일: 최근 30일 / 12주)
create function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_active  int;
  v_pending int;
  v_roster  int;
  v_claimed int;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*) into v_active  from public.profiles where status = 'active';
  select count(*) into v_pending from public.profiles where status = 'pending';
  select count(*), count(*) filter (where claimed_by is not null)
    into v_roster, v_claimed from public.roster;

  return jsonb_build_object(
    'members_active',  v_active,
    'members_pending', v_pending,
    'roster_total',    v_roster,
    'roster_claimed',  v_claimed,
    'signup_rate',     case when v_roster = 0 then null else round(v_claimed::numeric / v_roster, 3) end,
    'mau', (
      select count(distinct user_id) from public.activity_log
       where created_at >= now() - interval '30 days'
    ),
    'mau_by_cohort', (
      select coalesce(jsonb_agg(t order by t.cohort_number), '[]'::jsonb) from (
        select c.number as cohort_number, count(distinct a.user_id) as users
          from public.activity_log a
          join public.profiles p on p.id = a.user_id
          join public.cohorts  c on c.id = p.cohort_id
         where a.created_at >= now() - interval '30 days'
         group by c.number
      ) t
    ),
    'weekly_visits', (
      select coalesce(jsonb_agg(w order by w.week), '[]'::jsonb) from (
        select date_trunc('week', a.created_at)::date as week, count(distinct a.user_id) as users
          from public.activity_log a
         where a.created_at >= date_trunc('week', now()) - interval '11 weeks'
         group by 1
      ) w
    ),
    'device_ratio', (
      select coalesce(jsonb_object_agg(coalesce(d.device, 'unknown'), d.n), '{}'::jsonb) from (
        select device, count(*) as n from public.activity_log
         where created_at >= now() - interval '30 days'
         group by device
      ) d
    ),
    'top_resources', (
      select coalesce(jsonb_agg(x order by x.downloads desc, x.views desc), '[]'::jsonb) from (
        select r.id, r.title, r.cohort_id,
               count(*) filter (where a.event = 'view_resource')     as views,
               count(*) filter (where a.event = 'download_resource') as downloads
          from public.activity_log a
          join public.resources r on r.id = a.ref_id
         where a.event in ('view_resource', 'download_resource')
           and a.created_at >= now() - interval '30 days'
         group by r.id, r.title, r.cohort_id
         order by count(*) desc
         limit 10
      ) x
    )
  );
end $$;

-- 알림 수신자 산출 (service role 전용): 활성 + 수신 동의 + 열람 권한 있음 + 아직 발송 안 됨
create function public.notification_recipients(p_kind text, p_ref uuid)
returns table (user_id uuid, email text, name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.email, p.name
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
