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
import { renderToStaticMarkup } from 'react-dom/server';
import { arcadesInstalados, avanzar, hayOpciones, opcionesDeArcade, proyectar } from '../../shared/arcade';
import type { ContextoMovimiento, ManifiestoDeArcade, Opcion } from '../../shared/arcade';
import { MUEBLES_DEL_CONTRATO } from '../../shared/arcade/tipos';
import '../../shared/arcade/juegos';
import { EMPEZAR_RIBERAS, RIBERAS } from '../../shared/arcade/juegos';
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
import { loQueQuedaTrasElSondeo, SIN_AVISO } from '../src/mesa';
import type { LaMesa, MesaVista } from '../src/mesa';
import { loQueSeDiceDeUnFallo } from '../src/red-de-seguridad';
import { haEmpezado } from '../src/empezada';
import { Muelle } from '../src/muelle';
import { temaDelMuelle, tieneMuelle } from '../../escenas/embarcadero/tema';
import { FIGURAS } from '../../escenas/embarcadero/figuras';
import { semillaDeCodigo } from '../../escenas/embarcadero/cala';
import { RiberasEnTres } from '../src/riberas-en-tres';
import {
  bienDeRiberas,
  bienesQueSeCambianPor,
  colocandoEnTres,
  manoEnTres,
  opcionesFueraDelTablero,
  PIEZAS_DE_LA_BARRA,
  seVeEnTres,
  tableroEnTres,
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
    mover: nada,
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
  const fuera = opcionesFueraDelTablero(opciones);
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
    const doy = bienDeRiberas(carta.bien);
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

elCatalogoNoMiente();
noSePintaDeMas();
laPausaCabe();
loQueLaPantallaDecideSola();
lasDirecciones();
elMuelle();
riberasEnTres();

console.log('');
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
      '\n  Lo que esto NO prueba: que el reparto de los cuatro muebles entre propios y genéricos\n' +
      '  sea el del §7 —es una decisión de producto y no se deriva del contrato—, ni que la ruta\n' +
      '  del catálogo mande de verdad publicaOpciones: aquí no se levanta ningún servidor.',
  );
  process.exit(0);
}
console.log(`✘ ${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
