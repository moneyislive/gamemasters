/**
 * LA CÁMARA DEL QUIEBRO, EN NÚMEROS: al hombro, que no atraviesa la ciudad, que encuadra sola y que
 * sube a vigía. Sin three: sale un punto, un punto al que mirar y un campo de visión.
 *
 * ═══ LO QUE PIDE EL DISEÑO (§7) Y CÓMO SE CUMPLE ═══
 *
 *   · AL HOMBRO, 3,2 m detrás y 1,7 m de alto, algo a la derecha para que el cuerpo no tape el blanco.
 *     Se abre a 4 m con enemigos a menos de 5 m: en una pelea hace falta ver quién viene por los lados.
 *     No se balancea al correr: el cuerpo corre, la cámara no (marea en un teléfono).
 *   · NO ATRAVIESA LA ESTRUCTURA. Del pecho del desvelado a donde querría estar la cámara se tira un
 *     tramo y se prueba contra las cajas del barrio como cajas DE VERDAD, con su alto: la prueba de losa
 *     de siempre, en tres ejes. Si choca, la cámara se pone delante del choque. Acercarse es inmediato
 *     (una pared no puede asomar ni un fotograma); alejarse otra vez, suave.
 *   · AUTOMÁTICA: si hay un blanco enganchado y el dedo no ha tocado la cámara en 2 s, gira sola para
 *     tenerlo delante. Si el dedo la toca, manda el dedo.
 *   · EL REMANSO: orbita 20° y cierra el campo 8°, con la intensidad del reloj de presentación.
 *   · VIGÍA (el rol sin cuerpo): cenital a 25 m sobre el sitio que se vigila.
 *
 * Es adorno: la cámara no decide nada del juego. Por eso aquí se permite la coma flotante y la
 * trigonometría; lo que sí sale de aquí y vuelve al juego (la dirección de la palanca) sólo elige, y
 * la sala valida.
 */

/** Una caja de la estructura en metros, con su alto: lo que tapa a la cámara. */
export interface CajaAlta {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  readonly alto: number;
}

export interface Punto3 {
  x: number;
  y: number;
  z: number;
}

/** La cámara al hombro, a secas (diseño §7). */
export const DISTANCIA_AL_HOMBRO = 3.2;
export const DISTANCIA_ABIERTA = 4;
/** Con enemigos a menos de esto, se abre. */
export const ENEMIGOS_CERCA_M = 5;
export const ALTO_DE_LA_CAMARA = 1.7;
/**
 * El pivote: el pecho del desvelado, y a la derecha (el «hombro»). Con 0,45 m el cuerpo quedaba casi en
 * el centro de la pantalla (al 44 % del ancho), tapando justo lo que viene; a 0,7 m queda a la izquierda
 * del centro (al 41 % en PC, como en el encuadre de referencia de Miguel) y el centro queda libre para el
 * blanco. Sigue a 3,2 m DETRÁS del pivote y a 1,7 m de alto (diseño §7): sólo se corre el hombro.
 */
export const ALTO_DEL_PIVOTE = 1.5;
export const HOMBRO_M = 0.7;
/** El cabeceo, en radianes: de −10° a +35° (positivo = la cámara sube y mira hacia abajo). */
export const CABECEO_MINIMO = (-10 * Math.PI) / 180;
export const CABECEO_MAXIMO = (35 * Math.PI) / 180;
/** El cabeceo con que se queda la cámara a 1,7 m de alto y 3,2 m detrás. */
export const CABECEO_DE_REPOSO = Math.asin((ALTO_DE_LA_CAMARA - ALTO_DEL_PIVOTE) / DISTANCIA_AL_HOMBRO);
/** Campo de visión: 75° en el móvil, 70° en PC. */
export const FOV_MOVIL = 75;
export const FOV_PC = 70;
/**
 * EL ENCUADRE DE CINE: UNA PROPUESTA, NO LO QUE SE JUEGA. El campo de visión de 70° es VERTICAL (es el
 * `fov` de three): en una pantalla de 16:9 son 102° en horizontal, y con él los edificios se van al
 * fondo, la plaza parece enorme y el desvelado ocupa el 42 % del alto (en la referencia de Miguel, más
 * del 70 %, cortado por el muslo). La propuesta de dirección de arte: fijar el HORIZONTAL en 78°, sacar
 * de él el vertical según la forma de la pantalla (49° en 16:9, 63° en 4:3, 75° en vertical, entre 48 y
 * 75), acercar la cámara de 3,2 a 2,5 m y dejar que en la pelea se abra a 3,6 m y 6° más.
 *
 * Cambia cifras del §7 del diseño (y las que mira `scripts/verificar-quiebro-juego.ts`), así que NO se
 * aplica sin el visto bueno de Miguel. Mientras, se puede MIRAR en desarrollo con `?encuadre=cine` (la
 * lupa de `posproceso/lupa.ts` corrige la cámara del juego justo antes de pintar). Adoptarla es usar
 * estas constantes en `encuadrar` (con el aspecto del lienzo en la situación) y cambiar el §7.
 */
