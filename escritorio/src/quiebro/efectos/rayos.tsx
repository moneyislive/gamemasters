/**
 * EL RAYO EN PANTALLA: el canal quebrado, sus ramas y su estela, y la carga que chisporrotea en la mano. Una pieza
 * (`rayos` en `presupuesto.ts`), una llamada: cintas curvas de doce segmentos que el sombreador de la familia de las
 * cintas quiebra y pinta como luz (el tipo 4 de `materiales.ts`).
 *
 * ═══ QUÉ SE PINTA ═══
 *
 *   · EL CANAL: los puntos gruesos sembrados (`puntosDelCanal`) en `tramosDelRayo` tramos, el primero el más corto.
 *     La cabeza lo recorre en 25-50 ms; al llegar, las descargas lo encienden entero (el núcleo, blanco y
 *     sobreexpuesto; el velo, ámbar); después la estela se ensancha, se rompe y se enfría hacia el ámbar oscuro, y
 *     en N3 además deriva.
 *   · LAS RAMAS: nacen de un punto grueso cuando pasa la cabeza, se afilan hacia su final y se apagan antes que el
 *     canal (sólo la primera descarga las enciende del todo).
 *   · LA CARGA: filamentos cortos que trepan por el brazo, saltan a tierra o chisporrotean en el aire alrededor de
 *     la mano (cada vez más a menudo según se llena), y motas que CONVERGEN hacia la palma. El núcleo que crece y
 *     el aro que se contrae van en las ondas (`trazos.tsx`).
 *
 * Todo sale de `sistema.rayos` y del tiempo: nada se integra, nada asigna (el escritor de cintas y los arrays se
 * crean al montar). La carga y el destello, en el reloj verdadero; la estela, en el presentado.
 */
import { useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { azarDe } from './cuentas';
import { subirLasPrimeras } from './geometrias';
import { mallaDeEfecto, pxPorMetroDeLaCamara } from './malla';
import { CARGAS_A_LA_VEZ, MARCAS_A_LA_VEZ, POR_NIVEL, RAYOS_A_LA_VEZ, instanciasDe } from './presupuesto';
import type { Nivel } from './presupuesto';
import {
  APAGADO_DE_LA_CARGA_MS,
  LINEALES_DEL_RAYO,
  MARCA_MS,
  RUGOSIDAD_FINA,
  aplanadoDelCanal,
  brilloDelCanal,
  colorDeLaEstela,
  descargasDelRayo,
  duracionDeLaEstela,
  duracionDeLaOnda,
  empaquetarDireccion,
  finalDeLaRama,
  fraccionDelTramo,
  inicioDeLaEstela,
  llegadaDelRayo,
  ondaDelSuelo,
  origenDeLaRama,
  parpadeoDeLaCarga,
  puntosDelCanal,
} from './rayo';
import type { EstadoDeLosRayos } from './rayo';
import type { SistemaDeEfectos } from './sistema';

/** El ancho del velo del canal en píxeles, por nivel: en N0 lo pinta la cinta entero; desde N2 lo ayuda el brillo HDR. */
export const VELO_DEL_RAYO_PX: readonly [number, number, number, number] = [20, 16, 14, 14];

const { NUCLEO, FILO, AMBAR } = LINEALES_DEL_RAYO;

/** Escribe cintas del rayo en los atributos de la pieza, una tras otra. Uno por pieza: no asigna al escribir. */
class EscritorDeCintas {
  n = 0;
  tope = 0;
  private A: Float32Array = new Float32Array(0);
  private B: Float32Array = new Float32Array(0);
  private C: Float32Array = new Float32Array(0);
  private CA: Float32Array = new Float32Array(0);
  private CB: Float32Array = new Float32Array(0);
  private TR: Float32Array = new Float32Array(0);
  /** Las tangentes de las costuras de la próxima cinta (ver `costuras`); 0 = que la saque el sombreador. */
  private tax = 0;
  private tay = 0;
  private taz = 0;
  private tbEmpaquetada = 0;

  /**
   * Las tangentes del canal en las dos puntas de la PRÓXIMA cinta (en su costura con la de antes y con la de
   * después): así dos tramos seguidos ponen la cinta de lado igual y empalman sin solaparse.
   */
  costuras(ax: number, ay: number, az: number, bx: number, by: number, bz: number): void {
    this.tax = ax;
    this.tay = ay;
    this.taz = az;
    this.tbEmpaquetada = 1 + empaquetarDireccion(bx, by, bz);
  }

  empezar(atributos: Readonly<Record<'aA' | 'aB' | 'aC' | 'aColorA' | 'aColorB' | 'aTramo', THREE.InstancedBufferAttribute>>, tope: number): void {
    this.A = atributos.aA.array as Float32Array;
    this.B = atributos.aB.array as Float32Array;
    this.C = atributos.aC.array as Float32Array;
    this.CA = atributos.aColorA.array as Float32Array;
    this.CB = atributos.aColorB.array as Float32Array;
    this.TR = atributos.aTramo.array as Float32Array;
    this.n = 0;
    this.tope = tope;
  }

  /** Una cinta de `a` a `b`: núcleo (rgb por brillo) y velo, anchos, rotura, semilla, tramo visible, quiebro y núcleo en px. */
  cinta(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    anchoM: number,
    minPx: number,
    rotura: number,
    nr: number,
    ng: number,
    nb: number,
    vr: number,
    vg: number,
    vb: number,
    semilla: number,
    frente: number,
    quiebro: number,
    nucleoPx: number,
  ): void {
    if (this.n >= this.tope) return;
    const k = this.n * 4;
    const { A, B, C, CA, CB, TR } = this;
    A[k] = ax;
    A[k + 1] = ay;
    A[k + 2] = az;
    A[k + 3] = anchoM;
    B[k] = bx;
    B[k + 1] = by;
    B[k + 2] = bz;
    B[k + 3] = minPx;
    /* En el rayo, `aC` no es un punto de control: es la tangente en A (0 si no la hay; ver `costuras`). */
    C[k] = this.tax;
    C[k + 1] = this.tay;
    C[k + 2] = this.taz;
    C[k + 3] = 4 + Math.min(0.49, Math.max(0, rotura) * 0.5);
    CA[k] = nr;
    CA[k + 1] = ng;
    CA[k + 2] = nb;
    CA[k + 3] = this.tbEmpaquetada;
    this.tax = 0;
    this.tay = 0;
    this.taz = 0;
    this.tbEmpaquetada = 0;
    CB[k] = vr;
    CB[k + 1] = vg;
    CB[k + 2] = vb;
    CB[k + 3] = semilla % 65536;
    TR[k] = 0;
    TR[k + 1] = frente;
    TR[k + 2] = quiebro;
    TR[k + 3] = nucleoPx;
    this.n++;
  }
}

export function RayosDelRayo({ sistema }: { sistema: SistemaDeEfectos }): JSX.Element {
  const pieza = useMemo(() => mallaDeEfecto('rayos', { aA: 4, aB: 4, aC: 4, aColorA: 4, aColorB: 4, aTramo: 4 }), []);
  useEffect(() => () => pieza.soltar(), [pieza]);
  const todos = useMemo(() => Object.values(pieza.atributos), [pieza]);
  /* Lo que se reutiliza cada fotograma: el escritor, los puntos gruesos de un canal, el final de una rama y dos colores. */
  const escritor = useMemo(() => new EscritorDeCintas(), []);
  const puntos = useMemo(() => new Float32Array(3 * (Math.max(...POR_NIVEL.tramosDelRayo) + 1)), []);
  const rama = useMemo(() => new Float32Array(3), []);
  /* Dos colores: el del velo (0-2) y el del núcleo en la estela (3-5). */
  const color = useMemo(() => new Float32Array(6), []);

  useFrame((estado) => {
    const t = sistema.ahora.verdadero;
    const q = sistema.nivel;
    escritor.empezar(pieza.atributos, instanciasDe('rayos', q));
    const ojo = estado.camera.position;
    pintarLosRayos(sistema.rayos, t, sistema.ahora.presentado, q, escritor, puntos, rama, color, ojo.x, ojo.y, ojo.z);
    pintarLasCargas(sistema.rayos, t, q, escritor);
    const n = escritor.n;
    pieza.pintar(n);
    if (n > 0) for (const a of todos) subirLasPrimeras(a, n);
    const u = pieza.material.uniforms;
    (u.uTiempo as { value: number }).value = sistema.segundos(t);
    (u.uPxPorMetro as { value: number }).value = pxPorMetroDeLaCamara(estado.camera, estado.size.height, estado.gl.getPixelRatio());
  });

  return <primitive object={pieza.malla} />;
}

/**
 * EL CANAL, LA ESTELA Y LAS RAMAS de cada rayo vivo (ver la cabecera), mirados desde `(cx, cy, cz)`: el quiebro y las
 * ramas van en proporción a lo que el canal ocupa en pantalla (`aplanadoDelCanal`).
 */
function pintarLosRayos(
  r: EstadoDeLosRayos,
  t: number,
  tp: number,
  q: Nivel,
  w: EscritorDeCintas,
  puntos: Float32Array,
  rama: Float32Array,
  color: Float32Array,
  cx: number,
  cy: number,
  cz: number,
): void {
  const tramos = POR_NIVEL.tramosDelRayo[q];
  for (let i = 0; i < RAYOS_A_LA_VEZ; i++) {
    if (r.vivo[i] === 0 || r.sinCanal[i] === 1) continue;
    const ms = t - (r.t0[i] as number);
    if (ms < 0) continue;
    const c = r.c[i] as number;
    const descargas = descargasDelRayo(c, q);
    const llegada = llegadaDelRayo(c);
    const cabeza = Math.min(1, ms / llegada);
    const brillo = brilloDelCanal(ms, c, descargas);
    /* La estela, en el reloj presentado: 0 recién hecha, 1 apagada. */
    const sE = (tp - (r.t0p[i] as number) - inicioDeLaEstela(c, descargas)) / duracionDeLaEstela(c, q);
    if (sE >= 1) continue;
    const estela = Math.max(0, sE);
    const queda = 1 - estela;
    const semilla = r.semilla[i] as number;
    const ox = r.ox[i] as number;
    const oy = r.oy[i] as number;
    const oz = r.oz[i] as number;
    const aplanado = aplanadoDelCanal(ox, oy, oz, r.dx[i] as number, r.dy[i] as number, r.dz[i] as number, cx, cy, cz);
    const largo = puntosDelCanal(semilla, ox, oy, oz, r.dx[i] as number, r.dy[i] as number, r.dz[i] as number, c, tramos, puntos, aplanado);
    if (largo < 0.05) continue;
    /* La deriva de la estela (N3): el aire ionizado sube y se va de lado mientras se enfría. */
    if (q === 3 && estela > 0) {
      const lado = (azarDe(semilla, 90) - 0.5) * 0.5;
      for (let k = 1; k <= tramos; k++) {
        const f = fraccionDelTramo(k, tramos);
        puntos[k * 3] = (puntos[k * 3] as number) + lado * estela * f;
        puntos[k * 3 + 1] = (puntos[k * 3 + 1] as number) + 0.35 * estela * (0.3 + 0.7 * f);
      }
    }
    /*
     * EL CORTE (`corte` en `rayo.ts`): si la sala lo paró antes de donde se dibujó, se pinta hasta el tramo en que cae
     * el estallido, y ese tramo acaba en él. Lo de antes, con su forma de siempre.
     */
    const corte = r.corte[i] as number;
    let visibles = tramos;
    let finDelUltimo = 1;
    if (corte < 0.999) {
      let j = 0;
      while (j < tramos - 1 && fraccionDelTramo(j + 1, tramos) < corte) j++;
      puntos[(j + 1) * 3] = r.ix[i] as number;
      puntos[(j + 1) * 3 + 1] = r.iy[i] as number;
      puntos[(j + 1) * 3 + 2] = r.iz[i] as number;
      visibles = j + 1;
      finDelUltimo = corte;
    }
    /*
     * El núcleo: blanco sobreexpuesto (6-14 en HDR) con las descargas; en la estela se va antes que el velo. Va en una
     * cinta FINA (unos píxeles: el núcleo y su filo ámbar), quebrada a todas las escalas.
     */
    const porNivel = q >= 2 ? 0.45 : q === 1 ? 0.8 : 1;
    let nucleo: number;
    let velo: number;
    /* El color del núcleo: blanco en cada descarga; entre una y otra, el canal se templa hacia el ámbar (parpadea). */
    let nucR: number;
    let nucG: number;
    let nucB: number;
    if (estela <= 0) {
      nucleo = (3.5 + 2.5 * c) * brillo;
      const x = Math.min(1, Math.max(0, (brillo - 0.2) / 0.55));
      const blanco = x * x * (3 - 2 * x);
      nucR = FILO[0] + (NUCLEO[0] - FILO[0]) * blanco;
      nucG = FILO[1] + (NUCLEO[1] - FILO[1]) * blanco;
      nucB = FILO[2] + (NUCLEO[2] - FILO[2]) * blanco;
      /*
       * El velo: ámbar. Va en otra cinta, ANCHA y casi sin el quiebro fino (la del núcleo lo lleva entero). Desde N2
       * lo pone sobre todo el brillo HDR del posproceso: aquí sólo le da el tono ámbar.
       */
      velo = (0.3 + 0.35 * c) * (0.45 + 0.55 * Math.min(1, brillo)) * porNivel;
      color[0] = FILO[0];
      color[1] = FILO[1];
      color[2] = FILO[2];
    } else {
      /*
       * LA ESTELA IONIZADA (§4: «se ensancha y se enfría en 300-450 ms»): el canal sigue ahí, ya sin descargas, como
       * un hilo de brasa que pasa pronto del blanco al ámbar y al ámbar rojizo sin dejar de brillar; el aire de
       * alrededor se abre un poco y se apaga antes que él; al final se rompe en trozos. Se apaga por intensidad (es
       * luz que se suma): nunca se oscurece hacia un color sucio.
       */
      /*
       * Sigue a la última descarga SIN SALTO: empieza con el brillo que le quedaba al canal (templado, ya casi ámbar) y
       * se apaga del todo al final de la estela. (Empezar de nuevo en blanco era otro destello, a destiempo.)
       */
      const alEmpezar = Math.max(0.2, brilloDelCanal(inicioDeLaEstela(c, descargas), c, descargas));
      nucleo = (3.5 + 2.5 * c) * alEmpezar * queda;
      velo = (0.3 + 0.4 * c) * queda * queda * porNivel;
      colorDeLaEstela(estela, color, 0);
      /* El núcleo, ya templado: del filo ámbar hacia el ámbar rojizo del final (el color de la estela a partir de ahí). */
      colorDeLaEstela(0.35 + 0.65 * estela, color, 3);
      nucR = color[3] as number;
      nucG = color[4] as number;
      nucB = color[5] as number;
    }
    const anchoM = (0.018 + 0.03 * c) * (1 + 1.2 * estela);
    const minPx = (VELO_DEL_RAYO_PX[q] as number) * (0.8 + 0.4 * c) * (1 + 0.6 * estela);
    /*
     * El núcleo, en píxeles: el chispazo, un hilo de uno; el pleno, «un destello más grueso» (§4), de tres o cuatro.
     * En N0-N1, algo menos: sin HDR, el núcleo se recorta a blanco y el brillo de 8 bits ya lo engorda.
     */
    const nucleoPx = (0.6 + 0.9 * c) * Math.max(0.6, 1 - estela) * (q >= 2 ? 1 : 0.8);
    /* La cinta del núcleo: lo justo para el núcleo y un filo de un par de píxeles (y en la estela, algo más). */
    const finoPx = (4 + 4 * nucleoPx) * (1 + 0.8 * estela);
    const rugosidad = RUGOSIDAD_FINA * (1 - 0.35 * c);
    for (let j = 0; j < visibles; j++) {
      const fa = fraccionDelTramo(j, tramos);
      /* El tramo del corte acaba en el corte (lo recorre la cabeza hasta ahí). */
      const fb = j === visibles - 1 && corte < 0.999 ? Math.max(fa + 1e-4, finDelUltimo) : fraccionDelTramo(j + 1, tramos);
      const frente = Math.min(1, Math.max(0, (cabeza - fa) / (fb - fa)));
      if (frente <= 0) break;
      const ax = puntos[j * 3] as number;
      const ay = puntos[j * 3 + 1] as number;
      const az = puntos[j * 3 + 2] as number;
      const bx = puntos[j * 3 + 3] as number;
      const by = puntos[j * 3 + 4] as number;
      const bz = puntos[j * 3 + 5] as number;
      const tramo = Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay) + (bz - az) * (bz - az));
      /* Las tangentes de las costuras: la media de las direcciones de los dos tramos que se juntan. */
      const tax = direccion(puntos, j - 1, visibles, 0) + direccion(puntos, j, visibles, 0);
      const tay = direccion(puntos, j - 1, visibles, 1) + direccion(puntos, j, visibles, 1);
      const taz = direccion(puntos, j - 1, visibles, 2) + direccion(puntos, j, visibles, 2);
      const tbx = direccion(puntos, j, visibles, 0) + direccion(puntos, j + 1, visibles, 0);
      const tby = direccion(puntos, j, visibles, 1) + direccion(puntos, j + 1, visibles, 1);
      const tbz = direccion(puntos, j, visibles, 2) + direccion(puntos, j + 1, visibles, 2);
      const la = Math.sqrt(tax * tax + tay * tay + taz * taz) || 1;
      const lb = Math.sqrt(tbx * tbx + tby * tby + tbz * tbz) || 1;
      const quiebro = tramo * rugosidad * (1 + 0.6 * estela);
      const s = (semilla + j * 7919) >>> 0;
      /* El velo: ancho, con la cuarta parte del quiebro fino y la misma semilla (sigue al núcleo de lejos). */
      w.costuras(tax / la, tay / la, taz / la, tbx / lb, tby / lb, tbz / lb);
      w.cinta(ax, ay, az, bx, by, bz, anchoM * 3, minPx, estela * 0.95, 0, 0, 0, (color[0] as number) * velo, (color[1] as number) * velo, (color[2] as number) * velo, s, frente, quiebro * 0.25, nucleoPx);
      /* El núcleo: fino y quebrado entero, con un filo ámbar muy pegado. */
      w.costuras(tax / la, tay / la, taz / la, tbx / lb, tby / lb, tbz / lb);
      w.cinta(
        ax,
        ay,
        az,
        bx,
        by,
        bz,
        anchoM * 0.35,
        finoPx,
        estela * 0.95,
        nucR * nucleo,
        nucG * nucleo,
        nucB * nucleo,
        (color[0] as number) * velo * 0.9,
        (color[1] as number) * velo * 0.9,
        (color[2] as number) * velo * 0.9,
        s,
        frente,
        quiebro,
        nucleoPx,
      );
    }
    /* LAS RAMAS: el chispazo, una (§4); lo demás, las del nivel. Mueren antes que el canal. */
    if (estela > 0.35) continue;
    const ramas = c < 0.25 ? Math.min(1, POR_NIVEL.ramasDelRayo[q]) : POR_NIVEL.ramasDelRayo[q];
    const ex = ((r.dx[i] as number) - (r.ox[i] as number)) / largo;
    const ey = ((r.dy[i] as number) - (r.oy[i] as number)) / largo;
    const ez = ((r.dz[i] as number) - (r.oz[i] as number)) / largo;
    for (let k = 0; k < ramas; k++) {
      const jo = origenDeLaRama(semilla, k, tramos);
      const fo = fraccionDelTramo(jo, tramos);
      if (cabeza < fo || jo <= 0 || jo >= visibles) continue;
      const px = puntos[jo * 3] as number;
      const py = puntos[jo * 3 + 1] as number;
      const pz = puntos[jo * 3 + 2] as number;
      /* Las ramas se abren a los lados: de punta, a lo largo entero desbordarían el canal (una corona de pinchos). */
      const largoRama = finalDeLaRama(semilla, k, px, py, pz, ex, ey, ez, largo * aplanado, rama);
      const desde = llegada * fo;
      const frente = Math.min(1, Math.max(0.02, (ms - desde) / Math.max(4, (llegada * largoRama) / largo)));
      /* Antes de llegar, la guía; con la primera descarga, entera; y se apaga. La segunda la enciende a veces. */
      const e = ms - llegada;
      let b = e < 0 ? 0.45 : Math.exp(-e / 26);
      if (descargas > 1 && azarDe(semilla, 250 + k) < 0.5 && e >= 36) b = Math.max(b, 0.7 * Math.exp(-(e - 36) / 18));
      b *= 1 - estela / 0.35;
      if (b < 0.02) continue;
      const nr = (0.35 + 0.35 * azarDe(semilla, 260 + k)) * b;
      w.cinta(
        px,
        py,
        pz,
        rama[0] as number,
        rama[1] as number,
        rama[2] as number,
        anchoM * 0.3,
        finoPx * 1.3,
        0,
        (NUCLEO[0] * nucleo + 0.6) * nr,
        (NUCLEO[1] * nucleo + 0.55) * nr,
        (NUCLEO[2] * nucleo + 0.45) * nr,
        FILO[0] * velo * 0.6 * b,
        FILO[1] * velo * 0.6 * b,
        FILO[2] * velo * 0.6 * b,
        (semilla + 104729 * (k + 1)) >>> 0,
        frente,
        largoRama * 0.09,
        -(0.5 + 0.6 * c),
      );
    }
  }
}

