/**
 * EL QUIEBRO EN EL ESCRITORIO: la mesa de la Sala convertida en el puerto que pide el juego, y el
 * juego a pantalla entera.
 *
 * ═══ QUÉ HACE ESTE PINTOR, Y QUÉ NO ═══
 *
 * El Quiebro no se pinta con una escena de `escenas/` como Riberas, el Burgo o Las Lindes: el juego
 * ENTERO —red, mandos, cámara, ciudad, efectos, sonido, HUD— vive en `src/quiebro/` y se monta con
 * `<Quiebro puerto incrustado alSalir />` (`docs/quiebro/ARQUITECTURA.md` §0.2 y §3.4). Lo mismo lo
 * monta el documento suelto que cargan la app y `/jugar`. Así que aquí no hay ni una regla ni un
 * píxel del juego. Hay tres cosas, y son las que sólo sabe hacer la Sala:
 *
 *   1. EL PUERTO. El juego no conoce `LaMesa` (`mesa.ts`): recibe un `PuertoDeMesa`
 *      (`quiebro/contrato.ts`), que es lo mismo dicho de forma que también lo pueda dar un anfitrión
 *      que no es este cliente. `puertoDeUnaMesa` es el adaptador, y está suelto y puro para que se
 *      pueda llamar sin montar nada.
 *   2. LA PANTALLA ENTERA, que es lo que el juego necesita para jugarse con ratón y teclado.
 *   3. EL RESPALDO Y LA MESA: el plano del barrio sobre el retablo cuando la noche no arranca, y la
 *      mesa de siempre cuando quien juega sale de la noche sin levantarse.
 *
 * ═══ A PANTALLA ENTERA, Y POR QUÉ NO CON LA CADENA DEL ALTO ═══
 *
 * Los otros tres pintores ponen su recuadro con la clase `lienzo-propio` y se enganchan a la cadena de
 * seis eslabones de `estilo.css` que reparte el alto desde la ventana hasta el recuadro. Esa cadena
 * existe porque ahí el tablero COMPARTE la página con otras cosas —el aviso, la cinta, los botones en
 * flujo del Burgo— y hay que repartirla. El Quiebro no comparte nada: es un juego de acción que quiere
 * cada píxel de la ventana y el ratón bloqueado, y lo que la Sala tiene que decir mientras tanto —el
 * aviso de la mesa— se pinta aquí encima. Así que su recuadro es una capa FIJA sobre la ventana, que no
 * depende de que ningún antepasado reparta bien: el fallo que la cadena ha dado dos veces —un tablero
 * de 566 por 9 píxeles con la batería en verde— aquí no tiene por dónde entrar.
 *
 * Por eso NO lleva `lienzo-propio`: `verify:escritorio` exige, con razón, que todo recuadro que la lleve
 * tenga sus dos eslabones en la hoja, y este recuadro no los necesita. Lo que sí hace, igual que los
 * otros tres, es AVISAR a la Sala de dónde ha quedado (`foco`): con el recuadro montado la Sala no pinta
 * su carril a un lado —quedaría debajo de la capa, con dos regiones vivas diciendo lo mismo— y al
 * sentarse le lleva el foco; al desmontarse, lo devuelve al título si se lo llevaba puesto.
 *
 * Mientras la capa está puesta, la página de debajo no rueda (`overflow: hidden` en el documento, y se
 * devuelve como estaba al quitarla): una rueda del ratón sobre el juego desplazaría la Sala de debajo
 * sin que se viera, y al salir de la noche la página estaría en otro sitio.
 *
 * ═══ EL JUEGO LLEGA EN SU PROPIO TROZO ═══
 *
 * `Quiebro.tsx` trae detrás la ciudad, los efectos, el posproceso y el sonido. Importado a pelo, todo eso
 * entraría en el paquete de la Sala para TODOS los arcades, y quien abre La Ronda lo bajaría sin
 * saberlo. Con `lazy` en el ámbito del módulo, el trozo sólo se pide cuando alguien se sienta a una mesa
 * de El Quiebro; y un trozo que no llega es un fallo del lienzo como cualquier otro: lo recoge
 * `LimiteDelMundo` y se juega sobre el plano.
 *
 * ═══ EL RESPALDO NO ES UNA CORTESÍA ═══
 *
 * La vista de El Quiebro trae su `TableroDeclarado`: el plano del barrio con el marcador en paneles. Si
 * el juego no arranca —sin WebGL, un sombreador que no compila, un trozo que no llega—, la mesa se
 * juega sobre el retablo de siempre, con las acciones que declara el tablero y, debajo, lo que las
 * opciones ofrecen y el tablero no pinta. Es la misma decisión de los otros tres pintores y del §6 de
 * cualquier diseño de esta casa: la escena es un lujo, no una dependencia.
 *
 * ═══ SALIR DE LA NOCHE NO ES LEVANTARSE DE LA MESA ═══
 *
 * El juego ofrece salir (`alSalir`) y eso quita la capa: queda la mesa de siempre —el plano, lo que se
 * puede hacer, y el carril de la Sala con el código, los sentados, la crónica, «Levantarse» y «Tirar la
 * mesa»— con un botón para volver. No se levanta a nadie: el asiento sigue, la sala del servidor sigue
 * contando y la noche sigue para los demás. Es el único camino al carril mientras se juega, y por eso
 * existe: con la capa puesta la Sala está debajo.
 *
 * «Otra mesa» (`alOtraMesa`, al acabar la noche) sí levanta: es `mesa.salir`, que deja el asiento y
 * devuelve al vestíbulo de la Sala, que es donde se abre una mesa nueva con su código. El juego no sabe
 * abrir mesas y no tiene por qué: el anfitrión sí.
 *
 * ═══ EL AVISO DE LA MESA, POR ENCIMA DEL JUEGO ═══
 *
 * La Sala pinta su aviso —«Se ha perdido la mesa… Reintentando», el motivo de un movimiento rechazado—
 * encima del pintor, y la capa lo tapa. Se repite aquí, abajo y sin coger el puntero, y con
 * `aria-hidden`: el de la Sala sigue en el árbol con su `role="alert"`, y dos regiones vivas diciendo lo
 * mismo se oirían dos veces.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, JSX } from 'react';
import type { MovimientoDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { Formulario, hayAlgoQuePintar } from './formulario';
import { LimiteDelMundo } from './lienzo-propio';
import { guardarElVeredicto } from './mesa';
import type { LaMesa } from './mesa';
import type { LoQueVeElPintor } from './pintores';
import { opcionesSueltas } from './plan';
import type { PuertoDeMesa, SalidaDelMovimiento } from './quiebro/contrato';
import { AccionesDelTablero, Retablo } from './retablo';

/*
 * EL JUEGO, TRAÍDO CUANDO SE PINTA. En el ámbito del módulo y no dentro del componente: un `lazy`
 * creado al pintar es un componente nuevo en cada repintado, y React desmontaría el juego entero —con
 * su contexto de dibujo y su canal— en cada vuelta del sondeo de la mesa.
 */
