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
 *     el índice de cajones de tres mil cuerpos para no cambiar nada. Si el juego da ADORNO QUE
 *     CHOCA (`adorno`, ver `adorno-que-choca.ts`), sus plantas se suman a los cuerpos del mundo
 *     en esa misma arena, que lleva dentro la de la estructura sola (`estructuraDe`).
 *  2. Se suman las dos manos: el teclado, que se lee aquí si hay `document`, y los mandos de
 *     fuera, que la app escribe en una referencia.
 *  3. Se dan los tics que caben (`fotogramaDeQuienPasea`, en `paseante.ts`), con el paso de
 *     `shared/` y el golpe que haya pendiente; en el suelo, ninguno.
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
 *  · SI AHÍ NO SE CABE POR LA ESTRUCTURA, SE APARTA AL SITIO LIBRE MÁS CERCANO (`mudarDeMundo`, con
 *    la arena de la ESTRUCTURA sola: `estructuraDe`). Es lo que haría el servidor, que valida contra
 *    ella y rescata con la misma cuenta, así que el salto no le sorprende.
 *  · Y SI LO ÚNICO QUE LE TIENE DENTRO ES EL ADORNO, NO SE SALTA: se sale ANDANDO en los tics que
 *    siguen (`ticDelPaseo` y `salirDelAdorno`, en `paseante.ts`). Desde el 27-sep-2026 el aparato
 *    anda con estructura y adorno, y el servidor puede poner a alguien —al entrar, al renacer—
 *    dentro de un coche que él no ve. Un salto al sitio libre más cercano cae a más de un tic de
 *    donde el servidor espera el primer paso, y lo ignoraría y le devolvería dentro al segundo; un
 *    tic de correr por tic, en recta por la estructura, lo acepta siempre.
 *
 * ═══ Y LA CÁMARA DE HOMBRO NO ATRAVIESA ═══
 *
 * Cada fotograma se mira hasta dónde cabe detrás de quien pasea (`hastaDondeCabeElHombro`) y la
 * cámara se acerca o se aleja hacia eso sin saltar (`acercarElHombro`). El porqué y los números
 * están en `camaras.ts`. Se mira con la arena de la ESTRUCTURA: con el adorno que choca dentro, la
 * cámara se echaría a la nuca detrás de cada banco, que queda por debajo de su línea.
 *
 * Y si el juego declara lo que ESTORBA A LA VISTA (`estorbos`, ver `estorbos.ts`), también hasta
 * dónde puede irse sin que el adorno se le ponga delante (`hastaDondeNoTapa`), y manda el menor. La
 * arena de la estructura no sabe del adorno: sin esto la cámara se quedaba detrás de una señal de
 * tráfico del Burgo.
 *
 * ═══ LA REFRIEGA: LA G, EL BOTÓN, Y EL SUELO ═══
 *
 * En una mesa de botas se golpea (`mandos.ts`, «Y EL GOLPE SE DA»). El gancho cuenta las G que se
 * pulsan —pulsadas, no repetidas, y no las que van a un campo— y las suma a las del botón de la
 * app; lo que no haya salido todavía va en el primer tic que se dé, y con la cuenta
 * (`golpesVistosTras`) un fotograma sin tics no se lo come. La G sólo se atiende con canal: sin
 * nadie a quien contárselo no hay golpe, y la tecla se deja pasar.
 *
 * Y si la red dice que quien pasea está en el suelo (`caido`), el paseo NO DA NI UN TIC: ni anda,
 * ni gira, ni le cuenta nada al canal —el servidor no atiende los pasos de un caído, y lo que se
 * anduviera tumbado en la pantalla propia volvería de golpe al levantarse—. Se sigue pintando donde
 * cayó, con la cámara detrás, y lo que se pulse en el suelo no se guarda para después: al renacer
 * no sale un golpe que se pidió tumbado. Se levanta con el `renace`, que llega por la costura de
 * corregir con su rumbo.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { aNumero, deNumero } from '../../shared/mecanicas/fijo';
