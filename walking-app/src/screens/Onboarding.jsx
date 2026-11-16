import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { requestMotionPermission } from '../lib/pedometer.js'
import { IcCheck, IcHeart, IcSpark, IcUsers } from '../components/Icons.jsx'

const VALUES = [
  { Icon: IcSpark, color: 'var(--violet)', title: '매일 다른 AI 코칭', body: '걸음 데이터를 읽고 오늘 당신에게 맞는 조언을 건네요.' },
  { Icon: IcUsers, color: 'var(--sky)', title: '혼자 걷지 않게', body: '걷기 메이트와 챌린지로 습관이 3배 오래 갑니다.' },
  { Icon: IcHeart, color: 'var(--coral)', title: '걸음이 곧 선행', body: '당신의 걸음이 유기견 산책·기부로 이어져요.' },
]

export default function Onboarding() {
  const { state, dispatch } = useStore()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState(state.profile.dailyGoal)

  const finish = async () => {
    await requestMotionPermission()
    dispatch({
      type: 'UPDATE_PROFILE',
      patch: {
        name: name.trim() || '나',
        dailyGoal: goal,
        onboarded: true,
        habitStartDate: new Date().toISOString().slice(0, 10),
      },
    })
  }

  return (
    <div className="screen animate-in" style={{ display: 'flex', flexDirection: 'column' }}>
      {step === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 8 }}>🚶‍♀️</div>
          <h1 style={{ fontSize: 32, textAlign: 'center', lineHeight: 1.2 }}>
            함께 걷는<br />습관, <span style={{ color: 'var(--green-500)' }}>Stride</span>
          </h1>
          <p className="muted" style={{ textAlign: 'center', marginTop: 12, fontSize: 14 }}>
            리워드로 지치지 않고, 사람으로 이어지는 걷기 앱
          </p>
          <div className="col gap-12 mt-32">
            {VALUES.map((v) => (
              <div key={v.title} className="card row gap-16" style={{ alignItems: 'center' }}>
                <span style={{ color: v.color, width: 26, height: 26, display: 'inline-flex' }}><v.Icon /></span>
                <div>
                  <strong style={{ fontSize: 14 }}>{v.title}</strong>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{v.body}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-block mt-32" onClick={() => setStep(1)}>시작하기</button>
        </div>
      )}

      {step === 1 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="eyebrow">1 / 2</div>
          <h1 style={{ fontSize: 26, marginTop: 8 }}>어떻게 불러드릴까요?</h1>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 또는 닉네임"
            style={{
              marginTop: 20,
              padding: '16px 18px',
              borderRadius: 16,
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text)',
              fontSize: 18,
              outline: 'none',
            }}
          />
          <button className="btn btn-primary btn-block mt-24" onClick={() => setStep(2)}>다음</button>
        </div>
      )}

      {step === 2 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="eyebrow">2 / 2</div>
          <h1 style={{ fontSize: 26, marginTop: 8 }}>하루 목표를 정해요</h1>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            '만보'는 마케팅에서 온 숫자예요. 연구상 <strong style={{ color: 'var(--text)' }}>하루 약 7,000보</strong>면
            건강 이득 대부분을 얻어요. 코치가 컨디션에 맞게 조정도 도와드려요.
          </p>
          <div className="col gap-12 mt-24">
            {[
              [5000, '가볍게 시작', '거의 안 걷다가 늘리면 효과가 가장 큼'],
              [7000, '건강 기준 (추천)', '사망률·심혈관 위험 크게 감소하는 구간'],
              [10000, '적극적으로', '더 활동적인 사람을 위한 목표'],
            ].map(([g, label, sub]) => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className="card row between"
                style={{
                  textAlign: 'left',
                  borderColor: goal === g ? 'rgba(18,185,129,0.5)' : 'var(--border)',
                  background: goal === g ? 'rgba(18,185,129,0.1)' : 'var(--surface)',
                }}
              >
                <div>
                  <strong>{g.toLocaleString()}보 · {label}</strong>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>
                </div>
                {goal === g && <span style={{ color: 'var(--green-500)' }}><IcCheck /></span>}
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-block mt-32" onClick={finish}>
            걷기 시작하기 →
          </button>
          <p className="dim" style={{ fontSize: 11, textAlign: 'center', marginTop: 12 }}>
            정확한 걸음 측정을 위해 동작 센서 권한을 요청합니다.
          </p>
        </div>
      )}
    </div>
  )
}
