/**
 * LA VENTANA DE CELDAS (§5.7 de `docs/quiebro/CIUDAD-ABIERTA.md`): el detalle de la ciudad abierta, sólo
 * alrededor de quien mira, en una malla por familia y con las LLAMADAS CONSTANTES al cruzar la ciudad.
 *
 * ═══ CUÁNTAS CELDAS ═══
 *
 * N0 y N1, 3 × 3 celdas (144 m: lo que medía el barrio de hoy, así que cuesta lo que costaba); N2, 4 × 4;
 * N3, 5 × 5. Con un número impar de celdas la ventana se centra en el centro de una celda; con uno par,
 * en una esquina. Se RECENTRA cuando quien mira se aleja de su centro 24 m y un poco más (la holgura evita
 * que ir y venir por la raya rehaga la ventana en cada paso): a 7 m/s, cruzar media celda son 3,4 s, y
 * rehacerla son unas decenas de fotogramas.
 *
 * ═══ UNA MALLA POR FAMILIA, CON DOBLE BÚFER ═══
 *
 * Cada familia (`FAMILIAS` de `celdas.ts`) es UNA malla con dos mitades en el mismo búfer: se dibuja una
 * (su `drawRange`) mientras en la otra se copian las celdas de la ventana siguiente, trozo a trozo, y cada
 * trozo se sube al copiarlo (`addUpdateRange`). Cuando está todo, se cambia de mitad: sólo cambia qué
 * rango se dibuja, así que el cambio no sube nada ni tira un fotograma. Dos mallas por familia no sirven:
 * three cuenta como llamada una malla con el rango vacío, y no sube lo que no se dibuja (lo midió el
 * frente «medida» en la ola 0). La llamada de cada familia es la misma con la ventana llena o vacía: las
 * llamadas no cambian al cruzar la ciudad, que es lo que exige `verify:quiebro-ciudad`.
 *
 * ═══ EL TRABAJO, A TROZOS CONTADOS EN TRIÁNGULOS ═══
 *
 * Construir las celdas que faltan (`construirLaCelda`, que cede tras cada pieza) y copiarlas va en trozos
 * de `PRESUPUESTO_DE_LA_VENTANA[nivel].trozo` triángulos como mucho, y un fotograma sólo empieza un trozo
 * si le cabe entero en su tope (`porFotograma`): ningún fotograma pasa de su tope, pase lo que pase. Se
 * cuenta en triángulos y no en milisegundos (§5.7): el reloj de un teléfono ocupado miente. Las celdas
 * hechas se guardan (las 36 últimas): volver por donde se vino no construye nada.
 *
 * ═══ EL GRADO DE CADA CELDA ═══
 *
 * Cada celda se construye con el grado que le toca en SU ventana (`grados.ts`: en N2 y N3, más detalle en el
 * bloque del centro) y se guarda por su grado y su relieve: la misma celda puede estar guardada en dos versiones,
 * y la que cambia de grado al recentrar se construye otra vez (en N3, unas seis por recentrado, además de las
 * nuevas). En N0 y N1 el grado es uno solo y no cambia nunca.
 *
 * Sin WebGL: el comprobador cruza la ciudad con esto mismo en Node, fotograma a fotograma.
 */
import * as THREE from 'three';
import type { GradoDeLaCelda, NivelDeLaCiudad } from './tipos';
import { CELDA_MAXIMA, CELDA_MINIMA, LADO_DE_CELDA, celdaDe, celdaDelIndice, indiceDeCelda } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import type { CeldaConstruida, Familia, PartesDeLaCiudad } from './celdas';
import { FAMILIAS, atributosDeLaFamilia, construirLaCelda } from './celdas';
import { gradoDeLaCelda, relieveDeHoy } from './grados';
import type { GeometriaVolcada } from './geometria';

/* ═══════════════════════════════ LOS NÚMEROS ═══════════════════════════════ */

/** Cuántas celdas por lado tiene la ventana en cada nivel (§5.7). */
export const LADO_DE_LA_VENTANA: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 3, 1: 3, 2: 4, 3: 5 };

/** Lo que hay que pasarse de los 24 m del centro para que la ventana se recentre. */
export const HOLGURA_DEL_RECENTRADO = 6;