export const FOV_HORIZONTAL_DE_CINE = 78;
export const FOV_VERTICAL_DE_CINE_MINIMO = 48;
export const FOV_VERTICAL_DE_CINE_MAXIMO = 75;
export const DISTANCIA_DE_CINE = 2.5;
export const DISTANCIA_ABIERTA_DE_CINE = 3.6;
export const FOV_ABIERTO_DE_CINE = 6;
/** El Remanso: 20° de órbita y 8° menos de campo. */
export const ORBITA_DEL_REMANSO = (20 * Math.PI) / 180;
export const FOV_DEL_REMANSO = 8;

/*
 * ═══ EL ZOOM DEL RAYO (`docs/quiebro/EL-RAYO.md` §1.1 y §3) ═══
 *
 * Mientras se carga, el campo se cierra hasta 10° con la carga: un acercamiento LIGERO, como el de quien entorna
 * los ojos para apuntar (75° → 65° en el teléfono), sin mira de arma. El zoom es sólo el campo; lo que se mueve la
 * cámara es el ENCUADRE DE APUNTAR (abajo), que va aparte. La carga que llega aquí ya viene suavizada
 * (`suavizarElZoom`): entra en ≈0,25 s y sale en ≈0,12 s, y empieza por una parte (`ZOOM_AL_EMPEZAR`) al pulsar —el
 * zoom se nota ya en el primer cuarto de segundo— y sigue cerrándose con la carga, más al final (como el
 * francotirador que contiene la respiración).
 *
 * ═══ EL ENCUADRE DE APUNTAR (decisión del coordinador del rayo, 26-sep; común a MANDOS y EFECTOS) ═══
 *
 * Al hombro de siempre (0,7 m) el cuerpo queda al 41 % del ancho y la mira al 50 %: lo que se apunta, y la línea de
 * la mano a ello, van pegados a la espalda, y lo que hay detrás del cuerpo no se ve. Mientras se carga, la cámara
 * pasa a un encuadre de apuntar, con la MISMA exponencial que el zoom (entra en ≈0,25 s, sale en ≈0,12 s):
 *   · el hombro de 0,7 a `HOMBRO_DE_APUNTAR` (1,05 m): el cuerpo se va a un lado y deja libre el centro;
 *   · la cámara `BAJADA_AL_APUNTAR` (0,15 m) más baja con el cabeceo de reposo (a la altura del hombro de quien
 *     apunta: de 1,7 a 1,55 m), sin cambiar hacia dónde mira;
 *   · y `ACERCAMIENTO_AL_APUNTAR` (0,6 m) más cerca (de 3,2 a 2,6 m; de 4 a 3,4 abierta), que el zoom de campo sigue
 *     aparte.
 * NO SE PELEA CON LAS PAREDES. El acercamiento no pasa por el «acercarse en el acto» de la pared: la distancia es la
 * menor de la que deja la pared (`estado.distancia`, con su regla de siempre) y la de apuntar (suave), así que
 * contra una pared manda la pared y en abierto la curva; ninguna de las dos salta. El hombro de más se corta en la
 * pared de la derecha (en el acto, como la distancia: el hombro no puede meterse en una caja, que pondría la cámara
 * a la distancia mínima de golpe) y vuelve a abrirse suave. Sin carga no cambia nada: `apunte` es 0 exacto (se
 * redondea a cero al acabar de salir) y las cuentas son las de siempre.
 */
