import {
  AppData,
  CreateGameInput,
  Game,
  NewPlayerInput,
  Player,
  RecentPlayer,
  Round,
  RoundInput
} from '@/lib/types';
import { createId } from '@/lib/utils/id';
import { GameRepository } from '@/lib/storage/repository';

const STORAGE_KEY = 'scores-recorder:v1';
const RECENT_LIMIT = 20;

const DEFAULT_DATA: AppData = {
  games: [],
  recentPlayers: []
};

function assertBrowser(): void {
  if (typeof window === 'undefined') {
    throw new Error('This repository requires a browser environment.');
  }
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function readData(): AppData {
  assertBrowser();
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return DEFAULT_DATA;
  }

  try {
    const parsed = JSON.parse(raw) as AppData;

    return {
      games: Array.isArray(parsed.games) ? parsed.games : [],
      recentPlayers: Array.isArray(parsed.recentPlayers) ? parsed.recentPlayers : []
    };
  } catch {
    return DEFAULT_DATA;
  }
}

function writeData(data: AppData): void {
  assertBrowser();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getTotals(game: Game): Record<string, number> {
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

function upsertRecentPlayers(existing: RecentPlayer[], players: Player[]): RecentPlayer[] {
  const map = new Map(existing.map((player) => [player.name.toLowerCase(), player]));
  const now = new Date().toISOString();

  for (const player of players) {
    const key = player.name.toLowerCase();
    const previous = map.get(key);

    map.set(key, {
      id: previous?.id ?? createId('recent_player'),
      name: player.name,
      color: player.color,
      lastUsedAt: now
    });
  }

  return [...map.values()]
    .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
    .slice(0, RECENT_LIMIT);
}

function toPlayers(inputPlayers: NewPlayerInput[]): Player[] {
  const seenNames = new Set<string>();
  const players: Player[] = [];

  for (const input of inputPlayers) {
    const name = normalizeName(input.name);

    if (!name) {
      continue;
    }

    const lowerName = name.toLowerCase();

    if (seenNames.has(lowerName)) {
      continue;
    }

    seenNames.add(lowerName);
    players.push({
      id: createId('player'),
      name,
      color: input.color || undefined
    });
  }

  return players;
}

export class LocalStorageGameRepository implements GameRepository {
  async getAppData(): Promise<AppData> {
    return readData();
  }

  async getGames(): Promise<Game[]> {
    const data = readData();
    return [...data.games].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getGameById(id: string): Promise<Game | undefined> {
    const data = readData();
    return data.games.find((game) => game.id === id);
  }

  async getRecentPlayers(limit = 8): Promise<RecentPlayer[]> {
    const data = readData();

    return [...data.recentPlayers]
      .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
      .slice(0, limit);
  }

  async createGame(input: CreateGameInput): Promise<Game> {
    const data = readData();
    const players = toPlayers(input.players);

    if (players.length < 2) {
      throw new Error('Debes ingresar al menos 2 jugadores.');
    }

    const now = new Date().toISOString();
    const game: Game = {
      id: createId('game'),
      name: input.name?.trim() || undefined,
      players,
      rounds: [],
      status: 'open',
      createdAt: now,
      updatedAt: now
    };

    const nextData: AppData = {
      games: [game, ...data.games],
      recentPlayers: upsertRecentPlayers(data.recentPlayers, players)
    };

    writeData(nextData);
    return game;
  }

  async addRound(gameId: string, input: RoundInput): Promise<Game> {
    const data = readData();
    const gameIndex = data.games.findIndex((game) => game.id === gameId);

    if (gameIndex < 0) {
      throw new Error('No se encontró la partida.');
    }

    const game = data.games[gameIndex];

    if (game.status === 'finished') {
      throw new Error('La partida está finalizada.');
    }

    const playerIds = new Set(game.players.map((player) => player.id));
    const currentTotals = getTotals(game);
    const entries: Round['entries'] = [];

    for (const [playerId, rawValue] of Object.entries(input.valuesByPlayerId)) {
      if (!playerIds.has(playerId)) {
        continue;
      }

      const value = Number(rawValue);

      if (Number.isNaN(value) || !Number.isFinite(value)) {
        continue;
      }

      const currentTotal = currentTotals[playerId] ?? 0;
      const nextTotal = input.mode === 'add' ? currentTotal + value : value;
      const delta = nextTotal - currentTotal;

      entries.push({
        playerId,
        delta,
        totalAfter: nextTotal
      });
    }

    if (entries.length === 0) {
      throw new Error('Ingresa al menos un puntaje para guardar la ronda.');
    }

    const now = new Date().toISOString();
    const round: Round = {
      id: createId('round'),
      createdAt: now,
      mode: input.mode,
      entries
    };

    const updatedGame: Game = {
      ...game,
      rounds: [...game.rounds, round],
      updatedAt: now
    };

    const games = [...data.games];
    games[gameIndex] = updatedGame;

    writeData({
      ...data,
      games
    });

    return updatedGame;
  }

  async finishGame(gameId: string): Promise<Game> {
    const data = readData();
    const gameIndex = data.games.findIndex((game) => game.id === gameId);

    if (gameIndex < 0) {
      throw new Error('No se encontró la partida.');
    }

    const game = data.games[gameIndex];

    if (game.status === 'finished') {
      return game;
    }

    const now = new Date().toISOString();
    const updatedGame: Game = {
      ...game,
      status: 'finished',
      finishedAt: now,
      updatedAt: now
    };

    const games = [...data.games];
    games[gameIndex] = updatedGame;

    writeData({
      ...data,
      games
    });

    return updatedGame;
  }
}