/**
 * EL TRABAJO DE UN FOTOGRAMA: `porFotograma`, los triángulos que se escriben o se copian como mucho en un
 * fotograma; `trozo`, lo más que escribe o copia un trozo. El frente «medida» propuso 4.000 y trozos de
 * 1.000 para N0 con celdas de cajas lisas; las de verdad cuestan más por triángulo (unos 0,65 µs en un PC
 * al construirlas: matrices, cilindros, rótulos), y 4.000 eran 3 ms de PC, 20-30 en un teléfono modesto.
 * Con 800 es medio milisegundo de PC, unos 3-5 en N0, que es el trozo del §5.7; y la ventana nueva se ve en
 * 3 s como mucho cruzando a 7 m/s (el doble del trote), frente a los 6,9 s del §5.7. Los de arriba crecen
 * con el aparato. N1 lleva DOS trozos (2.000): un trozo se empieza sólo si cabe entero, y con 1.500 cabía
 * uno por fotograma; la ventana tardaba 4,5 s y en la traza 13 quien cruzaba llegaba a 11 m del canto de
 * lo pintado, dentro de la franja del fundido. El comprobador mide las dos cosas (la latencia y ese margen)
 * y los trozos de construir en las 32 trazas: ninguno pasa del suyo.
 *
 * Mientras no se ha pintado ninguna ventana (el principio de la noche, que tapa la Bajada) el tope es
 * `PRISA_DEL_PRINCIPIO` veces mayor: no hay nada que estropear y sí una ciudad que llenar. Sólo entonces: la
 * ventana de la ciudad de OTRO NIVEL a media noche (el gobernador sube o baja) se llena con sus topes, sin
 * prisa (`prisa: 1`), porque ahí sí hay una partida que estropear; la revisión del 24-sep midió 2.700, 7.200,
 * 15.500 y 31.000 triángulos por fotograma en ese cambio, frente a topes de 800, 2.000, 4.000 y 8.000.
 *
 * Y lo que se SUBE, en bytes: `bytesPorFotograma` como mucho y `trozoDeBytes` por trozo de copia (cada trozo
 * de copia lleva los triángulos que caben en sus bytes aunque cada uno trajera tres vértices nuevos). Con
 * 4.000 triángulos de mobiliario por fotograma se subían 400 kB de golpe; el frente «medida» no vio tirones
 * con 239 kB en un Chrome con ajustes de N0, y N0 se queda en 160: 96 de la ventana y 64 de la luz (la
 * luz sola, el fotograma en que la ventana no trabaja, sube 128; ver `losetas.ts`).
 */
export const PRESUPUESTO_DE_LA_VENTANA: Readonly<
  Record<NivelDeLaCiudad, { readonly porFotograma: number; readonly trozo: number; readonly bytesPorFotograma: number; readonly trozoDeBytes: number }>
> = {
  0: { porFotograma: 800, trozo: 600, bytesPorFotograma: 96 * 1024, trozoDeBytes: 24 * 1024 },
  1: { porFotograma: 2000, trozo: 1000, bytesPorFotograma: 128 * 1024, trozoDeBytes: 32 * 1024 },
  2: { porFotograma: 4000, trozo: 1000, bytesPorFotograma: 512 * 1024, trozoDeBytes: 128 * 1024 },
  3: { porFotograma: 8000, trozo: 1000, bytesPorFotograma: 1024 * 1024, trozoDeBytes: 256 * 1024 },
};

/** Cuántas celdas construidas se guardan (§5.7). */
export const CELDAS_GUARDADAS = 36;

/** Cuánto más se trabaja por fotograma mientras no hay nada pintado todavía. */
export const PRISA_DEL_PRINCIPIO = 4;

/**
 * La llave de una celda guardada: su índice (menos de 1.000), su grado y si lleva el relieve de hoy. Una misma
 * celda puede estar guardada en varias versiones (en N2 y N3, la del bloque del centro y la del anillo).
 */
function llaveDeLaCelda(k: number, grado: GradoDeLaCelda, relieve: boolean): number {
  return k + 1000 * grado + 10000 * (relieve ? 1 : 0);
}

/** El grado de la celda `k` en la ventana `v` (ver `grados.ts`): por su distancia al centro de la ventana, en celdas. */
export function gradoEnLaVentana(nivel: NivelDeLaCiudad, v: SitioDeLaVentana, k: number): GradoDeLaCelda {
  const { i, j } = celdaDelIndice(k);
  return gradoDeLaCelda(nivel, (i * LADO_DE_CELDA - v.cx) / LADO_DE_CELDA, (j * LADO_DE_CELDA - v.cz) / LADO_DE_CELDA);
}

