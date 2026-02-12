'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { getGameRepository } from '@/lib/storage';
import { Game } from '@/lib/types';
import { getGameDisplayName, getGameTotals } from '@/lib/utils/game';

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

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const repository = useMemo(() => getGameRepository(), []);

  const [game, setGame] = useState<Game | null>(null);
  const [mode, setMode] = useState<'add' | 'set'>('add');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSavingRound, setIsSavingRound] = useState(false);
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
        setValues(
          Object.fromEntries(existingGame.players.map((player) => [player.id, '']))
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

  const totals = useMemo(() => (game ? getGameTotals(game) : {}), [game]);

  const ranking = useMemo(() => {
    if (!game) {
      return [];
    }

    return [...game.players].sort(
      (a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0)
    );
  }, [game, totals]);

  const handleValueChange = (playerId: string, rawValue: string) => {
    setValues((previous) => ({
      ...previous,
      [playerId]: rawValue
    }));
  };

  const clearValues = () => {
    if (!game) {
      return;
    }

    setValues(Object.fromEntries(game.players.map((player) => [player.id, ''])));
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
      clearValues();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la ronda.');
    } finally {
      setIsSavingRound(false);
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
            <h1>{getGameDisplayName(game)}</h1>
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
    </main>
  );
}
