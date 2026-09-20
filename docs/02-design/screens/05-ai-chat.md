# Screen: AI 학습 도우미

| 항목 | 값 |
|------|----|
| **연결 기능** | F4. AI 학습 도우미 |
| **연결 Sprint** | Sprint 4 |
| **PDCA 단계** | Design → Do |
| **상태** | ⬜ 디자인 대기 |

---

## 화면 목적
LangChain + Claude opus 4.7 기반 RAG 채팅 — 강의 자료 기반 질문 응답

## 레이아웃

### Desktop (2열)
```
[대화 히스토리 사이드 260px] [채팅 영역]
─────────────────────────    ──────────────────────
[+ 새 대화]                  [상단: 기수 컨텍스트 배지]
[대화 항목 목록]             [메시지 버블 목록]
  - 제목 + 날짜              [하단 입력창 고정]
                               텍스트 + 전송 버튼
```

### Mobile (전체화면)
```
[상단바: 뒤로가기 | 대화 제목 | 대화목록 버튼]
[메시지 버블 목록]
[하단 입력창 (키보드 위 고정)]
```

## UI 컴포넌트
- `ChatHistorySidebar` — 대화 목록 + 새 대화 버튼
- `ContextBadge` — "16기 컨텍스트 적용 중" 표시 칩
- `UserBubble` — 오른쪽 정렬, Primary 색상 배경
- `AIBubble` — 왼쪽 정렬, Surface 배경, AI 아바타 + 스트리밍 커서
- `CodeBlock` — syntax highlight + 복사 버튼 (AI 응답 내)
- `ChatInput` — 멀티라인 입력 + 전송 버튼 + 문자수 표시
- `TypingIndicator` — 점 3개 애니메이션 (AI 응답 생성 중)

## 상태 변형
- 새 대화 (빈 상태): "AI4CEO 학습 도우미입니다. 무엇이든 물어보세요" + 추천 질문 3개
- AI 응답 스트리밍: TypingIndicator → 텍스트 순차 표시
- 에러 응답: 붉은 버블 + 재시도 버튼

## 추천 질문 (빈 상태)
- "LangChain에서 RAG를 구현하는 방법을 알려줘"
- "Supabase Auth에서 JWT 토큰 관리 방법은?"
- "Next.js 14 App Router와 Pages Router 차이는?"

## 인터랙션 노트
- 스트리밍 응답: 글자 단위 순차 출력
- 코드 블록 복사 버튼 클릭 시 "복사됨" 토스트
- 대화 제목: 첫 메시지 기반 자동 생성

## Handoff 체크리스트
- [ ] Desktop 2열 레이아웃
- [ ] Mobile 전체화면
- [ ] 빈 상태 + 추천 질문
- [ ] 스트리밍 상태 (TypingIndicator)
- [ ] 코드 블록 스타일