const ElQuiebro = lazy(() => import('./quiebro/Quiebro').then((m) => ({ default: m.Quiebro })));

// ---------------------------------------------------------------------------
// El puerto
// ---------------------------------------------------------------------------

/** Un puerto y cómo decirle a quien lo escucha que la mesa ha cambiado. */
export interface PuertoQueSeAvisa {
  readonly puerto: PuertoDeMesa;
  /** Avisa a todos los suscritos. Lo llama quien sabe que la mesa cambió. */
  readonly avisar: () => void;
  /** Cuántos escuchan ahora: para comprobar que suscribirse y darse de baja no se pierde nada. */
  readonly cuantosEscuchan: () => number;
}

/**
 * LA MESA DE LA SALA CON LA FORMA DEL PUERTO. `laDeAhora` devuelve la `LaMesa` vigente cada vez que se
 * llama, y el puerto la lee con `get` en el momento en que el juego pregunta: el contrato dice que los
 * campos son la foto de AHORA y que quien los usa no se guarda copias, y un objeto con los valores
 * copiados al crearlo sería exactamente una copia.
 *
 * Tres cosas que no son traducción literal, y por qué:
 *
 *   · `servidor` es `''`: el escritorio habla con la API en su mismo origen (en producción es el mismo
 *     Node; en desarrollo el Vite de al lado pasa `/api` y la subida de protocolo). Es lo que
 *     `mesa.ts` hace con sus rutas relativas.
 *   · Sin asiento no hay llave, y con asiento sí: si la Sala todavía no tiene la llave —o no la tiene
 *     nunca, en las mesas de mentira de un banco—, el puerto dice «sin asiento» entero y no media
 *     cosa. Una llave sin asiento, o un asiento sin llave, es un `hola` que la sala tiraría.
 *   · `motivo` va siempre vacío. `LaMesa.mover` devuelve CÓMO acabó y no POR QUÉ: el porqué lo escribe
 *     en su aviso, que este pintor enseña encima del juego. El contrato ya cuenta con ello: quien decide
 *     si reintentar es la vista, no el motivo.
 */
