/**
 * LA AUTOPRUEBA DE LOS CAMINOS: lo que el comprobador de Node no puede ver, visto en una gráfica de
 * verdad y leído en píxeles, no a ojo.
 *
 * ═══ POR QUÉ EXISTE ═══
 *
 * El primer N3 del banco salía NEGRO. No había excepción en JS: WebGL rechazaba cada dibujo del uber
 * con «Feedback loop formed between Framebuffer and active Texture» (el uber escribía en el blanco
 * cuya profundidad leía) y lo decía sólo como aviso de la consola. Un comprobador en Node no tiene
 * gráfica, y mirar el banco a ojo con el panel del navegador escondido (que baja los fotogramas a
 * casi nada) no es fiable. Esto crea su PROPIO renderizador en un lienzo aparte, pinta con cada camino
 * una escena de prueba conocida y lee píxeles concretos con `readPixels`:
 *
 *   · sin errores de WebGL (`getError`) y sin fotograma negro, en los cuatro niveles;
 *   · la imagen SIGUE a la escena: se cambia el fondo y el píxel cambia (el primer N1 se quedaba
 *     congelado en su primer fotograma y sólo lo delataba un INVALID_VALUE; ver `compositor.ts`);
 *   · el Remanso oscurece la esquina en los cuatro (el velo en N0, la viñeta en N1-N3) y quita el
 *     70 % del color de un fondo saturado en N1-N3 (N0 no lee la imagen: no puede desaturar);
 *   · la capa nítida sale con el color que pide, también en pleno Remanso;
 *   · la cuenta de la escena y la del fotograma salen apuntadas, y con pases la total es mayor.
 *
 * Se lanza desde el banco (botón «autoprueba») o desde la consola del navegador con
 * `(await import('/sala/src/quiebro/posproceso/autoprueba.ts')).probarLosCaminos()`. No entra en la
 * batería porque necesita una gráfica; está para correrla en cada aparato del banco en aparato real.
 */
import * as THREE from 'three';
import type { NivelDeCalidad } from '../calidad/niveles';
import { NIVELES_DE_CALIDAD } from '../calidad/niveles';
import { sondearElAparato } from '../calidad/sondeo';
import { laCuentaDe } from '../calidad/medida';
import { CAPA_NITIDA, IMAGEN_DE_LA_NOCHE, crearElCompositor } from './compositor';

export interface ComprobacionDelCamino {
  readonly nivel: NivelDeCalidad;
  readonly que: string;
  readonly bien: boolean;
  readonly detalle: string;
}

type Pixel = readonly [number, number, number];

function saturacion([r, g, b]: Pixel): number {
  const mayor = Math.max(r, g, b);
  return mayor <= 0 ? 0 : (mayor - Math.min(r, g, b)) / mayor;
}

/** La croma (mayor − menor): mezclar un 70 % hacia la luma la deja exactamente en el 30 %. */
function croma([r, g, b]: Pixel): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function luma([r, g, b]: Pixel): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const ANCHO = 160;
const ALTO = 90;

