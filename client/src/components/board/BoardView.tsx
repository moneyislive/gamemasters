/**
 * BoardView — el plano del misterio.
 *  - Modo 'generated': tablero SVG estilo CLUEDO dibujado desde `game.board`.
 *  - Modo 'aerial': la fotografía cenital del espacio real con chinchetas.
 */
import { useState } from 'react';
import { useAppStore } from '../../state/store';
import './board.css';

/** Lado de cada celda de la rejilla, en unidades del viewBox. */
const CELDA = 40;

export default function BoardView(): JSX.Element {
  const game = useAppStore((s) => s.game);
  const [recalculando, setRecalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!game) return <div className="board-panel" />;

  const recalcular = async (): Promise<void> => {
    setRecalculando(true);
    setError(null);
    try {
      await useAppStore.getState().regenerateBoard();
    } catch {
      setError('No se pudo construir el tablero. Revisa la conexión con el servidor.');
    } finally {
      setRecalculando(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Modo aéreo                                                          */
  /* ------------------------------------------------------------------ */

  if (game.boardMode === 'aerial') {
    const conChincheta = game.rooms.filter((sala) => sala.pin);

    if (!game.boardImageUrl) {
      return (
        <div className="board-panel">
          <div className="board-empty">
            <PlanoDecorativo />
            <h3>Todavía no hay plano</h3>
            <p className="text-dim text-italic">
              Has elegido jugar sobre el espacio real. Sube la fotografía aérea desde la pestaña de
              salas y clava una chincheta en cada estancia.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="board-panel">
        <div className="board-head">
          <h3>{game.name}</h3>
          <span className="mono-caps text-dim">
            {conChincheta.length} {conChincheta.length === 1 ? 'sala' : 'salas'} sobre el plano real
          </span>
        </div>

        <div className="board-aerial">
          <img src={game.boardImageUrl} alt="Vista aérea del espacio de juego" />
          {conChincheta.map((sala, indice) => (
            <div
              key={sala.id}
              className="board-pin"
              style={{ left: `${(sala.pin?.x ?? 0) * 100}%`, top: `${(sala.pin?.y ?? 0) * 100}%` }}
            >
              <span className="board-pin-label">{sala.name}</span>
              <span className="board-pin-badge">{indice + 1}</span>
            </div>
          ))}
        </div>

        {conChincheta.length > 0 ? (
          <ol className="board-aerial-legend">
            {conChincheta.map((sala, indice) => (
              <li key={sala.id}>
                <span className="board-aerial-num">{indice + 1}</span>
                <span>{sala.name}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="board-hint text-dim">
            Aún no has clavado ninguna chincheta. Vuelve a la pestaña de salas y haz clic sobre la
            fotografía.
          </p>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Modo generado                                                       */
  /* ------------------------------------------------------------------ */

  const board = game.board;

  if (!board || board.rooms.length === 0) {
    return (
      <div className="board-panel">
        <div className="board-empty">
          <PlanoDecorativo />
          <h3>El plano está por trazar</h3>
          <p className="text-dim text-italic">
            {game.rooms.length === 0
              ? 'Añade primero algunas salas: el arquitecto necesita saber qué estancias tiene la mansión.'
              : 'Traza el plano de la mansión y descubre por dónde discurren los pasadizos secretos.'}
          </p>
          <button
            className="btn btn--primary"
            onClick={() => void recalcular()}
            disabled={recalculando || game.rooms.length === 0}
          >
            {recalculando ? 'Trazando…' : 'Construir tablero'}
          </button>
          {error && <p className="board-error">{error}</p>}
        </div>
      </div>
    );
  }

  const ancho = board.grid.cols * CELDA;
  const alto = board.grid.rows * CELDA;
  const nombrePorId = new Map(game.rooms.map((sala) => [sala.id, sala.name]));

  const centros = new Map<string, { cx: number; cy: number }>();
  for (const colocacion of board.rooms) {
    centros.set(colocacion.roomId, {
      cx: (colocacion.x + colocacion.w / 2) * CELDA,
      cy: (colocacion.y + colocacion.h / 2) * CELDA,
    });
  }

  // Bloque central decorativo (escaleras).
  const centro = {
    x: Math.round(board.grid.cols * 0.29) * CELDA,
    y: Math.round(board.grid.rows * 0.33) * CELDA,
    w: Math.round(board.grid.cols * 0.42) * CELDA,
    h: Math.round(board.grid.rows * 0.34) * CELDA,
  };

  return (
    <div className="board-panel">
      <svg className="board-svg" viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Plano del tablero">
        <defs>
          <pattern id="bv-parquet" width="26" height="26" patternUnits="userSpaceOnUse">
            <rect width="26" height="26" fill="#2b1a12" />
            <rect width="26" height="13" fill="#34211a" />
            <line x1="0" y1="13" x2="26" y2="13" stroke="rgba(0,0,0,0.38)" strokeWidth="1" />
            <line x1="13" y1="0" x2="13" y2="13" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
            <line x1="0" y1="26" x2="26" y2="26" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
          </pattern>

          <radialGradient id="bv-tapete" cx="50%" cy="44%" r="74%">
            <stop offset="0%" stopColor="#1d4a32" />
            <stop offset="70%" stopColor="#123122" />
            <stop offset="100%" stopColor="#0a1c13" />
          </radialGradient>
        </defs>

        {/* Tapete y marco art-decó */}
        <rect width={ancho} height={alto} fill="url(#bv-tapete)" />
        <rect
          x="9"
          y="9"
          width={ancho - 18}
          height={alto - 18}
          fill="none"
          stroke="var(--gold-500, #c9a227)"
          strokeWidth="3"
        />
        <rect
          x="20"
          y="20"
          width={ancho - 40}
          height={alto - 40}
          fill="none"
          stroke="rgba(201,162,39,0.35)"
          strokeWidth="1.2"
        />

        {/* Rejilla sutil del pasillo */}
        <g opacity="0.14">
          {Array.from({ length: board.grid.cols - 1 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={(i + 1) * CELDA}
              y1={20}
              x2={(i + 1) * CELDA}
              y2={alto - 20}
              stroke="#e8cf7f"
              strokeWidth="0.5"
            />
          ))}
          {Array.from({ length: board.grid.rows - 1 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={20}
              y1={(i + 1) * CELDA}
              x2={ancho - 20}
              y2={(i + 1) * CELDA}
              stroke="#e8cf7f"
              strokeWidth="0.5"
            />
          ))}
        </g>

        {/* Bloque central */}
        <g>
          <rect
            x={centro.x}
            y={centro.y}
            width={centro.w}
            height={centro.h}
            rx="7"
            fill="#4a1622"
            stroke="#c9a227"
            strokeWidth="2.5"
          />
          <rect
            x={centro.x + 10}
            y={centro.y + 10}
            width={centro.w - 20}
            height={centro.h - 20}
            rx="4"
            fill="none"
            stroke="rgba(232,207,127,0.4)"
            strokeWidth="1"
          />
          <circle
            cx={centro.x + centro.w / 2}
            cy={centro.y + centro.h / 2 - 36}
            r="15"
            fill="none"
            stroke="#e8cf7f"
            strokeWidth="2.4"
          />
          <line
            x1={centro.x + centro.w / 2 + 11}
            y1={centro.y + centro.h / 2 - 25}
            x2={centro.x + centro.w / 2 + 24}
            y2={centro.y + centro.h / 2 - 12}
            stroke="#e8cf7f"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <text
            className="board-center-label"
            x={centro.x + centro.w / 2}
            y={centro.y + centro.h / 2 + 20}
            textAnchor="middle"
            fontSize="20"
          >
            {board.centerLabel}
          </text>
        </g>

        {/* Pasadizos secretos */}
        {board.passages.map((pasadizo, indice) => {
          const a = centros.get(pasadizo.fromRoomId);
          const b = centros.get(pasadizo.toRoomId);
          if (!a || !b) return null;
          const desde = nombrePorId.get(pasadizo.fromRoomId) ?? '';
          const hasta = nombrePorId.get(pasadizo.toRoomId) ?? '';
          return (
            <g className="board-passage" key={`p${indice}`}>
              <title>{`Pasadizo secreto: ${desde} ⇄ ${hasta}`}</title>
              <line className="board-passage-hit" x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} />
              <line className="board-passage-line" x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} />
              <Espiral cx={a.cx} cy={a.cy} />
              <Espiral cx={b.cx} cy={b.cy} />
            </g>
          );
        })}

        {/* Salas */}
        {board.rooms.map((colocacion) => {
          const x = colocacion.x * CELDA;
          const y = colocacion.y * CELDA;
          const w = colocacion.w * CELDA;
          const h = colocacion.h * CELDA;
          const cx = x + w / 2;
          const cy = y + h / 2;
          const nombre = nombrePorId.get(colocacion.roomId) ?? 'Sala';
          const tamano = Math.max(11, Math.min(20, (w * 1.6) / Math.max(nombre.length, 6)));
          // La puerta se abre hacia el centro del tablero.
          const haciaDerecha = cx < ancho / 2;
          const puertaX = haciaDerecha ? x + w - 4 : x + 4;

          return (
            <g key={colocacion.roomId}>
              <rect
                x={x + 5}
                y={y + 5}
                width={w - 10}
                height={h - 10}
                rx="6"
                fill="url(#bv-parquet)"
                stroke="#c9a227"
                strokeWidth="2.5"
              />
              <rect
                x={x + 12}
                y={y + 12}
                width={w - 24}
                height={h - 24}
                rx="3"
                fill="none"
                stroke="rgba(201,162,39,0.3)"
                strokeWidth="1"
              />
              {/* Hueco de la puerta */}
              <rect x={puertaX - 3} y={cy - 16} width="8" height="32" fill="#123122" />

              <text
                className="board-room-name"
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize={tamano.toFixed(1)}
              >
                {nombre.toUpperCase()}
              </text>
              <g className="board-room-ornament">
                <line x1={cx - 26} y1={cy + 17} x2={cx - 6} y2={cy + 17} />
                <line x1={cx + 6} y1={cy + 17} x2={cx + 26} y2={cy + 17} />
                <path d={`M ${cx} ${cy + 13.5} l 3.4 3.5 -3.4 3.5 -3.4 -3.5 z`} />
              </g>
            </g>
          );
        })}

        {/* Placa con el nombre del caso */}
        <text className="board-plaque-text" x={ancho / 2} y={alto - 30} textAnchor="middle" fontSize="19">
          {game.name.toUpperCase()}
        </text>
      </svg>

      <div className="board-footer">
        <div>
          <p className="board-legend">
            <strong className="text-gold">{board.rooms.length}</strong> salas ·{' '}
            <strong className="text-gold">{board.passages.length}</strong>{' '}
            {board.passages.length === 1 ? 'pasadizo secreto' : 'pasadizos secretos'}
          </p>
          <p className="board-hint text-dim">
            Los trazos dorados discontinuos son pasadizos: cruzan la casa sin pasar por el pasillo.
          </p>
        </div>
        <button className="btn" onClick={() => void recalcular()} disabled={recalculando}>
          {recalculando ? 'Recalculando…' : 'Recalcular tablero'}
        </button>
      </div>

      {error && <p className="board-error">{error}</p>}
    </div>
  );
}

/** Espiral decorativa en cada boca de pasadizo. */
function Espiral({ cx, cy }: { cx: number; cy: number }): JSX.Element {
  return (
    <>
      <circle cx={cx} cy={cy} r="10" fill="#1f120c" stroke="#c9a227" strokeWidth="2" />
      <path
        className="board-passage-spiral"
        d={`M ${cx} ${cy - 5.5} A 5.5 5.5 0 1 1 ${cx - 5.5} ${cy} A 3.4 3.4 0 1 0 ${cx} ${cy + 3.4}`}
      />
    </>
  );
}

/** Ilustración tipográfica para los estados vacíos. */
function PlanoDecorativo(): JSX.Element {
  return (
    <svg className="board-empty-plan" viewBox="0 0 120 120" role="img" aria-label="Plano en blanco">
      <rect x="6" y="6" width="108" height="108" rx="6" fill="none" stroke="#c9a227" strokeWidth="2" />
      <rect x="16" y="16" width="34" height="30" fill="none" stroke="rgba(201,162,39,0.55)" strokeWidth="1.5" />
      <rect x="70" y="16" width="34" height="30" fill="none" stroke="rgba(201,162,39,0.55)" strokeWidth="1.5" />
      <rect x="16" y="74" width="34" height="30" fill="none" stroke="rgba(201,162,39,0.55)" strokeWidth="1.5" />
      <rect x="70" y="74" width="34" height="30" fill="none" stroke="rgba(201,162,39,0.55)" strokeWidth="1.5" />
      <line x1="33" y1="46" x2="33" y2="74" stroke="rgba(201,162,39,0.3)" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="87" y1="46" x2="87" y2="74" stroke="rgba(201,162,39,0.3)" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx="60" cy="60" r="13" fill="none" stroke="#e8cf7f" strokeWidth="2" />
      <line x1="69" y1="69" x2="80" y2="80" stroke="#e8cf7f" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
