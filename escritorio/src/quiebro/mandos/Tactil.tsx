/**
 * LOS MANDOS TÁCTILES: el móvil apaisado del diseño §7, con Pointer Events y todo en `pointerdown`.
 *
 * ═══ LO QUE PIDE EL DISEÑO, UNO POR UNO ═══
 *
 *   · HTML encima del lienzo con `touch-action: none`: el navegador no se come ningún gesto (ni el
 *     zoom de dos dedos ni el desplazamiento), y el multitoque lo da el motor del navegador.
 *   · TODO ACTÚA AL BAJAR EL DEDO (`pointerdown`), nunca en click, y la hora es la del evento
 *     (`event.timeStamp`): el quiebro se juzga con ella. Nunca `onClick`.
 *   · La PALANCA FLOTANTE nace donde se apoya el pulgar, en el 45 % izquierdo: base de 56 pt de radio
 *     y zona muerta del 12 % (la aplica `estado.ts`).
 *   · MIRAR arrastrando en la zona libre de la derecha: 0,35° por pt de giro; el cabeceo, más corto.
 *   · Los BOTONES en arco abajo a la derecha: GOLPE, QUIEBRO, EMPELLÓN (con su recarga), USAR (sólo
 *     cuando sirve, y se mantiene con un anillo de progreso) y AVISO arriba; a la izquierda, el RAYO.
 *   · OPCIÓN ZURDA: todo en espejo.
 *
 * Cada dedo es de quien lo cogió (`pointerId`): uno en la palanca y otro mirando a la vez no se pisan, y
 * un dedo que se va por encima de un botón no lo pulsa. Lo que cambia en cada fotograma (el pomo de la
 * palanca, si USAR se ve, las recargas, la carga del rayo, la Tanda, la amenaza) se escribe en el DOM a
 * mano desde un `requestAnimationFrame`, sin pasar por React, y sólo cuando cambia.
 *
 * ═══ EL RAYO (`docs/quiebro/EL-RAYO.md` §1 y §3) ═══
 *
 * El botón RAYO va a la IZQUIERDA —el lado contrario a las acciones—, por encima de donde suele nacer la
 * palanca y a 28 pt o más del borde (lejos del «atrás» de Android y del deslizamiento de iOS y Safari). Se
 * MANTIENE: su dedo se captura como el de USAR, y
 *   · SOLTARLO dispara (`soltarRayo`, con la hora de su `pointerup` y el blanco que la mira tenía debajo), y
 *     deja el dedo a `null` ANTES de nada: la pérdida de captura que llega justo detrás de un `pointerup` no
 *     es un dedo perdido;
 *   · un `pointercancel` o una captura perdida sin `pointerup` (el sistema se llevó el dedo) CANCELAN;
 *   · irse al fondo o perder el foco lo sueltan todo y cancelan (`soltarTodo`): irse no dispara.
 * Mientras se carga, los botones de la derecha se apagan y dejan pasar el dedo: toda la mitad derecha sirve
 * para apuntar. QUIEBRO no: sigue encendido, y pulsarlo cancela la carga y esquiva. Y la capa entera no
 * saca el menú de «mantener pulsado» del sistema (`onContextMenu`): la carga dura más de un segundo.
 *
 * ═══ LOS ESTADOS DE LOS BOTONES SALEN DE LA SALA ═══
 *
 * Pulsado (se encoge, el aro destella y sale una onda), en recarga (un barrido que se aclara en el sentido
 * del reloj, con los segundos), apagado (no se puede ahora) y el CONTEXTO: QUIEBRO se enciende en cian cuando
 * un golpe viene hacia mí —hay un anuncio contra mi asiento: el juego es verlo venir—, GOLPE lleva el paso de
 * la Tanda en su aro y RAYO la carga. Las recargas son las que apuntó la sala (`Partida.leerLosBotones`): un
 * Empellón que la sala tiró no deja el botón en recarga, como hacía la hora local de la pulsación.
 *
 * ═══ AL IRSE, SE SUELTA TODO ═══
 *
 * Un dedo en la palanca cuando llega una llamada, o se baja la cortina de avisos, o se cambia de app, no
 * manda nunca su `pointerup`: el sistema se queda con el toque. Sin soltarlo aquí, la palanca seguiría
 * empujando al volver —y mientras tanto, si el aparato sigue en marcha, el asiento «jugaría» solo y la
 * sala no lo daría por ausente (ver `fondo.ts`)—. Así que al perder el foco, al ocultarse la pestaña, al
 * irse la página o al pasar la app al fondo se olvidan los dedos, la base de la palanca se esconde y
 * los mandos quedan a cero. El teclado ya lo hacía (`teclado.ts`); el táctil, no.
 */
