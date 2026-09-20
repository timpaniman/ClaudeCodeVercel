/* global React, Icons, CohortBadge */
// =====================================================================
// AI4CEO — Shared Components (cards, post, project, impact, etc.)
// =====================================================================

const Avatar = ({ person, size = 'md', square = false }) => {
  const cls = size === 'sm' ? 'avatar sm' : size === 'lg' ? 'avatar lg' : size === 'xl' ? 'avatar xl' : 'avatar';
  const hue = person?.hue ?? 270;
  return (
    <div className={cls}
      style={{
        background: `linear-gradient(135deg, oklch(0.65 0.15 ${hue}), oklch(0.45 0.18 ${(hue+40)%360}))`,
        borderRadius: square ? 'var(--radius)' : '50%',
      }}>
      {person?.initials || person?.name?.[0] || '?'}
    </div>
  );
};

const PostCard = ({ post, compact = false }) => (
  <article className="card" style={{ padding: compact ? 14 : undefined }}>
    <header className="row" style={{ alignItems: 'flex-start', marginBottom: 10 }}>
      <Avatar person={post.author} size="sm" />
      <div className="grow" style={{ lineHeight: 1.3 }}>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{post.author.name}</span>
          <CohortBadge n={post.cohort} />
          {post.pinned && (
            <span className="chip" style={{ height: 20, fontSize: 10, color: 'var(--warn)', background: 'var(--warn-soft)', border: 0 }}>
              <Icons.Pin size={11} stroke={2.4}/> 고정
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-4)' }}>
          {post.author.role} · {post.author.company} · {post.time}
        </div>
      </div>
      <button className="icon-btn" style={{ width: 28, height: 28 }}>
        <Icons.Dot size={16} />
      </button>
    </header>

    <h3 className="h-3" style={{ marginBottom: 6 }}>{post.title}</h3>
    <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13.5 }}>{post.body}</p>

    {post.image && (
      <div className="ph" style={{ height: 180, marginTop: 12 }}>{post.image}</div>
    )}

    {post.tags && (
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {post.tags.map((t) => <span key={t} className="chip" style={{ height: 22, fontSize: 11 }}>#{t}</span>)}
      </div>
    )}

    <footer className="row" style={{ gap: 18, marginTop: 14, color: 'var(--text-3)' }}>
      <button className="row" style={{ gap: 6, color: 'inherit' }}>
        <Icons.Heart size={15} /> <span className="num" style={{ fontSize: 12.5 }}>{post.likes}</span>
      </button>
      <button className="row" style={{ gap: 6, color: 'inherit' }}>
        <Icons.MsgDot size={15} /> <span className="num" style={{ fontSize: 12.5 }}>{post.comments}</span>
      </button>
      <button className="row" style={{ gap: 6, color: 'inherit', marginLeft: 'auto' }}>
        <Icons.Bookmark size={15} />
      </button>
      <button className="row" style={{ gap: 6, color: 'inherit' }}>
        <Icons.Share size={15} />
      </button>
    </footer>
  </article>
);

// ---------- ImpactCard — "number-first" hero card ----------
const ImpactCard = ({ story, large = false }) => {
  const hue = story.color;
  return (
    <article className="card card-flush" style={{
      borderColor: `oklch(0.50 0.14 ${hue} / 0.35)`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(600px 240px at 100% 0%, oklch(0.55 0.18 ${hue} / 0.18), transparent 60%)`,
        pointerEvents: 'none',
      }}/>
      <div style={{ padding: large ? '24px 24px 18px' : '20px 20px 14px', position: 'relative' }}>
        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          <span className="chip" style={{
            background: `oklch(0.50 0.14 ${hue} / 0.18)`,
            color: `oklch(0.85 0.12 ${hue})`,
            borderColor: `oklch(0.55 0.14 ${hue} / 0.35)`,
          }}>{story.industry}</span>
          <CohortBadge n={story.cohort} />
        </div>
        <div className="metric" style={{
          fontSize: large ? 64 : 44,
          color: `oklch(0.95 0.08 ${hue})`,
        }}>
          {story.headline}
        </div>
        <p style={{ marginTop: 14, marginBottom: 0, color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.55 }}>
          {story.summary}
        </p>
      </div>
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'oklch(0.16 0.014 var(--hue) / 0.4)',
      }}>
        <Avatar person={story.author} size="sm" />
        <div className="grow" style={{ lineHeight: 1.3, minWidth: 0 }}>
          <div className="truncate" style={{ fontSize: 12.5, fontWeight: 600 }}>
            {story.author.name} · {story.author.company}
          </div>
          <div className="row" style={{ gap: 6, fontSize: 11, color: 'var(--text-4)' }}>
            {story.tech.map((t, i) => (
              <span key={t} className="mono">{i > 0 && '·'} {t}</span>
            ))}
          </div>
        </div>
        <button className="icon-btn" style={{ width: 28, height: 28 }}><Icons.Arrow size={15}/></button>
      </div>
    </article>
  );
};

// ---------- ProjectCard — showcase tile ----------
const ProjectCard = ({ project }) => (
  <article className="card card-flush" style={{ transition: 'transform 150ms, border-color 150ms', cursor: 'pointer' }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = ''; }}>
    <div className="ph" style={{ aspectRatio: '16/10', borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
      {project.ph}
    </div>
    <div style={{ padding: 14 }}>
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="chip" style={{ height: 20, fontSize: 10.5 }}>{project.category}</span>
        <CohortBadge n={project.cohort} />
        <div className="row" style={{ marginLeft: 'auto', gap: 4, color: 'var(--text-3)' }}>
          <Icons.Heart size={13}/>
          <span className="num" style={{ fontSize: 12 }}>{project.likes}</span>
        </div>
      </div>
      <div className="h-3" style={{ fontSize: 14, marginBottom: 6 }}>{project.title}</div>
      <div className="row" style={{ gap: 8, color: 'var(--text-3)', fontSize: 12 }}>
        <Avatar person={project.author} size="sm" />
        <span>{project.author.name}</span>
      </div>
    </div>
  </article>
);

// ---------- QuestionCard ----------
const QuestionCard = ({ q }) => {
  const status = q.status === 'wait'
    ? { cls: 'status-wait', label: '대기중' }
    : q.status === 'review'
    ? { cls: 'status-review', label: '검토중' }
    : { cls: 'status-done', label: '답변완료' };
  return (
    <article className="card row" style={{ alignItems: 'stretch', gap: 16 }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minWidth: 56,
        padding: '8px 10px',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
      }}>
        <button style={{ color: 'var(--text-3)' }}><Icons.Vote size={16}/></button>
        <div className="num" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{q.votes}</div>
        <div style={{ fontSize: 10, color: 'var(--text-4)' }}>votes</div>
      </div>
      <div className="grow">
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <span className={`chip ${status.cls}`}>{status.label}</span>
          {q.answers > 0 && (
            <span className="chip" style={{ background: 'var(--surface-2)' }}>
              교수 답변 {q.answers}
            </span>
          )}
        </div>
        <div className="h-3" style={{ fontSize: 14, marginBottom: 6 }}>{q.title}</div>
        <div className="row" style={{ gap: 8, fontSize: 11.5, color: 'var(--text-3)' }}>
          <Avatar person={q.author} size="sm" />
          <span>{q.author.name}</span>
          <CohortBadge n={q.cohort} />
          <span>· {q.time}</span>
        </div>
      </div>
    </article>
  );
};

// ---------- ResourceItem ----------
const resourceColors = {
  pdf: 'oklch(0.65 0.18 22)',
  video: 'oklch(0.7 0.16 320)',
  code: 'oklch(0.75 0.14 220)',
  img: 'oklch(0.78 0.14 160)',
};
const resourceIcons = { pdf: Icons.Pdf, video: Icons.Video, code: Icons.Code, img: Icons.Img };

const ResourceItem = ({ r }) => {
  const Ic = resourceIcons[r.type] || Icons.File;
  return (
    <article className="row" style={{
      gap: 14, padding: '14px 16px',
      borderTop: '1px solid var(--border)',
      transition: 'background 100ms',
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
      onMouseLeave={(e) => e.currentTarget.style.background = ''}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        display: 'grid', placeItems: 'center',
        background: `${resourceColors[r.type]}22`,
        color: resourceColors[r.type],
        border: `1px solid ${resourceColors[r.type]}44`,
        flex: '0 0 40px',
      }}>
        <Ic size={18}/>
      </div>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 6 }}>
          <span className="truncate" style={{ fontSize: 13.5, fontWeight: 500 }}>{r.title}</span>
        </div>
        <div className="row" style={{ gap: 8, fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
          <CohortBadge n={r.cohort} />
          <span className="mono">{r.date}</span>
          <span>·</span>
          <span className="mono">{r.size}</span>
        </div>
      </div>
      <div className="row" style={{ gap: 14, color: 'var(--text-3)', fontSize: 12 }}>
        <span className="row" style={{ gap: 4 }}><Icons.Download size={13}/> <span className="num">{r.downloads}</span></span>
        <button className="btn btn-sm btn-ghost"><Icons.Download size={13}/></button>
      </div>
    </article>
  );
};

// ---------- Sparkline / mini chart (pure SVG) ----------
const Sparkline = ({ data, width = 100, height = 28, color = 'var(--accent)' }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <path d={area} fill={color} opacity={0.18}/>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
};

Object.assign(window, { Avatar, PostCard, ImpactCard, ProjectCard, QuestionCard, ResourceItem, Sparkline });
