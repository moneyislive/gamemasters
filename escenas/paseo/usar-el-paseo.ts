/**
 * EL PASEO MONTADO SOBRE UNA ESCENA: el gancho que pone a andar a quien pasea.
 *
 * ═══ LO QUE UN JUEGO TIENE QUE DAR, Y NADA MÁS ═══
 *
 * Su MUNDO declarado (`shared/mecanicas/mundo.ts`), dónde se nace, desde dónde se mira —mesa,
 * hombro u ojos—, la palanca si la hay, y a qué altura está su suelo en cada punto. Con eso
 * anda: el paso, los choques, el borde, las cámaras de a pie y la marioneta son de aquí y no del
 * juego. Es el patrón que esta casa ya tiene dos veces —el juego DECLARA, el motor CONSUME— y lo
 * que hace que el segundo juego que se ande no reescriba el paseo (TABLERO-RECORRIBLE §4).
 *
 * ═══ QUÉ HACE CADA FOTOGRAMA, Y EN QUÉ ORDEN ═══
 *
 *  1. La arena sale del mundo UNA vez por mundo, con `useMemo`: en Las Lindes el mundo cambia al
 *     poner una losa, no a cada fotograma, y derivarla sesenta veces por segundo sería rehacer
 *     el índice de cajones de tres mil cuerpos para no cambiar nada.
 *  2. Se suman las dos manos: el teclado, que se lee aquí si hay `document`, y los mandos de
 *     fuera, que la app escribe en una referencia.
 *  3. Se dan los tics que caben (`paseante.ts`), con el paso de `shared/`.
 *  4. Se pinta: la pose entre los dos últimos tics, a la altura del suelo que da la escena, y la
 *     cámara de hombro o de ojos detrás.
 *
 * ═══ CORRE ANTES QUE NADIE, Y POR ESO LLEVA PRIORIDAD −1 ═══
 *
 * Los `useFrame` de igual prioridad corren en el orden en que se apuntaron, y ese orden depende
 * de quién se montó antes: la marioneta, la mano y el reloj leen la pose y la cámara que esto
 * escribe, y según cómo se hubiera montado cada uno leerían las de este fotograma o las del
 * anterior. Con prioridad negativa esto corre primero siempre. Y r3f sigue pintando solo: sólo
 * una prioridad POSITIVA le quita el pintado (`internal.priority`, en `events-*.js`).
 *
 * ═══ EN LA MESA NO HACE NADA, PERO NO SE OLVIDA DE DÓNDE ESTABAS ═══
 *
 * El gancho se queda montado aunque se mire la mesa: se sube a mirar el tablero y al bajar se
 * sigue donde se estaba. Se nace una sola vez, la primera que se baja, y a partir de ahí el
 * mundo puede cambiar debajo —`mudarDeMundo` aparta a quien se quede dentro de algo— pero no se
 * vuelve a nacer.
 *
 * ═══ LA ALTURA NO DECIDE NADA ═══
 *
 * Dónde se puede estar lo contesta la arena, que es plana. `alturaEn` sólo dice a qué altura se
 * pinta, y se alcanza en un par de fotogramas en vez de copiarse: pasar del prado a la senda son
 * 1,2 unidades de escalón, y una cámara de ojos que bajase eso de golpe daría un respingo.
 *
 * La cámara se apoya en esa misma altura salvo que el juego diga otra (`alturaDeLaCamaraEn`):
 * Las Lindes cuelga la losa de la mano y el reloj delante de la cámara, y no puede dejar que baje
 * a la senda con los pies. Su porqué y su medida están en `alturaDeLaCamara`, en su `paseo.ts`.
 *
 * ═══ LA COSTURA CON LA RED ═══
 *
 * Las dos puntas de `paseante.ts`, sacadas afuera: `alDarUnTic` se llama con lo pedido en cada
 * tic y el sitio donde acabó, y `corregir` pone a quien pasea donde diga quien sabe más. Las usa
 * el canal de Boots on Board (`canal-de-botas.ts`, montado con `usar-el-canal.ts`).
 *
 * `corregir` hace dos cosas más que poner el sitio, y las dos las pidió el canal:
 *
 *  · SI TODAVÍA NO SE HA NACIDO, SE NACE AHÍ. El canal se abre en un efecto y el paseo nace en el
 *    primer fotograma a pie con mundo, y nada ordena las dos cosas: si el `dentro` llega antes, no
 *    había nadie a quien poner, se nacía donde dice el mundo y el primer tic salía de otro sitio,
 *    que el servidor devolvería con un `corrige`. Ahora el sitio se guarda y se nace en él.
 *  · SI AHÍ NO SE CABE, SE APARTA AL SITIO LIBRE MÁS CERCANO (`mudarDeMundo`). El servidor valida
 *    contra la ESTRUCTURA del mundo y el aparato anda con estructura y ADORNO: un sitio bueno para
 *    el servidor puede caer dentro de un barril de aquí, y desde dentro de una caja el paso no deja
 *    salir. En Las Lindes no pasa —su reparto entero es estructura—; en el Burgo y en Riberas sí.
 *
 * ═══ Y LA CÁMARA DE HOMBRO NO ATRAVIESA ═══
 *
 * Cada fotograma se mira hasta dónde cabe detrás de quien pasea (`hastaDondeCabeElHombro`) y la
 * cámara se acerca o se aleja hacia eso sin saltar (`acercarElHombro`). El porqué y los números
 * están en `camaras.ts`.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { aNumero, deNumero } from '../../shared/mecanicas/fijo';
import { arenaDe } from '../../shared/mecanicas/mundo';
import type { Andante, Arena, MundoDeclarado, Sitio } from '../../shared/mecanicas/mundo';
import { acercarElHombro, camaraDeHombro, camaraDeOjos, hastaDondeCabeElHombro } from './camaras';
import { mandosDelFotograma, SIN_MANDOS_DE_FUERA, SIN_TECLAS, teclaDelPaseo } from './mandos';
import type { EntradaDelTic, MandosDeFuera, Teclas } from './mandos';
import { corregirElPaseo, fotogramaDelPaseo, mudarDeMundo, nacerEnElPaseo, poseDelPaseo } from './paseante';
import type { EstadoDelPaseo, Paseante } from './paseante';

/** Desde dónde se mira. En la mesa no se anda. */
export type ModoDelPaseo = 'mesa' | 'hombro' | 'ojos';