import { useEffect, useRef } from 'react';
import type { JSX, MouseEvent as EventoDeRaton, PointerEvent as EventoDePuntero } from 'react';
import { NOMBRES_DEL_QUIEBRO } from '../../../../shared/arcade/juegos/quiebro-nombres';
import type { EstadoDeLosBotones, Partida } from '../red/partida';
import type { Boton, EstadoDeLosMandos } from './estado';
import { escucharElFondo } from './fondo';
import { DefinicionesDelAro, Icono } from './iconos';

/** El radio de la base de la palanca, en pt CSS (diseño §7). */
export const RADIO_DE_LA_PALANCA = 56;
/** La palanca vive en el 45 % izquierdo. */
export const ZONA_DE_LA_PALANCA = 0.45;
/** Radianes de giro por pt arrastrado: 0,35°. */
export const GIRO_POR_PT = (0.35 * Math.PI) / 180;
/**
 * El nombre del botón del rayo: el de `quiebro-nombres.ts` en cuanto lo tenga (es de REGLAS); mientras, el de la
 * especificación.
 */
export const NOMBRE_DEL_RAYO = (NOMBRES_DEL_QUIEBRO.botones as Readonly<Record<string, string | undefined>>)['rayo'] ?? 'RAYO';
/** Cuántos puntos de la Tanda caben en el aro de GOLPE. */
const PUNTOS_DE_LA_TANDA = 4;

export interface PropsDelTactil {
  readonly mandos: EstadoDeLosMandos;
  readonly partida: Partida | null;
  readonly zurdo: boolean;
}

/** El aro de progreso de un botón (USAR, la carga del RAYO): un círculo de radio 46 en una caja de 100. */
export const CIRCUNFERENCIA_DEL_ARO = 2 * Math.PI * 46;

/**
 * EL DESFASE DEL TRAZO del aro de progreso con `c` (0..1) hecho: se ve `c` de la circunferencia desde donde empieza
 * el círculo. Lo usan el RAYO del teléfono, el de PC y USAR.
 */
export function desfaseDelAro(c: number): string {
  const x = Number.isFinite(c) ? Math.max(0, Math.min(1, c)) : 0;
  return (CIRCUNFERENCIA_DEL_ARO * (1 - x)).toFixed(1);
}

/**
 * LA MUESCA DE UN NIVEL en el aro de la carga del RAYO, en la caja de 100 del mismo `<svg class="carga">` que el
 * círculo: una raya radial (de 42 a 49 de radio, a los dos lados del trazo de 44,25 a 47,75) puesta en el ORIGEN DEL
 * CÍRCULO —un `<circle>` empieza su trazo en `(cx + r, cy)`, a las tres de su caja, y corre en el sentido de las
 * agujas— y girada `u · 360°` en ese sentido. Así cae justo donde llega el trazo con la carga `u`, gire la hoja la
 * caja lo que la gire (−90°, para que la carga empiece a las doce).
 *
 * Hasta el 26-sep la raya iba de (50, 1) a (50, 8): en lo ALTO de la caja, 90° por delante del círculo, que empieza a
 * las tres. Con la caja girada, las muescas marcaban cada nivel un cuarto de vuelta antes de que la carga llegase (la
 * del nivel 2, 23 % de la carga, casi a las doce: donde la carga EMPIEZA).
 */
export interface MuescaDelAro {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  /** El giro alrededor del centro de la caja, en grados (positivo: en el sentido de las agujas, como `rotate` de SVG). */
  readonly giro: number;
}

export function muescaDelUmbral(u: number): MuescaDelAro {
  return { x1: 92, y1: 50, x2: 99, y2: 50, giro: Math.round(u * 3600) / 10 };
}

/** Pinta las muescas de `umbrales` (los de dentro de 0..1) en el grupo `g` del SVG de la carga, borrando las que hubiera. */
export function pintarLasMuescas(g: SVGGElement, umbrales: readonly number[]): void {
  while (g.firstChild !== null) g.removeChild(g.firstChild);
  for (const u of umbrales) {
    if (!(u > 0 && u < 1)) continue;
    const m = muescaDelUmbral(u);
    const muesca = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    muesca.setAttribute('x1', String(m.x1));
    muesca.setAttribute('y1', String(m.y1));
    muesca.setAttribute('x2', String(m.x2));
    muesca.setAttribute('y2', String(m.y2));
    muesca.setAttribute('transform', `rotate(${String(m.giro)} 50 50)`);
    g.appendChild(muesca);
  }
}

