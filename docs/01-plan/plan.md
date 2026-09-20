# AI4CEO 커뮤니티 플랫폼 — Plan

> **작성일**: 2026-05-26  
> **담당**: 장동인 교수  
> **버전**: v1.0  
> **방법론**: bkit PDCA (Dynamic Level)

---

## 1. 배경 및 문제 정의

### 현황
- AI 코딩 교육 과정: 연 2회 × 10주, 현재 17기 진행 중
- 졸업생 규모: 약 500명 (1기 ~ 16기 졸업 + 17기 재학)
- 현재 커뮤니케이션: 단톡방 (KakaoTalk 그룹)
- 현재 자료 공유: 구글 드라이브

### 문제점

| 문제 | 영향 |
|------|------|
| 단톡방 알림 피로 | 중요 공지 누락, 참여도 저하 |
| 구글 드라이브 분산 | 자료 탐색 어려움, 버전 관리 불가 |
| 기수 간 교류 없음 | 네트워킹 기회 손실 |
| 모바일 최적화 없음 | CEO 특성상 이동 중 접근 불편 |
| AI 학습 지원 없음 | 질문/답변 지연, 학습 연속성 단절 |

---

## 2. 목표

**핵심 목표**: 500명 AI4CEO 졸업생이 지속적으로 연결되고 학습할 수 있는 모바일 우선 커뮤니티 플랫폼 구축

### 성공 지표 (KPI)

| 지표 | 목표 |
|------|------|
| 월간 활성 사용자(MAU) | 졸업생의 40% 이상 |
| 자료 접근 시간 | 구글 드라이브 대비 50% 단축 |
| AI 질문 응답 시간 | 24시간 → 즉시 응답 |
| 모바일 사용 비율 | 60% 이상 |

---

## 3. 사용자 정의

| 역할 | 설명 | 주요 니즈 |
|------|------|-----------|
| 재학생 (현 기수) | 현재 교육 중인 CEO | 강의 자료, 질문, 과제 제출 |
| 졸업생 | 1기~16기 수료자 | 네트워킹, 최신 자료, AI 도우미 |
| 교수/운영진 | 장동인 교수 + 스태프 | 공지, 자료 업로드, 기수 관리 |
| 신규 입학 예정자 | 랜딩 페이지 대상 | 과정 소개, 졸업생 성과 확인 |

---

## 4. 핵심 기능 (11개)

### F1. 인증 시스템
- 이메일/소셜 로그인 (Supabase Auth)
- 기수별 가입 승인 (Admin 검토)
- 역할 기반 접근 제어 (RBAC): 재학생 / 졸업생 / 운영진
- → Design: [`docs/02-design/screens/01-auth.md`](../02-design/screens/01-auth.md)

### F2. 커뮤니티 피드
- 게시글 작성 (텍스트, 이미지, 링크)
- 댓글 / 답글 / 좋아요
- 기수별 채널 + 전체 채널
- 공지사항 고정
- 실시간 업데이트 (Supabase Realtime)
- → Design: [`docs/02-design/screens/03-community.md`](../02-design/screens/03-community.md)

### F3. 자료 라이브러리
- 기수별 강의 자료 (PDF, 영상 링크, 코드)
- 카테고리 분류 (주차별, 주제별)
- 검색 기능
- Supabase Storage 연동
- 졸업생용 아카이브
- → Design: [`docs/02-design/screens/04-resources.md`](../02-design/screens/04-resources.md)

### F4. AI 학습 도우미
- LangChain + Claude opus 4.7 기반 Q&A
- 강의 자료 RAG (Retrieval-Augmented Generation)
- 코딩 질문 전용 채팅
- 대화 히스토리 저장
- 기수별 맞춤 컨텍스트
- → Design: [`docs/02-design/screens/05-ai-chat.md`](../02-design/screens/05-ai-chat.md)

### F5. 기수 관리
- 기수 프로필 (1기 ~ n기)
- 기수별 멤버 디렉토리
- 진도 현황 (재학생용)
- 졸업 인증서 발급
- → Design: [`docs/02-design/screens/09-cohorts.md`](../02-design/screens/09-cohorts.md)

### F6. 사용자 프로필
- CEO 프로필 (회사, 직책, 기수)
- 포트폴리오/프로젝트 링크
- 활동 히스토리
- → Design: [`docs/02-design/screens/10-profile.md`](../02-design/screens/10-profile.md)

### F7. 알림 시스템
- 이메일 알림 (공지, 댓글, 자료 업로드)
- 인앱 알림
- 알림 설정 개인화
- → Design: Header 드롭다운 (Sprint 6)

