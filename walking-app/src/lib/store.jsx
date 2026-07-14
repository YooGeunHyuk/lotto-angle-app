/* ============================================================
   Store — localStorage-backed app state via React context.
   Holds profile, daily step history, streak, goal, wallet, and
   the feature state (challenges, deposits, donations) that the
   differentiation layer builds on.
   ============================================================ */
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'

const KEY = 'stride.v1'
const todayKey = (d = new Date()) => d.toISOString().slice(0, 10)

const initial = {
  profile: {
    name: '나',
    weightKg: 65,
    dailyGoal: 7000, // health-based default (Lancet Public Health 2025), not the 10k myth
    weeklyGoalDays: 4, // JAMA Netw Open 2023: benefit plateaus at 3–4 active days/week
    ageBand: null, // '<60' | '60+' — personalizes the goal ceiling
    onboarded: false,
    plan: 'free', // 'free' | 'plus'
    habitStartDate: null, // when the habit journey began (66-day progress)
  },
  // Implementation intention (Gollwitzer): an if-then plan anchored to a
  // daily routine (habit stacking). Strongest single adherence booster.
  walkPlan: { cue: '', action: '', enabled: false },
  today: todayKey(),
  stepsToday: 0,
  briskToday: 0, // steps taken at moderate+ cadence (≥100 spm)
  history: {}, // { 'YYYY-MM-DD': steps }
  streak: 0,
  wallet: { seeds: 0 }, // "씨앗" — non-cash internal currency
  // differentiation features (populated by feature modules)
  deposits: [], // goal-deposit challenges (예치 챌린지)
  donations: { totalMeters: 0, campaignId: null },
  buddies: [],
  moods: {}, // { 'YYYY-MM-DD': score 1..5 } — walk↔mood link (mental health)
  settings: { sound: true, haptics: true },
}

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload }
    case 'ROLLOVER': {
      // new day: archive yesterday, reset today. Streak is computed
      // flexibly elsewhere (weekly active days), so we don't hard-reset it here.
      const y = state.today
      const history = { ...state.history, [y]: state.stepsToday }
      return {
        ...state,
        history,
        today: action.today,
        stepsToday: 0,
        briskToday: 0,
      }
    }
    case 'ADD_STEPS': {
      const stepsToday = state.stepsToday + action.n
      const crossedGoal =
        state.stepsToday < state.profile.dailyGoal && stepsToday >= state.profile.dailyGoal
      return {
        ...state,
        stepsToday,
        briskToday: state.briskToday + (action.brisk ? action.n : 0),
        streak: crossedGoal ? state.streak + 1 : state.streak,
        wallet: { ...state.wallet, seeds: state.wallet.seeds + (crossedGoal ? 50 : 0) },
      }
    }
    case 'SET_STEPS':
      return { ...state, stepsToday: action.n }
    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.patch } }
    case 'ADD_SEEDS':
      return { ...state, wallet: { ...state.wallet, seeds: state.wallet.seeds + action.n } }
    case 'SPEND_SEEDS':
      return {
        ...state,
        wallet: { ...state.wallet, seeds: Math.max(0, state.wallet.seeds - action.n) },
      }
    case 'ADD_DEPOSIT':
      return { ...state, deposits: [action.deposit, ...state.deposits] }
    case 'UPDATE_DEPOSIT':
      return {
        ...state,
        deposits: state.deposits.map((d) => (d.id === action.id ? { ...d, ...action.patch } : d)),
      }
    case 'ADD_DONATION_METERS':
      return {
        ...state,
        donations: { ...state.donations, totalMeters: state.donations.totalMeters + action.m },
      }
    case 'SET_DONATION_CAMPAIGN':
      return { ...state, donations: { ...state.donations, campaignId: action.id } }
    case 'SET_MOOD':
      return { ...state, moods: { ...state.moods, [action.day || state.today]: action.score } }
    case 'SET_WALK_PLAN':
      return { ...state, walkPlan: { ...state.walkPlan, ...action.patch } }
    case 'RESET':
      return { ...initial, profile: { ...initial.profile, onboarded: false } }
    default:
      return state
  }
}

