/**
 * LOS ANILLOS DEL ANUNCIO: la señal con la que se juega.
 *
 * ═══ QUÉ TIENE QUE CUMPLIR, POR ORDEN ═══
 *
 *   1. Cerrarse EXACTAMENTE en el instante del impacto que manda el servidor, ya traducido al reloj
 *      del aparato (`performance.now()`, diseño §4.3). Aquí el progreso se calcula en la CPU con
 *      doble precisión y el reloj VERDADERO —nunca el del Remanso—, con `progresoDelAnuncio`, que es
 *      la función que el comprobador prueba: vale 1 exacto en el primer fotograma cuyo `t` alcanza el
 *      impacto, y el radio es el final exacto.
 *   2. Decir de quién viene el golpe por el color Y por la forma (uno, dos o tres trazos).
 *   3. Leerse a 20 m: lejos, el anillo se agranda (`escalaDeLectura`) y el trazo no baja de dos
 *      píxeles (`grosorDeLectura`). El tiempo no cambia.
 *   4. Pintarse tenue si el golpe no es contra quien mira (diseño §3: con seis, los anillos ajenos
 *      en tenue), sin banda de glifos ni relleno.
 *
 * Y seguir al blanco: si el anillo va sobre un cuerpo, se pregunta al localizador del juego en cada
 * fotograma. Si el cuerpo ya no está, el anillo se queda donde lo vio por última vez.
 *
 * Todo lo que el sombreador recibe está calculado aquí; él sólo lo dibuja. Una malla, una llamada,
 * 24 anillos como mucho en todos los niveles (es señal de juego: `deJuego` en el presupuesto).
 */
import { useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  ALTO_DE_LOS_GLIFOS_DEL_ANILLO,
  ALTURA_DEL_ANILLO,
  AMENAZAS,
  COLOR_DE_LA_AMENAZA,
  OPACIDAD_TENUE,
  RADIO_FINAL_DEL_ANILLO,
  TRAS_EL_IMPACTO_MS,
  TRAZOS_DE_LA_AMENAZA,
  componentesLineales,
  escalaDeLectura,
  grosorDeLectura,
  progresoDelAnuncio,
  radioDelAnillo,
} from './cuentas';
import { subirLasPrimeras } from './geometrias';
import { mallaDeEfecto, pxPorMetroDeLaCamara } from './malla';
import type { SistemaDeEfectos } from './sistema';

/** Los colores de las amenazas ya en lineal, en el orden de `AMENAZAS`. Una vez, al cargar. */
const COLOR_LINEAL: readonly (readonly [number, number, number])[] = AMENAZAS.map((a) => componentesLineales(COLOR_DE_LA_AMENAZA[a]));
const TRAZOS: readonly number[] = AMENAZAS.map((a) => TRAZOS_DE_LA_AMENAZA[a]);

export function AnillosDelAnuncio({ sistema }: { sistema: SistemaDeEfectos }): JSX.Element {
  const pieza = useMemo(() => mallaDeEfecto('anillos', { aCentro: 4, aRadios: 4, aColor: 4, aEstado: 4, aExtra: 4 }), []);
  useEffect(() => () => pieza.soltar(), [pieza]);
  /* El punto que rellena el localizador: uno, reutilizado. */
  const sitio = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);

  useFrame((estado) => {
    const t = sistema.ahora.verdadero;
    const an = sistema.anillos;
    const pxm = pxPorMetroDeLaCamara(estado.camera, estado.size.height, estado.gl.getPixelRatio());
    const ojo = estado.camera.position;
    const { aCentro, aRadios, aColor, aEstado, aExtra } = pieza.atributos;
    const centro = aCentro.array as Float32Array;
    const radios = aRadios.array as Float32Array;
    const color = aColor.array as Float32Array;
    const est = aEstado.array as Float32Array;
    const extra = aExtra.array as Float32Array;
    let n = 0;
    for (let i = 0; i < an.ranuras.capacidad; i++) {
      if (an.ranuras.viva[i] === 0) continue;
      const quien = an.quien[i] as number;
      if (quien >= 0 && sistema.localizar !== null && sistema.localizar(quien, sitio)) {
        an.x[i] = sitio.x;
        an.y[i] = sitio.y;
        an.z[i] = sitio.z;
      }
      const x = an.x[i] as number;
      const y = (an.y[i] as number) + ALTURA_DEL_ANILLO;
      const z = an.z[i] as number;
      const dx = x - ojo.x;
      const dy = y - ojo.y;
      const dz = z - ojo.z;
      const distancia = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const inicio = an.inicio[i] as number;
      const impacto = an.impacto[i] as number;
      const p = progresoDelAnuncio(t, inicio, impacto);
      const escala = escalaDeLectura(distancia, pxm);
      const radio = radioDelAnillo(p) * escala;
      const radioFinal = RADIO_FINAL_DEL_ANILLO * escala;
      const grosor = grosorDeLectura(distancia, pxm, escala);
      const propio = an.propio[i] === 1;
      const amenaza = an.amenaza[i] as number;
      const trazos = TRAZOS[amenaza] ?? 1;
      const alto = propio ? ALTO_DE_LOS_GLIFOS_DEL_ANILLO * escala : 0;
      const remate = an.veredicto[i] as number;
      const edad = remate > 0 ? Math.min(1, Math.max(0, (t - (an.veredictoEn[i] as number)) / TRAS_EL_IMPACTO_MS)) : 0;
      const tras = remate === 0 && t > impacto ? Math.min(1, (t - impacto) / TRAS_EL_IMPACTO_MS) : 0;
      const fuera = radio + (trazos - 1) * grosor * 2.1 + grosor * 1.1 + alto;
      /* El cuadro tiene que cubrir la banda de glifos y el estallido del limpio (hasta 2,6 × 1,25 del final). */
      const medio = Math.max(fuera, remate === 1 ? radioFinal * 3.3 : 0) + grosor * 3;
      const [r, g, b] = COLOR_LINEAL[amenaza] ?? [1, 1, 1];

      const k = n * 4;
      centro[k] = x;
      centro[k + 1] = y;
      centro[k + 2] = z;
      centro[k + 3] = medio;
      radios[k] = radio;
      radios[k + 1] = radioFinal;
      radios[k + 2] = grosor;
      radios[k + 3] = alto;
      color[k] = r;
      color[k + 1] = g;
      color[k + 2] = b;
      color[k + 3] = propio ? 1 : OPACIDAD_TENUE;
      est[k] = p;
      est[k + 1] = trazos;
      est[k + 2] = remate;
      est[k + 3] = edad;
      /* La semilla por ranura y generación: el mismo anillo conserva sus glifos toda su vida. */
      extra[k] = ((an.ranuras.generacion[i] as number) * 31 + i) % 4096;
      extra[k + 1] = propio ? 1 : 0;
      extra[k + 2] = tras;
      extra[k + 3] = 0;
      n++;
    }
    pieza.pintar(n);
    if (n > 0) {
      subirLasPrimeras(aCentro, n);
      subirLasPrimeras(aRadios, n);
      subirLasPrimeras(aColor, n);
      subirLasPrimeras(aEstado, n);
      subirLasPrimeras(aExtra, n);
    }
    (pieza.material.uniforms.uTiempo as { value: number }).value = sistema.segundos(t);
  });

  return <primitive object={pieza.malla} />;
}