/** Lo que se cierra el campo con la carga llena, en grados. */
export const FOV_DE_LA_CARGA = 10;
/** La parte del zoom que entra sólo con pulsar (y el resto con la carga). */
export const ZOOM_AL_EMPEZAR = 0.25;
/** Lo que tarda el zoom en entrar y en salir: el 95 % en ese rato (tres constantes de tiempo). */
export const ZOOM_ENTRA_S = 0.25;
export const ZOOM_SALE_S = 0.12;
/** El golpe de campo del disparo: −2° en el acto, que vuelve en 150 ms. */
export const RETROCESO_DEL_DISPARO = 2;
export const RETROCESO_MS = 150;

/** EL ZOOM QUE SE QUIERE con la carga `c` (0..1): nada sin cargar; al pulsar, `ZOOM_AL_EMPEZAR`; lleno en el pleno. */
export function zoomDeLaCarga(cargando: boolean, c: number): number {
  if (!cargando) return 0;
  const x = Number.isFinite(c) ? Math.max(0, Math.min(1, c)) : 0;
  return ZOOM_AL_EMPEZAR + (1 - ZOOM_AL_EMPEZAR) * x * Math.sqrt(x);
}

/** EL ZOOM SUAVIZADO: de `actual` hacia `quiere` en `dt` s, entrando en `ZOOM_ENTRA_S` y saliendo en `ZOOM_SALE_S`. */
export function suavizarElZoom(actual: number, quiere: number, dt: number): number {
  if (!(dt > 0)) return actual;
  const tau = (quiere > actual ? ZOOM_ENTRA_S : ZOOM_SALE_S) / 3;
  return actual + (quiere - actual) * (1 - Math.exp(-dt / tau));
}

/** El encuadre de apuntar (ver arriba): el hombro, lo que baja el ojo y lo que se acerca, del todo dentro. */
export const HOMBRO_DE_APUNTAR = 1.05;
export const BAJADA_AL_APUNTAR = 0.15;
export const ACERCAMIENTO_AL_APUNTAR = 0.6;
/** Por debajo de esto el encuadre de apuntar es cero exacto (las cuentas sin carga, las de siempre). */
const APUNTE_DESPRECIABLE = 1e-3;
/** Lo que se aparta el hombro de lo que lo corta a la derecha, además del margen de la pared (m). */
const HOLGURA_DEL_HOMBRO = 0.05;
/**
 * Lo que baja el pivote (y con él el ojo y la mira: hacia dónde se mira no cambia) para que el ojo, con el cabeceo de
 * reposo y los 0,6 m de acercamiento, quede `BAJADA_AL_APUNTAR` más bajo: acercarse ya lo baja `sen(cabeceo) · 0,6`.
 */
const BAJADA_DEL_PIVOTE = BAJADA_AL_APUNTAR - Math.sin(CABECEO_DE_REPOSO) * ACERCAMIENTO_AL_APUNTAR;

/** EL ENCUADRE DE APUNTAR SUAVIZADO: de `actual` hacia 1 (`apuntando`) o 0 en `dt` s, con la exponencial del zoom. */
export function suavizarElApunte(actual: number, apuntando: boolean, dt: number): number {
  const a = suavizarElZoom(Number.isFinite(actual) ? actual : 0, apuntando ? 1 : 0, dt);
  return !apuntando && a < APUNTE_DESPRECIABLE ? 0 : a;
}

/** EL GOLPE DE CAMPO del disparo a `ms` de él, en grados (negativo: se cierra): −2 en el acto, 0 a los 150 ms. */
export function retrocesoDelDisparo(ms: number): number {
  if (!(ms >= 0) || ms >= RETROCESO_MS) return 0;
  const queda = 1 - ms / RETROCESO_MS;
  return -RETROCESO_DEL_DISPARO * queda * queda;
}

/**
 * LA SENSIBILIDAD CON ZOOM: con el campo cerrado, el mismo arrastre del dedo gira menos, en la proporción en que
 * se ve más grande lo del centro (`tan(fov/2) / tan(base/2)`). Sin ella, apuntar con zoom sería apuntar con pulso
 * de más justo cuando se afina.
 */
