/**
 * LA SALA, montada: qué pantalla toca y qué se ve en cada una.
 *
 * ═══ POR QUÉ HAY DIRECCIONES Y NO PESTAÑAS ═══
 *
 * Un PC tiene barra de direcciones, botón de atrás y la costumbre de pegar
 * enlaces en un chat. La app de móvil no tiene nada de eso y por eso navega por
 * pantallas; aquí, cada arcade es una dirección (`/sala/riberas`) y el código de
 * una mesa cabe en ella (`/sala/riberas?codigo=ABCDE`). Eso convierte «te paso
 * el código» en «te paso el enlace», que es lo que hace la gente delante de un
 * teclado.
 *
 * El enrutado es de veinte líneas y a mano. No entra `react-router` —que sí usa
 * el taller— porque este cliente no es de la familia del taller: son dos
 * pantallas y una consulta, y una dependencia con su propio modelo mental sale
 * más cara que las veinte líneas.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ClicDeReact } from 'react';
import { Catalogo, usarElCatalogo } from './catalogo';
import type { ElCatalogo } from './catalogo';
import { Formulario } from './formulario';
import { haEmpezado } from './empezada';
import { usarMesaDeArcade } from './mesa';
import type { FaseDeLaMesa, LaMesa } from './mesa';
import { Muelle } from './muelle';
import { dondeSeJuega } from './muebles';
import { temaDelMuelle, tieneMuelle } from '../../escenas/embarcadero/tema';
import type { ArcadeDelCatalogo } from './muebles';
import { opcionesSueltas, queSePinta } from './plan';
import type { Opcion } from '../../shared/arcade';
/*
 * De `riberas.ts` y no del índice de `juegos/`: el índice INSTALA todos los arcades
 * al cargarse, y eso es cosa del servidor. Aquí sólo hace falta el nombre.
 */
import { RIBERAS } from '../../shared/arcade/juegos/riberas';
import type { MovimientoDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { cuantoQueda } from './relojes';
import { AccionesDelTablero, Paneles, Retablo } from './retablo';
import { MarcadorDeRiberas, RiberasEnTres } from './riberas-en-tres';
/* Los dos retoques de pantalla del §1.11 y de la decisión 17, medibles desde Node. */
import { elPregonEnTres, panelesEnTres, panelesFueraDelPregon } from '../../shared/arcade/juegos/riberas-en-tres';

/** La acera de este cliente dentro del servicio. Ver `vite.config.ts`. */
export const BASE = '/sala';

/**
 * EL RÓTULO DE LA CRÓNICA, Y ESTÁ AQUÍ PARA QUE SE DIGA UNA VEZ: encabeza el panel y es el
 * nombre accesible de la lista, y con las dos cadenas escritas aparte se separan el día que
 * alguien cambie una. Por qué ya no dice «Lo que ha pasado», entero en `LaCronica`.
 */
export const AVISOS_DE_LA_MESA = 'Avisos de la mesa';

export type Donde =
  | { que: 'catalogo'; silla: string }
  | { que: 'mesa'; arcade: string; silla: string; codigo: string };

/**
 * Qué pide esta dirección. Función pura para poder probarla sin navegador.
 *
 * `silla` es lo que permite dos ventanas del mismo navegador en la misma mesa
 * sin pisarse el asiento; ver la cabecera de `bolsillo.ts`, que es donde eso
 * duele.
 */
export function loQuePide(camino: string, busqueda: string): Donde {
  const parametros = new URLSearchParams(busqueda);
  const silla = (parametros.get('silla') ?? '').trim();
  const codigo = (parametros.get('codigo') ?? '').trim().toUpperCase();

  const sinBase = camino.startsWith(BASE) ? camino.slice(BASE.length) : camino;
  const trozos = sinBase.split('/').filter((t) => t.length > 0);
  const primero = trozos[0];
  if (primero === undefined) return { que: 'catalogo', silla };
  return { que: 'mesa', arcade: decodeURIComponent(primero), silla, codigo };
}

export function Sala(): JSX.Element {
  const [donde, ponerDonde] = useState<Donde>(() =>
    loQuePide(window.location.pathname, window.location.search),
  );
  const { catalogo, reintentar } = usarElCatalogo();

  const mirarLaBarra = useCallback(() => {
    ponerDonde(loQuePide(window.location.pathname, window.location.search));
  }, []);

  useEffect(() => {
    window.addEventListener('popstate', mirarLaBarra);
    return () => {
      window.removeEventListener('popstate', mirarLaBarra);
    };
  }, [mirarLaBarra]);

  /*
   * Los enlaces internos se interceptan en la raíz en vez de sustituirse por
   * botones: así siguen siendo `<a href>` de verdad —se pueden abrir en otra
   * pestaña con el botón central, copiar con el derecho, y los lee un lector de
   * pantalla como lo que son— y aun así no recargan la página entera.
   *
   * Se respeta cualquier clic con modificador: un `Ctrl+clic` significa «ábrelo
   * en otra pestaña», y comérselo es la clase de detalle que hace que una web se
   * sienta ajena al navegador que la enseña.
   */
  const alPulsarUnEnlace = useCallback(
    (e: ClicDeReact<HTMLDivElement>) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const destino = (e.target as HTMLElement).closest('a');
      if (destino === null) return;
      const href = destino.getAttribute('href');
      if (href === null || !href.startsWith(`${BASE}/`)) return;
      e.preventDefault();
      window.history.pushState(null, '', href);
      mirarLaBarra();
    },
    [mirarLaBarra],
  );

  return (
    <div className="sala" onClick={alPulsarUnEnlace}>
      <header className="cabecera">
        <a className="vuelta" href={`${BASE}/${sufijoDeSilla(donde.silla)}`}>
          Sala de Arcade
        </a>
        {donde.silla.length > 0 ? <span className="silla">silla «{donde.silla}»</span> : null}
      </header>

      {donde.que === 'catalogo' ? (
        <main className="dentro">
          {/*
            ═══ EL PRIMER ENCABEZADO DEL DOCUMENTO ERA UN `<h2>` DE TARJETA ═══

            En esta pantalla no había ningún `<h1>`: el nombre de la casa es un
            `<a>` dentro del `<header>`, así que el primer encabezado del
            documento eran los `<h2>` de las tarjetas. Navegar por encabezados
            —que es como se recorre una página con lector de pantalla— empezaba
            por la mitad y en el nivel 2. Eran 3 de las 5 pantallas que pinta
            este fichero; la mesa sí tiene el suyo, o sea que además el árbol era
            inconsistente entre pantallas del mismo cliente.

            Y dice «Las máquinas» y no «Sala de Arcade» a propósito: el rótulo de
            la casa ya está dos centímetros más arriba en la cabecera, y un
            encabezado que repite el que tiene encima no orienta a nadie.
          */}
          <h1 className="titulo">Las máquinas</h1>
          <p className="entradilla">
            Lo que hay instalado en este servidor. Aquí mismo se juegan los que la plataforma
            sabe pintar con lo que el propio juego declara; los demás salen en la lista igual, y
            cada uno dice por qué no.
          </p>
          <Catalogo
            catalogo={catalogo}
            reintentar={reintentar}
            enlaceDe={(a) => `${BASE}/${encodeURIComponent(a.id)}${sufijoDeSilla(donde.silla)}`}
          />
        </main>
      ) : (
        <ElArcade donde={donde} catalogo={catalogo} />
      )}
    </div>
  );
}

function sufijoDeSilla(silla: string): string {
  return silla.length > 0 ? `?silla=${encodeURIComponent(silla)}` : '';
}

// ---------------------------------------------------------------------------
// Un arcade concreto
// ---------------------------------------------------------------------------

/**
 * LO QUE EL MUELLE NECESITA RECORDAR ENTRE DOS SONDEOS.
 *
 * `vioLaReunion`: esta pantalla ha visto la mesa reuniéndose. Es lo que separa
 * «acaban de repartir delante de mí» —toca la coreografía de zarpar— de «vuelvo
 * a una mesa que ya jugaba» —al tablero sin más, §6.6—. `zarpado`: la
 * coreografía ya terminó o se saltó, y desde entonces se pinta el tablero.
 */
