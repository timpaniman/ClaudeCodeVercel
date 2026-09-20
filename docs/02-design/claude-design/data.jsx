/* global React */
// =====================================================================
// AI4CEO — Icons + Mock Data
// Lucide-inspired stroked SVG icons (single file, no deps)
// =====================================================================

const Icon = ({ d, size = 18, stroke = 2, fill = 'none', children, style, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size} height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden="true"
  >
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  Home:   (p) => <Icon {...p}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></Icon>,
  Chat:   (p) => <Icon {...p}><path d="M21 12a8 8 0 1 1-3.2-6.4L21 4l-1 3.5A8 8 0 0 1 21 12Z"/></Icon>,
  Book:   (p) => <Icon {...p}><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3Z"/><path d="M4 17a3 3 0 0 1 3-3h11"/></Icon>,
  Bot:    (p) => <Icon {...p}><rect x="4" y="7" width="16" height="12" rx="3"/><path d="M9 13v.01M15 13v.01"/><path d="M12 3v4M8 7h8"/></Icon>,
  Rocket: (p) => <Icon {...p}><path d="M5 19c0-3 3-7 7-9s7-2 9 0c2 2 2 6-1 9s-6 4-9 4-6-1-6-4Z"/><path d="M9 15l-3 4M15 9a2 2 0 1 1-3-2"/></Icon>,
  Trend:  (p) => <Icon {...p}><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></Icon>,
  Cap:    (p) => <Icon {...p}><path d="M3 9 12 4l9 5-9 5z"/><path d="M7 11v5a5 5 0 0 0 10 0v-5"/></Icon>,
  Users:  (p) => <Icon {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M21 19c0-2.4-1.6-4.5-4-5"/></Icon>,
  User:   (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></Icon>,
  Bell:   (p) => <Icon {...p}><path d="M6 9a6 6 0 0 1 12 0v4l2 3H4l2-3z"/><path d="M10 19a2 2 0 0 0 4 0"/></Icon>,
  Search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Icon>,
  Settings:(p)=> <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></Icon>,
  Plus:   (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  Send:   (p) => <Icon {...p}><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></Icon>,
  Heart:  (p) => <Icon {...p}><path d="M20.8 5.6a5.4 5.4 0 0 0-7.6 0L12 6.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 22l8.8-8.8a5.4 5.4 0 0 0 0-7.6z"/></Icon>,
  MsgDot: (p) => <Icon {...p}><path d="M21 11a8 8 0 1 1-3.2-6.4L21 4l-1 3.5A8 8 0 0 1 21 11Z"/><circle cx="8.5" cy="11" r=".5" fill="currentColor"/><circle cx="12" cy="11" r=".5" fill="currentColor"/><circle cx="15.5" cy="11" r=".5" fill="currentColor"/></Icon>,
  Share:  (p) => <Icon {...p}><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="m8.6 10.6 6.8-3.2M8.6 13.4l6.8 3.2"/></Icon>,
  Bookmark:(p)=> <Icon {...p}><path d="M6 4h12v17l-6-4-6 4z"/></Icon>,
  Download:(p)=> <Icon {...p}><path d="M12 4v12m0 0-4-4m4 4 4-4"/><path d="M4 20h16"/></Icon>,
  Arrow:  (p) => <Icon {...p}><path d="M5 12h14m-6-6 6 6-6 6"/></Icon>,
  Sparkle:(p)=> <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.8 2.8M15.2 15.2 18 18M6 18l2.8-2.8M15.2 8.8 18 6"/></Icon>,
  External:(p)=> <Icon {...p}><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></Icon>,
  Code:   (p) => <Icon {...p}><path d="m8 17-5-5 5-5M16 7l5 5-5 5M14 4l-4 16"/></Icon>,
  Github: (p) => <Icon {...p}><path d="M9 18c-4 1-4-2-6-2m12 4v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.4 1.2a11.6 11.6 0 0 0-6 0C7.7 1.8 6.7 2.1 6.7 2.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 5.3 8.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V20"/></Icon>,
  File:   (p) => <Icon {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></Icon>,
  Video:  (p) => <Icon {...p}><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></Icon>,
  Pdf:    (p) => <Icon {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M9 13h.5a1.5 1.5 0 0 1 0 3H9zM13 13v3"/></Icon>,
  Img:    (p) => <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 4 4 3-3 4 4"/></Icon>,
  Vote:   (p) => <Icon {...p}><path d="m6 15 6-7 6 7"/></Icon>,
  Check:  (p) => <Icon {...p}><path d="m5 12 5 5L20 7"/></Icon>,
  ChevronR:(p)=> <Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>,
  ChevronD:(p)=> <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>,
  Filter: (p) => <Icon {...p}><path d="M3 5h18M6 12h12M10 19h4"/></Icon>,
  Dot:    (p) => <Icon {...p}><circle cx="12" cy="12" r="1" fill="currentColor"/></Icon>,
  Pin:    (p) => <Icon {...p}><path d="m12 17 .01 5M5 9V3h14v6l-3 3 1 5H7l1-5z"/></Icon>,
  Trophy: (p) => <Icon {...p}><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M5 6H3v2a3 3 0 0 0 3 3M19 6h2v2a3 3 0 0 1-3 3"/><path d="M9 14h6v3l1 4H8l1-4z"/></Icon>,
  Clock:  (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>,
  Building:(p)=> <Icon {...p}><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/></Icon>,
};

// ============================================================
// COHORT HELPERS — single chroma OKLCH hues across 17 cohorts
// ============================================================
const cohortHue = (n) => {
  // distribute hues across 0..360 in a pleasant order
  // start at indigo and wrap; latest cohorts trend toward warm
  return Math.round(((n - 1) * (360 / 17) + 250) % 360);
};
const cohortAccent = (n) => `oklch(0.70 0.16 ${cohortHue(n)})`;

const CohortBadge = ({ n, size = 'sm', label }) => (
  <span className={`cohort-badge ${size === 'lg' ? 'lg' : ''}`} style={{ '--cohort-hue': cohortHue(n) }}>
    {label || `${n}기`}
  </span>
);

// ============================================================
// MOCK DATA
// ============================================================
const me = {
  name: '강민서',
  initials: '강',
  role: 'CEO',
  company: '리프트랩',
  cohort: 16,
  email: 'ms.kang@liftlab.co',
};

const people = [
  { id: 1, name: '김재훈', initials: '재', company: '오레노', role: '대표', cohort: 17, hue: 12 },
  { id: 2, name: '이서연', initials: '서', company: '플레인테이블', role: 'COO', cohort: 16, hue: 320 },
  { id: 3, name: '박도현', initials: '도', company: '리비전', role: 'Founder', cohort: 15, hue: 200 },
  { id: 4, name: '최예린', initials: '예', company: '브릭스튜디오', role: 'CEO', cohort: 14, hue: 280 },
  { id: 5, name: '정해성', initials: '해', company: '와이즈박스', role: '대표', cohort: 17, hue: 60 },
  { id: 6, name: '한지우', initials: '지', company: '코어셋', role: '대표', cohort: 13, hue: 160 },
  { id: 7, name: '윤소민', initials: '소', company: '룬랩', role: 'CTO', cohort: 16, hue: 340 },
  { id: 8, name: '오현우', initials: '현', company: '베일리', role: 'CEO', cohort: 11, hue: 100 },
];

const posts = [
  {
    id: 1, author: people[0], cohort: 17, time: '12분 전', pinned: true,
    title: '17기 8주차 — Claude로 영업 제안서 자동화 워크플로우 구축',
    body: 'OpenAPI 응답 스키마 강제 + claude-sonnet 으로 60p 분량 제안서를 12분에 초안 생성. 영업팀 평균 작성시간 4시간 → 25분.',
    tags: ['워크플로우', '제안서', 'claude'],
    likes: 42, comments: 18, image: 'WORKFLOW DIAGRAM',
  },
  {
    id: 2, author: people[1], cohort: 16, time: '1시간 전',
    title: '커뮤니티 마케팅 자동화 — Retool + Claude 조합 추천',
    body: '뉴스레터 큐레이션을 위해 RSS → 요약 → Slack 승인 → 발송 파이프라인 만들었어요. 주 6시간 절약.',
    tags: ['마케팅', '자동화'],
    likes: 31, comments: 12,
  },
  {
    id: 3, author: people[2], cohort: 15, time: '3시간 전',
    title: '[질문] RAG 청크 사이즈 — 한국어 PDF 매뉴얼 기준 추천 있을까요?',
    body: '500자 vs 1200자 둘 다 해봤는데 retrieval 품질이 들쭉날쭉합니다. 메타데이터로 섹션 태그 붙이는게 정답일까요?',
    tags: ['RAG', '질문'],
    likes: 9, comments: 24,
  },
  {
    id: 4, author: people[4], cohort: 17, time: '5시간 전',
    title: '오늘 OT 영상 봤는데 — 김교수님 코멘트 정리',
    body: '"좋은 프롬프트는 좋은 브리프와 같다 — 컨텍스트, 제약, 톤, 예시." 4가지 요소 체크리스트 노션에 정리해뒀습니다.',
    tags: ['강의노트'],
    likes: 56, comments: 7,
  },
];

const projects = [
  { id: 1, title: '내일배움 — 채용 매칭 AI', author: people[2], cohort: 15, category: 'RAG', likes: 124, ph: 'JOB MATCH UI' },
  { id: 2, title: '오레노 — 메뉴 추천 챗봇', author: people[0], cohort: 17, category: '챗봇', likes: 98, ph: 'CHATBOT SCREEN' },
  { id: 3, title: '플레인테이블 영업 어시스턴트', author: people[1], cohort: 16, category: '자동화', likes: 87, ph: 'SALES DASH' },
  { id: 4, title: '브릭스튜디오 디자인 큐레이션', author: people[3], cohort: 14, category: '분석', likes: 76, ph: 'GALLERY GRID' },
  { id: 5, title: '와이즈박스 보고서 생성기', author: people[4], cohort: 17, category: '자동화', likes: 64, ph: 'REPORT BUILDER' },
  { id: 6, title: '코어셋 — CS 응답 자동화', author: people[5], cohort: 13, category: '챗봇', likes: 58, ph: 'CS INBOX' },
  { id: 7, title: '룬랩 — 컨텐츠 SEO 분석', author: people[6], cohort: 16, category: '분석', likes: 47, ph: 'SEO SCORE' },
  { id: 8, title: '베일리 — 컨시어지 봇', author: people[7], cohort: 11, category: '챗봇', likes: 41, ph: 'HOTEL BOT' },
];

const impactStories = [
  {
    id: 1, headline: '월 40시간 절감', industry: 'F&B', author: people[0], cohort: 17,
    summary: '주문 데이터를 Claude로 요약 → 매일 아침 매니저용 인사이트 리포트 자동 발송. 점장 미팅 1시간 → 10분.',
    tech: ['claude-sonnet', 'Retool', 'Slack'], delta: { metric: '점장 미팅', from: '60분', to: '10분' }, color: 12,
  },
  {
    id: 2, headline: '제안서 작성 −83%', industry: 'B2B SaaS', author: people[1], cohort: 16,
    summary: 'RFP 응답 템플릿화. 평균 4시간 → 25분. 영업 사이클 평균 17일 단축.', tech: ['claude-opus', 'Notion DB'],
    delta: { metric: '제안서 작성', from: '4h', to: '25m' }, color: 320,
  },
  {
    id: 3, headline: '전환율 +28%', industry: '이커머스', author: people[3], cohort: 14,
    summary: '상품설명 A/B 자동 생성 + 카테고리별 톤 학습. 클릭률 12.4% → 16.9%.', tech: ['claude-sonnet', 'Shopify'],
    delta: { metric: 'CTR', from: '12.4%', to: '16.9%' }, color: 200,
  },
  {
    id: 4, headline: 'CS 응답시간 −76%', industry: '서비스', author: people[5], cohort: 13,
    summary: 'FAQ + 주문 컨텍스트 RAG. 1차 응답 평균 38분 → 9분, CSAT 4.1 → 4.7.', tech: ['RAG', 'claude-haiku'],
    delta: { metric: '1차 응답', from: '38m', to: '9m' }, color: 160,
  },
  {
    id: 5, headline: '계약서 검토 −90%', industry: 'Legal Tech', author: people[6], cohort: 16,
    summary: '표준 NDA 검토 자동화. 시니어 변호사 검토 2시간 → 12분. 위험조항 자동 하이라이트.',
    tech: ['claude-opus', 'PDF Parse'], delta: { metric: '검토 시간', from: '2h', to: '12m' }, color: 340,
  },
  {
    id: 6, headline: '리포트 자동화', industry: 'Agency', author: people[4], cohort: 17,
    summary: '주간 광고 리포트 70개사 분량 → 한 번에 생성. 데이터 분석가 1명분 업무 흡수.',
    tech: ['Python', 'claude-sonnet'], delta: { metric: '리포트 70개', from: '3일', to: '20분' }, color: 60,
  },
];

const questions = [
  { id: 1, votes: 47, title: 'RAG 운영 — 청크 사이즈와 메타데이터 전략 추천?', status: 'review', author: people[2], cohort: 15, time: '어제', answers: 0 },
  { id: 2, votes: 38, title: 'Claude API 비용을 줄이는 프롬프트 캐싱 베스트 프랙티스', status: 'done', author: people[1], cohort: 16, time: '3일 전', answers: 1 },
  { id: 3, votes: 31, title: '에이전트가 무한 루프에 빠질 때 디버깅하는 방법', status: 'wait', author: people[0], cohort: 17, time: '2시간 전', answers: 0 },
  { id: 4, votes: 24, title: '소수 데이터로 파인튜닝 vs RAG, 어떤 기준으로 선택?', status: 'done', author: people[3], cohort: 14, time: '1주 전', answers: 2 },
  { id: 5, votes: 19, title: 'MCP 서버 운영 — 권한 분리는 어떻게 설계?', status: 'review', author: people[6], cohort: 16, time: '4일 전', answers: 0 },
];

const resources = [
  { id: 1, type: 'pdf', title: '17기 8주차 강의노트 — Agentic Workflow 설계', cohort: 17, downloads: 142, date: '2025.05.20', size: '4.2 MB' },
  { id: 2, type: 'video', title: '[OT] AI 도입 의사결정 프레임워크', cohort: 17, downloads: 318, date: '2025.05.18', size: '52분' },
  { id: 3, type: 'code', title: 'Claude + Notion 통합 스타터 키트', cohort: 16, downloads: 89, date: '2025.05.14', size: 'Github' },
  { id: 4, type: 'pdf', title: '16기 졸업 프로젝트 임팩트 리포트', cohort: 16, downloads: 211, date: '2025.05.10', size: '12 MB' },
  { id: 5, type: 'img', title: 'RAG 아키텍처 다이어그램 모음', cohort: 17, downloads: 76, date: '2025.05.08', size: '8 imgs' },
  { id: 6, type: 'video', title: '[실습] 첫 에이전트 만들기 (1시간)', cohort: 17, downloads: 204, date: '2025.05.04', size: '58분' },
];

// expose
Object.assign(window, {
  Icon, Icons, CohortBadge, cohortHue, cohortAccent,
  me, people, posts, projects, impactStories, questions, resources,
});
