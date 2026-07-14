import { useEffect, useState } from 'react'
import {
  useStore,
  walkMoodSummary,
  seedDemoHistory,
  habitDay,
  HABIT_TARGET_DAYS,
} from '../lib/store.jsx'
import { buildInsights, coachReply } from '../lib/coach.js'
import { IcCheck, IcHeart, IcRoute, IcSpark } from '../components/Icons.jsx'

const CUES = ['아침에 일어나면', '점심 먹고 나면', '퇴근 지하철에서 내리면', '저녁 먹고 나면', '커피 마시고 나면']
const ACTIONS = ['10분 걷기', '집 앞 한 바퀴', '한 정거장 걸어가기', '동네 공원까지 걷기']

const SUGGESTIONS = ['무릎이 아파요', '동기부여가 안 돼요', '언제 걷는 게 좋아요?', '살 빼려면?']
const MOODS = [
  { score: 1, emoji: '😞', label: '힘듦' },
  { score: 2, emoji: '😕', label: '별로' },
  { score: 3, emoji: '😐', label: '보통' },
  { score: 4, emoji: '🙂', label: '좋음' },
  { score: 5, emoji: '😄', label: '최고' },
]

export default function Coach() {
  const { state, dispatch } = useStore()
  const insights = buildInsights(state)
  const mood = walkMoodSummary(state)
  const todayMood = state.moods[state.today]

  useEffect(() => {
    seedDemoHistory(dispatch, state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [msgs, setMsgs] = useState([
    { role: 'coach', text: `안녕하세요, ${state.profile.name}님. 저는 당신의 걷기 코치예요. 오늘 컨디션은 어때요?` },
  ])
  const [input, setInput] = useState('')

  const send = (text) => {
    const t = (text ?? input).trim()
    if (!t) return
    const reply = coachReply(t, state)
    setMsgs((m) => [...m, { role: 'me', text: t }, { role: 'coach', text: reply }])
    setInput('')
  }

  return (
    <div className="screen animate-in">
      <header style={{ marginBottom: 14 }}>
        <div className="eyebrow" style={{ color: 'var(--violet)' }}>AI 코치</div>
        <h2>오늘의 맞춤 코칭</h2>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          당신의 걸음 데이터를 읽고 매일 다르게 조언해요.
        </p>
      </header>

      {/* Habit progress — realistic 66-day horizon (counters the 21-day myth) */}
      <HabitProgress state={state} />

      {/* If-then walk plan — implementation intention + habit stacking */}
      <WalkPlan state={state} dispatch={dispatch} />

      {/* Mood check-in — walk↔mood link (mental health differentiation) */}
      <div className="card" style={{ marginBottom: 12, borderLeft: '3px solid var(--coral)' }}>
        <div className="row gap-8" style={{ color: 'var(--coral)', marginBottom: 8 }}>
          <IcHeart style={{ width: 18, height: 18 }} />
          <strong style={{ fontSize: 14 }}>오늘 기분은 어때요?</strong>
        </div>
        <div className="row between">
          {MOODS.map((m) => (
            <button
              key={m.score}
              onClick={() => dispatch({ type: 'SET_MOOD', score: m.score })}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 6px',
                borderRadius: 14,
                flex: 1,
                background: todayMood === m.score ? 'rgba(255,107,107,0.15)' : 'transparent',
                border: todayMood === m.score ? '1px solid rgba(255,107,107,0.4)' : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: 26, filter: todayMood && todayMood !== m.score ? 'grayscale(0.6) opacity(0.5)' : 'none' }}>{m.emoji}</span>
              <span className="dim" style={{ fontSize: 10 }}>{m.label}</span>
            </button>
          ))}
        </div>
        {mood && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'var(--surface-2)',
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            📈 지난 {mood.n}일 데이터: 목표를 채운 날 평균 기분이{' '}
            <strong style={{ color: 'var(--coral)' }}>{mood.activeMood.toFixed(1)}점</strong>, 덜 걸은 날은{' '}
            <strong>{mood.lowMood.toFixed(1)}점</strong>이었어요. 걷는 날 기분이 더 좋았네요{mood.diff >= 0.3 ? ' 💚' : '.'}
          </div>
        )}
      </div>

      {/* Daily insights */}
      {insights.map((ins, i) => (
        <div key={i} className="card" style={{ marginBottom: 12, borderLeft: '3px solid var(--violet)' }}>
          <div className="row gap-8" style={{ color: 'var(--violet)', marginBottom: 6 }}>
            <IcSpark style={{ width: 18, height: 18 }} />
            <strong style={{ fontSize: 14 }}>{ins.title}</strong>
          </div>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>{ins.body}</p>
        </div>
      ))}

      {/* Chat */}
      <div className="card mt-16">
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>코치에게 물어보기</h3>
        <div className="col gap-8" style={{ marginBottom: 12 }}>
          {msgs.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'me' ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
                padding: '10px 14px',
                borderRadius: 16,
                fontSize: 13.5,
                lineHeight: 1.5,
                background: m.role === 'me' ? 'linear-gradient(135deg,#12B981,#0B6E4F)' : 'var(--surface-2)',
                color: m.role === 'me' ? '#04140D' : 'var(--text)',
                borderBottomRightRadius: m.role === 'me' ? 4 : 16,
                borderBottomLeftRadius: m.role === 'me' ? 16 : 4,
              }}
            >
              {m.text}
            </div>
          ))}
        </div>

        <div className="row gap-8" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
          ))}
        </div>

        <div className="row gap-8">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="메시지 입력…"
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button className="btn btn-primary" style={{ padding: '12px 18px' }} onClick={() => send()}>
            전송
          </button>
        </div>
      </div>

      <div className="card mt-16" style={{ background: 'var(--surface-2)' }}>
        <div className="row between">
          <div>
            <strong style={{ fontSize: 14 }}>무제한 AI 코칭 · 리포트</strong>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Stride Plus에서 주간 심층 리포트와 개인화 훈련 플랜을 받아보세요.</p>
          </div>
          <span className="chip chip-on">Plus</span>
        </div>
      </div>
    </div>
  )
}

