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
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import { camaraDeLaLupa } from '../posproceso/lupa';
import { Ciudad } from './Ciudad';
import type { CiudadConstruida } from './construir';
import { planoDelBarrio } from './plano';
import type { NivelDeLaCiudad } from './tipos';
import { Atmosfera } from '../atmosfera/Atmosfera';
import { CiudadAbierta } from './CiudadAbierta';
import type { CiudadAbiertaConstruida } from './abierta';
import { ciudadParaPintar } from './abierta';
import { UNIFORMES_DE_LA_CIUDAD } from './retoques';
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
  /**
   * LA CIUDAD ABIERTA (`docs/quiebro/CIUDAD-ABIERTA.md`): con `traza` (0-31, la de la vista de la mesa) se
   * pinta la ciudad de 540 m de esa traza y del código, con la ventana de celdas (`abierta.ts`), en vez del
   * barrio de la noche. Sin ella, el barrio de siempre: el juego pasa a la ciudad cuando la vista traiga su
   * traza (ola B), sin tocar nada más aquí.
   */
  readonly traza?: number;
  /** Las plazas de los Fallos de la noche (la primera, la de la Bajada), como en la vista. */
  readonly fallos?: readonly number[];
  /** «Plazas despejadas» (la Memoria del Sistema). */
  readonly despejadas?: boolean;
  /** Avisa con la ciudad abierta construida (el banco mira su ventana y su luz). */
  readonly alConstruirLaAbierta?: (ciudad: CiudadAbiertaConstruida) => void;
  /** Monta la ventana de la ciudad abierta de un tirón alrededor de este punto (el banco). */
  readonly montarYa?: { readonly x: number; readonly z: number };
  /** `false`: sin lluvia ni salpicaduras (el banco, para fotos sin el ruido de las gotas). Por omisión, llueve. */
  readonly lluvia?: boolean;
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

/**
 * SÓLO EN DESARROLLO: `?abierta=N` (la traza, 0-31) pinta la ciudad abierta de esa traza aunque la vista de la
 * mesa aún no traiga la suya, y `&fallos=1,4,6` sus Fallos (números de plaza, el primero la Bajada). Es para
 * mirar y medir la ciudad DENTRO DEL JUEGO —con el posproceso, los efectos y la atmósfera de verdad— mientras
 * la sala siga en el barrio: lo pintado no es lo que se choca, así que sirve con la cámara fija de la lupa y
 * no para jugar. No se llama `traza` porque el banco de la ciudad abierta ya usa ese nombre para lo suyo. En
 * el empaquetado no existe.
 */
function trazaDeLaDireccion(): { readonly traza: number; readonly fallos: readonly number[] } | null {
  const env = import.meta.env as { readonly DEV?: boolean } | undefined;
  if (env?.DEV !== true || typeof location === 'undefined') return null;
  const p = new URLSearchParams(location.search);
  const t = p.get('abierta');
  if (t === null || !/^\d{1,2}$/.test(t) || Number(t) > 31) return null;
  const f = p.get('fallos');
  const fallos = f !== null && /^[1-6](,[1-6]){0,4}$/.test(f) ? f.split(',').map(Number) : [];
  return { traza: Number(t), fallos: fallos.filter((n, k) => fallos.indexOf(n) === k) };
}
const TRAZA_FORZADA = trazaDeLaDireccion();

export function LaCiudadDeNoche(props: PropsDeLaCiudadDeNoche): JSX.Element {
  const traza = TRAZA_FORZADA?.traza ?? props.traza;
  const fallos = TRAZA_FORZADA !== null ? TRAZA_FORZADA.fallos : props.fallos;
  return (
    <>
      {LUPA_ANTES_DE_LA_CIUDAD ? <LaLupaAntesDeLaCiudad /> : null}
      {traza === undefined ? <ElBarrioDeNoche {...props} /> : <LaCiudadAbiertaDeNoche {...props} traza={traza} fallos={fallos ?? SIN_FALLOS} />}
    </>
  );
}

