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
import { loQuePide, PLAZOS } from '../src/sala';
import { loQueQuedaTrasElSondeo, SIN_AVISO } from '../src/mesa';
import { loQueSeDiceDeUnFallo } from '../src/red-de-seguridad';

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

/** Una partida de Riberas de verdad, jugada aquí con el reductor de `shared/`. */
function laProyeccionDeVerdad(): { vista: unknown; opciones: readonly Opcion[] } {
  const asientos = ['s1', 's2'];
  const ctx = (quien: string | null): ContextoMovimiento => ({
    quien,
    azar: 987_654,
    tic: 0,
    asientos,
  });

  let estado: unknown = undefined;
  estado = avanzar(RIBERAS, estado, { tipo: EMPEZAR_RIBERAS, carga: {} }, ctx('s1'));

  const sentados = [
    { asiento: 's1', nombre: 'Ana' },
    { asiento: 's2', nombre: 'Bruno' },
  ];
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

elCatalogoNoMiente();
noSePintaDeMas();
laPausaCabe();
loQueLaPantallaDecideSola();
lasDirecciones();

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
      '  componentes de verdad contra una partida de verdad.\n' +
      '\n  Lo que esto NO prueba: que el reparto de los cuatro muebles entre propios y genéricos\n' +
      '  sea el del §7 —es una decisión de producto y no se deriva del contrato—, ni que la ruta\n' +
      '  del catálogo mande de verdad publicaOpciones: aquí no se levanta ningún servidor.',
  );
  process.exit(0);
}
console.log(`✘ ${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
