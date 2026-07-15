import { useEffect, useRef, useState } from 'react'
import {
  useStore,
  seedDemoHistory,
  weekActiveDays,
  briskMinutes,
  flexibleStreak,
  treeStage,
} from '../lib/store.jsx'
import { createPedometer, stepsToKcal, stepsToKm } from '../lib/pedometer.js'
import Ring from '../components/Ring.jsx'
import { IcBolt, IcFire, IcHeart, IcLeaf, IcRoute } from '../components/Icons.jsx'

export default function Home() {
  const { state, dispatch } = useStore()
  const [walking, setWalking] = useState(false)
  const [sim, setSim] = useState(false)
  const [showCard, setShowCard] = useState(false)
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
        <div className="chip chip-on"><IcFire style={{ width: 14, height: 14 }} /> {flexibleStreak(state)}일째 걷는 사람</div>
      </header>

      {/* Step ring */}
      <div className="card card-glow col" style={{ alignItems: 'center', paddingTop: 26, paddingBottom: 22 }}>
        <Ring value={pct} size={236} stroke={18}>
          <div className="stat-num" style={{ fontSize: 44 }}>{steps.toLocaleString()}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>/ {goal.toLocaleString()} 걸음</div>
          {remaining > 0 ? (
            <div className="dim" style={{ fontSize: 12, marginTop: 6 }}>{remaining.toLocaleString()} 걸음 더!</div>
          ) : (
            <div className="chip chip-on" style={{ marginTop: 8 }}>오운완 · 오늘 목표 달성 🎉</div>
          )}
        </Ring>

        {remaining === 0 ? (
          <button className="btn btn-primary btn-block mt-16" onClick={() => setShowCard(true)}>
            🏅 오운완 카드 만들기
          </button>
        ) : (
          <button className={'btn btn-block mt-16 ' + (walking ? 'btn-ghost' : 'btn-primary')} onClick={toggleWalk}>
            {walking ? '■ 걷기 세션 종료' : '▶ 걷기 세션 시작'}
          </button>
        )}
        {walking && (
          <div className="dim" style={{ fontSize: 11, marginTop: 8 }}>
            {sim ? '미리보기 모드: 걸음을 시뮬레이션합니다' : '가속도계로 걸음을 측정 중…'}
          </div>
        )}
      </div>

      {/* 나의 나무 — care/growth mechanic (non-monetary intrinsic reward) */}
      <MyTree state={state} />

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

      {/* Donation nudge — honest sponsor-unlock model + demo disclosure */}
      <div className="card mt-16" style={{ borderLeft: '3px solid var(--coral)' }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div style={{ maxWidth: '72%' }}>
            <div className="row gap-8">
              <span className="eyebrow" style={{ color: 'var(--coral)' }}>함께 걷기 기부</span>
              <span className="chip" style={{ padding: '2px 8px', fontSize: 10 }}>데모</span>
            </div>
            <div style={{ fontWeight: 700, marginTop: 6 }}>
              오늘 걸음이 후원 풀 {(stepsToKm(steps) * 1).toFixed(1)}원을 열었어요 <span className="dim">(예시)</span>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
              스폰서가 미리 걸어둔 후원금을, 당신의 걸음이 등록 단체로 전달해요.
            </div>
          </div>
          <div style={{ fontSize: 34 }}>🐾</div>
        </div>
        <details style={{ marginTop: 10 }}>
          <summary style={{ listStyle: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--coral)', fontWeight: 700 }}>
            어떻게 진짜 후원이 되나요? ▾
          </summary>
          <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
            걸음은 돈을 만들지 않아요. 실제 후원금은 <strong>기업 스폰서의 후원 풀</strong>(또는 우리 구독
            매출의 일부)에서 나오고, 등록 공익법인에 전달됩니다. 정식 출시 전까지 이 수치는 <strong>예시</strong>이며
            실제 이체는 일어나지 않아요. (자세히: REWARDS.md)
          </p>
        </details>
      </div>

      {showCard && (
        <OwoonwanCard state={state} steps={steps} onClose={() => setShowCard(false)} />
      )}
    </div>
  )
}

function MyTree({ state }) {
  const t = treeStage(state)
  return (
    <div className="card mt-16" style={{ borderLeft: '3px solid var(--green-500)' }}>
      <div className="row gap-16" style={{ alignItems: 'center' }}>
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: 18,
            background: 'radial-gradient(circle at 50% 40%, rgba(18,185,129,0.22), rgba(18,185,129,0.05))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 38,
            flexShrink: 0,
          }}
        >
          {t.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div className="row between">
            <strong style={{ fontSize: 15 }}>나의 나무 · {t.name}</strong>
            <span className="chip chip-on">{t.days}일 키움</span>
          </div>
          <div style={{ marginTop: 8, height: 8, borderRadius: 999, background: 'var(--surface-3)' }}>
            <div
              style={{
                width: `${Math.min(100, t.progress * 100)}%`,
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg,#A3E635,#12B981)',
              }}
            />
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
            {t.isMax
              ? '다 자랐어요! 당신의 꾸준함이 만든 나무예요. 🌳'
              : `걷는 날마다 조금씩 자라요. 다음 단계까지 ${t.next.min - t.days}일.`}
            <br />
            <span className="dim">다 키우면 실제 나무 한 그루를 심어요 (파트너 · 데모)</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function OwoonwanCard({ state, steps, onClose }) {
  const streak = flexibleStreak(state)
  const today = new Date(state.today)
  const dateStr = `${today.getMonth() + 1}월 ${today.getDate()}일`
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 340 }}>
        {/* the shareable card */}
        <div
          style={{
            borderRadius: 24,
            padding: 24,
            background: 'linear-gradient(150deg, #0B6E4F, #0A0E14 70%)',
            border: '1px solid rgba(18,185,129,0.35)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            textAlign: 'center',
          }}
        >
          <div className="eyebrow" style={{ color: 'var(--lime)' }}>오운완 · 오늘 운동 완료</div>
          <div style={{ fontSize: 56, margin: '10px 0' }}>🏅</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>오늘도 해냈어요</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {dateStr} · {state.profile.name}님은 {streak}일째 걷는 사람
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 20, marginTop: 18 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{steps.toLocaleString()}</div>
              <div className="dim" style={{ fontSize: 11 }}>걸음</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{stepsToKm(steps).toFixed(1)}</div>
              <div className="dim" style={{ fontSize: 11 }}>km</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{briskMinutes(state)}</div>
              <div className="dim" style={{ fontSize: 11 }}>활기찬 분</div>
            </div>
          </div>
          <div className="dim" style={{ fontSize: 11, marginTop: 18, letterSpacing: '0.1em' }}>STRIDE · 함께 걷는 습관</div>
        </div>
        <div className="row gap-8 mt-16">
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>닫기</button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={() => alert('캡처해서 공유하세요! (정식 버전에서는 이미지 저장·공유가 제공돼요)')}
          >
            공유하기
          </button>
        </div>
        <p className="dim" style={{ fontSize: 11, textAlign: 'center', marginTop: 10 }}>
          #오운완 자랑은 강요가 아니에요. 만들고 싶을 때만.
        </p>
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
