/**
 * LOS TAPICES DE GRAFÍA: todo lo que son columnas de glifos que caen o suben.
 *
 *   · `CieloDeGrafia`     — columnas tenues que suben tras la niebla (diseño §8, «Cielo»).
 *   · `PantallasDeGrafia` — las pantallas de la ciudad; las pone `ciudad/` con `sistema.pantallas`.
 *   · `MuroDelBis`        — la pared de glifos que tiembla en un radio de 20 m, y que REPITE el
 *                           mismo segundo dos veces (sus glifos ven `tiempoRepetido`, no el reloj).
 *   · `MarcoDelBis`       — el marco de la repetición, en pantalla: bandas de glifos arriba y abajo
 *                           (y a los lados desde N1) que laten dos veces igual.
 *   · `SiluetasDeGrafia`  — la IMPRESIÓN de un Celador (columna que cae y se compacta en su silueta en
 *                           1,2 s), el DESALOJO (el cuerpo se va desde los pies en glifos que suben),
 *                           la SALIDA por la cabina (lo mismo, en ámbar) y el HAZ ámbar de la cabina
 *                           que suena, que asoma por encima de los tejados y late con el timbre.
 *
 * Todas son la misma familia y el mismo programa (ver `materiales.ts`); cada una es su malla y su
 * llamada, y ninguna se pinta si no tiene nada vivo. Todo va en el reloj PRESENTADO: en el Remanso
 * la lluvia del cielo se frena con la de la calle, que es justo lo que la vende.
 *
 * ═══ QUIÉN PONE EL CUERPO ═══
 *
 * La silueta de glifos no es el personaje: el cuerpo lo pinta `personajes/`. Para que casen, las
 * líneas de tiempo son funciones puras de `cuentas.ts` (`impresionEn`, `desalojoEn`, `salidaEn`),
 * que dicen también cuánto se tiene que ver ya el cuerpo (`cuerpo`), en el mismo reloj.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import {
  ALTO_DEL_HAZ,
  ALTO_DEL_MURO_DEL_BIS,
  ALTURA_DE_LA_CAIDA,
  ANCHO_DEL_HAZ,
  COLORES,
  SILUETAS,
  bisEn,
  columnasDelCielo,
  componentesLineales,
  desalojoEn,
  impresionEn,
  salidaEn,
  timbreDeLaCabina,
} from './cuentas';
import { subirLasPrimeras } from './geometrias';
import type { MallaDeEfecto } from './malla';
import { mallaDeEfecto } from './malla';
import { ajuste } from './presupuesto';
import type { SistemaDeEfectos } from './sistema';
import { APAGADO_DEL_HAZ_MS, CLASES_DE_SILUETA } from './sistema';

/** Los atributos de un tapiz: ver `TAPICES_VERTICE` en `materiales.ts`. */
const ATRIBUTOS = { aBase: 4, aTamano: 4, aLluvia: 4, aColor: 4, aSilueta: 4, aMomento: 4 } as const;
type AtributoDeTapiz = keyof typeof ATRIBUTOS;
type Tapiz = MallaDeEfecto<AtributoDeTapiz>;

/** Los modos del sombreador. */
const DE_CARA = 0;
const FIJO = 1;
const EN_PANTALLA = 2;
const SILUETA = 3;

const CODIGO = componentesLineales(COLORES.codigo);
const AMBAR = componentesLineales(COLORES.ambar);
const BLANCO_VERDOSO = componentesLineales(0xc8ffe8);

/** Escribe cuatro números en la instancia `n` de un atributo de cuatro. */
function cuatro(a: THREE.InstancedBufferAttribute, n: number, x: number, y: number, z: number, w: number): void {
  const d = a.array as Float32Array;
  const k = n * 4;
  d[k] = x;
  d[k + 1] = y;
  d[k + 2] = z;
  d[k + 3] = w;
}

/** Sube las `n` primeras instancias de todos los atributos de un tapiz y deja `n` en el dibujo. */
function cerrar(t: Tapiz, n: number): void {
  t.pintar(n);
  if (n <= 0) return;
  const a = t.atributos;
  subirLasPrimeras(a.aBase, n);
  subirLasPrimeras(a.aTamano, n);
  subirLasPrimeras(a.aLluvia, n);
  subirLasPrimeras(a.aColor, n);
  subirLasPrimeras(a.aSilueta, n);
  subirLasPrimeras(a.aMomento, n);
}

function ponerElTiempo(t: Tapiz, segundos: number): void {
  (t.material.uniforms.uTiempo as { value: number }).value = segundos;
}

/* ─────────────────────────────── El cielo ─────────────────────────────── */

