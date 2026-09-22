# kevin-community-alumni-portal Planning Document

> **Summary**: Kevin Community(구 AI4CEO) 졸업생 약 500명이 카카오톡 단톡방·구글 드라이브 대신 사용하는 모바일 우선 웹 포털. v1 "자료 라이브러리 우선" 범위(M1~M6)를 구현·배포 완료했고, 이후 영어 기본 다국어화와 브랜드 개편(Kevin Community, 초록색)까지 반영해 운영 중이다.
>
> **Project**: ai4ceo1 (ai4ceo1-next) · Live: https://claude-code-vercel.vercel.app
> **Version**: 0.3.0
> **Author**: 장동인 교수 (with Claude)
> **Date**: 2026-09-19 (최초) → 2026-09-22 (최종 갱신)
> **Status**: **v1 구현·배포 완료** — 실제 500명 초대(운영 확산)는 대기 중. 상세는 "§0 현재 상태 요약" 참조
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)
> **Baseline**: [`../plan.md`](../plan.md) (v1.0, 2026-05-26)를 재검토·범위 축소한 v2 Plan
> **후속 Plan**: [`portal-i18n-en.plan.md`](./portal-i18n-en.plan.md) — 영어 기본 다국어화(이 문서의 범위 밖에서 추가 결정됨)

---

## §0 현재 상태 요약 (2026-09-22)

| 구분 | 상태 |
|------|------|
| **v1 모듈 (M1~M6)** | **완료·배포됨.** 명단·인증, 자료 라이브러리, 공지, 이메일 알림, 멤버 디렉토리·프로필, 관리자 통계·PWA |
| **Check/Act (품질 검증)** | 완료. 보안 검토 반영(저장형 XSS, 외부 아바타로 인한 전체 오류, 알림 발송 시간 초과 수정 등). 자체 재산정 Match Rate ≈ 91.8% — `docs/03-analysis/ai4ceo-alumni-portal.analysis.md`. **독립 재검증(gap-detector 재실행)은 아직 안 함** |
| **브랜드 개편** | 완료·배포됨. 이름 "AI4CEO" → **"Kevin Community"**, 브랜드색 인디고 → **초록**(`#16a34a`/`#22c55e`) |
| **영어 기본 다국어화** | 완료·배포됨. 영어 기본 + 한국어 전환(쿠키), 알림 메일도 수신자 언어별 발송. 상세: [`portal-i18n-en.plan.md`](./portal-i18n-en.plan.md) |
| **테스트** | 단위 291개, RLS/DB 92개+, API 7개, 스모크 14개 통과. 빌드·린트 오류 0 |
| **실기기(iOS/Android) 점검** | **안 함** (브라우저 에뮬레이션으로만 확인) |
| **드라이브 실제 이전** | **안 함** (스크립트는 완성, 17기 등 실제 자료 이전은 미실행) |
| **Resend 발신 도메인 인증** | **안 함** (테스트 발신 주소로 교수님 본인 메일만 발송 확인됨. 다른 수신자에게는 발송 불가) |
| **커스텀 도메인** | **안 함** (`claude-code-vercel.vercel.app` 그대로) |
| **개인정보 동의 문구 확정** | **안 함** (임시 문구 사용 중) |
| **졸업생 500명 실제 초대** | **안 함** |
| **Claude Design 시안** | 브리프만 작성됨([`design-brief-v2-en.md`](../../02-design/design-brief-v2-en.md)), 실제 시안 작업은 별도 세션에서 진행 예정 |

