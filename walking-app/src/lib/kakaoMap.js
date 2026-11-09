/* Kakao Maps SDK loader — graceful.
   Loads the real Kakao Maps JS SDK when a key is configured and the network
   allows it. Under the offline artifact CSP (or with no key) it rejects, and
   the UI falls back to the mock map. No key is hardcoded — set one of:
     - Vite env:  VITE_KAKAO_MAP_KEY   (build time)
     - Runtime:   window.__KAKAO_KEY__ (e.g. injected by the host page)
   and register your domain in the Kakao Developers console. */

let loadPromise = null

export function getKakaoKey() {
  try {
    if (import.meta && import.meta.env && import.meta.env.VITE_KAKAO_MAP_KEY) {
      return import.meta.env.VITE_KAKAO_MAP_KEY
    }
  } catch {
    /* import.meta not available */
  }
  if (typeof window !== 'undefined' && window.__KAKAO_KEY__) return window.__KAKAO_KEY__
  return ''
}

export function loadKakao() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no-window'))
  if (window.kakao && window.kakao.maps && window.kakao.maps.Map) return Promise.resolve(window.kakao)
  const key = getKakaoKey()
  if (!key) return Promise.reject(new Error('no-key'))
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    let settled = false
    const done = (fn, arg) => {
      if (settled) return
      settled = true
      fn(arg)
    }
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      key,
    )}&autoload=false&libraries=services,clusterer`
    script.async = true
    script.onload = () => {
      try {
        window.kakao.maps.load(() => done(resolve, window.kakao))
      } catch (e) {
        done(reject, e)
      }
    }
    script.onerror = () => done(reject, new Error('load-failed'))
    // CSP-blocked or offline: neither onload nor onerror may fire — time out.
    setTimeout(() => done(reject, new Error('timeout')), 4500)
    document.head.appendChild(script)
  })
  return loadPromise
}
