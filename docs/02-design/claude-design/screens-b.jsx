/* global React, Icons, Avatar, CohortBadge, Sparkline */
/* global me, people, posts, projects, impactStories, questions, resources, cohortHue */
// =====================================================================
// AI4CEO — Screens (AI Chat, Cohorts, Profile, Landing, Notifications)
// =====================================================================
const { useState: useState2, useEffect: useEffect2, useRef: useRef2 } = React;

// ---------------------- AI CHAT ----------------------
const aiHistory = [
  { id: 1, title: 'RAG 청크 사이즈 추천', date: '오늘', active: true },
  { id: 2, title: 'Claude API 비용 최적화', date: '어제' },
  { id: 3, title: '에이전트 디버깅 가이드', date: '3일 전' },
  { id: 4, title: '14주차 강의 요약', date: '1주 전' },
  { id: 5, title: '프롬프트 캐싱 사례', date: '2주 전' },
];
const initialMsgs = [
  { role: 'user', text: '한국어 PDF 매뉴얼을 RAG에 넣을 때 청크 사이즈는 어떻게 잡는게 좋을까요? 500자랑 1200자 비교중인데요.' },
  { role: 'ai', text: '한국어 매뉴얼은 보통 의미 단위가 길어서 1000~1500자 + 200자 overlap이 안정적입니다. 다만 몇 가지 변수가 더 있는데요:', citations: [
    { id: 1, label: '17기 8주차 강의노트', page: 'p.14' },
    { id: 2, label: '16기 한지우 프로젝트 회고', page: '청크 실험' },
  ]},
];

