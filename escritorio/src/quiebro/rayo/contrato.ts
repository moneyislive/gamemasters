/**
 * EL CONTRATO DEL RAYO EN EL CLIENTE: lo que se dicen los frentes que lo construyen a la vez —MANDOS (mandos,
 * red, HUD, cámara), EFECTOS (efectos, posproceso, sonido, luz) y ANIMACIÓN (personajes, forja)— y cómo leen lo
 * que declara REGLAS. `docs/quiebro/EL-RAYO.md` manda; esto es su §9 escrito en tipos. El reparto de ficheros,
 * los stubs y las costuras entre frentes están contados en el CONTRATO.md de la fase 0.
 *
 * Sin three ni React ni DOM: se lee en Node (`verify:quiebro-rayo` lo prueba así) y lo importan tanto los
 * sombreadores como los mandos. NO SE CAMBIA SIN EL COORDINADOR: cuatro frentes escriben contra estas firmas sin
 * poder preguntarse.
 *
 * ═══ QUIÉN ESCRIBE Y QUIÉN LEE ═══
 *
 *   · `EstadoDelRayo` — la carga PROPIA, fotograma a fotograma. La escribe MANDOS (en `partida.rayo`, un objeto
 *     que se reutiliza) y la leen el HUD y la cámara (MANDOS) y los efectos, que la reciben en
 *     `EfectosDelRayo.actualizarCarga`.
 *   · `EfectosDelRayo` — lo que se ve y se oye, colgado del sistema de efectos (`sistema.rayo`). El rayo PROPIO lo
 *     manda MANDOS (empezar, actualizar, cancelar y soltar, en el acto, sin esperar a la sala); los AJENOS, y todo
 *     `estalla` (también el propio), los manda EFECTOS desde los sucesos, en `red/escenificar.ts`.
 *   · `DisparoDelRayo` y `EstallidoDelRayo` — lo que viaja en esas dos llamadas.
 *   · `BocaDe` — dónde está la mano de un cuerpo: la expone ANIMACIÓN (`sistema.boca`, la pone `Quiebro.tsx` con
 *     el director de los personajes) y la usan los efectos para la carga, el fogonazo y el origen del destello.
 *     Mientras no haya mano, devuelve el pivote del cuerpo (`ALTO_DE_LA_BOCA_SIN_MANO`).
 *   · `GESTO_DE_CARGAR` y `GESTO_DE_LANZAR` — los gestos que MANDOS pone en `CuerpoPintado` (con `carga`) y que
 *     ANIMACIÓN pinta.
 *   · `UNIFORMES_DEL_DESTELLO` — la luz del destello: EFECTOS la escribe y la leen los sombreadores de los cuerpos
 *     y de la ciudad (todos de EFECTOS).
 *   · `leerElTiro` — cómo el diccionario del cliente (`red/diccionario.ts`) lee la declaración del tiro: TODOS los
 *     números del rayo salen de ahí (de `reglas.tiro` y de sus proyectiles), y ninguno se copia en el cliente.
 *
 * ═══ LOS RELOJES Y LAS UNIDADES ═══
 *
 * Todo instante (`t`, `…Ms`) está en la escala de `performance.now()` —la de los `timeStamp` de los eventos—,
 * en el reloj VERDADERO (el que el Remanso no frena): la carga y el disparo son señales de juego. Lo que es adorno
 * (la estela, la marca chamuscada) lo pasa EFECTOS por dentro a su reloj presentado. Las distancias, en metros
 * (1 unidad de la Liza = 1 m en El Quiebro, como en el resto del cliente); los sitios, en el convenio de
 * `andar.ts` (x al este, z al sur, y hacia arriba).
 */
import { UNO } from '../../../../shared/mecanicas/fijo';
import { MS_POR_TIC } from '../../../../shared/mecanicas/liza/declaracion';
import type { IdDeclarado, ProyectilDeclarado, TiroDeclarado } from '../../../../shared/mecanicas/liza/declaracion';
import type { Gesto } from '../cuerpos';

/* ─────────────────────────────── Los puntos, la mano y los gestos ─────────────────────────────── */

