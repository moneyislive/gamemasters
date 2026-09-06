/**
 * QUE EL ESCRITORIO NO MIENTA. Las dos cosas que aquí se rompen en silencio.
 *
 * ═══ POR QUÉ ESTE COMPROBADOR Y NO OTRO ═══
 *
 * Un cliente de pantalla tiene muchos fallos posibles y casi todos se ven: un
 * botón torcido, un color feo, un texto que se sale. Dos NO se ven, y son los
 * dos que este comprobador compra:
 *
 *   1. QUE EL CATÁLOGO MIENTA SOBRE LO QUE SE PUEDE JUGAR. Este cliente entrega
 *      los dos muebles genéricos y no entrega los dos propios. Un arcade de
 *      mueble propio tiene que SALIR en la lista, no poder pulsarse, y decir que
 *      se juega en la app. Las tres cosas a la vez. Fallar cualquiera de ellas
 *      se ve perfecto en pantalla: si desaparece, la lista sigue bonita; si es
 *      pulsable, el fallo llega una pantalla más tarde y parece otra cosa; y si
 *      no lo dice, quien mira concluye que ese juego ya no existe. Y el día que
 *      el contrato estrene un quinto mueble, el arcade que lo estrene se caería
 *      del catálogo sin un solo error en ninguna consola.
 *
 *   2. QUE PINTE ALGO QUE LA PROYECCIÓN NO LE HAYA DADO. Es el fallo más caro
 *      que puede tener un mueble genérico, porque la proyección es lo que TAPA:
 *      todo lo que sale en pantalla tiene que venir de `opciones(vista, quien)`
 *      o del `TableroDeclarado` que viaja dentro de la vista de ese asiento. Un
 *      rótulo inventado aquí —un «empezar» de cortesía, una pieza dibujada por
 *      si acaso— no da error, se ve bien, y ofrece un movimiento que el juego no
 *      ofreció nunca.
 *
 * ═══ CÓMO, Y POR QUÉ NO BASTA CON LLAMAR A LAS FUNCIONES ═══
 *
 * Las funciones puras (`dondeSeJuega`, `queSePinta`, `loQueSePinta`) se llaman
 * con datos. Pero una función pura correcta y un componente que no la usa es
 * exactamente el verde falso que este repositorio ya tiene anotado dos veces. Así
 * que los componentes se RENDERIZAN de verdad —`renderToStaticMarkup`, que no
 * necesita navegador— y sobre el HTML que sale se cuenta lo que hay: lo que se
 * pinta tiene que estar en la entrada, y lo que no está en la entrada no puede
 * salir.
 *
 * Y la entrada no es inventada: la mitad de las comprobaciones usan la proyección
 * DE VERDAD de Riberas, sacada de una partida jugada aquí mismo con el reductor
 * de `shared/`, y el catálogo son los manifiestos DE VERDAD de los arcades
 * instalados. Un tablero de mentira escrito en este fichero probaría que el
 * pincel funciona con lo que este fichero se imagina.
 *
 * ═══ LO QUE ESTO NO COMPRA, DICHO ANTES DE QUE ALGUIEN SE FÍE DE MÁS ═══
 *
 * Que la tabla de `src/muebles.ts` reparta bien los cuatro muebles entre «los
 * pinta la plataforma» y «los pinta el juego». Ese reparto es el §7 y no se puede
 * derivar del contrato: `MuebleDeArcade` es una unión de cuatro cadenas y ninguna
 * dice quién tiene el pincel. Lo que sí se compra es que la tabla los tenga a los
 * CUATRO, que es donde se rompe sola con el tiempo.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { arcadesInstalados, avanzar, hayOpciones, opcionesDeArcade, proyectar } from '../../shared/arcade';
import type { ContextoMovimiento, ManifiestoDeArcade, Opcion } from '../../shared/arcade';
import { MUEBLES_DEL_CONTRATO } from '../../shared/arcade/tipos';
import '../../shared/arcade/juegos';
import {
  EMPEZAR_RIBERAS,
  recalcularElVado,
  recalcularLaGuardia,
  RIBERAS,
  VADO_MINIMO,
} from '../../shared/arcade/juegos';
import type { Bien, CartaEnMano, EstadoDeRiberas, Ficha } from '../../shared/arcade/juegos';
import { aristaDeHex, verticeDeHex } from '../../shared/mecanicas/malla-hexagonal';
import { tableroDeLaVista } from '../../shared/mecanicas/tablero-declarado';
import type { TableroDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { Tarjeta } from '../src/catalogo';
import { Formulario } from '../src/formulario';
import { dondeSeJuega, MUEBLES, mueblesSinDeclarar } from '../src/muebles';
import type { ArcadeDelCatalogo } from '../src/muebles';
import { loQueSePinta, opcionesSueltas, queSePinta } from '../src/plan';
import { canonico } from '../../shared/mecanicas/canonico';
import { CICLO_MAXIMO_MS, pausaAntesDeVolverAPreguntar, TOPE_DE_PAUSA_MS, VENTANA_DE_PRESENCIA } from '../src/relojes';
import { Retablo } from '../src/retablo';
import { loQuePide, PLAZOS, tocaElMuelle } from '../src/sala';
import { loQueQuedaTrasElSondeo, seVuelveSoloAlSitio, SIN_AVISO } from '../src/mesa';
import type { LaMesa, MesaVista, ResultadoDelMovimiento } from '../src/mesa';
import { loQueSeDiceDeUnFallo } from '../src/red-de-seguridad';
import { haEmpezado } from '../src/empezada';
import { Muelle } from '../src/muelle';
import { temaDelMuelle, tieneMuelle } from '../../escenas/embarcadero/tema';
import { FIGURAS } from '../../escenas/embarcadero/figuras';
import { semillaDeCodigo } from '../../escenas/embarcadero/cala';
import { MarcadorDeRiberas, RiberasEnTres } from '../src/riberas-en-tres';
import {
  bienesQueSeCambianPor,
  cartasEnTres,
  colocandoEnTres,
  comprarEnTres,
  jugadasDeLaCarta,
  manoEnTres,
  marcadorEnTres,
  mazoEnLaBarra,
  opcionesFueraDeLaBarra,
  opcionesFueraDeLaMano,
  opcionesFueraDelTablero,
  PIEZAS_DE_LA_BARRA,
  revelarDe,
  seVeEnTres,
  tableroEnTres,
  TIPOS_QUE_PINTA_LA_MANO,
  truequesPosibles,
} from '../../shared/arcade/juegos/riberas-en-tres';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 500)}`}`,
  );
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

/** El texto plano de un trozo de HTML, para poder buscar dentro. */
function palabrasDe(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cuántas veces se abre una etiqueta. Para contar piezas pintadas. */
function cuantos(html: string, etiqueta: string): number {
  return html.split(`<${etiqueta}`).length - 1;
}

// ---------------------------------------------------------------------------
// 1 · El catálogo no miente sobre lo que se puede jugar
// ---------------------------------------------------------------------------

/**
 * EL CATÁLOGO TAL COMO SALE DE `GET /api/arcade`, MONTADO AQUÍ.
 *
 * ═══ POR QUÉ SE REPITE AQUÍ LA EXPRESIÓN DE LA RUTA, Y QUÉ LA VIGILA ═══
 *
 * La ruta contesta `arcadesInstalados()` más `publicaOpciones: hayOpciones(id)`,
 * y esas dos líneas están escritas dos veces: allí y aquí. Traerlas de un módulo
 * común sería peor de lo que parece —`server/src/routes/arcade.ts` es código de
 * Express, y este comprobador se apoya en no levantar ningún servidor: por eso
 * tarda segundos y no minutos, y por eso puede correr en cualquier sitio—.
 *
 * Lo que impide que las dos copias diverjan en silencio no es la disciplina: es
 * que las dos salen de la MISMA función del contrato, `hayOpciones()`. Si mañana
 * la ruta decide contestar otra cosa, lo que cambia es qué se publica y no cómo
 * se calcula, y eso se ve en el diff de la ruta.
 *
 * Lo que esto NO compra, y conviene decirlo antes de que alguien se fíe de más:
 * que la ruta mande de verdad el campo. Eso solo lo compra una petición a un
 * servidor vivo, y este comprobador no levanta ninguno. Lo que sí compra es lo
 * otro —que la decisión del catálogo sea correcta CON el campo puesto y CON el
 * campo ausente—, que es lo que se rompía.
 */
function elCatalogoQuePublicaElServidor(): ArcadeDelCatalogo[] {
  return arcadesInstalados().map((m) => ({ ...m, publicaOpciones: hayOpciones(m.id) }));
}

/**
 * ¿SE PREGUNTA SI EL ARCADE PUBLICA ALGO QUE PINTAR? Las tres respuestas.
 *
 * ═══ POR QUÉ ESTO VA CON MANIFIESTOS FABRICADOS Y NO CON LOS DE CASA ═══
 *
 * Porque una comprobación atada a los arcades instalados hoy se apaga sola el
 * día que alguien los cambie: el caso que importa —mueble de lista, sin lista—
 * lo encarna hoy «La Ronda», y en cuanto La Ronda registre sus `opciones()` esta
 * comprobación pasaría a no comprobar nada y nadie se enteraría. Es exactamente
 * la forma de verde falso que este repositorio ya tiene anotada tres veces.
 *
 * Fabricando los tres casos, la regla se compra ella sola y para siempre; que
 * hoy además haya un arcade real que cae en el caso malo lo compra el bucle de
 * arriba, que sí recorre los instalados de verdad.
 */
function laTerceraPregunta(): void {
  paso('Un mueble genérico sin nada declarado que pintar no se ofrece como jugable');

  const base = arcadesInstalados().find((m) => m.sede === 'servidor');
  comprobar('hay un arcade con mesa en el servidor del que partir', base !== undefined);
  if (base === undefined) return;

  const conLista: ArcadeDelCatalogo = {
    ...base,
    id: 'de-lista-con-lista',
    nombre: 'El de la lista',
    mueble: 'formulario',
    publicaOpciones: true,
  };
  const sinLista: ArcadeDelCatalogo = { ...conLista, id: 'de-lista-sin-lista', publicaOpciones: false };
  const noLoDice: ArcadeDelCatalogo = { ...conLista, id: 'de-lista-sin-saber', publicaOpciones: undefined };

  comprobar(
    'un arcade de mueble-lista que publica su lista sí se puede jugar aquí',
    dondeSeJuega(conLista).aqui,
  );

  const apagado = dondeSeJuega(sinLista);
  comprobar('uno que no la publica NO se ofrece', !apagado.aqui);
  comprobar(
    'y se dice que no hay nada que enseñar, no que se juegue en otro sitio',
    !apagado.aqui && apagado.razon === 'no-publica-nada',
    apagado,
  );
  /*
   * Y LA TARJETA, no solo la función. Una regla correcta en un módulo puro y un
   * componente que la ignora es el verde falso de siempre, y aquí se paga caro
   * porque lo que sale mal es un `<a href>` que abre y persiste una mesa.
   */
  const htmlApagado = renderToStaticMarkup(
    <Tarjeta arcade={sinLista} enlace="/sala/de-lista-sin-lista" />,
  );
  comprobar('y su tarjeta no lleva ni un enlace', !htmlApagado.includes('<a '), htmlApagado);
  comprobar(
    'pero sigue saliendo en la lista con su nombre',
    palabrasDe(htmlApagado).includes('El de la lista'),
  );

  const sinSaber = dondeSeJuega(noLoDice);
  comprobar(
    'y si el servidor es más viejo y no contesta a la pregunta, tampoco se promete',
    !sinSaber.aqui && sinSaber.razon === 'el-servidor-no-lo-dice',
    sinSaber,
  );

  /*
   * ═══ Y EL MUEBLE `tablero` NO PAGA ESTE PEAJE, QUE ES LA OTRA MITAD ═══
   *
   * Un tablero declara que resuelve su dibujo dentro de la proyección, y esa
   * proyección no existe hasta que hay partida: exigirle aquí una lista de
   * opciones dejaría fuera a Riberas, que es el arcade que sí se juega. La
   * asimetría es la regla, no un olvido, y por eso se compra explícitamente:
   * sin esta línea, «endurecer» la de arriba apagaría el catálogo entero y el
   * comprobador felicitaría a quien lo hiciera.
   */
  const tableroSinLista: ArcadeDelCatalogo = {
    ...base,
    id: 'de-tablero-sin-lista',
    nombre: 'El del dibujo',
    mueble: 'tablero',
    publicaOpciones: false,
  };
  comprobar(
    'un arcade de tablero se ofrece aunque no publique lista: su dibujo va en la proyección',
    dondeSeJuega(tableroSinLista).aqui,
  );
}

function elCatalogoNoMiente(): void {
  paso('Los cuatro muebles del contrato están declarados en el escritorio');

  const sinDeclarar = mueblesSinDeclarar();
  comprobar(
    'ningún mueble del contrato se queda fuera de la tabla del escritorio',
    sinDeclarar.length === 0,
    { sinDeclarar, contrato: MUEBLES_DEL_CONTRATO },
  );
  comprobar(
    'y la tabla no se ha quedado corta respecto al contrato',
    Object.keys(MUEBLES).length === MUEBLES_DEL_CONTRATO.length,
    { tabla: Object.keys(MUEBLES), contrato: MUEBLES_DEL_CONTRATO },
  );

  /*
   * ═══ DOS PINCELES, DOS MUEBLES. NI UNO MÁS ═══
   *
   * Este cliente tiene exactamente dos componentes que saben pintar una mesa:
   * `Formulario` y `Retablo`. Y `queSePinta` lo dice con su propio tipo: solo
   * puede contestar `formulario`, `tablero` o `nada`. O sea que marcar un tercer
   * mueble como «lo pinta la plataforma» sería prometer un pincel que no existe,
   * y el resultado sería una tarjeta pulsable que lleva a una pantalla que no
   * sabe dibujarse.
   *
   * Sin esta línea, cambiar `lienzo` a `la-plataforma` NO se ponía rojo: El
   * Arcade es de `sede: 'dispositivo'`, así que la otra regla lo seguía dejando
   * fuera y el fallo quedaba escondido hasta que llegara un arcade de lienzo con
   * mesa en el servidor. Comprobado a mano rompiéndolo.
   */
  const conPincel = MUEBLES_DEL_CONTRATO.filter((m) => MUEBLES[m]?.quienPinta === 'la-plataforma');
  comprobar(
    'este cliente promete pintar exactamente los dos muebles para los que tiene pincel',
    conPincel.length === 2 && conPincel.includes('formulario') && conPincel.includes('tablero'),
    conPincel,
  );

  paso('Cada arcade instalado sale en el catálogo, y dice la verdad sobre dónde se juega');

  const instalados = elCatalogoQuePublicaElServidor();
  comprobar('hay arcades instalados que mirar', instalados.length > 0, instalados.length);

  let jugables = 0;
  let enLaApp = 0;

  for (const m of instalados) {
    const donde = dondeSeJuega(m);
    const html = renderToStaticMarkup(<Tarjeta arcade={m} enlace={`/sala/${m.id}`} />);
    const texto = palabrasDe(html);

    /*
     * LO PRIMERO, PARA TODOS: que la tarjeta EXISTA y sea legible. Un arcade que
     * no se puede jugar aquí y que desaparece de la lista es la mentira por
     * omisión, y es la más fácil de escribir sin querer.
     */
    comprobar(`«${m.nombre}» sale en el catálogo con su nombre`, texto.includes(m.nombre), texto);
    comprobar(`«${m.nombre}» sale con su gancho`, texto.includes(m.gancho), texto);

    if (donde.aqui) {
      jugables++;
      comprobar(`«${m.nombre}» se puede pulsar`, html.includes(`href="/sala/${m.id}"`), html);
      /*
       * Y no puede decir que se juega aquí un arcade cuya mesa NO EXISTE en el
       * servidor: con `sede: 'dispositivo'`, `POST /api/arcade/mesas` contesta
       * 409 «sin-mesa». Eso es exactamente el botón que da error al pulsarlo.
       */
      comprobar(
        `«${m.nombre}» se ofrece aquí y tiene mesa en el servidor`,
        m.sede === 'servidor',
        m,
      );
      comprobar(
        `«${m.nombre}» se ofrece aquí y su mueble lo pinta la plataforma`,
        MUEBLES[m.mueble]?.quienPinta === 'la-plataforma',
        m.mueble,
      );
      /*
       * ═══ Y LA TERCERA, QUE ES LA QUE FALTABA Y DEJÓ PASAR UNA MESA MUERTA ═══
       *
       * Las dos de arriba compran que hay PINCEL. Ninguna preguntaba si el juego
       * tiene algo QUE PINTAR, y con eso «La Ronda» —`formulario` + `servidor`,
       * o sea las dos casillas marcadas— pasaba en verde con la tarjeta
       * pulsable, y quien la pulsaba abría una mesa de verdad, se sentaba de
       * verdad y repartía un código de cinco letras a tres personas para que las
       * cuatro se encontraran una pantalla sin nada. Verde de punta a punta.
       *
       * Un mueble genérico pinta dato declarado, así que «tener algo que pintar»
       * es: o el juego publica `opciones()`, o su mueble es `tablero` —que es la
       * declaración de que resuelve un dibujo dentro de su proyección, y eso no
       * se puede comprobar sin una partida en marcha—. Sin ninguna de las dos no
       * es «todavía no»: es «nunca».
       */
      comprobar(
        `«${m.nombre}» se ofrece aquí y publica algo que un mueble genérico pueda pintar`,
        hayOpciones(m.id) || m.mueble === 'tablero',
        { mueble: m.mueble, publicaOpciones: m.publicaOpciones },
      );
    } else {
      if (donde.razon === 'en-la-app') enLaApp++;
      /*
       * NO PULSABLE Y DICIÉNDOLO. Se mira que no haya ni un `<a` en toda la
       * tarjeta, no que «el enlace apunte a otro sitio»: un enlace muerto sigue
       * pareciendo pulsable, y quien lo pulse acaba en una pantalla que no sabe
       * pintarse.
       */
      comprobar(`«${m.nombre}» no se puede pulsar`, !html.includes('<a '), html);
      comprobar(`«${m.nombre}» dice por qué no`, texto.includes(donde.porque), donde.porque);
      /*
       * ═══ Y CADA NEGATIVA DICE LA SUYA, QUE ES LA MITAD QUE FALTABA ═══
       *
       * Esto exigía antes que TODA tarjeta apagada dijera «en la app», y esa
       * regla es la que habría convertido la corrección en una segunda mentira:
       * de un arcade que no publica nada no se puede decir que se juegue en la
       * app, porque tampoco. Quien lo leyera se iría al móvil a buscar un juego
       * que allí tampoco está.
       *
       * Así que la regla se parte en dos y las dos se compran: solo `en-la-app`
       * puede mandar a alguien a la app, y las otras dos tienen prohibido
       * hacerlo.
       */
      if (donde.razon === 'en-la-app') {
        comprobar(
          `«${m.nombre}» dice dónde se juega`,
          donde.porque.includes('en la app'),
          donde.porque,
        );
      } else {
        comprobar(
          `«${m.nombre}» no manda a la app sin saber si allí está`,
          !donde.porque.includes('Se juega en la app'),
          donde.porque,
        );
      }
    }
  }

  /*
   * Y QUE NO SEA VERDAD POR VACÍO. Si un día no hubiera ni un solo arcade de
   * mueble propio instalado, todo lo de arriba pasaría sin comprobar nada de lo
   * que existe para comprobar. Hoy hay de los dos, y eso se afirma.
   */
  comprobar('hay al menos un arcade jugable en el escritorio', jugables > 0, { jugables });
  comprobar(
    'y al menos uno que se juega en la app, o esto no habría comprobado nada',
    enLaApp > 0,
    { enLaApp },
  );

  laTerceraPregunta();

  paso('Un mueble que este cliente no conociera se dice, no se rompe');

  /*
   * El catálogo lo escribe el servidor, y un servidor más nuevo que este
   * empaquetado es lo que va a existir en cuanto haya un despliegue parcial. Se
   * fabrica un manifiesto con un mueble de mañana y se mira que la tarjeta salga
   * igual, apagada y explicada, en vez de tumbar la lista entera.
   */
  const deMañana = {
    ...(arcadesInstalados()[0] as ManifiestoDeArcade),
    id: 'de-manana',
    nombre: 'El de mañana',
    mueble: 'holograma',
  } as unknown as ManifiestoDeArcade;
  const dondeElDeMañana = dondeSeJuega(deMañana);
  comprobar('un mueble desconocido no se ofrece como jugable', !dondeElDeMañana.aqui);
  const htmlDeMañana = renderToStaticMarkup(<Tarjeta arcade={deMañana} enlace="/sala/de-manana" />);
  comprobar('pero su tarjeta sale igual', palabrasDe(htmlDeMañana).includes('El de mañana'));
  comprobar('y no es pulsable', !htmlDeMañana.includes('<a '));
}

// ---------------------------------------------------------------------------
// 2 · No se pinta nada que la proyección no haya dado
// ---------------------------------------------------------------------------

/** Los nombres de los asientos de prueba, por orden: los dos de siempre y los que hacen falta para pasar de cuatro. */
const NOMBRES_DE_PRUEBA = ['Ana', 'Bruno', 'Carla', 'Darío', 'Elena', 'Fabio'];

/** Los asientos de una mesa de prueba con tantos sentados: `s1`, `s2`, ... con su nombre. */
function sentadosDePrueba(cuantosAsientos: number): { asiento: string; nombre: string }[] {
  return NOMBRES_DE_PRUEBA.slice(0, cuantosAsientos).map((nombre, i) => ({ asiento: `s${String(i + 1)}`, nombre }));
}

/**
 * Una partida de Riberas de verdad, jugada aquí con el reductor de `shared/`. Con
 * dos asientos si no se dice otra cosa; con cinco es la mesa que el tablero en tres
 * dimensiones NO sabe pintar —el atlas trae cuatro colores— y ésa es la que en la
 * primera versión del pintor salía como cincuenta y cuatro botones sueltos.
 */
function laProyeccionDeVerdad(cuantosAsientos = 2): { vista: unknown; opciones: readonly Opcion[] } {
  const sentados = sentadosDePrueba(cuantosAsientos);
  const asientos = sentados.map((s) => s.asiento);
  const ctx = (quien: string | null): ContextoMovimiento => ({
    quien,
    azar: 987_654,
    tic: 0,
    asientos,
  });

  let estado: unknown = undefined;
  estado = avanzar(RIBERAS, estado, { tipo: EMPEZAR_RIBERAS, carga: {} }, ctx('s1'));

  const vista = proyectar(RIBERAS, estado, 's1', sentados);
  /*
   * Las opciones se piden por el mismo camino que las pide la mesa: la función
   * del alta, con LA VISTA y no con el estado. Si aquí se le pasara el estado,
   * esto estaría comprobando una segunda proyección que en producción no existe.
   */
  const opciones = opcionesDeArcade(RIBERAS, vista, 's1');
  return { vista, opciones };
}

function noSePintaDeMas(): void {
  paso('El retablo pinta exactamente las piezas del tablero declarado, y ninguna más');

  const { vista, opciones } = laProyeccionDeVerdad();
  const tablero = tableroDeLaVista(vista);
  comprobar('la proyección de Riberas trae un tablero declarado', tablero !== null);
  if (tablero === null) return;

  const piezas = loQueSePinta(tablero);
  comprobar(
    'el aplanado no añade ni pierde piezas',
    piezas.length === tablero.caras.length + tablero.lineas.length + tablero.nudos.length,
    {
      piezas: piezas.length,
      caras: tablero.caras.length,
      lineas: tablero.lineas.length,
      nudos: tablero.nudos.length,
    },
  );
  /*
   * EL ORDEN DE CAPAS. En SVG lo de después tapa a lo de antes: caras debajo,
   * líneas encima, nudos arriba del todo. Un tablero pintado en otro orden se ve
   * a medias y el fallo parece del juego que lo declaró.
   */
  const clases = piezas.map((p) => p.clase);
  const ordenado = [...clases].sort(
    (a, b) => ordenDeCapa(a) - ordenDeCapa(b),
  );
  comprobar('y las capas salen en orden: caras, líneas, nudos', clases.join(',') === ordenado.join(','));

  const html = renderToStaticMarkup(
    <Retablo tablero={tablero} alTocar={() => undefined} quieto={false} />,
  );

  comprobar('se pinta un polígono por cara', cuantos(html, 'polygon') === tablero.caras.length, {
    pintados: cuantos(html, 'polygon'),
    declaradas: tablero.caras.length,
  });
  comprobar('un segmento por línea', cuantos(html, 'line') === tablero.lineas.length, {
    pintados: cuantos(html, 'line'),
    declaradas: tablero.lineas.length,
  });
  comprobar(
    'y una figura por nudo',
    cuantos(html, 'circle') + cuantos(html, 'rect') === tablero.nudos.length,
    {
      pintados: cuantos(html, 'circle') + cuantos(html, 'rect'),
      declarados: tablero.nudos.length,
    },
  );

  /*
   * ═══ LA COMPROBACIÓN CENTRAL: NI UNA PALABRA DE COSECHA PROPIA ═══
   *
   * Todo lo que se lee dentro del retablo tiene que estar declarado en el
   * tablero: su aviso, los rótulos y las cifras de sus caras. Cualquier otra
   * palabra en pantalla la habría puesto este cliente, que no sabe a qué se
   * juega y por tanto no puede tener nada que decir.
   */
  const declarado = [
    tablero.aviso,
    ...tablero.caras.map((c) => c.rotulo),
    ...tablero.caras.map((c) => c.cifra),
  ]
    .join(' ')
    .replace(/\s+/g, ' ');
  const enPantalla = palabrasDe(html);
  const intrusas = enPantalla
    .split(' ')
    .filter((p) => p.length > 0)
    .filter((p) => !declarado.includes(p));
  comprobar('no sale en pantalla ni una palabra que no viniera declarada', intrusas.length === 0, {
    intrusas: intrusas.slice(0, 12),
  });

  /*
   * Y NI UN MOVIMIENTO DE COSECHA PROPIA. Cada pieza tocable lleva su movimiento
   * dentro; las que no lo llevan no se pueden tocar. Se comprueba contando, y
   * después quitándole a mano el `toque` a todas: sin un solo `toque` declarado,
   * el retablo no puede ofrecer ni un sitio donde pulsar.
   */
  const tocables = piezas.filter((p) => p.toque !== null).length;
  comprobar(
    'hay tantos sitios pulsables como piezas con movimiento declarado',
    contarRoles(html) === tocables,
    { enPantalla: contarRoles(html), declaradas: tocables },
  );

  const mudo: TableroDeclarado = {
    ...tablero,
    caras: tablero.caras.map((c) => ({ ...c, toque: null })),
    lineas: tablero.lineas.map((l) => ({ ...l, toque: null })),
    nudos: tablero.nudos.map((n) => ({ ...n, toque: null })),
  };
  const htmlMudo = renderToStaticMarkup(
    <Retablo tablero={mudo} alTocar={() => undefined} quieto={false} />,
  );
  comprobar(
    'un tablero sin ningún movimiento declarado no ofrece dónde pulsar',
    contarRoles(htmlMudo) === 0,
    contarRoles(htmlMudo),
  );
  comprobar(
    'y aun así se sigue dibujando entero',
    cuantos(htmlMudo, 'polygon') === tablero.caras.length &&
      cuantos(htmlMudo, 'circle') + cuantos(htmlMudo, 'rect') === tablero.nudos.length,
  );

  paso('Con tablero delante, cada movimiento se enseña exactamente una vez');

  /*
   * Riberas resuelve su tablero A PARTIR de sus propias opciones, así que
   * mientras la mesa se reúne el mismo movimiento sale como acción del tablero y
   * como opción. Pintar las dos listas tal cual da botones repetidos, y un botón
   * repetido hace creer que hay dos cosas distintas que hacer. Medido en pantalla
   * antes de escribir esto: «Repartir el delta» salía dos veces.
   */
  const sueltas = opcionesSueltas(tablero, opciones);
  const enElTablero = new Set<string>();
  for (const p of piezas) {
    if (p.toque !== null) enElTablero.add(canonico({ tipo: p.toque.tipo, carga: p.toque.carga }));
  }
  for (const a of tablero.acciones) {
    enElTablero.add(canonico({ tipo: a.toque.tipo, carga: a.toque.carga }));
  }
  comprobar(
    'ninguna opción suelta repite un movimiento que el tablero ya enseña',
    sueltas.every((o) => !enElTablero.has(canonico({ tipo: o.tipo, carga: o.carga }))),
    sueltas.map((o) => o.id),
  );
  /*
   * Y LA OTRA MITAD, que es la que se rompe al «arreglar» la de arriba: entre lo
   * que enseña el tablero y lo que queda suelto tienen que estar TODAS. Filtrar
   * de más sería esconder movimientos legales, que es peor que repetirlos.
   */
  const alcanzables = new Set([
    ...enElTablero,
    ...sueltas.map((o) => canonico({ tipo: o.tipo, carga: o.carga })),
  ]);
  comprobar(
    'y no se pierde ni una: todo lo que ofreció el juego se puede pulsar en algún sitio',
    opciones.every((o) => alcanzables.has(canonico({ tipo: o.tipo, carga: o.carga }))),
    opciones
      .filter((o) => !alcanzables.has(canonico({ tipo: o.tipo, carga: o.carga })))
      .map((o) => o.id),
  );

  paso('El formulario pinta un botón por opción, ni uno más');

  const html3 = renderToStaticMarkup(
    <Formulario opciones={opciones} alElegir={() => undefined} quieto={false} />,
  );
  comprobar('un botón por opción', cuantos(html3, 'button') === opciones.length, {
    botones: cuantos(html3, 'button'),
    opciones: opciones.length,
  });
  for (const o of opciones) {
    comprobar(`el rótulo «${o.rotulo}» sale tal cual`, palabrasDe(html3).includes(o.rotulo));
  }
  comprobar(
    'y no hay más rótulos que opciones',
    (html3.split('class="opcion-rotulo"').length - 1) === opciones.length,
  );

  paso('Cero opciones se dice, no se rellena');

  const html0 = renderToStaticMarkup(
    <Formulario opciones={[]} alElegir={() => undefined} quieto={false} />,
  );
  comprobar('sin opciones no hay ni un botón', cuantos(html0, 'button') === 0, html0);
  comprobar(
    'y se dice que no hay nada que hacer',
    palabrasDe(html0).includes('no hay nada que puedas hacer'),
    palabrasDe(html0),
  );

  paso('Qué mueble toca se decide por lo que HAY, no por lo que declara el manifiesto');

  const conTablero = queSePinta(vista, opciones);
  comprobar('con tablero en la vista, se pinta el tablero', conTablero.que === 'tablero');
  comprobar(
    'y es exactamente el objeto que vino en la proyección',
    conTablero.que === 'tablero' && conTablero.tablero === tablero,
  );

  const soloOpciones = queSePinta({ loQueSea: 1 }, opciones);
  comprobar(
    'sin tablero pero con opciones, se pinta el formulario',
    soloOpciones.que === 'formulario',
  );

  const nada = queSePinta({ loQueSea: 1 }, []);
  comprobar('sin tablero y sin opciones, no se inventa nada', nada.que === 'nada');
  comprobar(
    'y se dice por qué no hay nada',
    nada.que === 'nada' && nada.porque.length > 0 && nada.porque.includes('en la app'),
  );
}

function ordenDeCapa(clase: 'cara' | 'linea' | 'nudo'): number {
  return clase === 'cara' ? 0 : clase === 'linea' ? 1 : 2;
}

/** Cuántos sitios pulsables hay en el SVG. */
function contarRoles(html: string): number {
  return html.split('role="button"').length - 1;
}

// ---------------------------------------------------------------------------
// 3 · La pausa del sondeo cabe en la ventana de presencia
// ---------------------------------------------------------------------------

function laPausaCabe(): void {
  paso('El ciclo del sondeo cabe en la ventana de presencia del servidor');

  /*
   * Esta cuenta está DUPLICADA de `app/src/arcade/relojes.ts` —ver su cabecera—,
   * y una fórmula duplicada sin red es una fórmula que diverge. Lo que compra
   * esta comprobación es que si alguien sube el tope aquí sin mirar la ventana de
   * presencia, se ponga rojo antes de que la gente empiece a salir «(fuera)» con
   * la pantalla delante.
   */
  comprobar(
    'la petición aparcada más la pausa máxima caben en la ventana de presencia',
    CICLO_MAXIMO_MS < VENTANA_DE_PRESENCIA,
    { ciclo: CICLO_MAXIMO_MS, ventana: VENTANA_DE_PRESENCIA },
  );

  const ahora = 1_000_000;
  comprobar(
    'sin plazo no se pausa',
    pausaAntesDeVolverAPreguntar(null, false, true, ahora) === 0,
  );
  comprobar(
    'con la mesa terminada no se pausa',
    pausaAntesDeVolverAPreguntar(ahora + 86_400_000, true, true, ahora) === 0,
  );
  comprobar(
    'mientras la mesa se reúne no se pausa, que es cuando dos personas se esperan mirando',
    pausaAntesDeVolverAPreguntar(ahora + 86_400_000, false, false, ahora) === 0,
  );
  comprobar(
    'en el último tramo del plazo no se pausa',
    pausaAntesDeVolverAPreguntar(ahora + 30_000, false, true, ahora) === 0,
  );
  const enUnaLarga = pausaAntesDeVolverAPreguntar(ahora + 86_400_000, false, true, ahora);
  comprobar('en una mesa de un día sí se pausa', enUnaLarga > 0, enUnaLarga);
  comprobar('pero nunca más que el tope', enUnaLarga <= TOPE_DE_PAUSA_MS, {
    pausa: enUnaLarga,
    tope: TOPE_DE_PAUSA_MS,
  });
}

// ---------------------------------------------------------------------------
// 3 bis · Las dos cosas que la pantalla decide sola y no da error al decidir mal
// ---------------------------------------------------------------------------

/**
 * LOS PLAZOS Y EL AVISO. Dos listas cortas, dos fallos que no se ven.
 *
 * Ninguna de las dos rompe nada: un plazo malo produce una partida mal repartida
 * que parece culpa tuya, y un aviso borrado produce un movimiento perdido que
 * parece un movimiento hecho. Los dos salieron de este cliente y los dos estaban
 * fuera del alcance de cualquier comprobador, porque vivían dentro de un
 * componente y dentro de un bucle `async`.
 */
function loQueLaPantallaDecideSola(): void {
  paso('El plazo que se ofrece de serie no juega por ti');

  /*
   * ═══ POR QUÉ ESTO ES UNA COMPROBACIÓN Y NO UN COMENTARIO ═══
   *
   * Cuando un plazo vence, el reductor COLOCA POR QUIEN NO HA LLEGADO. No avisa,
   * no da error y no deja renglón en la crónica: la partida sale mal repartida y
   * parece cosa tuya. Y el flujo entero de este cliente es «abro mesa, copio
   * cinco letras, se las paso a alguien», o sea que entre abrir y sentarse el
   * segundo pasa el tiempo que tarda una persona en mirar un chat.
   *
   * Esta lista ofrecía «medio minuto por turno» Y LO TRAÍA PUESTO. Un número en
   * una lista de números no se lee como un fallo, así que se afirma aquí: la
   * opción por defecto no manda plazo —lo decide el servidor— y ninguna de las
   * que se ofrecen aprieta más que la más corta de la app, que son diez minutos.
   */
  const deSerie = PLAZOS[0];
  comprobar('hay plazos que ofrecer', PLAZOS.length > 0, PLAZOS.length);
  comprobar(
    'el que va de serie no manda ningún número: lo decide el servidor',
    deSerie !== undefined && deSerie.segundos === undefined,
    deSerie,
  );
  const apretados = PLAZOS.filter(
    (p) => p.segundos !== undefined && p.segundos > 0 && p.segundos < 10 * 60,
  );
  comprobar(
    'y ningún plazo ofrecido aprieta más de lo que aprieta el más corto de la app',
    apretados.length === 0,
    apretados,
  );
  comprobar(
    'se puede pedir una mesa sin plazo, que está documentado como legítimo',
    PLAZOS.some((p) => p.segundos === 0),
    PLAZOS.map((p) => p.segundos),
  );
  comprobar(
    'y cada plazo dice en palabras cuánto es, porque «Un día» y «Sin prisa» no se distinguen solos',
    PLAZOS.every((p) => p.rotulo.length > 0 && p.ayuda.length > 0),
    PLAZOS,
  );

  paso('El sondeo borra lo que dijo la red, y no lo que dijo tu jugada');

  /*
   * El aviso del rechazo es TODA la máquina que tiene esta pantalla para decir
   * que tu movimiento no ha entrado: no va a la crónica, no deja rastro y no
   * tiene reloj. Y el sondeo lo borraba entero en cuanto otro jugador movía, que
   * es el peor instante posible — porque a la vez cambia el tablero, y un
   * tablero que cambia después de pulsar se lee como «entró».
   */
  const rechazo = { texto: 'Ese movimiento no se ha podido hacer.', de: 'tu-jugada' } as const;
  comprobar(
    'un rechazo sobrevive a que el sondeo traiga la jugada de otro',
    loQueQuedaTrasElSondeo(rechazo) === rechazo,
    loQueQuedaTrasElSondeo(rechazo),
  );
  const caida = { texto: 'Se ha perdido la mesa. Reintentando.', de: 'la-red' } as const;
  comprobar(
    'y una queja de la red sí se borra cuando la red vuelve',
    loQueQuedaTrasElSondeo(caida).texto === '',
    loQueQuedaTrasElSondeo(caida),
  );
  comprobar(
    'un aviso vacío se queda vacío, venga de donde venga',
    loQueQuedaTrasElSondeo(SIN_AVISO).texto === '' &&
      loQueQuedaTrasElSondeo({ texto: '', de: 'tu-jugada' }).texto === '',
  );

  paso('Y si algo se rompe pintando, la pantalla dice qué, no se queda en blanco');

  /*
   * Lo que se compra aquí es EL TEXTO y no la red. Que la red atrape no se puede
   * comprobar desde aquí: `renderToStaticMarkup` no ejecuta los límites de
   * error, así que una prueba montada sobre él pasaría por el motivo equivocado
   * —está dicho en la cabecera de `red-de-seguridad.tsx`—.
   *
   * Y el texto es lo que se rompe con el tiempo. Lo que hace útil esa pantalla
   * es que quien se la encuentre tenga UNA LÍNEA QUE PEGAR en el mensaje que va
   * a mandar; el día que alguien enseñe ahí un objeto, se leerá «[object
   * Object]» y la pantalla habrá dejado de servir sin dejar de funcionar.
   */
  comprobar(
    'el mensaje de un Error sale tal cual, que es la línea que alguien va a copiar',
    loQueSeDiceDeUnFallo(new Error('no se puede leer «filter» de undefined')) ===
      'no se puede leer «filter» de undefined',
  );
  comprobar(
    'lo que se lanzó sin ser un Error tampoco se pinta como un objeto',
    !loQueSeDiceDeUnFallo({ raro: 1 }).includes('object Object') &&
      loQueSeDiceDeUnFallo({ raro: 1 }).length > 0,
    loQueSeDiceDeUnFallo({ raro: 1 }),
  );
  comprobar(
    'y un Error sin mensaje se dice, no se enseña en blanco',
    loQueSeDiceDeUnFallo(new Error('')).length > 0,
    loQueSeDiceDeUnFallo(new Error('')),
  );
}

// ---------------------------------------------------------------------------
// 4 · Las direcciones, que son la mitad de lo que hace esto de escritorio
// ---------------------------------------------------------------------------

function lasDirecciones(): void {
  paso('Una dirección dice qué pantalla es, y el código de mesa cabe en ella');

  comprobar('la raíz de la Sala es el catálogo', loQuePide('/sala/', '').que === 'catalogo');
  comprobar('la raíz sin barra también', loQuePide('/sala', '').que === 'catalogo');

  const conCodigo = loQuePide('/sala/riberas', '?codigo=abcde');
  comprobar('una dirección de arcade lleva a su mesa', conCodigo.que === 'mesa');
  comprobar(
    'con el arcade y el código puestos, y el código en mayúsculas',
    conCodigo.que === 'mesa' && conCodigo.arcade === 'riberas' && conCodigo.codigo === 'ABCDE',
    conCodigo,
  );
  const conSilla = loQuePide('/sala/riberas', '?silla=b');
  comprobar(
    'y la silla, que es lo que permite dos ventanas en la misma mesa',
    conSilla.silla === 'b',
    conSilla,
  );

  /*
   * ═══ Y A QUÉ MESA SE VA CUANDO DOS COSAS PIDEN COSAS DISTINTAS ═══
   *
   * El enlace de una mesa y el asiento guardado de otra pueden llegar a la vez, y
   * hasta el 4-sep-2026 ganaba siempre el guardado: medido en producción, pidiendo
   * `?codigo=27VCR` se salía en la mesa `9ZK36`, sin un solo aviso. Quien recibe un
   * enlace no tiene forma de entender eso, y con dos pruebas seguidas en el mismo
   * navegador pasa siempre.
   */
  comprobar(
    'sin código en la dirección se vuelve solo al asiento guardado',
    seVuelveSoloAlSitio({ codigoGuardado: 'ABCDE', codigoPedido: '', seLevantoAqui: false }),
  );
  comprobar(
    'y con el código de la mesa en la que ya se está, también',
    seVuelveSoloAlSitio({ codigoGuardado: 'ABCDE', codigoPedido: 'ABCDE', seLevantoAqui: false }),
  );
  comprobar(
    'pero un enlace a OTRA mesa manda sobre el asiento guardado',
    !seVuelveSoloAlSitio({ codigoGuardado: 'ABCDE', codigoPedido: 'ZZZZZ', seLevantoAqui: false }),
    'sin esto, quien ya tiene asiento en este arcade no entra por enlace a ninguna otra mesa',
  );
  comprobar(
    'y de la mesa de la que uno acaba de levantarse no se vuelve solo, pida lo que pida la dirección',
    !seVuelveSoloAlSitio({ codigoGuardado: 'ABCDE', codigoPedido: '', seLevantoAqui: true }) &&
      !seVuelveSoloAlSitio({ codigoGuardado: 'ABCDE', codigoPedido: 'ABCDE', seLevantoAqui: true }),
  );
}

// ---------------------------------------------------------------------------
// 5 · El muelle: cuándo se pinta, y que el raíl exista sin el mundo
// ---------------------------------------------------------------------------

/**
 * Una mesa de mentira SÓLO en lo que no es del juego: las funciones del gancho
 * no hacen nada y la vista es la que se le pase. Lo que sale del juego —las
 * opciones— sale del reductor de verdad, más abajo.
 */
function unaMesa(fase: LaMesa['fase'], vista: MesaVista | null): LaMesa {
  const nada = (): void => undefined;
  return {
    fase,
    mesa: vista,
    aviso: '',
    cronica: [],
    quieto: false,
    abrir: nada,
    entrar: nada,
    /* `mover` devuelve cómo acabó desde la mesa de madera; una mesa de mentira siempre acierta. */
    mover: () => Promise.resolve<ResultadoDelMovimiento>('hecho'),
    vestir: nada,
    salir: nada,
    tirar: nada,
  };
}

function elMuelle(): void {
  paso('Si la partida ha empezado se sabe sin abrir la vista del juego');

  /*
   * ═══ LAS DOS FUENTES, Y EL ORDEN ENTRE ELLAS ═══
   *
   * `empezada` lo estrenó el servidor para el Muelle; un servidor anterior manda
   * la vista sin él y entonces se infiere de `opciones`. Las opciones de aquí son
   * las del juego DE VERDAD: las de la mesa recién abierta —que ofrece empezar— y
   * las de después del reparto, sacadas del mismo reductor que usa la sección 2.
   * Una lista inventada aquí probaría la inferencia contra lo que este fichero se
   * imagina que ofrece Riberas.
   */
  const sentados = [
    { asiento: 's1', nombre: 'Ana' },
    { asiento: 's2', nombre: 'Bruno' },
  ];
  const reunida = proyectar(RIBERAS, undefined, 's1', sentados);
  const opcionesDeReunion = opcionesDeArcade(RIBERAS, reunida, 's1');
  const { opciones: opcionesJugando } = laProyeccionDeVerdad();

  comprobar(
    'con el campo puesto, manda el campo: «empezada: true» aunque las opciones aún ofrezcan empezar',
    haEmpezado({ empezada: true, opciones: opcionesDeReunion }) &&
      !haEmpezado({ empezada: false, opciones: opcionesJugando }),
  );
  comprobar(
    'sin el campo, una mesa cuyo juego ofrece empezar no ha empezado',
    opcionesDeReunion.length > 0 && !haEmpezado({ opciones: opcionesDeReunion }),
    opcionesDeReunion.map((o) => o.id),
  );
  comprobar(
    'y sin el campo y sin esa opción —o sin lista siquiera— se contesta que sí, que es caer al tablero de siempre',
    haEmpezado({ opciones: opcionesJugando }) && haEmpezado({}) && !haEmpezado(null),
    opcionesJugando.map((o) => o.id),
  );

  paso('El muelle se pinta sólo a quien lo tiene, y sólo hasta zarpar');

  const orilla = { vioLaReunion: false, zarpado: false };
  const trasLaReunion = { vioLaReunion: true, zarpado: false };
  const zarpado = { vioLaReunion: true, zarpado: true };
  comprobar(
    'un arcade sin muelle no lo pinta nunca, en ninguna fase: los demás no cambian ni un píxel',
    (['fuera', 'yendo', 'dentro'] as const).every(
      (f) =>
        !tocaElMuelle(false, f, false, orilla) &&
        !tocaElMuelle(false, f, true, trasLaReunion) &&
        !tocaElMuelle(false, f, false, trasLaReunion),
    ),
  );
  comprobar(
    'con muelle: en la orilla y mientras la mesa se reúne, se pinta',
    tocaElMuelle(true, 'fuera', false, orilla) &&
      tocaElMuelle(true, 'yendo', false, orilla) &&
      tocaElMuelle(true, 'dentro', false, orilla),
  );
  comprobar(
    'al llegar «empezada» delante de uno se sigue pintando —la coreografía— y al desembarcar ya no',
    tocaElMuelle(true, 'dentro', true, trasLaReunion) && !tocaElMuelle(true, 'dentro', true, zarpado),
  );
  comprobar(
    'y quien vuelve a una mesa que ya jugaba va directo al tablero, sin coreografía',
    !tocaElMuelle(true, 'dentro', true, orilla),
  );
  comprobar(
    'Riberas tiene muelle y el resto de los instalados no',
    tieneMuelle('riberas') && arcadesInstalados().filter((m) => tieneMuelle(m.id)).length === 1,
    arcadesInstalados().filter((m) => tieneMuelle(m.id)).map((m) => m.id),
  );

  paso('El raíl del muelle existe entero sin el mundo, y en Node no se monta el Canvas');

  /*
   * ═══ POR QUÉ SE RENDERIZA EN NODE UN COMPONENTE CON UN `Canvas` DENTRO ═══
   *
   * Porque es la regla del §5 del diseño —«el HUD nunca depende del Canvas»—
   * hecha comprobación: si el mundo no arranca, se abre, se entra y se reparte
   * igual. Aquí no hay `window`, así que el `Canvas` no puede montarse (lo
   * protege un `typeof window` en `muelle.tsx`); lo que se cuenta es que el raíl
   * tiene todo lo demás. Y de paso, que ningún cambio futuro cuele el `Canvas`
   * fuera de esa guarda: el día que pase, esto revienta en Node antes que en un
   * navegador sin WebGL.
   */
  const riberas = elCatalogoQuePublicaElServidor().find((m) => m.id === 'riberas');
  const tema = temaDelMuelle('riberas');
  comprobar('Riberas está instalado y tiene tema de muelle', riberas !== undefined && tema !== undefined);
  if (riberas === undefined || tema === undefined) return;

  const enLaOrilla = renderToStaticMarkup(
    <Muelle
      manifiesto={riberas}
      tema={tema}
      mesa={unaMesa('fuera', null)}
      silla=""
      codigoDeLaUrl="ABCDE"
      zarpando={false}
      alDesembarcar={() => undefined}
    />,
  );
  const textoDeLaOrilla = palabrasDe(enLaOrilla);
  comprobar('en la orilla no hay ningún <canvas>', !enLaOrilla.includes('<canvas'), enLaOrilla.slice(0, 300));
  comprobar('pero sí el telón con el nombre del lugar', textoDeLaOrilla.includes(tema.lugar));
  comprobar(
    'y los campos del vestíbulo de siempre: abrir, sentarse y el código de la dirección puesto',
    textoDeLaOrilla.includes('Abrir mesa') &&
      textoDeLaOrilla.includes('Sentarse') &&
      enLaOrilla.includes('value="ABCDE"'),
  );
  comprobar(
    'y una figura elegida, que es una de las seis y se puede cambiar',
    FIGURAS.some((f) => textoDeLaOrilla.includes(f.nombre)) && textoDeLaOrilla.includes('Cambiar'),
  );
  comprobar(
    'los plazos que se ofrecen son los mismos que en la mesa de siempre',
    PLAZOS.every((p) => textoDeLaOrilla.includes(p.rotulo)),
  );

  const vista: MesaVista = {
    codigo: 'QWXYZ',
    arcade: 'riberas',
    rev: 3,
    tic: 0,
    terminada: false,
    venceEn: null,
    turnoDesde: 0,
    asientos: [
      { id: 's1', nombre: 'Ana', presente: true, figura: 'maga' },
      { id: 's2', nombre: 'Bruno', presente: false },
    ],
    yo: 's1',
    vista: reunida,
    opciones: opcionesDeReunion,
  };
  const enElMuelle = renderToStaticMarkup(
    <Muelle
      manifiesto={riberas}
      tema={tema}
      mesa={unaMesa('dentro', vista)}
      silla=""
      codigoDeLaUrl=""
      zarpando={false}
      alDesembarcar={() => undefined}
    />,
  );
  const textoDelMuelle = palabrasDe(enElMuelle);
  comprobar('en el muelle tampoco hay <canvas>', !enElMuelle.includes('<canvas'));
  comprobar(
    'se ve el código y se puede copiar, y el enlace también',
    textoDelMuelle.includes('QWXYZ') &&
      textoDelMuelle.includes('Copiar código') &&
      textoDelMuelle.includes('Copiar enlace'),
  );
  comprobar(
    'los sentados salen con su nombre, quién soy yo, y un piloto por cabeza con el que falta apagado',
    textoDelMuelle.includes('Ana (tú)') &&
      textoDelMuelle.includes('Bruno') &&
      enElMuelle.split('class="piloto').length - 1 === 2 &&
      enElMuelle.split('piloto-vivo').length - 1 === 1,
  );
  comprobar(
    'la opción de empezar sale con el rótulo y la ayuda que escribió el juego, y ninguna otra palabra de cosecha propia como movimiento',
    opcionesDeReunion.every((o) => textoDelMuelle.includes(o.rotulo) && textoDelMuelle.includes(o.ayuda)) &&
      enElMuelle.split('class="opcion opcion-zarpar"').length - 1 === 1,
  );
  comprobar(
    'y se puede levantar uno, tirar la mesa y cambiar de aventurero',
    textoDelMuelle.includes('Levantarse') &&
      textoDelMuelle.includes('Tirar la mesa') &&
      textoDelMuelle.includes('Cambiar de aventurero'),
  );
  comprobar(
    'la figura de un asiento se pinta por su nombre, y la del que no eligió es la de serie',
    textoDelMuelle.includes('La Maga') && FIGURAS.filter((f) => textoDelMuelle.includes(f.nombre)).length >= 1,
  );
}

// ---------------------------------------------------------------------------
// 6 · Riberas en tres dimensiones: sin Canvas en Node, y cada movimiento una vez
// ---------------------------------------------------------------------------

/**
 * EL PINTOR PROPIO DE RIBERAS, renderizado en Node como el muelle y por lo mismo.
 *
 * Aquí no hay `window`, así que el `Canvas` no puede montarse (lo protege un
 * `typeof window` en `riberas-en-tres.tsx`) y lo que se cuenta es lo que queda
 * alrededor: el telón con el nombre y el formulario de lo que el tablero no enseña.
 *
 * Y la comprobación que importa de verdad es la misma que la del retablo —cada
 * movimiento exactamente una vez— con la escena en medio: lo que sale como botón
 * tiene que ser lo que NO ofrece ni la barra ni la mano, y entre las tres cosas
 * tienen que estar TODAS las opciones del juego. Esconder una sería peor que
 * repetirla. Se comprueba con la traducción de `shared/` y la proyección de verdad,
 * porque un botón de más o de menos aquí no da error en ninguna consola.
 *
 * Y se abre TAMBIÉN una mesa de cinco, que es la que el lienzo no sabe pintar: ahí
 * tiene que salir el retablo de siempre y decir por qué. Dos asientos recién
 * empezados no habrían cogido nunca el pintor confundiendo «no cabe» con «no hay islas».
 */
function riberasEnTres(): void {
  paso('Riberas en tres dimensiones: sin ventana no hay Canvas, y sí lo demás');

  const riberas = elCatalogoQuePublicaElServidor().find((m) => m.id === 'riberas');
  comprobar('Riberas está instalado', riberas !== undefined);
  if (riberas === undefined) return;

  const { vista, opciones } = laProyeccionDeVerdad();
  const tablero = tableroDeLaVista(vista);
  comprobar('y su proyección trae tablero declarado y delta con islas', tablero !== null && tableroEnTres(vista) !== null);
  if (tablero === null) return;

  const puesta: MesaVista = {
    codigo: 'QWXYZ',
    arcade: 'riberas',
    rev: 7,
    tic: 0,
    terminada: false,
    venceEn: null,
    turnoDesde: 0,
    asientos: [
      { id: 's1', nombre: 'Ana', presente: true },
      { id: 's2', nombre: 'Bruno', presente: true },
    ],
    yo: 's1',
    vista,
    opciones,
  };
  const html = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', puesta)}
      puesta={puesta}
      tablero={tablero}
      opciones={opciones}
    />,
  );
  const texto = palabrasDe(html);
  comprobar('no hay ningún <canvas>', !html.includes('<canvas'), html.slice(0, 300));
  comprobar('pero sí el telón con el nombre del juego', texto.includes(riberas.nombre));
  comprobar('y no se cae al retablo SVG sin que haya fallado nada', cuantos(html, 'svg') === 0);
  comprobar(
    'el aviso del tablero, que es del juego, sigue en pantalla',
    tablero.aviso.length === 0 || texto.includes(tablero.aviso),
    tablero.aviso,
  );

  /*
   * CADA MOVIMIENTO UNA VEZ. Lo que sale como botón es exactamente lo que queda fuera
   * del tablero; y lo que queda dentro tiene que poder salir por la barra o por la mano.
   */
  const fuera = opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones));
  const botones = html.split('class="opcion-rotulo"').length - 1;
  comprobar(
    'salen como botón exactamente las opciones que el tablero no enseña',
    botones === fuera.length,
    { botones, fuera: fuera.map((o) => o.id) },
  );
  for (const o of fuera) {
    comprobar(`el rótulo «${o.rotulo}» sale tal cual`, texto.includes(o.rotulo));
  }
  const dentro = opciones.filter((o) => !fuera.includes(o));
  for (const o of dentro) {
    comprobar(`«${o.rotulo}» no se pinta como botón: lo enseña la escena`, !texto.includes(o.rotulo), o.id);
  }

  const porLaBarra = new Set<string>();
  for (const { id } of PIEZAS_DE_LA_BARRA) {
    const colocando = colocandoEnTres(vista, 's1', id);
    if (colocando === null) continue;
    for (const m of colocando.movimientos.values()) porLaBarra.add(canonico(m));
  }
  const porLaMano = new Set<string>();
  for (const carta of manoEnTres(vista)) {
    const doy = carta.bien;
    for (const quiero of bienesQueSeCambianPor(vista, opciones, doy)) {
      for (const t of truequesPosibles(vista, opciones, doy, quiero)) {
        porLaMano.add(canonico({ tipo: t.opcion.tipo, carga: t.opcion.carga }));
      }
    }
  }
  const alcanzables = new Set([
    ...porLaBarra,
    ...porLaMano,
    ...fuera.map((o) => canonico({ tipo: o.tipo, carga: o.carga })),
  ]);
  comprobar(
    'y no se pierde ni una: todo lo que ofreció el juego sale por la barra, por la mano o por un botón',
    opciones.every((o) => alcanzables.has(canonico({ tipo: o.tipo, carga: o.carga }))),
    opciones
      .filter((o) => !alcanzables.has(canonico({ tipo: o.tipo, carga: o.carga })))
      .map((o) => o.id),
  );
  comprobar(
    'la barra ofrece algo, o esto no habría comprobado el camino de la escena',
    porLaBarra.size > 0,
    porLaBarra.size,
  );

  /*
   * ═══ CINCO COLONOS: HAY DELTA, PERO NO CABE EN EL LIENZO ═══
   *
   * `tableroEnTres` devuelve `null` con cinco o seis colonos aunque haya islas,
   * porque el atlas sólo trae cuatro colores de jugador. La primera versión del
   * pintor leía ese `null` como «delta sin repartir» y pintaba un formulario con
   * los cincuenta y cuatro «Fundar aquí» sueltos: sin tablero, sin telón y sin el
   * aviso del turno. Los dos asientos de arriba no lo habrían cogido nunca. Aquí se
   * abre la mesa con cinco, se EMPIEZA de verdad, y se exige el retablo de siempre.
   */
  paso('Con cinco colonos hay delta pero no colores: se cae al retablo, y se dice por qué');

  const cinco = laProyeccionDeVerdad(5);
  const tableroDeCinco = tableroDeLaVista(cinco.vista);
  comprobar(
    'la mesa de cinco trae tablero declarado con caras, y la traducción dice que no cabe en tres',
    tableroDeCinco !== null &&
      tableroDeCinco.caras.length > 0 &&
      !seVeEnTres(cinco.vista) &&
      tableroEnTres(cinco.vista) === null,
    { caras: tableroDeCinco?.caras.length, seVe: seVeEnTres(cinco.vista) },
  );
  if (tableroDeCinco === null) return;

  const puestaDeCinco: MesaVista = {
    ...puesta,
    asientos: sentadosDePrueba(5).map((s) => ({ id: s.asiento, nombre: s.nombre, presente: true })),
    vista: cinco.vista,
    opciones: cinco.opciones,
  };
  const htmlDeCinco = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', puestaDeCinco)}
      puesta={puestaDeCinco}
      tablero={tableroDeCinco}
      opciones={cinco.opciones}
    />,
  );
  const textoDeCinco = palabrasDe(htmlDeCinco);
  comprobar('con cinco sale el retablo SVG', htmlDeCinco.includes('<svg'), htmlDeCinco.slice(0, 300));
  comprobar('y ningún <canvas>', !htmlDeCinco.includes('<canvas'));
  comprobar('ni el telón: no se está esperando a ningún modelo', !htmlDeCinco.includes('riberas-telon'));
  comprobar(
    'el aviso del tablero, que es del juego, sigue en pantalla',
    tableroDeCinco.aviso.length > 0 && htmlDeCinco.includes('aviso-del-tablero') && textoDeCinco.includes(tableroDeCinco.aviso),
    tableroDeCinco.aviso,
  );
  comprobar(
    'y la letra chica dice que es por los colores, no por un fallo',
    htmlDeCinco.includes('riberas-sin-mundo') &&
      textoDeCinco.includes('sólo sabe pintar cuatro colores') &&
      !textoDeCinco.includes('no ha arrancado'),
  );
  /*
   * Y los botones son EXACTAMENTE los de «y además puedes»: lo que el retablo no
   * enseña. Con la primera versión salían tantos como opciones —los cincuenta y
   * cuatro sitios de fundar incluidos—; el retablo los pinta como nudos, no como botones.
   */
  const sueltasDeCinco = opcionesSueltas(tableroDeCinco, cinco.opciones);
  const botonesDeCinco = htmlDeCinco.split('class="opcion-rotulo"').length - 1;
  comprobar(
    'los sitios de fundar los enseña el retablo, no un formulario de botones sueltos',
    sueltasDeCinco.length < cinco.opciones.length && botonesDeCinco === sueltasDeCinco.length,
    { botones: botonesDeCinco, sueltas: sueltasDeCinco.length, opciones: cinco.opciones.length },
  );
  comprobar(
    'y con dos colonos —el caso de arriba— sigue saliendo el telón y ningún <svg>',
    html.includes('riberas-telon') && !html.includes('<svg'),
  );

  /*
   * Y la misma mesa de cinco ANTES de empezar: sin caras no hay nada que pintar,
   * ni en tres ni en dos, y lo único que se ofrece es el formulario con «Empezar».
   */
  const reunidaDeCinco = proyectar(RIBERAS, undefined, 's1', sentadosDePrueba(5));
  const opcionesReunida = opcionesDeArcade(RIBERAS, reunidaDeCinco, 's1');
  const tableroReunido = tableroDeLaVista(reunidaDeCinco);
  comprobar('la mesa de cinco reunida trae tablero declarado sin caras', tableroReunido !== null && tableroReunido.caras.length === 0);
  if (tableroReunido !== null) {
    const puestaReunida: MesaVista = { ...puestaDeCinco, vista: reunidaDeCinco, opciones: opcionesReunida };
    const htmlReunida = renderToStaticMarkup(
      <RiberasEnTres
        manifiesto={riberas}
        mesa={unaMesa('dentro', puestaReunida)}
        puesta={puestaReunida}
        tablero={tableroReunido}
        opciones={opcionesReunida}
      />,
    );
    comprobar(
      'y sin repartir no hay retablo ni telón: sólo el formulario, con todas las opciones que ofrece el juego',
      !htmlReunida.includes('<svg') &&
        !htmlReunida.includes('riberas-telon') &&
        htmlReunida.split('class="opcion-rotulo"').length - 1 === opcionesReunida.length &&
        opcionesReunida.length > 0,
      opcionesReunida.map((o) => o.id),
    );
  }

  paso('Y la semilla del delta sale del código de la mesa, igual para todos');

  comprobar(
    'el mismo código da la misma semilla, y otro código da otra',
    semillaDelCodigo('QWXYZ') === semillaDelCodigo('QWXYZ') && semillaDelCodigo('QWXYZ') !== semillaDelCodigo('QWXYA'),
  );
  comprobar(
    'y es un entero no negativo, que es lo que la escena espera',
    Number.isInteger(semillaDelCodigo('ABCDE')) && semillaDelCodigo('ABCDE') >= 0,
    semillaDelCodigo('ABCDE'),
  );
  /*
   * LA SEMILLA ES UNA. Hubo una copia en `riberas-en-tres.tsx` que no pasaba a
   * mayúsculas: la misma mesa daba un delta en el PC y otro en la app según cómo
   * se hubiera tecleado el código. La cala del muelle y el delta tienen que salir
   * del mismo entero para el mismo código, en cualquier caja.
   */
  comprobar(
    'la cala del muelle y el delta salen de la misma semilla para el mismo código',
    semillaDeCodigo('QWXYZ') === semillaDelCodigo('QWXYZ') && semillaDeCodigo('abcde') === semillaDelCodigo('abcde'),
    { cala: semillaDeCodigo('QWXYZ'), delta: semillaDelCodigo('QWXYZ') },
  );
  comprobar(
    'y las mayúsculas no cambian el mundo: «qwxyz» y «QWXYZ» son la misma mesa',
    semillaDelCodigo('qwxyz') === semillaDelCodigo('QWXYZ') && semillaDeCodigo('abcde') === semillaDeCodigo('ABCDE'),
  );
}