export interface Travesia {
  vioLaReunion: boolean;
  zarpado: boolean;
}

const EN_LA_ORILLA: Travesia = { vioLaReunion: false, zarpado: false };

/**
 * ¿SE PINTA EL MUELLE O LA MESA DE SIEMPRE? Función pura, y por eso comprobable.
 *
 * Un arcade sin muelle contesta que no en todos los casos: es la promesa de que
 * los demás arcades no cambian ni un píxel. Con muelle, se pinta mientras no se
 * está dentro (la orilla) y mientras la mesa se reúne; y con la partida
 * empezada, SÓLO si esta pantalla vio la reunión y todavía no ha zarpado.
 * Equivocarse hacia el muelle esconde una partida en marcha; hacia la mesa,
 * pierde una animación. Por eso el tablero gana en cuanto hay duda.
 */
export function tocaElMuelle(
  conMuelle: boolean,
  fase: FaseDeLaMesa,
  empezada: boolean,
  travesia: Travesia,
): boolean {
  if (!conMuelle) return false;
  if (fase !== 'dentro') return true;
  if (!empezada) return true;
  return travesia.vioLaReunion && !travesia.zarpado;
}

function ElArcade({ donde, catalogo }: { donde: Donde; catalogo: ElCatalogo }): JSX.Element {
  const arcade = donde.que === 'mesa' ? donde.arcade : '';
  const silla = donde.silla;
  const codigoDeLaUrl = donde.que === 'mesa' ? donde.codigo : '';
  /*
   * El gancho se llama SIEMPRE, aunque todavía no se sepa si este arcade existe
   * o si se puede jugar aquí. No es un descuido: las reglas de los ganchos de
   * React prohíben llamarlos dentro de un `if`, y sacar la mesa a otro
   * componente para poder saltársela significaría montarla y desmontarla cada
   * vez que el catálogo cambia de estado — o sea perder el asiento recuperado
   * justo cuando llega la lista. Mientras no se está dentro, esta mesa no pide
   * nada al servidor salvo el intento de volver al asiento guardado, que es
   * exactamente lo que se quiere que pase cuanto antes.
   */
  const mesa = usarMesaDeArcade(arcade, silla, codigoDeLaUrl);

  /*
   * ═══ LA TRAVESÍA VIVE AQUÍ, AL LADO DE LA MESA, Y POR LA MISMA REGLA ═══
   *
   * Es estado del arcade y no del `Muelle`: el `Muelle` se desmonta al pintar el
   * tablero, y lo que hay que recordar es precisamente que ya se pintó. Y son
   * ganchos, así que van ANTES de cualquier `return`, aunque este arcade no tenga
   * muelle: en ese caso el efecto no hace nada y `tocaElMuelle` contesta que no.
   *
   * Se rehace en cuanto se deja de estar dentro —levantarse, tirar, un 404 del
   * sondeo—: la siguiente mesa que se abra empieza en la orilla, sin heredar el
   * «ya zarpé» de la anterior.
   */
  const [travesia, ponerTravesia] = useState<Travesia>(EN_LA_ORILLA);
  const empezada = mesa.fase === 'dentro' && mesa.mesa !== null && haEmpezado(mesa.mesa);
  const reunida = mesa.fase === 'dentro' && mesa.mesa !== null && !empezada;
  useEffect(() => {
    if (mesa.fase !== 'dentro') {
      ponerTravesia((t) => (t.vioLaReunion || t.zarpado ? EN_LA_ORILLA : t));
      return;
    }
    if (reunida) ponerTravesia((t) => (t.vioLaReunion ? t : { vioLaReunion: true, zarpado: false }));
  }, [mesa.fase, reunida]);
  const alDesembarcar = useCallback(() => {
    ponerTravesia((t) => (t.zarpado ? t : { ...t, zarpado: true }));
  }, []);

  if (catalogo.estado === 'pidiendo') {
    /*
     * `aria-busy` en el CONTENEDOR y `aria-hidden` en la tarjeta, que es lo que
     * ya hacía su gemela de `catalogo.tsx`. Aquí las dos marcas estaban en el
     * mismo elemento, así que un lector de pantalla anunciaba las dos rayas
     * vacías como si fueran contenido: dos renglones sin texto en la única
     * pantalla donde todavía no se sabe nada.
     */
    return (
      <main className="dentro" aria-busy="true">
        <div className="tarjeta tarjeta-fantasma" aria-hidden="true">
          <span className="raya raya-larga" />
          <span className="raya" />
        </div>
      </main>
    );
  }
  if (catalogo.estado === 'sin-servidor') {
    /*
      El encabezado sale del panel y sube a `<h1>`: es el título de la pantalla,
      no un apartado dentro de ella. Va con `.titulo` —el mismo que usa la mesa—
      y no con el `<h2>` de `.sin-servidor`, para que las cinco pantallas de este
      fichero tengan el mismo árbol de encabezados.
    */
    return (
      <main className="dentro">
        <h1 className="titulo">No se ha podido hablar con el servidor</h1>
        <div className="sin-servidor">
          <p>{catalogo.porque}</p>
        </div>
      </main>
    );
  }

  const manifiesto = catalogo.arcades.find((a) => a.id === arcade);
  if (manifiesto === undefined) {
    /*
      El `<h1>` es corto y la frase entera se queda en el panel: `.titulo` son 2
      rem en CAJA ALTA, y una frase de cincuenta caracteres con un identificador
      dentro no se lee ahí —se descifra, que es lo mismo que esta hoja dice de
      `loQueEs` en mayúsculas—. El título dice qué ha pasado y el cuerpo, con qué.
    */
    return (
      <main className="dentro">
        <h1 className="titulo">Ese arcade no está aquí</h1>
        <div className="sin-servidor">
          <p>Este servidor no tiene ningún arcade que se llame «{arcade}».</p>
          <p className="letra-chica">
            Tiene instalados: {catalogo.arcades.map((a) => a.id).join(', ')}.
          </p>
        </div>
      </main>
    );
  }

  const puerta = dondeSeJuega(manifiesto);
  if (!puerta.aqui) {
    /*
     * Se llega aquí escribiendo la dirección a mano, porque la tarjeta no era un
     * enlace. Se contesta lo MISMO que decía la tarjeta: la respuesta a «¿dónde
     * se juega esto?» no puede depender de por dónde se haya preguntado.
     */
    return (
      <main className="dentro">
        <h1 className="titulo">{manifiesto.nombre}</h1>
        <div className="sin-servidor">
          <p>{puerta.porque}</p>
        </div>
      </main>
    );
  }

  /*
   * ═══ EL MUELLE, SÓLO PARA QUIEN LO TIENE Y SÓLO HASTA ZARPAR ═══
   *
   * Quién tiene muelle lo dice `escenas/embarcadero/tema.ts` y no el manifiesto
   * (§1.4). Se pinta EN LUGAR de `LaMesaPuesta` y sobre el mismo `mesa` —el
   * gancho es el mismo, no se recarga nada—, y cuando `empezada` llega en la
   * vista el muelle hace su coreografía, avisa con `alDesembarcar`, y esta misma
   * pantalla pasa a pintar el tablero de siempre.
   */
  const tema = temaDelMuelle(manifiesto.id);
  if (tema !== undefined && tocaElMuelle(tieneMuelle(manifiesto.id), mesa.fase, empezada, travesia)) {
    return (
      <Muelle
        manifiesto={manifiesto}
        tema={tema}
        mesa={mesa}
        silla={silla}
        codigoDeLaUrl={codigoDeLaUrl}
        zarpando={empezada}
        alDesembarcar={alDesembarcar}
      />
    );
  }

  return (
    <LaMesaPuesta
      manifiesto={manifiesto}
      mesa={mesa}
      silla={silla}
      codigoDeLaUrl={codigoDeLaUrl}
    />
  );
}

// ---------------------------------------------------------------------------
// La mesa
// ---------------------------------------------------------------------------

