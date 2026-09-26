/**
 * LOS MANDOS TÁCTILES DE LA SALA: la palanca, «Correr» y «Golpear» para quien abre la Sala en el
 * navegador de un teléfono.
 *
 * ═══ EL HUECO QUE ESTO TAPA ═══
 *
 * Miguel abrió El Burgo, Riberas y Las Lindes en el navegador del móvil, bajó «Al hombro», el
 * avatar salía… y no había con qué moverlo: el cartel decía «W A S D». La app tiene palanca desde
 * hace tiempo (`app/src/arcade/mandos-del-paseo.tsx`), que escribe `MandosDeFuera`
 * (`escenas/paseo/mandos.ts`) en una referencia que la escena lee en su bucle; en la Sala web nadie
 * escribía esa referencia, así que en un teléfono sólo quedaba un teclado que no existe. Es la regla
 * de la casa al revés otra vez: ningún juego sólo para PC.
 *
 * ═══ LA MISMA REFERENCIA, CON LAS MISMAS REGLAS QUE LA APP ═══
 *
 *   · LA PALANCA reescribe la referencia en cada movimiento del dedo y COPIA los golpes y el correr
 *     tal cual: el otro pulgar puede haber golpeado entre dos movimientos de éste, y los golpes son
 *     una cuenta que sólo crece (ver «Y EL GOLPE SE DA» en `mandos.ts`). La zona muerta NO se aplica
 *     aquí: la aplica `mandosDelFotograma` en la escena (`ZONA_MUERTA`), igual para los dos clientes.
 *   · CORRER se enciende y se apaga: se ve encendido y no hay que mantenerlo.
 *   · GOLPEAR suma uno a `golpes`. Sólo sale con canal —en una mesa de botas—, que es la misma
 *     condición de la G del teclado en `usar-el-paseo.ts` y la del `BotonDeGolpear` de la app.
 *   · AL DEJAR DE ANDAR, TODO SUELTO: `SIN_MANDOS_DE_FUERA`, para que al volver a bajar nadie salga
 *     corriendo solo.
 *
 * ═══ POINTER EVENTS, Y TODO AL BAJAR EL DEDO ═══
 *
 * La palanca coge su dedo con `setPointerCapture`: un pulgar que se sale de la base sigue andando, y
 * el dedo es de quien lo cogió (`pointerId`), así que otro dedo que baja en «Golpear» no la suelta.
 * Los botones actúan en `pointerdown` y no en `click`: con un pulgar ya apoyado en la palanca, los
 * navegadores de móvil no sintetizan el `click` del segundo dedo, y golpear ANDANDO es la refriega
 * entera. El `click` se atiende sólo cuando viene del teclado (`detail === 0`), para que Intro y
 * Espacio sigan valiendo con un teclado conectado y el ratón no lo cuente dos veces.
 *
 * La palanca NACE DONDE BAJA EL DEDO, como en la app: se mide el arrastre desde ahí, no desde el
 * centro dibujado, que un pulgar no acierta.
 *
 * ═══ Y NO LE ROBA NADA AL LIENZO ═══
 *
 * La capa va ENCIMA del lienzo, como un botón más de la Sala: la cámara de mesa (`CamaraAerea`,
 * `lienzo-propio.tsx`) sólo atiende lo que empieza sobre el propio `<canvas>`, así que un dedo en la
 * palanca no gira nada. A pie, además, la cámara de mesa está callada y el giro es el de la palanca
 * hacia los lados, como en la app. Lo que queda entre los mandos no coge el puntero
 * (`pointer-events: none` en la capa) y sigue siendo tablero. `touch-action: none`, `user-select:
 * none` y el menú de «mantener pulsado» apagado: un pulgar apoyado un segundo no selecciona texto
 * ni saca la lupa del sistema.
 *
 * ═══ AL IRSE, SE SUELTA ═══
 *
 * Una llamada, la cortina de avisos o cambiar de pestaña se quedan con el dedo sin mandar su
 * `pointerup`, y la palanca seguiría empujando al volver. Al perder el foco o esconderse la página se
 * suelta la palanca (lo mismo que hace `quiebro/mandos/Tactil.tsx`).
 *
 * ═══ SÓLO EN UN APARATO TÁCTIL, Y SÓLO A PIE ═══
 *
 * `usarAparatoTactil`: puntero grueso (`(pointer: coarse)`) o toque (`navigator.maxTouchPoints`), y
 * reacciona si cambia —una tableta a la que se le engancha un ratón, o un portátil con pantalla
 * táctil en el que se toca por primera vez—. En la mesa no hay a quién mover y no se pinta; y cuando
 * no se pinta NO EXISTE, que un mando invisible que siguiera cogiendo el dedo taparía el tablero.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX, MouseEvent as EventoDeRaton, MutableRefObject, PointerEvent as EventoDePuntero } from 'react';
import { SIN_MANDOS_DE_FUERA } from '../../escenas/paseo/mandos';
import type { MandosDeFuera } from '../../escenas/paseo/mandos';

// ---------------------------------------------------------------------------
// Lo que se dice: el cartel de cómo se anda con el dedo
// ---------------------------------------------------------------------------

/** Cómo se anda en un aparato táctil: lo que dicen los tres carteles en vez de W A S D. */
export const COMO_SE_ANDA_CON_EL_DEDO = 'Arrastra la palanca para andar · Correr para ir deprisa';

