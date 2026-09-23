/**
 * EL CARGADOR DEL RELOJ DE ARENA: `reloj.glb` una vez por `traer`, y si no llega, se dice.
 *
 * ═══ POR QUÉ VIVE AQUÍ Y NO EN `reloj.tsx` ═══
 *
 * Nació en `reloj.tsx` justo para dejar de copiarse —lo tenían el Burgo y Riberas, cada uno el
 * suyo, y Las Lindes iba a por la tercera copia— y aun así el Burgo se quedó con la suya,
 * `relojDelBurgoDe`: doce renglones iguales con su propio `WeakMap` y un aviso que prometía «se
 * pinta el de conos» cuando el reloj de conos ya no existía. Dos cachés contra el mismo `traer` son
 * dos descargas del mismo fichero, y un aviso que miente es peor que ninguno.
 *
 * Así que el cargador está aquí, en `comun/`, que es donde mira quien escribe una escena nueva, y
 * en un `.ts` sin JSX: lo puede importar cualquiera sin arrastrar un componente. `reloj.tsx` sigue
 * siendo el reloj —su asa, su montaje y su arena— y reexporta esto para quien lo buscara allí.
 *
 * ═══ LO QUE HACE, QUE ES LO QUE HACÍA ═══
 *
 * El `WeakMap` va contra el `traer` y no contra nada global: dos clientes distintos —el escritorio
 * y la app— tienen su propio `traer`, y así uno no se queda con el modelo del otro. Un fallo no se
 * queda en la caché: el siguiente que lo pida lo vuelve a intentar.
 *
 * Y si no llega, se DICE por consola y NUNCA por `alFallar`: el escritorio del Burgo manda la
 * partida entera al tablero dibujado con cualquier aviso de ésos, y un fichero de arte que no llega
 * no puede tirar una mesa. Sin el modelo, `RelojDeArena` pinta el asa y nada más —el botón de pasar
 * el turno sigue puesto—, y un respaldo mudo es un fallo que nadie ve: el aviso es lo único que
 * queda. `verify:burgo-escena` mira que aquí no se llame a ningún aviso de la escena.
 */
import type { AnimationClip, Object3D } from 'three';
import { abrirGlb } from '../embarcadero/cargar';
import type { Traer } from '../embarcadero/tipos';
import { rutaDelReloj } from '../ruta-de-modelos';

/** El `.glb` del reloj tal como llega: su escena y los clips que trae dentro. */
export interface RelojCargado {
  readonly escena: Object3D;
  readonly clips: readonly AnimationClip[];
}

const relojes = new WeakMap<Traer, Promise<RelojCargado | null>>();

/** Trae `reloj.glb` UNA vez por `traer`. `null` si no llegó, y entonces ya se ha dicho por consola. */
export function relojDe(traer: Traer): Promise<RelojCargado | null> {
  const hecho = relojes.get(traer);
  if (hecho !== undefined) return hecho;
  const promesa = traer(rutaDelReloj())
    .then((bytes) => abrirGlb(bytes))
    .then((gltf): RelojCargado => ({ escena: gltf.scene, clips: gltf.animations }))
    .catch((fallo: unknown): null => {
      relojes.delete(traer);
      console.warn(
        `El reloj de arena no ha llegado (${rutaDelReloj()}: ${fallo instanceof Error ? fallo.message : String(fallo)}): la mesa se queda sin él, pero el asa de pasar el turno sigue puesta.`,
      );
      return null;
    });
  relojes.set(traer, promesa);
  return promesa;
}
