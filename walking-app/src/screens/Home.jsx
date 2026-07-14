import { useEffect, useRef, useState } from 'react'
import { useStore, seedDemoHistory, weekActiveDays, briskMinutes } from '../lib/store.jsx'
import { createPedometer, stepsToKcal, stepsToKm } from '../lib/pedometer.js'
import Ring from '../components/Ring.jsx'
import { IcBolt, IcFire, IcHeart, IcLeaf, IcRoute } from '../components/Icons.jsx'

export default function Home() {
  const { state, dispatch } = useStore()
  const [walking, setWalking] = useState(false)
  const [sim, setSim] = useState(false)
  const pedRef = useRef(null)

  useEffect(() => {
    seedDemoHistory(dispatch, state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => pedRef.current?.stop()
  }, [])

  const toggleWalk = async () => {
    if (walking) {
      pedRef.current?.stop()
      pedRef.current = null
      setWalking(false)
      return
    }
    const ped = createPedometer({
      onStep: (n, meta) => dispatch({ type: 'ADD_STEPS', n, brisk: meta?.brisk }),
    })
    pedRef.current = ped
    await ped.start()
    setWalking(true)
    setTimeout(() => setSim(ped.isSimulated), 1400)
  }

  const goal = state.profile.dailyGoal
  const steps = state.stepsToday
  const pct = steps / goal
  const remaining = Math.max(0, goal - steps)

  return (
    <div className="screen animate-in">
      <header className="row between" style={{ marginBottom: 8 }}>
        <div>
          <div className="eyebrow">STRIDE</div>
          <h2>{greeting()}, {state.profile.name}님</h2>
        </div>
        <div className="chip chip-on"><IcFire style={{ width: 14, height: 14 }} /> {state.streak}일 연속</div>
      </header>

      {/* Step ring */}
      <div className="card card-glow col" style={{ alignItems: 'center', paddingTop: 26, paddingBottom: 22 }}>
        <Ring value={pct} size={236} stroke={18}>
          <div className="stat-num" style={{ fontSize: 44 }}>{steps.toLocaleString()}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>/ {goal.toLocaleString()} 걸음</div>
          {remaining > 0 ? (
            <div className="dim" style={{ fontSize: 12, marginTop: 6 }}>{remaining.toLocaleString()} 걸음 더!</div>
          ) : (
            <div className="chip chip-on" style={{ marginTop: 8 }}>목표 달성 🎉</div>
          )}
        </Ring>

        <button className={'btn btn-block mt-16 ' + (walking ? 'btn-ghost' : 'btn-primary')} onClick={toggleWalk}>
          {walking ? '■ 걷기 세션 종료' : '▶ 걷기 세션 시작'}
        </button>
        {walking && (
          <div className="dim" style={{ fontSize: 11, marginTop: 8 }}>
            {sim ? '미리보기 모드: 걸음을 시뮬레이션합니다' : '가속도계로 걸음을 측정 중…'}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid-2 mt-16">
        <Stat icon={<IcRoute />} color="var(--sky)" label="거리" value={`${stepsToKm(steps).toFixed(2)} km`} />
        <Stat icon={<IcBolt />} color="var(--amber)" label="칼로리" value={`${stepsToKcal(steps, state.profile.weightKg)} kcal`} />
        <Stat icon={<IcHeart />} color="var(--coral)" label="활기찬 걷기" value={`${briskMinutes(state)} 분`} />
        <Stat icon={<IcLeaf />} color="var(--green-500)" label="씨앗" value={`${state.wallet.seeds}`} />
      </div>

      {/* Weekly active-days goal — consistency-first, health-justified */}
      <WeekActiveDays state={state} />

      {/* Weekly mini chart */}
      <WeeklyBar history={state.history} today={steps} goal={goal} />

      {/* Donation nudge (differentiation teaser) */}
      <div className="card mt-16 row between" style={{ alignItems: 'center' }}>
        <div style={{ maxWidth: '68%' }}>
          <div className="eyebrow" style={{ color: 'var(--coral)' }}>함께 걷기 기부</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>오늘 걸음으로 {(stepsToKm(steps) * 1).toFixed(1)}원 적립</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>당신의 걸음이 유기견 산책 후원으로 전환돼요.</div>
        </div>
        <div style={{ fontSize: 34 }}>🐾</div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value, color }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="row gap-8" style={{ color, marginBottom: 8 }}>
        <span style={{ width: 20, height: 20, display: 'inline-flex' }}>{icon}</span>
        <span className="muted" style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  )
}

function WeekActiveDays({ state }) {
  const active = weekActiveDays(state)
  const target = state.profile.weeklyGoalDays
  const met = active >= target
  return (
    <div className="card mt-16" style={{ borderLeft: '3px solid var(--sky)' }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--sky)' }}>이번 주 꾸준함</div>
          <div style={{ fontWeight: 800, fontSize: 18, marginTop: 4 }}>
            {active} / {target}일 <span className="muted" style={{ fontWeight: 600, fontSize: 13 }}>활동</span>
          </div>
        </div>
        {met ? (
          <span className="chip chip-on">주간 목표 달성 ✅</span>
        ) : (
          <span className="chip">앞으로 {target - active}일</span>
        )}
      </div>
      <div className="row gap-8" style={{ marginBottom: 10 }}>
        {Array.from({ length: 7 }).map((_, i) => {
          const filled = i < active
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 10,
                borderRadius: 999,
                background: filled ? 'linear-gradient(90deg,#38BDF8,#12B981)' : 'var(--surface-3)',
              }}
            />
          )
        })}
      </div>
      <p className="muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
        매일 채우지 않아도 괜찮아요. 연구상 <strong style={{ color: 'var(--text)' }}>주 3~4일</strong>만 목표를
        지켜도 건강 효과 대부분을 얻어요. 완벽보다 꾸준함이에요.
      </p>
    </div>
  )
}

function WeeklyBar({ history, today, goal }) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const val = i === 0 ? today : history[key] || 0
    days.push({ label: '일월화수목금토'[d.getDay()], val })
  }
  const max = Math.max(goal, ...days.map((d) => d.val))
  return (
    <div className="card mt-16">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 16 }}>이번 주</h3>
        <span className="muted" style={{ fontSize: 12 }}>목표 {goal.toLocaleString()}</span>
      </div>
      <div className="row" style={{ alignItems: 'flex-end', gap: 8, height: 96 }}>
        {days.map((d, i) => {
          const h = Math.max(4, (d.val / max) * 88)
          const met = d.val >= goal
          return (
            <div key={i} className="col" style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: '100%',
                  height: h,
                  borderRadius: 8,
                  background: met
                    ? 'linear-gradient(180deg, #A3E635, #12B981)'
                    : 'var(--surface-3)',
                  transition: 'height 0.4s ease',
                }}
              />
              <span className="dim" style={{ fontSize: 11 }}>{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '늦은 밤이에요'
  if (h < 12) return '좋은 아침'
  if (h < 18) return '좋은 오후'
  return '좋은 저녁'
}