const AIChat = () => {
  const [msgs, setMsgs] = useState2(initialMsgs);
  const [input, setInput] = useState2('');
  const [streaming, setStreaming] = useState2(false);
  const scrollRef = useRef2();

  useEffect2(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, streaming]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMsgs((m) => [...m, userMsg]);
    setInput('');
    setStreaming(true);
    setTimeout(() => {
      setMsgs((m) => [...m, {
        role: 'ai',
        text: '좋은 질문이에요. 16기 동기들이 비슷한 케이스를 정리한 자료가 있어서 함께 참고하면 도움될 거에요. 핵심은 검색 품질을 정량적으로 측정 가능한 평가셋을 먼저 만드는 것입니다.',
        citations: [{ id: 1, label: '관련 강의노트', page: 'p.22' }],
      }]);
      setStreaming(false);
    }, 1200);
  };

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', height: 'calc(100vh - var(--topbar-h))' }}>
      {/* History */}
      <aside style={{
        borderRight: '1px solid var(--border)',
        padding: 14,
        display: 'flex', flexDirection: 'column',
        gap: 6,
        overflow: 'auto',
        background: 'oklch(0.16 0.014 var(--hue) / 0.4)',
      }}>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'flex-start' }}>
          <Icons.Plus size={14}/> 새 대화
        </button>
        <div className="h-eyebrow" style={{ marginTop: 14, padding: '0 6px' }}>대화 기록</div>
        {aiHistory.map((c) => (
          <button key={c.id} className="row" style={{
            gap: 10, padding: '9px 10px', borderRadius: 8,
            background: c.active ? 'var(--accent-soft)' : 'transparent',
            color: c.active ? 'var(--text)' : 'var(--text-2)',
            fontSize: 12.5, textAlign: 'left',
          }}>
            <Icons.MsgDot size={14} className="muted"/>
            <div className="grow truncate">{c.title}</div>
            <span style={{ fontSize: 10, color: 'var(--text-4)' }} className="mono">{c.date}</span>
          </button>
        ))}
      </aside>

      {/* Conversation */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Chat header */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--accent), oklch(0.55 0.20 320))',
            display: 'grid', placeItems: 'center', color: 'white',
          }}><Icons.Sparkle size={16}/></div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>AI4CEO Assistant</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>16기 컨텍스트 · 강의자료 + 동기 토론 우선 참조</div>
          </div>
          <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
            <span className="chip" style={{ background: 'var(--accent-soft)', border: 0 }}><Icons.Cap size={11}/> 16기</span>
            <button className="btn btn-sm btn-ghost">컨텍스트 변경 ▾</button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '24px 24px 16px' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {msgs.map((m, i) => (
              m.role === 'user' ? (
                <div key={i} style={{ alignSelf: 'flex-end', maxWidth: '78%' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '16px 16px 4px 16px',
                    background: 'var(--accent-soft-2)',
                    border: '1px solid oklch(0.55 0.18 var(--hue) / 0.25)',
                    fontSize: 13.5, lineHeight: 1.6,
                  }}>{m.text}</div>
                </div>
              ) : (
                <div key={i} className="row" style={{ alignItems: 'flex-start', gap: 12, maxWidth: '95%' }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 9, flex: '0 0 30px',
                    background: 'linear-gradient(135deg, var(--accent), oklch(0.55 0.20 320))',
                    display: 'grid', placeItems: 'center', color: 'white',
                  }}><Icons.Sparkle size={14}/></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '4px 16px 16px 16px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      fontSize: 13.5, lineHeight: 1.6,
                    }}>{m.text}</div>
                    {m.citations && (
                      <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {m.citations.map((c, ci) => (
                          <span key={ci} className="chip" style={{ background: 'var(--surface-2)', height: 22, fontSize: 11 }}>
                            <Icons.Book size={11}/> {c.label} <span className="muted">· {c.page}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            ))}
            {streaming && (
              <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9, flex: '0 0 30px',
                  background: 'linear-gradient(135deg, var(--accent), oklch(0.55 0.20 320))',
                  display: 'grid', placeItems: 'center', color: 'white',
                }}><Icons.Sparkle size={14}/></div>
                <div className="row" style={{ gap: 4, padding: '14px 16px', background: 'var(--surface)', borderRadius: '4px 16px 16px 16px', border: '1px solid var(--border)' }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: 50, background: 'var(--accent)',
                      animation: `bounce 1.2s ${i * 0.15}s infinite ease-in-out`,
                    }}/>
                  ))}
                </div>
                <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.5} 40%{transform:scale(1);opacity:1} }`}</style>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div style={{ padding: '12px 24px 22px', borderTop: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 8,
              padding: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
            }}>
              <button className="icon-btn"><Icons.Plus size={16}/></button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="질문을 입력하세요… (Shift+Enter 줄바꿈)"
                style={{
                  flex: 1, background: 'transparent', border: 0, outline: 'none',
                  resize: 'none', color: 'var(--text)', fontSize: 14, minHeight: 24, maxHeight: 200,
                  fontFamily: 'var(--font-sans)',
                }}
                rows={1}
              />
              <button className="icon-btn"><Icons.Code size={16}/></button>
              <button className="btn btn-primary btn-icon" onClick={send} disabled={!input.trim()}>
                <Icons.Send size={15}/>
              </button>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 10, color: 'var(--text-4)', fontSize: 11, justifyContent: 'center' }}>
              <span>응답은 강의자료와 동기 토론을 기반으로 합니다 ·</span>
              <span className="mono">claude-sonnet-4-5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------- COHORTS ----------------------
const Cohorts = () => {
  const cohortList = Array.from({ length: 17 }, (_, i) => 17 - i).map((n) => ({
    n, members: Math.max(28, Math.round(90 - (17 - n) * 2)),
    status: n === 17 ? '진행중' : n >= 14 ? '활성' : '졸업',
    impact: Math.round(8 + (17 - n) * 1.5),
    projects: Math.round(6 + (17 - n) * 0.8),
  }));

  return (
    <div className="content fade-in">
      <div className="col">
        <header>
          <h1 className="h-1">Cohorts</h1>
          <p style={{ color: 'var(--text-3)', marginTop: 6 }}>
            1기부터 17기까지 — 누적 졸업생 <span className="num" style={{ color: 'var(--text)' }}>1,247</span>명
          </p>
        </header>

        {/* Cohort timeline visualization */}
        <section className="card" style={{ padding: 22, overflow: 'hidden' }}>
          <div className="h-eyebrow">기수별 누적 임팩트</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, marginTop: 14 }}>
            {cohortList.slice().reverse().map((c) => (
              <div key={c.n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: '100%',
                  height: `${(c.impact / 35) * 100}%`,
                  minHeight: 8,
                  borderRadius: '4px 4px 0 0',
                  background: `linear-gradient(180deg, oklch(0.75 0.16 ${cohortHue(c.n)}), oklch(0.45 0.16 ${cohortHue(c.n)}))`,
                  boxShadow: `0 0 12px oklch(0.7 0.16 ${cohortHue(c.n)} / 0.35)`,
                  transition: 'transform 200ms',
                }}/>
                <div className="num" style={{ fontSize: 10, color: 'var(--text-4)' }}>{c.n}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="row">
          <div className="tabs">
            <button className="tab active">전체</button>
            <button className="tab">진행중</button>
            <button className="tab">활성</button>
            <button className="tab">졸업</button>
          </div>
          <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>최신순</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--gap)' }}>
          {cohortList.map((c) => (
            <article key={c.n} className="card" style={{
              padding: 18,
              borderColor: c.status === '진행중' ? `oklch(0.55 0.16 ${cohortHue(c.n)} / 0.5)` : 'var(--border)',
              position: 'relative', overflow: 'hidden',
            }}>
              {c.status === '진행중' && (
                <div style={{
                  position: 'absolute', top: -50, right: -50, width: 160, height: 160,
                  background: `radial-gradient(circle, oklch(0.6 0.18 ${cohortHue(c.n)} / 0.25), transparent 70%)`,
                  pointerEvents: 'none',
                }}/>
              )}
              <div className="row" style={{ position: 'relative' }}>
                <CohortBadge n={c.n} size="lg"/>
                <span className="chip" style={{
                  marginLeft: 'auto', fontSize: 10,
                  background: c.status === '진행중' ? 'var(--success-soft)' : c.status === '활성' ? 'var(--accent-soft)' : 'var(--surface-2)',
                  color: c.status === '진행중' ? 'var(--success)' : c.status === '활성' ? 'var(--text)' : 'var(--text-3)',
                  border: 0,
                }}>{c.status}</span>
              </div>
              <h3 className="h-3" style={{ marginTop: 12 }}>
                {c.n}기 · {2024 - Math.floor((17 - c.n) / 2)}년 {(17 - c.n) % 2 === 0 ? '상반기' : '하반기'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
                <div>
                  <div className="metric sm">{c.members}</div>
                  <div className="h-eyebrow" style={{ marginTop: 2 }}>멤버</div>
                </div>
                <div>
                  <div className="metric sm">{c.projects}</div>
                  <div className="h-eyebrow" style={{ marginTop: 2 }}>프로젝트</div>
                </div>
                <div>
                  <div className="metric sm">{c.impact}</div>
                  <div className="h-eyebrow" style={{ marginTop: 2 }}>임팩트</div>
                </div>
              </div>
              <div className="row" style={{ marginTop: 14, gap: -6 }}>
                {[0, 1, 2, 3].map((i) => {
                  const p = people[(c.n + i) % people.length];
                  return (
                    <div key={i} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i, border: '2px solid var(--surface)', borderRadius: '50%' }}>
                      <Avatar person={p} size="sm"/>
                    </div>
                  );
                })}
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-3)' }} className="num">+{c.members - 4}명</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------- PROFILE ----------------------
const Profile = () => {
  const [tab, setTab] = useState2('posts');
  return (
    <div className="content fade-in">
      <div className="col">
        {/* Hero */}
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="ph" style={{ height: 140, borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>COVER IMAGE</div>
          <div style={{ padding: '0 24px 22px', marginTop: -44, position: 'relative' }}>
            <div className="row" style={{ alignItems: 'flex-end', gap: 16 }}>
              <div style={{ border: '4px solid var(--surface)', borderRadius: 22 }}>
                <Avatar person={me} size="xl" square/>
              </div>
              <div className="grow" style={{ paddingBottom: 6 }}>
                <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                  <h1 className="h-1" style={{ fontSize: 22 }}>{me.name}</h1>
                  <CohortBadge n={me.cohort} size="lg"/>
                </div>
                <div className="row" style={{ gap: 8, color: 'var(--text-3)', fontSize: 13 }}>
                  <Icons.Building size={14}/> {me.company}
                  <span>·</span>
                  <span>{me.role}</span>
                  <span>·</span>
                  <Icons.Clock size={14}/> 가입 8개월
                </div>
              </div>
              <div className="row" style={{ gap: 8, paddingBottom: 6 }}>
                <button className="btn btn-ghost">설정</button>
                <button className="btn btn-primary">프로필 편집</button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--gap)' }}>
          {[
            { label: '게시글', value: '47' },
            { label: '프로젝트', value: '3' },
            { label: '임팩트 스토리', value: '2' },
            { label: '받은 좋아요', value: '512' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: 16 }}>
              <div className="metric sm">{s.value}</div>
              <div className="h-eyebrow" style={{ marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { id: 'posts', label: '내 게시글' },
            { id: 'projects', label: '내 프로젝트' },
            { id: 'impact', label: '임팩트 스토리' },
            { id: 'about', label: '소개' },
          ].map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {tab === 'posts' && (
          <div className="col">
            {posts.slice(0, 2).map((p) => (
              <div key={p.id} className="card" style={{ padding: 16 }}>
                <div className="row" style={{ gap: 8, marginBottom: 6, fontSize: 11.5, color: 'var(--text-3)' }}>
                  <CohortBadge n={me.cohort}/>
                  <span className="mono">{p.time}</span>
                </div>
                <div className="h-3">{p.title}</div>
                <div style={{ color: 'var(--text-2)', fontSize: 13.5, marginTop: 6 }}>{p.body}</div>
              </div>
            ))}
          </div>
        )}
        {tab === 'projects' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--gap)' }}>
            {projects.slice(0, 3).map((p) => (
              <div key={p.id} className="card card-flush">
                <div className="ph" style={{ aspectRatio: '16/10', borderRadius: 0, border: 0 }}>{p.ph}</div>
                <div style={{ padding: 14 }}>
                  <div className="h-3" style={{ fontSize: 14 }}>{p.title}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{p.category}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'impact' && (
          <div className="col">
            <div className="card" style={{ padding: 24 }}>
              <CohortBadge n={me.cohort}/>
              <div className="metric" style={{ marginTop: 12, fontSize: 44, color: 'oklch(0.85 0.14 200)' }}>−68% 응답시간</div>
              <p style={{ color: 'var(--text-2)', marginTop: 12 }}>리프트랩 — 고객 문의 자동 분류 시스템 도입. 1차 응답 평균 35분 → 11분.</p>
            </div>
          </div>
        )}
        {tab === 'about' && (
          <div className="card" style={{ padding: 24, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
            리프트랩에서 B2B 콘텐츠 마케팅 SaaS를 운영하고 있습니다. AI4CEO에서는 RAG와 워크플로우 자동화에 집중하고 있어요.
            <hr className="sep" style={{ margin: '16px 0' }}/>
            <div className="row" style={{ gap: 16, color: 'var(--text-3)', fontSize: 13 }}>
              <span><Icons.External size={13}/> liftlab.co</span>
              <span><Icons.Github size={13}/> @ms-kang</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------- NOTIFICATIONS PANEL ----------------------
const Notifications = ({ onClose }) => {
  const items = [
    { id: 1, who: people[0], action: '님이 회원님의 게시글에 좋아요를 눌렀어요', time: '5분 전', unread: true, type: 'like' },
    { id: 2, who: people[2], action: '님이 회원님의 질문에 답변했어요', time: '32분 전', unread: true, type: 'reply' },
    { id: 3, who: { name: '김성우 교수', initials: '김', hue: 270 }, action: '교수님이 회원님의 질문에 답변을 게시했어요', time: '2시간 전', unread: true, type: 'prof' },
    { id: 4, who: people[1], action: '님이 회원님을 멘션했어요: "@강민서 RAG 청크 관련해서…"', time: '어제', unread: false, type: 'mention' },
    { id: 5, who: { name: '시스템', initials: 'S', hue: 0 }, action: '17기 8주차 강의자료가 업로드됐어요', time: '어제', unread: false, type: 'sys' },
  ];
  return (
    <div style={{
      position: 'absolute', top: 50, right: 24, width: 380, zIndex: 30,
      background: 'var(--bg-elev)', border: '1px solid var(--border-strong)', borderRadius: 14,
      boxShadow: 'var(--shadow-lg)',
      overflow: 'hidden',
    }}>
      <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div className="h-3">알림</div>
        <span className="chip solid" style={{ marginLeft: 6 }}>3</span>
        <button className="muted" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={onClose}>모두 읽음</button>
      </div>
      <div style={{ maxHeight: 460, overflow: 'auto' }}>
        {items.map((n) => (
          <div key={n.id} className="row" style={{
            gap: 12, padding: '12px 16px', alignItems: 'flex-start',
            background: n.unread ? 'oklch(0.66 0.20 var(--hue) / 0.06)' : 'transparent',
            borderTop: '1px solid var(--border)',
          }}>
            <Avatar person={n.who} size="sm"/>
            <div className="grow" style={{ fontSize: 13, lineHeight: 1.45 }}>
              <span style={{ fontWeight: 600 }}>{n.who.name}</span>
              <span style={{ color: 'var(--text-2)' }}>{n.action}</span>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-4)' }} className="mono">{n.time}</div>
            </div>
            {n.unread && <span style={{ width: 7, height: 7, borderRadius: 50, background: 'var(--accent)', marginTop: 6 }}/>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------- LANDING ----------------------
const Landing = ({ onEnter }) => (
  <div className="fade-in" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
    <header className="row" style={{ padding: '18px 32px', borderBottom: '1px solid var(--border)' }}>
      <div className="row" style={{ gap: 10 }}>
        <div className="brand-mark">AI</div>
        <div>
          <div className="brand-name">AI4CEO</div>
          <div className="brand-sub">Founders · cohort 17</div>
        </div>
      </div>
      <nav className="row" style={{ marginLeft: 'auto', gap: 22, fontSize: 13, color: 'var(--text-2)' }}>
        <a>커리큘럼</a><a>졸업생</a><a>임팩트</a><a>FAQ</a>
        <button className="btn btn-ghost btn-sm">로그인</button>
        <button className="btn btn-primary btn-sm" onClick={onEnter}>17기 가입 신청</button>
      </nav>
    </header>

    {/* Hero */}
    <section style={{ padding: '80px 32px 60px', maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
      <div style={{ maxWidth: 760 }}>
        <span className="chip" style={{ background: 'var(--accent-soft)', border: 0, color: 'var(--text)' }}>
          <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--accent)' }}/> 17기 모집 — 12석 남음 · 06/30 마감
        </span>
        <h1 style={{
          marginTop: 22, marginBottom: 0,
          fontSize: 64, lineHeight: 1.05, letterSpacing: '-0.03em', fontWeight: 700,
          textWrap: 'balance',
        }}>
          AI를 도입하는<br/>
          <span style={{
            background: 'linear-gradient(90deg, var(--accent), oklch(0.7 0.16 320))',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>CEO 1,247명</span>의 커뮤니티
        </h1>
        <p style={{ marginTop: 22, fontSize: 17, color: 'var(--text-2)', maxWidth: 600, lineHeight: 1.55 }}>
          10주 동안 직접 만들고, 같은 자리에 있는 동료 대표들과 사례를 공유하며, 매주 교수에게 질문할 수 있는 학습 공동체.
        </p>
        <div className="row" style={{ gap: 12, marginTop: 28 }}>
          <button className="btn btn-primary btn-lg" onClick={onEnter}>가입 신청 <Icons.Arrow size={15}/></button>
          <button className="btn btn-ghost btn-lg">졸업생 인터뷰 보기</button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        marginTop: 60,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
        border: '1px solid var(--border)', borderRadius: 18,
        background: 'var(--surface)',
        overflow: 'hidden',
      }}>
        {[
          { v: '1,247', l: '졸업생' },
          { v: '17', l: '기수 · 운영중' },
          { v: '10주', l: '집중 과정' },
          { v: '128', l: '임팩트 스토리' },
        ].map((s, i) => (
          <div key={s.l} style={{ padding: 28, borderLeft: i === 0 ? 0 : '1px solid var(--border)' }}>
            <div className="metric xl" style={{ background: i === 0 ? 'linear-gradient(135deg, var(--accent), oklch(0.7 0.16 320))' : undefined, WebkitBackgroundClip: i === 0 ? 'text' : undefined, color: i === 0 ? 'transparent' : 'var(--text)' }}>{s.v}</div>
            <div className="h-eyebrow" style={{ marginTop: 8 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </section>

    {/* Impact Wall */}
    <section style={{ padding: '40px 32px 80px', maxWidth: 1200, margin: '0 auto' }}>
      <div className="row" style={{ marginBottom: 24 }}>
        <div>
          <span className="h-eyebrow">Impact Wall</span>
          <h2 className="h-1" style={{ marginTop: 6, fontSize: 32 }}>현장에서 만들어진 결과</h2>
        </div>
        <button className="btn btn-ghost" style={{ marginLeft: 'auto' }}>전체 보기 →</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--gap)' }}>
        {impactStories.slice(0, 3).map((s) => (
          <div key={s.id} className="card" style={{
            padding: 26,
            borderColor: `oklch(0.55 0.14 ${s.color} / 0.4)`,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(400px 200px at 100% 0%, oklch(0.55 0.18 ${s.color} / 0.18), transparent 60%)`,
              pointerEvents: 'none',
            }}/>
            <div style={{ position: 'relative' }}>
              <span className="chip">{s.industry}</span>
              <div className="metric" style={{ fontSize: 52, marginTop: 14, color: `oklch(0.92 0.12 ${s.color})` }}>{s.headline}</div>
              <p style={{ color: 'var(--text-2)', marginTop: 14, fontSize: 14 }}>{s.summary}</p>
              <div className="row" style={{ marginTop: 18, gap: 8 }}>
                <Avatar person={s.author} size="sm"/>
                <span style={{ fontSize: 13 }}>{s.author.name} · {s.author.company}</span>
                <CohortBadge n={s.cohort}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* CTA */}
    <section style={{ padding: '60px 32px 100px', maxWidth: 1200, margin: '0 auto' }}>
      <div className="card" style={{
        padding: 48, textAlign: 'center', position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(800px 300px at 50% 0%, var(--accent-soft), transparent 60%), var(--surface)',
      }}>
        <span className="h-eyebrow">17기 모집중</span>
        <h2 className="h-1" style={{ fontSize: 40, marginTop: 10 }}>당신의 회사에 AI를 도입할 차례입니다</h2>
        <p style={{ color: 'var(--text-2)', marginTop: 14, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
          10주, 78명의 대표, 그리고 매주 함께 만드는 시간. 06/30 까지 신청 가능합니다.
        </p>
        <button className="btn btn-primary btn-lg" style={{ marginTop: 28 }} onClick={onEnter}>가입 신청하기 <Icons.Arrow size={15}/></button>
      </div>
    </section>
  </div>
);

Object.assign(window, { AIChat, Cohorts, Profile, Notifications, Landing });