/** Cómo se golpea con el dedo, en una mesa de botas: lo que va en vez de la G. */
export const COMO_SE_GOLPEA_CON_EL_DEDO = 'Golpear para pelear';

// ---------------------------------------------------------------------------
// La aritmética, sin DOM: lo que `verify:escritorio` ejecuta en Node
// ---------------------------------------------------------------------------

/**
 * LO QUE HAY QUE MOVER EL DEDO PARA IR A TOPE, en píxeles CSS: los 44 de la app, por lo mismo —menos
 * que un pulgar, y la zona muerta de un cuarto son once, que no es un temblor—.
 */
export const RECORRIDO_DE_LA_PALANCA = 44;

/**
 * DEL ARRASTRE A LA PALANCA: de píxeles de pantalla a −1…1. La `y` de pantalla crece hacia abajo, y
 * abajo es atrás; lo que pasa del recorrido se recorta en círculo, no en cuadrado, para que en
 * diagonal no se vaya más deprisa. Lo que no sea un número es la palanca suelta.
 */
export function palancaDelArrastre(dx: number, dy: number): { readonly x: number; readonly y: number } {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { x: 0, y: 0 };
  const largo = Math.hypot(dx, dy);
  const k = largo > RECORRIDO_DE_LA_PALANCA ? RECORRIDO_DE_LA_PALANCA / largo : 1;
  /* `+ 0` quita el −0 de un arrastre nulo: la palanca suelta es `{0, 0}`, sin signo. */
  return { x: (dx * k) / RECORRIDO_DE_LA_PALANCA + 0, y: (-dy * k) / RECORRIDO_DE_LA_PALANCA + 0 };
}

/** La referencia con la palanca nueva: el correr y los golpes, COPIADOS. Ver la cabecera. */
export function conLaPalanca(antes: MandosDeFuera, palanca: { readonly x: number; readonly y: number }): MandosDeFuera {
  return { palanca, deprisa: antes.deprisa, golpes: antes.golpes };
}

/** La referencia con el correr puesto o quitado: la palanca y los golpes, copiados. */
export function conElCorrer(antes: MandosDeFuera, deprisa: boolean): MandosDeFuera {
  return { palanca: antes.palanca, deprisa, golpes: antes.golpes };
}

/** La referencia con un golpe más: la cuenta sólo crece. */
export function conUnGolpeMas(antes: MandosDeFuera): MandosDeFuera {
  return { palanca: antes.palanca, deprisa: antes.deprisa, golpes: antes.golpes + 1 };
}

/** Lo que hace falta saber del aparato para decidir si es táctil: sin `window`, para poder probarlo. */
export interface ElAparato {
  /** Si `(pointer: coarse)` casa. */
  readonly punteroGrueso: boolean;
  /** `navigator.maxTouchPoints`, o `undefined` si el navegador no lo dice. */
  readonly puntosDeToque: number | undefined;
}

/** ¿SE TOCA? Puntero grueso, o algún punto de toque. */
export function esAparatoTactil(aparato: ElAparato): boolean {
  return aparato.punteroGrueso || (typeof aparato.puntosDeToque === 'number' && aparato.puntosDeToque > 0);
}