const StoreCtx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const loaded = useRef(false)

  // hydrate once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        dispatch({ type: 'HYDRATE', payload: saved })
      }
    } catch {
      /* ignore */
    }
    loaded.current = true
  }, [])

  // persist
  useEffect(() => {
    if (!loaded.current) return
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  // day rollover check
  useEffect(() => {
    const check = () => {
      const t = todayKey()
      if (t !== state.today) dispatch({ type: 'ROLLOVER', today: t })
    }
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [state.today])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

// Seed some demo history so charts/leaderboards look alive in preview.
// Moods are correlated with steps (more walking → better mood) so the
// walk↔mood insight has something real to show.
export function seedDemoHistory(dispatch, state) {
  if (Object.keys(state.history).length > 0) return
  const history = {}
  const moods = {}
  let s = 1234567
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff), s / 0x7fffffff)
  for (let i = 1; i <= 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const steps = Math.round(3000 + rnd() * 9000)
    history[key] = steps
    // mood 1..5 loosely rising with steps, plus noise
    const base = 2 + (steps / 12000) * 2.5
    moods[key] = Math.max(1, Math.min(5, Math.round(base + (rnd() - 0.5))))
  }
  // Seed a habit start ~14 days ago so the 66-day progress looks alive.
  const hs = new Date()
  hs.setDate(hs.getDate() - 14)
  dispatch({
    type: 'HYDRATE',
    payload: {
      history,
      moods,
      profile: { ...state.profile, habitStartDate: state.profile.habitStartDate || hs.toISOString().slice(0, 10) },
    },
  })
}

// Active days in the last 7 (incl. today) that met the daily goal.
// This is the consistency-first metric: JAMA Netw Open 2023 shows meaningful
// mortality benefit from even 1–2 goal days/week, plateauing at 3–4.
export function weekActiveDays(state) {
  let count = 0
  const goal = state.profile.dailyGoal
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const steps = i === 0 ? state.stepsToday : state.history[key] || 0
    if (steps >= goal) count++
  }
  return count
}

// Brisk (moderate-intensity) walking minutes today, from brisk step count.
export function briskMinutes(state) {
  return Math.round(state.briskToday / 110)
}

// Days since the habit journey began. Real habit automaticity forms over a
// median of ~66 days (Lally 2010, range 18–254) — not the 21-day myth.
export const HABIT_TARGET_DAYS = 66
export function habitDay(state) {
  const start = state.profile.habitStartDate
  if (!start) return 1
  const ms = new Date(state.today) - new Date(start)
  return Math.max(1, Math.floor(ms / 86400000) + 1)
}

// Flexible streak: consecutive recent days that EITHER met the goal OR are
// allowed rest days. A single lapse doesn't zero it (counters the
// what-the-hell effect); we look back and stop only after 2 straight misses.
export function flexibleStreak(state) {
  const goal = state.profile.dailyGoal
  let streak = 0
  let consecutiveMiss = 0
  for (let i = 0; i < 60; i++) {
    const d = new Date(state.today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const steps = i === 0 ? state.stepsToday : state.history[key] || 0
    if (steps >= goal) {
      streak++
      consecutiveMiss = 0
    } else {
      // today not-yet-met shouldn't break the streak; only past days count as miss
      if (i === 0) continue
      consecutiveMiss++
      if (consecutiveMiss >= 2) break
      // one rest day is tolerated — counts toward keeping streak alive but not +1
    }
  }
  return streak
}

// Detect a return after a gap (relapse) → trigger a warm welcome-back.
export function daysSinceLastActive(state) {
  const goal = state.profile.dailyGoal
  for (let i = 1; i <= 30; i++) {
    const d = new Date(state.today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if ((state.history[key] || 0) >= goal) return i
  }
  return 99
}

// Correlation-ish summary between walking and mood (for coach insight).
export function walkMoodSummary(state) {
  const days = Object.keys(state.moods)
  if (days.length < 5) return null
  const goal = state.profile.dailyGoal
  let hi = [],
    lo = []
  for (const d of days) {
    const steps = state.history[d] || 0
    const m = state.moods[d]
    if (steps >= goal * 0.8) hi.push(m)
    else lo.push(m)
  }
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
  if (!hi.length || !lo.length) return null
  return { activeMood: avg(hi), lowMood: avg(lo), diff: avg(hi) - avg(lo), n: days.length }
}