**정리**: 코드·인프라 관점의 v1은 끝났고 실제로 운영 중이다. 남은 일은 전부 **운영 준비(Resend 도메인, 명단, 드라이브 이전, 동의 문구, 실기기 점검, 도메인)**이며 코드 작업이 아니다.

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 졸업생 자료가 구글 드라이브에 흩어져 있어 새 자료를 찾고 받기 어렵고, 단톡방은 알림 피로로 중요 공지가 묻힌다. 기수 간 연결도 없고 모바일 접근이 불편하다. |
| **Solution** | 명단 기반 가입 + 기수/주차/주제별 자료 라이브러리 + 교수 공지 + 이메일 알림을 갖춘 웹/PWA를 Next.js·Supabase·Vercel로 먼저 출시(v1)하고, 피드·AI(RAG)·쇼케이스는 v1.1 이후로 미룬다. |
| **Function/UX Effect** | 졸업생은 스마트폰에서 이메일 링크 한 번으로 로그인해 기수별 자료를 검색·열람하고, 새 자료/공지는 이메일로 받는다. 교수/운영진은 드라이브 대신 한 곳에 업로드하고 사용 통계를 본다. |
| **Core Value** | "새 자료는 여기 있다"는 명확한 방문 이유를 먼저 만들어 500명을 한 곳으로 모은 뒤, 그 위에 커뮤니티와 AI를 쌓는다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 졸업생 자료·공지가 드라이브/단톡방에 흩어져 탐색과 알림이 안 된다. "새 자료는 여기 있다"는 방문 이유를 먼저 만든다. |
| **WHO** | 졸업생 약 500명 + 재학생 17기(40~60대 CEO, 모바일 위주), 교수·운영진 |
| **RISK** | 단톡방 이탈 저항 / RLS 오류로 인한 정보 노출·권한 상승 / 이메일 도달률 / 명단 이메일 불일치 / `.env` 키 유출 |
| **SUCCESS** | MAU 40%, 자료 접근시간 50% 단축, 모바일 60%, (제안) 1개월 내 가입 완료율 70%·드라이브 100% 이전, Match Rate 90% |
| **SCOPE** | v1 = M1~M6 + PWA + 드라이브 이전 + 배포. 피드·AI·쇼케이스·임팩트·질문함 제외 |

---

## 1. User Intent Discovery

### 1.1 Core Problem

졸업 후에도 새 자료를 전달해야 하는데 현재는 구글 드라이브 링크를 단톡방에 던지는 방식이라 (1) 자료 탐색·버전 관리가 안 되고 (2) 단톡방 알림 피로로 공지가 누락되며 (3) 모바일에서 불편하다. v1의 핵심 가치는 **자료 라이브러리**다(Brainstorming Q1).

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|-----------|---------------|----------|
| 졸업생 (1~16기, 약 500명) | 이동 중 스마트폰으로 수시 접속 | 새 자료 알림, 빠른 검색·열람, 기수 간 명단 확인 |
| 재학생 (17기) | 수업 중/후 | 본 기수 강의 자료, 공지 |
| 교수·운영진 | 자료 업로드·공지·명단 관리 | 한 곳에 업로드, 명단 일괄 등록, 사용 통계 |

### 1.3 Success Criteria

기존 `plan.md` KPI를 유지하고, 출시 직후 판단용 지표를 추가한다. (※ 추가 지표의 수치는 **제안값**이며 Design 착수 전 확정 필요)

- [ ] MAU: 졸업생의 40% 이상 (기존 KPI)
- [ ] 자료 접근 시간: 구글 드라이브 대비 50% 단축 (기존 KPI)
- [ ] 모바일 접속 비율 60% 이상 (기존 KPI)
- [ ] (제안) 출시 후 1개월 내 명단 대비 가입 완료율 70% 이상
- [ ] (제안) 기존 드라이브 자료 100%가 기수/주차 메타데이터와 함께 이전됨

### 1.4 Constraints

| Constraint | Details | Impact |
|------------|---------|--------|
| 개인정보 | 500명의 이메일·회사·직책 보유 → 개인정보 수집·이용 동의 및 비공개 접근 필요 | High |
| 자료 저작권 | 외부 저작물 포함 가능성 → 업로드 시 동의/출처 표기 | Medium |
| 사용자 특성 | CEO — 비밀번호·복잡한 가입 절차에 취약, 모바일 위주 | High |
| 1인 운영 | 교수님 1인 + 소수 운영진 → 운영 부담이 낮아야 함 | High |
| 기술 스택 고정 | Supabase(DB), Vercel(배포), Claude Design(handoff), bkit PDCA | Medium |

