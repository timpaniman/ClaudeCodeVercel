-- ============================================================
-- AI4CEO 졸업생 포털 v1 — 003_notifications
-- Design Ref: §3.3 (outbox 패턴), §4.2 (/api/cron/notify)
-- 두 테이블 모두 service role 전용이다 (005에서 authenticated 권한/정책 없음).
-- ============================================================

create table public.notification_jobs (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('resource','announcement')),
  ref_id       uuid not null,
  status       text not null default 'queued' check (status in ('queued','processing','done','failed')),
  attempts     int  not null default 0,
  error        text,
  created_at   timestamptz not null default now(),
  processed_at timestamptz,
  unique (kind, ref_id)                    -- 같은 항목 중복 발송 방지
);
create index notification_jobs_status_idx on public.notification_jobs(status, created_at);

create table public.notification_deliveries (
  job_id      uuid not null references public.notification_jobs(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null check (status in ('sent','failed')),
  provider_id text,
  error       text,
  sent_at     timestamptz not null default now(),
  primary key (job_id, user_id)            -- 재시도 시 이미 보낸 사람은 건너뜀
);
