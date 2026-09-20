# AI4CEO 졸업생 포털 — Check 단계 분석 (v1, module 1~6)

- 분석일: 2026-09-20
- 방법: bkit `gap-detector`(설계-구현 갭 분석)와 `code-analyzer`(보안·품질)를 독립 검토자로 실행 → 핵심 주장은 **직접 재현·코드로 재확인**한 뒤 반영
- 한계: 검토자는 코드를 읽기만 했고 테스트를 실행하지 않았다. 아래 "재현 확인"은 개발 DB(테스트 계정)에서 직접 실행한 결과다. 운영 DB에는 적용 전이다.

## 1. 설계 대비 일치율 (gap-detector)

산식: (Done + 0.5 × Partial) / Total

| 영역 | Total | Done | Partial | Missing | 일치율 |
|------|:---:|:---:|:---:|:---:|:---:|
| 데이터 모델·마이그레이션 (§3) | 26 | 25 | 1 | 0 | 98% |
| API·라우트 (§4) | 17 | 16 | 1 | 0 | 97% |
| UI 체크리스트 (§5.4) | 55 | 52 | 3 | 0 | 97% |
| 보안 (§7) | 32 | 30 | 1 | 1 | 95% |
| 테스트 계획 (§8) | 33 | 13 | 3 | 17 | 44% |
| 구현 가이드 (§11) | 7 | 6 | 1 | 0 | 93% |
| **합계** | **170** | **142** | **10** | **18** | **86.5%** |

목표(Plan §6.2)는 90%. **미달의 거의 전부가 "테스트 계획" 영역**(L1 API 8건·L2 UI 7건·L3 E2E 5건에 자동 테스트가 없었다). 기능 구현 자체(§3~§7, §11)는 95% 이상이다.
이미 §1.3·§11.4 에 기록된 의도적 변경 11건은 코드가 기록대로 구현되어 있음을 확인했고 갭으로 세지 않았다.

### 갭 → 조치

| # | 갭 | 조치 | 상태 |
|---|----|------|------|
| H1 | L1 API 테스트 없음 | `tests/api/api.test.ts`(로그인 사용자로 API 호출 7건: 명단 미리보기·권한 403·다운로드·수신 해제·cron) + `tests/smoke/http.test.ts`(배포본 스모크 14건) 추가. `npm run test:api`, `npm run test:smoke` | 완료 |
| H1 | L2(UI)·L3(E2E) 없음 | 브라우저 자동화 도구(Playwright 등) 미도입. 수동 시험은 `docs/05-ops/pilot-17th-cohort.md` 와 module 별 브라우저 검증으로 대체 | **미해결 (수용)** — 파일럿 전 도입 여부 판단 |
| M1 | 탈퇴·삭제 절차 문서 없음 | `docs/05-ops/privacy-deletion.md` 작성 (삭제 범위·순서·SQL) | 완료 |
| M2 | 자료 등록이 드래그앤드롭 아님 | 파일 영역에 드래그앤드롭 추가 | 완료 |
| M3 | /me "상태" 미표시 | 한 줄 추가 | 완료 |
| M4 | /home 로딩 스켈레톤 없음 | `(main)/home/loading.tsx` 추가 | 완료 |
| M5 | `UNKNOWN_COHORT` 코드가 선언만 있고 미사용 | 동작(행별 invalid)은 §8.3 #2 와 일치 → 설계서 §11.4 에 편차로 기록 | 완료(문서) |
| L2 | `updated_at` 조건부 갱신이 설계와 다름 | 설계서 §11.4 에 기록 | 완료(문서) |
| L3 | `app/page.tsx` 낡은 주석(/feed) | 수정 | 완료 |
| L1·L4 | 버튼 클래스 중복 / 기수 관리 화면 없음 | v1.1 후보로 기록 (기수 종료는 수동 SQL — `is_active=false` 전환이 열람 권한을 좌우) | 수용 |

## 2. 보안·품질 검토 (code-analyzer) — 재현 결과와 조치