/**
 * LOS PLAZOS QUE SE OFRECEN AL ABRIR, Y POR QUÉ EL PRIMERO NO ES UN NÚMERO.
 *
 * ═══ EL PLAZO NO ES UNA PREFERENCIA: ES QUIÉN JUEGA TU TURNO ═══
 *
 * Cuando un plazo vence, el juego no avisa ni pide permiso: el reductor coloca
 * por quien no ha llegado —`colocarPorElAusente` en Riberas es el ejemplo que se
 * puede leer— y la partida sigue como si esa jugada fuera tuya. No hay error, no
 * hay renglón en la crónica y la mesa queda mal repartida.
 *
 * Aquí eso choca de frente con el flujo entero de este cliente, que es: abro una
 * mesa, copio cinco letras, se las paso a alguien, y ese alguien tarda lo que
 * tarda una persona en mirar un chat. Esta lista ofrecía «medio minuto por
 * turno» Y LO TRAÍA PUESTO DE SERIE, o sea que para cuando llegaba el segundo
 * jugador ya habían vencido varios plazos. La app, que lleva más tiempo en manos
 * de gente, ofrece como más corto DIEZ MINUTOS. Medio minuto no es un plazo
 * corto: es una lista de números en la que alguien metió uno de probar.
 *
 * ═══ Y EL PRIMERO, QUE ES `undefined` Y NO CERO ═══
 *
 * `abrir` manda `plazoSegundos` solo si se le da uno, así que `undefined`
 * significa «no mando nada, decide el servidor». Ese es el valor de serie y es
 * el único correcto: el plazo por defecto lo decide quien hospeda, y tenerlo
 * escrito aquí sería una segunda copia que se desincroniza el día que cambie
 * allí. Este cliente era además el ÚNICO desde el que no se podía pedir —mandaba
 * siempre un número—, o sea que tenía una opción menos que la app teniendo una
 * pantalla más grande.
 *
 * `0` es cosa distinta de `undefined` y también es legítimo: está documentado en
 * la cabecera de `abrir` como «esta mesa no tiene prisa», y va el último porque
 * es el caso raro y quien lo elige sabe lo que elige.
 */
export const PLAZOS: Array<{ rotulo: string; segundos: number | undefined; ayuda: string }> = [
  { rotulo: 'Como venga', segundos: undefined, ayuda: 'El plazo por defecto de este servidor.' },
  { rotulo: 'Un rato', segundos: 10 * 60, ayuda: 'Diez minutos por turno. Para jugar del tirón.' },
  { rotulo: 'Un día', segundos: 24 * 60 * 60, ayuda: 'Veinticuatro horas por turno.' },
  { rotulo: 'Tres días', segundos: 3 * 24 * 60 * 60, ayuda: 'Para una partida de la semana entera.' },
  { rotulo: 'Sin prisa', segundos: 0, ayuda: 'Sin plazo: el turno no se pasa solo nunca.' },
];

/** Un aforo que se puede creer: los dos números y su relación. */
export interface Aforo {
  minimo: number;
  maximo: number;
}

/**
 * EL AFORO, LEÍDO COMO LO QUE DE VERDAD ES: `unknown`.
 *
 * `manifiesto.jugadores.minimo` se leía a pelo, y ese manifiesto sale de
 * `catalogo.arcades`, que es `datos.arcades as ArcadeDelCatalogo[]`
 * (`catalogo.tsx`): del cuerpo de la respuesta sólo se comprobó que fuera un
 * array, y de su contenido NADA. Un manifiesto sin `jugadores` —un servidor más
 * nuevo, un arcade entrado por `ARCADES_EXTERNOS` mal escrito— lanzaba un
 * TypeError durante el render, y la consecuencia está escrita en la guarda de
 * `opciones` de `LaMesaPuesta`: `RedDeSeguridad` cambia la página en blanco por
 * una pantalla que dice que algo se rompió, pero sigue siendo LA SALA ENTERA
 * caída por una mesa.
 *
 * Son las mismas siete comprobaciones que `leerAforo` en `app/app/index.tsx`
 * —objeto, los dos tipos, finitud, `maximo >= 1`, `minimo >= 0`, `minimo <=
 * maximo`— y la misma doctrina: lo que no venga bien no se pinta, y la pantalla
 * sale igual. Aquí lo único que cuelga de esto es un renglón de ayuda, así que
 * sin aforo se dice lo que se sabe y no se inventa un número.
 */
export function leerAforo(ficha: unknown): Aforo | null {
  const a: unknown = (ficha as { jugadores?: unknown } | null | undefined)?.jugadores;
  if (typeof a !== 'object' || a === null) return null;
  const min: unknown = (a as { minimo?: unknown }).minimo;
  const max: unknown = (a as { maximo?: unknown }).maximo;
  if (typeof min !== 'number' || typeof max !== 'number') return null;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const minimo = Math.round(min);
  const maximo = Math.round(max);
  if (maximo < 1 || minimo < 0 || minimo > maximo) return null;
  return { minimo, maximo };
}