/** Un punto del mundo, en metros. Mutable a propósito: quien lo pide pasa el suyo y se escribe en él, sin asignar. */
export interface PuntoDelRayo {
  x: number;
  y: number;
  z: number;
}

/**
 * DÓNDE ESTÁ LA BOCA DEL RAYO (la mano derecha) del cuerpo `id`, en el mundo y en ESTE fotograma: se escribe en
 * `salida` y se devuelve `true`; `false` si ese cuerpo no se pinta ahora (y `salida` no se toca). Se llama cada
 * fotograma, así que no asigna.
 */
export type BocaDe = (id: number, salida: PuntoDelRayo) => boolean;

/**
 * A qué altura está la boca mientras no hay mano: el pivote del cuerpo, a la altura a la que vuelan las balas
 * (1,35 m, la de `efectos/cuentas.ts`). Es lo que devuelve el `bocaDe` de la fase 0.
 */
export const ALTO_DE_LA_BOCA_SIN_MANO = 1.35;

/**
 * Los dos gestos del rayo (`cuerpos.ts`). `cargar-rayo` es un bucle mientras dura la carga, con `carga` en el
 * `CuerpoPintado`; `lanzar-rayo` es un golpe cuyo impacto es el instante en que sale el destello
 * (`impactoMs` = `gestoDesdeMs` = el instante del disparo en el reloj de ese cuerpo: el clip entra por su
 * fotograma de impacto, y lo que queda de él es el retroceso).
 */
export const GESTO_DE_CARGAR: Gesto = 'cargar-rayo';
export const GESTO_DE_LANZAR: Gesto = 'lanzar-rayo';

/* ─────────────────────────────── La declaración, leída ─────────────────────────────── */

/** Un nivel del tiro, leído de la declaración y en unidades del cliente. */
export interface NivelLeido {
  /** 1 el primero (poca carga) … n el último (el pleno). */
  readonly nivel: number;
  /** Desde cuánta carga sale, en ms del aparato. */
  readonly desdeMs: number;
  /** El id de su bala: con él se reconoce el nivel de un `bala` ajeno. */
  readonly proyectil: IdDeclarado;
  /** Lo que recorre su bala, en metros, y a qué velocidad, en m/s. */
  readonly alcance: number;
  readonly velocidad: number;
  /** El radio de su bala contra la estructura, en metros. */
  readonly radioContraLaEstructura: number;
  /** Su medio ancho contra los cuerpos, en metros. */
  readonly ancho: number;
  /** El radio de su área, en metros (0 = sin área: una línea). */
  readonly area: number;
  /** Su recarga, en ms (sus tics por 50). */
  readonly recargaMs: number;
}

/** El tiro de un asiento, leído (`leerElTiro`). */
export interface TiroLeido {
  /** La sostenida que carga y la pulsación que suelta: los ids que MANDOS manda por el cable. */
  readonly apuntar: IdDeclarado;
  readonly soltar: IdDeclarado;
  /** El estado de quien carga: un asiento en él (foto o suceso `estado`) está cargando. */
  readonly estado: IdDeclarado;
  /** La carga en que `c` llega a 1: el `desdeMs` del último nivel. */
  readonly cargaLlenaMs: number;
  /** La carga más larga que la sala se cree. */
  readonly cargaMaximaMs: number;
  /** Lo que se suma a cada cuerpo al juzgar si la bala lo toca, en metros. */
  readonly holgura: number;
  /** El enganche de la sala, en metros y rumbos (0-64), o `null`. */
  readonly enganche: { readonly radio: number; readonly conoRumbos: number; readonly holgura: number } | null;
  /** Los niveles, en su orden (el primero con `desdeMs` 0). Nunca vacío. */
  readonly niveles: readonly NivelLeido[];
}

/**
 * LEE EL TIRO DE UN ASIENTO: `reglas.tiro` y los proyectiles de la liza, pasados a metros y ms. `null` si el
 * asiento no tiene tiro, o si lo declarado no se deja leer (un nivel sin su bala, ningún nivel): no lanza, como
 * el resto del diccionario. Es la ÚNICA puerta por la que el cliente saca números del rayo.
 */
