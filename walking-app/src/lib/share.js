/* Render the 오운완 achievement card to an image and share/download it.
   Pure Canvas — no external libs, works offline and under a strict CSP.
   Uses the Web Share API (navigator.share with files) when available,
   otherwise falls back to a PNG download. */

import { stepsToKm } from './pedometer.js'

const briskMinutes = (state) => Math.round(state.briskToday / 110)

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function renderCard(state, steps, style) {
  const s = style || { emoji: '🏅', accent: '#12B981', bg: ['#0B6E4F', '#0A0E14'] }
  const W = 720
  const H = 900
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // background
  ctx.fillStyle = '#0A0E14'
  ctx.fillRect(0, 0, W, H)
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, s.bg[0])
  g.addColorStop(0.7, s.bg[1])
  g.addColorStop(1, s.bg[1])
  ctx.fillStyle = g
  roundRect(ctx, 40, 40, W - 80, H - 80, 40)
  ctx.fill()
  ctx.strokeStyle = hexA(s.accent, 0.45)
  ctx.lineWidth = 2
  roundRect(ctx, 40, 40, W - 80, H - 80, 40)
  ctx.stroke()

  ctx.textAlign = 'center'
  const cx = W / 2

  // limited-season ribbon
  if (s.limited) {
    ctx.fillStyle = s.accent
    ctx.font = 'bold 22px sans-serif'
    ctx.fillText(`✦ ${s.limited} 한정 ✦`, cx, 100)
  }

  // eyebrow
  ctx.fillStyle = s.accent
  ctx.font = 'bold 26px sans-serif'
  ctx.fillText('오운완 · 오늘 운동 완료', cx, 150)

  // emblem
  ctx.font = '140px sans-serif'
  ctx.fillText(s.emoji, cx, 320)

  // headline
  ctx.fillStyle = '#F1F5F9'
  ctx.font = 'bold 52px sans-serif'
  ctx.fillText('오늘도 해냈어요', cx, 410)

  // subline
  const streak = flexStreak(state)
  const d = new Date(state.today)
  ctx.fillStyle = '#A7B4C2'
  ctx.font = '28px sans-serif'
  ctx.fillText(`${d.getMonth() + 1}월 ${d.getDate()}일 · ${state.profile.name}님은 ${streak}일째 걷는 사람`, cx, 462)

  // stats
  const stats = [
    [steps.toLocaleString(), '걸음'],
    [stepsToKm(steps).toFixed(1), 'km'],
    [String(briskMinutes(state)), '활기찬 분'],
  ]
  const colW = (W - 160) / 3
  stats.forEach(([v, label], i) => {
    const x = 80 + colW * i + colW / 2
    ctx.fillStyle = '#F1F5F9'
    ctx.font = 'bold 48px sans-serif'
    ctx.fillText(v, x, 600)
    ctx.fillStyle = '#64748B'
    ctx.font = '24px sans-serif'
    ctx.fillText(label, x, 640)
  })

  // flavor
  ctx.fillStyle = s.accent
  ctx.font = 'bold 30px sans-serif'
  ctx.fillText(`${s.emoji} 꾸준함이 만든 하루`, cx, 730)

  // footer
  ctx.fillStyle = '#64748B'
  ctx.font = '24px sans-serif'
  ctx.fillText('STRIDE · 함께 걷는 습관', cx, 810)

  return canvas
}

function hexA(hex, a) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function flexStreak(state) {
  // lightweight inline copy to avoid a circular import
  const goal = state.profile.dailyGoal
  let streak = 0
  let miss = 0
  for (let i = 0; i < 60; i++) {
    const d = new Date(state.today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const steps = i === 0 ? state.stepsToday : state.history[key] || 0
    if (steps >= goal) {
      streak++
      miss = 0
    } else if (i > 0) {
      miss++
      if (miss >= 2) break
    }
  }
  return streak
}

export async function shareCard(state, steps, style) {
  const canvas = renderCard(state, steps, style)
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return { ok: false }
  const file = new File([blob], 'stride-오운완.png', { type: 'image/png' })

  // Prefer native share sheet with the image file
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: '#오운완 오늘도 걸었어요 🚶 · STRIDE' })
      return { ok: true, mode: 'share' }
    } catch {
      /* user cancelled — fall through to download */
    }
  }
  // Fallback: download the PNG
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'stride-오운완.png'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return { ok: true, mode: 'download' }
}