/* ═══════════════════════════════ DÓNDE ESTÁ LA VENTANA ═══════════════════════════════ */

/** Una ventana: su centro, su lado en celdas y las celdas que cubre (ya recortadas a las de la ciudad). */
export interface SitioDeLaVentana {
  readonly cx: number;
  readonly cz: number;
  readonly lado: number;
  readonly i0: number;
  readonly j0: number;
  readonly i1: number;
  readonly j1: number;
}

/** El centro de ventana más cercano a un valor: el centro de una celda (lado impar) o una raya (par). */
function centroCercano(v: number, lado: number): number {
  const desfase = lado % 2 === 1 ? 0 : LADO_DE_CELDA / 2;
  return Math.round((v - desfase) / LADO_DE_CELDA) * LADO_DE_CELDA + desfase;
}

/** La ventana de `lado` × `lado` celdas que toca a quien está en `(x, z)`. */
export function ventanaEn(x: number, z: number, lado: number): SitioDeLaVentana {
  const cx = centroCercano(x, lado);
  const cz = centroCercano(z, lado);
  const medio = (lado * LADO_DE_CELDA) / 2;
  /* Las celdas cuyo centro (48k) cae dentro de la ventana. */
  const primera = (c: number): number => Math.ceil((c - medio + 0.01) / LADO_DE_CELDA);
  const ultima = (c: number): number => Math.floor((c + medio - 0.01) / LADO_DE_CELDA);
  return {
    cx,
    cz,
    lado,
    i0: Math.max(CELDA_MINIMA, primera(cx)),
    j0: Math.max(CELDA_MINIMA, primera(cz)),
    i1: Math.min(CELDA_MAXIMA, ultima(cx)),
    j1: Math.min(CELDA_MAXIMA, ultima(cz)),
  };
}

/** ¿Se ha alejado quien mira lo bastante del centro de la ventana como para recentrarla? */
export function hayQueRecentrar(v: SitioDeLaVentana | null, x: number, z: number): boolean {
  if (v === null) return true;
  return Math.max(Math.abs(x - v.cx), Math.abs(z - v.cz)) > LADO_DE_CELDA / 2 + HOLGURA_DEL_RECENTRADO;
}

/**
 * ¿Ha vuelto quien mira a la celda del centro de la ventana que se pinta? Entonces la que se estuviera montando
 * ya no la quiere nadie. Sin la holgura: entre los 24 m y los 30 se deja lo que haya, para que andar por el
 * umbral no empiece y deje la misma ventana cada fotograma.
 */
export function haVueltoAlCentro(v: SitioDeLaVentana | null, x: number, z: number): boolean {
  if (v === null) return false;
  return Math.max(Math.abs(x - v.cx), Math.abs(z - v.cz)) <= LADO_DE_CELDA / 2;
}

/** Las celdas de una ventana, fila a fila (el orden en que se copian). */
export function celdasDeLaVentana(v: SitioDeLaVentana): number[] {
  const salida: number[] = [];
  for (let j = v.j0; j <= v.j1; j++) for (let i = v.i0; i <= v.i1; i++) salida.push(indiceDeCelda(i, j));
  return salida;
}

/** El rectángulo que cubre una ventana, en metros. */
export function rectanguloDeLaVentana(v: SitioDeLaVentana): { x0: number; z0: number; x1: number; z1: number } {
  const m = LADO_DE_CELDA / 2;
  return { x0: LADO_DE_CELDA * v.i0 - m, z0: LADO_DE_CELDA * v.j0 - m, x1: LADO_DE_CELDA * v.i1 + m, z1: LADO_DE_CELDA * v.j1 + m };
}

/* ═══════════════════════════════ LOS UNIFORMES ═══════════════════════════════ */

/**
 * Lo que saben los sombreadores de la ventana que se pinta: su rectángulo (para el fundido con tramado del
 * borde, N1+) y las celdas cuya LOD1 se tira en el vértice (`lejos.ts`). Cambian en el MISMO fotograma que
 * las mallas cambian de mitad.
 */
