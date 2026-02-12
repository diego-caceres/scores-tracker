import { AppData, CreateGameInput, Game, RecentPlayer, RoundInput } from '@/lib/types';

export interface GameRepository {
  getAppData(): Promise<AppData>;
  getGames(): Promise<Game[]>;
  getGameById(id: string): Promise<Game | undefined>;
  getRecentPlayers(limit?: number): Promise<RecentPlayer[]>;
  createGame(input: CreateGameInput): Promise<Game>;
  addRound(gameId: string, input: RoundInput): Promise<Game>;
  finishGame(gameId: string): Promise<Game>;
}
