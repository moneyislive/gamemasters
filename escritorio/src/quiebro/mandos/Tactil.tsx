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
 *   · Los BOTONES en arco abajo a la derecha: GOLPE 88, QUIEBRO 72, EMPELLÓN 60 (con su recarga),
 *     USAR 64 (sólo cuando sirve, y se mantiene con un anillo de progreso) y AVISO 44 arriba.
 *   · OPCIÓN ZURDA: todo en espejo.
 *
 * Cada dedo es de quien lo cogió (`pointerId`): uno en la palanca y otro mirando a la vez no se pisan, y
 * un dedo que se va por encima de un botón no lo pulsa. Lo que cambia en cada fotograma (el pomo de la
 * palanca, si USAR se ve, sus anillos) se escribe en el DOM a mano desde un `requestAnimationFrame`, sin
 * pasar por React.
 *
 * ═══ AL IRSE, SE SUELTA TODO ═══
 *
 * Un dedo en la palanca cuando llega una llamada, o se baja la cortina de avisos, o se cambia de app, no
 * manda nunca su `pointerup`: el sistema se queda con el toque. Sin soltarlo aquí, la palanca seguiría
 * empujando al volver —y mientras tanto, si el aparato sigue en marcha, el asiento «jugaría» solo y la
 * sala no lo daría por ausente (ver `fondo.ts`)—. Así que al perder el foco, al ocultarse la pestaña, al
 * irse la página o al pasar la app al fondo se olvidan los tres dedos, la base de la palanca se esconde y
 * los mandos quedan a cero. El teclado ya lo hacía (`teclado.ts`); el táctil, no.
 */
import { useEffect, useRef } from 'react';
import type { JSX, PointerEvent as EventoDePuntero } from 'react';
import { NOMBRES_DEL_QUIEBRO } from '../../../../shared/arcade/juegos/quiebro-nombres';
import type { Partida } from '../red/partida';
import type { Boton, EstadoDeLosMandos } from './estado';
import { escucharElFondo } from './fondo';

/** El radio de la base de la palanca, en pt CSS (diseño §7). */
export const RADIO_DE_LA_PALANCA = 56;
/** La palanca vive en el 45 % izquierdo. */
export const ZONA_DE_LA_PALANCA = 0.45;
/** Radianes de giro por pt arrastrado: 0,35°. */
export const GIRO_POR_PT = (0.35 * Math.PI) / 180;

export interface PropsDelTactil {
  readonly mandos: EstadoDeLosMandos;
  readonly partida: Partida | null;
  readonly zurdo: boolean;
  /** La recarga del Empellón en ms (0 si no hay): para pintar su anillo. */
  readonly recargaDelEmpellonMs: number;
}

const CIRCUNFERENCIA = 2 * Math.PI * 46;

