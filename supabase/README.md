# supabase/

AI4CEO 졸업생 포털 v1 데이터베이스. 설계: `docs/02-design/features/ai4ceo-alumni-portal.design.md` §3, §7.

> ⚠️ **공유 프로젝트 주의**: 현재 `.env.local`의 dev 프로젝트는 Python RAG 앱(`sessions`, `documents`, `messages`,
> `match_documents`)과 같이 쓰고 있다. 이 SQL은 v1 객체 이름만 지정해 변경하므로 그 앱의 테이블·함수는 건드리지 않지만,
> **`auth.users` 가입 트리거(`on_auth_user_created`)는 프로젝트의 모든 신규 가입에 적용**된다
> (그 앱이 만드는 계정도 `pending` 프로필이 생긴다). 가능하면 포털 전용 프로젝트를 새로 만들어 쓴다.

## 구성

| 경로 | 설명 |
|------|------|
| `migrations/001_core.sql` | 확장, enum, cohorts, profiles, roster |
| `migrations/002_content.sql` | resources, announcements, announcement_reads, activity_log |
| `migrations/003_notifications.sql` | notification_jobs, notification_deliveries (service role 전용) |
| `migrations/004_functions.sql` | 헬퍼 함수, 가입 트리거(명단 대조), RPC |
| `migrations/005_rls.sql` | 권한 회수, RLS 정책, 컬럼 권한, Storage 버킷·정책 |
| `migrations/006_seed_cohorts.sql` | 1~17기 (17기만 재학). dev/prod 공통 |
| `migrations-archive/` | 폐기된 초기 001/002 (Supabase에 적용된 적 없음) |
| `dev-reset.sql` | **dev 전용** 전체 삭제 후 재적용용 |
| `bundle/all.sql` | 위 6개를 합친 파일 (자동 생성, git 제외) |

## 적용 방법 (SQL Editor, CLI 불필요)

1. 번들 생성
   ```bash
   npm run db:bundle
   ```
2. Supabase 대시보드 → 해당 프로젝트 → **SQL Editor** → New query
3. `supabase/bundle/all.sql` 내용 전체를 붙여넣고 **Run**
4. 오류가 없으면 Table Editor에서 `cohorts`(17행), `profiles`, `roster` 등이 생겼는지 확인

> 오류가 나면 어느 파일(`-- >>>>>>>>>>` 구분선)에서 났는지 알려 주세요.
> dev에서 일부만 적용됐다면 `dev-reset.sql` 실행 후 처음부터 다시 적용합니다.

## 이메일 코드 로그인 설정 (대시보드에서 1회)

로그인은 비밀번호 없이 **메일로 받은 코드**로 한다 (메일의 “로그인” 버튼도 동작). 대시보드 메뉴 이름은 버전에 따라 조금 다를 수 있다.

1. **Authentication → URL Configuration**
   - Site URL: 개발 `http://localhost:3000` / 운영은 실제 도메인
   - Redirect URLs에 `http://localhost:3000/**` (운영 도메인도 추가)
2. **Authentication → Sign In / Providers → Email**
   - **Email OTP Length**: 현재 dev 프로젝트는 **8자리**. 사용자가 입력하기 쉽도록 **6자리**를 권장한다.
     바꾸면 `.env.local`의 `NEXT_PUBLIC_OTP_LENGTH`도 같은 값으로 맞춘다 (화면이 이 값을 따른다).
   - Enable Sign Ups / Confirm email은 켜 둔다 (명단에 없는 사람은 `pending` 으로 가입되어 승인 화면으로 간다).
3. **Authentication → Emails → Templates**
   - “Magic Link” 와 “Confirm signup” 두 템플릿을 `supabase/email-templates/` 의 HTML 로 각각 교체하고 Subject도 파일 상단대로 바꾼다.
     (`{{ .Token }}` = 코드, `{{ .TokenHash }}` = 링크용 토큰. 이 변수가 있어야 코드가 메일에 나온다.)
4. 기본 제공 SMTP는 발송 한도가 낮고 팀 멤버 외 주소로는 보내지 못할 수 있다. **졸업생 초대 전에 Resend SMTP 등 커스텀 SMTP를 연결**한다.

`007_signup_consent.sql` 은 가입 시 개인정보 동의 시각을 기록한다. 이미 `all.sql` 을 적용한 프로젝트에는
**007 파일만 SQL Editor에서 실행**하면 된다 (여러 번 실행해도 안전).

## RLS 테스트 (dev 프로젝트 전용)

`.env.local` 에 다음이 있어야 한다. **`SUPABASE_SERVICE_ROLE_KEY`는 Supabase 대시보드 → Project Settings → API
에서 직접 복사해 넣는다.** 이 키는 RLS를 우회하므로 절대 커밋하거나 클라이언트 코드에 넣지 않는다.

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

```bash
npm run test:rls           # 시드 → 테스트 실행
npm run test:rls:cleanup   # 테스트 계정·데이터 삭제 (dev-reset 전에 실행)
```

테스트 계정은 `rls-*@example.com` 이며 dev 프로젝트에만 만들어진다. 테스트는 `NEXT_PUBLIC_SUPABASE_URL`이
가리키는 프로젝트에서 실행되므로 **prod 프로젝트 URL로는 실행하지 말 것**.

## 운영(prod) 적용 시 주의

- `bundle/all.sql` 은 dev와 동일하게 적용하되 `dev-reset.sql`, 테스트 계정은 사용하지 않는다.
- 적용 후 첫 운영진은 `roster` 에 `role='admin'` 으로 교수님 이메일을 넣어 부트스트랩한다.
