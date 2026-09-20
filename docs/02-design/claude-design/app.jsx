/* global React, ReactDOM, Icons, Avatar, CohortBadge */
/* global me, cohortHue */
/* global HomeFeed, Community, Showcase, Impact, AskProf, Resources */
/* global AIChat, Cohorts, Profile, Notifications, Landing */
/* global ShowcaseRegister, ImpactRegister, QuestionRegister, RegisterSuccess */
/* global TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakSlider, TweakColor, TweakToggle, TweakSelect */
// =====================================================================
// AI4CEO — App shell, sidebar, router, tweaks wiring
// =====================================================================
const { useState, useEffect, useMemo, useRef } = React;

const NAV = [
  { id: 'home',      label: 'Home Feed',     icon: Icons.Home,   group: 'main' },
  { id: 'community', label: 'Community',     icon: Icons.Chat,   group: 'main', badge: 12 },
  { id: 'resources', label: 'Resources',     icon: Icons.Book,   group: 'main' },
  { id: 'aichat',    label: 'AI Chat',       icon: Icons.Bot,    group: 'main' },
  { id: 'showcase',  label: 'Showcase',      icon: Icons.Rocket, group: 'main' },
  { id: 'impact',    label: 'Impact',        icon: Icons.Trend,  group: 'main' },
  { id: 'askprof',   label: 'Ask Professor', icon: Icons.Cap,    group: 'main' },
  { id: 'cohorts',   label: 'Cohorts',       icon: Icons.Users,  group: 'main' },
  { id: 'profile',   label: '내 프로필',     icon: Icons.User,   group: 'me' },
  { id: 'settings',  label: '설정',          icon: Icons.Settings, group: 'me' },
];

const ROUTE_META = {
  home:      { title: 'Home Feed',          crumb: 'AI4CEO · 16기' },
  community: { title: 'Community',          crumb: 'Channels' },
  resources: { title: 'Resource Library',   crumb: 'All cohorts' },
  aichat:    { title: 'AI Chat',            crumb: '학습 도우미' },
  showcase:  { title: 'Showcase',           crumb: '졸업 프로젝트' },
  impact:    { title: 'Impact Stories',     crumb: '비즈니스 성과' },
  askprof:   { title: 'Ask the Professor',  crumb: '주간 Q&A' },
  cohorts:   { title: 'Cohorts',            crumb: '17개 기수' },
  profile:   { title: '내 프로필',          crumb: '강민서' },
  settings:  { title: '설정',               crumb: 'Preferences' },
  'showcase-new': { title: '프로젝트 등록', crumb: 'Showcase · New' },
  'impact-new':   { title: '임팩트 스토리 등록', crumb: 'Impact · New' },
  'question-new': { title: '질문 등록',     crumb: 'Ask Professor · New' },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "hue": 268,
  "density": "balanced",
  "sidebarCollapsed": false,
  "showLanding": false,
  "cohortStyle": "spectrum"
}/*EDITMODE-END*/;

const Sidebar = ({ route, setRoute, collapsed }) => (
  <aside className="sidebar">
    <div className="brand">
      <div className="brand-mark">AI</div>
      <div style={{ minWidth: 0 }}>
        <div className="brand-name">AI4CEO</div>
        <div className="brand-sub">Cohort 16 · Active</div>
      </div>
    </div>

    <div className="nav-section">
      {NAV.filter((n) => n.group === 'main').map((n) => {
        const Ic = n.icon;
        const active = route === n.id;
        return (
          <button key={n.id}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => setRoute(n.id)}
            title={n.label}>
            <Ic className="icon" size={18}/>
            <span>{n.label}</span>
            {n.badge && <span className="badge">{n.badge}</span>}
          </button>
        );
      })}
    </div>

    <div className="sidebar-bottom">
      <div className="nav-section" style={{ marginBottom: 6 }}>
        {NAV.filter((n) => n.group === 'me').map((n) => {
          const Ic = n.icon;
          const active = route === n.id;
          return (
            <button key={n.id} className={`nav-item ${active ? 'active' : ''}`} onClick={() => setRoute(n.id)} title={n.label}>
              <Ic className="icon" size={18}/>
              <span>{n.label}</span>
            </button>
          );
        })}
      </div>
      <button className="user-chip" onClick={() => setRoute('profile')}>
        <Avatar person={me} size="sm"/>
        <div className="user-meta">
          <div className="user-name">{me.name}</div>
          <div className="user-cohort">{me.company} · 16기</div>
        </div>
      </button>
    </div>
  </aside>
);

const TopBar = ({ route, onNotif, notifOpen }) => {
  const meta = ROUTE_META[route] || ROUTE_META.home;
  return (
    <div className="topbar">
      <span className="crumb">{meta.crumb}</span>
      <Icons.ChevronR size={12} className="muted"/>
      <h1>{meta.title}</h1>

      <div className="topbar-right">
        <div className="search">
          <Icons.Search size={14}/>
          <input placeholder="검색…"/>
          <span className="kbd">⌘K</span>
        </div>
        <button className="icon-btn" onClick={onNotif}>
          <Icons.Bell size={18}/>
          <span className="dot"/>
        </button>
        <button className="icon-btn"><Icons.Settings size={18}/></button>
      </div>
    </div>
  );
};

