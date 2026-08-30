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

/**
 * Cuando no caben en las tablas fijas: una rejilla que crece.
 *
 * ═══ EL FALLO QUE ESTO CIERRA ═══
 *
 * La colocación era `huecos[indice % huecos.length]`, y ese `%` era una bomba
 * de relojería. Con diecisiete lugares, el decimoséptimo recibía EXACTAMENTE
 * las mismas coordenadas que el primero: dos salas dibujadas una encima de
 * otra, en silencio, sin un aviso ni un error. En el plano se ve una sola, y
 * quien mira cuenta dieciséis donde hay diecisiete.
 *
 * Diecisiete lugares es mucho para un misterio en una casa y es poco para casi
 * cualquier otra cosa. Un mundo de campaña con sus aldeas, sus cuevas y sus
 * caminos pasa de dieciséis sin despeinarse, y con el `%` habría descubierto el
 * problema mirando un plano que ya estaba mal.
 *
 * ═══ POR QUÉ NO SE CAMBIAN LAS TABLAS FIJAS ═══
 *
 * Porque están calibradas: los huecos amplios de 6×6 y los compactos de 5×5
 * componen el perímetro clásico, con esquinas primero y pasillo entre salas, y
 * eso se ve mejor que cualquier rejilla automática. Hasta dieciséis lugares no
 * cambia nada — ni un píxel, y el maestro de oro lo comprueba.
 *
 * A partir de ahí se tesela. Es más feo y es correcto, que en este orden es lo
 * que hace falta.
 */
function rejillaQueCrece(cuantos: number): { huecos: Hueco[]; cols: number; rows: number } {
  const LADO = 5;
  const PASO = LADO + 1; // una celda de pasillo entre lugares

  // Cuadrada o casi: es la que menos hueco desperdicia y la que mejor se lee.
  const columnas = Math.ceil(Math.sqrt(cuantos));
  const filas = Math.ceil(cuantos / columnas);

  const cols = columnas * PASO - 1;
  const rows = filas * PASO - 1;

  const huecos: Hueco[] = [];
  for (let i = 0; i < cuantos; i++) {
    huecos.push({
      x: (i % columnas) * PASO,
      y: Math.floor(i / columnas) * PASO,
      w: LADO,
      h: LADO,
    });
  }
  return { huecos, cols, rows };
}

/** Genera el BoardLayout determinista para las salas dadas. */
export function generateBoardLayout(
  rooms: Room[],
  /*
   * El rotulo del centro entra por parametro y no se lee aqui del manifiesto
   * para que este fichero siga siendo geometria pura: recibe lugares, devuelve
   * un plano, y no sabe de que juego es. Quien llama ya tiene la partida
   * delante y sabe preguntarselo.
   */
  rotuloCentral = 'ESCALERAS',
): BoardLayout {
  // Orden estable por id: mismo conjunto de salas → mismo tablero.
  const ordenadas = [...rooms].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  let huecos: Hueco[];
  let cols = COLS;
  let rows = ROWS;
  if (ordenadas.length <= HUECOS_AMPLIOS.length) {
    huecos = HUECOS_AMPLIOS;
  } else if (ordenadas.length <= HUECOS_COMPACTOS.length) {
    huecos = HUECOS_COMPACTOS;
  } else {
    const crecida = rejillaQueCrece(ordenadas.length);
    huecos = crecida.huecos;
    cols = crecida.cols;
    rows = crecida.rows;
  }

  /*
   * Sin el `%` de antes. Si algún día vuelve a faltar un hueco es mejor que se
   * note —el lugar se queda fuera del plano y salta a la vista— que dibujar dos
   * encima y que no se note nunca. Con la rejilla que crece no puede pasar:
   * siempre hay tantos huecos como lugares.
   */
  const colocaciones: BoardRoomPlacement[] = ordenadas.flatMap((sala, indice) => {
    const hueco = huecos[indice];
    return hueco ? [{ roomId: sala.id, x: hueco.x, y: hueco.y, w: hueco.w, h: hueco.h }] : [];
  });

  return {
    grid: { cols, rows },
    rooms: colocaciones,
    passages: calcularPasadizos(colocaciones),
    centerLabel: rotuloCentral,
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