/**
 * Una componente (`eje` 0 x, 1 y, 2 z) de la dirección unitaria del tramo `j` del canal; fuera del canal (antes del
 * primero o después del último), la del tramo de la punta: así la tangente de una punta del rayo es la de su tramo.
 */
function direccion(p: Float32Array, j: number, tramos: number, eje: number): number {
  const k = j < 0 ? 0 : j >= tramos ? tramos - 1 : j;
  const dx = (p[k * 3 + 3] as number) - (p[k * 3] as number);
  const dy = (p[k * 3 + 4] as number) - (p[k * 3 + 1] as number);
  const dz = (p[k * 3 + 5] as number) - (p[k * 3 + 2] as number);
  const l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  return (eje === 0 ? dx : eje === 1 ? dy : dz) / l;
}

/** LOS FILAMENTOS Y LAS MOTAS de cada carga viva. */
function pintarLasCargas(r: EstadoDeLosRayos, t: number, q: Nivel, w: EscritorDeCintas): void {
  for (let i = 0; i < CARGAS_A_LA_VEZ; i++) {
    const quien = r.cargaQuien[i] as number;
    if (quien === 0 || r.conBoca[i] === 0) continue;
    const fin = r.cargaFin[i] as number;
    if (fin === fin && r.cargaSoltada[i] === 1) continue;
    const apaga = fin === fin ? Math.max(0, 1 - (t - fin) / APAGADO_DE_LA_CARGA_MS) : 1;
    if (apaga <= 0) continue;
    const c = r.cargaC[i] as number;
    const e = t - (r.cargaDesde[i] as number);
    const bx = r.bocaX[i] as number;
    const by = r.bocaY[i] as number;
    const bz = r.bocaZ[i] as number;
    filamentos(q, quien, t, c, apaga, bx, by, bz, r.piesX[i] as number, r.piesZ[i] as number, w);
    /* LAS MOTAS: del aire hacia la palma, cada vez más deprisa; sólo cuando la carga ya ha empezado. */
    if (e < 60) continue;
    const motas = POR_NIVEL.motasDeLaCarga[q];
    const periodo = 700 - 380 * c;
    const radio = 0.35 + 0.5 * c;
    for (let j = 0; j < motas; j++) {
      const desfase = azarDe(quien * 31 + j, 3);
      const vueltas = e / periodo + desfase;
      const vuelta = Math.floor(vueltas);
      const fase = vueltas - vuelta;
      const u = azarDe(quien * 131 + j, vuelta * 2 + 1) * 2 - 1;
      const ang = azarDe(quien * 131 + j, vuelta * 2 + 2) * Math.PI * 2;
      const rr = Math.sqrt(1 - u * u);
      const dx = rr * Math.cos(ang);
      const dy = u * 0.8;
      const dz = rr * Math.sin(ang);
      const lejos = radio * Math.pow(1 - fase, 1.4);
      const mx = bx + dx * lejos;
      const my = by + dy * lejos;
      const mz = bz + dz * lejos;
      /*
       * Una mota es un punto de luz ámbar con una cola corta que se afila hacia atrás: con colas de medio metro,
       * blancas y todas hacia la mano, la carga era una estrella de agujas de viñeta.
       */
      const cola = Math.min(0.12, 0.035 + lejos * 0.22);
      const b = Math.pow(fase, 1.3) * (0.5 + 1.2 * c) * apaga;
      /* De la cabeza (la mota) a la cola: la cinta que se afila (núcleo negativo) se apaga hacia su final. */
      w.cinta(
        mx,
        my,
        mz,
        mx + dx * cola,
        my + dy * cola,
        mz + dz * cola,
        0.005,
        6,
        0,
        (FILO[0] + (NUCLEO[0] - FILO[0]) * 0.3) * b * 1.4,
        (FILO[1] + (NUCLEO[1] - FILO[1]) * 0.3) * b * 1.4,
        (FILO[2] + (NUCLEO[2] - FILO[2]) * 0.3) * b * 1.4,
        AMBAR[0] * b * 0.4,
        AMBAR[1] * b * 0.4,
        AMBAR[2] * b * 0.4,
        quien * 7 + j,
        1,
        0,
        -0.45,
      );
    }
  }
}

