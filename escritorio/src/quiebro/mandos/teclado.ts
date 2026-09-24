/**
 * LOS MANDOS DE PC: teclado y ratón (diseño §7), escritos en el mismo `EstadoDeLosMandos` que el táctil.
 *
 * ═══ LA TABLA ═══
 *
 *   WASD / flechas .... moverse, relativo a la cámara
 *   ratón ............. mirar, con el puntero bloqueado (si el navegador no lo deja: arrastrar con el
 *                       botón derecho, y entonces el clic derecho mira y NO quiebra: el quiebro queda en
 *                       Espacio y K, que siempre están)
 *   clic izq. / J ..... GOLPE
 *   Espacio / clic der. / K ... QUIEBRO
 *   F / L ............. EMPELLÓN
 *   E (mantener) ...... USAR
 *   Mayúsculas ........ correr
 *   Q ................. AVISO
 *   Tab ............... marcador
 *   Esc ............... soltar el ratón (lo hace el navegador)
 *
 * Se leen por `event.code` —la TECLA, no la letra—: en un teclado francés la W está donde la Z, y quien
 * juega con WASD pone los dedos en el mismo sitio en todos.
 *
 * ═══ LA HORA ES LA DEL EVENTO ═══
 *
 * Cada pulsación va con `event.timeStamp` (ver `estado.ts`). Y una tecla mantenida repite `keydown`: la
 * repetición NO es otra pulsación (`event.repeat`), o mantener la J sería una Tanda de aporreo.
 *
 * ═══ EL PRIMER CLIC SÓLO BLOQUEA ═══
 *
 * Con el ratón suelto, el primer clic sobre el lienzo pide bloquearlo y no golpea: nadie quiere que
 * «coger el ratón» sea un Empellón al aire. Con el ratón ya bloqueado, cada clic es lo que dice la tabla.
 */
import type { EstadoDeLosMandos } from './estado';
import { escucharElFondo } from './fondo';

/** Radianes por píxel de ratón bloqueado. */
const GIRO_POR_PIXEL = 0.0022;
const CABECEO_POR_PIXEL = 0.0018;
/** Radianes por píxel arrastrando (sin bloqueo el ratón va por la pantalla, más despacio). */
const GIRO_POR_PIXEL_ARRASTRANDO = 0.005;

export interface OpcionesDelTeclado {
  /** El elemento sobre el que se mira con el ratón (el lienzo o su marco). */
  readonly superficie: HTMLElement;
  /** Tab: abrir o cerrar el marcador. */
  readonly alMarcador?: (abierto: boolean) => void;
  /** Esc con el ratón suelto: abrir el menú. */
  readonly alMenu?: () => void;
  /** ¿Se juega ahora? Fuera de la pelea el teclado no mueve a nadie (la reunión, la pausa). */
  readonly activo: () => boolean;
}

