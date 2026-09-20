# Design Brief — AI4CEO Community Platform
> Claude design 입력용 전체 브리핑 문서

---

## 프로젝트 개요

**서비스명**: AI4CEO Community Platform  
**목적**: AI 코딩 교육 수료 CEO 500명을 위한 모바일 우선 커뮤니티 플랫폼  
**교체 대상**: 단톡방(KakaoTalk) + 구글 드라이브 → 통합 웹 플랫폼  
**운영**: 장동인 교수 (KAIST AI대학원), 연 2회 × 10주 과정, 현재 17기

---

## 타겟 사용자

| 유형 | 특성 | 디자인 고려사항 |
|------|------|----------------|
| CEO 재학생/졸업생 | 40~60대, 바쁜 일정 | 직관적 UX, 모바일 최우선 |
| 교수/운영진 | 콘텐츠 관리 주체 | 빠른 공지/자료 업로드 |

---

## 디자인 원칙

1. **다크 모드 기본** — CEO 타겟, 세련되고 전문적인 느낌
2. **모바일 우선** — 이동 중 접근, 하단 탭 네비게이션
3. **수치 강조** — 임팩트 스토리의 숫자는 크고 굵게
4. **기수 정체성** — 배지 컬러로 소속 기수 시각화
5. **정보 밀도** — CEO는 핵심 정보를 빠르게 파악

---

## 기능 → 화면 매핑

| 기능 | 화면 | 스크린 파일 | Sprint |
|------|------|------------|--------|
| F1. 인증 | 로그인 / 회원가입 | `screens/01-auth.md` | S1 |
| F2. 커뮤니티 피드 | 피드 + 채널 + 게시글 | `screens/03-community.md` | S2 |
| F3. 자료 라이브러리 | 목록 + 상세 | `screens/04-resources.md` | S3 |
| F4. AI 도우미 | 채팅 화면 | `screens/05-ai-chat.md` | S4 |
| F5. 기수 관리 | 기수 목록 + 상세 | `screens/09-cohorts.md` | S1 |
| F6. 사용자 프로필 | 프로필 보기/편집 | `screens/10-profile.md` | S6 |
| F7. 알림 | 알림 목록 | (Header 드롭다운) | S6 |
| F8. 관리자 패널 | 어드민 대시보드 | `screens/11-admin.md` | S6 |
| F9. 쇼케이스 | 갤러리 + 상세 + 등록 | `screens/06-showcase.md` | S5 |
| F10. 임팩트 스토리 | 카드 목록 + 등록 | `screens/07-impact.md` | S5 |
| F11. 교수 질문함 | 목록 + 상세 + 등록 | `screens/08-ask-prof.md` | S5 |
| — | 랜딩 페이지 | `screens/00-landing.md` | S7 |
| — | 홈 피드 | `screens/02-home-feed.md` | S1 |

---

## 화면 목록 요약

### Public
- **Landing**: 히어로 + Stats(500명·17기) + 임팩트 월 + 기능 소개 + 쇼케이스 미리보기 + CTA
- **Login**: 이메일 로그인 + Google OAuth + "가입 신청" 링크
- **Sign Up**: 이름·이메일·기수·회사 입력 → 승인 대기 안내

### Navigation
- **Desktop**: 좌측 고정 사이드바 (240px)
- **Mobile**: 하단 탭바 5개 (Home·Community·AI·Showcase·Me)

### Core Screens
- **Home Feed**: 전체 활동 피드 + 우측 위젯 패널
- **Community**: 채널 사이드 + 피드 + 게시글 상세
- **Resources**: 필터바 + 파일 목록 + 상세 뷰어
- **AI Chat**: 대화 히스토리 사이드 + 채팅 버블 + 입력창
- **Showcase**: 카드 그리드 + 필터 탭 + 등록 멀티스텝 폼
- **Impact**: 임팩트 카드 월 + 스토리 상세 + 등록 폼
- **Ask Prof**: 투표순 질문 목록 + 상태 배지 + 답변 뷰
- **Cohorts**: 기수 카드 그리드 + 멤버 디렉토리
- **Profile**: 헤더(아바타·배지) + 탭(게시글·프로젝트·임팩트)
- **Admin**: 통계 대시보드 + 사용자 테이블 + 승인 큐

---

## 디자인 시스템 참조

→ [`design-system.md`](./design-system.md)

- Primary Color: `#6366f1` (Indigo)
- Background: `#0f0f0f`
- Surface: `#1a1a2e`
- Font: Pretendard (KR) + Inter (EN)
- Icon: Lucide React

---

## Claude Design 프롬프트 작성 가이드

각 화면 디자인 요청 시 아래 형식 사용:

```
[화면명] 화면을 디자인해줘.

프로젝트: AI4CEO 커뮤니티 플랫폼 (CEO 500명 대상)
톤: 다크모드, 인디고 포인트 (#6366f1), 세련되고 전문적
폰트: Pretendard (한글), Inter (영문)
레이아웃: [Desktop 좌측 사이드바 / Mobile 하단 탭바]

화면 목적: [screens/XX-name.md 의 "화면 목적" 항목]
핵심 컴포넌트: [screens/XX-name.md 의 "UI 컴포넌트" 항목]
특이사항: [screens/XX-name.md 의 "인터랙션 노트" 항목]
```
