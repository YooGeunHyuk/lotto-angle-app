import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { IcHeart, IcUsers } from '../components/Icons.jsx'

/* Research (F1): performance-DECOUPLED social (encouragement, shared goals)
   sustains motivation, while performance-tied ranking can erode it. So the
   hero here is a COOPERATIVE team goal + an encouragement feed. A friendly
   leaderboard exists but is intentionally secondary. */

const TEAM = {
  name: '성수동 걷기 클럽',
  members: 8,
  goalKm: 200,
  doneKm: 143.6,
  daysLeft: 6,
  emoji: '🏙️',
}

const CHEERS = [
  { from: '민서', emoji: '👏', text: '오늘도 파이팅! 같이 채워요', time: '방금' },
  { from: '엄마', emoji: '💚', text: '우리 딸 목표 거의 다 왔네~', time: '12분 전' },
  { from: '재현', emoji: '🔥', text: '내 몫 5km 완료! 다음은 누구?', time: '1시간 전' },
]

const BUDDIES = [
  { name: '엄마', steps: 6120, goal: 6000, emoji: '👩' },
  { name: '재현', steps: 9800, goal: 8000, emoji: '🧑' },
]

const LEADERBOARD = [
  { name: '민서', steps: 14203 },
  { name: '지훈', steps: 11890 },
  { name: '나', steps: null, you: true },
  { name: '수아', steps: 9120 },
]

export default function Together() {
  const { state } = useStore()
  const [tab, setTab] = useState('team')
  const teamPct = TEAM.doneKm / TEAM.goalKm

  return (
    <div className="screen animate-in">
      <header style={{ marginBottom: 14 }}>
        <div className="eyebrow">함께</div>
        <h2>혼자 걷지 않게</h2>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          경쟁이 아니라 응원. 함께일 때 습관은 더 오래 갑니다.
        </p>
      </header>

      {/* HERO: cooperative team goal */}
      <div className="card card-glow">
        <div className="row between">
          <div className="row gap-12">
            <span style={{ fontSize: 26 }}>{TEAM.emoji}</span>
            <div>
              <strong>{TEAM.name}</strong>
              <div className="muted" style={{ fontSize: 12 }}>멤버 {TEAM.members}명 · D-{TEAM.daysLeft}</div>
            </div>
          </div>
          <span className="chip chip-on">함께 목표</span>
        </div>

        <div className="row between mt-16" style={{ alignItems: 'flex-end' }}>
          <div>
            <span className="stat-num">{TEAM.doneKm}</span>
            <span className="muted"> / {TEAM.goalKm} km</span>
          </div>
          <span style={{ color: 'var(--green-500)', fontWeight: 800 }}>{Math.round(teamPct * 100)}%</span>
        </div>
        <div style={{ marginTop: 10, height: 12, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${teamPct * 100}%`,
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg,#A3E635,#12B981)',
            }}
          />
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          모두의 걸음이 하나의 목표로 합쳐져요. 한 명이 뒤처져도 팀이 끌어줍니다.
        </p>
        <button className="btn btn-primary btn-block mt-12">내 걸음 팀에 보태기</button>
      </div>

      {/* Encouragement feed (performance-decoupled) */}
      <div className="card mt-16">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 15 }}>응원 피드</h3>
          <span className="chip"><IcHeart style={{ width: 14, height: 14 }} /> {CHEERS.length}</span>
        </div>
        <div className="col gap-8">
          {CHEERS.map((c, i) => (
            <div key={i} className="row gap-12" style={{ padding: '8px 0', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22 }}>{c.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5 }}>
                  <strong>{c.from}</strong> <span className="muted">{c.text}</span>
                </div>
                <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>{c.time}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost btn-block mt-8">응원 보내기 💌</button>
      </div>

      {/* Buddies */}
      <h3 style={{ fontSize: 15, margin: '18px 0 10px' }}>내 걷기 메이트</h3>
      {BUDDIES.map((b) => (
        <div key={b.name} className="card" style={{ marginBottom: 12 }}>
          <div className="row between">
            <div className="row gap-12">
              <span style={{ fontSize: 24 }}>{b.emoji}</span>
              <div>
                <strong>{b.name}</strong>
                <div className="muted" style={{ fontSize: 12 }}>{b.steps.toLocaleString()} / {b.goal.toLocaleString()} 보</div>
              </div>
            </div>
            <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }}>
              <IcHeart style={{ width: 16, height: 16 }} /> 응원
            </button>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-block">+ 걷기 메이트 초대하기</button>

      {/* Secondary: friendly leaderboard, collapsed by default */}
      <details className="card mt-16" style={{ padding: 0 }}>
        <summary
          style={{
            listStyle: 'none',
            padding: 16,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span className="row gap-8"><IcUsers style={{ width: 18, height: 18 }} /> <strong style={{ fontSize: 14 }}>친구 순위 (참고용)</strong></span>
          <span className="dim" style={{ fontSize: 12 }}>펼치기</span>
        </summary>
        <div style={{ padding: '0 16px 16px' }}>
          <p className="dim" style={{ fontSize: 11, marginBottom: 10 }}>
            순위는 재미로만. 우리는 등수가 아니라 습관을 응원해요.
          </p>
          {LEADERBOARD.map((r) => (
            <div key={r.name} className="row between" style={{ padding: '8px 0' }}>
              <span style={{ fontWeight: r.you ? 800 : 600, color: r.you ? 'var(--green-500)' : 'var(--text)' }}>
                {r.name}{r.you ? ' (나)' : ''}
              </span>
              <span className="muted">{(r.you ? state.stepsToday : r.steps).toLocaleString()} 보</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
