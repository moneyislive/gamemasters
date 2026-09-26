/**
 * LO QUE VUELA: las líneas de apuntado del tirador, las balas lentas con su estela, las ondas de
 * aire que dejan detrás y la onda y el destello de cada impacto.
 *
 * ═══ LAS BALAS SE PINTAN DONDE ESTÁN DE VERDAD ═══
 *
 * «El aparato la pinta en su sitio verdadero con la misma tabla» (diseño §4.6): el aviso `bala`
 * trae origen, rumbo de 0 a 255 e instante de salida, y aquí la dirección sale de `SENO`/`COSENO`
 * de `shared/mecanicas/andar.ts` —la tabla del servidor— y el recorrido de `recorridoDeLaBala`, en
 * el reloj VERDADERO. Lo que ves es lo que se juzga; si la bala se pintara en el reloj del Remanso,
 * un quiebro limpio te dejaría esquivando una bala que ya no está ahí.
 *
 * ═══ LA LÍNEA DE APUNTADO SIGUE AL BLANCO HASTA QUE SE FIJA ═══
 *
 * El tirador apunta 12 tics «al sitio donde estabas al terminar de apuntar». Mientras apunta, la
 * línea sigue a su blanco (localizador) y se va cargando; en el instante `fin` se queda quieta
 * donde estaba, da un fogonazo y sale la ráfaga. Se pinta en el reloj verdadero, como las balas.
 *
 * ═══ LAS ONDAS NO GUARDAN NADA ═══
 *
 * Las ondas de aire de una bala no se crean ni se destruyen: la onda `k` nace cuando la bala pasa
 * por `(k + 1)·1,2 m`, y su edad sale del recorrido (`edadDeLaOnda`). Cada fotograma se pintan las
 * más nuevas, tantas como diga el nivel. Las ondas de los impactos, en cambio, son adorno y van en
 * el reloj presentado: en el Remanso la onda se queda colgada en el aire, que es lo que se busca.
 */
import { useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  ALTURA_DE_LA_BALA,
  ALTURA_DEL_ANILLO,
  COLOR_DE_LA_AMENAZA,
  COLORES,
  DESTELLO_MS,
  ESPACIO_ENTRE_ONDAS,
  LARGO_DE_LA_ESTELA,
  ONDA_DEL_IMPACTO_MS,
  RECOGIDA_DE_LA_ESTELA_MS,
  VIDA_DE_LA_ONDA_MS,
  alcanceDeLaBala,
  componentesLineales,
  direccionDelRumbo,
  edadDeLaOnda,
  radioDeLaOndaDelImpacto,
  recorridoDeLaBala,
  velocidadDeLaBala,
} from './cuentas';
import { subirLasPrimeras } from './geometrias';
import { mallaDeEfecto, pxPorMetroDeLaCamara } from './malla';
import { ajuste } from './presupuesto';
import { EscritorDeOndas, ondasDelRayo } from './rayos';
import type { SistemaDeEfectos } from './sistema';
import { COLA_DEL_APUNTADO_MS } from './sistema';

const TIRADOR = componentesLineales(COLOR_DE_LA_AMENAZA.tirador);
const BLANCO = componentesLineales(COLORES.blanco);
const NUCLEO_DE_LA_BALA = componentesLineales(0xffe2c4);

/**
 * Ancho de la línea de apuntado en metros, y su mínimo en pantalla: el de sus GLIFOS, que corren a
 * lo largo; la línea en sí es un espinazo de dos o tres píxeles por el centro (ver `materiales.ts`).
 * Con 3,5 cm de ancho, a doce metros era una raya de dos píxeles que no se veía: la primera versión
 * del banco lo enseñó.
 */
const ANCHO_DEL_APUNTADO = 0.14;
const MIN_PX_DEL_APUNTADO = 9;
/** Ancho de la bala con su estela: el núcleo se ve de 16 cm; el radio de choque (0,2 m) no se pinta. */
const ANCHO_DE_LA_BALA = 0.16;
const MIN_PX_DE_LA_BALA = 3;

/* ─────────────────────────────── Apuntado y balas ─────────────────────────────── */

