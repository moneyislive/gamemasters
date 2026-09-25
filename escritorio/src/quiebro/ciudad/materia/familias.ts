/**
 * LAS FAMILIAS DE MATERIAL DEL MOBILIARIO: qué es cada pieza (hierro, madera, chapa, carrocería…), cómo
 * viaja en el vértice sin un byte nuevo, y el reparto del sombreador a un fichero por familia.
 *
 * ═══ EL ACABADO, EMPAQUETADO EN LOS DOS NÚMEROS DE HOY ═══
 *
 * El mobiliario ya lleva por vértice `aAcabado = [rugosidad, metal]` (`materiales.ts`). La familia y dos
 * marcas caben en las partes enteras, sin atributos nuevos:
 *
 *   aAcabado.x = familia + min(rugosidad, 0,999)
 *   aAcabado.y = 4·chaflán + 2·barniz + min(metal, 0,999)
 *
 * La familia 0 es lo LISO: con ella, x e y son la rugosidad y el metal de siempre, así que la tabla
 * `ACABADO` de `materiales.ts` sigue valiendo tal cual (y el tráfico del barrio, que la usa y queda
 * fuera, no cambia). Sólo el cromo, con metal 1,0, tiene que pasar a 0,999. Con 1,0 el decodificado es
 * METAL 0: `a.y − floor(a.y)` (y `fract`, la receta de N0) da 0, y el 1 que queda en la parte entera no se
 * lee como nada, porque no hay marca en el bit 0 (las marcas son 2 = barniz y 4 = chaflán; `marcas & 1`
 * no lo pregunta nadie). El cromo se pintaría como plástico, sin barniz y sin chaflán. `acabado()` ya lo
 * recorta a 0,999; la tabla `ACABADO` de `materiales.ts`, que no pasa por aquí, la cambia su dueño.
 *
 * `vAcabadoQ` tiene que ir `flat` (WebGL2 lo da): interpolado, un 10,0 puede llegar como 9,999 y la pieza
 * sería de otra familia. Es el mismo fallo que la semilla de la fachada, que se redondea a mano.
 *
 * ═══ UN FICHERO POR FAMILIA ═══
 *
 * Cada familia es una función `SuperficieQ superficieXQ(EntradaQ e)` en `familias/<nombre>.ts`, con dueño
 * propio en la ola 2 (MOBILIARIO, SUELO, FAROLAS-Y-PIEZAS, VEHICULOS). En la ola 1 todas son stubs que
 * devuelven su entrada. `superficieQ(familia, e)` reparte con `MATERIA_Q >= 1`; en N0 no reparte (el
 * prototipo subía el mobiliario de 461 a 560 instrucciones sólo por decodificarlas) y devuelve la
 * entrada. Y en N0 el que llama ni la llama ni decodifica: usa `rugYMetalQ(vAcabadoQ)` (la receta está en
 * la cabecera de `glsl.ts`).
 *
 * LA MARCA DE BARNIZ MANDA: una familia sólo devuelve `barniz > 0` si `e.acabado.barniz`. Sin la marca, el
 * lóbulo no puede cambiar nada: `verify:quiebro-materia` (g) pinta el coche de prueba sin la marca y sin
 * forzar nada, con el lóbulo y sin él, y exige los mismos píxeles.
 *
 * ═══ LO QUE SALE: `SuperficieQ` ═══
 *
 *   struct SuperficieQ { vec3 albedo; float rug; float metal; vec3 n; float barniz; float rugBarniz; vec3 emision; };
 *
 * `n` es la normal de MUNDO. `barniz` (0-1) y `rugBarniz` son la capa transparente de la pintura del
 * coche; `emision` es radiancia lineal que se suma. Las dos cosas NO las aplica el que llama: llama a
 * `recordarSuperficieQ(s)` y la materia las pone después de la luz (`retoque.ts`), así VEHICULOS sólo
 * rellena `familias/carroceria.ts` sin tocar el material del mobiliario.
 */
