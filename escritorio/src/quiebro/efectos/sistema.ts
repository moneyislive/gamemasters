/**
 * EL SISTEMA DE EFECTOS: por dónde el juego dispara los efectos, y dónde las piezas los leen.
 *
 * ═══ POR QUÉ NO SON PROPS DE REACT ═══
 *
 * Un anuncio llega por el canal a media ida y vuelta, y tiene que empezar a cerrarse en ESE
 * fotograma. Si viajara como estado de React —un `setState` con la lista nueva de anillos— cada
 * golpe, cada bala y cada chispa rehará la lista, repintará el árbol y asignará memoria, a veinte
 * sucesos por segundo con seis jugadores. Así que el juego habla con esto, un objeto de siempre:
 * `sistema.anillos.anunciar({...})`, `sistema.impacto({...})`, y las piezas lo leen en su
 * `useFrame`. React sólo monta las mallas una vez.
 *
 * ═══ SIN ASIGNACIONES DESPUÉS DE CREARLO ═══
 *
 * Todo vive en ranuras de tamaño fijo con arrays tipados: dar de alta es escribir números en la
 * ranura libre (o en la más vieja, si no queda ninguna), y dar de baja es marcarla. Lo que se
 * devuelve al dar de alta es un ASA —ranura y generación en un número—, de modo que el `resolver`
 * de un anillo que ya se fue y cuya ranura ocupa otro no toca al nuevo.
 *
 * Las chispas y las esquirlas van un paso más allá: sus arrays son directamente los de los
 * atributos de la GPU. `impacto()` escribe las chispas donde el sombreador las lee, apunta qué
 * tramo cambió, y la pieza sólo tiene que decirle a three que suba ese tramo.
 *
 * ═══ LOS DOS RELOJES ═══
 *
 * Todo lo que entra lleva `t` en ms del aparato (`performance.now()`, o el `timeStamp` de un
 * evento, que es el mismo reloj). Lo que es señal de juego (anillos, apuntado, balas) se guarda y
 * se pinta en ese reloj. Lo que es adorno (impactos, impresiones, desalojos, Trasvase, Bis, salida,
 * esquirlas, cielo, pantallas) se guarda ya pasado al reloj PRESENTADO del Remanso, y se pinta en
 * él. Ver `reloj.ts`.
 *
 * Puro: ni three, ni DOM, ni `performance`. Así lo prueba el comprobador en Node.
 */
import type { Amenaza, BalaDeEfecto } from './cuentas';
import {
  AMENAZAS,
  APAGADO_DEL_TRASVASE_MS,
  BIS_MS,
  COLA_DE_LOS_GLIFOS_MS,
  COLA_DEL_DESALOJO_MS,
  COLORES,
  DESALOJO_MS,
  ONDA_DEL_IMPACTO_MS,
  RADIO_DEL_BIS,
  RECOGIDA_DE_LA_ESQUIRLA_MS,
  SALIDA_MS,
  TRASVASE_MS,
  TRAS_EL_IMPACTO_MS,
  IMPRESION_MS,
  azarDe,
  alcanceDeLaBala,
  balaAcabada,
  chispasDelImpacto,
  componentesLineales,
  dondeCaeLaEsquirla,
  parpadeoDelImpacto,
  velocidadDeLaBala,
  velocidadDeLasChispas,
  vidaDeLaChispa,
} from './cuentas';
import type { Nivel } from './presupuesto';
import {
  ANILLOS_A_LA_VEZ,
  APUNTADOS_A_LA_VEZ,
  BALAS_A_LA_VEZ,
  ESQUIRLAS_A_LA_VEZ,
  HACES_A_LA_VEZ,
  IMPACTOS_A_LA_VEZ,
  SALIDAS_A_LA_VEZ,
  SILUETAS_A_LA_VEZ,
  TRAMOS_DEL_CABLE,
  TRASVASES_A_LA_VEZ,
  ajuste,
  capacidadDe,
} from './presupuesto';
import type { RelojDePresentacion } from './reloj';
import { crearEfectosDelRayo } from './rayo';
import type { BocaDe, EfectosDelRayo } from '../rayo/contrato';

/** Un punto del mundo, en metros (x al este, z al sur, y arriba). */
export interface Punto {
  x: number;
  y: number;
  z: number;
}

/**
 * Quien sabe dónde está cada cuerpo. Lo pone el juego una vez; las piezas le preguntan cada
 * fotograma por los anillos y líneas que siguen a alguien. Escribe en `salida` (un objeto que la
 * pieza reutiliza) y devuelve `false` si ese cuerpo ya no está: entonces se queda donde estaba.
 */
export type Localizador = (quien: number, salida: Punto) => boolean;

/** Lo que el servidor dijo del golpe que anunciaba un anillo. */
export type VeredictoDelAnillo = 'limpio' | 'esquivado' | 'golpe' | 'parado';
export const VEREDICTOS: readonly VeredictoDelAnillo[] = ['limpio', 'esquivado', 'golpe', 'parado'];

/* ─────────────────────────────── Las ranuras ─────────────────────────────── */

/**
 * RANURAS DE TAMAÑO FIJO con asas que caducan. `tomar` da la libre de número más bajo o, si están
 * todas, la que se tomó hace más tiempo (el efecto más viejo es el que menos se echa de menos).
 */
export class Ranuras {
  readonly capacidad: number;
  readonly viva: Uint8Array;
  readonly generacion: Uint32Array;
  /** Cuándo se tomó cada una, para saber cuál es la más vieja. */
  readonly tomada: Float64Array;
  private cuantas = 0;

