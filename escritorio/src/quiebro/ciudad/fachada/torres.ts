/**
 * LO QUE CORONA UN EDIFICIO ALTO: qué edificios llevan remate de torre (mástil, aguja, corona, góndola o
 * helipuerto) y cuál lleva un hito del §2.7 de `CIUDAD-ABIERTA.md` (la torre del reloj de la Glorieta, la
 * chimenea de las Naves, la cúpula de la Lonja). Son funciones puras del edificio: las consultarán la azotea
 * (O3-SILUETA, para no poner maquinaria donde va el remate o el hito), lo lejano y el vapor; hoy sólo las usa
 * `respiraderosDe`.
 *
 * `remateDeTorre` es el escritor del remate, y hoy no escribe nada: `fachadasPorPartes` lo llama en el volumen
 * más alto de todo edificio con `hayRemateDeTorre`, con relieve y sin él (también en la LOD1), para que quien
 * lo rellene no tenga que tocar a nadie más. Cuando escriba, que ceda por tramo.
 *
 * ═══ EL RELOJ, SÍ; LA CHIMENEA Y LA CÚPULA, TODAVÍA NO ═══
 *
 * La Glorieta del Relojero está en (0, 0) en las 32 trazas y con las ocho simetrías, así que el edificio del
 * reloj sale de la posición: el que cubre `PUNTO_DEL_RELOJ`, un metro dentro del solar que da a la Glorieta
 * por el norte y a 8 m del eje (el eje es el callejón en las manzanas que lo llevan). En las 32 trazas lo cubre
 * exactamente un edificio (tanteado con la mesa de `shared/`). Es lo que dice el plan mientras Miguel no
 * conteste si el reloj va en el centro de la Glorieta (pregunta 4).
 *
 * La chimenea de las Naves y la cúpula de la Lonja necesitan el DISTRITO del edificio, y `EdificioDelPlano` no
 * lo lleva (`plano.ts` no lo copia de la mesa). Hasta que lo lleve, `hitoDe` no los da nunca.
 */
import type { Molde } from '../geometria';
import type { EdificioDelPlano, Volumen } from '../tipos';
import type { HitoDeLaCiudad, ObraDeLaFachada } from './tipos-de-cara';

/** Desde qué altura (m) un edificio es una torre y lleva remate. */
export const ALTURA_DE_TORRE = 45;

/** El punto que cubre el edificio del reloj de la Glorieta (ver la cabecera). */
export const PUNTO_DEL_RELOJ: { readonly x: number; readonly z: number } = { x: -8, z: -31 };

/** La altura de un edificio: el techo de su volumen más alto. */
export function alturaDe(e: EdificioDelPlano): number {
  let alto = 0;
  for (const v of e.volumenes) alto = Math.max(alto, v.y1);
  return alto;
}

/** El índice del volumen más alto (con dos iguales, el último: los volúmenes van de abajo arriba). */
export function volumenMasAlto(e: EdificioDelPlano): number {
  let k = 0;
  e.volumenes.forEach((v, i) => {
    if (v.y1 >= (e.volumenes[k] as Volumen).y1) k = i;
  });
  return k;
}

/** El hito que lleva el edificio encima, o `null` (ver la cabecera). */
export function hitoDe(e: EdificioDelPlano): HitoDeLaCiudad | null {
  const h = e.huella;
  if (PUNTO_DEL_RELOJ.x > h.x0 && PUNTO_DEL_RELOJ.x < h.x1 && PUNTO_DEL_RELOJ.z > h.z0 && PUNTO_DEL_RELOJ.z < h.z1) return 'reloj';
  return null;
}

/** ¿Lleva remate de torre? Todo edificio de más de `ALTURA_DE_TORRE`, salvo el que lleve un hito: una cosa encima. */
export function hayRemateDeTorre(e: EdificioDelPlano): boolean {
  return alturaDe(e) > ALTURA_DE_TORRE && hitoDe(e) === null;
}

/** EL REMATE DE TORRE sobre el volumen `v` (el más alto). Hoy no escribe nada (ver la cabecera). */
export function* remateDeTorre(m: Molde, e: EdificioDelPlano, v: Volumen, obra: ObraDeLaFachada): Generator<void, void, void> {
  /* Todavía nada: se llama y no escribe. */
}
