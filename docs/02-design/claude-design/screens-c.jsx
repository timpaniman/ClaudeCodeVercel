/* global React, Icons, Avatar, CohortBadge, ImpactCard, ProjectCard */
/* global me, people, projects, impactStories */
// =====================================================================
// AI4CEO — Multi-step register forms
//   Showcase 프로젝트 등록 (4 steps)
//   Impact Stories 등록    (4 steps)
//   Ask Professor 질문 등록 (2 steps)
// =====================================================================
const { useState: useS3, useMemo: useM3 } = React;

// ---------- shared shell ----------
const Stepper = ({ steps, current }) => (
  <div className="stepper">
    {steps.map((s, i) => (
      <React.Fragment key={i}>
        <div className={`step-pill ${i < current ? 'done' : ''} ${i === current ? 'active' : ''}`}>
          <div className="step-num">{i < current ? <Icons.Check size={13} stroke={2.4}/> : i + 1}</div>
          <div className="step-label">{s}</div>
        </div>
        {i < steps.length - 1 && <div className={`step-line ${i < current ? 'done' : ''}`}/>}
      </React.Fragment>
    ))}
  </div>
);

const FormFooter = ({ step, total, onPrev, onNext, onSubmit, onCancel, nextLabel, disabled }) => (
  <div className="form-footer">
    <button className="btn btn-ghost" onClick={onCancel}>취소</button>
    <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 12 }} className="mono">
      STEP {step + 1} / {total}
    </span>
    {step > 0 && <button className="btn btn-ghost" onClick={onPrev}>← 이전</button>}
    {step < total - 1
      ? <button className="btn btn-primary" onClick={onNext} disabled={disabled}>
          다음 <Icons.Arrow size={14}/>
        </button>
      : <button className="btn btn-primary" onClick={onSubmit} disabled={disabled}>
          <Icons.Check size={14}/> {nextLabel || '제출'}
        </button>}
  </div>
);

const Field = ({ label, required, help, counter, children }) => (
  <div className="field">
    <div className="field-label">
      {label} {required && <span className="req">*</span>}
      {counter != null && <span className="field-counter">{counter}</span>}
    </div>
    {help && <div className="field-help">{help}</div>}
    {children}
  </div>
);

const OptionCard = ({ icon: Ic, title, sub, on, onClick }) => (
  <button type="button" className={`option-card ${on ? 'on' : ''}`} onClick={onClick}>
    {Ic && <div className="option-icon"><Ic size={18}/></div>}
    <div className="grow" style={{ minWidth: 0 }}>
      <div className="option-title">{title}</div>
      {sub && <div className="option-sub">{sub}</div>}
    </div>
    {on && <Icons.Check size={16} style={{ color: 'var(--accent)', flex: '0 0 16px' }}/>}
  </button>
);

const RegisterHeader = ({ eyebrow, title, sub }) => (
  <header style={{ marginBottom: 20 }}>
    <div className="h-eyebrow" style={{ color: 'var(--accent)' }}>{eyebrow}</div>
    <h1 className="h-1" style={{ fontSize: 26, marginTop: 8 }}>{title}</h1>
    {sub && <p style={{ color: 'var(--text-3)', marginTop: 8 }}>{sub}</p>}
  </header>
);

