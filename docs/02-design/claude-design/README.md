# Claude Design 산출물

> **생성일**: 2026-05-26  
> **미리보기**: http://localhost:3200  
> **원본 ZIP**: `../screens/ai4ceo1.zip`

---

## 포함된 화면 (12개)

| 화면 ID | 이름 | 컴포넌트 | spec 파일 |
|---------|------|----------|-----------|
| `_landing` | Landing Page | `Landing` | `../screens/00-landing.md` |
| `home` | Home Feed | `HomeFeed` | `../screens/02-home-feed.md` |
| `community` | Community | `Community` | `../screens/03-community.md` |
| `resources` | Resources | `Resources` | `../screens/04-resources.md` |
| `aichat` | AI Chat | `AIChat` | `../screens/05-ai-chat.md` |
| `showcase` | Showcase | `Showcase` | `../screens/06-showcase.md` |
| `showcase-new` | 프로젝트 등록 (4 steps) | `ShowcaseRegister` | `../screens/06-showcase.md` |
| `impact` | Impact Stories | `Impact` | `../screens/07-impact.md` |
| `impact-new` | 임팩트 스토리 등록 (4 steps) | `ImpactRegister` | `../screens/07-impact.md` |
| `askprof` | Ask the Professor | `AskProf` | `../screens/08-ask-prof.md` |
| `question-new` | 질문 등록 (2 steps) | `QuestionRegister` | `../screens/08-ask-prof.md` |
| `cohorts` | Cohorts | `Cohorts` | `../screens/09-cohorts.md` |
| `profile` | 내 프로필 | `Profile` | `../screens/10-profile.md` |

> **미포함**: 01-auth (로그인/회원가입), 11-admin (관리자 패널) — Sprint 1/6에서 별도 설계 필요

---

## 파일 구조

```
claude-design/
├── index.html          # 앱 진입점 (React + Babel CDN)
├── app.jsx             # App shell, Sidebar, Router, Tweaks
├── components.jsx      # 공유 컴포넌트 (Avatar, PostCard, ImpactCard, ProjectCard, ...)
├── data.jsx            # 목업 데이터
├── screens-a.jsx       # HomeFeed, Community, Showcase, Impact, AskProf, Resources
├── screens-b.jsx       # AIChat, Cohorts, Profile, Notifications, Landing
├── screens-c.jsx       # 등록 플로우 (ShowcaseRegister, ImpactRegister, QuestionRegister, RegisterSuccess)
├── styles.css          # 전체 CSS (다크/라이트 테마, 토큰)
├── tweaks-panel.jsx    # 실시간 Tweaks 패널
└── _check/             # QA 스크린샷
    ├── 01-showcase-register.png
    ├── 02-showcase-register.png
    ├── 03-showcase-register.png
    ├── form-direct.png
    └── form-hq.png
```

---

## Tweaks 패널 사용법

오른쪽 하단 ⚙️ 아이콘을 클릭하면 실시간 조정 가능:

| 항목 | 옵션 |
|------|------|
| 현재 화면 | 드롭다운으로 모든 화면 전환 |
| 테마 | dark / light |
| 액센트 컬러 | Indigo / Blue / Purple / Cyan / Orange |
| Hue 정밀 조정 | 0~360 슬라이더 |
| 정보 밀도 | compact / balanced / relaxed |
| 사이드바 접기 | 토글 |

---

## Do 단계 Handoff 참고 사항

### 공유 컴포넌트 → `src/components/`로 이식
- `Avatar` → `components/ui/Avatar.tsx`
- `CohortBadge` → `components/ui/CohortBadge.tsx`
- `PostCard` → `components/features/community/PostCard.tsx`
- `ProjectCard` → `components/features/showcase/ProjectCard.tsx`
- `ImpactCard` → `components/features/impact/ImpactCard.tsx`
- `QuestionCard` → `components/features/ask-prof/QuestionCard.tsx`
- `ResourceItem` → `components/features/resources/ResourceItem.tsx`

### CSS 토큰 → `tailwind.config.ts`로 이식
`styles.css`의 CSS 변수(`--accent`, `--surface`, `--text-1~4` 등)를 Tailwind 커스텀 토큰으로 변환.
