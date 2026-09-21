# ai4ceo-alumni-portal Design Document

> **Summary**: AI4CEO 졸업생 포털 v1 설계 — 명단 기반 가입, 자료 라이브러리, 공지, 이메일 알림, 멤버 디렉토리, 관리자. Next.js 14 + Supabase(RLS가 권한의 기준) + Vercel.
>
> **Project**: ai4ceo1 (ai4ceo1-next)
> **Version**: 0.1.0
> **Author**: 장동인 교수 (with Claude)
> **Date**: 2026-09-19
> **Status**: Approved (2026-09-19, 장동인 교수)
> **Planning Doc**: [ai4ceo-alumni-portal.plan.md](../../01-plan/features/ai4ceo-alumni-portal.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema — 본 문서 §3 | ✅ |
| Phase 2 | Conventions — `CLAUDE.md` | ✅ |
| Phase 3 | Mockup — [`design-brief-v1.md`](../design-brief-v1.md), `claude-design/` | 🔄 (신규 N1~N10 미제작) |
| Phase 4 | API Spec — 본 문서 §4 | ✅ |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 졸업생 자료·공지가 드라이브/단톡방에 흩어져 탐색과 알림이 안 된다. "새 자료는 여기 있다"는 방문 이유를 먼저 만든다. |
| **WHO** | 졸업생 약 500명(1~16기) + 재학생 17기(40~60대 CEO, 모바일 위주), 교수·운영진 |
| **RISK** | 단톡방 이탈 저항 / **RLS 오류로 인한 정보 노출·권한 상승** / 이메일 도달률 / 명단 이메일 불일치 / `.env` 키 유출 |
| **SUCCESS** | MAU 40%, 자료 접근시간 50% 단축, 모바일 60%, (제안) 1개월 내 가입 완료율 70%·드라이브 100% 이전, Match Rate 90% |
| **SCOPE** | v1 = M1~M6 + PWA + 드라이브 이전 + 배포. 피드·AI·쇼케이스·임팩트·질문함은 제외 |

---

## Design Anchor

> Pencil MCP는 사용하지 않는다. 디자인 토큰은 [`design-system.md`](../design-system.md)를 기준으로 하고, v1 변경점은 [`design-brief-v1.md`](../design-brief-v1.md) §D를 따른다.

| Category | Tokens |
|----------|--------|
| **Colors** | primary `#6366f1`, bg `#0f0f0f`, surface `#1a1a2e`, text `#f9fafb` / `#9ca3af` |
| **Typography** | Pretendard + Inter, 모바일 본문 **16px**(기존 14px에서 상향) |
| **Spacing** | 4px 그리드, 터치 영역 최소 44px |
| **Radius** | 12px |
| **Tone** | 다크 전용, 절제된 전문가 톤, 존댓말 카피 |
| **Layout** | Mobile 하단 탭 5개 / Desktop 좌측 사이드바 240px |

---

## 1. Overview

### 1.1 Design Goals

1. 500명이 첫날 몰려도 안전한 **권한 모델**(4개 역할)을 DB 수준에서 보장한다.
2. CEO 사용자가 **비밀번호 없이** 스마트폰에서 로그인해 자료를 3탭 이내에 연다.
3. 1인 운영 가능: 명단 CSV 한 번으로 가입 승인이 자동화되고, 업로드 한 번으로 알림까지 나간다.
4. v1.1(피드·AI)을 얹을 때 재작업이 없도록 모듈 경계를 잡는다.

### 1.2 Design Principles

- **DB가 권한의 기준**: 모든 접근 규칙은 RLS·SECURITY DEFINER 함수에 둔다. 화면·API는 이를 신뢰한다(이중 방어는 하되 기준은 하나).
- **최소 권한**: `anon`은 아무것도 못 읽는다. 일반 회원은 본인 프로필의 지정 컬럼만 수정한다.
- **YAGNI**: v1에 쓰지 않는 테이블은 만들지 않는다.
- **멱등성**: 명단 import, 알림 발송은 재실행해도 중복되지 않는다.

### 1.3 Plan 대비 변경 사항 (Design에서 확정)

Supabase에 v1 테이블(`profiles` 등)이 없어(2026-09-19) 기존 `001_initial_schema.sql`·`002_rls_policies.sql`은 적용된 적이 없다. 따라서 폐기하고 v1 전용으로 새로 작성한다.

> **정정 (Do module-1, 2026-09-19)**: 현재 `.env`가 가리키는 프로젝트(`uedsubztsvtembzamirw`)는 "빈 프로젝트"가 아니다. Python RAG 앱(`C:\Users\timpa\ai4ceo`)이 함께 쓰고 있다 — 테이블 `sessions`·`documents`(1,242행)·`messages`, RPC `match_documents`, Auth 사용자 3명(최근 로그인 2026-09-18). 그래서 `005_rls.sql`과 `dev-reset.sql`은 스키마 전체가 아니라 **v1 객체 이름을 지정해서만** 권한을 바꾸고 지우도록 수정했다. 이 프로젝트를 포털 dev로 계속 쓸지, 포털 전용 dev 프로젝트를 새로 만들지는 §12 #1 참조.

| # | Plan | Design 확정 | 이유 |
|---|------|------------|------|
| 1 | 보류 테이블(posts 등)을 UI 없이 유지 | **만들지 않음** (기존 파일은 `supabase/migrations-archive/`로 이동) | 미적용 상태라 유지할 이유 없음, RLS 공격면 축소 |
| 2 | `cohort_members` 사용 | **제거**, `profiles.cohort_id`로 단일 기수 | 1인 1기수, 조인 불필요. 재수강자(복수 기수)는 v1 제외 |
| 3 | 역할 재학생/졸업생/운영진 | `role`은 `member`/`admin`, **재학생·졸업생은 `cohorts.is_active`로 파생** | 기수 종료 시 역할 갱신 누락 방지 |
| 4 | 이메일 매직링크 | **6자리 코드 + 링크 병행**(코드 우선) | iOS에서 링크는 홈화면 PWA가 아닌 Safari에서 열려 세션이 분리되는 알려진 제약, 기업 메일 보안 스캐너의 링크 선클릭 |
| 5 | 승인 상태 개념 없음 | `profiles.status` = `pending`/`active`/`rejected` | 명단 미등록자 처리 |
| 6 | 인앱 `notifications` | **제외**, 이메일용 `notification_jobs` + `notification_deliveries`(outbox) | v1은 이메일만 |
| 7 | Resend 후보 | Resend를 **Supabase Auth SMTP + 알림 발송** 양쪽에 사용 | Auth 기본 SMTP는 발송 한도가 낮아 운영 부적합 |
| 8 | Supabase 1개 | **dev / prod 2개 프로젝트** | 500명 실데이터와 테스트 분리, RLS 테스트 필요 |
| 9 | M6에 명단·업로드·통계 | 명단·승인은 **S1(M1)**, 자료 업로드는 **S2**, 통계는 S5 | 온보딩과 라이브러리가 먼저 필요 |

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | 기존 구조에 덧붙임 | 전 계층 분리 | 기능 모듈 + DB 기준 권한 |
| **New Files** | ~25 | ~70 | ~45 |
| **Modified Files** | ~12 | ~20 | ~15 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium | High | High |
| **Effort** | Low | High | Medium |

**Selected**: **Option C — Pragmatic Balance** — **Rationale**: 권한을 DB에 모아 기존 보안 결함(§7.1)을 구조적으로 해결하면서, 1인 운영에 맞는 파일 수를 유지하고 v1.1 모듈 추가가 쉽다.

### 2.1 Component Diagram

```
[모바일/PC 브라우저 · PWA]
        │ HTTPS
[Vercel · Next.js 14 App Router]
  ├ middleware.ts      세션 갱신 · 라우트 가드(로그인/상태/관리자)
  ├ (auth)/            login (코드 입력) · pending
  ├ (main)/            home · library · announcements · directory · me
  ├ (admin)/           dashboard · roster · approvals · resources · announcements
  ├ auth/callback      링크 로그인 콜백
  └ api/               roster preview · download · cron/notify · unsubscribe
        │  (사용자 JWT: RLS 적용 / service role: 서버 전용, 알림·import 일부)
[Supabase]
  ├ Auth       이메일 OTP(코드+링크), Google(선택)  ── SMTP: Resend
  ├ Postgres   테이블 + RLS + SECURITY DEFINER 함수 + 트리거
  ├ Storage    private bucket `resources` (서명 URL)
  └ 검색       pg_trgm GIN + ILIKE
[Resend]  Auth 메일 + 새 자료·공지 알림 (배치 발송)
[Vercel Cron]  알림 재시도 스위퍼 (§4.4)
```

### 2.2 Data Flow

```
① 로그인/가입
  회원: 이메일 입력 → 6자리 코드 메일(또는 링크) → 입력/클릭 → auth.users 생성
  → 트리거 handle_new_user: roster 조회
      ├ 있음 → profiles(status=active, cohort, role) 생성 + roster.claimed 표시 → /home
      └ 없음 → profiles(status=pending) → /pending (신청 정보 입력) → 운영진 승인 큐
  운영진: 명단 CSV → 미리보기 검증 → 확정(RPC) → 기존 pending 중 이메일 일치자 자동 승인

② 자료
  운영진: 브라우저에서 Storage 직접 업로드(운영진 JWT) → resources 행(is_published=false)
        → 검수 → publish_resource(id, notify) → (notify면) notification_jobs 적재
  회원: RLS로 목록/검색 → 상세 → POST /api/resources/:id/download → 서명 URL(60초) + 로그

③ 알림
  publish_* → notification_jobs(queued) → 발행 API가 즉시 처리(after) + cron이 실패분 재시도
  → 수신자 산출(notification_recipients) → Resend 배치(100건/요청) → deliveries 기록(멱등)

④ 드라이브 이전(일회성)
  scripts/migrate-drive: 폴더 → manifest.csv → 운영진 수정 → 업로드(service role, is_published=false)
  → 검수 → 일괄 공개(notify=false)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| middleware | Supabase SSR client, `profiles` | 세션·상태·역할 가드 |
| features/* | `lib/supabase/{client,server}`, `types/database.ts`(생성) | 데이터 접근 |
| notifications service | `lib/supabase/admin`(service role), `lib/email/resend` | 발송 |
| roster service | papaparse(CSV), zod | 검증 |
| admin stats | `admin_stats()` RPC | 집계 |

### 2.4 Key Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 프레임워크 | Next.js 14.2.35 유지 | 기존 코드 재사용 |
| 로그인 | Supabase OTP: 이메일 코드 + 링크 | §1.3-4 |
| 검색 | `search_text` + pg_trgm GIN + `ILIKE` | 한글 부분일치, 수천 행 규모 충분. 2글자 이하 질의는 인덱스 미사용(스캔)이나 무방 |
| 이메일 | Resend (Auth SMTP + API) | 배치 발송, 도메인 인증 |
| PDF 열람 | Desktop iframe 미리보기 + Mobile은 새 탭 열기 | 모바일 Safari의 iframe PDF 제약. 인앱 pdf.js는 v1.1 |
| 파일 크기 | 소형 파일은 Storage, **영상은 외부 링크**(YouTube 비공개 등) | Supabase 플랜별 업로드 한도 |
| 타입 | `supabase gen types`로 생성 | 손으로 쓴 `database.ts` 제거 |
| 상태 조회 | middleware가 요청마다 `profiles` 1회 조회 | 500명 규모에서 충분. 커스텀 JWT 클레임은 v1.1 |

---

## 3. Data Model

### 3.1 Entity Relationships

```
auth.users 1 ─ 1 profiles N ─ 1 cohorts
                    │              │
                    │              └ 1 ─ N roster
                    ├ 1 ─ N announcement_reads N ─ 1 announcements
                    ├ 1 ─ N activity_log
                    └ 1 ─ N resources(uploader)   resources N ─ 1 cohorts(NULL = 전체 공용)

notification_jobs 1 ─ N notification_deliveries N ─ 1 profiles
```

### 3.2 Migration 구성 (`supabase/migrations/`)

| 파일 | 내용 |
|------|------|
| `001_core.sql` | 확장, enum, cohorts, profiles, roster |
| `002_content.sql` | resources, announcements, announcement_reads, activity_log |
| `003_notifications.sql` | notification_jobs, notification_deliveries |
| `004_functions.sql` | 헬퍼 함수, 트리거, RPC |
| `005_rls.sql` | RLS 활성화·정책·컬럼 권한·anon 차단·Storage 정책 |
| `006_seed_cohorts.sql` | 1~17기 시드(17기만 재학). **dev/prod 공통** (명단이 `cohorts.id`를 참조하므로 필요). 테스트 계정·자료는 SQL이 아니라 `tests/rls/globalSetup.ts`가 dev에서만 만든다 *(Do module-1에서 변경)* |

### 3.3 Database Schema

```sql
-- 001_core.sql
create extension if not exists pg_trgm with schema extensions;

create type public.user_role     as enum ('member', 'admin');
create type public.member_status as enum ('pending', 'active', 'rejected');

create table public.cohorts (
  id         serial primary key,
  number     int  not null unique check (number > 0),
  name       text not null,
  start_date date,                       -- 과거 기수는 날짜 미상 허용
  end_date   date,
  is_active  boolean not null default false,   -- true = 재학 기수
  created_at timestamptz not null default now()
);

create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null check (email = lower(email)),
  name                  text not null,
  company               text,
  position              text,
  bio                   text,
  avatar_url            text,
  github_url            text,
  linkedin_url          text,
  website_url           text,
  role                  public.user_role     not null default 'member',
  status                public.member_status not null default 'pending',
  cohort_id             int references public.cohorts(id) on delete set null,
  requested_cohort      int,             -- 명단 미등록자가 신청 시 적은 기수
  consented_at          timestamptz,     -- 개인정보 수집·이용 동의 시각
  notify_new_resource   boolean not null default true,
  notify_announcement   boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index profiles_cohort_idx on public.profiles(cohort_id) where status = 'active';
create index profiles_status_idx on public.profiles(status);

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
```

```sql
-- 002_content.sql
create table public.resources (
  id             uuid primary key default gen_random_uuid(),
  cohort_id      int references public.cohorts(id) on delete set null,  -- NULL = 전체 공용
  uploader_id    uuid not null references public.profiles(id),
  title          text not null,
  description    text,
  category       text not null check (category in ('lecture','code','video','reference','assignment')),
  week_number    int check (week_number between 1 and 20),
  tags           text[] not null default '{}',
  storage_path   text,                    -- Storage 객체 경로
  external_url   text,                    -- 영상 등 외부 링크
  file_type      text,                    -- pdf | code | video | image | other
  file_size      bigint,
  is_published   boolean not null default false,   -- 이전 자료 검수 후 공개
  published_at   timestamptz,
  download_count int not null default 0,
  search_text    text not null default '',         -- 트리거가 유지
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);
create index resources_cohort_idx  on public.resources(cohort_id, week_number);
create index resources_pub_idx     on public.resources(is_published, published_at desc);
create index resources_search_idx  on public.resources using gin (search_text extensions.gin_trgm_ops);

create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles(id),
  title        text not null,
  body         text not null,
  is_pinned    boolean not null default false,
  published_at timestamptz,               -- NULL = 임시저장
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index announcements_pub_idx on public.announcements(is_pinned desc, published_at desc);

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create table public.activity_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  event      text not null check (event in ('login','visit','view_resource','download_resource','view_announcement')),
  -- 'visit' = 하루(KST) 1회 접속. 세션이 유지되어 login 이 드물기 때문에 MAU 기준 이벤트로 추가 (Do module-1)
  ref_id     uuid,
  device     text check (device in ('mobile','desktop')),
  created_at timestamptz not null default now()
);
create index activity_created_idx on public.activity_log(created_at);
create index activity_user_idx    on public.activity_log(user_id, created_at);
```

```sql
-- 003_notifications.sql  (outbox 패턴, service role 전용)
create table public.notification_jobs (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('resource','announcement')),
  ref_id       uuid not null,
  status       text not null default 'queued' check (status in ('queued','processing','done','failed')),
  attempts     int  not null default 0,
  error        text,
  created_at   timestamptz not null default now(),
  processed_at timestamptz,
  unique (kind, ref_id)                   -- 같은 항목 중복 발송 방지
);

