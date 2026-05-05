export interface ParsedLottoQr {
  drawNo: number;
  games: number[][];
  rawText: string;
}

function extractQueryValue(rawText: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = rawText.match(new RegExp(`[?&]${escapedKey}=([^&#]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function parseGameChunk(chunk: string): number[] | null {
  if (!/^\d{12}$/.test(chunk)) return null;

  const numbers = chunk.match(/\d{2}/g)?.map(Number) ?? [];
  if (numbers.length !== 6) return null;
  if (numbers.some(number => !Number.isInteger(number) || number < 1 || number > 45)) return null;
  if (new Set(numbers).size !== 6) return null;

  return numbers.sort((a, b) => a - b);
}

function parseWinQrValue(value: string): Pick<ParsedLottoQr, 'drawNo' | 'games'> | null {
  const normalized = value.trim();
  const drawMatch = normalized.match(/^0*(\d{3,4})/);
  if (!drawMatch) return null;

  const drawNo = Number(drawMatch[1]);
  if (!Number.isInteger(drawNo) || drawNo < 1) return null;

  const body = normalized.slice(drawMatch[0].length);
  const chunks = body.match(/\d{12}/g) ?? [];
  const games = chunks
    .map(parseGameChunk)
    .filter((game): game is number[] => Boolean(game))
    .slice(0, 5);

  if (games.length === 0) return null;
  return { drawNo, games };
}

function parseLooseText(rawText: string): Pick<ParsedLottoQr, 'drawNo' | 'games'> | null {
  const drawNo = Number(extractQueryValue(rawText, 'drwNo') ?? extractQueryValue(rawText, 'drawNo') ?? extractQueryValue(rawText, 'round'));
  if (!Number.isInteger(drawNo) || drawNo < 1) return null;

  const digitGroups = rawText.match(/\d{12}/g) ?? [];
  const games = digitGroups
    .map(parseGameChunk)
    .filter((game): game is number[] => Boolean(game))
    .slice(0, 5);

  if (games.length === 0) return null;
  return { drawNo, games };
}

export function parseLottoQr(rawText: string): ParsedLottoQr | null {
  const text = rawText.trim();
  if (!text) return null;

  const parsed = parseWinQrValue(extractQueryValue(text, 'v') ?? text) ?? parseLooseText(text);
  if (!parsed) return null;

  return {
    ...parsed,
    rawText: text,
  };
}
