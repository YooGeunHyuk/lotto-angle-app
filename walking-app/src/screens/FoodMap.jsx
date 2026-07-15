import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { IcPin, IcRoute } from '../components/Icons.jsx'

/* 맛집 지도 — walking × food discovery.
   The map/data here is DEMO. In production, restaurant data comes from official
   APIs (Kakao Local / Naver Search / Google Places / 공공데이터), each source is
   attributed and links out (esp. CatchTable, which has no public API). See
   FOODMAP.md for the real, ToS-compliant architecture. */

const SOURCES = {
  kakao: { label: '카카오맵', color: '#FBBF24' },
  naver: { label: '네이버', color: '#12B981' },
  blog: { label: '블로그', color: '#38BDF8' },
  catch: { label: '캐치테이블', color: '#FF6B6B' },
  google: { label: '구글', color: '#A3E635' },
}

const PLACES = [
  { name: '성수동 손칼국수', cat: '한식', rating: 4.6, steps: 620, min: 5, x: 32, y: 40, src: ['naver', 'blog'], catchable: false },
  { name: '언더프레셔 커피', cat: '카페', rating: 4.8, steps: 1240, min: 9, x: 58, y: 28, src: ['kakao', 'blog', 'google'], catchable: false },
  { name: '미도인 성수', cat: '일식', rating: 4.7, steps: 900, min: 7, x: 46, y: 62, src: ['catch', 'naver'], catchable: true },
  { name: '대림창고 베이커리', cat: '카페', rating: 4.5, steps: 1600, min: 12, x: 72, y: 52, src: ['kakao', 'naver'], catchable: false },
  { name: '뚝섬 갈비', cat: '한식', rating: 4.4, steps: 2100, min: 16, x: 24, y: 70, src: ['blog', 'google'], catchable: false },
  { name: '수제버거 서울숲', cat: '양식', rating: 4.6, steps: 1450, min: 11, x: 64, y: 74, src: ['catch', 'kakao', 'blog'], catchable: true },
]

const CATS = ['전체', '한식', '카페', '일식', '양식']
const SRC_FILTERS = ['전체', ...Object.keys(SOURCES)]