export const UNIFORMES_DE_LA_VENTANA = {
  /** x0, z0, x1, z1 de la ventana que se pinta, en metros; (0, 0, 0, 0) sin ventana. */
  uVentanaQ: { value: new THREE.Vector4(0, 0, 0, 0) },
  /** i0, j0, i1, j1 de las celdas cuya LOD1 se tira entera; (1, 1, 0, 0) ninguna. */
  uCeldasSinLejosQ: { value: new THREE.Vector4(1, 1, 0, 0) },
  /** El ancho de la franja del fundido, en metros (0 sin fundido: N0). */
  uFundidoQ: { value: 0 },
};

/* ═══════════════════════════════ LA MALLA DE UNA FAMILIA ═══════════════════════════════ */

interface AtributoDeLaMalla {
  readonly nombre: string;
  readonly tam: number;
  attr: THREE.BufferAttribute;
}

/** Cuánto cabe en cada mitad de una familia, de salida, por nivel (medido en las 32 trazas, con holgura). */
export interface CapacidadDeLaFamilia {
  readonly vertices: number;
  readonly indices: number;
}

/**
 * LA MALLA DE UNA FAMILIA: dos mitades en el mismo búfer. `delante` se dibuja; en la otra se escribe. Si la
 * ventana siguiente no cabe en su mitad, la malla crece (una geometría nueva con el doble de sitio, con lo
 * de delante copiado): es raro —la capacidad de salida sale de medir la ciudad— y cuesta subirlo todo.
 */
export class MallaDeFamilia {
  readonly malla: THREE.Mesh;
  readonly familia: Familia;
  private atributos: AtributoDeLaMalla[] = [];
  private indice!: THREE.BufferAttribute;
  private capV = 0;
  private capI = 0;
  private delante: 0 | 1 = 0;
  /** Lo escrito en la mitad de atrás: vértices e índices, y dónde empieza la celda que se copia. */
  private vAtras = 0;
  private iAtras = 0;
  /** Lo que tiene la mitad de delante. */
  private iDelante = 0;
  private vDelante = 0;
  /** Bytes subidos desde la última vez que se preguntó (para medir). */
  subidos = 0;
  /** Cuántas veces ha tenido que crecer. */
  crecidas = 0;

  constructor(familia: Familia, material: THREE.Material, capacidad: CapacidadDeLaFamilia) {
    this.familia = familia;
    this.malla = new THREE.Mesh(new THREE.BufferGeometry(), material);
    this.malla.name = `quiebro-ventana-${familia}`;
    this.malla.frustumCulled = false;
    this.malla.matrixAutoUpdate = false;
    this.reservar(Math.max(64, capacidad.vertices), Math.max(192, capacidad.indices), false);
  }

  /** Reserva sitio para dos mitades de `capV` vértices y `capI` índices, conservando lo de delante si se pide. */
  private reservar(capV: number, capI: number, conservar: boolean): void {
    const viejaV = this.capV;
    const viejaI = this.capI;
    const viejos = this.atributos;
    const viejoIndice = conservar ? this.indice : null;
    const g = new THREE.BufferGeometry();
    this.atributos = atributosDeLaFamilia(this.familia).map((a) => {
      const attr = new THREE.BufferAttribute(new Float32Array(capV * 2 * a.tam), a.tam);
      attr.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute(a.nombre, attr);
      return { nombre: a.nombre, tam: a.tam, attr };
    });
    this.indice = new THREE.BufferAttribute(new Uint32Array(capI * 2), 1);
    this.indice.setUsage(THREE.DynamicDrawUsage);
    g.setIndex(this.indice);
    if (conservar && viejoIndice !== null) {
      /* Lo de delante pasa a la mitad 0 de la geometría nueva, con los índices recolocados. */
      const d = this.delante;
      for (const a of this.atributos) {
        const viejo = viejos.find((v) => v.nombre === a.nombre);
        if (viejo === undefined) continue;
        (a.attr.array as Float32Array).set((viejo.attr.array as Float32Array).subarray(d * viejaV * a.tam, (d * viejaV + this.vDelante) * a.tam), 0);
      }
      const ind = this.indice.array as Uint32Array;
      const vi = viejoIndice.array as Uint32Array;
      for (let k = 0; k < this.iDelante; k++) ind[k] = (vi[d * viejaI + k] as number) - d * viejaV;
      this.delante = 0;
    }
    g.setDrawRange(this.delante * capI, this.iDelante);
    const antigua = this.malla.geometry;
    this.malla.geometry = g;
    antigua.dispose();
    this.capV = capV;
    this.capI = capI;
  }