  constructor(capacidad: number) {
    this.capacidad = capacidad;
    this.viva = new Uint8Array(capacidad);
    this.generacion = new Uint32Array(capacidad);
    this.tomada = new Float64Array(capacidad);
  }

  /** Cuántas hay vivas. */
  vivas(): number {
    return this.cuantas;
  }

  /** Toma una ranura en el instante `t` y devuelve su número. */
  tomar(t: number): number {
    let elegida = -1;
    let masVieja = 0;
    for (let i = 0; i < this.capacidad; i++) {
      if (this.viva[i] === 0) {
        elegida = i;
        break;
      }
      if ((this.tomada[i] as number) < (this.tomada[masVieja] as number)) masVieja = i;
    }
    if (elegida < 0) elegida = masVieja;
    else this.cuantas++;
    this.viva[elegida] = 1;
    this.generacion[elegida] = ((this.generacion[elegida] as number) + 1) >>> 0;
    this.tomada[elegida] = t;
    return elegida;
  }

  /** Suelta la ranura `i` (no pasa nada si ya estaba suelta). */
  soltar(i: number): void {
    if (i < 0 || i >= this.capacidad || this.viva[i] === 0) return;
    this.viva[i] = 0;
    this.cuantas--;
  }

  /** El asa de la ranura `i`: número y generación juntos. */
  asa(i: number): number {
    return (this.generacion[i] as number) * this.capacidad + i;
  }

  /** La ranura de un asa, o −1 si el asa caducó (la ranura se soltó o la tomó otro). */
  ranuraDe(asa: number): number {
    if (!Number.isInteger(asa) || asa < 0) return -1;
    const i = asa % this.capacidad;
    const g = Math.floor(asa / this.capacidad);
    return this.viva[i] === 1 && this.generacion[i] === g ? i : -1;
  }

  /** Suelta todas. */
  vaciar(): void {
    this.viva.fill(0);
    this.cuantas = 0;
  }
}

/** Un sitio: un punto fijo, o el número de un cuerpo al que se sigue con el localizador. */
export type Sitio = Punto | number;

/* ─────────────────────────────── Los anillos ─────────────────────────────── */

export interface AnuncioDeEfecto {
  /** Cuándo se anunció, en ms del aparato. */
  readonly inicio: number;
  /** El instante del impacto, en ms del aparato (ya traducido por el servidor). */
  readonly impacto: number;
  readonly amenaza: Amenaza;
  /** ¿El golpe va contra quien mira esta pantalla? Si no, el anillo se pinta tenue. */
  readonly propio: boolean;
  /** Sobre quién se cierra: un cuerpo (se le sigue) o un punto (los pies). */
  readonly sobre: Sitio;
}

export class Anillos {
  readonly ranuras = new Ranuras(ANILLOS_A_LA_VEZ);
  readonly inicio = new Float64Array(ANILLOS_A_LA_VEZ);
  readonly impacto = new Float64Array(ANILLOS_A_LA_VEZ);
  /** Índice en `AMENAZAS`. */
  readonly amenaza = new Uint8Array(ANILLOS_A_LA_VEZ);
  readonly propio = new Uint8Array(ANILLOS_A_LA_VEZ);
  /** Cuerpo al que sigue, o −1 si es un punto fijo. */
  readonly quien = new Int32Array(ANILLOS_A_LA_VEZ);
  /** Los pies del blanco (el anillo se pinta a `ALTURA_DEL_ANILLO` sobre ellos). */
  readonly x = new Float64Array(ANILLOS_A_LA_VEZ);
  readonly y = new Float64Array(ANILLOS_A_LA_VEZ);
  readonly z = new Float64Array(ANILLOS_A_LA_VEZ);
  /** 0 sin veredicto; 1 + índice en `VEREDICTOS`. */
  readonly veredicto = new Uint8Array(ANILLOS_A_LA_VEZ);
  readonly veredictoEn = new Float64Array(ANILLOS_A_LA_VEZ);

  /** Empieza un anillo. Devuelve su asa. */
  anunciar(a: AnuncioDeEfecto): number {
    const i = this.ranuras.tomar(a.inicio);
    this.inicio[i] = a.inicio;
    this.impacto[i] = a.impacto;
    this.amenaza[i] = Math.max(0, AMENAZAS.indexOf(a.amenaza));
    this.propio[i] = a.propio ? 1 : 0;
    this.veredicto[i] = 0;
    this.veredictoEn[i] = 0;
    ponerSitio(a.sobre, i, this.quien, this.x, this.y, this.z);
    return this.ranuras.asa(i);
  }

  /** El servidor juzgó el golpe: el anillo remata según el veredicto. `false` si ya no estaba. */
  resolver(asa: number, veredicto: VeredictoDelAnillo, t: number): boolean {
    const i = this.ranuras.ranuraDe(asa);
    if (i < 0) return false;
    this.veredicto[i] = 1 + VEREDICTOS.indexOf(veredicto);
    this.veredictoEn[i] = t;
    return true;
  }

  /** El golpe no llegó a darse (el atacante cayó, se interrumpió): el anillo se va sin remate. */
  retirar(asa: number): boolean {
    const i = this.ranuras.ranuraDe(asa);
    if (i < 0) return false;
    this.ranuras.soltar(i);
    return true;
  }

  /** Suelta los que ya remataron. */
  barrer(t: number): void {
    for (let i = 0; i < ANILLOS_A_LA_VEZ; i++) {
      if (this.ranuras.viva[i] === 0) continue;
      const fin = Math.max(this.impacto[i] as number, this.veredicto[i] === 0 ? 0 : (this.veredictoEn[i] as number));
      if (t > fin + TRAS_EL_IMPACTO_MS) this.ranuras.soltar(i);
    }
  }
}

