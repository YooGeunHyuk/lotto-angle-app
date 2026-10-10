import { useStore } from '../lib/store.jsx'
import { IcCheck, IcFlag, IcLock } from '../components/Icons.jsx'

/* Goal-deposit challenges: users stake "씨앗"(seeds) on a goal.
   Meet the goal → get seeds back + bonus from the pot. Miss →
   forfeited seeds fund the group pot / a donation. (StepBet-style,
   but cash-free to sidestep gambling regulation, plus a donation option.) */

const TEMPLATES = [
  { id: 't1', title: '7일 8천보 챌린지', days: 7, goal: 8000, stake: 300, pot: 128, joined: 342, tag: '인기' },
  { id: 't2', title: '주말 1만보 스프린트', days: 2, goal: 10000, stake: 200, pot: 54, joined: 176, tag: '주말' },
  { id: 't3', title: '30일 습관 만들기', days: 30, goal: 6000, stake: 1000, pot: 903, joined: 512, tag: '장기' },
  { id: 't4', title: '기부 챌린지 · 유기견 산책', days: 14, goal: 7000, stake: 0, pot: 0, joined: 1204, tag: '기부', donation: true },
]

export default function Challenges() {
  const { state, dispatch } = useStore()

  const join = (t) => {
    if (!t.donation && state.wallet.seeds < t.stake) {
      alert('씨앗이 부족해요. 목표를 달성하며 씨앗을 모아보세요!')
      return
    }
    if (!t.donation) dispatch({ type: 'SPEND_SEEDS', n: t.stake })
    const deposit = {
      id: t.id + '-' + Date.now(),
      title: t.title,
      goal: t.goal,
      days: t.days,
      stake: t.stake,
      donation: !!t.donation,
      startedAt: new Date().toISOString().slice(0, 10),
      progress: 0,
      status: 'active',
    }
    dispatch({ type: 'ADD_DEPOSIT', deposit })
  }

  const active = state.deposits.filter((d) => d.status === 'active')

  return (
    <div className="screen animate-in">
      <header style={{ marginBottom: 14 }}>
        <div className="eyebrow">챌린지</div>
        <h2>목표에 씨앗을 걸어요</h2>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          달성하면 씨앗을 돌려받고 보너스까지. 실패한 씨앗은 완주자와 기부로 이어져요.
        </p>
      </header>

      {active.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>진행 중</h3>
          {active.map((d) => (
            <div key={d.id} className="card card-glow" style={{ marginBottom: 12 }}>
              <div className="row between">
                <strong>{d.title}</strong>
                <span className="chip chip-on">D-{d.days}</span>
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                일일 목표 {d.goal.toLocaleString()}보 · {d.donation ? '기부 챌린지' : `씨앗 ${d.stake} 예치`}
              </div>
              <ProgressBar value={0.35} />
            </div>
          ))}
        </>
      )}

      <h3 style={{ fontSize: 15, margin: '18px 0 10px' }}>참여할 수 있는 챌린지</h3>
      {TEMPLATES.map((t) => (
        <div key={t.id} className="card" style={{ marginBottom: 12 }}>
          <div className="row between">
            <div className="row gap-8">
              <span style={{ color: t.donation ? 'var(--coral)' : 'var(--green-500)' }}>
                <IcFlag />
              </span>
              <strong>{t.title}</strong>
            </div>
            <span className={'chip' + (t.tag === '기부' ? '' : ' chip-on')}>{t.tag}</span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            {t.days}일 · 하루 {t.goal.toLocaleString()}보 · 참여 {t.joined.toLocaleString()}명
          </div>
          <div className="row between mt-12" style={{ alignItems: 'center' }}>
            <div style={{ fontSize: 13 }}>
              {t.donation ? (
                <span style={{ color: 'var(--coral)', fontWeight: 700 }}>🐾 무료 · 걸음이 곧 기부</span>
              ) : (
                <>
                  <span className="muted">예치 </span>
                  <strong>씨앗 {t.stake}</strong>
                  <span className="muted"> · 상금풀 </span>
                  <strong style={{ color: 'var(--amber)' }}>{t.pot.toLocaleString()}</strong>
                </>
              )}
            </div>
            <button className="btn btn-primary" style={{ padding: '10px 16px' }} onClick={() => join(t)}>
              참여
            </button>
          </div>
        </div>
      ))}

      <div className="card mt-16 row gap-12" style={{ alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--text-3)' }}><IcLock /></span>
        <div>
          <div className="row gap-8">
            <strong style={{ fontSize: 14 }}>씨앗은 진짜 무슨 가치가 있나요?</strong>
            <span className="chip" style={{ padding: '2px 8px', fontSize: 10 }}>데모</span>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
            현금 예치·상금은 사행성 규제 대상이라 쓰지 않아요. 씨앗은 앱 내 재화이고, 실제 가치는
            <strong style={{ color: 'var(--text)' }}> 구독(Plus) 할인 · 파트너 쿠폰 · 기부 전환 · 굿즈</strong>로만
            교환됩니다. 이 교환의 재원은 <strong style={{ color: 'var(--text)' }}>우리 매출·파트너·스폰서 예산</strong>이지,
            신규 유저 돈이 아니에요(그래서 지속 가능). 지금 화면의 상금풀·참여자 수는 <strong>예시(데모)</strong>예요.
            <br />자세한 자금·법 구조는 REWARDS.md 참고.
          </p>
        </div>
      </div>
    </div>
  )
}

function ProgressBar({ value }) {
  return (
    <div style={{ marginTop: 12, height: 8, borderRadius: 999, background: 'var(--surface-3)' }}>
      <div
        style={{
          width: `${Math.min(100, value * 100)}%`,
          height: '100%',
          borderRadius: 999,
          background: 'linear-gradient(90deg, #A3E635, #12B981)',
        }}
      />
    </div>
  )
}