function LaMesaPuesta({
  manifiesto,
  mesa,
  silla,
  codigoDeLaUrl,
}: {
  manifiesto: ArcadeDelCatalogo;
  mesa: LaMesa;
  silla: string;
  codigoDeLaUrl: string;
}): JSX.Element {
  /*
   * ═══ AL SENTARSE, EL FOCO SE VA DETRÁS DE LA PANTALLA ═══
   *
   * Cuando `fase` pasa a 'dentro' el vestíbulo entero se desmonta y aparece la
   * mesa. El elemento que tenía el foco —«Sentarse» o «Abrir mesa»— deja de
   * existir, así que el foco se cae a `<body>`: con teclado hay que volver a
   * tabular desde el principio de la página, y con lector de pantalla no se
   * anuncia nada. Era el momento más importante de esta pantalla y el único sin
   * ninguna señal: en las 645 líneas que tenía este fichero no había ni un `ref`
   * ni un `focus()`.
   *
   * Se lleva el foco al título de la mesa, que es el primer elemento del
   * contenido nuevo: se anuncia el encabezado —o sea a qué se está jugando— y el
   * tabulador sigue desde ahí, no desde la cabecera. No se le roba el foco a
   * nadie, porque quien lo tenía se acaba de desmontar; y sólo se hace en el
   * CAMBIO de fuera a dentro, para que un repintado del sondeo no vuelva a
   * mover el foco cada vez que otro juega.
   *
   * ═══ Y DESDE QUE LA PÁGINA SE PONE DE PIE, EL DESTINO SON DOS Y NO UNO ═══
   *
   * Con el delta a pantalla completa el `<h1>` sale del flujo (`estilo.css`, la
   * sección «La página de pie»): sigue en el árbol para quien recorre la página
   * por encabezados, pero no se ve. Un aro de foco sobre un elemento invisible no
   * lo ve nadie, así que quien juega con teclado se quedaría sin saber dónde está
   * el foco justo al sentarse — el mismo fallo mudo que este efecto existe para no
   * tener, escrito en el arreglo del anterior.
   *
   * Así que el destino se pide POR ORDEN: el recuadro del lienzo si lo hay, y el
   * título si no. Y «si no» no es un caso raro: `RiberasEnTres` decide DENTRO de
   * su render si cae al retablo SVG —sin `.glb`, sin WebGL, con más colonos que
   * colores—, y en ese camino no hay recuadro ninguno y el título vuelve a verse.
   * Por eso el pintor AVISA de dónde ha quedado su recuadro y esta pantalla no se
   * lo calcula: aquí arriba no se puede saber.
   *
   * El orden de React lo permite: las referencias de los hijos se enganchan en el
   * commit, ANTES de que corra este efecto, así que cuando esto mira `elLienzo` ya
   * está puesto o ya se sabe que no lo va a estar.
   *
   * ═══ Y EL RESCATE, QUE ES EL CAMINO QUE NADIE MIRA ═══
   *
   * El modelo del delta TARDA. Mientras carga ya hay recuadro —con su telón—, o
   * sea que el foco aterriza ahí; y si el `.glb` acaba fallando, el recuadro se
   * desmonta con el foco puesto y el navegador lo suelta al `<body>`. Medido en el
   * banco con la ruta del modelo rota: el foco acababa en `BODY`, o sea otra vez
   * tabulando desde la cabecera, que es el fallo que este efecto vino a arreglar.
   *
   * Por eso el aviso del pintor no se guarda a secas: al llegar `null` se mira si
   * el recuadro que se va es el que TIENE el foco, y en ese caso se devuelve al
   * título —que en el camino del retablo vuelve a estar a la vista—. Se comprueba
   * `document.activeElement` ANTES de olvidar el recuadro, porque después ya no
   * habría con qué comparar.
   */
  const tituloDeLaMesa = useRef<HTMLHeadingElement | null>(null);
  const elLienzo = useRef<HTMLElement | null>(null);
  /*
   * ═══ Y EL MISMO AVISO DICE ADEMÁS DÓNDE VIVE EL RAÍL ═══
   *
   * Desde que el delta ocupa la pantalla entera, el raíl no está a la derecha del tablero:
   * está DENTRO del lienzo, en el cajón que abre la ficha de mis puntos (§1.11). Pero eso
   * sólo vale cuando hay lienzo, y quién lo decide es `RiberasEnTres` en mitad de su render
   * —sin `.glb`, sin WebGL o con más colonos que colores cae al retablo SVG—, o sea que
   * aquí arriba no se puede saber. Es exactamente el dato que este aviso ya traía para el
   * foco, así que se aprovecha en vez de inventar un segundo camino.
   *
   * Y ES ESTADO Y NO UNA `ref`, al contrario que el destino del foco: de esto depende QUÉ
   * SE PINTA —el `<aside>` o nada—, y una `ref` no repinta. El repintado de más es uno por
   * mesa: el aviso llega al montar el recuadro y al soltarlo, no en cada jugada.
   *
   * Empieza en falso a propósito: mientras no conste que hay lienzo, el raíl se pinta donde
   * siempre. Un raíl de más durante un fotograma es una columna que aparece; un raíl de
   * menos es la crónica, el código de la mesa y las dos salidas que no están en ninguna
   * parte.
   */
  const [conLienzo, ponerConLienzo] = useState(false);
  const apuntarElLienzo = useCallback((recuadro: HTMLElement | null): void => {
    const seLoLlevaPuesto =
      recuadro === null && elLienzo.current !== null && document.activeElement === elLienzo.current;
    elLienzo.current = recuadro;
    ponerConLienzo(recuadro !== null);
    if (seLoLlevaPuesto) tituloDeLaMesa.current?.focus();
  }, []);
  const estabaDentro = useRef(false);
  const dentro = mesa.fase === 'dentro' && mesa.mesa !== null;
  useEffect(() => {
    if (dentro && !estabaDentro.current) (elLienzo.current ?? tituloDeLaMesa.current)?.focus();
    estabaDentro.current = dentro;
  }, [dentro]);

  if (mesa.fase !== 'dentro' || mesa.mesa === null) {
    return (
      <main className="dentro">
        <h1 className="titulo">{manifiesto.nombre}</h1>
        <p className="entradilla">{manifiesto.gancho}</p>
        {/*
          `role="alert"` porque el aviso INTERRUMPE, y hasta ahora sólo
          interrumpía en lo visual: la hoja de estilo pone la regla de `--alarma`
          y el velo, y ahí se acababa. Por aquí pasan «Esa mesa ya no existe: la
          han tirado o ha caducado», «Se ha perdido la mesa … Reintentando» y
          «Ese asiento ya no vale» —cambios que ocurren SIN que nadie toque nada,
          los trae el sondeo—, así que quien no esté mirando no se entera de
          ninguno. La app pone aquí `alert` + `assertive`; en HTML `role="alert"`
          ya implica `aria-live="assertive"`.
        */}
        {mesa.aviso.length > 0 ? (
          <p className="aviso" role="alert">
            {mesa.aviso}
          </p>
        ) : null}
        <Vestibulo mesa={mesa} codigoDeLaUrl={codigoDeLaUrl} aforo={leerAforo(manifiesto)} />
      </main>
    );
  }

  const puesta = mesa.mesa;
  /*
   * ═══ `?? []`, Y ESTA GUARDA VALE LA SALA ENTERA ═══
   *
   * `opciones` es un campo que el servidor empezó a mandar en la fase 5, y este
   * empaquetado puede estar hablando con uno anterior — «exactamente la
   * situación que va a existir en cuanto haya despliegues parciales», que es lo
   * que ya razona la cabecera de `catalogo.tsx` para el mueble desconocido. Sin
   * esta guarda, `plan.ts` hacía `opciones.length` sobre `undefined`, y eso no
   * se lleva por delante la mesa: se lleva la Sala entera, catálogo incluido.
   * Aquí ponía «porque no hay ningún error boundary en este cliente», y sí lo
   * hay —`RedDeSeguridad`, montada en `main.tsx`—; lo que hace es que en vez de
   * una página en blanco salga una pantalla que dice que algo se rompió. Sigue
   * siendo la Sala entera caída por una mesa, que es lo que esta guarda evita.
   *
   * La guarda va aquí y no dentro de `mesa.ts` a propósito: `MesaVista` describe
   * LO QUE LLEGA POR EL CABLE, y lo que llega es que el campo puede faltar.
   * Normalizarlo al recibirlo dejaría el tipo mintiendo otra vez, y la próxima
   * pantalla que lo lea heredaría la mentira sin ver esta línea.
   *
   * Y una lista vacía es la respuesta CORRECTA, no un apaño: un servidor que no
   * sabe preguntar qué se puede hacer es indistinguible de un juego que no tiene
   * nada que ofrecer ahora mismo, y `queSePinta` ya sabe decir las dos cosas.
   */
  const pintado = queSePinta(puesta.vista, puesta.opciones ?? []);
  const esRiberas = manifiesto.id === RIBERAS;

  /*
   * ═══ SI EL PREGÓN VA A PINTARSE, EL PANEL «Trueques» NO ═══
   *
   * El pregón cuelga de la cinta y enseña las propuestas en tiras que se pulsan; el panel
   * «Trueques» del cajón dice lo mismo en renglones de texto que no se pulsan. Con los dos
   * puestos, la misma pantalla cuenta lo mismo dos veces con dos redacciones distintas, y la
   * que se quedaría atrás el día que una cambie es la que vive dentro de un cajón que hay
   * que abrir.
   *
   * SE PREGUNTA AQUÍ Y NO ABAJO PORQUE EL RAÍL SE MONTA AQUÍ, y la respuesta depende de
   * `conLienzo`, que es lo único que sabe si hay cinta de la que colgar un pregón: por el
   * camino del respaldo —cinco colonos, el `.glb` que no llega— no la hay, el panel es el
   * ÚNICO sitio donde vive lo que ya se trocó, y ahí se queda.
   *
   * ES LA MISMA FUNCIÓN PURA QUE LLAMA EL PINTOR, con los mismos argumentos, y eso es lo
   * contrario de dos criterios: no hay dos maneras de decidir si hay pregón, hay UNA escrita
   * en `shared/` que se pregunta desde los dos sitios que necesitan la respuesta. Un
   * `boolean` calculado a mano aquí sí habría sido un segundo criterio.
   */
  const elPregonSePinta =
    conLienzo && esRiberas ? elPregonEnTres(puesta.vista, puesta.yo, puesta.opciones ?? []) : null;

  /*
   * ═══ EL RAÍL SE MONTA UNA VEZ Y VIVE EN DOS SITIOS ═══
   *
   * Aquí dentro está TODO lo que no es el tablero: el marcador, el código de la mesa con su
   * reloj y quién está sentado, los paneles que declara el juego, las dos salidas y la
   * crónica. Con el delta a pantalla completa eso no cabe al lado del tablero, así que se va
   * al cajón que abre la cinta (§1.11); sin delta —el respaldo SVG— se queda en su `<aside>`
   * de siempre, a la derecha.
   *
   * SE MONTA UNA SOLA VEZ, en un fragmento, y se le pasa entero a quien toque. Dos copias de
   * estas cinco cosas serían dos raíles que divergen: el día que uno gane un dato, el otro
   * —el que menos se mira— no lo tendría, y ese día nadie se enteraría.
   *
   * ═══ Y ÉSTE ES EL ORDEN DEL §1.11, QUE NO ERA EL DE ANTES ═══
   *
   * Antes iba la ficha de la mesa primero y las dos salidas al final, después de la crónica.
   * Ahora manda el orden del cajón: lo que se mira ANTES de decidir una jugada arriba —el
   * marcador con lo de cada cual, y luego el código y el reloj—, después los paneles, y al
   * final las dos salidas y la crónica. En un cajón que se abre y se cierra, el primer
   * renglón es el único que se lee sin desplazar; en el `<aside>` daba igual porque se veía
   * todo a la vez, y por eso el cambio no le quita nada a la pantalla del respaldo.
   */
  const elRail = (
    <>
      {/*
        ═══ EL MARCADOR DE RIBERAS, ANTES DE LOS PANELES QUE DECLARA EL JUEGO ═══

        Se decide por QUIÉN es y no por si hay tablero en tres dimensiones: el marcador se
        mira igual cuando la mesa cae al retablo SVG, y ahí es donde más falta hace, porque
        el respaldo pinta los movimientos del mazo como botones sueltos y no dice de nadie
        cuántos puntos lleva. Él mismo devuelve `null` si la vista no es de Riberas.

        Va DELANTE de `Paneles` y no en su lugar: los paneles son texto que declara el juego
        y que leen todos los clientes por igual —«Lo mío», «Mis cartas», los dos premios y
        los trueques—, y quitarlos aquí dejaría a este cliente enseñando menos que el de al
        lado. Lo que este marcador añade es lo que un renglón de texto no puede: el color de
        cada colono, quién eres tú, y tus puntos ocultos marcados como tuyos.
      */}
      {pintado.que === 'tablero' && esRiberas ? <MarcadorDeRiberas vista={puesta.vista} /> : null}
      <LaFicha mesa={puesta} silla={silla} />
      {/*
        ═══ LOS SEIS PANELES, CON «Lo mío» EL PRIMERO Y SIN LOS BIENES AJENOS ═══

        `panelesEnTres` hace las dos cosas, y las dos son de pantalla y no del juego: pone
        delante el panel donde están MIS BIENES POR CLASE —que en la escena son cartas sin
        número, así que «limo: 3» no se lee en ningún otro sitio— y le quita al panel «La
        mesa» la cifra de bienes de cada colono, que es la decisión 17 de Miguel. Vive en
        `shared/` y no aquí para que `verify:riberas-en-tres` pueda medirla desde Node con
        los paneles de una partida de verdad.

        Sólo para Riberas: los títulos por los que busca son los que escribe `panelesDe` de
        Riberas, y otro arcade con un panel llamado «La mesa» no tiene por qué querer nada
        de esto.

        Y SON SEIS O SON CINCO: `panelesFueraDelPregon` retira «Trueques» cuando el pregón lo
        hereda, y sólo entonces. Las dos cribas se componen y el orden da igual, que las dos
        son filtros. Ver `elPregonSePinta`, arriba.
      */}
      {pintado.que === 'tablero' ? (
        <Paneles
          tablero={pintado.tablero}
          paneles={
            esRiberas
              ? panelesFueraDelPregon(panelesEnTres(pintado.tablero.paneles), elPregonSePinta)
              : undefined
          }
        />
      ) : null}
      {/*
        ═══ LAS DOS SALIDAS, Y SÓLO UNA SE DESTACA ═══

        «Levantarse» pasa a secundario —texto y borde en acento, sin relleno—, que es la
        primera vez que este cliente pinta un botón que se recorta de su fondo: el `.opcion`
        de antes era `--teja-alta` sobre `--suelo`, o sea 1,15:1 contra el 3:1 que pide WCAG
        1.4.11, y el borde de `--filo` compuesto encima, 1,23. En secundario el acento
        recorta 5,01 violeta / 9,22 ámbar / 8,69 verde / 5,40 carmesí sobre el suelo, y son
        las cifras de los CUATRO temas, no las del violeta.

        «Tirar la mesa» se queda en `.opcion-sobria` A PROPÓSITO: es la única acción de esta
        pantalla que se lleva por delante la partida de los demás, y destacarla sería
        invitar a pulsarla. Si se destaca una, esa no.
      */}
      <button type="button" className="opcion opcion-secundaria" onClick={mesa.salir}>
        <span className="opcion-texto">
          <span className="opcion-rotulo">Levantarse de la mesa</span>
          <span className="opcion-ayuda">Se olvida el asiento en este navegador.</span>
        </span>
      </button>
      {/*
        ═══ Y LA SALIDA DE VERDAD, QUE NO EXISTÍA ═══

        «Levantarse» sólo olvida la llave AQUÍ: el asiento sigue en la mesa del servidor,
        porque un asiento no se libera nunca. Con el plazo «Sin prisa» eso deja la mesa
        congelada para todos —se reparte contando a quien se fue, no hay plazo que venza,
        nadie puede jugar por él— y hasta hoy no había ninguna forma de salir de ahí.

        Se pregunta antes de hacerlo porque afecta a los demás, y por eso el rótulo dice
        «para todos»: es la diferencia entera con el de arriba.
      */}
      <button
        type="button"
        className="opcion opcion-sobria"
        onClick={() => {
          const seguro = globalThis.confirm(
            '¿Tirar la mesa? Se acaba la partida para todos los que estén sentados.',
          );
          if (seguro) mesa.tirar();
        }}
      >
        <span className="opcion-texto">
          <span className="opcion-rotulo">Tirar la mesa</span>
          <span className="opcion-ayuda">
            Se acaba para todos. Para cuando alguien se ha ido y la partida no puede seguir.
          </span>
        </span>
      </button>
      <LaCronica mesa={mesa} />
    </>
  );

  return (
    <main className="dentro mesa-puesta">
      <div className="tablero-y-panel">
        <section className="el-mueble">
          {/*
            `tabIndex={-1}` no lo mete en el orden de tabulación: sólo lo hace
            capaz de recibir el foco que le lleva el efecto de arriba al
            sentarse. El aviso de foco lo pone `:focus-visible`, que la hoja ya
            tiene medido en los cuatro temas.
          */}
          <h1 className="titulo" tabIndex={-1} ref={tituloDeLaMesa}>
            {manifiesto.nombre}
          </h1>
          {mesa.aviso.length > 0 ? (
            <p className="aviso" role="alert">
              {mesa.aviso}
            </p>
          ) : null}

          {pintado.que === 'tablero' && manifiesto.id === RIBERAS ? (
            /*
             * ═══ EL PINTOR PROPIO, PARA QUIEN LO TIENE ═══
             *
             * Quién tiene tablero en tres dimensiones lo dice EL ARCADE, no la
             * tabla de temas del muelle. La primera versión preguntaba a
             * `tieneMuelle`, y eso ataba el lobby al pintor: el día que otro
             * arcade estrenase muelle sin tener delta, la Sala le habría montado
             * el pintor de Riberas encima de un tablero que no es el suyo. Se
             * decide por lo que HAY —`queSePinta` ya dijo tablero— y por QUIÉN
             * es, con el identificador que publica `shared/`. Trae su propio
             * formulario de lo que el tablero no enseña; `Paneles` sigue en el
             * raíl porque la vista sigue trayendo el tablero declarado. Y si el
             * mundo no arranca, o la mesa no cabe en sus colores, él mismo decide
             * caer al retablo de siempre. Los demás arcades no cambian ni un píxel.
             *
             * Y SE LE PASA EL RAÍL ENTERO, que es lo que va dentro del cajón de la
             * cinta cuando hay lienzo. Se le pasa SIEMPRE, también cuando este
             * pintor va a caer al retablo: no lo pinta en ese camino, y quien lo
             * pinta entonces es el `<aside>` de abajo. La cuenta de quién de los
             * dos lo enseña la lleva `conLienzo`, y la decide el propio pintor.
             */
            <RiberasEnTres
              manifiesto={manifiesto}
              mesa={mesa}
              puesta={puesta}
              tablero={pintado.tablero}
              opciones={pintado.opciones}
              foco={apuntarElLienzo}
              elRail={elRail}
              laSalida={`${BASE}/${sufijoDeSilla(silla)}`}
            />
          ) : pintado.que === 'tablero' ? (
            <>
              <Retablo tablero={pintado.tablero} alTocar={mesa.mover} quieto={mesa.quieto} />
              <AccionesDelTablero
                tablero={pintado.tablero}
                alTocar={mesa.mover}
                quieto={mesa.quieto}
              />
              {/*
                Y debajo, lo que `opciones()` ofrece Y EL TABLERO NO ENSEÑA YA.
                No es esconder: es enseñar cada movimiento exactamente una vez.
                `opciones()` puede ofrecer cosas que no son ninguna pieza
                —aceptar un trato, pasar— y que en un dibujo no tienen dónde
                pintarse; dejarlas fuera sería esconder movimientos legales. Ver
                `opcionesSueltas` en `plan.ts`, que es donde está el razonamiento.
              */}
              <FormularioSiHayAlgo
                opciones={opcionesSueltas(pintado.tablero, pintado.opciones)}
                alElegir={mesa.mover}
                quieto={mesa.quieto}
              />
            </>
          ) : pintado.que === 'formulario' ? (
            <Formulario
              opciones={pintado.opciones}
              alElegir={mesa.mover}
              quieto={mesa.quieto}
              titulo="Lo que puedes hacer"
            />
          ) : (
            <p className="nada-que-hacer">{pintado.porque}</p>
          )}
        </section>

        {/*
          ═══ EL RAÍL, CUANDO NO SE LO HA LLEVADO EL CAJÓN ═══

          Con delta el raíl vive dentro del lienzo, en el cajón que abre la ficha
          de mis puntos; aquí se pinta cuando NO hay lienzo, que es el camino del
          respaldo SVG —sin `.glb`, sin WebGL, o con más colonos que colores— y
          también cualquier otro arcade, que no tiene cinta ninguna. Quien dice
          cuál de los dos casos es no es esta pantalla: es el aviso del pintor.

          Pintarlo en los dos sitios a la vez sería tener la crónica, el código de
          la mesa y las dos salidas DOS veces en el árbol, con dos regiones vivas
          diciendo lo mismo y dos botones de «Tirar la mesa».

          UN PUNTO DE REFERENCIA SIN NOMBRE NO SIRVE DE PUNTO DE REFERENCIA. Un
          `<aside>` es un `complementary` en la lista de regiones que ofrece un
          lector de pantalla, y sin nombre se anuncia «complementario» a secas:
          aquí dentro están el código de la mesa, quién está sentado, lo que ha
          pasado y las dos salidas, o sea todo lo que no es el tablero.
        */}
        {conLienzo ? null : (
          <aside className="rail" aria-label="El carril de la mesa">
            {elRail}
          </aside>
        )}
      </div>
    </main>
  );
}