function ponerSitio(sitio: Sitio, i: number, quien: Int32Array, x: Float64Array, y: Float64Array, z: Float64Array): void {
  if (typeof sitio === 'number') {
    quien[i] = sitio;
    x[i] = 0;
    y[i] = 0;
    z[i] = 0;
  } else {
    quien[i] = -1;
    x[i] = sitio.x;
    y[i] = sitio.y;
    z[i] = sitio.z;
  }
}

/* ─────────────────────────────── El apuntado ─────────────────────────────── */

export interface ApuntadoDeEfecto {
  /** Cuándo empieza a apuntar, ms del aparato. */
  readonly inicio: number;
  /** Cuándo termina de apuntar (12 tics después): ahí la línea se fija y sale la ráfaga. */
  readonly fin: number;
  /** La boca de la pistola, o el cuerpo del tirador (se usa su mano a la altura de la bala). */
  readonly desde: Sitio;
  /** A quién apunta: sigue al blanco hasta `fin` y después se queda donde estaba. */
  readonly hacia: Sitio;
}

/** Cuánto tarda la línea en irse después de fijarse. */
export const COLA_DEL_APUNTADO_MS = 140;

export class Apuntados {
  readonly ranuras = new Ranuras(APUNTADOS_A_LA_VEZ);
  readonly inicio = new Float64Array(APUNTADOS_A_LA_VEZ);
  readonly fin = new Float64Array(APUNTADOS_A_LA_VEZ);
  readonly quienDesde = new Int32Array(APUNTADOS_A_LA_VEZ);
  readonly dx = new Float64Array(APUNTADOS_A_LA_VEZ);
  readonly dy = new Float64Array(APUNTADOS_A_LA_VEZ);
  readonly dz = new Float64Array(APUNTADOS_A_LA_VEZ);
  readonly quienHacia = new Int32Array(APUNTADOS_A_LA_VEZ);
  readonly hx = new Float64Array(APUNTADOS_A_LA_VEZ);
  readonly hy = new Float64Array(APUNTADOS_A_LA_VEZ);
  readonly hz = new Float64Array(APUNTADOS_A_LA_VEZ);

  apuntar(a: ApuntadoDeEfecto): number {
    const i = this.ranuras.tomar(a.inicio);
    this.inicio[i] = a.inicio;
    this.fin[i] = a.fin;
    ponerSitio(a.desde, i, this.quienDesde, this.dx, this.dy, this.dz);
    ponerSitio(a.hacia, i, this.quienHacia, this.hx, this.hy, this.hz);
    return this.ranuras.asa(i);
  }

  retirar(asa: number): boolean {
    const i = this.ranuras.ranuraDe(asa);
    if (i < 0) return false;
    this.ranuras.soltar(i);
    return true;
  }

  barrer(t: number): void {
    for (let i = 0; i < APUNTADOS_A_LA_VEZ; i++) {
      if (this.ranuras.viva[i] === 1 && t > (this.fin[i] as number) + COLA_DEL_APUNTADO_MS) this.ranuras.soltar(i);
    }
  }
}

/* ─────────────────────────────── Las balas ─────────────────────────────── */

export class Balas {
  readonly ranuras = new Ranuras(BALAS_A_LA_VEZ);
  readonly salida = new Float64Array(BALAS_A_LA_VEZ);
  readonly x = new Float64Array(BALAS_A_LA_VEZ);
  readonly y = new Float64Array(BALAS_A_LA_VEZ);
  readonly z = new Float64Array(BALAS_A_LA_VEZ);
  readonly rumbo = new Uint8Array(BALAS_A_LA_VEZ);
  /** NaN mientras la bala sigue. */
  readonly fin = new Float64Array(BALAS_A_LA_VEZ);
  /** m/s y m de su proyectil; 0 = los del diseño (ver `BalaDeEfecto.velocidad`). */
  readonly velocidad = new Float64Array(BALAS_A_LA_VEZ);
  readonly alcance = new Float64Array(BALAS_A_LA_VEZ);

  /** Una bala nueva (el aviso `bala`: origen, rumbo e instante de salida). */
  disparar(b: BalaDeEfecto): number {
    const i = this.ranuras.tomar(b.salida);
    this.salida[i] = b.salida;
    this.x[i] = b.x;
    this.y[i] = b.y;
    this.z[i] = b.z;
    this.rumbo[i] = ((Math.floor(b.rumbo) % 256) + 256) % 256;
    this.fin[i] = b.fin === null ? Number.NaN : b.fin;
    this.velocidad[i] = velocidadDeLaBala(b);
    this.alcance[i] = alcanceDeLaBala(b);
    return this.ranuras.asa(i);
  }

  /** El servidor la dio por acabada en `t` (dio en alguien o en una pared). */
  acabar(asa: number, t: number): boolean {
    const i = this.ranuras.ranuraDe(asa);
    if (i < 0) return false;
    this.fin[i] = t;
    return true;
  }

  /** La bala de la ranura `i` escrita en `destino` (un objeto que la pieza reutiliza). */
  leer(i: number, destino: { salida: number; x: number; y: number; z: number; rumbo: number; fin: number | null; velocidad: number; alcance: number }): void {
    destino.salida = this.salida[i] as number;
    destino.x = this.x[i] as number;
    destino.y = this.y[i] as number;
    destino.z = this.z[i] as number;
    destino.rumbo = this.rumbo[i] as number;
    const fin = this.fin[i] as number;
    destino.fin = fin === fin ? fin : null;
    destino.velocidad = this.velocidad[i] as number;
    destino.alcance = this.alcance[i] as number;
  }

  private readonly lectura = { salida: 0, x: 0, y: 0, z: 0, rumbo: 0, fin: null as number | null, velocidad: 0, alcance: 0 };

