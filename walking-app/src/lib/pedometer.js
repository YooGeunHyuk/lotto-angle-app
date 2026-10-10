/* ============================================================
   Pedometer — real accelerometer step detection for mobile PWA,
   with a graceful desktop/preview simulation fallback.
   ------------------------------------------------------------
   Mobile browsers expose DeviceMotion (accelerometer). We run a
   low-pass filter + adaptive peak detection to count steps. On
   desktop (no motion events) we simulate a realistic cadence so
   the whole app is testable in preview.
   ============================================================ */

export function needsMotionPermission() {
  return (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function'
  )
}

export async function requestMotionPermission() {
  if (needsMotionPermission()) {
    try {
      const res = await DeviceMotionEvent.requestPermission()
      return res === 'granted'
    } catch {
      return false
    }
  }
  return true
}

/**
 * createPedometer({ onStep }) → { start, stop, isSimulated }
 * onStep is called once per detected step.
 */
// Cadence heuristics (CADENCE-Adults, Tudor-Locke 2020):
// ~100 steps/min = moderate (3 METs), ~130 = vigorous (6 METs).
export const CADENCE_MODERATE = 100
export const CADENCE_VIGOROUS = 130

export function createPedometer({ onStep }) {
  let running = false
  let simTimer = null
  let motionHandler = null
  let simulated = false

  // Peak detection state
  let smoothed = 0
  let lastPeakAt = 0
  let goingUp = false
  let dynamicThreshold = 11.5 // ~gravity + walking bump (m/s^2 magnitude)

  // Rolling cadence (steps/min) from recent step intervals
  const stepTimes = []
  const emitStep = (now) => {
    stepTimes.push(now)
    if (stepTimes.length > 6) stepTimes.shift()
    let cadence = 0
    if (stepTimes.length >= 3) {
      const span = stepTimes[stepTimes.length - 1] - stepTimes[0]
      if (span > 0) cadence = ((stepTimes.length - 1) / span) * 60000
    }
    onStep(1, { cadence, brisk: cadence >= CADENCE_MODERATE })
  }

  const handleMotion = (e) => {
    const a = e.accelerationIncludingGravity
    if (!a || a.x == null) return
    const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
    // low-pass filter
    smoothed = smoothed * 0.8 + mag * 0.2
    const now = e.timeStamp || Date.now()

    // adapt threshold slowly toward the signal envelope
    dynamicThreshold = dynamicThreshold * 0.99 + smoothed * 0.01

    if (smoothed > dynamicThreshold + 0.6 && !goingUp) {
      goingUp = true
    } else if (smoothed < dynamicThreshold && goingUp) {
      goingUp = false
      // a full up-down cycle → candidate step, debounce ~280ms
      if (now - lastPeakAt > 280) {
        lastPeakAt = now
        emitStep(now)
      }
    }
  }

  function startSimulation() {
    simulated = true
    // realistic walking: ~110 steps/min = a step every ~545ms, jittered
    const tick = () => {
      if (!running) return
      emitStep(Date.now())
      const jitter = 480 + Math.floor(seededRandom() * 160)
      simTimer = setTimeout(tick, jitter)
    }
    simTimer = setTimeout(tick, 600)
  }

  return {
    async start() {
      if (running) return
      running = true
      const ok = await requestMotionPermission()
      if (ok && typeof window !== 'undefined' && 'ondevicemotion' in window) {
        // Probe: if no motion arrives in 1.2s, fall back to simulation.
        let gotMotion = false
        motionHandler = (e) => {
          gotMotion = true
          handleMotion(e)
        }
        window.addEventListener('devicemotion', motionHandler)
        setTimeout(() => {
          if (running && !gotMotion) {
            window.removeEventListener('devicemotion', motionHandler)
            motionHandler = null
            startSimulation()
          }
        }, 1200)
      } else {
        startSimulation()
      }
    },
    stop() {
      running = false
      if (motionHandler) {
        window.removeEventListener('devicemotion', motionHandler)
        motionHandler = null
      }
      if (simTimer) {
        clearTimeout(simTimer)
        simTimer = null
      }
    },
    get isSimulated() {
      return simulated
    },
  }
}

// Deterministic-ish jitter without Math.random dependency issues in some sandboxes
let _seed = 1234567
function seededRandom() {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff
  return _seed / 0x7fffffff
}

// Conversions
export const STEPS_PER_KM = 1350 // ~0.74m stride
export function stepsToKm(steps) {
  return steps / STEPS_PER_KM
}
export function stepsToKcal(steps, weightKg = 65) {
  // ~0.04 kcal per step scaled by weight
  return Math.round(steps * 0.04 * (weightKg / 65))
}
export function stepsToMinutes(steps) {
  return Math.round(steps / 110) // ~110 steps/min
}
