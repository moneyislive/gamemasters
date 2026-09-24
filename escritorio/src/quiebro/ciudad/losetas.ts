/**
 * LA LUZ DE LA CALLE POR LOSETAS (§5.7 de `docs/quiebro/CIUDAD-ABIERTA.md`): la misma luz horneada del
 * barrio (`luz-de-la-calle.ts`: farolas, neones, escaparates, cabinas), en una ciudad de 540 m.
 *
 * ═══ POR QUÉ LOSETAS Y UNA VENTANA ═══
 *
 * La ciudad entera a medio metro por téxel son 1.100 × 1.100 téxeles de medio punto flotante: 10 MB de
 * textura y hornear unas dos mil fuentes, más de cien milisegundos de golpe. Así que la luz se hornea en
 * LOSETAS de 64 m (se guardan las 40 últimas) y se pinta una VENTANA de 4 × 4 losetas, 256 m, centrada en
 * quien mira y que se recentra cuando se aleja 40 m de su centro. Téxeles: 512² en N0-N1 (medio metro)
 * y 1.024² en N2-N3 (un cuarto).
 *
 * ═══ POR QUÉ DOS TEXTURAS Y NO UNA QUE DÉ LA VUELTA ═══
 *
 * La luz la leen también quienes no son de la ciudad: los personajes (`personajes/material.ts`) y la lluvia,
 * con la cuenta de siempre, `(xz − caja.xy) · caja.zw` dentro de [0, 1]. Una textura que diera la vuelta
 * (cada loseta en su sitio módulo la ventana) no se podría leer así. Con DOS texturas se lee como siempre:
 * se pinta una; en la otra se compone la ventana siguiente (las losetas guardadas, más las nuevas, que se
 * hornean fuente a fuente) y se sube fila a fila; cuando está entera, se cambian la textura y la caja del
 * uniforme en el mismo fotograma. Nadie ve nunca una textura a medias.
 *
 * ═══ LA PRIMERA LUZ DE LA NOCHE, LOSETA A LOSETA ═══
 *
 * Salvo la primera. Montada en el juego (24-sep), la primera ventana de luz tardaba 226 fotogramas en N0 y
 * 160 en N1 (7,5 y 5,3 s a 30 fps): sacar las fuentes de unas cuarenta celdas sin geometría, hornear 16
 * losetas y pasarlas a medios. La Bajada entera caía sobre una ciudad a oscuras —la plaza negra, sin un charco
 * de luz— y los primeros segundos del Tramo 1 se peleaban igual. Antes de la primera no hay luz que estropear,
 * así que ésa se escribe DIRECTAMENTE en la textura que se pinta, con su caja ya puesta, loseta a loseta y
 * de dentro afuera: las cuatro del centro (la plaza de la Bajada y sus calles) primero. Se ve encenderse la
 * ciudad alrededor de quien cae, que es lo que pide la Bajada, en vez de nada hasta que está entera. Las
 * siguientes, como siempre: detrás y de golpe.
 *
 * Y mientras no hay ninguna, el uniforme apunta a la textura propia, a oscuras, y no a la de la ciudad de la
 * noche anterior: ésa ya está liberada, y three la volvía a subir entera (2 u 8 MB de GPU que nadie liberaba
 * ya) para pintar la luz de otra noche en el sitio de otra ventana.
 *
 * ═══ EL TRABAJO, CONTADO ═══
 *
 * Hornear una fuente es mirar los téxeles de su disco; se cuentan, y un fotograma sólo empieza una fuente si
 * le caben en su tope. Subir es por filas enteras (`addUpdateRange` de three sube una fila por rango): un
 * tope de filas por fotograma. Todo sin WebGL: el comprobador lo corre en Node.
 *
 * ═══ LA PRIMERA SUBIDA, SIN LOS CEROS ═══
 *
 * three r185 sube una `DataTexture` la primera vez que la pinta: la reserva (`texStorage2D`) y le sube sus
 * `updateRanges`, o ENTERA si no tiene ninguno. Las dos texturas nacen a oscuras, y WebGL ya da a ceros lo
 * que reserva: subir sus ceros eran 2 MB en N0-N1 y 8 en N2-N3 en el primer fotograma de cada ciudad (la
 * revisión de rendimiento del 24-sep lo midió dentro del tirón de 120-240 ms de cada noche y de cada cambio
 * de nivel). Cada textura nace con un rango de un téxel: la primera subida es reservar y cuatro números, y lo
 * demás sube fila a fila como siempre.
 *
 * ═══ OTRO NIVEL, LA MISMA LUZ ═══
 *
 * La luz no depende del nivel más que en su tamaño de téxel (las fuentes horneadas son las mismas: lo mira el
 * comprobador) y en su tope de trabajo. Cuando el gobernador cambia de nivel en plena noche, la ciudad del
 * nivel nuevo HEREDA la luz de la de antes si el téxel es el mismo (N0 ↔ N1, N2 ↔ N3: `heredar`), con sus
 * losetas horneadas y lo que se pinta; si no, hornea la suya CALLADA (`callada`: no toca los uniformes)
 * mientras se sigue pintando la ciudad de antes con la suya, y habla al relevarla (ver `relevo.ts`). Antes,
 * cada cambio de nivel dejaba la ciudad a oscuras y la volvía a encender loseta a loseta, con prisa, a media
 * pelea.
 */
