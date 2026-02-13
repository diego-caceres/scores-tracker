import {
  AppData,
  CreateGameInput,
  Game,
  PodridaBetsInput,
  PodridaRoundInput,
  RecentPlayer,
  RoundInput
} from '@/lib/types';

export interface GameRepository {
  getAppData(): Promise<AppData>;
  getGames(): Promise<Game[]>;
  getGameById(id: string): Promise<Game | undefined>;
  getRecentPlayers(limit?: number): Promise<RecentPlayer[]>;
  createGame(input: CreateGameInput): Promise<Game>;
  addRound(gameId: string, input: RoundInput): Promise<Game>;
  setPodridaBets(gameId: string, input: PodridaBetsInput): Promise<Game>;
  addPodridaRound(gameId: string, input: PodridaRoundInput): Promise<Game>;
  finishGame(gameId: string): Promise<Game>;
}
