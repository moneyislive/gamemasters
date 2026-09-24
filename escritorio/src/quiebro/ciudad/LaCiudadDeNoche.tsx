/**
 * `<LaCiudadDeNoche>`: TODO lo del frente de la ciudad en una pieza, para montarla en el lienzo del
 * juego con una línea: el barrio de la noche en tres dimensiones y su atmósfera (cielo, niebla de
 * altura, lluvia, luces).
 *
 * ═══ QUÉ PIDE Y QUÉ NO ═══
 *
 * Pide el `codigo` de la mesa y el número de `noche` (con eso deriva el barrio, igual que la sala), el
 * `nivel` de detalle del gobernador, y dos relojes: el del ADORNO (`reloj`, que el Remanso frena y
 * con él la lluvia, las ondas y los parpadeos) y el tic del barrio a 20 Hz (`tic`, el de la sala, con
 * el que pasa el tren a la vez en todos los aparatos). Sin ellos usa el del lienzo, que vale para un
 * banco y no para una partida.
 *
 * LA LUZ DEL BARRIO (madrugada de sodio o alba gris) sale de la hora de la noche que publica el barrio
 * (`atmosfera/luz-del-barrio.ts`): igual en todos los aparatos, sin tocar el barrio.
 *
 * No pone cámara, ni posproceso, ni mapeo tonal: son de otros frentes. Sí enciende las sombras del
 * renderizador en N2+ (las de la luz principal, ver `atmosfera/luz.ts`) y pone la niebla de altura a
 * todo lo que haya en la escena, también a los personajes y los efectos (ver `atmosfera/niebla.ts`).
 *
 * Lo que otros frentes pueden mover desde fuera, sin tocar esto (uniformes compartidos):
 *   · `UNIFORMES_DE_LA_CIUDAD.uRejillaDeGlifos` (0-1): el pico del Remanso, fachadas en su rejilla.
 *   · `UNIFORMES_DE_LA_CIUDAD.uVentanas` y `UNIFORMES_DEL_CIELO.uAmanecer`: el Amanecer.
 *   · `farolasEncendidas` (prop) y `UNIFORMES_DE_LA_CIUDAD.uFarolas`: la avería del Apagón.
 *   · `UNIFORMES_DE_LOS_HALOS.uHalos`: bajarlo cuando el compositor ya pone brillo (N1+).
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import type { JSX } from 'react';
import { Ciudad } from './Ciudad';
import type { CiudadConstruida } from './construir';
import { planoDelBarrio } from './plano';
import type { NivelDeLaCiudad } from './tipos';
import { Atmosfera } from '../atmosfera/Atmosfera';
import { luzForzada, luzQueManda, suscribirALaLuz } from '../atmosfera/luz-del-barrio';

export interface PropsDeLaCiudadDeNoche {
  readonly codigo: string;
  readonly noche: number;
  readonly nivel: NivelDeLaCiudad;
  /** El tiempo del adorno, en segundos. */
  readonly reloj?: () => number;
  /** El tic del barrio (20 Hz), el de la sala. */
  readonly tic?: () => number;
  /** 1 encendidas, 0 el Apagón. */
  readonly farolasEncendidas?: number;
  /** Avisa con la ciudad construida (el presupuesto y las cabezas de farola, por ejemplo). */
  readonly alConstruir?: (ciudad: CiudadConstruida) => void;
}

/**
 * SÓLO EN DESARROLLO: `?barrio=CODIGO` pinta el barrio de otra mesa (su noche 1). Es para comparar un
 * antes y un después desde la MISMA calle cuando la mesa del antes ya está llena o cerrada; la partida
 * sigue con su barrio, así que sólo sirve para mirar (con la cámara fija de la lupa), no para jugar.
 */
function barrioDeLaDireccion(): string | null {
  const env = import.meta.env as { readonly DEV?: boolean } | undefined;
  if (env?.DEV !== true || typeof location === 'undefined') return null;
  const b = new URLSearchParams(location.search).get('barrio');
  return b !== null && /^[A-Za-z0-9]{3,12}$/.test(b) ? b.toUpperCase() : null;
}
const BARRIO_FORZADO = barrioDeLaDireccion();

export function LaCiudadDeNoche({ codigo, noche, nivel, reloj, tic, farolasEncendidas = 1, alConstruir }: PropsDeLaCiudadDeNoche): JSX.Element {
  const plano = useMemo(
    () => (BARRIO_FORZADO !== null ? planoDelBarrio(BARRIO_FORZADO, 1) : planoDelBarrio(codigo, noche)),
    [codigo, noche],
  );
  /* La luz sale de la hora del barrio (igual en todos los aparatos), salvo que alguien la fuerce. */
  const forzada = useSyncExternalStore(suscribirALaLuz, luzForzada, () => null);
  const luz = useMemo(() => luzQueManda(plano.hora, forzada), [plano.hora, forzada]);
  const [ciudad, setCiudad] = useState<CiudadConstruida | null>(null);
  const alTener = useCallback(
    (c: CiudadConstruida) => {
      setCiudad(c);
      alConstruir?.(c);
    },
    [alConstruir],
  );
  return (
    <>
      <Ciudad plano={plano} nivel={nivel} reloj={reloj} tic={tic} alConstruir={alTener} />
      {ciudad !== null ? (
        <Atmosfera
          tiempo={plano.tiempo}
          nivel={nivel}
          farolas={ciudad.farolas}
          semilla={plano.semilla}
          reloj={reloj}
          farolasEncendidas={farolasEncendidas}
          luz={luz}
        />
      ) : null}
    </>
  );
}
