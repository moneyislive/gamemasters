/**
 * Generador determinista del tablero de CLUEDO.
 *
 * Coloca las salas alrededor del perímetro de una rejilla de 24×24 celdas,
 * como en el tablero clásico: esquinas primero, luego bordes, con pasillo
 * entre salas. El centro queda reservado para el bloque decorativo
 * "ESCALERAS". Los pasadizos secretos siguen el ratio clásico de Cluedo
 * (2 túneles por cada 9 salas) y conectan pares de salas diagonalmente
 * opuestas (máxima distancia entre centros) sin repetir sala.
 *
 * Determinista: las salas se ordenan por id antes de asignarles hueco, de
 * modo que la misma partida produce siempre el mismo tablero.
 */
import type { BoardLayout, BoardRoomPlacement, Room, SecretPassage } from '../../../shared/types';

const COLS = 24;
const ROWS = 24;

interface Hueco {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Huecos amplios (hasta 8 salas): esquinas de 6×6 y centros de borde de
 * 6×5 / 5×6, todos dentro del rango permitido 5×5–7×6. Orden: esquinas
 * primero (NO, NE, SE, SO), después los cuatro bordes.
 */
const HUECOS_AMPLIOS: Hueco[] = [
  { x: 0, y: 0, w: 6, h: 6 }, // esquina noroeste
  { x: 18, y: 0, w: 6, h: 6 }, // esquina noreste
  { x: 18, y: 18, w: 6, h: 6 }, // esquina sureste
  { x: 0, y: 18, w: 6, h: 6 }, // esquina suroeste
  { x: 9, y: 0, w: 6, h: 5 }, // borde norte
  { x: 19, y: 9, w: 5, h: 6 }, // borde este
  { x: 9, y: 19, w: 6, h: 5 }, // borde sur
  { x: 0, y: 9, w: 5, h: 6 }, // borde oeste
];

/**
 * Huecos compactos (5×5) para partidas con más de 8 salas: 12 posiciones
 * perimetrales (esquinas primero, luego dos por borde) y una reserva
 * interior para casos fuera de lo común.
 */
const HUECOS_COMPACTOS: Hueco[] = [
  { x: 0, y: 0, w: 5, h: 5 }, // esquina noroeste
  { x: 19, y: 0, w: 5, h: 5 }, // esquina noreste
  { x: 19, y: 19, w: 5, h: 5 }, // esquina sureste
  { x: 0, y: 19, w: 5, h: 5 }, // esquina suroeste
  { x: 6, y: 0, w: 5, h: 5 }, // norte A
  { x: 19, y: 6, w: 5, h: 5 }, // este A
  { x: 13, y: 19, w: 5, h: 5 }, // sur A
  { x: 0, y: 13, w: 5, h: 5 }, // oeste A
  { x: 13, y: 0, w: 5, h: 5 }, // norte B
  { x: 19, y: 13, w: 5, h: 5 }, // este B
  { x: 6, y: 19, w: 5, h: 5 }, // sur B
  { x: 0, y: 6, w: 5, h: 5 }, // oeste B
  // Reserva interior (solo se usa si hay más de 12 salas)
  { x: 6, y: 6, w: 5, h: 5 },
  { x: 13, y: 6, w: 5, h: 5 },
  { x: 13, y: 13, w: 5, h: 5 },
  { x: 6, y: 13, w: 5, h: 5 },
];

/** Genera el BoardLayout determinista para las salas dadas. */
export function generateBoardLayout(rooms: Room[]): BoardLayout {
  // Orden estable por id: mismo conjunto de salas → mismo tablero.
  const ordenadas = [...rooms].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const huecos = ordenadas.length <= HUECOS_AMPLIOS.length ? HUECOS_AMPLIOS : HUECOS_COMPACTOS;

  const colocaciones: BoardRoomPlacement[] = ordenadas.map((sala, indice) => {
    const hueco = huecos[indice % huecos.length];
    return { roomId: sala.id, x: hueco.x, y: hueco.y, w: hueco.w, h: hueco.h };
  });

  return {
    grid: { cols: COLS, rows: ROWS },
    rooms: colocaciones,
    passages: calcularPasadizos(colocaciones),
    centerLabel: 'ESCALERAS',
  };
}

/**
 * Pasadizos secretos: max(1, round(n·2/9)) túneles entre pares de salas
 * lo más alejadas posible (diagonalmente opuestas), sin repetir sala.
 */
function calcularPasadizos(colocaciones: BoardRoomPlacement[]): SecretPassage[] {
  const n = colocaciones.length;
  if (n < 2) return [];
  const objetivo = Math.max(1, Math.round((n * 2) / 9));

  interface Par {
    a: BoardRoomPlacement;
    b: BoardRoomPlacement;
    distancia: number;
  }

  const pares: Par[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = colocaciones[i];
      const b = colocaciones[j];
      const dx = a.x + a.w / 2 - (b.x + b.w / 2);
      const dy = a.y + a.h / 2 - (b.y + b.h / 2);
      pares.push({ a, b, distancia: Math.hypot(dx, dy) });
    }
  }

  // Mayor distancia primero; empates resueltos por id para mantener el determinismo.
  pares.sort(
    (p, q) =>
      q.distancia - p.distancia ||
      `${p.a.roomId}·${p.b.roomId}`.localeCompare(`${q.a.roomId}·${q.b.roomId}`),
  );

  const usadas = new Set<string>();
  const pasadizos: SecretPassage[] = [];
  for (const par of pares) {
    if (pasadizos.length >= objetivo) break;
    if (usadas.has(par.a.roomId) || usadas.has(par.b.roomId)) continue;
    usadas.add(par.a.roomId);
    usadas.add(par.b.roomId);
    pasadizos.push({ fromRoomId: par.a.roomId, toRoomId: par.b.roomId });
  }
  return pasadizos;
}