/* ─────────────────────────────── Las ondas del rayo ─────────────────────────────── */

/**
 * LO DEL RAYO QUE VA EN LAS ONDAS (la pieza de `trazos.tsx`, que ya existe: cero llamadas nuevas):
 *
 *   · el FOGONAZO DE LA BOCA al soltar (un resplandor que alumbra la mano y se va en ~100 ms);
 *   · el RESPLANDOR del estallido en el aire mojado (con las descargas, y un rescoldo ámbar en el presentado),
 *     adelantado hacia la cámara para que la pared en que da no lo corte;
 *   · la ONDA DEL SUELO, que se abre hasta el radio DE VERDAD del área, y un destello del área entera;
 *   · el CHARCO DE LUZ en el suelo (lo que en N0-N1 hace de luz: ahí no hay luces reales);
 *   · el VAPOR que levanta del suelo mojado;
 *   · la MARCA CHAMUSCADA, que brilla y se apaga en unos segundos;
 *   · de cada carga, el NÚCLEO que crece en la palma y el ARO que se contrae hacia ella.
 *
 * Las escribe el `EscritorDeOndas` de la pieza de las ondas, detrás de lo suyo (ver `Ondas` en `trazos.tsx`).
 */
export class EscritorDeOndas {
  n = 0;
  cabe = 0;
  private CE: Float32Array = new Float32Array(0);
  private EJ: Float32Array = new Float32Array(0);
  private FO: Float32Array = new Float32Array(0);
  private CO: Float32Array = new Float32Array(0);