  barrer(t: number): void {
    for (let i = 0; i < BALAS_A_LA_VEZ; i++) {
      if (this.ranuras.viva[i] === 0) continue;
      this.leer(i, this.lectura);
      if (balaAcabada(this.lectura, t)) this.ranuras.soltar(i);
    }
  }
}

/* ─────────────────────────────── Chispas (arrays de la GPU) ─────────────────────────────── */

/**
 * LAS CHISPAS, escritas donde las lee el sombreador. Cada una es analítica: sale de `origen` con
 * `velocidad` en el instante `nace` y vive `vida`; el sombreador la mueve con la gravedad y la
 * estira según va. La CPU sólo escribe al nacer. Un anillo circular: la más vieja se pisa.
 *
 * Los tiempos van en SEGUNDOS del reloj presentado desde el origen del sistema: un `float` de la
 * GPU guarda el milisegundo sin perderlo durante horas (a 10⁴ s, la precisión es de 1 ms).
 */
export class Chispas {
  readonly capacidad = capacidadDe('chispas');
  /** xyz de salida. */
  readonly origen = new Float32Array(this.capacidad * 3);
  /** xyz de la velocidad, m/s. */
  readonly velocidad = new Float32Array(this.capacidad * 3);
  /** nace (s), vida (s), talla (m), semilla. */
  readonly tiempos = new Float32Array(this.capacidad * 4);
  /** rgb lineal. */
  readonly color = new Float32Array(this.capacidad * 3);
  /** La siguiente que se escribe. */
  private siguiente = 0;
  /** Tramo sucio desde la última subida: [desde, hasta). Vacío si desde >= hasta. */
  suciasDesde = 0;
  suciasHasta = 0;
  /** Cuántas se han escrito en total: la pieza dibuja `min(escritas, tope)`. */
  escritas = 0;
  /** Cuándo muere la última que sigue viva (s presentados): hasta entonces la malla se pinta. */
  vivasHasta = Number.NEGATIVE_INFINITY;

  /** Escribe una chispa en el anillo de `tope` ranuras (el del nivel). */
  lanzar(tope: number, ox: number, oy: number, oz: number, vx: number, vy: number, vz: number, nace: number, vida: number, talla: number, color: number): void {
    const n = Math.max(1, Math.min(tope, this.capacidad));
    const i = this.siguiente % n;
    this.siguiente = (i + 1) % n;
    this.origen[i * 3] = ox;
    this.origen[i * 3 + 1] = oy;
    this.origen[i * 3 + 2] = oz;
    this.velocidad[i * 3] = vx;
    this.velocidad[i * 3 + 1] = vy;
    this.velocidad[i * 3 + 2] = vz;
    this.tiempos[i * 4] = nace;
    this.tiempos[i * 4 + 1] = vida;
    this.tiempos[i * 4 + 2] = talla;
    this.tiempos[i * 4 + 3] = (i * 0.618034) % 1;
    const [r, g, b] = componentesLineales(color);
    this.color[i * 3] = r;
    this.color[i * 3 + 1] = g;
    this.color[i * 3 + 2] = b;
    this.escritas++;
    this.vivasHasta = Math.max(this.vivasHasta, nace + vida);
    if (this.suciasDesde >= this.suciasHasta) {
      this.suciasDesde = i;
      this.suciasHasta = i + 1;
    } else {
      this.suciasDesde = Math.min(this.suciasDesde, i);
      this.suciasHasta = Math.max(this.suciasHasta, i + 1);
    }
  }

  /** La pieza subió el tramo sucio. */
  limpiar(): void {
    this.suciasDesde = 0;
    this.suciasHasta = 0;
  }
}

/* ─────────────────────────────── Los impactos ─────────────────────────────── */

export interface ImpactoDeEfecto {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** De 0 (un roce, la Seguida) a 1 (el Cierre, el estampado). */
  readonly fuerza: number;
  /** Hacia dónde iba el golpe: las chispas salen hacia ahí. Opcional. */
  readonly dx?: number;
  readonly dy?: number;
  readonly dz?: number;
  /** El color de las chispas; si no, el blanco del golpe con el borde del código. */
  readonly color?: number;
}

export class Impactos {
  readonly ranuras = new Ranuras(IMPACTOS_A_LA_VEZ);
  /** Reloj presentado, ms. */
  readonly nace = new Float64Array(IMPACTOS_A_LA_VEZ);
  readonly x = new Float64Array(IMPACTOS_A_LA_VEZ);
  readonly y = new Float64Array(IMPACTOS_A_LA_VEZ);
  readonly z = new Float64Array(IMPACTOS_A_LA_VEZ);
  readonly fuerza = new Float64Array(IMPACTOS_A_LA_VEZ);
  /** Número de orden de cada impacto: siembra sus chispas. */
  numero = 0;

  barrer(tPresentado: number): void {
    for (let i = 0; i < IMPACTOS_A_LA_VEZ; i++) {
      if (this.ranuras.viva[i] === 1 && tPresentado > (this.nace[i] as number) + ONDA_DEL_IMPACTO_MS) this.ranuras.soltar(i);
    }
  }

  /** El parpadeo más fuerte de los impactos vivos en `tPresentado`. Para el posproceso y la cámara. */
  parpadeo(tPresentado: number): number {
    let p = 0;
    for (let i = 0; i < IMPACTOS_A_LA_VEZ; i++) {
      if (this.ranuras.viva[i] === 0) continue;
      p = Math.max(p, parpadeoDelImpacto(tPresentado, this.nace[i] as number, this.fuerza[i] as number));
    }
    return p;
  }
}

/* ─────────────────────────────── Siluetas: impresión, desalojo, salida ─────────────────────────────── */

