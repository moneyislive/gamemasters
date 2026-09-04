/**
 * EL MUEBLE `formulario`, pintado con DOM de verdad.
 *
 * ═══ TODO LO QUE SABE ESTE COMPONENTE ═══
 *
 * Que le llega una lista de opciones y que cada una tiene rótulo, ayuda y un
 * movimiento dentro. Nada más. No sabe a qué se juega, ni cuántos son, ni si hay
 * cartas, ni si le toca a alguien: eso ya lo pensó `opciones(vista, quien)` en el
 * servidor, que recibió LA VISTA de este observador y devolvió lo que se puede
 * hacer AHORA con lo que ESTE observador sabe.
 *
 * Que sea así de tonto es la propiedad, no la limitación: es lo que hace que un
 * arcade que entró por `ARCADES_EXTERNOS` —que nadie de esta casa compiló y cuyas
 * reglas nadie de aquí ha leído— salga jugable en un PC sin tocar una línea.
 *
 * ═══ Y LO QUE NO HACE, QUE TAMBIÉN ESTÁ DECIDIDO ═══
 *
 * No ordena las opciones, no las agrupa, no esconde las que le parezcan raras y
 * no inventa ninguna. Un botón por opción, en el orden en que vinieron. Ordenar
 * sería una regla de juego escrita en el sitio equivocado, y esconder sería la
 * clase de mentira que este cliente existe para no contar.
 *
 * ═══ EL TECLADO, QUE ES LO QUE LO HACE DE ESCRITORIO ═══
 *
 * Las nueve primeras opciones responden a las teclas 1-9, y el número sale
 * escrito en el botón. En un móvil eso no existe y no se echa de menos; delante
 * de un teclado, tener que llevar el ratón a un botón que está a la vista es
 * exactamente lo que hace que una app de móvil estirada se sienta como una app
 * de móvil estirada.
 *
 * El atajo se pinta SOLO en los que lo tienen: un «10» junto a un botón que no
 * responde a ninguna tecla sería el mismo tipo de mentira, más pequeña. Y esa
 * misma vara se aplica ahora al estado QUIETO, que era donde este fichero la
 * incumplía nueve veces a la vez — ver «MIENTRAS HAY ALGO EN VUELO», abajo.
 *
 * ═══ LOS COLORES NO SE ELIGEN AQUÍ, SE DECLARA EL ESTADO ═══
 *
 * `.opcion` a secas dejó de ser una acción: es la ANATOMÍA más los colores del
 * quieto. Un botón vivo declara `.opcion-secundaria` —texto y borde en acento— y
 * uno apagado declara `.opcion-quieta`. Aquí van todos en secundaria y ninguno en
 * primaria a propósito: son muchos a la vez, los escribió el juego y no esta
 * pantalla, y ascender uno sería inventarse una jerarquía que el juego no
 * declaró (es el argumento de `tablero-en-linea.tsx:1426-1438`, aplicado al
 * revés: allí se resuelve quitando el acento a todos y aquí, dándoselo a todos).
 *
 * Lo que se gana con el cambio, medido en la hoja: el borde pasa de `--filo`
 * —1,23:1 contra su propio relleno y 1,41 contra el suelo, o sea que no había
 * límite de control y WCAG 1.4.11 pide 3:1— a `--acento` pleno: 4,58 violeta /
 * 8,44 ámbar / 7,96 verde / 4,94 carmesí. Sin ratón encima, que es siempre en
 * teclado y siempre en la primera mirada, la lista se lee por fin como una fila
 * de botones y no como texto suelto.
 */
import { useEffect, useId, useMemo } from 'react';
import type { MovimientoDeclarado } from '../../shared/mecanicas/tablero-declarado';

/**
 * UNA COSA QUE SE PUEDE HACER, TAL COMO LLEGA POR EL CABLE.
 *
 * Se declara aquí y NO se importa `Opcion` de `shared/arcade`, que es lo que
 * hacía este fichero. El tipo del contrato describe lo que un juego DEBE mandar;
 * lo que este cliente recibe es lo que un servidor —puede que de otra versión, o
 * un arcade de `ARCADES_EXTERNOS` que nadie de aquí compiló— le manda de verdad.
 * Importar el contrato hacía creer al compilador que `rotulo` y `ayuda` están
 * garantizados, y lo único garantizado es lo que se comprueba al pintarlo. Es la
 * misma declaración que la app tiene en `app/src/arcade/mesa.ts:103-117` y por la
 * misma razón escrita allí.
 *
 * Los cinco campos son los mismos y con los mismos nombres, así que un
 * `readonly Opcion[]` sigue entrando aquí sin conversión: lo que cambia no es la
 * forma, es de quién es la promesa.
 */