  empezar(CE: Float32Array, EJ: Float32Array, FO: Float32Array, CO: Float32Array, desde: number, cabe: number): void {
    this.CE = CE;
    this.EJ = EJ;
    this.FO = FO;
    this.CO = CO;
    this.n = desde;
    this.cabe = cabe;
  }

  /**
   * Una onda: centro y radio; `eje` 0 de cara a la cámara (`ejeX`: cuánto se adelanta hacia ella), 2 en el suelo
   * (`ejeY`: su altura sobre él); grosor, relleno o blancura, modo (0 aro, 1 resplandor, 2 brasa), fuerza y color.
   */
  onda(x: number, y: number, z: number, radio: number, eje: number, ejeX: number, ejeY: number, grosor: number, relleno: number, modo: number, fuerza: number, cr: number, cg: number, cb: number): void {
    if (this.n >= this.cabe || !(fuerza > 0.003) || !(radio > 0.001)) return;
    const o = this.n * 4;
    const { CE, EJ, FO, CO } = this;
    CE[o] = x;
    CE[o + 1] = y;
    CE[o + 2] = z;
    CE[o + 3] = radio;
    EJ[o] = ejeX;
    EJ[o + 1] = ejeY;
    EJ[o + 2] = 0;
    EJ[o + 3] = eje;
    FO[o] = grosor;
    FO[o + 1] = relleno;
    FO[o + 2] = modo;
    FO[o + 3] = fuerza;
    CO[this.n * 3] = cr;
    CO[this.n * 3 + 1] = cg;
    CO[this.n * 3 + 2] = cb;
    this.n++;
  }
}

