/**
 * LA COMPUERTA DE BOOTS ON BOARD: ¿se le ofrece a ESTE aparato bajar al tablero de ESTE juego, y si
 * no, por qué?
 *
 * ═══ UNA VEZ, AL ABRIR O AL SENTARSE, Y NUNCA DESPUÉS ═══
 *
 * Es la tercera decisión de Miguel (`docs/BOOTS-ON-BOARD.md`, arriba y §3): Boots on Board es una
 * MODALIDAD APARTE que se elige al abrir la mesa, sólo se ofrece a los aparatos que la soportan, y a
 * nadie se le echa de una partida empezada. Así que la pregunta se hace en dos puertas y en ninguna
 * más: al ABRIR —si sale la elección, y si sale encendida— y al SENTARSE en una mesa que ya es
 * `botas`. Volver al asiento propio no pasa por aquí: quien ya estaba sentado sigue sentado, le
 * empeore lo que le empeore.
 *
 * ═══ QUÉ MIRA: DOS COSAS Y NINGUNA MÁS ═══
 *
 *   1. SI EL JUEGO SE RECORRE, con `sePuedeRecorrer` (el registro de mundos). Un juego que no
 *      declara su mundo no tiene tablero al que bajar, y entonces la elección NO SALE. Apagado se
 *      enseña lo que existe y este aparato no alcanza; lo que no existe no se enseña.
 *   2. EL VEREDICTO DEL JUEZ, `juzgarCalidad` de `embarcadero/calidad.ts`: 120 fotogramas medidos en
 *      ESTE aparato con un mundo en tres dimensiones en pantalla, a 22 ms o menos, es `plena`.
 *      `plena` ofrece; `sobria` enseña la opción APAGADA con el motivo escrito, que es como esta
 *      casa enseña lo que no se puede —escondida, quien no llega no sabría nunca que existe—; y sin
 *      veredicto tampoco se ofrece TODAVÍA.
 *
 * ═══ POR QUÉ EL MISMO JUEZ QUE BAJA LA CALIDAD DEL LOBBY ═══
 *
 * Porque ya mide lo que hay que medir, en los dos clientes y con una regla de la que la casa ya se
 * fía: cuánto tarda ESTE aparato en pintar un mundo en tres dimensiones, y no qué modelo es ni qué
 * sistema lleva (§3: «medidos en una prueba corta, no declarados»). Un aparato que no pinta el lobby
 * a cuarenta y cinco fotogramas por segundo no va a pintar el tablero con los demás andando por
 * encima: es el mismo trabajo y más.
 *
 * ═══ SIN VEREDICTO NO SE OFRECE, AL REVÉS QUE LA CALIDAD ═══
 *
 * El lobby, mientras no hay veredicto, pinta en `plena`: equivocarse ahí cuesta unos fotogramas
 * lentos y se corrige solo al medir. Aquí equivocarse no se corrige: una mesa `botas` no deja de
 * serlo, y a quien se sienta no se le echa. Así que sin veredicto se espera, y se dice qué se
 * espera: «midiendo tu aparato» si hay un mundo en pantalla midiéndolo, y que aún no se ha medido
 * si no lo hay —el mundo no arrancó, o la pantalla no tiene ninguno—. Decir «midiendo» donde nada
 * mide sería una espera que no acaba nunca.
 *
 * ═══ Y EL VEREDICTO SE GUARDA, PARA NO ESPERAR 120 FOTOGRAMAS CADA VEZ ═══
 *
 * Cada cliente lo guarda en su almacén —el escritorio en `localStorage`, la app en el mismo de su
 * bolsillo— bajo una llave POR APARATO, no por silla ni por arcade: dos ventanas del mismo navegador
 * pintan con la misma tarjeta. El último que se mide sustituye al anterior, y hasta que llega manda
 * el guardado. Aquí vive sólo la lectura (`leerElVeredicto`), porque lo guardado es una cadena que
 * pudo escribir otra versión o una mano en las herramientas del navegador, y sólo `plena` y `sobria`,
 * escritas así, cuentan.
 *
 * ═══ POR QUÉ VIVE EN `escenas/` ═══
 *
 * Por lo mismo que el juez: la llaman los DOS clientes, y el escritorio no puede importar de `app/`
 * (`verify:fronteras`). Sin React, sin `three` y sin red —la lectura de la mesa se le da hecha—, así
 * que la mide `verify:compuerta-de-botas` en Node, caso por caso.
 */
import { sePuedeRecorrer } from '../shared/arcade/juegos/mundos';
import type { Calidad } from './embarcadero/tipos';
import { esMesaDeBotas } from './paseo/mesa-de-botas';

/** Cómo se juega una mesa (`docs/BOOTS-ON-BOARD.md` §3). Se elige al abrirla y no cambia. */
export type Modalidad = 'normal' | 'botas';