export type ClaseDeSilueta = 'impresion' | 'desalojo' | 'salida';
export const CLASES_DE_SILUETA: readonly ClaseDeSilueta[] = ['impresion', 'desalojo', 'salida'];

export interface SiluetaDeEfecto {
  /** Los pies del cuerpo. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Índice en `SILUETAS` de `cuentas.ts` (0-3 los Celadores, 4 el desvelado). */
  readonly silueta: number;
}

export interface SalidaDeEfecto extends SiluetaDeEfecto {
  /** El auricular de la cabina y los puntos del cable hacia arriba (hasta `TRAMOS_DEL_CABLE`). */
  readonly auricular: Punto;
  readonly cable: readonly Punto[];
}

export class Siluetas {
  readonly ranuras = new Ranuras(SILUETAS_A_LA_VEZ);
  /** Índice en `CLASES_DE_SILUETA`. */
  readonly clase = new Uint8Array(SILUETAS_A_LA_VEZ);
  /** Reloj presentado, ms. */
  readonly inicio = new Float64Array(SILUETAS_A_LA_VEZ);
  readonly x = new Float64Array(SILUETAS_A_LA_VEZ);
  readonly y = new Float64Array(SILUETAS_A_LA_VEZ);
  readonly z = new Float64Array(SILUETAS_A_LA_VEZ);
  readonly silueta = new Uint8Array(SILUETAS_A_LA_VEZ);
  /** El cable de la salida: auricular y `TRAMOS_DEL_CABLE` puntos, xyz cada uno. */
  readonly cable = new Float64Array(SILUETAS_A_LA_VEZ * (TRAMOS_DEL_CABLE + 1) * 3);
  /** Cuántos puntos de cable tiene cada salida (0 en las demás). */
  readonly puntosDelCable = new Uint8Array(SILUETAS_A_LA_VEZ);

  alta(clase: ClaseDeSilueta, s: SiluetaDeEfecto, tPresentado: number): number {
    const i = this.ranuras.tomar(tPresentado);
    this.clase[i] = CLASES_DE_SILUETA.indexOf(clase);
    this.inicio[i] = tPresentado;
    this.x[i] = s.x;
    this.y[i] = s.y;
    this.z[i] = s.z;
    this.silueta[i] = Math.max(0, Math.min(4, Math.floor(s.silueta)));
    this.puntosDelCable[i] = 0;
    return i;
  }

  barrer(tPresentado: number): void {
    for (let i = 0; i < SILUETAS_A_LA_VEZ; i++) {
      if (this.ranuras.viva[i] === 0) continue;
      const e = tPresentado - (this.inicio[i] as number);
      const clase = CLASES_DE_SILUETA[this.clase[i] as number];
      const dura =
        clase === 'impresion' ? IMPRESION_MS + COLA_DE_LOS_GLIFOS_MS : clase === 'desalojo' ? DESALOJO_MS + COLA_DEL_DESALOJO_MS : SALIDA_MS;
      if (e > dura) this.ranuras.soltar(i);
    }
  }
}

/* ─────────────────────────────── Haces, Trasvases, Bis, pantallas ─────────────────────────────── */

/** Lo que tarda el haz en apagarse cuando la cabina calla. */
export const APAGADO_DEL_HAZ_MS = 600;

export class Haces {
  readonly ranuras = new Ranuras(HACES_A_LA_VEZ);
  readonly x = new Float64Array(HACES_A_LA_VEZ);
  readonly z = new Float64Array(HACES_A_LA_VEZ);
  /** Reloj presentado, ms: cuándo empezó a sonar (marca el compás del timbre). */
  readonly inicio = new Float64Array(HACES_A_LA_VEZ);
  /** Cuándo empezó a apagarse; NaN mientras suena. */
  readonly apagado = new Float64Array(HACES_A_LA_VEZ);

  barrer(tPresentado: number): void {
    for (let i = 0; i < HACES_A_LA_VEZ; i++) {
      const a = this.apagado[i] as number;
      if (this.ranuras.viva[i] === 1 && a === a && tPresentado > a + APAGADO_DEL_HAZ_MS) this.ranuras.soltar(i);
    }
  }
}

export class Trasvases {
  readonly ranuras = new Ranuras(TRASVASES_A_LA_VEZ);
  readonly inicio = new Float64Array(TRASVASES_A_LA_VEZ);
  readonly quienDesde = new Int32Array(TRASVASES_A_LA_VEZ);
  readonly dx = new Float64Array(TRASVASES_A_LA_VEZ);
  readonly dy = new Float64Array(TRASVASES_A_LA_VEZ);
  readonly dz = new Float64Array(TRASVASES_A_LA_VEZ);
  readonly quienHacia = new Int32Array(TRASVASES_A_LA_VEZ);
  readonly hx = new Float64Array(TRASVASES_A_LA_VEZ);
  readonly hy = new Float64Array(TRASVASES_A_LA_VEZ);
  readonly hz = new Float64Array(TRASVASES_A_LA_VEZ);
  readonly semilla = new Uint32Array(TRASVASES_A_LA_VEZ);

  barrer(tPresentado: number): void {
    for (let i = 0; i < TRASVASES_A_LA_VEZ; i++) {
      if (this.ranuras.viva[i] === 1 && tPresentado > (this.inicio[i] as number) + TRASVASE_MS + APAGADO_DEL_TRASVASE_MS) this.ranuras.soltar(i);
    }
  }
}