const EN_EL_AIRE = 0;
const EN_EL_SUELO = 2;
const ARO = 0;
const RESPLANDOR = 1;
const BRASA = 2;
const CORONA = 3;
/** El rescoldo de la marca chamuscada: el rojo anaranjado de una brasa que se apaga (lineal). */
const BRASA_ROJA: readonly [number, number, number] = [1, 0.28, 0.05];
/** La onda del suelo de este rayo, reutilizada. */
const ONDA = { radio: 0, fuerza: 0 };

/** Escribe lo del rayo en las ondas (ver arriba). */
export function ondasDelRayo(r: EstadoDeLosRayos, t: number, tp: number, q: Nivel, w: EscritorDeOndas): void {
  const { CALIENTE } = LINEALES_DEL_RAYO;
  /* ─── LOS RAYOS ─── */
  for (let i = 0; i < RAYOS_A_LA_VEZ; i++) {
    if (r.vivo[i] === 0) continue;
    const ms = t - (r.t0[i] as number);
    const c = r.c[i] as number;
    const descargas = descargasDelRayo(c, q);
    /*
     * El fogonazo de la boca: un punto que se quema a blanco en la palma y se va en unos 60 ms. Pequeño: lo que
     * alumbra al personaje es la luz del destello (en su material), no un disco pintado encima de él.
     */
    if (r.sinCanal[i] === 0 && ms >= 0 && ms < 120) {
      const f = (1 + 2.2 * c) * Math.exp(-ms / 22);
      w.onda(r.ox[i] as number, r.oy[i] as number, r.oz[i] as number, 0.07 + 0.08 * c, EN_EL_AIRE, 0.12, 0, 0, 0.9, RESPLANDOR, f, CALIENTE[0], CALIENTE[1], CALIENTE[2]);
    }
    if (r.impacto[i] === 0) continue;
    const ei = t - (r.tImpacto[i] as number);
    const eip = tp - (r.tImpactoP[i] as number);
    if (ei < 0 && eip < 0) continue;
    const x = r.ix[i] as number;
    const y = r.iy[i] as number;
    const z = r.iz[i] as number;
    const area = r.area[i] as number;
    const llegada = llegadaDelRayo(c);
    /*
     * EL RESPLANDOR del estallido: un punto sobreexpuesto donde da, con las descargas (verdadero), y un rescoldo
     * ámbar pequeño que se va en ~150 ms (presentado). No es una bola de luz: la luz que se ve es la que cae en la
     * calle (el foco de N2-N3, el charco de luz de N0-N1, los cuerpos, las tarjetas).
     */
    if (ei >= 0) {
      /*
       * Pequeño a propósito: desde el hombro el blanco está justo detrás del final del canal, y un resplandor de medio
       * metro (más el brillo del posproceso) se comía el canal entero en una bola.
       */
      const descarga = Math.min(1.2, brilloDelCanal(ei + llegada, c, descargas));
      const rescoldo = eip >= 0 ? (0.2 + 0.35 * c) * Math.exp(-eip / 70) : 0;
      const radio = (0.1 + 0.12 * c) * (1 + 0.25 * Math.min(1, Math.max(0, eip) / 150));
      const fuerza = (0.6 + 1.1 * c) * descarga + rescoldo;
      const blanco = Math.min(1, descarga * 1.2);
      w.onda(x, y, z, radio, EN_EL_AIRE, radio * 0.9, 0, 0, 0.9 * blanco, RESPLANDOR, fuerza, CALIENTE[0], CALIENTE[1] * (0.85 + 0.15 * blanco), CALIENTE[2] * (0.7 + 0.3 * blanco));
      /* EL CHARCO DE LUZ en el suelo mojado: la luz del estallido donde N0-N1 no tienen luces (en N2-N3 lo hace el foco). */
      /*
       * Un corro de tres metros y medio como mucho, alrededor de donde da: con siete, desde el hombro, era una mancha
       * blanca en el suelo entre quien dispara y el blanco, más clara que el propio rayo.
       */
      const luz = (0.3 + 0.7 * c) * (Math.min(1, descarga) + 0.3 * Math.exp(-ei / 90)) * (q >= 2 ? 0.22 : 0.28);
      w.onda(x, 0, z, 1.2 + 2.3 * c, EN_EL_SUELO, 0, 0.03, 0, 0, RESPLANDOR, luz, CALIENTE[0], CALIENTE[1] * 0.9, CALIENTE[2] * 0.75);
    }
    if (eip < 0) continue;
    /* LA ONDA DEL SUELO: hasta el radio de verdad del área (§4: «el jugador ve lo que abarca»). */
    const onda = ondaDelSuelo(eip, area, ONDA);
    if (onda.fuerza > 0) {
      const g = 0.05 + 0.07 * (1 - Math.min(1, eip / duracionDeLaOnda(area)));
      w.onda(x, 0, z, onda.radio, EN_EL_SUELO, 0, 0.04, g, 0, ARO, onda.fuerza * (1.2 + 1.2 * c), FILO[0], FILO[1], FILO[2]);
    }
    /* El destello del área entera, un instante: lo que abarca se ilumina a la vez. */
    if (area > 0 && eip < 170) {
      w.onda(x, 0, z, area * 1.05, EN_EL_SUELO, 0, 0.035, 0, 0, RESPLANDOR, 0.55 * (1 - eip / 170), CALIENTE[0], CALIENTE[1] * 0.9, CALIENTE[2] * 0.75);
    }
    /* EL VAPOR del suelo mojado: soplos que suben y se abren, alumbrados por el estallido. */
    const soplos = POR_NIVEL.vaporDelEstallido[q];
    const semilla = r.semilla[i] as number;
    for (let k = 0; k < soplos; k++) {
      const e = eip - k * 70;
      if (e < 0 || e >= 900) continue;
      const s = e / 900;
      const a = azarDe(semilla, 500 + k) * Math.PI * 2;
      const d = 0.2 + 0.5 * azarDe(semilla, 510 + k) + 0.4 * s;
      const brillo = (0.18 + 0.2 * c) * (1 - s) * (1 - s) * (0.5 + 0.5 * Math.exp(-e / 120));
      w.onda(x + Math.cos(a) * d, 0.25 + 0.75 * s, z + Math.sin(a) * d, 0.35 + 1.1 * s, EN_EL_AIRE, 0.3, 0, 0, 0, RESPLANDOR, brillo, 0.62, 0.56, 0.5);
    }
  }
  /* ─── LAS MARCAS CHAMUSCADAS ─── */
  for (let m = 0; m < MARCAS_A_LA_VEZ; m++) {
    if (r.marcaViva[m] === 0) continue;
    const e = tp - (r.marcaT0p[m] as number);
    if (e < 0) continue;
    const s = Math.min(1, e / MARCA_MS);
    const f = r.marcaFuerza[m] as number;
    const queda = Math.pow(1 - s, 2.5);
    const caliente = Math.exp(-e / 260);
    const fuerza = (1.1 * queda + 1.2 * caliente) * (0.6 + 0.4 * f);
    const cr = BRASA_ROJA[0] + ((CALIENTE[0] as number) - BRASA_ROJA[0]) * caliente;
    const cg = BRASA_ROJA[1] + ((CALIENTE[1] as number) - BRASA_ROJA[1]) * caliente;
    const cb = BRASA_ROJA[2] + ((CALIENTE[2] as number) - BRASA_ROJA[2]) * caliente;
    w.onda(r.marcaX[m] as number, 0, r.marcaZ[m] as number, 0.3 + 0.45 * f, EN_EL_SUELO, 0, 0.035, 0, 0, BRASA, fuerza, cr, cg, cb);
  }
  /* ─── LAS CARGAS: el núcleo en la palma y el aro que se contrae ─── */
  for (let i = 0; i < CARGAS_A_LA_VEZ; i++) {
    const quien = r.cargaQuien[i] as number;
    if (quien === 0 || r.conBoca[i] === 0) continue;
    const fin = r.cargaFin[i] as number;
    if (fin === fin && r.cargaSoltada[i] === 1) continue;
    const apaga = fin === fin ? Math.max(0, 1 - (t - fin) / APAGADO_DE_LA_CARGA_MS) : 1;
    if (apaga <= 0) continue;
    const c = r.cargaC[i] as number;
    const bx = r.bocaX[i] as number;
    const by = r.bocaY[i] as number;
    const bz = r.bocaZ[i] as number;
    const parpadeo = parpadeoDeLaCarga(quien, t, c);
    /*
     * El núcleo: pequeño y ámbar al empezar, blanco y algo mayor según se llena. Un puño de luz, no una bombilla: con
     * un palmo de radio, el brillo del posproceso lo volvía una bola que tapaba la mano y los filamentos.
     */
    const radio = (0.045 + 0.09 * c) * (0.85 + 0.3 * parpadeo) * (0.6 + 0.4 * apaga);
    w.onda(bx, by, bz, radio, EN_EL_AIRE, 0.05, 0, 0, 0.35 + 0.6 * c, RESPLANDOR, (0.8 + 3 * c) * apaga * parpadeo, AMBAR[0] + (FILO[0] - AMBAR[0]) * c, AMBAR[1] + (FILO[1] - AMBAR[1]) * c, AMBAR[2] + (FILO[2] - AMBAR[2]) * c);
    /* La corona: se cierra hacia la mano, cada vez más deprisa, a trazos que giran, y brilla más cuanto más cerrada. */
    const vueltas = ((t - (r.cargaDesde[i] as number)) / 1000) * (1.3 + 2.7 * c) + azarDe(quien, 11);
    const fase = vueltas - Math.floor(vueltas);
    const giro = ((t / 1000) * (0.6 + 1.4 * c)) % 1;
    w.onda(bx, by, bz, 0.08 + 0.42 * (1 - fase), EN_EL_AIRE, 0, 0, 0.01 + 0.008 * c, giro, CORONA, (0.3 + 1.2 * c) * fase * fase * apaga, FILO[0], FILO[1], FILO[2]);
  }
}

