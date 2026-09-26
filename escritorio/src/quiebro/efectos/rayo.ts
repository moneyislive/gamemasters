/**
 * LOS EFECTOS DEL RAYO: lo que se ve de la carga, del destello y del estallido (`docs/quiebro/EL-RAYO.md`, §4),
 * detrás de la interfaz `EfectosDelRayo` del contrato (`rayo/contrato.ts`). Cuelga del sistema de efectos
 * (`sistema.rayo`): MANDOS lo llama con el rayo propio y `red/escenificar.ts` con los ajenos y con cada `estalla`.
 *
 * ═══ EL LISTÓN: UN DESTELLO DE VERDAD, NO UN LÁSER ═══
 *
 * Un rayo real dura décimas: un hilo blanco sobreexpuesto casi sin grosor que LLEGA en un suspiro, dos o tres
 * re-descargas por el mismo canal en menos de cien milisegundos, una persistencia que se apaga enfriándose y todo lo
 * de alrededor alumbrado de golpe. Así que aquí no hay «un rayo que se mueve»: hay un CANAL (unos pocos puntos gruesos
 * sembrados, que el sombreador quiebra en doce segmentos por tramo), una CABEZA que lo recorre en 25-50 ms (tres
 * fotogramas o menos), unas DESCARGAS que lo encienden entero y una ESTELA que se ensancha, se rompe y se enfría del
 * blanco al ámbar oscuro. Todo es una función del tiempo desde el disparo: nada se integra fotograma a fotograma, y
 * por eso el banco del rayo (`rayo/banco.tsx`) fotografía cualquier instante sin reproducir los anteriores.
 *
 * ═══ LOS DOS RELOJES ═══
 *
 * La carga, la cabeza, las descargas, el resplandor del estallido y la luz van en el reloj VERDADERO: son lo que el
 * jugador lee (el Remanso no puede retrasar un destello que ya dio). La estela, el vapor, el rescoldo del resplandor,
 * las chispas y la marca chamuscada son adorno y van en el PRESENTADO: en el Remanso la estela se queda colgada.
 *
 * ═══ PURO ═══
 *
 * Ni three, ni DOM, ni `performance`: el estado son arrays tipados de tamaño fijo (`EstadoDeLosRayos`), las piezas
 * (`rayos.tsx`, `trazos.tsx`) lo leen y lo pintan, y el comprobador lo prueba en Node. Nada asigna después de crear
 * el sistema: `actualizarCarga` se llama cada fotograma, y `evaluarLosRayos` también.
 */
import { COLORES, azarDe, componentesLineales, chispasDelImpacto, velocidadDeLasChispas } from './cuentas';
import type { Nivel } from './presupuesto';
import { CARGAS_A_LA_VEZ, MARCAS_A_LA_VEZ, POR_NIVEL, RAYOS_A_LA_VEZ, ajuste } from './presupuesto';
import type { RelojDePresentacion } from './reloj';
import { ALTO_DE_LA_BOCA_SIN_MANO, DESTELLOS_COMO_MUCHO, EFECTOS_DEL_RAYO_NULOS, UNIFORMES_DEL_DESTELLO } from '../rayo/contrato';
import type { BocaDe, DisparoDelRayo, EfectosDelRayo, EstadoDelRayo, EstallidoDelRayo, PuntoDelRayo } from '../rayo/contrato';

/* ─────────────────────────────── La paleta del rayo ─────────────────────────────── */

/**
 * EL COLOR (EL-RAYO.md §4): núcleo BLANCO sobreexpuesto con filo ÁMBAR (el color del jugador), y una estela que se
 * enfría del blanco al ámbar oscuro. Nunca el verde-cian del código, ni el naranja rojizo del tirador (0xff5a24), ni
 * el blanco violáceo de la respuesta (0xdcc2ff): el comprobador mide que ninguno se le parezca. En sRGB.
 */
export const COLORES_DEL_RAYO = {
  /** El núcleo: blanco con una pizca de calor (un arco de verdad no es blanco puro en una foto). */
  nucleo: 0xfff6ea,
  /** El filo y el velo: el ámbar del jugador, algo más claro para que el halo no se ensucie. */
  filo: 0xffb45a,
  /** La estela recién hecha y la luz del estallido: blanco cálido. */
  caliente: 0xffe2b8,
  /**
   * La estela fría y el rescoldo: un ámbar hondo, rojizo, que BRILLA (el aire ionizado que se enfría es luz, no humo:
   * el 0x8a3a0c de antes, ya flojo, salía como una mancha marrón). Más ámbar que el rojo del tirador (26° de tono
   * contra 15°).
   */
  frio: 0xe0701a,
  /** La carga: el ámbar del jugador. */
  carga: COLORES.ambar,
  /** Las chispas: blanco amarillento y ámbar. */
  chispa: 0xffe6bf,
} as const;

const NUCLEO = componentesLineales(COLORES_DEL_RAYO.nucleo);
const FILO = componentesLineales(COLORES_DEL_RAYO.filo);
const CALIENTE = componentesLineales(COLORES_DEL_RAYO.caliente);
const FRIO = componentesLineales(COLORES_DEL_RAYO.frio);
const AMBAR = componentesLineales(COLORES_DEL_RAYO.carga);

/* ─────────────────────────────── La línea de tiempo (pura) ─────────────────────────────── */

/** Lo que tarda la cabeza en llegar, en ms desde el disparo: el chispazo 50 (tres fotogramas), el pleno 25. */
export function llegadaDelRayo(c: number): number {
  return 50 - 25 * entre01(c);
}

/** Cuándo cae cada descarga, en ms desde que la cabeza llega. La última, antes de los 90 ms (§4). */
export const DESCARGAS_MS: readonly [number, number, number] = [0, 36, 78];
/** Lo que pesa cada descarga: la primera entera, las re-descargas algo menos. */
export const PESO_DE_LA_DESCARGA: readonly [number, number, number] = [1, 0.8, 0.65];
/** Lo que tarda en apagarse cada descarga (e-veces), en ms. */
export const CAIDA_DE_LA_DESCARGA_MS = 14;

/**
 * CUÁNTAS DESCARGAS tiene un rayo de carga `c` en un nivel de calidad: el chispazo una, el pleno las del nivel
 * (1 en N0, 2 en N1, 3 en N2-N3: la tabla del §4 da «2-3» en N2, y el 3 es sólo del pleno), y lo de en medio dos
 * como mucho.
 */
export function descargasDelRayo(c: number, nivel: Nivel): number {
  const tope = POR_NIVEL.descargasDelRayo[nivel];
  if (c >= 0.9) return tope;
  if (c >= 0.5) return Math.min(2, tope);
  return 1;
}

/**
 * EL BRILLO DEL CANAL a los `ms` del disparo (reloj verdadero), de 0 a ~1,2. Antes de llegar, la guía: un canal
 * tenue (0,35) con la punta encendida (la pone el sombreador). Al llegar, las descargas: cada una sube en el acto y
 * cae en `CAIDA_DE_LA_DESCARGA_MS`; y un rescoldo del canal que se apaga en ~90 ms. El rescoldo, bajo a propósito:
 * entre una descarga y la siguiente el canal tiene que CAER (un parpadeo), no quedarse blanco.
 */
export function brilloDelCanal(ms: number, c: number, descargas: number): number {
  if (!(ms >= 0)) return 0;
  const llegada = llegadaDelRayo(c);
  if (ms < llegada) return 0.35;
  const e = ms - llegada;
  let b = 0.1 * Math.exp(-e / 90);
  for (let k = 0; k < descargas && k < 3; k++) {
    const d = e - (DESCARGAS_MS[k] as number);
    if (d >= 0) b += (PESO_DE_LA_DESCARGA[k] as number) * Math.exp(-d / CAIDA_DE_LA_DESCARGA_MS);
  }
  return Math.min(1.2, b);
}

