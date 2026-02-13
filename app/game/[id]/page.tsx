'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { getGameRepository } from '@/lib/storage';
import { Game, GameType, Player, Round } from '@/lib/types';
import {
  getGameDisplayName,
  getGameTotals,
  getGameType,
  getPodridaCardsSequence,
  getNextPodridaCards,
  getPodridaMaxCards,
  getPodridaRounds
} from '@/lib/utils/game';

const DEFAULT_PLAYER_COLOR = '#2f8f6a';

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

function createPlayerValueMap(
  players: Player[],
  source?: Record<string, number>
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const player of players) {
    const sourceValue = source?.[player.id];
    values[player.id] = typeof sourceValue === 'number' ? String(sourceValue) : '';
  }

  return values;
}

function getRoundTotalsByPlayer(round: Round): Record<string, number> {
  const totalsByPlayerId: Record<string, number> = {};

  for (const entry of round.entries) {
    totalsByPlayerId[entry.playerId] = entry.totalAfter;
  }

  return totalsByPlayerId;
}

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const repository = useMemo(() => getGameRepository(), []);

  const [game, setGame] = useState<Game | null>(null);
  const [mode, setMode] = useState<'add' | 'set'>('add');
  const [values, setValues] = useState<Record<string, string>>({});
  const [podridaBets, setPodridaBets] = useState<Record<string, string>>({});
  const [podridaTotals, setPodridaTotals] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSavingRound, setIsSavingRound] = useState(false);
  const [isSavingPodridaBets, setIsSavingPodridaBets] = useState(false);
  const [isSavingPodridaRound, setIsSavingPodridaRound] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadGame() {
      try {
        const existingGame = await repository.getGameById(gameId);

        if (!isMounted) {
          return;
        }

        if (!existingGame) {
          setError('La partida no existe o fue eliminada.');
          return;
        }

        setGame(existingGame);
        setValues(createPlayerValueMap(existingGame.players));
        setPodridaTotals(createPlayerValueMap(existingGame.players));
        setPodridaBets(
          createPlayerValueMap(existingGame.players, existingGame.podridaState?.pendingBetsByPlayerId)
        );
      } catch (cause) {
        if (!isMounted) {
          return;
        }

        setError(cause instanceof Error ? cause.message : 'No se pudo cargar la partida.');
      }
    }

    void loadGame();

    return () => {
      isMounted = false;
    };
  }, [gameId, repository]);

  const gameType = useMemo(() => (game ? getGameType(game) : 'classic'), [game]);
  const totals = useMemo(() => (game ? getGameTotals(game) : {}), [game]);

  const ranking = useMemo(() => {
    if (!game) {
      return [];
    }

    return [...game.players].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));
  }, [game, totals]);

  const podridaRounds = useMemo(() => {
    if (!game) {
      return [];
    }

    return getPodridaRounds(game);
  }, [game]);

  const nextPodridaCards = useMemo(() => {
    if (!game || gameType !== 'podrida') {
      return null;
    }

    return getNextPodridaCards(game);
  }, [game, gameType]);

  const podridaMaxCards = useMemo(() => {
    if (!game || gameType !== 'podrida') {
      return null;
    }

    return getPodridaMaxCards(game.players.length);
  }, [game, gameType]);

  const totalPodridaRounds = useMemo(() => {
    if (!game || gameType !== 'podrida') {
      return 0;
    }

    return getPodridaCardsSequence(game.players.length).length;
  }, [game, gameType]);

  const remainingPodridaRounds = useMemo(() => {
    return Math.max(totalPodridaRounds - podridaRounds.length, 0);
  }, [totalPodridaRounds, podridaRounds.length]);

  const hasPendingPodridaBets = useMemo(() => {
    if (!game || gameType !== 'podrida') {
      return false;
    }

    const pendingBetsByPlayerId = game.podridaState?.pendingBetsByPlayerId ?? {};
    return game.players.every((player) => Number.isFinite(pendingBetsByPlayerId[player.id]));
  }, [game, gameType]);

  const handleValueChange = (playerId: string, rawValue: string) => {
    setValues((previous) => ({
      ...previous,
      [playerId]: rawValue
    }));
  };

  const handlePodridaBetsChange = (playerId: string, rawValue: string) => {
    setPodridaBets((previous) => ({
      ...previous,
      [playerId]: rawValue
    }));
  };

  const handlePodridaTotalsChange = (playerId: string, rawValue: string) => {
    setPodridaTotals((previous) => ({
      ...previous,
      [playerId]: rawValue
    }));
  };

  const clearValues = () => {
    if (!game) {
      return;
    }

    setValues(createPlayerValueMap(game.players));
  };

  const clearPodridaTotals = () => {
    if (!game) {
      return;
    }

    setPodridaTotals(createPlayerValueMap(game.players));
  };

  const handleAddRound = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!game) {
      return;
    }

    setError(null);
    setIsSavingRound(true);

    try {
      const valuesByPlayerId: Record<string, number> = {};

      for (const [playerId, value] of Object.entries(values)) {
        if (value.trim() === '') {
          continue;
        }

        valuesByPlayerId[playerId] = Number(value);
      }

      const updatedGame = await repository.addRound(game.id, {
        mode,
        valuesByPlayerId
      });

      setGame(updatedGame);
      setValues(createPlayerValueMap(updatedGame.players));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la ronda.');
    } finally {
      setIsSavingRound(false);
    }
  };

  const handleSavePodridaBets = async () => {
    if (!game) {
      return;
    }

    setError(null);
    setIsSavingPodridaBets(true);

    try {
      const betsByPlayerId: Record<string, number> = {};

      for (const player of game.players) {
        const value = podridaBets[player.id]?.trim() ?? '';

        if (!value) {
          throw new Error(`Debes ingresar la apuesta de ${player.name}.`);
        }

        betsByPlayerId[player.id] = Number(value);
      }

      const updatedGame = await repository.setPodridaBets(game.id, {
        betsByPlayerId
      });

      setGame(updatedGame);
      setPodridaBets(createPlayerValueMap(updatedGame.players, updatedGame.podridaState?.pendingBetsByPlayerId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron guardar las apuestas.');
    } finally {
      setIsSavingPodridaBets(false);
    }
  };

  const handleSavePodridaRound = async () => {
    if (!game) {
      return;
    }

    setError(null);
    setIsSavingPodridaRound(true);

    try {
      const totalsByPlayerId: Record<string, number> = {};

      for (const player of game.players) {
        const value = podridaTotals[player.id]?.trim() ?? '';

        if (!value) {
          throw new Error(`Debes ingresar el total acumulado de ${player.name}.`);
        }

        totalsByPlayerId[player.id] = Number(value);
      }

      const updatedGame = await repository.addPodridaRound(game.id, {
        totalsByPlayerId
      });

      setGame(updatedGame);
      setPodridaTotals(createPlayerValueMap(updatedGame.players));
      setPodridaBets(createPlayerValueMap(updatedGame.players, updatedGame.podridaState?.pendingBetsByPlayerId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la ronda de Podrida.');
    } finally {
      setIsSavingPodridaRound(false);
    }
  };

  const handleFinishGame = async () => {
    if (!game || game.status === 'finished') {
      return;
    }

    const shouldFinish = window.confirm('¿Seguro que quieres marcar esta partida como terminada?');

    if (!shouldFinish) {
      return;
    }

    setError(null);
    setIsFinishing(true);

    try {
      const updatedGame = await repository.finishGame(game.id);
      setGame(updatedGame);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo finalizar la partida.');
    } finally {
      setIsFinishing(false);
    }
  };

  if (error && !game) {
    return (
      <main className="page">
        <section className="panel">
          <p className="error">{error}</p>
          <Link href="/" className="secondary inline-btn">
            Volver al home
          </Link>
        </section>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="page">
        <section className="panel">
          <p>Cargando partida...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="panel">
        <div className="subsection-header">
          <div>
            <div className="game-title-line">
              <h1>{getGameDisplayName(game)}</h1>
              <span className="game-type-badge">{getGameTypeLabel(gameType)}</span>
            </div>
            <p>
              Estado: {game.status === 'open' ? 'Abierta' : 'Terminada'} · Rondas: {game.rounds.length}
            </p>
            <p>Creada: {formatDate(game.createdAt)}</p>
            {game.finishedAt && <p>Finalizada: {formatDate(game.finishedAt)}</p>}
          </div>

          <div className="row-actions">
            <Link href="/" className="secondary inline-btn">
              Volver al home
            </Link>
            <button
              type="button"
              className="danger"
              onClick={handleFinishGame}
              disabled={game.status === 'finished' || isFinishing}
            >
              {game.status === 'finished'
                ? 'Partida terminada'
                : isFinishing
                  ? 'Terminando...'
                  : 'Terminar partida'}
            </button>
          </div>
        </div>
      </section>

      {gameType === 'classic' && (
        <section className="panel">
          <h2>Totales actuales</h2>
          <ul className="ranking">
            {ranking.map((player, index) => (
              <li key={player.id} className="ranking-item">
                <div className="player-badge">
                  <span className="player-rank">{index + 1}.</span>
                  <span
                    className="player-name-tag"
                    style={{ backgroundColor: getPlayerColor(player.color) }}
                  >
                    {player.name}
                  </span>
                </div>
                <span className="score">{totals[player.id] ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {gameType === 'podrida' ? (
        <>
          <section className="panel">
            <h2>Podrida</h2>
            {podridaMaxCards !== null && (
              <p className="hint">
                Máximo por ronda: {podridaMaxCards} cartas ({game.players.length} jugadores, baraja de 48
                cartas) · Jugadas: {podridaRounds.length}/{totalPodridaRounds} · Quedan:{' '}
                {remainingPodridaRounds}
              </p>
            )}
            <div className="podrida-table-wrap">
              <table className="podrida-table compact">
                <thead>
                  <tr>
                    <th>Ronda</th>
                      {game.players.map((player) => (
                        <th key={`podrida-header-${player.id}`}>
                          <span
                            className="player-name-tag compact"
                            style={{ backgroundColor: getPlayerColor(player.color) }}
                          >
                            {player.name}
                          </span>
                          <small>Apuesta / Total</small>
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {podridaRounds.map((round, index) => {
                    const totalsByPlayerId = getRoundTotalsByPlayer(round);
                    const betsByPlayerId = round.betsByPlayerId ?? {};

                    return (
                      <tr key={round.id}>
                        <td>
                          <div className="podrida-cards-cell">
                            <span className="cards-pill">Cartas: {round.cardsCount ?? '-'}</span>
                            <small>Ronda {index + 1}</small>
                          </div>
                        </td>
                        {game.players.map((player) => (
                          <td key={`${round.id}-${player.id}`}>
                            <div className="podrida-cell-split">
                              <span className="podrida-metric bet">
                                <small>Apuesta</small>
                                <strong>{betsByPlayerId[player.id] ?? '-'}</strong>
                              </span>
                              <span className="podrida-metric total">
                                <small>Total</small>
                                <strong>{totalsByPlayerId[player.id] ?? '-'}</strong>
                              </span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}

                  {nextPodridaCards !== null && game.status === 'open' && (
                    <>
                      <tr className="podrida-input-row bets">
                        <td className="podrida-control-cell">
                          <div className="podrida-cards-cell">
                            <span className="cards-pill next">Cartas: {nextPodridaCards}</span>
                            <small>Apuestas Ronda {podridaRounds.length + 1}</small>
                          </div>
                          <button
                            type="button"
                            className="secondary podrida-row-action"
                            onClick={() => void handleSavePodridaBets()}
                            disabled={isSavingPodridaBets}
                          >
                            {isSavingPodridaBets ? 'Guardando...' : 'Guardar Apuestas'}
                          </button>
                        </td>
                        {game.players.map((player) => (
                          <td key={`bet-${player.id}`}>
                            <input
                              type="number"
                              inputMode="numeric"
                              step="1"
                              className="podrida-cell-input"
                              placeholder="Apuesta"
                              value={podridaBets[player.id] ?? ''}
                              onChange={(event) => handlePodridaBetsChange(player.id, event.target.value)}
                              disabled={game.status === 'finished'}
                            />
                          </td>
                        ))}
                      </tr>
                      <tr className="podrida-input-row totals">
                        <td className="podrida-control-cell">
                          <div className="podrida-cards-cell">
                            <span className="cards-pill">{nextPodridaCards}</span>
                            <small>Cerrar ronda</small>
                          </div>
                          <button
                            type="button"
                            className="primary podrida-row-action"
                            onClick={() => void handleSavePodridaRound()}
                            disabled={isSavingPodridaRound || !hasPendingPodridaBets}
                          >
                            {isSavingPodridaRound ? 'Guardando...' : 'Guardar Totales'}
                          </button>
                          <button
                            type="button"
                            className="secondary podrida-row-action soft"
                            onClick={clearPodridaTotals}
                          >
                            Limpiar
                          </button>
                        </td>
                        {game.players.map((player) => (
                          <td key={`total-${player.id}`}>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="any"
                              className="podrida-cell-input"
                              placeholder="Total"
                              value={podridaTotals[player.id] ?? ''}
                              onChange={(event) => handlePodridaTotalsChange(player.id, event.target.value)}
                              disabled={game.status === 'finished' || !hasPendingPodridaBets}
                            />
                          </td>
                        ))}
                      </tr>
                    </>
                  )}

                  {podridaRounds.length === 0 && nextPodridaCards === null && (
                    <tr>
                      <td colSpan={game.players.length + 1} className="podrida-empty-cell">
                        No hay más rondas disponibles en la secuencia.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {hasPendingPodridaBets && nextPodridaCards !== null && (
              <p className="hint">Apuestas guardadas. Completa los totales para cerrar la ronda actual.</p>
            )}

            {!hasPendingPodridaBets && nextPodridaCards !== null && (
              <p className="empty">Guarda primero las apuestas para habilitar la fila de totales.</p>
            )}

            {error && <p className="error">{error}</p>}
          </section>
        </>
      ) : (
        <>
          <section className="panel">
            <h2>Cargar nueva ronda</h2>
            <form className="stack" onSubmit={handleAddRound}>
              <label className="field">
                <span>Modo de carga</span>
                <select value={mode} onChange={(event) => setMode(event.target.value as 'add' | 'set')}>
                  <option value="add">Sumar valor a cada jugador</option>
                  <option value="set">Fijar total directo de cada jugador</option>
                </select>
              </label>

              <div className="stack-sm">
                {game.players.map((player) => {
                  const playerColor = getPlayerColor(player.color);
                  const rowStyle = {
                    '--round-player-color': playerColor
                  } as CSSProperties;

                  return (
                    <label key={player.id} className="round-entry-row" style={rowStyle}>
                      <span
                        className="player-name-tag field-player-tag"
                        style={{ backgroundColor: playerColor }}
                      >
                        {player.name}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder={mode === 'add' ? 'Ej: 5 o -2' : 'Ej: 23'}
                        value={values[player.id] ?? ''}
                        onChange={(event) => handleValueChange(player.id, event.target.value)}
                        disabled={game.status === 'finished'}
                      />
                    </label>
                  );
                })}
              </div>

              {error && <p className="error">{error}</p>}

              <div className="row-actions">
                <button type="submit" className="primary" disabled={isSavingRound || game.status === 'finished'}>
                  {isSavingRound ? 'Guardando...' : 'Guardar ronda'}
                </button>
                <button type="button" className="secondary" onClick={clearValues}>
                  Limpiar campos
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <h2>Historial de rondas</h2>
            {game.rounds.length === 0 ? (
              <p className="empty">Todavía no hay rondas cargadas.</p>
            ) : (
              <ul className="history-list">
                {[...game.rounds].reverse().map((round, index) => (
                  <li key={round.id} className="history-item">
                    <span className="history-date">{formatDate(round.createdAt)}</span>
                    <div className="history-header">
                      <strong>Ronda {game.rounds.length - index}</strong>
                    </div>
                    <p className="history-mode">Modo: {round.mode === 'add' ? 'Sumar' : 'Fijar total'}</p>
                    <div className="history-changes">
                      {round.entries.map((entry) => {
                        const player = game.players.find((current) => current.id === entry.playerId);
                        const playerName = player?.name ?? 'Jugador';
                        const playerColor = getPlayerColor(player?.color);

                        return (
                          <span key={`${round.id}-${entry.playerId}`} className="history-change">
                            <span
                              className="player-name-tag compact"
                              style={{ backgroundColor: playerColor }}
                            >
                              {playerName}
                            </span>
                            <strong>{entry.delta >= 0 ? `+${entry.delta}` : entry.delta}</strong>
                          </span>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

    </main>
  );
}