import * as THREE from 'three';
import type { CajaXZ, NivelDeLaCiudad } from './tipos';
import type { FuenteHorneada } from './luz-de-la-calle';
import { hornearUnaFuente } from './luz-de-la-calle';
import { UNIFORMES_DE_LA_CIUDAD } from './retoques';
import { CELDA_MAXIMA, CELDA_MINIMA, indiceDeCelda } from '../../../../shared/arcade/juegos/quiebro-ciudad';

/** El lado de una loseta y cuántas van por lado en la ventana de luz. */
export const LADO_DE_LA_LOSETA = 64;
export const LOSETAS_POR_LADO = 4;
/** Lo que hay que alejarse de más de media loseta del centro para que la ventana de luz se recentre. */
const HOLGURA_DE_LA_LUZ = 8;
/** Lo más lejos que llega una fuente (la farola): lo que una loseta mira alrededor. */
const ALCANCE_MAXIMO = 24;
/** Cuántas losetas horneadas se guardan. */
const LOSETAS_GUARDADAS = 40;
/** La caja del uniforme antes de la primera luz: da igual cuál, la textura está a oscuras. */
const CAJA_A_OSCURAS: CajaXZ = { x0: -128, z0: -128, x1: 128, z1: 128 };
/** La misma, como la lee el sombreador (`uniformeDeLaCaja`: x0, z0, 1/ancho, 1/fondo). */
const CAJA_A_OSCURAS_EN_EL_UNIFORME = new THREE.Vector4(CAJA_A_OSCURAS.x0, CAJA_A_OSCURAS.z0, 1 / (CAJA_A_OSCURAS.x1 - CAJA_A_OSCURAS.x0), 1 / (CAJA_A_OSCURAS.z1 - CAJA_A_OSCURAS.z0));
/**
 * El orden de las 16 losetas de la ventana (índice `b · 4 + a`): de dentro afuera, las cuatro del centro
 * primero, luego las de los lados y al final las esquinas. Sólo lo nota la primera luz (ver la cabecera).
 */
const ORDEN_DE_LAS_LOSETAS: readonly number[] = (() => {
  const centro = (LOSETAS_POR_LADO - 1) / 2;
  const todas: number[] = [];
  for (let k = 0; k < LOSETAS_POR_LADO * LOSETAS_POR_LADO; k++) todas.push(k);
  const lejos = (k: number): number => Math.max(Math.abs((k % LOSETAS_POR_LADO) - centro), Math.abs(Math.floor(k / LOSETAS_POR_LADO) - centro)) * 10 + Math.abs((k % LOSETAS_POR_LADO) - centro) + Math.abs(Math.floor(k / LOSETAS_POR_LADO) - centro);
  return todas.sort((p, q) => lejos(p) - lejos(q) || p - q);
})();