create table public.notification_deliveries (
  job_id      uuid not null references public.notification_jobs(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null check (status in ('sent','failed')),
  provider_id text,
  error       text,
  sent_at     timestamptz not null default now(),
  primary key (job_id, user_id)           -- 재시도 시 이미 보낸 사람 건너뜀
);
```

### 3.4 핵심 함수·트리거 (`004_functions.sql`)

```sql
-- 헬퍼: 모두 SECURITY DEFINER + search_path 고정 (RLS 재귀 방지)
create function public.is_active_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = (select auth.uid()) and status = 'active');
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = (select auth.uid()) and status = 'active' and role = 'admin');
$$;

-- 열람 규칙: 운영진=전체 / 공용(NULL)=활성 회원 모두 / 졸업생(내 기수가 비활성)=전 기수 / 재학생=본 기수
create function public.can_view_cohort(cid int) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    left join public.cohorts c on c.id = p.cohort_id
    where p.id = (select auth.uid()) and p.status = 'active'
      and ( p.role = 'admin'
            or cid is null
            or coalesce(c.is_active, false) = false
            or p.cohort_id = cid )
  );
$$;

-- 가입 트리거: 명단 대조
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.roster%rowtype;
begin
  select * into r from public.roster
   where email = lower(new.email) and claimed_by is null for update;

  if found then
    insert into public.profiles (id, email, name, cohort_id, role, status)
    values (new.id, lower(new.email), r.name, r.cohort_id, r.role, 'active');
    update public.roster set claimed_by = new.id, claimed_at = now() where id = r.id;
  else
    insert into public.profiles (id, email, name, status, requested_cohort)
    values (new.id, lower(new.email),
            coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
            'pending',
            nullif(new.raw_user_meta_data->>'requested_cohort', '')::int);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- resources.search_text / updated_at 유지