/** La consulta del puntero grueso. */
const PUNTERO_GRUESO = '(pointer: coarse)';

/** El aparato de esta ventana; fuera de un navegador (Node, `verify:escritorio`), ninguno. */
function elAparatoDeAqui(): ElAparato {
  if (typeof window === 'undefined') return { punteroGrueso: false, puntosDeToque: undefined };
  const grueso = typeof window.matchMedia === 'function' ? window.matchMedia(PUNTERO_GRUESO).matches : false;
  const puntos = typeof navigator !== 'undefined' ? navigator.maxTouchPoints : undefined;
  return { punteroGrueso: grueso, puntosDeToque: puntos };
}

/**
 * ¿ESTE APARATO SE TOCA? Y cambia si cambia: la consulta del puntero avisa cuando se engancha o se
 * suelta un ratón, y el primer `pointerdown` de un dedo lo enciende aunque la consulta dijera que no
 * —un portátil con pantalla táctil cuyo puntero principal es el ratón—. Una vez encendido por un dedo
 * no se apaga solo: quien ha tocado la pantalla puede volver a tocarla.
 */
export function usarAparatoTactil(): boolean {
  const [tactil, ponerTactil] = useState<boolean>(() => esAparatoTactil(elAparatoDeAqui()));
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const consulta = typeof window.matchMedia === 'function' ? window.matchMedia(PUNTERO_GRUESO) : null;
    let tocado = false;
    const mirar = (): void => {
      ponerTactil(tocado || esAparatoTactil(elAparatoDeAqui()));
    };
    const alTocar = (e: PointerEvent): void => {
      if (e.pointerType !== 'touch' || tocado) return;
      tocado = true;
      ponerTactil(true);
    };
    mirar();
    consulta?.addEventListener('change', mirar);
    window.addEventListener('pointerdown', alTocar, { capture: true, passive: true });
    return () => {
      consulta?.removeEventListener('change', mirar);
      window.removeEventListener('pointerdown', alTocar, { capture: true });
    };
  }, []);
  return tactil;
}

// ---------------------------------------------------------------------------
// Los mandos
// ---------------------------------------------------------------------------

export interface PropsDeLosMandosTactiles {
  /** Donde se escriben: la MISMA referencia que se le pasa a la escena por `mandos`. */
  readonly mandos: MutableRefObject<MandosDeFuera>;
  /** A pie Y en un aparato táctil. Si no, no se pinta nada y la referencia queda suelta. */
  readonly visibles: boolean;
  /** Con canal —una mesa de botas— sale «Golpear». Sin él no hay a quién golpear. */
  readonly conGolpe: boolean;
  /** Una clase más para la capa, para que cada lienzo la ponga donde no tape lo suyo. */
  readonly clase?: string;
}

/** Quita el menú de «mantener pulsado»: un pulgar apoyado no pide copiar nada. */
function sinMenu(e: EventoDeRaton): void {
  e.preventDefault();
}

