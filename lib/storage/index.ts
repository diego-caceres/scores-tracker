import { LocalStorageGameRepository } from '@/lib/storage/local-storage-repository';
import { GameRepository } from '@/lib/storage/repository';

let repository: GameRepository | null = null;

export function getGameRepository(): GameRepository {
  if (!repository) {
    // Future-friendly switch point: replace this with cloud repository when needed.
    repository = new LocalStorageGameRepository();
  }

  return repository;
}