  private get atras(): 0 | 1 {
    return this.delante === 0 ? 1 : 0;
  }

  /** Empieza a llenar la mitad de atrás, asegurando sitio para `vertices` e `indices`. */
  empezarAtras(vertices: number, indices: number): void {
    if (vertices > this.capV || indices > this.capI) {
      this.crecidas++;
      this.reservar(Math.max(vertices, this.capV * 2), Math.max(indices, this.capI * 2), true);
    }
    this.vAtras = 0;
    this.iAtras = 0;
  }

  /**
   * Copia los triángulos `[t0, t1)` de una celda a la mitad de atrás. `vCopiados` son los vértices de esa
   * celda que ya se copiaron; devuelve cuántos van ahora. Los vértices que un trozo necesita van con él
   * (el molde escribe los vértices de cada pieza antes que sus índices, así que un trozo sólo pide los
   * suyos y los de antes).
   */
  copiar(g: GeometriaVolcada, t0: number, t1: number, vCopiados: number): number {
    const mitadV = this.atras * this.capV;
    const mitadI = this.atras * this.capI;
    let v1 = vCopiados;
    const ind = g.indices;
    for (let k = 3 * t0; k < 3 * t1; k++) {
      const n = (ind[k] as number) + 1;
      if (n > v1) v1 = n;
    }
    if (t1 * 3 >= ind.length) v1 = g.vertices;
    if (v1 > vCopiados) {
      const destino = mitadV + this.vAtras + vCopiados;
      for (const a of this.atributos) {
        const origen = g.datos.get(a.nombre);
        if (origen === undefined) continue;
        (a.attr.array as Float32Array).set(origen.subarray(vCopiados * a.tam, v1 * a.tam), destino * a.tam);
        a.attr.addUpdateRange(destino * a.tam, (v1 - vCopiados) * a.tam);
        a.attr.needsUpdate = true;
        this.subidos += (v1 - vCopiados) * a.tam * 4;
      }
    }
    if (t1 > t0) {
      const dst = this.indice.array as Uint32Array;
      const desplazamiento = mitadV + this.vAtras;
      const empieza = mitadI + this.iAtras + 3 * t0;
      for (let k = 3 * t0; k < 3 * t1; k++) dst[mitadI + this.iAtras + k] = (ind[k] as number) + desplazamiento;
      this.indice.addUpdateRange(empieza, 3 * (t1 - t0));
      this.indice.needsUpdate = true;
      this.subidos += 3 * (t1 - t0) * 4;
    }
    return v1;
  }

  /** Cierra la celda que se estaba copiando: la siguiente va detrás de ella. */
  cerrarCelda(g: GeometriaVolcada): void {
    this.vAtras += g.vertices;
    this.iAtras += g.indices.length;
  }

  /** Lo más que sube un triángulo copiado: tres vértices nuevos y sus tres índices. */
  get bytesPorTrianguloComoMucho(): number {
    let porVertice = 0;
    for (const a of this.atributos) porVertice += a.tam * 4;
    return 3 * porVertice + 3 * 4;
  }

  /** La mitad de atrás pasa a dibujarse. */
  cambiar(): void {
    this.delante = this.atras;
    this.iDelante = this.iAtras;
    this.vDelante = this.vAtras;
    this.malla.geometry.setDrawRange(this.delante * this.capI, this.iDelante);
  }

  /** Lo que se dibuja ahora, en triángulos. */
  get triangulos(): number {
    return this.iDelante / 3;
  }

  /** Lo que ocupa ahora la mitad que se dibuja (para medir lo que hay que reservar). */
  get enUso(): CapacidadDeLaFamilia {
    return { vertices: this.vDelante, indices: this.iDelante };
  }

  get capacidad(): CapacidadDeLaFamilia {
    return { vertices: this.capV, indices: this.capI };
  }

  liberar(): void {
    this.malla.geometry.dispose();
  }
}

/* ═══════════════════════════════ LA VENTANA ═══════════════════════════════ */