export function MandosTactiles({ mandos, visibles, conGolpe, clase }: PropsDeLosMandosTactiles): JSX.Element | null {
  const [corriendo, ponerCorriendo] = useState(false);
  const [apretado, ponerApretado] = useState(false);
  /* El pomo se mueve a mano, sin React: son sesenta cambios por segundo. */
  const pomo = useRef<HTMLSpanElement | null>(null);
  /* El dedo de la palanca y dónde bajó. `null`: nadie la lleva. */
  const dedo = useRef<{ readonly id: number; readonly x: number; readonly y: number } | null>(null);

  const moverElPomo = useCallback((dx: number, dy: number): void => {
    const p = palancaDelArrastre(dx, dy);
    if (pomo.current !== null) {
      pomo.current.style.transform = `translate(${String(p.x * RECORRIDO_DE_LA_PALANCA)}px, ${String(-p.y * RECORRIDO_DE_LA_PALANCA)}px)`;
    }
    mandos.current = conLaPalanca(mandos.current, p);
  }, [mandos]);

  const soltarLaPalanca = useCallback((): void => {
    dedo.current = null;
    if (pomo.current !== null) pomo.current.style.transform = '';
    mandos.current = conLaPalanca(mandos.current, { x: 0, y: 0 });
  }, [mandos]);

  /* Al dejar de andar —o al dejar de ser táctil—, todo suelto: al volver a bajar nadie sale corriendo solo. */
  useEffect(() => {
    if (visibles) return;
    dedo.current = null;
    mandos.current = SIN_MANDOS_DE_FUERA;
    ponerCorriendo(false);
    ponerApretado(false);
  }, [mandos, visibles]);

  /* Al irse —otra pestaña, una llamada, la cortina de avisos— se suelta la palanca. Ver la cabecera. */
  useEffect(() => {
    if (!visibles || typeof window === 'undefined') return undefined;
    const alIrse = (): void => {
      if (dedo.current !== null) soltarLaPalanca();
      ponerApretado(false);
    };
    const alEsconderse = (): void => {
      if (document.visibilityState === 'hidden') alIrse();
    };
    window.addEventListener('blur', alIrse);
    document.addEventListener('visibilitychange', alEsconderse);
    return () => {
      window.removeEventListener('blur', alIrse);
      document.removeEventListener('visibilitychange', alEsconderse);
    };
  }, [visibles, soltarLaPalanca]);

  if (!visibles) return null;

  const alBajarEnLaPalanca = (e: EventoDePuntero<HTMLDivElement>): void => {
    /* Sin seleccionar texto, sin foco que robe el teclado y sin que el gesto le llegue a nadie más. */
    e.preventDefault();
    e.stopPropagation();
    if (dedo.current !== null) return;
    dedo.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* Un puntero que ya no existe: se anda igual mientras dure el arrastre. */
    }
    moverElPomo(0, 0);
  };
  const alMoverEnLaPalanca = (e: EventoDePuntero<HTMLDivElement>): void => {
    const d = dedo.current;
    if (d === null || d.id !== e.pointerId) return;
    e.preventDefault();
    moverElPomo(e.clientX - d.x, e.clientY - d.y);
  };
  const alSoltarLaPalanca = (e: EventoDePuntero<HTMLDivElement>): void => {
    const d = dedo.current;
    if (d === null || d.id !== e.pointerId) return;
    soltarLaPalanca();
  };

  const correr = (): void => {
    const ahora = !corriendo;
    ponerCorriendo(ahora);
    mandos.current = conElCorrer(mandos.current, ahora);
  };
  const golpear = (): void => {
    mandos.current = conUnGolpeMas(mandos.current);
  };

  return (
    <div className={clase === undefined ? 'mandos-tactiles' : `mandos-tactiles ${clase}`} onContextMenu={sinMenu}>
      <div
        className="mandos-tactiles-palanca"
        role="application"
        aria-label="Palanca para andar"
        aria-roledescription="palanca"
        title="Arrastra hacia arriba para andar, hacia abajo para retroceder y a los lados para girar."
        onPointerDown={alBajarEnLaPalanca}
        onPointerMove={alMoverEnLaPalanca}
        onPointerUp={alSoltarLaPalanca}
        onPointerCancel={alSoltarLaPalanca}
        onLostPointerCapture={alSoltarLaPalanca}
      >
        <span ref={pomo} className="mandos-tactiles-pomo" aria-hidden="true" />
      </div>
      <div className="mandos-tactiles-botones">
        {conGolpe ? (
          <button
            type="button"
            className={apretado ? 'mandos-tactiles-golpear mandos-tactiles-apretado' : 'mandos-tactiles-golpear'}
            title="Lanza un golpe hacia donde miras."
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              golpear();
              ponerApretado(true);
            }}
            onPointerUp={() => ponerApretado(false)}
            onPointerCancel={() => ponerApretado(false)}
            onPointerLeave={() => ponerApretado(false)}
            onClick={(e) => {
              /* Sólo el del teclado: el del dedo ya golpeó al bajar. Ver la cabecera. */
              if (e.detail === 0) golpear();
            }}
          >
            Golpear
          </button>
        ) : null}
        <button
          type="button"
          className={corriendo ? 'mandos-tactiles-correr mandos-tactiles-puesto' : 'mandos-tactiles-correr'}
          aria-pressed={corriendo}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            correr();
          }}
          onClick={(e) => {
            if (e.detail === 0) correr();
          }}
        >
          Correr
        </button>
      </div>
    </div>
  );
}