import { GLSL_FAMILIA_ALUMINIO } from './familias/aluminio';
import { GLSL_FAMILIA_CARROCERIA } from './familias/carroceria';
import { GLSL_FAMILIA_CAUCHO } from './familias/caucho';
import { GLSL_FAMILIA_CHAPA, GLSL_FAMILIA_CHAPA_ONDULADA } from './familias/chapa';
import { GLSL_FAMILIA_FOLLAJE } from './familias/follaje';
import { GLSL_FAMILIA_FUNDICION } from './familias/fundicion';
import { GLSL_FAMILIA_HIERRO } from './familias/hierro';
import { GLSL_FAMILIA_HORMIGON } from './familias/hormigon';
import { GLSL_FAMILIA_LISO } from './familias/liso';
import { GLSL_FAMILIA_LLANTA } from './familias/llanta';
import { GLSL_FAMILIA_MADERA } from './familias/madera';
import { GLSL_FAMILIA_PIEDRA } from './familias/piedra';
import { GLSL_FAMILIA_PLASTICO } from './familias/plastico';
import { GLSL_FAMILIA_VIADUCTO } from './familias/viaducto';

/** Las familias, con su número. El número viaja en la parte entera de `aAcabado.x`. */
export const FAMILIA = {
  liso: 0,
  hierro: 1,
  madera: 2,
  piedra: 3,
  hormigon: 4,
  caucho: 5,
  plastico: 6,
  chapa: 7,
  chapaOndulada: 8,
  fundicion: 9,
  llanta: 10,
  carroceria: 11,
  aluminio: 12,
  follaje: 13,
  viaducto: 14,
} as const;

export type NombreDeFamilia = keyof typeof FAMILIA;
export type NumeroDeFamilia = (typeof FAMILIA)[NombreDeFamilia];

/** Las marcas del acabado. */
export interface MarcasDelAcabado {
  /** La pieza tiene chaflanes (`Molde.cajaBiselada`): ahí se desconcha la pintura. */
  readonly chaflan?: boolean;
  /** La pintura lleva barniz (la carrocería). */
  readonly barniz?: boolean;
}

/** Lo más cerca de 1 que cabe en la parte fraccionaria sin tocar la entera. */
const CASI_UNO = 0.999;

/** Empaqueta el acabado de un vértice: `[x, y]` para `aAcabado`. Ver la cabecera. */
export function acabado(familia: NumeroDeFamilia, rugosidad: number, metal: number, marcas: MarcasDelAcabado = {}): [number, number] {
  const rug = Math.min(Math.max(rugosidad, 0), CASI_UNO);
  const met = Math.min(Math.max(metal, 0), CASI_UNO);
  return [familia + rug, 4 * (marcas.chaflan === true ? 1 : 0) + 2 * (marcas.barniz === true ? 1 : 0) + met];
}

/** Lo que el sombreador saca de `aAcabado` (el gemelo JS de `decodificarAcabadoQ`). */
export interface AcabadoDecodificado {
  readonly familia: number;
  readonly rugosidad: number;
  readonly metal: number;
  readonly chaflan: boolean;
  readonly barniz: boolean;
}

/** El gemelo JS de `decodificarAcabadoQ`: la misma cuenta, para comprobar la ida y vuelta. */
export function desempaquetarAcabado(x: number, y: number): AcabadoDecodificado {
  const fx = Math.floor(x);
  const fy = Math.floor(y);
  const marcas = fy | 0;
  return { familia: fx, rugosidad: x - fx, metal: y - fy, chaflan: (marcas & 4) !== 0, barniz: (marcas & 2) !== 0 };
}

/** Qué función GLSL pinta cada familia. El reparto de `superficieQ` sale de aquí. */
export const FUNCION_DE_LA_FAMILIA: Readonly<Record<NumeroDeFamilia, string>> = {
  0: 'superficieLisoQ',
  1: 'superficieHierroQ',
  2: 'superficieMaderaQ',
  3: 'superficiePiedraQ',
  4: 'superficieHormigonQ',
  5: 'superficieCauchoQ',
  6: 'superficiePlasticoQ',
  7: 'superficieChapaQ',
  8: 'superficieChapaOnduladaQ',
  9: 'superficieFundicionQ',
  10: 'superficieLlantaQ',
  11: 'superficieCarroceriaQ',
  12: 'superficieAluminioQ',
  13: 'superficieFollajeQ',
  14: 'superficieViaductoQ',
};