---

## 2. Alternatives Explored

### 2.1 Approach A: 라이브러리 우선 슬라이스 — Selected

| Aspect | Details |
|--------|---------|
| **Summary** | 명단 기반 로그인 + 자료 라이브러리 + 드라이브 이전 + 교수 공지 + 이메일 알림을 먼저 배포. 피드·AI는 v1.1 이후 |
| **Pros** | 가장 빨리 배포 가능, 첫날부터 쓸 이유(자료)가 있음, 콜드스타트·모더레이션 부담 없음 |
| **Cons** | 초기에는 양방향 소통이 약해 단톡방을 즉시 끄기는 어려움 |
| **Effort** | Medium |
| **Best For** | 17기를 파일럿으로 삼아 졸업생 500명에게 단계적으로 확산 |

### 2.2 Approach B: 라이브러리 + 커뮤니티 피드 동시 (기존 Sprint 1~3)

| Aspect | Details |
|--------|---------|
| **Summary** | 기존 로드맵대로 피드까지 함께 출시 |
| **Pros** | 단톡방 완전 대체에 가장 가까움 |
| **Cons** | 범위 약 2배, 배포 지연, 빈 피드 콜드스타트, 모더레이션·실시간·알림 동시 필요 |
| **Effort** | High |
| **Best For** | 단톡방을 즉시 종료해야 하는 경우 |

### 2.3 Approach C: 라이브러리 + AI(RAG) 결합

| Aspect | Details |
|--------|---------|
| **Summary** | 자료 업로드와 동시에 Claude Q&A 제공 |
| **Pros** | 가장 강한 차별점 |
| **Cons** | 자료가 쌓이기 전 품질 검증 곤란, 비용 한도·pgvector 튜닝이 v1에 포함 |
| **Effort** | High |
| **Best For** | 자료가 충분히 축적된 뒤(v1.1) |

### 2.4 Decision Rationale

**Selected**: Approach A
**Reason**: 가장 명확한 pain(자료 전달)을 가장 작은 범위로 해결하고, 자료 축적 → 그 위에 AI(RAG)와 커뮤니티를 얹는 순서가 콜드스타트 위험과 비용을 최소화한다. 기존 로드맵에서 "드라이브 이전"이 마지막(Sprint 7)이었으나, 자료가 비어 있으면 v1의 가치가 없으므로 앞당긴다.

---

## 3. YAGNI Review

### 3.1 Included (v1 Must-Have)

- [x] 명단(CSV) 기반 가입·로그인, 기수/역할 자동 부여 (M1)
- [x] 자료 라이브러리: 업로드, 기수·주차·주제 분류, 검색, PDF·영상·코드 열람 (M2)
- [ ] 구글 드라이브 자료 일괄 이전 + 교수님 검수 — 스크립트만 완료, 실행은 대기
- [x] 교수/운영진 공지 (읽기 전용 회원) (M3)
- [x] 새 자료/공지 이메일 알림 + 수신 설정 (M4) — *사용자 선택*
- [x] 기수별 멤버 디렉토리 + 내 프로필 (M5) — *사용자 선택*
- [x] 관리자 사용 통계 대시보드 (M6) — *사용자 선택*
- [x] PWA 홈화면 설치 — *사용자 선택*

### 3.2 Deferred (v1.1+ Maybe)