import { arenaDe } from '../../shared/mecanicas/mundo';
import type { Andante, Arena, Cuerpo, MundoDeclarado, Sitio } from '../../shared/mecanicas/mundo';
import { adornoQueDejaLlegarALosBrotes, arenaDelPaseo, estructuraDe, sinLoQueCierraElPaso } from './adorno-que-choca';
import type { SitioDeUnBrote } from './adorno-que-choca';
import { acercarElHombro, camaraDeHombro, camaraDeOjos, hastaDondeCabeElHombro, hastaDondeNoTapa } from './camaras';
import type { EstorbosDelPaseo } from './estorbos';
import { esTeclaDeOtro, esUnGolpe, SIN_MANDOS_DE_FUERA, SIN_TECLAS, teclaDelPaseo } from './mandos';
import type { DestinoDeLaTecla, EntradaDelTic, MandosDeFuera, Teclas } from './mandos';
import { corregirElPaseo, fotogramaDeQuienPasea, mudarDeMundo, nacerEnElPaseo, poseDelPaseo } from './paseante';
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
  /**
   * Lo que estorba a la VISTA: el adorno con su altura, ya indexado (`estorbos.ts`). No choca ni
   * viaja: sólo aparta la cámara de hombro de lo que se le pondría delante. Sin él, sólo la arena.
   */
  readonly estorbos?: EstorbosDelPaseo | null;
  /**
   * EL ADORNO QUE CHOCA: la planta de lo que se pinta a la altura del cuerpo (`adorno-que-choca.ts`).
   * Se suma a los cuerpos del mundo en la arena de ESTE aparato, y el servidor no lo ve. Se deriva
   * una vez por mundo y adorno, como la arena. Sin él, sólo el mundo.
   */
  readonly adorno?: readonly Cuerpo[] | null;
  /**
   * Los brotes de hallazgo vivos (el `brotes` del canal). El adorno que queda cerca de uno deja de
   * chocar mientras esté, para que se pueda llegar a cogerlo (`adornoQueDejaLlegarALosBrotes`).
   */
  readonly brotes?: readonly SitioDeUnBrote[];
  /** La costura (a) con la red: lo pedido en cada tic y dónde se acabó. */
  readonly alDarUnTic?: (entrada: EntradaDelTic, sitio: Andante) => void;
  /**
   * Si quien pasea está en el suelo en la refriega (el `caido` del canal). Mientras diga que sí no
   * se da ni un tic: ver la cabecera. Sin canal no se da, y no se cae nunca.
   */
  readonly caido?: () => boolean;
}

export interface ElPaseo {
  /** Quien pasea, como se pinta en este fotograma. La escribe el paseo antes que nadie. */
  readonly pose: { readonly current: PaseoPintado };
  /**
   * La costura (b) con la red: poner a quien pasea en un sitio, en Q16.16, y con `rumbo`
   * (radianes) mirando hacia ahí. Antes de nacer, se nacerá ahí; donde no se quepa, en el sitio
   * libre más cercano. Ver la cabecera.
   */
  readonly corregir: (sitio: Andante, rumbo?: number) => void;
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
  const estructura = useMemo(() => (o.mundo === null ? null : arenaDe(o.mundo)), [o.mundo]);
  /* Lo que cierra un paso, fuera una vez por adorno; lo que tapa un brote, cada vez que cambian (ver `adorno-que-choca.ts`). */
  const abierto = useMemo(
    () => (o.adorno === null || o.adorno === undefined || estructura === null ? null : sinLoQueCierraElPaso(o.adorno, estructura)),
    [o.adorno, estructura],
  );
  const adorno = useMemo(() => adornoQueDejaLlegarALosBrotes(abierto, o.brotes), [abierto, o.brotes]);
  const arena = useMemo(
    () => (o.mundo === null || estructura === null ? null : arenaDelPaseo(o.mundo, adorno, estructura, true)),
    [o.mundo, estructura, adorno],
  );
  const estado = useRef<{ readonly arena: Arena; readonly paseo: EstadoDelPaseo } | null>(null);
  const teclas = useRef<Teclas>(SIN_TECLAS);
  const pose = useRef<PaseoPintado>(SIN_NACER);
  const alturaDeLosPies = useRef<number | null>(null);
  const alturaDeLaCamara = useRef<number | null>(null);
  /* Cuánto se queda detrás la cámara de hombro: `null` fuera del hombro, y al volver se pone de golpe. */
  const atrasDelHombro = useRef<number | null>(null);
  /* Un sitio que dijo la red antes de que hubiera nacido nadie: se nace ahí, y mirando a donde dijo si lo dijo. */
  const pendiente = useRef<{ readonly sitio: Andante; readonly rumbo: number | undefined } | null>(null);
  /*
   * LOS GOLPES: los de la G, que cuenta este gancho, y los que ya salieron en un tic. Los del botón
   * de la app llegan en los mandos de fuera. `null` hasta el primer fotograma a pie. Ver la cabecera.
   */
  const golpesDelTeclado = useRef(0);
  const golpesVistos = useRef<number | null>(null);
  /* Con canal se golpea; sin él, la G no es del paseo. Se lee en el oyente, que no se vuelve a apuntar por esto. */
  const conCanal = useRef(o.alDarUnTic !== undefined);
  useEffect(() => {
    conCanal.current = o.alDarUnTic !== undefined;
  });
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
      if (mando === 'golpe') {
        /* Un golpe es PULSAR la G, con canal y sin que sea de otro (ver `esUnGolpe`); soltarla no hace nada. */
        const conModificador = e.ctrlKey || e.altKey || e.metaKey;
        if (!pulsada || !conCanal.current || !esUnGolpe(e.key, e.target as DestinoDeLaTecla | null, conModificador, e.repeat)) return;
        e.preventDefault();
        golpesDelTeclado.current += 1;
        return;
      }
      /*
       * Soltar se atiende SIEMPRE —una tecla que se soltó escribiendo en un campo no puede
       * quedarse pisada en el paseo—; pulsar, sólo si la tecla no es de otro (ver `esTeclaDeOtro`).
       */
      if (pulsada && esTeclaDeOtro(e.target as DestinoDeLaTecla | null, e.ctrlKey || e.altKey || e.metaKey)) return;
      if (pulsada) e.preventDefault();
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
    const fuera = o.mandos?.current ?? SIN_MANDOS_DE_FUERA;
    const golpesPedidos = golpesDelTeclado.current + fuera.golpes;
    if (!aPie || arena === null) {
      /* Lo pulsado sin andar no se guarda para cuando se ande. */
      golpesVistos.current = golpesPedidos;
      atrasDelHombro.current = null;
      return;
    }

