/**
 * El recibidor de un juego: la lista de sus partidas.
 *
 * SE LLAMA `CluedoLobbyPage` Y YA NO ES SOLO DE CLUEDO. El nombre se conserva a
 * propósito en esta entrega: renombrar el fichero mientras hay otras sesiones
 * trabajando en el mismo directorio es la clase de cambio que se lleva por
 * delante el trabajo de otro sin aportar nada esta noche. Anotado para después.
 *
 * Lo que pinta sale de tres sitios y conviene saber de cuál:
 *   · La RUTA dice de qué juego es este recibidor (`/:juego`).
 *   · El manifiesto pone lo que es del juego y saben los tres paquetes.
 *   · `juegos/palabras.ts` pone los rótulos, que solo son del taller.
 *
 * Al abrir una partida se reproduce la cortinilla de SU juego —puertas de caoba
 * en la mansión, una losa de piedra en la tumba— y después se navega al taller.
 */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { GameStatus, GameSummary } from '../../../shared/types';
import { JUEGO_POR_DEFECTO, manifiestoDe, manifiestoSiExiste } from '../../../shared/juegos';
import * as api from '../api/client';
import { useAppStore } from '../state/store';
import TransicionDeEntrada from '../components/transition/TransicionDeEntrada';
import { useTemaDeJuego } from '../lib/tema';
import { palabrasDe } from '../juegos/palabras';
import '../styles/lobby.css';

/**
 * La clase CSS de cada estado. El RÓTULO no está aquí: lo pone cada juego, que
 * a lo que llama «misterio listo» la expedición lo llama «papiro escrito».
 */