| Feature | Reason for Deferral | Revisit When |
|---------|---------------------|--------------|
| F2 커뮤니티 피드·댓글·좋아요·실시간 | 콜드스타트, 모더레이션 부담 | v1 안정화 후 회원 요청이 쌓일 때 |
| F4 AI 학습 도우미 (LangChain + Claude RAG, pgvector) | 자료가 먼저 축적되어야 품질 검증 가능, 비용 관리 필요 | 라이브러리 자료 충분 시(모델 ID는 그때 `claude-opus-5` 등 최신으로 확정) |
| F9 프로젝트 쇼케이스 | 필수 방문 이유가 아님 | 디렉토리 활성화 후 |
| F10 임팩트 스토리 | 콘텐츠 수집 필요 | 피드/쇼케이스 이후 |
| F11 교수 직통 질문함 | AI(RAG)와 연계 설계 | AI 단계와 함께 |
| 자료 즐겨찾기, 졸업 인증서, 다크모드 | 핵심 가치와 무관 | 사용자 요청 시 |

### 3.3 Removed (Won't Do)

| Feature | Reason for Removal |
|---------|-------------------|
| 관리자의 500명 수동 가입 승인 | 명단 자동 매칭으로 대체(미등록자만 승인 큐) |
| 실시간 화상 회의, 결제, 네이티브 앱, LMS 채점 | 기존 plan.md 범위 외 유지 |

---

## 4. Scope

### 4.1 In Scope

- [ ] M1 명단·인증: CSV 명단 등록, 이메일 매직링크(+선택적 Google), 명단 매칭 자동 승인, 미등록자 승인 큐
- [ ] M2 자료 라이브러리: 업로드(운영진), 필터, 검색, 열람/다운로드, 다운로드 수 집계
- [ ] M3 공지: 운영진 작성, 상단 고정, 읽음 표시
- [ ] M4 알림: 새 자료/공지 이메일 발송, 수신 on/off
- [ ] M5 디렉토리·프로필: 기수별 멤버 목록, 내 프로필 편집
- [ ] M6 관리자: 자료·명단 관리, 사용 통계(MAU, 인기 자료, 모바일 비율)
- [ ] 공통: 반응형 레이아웃, PWA, RLS 전 테이블 적용
- [ ] 구글 드라이브 이전 스크립트 + 검수 절차
- [ ] Vercel 프로덕션 배포

### 4.2 Out of Scope

- 커뮤니티 피드/댓글/좋아요/실시간 — (YAGNI, v1.1+)
- AI 학습 도우미(LangChain, Claude, pgvector, 임베딩) — (YAGNI, v1.1+)
- 프로젝트 쇼케이스, 임팩트 스토리, 교수 직통 질문함 — (YAGNI, v1.1+)
- 자료 즐겨찾기, 졸업 인증서, 다크모드 — (YAGNI)
- 결제, 화상회의, 네이티브 앱, LMS 채점 — (원 plan 범위 외)

---

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 운영진이 명단 CSV(이메일, 이름, 기수)를 업로드·검증·수정할 수 있다 | High | **Done** |
| FR-02 | 회원은 비밀번호 없이 이메일 코드/링크로 로그인한다 (Google 로그인은 선택, 기본 꺼짐) | High | **Done** |
| FR-03 | 로그인 시 명단과 대조해 기수·역할(재학생/졸업생)을 자동 부여하고 즉시 사용 가능하게 한다 | High | **Done** |
| FR-04 | 명단에 없는 가입자는 '승인 대기'가 되며 운영진이 승인/거절한다 | High | **Done** |
| FR-05 | 운영진이 자료를 업로드하고 기수·주차·주제·태그·설명을 입력한다 (브라우저→Storage 직접 업로드) | High | **Done** |
| FR-06 | 회원은 자료를 기수·주차·주제로 필터링하고 최신순으로 볼 수 있다 | High | **Done** |
| FR-07 | 회원은 제목·태그·설명을 한글 포함 키워드로 검색할 수 있다 | High | **Done** |
| FR-08 | PDF 미리보기, 영상 링크 임베드, 코드 파일 보기/다운로드를 지원한다 | Medium | **Done** |
| FR-09 | 열람 권한: 졸업생=전 기수, 재학생=본 기수+공용, 승인 대기=없음, 업로드·수정=운영진 (RLS + 서명 URL) | High | **Done** |
| FR-10 | 운영진이 공지를 작성·고정하고, 회원은 읽음 상태를 볼 수 있다 | High | **Done** |
| FR-11 | 새 자료/공지 등록 시 수신 동의 회원에게 이메일을 발송하고 링크로 해당 항목에 이동시킨다 | High | **Done** |
| FR-12 | 회원이 이메일 알림 수신 여부를 설정할 수 있다 | Medium | **Done** |
| FR-13 | 회원은 기수별 멤버 디렉토리를 볼 수 있다 (공개 범위: 로그인 회원만, 이메일 비노출) | Medium | **Done** |
| FR-14 | 회원은 내 프로필(회사·직책·링크)을 편집한다 | Medium | **Done** |
| FR-15 | 열람·다운로드·접속을 `activity_log`에 기록하고 관리자 대시보드에 MAU, 인기 자료, 모바일 비율을 표시한다 | Medium | **Done** |
| FR-16 | 홈 화면 설치(PWA manifest, 아이콘, 오프라인 폴백 페이지)를 지원한다 | Medium | **Done** |
| FR-17 | 구글 드라이브 자료를 폴더명(기수/주차) 기반 메타데이터 CSV로 매핑해 일괄 업로드하고, 공개 전 운영진 검수를 거친다 | High | **스크립트 완료 / 실제 이전 미실행** — `npm run migrate:scan` / `migrate:import` 준비됨, 17기 등 실제 자료 이전은 교수님 운영 작업으로 남음 |

