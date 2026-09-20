-- ============================================================
-- AI4CEO 졸업생 포털 v1 — 008_input_constraints
-- Check 단계(보안 검토) 반영: 입력 검증을 브라우저가 아니라 DB 가 강제한다.
--
-- 배경: 프로필·자료 저장은 브라우저가 PostgREST 로 직접 호출한다. 화면의 검증은 우회할 수 있으므로,
--   (1) 회원이 website_url 에 'javascript:…' 를 저장 → 디렉토리에서 다른 회원(운영진 포함)이 클릭하면 스크립트 실행
--   (2) 회원이 avatar_url 에 외부 주소를 저장 → next/image 예외로 멤버 화면 전체가 500
--   (3) 회원이 bio 에 수 MB 를 저장 → 디렉토리 목록이 전원에게 매우 커짐
-- 이 파일은 그 세 경로를 DB 제약으로 막는다. 여러 번 실행해도 안전하다.
-- 기존 행은 검사하지 않고(NOT VALID) 새로 쓰거나 고치는 행부터 강제한 뒤, 마지막에 기존 행도 검증을 시도한다.
-- ============================================================

-- 1) profiles: 길이 제한 + 링크는 https 만 (공백 없는 한 덩어리)
alter table public.profiles drop constraint if exists profiles_input_limits;
alter table public.profiles add constraint profiles_input_limits check (
      char_length(name) <= 200
  and (company      is null or char_length(company)  <= 100)
  and ("position"   is null or char_length("position") <= 100)
  and (bio          is null or char_length(bio)      <= 500)
  and (github_url   is null or (char_length(github_url)   <= 300 and github_url   ~ '^https://[^[:space:]]+$'))
  and (linkedin_url is null or (char_length(linkedin_url) <= 300 and linkedin_url ~ '^https://[^[:space:]]+$'))
  and (website_url  is null or (char_length(website_url)  <= 300 and website_url  ~ '^https://[^[:space:]]+$'))
  and (avatar_url   is null or (char_length(avatar_url)   <= 500 and avatar_url   ~ '^https://[^[:space:]]+$'))
) not valid;

-- 2) 아바타 업로드는 v1 에서 쓰지 않는다: 회원이 직접 쓸 수 없게 한다 (필요해지면 업로드 기능과 함께 다시 허용)
revoke update (avatar_url) on public.profiles from authenticated;

-- 3) resources.external_url: https 만
alter table public.resources drop constraint if exists resources_external_url_https;
alter table public.resources add constraint resources_external_url_https check (
  external_url is null or (char_length(external_url) <= 2000 and external_url ~ '^https://[^[:space:]]+$')
) not valid;

-- 4) 가입 트리거: 가입 요청 메타데이터의 이름은 사용자가 정하므로 길이를 자른다 (제약 위반으로 가입이 실패하지 않게).
--    007 의 함수를 그대로 두고 v_name 만 200자로 자른다.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r         public.roster%rowtype;
  v_email   text := lower(new.email);
  v_req     int;
  v_name    text;
  v_consent timestamptz := case when (new.raw_user_meta_data->>'consent') = 'true' then now() end;
begin
  select * into r
    from public.roster
   where email = v_email and claimed_by is null
   for update;

  if found then
    insert into public.profiles (id, email, name, cohort_id, role, status, consented_at)
    values (new.id, v_email, left(r.name, 200), r.cohort_id, r.role, 'active', v_consent);

    update public.roster
       set claimed_by = new.id, claimed_at = now()
     where id = r.id;
  else
    v_req := case
      when (new.raw_user_meta_data->>'requested_cohort') ~ '^[0-9]{1,3}$'
        then (new.raw_user_meta_data->>'requested_cohort')::int
    end;
    v_name := left(nullif(btrim(coalesce(new.raw_user_meta_data->>'name', '')), ''), 200);

    insert into public.profiles (id, email, name, status, requested_cohort, consented_at)
    values (new.id, v_email, coalesce(v_name, left(split_part(v_email, '@', 1), 200)), 'pending', v_req, v_consent);
  end if;

  return new;
end $$;

-- 5) 기존 행 검증 시도 (위반 행이 있으면 알림만 남기고 계속한다 — 그 행을 고친 뒤 validate constraint 를 다시 실행)
do $$
begin
  begin
    alter table public.profiles validate constraint profiles_input_limits;
  exception when others then
    raise notice 'profiles_input_limits: 기존 행 중 위반이 있어 검증을 건너뜁니다 (%).', sqlerrm;
  end;
  begin
    alter table public.resources validate constraint resources_external_url_https;
  exception when others then
    raise notice 'resources_external_url_https: 기존 행 중 위반이 있어 검증을 건너뜁니다 (%).', sqlerrm;
  end;
end $$;