/** Cuándo empieza a enfriarse la estela: 20 ms después de la última descarga (ms desde el disparo). */
export function inicioDeLaEstela(c: number, descargas: number): number {
  return llegadaDelRayo(c) + (DESCARGAS_MS[Math.max(0, Math.min(2, descargas - 1))] as number) + 20;
}

/** Lo que dura la estela de un rayo de carga `c` en un nivel: la del pleno (§4), y la mitad en el chispazo. */
export function duracionDeLaEstela(c: number, nivel: Nivel): number {
  return POR_NIVEL.estelaDelRayo[nivel] * (0.5 + 0.5 * entre01(c));
}

/**
 * LA ONDA DEL SUELO: el aro que se abre en el suelo desde el estallido hasta el radio DE VERDAD del área (§4: «el
 * jugador ve lo que abarca»). A los `ms` del estallido (presentado): su radio y su fuerza. Llega al área exacta y se
 * queda en ella mientras se apaga; sin área (el pleno), un aro de un metro, más rápido.
 */
export const ONDA_SIN_AREA_M = 1;
export function duracionDeLaOnda(area: number): number {
  return area > 0 ? 200 + 60 * area : 160;
}
export function ondaDelSuelo(ms: number, area: number, salida: { radio: number; fuerza: number } = { radio: 0, fuerza: 0 }): { radio: number; fuerza: number } {
  const final = area > 0 ? area : ONDA_SIN_AREA_M;
  const dura = duracionDeLaOnda(area);
  if (!(ms >= 0) || ms >= dura * 1.6) {
    salida.radio = 0;
    salida.fuerza = 0;
    return salida;
  }
  const p = Math.min(1, ms / dura);
  const q = 1 - p;
  /* Sale deprisa y frena al llegar: 1 − (1 − p)³. En p = 1 es el área EXACTA. */
  salida.radio = p >= 1 ? final : final * (1 - q * q * q);
  salida.fuerza = Math.max(0, ms < dura ? 1 - 0.55 * p : 0.45 * (1 - (ms - dura) / (dura * 0.6)));
  return salida;
}

/**
 * EL FOGONAZO DE PANTALLA de un rayo propio a los `ms` del disparo, de 0 a `FOGONAZO_MAXIMO`. Sólo con carga (el
 * chispazo no tiene: §4), y UNO: sube al llegar la cabeza y cae en ~45 ms sin repetir las re-descargas (§4,
 * fotosensibilidad: las re-descargas cuentan como un solo destello de menos de 150 ms).
 */
/*
 * El uber lo aplica ×6 en lineal (×4 en N0-N1): con 0,04, el pleno sube la luz de la imagen un 24 % durante unos
 * fotogramas. Con 0,06 (+36 %) todo el brillo del posproceso subía con él y, junto con la luz del estallido, la
 * imagen entera se velaba justo cuando había que ver el canal.
 */
export const FOGONAZO_MAXIMO = 0.04;
export const CAIDA_DEL_FOGONAZO_MS = 45;
export function fogonazoDelRayo(ms: number, c: number): number {
  const fuerza = c <= 0.5 ? 0 : Math.pow((c - 0.5) / 0.5, 1.5);
  const e = ms - llegadaDelRayo(c);
  if (fuerza <= 0 || !(e >= 0)) return 0;
  return FOGONAZO_MAXIMO * fuerza * Math.exp(-e / CAIDA_DEL_FOGONAZO_MS);
}

/** El golpe (abombado y aberración en el uber) de un rayo con carga, a los `ms` del disparo: de 0 a 1. */
export function golpeDelRayo(ms: number, c: number): number {
  const e = ms - llegadaDelRayo(c);
  if (c < 0.5 || !(e >= 0)) return 0;
  return 0.6 * c * Math.exp(-e / 45);
}

/**
 * LA LUZ DEL ESTALLIDO a los `ms` del disparo: sigue a las descargas y deja un rescoldo. El chispazo alumbra al 30 %
 * (§4: «luz breve al 30 %») y el pleno entero.
 */
export function luzDelEstallido(ms: number, c: number, descargas: number): number {
  const e = ms - llegadaDelRayo(c);
  if (!(e >= 0)) return 0;
  return (0.3 + 0.7 * entre01(c)) * (Math.min(1, brilloDelCanal(ms, c, descargas)) + 0.12 * Math.exp(-e / 60));
}

/**
 * EL FOGONAZO DE LA BOCA a los `ms` del disparo, de 0 a 1: se enciende al soltar y, como la mano es la punta del canal,
 * vuelve a encenderse con CADA descarga (un rayo de verdad se ilumina entero, de punta a punta, en cada re-descarga).
 * Visto casi de frente (desde el hombro), es una de las tres cosas que dicen «rayo»: el hilo, la boca y el blanco que
 * se encienden a la vez, y la luz en la calle.
 */
export function destelloDeLaBoca(ms: number, c: number, descargas: number): number {
  if (!(ms >= 0)) return 0;
  const alSalir = Math.exp(-ms / 30);
  const conElCanal = ms < llegadaDelRayo(c) ? 0 : 0.85 * Math.min(1, brilloDelCanal(ms, c, descargas));
  return Math.max(alSalir, conElCanal);
}

/**
 * LA LUZ DEL CANAL a los `ms` del disparo: el canal entero es una lámpara de un instante (una luz en línea: baña la calle
 * por debajo de él y a quien dispara, no sólo el sitio en que da). Sólo en las descargas, sin el rescoldo: se va con
 * ellas. El chispazo, al 30 %, como el estallido.
 */
export function luzDelCanal(ms: number, c: number, descargas: number): number {
  if (!(ms >= llegadaDelRayo(c))) return 0;
  return (0.3 + 0.7 * entre01(c)) * Math.max(0, Math.min(1, brilloDelCanal(ms, c, descargas)) - 0.12);
}

/** Lo que dura la marca chamuscada (presentado), y desde qué carga se deja. */
export const MARCA_MS = 3200;
export const CARGA_QUE_CHAMUSCA = 0.5;

/** Lo que tarda en irse una carga que se deja sin disparar. */
export const APAGADO_DE_LA_CARGA_MS = 160;
/** Cuánto se espera a que llegue el `estalla` de un rayo propio para conciliarlo con el que se predijo. */
export const ESPERA_DEL_ESTALLIDO_MS = 700;
/** Lo que vive un rayo en el sistema desde que sale: estela entera, rescoldo, vapor. */
export const VIDA_DEL_RAYO_MS = 1200;

/* ─────────────────────────────── El canal (sembrado) ─────────────────────────────── */

/**
 * LA FRACCIÓN del canal donde acaba el tramo `k` de `tramos`: el primero, junto a la mano, el más corto (desde el
 * hombro la mano está a un par de metros, y ahí doce segmentos de tres metros se verían rectos).
 */
export function fraccionDelTramo(k: number, tramos: number): number {
  if (k <= 0) return 0;
  if (k >= tramos) return 1;
  return Math.pow(k / tramos, 1.55);
}

/**
 * LO QUEBRADO: cuánto se apartan de la recta los puntos gruesos (por metro de rayo) y los finos (por metro de tramo).
 * Un rayo de verdad es quebrado a todas las escalas; el pleno, bastante menos que el chispazo (§4: «más recto»), pero
 * nunca una recta: una recta con halo es un tubo de neón.
 */
export const RUGOSIDAD_GRUESA = 0.15;
/** Lo que el pleno endereza el quiebro grueso (a carga `c`, la rugosidad es `RUGOSIDAD_GRUESA · (1 − este · c)`). */
export const ENDEREZA_EL_PLENO = 0.5;
/*
 * La fina, por metro de tramo (un tramo son doce segmentos), repartida en tres escalas (`fractalQ` en el
 * sombreador): dos quiebros por tramo, cuatro, y uno por segmento. Grande a propósito: la cinta del núcleo se abre en
 * PANTALLA (no se retuerce aunque el quiebro vuelva sobre sí mismo), y con menos el canal salía como un tubo ondulado.
 */