/** Engancha el teclado y el ratón. Devuelve cómo soltarlos. */
export function engancharElTeclado(mandos: EstadoDeLosMandos, o: OpcionesDelTeclado): () => void {
  const pulsadas = new Set<string>();
  let arrastrando = false;
  let arrastreX = 0;
  let arrastreY = 0;
  let bloqueoFallido = false;

  const bloqueado = (): boolean => typeof document !== 'undefined' && document.pointerLockElement === o.superficie;

  const recalcularPalanca = (ahora: number): void => {
    const x = (pulsadas.has('KeyD') || pulsadas.has('ArrowRight') ? 1 : 0) - (pulsadas.has('KeyA') || pulsadas.has('ArrowLeft') ? 1 : 0);
    const y = (pulsadas.has('KeyW') || pulsadas.has('ArrowUp') ? 1 : 0) - (pulsadas.has('KeyS') || pulsadas.has('ArrowDown') ? 1 : 0);
    const largo = Math.hypot(x, y);
    /* Con teclas la palanca va siempre a fondo: WASD trota, Mayúsculas corre (diseño §7). */
    mandos.ponerPalanca(largo === 0 ? 0 : (x / largo) * 0.8, largo === 0 ? 0 : (y / largo) * 0.8, ahora);
    mandos.correrPedido = pulsadas.has('ShiftLeft') || pulsadas.has('ShiftRight');
  };

  const alBajar = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Tab') {
      e.preventDefault();
      if (!e.repeat) {
        mandos.marcador = !mandos.marcador;
        o.alMarcador?.(mandos.marcador);
      }
      return;
    }
    if (e.code === 'Escape') {
      if (!bloqueado()) o.alMenu?.();
      return;
    }
    if (!o.activo()) return;
    mandos.tipo = 'teclado';
    if (e.code === 'Space') e.preventDefault();
    if (!e.repeat) {
      switch (e.code) {
        case 'KeyJ':
          mandos.pulsar('golpe', e.timeStamp);
          break;
        case 'Space':
        case 'KeyK':
          mandos.pulsar('quiebro', e.timeStamp);
          break;
        case 'KeyF':
        case 'KeyL':
          mandos.pulsar('empellon', e.timeStamp);
          break;
        case 'KeyE':
          mandos.pulsar('usar', e.timeStamp);
          break;
        case 'KeyQ':
          mandos.pulsar('aviso', e.timeStamp);
          break;
        default:
          break;
      }
    }
    pulsadas.add(e.code);
    recalcularPalanca(e.timeStamp);
  };

  const alSubir = (e: KeyboardEvent): void => {
    pulsadas.delete(e.code);
    if (e.code === 'KeyE') mandos.soltarUsar();
    recalcularPalanca(e.timeStamp);
  };

  const alBajarElRaton = (e: MouseEvent): void => {
    if (!o.activo()) return;
    mandos.tipo = 'teclado';
    if (!bloqueado()) {
      if (e.button === 2 || bloqueoFallido) {
        /* Sin bloqueo: el derecho arrastra para mirar. */
        if (e.button === 2) {
          arrastrando = true;
          arrastreX = e.clientX;
          arrastreY = e.clientY;
        }
        if (bloqueoFallido && e.button === 0) mandos.pulsar('golpe', e.timeStamp);
        return;
      }
      const pedido = o.superficie.requestPointerLock?.();
      /* En los navegadores nuevos devuelve una promesa que puede fallar (un marco sin permiso). */
      if (pedido !== undefined && typeof (pedido as Promise<void>).catch === 'function') {
        (pedido as Promise<void>).catch(() => {
          bloqueoFallido = true;
        });
      }
      return;
    }
    if (e.button === 0) mandos.pulsar('golpe', e.timeStamp);
    else if (e.button === 2) mandos.pulsar('quiebro', e.timeStamp);
  };

  const alSubirElRaton = (e: MouseEvent): void => {
    if (e.button === 2) arrastrando = false;
  };

  const alMoverElRaton = (e: MouseEvent): void => {
    if (bloqueado()) {
      mandos.mirar(e.movementX * GIRO_POR_PIXEL, e.movementY * CABECEO_POR_PIXEL, e.timeStamp);
      return;
    }
    if (arrastrando) {
      mandos.mirar((e.clientX - arrastreX) * GIRO_POR_PIXEL_ARRASTRANDO, (e.clientY - arrastreY) * GIRO_POR_PIXEL_ARRASTRANDO * 0.8, e.timeStamp);
      arrastreX = e.clientX;
      arrastreY = e.clientY;
    }
  };

  const sinMenu = (e: Event): void => e.preventDefault();
  const alErrorDelBloqueo = (): void => {
    bloqueoFallido = true;
  };
  const alPerderElFoco = (): void => {
    pulsadas.clear();
    arrastrando = false;
    mandos.soltarTodo();
  };

  window.addEventListener('keydown', alBajar);
  window.addEventListener('keyup', alSubir);
  window.addEventListener('blur', alPerderElFoco);
  /* La pestaña oculta, la página que se va o la app al fondo (`fondo.ts`): lo mismo, y a la vuelta nada pulsado. */
  const dejarElFondo = escucharElFondo((alFondo) => {
    if (alFondo) alPerderElFoco();
  });
  document.addEventListener('pointerlockerror', alErrorDelBloqueo);
  o.superficie.addEventListener('mousedown', alBajarElRaton);
  window.addEventListener('mouseup', alSubirElRaton);
  window.addEventListener('mousemove', alMoverElRaton);
  o.superficie.addEventListener('contextmenu', sinMenu);

  return () => {
    window.removeEventListener('keydown', alBajar);
    window.removeEventListener('keyup', alSubir);
    window.removeEventListener('blur', alPerderElFoco);
    dejarElFondo();
    document.removeEventListener('pointerlockerror', alErrorDelBloqueo);
    o.superficie.removeEventListener('mousedown', alBajarElRaton);
    window.removeEventListener('mouseup', alSubirElRaton);
    window.removeEventListener('mousemove', alMoverElRaton);
    o.superficie.removeEventListener('contextmenu', sinMenu);
    if (bloqueado()) document.exitPointerLock();
  };
}
