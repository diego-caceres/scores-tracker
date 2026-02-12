import { Game } from '@/lib/types';

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