export const RUGOSIDAD_FINA = 0.35;

/**
 * EL APLANADO: cuánto del quiebro dejar a un canal de `o` a `d` mirado desde `(cx, cy, cz)`, de `APLANADO_MINIMO` a 1.
 *
 * El quiebro se ve en PANTALLA, y en pantalla lo que cuenta es lo que se aparta el canal comparado con lo que el canal
 * ocupa. De lado, un rayo de doce metros ocupa media pantalla y un metro de quiebro es un rayo. Por la espalda (el
 * rayo propio, desde el hombro, que es como lo ve siempre quien dispara) esos doce metros caben en treinta píxeles, y
 * el mismo metro de quiebro los desborda: el canal salía como una maraña alrededor de la mano, sin dirección, y el
 * brillo la volvía una bola. Así que el quiebro va en proporción al largo PROYECTADO: el seno del ángulo entre el
 * canal y la mirada (1 de lado, casi 0 de punta), con un suelo para que de punta siga quebrado.
 *
 * Depende de la cámara de cada pantalla, a propósito: la FORMA (dónde se quiebra y hacia qué lado) sale de la semilla
 * y es la misma en todos los aparatos; lo que cambia es cuánto, para que se lea igual desde donde se mire.
 */
export const APLANADO_MINIMO = 0.2;
/** A partir de qué seno (unos 37°) el canal lleva su quiebro entero. */
export const SENO_DEL_QUIEBRO_ENTERO = 0.6;

/**
 * EL VELO, EN PROPORCIÓN A LO QUE EL CANAL OCUPA EN PANTALLA. El velo (el aire ámbar alrededor del hilo) tiene un ancho
 * en píxeles por nivel (`VELO_DEL_RAYO_PX` de `rayos.tsx`), pensado para un rayo que cruza media pantalla. Visto desde el
 * hombro, que es como lo ve siempre quien dispara, el mismo rayo de ocho metros cabe en cincuenta píxeles: con dieciséis
 * de velo era un tubo (o una cuña de luz) más ancho que un tercio de su largo, y el hilo se perdía dentro. Así que el
 * velo no pasa de `PROPORCION_DEL_VELO` del largo en pantalla, con un suelo de `VELO_MINIMO_PX` (el filo que se ve a
 * los lados del hilo) y un techo, el del nivel. Devuelve el ancho en píxeles.
 */
export const PROPORCION_DEL_VELO = 0.08;
export const VELO_MINIMO_PX = 3;
export function anchoDelVelo(largoEnPantallaPx: number, techoPx: number): number {
  const l = Number.isFinite(largoEnPantallaPx) ? Math.max(0, largoEnPantallaPx) : 0;
  return Math.max(Math.min(VELO_MINIMO_PX, techoPx), Math.min(techoPx, PROPORCION_DEL_VELO * l));
}
export function aplanadoDelCanal(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, cx: number, cy: number, cz: number): number {
  const ex = dx - ox;
  const ey = dy - oy;
  const ez = dz - oz;
  const mx = (ox + dx) * 0.5 - cx;
  const my = (oy + dy) * 0.5 - cy;
  const mz = (oz + dz) * 0.5 - cz;
  const px = ey * mz - ez * my;
  const py = ez * mx - ex * mz;
  const pz = ex * my - ey * mx;
  const l = Math.sqrt((ex * ex + ey * ey + ez * ez) * (mx * mx + my * my + mz * mz));
  if (!(l > 1e-9)) return 1;
  const seno = Math.sqrt(px * px + py * py + pz * pz) / l;
  return Math.max(APLANADO_MINIMO, Math.min(1, seno / SENO_DEL_QUIEBRO_ENTERO));
}

/**
 * LOS PUNTOS GRUESOS DEL CANAL: `tramos + 1` puntos (xyz en `salida`) del origen al destino, con los de dentro
 * apartados de la recta por un azar SEMBRADO (el mismo rayo en todos los aparatos). El pleno es más recto que el
 * chispazo (§4: «un destello más grueso y más recto»). `aplanado` (de `aplanadoDelCanal`, 1 por omisión) es cuánto
 * del quiebro se deja según desde dónde se mira. Devuelve el largo del canal.
 */
export function puntosDelCanal(
  semilla: number,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  c: number,
  tramos: number,
  salida: Float32Array,
  aplanado = 1,
): number {
  const ex = dx - ox;
  const ey = dy - oy;
  const ez = dz - oz;
  const largo = Math.sqrt(ex * ex + ey * ey + ez * ez);
  /* Una base perpendicular al canal: la horizontal y la «vertical» (el canal casi nunca es vertical). */
  let hx = -ez;
  let hz = ex;
  const lh = Math.sqrt(hx * hx + hz * hz);
  if (lh > 1e-6) {
    hx /= lh;
    hz /= lh;
  } else {
    hx = 1;
    hz = 0;
  }
  const rugosidad = RUGOSIDAD_GRUESA * (1 - ENDEREZA_EL_PLENO * entre01(c)) * Math.max(APLANADO_MINIMO, Math.min(1, aplanado));
  for (let k = 0; k <= tramos; k++) {
    const f = fraccionDelTramo(k, tramos);
    let px = ox + ex * f;
    let py = oy + ey * f;
    let pz = oz + ez * f;
    if (k > 0 && k < tramos) {
      /*
       * Lo que se aparta crece con el largo del rayo, pero no pasa de tres metros; y crece DESPACIO desde las puntas:
       * sale de la mano casi recto hacia donde apunta y se abre por el medio. (Abrirlo deprisa junto a la mano hacía,
       * desde el hombro, un garabato alrededor de ella.)
       */
      const env = Math.min(1, 1.15 * Math.pow(4 * f * (1 - f), 0.75));
      const amp = Math.min(3, largo * rugosidad) * env;
      const a = (azarDe(semilla, k * 2 + 1) - 0.5) * 2;
      const b = (azarDe(semilla, k * 2 + 2) - 0.5) * 2;
      px += hx * a * amp;
      pz += hz * a * amp;
      py += b * amp * 0.55;
    }
    salida[k * 3] = px;
    salida[k * 3 + 1] = py;
    salida[k * 3 + 2] = pz;
  }
  return largo;
}

/**
 * UNA RAMA: sale del punto grueso `desde` del canal y se abre a un lado, hacia delante y algo hacia abajo (como las de
 * un rayo de verdad, que se ramifican en la dirección en que avanza la guía). Escribe su final en `salida` (xyz) y
 * devuelve su largo.
 */
export function finalDeLaRama(
  semilla: number,
  k: number,
  px: number,
  py: number,
  pz: number,
  dirX: number,
  dirY: number,
  dirZ: number,
  largoDelCanal: number,
  salida: Float32Array,
): number {
  const lado = azarDe(semilla, 200 + k) < 0.5 ? -1 : 1;
  const abre = 0.45 + 0.55 * azarDe(semilla, 210 + k);
  const baja = 0.15 + 0.35 * azarDe(semilla, 220 + k);
  const largo = Math.min(6, largoDelCanal * (0.12 + 0.18 * azarDe(semilla, 230 + k)));
  let hx = -dirZ;
  let hz = dirX;
  const lh = Math.sqrt(hx * hx + hz * hz) || 1;
  hx /= lh;
  hz /= lh;
  let x = dirX + hx * lado * abre;
  let y = dirY - baja;
  let z = dirZ + hz * lado * abre;
  const l = Math.sqrt(x * x + y * y + z * z) || 1;
  x /= l;
  y /= l;
  z /= l;
  salida[0] = px + x * largo;
  salida[1] = Math.max(0.05, py + y * largo);
  salida[2] = pz + z * largo;
  return largo;
}