### 5.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 모바일 페이지 로드 < 2초, Lighthouse 모바일 90+ | Lighthouse, Vercel Analytics |
| Mobile | iOS Safari, Android Chrome 완전 지원 (반응형 + PWA) | 실기기 수동 점검 |
| Security | 전 테이블 RLS, 파일은 서명 URL, API 키는 서버 전용, `.env` git 제외 | RLS 정책 테스트, 시크릿 스캔 |
| Privacy | 개인정보 수집·이용 동의 기록, 디렉토리는 로그인 회원 한정 | 가입 플로우 점검 |
| Scalability | 500명 → 2,000명 확장 가능 | 부하 점검(Supabase pooling) |
| Deliverability | 이메일 발송 500건 배치, 수신거부 링크 포함 | 발송 로그, 스팸함 도달 점검 |

---

## 6. Success Criteria

### 6.1 Definition of Done

- [x] FR-01 ~ FR-16 구현. FR-17은 스크립트까지 구현(실제 이전 실행은 운영 작업으로 남음)
- [x] RLS 정책 테스트 통과 (졸업생/재학생/승인대기/운영진 4개 역할 — `npm run test:rls`, 92개+)
- [ ] 17기 파일럿 사용자 실기기(iOS/Android) 점검 완료 — 브라우저 에뮬레이션만 확인, 실기기 미점검
- [ ] 드라이브 자료 이전 및 교수님 검수 완료 — 스크립트만 준비됨
- [x] Vercel 프로덕션 배포 (`claude-code-vercel.vercel.app`) — **커스텀 도메인 연결은 안 함**

### 6.2 Quality Criteria

- [x] Gap 분석 Match Rate 90% 이상 — Check 단계 자체 재산정 ≈91.8% (`docs/03-analysis/ai4ceo-alumni-portal.analysis.md`). **독립된 gap-detector 재실행으로 확인되지는 않음**
- [x] Lint 오류 0, 타입 체크·빌드 성공 (지속적으로 확인됨)
- [ ] Lighthouse 모바일 90+ — 측정 안 함

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 단톡방 이탈 저항 | High | High | 단톡방에 새 자료 링크를 병행 공지 → 점진 이전, 이메일 알림으로 재방문 유도 |
| `.env`가 `.gitignore`에 없음 (실제 API 키 포함) | High | Medium | Do 첫 작업으로 `.gitignore` 수정, 키 회전 검토, Vercel 환경변수 사용 |
| 명단 이메일 불일치(개인/회사 메일 혼용) | Medium | High | 명단 검증 화면, 미등록자 승인 큐, 이메일 별칭 지원 검토 |
| 개인정보 이슈 | High | Low | 동의 기록, 디렉토리 로그인 한정, 최소 수집 |
| 이메일 스팸함 분류 | Medium | Medium | 전용 발송 도메인(SPF/DKIM), 사전 안내 |
| 기존 마이그레이션 적용 여부 불명 | Medium | Medium | Design 단계에서 Supabase 프로젝트 상태 확인 후 003 마이그레이션 설계 |
| 자료 저작권 | Medium | Low | 업로드 시 출처/동의 체크 |
| Design 미완료 화면 | Medium | High | 아래 8.5 참조 — 공지·관리자 화면 디자인 보완 |