/** Téxeles por lado de la ventana de luz, por nivel. */
export const TEXELES_DE_LA_LUZ_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 512, 1: 512, 2: 1024, 3: 1024 };

/**
 * EL TRABAJO DE UN FOTOGRAMA, en téxeles horneados (y lo demás pasado a téxeles por lo que cuesta), y las
 * filas que se suben como mucho. Un téxel son unos 7 ns en un PC (medido en `hornearUnaFuente`): N0 son
 * unos 0,35 ms de PC por fotograma, que en un teléfono modesto (×7-10) quedan en los 3 ms del §5.7.
 */
export const PRESUPUESTO_DE_LA_LUZ: Readonly<Record<NivelDeLaCiudad, { readonly texeles: number; readonly filas: number }>> = {
  0: { texeles: 20_000, filas: 16 },
  1: { texeles: 30_000, filas: 16 },
  2: { texeles: 80_000, filas: 32 },
  3: { texeles: 150_000, filas: 48 },
};

/**
 * Lo que cuesta, en téxeles, cada paso de sacar las fuentes de una celda sin su geometría: una pieza de la
 * celda con moldes que no guardan, unos 14 µs de PC de media (medido: 7.535 pasos en 102 ms); una celda
 * son unos 45 pasos. El primero prepara los índices de la celda y cuesta más (hasta medio milisegundo).
 */
export const COSTE_DE_UN_PASO_SIN_GEOMETRIA = 3_000;
export const COSTE_DEL_PRIMER_PASO_SIN_GEOMETRIA = 60_000;
/** Pasar a medio punto flotante: unas tres veces lo que un téxel horneado, por número. */
const COSTE_DE_PASAR_A_MEDIOS = 3;
/** Cuántas filas de una loseta se pasan a medios de una vez. */
const FILAS_POR_PASO = 8;

/** Lo que pasó en un fotograma de la luz. */
export interface FotogramaDeLaLuz {
  readonly texeles: number;
  readonly filas: number;
  readonly bytes: number;
  readonly cambio: boolean;
}

/**
 * De dónde saca la luz las fuentes de una celda: una lista si ya están (las de una celda de la ventana), o
 * un iterador que las saca a pasos (la celda sin su geometría) y las devuelve al acabar.
 */
export type FuentesDeUnaCelda = (indice: number) => readonly FuenteHorneada[] | Iterator<unknown, readonly FuenteHorneada[]>;

/** Cuánto más trabaja por fotograma una luz que aún no tiene ninguna ventana entera (ver `trabajar`). */
export const PRISA_DE_LA_PRIMERA_LUZ = 4;

export interface OpcionesDeLaLuz {
  /**
   * Cuánto más trabaja mientras no tiene ninguna ventana entera: `PRISA_DE_LA_PRIMERA_LUZ` al empezar la noche
   * (no hay nada que estropear); menos para la de una ciudad que se prepara a media noche (ver `abierta.ts`).
   */
  readonly prisa?: number;
  /** Nace callada: no toca los uniformes hasta que se le diga (`hablar`). */
  readonly callada?: boolean;
}