/**
 * UNA DIRECCIÓN EN UN FLOAT (octaedro, 12 bits por componente; el `desempaquetarQ` del sombreador de las cintas la
 * deshace). La tangente del canal en una costura viaja así: los dos tramos que se juntan ponen la cinta de lado igual
 * y empalman sin solaparse (solapados, el velo se sumaba dos veces y el canal salía como una ristra de bombillas).
 * Cabe exacto en un float32: como mucho 4095 · 4096 + 4095 < 2²⁴.
 */
export function empaquetarDireccion(x: number, y: number, z: number): number {
  const s = Math.abs(x) + Math.abs(y) + Math.abs(z) || 1;
  let ex = x / s;
  let ez = z / s;
  if (y < 0) {
    const ox = ex;
    ex = (1 - Math.abs(ez)) * (ox >= 0 ? 1 : -1);
    ez = (1 - Math.abs(ox)) * (ez >= 0 ? 1 : -1);
  }
  const a = Math.round((ex * 0.5 + 0.5) * 4095);
  const b = Math.round((ez * 0.5 + 0.5) * 4095);
  return a * 4096 + b;
}

/** Lo contrario de `empaquetarDireccion` (el mismo cálculo que el sombreador), para el comprobador. */
export function desempaquetarDireccion(p: number): [number, number, number] {
  const a = Math.floor(p / 4096);
  const b = p - a * 4096;
  const ex = (a / 4095) * 2 - 1;
  const ez = (b / 4095) * 2 - 1;
  let x = ex;
  const y = 1 - Math.abs(ex) - Math.abs(ez);
  let z = ez;
  if (y < 0) {
    x = (1 - Math.abs(ez)) * (ex >= 0 ? 1 : -1);
    z = (1 - Math.abs(ex)) * (ez >= 0 ? 1 : -1);
  }
  const l = Math.sqrt(x * x + y * y + z * z) || 1;
  return [x / l, y / l, z / l];
}

/** De qué punto grueso sale la rama `k` (nunca del origen ni del destino). */
export function origenDeLaRama(semilla: number, k: number, tramos: number): number {
  if (tramos < 2) return 0;
  return 1 + Math.floor(azarDe(semilla, 240 + k) * (tramos - 1));
}

/* ─────────────────────────────── El estado ─────────────────────────────── */

/**
 * EL ESTADO DE LOS RAYOS, en arrays de tamaño fijo. Las piezas lo leen; `crearEfectosDelRayo` lo escribe con los
 * sucesos y `evaluarLosRayos` lo pone al día una vez por fotograma (bocas, luces, imagen).
 */
export class EstadoDeLosRayos {
  /** El número del asiento de quien mira esta pantalla (0 sin asiento): su carga oscurece los bordes y su pleno da
   *  el fogonazo de pantalla. Lo pone quien sabe quién es (`red/escenificar.ts`, o el banco). */
  yo = 0;

  /* LAS CARGAS: quién (0 libre), desde cuándo, cómo va, y cuándo acabó (NaN mientras sigue). */
  readonly cargaQuien = new Int32Array(CARGAS_A_LA_VEZ);
  readonly cargaDesde = new Float64Array(CARGAS_A_LA_VEZ);
  readonly cargaC = new Float64Array(CARGAS_A_LA_VEZ);
  readonly cargaNivel = new Uint8Array(CARGAS_A_LA_VEZ);
  readonly cargaFin = new Float64Array(CARGAS_A_LA_VEZ).fill(Number.NaN);
  /** 1 si acabó soltando (el rayo toma el relevo en el acto), 0 si se dejó (se apaga). */
  readonly cargaSoltada = new Uint8Array(CARGAS_A_LA_VEZ);
  /** Dónde está la mano (la boca) y los pies de quien carga, en este fotograma. */
  readonly bocaX = new Float64Array(CARGAS_A_LA_VEZ);
  readonly bocaY = new Float64Array(CARGAS_A_LA_VEZ);
  readonly bocaZ = new Float64Array(CARGAS_A_LA_VEZ);
  readonly piesX = new Float64Array(CARGAS_A_LA_VEZ);
  readonly piesZ = new Float64Array(CARGAS_A_LA_VEZ);
  readonly conBoca = new Uint8Array(CARGAS_A_LA_VEZ);

  /* LOS RAYOS: uno por disparo. `vivo` 0 libre. */
  readonly vivo = new Uint8Array(RAYOS_A_LA_VEZ);
  readonly quien = new Int32Array(RAYOS_A_LA_VEZ);
  readonly bala = new Int32Array(RAYOS_A_LA_VEZ);
  /** Cuándo salió (verdadero) y su instante presentado. */
  readonly t0 = new Float64Array(RAYOS_A_LA_VEZ);
  readonly t0p = new Float64Array(RAYOS_A_LA_VEZ);
  readonly ox = new Float64Array(RAYOS_A_LA_VEZ);
  readonly oy = new Float64Array(RAYOS_A_LA_VEZ);
  readonly oz = new Float64Array(RAYOS_A_LA_VEZ);
  readonly dx = new Float64Array(RAYOS_A_LA_VEZ);
  readonly dy = new Float64Array(RAYOS_A_LA_VEZ);
  readonly dz = new Float64Array(RAYOS_A_LA_VEZ);
  readonly nivel = new Uint8Array(RAYOS_A_LA_VEZ);
  readonly c = new Float64Array(RAYOS_A_LA_VEZ);
  readonly area = new Float64Array(RAYOS_A_LA_VEZ);
  readonly semilla = new Uint32Array(RAYOS_A_LA_VEZ);
  /** 1 si da en algo (y hay estallido en `ix, iy, iz`), 0 si no. */
  readonly impacto = new Uint8Array(RAYOS_A_LA_VEZ);
  /** Dónde estalla: lo predicho al soltar o lo que dijo la sala. Puede quedar antes del final del canal (`corte`). */
  readonly ix = new Float64Array(RAYOS_A_LA_VEZ);
  readonly iy = new Float64Array(RAYOS_A_LA_VEZ);
  readonly iz = new Float64Array(RAYOS_A_LA_VEZ);
  /**
   * LO QUE SE PINTA DEL CANAL, en fracción de su largo (1, entero). El canal de otro sale dibujado hasta la estructura
   * o hasta donde se predijo; si la sala lo para antes (un cuerpo que se cruza) cuando ya se ha visto, no se vuelve a
   * sembrar hacia el sitio nuevo (cambiaría de forma de golpe): se RECORTA ahí y su último tramo va a dar al estallido.
   */
  readonly corte = new Float64Array(RAYOS_A_LA_VEZ).fill(1);
  /** 1 si la sala ya lo confirmó con su `estalla`. */
  readonly confirmado = new Uint8Array(RAYOS_A_LA_VEZ);
  /** 1 si es sólo un estallido (un `estalla` cuyo `bala` no llegó a verse): no tiene canal que pintar. */
  readonly sinCanal = new Uint8Array(RAYOS_A_LA_VEZ);
  /** Cuándo llega el estallido (verdadero, y presentado): el de la cabeza, o el de la sala si llegó después. */
  readonly tImpacto = new Float64Array(RAYOS_A_LA_VEZ);
  readonly tImpactoP = new Float64Array(RAYOS_A_LA_VEZ);

  /* LAS MARCAS CHAMUSCADAS, en el suelo. */
  readonly marcaViva = new Uint8Array(MARCAS_A_LA_VEZ);
  readonly marcaX = new Float64Array(MARCAS_A_LA_VEZ);
  readonly marcaZ = new Float64Array(MARCAS_A_LA_VEZ);
  readonly marcaT0p = new Float64Array(MARCAS_A_LA_VEZ);
  readonly marcaFuerza = new Float64Array(MARCAS_A_LA_VEZ);

