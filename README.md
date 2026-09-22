# Kevin Community 졸업생 포털

Kevin Community(KAIST AI대학원 CEO 과정) 졸업생·재학생을 위한 모바일 우선 웹 포털입니다.
수업 자료 라이브러리, 공지, 멤버 디렉토리, 이메일 알림을 제공합니다.

- **스택**: Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Auth / Postgres + RLS / Storage) · Resend · Vercel
- **로그인**: 비밀번호 없이 이메일로 받은 코드
- **권한**: 접근 제어의 기준은 DB의 RLS 정책입니다 (`supabase/migrations/`)

## 문서

| 문서 | 위치 |
|------|------|
| 기획 (Plan) | `docs/01-plan/features/ai4ceo-alumni-portal.plan.md` |
| 설계 (Design) | `docs/02-design/features/ai4ceo-alumni-portal.design.md` |
| 17기 파일럿 운영 | `docs/05-ops/pilot-17th-cohort.md` |
| Supabase 설정 | `supabase/README.md` |

## 시작하기

```bash
npm install
cp .env.example .env.local   # 값을 채운다 (Supabase 키 등). 실제 값은 절대 커밋하지 않는다
npm run dev                  # http://localhost:3000
```

데이터베이스는 `supabase/migrations/` 의 SQL 을 순서대로 적용합니다 (`npm run db:bundle` 로 한 파일로 묶을 수 있음).

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run typecheck` / `npm run lint` | 타입 검사 / 린트 |
| `npm run test:unit` | 단위 테스트 (외부 연결 없음) |
| `npm run test:rls` | RLS/DB 테스트 — **개발용 Supabase 프로젝트에만** 실행 (`.env.local` 필요) |
| `npm run migrate:scan` / `migrate:import` | 드라이브 자료 이전 (`scripts/migrate-drive/README.md`) |

## 보안

- `.env*` 파일은 커밋하지 않습니다 (`.env.example` 만 예외).
- `SUPABASE_SERVICE_ROLE_KEY` 는 서버 전용이며 RLS 를 우회합니다. 클라이언트 코드에 넣지 마세요.
