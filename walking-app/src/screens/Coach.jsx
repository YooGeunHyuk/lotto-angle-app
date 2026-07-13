import { useEffect, useState } from 'react'
import { useStore, walkMoodSummary, seedDemoHistory } from '../lib/store.jsx'
import { buildInsights, coachReply } from '../lib/coach.js'
import { IcHeart, IcSpark } from '../components/Icons.jsx'

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
