// 팔레트 이미지 기반 컬러 세트
const PALETTE = [
  { bg: '#86E3CE', text: '#1D5C4E' }, // mint
  { bg: '#CCA8D6', text: '#4A2560' }, // lavender
  { bg: '#FFDD94', text: '#6B4E00' }, // yellow
  { bg: '#FA8F7B', text: '#7A1E0A' }, // coral
  { bg: '#D0EBA5', text: '#2E5A0A' }, // light green
  { bg: '#6CBCCA', text: '#0D3D4A' }, // teal
  { bg: '#F7C98B', text: '#6B3A00' }, // peach
  { bg: '#A0C385', text: '#254A14' }, // sage
  { bg: '#847AA3', text: '#FFFFFF' }, // purple
  { bg: '#5AC6CC', text: '#0A3D42' }, // cyan
  { bg: '#EF8557', text: '#5A1A00' }, // orange
  { bg: '#F5C5C7', text: '#7A2A30' }, // blush
  { bg: '#C797A6', text: '#FFFFFF' }, // rose
  { bg: '#80B9C5', text: '#0D3540' }, // steel blue
  { bg: '#FAC172', text: '#6B3A00' }, // warm yellow
];

export function ballBg(n: number): string {
  return PALETTE[(n - 1) % PALETTE.length].bg;
}

export function ballText(n: number): string {
  return PALETTE[(n - 1) % PALETTE.length].text;
}
