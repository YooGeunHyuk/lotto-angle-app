import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { IcHeart, IcUsers } from '../components/Icons.jsx'

const LEADERBOARD = [
  { name: '민서', steps: 14203, you: false },
  { name: '지훈', steps: 11890, you: false },
  { name: '나', steps: null, you: true },
  { name: '수아', steps: 9120, you: false },
  { name: '도윤', steps: 7640, you: false },
]

const BUDDIES = [
  { name: '엄마', steps: 6120, goal: 6000, emoji: '👩' },
  { name: '재현', steps: 9800, goal: 8000, emoji: '🧑' },
  { name: '러닝크루 · 성수', steps: 42300, goal: 40000, emoji: '🏃', group: true },
]

export default function Together() {
  const { state } = useStore()
  const [tab, setTab] = useState('rank')

  const rows = LEADERBOARD.map((r) => (r.you ? { ...r, steps: state.stepsToday } : r)).sort(
    (a, b) => b.steps - a.steps,
  )

  return (
    <div className="screen animate-in">
      <header style={{ marginBottom: 14 }}>
        <div className="eyebrow">함께</div>
        <h2>혼자 걷지 않게</h2>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          가까운 사람과 함께 걸을 때 습관은 3배 오래 갑니다.
        </p>
      </header>

      <div className="row gap-8" style={{ marginBottom: 14 }}>
        <button className={'chip' + (tab === 'rank' ? ' chip-on' : '')} onClick={() => setTab('rank')}>
          리더보드
        </button>
        <button className={'chip' + (tab === 'buddy' ? ' chip-on' : '')} onClick={() => setTab('buddy')}>
          내 걷기 메이트
        </button>
      </div>

      {tab === 'rank' ? (
        <div className="card">
          <div className="row between" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 15 }}>이번 주 친구 랭킹</h3>
            <span className="chip"><IcUsers style={{ width: 14, height: 14 }} /> 5명</span>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.name}
              className="row between"
              style={{
                padding: '10px 12px',
                marginBottom: 8,
                borderRadius: 14,
                background: r.you ? 'rgba(18,185,129,0.12)' : 'var(--surface-2)',
                border: r.you ? '1px solid rgba(18,185,129,0.3)' : '1px solid transparent',
              }}
            >
              <div className="row gap-12">
                <span style={{ width: 22, fontWeight: 800, color: i < 3 ? 'var(--amber)' : 'var(--text-3)' }}>
                  {i + 1}
                </span>
                <span style={{ fontWeight: 700 }}>{r.name}{r.you ? ' (나)' : ''}</span>
              </div>
              <span className="muted">{r.steps.toLocaleString()} 보</span>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {BUDDIES.map((b) => (
            <div key={b.name} className="card" style={{ marginBottom: 12 }}>
              <div className="row between">
                <div className="row gap-12">
                  <span style={{ fontSize: 26 }}>{b.emoji}</span>
                  <div>
                    <strong>{b.name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {b.steps.toLocaleString()} / {b.goal.toLocaleString()} 보
                    </div>
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }}>
                  <IcHeart style={{ width: 16, height: 16 }} /> 응원
                </button>
              </div>
              <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: 'var(--surface-3)' }}>
                <div
                  style={{
                    width: `${Math.min(100, (b.steps / b.goal) * 100)}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: b.steps >= b.goal ? 'linear-gradient(90deg,#A3E635,#12B981)' : 'var(--sky)',
                  }}
                />
              </div>
            </div>
          ))}
          <button className="btn btn-primary btn-block mt-12">+ 걷기 메이트 초대하기</button>
        </div>
      )}
    </div>
  )
}