function HabitProgress({ state }) {
  const day = habitDay(state)
  const pct = Math.min(1, day / HABIT_TARGET_DAYS)
  const milestone = day < 42 ? '6주차(약 42일)에 습관이 단단해지기 시작해요' : '이제 습관이 자리잡는 구간이에요. 꾸준히!'
  return (
    <div className="card" style={{ marginBottom: 12, borderLeft: '3px solid var(--lime)' }}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <div className="row gap-8" style={{ color: 'var(--lime)' }}>
          <IcRoute style={{ width: 18, height: 18 }} />
          <strong style={{ fontSize: 14 }}>습관 형성 진행도</strong>
        </div>
        <span className="chip">{day}일째 / {HABIT_TARGET_DAYS}일</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: 'linear-gradient(90deg,#A3E635,#12B981)' }} />
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
        습관이 자동화되기까지 <strong style={{ color: 'var(--text)' }}>평균 66일</strong>(사람마다 18~254일)이 걸려요.
        '21일 법칙'은 근거가 약해요. {milestone}
      </p>
    </div>
  )
}

function WalkPlan({ state, dispatch }) {
  const { cue, action, enabled } = state.walkPlan
  const set = (patch) => dispatch({ type: 'SET_WALK_PLAN', patch })
  return (
    <div className="card" style={{ marginBottom: 12, borderLeft: '3px solid var(--green-500)' }}>
      <div className="row gap-8" style={{ color: 'var(--green-500)', marginBottom: 6 }}>
        <IcCheck style={{ width: 18, height: 18 }} />
        <strong style={{ fontSize: 14 }}>나의 걷기 약속</strong>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 12, lineHeight: 1.5 }}>
        '언제·무엇을' 미리 정해두면 실천율이 크게 올라가요(실행의도). 이미 하는 일에 걷기를 붙여보세요.
      </p>

      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>언제 (신호)</div>
      <div className="row gap-8" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        {CUES.map((c) => (
          <button key={c} className={'chip' + (cue === c ? ' chip-on' : '')} onClick={() => set({ cue: c })}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>무엇을 (행동)</div>
      <div className="row gap-8" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        {ACTIONS.map((a) => (
          <button key={a} className={'chip' + (action === a ? ' chip-on' : '')} onClick={() => set({ action: a })}>
            {a}
          </button>
        ))}
      </div>

      {cue && action && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 14,
            background: 'rgba(18,185,129,0.12)',
            border: '1px solid rgba(18,185,129,0.3)',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          약속: <strong>{cue}</strong> → <strong>{action}</strong>
          <button
            className={'btn btn-block mt-12 ' + (enabled ? 'btn-ghost' : 'btn-primary')}
            style={{ padding: '10px' }}
            onClick={() => set({ enabled: !enabled })}
          >
            {enabled ? '알림 켜짐 · 끄기' : '이 약속으로 리마인드 받기'}
          </button>
        </div>
      )}
    </div>
  )
}