/**
 * Brillo de las columnas del cielo: tenues, que se lean como textura y no como letrero. Con 0,45 se
 * leían como letrero: van sin niebla (viven detrás de ella) y en la vista aérea, y en el alba sobre el
 * cielo claro, eran lluvia de código a toda pantalla. El diseño las pide «tenues, tras la niebla».
 */
const BRILLO_DEL_CIELO = 0.18;

export function CieloDeGrafia({ sistema, semilla = 1 }: { sistema: SistemaDeEfectos; semilla?: number }): JSX.Element {
  /* Sin niebla: viven detrás de ella y se ven a través, que es lo que pide el diseño. */
  const pieza = useMemo(() => mallaDeEfecto('cielo', ATRIBUTOS, { niebla: false }), []);
  useEffect(() => () => pieza.soltar(), [pieza]);
  /* Las columnas se escriben una vez para la capacidad entera; el nivel sólo dice cuántas se pintan. */
  useEffect(() => {
    const columnas = columnasDelCielo(pieza.capacidad, semilla);
    const a = pieza.atributos;
    columnas.forEach((c, n) => {
      cuatro(a.aBase, n, c.x, c.base, c.z, DE_CARA);
      cuatro(a.aTamano, n, c.ancho, c.alto, 0, 0);
      cuatro(a.aLluvia, n, 1, -c.velocidad, (n * 37 + semilla * 101) % 8192, 16);
      cuatro(a.aColor, n, CODIGO[0], CODIGO[1], CODIGO[2], BRILLO_DEL_CIELO * (0.6 + 0.4 * ((n * 7) % 5) / 4));
      cuatro(a.aSilueta, n, 0, 0, 0, 0);
      cuatro(a.aMomento, n, 0, 0, 0, -1);
    });
    cerrar(pieza, 0);
    for (const at of Object.values(pieza.atributos)) subirLasPrimeras(at, columnas.length);
  }, [pieza, semilla]);

  useFrame(() => {
    pieza.pintar(ajuste('columnasDelCielo', sistema.nivel));
    ponerElTiempo(pieza, sistema.segundos(sistema.ahora.presentado));
  });
  return <primitive object={pieza.malla} />;
}

/* ─────────────────────────────── Las pantallas ─────────────────────────────── */

export function PantallasDeGrafia({ sistema }: { sistema: SistemaDeEfectos }): JSX.Element {
  const pieza = useMemo(() => mallaDeEfecto('pantallas', ATRIBUTOS), []);
  useEffect(() => () => pieza.soltar(), [pieza]);
  const escrito = useRef({ version: -1, nivel: -1, n: 0 });

  useFrame(() => {
    const ps = sistema.pantallas;
    const e = escrito.current;
    if (ps.version !== e.version || sistema.nivel !== e.nivel) {
      const tope = ajuste('pantallas', sistema.nivel);
      const a = pieza.atributos;
      let n = 0;
      for (let i = 0; i < ps.capacidad && n < tope; i++) {
        if (ps.ranuras.viva[i] === 0) continue;
        const [r, g, b] = componentesLineales(ps.color[i] as number);
        cuatro(a.aBase, n, ps.x[i] as number, ps.y[i] as number, ps.z[i] as number, FIJO);
        cuatro(a.aTamano, n, ps.ancho[i] as number, ps.alto[i] as number, ps.orientacion[i] as number, 0);
        cuatro(a.aLluvia, n, ps.columnas[i] as number, ps.sube[i] === 1 ? -7 : 7, (i * 53 + 11) % 8192, 9);
        cuatro(a.aColor, n, r, g, b, 0.95);
        cuatro(a.aSilueta, n, 0, 0, 0, 0);
        cuatro(a.aMomento, n, 0, 0, 0, -1);
        n++;
      }
      cerrar(pieza, n);
      e.version = ps.version;
      e.nivel = sistema.nivel;
      e.n = n;
    }
    ponerElTiempo(pieza, sistema.segundos(sistema.ahora.presentado));
  });
  return <primitive object={pieza.malla} />;
}

/* ─────────────────────────────── El Bis ─────────────────────────────── */