export function puertoDeUnaMesa(laDeAhora: () => LaMesa): PuertoQueSeAvisa {
  const escuchan = new Set<() => void>();
  const puesta = (): LaMesa['mesa'] => laDeAhora().mesa;
  const puerto: PuertoDeMesa = {
    get codigo(): string {
      return puesta()?.codigo ?? '';
    },
    get yo(): string | null {
      const m = laDeAhora();
      return m.mesa?.yo !== null && m.mesa?.yo !== undefined && typeof m.llave === 'string' ? m.mesa.yo : null;
    },
    get llave(): string | null {
      const m = laDeAhora();
      return m.mesa?.yo !== null && m.mesa?.yo !== undefined && typeof m.llave === 'string' ? m.llave : null;
    },
    servidor: '',
    get vista(): unknown {
      return puesta()?.vista ?? null;
    },
    get opciones() {
      /* `?? []` por lo que cuenta `sala.tsx`: un servidor anterior a la fase 5 no manda el campo. */
      return puesta()?.opciones ?? [];
    },
    get rev(): number {
      return puesta()?.rev ?? 0;
    },
    async mover(movimiento: MovimientoDeclarado): Promise<SalidaDelMovimiento> {
      const resultado = await laDeAhora().mover(movimiento);
      return { resultado, motivo: '' };
    },
    suscribir(avisar: () => void): () => void {
      /*
       * Envuelto, para que la MISMA función suscrita dos veces sean dos suscripciones y darse de baja
       * quite la suya y no la del otro: un `Set` de la función a secas las juntaría en una.
       */
      const suya = (): void => avisar();
      escuchan.add(suya);
      return () => {
        escuchan.delete(suya);
      };
    },
  };
  return {
    puerto,
    avisar: () => {
      /* Una copia: quien recibe el aviso puede darse de baja dentro de él. */
      for (const a of [...escuchan]) a();
    },
    cuantosEscuchan: () => escuchan.size,
  };
}

/**
 * EL PUERTO DE ESTA MESA, estable mientras el pintor viva, y avisando cuando la mesa cambia.
 *
 * ═══ LA ÚLTIMA MESA SE APUNTA AL PINTAR, Y ES A PROPÓSITO ═══
 *
 * El juego se pinta en la MISMA pasada que este pintor, y si lee `puerto.vista` al pintarse tiene que
 * ver la mesa de esta pasada, no la de la anterior. Apuntarla en un efecto la dejaría un repintado por
 * detrás. Una pasada que React tire sólo deja apuntada una mesa que ya había llegado por el sondeo, y
 * el aviso —que sí va en un efecto, después de pintar— sale únicamente cuando cambia de verdad lo que
 * el puerto enseña: la mesa, o la llave.
 */
function usarElPuertoDeLaMesa(mesa: LaMesa): PuertoDeMesa {
  const laUltima = useRef(mesa);
  laUltima.current = mesa;
  const { puerto, avisar } = useMemo(() => puertoDeUnaMesa(() => laUltima.current), []);
  const puesta = mesa.mesa;
  const llave = mesa.llave ?? null;
  useEffect(() => {
    avisar();
  }, [avisar, puesta, llave]);
  return puerto;
}

// ---------------------------------------------------------------------------
// La capa
// ---------------------------------------------------------------------------

/**
 * LA CAPA SOBRE LA VENTANA. Por encima de todo lo de la Sala (la hoja no pasa de `z-index: 5`), sin
 * marco y con el suelo de la casa: lo que se ve antes del primer fotograma es noche, no un blanco.
 * `touch-action: none` porque en una pantalla táctil de escritorio el gesto es del juego, no del
 * navegador.
 */
const LA_CAPA: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10,
  background: 'var(--suelo)',
  overflow: 'hidden',
  outline: 'none',
  touchAction: 'none',
};

/** El telón mientras llega el trozo del juego: el nombre y qué falta, no «cargando». */
const EL_TELON: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeContent: 'center',
  gap: '0.75rem',
  textAlign: 'center',
  color: 'var(--tenue)',
  pointerEvents: 'none',
};

/** El aviso de la mesa, abajo y en medio, sin coger el puntero. */
const EL_AVISO: CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: '1rem',
  transform: 'translateX(-50%)',
  margin: 0,
  maxWidth: 'min(70ch, calc(100% - 2rem))',
  pointerEvents: 'none',
};

/**
 * EL PINTOR. Tres pantallas, y quién decide cuál es este mismo render: el juego a pantalla entera; la
 * mesa, si quien juega salió de la noche; y el plano, si la noche no arrancó.
 */