// ---------------------------------------------------------------------------
// 7 · El acercamiento del delta: lo único de este cliente que no se puede renderizar
// ---------------------------------------------------------------------------

/**
 * QUE EL ZOOM DEL TABLERO SIGA SIENDO EL DE `escenas/acercar.ts`.
 *
 * ═══ POR QUÉ ESTO SE MIRA EN EL TEXTO Y NO RENDERIZANDO ═══
 *
 * Todo lo demás de este comprobador renderiza componentes de verdad, que es lo único
 * que compra algo. La cámara no se puede: vive dentro de un `useFrame`, o sea dentro
 * de un `Canvas`, o sea dentro de un WebGL que en Node no existe. Renderizar
 * `RiberasEnTres` aquí devuelve el telón y ni una línea de cámara.
 *
 * Así que lo que se compra es lo otro, y es lo que de verdad se rompe: que la cuenta
 * siga estando DONDE SE PUEDE MEDIR. `escenas/acercar.ts` tiene sus veinticuatro
 * comprobaciones en `verify:escena` —los topes de cerca y de lejos, el tope de lo que
 * se puede apartar la mirada, la altura mínima del ojo— y todas valen cero el día que
 * alguien resuelva un ajuste escribiendo un seno aquí. Eso no da error, se ve bien en
 * la captura del día, y deja el cliente con una cámara propia que nadie mide.
 *
 * Y de paso se atan las tres cosas que en pantalla se rompen en silencio:
 *
 *   1. QUE SE ENTRE VIENDO EL TABLERO ENTERO. Arrancar en otro acercamiento se ve
 *      como «el tablero sale mal encuadrado», no como un valor inicial cambiado.
 *   2. QUE LA RUEDA NO SE LA LLEVE LA PÁGINA. Sin `preventDefault` sobre un oyente
 *      NO pasivo, el navegador desplaza la Sala mientras uno cree estar acercándose.
 *      Es el fallo clásico de todo zoom en un lienzo, y el síntoma —una página que se
 *      mueve sola— no señala nunca al zoom.
 *   3. QUE UNA JUGADA AJENA NO RECOLOQUE LA CÁMARA. El sondeo trae una revisión nueva
 *      cada pocos segundos; si el efecto de la revisión tocara el acercamiento, quien
 *      está mirando una esquina de cerca saltaría al aire cada vez que otro construye.
 *      Aquí se lee ese efecto y se exige que la cámara no aparezca dentro.
 *   4. QUE CON EL DEDO TAMBIÉN SE JUEGUE. Ningún juego de esta casa es sólo para PC, y
 *      con pantalla táctil no hay rueda, ni botón derecho, ni Mayúsculas: el delta se
 *      giraba y no había manera de acercarlo. Ese fallo no da error tampoco: en un
 *      monitor está todo bien.
 *   5. QUE UN GESTO NO SE CONVIERTA EN OTRO A MEDIA CARRERA. Un segundo botón apretado
 *      encima de un desplazamiento se lee como que el tablero pega un bandazo solo.
 *
 * Y que haya SALIDA, que es lo que separa un zoom bueno de uno que atrapa: un botón
 * de la Sala, con rótulo, que sólo se enseña cuando no se está como al principio — y
 * vestido y medido como los demás botones de la Sala, que de eso se miran los VALORES
 * y no sólo que la regla exista.
 */
