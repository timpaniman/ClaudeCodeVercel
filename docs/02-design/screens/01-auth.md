# Screen: 인증 (Login / Sign Up)

| 항목 | 값 |
|------|----|
| **연결 기능** | F1. 인증 시스템 |
| **연결 Sprint** | Sprint 1 |
| **PDCA 단계** | Design → Do |
| **상태** | ⬜ 디자인 대기 |

---

## 화면 목적
회원 로그인 및 신규 가입 신청 (Admin 승인 후 활성화)

## 레이아웃

### Login (Desktop/Mobile 공통 — 중앙 카드)
```
[Logo]
[제목: "AI4CEO에 오신 것을 환영합니다"]
[이메일 입력]
[비밀번호 입력]
[로그인 버튼 (Primary, 전체폭)]
[구분선: or]
[Google로 로그인 버튼]
[하단: "아직 회원이 아니신가요? 가입 신청"]
```

### Sign Up (멀티스텝 — 3단계)
```
Step 1: 기본 정보
  이름 / 이메일 / 비밀번호 / 비밀번호 확인

Step 2: 프로필
  회사명 / 직책 / 기수 선택 (드롭다운 1~17기)

Step 3: 완료
  "가입 신청이 완료됐습니다"
  "운영진 승인 후 이메일로 안내드립니다"
  [홈으로 버튼]
```

## UI 컴포넌트
- `AuthCard` — 중앙 정렬, 최대폭 400px, 다크 Surface 배경
- `Input` — 라벨 + 입력창 + 에러 메시지
- `Button` (Primary / Google OAuth)
- `StepIndicator` — 3단계 프로그레스
- `Select` — 기수 선택 드롭다운

## 상태 변형
- 입력 에러 (이메일 형식, 비밀번호 불일치)
- 로딩 (로그인 중 버튼 비활성)
- 이미 가입된 이메일 에러

## 인터랙션 노트
- 비밀번호 표시/숨기기 토글
- 기수 선택 시 CohortBadge 미리보기
- 각 Step 유효성 통과 시 다음 버튼 활성

## Handoff 체크리스트
- [ ] Login 화면 (mobile + desktop)
- [ ] SignUp 3단계 각각
- [ ] 에러 상태
- [ ] Google OAuth 버튼 스타일
