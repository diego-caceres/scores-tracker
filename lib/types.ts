export type GameStatus = 'open' | 'finished';
export type GameType = 'classic' | 'podrida';

export interface Player {
  id: string;
  name: string;
  color?: string;
}

export interface RoundEntry {
  playerId: string;
  delta: number;
  totalAfter: number;
}

export interface Round {
  id: string;
  createdAt: string;
  mode: 'add' | 'set';
  entries: RoundEntry[];
  type?: 'classic' | 'podrida';
  cardsCount?: number;
  betsByPlayerId?: Record<string, number>;
}

export interface PodridaState {
  pendingBetsByPlayerId?: Record<string, number>;
}

export interface Game {
  id: string;
  name?: string;
  type: GameType;
  players: Player[];
  rounds: Round[];
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
  podridaState?: PodridaState;
}

export interface RecentPlayer {
  id: string;
  name: string;
  color?: string;
  lastUsedAt: string;
}

export interface AppData {
  games: Game[];
  recentPlayers: RecentPlayer[];
}

export interface NewPlayerInput {
  name: string;
  color?: string;
}

export interface CreateGameInput {
  name?: string;
  players: NewPlayerInput[];
  type?: GameType;
}

export interface RoundInput {
  mode: 'add' | 'set';
  valuesByPlayerId: Record<string, number>;
}

export interface PodridaBetsInput {
  betsByPlayerId: Record<string, number>;
}

export interface PodridaRoundInput {
  totalsByPlayerId: Record<string, number>;
}