export default function FoodMap() {
  const { state } = useStore()
  const [cat, setCat] = useState('전체')
  const [src, setSrc] = useState('전체')
  const [active, setActive] = useState(null)

  const list = PLACES.filter((p) => (cat === '전체' || p.cat === cat) && (src === '전체' || p.src.includes(src)))

  return (
    <div className="screen animate-in">
      <header style={{ marginBottom: 12 }}>
        <div className="row between">
          <div>
            <div className="eyebrow" style={{ color: 'var(--amber)' }}>맛집 지도</div>
            <h2>걷다가 들를 맛집</h2>
          </div>
          <span className="chip" style={{ padding: '2px 8px', fontSize: 10 }}>데모</span>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          네이버·카카오맵·블로그·캐치테이블 맛집을 한 지도에. 걸어서 갈 만한 곳을 골라요.
        </p>
      </header>

      {/* Stylized map (demo) */}
      <div
        className="card"
        style={{ padding: 0, overflow: 'hidden', position: 'relative', height: 240, border: '1px solid var(--border)' }}
      >
        <MockMap places={list} active={active} onPick={setActive} />
        <div style={{ position: 'absolute', left: 10, top: 10 }} className="chip">🚶 현재 위치 · 성수동</div>
      </div>

      {/* Source filter */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 12, paddingBottom: 2 }}>
        {SRC_FILTERS.map((s) => (
          <button
            key={s}
            className={'chip' + (src === s ? ' chip-on' : '')}
            style={{ flex: '0 0 auto' }}
            onClick={() => setSrc(s)}
          >
            {s === '전체' ? '전체 출처' : SOURCES[s].label}
          </button>
        ))}
      </div>
      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 8, paddingBottom: 2 }}>
        {CATS.map((c) => (
          <button key={c} className={'chip' + (cat === c ? ' chip-on' : '')} style={{ flex: '0 0 auto' }} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="col gap-12" style={{ marginTop: 14 }}>
        {list.map((p) => (
          <div
            key={p.name}
            className={'card' + (active === p.name ? ' card-glow' : '')}
            onClick={() => setActive(p.name)}
          >
            <div className="row between">
              <div>
                <strong>{p.name}</strong>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {p.cat} · ⭐ {p.rating} · 도보 {p.min}분 (약 {p.steps.toLocaleString()}걸음)
                </div>
              </div>
              <div style={{ fontSize: 22 }}>{catEmoji(p.cat)}</div>
            </div>
            {/* source badges */}
            <div className="row gap-8" style={{ marginTop: 10, flexWrap: 'wrap' }}>
              {p.src.map((s) => (
                <span
                  key={s}
                  className="chip"
                  style={{ padding: '3px 9px', fontSize: 10.5, color: SOURCES[s].color, borderColor: `${SOURCES[s].color}55` }}
                >
                  {SOURCES[s].label}
                </span>
              ))}
            </div>
            <div className="row gap-8 mt-12">
              <button className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>
                <IcRoute style={{ width: 16, height: 16 }} /> 걸어가기
              </button>
              {p.catchable ? (
                <button className="btn btn-ghost" style={{ flex: 1, padding: '10px', color: 'var(--coral)' }}>
                  캐치테이블 예약 ↗
                </button>
              ) : (
                <button className="btn btn-ghost" style={{ flex: 1, padding: '10px' }}>
                  지도앱에서 열기 ↗
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Walking integration */}
      <div className="card mt-16" style={{ borderLeft: '3px solid var(--amber)' }}>
        <div className="row gap-8" style={{ color: 'var(--amber)', marginBottom: 6 }}>
          <IcPin style={{ width: 18, height: 18 }} />
          <strong style={{ fontSize: 14 }}>맛집까지 걸어가기 챌린지</strong>
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>
          차 대신 걸어서 맛집에 도착하면 <strong style={{ color: 'var(--text)' }}>성취 배지</strong>와 나무 성장! 오늘
          {' '}{Math.max(0, 7000 - state.stepsToday).toLocaleString()}걸음이면 근처 맛집 두세 곳은 돌아볼 수 있어요.
        </p>
      </div>

      {/* Honest data-source note */}
      <div className="card mt-16" style={{ background: 'var(--surface-2)' }}>
        <strong style={{ fontSize: 13 }}>이 지도의 맛집 정보는 어디서 오나요?</strong>
        <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
          지금은 <strong>데모 데이터</strong>예요. 정식 버전은 <strong>카카오 로컬·네이버 검색·구글 Places·공공데이터</strong>
          {' '}공식 API로 전국 맛집을 불러오고, 블로그·캐치테이블 등은 <strong>출처 표시 + 링크아웃</strong>으로 연결해요
          (무단 스크래핑·재배포는 하지 않아요). 자세한 구조는 FOODMAP.md 참고.
        </p>
      </div>
    </div>
  )
}

function MockMap({ places, active, onPick }) {
  return (
    <svg viewBox="0 0 100 66" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block', background: '#0E141C' }}>
      {/* subtle blocks */}
      <rect x="0" y="0" width="100" height="66" fill="#0E141C" />
      {[14, 34, 54, 74].map((x) => (
        <rect key={'v' + x} x={x} y="0" width="8" height="66" fill="#131B24" />
      ))}
      {[16, 40].map((y) => (
        <rect key={'h' + y} x="0" y={y} width="100" height="7" fill="#131B24" />
      ))}
      {/* river */}
      <path d="M0 58 Q 30 50 55 56 T 100 52 L100 66 L0 66 Z" fill="#12324a" opacity="0.6" />
      {/* walking route (dashed) */}
      <path d="M50 50 L46 62 M50 50 L58 28 M50 50 L32 40" stroke="#12B981" strokeWidth="0.8" strokeDasharray="2 1.5" fill="none" opacity="0.7" />
      {/* current location */}
      <circle cx="50" cy="50" r="2.4" fill="#12B981" />
      <circle cx="50" cy="50" r="4.2" fill="none" stroke="#12B981" strokeWidth="0.5" opacity="0.5" />
      {/* pins */}
      {places.map((p) => {
        const on = active === p.name
        return (
          <g key={p.name} onClick={() => onPick(p.name)} style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y} r={on ? 3.4 : 2.6} fill={on ? '#FBBF24' : '#FF6B6B'} stroke="#0A0E14" strokeWidth="0.5" />
            <text x={p.x} y={p.y + 1} fontSize="2.4" textAnchor="middle" fill="#0A0E14">🍽</text>
          </g>
        )
      })}
    </svg>
  )
}

function catEmoji(c) {
  return { 한식: '🍚', 카페: '☕', 일식: '🍣', 양식: '🍔' }[c] || '🍽️'
}