---

## 8. Architecture Considerations

### 8.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static sites, portfolios, landing pages | |
| **Dynamic** | Feature-based modules, BaaS integration (bkend.ai) | Web apps with backend, SaaS MVPs, fullstack apps | ✅ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems, complex architectures | |

> 기존 `ai4ceo1/.bkit-memory.json` level = dynamic 유지. 백엔드는 bkend.ai가 아니라 **Supabase**를 사용한다.

### 8.2 Key Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 로그인 | 비밀번호 / 소셜 / 매직링크 | 이메일 매직링크 (+Google 선택) | CEO 친화, 비밀번호 관리 부담 없음 |
| 가입 승인 | 수동 승인 / 명단 자동 매칭 | 명단 자동 매칭 + 미등록자 승인 큐 | 500명 수동 승인 불가 |
| 검색 | pgvector / Postgres 전문검색 | pg_trgm (한글) | v1은 키워드 검색으로 충분, 벡터는 AI 단계에서 |
| AI 스택 | v1 포함 / 보류 | 보류 (v1.1) | 콜드스타트·비용, 자료 축적 우선 |
| AI 모델 | claude-opus-4-7 (기존 plan) / 최신 | v1.1에서 확정 (`claude-opus-5` 등 최신 검토) | 기존 plan의 모델 ID는 최신이 아님 |
| 프레임워크 | Next.js 14 유지 / 15 업그레이드 | 14.2.35 유지 | 기존 코드 재사용, 업그레이드는 별도 |
| 이메일 발송 | Resend / Supabase SMTP / 기타 | Resend 후보 (Design에서 확정) | 배치 발송·도메인 인증 용이 |
| 배포 | Vercel + Supabase | 동일 | 기존 결정 |
| 디자인 | Claude Design handoff | `docs/02-design/claude-design/` 재사용·보완 | 이미 산출물 존재 |

### 8.3 Component Overview

```
[모바일/PC 브라우저 · PWA]
        │ HTTPS
[Vercel · Next.js 14 App Router]
  ├ (auth)   로그인 · 매직링크 콜백
  ├ (main)   자료 라이브러리 · 공지 · 멤버 디렉토리 · 내 프로필
  ├ (admin)  자료 업로드/관리 · 명단(CSV) · 사용 통계
  └ api/     명단 검증 · 이메일 알림 발송 (서버 전용)
        │
[Supabase]
  ├ Auth      이메일 매직링크 (+Google)
  ├ Postgres  profiles · cohorts · cohort_members · resources · notifications (기존)
  │           roster · announcements · activity_log (신규, 003 마이그레이션)
  │           * 전 테이블 RLS. posts/comments/projects/impact_stories/ask_questions/ai_conversations는 보류(UI·API 없음)
  ├ Storage   자료 파일 (서명 URL)
  └ 검색      pg_trgm
[Resend 등] 새 자료·공지 이메일 알림
```