  /**
   * LO QUE EL RAYO PONE EN LA IMAGEN este fotograma (lo lee el posproceso): ver `evaluarLosRayos`. Además del fogonazo,
   * el golpe y la carga, EL CANAL que se ve ahora (el propio, o el más reciente): de dónde a dónde va en el mundo
   * (`canalO*` → `canalD*`) y cuánto está (`canal`, 0-1). El posproceso le da un brillo con peso propio: el halo del
   * posproceso se come un hilo de dos píxeles (ver `GLSL_BANDA_DEL_CANAL` en `posproceso/sombreadores.ts`).
   */
  readonly imagen = {
    fogonazo: 0,
    golpe: 0,
    golpeX: 0,
    golpeY: 0,
    golpeZ: 0,
    carga: 0,
    canal: 0,
    canalOX: 0,
    canalOY: 0,
    canalOZ: 0,
    canalDX: 0,
    canalDY: 0,
    canalDZ: 0,
  };

  /** Lo suelta todo (fin de la noche). */
  vaciar(): void {
    this.cargaQuien.fill(0);
    this.cargaFin.fill(Number.NaN);
    this.vivo.fill(0);
    this.marcaViva.fill(0);
    this.imagen.fogonazo = 0;
    this.imagen.golpe = 0;
    this.imagen.carga = 0;
    this.imagen.canal = 0;
    UNIFORMES_DEL_DESTELLO.uDestelloQ.value.fill(0);
    UNIFORMES_DEL_DESTELLO.uDestelloColorQ.value.fill(0);
    FOCO_DEL_DESTELLO.intensidad = 0;
  }

  /** La ranura de la carga de `quien`, o −1. */
  cargaDe(quien: number): number {
    for (let i = 0; i < CARGAS_A_LA_VEZ; i++) if (this.cargaQuien[i] === quien && quien !== 0) return i;
    return -1;
  }

  /** ¿Carga `quien` ahora (no acabada)? */
  cargando(quien: number): boolean {
    const i = this.cargaDe(quien);
    return i >= 0 && (this.cargaFin[i] as number) !== (this.cargaFin[i] as number);
  }
}

/** Lo que el rayo necesita del sistema de efectos (sin importarlo: `sistema.ts` importa este fichero). */
export interface SistemaParaElRayo {
  readonly reloj: RelojDePresentacion;
  readonly origen: number;
  readonly nivel: Nivel;
  readonly rayos: EstadoDeLosRayos;
  readonly chispas: {
    lanzar(tope: number, ox: number, oy: number, oz: number, vx: number, vy: number, vz: number, nace: number, vida: number, talla: number, color: number, brillo?: number, enfria?: boolean): void;
  };
  readonly localizar: ((quien: number, salida: PuntoDelRayo) => boolean) | null;
  readonly boca: BocaDe | null;
}

/* ─────────────────────────────── Las llamadas (EfectosDelRayo) ─────────────────────────────── */

function entre01(x: number): number {
  return x <= 0 || !(x === x) ? 0 : x >= 1 ? 1 : x;
}

/** La ranura libre de número más bajo, o la tomada hace más tiempo. */
function tomarRanura(vivas: Uint8Array | Int32Array, desde: Float64Array): number {
  let vieja = 0;
  for (let i = 0; i < vivas.length; i++) {
    if (vivas[i] === 0) return i;
    if ((desde[i] as number) < (desde[vieja] as number)) vieja = i;
  }
  return vieja;
}

/**
 * Las chispas de un estallido, sembradas: repartidas por todos lados con algo más hacia atrás del rayo y hacia arriba,
 * y con rapideces muy distintas (una corona de chispas iguales y del mismo largo, vista desde el hombro, era la
 * estrella de pinchos de una viñeta).
 */
function soltarChispas(s: SistemaParaElRayo, x: number, y: number, z: number, dirX: number, dirZ: number, c: number, t: number, semilla: number): void {
  const f = 0.4 + 0.6 * entre01(c);
  const cuantas = chispasDelImpacto(f, ajuste('chispasPorImpacto', s.nivel));
  const tope = ajuste('chispasVivas', s.nivel);
  const v = velocidadDeLasChispas(f) * 1.15;
  const naceS = (s.reloj.presentado(t) - s.origen) / 1000;
  for (let k = 0; k < cuantas; k++) {
    const u = azarDe(semilla, 300 + k * 3) * 2 - 1;
    const a = azarDe(semilla, 301 + k * 3) * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    let vx = r * Math.cos(a) - dirX * 0.55;
    let vy = Math.abs(u) * 0.8 + 0.35;
    let vz = r * Math.sin(a) - dirZ * 0.55;
    const l = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
    const q = azarDe(semilla, 302 + k * 3);
    const rapidez = v * (0.2 + 0.8 * q * q);
    vx = (vx / l) * rapidez;
    vy = (vy / l) * rapidez;
    vz = (vz / l) * rapidez;
    /*
     * Chispas INCANDESCENTES: finas (dos o tres centímetros: un trazo de luz, no un palito), muy brillantes al nacer
     * (HDR), y se enfrían del blanco al ámbar y al rojo antes de apagarse (`enfria`). Las vidas, muy repartidas: unas
     * se van en el acto y otras caen hasta el suelo.
     */
    const vida = (0.16 + 0.42 * f) * (0.3 + 0.7 * azarDe(semilla, 400 + k));
    const brillo = (2.2 + 2.3 * f) * (0.6 + 0.4 * azarDe(semilla, 410 + k));
    s.chispas.lanzar(tope, x, y, z, vx, vy, vz, naceS, vida, 0.018 + 0.014 * f, k % 3 === 2 ? COLORES_DEL_RAYO.carga : COLORES_DEL_RAYO.chispa, brillo, true);
  }
}

/**
 * DÓNDE ACABA EL CANAL si estalla en `(x, y, z)`: la fracción del canal de `i` en que cae (y el canal se recorta ahí),
 * o −1 si cae fuera de él (más allá de su final, detrás de la boca o lejos de su recta: entonces el canal va a él).
 */
export function corteDelCanal(r: EstadoDeLosRayos, i: number, x: number, y: number, z: number): number {
  const ox = r.ox[i] as number;
  const oy = r.oy[i] as number;
  const oz = r.oz[i] as number;
  const ex = (r.dx[i] as number) - ox;
  const ey = (r.dy[i] as number) - oy;
  const ez = (r.dz[i] as number) - oz;
  const l2 = ex * ex + ey * ey + ez * ez;
  if (!(l2 > 1e-6)) return -1;
  const k = ((x - ox) * ex + (y - oy) * ey + (z - oz) * ez) / l2;
  const px = ox + ex * k - x;
  const py = oy + ey * k - y;
  const pz = oz + ez * k - z;
  /* Cerca de la recta: metro y medio, o el décimo del canal (su quiebro grueso no pasa de ahí). */
  const cerca = Math.max(1.5, 0.1 * Math.sqrt(l2));
  return k > 0.02 && k <= 1.001 && px * px + py * py + pz * pz <= cerca * cerca ? Math.min(1, k) : -1;
}

/**
 * Pone el estallido del rayo `i` en `(x, y, z)` a partir de `t` (verdadero): chispas y, con carga, la marca. Si cae
 * sobre el canal, el canal se recorta ahí (`corte`); si no, se vuelve a trazar hacia él.
 */