/** Pone o quita una clase sólo si cambia (el `requestAnimationFrame` no toca el DOM por tocarlo). */
function alternar(el: Element | null, clase: string, si: boolean): void {
  if (el !== null && el.classList.contains(clase) !== si) el.classList.toggle(clase, si);
}

/** Lo último que se escribió en cada propiedad, para no escribir lo mismo sesenta veces por segundo. */
type Escritos = Map<string, string>;
function escribir(escritos: Escritos, clave: string, el: HTMLElement | SVGElement | null, poner: (el: HTMLElement | SVGElement, v: string) => void, valor: string): void {
  if (el === null || escritos.get(clave) === valor) return;
  escritos.set(clave, valor);
  poner(el, valor);
}

/** Los segundos que le quedan a una recarga, como se leen en el botón: «3», «2», «1» y nada al final. */
export function segundosDeLaRecarga(quedaMs: number): string {
  return quedaMs < 150 ? '' : String(Math.ceil(quedaMs / 1000));
}

/**
 * LAS CLASES DE LOS BOTONES en un fotograma, de lo que dice la sala (`Partida.leerLosBotones`) y de si el dedo
 * del RAYO lo tiene pulsado (`rayoDesde`). Pura: la prueba `verify:quiebro-juego`, y el `requestAnimationFrame`
 * sólo la escribe.
 *   · `cargando` (en la capa): mientras se carga, la derecha se apaga y deja pasar el dedo para apuntar, salvo
 *     QUIEBRO. Vale desde que el dedo baja, antes de que la partida lo cuente: el dedo derecho puede estar ya ahí.
 *   · el RAYO: `conRayo` si mi asiento tiene tiro; en `recarga` (barrido y segundos) mientras la sala la cuenta y
 *     no se carga; `apagada` si no se puede y no es por la recarga; `cargando`, y `pleno` con la carga llena.
 */
export interface ClasesDeLosBotones {
  readonly cargando: boolean;
  readonly golpeApagado: boolean;
  readonly quiebroApagado: boolean;
  readonly ruptura: boolean;
  readonly amenaza: boolean;
  readonly empellonApagado: boolean;
  readonly empellonEnRecarga: boolean;
  readonly conRayo: boolean;
  readonly rayoEnRecarga: boolean;
  readonly rayoApagado: boolean;
  readonly rayoCargando: boolean;
  readonly pleno: boolean;
}

export function clasesDeLosBotones(b: EstadoDeLosBotones | null, rayoDesde: number | null): ClasesDeLosBotones {
  const r = b?.rayo ?? null;
  const hay = r !== null && r.hay;
  return {
    cargando: (r?.cargando ?? false) || rayoDesde !== null,
    golpeApagado: b !== null && !b.golpe.listo,
    quiebroApagado: b !== null && !b.quiebro.listo,
    ruptura: b?.quiebro.ruptura ?? false,
    amenaza: (b?.quiebro.amenaza ?? -1) >= 0,
    empellonApagado: b !== null && !b.activos,
    empellonEnRecarga: (b?.empellon.recarga ?? 0) > 0,
    conRayo: hay,
    rayoEnRecarga: hay && r.recarga > 0 && !r.cargando,
    rayoApagado: hay && !r.listo && r.recarga <= 0,
    rayoCargando: hay && r.cargando,
    pleno: hay && r.cargando && r.c >= 1,
  };
}

/* ── El rótulo dentro del aro ── */

/** El radio útil por dentro del aro, en fracción del lado: el aro de dentro (43,5 de 100) menos medio trazo. */
export const RADIO_UTIL_DEL_ARO = 0.429;
/** Lo que se deja entre la letra y el aro (px). */
export const HOLGURA_DEL_ROTULO_PX = 1.5;
/** Lo más que se estrecha un rótulo: con una letra de reserva muy ancha, mejor estrecho que montado en el aro. */
export const AJUSTE_MINIMO = 0.6;

/**
 * La CUERDA por dentro del aro de un botón de `lado` px a `abajo` px de su borde de abajo: lo que cabe a esa altura
 * sin tocar el aro (px). La del rótulo se mide en su borde más lejano del centro, que es donde el aro aprieta.
 */