/**
 * El formulario debajo de un tablero, y CALLADO cuando no sobra nada.
 *
 * `Formulario` sin opciones dice «ahora mismo no hay nada que puedas hacer», que
 * es lo correcto cuando él es el mueble entero y sería falso aquí: encima hay un
 * tablero con piezas pulsables. Y cuando tampoco las hay, quien lo explica es el
 * `aviso` del propio tablero, que sabe de qué habla.
 */
function FormularioSiHayAlgo({
  opciones,
  alElegir,
  quieto,
}: {
  opciones: readonly Opcion[];
  alElegir: (movimiento: MovimientoDeclarado) => void;
  quieto: boolean;
}): JSX.Element | null {
  if (opciones.length === 0) return null;
  return (
    <Formulario
      opciones={opciones}
      alElegir={alElegir}
      quieto={quieto}
      titulo="Y además puedes"
    />
  );
}

/** Antes de sentarse: abrir una mesa nueva o entrar con un código. */
function Vestibulo({
  mesa,
  codigoDeLaUrl,
  aforo,
}: {
  mesa: LaMesa;
  codigoDeLaUrl: string;
  aforo: Aforo | null;
}): JSX.Element {
  const [nombre, ponerNombre] = useState('');
  const [codigo, ponerCodigo] = useState(codigoDeLaUrl);
  /*
   * EL CÓDIGO DE LA BARRA SE VUELVE A LEER SI CAMBIA. `useState(codigoDeLaUrl)`
   * toma la semilla y después ignora el prop, mientras que `codigoDeLaUrl` sí se
   * recalcula en cada `popstate` (ver `Sala`). Hoy no se llega a romper —el único
   * camino que cambiaría el `?codigo=` sin desmontar esto sería un enlace interno
   * con código, y el que hay es absoluto y ni siquiera lo intercepta
   * `alPulsarUnEnlace`—, pero es una trampa puesta: el día que alguien añada un
   * `/sala/<arcade>?codigo=…` dentro de la Sala, el campo se quedaría con el
   * código viejo sin dar ningún error.
   */
  useEffect(() => {
    ponerCodigo(codigoDeLaUrl);
  }, [codigoDeLaUrl]);
  /*
   * Se guarda EL ÍNDICE y no los segundos, y no es un capricho: los dos valores
   * de los extremos de la lista son `undefined` —«manda el servidor»— y `0`
   * —«sin plazo»—, que son cosas distintas y que un `<select>` no sabe
   * distinguir, porque el valor de una opción es siempre una cadena. Con el
   * índice, el que va de serie es `PLAZOS[0]` y se lee de un vistazo cuál es.
   */
  const [cualPlazo, ponerCualPlazo] = useState(0);
  const plazo = PLAZOS[cualPlazo];

  return (
    <div className="vestibulo">
      <section className="panel">
        <h2 className="rotulo-de-panel">Cómo te llamas</h2>
        <p className="letra-chica">
          Es lo que ven los demás en la mesa. No es una cuenta: no hay correo ni contraseña, y
          muere con la partida.
        </p>
        {/*
          ═══ EL TEXTO DE EJEMPLO NO ES UNA ETIQUETA ═══

          Ninguno de los dos campos de esta pantalla tenía `<label>`, `aria-label`
          ni `aria-labelledby`: sólo `placeholder`. Un lector de pantalla lee el
          texto de ejemplo SÓLO mientras el campo está vacío; en cuanto se teclea
          la primera letra lee el valor y no queda nada que diga en cuál de los
          dos se está. Y son dos campos en la misma pantalla, que es el caso peor.
          El `<select>` de al lado ya llevaba el suyo, o sea que no era una
          política del fichero: era un descuido en dos de tres. Es la misma
          corrección que la app ya pagó en sus dos campos de mesa.
        */}
        <input
          className="campo"
          value={nombre}
          maxLength={24}
          placeholder="Tu nombre"
          aria-label="Tu nombre en la mesa"
          onChange={(e) => {
            ponerNombre(e.target.value);
          }}
        />
      </section>

      <div className="dos-columnas">
        <section className="panel">
          <h2 className="rotulo-de-panel">Abrir una mesa</h2>
          {/*
            SIN AFORO CREÍBLE NO SE DICE UN NÚMERO. `leerAforo` devuelve `null`
            cuando el manifiesto no trae `jugadores` en condiciones, y entonces
            se cuenta lo que sí se sabe —que sale un código— en vez de escribir
            «Hacen falta undefined para empezar».
          */}
          <p className="letra-chica">
            {aforo !== null && aforo.minimo > 1
              ? `Hacen falta ${String(aforo.minimo)} para empezar: al abrir sale un código que se pasa a los demás.`
              : 'Sale un código por si quieres que se siente alguien más.'}
          </p>
          <select
            className="campo"
            value={cualPlazo}
            aria-label="Plazo por turno"
            onChange={(e) => {
              ponerCualPlazo(Number(e.target.value));
            }}
          >
            {PLAZOS.map((p, i) => (
              <option value={i} key={p.rotulo}>
                {p.rotulo}
              </option>
            ))}
          </select>
          {/*
            La ayuda del plazo elegido se pinta debajo, y no es adorno: lo que
            está en juego es que al vencer un plazo el juego coloca por quien no
            ha llegado. «Un día» y «Sin prisa» no se distinguen por el rótulo.
          */}
          {plazo === undefined ? null : <p className="letra-chica">{plazo.ayuda}</p>}
          {/*
            ═══ ESTE ES EL BOTÓN QUE SE ESPERA QUE PULSES, Y AHORA LO PARECE ═══

            «Abrir mesa» y «Sentarse» se pintaban con `.opcion` a secas, que es
            el estado QUIETO de la casa —teja lisa, tinta `--tenue`, filo
            apagado— usado como acción primaria: el relleno se recortaba del
            fondo por 1,15:1 y el borde por 1,23, con un mínimo de 3:1 (WCAG
            1.4.11), y fallaba IGUAL en los cuatro temas porque está construido
            sólo con neutros. En primario el relleno es de acento con tinta
            `--suelo`: 5,01 violeta / 9,22 ámbar / 8,69 verde / 5,40 carmesí para
            el texto, y el relleno se recorta 4,58 de la teja y 4,85 de la pared.

            Son dos primarios en la misma pantalla y no uno, porque son los dos
            caminos del vestíbulo y viven en paneles distintos: quien abre mesa y
            quien llega con un código no están haciendo la misma pantalla.

            El apagado lo sigue llevando `:disabled`, que pesa más que esta clase
            y se lleva el acento entero con él en vez de atenuarlo.
          */}
          <button
            type="button"
            className="opcion opcion-primaria"
            disabled={mesa.quieto}
            onClick={() => {
              mesa.abrir(nombre.trim(), plazo?.segundos);
            }}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">Abrir mesa</span>
            </span>
          </button>
        </section>

        <section className="panel">
          <h2 className="rotulo-de-panel">Entrar con un código</h2>
          <p className="letra-chica">Cinco letras. Da igual mayúsculas o minúsculas.</p>
          <input
            className="campo campo-codigo"
            value={codigo}
            maxLength={8}
            placeholder="ABCDE"
            aria-label="Código de la mesa"
            onChange={(e) => {
              ponerCodigo(e.target.value.toUpperCase());
            }}
            onKeyDown={(e) => {
              /* En un teclado, un código se termina con Enter. */
              if (e.key === 'Enter' && codigo.trim().length > 0) mesa.entrar(codigo, nombre.trim());
            }}
          />
          <button
            type="button"
            className="opcion opcion-primaria"
            disabled={mesa.quieto || codigo.trim().length === 0}
            onClick={() => {
              mesa.entrar(codigo, nombre.trim());
            }}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">Sentarse</span>
            </span>
          </button>
        </section>
      </div>
    </div>
  );
}

