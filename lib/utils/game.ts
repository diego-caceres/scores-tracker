import { Game, GameType, Round } from '@/lib/types';

const PODRIDA_DECK_SIZE = 48;
const PODRIDA_START_CARDS = 3;

export function getGameType(game: Game): GameType {
  return game.type === 'podrida' ? 'podrida' : 'classic';
}

export function getGameTotals(game: Game): Record<string, number> {
  const totals: Record<string, number> = {};

  for (const player of game.players) {
    totals[player.id] = 0;
  }

  for (const round of game.rounds) {
    for (const entry of round.entries) {
      totals[entry.playerId] = entry.totalAfter;
    }
  }

  return totals;
}

export function getPodridaRounds(game: Game): Round[] {
  return game.rounds.filter((round) => round.type === 'podrida');
}

export function getPodridaMaxCards(playersCount: number): number {
  if (playersCount <= 0) {
    return 0;
  }

  return Math.floor(PODRIDA_DECK_SIZE / playersCount);
}

export function getPodridaCardsSequence(playersCount: number): number[] {
  const maxCards = getPodridaMaxCards(playersCount);

  if (maxCards <= 0) {
    return [];
  }

  const startCards = Math.min(PODRIDA_START_CARDS, maxCards);
  const ascending: number[] = [];
  const descending: number[] = [];

  for (let cards = startCards; cards <= maxCards; cards += 1) {
    ascending.push(cards);
  }

  for (let cards = maxCards - 1; cards >= 1; cards -= 1) {
    descending.push(cards);
  }

  return [...ascending, ...descending];
}

export function getNextPodridaCards(game: Game): number | null {
  const sequence = getPodridaCardsSequence(game.players.length);
  const nextCards = sequence[getPodridaRounds(game).length];
  return typeof nextCards === 'number' ? nextCards : null;
}

export function getGameDisplayName(game: Game): string {
  if (game.name) {
    return game.name;
  }

  const date = new Date(game.createdAt).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return `Partida ${date}`;
}