/** Pinta la escena de prueba con cada nivel y comprueba lo que se lee. Devuelve una fila por comprobación. */
export function probarLosCaminos(): ComprobacionDelCamino[] {
  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(ANCHO, ALTO, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const gl = renderer.getContext();
  const capacidades = sondearElAparato(renderer);

  /* Un fondo magenta oscuro y saturado, y en el centro un cuadrado ámbar en la capa nítida. */
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0.35, 0.03, 0.2);
  const camara = new THREE.PerspectiveCamera(60, ANCHO / ALTO, 0.1, 50);
  /* Ámbar (1; 0,45; 0,05) lineal: en pantalla, (255, 180, 63). */
  const nitido = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.45, 0.05), fog: false }));
  nitido.position.set(0, 0, -1);
  nitido.layers.set(CAPA_NITIDA);
  escena.add(nitido);

  const leer = (x: number, y: number): Pixel => {
    const p = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p);
    return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0];
  };
  const filas: ComprobacionDelCamino[] = [];
  const apuntar = (nivel: NivelDeCalidad, que: string, bien: boolean, detalle: unknown): void => {
    filas.push({ nivel, que, bien, detalle: JSON.stringify(detalle) });
  };

  try {
    for (const nivel of NIVELES_DE_CALIDAD) {
      gl.getError();
      const compositor = crearElCompositor(renderer, nivel, capacidades);
      const lecturas: { esquina: Pixel; fondo: Pixel; centro: Pixel; error: number }[] = [];
      for (const remanso of [0, 1]) {
        compositor.pintar(escena, camara, {
          remanso,
          foco: 1,
          semilla: 7,
          capaNitida: true,
          ajustes: { ...IMAGEN_DE_LA_NOCHE, grano: 0, aberracion: 0 },
        });
        renderer.setRenderTarget(null);
        lecturas.push({
          esquina: leer(2, ALTO - 3),
          fondo: leer(Math.round(ANCHO * 0.25), Math.round(ALTO * 0.5)),
          centro: leer(ANCHO / 2, ALTO / 2),
          error: gl.getError(),
        });
      }
      const cuenta = laCuentaDe(renderer);
      /* Otro fondo, otro fotograma: el píxel del fondo tiene que cambiar (no se congela). */
      const fondoDeAntes: THREE.Scene['background'] = escena.background;
      escena.background = new THREE.Color(0.02, 0.25, 0.3);
      compositor.pintar(escena, camara, { remanso: 0, foco: 1, semilla: 8, capaNitida: true, ajustes: { ...IMAGEN_DE_LA_NOCHE, grano: 0, aberracion: 0 } });
      renderer.setRenderTarget(null);
      const otroFondo = leer(Math.round(ANCHO * 0.25), Math.round(ALTO * 0.5));
      const errorDelOtro = gl.getError();
      escena.background = fondoDeAntes;
      const [sin, con] = lecturas;
      compositor.liberar();
      if (sin === undefined || con === undefined) continue;

      apuntar(
        nivel,
        `${compositor.camino}: WebGL no protesta en ningún fotograma`,
        sin.error === gl.NO_ERROR && con.error === gl.NO_ERROR && errorDelOtro === gl.NO_ERROR,
        [sin.error, con.error, errorDelOtro],
      );
      apuntar(nivel, 'la imagen sigue a la escena: otro fondo, otro píxel (no se congela)', otroFondo[1] > otroFondo[0] + 20 && sin.fondo[0] > sin.fondo[1] + 20, {
        antes: sin.fondo,
        despues: otroFondo,
      });
      apuntar(nivel, 'el fotograma no sale negro', luma(sin.fondo) > 12 && luma(sin.centro) > 40, { fondo: sin.fondo, centro: sin.centro });
      apuntar(nivel, 'el Remanso oscurece la esquina', luma(con.esquina) < luma(sin.esquina) * 0.85, { sin: sin.esquina, con: con.esquina });
      if (nivel > 0) {
        apuntar(nivel, 'el Remanso quita el 70 % del color del fondo (la croma queda en el 30 %, ±5)', croma(con.fondo) <= croma(sin.fondo) * 0.35, {
          sin: sin.fondo,
          con: con.fondo,
        });
      }
      apuntar(
        nivel,
        'la capa nítida sale con su ámbar de pantalla (255, 180, 63 ±6) también en pleno Remanso',
        Math.abs(con.centro[0] - 255) <= 6 && Math.abs(con.centro[1] - 180) <= 6 && Math.abs(con.centro[2] - 63) <= 6 && saturacion(con.centro) > 0.7,
        con.centro,
      );
      apuntar(
        nivel,
        'la cuenta del fotograma está apuntada y los pases cuentan aparte de la escena',
        cuenta !== null && cuenta.llamadas > cuenta.llamadasDeLaEscena,
        cuenta,
      );
    }
  } finally {
    nitido.geometry.dispose();
    (nitido.material as THREE.Material).dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return filas;
}