export function MuroDelBis({ sistema }: { sistema: SistemaDeEfectos }): JSX.Element {
  /* Dos caras: el muro se ve desde dentro del círculo y desde fuera. */
  const pieza = useMemo(() => mallaDeEfecto('muro', ATRIBUTOS, { dosCaras: true }), []);
  useEffect(() => () => pieza.soltar(), [pieza]);
  const momento = useMemo(() => bisEn(0, 1), []);

  useFrame(() => {
    const b = sistema.bisEnCurso;
    const tp = sistema.ahora.presentado;
    ponerElTiempo(pieza, sistema.segundos(tp));
    if (b.inicio !== b.inicio) {
      pieza.pintar(0);
      return;
    }
    const m = bisEn(tp, b.inicio, momento);
    if (!m.viva) {
      pieza.pintar(0);
      return;
    }
    const paneles = ajuste('panelesDelMuro', sistema.nivel);
    const a = pieza.atributos;
    const ancho = ((2 * Math.PI * b.radio) / paneles) * 1.02;
    const repetido = sistema.segundos(m.tiempoRepetido);
    for (let n = 0; n < paneles; n++) {
      const angulo = (n / paneles) * Math.PI * 2;
      const x = b.x + Math.cos(angulo) * b.radio;
      const z = b.z + Math.sin(angulo) * b.radio;
      /* Mira hacia el centro: su cara es (sen θ, 0, cos θ) = −(cos α, 0, sen α). */
      const orientacion = Math.atan2(-Math.cos(angulo), -Math.sin(angulo));
      cuatro(a.aBase, n, x, 0, z, FIJO);
      cuatro(a.aTamano, n, ancho, ALTO_DEL_MURO_DEL_BIS, orientacion, 0.35 * m.muro);
      cuatro(a.aLluvia, n, 6, 11, (n * 29 + 5) % 8192, 7);
      /* Uno de cada cinco paños sale en blanco verdoso: el fallo se nota en la textura, no sólo en el color. */
      const c = n % 5 === 2 ? BLANCO_VERDOSO : CODIGO;
      cuatro(a.aColor, n, c[0], c[1], c[2], 0.9 * m.muro);
      cuatro(a.aSilueta, n, 0, 0, 0, 0);
      cuatro(a.aMomento, n, 0, 0, 0, repetido);
    }
    cerrar(pieza, paneles);
  });
  return <primitive object={pieza.malla} />;
}

export function MarcoDelBis({ sistema }: { sistema: SistemaDeEfectos }): JSX.Element {
  const pieza = useMemo(() => mallaDeEfecto('marco', ATRIBUTOS, { encima: true, niebla: false }), []);
  useEffect(() => () => pieza.soltar(), [pieza]);
  const momento = useMemo(() => bisEn(0, 1), []);

  useFrame((estado) => {
    const b = sistema.bisEnCurso;
    const tp = sistema.ahora.presentado;
    ponerElTiempo(pieza, sistema.segundos(tp));
    const resolucion = pieza.material.uniforms.uResolucion as { value: THREE.Vector2 };
    const densidad = estado.gl.getPixelRatio();
    resolucion.value.set(estado.size.width * densidad, estado.size.height * densidad);
    const m = b.inicio === b.inicio ? bisEn(tp, b.inicio, momento) : null;
    if (m === null || !m.viva || m.marco <= 0) {
      pieza.pintar(0);
      return;
    }
    const bandas = ajuste('bandasDelMarco', sistema.nivel);
    const a = pieza.atributos;
    const repetido = sistema.segundos(m.tiempoRepetido);
    const alto = 0.13;
    const lado = 0.05;
    /* Arriba y abajo: bandas anchas de glifos; a los lados, dos columnas finas. En NDC. */
    for (let n = 0; n < bandas; n++) {
      const banda = BANDAS[n] as readonly [number, number, number, number, number];
      const [x, y, w, h, columnas] = banda;
      cuatro(a.aBase, n, x, y === 1 ? 1 - alto : y, 0, EN_PANTALLA);
      cuatro(a.aTamano, n, w === 0 ? lado : w, h === 0 ? alto : h, 0, 0.2);
      cuatro(a.aLluvia, n, columnas, 18, n * 17 + 3, 5);
      cuatro(a.aColor, n, CODIGO[0], CODIGO[1], CODIGO[2], 1.1 * m.marco);
      cuatro(a.aSilueta, n, 0, 0, 0, 0);
      cuatro(a.aMomento, n, 0, 0, 0, repetido);
    }
    cerrar(pieza, bandas);
  });
  return <primitive object={pieza.malla} />;
}

/**
 * Las bandas del marco: [x, y, ancho, alto, columnas] en NDC. `y = 1` es «pegada arriba» (se le
 * resta el alto) y un ancho o alto de 0 es «el de la banda lateral»/«el de la banda de arriba».
 */
const BANDAS: readonly (readonly [number, number, number, number, number])[] = [
  [-1, 1, 2, 0, 64],
  [-1, -1, 2, 0, 64],
  [-1, -1, 0, 2, 2],
  [0.95, -1, 0, 2, 2],
];

