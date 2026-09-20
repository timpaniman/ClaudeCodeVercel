# Design System — AI4CEO Platform

> **상태**: Draft | **버전**: v1.0 | **적용 범위**: 전 스프린트 공통

---

## 색상 토큰 (Color Tokens)

### Core
| 토큰 | 값 | 용도 |
|------|----|------|
| `--color-bg` | `#0f0f0f` | 페이지 배경 |
| `--color-surface` | `#1a1a2e` | 카드, 사이드바 |
| `--color-surface-2` | `#111827` | 입력창, 드롭다운 |
| `--color-border` | `#1f2937` | 구분선 |
| `--color-text-primary` | `#f9fafb` | 제목 |
| `--color-text-secondary` | `#9ca3af` | 부제목, 메타 |
| `--color-text-muted` | `#6b7280` | placeholder |

### Brand
| 토큰 | 값 | 용도 |
|------|----|------|
| `--color-primary` | `#6366f1` | 버튼, 링크, 포인트 |
| `--color-primary-hover` | `#4f46e5` | 호버 상태 |
| `--color-primary-subtle` | `#1e1e3a` | 배경 강조 |

### Semantic
| 토큰 | 값 | 용도 |
|------|----|------|
| `--color-success` | `#4ade80` | 답변완료, 성공 |
| `--color-warning` | `#fbbf24` | 검토중, 주의 |
| `--color-error` | `#f87171` | 에러, 삭제 |
| `--color-info` | `#60a5fa` | 정보, 대기중 |

### 기수 배지 컬러 (CohortBadge)
| 기수 | bg | text |
|------|----|------|
| 1~3기 | `#1e3a1e` | `#4ade80` |
| 4~6기 | `#1e2e3a` | `#60a5fa` |
| 7~9기 | `#2e1e3a` | `#c084fc` |
| 10~12기 | `#3a1e1e` | `#f87171` |
| 13~15기 | `#3a2e1e` | `#fbbf24` |
| 16~17기+ | `#1e1e3a` | `#a5b4fc` |

---

## 타이포그래피 (Typography)

| 레벨 | 폰트 | 크기 | 굵기 | 용도 |
|------|------|------|------|------|
| Display | Pretendard / Inter | 2rem | 800 | 랜딩 히어로 |
| H1 | Pretendard / Inter | 1.75rem | 700 | 페이지 제목 |
| H2 | Pretendard / Inter | 1.25rem | 600 | 섹션 제목 |
| H3 | Pretendard / Inter | 1rem | 600 | 카드 제목 |
| Body | Pretendard / Inter | 0.875rem | 400 | 본문 |
| Caption | Pretendard / Inter | 0.75rem | 400 | 메타, 라벨 |
| Impact | Pretendard / Inter | 2.5rem | 800 | 수치 강조 (ImpactCard) |

---

## 간격 스케일 (Spacing Scale)

| 토큰 | 값 |
|------|----|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-12` | 48px |
| `space-16` | 64px |

---

## 반응형 브레이크포인트

| 이름 | 값 | 레이아웃 |
|------|----|---------|
| Mobile | < 640px | 하단 탭바, 1열 |
| Tablet | 640~1024px | 2열 그리드 |
| Desktop | > 1024px | 좌측 사이드바 + 메인 |

---

## 컴포넌트 목록 (Component Inventory)

| 컴포넌트 | 파일 | 연결 기능 |
|----------|------|-----------|
| `CohortBadge` | ui/CohortBadge | 전체 |
| `ImpactCard` | features/impact/ImpactCard | F10 |
| `PostCard` | features/community/PostCard | F2 |
| `ProjectCard` | features/showcase/ProjectCard | F9 |
| `QuestionCard` | features/ask/QuestionCard | F11 |
| `AIBubble` | features/ai/AIBubble | F4 |
| `ResourceItem` | features/resources/ResourceItem | F3 |
| `StatusBadge` | ui/StatusBadge | F11 |
| `Avatar` | ui/Avatar | 전체 |
| `Button` | ui/Button | 전체 |
| `Input` | ui/Input | 전체 |
| `Modal` | ui/Modal | 전체 |
| `Tabs` | ui/Tabs | F3, F9, F10 |
| `InfiniteScroll` | ui/InfiniteScroll | F2 |

---

## 아이콘 세트
- **라이브러리**: Lucide React
- **크기**: 16px (인라인), 20px (버튼), 24px (네비)

| 아이콘 | 용도 |
|--------|------|
| `Home` | 홈 피드 |
| `MessageSquare` | 커뮤니티 |
| `BookOpen` | 자료 라이브러리 |
| `Bot` | AI 도우미 |
| `Rocket` | 쇼케이스 |
| `TrendingUp` | 임팩트 스토리 |
| `GraduationCap` | 교수 질문함 |
| `Users` | 기수 디렉토리 |
| `Bell` | 알림 |
| `ThumbsUp` | 투표/좋아요 |