/** Quien pasea como se pinta, con la altura del suelo que pisa. */
export interface PaseoPintado extends Paseante {
  readonly y: number;
}

/** Antes de nacer: en el origen, quieto. No se pinta a nadie mientras tanto. */
const SIN_NACER: PaseoPintado = { x: 0, y: 0, z: 0, rumbo: 0, velocidad: 0, andado: 0 };

/**
 * LO DEPRISA QUE LA ALTURA PINTADA ALCANZA LA DEL SUELO, por segundo.
 *
 * Catorce es casi del todo en un quinto de segundo: se nota que se baja un escalón y no se nota
 * que tarda.
 */
const LO_QUE_SE_ASIENTA = 14;

export interface OpcionesDelPaseo {
  /**
   * Lo que el juego declara. Su arena se deriva una vez por mundo. `null` mientras no se anda,
   * para que un juego cuyo mundo cuesta derivarlo no lo pague mirando la mesa: sin mundo no se
   * da ni un tic, y al volver con otro se sigue donde se estaba (`mudarDeMundo`).
   */
  readonly mundo: MundoDeclarado | null;
  /** Dónde se nace la primera vez que se baja a andar; `null` si todavía no hay dónde. */
  readonly nace: Sitio | null;
  /** Desde dónde se mira. En la mesa no se anda ni se toca la cámara. */
  readonly modo: ModoDelPaseo;
  /** La palanca y el botón de correr de la app. El teclado se lee aquí dentro. */
  readonly mandos?: { readonly current: MandosDeFuera };
  /** A qué altura está el suelo de la escena en un punto. Sólo para pintar. */
  readonly alturaEn: (x: number, z: number) => number;
  /** Y en cuál se apoya la cámara de a pie, si no es la misma. Si no se da, la del suelo. */
  readonly alturaDeLaCamaraEn?: (x: number, z: number) => number;
  /** La costura (a) con la red: lo pedido en cada tic y dónde se acabó. */
  readonly alDarUnTic?: (entrada: EntradaDelTic, sitio: Andante) => void;
}

export interface ElPaseo {
  /** Quien pasea, como se pinta en este fotograma. La escribe el paseo antes que nadie. */
  readonly pose: { readonly current: PaseoPintado };
  /**
   * La costura (b) con la red: poner a quien pasea en un sitio, en Q16.16. Antes de nacer, se
   * nacerá ahí; donde no se quepa, en el sitio libre más cercano. Ver la cabecera.
   */
  readonly corregir: (sitio: Andante) => void;
}

/** Una altura pintada que alcanza la de verdad poco a poco: la primera vez, de golpe. */
function asentar(pintada: { current: number | null }, deVerdad: number, cuanto: number): number {
  const antes = pintada.current;
  const y = antes === null ? deVerdad : antes + (deVerdad - antes) * cuanto;
  pintada.current = y;
  return y;
}