/* ─────────────────────────────── Siluetas y haces ─────────────────────────────── */

export function SiluetasDeGrafia({ sistema }: { sistema: SistemaDeEfectos }): JSX.Element {
  const pieza = useMemo(() => mallaDeEfecto('siluetas', ATRIBUTOS), []);
  useEffect(() => () => pieza.soltar(), [pieza]);
  /* Los momentos que rellenan las líneas de tiempo: uno de cada, reutilizados. */
  const momentos = useMemo(() => ({ impresion: impresionEn(0, 1), desalojo: desalojoEn(0, 1), salida: salidaEn(0, 1) }), []);

  useFrame(() => {
    const tp = sistema.ahora.presentado;
    ponerElTiempo(pieza, sistema.segundos(tp));
    const a = pieza.atributos;
    const columnas = ajuste('columnasPorSilueta', sistema.nivel);
    let n = 0;

    const si = sistema.siluetas;
    for (let i = 0; i < si.ranuras.capacidad; i++) {
      if (si.ranuras.viva[i] === 0) continue;
      const clase = CLASES_DE_SILUETA[si.clase[i] as number];
      const s = SILUETAS[si.silueta[i] as number] ?? SILUETAS[0];
      if (s === undefined) continue;
      const inicio = si.inicio[i] as number;
      const semilla = (i * 61 + (si.ranuras.generacion[i] as number) * 7) % 8192;
      const x = si.x[i] as number;
      const y = si.y[i] as number;
      const z = si.z[i] as number;
      if (clase === 'impresion') {
        const m = impresionEn(tp, inicio, momentos.impresion);
        if (!m.viva) continue;
        cuatro(a.aBase, n, x, y, z, SILUETA);
        cuatro(a.aTamano, n, 1.5, ALTURA_DE_LA_CAIDA, 0, 0);
        cuatro(a.aLluvia, n, columnas, 14, semilla, 10);
        cuatro(a.aColor, n, CODIGO[0], CODIGO[1], CODIGO[2], 1.2 * m.glifos);
        cuatro(a.aMomento, n, m.compacto, ALTURA_DE_LA_CAIDA * (1 - m.caida), 0, -1);
      } else {
        let frente: number;
        let glifos: number;
        if (clase === 'desalojo') {
          const m = desalojoEn(tp, inicio, momentos.desalojo);
          if (!m.viva) continue;
          frente = m.erosion;
          glifos = m.glifos;
        } else {
          const m = salidaEn(tp, inicio, momentos.salida);
          if (!m.viva) continue;
          frente = m.disolucion;
          glifos = m.glifos;
        }
        const color = clase === 'desalojo' ? CODIGO : AMBAR;
        cuatro(a.aBase, n, x, y, z, SILUETA);
        cuatro(a.aTamano, n, 1.5, s.alto + 3.5, 0, 0);
        cuatro(a.aLluvia, n, columnas, clase === 'desalojo' ? -12 : -16, semilla, 9);
        cuatro(a.aColor, n, color[0], color[1], color[2], 1.2 * glifos);
        cuatro(a.aMomento, n, 1, frente * s.alto, 1, -1);
      }
      cuatro(a.aSilueta, n, s.alto, s.hombros, s.cadera, s.prenda);
      n++;
    }

    const hz = sistema.haces;
    for (let i = 0; i < hz.ranuras.capacidad; i++) {
      if (hz.ranuras.viva[i] === 0) continue;
      const apagado = hz.apagado[i] as number;
      const queda = apagado === apagado ? Math.max(0, 1 - (tp - apagado) / APAGADO_DEL_HAZ_MS) : 1;
      const timbre = timbreDeLaCabina(tp, hz.inicio[i] as number);
      cuatro(a.aBase, n, hz.x[i] as number, 0, hz.z[i] as number, DE_CARA);
      cuatro(a.aTamano, n, ANCHO_DEL_HAZ, ALTO_DEL_HAZ, 0, 0);
      cuatro(a.aLluvia, n, 5, -14, (i * 211 + 19) % 8192, 24);
      cuatro(a.aColor, n, AMBAR[0], AMBAR[1], AMBAR[2], (0.45 + 0.75 * timbre) * queda);
      cuatro(a.aSilueta, n, 0, 0, 0, 0);
      /* El núcleo late con el timbre; y el haz resiste la niebla: se tiene que ver a dos calles. */
      cuatro(a.aMomento, n, 0.5 + 0.5 * timbre, 0.85, 0, -1);
      n++;
    }
    cerrar(pieza, n);
  });
  return <primitive object={pieza.malla} />;
}