export function leerElTiro(tiro: TiroDeclarado | null, proyectiles: readonly ProyectilDeclarado[]): TiroLeido | null {
  if (tiro === null || tiro === undefined || !Array.isArray(tiro.niveles) || tiro.niveles.length === 0) return null;
  const niveles: NivelLeido[] = [];
  for (let i = 0; i < tiro.niveles.length; i++) {
    const n = tiro.niveles[i];
    if (n === undefined) return null;
    let bala: ProyectilDeclarado | null = null;
    for (const p of proyectiles) if (bala === null && p.id === n.proyectil) bala = p;
    if (bala === null) return null;
    niveles.push({
      nivel: i + 1,
      desdeMs: n.desdeMs,
      proyectil: n.proyectil,
      alcance: bala.alcance / UNO,
      velocidad: bala.velocidad / UNO,
      radioContraLaEstructura: bala.radio / UNO,
      ancho: n.ancho / UNO,
      area: n.area / UNO,
      recargaMs: n.recargaTics * MS_POR_TIC,
    });
  }
  const ultimo = niveles[niveles.length - 1] as NivelLeido;
  return {
    apuntar: tiro.apuntar,
    soltar: tiro.soltar,
    estado: tiro.puesta.estado,
    cargaLlenaMs: ultimo.desdeMs,
    cargaMaximaMs: tiro.cargaMaximaMs,
    holgura: tiro.holgura / UNO,
    enganche: tiro.enganche === null ? null : { radio: tiro.enganche.radio / UNO, conoRumbos: tiro.enganche.conoRumbos, holgura: tiro.enganche.holgura / UNO },
    niveles,
  };
}

/**
 * EL NIVEL QUE SALE con `cargaMs` de carga: el ÚLTIMO con `desdeMs` ≤ la carga, acotada a [0, cargaMaximaMs].
 * Es la misma cuenta que hace la sala (sin interpolar), para que lo que enseña el HUD sea lo que sale.
 */
export function nivelDeLaCarga(tiro: TiroLeido, cargaMs: number): NivelLeido {
  const carga = Math.min(tiro.cargaMaximaMs, Math.max(0, Number.isFinite(cargaMs) ? cargaMs : 0));
  let elegido = tiro.niveles[0] as NivelLeido;
  for (const n of tiro.niveles) if (n.desdeMs <= carga) elegido = n;
  return elegido;
}

/** LA CARGA DE 0 A 1 (`c`): `cargaMs / cargaLlenaMs`, acotada. Con un solo nivel, siempre llena. */
export function cargaDe(tiro: TiroLeido, cargaMs: number): number {
  if (tiro.cargaLlenaMs <= 0) return 1;
  const c = (Number.isFinite(cargaMs) ? cargaMs : 0) / tiro.cargaLlenaMs;
  return c < 0 ? 0 : c > 1 ? 1 : c;
}

/**
 * La `c` de un rayo AJENO, que no viaja: la del principio de su nivel. Los demás ven el nivel (por el
 * proyectil de su `bala`) y no la carga exacta; con esto el destello de un nivel se ve igual en todos.
 */
export function cargaDelNivel(tiro: TiroLeido, nivel: NivelLeido): number {
  return cargaDe(tiro, nivel.desdeMs);
}

/** El nivel cuya bala es el proyectil `p` (el del suceso `bala`), o `null` si no es una bala de este tiro. */
export function nivelDelProyectil(tiro: TiroLeido, p: IdDeclarado): NivelLeido | null {
  for (const n of tiro.niveles) if (n.proyectil === p) return n;
  return null;
}

/* ─────────────────────────────── El estado de la carga propia ─────────────────────────────── */

/**
 * LA CARGA PROPIA, como está en este fotograma. MANDOS la escribe (una vez por fotograma, en el mismo objeto:
 * `partida.rayo`); el HUD (la mira y el botón), la cámara (el zoom) y los efectos la leen. Nadie más la escribe.
 */