/** Lo que pasó en un fotograma: para el banco, para el gobernador y para el comprobador. */
export interface FotogramaDeLaVentana {
  /** Triángulos escritos o copiados en este fotograma. */
  readonly escritos: number;
  /** El trozo más grande de este fotograma. */
  readonly trozoMayor: number;
  /** Bytes subidos a la GPU por las familias en este fotograma (sin contar lo instanciado). */
  readonly subidos: number;
  /** Si en este fotograma se cambió de ventana. */
  readonly cambio: boolean;
}

export interface OpcionesDeLaVentana {
  readonly partes: PartesDeLaCiudad;
  readonly nivel: NivelDeLaCiudad;
  readonly materiales: Readonly<Record<Familia, THREE.Material>>;
  /** Cuánto cabe de salida en cada familia. */
  readonly capacidad: Readonly<Record<Familia, CapacidadDeLaFamilia>>;
  /** Se llama al cambiar de ventana, con las celdas de la nueva (para las tarjetas, los halos, las farolas…). */
  readonly alCambiar?: (sitio: SitioDeLaVentana, celdas: readonly CeldaConstruida[]) => void;
  /** Si hay fundido con tramado en el borde (N1+). */
  readonly fundido: boolean;
  /** Cuántas celdas construidas se guardan (`CELDAS_GUARDADAS`; el comprobador las guarda todas). */
  readonly celdasGuardadas?: number;
  /** Cuánto más trabaja mientras no ha pintado ninguna ventana (`PRISA_DEL_PRINCIPIO`, o 1 a media noche). */
  readonly prisa?: number;
  /** Nace callada: no toca los uniformes de la ventana hasta que se le diga (la ciudad que se prepara detrás). */
  readonly callada?: boolean;
}

export class VentanaDeCeldas {
  readonly mallas: Readonly<Record<Familia, MallaDeFamilia>>;
  readonly grupo = new THREE.Group();
  private readonly o: OpcionesDeLaVentana;
  private readonly guardadas = new Map<number, CeldaConstruida>();
  private trabajo: Generator<number, void, void> | null = null;
  private objetivo: SitioDeLaVentana | null = null;
  private sitio: SitioDeLaVentana | null = null;
  /** Cuántas veces cambió la ventana y cuántos fotogramas tardó cada cambio desde que se pidió. */
  cambios = 0;
  readonly latencias: number[] = [];
  /** Cuántas ventanas se dejaron a medias porque quien mira volvió a la celda del centro. */
  dejadas = 0;
  private pedidaEn = 0;
  private fotograma = 0;
  /** Cuántas celdas se han construido (no las que se sacaron de lo guardado). */
  construidas = 0;
  /** Los trozos más grandes vistos (de construir y de copiar). */
  trozoMayor = 0;
  /** Callada: no toca `UNIFORMES_DE_LA_VENTANA` (ver `OpcionesDeLaVentana.callada`). */
  callada: boolean;

  constructor(o: OpcionesDeLaVentana) {
    this.o = o;
    this.callada = o.callada ?? false;
    const mallas = {} as Record<Familia, MallaDeFamilia>;
    for (const f of FAMILIAS) {
      mallas[f] = new MallaDeFamilia(f, o.materiales[f], o.capacidad[f]);
      this.grupo.add(mallas[f].malla);
    }
    this.mallas = mallas;
    this.grupo.name = 'quiebro-ventana-de-celdas';
    /* El cristal y los neones van después de lo opaco, como en el barrio. */
    mallas.cristal.malla.renderOrder = 1;
    mallas.neones.malla.renderOrder = 2;
  }

  /** La ventana que se pinta ahora (o `null` si todavía ninguna). */
  get ahora(): SitioDeLaVentana | null {
    return this.sitio;
  }

  /** Si hay trabajo a medias. */
  get ocupada(): boolean {
    return this.trabajo !== null;
  }

  private guardar(k: number, c: CeldaConstruida): void {
    this.guardadas.delete(k);
    this.guardadas.set(k, c);
    while (this.guardadas.size > (this.o.celdasGuardadas ?? CELDAS_GUARDADAS)) {
      const primera = this.guardadas.keys().next();
      if (primera.done === true) break;
      this.guardadas.delete(primera.value);
    }
  }

