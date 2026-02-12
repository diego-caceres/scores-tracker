export type GameStatus = 'open' | 'finished';

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
}

export interface Game {
  id: string;
  name?: string;
  players: Player[];
  rounds: Round[];
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
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
}

export interface RoundInput {
  mode: 'add' | 'set';
  valuesByPlayerId: Record<string, number>;
}
