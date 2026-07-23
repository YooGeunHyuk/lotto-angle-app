import { useEffect, useRef, useState } from 'react'
import { loadKakao } from '../lib/kakaoMap.js'

/* Real Kakao map when a key is configured; otherwise renders `fallback`.
   When live, it also runs a Kakao Local keyword search ("<region> 맛집") and
   drops clustered markers — the real nationwide data pull. Props:
     center: { lat, lng }, keyword, places (for marker fallback), fallback node. */
export default function KakaoMap({ center, keyword = '맛집', fallback, onCount }) {
  const boxRef = useRef(null)
  const [status, setStatus] = useState('loading') // loading | ready | fallback

  useEffect(() => {
    let cancelled = false
    loadKakao()
      .then((kakao) => {
        if (cancelled || !boxRef.current) return
        const map = new kakao.maps.Map(boxRef.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: 4,
        })
        // current location marker
        new kakao.maps.Marker({ position: new kakao.maps.LatLng(center.lat, center.lng), map })

        // clusterer for search results
        const clusterer = new kakao.maps.MarkerClusterer({ map, averageCenter: true, minLevel: 5 })
        const ps = new kakao.maps.services.Places()
        ps.keywordSearch(
          keyword,
          (data, st) => {
            if (st === kakao.maps.services.Status.OK) {
              const markers = data.map(
                (d) => new kakao.maps.Marker({ position: new kakao.maps.LatLng(+d.y, +d.x) }),
              )
              clusterer.addMarkers(markers)
              onCount && onCount(data.length)
            }
          },
          { location: new kakao.maps.LatLng(center.lat, center.lng), radius: 1500, size: 15 },
        )
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('fallback')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'fallback') return fallback
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={boxRef} style={{ width: '100%', height: '100%' }} />
      {status === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-3)',
            fontSize: 12,
          }}
        >
          지도 불러오는 중…
        </div>
      )}
    </div>
  )
}
