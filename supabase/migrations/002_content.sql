-- ============================================================
-- AI4CEO 졸업생 포털 v1 — 002_content
-- Design Ref: §3.3 (resources, announcements, announcement_reads, activity_log)
-- ============================================================

-- ------------------------------------------------------------
-- resources (자료)
-- cohort_id NULL = 전체 공용
-- ------------------------------------------------------------
create table public.resources (
  id             uuid primary key default gen_random_uuid(),
  cohort_id      int references public.cohorts(id) on delete set null,
  uploader_id    uuid not null references public.profiles(id),
  title          text not null,
  description    text,
  category       text not null check (category in ('lecture','code','video','reference','assignment')),
  week_number    int  check (week_number between 1 and 20),
  tags           text[] not null default '{}',
  storage_path   text,                               -- Storage 객체 경로
  external_url   text,                               -- 영상 등 외부 링크
  file_type      text,                               -- pdf | code | video | image | other
  file_size      bigint,
  is_published   boolean not null default false,     -- 드라이브 이전 자료는 검수 후 공개
  published_at   timestamptz,
  download_count int not null default 0,
  search_text    text not null default '',           -- resources_before_write 트리거가 유지
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);
create index resources_cohort_idx on public.resources(cohort_id, week_number);
create index resources_pub_idx    on public.resources(is_published, published_at desc);
create index resources_search_idx on public.resources using gin (search_text extensions.gin_trgm_ops);

-- ------------------------------------------------------------
-- announcements (공지) — published_at NULL = 임시저장
-- ------------------------------------------------------------
create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles(id),
  title        text not null,
  body         text not null,
  is_pinned    boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index announcements_pub_idx on public.announcements(is_pinned desc, published_at desc);

create trigger announcements_set_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

-- ------------------------------------------------------------
-- activity_log (통계용) — 기록은 log_activity/record_download RPC로만 한다
-- 'visit' = 하루 1회 접속(앱 셸이 기록). MAU 집계의 기준 이벤트. (Design §3.3에 'visit' 추가)
-- ------------------------------------------------------------
create table public.activity_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  event      text not null check (event in ('login','visit','view_resource','download_resource','view_announcement')),
  ref_id     uuid,
  device     text check (device in ('mobile','desktop')),
  created_at timestamptz not null default now()
);
create index activity_created_idx on public.activity_log(created_at);
create index activity_user_idx    on public.activity_log(user_id, created_at);