/**
 * ═══ LO QUE LLEGA POR EL CABLE, LEÍDO COMO LO QUE ES ═══
 *
 * `MesaVista` describe lo que el servidor PROMETE, no lo que llega: la respuesta
 * se lee con `(await r.json()) as { mesa: MesaVista; … }` (`mesa.ts:374`) y con
 * `as { mesa?: MesaVista }` al recuperar el asiento (`mesa.ts:258`), o sea sin
 * una sola validación. `LaFicha` hacía cinco lecturas a pelo sobre eso, y no
 * fallan igual:
 *
 *   · `asientos.map` y `nombre.length` LANZAN, y eso no se lleva por delante la
 *     mesa: se lleva la Sala entera. Es exactamente el fallo que este cliente ya
 *     pagó una vez —«bastó con quitarle el campo `opciones` a la respuesta de
 *     una mesa para que un `.length` sobre `undefined` se la llevara»— y que el
 *     `?? []` de `LaMesaPuesta` resuelve en uno de los tres sitios que lo
 *     necesitaban.
 *   · `codigo`, `rev` y `venceEn` no lanzan: MIENTEN. Sin código, el enlace que
 *     se le pasa a quien falta lleva escrito «undefined» y alguien lo pega en un
 *     chat; sin `rev`, el panel dice «Revisión undefined»; y con un `venceEn` que
 *     no sea número ni `null`, el `!== null` lo dejaba pasar, la resta daba `NaN`
 *     y `cuantoQueda` —que no tiene rama para `NaN`: `NaN <= 0`, `NaN < 60000` y
 *     las demás salen todas falsas— contestaba «quedan NaN días».
 *
 * Las tres funciones de abajo son la misma doctrina que `leerAforo`: lo que no
 * venga bien no se pinta, y el panel sale igual.
 */