/*
 * SÓLO EN DESARROLLO: LA CÁMARA FIJA DE LA LUPA, ANTES DE LA CIUDAD. La lupa del frente de imagen
 * (`posproceso/lupa.ts`) pone su cámara fija justo antes de pintar, en el `useFrame` del posproceso (prioridad
 * 1), y para entonces la ciudad (0), la atmósfera y los efectos ya han leído la cámara del juego. Con el
 * barrio daba casi igual; con la ciudad abierta, la ventana de celdas, la luz por losetas, las luces de verdad
 * y la sombra se quedaban donde está el jugador mientras la lupa miraba otra calle, y lo que se medía no era
 * cruzar la ciudad. Aquí se pone la misma cámara fija detrás de la del juego (−2) y antes que nadie más, y la
 * del posproceso la vuelve a poner igual. Sin cámara fija no se toca nada: el encuadre de cine de la lupa se
 * aplica una sola vez, en su sitio.
 */
const LUPA_ANTES_DE_LA_CIUDAD = (import.meta.env as { readonly DEV?: boolean } | undefined)?.DEV === true;

function LaLupaAntesDeLaCiudad(): null {
  useFrame((estado) => {
    const fija = (window as unknown as { __quiebroImagen?: { camaraFija?: unknown } }).__quiebroImagen?.camaraFija;
    if (fija !== null && fija !== undefined) camaraDeLaLupa(estado.camera);
  }, -1.5);
  return null;
}

/** Sin llamar dos veces: la lista de los Fallos es la misma aunque la vista traiga otro arreglo igual. */
const SIN_FALLOS: readonly number[] = [];

/** LA CIUDAD ABIERTA de la noche, con su atmósfera: la luz sale de la hora de la noche de la ciudad. */
function LaCiudadAbiertaDeNoche({
  codigo,
  noche,
  nivel,
  reloj,
  tic,
  farolasEncendidas = 1,
  traza,
  fallos = SIN_FALLOS,
  despejadas = false,
  alConstruirLaAbierta,
  montarYa,
  lluvia = true,
}: PropsDeLaCiudadDeNoche & { readonly traza: number }): JSX.Element {
  const claveDeFallos = fallos.join(',');
  const fuente = useMemo(
    () => ciudadParaPintar(traza, codigo, noche, fallos, despejadas),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [traza, codigo, noche, claveDeFallos, despejadas],
  );
  const hora = `${String(fuente.noche.hora.h)}:${fuente.noche.hora.m < 10 ? '0' : ''}${String(fuente.noche.hora.m)}`;
  const forzada = useSyncExternalStore(suscribirALaLuz, luzForzada, () => null);
  const luz = useMemo(() => luzQueManda(hora, forzada), [hora, forzada]);
  const [ciudad, setCiudad] = useState<CiudadAbiertaConstruida | null>(null);
  const alTener = useCallback(
    (c: CiudadAbiertaConstruida) => {
      setCiudad(c);
      alConstruirLaAbierta?.(c);
    },
    [alConstruirLaAbierta],
  );
  /* El Apagón llega también a la luz horneada, a las tarjetas y a los halos (el uniforme es de todos). */
  useEffect(() => {
    UNIFORMES_DE_LA_CIUDAD.uFarolas.value = farolasEncendidas;
  }, [farolasEncendidas]);
  return (
    <>
      <CiudadAbierta fuente={fuente} nivel={nivel} reloj={reloj} tic={tic} montarYa={montarYa} alConstruir={alTener} />
      {ciudad !== null ? (
        <Atmosfera
          tiempo={ciudad.tiempo}
          nivel={nivel}
          farolas={ciudad.farolas}
          semilla={ciudad.semilla}
          reloj={reloj}
          farolasEncendidas={farolasEncendidas}
          luz={luz}
          lluvia={lluvia}
        />
      ) : null}
    </>
  );
}

/** EL BARRIO de la noche (el de hoy), con su atmósfera. */
function ElBarrioDeNoche({ codigo, noche, nivel, reloj, tic, farolasEncendidas = 1, alConstruir, lluvia = true }: PropsDeLaCiudadDeNoche): JSX.Element {
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
          lluvia={lluvia}
        />
      ) : null}
    </>
  );
}
