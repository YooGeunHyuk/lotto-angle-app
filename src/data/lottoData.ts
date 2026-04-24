import rawData from '../../data/lotto_history.json';


export interface Draw {
  drwNo: number;
  drwNoDate: string;
  numbers: number[];
  bonus: number;
  isAuto?: boolean; // 🌟 이 줄을 꼭 추가해야 합니다! (?는 있을수도 있고 없을수도 있다는 뜻이에요)
}

export const allDraws: Draw[] = rawData as Draw[];

export function getFrequency(draws = allDraws): Record<number, number> {
  const freq: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) freq[n] = 0;
  draws.forEach(d => d.numbers.forEach(n => freq[n]++));
  return freq;
}

export function getGaps(draws = allDraws): Record<number, number> {
  const lastSeen: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) lastSeen[n] = 0;
  draws.forEach(d => d.numbers.forEach(n => { lastSeen[n] = d.drwNo; }));
  const latest = draws[draws.length - 1].drwNo;
  const gaps: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) gaps[n] = latest - lastSeen[n];
  return gaps;
}

export function getSeasonalFrequency(draws = allDraws): Record<string, Record<number, number>> {
  const seasons: Record<string, Record<number, number>> = { spring: {}, summer: {}, fall: {}, winter: {} };
  for (const s of Object.keys(seasons)) for (let n = 1; n <= 45; n++) seasons[s][n] = 0;
  draws.forEach(d => {
    const month = parseInt(d.drwNoDate.split('.')[1]);
    let s = 'winter';
    if (month >= 3 && month <= 5) s = 'spring';
    else if (month >= 6 && month <= 8) s = 'summer';
    else if (month >= 9 && month <= 11) s = 'fall';
    d.numbers.forEach(n => seasons[s][n]++);
  });
  return seasons;
}

export function getSumStats(draws = allDraws) {
  const sums = draws.map(d => d.numbers.reduce((a, b) => a + b, 0)).sort((a, b) => a - b);
  const total = sums.length;
  return {
    avg: Math.round(sums.reduce((a, b) => a + b, 0) / total),
    min: sums[0],
    max: sums[total - 1],
    p10: sums[Math.floor(total * 0.25)],
    p90: sums[Math.floor(total * 0.75)],
  };
}

export function getConsecutiveRate(draws = allDraws): number {
  let count = 0;
  draws.forEach(d => {
    const s = [...d.numbers].sort((a, b) => a - b);
    for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] === 1) { count++; break; }
  });
  return count / draws.length;
}

export function getOddEvenDistribution(draws = allDraws): Record<string, number> {
  const dist: Record<string, number> = {};
  draws.forEach(d => {
    const odd = d.numbers.filter(n => n % 2 !== 0).length;
    const key = `${odd}:${6 - odd}`;
    dist[key] = (dist[key] || 0) + 1;
  });
  return dist;
}

export const SEASON_NAMES: Record<string, string> = {
  spring: '봄', summer: '여름', fall: '가을', winter: '겨울',
};