function cadenaDelCable(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function numeroDelCable(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Un asiento que se puede pintar. `presente` en `null` es «no se sabe». */
interface AsientoPintable {
  id: string;
  nombre: string;
  presente: boolean | null;
}

function asientosDelCable(v: unknown): AsientoPintable[] {
  if (!Array.isArray(v)) return [];
  const salen: AsientoPintable[] = [];
  for (const cual of v as unknown[]) {
    if (typeof cual !== 'object' || cual === null) continue;
    const id = cadenaDelCable((cual as { id?: unknown }).id);
    if (id === null) continue;
    const presente: unknown = (cual as { presente?: unknown }).presente;
    salen.push({
      id,
      nombre: cadenaDelCable((cual as { nombre?: unknown }).nombre) ?? '',
      /*
       * Y `presente` distingue TRES casos y no dos: si no viene un booleano no se
       * escribe «— fuera», porque eso sería afirmar que alguien se ha ido cuando
       * lo único que pasa es que el servidor no lo ha dicho.
       */
      presente: typeof presente === 'boolean' ? presente : null,
    });
  }
  return salen;
}

/**
 * LA SIGUIENTE SILLA, QUE TIENE QUE SER UNA LETRA.
 *
 * `silla` sale de `?silla=` —o sea de la barra de direcciones— y aquí se hacía
 * `String.fromCharCode(silla.charCodeAt(0) + 1)` sin mirar qué era: con
 * `?silla=z` el enlace ofrecido era `?silla={`, y con `?silla=casa` ofrecía
 * `?silla=d`, que además puede chocar con una ventana «d» que ya exista y
 * quitarle la llave — que es justo el problema que este mecanismo existe para
 * evitar. El comentario decía «la siguiente letra basta», y no siempre era una
 * letra.
 */
function laSillaSiguiente(silla: string): string {
  const s = silla.trim().toLowerCase();
  if (/^[a-y]$/.test(s)) return String.fromCharCode(s.charCodeAt(0) + 1);
  return s === 'b' ? 'c' : 'b';
}

/** El código, quién está y cuánto falta. Lo que se mira de reojo. */
function LaFicha({
  mesa,
  silla,
}: {
  mesa: NonNullable<LaMesa['mesa']>;
  silla: string;
}): JSX.Element {
  const codigo = cadenaDelCable(mesa.codigo);
  const arcade = cadenaDelCable(mesa.arcade);
  const revision = numeroDelCable(mesa.rev);
  const vence = numeroDelCable(mesa.venceEn);
  const terminada = mesa.terminada === true;
  const asientos = asientosDelCable(mesa.asientos);

  /*
   * La cuenta atrás se repinta sola cada segundo, y solo mientras hay algo que
   * contar: sin plazo o con la mesa terminada no hay reloj, y un `setInterval`
   * eterno en una mesa acabada es una pestaña que no deja dormir al portátil.
   * Con la guarda, «algo que contar» pasa a ser un número de verdad: un `venceEn`
   * roto no arranca un reloj que sólo puede contar `NaN`.
   */
  const [, latir] = useState(0);
  const hayReloj = vence !== null && !terminada;
  useEffect(() => {
    if (!hayReloj) return;
    const t = setInterval(() => {
      latir((n) => n + 1);
    }, 1000);
    return () => {
      clearInterval(t);
    };
  }, [hayReloj]);

  /*
   * El enlace que se le pasa a quien falta lleva el código y NO lleva la silla:
   * la silla es de este navegador —el cajón del bolsillo donde vive esta llave—
   * y mandársela a otra persona sería mandarle el nombre de un cajón suyo, que
   * es lo único de todo esto que no significa nada fuera de aquí.
   *
   * Y sin código o sin arcade NO HAY ENLACE, en vez de un enlace con «undefined»
   * dentro: lo que se copia a un chat tiene que llevar a la mesa o no existir.
   */
  const enlaceParaLosDemas =
    codigo === null || arcade === null
      ? null
      : `${window.location.origin}${BASE}/${encodeURIComponent(arcade)}?codigo=${encodeURIComponent(codigo)}`;
  /* La silla propia se enseña aparte, para saber en qué ventana se está. */
  const enQueSilla = silla.length > 0 ? `silla «${silla}»` : '';
  /*
   * ═══ Y AQUÍ SE ENSEÑA QUE `?silla=` EXISTE ═══
   *
   * El cajón por ventana estaba escrito, probado y funcionando, y no lo sabía
   * nadie: no aparecía en ninguna pantalla ni en ningún documento, así que la
   * única forma de usarlo era leer el código de `bolsillo.ts`. Una función que hay
   * que descubrir leyendo el fuente no está entregada.
   *
   * Y el caso que resuelve es el primero que hace cualquiera: probar la mesa
   * consigo mismo. Dos ventanas del mismo navegador comparten `localStorage`, o
   * sea que sin esto la segunda pisa la llave de la primera y quien recargue
   * vuelve sentado en la silla de otro. La siguiente letra basta —son cajones,
   * no asientos: el asiento lo da el servidor—.
   */
  const siguienteSilla = laSillaSiguiente(silla);
  const otraVentana =
    enlaceParaLosDemas === null
      ? null
      : `${enlaceParaLosDemas}&silla=${encodeURIComponent(siguienteSilla)}`;

  /*
   * ═══ EL ESTADO PRIMERO Y EL CONTADOR INTERNO DETRÁS ═══
   *
   * Este renglón decía «Revisión 47 · partida terminada»: un número que no
   * significa nada para quien juega —`mesa.rev` es el contador de revisiones del
   * servidor, que la app no enseña en ninguna pantalla— delante de lo único que
   * cambia qué hacer con la mesa. Se le da la vuelta, y lo que no se sepa no se
   * dice: sin `rev` creíble no hay «Revisión», y con un `venceEn` que no es ni
   * número ni `null` no se afirma «sin plazo», que sería inventar una respuesta.
   */
  const cola: string[] = [];
  if (!terminada) {
    if (vence !== null) cola.push(cuantoQueda(vence - Date.now()));
    else if (mesa.venceEn === null) cola.push('sin plazo');
  }
  if (enQueSilla.length > 0) cola.push(enQueSilla);
  if (revision !== null) cola.push(`Revisión ${String(revision)}`);

  return (
    <section className="panel">
      <h2 className="rotulo-de-panel">La mesa</h2>
      {codigo === null ? (
        <p className="letra-chica">
          Este servidor no ha dicho el código de esta mesa, así que no hay nada que pasarle a
          quien falte.
        </p>
      ) : (
        <p className="codigo-grande">{codigo}</p>
      )}
      {enlaceParaLosDemas === null || otraVentana === null ? null : (
        <>
          <p className="letra-chica">
            Pásale esto a quien falte, o el enlace entero:{' '}
            <a href={enlaceParaLosDemas}>{enlaceParaLosDemas}</a>
          </p>
          <p className="letra-chica">
            ¿Pruebas tú solo desde este mismo navegador?{' '}
            <a href={otraVentana} target="_blank" rel="noreferrer">
              Abre otra ventana en la silla «{siguienteSilla}»
            </a>{' '}
            — dos pestañas comparten el bolsillo, y sin esto la segunda te quita el
            asiento de la primera.
          </p>
        </>
      )}
      {/*
        `role="list"` porque `.renglones` lleva `list-style: none`, y eso le quita
        a Safari + VoiceOver la semántica de lista: deja de anunciar «lista de 4
        elementos», que aquí es el dato —cuántos hay sentados—.
      */}
      <ul className="renglones" role="list">
        {asientos.map((a) => (
          <li key={a.id} className={a.id === mesa.yo ? 'yo' : undefined}>
            {a.nombre.length > 0 ? a.nombre : a.id}
            {a.id === mesa.yo ? ' (tú)' : ''}
            {a.presente === false ? ' — fuera' : ''}
          </li>
        ))}
      </ul>
      {/*
        ═══ QUE SE ACABE LA PARTIDA SE OYE ═══

        Va en su propio renglón y con `role="status"`: al aparecer se anuncia
        una vez, que es lo que hace falta, mientras que poner la región viva en
        el renglón de abajo sería anunciar la cuenta atrás CADA SEGUNDO. Y va
        delante del contador interno porque es lo que decide si hay algo que
        hacer con esta mesa.
      */}
      {terminada ? (
        <p className="letra-chica" role="status">
          <strong>La partida ha terminado.</strong>
        </p>
      ) : null}
      {cola.length === 0 ? null : <p className="letra-chica">{cola.join(' · ')}</p>}
    </section>
  );
}

/**
 * LO QUE HA DICHO EL CANAL DE LA MESA, de lo más nuevo a lo más viejo.
 *
 * ═══ NO SE PINTABA NUNCA, Y LA DECISIÓN QUEDA TOMADA AQUÍ ═══
 *
 * Jugando una partida de Riberas de más de CUATROCIENTOS movimientos, el sondeo devolvió
 * `avisos: []` de principio a fin: esto daba `null` toda la tarde y quedaba la duda de si
 * estaba roto. NO LO ESTÁ, y la duda era del rótulo.
 *
 * Esto es el registro DEL CANAL de la mesa —lo que `anunciar` guarda con su revisión para que
 * quien estuviera en segundo plano lo recupere al volver—, y no el relato de la partida. En
 * todo el servidor hay DOS llamadas a `anunciar` para una mesa de arcade y las dos dicen lo
 * mismo, «Se acabó la partida.»: el cierre a mano y el cierre solo al terminar el juego. O sea
 * que el canal de una mesa dice UNA cosa y sólo al final, y `verify:mesa` lo mide jugando
 * veinte movimientos contra un servidor de verdad y contando lo que ha salido por ahí.
 *
 * Y UN ARCADE NO VA A EMITIR UN AVISO POR JUGADA, que era la otra salida. Lo que hay que
 * contar ya tiene un sitio y una redacción: la cinta dice lo que toca hacer, el pregón los
 * trueques, los paneles del juego el estado. Un tercer relato de los mismos hechos dentro de
 * un cajón es exactamente la duplicación que este cliente quita en todas partes
 * —`opcionesFueraDelPregon`, `panelesFueraDelPregon`, `opcionesFueraDeLaBarra`—, y además
 * `arcade/mesas.ts` no importa el canal a propósito.
 *
 * LO QUE SÍ CAMBIA ES EL RÓTULO. «Lo que ha pasado» promete el relato de la partida y lo que
 * trae es el registro del canal; con esa promesa, la caja vacía se lee como un mueble roto.
 * Se llama por lo que es. Y se QUEDA, porque ese único renglón no sobra: llega en el momento
 * en el que el tablero solo no explica nada —una mesa que se para—, y mientras no llega esto
 * devuelve `null` y no ocupa ni un punto del cajón.
 */
function LaCronica({ mesa }: { mesa: LaMesa }): JSX.Element | null {
  if (mesa.cronica.length === 0) return null;
  return (
    <section className="panel">
      <h2 className="rotulo-de-panel">{AVISOS_DE_LA_MESA}</h2>
      {/*
        ═══ UNA REGIÓN QUE SE DESPLAZA Y QUE EL TECLADO NO ALCANZA ES CONTENIDO ESCONDIDO ═══

        `.cronica` es una caja de 16rem con `overflow-y: auto`: a 0,9rem caben
        unos nueve renglones de los hasta 40 que guarda `mesa.ts`, y el resto sólo
        se llegaba a leer con la rueda del ratón. La hoja de estilo ya pone el
        aviso de foco —`.cronica:focus-visible`— y dice que el `tabIndex` y el
        nombre los tiene que poner este fichero, porque un contenedor enfocable
        sin nombre se anuncia «grupo» y no dice qué es.

        El tope de 40 y el desplazamiento se quedan aunque hoy el canal diga UNA cosa: son de
        `mesa.ts`, valen para cualquier mesa —la campaña sí anuncia por su canal— y quitarlos
        sería atar esta caja a la medida de hoy.
      */}
      <ul
        className="renglones cronica"
        tabIndex={0}
        role="group"
        aria-label={AVISOS_DE_LA_MESA}
        aria-live="polite"
      >
        {mesa.cronica.map((a, i) => (
          <li key={`${String(i)}:${a.clave}`}>{a.texto}</li>
        ))}
      </ul>
    </section>
  );
}
