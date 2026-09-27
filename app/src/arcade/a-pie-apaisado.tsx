/**
 * A PIE, EL TELÉFONO DE LADO: el gancho común de las tres pantallas que se andan —El Burgo, Riberas y
 * Las Lindes (`*-en-tres-escena.tsx`)—. En la app nativa; en el navegador (`/jugar`) Metro elige
 * `a-pie-apaisado.web.tsx`.
 *
 * ═══ POR QUÉ (27-sep-2026) ═══
 *
 * Miguel, en la app: «aparecen los controles pero no se pone en horizontal la pantalla, por tanto no
 * se puede jugar bien». De pie, la palanca, «Correr» y «Golpear» se comen el tercio de abajo y la calle
 * se ve por una rendija. Al bajar a andar («Al hombro», «Sus ojos») la pantalla se BLOQUEA EN
 * HORIZONTAL con `expo-screen-orientation`, y al volver a «La mesa» se devuelve.
 *
 * ═══ CÓMO, Y POR QUÉ ASÍ: LO MISMO QUE LA NOCHE DE EL QUIEBRO ═══
 *
 * `app.json` dice `"orientation": "default"` para que una pantalla pueda ponerse de lado, y
 * `app/app/_layout.tsx` bloquea en vertical al arrancar. Así que, como `usarLaNocheApaisada`
 * (`quiebro-en-tres-escena.tsx`): se apunta el bloqueo de ANTES, se bloquea en `LANDSCAPE` —cualquiera
 * de los dos lados, el sensor elige— y al salir se vuelve al de antes si era uno de verdad, o a
 * `PORTRAIT_UP` si no había ninguno. Nunca «suelto»: soltar dejaría la app girando con el sensor al
 * volver a la mesa. Todo con `catch`: un bloqueo que falla no puede costar la partida.
 *
 * No hace falta módulo nativo nuevo: `expo-screen-orientation` ya va en el binario (lo usa El Quiebro).
 * Devuelve lo que hay que pintar encima: en la app nativa, nada —el teléfono gira solo—.
 */
import { useEffect } from 'react';
import type { JSX } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

/** El bloqueo al volver a la mesa: el de antes si era uno de verdad; si no, vertical. */
export function bloqueoAlVolverALaMesa(antes: ScreenOrientation.OrientationLock | null): ScreenOrientation.OrientationLock {
  const libre =
    antes === null ||
    antes === ScreenOrientation.OrientationLock.DEFAULT ||
    antes === ScreenOrientation.OrientationLock.ALL ||
    antes === ScreenOrientation.OrientationLock.UNKNOWN ||
    antes === ScreenOrientation.OrientationLock.OTHER ||
    /* Si «antes» ya era de lado —se bajó dos veces seguidas—, al volver a la mesa se va a vertical igual. */
    antes === ScreenOrientation.OrientationLock.LANDSCAPE;
  return libre ? ScreenOrientation.OrientationLock.PORTRAIT_UP : antes;
}

/** A pie, de lado; en la mesa, como estaba. Una línea en cada pantalla que se anda. */
export function usarAPieApaisado(aPie: boolean): JSX.Element | null {
  useEffect(() => {
    if (!aPie) return undefined;
    let viva = true;
    let antes: ScreenOrientation.OrientationLock | null = null;
    void (async () => {
      try {
        antes = await ScreenOrientation.getOrientationLockAsync();
      } catch {
        antes = null;
      }
      if (!viva) return;
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => undefined);
    })();
    return () => {
      viva = false;
      void ScreenOrientation.lockAsync(bloqueoAlVolverALaMesa(antes)).catch(() => undefined);
    };
  }, [aPie]);
  return null;
}