export function Trazos({ sistema }: { sistema: SistemaDeEfectos }): JSX.Element {
  const pieza = useMemo(() => mallaDeEfecto('trazos', { aA: 4, aB: 4, aC: 4, aColorA: 4, aColorB: 4, aTramo: 4 }), []);
  useEffect(() => () => pieza.soltar(), [pieza]);
  const sitio = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const bala = useMemo(() => ({ salida: 0, x: 0, y: 0, z: 0, rumbo: 0, fin: null as number | null, velocidad: 0, alcance: 0 }), []);
  const dir = useMemo(() => ({ x: 0, z: 0 }), []);
  const todos = useMemo(() => Object.values(pieza.atributos), [pieza]);

  useFrame((estado) => {
    const t = sistema.ahora.verdadero;
    const { aA, aB, aC, aColorA, aColorB, aTramo } = pieza.atributos;
    const A = aA.array as Float32Array;
    const B = aB.array as Float32Array;
    const C = aC.array as Float32Array;
    const CA = aColorA.array as Float32Array;
    const CB = aColorB.array as Float32Array;
    const TR = aTramo.array as Float32Array;
    let n = 0;

    const ap = sistema.apuntados;
    for (let i = 0; i < ap.ranuras.capacidad; i++) {
      if (ap.ranuras.viva[i] === 0) continue;
      const fin = ap.fin[i] as number;
      const inicio = ap.inicio[i] as number;
      /* El tirador se sigue siempre; el blanco sólo hasta que la línea se fija. */
      const qd = ap.quienDesde[i] as number;
      if (qd >= 0 && sistema.localizar !== null && sistema.localizar(qd, sitio)) {
        ap.dx[i] = sitio.x;
        ap.dy[i] = sitio.y + ALTURA_DE_LA_BALA;
        ap.dz[i] = sitio.z;
      }
      const qh = ap.quienHacia[i] as number;
      if (t < fin && qh >= 0 && sistema.localizar !== null && sistema.localizar(qh, sitio)) {
        ap.hx[i] = sitio.x;
        ap.hy[i] = sitio.y + ALTURA_DEL_ANILLO;
        ap.hz[i] = sitio.z;
      }
      const p = fin > inicio ? Math.min(1, Math.max(0, (t - inicio) / (fin - inicio))) : 1;
      const tras = t > fin ? Math.min(1, (t - fin) / COLA_DEL_APUNTADO_MS) : 0;
      const k = n * 4;
      A[k] = ap.dx[i] as number;
      A[k + 1] = ap.dy[i] as number;
      A[k + 2] = ap.dz[i] as number;
      A[k + 3] = ANCHO_DEL_APUNTADO;
      B[k] = ap.hx[i] as number;
      B[k + 1] = ap.hy[i] as number;
      B[k + 2] = ap.hz[i] as number;
      B[k + 3] = MIN_PX_DEL_APUNTADO;
      C[k] = ((A[k] as number) + (B[k] as number)) / 2;
      C[k + 1] = ((A[k + 1] as number) + (B[k + 1] as number)) / 2;
      C[k + 2] = ((A[k + 2] as number) + (B[k + 2] as number)) / 2;
      C[k + 3] = 0;
      CA[k] = TIRADOR[0];
      CA[k + 1] = TIRADOR[1];
      CA[k + 2] = TIRADOR[2];
      /* Se carga mientras apunta; al fijarse, fogonazo y fuera. */
      CA[k + 3] = tras > 0 ? 1.5 * (1 - tras) : 0.55 + 0.75 * p;
      CB[k] = TIRADOR[0] * 0.6 + BLANCO[0] * 0.4;
      CB[k + 1] = TIRADOR[1] * 0.6 + BLANCO[1] * 0.4;
      CB[k + 2] = TIRADOR[2] * 0.6 + BLANCO[2] * 0.4;
      CB[k + 3] = i * 97;
      TR[k] = 0;
      TR[k + 1] = 1;
      TR[k + 2] = 3 + 9 * p;
      TR[k + 3] = tras > 0 ? 1 - tras : 0;
      n++;
    }

    const bs = sistema.balas;
    for (let i = 0; i < bs.ranuras.capacidad; i++) {
      if (bs.ranuras.viva[i] === 0) continue;
      bs.leer(i, bala);
      if (t < bala.salida) continue;
      const d = recorridoDeLaBala(bala, t);
      direccionDelRumbo(bala.rumbo, dir);
      /* Cuándo se paró (alcance o fin), para recoger la estela hacia la cabeza. */
      const parada = bala.salida + (d / velocidadDeLaBala(bala)) * 1000;
      const recogida = bala.fin !== null || d >= alcanceDeLaBala(bala) ? Math.min(1, Math.max(0, (t - parada) / RECOGIDA_DE_LA_ESTELA_MS)) : 0;
      const largo = Math.min(d, LARGO_DE_LA_ESTELA) * (1 - recogida);
      const k = n * 4;
      A[k] = bala.x + dir.x * (d - largo);
      A[k + 1] = bala.y;
      A[k + 2] = bala.z + dir.z * (d - largo);
      A[k + 3] = ANCHO_DE_LA_BALA;
      B[k] = bala.x + dir.x * d;
      B[k + 1] = bala.y;
      B[k + 2] = bala.z + dir.z * d;
      B[k + 3] = MIN_PX_DE_LA_BALA;
      C[k] = ((A[k] as number) + (B[k] as number)) / 2;
      C[k + 1] = bala.y;
      C[k + 2] = ((A[k + 2] as number) + (B[k + 2] as number)) / 2;
      C[k + 3] = 1;
      CA[k] = TIRADOR[0];
      CA[k + 1] = TIRADOR[1];
      CA[k + 2] = TIRADOR[2];
      CA[k + 3] = 1 - recogida;
      CB[k] = NUCLEO_DE_LA_BALA[0];
      CB[k + 1] = NUCLEO_DE_LA_BALA[1];
      CB[k + 2] = NUCLEO_DE_LA_BALA[2];
      CB[k + 3] = i * 131 + 7;
      TR[k] = 0;
      TR[k + 1] = 1;
      TR[k + 2] = 0;
      TR[k + 3] = 0;
      n++;
    }

    pieza.pintar(n);
    if (n > 0) for (const a of todos) subirLasPrimeras(a, n);
    const u = pieza.material.uniforms;
    (u.uTiempo as { value: number }).value = sistema.segundos(t);
    (u.uPxPorMetro as { value: number }).value = pxPorMetroDeLaCamara(estado.camera, estado.size.height, estado.gl.getPixelRatio());
  });

  return <primitive object={pieza.malla} />;
}