### F8. 관리자 패널
- 사용자 관리 (가입 승인, 역할 변경)
- 기수 생성/관리
- 콘텐츠 모더레이션
- 사용 통계 대시보드
- → Design: [`docs/02-design/screens/11-admin.md`](../02-design/screens/11-admin.md)

### F9. AI 프로젝트 쇼케이스 ✨
- CEO가 만든 앱/서비스/자동화 공개 전시
- GitHub 링크, 라이브 데모 URL, 스크린샷 첨부
- 기수별·카테고리별(챗봇/RAG/자동화/분석) 필터
- 좋아요·댓글·스크랩 기능
- 프로필 포트폴리오 자동 연동
- → Design: [`docs/02-design/screens/06-showcase.md`](../02-design/screens/06-showcase.md)

### F10. 비즈니스 임팩트 스토리 ✨
- AI 도입 후 실제 성과 등록 (업무 단축률, 비용 절감, 매출 증가 등)
- 산업별·기수별 정렬 및 검색
- 수치 기반 임팩트 카드 UI (예: "월 40시간 절감")
- Claude가 스토리 요약 + 태그 자동 생성
- 신규 수강생 대상 동기부여 콘텐츠로 활용
- → Design: [`docs/02-design/screens/07-impact.md`](../02-design/screens/07-impact.md)

### F11. 교수 직통 질문함 (Ask the Professor) ✨
- AI가 답하기 어려운 전문 판단 질문 전용 채널
- 다른 회원 +1 투표 → 교수 우선 답변 큐 정렬
- 질문 상태 관리: 대기중 / 검토중 / 답변완료
- 답변 후 지식베이스 자동 등록 (F4 RAG에 반영)
- 기수별 자주 묻는 질문 아카이브
- → Design: [`docs/02-design/screens/08-ask-prof.md`](../02-design/screens/08-ask-prof.md)

---

## 5. 기술 스택

```
Frontend:   Next.js 14+ · TypeScript · Tailwind CSS · shadcn/ui
State:      TanStack Query · Zustand
Backend:    Supabase (PostgreSQL + Auth + Storage + Realtime)
AI:         LangChain · Claude opus 4.7 (claude-opus-4-7) · pgvector
Embedding:  text-embedding-3-small (OpenAI)
Design:     Claude design → Handoff (Mobile-first)
Deploy:     Vercel
```

---

## 6. 데이터 모델 (개요)

```
users            사용자 기본 정보 (Supabase Auth 연동)
profiles         CEO 프로필 상세
cohorts          기수 정보 (1기~n기)
cohort_members   기수-사용자 매핑
posts            커뮤니티 게시글
comments         댓글
resources        학습 자료 메타데이터
projects         AI 프로젝트 쇼케이스
impact_stories   비즈니스 임팩트 스토리
ask_questions    교수 질문함
ai_conversations AI 채팅 히스토리
notifications    알림
```

---

## 7. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 성능 | 페이지 로드 < 2초 (모바일) |
| 모바일 | iOS Safari, Android Chrome 완벽 지원 |
| 보안 | RLS (Row Level Security) 전체 적용 |
| 확장성 | 500명 → 2,000명 확장 가능 |
| 가용성 | 99.9% (Vercel + Supabase SLA) |

---

## 8. 범위 외 (v1.0)

- 실시간 화상 회의
- 결제 시스템
- 모바일 앱 (Native) — 웹앱으로 대체
- LMS 기능 (과제 채점 자동화)

---

## 9. 리스크

| 리스크 | 대응 방안 |
|--------|-----------|
| 기존 단톡방 이탈 저항 | 단계적 마이그레이션, KakaoTalk 연동 알림 |
| 500명 동시 접속 부하 | Supabase connection pooling, Vercel Edge |
| AI 응답 비용 | 사용량 캐싱, 일일 한도 설정 |
| 자료 저작권 | 업로드 시 동의 절차 |

---

## 10. 스프린트 로드맵

```
Sprint 1: Foundation       [인프라 + 인증 + DB 스키마]
Sprint 2: Community        [커뮤니티 피드 + 기수 채널]
Sprint 3: Resources        [자료 라이브러리 + Storage]
Sprint 4: AI Assistant     [LangChain + Claude RAG]
Sprint 5: Showcase+Impact  [쇼케이스 + 임팩트 스토리 + 교수 질문함]
Sprint 6: Admin + Polish   [관리자 패널 + 알림 + 프로필]
Sprint 7: Deploy           [최적화 + Vercel 배포 + 마이그레이션]
```

