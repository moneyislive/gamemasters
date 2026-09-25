/**
 * EL RETOQUE DE LA MATERIA: lo que un material de la ciudad pide para tener la materia.
 *
 *   parchear(m, RETOQUE_MUNDO, …, retoqueDeLaMateria(nivel), retoqueDelQueLaUsa)
 *
 * ═══ QUÉ PONE Y DÓNDE ═══
 *
 *   · Los defines `MATERIA_Q` (el nivel; 0 en lo lejano), `OCTAVAS_Q` (1/2/3/4) y `MICRO_Q` (0: el horno
 *     de la fase 2 no existe todavía; lo fija la ola 4, desde la primera compilación y por nivel).
 *   · Los uniformes compartidos `uRuidoQ` y `uVarianzaDelGranoQ` (`ruido.ts`).
 *   · Las declaraciones (`glsl.ts` y `familias.ts`) ANTES de `#include <dithering_pars_fragment>`, que en
 *     los materiales de three va justo después de `#include <common>`: quedan detrás de las de `mundo`
 *     (que van tras `common`) y DELANTE de las de quien la use, que las pone antes de
 *     `#include <lights_pars_begin>` (fachada, suelo, mobiliario). Quien quiera llamar a la materia desde
 *     otro sitio, que ponga su texto después de ése.
 *   · El preámbulo, que deriva (`GLSL_PREAMBULO_DE_LA_MATERIA`), justo ANTES de
 *     `#include <clipping_planes_fragment>`: el principio de `main`, en flujo uniforme. Antes y no después
 *     (el plan decía «después»): los retoques que descartan ponen su `if (…) discard;` DESPUÉS de ese
 *     `#include` —el fundido del detalle y el de lo lejano (`lejos.ts`, orden 5), los personajes—, y como
 *     se aplican más tarde que la materia (−5) quedarían pegados al ancla, ENTRE ella y el preámbulo: se
 *     derivaría después de un `discard` que no toman todos los píxeles del cuadro. Con «antes», todo lo
 *     que se aplique después queda detrás del preámbulo, y el propio recorte de three (que también
 *     descarta) va detrás. Delante sólo queda `vec4 diffuseColor = …`. Por qué importa aunque en el
 *     escritorio no se vea (D3D sigue corriendo el píxel descartado como ayudante y la derivada sale
 *     bien; un GLES de móvil no tiene por qué): la cabecera de `glsl.ts`, «el orden del preámbulo». Lo
 *     vigila `verify:quiebro-materia` (d) sobre el texto MONTADO de la ventana como la monta `abierta.ts`
 *     (fachada y mobiliario con `RETOQUE_DEL_FUNDIDO`, N1-N3) y de lo lejano real con su fundido: el
 *     fundido tiene que estar, y detrás del preámbulo.
 *   · El lóbulo de barniz y la emisión (`GLSL_BARNIZ_DE_LA_MATERIA`) antes de `#include <aomap_fragment>`:
 *     después de la luz, para todos.
 *
 * Orden −5: después de `mundo` (−10), antes de todo lo demás. Necesita `mundo` (`vPosMundoQ` y `pcgQ`), y
 * con `MATERIA_Q >= 1` en un `MeshStandardMaterial`, `entorno` (`cieloReflejadoQ`, para el barniz).
 *
 * ═══ EL NOMBRE LLEVA EL NIVEL ═══
 *
 * El nombre entra en la llave de caché de los programas (`parcheo.ts`): `materia-n2` y `materia-n3` dan
 * textos distintos, y si se llamaran igual dos materiales de niveles distintos compartirían programa. Lo
 * lejano es `materia-lejos`.
 */
import type { Retoque } from '../../atmosfera/parcheo';
import type { NivelDeLaCiudad } from '../tipos';
import { GLSL_DE_LAS_FAMILIAS } from './familias';
import { GLSL_BARNIZ_DE_LA_MATERIA, GLSL_DE_LA_MATERIA, GLSL_PREAMBULO_DE_LA_MATERIA } from './glsl';
import { UNIFORMES_DE_LA_MATERIA } from './ruido';

