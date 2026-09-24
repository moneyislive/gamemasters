/**
 * LA CUENTA DEL FOTOGRAMA: cuánto costó la ESCENA y cuánto el fotograma entero, contado con
 * `gl.info.render` por quien pinta y leído por quien gobierna.
 *
 * ═══ POR QUÉ HACE FALTA UN SITIO APARTE ═══
 *
 * `gl.info.render` se pone a cero en CADA `renderer.render()` (`info.autoReset`). Con un compositor,
 * un fotograma son muchas llamadas a `render` —la escena y luego un triángulo por pase— y lo que
 * queda en `info.render` al final es la cuenta del ÚLTIMO pase: una llamada y un triángulo. Un
 * gobernador que leyera eso vería una escena gratis; y el juez de la casa (`escenas/comun/arranque.ts`)
 * también, porque lee `info.render` en el `useFrame` siguiente.
 *
 * Así que quien pinta (`posproceso/Posproceso.tsx`) cuenta el fotograma entero con `autoReset`
 * apagado SÓLO mientras pinta, apunta aquí la cuenta de la escena (justo después de pintarla) y la
 * del total (al acabar), y deja en `info.render` el total: el que lea `info.render` en el fotograma
 * siguiente ve lo que de verdad costó, pases incluidos. El gobernador (`usar-el-nivel.ts`) lee de aquí
 * la de la escena, que es la que se compara con los topes de cada nivel (los topes son de contenido,
 * no de posproceso).
 *
 * Lo que otra pieza pinte FUERA de pantalla en su propio `useFrame` (un reflejo, una sombra a mano)
 * no entra en esta cuenta: corre antes de que el posproceso empiece a contar. Quien lo haga, que lo
 * declare en su renglón del presupuesto.
 *
 * Va por renderizador (un `WeakMap`), no en una variable del módulo: el escritorio puede tener dos
 * lienzos vivos a la vez (el vestíbulo y la mesa) y cada uno cuenta lo suyo.
 */
import type { WebGLRenderer } from 'three';

export interface CuentaDelFotograma {
  /** Llamadas y triángulos de la escena sola (sin los pases de posproceso). */
  readonly llamadasDeLaEscena: number;
  readonly triangulosDeLaEscena: number;
  /** Llamadas y triángulos del fotograma entero. */
  readonly llamadas: number;
  readonly triangulos: number;
  /** El número de fotograma de `info.render.frame` cuando se apuntó: para saber si es de hoy. */
  readonly fotograma: number;
}

const CUENTAS = new WeakMap<WebGLRenderer, CuentaDelFotograma>();

export function apuntarLaCuenta(renderer: WebGLRenderer, cuenta: CuentaDelFotograma): void {
  CUENTAS.set(renderer, cuenta);
}

/** La última cuenta apuntada para este renderizador, o null si nadie con posproceso ha pintado aún. */
export function laCuentaDe(renderer: WebGLRenderer): CuentaDelFotograma | null {
  return CUENTAS.get(renderer) ?? null;
}