export function cuerdaDelAro(lado: number, abajo: number): number {
  const r = lado * RADIO_UTIL_DEL_ARO - HOLGURA_DEL_ROTULO_PX;
  const d = Math.abs(lado / 2 - abajo);
  return d >= r ? 0 : 2 * Math.sqrt(r * r - d * d);
}

/** Lo que se estrecha un rótulo de `ancho` px para caber en `cabe` px: 1 si cabe, y nunca menos del mínimo. */
export function ajusteDelRotulo(ancho: number, cabe: number): number {
  if (!(ancho > 0) || !(cabe > 0)) return 1;
  return Math.max(AJUSTE_MINIMO, Math.min(1, cabe / ancho));
}

/**
 * AJUSTA UN RÓTULO a su aro: lo mide sin transformaciones (`offset*`: ni el hundido ni el espejo lo cambian), en su
 * borde de abajo, y lo estrecha lo que haga falta (`--q-ajuste`, que usa el `transform` de la hoja). Con la letra de
 * casa no hace falta; con una de reserva más ancha (un teléfono sin letra estrecha) es lo que lo deja dentro.
 * Devuelve el ajuste, o `null` si el botón no se ve (sin caja no hay medida: se repite al verse).
 */
export function ajustarElRotulo(el: HTMLElement): number | null {
  const boton = el.offsetParent;
  if (!(boton instanceof HTMLElement)) return null;
  const lado = boton.offsetWidth;
  const abajo = lado - (el.offsetTop + el.offsetHeight);
  const k = ajusteDelRotulo(el.offsetWidth, cuerdaDelAro(lado, abajo));
  el.style.setProperty('--q-ajuste', String(Math.round(k * 1000) / 1000));
  return k;
}