  /** El trabajo de montar la ventana `destino`, a trozos. */
  private *montar(destino: SitioDeLaVentana): Generator<number, void, void> {
    const p = PRESUPUESTO_DE_LA_VENTANA[this.o.nivel];
    const indices = celdasDeLaVentana(destino);
    const nivel = this.o.nivel;
    const centro = celdaDe(destino.cx, destino.cz);
    const kCentro = centro === null ? -1 : indiceDeCelda(centro.i, centro.j);
    /*
     * 1 · Las celdas que falten, pieza a pieza: cada una con el grado que le toca en ESTA ventana (`grados.ts`) y
     * el relieve de hoy (en N1, la del centro con relieve y las demás sin él).
     */
    const celdas: CeldaConstruida[] = [];
    for (const k of indices) {
      const relieve = relieveDeHoy(nivel, k === kCentro);
      const grado = gradoEnLaVentana(nivel, destino, k);
      const clave = llaveDeLaCelda(k, grado, relieve);
      let c = this.guardadas.get(clave);
      if (c === undefined) {
        const parte = this.o.partes.celdas[k];
        if (parte === undefined) continue;
        const g = construirLaCelda(parte, this.o.partes, nivel, true, grado, relieve);
        for (;;) {
          const r = g.next();
          if (r.done === true) {
            c = r.value;
            break;
          }
          yield r.value;
        }
        this.construidas++;
      }
      this.guardar(clave, c);
      celdas.push(c);
    }
    /* 2 · La mitad de atrás de cada familia, celda a celda y a trozos. */
    for (const f of FAMILIAS) {
      const m = this.mallas[f];
      let v = 0;
      let i = 0;
      for (const c of celdas) {
        v += c.familias[f].vertices;
        i += c.familias[f].indices.length;
      }
      m.empezarAtras(v, i);
      /* Los triángulos de un trozo de copia: los del trozo, y menos si sus bytes no caben en el trozo de bytes. */
      const trozo = Math.max(1, Math.min(p.trozo, Math.floor(p.trozoDeBytes / m.bytesPorTrianguloComoMucho)));
      for (const c of celdas) {
        const g = c.familias[f];
        const tris = g.indices.length / 3;
        let copiados = 0;
        for (let t0 = 0; t0 < tris; t0 += trozo) {
          const t1 = Math.min(tris, t0 + trozo);
          copiados = m.copiar(g, t0, t1, copiados);
          yield t1 - t0;
        }
        if (copiados < g.vertices) m.copiar(g, tris, tris, copiados);
        m.cerrarCelda(g);
      }
    }
    /* 3 · El cambio: todo subido, sólo cambia qué mitad se dibuja. */
    for (const f of FAMILIAS) this.mallas[f].cambiar();
    this.sitio = destino;
    this.ponerLosUniformes();
    this.cambios++;
    this.latencias.push(this.fotograma - this.pedidaEn);
    this.o.alCambiar?.(destino, celdas);
  }

  /** Los uniformes de la ventana que se pinta. Los toman el fundido y la LOD1. */
  ponerLosUniformes(): void {
    const v = this.sitio;
    if (v === null || this.callada) return;
    /* El rectángulo de `rectanguloDeLaVentana`, sin objetos de paso: esto va en cada fotograma. */
    const m = LADO_DE_CELDA / 2;
    UNIFORMES_DE_LA_VENTANA.uVentanaQ.value.set(LADO_DE_CELDA * v.i0 - m, LADO_DE_CELDA * v.j0 - m, LADO_DE_CELDA * v.i1 + m, LADO_DE_CELDA * v.j1 + m);
    UNIFORMES_DE_LA_VENTANA.uFundidoQ.value = this.o.fundido ? FRANJA_DEL_FUNDIDO : 0;
    /* Con fundido, la LOD1 de las celdas del borde se queda (se funde en el fragmento); sin él, se tira toda. */
    const d = this.o.fundido ? 1 : 0;
    UNIFORMES_DE_LA_VENTANA.uCeldasSinLejosQ.value.set(v.i0 + d, v.j0 + d, v.i1 - d, v.j1 - d);
  }