export interface EstadoDelRayo {
  /** ¿Se está cargando ahora? */
  activo: boolean;
  /** Desde cuándo: el `timeStamp` del evento que empezó la carga. `NaN` sin carga. */
  desdeMs: number;
  /** La carga de 0 a 1 (`cargaDe`): 1 es el pleno. 0 sin carga. */
  c: number;
  /** El nivel que saldría si se soltara ahora (1…n), o 0 sin carga. */
  nivel: number;
  /** El número de cuerpo del blanco que se va a llevar (0 = ninguno: sale por la mira). */
  blanco: number;
  /** Adónde apunta la mira: el punto del mundo que se tocaría (el blanco, la pared o el fin del alcance). */
  readonly apuntado: PuntoDelRayo;
  /** El radio del área del nivel de ahora (0 = una línea), y su alcance, en metros. */
  area: number;
  alcance: number;
  /** Hasta cuándo dura la recarga (0 = lista). Sale de la sala: del `bala` propio y el nivel de su proyectil. */
  recargaHastaMs: number;
}

/** Un estado sin carga (el de antes de cargar y el de después). Uno por dueño; luego se reutiliza. */
export function estadoDelRayoApagado(): EstadoDelRayo {
  return { activo: false, desdeMs: Number.NaN, c: 0, nivel: 0, blanco: 0, apuntado: { x: 0, y: 0, z: 0 }, area: 0, alcance: 0, recargaHastaMs: 0 };
}

/* ─────────────────────────────── Los efectos ─────────────────────────────── */

/**
 * UN RAYO QUE SALE. Uno por disparo (se puede asignar: son un puñado por segundo como mucho).
 */
export interface DisparoDelRayo {
  /** Quién dispara: el número de su asiento (1-15). */
  readonly quien: number;
  /** El número de su bala en la sala; 0 el propio, que sale antes de que la sala lo cuente. */
  readonly bala: number;
  /** De dónde sale (la boca, `BocaDe`) y adónde llega (lo que toca, o el fin de su alcance), en metros. */
  readonly origen: Readonly<PuntoDelRayo>;
  readonly destino: Readonly<PuntoDelRayo>;
  /** Su nivel (1…n) y su carga de 0 a 1 (la de un ajeno, `cargaDelNivel`). */
  readonly nivel: number;
  readonly c: number;
  /** El radio de su área, en metros (0 = una línea). */
  readonly area: number;
  /** ¿Va a dar a un cuerpo? `true`/`false` lo que se sabe al soltar; `null` si no se sabe (lo dirá `estalla`). */
  readonly dio: boolean | null;
  /** La semilla del trazo quebrado (`semillaDelRayo`): el mismo rayo ajeno se ve igual en todos los aparatos. */
  readonly semilla: number;
  /** Cuándo sale, en el reloj verdadero. */
  readonly t: number;
}

/** DONDE SE PARA UN RAYO: el suceso `estalla` de la sala, ya leído. El centro del área, si la hay. */
export interface EstallidoDelRayo {
  /** Quién lo disparó (el `de` de su `bala`), o 0 si su `bala` no llegó a verse. */
  readonly quien: number;
  /** El número de su bala. */
  readonly bala: number;
  /** Dónde, en metros (y a la altura de la boca: `ALTO_DE_LA_BOCA_SIN_MANO`, salvo que se sepa más). */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Su nivel (1…n; 0 si no se sabe) y el radio de su área en metros (0 = sin área). */
  readonly nivel: number;
  readonly area: number;
  /** Cuándo llegó, en el reloj verdadero. */
  readonly t: number;
}

/**
 * LO QUE SE VE Y SE OYE DEL RAYO. Cuelga del sistema de efectos (`sistema.rayo`), y quien lo llame lo lee ahí
 * EN CADA LLAMADA (no se lo guarda): EFECTOS puede envolverlo (con el sonido, por ejemplo). `quien` es siempre
 * el número del asiento que carga o dispara. Ningún método lanza ni asigna por fotograma.
 *
 *   · El PROPIO: MANDOS llama `empezarCarga` al empezar a cargar, `actualizarCarga` una vez por fotograma
 *     mientras carga (con `partida.rayo`), `cancelarCarga` si se deja sin disparar, y `soltar` al soltar, en el
 *     acto y con lo que predice (bala 0).
 *   · Los AJENOS: EFECTOS, desde los sucesos (`red/escenificar.ts`): el estado de cargar de un asiento en la
 *     foto o en un `estado` empieza o cancela su carga; su `bala` (con `de` = el asiento y `p` = la bala de un
 *     nivel) lo suelta. El `bala` PROPIO que llega después NO se vuelve a soltar: sólo da el número de la bala.
 *   · Todo `estalla` —también el propio— es un `estallar`, y lo manda EFECTOS.
 */