export function MandosTactiles({ mandos, partida, zurdo, recargaDelEmpellonMs }: PropsDelTactil): JSX.Element {
  const raiz = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const pomo = useRef<HTMLDivElement>(null);
  const usar = useRef<HTMLDivElement>(null);
  const usarRotulo = useRef<HTMLSpanElement>(null);
  const usarProgreso = useRef<SVGCircleElement>(null);
  const empellonRecarga = useRef<SVGCircleElement>(null);
  const dedos = useRef<{
    palanca: { id: number; x: number; y: number } | null;
    mirada: { id: number; x: number; y: number } | null;
    usar: number | null;
  }>({ palanca: null, mirada: null, usar: null });
  const ultimoEmpellon = useRef(Number.NEGATIVE_INFINITY);

  /* Lo que cambia por fotograma, fuera de React. */
  useEffect(() => {
    let vivo = true;
    let pedido = 0;
    const pintar = (): void => {
      if (!vivo) return;
      const ahora = performance.now();
      const uso = partida?.usoPosible(ahora) ?? null;
      if (usar.current !== null) usar.current.style.display = uso === null ? 'none' : 'grid';
      if (uso !== null && usarRotulo.current !== null) {
        const texto = NOMBRES_DEL_QUIEBRO.botones[uso.que === 'rematar' ? 'rematar' : uso.que === 'rescatar' ? 'rescatar' : 'descolgar'];
        if (usarRotulo.current.textContent !== texto) usarRotulo.current.textContent = texto;
      }
      const progreso = partida?.progresoDeUsar(ahora) ?? null;
      if (usarProgreso.current !== null) usarProgreso.current.style.strokeDashoffset = String(CIRCUNFERENCIA * (1 - (progreso ?? 0)));
      if (empellonRecarga.current !== null) {
        const falta = recargaDelEmpellonMs <= 0 ? 0 : Math.max(0, 1 - (ahora - ultimoEmpellon.current) / recargaDelEmpellonMs);
        empellonRecarga.current.style.strokeDashoffset = String(CIRCUNFERENCIA * (1 - falta));
      }
      pedido = requestAnimationFrame(pintar);
    };
    pedido = requestAnimationFrame(pintar);
    return () => {
      vivo = false;
      cancelAnimationFrame(pedido);
    };
  }, [partida, recargaDelEmpellonMs]);

  /* Al perder el foco o irse al fondo, los tres dedos se olvidan (ver la cabecera). */
  useEffect(() => {
    const soltarLosDedos = (): void => {
      const d = dedos.current;
      d.palanca = null;
      d.mirada = null;
      d.usar = null;
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
    if (boton === 'empellon') ultimoEmpellon.current = e.timeStamp;
    mandos.pulsar(boton, e.timeStamp);
  };

  const alSoltarElBoton = (e: EventoDePuntero<HTMLDivElement>): void => {
    e.currentTarget.classList.remove('pulsada');
    soltar(e);
  };

  const n = NOMBRES_DEL_QUIEBRO.botones;
  return (
    <div
      ref={raiz}
      className={zurdo ? 'q-tactil zurdo' : 'q-tactil'}
      onPointerDown={alBajarEnElFondo}
      onPointerMove={alMover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onLostPointerCapture={soltar}
    >
      <div ref={base} className="q-palanca-base">
        <div ref={pomo} className="q-palanca-pomo" />
      </div>
      {partida !== null && !partida.seHaMovido ? <span className="q-palanca-pista">{NOMBRES_DEL_QUIEBRO.pantalla.muevete}</span> : null}
      <div className="q-botones">
        <div role="button" aria-label={n.golpe} className="q-tecla golpe" onPointerDown={alPulsar('golpe')} onPointerUp={alSoltarElBoton} onPointerCancel={alSoltarElBoton}>
          <span>{n.golpe}</span>
        </div>
        <div role="button" aria-label={n.quiebro} className="q-tecla quiebro" onPointerDown={alPulsar('quiebro')} onPointerUp={alSoltarElBoton} onPointerCancel={alSoltarElBoton}>
          <span>{n.quiebro}</span>
        </div>
        <div role="button" aria-label={n.empellon} className="q-tecla empellon" onPointerDown={alPulsar('empellon')} onPointerUp={alSoltarElBoton} onPointerCancel={alSoltarElBoton}>
          <svg className="recarga" viewBox="0 0 100 100">
            <circle ref={empellonRecarga} cx="50" cy="50" r="46" strokeDasharray={CIRCUNFERENCIA} strokeDashoffset={CIRCUNFERENCIA} />
          </svg>
          <span>{n.empellon}</span>
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
          <svg className="progreso" viewBox="0 0 100 100">
            <circle ref={usarProgreso} cx="50" cy="50" r="46" strokeDasharray={CIRCUNFERENCIA} strokeDashoffset={CIRCUNFERENCIA} />
          </svg>
          <span ref={usarRotulo}>{n.usar}</span>
        </div>
      </div>
      <div className="q-tecla-aviso">
        <div role="button" aria-label={n.aviso} className="q-tecla aviso" onPointerDown={alPulsar('aviso')} onPointerUp={alSoltarElBoton} onPointerCancel={alSoltarElBoton}>
          <span>{n.aviso}</span>
        </div>
      </div>
    </div>
  );
}