export class LuzPorLosetas {
  readonly texeles: number;
  private readonly t: number;
  private readonly texturas: [THREE.DataTexture, THREE.DataTexture];
  private delante: 0 | 1 = 0;
  private origen: { x0: number; z0: number } | null = null;
  private objetivo: { x0: number; z0: number } | null = null;
  private trabajo: Generator<{ texeles: number; filas: number }, void, void> | null = null;
  private readonly guardadas = new Map<number, Uint16Array>();
  private fuentesDe: FuentesDeUnaCelda;
  private nivel: NivelDeLaCiudad;
  private readonly prisa: number;
  /**
   * CALLADA: no toca los uniformes compartidos (ni al montar la primera luz ni al cambiar de ventana). Es la
   * luz de una ciudad que se prepara detrás de la que se pinta (ver la cabecera). `hablar` la pone en los
   * uniformes.
   */
  callada: boolean;
  /** Cuántas veces cambió de ventana, y cuántas losetas se han horneado. */
  cambios = 0;
  horneadas = 0;
  /** Cuántas luces se dejaron a medias porque quien mira volvió al centro de la que se pinta. */
  dejadas = 0;
  /**
   * ¿Se ha compuesto ya una ventana de luz ENTERA? Hasta entonces se trabaja con prisa, y la primera se escribe
   * loseta a loseta en la que se pinta (ver la cabecera); `caja` ya no es `null` desde que empieza.
   */
  lista = false;
  /** Cuántas losetas de la primera luz se ven ya (de las 16): la del centro, primero. */
  primerasVistas = 0;
  /** Qué textura recibió filas en el fotograma: la que hay que subir ya. */
  private escrita: 0 | 1 | null = null;
  /** Las losetas (`b · 4 + a`) de una primera luz a medias que ya están escritas en la que se pinta. */
  private readonly escritasDelante = new Set<number>();

  /**
   * Sube YA lo pendiente de una textura (en el navegador, `renderer.initTexture`). three sólo sube una
   * textura cuando la pinta: sin esto, las filas de la textura de atrás se quedarían esperando y subirían
   * todas juntas en el fotograma del cambio, que es justo el tirón que las filas evitan.
   */
  subir: ((t: THREE.Texture) => void) | null = null;
  /** Lo más que cuesta un paso: sacar las fuentes de una celda, o una farola (o pasar filas a medios). */
  private readonly pasoMayor: number;

  constructor(fuentesDe: FuentesDeUnaCelda, nivel: NivelDeLaCiudad, opciones: OpcionesDeLaLuz = {}) {
    this.fuentesDe = fuentesDe;
    this.nivel = nivel;
    this.prisa = opciones.prisa ?? PRISA_DE_LA_PRIMERA_LUZ;
    this.callada = opciones.callada ?? false;
    this.texeles = TEXELES_DE_LA_LUZ_POR_NIVEL[nivel];
    this.t = this.texeles / LOSETAS_POR_LADO;
    this.texturas = [this.textura(), this.textura()];
    const lado = (2 * ALCANCE_MAXIMO) / (LADO_DE_LA_LOSETA / this.t) + 2;
    this.pasoMayor = Math.max(Math.ceil(Math.PI * (lado / 2) * (lado / 2)), COSTE_DEL_PRIMER_PASO_SIN_GEOMETRIA, FILAS_POR_PASO * this.t * 4 * COSTE_DE_PASAR_A_MEDIOS);
  }

  private textura(): THREE.DataTexture {
    const t = new THREE.DataTexture(new Uint16Array(this.texeles * this.texeles * 4), this.texeles, this.texeles, THREE.RGBAFormat, THREE.HalfFloatType);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.flipY = false;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    /* La primera subida, sin los ceros: reservar y un téxel (ver la cabecera). */
    t.addUpdateRange(0, 4);
    return t;
  }

  /**
   * LA LUZ PASA A LA CIUDAD DE OTRO NIVEL con el mismo téxel (ver la cabecera): sus losetas, sus fuentes y lo
   * que pinta siguen valiendo; cambian el tope de trabajo y de dónde saca las fuentes de las celdas que falten.
   */
  heredar(fuentesDe: FuentesDeUnaCelda, nivel: NivelDeLaCiudad): void {
    if (TEXELES_DE_LA_LUZ_POR_NIVEL[nivel] !== this.texeles) throw new Error(`una luz de ${String(this.texeles)} téxeles no la hereda N${String(nivel)}`);
    this.fuentesDe = fuentesDe;
    this.nivel = nivel;
  }

  /** La luz pasa a pintarse: deja de estar callada y se pone en los uniformes. */
  hablar(): void {
    this.callada = false;
    this.tomarLosUniformes();
  }

