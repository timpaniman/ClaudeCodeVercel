-- ============================================================
-- AI4CEO 졸업생 포털 v1 — 006_seed_cohorts
-- 1~17기를 등록한다. 17기만 재학(is_active=true), 나머지는 졸업.
-- 명단(roster)이 cohorts.id 를 참조하므로 명단 등록 전에 있어야 한다. dev/prod 공통.
-- 시작·종료일은 알 수 없어 비워 둔다 (관리자 화면에서 나중에 입력).
-- 새 기수 생성/종료 처리는 관리자 화면(cohorts 테이블 update)에서 한다.
-- ============================================================

insert into public.cohorts (number, name, is_active)
select n, n::text || '기', (n = 17)
  from generate_series(1, 17) as n
on conflict (number) do nothing;