const CLASE_DE_ESTADO: Record<GameStatus, string> = {
  draft: 'is-draft',
  generating: 'is-generating',
  ready: 'is-ready',
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

/**
 * Un resumen de partida que quizá diga de qué juego es.
 *
 * HOY NO LO DICE, y es la costura más visible que ha destapado el segundo
 * juego: `GameSummary` —lo que devuelve `GET /api/games`— no lleva el juego,
 * así que el recibidor de la Momia lista también los casos de CLUEDO, con los
 * rótulos de la Momia encima. Se ve mal y engaña.
 *
 * Hace falta un campo en `shared/types.ts` y rellenarlo en el listado del
 * servidor; ninguno de los dos ficheros es de esta sesión, así que va anotado
 * en el informe. Mientras tanto, el filtro de abajo está escrito para que
 * FUNCIONE SOLO en cuanto el campo exista, sin tocar nada más.
 */
type ResumenDePartida = GameSummary & { juego?: string };

/**
 * Las partidas de este juego.
 *
 * Lo que no lo dice SE ENSEÑA, y esa es la parte importante: si se escondiera
 * lo desconocido, el día que se añada el campo desaparecerían de la vista todas
 * las partidas antiguas —que no lo tienen— y quien las buscara las daría por
 * borradas. Es el mismo modo de fallo que ya está descrito en `db/store.ts` a
 * propósito de las partidas huérfanas.
 */
function partidasDe(games: GameSummary[], juego: string | undefined): GameSummary[] {
  /*
   * POR EL MANIFIESTO, que es lo que resuelve el hueco sin abrirlo de más.
   *
   * El filtro dejaba pasar toda partida sin `juego` declarado a CUALQUIER
   * recibidor, para no perder de vista las antiguas. El efecto era que las
   * partidas de CLUEDO de siempre salían también en el recibidor de la Momia,
   * vestidas de expedición: con sus rótulos, su ceremonia y un «¿Cerrar esta
   * expedición para siempre?» al borrarlas.
   *
   * `manifiestoDe(undefined)` cae en CLUEDO a propósito —es lo que mantiene
   * viva a la partida antigua—, así que resolver los dos lados por el
   * manifiesto las deja donde siempre debieron estar: en el recibidor de
   * CLUEDO, y solo en ese.
   */
  const cual = manifiestoDe(juego ?? JUEGO_POR_DEFECTO).id;
  /*
   * EL LADO DE LA PARTIDA, BLANDO, y aquí sí importa la diferencia.
   *
   * Esto recorre TODAS las partidas de la cuenta, y una cuenta puede tener
   * guardada una de un juego que este servidor no instala —lo normal el día que
   * haya un servidor por país—. Con la versión que revienta, esa sola partida
   * dejaría el recibidor en blanco: no se vería ninguna, ni siquiera las que sí
   * se pueden jugar.
   *
   * Sin manifiesto, `?.id` es `undefined` y no coincide con ningún recibidor,
   * así que la partida no aparece en ninguno. Que es lo correcto: no se puede
   * ofrecer entrar a algo que aquí no se sabe jugar.
   */
  return games.filter((g) => manifiestoSiExiste((g as ResumenDePartida).juego)?.id === cual);
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
  const todas = useAppStore((s) => s.games);
  const fetchGames = useAppStore((s) => s.fetchGames);
  const createGame = useAppStore((s) => s.createGame);

  // El recibidor ya viste el tema del juego: quien entra en la Momia no debe
  // ver un solo pantallazo de burdeos antes de llegar al taller.
  useTemaDeJuego(juego);
  const palabras = palabrasDe(juego).recibidor;
  const manifiestoDelRecibidor = manifiestoDe(juego ?? JUEGO_POR_DEFECTO);

  const games = partidasDe(todas, juego);

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
      .catch(() => setError(palabras.errorCargar))
      .finally(() => setLoading(false));
    return () => window.clearTimeout(errorTimer.current);
  }, [fetchGames, palabras.errorCargar]);

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
    [transitionActive, juego],
  );

  const handleTransitionComplete = useCallback(() => {
    if (destination.current) navigate(destination.current);
  }, [navigate]);

  const handleCreate = async () => {
    if (creating || transitionActive) return;
    setCreating(true);
    try {
      /*
       * SE MANDA EL JUEGO, y sin esto no había segundo juego posible: el
       * servidor guardaba la partida sin declarar a qué se juega, así que una
       * expedición de la Momia se preparaba y se jugaba como un CLUEDO, sin un
       * solo error por el camino. Se habría descubierto la noche de la velada.
       */
      const game = await createGame(undefined, juego);
      enterGame(game.id);
    } catch {
      showError(palabras.errorCrear);
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
      showError(palabras.errorBorrar);
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
          <p className="lobby-kicker mono-caps">{palabras.kicker}</p>
          <h1 className="lobby-title">{palabras.titulo}</h1>
          <p className="lobby-sub text-dim text-italic">{palabras.sub}</p>
        </div>
        <button
          className="btn btn--primary lobby-new"
          onClick={() => void handleCreate()}
          disabled={creating || transitionActive}
        >
          {creating ? palabras.creando : palabras.nueva}
        </button>
      </header>

      <div className="ornament-divider">
        <span aria-hidden="true">{palabrasDe(juego).ornamento}</span>
      </div>

      {loading ? (
        <p className="lobby-loading text-italic">{palabras.cargando}</p>
      ) : games.length === 0 ? (
        <div className="lobby-empty deco-frame deco-corners fade-up">
          <span className="lobby-empty-mark" aria-hidden="true">
            {palabras.vacioMarca}
          </span>
          <h2>{palabras.vacioTitulo}</h2>
          <p className="text-dim text-italic">{palabras.vacioTexto}</p>
          <button
            className="btn lobby-empty-btn"
            onClick={() => void handleCreate()}
            disabled={creating || transitionActive}
          >
            {palabras.vacioBoton}
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
              aria-label={palabras.abrirAria(game.name)}
              onClick={() => enterGame(game.id)}
              onKeyDown={(event) => onCardKey(event, game.id)}
            >
              <span className="case-tab mono-caps">
                {palabras.ficha} {String(index + 1).padStart(3, '0')}
              </span>
              <button
                className="case-delete"
                aria-label={palabras.borrarAria(game.name)}
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
              {/*
                * LOS CONTADORES SALEN DEL MANIFIESTO, no de una tupla de tres.
                *
                * Eran `suspectCount`, `roomCount` y `weaponCount` rotulados con
                * `palabras.contadores`, una tupla de EXACTAMENTE tres por juego.
                * Un juego con una cuarta categoria la tenia invisible y uno con
                * dos pintaba un cero con una etiqueta inventada.
                *
                * Ahora se recorren las categorias que el juego declara y la
                * etiqueta es su `plural`, que es donde vive esa palabra.
                */}
              <div className="case-counts mono-caps">
                {manifiestoDelRecibidor.categorias.map((cat, i) => (
                  <Fragment key={cat.id}>
                    {i > 0 && <i aria-hidden="true">·</i>}
                    <span>
                      <b>{game.entidades?.[cat.id] ?? 0}</b> {cat.plural}
                    </span>
                  </Fragment>
                ))}
              </div>
              <span className={`case-status mono-caps ${CLASE_DE_ESTADO[game.status]}`}>
                {palabras.estados[game.status]}
              </span>

              {confirmingId === game.id && (
                <div className="case-confirm" onClick={stopPropagation}>
                  <p className="case-confirm-text">{palabras.confirmarCierre}</p>
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

      <TransicionDeEntrada
        juego={juego}
        active={transitionActive}
        onComplete={handleTransitionComplete}
      />
    </div>
  );
}