  /**
   * UN FOTOGRAMA DE TRABAJO: si quien mira está en `(x, z)` y hace falta otra ventana, se pide; y se trabaja
   * a trozos hasta el tope del fotograma.
   */
  trabajar(x: number, z: number): FotogramaDeLaVentana {
    this.fotograma++;
    const lado = LADO_DE_LA_VENTANA[this.o.nivel];
    const quiere = hayQueRecentrar(this.sitio, x, z) ? ventanaEn(x, z, lado) : null;
    if (quiere !== null && (this.sitio === null || quiere.cx !== this.sitio.cx || quiere.cz !== this.sitio.cz)) {
      if (this.objetivo === null || this.objetivo.cx !== quiere.cx || this.objetivo.cz !== quiere.cz) {
        this.objetivo = quiere;
        this.trabajo = this.montar(quiere);
        this.pedidaEn = this.fotograma;
      }
    } else if (this.trabajo !== null && haVueltoAlCentro(this.sitio, x, z)) {
      /*
       * Quien mira está otra vez en la celda del centro de la que se pinta (volvió sobre sus pasos, o la cámara
       * estuvo un fotograma en otro sitio): la que se montaba no se acaba. Lo construido se queda guardado.
       */
      this.trabajo = null;
      this.objetivo = null;
      this.dejadas++;
    }
    const p = PRESUPUESTO_DE_LA_VENTANA[this.o.nivel];
    const prisa = this.sitio === null ? (this.o.prisa ?? PRISA_DEL_PRINCIPIO) : 1;
    let escritos = 0;
    let mayor = 0;
    const antes = this.subidos();
    const cambiosAntes = this.cambios;
    /* Un trozo se empieza sólo si le caben ENTEROS sus triángulos y sus bytes: ningún fotograma pasa de sus topes. */
    while (this.trabajo !== null && escritos + p.trozo <= p.porFotograma * prisa && this.subidos() - antes + p.trozoDeBytes <= p.bytesPorFotograma * prisa) {
      const r = this.trabajo.next();
      if (r.done === true) {
        this.trabajo = null;
        this.objetivo = null;
        break;
      }
      escritos += r.value;
      if (r.value > mayor) mayor = r.value;
    }
    if (mayor > this.trozoMayor) this.trozoMayor = mayor;
    /* El mismo objeto en cada fotograma: quien lo guarda, guarda «el último» (ver `abierta.ts`). */
    const f = this.fotogramaDeLaVentana;
    f.escritos = escritos;
    f.trozoMayor = mayor;
    f.subidos = this.subidos() - antes;
    f.cambio = this.cambios !== cambiosAntes;
    return f;
  }

  private readonly fotogramaDeLaVentana = { escritos: 0, trozoMayor: 0, subidos: 0, cambio: false };

  /** Monta la ventana de `(x, z)` de un tirón (al empezar: la Bajada lo tapa). */
  montarYa(x: number, z: number): void {
    const destino = ventanaEn(x, z, LADO_DE_LA_VENTANA[this.o.nivel]);
    this.objetivo = destino;
    this.pedidaEn = this.fotograma;
    const g = this.montar(destino);
    for (;;) {
      const r = g.next();
      if (r.done === true) break;
      if (r.value > this.trozoMayor) this.trozoMayor = r.value;
    }
    this.trabajo = null;
    this.objetivo = null;
  }

  private subidos(): number {
    let s = 0;
    for (const f of FAMILIAS) s += this.mallas[f].subidos;
    return s;
  }

  /** Las celdas guardadas (para el banco). */
  get celdasGuardadas(): number {
    return this.guardadas.size;
  }

  /**
   * Una celda ya construida y guardada, si lo está, de cualquier grado y con relieve o sin él (la luz saca de ella
   * sus fuentes, que son las mismas en todas sus versiones). Sin asignar nada: la luz lo pregunta cada fotograma.
   */
  celdaGuardada(k: number): CeldaConstruida | undefined {
    for (let r = 0; r < 2; r++) {
      for (let g = 1; g <= 3; g++) {
        const c = this.guardadas.get(llaveDeLaCelda(k, g as GradoDeLaCelda, r === 1));
        if (c !== undefined) return c;
      }
    }
    return undefined;
  }

  /** Lo que se dibuja ahora, por familia, en triángulos. */
  triangulos(): Record<Familia, number> {
    const t = {} as Record<Familia, number>;
    for (const f of FAMILIAS) t[f] = this.mallas[f].triangulos;
    return t;
  }

  liberar(): void {
    for (const f of FAMILIAS) this.mallas[f].liberar();
    this.guardadas.clear();
  }
}

/** El ancho de la franja del fundido con tramado en el borde de la ventana (N1+), en metros. */
export const FRANJA_DEL_FUNDIDO = 12;