function ponerElEstallido(s: SistemaParaElRayo, i: number, x: number, y: number, z: number, t: number): void {
  const r = s.rayos;
  r.impacto[i] = 1;
  r.ix[i] = x;
  r.iy[i] = y;
  r.iz[i] = z;
  const k = r.sinCanal[i] === 1 ? -1 : corteDelCanal(r, i, x, y, z);
  if (k > 0) r.corte[i] = k;
  else {
    r.dx[i] = x;
    r.dy[i] = y;
    r.dz[i] = z;
    r.corte[i] = 1;
  }
  r.tImpacto[i] = t;
  r.tImpactoP[i] = s.reloj.presentado(t);
  const ex = x - (r.ox[i] as number);
  const ez = z - (r.oz[i] as number);
  const l = Math.sqrt(ex * ex + ez * ez) || 1;
  const c = r.c[i] as number;
  soltarChispas(s, x, y, z, ex / l, ez / l, c, t, (r.semilla[i] as number) ^ 0x5bd1e995);
  if (c >= CARGA_QUE_CHAMUSCA) {
    const m = tomarRanura(r.marcaViva, r.marcaT0p);
    r.marcaViva[m] = 1;
    r.marcaX[m] = x;
    r.marcaZ[m] = z;
    r.marcaT0p[m] = r.tImpactoP[i] as number;
    r.marcaFuerza[m] = c;
  }
}

/**
 * LOS EFECTOS DEL RAYO de un sistema. Con `s`, los de verdad; sin él (un doble de prueba que no pinta), los nulos del
 * contrato. La firma es de EFECTOS (CONTRATO §2.5).
 */
export function crearEfectosDelRayo(s?: SistemaParaElRayo): EfectosDelRayo {
  if (s === undefined) return EFECTOS_DEL_RAYO_NULOS;
  const r = s.rayos;

  const empezar = (quien: number, t: number): number => {
    let i = r.cargaDe(quien);
    if (i < 0) {
      /* Una ranura libre, o la de la carga acabada más vieja, o la que empezó antes. */
      i = -1;
      for (let k = 0; k < CARGAS_A_LA_VEZ && i < 0; k++) if (r.cargaQuien[k] === 0) i = k;
      for (let k = 0; k < CARGAS_A_LA_VEZ && i < 0; k++) if ((r.cargaFin[k] as number) === (r.cargaFin[k] as number)) i = k;
      if (i < 0) i = tomarRanura(r.cargaQuien, r.cargaDesde);
    }
    r.cargaQuien[i] = quien;
    r.cargaDesde[i] = t;
    r.cargaC[i] = 0;
    r.cargaNivel[i] = 1;
    r.cargaFin[i] = Number.NaN;
    r.cargaSoltada[i] = 0;
    r.conBoca[i] = 0;
    return i;
  };

  return {
    empezarCarga(quien, t) {
      if (!(quien > 0) || !Number.isFinite(t)) return;
      empezar(quien, t);
    },

    actualizarCarga(quien: number, estado: Readonly<EstadoDelRayo>, t: number) {
      if (!(quien > 0)) return;
      let i = r.cargaDe(quien);
      /* Una carga acabada que vuelve a llegar es otra carga (se soltó y se volvió a pulsar). */
      if (i >= 0 && (r.cargaFin[i] as number) === (r.cargaFin[i] as number)) i = -1;
      if (i < 0) i = empezar(quien, Number.isFinite(estado.desdeMs) ? estado.desdeMs : t);
      r.cargaC[i] = entre01(estado.c);
      r.cargaNivel[i] = Math.max(1, Math.min(8, Math.floor(estado.nivel) || 1));
    },

    cancelarCarga(quien, t) {
      const i = r.cargaDe(quien);
      if (i < 0 || (r.cargaFin[i] as number) === (r.cargaFin[i] as number)) return;
      r.cargaFin[i] = t;
      r.cargaSoltada[i] = 0;
    },

    soltar(d: DisparoDelRayo) {
      if (!Number.isFinite(d.t) || !Number.isFinite(d.origen.x) || !Number.isFinite(d.destino.x)) return;
      const k = r.cargaDe(d.quien);
      if (k >= 0) {
        r.cargaFin[k] = d.t;
        r.cargaSoltada[k] = 1;
      }
      /* Un rayo propio ya soltado no se suelta dos veces (el `bala` que llega luego sólo da su número). */
      const i = tomarRanura(r.vivo, r.t0);
      r.vivo[i] = 1;
      r.quien[i] = d.quien;
      r.bala[i] = d.bala;
      r.t0[i] = d.t;
      r.t0p[i] = s.reloj.presentado(d.t);
      r.ox[i] = d.origen.x;
      r.oy[i] = d.origen.y;
      r.oz[i] = d.origen.z;
      r.dx[i] = d.destino.x;
      r.dy[i] = d.destino.y;
      r.dz[i] = d.destino.z;
      r.nivel[i] = Math.max(1, Math.min(8, Math.floor(d.nivel) || 1));
      r.c[i] = entre01(d.c);
      r.area[i] = Math.max(0, Number.isFinite(d.area) ? d.area : 0);
      r.semilla[i] = d.semilla >>> 0;
      r.impacto[i] = 0;
      r.confirmado[i] = 0;
      r.sinCanal[i] = 0;
      r.corte[i] = 1;
      r.tImpacto[i] = Number.NaN;
      r.tImpactoP[i] = Number.NaN;
      /* Lo que se sabe al soltar: si da, el estallido va en el destino al llegar la cabeza (el propio, predicho). */
      if (d.dio === true) ponerElEstallido(s, i, d.destino.x, d.destino.y, d.destino.z, d.t + llegadaDelRayo(r.c[i] as number));
    },

    estallar(e: EstallidoDelRayo) {
      if (!Number.isFinite(e.x) || !Number.isFinite(e.z) || !Number.isFinite(e.t)) return;
      /* ¿De qué rayo es? El suyo por su bala; el propio (que salió con bala 0), el último de quien sin confirmar. */
      let i = -1;
      for (let k = 0; k < RAYOS_A_LA_VEZ && i < 0; k++) if (r.vivo[k] === 1 && e.bala !== 0 && r.bala[k] === e.bala) i = k;
      for (let k = 0; k < RAYOS_A_LA_VEZ && i < 0; k++) {
        if (r.vivo[k] === 1 && r.bala[k] === 0 && r.quien[k] === e.quien && r.confirmado[k] === 0 && e.t - (r.t0[k] as number) < ESPERA_DEL_ESTALLIDO_MS) i = k;
      }
      if (i < 0) {
        /* Un `estalla` sin rayo visto (su `bala` no llegó a verse): el estallido solo, desde encima. */
        i = tomarRanura(r.vivo, r.t0);
        r.vivo[i] = 1;
        r.quien[i] = e.quien;
        r.bala[i] = e.bala;
        r.t0[i] = e.t - llegadaDelRayo(e.nivel >= 4 ? 1 : 0.3);
        r.t0p[i] = s.reloj.presentado(r.t0[i] as number);
        r.ox[i] = e.x;
        r.oy[i] = e.y + 6;
        r.oz[i] = e.z;
        r.nivel[i] = Math.max(1, e.nivel);
        r.c[i] = e.nivel >= 4 ? 1 : e.nivel >= 1 ? (e.nivel - 1) / 3 : 0.3;
        r.area[i] = Math.max(0, e.area);
        r.semilla[i] = (e.bala * 2654435761) >>> 0;
        r.impacto[i] = 0;
        r.sinCanal[i] = 1;
        r.corte[i] = 1;
      }
      r.bala[i] = e.bala;
      r.confirmado[i] = 1;
      if (e.area > 0) r.area[i] = e.area;
      const cuando = Math.max(e.t, (r.t0[i] as number) + llegadaDelRayo(r.c[i] as number));
      if (r.impacto[i] === 1) {
        /*
         * Ya se predijo: si la sala lo pone cerca, se queda donde estaba (no salta); si lejos, se mueve (y el canal, si
         * cae sobre él, se recorta: `ponerElEstallido`).
         */
        const ex = e.x - (r.ix[i] as number);
        const ez = e.z - (r.iz[i] as number);
        if (ex * ex + ez * ez <= Math.max(1.5, r.area[i] as number) ** 2) return;
      }
      ponerElEstallido(s, i, e.x, e.y, e.z, cuando);
    },
  };
}

/* ─────────────────────────────── Cada fotograma: bocas, luces e imagen ─────────────────────────────── */

