import { useStore, weekActiveDays, walkMoodSummary } from '../lib/store.jsx'
import { stepsToKm } from '../lib/pedometer.js'
import { IcCheck, IcLeaf, IcSpark } from '../components/Icons.jsx'

function weekSteps(state) {
  let sum = state.stepsToday
  for (let i = 1; i < 7; i++) {
    const d = new Date(state.today)
    d.setDate(d.getDate() - i)
    sum += state.history[d.toISOString().slice(0, 10)] || 0
  }
  return sum
}

export default function Profile() {
  const { state, dispatch } = useStore()
  const totalSteps = Object.values(state.history).reduce((a, b) => a + b, 0) + state.stepsToday
  const totalKm = stepsToKm(totalSteps)
  const isPlus = state.profile.plan === 'plus'

  const setGoal = (v) => dispatch({ type: 'UPDATE_PROFILE', patch: { dailyGoal: v } })
  const togglePlan = () =>
    dispatch({ type: 'UPDATE_PROFILE', patch: { plan: isPlus ? 'free' : 'plus' } })

  return (
    <div className="screen animate-in">
      <header className="row gap-16" style={{ marginBottom: 18, alignItems: 'center' }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 20,
            background: 'linear-gradient(135deg,#12B981,#0B6E4F)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
          }}
        >
          🚶
        </div>
        <div>
          <h2>{state.profile.name}</h2>
          <span className={'chip' + (isPlus ? ' chip-on' : '')}>{isPlus ? 'Stride Plus' : '무료 플랜'}</span>
        </div>
      </header>

      {/* Lifetime stats */}
      <div className="grid-2">
        <div className="card"><div className="muted" style={{ fontSize: 12 }}>누적 거리</div><div className="stat-num mt-8">{totalKm.toFixed(1)} km</div></div>
        <div className="card"><div className="muted" style={{ fontSize: 12 }}>누적 걸음</div><div className="stat-num mt-8">{(totalSteps / 1000).toFixed(1)}k</div></div>
      </div>

      {/* Weekly reflection — self-monitoring boosts adherence */}
      <WeeklyReflection state={state} isPlus={isPlus} />

      {/* Donation impact */}
      <div className="card mt-16" style={{ borderLeft: '3px solid var(--coral)' }}>
        <div className="row gap-8" style={{ color: 'var(--coral)', marginBottom: 6 }}>
          <IcLeaf style={{ width: 18, height: 18 }} />
          <strong style={{ fontSize: 14 }}>나의 기부 임팩트</strong>
        </div>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          지금까지 걸은 거리로 <strong style={{ color: 'var(--text)' }}>{Math.round(totalKm * 1)}원</strong>이
          유기견 산책 후원에 전환됐어요. 🐾
        </p>
      </div>

      {/* Daily goal */}
      <div className="card mt-16">
        <div className="row between" style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: 14 }}>일일 목표</strong>
          <span className="chip chip-on">{state.profile.dailyGoal.toLocaleString()} 보</span>
        </div>
        <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
          {[4000, 5000, 7000, 8000, 10000].map((g) => (
            <button
              key={g}
              className={'chip' + (state.profile.dailyGoal === g ? ' chip-on' : '')}
              onClick={() => setGoal(g)}
            >
              {g.toLocaleString()}
              {g === 7000 ? ' ★' : ''}
            </button>
          ))}
        </div>
        <p className="dim" style={{ fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
          ★ 약 7,000보에서 건강 이득 대부분이 나타나요(Lancet Public Health, 2025). 60세 이상은
          6,000~8,000보로도 충분합니다. 이 정보는 일반적 참고용이며 의학적 조언이 아니에요.
        </p>
      </div>

      {/* Plus paywall */}
      <div className={'card mt-16 ' + (isPlus ? '' : 'card-glow')}>
        <div className="eyebrow">STRIDE PLUS</div>
        <h3 style={{ fontSize: 18, marginTop: 6 }}>월 4,900원 · 첫 7일 무료</h3>
        <div className="col gap-8 mt-12">
          {['무제한 AI 코칭 & 주간 심층 리포트', '광고 없는 순수한 걷기 경험', '프리미엄 챌린지 & 씨앗 2배 적립', '기부 임팩트 2배 매칭'].map((f) => (
            <div key={f} className="row gap-8">
              <span style={{ color: 'var(--green-500)' }}><IcCheck style={{ width: 18, height: 18 }} /></span>
              <span style={{ fontSize: 13.5 }}>{f}</span>
            </div>
          ))}
        </div>
        <button className={'btn btn-block mt-16 ' + (isPlus ? 'btn-ghost' : 'btn-primary')} onClick={togglePlan}>
          {isPlus ? 'Plus 구독 중 · 해지' : 'Plus 시작하기'}
        </button>
      </div>

      <div className="dim" style={{ fontSize: 11, textAlign: 'center', marginTop: 20 }}>
        Stride · 함께 걷는 습관 · v0.1 (프로토타입)
      </div>
    </div>
  )
}

function WeeklyReflection({ state, isPlus }) {
  const active = weekActiveDays(state)
  const target = state.profile.weeklyGoalDays
  const steps = weekSteps(state)
  const mood = walkMoodSummary(state)
  const met = active >= target

  // Warm, self-compassionate framing — never shaming a low week.
  const headline = met
    ? '이번 주, 잘 걸었어요 🎉'
    : active > 0
      ? '이번 주도 걸음을 이어갔어요'
      : '새로운 한 주, 가볍게 시작해요'
  const note = met
    ? `목표한 주 ${target}일을 지켰어요. 이 리듬이 습관을 만듭니다.`
    : active > 0
      ? `${active}일 활동했어요. 완벽하지 않아도 괜찮아요 — 한 번의 쉼이 습관을 무너뜨리지 않아요.`
      : '지난 걸 자책하지 말아요. 오늘 5분 산책이면 다시 출발이에요.'

  return (
    <div className="card mt-16" style={{ borderLeft: '3px solid var(--violet)' }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="row gap-8" style={{ color: 'var(--violet)' }}>
          <IcSpark style={{ width: 18, height: 18 }} />
          <strong style={{ fontSize: 14 }}>이번 주 돌아보기</strong>
        </div>
        {!isPlus && <span className="chip">Plus 심층 리포트</span>}
      </div>
      <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{headline}</div>
      <div className="grid-2" style={{ marginTop: 8 }}>
        <Mini label="활동일수" value={`${active} / ${target}일`} />
        <Mini label="이번 주 걸음" value={`${(steps / 1000).toFixed(1)}k`} />
        <Mini label="거리" value={`${stepsToKm(steps).toFixed(1)} km`} />
        <Mini label="기분 추이" value={mood ? `${mood.activeMood.toFixed(1)} / 5` : '—'} />
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 12, lineHeight: 1.5 }}>{note}</p>
    </div>
  )
}

function Mini({ label, value }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--surface-2)' }}>
      <div className="dim" style={{ fontSize: 11 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  )
}
