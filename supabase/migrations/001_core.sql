-- ============================================================
-- AI4CEO 졸업생 포털 v1 — 001_core
-- Design Ref: §3.3 (확장, enum, cohorts, profiles, roster)
-- 이 파일은 dev/prod 모두에 적용한다.
-- ============================================================

create extension if not exists pg_trgm with schema extensions;

-- role: 재학생/졸업생은 별도 역할이 아니라 cohorts.is_active로 파생한다 (Design §1.3-3)
create type public.user_role     as enum ('member', 'admin');
create type public.member_status as enum ('pending', 'active', 'rejected');

-- ------------------------------------------------------------
-- cohorts (기수)
-- ------------------------------------------------------------
create table public.cohorts (
  id         serial primary key,
  number     int  not null unique check (number > 0),
  name       text not null,
  start_date date,                                  -- 과거 기수는 날짜 미상 허용
  end_date   date,
  is_active  boolean not null default false,        -- true = 재학 기수
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- profiles (auth.users 1:1)
-- 행 생성은 handle_new_user 트리거(004)만 한다. 클라이언트 INSERT 불가.
-- ------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text not null check (email = lower(email)),
  name                text not null,
  company             text,
  position            text,
  bio                 text,
  avatar_url          text,
  github_url          text,
  linkedin_url        text,
  website_url         text,
  role                public.user_role     not null default 'member',
  status              public.member_status not null default 'pending',
  cohort_id           int references public.cohorts(id) on delete set null,
  requested_cohort    int,                          -- 명단 미등록자가 신청 시 적은 기수
  consented_at        timestamptz,                  -- 개인정보 수집·이용 동의 시각
  notify_new_resource boolean not null default true,
  notify_announcement boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index profiles_cohort_idx on public.profiles(cohort_id) where status = 'active';
create index profiles_status_idx on public.profiles(status);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- roster (사전 등록 명단) — 가입 시 이메일로 대조한다
-- ------------------------------------------------------------
create table public.roster (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique check (email = lower(email)),
  name        text not null,
  cohort_id   int  not null references public.cohorts(id),
  role        public.user_role not null default 'member',   -- 첫 운영진(admin) 부트스트랩용
  imported_by uuid references public.profiles(id) on delete set null,
  imported_at timestamptz not null default now(),
  claimed_by  uuid references public.profiles(id) on delete set null,
  claimed_at  timestamptz
);
create index roster_cohort_idx on public.roster(cohort_id);