| 모듈 | 내용 | 데이터 | 상태 |
|------|------|--------|------|
| M1 명단·인증 | CSV → 매직링크 → 명단 대조 → 기수·역할 자동 부여 | roster, profiles, cohort_members | 신규 + 트리거 수정 |
| M2 자료 라이브러리 | 필터·검색·열람·다운로드 집계 | resources, Storage | 기존 확장 |
| M3 공지 | 운영진 작성, 고정, 읽음 | announcements | 신규 |
| M4 알림 | 이메일 발송, 수신 설정 | notifications, profiles 컬럼 | 기존 + 컬럼 |
| M5 디렉토리·프로필 | 기수별 멤버, 프로필 편집 | profiles, cohort_members | 기존 |
| M6 관리자 | 업로드·명단·통계 | activity_log | 신규 |

### 8.4 Data Flow

```
① 가입·로그인
  교수: 명단 CSV 업로드 → roster
  회원: 이메일 입력 → 매직링크 → 클릭 → auth 계정 생성 → 트리거가 roster 조회
    ├ 있음 → profiles(role·기수) + cohort_members 자동 생성 → 즉시 사용
    └ 없음 → '승인 대기' → 관리자 승인 큐

② 자료 업로드·열람
  운영진: 파일 → 브라우저에서 Storage 직접 업로드 → resources 행(기수·주차·주제·태그) → 알림 대기열
  회원: 목록/검색 → RLS 권한 검사 → 서명 URL 열람/다운로드 → activity_log → 관리자 통계

③ 이메일 알림
  resources/announcements 등록 → notifications 행 → 서버가 수신 동의 회원에게 배치 발송(500명, 속도 제한 준수)
  → 메일 링크 → 해당 자료/공지 (로그인 유지)

④ 드라이브 이전 (일회성)
  드라이브 폴더 → 로컬 다운로드 → 폴더명(기수/주차) → 메타데이터 CSV 매핑 → 일괄 업로드 스크립트 → 운영진 검수 → 공개
```

**열람 권한 (확정)**: 졸업생 = 전 기수, 재학생 = 본 기수 + 공용, 승인 대기 = 없음, 업로드·수정 = 운영진.

### 8.5 Design Gap (Claude Design handoff 재사용 시 보완 필요)

`docs/02-design/handoff-checklist.md` 기준:
- 재사용 가능: 01-auth, 04-resources, 09-cohorts, 10-profile, 00-landing
- **보완 필요**: 11-admin은 디자인 ⬜ 미완료, **공지(M3) 전용 화면 없음**, 명단 CSV 업로드·승인 큐·통계 대시보드 화면 없음, 이메일 수신 설정 UI 없음
- v1 범위 밖 화면(02-home-feed 등)은 `docs/02-design`에 보류로 표시

---

## 9. Convention Prerequisites

### 9.1 Applicable Conventions

- [x] 기존 프로젝트 컨벤션 확인 (`CLAUDE.md`: PascalCase 컴포넌트, camelCase 유틸, kebab-case 폴더, Clean Architecture, `NEXT_PUBLIC_` / 서버 전용 환경변수 규칙)
- [x] 폴더 구조 확인 (`src/app/(auth)|(main)`, `src/components/`, `src/lib/supabase/`)
- [ ] `(admin)` 라우트 그룹 및 `features/` 모듈 구조를 Design에서 확정
- [ ] `.gitignore`에 `.env` 추가 (Do 첫 작업)

---

## 10. Next Steps

> M1~M6 구현·Check/Act·배포는 완료됐다. 아래는 실제 운영 확산을 위해 **교수님이 하실 운영 작업**과, 남은 **선택적 코드 작업**이다.

### 10.1 운영 작업 (코드 아님, 교수님)
1. [ ] Resend 발신 도메인(SPF/DKIM) 인증 — 지금은 교수님 본인 메일만 발송 확인됨
2. [ ] 개인정보 수집·이용 동의 문구 확정 (현재 임시 문구)
3. [ ] 17기 명단 CSV 준비·등록, 드라이브 자료 실제 이전 실행(`migrate:scan` → 검수 → `migrate:import`)
4. [ ] 17기 파일럿 진행 — 절차는 [`docs/05-ops/pilot-17th-cohort.md`](../../05-ops/pilot-17th-cohort.md)
5. [ ] 실기기(iOS/Android) 점검, Lighthouse 측정
6. [ ] 커스텀 도메인 연결 (선택)
7. [ ] 파일럿 결과를 보고 졸업생 1~16기로 확산