export interface PantallaDeEfecto {
  /** El centro de la base de la pantalla. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Hacia dónde mira, en radianes alrededor del eje vertical (0 = hacia +z). */
  readonly orientacion: number;
  readonly ancho: number;
  readonly alto: number;
  /** Columnas de glifos a lo ancho. */
  readonly columnas: number;
  /** Color sRGB; si no, el del código. */
  readonly color?: number;
  /** `true` para que suba en vez de caer. */
  readonly sube?: boolean;
}

export class Pantallas {
  readonly capacidad = capacidadDe('pantallas');
  readonly ranuras = new Ranuras(this.capacidad);
  readonly x = new Float64Array(this.capacidad);
  readonly y = new Float64Array(this.capacidad);
  readonly z = new Float64Array(this.capacidad);
  readonly orientacion = new Float64Array(this.capacidad);
  readonly ancho = new Float64Array(this.capacidad);
  readonly alto = new Float64Array(this.capacidad);
  readonly columnas = new Uint16Array(this.capacidad);
  readonly color = new Uint32Array(this.capacidad);
  readonly sube = new Uint8Array(this.capacidad);
  /** Sube cada vez que cambia algo: la pieza reescribe los atributos sólo entonces. */
  version = 0;

  poner(p: PantallaDeEfecto): number {
    const i = this.ranuras.tomar(this.version);
    this.x[i] = p.x;
    this.y[i] = p.y;
    this.z[i] = p.z;
    this.orientacion[i] = p.orientacion;
    this.ancho[i] = p.ancho;
    this.alto[i] = p.alto;
    this.columnas[i] = Math.max(1, Math.min(64, Math.round(p.columnas)));
    this.color[i] = p.color ?? COLORES.codigo;
    this.sube[i] = p.sube === true ? 1 : 0;
    this.version++;
    return this.ranuras.asa(i);
  }

  quitar(asa: number): boolean {
    const i = this.ranuras.ranuraDe(asa);
    if (i < 0) return false;
    this.ranuras.soltar(i);
    this.version++;
    return true;
  }
}

/* ─────────────────────────────── Esquirlas (arrays de la GPU) ─────────────────────────────── */

export interface MontonDeEsquirlas {
  /** Desde dónde saltan (el cuerpo del Celador, o del desvelado caído). */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly cuantas: number;
  /** Siembra el reparto: el id del suceso, para que salgan igual en todos los aparatos. */
  readonly semilla: number;
}

/**
 * LAS ESQUIRLAS, también escritas donde las lee el sombreador: el salto, el vaivén, el giro y la
 * recogida salen del tiempo y de estos números, y la CPU sólo escribe al soltar y al recoger.
 */
export class Esquirlas {
  readonly capacidad = ESQUIRLAS_A_LA_VEZ;
  readonly ranuras = new Ranuras(ESQUIRLAS_A_LA_VEZ);
  /** Dónde se queda flotando (la altura base está en el sombreador). */
  readonly sitio = new Float32Array(ESQUIRLAS_A_LA_VEZ * 3);
  /** Desde dónde salta. */
  readonly desde = new Float32Array(ESQUIRLAS_A_LA_VEZ * 3);
  /** Hacia dónde va al recogerla (el pecho de quien la coge). */
  readonly hacia = new Float32Array(ESQUIRLAS_A_LA_VEZ * 3);
  /** nace (s presentados), recogida (s; −1 si no), semilla, visible (1/0). */
  readonly tiempos = new Float32Array(ESQUIRLAS_A_LA_VEZ * 4);
  /** Recogida en ms presentados (NaN si no), para soltar la ranura al acabar. */
  private readonly recogidaMs = new Float64Array(ESQUIRLAS_A_LA_VEZ);
  /** Sube cada vez que cambia algo. */
  version = 0;

  alta(m: MontonDeEsquirlas, k: number, naceS: number, tPresentado: number): number {
    const i = this.ranuras.tomar(tPresentado);
    const { dx, dz } = dondeCaeLaEsquirla(k, m.cuantas, m.semilla);
    this.sitio[i * 3] = m.x + dx;
    this.sitio[i * 3 + 1] = m.y;
    this.sitio[i * 3 + 2] = m.z + dz;
    this.desde[i * 3] = m.x;
    this.desde[i * 3 + 1] = m.y + 1.0;
    this.desde[i * 3 + 2] = m.z;
    this.tiempos[i * 4] = naceS;
    this.tiempos[i * 4 + 1] = -1;
    this.tiempos[i * 4 + 2] = azarDe(m.semilla, 1000 + k);
    this.tiempos[i * 4 + 3] = 1;
    this.recogidaMs[i] = Number.NaN;
    this.version++;
    return this.ranuras.asa(i);
  }

  /** La recoge alguien cuyo pecho está en `hacia`. */
  recoger(asa: number, hacia: Punto, recogidaS: number, tPresentado: number): boolean {
    const i = this.ranuras.ranuraDe(asa);
    if (i < 0 || this.recogidaMs[i] === this.recogidaMs[i]) return false;
    this.hacia[i * 3] = hacia.x;
    this.hacia[i * 3 + 1] = hacia.y;
    this.hacia[i * 3 + 2] = hacia.z;
    this.tiempos[i * 4 + 1] = recogidaS;
    this.recogidaMs[i] = tPresentado;
    this.version++;
    return true;
  }

  /** Se va sin más (el montón caducó a los 20 s). */
  quitar(asa: number): boolean {
    const i = this.ranuras.ranuraDe(asa);
    if (i < 0) return false;
    this.tiempos[i * 4 + 3] = 0;
    this.ranuras.soltar(i);
    this.version++;
    return true;
  }

  barrer(tPresentado: number): void {
    for (let i = 0; i < ESQUIRLAS_A_LA_VEZ; i++) {
      const r = this.recogidaMs[i] as number;
      if (this.ranuras.viva[i] === 1 && r === r && tPresentado > r + RECOGIDA_DE_LA_ESQUIRLA_MS) {
        this.tiempos[i * 4 + 3] = 0;
        this.ranuras.soltar(i);
        this.version++;
      }
    }
  }
}