function elAcercamientoDelDelta(): void {
  paso('El acercamiento del delta: la rueda, la mirada, y una salida siempre visible');

  const fuente = readFileSync(new URL('../src/riberas-en-tres.tsx', import.meta.url), 'utf8');
  const hoja = readFileSync(new URL('../src/estilo.css', import.meta.url), 'utf8');

  comprobar(
    'el ojo y el punto de mira salen de `ojoYMira`, y la cámara mira ADONDE dice, no al centro del mundo',
    fuente.includes('ojoYMira(') &&
      /camera\.lookAt\(\s*\.\.\.mira\s*\)/.test(fuente) &&
      !/camera\.lookAt\(\s*0\s*,/.test(fuente),
  );
  comprobar(
    'y la dirección la sigue poniendo `ojoDelMirador`, que es lo que ata el giro al acercamiento',
    /ojoYMira\([\s\S]{0,300}?ojoDelMirador\(/.test(fuente),
  );
  comprobar(
    'se entra viendo el tablero entero: el acercamiento arranca en CERCANIA_DE_SALIDA',
    /useRef<Cercania>\(CERCANIA_DE_SALIDA\)/.test(fuente),
  );
  comprobar(
    'la rueda acerca con `acercando` y le quita el gesto a la página: `preventDefault` sobre un oyente no pasivo',
    /const rueda = \(e: WheelEvent\)[\s\S]{0,300}?preventDefault\(\)[\s\S]{0,300}?acercando\(/.test(fuente) &&
      /addEventListener\('wheel',[^;]*\{\s*passive:\s*false\s*\}\)/.test(fuente),
  );
  /*
   * ═══ Y ESE OYENTE VA EN EL RECUADRO, NO EN EL `<canvas>` ═══
   *
   * El botón de volver es HERMANO del lienzo dentro de `.riberas-lienzo`, no hijo suyo.
   * Con el oyente colgado del lienzo, la rueda encima del botón no pasaba por ningún
   * `preventDefault` y la Sala entera se desplazaba — justo en el sitio al que va el
   * ratón para salir del acercamiento, y con el mismo síntoma que no señala nunca al
   * zoom. En la ventana tampoco puede ir: girar la rueda leyendo el formulario de abajo
   * acercaría el delta.
   */
  comprobar(
    'y ese oyente va sobre el RECUADRO —lienzo y botón dentro— y no en el `<canvas>` ni en la ventana',
    /recuadro\.addEventListener\('wheel'/.test(fuente) &&
      !/lienzo\.addEventListener\('wheel'/.test(fuente) &&
      !/window\.addEventListener\('wheel'/.test(fuente),
  );
  comprobar(
    'y el recuadro se busca por la MISMA clase que pinta el JSX, no por una copia suelta',
    (fuente.match(/RECUADRO_DEL_LIENZO/g) ?? []).length >= 3 && /\.closest<HTMLElement>\(/.test(fuente),
    (fuente.match(/RECUADRO_DEL_LIENZO/g) ?? []).length,
  );
  /*
   * ═══ LOS TRES MODOS DE LA RUEDA VALEN LO MISMO ═══
   *
   * Esto convertía el modo línea a píxeles a dieciséis por línea, y Firefox manda TRES
   * líneas por muesca: cuarenta y ocho píxeles, o sea media muesca. El zoom iba a la
   * mitad de velocidad en Firefox y a velocidad entera en todo lo demás, que es de esas
   * diferencias que se achacan al ordenador y no se miden nunca.
   */
  comprobar(
    'la rueda en modo línea cuenta las líneas de Firefox: tres son una muesca, no media',
    /LINEAS_POR_MUESCA = 3/.test(fuente) &&
      /deltaMode === 1[\s\S]{0,120}?deltaY \/ LINEAS_POR_MUESCA/.test(fuente) &&
      !fuente.includes('PIXELES_POR_LINEA'),
  );
  comprobar(
    'el arrastre secundario mueve la mirada con `arrastrandoLaMirada`, y el primario sigue girando con `tirandoDelMirador`',
    fuente.includes('arrastrandoLaMirada(') && fuente.includes('tirandoDelMirador('),
  );

  /*
   * ═══ Y CON EL DEDO, QUE EN ESTA CASA NINGÚN JUEGO ES SÓLO PARA PC ═══
   *
   * Con pantalla táctil o lápiz no hay `wheel`, no hay botón derecho y no hay
   * Mayúsculas: el delta se giraba y nada más, no había forma de acercarlo ni de
   * recorrerlo, y el botón de volver no aparecía NUNCA porque nada llamaba a
   * `alAcercarse`. Y el navegador tampoco lo suplía: `touch-action: none` le había
   * quitado ya su propio pellizco, que es lo que hace que las dos cosas vayan juntas.
   *
   * Un gesto no se puede renderizar en Node, así que lo que se compra es lo mismo que
   * de la rueda: que los dos dedos entren por las funciones de `escenas/acercar.ts`
   * —medidas en `verify:escena`— y no por una cuenta escrita en el cliente.
   */
  /* `[^}]*` y no `[\s\S]*?`: con lo segundo el bloque empezaba en el primer `import {` del fichero. */
  const importaDeAcercar = /import \{([^}]*)\} from '\.\.\/\.\.\/escenas\/acercar';/.exec(fuente)?.[1] ?? '';
  comprobar(
    'con dos dedos se acerca, y la escala del pellizco la convierte `pellizcando`',
    importaDeAcercar.includes('pellizcando') && /pellizcando\(/.test(fuente),
    importaDeAcercar,
  );
  comprobar(
    'se lleva la cuenta de los punteros apoyados, que es lo que distingue dos dedos de dos botones del ratón',
    /new Map<number, \{ x: number; y: number \}>\(\)/.test(fuente) &&
      /apoyados\.set\(e\.pointerId/.test(fuente) &&
      /apoyados\.delete\(e\.pointerId\)/.test(fuente),
  );
  comprobar(
    'y el paseo del punto medio de los dos dedos sale del mismo `arrastrandoLaMirada` que el botón derecho',
    /pellizco !== null[\s\S]{0,800}?arrastrandoLaMirada\(/.test(fuente),
  );
  comprobar(
    'el pellizco guarda el acercamiento y la separación DE PARTIDA: separar y volver a juntar deja el tablero donde estaba',
    /alEmpezar: cercania\.current\.factor/.test(fuente) &&
      /pellizcando\(paseada, pellizco\.alEmpezar, dos\.separacion \/ pellizco\.separacion\)/.test(fuente),
  );

  /*
   * ═══ UN GESTO CADA VEZ ═══
   *
   * `baja` no miraba si ya había un arrastre en marcha, así que apretar el izquierdo en
   * mitad de un desplazamiento con el derecho cambiaba el gesto a girar a media carrera;
   * y `suelta` limpiaba con el otro botón todavía apretado. Ninguna de las dos da error:
   * las dos se ven como que el tablero pega un bandazo solo.
   */
  const bajaEntera = /const baja = \(e: PointerEvent\)[\s\S]*?\n {4}\};/.exec(fuente)?.[0] ?? '';
  comprobar(
    'quien empezó un arrastre se lo queda: un segundo botón no le cambia el gesto a media carrera',
    /if \(desde !== null\) return;/.test(bajaEntera),
    bajaEntera.slice(0, 200),
  );
  const sueltaEntera = /const suelta = \(e: PointerEvent\)[\s\S]*?\n {4}\};/.exec(fuente)?.[0] ?? '';
  comprobar(
    'y no se termina mientras quede un botón apretado',
    /e\.buttons !== 0/.test(sueltaEntera),
    sueltaEntera.slice(0, 300),
  );
  comprobar(
    'y ese arrastre no abre el menú del navegador encima del delta',
    /addEventListener\('contextmenu'/.test(fuente),
  );
  comprobar(
    'coger de la barra y coger una carta siguen siendo suyos: se pregunta a `esDeLaInterfaz` antes de quedarse el gesto',
    /esDeLaInterfaz\(e\)/.test(fuente),
  );
  comprobar(
    'hay salida, y es un botón de la Sala con su rótulo, que devuelve `comoAlPrincipio()`',
    fuente.includes("'Ver el tablero entero'") &&
      fuente.includes('comoAlPrincipio()') &&
      fuente.includes('className="riberas-volver"'),
  );
  comprobar(
    'y sólo se enseña cuando hace falta: lo decide `estaComoAlPrincipio`',
    fuente.includes('estaComoAlPrincipio(') && /alPrincipio \? null :/.test(fuente),
  );
  comprobar(
    'el botón y la cámara comparten UN acercamiento, o el botón apagaría un zoom que no es el que se ve',
    /<CamaraAerea[^/]*cercania=\{cercania\}/.test(fuente),
  );
  /*
   * ═══ Y VESTIDO COMO LOS DEMÁS, MIRANDO LOS VALORES Y NO SÓLO QUE LA REGLA EXISTA ═══
   *
   * Que hubiera una regla `.riberas-volver` no compraba nada: la había, y reposaba en
   * `--filo-vivo` cuando todo botón de la Sala reposa en `--filo` y sólo enciende el
   * filo bajo el ratón, y le faltaba el alto mínimo pulsable —salía en unos 36 px contra
   * los 44 de la casa—. Las dos cosas se ven perfectas en una captura y las dos se
   * pagan con el dedo, que es con lo que ahora se pellizca el delta.
   *
   * El alto no se escribe aquí: se saca de `.opcion`, que es el botón de referencia. Así
   * el día que la casa cambie de medida no queda un botón con la vieja.
   */
  const reglaDelVolver = /\.riberas-volver\s*\{([^}]*)\}/.exec(hoja)?.[1] ?? '';
  const reglaDeOpcion = /\.opcion\s*\{([^}]*)\}/.exec(hoja)?.[1] ?? '';
  const altoDeLaCasa = /min-height:\s*([\d.]+rem)/.exec(reglaDeOpcion)?.[1];
  comprobar(
    'los botones de la Sala declaran un alto mínimo pulsable, que es de donde sale el de éste',
    altoDeLaCasa !== undefined,
    reglaDeOpcion,
  );
  comprobar(
    'el botón de volver existe, se enciende bajo el ratón y hereda el foco visible',
    reglaDelVolver.length > 0 &&
      /\.riberas-volver:hover\s*\{[^}]*border-color:\s*var\(--acento\)/.test(hoja) &&
      /:focus-visible\s*\{/.test(hoja),
  );
  comprobar(
    'y reposa en el filo de siempre, no en el de las cosas encendidas',
    /border:\s*1px solid var\(--filo\)\s*;/.test(reglaDelVolver) && !reglaDelVolver.includes('--filo-vivo'),
    reglaDelVolver,
  );
  comprobar(
    'y mide lo que mide cualquier botón de la casa: la salida del acercamiento no puede fallarse con el dedo',
    altoDeLaCasa !== undefined &&
      new RegExp(`min-height:\\s*${altoDeLaCasa.replace(/\./g, '\\.')}\\s*;`).test(reglaDelVolver),
    { volver: reglaDelVolver, casa: altoDeLaCasa },
  );
  comprobar(
    'y el recuadro le sigue quitando al navegador su propio pellizco, que es lo que obliga a poner el nuestro',
    /\.riberas-lienzo\s*\{[^}]*touch-action:\s*none/.test(hoja),
  );

  /*
   * LA JUGADA AJENA NO MUEVE LA CÁMARA. Se recorta el efecto que corre al cambiar la
   * revisión —el que suelta lo que se tiene en la mano— y se exige que ahí dentro no
   * se nombre ni el acercamiento ni el mirador.
   */
  const marcaDeLaRevision = '}, [puesta.rev]);';
  comprobar('hay un efecto que corre al cambiar la revisión de la mesa', fuente.includes(marcaDeLaRevision));
  const hastaLaRevision = fuente.slice(0, fuente.indexOf(marcaDeLaRevision));
  const alCambiarLaRevision = hastaLaRevision.slice(hastaLaRevision.lastIndexOf('useEffect('));
  comprobar(
    'y suelta la mano SIN recolocar la cámara: quien mira una esquina de cerca se queda donde estaba',
    fuente.includes(marcaDeLaRevision) && !/[Cc]ercania|mirador|camara|Camara/.test(alCambiarLaRevision),
    alCambiarLaRevision.slice(0, 300),
  );

  /*
   * Y NINGUNA CUENTA DE CÁMARA ESCRITA A MANO. La trigonometría y las potencias del
   * acercamiento viven en `escenas/`, que es donde `verify:escena` las mide. Lo único
   * que aquí se calcula son píxeles de pantalla —la zona muerta del arrastre— y la
   * traducción de las unidades de la rueda a pasos, que no es una cuenta de cámara
   * sino de un suceso del navegador.
   */
  const trigonometria = /Math\.(sin|cos|tan|atan2?|pow)\s*\(/.exec(fuente);
  comprobar(
    'ninguna cuenta de cámara escrita a mano: ni un seno, ni un coseno, ni una potencia en el cliente',
    trigonometria === null,
    trigonometria?.[0],
  );
  const distanciaAMano = /Math\.hypot\([^()]*,[^(),]*,[^()]*\)/.exec(fuente);
  comprobar(
    'ni la distancia del ojo medida a mano: la niebla se mide entre el ojo y el punto de mira, con `three`',
    distanciaAMano === null && fuente.includes('camera.position.distanceTo('),
    distanciaAMano?.[0],
  );
}

// ---------------------------------------------------------------------------
// 8 · El mazo en la pantalla del escritorio
// ---------------------------------------------------------------------------

/**
 * MI MANO DEL MAZO PARA LAS PRUEBAS: una de cada familia, un título, y una comprada HOY.
 *
 * La sexta es la que compra la mitad del bloque: `comprada: 1` con `turnosAbiertos: 1` es
 * una carta de este mismo turno, que las reglas no dejan jugar (§1.4 del diseño). Tiene
 * que salir en la mano y salir APAGADA — que se vea y no se pueda jugar—, y una mano de
 * prueba sin ninguna así dejaría ese camino sin recorrer.
 */
const MI_MANO_DE_PRUEBA: readonly CartaEnMano[] = [
  { carta: 'c1:guardia', comprada: 0 },
  { carta: 'c2:faro', comprada: 0 },
  { carta: 'c3:ano-bueno', comprada: 0 },
  { carta: 'c4:acaparamiento', comprada: 0 },
  { carta: 'c5:dos-veredas', comprada: 0 },
  { carta: 'c6:guardia', comprada: 1 },
];

/**
 * UNA PARTIDA DE RIBERAS CON MAZO Y MANOS PUESTAS, hermana de `laProyeccionDeVerdad`.
 *
 * ═══ POR QUÉ SE MONTA EL ESTADO Y NO SE JUEGA HASTA AQUÍ ═══
 *
 * Llegar a tener cinco cartas en la mano jugando exige comprar cinco veces, y comprar
 * exige tirar los dados y cobrar sal, piedra y grano tres veces cada uno: el azar no es
 * cosa de un comprobador, y un guion que dependiera de él fallaría un día de cada diez
 * sin que nadie hubiera tocado nada. Es la misma decisión que ya toma el escenario del
 * trueque en `verify:riberas-en-tres`, y por el mismo motivo.
 *
 * LO QUE SE PONE A MANO NO ES NINGUNA REGLA. El delta, los colores y el orden de los
 * colonos salen de un `EMPEZAR` de verdad por la puerta de siempre; lo que se escribe
 * encima son bienes, manos y guardias jugadas. Quién puede jugar qué lo sigue diciendo
 * `opcionesDeArcade`, que es lo mismo que le pregunta la mesa de producción.
 *
 * Cada colono recibe una choza y una vereda propias porque Las Dos Veredas sólo se
 * ofrecen si queda un sitio donde alzarlas: sin nada puesto, esa carta saldría apagada y
 * el camino entero pasaría de largo sin comprobar nada.
 *
 * TRES ASIENTOS y no dos: con dos, La Guardia tiene una sola víctima y se manda sin
 * preguntar, así que el menú de elegir —lo que este encargo estrena— no se abriría nunca.
 * Con tres hay dos víctimas y hay que preguntar.
 */
function laProyeccionConMazo(
  cuantosAsientos = 3,
  /*
   * `empateDelVado`: además, YO llego a las cinco DESPUÉS de que el tercero se haya
   * llevado el premio. Se monta en dos pasos porque así pasa en la mesa: el premio ya
   * tiene dueño cuando el segundo llega, y `recalcularElVado` no se lo mueve a quien
   * iguala. Es el estado en que el raíl decía «vado 5 de 5» a quien no tenía nada.
   */
  { empateDelVado = false }: { empateDelVado?: boolean } = {},
): {
  vista: unknown;
  opciones: readonly Opcion[];
  sentados: { asiento: string; nombre: string }[];
} {
  const sentados = sentadosDePrueba(cuantosAsientos);
  const asientos = sentados.map((s) => s.asiento);
  const ctx: ContextoMovimiento = { quien: 's1', azar: 987_654, tic: 0, asientos };
  const base = avanzar(RIBERAS, undefined, { tipo: EMPEZAR_RIBERAS, carga: {} }, ctx) as EstadoDeRiberas;

  let serie = 1;
  const fichasDe = (bienes: readonly Bien[]): Ficha[] => bienes.map((b) => `b${String(serie++)}:${b}` as Ficha);
  /* Sal, piedra y grano para mí: es lo que cuesta una carta, y sin ello no habría COMPRAR. */
  const MIS_BIENES: readonly Bien[] = ['sal', 'piedra', 'grano', 'junco', 'limo'];
  /* Y algo para los demás, o a quien no tiene nada no se le puede robar y no habría a quién elegir. */
  const LOS_SUYOS: readonly Bien[] = ['junco', 'limo'];

  const puesto: EstadoDeRiberas = {
    ...base,
    momento: 'jugando',
    paso: base.colonos.length * 2,
    faltaVereda: false,
    ultimaChoza: null,
    turno: 0,
    tirado: true,
    ultimaTirada: 8,
    turnosAbiertos: 1,
    cartaJugada: false,
    veredasGratis: 0,
    siguienteFicha: 500,
    colonos: base.colonos.map((c, i) => ({
      ...c,
      almacen: fichasDe(i === 0 ? MIS_BIENES : LOS_SUYOS),
      mano: i === 0 ? MI_MANO_DE_PRUEBA.map((m) => ({ ...m })) : [],
      /* Tres guardias jugadas para el segundo: es el mínimo del premio, y así hay premio que enseñar. */
      guardias: i === 1 ? 3 : 0,
      /* Y un título REVELADO, que es público y tiene que salir con su nombre en el marcador. */
      titulos: i === 1 ? ['molino'] : [],
      chozas: [verticeDeHex({ q: i * 2 - 2, r: 0 }, 0)],
      /*
       * AL TERCERO SE LE DA UNA CADENA DE CINCO, Y HACE FALTA.
       *
       * Con una vereda suelta cada uno, el Vado Largo quedaba VACANTE en todo el fichero,
       * y la comprobación que dice «los dos premios salen con su nombre» medía uno solo:
       * el otro pasaba en verde porque no había nada que enseñar. Cinco veredas seguidas
       * —los cinco lados de una isla— es el mínimo de la regla, así que aquí hay dueño.
       *
       * Se le dan al TERCERO y no al segundo a propósito: el segundo ya tiene La Mayor
       * Guardia, y con los dos premios en el mismo renglón un texto que buscara sólo uno
       * seguiría pasando. Repartidos, el raíl tiene que nombrar a los dos por separado.
       */
      veredas:
        i === 2
          ? [0, 1, 2, 3, 4].map((k) => aristaDeHex({ q: i * 2 - 2, r: 0 }, k))
          : [aristaDeHex({ q: i * 2 - 2, r: 0 }, 0)],
    })),
  };
  /* Los premios son DERIVADOS: se recalculan, no se escriben. Es la regla, y vive en `shared/`. */
  const conGuardia: EstadoDeRiberas = { ...puesto, guardia: recalcularLaGuardia(puesto) };
  const conDueno: EstadoDeRiberas = { ...conGuardia, vado: recalcularElVado(conGuardia) };
  const yoTambienLlego: EstadoDeRiberas = empateDelVado
    ? {
        ...conDueno,
        colonos: conDueno.colonos.map((c, i) =>
          i === 0 ? { ...c, veredas: [0, 1, 2, 3, 4].map((k) => aristaDeHex({ q: -2, r: 0 }, k)) } : c,
        ),
      }
    : conDueno;
  const estado: EstadoDeRiberas = empateDelVado ? { ...yoTambienLlego, vado: recalcularElVado(yoTambienLlego) } : conDueno;
  const vista = proyectar(RIBERAS, estado, 's1', sentados);
  return { vista, opciones: opcionesDeArcade(RIBERAS, vista, 's1'), sentados };
}

/** La mesa puesta que necesita el pintor, con los asientos de un escenario. */
function mesaPuestaDe(sentados: readonly { asiento: string; nombre: string }[], vista: unknown, opciones: readonly Opcion[]): MesaVista {
  return {
    codigo: 'QWXYZ',
    arcade: 'riberas',
    rev: 11,
    tic: 0,
    terminada: false,
    venceEn: null,
    turnoDesde: 0,
    asientos: sentados.map((s) => ({ id: s.asiento, nombre: s.nombre, presente: true })),
    yo: 's1',
    vista,
    opciones,
  };
}

/**
 * EL MAZO EN LA PANTALLA: que la mano lo enseñe, que no salga además como botón, y que
 * el respaldo lo siga pudiendo jugar.
 *
 * ═══ LAS TRES COSAS QUE AQUÍ SE ROMPEN EN SILENCIO ═══
 *
 *   1. QUE UNA CARTA SALGA DOS VECES. Desde que la mano del mazo se pinta, jugar una
 *      guardia sale por el naipe; si además siguiera saliendo como botón, la lista de
 *      abajo tendría una entrada por carta y por víctima —con catorce guardias en el
 *      mazo, decenas— y las dos harían lo mismo. Se ve como una pantalla desordenada, no
 *      como un filtro que falta. Se compra con `opcionesFueraDeLaMano`, compuesta.
 *   2. QUE UNA CARTA NO SALGA POR NINGÚN LADO. Es el mismo fallo por el otro extremo, y
 *      es peor: quitarlas de los botones sin pintar la mano deja las cartas sin ninguna
 *      manera de jugarse, y tampoco da error. Por eso se exige que TODA opción del juego
 *      se pueda alcanzar por la barra, por una de las dos manos o por un botón.
 *   3. QUE EL RESPALDO SE QUEDE SIN MAZO. Con más de cuatro colonos —o sin modelo— se
 *      juega sobre el retablo SVG, que no tiene mano de cartas: allí los movimientos del
 *      mazo tienen que salir como botones sueltos. Es la mesa de cinco, y es la que nadie
 *      abre para mirar.
 *
 * Y la mano en sí —qué naipe se enciende y con qué dibujo— NO se comprueba aquí: eso es
 * de la traducción y de `escenas/cartas.ts`, y lo mide `verify:riberas-en-tres` con la
 * escena de verdad. Aquí se compra lo que es de ESTE cliente: qué le llega a `<Delta>`,
 * qué sale como botón y qué pinta el raíl.
 */
/**
 * `mover` DEVUELVE CÓMO ACABÓ, y lo devuelve con lo que ya calculaba.
 *
 * Los dados de la mesa de madera (`docs/LA-MESA-DE-RIBERAS.md` §5.3) ruedan al tocarlos
 * sin saber el número, y tienen que enterarse EN EL ACTO de que la tirada no va a llegar
 * —un doble toque, una revisión rancia— en vez de rodar seis segundos. La pantalla ya sabía
 * distinguirlo para escribir el aviso (`seIgnoro`, `r.ok`, el `catch`); lo que se exige
 * aquí es que esa misma decisión SALGA de `mover` como `'hecho' | 'rechazado' | 'sin-red'`,
 * sin una segunda lectura de la respuesta, y que el `catch` sea `'sin-red'` y no un
 * rechazo: un rechazo es «la mesa dijo que no», y sin red no dijo nada.
 *
 * Se lee el fuente porque el gancho no se puede ejecutar aquí sin red ni React montado, y
 * porque lo que se afirma es de FORMA: qué se devuelve en cada rama.
 */
function elResultadoDeMover(): void {
  paso('Mover devuelve cómo acabó: hecho, rechazado o sin red, con lo que ya sabía');
  const fuente = readFileSync(new URL('../src/mesa.ts', import.meta.url), 'utf8');
  const soloCodigo = (texto: string): string => texto.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
  const codigo = soloCodigo(fuente);
  comprobar(
    'el tipo está escrito con sus tres valores y nada más',
    /export type ResultadoDelMovimiento = 'hecho' \| 'rechazado' \| 'sin-red';/.test(codigo),
  );
  comprobar(
    'y `mover` lo promete en el contrato de la mesa',
    /mover: \(movimiento: MovimientoDeclarado\) => Promise<ResultadoDelMovimiento>;/.test(codigo),
  );
  const cuerpo = /const mover = useCallback\(([\s\S]*?)\n    \[mesa\?\.rev, cabeceras\],/.exec(codigo)?.[1] ?? '';
  comprobar('se sabe leer el cuerpo de `mover`', cuerpo.length > 0 && /await fetch\(/.test(cuerpo));
  comprobar('ya no tira la promesa al suelo con `void (async`: la devuelve', !/void \(async/.test(cuerpo) && /\(async \(\): Promise<ResultadoDelMovimiento> =>/.test(cuerpo));
  comprobar('sin mesa o sin revisión no se manda nada y se contesta `rechazado`', /if \(donde === null \|\| rev === undefined\) return 'rechazado';/.test(cuerpo));
  comprobar(
    'una respuesta correcta es `hecho` salvo que la mesa volviera igual (`seIgnoro`) o el juego dijera por qué; un error del servidor es `rechazado`',
    /return !r\.ok \|\| seIgnoro \|\| loQueDijoElJuego\.length > 0 \? 'rechazado' : 'hecho';/.test(cuerpo),
  );
  const enElCatch = /catch \(error\) \{([\s\S]*?)\} finally/.exec(cuerpo)?.[1] ?? '';
  comprobar('y el `catch` —no hubo respuesta que leer— es `sin-red`, no un rechazo', /return 'sin-red';/.test(enElCatch) && !/'rechazado'/.test(enElCatch));
  comprobar('el `finally` sigue soltando `quieto` en las tres ramas', /finally \{\s*ponerQuieto\(false\);/.test(cuerpo));
}

function elMazoEnLaPantalla(): void {
  paso('El mazo: lo enseña la mano, no los botones, y el respaldo lo sigue pudiendo jugar');

  const riberas = elCatalogoQuePublicaElServidor().find((m) => m.id === 'riberas');
  comprobar('Riberas está instalado', riberas !== undefined);
  if (riberas === undefined) return;

  const { vista, opciones, sentados } = laProyeccionConMazo();
  const tablero = tableroDeLaVista(vista);
  comprobar('el escenario con mazo trae tablero declarado y delta que cabe en el lienzo', tablero !== null && tableroEnTres(vista) !== null && seVeEnTres(vista));
  if (tablero === null) return;

  /*
   * EL ESCENARIO TIENE QUE VALER, o todo lo de abajo pasaría en verde sin mirar nada.
   * Son las cuatro cosas que hacen falta: mano, una carta apagada, una jugada que hay que
   * preguntar y una compra en pie.
   */
  const cartas = cartasEnTres(vista, opciones);
  comprobar('mi mano trae las seis cartas montadas', cartas.length === MI_MANO_DE_PRUEBA.length, cartas.map((c) => c.id));
  comprobar(
    'y hay al menos una encendida y al menos una apagada: la comprada hoy no se juega hoy',
    cartas.some((c) => c.sePuedeJugar || c.sePuedeRevelar) && cartas.some((c) => !c.sePuedeJugar && !c.sePuedeRevelar),
    cartas.map((c) => [c.id, c.sePuedeJugar, c.sePuedeRevelar]),
  );
  const laGuardia = cartas.find((c) => c.familia === 'guardia' && c.sePuedeJugar);
  comprobar(
    'la guardia de un turno anterior ofrece MÁS DE UNA víctima: hay que preguntar, y el menú se abre',
    laGuardia !== undefined && jugadasDeLaCarta(vista, opciones, laGuardia.id).length > 1,
    laGuardia === undefined ? null : jugadasDeLaCarta(vista, opciones, laGuardia.id).map((j) => j.a),
  );
  const elTitulo = cartas.find((c) => c.sePuedeRevelar);
  comprobar('y el título se puede revelar, que es la otra casilla', elTitulo !== undefined && revelarDe(opciones, elTitulo.id) !== null);
  comprobar('y con sal, piedra y grano se puede comprar', comprarEnTres(opciones) !== null);

  const puesta = mesaPuestaDe(sentados, vista, opciones);
  const html = renderToStaticMarkup(
    <RiberasEnTres manifiesto={riberas} mesa={unaMesa('dentro', puesta)} puesta={puesta} tablero={tablero} opciones={opciones} />,
  );
  const texto = palabrasDe(html);

  /*
   * ═══ CADA MOVIMIENTO UNA VEZ, CON EL MAZO DENTRO ═══
   *
   * `opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(o)), mazo)` es lo
   * que el cliente pinta como botones, y aquí se exige que sea EXACTAMENTE eso: ni una
   * carta de más, ni comprar de menos.
   *
   * ═══ COMPRAR CAMBIÓ DE SITIO, Y ESTA COMPROBACIÓN CAMBIÓ CON ÉL ═══
   *
   * Hasta este encargo aquí se exigía LO CONTRARIO —«pero COMPRAR sí, que es la única del
   * mazo que no cuelga de un naipe y no tiene otro sitio»— y era verdad: el único sitio
   * donde se ofrecía era un botón de texto en el pie. Ahora hay un cuarto hueco en la
   * barra con un naipe tapado que se pulsa, así que el botón sobra: dejarlo sería ofrecer
   * el mismo movimiento dos veces en la misma pantalla, que es la regla que este bloque
   * entero existe para vigilar.
   *
   * La comprobación vieja NO se ha borrado: se ha dado la vuelta. Se sigue exigiendo que
   * comprar se pueda alcanzar —abajo, por el mazo de la barra— y se exige además que su
   * rótulo NO aparezca en el texto de la pantalla. Borrarla habría dejado el hueco por el
   * que comprar puede desaparecer entero sin que nada se ponga rojo.
   */
  const mazo = mazoEnLaBarra(vista, 's1', opciones);
  comprobar(
    'a quien juega con delta se le pinta el cuarto hueco de la barra, y hoy se puede comprar',
    mazo !== null && mazo.disponible,
    mazo,
  );
  const fuera = opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones)), mazo);
  const botones = html.split('class="opcion-rotulo"').length - 1;
  comprobar('salen como botón exactamente las que no enseña ni el tablero ni ninguna de las dos manos ni la barra', botones === fuera.length, {
    botones,
    fuera: fuera.map((o) => o.id),
  });
  const deLaMano = opciones.filter((o) => TIPOS_QUE_PINTA_LA_MANO.includes(o.tipo));
  comprobar('el juego ofrece movimientos del mazo, o esto no comprobaría nada', deLaMano.length > 0, deLaMano.length);
  for (const o of deLaMano) {
    comprobar(`«${o.rotulo}» no sale como botón: lo enseña la mano del mazo`, !texto.includes(o.rotulo), o.id);
  }
  const comprar = comprarEnTres(opciones);
  comprobar('el juego ofrece comprar, o las dos de abajo no medirían nada', comprar !== null, comprar?.id);
  comprobar(
    'y COMPRAR TAMPOCO sale ya como botón: lo ofrece el cuarto hueco de la barra, y una vez es una vez',
    comprar !== null && !texto.includes(comprar.rotulo) && !fuera.some((o) => o.tipo === comprar.tipo),
    { rotulo: comprar?.rotulo, enElTexto: comprar !== null && texto.includes(comprar.rotulo) },
  );
  /*
   * Y LA MITAD QUE SALVA AL RESPALDO. Sin hueco de mazo el botón tiene que quedarse: es el
   * único sitio donde se puede comprar en el retablo SVG, en la vista de un mirón y en una
   * mesa de más de cuatro colonos. Se pide aquí, con el mismo escenario, para que la
   * pregunta sea sobre el filtro y no sobre el montaje.
   */
  comprobar(
    'pero sin hueco de mazo el botón de comprar SIGUE, que es lo que salva al respaldo',
    opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones)), null).some(
      (o) => o.tipo === comprar?.tipo,
    ),
  );
  /*
   * EL CLIENTE NO SE INVENTA EL «SE PUEDE COMPRAR»: se lo pregunta a las reglas. Se lee el
   * fuente porque lo que hay que impedir es que alguien vuelva a mirar los bienes de la
   * mano contra un coste copiado, y eso, escrito, seguiría dando el mismo `true` hoy.
   */
  const fuenteDelCliente = readFileSync(new URL('../src/riberas-en-tres.tsx', import.meta.url), 'utf8');
  comprobar(
    'el cuarto hueco se lo pide a las reglas y no recalcula el coste: `mazoEnLaBarra`, y ni rastro del coste de la carta',
    /mazoEnLaBarra\(vista, yo, opciones\)/.test(fuenteDelCliente) &&
      !/COSTE_DE_LA_CARTA/.test(fuenteDelCliente),
  );
  comprobar(
    'y el botón se quita con `opcionesFueraDeLaBarra` pasándole EL MAZO, no un interruptor suelto',
    /opcionesFueraDeLaBarra\(\s*opcionesFueraDeLaMano\(opcionesFueraDelTablero\(opciones\)\), mazo\)/.test(
      fuenteDelCliente,
    ),
  );
  /*
   * Y SE CONFIRMA SIEMPRE, aunque la opción sea única. Es lo contrario de lo que hacen el
   * trueque y la jugada de una carta —`jugadaSinPreguntar` manda sin preguntar cuando sale
   * una sola— y está desviado a propósito: comprar se pulsa en la franja de abajo donde el
   * pulgar ya está apoyado, y un roce gasta tres bienes que no vuelven. Se comprueba que el
   * manejador ABRE el menú y que no manda nada por su cuenta, porque «arreglar» esa
   * incoherencia es exactamente lo que haría el siguiente que pase por aquí.
   */
  const elManejador = fuenteDelCliente.slice(
    fuenteDelCliente.indexOf('const alPulsarElMazo'),
    fuenteDelCliente.indexOf('}, [quieto, opciones]);', fuenteDelCliente.indexOf('const alPulsarElMazo')),
  );
  comprobar(
    'pulsar el mazo ABRE la confirmación y no manda el movimiento, aunque la opción sea única',
    elManejador.length > 0 &&
      elManejador.includes('ponerPreguntando({ titulo: COMPRAR_UNA_CARTA') &&
      !elManejador.includes('mover('),
    { mide: elManejador.length },
  );

  /* Y no se pierde ni una: barra, mano de bienes, mano del mazo o botón. */
  const porLaBarra = new Set<string>();
  for (const { id } of PIEZAS_DE_LA_BARRA) {
    const colocando = colocandoEnTres(vista, 's1', id);
    if (colocando === null) continue;
    for (const m of colocando.movimientos.values()) porLaBarra.add(canonico(m));
  }
  const porLaMano = new Set<string>();
  for (const carta of manoEnTres(vista)) {
    for (const quiero of bienesQueSeCambianPor(vista, opciones, carta.bien)) {
      for (const t of truequesPosibles(vista, opciones, carta.bien, quiero)) {
        porLaMano.add(canonico({ tipo: t.opcion.tipo, carga: t.opcion.carga }));
      }
    }
  }
  const porElMazo = new Set<string>();
  for (const carta of cartas) {
    for (const j of jugadasDeLaCarta(vista, opciones, carta.id)) {
      porElMazo.add(canonico({ tipo: j.opcion.tipo, carga: j.opcion.carga }));
    }
    const revelar = revelarDe(opciones, carta.id);
    if (revelar !== null) porElMazo.add(canonico({ tipo: revelar.tipo, carga: revelar.carga }));
  }
  comprobar('la mano del mazo ofrece algo, o el camino de las cartas no se habría recorrido', porElMazo.size > 0, porElMazo.size);
  /*
   * LA QUINTA PUERTA, NUEVA: el cuarto hueco de la barra. Comprar salía por el botón hasta
   * este encargo y ahora sale por aquí; cuando se quitó del pie, esta comprobación se puso
   * roja ella sola con `["comprar"]`, que es justo su trabajo. Se anota la puerta donde
   * está, no se le perdona el movimiento.
   */
  const porElMazoDeLaBarra = new Set<string>();
  if (mazo !== null && mazo.disponible && comprar !== null) {
    porElMazoDeLaBarra.add(canonico({ tipo: comprar.tipo, carga: comprar.carga }));
  }
  comprobar('el cuarto hueco de la barra ofrece algo, o esa puerta sería decorativa', porElMazoDeLaBarra.size === 1, [...porElMazoDeLaBarra]);
  const alcanzables = new Set([
    ...porLaBarra,
    ...porElMazoDeLaBarra,
    ...porLaMano,
    ...porElMazo,
    ...fuera.map((o) => canonico({ tipo: o.tipo, carga: o.carga })),
  ]);
  comprobar(
    'y no se pierde ni una: todo lo que ofreció el juego sale por la barra, por su cuarto hueco, por una de las dos manos o por un botón',
    opciones.every((o) => alcanzables.has(canonico({ tipo: o.tipo, carga: o.carga }))),
    opciones.filter((o) => !alcanzables.has(canonico({ tipo: o.tipo, carga: o.carga }))).map((o) => o.id),
  );

  /*
   * ═══ EL RESPALDO SIGUE ENTERO, Y CON MAZO ═══
   *
   * Con cinco colonos no hay lienzo —el atlas trae cuatro colores— y se juega sobre el
   * retablo SVG, que no tiene mano de cartas. Allí los movimientos del mazo salen como
   * botones sueltos, que es lo que `AccionesDelTablero` pinta del tablero declarado. Si
   * el filtro de la mano se hubiera aplicado también a esta rama, con cinco en la mesa no
   * habría manera de jugar una sola carta — y nadie abre una mesa de cinco para mirar.
   */
  paso('Y con cinco colonos, sobre el retablo, el mazo se sigue pudiendo jugar');

  const cinco = laProyeccionConMazo(5);
  const tableroDeCinco = tableroDeLaVista(cinco.vista);
  comprobar('la mesa de cinco con mazo trae tablero declarado y no cabe en tres dimensiones', tableroDeCinco !== null && !seVeEnTres(cinco.vista));
  if (tableroDeCinco === null) return;
  const deLaManoDeCinco = cinco.opciones.filter((o) => TIPOS_QUE_PINTA_LA_MANO.includes(o.tipo));
  comprobar('y el juego le ofrece movimientos del mazo', deLaManoDeCinco.length > 0, deLaManoDeCinco.length);

  const puestaDeCinco = mesaPuestaDe(cinco.sentados, cinco.vista, cinco.opciones);
  const htmlDeCinco = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', puestaDeCinco)}
      puesta={puestaDeCinco}
      tablero={tableroDeCinco}
      opciones={cinco.opciones}
    />,
  );
  const textoDeCinco = palabrasDe(htmlDeCinco);
  comprobar('se juega sobre el retablo SVG', htmlDeCinco.includes('<svg'));
  /*
   * Y COMPRAR SIGUE SIENDO UN BOTÓN AQUÍ, que es la mitad muda del encargo del cuarto
   * hueco. Sobre el retablo no hay barra ninguna, así que si el filtro se hubiera escrito
   * incondicional —quitar COMPRAR siempre— en una mesa de cinco no habría manera de
   * comprar una carta en toda la tarde, sin un error en ninguna parte. Se pide por su
   * rótulo, renderizado, y no por el filtro: el filtro ya está comprobado arriba, lo que
   * falta es que ESTA rama no lo aplique.
   */
  const comprarDeCinco = comprarEnTres(cinco.opciones);
  comprobar('al de cinco se le ofrece comprar, o esto no comprobaría nada', comprarDeCinco !== null, comprarDeCinco?.id);
  comprobar(
    'y sobre el retablo COMPRAR sale como botón: allí no hay barra donde pulsar un naipe',
    comprarDeCinco !== null && textoDeCinco.includes(comprarDeCinco.rotulo),
    comprarDeCinco?.rotulo,
  );
  for (const o of deLaManoDeCinco) {
    comprobar(`sobre el retablo, «${o.rotulo}» SÍ sale como botón: allí no hay mano`, textoDeCinco.includes(o.rotulo), o.id);
  }
  comprobar(
    'y allí tampoco se pierde ni una: el retablo más sus botones sueltos cubren todo lo que ofrece el juego',
    (() => {
      const sueltas = opcionesSueltas(tableroDeCinco, cinco.opciones);
      const enElDibujo = new Set<string>();
      for (const c of tableroDeCinco.caras) if (c.toque !== null) enElDibujo.add(canonico({ tipo: c.toque.tipo, carga: c.toque.carga }));
      for (const l of tableroDeCinco.lineas) if (l.toque !== null) enElDibujo.add(canonico({ tipo: l.toque.tipo, carga: l.toque.carga }));
      for (const n of tableroDeCinco.nudos) if (n.toque !== null) enElDibujo.add(canonico({ tipo: n.toque.tipo, carga: n.toque.carga }));
      for (const a of tableroDeCinco.acciones) enElDibujo.add(canonico({ tipo: a.toque.tipo, carga: a.toque.carga }));
      const todo = new Set([...enElDibujo, ...sueltas.map((o) => canonico({ tipo: o.tipo, carga: o.carga }))]);
      return cinco.opciones.every((o) => todo.has(canonico({ tipo: o.tipo, carga: o.carga })));
    })(),
  );

  /*
   * ═══ EL MARCADOR DEL RAÍL ═══
   *
   * Lo que se compra aquí es lo que se ve mal si falta: que estén TODOS los colonos, que
   * el mío se distinga, que mis puntos ocultos salgan como un SEGUNDO número —y sólo
   * cuando de verdad hay algo oculto—, que los de los demás no traigan ninguno inventado,
   * y que se diga cuántas cartas quedan.
   *
   * El segundo número de los demás es el fallo caro: si `puntosConLoOculto` se rellenara
   * con los públicos «para no dejarlo vacío», la pantalla enseñaría a cada colono un
   * número secreto que no sabe, y nadie lo notaría porque coincidiría con el público.
   */
  paso('El marcador del raíl: todos los colonos, lo tuyo distinguido, y lo que queda de mazo');

  const marcador = marcadorEnTres(vista);
  comprobar('la traducción da marcador', marcador !== null);
  if (marcador === null) return;
  const enElRail = renderToStaticMarkup(<MarcadorDeRiberas vista={vista} />);
  const textoDelRail = palabrasDe(enElRail);
  comprobar('es un panel del raíl, con la forma de los que ya hay', enElRail.includes('class="panel riberas-marcador"') && enElRail.includes('rotulo-de-panel'));
  for (const c of marcador.colonos) {
    comprobar(`«${c.nombre}» sale en el marcador`, textoDelRail.includes(c.nombre));
  }
  comprobar('el mío se distingue, y con su color de las piezas del tablero', textoDelRail.includes('(tú)') && marcador.colonos.every((c) => enElRail.includes(c.color)));
  const yoEnElMarcador = marcador.colonos.find((c) => c.soyYo);
  comprobar(
    'tengo un título sin revelar, o el número de lo oculto no se probaría',
    yoEnElMarcador !== undefined && yoEnElMarcador.puntosConLoOculto !== null && yoEnElMarcador.puntosConLoOculto > yoEnElMarcador.puntos,
    { publicos: yoEnElMarcador?.puntos, conLoOculto: yoEnElMarcador?.puntosConLoOculto },
  );
  comprobar(
    'y sale como un SEGUNDO número, dicho de quién es, no sumado al público',
    yoEnElMarcador !== undefined &&
      enElRail.includes('puntos-ocultos') &&
      textoDelRail.includes(`${String(yoEnElMarcador.puntos)} pto`) &&
      textoDelRail.includes(`y ${String(yoEnElMarcador.puntosConLoOculto ?? 0)} contándote lo oculto`),
    textoDelRail,
  );
  comprobar(
    'de los demás no se inventa ninguno: `puntosConLoOculto` es null y sólo hay un «contándote» en toda la lista',
    marcador.colonos.filter((c) => !c.soyYo).every((c) => c.puntosConLoOculto === null) &&
      enElRail.split('puntos-ocultos').length - 1 === 1,
  );
  /*
   * ═══ LOS DOS PREMIOS, Y AHORA LOS DOS TIENEN DUEÑO ═══
   *
   * Esto medía UNO: el Vado Largo estaba vacante en el escenario, así que la mitad de la
   * frase pasaba en verde por no tener nada que enseñar. Con la cadena de cinco del §
   * `laProyeccionConMazo` los dos premios están repartidos entre dos colonos distintos, y
   * el raíl tiene que nombrar a cada uno en su renglón.
   */
  comprobar('los dos premios tienen dueño, y son dos colonos distintos', marcador.mayorGuardia === 's2' && marcador.vado === 's3', { guardia: marcador.mayorGuardia, vado: marcador.vado });
  comprobar('los dos premios salen con su nombre en el renglón de quien los tiene', textoDelRail.includes('La Mayor Guardia') && textoDelRail.includes('El Vado Largo'));
  comprobar('y ninguno se le pone a la mesa entera: uno cada uno', marcador.colonos.filter((c) => c.tieneElVado).length === 1 && marcador.colonos.filter((c) => c.tieneLaMayorGuardia).length === 1);

  /*
   * ═══ Y CUÁNTO MIDE LA CADENA DE CADA UNO ═══
   *
   * Es la cifra que le habría contestado a Miguel: encadenó veredas, no le salió el premio,
   * y el raíl no decía ni cuánto medía su cadena ni cuánto hacía falta. Sale para TODOS —el
   * premio es una carrera— y el mínimo viene de `VADO_MINIMO`, no escrito en el cliente.
   */
  const conVado = marcador.colonos.find((c) => c.tieneElVado);
  const sinVado = marcador.colonos.find((c) => !c.tieneElVado);
  comprobar('el marcador trae el largo de la cadena de cada colono', marcador.colonos.every((c) => typeof c.vado === 'number') && conVado?.vado === VADO_MINIMO && sinVado?.vado === 1, marcador.colonos.map((c) => c.vado));
  comprobar('y el mínimo sale de la regla, no de un cinco escrito en el cliente', marcador.vadoMinimo === VADO_MINIMO);
  comprobar(
    'a quien NO lo tiene se le dice cuánto lleva y cuánto hace falta: «vado 1 de 5»',
    textoDelRail.includes(`vado ${String(sinVado?.vado ?? 0)} de ${String(marcador.vadoMinimo)}`),
    textoDelRail,
  );
  comprobar(
    'y a quien SÍ lo tiene se le dice cuánto mide la suya, sin el «de 5» que ya pasó',
    textoDelRail.includes(`El Vado Largo, ${String(conVado?.vado ?? 0)} veredas`) &&
      !textoDelRail.includes(`vado ${String(conVado?.vado ?? 0)} de ${String(marcador.vadoMinimo)}`),
    textoDelRail,
  );

  /*
   * ═══ Y EL EMPATE: LA CADENA LLEGA Y EL PREMIO ES DE OTRO ═══
   *
   * Es donde la frase mentía. `recalcularElVado` sólo mueve el premio a quien SUPERA al
   * dueño, así que el segundo que llega a cinco tiene cadena de cinco, cero puntos y —con
   * el renglón viejo— un «vado 5 de 5» que se lee como «ya está». Es la misma mitad del
   * fallo de Miguel (la pantalla que no explica por qué no hay premio) en la línea que se
   * añadió para explicarlo. Aquí soy YO quien llega tarde, y se mira el TEXTO del raíl.
   */
  const { vista: vistaEmpatada } = laProyeccionConMazo(3, { empateDelVado: true });
  const marcadorEmpatado = marcadorEnTres(vistaEmpatada);
  const railEmpatado = palabrasDe(renderToStaticMarkup(<MarcadorDeRiberas vista={vistaEmpatada} />));
  const yoEmpatado = marcadorEmpatado?.colonos.find((c) => c.soyYo);
  const duenoDelVado = marcadorEmpatado?.colonos.find((c) => c.tieneElVado);
  comprobar(
    'en el empate, mi cadena llega al mínimo y el premio sigue siendo del tercero, que llegó antes',
    yoEmpatado?.vado === VADO_MINIMO && yoEmpatado.tieneElVado === false && duenoDelVado?.asiento === 's3' && duenoDelVado.vado === VADO_MINIMO,
    { yo: yoEmpatado?.vado, dueno: duenoDelVado?.asiento },
  );
  comprobar(
    'y mi renglón NO dice «vado 5 de 5»: se lee como «ya está», y no está',
    !railEmpatado.includes(`vado ${String(VADO_MINIMO)} de ${String(VADO_MINIMO)}`),
    railEmpatado,
  );
  comprobar(
    'dice de quién es el premio, por su nombre, y que llegó antes',
    duenoDelVado !== undefined && railEmpatado.includes(`vado ${String(VADO_MINIMO)}, lo tiene ${duenoDelVado.nombre}, que llegó antes`),
    railEmpatado,
  );
  comprobar(
    'y «El Vado Largo» sale UNA vez en todo el raíl: en el renglón del dueño, no en el mío',
    railEmpatado.split('El Vado Largo,').length - 1 === 1,
    railEmpatado,
  );
  comprobar('los títulos revelados salen con su nombre de Riberas, que ya son públicos', textoDelRail.includes('El Molino'));
  comprobar('y se dice cuántas cartas quedan en el mazo, que es información de la mesa', marcador.mazo > 0 && textoDelRail.includes(`Quedan ${String(marcador.mazo)} cartas en el mazo`), marcador.mazo);
  comprobar('una vista que no es de Riberas no pinta un marcador vacío: no pinta nada', renderToStaticMarkup(<MarcadorDeRiberas vista={{ desde: 'otro' }} />) === '');

  /*
   * ═══ Y LO QUE NO SE PUEDE RENDERIZAR EN NODE ═══
   *
   * La mano del mazo vive dentro del `Canvas`, así que en Node no existe: aquí sale el
   * telón. Lo que sí se puede leer es el fichero, y es donde se rompen las tres cosas que
   * la escena NO hace por sí sola —lo dice el contrato de `<Delta>`: avisa de la
   * pulsación y nada más—. Ninguna de las tres da error y las tres se sienten como que
   * «la pantalla se lía»: dos cosas cogidas a la vez, una carta que no se suelta, o una
   * carta que sigue en la mano después de que otro haya jugado.
   */
  paso('Y lo que la escena no hace sola: soltar la otra mano, soltarse a sí misma, y soltarlo todo al cambiar la mesa');

  const fuente = readFileSync(new URL('../src/riberas-en-tres.tsx', import.meta.url), 'utf8');
  comprobar(
    'las cinco entradas del mazo llegan a `<Delta>`: sin ellas se pinta como antes y nadie se entera',
    /<Delta[\s\S]*?cartasDelMazo=\{cartasDelMazo\}[\s\S]*?cartaDelMazoCogida=\{cartaDelMazo\}[\s\S]*?onCogerCartaDelMazo=\{alCogerCartaDelMazo\}[\s\S]*?onJugarCarta=\{alJugarCarta\}[\s\S]*?onRevelarCarta=\{alRevelarCarta\}/.test(
      fuente,
    ),
  );
  /*
   * EL TAPETE DEL TURNO LLEGA A `<Delta>`. La entrada es opcional y sin ella no se cae
   * nada: la mesa se pintaba sin tapete en la partida y con tapete sólo en el banco, que sí
   * lo pasaba. Se exige que salga de `turnoEnTres(vista)` —el color del turno compuesto en
   * `shared/`, el mismo reparto que las chozas— y no de un color escrito aquí.
   */
  comprobar(
    'y el tapete del turno también: `<Delta>` recibe `turnoDe={turnoDe}` y `turnoDe` sale de `turnoEnTres(vista)`',
    /<Delta[\s\S]*?turnoDe=\{turnoDe\}[\s\S]*?\/>/.test(fuente) &&
      /const turnoDe = useMemo\(\(\) => turnoEnTres\(vista\), \[vista\]\);/.test(fuente),
  );
  /*
   * LA MANO QUE LLEGA A `<Delta>` ES LA COMPUESTA, Y AQUÍ SE LEE DEL FICHERO PORQUE NO HAY
   * OTRA MANERA: vive dentro del `Canvas`, y en Node no hay `Canvas`.
   *
   * Lo que se compra es que este cliente no vuelva a llamar a `cartasEnTres` a secas para
   * la mano. Si lo hiciera, la pantalla volvería exactamente al fallo de Miguel —el premio
   * ganado que no aparece por ninguna parte— y ni un solo comprobador se pondría rojo: las
   * cartas seguirían saliendo, el marcador seguiría nombrando el premio, y lo único que
   * faltaría sería el naipe. La composición vive en `shared/` justamente para eso.
   */
  const laMano = /const cartasDelMazo = useMemo\([\s\S]*?\n {2}\);/.exec(fuente)?.[0] ?? '';
  comprobar(
    'la mano que llega a la escena es la COMPUESTA en `shared/`: premios y cartas, no sólo cartas',
    laMano.includes('laManoDeLaIzquierda(') && !laMano.includes('cartasEnTres('),
    laMano.slice(0, 400),
  );
  /*
   * Y EL CINCO DEL VADO NO SE ESCRIBE AQUÍ: SE PIDE.
   *
   * La comprobación del raíl de más arriba mira el TEXTO renderizado, y ese texto sale
   * idéntico escribiendo el cinco a mano: con el escenario de hoy `marcador.vadoMinimo`
   * vale cinco y un literal también. O sea que allí las dos cosas no se distinguen, y la
   * diferencia es justo la que importa el día que la regla cambie — ese día la pantalla
   * seguiría prometiendo cinco veredas para un premio que ya pide otra cosa, sin que se
   * cayera nada. Aquí se mira el CÓDIGO y no el fichero entero, porque las cabeceras de
   * esta pantalla nombran `VADO_MINIMO` a propósito y una regla que castigue documentar
   * algo enseña a no documentarlo.
   */
  const codigoDelCliente = fuente
    .split('\n')
    .filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l))
    .join('\n');
  comprobar(
    'la frase del Vado la escribe `shared/` (`renglonDelVado`) y el raíl no escribe ni el cinco ni el «de»',
    codigoDelCliente.includes('renglonDelVado(') &&
      !/\bvado \$\{/.test(codigoDelCliente) &&
      !/\bvado \d/.test(codigoDelCliente),
    'una frase escrita aquí es una segunda copia de una bifurcación de tres ramas, y la copia es la que vuelve a decir «de 5» a secas',
  );
  comprobar(
    'y el apagón por petición en vuelo NO toca a los premios: apagar es «espera», y un premio no espera',
    laMano.includes('esPremio'),
    laMano.slice(0, 400),
  );

  const alCoger = /const alCogerCartaDelMazo = useCallback\([\s\S]*?\n {2}\);/.exec(fuente)?.[0] ?? '';
  comprobar(
    'coger un naipe suelta el bien cogido y la pieza de la barra: dos gestos ofrecidos a la vez son uno equivocado',
    alCoger.includes('ponerCogida(null)') && alCoger.includes('ponerTomada(null)'),
    alCoger.slice(0, 300),
  );
  comprobar(
    'y cogerlo dos veces lo suelta, que es la única forma de arrepentirse',
    /ponerCartaDelMazo\(\(antes\) => \(antes === carta\.id \? null : carta\.id\)\)/.test(alCoger),
    alCoger.slice(0, 300),
  );
  const alCogerBien = /const alCogerCarta = useCallback\([\s\S]*?\n {2}\);/.exec(fuente)?.[0] ?? '';
  comprobar(
    'y al revés también: coger un bien suelta el naipe del mazo',
    alCogerBien.includes('ponerCartaDelMazo(null)'),
    alCogerBien.slice(0, 300),
  );
  comprobar('y coger una pieza de la barra suelta las dos manos', /const alTomarDeLaBarra = useCallback\([\s\S]*?ponerCartaDelMazo\(null\)/.test(fuente));
  const marcaDeLaRevision = '}, [puesta.rev]);';
  const hastaLaRevision = fuente.slice(0, fuente.indexOf(marcaDeLaRevision));
  const alCambiarLaRevision = hastaLaRevision.slice(hastaLaRevision.lastIndexOf('useEffect('));
  comprobar(
    'al cambiar la revisión se suelta también el naipe: pudo jugarlo otro mientras estaba levantado',
    alCambiarLaRevision.includes('ponerCartaDelMazo(null)'),
    alCambiarLaRevision.slice(0, 300),
  );
  /*
   * Y NINGUNA REGLA ESCRITA AQUÍ. El movimiento que se manda sale SIEMPRE de una opción
   * que dio el juego —`.opcion.tipo` o el `revelar` de `revelarDe`—, nunca de un tipo
   * escrito a mano. Un `'riberas:guardia'` en este fichero es una regla en el cliente: el
   * día que la carga cambie de forma, la pantalla mandaría movimientos que el servidor
   * rechaza en silencio.
   */
  const tipoAMano = /['"]riberas:[a-z-]+['"]/.exec(fuente);
  comprobar('ni un tipo de movimiento escrito a mano: todo sale de la opción que dio el juego', tipoAMano === null, tipoAMano?.[0]);
  comprobar(
    'y a quién se le roba o qué bienes se cogen lo decide `jugadasDeLaCarta`, no un `if` sobre la familia',
    fuente.includes('jugadaSinPreguntar(') && fuente.includes('jugadasDeLaCarta(') && !/familia === '/.test(fuente),
  );
}

// ---------------------------------------------------------------------------

elCatalogoNoMiente();
noSePintaDeMas();
laPausaCabe();
loQueLaPantallaDecideSola();
lasDirecciones();
elMuelle();
riberasEnTres();
elAcercamientoDelDelta();
elMazoEnLaPantalla();
elResultadoDeMover();

console.log('');
/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS», el mismo que llevan el servidor y la escena.
 *
 * Este guion no lo tuvo nunca, y la fase que metió aquí las comprobaciones del empate del
 * Vado —las que compran el grave de «vado 5 de 5»— lo dejó dicho: un bloque borrado, o un
 * guion que se cae a la mitad, termina con código cero y una lista corta de aciertos, y
 * eso se lee como verde. Con el número escrito, salir con menos es un fallo ruidoso. Va a
 * mano y se sube al añadir comprobaciones; un guardia desfasado no guarda nada.
 */
const COMPROBACIONES_ESCRITAS = 389;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(
    `Solo se han hecho ${String(hechas)} de las ${String(COMPROBACIONES_ESCRITAS)} comprobaciones que ` +
      'tiene escritas este guion: se ha caído por el camino sin decirlo. ' +
      'Si has añadido comprobaciones nuevas, sube el número.',
  );
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(
    `✔ ${String(hechas)} comprobaciones. El escritorio enseña TODOS los arcades instalados y deja\n` +
      '  pulsar solo aquellos en los que se cumplen las TRES cosas: que su mueble lo pinte la\n' +
      '  plataforma, que su mesa exista en el servidor, y que el juego publique algo que pintar\n' +
      '  —su lista de opciones(), o el mueble tablero, que promete el dibujo en la proyección—.\n' +
      '  De los demás dice por qué no, y cada negativa dice la SUYA: solo la que de verdad se\n' +
      '  juega en la app manda a la app. Y sus dos muebles no pintan ni una palabra, ni una pieza\n' +
      '  ni un movimiento que no viniera dentro de la proyección: comprobado renderizando los\n' +
      '  componentes de verdad contra una partida de verdad. Y el Muelle se pinta sólo al arcade\n' +
      '  que lo tiene y sólo hasta zarpar, con su raíl entero sin necesidad de un Canvas. Y el\n' +
      '  delta en tres dimensiones de Riberas enseña cada movimiento exactamente una vez entre\n' +
      '  la barra, la mano y sus botones, también sin Canvas; con cinco colonos cae al retablo\n' +
      '  de siempre diciendo por qué, y su semilla es la misma que la de la cala del muelle.\n' +
      '  Y su tablero se acerca con la rueda, con dos dedos, y se recorre con el arrastre\n' +
      '  secundario o con el punto medio del pellizco, sin que una sola cuenta de cámara viva en\n' +
      '  el cliente: se entra viendo el delta entero, la rueda no se la lleva la página —tampoco\n' +
      '  encima del botón de volver, que por eso el oyente cuelga del recuadro— y vale lo mismo\n' +
      '  en los tres modos de rueda, un gesto empezado no se lo queda otro botón, una jugada\n' +
      '  ajena no recoloca la vista, y siempre hay un botón para volver a verlo entero, vestido\n' +
      '  y medido como el resto de los botones de la Sala.\n' +
      '\n  Y el MAZO: sus movimientos los enseña la mano de cartas y no salen además como\n' +
      '  botón —comprar sí, que no cuelga de ningún naipe—, ninguno se pierde entre la barra,\n' +
      '  las dos manos y los botones, y sobre el retablo de cinco colonos, donde no hay mano,\n' +
      '  vuelven a salir sueltos para que allí también se pueda jugar. Y la mano que llega a la\n' +
      '  escena es la COMPUESTA: los dos premios delante de las cartas, para que el Vado Largo\n' +
      '  ganado se VEA y no sólo se nombre. El marcador del raíl\n' +
      '  nombra a todos los colonos con su color, distingue el tuyo y saca tus puntos ocultos\n' +
      '  como un segundo número que no se le inventa a nadie más, dice cuántas cartas quedan, y\n' +
      '  dice cuánto mide la cadena de veredas de cada uno con el mínimo sacado de la regla.\n' +
      '  Y lo que la escena no hace sola lo hace el cliente: coger un naipe suelta el bien y la\n' +
      '  pieza, cogerlo otra vez lo suelta, y una jugada ajena suelta la mano entera.\n' +
      '\n  Lo que esto NO prueba: que el reparto de los cuatro muebles entre propios y genéricos\n' +
      '  sea el del §7 —es una decisión de producto y no se deriva del contrato—, ni que la ruta\n' +
      '  del catálogo mande de verdad publicaOpciones: aquí no se levanta ningún servidor. Ni\n' +
      '  cómo se VE el acercamiento: la cámara vive dentro de un Canvas y en Node no hay WebGL,\n' +
      '  así que de ella se compra que la aritmética siga en `escenas/acercar.ts`, donde\n' +
      '  `verify:escena` la mide, y no que el delta se vea bonito de cerca. Ni cómo se REPARTE\n' +
      '  la mano de cartas —vive dentro del mismo Canvas—: eso lo mide `verify:riberas-en-tres`\n' +
      '  contra `escenas/cartas.ts`, y aquí sólo se compra lo que le llega a `<Delta>`.',
  );
  process.exit(0);
}
console.log(`✘ ${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
