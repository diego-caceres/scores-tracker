'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { FiMoon, FiSun, FiTrash2 } from 'react-icons/fi';
import { getGameRepository } from '@/lib/storage';
import { Game, GameType, RecentPlayer } from '@/lib/types';
import { getGameDisplayName, getGameTotals, getGameType } from '@/lib/utils/game';

interface PlayerDraft {
  name: string;
  color: string;
  colorInput: string;
}

const DEFAULT_PLAYER_COLOR = '#2f8f6a';
const THEME_STORAGE_KEY = 'scores-recorder:theme';
type ThemeMode = 'light' | 'dark';

function getPreferredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  } catch {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemeMode): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors (private mode, quota, etc).
    }
  }
}

function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const shortHexMatch = /^#([0-9a-fA-F]{3})$/.exec(withHash);

  if (shortHexMatch) {
    const [r, g, b] = shortHexMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
    return withHash.toLowerCase();
  }

  return null;
}

function getPlayerColor(color?: string): string {
  return normalizeHexColor(color ?? '') ?? DEFAULT_PLAYER_COLOR;
}

function createPlayerDraft(name = '', color = DEFAULT_PLAYER_COLOR): PlayerDraft {
  const normalizedColor = getPlayerColor(color);

  return {
    name,
    color: normalizedColor,
    colorInput: normalizedColor
  };
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getGameTypeLabel(gameType: GameType): string {
  return gameType === 'podrida' ? 'Podrida' : 'Libre';
}

export default function HomePage() {
  const repository = useMemo(() => getGameRepository(), []);
  const [games, setGames] = useState<Game[]>([]);
  const [recentPlayers, setRecentPlayers] = useState<RecentPlayer[]>([]);
  const [gameName, setGameName] = useState('');
  const [gameType, setGameType] = useState<GameType>('classic');
  const [players, setPlayers] = useState<PlayerDraft[]>([
    createPlayerDraft(),
    createPlayerDraft()
  ]);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [allGames, recent] = await Promise.all([
      repository.getGames(),
      repository.getRecentPlayers(12)
    ]);

    setGames(allGames);
    setRecentPlayers(recent);
  }, [repository]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const preferredTheme = getPreferredTheme();
    applyTheme(preferredTheme);
    setTheme(preferredTheme);
  }, []);

  const openGames = useMemo(
    () => games.filter((game) => game.status === 'open'),
    [games]
  );

  const finishedGames = useMemo(
    () => games.filter((game) => game.status === 'finished'),
    [games]
  );

  const updatePlayerName = (index: number, value: string) => {
    setPlayers((previous) =>
      previous.map((player, currentIndex) =>
        currentIndex === index ? { ...player, name: value } : player
      )
    );
  };

  const updatePlayerColorFromPicker = (index: number, value: string) => {
    const normalized = getPlayerColor(value);

    setPlayers((previous) =>
      previous.map((player, currentIndex) =>
        currentIndex === index
          ? { ...player, color: normalized, colorInput: normalized }
          : player
      )
    );
  };

  const updatePlayerColorInput = (index: number, value: string) => {
    setPlayers((previous) =>
      previous.map((player, currentIndex) => {
        if (currentIndex !== index) {
          return player;
        }

        const normalized = normalizeHexColor(value);

        return {
          ...player,
          colorInput: value,
          color: normalized ?? player.color
        };
      })
    );
  };

  const commitPlayerColorInput = (index: number) => {
    setPlayers((previous) =>
      previous.map((player, currentIndex) => {
        if (currentIndex !== index) {
          return player;
        }

        const normalized = normalizeHexColor(player.colorInput);

        if (!normalized) {
          return {
            ...player,
            colorInput: player.color
          };
        }

        return {
          ...player,
          color: normalized,
          colorInput: normalized
        };
      })
    );
  };

  const removePlayer = (index: number) => {
    setPlayers((previous) => {
      if (previous.length <= 2) {
        return previous;
      }

      return previous.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const addRecentPlayer = (recent: RecentPlayer) => {
    setPlayers((previous) => {
      const alreadyExists = previous.some(
        (player) => player.name.trim().toLowerCase() === recent.name.toLowerCase()
      );

      if (alreadyExists) {
        return previous;
      }

      const replacementIndex = previous.findIndex((player) => !player.name.trim());

      if (replacementIndex >= 0) {
        return previous.map((player, index) =>
          index === replacementIndex
            ? createPlayerDraft(recent.name, recent.color || DEFAULT_PLAYER_COLOR)
            : player
        );
      }

      return [...previous, createPlayerDraft(recent.name, recent.color || DEFAULT_PLAYER_COLOR)];
    });
  };

  const addPlayerRow = () => {
    setPlayers((previous) => [...previous, createPlayerDraft()]);
  };

  const resetForm = () => {
    setGameName('');
    setGameType('classic');
    setPlayers([createPlayerDraft(), createPlayerDraft()]);
  };

  const handleCreateGame = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const game = await repository.createGame({
        name: gameName,
        type: gameType,
        players: players.map((player) => ({
          name: player.name,
          color: player.color
        }))
      });

      resetForm();
      await loadData();
      window.location.href = `/game/${game.id}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la partida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTheme = () => {
    setTheme((previousTheme) => {
      const nextTheme = previousTheme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      return nextTheme;
    });
  };

  const handleDeleteOpenGame = async (game: Game) => {
    const shouldDelete = window.confirm(
      `¿Seguro que quieres borrar la partida abierta "${getGameDisplayName(game)}"? Esta acción no se puede deshacer.`
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setDeletingGameId(game.id);

    try {
      await repository.deleteOpenGame(game.id);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo borrar la partida.');
    } finally {
      setDeletingGameId(null);
    }
  };

  return (
    <main className="page">
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      >
        {theme === 'dark' ? <FiSun size={16} aria-hidden /> : <FiMoon size={16} aria-hidden />}
        <span className="sr-only">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
      </button>

      <section className="hero">
        <h1>Scores Recorder</h1>
        <p>
          Crea partidas, registra rondas y consulta rápidamente tus juegos abiertos y cerrados.
        </p>
      </section>

      <section className="panel">
        <h2>Nueva partida</h2>
        <form className="stack" onSubmit={handleCreateGame}>
          <label className="field">
            <span>Nombre de partida (opcional)</span>
            <input
              placeholder="Ej: Truco del viernes"
              value={gameName}
              onChange={(event) => setGameName(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Tipo de partida</span>
            <select
              value={gameType}
              onChange={(event) => setGameType(event.target.value as GameType)}
            >
              <option value="classic">Partida libre</option>
              <option value="podrida">Podrida</option>
            </select>
          </label>

          <div className="subsection-header">
            <h3>Jugadores</h3>
            <button type="button" className="secondary" onClick={addPlayerRow}>
              + Agregar jugador
            </button>
          </div>

          <div className="stack-sm">
            {players.map((player, index) => (
              <div key={`draft-player-${index}`} className="player-row">
                <label className="field stretch">
                  <span>Nombre</span>
                  <input
                    required={index < 2}
                    placeholder={`Jugador ${index + 1}`}
                    value={player.name}
                    onChange={(event) => updatePlayerName(index, event.target.value)}
                  />
                </label>

                <div className="field player-tools-field">
                  <span>Color y acciones</span>
                  <div className="player-tools-row">
                    <input
                      type="color"
                      aria-label={`Color del jugador ${index + 1}`}
                      value={player.color}
                      onChange={(event) => updatePlayerColorFromPicker(index, event.target.value)}
                    />
                    <input
                      type="text"
                      className="hex-input"
                      placeholder="#2f8f6a"
                      aria-label={`Color HEX del jugador ${index + 1}`}
                      value={player.colorInput}
                      onChange={(event) => updatePlayerColorInput(index, event.target.value)}
                      onBlur={() => commitPlayerColorInput(index)}
                      autoCapitalize="off"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      className="danger icon-button"
                      onClick={() => removePlayer(index)}
                      aria-label={`Eliminar jugador ${index + 1}`}
                      title={`Eliminar jugador ${index + 1}`}
                    >
                      <FiTrash2 size={16} aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {recentPlayers.length > 0 && (
            <div className="field">
              <span>Jugadores recientes</span>
              <div className="chips">
                {recentPlayers.map((player) => (
                  <button
                    type="button"
                    key={player.id}
                    className="chip player-chip"
                    style={{ backgroundColor: getPlayerColor(player.color) }}
                    onClick={() => addRecentPlayer(player)}
                  >
                    {player.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="error">{error}</p>}

          <button type="submit" className="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear partida'}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="subsection-header">
          <h2>Partidas abiertas</h2>
          <span className="counter">{openGames.length}</span>
        </div>

        {openGames.length === 0 ? (
          <p className="empty">No hay partidas abiertas.</p>
        ) : (
          <ul className="game-list">
            {openGames.map((game) => {
              const totals = getGameTotals(game);
              const orderedPlayers = [...game.players].sort(
                (a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0)
              );

              return (
                <li key={game.id} className="game-item">
                  <div>
                    <div className="game-title-line">
                      <h3>{getGameDisplayName(game)}</h3>
                      <span className="game-type-badge">{getGameTypeLabel(getGameType(game))}</span>
                    </div>
                    <p>
                      {game.players.length} jugadores · {game.rounds.length} rondas · creada{' '}
                      {formatDate(game.createdAt)}
                    </p>
                    <p>
                      Lidera:{' '}
                      {orderedPlayers[0] ? (
                        <>
                          <span
                            className="player-name-tag compact"
                            style={{ backgroundColor: getPlayerColor(orderedPlayers[0].color) }}
                          >
                            {orderedPlayers[0].name}
                          </span>{' '}
                          ({totals[orderedPlayers[0].id] ?? 0})
                        </>
                      ) : (
                        '-'
                      )}
                    </p>
                    <div className="game-players-line">
                      {game.players.map((player) => (
                        <span
                          key={player.id}
                          className="player-name-tag compact"
                          style={{ backgroundColor: getPlayerColor(player.color) }}
                        >
                          {player.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="game-item-actions">
                    <Link href={`/game/${game.id}`} className="primary inline-btn">
                      Abrir
                    </Link>
                    <button
                      type="button"
                      className="danger game-delete-btn"
                      onClick={() => void handleDeleteOpenGame(game)}
                      disabled={deletingGameId === game.id}
                    >
                      {deletingGameId === game.id ? 'Borrando...' : 'Borrar'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="subsection-header">
          <h2>Partidas terminadas</h2>
          <span className="counter">{finishedGames.length}</span>
        </div>

        {finishedGames.length === 0 ? (
          <p className="empty">No hay partidas terminadas todavía.</p>
        ) : (
          <ul className="game-list">
            {finishedGames.map((game) => (
              <li key={game.id} className="game-item">
                <div>
                  <div className="game-title-line">
                    <h3>{getGameDisplayName(game)}</h3>
                    <span className="game-type-badge">{getGameTypeLabel(getGameType(game))}</span>
                  </div>
                  <p>
                    {game.players.length} jugadores · {game.rounds.length} rondas · finalizada{' '}
                    {game.finishedAt ? formatDate(game.finishedAt) : '-'}
                  </p>
                </div>
                <Link href={`/game/${game.id}`} className="secondary inline-btn">
                  Ver detalle
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
