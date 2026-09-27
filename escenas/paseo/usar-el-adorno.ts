/**
 * EL ADORNO QUE CHOCA, MONTADO POR TROZOS Y FUERA DEL FOTOGRAMA.
 *
 * ═══ POR QUÉ NO UN `useMemo` ═══
 *
 * Porque un `useMemo` lo monta en el render que baja a andar, y en ese render ya se paga la arena, la
 * marioneta y lo que estorba a la vista. El adorno del Burgo son unos 90 ms en el Hermes de escritorio
 * (ver `TrozoDelAdorno`, en `adorno-que-choca.ts`) y en un móvil el doble o el triple: un tirón justo al
 * echar a andar. Aquí cada juego da su trabajo en TROZOS y se hacen en tareas sueltas de como mucho
 * `PRESUPUESTO_POR_TAREA_MS`, con un `setTimeout` entre una y otra: el fotograma sigue pintándose
 * entre medias, y al terminar el adorno entra de una vez en la arena del paseo.
 *
 * ═══ MIENTRAS SE MONTA ═══
 *
 * La primera vez, `null`: se anda con la estructura sola unas décimas de segundo, que es como se
 * andaba antes del 27-sep-2026. Si al llegar el adorno quien anda está dentro de algo, sale andando
 * (`salirDelAdorno`, en `paseante.ts`). Y cuando el trabajo cambia —en Las Lindes, al poner una losa—
 * se sigue con el adorno de antes hasta tener el nuevo: el de antes sigue siendo verdad en todas las
 * losas menos en la nueva, y la nueva estaba vacía. Sin trabajo (mirando la mesa), `null`.
 */
import { useEffect, useState } from 'react';
import type { Cuerpo } from '../../shared/mecanicas/mundo';
import type { TrozoDelAdorno } from './adorno-que-choca';

/** Lo más que se trabaja seguido antes de soltar el hilo: un cuarto de fotograma a sesenta. */
export const PRESUPUESTO_POR_TAREA_MS = 4;

/** Lo que se lleva hecho: con qué trabajo se hizo y sus plantas. */
interface Hecho {
  readonly de: readonly TrozoDelAdorno[];
  readonly cuerpos: readonly Cuerpo[];
}

/**
 * EL ADORNO DE UN TRABAJO EN TROZOS, hecho de pocos en pocos. `trozos` tiene que ser el mismo objeto
 * mientras no cambie (un `useMemo` en la escena): cada objeto nuevo es un trabajo nuevo.
 */
export function usarElAdorno(trozos: readonly TrozoDelAdorno[] | null): readonly Cuerpo[] | null {
  const [hecho, setHecho] = useState<Hecho | null>(null);
  useEffect(() => {
    if (trozos === null) return undefined;
    let vivo = true;
    let siguiente: ReturnType<typeof setTimeout> | undefined;
    let i = 0;
    const acumulado: Cuerpo[] = [];
    const tarea = (): void => {
      siguiente = undefined;
      if (!vivo) return;
      const desde = Date.now();
      while (i < trozos.length && Date.now() - desde < PRESUPUESTO_POR_TAREA_MS) {
        for (const c of (trozos[i] as TrozoDelAdorno)()) acumulado.push(c);
        i++;
      }
      if (i < trozos.length) siguiente = setTimeout(tarea, 0);
      else setHecho({ de: trozos, cuerpos: acumulado });
    };
    siguiente = setTimeout(tarea, 0);
    return () => {
      vivo = false;
      if (siguiente !== undefined) clearTimeout(siguiente);
    };
  }, [trozos]);
  if (trozos === null) return null;
  return hecho?.cuerpos ?? null;
}
