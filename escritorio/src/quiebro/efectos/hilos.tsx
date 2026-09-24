/**
 * LOS HILOS: el Trasvase y el cable de la salida.
 *
 * ═══ EL TRASVASE SE TIENE QUE VER DESDE LEJOS ═══
 *
 * «Unos hilos de glifos van del Prestado al Celador durante 0,6 s, visibles para todos» (diseño
 * §4.8): es la lección que el juego enseña sin texto —no dejes Prestados vivos junto a un Celador
 * caído—, y sólo se aprende si se ve. Por eso son varios hilos curvos (de 3 en N0 a 5 en N2), que se
 * abren en abanico y suben, del ámbar del durmiente al verde frío del Celador, y no bajan de un
 * hilo de glifos legible (6 píxeles) a ninguna distancia, con su espinazo encendido por el centro.
 *
 * ═══ LA SALIDA SUBE POR EL CABLE ═══
 *
 * «Te deshaces en glifos ámbar que suben por el cable» (§8, momento 9). El cable son unos pocos
 * tramos rectos que da la cabina (`ciudad/` sabe dónde está su auricular y su poste); por ellos
 * corre un paquete de glifos de metro y medio, del auricular hacia arriba, mientras la silueta se
 * deshace en `SiluetasDeGrafia`. Todo en el reloj presentado: es adorno.
 */
import { useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import { COLORES, azarDe, componentesLineales, salidaEn, trasvaseEn } from './cuentas';
import { subirLasPrimeras } from './geometrias';
import { mallaDeEfecto, pxPorMetroDeLaCamara } from './malla';
import { TRAMOS_DEL_CABLE, ajuste, instanciasDe } from './presupuesto';
import type { SistemaDeEfectos } from './sistema';
import { CLASES_DE_SILUETA } from './sistema';

const AMBAR = componentesLineales(COLORES.ambar);
const AMBAR_CLARO = componentesLineales(COLORES.ambarClaro);
const VERDE = componentesLineales(COLORES.verdeDelTrasvase);

/** Altura del pecho del Prestado de pie y del Celador de rodillas, sobre sus pies. */
const PECHO_DE_PIE = 1.15;
const PECHO_DE_RODILLAS = 0.6;
/** Largo del paquete de glifos que sube por el cable. */
const PAQUETE_DEL_CABLE = 1.5;

export function Hilos({ sistema }: { sistema: SistemaDeEfectos }): JSX.Element {
  const pieza = useMemo(() => mallaDeEfecto('hilos', { aA: 4, aB: 4, aC: 4, aColorA: 4, aColorB: 4, aTramo: 4 }), []);
  useEffect(() => () => pieza.soltar(), [pieza]);
  const todos = useMemo(() => Object.values(pieza.atributos), [pieza]);
  const sitio = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const trasvase = useMemo(() => trasvaseEn(0, 1), []);
  const salida = useMemo(() => salidaEn(0, 1), []);

  useFrame((estado) => {
    const tp = sistema.ahora.presentado;
    const { aA, aB, aC, aColorA, aColorB, aTramo } = pieza.atributos;
    const A = aA.array as Float32Array;
    const B = aB.array as Float32Array;
    const C = aC.array as Float32Array;
    const CA = aColorA.array as Float32Array;
    const CB = aColorB.array as Float32Array;
    const TR = aTramo.array as Float32Array;
    const tope = instanciasDe('hilos', sistema.nivel);
    const porTrasvase = ajuste('hilosPorTrasvase', sistema.nivel);
    let n = 0;

    const tv = sistema.trasvases;
    for (let i = 0; i < tv.ranuras.capacidad; i++) {
      if (tv.ranuras.viva[i] === 0) continue;
      const m = trasvaseEn(tp, tv.inicio[i] as number, trasvase);
      if (!m.viva) continue;
      const qd = tv.quienDesde[i] as number;
      if (qd >= 0 && sistema.localizar !== null && sistema.localizar(qd, sitio)) {
        tv.dx[i] = sitio.x;
        tv.dy[i] = sitio.y;
        tv.dz[i] = sitio.z;
      }
      const qh = tv.quienHacia[i] as number;
      if (qh >= 0 && sistema.localizar !== null && sistema.localizar(qh, sitio)) {
        tv.hx[i] = sitio.x;
        tv.hy[i] = sitio.y;
        tv.hz[i] = sitio.z;
      }
      const ax = tv.dx[i] as number;
      const ay = (tv.dy[i] as number) + PECHO_DE_PIE;
      const az = tv.dz[i] as number;
      const bx = tv.hx[i] as number;
      const by = (tv.hy[i] as number) + PECHO_DE_RODILLAS;
      const bz = tv.hz[i] as number;
      /* Perpendicular horizontal a la línea que los une: hacia ahí se abre el abanico. */
      let px = -(bz - az);
      let pz = bx - ax;
      const l = Math.sqrt(px * px + pz * pz) || 1;
      px /= l;
      pz /= l;
      const semilla = tv.semilla[i] as number;
      for (let h = 0; h < porTrasvase && n < tope; h++) {
        const abre = (h - (porTrasvase - 1) / 2) * 0.35 + (azarDe(semilla, h) - 0.5) * 0.3;
        const sube = 0.35 + 0.9 * azarDe(semilla, h + 50);
        const k = n * 4;
        A[k] = ax;
        A[k + 1] = ay;
        A[k + 2] = az;
        A[k + 3] = 0.1;
        B[k] = bx;
        B[k + 1] = by;
        B[k + 2] = bz;
        B[k + 3] = 6;
        C[k] = (ax + bx) / 2 + px * abre;
        C[k + 1] = (ay + by) / 2 + sube;
        C[k + 2] = (az + bz) / 2 + pz * abre;
        C[k + 3] = 2;
        CA[k] = AMBAR[0];
        CA[k + 1] = AMBAR[1];
        CA[k + 2] = AMBAR[2];
        CA[k + 3] = m.brillo * (0.8 + 0.4 * azarDe(semilla, h + 99));
        CB[k] = VERDE[0];
        CB[k + 1] = VERDE[1];
        CB[k + 2] = VERDE[2];
        CB[k + 3] = (semilla + h * 13) % 4096;
        TR[k] = 0;
        TR[k + 1] = m.flujo;
        TR[k + 2] = 6;
        TR[k + 3] = 0;
        n++;
      }
    }

    const si = sistema.siluetas;
    for (let i = 0; i < si.ranuras.capacidad; i++) {
      if (si.ranuras.viva[i] === 0 || CLASES_DE_SILUETA[si.clase[i] as number] !== 'salida') continue;
      const puntos = si.puntosDelCable[i] as number;
      if (puntos < 2) continue;
      const m = salidaEn(tp, si.inicio[i] as number, salida);
      if (!m.viva) continue;
      const base = i * (TRAMOS_DEL_CABLE + 1) * 3;
      const c = si.cable;
      /* El largo total del cable, para repartir el recorrido entre los tramos. */
      let total = 0;
      for (let k = 0; k + 1 < puntos; k++) total += distancia(c, base + k * 3, base + (k + 1) * 3);
      const recorrido = m.cable * (total + PAQUETE_DEL_CABLE);
      let antes = 0;
      for (let k = 0; k + 1 < puntos && n < tope; k++) {
        const o0 = base + k * 3;
        const o1 = base + (k + 1) * 3;
        const largo = distancia(c, o0, o1);
        const frente = Math.min(1, Math.max(0, (recorrido - antes) / Math.max(largo, 1e-3)));
        const cola = Math.min(1, Math.max(0, (recorrido - PAQUETE_DEL_CABLE - antes) / Math.max(largo, 1e-3)));
        antes += largo;
        if (frente <= cola) continue;
        const q = n * 4;
        A[q] = c[o0] as number;
        A[q + 1] = c[o0 + 1] as number;
        A[q + 2] = c[o0 + 2] as number;
        A[q + 3] = 0.12;
        B[q] = c[o1] as number;
        B[q + 1] = c[o1 + 1] as number;
        B[q + 2] = c[o1 + 2] as number;
        B[q + 3] = 7;
        C[q] = ((A[q] as number) + (B[q] as number)) / 2;
        C[q + 1] = ((A[q + 1] as number) + (B[q + 1] as number)) / 2;
        C[q + 2] = ((A[q + 2] as number) + (B[q + 2] as number)) / 2;
        C[q + 3] = 3;
        CA[q] = AMBAR[0];
        CA[q + 1] = AMBAR[1];
        CA[q + 2] = AMBAR[2];
        CA[q + 3] = 1.2 * m.glifos;
        CB[q] = AMBAR_CLARO[0];
        CB[q + 1] = AMBAR_CLARO[1];
        CB[q + 2] = AMBAR_CLARO[2];
        CB[q + 3] = (i * 41 + k * 7) % 4096;
        TR[q] = cola;
        TR[q + 1] = frente;
        TR[q + 2] = 8;
        TR[q + 3] = 0;
        n++;
      }
    }

    pieza.pintar(n);
    if (n > 0) for (const a of todos) subirLasPrimeras(a, n);
    const u = pieza.material.uniforms;
    (u.uTiempo as { value: number }).value = sistema.segundos(tp);
    (u.uPxPorMetro as { value: number }).value = pxPorMetroDeLaCamara(estado.camera, estado.size.height, estado.gl.getPixelRatio());
  });

  return <primitive object={pieza.malla} />;
}

function distancia(c: Float64Array, a: number, b: number): number {
  const dx = (c[b] as number) - (c[a] as number);
  const dy = (c[b + 1] as number) - (c[a + 1] as number);
  const dz = (c[b + 2] as number) - (c[a + 2] as number);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