    /* ── Nacer la primera vez, o seguir donde se estaba si el mundo ha cambiado ── */
    let actual = estado.current;
    if (actual === null) {
      /* Si la red ya dijo dónde, se nace ahí, mirando a donde declara el mundo si lo declara. */
      const dicho = pendiente.current;
      const nace: Sitio | null =
        o.nace ?? (dicho === null ? null : { x: aNumero(dicho.sitio.x), z: aNumero(dicho.sitio.z), rumbo: dicho.rumbo ?? 0 });
      if (nace === null) return;
      const nacido = nacerEnElPaseo(arena, nace);
      if (dicho === null && (nacido.ahora.x !== deNumero(nace.x) || nacido.ahora.z !== deNumero(nace.z))) {
        /* Un respaldo mudo es un fallo que nadie ve: el mundo declaró un sitio donde no se cabe. */
        console.warn(
          `El mundo declara nacer en (${nace.x.toFixed(1)}, ${nace.z.toFixed(1)}) y ahí no se cabe: se nace en el sitio libre más cercano.`,
        );
      }
      pendiente.current = null;
      actual = {
        arena,
        paseo: dicho === null ? nacido : mudarDeMundo(estructuraDe(arena), corregirElPaseo(nacido, dicho.sitio, dicho.rumbo)),
      };
    } else if (actual.arena !== arena) {
      actual = { arena, paseo: mudarDeMundo(estructuraDe(arena), actual.paseo) };
    }

    /* ── Los tics, con el golpe pendiente; y en el suelo, ninguno (`fotogramaDeQuienPasea`) ── */
    const hecho = fotogramaDeQuienPasea(
      arena,
      actual.paseo,
      dt,
      teclas.current,
      fuera,
      golpesPedidos,
      golpesVistos.current,
      o.caido?.() === true,
      o.alDarUnTic,
    );
    const paseo = hecho.paseo;
    golpesVistos.current = hecho.golpesVistos;
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
    if (o.modo !== 'ojos') {
      /* Y sin quedarse detrás del adorno que el juego declare: el menor de los dos (ver `camaras.ts`). */
      const cabe = hastaDondeCabeElHombro(estructuraDe(arena), p);
      const noTapa = o.estorbos === undefined || o.estorbos === null ? cabe : hastaDondeNoTapa(o.estorbos, p, suelo, cabe, y);
      atras = acercarElHombro(atrasDelHombro.current, Math.min(cabe, noTapa), dt);
    }
    atrasDelHombro.current = atras;
    /* La de hombro mira a donde están los pies (`y`), no a donde se apoya ella: ver `camaraDeHombro`. */
    const c = atras === null ? camaraDeOjos(p, suelo) : camaraDeHombro(p, suelo, atras, y);
    camera.position.set(c.x, c.y, c.z);
    camera.lookAt(c.miraX, c.miraY, c.miraZ);
  }, -1);

  const corregir = useCallback((sitio: Andante, rumbo?: number): void => {
    const actual = estado.current;
    if (actual === null) {
      pendiente.current = { sitio, rumbo };
      return;
    }
    estado.current = { arena: actual.arena, paseo: mudarDeMundo(estructuraDe(actual.arena), corregirElPaseo(actual.paseo, sitio, rumbo)) };
  }, []);

  return useMemo(() => ({ pose, corregir }), [corregir]);
}