export function usarElPaseo(o: OpcionesDelPaseo): ElPaseo {
  const aPie = o.modo !== 'mesa';
  const arena = useMemo(() => (o.mundo === null ? null : arenaDe(o.mundo)), [o.mundo]);
  const estado = useRef<{ readonly arena: Arena; readonly paseo: EstadoDelPaseo } | null>(null);
  const teclas = useRef<Teclas>(SIN_TECLAS);
  const pose = useRef<PaseoPintado>(SIN_NACER);
  const alturaDeLosPies = useRef<number | null>(null);
  const alturaDeLaCamara = useRef<number | null>(null);
  /* Cuánto se queda detrás la cámara de hombro: `null` fuera del hombro, y al volver se pone de golpe. */
  const atrasDelHombro = useRef<number | null>(null);
  /* Un sitio que dijo la red antes de que hubiera nacido nadie: se nace ahí. */
  const pendiente = useRef<Andante | null>(null);
  const camera = useThree((s) => s.camera);

  /*
   * LAS TECLAS, sólo mientras se anda y sólo donde hay `document`: en iOS y en Android no lo hay,
   * y ahí mandan los mandos de fuera. Al perder la ventana se sueltan todas: una tecla que se
   * suelta con el foco en otra parte no llega nunca, y quien pasea se iría andando solo.
   */
  useEffect(() => {
    if (!aPie || typeof document === 'undefined') return;
    const cambia = (e: KeyboardEvent, pulsada: boolean): void => {
      const mando = teclaDelPaseo(e.key);
      if (mando === null) return;
      e.preventDefault();
      teclas.current = { ...teclas.current, [mando]: pulsada };
    };
    const abajo = (e: KeyboardEvent): void => cambia(e, true);
    const arriba = (e: KeyboardEvent): void => cambia(e, false);
    const soltarTodo = (): void => {
      teclas.current = SIN_TECLAS;
    };
    document.addEventListener('keydown', abajo);
    document.addEventListener('keyup', arriba);
    const ventana = typeof window !== 'undefined' && typeof window.addEventListener === 'function' ? window : null;
    ventana?.addEventListener('blur', soltarTodo);
    return () => {
      document.removeEventListener('keydown', abajo);
      document.removeEventListener('keyup', arriba);
      ventana?.removeEventListener('blur', soltarTodo);
      teclas.current = SIN_TECLAS;
    };
  }, [aPie]);

  useFrame((_, dt) => {
    if (!aPie || arena === null) {
      atrasDelHombro.current = null;
      return;
    }

    /* ── Nacer la primera vez, o seguir donde se estaba si el mundo ha cambiado ── */
    let actual = estado.current;
    if (actual === null) {
      /* Si la red ya dijo dónde, se nace ahí, mirando a donde declara el mundo si lo declara. */
      const dicho = pendiente.current;
      const nace: Sitio | null =
        o.nace ?? (dicho === null ? null : { x: aNumero(dicho.x), z: aNumero(dicho.z), rumbo: 0 });
      if (nace === null) return;
      const nacido = nacerEnElPaseo(arena, nace);
      if (dicho === null && (nacido.ahora.x !== deNumero(nace.x) || nacido.ahora.z !== deNumero(nace.z))) {
        /* Un respaldo mudo es un fallo que nadie ve: el mundo declaró un sitio donde no se cabe. */
        console.warn(
          `El mundo declara nacer en (${nace.x.toFixed(1)}, ${nace.z.toFixed(1)}) y ahí no se cabe: se nace en el sitio libre más cercano.`,
        );
      }
      pendiente.current = null;
      actual = { arena, paseo: dicho === null ? nacido : mudarDeMundo(arena, corregirElPaseo(nacido, dicho)) };
    } else if (actual.arena !== arena) {
      actual = { arena, paseo: mudarDeMundo(arena, actual.paseo) };
    }

    /* ── Los tics ─────────────────────────────────────────────────────────── */
    const mandos = mandosDelFotograma(teclas.current, o.mandos?.current ?? SIN_MANDOS_DE_FUERA);
    const paseo = fotogramaDelPaseo(arena, actual.paseo, dt, mandos, o.alDarUnTic);
    estado.current = { arena, paseo };

    /* ── Lo que se pinta ──────────────────────────────────────────────────── */
    const p = poseDelPaseo(paseo);
    const cuanto = Number.isFinite(dt) && dt > 0 ? Math.min(1, dt * LO_QUE_SE_ASIENTA) : 0;
    const y = asentar(alturaDeLosPies, o.alturaEn(p.x, p.z), cuanto);
    pose.current = { ...p, y };

    const suelo = asentar(alturaDeLaCamara, (o.alturaDeLaCamaraEn ?? o.alturaEn)(p.x, p.z), cuanto);
    /*
     * La de hombro, hasta donde quepa detrás: sin meterse en la pared que se tiene a la espalda ni
     * salirse del suelo. Se mira desde el sitio PINTADO, que es donde está la figura que se sigue.
     */
    let atras: number | null = null;
    if (o.modo !== 'ojos') atras = acercarElHombro(atrasDelHombro.current, hastaDondeCabeElHombro(arena, p), dt);
    atrasDelHombro.current = atras;
    const c = atras === null ? camaraDeOjos(p, suelo) : camaraDeHombro(p, suelo, atras);
    camera.position.set(c.x, c.y, c.z);
    camera.lookAt(c.miraX, c.miraY, c.miraZ);
  }, -1);

  const corregir = useCallback((sitio: Andante): void => {
    const actual = estado.current;
    if (actual === null) {
      pendiente.current = sitio;
      return;
    }
    estado.current = { arena: actual.arena, paseo: mudarDeMundo(actual.arena, corregirElPaseo(actual.paseo, sitio)) };
  }, []);

  return useMemo(() => ({ pose, corregir }), [corregir]);
}
