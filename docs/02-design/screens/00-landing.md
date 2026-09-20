# Screen: Landing Page

| 항목 | 값 |
|------|----|
| **연결 기능** | — (공개 페이지) |
| **연결 Sprint** | Sprint 7 (Deploy) |
| **PDCA 단계** | Design → Do |
| **상태** | ⬜ 디자인 대기 |

---

## 화면 목적
비회원에게 AI4CEO 과정과 커뮤니티 플랫폼을 소개, 가입 신청 유도

## 레이아웃

### Desktop
```
[Header: Logo | 로그인 | 가입신청 버튼]
[Hero: 타이틀(2줄) + 부제 + CTA 버튼 + 배경 그라디언트]
[Stats Bar: 졸업생 500명 · 17기 진행 · 10주 과정 · 연 2회]
[Impact Wall: 임팩트 카드 3개 가로 배치]
[Features: 4개 기능 카드 그리드 (커뮤니티/자료/AI/쇼케이스)]
[Showcase Preview: 졸업 프로젝트 카드 6개]
[CTA Banner: 17기 모집 + 신청 버튼]
[Footer]
```

### Mobile
```
[Header: Logo | 햄버거]
[Hero: 타이틀(3줄) + CTA 버튼 (전체폭)]
[Stats: 2×2 그리드]
[Impact Wall: 가로 스크롤 카드]
[Features: 세로 스택]
[Showcase: 가로 스크롤]
[CTA]
```

## UI 컴포넌트
- `HeroSection` — 큰 타이틀 + gradient bg
- `StatCard` — 숫자 크게 + 라벨
- `ImpactCard` — 수치 강조 카드 (mini)
- `FeatureCard` — 아이콘 + 제목 + 설명
- `ProjectCard` — 썸네일 + 제목 + 기수배지

## 인터랙션 노트
- Hero CTA → `/signup` 이동
- Stats 숫자 카운트업 애니메이션
- Impact Wall 카드 호버 시 확장

## Handoff 체크리스트
- [ ] 모바일/태블릿/데스크톱 3종 완성
- [ ] 실제 임팩트 수치 더미 데이터 반영
- [ ] CTA 버튼 컬러 토큰 명시
