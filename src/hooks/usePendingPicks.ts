import { useCallback, useEffect, useState } from 'react';
import {
  addPendingGame,
  AddPendingResult,
  getPendingGames,
  PendingGame,
  removePendingGame,
  subscribePendingGames,
} from '../data/ticketStore';

function sortedKey(numbers: number[]): string {
  return [...numbers].sort((a, b) => a - b).join(',');
}

export interface PendingPicksApi {
  pending: PendingGame[];
  pendingKeys: Set<string>;
  isSelected: (numbers: number[]) => boolean;
  toggleSelect: (numbers: number[], drawNo: number) => Promise<AddPendingResult | null>;
  reload: () => Promise<void>;
}

export function usePendingPicks(): PendingPicksApi {
  const [pending, setPending] = useState<PendingGame[]>([]);

  const reload = useCallback(async () => {
    try {
      const list = await getPendingGames();
      setPending(list);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    reload();
    const unsubscribe = subscribePendingGames(() => { reload(); });
    return () => unsubscribe();
  }, [reload]);

  const pendingKeys = new Set(pending.map(g => g.numbers.join(',')));

  const isSelected = useCallback(
    (numbers: number[]) => pendingKeys.has(sortedKey(numbers)),
    [pendingKeys],
  );

  const toggleSelect = useCallback(
    async (numbers: number[], drawNo: number): Promise<AddPendingResult | null> => {
      const key = sortedKey(numbers);
      const existing = pending.find(g => g.numbers.join(',') === key);
      if (existing) {
        await removePendingGame(existing.id);
        return null;
      }
      return addPendingGame(numbers, drawNo);
    },
    [pending],
  );

  return { pending, pendingKeys, isSelected, toggleSelect, reload };
}