/**
 * EL FOCO DEL DESTELLO (N2-N3, EL-RAYO.md §4: «un foco reservado con intensidad 0 que se enciende»): el destello más
 * fuerte de este fotograma, ENTERO, para la luz de verdad que `atmosfera/luz.ts` tiene reservada. En los uniformes del
 * destello (cuerpos y tarjetas) ese mismo va rebajado desde N2 (`DESTELLO_BAJO_EL_FOCO`): el foco ya alumbra la calle
 * y los cuerpos, y contarlo dos veces los quemaría. `intensidad` 0 = apagado.
 */
export const FOCO_DEL_DESTELLO = { x: 0, y: 0, z: 0, alcance: 0, r: 0, g: 0, b: 0, intensidad: 0 };
/** Lo que queda en los uniformes del destello que ya pinta el foco (N2-N3). */
export const DESTELLO_BAJO_EL_FOCO = 0.35;

const PUNTO: PuntoDelRayo = { x: 0, y: 0, z: 0 };

/** Un destello candidato: dónde, hasta dónde, qué color y cuánto (sin asignar: arrays de 5 plazas). */
const CAND_X = new Float64Array(DESTELLOS_COMO_MUCHO + 1);
const CAND_Y = new Float64Array(DESTELLOS_COMO_MUCHO + 1);
const CAND_Z = new Float64Array(DESTELLOS_COMO_MUCHO + 1);
const CAND_ALCANCE = new Float64Array(DESTELLOS_COMO_MUCHO + 1);
const CAND_R = new Float64Array(DESTELLOS_COMO_MUCHO + 1);
const CAND_G = new Float64Array(DESTELLOS_COMO_MUCHO + 1);
const CAND_B = new Float64Array(DESTELLOS_COMO_MUCHO + 1);
const CAND_I = new Float64Array(DESTELLOS_COMO_MUCHO + 1);
let candidatos = 0;

const CAND_FOCO = new Float64Array(DESTELLOS_COMO_MUCHO + 1);

/**
 * Mete un destello en la lista de los más fuertes (como mucho `DESTELLOS_COMO_MUCHO`), sin asignar. `foco` es lo
 * que pesa si lo toma el foco de N2-N3: la carga, poco (una lámpara en la mano no alumbra la calle).
 */
function candidato(x: number, y: number, z: number, alcance: number, color: readonly [number, number, number], intensidad: number, foco = 1): void {
  if (!(intensidad > 0.01)) return;
  let k = candidatos;
  if (k >= DESTELLOS_COMO_MUCHO) {
    /* Lleno: sólo entra si pesa más que el más flojo, que sale. */
    let flojo = 0;
    for (let j = 1; j < DESTELLOS_COMO_MUCHO; j++) if ((CAND_I[j] as number) < (CAND_I[flojo] as number)) flojo = j;
    if ((CAND_I[flojo] as number) >= intensidad) return;
    k = flojo;
  } else candidatos++;
  CAND_X[k] = x;
  CAND_Y[k] = y;
  CAND_Z[k] = z;
  CAND_ALCANCE[k] = alcance;
  CAND_R[k] = color[0] * intensidad;
  CAND_G[k] = color[1] * intensidad;
  CAND_B[k] = color[2] * intensidad;
  CAND_I[k] = intensidad;
  CAND_FOCO[k] = foco;
}

/**
 * EL PARPADEO DE LA CARGA: la luz de la mano no es una bombilla; chisporrotea, y más cuanto más cargada. Un azar
 * sembrado por tramos de 40 ms, suavizado para que no parpadee a pantalla completa (fotosensibilidad).
 */
export function parpadeoDeLaCarga(quien: number, t: number, c: number): number {
  const tramo = Math.floor(t / 40);
  const a = azarDe(quien * 977 + 13, tramo);
  const b = azarDe(quien * 977 + 13, tramo + 1);
  const u = (t - tramo * 40) / 40;
  return 1 - (0.12 + 0.2 * c) * (a + (b - a) * u);
}

/**
 * PONE AL DÍA LOS RAYOS en `t` (reloj verdadero): suelta lo que ya acabó, coloca las manos de quien carga, elige
 * los destellos que alumbran este fotograma (`UNIFORMES_DEL_DESTELLO`) y lo que el rayo pone en la imagen. Una vez
 * por fotograma, lo llama la raíz de los efectos detrás de `sistema.fotograma`. No asigna.
 */