const App = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState(t.showLanding ? '_landing' : 'home');
  const [notifOpen, setNotifOpen] = useState(false);
  const [success, setSuccess] = useState(null); // { title, sub, viewLabel, returnTo }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.setAttribute('data-density', t.density);
    document.documentElement.style.setProperty('--hue', String(t.hue));
  }, [t.theme, t.density, t.hue]);

  // close notif on route change
  useEffect(() => { setNotifOpen(false); setSuccess(null); }, [route]);

  // landing
  if (route === '_landing') {
    return <Landing onEnter={() => setRoute('home')}/>;
  }

  const completeSuccess = (cfg) => setSuccess(cfg);

  const renderScreen = () => {
    if (success) {
      return <RegisterSuccess
        title={success.title} sub={success.sub} viewLabel={success.viewLabel}
        onView={() => { setSuccess(null); setRoute(success.returnTo); }}
        onClose={() => { setSuccess(null); setRoute('home'); }}/>;
    }
    switch (route) {
      case 'home':      return <HomeFeed onNavigate={setRoute}/>;
      case 'community': return <Community/>;
      case 'resources': return <Resources/>;
      case 'aichat':    return <AIChat/>;
      case 'showcase':  return <Showcase onNavigate={setRoute}/>;
      case 'impact':    return <Impact onNavigate={setRoute}/>;
      case 'askprof':   return <AskProf onNavigate={setRoute}/>;
      case 'cohorts':   return <Cohorts/>;
      case 'profile':   return <Profile/>;
      case 'showcase-new': return <ShowcaseRegister
        onClose={() => setRoute('showcase')}
        onDone={() => completeSuccess({
          title: '프로젝트가 등록됐어요',
          sub: 'Showcase 갤러리에 노출됩니다. 동기들의 좋아요와 댓글을 기다려보세요.',
          viewLabel: '갤러리로 가기', returnTo: 'showcase',
        })}/>;
      case 'impact-new': return <ImpactRegister
        onClose={() => setRoute('impact')}
        onDone={() => completeSuccess({
          title: '임팩트 스토리가 게시됐어요',
          sub: '다른 대표들이 의사결정에 참고할 수 있도록 Impact Wall에 노출됩니다.',
          viewLabel: 'Impact Wall로 가기', returnTo: 'impact',
        })}/>;
      case 'question-new': return <QuestionRegister
        onClose={() => setRoute('askprof')}
        onDone={() => completeSuccess({
          title: '질문이 등록됐어요',
          sub: '투표가 모이면 교수님이 답변합니다. 다음 화요일 18:00 마감.',
          viewLabel: '질문 목록으로', returnTo: 'askprof',
        })}/>;
      default: return <HomeFeed onNavigate={setRoute}/>;
    }
  };

  const noTopbar = route === 'aichat';

  return (
    <>
      <div className="app" data-collapsed={String(t.sidebarCollapsed)}>
        <Sidebar route={route} setRoute={setRoute} collapsed={t.sidebarCollapsed}/>
        <main className="main">
          {!noTopbar && <TopBar route={route} onNotif={() => setNotifOpen((v) => !v)}/>}
          {noTopbar && (
            <div className="topbar">
              <span className="crumb">{ROUTE_META[route].crumb}</span>
              <Icons.ChevronR size={12} className="muted"/>
              <h1>{ROUTE_META[route].title}</h1>
              <div className="topbar-right">
                <button className="icon-btn" onClick={() => setNotifOpen((v) => !v)}>
                  <Icons.Bell size={18}/><span className="dot"/>
                </button>
              </div>
            </div>
          )}
          {notifOpen && <Notifications onClose={() => setNotifOpen(false)}/>}
          {renderScreen()}
        </main>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="화면">
          <TweakSelect label="현재 화면" value={route} onChange={setRoute}
            options={[
              { value: '_landing', label: 'Landing (Public)' },
              { value: 'home', label: 'Home Feed' },
              { value: 'community', label: 'Community' },
              { value: 'resources', label: 'Resources' },
              { value: 'aichat', label: 'AI Chat' },
              { value: 'showcase', label: 'Showcase' },
              { value: 'impact', label: 'Impact Stories' },
              { value: 'askprof', label: 'Ask Professor' },
              { value: 'cohorts', label: 'Cohorts' },
              { value: 'profile', label: 'Profile' },
              { value: 'showcase-new', label: '— 프로젝트 등록 (4 steps)' },
              { value: 'impact-new',   label: '— 임팩트 스토리 등록 (4 steps)' },
              { value: 'question-new', label: '— 질문 등록 (2 steps)' },
            ]}/>
        </TweakSection>

        <TweakSection label="테마">
          <TweakRadio label="모드" value={t.theme} onChange={(v) => setTweak('theme', v)}
            options={['dark', 'light']}/>
          <TweakColor label="액센트" value={`oklch(0.66 0.20 ${t.hue})`}
            onChange={(v) => {
              const m = /\s(\d+(?:\.\d+)?)\s*\)/.exec(v);
              if (m) setTweak('hue', Math.round(parseFloat(m[1])));
            }}
            options={[
              'oklch(0.66 0.20 268)',
              'oklch(0.66 0.20 240)',
              'oklch(0.66 0.20 300)',
              'oklch(0.66 0.20 200)',
              'oklch(0.66 0.20 25)',
            ]}/>
          <TweakSlider label="Hue 정밀 조정" value={t.hue} min={0} max={360} step={1}
            onChange={(v) => setTweak('hue', v)}/>
        </TweakSection>

        <TweakSection label="레이아웃">
          <TweakRadio label="정보 밀도" value={t.density} onChange={(v) => setTweak('density', v)}
            options={['compact', 'balanced', 'relaxed']}/>
          <TweakToggle label="사이드바 접기" value={t.sidebarCollapsed}
            onChange={(v) => setTweak('sidebarCollapsed', v)}/>
        </TweakSection>
      </TweaksPanel>
    </>
  );
};

// Patch: TweakColor in starter takes options as array of strings → we'll wire onChange to update hue.
// Override the simple TweakColor click to extract hue and call setTweak('hue', ...)
// (Doing it via custom child instead — but starter handles selection visually. Hue picker provides exact control.)

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