### Sprint 1: Foundation
**목표**: 프로젝트 기반 구축 — 인증, DB 스키마, 기본 레이아웃

- [ ] Next.js 14 프로젝트 초기화 (TypeScript + Tailwind + shadcn/ui)
- [ ] Supabase 프로젝트 연결 및 환경 설정
- [ ] DB 스키마 설계 및 마이그레이션
- [ ] Supabase Auth 연동 (이메일 + Google OAuth)
- [ ] RLS 정책 전체 설계
- [ ] RBAC 구현 (재학생/졸업생/운영진)
- [ ] 기본 레이아웃 (Header, Sidebar, Mobile Nav)
- [ ] 기수 가입 승인 플로우

### Sprint 2: Community Feed
**목표**: 단톡방 대체 — 게시글, 댓글, 기수 채널

- [ ] 커뮤니티 피드 UI (메인 타임라인)
- [ ] 게시글 CRUD (텍스트, 이미지)
- [ ] 댓글/답글 시스템 + 좋아요
- [ ] 기수별 채널 (1기~17기+) + 전체 채널
- [ ] 공지사항 고정 기능
- [ ] Supabase Realtime 구독
- [ ] 모바일 무한 스크롤

### Sprint 3: Resource Library
**목표**: 구글 드라이브 대체 — 자료 업로드, 검색, 아카이브

- [ ] 자료 업로드 UI (Supabase Storage 연동)
- [ ] 기수별 폴더 구조 + 주차/주제별 카테고리
- [ ] 전체 검색 (제목, 태그, 내용)
- [ ] PDF 미리보기 + 영상 링크 임베드
- [ ] 코드 스니펫 뷰어 (syntax highlight)
- [ ] 자료 즐겨찾기 + 졸업생 아카이브

### Sprint 4: AI Assistant
**목표**: AI 학습 도우미 — RAG 기반 Q&A, 코딩 도우미

- [ ] LangChain RAG 파이프라인 구성
- [ ] Supabase pgvector 임베딩 설정
- [ ] 강의 자료 임베딩 (기수별)
- [ ] Claude opus 4.7 API 연동
- [ ] 채팅 UI (스트리밍 응답)
- [ ] 대화 히스토리 저장/불러오기
- [ ] 기수별 맞춤 컨텍스트 주입
- [ ] 사용량 모니터링 + 비용 제한

### Sprint 5: Showcase + Impact + Ask Prof
**목표**: 차별화 핵심 기능 3종

- [ ] 프로젝트 쇼케이스 갤러리 (F9)
- [ ] 임팩트 스토리 등록 + Claude 태그 생성 (F10)
- [ ] 교수 질문함 + 투표 + 답변 플로우 (F11)
- [ ] 답변 → RAG 지식베이스 자동 반영

### Sprint 6: Admin + Polish
**목표**: 관리자 기능, 알림, 프로필, UX 완성도

- [ ] 관리자 대시보드 (사용자 통계, 활동 현황)
- [ ] 사용자 관리 (가입 승인, 역할 변경)
- [ ] 기수 생성/편집/아카이브
- [ ] 알림 시스템 (인앱 + 이메일)
- [ ] 사용자 프로필 편집 + 기수 디렉토리
- [ ] 다크모드 + PWA 설정

### Sprint 7: Deploy & Migration
**목표**: Vercel 배포, 성능 최적화, 기존 데이터 마이그레이션

- [ ] Vercel 프로덕션 배포 + 커스텀 도메인
- [ ] 성능 최적화 (Lighthouse 90+, 모바일)
- [ ] 구글 드라이브 자료 마이그레이션 스크립트
- [ ] 사용자 초대 이메일 발송 (500명)
- [ ] 운영 모니터링 설정 (Vercel Analytics)

---

## 현재 진행 상태

| 단계 | 상태 |
|------|------|
| ✅ PDCA Plan | 완료 (기능 11개, 스프린트 7개) |
| ✅ PDCA Design | 완료 (Claude design → `docs/02-design/claude-design/`, 미리보기 http://localhost:3200) |
| 🔄 Sprint 1: Foundation | **준비 완료 — Do 단계 진입 가능** |
| ⬜ Sprint 2: Community | 대기 중 |
| ⬜ Sprint 3: Resources | 대기 중 |
| ⬜ Sprint 4: AI Assistant | 대기 중 |
| ⬜ Sprint 5: Showcase+Impact | 대기 중 |
| ⬜ Sprint 6: Admin+Polish | 대기 중 |
| ⬜ Sprint 7: Deploy | 대기 중 |