/** El texto de cada familia, en el orden de su número. */
const GLSL_DE_CADA_FAMILIA: readonly string[] = [
  GLSL_FAMILIA_LISO,
  GLSL_FAMILIA_HIERRO,
  GLSL_FAMILIA_MADERA,
  GLSL_FAMILIA_PIEDRA,
  GLSL_FAMILIA_HORMIGON,
  GLSL_FAMILIA_CAUCHO,
  GLSL_FAMILIA_PLASTICO,
  GLSL_FAMILIA_CHAPA,
  GLSL_FAMILIA_CHAPA_ONDULADA,
  GLSL_FAMILIA_FUNDICION,
  GLSL_FAMILIA_LLANTA,
  GLSL_FAMILIA_CARROCERIA,
  GLSL_FAMILIA_ALUMINIO,
  GLSL_FAMILIA_FOLLAJE,
  GLSL_FAMILIA_VIADUCTO,
];

/** Los tipos, la decodificación y lo que se recuerda para después de la luz. Va antes de las familias. */
const GLSL_TIPOS_DE_LA_SUPERFICIE = /* glsl */ `
struct SuperficieQ { vec3 albedo; float rug; float metal; vec3 n; float barniz; float rugBarniz; vec3 emision; };
struct AcabadoQ { int familia; float rug; float metal; bool chaflan; bool barniz; };
/* Lo que recibe una familia: el acabado del vértice, el color de entrada, la normal y la posición de
   MUNDO, y la UV del molde (metros). La huella del píxel está en pxMundoQ. */
struct EntradaQ { AcabadoQ acabado; vec3 albedo; vec3 n; vec3 p; vec2 uv; };
/* Lo que la materia pone después de la luz (ver recordarSuperficieQ y el lóbulo de retoque.ts). */
float barnizQ = 0.0;
float rugBarnizQ = 0.5;
vec3 emisionQ = vec3(0.0);
AcabadoQ decodificarAcabadoQ(vec2 a) {
  float fx = floor(a.x);
  float fy = floor(a.y);
  int marcas = int(fy);
  return AcabadoQ(int(fx), a.x - fx, a.y - fy, (marcas & 4) != 0, (marcas & 2) != 0);
}
/* N0: la rugosidad y el metal de cualquier familia, sin struct ni marcas (ver la cabecera de glsl.ts). */
vec2 rugYMetalQ(vec2 a) {
  return fract(a);
}
/* La superficie que no cambia nada: lo que devuelven las familias hasta que las rellene su dueño. */
SuperficieQ superficieNeutraQ(EntradaQ e) {
  return SuperficieQ(e.albedo, e.acabado.rug, e.acabado.metal, e.n, 0.0, 0.5, vec3(0.0));
}
/* Guarda el barniz y la emisión de una superficie para el lóbulo de después de la luz. */
void recordarSuperficieQ(SuperficieQ s) {
  barnizQ = s.barniz;
  rugBarnizQ = s.rugBarniz;
  emisionQ = s.emision;
}
`;

function repartoDeLasFamilias(): string {
  const ramas = Object.entries(FUNCION_DE_LA_FAMILIA)
    .filter(([n]) => n !== '0')
    .map(([n, f]) => `  if (familia == ${n}) return ${f}(e);`)
    .join('\n');
  return /* glsl */ `
/* El reparto. En N0 no se reparte: la entrada tal cual. */
SuperficieQ superficieQ(int familia, EntradaQ e) {
  #if MATERIA_Q >= 1
${ramas}
  return ${FUNCION_DE_LA_FAMILIA[0]}(e);
  #else
  return superficieNeutraQ(e);
  #endif
}
`;
}

/** Todo el GLSL de las familias: tipos, cada familia y el reparto. Lo pone `retoqueDeLaMateria`. */
export const GLSL_DE_LAS_FAMILIAS = `${GLSL_TIPOS_DE_LA_SUPERFICIE}${GLSL_DE_CADA_FAMILIA.join('')}${repartoDeLasFamilias()}`;