export function evaluarLosRayos(s: SistemaParaElRayo, t: number): void {
  const r = s.rayos;
  const tp = s.reloj.presentado(t);
  const q = s.nivel;
  const yo = r.yo;
  candidatos = 0;
  let fogonazo = 0;
  let golpe = 0;
  let cargaPropia = 0;

  /* Mis pies, para saber si un pleno ajeno me cae cerca (el fogonazo de pantalla). */
  let yoX = Number.NaN;
  let yoZ = Number.NaN;
  if (yo > 0 && s.localizar !== null && s.localizar(yo, PUNTO)) {
    yoX = PUNTO.x;
    yoZ = PUNTO.z;
  }

  /* LAS CARGAS: la mano de cada una, su luz y la viñeta de la propia. */
  for (let i = 0; i < CARGAS_A_LA_VEZ; i++) {
    const quien = r.cargaQuien[i] as number;
    if (quien === 0) continue;
    const fin = r.cargaFin[i] as number;
    if (fin === fin && (r.cargaSoltada[i] === 1 || t > fin + APAGADO_DE_LA_CARGA_MS)) {
      r.cargaQuien[i] = 0;
      continue;
    }
    if (s.localizar !== null && s.localizar(quien, PUNTO)) {
      r.piesX[i] = PUNTO.x;
      r.piesZ[i] = PUNTO.z;
      if (r.conBoca[i] === 0) {
        r.bocaX[i] = PUNTO.x;
        r.bocaY[i] = ALTO_DE_LA_BOCA_SIN_MANO;
        r.bocaZ[i] = PUNTO.z;
      }
      r.conBoca[i] = 1;
    }
    if (s.boca !== null && s.boca(quien, PUNTO)) {
      r.bocaX[i] = PUNTO.x;
      r.bocaY[i] = PUNTO.y;
      r.bocaZ[i] = PUNTO.z;
      r.conBoca[i] = 1;
    }
    if (r.conBoca[i] === 0) continue;
    const c = r.cargaC[i] as number;
    const apaga = fin === fin ? Math.max(0, 1 - (t - fin) / APAGADO_DE_LA_CARGA_MS) : 1;
    /* Una lámpara pequeña en la mano: alumbra el cuerpo y, desde N2, un corro de suelo (no la calle). */
    const luz = (0.12 + 0.55 * c) * apaga * parpadeoDeLaCarga(quien, t, c);
    candidato(r.bocaX[i] as number, r.bocaY[i] as number, r.bocaZ[i] as number, 1.8 + 2.7 * c, AMBAR, luz, 0.25);
    if (quien === yo) cargaPropia = Math.max(cargaPropia, c * apaga);
  }

  /* LOS RAYOS: la boca, el canal, el estallido, el fogonazo y el golpe. */
  const img = r.imagen;
  let canal = 0;
  let canalPropio = false;
  let canalT0 = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < RAYOS_A_LA_VEZ; i++) {
    if (r.vivo[i] === 0) continue;
    const ms = t - (r.t0[i] as number);
    const msp = tp - (r.t0p[i] as number);
    if (ms > VIDA_DEL_RAYO_MS && msp > VIDA_DEL_RAYO_MS) {
      r.vivo[i] = 0;
      continue;
    }
    if (ms < 0) continue;
    const c = r.c[i] as number;
    const descargas = descargasDelRayo(c, q);
    const sinCanal = r.sinCanal[i] === 1;
    /* El fogonazo de la boca, que alumbra a quien dispara (y vuelve con cada descarga). */
    if (!sinCanal) {
      const boca = (0.3 + 0.5 * c) * destelloDeLaBoca(ms, c, descargas);
      candidato(r.ox[i] as number, r.oy[i] as number, r.oz[i] as number, 3 + 3 * c, CALIENTE, boca, 0.6);
    }
    /* Dónde acaba: donde estalla o, si no da en nada, el final del canal. */
    const da = r.impacto[i] === 1;
    const fx = (da ? r.ix[i] : r.dx[i]) as number;
    const fy = (da ? r.iy[i] : r.dy[i]) as number;
    const fz = (da ? r.iz[i] : r.dz[i]) as number;
    if (!sinCanal) {
      const ox = r.ox[i] as number;
      const oy = r.oy[i] as number;
      const oz = r.oz[i] as number;
      /*
       * LA LUZ DEL CANAL: una lámpara en su mitad, con alcance hasta sus puntas, mientras descarga. Al foco de N2-N3 le
       * pesa poco (el foco es del estallido): va a los cuerpos y al reflejo del suelo mojado (las tarjetas).
       */
      const largo = Math.sqrt((fx - ox) * (fx - ox) + (fy - oy) * (fy - oy) + (fz - oz) * (fz - oz));
      const luz = luzDelCanal(ms, c, descargas) * 1.6;
      candidato((ox + fx) * 0.5, Math.max(0.8, (oy + fy) * 0.5), (oz + fz) * 0.5, Math.min(16, 0.5 * largo + 4), CALIENTE, luz, 0.3);
      /*
       * EL CANAL QUE SE VE AHORA, para el brillo con peso propio del posproceso: mientras se pinta (hasta que se apaga su
       * estela, en el reloj presentado), el propio antes que el de otro y, entre dos, el más reciente.
       */
      const sE = (msp - inicioDeLaEstela(c, descargas)) / duracionDeLaEstela(c, q);
      const esPropio = (r.quien[i] as number) === yo && yo > 0;
      if (sE < 1 && (canal === 0 || (esPropio && !canalPropio) || (esPropio === canalPropio && (r.t0[i] as number) > canalT0))) {
        canal = 1 - Math.max(0, sE);
        canalPropio = esPropio;
        canalT0 = r.t0[i] as number;
        img.canalOX = ox;
        img.canalOY = oy;
        img.canalOZ = oz;
        img.canalDX = fx;
        img.canalDY = fy;
        img.canalDZ = fz;
      }
    }
    if (da) {
      const msi = ms - ((r.tImpacto[i] as number) - (r.t0[i] as number)) + llegadaDelRayo(c);
      /*
       * ×2,6: con ×4, el blanco (a un palmo del estallido) y los cuerpos de alrededor se quemaban a blanco y, desde el
       * hombro, su brillo tapaba el final del canal. La calle la alumbra el foco (N2-N3), que tiene su propia cuenta.
       */
      const luz = luzDelEstallido(msi, c, descargas) * 2.6;
      candidato(fx, Math.max(0.6, fy - 0.2), fz, 6 + 8 * c, CALIENTE, luz);
    }
    const propio = (r.quien[i] as number) === yo && yo > 0;
    let cerca = propio ? 1 : 0;
    if (!propio && yoX === yoX) {
      const ex = fx - yoX;
      const ez = fz - yoZ;
      cerca = ex * ex + ez * ez < 144 ? 0.4 : 0;
    }
    if (cerca > 0) {
      fogonazo = Math.max(fogonazo, fogonazoDelRayo(ms, c) * cerca);
      const g = golpeDelRayo(ms, c) * cerca;
      if (g > golpe) {
        golpe = g;
        r.imagen.golpeX = fx;
        r.imagen.golpeY = fy;
        r.imagen.golpeZ = fz;
      }
    }
  }

  /* LAS MARCAS: se sueltan al acabar. */
  for (let i = 0; i < MARCAS_A_LA_VEZ; i++) if (r.marcaViva[i] === 1 && tp - (r.marcaT0p[i] as number) > MARCA_MS) r.marcaViva[i] = 0;

  /*
   * El más fuerte PARA EL FOCO de N2-N3 (su intensidad por lo que pesa en él: la luz del canal, que es mucha y pesa poco,
   * no le quita el foco al estallido), entero.
   */
  let fuerte = -1;
  for (let k = 0; k < candidatos; k++) {
    if (fuerte < 0 || (CAND_I[k] as number) * (CAND_FOCO[k] as number) > (CAND_I[fuerte] as number) * (CAND_FOCO[fuerte] as number)) fuerte = k;
  }
  const foco = FOCO_DEL_DESTELLO;
  if (fuerte >= 0) {
    const peso = CAND_FOCO[fuerte] as number;
    foco.x = CAND_X[fuerte] as number;
    foco.y = CAND_Y[fuerte] as number;
    foco.z = CAND_Z[fuerte] as number;
    foco.alcance = CAND_ALCANCE[fuerte] as number;
    foco.r = (CAND_R[fuerte] as number) * peso;
    foco.g = (CAND_G[fuerte] as number) * peso;
    foco.b = (CAND_B[fuerte] as number) * peso;
    foco.intensidad = (CAND_I[fuerte] as number) * peso;
  } else foco.intensidad = 0;

  /* Los destellos que alumbran, en los uniformes (los que sobran, apagados). */
  const pos = UNIFORMES_DEL_DESTELLO.uDestelloQ.value;
  const col = UNIFORMES_DEL_DESTELLO.uDestelloColorQ.value;
  for (let k = 0; k < DESTELLOS_COMO_MUCHO; k++) {
    if (k < candidatos) {
      /* Lo que ya pinta el foco (N2-N3) se rebaja aquí; la parte que el foco no lleva (su peso < 1), no. */
      const bajo = q >= 2 && k === fuerte ? 1 - (1 - DESTELLO_BAJO_EL_FOCO) * (CAND_FOCO[k] as number) : 1;
      pos[k * 4] = CAND_X[k] as number;
      pos[k * 4 + 1] = CAND_Y[k] as number;
      pos[k * 4 + 2] = CAND_Z[k] as number;
      pos[k * 4 + 3] = CAND_ALCANCE[k] as number;
      col[k * 4] = (CAND_R[k] as number) * bajo;
      col[k * 4 + 1] = (CAND_G[k] as number) * bajo;
      col[k * 4 + 2] = (CAND_B[k] as number) * bajo;
      col[k * 4 + 3] = 0;
    } else {
      pos[k * 4 + 3] = 0;
      col[k * 4] = 0;
      col[k * 4 + 1] = 0;
      col[k * 4 + 2] = 0;
    }
  }
  r.imagen.fogonazo = Math.min(FOGONAZO_MAXIMO, fogonazo);
  r.imagen.golpe = Math.min(1, golpe);
  r.imagen.carga = cargaPropia;
  r.imagen.canal = canal;
}

/** El color de la estela a `s` de su vida (0 recién hecha, 1 apagada): del blanco caliente al ámbar oscuro. */
export function colorDeLaEstela(s: number, salida: Float32Array, desde: number): void {
  const x = entre01(s);
  /* Dos tramos: del caliente al filo (0-0,35) y del filo al frío. */
  if (x < 0.35) {
    const u = x / 0.35;
    for (let k = 0; k < 3; k++) salida[desde + k] = (CALIENTE[k] as number) + ((FILO[k] as number) - (CALIENTE[k] as number)) * u;
  } else {
    const u = (x - 0.35) / 0.65;
    for (let k = 0; k < 3; k++) salida[desde + k] = (FILO[k] as number) + ((FRIO[k] as number) - (FILO[k] as number)) * u;
  }
}

/** Los colores lineales de la paleta del rayo, para las piezas. */
export const LINEALES_DEL_RAYO = { NUCLEO, FILO, CALIENTE, FRIO, AMBAR } as const;