/* ─────────────────────────────── El sistema entero ─────────────────────────────── */

export interface SistemaDeEfectos {
  readonly reloj: RelojDePresentacion;
  /** El `t` (ms del aparato) que es el cero de los tiempos que ven los sombreadores. */
  readonly origen: number;
  /** El nivel de calidad que mandan las piezas (lo pone el gobernador). */
  nivel: Nivel;
  /** Dónde está cada cuerpo; `null` hasta que el juego lo ponga. */
  localizar: Localizador | null;
  /**
   * EL RAYO (`rayo/contrato.ts`): MANDOS lo llama con el rayo propio y `red/escenificar.ts` con los ajenos.
   * Se lee aquí en CADA llamada (`sistema.rayo.soltar(…)`) y no se guarda: quien lo pinta puede cambiarlo por
   * otro que lo envuelva. Empieza con el de `efectos/rayo.ts` (en la fase 0, el que no hace nada).
   */
  rayo: EfectosDelRayo;
  /**
   * Dónde está la mano (la boca del rayo) de cada cuerpo, fotograma a fotograma; `null` hasta que la pongan.
   * La pone `Quiebro.tsx` con la de los personajes (`DirectorDeLosPersonajes.bocaDe`).
   */
  boca: BocaDe | null;

  /** El `t` del fotograma en curso, ms del aparato, y su versión presentada. */
  readonly ahora: { verdadero: number; presentado: number };

  readonly anillos: Anillos;
  readonly apuntados: Apuntados;
  readonly balas: Balas;
  readonly impactos: Impactos;
  readonly chispas: Chispas;
  readonly siluetas: Siluetas;
  readonly haces: Haces;
  readonly trasvases: Trasvases;
  readonly pantallas: Pantallas;
  readonly esquirlas: Esquirlas;
  /** El Bis en curso: inicio presentado (NaN si no hay), centro y radio. */
  readonly bisEnCurso: { inicio: number; x: number; z: number; radio: number };

  /** Empieza un fotograma: fija `ahora` y suelta lo que ya terminó. Lo llama la raíz, una vez. */
  fotograma(t: number): void;
  /** Segundos del reloj presentado (o del verdadero) desde el origen, para los sombreadores. */
  segundos(ms: number): number;

  impacto(i: ImpactoDeEfecto, t: number): void;
  imprimir(s: SiluetaDeEfecto, t: number): void;
  desalojar(s: SiluetaDeEfecto, t: number): void;
  salir(s: SalidaDeEfecto, t: number): void;
  trasvasar(desde: Sitio, hacia: Sitio, t: number, semilla?: number): void;
  bis(centro: { x: number; z: number; radio?: number }, t: number): void;
  /** Una cabina empieza a sonar: su haz asoma sobre los tejados. Devuelve el asa para apagarlo. */
  encenderHaz(x: number, z: number, t: number): number;
  apagarHaz(asa: number, t: number): boolean;
  /** Suelta un montón de esquirlas; devuelve sus asas. */
  soltarEsquirlas(m: MontonDeEsquirlas, t: number): number[];
  recogerEsquirla(asa: number, hacia: Punto, t: number): boolean;
  /** El fogonazo de pantalla de los impactos en el fotograma en curso, de 0 a 1. */
  parpadeo(): number;
  /** Lo apaga todo (fin de la noche, cambio de sala). */
  vaciar(): void;
}

