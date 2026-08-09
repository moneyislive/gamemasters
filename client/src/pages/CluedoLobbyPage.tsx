/**
 * CluedoLobbyPage — el recibidor de la mansión.
 * Lista los casos (partidas) de CLUEDO como expedientes, permite crear un
 * caso nuevo y borrar con confirmación discreta. Al entrar en un caso se
 * reproduce la transición de puertas y después se navega al estudio.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { GameStatus } from '../../../shared/types';
import * as api from '../api/client';
import { useAppStore } from '../state/store';
import CluedoTransition from '../components/transition/CluedoTransition';
import '../styles/lobby.css';

const STATUS_META: Record<GameStatus, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'is-draft' },
  generating: { label: 'Generando…', className: 'is-generating' },
  ready: { label: 'Misterio listo', className: 'is-ready' },
};

/** Fecha legible en español, p. ej. "12 de julio de 2026". */
function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function CluedoLobbyPage() {
  // De qué juego es este recibidor. Viene de la ruta, no de una constante.
  const { juego } = useParams<{ juego: string }>();
  const navigate = useNavigate();
  const games = useAppStore((s) => s.games);
  const fetchGames = useAppStore((s) => s.fetchGames);
  const createGame = useAppStore((s) => s.createGame);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transitionActive, setTransitionActive] = useState(false);

  /** Destino al que navegar cuando termine la transición. */
  const destination = useRef<string | null>(null);
  const errorTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    fetchGames()
      .catch(() => setError('No se pudieron cargar los casos. ¿Está el servidor en marcha?'))
      .finally(() => setLoading(false));
    return () => window.clearTimeout(errorTimer.current);
  }, [fetchGames]);

  const showError = useCallback((message: string) => {
    setError(message);
    window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setError(null), 4500);
  }, []);

  /** Activa la transición y deja preparada la ruta de destino. */
  const enterGame = useCallback(
    (gameId: string) => {
      if (transitionActive) return;
      destination.current = `/${juego}/${gameId}`;
      setTransitionActive(true);
    },
    [transitionActive],
  );

  const handleTransitionComplete = useCallback(() => {
    if (destination.current) navigate(destination.current);
  }, [navigate]);

  const handleCreate = async () => {
    if (creating || transitionActive) return;
    setCreating(true);
    try {
      const game = await createGame();
      enterGame(game.id);
    } catch {
      showError('No se pudo abrir un caso nuevo.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (gameId: string) => {
    setDeletingId(gameId);
    try {
      await api.deleteGame(gameId);
      await fetchGames();
    } catch {
      showError('No se pudo borrar el caso.');
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  const onCardKey = (event: KeyboardEvent<HTMLElement>, gameId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      enterGame(gameId);
    }
  };

  const stopPropagation = (event: MouseEvent<HTMLElement>) => event.stopPropagation();

  return (
    <div className="lobby">
      <div className="lobby-glow lobby-glow--left" aria-hidden="true" />
      <div className="lobby-glow lobby-glow--right" aria-hidden="true" />

      <header className="lobby-header">
        <div className="lobby-heading">
          <Link to="/" className="lobby-back mono-caps">
            ← Catálogo
          </Link>
          <p className="lobby-kicker mono-caps">El recibidor de la mansión</p>
          <h1 className="lobby-title">Casos de CLUEDO</h1>
          <p className="lobby-sub text-dim text-italic">
            Cada expediente es una velada: sospechosos, salas, armas y una trama a medida.
          </p>
        </div>
        <button
          className="btn btn--primary lobby-new"
          onClick={() => void handleCreate()}
          disabled={creating || transitionActive}
        >
          {creating ? 'Abriendo expediente…' : '✦ Nuevo caso'}
        </button>
      </header>

      <div className="ornament-divider">
        <span aria-hidden="true">❖</span>
      </div>

      {loading ? (
        <p className="lobby-loading text-italic">Encendiendo los candelabros…</p>
      ) : games.length === 0 ? (
        <div className="lobby-empty deco-frame deco-corners fade-up">
          <span className="lobby-empty-mark" aria-hidden="true">
            ?
          </span>
          <h2>Aún no hay casos abiertos</h2>
          <p className="text-dim text-italic">
            Pulse «Nuevo caso» y el mayordomo convocará a los sospechosos.
          </p>
          <button
            className="btn lobby-empty-btn"
            onClick={() => void handleCreate()}
            disabled={creating || transitionActive}
          >
            Abrir el primer expediente
          </button>
        </div>
      ) : (
        <motion.main
          className="case-grid"
          variants={listVariants}
          initial="hidden"
          animate="visible"
        >
          {games.map((game, index) => (
            <motion.article
              key={game.id}
              variants={itemVariants}
              className="case-card deco-frame"
              role="button"
              tabIndex={0}
              aria-label={`Abrir el caso ${game.name}`}
              onClick={() => enterGame(game.id)}
              onKeyDown={(event) => onCardKey(event, game.id)}
            >
              <span className="case-tab mono-caps">Caso nº {String(index + 1).padStart(3, '0')}</span>
              <button
                className="case-delete"
                aria-label={`Borrar el caso ${game.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmingId(game.id);
                }}
              >
                ✕
              </button>

              <h3 className="case-name">{game.name}</h3>
              <p className="case-date text-italic text-dim">
                Última actividad · {formatDate(game.updatedAt)}
              </p>
              <div className="case-counts mono-caps">
                <span>
                  <b>{game.suspectCount}</b> sospechosos
                </span>
                <i aria-hidden="true">·</i>
                <span>
                  <b>{game.roomCount}</b> salas
                </span>
                <i aria-hidden="true">·</i>
                <span>
                  <b>{game.weaponCount}</b> armas
                </span>
              </div>
              <span className={`case-status mono-caps ${STATUS_META[game.status].className}`}>
                {STATUS_META[game.status].label}
              </span>

              {confirmingId === game.id && (
                <div className="case-confirm" onClick={stopPropagation}>
                  <p className="case-confirm-text">¿Cerrar este caso para siempre?</p>
                  <div className="case-confirm-actions">
                    <button
                      className="btn btn--danger btn--sm"
                      disabled={deletingId === game.id}
                      onClick={() => void handleDelete(game.id)}
                    >
                      {deletingId === game.id ? 'Borrando…' : 'Sí, borrar'}
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => setConfirmingId(null)}
                    >
                      Conservar
                    </button>
                  </div>
                </div>
              )}
            </motion.article>
          ))}
        </motion.main>
      )}

      {error && <div className="lobby-toast">{error}</div>}

      <CluedoTransition active={transitionActive} onComplete={handleTransitionComplete} />
    </div>
  );
}