export function sensibilidadDelZoom(fov: number, base: number): number {
  if (!(fov > 0) || !(base > 0)) return 1;
  return Math.tan((fov * Math.PI) / 360) / Math.tan((base * Math.PI) / 360);
}
/** Vigía: a 25 m. */
export const ALTO_DEL_VIGIA = 25;
/** Lo más cerca que se pone la cámara del pivote cuando algo la tapa. */
export const DISTANCIA_MINIMA = 0.6;
/** Lo que se aparta la cámara de lo que la tapa (para que el plano cercano no corte la pared). */
const MARGEN_DE_PARED = 0.25;
/** Cuánto se aleja por segundo cuando deja de estar tapada. */
const ALEJARSE_M_POR_S = 5;
/** A qué ritmo gira sola la cámara automática, y desde qué ángulo empieza. */
const GIRO_AUTOMATICO_RAD_POR_S = 2.4;
const GIRO_AUTOMATICO_DESDE = (18 * Math.PI) / 180;

/**
 * ¿EN QUÉ FRACCIÓN DEL TRAMO A→B SE ENTRA EN LA CAJA? `null` si no se entra. La prueba de losa en tres
 * ejes, con la caja ensanchada `margen` por cada lado (y por arriba).
 */
export function losaEnTresEjes(a: Punto3, b: Punto3, c: CajaAlta, margen: number): number | null {
  let entra = 0;
  let sale = 1;
  const ejes: readonly [number, number, number, number][] = [
    [a.x, b.x, c.x0 - margen, c.x1 + margen],
    [a.y, b.y, -1, c.alto + margen],
    [a.z, b.z, c.z0 - margen, c.z1 + margen],
  ];
  for (const [desde, hasta, min, max] of ejes) {
    const d = hasta - desde;
    if (Math.abs(d) < 1e-9) {
      if (desde <= min || desde >= max) return null;
      continue;
    }
    let t0 = (min - desde) / d;
    let t1 = (max - desde) / d;
    if (t0 > t1) {
      const t = t0;
      t0 = t1;
      t1 = t;
    }
    if (t0 > entra) entra = t0;
    if (t1 < sale) sale = t1;
    if (entra >= sale) return null;
  }
  return entra;
}

/** La primera caja que corta el tramo A→B: su fracción (0..1), o 1 si no corta ninguna. */
export function primerCorte(a: Punto3, b: Punto3, cajas: readonly CajaAlta[], margen: number): number {
  const minX = Math.min(a.x, b.x) - margen;
  const maxX = Math.max(a.x, b.x) + margen;
  const minZ = Math.min(a.z, b.z) - margen;
  const maxZ = Math.max(a.z, b.z) + margen;
  let mejor = 1;
  for (const c of cajas) {
    if (c.x0 > maxX || c.x1 < minX || c.z0 > maxZ || c.z1 < minZ) continue;
    const f = losaEnTresEjes(a, b, c, margen);
    if (f !== null && f < mejor) mejor = f;
  }
  return mejor;
}

/** El ángulo `a` llevado a (−π, π]. */
export function normalizar(a: number): number {
  let r = a % (2 * Math.PI);
  if (r <= -Math.PI) r += 2 * Math.PI;
  if (r > Math.PI) r -= 2 * Math.PI;
  return r;
}

/** Lo que la cámara recuerda de un fotograma a otro. */
export interface EstadoDeLaCamara {
  /** Hacia dónde mira, en el convenio de `andar.ts` (0 al norte, creciendo al este), y el cabeceo. */
  giro: number;
  cabeceo: number;
  /** La distancia al pivote que tenía el fotograma anterior (para alejarse con suavidad). */
  distancia: number;
  /** El encuadre de apuntar, 0..1 y suavizado (0 exacto sin carga). */
  apunte: number;
  /** El hombro con que se encuadró el fotograma anterior (m): el que usa la mira para poner un blanco debajo. */
  hombro: number;
  /** Lo que la pared de la derecha deja de hombro de más (m): se cierra en el acto, se abre suave. */
  holguraDelHombro: number;
}