  /** La caja que cubre la luz que se pinta, o `null` si aún ninguna. */
  get caja(): CajaXZ | null {
    const o = this.origen;
    if (o === null) return null;
    const lado = LADO_DE_LA_LOSETA * LOSETAS_POR_LADO;
    return { x0: o.x0, z0: o.z0, x1: o.x0 + lado, z1: o.z0 + lado };
  }

  /** La textura que se pinta. */
  get textura_(): THREE.DataTexture {
    return this.texturas[this.delante];
  }

  /**
   * Pone en los uniformes compartidos la luz que se pinta (en cada fotograma: ver `construir.ts`). Sin ninguna
   * todavía, la textura propia, a oscuras: nunca la de otra ciudad (ver la cabecera).
   */
  tomarLosUniformes(): void {
    if (this.callada) return;
    UNIFORMES_DE_LA_CIUDAD.uLuzCalle.value = this.texturas[this.delante];
    /* La caja, como `uniformeDeLaCaja` pero sin objetos de paso: esto va en cada fotograma. */
    const o = this.origen;
    const lado = LADO_DE_LA_LOSETA * LOSETAS_POR_LADO;
    if (o === null) UNIFORMES_DE_LA_CIUDAD.uLuzCalleCaja.value.copy(CAJA_A_OSCURAS_EN_EL_UNIFORME);
    else UNIFORMES_DE_LA_CIUDAD.uLuzCalleCaja.value.set(o.x0, o.z0, 1 / lado, 1 / lado);
  }

  /** El origen de la ventana de luz para quien está en `(x, z)`: la esquina de losetas más cercana, menos media ventana. */
  private origenPara(x: number, z: number): { x0: number; z0: number } {
    const medio = (LADO_DE_LA_LOSETA * LOSETAS_POR_LADO) / 2;
    return { x0: Math.round(x / LADO_DE_LA_LOSETA) * LADO_DE_LA_LOSETA - medio, z0: Math.round(z / LADO_DE_LA_LOSETA) * LADO_DE_LA_LOSETA - medio };
  }

  private hayQueRecentrar(x: number, z: number): boolean {
    const o = this.origen;
    if (o === null) return true;
    const medio = (LADO_DE_LA_LOSETA * LOSETAS_POR_LADO) / 2;
    return Math.max(Math.abs(x - (o.x0 + medio)), Math.abs(z - (o.z0 + medio))) > LADO_DE_LA_LOSETA / 2 + HOLGURA_DE_LA_LUZ;
  }

  /** ¿Está quien mira a menos de media loseta del centro de la luz que se pinta (sin la holgura del recentrado)? */
  private enElCentro(x: number, z: number): boolean {
    const o = this.origen;
    if (o === null) return false;
    const medio = (LADO_DE_LA_LOSETA * LOSETAS_POR_LADO) / 2;
    return Math.max(Math.abs(x - (o.x0 + medio)), Math.abs(z - (o.z0 + medio))) <= LADO_DE_LA_LOSETA / 2;
  }

  private clave(ti: number, tj: number): number {
    return (ti + 512) * 1024 + (tj + 512);
  }