### 10.2 남은 코드 작업 (선택)
1. [ ] 독립적인 Gap 분석 재실행(`gap-detector`)으로 Match Rate 재확인
2. [ ] Claude Design에서 나온 시안을 코드에 반영 — 브리프: [`design-brief-v2-en.md`](../../02-design/design-brief-v2-en.md)
3. [ ] L2(UI)·L3(E2E) 자동 테스트 도입 — [`portal-i18n-en.plan.md`](./portal-i18n-en.plan.md) §6 위험 참고

### 10.3 (참고) 처음 세운 개발 순서 — 완료됨
| Sprint | 내용 | 결과 |
|--------|------|------|
| S1 Foundation & Auth | `.gitignore`/시크릿 정리, 마이그레이션, M1 명단·인증 | 완료 |
| S2 Library | M2 자료 라이브러리 + 운영진 업로드 | 완료 |
| S3 Migration & Notice | 드라이브 이전 스크립트, M3 공지 | 스크립트만 완료 |
| S4 Notify & Directory | M4 이메일 알림, M5 디렉토리·프로필 | 완료 |
| S5 Admin & PWA | M6 통계, PWA | 완료 (17기 파일럿은 미실행) |
| S6 Deploy | Vercel 배포 | 배포 완료, 커스텀 도메인·500명 초대는 미실행 |

---

## Appendix: Brainstorming Log

> Key decisions from Plan Plus Phases 0-4.

| Phase | Question | Answer | Decision |
|-------|----------|--------|----------|
| Context | 기존 작업 확인 | `ai4ceo1`에 plan.md, Claude Design, 스키마/RLS, 로그인·피드 일부 존재 | 기존 Plan 재검토 후 이어가기 |
| Intent | v1의 첫 번째 핵심 가치는? | 자료 라이브러리 | 자료 중심 v1 |
| Alternatives | A 라이브러리 우선 / B +피드 / C +AI | A | 최소 범위로 먼저 배포, 드라이브 이전 앞당김 |
| YAGNI | 핵심 4종 외 추가 | 이메일 알림, PWA, 멤버 디렉토리+프로필, 관리자 통계 모두 선택 | v1 범위에 포함, 피드·AI·쇼케이스 등은 v1.1+ |
| Design 1 | 아키텍처 개요 | 승인 | 명단 기반 가입, AI 보류, 기존 코드 재사용 |
| Design 2 | 모듈 M1~M6, 신규 테이블 3개 | 승인 | roster, announcements, activity_log |
| Design 3 | 데이터 흐름 ①~④, 열람 권한 | 승인 | 졸업생 전 기수 / 재학생 본 기수+공용 / 업로드 운영진 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-19 | Initial draft (Plan Plus) — 기존 plan.md v1.0을 v1 범위로 축소·재정렬 | 장동인 교수 (with Claude) |
| 0.2 | 2026-09-19 | Plan 승인, Context Anchor 추가. Design 단계에서 확정된 변경(보류 테이블 미생성, `cohort_members` 제거, 역할 파생, OTP 코드 로그인, dev/prod 분리 등)은 [Design §1.3](../../02-design/features/ai4ceo-alumni-portal.design.md) 참조 | 장동인 교수 (with Claude) |
| 0.3 | 2026-09-19~22 | **M1~M6 구현, Check/Act(보안 수정), Vercel 배포 완료.** 이후 별도 결정으로 (1) 영어 기본 다국어화([`portal-i18n-en.plan.md`](./portal-i18n-en.plan.md), 회원 언어 선택 저장을 위한 `009_profile_locale.sql` 포함) (2) 브랜드명 "AI4CEO" → **"Kevin Community"**, 브랜드색 인디고 → **초록**으로 개편. 모두 배포 완료. 남은 항목은 §0·§10 참조 | 장동인 교수 (with Claude) |