/** La marca de una mesa `botas`, allí donde la mesa dice a qué se juega. La misma en los dos clientes. */
export const MARCA_DE_BOTAS = 'Boots on Board';

/**
 * LAS DOS OPCIONES DE LA ELECCIÓN, CON SUS PALABRAS.
 *
 * Una tabla y no dos copias: las pintan dos clientes, y una palabra cambiada en uno solo es una mesa
 * que se llama distinto según desde dónde se abra. `normal` va primero porque es la de siempre y la
 * que viene puesta.
 */
export const LAS_DOS_MODALIDADES: readonly {
  readonly modalidad: Modalidad;
  readonly rotulo: string;
  readonly ayuda: string;
}[] = [
  { modalidad: 'normal', rotulo: 'Normal', ayuda: 'El tablero desde arriba, como siempre.' },
  { modalidad: 'botas', rotulo: MARCA_DE_BOTAS, ayuda: 'Bajas al tablero con tu figura y andas entre los demás.' },
];

/** Hay un mundo en pantalla midiendo, y el veredicto está al caer. */
export const MOTIVO_MIDIENDO = 'Midiendo tu aparato: en unos segundos se sabe si llega.';

/** No hay veredicto, ni nada en pantalla que lo vaya a dar. */
export const MOTIVO_SIN_MEDIR =
  'Este aparato aún no se ha medido: se mide solo mientras hay un mundo en tres dimensiones en pantalla.';

/** El juez dijo `sobria`. */
export const MOTIVO_NO_LLEGA = 'Este aparato va justo con las tres dimensiones: abajo, entre los demás, iría a saltos.';

/**
 * LO QUE DICE LA COMPUERTA, en los cuatro casos que la pantalla pinta distinto: sin elección, la
 * elección con las dos encendidas, y la elección con Boots on Board apagada y su porqué debajo.
 */
export type LoQueDiceLaCompuerta =
  /** El juego no se recorre: no sale la elección, y la mesa se abre como se abrió siempre. */
  | { readonly que: 'no-se-recorre' }
  /** Sale la elección, con Boots on Board encendida. */
  | { readonly que: 'se-ofrece' }
  /** Sale la elección con Boots on Board APAGADA, y el motivo es la frase que se enseña debajo. */
  | { readonly que: 'midiendo' | 'sin-medir' | 'no-llega'; readonly motivo: string };

/**
 * LA COMPUERTA.
 *
 * @param veredicto Lo que dijo el juez: el de esta sesión si ya lo hay, el guardado si no, `null`
 *   si ninguno de los dos.
 * @param arcade El juego de la mesa que se va a abrir.
 * @param midiendo Hay ahora mismo un mundo en tres dimensiones en pantalla dándole muestras al juez.
 *   Sólo cambia la frase cuando no hay veredicto: nunca enciende nada.
 */
export function compuertaDeBotas(veredicto: Calidad | null, arcade: string, midiendo: boolean): LoQueDiceLaCompuerta {
  if (!sePuedeRecorrer(arcade)) return { que: 'no-se-recorre' };
  if (veredicto === 'plena') return { que: 'se-ofrece' };
  if (veredicto === 'sobria') return { que: 'no-llega', motivo: MOTIVO_NO_LLEGA };
  return midiendo ? { que: 'midiendo', motivo: MOTIVO_MIDIENDO } : { que: 'sin-medir', motivo: MOTIVO_SIN_MEDIR };
}

/**
 * LO QUE VIAJA EN `abrir(…, modalidad)`.
 *
 * La elegida, si la compuerta la ofrece. `'normal'` si Boots on Board está apagada, AUNQUE
 * estuviera marcada: un veredicto recién medido puede apagarla con la mano ya encima, y lo que se
 * abre es lo que se ve encendido. Y NADA si el juego no se recorre, que es abrir exactamente como
 * antes de que la elección existiera: sin el campo, el servidor abre la mesa de siempre.
 */
export function modalidadQueViaja(elegida: Modalidad, compuerta: LoQueDiceLaCompuerta): Modalidad | undefined {
  if (compuerta.que === 'no-se-recorre') return undefined;
  return compuerta.que === 'se-ofrece' ? elegida : 'normal';
}

/**
 * EL VEREDICTO GUARDADO, LEÍDO COMO LO QUE ES: una cadena que pudo escribir cualquiera. `plena` o
 * `sobria` escritas así; cualquier otra cosa es no saber, y no saber no ofrece nada.
 */
export function leerElVeredicto(crudo: unknown): Calidad | null {
  return crudo === 'plena' || crudo === 'sobria' ? crudo : null;
}

// ---------------------------------------------------------------------------
// Al sentarse
// ---------------------------------------------------------------------------