create function public.resources_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.search_text := lower(coalesce(new.title,'') || ' ' || coalesce(new.description,'')
                           || ' ' || coalesce(array_to_string(new.tags, ' '), ''));
  new.updated_at := now();
  return new;
end $$;
create trigger resources_before_write before insert or update on public.resources
  for each row execute function public.resources_before_write();
```

**RPC 목록** (모두 `SECURITY DEFINER`, `search_path=''`, 첫 줄에서 `is_admin()` 또는 `is_active_member()` 검사)

| RPC | 호출자 | 동작 |
|-----|--------|------|
| `admin_import_roster(rows jsonb)` | 운영진 | 검증된 행 upsert(이메일 소문자 정규화) → **이메일이 일치하는 기존 pending 사용자를 자동 active 처리**. `{inserted, updated, activated}` 반환 |
| `admin_set_member_status(p_user, p_status, p_cohort)` | 운영진 | 승인/거절. 승인 시 `p_cohort` 필수 |
| `publish_resource(p_id, p_notify)` | 운영진 | `is_published=true`, `published_at` 설정, `p_notify`면 job 적재. **일괄 공개는 `p_notify=false`** |
| `publish_announcement(p_id, p_notify)` | 운영진 | 동일 |
| `record_download(p_resource, p_device)` | 활성 회원 | 열람 가능 여부 검증 후 `download_count+1`, 로그 기록 |
| `log_activity(p_event, p_ref, p_device)` | 활성 회원 | `activity_log` insert (테이블 직접 insert 금지). 허용 이벤트: `login`·`visit`·`view_resource`·`view_announcement` (`download_resource`는 `record_download`만). `visit`은 하루(KST) 1회만 기록 — **앱 셸(module-3)이 접속 시 호출해야 MAU가 집계됨** |
| `directory_members(p_cohort int default null)` | 활성 회원 | 공개 컬럼만 반환(이메일 제외) |
| `admin_stats()` | 운영진 | 회원수·가입 완료율·MAU·기수별 활성·주간 접속(12주)·인기 자료 Top10·모바일 비율을 jsonb로 |
| `notification_recipients(p_kind, p_ref)` | service role 전용 | 알림 수신자(활성 + 수신 동의 + 열람 권한 있음) |

### 3.5 Storage

- 버킷 `resources`: **private**. 객체 경로 `{cohort_number|common}/{resource_uuid}/{원본파일명}`.
- 파일명은 저장 전 정규화(공백·특수문자 치환), 허용 확장자: `pdf, zip, ipynb, py, js, ts, md, txt, csv, png, jpg, pptx, docx, xlsx`.

---

## 4. API Specification

> 원칙: 데이터 조회·단순 CRUD는 **Supabase 클라이언트(RLS)** 를 직접 쓴다. 서버 코드가 필요한 것만 API로 둔다.

### 4.1 직접 호출 (RLS로 보호)

| 용도 | 방법 |
|------|------|
| 로그인 코드 발송 | `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` |
| 코드 확인 | `supabase.auth.verifyOtp({ email, token, type: 'email' })` |
| 자료 목록·필터·검색 | `from('resources').select().eq/ilike(...)` (RLS가 권한 필터) |
| 공지 목록·읽음 | `from('announcements')`, `from('announcement_reads').upsert()` |
| 디렉토리 | `rpc('directory_members', { p_cohort_id })` |
| 프로필·알림 설정 수정 | `from('profiles').update(...)` — 허용 컬럼만(§7.1) |
| 자료 업로드(운영진) | `storage.from('resources').upload()` → `from('resources').insert()` |

### 4.2 Route Handlers

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/auth/confirm` | 메일의 로그인 링크(`token_hash`) 확인 → 세션 발급 → `next`(안전한 내부 경로만) 이동. PKCE 검증기가 필요 없어 다른 브라우저에서 열어도 동작 *(Do module-2에서 추가)* | 없음 |
| GET | `/auth/callback` | OAuth(Google) PKCE 콜백 → 세션 교환 (이메일 로그인은 위 `/auth/confirm`과 코드 입력 사용) | 없음 |
| POST | `/auth/signout` | 로그아웃 후 `/login` (POST 전용 — 링크 프리페치로 로그아웃되는 것을 방지) *(module-2)* | 세션 |
| POST | `/api/admin/roster/preview` | CSV 업로드 → 파싱·검증 결과 반환(DB 쓰기 없음) | 운영진 |
| POST | `/api/admin/roster/commit` | 검증 통과 행을 `admin_import_roster` RPC로 확정 | 운영진 |
| POST | `/api/resources/[id]/download` | 열람 권한 확인(RLS) → 서명 URL 반환. body `{ mode }`: `download`(기본, 60초, `record_download`로 다운로드 수·로그, 응답 파일명=제목+확장자) / `view`(미리보기용 5분, 카운트 없음). 외부 링크 자료는 `{ url, external: true }`. 없는 자료·권한 없는 자료·미공개(비운영진)는 모두 404 *(Do module-3)* | 활성 회원 |
| POST | `/api/admin/publish` | `publish_resource`/`publish_announcement` 호출 + 알림 즉시 처리 트리거 | 운영진 |
| GET | `/api/cron/notify` | queued/실패 job 재처리 | `Authorization: Bearer CRON_SECRET` |
| GET | `/api/unsubscribe?t=` | 서명 토큰으로 알림 수신 해제(로그인 불필요) | HMAC 토큰 |

#### `POST /api/admin/roster/preview`

**Request**: `multipart/form-data` — `file` (CSV, UTF-8/UTF-8 BOM, 최대 2MB). 헤더: `email,name,cohort_number[,role]`

**Response (200)**:
```json
{
  "summary": { "total": 500, "ok": 492, "duplicateInFile": 3, "alreadyInRoster": 2, "invalid": 3 },
  "rows": [
    { "line": 2, "email": "a@b.com", "name": "홍길동", "cohortNumber": 12, "status": "ok" },
    { "line": 9, "email": "bad-email", "status": "invalid", "reason": "이메일 형식 오류" }
  ]
}
```
**Errors**: `400 INVALID_FILE`(형식/헤더/크기), `401 UNAUTHORIZED`, `403 FORBIDDEN`, `422 UNKNOWN_COHORT`(존재하지 않는 기수 번호)