export function QuiebroEnTres({ mesa, tablero, opciones, foco }: LoQueVeElPintor): JSX.Element {
  const { mover, quieto } = mesa;
  const puerto = usarElPuertoDeLaMesa(mesa);
  const [enLaNoche, ponerEnLaNoche] = useState(true);
  const [roto, ponerRoto] = useState<string | null>(null);

  /*
   * EL AVISO DE DÓNDE HA QUEDADO EL RECUADRO. Con `null` al soltarlo, que es como la Sala sabe que
   * vuelve a pintar su carril y que, si el foco estaba en la capa, lo lleva al título. `foco` es
   * opcional porque un banco o un comprobador pueden montar este pintor sin Sala alrededor.
   */
  const apuntarElRecuadro = useCallback(
    (recuadro: HTMLDivElement | null): void => {
      foco?.(recuadro);
      /*
       * AL VOLVER A LA NOCHE, EL FOCO VUELVE CON ELLA. La Sala lleva el foco al recuadro sólo al
       * sentarse; al volver desde la mesa, el botón pulsado se desmonta y el navegador suelta el foco
       * al `<body>` —medido: `BODY` tras «Volver a la noche»—, y con el teclado se empezaría a tabular
       * desde la cabecera de una Sala tapada. Sólo si el foco se ha caído: no se le quita a nadie.
       */
      if (recuadro !== null && (document.activeElement === null || document.activeElement === document.body)) {
        recuadro.focus();
      }
    },
    [foco],
  );

  const conLaCapa = enLaNoche && roto === null;
  useEffect(() => {
    if (!conLaCapa || typeof document === 'undefined') return undefined;
    const raiz = document.documentElement;
    const antes = raiz.style.overflow;
    raiz.style.overflow = 'hidden';
    return () => {
      raiz.style.overflow = antes;
    };
  }, [conLaCapa]);

  const salirDeLaNoche = useCallback(() => ponerEnLaNoche(false), []);
  /*
   * LO QUE MIDIÓ EL GOBERNADOR, COMO VEREDICTO DEL APARATO: `sobria` en N0 y `plena` en N1-N3. Es el
   * mismo que el lobby apunta al medir, y el que la compuerta de Boots on Board lee para sentar a este
   * navegador en otro juego: un PC que acaba de pintar la noche entera sabe mejor que nadie si llega.
   */
  const guardarLaMedida = useCallback((_nivel: 0 | 1 | 2 | 3, calidad: 'sobria' | 'plena') => guardarElVeredicto(calidad), []);
  const alFallar = useCallback((motivo: string) => ponerRoto(motivo), []);

  if (!conLaCapa) {
    const sueltas = opcionesSueltas(tablero, opciones);
    const nota =
      roto !== null
        ? `La noche en tres dimensiones no ha arrancado en este navegador: ${roto}. Se juega sobre el plano del barrio.`
        : 'Estás fuera de la noche y sigues sentado: la mesa y la noche siguen para todos. Aquí están el plano, lo que se puede hacer y, a un lado, la mesa.';
    return (
      <>
        <p className="letra-chica">{nota}</p>
        <button
          type="button"
          className="opcion opcion-secundaria"
          onClick={() => {
            ponerRoto(null);
            ponerEnLaNoche(true);
          }}
        >
          <span className="opcion-texto">
            <span className="opcion-rotulo">{roto !== null ? 'Volver a intentarlo' : 'Volver a la noche'}</span>
          </span>
        </button>
        <Retablo tablero={tablero} alTocar={mover} quieto={quieto} />
        <AccionesDelTablero tablero={tablero} alTocar={mover} quieto={quieto} />
        {/* Lo que decide es lo PINTABLE y no lo que llega: ver `hayAlgoQuePintar`. */}
        {hayAlgoQuePintar(sueltas) ? (
          <Formulario opciones={sueltas} alElegir={mover} quieto={quieto} titulo="Y además puedes" atajos={false} />
        ) : null}
      </>
    );
  }

  return (
    <div
      className="quiebro-en-tres"
      ref={apuntarElRecuadro}
      tabIndex={-1}
      role="application"
      aria-label="El Quiebro"
      style={LA_CAPA}
    >
      <LimiteDelMundo alFallar={alFallar}>
        <Suspense
          fallback={
            <div style={EL_TELON}>
              <p className="titulo">El Quiebro</p>
              <p>Bajando a la ciudad…</p>
            </div>
          }
        >
          <ElQuiebro
            puerto={puerto}
            incrustado={false}
            alSalir={salirDeLaNoche}
            alOtraMesa={mesa.salir}
            alMedir={guardarLaMedida}
          />
        </Suspense>
      </LimiteDelMundo>
      {mesa.aviso.length > 0 ? (
        <p className="aviso" aria-hidden="true" style={EL_AVISO}>
          {mesa.aviso}
        </p>
      ) : null}
    </div>
  );
}