export interface OpcionQueLlega {
  id: string;
  tipo: string;
  carga: unknown;
  rotulo: string;
  ayuda: string;
}

export interface LoQueSeOfrece {
  opciones: readonly OpcionQueLlega[];
  alElegir: (movimiento: MovimientoDeclarado) => void;
  /** Hay una petición en vuelo: los botones no aceptan un segundo empujón. */
  quieto: boolean;
  /** Si esto es el mueble entero o el panel de acciones de un tablero. */
  titulo?: string;
}

/** Hasta dónde llegan los atajos. Después del 9 no hay tecla que valga. */
const CON_ATAJO = 9;

/** Una opción ya comprobada: lo que de verdad se puede pintar y mandar. */
interface OpcionPintable {
  /** La clave de la lista de React. Estable si el servidor manda ids estables. */
  clave: string;
  /** El movimiento entero, tal como se manda. Aquí no se traduce nada. */
  movimiento: MovimientoDeclarado;
  rotulo: string;
  /** Vacía si no vino, y entonces no se pinta el renglón. */
  ayuda: string;
}

/**
 * ═══ LA GUARDA, Y POR QUÉ VA AQUÍ Y NO EN EL TIPO ═══
 *
 * `sala.tsx` puso su `?? []` un nivel más afuera —el campo `opciones` puede no
 * venir de un servidor viejo— y razonó por extenso que sin él se cae la Sala
 * entera y no sólo la mesa. DENTRO de cada opción no lo tapaba nadie: `o.ayuda.length`
 * sobre una opción sin `ayuda` es un `TypeError` al pintar, y este cliente lo
 * convierte en la pantalla de `RedDeSeguridad` con el catálogo incluido.
 *
 * QUÉ SE DEJA PASAR Y QUÉ NO, dicho entero porque la casa prohíbe esconder:
 *
 *   · Lo que no es ni un objeto —un `null` o un número dentro del array— no se
 *     pinta. Y eso NO es esconder un movimiento: no hay ningún movimiento ahí
 *     dentro que esconder, no hay ni tipo que mandar ni rótulo que leer.
 *   · Todo lo demás SÍ se pinta, incluso con el `tipo` roto. Un botón que el
 *     reductor rechazará es peor que ninguno sólo si nadie lo explica, y aquí sí
 *     lo explica: `mesa.ts` compara la `rev` de vuelta y escribe «ese movimiento
 *     no se ha podido hacer». Filtrarlo sería este cliente decidiendo que un
 *     movimiento legal no existe, que es exactamente lo que la cabecera prohíbe.
 *   · El rótulo que falta se sustituye por el `id` —que por contrato sale del
 *     vocabulario público del juego— y, si tampoco lo hay, por su número de
 *     orden. Un botón sin nombre accesible no se puede pulsar con lector de
 *     pantalla; y ese número es lo único cierto que esta pantalla sabe decir de
 *     una opción que llegó vacía, así que no es prosa inventada.
 *
 * Y LAS CLAVES: `key={o.id}` daba por hecho que los ids vienen y son distintos.
 * Dos iguales desincronizan la lista de React sin decir nada. Se usa el id
 * mientras sea una cadena con contenido y no se haya visto ya; si no, el orden.
 */
function loQueSePuedePintar(opciones: readonly OpcionQueLlega[]): OpcionPintable[] {
  /*
   * El array entra por el cable, así que se recorre como `unknown`: leerlo con el
   * tipo puesto es justamente lo que impedía escribir estas comprobaciones.
   */
  const crudas: readonly unknown[] = opciones;
  const vistas = new Set<string>();
  const pintables: OpcionPintable[] = [];

  crudas.forEach((cruda, i) => {
    if (typeof cruda !== 'object' || cruda === null) return;
    const o = cruda as Partial<OpcionQueLlega>;

    const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : '';
    const clave = id.length > 0 && !vistas.has(id) ? id : `sin-clave-${String(i)}`;
    vistas.add(clave);

    /*
     * El número de reserva es el SITIO EN LA LISTA PINTADA y no el que traía en
     * el cable: es el mismo que lleva escrito su tecla de atajo al lado, y dos
     * números distintos en el mismo botón serían otra mentira pequeña.
     */
    const rotulo =
      typeof o.rotulo === 'string' && o.rotulo.trim().length > 0
        ? o.rotulo
        : id.length > 0
          ? id
          : `Opción ${String(pintables.length + 1)}`;

    pintables.push({
      clave,
      /*
       * Un `tipo` que no es una cadena no es ningún movimiento del contrato, y
       * la cadena vacía tampoco: el reductor lo rechaza y la mesa lo dice. Lo que
       * no se hace es convertirlo con `String()`, que mandaría el tipo
       * «undefined» como si fuera un movimiento con nombre.
       */
      movimiento: { tipo: typeof o.tipo === 'string' ? o.tipo : '', carga: o.carga },
      rotulo,
      ayuda: typeof o.ayuda === 'string' ? o.ayuda : '',
    });
  });

  return pintables;
}

