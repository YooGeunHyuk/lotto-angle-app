import { buildTicket, saveTicket } from './ticketStore';

export interface RecommendedTicketSet {
  numbers: number[];
}

export async function saveRecommendedTicket(drawNo: number, sets: RecommendedTicketSet[]): Promise<number> {
  const games = sets.map(set => set.numbers);
  const ticket = buildTicket(drawNo, games, 'manual');

  if (ticket.games.length === 0) {
    throw new Error('NO_VALID_GAMES');
  }

  await saveTicket(ticket);
  return ticket.games.length;
}
