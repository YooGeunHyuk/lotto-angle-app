import { useRef, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import KakaoMap from '../components/KakaoMap.jsx'
import { IcCheck, IcPin, IcRoute } from '../components/Icons.jsx'

/* 맛집 지도 — walking × food discovery.
   Map is REAL Kakao Maps when VITE_KAKAO_MAP_KEY is set (falls back to a mock
   under the offline artifact CSP). Restaurant list is demo data; production
   pulls from official APIs + link-out (see FOODMAP.md). Reviews are our own,
   stored on-device — the long-term data moat. */

const CENTER = { lat: 37.5445, lng: 127.0559 } // 성수동

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

const COURSES = [
  { id: 'cafe', emoji: '☕', name: '성수 카페 산책', stops: ['언더프레셔 커피', '대림창고 베이커리', '서울숲'], km: 2.4, min: 32, steps: 3200 },
  { id: 'gourmet', emoji: '🍚', name: '뚝섬 미식 코스', stops: ['성수동 손칼국수', '미도인 성수', '뚝섬 갈비'], km: 3.1, min: 41, steps: 4200 },
]

const CATS = ['전체', '한식', '카페', '일식', '양식']
const SRC_FILTERS = ['전체', ...Object.keys(SOURCES)]

export default function FoodMap() {
  const { state } = useStore()
  const [view, setView] = useState('map')
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
      </header>

      {/* view toggle */}
      <div className="row gap-8" style={{ marginBottom: 12 }}>
        <button className={'chip' + (view === 'map' ? ' chip-on' : '')} onClick={() => setView('map')}>🗺️ 맛집 지도</button>
        <button className={'chip' + (view === 'course' ? ' chip-on' : '')} onClick={() => setView('course')}>🚶 미식 산책 코스</button>
      </div>

      {view === 'map' ? (
        <>
          {/* Map: real Kakao when keyed, else mock */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative', height: 240 }}>
            <KakaoMap
              center={CENTER}
              keyword="성수동 맛집"
              fallback={<MockMap places={list} active={active} onPick={setActive} />}
            />
            <div style={{ position: 'absolute', left: 10, top: 10, zIndex: 5 }} className="chip">🚶 현재 위치 · 성수동</div>
          </div>

          {/* filters */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 12, paddingBottom: 2 }}>
            {SRC_FILTERS.map((s) => (
              <button key={s} className={'chip' + (src === s ? ' chip-on' : '')} style={{ flex: '0 0 auto' }} onClick={() => setSrc(s)}>
                {s === '전체' ? '전체 출처' : SOURCES[s].label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 8, paddingBottom: 2 }}>
            {CATS.map((c) => (
              <button key={c} className={'chip' + (cat === c ? ' chip-on' : '')} style={{ flex: '0 0 auto' }} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>

          {/* list */}
          <div className="col gap-12" style={{ marginTop: 14 }}>
            {list.map((p) => (
              <PlaceCard key={p.name} p={p} active={active === p.name} onPick={() => setActive(p.name)} />
            ))}
          </div>

          {/* honest data note */}
          <div className="card mt-16" style={{ background: 'var(--surface-2)' }}>
            <strong style={{ fontSize: 13 }}>이 지도의 맛집 정보는 어디서 오나요?</strong>
            <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
              지도는 <strong>카카오맵 실연동</strong>(키 설정 시 실제 지도·검색, 미설정 시 데모 지도)이에요. 목록은 데모 데이터고,
              정식 버전은 <strong>공공데이터·카카오 로컬·구글 Places</strong>로 전국 맛집을 불러오고 블로그·캐치테이블은
              <strong>출처 표시 + 링크아웃</strong>으로 연결해요(무단 스크래핑 없음). 자세히: FOODMAP.md
            </p>
          </div>
        </>
      ) : (
        <CourseView state={state} />
      )}

      {/* Walking integration (always visible) */}
      <div className="card mt-16" style={{ borderLeft: '3px solid var(--amber)' }}>
        <div className="row gap-8" style={{ color: 'var(--amber)', marginBottom: 6 }}>
          <IcPin style={{ width: 18, height: 18 }} />
          <strong style={{ fontSize: 14 }}>맛집까지 걸어가기 챌린지</strong>
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>
          차 대신 걸어서 도착하면 <strong style={{ color: 'var(--text)' }}>성취 배지</strong>와 나무 성장! 방문 후
          리뷰를 남기면 다음 사람에게 도움이 돼요.
        </p>
      </div>
    </div>
  )
}

function PlaceCard({ p, active, onPick }) {
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const myReviews = state.reviews[p.name] || []

  return (
    <div className={'card' + (active ? ' card-glow' : '')} onClick={onPick}>
      <div className="row between">
        <div>
          <strong>{p.name}</strong>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {p.cat} · ⭐ {p.rating} · 도보 {p.min}분 (약 {p.steps.toLocaleString()}걸음)
          </div>
        </div>
        <div style={{ fontSize: 22 }}>{catEmoji(p.cat)}</div>
      </div>
      <div className="row gap-8" style={{ marginTop: 10, flexWrap: 'wrap' }}>
        {p.src.map((s) => (
          <span key={s} className="chip" style={{ padding: '3px 9px', fontSize: 10.5, color: SOURCES[s].color, borderColor: `${SOURCES[s].color}55` }}>
            {SOURCES[s].label}
          </span>
        ))}
      </div>
      <div className="row gap-8 mt-12">
        <button className="btn btn-primary" style={{ flex: 1, padding: '10px' }}><IcRoute style={{ width: 16, height: 16 }} /> 걸어가기</button>
        {p.catchable ? (
          <button className="btn btn-ghost" style={{ flex: 1, padding: '10px', color: 'var(--coral)' }}>캐치테이블 예약 ↗</button>
        ) : (
          <button className="btn btn-ghost" style={{ flex: 1, padding: '10px' }}>지도앱에서 열기 ↗</button>
        )}
      </div>
      {/* our own reviews */}
      <button
        className="btn btn-ghost btn-block mt-8"
        style={{ padding: '9px', fontSize: 13 }}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
      >
        ✍️ 걷고 나서 리뷰 {myReviews.length > 0 ? `(${myReviews.length})` : '쓰기'}
      </button>
      {open && <ReviewBlock place={p.name} reviews={myReviews} dispatch={dispatch} today={state.today} />}
    </div>
  )
}

function ReviewBlock({ place, reviews, dispatch, today }) {
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)
  const fileRef = useRef(null)

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    if (f) setPhoto(await downscaleImage(f))
  }
  const submit = (e) => {
    e.stopPropagation()
    if (!text.trim()) return
    dispatch({ type: 'ADD_REVIEW', place, review: { rating, text: text.trim(), date: today, photo } })
    setText('')
    setPhoto(null)
    if (fileRef.current) fileRef.current.value = ''
  }
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 10, padding: 12, borderRadius: 14, background: 'var(--surface-2)' }}>
      <div className="row gap-8" style={{ marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} style={{ fontSize: 20, opacity: n <= rating ? 1 : 0.3 }}>⭐</button>
        ))}
      </div>
      {photo && (
        <div style={{ position: 'relative', marginBottom: 8, width: 90 }}>
          <img src={photo} alt="" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10 }} />
          <button
            onClick={() => setPhoto(null)}
            style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 999, background: 'var(--surface-3)', fontSize: 12 }}
          >
            ✕
          </button>
        </div>
      )}
      <div className="row gap-8">
        <button className="btn btn-ghost" style={{ padding: '10px 12px' }} onClick={() => fileRef.current?.click()}>📷</button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="걸어가서 먹어본 솔직 후기…"
          style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
        />
        <button className="btn btn-primary" style={{ padding: '10px 14px' }} onClick={submit}>등록</button>
      </div>
      {reviews.length > 0 && (
        <div className="col gap-8" style={{ marginTop: 12 }}>
          {reviews.map((r, i) => (
            <div key={i} className="row gap-8" style={{ alignItems: 'flex-start' }}>
              {r.photo && <img src={r.photo} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
              <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                <span style={{ color: 'var(--amber)' }}>{'⭐'.repeat(r.rating)}</span> <span className="muted">{r.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="dim" style={{ fontSize: 10.5, marginTop: 10 }}>내 리뷰·사진은 이 기기에 저장돼요. 정식 버전에선 걷기 유저 리뷰가 모여 우리만의 맛집 데이터가 됩니다.</p>
    </div>
  )
}

// Downscale an image file to a small JPEG data URL (localStorage-friendly).
function downscaleImage(file, max = 600, quality = 0.6) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

function CourseView({ state }) {
  const { dispatch } = useStore()
  const [started, setStarted] = useState({})
  const [creating, setCreating] = useState(false)
  const remaining = Math.max(0, state.profile.dailyGoal - state.stepsToday)
  const allCourses = [...state.userCourses, ...COURSES]
  return (
    <div className="col gap-12">
      <div className="row between" style={{ alignItems: 'center' }}>
        <p className="muted" style={{ fontSize: 13, margin: 0, maxWidth: '62%' }}>맛집을 잇는 도보 코스. 걸으며 미식을 즐기고 목표도 채워요.</p>
        <button className="btn btn-primary" style={{ padding: '9px 14px', fontSize: 13 }} onClick={() => setCreating(true)}>+ 내 코스 만들기</button>
      </div>
      {allCourses.map((c) => {
        const done = state.courses.completed.includes(c.id)
        const inProgress = started[c.id]
        return (
          <div key={c.id} className={'card' + (done ? ' card-glow' : '')}>
            <div className="row between">
              <div className="row gap-12">
                <span style={{ fontSize: 26 }}>{c.emoji}</span>
                <div>
                  <div className="row gap-8" style={{ alignItems: 'center' }}>
                    <strong>{c.name}</strong>
                    {c.mine && <span className="chip" style={{ padding: '2px 8px', fontSize: 10, color: 'var(--sky)', borderColor: 'rgba(56,189,248,0.4)' }}>내 코스</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{c.km}km · {c.min}분 · 약 {c.steps.toLocaleString()}걸음</div>
                </div>
              </div>
              {done ? (
                <span className="chip chip-on">완주 ✅</span>
              ) : c.mine ? (
                <button className="chip" style={{ color: 'var(--text-3)' }} onClick={() => dispatch({ type: 'DELETE_USER_COURSE', id: c.id })}>삭제</button>
              ) : (
                <span className="chip chip-on">{c.stops.length}곳</span>
              )}
            </div>
            <div className="row" style={{ marginTop: 12, flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
              {c.stops.map((s, i) => (
                <span key={s} className="row" style={{ alignItems: 'center', gap: 4 }}>
                  <span className="chip" style={{ padding: '4px 10px', fontSize: 11 }}>{s}</span>
                  {i < c.stops.length - 1 && <span className="dim">→</span>}
                </span>
              ))}
            </div>
            <div className="row between mt-12" style={{ alignItems: 'center' }}>
              <span className="muted" style={{ fontSize: 12 }}>
                {done ? '코스 완주 배지 획득! 🍜' : c.steps <= remaining ? '오늘 목표 안에서 완주 가능!' : `목표까지 ${remaining.toLocaleString()}걸음 남음`}
              </span>
              {done ? (
                <button className="btn btn-ghost" style={{ padding: '10px 16px' }} disabled>완주함</button>
              ) : inProgress ? (
                <button
                  className="btn btn-primary"
                  style={{ padding: '10px 16px' }}
                  onClick={() => dispatch({ type: 'COMPLETE_COURSE', id: c.id })}
                >
                  <IcCheck style={{ width: 16, height: 16 }} /> 완주 인증
                </button>
              ) : (
                <button className="btn btn-primary" style={{ padding: '10px 16px' }} onClick={() => setStarted((s) => ({ ...s, [c.id]: true }))}>
                  코스 시작
                </button>
              )}
            </div>
          </div>
        )
      })}
      <div className="card" style={{ background: 'var(--surface-2)' }}>
        <p className="muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.6 }}>
          정식 버전에선 <strong>보행자 경로 API</strong>로 실제 도보 길안내를 제공하고, GPS로 완주를 자동 인증해요.
          코스는 우리 큐레이션 + <strong>유저가 만든 코스</strong>로 지역마다 늘어나요.
        </p>
      </div>
      {creating && <CourseCreator dispatch={dispatch} onClose={() => setCreating(false)} />}
    </div>
  )
}

const COURSE_EMOJIS = ['🍜', '☕', '🍣', '🍔', '🌮', '🍕', '🥗', '🍰']

function CourseCreator({ dispatch, onClose }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🍜')
  const [stops, setStops] = useState([])

  const toggle = (n) => setStops((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))
  const steps = stops.length * 850
  const km = (steps / 1350).toFixed(1)
  const min = Math.round(steps / 110)
  const canSave = name.trim() && stops.length >= 2

  const save = () => {
    if (!canSave) return
    dispatch({
      type: 'ADD_USER_COURSE',
      course: { id: 'u' + Date.now(), name: name.trim(), emoji, stops, km: +km, min, steps, mine: true },
    })
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 460, borderRadius: '24px 24px 0 0', maxHeight: '86%', overflowY: 'auto' }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 17 }}>내 미식 코스 만들기</h3>
          <button className="chip" onClick={onClose}>닫기</button>
        </div>

        <div className="row gap-8" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {COURSE_EMOJIS.slice(0, 4).map((e) => (
              <button key={e} onClick={() => setEmoji(e)} style={{ fontSize: 22, padding: 6, borderRadius: 10, background: emoji === e ? 'rgba(18,185,129,0.18)' : 'var(--surface-2)', border: emoji === e ? '1px solid var(--green-500)' : '1px solid var(--border)' }}>{e}</button>
            ))}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="코스 이름 (예: 우리 동네 카페 투어)"
            style={{ flex: 1, padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
          />
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, margin: '4px 0 8px' }}>맛집 담기 (순서대로 · 2곳 이상)</div>
        <div className="col gap-8">
          {PLACES.map((p) => {
            const idx = stops.indexOf(p.name)
            const on = idx >= 0
            return (
              <button
                key={p.name}
                onClick={() => toggle(p.name)}
                className="row between"
                style={{ padding: '10px 12px', borderRadius: 12, textAlign: 'left', background: on ? 'rgba(18,185,129,0.12)' : 'var(--surface-2)', border: on ? '1px solid rgba(18,185,129,0.4)' : '1px solid var(--border)' }}
              >
                <span className="row gap-8"><span style={{ fontSize: 18 }}>{catEmoji(p.cat)}</span> <span style={{ fontSize: 14 }}>{p.name}</span></span>
                {on ? <span className="chip chip-on" style={{ padding: '2px 9px' }}>{idx + 1}번째</span> : <span className="dim">담기 +</span>}
              </button>
            )
          })}
        </div>

        <div className="card mt-16" style={{ background: 'var(--surface-2)' }}>
          <div className="muted" style={{ fontSize: 12 }}>예상</div>
          <div style={{ fontWeight: 800, marginTop: 2 }}>{km}km · {min}분 · 약 {steps.toLocaleString()}걸음 · {stops.length}곳</div>
        </div>

        <button className={'btn btn-block mt-16 ' + (canSave ? 'btn-primary' : 'btn-ghost')} onClick={save} disabled={!canSave}>
          {canSave ? '코스 저장' : '이름과 맛집 2곳 이상을 담아주세요'}
        </button>
        <p className="dim" style={{ fontSize: 11, textAlign: 'center', marginTop: 10 }}>
          만든 코스는 내 목록에 저장돼요. 정식 버전에선 다른 사람과 공유할 수 있어요.
        </p>
      </div>
    </div>
  )
}

function MockMap({ places, active, onPick }) {
  return (
    <svg viewBox="0 0 100 66" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block', background: '#0E141C' }}>
      <rect x="0" y="0" width="100" height="66" fill="#0E141C" />
      {[14, 34, 54, 74].map((x) => <rect key={'v' + x} x={x} y="0" width="8" height="66" fill="#131B24" />)}
      {[16, 40].map((y) => <rect key={'h' + y} x="0" y={y} width="100" height="7" fill="#131B24" />)}
      <path d="M0 58 Q 30 50 55 56 T 100 52 L100 66 L0 66 Z" fill="#12324a" opacity="0.6" />
      <path d="M50 50 L46 62 M50 50 L58 28 M50 50 L32 40" stroke="#12B981" strokeWidth="0.8" strokeDasharray="2 1.5" fill="none" opacity="0.7" />
      <circle cx="50" cy="50" r="2.4" fill="#12B981" />
      <circle cx="50" cy="50" r="4.2" fill="none" stroke="#12B981" strokeWidth="0.5" opacity="0.5" />
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