/** UN SISTEMA NUEVO. `origen` es el `t` a partir del cual cuentan los segundos de los sombreadores. */
export function crearSistemaDeEfectos(reloj: RelojDePresentacion, origen: number): SistemaDeEfectos {
  const anillos = new Anillos();
  const apuntados = new Apuntados();
  const balas = new Balas();
  const impactos = new Impactos();
  const chispas = new Chispas();
  const siluetas = new Siluetas();
  const haces = new Haces();
  const trasvases = new Trasvases();
  const pantallas = new Pantallas();
  const esquirlas = new Esquirlas();
  const ahora = { verdadero: origen, presentado: origen };
  const bisEnCurso = { inicio: Number.NaN, x: 0, z: 0, radio: RADIO_DEL_BIS };

  const sistema: SistemaDeEfectos = {
    reloj,
    origen,
    nivel: 1,
    localizar: null,
    rayo: crearEfectosDelRayo(),
    boca: null,
    ahora,
    anillos,
    apuntados,
    balas,
    impactos,
    chispas,
    siluetas,
    haces,
    trasvases,
    pantallas,
    esquirlas,
    bisEnCurso,

    fotograma(t) {
      ahora.verdadero = t;
      ahora.presentado = reloj.presentado(t);
      anillos.barrer(t);
      apuntados.barrer(t);
      balas.barrer(t);
      const p = ahora.presentado;
      impactos.barrer(p);
      siluetas.barrer(p);
      haces.barrer(p);
      trasvases.barrer(p);
      esquirlas.barrer(p);
      if (bisEnCurso.inicio === bisEnCurso.inicio && p > bisEnCurso.inicio + BIS_MS) bisEnCurso.inicio = Number.NaN;
    },

    segundos(ms) {
      return (ms - origen) / 1000;
    },

    impacto(imp, t) {
      const p = reloj.presentado(t);
      const i = impactos.ranuras.tomar(p);
      const numero = ++impactos.numero;
      impactos.nace[i] = p;
      impactos.x[i] = imp.x;
      impactos.y[i] = imp.y;
      impactos.z[i] = imp.z;
      impactos.fuerza[i] = Math.min(1, Math.max(0, imp.fuerza));
      /* Las chispas: en abanico hacia donde iba el golpe, con algo hacia arriba. */
      const f = impactos.fuerza[i] as number;
      const cuantas = chispasDelImpacto(f, ajuste('chispasPorImpacto', sistema.nivel));
      const tope = ajuste('chispasVivas', sistema.nivel);
      const v = velocidadDeLasChispas(f);
      const vida = vidaDeLaChispa(f) / 1000;
      const naceS = (p - origen) / 1000;
      let hx = imp.dx ?? 0;
      let hy = imp.dy ?? 0;
      let hz = imp.dz ?? 0;
      const largo = Math.sqrt(hx * hx + hy * hy + hz * hz);
      if (largo > 1e-6) {
        hx /= largo;
        hy /= largo;
        hz /= largo;
      }
      const color = imp.color ?? COLORES.blanco;
      for (let k = 0; k < cuantas; k++) {
        /* Una dirección en la esfera, sembrada; y empujada hacia el golpe si lo hay. */
        const u = azarDe(numero, k * 3 + 1) * 2 - 1;
        const a = azarDe(numero, k * 3 + 2) * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        let x = r * Math.cos(a) + hx * 1.4;
        let y = Math.abs(u) * 0.8 + 0.35 + hy * 1.4;
        let z = r * Math.sin(a) + hz * 1.4;
        const l = Math.sqrt(x * x + y * y + z * z) || 1;
        const rapidez = v * (0.45 + 0.55 * azarDe(numero, k * 3 + 3));
        x = (x / l) * rapidez;
        y = (y / l) * rapidez;
        z = (z / l) * rapidez;
        /* Una de cada cuatro sale del color del código: el golpe «suelta» Grafía. */
        chispas.lanzar(tope, imp.x, imp.y, imp.z, x, y, z, naceS, vida * (0.6 + 0.4 * azarDe(numero, k + 77)), 0.06 + 0.08 * f, k % 4 === 3 ? COLORES.codigo : color);
      }
    },

    imprimir(s, t) {
      siluetas.alta('impresion', s, reloj.presentado(t));
    },

    desalojar(s, t) {
      siluetas.alta('desalojo', s, reloj.presentado(t));
    },

    salir(s, t) {
      const i = siluetas.alta('salida', s, reloj.presentado(t));
      const puntos = [s.auricular, ...s.cable.slice(0, TRAMOS_DEL_CABLE)];
      const base = i * (TRAMOS_DEL_CABLE + 1) * 3;
      puntos.forEach((q, k) => {
        siluetas.cable[base + k * 3] = q.x;
        siluetas.cable[base + k * 3 + 1] = q.y;
        siluetas.cable[base + k * 3 + 2] = q.z;
      });
      siluetas.puntosDelCable[i] = puntos.length;
    },

    trasvasar(desde, hacia, t, semilla) {
      const p = reloj.presentado(t);
      const i = trasvases.ranuras.tomar(p);
      trasvases.inicio[i] = p;
      ponerSitio(desde, i, trasvases.quienDesde, trasvases.dx, trasvases.dy, trasvases.dz);
      ponerSitio(hacia, i, trasvases.quienHacia, trasvases.hx, trasvases.hy, trasvases.hz);
      trasvases.semilla[i] = (semilla ?? Math.floor(p)) >>> 0;
    },

    bis(centro, t) {
      bisEnCurso.inicio = reloj.presentado(t);
      bisEnCurso.x = centro.x;
      bisEnCurso.z = centro.z;
      bisEnCurso.radio = centro.radio ?? RADIO_DEL_BIS;
    },

    encenderHaz(x, z, t) {
      const p = reloj.presentado(t);
      const i = haces.ranuras.tomar(p);
      haces.x[i] = x;
      haces.z[i] = z;
      haces.inicio[i] = p;
      haces.apagado[i] = Number.NaN;
      return haces.ranuras.asa(i);
    },

    apagarHaz(asa, t) {
      const i = haces.ranuras.ranuraDe(asa);
      if (i < 0) return false;
      if (haces.apagado[i] !== haces.apagado[i]) haces.apagado[i] = reloj.presentado(t);
      return true;
    },

    soltarEsquirlas(m, t) {
      const p = reloj.presentado(t);
      const naceS = (p - origen) / 1000;
      const asas: number[] = [];
      for (let k = 0; k < m.cuantas; k++) asas.push(esquirlas.alta(m, k, naceS, p));
      return asas;
    },

    recogerEsquirla(asa, hacia, t) {
      const p = reloj.presentado(t);
      return esquirlas.recoger(asa, hacia, (p - origen) / 1000, p);
    },

    parpadeo() {
      return impactos.parpadeo(ahora.presentado);
    },

    vaciar() {
      anillos.ranuras.vaciar();
      apuntados.ranuras.vaciar();
      balas.ranuras.vaciar();
      impactos.ranuras.vaciar();
      siluetas.ranuras.vaciar();
      haces.ranuras.vaciar();
      trasvases.ranuras.vaciar();
      pantallas.ranuras.vaciar();
      pantallas.version++;
      esquirlas.ranuras.vaciar();
      for (let i = 0; i < esquirlas.capacidad; i++) esquirlas.tiempos[i * 4 + 3] = 0;
      esquirlas.version++;
      bisEnCurso.inicio = Number.NaN;
      /* Las chispas no se vacían: mueren solas en medio segundo. */
    },
  };
  return sistema;
}

/** Cuántas salidas caben a la vez con su cable (lo usa la pieza de los hilos). */
export const SALIDAS_CON_CABLE = SALIDAS_A_LA_VEZ;
