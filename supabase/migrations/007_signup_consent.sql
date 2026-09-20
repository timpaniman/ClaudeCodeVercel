-- ============================================================
-- AI4CEO 졸업생 포털 v1 — 007_signup_consent
-- Design Ref: §5.4 /login (개인정보 수집·이용 동의 시각 저장), §3.4 handle_new_user
--
-- 로그인 화면이 신규 가입 시 signInWithOtp({ options: { data: { consent: true } } }) 로 동의를 전달한다.
-- 가입 트리거가 이를 profiles.consented_at 에 기록한다 (클라이언트가 보낸 시각이 아니라 서버 시각).
-- 이미 적용된 004 의 함수를 create or replace 로 교체한다. 여러 번 실행해도 안전하다.
-- ============================================================

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
    values (new.id, v_email, r.name, r.cohort_id, r.role, 'active', v_consent);

    update public.roster
       set claimed_by = new.id, claimed_at = now()
     where id = r.id;
  else
    v_req := case
      when (new.raw_user_meta_data->>'requested_cohort') ~ '^[0-9]{1,3}$'
        then (new.raw_user_meta_data->>'requested_cohort')::int
    end;
    v_name := nullif(btrim(coalesce(new.raw_user_meta_data->>'name', '')), '');

    insert into public.profiles (id, email, name, status, requested_cohort, consented_at)
    values (new.id, v_email, coalesce(v_name, split_part(v_email, '@', 1)), 'pending', v_req, v_consent);
  end if;

  return new;
end $$;