export interface EfectosDelRayo {
  /** `quien` empieza a cargar en `t`. Otra carga del mismo `quien` sin acabar la anterior la sustituye. */
  empezarCarga(quien: number, t: number): void;
  /**
   * La carga de `quien` va así en `t`. Una vez por fotograma mientras dure. `estado` lo reutiliza quien llama:
   * no se guarda la referencia, se copia lo que haga falta. Un cambio de `estado.blanco` es un blanco que se
   * fija (el «tic» de la mira suena aquí), y `estado.c` en 1 es el pleno (su «listo», también).
   */
  actualizarCarga(quien: number, estado: Readonly<EstadoDelRayo>, t: number): void;
  /** Se deja sin disparar (daño, quiebro, dedo perdido, fin del combate…): se apaga sin destello. Sin carga, nada. */
  cancelarCarga(quien: number, t: number): void;
  /** Sale el rayo: acaba la carga de `d.quien` (si la había) y pinta y suena el disparo. */
  soltar(d: DisparoDelRayo): void;
  /** Un rayo se para: el estallido (en área, si la hay), la luz, las chispas, la marca. */
  estallar(e: EstallidoDelRayo): void;
}

/** LOS EFECTOS DEL RAYO QUE NO HACEN NADA: el stub de la fase 0, y el doble de prueba de quien no pinta. */
export const EFECTOS_DEL_RAYO_NULOS: EfectosDelRayo = Object.freeze({
  empezarCarga(): void {},
  actualizarCarga(): void {},
  cancelarCarga(): void {},
  soltar(): void {},
  estallar(): void {},
});

/**
 * LA SEMILLA DE UN RAYO: un entero de 32 bits sin signo a partir de dos enteros. Un rayo ajeno se siembra con
 * `(de, bala)` del suceso —el mismo número en todos los aparatos que lo ven—; el propio, que sale antes de saber
 * su bala, con `(yo, t redondeado)`: se parece, pero no es el mismo trazo que ven los demás (nadie ve las dos
 * pantallas a la vez).
 */
export function semillaDelRayo(a: number, b: number): number {
  let h = Math.imul((a | 0) ^ 0x3c6ef372, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15) ^ (b | 0), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/* ─────────────────────────────── La luz del destello ─────────────────────────────── */

/** Cuántos destellos alumbran a la vez (la carga propia, rayos de otros, un estallido…). */
export const DESTELLOS_COMO_MUCHO = 4;

/**
 * LOS UNIFORMES DEL DESTELLO: la luz que el rayo echa sobre los cuerpos y la ciudad sin añadir ninguna luz real
 * (en N0/N1 no las hay, y cambiar su número recompila la escena entera). EFECTOS los ESCRIBE —un hueco por
 * destello vivo, y apagado con `w` = 0— y los sombreadores que alumbra (los de los cuerpos, y las tarjetas y los
 * halos de la ciudad, todos de EFECTOS) los LEEN, con estos mismos objetos en sus `uniforms` (el patrón de
 * `UNIFORMES_DE_LA_CIUDAD`). Los valores son listas planas de vec4 (`uniform vec4 uDestelloQ[4];`), que three
 * sube tal cual. Empiezan a cero: sin rayo, no alumbran nada.
 */
export const UNIFORMES_DEL_DESTELLO = {
  /** Por destello: xyz = dónde está (metros, mundo); w = hasta dónde alumbra (metros; 0 = apagado). */
  uDestelloQ: { value: new Float32Array(4 * DESTELLOS_COMO_MUCHO) },
  /** Por destello: rgb = su color LINEAL por su intensidad (puede pasar de 1); w = 0 (reservado). */
  uDestelloColorQ: { value: new Float32Array(4 * DESTELLOS_COMO_MUCHO) },
};