/* ─────────────────────────────── Ondas ─────────────────────────────── */

const AIRE = componentesLineales(0xcfe9ff);
const FOGONAZO = componentesLineales(0xfff4de);

export function Ondas({ sistema }: { sistema: SistemaDeEfectos }): JSX.Element {
  const pieza = useMemo(() => mallaDeEfecto('ondas', { aCentro: 4, aEje: 4, aForma: 4, aColor: 3 }), []);
  useEffect(() => () => pieza.soltar(), [pieza]);
  const bala = useMemo(() => ({ salida: 0, x: 0, y: 0, z: 0, rumbo: 0, fin: null as number | null, velocidad: 0, alcance: 0 }), []);
  const dir = useMemo(() => ({ x: 0, z: 0 }), []);
  const todos = useMemo(() => Object.values(pieza.atributos), [pieza]);
  const rayo = useMemo(() => new EscritorDeOndas(), []);

  useFrame(() => {
    const t = sistema.ahora.verdadero;
    const tp = sistema.ahora.presentado;
    const porBala = ajuste('ondasPorBala', sistema.nivel);
    const { aCentro, aEje, aForma, aColor } = pieza.atributos;
    const CE = aCentro.array as Float32Array;
    const EJ = aEje.array as Float32Array;
    const FO = aForma.array as Float32Array;
    const CO = aColor.array as Float32Array;
    let n = 0;
    const cabe = pieza.capacidad;

    const bs = sistema.balas;
    for (let i = 0; i < bs.ranuras.capacidad && n < cabe; i++) {
      if (bs.ranuras.viva[i] === 0) continue;
      bs.leer(i, bala);
      const d = recorridoDeLaBala(bala, t);
      direccionDelRumbo(bala.rumbo, dir);
      /* De la más nueva hacia atrás, hasta el cupo del nivel o hasta la primera ya muerta. */
      let puestas = 0;
      for (let k = Math.floor(d / ESPACIO_ENTRE_ONDAS) - 1; k >= 0 && puestas < porBala && n < cabe; k--) {
        const edad = edadDeLaOnda(bala, k, t);
        if (edad < 0) break;
        const s = edad / VIDA_DE_LA_ONDA_MS;
        const o = n * 4;
        const at = (k + 1) * ESPACIO_ENTRE_ONDAS;
        CE[o] = bala.x + dir.x * at;
        CE[o + 1] = bala.y;
        CE[o + 2] = bala.z + dir.z * at;
        CE[o + 3] = 0.1 + 0.42 * s;
        EJ[o] = dir.x;
        EJ[o + 1] = 0;
        EJ[o + 2] = dir.z;
        EJ[o + 3] = 1;
        FO[o] = 0.025;
        FO[o + 1] = 0;
        FO[o + 2] = 0;
        FO[o + 3] = (1 - s) * (1 - s) * 0.55;
        CO[n * 3] = AIRE[0];
        CO[n * 3 + 1] = AIRE[1];
        CO[n * 3 + 2] = AIRE[2];
        n++;
        puestas++;
      }
    }

    const im = sistema.impactos;
    for (let i = 0; i < im.ranuras.capacidad && n + 2 <= cabe; i++) {
      if (im.ranuras.viva[i] === 0) continue;
      const e = tp - (im.nace[i] as number);
      if (e < 0) continue;
      const f = im.fuerza[i] as number;
      const x = im.x[i] as number;
      const y = im.y[i] as number;
      const z = im.z[i] as number;
      if (e < ONDA_DEL_IMPACTO_MS) {
        const s = e / ONDA_DEL_IMPACTO_MS;
        const o = n * 4;
        CE[o] = x;
        CE[o + 1] = y;
        CE[o + 2] = z;
        CE[o + 3] = radioDeLaOndaDelImpacto(f) * (1 - (1 - s) * (1 - s));
        EJ[o] = 0;
        EJ[o + 1] = 1;
        EJ[o + 2] = 0;
        EJ[o + 3] = 0;
        FO[o] = 0.04 + 0.05 * f * (1 - s);
        FO[o + 1] = 0;
        FO[o + 2] = 0;
        FO[o + 3] = (1 - s) * (1 - s) * (0.6 + 0.8 * f);
        CO[n * 3] = BLANCO[0];
        CO[n * 3 + 1] = BLANCO[1];
        CO[n * 3 + 2] = BLANCO[2];
        n++;
      }
      if (e < DESTELLO_MS) {
        const s = e / DESTELLO_MS;
        const o = n * 4;
        CE[o] = x;
        CE[o + 1] = y;
        CE[o + 2] = z;
        CE[o + 3] = 0.2 + 0.5 * f;
        EJ[o] = 0;
        EJ[o + 1] = 1;
        EJ[o + 2] = 0;
        EJ[o + 3] = 0;
        FO[o] = 0.02;
        FO[o + 1] = 1;
        FO[o + 2] = 0;
        FO[o + 3] = (1 - s) * (0.8 + 1.2 * f);
        CO[n * 3] = FOGONAZO[0];
        CO[n * 3 + 1] = FOGONAZO[1];
        CO[n * 3 + 2] = FOGONAZO[2];
        n++;
      }
    }

    /* EL RAYO: la boca, el estallido, la onda del suelo, el vapor, la marca y la carga (`rayos.tsx`). */
    rayo.empezar(CE, EJ, FO, CO, n, cabe);
    ondasDelRayo(sistema.rayos, t, tp, sistema.nivel, rayo);
    n = rayo.n;

    pieza.pintar(n);
    if (n > 0) for (const a of todos) subirLasPrimeras(a, n);
  });

  return <primitive object={pieza.malla} />;
}
