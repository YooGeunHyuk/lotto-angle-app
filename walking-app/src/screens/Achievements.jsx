import { useNavigate } from 'react-router-dom'
import { useStore, tier, achievements } from '../lib/store.jsx'

export default function Achievements() {
  const { state } = useStore()
  const nav = useNavigate()
  const t = tier(state)
  const badges = achievements(state)
  const earned = badges.filter((b) => b.got).length

  return (
    <div className="screen animate-in">
      <header className="row gap-12" style={{ marginBottom: 16, alignItems: 'center' }}>
        <button className="chip" onClick={() => nav(-1)} style={{ padding: '6px 12px' }}>← 뒤로</button>
        <div>
          <div className="eyebrow">성취</div>
          <h2 style={{ fontSize: 22 }}>나의 등급 · 도감</h2>
        </div>
      </header>

      {/* Current tier hero */}
      <div className="card card-glow col" style={{ alignItems: 'center', padding: '24px 18px' }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 46,
            background: `radial-gradient(circle at 50% 40%, ${t.color}33, ${t.color}0d)`,
            border: `1px solid ${t.color}55`,
          }}
        >
          {t.emoji}
        </div>
        <div style={{ marginTop: 12, fontWeight: 800, fontSize: 22, color: t.color }}>{t.name}</div>
        <div className="muted" style={{ fontSize: 13 }}>Lv.{t.level} · {t.days}일 걸음</div>
        {!t.isMax ? (
          <>
            <div style={{ width: '100%', marginTop: 16, height: 10, borderRadius: 999, background: 'var(--surface-3)' }}>
              <div style={{ width: `${t.progress * 100}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${t.color}, #12B981)` }} />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              다음 등급 <strong style={{ color: 'var(--text)' }}>{t.next.emoji} {t.next.name}</strong>까지 {t.next.min - t.days}일
            </div>
          </>
        ) : (
          <div className="chip chip-on" style={{ marginTop: 14 }}>최고 등급 달성 👑</div>
        )}
      </div>

      {/* Tier ladder — colorful & diverse */}
      <h3 style={{ fontSize: 15, margin: '20px 0 10px' }}>등급 사다리</h3>
      <div className="card col gap-8">
        {TIER_LADDER.map((tt, i) => {
          const reached = t.idx >= i
          const isCur = t.idx === i
          return (
            <div
              key={tt.name}
              className="row between"
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                background: isCur ? `${tt.color}1f` : 'transparent',
                border: isCur ? `1px solid ${tt.color}66` : '1px solid transparent',
                opacity: reached ? 1 : 0.45,
              }}
            >
              <div className="row gap-12">
                <span style={{ fontSize: 24, filter: reached ? 'none' : 'grayscale(1)' }}>{tt.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, color: reached ? tt.color : 'var(--text-2)' }}>{tt.name}</div>
                  <div className="dim" style={{ fontSize: 11 }}>{tt.min}일 걸음</div>
                </div>
              </div>
              <span className="dim" style={{ fontSize: 12 }}>{reached ? '달성' : `Lv.${i + 1}`}</span>
            </div>
          )
        })}
      </div>

      {/* Badge collection (도감) */}
      <div className="row between" style={{ margin: '22px 0 10px', alignItems: 'baseline' }}>
        <h3 style={{ fontSize: 15 }}>성취 도감</h3>
        <span className="muted" style={{ fontSize: 13 }}>{earned} / {badges.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {badges.map((b) => (
          <div
            key={b.id}
            className="card col"
            style={{
              alignItems: 'center',
              padding: '14px 8px',
              gap: 6,
              opacity: b.got ? 1 : 0.5,
              borderColor: b.got ? `${b.color}55` : 'var(--border)',
              background: b.got ? `${b.color}12` : 'var(--surface)',
            }}
          >
            <div style={{ fontSize: 30, filter: b.got ? 'none' : 'grayscale(1) opacity(0.6)' }}>{b.got ? b.emoji : '🔒'}</div>
            <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center' }}>{b.name}</div>
            <div className="dim" style={{ fontSize: 10, textAlign: 'center', lineHeight: 1.3 }}>{b.desc}</div>
          </div>
        ))}
      </div>

      <p className="dim" style={{ fontSize: 11, marginTop: 16, lineHeight: 1.5, textAlign: 'center' }}>
        모든 배지는 <strong>진짜 걷기·행동</strong>으로만 열려요. 가챠·구매·인위적 희소성은 없어요.
      </p>
    </div>
  )
}

const TIER_LADDER = [
  { min: 0, name: '새싹 워커', emoji: '🌱', color: '#A3E635' },
  { min: 5, name: '산책 입문', emoji: '🚶', color: '#38BDF8' },
  { min: 14, name: '걷기 러버', emoji: '🥾', color: '#12B981' },
  { min: 30, name: '트레일러', emoji: '🏞️', color: '#FBBF24' },
  { min: 60, name: '산책 마스터', emoji: '⛰️', color: '#FB923C' },
  { min: 100, name: '걷기의 달인', emoji: '🏔️', color: '#F472B6' },
  { min: 200, name: '레전드 워커', emoji: '👑', color: '#8B5CF6' },
]
