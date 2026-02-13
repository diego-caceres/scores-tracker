import {
  AppData,
  CreateGameInput,
  Game,
  GameType,
  NewPlayerInput,
  Player,
  PodridaBetsInput,
  PodridaRoundInput,
  RecentPlayer,
  Round,
  RoundInput
} from '@/lib/types';
import { createId } from '@/lib/utils/id';
import { getNextPodridaCards, getPodridaMaxCards } from '@/lib/utils/game';
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

function getGameType(game: Game): GameType {
  return game.type === 'podrida' ? 'podrida' : 'classic';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumericRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  const output: Record<string, number> = {};

  for (const [key, rawValue] of Object.entries(value)) {
    const numericValue = Number(rawValue);

    if (Number.isFinite(numericValue)) {
      output[key] = numericValue;
    }
  }

  return output;
}

function normalizeRound(round: Round): Round {
  const mode = round.mode === 'set' ? 'set' : 'add';
  const entries = Array.isArray(round.entries) ? round.entries : [];
  const base: Round = {
    id: round.id,
    createdAt: round.createdAt,
    mode,
    entries
  };

  if (
    round.type === 'podrida' &&
    typeof round.cardsCount === 'number' &&
    Number.isFinite(round.cardsCount)
  ) {
    return {
      ...base,
      type: 'podrida',
      mode: 'set',
      cardsCount: round.cardsCount,
      betsByPlayerId: toNumericRecord(round.betsByPlayerId)
    };
  }

  return {
    ...base,
    type: 'classic'
  };
}

function normalizeGame(game: Game): Game {
  const type = getGameType(game);
  const rounds = Array.isArray(game.rounds) ? game.rounds.map(normalizeRound) : [];
  const pendingBetsByPlayerId = toNumericRecord(game.podridaState?.pendingBetsByPlayerId);

  return {
    ...game,
    type,
    rounds,
    podridaState:
      type === 'podrida'
        ? {
            pendingBetsByPlayerId
          }
        : undefined
  };
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
      games: Array.isArray(parsed.games) ? parsed.games.map((game) => normalizeGame(game)) : [],
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

    if (input.type === 'podrida' && getPodridaMaxCards(players.length) < 3) {
      throw new Error(
        'Con esta cantidad de jugadores no se puede iniciar Podrida (mínimo 3 cartas por jugador).'
      );
    }

    const now = new Date().toISOString();
    const game: Game = {
      id: createId('game'),
      name: input.name?.trim() || undefined,
      type: input.type === 'podrida' ? 'podrida' : 'classic',
      players,
      rounds: [],
      status: 'open',
      createdAt: now,
      updatedAt: now,
      podridaState:
        input.type === 'podrida'
          ? {
              pendingBetsByPlayerId: {}
            }
          : undefined
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
    const gameType = getGameType(game);

    if (game.status === 'finished') {
      throw new Error('La partida está finalizada.');
    }

    if (gameType !== 'classic') {
      throw new Error('Esta partida usa reglas especiales. Usa la carga de Podrida.');
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
      type: 'classic',
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

  async setPodridaBets(gameId: string, input: PodridaBetsInput): Promise<Game> {
    const data = readData();
    const gameIndex = data.games.findIndex((game) => game.id === gameId);

    if (gameIndex < 0) {
      throw new Error('No se encontró la partida.');
    }

    const game = data.games[gameIndex];

    if (game.status === 'finished') {
      throw new Error('La partida está finalizada.');
    }

    if (getGameType(game) !== 'podrida') {
      throw new Error('Solo las partidas de Podrida permiten apuestas por ronda.');
    }

    const nextCardsCount = getNextPodridaCards(game);

    if (nextCardsCount === null) {
      throw new Error('La secuencia de Podrida ya está completa.');
    }

    const betsByPlayerId: Record<string, number> = {};

    for (const player of game.players) {
      const betValue = Number(input.betsByPlayerId[player.id]);

      if (!Number.isFinite(betValue) || !Number.isInteger(betValue)) {
        throw new Error(`Debes ingresar una apuesta entera para ${player.name}.`);
      }

      betsByPlayerId[player.id] = betValue;
    }

    const now = new Date().toISOString();
    const updatedGame: Game = {
      ...game,
      updatedAt: now,
      podridaState: {
        pendingBetsByPlayerId: betsByPlayerId
      }
    };

    const games = [...data.games];
    games[gameIndex] = updatedGame;

    writeData({
      ...data,
      games
    });

    return updatedGame;
  }

  async addPodridaRound(gameId: string, input: PodridaRoundInput): Promise<Game> {
    const data = readData();
    const gameIndex = data.games.findIndex((game) => game.id === gameId);

    if (gameIndex < 0) {
      throw new Error('No se encontró la partida.');
    }

    const game = data.games[gameIndex];

    if (game.status === 'finished') {
      throw new Error('La partida está finalizada.');
    }

    if (getGameType(game) !== 'podrida') {
      throw new Error('Solo las partidas de Podrida usan este flujo de ronda.');
    }

    const nextCardsCount = getNextPodridaCards(game);

    if (nextCardsCount === null) {
      throw new Error('La secuencia de Podrida ya está completa.');
    }

    const pendingBetsByPlayerId = game.podridaState?.pendingBetsByPlayerId ?? {};
    const currentTotals = getTotals(game);
    const entries: Round['entries'] = [];
    const betsByPlayerId: Record<string, number> = {};

    for (const player of game.players) {
      const betValue = Number(pendingBetsByPlayerId[player.id]);
      const totalValue = Number(input.totalsByPlayerId[player.id]);

      if (!Number.isFinite(betValue) || !Number.isInteger(betValue)) {
        throw new Error(`Debes guardar primero la apuesta de ${player.name}.`);
      }

      if (!Number.isFinite(totalValue)) {
        throw new Error(`Debes ingresar el total acumulado de ${player.name}.`);
      }

      const currentTotal = currentTotals[player.id] ?? 0;
      const totalAfter = totalValue;

      entries.push({
        playerId: player.id,
        delta: totalAfter - currentTotal,
        totalAfter
      });

      betsByPlayerId[player.id] = betValue;
    }

    const now = new Date().toISOString();
    const round: Round = {
      id: createId('round'),
      createdAt: now,
      type: 'podrida',
      mode: 'set',
      cardsCount: nextCardsCount,
      betsByPlayerId,
      entries
    };

    const updatedGame: Game = {
      ...game,
      rounds: [...game.rounds, round],
      updatedAt: now,
      podridaState: {
        pendingBetsByPlayerId: {}
      }
    };

    const games = [...data.games];
    games[gameIndex] = updatedGame;

    writeData({
      ...data,
      games
    });

    return updatedGame;
  }

  async deleteOpenGame(gameId: string): Promise<void> {
    const data = readData();
    const gameIndex = data.games.findIndex((game) => game.id === gameId);

    if (gameIndex < 0) {
      throw new Error('No se encontró la partida.');
    }

    const game = data.games[gameIndex];

    if (game.status !== 'open') {
      throw new Error('Solo se pueden borrar partidas abiertas.');
    }

    const games = data.games.filter((currentGame) => currentGame.id !== gameId);

    writeData({
      ...data,
      games
    });
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