export function camaraNueva(giro: number): EstadoDeLaCamara {
  return { giro, cabeceo: CABECEO_DE_REPOSO, distancia: DISTANCIA_AL_HOMBRO, apunte: 0, hombro: HOMBRO_M, holguraDelHombro: HOMBRO_DE_APUNTAR - HOMBRO_M };
}

/** Lo que la cámara necesita saber del mundo en este fotograma. */
export interface SituacionDeLaCamara {
  /** El desvelado (metros). */
  readonly x: number;
  readonly z: number;
  /** Segundos desde el fotograma anterior. */
  readonly dt: number;
  /** ¿Hay enemigos a menos de `ENEMIGOS_CERCA_M`? */
  readonly enemigosCerca: boolean;
  /** El blanco enganchado (metros), o `null`. */
  readonly blanco: { readonly x: number; readonly z: number } | null;
  /** ¿Manda el dedo? Entonces la cámara automática no gira. */
  readonly mandaElDedo: boolean;
  /** 0..1: cuánto Remanso se ve. */
  readonly remanso: number;
  /**
   * 0..1: el zoom del rayo propio, ya suavizado (`zoomDeLaCarga` y `suavizarElZoom`; `docs/quiebro/EL-RAYO.md` §3:
   * cierra el campo hasta `FOV_DE_LA_CARGA` grados, sin acercar la distancia). OPCIONAL a propósito: sin ella es
   * 0, y así siguen valiendo todas las llamadas que ya hay.
   */
  readonly carga?: number;
  /**
   * ¿Se está cargando el rayo propio? La cámara pasa al ENCUADRE DE APUNTAR (ver arriba), suavizado aquí con `dt`.
   * Opcional como `carga`: sin él, no se apunta y las cuentas son las de siempre.
   */
  readonly apuntando?: boolean;
  /** ¿Es un aparato táctil? (el campo de visión). */
  readonly tactil: boolean;
  /** Vigía: sin cuerpo, cenital. */
  readonly vigia: boolean;
  readonly cajas: readonly CajaAlta[];
}

/** Lo que sale: dónde se pone la cámara, adónde mira y con qué campo. */
export interface EncuadreDeLaCamara {
  readonly ojo: Punto3;
  readonly mira: Punto3;
  readonly fov: number;
}

/** La dirección horizontal de un giro (convenio de `andar.ts`): (sen, −cos). */
function adelante(giro: number): { x: number; z: number } {
  return { x: Math.sin(giro), z: -Math.cos(giro) };
}

/**
 * UN FOTOGRAMA DE CÁMARA. Cambia `estado` (el giro automático y la distancia suavizada) y devuelve el
 * encuadre.
 */