#### `POST /api/resources/[id]/download`

**Response (200)**: `{ "url": "https://…signed…", "expiresIn": 60 }`
**Errors**: `401`, `403 FORBIDDEN`(열람 권한 없음/승인 대기), `404 NOT_FOUND`(미공개 포함), 외부 링크 자료는 `{ "url": external_url }` 반환

#### `/api/cron/notify` 처리 규칙

1. `status in ('queued','failed') and attempts < 5` job을 `FOR UPDATE SKIP LOCKED`로 선점 → `processing`.
2. `notification_recipients` 결과에서 `deliveries`에 이미 `sent`인 사용자를 제외.
3. Resend 배치(100건/요청)로 발송, 건별 결과를 `deliveries`에 기록.
4. 전원 성공 → `done`, 일부 실패 → `failed`(다음 실행에서 실패분만 재시도).
5. 모든 메일에 `List-Unsubscribe` 헤더와 본문 수신 해제 링크 포함.

> **Vercel 플랜 확인 필요**: Hobby 플랜은 Cron이 하루 1회로 제한된다. 그래서 발행 직후 `POST /api/admin/publish`가 즉시 처리(`after()`)하고, Cron은 실패분 재시도용 안전망으로만 쓴다.

### 4.3 Error Response Format

```json
{ "error": { "code": "FORBIDDEN", "message": "열람 권한이 없습니다.", "details": {} } }
```

---

## 5. UI/UX Design

### 5.1 Routes & Guard

| 그룹 | 경로 | 가드 |
|------|------|------|
| public | `/`(v1.1 랜딩 전까지 `/home` 또는 `/login`으로 리다이렉트), `/api/unsubscribe` | 없음 |
| (auth) | `/login`, `/pending` | 비로그인 → `/login`. **pending**은 `/pending`만 접근 |
| (main) | `/home`, `/library`, `/library/[id]`, `/announcements`, `/announcements/[id]`, `/directory`, `/directory/[cohortNumber]`, `/me` | status=active |
| (admin) | `/admin`, `/admin/roster`, `/admin/approvals`, `/admin/resources`, `/admin/resources/new`, `/admin/announcements/new` | status=active & role=admin |

middleware 규칙: 세션 없음 → `/login` / status=pending·rejected → `/pending`(rejected는 안내 문구만) / `/admin/*` 비운영진 → `/home`.

### 5.2 User Flow

```
최초: /login → 이메일 → 코드 입력 → (명단 일치) /home
                                   └ (명단 없음) /pending → 신청 정보 제출 → 승인 대기
재방문: 홈화면 아이콘 → /home (세션 유지)
자료: /home → 새 자료 → /library/[id] → 다운로드
알림: 메일 링크 → /library/[id] 또는 /announcements/[id] (미로그인 시 /login → 원래 경로로 복귀)
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `AppShell` / `Sidebar` / `MobileNav` / `TopBar` | `src/components/layout/` | 기존 재사용, v1 내비(홈·자료·공지·멤버·나)로 교체 |
| `CohortBadge`, `Avatar`, `Button`, `Input`, `Modal`, `Tabs`, `Toggle`, `Skeleton`, `EmptyState` | `src/components/ui/` | 공통 |
| `OtpForm`, `PendingForm` | `src/features/auth/components/` | 코드 로그인, 승인 대기 신청 |
| `ResourceList`, `ResourceItem`, `ResourceFilters`, `ResourceDetail`, `FileTypeIcon`, `LockedResource` | `src/features/library/components/` | 자료 |
| `AnnouncementCard`, `AnnouncementList`, `AnnouncementEditor` | `src/features/announcements/components/` | 공지 |
| `MemberCard`, `CohortGrid`, `ProfileForm`, `NotificationSettings` | `src/features/directory/`, `src/features/me/` | 디렉토리·프로필 |
| `KPICard`, `StatsCharts`, `CsvDropzone`, `ValidationTable`, `ApprovalCard`, `UploadForm` | `src/features/admin/components/` | 관리자 |

### 5.4 Page UI Checklist

> Gap Detector가 항목별로 검증한다. 화면 시안은 Claude Design 결과가 나오면 세부를 맞춘다.

#### /login
- [ ] Input: 이메일 (type=email, 자동완성, 소문자 정규화)
- [ ] Button: "인증 코드 보내기" (발송 중 로딩, 60초 재전송 카운트다운)
- [ ] Input: 인증 코드 (숫자 키패드 `inputmode=numeric`, `autocomplete=one-time-code`). **자릿수는 Supabase 설정값을 따른다** — `NEXT_PUBLIC_OTP_LENGTH`. 현재 dev 프로젝트는 8자리, 권장은 6자리 *(module-2 확인)*
- [ ] Text: "메일의 링크를 눌러도 로그인됩니다" 보조 안내
- [ ] Checkbox: 개인정보 수집·이용 동의 (미동의 시 발송 불가), 동의 시각 저장
- [ ] Button: Google 계속하기 (보조, 설정된 경우만)
- [ ] State: 코드 오류 / 만료 / 발송 한도 초과 메시지

#### /pending
- [ ] Text: 승인 대기 안내(명단 미등록)
- [ ] Form: 이름, 기수 번호, 회사 → 제출 후 "운영진이 확인합니다" 상태
- [ ] Button: 로그아웃
- [ ] State: rejected 안내(문의 방법)

#### /home
- [ ] Header: 이름 + CohortBadge
- [ ] Card: 고정 공지 (최대 3, 안 읽음 점)
- [ ] List: 새 자료 (최근 7일, 최대 10, 기수 배지·카테고리·날짜)
- [ ] Link: 내 기수 자료 바로가기
- [ ] Input: 검색바(→ /library?q=)
- [ ] State: 새 자료 없음 / 로딩 스켈레톤

#### /library
- [ ] Input: 검색 (debounce 300ms, 결과 하이라이트)
- [ ] Filter: 기수 (가로 스크롤 칩; 재학생은 타 기수 칩에 자물쇠), 전체 공용 옵션
- [ ] Tabs: 전체 · 강의자료 · 코드 · 영상 · 참고자료 · 과제
- [ ] Filter: 주차(1~20), 정렬(최신순/다운로드순)
- [ ] Card: ResourceItem — 파일 타입 아이콘, 제목, CohortBadge, 날짜, 다운로드 수
- [ ] Pagination: 무한 스크롤 또는 "더 보기" (페이지당 20)
- [ ] Button(운영진만): "자료 올리기"
- [ ] State: 결과 없음("검색 결과가 없습니다" + 초기화), 로딩, 오류

#### /library/[id]
- [ ] Header: 제목, CohortBadge, 주차·카테고리, 날짜, 다운로드 수, 태그
- [ ] Text: 설명
- [ ] Viewer: PDF(데스크톱 iframe / 모바일 새 탭), 영상 링크 임베드, 코드 보기+복사
- [ ] Button: 다운로드 (진행 상태)
- [ ] State: 권한 없음(LockedResource), 404

#### /announcements, /announcements/[id]
- [ ] List: 고정 공지 상단(핀 아이콘), 안 읽음 점, 게시일
- [ ] Detail: 제목, 본문(마크다운 안전 렌더링), 게시일, 자동 읽음 처리
- [ ] State: 공지 없음

#### /directory, /directory/[cohortNumber]
- [ ] Grid: 기수 카드(기수 배지·멤버 수)
- [ ] List: 멤버 카드(아바타·이름·회사·직책·링크) — **이메일 미노출**
- [ ] Input: 이름/회사 검색

#### /me
- [ ] Form: 이름, 회사, 직책, 소개, GitHub/LinkedIn/웹사이트, 아바타
- [ ] Toggle: 새 자료 이메일 / 공지 이메일
- [ ] Read-only: 이메일, 기수, 상태
- [ ] Button: 로그아웃 / (운영진) 관리자 진입

#### /admin (대시보드)
- [ ] KPI 4: 전체 회원, 가입 완료율, 이달 MAU, 승인 대기
- [ ] Chart: 기수별 활성 사용자(Bar), 주간 접속 12주(Line), 모바일 vs PC(Donut)
- [ ] Table: 인기 자료 Top 10

#### /admin/roster
- [ ] Dropzone: CSV 드래그앤드롭 + 양식 다운로드 링크
- [ ] Table: 검증 미리보기 (정상/파일 내 중복/이미 등록/오류 색 구분, 행 번호·사유)
- [ ] Button: "확정" (오류 행 제외 후 실행), 결과 요약
- [ ] Table: 등록된 명단(이메일·이름·기수·가입 여부), 검색·필터

#### /admin/approvals
- [ ] Card: 이름·이메일·신청 기수·회사·신청일
- [ ] Button: 승인(기수 지정 필수) / 거절, 일괄 처리
- [ ] State: 대기 없음

#### /admin/resources, /admin/resources/new
- [ ] Dropzone: 파일 업로드(진행률, 확장자·크기 검증) 또는 외부 링크 입력
- [ ] Form: 제목, 기수(공용 포함), 주차, 카테고리, 태그, 설명
- [ ] Checkbox: "공개 시 이메일 알림 발송"
- [ ] Table: 자료 목록(공개/미공개, 수정·삭제·공개), 일괄 공개(알림 없음)

#### /admin/announcements/new
- [ ] Form: 제목, 본문, 상단 고정, "이메일 발송", 미리보기, 임시저장/게시

---

## 6. Error Handling

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 400 `INVALID_FILE` | 파일 형식을 확인해 주세요 | CSV/업로드 형식·크기 | 오류 위치 표시 |
| 401 `UNAUTHORIZED` | 로그인이 필요합니다 | 세션 없음 | `/login?next=` |
| 403 `FORBIDDEN` | 열람 권한이 없습니다 | 상태/기수 권한 | 잠금 화면 |
| 404 `NOT_FOUND` | 찾을 수 없습니다 | 없음/미공개 | 404 페이지 |
| 422 `UNKNOWN_COHORT` | 존재하지 않는 기수입니다 | 명단 기수 번호 | 행별 사유 |
| 429 `RATE_LIMITED` | 잠시 후 다시 시도해 주세요 | OTP/API 한도 | 카운트다운 |
| 500 `INTERNAL` | 일시적인 오류입니다 | 서버 오류 | 로그 기록 + 재시도 안내 |

UI 카피는 존댓말, 내부 오류 상세는 노출하지 않는다.

---

## 7. Security Considerations

### 7.1 RLS 정책 (`005_rls.sql`) — 기존 002의 결함 수정 포함

기존 `002_rls_policies.sql`의 문제: (1) `profiles_update`가 컬럼 제한 없이 본인 행 전체를 수정 허용 → **누구나 `role='admin'` 가능**, (2) `resources`·`profiles` SELECT가 모든 로그인자에게 개방. 아래로 대체한다.

```sql
-- 기본: anon 차단, 모든 테이블 RLS 활성화
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter table public.cohorts, public.profiles, public.roster, public.resources,
            public.announcements, public.announcement_reads, public.activity_log,
            public.notification_jobs, public.notification_deliveries
  enable row level security;   -- jobs/deliveries: 정책 없음 = service role만

