# Design Handoff Checklist

> **목적**: Claude design 완료 후 개발자(Do 단계) 전달 전 확인 항목

---

## 화면별 완료 현황

> **Claude Design 산출물**: `docs/02-design/claude-design/` (2026-05-26 완료)  
> **미리보기**: http://localhost:3200 (claude-design 서버)

| # | 화면 | 기능 | Sprint | 디자인 | Handoff |
|---|------|------|--------|--------|---------|
| 00 | Landing | — | S7 | ✅ | ⬜ |
| 01 | Auth (Login/SignUp) | F1 | S1 | ✅ | ⬜ |
| 02 | Home Feed | F2,3,4 | S1 | ✅ | ⬜ |
| 03 | Community | F2 | S2 | ✅ | ⬜ |
| 04 | Resources | F3 | S3 | ✅ | ⬜ |
| 05 | AI Chat | F4 | S4 | ✅ | ⬜ |
| 06 | Showcase | F9 | S5 | ✅ | ⬜ |
| 07 | Impact Stories | F10 | S5 | ✅ | ⬜ |
| 08 | Ask the Professor | F11 | S5 | ✅ | ⬜ |
| 09 | Cohorts | F5 | S1 | ✅ | ⬜ |
| 10 | Profile | F6 | S6 | ✅ | ⬜ |
| 11 | Admin | F8 | S6 | ⬜ | ⬜ |

---

## Handoff 전 필수 확인 항목

### 디자인 완성도
- [ ] Desktop + Mobile 2종 각각 완성
- [ ] 빈 상태(Empty State) 화면 포함
- [ ] 로딩/스켈레톤 상태 포함
- [ ] 에러 상태 포함

### 디자인 시스템 적용
- [ ] 컬러 토큰 일관성 확인 (design-system.md 기준)
- [ ] 타이포그래피 스케일 적용 확인
- [ ] 간격(spacing) 4px 그리드 준수
- [ ] CohortBadge 기수별 컬러 적용

### 개발자 전달 항목
- [ ] 컴포넌트 명세서 (props, 상태 목록)
- [ ] 색상 토큰 파일 (CSS variables or Tailwind config)
- [ ] 아이콘 에셋 (SVG, Lucide 컴포넌트명)
- [ ] 애니메이션 스펙 (duration, easing)
- [ ] 반응형 브레이크포인트 적용 확인

---

## PDCA Do 단계 진입 조건

각 Sprint 시작 전 해당 화면 Handoff 완료 필요:

| Sprint | 필요 화면 완료 |
|--------|---------------|
| Sprint 1 Do | 01-auth, 02-home-feed, 09-cohorts |
| Sprint 2 Do | 03-community |
| Sprint 3 Do | 04-resources |
| Sprint 4 Do | 05-ai-chat |
| Sprint 5 Do | 06-showcase, 07-impact, 08-ask-prof |
| Sprint 6 Do | 10-profile, 11-admin |
| Sprint 7 Do | 00-landing |

---

## 참조 문서

- 디자인 시스템: [`design-system.md`](./design-system.md)
- Claude design 브리핑: [`design-brief.md`](./design-brief.md)
- 기능 명세: [`../01-plan/plan.md`](../01-plan/plan.md)