/**
 * LOS FILAMENTOS DE LA CARGA (§4: «filamentos ámbar cortos que trepan por el brazo y saltan a tierra»): cada uno vive
 * un tramo corto (de 110 ms vacía a 50 ms llena: los chasquidos se aceleran), y en cada tramo el azar sembrado decide
 * si salta, adónde (por el brazo hacia el hombro, al aire alrededor de la mano o, desde media carga y más de tarde en
 * tarde, de la pierna al suelo mojado) y con qué forma. Son ÁMBAR claro y cortos: son la carga, no el disparo, y un
 * rayo blanco de la mano al suelo se leía más que el propio rayo.
 */
function filamentos(q: Nivel, quien: number, t: number, c: number, apaga: number, bx: number, by: number, bz: number, fx: number, fz: number, w: EscritorDeCintas): void {
  const cuantos = POR_NIVEL.filamentosDeLaCarga[q];
  const tramo = 110 - 60 * c;
  for (let m = 0; m < cuantos; m++) {
    const reloj = t + m * 37;
    const vez = Math.floor(reloj / tramo);
    const semilla = (quien * 7349 + m * 131 + vez * 2654435761) >>> 0;
    const tipo = m % 3;
    /* Los saltos a tierra, la mitad de a menudo que los otros. */
    const salta = 0.45 + 0.5 * c;
    if (azarDe(semilla, 1) > (tipo === 1 ? salta * 0.5 : salta)) continue;
    /* Dentro de su tramo, sale entero y se apaga. */
    const edad = (reloj - vez * tramo) / tramo;
    const b = (0.8 + 2 * c) * (1 - edad) * (1 - edad) * apaga;
    if (b < 0.03) continue;
    /* De dónde salta (la mano, o la pierna si va a tierra) y adónde. */
    let ax = bx;
    let ay = by;
    let az = bz;
    let hx: number;
    let hy: number;
    let hz: number;
    let brillo = 1;
    if (tipo === 0) {
      /* Por el brazo: hacia el hombro (encima de los pies, a 1,45 m), un trozo. */
      const k = 0.3 + 0.35 * azarDe(semilla, 2);
      hx = bx + (fx - bx) * k + (azarDe(semilla, 3) - 0.5) * 0.1;
      hy = by + (1.45 - by) * k + 0.04;
      hz = bz + (fz - bz) * k + (azarDe(semilla, 4) - 0.5) * 0.1;
    } else if (tipo === 1 && c > 0.45) {
      /* A tierra: de la espinilla, del lado de la mano, un salto corto al suelo mojado. */
      const lx = bx - fx;
      const lz = bz - fz;
      const l = Math.sqrt(lx * lx + lz * lz) || 1;
      ax = fx + (lx / l) * 0.12;
      ay = 0.25 + 0.25 * azarDe(semilla, 10);
      az = fz + (lz / l) * 0.12;
      const a = azarDe(semilla, 5) * Math.PI * 2;
      const d = 0.15 + 0.25 * azarDe(semilla, 6);
      hx = ax + Math.cos(a) * d;
      hy = 0.02;
      hz = az + Math.sin(a) * d;
      brillo = 0.7;
    } else {
      /* Al aire: un arco corto alrededor de la mano. */
      const u = azarDe(semilla, 7) * 2 - 1;
      const a = azarDe(semilla, 8) * Math.PI * 2;
      const rr = Math.sqrt(1 - u * u);
      const d = 0.1 + 0.22 * c * (0.5 + 0.5 * azarDe(semilla, 9));
      hx = bx + rr * Math.cos(a) * d;
      hy = by + u * d;
      hz = bz + rr * Math.sin(a) * d;
    }
    const lx = hx - ax;
    const ly = hy - ay;
    const lz = hz - az;
    const largo = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const k = b * brillo;
    /* El núcleo, un ámbar claro (entre el filo y el blanco); el velo, el ámbar del jugador. */
    w.cinta(
      ax,
      ay,
      az,
      hx,
      hy,
      hz,
      0.008,
      10,
      0,
      (FILO[0] + (NUCLEO[0] - FILO[0]) * 0.35) * k * 1.3,
      (FILO[1] + (NUCLEO[1] - FILO[1]) * 0.35) * k * 1.3,
      (FILO[2] + (NUCLEO[2] - FILO[2]) * 0.35) * k * 1.3,
      AMBAR[0] * k * 0.55,
      AMBAR[1] * k * 0.55,
      AMBAR[2] * k * 0.55,
      semilla,
      1,
      largo * 0.18,
      0.55,
    );
  }
}
