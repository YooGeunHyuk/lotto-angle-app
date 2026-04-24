import AsyncStorage from '@react-native-async-storage/async-storage';
import { Draw } from './lottoData';

const KEY = 'user_draws';

export async function getUserDraws(): Promise<Draw[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveUserDraw(draw: Draw): Promise<void> {
  const existing = await getUserDraws();
  const filtered = existing.filter(d => d.drwNo !== draw.drwNo);
  filtered.push(draw);
  filtered.sort((a, b) => a.drwNo - b.drwNo);
  await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
}

export async function deleteUserDraw(drwNo: number): Promise<void> {
  const existing = await getUserDraws();
  await AsyncStorage.setItem(KEY, JSON.stringify(existing.filter(d => d.drwNo !== drwNo)));
}