-- profiles: 본인 + 운영진만 직접 조회. 다른 회원은 directory_members() RPC (이메일 제외)
create policy profiles_select_self  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_select_admin on public.profiles for select to authenticated
  using (public.is_admin());
create policy profiles_update_self  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- 컬럼 권한: role/status/cohort_id/email 등은 수정 불가
revoke update on public.profiles from authenticated;
grant  update (name, company, position, bio, avatar_url, github_url, linkedin_url,
               website_url, notify_new_resource, notify_announcement, consented_at,
               requested_cohort)
  on public.profiles to authenticated;

-- cohorts / roster
create policy cohorts_select on public.cohorts for select to authenticated
  using (public.is_active_member());
create policy cohorts_admin  on public.cohorts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy roster_admin   on public.roster  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- resources: 공개 + 기수 권한 / 운영진 전체
create policy resources_select_member on public.resources for select to authenticated
  using (is_published and public.can_view_cohort(cohort_id));
create policy resources_admin on public.resources for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- announcements: 게시된 것만 활성 회원 / 운영진 전체
create policy ann_select_member on public.announcements for select to authenticated
  using (public.is_active_member() and published_at is not null and published_at <= now());
create policy ann_admin on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- announcement_reads: 본인 것만
create policy reads_own on public.announcement_reads for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_active_member());

-- activity_log: 운영진 조회만 (기록은 log_activity RPC)
create policy activity_admin_select on public.activity_log for select to authenticated
  using (public.is_admin());

-- Storage
insert into storage.buckets (id, name, public) values ('resources', 'resources', false)
  on conflict (id) do nothing;
create policy storage_read on storage.objects for select to authenticated
  using (bucket_id = 'resources' and (
    public.is_admin() or exists (
      select 1 from public.resources r
      where r.storage_path = name and r.is_published and public.can_view_cohort(r.cohort_id))));
create policy storage_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'resources' and public.is_admin())
  with check (bucket_id = 'resources' and public.is_admin());