export function Formulario({ opciones, alElegir, quieto, titulo }: LoQueSeOfrece): JSX.Element {
  /*
   * Los `id` de los rótulos y las ayudas salen de `useId` y no de un contador
   * propio porque este mueble se pinta DOS VECES en la misma pantalla —debajo del
   * tablero va «Y además puedes»— y dos `aria-labelledby` apuntando al mismo id
   * harían que la mitad de los botones se llamaran como los de arriba.
   */
  const base = useId();
  const pintables = useMemo(() => loQueSePuedePintar(opciones), [opciones]);

  /*
   * El atajo se registra en la ventana y no en un contenedor con `tabIndex`,
   * porque quien juega no tiene por qué haber hecho clic en ningún sitio antes
   * de que el teclado funcione.
   *
   * ═══ DE QUÉ SE DEFIENDE LA GUARDA DE FOCO, DICHO SIN INVENTAR ═══
   *
   * Aquí ponía que si no, «teclear un nombre de jugador dispararía movimientos».
   * Eso no puede pasar: los dos únicos `<input>` del cliente están en el
   * vestíbulo (`sala.tsx:456` y `512`) y el vestíbulo devuelve antes de la mesa
   * puesta (`sala.tsx:283`), así que no coexisten nunca. La defensa es correcta y
   * la razón era falsa, que es peor que no tenerla: quien la lea creerá que el
   * caso está cubierto y no añadirá el control siguiente.
   *
   * La razón de verdad es que un `keydown` en la ventana se lo lleva TODO, y esta
   * pantalla no sabe qué controles tendrá mañana. Por eso ahora la lista es la
   * completa —campo de texto, área, DESPLEGABLE y cualquier cosa editable— y no
   * los dos que hoy existen. El `<select>` de los plazos (`sala.tsx:475`) es hoy
   * el caso latente: con él enfocado, teclear un dígito para saltar a una opción
   * de la lista mandaría un movimiento.
   *
   * Y `e.repeat` fuera, que es lo que evita la carrera de verdad: `ponerQuieto(true)`
   * es una actualización de estado y no un cerrojo, así que una tecla MANTENIDA
   * dispara ~30 veces por segundo y varias salen antes de que React vuelva a
   * pintar. La segunda viaja con la `rev` vieja y el servidor la devuelve rancia,
   * que es exactamente lo que `quieto` existe para evitar.
   */
  useEffect(() => {
    if (quieto) return;
    const alPulsar = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const activo = document.activeElement;
      if (
        activo instanceof HTMLInputElement ||
        activo instanceof HTMLTextAreaElement ||
        activo instanceof HTMLSelectElement ||
        (activo instanceof HTMLElement && activo.isContentEditable)
      ) {
        return;
      }
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > CON_ATAJO) return;
      /*
       * SE CUENTA SOBRE LO PINTADO Y NO SOBRE LO QUE LLEGÓ. Si una entrada del
       * cable no era ni un objeto y no se pintó, el «3» tiene que disparar el
       * tercer BOTÓN, que es el que lleva el 3 escrito. Contar sobre la lista
       * cruda desplazaría los atajos justo en el caso raro.
       */
      const elegida = pintables[n - 1];
      if (elegida === undefined) return;
      e.preventDefault();
      alElegir(elegida.movimiento);
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, [pintables, alElegir, quieto]);

  if (pintables.length === 0) {
    /*
     * CERO OPCIONES SE DICE, no se rellena. Es el caso normal cuando le toca a
     * otro, y también el caso raro de un arcade que declara mueble genérico y no
     * publica `opciones()`. Inventar aquí un botón de «empezar» —que es la
     * tentación evidente— sería este cliente ofreciendo un movimiento que el
     * juego no ofreció, y el reductor lo rechazaría en silencio.
     */
    return (
      <div className="formulario">
        {titulo === undefined ? null : <h2 className="rotulo-de-panel">{titulo}</h2>}
        <p className="nada-que-hacer">Ahora mismo no hay nada que puedas hacer en esta mesa.</p>
      </div>
    );
  }

  return (
    <div className="formulario">
      {titulo === undefined ? null : <h2 className="rotulo-de-panel">{titulo}</h2>}
      {/*
        `role="list"` porque `.opciones` lleva `list-style: none`, y Safari +
        VoiceOver le quitan por eso la semántica de lista: dejan de anunciar
        «lista de 5 elementos». Aquí ese número ES información —dice cuántas
        salidas tiene la mesa— y se recupera en el marcado, que es donde la hoja
        de estilo dice que hay que recuperarlo.
      */}
      <ul className="opciones" role="list">
        {pintables.map((o, i) => {
          const conAtajo = i < CON_ATAJO;
          const idRotulo = `${base}-rotulo-${String(i)}`;
          const idAyuda = `${base}-ayuda-${String(i)}`;
          return (
            <li key={o.clave}>
              {/*
                ═══ MIENTRAS HAY ALGO EN VUELO: `aria-disabled`, NO `disabled` ═══

                Con `disabled`, un `<button>` que lo recibe TENIENDO EL FOCO lo
                pierde, el foco cae en `<body>` y volver a `quieto: false` no lo
                devuelve. O sea que llegar con el tabulador a la tercera opción y
                pulsar Intro te manda al principio del documento en cada jugada, y
                hay que tabular otra vez desde la cabecera. En el cliente cuya
                tesis es el teclado, eso no es un detalle.

                `aria-disabled` lo cuenta igual de bien al lector de pantalla,
                conserva el foco donde estaba, y quien ignora el clic es este
                `onClick`. La pinta de apagado la pone `.opcion-quieta`, que es la
                clase que existe para apagar SIN `disabled`.

                Y CON ESO SE DEJA DE MENTIR CON LOS ATAJOS. El efecto de arriba no
                se registra mientras `quieto`, así que las nueve teclas estaban
                pintadas y ninguna respondía. Ahora el estado apagado le quita el
                acento a la tecla —`.opcion-quieta .atajo`: `--tenue` sobre
                `--suelo`, 6,49:1, legible y sin acento— y en esta Sala el acento
                significa «esto se puede tocar». La tecla dice que no está viva
                mientras no lo está, y `aria-keyshortcuts` desaparece a la vez para
                no prometérselo tampoco a quien no mira.
              */}
              <button
                type="button"
                className={quieto ? 'opcion opcion-quieta' : 'opcion opcion-secundaria'}
                aria-disabled={quieto}
                /*
                 * EL NOMBRE ES EL RÓTULO Y LA PISTA ES LA AYUDA, separados a mano
                 * como los separa la app (`accessibilityLabel` / `accessibilityHint`).
                 * Antes el nombre se componía solo y salía «1 Pasar Deja el turno
                 * al siguiente» —el dígito del atajo dentro— y encima el `title`
                 * repetía la ayuda como descripción: dos lecturas de la misma
                 * frase por botón. El `title` se ha ido entero: la ayuda ya está
                 * escrita debajo del rótulo, y un `title` no sale NUNCA con el
                 * teclado, que es el aparato de este cliente.
                 */
                aria-labelledby={idRotulo}
                aria-describedby={o.ayuda.length > 0 ? idAyuda : undefined}
                aria-keyshortcuts={conAtajo && !quieto ? String(i + 1) : undefined}
                onClick={() => {
                  if (quieto) return;
                  alElegir(o.movimiento);
                }}
              >
                {/*
                  La tecla se esconde del lector de pantalla: es pintura de un
                  atajo que ya está declarado en `aria-keyshortcuts`, y dentro del
                  nombre del botón sólo sería un dígito delante de cada opción.
                */}
                {conAtajo ? (
                  <kbd className="atajo" aria-hidden="true">
                    {i + 1}
                  </kbd>
                ) : null}
                <span className="opcion-texto">
                  <span className="opcion-rotulo" id={idRotulo}>
                    {o.rotulo}
                  </span>
                  {o.ayuda.length > 0 ? (
                    <span className="opcion-ayuda" id={idAyuda}>
                      {o.ayuda}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