export function MandosTactiles({ mandos, partida, zurdo }: PropsDelTactil): JSX.Element {
  const raiz = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const pomo = useRef<HTMLDivElement>(null);
  const rumbo = useRef<HTMLDivElement>(null);
  const golpe = useRef<HTMLDivElement>(null);
  const quiebro = useRef<HTMLDivElement>(null);
  const empellon = useRef<HTMLDivElement>(null);
  const empellonSegundos = useRef<HTMLSpanElement>(null);
  const usar = useRef<HTMLDivElement>(null);
  const usarRotulo = useRef<HTMLSpanElement>(null);
  const usarProgreso = useRef<SVGCircleElement>(null);
  const rayo = useRef<HTMLDivElement>(null);
  const rayoSegundos = useRef<HTMLSpanElement>(null);
  const rayoCarga = useRef<SVGCircleElement>(null);
  const rayoNiveles = useRef<SVGGElement>(null);
  const tanda = useRef<(HTMLElement | null)[]>([]);
  const dedos = useRef<{
    palanca: { id: number; x: number; y: number } | null;
    mirada: { id: number; x: number; y: number } | null;
    usar: number | null;
    rayo: number | null;
  }>({ palanca: null, mirada: null, usar: null, rayo: null });

  /* Lo que cambia por fotograma, fuera de React. */
  useEffect(() => {
    let vivo = true;
    let pedido = 0;
    const escritos: Escritos = new Map();
    let umbralesPintados: readonly number[] | null = null;
    const poniendoVar = (nombre: string) => (el: HTMLElement | SVGElement, v: string) => el.style.setProperty(nombre, v);
    const poniendoTexto = (el: HTMLElement | SVGElement, v: string): void => {
      el.textContent = v;
    };
    /* Los rótulos se ajustan a su aro al montar, cuando llegan las letras, y cuando uno cambia o aparece. */
    let ajustar = true;
    void document.fonts?.ready.then(() => {
      ajustar = true;
    });
    const pintar = (): void => {
      if (!vivo) return;
      const ahora = performance.now();
      const b = partida?.leerLosBotones(ahora) ?? null;
      const clases = clasesDeLosBotones(b, mandos.rayoDesde);

      /* USAR: sólo cuando sirve, con su rótulo y su anillo. */
      const uso = partida?.usoPosible(ahora) ?? null;
      if (usar.current !== null && escritos.get('usar-display') !== (uso === null ? 'none' : 'grid')) ajustar = true;
      if (usar.current !== null) escribir(escritos, 'usar-display', usar.current, (el, v) => (el.style.display = v), uso === null ? 'none' : 'grid');
      if (uso !== null && usarRotulo.current !== null) {
        const texto = NOMBRES_DEL_QUIEBRO.botones[uso.que === 'rematar' ? 'rematar' : uso.que === 'rescatar' ? 'rescatar' : 'descolgar'];
        if (usarRotulo.current.textContent !== texto) {
          usarRotulo.current.textContent = texto;
          ajustar = true;
        }
      }
      const progreso = partida?.progresoDeUsar(ahora) ?? null;
      escribir(escritos, 'usar-progreso', usarProgreso.current, (el, v) => (el.style.strokeDashoffset = v), desfaseDelAro(progreso ?? 0));

      /* Mientras se carga el rayo, la derecha se apaga para apuntar (salvo QUIEBRO). */
      alternar(raiz.current, 'cargando', clases.cargando);

      /* GOLPE: el paso de la Tanda en su aro, y el siguiente que late mientras su ventana está abierta. */
      alternar(golpe.current, 'apagada', clases.golpeApagado);
      for (let i = 0; i < PUNTOS_DE_LA_TANDA; i++) {
        const punto = tanda.current[i] ?? null;
        alternar(punto, 'hay', b !== null && i < b.golpe.de);
        alternar(punto, 'dado', b !== null && i < b.golpe.paso);
        alternar(punto, 'siguiente', b !== null && b.golpe.ventana && i === b.golpe.paso);
      }

      /* QUIEBRO: encendido en cian mientras un golpe viene hacia mí, más cuanto más cerca del impacto. */
      alternar(quiebro.current, 'apagada', clases.quiebroApagado);
      alternar(quiebro.current, 'ruptura', clases.ruptura);
      alternar(quiebro.current, 'amenaza', clases.amenaza);
      escribir(escritos, 'amenaza', quiebro.current, poniendoVar('--q-amenaza'), Math.max(0, b?.quiebro.amenaza ?? -1).toFixed(2));

      /* EMPELLÓN: la recarga que apuntó la sala, con su barrido y sus segundos. */
      alternar(empellon.current, 'apagada', clases.empellonApagado);
      alternar(empellon.current, 'recarga', clases.empellonEnRecarga);
      escribir(escritos, 'empellon-barrido', empellon.current, poniendoVar('--q-barrido'), (b?.empellon.recarga ?? 0).toFixed(3));
      escribir(escritos, 'empellon-segundos', empellonSegundos.current, poniendoTexto, segundosDeLaRecarga(b?.empellon.quedaMs ?? 0));

      /* RAYO: sólo si mi asiento lo tiene; su recarga (de la sala), su carga y el pleno. */
      const r = b?.rayo ?? null;
      const hay = clases.conRayo && r !== null;
      if (raiz.current !== null && raiz.current.classList.contains('con-rayo') !== clases.conRayo) ajustar = true;
      alternar(raiz.current, 'con-rayo', clases.conRayo);
      alternar(rayo.current, 'recarga', clases.rayoEnRecarga);
      alternar(rayo.current, 'apagada', clases.rayoApagado);
      alternar(rayo.current, 'cargando', clases.rayoCargando);
      alternar(rayo.current, 'pleno', clases.pleno);
      escribir(escritos, 'rayo-barrido', rayo.current, poniendoVar('--q-barrido'), (hay ? r.recarga : 0).toFixed(3));
      escribir(escritos, 'rayo-segundos', rayoSegundos.current, poniendoTexto, hay && !r.cargando ? segundosDeLaRecarga(r.quedaMs) : '');
      escribir(escritos, 'rayo-carga', rayoCarga.current, (el, v) => (el.style.strokeDashoffset = v), desfaseDelAro(hay && r.cargando ? r.c : 0));
      /* Las muescas de los niveles en el aro de la carga (una vez por tiro), en el origen del círculo (`muescaDelUmbral`). */
      if (hay && r.umbrales !== umbralesPintados && rayoNiveles.current !== null) {
        umbralesPintados = r.umbrales;
        pintarLasMuescas(rayoNiveles.current, r.umbrales);
      }
      alternar(rayoNiveles.current, 'nivel-2', hay && r.nivel >= 2);
      /* Los rótulos, dentro de su aro (ver `ajustarElRotulo`): sólo cuando algo cambió, que medir cuesta un layout. */
      if (ajustar && raiz.current !== null) {
        ajustar = false;
        for (const el of raiz.current.querySelectorAll<HTMLElement>('.q-tecla .rotulo')) ajustarElRotulo(el);
      }
      pedido = requestAnimationFrame(pintar);
    };
    pedido = requestAnimationFrame(pintar);
    return () => {
      vivo = false;
      cancelAnimationFrame(pedido);
    };
  }, [partida, mandos]);

  /* Al perder el foco o irse al fondo, los dedos se olvidan (ver la cabecera). */
  useEffect(() => {
    const soltarLosDedos = (): void => {
      const d = dedos.current;
      d.palanca = null;
      d.mirada = null;
      d.usar = null;
      d.rayo = null;
      if (base.current !== null) base.current.style.display = 'none';
      if (pomo.current !== null) pomo.current.style.transform = 'translate(0px, 0px)';
      for (const b of raiz.current?.querySelectorAll('.pulsada') ?? []) b.classList.remove('pulsada');
      mandos.soltarTodo();
    };
    window.addEventListener('blur', soltarLosDedos);
    const dejarElFondo = escucharElFondo((alFondo) => {
      if (alFondo) soltarLosDedos();
    });
    return () => {
      window.removeEventListener('blur', soltarLosDedos);
      dejarElFondo();
    };
  }, [mandos]);

  /* Un dedo que se levanta fuera (o que el sistema cancela) suelta lo suyo. */
  const soltar = (e: EventoDePuntero<HTMLElement>): void => {
    const d = dedos.current;
    if (d.palanca !== null && d.palanca.id === e.pointerId) {
      d.palanca = null;
      mandos.ponerPalanca(0, 0, e.timeStamp);
      if (base.current !== null) base.current.style.display = 'none';
    }
    if (d.mirada !== null && d.mirada.id === e.pointerId) d.mirada = null;
    if (d.usar === e.pointerId) {
      d.usar = null;
      mandos.soltarUsar();
    }
  };

  const alBajarEnElFondo = (e: EventoDePuntero<HTMLDivElement>): void => {
    e.preventDefault();
    mandos.tipo = 'tactil';
    const caja = raiz.current?.getBoundingClientRect();
    if (caja === undefined) return;
    const relativo = (e.clientX - caja.left) / Math.max(1, caja.width);
    const enLaPalanca = zurdo ? relativo > 1 - ZONA_DE_LA_PALANCA : relativo < ZONA_DE_LA_PALANCA;
    const d = dedos.current;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* Sin captura, el dedo sigue funcionando mientras no salga del elemento. */
    }
    if (enLaPalanca && d.palanca === null) {
      /* La palanca nace donde se apoya el pulgar, sin que la base se salga de la pantalla. */
      const x = Math.max(caja.left + RADIO_DE_LA_PALANCA + 8, Math.min(caja.right - RADIO_DE_LA_PALANCA - 8, e.clientX));
      const y = Math.max(caja.top + RADIO_DE_LA_PALANCA + 8, Math.min(caja.bottom - RADIO_DE_LA_PALANCA - 8, e.clientY));
      d.palanca = { id: e.pointerId, x, y };
      if (base.current !== null) {
        base.current.style.display = 'block';
        base.current.style.left = `${String(x - caja.left)}px`;
        base.current.style.top = `${String(y - caja.top)}px`;
      }
      if (pomo.current !== null) pomo.current.style.transform = 'translate(0px, 0px)';
      moverPalanca(e.clientX, e.clientY, e.timeStamp);
      return;
    }
    if (!enLaPalanca && d.mirada === null) d.mirada = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const moverPalanca = (cx: number, cy: number, t: number): void => {
    const d = dedos.current.palanca;
    if (d === null) return;
    let dx = cx - d.x;
    let dy = cy - d.y;
    const largo = Math.hypot(dx, dy);
    if (largo > RADIO_DE_LA_PALANCA) {
      dx = (dx / largo) * RADIO_DE_LA_PALANCA;
      dy = (dy / largo) * RADIO_DE_LA_PALANCA;
    }
    if (pomo.current !== null) pomo.current.style.transform = `translate(${String(dx)}px, ${String(dy)}px)`;
    /* La marca de dirección en el aro: hacia donde empuja el pulgar, más viva cuanto más empuja. */
    if (rumbo.current !== null) {
      const fuerza = Math.min(1, largo / RADIO_DE_LA_PALANCA);
      rumbo.current.style.opacity = fuerza < 0.14 ? '0' : String(Math.round(fuerza * 100) / 100);
      rumbo.current.style.transform = `rotate(${String(Math.round((Math.atan2(dx, -dy) * 1800) / Math.PI) / 10)}deg)`;
    }
    /* En la pantalla, y hacia abajo es positivo; la palanca empuja hacia delante con el dedo arriba. */
    mandos.ponerPalanca(dx / RADIO_DE_LA_PALANCA, -dy / RADIO_DE_LA_PALANCA, t);
  };

  const alMover = (e: EventoDePuntero<HTMLDivElement>): void => {
    const d = dedos.current;
    if (d.palanca !== null && d.palanca.id === e.pointerId) {
      moverPalanca(e.clientX, e.clientY, e.timeStamp);
      return;
    }
    if (d.mirada !== null && d.mirada.id === e.pointerId) {
      const dx = e.clientX - d.mirada.x;
      const dy = e.clientY - d.mirada.y;
      d.mirada.x = e.clientX;
      d.mirada.y = e.clientY;
      mandos.mirar(dx * GIRO_POR_PT, dy * GIRO_POR_PT * 0.7, e.timeStamp);
    }
  };

  /** Un botón: actúa al bajar el dedo, con la hora de su evento. */
  const alPulsar = (boton: Boton) => (e: EventoDePuntero<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    mandos.tipo = 'tactil';
    e.currentTarget.classList.add('pulsada');
    if (boton === 'usar') {
      dedos.current.usar = e.pointerId;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* Ver arriba. */
      }
    }
    mandos.pulsar(boton, e.timeStamp);
  };

  const alSoltarElBoton = (e: EventoDePuntero<HTMLDivElement>): void => {
    e.currentTarget.classList.remove('pulsada');
    soltar(e);
  };

  /** El ratón de `?tactil=1` que sale del botón sin soltarlo: el botón no se queda hundido. */
  const alSalirDelBoton = (e: EventoDePuntero<HTMLDivElement>): void => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.classList.remove('pulsada');
  };

  /* ── El RAYO: se mantiene para cargar, se suelta para disparar (ver la cabecera) ── */

  const alPulsarElRayo = (e: EventoDePuntero<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    mandos.tipo = 'tactil';
    const d = dedos.current;
    if (d.rayo !== null) return;
    d.rayo = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* Sin captura, un dedo que sale del botón y se levanta fuera no llega: lo cancela la pérdida o el foco. */
    }
    e.currentTarget.classList.add('pulsada');
    mandos.pulsar('rayo', e.timeStamp);
  };

  const alSoltarElRayo = (e: EventoDePuntero<HTMLDivElement>): void => {
    const d = dedos.current;
    if (d.rayo !== e.pointerId) return;
    /* PRIMERO el dedo a `null`: la pérdida de captura que viene detrás de este `pointerup` no cancela nada. */
    d.rayo = null;
    e.currentTarget.classList.remove('pulsada');
    mandos.soltarRayo(e.timeStamp, partida?.rayo.blanco ?? 0);
  };

  /** `pointercancel`, o la captura perdida sin `pointerup`: el sistema se llevó el dedo. Se cancela, sin disparar. */
  const alPerderElRayo = (e: EventoDePuntero<HTMLDivElement>): void => {
    const d = dedos.current;
    if (d.rayo !== e.pointerId) return;
    d.rayo = null;
    e.currentTarget.classList.remove('pulsada');
    mandos.cancelarRayo();
  };

  /** Mantener pulsado no saca el menú del sistema (la carga dura más de un segundo). */
  const sinMenu = (e: EventoDeRaton<HTMLDivElement>): void => {
    e.preventDefault();
  };

  const n = NOMBRES_DEL_QUIEBRO.botones;
  const aro = (
    <svg className="aro" viewBox="0 0 100 100" aria-hidden="true">
      <circle className="filo" cx="50" cy="50" r="48" />
      <circle className="dentro" cx="50" cy="50" r="43.5" />
    </svg>
  );
  return (
    <div
      ref={raiz}
      className={zurdo ? 'q-tactil zurdo' : 'q-tactil'}
      onPointerDown={alBajarEnElFondo}
      onPointerMove={alMover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onLostPointerCapture={soltar}
      onContextMenu={sinMenu}
    >
      <DefinicionesDelAro />
      <div ref={base} className="q-palanca-base">
        <svg className="marcas" viewBox="0 0 112 112" aria-hidden="true">
          <circle className="aro-palanca" cx="56" cy="56" r="54" />
          {Array.from({ length: 12 }, (_, k) => (
            <line key={k} className={k % 3 === 0 ? 'muesca mayor' : 'muesca'} x1="56" y1="4" x2="56" y2={k % 3 === 0 ? '11' : '8'} transform={`rotate(${String(k * 30)} 56 56)`} />
          ))}
        </svg>
        <div ref={rumbo} className="q-palanca-rumbo" />
        <div ref={pomo} className="q-palanca-pomo" />
      </div>
      {partida !== null && !partida.seHaMovido ? <span className="q-palanca-pista">{NOMBRES_DEL_QUIEBRO.pantalla.muevete}</span> : null}
      <div
        ref={rayo}
        role="button"
        aria-label={NOMBRE_DEL_RAYO}
        className="q-tecla rayo"
        onPointerDown={alPulsarElRayo}
        onPointerUp={alSoltarElRayo}
        onPointerCancel={alPerderElRayo}
        onLostPointerCapture={alPerderElRayo}
      >
        {aro}
        <svg className="carga" viewBox="0 0 100 100" aria-hidden="true">
          <g ref={rayoNiveles} className="niveles" />
          <circle ref={rayoCarga} cx="50" cy="50" r="46" strokeDasharray={CIRCUNFERENCIA_DEL_ARO} strokeDashoffset={CIRCUNFERENCIA_DEL_ARO} />
        </svg>
        <Icono de="rayo" />
        <span className="rotulo">{NOMBRE_DEL_RAYO}</span>
        <span ref={rayoSegundos} className="segundos" />
      </div>
      <div className="q-botones">
        <div
          ref={golpe}
          role="button"
          aria-label={n.golpe}
          className="q-tecla golpe"
          onPointerDown={alPulsar('golpe')}
          onPointerUp={alSoltarElBoton}
          onPointerCancel={alSoltarElBoton}
          onPointerLeave={alSalirDelBoton}
        >
          {aro}
          <span className="tanda" aria-hidden="true">
            {Array.from({ length: PUNTOS_DE_LA_TANDA }, (_, k) => (
              <i
                key={k}
                ref={(el) => {
                  tanda.current[k] = el;
                }}
              />
            ))}
          </span>
          <Icono de="golpe" />
          <span className="rotulo">{n.golpe}</span>
        </div>
        <div
          ref={quiebro}
          role="button"
          aria-label={n.quiebro}
          className="q-tecla quiebro"
          onPointerDown={alPulsar('quiebro')}
          onPointerUp={alSoltarElBoton}
          onPointerCancel={alSoltarElBoton}
          onPointerLeave={alSalirDelBoton}
        >
          {aro}
          <Icono de="quiebro" />
          <span className="rotulo">{n.quiebro}</span>
        </div>
        <div
          ref={empellon}
          role="button"
          aria-label={n.empellon}
          className="q-tecla empellon"
          onPointerDown={alPulsar('empellon')}
          onPointerUp={alSoltarElBoton}
          onPointerCancel={alSoltarElBoton}
          onPointerLeave={alSalirDelBoton}
        >
          {aro}
          <Icono de="empellon" />
          <span className="rotulo">{n.empellon}</span>
          <span ref={empellonSegundos} className="segundos" />
        </div>
        <div
          ref={usar}
          role="button"
          aria-label={n.usar}
          className="q-tecla usar"
          onPointerDown={alPulsar('usar')}
          onPointerUp={alSoltarElBoton}
          onPointerCancel={alSoltarElBoton}
          onLostPointerCapture={alSoltarElBoton}
        >
          {aro}
          <svg className="progreso" viewBox="0 0 100 100" aria-hidden="true">
            <circle ref={usarProgreso} cx="50" cy="50" r="46" strokeDasharray={CIRCUNFERENCIA_DEL_ARO} strokeDashoffset={CIRCUNFERENCIA_DEL_ARO} />
          </svg>
          <Icono de="usar" />
          <span ref={usarRotulo} className="rotulo">
            {n.usar}
          </span>
        </div>
      </div>
      <div className="q-tecla-aviso">
        <div
          role="button"
          aria-label={n.aviso}
          className="q-tecla aviso"
          onPointerDown={alPulsar('aviso')}
          onPointerUp={alSoltarElBoton}
          onPointerCancel={alSoltarElBoton}
          onPointerLeave={alSalirDelBoton}
        >
          {aro}
          <Icono de="aviso" />
          <span className="rotulo">{n.aviso}</span>
        </div>
      </div>
    </div>
  );
}