export function encuadrar(estado: EstadoDeLaCamara, s: SituacionDeLaCamara): EncuadreDeLaCamara {
  if (s.vigia) {
    const a = adelante(estado.giro);
    return {
      ojo: { x: s.x - a.x * 6, y: ALTO_DEL_VIGIA, z: s.z - a.z * 6 },
      mira: { x: s.x, y: 0, z: s.z },
      fov: s.tactil ? FOV_MOVIL : FOV_PC,
    };
  }

  /* La cámara automática: gira hacia el blanco si el dedo no manda. */
  if (s.blanco !== null && !s.mandaElDedo) {
    const quiere = Math.atan2(s.blanco.x - s.x, -(s.blanco.z - s.z));
    const falta = normalizar(quiere - estado.giro);
    if (Math.abs(falta) > GIRO_AUTOMATICO_DESDE) {
      const paso = Math.sign(falta) * Math.min(Math.abs(falta) - GIRO_AUTOMATICO_DESDE * 0.5, GIRO_AUTOMATICO_RAD_POR_S * s.dt);
      estado.giro = normalizar(estado.giro + paso);
    }
  }
  estado.cabeceo = Math.max(CABECEO_MINIMO, Math.min(CABECEO_MAXIMO, estado.cabeceo));

  const giro = estado.giro + ORBITA_DEL_REMANSO * s.remanso;
  const a = adelante(giro);
  /* El derecho del giro: (cos, sen) en (x, z). */
  const derecha = { x: Math.cos(giro), z: Math.sin(giro) };
  /* El encuadre de apuntar (ver arriba): suave, y 0 exacto sin carga. */
  estado.apunte = suavizarElApunte(estado.apunte, s.apuntando === true, s.dt);
  const k = estado.apunte;
  let hombro = HOMBRO_M;
  let altoDelPivote = ALTO_DEL_PIVOTE;
  if (k > 0) {
    altoDelPivote -= BAJADA_DEL_PIVOTE * k;
    /* Lo que la pared de la derecha deja de hombro de más: del pecho hacia el hombro de apuntar, con el margen de la pared. */
    const pecho: Punto3 = { x: s.x, y: altoDelPivote, z: s.z };
    const alLado: Punto3 = { x: s.x + derecha.x * HOMBRO_DE_APUNTAR, y: altoDelPivote, z: s.z + derecha.z * HOMBRO_DE_APUNTAR };
    const corteDelHombro = primerCorte(pecho, alLado, s.cajas, MARGEN_DE_PARED);
    const cabe = corteDelHombro < 1 ? Math.max(0, corteDelHombro * HOMBRO_DE_APUNTAR - HOLGURA_DEL_HOMBRO - HOMBRO_M) : HOMBRO_DE_APUNTAR - HOMBRO_M;
    estado.holguraDelHombro = cabe < estado.holguraDelHombro ? cabe : suavizarElZoom(estado.holguraDelHombro, cabe, s.dt);
    hombro = HOMBRO_M + Math.min((HOMBRO_DE_APUNTAR - HOMBRO_M) * k, estado.holguraDelHombro);
  }
  estado.hombro = hombro;
  const pivote: Punto3 = {
    x: s.x + derecha.x * hombro,
    y: altoDelPivote,
    z: s.z + derecha.z * hombro,
  };
  const quiereDistancia = s.enemigosCerca ? DISTANCIA_ABIERTA : DISTANCIA_AL_HOMBRO;
  const horizontal = Math.cos(estado.cabeceo);
  const vertical = Math.sin(estado.cabeceo);
  const lejos: Punto3 = {
    x: pivote.x - a.x * horizontal * quiereDistancia,
    y: pivote.y + vertical * quiereDistancia,
    z: pivote.z - a.z * horizontal * quiereDistancia,
  };
  const corte = primerCorte(pivote, lejos, s.cajas, MARGEN_DE_PARED);
  const libre = Math.max(DISTANCIA_MINIMA, corte * quiereDistancia - (corte < 1 ? 0.05 : 0));
  /* Acercarse, en el acto; alejarse, poco a poco. */
  if (libre < estado.distancia) estado.distancia = libre;
  else estado.distancia = Math.min(libre, estado.distancia + ALEJARSE_M_POR_S * s.dt);
  /* Apuntando, la menor de la que deja la pared y la de apuntar (suave): ninguna salta, y contra la pared manda ella. */
  const d = k > 0 ? Math.min(estado.distancia, quiereDistancia - ACERCAMIENTO_AL_APUNTAR * k) : estado.distancia;
  const ojo: Punto3 = {
    x: pivote.x - a.x * horizontal * d,
    y: Math.max(0.35, pivote.y + vertical * d),
    z: pivote.z - a.z * horizontal * d,
  };
  /* Se mira hacia delante del pivote, con el mismo cabeceo: el desvelado queda abajo a la izquierda. */
  const mira: Punto3 = {
    x: pivote.x + a.x * horizontal * 8,
    y: pivote.y - vertical * 8 + 0.1,
    z: pivote.z + a.z * horizontal * 8,
  };
  /* El zoom del rayo cierra el campo y nada más (lo que se mueve la cámara es el encuadre de apuntar, arriba). */
  const carga = s.carga === undefined || !Number.isFinite(s.carga) ? 0 : Math.max(0, Math.min(1, s.carga));
  const zoom = FOV_DE_LA_CARGA * carga;
  const fov = (s.tactil ? FOV_MOVIL : FOV_PC) - zoom - FOV_DEL_REMANSO * s.remanso;
  return { ojo, mira, fov };
}