// ===================================================
// 1) SHOWCASE PROJECT REGISTER — 4 steps
// ===================================================
const ShowcaseRegister = ({ onClose, onDone }) => {
  const [step, setStep] = useS3(0);
  const [data, setData] = useS3({
    title: '', category: '', summary: '',
    images: [], cover: 0,
    tech: [], github: '', demo: '',
  });
  const steps = ['기본 정보', '스크린샷', '링크 · 기술', '검토'];
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const cats = [
    { id: '챗봇',   icon: Icons.Bot,    sub: '대화형 인터페이스, CS 자동화' },
    { id: 'RAG',    icon: Icons.Book,   sub: '문서 검색, 지식 베이스 활용' },
    { id: '자동화', icon: Icons.Sparkle, sub: '워크플로우, 반복 작업 제거' },
    { id: '분석',   icon: Icons.Trend,  sub: '데이터 인사이트, 리포트 생성' },
  ];

  const techOptions = ['claude-sonnet-4-5', 'claude-opus', 'claude-haiku', 'GPT-4', 'Gemini', 'RAG', 'pgvector', 'LangChain', 'Retool', 'Notion API', 'Slack', 'Python', 'Next.js', 'Supabase'];

  const valid = [
    () => data.title.trim().length >= 4 && data.category && data.summary.trim().length >= 10,
    () => data.images.length > 0,
    () => data.tech.length > 0 && (data.github || data.demo),
    () => true,
  ];

  return (
    <div className="fade-in register-shell">
      <div className="register-main">
        <RegisterHeader eyebrow="SHOWCASE · 프로젝트 등록"
          title="당신의 프로젝트를 동기들에게 공유하세요"
          sub="등록된 프로젝트는 Showcase 갤러리에 노출되며 동기들의 영감이 됩니다."/>
        <Stepper steps={steps} current={step}/>

        {step === 0 && (
          <div className="fade-in">
            <Field label="프로젝트 이름" required counter={`${data.title.length}/60`}>
              <input className="input" value={data.title} maxLength={60}
                onChange={(e) => set('title', e.target.value)}
                placeholder="예: 오레노 — 메뉴 추천 챗봇"/>
            </Field>
            <Field label="카테고리" required help="가장 가까운 한 가지를 선택하세요.">
              <div className="option-grid">
                {cats.map((c) => (
                  <OptionCard key={c.id} icon={c.icon} title={c.id} sub={c.sub}
                    on={data.category === c.id}
                    onClick={() => set('category', c.id)}/>
                ))}
              </div>
            </Field>
            <Field label="한 줄 소개" required help="갤러리 카드에 노출됩니다." counter={`${data.summary.length}/140`}>
              <textarea className="textarea" rows={3} maxLength={140} value={data.summary}
                onChange={(e) => set('summary', e.target.value)}
                placeholder="이 프로젝트가 누구의 어떤 문제를 어떻게 해결하는지 한 줄로."/>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="fade-in">
            <Field label="스크린샷 · 데모 이미지" required
              help="3~6장 권장. 첫 번째 이미지가 갤러리 썸네일로 사용됩니다.">
              <div className="dropzone" onClick={() => {
                set('images', [...data.images, { id: Date.now(), name: `screenshot-${data.images.length + 1}.png`, ph: `SCREENSHOT ${data.images.length + 1}` }]);
              }}>
                <Icons.Img size={28} style={{ margin: '0 auto 10px', display: 'block' }}/>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                  이미지를 드래그하거나 클릭해서 업로드
                </div>
                <div style={{ marginTop: 6, fontSize: 12 }}>PNG · JPG · 최대 10MB · 16:10 권장</div>
              </div>
              {data.images.length > 0 && (
                <div className="thumb-grid">
                  {data.images.map((img, i) => (
                    <div key={img.id} className="thumb-card ph"
                      style={{ borderColor: i === data.cover ? 'var(--accent)' : undefined, cursor: 'pointer' }}
                      onClick={() => set('cover', i)}>
                      {img.ph}
                      {i === data.cover && <span className="thumb-cover">COVER</span>}
                      <button className="thumb-x" onClick={(e) => {
                        e.stopPropagation();
                        const next = data.images.filter((_, j) => j !== i);
                        set('images', next);
                        if (data.cover >= next.length) set('cover', 0);
                      }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <Field label="기술 스택" required help="사용한 모델, 프레임워크, 인프라를 모두 선택하세요.">
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                {techOptions.map((t) => {
                  const on = data.tech.includes(t);
                  return (
                    <button key={t} type="button"
                      className="chip"
                      style={{
                        cursor: 'pointer',
                        background: on ? 'var(--accent-soft)' : 'var(--surface)',
                        borderColor: on ? 'var(--accent)' : 'var(--border)',
                        color: 'var(--text)',
                        height: 30, fontSize: 12,
                      }}
                      onClick={() => set('tech', on ? data.tech.filter((x) => x !== t) : [...data.tech, t])}>
                      {on && <Icons.Check size={11} stroke={2.4}/>}
                      {t}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="GitHub 리포지토리" help="공개 또는 동기 전용 공개">
              <div className="row" style={{ gap: 0, alignItems: 'stretch' }}>
                <span style={{
                  display: 'grid', placeItems: 'center',
                  padding: '0 12px', background: 'var(--surface-2)',
                  border: '1px solid var(--border)', borderRight: 0,
                  borderRadius: '8px 0 0 8px', color: 'var(--text-3)',
                }}><Icons.Github size={15}/></span>
                <input className="input" style={{ borderRadius: '0 8px 8px 0' }}
                  value={data.github} onChange={(e) => set('github', e.target.value)}
                  placeholder="github.com/your/repo"/>
              </div>
            </Field>

            <Field label="데모 링크" help="배포된 URL이나 영상 링크">
              <div className="row" style={{ gap: 0, alignItems: 'stretch' }}>
                <span style={{
                  display: 'grid', placeItems: 'center',
                  padding: '0 12px', background: 'var(--surface-2)',
                  border: '1px solid var(--border)', borderRight: 0,
                  borderRadius: '8px 0 0 8px', color: 'var(--text-3)',
                }}><Icons.External size={15}/></span>
                <input className="input" style={{ borderRadius: '0 8px 8px 0' }}
                  value={data.demo} onChange={(e) => set('demo', e.target.value)}
                  placeholder="https://demo.example.com"/>
              </div>
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <Field label="최종 검토">
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
                아래 내용이 동기들에게 노출됩니다. 등록 후 24시간 이내 수정 가능합니다.
              </div>
            </Field>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="ph" style={{ aspectRatio: '16/9', borderRadius: 0, border: 0 }}>
                {data.images[data.cover]?.ph || 'COVER PREVIEW'}
              </div>
              <div style={{ padding: 18 }}>
                <div className="row" style={{ marginBottom: 10, gap: 8 }}>
                  <span className="chip" style={{ background: 'var(--accent-soft)', border: 0 }}>{data.category || '카테고리'}</span>
                  <CohortBadge n={me.cohort}/>
                </div>
                <h3 className="h-2" style={{ marginBottom: 8 }}>{data.title || '프로젝트 이름'}</h3>
                <p style={{ color: 'var(--text-2)', margin: 0 }}>{data.summary || '한 줄 소개'}</p>
                {data.tech.length > 0 && (
                  <div className="row" style={{ gap: 4, flexWrap: 'wrap', marginTop: 14 }}>
                    {data.tech.map((t) => <span key={t} className="chip" style={{ height: 22, fontSize: 11 }}>{t}</span>)}
                  </div>
                )}
                <div className="row" style={{ gap: 10, marginTop: 14, color: 'var(--text-3)', fontSize: 12 }}>
                  {data.github && <span className="row" style={{ gap: 4 }}><Icons.Github size={13}/> {data.github}</span>}
                  {data.demo   && <span className="row" style={{ gap: 4 }}><Icons.External size={13}/> {data.demo}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        <FormFooter step={step} total={4}
          disabled={!valid[step]()}
          onPrev={() => setStep((s) => s - 1)}
          onNext={() => setStep((s) => s + 1)}
          onSubmit={onDone}
          onCancel={onClose}
          nextLabel="프로젝트 등록"/>
      </div>

      {/* Right rail — live preview / tips */}
      <aside className="register-aside">
        <div className="h-eyebrow">미리보기</div>
        <div className="card card-flush" style={{ marginTop: 12 }}>
          <div className="ph" style={{ aspectRatio: '16/10', borderRadius: 0, border: 0 }}>
            {data.images[data.cover]?.ph || 'COVER'}
          </div>
          <div style={{ padding: 14 }}>
            <div className="row" style={{ marginBottom: 8 }}>
              {data.category && <span className="chip" style={{ height: 20, fontSize: 10.5 }}>{data.category}</span>}
              <CohortBadge n={me.cohort}/>
            </div>
            <div className="h-3" style={{ fontSize: 14, marginBottom: 6 }}>
              {data.title || <span className="muted">프로젝트 이름</span>}
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: 12, lineHeight: 1.5 }}>
              {data.summary || '한 줄 소개가 여기에 표시됩니다.'}
            </div>
            <div className="row" style={{ gap: 8, color: 'var(--text-3)', fontSize: 12, marginTop: 12 }}>
              <Avatar person={me} size="sm"/>
              <span>{me.name}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="h-eyebrow">등록 가이드</div>
          <ul style={{ marginTop: 10, paddingLeft: 18, color: 'var(--text-2)', fontSize: 12.5, lineHeight: 1.7 }}>
            <li>실제 동작하는 프로젝트만 등록</li>
            <li>고객 정보 · API 키 노출 금지</li>
            <li>스크린샷은 PII 마스킹 후 업로드</li>
            <li>최소 1주일 운영된 프로젝트 권장</li>
          </ul>
        </div>
      </aside>
    </div>
  );
};

// ===================================================
// 2) IMPACT STORY REGISTER — 4 steps
// ===================================================
const NumberInput = ({ value, unit, onChange, step = 1 }) => (
  <div className="metric-input">
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0"/>
    {unit && <span className="unit">{unit}</span>}
    <div className="stepper-btns">
      <button onClick={() => {
        const n = Number(value || 0); onChange(String(n + step));
      }}><Icons.ChevronD size={10} style={{ transform: 'rotate(180deg)' }}/></button>
      <button onClick={() => {
        const n = Number(value || 0); onChange(String(Math.max(0, n - step)));
      }}><Icons.ChevronD size={10}/></button>
    </div>
  </div>
);

const ImpactRegister = ({ onClose, onDone }) => {
  const [step, setStep] = useS3(0);
  const [data, setData] = useS3({
    industry: '', size: '',
    tech: [],
    metric: '', unit: '시간', before: '', after: '', period: '월',
    background: '', result: '',
  });
  const steps = ['업종', '적용 AI', '수치 입력', '스토리'];
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const industries = [
    { id: 'F&B', icon: Icons.Building, sub: '식음료, 외식, 카페' },
    { id: 'B2B SaaS', icon: Icons.Code, sub: '소프트웨어, 플랫폼' },
    { id: '이커머스', icon: Icons.Rocket, sub: '쇼핑몰, D2C, 마켓플레이스' },
    { id: '서비스', icon: Icons.Users, sub: '에이전시, 컨설팅, CS' },
    { id: 'Legal Tech', icon: Icons.Book, sub: '법무, 컴플라이언스' },
    { id: '제조 · 유통', icon: Icons.Settings, sub: '생산, 물류, 도소매' },
  ];
  const sizes = ['1-10명', '11-50명', '51-200명', '200명+'];

  const techList = ['claude-sonnet', 'claude-opus', 'claude-haiku', 'RAG', 'Agent', 'MCP', 'Workflow', 'Fine-tune'];

  const metricPresets = [
    { metric: '제안서 작성 시간', unit: '시간', before: '4', after: '0.5' },
    { metric: 'CS 1차 응답', unit: '분', before: '38', after: '9' },
    { metric: '리포트 생성', unit: '일', before: '3', after: '0.5' },
    { metric: '직접 입력', unit: '', before: '', after: '' },
  ];

  const valid = [
    () => data.industry && data.size,
    () => data.tech.length > 0,
    () => data.metric && data.before && data.after,
    () => data.background.length >= 20,
  ];

  // compute delta percentage
  const delta = useM3(() => {
    const b = parseFloat(data.before), a = parseFloat(data.after);
    if (isNaN(b) || isNaN(a) || b === 0) return null;
    return Math.round(((a - b) / b) * 100);
  }, [data.before, data.after]);

  return (
    <div className="fade-in register-shell">
      <div className="register-main">
        <RegisterHeader eyebrow="IMPACT STORIES · 스토리 등록"
          title="당신이 만든 변화를 숫자로 증명하세요"
          sub="다른 대표들이 의사결정에 참고하는 가장 강력한 레퍼런스가 됩니다."/>
        <Stepper steps={steps} current={step}/>

        {step === 0 && (
          <div className="fade-in">
            <Field label="업종" required>
              <div className="option-grid">
                {industries.map((i) => (
                  <OptionCard key={i.id} icon={i.icon} title={i.id} sub={i.sub}
                    on={data.industry === i.id}
                    onClick={() => set('industry', i.id)}/>
                ))}
              </div>
            </Field>
            <Field label="회사 규모" required help="익명 통계로만 사용됩니다.">
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {sizes.map((s) => (
                  <button key={s} type="button"
                    className="btn"
                    style={{
                      background: data.size === s ? 'var(--accent-soft)' : 'var(--surface)',
                      borderColor: data.size === s ? 'var(--accent)' : 'var(--border)',
                      border: '1px solid',
                    }}
                    onClick={() => set('size', s)}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="fade-in">
            <Field label="사용한 AI · 도구" required help="여러 개 선택 가능">
              <div className="option-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                {techList.map((t) => (
                  <OptionCard key={t} title={t}
                    on={data.tech.includes(t)}
                    onClick={() => {
                      const on = data.tech.includes(t);
                      set('tech', on ? data.tech.filter((x) => x !== t) : [...data.tech, t]);
                    }}/>
                ))}
              </div>
            </Field>
            <Field label="추가 도구 · 인프라" help="Notion, Slack, Retool, Zapier 등 — 쉼표로 구분">
              <input className="input" placeholder="예: Slack, Retool, Notion DB"/>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <Field label="측정 지표" required help="대표 지표 하나만 선택하세요. 가장 임팩트가 큰 것이 좋아요.">
              <div className="option-grid">
                {metricPresets.map((m) => (
                  <OptionCard key={m.metric} title={m.metric}
                    sub={m.unit ? `단위: ${m.unit}` : '원하는 지표를 직접 입력'}
                    on={data.metric === m.metric}
                    onClick={() => {
                      set('metric', m.metric);
                      if (m.metric !== '직접 입력') {
                        set('unit', m.unit); set('before', m.before); set('after', m.after);
                      } else {
                        set('unit', ''); set('before', ''); set('after', '');
                      }
                    }}/>
                ))}
              </div>
            </Field>

            {data.metric && (
              <>
                {data.metric === '직접 입력' && (
                  <Field label="지표 이름" required>
                    <input className="input" placeholder="예: 전환율"
                      onChange={(e) => set('_customMetric', e.target.value)}/>
                  </Field>
                )}
                <div className="row" style={{ gap: 'var(--gap)', alignItems: 'flex-end' }}>
                  <Field label="단위">
                    <input className="input" value={data.unit} onChange={(e) => set('unit', e.target.value)}
                      placeholder="시간 · 분 · % 등" style={{ maxWidth: 120 }}/>
                  </Field>
                  <Field label="측정 주기">
                    <div className="row" style={{ gap: 6 }}>
                      {['일', '주', '월'].map((p) => (
                        <button key={p} type="button"
                          className="chip"
                          style={{
                            cursor: 'pointer',
                            background: data.period === p ? 'var(--accent-soft)' : 'var(--surface)',
                            borderColor: data.period === p ? 'var(--accent)' : 'var(--border)',
                            color: 'var(--text)', height: 30,
                          }}
                          onClick={() => set('period', p)}>{p} 단위</button>
                      ))}
                    </div>
                  </Field>
                </div>

                <Field label="Before / After" required>
                  <div className="row" style={{ gap: 'var(--gap)' }}>
                    <div className="grow">
                      <div className="h-eyebrow" style={{ marginBottom: 6 }}>도입 전</div>
                      <NumberInput value={data.before} unit={data.unit} onChange={(v) => set('before', v)}/>
                    </div>
                    <Icons.Arrow size={20} style={{ color: 'var(--text-4)', alignSelf: 'flex-end', marginBottom: 14 }}/>
                    <div className="grow">
                      <div className="h-eyebrow" style={{ marginBottom: 6 }}>도입 후</div>
                      <NumberInput value={data.after} unit={data.unit} onChange={(v) => set('after', v)}/>
                    </div>
                  </div>

                  {delta !== null && (
                    <div className="delta-preview">
                      <div className="delta-side before">
                        <div className="lbl">BEFORE</div>
                        <div className="val">{data.before}{data.unit}</div>
                      </div>
                      <Icons.Arrow size={22} className="delta-arrow"/>
                      <div className="delta-side after">
                        <div className="lbl">AFTER</div>
                        <div className="val">{data.after}{data.unit}</div>
                      </div>
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: 4, fontSize: 13 }}>
                        <span className="chip" style={{
                          background: 'var(--success-soft)', color: 'var(--success)', border: 0,
                          height: 26, fontSize: 13,
                        }}>
                          <Icons.Trend size={13}/> {delta > 0 ? `+${delta}%` : `${delta}%`} {delta < 0 ? '개선' : '증가'}
                        </span>
                      </div>
                    </div>
                  )}
                </Field>
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <Field label="배경" required help="도입 전 어떤 문제가 있었는지 알려주세요."
              counter={`${data.background.length}/500`}>
              <textarea className="textarea" rows={4} maxLength={500} value={data.background}
                onChange={(e) => set('background', e.target.value)}
                placeholder="예: 영업팀이 매주 평균 5건의 RFP에 응답해야 했고, 1건당 4시간이 소요됐습니다…"/>
            </Field>
            <Field label="결과" help="어떻게 바뀌었는지, 추가 효과가 있다면 함께 적어주세요."
              counter={`${data.result.length}/500`}>
              <textarea className="textarea" rows={4} maxLength={500} value={data.result}
                onChange={(e) => set('result', e.target.value)}
                placeholder="예: 영업 사이클이 평균 17일 단축됐고, 영업팀 사기가…"/>
            </Field>
          </div>
        )}

        <FormFooter step={step} total={4}
          disabled={!valid[step]()}
          onPrev={() => setStep((s) => s - 1)}
          onNext={() => setStep((s) => s + 1)}
          onSubmit={onDone}
          onCancel={onClose}
          nextLabel="임팩트 스토리 게시"/>
      </div>

      <aside className="register-aside">
        <div className="h-eyebrow">미리보기</div>
        <div className="card card-flush" style={{ marginTop: 12, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(400px 200px at 100% 0%, var(--accent-soft), transparent 60%)',
            pointerEvents: 'none',
          }}/>
          <div style={{ padding: 16, position: 'relative' }}>
            <div className="row" style={{ gap: 6, marginBottom: 12 }}>
              {data.industry && <span className="chip" style={{ height: 20, fontSize: 10.5 }}>{data.industry}</span>}
              <CohortBadge n={me.cohort}/>
            </div>
            <div className="metric" style={{ fontSize: 32, color: delta !== null ? 'oklch(0.92 0.12 200)' : 'var(--text-3)' }}>
              {delta !== null
                ? `${delta > 0 ? '+' : ''}${delta}% ${delta < 0 ? '↓' : '↑'}`
                : '결과 미입력'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
              {data.metric || '지표'}{data.period && ` · ${data.period} 기준`}
            </div>
            {data.tech.length > 0 && (
              <div className="row" style={{ gap: 4, flexWrap: 'wrap', marginTop: 12 }}>
                {data.tech.map((t) => <span key={t} className="chip" style={{ height: 20, fontSize: 10 }}>{t}</span>)}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="h-eyebrow">좋은 스토리란</div>
          <ul style={{ marginTop: 10, paddingLeft: 18, color: 'var(--text-2)', fontSize: 12.5, lineHeight: 1.7 }}>
            <li>구체적인 숫자가 있다</li>
            <li>측정 기간이 명확하다</li>
            <li>맥락이 충분하다</li>
            <li>다른 회사가 따라할 수 있다</li>
          </ul>
        </div>
      </aside>
    </div>
  );
};

// ===================================================
// 3) QUESTION REGISTER — 2 steps (compact)
// ===================================================
const QuestionRegister = ({ onClose, onDone }) => {
  const [step, setStep] = useS3(0);
  const [data, setData] = useS3({ category: '', title: '', body: '', tags: '' });
  const steps = ['질문 작성', '확인 · 제출'];
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const cats = [
    { id: '기술', sub: 'RAG, 에이전트, 모델 선택' },
    { id: '비용', sub: 'API 비용 최적화, 인프라' },
    { id: '도입', sub: '조직 도입, 변화관리, 채용' },
    { id: '전략', sub: 'AI 제품 전략, 시장' },
  ];

  const valid = [
    () => data.category && data.title.trim().length >= 10 && data.body.trim().length >= 20,
    () => true,
  ];

  return (
    <div className="fade-in register-shell">
      <div className="register-main">
        <RegisterHeader eyebrow="ASK THE PROFESSOR"
          title="김성우 교수께 질문하기"
          sub="투표를 많이 받은 5개 질문에 매주 답변합니다. 좋은 질문은 모두에게 도움이 됩니다."/>
        <Stepper steps={steps} current={step}/>

        {step === 0 && (
          <div className="fade-in">
            <Field label="카테고리" required>
              <div className="option-grid">
                {cats.map((c) => (
                  <OptionCard key={c.id} title={c.id} sub={c.sub}
                    on={data.category === c.id}
                    onClick={() => set('category', c.id)}/>
                ))}
              </div>
            </Field>
            <Field label="질문 제목" required help="핵심을 한 문장으로." counter={`${data.title.length}/120`}>
              <input className="input" maxLength={120} value={data.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="예: RAG 운영 — 청크 사이즈와 메타데이터 전략 추천?"/>
            </Field>
            <Field label="질문 내용" required help="컨텍스트와 시도해본 것을 함께 적어주세요."
              counter={`${data.body.length}/2000`}>
              <textarea className="textarea" rows={8} maxLength={2000} value={data.body}
                onChange={(e) => set('body', e.target.value)}
                placeholder="배경:&#10;시도한 것:&#10;원하는 결과:"/>
            </Field>
            <Field label="태그" help="쉼표로 구분">
              <input className="input" value={data.tags} onChange={(e) => set('tags', e.target.value)}
                placeholder="RAG, 한국어, 매뉴얼"/>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="fade-in">
            <Field label="질문 확인">
              <div className="card" style={{ padding: 20 }}>
                <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                  <span className="chip status-wait">대기중</span>
                  <span className="chip">{data.category}</span>
                  <CohortBadge n={me.cohort}/>
                </div>
                <h3 className="h-2" style={{ marginBottom: 10 }}>{data.title}</h3>
                <p style={{ color: 'var(--text-2)', whiteSpace: 'pre-wrap', margin: 0 }}>{data.body}</p>
                {data.tags && (
                  <div className="row" style={{ gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                    {data.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                      <span key={t} className="chip" style={{ height: 22, fontSize: 11 }}>#{t}</span>
                    ))}
                  </div>
                )}
                <hr className="sep" style={{ margin: '16px 0' }}/>
                <div className="row" style={{ gap: 8, color: 'var(--text-3)', fontSize: 12 }}>
                  <Avatar person={me} size="sm"/>
                  <span>{me.name} · {me.company}</span>
                  <span style={{ marginLeft: 'auto' }}>다음 화요일 18:00 투표 마감</span>
                </div>
              </div>
            </Field>
          </div>
        )}

        <FormFooter step={step} total={2}
          disabled={!valid[step]()}
          onPrev={() => setStep((s) => s - 1)}
          onNext={() => setStep((s) => s + 1)}
          onSubmit={onDone}
          onCancel={onClose}
          nextLabel="질문 등록"/>
      </div>

      <aside className="register-aside">
        <div className="h-eyebrow">통계</div>
        <div style={{ marginTop: 12 }}>
          <div className="metric sm">23h</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>김교수님 평균 응답시간</div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div className="metric sm">98%</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>답변 채택률</div>
        </div>
        <div style={{ marginTop: 24 }}>
          <div className="h-eyebrow">좋은 질문 작성법</div>
          <ul style={{ marginTop: 10, paddingLeft: 18, color: 'var(--text-2)', fontSize: 12.5, lineHeight: 1.7 }}>
            <li>맥락 → 시도 → 원하는 답 구조</li>
            <li>실패한 시도를 함께 적기</li>
            <li>관련 자료 링크 첨부</li>
            <li>일반화 가능한 질문일수록 ↑ 투표</li>
          </ul>
        </div>
      </aside>
    </div>
  );
};

// ===================================================
// SUCCESS overlay (shared)
// ===================================================
const RegisterSuccess = ({ title, sub, onView, onClose, viewLabel }) => (
  <div className="fade-in" style={{
    display: 'grid', placeItems: 'center',
    minHeight: 'calc(100vh - var(--topbar-h))',
    padding: 40,
  }}>
    <div className="card" style={{ maxWidth: 460, padding: '40px 36px', textAlign: 'center' }}>
      <div className="success-confetti"><Icons.Check size={32} stroke={3}/></div>
      <h2 className="h-1" style={{ fontSize: 22 }}>{title}</h2>
      <p style={{ color: 'var(--text-3)', marginTop: 10 }}>{sub}</p>
      <div className="row" style={{ justifyContent: 'center', marginTop: 24, gap: 10 }}>
        <button className="btn btn-ghost" onClick={onClose}>닫기</button>
        <button className="btn btn-primary" onClick={onView}>{viewLabel} <Icons.Arrow size={14}/></button>
      </div>
    </div>
  </div>
);

Object.assign(window, { ShowcaseRegister, ImpactRegister, QuestionRegister, RegisterSuccess });