  /** Las celdas que tocan una loseta y el alcance de sus fuentes. */
  private celdasDeLaLoseta(c: CajaXZ): number[] {
    const salida: number[] = [];
    const i0 = Math.max(CELDA_MINIMA, Math.floor((c.x0 - ALCANCE_MAXIMO + 24) / 48));
    const i1 = Math.min(CELDA_MAXIMA, Math.floor((c.x1 + ALCANCE_MAXIMO + 24) / 48));
    const j0 = Math.max(CELDA_MINIMA, Math.floor((c.z0 - ALCANCE_MAXIMO + 24) / 48));
    const j1 = Math.min(CELDA_MAXIMA, Math.floor((c.z1 + ALCANCE_MAXIMO + 24) / 48));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) salida.push(indiceDeCelda(i, j));
    return salida;
  }

  /** Las fuentes de las celdas, guardadas: sacarlas cuesta medio milisegundo por celda y se hace una vez. */
  private readonly fuentesPorCelda = new Map<number, readonly FuenteHorneada[]>();

  /**
   * El trabajo de montar la ventana de luz de origen `o`: hornear lo que falte, componer y subir. La primera
   * de la noche (sin ninguna pintada) va directa a la textura que se pinta, loseta a loseta (ver la cabecera).
   */
  private *montar(o: { x0: number; z0: number }): Generator<{ texeles: number; filas: number }, void, void> {
    const T = this.t;
    const W = this.texeles;
    const ti0 = Math.round(o.x0 / LADO_DE_LA_LOSETA);
    const tj0 = Math.round(o.z0 / LADO_DE_LA_LOSETA);
    /* Mientras no hay una entera, todas van directas a la que se pinta (ver la cabecera). */
    const primera = !this.lista;
    const delante = this.texturas[this.delante];
    const dDelante = delante.image.data as Uint16Array;
    if (primera) {
      /*
       * Si quien mira saltó lejos antes de acabar la primera (en «Otra noche» la cámara sale de donde acabó la
       * noche anterior y salta a lo alto de la plaza de la Bajada nueva), lo que ya se escribió es luz de OTRO
       * sitio: se borra antes de mover la caja, con su trabajo contado, y la que se pinta sigue siendo la de su
       * sitio mientras tanto.
       */
      const p = this.origen;
      if (p !== null && (p.x0 !== o.x0 || p.z0 !== o.z0)) {
        for (const indice of this.escritasDelante) {
          const a = indice % LOSETAS_POR_LADO;
          const b = Math.floor(indice / LOSETAS_POR_LADO);
          for (let r = 0; r < T; r++) {
            yield { texeles: 0, filas: T / W };
            const desde = ((b * T + r) * W + a * T) * 4;
            dDelante.fill(0, desde, desde + T * 4);
            delante.addUpdateRange(desde, T * 4);
            delante.needsUpdate = true;
            this.escrita = this.delante;
          }
        }
        this.escritasDelante.clear();
        this.primerasVistas = 0;
      }
      /* La que se pinta, en su sitio ya, y se va llenando. */
      this.origen = o;
      this.tomarLosUniformes();
    }
    /*
     * Cada paso ANUNCIA lo que va a costar (el `yield` va antes del trabajo): así quien trabaja sabe si le
     * cabe en el fotograma antes de hacerlo, y un paso que no cabe espera al fotograma siguiente.
     */
    /* 1 · Las losetas que falten, fuente a fuente, de dentro afuera. */
    const losetas: Uint16Array[] = new Array<Uint16Array>(LOSETAS_POR_LADO * LOSETAS_POR_LADO);
    for (const indice of ORDEN_DE_LAS_LOSETAS) {
      {
        const a = indice % LOSETAS_POR_LADO;
        const b = Math.floor(indice / LOSETAS_POR_LADO);
        const ti = ti0 + a;
        const tj = tj0 + b;
        const k = this.clave(ti, tj);
        let hecha = this.guardadas.get(k);
        if (hecha === undefined) {
          const caja = { x0: ti * LADO_DE_LA_LOSETA, z0: tj * LADO_DE_LA_LOSETA, x1: (ti + 1) * LADO_DE_LA_LOSETA, z1: (tj + 1) * LADO_DE_LA_LOSETA };
          const datos = new Float32Array(T * T * 4);
          const px = LADO_DE_LA_LOSETA / T;
          for (const kc of this.celdasDeLaLoseta(caja)) {
            let fuentes = this.fuentesPorCelda.get(kc);
            if (fuentes === undefined) {
              const f = this.fuentesDe(kc);
              if (Array.isArray(f)) fuentes = f as readonly FuenteHorneada[];
              else {
                const it = f as Iterator<unknown, readonly FuenteHorneada[]>;
                for (let paso = 0; ; paso++) {
                  yield { texeles: paso === 0 ? COSTE_DEL_PRIMER_PASO_SIN_GEOMETRIA : COSTE_DE_UN_PASO_SIN_GEOMETRIA, filas: 0 };
                  const r = it.next();
                  if (r.done === true) {
                    fuentes = r.value;
                    break;
                  }
                }
              }
              this.fuentesPorCelda.set(kc, fuentes);
            }
            for (const f of fuentes) {
              if (f.x + f.alcance < caja.x0 || f.x - f.alcance > caja.x1 || f.z + f.alcance < caja.z0 || f.z - f.alcance > caja.z1) continue;
              /* Lo que mira: el disco de su alcance, en téxeles (un poco de más por los bordes). */
              const r = f.alcance / px + 1;
              yield { texeles: Math.ceil(Math.PI * r * r), filas: 0 };
              hornearUnaFuente(f, caja, T, datos);
            }
          }
          const medios = new Uint16Array(datos.length);
          for (let fila = 0; fila < T; fila += FILAS_POR_PASO) {
            yield { texeles: FILAS_POR_PASO * T * 4 * COSTE_DE_PASAR_A_MEDIOS, filas: 0 };
            const hasta = Math.min(T, fila + FILAS_POR_PASO) * T * 4;
            for (let n = fila * T * 4; n < hasta; n++) {
              const v = datos[n] as number;
              medios[n] = v === 0 ? 0 : THREE.DataUtils.toHalfFloat(Math.min(60000, v));
            }
          }
          hecha = medios;
          this.horneadas++;
        }
        this.guardadas.delete(k);
        this.guardadas.set(k, hecha);
        while (this.guardadas.size > LOSETAS_GUARDADAS) {
          const vieja = this.guardadas.keys().next();
          if (vieja.done === true) break;
          this.guardadas.delete(vieja.value);
        }
        losetas[indice] = hecha;
        if (primera) {
          /* La primera luz: esta loseta, ya, en la textura que se pinta; cada trozo de fila cuenta lo que pesa. */
          this.escritasDelante.add(indice);
          for (let r = 0; r < T; r++) {
            yield { texeles: 0, filas: T / W };
            const desde = ((b * T + r) * W + a * T) * 4;
            dDelante.set(hecha.subarray(r * T * 4, (r + 1) * T * 4), desde);
            delante.addUpdateRange(desde, T * 4);
            delante.needsUpdate = true;
            this.escrita = this.delante;
          }
          this.primerasVistas++;
        }
      }
    }
    if (primera) {
      /* Ya está entera: la ventana de luz es ésta. */
      this.cambios++;
      this.lista = true;
      this.escritasDelante.clear();
      return;
    }
    /* 2 · La textura de atrás, compuesta y subida fila a fila. */
    const atras = this.delante === 0 ? 1 : 0;
    const tex = this.texturas[atras];
    const d = tex.image.data as Uint16Array;
    for (let fila = 0; fila < W; fila++) {
      yield { texeles: 0, filas: 1 };
      const b = Math.floor(fila / T);
      const r = fila % T;
      for (let a = 0; a < LOSETAS_POR_LADO; a++) {
        const l = losetas[b * LOSETAS_POR_LADO + a] as Uint16Array;
        d.set(l.subarray(r * T * 4, (r + 1) * T * 4), (fila * W + a * T) * 4);
      }
      tex.addUpdateRange(fila * W * 4, W * 4);
      tex.needsUpdate = true;
      this.escrita = atras;
    }
    /* 3 · El cambio: la textura nueva y su caja, a la vez. */
    this.delante = atras;
    this.origen = o;
    this.cambios++;
    this.lista = true;
    this.tomarLosUniformes();
  }

  /**
   * Un fotograma de trabajo para quien está en `(x, z)`. Un paso se hace si su anuncio cabe en lo que le
   * queda al fotograma; el primero del fotograma se hace siempre (si no, uno más grande que el tope no se
   * haría nunca): así ningún fotograma pasa de `max(tope, paso mayor)`.
   */
  trabajar(x: number, z: number, holgura = 1): FotogramaDeLaLuz {
    if (this.hayQueRecentrar(x, z)) {
      const o = this.origenPara(x, z);
      if (this.objetivo === null || this.objetivo.x0 !== o.x0 || this.objetivo.z0 !== o.z0) {
        if (this.origen === null || this.origen.x0 !== o.x0 || this.origen.z0 !== o.z0) {
          this.objetivo = o;
          this.trabajo = this.montar(o);
          this.anuncio = null;
        }
      }
    } else if (this.trabajo !== null && this.enElCentro(x, z) && !this.montandoLaQueSePinta()) {
      /* Quien mira volvió al centro de la luz que se pinta: la que se montaba no se acaba (ver la ventana). */
      this.terminar();
      this.dejadas++;
    }
    const p0 = PRESUPUESTO_DE_LA_LUZ[this.nivel];
    /* Sin una luz entera todavía (el principio de la noche, o la que se hornea callada), con prisa: ver la de la ventana. */
    const prisa = this.lista ? holgura : this.prisa;
    const topeDeTexeles = p0.texeles * prisa;
    const topeDeFilas = p0.filas * prisa;
    let texeles = 0;
    let filas = 0;
    const cambiosAntes = this.cambios;
    this.escrita = null;
    while (this.trabajo !== null) {
      if (this.anuncio === null) {
        const r = this.trabajo.next();
        if (r.done === true) {
          this.terminar();
          break;
        }
        this.anuncio = r.value;
      }
      const a = this.anuncio;
      if ((texeles > 0 || filas > 0) && (texeles + a.texeles > topeDeTexeles || filas + a.filas > topeDeFilas)) break;
      texeles += a.texeles;
      filas += a.filas;
      const r = this.trabajo.next();
      if (r.done === true) {
        this.terminar();
        break;
      }
      this.anuncio = r.value;
    }
    if (filas > 0 && this.subir !== null && this.escrita !== null) this.subir(this.texturas[this.escrita]);
    /* El mismo objeto en cada fotograma: quien lo guarda, guarda «el último» (ver `abierta.ts`). */
    const f = this.fotogramaDeLaLuz;
    f.texeles = texeles;
    f.filas = filas;
    f.bytes = filas * this.texeles * 8;
    f.cambio = this.cambios !== cambiosAntes;
    return f;
  }

  private readonly fotogramaDeLaLuz = { texeles: 0, filas: 0, bytes: 0, cambio: false };

  /** ¿Lo que se monta es la luz que ya se pinta (la primera, que se escribe loseta a loseta)? Ésa no se deja. */
  private montandoLaQueSePinta(): boolean {
    const o = this.objetivo;
    const p = this.origen;
    return o !== null && p !== null && o.x0 === p.x0 && o.z0 === p.z0;
  }

  /** El paso anunciado que espera al fotograma siguiente. */
  private anuncio: { texeles: number; filas: number } | null = null;

  private terminar(): void {
    this.trabajo = null;
    this.objetivo = null;
    this.anuncio = null;
  }

  /** Lo más que puede hornear un fotograma (con la holgura de cuando la ventana no trabaja): su tope, o el paso mayor. */
  get topeDelFotograma(): number {
    return Math.max(2 * PRESUPUESTO_DE_LA_LUZ[this.nivel].texeles, this.pasoMayor);
  }

  /** Lo más que puede subir un fotograma, en filas (con la misma holgura). */
  get filasDelFotograma(): number {
    return 2 * PRESUPUESTO_DE_LA_LUZ[this.nivel].filas;
  }

  /** Hornea y compone la ventana de luz de `(x, z)` de un tirón (al empezar). */
  hornearYa(x: number, z: number): void {
    const g = this.montar(this.origenPara(x, z));
    for (;;) if (g.next().done === true) break;
    this.terminar();
  }

  /** Lo que se lleva en memoria de la GPU: las dos texturas. */
  get bytesEnLaGpu(): number {
    return 2 * this.texeles * this.texeles * 8;
  }

  liberar(): void {
    for (const t of this.texturas) t.dispose();
    this.guardadas.clear();
  }
}
