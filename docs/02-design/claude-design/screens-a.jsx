/* global React, Icons, Avatar, CohortBadge, PostCard, ImpactCard, ProjectCard, QuestionCard, ResourceItem, Sparkline */
/* global me, people, posts, projects, impactStories, questions, resources, cohortHue */
// =====================================================================
// AI4CEO — Screens (Home, Community, Showcase, Impact, AskProf, Resources)
// =====================================================================
const { useState, useEffect, useRef } = React;

// ---------------------- HOME FEED ----------------------
const HomeFeed = ({ onNavigate }) => {
  const activitySpark = [4, 7, 6, 9, 8, 12, 14, 11, 16, 15, 18, 22, 19, 24];
  return (
    <div className="content has-rail fade-in">
      <div className="col">
        {/* Welcome card */}
        <section className="card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(500px 200px at 90% 0%, var(--accent-soft), transparent 60%)',
            pointerEvents: 'none',
          }}/>
          <div className="row" style={{ alignItems: 'flex-start', gap: 16, position: 'relative' }}>
            <Avatar person={me} size="lg" />
            <div className="grow">
              <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                <span className="h-eyebrow">2025년 5월 26일 · 월요일</span>
              </div>
              <h1 className="h-1">안녕하세요, 강민서 대표님 <span style={{ color: 'var(--text-3)' }}>👋</span></h1>
              <p style={{ marginTop: 6, marginBottom: 14, color: 'var(--text-2)' }}>
                <CohortBadge n={16}/> 동기 12명이 이번 주에 새 프로젝트를 공유했어요. 8주차 강의노트가 어제 업로드됐습니다.
              </p>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => onNavigate('community')}>
                  <Icons.Plus size={15}/> 새 글 작성
                </button>
                <button className="btn btn-ghost" onClick={() => onNavigate('aichat')}>
                  <Icons.Bot size={15}/> AI Chat 시작
                </button>
                <button className="btn btn-ghost" onClick={() => onNavigate('resources')}>
                  <Icons.Book size={15}/> 자료실
                </button>
              </div>
            </div>
            <div className="card card-tight" style={{ background: 'var(--surface-2)', minWidth: 160, padding: 12, flex: '0 0 auto' }}>
              <div className="h-eyebrow">내 활동 · 4주</div>
              <div className="row" style={{ marginTop: 8, alignItems: 'flex-end', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="metric sm">24</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>게시글·댓글</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <Sparkline data={activitySpark} width={70} height={28} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filter row */}
        <div className="row" style={{ gap: 8, marginTop: 4 }}>
          <div className="tabs">
            <button className="tab active">전체</button>
            <button className="tab">16기</button>
            <button className="tab">팔로잉</button>
            <button className="tab">공지</button>
          </div>
          <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
            <button className="btn btn-sm btn-ghost"><Icons.Filter size={14}/> 필터</button>
            <button className="btn btn-sm btn-ghost">최신 ▾</button>
          </div>
        </div>

        {/* Feed */}
        <div className="col">
          {posts.map((p) => <PostCard key={p.id} post={p}/>)}
        </div>
      </div>

      {/* Right rail */}
      <aside className="col">
        {/* AI quick ask */}
        <section className="card" style={{ padding: 16 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="row" style={{ gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, var(--accent), oklch(0.55 0.20 320))',
                display: 'grid', placeItems: 'center', color: 'white',
              }}><Icons.Sparkle size={14}/></div>
              <span className="h-3" style={{ fontSize: 13.5 }}>AI 도우미</span>
            </div>
            <span className="chip" style={{ marginLeft: 'auto', height: 20, fontSize: 10 }}>16기 컨텍스트</span>
          </div>
          <div className="input" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.Sparkle size={14} className="muted"/>
            <input placeholder="질문을 입력하세요…" style={{ background: 'transparent', border: 0, outline: 'none', flex: 1, color: 'var(--text)' }}/>
          </div>
          <div className="stack" style={{ marginTop: 10, gap: 6 }}>
            {['RAG 청크 사이즈 추천?', 'Claude 비용 줄이는 법', '에이전트 디버깅'].map((q) => (
              <button key={q} className="row" style={{ gap: 8, padding: '8px 10px', borderRadius: 8, color: 'var(--text-2)', fontSize: 12.5, background: 'var(--surface-2)' }}>
                <Icons.Sparkle size={12} className="muted"/>{q}
              </button>
            ))}
          </div>
        </section>

        {/* Cohort progress */}
        <section className="card" style={{ padding: 16 }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="h-3" style={{ fontSize: 13.5 }}>17기 진행 중</span>
            <span className="chip" style={{ marginLeft: 'auto', height: 20, fontSize: 10, background: 'var(--accent-soft)', color: 'var(--text)', border: 0 }}>WEEK 8 / 10</span>
          </div>
          <div style={{ position: 'relative', height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, width: '80%', background: 'linear-gradient(90deg, var(--accent), oklch(0.7 0.16 320))', borderRadius: 3 }}/>
          </div>
          <div className="row" style={{ marginTop: 10, fontSize: 11.5, color: 'var(--text-3)' }}>
            <span>이번 주: <strong style={{ color: 'var(--text)' }}>Agentic Workflow</strong></span>
            <span style={{ marginLeft: 'auto' }} className="mono">62 / 78명 출석</span>
          </div>
        </section>

        {/* Trending */}
        <section className="card card-flush">
          <div className="card-head">
            <h3>인기 게시글</h3>
            <span className="crumb">24h</span>
          </div>
          {posts.slice(0, 3).map((p, i) => (
            <div key={p.id} className="row" style={{ padding: '12px 16px', borderTop: i === 0 ? 0 : '1px solid var(--border)', alignItems: 'flex-start', gap: 12 }}>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-4)', minWidth: 18, lineHeight: 1 }}>{i + 1}</div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{p.title}</div>
                <div className="row" style={{ gap: 6, marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
                  <CohortBadge n={p.cohort}/>
                  <span><Icons.Heart size={11} style={{ verticalAlign: -1 }}/> {p.likes}</span>
                  <span><Icons.MsgDot size={11} style={{ verticalAlign: -1 }}/> {p.comments}</span>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Recent resources */}
        <section className="card card-flush">
          <div className="card-head">
            <h3>최근 자료</h3>
            <button className="crumb" style={{ marginLeft: 'auto', color: 'var(--accent)' }} onClick={() => onNavigate('resources')}>전체 보기 →</button>
          </div>
          {resources.slice(0, 3).map((r) => <ResourceItem key={r.id} r={r}/>)}
        </section>
      </aside>
    </div>
  );
};

// ---------------------- COMMUNITY ----------------------
const Community = () => {
  const [activeCh, setActiveCh] = useState('all');
  const filtered = activeCh === 'all' ? posts : posts.filter((p) => p.cohort === activeCh);

  const channels = [
    { id: 'all', label: '전체 채널', icon: Icons.Users, count: 248 },
    { id: 'notice', label: '공지사항', icon: Icons.Pin, count: 12 },
  ];

  return (
    <div className="content fade-in" style={{ gridTemplateColumns: '220px minmax(0, 1fr)' }}>
      {/* Channel list */}
      <aside className="card card-flush" style={{ height: 'fit-content', position: 'sticky', top: 'calc(var(--topbar-h) + var(--pad))' }}>
        <div className="card-head"><h3>채널</h3><button className="icon-btn" style={{ width: 26, height: 26, marginLeft: 'auto' }}><Icons.Plus size={14}/></button></div>
        <div style={{ padding: '6px 0' }}>
          {channels.map((c) => {
            const Ic = c.icon;
            const active = activeCh === c.id;
            return (
              <button key={c.id} className="row" style={{
                width: '100%', gap: 10, padding: '8px 14px',
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--text)' : 'var(--text-2)',
                fontSize: 13,
              }} onClick={() => setActiveCh(c.id)}>
                <Ic size={15}/> <span>{c.label}</span>
                <span className="num" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)' }}>{c.count}</span>
              </button>
            );
          })}
        </div>
        <div className="card-head" style={{ borderTop: '1px solid var(--border)' }}>
          <h3>기수별 채널</h3>
          <span className="crumb">17</span>
        </div>
        <div style={{ padding: '6px 6px 12px', maxHeight: 360, overflow: 'auto' }}>
          {Array.from({ length: 17 }, (_, i) => 17 - i).map((n) => {
            const active = activeCh === n;
            return (
              <button key={n} className="row" style={{
                width: '100%', gap: 10, padding: '7px 10px',
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: 'var(--text-2)', fontSize: 13, borderRadius: 7,
              }} onClick={() => setActiveCh(n)}>
                <span style={{
                  width: 6, height: 6, borderRadius: 50,
                  background: `oklch(0.7 0.16 ${cohortHue(n)})`,
                  boxShadow: `0 0 8px oklch(0.7 0.16 ${cohortHue(n)} / 0.6)`,
                }}/>
                <span>{n}기 · {n >= 17 ? '운영중' : n >= 14 ? '활성' : '졸업'}</span>
                <span className="num" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)' }}>{Math.max(8, Math.round(180 / n))}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Feed */}
      <div className="col">
        {/* Compose */}
        <section className="card">
          <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
            <Avatar person={me} size="sm"/>
            <textarea className="textarea" placeholder={`${activeCh === 'all' ? '전체' : activeCh + '기'} 채널에 새 글 쓰기…`} style={{ minHeight: 56 }}/>
          </div>
          <div className="row" style={{ marginTop: 10, gap: 8 }}>
            <button className="icon-btn" style={{ width: 30, height: 30 }}><Icons.Img size={15}/></button>
            <button className="icon-btn" style={{ width: 30, height: 30 }}><Icons.File size={15}/></button>
            <button className="icon-btn" style={{ width: 30, height: 30 }}><Icons.Code size={15}/></button>
            <span style={{ marginLeft: 'auto' }}/>
            <button className="btn btn-sm btn-ghost">초안 저장</button>
            <button className="btn btn-sm btn-primary"><Icons.Send size={13}/> 게시</button>
          </div>
        </section>

        <div className="row" style={{ gap: 8 }}>
          <span className="h-eyebrow">{activeCh === 'all' ? '전체 채널' : `${activeCh}기 채널`}</span>
          <span style={{ color: 'var(--text-4)', fontSize: 11 }}>· {filtered.length}개 게시글</span>
          <div className="tabs" style={{ marginLeft: 'auto' }}>
            <button className="tab active">최신순</button>
            <button className="tab">인기순</button>
            <button className="tab">미답변</button>
          </div>
        </div>

        {filtered.map((p) => <PostCard key={p.id} post={p}/>)}
      </div>
    </div>
  );
};

// ---------------------- SHOWCASE ----------------------
const Showcase = ({ onNavigate }) => {
  const [cat, setCat] = useState('all');
  const cats = [
    { id: 'all', label: '전체', count: projects.length },
    { id: '챗봇', label: '챗봇', count: projects.filter((p) => p.category === '챗봇').length },
    { id: 'RAG', label: 'RAG', count: projects.filter((p) => p.category === 'RAG').length },
    { id: '자동화', label: '자동화', count: projects.filter((p) => p.category === '자동화').length },
    { id: '분석', label: '분석', count: projects.filter((p) => p.category === '분석').length },
  ];
  const filtered = cat === 'all' ? projects : projects.filter((p) => p.category === cat);

  return (
    <div className="content fade-in">
      <div className="col">
        <header style={{ marginBottom: 4 }}>
          <h1 className="h-1">Showcase</h1>
          <p style={{ color: 'var(--text-3)', marginTop: 6 }}>
            졸업생들이 만든 AI 프로젝트 <span className="num" style={{ color: 'var(--text)' }}>148</span>개 — 자유롭게 영감을 얻으세요.
          </p>
        </header>

        <div className="row" style={{ gap: 10 }}>
          <div className="tabs">
            {cats.map((c) => (
              <button key={c.id} className={`tab ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>
                {c.label} <span className="num" style={{ marginLeft: 6, color: 'var(--text-4)' }}>{c.count}</span>
              </button>
            ))}
          </div>
          <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
            <button className="btn btn-sm btn-ghost"><Icons.Filter size={13}/> 기수</button>
            <button className="btn btn-sm btn-ghost">인기순 ▾</button>
            <button className="btn btn-sm btn-primary" onClick={() => onNavigate && onNavigate('showcase-new')}><Icons.Plus size={13}/> 프로젝트 등록</button>
          </div>
        </div>

        {/* Featured hero */}
        <section className="card card-flush" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="row" style={{ alignItems: 'stretch', gap: 0 }}>
            <div className="ph" style={{ flex: '0 0 56%', aspectRatio: '16/9', borderRadius: 0, borderTop: 0, borderLeft: 0, borderBottom: 0 }}>FEATURED PROJECT</div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
              <span className="h-eyebrow" style={{ color: 'var(--accent)' }}>이번 주 추천 · Featured</span>
              <h2 className="h-1" style={{ fontSize: 22 }}>{projects[0].title}</h2>
              <p style={{ color: 'var(--text-2)', margin: 0 }}>
                전국 6,400개 채용공고에서 후보자 스킬과 매칭하는 RAG 기반 추천 엔진. 응답 시간 {`<`} 1.2초, NDCG@10 0.82.
              </p>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <span className="chip">RAG</span>
                <span className="chip">claude-opus</span>
                <span className="chip">Postgres + pgvector</span>
                <CohortBadge n={15}/>
              </div>
              <div className="row" style={{ marginTop: 6, gap: 12 }}>
                <button className="btn btn-primary">자세히 보기 <Icons.Arrow size={14}/></button>
                <button className="btn btn-ghost"><Icons.External size={13}/> 데모</button>
                <button className="btn btn-ghost"><Icons.Github size={13}/></button>
              </div>
            </div>
          </div>
        </section>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--gap)' }}>
          {filtered.map((p) => <ProjectCard key={p.id} project={p}/>)}
        </div>
      </div>
    </div>
  );
};

// ---------------------- IMPACT STORIES ----------------------
const Impact = ({ onNavigate }) => {
  const [ind, setInd] = useState('all');
  const industries = ['all', ...new Set(impactStories.map((s) => s.industry))];
  const filtered = ind === 'all' ? impactStories : impactStories.filter((s) => s.industry === ind);

  // Aggregate stats
  const totals = [
    { label: '누적 임팩트 스토리', value: '128', delta: '+6 this week' },
    { label: '평균 시간 절감', value: '−71%', delta: '6개월 기준' },
    { label: '참여 기업 수', value: '342', delta: '17개 기수 합산' },
  ];

  return (
    <div className="content fade-in">
      <div className="col">
        <header>
          <span className="h-eyebrow">Impact Stories</span>
          <h1 className="h-1" style={{ marginTop: 6 }}>숫자로 증명된 변화</h1>
          <p style={{ color: 'var(--text-3)', marginTop: 8 }}>
            졸업생들이 현장에서 만들어낸 비즈니스 성과 — Claude와 AI 워크플로우가 어떻게 일상의 작업을 바꿨는지.
          </p>
        </header>

        {/* Totals strip */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--gap)' }}>
          {totals.map((t) => (
            <div key={t.label} className="card" style={{ padding: 18 }}>
              <div className="h-eyebrow">{t.label}</div>
              <div className="metric" style={{ marginTop: 8, fontSize: 38 }}>{t.value}</div>
              <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--text-3)' }} className="mono">{t.delta}</div>
            </div>
          ))}
        </section>

        {/* Filter */}
        <div className="row" style={{ gap: 10 }}>
          <div className="tabs">
            {industries.map((i) => (
              <button key={i} className={`tab ${ind === i ? 'active' : ''}`} onClick={() => setInd(i)}>
                {i === 'all' ? '전체' : i}
              </button>
            ))}
          </div>
          <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
            <button className="btn btn-sm btn-ghost"><Icons.Filter size={13}/> 기수</button>
            <button className="btn btn-sm btn-primary" onClick={() => onNavigate && onNavigate('impact-new')}><Icons.Plus size={13}/> 스토리 등록</button>
          </div>
        </div>

        {/* Hero + grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--gap)' }}>
          <div style={{ gridColumn: 'span 7' }}>
            <ImpactCard story={filtered[0]} large/>
          </div>
          <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
            {filtered.slice(1, 3).map((s) => <ImpactCard key={s.id} story={s}/>)}
          </div>
          {filtered.slice(3).map((s) => (
            <div key={s.id} style={{ gridColumn: 'span 4' }}>
              <ImpactCard story={s}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------- ASK THE PROFESSOR ----------------------
const AskProf = ({ onNavigate }) => (
  <div className="content has-rail fade-in">
    <div className="col">
      <header>
        <span className="h-eyebrow">Ask the Professor</span>
        <h1 className="h-1" style={{ marginTop: 6 }}>김성우 교수께 묻기</h1>
        <p style={{ color: 'var(--text-3)', marginTop: 8 }}>
          질문에 투표하세요. 매주 화요일, 투표수가 높은 5개 질문에 답합니다.
        </p>
      </header>

      <div className="row" style={{ gap: 10 }}>
        <div className="tabs">
          <button className="tab active">투표순</button>
          <button className="tab">최신</button>
          <button className="tab">답변완료</button>
          <button className="tab">내 질문</button>
        </div>
        <button className="btn btn-sm btn-primary" style={{ marginLeft: 'auto' }} onClick={() => onNavigate && onNavigate('question-new')}>
          <Icons.Plus size={13}/> 질문하기
        </button>
      </div>

      {questions.map((q) => <QuestionCard key={q.id} q={q}/>)}
    </div>

    <aside className="col">
      <section className="card" style={{ padding: 16 }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div className="avatar lg" style={{ background: 'linear-gradient(135deg, oklch(0.5 0.16 270), oklch(0.4 0.18 320))', borderRadius: 14 }}>김</div>
          <div className="grow">
            <div style={{ fontSize: 14, fontWeight: 600 }}>김성우 교수</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>AI Strategy · 누적 답변 142개</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div className="metric sm">23h</div>
            <div className="h-eyebrow" style={{ marginTop: 2 }}>평균 응답</div>
          </div>
          <div>
            <div className="metric sm">98%</div>
            <div className="h-eyebrow" style={{ marginTop: 2 }}>채택률</div>
          </div>
        </div>
      </section>

      <section className="card card-flush">
        <div className="card-head"><h3>이번 주 답변 예정</h3><span className="crumb">투표 마감 화 18:00</span></div>
        {questions.slice(0, 3).map((q, i) => (
          <div key={q.id} className="row" style={{ padding: '12px 16px', borderTop: i === 0 ? 0 : '1px solid var(--border)', gap: 12 }}>
            <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', minWidth: 24 }}>{q.votes}</div>
            <div className="grow" style={{ fontSize: 13, lineHeight: 1.4 }}>{q.title}</div>
          </div>
        ))}
      </section>
    </aside>
  </div>
);

// ---------------------- RESOURCES ----------------------
const Resources = () => {
  const [cohortF, setCohortF] = useState('all');
  const filtered = cohortF === 'all' ? resources : resources.filter((r) => r.cohort === cohortF);
  return (
    <div className="content fade-in">
      <div className="col">
        <header>
          <h1 className="h-1">Resource Library</h1>
          <p style={{ color: 'var(--text-3)', marginTop: 6 }}>
            17개 기수의 강의자료, 영상, 코드 스타터 — <span className="num" style={{ color: 'var(--text)' }}>1,247</span>개 자료
          </p>
        </header>

        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <div className="search" style={{ minWidth: 320, flex: 1 }}>
            <Icons.Search size={14}/>
            <input placeholder="자료 검색…"/>
            <span className="kbd">⌘K</span>
          </div>
          <div className="tabs">
            {['all', 17, 16, 15, 14].map((n) => (
              <button key={n} className={`tab ${cohortF === n ? 'active' : ''}`} onClick={() => setCohortF(n)}>
                {n === 'all' ? '전체' : `${n}기`}
              </button>
            ))}
          </div>
          <button className="btn btn-sm btn-ghost"><Icons.Filter size={13}/> 카테고리</button>
        </div>

        {/* Type breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--gap)' }}>
          {[
            { type: 'pdf', label: '강의 PDF', count: 142 },
            { type: 'video', label: '영상', count: 89 },
            { type: 'code', label: '코드', count: 47 },
            { type: 'img', label: '다이어그램', count: 28 },
          ].map((s) => {
            const Ic = { pdf: Icons.Pdf, video: Icons.Video, code: Icons.Code, img: Icons.Img }[s.type];
            const color = { pdf: 22, video: 320, code: 220, img: 160 }[s.type];
            return (
              <div key={s.type} className="card" style={{ padding: 16 }}>
                <div className="row">
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: `oklch(0.7 0.16 ${color} / 0.18)`, color: `oklch(0.78 0.16 ${color})`,
                    border: `1px solid oklch(0.7 0.16 ${color} / 0.35)`,
                    display: 'grid', placeItems: 'center',
                  }}><Ic size={16}/></div>
                  <div className="metric sm" style={{ marginLeft: 'auto' }}>{s.count}</div>
                </div>
                <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-2)' }}>{s.label}</div>
              </div>
            );
          })}
        </div>

        <section className="card card-flush">
          <div className="card-head">
            <h3>자료 목록</h3>
            <span className="crumb">정렬: 최근 업로드</span>
          </div>
          {filtered.map((r) => <ResourceItem key={r.id} r={r}/>)}
        </section>
      </div>
    </div>
  );
};

Object.assign(window, { HomeFeed, Community, Showcase, Impact, AskProf, Resources });