/*
 * ═══ POR QUÉ UN APARATO QUE NO LLEGA NO SE SIENTA EN UNA MESA `botas` ═══
 *
 * Porque sentado sin bajar al tablero sería una figura a la que nadie puede alcanzar: los demás
 * andan, chocan y —cuando llegue el botín— se roban, y él jugaría las mismas cartas desde arriba sin
 * poder perder nada de eso. Es una ventaja, no una forma más humilde de jugar. Y no se arregla
 * después: a nadie se le echa de una partida empezada. Así que se para ANTES de pedir silla, y se
 * dice por qué con palabras de quien juega.
 */

/** Sin veredicto: se espera a medir. */
export const NO_TE_SIENTAS_SIN_MEDIR =
  'Esta mesa se juega en Boots on Board y este aparato aún no se ha medido: se mide solo, en unos segundos, con un mundo en tres dimensiones en pantalla. Vuelve a probar entonces.';

/** El juez dijo `sobria`. */
export const NO_TE_SIENTAS_NO_LLEGA =
  'Esta mesa se juega en Boots on Board y este aparato va justo con las tres dimensiones. Sentado sin bajar al tablero, los demás no podrían alcanzarte, y eso no sería justo: busca una mesa normal.';

/** El juego no se recorre en ESTA versión: un servidor más nuevo puede tener mesas `botas` de él. */
export const NO_TE_SIENTAS_NO_SE_RECORRE =
  'Esta mesa se juega en Boots on Board y esta versión no sabe bajar a este tablero: busca una mesa normal, o actualiza.';

/**
 * LO QUE SE LE DICE A ESTE APARATO SI LA MESA ES `botas`, o `null` si puede sentarse en ella.
 * Pura: la mesa no se mira aquí, se mira en `porQueNoTeSientas`.
 */
export function motivoParaNoSentarse(veredicto: Calidad | null, arcade: string): string | null {
  const compuerta = compuertaDeBotas(veredicto, arcade, false);
  switch (compuerta.que) {
    case 'se-ofrece':
      return null;
    case 'no-se-recorre':
      return NO_TE_SIENTAS_NO_SE_RECORRE;
    case 'no-llega':
      return NO_TE_SIENTAS_NO_LLEGA;
    default:
      return NO_TE_SIENTAS_SIN_MEDIR;
  }
}

/**
 * Lo que contesta la lectura de una mesa SIN llave, tal como llega: el estado y el cuerpo ya leído
 * como JSON, o `undefined` si no lo era —un servidor equivocado contesta 200 con una página—.
 */
export interface LecturaSinLlave {
  readonly ok: boolean;
  readonly status: number;
  readonly cuerpo: unknown;
}

/**
 * ¿PUEDE ESTE APARATO SENTARSE EN LA MESA DE ESE CÓDIGO? `null` si sí; si no, la frase.
 *
 * Un aparato que baja a este tablero se sienta en cualquier mesa suya, y entonces ni se pregunta: la
 * entrada sigue siendo la de siempre, con una petición y sin esperar a nadie. Si no baja, se lee la
 * mesa SIN LLAVE —como la ve quien aún no se ha sentado; la misma lectura que el sondeo, con
 * `?desde=-1` para que conteste en el acto— y se mira su modalidad con `esMesaDeBotas`, la pregunta
 * que ya se hacen los dos clientes. Una mesa sin el campo es de las de siempre: un servidor anterior
 * no lo manda.
 *
 * Si la lectura falla, LANZA con lo que dijo el servidor: quien llama lo cuenta como cuenta un fallo
 * al entrar, y un código equivocado se dice igual que antes —es el mismo 404, con la misma frase— y
 * se cuenta UNA vez, porque ya no se pide silla detrás. Y una mesa de otro juego no se juzga aquí: la
 * rechaza el servidor al pedir silla, con su propio motivo, que es el que hay que leer.
 */
export async function porQueNoTeSientas(
  codigo: string,
  arcade: string,
  veredicto: Calidad | null,
  leerSinLlave: (codigo: string) => Promise<LecturaSinLlave>,
): Promise<string | null> {
  const motivo = motivoParaNoSentarse(veredicto, arcade);
  if (motivo === null) return null;
  const leida = await leerSinLlave(codigo);
  const cuerpo = typeof leida.cuerpo === 'object' && leida.cuerpo !== null ? (leida.cuerpo as { error?: unknown; mesa?: unknown }) : {};
  const mesa =
    typeof cuerpo.mesa === 'object' && cuerpo.mesa !== null ? (cuerpo.mesa as { arcade?: unknown; modalidad?: unknown }) : null;
  if (!leida.ok || mesa === null) {
    throw new Error(
      typeof cuerpo.error === 'string' && cuerpo.error.length > 0
        ? cuerpo.error
        : leida.ok
          ? 'la respuesta no trae la mesa'
          : `el servidor contestó ${String(leida.status)}`,
    );
  }
  if (mesa.arcade !== arcade) return null;
  return esMesaDeBotas(mesa) ? motivo : null;
}