| # | 발견 | 재현 확인 | 조치 |
|---|------|-----------|------|
| **C1** | 프로필 링크 값이 서버에서 검증되지 않아, 회원이 `website_url='javascript:…'` 를 저장하면 디렉토리에서 다른 회원(운영진 포함)이 클릭할 때 스크립트가 실행됨 (저장형 XSS) | **재현됨** — 개발 DB에서 테스트 계정으로 저장 성공, 디렉토리 RPC 가 그대로 반환 | ① DB 제약 `profiles_input_limits`(https 만, 길이) — **008 적용 필요** ② `MemberCard` 가 렌더 직전에 https 재검사 ③ 테스트 `tests/rls/10-input-constraints.test.ts` |
| **H1** | `avatar_url` 에 외부 주소를 저장하면 `next/image` 예외로 멤버 화면 전체가 500 | **재현됨**(저장은 성공). 500 은 코드 경로로 확인 | ① `avatar_url` 회원 수정 권한 회수(008) ② `Avatar` 를 일반 `<img>`(https 만, Referer 미전송)로 변경 — 화면에서 악성 값이 있어도 200 확인 |
| **H2** | 배치 4xx(주소 하나가 잘못됨) 시 100통을 하나씩 발송(통당 0.55초 대기) → Vercel 60초 초과, 작업이 `processing` 에 머묾 | **코드로 확인**. 다만 검토자가 말한 "중복 발송"은 과장 — 건별 발송에는 수신자별 멱등 키가 있어 재시도해도 중복되지 않음. 실제 위험은 **지연** | ① 배치 4xx 시 **반씩 나눠 다시 묶음 발송**해 문제 주소만 격리(100통 중 1통 문제 → 요청 약 15회) ② 시간 제한(`deadlineAt` 45초): 넘으면 새 묶음을 시작하지 않고 남은 사람은 기록 없이 다음 실행으로 이월 ③ 단위 테스트 5건 |
| M1 | 텍스트 컬럼 길이 제한 없음 + 디렉토리 전체 로드 | **재현됨**(bio 20만 자 저장·반환) | 길이 제약(008: bio 500 등)으로 응답 크기 상한 확보. 기수 카운트 전용 RPC 분리는 v1.1 후보 |
| M2 | 관리자 대시보드가 service role 사용 + N+1(작업당 최대 5000행) | 코드 확인 | 페이지에서 운영진 재확인 추가, 건수는 DB 가 세도록(head count) 변경 |
| M3 | `resources.external_url` https 강제 없음 | 코드 확인 | DB 제약 `resources_external_url_https`(008) + 테스트 |
| M4 | 레이트 리미팅 없음, 가입 공개(pending 계정 생성 가능) | 코드 확인 | **수용(v1)** — Supabase Auth 가 이메일·IP 당 OTP 발송 한도를 두고, 승인 전에는 데이터 접근 불가(RLS). 승인 대기 목록이 비정상적으로 늘면 조치. 재검토: 커스텀 SMTP 연결 후 |
| M5 | 보안 헤더 없음 | 확인 | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, CSP(`frame-ancestors`·`base-uri`·`form-action`·`object-src` 만 — 스크립트 출처는 제한하지 않음) 추가, 스모크 테스트로 확인 |
| L1·L2 | signout 의 Host 기반 URL, cron 시크릿 길이 비교 | — | 실익 낮아 v1 유지 |
| L3 | CSV 수식 인젝션 | — | 내보내기 경로가 없어 해당 없음 |

### 검토자가 코드로 확인한 정상 항목 (요약)
SECURITY DEFINER 함수 전부 `search_path=''`·내부 권한 재검사 / 프로필 role·status·cohort_id·email 수정 차단 / pending·rejected 격리(RLS) / open redirect 차단(`safeNext`) / 마크다운 XSS 차단(raw HTML·img 불허, `javascript:` 제거) / 메일 본문 이스케이프·헤더 인젝션 차단 / 수신 해제 HMAC + `timingSafeEqual` / cron 인증 / `log` 메일 발송기의 운영 차단 / 시크릿의 클라이언트 번들 미포함(**배포본 번들 11개를 직접 검사해도 service_role 없음**) / 다운로드 API 의 RLS 적용 / 알림 중복 방지 / 목록 상한.

## 3. 반영 후 재산정 (자체 계산 — 독립 재검증 아님)

- UI 3건 → Done, 데이터 모델·보안 각 1건 → Done, L1 API 시나리오 7건 → Done(#7 은 store 단위 검증으로 Partial 유지)
- Done 154 / Partial 4 / Missing 12 (합계 170) → (154 + 2) / 170 ≈ **91.8%**
- 남은 Missing 12건은 모두 L2(UI)·L3(E2E) 자동 테스트다.
- 배포·운영 DB 적용(008) 후 `gap-detector` 를 다시 실행해 독립적으로 확인하는 것을 권장한다.

## 4. 적용 순서 (운영)

1. 코드 배포(Vercel) — 새 코드는 008 없이도 동작한다(화면 방어가 먼저 걸림).
2. **`supabase/migrations/008_input_constraints.sql` 을 개발 DB 와 운영 DB 에 각각 실행** (여러 번 실행해도 안전, 기존 행은 `NOT VALID` 로 두고 마지막에 검증 시도).
3. 개발 DB 에 적용한 뒤 `npm run test:rls` 로 `10-input-constraints` 통과를 확인.
4. 운영 DB 는 실제 회원을 초대하기 **전에** 적용한다 (그 전에는 회원이 없어 노출 위험이 없다).