```

### 7.2 권한 매트릭스 (테스트 기준)

| 리소스 | 승인 대기 | 재학생(본 기수) | 졸업생 | 운영진 |
|--------|:--:|:--:|:--:|:--:|
| 자신의 프로필 조회 | ✅ | ✅ | ✅ | ✅ |
| 프로필 수정 (허용 컬럼만) | ✅ | ✅ | ✅ | ✅ |
| `role`/`status`/`cohort_id` 수정 | ❌ | ❌ | ❌ | RPC로만 |
| 다른 회원 디렉토리 | ❌ | ✅(이메일 제외) | ✅ | ✅ |
| 자료: 본 기수 / 공용 | ❌ | ✅ | ✅ | ✅ |
| 자료: 타 기수 | ❌ | ❌ | ✅ | ✅ |
| 미공개 자료 | ❌ | ❌ | ❌ | ✅ |
| 공지 조회 | ❌ | ✅ | ✅ | ✅ |
| 자료·공지·명단 쓰기 | ❌ | ❌ | ❌ | ✅ |
| `activity_log`·통계 | ❌ | ❌ | ❌ | ✅ |

### 7.3 기타 보안

- [ ] **`.gitignore`에 `.env`, `.env.*` 추가**(현재 `.env*.local`만 제외). 이미 `.env`에 실제 키가 있으므로 git 도입 **전에** 처리하고, 노출 가능성이 있는 키는 회전한다.
- [ ] 서버 전용 환경변수: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `UNSUBSCRIBE_HMAC_SECRET` (`NEXT_PUBLIC_` 금지). v1에서 쓰지 않는 `OPENAI_API_KEY`·`ANTHROPIC_API_KEY`는 Vercel 프로덕션에 등록하지 않는다.
- [ ] service role 키는 `lib/supabase/admin.ts` 한 곳에서만 사용, 클라이언트 번들 유입 금지.
- [ ] 입력 검증: 모든 API 입력은 zod. CSV는 셀을 텍스트로만 취급, 이메일 정규화.
- [ ] 공지 본문은 안전한 마크다운 렌더러(HTML 비허용)로 출력해 XSS 방지.
- [ ] OTP 남용 방지: Supabase Auth 발송 제한 + 필요 시 CAPTCHA(Turnstile) 적용.
- [ ] 서명 URL 60초, 다운로드는 항상 서버 API를 거쳐 로그 기록.
- [ ] 개인정보: 동의 시각 저장, 디렉토리 이메일 미노출, 탈퇴/삭제 요청 절차 문서화.
- [ ] 첫 운영진: 교수님 이메일을 `role=admin`으로 명단에 넣어 부트스트랩(수동 SQL 최소화).

---

## 8. Test Plan

> Do 단계에서 모듈마다 코드 + 테스트를 한 세트로 작성한다.

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| **L0: RLS/DB** | §7.2 권한 매트릭스, 트리거, RPC | vitest + supabase-js, **dev 프로젝트**의 테스트 사용자 4종 | Do (module-1부터) |
| L1: API | Route Handlers | curl / Playwright request | Do |
| L2: UI Action | 페이지 요소 (§5.4) | Playwright | Do |
| L3: E2E | 사용자 여정 | Playwright | Do |

> Supabase CLI(로컬 DB)가 이 PC에 없고 Docker 여부도 미확인이어서, 로컬 DB 대신 **dev용 Supabase 클라우드 프로젝트**를 테스트 대상으로 한다.

### 8.2 L0 — RLS 핵심 케이스

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | 일반 회원이 `update profiles set role='admin'` | 거부(권한 없음) |
| 2 | 일반 회원이 `update profiles set cohort_id=…` / `status='active'` | 거부 |
| 3 | 승인 대기 사용자가 `resources`·`announcements`·`directory_members` 조회 | 0건/거부 |
| 4 | 재학생(17기)이 12기 자료 조회 / 본 기수·공용 조회 | 0건 / 조회됨 |
| 5 | 졸업생이 전 기수 자료 조회 | 조회됨 |
| 6 | 미공개 자료를 회원이 조회 / 운영진이 조회 | 0건 / 조회됨 |
| 7 | 일반 회원이 `resources` insert, Storage 업로드 | 거부 |
| 8 | 명단에 있는 이메일로 가입 | status=active, 기수·role 자동, roster.claimed 설정 |
| 9 | 명단에 없는 이메일로 가입 → 이후 명단 import | pending → import 후 active |
| 10 | `directory_members` 결과에 email 컬럼 없음 | 확인 |
| 11 | `anon` 키로 모든 테이블 select | 거부 |
| 12 | `notification_jobs` 등 일반 회원 접근 | 거부 |

### 8.3 L1: API Test Scenarios

| # | Endpoint | Method | Test | Expected |
|---|----------|--------|------|----------|
| 1 | `/api/admin/roster/preview` | POST | 정상 CSV | 200, `summary.ok` = 정상 행 수 |
| 2 | `/api/admin/roster/preview` | POST | 잘못된 헤더/이메일/중복/없는 기수 | 400/행별 `invalid`, 422 |
| 3 | `/api/admin/roster/*` | POST | 비운영진 | 403 |
| 4 | `/api/resources/:id/download` | POST | 권한 있는 회원 | 200 + url, `download_count`+1, 로그 |
| 5 | `/api/resources/:id/download` | POST | 타 기수 재학생 / 승인 대기 | 403 |
| 6 | `/api/cron/notify` | GET | Bearer 없음 | 401 |
| 7 | `/api/cron/notify` | GET | 같은 job 재실행 | 중복 발송 0 (`deliveries` PK) |
| 8 | `/api/unsubscribe` | GET | 변조 토큰 / 정상 토큰 | 400 / 수신 해제됨 |

### 8.4 L2: UI Action Scenarios

| # | Page | Action | Expected |
|---|------|--------|----------|
| 1 | /login | 이메일 제출 → 코드 입력 | 명단 일치 시 /home 이동 |
| 2 | /login | 잘못된 코드 | 오류 메시지, 재시도 가능 |
| 3 | /library | 검색어 입력(한글 2자·3자 이상) | 결과가 필터링, 하이라이트 |
| 4 | /library | 기수 칩·카테고리 탭 조합 | 건수 변화 |
| 5 | /library/[id] | 다운로드 클릭 | 파일 다운로드 시작 |
| 6 | /admin/roster | CSV 업로드 → 확정 | 요약 표시, 명단 반영 |
| 7 | /me | 알림 토글 변경 | 저장 후 유지 |

### 8.5 L3: E2E Scenarios

| # | Scenario | Steps | Success |
|---|----------|-------|---------|
| 1 | 신규 졸업생 온보딩 | 운영진 명단 등록 → 회원 코드 로그인 → 홈 → 자료 열람·다운로드 | 승인 절차 없이 사용 |
| 2 | 미등록자 | 코드 로그인 → /pending → 신청 → 운영진 승인 → 접근 | 승인 후에만 자료 접근 |
| 3 | 자료 게시·알림 | 운영진 업로드 → 공개(알림) → 수신자 메일 → 링크로 상세 | 대상자에게만 1회 발송 |
| 4 | 권한 경계 | 재학생이 타 기수 URL 직접 접근 | 403 잠금 화면 |
| 5 | 모바일 | 390px 뷰포트에서 1~3 반복, PWA 설치 | 하단 탭·터치 영역 정상 |

### 8.6 Seed Data (dev)

| Entity | 최소 | 비고 |
|--------|:---:|------|
| cohorts | 3 | 1기(종료), 12기(종료), 17기(`is_active=true`) |
| 테스트 사용자 | 4 | 운영진, 재학생(17기), 졸업생(12기), 승인 대기 |
| resources | 12 | 기수·공용·미공개·카테고리·파일/링크 혼합 |
| announcements | 3 | 고정 1 포함 |

---

## 9. Clean Architecture (기능 모듈 단위)

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | 페이지·컴포넌트·훅 | `src/app/`, `src/features/*/components`, `src/components/` |
| **Application** | 로직이 있는 유스케이스만 | `src/features/*/services/` (roster CSV 검증, 알림 발송) |
| **Domain** | 타입·규칙 | `src/features/*/types`, `src/types/` |
| **Infrastructure** | 외부 서비스 | `src/lib/supabase/*`, `src/lib/email/resend.ts` |

### 9.2 Dependency Rules

`Presentation → Application → Domain ← Infrastructure` (기존 규칙 유지). 단순 조회(자료 목록 등)는 서비스 계층 없이 feature 훅이 Supabase 클라이언트를 직접 쓴다 — **로직이 없으면 계층을 만들지 않는다**.

### 9.3 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| OtpForm, ResourceList, KPICard … | Presentation | `src/features/*/components/` |
| `parseRosterCsv`, `sendNotificationJob` | Application | `src/features/admin/services/roster.ts`, `src/features/notifications/services/send.ts` |
| `Resource`, `Announcement`, `Member` 타입 | Domain | `src/features/*/types/` |
| Supabase/Resend 클라이언트 | Infrastructure | `src/lib/supabase/`, `src/lib/email/` |

---

## 10. Coding Convention Reference

`CLAUDE.md`의 규칙을 그대로 적용한다(컴포넌트 PascalCase, 유틸 camelCase, 폴더 kebab-case, import 순서, `NEXT_PUBLIC_`/서버 전용 변수 구분).

| Item | Convention Applied |
|------|-------------------|
| Component naming | PascalCase.tsx |
| File organization | `src/features/{module}/{components,hooks,services,types}` |
| State management | 서버 데이터는 TanStack Query, UI 상태는 로컬/Zustand 최소 사용 |
| Error handling | API는 §4.3 형식, UI는 §6 존댓말 카피 |
| Design Ref 주석 | 핵심 로직에 `// Design Ref: §{섹션}`, 성공기준에 `// Plan SC: …` |

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── app/
│   ├── (auth)/{login,pending}/
│   ├── (main)/{home,library,announcements,directory,me}/
│   ├── (admin)/admin/{roster,approvals,resources,announcements}/
│   ├── auth/callback/route.ts
│   └── api/{admin/roster/{preview,commit},admin/publish,resources/[id]/download,cron/notify,unsubscribe}/
├── features/{auth,library,announcements,notifications,directory,me,admin}/
│   └── {components,hooks,services,types}/
├── components/{layout,ui}/
├── lib/{supabase/{client,server,middleware,admin}.ts,email/resend.ts,utils.ts}
├── types/database.ts            # supabase gen types 결과
└── middleware.ts
supabase/migrations/001~006
supabase/migrations-archive/     # 기존 001/002 이동
scripts/migrate-drive/           # manifest 생성, 업로드
tests/{rls,e2e}/
```

### 11.2 Implementation Order

1. [ ] `.gitignore`(.env), dev/prod Supabase 프로젝트 준비, Resend 도메인 인증
2. [ ] 마이그레이션 001~006 작성·dev 적용, `gen types`, **L0 RLS 테스트 통과**
3. [ ] 인증(OTP)·콜백·middleware 가드·`/pending`
4. [ ] 명단 CSV import·승인 큐(관리자 최소 화면)
5. [ ] 앱 셸(v1 내비·토큰) → 자료 라이브러리 → 운영진 업로드
6. [ ] 드라이브 이전 스크립트 + 검수 → 공지
7. [ ] 알림(outbox·Resend·해제) → 디렉토리·프로필·설정
8. [ ] 관리자 통계 → PWA → 17기 파일럿
9. [ ] Vercel 배포·커스텀 도메인·500명 초대

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Plan Sprint | Estimated Turns |
|--------|-----------|-------------|:-----------:|:---------------:|
| Foundation & DB | `module-1` | 시크릿 정리, 마이그레이션 001~006, 타입 생성, RLS 테스트, 시드 | S1 | 40-50 |
| Auth & Roster | `module-2` | OTP 로그인·콜백·middleware·pending, 명단 CSV·승인 큐 | S1 | 40-50 |
| Library & Upload | `module-3` | 앱 셸, 자료 목록·검색·상세·다운로드, 운영진 업로드 | S2 | 45-55 |
| Migration & Notice | `module-4` | 드라이브 이전 스크립트·검수·일괄 공개, 공지 | S3 | 35-45 |
| Notify & Directory | `module-5` | 알림 outbox·Resend·해제, 디렉토리·프로필·설정 | S4 | 40-50 |
| Stats & PWA | `module-6` | 관리자 통계, PWA, 17기 파일럿 | S5 | 30-40 |
| Deploy | `module-7` | Vercel 배포·도메인·500명 초대·모니터링 | S6 | 20-30 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | 전체 (완료 중) | — |
| Session 2 | Do | `--scope module-1` | 40-50 |
| Session 3 | Do | `--scope module-2` | 40-50 |
| Session 4 | Do | `--scope module-3` | 45-55 |
| Session 5 | Do | `--scope module-4` | 35-45 |
| Session 6 | Do | `--scope module-5` | 40-50 |
| Session 7 | Do | `--scope module-6,module-7` | 50-70 |
| Session 8 | Check + Report | 전체 | 30-40 |

---

### 11.4 Do 단계 변경 기록 (구현 중 확정·변경된 사항)

| 모듈 | 항목 | Design | 구현 |
|------|------|--------|------|
| 1 | 006 시드 | dev 전용 | 1~17기 시드로 dev/prod 공통 |
| 1 | `activity_log.event` | 4종 | `visit`(하루 1회 접속) 추가 |
| 2 | 로그인 코드 | 6자리 | Supabase 설정값을 따름(`NEXT_PUBLIC_OTP_LENGTH`, dev는 8) |
| 2 | 링크 로그인 | `/auth/callback` | `/auth/confirm`(token_hash) 추가, callback은 OAuth 전용 |
| 3 | 자료 상세의 "권한 없음" | LockedResource 화면 | 없는 자료와 **같은 404 화면**(자료 존재 여부 노출 방지). 목록의 기수 칩은 잠금 표시 유지 |
| 3 | 업로드 진행률 | 진행률 표시 | "업로드 중" 표시(supabase-js 기본 업로드는 진행 이벤트가 없음). 실제 진행률이 필요하면 후속 개선 |
| 3 | 코드 열람 | 구문 강조 | 원문 표시 + 복사 버튼. 구문 강조는 v1.1 (YAGNI) |
| 3 | 저장 경로 | `{기수}/{uuid}/{파일명}` | `{기수}/{uuid}/file.{확장자}` — Storage가 한글 등 비ASCII 키를 거부할 수 있어 ASCII 고정, 표시·다운로드 이름은 제목에서 생성 |
| 3 | 다운로드 파일명 | — | SDK `createSignedUrl(download)` 옵션이 파일명을 이중 인코딩해 한글이 깨지는 것을 실측 확인 → 옵션 없이 서명 후 `download=` 를 직접 1회 인코딩해 부착 |
| 3 | 이메일 알림 체크박스 | 업로드 시 선택 | **비활성("준비 중")**. 알림 발송이 구현되기 전에 job 이 쌓이면 나중에 과거 자료가 한꺼번에 발송되므로, 업로드·일괄 공개는 `p_notify=false` |
| 3 | 방문 기록 | — | 앱 셸이 계정별 키(`ai4ceo:visit:{userId}`)로 하루 1회 `visit` 기록 |

| 4 | 홈 화면 | (모듈 배정 없음) | module-4에서 완성: 인사말·기수 배지, 고정 공지(최대 3, 고정이 부족하면 최신 공지로 채움), 최근 7일 새 자료, 내 기수 바로가기, 검색바 |
| 4 | 공지 본문 | 안전한 마크다운 | `react-markdown`. 원문 HTML·이미지 미허용, 위험 주소(`javascript:`)는 링크가 아닌 일반 글자, 링크는 새 창 + `noopener noreferrer nofollow` |
| 4 | 공지 게시 취소·삭제 | (명시 없음) | 게시 취소(`published_at=null`)와 삭제를 관리 화면에 제공. 게시는 `p_notify=false` (알림은 module-5 전까지 비활성) |
| 4 | 안 읽은 공지 배지 | 상단바 표시 | 내비게이션(사이드바·하단 탭) 배지. 페이지 이동 때마다 클라이언트에서 다시 세어 읽으면 바로 줄어듦 (최대 100건 기준 "99+") |
| 4 | 드라이브 이전 | 스크립트 + 검수 + 일괄 공개 | `npm run migrate:scan`(폴더→manifest.csv) / `migrate:import`(기본 미리보기, `--apply`로 실행). 오류가 하나라도 있으면 전체 중단, 성공 행은 `done`으로 기록해 재실행 안전, **항상 미공개로 등록**. 기수를 비워 두면 오류(실수로 공용이 되는 것을 방지). 영상·50MB 초과는 링크 행(`external_url`)으로 |
| 4 | 대량 공개 | 일괄 공개(알림 없음) | 목록에 "미공개 전체 선택", 8건씩 병렬 처리와 진행률 표시 |
| 5 | 이메일 알림 체크박스 | module-3 에서 비활성 | **활성화**(메일 서비스 설정 시). 미설정이면 비활성 + 안내 문구. 자료 "공개 + 알림", 공지 "게시 + 알림". 대량 일괄 공개는 계속 알림 없음 |
| 5 | 공개·알림 경로 | DB RPC 후 크론이 발송 | `/api/admin/publish` 가 RPC(`p_notify`)로 공개한 뒤 **같은 요청에서 즉시 발송**. 크론(`/api/cron/notify`, Vercel Hobby 는 하루 1회)은 실패·중단 건 재시도용 안전망. 결과는 `?n=…&s=…` 로 표시(허용된 코드·정수만 신뢰) |
| 5 | 발송 신뢰성 | 아웃박스 | 작업 낙관적 선점, 10분 넘게 `processing` 인 작업 회수, 최대 5회 재시도(백오프), 수신자별 `notification_deliveries` 로 중복 발송 방지 |
| 5 | 수신 해제 | 링크 클릭으로 해제 | **확인 페이지 → POST 로 해제**(메일 보안 스캐너가 링크를 미리 열어도 해제되지 않도록). HMAC 서명 토큰, `List-Unsubscribe` one-click 지원. `/unsubscribe` 는 로그인 없이 접근 가능(공개 경로). 종류(자료/공지)별로 해제 |
| 5 | 메일 제공자 | Resend | Resend + 개발용 `log` 제공자(`EMAIL_PROVIDER=log`, **운영 환경에서는 거부**). 제공자는 주입식이라 교체 가능 |
| 5 | 멤버 디렉토리 | 기수별 목록·검색 | `directory_members` RPC 사용, **이메일은 어디에도 노출하지 않음**. 기수 카드 → 기수별 목록, 이름·회사 검색 |
| 5 | 프로필 | 사진 업로드 포함 | **사진 업로드는 보류**(이니셜 아바타). 이름·회사·직책·소개·GitHub·LinkedIn·웹사이트 편집. 링크는 https 만, GitHub/LinkedIn 은 해당 도메인만 허용 |
| 5 | 관리자 대시보드 | 통계(module-6) | module-5 에서 명단·승인 카드 + 메일 상태 + 최근 발송 작업. MAU·인기 자료는 module-6 |
| 6 | 대시보드 KPI | 이달 MAU | **최근 30일** 접속자(달력 월이 아니라 롤링 30일 — `admin_stats` 기준). 활성 회원·가입 완료율·승인 대기와 함께 KPI 4개 |
| 6 | 차트 | 차트 라이브러리 | **라이브러리 없이 HTML/SVG**(막대·꺾은선·도넛). 서버 컴포넌트라 번들 증가 없음, 모든 차트는 숫자를 글자로도 표시. 주간 접속은 기록 없는 주를 0으로 채운 12주 |
| 6 | 모바일 비율 | 모바일 vs PC | 사람 수가 아니라 **접속 기록(횟수)** 기준(`activity_log.device`). 화면에 그렇게 표기 |
| 6 | PWA 아이콘 | — | `next/og` 생성은 Windows 개발 환경에서 폰트 경로 오류가 나서 **스크립트로 PNG 를 만들어 `public/icons/` 에 커밋**(`node scripts/generate-pwa-icons.mjs`). maskable(안전 영역) 포함 |
| 6 | 서비스 워커 | 오프라인 대응 | **오프라인 안내 페이지만** 제공: 페이지 이동이 네트워크 오류로 실패할 때 `/offline.html` 표시. 로그인 화면·자료·API 는 **캐시하지 않음**(공용 기기 정보 잔존·권한 변경 지연 방지). 운영 빌드에서만 등록. 미들웨어 matcher 에 `.js/.html` 추가 |
| 6 | 홈 화면 추가 안내 | PWA 설치 | `/me` 에 안내: Chrome 계열은 설치 버튼, iPhone Safari 는 공유→홈 화면에 추가, **카카오톡 등 iPhone 앱 내 브라우저는 Safari 로 열도록 안내** |
| 6 | 링크 로그인 복귀 주소 | — | `signInWithOtp` 에 `emailRedirectTo=/auth/callback` 추가 — 메일 템플릿이 기본값(링크만)이어도 링크 로그인이 앱으로 돌아온다 |
| 6 | 17기 파일럿 | 운영 계획 | `docs/05-ops/pilot-17th-cohort.md` — 준비 체크리스트, 초대문, 관찰 지표, 피드백 질문, Go/No-Go |

| Check | 입력 검증 | 화면(클라이언트)에서 검증 | **DB 제약으로 강제**(`008_input_constraints.sql`): 프로필 링크는 https 만·길이 제한(name 200, company/position 100, bio 500, URL 300), `resources.external_url` https 만, `avatar_url` 회원 수정 권한 회수. 저장은 브라우저→PostgREST 직접 호출이라 화면 검증은 우회 가능했다(보안 검토 C1/H1/M1/M3, `docs/03-analysis/`). 가입 트리거는 가입 메타데이터 이름을 200자로 자른다 |
| Check | 화면 렌더 방어 | — | `MemberCard` 가 링크를 렌더 직전에 https 재검사, `Avatar` 는 https 주소만 일반 `<img>`(Referer 미전송)로 표시 |
| Check | 알림 발송 4xx 처리 | 배치 4xx 시 건별 발송 | **반씩 나눠 다시 배치 발송해 문제 주소만 격리**(100통 중 1통 → 요청 약 15회). `deadlineAt`(45초)을 넘으면 새 묶음을 시작하지 않고 남은 사람은 기록 없이 다음 실행으로 이월 (Vercel 60초 제한 대비) |
| Check | 운영 환경 설정 오류 | — | 운영에서 Supabase 주소·키가 유효하지 않으면 미들웨어가 **503**(가드가 꺼진 채 일부만 동작하는 것을 방지). 개발은 기존처럼 통과 |
| Check | 보안 헤더 | — | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, CSP(`frame-ancestors`·`base-uri`·`form-action`·`object-src` 만) |
| Check | 관리자 대시보드 | — | 페이지에서 운영진 재확인, 작업별 발송 인원은 DB 건수 조회(N+1·5000행 로드 제거) |
| Check | `UNKNOWN_COHORT`(422) | §4.2 preview 오류 코드 | 없는 기수는 **행별 `invalid`** 로 표시(preview 는 200). 코드는 선언만 있고 사용하지 않는다 (§8.3 #2 는 두 방식 모두 허용) |
| Check | `resources.updated_at` | 항상 갱신 | 다운로드 수만 바뀌는 갱신에서는 `updated_at` 을 유지(목록 정렬이 튀지 않도록) — `004_functions.sql` 의 `resources_before_write` |
| Check | L1 API 테스트 | 8건 | `tests/api/api.test.ts`(로그인 사용자, `npm run test:api`)와 `tests/smoke/http.test.ts`(배포본, `npm run test:smoke`). L2·L3 는 브라우저 자동화 미도입 |
| Check | 회원 탈퇴 절차 | §7.3 문서화 | `docs/05-ops/privacy-deletion.md` |
| Check | 홈 로딩·/me 상태·자료 드래그앤드롭 | §5.4 체크리스트 | 구현 |

## 12. Open Items (Do 착수 전 결정·준비 필요)

| # | 항목 | 필요한 것 | 담당 |
|---|------|-----------|------|
| 1 | Supabase **dev / prod 프로젝트 2개** | 프로젝트 생성(리전: 서울 `ap-northeast-2` 권장). **기존 프로젝트는 Python RAG 앱과 공유 중**이라 포털 전용 dev 프로젝트를 새로 만드는 것을 권장 (Auth 사용자 풀·가입 트리거 분리) | 교수님 |
| 2 | Resend 계정·**발송 도메인**(SPF/DKIM) | 사용할 도메인 결정 | 교수님 |
| 3 | Vercel 플랜 | Hobby면 Cron 1일 1회 제한(§4.2) | 교수님 |
| 4 | 개인정보 수집·이용 동의 문구 | 문구 확정 | 교수님 |
| 5 | 명단 원본 | 이메일·이름·기수 CSV, 이메일 품질(개인/회사 혼용) 확인 | 교수님 |
| 6 | 재수강자(복수 기수) 처리 | v1은 단일 기수로 가정 — 해당자가 있는지 확인 | 교수님 |
| 7 | 공지 대상 세분화 | v1은 전체 공지만. 기수별 공지 필요 여부 | 교수님 |
| 8 | 커스텀 도메인 | 사용할 주소 | 교수님 |
| 9 | Claude Design N1~N10 시안 | N1에 **코드 입력 상태** 추가 필요(브리프 반영 완료) | 교수님 + Claude |
| 10 | Supabase 스토리지 파일 크기 한도 | 플랜별 한도 확인, 대용량 영상은 외부 링크 | Claude(Do 시) |
| 11 | ~~`007_signup_consent.sql` 적용~~ (완료) | SQL Editor에서 파일 하나 실행 (개인정보 동의 시각 기록). 적용 전에는 RLS 테스트 2건이 실패하는 것이 정상 | 교수님 |
| 12 | **이메일 코드 로그인 설정** | Supabase 대시보드에서 이메일 템플릿 교체, Site URL 설정, (권장) OTP 6자리 — `supabase/README.md` "이메일 코드 로그인 설정" | 교수님 |
| 13 | 개인정보 수집·이용 동의 문구 | 현재 로그인 화면은 임시 문구. `OtpForm.tsx`의 `PRIVACY_LABEL/DETAIL`만 교체 | 교수님 |
| 14 | 실제 메일 코드 로그인 시험 | 교수님 Gmail로 1회 (기본 SMTP는 팀 멤버 주소만 발송될 수 있음). `example.com` 주소는 Supabase가 코드 발송을 거절함 | 교수님 + Claude |
| 15 | **실제 알림 메일 발송 시험** | Resend 계정 + 발송 도메인(SPF/DKIM) + `RESEND_API_KEY`·`EMAIL_FROM` 등록. 지금까지는 개발용 `log` 제공자와 가짜 제공자 테스트로만 검증됨 | 교수님 + Claude |
| 16 | ~~`008_input_constraints.sql` 적용~~ (개발·운영 DB 모두 완료) | SQL Editor 에서 개발·운영 DB 각각 실행 (여러 번 실행해도 안전). 운영은 회원 초대 전에. 적용 전에는 `tests/rls/10-input-constraints` 가 실패하는 것이 정상 | 교수님 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-19 | Initial draft — Option C 선택, Supabase 빈 프로젝트 기준 스키마 재설계, RLS 결함 수정 | 장동인 교수 (with Claude) |
