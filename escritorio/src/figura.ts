/**
 * LA FIGURA DE ESTE NAVEGADOR: qué aventurero se lleva puesto al Muelle.
 *
 * ═══ SE GUARDA COMO EL BOLSILLO, Y POR LAS MISMAS RAZONES ═══
 *
 * El escritorio no tiene cuentas: no hay correo, no hay contraseña y no hay
 * `PUT /api/cuenta/figura` al que subir nada, así que la figura vive donde vive
 * la llave del asiento —`localStorage`— y sigue sus tres reglas
 * (`bolsillo.ts`): síncrono, para que el primer render ya sepa quién eres;
 * envuelto en `try`, porque `localStorage` LANZA en una ventana privada de
 * Safari y una figura que no se puede leer no puede costar la Sala entera; y
 * POR SILLA, porque dos ventanas del mismo navegador comparten el almacén y
 * quien prueba la mesa consigo mismo en dos sillas tiene que poder ser dos
 * aventureros distintos. Sin `?silla=` es el cajón de siempre.
 *
 * ═══ SE SORTEA UNA VEZ Y SE QUEDA ═══
 *
 * La primera vez que se abre el Muelle no hay nada guardado, y enseñar siempre
 * al mismo de serie haría que seis personas nuevas llegaran con seis
 * caballeros. Se sortea entre los seis de `figuras.ts` y se guarda EN EL ACTO,
 * para que recargar no vuelva a sortear: una figura que cambia sola entre dos
 * recargas se lee como un fallo, no como una sorpresa.
 *
 * ═══ LO QUE SE LEE SE COMPRUEBA ═══
 *
 * Lo guardado es una cadena que pudo escribir una versión anterior de este
 * cliente con otra lista, o una mano en las herramientas del navegador. Si no
 * es una figura que este binario sepa pintar, se trata como si no hubiera
 * nada: la misma regla que aplica la escena a una figura desconocida que llega
 * por el cable.
 */
import { esFigura, FIGURAS } from '../../escenas/embarcadero/figuras';
import type { FiguraId } from '../../escenas/embarcadero/figuras';

/** `escritorio.figura` y, si hay silla, `escritorio.figura#<silla>`. Mismo prefijo que el bolsillo. */
function llaveDeLaFigura(silla: string): string {
  return silla.length > 0 ? `escritorio.figura#${silla}` : 'escritorio.figura';
}

export function figuraGuardada(silla: string): FiguraId | null {
  let crudo: string | null = null;
  try {
    crudo = globalThis.localStorage?.getItem(llaveDeLaFigura(silla)) ?? null;
  } catch {
    return null;
  }
  return esFigura(crudo) ? crudo : null;
}

export function guardarFigura(silla: string, figura: FiguraId): void {
  try {
    globalThis.localStorage?.setItem(llaveDeLaFigura(silla), figura);
  } catch {
    /* Sin almacén se juega igual: lo que se pierde es la figura al recargar. */
  }
}

/**
 * La figura con la que se llega al Muelle: la guardada, o una sorteada y
 * guardada ahora mismo para que la próxima vez sea la misma.
 */
export function figuraDeEstreno(silla: string): FiguraId {
  const guardada = figuraGuardada(silla);
  if (guardada !== null) return guardada;
  const sorteada = FIGURAS[Math.floor(Math.random() * FIGURAS.length)] ?? FIGURAS[0];
  const figura = (sorteada as (typeof FIGURAS)[number]).id;
  guardarFigura(silla, figura);
  return figura;
}
