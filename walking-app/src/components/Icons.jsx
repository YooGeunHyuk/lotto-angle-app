/* Minimal inline SVG icon set (stroke-based, currentColor). */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const IcHome = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><path {...S} d="M3 10.5 12 3l9 7.5" /><path {...S} d="M5 9.5V21h14V9.5" /></svg>
)
export const IcFlag = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><path {...S} d="M5 21V4" /><path {...S} d="M5 4h11l-2 4 2 4H5" /></svg>
)
export const IcUsers = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><circle {...S} cx="9" cy="8" r="3" /><path {...S} d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path {...S} d="M16 5.5a3 3 0 0 1 0 5.8" /><path {...S} d="M18 14.2c2 .8 3.5 2.6 3.5 5" /></svg>
)
export const IcSpark = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><path {...S} d="M12 3v3M12 18v3M3 12h3M18 12h3" /><path {...S} d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" /></svg>
)
export const IcUser = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><circle {...S} cx="12" cy="8" r="4" /><path {...S} d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
)
export const IcFire = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><path {...S} d="M12 3c1 3-1.5 4-1.5 6.5A2.5 2.5 0 0 0 13 12c.7-1 .5-2 .5-2 2 1.5 3 3.4 3 5.5a4.5 4.5 0 1 1-9 0C7.5 12 12 10 12 3Z" /></svg>
)
export const IcLeaf = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><path {...S} d="M4 20c8 0 16-4 16-16C10 4 4 10 4 20Z" /><path {...S} d="M4 20C8 14 12 11 18 8" /></svg>
)
export const IcHeart = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><path {...S} d="M12 20s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 7 3.5C19 15.6 12 20 12 20Z" /></svg>
)
export const IcBolt = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><path {...S} d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" /></svg>
)
export const IcRoute = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><circle {...S} cx="6" cy="18" r="2.5" /><circle {...S} cx="18" cy="6" r="2.5" /><path {...S} d="M8.5 18H14a3.5 3.5 0 0 0 0-7H10a3.5 3.5 0 0 1 0-7h5.5" /></svg>
)
export const IcLock = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><rect {...S} x="4" y="10" width="16" height="10" rx="2" /><path {...S} d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
)
export const IcCheck = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><path {...S} d="m5 12 4 4 10-10" /></svg>
)
export const IcMap = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><path {...S} d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path {...S} d="M9 4v14M15 6v14" /></svg>
)
export const IcPin = (p) => (
  <svg viewBox="0 0 24 24" className="ico" {...p}><path {...S} d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" /><circle {...S} cx="12" cy="10" r="2.5" /></svg>
)