/** Las octavas de `fbmT` por nivel. */
export const OCTAVAS_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 1, 1: 2, 2: 3, 3: 4 };

/*
 * EL GASTO MÁXIMO DE LA MATERIA, por nivel: lo que cualquier material puede gastar A TRAVÉS de la materia
 * en un fragmento, contado en el peor camino sobre el texto resuelto (`verify:quiebro-materia`, b). Son
 * dos tablas de números, como toda `*_POR_NIVEL` (plan §5.2.7), y NO se llaman
 * `TOPE_DEL_SOMBREADOR_POR_NIVEL`: ese nombre es el de la tabla de CADA material, al lado de su fábrica,
 * con sus instrucciones de fxc (plan §5.2.9), que mira `verify:quiebro-gl`.
 *
 * En N0, a lo sumo 4 lecturas y ningún PCG (plan §7.4): N0 no lleva relieve de materia.
 */

/** Lecturas de `uRuidoQ` en el peor camino de un fragmento, por nivel. */
export const LECTURAS_DE_LA_MATERIA_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 4, 1: 16, 2: 24, 3: 36 };

/** Cadenas `pcgQ` que corren dentro de funciones de la materia (`hash2Q`), en el peor camino, por nivel. */
export const PCG_DE_LA_MATERIA_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 0, 1: 12, 2: 12, 3: 18 };

/** Opciones del retoque. */
export interface OpcionesDeLaMateria {
  /** Lo lejano (la LOD1): `MATERIA_Q 0` sea cual sea el nivel. */
  readonly lejos?: boolean;
}

/** Dónde van las declaraciones: ver la cabecera. */
export const ANCLA_DE_LAS_DECLARACIONES = '#include <dithering_pars_fragment>';
/** Dónde va el preámbulo. */
export const ANCLA_DEL_PREAMBULO = '#include <clipping_planes_fragment>';
/** Dónde va el lóbulo de barniz. */
export const ANCLA_DEL_BARNIZ = '#include <aomap_fragment>';

/** El nombre del retoque para un nivel (entra en la llave de caché). */
export function nombreDeLaMateria(nivel: NivelDeLaCiudad, opciones: OpcionesDeLaMateria = {}): string {
  return opciones.lejos === true ? 'materia-lejos' : `materia-n${String(nivel)}`;
}

const HECHOS = new Map<string, Retoque>();

/** El retoque de la materia para un nivel. Siempre el mismo objeto para el mismo nombre. */
export function retoqueDeLaMateria(nivel: NivelDeLaCiudad, opciones: OpcionesDeLaMateria = {}): Retoque {
  const nombre = nombreDeLaMateria(nivel, opciones);
  const hecho = HECHOS.get(nombre);
  if (hecho !== undefined) return hecho;
  const materia = opciones.lejos === true ? 0 : nivel;
  const retoque: Retoque = {
    nombre,
    orden: -5,
    uniformes: UNIFORMES_DE_LA_MATERIA,
    defines: {
      MATERIA_Q: String(materia),
      OCTAVAS_Q: String(OCTAVAS_POR_NIVEL[materia]),
      MICRO_Q: '0',
    },
    fragmento: [
      { buscar: ANCLA_DE_LAS_DECLARACIONES, como: 'antes', texto: `${GLSL_DE_LA_MATERIA}${GLSL_DE_LAS_FAMILIAS}` },
      { buscar: ANCLA_DEL_PREAMBULO, como: 'antes', texto: GLSL_PREAMBULO_DE_LA_MATERIA },
      { buscar: ANCLA_DEL_BARNIZ, como: 'antes', texto: GLSL_BARNIZ_DE_LA_MATERIA },
    ],
  };
  HECHOS.set(nombre, retoque);
  return retoque;
}
