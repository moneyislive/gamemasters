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
  ACEPTAR,
  CLASES_DE_CARTA,
  EMPEZAR_RIBERAS,
  recalcularElVado,
  recalcularLaGuardia,
  RECHAZAR,
  RIBERAS,
  VADO_MINIMO,
} from '../../shared/arcade/juegos';
import type { Bien, CartaEnMano, EstadoDeRiberas, Ficha } from '../../shared/arcade/juegos';
import { aristaDeHex, verticeDeHex } from '../../shared/mecanicas/malla-hexagonal';
import { tableroDeLaVista } from '../../shared/mecanicas/tablero-declarado';
import type { TableroDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { Tarjeta } from '../src/catalogo';
import { Formulario, loQueSePuedePintar } from '../src/formulario';
import { dondeSeJuega, MUEBLES, mueblesSinDeclarar } from '../src/muebles';
import type { ArcadeDelCatalogo } from '../src/muebles';
import { loQueSePinta, opcionesSueltas, queSePinta } from '../src/plan';
import { canonico } from '../../shared/mecanicas/canonico';
import {
  CICLO_MAXIMO_MS,
  cuantoQueda,
  cuantoQuedaEnLaCinta,
  elPlazoAprieta,
  LETRAS_DEL_RELOJ_DE_LA_CINTA,
  msHastaQueCambieElRotulo,
  pausaAntesDeVolverAPreguntar,
  PLAZO_DESCONOCIDO_EN_LA_CINTA,
  SE_ACABO_EN_LA_CINTA,
  TOPE_DE_PAUSA_MS,
  VENTANA_DE_PRESENCIA,
} from '../src/relojes';
import { Retablo } from '../src/retablo';
import { LaMesaPuesta, loQuePide, PLAZOS, tocaElMuelle } from '../src/sala';
import { loQueQuedaTrasElSondeo, seVuelveSoloAlSitio, SIN_AVISO } from '../src/mesa';
import type { LaMesa, MesaVista, ResultadoDelMovimiento } from '../src/mesa';
import { loQueSeDiceDeUnFallo } from '../src/red-de-seguridad';
import { haEmpezado } from '../src/empezada';
import { Muelle } from '../src/muelle';
import { temaDelMuelle, tieneMuelle } from '../../escenas/embarcadero/tema';
import { FIGURAS } from '../../escenas/embarcadero/figuras';
import { semillaDeCodigo } from '../../escenas/embarcadero/cala';
/* El sitio del mando de recoger lo dice la escena, no esta hoja: ver `escenas/mesa.ts`. */
import { MANDO_DE_RECOGER } from '../../escenas/mesa';
/*
 * Y el sitio del cartel de las cartas tampoco se copia: se mide contra lo que la escena
 * PINTA de verdad —los naipes del mazo, las cartas de bienes y el asa de la barra— y no
 * contra la misma fórmula escrita otra vez aquí. Ver `elCartelDeLaCarta`.
 */
import { huecosDeLasCartas, loQueSeVeEnLasCartas } from '../../escenas/cartas';
import { huecosDeLaBaraja, loQueSeVeEnLaBaraja } from '../../escenas/baraja';
import { ASA_DEL_HUECO, huecosDeLaMesa, loQueSeVe } from '../../escenas/barra';
import {
  altoDelPregonPlegado,
  armarUnaTrampa,
  cifrasDeLosPuntos,
  cuantasTirasSeVen,
  ElComponedorDelRetablo,
  ElComponedorEnElLienzo,
  elAltoDelPregon,
  elCartelQueCabe,
  elEstadoQueCabe,
  elEstiloDelCajon,
  elEstiloDelCartel,
  elEstiloDeLaCinta,
  elEstiloDelPregon,
  huecoDeLaTira,
  huecoDelRelojDeLaCinta,
  huecoMinimoDeLaFrase,
  elRenglonDelColonoQueCabe,
  huecoDelRenglonDelColono,
  ladoDelBotonDeLaCinta,
  loQueHaceLaTrampa,
  mandaEstaTrampa,
  MarcadorDeRiberas,
  RAIZ_DE_LA_CASA,
  RiberasEnTres,
  techoDelAsaEnPuntos,
} from '../src/riberas-en-tres';
import type { ElFocoDeLaTrampa, LoQueHaceLaTrampa } from '../src/riberas-en-tres';
/* La cinta la reparte `escenas/`, y de ahí salen los dos 44 que la hoja escribe en `rem`. */
import { altoDeLaCinta, ALTO_DE_LA_CINTA, anchoDeLaCinta, BOTON_DE_LA_CINTA, cuantosSeVenEnElCarril, loQueLlevaLaCinta } from '../../escenas/cinta';
/*
 * Y de la traducción, la palabra de un número —la misma con la que se escriben las frases de
 * los naipes— y el retrato de una clase de carta, que es de donde salen LAS ONCE
 * explicaciones que hay: las nueve clases y los dos premios. No se sacan de una mano de una
 * partida, que trae las que le tocaron y no todas.
 */
import {
  accionesFueraDelPregon,
  cardinal,
  EL_PREGON_DE_LA_MESA,
  PANEL_DE_TRUEQUES,
  elComponedor,
  elPregonEnTres,
  elPregonSePliega,
  elResumenDelPregon,
  glifosDelCarril,
  NADA_COMPUESTO,
  retratoDeLaCarta,
} from '../../shared/arcade/juegos/riberas-en-tres';
import type { ExplicacionDeLaCarta, LoQueSeCompone } from '../../shared/arcade/juegos/riberas-en-tres';
import {
  bienesQueSeCambianPor,
  cartasEnTres,
  colocandoEnTres,
  comprarEnTres,
  jugadasDeLaCarta,
  laManoDeLaIzquierda,
  manoEnTres,
  marcadorEnTres,
  mazoEnLaBarra,
  renglonDelVado,
  opcionesFueraDeLaBarra,
  opcionesFueraDeLaMano,
  opcionesFueraDelTablero,
  PIEZAS_DE_LA_BARRA,
  puertaDelTrueque,
  revelarDe,
  seVeEnTres,
  tableroEnTres,
  TIPOS_QUE_PINTA_LA_MANO,
  truequesPosibles,
} from '../../shared/arcade/juegos/riberas-en-tres';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';

/**
 * EL FUENTE SIN SUS COMENTARIOS, Y POR QUÉ ESTO ESTÁ ARRIBA DEL TODO.
 *
 * Media docena de comprobaciones de este guion afirman que una frase o un número NO están
 * escritos en el cliente —«el cinco del Vado no se escribe aquí», «el ancho de la cinta no
 * está en la hoja»—, y todas tienen el mismo agujero por el otro lado: las cabeceras de
 * esta casa cuentan el fallo que evitan, o sea que NOMBRAN lo prohibido a propósito. Una
 * comprobación que mire el fichero entero se pone roja por documentar, y eso enseña a no
 * documentar, que es exactamente lo contrario de lo que esta casa quiere.
 *
 * Ya pasó: la ficha del marcador estrenó un comentario que explicaba qué se lee en el
 * segundo renglón —«vado 5 · 3 chozas · 1 torre»— y «la frase del Vado la escribe `shared/`»
 * se puso roja con la frase saliendo de `renglonDelVado` como tenía que salir.
 *
 * Filtrar POR LÍNEAS no vale, y ése fue el fallo: un bloque `/* … *\/` de varios renglones
 * sólo tiene el asterisco en los de en medio si alguien lo puso, y un comentario de JSX
 * (`{/* … *\/}`) reparte el texto por renglones que no empiezan por nada. Se quitan los
 * BLOQUES enteros, que es lo que son.
 */
function sinComentarios(texto: string): string {
  return texto
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
}

/*
 * ═══ LOS LIENZOS QUE ESTE CLIENTE DA, Y QUE DESDE LA PÁGINA DE PIE SON MÁS BAJOS ═══
 *
 * La lista de abajo se comparte con el móvil y por eso la abre 320×360. Hasta la página de
 * pie, ese lienzo aquí no existía: `.riberas-lienzo` llevaba `min-height: 420px` y ese
 * número era EL SUELO de este cliente, así que los lienzos bajos de la lista se medían sin
 * poder darse mientras la forma que sí se daba —estrecha y ALTA— no se medía ninguna vez.
 *
 * ESE SUELO YA NO ESTÁ. Con la cadena de pie manda la ventana: el recuadro vale la ventana
 * entera menos la cabecera de la Sala, y una ventana baja da un lienzo bajo de verdad. Así
 * que la lista aprende las DOS formas que este cliente da ahora en el extremo, y son las
 * más bajas de las dieciocho.
 *
 * De ANCHO, los mismos 288 de siempre y por la misma suma: el suelo de documento de WCAG
 * 1.4.10 son 320 puntos (es el arreglo que ya está escrito en el punto 1 de la cabecera de
 * `estilo.css`), `.dentro` se lleva `clamp(1rem, 4vw, 2.5rem)` por lado y a 320 manda el
 * mínimo, 17 puntos, así que al recuadro le quedan 286; se mide con 288 por caer del lado
 * seguro. Ahí el renglón cabe 20 letras contra las 25 del móvil.
 *
 * De ALTO, la ventana menos la cabecera, medido en el navegador con la raíz en 17 y una
 * ventana de 420: la cabecera mide 64,92 puntos en un renglón y 103,14 cuando el rótulo y
 * la silla se parten en dos, o sea 355 y 317. Los dos casos se dan de verdad y el que
 * manda es el ancho: a 320 de ventana la cabecera se parte, y unas decenas de puntos más
 * ancha cabe en uno. El 288×420 de antes se queda en la lista como lo que es: la forma que
 * sale con una ventana un poco más alta, y el escalón entre la de pie y las de siempre.
 *
 * ═══ Y VIVE AQUÍ ARRIBA PORQUE YA LA MIRAN DOS BLOQUES ═══
 *
 * El del cartel de los naipes y el de la cinta. Dos copias iguales de una lista son la
 * manera de que un lienzo nuevo entre en una y no en la otra, y el que se queda fuera es
 * justo el que nadie estaba mirando: es la misma razón por la que `verify:escena` tiene
 * UNA lista para todos sus bloques, y está escrita en su cabecera.
 */
const LIENZOS: Array<[string, number, number]> = [
  ['escritorio de pie, la cabecera en un renglón', 288, 355],
  ['escritorio de pie, la cabecera en dos renglones', 288, 317],
  ['escritorio estrecho, con algo más de ventana', 288, 420],
  ['móvil estrecho, lienzo al mínimo', 320, 360],
  ['móvil pequeño', 360, 490],
  ['móvil corriente', 390, 490],
  ['móvil de pie, lienzo entero', 390, 845],
  ['tableta', 768, 640],
  ['tableta con el navegador de pie', 768, 1024],
  ['monitor', 1920, 900],
  ['apaisado SE 1ª', 568, 320],
  ['apaisado SE 2ª/3ª', 667, 375],
  ['apaisado Android de 360', 780, 360],
  ['apaisado iPhone 14', 844, 390],
  ['apaisado Pro Max', 932, 430],
  ['apaisado tableta 4:3', 1024, 768],
  ['apaisado iPad Air', 1180, 820],
  ['apaisado monitor 1080', 1920, 1080],
];

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

/**
 * ═══ EL ESTIAJE EN EL RETABLO: LO QUE SE OYE CUANDO UNA ISLA SE PUEDE TOCAR ═══
 *
 * Esto vive AQUÍ y no en `verify:riberas` a propósito, y la partición es la mitad de la
 * comprobación: aquel comprobador no importa nada de `escritorio/` —no puede pintar un
 * SVG ni leer un `aria-label`— así que allí se mira lo que es del juego (que la cara
 * ofrecida SALE con su rótulo y su cifra dentro del dato) y aquí lo que es del mueble
 * (que esas dos palabras acaban dentro del nombre del botón, y que el texto que se
 * esconde para no decirlo dos veces sólo se esconde donde hay botón que lo diga).
 *
 * Lo que compra: `textoDeCara` esconde con `aria-hidden` el texto de una cara TOCABLE, y
 * hasta esta fase NINGUNA isla de Riberas lo era —medido: cero caras con `toque` en
 * 342.000 miradas—, así que ese camino no se había ejercitado nunca. Con el estiaje por
 * mover son dieciocho de diecinueve, y si `nombreParaElLector` dejara de componer el
 * nombre con `rotulo` y `cifra`, el mapa se quedaría mudo justo en el momento en que hay
 * que elegir una isla — sin que nada se cayera y sin que nada se viera raro en pantalla.
 */
function elEstiajeSeOye(): void {
  paso('Con el estiaje por mover, la isla que se puede tocar se oye con su nombre');

  const { vista, opciones } = laProyeccionConMazo(3, { conElEstiajePorMover: true });
  const tablero = tableroDeLaVista(vista);
  comprobar('la proyección del turno del siete trae tablero', tablero !== null);
  if (tablero === null) return;

  const tocables = tablero.caras.filter((c) => c.toque !== null);
  comprobar('con el estiaje por mover hay dieciocho islas tocables, que es lo que estrena este camino', tocables.length === 18, tocables.length);
  comprobar('y hay exactamente una que no lo es: donde está la pieza', tablero.caras.length - tocables.length === 1);

  const html = renderToStaticMarkup(<Retablo tablero={tablero} alTocar={() => undefined} quieto={false} />);
  const nombres = [...html.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1] as string);

  /*
   * EL NOMBRE DE CADA CARA OFRECIDA LLEVA SU TERRENO Y SU CIFRA. Se compone igual que
   * `nombreParaElLector`: rótulo y cifra separados por un espacio, y sin cifra la duna,
   * que no tiene número porque no rinde. Se comprueban las dieciocho, no una.
   */
  const faltan = tocables
    .map((c) => `${c.rotulo} ${c.cifra}`.trim())
    .filter((nombre) => !nombres.includes(nombre));
  comprobar('el `aria-label` de cada isla ofrecida lleva su terreno y su cifra dentro', faltan.length === 0, faltan);
  comprobar(
    'y ninguna se anuncia con el tipo del movimiento ni con su llave, que es lo que se oía antes',
    !nombres.includes('estiaje') && !nombres.some((n) => /^-?\d+,-?\d+$/.test(n)),
    nombres.filter((n) => /^-?\d+,-?\d+$/.test(n) || n === 'estiaje'),
  );

  /*
   * LA VACUNA, y es la que sostiene la decisión de no tocar `textoDeCara`: una cara que
   * NO se ofrece sigue con su texto visible y sin `aria-hidden`, porque ahí no hay
   * ningún botón que lo diga. La única que queda así durante este momento es justo la
   * isla donde ESTÁ el estiaje —mover es a otra—, que es la que hay que encontrar.
   */
  const laDelEstiaje = tablero.caras.find((c) => c.toque === null) as { rotulo: string; cifra: string };
  comprobar('la isla donde está la pieza lo dice en su rótulo', laDelEstiaje.rotulo.includes('estiaje'), laDelEstiaje.rotulo);
  comprobar(
    'y como no se toca, su texto se lee entero en pantalla: el mapa no se queda mudo',
    palabrasDe(html).includes(laDelEstiaje.rotulo),
    laDelEstiaje.rotulo,
  );
  comprobar(
    'se esconde exactamente el texto de las que sí se tocan, ni uno más',
    (html.split('aria-hidden="true"').length - 1) === tocables.filter((c) => c.rotulo.length > 0 || c.cifra.length > 0).length,
    { escondidos: html.split('aria-hidden="true"').length - 1, tocables: tocables.length },
  );
  /*
   * Y LA OTRA MITAD: sin `toque`, no se esconde ninguno. Sin esta línea, «se esconden
   * dieciocho» pasaría igual si el retablo escondiera SIEMPRE el texto, que es la
   * conducta que dejaría el mapa mudo en cuanto una isla dejara de ofrecerse.
   */
  const mudo: TableroDeclarado = { ...tablero, caras: tablero.caras.map((c) => ({ ...c, toque: null })) };
  const htmlMudo = renderToStaticMarkup(<Retablo tablero={mudo} alTocar={() => undefined} quieto={false} />);
  comprobar('y sin ninguna cara tocable no se esconde ni un texto', !htmlMudo.includes('aria-hidden="true"'));
  comprobar('y ninguna opción del estiaje se queda sin dónde pulsarse', opcionesSueltas(tablero, opciones).every((o) => o.tipo !== 'riberas:estiaje'), opcionesSueltas(tablero, opciones).map((o) => o.id));
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
  /*
   * ═══ Y EL MUELLE ES LA CUARTA LISTA DE BOTONES DE OPCIONES, Y TAMPOCO PINTA UNA ═══
   *
   * Las otras tres —el `Formulario` de aquí, `LasOpciones` de la app y las acciones que el
   * juego baja al tablero— filtran las declaraciones. Ésta no lo hacía, y hoy no muerde por
   * una guarda de OTRO fichero: al muelle sólo se entra con la mesa sin empezar, y la única
   * opción marcada que existe —la puerta del trueque— sale con el turno en la mano. O sea un
   * agujero latente que depende de una condición que vive en `riberas.ts`, que es justo lo
   * que la decisión de dónde muere la puerta dice que no hay que hacer.
   *
   * Se compra pintando el muelle CON una declaración dentro, que es la única manera de
   * medir un camino al que hoy no se llega jugando.
   */
  const conDeclaracion = renderToStaticMarkup(
    <Muelle
      manifiesto={riberas}
      tema={tema}
      mesa={unaMesa('dentro', {
        ...vista,
        opciones: [
          ...opcionesDeReunion,
          {
            id: 'ofrecer:puerta',
            tipo: 'riberas:ofrecer',
            carga: { tope: 3, a: ['s2'], mesa: true },
            rotulo: 'Proponer un trueque',
            ayuda: 'Hasta 3 fichas por lado.',
            declaracion: true,
          },
        ],
      })}
      silla=""
      codigoDeLaUrl=""
      zarpando={false}
      alDesembarcar={() => undefined}
    />,
  );
  comprobar(
    'y una declaración metida entre sus opciones NO se pinta como botón: es la cuarta lista y filtra como las otras tres',
    !palabrasDe(conDeclaracion).includes('Proponer un trueque'),
    palabrasDe(conDeclaracion).slice(0, 200),
  );
  comprobar(
    'y las demás sí siguen saliendo, que es la mitad que no se puede perder al filtrar',
    opcionesDeReunion.every((o) => palabrasDe(conDeclaracion).includes(o.rotulo)),
    opcionesDeReunion.map((o) => o.rotulo),
  );
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
  /*
   * EL OYENTE SE MIRA SIN SUS COMENTARIOS, y no por gusto: desde que la rueda tiene que
   * decidir de quién es el suceso —cajón, velo o cámara— su cuerpo lleva dentro un párrafo
   * que cuenta el porqué, y una ventana de trescientas letras sobre el fuente CON
   * comentarios se agotaba antes de llegar al `preventDefault`. La comprobación se ponía
   * roja por documentar, que es la manera de enseñar a no documentar.
   */
  const laRueda = sinComentarios(/const rueda = \(e: WheelEvent\)[\s\S]*?\n {4}\};/.exec(fuente)?.[0] ?? '');
  comprobar(
    'la rueda acerca con `acercando` y le quita el gesto a la página: `preventDefault` sobre un oyente no pasivo',
    /preventDefault\(\)[\s\S]{0,200}?acercando\(/.test(laRueda) &&
      /addEventListener\('wheel',[^;]*\{\s*passive:\s*false\s*\}\)/.test(fuente),
    laRueda.replace(/\s+/g, ' ').slice(0, 300),
  );
  /*
   * ═══ Y DESDE QUE HAY CAJÓN, ESE `preventDefault` NO PUEDE SER PARA TODOS ═══
   *
   * Es el mismo fallo del oyente en el `<canvas>`, por el otro lado. El cajón vive DENTRO
   * del recuadro y se desplaza por dentro; con el `preventDefault` de siempre, girar la
   * rueda sobre la crónica acercaba el delta que hay detrás y la crónica no se movía un
   * renglón. Nadie llama a eso «un zoom que se come el desplazamiento»: se llama «la
   * crónica no se puede leer», y no da error en ninguna consola.
   *
   * Así que la rueda pregunta de quién es el suceso, y son TRES ramas, no dos:
   *
   *   · dentro de una caja que se desplaza sola se sale ANTES del `preventDefault`, o el
   *     navegador no la desplazaría;
   *   · sobre el velo se llama a `preventDefault` y se para ahí, porque lo que hay abierto es
   *     modal y modal incluye la cámara: con el marcador abierto no se acerca el de debajo;
   *   · en el resto del recuadro, lo de siempre.
   *
   * Se compra el ORDEN, que es lo único que aquí se puede romper en silencio: con el
   * `preventDefault` delante de la primera guarda, el cajón vuelve a no desplazarse.
   *
   * ═══ Y SON TRES CAJAS Y NO UNA, QUE ES LO QUE ESTA FASE AÑADIÓ ═══
   *
   * El cajón fue la primera; después llegaron el CARRIL de la cinta —`overflow-x: auto` con
   * dieciocho destinos del estiaje dentro— y el MENÚ de elegir, que con los quince pares del
   * año bueno tampoco cabe entero. Las tres se rompen igual y en silencio: la rueda encima
   * acerca el delta y la caja no se mueve. Por eso se compra que la guarda las mire a las
   * TRES por una lista con nombre y no con tres `closest` escritos a mano, que es la forma de
   * que la cuarta caja que llegue se olvide en el sitio donde no lo va a notar nadie.
   */
  const salidaDeLasCajas = laRueda.indexOf('SE_DESPLAZAN_SOLAS');
  const evitaElGesto = laRueda.indexOf('preventDefault()');
  const salidaDelVelo = laRueda.indexOf('EL_VELO');
  const laLista = /const SE_DESPLAZAN_SOLAS = \[([^\]]*)\];/.exec(sinComentarios(fuente))?.[1] ?? '';
  comprobar(
    'y con algo abierto encima la rueda no es siempre de la cámara: dentro de una caja que se desplaza sola se sale ANTES del `preventDefault` para que el navegador la desplace, sobre el velo se corta DESPUÉS —modal incluye la cámara— y en el resto se acerca',
    salidaDeLasCajas > 0 &&
      evitaElGesto > salidaDeLasCajas &&
      salidaDelVelo > evitaElGesto &&
      laRueda.indexOf('acercando(') > salidaDelVelo &&
      /SE_DESPLAZAN_SOLAS\.some\(\(clase\) => donde\?\.closest\(`\.\$\{clase\}`\) != null\)/.test(laRueda) &&
      /closest\(`\.\$\{EL_VELO\}`\)/.test(laRueda),
    { cajas: salidaDeLasCajas, preventDefault: evitaElGesto, velo: salidaDelVelo, acercando: laRueda.indexOf('acercando(') },
  );
  comprobar(
    'y esa lista son las TRES cajas que se desplazan por dentro —el cajón, el carril de la cinta y el menú de elegir—, nombradas juntas: una caja nueva que se olvide ahí no da error, sólo deja de poder leerse',
    laLista.includes('EL_CAJON') && laLista.includes('EL_CARRIL') && laLista.includes('EL_MENU'),
    laLista.replace(/\s+/g, ' '),
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
  const marcaDeLaRevision = '}, [puesta.rev, soltarTodo]);';
  comprobar('hay un efecto que corre al cambiar la revisión de la mesa', fuente.includes(marcaDeLaRevision));
  /*
   * Desde la fase 4 el efecto no suelta a mano: llama a `soltarTodo`, que es lo que también
   * llama recoger la mesa. Así que lo que hay que mirar es el efecto Y la función, porque
   * una cuenta de cámara escondida en cualquiera de los dos movería la vista igual.
   */
  const hastaLaRevision = fuente.slice(0, fuente.indexOf(marcaDeLaRevision));
  const alCambiarLaRevision =
    hastaLaRevision.slice(hastaLaRevision.lastIndexOf('useEffect(')) +
    (/const soltarTodo = useCallback\([\s\S]*?\n {2}\}, \[\]\);/.exec(fuente)?.[0] ?? '');
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
  /*
   * `conElEstiajePorMover`: además, la partida se queda en el instante siguiente a un
   * siete, que es el único momento en que las caras del tablero llevan `toque`. Es un
   * estado que en la mesa se alcanza tirando los dados; aquí se declara, porque lo que
   * este fichero mira no es la regla —eso es `verify:riberas`— sino qué se OYE al
   * pintarlo.
   */
  /*
   * `descartando`: además, la partida se queda en el momento del descarte, con NUEVE
   * fichas en mi mano y cuatro por tirar. Es un estado que en la mesa se alcanza sacando
   * un siete con la mano llena; aquí se declara, porque lo que este fichero mira no es la
   * regla —eso es `verify:riberas`— sino que los botones lleguen a la pantalla.
   */
  /*
   * `elPregon`: además, la mesa se queda en el turno del SEGUNDO, con dos propuestas vivas
   * dirigidas a mí y tres tratos ya cerrados. Es un estado que en la mesa se alcanza jugando
   * dos OFRECER en el turno de otro; aquí se declara, como el estiaje y el descarte, porque lo
   * que este fichero mira no es la regla —eso lo juega `verify:riberas-en-tres` jugándolo por
   * el árbitro— sino que las tiras lleguen a la pantalla. Y a mi almacén se le quita el JUNCO,
   * que es lo que hace que una de las dos no se pueda aceptar: sin eso, la rama de «no tienes
   * con qué pagarlo» no se pintaría nunca y no se mediría.
   */
  /*
   * `victimasJuntas`: además, DOS colonos distintos tienen choza alrededor de la MISMA isla.
   *
   * Hace falta porque el reparto de arriba —una choza por colono, en tres hexágonos
   * separados— no produce ni una isla con dos víctimas, y entonces el juego emite DIECIOCHO
   * destinos del estiaje: uno por isla. La partida de verdad emitió VEINTE, porque en una mesa
   * jugada las chozas se acaban tocando, y esas dos de más son las que sólo se distinguen por
   * A QUIÉN le robas — o sea el caso que el carril tiene que poder pintar distinto y el único
   * que no salía nunca de este escenario. Un comprobador que sólo ve el caso fácil no dice
   * nada del difícil.
   */
  /*
   * `misPropuestas`: además, la mesa se queda en MI turno con TRES ofertas mías en pie y dos
   * tratos ya cerrados, y ni una dirigida a mí.
   *
   * Es el estado en el que se vio el agujero jugando: el pregón es opaco, crece con las
   * propuestas propias y en el turno de uno llegaba al 44 % de arriba del tablero, justo
   * encima de los anillos de fundar. Es el reverso exacto de `elPregon` —allí las vivas son
   * PARA mí y aquí son MÍAS—, y es el único escenario en el que `elPregonSePliega` dice que
   * sí. Sin él, el pliegue sólo se podría comprobar leyendo el fuente.
   */
  /*
   * `cuatroVivas`: como `misPropuestas`, pero con la CUARTA puesta, o sea con el tope de
   * `PROPUESTAS_VIVAS_A_LA_VEZ` alcanzado.
   *
   * Es el único estado en el que el botón que ABRE el componedor se apaga —los demás apagan
   * «Proponer», que está dentro—, y es justo el que el §3.2 del trueque quiere que se lea sin
   * abrir nada: el pregón se recorta en los lienzos bajos y el botón de la cinta no. Con tres
   * vivas no se distingue del caso corriente, así que sin esta cuarta la regla no se mide.
   */
  { empateDelVado = false, conElEstiajePorMover = false, descartando = false, elPregon = false, misPropuestas = false, cuatroVivas = false, victimasJuntas = false }: { empateDelVado?: boolean; conElEstiajePorMover?: boolean; descartando?: boolean; elPregon?: boolean; misPropuestas?: boolean; cuatroVivas?: boolean; victimasJuntas?: boolean } = {},
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
  const conElVado: EstadoDeRiberas = empateDelVado ? { ...yoTambienLlego, vado: recalcularElVado(yoTambienLlego) } : conDueno;
  /*
   * LAS DOS VÍCTIMAS EN LA MISMA ISLA: al segundo se le pone una choza en un vértice de la
   * comarca del tercero, y al tercero en uno de la del segundo. Con eso las islas (0,0) y
   * (2,0) tienen DOS colonos con pieza alrededor y ninguno soy yo, que son las tres
   * condiciones que `opcionesDelEstiaje` pide para emitir una opción por víctima.
   *
   * Los dos ya llevan bienes en el almacén por el reparto de arriba, que es la tercera
   * condición: a quien no le queda nada no se le puede robar y la isla volvería a emitir una
   * sola opción.
   */
  const conVecinos: EstadoDeRiberas = victimasJuntas
    ? {
        ...conElVado,
        colonos: conElVado.colonos.map((c, i) =>
          i === 1
            ? { ...c, chozas: [...c.chozas, verticeDeHex({ q: 2, r: 0 }, 2)] }
            : i === 2
              ? { ...c, chozas: [...c.chozas, verticeDeHex({ q: 0, r: 0 }, 2)] }
              : c,
        ),
      }
    : conElVado;
  const conElEstiaje: EstadoDeRiberas = conElEstiajePorMover
    ? { ...conVecinos, ultimaTirada: 7, estiajePorMover: true }
    : conVecinos;
  /*
   * EL DESCARTE VA DESPUÉS DEL ESTIAJE Y NO EN SU LUGAR: al sacar un siete se encienden
   * las dos cosas, y el orden en que se juegan es éste —primero se tiran las fichas y
   * después se mueve la pieza—. Montarlo sin la bandera sería montar un estado que la
   * regla no produce nunca.
   */
  const conElPregon: EstadoDeRiberas = elPregon
    ? {
        ...conElEstiaje,
        turno: 1,
        siguienteTrato: 9,
        tratos: [
          { id: 't4', de: 's2', para: 's1', da: ['sal'], pide: ['grano'], rechazada: [], acepto: null, estado: 'rechazada' },
          { id: 't5', de: 's1', para: 's3', da: ['grano'], pide: ['piedra'], rechazada: [], acepto: null, estado: 'aceptada' },
          { id: 't6', de: 's3', para: 's2', da: ['limo'], pide: ['sal'], rechazada: [], acepto: null, estado: 'caducada' },
          { id: 't7', de: 's2', para: 's1', da: ['junco'], pide: ['limo'], rechazada: [], acepto: null, estado: 'propuesta' },
          { id: 't8', de: 's2', para: 's1', da: ['limo'], pide: ['junco'], rechazada: [], acepto: null, estado: 'propuesta' },
        ],
        colonos: conElEstiaje.colonos.map((c, i) =>
          i === 0 ? { ...c, almacen: fichasDe(['sal', 'piedra', 'grano', 'limo']) } : c,
        ),
      }
    : conElEstiaje;
  /*
   * Y EL REVERSO: MI turno, con lo vivo saliendo de mi asiento. `turno: 0` es el mío, las tres
   * `propuesta` van de `s1` a los otros dos y las dos cerradas son una mía y una entre otros
   * —la de terceros también cuenta como cerrada para mí, que es la mitad de la decisión 17—.
   */
  const conMisPropuestas: EstadoDeRiberas = misPropuestas || cuatroVivas
    ? {
        ...conElPregon,
        turno: 0,
        siguienteTrato: 9,
        tratos: [
          { id: 't4', de: 's2', para: 's3', da: ['sal'], pide: ['grano'], rechazada: [], acepto: null, estado: 'rechazada' },
          { id: 't5', de: 's1', para: 's3', da: ['grano'], pide: ['piedra'], rechazada: [], acepto: null, estado: 'aceptada' },
          { id: 't6', de: 's1', para: 's2', da: ['limo'], pide: ['sal'], rechazada: [], acepto: null, estado: 'propuesta' },
          { id: 't7', de: 's1', para: 's3', da: ['junco'], pide: ['limo'], rechazada: [], acepto: null, estado: 'propuesta' },
          { id: 't8', de: 's1', para: 's2', da: ['sal'], pide: ['junco'], rechazada: [], acepto: null, estado: 'propuesta' },
          /* Y la CUARTA, que es la que pone el tope y apaga el botón de abrir el componedor. */
          ...(cuatroVivas
            ? [
                {
                  id: 't9',
                  de: 's1',
                  para: null,
                  da: ['piedra'] as Bien[],
                  pide: ['limo'] as Bien[],
                  rechazada: [],
                  acepto: null,
                  estado: 'propuesta' as const,
                },
              ]
            : []),
        ],
      }
    : conElPregon;
  const estado: EstadoDeRiberas = descartando
    ? {
        ...conElEstiaje,
        momento: 'descartando',
        ultimaTirada: 7,
        estiajePorMover: true,
        descartes: [{ de: asientos[0] as string, faltan: 4 }],
        colonos: conElEstiaje.colonos.map((c, i) =>
          i === 0 ? { ...c, almacen: [...c.almacen, ...fichasDe(['junco', 'limo', 'sal', 'piedra'])] } : c,
        ),
      }
    : conMisPropuestas;
  const vista = proyectar(RIBERAS, estado, 's1', sentados);
  return { vista, opciones: opcionesDeArcade(RIBERAS, vista, 's1'), sentados };
}

/** La mesa puesta que necesita el pintor, con los asientos de un escenario. */
/**
 * `plazo` ES OPCIONAL Y POR OMISIÓN NO HAY NINGUNO, que es como estaba y como sigue estando
 * en los quince bloques que ya llamaban aquí. Se abre porque el RELOJ de la cinta sólo existe
 * cuando la mesa tiene plazo: sin este parámetro, la única forma de medir el reloj sería no
 * medirlo — y la mesa jugando sola es exactamente lo que pasó por no tenerlo.
 */
function mesaPuestaDe(
  sentados: readonly { asiento: string; nombre: string }[],
  vista: unknown,
  opciones: readonly Opcion[],
  plazo: { venceEn: number | null; terminada?: boolean } = { venceEn: null },
): MesaVista {
  return {
    codigo: 'QWXYZ',
    arcade: 'riberas',
    rev: 11,
    tic: 0,
    terminada: plazo.terminada === true,
    venceEn: plazo.venceEn,
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
  /*
   * ═══ QUIÉN ABRE EL MENÚ AHORA, QUE CAMBIÓ CON LA FASE 3 DEL ESTIAJE ═══
   *
   * Aquí el naipe que hacía preguntar era LA GUARDIA, porque ofrecía una jugada por
   * víctima. Desde que mueve el estiaje trae UNA sola —la isla se elige después, sobre el
   * tablero— así que se manda sin menú. El escenario necesita las dos cosas, y las dos se
   * piden por su nombre: una carta que pregunte (El Acaparamiento, con sus cinco bienes) y
   * la guardia, que ya no pregunta. Sin la primera, el menú de este paso no se abriría
   * nunca y media pantalla no se recorrería.
   */
  const laQuePregunta = cartas.find((c) => c.familia === 'acaparamiento' && c.sePuedeJugar);
  comprobar(
    'hay una carta que ofrece MÁS DE UNA jugada: hay que preguntar, y el menú se abre',
    laQuePregunta !== undefined && jugadasDeLaCarta(vista, opciones, laQuePregunta.id).length > 1,
    laQuePregunta === undefined ? null : jugadasDeLaCarta(vista, opciones, laQuePregunta.id).map((j) => j.rotulo),
  );
  const laGuardia = cartas.find((c) => c.familia === 'guardia' && c.sePuedeJugar);
  comprobar(
    'y la guardia trae UNA sola: mueve el estiaje, y la isla se elige después en el tablero',
    laGuardia !== undefined && jugadasDeLaCarta(vista, opciones, laGuardia.id).length === 1,
    laGuardia === undefined ? null : jugadasDeLaCarta(vista, opciones, laGuardia.id).map((j) => j.rotulo),
  );
  const elTitulo = cartas.find((c) => c.sePuedeRevelar);
  comprobar('y el título se puede revelar, que es la otra casilla', elTitulo !== undefined && revelarDe(opciones, elTitulo.id) !== null);
  comprobar('y con sal, piedra y grano se puede comprar', comprarEnTres(opciones) !== null);

  const puesta = mesaPuestaDe(sentados, vista, opciones);
  const html = renderToStaticMarkup(
    <RiberasEnTres manifiesto={riberas} mesa={unaMesa('dentro', puesta)} puesta={puesta} tablero={tablero} opciones={opciones} />,
  );
  /*
   * ═══ EL TEXTO DE LA PANTALLA, SIN LA LISTA DE APOYO, Y HAY QUE DECIR POR QUÉ ═══
   *
   * Lo que este bloque pregunta es qué se OFRECE, y lo pregunta por el rótulo de cada
   * opción: «esta jugada no sale además como botón». La lista `.riberas-solo-apoyo` que el
   * cartel de las cartas metió dentro del recuadro no ofrece nada —no tiene un solo botón
   * ni un solo movimiento: es el nombre de cada naipe y sus tres frases, para quien no
   * puede pasar el cursor por un lienzo—, pero NOMBRA las cartas, y el rótulo de jugar Las
   * Dos Veredas es exactamente «Las Dos Veredas». Buscando en el texto entero, esa
   * comprobación se ponía roja por una frase que no es un botón; buscando en el texto sin
   * ella, sigue comprando lo que compraba. La cuenta de botones de más abajo no cambia: ésa
   * va por `class="opcion-rotulo"`, que la lista no lleva.
   */
  const htmlSinLaListaDeApoyo = html.replace(/<ul class="riberas-solo-apoyo">[\s\S]*?<\/ul>/g, ' ');
  const texto = palabrasDe(htmlSinLaListaDeApoyo);

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
  /*
   * ═══ Y LOS BOTONES YA NO SE CUENTAN POR SU RÓTULO PINTADO: SE CUENTAN EN EL CARRIL ═══
   *
   * Esto contaba `class="opcion-rotulo"`, que es la anatomía de un `.opcion` con su rótulo y
   * su ayuda a la vista, y era lo correcto mientras esas opciones se pintaban EN FLUJO por
   * debajo del lienzo. Ya no: con el delta a pantalla completa debajo no hay sitio, y lo que
   * las ofrece es el CARRIL de la cinta, un cuadrado del suelo de toque por opción, dentro del
   * recuadro. Lo que la comprobación compra no cambia —ni una de más, ni una de menos—; lo
   * que cambia es dónde mirar, y se mira por la clase del botón del carril.
   */
  /*
   * ═══ Y HAY UN CUADRADO QUE NO ES DE NINGUNA OPCIÓN: LA PUERTA DEL TRUEQUE ═══
   *
   * Desde que el componedor vive en el lienzo, el carril lleva además el cuadrado que lo
   * abre. NO es una opción de la lista y no puede serlo: lo que el juego declara ahí es la
   * FORMA que admite —la marca `declaracion`— y mandada tal cual contesta «Eso no es un
   * trueque». Así que se cuenta aparte y se resta, y lo que se compra sigue siendo lo de
   * siempre: ni una opción de más ni una de menos.
   */
  const cuadradosDeLaPuerta = html.split('riberas-carril-puerta').length - 1;
  const botones = html.split('class="riberas-carril-opcion').length - 1;
  comprobar('salen como botón del carril exactamente las que no enseña ni el tablero ni ninguna de las dos manos ni la barra', botones - cuadradosDeLaPuerta === fuera.length, {
    botones,
    cuadradosDeLaPuerta,
    fuera: fuera.map((o) => o.id),
  });
  comprobar(
    'y el cuadrado que abre el componedor sale exactamente cuando el juego declara la puerta, y sale UNA vez',
    cuadradosDeLaPuerta === (puertaDelTrueque(opciones) === null ? 0 : 1),
    { cuadradosDeLaPuerta, puerta: puertaDelTrueque(opciones) },
  );
  /*
   * Y NINGUNO DE ELLOS ES UN `.opcion` EN FLUJO, que es la mitad que evita el fallo de verdad.
   * Un `.opcion` mide 238 puntos de ancho y 46,75 de alto porque lleva rótulo Y ayuda; con el
   * estiaje por mover son dieciocho, y dieciocho colgando debajo de un recuadro que ya vale la
   * ventana entera es una mesa parada. La copia con rótulo y ayuda sigue existiendo, pero
   * dentro del CAJÓN, que es donde hay ancho —y el cajón nace cerrado, así que aquí no sale—.
   */
  comprobar(
    'y ni uno solo sale como `.opcion` de 238 puntos en flujo: la lista con rótulo y ayuda se ha ido al cajón, que es donde hay ancho para leerla',
    !html.includes('class="opcion-rotulo"') && !html.includes('class="formulario"'),
    /<div class="formulario"[\s\S]{0,120}/.exec(html)?.[0] ?? null,
  );
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
  /*
   * Y EL MAZO SIGUE SIENDO EL MAZO, no un interruptor. Desde la fase 4 lo que se le pasa es
   * `mesaRecogida ? null : mazo`, que es EL MISMO OBJETO cuando la mesa está puesta y el
   * mismo `null` que en el respaldo cuando está recogida: en los dos casos «el botón
   * desaparece exactamente cuando el naipe se puede pulsar». Lo que sigue prohibido es un
   * `boolean` suelto o un filtro sin condición.
   */
  comprobar(
    'y el botón se quita con `opcionesFueraDeLaBarra` pasándole EL MAZO, no un interruptor suelto',
    /opcionesFueraDeLaBarra\(\s*opcionesFueraDeLaMano\(opcionesFueraDelTablero\(opciones\)\), mesaRecogida \? null : mazo\)/.test(
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
  /*
   * ═══ «TODO LO QUE OFRECIÓ EL JUEGO» YA NO ES TODO: HAY UNA QUE NO SE PULSA ═══
   *
   * La opción de puerta del trueque lleva la marca `declaracion` del contrato, y esa
   * marca significa exactamente «esto NO es un movimiento montado: no lo mandes». Su
   * carga son los límites de una FAMILIA —un tope y una lista de destinos— porque
   * enumerar esa familia serían 5.000 opciones y 1,14 MB de lista por cada lectura de la
   * mesa. Exigir que se pueda PULSAR sería exigir el botón muerto que se está evitando:
   * pulsado manda la declaración, recibe un motivo y no juega nada.
   *
   * Así que se excluye, y se excluye POR LA MARCA y no por su `id`: un convenio en el id
   * lo conoce quien lo escribió y nadie más. Y para que la exclusión no se coma nada de
   * tapadillo, las dos líneas de debajo dicen que la puerta está en la lista y que NO
   * está entre lo alcanzable, que es justo lo que se acaba de perdonar.
   */
  const laPuerta = opciones.filter((o) => o.declaracion === true);
  comprobar('el juego ofrece su puerta de trueque, o esto no estaría perdonando nada', laPuerta.length === 1, laPuerta.map((o) => o.id));
  comprobar(
    'y no se puede pulsar en ningún sitio, que es lo que la marca promete',
    laPuerta.every((o) => !alcanzables.has(canonico({ tipo: o.tipo, carga: o.carga }))),
  );
  comprobar(
    'y no se pierde ni una MÁS: todo lo demás sale por la barra, por su cuarto hueco, por una de las dos manos o por un botón',
    opciones
      .filter((o) => o.declaracion !== true)
      .every((o) => alcanzables.has(canonico({ tipo: o.tipo, carga: o.carga }))),
    opciones
      .filter((o) => o.declaracion !== true && !alcanzables.has(canonico({ tipo: o.tipo, carga: o.carga })))
      .map((o) => o.id),
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
    'y allí tampoco se pierde ni una: el retablo más sus botones sueltos cubren todo lo que se puede pulsar',
    (() => {
      const sueltas = opcionesSueltas(tableroDeCinco, cinco.opciones);
      const enElDibujo = new Set<string>();
      for (const c of tableroDeCinco.caras) if (c.toque !== null) enElDibujo.add(canonico({ tipo: c.toque.tipo, carga: c.toque.carga }));
      for (const l of tableroDeCinco.lineas) if (l.toque !== null) enElDibujo.add(canonico({ tipo: l.toque.tipo, carga: l.toque.carga }));
      for (const n of tableroDeCinco.nudos) if (n.toque !== null) enElDibujo.add(canonico({ tipo: n.toque.tipo, carga: n.toque.carga }));
      for (const a of tableroDeCinco.acciones) enElDibujo.add(canonico({ tipo: a.toque.tipo, carga: a.toque.carga }));
      const todo = new Set([...enElDibujo, ...sueltas.map((o) => canonico({ tipo: o.tipo, carga: o.carga }))]);
      return cinco.opciones
        .filter((o) => o.declaracion !== true)
        .every((o) => todo.has(canonico({ tipo: o.tipo, carga: o.carga })));
    })(),
  );

  /*
   * ═══ Y LA PUERTA DEL TRUEQUE NO SE PINTA AQUÍ, QUE ES DONDE MÁS DAÑO HARÍA ═══
   *
   * En una mesa de CINCO no hay tablero en tres dimensiones —el atlas trae cuatro
   * colores— así que ésta es la única pantalla que existe. La opción de puerta del
   * trueque lleva la marca `declaracion`, o sea que no es un movimiento montado: mandada
   * tal cual recibe un motivo y no juega nada. Pintarla como botón aquí sería encender un
   * botón que no responde en la única pantalla de media tabla de tamaños de mesa.
   *
   * Y hacen falta LAS DOS MITADES, porque cada una sola deja el fallo a medias:
   *
   *  · El juego no la baja a las `acciones` del tablero. Eso lo comprueba
   *    `verify:riberas`, y lo que hace por sí solo es MOVERLA DE SITIO: en cuanto deja
   *    de estar recogida en un `toque`, `opcionesSueltas` la cuenta como un movimiento
   *    que no se enseñó y se la manda al `Formulario` de «Y además puedes» de aquí abajo.
   *    El mismo botón muerto, una fila más abajo. Eso es lo que dice la primera línea de
   *    aquí, y está escrita para que nadie la «arregle» devolviéndola al tablero.
   *  · Y este mueble la filtra por la marca, dentro de `loQueSePuedePintar`, que es donde
   *    ya se decide qué se pinta. Eso es lo que dicen las dos de abajo.
   */
  /*
   * ═══ Y NO BASTA CON QUE EL BOTÓN NO SALGA: EL PANEL TAMPOCO PUEDE SALIR VACÍO ═══
   *
   * Medido en el banco, con cinco sentados y el turno en la mano: la puerta es la ÚNICA
   * opción que `opcionesSueltas` devuelve, y las guardas que deciden si se pinta el panel
   * «Y además puedes» contaban `opciones.length` ANTES del filtro por `declaracion` que vive
   * dentro de `loQueSePuedePintar`. Resultado: el panel se pintaba con CERO pintables y el
   * `Formulario` caía en su rama de vacío, o sea «Ahora mismo no hay nada que puedas hacer
   * en esta mesa» escrito debajo de cuarenta y ocho botones de trueque, un tablero lleno de
   * acciones y en TU turno. Es la mentira más cara de las cuatro pantallas, y no la cazaba
   * nadie: las dos comprobaciones de aquí abajo miran que el BOTÓN no se pinte, y el botón
   * no se pintaba.
   *
   * Se compra sobre el mismo HTML que ya se renderiza, y por la frase entera: la rama de
   * vacío del `Formulario` es la única de toda la pantalla que la escribe.
   */
  comprobar(
    'y el panel de «Y además puedes» no se pinta VACÍO: con el tablero lleno de botones, la pantalla no dice además que no hay nada que hacer',
    !textoDeCinco.includes('Ahora mismo no hay nada que puedas hacer'),
    {
      sueltas: opcionesSueltas(tableroDeCinco, cinco.opciones).map((o) => o.id),
      botonesDelTablero: tableroDeCinco.acciones.map((a) => a.rotulo),
    },
  );
  const puertaDeCinco = cinco.opciones.filter((o) => o.declaracion === true);
  comprobar('al de cinco se le ofrece su puerta de trueque, o esto no comprobaría nada', puertaDeCinco.length === 1, puertaDeCinco.map((o) => o.id));
  comprobar(
    'y `opcionesSueltas` SÍ se la manda al formulario de «Y además puedes», que es el camino de verdad',
    opcionesSueltas(tableroDeCinco, cinco.opciones).some((o) => o.declaracion === true),
  );
  /*
   * ═══ Y AQUÍ ESTE BLOQUE CAMBIÓ DE FORMA, PORQUE EL RÓTULO YA SÍ SALE ═══
   *
   * Esto decía «su rótulo no sale por ninguna parte de la pantalla», y era verdad mientras
   * no existiera el componedor: la puerta era una opción que nadie sabía leer. Desde que
   * esta pantalla la lee, «Proponer un trueque» SÍ se pinta —lo pinta el componedor, que
   * saca el rótulo de `puertaDelTrueque` y no de `acciones` ni del `Formulario`—, así que
   * la afirmación de antes se pondría roja por el motivo contrario al que la escribió.
   *
   * Lo que se compra ahora es más fuerte y no menos: sale EXACTAMENTE UNA VEZ, y la vez que
   * sale es la del componedor. Con eso siguen rojas las dos roturas de antes —devolver la
   * puerta a `acciones` o quitar el filtro de `loQueSePuedePintar` la pintan DOS veces— y
   * además se cae si el componedor deja de pintarla, que es el fallo nuevo que esta fase
   * puede tener.
   */
  const rotuloDeLaPuerta = (puertaDeCinco[0] as { rotulo: string }).rotulo;
  comprobar(
    'y su rótulo sale EXACTAMENTE UNA VEZ en la pantalla: ni el formulario ni el tablero lo pintan además',
    textoDeCinco.split(rotuloDeLaPuerta).length - 1 === 1,
    { rotulo: rotuloDeLaPuerta, veces: textoDeCinco.split(rotuloDeLaPuerta).length - 1 },
  );
  const elComponedorPintado = /<section class="panel riberas-componedor">([\s\S]*?)<\/section>/.exec(htmlDeCinco)?.[1] ?? '';
  comprobar(
    'y la vez que sale es la del COMPONEDOR, que lo saca de la declaración y no de la lista de botones',
    elComponedorPintado.includes(rotuloDeLaPuerta) &&
      !palabrasDe(htmlDeCinco.split('<section class="panel riberas-componedor">')[0] ?? '').includes(rotuloDeLaPuerta),
    elComponedorPintado.slice(0, 200),
  );
  comprobar(
    'y `loQueSePuedePintar` tampoco la deja pasar, que es donde vive el filtro',
    !loQueSePuedePintar(cinco.opciones).some((p) => p.rotulo === (puertaDeCinco[0] as { rotulo: string }).rotulo),
    loQueSePuedePintar(cinco.opciones).map((p) => p.rotulo),
  );
  comprobar(
    'y lo demás sí lo deja pasar: el filtro es por la marca y no por el tipo del movimiento',
    loQueSePuedePintar(cinco.opciones).length === cinco.opciones.length - 1,
    { pintables: loQueSePuedePintar(cinco.opciones).length, ofrecidas: cinco.opciones.length },
  );

  /*
   * ═══ Y EL DESCARTE, QUE EN ESTA MESA NO TIENE OTRA PANTALLA ═══
   *
   * Con cinco colonos el retablo es lo único que hay, así que un descarte que no saliera
   * aquí no se podría hacer en toda la tarde: la mesa se quedaría esperando a alguien que
   * ve la pantalla vacía. Y no es un caso raro —ocurre en cada siete que pilla a alguien
   * con más de siete fichas—, pero es de los que nadie abre para mirar.
   *
   * Lo que se compra aquí es de ESTE cliente y no de la regla: que los cinco botones
   * lleguen renderizados con su rótulo, que el aviso diga cuántas quedan, y que mientras
   * dura no haya NADA tocable sobre el dibujo —que es lo que hace que el único camino sea
   * el botón—.
   */
  paso('Y en esa misma mesa, el descarte de un siete se puede pulsar');

  const tirando = laProyeccionConMazo(5, { descartando: true });
  const tableroDelDescarte = tableroDeLaVista(tirando.vista);
  comprobar('la mesa que descarta trae tablero declarado', tableroDelDescarte !== null);
  if (tableroDelDescarte === null) return;
  const aTirar = tirando.opciones.filter((o) => o.tipo === 'riberas:descartar');
  comprobar('el juego ofrece tirar fichas, o esto no comprobaría nada', aTirar.length > 0, aTirar.map((o) => o.id));
  comprobar(
    'y mientras se descarta no hay NADA tocable sobre el dibujo: el botón es el único camino',
    tableroDelDescarte.caras.every((c) => c.toque === null) &&
      tableroDelDescarte.lineas.every((l) => l.toque === null) &&
      tableroDelDescarte.nudos.every((n) => n.toque === null),
  );

  /*
   * Y SALEN DEL TABLERO DECLARADO, no de la lista suelta que este cliente pinta además.
   * La diferencia no se ve en pantalla y decide otra cosa: quien juega a ciegas —el bucle
   * de `verify:mesa`, y mañana el jugador de la fase 5— lee las cuatro listas del tablero
   * y nunca la lista de opciones. Un descarte que sólo saliera por la puerta del cliente
   * se vería bien aquí y dejaría la mesa parada allí.
   */
  comprobar(
    'y salen del TABLERO, que es lo único que lee quien juega a ciegas',
    tableroDelDescarte.acciones.length === aTirar.length &&
      tableroDelDescarte.acciones.every((a) => a.toque.tipo === 'riberas:descartar'),
    tableroDelDescarte.acciones.map((a) => a.id),
  );

  const puestaDelDescarte = mesaPuestaDe(tirando.sentados, tirando.vista, tirando.opciones);
  const htmlDelDescarte = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', puestaDelDescarte)}
      puesta={puestaDelDescarte}
      tablero={tableroDelDescarte}
      opciones={tirando.opciones}
    />,
  );
  const textoDelDescarte = palabrasDe(htmlDelDescarte);
  for (const o of aTirar) {
    comprobar(`sobre el retablo, «${o.rotulo}» sale como botón y se puede pulsar`, textoDelDescarte.includes(o.rotulo), o.id);
  }
  comprobar('y el aviso dice cuántas quedan por tirar', textoDelDescarte.includes(tableroDelDescarte.aviso), tableroDelDescarte.aviso);
  comprobar(
    'y tampoco aquí se pierde ni una: entre el dibujo y los botones están todas',
    (() => {
      const sueltas = opcionesSueltas(tableroDelDescarte, tirando.opciones);
      const enElDibujo = new Set<string>();
      for (const a of tableroDelDescarte.acciones) enElDibujo.add(canonico({ tipo: a.toque.tipo, carga: a.toque.carga }));
      const todo = new Set([...enElDibujo, ...sueltas.map((o) => canonico({ tipo: o.tipo, carga: o.carga }))]);
      return tirando.opciones.every((o) => todo.has(canonico({ tipo: o.tipo, carga: o.carga })));
    })(),
  );
  /*
   * LA VACUNA: la misma mesa un instante antes —sin descartar— NO tiene esos rótulos.
   * Sin ella, «sale como botón» se cumpliría igual si el retablo pintara siempre todo lo
   * que le llega, que es lo que no se está comprobando.
   */
  comprobar(
    'se ve fallar: en un turno normal esos botones no están',
    aTirar.every((o) => !textoDeCinco.includes(o.rotulo)),
    aTirar.map((o) => o.rotulo),
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
   *
   * ═══ Y ESE «SIN COMENTARIOS» SE FILTRABA POR LÍNEAS, QUE NO ES LO MISMO ═══
   *
   * Esto quitaba las líneas que EMPIEZAN por `*`, `//`, `/*` o `{/*`, y un comentario de
   * JSX no es así: `{/* … *\/}` reparte su texto por renglones corrientes. Con el marcador
   * del raíl estrenando un comentario que explica qué se lee en el segundo renglón de la
   * ficha —y que para explicarlo tiene que escribir la frase—, esta comprobación se puso
   * ROJA con la frase saliendo de `renglonDelVado` exactamente como tiene que salir. Se
   * quitan los bloques enteros: ver `sinComentarios`, arriba del todo.
   */
  const codigoDelCliente = sinComentarios(fuente);
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
  /*
   * SOLTARLO TODO TIENE UN NOMBRE, Y LOS DOS SITIOS QUE SUELTAN LLAMAN AL MISMO.
   *
   * Esta pantalla no lo tenía: el cambio de revisión soltaba con cuatro llamadas escritas a
   * mano. Desde que recoger la mesa también suelta, son DOS sitios que tienen que soltar lo
   * mismo, y dos listas iguales escritas aparte se separan el día que llegue un quinto
   * estado que se pueda tener en la mano. Se exige el nombre, sus cuatro llamadas —incluida
   * la del naipe, que pudo jugarlo otro mientras estaba levantado, y la de `preguntando`,
   * que es una pregunta SOBRE lo que se soltaba— y que el efecto de la revisión no haga
   * otra cosa que llamarlo.
   */
  const soltarTodoDelCliente = /const soltarTodo = useCallback\([\s\S]*?\n {2}\}, \[\]\);/.exec(fuente)?.[0] ?? '';
  comprobar(
    'el escritorio tiene un `soltarTodo` con las cuatro: la pieza, el bien, el naipe y la pregunta abierta',
    soltarTodoDelCliente.includes('ponerTomada(null)') &&
      soltarTodoDelCliente.includes('ponerCogida(null)') &&
      soltarTodoDelCliente.includes('ponerCartaDelMazo(null)') &&
      soltarTodoDelCliente.includes('ponerPreguntando(null)'),
    soltarTodoDelCliente.slice(0, 300),
  );
  comprobar(
    'y al cambiar la revisión se suelta POR AHÍ, no con cuatro llamadas escritas otra vez',
    /useEffect\(\(\) => \{\s*soltarTodo\(\);\s*\}, \[puesta\.rev, soltarTodo\]\);/.test(fuente),
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

/**
 * LOS DADOS LLEGAN EN SU FICHERO Y SU FALLO NO TIRA EL TABLERO.
 *
 * `dados.glb` es el D6 de KayKit horneado, unos kB, y se pide a la vez que el tablero por
 * la misma puerta (`rutaDeLosDados`, no una cadena escrita aquí). Lo que se rompe en
 * silencio es la RED: un `Promise.all` a secas sobre las dos peticiones convierte un
 * despliegue sin `dados.glb` en una Sala sin tablero, cuando la escena sabe pintar los
 * dados del respaldo si el catálogo no trae `dado`. Se lee el fuente porque la carga vive
 * en un efecto que en Node no corre, y se exige la forma exacta: la promesa de los dados
 * con su propio `.catch` que resuelve a `null` ANTES del `Promise.all`, cada fichero con
 * su promesa recordada por separado, y los dos catálogos unidos con `unirCatalogos`.
 */
function losDadosLleganAparte(): void {
  paso('Los dados llegan en su fichero, a la vez que el tablero, y su fallo no lo tira');

  const fuente = readFileSync(new URL('../src/riberas-en-tres.tsx', import.meta.url), 'utf8');
  const codigo = fuente
    .split('\n')
    .filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l))
    .join('\n');
  comprobar(
    'los dados se piden por `rutaDeLosDados()` de `escenas/ruta-de-modelos.ts`, no por una cadena escrita aquí',
    /const RUTA_DE_LOS_DADOS = rutaDeLosDados\(\);/.test(fuente) &&
      /import \{[^}]*rutaDeLosDados[^}]*\} from '\.\.\/\.\.\/escenas\/ruta-de-modelos'/.test(fuente) &&
      !/dados\.glb/.test(codigo),
  );
  comprobar(
    'cada fichero tiene su promesa recordada por separado: el tablero que llegó no se vuelve a bajar por unos dados que no',
    /const traerElTablero = recordada\(\(\) => traerUnGlb\(RUTA_DEL_TABLERO\)\);/.test(fuente) &&
      /const traerLosDados = recordada\(\(\) => traerUnGlb\(RUTA_DE_LOS_DADOS\)\);/.test(fuente),
  );
  comprobar(
    'y el fallo de los dados no tira el tablero: su promesa lleva `.catch` a `null` antes del `Promise.all`, y los catálogos se unen',
    /const dados = traerLosDados\(\)\.catch\(\(fallo: unknown\): null => \{[\s\S]{0,300}?return null;[\s\S]{0,40}?\}\);/.test(fuente) &&
      /Promise\.all\(\[tablero, dados\]\)\.then\(\(\[delTablero, deLosDados\]\) => unirCatalogos\(delTablero, deLosDados\)\)/.test(fuente) &&
      !/Promise\.all\(\[[^\]]*(traerUnGlb|traerLosDados\(\)[^.])/.test(fuente),
    'con `Promise.all` a secas, un 404 de `dados.glb` deja la Sala sin tablero',
  );
}

/**
 * LOS DADOS EN LA PANTALLA: sólo donde caben, con la misma pregunta que la escena, y el
 * botón de tirar se va exactamente donde ellos están.
 *
 * Se lee el fuente porque el lienzo en Node mide cero y todo cae en «sin dados»: lo que hay
 * que impedir es que la pantalla decida el sitio con OTRA función o con OTRA medida que la
 * escena (entonces habría lienzos con dados y botón, o sin ninguno de los dos), que filtre
 * TIRAR antes de preguntar a `dadosEnTres` (`porTirar` siempre falso, los dados no vibran
 * nunca), que `quieto` no los apague, que el toque no devuelva a la escena cómo acabó, o que
 * tirar quede sólo al alcance del ratón.
 */
function losDadosEnLaPantalla(): void {
  paso('Los dados en la pantalla: donde caben, el botón de tirar se va con ellos, y el toque vuelve con su resultado');

  const fuente = readFileSync(new URL('../src/riberas-en-tres.tsx', import.meta.url), 'utf8');
  const hoja = readFileSync(new URL('../src/estilo.css', import.meta.url), 'utf8');
  const codigo = fuente
    .split('\n')
    .filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l))
    .join('\n');
  comprobar(
    'el sitio de los dados se decide con `huecosDeLaMesa` de `escenas/barra.ts` (la misma función que la escena) con el campo de 45° del Canvas y el alto del lienzo EN PUNTOS',
    /import \{[^}]*\bhuecosDeLaMesa\b[^}]*\} from '\.\.\/\.\.\/escenas\/barra';/.test(fuente) &&
      /const CAMPO_DE_LA_CAMARA = \(45 \* Math\.PI\) \/ 180;/.test(codigo) &&
      /fov: 45/.test(codigo) &&
      /huecosDeLaMesa\(cuantos, CAMPO_DE_LA_CAMARA, lienzo\.ancho \/ lienzo\.alto, lienzo\.alto\)\.dados !== null/.test(codigo),
  );
  comprobar(
    'y cuenta los huecos EXACTAMENTE como la escena (las piezas más el mazo si lo hay) y mide el recuadro del lienzo con un ResizeObserver',
    /const cuantos = barra\.length \+ \(mazo === null \? 0 : 1\);/.test(codigo) &&
      /new ResizeObserver\(mide\)/.test(codigo) &&
      /ref=\{medirElRecuadro\}/.test(codigo),
  );
  comprobar(
    'sin sitio no hay dados (`null`, no apagados); con sitio salen de `dadosEnTres` con las opciones ENTERAS y `quieto` sólo los apaga',
    /if \(!haySitioParaLosDados\) return null;\s+const suyos = dadosEnTres\(vista, yo, opciones\);\s+return suyos === null \|\| !quieto \? suyos : \{ \.\.\.suyos, disponible: false \};/.test(codigo),
  );
  comprobar(
    'TIRAR se cae de los botones con `opcionesFueraDeLaMesa` pasándole LOS DADOS (no un interruptor) y DESPUÉS de los tres filtros de siempre, y el pregón cierra la cadena con el cuarto',
    /opcionesFueraDelPregon\(opcionesFueraDeLaMesa\(fueraDeLaBarra, mesaRecogida \? null : dados\), pregon\)/.test(codigo.replace(/\s+/g, ' ')) &&
      /const fueraDeLaBarra = useMemo\(\s+\(\) => opcionesFueraDeLaBarra\(opcionesFueraDeLaMano\(opcionesFueraDelTablero\(opciones\)\), mesaRecogida \? null : mazo\)/.test(codigo),
  );
  comprobar(
    'la escena recibe `dados={dados}` y `onPulsarLosDados={alPulsarLosDados}`',
    /<Delta[\s\S]*?dados=\{dados\}\s+onPulsarLosDados=\{alPulsarLosDados\}[\s\S]*?\/>/.test(fuente),
  );
  const manejador = /const alPulsarLosDados = useCallback\(\(\): Promise<ResultadoDelMovimiento> => \{([\s\S]*?)\n  \}, \[/.exec(codigo)?.[1] ?? '';
  comprobar(
    'al pulsar el asa se manda la opción TIRAR que dio el juego (`tirarEnTres`) por `mover` y se DEVUELVE su promesa; sin opción o con la mesa quieta se contesta `rechazado` sin mandar nada',
    manejador.length > 0 &&
      /if \(quieto\) return Promise\.resolve\('rechazado'\);/.test(manejador) &&
      /const tirar = tirarEnTres\(opciones\);\s+if \(tirar === null\) return Promise\.resolve\('rechazado'\);/.test(manejador) &&
      /return mover\(\{ tipo: tirar\.tipo, carga: tirar\.carga \}\);/.test(manejador) &&
      !/tipo: '/.test(manejador),
  );
  comprobar(
    'y tirar sigue al alcance de las tecnologías de apoyo: un botón fuera de la vista, dentro del recuadro, que sólo manda si los dados están disponibles, con su regla en la hoja',
    /\{dados !== null \? \(\s+<button\s+type="button"\s+className="riberas-solo-apoyo"\s+aria-disabled=\{!dados\.disponible\}\s+onClick=\{\(\) => \{\s+if \(dados\.disponible\) void alPulsarLosDados\(\);\s+\}\}\s*>\s+Tirar los dados\s+<\/button>/.test(codigo) &&
      /\.riberas-solo-apoyo \{[\s\S]*?clip-path: inset\(50%\);[\s\S]*?\}/.test(hoja) &&
      !/\.riberas-solo-apoyo \{[^}]*display: none/.test(hoja),
  );
  /*
   * El botón existe mientras existen los dados, no sólo mientras se puede tirar: al pulsarlo
   * `mover` pone `quieto`, `disponible` cae a falso, y un botón que se desmonta con el foco
   * dentro manda el foco al body. Y se apaga con `aria-disabled`, no con `disabled`: un botón
   * `disabled` deja de ser enfocable y el navegador le quita el foco igual.
   *
   * ═══ Y POR QUÉ AQUÍ SE CUENTAN BOTONES Y NO USOS DE LA CLASE ═══
   *
   * Esto exigía que `className="riberas-solo-apoyo"` saliera EXACTAMENTE una vez, y lo que
   * quería decir era «hay un solo botón de tirar»: dos botones iguales son dos puertas al
   * mismo movimiento, que es la regla que este fichero entero vigila. La clase, en cambio,
   * es la de «fuera de la vista pero en el árbol» y la usa todo lo que hay que oír sin ver
   * el lienzo — desde el cartel de las cartas, la lista de las once explicaciones también.
   * Contada así, la comprobación se ponía roja por una lista de texto que no ofrece ningún
   * movimiento, y arreglarla habría sido borrar el guardia del botón. Se cuenta el BOTÓN.
   */
  const alrededorDelBoton = codigo.slice(codigo.indexOf('className="riberas-solo-apoyo"') - 200, codigo.indexOf('className="riberas-solo-apoyo"') + 300);
  comprobar(
    'su existencia no depende de `disponible`: se monta con `dados !== null`, se apaga con `aria-disabled` y nunca lleva `disabled`, para que el foco no caiga al body al tirar',
    !/dados !== null && dados\.disponible \? \(/.test(codigo) &&
      !/dados\.disponible \? \(/.test(alrededorDelBoton) &&
      !/\sdisabled=/.test(alrededorDelBoton) &&
      /aria-disabled=\{!dados\.disponible\}/.test(alrededorDelBoton) &&
      (codigo.match(/<button\s+type="button"\s+className="riberas-solo-apoyo"/g) ?? []).length === 1,
  );
}

/**
 * RECOGER LA MESA EN EL ESCRITORIO (§6 del diseño, fase 4).
 *
 * ═══ LO QUE ESTO IMPIDE, QUE SON CUATRO PARTIDAS ROTAS EN SILENCIO ═══
 *
 *   1. LA PARTIDA PARADA. Con la mesa recogida no hay dados que pulsar ni naipe del mazo, y
 *      `opcionesFueraDeLaMesa` / `opcionesFueraDeLaBarra` los siguen quitando de los botones
 *      mientras la escena los reciba. El §6 deja recoger la mesa EN MI PROPIO TURNO y la
 *      deja recogida hasta que yo diga: sin devolver TIRAR y COMPRAR al pie, quien recoja
 *      antes de tirar se queda sin poder tirar y sin ningún error en ninguna parte.
 *   2. LAS PIEZAS QUE SE MUEVEN AL RECOGER. La misma tentación arreglaría lo de arriba
 *      pasándole `null` a `<Delta>`, y ésas son las llaves del reparto (`dados !== null` el
 *      quinto hueco, `mazo` el cuarto): la barra se repartiría de otra manera al bajar y
 *      volvería distinta al subir.
 *   3. LA CARTA QUE SE QUEDA PEGADA AL CURSOR con la barra fuera de la pantalla, sin nada
 *      debajo donde soltarla.
 *   4. LA MESA QUE SUBE A MITAD DE ARRASTRE. La vuelta sola al pasar a tocarme tiene que
 *      esperar a que la mano quede vacía, o cambia lo que hay bajo el cursor a mitad de
 *      gesto.
 *
 * Se lee el fuente y la hoja porque todo esto vive dentro del `Canvas` o encima de él, y en
 * Node no hay `Canvas`; el aspecto se mira en el banco.
 */
function recogerLaMesa(): void {
  paso('Recoger la mesa: suelta lo cogido, devuelve tirar y comprar al pie, y vuelve sola al tocarme salvo con algo en la mano');

  const fuente = readFileSync(new URL('../src/riberas-en-tres.tsx', import.meta.url), 'utf8');
  const hoja = readFileSync(new URL('../src/estilo.css', import.meta.url), 'utf8');
  const codigo = fuente
    .split('\n')
    .filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l))
    .join('\n');

  comprobar(
    'el estado vive en la pantalla y no se guarda: un `useState` a secas, y `<Delta>` lo recibe entero',
    /const \[mesaRecogida, ponerMesaRecogida\] = useState\(false\);/.test(codigo) &&
      /<Delta[\s\S]*?mesaRecogida=\{mesaRecogida\}/.test(fuente) &&
      !/mesaRecogida/.test(codigo.slice(0, codigo.indexOf('const [mesaRecogida'))),
  );
  comprobar(
    'recoger SUELTA lo cogido —por el mismo `soltarTodo` que el cambio de revisión— y sacar no suelta nada',
    /const alRecogerLaMesa = useCallback\(\(\) => \{\s*if \(!mesaRecogida\) soltarTodo\(\);\s*ponerMesaRecogida\(!mesaRecogida\);\s*\}, \[mesaRecogida, soltarTodo\]\);/.test(codigo),
  );
  /*
   * TIRAR Y COMPRAR VUELVEN AL PIE, y a `<Delta>` le siguen llegando enteros. Las dos
   * mitades se compran juntas a propósito: cada una sin la otra es uno de los dos fallos.
   */
  comprobar(
    'con la mesa recogida, TIRAR y COMPRAR vuelven a los botones: la cinta se compone con `null` en los dos filtros que la mesa se lleva',
    /opcionesFueraDeLaMesa\(fueraDeLaBarra, mesaRecogida \? null : dados\)/.test(codigo) &&
      /opcionesFueraDeLaBarra\(opcionesFueraDeLaMano\(opcionesFueraDelTablero\(opciones\)\), mesaRecogida \? null : mazo\)/.test(codigo),
  );
  comprobar(
    'y la ESCENA sigue recibiendo `dados` y `mazo` sin tocar: son la llave del quinto y del cuarto hueco, y con `null` las piezas se moverían al recoger',
    /<Delta[\s\S]*?mazo=\{mazo\}[\s\S]*?dados=\{dados\}[\s\S]*?\/>/.test(fuente) &&
      !/<Delta[\s\S]*?(dados|mazo)=\{mesaRecogida/.test(fuente),
  );
  /*
   * LA VUELTA SOLA ES EL FLANCO Y NO EL VALOR. Con el valor, recoger la mesa en mi propio
   * turno la sacaría en el render siguiente y no habría manera de mirar el tablero mientras
   * me toca; o sea, la mitad de para lo que sirve recogerla.
   */
  const laVuelta = /const meTocaAhora = meToca\(vista\);[\s\S]*?\}, \[meTocaAhora, cogida, cartaDelMazo\]\);/.exec(codigo)?.[0] ?? '';
  comprobar(
    'la mesa sale sola cuando `meToca` pasa de falso a verdadero (el FLANCO, con `meToca` de shared) y no cada vez que me toca',
    laVuelta.length > 0 &&
      /if \(meTocaAhora && !meTocabaAntes\.current\) laSalidaEspera\.current = true;/.test(laVuelta) &&
      /meTocabaAntes\.current = meTocaAhora;/.test(laVuelta) &&
      /import \{[\s\S]*?\bmeToca,/.test(fuente),
    laVuelta.slice(0, 300),
  );
  comprobar(
    'y con una carta en la mano —el bien o el naipe— la salida ESPERA: una mesa que sube bajo un arrastre cambia lo que hay bajo el cursor a mitad de gesto',
    /if \(cogida !== null \|\| cartaDelMazo !== null\) return;\s*laSalidaEspera\.current = false;\s*ponerMesaRecogida\(false\);/.test(laVuelta),
    laVuelta.slice(-300),
  );
  /*
   * EL BOTÓN. Fuera del `Canvas`, ARRIBA A LA DERECHA y debajo del de volver, cuadrado de
   * 44 con 12 de margen y con su mismo cromo.
   *
   * ═══ POR QUÉ NO ESTÁ ABAJO, QUE ES DONDE ESTUVO ═══
   *
   * Porque abajo se comía una esquina del asa de la choza y nadie lo veía. El sitio se
   * había medido tratando el asa como un rectángulo en el plano de la barra —canto
   * izquierdo en 48 puntos en 320×360— y el asa es una caja de 0,8 lados de fondo girada
   * 39,6°: su cara cercana se proyecta a 41,2. Y no es cosa de la esquina izquierda: la
   * barra está centrada, así que deja los mismos 41,2 puntos a los dos lados y un botón de
   * 44 no cabe en ninguna de las dos. `verify:escena` mide la silueta proyectada de todas
   * las asas contra el cuadrado del mando en los quince lienzos; aquí sólo se compra que la
   * hoja de estilo diga los mismos tres números que `MANDO_DE_RECOGER` (`escenas/mesa.ts`),
   * en rem, porque un botón medido allí y colocado con otros números aquí no está medido.
   */
  const enRem = (puntos: number): string => `${String(puntos / 16)}rem`;
  comprobar(
    'el botón de recoger existe sólo donde hay mesa que recoger (la misma condición con la que `<Delta>` monta la barra) y dice qué hace con todas sus letras',
    /\{barra\.length > 0 \|\| mazo !== null \? \(\s*<button[\s\S]*?className="riberas-recoger"[\s\S]*?onClick=\{alRecogerLaMesa\}[\s\S]*?aria-label=\{mesaRecogida \? SACAR_LA_MESA : RECOGER_LA_MESA\}/.test(codigo) &&
      /const RECOGER_LA_MESA = 'Recoger la mesa';/.test(fuente) &&
      /const SACAR_LA_MESA = 'Sacar la mesa';/.test(fuente),
  );
  const reglaDelRecoger = /\.riberas-recoger\s*\{([^}]*)\}/.exec(hoja)?.[1] ?? '';
  const reglaDelVolverEnTres = /\.riberas-volver\s*\{([^}]*)\}/.exec(hoja)?.[1] ?? '';
  comprobar(
    'y está arriba a la derecha, cuadrado del lado que dice `MANDO_DE_RECOGER` (2,75rem) con su margen (0,75rem) y bajado su `bajoElOtroMando` entero (a 4rem), con el cromo de `.riberas-volver`: teja alta, filo en reposo y acento al pasar el ratón',
    reglaDelRecoger.includes(`top: ${enRem(MANDO_DE_RECOGER.margen + MANDO_DE_RECOGER.bajoElOtroMando)};`) &&
      reglaDelRecoger.includes(`right: ${enRem(MANDO_DE_RECOGER.margen)};`) &&
      reglaDelRecoger.includes(`width: ${enRem(MANDO_DE_RECOGER.lado)};`) &&
      reglaDelRecoger.includes(`height: ${enRem(MANDO_DE_RECOGER.lado)};`) &&
      !/bottom:|left:/.test(reglaDelRecoger) &&
      /background: var\(--teja-alta\);/.test(reglaDelRecoger) &&
      /border: 1px solid var\(--filo\);/.test(reglaDelRecoger) &&
      /\.riberas-recoger:hover \{[\s\S]*?border-color: var\(--acento\);[\s\S]*?\}/.test(hoja),
    reglaDelRecoger.replace(/\s+/g, ' ').slice(0, 200),
  );
  /*
   * Y QUE LOS DOS NO SE SOLAPEN NO SE MIDE EN PÍXELES DE RÓTULO: se apilan. El de volver
   * arranca en su margen y mide `2.75rem` de mínimo de dedo; éste arranca por debajo de los
   * dos. Con eso da igual lo que crezca el rótulo de arriba.
   */
  comprobar(
    'el de recoger empieza por debajo de donde acaba el de volver, así que los dos mandos del lienzo no pueden solaparse por mucho que crezca el rótulo de arriba',
    /top: 0\.75rem;/.test(reglaDelVolverEnTres) &&
      /min-height: 2\.75rem;/.test(reglaDelVolverEnTres) &&
      /right: 0\.75rem;/.test(reglaDelVolverEnTres) &&
      MANDO_DE_RECOGER.margen + MANDO_DE_RECOGER.bajoElOtroMando >= 12 + 44,
    { volver: reglaDelVolverEnTres.replace(/\s+/g, ' ').slice(0, 120) },
  );
}

/**
 * EL CARTEL QUE EXPLICA EL NAIPE (`docs/LAS-CARTAS-SE-EXPLICAN.md`, fase 3).
 *
 * ═══ LOS SEIS FALLOS QUE ESTO COMPRA, Y NINGUNO SE VE EN PANTALLA ═══
 *
 *   1. QUE EL CARTEL TAPE LO QUE HAY DEBAJO. Vive al pie del lienzo, entre la mano de
 *      cartas y la de bienes y encima del asa de la barra, y su sitio no es un porcentaje:
 *      sale de las mismas funciones con que la escena reparte esas tres cosas. Un
 *      porcentaje copiado se queda quieto el día que la franja se ensanche, y entonces el
 *      cartel se pinta encima de la mano SIN QUE NADA FALLE: se ve raro y ya está. Aquí se
 *      mide contra lo que la escena PINTA —los naipes, las cartas de bienes y el asa— y no
 *      contra la misma fórmula escrita otra vez, que probaría que dos copias coinciden.
 *   2. QUE SE RECORTE UNA FRASE POR LA MITAD. En el lienzo más estrecho no caben las tres,
 *      y la regla es enseñar las que quepan ENTERAS. Media frase de ayuda es peor que
 *      ninguna, y unos puntos suspensivos se leen como que la ayuda está rota.
 *   3. QUE LA CUENTA DE RENGLONES SE DESPEGUE DE LA HOJA. El presupuesto sale de tres
 *      números que están en `estilo.css` —la raíz de la casa, el cuerpo de la letra y el
 *      interlineado— y de un relleno de doce puntos. Escritos dos veces, un día dicen
 *      cosas distintas y el cartel se recorta solo en el teléfono de quien más lo
 *      necesita. Este documento ya escribió «0,82 rem sobre 16» una vez.
 *   4. QUE EL CARTEL SE COMA UN TOQUE. Es interfaz por encima del lienzo y no puede
 *      recibir un solo puntero: un rectángulo opaco al pie del delta que atrapara el ratón
 *      sería un cartel que impide construir donde tapa, y eso es cambiar el juego por una
 *      ayuda.
 *   5. QUE EL GESTO CUESTE UN MANEJADOR NUEVO. El aviso sale de los `onPointerOver` y
 *      `onPointerOut` que cada naipe ya tenía; si alguien lo cambia por un plano que
 *      recoja el cursor, el tablero deja de recibir los toques donde ese plano esté.
 *   6. QUE LO QUE NO CABE NO SE OIGA. Las tres frases de los once naipes están siempre en
 *      la lista de apoyo, quepa lo que quepa en la banda, y eso se comprueba renderizando
 *      de verdad contra una partida de verdad.
 *
 * Lo que esto NO compra, dicho antes de que alguien se fíe de más: cómo SE VE. El cartel
 * vive encima de un `<canvas>` y en Node no hay WebGL. Que 13,94 puntos se lean en un SE
 * de verdad, y que el cartel apareciendo y desapareciendo con el cursor no moleste, se
 * miran con ojos y en un aparato.
 */
/**
 * LO QUE MIDIÓ EL BLOQUE DEL CARTEL, PARA QUE EL RESUMEN DEL FINAL NO LO ESCRIBA A MANO.
 *
 * El resumen decía «quince lienzos» cuando son dieciséis y «sólo el móvil estrecho se queda
 * en dos» cuando son dos, así que quien leía la salida VERDE se llevaba la idea de que en el
 * escritorio caben siempre las tres. Un resumen desfasado es peor que ninguno: se lee como
 * una afirmación comprobada. Ahora se compone con la lista y con las claves medidas.
 */
const loQueMidioElCartel: { lienzos: number; conLasTres: number; losEstrechos: string[] } = {
  lienzos: 0,
  conLasTres: 0,
  losEstrechos: [],
};

function elCartelDeLaCarta(): void {
  paso('El cartel de la carta: cabe donde no tapa, se recorta por frases enteras, no come punteros y lo que no cabe se oye');

  const fuente = readFileSync(new URL('../src/riberas-en-tres.tsx', import.meta.url), 'utf8');
  const hoja = readFileSync(new URL('../src/estilo.css', import.meta.url), 'utf8');
  const fuenteDelDelta = readFileSync(new URL('../../escenas/delta.tsx', import.meta.url), 'utf8');
  /*
   * EL FILTRO DE COMENTARIOS DE ESTE BLOQUE QUITA TAMBIÉN LOS DE JSX, y no es un capricho:
   * el de los demás bloques (`filter` por líneas que empiezan por `*`) deja dentro la PROSA
   * de un `{/* … *\/}`, porque sus líneas empiezan por letra. Con ese filtro, una
   * comprobación que exija «esta palabra NO está en el código» pasa en verde por tener la
   * palabra escrita en un comentario de dos párrafos más arriba — que es exactamente el
   * verde falso que la fase 1 de este encargo se encontró en su propio comprobador.
   */
  const soloCodigo = (texto: string): string =>
    texto
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ');
  const codigo = soloCodigo(fuente);
  const codigoDelDelta = soloCodigo(fuenteDelDelta);
  /*
   * Tres frases cualesquiera, para las comprobaciones que miden SITIO y no texto: dónde cae
   * el pie y cuánta caja hay no dependen de lo que ponga el naipe. Las de verdad, las once
   * de la partida, entran en el bloque 3, que es el que sí mide qué frases caben.
   */
  const EXPLICACION_DE_PRUEBA = { hace: 'Una frase de medir.', consigues: 'Otra frase de medir.', usas: 'Y la tercera de medir.' };

  // ── 1. El sitio sale de la escena, no de un porcentaje copiado ──

  comprobar(
    'el sitio del cartel se le pide a las tres manos de la escena: la franja de las cartas, la mano de bienes y el asa de la barra',
    /import \{ ASA_DEL_HUECO, huecosDeLaMesa, loQueSeVe \} from '\.\.\/\.\.\/escenas\/barra';/.test(fuente) &&
      /import \{ franjaDeLasCartas, loQueSeVeEnLasCartas \} from '\.\.\/\.\.\/escenas\/cartas';/.test(fuente) &&
      /import \{ huecosDeLaBaraja, loQueSeVeEnLaBaraja \} from '\.\.\/\.\.\/escenas\/baraja';/.test(fuente) &&
      /franjaDeLasCartas\(CAMPO_DE_LA_CAMARA, proporcion\)/.test(codigo) &&
      /huecosDeLaBaraja\(\[\{ id: 'medida', bien: 'limo' \}\], CAMPO_DE_LA_CAMARA, proporcion, null\)/.test(codigo) &&
      /huecosDeLaMesa\(cuantosHuecos, CAMPO_DE_LA_CAMARA, proporcion, lienzo\.alto\)/.test(codigo),
  );
  comprobar(
    'y con los huecos de barra de VERDAD —los mismos que deciden si caben los dados y en los que se apoya el pregón—, no con un cuatro escrito en el cliente; y diciendo si la cinta lleva hoy su carril y si hay pregón, que son las dos cosas que le comen la banda',
    /const cuantosHuecosDeBarra = mesaRecogida \? 0 : barra\.length \+ \(mazo === null \? 0 : 1\);/.test(codigo) &&
      /return elCartelQueCabe\( lienzo, cuantosHuecosDeBarra, naipeExplicado\.explicacion, raizDeLaLetra, hayCarril, pregon !== null, \);/.test(codigo.replace(/\s+/g, ' ')),
    /return elCartelQueCabe\([\s\S]{0,220}/.exec(codigo)?.[0] ?? null,
  );
  /*
   * ═══ Y `hayCarril` ES UNA SOLA LECTURA, QUE ES LO QUE NO PUEDE SEPARARSE ═══
   *
   * El carril existe cuando `fuera` trae algo O cuando el juego declara la puerta del
   * trueque, porque el cuadrado que abre el componedor vive ahí. Ese mismo hecho decide DOS
   * cosas: si se pinta la segunda tira y cuánto alto se le resta a la banda del cartel.
   * Escritas aparte —una condición en el JSX y otra en la cuenta— se separan el día que
   * alguien toque una de las dos, y el fallo es mudo: el cartel crece hacia arriba con
   * `bottom` y `max-height`, así que lo que se ve es media frase debajo de un vidrio, no un
   * error.
   *
   * EL SEGUNDO SUMANDO ES EL QUE ESTA FASE AÑADE, y se compra a la letra: sin él, el día que
   * pasar deje de ser una opción suelta el cuadrado de la puerta se pintaría encima de una
   * cinta medida como si midiera 44, y el cartel de un naipe se metería 46,75 puntos por
   * debajo de él.
   */
  comprobar(
    'y quien dice si hay carril es UNA sola lectura, la misma que pinta la tira y la que entra en la cuenta del cartel: dos condiciones separadas dejan el cartel debajo del vidrio sin que nada falle',
    /const hayCarril = fuera\.length > 0 \|\| componedor !== null;/.test(codigo) &&
      (codigo.match(/hayCarril/g) ?? []).length >= 4 &&
      /\{hayCarril \? \(\s*<ElCarril\s/.test(codigo),
    (codigo.match(/hayCarril/g) ?? []).length,
  );
  /*
   * ═══ Y CON LA MESA RECOGIDA, CERO HUECOS: NO HAY ASA EN LA QUE APOYARSE ═══
   *
   * El pie del cartel se apoya en el techo del ASA de la barra. Con la mesa abajo no hay
   * barra en pantalla, y medido contra sus cuatro huecos el cartel se quedaba flotando el
   * alto de una barra entera por encima del canto, justo cuando la mesa se ha recogido
   * para ver MÁS tablero. No tapaba nada, y por eso llevaba ahí sin que nadie lo viera.
   *
   * Las dos mitades se compran juntas: que el cliente pase cero, y que pasar cero HAGA
   * algo. Lo segundo se mide llamando a la función con las dos cuentas y exigiendo que el
   * pie baje al aire de ocho puntos y que la banda crezca.
   */
  {
    const conBarra = elCartelQueCabe({ ancho: 288, alto: 420 }, 4, EXPLICACION_DE_PRUEBA);
    const recogida = elCartelQueCabe({ ancho: 288, alto: 420 }, 0, EXPLICACION_DE_PRUEBA);
    comprobar(
      'con la mesa recogida el cartel baja al canto (cero huecos, ocho puntos de aire) en vez de flotar el alto de una barra que no está en pantalla',
      conBarra !== null &&
        recogida !== null &&
        Math.round(recogida.abajo) === 8 &&
        conBarra.abajo > recogida.abajo + 40 &&
        recogida.caja > conBarra.caja,
      { conBarra: conBarra === null ? null : Math.round(conBarra.abajo), recogida: recogida === null ? null : Math.round(recogida.abajo) },
    );
  }

  // ── 2. La letra y el relleno son los de la hoja, con la raíz de esta casa ──

  /*
   * LOS TRES NÚMEROS DEL PRESUPUESTO SE LEEN DE `estilo.css` Y SE COMPARAN CON EL CLIENTE.
   *
   * No se comprueba «que el cliente diga 17»: se saca la raíz de la hoja —`106.25 %` sobre
   * los 16 del navegador— y se exige que dé lo mismo. Con el `font-size` de la raíz tocado
   * y el cliente quieto, el cartel se mediría con una letra que no es la que se pinta.
   */
  const porcentajeDeLaRaiz = Number(/html \{[^}]*font-size:\s*([\d.]+)%/.exec(hoja)?.[1] ?? '0');
  const reglaDelCartel = /\.riberas-cartel \{([^}]*)\}/.exec(hoja)?.[1] ?? '';
  const cuerpoDelCartel = Number(/font-size:\s*([\d.]+)rem/.exec(reglaDelCartel)?.[1] ?? '0');
  const rellenoDelCartel = Number(/padding:\s*(\d+)px/.exec(reglaDelCartel)?.[1] ?? '0');
  const interlineadoDelCartel = Number(/line-height:\s*([\d.]+)/.exec(reglaDelCartel)?.[1] ?? '0');
  comprobar(
    'la raíz de esta casa vale 17 puntos y sale de la hoja (`106.25 %` sobre los 16 del navegador), no de un 16 dado por hecho',
    porcentajeDeLaRaiz > 0 && Math.abs((porcentajeDeLaRaiz / 100) * 16 - 17) < 1e-9 && /const RAIZ_DE_LA_CASA = 17;/.test(codigo),
    { porcentajeDeLaRaiz, da: (porcentajeDeLaRaiz / 100) * 16 },
  );
  comprobar(
    'y los tres números del presupuesto son los que la hoja pinta: cuerpo 0,82 rem, doce puntos de relleno e interlineado 1,35',
    cuerpoDelCartel === 0.82 &&
      rellenoDelCartel === 12 &&
      interlineadoDelCartel === 1.35 &&
      /const CUERPO_SOBRE_LA_RAIZ = 0\.82;/.test(codigo) &&
      /const MARGEN_DEL_CARTEL = 12;/.test(codigo) &&
      /const RENGLON_SOBRE_EL_CUERPO = 1\.35;/.test(codigo) &&
      /const cuerpo = CUERPO_SOBRE_LA_RAIZ \* raiz;/.test(codigo) &&
      /const renglonDelCartel = Math\.ceil\(cuerpo \* RENGLON_SOBRE_EL_CUERPO\);/.test(codigo),
    { cuerpoDelCartel, rellenoDelCartel, interlineadoDelCartel },
  );
  /*
   * ═══ Y LOS 17 SON EL SUELO, NO LA MEDIDA: LA RAÍZ DE VERDAD SE LE PIDE AL NAVEGADOR ═══
   *
   * `106.25 %` va en porcentaje para que la preferencia de tamaño de letra del navegador
   * siga mandando (lo dice el punto 2 de la cabecera de la hoja), así que quien la tenga en
   * grande pinta el cartel con una letra bastante mayor que 13,94 puntos mientras el alto
   * máximo que el cliente calculaba salía de un 17 clavado a mano. Con `overflow: hidden`
   * eso corta el último renglón SIN NINGUNA SEÑAL, que es lo único que la cabecera de
   * `elCartelQueCabe` promete no hacer nunca.
   *
   * Se compran las dos mitades. La primera, aquí: que el cliente MIDA la raíz y se la pase a
   * la cuenta. La segunda —que la cuenta CAMBIE con ella— baja al bloque 3 ter, y baja por
   * una razón: aquí se medía con TRES FRASES DE MENTIRA cortas, y con frases cortas el
   * extremo no se ve. Con las once de verdad, la letra en «muy grande» no deja el cartel en
   * menos frases: lo deja SIN PINTAR. Eso hay que medirlo con los naipes de la partida, que
   * es lo que hay del bloque 3 en adelante.
   */
  comprobar(
    'la raíz se le pide al navegador (`getComputedStyle` sobre la raíz del documento) y el 17 se queda de suelo para Node, donde no hay `document`',
    /function raizDelNavegador\(\): number \{/.test(codigo) &&
      /getComputedStyle\(document\.documentElement\)\.fontSize/.test(codigo) &&
      /typeof document === 'undefined'[\s\S]{0,80}return RAIZ_DE_LA_CASA;/.test(codigo) &&
      /const \[raizDeLaLetra, ponerRaizDeLaLetra\] = useState\(RAIZ_DE_LA_CASA\);/.test(codigo) &&
      /ponerRaizDeLaLetra\(\(antes\) => \{\s*const ahora = raizDelNavegador\(\);/.test(codigo) &&
      /observador\.observe\(document\.documentElement\);/.test(codigo),
  );
  comprobar(
    'el filo va en `box-shadow` y NO en `border`: con `box-sizing: border-box` un borde entra en el `max-height` medido y se come el último renglón',
    /box-shadow:/.test(reglaDelCartel) && !/(^|;)\s*border:/.test(reglaDelCartel),
    reglaDelCartel.replace(/\s+/g, ' ').slice(0, 200),
  );

  // ── 3. Dónde cae de verdad, en los quince lienzos, contra lo que la escena pinta ──

  const riberas = elCatalogoQuePublicaElServidor().find((m) => m.id === 'riberas');
  comprobar('Riberas está instalado', riberas !== undefined);
  if (riberas === undefined) return;
  const { vista, opciones, sentados } = laProyeccionConMazo();
  const laMano = laManoDeLaIzquierda(vista, opciones, 's1');
  comprobar(
    'la mano de la izquierda trae naipes con sus tres frases, o lo de abajo no mediría nada',
    laMano.length > 0 && laMano.every((c) => c.explicacion.hace.length > 0 && c.explicacion.consigues.length > 0 && c.explicacion.usas.length > 0),
    laMano.map((c) => c.nombre),
  );
  /*
   * Y LOS DOS PREMIOS, que hasta este encargo no los explicaba nadie. No son míos en este
   * escenario —La Mayor Guardia es del segundo y El Vado Largo del tercero—, así que se
   * piden por su dueño, que es para lo que `laManoDeLaIzquierda` recibe `quien`.
   */
  const losPremios = [...laManoDeLaIzquierda(vista, opciones, 's2'), ...laManoDeLaIzquierda(vista, opciones, 's3')];
  comprobar(
    'y los dos premios, que aparecen solos y no se juegan, también traen las suyas',
    losPremios.length === 2 && losPremios.every((c) => c.esPremio === true && c.explicacion.usas.startsWith('Nada')),
    losPremios.map((c) => [c.nombre, c.explicacion.usas]),
  );

  const CAMPO = (45 * Math.PI) / 180;
  /* Los cuatro huecos de una partida en marcha: vereda, choza, torre y el naipe del mazo. */
  const HUECOS = 4;

  const solapes: string[] = [];
  const recortes: string[] = [];
  const frasesPorLienzo = new Map<string, number>();
  for (const [nombre, ancho, alto] of LIENZOS) {
    const proporcion = ancho / alto;
    /*
     * CONTRA LO QUE LA ESCENA PINTA, no contra la misma cuenta. La carta más saliente de la
     * mano del mazo se mide CON el empujón que le da estar señalada o cogida (un décimo de
     * su ancho hacia dentro, `CartaDelMazoEnLaMano`), que es justo el estado en que hay
     * cartel; y la mano de bienes, quieta, que es lo que hay mientras se lee un naipe.
     */
    const vistoEnLasCartas = loQueSeVeEnLasCartas(CAMPO, proporcion);
    const naipes = huecosDeLasCartas(laMano, CAMPO, proporcion, null);
    const cantoDeLosNaipes = Math.max(
      ...naipes.map((c) => ((c.hueco.x + c.hueco.ancho * 0.1 + c.hueco.ancho / 2 + vistoEnLasCartas.ancho / 2) / vistoEnLasCartas.ancho) * ancho),
    );
    const vistoEnLaBaraja = loQueSeVeEnLaBaraja(CAMPO, proporcion);
    const bienes = huecosDeLaBaraja([{ id: 'b1', bien: 'limo' }], CAMPO, proporcion, null);
    const cantoDeLosBienes = Math.min(
      ...bienes.map((c) => ((c.hueco.x - c.hueco.ancho / 2 + vistoEnLaBaraja.ancho / 2) / vistoEnLaBaraja.ancho) * ancho),
    );
    const vistoEnLaBarra = loQueSeVe(CAMPO, proporcion);
    const primerHueco = huecosDeLaMesa(HUECOS, CAMPO, proporcion, alto).piezas[0];
    const techoDelAsa =
      primerHueco === undefined
        ? alto
        : ((vistoEnLaBarra.alto / 2 - (primerHueco.y + (primerHueco.lado / 2) * ASA_DEL_HUECO.alto)) / vistoEnLaBarra.alto) * alto;

    for (const naipe of [...laMano, ...losPremios]) {
      const cartel = elCartelQueCabe({ ancho, alto }, HUECOS, naipe.explicacion);
      if (cartel === null) {
        solapes.push(`${nombre}: no cabe ningún cartel`);
        continue;
      }
      const suDerecha = ancho - cartel.derecha;
      const suPie = alto - cartel.abajo;
      const suTecho = suPie - cartel.caja;
      if (cartel.izquierda < cantoDeLosNaipes - 1e-6) solapes.push(`${nombre}: tapa un naipe (${cartel.izquierda.toFixed(1)} < ${cantoDeLosNaipes.toFixed(1)})`);
      if (suDerecha > cantoDeLosBienes + 1e-6) solapes.push(`${nombre}: tapa la mano de bienes (${suDerecha.toFixed(1)} > ${cantoDeLosBienes.toFixed(1)})`);
      if (suPie > techoDelAsa - 8 + 1e-6) solapes.push(`${nombre}: se mete en el asa (${suPie.toFixed(1)} > ${(techoDelAsa - 8).toFixed(1)})`);
      if (suTecho < 0) solapes.push(`${nombre}: se sale por arriba (${suTecho.toFixed(1)})`);

      const enteras = [naipe.explicacion.hace, naipe.explicacion.consigues, naipe.explicacion.usas];
      const esPrefijo = cartel.frases.every((f, i) => f === enteras[i]);
      if (!esPrefijo || cartel.frases.length === 0) recortes.push(`${nombre} · ${naipe.nombre}: ${cartel.frases.join(' | ')}`);
      const menos = frasesPorLienzo.get(nombre);
      if (menos === undefined || cartel.frases.length < menos) frasesPorLienzo.set(nombre, cartel.frases.length);
    }
  }

  comprobar(
    'en los dieciséis lienzos el cartel cae al pie SIN tapar un naipe del mazo, ni la mano de bienes, ni el asa de la barra, ni salirse por arriba',
    solapes.length === 0,
    solapes.slice(0, 6),
  );
  comprobar(
    'y lo que enseña son SIEMPRE frases enteras del naipe y en su orden: nunca media, nunca unos puntos suspensivos',
    recortes.length === 0,
    recortes.slice(0, 6),
  );
  /*
   * ═══ EL PRESUPUESTO SE DEGRADA SOLO, Y HOY YA SE VE ═══
   *
   * Catorce lienzos con las tres frases y cuatro con menos. Los cuatro son estrechos, cada
   * uno de una manera: 320×360 es el móvil con el lienzo al mínimo (25 letras por renglón,
   * dos por frase y cinco renglones para las seis que piden las tres) y 288×420 es el de
   * este cliente con algo más de ventana; los dos dan DOS. Y los dos de la página de pie
   * —288×355 con la cabecera en un renglón y 288×317 con la cabecera partida en dos— dan
   * UNA.
   *
   * ═══ Y ESTOS NÚMEROS SON LOS DE LA CINTA PUESTA, QUE NO SON LOS DE ANTES ═══
   *
   * La cinta son 44 puntos pegados al canto de ARRIBA del recuadro, y `elCartelQueCabe` se
   * los resta a la banda libre antes de partirla por la mitad. La cabecera de aquella
   * función lo tenía escrito como pendiente y con una predicción: «en 320×360 se queda en
   * UNA frase y en el SE apaisado en dos». MEDIDO, no fue eso: 320×360 se queda en DOS, el
   * SE apaisado no pierde ninguna, y el único que baja un escalón es 288×317, de dos a una.
   * La predicción está corregida en su cabecera; queda dicho aquí porque una cuenta escrita
   * a ojo que nadie vuelve a medir es la que se cita después como si fuera una medida.
   *
   * QUE EL MÁS APRETADO NO SEA EL MÁS BAJO NO ES UN ERROR DE MEDIDA, y por eso queda dicho
   * aquí y en la cabecera de `elCartelQueCabe`: la banda del cartel no la marca el alto del
   * lienzo sino el techo del asa de la barra, y el asa la reparte `huecosDeLaMesa` con el
   * alto EN PUNTOS —los dados caben o no caben según ese número—. Con la cinta restada los
   * dos de 288 empatan en UNA, y el que se queda con dos es el de 420, que es el más alto de
   * los tres. Quien toque el reparto de la barra tiene que volver a mirar estas cifras.
   *
   * No son números inventados para que la comprobación pase: son los que salen de las manos
   * de la escena, y si alguien ensancha la franja de las cartas o sube el cuerpo de la letra,
   * este renglón se mueve y esto se pone rojo con el lienzo que cambió escrito al lado.
   */
  const conMenosDeTres = [...frasesPorLienzo.entries()].filter(([, cuantas]) => cuantas < 3);
  comprobar(
    'con la cinta restada, las tres frases caben en catorce de los dieciocho lienzos; en dos de los estrechos caben DOS y en los DOS de la página de pie, UNA',
    frasesPorLienzo.size === LIENZOS.length &&
      conMenosDeTres.length === 4 &&
      conMenosDeTres.filter(([, cuantas]) => cuantas === 2).length === 2 &&
      conMenosDeTres.filter(([, cuantas]) => cuantas === 1).length === 2 &&
      frasesPorLienzo.get('móvil estrecho, lienzo al mínimo') === 2 &&
      frasesPorLienzo.get('escritorio estrecho, con algo más de ventana') === 2 &&
      frasesPorLienzo.get('escritorio de pie, la cabecera en dos renglones') === 1 &&
      frasesPorLienzo.get('escritorio de pie, la cabecera en un renglón') === 1,
    [...frasesPorLienzo.entries()],
  );
  comprobar(
    'y con el lienzo todavía sin medir —cero por cero, el primer render— no se pinta ningún cartel en vez de uno con la cuenta rota',
    elCartelQueCabe({ ancho: 0, alto: 0 }, HUECOS, laMano[0]?.explicacion ?? { hace: 'a', consigues: 'b', usas: 'c' }) === null,
  );

  /*
   * ═══ 3 bis. LAS CUENTAS DE LA CABECERA SALEN DE LA MEDIDA, NO DE LOS DEDOS DE NADIE ═══
   *
   * La cabecera de `elCartelQueCabe` escribe cuántos lienzos llevan las tres frases y cuál es
   * el más apretado, y los escribe para que el siguiente no tenga que medir. Ya se
   * desfasaron una vez: decían cuatro lienzos bajos (eran cinco) y doce con las tres (eran
   * diez). Una cuenta escrita para ahorrarle la medida al siguiente es justo la que no puede
   * estar mal, así que se ata a `LIENZOS` y a lo que se acaba de medir arriba.
   *
   * ═══ Y POR QUÉ ESTO SE REHIZO EN LA MISMA FASE QUE LA PÁGINA DE PIE ═══
   *
   * Lo que ataba estas cuentas era el `min-height: 420px` de `.riberas-lienzo`: de ahí salía
   * qué lienzos de la lista este cliente NO podía dar. Poner la página de pie quita ese suelo
   * —quien reparte el alto es la ventana—, así que `minAltoDelLienzo` salía 0, «los bajos»
   * salía vacío y esta comprobación se ponía roja SOLA, sin que nada estuviera mal. Un
   * comprobador que se cae por el arreglo de otro corta la batería entera (`npm run
   * verificar` para en el primer rojo), así que las dos mitades van juntas o no van.
   *
   * Lo que se ata ahora es lo que ha pasado a ser verdad: que el suelo NO está —ni en la hoja
   * ni prometido en la cabecera—, y que los dos números que la cabecera escribe salen de
   * medir los dieciocho lienzos con las manos de la escena.
   */
  const reglaDelLienzo = /\.riberas-lienzo \{[^}]*\}/.exec(hoja)?.[0] ?? '';
  /* La cabecera de `elCartelQueCabe`, que es la que escribe los números: desde su rótulo hasta la función. */
  const dondeEmpiezaLaCabecera = fuente.indexOf('DÓNDE CABE EL CARTEL DE UN NAIPE');
  const cabeceraDelCartel =
    dondeEmpiezaLaCabecera < 0 ? '' : fuente.slice(dondeEmpiezaLaCabecera, fuente.indexOf('export function elCartelQueCabe'));
  comprobar(
    'el suelo de alto ya no está en la hoja NI prometido en la cabecera del cartel: quien reparte el alto es la ventana, y si el suelo vuelve tienen que volver las dos mitades',
    reglaDelLienzo.length > 0 && cabeceraDelCartel.length > 0 && !/min-height/.test(reglaDelLienzo) && !/min-height/.test(cabeceraDelCartel),
    { regla: reglaDelLienzo.replace(/\s+/g, ' '), loQuePrometeLaCabecera: /min-height[^\n]*/.exec(cabeceraDelCartel)?.[0] ?? null },
  );
  const conLasTres = LIENZOS.filter(([nombre]) => frasesPorLienzo.get(nombre) === 3);
  const sinLasTres = LIENZOS.filter(([nombre]) => frasesPorLienzo.get(nombre) !== 3);
  /* El más apretado de todos, que desde la página de pie es uno de los que ESTE cliente da. */
  const elMasApretado = [...LIENZOS].sort((a, b) => (frasesPorLienzo.get(a[0]) ?? 3) - (frasesPorLienzo.get(b[0]) ?? 3))[0];
  comprobar(
    'la cabecera dice en cuántos de los lienzos caben las tres frases y en cuántos no, y los dos números salen de medir la lista y no de los dedos de nadie',
    new RegExp(`${cardinal(conLasTres.length)} de los ${cardinal(LIENZOS.length)}`).test(cabeceraDelCartel) &&
      new RegExp(`otros ${cardinal(sinLasTres.length)}`).test(cabeceraDelCartel),
    { conLasTres: conLasTres.length, sinLasTres: sinLasTres.length, lienzos: LIENZOS.length },
  );
  /*
   * ═══ 3 bis A. Y LO MISMO CON EL CARRIL PUESTO, QUE ES LA SEGUNDA TIRA DE LA CINTA ═══
   *
   * El carril existe cuando el juego ofrece algo que el tablero no pinta —con el estiaje por
   * mover son dieciocho destinos— y entonces la caja opaca de arriba mide 88 puntos en vez de
   * 44. Se mide con las MISMAS once explicaciones y los mismos dieciocho lienzos, cambiando
   * sólo esa bandera, porque lo que se compra es qué CUESTA la tira y no que la cuenta corra.
   *
   * LO MEDIDO, y no lo previsto: catorce lienzos con las tres frases pasan a trece. Ese uno de
   * diferencia esconde cuatro escalones: el SE apaisado, que con la cinta sola no perdía
   * ninguna, baja a dos; 320×360 y 288×420 bajan de dos a una; y 288×317 —el más apretado de
   * este cliente— se queda SIN CARTEL, que es lo que `elCartelQueCabe` promete hacer antes que
   * pintar media frase, y ahí el texto sigue vivo en la lista de apoyo.
   *
   * Se compra también que la segunda tira CUESTE algo. Con la resta escrita como `- 44` fijo
   * —o con `altoDeLaCinta` devolviendo siempre lo mismo— las dos medidas salen idénticas y
   * todo lo demás de este bloque sigue en verde: el cartel se metría debajo del vidrio del
   * carril y no habría una sola comprobación roja.
   */
  const frasesConCarril = new Map<string, number>();
  for (const [nombre, ancho, alto] of LIENZOS) {
    for (const naipe of laMano) {
      const cartel = elCartelQueCabe({ ancho, alto }, HUECOS, naipe.explicacion, 17, true);
      const cuantas = cartel === null ? 0 : cartel.frases.length;
      const menos = frasesConCarril.get(nombre);
      if (menos === undefined || cuantas < menos) frasesConCarril.set(nombre, cuantas);
    }
  }
  const conLasTresYCarril = LIENZOS.filter(([nombre]) => frasesConCarril.get(nombre) === 3);
  comprobar(
    'y con el CARRIL puesto —dieciocho destinos del estiaje en la segunda tira— las tres frases caben en trece de los dieciocho: cuatro lienzos bajan un escalón y el más apretado se queda sin cartel',
    conLasTresYCarril.length === 13 &&
      frasesConCarril.get('apaisado SE 1ª') === 2 &&
      frasesConCarril.get('móvil estrecho, lienzo al mínimo') === 1 &&
      frasesConCarril.get('escritorio estrecho, con algo más de ventana') === 1 &&
      frasesConCarril.get('escritorio de pie, la cabecera en un renglón') === 1 &&
      frasesConCarril.get('escritorio de pie, la cabecera en dos renglones') === 0,
    [...frasesConCarril.entries()].filter(([, n]) => n < 3),
  );
  comprobar(
    'y la segunda tira CUESTA: en ningún lienzo caben más frases con carril que sin él, y en cinco caben menos —con la resta escrita a 44 fijo saldrían idénticas y nada se pondría rojo',
    LIENZOS.every(([nombre]) => (frasesConCarril.get(nombre) ?? 0) <= (frasesPorLienzo.get(nombre) ?? 0)) &&
      LIENZOS.filter(([nombre]) => (frasesConCarril.get(nombre) ?? 0) < (frasesPorLienzo.get(nombre) ?? 0)).length === 4,
    LIENZOS.filter(([nombre]) => (frasesConCarril.get(nombre) ?? 0) < (frasesPorLienzo.get(nombre) ?? 0)).map(([n]) => n),
  );
  comprobar(
    'y la cabecera dice TAMBIÉN el número con carril, sacado de la misma medida: son dos cuentas y no una, porque la tira aparece y desaparece con lo que el juego ofrezca',
    new RegExp(`con el carril puesto, en ${cardinal(conLasTresYCarril.length)} de los ${cardinal(LIENZOS.length)}`).test(cabeceraDelCartel) &&
      new RegExp(`son ${cardinal(conLasTresYCarril.length)} de los ${cardinal(LIENZOS.length)}`).test(cabeceraDelCartel),
    { conCarril: conLasTresYCarril.length, sinCarril: conLasTres.length },
  );

  comprobar(
    'y nombra el lienzo más apretado con su medida, que ya no es el más alto de los estrechos sino uno de los que este cliente da de pie',
    elMasApretado !== undefined &&
      elMasApretado[0].startsWith('escritorio de pie') &&
      frasesPorLienzo.get(elMasApretado[0]) === 1 &&
      cabeceraDelCartel.includes(`${String(elMasApretado[1])}×${String(elMasApretado[2])}`),
    elMasApretado === undefined ? null : `${elMasApretado[0]} ${String(elMasApretado[1])}×${String(elMasApretado[2])} → ${String(frasesPorLienzo.get(elMasApretado[0]))} frases`,
  );

  /*
   * ═══ 3 ter. LA PREFERENCIA DE LETRA GRANDE, MEDIDA CON LAS FRASES DE VERDAD ═══
   *
   * La mitad de arriba compra que la raíz se MIDA; ésta compra que entre en la cuenta, y se
   * mide con los naipes de la partida y no con tres frases cortas de mentira. La diferencia
   * no es de estilo: con frases de mentira el extremo se veía como «caben menos», y con las
   * de verdad lo que pasa es que el cartel DEJA DE PINTARSE. Medido en los dos lienzos
   * estrechos, subiendo la raíz: nunca caben más frases con la letra más grande, y en el
   * extremo no se pinta ninguno.
   *
   * Y eso es lo prometido, no un fallo: la cabecera de `elCartelQueCabe` dice que antes
   * ninguno que uno cortado a la mitad sin avisar. Lo que lo hace aceptable es la segunda
   * mitad, que se compra aquí al lado: el texto no se pierde con el cartel, porque la lista
   * de apoyo se pinta desde `cartasDelMazo` y no mira `cartel` ni una vez.
   */
  {
    /*
     * LAS ONCE EXPLICACIONES: las nueve clases —por su retrato, que es donde viven— y los dos
     * premios de la partida. No la mano de este escenario, que trae las cartas que le tocaron
     * y dejaría fuera justo la que peor cabe.
     */
    const losOnce: ExplicacionDeLaCarta[] = [
      ...CLASES_DE_CARTA.map((clase) => retratoDeLaCarta(clase)?.explicacion).filter(
        (e): e is ExplicacionDeLaCarta => e !== undefined,
      ),
      ...losPremios.map((p) => p.explicacion),
    ];
    const LA_ESCALERA = [17, 20, 24, 27, 30, 34];
    /*
     * LOS CUATRO ESTRECHOS, y dos de ellos son nuevos: desde la página de pie este cliente da
     * lienzos BAJOS de verdad —la ventana menos la cabecera—, así que medir la letra grande
     * sólo en los dos altos dejaba sin recorrer justo las formas donde el cartel se acaba
     * antes. Ver la cabecera de `elCartelQueCabe`.
     */
    const LOS_ESTRECHOS: Array<[string, number, number]> = [
      ['288×355', 288, 355],
      ['288×317', 288, 317],
      ['288×420', 288, 420],
      ['320×360', 320, 360],
    ];
    const crecieron: string[] = [];
    const alExtremo: string[] = [];
    const laDegradacion: string[] = [];
    for (const [nombre, ancho, alto] of LOS_ESTRECHOS) {
      let antes = Number.POSITIVE_INFINITY;
      for (const raiz of LA_ESCALERA) {
        const cuantas = losOnce.map((e) => elCartelQueCabe({ ancho, alto }, HUECOS, e, raiz)?.frases.length ?? 0);
        const masQueCabe = Math.max(...cuantas);
        if (masQueCabe > antes) crecieron.push(`${nombre}: con raíz ${String(raiz)} caben ${String(masQueCabe)} y con la anterior ${String(antes)}`);
        antes = masQueCabe;
        laDegradacion.push(`${nombre}@${String(raiz)}=${String(masQueCabe)}`);
        if (raiz === 34 && masQueCabe > 0) alExtremo.push(`${nombre}: con la letra al doble todavía se pinta cartel`);
      }
    }
    comprobar(
      'con las ONCE frases de verdad, subir la raíz no hace caber MÁS: la letra grande del navegador entra en la cuenta y degrada el cartel frase a frase',
      crecieron.length === 0 && losOnce.length === 11,
      { crecieron, naipes: losOnce.length, degradacion: laDegradacion },
    );
    comprobar(
      'y en el extremo (la raíz al doble) el cartel NO se pinta en ninguno de los cuatro lienzos estrechos: `null`, que es lo prometido, y no un último renglón cortado en silencio',
      alExtremo.length === 0,
      alExtremo,
    );
    const dondeEmpiezaLaLista = codigo.indexOf('<ul className="riberas-solo-apoyo">');
    const laListaEnElJsx = dondeEmpiezaLaLista < 0 ? '' : codigo.slice(dondeEmpiezaLaLista, dondeEmpiezaLaLista + 400);
    comprobar(
      'y sin cartel el texto NO se pierde: la lista de apoyo se pinta desde `cartasDelMazo` y no mira `cartel` ni una vez, así que las tres frases siguen ahí',
      laListaEnElJsx.length > 0 && /cartasDelMazo\.map/.test(laListaEnElJsx) && !/cartel/.test(laListaEnElJsx),
      laListaEnElJsx.replace(/\s+/g, ' ').slice(0, 200),
    );
  }

  /* Y lo medido se le pasa al resumen del final, para que no lo escriba a mano. Ver `loQueMidioElCartel`. */
  loQueMidioElCartel.lienzos = LIENZOS.length;
  loQueMidioElCartel.conLasTres = [...frasesPorLienzo.values()].filter((cuantas) => cuantas === 3).length;
  /*
   * CON CUÁNTAS FRASES SE QUEDA CADA ESTRECHO, y no sólo cuáles son: desde la página de pie
   * no todos se quedan en dos —el 288×355 se queda en UNA— y un resumen que dijera «DOS en
   * los estrechos» estaría escribiendo a mano lo que aquí se acaba de medir.
   */
  loQueMidioElCartel.losEstrechos = LIENZOS.filter(([nombre]) => (frasesPorLienzo.get(nombre) ?? 3) < 3).map(
    ([nombre, ancho, alto]) => `${String(ancho)}×${String(alto)}: ${String(frasesPorLienzo.get(nombre) ?? 0)}`,
  );

  /*
   * ═══ 3 bis. Y LA ARITMÉTICA MEDIDA LLEGA AL ESTILO QUE SE PINTA, PAREJA A PAREJA ═══
   *
   * Todo lo de arriba mide `izquierda`, `derecha`, `abajo` y `caja` con muchísimo cuidado y
   * NADA ataba esos cuatro números a las cuatro propiedades que el navegador recibe.
   * Intercambiar `izquierda` y `derecha` en el JSX dejaba la batería entera en verde con el
   * cartel puesto encima de la mano que está explicando: la cuenta medida y el estilo
   * pintado eran dos cosas que no se encontraban en ninguna comprobación.
   *
   * Ya no se leen con una expresión regular sobre el JSX, que es lo que había: la traducción
   * vive en `elEstiloDelCartel`, una función pura y exportada, y aquí se LLAMA con cuatro
   * números distintos entre sí (11, 22, 33 y 44) para mirar en cuál acabó cada uno. Dos de
   * ellos cambiados de sitio se ven aquí y no en la pantalla de nadie. Se pide además, con
   * el fuente, que el `<p>` no escriba ninguna de las cuatro por su cuenta.
   *
   * Y el RECORRIDO en el orden de las frases: se pintan las que trae `cartel.frases`, en su
   * orden, sin volverlas del revés ni ordenarlas ni recortarlas. El orden es el que el
   * bloque de arriba comprueba que es prefijo del naipe («hace», «consigues», «usas»), o sea
   * que darle la vuelta aquí pintaría el final de la explicación y se callaría el principio.
   */
  {
    const estilo = elEstiloDelCartel({ izquierda: 11, derecha: 22, abajo: 33, caja: 44, frases: [] });
    const sinCartel = elEstiloDelCartel(null);
    comprobar(
      'las cuatro medidas caen cada una en su propiedad: `izquierda` en `left`, `derecha` en `right`, `abajo` en `bottom` y `caja` en `max-height`',
      estilo?.left === '11px' && estilo.right === '22px' && estilo.bottom === '33px' && estilo.maxHeight === '44px' && sinCartel === undefined,
      estilo,
    );
    const elParrafo = codigo.slice(codigo.indexOf('className="riberas-cartel"'), codigo.indexOf('className="riberas-cartel"') + 500);
    comprobar(
      'y el `<p>` no escribe ninguna de las cuatro por su cuenta: le pasa entero lo que devuelve `elEstiloDelCartel`, que es lo que se acaba de medir',
      /style=\{elEstiloDelCartel\(cartel\)\}/.test(elParrafo) && !/left:|right:|bottom:|maxHeight:/.test(elParrafo),
      elParrafo.replace(/\s+/g, ' ').slice(0, 220),
    );
    comprobar(
      'el recorrido va por `cartel.frases` en su orden, sin darle la vuelta ni ordenarlo ni recortarlo: al revés se pintaría el final y se callaría el principio',
      /cartel\.frases\.map\(\(frase\) => \(\s*<span key=\{frase\} className="riberas-cartel-frase">\s*\{frase\}\s*<\/span>\s*\)\)/.test(codigo) &&
        !/cartel\.frases\.(reverse|sort|slice|filter|toReversed|toSorted)/.test(codigo),
    );
  }

  // ── 4. El gesto: los dos manejadores que ya existían, y ninguno nuevo ──

  const laCartaEnLaMano = codigoDelDelta.slice(
    codigoDelDelta.indexOf('function CartaDelMazoEnLaMano('),
    codigoDelDelta.indexOf('function Casilla('),
  );
  comprobar(
    'el aviso de la carta señalada cuelga de los `onPointerOver` y `onPointerOut` que el naipe YA tenía',
    laCartaEnLaMano.length > 0 &&
      /onPointerOver=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*setEncima\(true\);\s*onSenalar\(carta, true\);\s*\}\}/.test(laCartaEnLaMano) &&
      /onPointerOut=\{\(\) => \{\s*setEncima\(false\);\s*onSenalar\(carta, false\);\s*\}\}/.test(laCartaEnLaMano),
    { mide: laCartaEnLaMano.length },
  );
  comprobar(
    'y no cuesta un manejador nuevo: el naipe sigue teniendo exactamente tres —entrar, salir y pulsar— y ninguno que persiga el cursor',
    (laCartaEnLaMano.match(/onPointer[A-Z][a-zA-Z]*=/g) ?? []).join(',') === 'onPointerOver=,onPointerOut=,onPointerDown=',
    laCartaEnLaMano.match(/onPointer[A-Z][a-zA-Z]*=/g) ?? [],
  );
  comprobar(
    'ni le roba nada al toque que coge la carta: el `onPointerDown` sigue haciendo lo mismo que hacía y nada más',
    /onPointerDown=\{\(e\) => \{\s*if \(noEsElPrimario\(e\)\) return;\s*e\.stopPropagation\(\);\s*loCogeLaInterfaz\(e\.nativeEvent\);\s*onCoger\(carta\);\s*\}\}/.test(laCartaEnLaMano) &&
      !/onSenalar/.test(/onPointerDown=\{[\s\S]*?\n        \}\}/.exec(laCartaEnLaMano)?.[0] ?? ''),
  );
  const laMano3D = codigoDelDelta.slice(
    codigoDelDelta.indexOf('function ManoDelMazo('),
    codigoDelDelta.indexOf('export function Delta('),
  );
  comprobar(
    'y una SALIDA que llega tarde no apaga el cartel del naipe al que el cursor acaba de llegar: la señalada se apunta y la salida ajena se tira',
    laMano3D.length > 0 &&
      /const laSenalada = useRef<string \| null>\(null\);/.test(laMano3D) &&
      /if \(laSenalada\.current !== carta\.id\) return;/.test(laMano3D) &&
      /onSenalar=\{avisarDeLaSenalada\}/.test(laMano3D),
    { mide: laMano3D.length },
  );
  comprobar(
    'la entrada nueva de `<Delta>` es opcional —sin quien la escuche la escena se pinta igual— y el cliente la cablea',
    /onSenalarCartaDelMazo\?: \(carta: CartaDelMazo \| null\) => void;/.test(fuenteDelDelta) &&
      /onSenalar=\{\(c\) => onSenalarCartaDelMazo\?\.\(c\)\}/.test(codigoDelDelta) &&
      /<Delta[\s\S]*?onSenalarCartaDelMazo=\{alSenalarCartaDelMazo\}[\s\S]*?\/>/.test(fuente),
  );

  // ── 5. La precedencia, y que señalar no juega ──

  comprobar(
    'si hay carta COGIDA el cartel es el suyo aunque el cursor pase por otra: al revés cambiaría bajo el dedo que va a soltarla en la casilla',
    /const cual = cartaDelMazo \?\? naipeSenalado;/.test(codigo),
  );
  comprobar(
    'y el naipe se busca en la mano de VERDAD, así que una carta jugada se lleva su cartel: guardándola entera se quedaría explicando lo que ya no está',
    /return cartasDelMazo\.find\(\(c\) => c\.id === cual\) \?\? null;/.test(codigo),
  );
  const alSenalar = /const alSenalarCartaDelMazo = useCallback\(\(carta: \{ id: string \} \| null\) => \{([\s\S]*?)\n  \}, \[\]\);/.exec(codigo)?.[1] ?? '';
  comprobar(
    'señalar NO es jugar: el manejador sólo apunta el seudónimo —ni manda un movimiento, ni suelta el bien, ni cierra el menú, ni mira `quieto`—',
    alSenalar.length > 0 &&
      /ponerNaipeSenalado\(/.test(alSenalar) &&
      !/mover\(|ponerCogida|ponerTomada|ponerPreguntando|quieto/.test(alSenalar),
    alSenalar.trim(),
  );
  comprobar(
    'y el estado del cursor NO entra en `soltarTodo`: una jugada ajena no mueve el ratón de sitio',
    /const soltarTodo = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\);/.test(codigo) &&
      !/ponerNaipeSenalado/.test(/const soltarTodo = useCallback\(\(\) => \{([\s\S]*?)\}, \[\]\);/.exec(codigo)?.[1] ?? ''),
  );

  // ── 6. El cartel no come punteros, y no es un objeto de la escena ──

  comprobar(
    'no recibe un solo puntero: `pointer-events: none` en su regla, y ni `onClick` ni `tabIndex` en el elemento',
    /pointer-events: none;/.test(reglaDelCartel) &&
      !/onClick|tabIndex/.test(codigo.slice(codigo.indexOf('className="riberas-cartel"'), codigo.indexOf('className="riberas-cartel"') + 700)),
  );
  comprobar(
    'es interfaz POR ENCIMA del lienzo y no un objeto del mundo: va dentro del recuadro y FUERA del `<Canvas>`, como los dos botones que ya viven ahí',
    codigo.indexOf('className="riberas-cartel"') > codigo.indexOf('</Canvas>') &&
      codigo.indexOf('className="riberas-cartel"') < codigo.indexOf('riberas-telon'),
  );
  comprobar(
    'y se anuncia al aparecer: el `<p>` está SIEMPRE montado con `aria-live="polite"` —una región que nace con su texto no la lee nadie— y vacío no deja caja',
    /<p\s+className="riberas-cartel"\s+aria-live="polite"/.test(codigo) &&
      !/cartel !== null \? \(\s*<p/.test(codigo) &&
      /\.riberas-cartel:empty \{[^}]*padding: 0;[^}]*\}/.test(hoja),
  );

  // ── 7. Lo que no cabe se oye, y eso se renderiza de verdad ──

  const puesta = mesaPuestaDe(sentados, vista, opciones);
  const tablero = tableroDeLaVista(vista);
  comprobar('el escenario trae tablero declarado', tablero !== null);
  if (tablero === null) return;
  const html = renderToStaticMarkup(
    <RiberasEnTres manifiesto={riberas} mesa={unaMesa('dentro', puesta)} puesta={puesta} tablero={tablero} opciones={opciones} />,
  );
  const laLista = /<ul class="riberas-solo-apoyo">([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? '';
  const filas = laLista.split('<li>').length - 1;
  comprobar(
    'la lista de apoyo trae UNA fila por naipe de la mano, ni una menos: es la única puerta de quien no puede pasar el cursor por un lienzo',
    laLista.length > 0 && filas === laMano.length,
    { filas, naipes: laMano.length },
  );
  const texto = palabrasDe(laLista);
  const sinDecir = laMano.filter(
    (c) =>
      !texto.includes(c.nombre) ||
      !texto.includes(c.explicacion.hace) ||
      !texto.includes(c.explicacion.consigues) ||
      !texto.includes(c.explicacion.usas),
  );
  comprobar(
    'y de cada uno se oyen su nombre —que en el lienzo no se ve nunca— y LAS TRES frases, quepan o no en el cartel',
    sinDecir.length === 0,
    sinDecir.map((c) => c.nombre),
  );
  comprobar(
    'la lista está fuera del `conMundo`: mientras el modelo se descarga la mano ya existe y sus explicaciones ya son verdad',
    html.includes('riberas-telon') && laLista.length > 0,
  );

  // ── 8. La llave del pregón, que ya está escrita ──

  /*
   * Aquí se compraba que la condición del pregón NO estuviera escrita, porque el pregón no
   * existía y una condición sobre un estado que nadie crea no la puede poner roja nadie. Ya
   * existe, así que lo que se compra es lo contrario y con las dos mitades: que la llave entre
   * por la PUERTA de la función —como el carril, porque quién tiene propuestas vivas lo sabe
   * el pintor y no esta cuenta— y que apague el cartel de verdad. Los dieciocho lienzos, uno
   * a uno, están en el bloque del pregón; aquí se compra la forma.
   */
  comprobar(
    'la llave que apaga el cartel con el pregón pintado entra por la PUERTA de la función, como el carril: quién tiene propuestas vivas lo sabe el pintor y no esta cuenta',
    /conPregon = false,/.test(codigo) && /if \(conPregon\) return null;/.test(codigo),
    /conPregon[\s\S]{0,80}/.exec(codigo)?.[0] ?? null,
  );
  const unaCualquiera = laMano[0]?.explicacion;
  comprobar(
    'y con ella puesta el cartel no se pinta en NINGUNO de los dieciocho lienzos, ni en un monitor donde las tres frases caben de sobra: las dos mitades, o un `return null` de más pasaría en verde',
    unaCualquiera !== undefined &&
      LIENZOS.every(([, ancho, alto]) => elCartelQueCabe({ ancho, alto }, 4, unaCualquiera, RAIZ_DE_LA_CASA, false, true) === null) &&
      elCartelQueCabe({ ancho: 1920, alto: 1080 }, 4, unaCualquiera, RAIZ_DE_LA_CASA, false, false) !== null,
  );
}

// ---------------------------------------------------------------------------
// 10 · La página de pie: el delta ocupa la ventana, y no se pierde ni un dato
// ---------------------------------------------------------------------------

/**
 * QUE LA CADENA QUE PONE LA PÁGINA DE PIE SIGA ENTERA, Y QUE EL FOCO TENGA DÓNDE CAER.
 *
 * ═══ POR QUÉ ESTO NECESITA COMPROBADOR, SIENDO «SÓLO CSS» ═══
 *
 * Miguel pidió que la partida entrara en la pantalla. Lo que lo consigue no es una regla:
 * son SEIS cajas repartiéndose el alto en cadena, desde la ventana hasta el recuadro del
 * lienzo. Y una cadena de reparto tiene la peor forma de fallo que hay: quitar un eslabón
 * —o quitarle su `min-height: 0`, que es lo que se borra sin querer— no da error, no rompe
 * ninguna prueba y no se ve en una captura de un monitor grande. Lo que hace es que el
 * delta vuelva a su `62vh` y la mitad de abajo de la ventana se quede en blanco, que es
 * exactamente el estado del que se venía.
 *
 * Lo mismo el foco: con la página de pie el `<h1>` de la mesa sale del flujo, así que el
 * efecto de `sala.tsx` se quedaría llevando el foco a un elemento invisible. Eso tampoco
 * da error: da un aro de foco que no ve nadie, y un lector que no anuncia nada al sentarse.
 *
 * ═══ LO QUE ESTO NO COMPRA, DICHO ANTES DE QUE ALGUIEN SE FÍE DE MÁS ═══
 *
 * Que el reparto CUADRE en puntos. Aquí no hay navegador: `:has`, `100dvh`, `minmax(0, 1fr)`
 * y el reparto de `flex` los resuelve un motor de maquetación y no una expresión regular, y
 * medir el alto de verdad es mirar la ventana. Lo que se compra es que las piezas del
 * reparto sigan estando y sigan diciendo lo que dicen; el alto se mide con los ojos, y las
 * cifras de esa medida están en la cabecera de `elCartelQueCabe` y en la de `estilo.css`.
 */
function laPaginaDePie(): void {
  paso('La página de pie: los seis eslabones siguen repartiendo el alto y el foco tiene dónde caer');

  const hoja = readFileSync(new URL('../src/estilo.css', import.meta.url), 'utf8');
  const fuente = readFileSync(new URL('../src/riberas-en-tres.tsx', import.meta.url), 'utf8');
  const laSala = readFileSync(new URL('../src/sala.tsx', import.meta.url), 'utf8');

  /*
   * ═══ SE MIRA LA HOJA SIN SUS COMENTARIOS, Y NO ES LIMPIEZA ═══
   *
   * Esta hoja explica cada decisión dentro de la propia regla, así que un comentario CITA la
   * declaración que razona. Medido: borrando el `width: 100%` de la mesa —los 302 puntos de
   * ancho que costó— la comprobación seguía verde, porque el comentario que cuenta por qué
   * existe lo nombra dos líneas más arriba. O sea que se estaba comprobando la explicación en
   * vez de la regla, que es la peor manera de estar en verde.
   */
  const hojaPelada = hoja.replace(/\/\*[\s\S]*?\*\//g, '');

  /**
   * El cuerpo de una regla de la hoja, buscada por su selector exacto Y AL RAS DEL MARGEN.
   *
   * Sin lo del margen esto no servía: los mismos selectores aparecen otra vez dentro de las
   * `@media`, indentados dos espacios, y una regla de dentro de una consulta hacía pasar por
   * presente a la de fuera. Medido: borrando el eslabón de la rejilla ENTERO, «la cadena
   * tiene sus seis eslabones» se quedaba verde porque la de `@media (max-width: 60rem)`
   * seguía ahí. El ras del margen es lo que distingue la regla base de sus excepciones.
   */
  const reglaDe = (selector: string): string => {
    const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escapado}\\s*\\{([^}]*)\\}`, 'm').exec(hojaPelada)?.[1] ?? '';
  };

  /*
   * ── 1. LOS SEIS ESLABONES, POR SU NOMBRE Y EN ORDEN ──
   *
   * El orden importa y por eso van escritos de fuera adentro: si mañana alguien mete una caja
   * nueva entre dos de éstas y no le pone su parte, la cadena se corta ahí y el delta pierde
   * el alto sin que ninguna de estas líneas se entere. Lo que sí se entera es la medida con
   * los ojos, y por eso queda dicho aquí y no se promete de más.
   */
  const RAIZ = '.sala:has(.riberas-lienzo)';
  const ESLABONES: Array<[string, string]> = [
    ['la ventana', RAIZ],
    ['la página', `${RAIZ} > .mesa-puesta`],
    ['la rejilla del mueble y el raíl', `${RAIZ} .tablero-y-panel`],
    ['el mueble', `${RAIZ} .el-mueble`],
    ['el pintor de Riberas', `${RAIZ} .riberas-en-tres`],
    ['el recuadro del lienzo', `${RAIZ} .riberas-lienzo`],
  ];
  const sinRegla = ESLABONES.filter(([, selector]) => reglaDe(selector).length === 0);
  comprobar(
    'la cadena tiene sus SEIS eslabones en la hoja, de la ventana al recuadro',
    sinRegla.length === 0,
    sinRegla.map(([nombre, selector]) => `${nombre} (${selector})`),
  );

  /*
   * `min-height: 0` EN LOS CINCO QUE SON HIJOS, y es la línea que se borra sin querer. Sin
   * ella el mínimo automático de un hijo de flex es su contenido, así que la caja se niega a
   * encoger y la de dentro no recibe el alto que le tocaba: el reparto sigue escrito y no
   * reparte. La ventana no lleva `min-height: 0` porque no es hija de nadie.
   */
  const sinSueloCero = ESLABONES.slice(1, -1).filter(([, selector]) => !/min-height:\s*0/.test(reglaDe(selector)));
  comprobar(
    'y los cuatro de en medio llevan `min-height: 0`, sin la cual el mínimo automático les impide encoger y el reparto no reparte',
    sinSueloCero.length === 0,
    sinSueloCero.map(([nombre]) => nombre),
  );
  /*
   * ═══ EL ÚLTIMO NO: EL RECUADRO TIENE SUELO, Y ES UNA REGLA Y NO UN NÚMERO ═══
   *
   * Con `min-height: 0` en el recuadro también, el tablero se lo comían sus vecinos: MEDIDO
   * en una ventana de 568×320, el recuadro se quedaba en 47,6 puntos —una raya azul— porque
   * el aviso del tablero y la lista de botones se llevaban el resto del mueble. Eso no es que
   * la partida entre en la pantalla: es que ya no hay partida.
   *
   * Y el suelo tampoco puede volver a ser el `min-height: 420px` de antes, que es justo lo
   * que impedía que mandara la ventana. Lo que vale es un REPARTO: la mitad del mueble para
   * el tablero, y lo que no quepa rueda dentro de la mesa. Se pide en PORCENTAJE —lo que se
   * reparte es el mueble, donde la cabecera ya está descontada— y no en `vh`, que volvería a
   * prometer alto que no existe. En las ventanas con sitio no ata nada: el recuadro crece muy
   * por encima de la mitad.
   */
  const elRecuadroEnLaCadena = reglaDe(`${RAIZ} .riberas-lienzo`);
  comprobar(
    'y el recuadro NO baja de la mitad del mueble: con suelo cero, una ventana de 568×320 lo dejaba en 47,6 puntos, que es una raya azul y no un tablero',
    /min-height:\s*50%/.test(elRecuadroEnLaCadena) && !/min-height:\s*\d+px/.test(elRecuadroEnLaCadena),
    elRecuadroEnLaCadena.replace(/\s+/g, ' '),
  );

  /* Los tres que además REPARTEN por dentro son columnas de flex; los otros reparten por rejilla o no reparten. */
  const COLUMNAS = [RAIZ, `${RAIZ} > .mesa-puesta`, `${RAIZ} .el-mueble`];
  const sinColumna = COLUMNAS.filter(
    (selector) => !/display:\s*flex/.test(reglaDe(selector)) || !/flex-direction:\s*column/.test(reglaDe(selector)),
  );
  comprobar('los tres que reparten por dentro son columnas de flex', sinColumna.length === 0, sinColumna);

  /*
   * Y LOS CUATRO QUE CRECEN LO DICEN CON `flex`. El mueble no: es hijo de una REJILLA, y ahí
   * `flex` no significa nada — se estira con `align-self: stretch` contra el `align-items:
   * start` que la rejilla necesita para el raíl. Confundir las dos cosas deja el mueble de
   * su alto natural con toda la fila vacía debajo, que es un fallo que se ve sólo si se mira.
   */
  const QUE_CRECEN = [`${RAIZ} > .mesa-puesta`, `${RAIZ} .tablero-y-panel`, `${RAIZ} .riberas-en-tres`, `${RAIZ} .riberas-lienzo`];
  const sinCrecer = QUE_CRECEN.filter((selector) => !/flex:\s*1/.test(reglaDe(selector)));
  comprobar('los cuatro que crecen lo dicen con `flex: 1`', sinCrecer.length === 0, sinCrecer);
  comprobar(
    'y el mueble, que es hijo de una rejilla y no de un flex, se estira con `align-self: stretch` contra el `align-items: start` que el raíl necesita',
    /align-self:\s*stretch/.test(reglaDe(`${RAIZ} .el-mueble`)) && /align-items:\s*start/.test(reglaDe('.tablero-y-panel')),
    { mueble: reglaDe(`${RAIZ} .el-mueble`).replace(/\s+/g, ' '), rejilla: reglaDe('.tablero-y-panel').replace(/\s+/g, ' ') },
  );
  /*
   * Y EL RECUADRO CRECE DESDE `auto`, NO DESDE CERO. Con `flex: 1` pelado la base es 0, y un
   * antepasado que no tenga alto que repartir —una fila de rejilla automática, este mismo
   * pintor montado fuera de la cadena— deja el recuadro en cero puntos y la mesa en negro,
   * sin un error en ninguna consola. Con base `auto` manda el `62vh` de la regla de siempre.
   */
  comprobar(
    'el recuadro crece desde `auto` y no desde cero, y su `62vh` sigue siendo la base de la que parte',
    /flex:\s*1\s+1\s+auto/.test(reglaDe(`${RAIZ} .riberas-lienzo`)) && /height:\s*62vh/.test(reglaDe('.riberas-lienzo')),
    { enLaCadena: reglaDe(`${RAIZ} .riberas-lienzo`).replace(/\s+/g, ' '), suelta: reglaDe('.riberas-lienzo').replace(/\s+/g, ' ') },
  );

  // ── 2. El cromo que se va, y el que NO se va con él ──

  /*
   * Los 102 puntos de relleno vertical se van SÓLO en esta pantalla. `.dentro` la comparten
   * el catálogo y el vestíbulo, donde ese aire es el de una página que se lee: quitarlo de la
   * regla común habría arreglado la mesa apretando las otras cuatro pantallas de la Sala.
   */
  comprobar(
    'el relleno vertical se va sólo en esta pantalla: `.dentro` lo conserva para el catálogo y el vestíbulo',
    /padding-block:\s*0/.test(reglaDe(`${RAIZ} > .mesa-puesta`)) && /padding:\s*2rem/.test(reglaDe('.dentro')),
    { enLaMesa: reglaDe(`${RAIZ} > .mesa-puesta`).replace(/\s+/g, ' '), enElResto: reglaDe('.dentro').replace(/\s+/g, ' ') },
  );
  /*
   * ═══ Y EL `width: 100%`, QUE NO ES REDUNDANTE Y COSTÓ 302 PUNTOS DE TABLERO ═══
   *
   * `.dentro` se centra con `margin: 0 auto`. En cuanto esta caja pasa a ser HIJA DE UN FLEX,
   * esos márgenes automáticos del eje cruzado apagan el estirado, así que la caja se queda del
   * ancho de su contenido en vez de los 92rem del `max-width`. Medido en un monitor de 1920:
   * 1.261 en vez de 1.564. O sea que poner la página de pie, sin esta línea, habría
   * ESTRECHADO el tablero justo en la pantalla donde más sitio hay — y ganar alto perdiendo
   * ancho no es lo que Miguel pidió.
   */
  comprobar(
    'la mesa sigue midiendo lo que su `max-width` dice: sin `width: 100%`, los márgenes automáticos de `.dentro` apagan el estirado del flex y el tablero pierde 302 puntos de ancho en un monitor',
    /width:\s*100%/.test(reglaDe(`${RAIZ} > .mesa-puesta`)) && /margin:\s*0 auto/.test(reglaDe('.dentro')) && /max-width:\s*92rem/.test(reglaDe('.dentro')),
    { enLaMesa: reglaDe(`${RAIZ} > .mesa-puesta`).replace(/\s+/g, ' '), dentro: reglaDe('.dentro').replace(/\s+/g, ' ') },
  );
  comprobar(
    'y el `margin-bottom` del pintor tampoco está ya: eran 25,5 puntos por debajo del lienzo que nadie miraba',
    !/margin-bottom/.test(reglaDe('.riberas-en-tres')),
    reglaDe('.riberas-en-tres').replace(/\s+/g, ' '),
  );

  /*
   * ═══ AQUÍ SE MEDÍA EL RAÍL CONTRA SU HUECO, Y AHORA NO HAY RAÍL QUE MEDIR ═══
   *
   * La comprobación de antes exigía `max-height: 100%` en `.sala:has(.riberas-lienzo) .rail`:
   * anclado a la ventana (`calc(100vh - 2rem)`) sobresalía justo lo que mide la cabecera y
   * sus dos últimos botones —«Levantarse» y «Tirar la mesa»— se quedaban fuera.
   *
   * Con el cajón, el raíl SE VA ENTERO dentro del lienzo y esa regla se borró de la hoja, así
   * que la comprobación se quedó midiendo una regla que ya no existe —cadena vacía, roja sola,
   * y `npm run verificar` cortado en el primer rojo—. Lo que se ata ahora es lo que ha pasado
   * a ser verdad, y las dos mitades:
   *
   *   · que en esta pantalla la hoja NO escriba una regla para el raíl, porque el `<aside>`
   *     no se monta cuando hay lienzo (quien lo decide es `conLienzo`, y eso se compra en la
   *     sección de la cinta);
   *   · y que la regla BASE de `.rail` siga ahí con su anclaje a la ventana, porque en el
   *     camino del respaldo —sin `.glb`, sin WebGL, más colonos que colores— y en cualquier
   *     otro arcade el raíl vuelve a existir y ahí la página sí rueda entera.
   *
   * Devuelve el `<aside>` a esta pantalla sin escribirle regla y esto sigue verde, pero se
   * cae la de la cinta que dice quién pinta el raíl: son dos mitades de la misma cuenta y
   * están a propósito en dos sitios.
   */
  comprobar(
    'en esta pantalla no hay regla de raíl que valga, porque no hay raíl: se ha ido entero al cajón que abre la ficha de mis puntos, y la hoja no le escribe nada bajo `:has(.riberas-lienzo)`',
    reglaDe(`${RAIZ} .rail`).length === 0 &&
      !new RegExp(`${RAIZ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{]*\\.rail`).test(hojaPelada),
    reglaDe(`${RAIZ} .rail`).replace(/\s+/g, ' '),
  );
  comprobar(
    'y la regla BASE del raíl se queda tal cual, anclada a la ventana: en el camino del respaldo y en los demás arcades el raíl vuelve a su columna y allí la página sí rueda entera',
    /max-height:\s*calc\(100vh - 2rem\)/.test(reglaDe('.rail')) && /position:\s*sticky/.test(reglaDe('.rail')),
    reglaDe('.rail').replace(/\s+/g, ' '),
  );
  /*
   * Y ALGUIEN TIENE QUE PODER RODAR, aunque el raíl ya no esté debajo. Con la página a la
   * altura exacta de la ventana la PÁGINA no rueda, y lo que sigue en flujo por debajo del
   * lienzo es el `<Formulario>` de lo que el tablero no enseña: pasar, aceptar, rechazar,
   * empezar. En un turno corriente son dos o tres botones; con el ESTIAJE por mover son
   * DIECIOCHO, y hasta veintitrés contando a quién se le roba. Con `overflow: hidden` esos
   * botones quedan fuera del recorte y sin manera de llegar a ellos: la mesa parada y ni un
   * error en ninguna consola. Se queda hasta que la cinta se lleve también los botones.
   */
  comprobar(
    'y la mesa rueda por dentro: los botones que el tablero no enseña siguen en flujo bajo el lienzo —hasta veintitrés con el estiaje— y sin esto quedarían fuera del recorte',
    /overflow:\s*hidden auto/.test(reglaDe(`${RAIZ} > .mesa-puesta`)),
    reglaDe(`${RAIZ} > .mesa-puesta`).replace(/\s+/g, ' '),
  );

  // ── 3. El título sale del flujo, y el foco se muda con él ──

  /*
   * EL `<h1>` SIGUE EN EL ÁRBOL. Se le quitan los 58,64 puntos y no el nodo: es el único
   * encabezado del documento en esta pantalla, y navegar por encabezados es como se recorre
   * una página con lector de pantalla. Borrarlo habría sido ganar el alto perdiendo el mapa.
   */
  const elTitulo = reglaDe(`${RAIZ} .el-mueble > .titulo`);
  comprobar(
    'el título sale del FLUJO, no del árbol: fuera de sitio y recortado, como la lista de apoyo, y no `display: none`',
    /position:\s*absolute/.test(elTitulo) && /clip-path:\s*inset\(50%\)/.test(elTitulo) && !/display:\s*none/.test(elTitulo),
    elTitulo.replace(/\s+/g, ' '),
  );
  comprobar(
    'y `sala.tsx` sigue pintando ese `<h1>` con el nombre del arcade dentro del mueble',
    /<h1 className="titulo" tabIndex=\{-1\} ref=\{tituloDeLaMesa\}>\s*\{manifiesto\.nombre\}/.test(laSala),
  );

  /*
   * ═══ Y EL FOCO, QUE ES LA MITAD QUE NO SE VE ═══
   *
   * Con el título invisible, el efecto que lleva el foco al sentarse aterrizaría en un
   * elemento que no se ve: aro de foco invisible con teclado y nada que anunciar con lector.
   * Así que el destino se pide por orden —el recuadro si lo hay, el título si no— y el «si
   * no» no es un caso raro: `RiberasEnTres` cae al retablo SVG sin `.glb`, sin WebGL o con
   * más colonos que colores, y allí no hay recuadro y el título vuelve a verse.
   */
  comprobar(
    'el foco al sentarse pide primero el recuadro y sólo si no lo hay el título: con el título invisible, aterrizar en él sería un aro que no ve nadie',
    /\(elLienzo\.current \?\? tituloDeLaMesa\.current\)\?\.focus\(\)/.test(laSala) && /foco=\{apuntarElLienzo\}/.test(laSala),
    /\(elLienzo[^\n]*/.exec(laSala)?.[0] ?? null,
  );
  /*
   * ═══ EL RESCATE, QUE ES EL CAMINO QUE NO SE MIRA ═══
   *
   * El modelo del delta tarda: mientras carga YA HAY recuadro, el foco aterriza ahí, y si el
   * `.glb` acaba fallando el recuadro se desmonta con el foco puesto y el navegador lo suelta
   * al `<body>`. Está medido en el banco con la ruta del modelo rota a propósito: el foco
   * acababa en `BODY`. Por eso la Sala no guarda el aviso a secas — mira si el recuadro que se
   * va es el que tiene el foco, ANTES de olvidarlo, y lo devuelve al título.
   *
   * SE COMPRA EL ORDEN Y NO LA FORMA DEL AVISO, que es lo que cambió al llegar el cajón: el
   * mismo aviso dice ahora además dónde vive el raíl (`ponerConLienzo`), y una expresión que
   * pegara las dos líneas se ponía roja por una tercera que no tiene nada que ver con el
   * foco. Lo único que aquí puede romperse en silencio son las posiciones: leer
   * `document.activeElement` DESPUÉS de olvidar el recuadro compara el recuadro nuevo con el
   * foco, o sea nunca acierta, y el foco se cae al `body` sin que se note.
   */
  const elAviso = sinComentarios(/const apuntarElLienzo = useCallback\([\s\S]*?\n {2}\}, \[\]\);/.exec(laSala)?.[0] ?? '');
  const seCompara = elAviso.indexOf('document.activeElement === elLienzo.current');
  const seOlvida = elAviso.indexOf('elLienzo.current = recuadro;');
  const seRescata = elAviso.indexOf('tituloDeLaMesa.current?.focus()');
  comprobar(
    'y si el recuadro se desmonta CON EL FOCO DENTRO —el modelo tarda y acaba fallando— la Sala lo rescata al título en vez de dejarlo caer al `body`: mira quién tiene el foco ANTES de olvidar el recuadro, y lo devuelve DESPUÉS',
    elAviso.includes('const seLoLlevaPuesto') &&
      seCompara > 0 &&
      seOlvida > seCompara &&
      seRescata > seOlvida &&
      /if \(seLoLlevaPuesto\) tituloDeLaMesa\.current\?\.focus\(\);/.test(elAviso),
    elAviso.replace(/\s+/g, ' ').slice(0, 400),
  );
  /*
   * Y EL PINTOR AVISA ANTES DE LA GUARDA DEL `ResizeObserver`. Detrás de ella el aviso se
   * perdería exactamente donde más falta hace —un navegador sin observador, una prueba en
   * Node— y el foco volvería a caer al `body` sin que fallara nada.
   */
  const elRef = /const medirElRecuadro = useCallback\([\s\S]*?\n {2}\}, \[foco\]\);/.exec(fuente)?.[0] ?? '';
  comprobar(
    'y el pintor avisa del recuadro ANTES de la guarda del `ResizeObserver`, o el destino se perdería justo donde no hay observador',
    elRef.length > 0 && elRef.indexOf('foco?.(recuadro)') > 0 && elRef.indexOf('foco?.(recuadro)') < elRef.indexOf("typeof ResizeObserver === 'undefined'"),
    elRef.slice(0, 400).replace(/\s+/g, ' '),
  );

  /*
   * ── 4. Y LO QUE SE OYE AL ATERRIZAR, contado sobre el HTML de verdad ──
   *
   * Un `<div>` enfocado y sin nombre se anuncia como nada: quien acaba de sentarse oiría
   * silencio en el único momento de esta pantalla que hay que anunciar. Y el nombre sale del
   * manifiesto, no de una cadena escrita en el pintor, para que el día que otro arcade estrene
   * delta no se le anuncie como Riberas.
   */
  const riberas = elCatalogoQuePublicaElServidor().find((m) => m.id === 'riberas');
  comprobar('Riberas está instalado', riberas !== undefined);
  if (riberas === undefined) return;
  const { vista, opciones } = laProyeccionDeVerdad();
  const tablero = tableroDeLaVista(vista);
  comprobar('y su proyección trae tablero declarado', tablero !== null);
  if (tablero === null) return;
  const puesta = mesaPuestaDe(sentadosDePrueba(2), vista, opciones);
  const html = renderToStaticMarkup(
    <RiberasEnTres manifiesto={riberas} mesa={unaMesa('dentro', puesta)} puesta={puesta} tablero={tablero} opciones={opciones} />,
  );
  const elRecuadro = /<div class="riberas-lienzo"[^>]*>/.exec(html)?.[0] ?? '';
  comprobar(
    'el recuadro puede recibir el foco sin entrar en el orden del tabulador',
    elRecuadro.includes('tabindex="-1"'),
    elRecuadro,
  );
  comprobar(
    'y se anuncia con el nombre que publica el manifiesto, no con uno escrito en el pintor',
    elRecuadro.includes(`aria-label="${riberas.nombre}`) && !fuente.includes('aria-label="Riberas'),
    elRecuadro,
  );
}

/**
 * ═══ LA CINTA Y EL CAJÓN: TODO LO QUE ESTABA FUERA DEL LIENZO, DENTRO DEL LIENZO ═══
 *
 * Miguel pidió que la partida entrara en la pantalla. La página de pie le dio al delta la
 * ventana entera menos la cabecera; lo que faltaba era que al ganar ese alto no se PERDIERA
 * nada, y lo que vivía fuera del recuadro era casi todo: el aviso del turno, el marcador con
 * el color de cada colono, el código de la mesa, el reloj del plazo, los seis paneles que
 * declara el juego —entre ellos «Lo mío», que es el único sitio donde se leen mis bienes por
 * clase, y «Trueques», que es el único que enseña las propuestas—, las dos salidas y la
 * crónica. Un tablero grande sin nada de eso no es la pantalla completa: es media partida.
 *
 * Así que la cinta se lleva la línea de estado al canto de arriba del lienzo y el cajón se
 * lleva el raíl entero debajo de ella. Lo que esta sección compra es lo que se rompe SIN
 * ERROR al hacerlo:
 *
 *   1. QUE LA FRASE SE QUEDE EN TRES LETRAS. La cinta es el tercio central del lienzo, y en
 *      los lienzos estrechos ese tercio menos dos botones de 44 no es una frase recortada:
 *      es una raya. No falla nada; el aviso del turno deja de leerse y ya está.
 *   2. QUE LA CINTA TAPE UNA CARTA. Es una caja opaca sobre el lienzo y a los lados están
 *      las dos manos, que se ARRASTRAN. Eso lo mide `verify:escena` contra las manos de
 *      verdad; aquí se compra que el ancho que se PINTA sea el que allí se mide.
 *   3. QUE EL CAJÓN NO SEA MODAL DE VERDAD. Un diálogo del que el tabulador se escapa, o que
 *      al cerrarse suelta el foco al `body`, o cuyo velo deja pasar el clic al tablero —y
 *      entonces cerrar el marcador funda una choza donde estaba el dedo—.
 *   4. QUE EL RAÍL SE PINTE DOS VECES O NINGUNA. Vive en el cajón cuando hay lienzo y en su
 *      `<aside>` cuando el pintor cae al retablo. Las dos a la vez son dos crónicas, dos
 *      códigos de mesa y dos botones de «Tirar la mesa»; ninguna es la partida sin datos.
 *   5. QUE EL DEDO NO PUEDA DESPLAZARLO. `.riberas-lienzo` lleva `touch-action: none` para
 *      que el navegador no se lleve el gesto del delta, y el cajón es descendiente suyo: sin
 *      devolvérselo, con el dedo se ve el marcador y no se llega a la crónica. En un monitor
 *      no se nota, y no hay error en ninguna consola.
 *
 * ═══ LO QUE ESTO NO COMPRA ═══
 *
 * Que el cajón ABIERTO se vea bien: se abre pulsando, y en Node no hay quien pulse. De él se
 * compra lo que se puede leer sin navegador —el orden del raíl, la trampa de foco, el velo,
 * las reglas de la hoja— y lo demás está medido con los ojos y anotado en el informe.
 */
function laCintaYElCajon(): void {
  paso('La cinta y el cajón: la línea de estado no se queda en tres letras, y el raíl entero cabe dentro del lienzo');

  const fuente = readFileSync(new URL('../src/riberas-en-tres.tsx', import.meta.url), 'utf8');
  const laSala = readFileSync(new URL('../src/sala.tsx', import.meta.url), 'utf8');
  const hoja = readFileSync(new URL('../src/estilo.css', import.meta.url), 'utf8');
  /* Sin comentarios las dos, por lo de siempre: esta casa NOMBRA lo prohibido para explicarlo. */
  const codigo = sinComentarios(fuente);
  /*
   * Y LA HOJA SE GUARDA CON FIN DE LÍNEA DE WINDOWS, así que un selector de DOS renglones
   * —los dos botones de la cinta comparten regla— no casa con un salto pelado: hay un
   * retorno de carro delante. Se normaliza antes de buscar, o la regla existe y esto dice
   * que no está, que es la peor manera de ponerse rojo.
   */
  const hojaPelada = hoja.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const reglaDe = (selector: string): string => {
    const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escapado}\\s*\\{([^}]*)\\}`, 'm').exec(hojaPelada)?.[1] ?? '';
  };
  const enRem = (puntos: number): string => `${String(puntos / 16)}rem`;
  const reglaDeLosBotones = reglaDe('.riberas-cinta-salir,\n.riberas-cinta-ficha');

  // ── 1. La cinta se pinta, y lo que pinta es el aviso del juego ──

  const riberas = elCatalogoQuePublicaElServidor().find((m) => m.id === 'riberas');
  comprobar('Riberas está instalado', riberas !== undefined);
  if (riberas === undefined) return;
  const { vista, opciones } = laProyeccionDeVerdad();
  const tablero = tableroDeLaVista(vista);
  comprobar('y su proyección trae tablero declarado', tablero !== null);
  if (tablero === null) return;
  const puesta = mesaPuestaDe(sentadosDePrueba(2), vista, opciones);
  const html = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', puesta)}
      puesta={puesta}
      tablero={tablero}
      opciones={opciones}
      laSalida="/sala/"
      elRail={<p className="el-rail-de-prueba">el raíl</p>}
    />,
  );

  /*
   * EL AVISO SE HA MUDADO, NO SE HA DUPLICADO. Estaba en un `<p class="aviso-del-tablero">`
   * EN FLUJO por encima del recuadro —29 puntos más su hueco que se le restaban al tablero en
   * todas las ventanas—. Ahora lo pinta la cinta, DENTRO del recuadro. Pintarlo en los dos
   * sitios no daría error y sería peor que no pintarlo: son dos regiones vivas con el mismo
   * texto, o sea que cada jugada ajena se anunciaría DOS VECES a quien usa lector.
   */
  comprobar(
    'el aviso del turno lo pinta la cinta y ya no el `<p>` en flujo de encima del recuadro: una sola región viva, o cada jugada ajena se anunciaría dos veces',
    html.includes('riberas-cinta-frase') &&
      !html.includes('aviso-del-tablero') &&
      palabrasDe(html).includes(tablero.aviso),
    { aviso: tablero.aviso, cinta: /<p class="riberas-cinta-frase"[^>]*>[^<]*/.exec(html)?.[0] ?? null },
  );
  const laFrase = /<p class="riberas-cinta-frase"[^>]*>/.exec(html)?.[0] ?? '';
  comprobar(
    'y la frase es región viva y lleva el texto ENTERO en el árbol aunque en pantalla se recorte: `aria-live="polite"` y el `title` con lo que dice',
    laFrase.includes('aria-live="polite"') && laFrase.includes(`title="${tablero.aviso}"`),
    laFrase,
  );
  /*
   * Y SE RECORTA CON PUNTOS SUSPENSIVOS, NO CRECIENDO. Crecer a dos renglones metería la
   * cinta por dentro de la franja de la mano del mazo, que es de lo que va el ancho medido en
   * `escenas/cinta.ts`. `min-width: 0` NO es adorno: un hijo de flex no baja de su ancho de
   * contenido, así que sin él la frase larga EMPUJA la cinta y se lleva por delante el ancho
   * medido en vez de recortarse. No se ve como un texto que no cabe: se ve como una cinta que
   * cambia de tamaño sola.
   */
  const reglaDeLaFrase = reglaDe('.riberas-cinta-frase');
  comprobar(
    'la frase se recorta con puntos suspensivos en un renglón, y con `min-width: 0`, sin el cual empujaría la cinta en vez de recortarse',
    /text-overflow:\s*ellipsis/.test(reglaDeLaFrase) &&
      /white-space:\s*nowrap/.test(reglaDeLaFrase) &&
      /overflow:\s*hidden/.test(reglaDeLaFrase) &&
      /min-width:\s*0/.test(reglaDeLaFrase),
    reglaDeLaFrase.replace(/\s+/g, ' '),
  );
  /*
   * LA CINTA VA FUERA DE `conMundo`, como la lista de las explicaciones y por lo mismo: no
   * necesita mundo. Mientras el modelo se descarga ya hay aviso que leer y ya hay marcador que
   * abrir —el telón tapa el tablero, no la partida—, y de paso esto se puede renderizar en
   * Node, que es lo que permite que estas comprobaciones miren el HTML de verdad.
   */
  comprobar(
    'y se pinta sin mundo: aquí no hay `<canvas>` ninguno y la cinta está, porque mientras el modelo baja ya hay turno que leer y marcador que abrir',
    !html.includes('<canvas') && html.includes('class="riberas-cinta"'),
    html.slice(0, 200),
  );

  // ── 2. El ancho no está en la hoja: lo pone la función que `verify:escena` mide ──

  /*
   * NI UNA FRACCIÓN ESCRITA EN LA HOJA. `anchoDeLaCinta` da el tercio en apaisado y el 40 %
   * de pie, y `verify:escena` mide esos dos números contra las dos manos abiertas en los
   * quince lienzos con un suelo de quince puntos de aire. Un porcentaje escrito en el CSS
   * sería un SEGUNDO reparto: el día que la franja de las cartas se ensanche, allí se pondría
   * rojo y aquí la cinta seguiría tapando el canto de una carta sin que nada fallara.
   */
  const reglaDeLaCinta = reglaDe('.riberas-cinta');
  comprobar(
    'el ancho de la cinta no está en la hoja: lo pone `elEstiloDeLaCinta` con lo que dice `anchoDeLaCinta`, que es lo que `verify:escena` mide contra las dos manos',
    !/width:/.test(reglaDeLaCinta) &&
      codigo.includes('style={elEstiloDeLaCinta(laCinta)}') &&
      codigo.includes('loQueLlevaLaCinta('),
    reglaDeLaCinta.replace(/\s+/g, ' '),
  );
  comprobar(
    'y `elEstiloDeLaCinta` pone ese número en el `width` y en nada más; con el lienzo sin medir no pone estilo y manda la hoja',
    JSON.stringify(elEstiloDeLaCinta({ ancho: 115.2 })) === '{"width":"115px"}' &&
      elEstiloDeLaCinta({ ancho: 0 }) === undefined,
    elEstiloDeLaCinta({ ancho: 115.2 }),
  );
  /*
   * Y EL ALTO SÍ ESTÁ EN LA HOJA, porque el suelo de toque se escribe en `rem` en esta casa
   * (`enRem`, la misma cuenta con la que se escriben el lado y el margen de
   * `MANDO_DE_RECOGER`). Lo que se compra es que diga el mismo número que `ALTO_DE_LA_CINTA`,
   * que es el que `elCartelQueCabe` le RESTA a la banda del cartel de los naipes: una cinta
   * que crezca sin que aquella cuenta se entere le mete el cartel por debajo del vidrio.
   */
  comprobar(
    'el alto de la cinta y el lado de sus botones los escribe la hoja en `rem`, y son los mismos 44 puntos que dice `escenas/cinta.ts`: 2,75rem',
    reglaDeLaCinta.includes(`height: ${enRem(ALTO_DE_LA_CINTA)};`) &&
      reglaDeLosBotones.includes(`width: ${enRem(BOTON_DE_LA_CINTA)};`) &&
      reglaDeLosBotones.includes(`height: ${enRem(BOTON_DE_LA_CINTA)};`),
    { cinta: reglaDeLaCinta.replace(/\s+/g, ' '), botones: reglaDeLosBotones.replace(/\s+/g, ' ') },
  );
  comprobar(
    'y el cartel de los naipes le resta ese alto a su banda antes de partirla, LAS TIRAS QUE HAYA: sin eso el cartel crece hacia arriba y se mete debajo del vidrio de la cinta',
    /const altoLibre = techoDelAsa - AIRE_SOBRE_EL_ASA - altoDeLaCinta\(conCarril\);/.test(codigo),
  );
  /*
   * Y LAS DOS TIRAS SON 88 EN PUNTOS Y 5,5rem EN LA HOJA, QUE ES LA MISMA COSA DICHA DOS
   * VECES. `altoDeLaCinta(true)` es lo que la cuenta del cartel resta; `5.5rem` es donde
   * arranca el cajón cuando hay carril. Si dejan de decir lo mismo, o el cajón se mete por
   * debajo del carril —y el primer renglón de la lista se lee a través de los cuadrados— o el
   * cartel crece hasta debajo del vidrio. Ninguna de las dos da error.
   */
  comprobar(
    'y las dos tiras dicen lo mismo en los dos sitios: 88 puntos en la cuenta del cartel y `5.5rem` en la hoja, que es como esta casa escribe esos 88',
    altoDeLaCinta(true) === 2 * ALTO_DE_LA_CINTA &&
      altoDeLaCinta(false) === ALTO_DE_LA_CINTA &&
      reglaDe('.riberas-carril').includes(`top: ${enRem(ALTO_DE_LA_CINTA)};`) &&
      reglaDe('.riberas-carril').includes(`height: ${enRem(ALTO_DE_LA_CINTA)};`) &&
      reglaDe('.riberas-cajon-bajo-el-carril').includes(`top: ${enRem(altoDeLaCinta(true))};`),
    {
      carril: reglaDe('.riberas-carril').replace(/\s+/g, ' ').slice(0, 200),
      cajon: reglaDe('.riberas-cajon-bajo-el-carril').replace(/\s+/g, ' '),
      enPuntos: altoDeLaCinta(true),
    },
  );
  /*
   * ═══ Y LOS TRES TROZOS DE LA CINTA MIDEN LO QUE LA CUENTA DICE, QUE ES LO QUE SE ROMPE ═══
   *
   * `loQueLlevaLaCinta` reparte el ancho en botón + frase + botón. Todo lo que la hoja añada
   * a los lados —un hueco entre los tres, un relleno, un botón que crece con su contenido—
   * sale del trozo de la frase SIN QUE LA CUENTA SE ENTERE. MEDIDO en el navegador con un
   * lienzo de 522,6×130,2: con `gap: 0.25rem` y `padding: 0 0.25rem` la cuenta decía 80,5
   * puntos de frase y la caja pintada medía 63,5, o sea dos letras menos. No se ve como un
   * error: se ve como que el aviso se recorta antes de tiempo.
   *
   * Y los botones miden `width` y no `min-width`: la ficha de mis puntos lleva dentro el raíl
   * de color y la cifra, y con `min-width` crecía con ellos, otra vez a costa de la frase.
   */
  comprobar(
    'la cinta no añade hueco ni relleno a los lados y sus botones miden un ancho FIJO: lo que la hoja añada sale del trozo de la frase sin que la cuenta se entere, y son dos letras medidas',
    /gap:\s*0;/.test(reglaDeLaCinta) &&
      /padding:\s*0;/.test(reglaDeLaCinta) &&
      /padding:\s*0;/.test(reglaDeLosBotones) &&
      !/min-width/.test(reglaDeLosBotones),
    { cinta: reglaDeLaCinta.replace(/\s+/g, ' '), botones: reglaDeLosBotones.replace(/\s+/g, ' ') },
  );

  // ── 3. LA FRASE CONSERVA SUS OCHO LETRAS EN LOS DIECIOCHO LIENZOS ──

  /*
   * ═══ EL SUELO DE OCHO LETRAS, Y POR QUÉ ES ESTA COMPROBACIÓN Y NO OTRA ═══
   *
   * La frase de la cinta es la ÚNICA línea de estado de la pantalla: dice de quién es el
   * turno y en qué paso está. Recortada con puntos suspensivos sigue sirviendo; por debajo de
   * ocho letras deja de ser una frase recortada y pasa a ser una raya —con tres no se
   * distingue «Te…» de «Tu…»—, y ocho es lo que hace falta para que se vea la primera PALABRA
   * de las que escribe `avisoDe`: «Te toca», «Turno de», «Coloca», «Gana», «El delta».
   *
   * SE MIDE CON LO QUE ESTE CLIENTE PINTA DE VERDAD: la raíz de la casa (17, no los 16 de un
   * navegador de serie), su cuerpo de `0.82rem`, su ancho de letra de 0,6 del cuerpo y sus
   * botones de 46,75 puntos —los 44 de `escenas/cinta.ts` escritos `2.75rem`—. Con los 44 a
   * secas la cuenta se equivoca en casi tres puntos por botón, y el error se abre justo para
   * quien tiene la letra grande, que es el que peor lo lleva.
   *
   * Y ESTO SE PONE ROJO SI ALGUIEN ENSANCHA LA CINTA, LA ESTRECHA, SUBE EL CUERPO DE LA LETRA
   * O CAMBIA EL SUELO DE TOQUE. Es la comprobación que no dejaba escribir la cinta como el
   * diseño la tenía: el §2.2 da el hueco como el tercio menos ochenta y ocho, y lo da por
   * bueno porque su lienzo más estrecho es un teléfono de 320; este cliente da lienzos de 288.
   */
  const raizDeLaCasa = 17;
  const anchoDeLetra = 0.82 * raizDeLaCasa * 0.6;
  const huecoDeOcho = huecoMinimoDeLaFrase(raizDeLaCasa);
  const botonPintado = ladoDelBotonDeLaCinta(raizDeLaCasa);
  comprobar(
    'las ocho letras y el botón se miden con lo que esta casa pinta: 8,364 puntos por letra (66,9 las ocho) y botones de 46,75, que son los 44 de `escenas/cinta.ts` escritos `2.75rem`',
    Math.abs(anchoDeLetra - 8.364) < 0.001 &&
      Math.abs(huecoDeOcho - 66.912) < 0.001 &&
      Math.abs(botonPintado - 46.75) < 0.001,
    { letra: anchoDeLetra, ocho: huecoDeOcho, boton: botonPintado },
  );

  const letrasPorLienzo = new Map<string, number>();
  const salidaFuera: string[] = [];
  const cortas: string[] = [];
  for (const [nombre, ancho, alto] of LIENZOS) {
    const cinta = loQueLlevaLaCinta(ancho, alto, huecoDeOcho, botonPintado);
    const letras = Math.floor(cinta.hueco / anchoDeLetra);
    letrasPorLienzo.set(nombre, letras);
    if (!cinta.salidaDentro) salidaFuera.push(`${nombre} (${String(ancho)}×${String(alto)})`);
    if (letras < 8) cortas.push(`${nombre}: ${String(letras)} letras (${cinta.hueco.toFixed(1)} pt)`);
  }
  comprobar(
    'a la frase le quedan OCHO letras o más en los dieciocho lienzos, el 288×420 incluido: es el suelo por debajo del cual una línea de estado recortada deja de ser una frase',
    cortas.length === 0 && letrasPorLienzo.size === LIENZOS.length,
    cortas.length > 0 ? cortas : [...letrasPorLienzo.entries()].filter(([, l]) => l <= 9),
  );
  /*
   * ═══ Y EL LIENZO MÁS ESTRECHO QUE ESTE DOCUMENTO ADMITE NO ES EL DE LA LISTA ═══
   *
   * La lista se comparte con el móvil y mide 288 de lienzo, que es el redondeo hacia arriba de
   * lo que sale de la ventana más estrecha admitida: el suelo de documento de WCAG 1.4.10 son
   * 320 puntos, `.dentro` se lleva 17 por lado y quedan 286. MEDIDO en el navegador con la
   * ventana en 320: lienzo de 286, cinta de 114 y frase de 67,25 puntos, o sea 8,04 letras.
   * Pasa por 0,04 letras, y eso hay que decirlo: no hay margen ninguno ahí, y quien toque el
   * cuerpo de la letra, el relleno de `.dentro` o el reparto de la cinta se lo lleva por
   * delante. Se mide el 286 aparte del 288 justamente por eso.
   */
  const enElSuelo = loQueLlevaLaCinta(286, 355, huecoDeOcho, botonPintado);
  comprobar(
    'y en el lienzo que sale de la ventana más estrecha que este documento admite —320 puntos de WCAG 1.4.10, o sea 286 de lienzo— la frase llega a ocho letras por los pelos: 67,25 puntos contra 66,91',
    Math.abs(enElSuelo.ancho - 114.4) < 0.1 &&
      !enElSuelo.salidaDentro &&
      enElSuelo.hueco >= huecoDeOcho &&
      enElSuelo.hueco - huecoDeOcho < anchoDeLetra,
    { hueco: enElSuelo.hueco, ocho: huecoDeOcho, sobra: enElSuelo.hueco - huecoDeOcho },
  );
  /*
   * ═══ LA TERCERA RAMA, QUE EL DISEÑO NO TENÍA, Y CÓMO SE DECIDE ═══
   *
   * A 288 de lienzo la cinta vale 115,2 y, con los DOS botones, a la frase le quedan 21,7
   * puntos: dos letras y media. Ensancharla no lo arregla —el techo antes de comerse los
   * quince puntos de aire a la mano del mazo son 122,8, y `verify:escena` lo mide—, así que se
   * va uno de los tres. Y se decide POR UNA REGLA Y NO POR UN UMBRAL DE ANCHO: aquí estuvo
   * escrito «bajo 320», y estaba mal, porque a 320 de pie la frase tampoco llegaba. Lo que se
   * pregunta es si la FRASE conserva su hueco, y el que se va es el «‹».
   *
   * De los tres es el único que se puede ir: la ficha de mis puntos es la ÚNICA puerta del
   * cajón —o sea de todo lo que no cabe en la cinta— y la frase es la única línea de estado.
   * El «‹», en cambio, EXISTE DOS VECES en este cliente: la cabecera de la Sala se queda en
   * esta pantalla y su «Sala de Arcade» va exactamente al mismo sitio. De los tres, se va el
   * que ya está fuera — y por eso esto compra las dos mitades, la que lo saca y la que lo
   * conserva ahí.
   */
  comprobar(
    'y cuando no caben los tres el que se va es el «‹»: en siete de los dieciocho —los tres de 288, el 320×360, el 360×490 y los dos de 390— y en ninguno de ellos la frase baja de ocho letras',
    salidaFuera.length === 7 &&
      salidaFuera.every((l) => /\((288|320|360|390)×/.test(l)) &&
      salidaFuera.some((l) => l.includes('288×420')),
    salidaFuera,
  );
  comprobar(
    'y el «‹» que se va no deja a nadie encerrado: sale sólo cuando `loQueLlevaLaCinta` lo dice, y la cabecera de la Sala sigue en esta pantalla con su «Sala de Arcade» al mismo sitio',
    /\{laCinta\.salidaDentro && laSalida !== undefined \?/.test(codigo) &&
      /laSalida=\{`\$\{BASE\}\/\$\{sufijoDeSilla\(silla\)\}`\}/.test(laSala) &&
      laSala.includes('<a className="vuelta"'),
    /\{laCinta\.salidaDentro[^\n]*/.exec(codigo)?.[0] ?? null,
  );

  // ── 4. La ficha de mis puntos: el «≡» de la decisión 11, y la puerta del cajón ──

  const laFicha = /<button[^>]*class="riberas-cinta-ficha"[^>]*>/.exec(html)?.[0] ?? '';
  comprobar(
    'la ficha dice que abre algo y qué abre: `aria-expanded` y `aria-controls` con el identificador del cajón, que es lo único que anuncia que ahí dentro hay marcador',
    laFicha.includes('aria-expanded="false"') && /aria-controls="[^"]+"/.test(laFicha),
    laFicha,
  );
  /*
   * Y LEE MIS PUNTOS EN VOZ ALTA, porque en pantalla son un número al lado de un raíl de color
   * y un lector no ve ninguna de las dos cosas. Para un mirón que no está sentado no hay color
   * ni cifra —`yoEnElMarcador` es `null`— y entonces es «≡» a secas: no se inventa un cero que
   * no es de nadie.
   */
  comprobar(
    'y lleva mis puntos dentro del nombre, que es lo único que oye quien no ve el raíl de color; sin asiento no se inventa un cero de nadie',
    /aria-label="Marcador: \d+ puntos? a la vista/.test(laFicha) &&
      /yoEnElMarcador === null[\s\S]{0,140}CERRAR_EL_CAJON[\s\S]{0,60}ABRIR_EL_CAJON/.test(codigo),
    laFicha,
  );
  /*
   * ═══ EL «+N» DE LO OCULTO VA EN LA FICHA, Y CABE POR POCO ═══
   *
   * El §2.2 lo pide ahí: la ficha de mis puntos es el único sitio donde se lee el marcador
   * sin abrir el cajón, y lo que sólo cuento yo es justo el número que decide si voy
   * ganando. Estuvo escrito sólo dentro del cajón «porque no cabe», y no era verdad — pero
   * casi: la ficha mide el suelo de toque y ni un punto más, porque su ancho es el que
   * `loQueLlevaLaCinta` le resta al trozo de la frase.
   *
   * LA CUENTA, con lo peor que puede escribirse ahí —«12+5», dos dígitos públicos y uno
   * oculto— y el ancho de letra de la casa: raíl 4,25 + hueco 5,1 + «12» a 0,95rem + «+5» a
   * la letra mínima = 44,35 de los 46,75. Con el `1.1rem` que la ficha hereda se va a 47,35
   * y SE SALE. Por eso la cifra baja a `0.95rem`, y por eso esto se mide aquí en vez de
   * fiarse: el día que alguien la suba, la cifra se recorta en silencio (`overflow: hidden`)
   * y lo que se pierde es el número que decide la partida.
   */
  const cuerpoDeLaCifra = Number(/font-size:\s*([\d.]+)rem/.exec(reglaDe('.riberas-cinta-puntos'))?.[1] ?? '0');
  const laLetraMinima = Number(/--letra-minima:\s*max\((\d+)px/.exec(hojaPelada)?.[1] ?? '0');
  const anchoDelRail = Number(/width:\s*([\d.]+)rem/.exec(reglaDe('.riberas-cinta-rail'))?.[1] ?? '0') * raizDeLaCasa;
  const hueco = Number(/gap:\s*([\d.]+)rem/.exec(reglaDeLosBotones)?.[1] ?? '0') * raizDeLaCasa;
  /* «12+5»: dos dígitos con el cuerpo de la cifra y dos glifos con la letra mínima. */
  const loPeorQueCabe = anchoDelRail + hueco + 2 * cuerpoDeLaCifra * raizDeLaCasa * 0.6 + 2 * laLetraMinima * 0.6;
  /* El botón de la ficha, del `<button` que la abre hasta su cierre: el `aria-label` de dentro es el suyo y no el del recuadro. */
  const elBotonDeLaFicha = /<button\b[\s\S]*?className="riberas-cinta-ficha"[\s\S]*?<\/button>/.exec(codigo)?.[0] ?? '';
  comprobar(
    'el «+N» de lo oculto se pinta en la ficha, no sólo dentro del cajón: es el número que decide si voy ganando y es lo único del marcador que se lee sin abrir nada',
    elBotonDeLaFicha.includes('className="riberas-cinta-ocultos"') &&
      /const loOcultoDeLaFicha = useMemo\(/.test(codigo) &&
      elBotonDeLaFicha.includes('contándote lo oculto'),
    elBotonDeLaFicha.replace(/\s+/g, ' ').slice(0, 300),
  );
  comprobar(
    'y cabe en el suelo de toque por 2,4 puntos con lo peor que puede escribirse —«12+5»—, que es por lo que la cifra se pinta a 0,95rem y no con el 1,1rem de la cinta: con aquél se sale por 0,6',
    cuerpoDeLaCifra === 0.95 &&
      laLetraMinima === 13 &&
      loPeorQueCabe < botonPintado &&
      Math.abs(loPeorQueCabe - 44.35) < 0.2 &&
      anchoDelRail + hueco + 2 * 1.1 * raizDeLaCasa * 0.6 + 2 * laLetraMinima * 0.6 > botonPintado,
    { loPeorQueCabe, boton: botonPintado, conElCuerpoDeLaCinta: anchoDelRail + hueco + 2 * 1.1 * raizDeLaCasa * 0.6 + 2 * laLetraMinima * 0.6 },
  );
  comprobar(
    'y si algún día no cupiera, se recorta la cifra y no el reparto: la ficha tiene `overflow: hidden` y un ancho fijo',
    /overflow:\s*hidden/.test(reglaDeLosBotones),
    reglaDeLosBotones.replace(/\s+/g, ' '),
  );

  // ── 5. El cajón es modal de verdad ──

  /*
   * ═══ LAS CUATRO MITADES DE UN MODAL, Y LAS CUATRO SE ROMPEN CALLADAS ═══
   *
   * Lo que hay debajo del cajón no es una página: es un tablero donde se funda con un toque.
   * Un diálogo a medias ahí no se lee como «el diálogo está mal»: se lee como que la pantalla
   * hace cosas solas.
   */
  const elCajon = /<div\b[^>]*class="riberas-cajon"[^>]*>/.exec(html)?.[0] ?? '';
  comprobar(
    'el cajón nace cerrado: se abre pulsando la ficha y no está en el árbol hasta entonces',
    elCajon === '' && codigo.includes('const [cajonAbierto, ponerCajonAbierto] = useState(false);') && /\{cajonAbierto \? \(/.test(codigo),
    elCajon,
  );
  const elMarcado = /\{cajonAbierto \? \(([\s\S]*?)\n {8}\) : null\}/.exec(codigo)?.[1] ?? '';
  comprobar(
    'y cuando se abre es un `dialog` MODAL con nombre y capaz de recibir el foco: un `<div>` enfocado sin nombre se anuncia como nada, y sin `aria-modal` un lector sigue leyendo el tablero de debajo',
    /role="dialog"/.test(elMarcado) &&
      /aria-modal="true"/.test(elMarcado) &&
      /aria-label=\{EL_CARRIL_DE_LA_MESA\}/.test(elMarcado) &&
      /tabIndex=\{-1\}/.test(elMarcado),
    elMarcado.replace(/\s+/g, ' ').slice(0, 400),
  );
  /*
   * EL VELO ES LA MITAD QUE SE OLVIDA. Sin él, un clic fuera del cajón llega al tablero: se
   * cierra el cajón Y se funda una choza donde estaba el dedo. Cubre el recuadro entero y su
   * único trabajo es comerse ese clic. Va `aria-hidden` porque para un lector el cajón ya es
   * modal y un `<div>` sin texto en medio sólo sería ruido.
   */
  comprobar(
    'el velo tapa el recuadro entero y sólo cierra: sin él, un toque fuera del cajón cierra el marcador Y funda una choza donde estaba el dedo',
    /<div className=\{EL_VELO\} onClick=\{cerrarElCajon\} aria-hidden="true" \/>/.test(elMarcado) &&
      /inset:\s*0/.test(reglaDe('.riberas-velo')),
    { marcado: elMarcado.replace(/\s+/g, ' ').slice(0, 200), regla: reglaDe('.riberas-velo').replace(/\s+/g, ' ') },
  );
  /*
   * ═══ LA TRAMPA DE FOCO, Y POR QUÉ ESTE BLOQUE ESTÁ REESCRITO ENTERO ═══
   *
   * Lo que había aquí sacaba el CUERPO del oyente con una expresión regular y comprobaba que
   * dentro estuvieran escritas las palabras `Tab`, `shiftKey`, `preventDefault` y `Escape`.
   * Pasaba en verde, y la trampa se rompía sola en cuanto alguien jugaba: el oyente vivía EN
   * LA CAJA (`suya.addEventListener('keydown', …)`), y un `keydown` sólo llega ahí si el foco
   * está DENTRO. Basta pulsar una opción de «Lo que puedes hacer» para que no lo esté —la
   * lista cambia con la jugada, el botón pulsado desaparece, y el navegador suelta el foco al
   * `<body>`—: desde ahí ni el tabulador daba la vuelta ni `Escape` cerraba. Aquel texto no
   * miraba NI UNA VEZ dónde se engancha el oyente, que es lo único que decide si la trampa
   * existe, ni qué pasa con el foco caído, que es como se pierde.
   *
   * Ahora son tres cosas distintas y se compran por separado:
   *
   *   1. EL REPARTO, llamándolo. `loQueHaceLaTrampa` es una función pura y se le pasa la
   *      tabla entera de teclas y sitios del foco —la fila `fuera` incluida, que es la del
   *      fallo—. Esto no lee fuente: ejecuta.
   *   2. LA PILA, llamándola. Con dos cajas abiertas manda la de arriba, que es lo que la
   *      burbuja hacía sola cuando el oyente vivía en la caja y lo que un oyente en
   *      `document` se lleva por delante: sin pila, un `Escape` cerraría el menú Y el cajón.
   *   3. EL ENGANCHE, leyendo el gancho. Es lo único que no se puede llamar sin navegador, y
   *      es justo lo que faltaba: que el oyente esté en `document`, que NO esté en la caja,
   *      que `tecla` mire `caja.current` en el momento y que haya rescate del foco caído.
   */
  const filasDeLaTrampa: { tecla: { key: string; shiftKey: boolean }; foco: ElFocoDeLaTrampa; cuantos: number; sale: LoQueHaceLaTrampa }[] = [];
  const TODOS_LOS_SITIOS: ElFocoDeLaTrampa[] = ['fuera', 'la-caja', 'el-unico', 'el-primero', 'el-ultimo', 'dentro'];
  for (const foco of TODOS_LOS_SITIOS) {
    filasDeLaTrampa.push({ tecla: { key: 'Escape', shiftKey: false }, foco, cuantos: 3, sale: 'cerrar' });
  }
  comprobar(
    '`Escape` cierra la caja MIRE DONDE MIRE EL FOCO, y la fila que importa es `fuera`: el botón pulsado se desmonta, el navegador suelta el foco al `body`, y hasta hoy desde ahí la caja se quedaba sin salida',
    filasDeLaTrampa.every((f) => loQueHaceLaTrampa(f.tecla, f.foco, f.cuantos) === f.sale),
    filasDeLaTrampa.map((f) => `${f.foco}→${loQueHaceLaTrampa(f.tecla, f.foco, f.cuantos)}`).join(' · '),
  );
  const elTabulador: { foco: ElFocoDeLaTrampa; shift: boolean; sale: LoQueHaceLaTrampa }[] = [
    /* La vuelta de siempre, por los dos lados. */
    { foco: 'el-ultimo', shift: false, sale: 'al-primero' },
    { foco: 'el-primero', shift: true, sale: 'al-ultimo' },
    { foco: 'la-caja', shift: true, sale: 'al-ultimo' },
    /* Con un solo enfocable dentro, el primero y el último son el mismo y no se sale igual. */
    { foco: 'el-unico', shift: false, sale: 'al-primero' },
    { foco: 'el-unico', shift: true, sale: 'al-ultimo' },
    /* Y EL FOCO CAÍDO: el tabulador ENTRA en la caja en vez de irse a la cabecera de la Sala. */
    { foco: 'fuera', shift: false, sale: 'al-primero' },
    { foco: 'fuera', shift: true, sale: 'al-ultimo' },
    /* En medio de la lista no se toca nada: eso lo hace el navegador y lo hace bien. */
    { foco: 'dentro', shift: false, sale: 'nada' },
    { foco: 'dentro', shift: true, sale: 'nada' },
    { foco: 'el-primero', shift: false, sale: 'nada' },
    { foco: 'el-ultimo', shift: true, sale: 'nada' },
  ];
  comprobar(
    'el tabulador no se sale de la caja: da la vuelta por los dos lados, con un solo enfocable dentro, y CON EL FOCO CAÍDO AL `body` vuelve a entrar en vez de irse a la cabecera de la Sala',
    elTabulador.every((f) => loQueHaceLaTrampa({ key: 'Tab', shiftKey: f.shift }, f.foco, 3) === f.sale),
    elTabulador
      .map((f) => `${f.shift ? '⇧' : ''}Tab@${f.foco}→${loQueHaceLaTrampa({ key: 'Tab', shiftKey: f.shift }, f.foco, 3)}`)
      .join(' · '),
  );
  comprobar(
    'una caja sin nada enfocable dentro se queda el tabulador ella misma, y las demás teclas se le dejan al navegador',
    TODOS_LOS_SITIOS.every((foco) => loQueHaceLaTrampa({ key: 'Tab', shiftKey: false }, foco, 0) === 'a-la-caja') &&
      loQueHaceLaTrampa({ key: 'Tab', shiftKey: true }, 'dentro', 0) === 'a-la-caja' &&
      ['a', 'Enter', ' ', 'ArrowDown', 'Escape '].every(
        (key) => loQueHaceLaTrampa({ key, shiftKey: false }, 'dentro', 3) === 'nada',
      ),
    {
      sinEnfocables: loQueHaceLaTrampa({ key: 'Tab', shiftKey: false }, 'dentro', 0),
      unaLetra: loQueHaceLaTrampa({ key: 'a', shiftKey: false }, 'dentro', 3),
    },
  );
  /*
   * LA PILA, LLAMÁNDOLA. Con el oyente en `document` las DOS cajas oyen la misma tecla, así
   * que `Escape` cerraría el menú de elegir Y el cajón que hay debajo de un solo golpe. Con
   * el oyente en la caja eso lo repartía la burbuja sola; ahora lo reparte esto.
   */
  const cajaDeAbajo = {};
  const cajaDeArriba = {};
  const bajarLaDeAbajo = armarUnaTrampa(cajaDeAbajo);
  comprobar(
    'con una sola caja abierta, manda ella',
    mandaEstaTrampa(cajaDeAbajo) && !mandaEstaTrampa(cajaDeArriba),
    { abajo: mandaEstaTrampa(cajaDeAbajo), arriba: mandaEstaTrampa(cajaDeArriba) },
  );
  const bajarLaDeArriba = armarUnaTrampa(cajaDeArriba);
  comprobar(
    'y con el menú de elegir encima del cajón manda EL DE ARRIBA: sin esto, un `Escape` cerraría los dos de un golpe, que es lo que la burbuja repartía sola cuando el oyente vivía en la caja',
    mandaEstaTrampa(cajaDeArriba) && !mandaEstaTrampa(cajaDeAbajo),
    { abajo: mandaEstaTrampa(cajaDeAbajo), arriba: mandaEstaTrampa(cajaDeArriba) },
  );
  bajarLaDeArriba();
  bajarLaDeArriba();
  comprobar(
    'al cerrarse la de arriba manda otra vez la de abajo, y desarmar dos veces no se lleva por delante a nadie —que es lo que hace el modo estricto de React con todos los efectos—',
    mandaEstaTrampa(cajaDeAbajo) && !mandaEstaTrampa(cajaDeArriba),
    { abajo: mandaEstaTrampa(cajaDeAbajo), arriba: mandaEstaTrampa(cajaDeArriba) },
  );
  bajarLaDeAbajo();
  comprobar(
    'y sin ninguna abierta no manda nadie: la pila se vacía y no se queda una caja muerta comiéndose las teclas de la mesa',
    !mandaEstaTrampa(cajaDeAbajo) && !mandaEstaTrampa(cajaDeArriba),
    { abajo: mandaEstaTrampa(cajaDeAbajo), arriba: mandaEstaTrampa(cajaDeArriba) },
  );
  /*
   * Y EL ENGANCHE, QUE ES LO QUE NO SE PUEDE LLAMAR SIN NAVEGADOR Y ES DONDE ESTABA EL FALLO.
   * Se lee el gancho entero y se mira DÓNDE se engancha el oyente, no qué palabras lleva
   * dentro.
   */
  const elGanchoDeLaTrampa = /function usarLaTrampaDeFoco\([\s\S]*?\n\}\n/.exec(codigo)?.[0] ?? '';
  comprobar(
    'el oyente de teclas vive en `document` mientras la caja está abierta y NO en la caja: enganchado en la caja sólo oye lo que pasa con el foco dentro, y el foco se sale solo en cuanto una jugada cambia la lista de opciones',
    elGanchoDeLaTrampa.length > 0 &&
      /document\.addEventListener\('keydown', tecla\)/.test(elGanchoDeLaTrampa) &&
      /document\.removeEventListener\('keydown', tecla\)/.test(elGanchoDeLaTrampa) &&
      !/(?:suya|alArmar|dentro|caja\.current)\.addEventListener\(/.test(elGanchoDeLaTrampa),
    elGanchoDeLaTrampa.replace(/\s+/g, ' ').slice(0, 600),
  );
  comprobar(
    'y `tecla` decide por `caja.current` EN EL MOMENTO de la tecla, y no por el nodo que se capturó al armarla: si no, la trampa sigue mirando una caja que ya no está pintada',
    /const tecla = \(e: KeyboardEvent\): void => \{\s*const dentro = caja\.current;/.test(elGanchoDeLaTrampa) &&
      /if \(dentro === null \|\| !mandaEstaTrampa\(caja\)\) return;/.test(elGanchoDeLaTrampa) &&
      /loQueHaceLaTrampa\(e, dondeEstaElFoco\(dentro, lista\), lista\.length\)/.test(elGanchoDeLaTrampa),
    elGanchoDeLaTrampa.replace(/\s+/g, ' ').slice(0, 900),
  );
  comprobar(
    'y hay RESCATE del foco caído: un vigía mira la caja por dentro y, cuando el que tenía el foco se desmonta —que no dispara `blur` en ningún navegador—, se lo devuelve a la caja',
    /const vigia = new MutationObserver\(rescatar\);/.test(elGanchoDeLaTrampa) &&
      /vigia\.observe\(alArmar, \{ childList: true, subtree: true \}\);/.test(elGanchoDeLaTrampa) &&
      /vigia\.disconnect\(\);/.test(elGanchoDeLaTrampa) &&
      /if \(dondeEstaElFoco\(dentro, enfocables\(dentro\)\) === 'fuera'\) dentro\.focus\(\);/.test(elGanchoDeLaTrampa),
    elGanchoDeLaTrampa.replace(/\s+/g, ' ').slice(0, 900),
  );
  comprobar(
    'y `dondeEstaElFoco` sabe decir `fuera`, que es el sitio donde el foco acaba cuando lo sueltan al `body` y el único que las dos mitades del arreglo —la tecla y el rescate— tienen que reconocer',
    /if \(activo === null \|\| !dentro\.contains\(activo\)\) return 'fuera';/.test(elGanchoDeLaTrampa),
    elGanchoDeLaTrampa.replace(/\s+/g, ' ').slice(0, 900),
  );
  /*
   * ═══ Y LA TRAMPA ESTÁ ESCRITA UNA VEZ PARA LAS DOS CAJAS MODALES DEL RECUADRO ═══
   *
   * Dentro del recuadro hay TRES: el cajón del marcador, el menú de elegir —que desde
   * aquella fase también es modal— y el COMPONEDOR del trueque, que es la de esta. Las tres se
   * pintan encima de un tablero donde un toque funda una choza, así que las tres necesitan lo
   * mismo. Dos copias de una trampa de foco son dos que se separan el día que alguien arregle
   * una, y la que se queda rota es la que nadie mira —y «roto» aquí quiere decir que el
   * tabulador se va a la cabecera de la Sala con un modal opaco puesto encima, sin un error en
   * ninguna consola—. Se compra que el gancho exista y que lo llamen LAS TRES.
   *
   * Y el número es CUATRO y no tres porque una de las cuatro apariciones es la declaración de
   * la función. Las dos llamadas `(true, caja, alDejarlo)` son idénticas a propósito: la del
   * menú y la del componedor abren y cierran igual, y escribirlas distintas sería el primer
   * paso hacia dos trampas.
   */
  const quienLlamaALaTrampa = codigo.match(/usarLaTrampaDeFoco\(/g) ?? [];
  comprobar(
    'y la trampa de foco está escrita UNA vez y la usan las TRES cajas modales del recuadro —el cajón, el menú de elegir y el componedor—: dos copias se separan, y la que se rompe es la que nadie mira',
    /function usarLaTrampaDeFoco\(/.test(codigo) &&
      quienLlamaALaTrampa.length === 4 &&
      /usarLaTrampaDeFoco\(cajonAbierto, elCajon, cerrarElCajon\);/.test(codigo) &&
      (codigo.match(/usarLaTrampaDeFoco\(true, caja, alDejarlo\);/g) ?? []).length === 2,
    quienLlamaALaTrampa.length,
  );
  /*
   * Y AL CERRARLO EL FOCO VUELVE A LA FICHA QUE LO ABRIÓ. El cajón se DESMONTA al cerrarse, y
   * un elemento que se desmonta con el foco dentro lo suelta al `<body>`: quien juega con
   * teclado volvería a tabular desde la cabecera cada vez que mira el marcador. Es el mismo
   * fallo mudo que el rescate del recuadro de `sala.tsx`, en pequeño y una vez por consulta.
   */
  const alCerrar = sinComentarios(/const cerrarElCajon = useCallback\([\s\S]*?\n {2}\}, \[\]\);/.exec(fuente)?.[0] ?? '');
  comprobar(
    'al cerrarlo el foco vuelve a la ficha que lo abrió: el cajón se desmonta, y desmontarse con el foco dentro lo suelta al `body`',
    alCerrar.includes('laFichaDeMisPuntos.current?.focus()') && codigo.includes('ref={laFichaDeMisPuntos}'),
    alCerrar.replace(/\s+/g, ' '),
  );

  // ── 6. El cajón mide lo que la cinta, cuelga de ella, y se puede desplazar CON EL DEDO ──

  const reglaDelCajon = reglaDe('.riberas-cajon');
  comprobar(
    'el cajón mide lo que la cinta, y ese ancho tampoco está en la hoja: lo pone `elEstiloDelCajon` con el mismo reparto',
    !/^\s*width:/m.test(reglaDelCajon) &&
      codigo.includes('style={elEstiloDelCajon(laCinta)}') &&
      JSON.stringify(elEstiloDelCajon({ ancho: 115.2 })) === '{"width":"115px"}' &&
      elEstiloDelCajon({ ancho: 0 }) === undefined,
    reglaDelCajon.replace(/\s+/g, ' '),
  );
  /*
   * ═══ PERO CON UN SUELO, Y ES UNA DECISIÓN QUE HAY QUE COMPRAR ENTERA ═══
   *
   * MEDIDO con la ventana en 288×420 y los botones del turno debajo del lienzo: el recuadro se
   * queda en 254×203 —APAISADO, aunque la ventana sea de pie—, así que la cinta vale su tercio,
   * 84 puntos. Un cajón de 84 puntos no es un marcador estrecho: es un panel donde se lee «EL
   * MARCA…» y nada más. La partida entra en la pantalla y los datos no, que es lo contrario del
   * encargo.
   *
   * El ancho de la cinta es el que es por LAS DOS MANOS, que son cartas que se arrastran. Al
   * cajón esa razón no le aplica porque es MODAL: con él abierto hay un velo que se come los
   * punteros y no hay carta que arrastrar. Puede pasarles por encima mientras está abierto y se
   * cierra dejándolas donde estaban. El suelo es lo que un `.panel` pide para leerse, topado
   * por el ancho del recuadro menos los dos insets, así que nunca se sale del lienzo; y donde
   * la cinta ya es más ancha no ata nada.
   */
  comprobar(
    'y tiene un SUELO de ancho, porque es modal: con la ventana en 288×420 el recuadro sale apaisado y la cinta vale 84 puntos, donde el cajón sólo dice «EL MARCA…»; el velo se come los punteros, así que ahí puede pasar por encima de las manos',
    /min-width:\s*min\(calc\(100% - 1\.5rem\), 16rem\)/.test(reglaDelCajon),
    reglaDelCajon.replace(/\s+/g, ' '),
  );
  /*
   * ARRANCA AL PIE DE LA CINTA Y EN LA MISMA UNIDAD QUE ELLA. Este `top` estuvo escrito en el
   * pintor como `ALTO_DE_LA_CINTA` píxeles, y eran 2,75 puntos de menos: la cinta se pinta en
   * `rem` y con la raíz de esta casa mide 46,75, así que el cajón se le metía por debajo —y es
   * de vidrio, o sea que el primer renglón del marcador se leía a través de la frase del
   * turno—. Con los dos en `rem` crecen juntos con la preferencia de letra del navegador.
   */
  comprobar(
    'arranca al PIE de la cinta y en su misma unidad, y cuelga hasta el canto menos el inset: así es todo lo alto que el lienzo dé, en un monitor y en una ventana de 288×317',
    reglaDelCajon.includes(`top: ${enRem(ALTO_DE_LA_CINTA)};`) &&
      /bottom:\s*0\.75rem/.test(reglaDelCajon) &&
      !/height:/.test(reglaDelCajon) &&
      !/vh/.test(reglaDelCajon),
    reglaDelCajon.replace(/\s+/g, ' '),
  );
  /*
   * ═══ Y `touch-action: auto`, QUE ES EL QUE NO SE VE FALLAR EN UN MONITOR ═══
   *
   * `.riberas-lienzo` lleva `touch-action: none` para que el navegador no se lleve el gesto de
   * girar el delta. El cajón es descendiente suyo y lo hereda: sin devolvérselo, CON EL DEDO
   * NO SE PUEDE DESPLAZAR, o sea que se ve el marcador y no se llega a la crónica ni a las dos
   * salidas. Con ratón funciona, no hay error en ninguna consola, y es exactamente el dato
   * perdido que esta fase venía a recuperar.
   */
  comprobar(
    'el cajón se desplaza por dentro Y CON EL DEDO: el recuadro tiene `touch-action: none` por el gesto del delta y el cajón lo heredaría, así que la crónica quedaría fuera de alcance sin un error en ninguna consola',
    /overflow-y:\s*auto/.test(reglaDelCajon) &&
      /overscroll-behavior:\s*contain/.test(reglaDelCajon) &&
      /touch-action:\s*auto/.test(reglaDelCajon) &&
      /touch-action:\s*none/.test(reglaDe('.riberas-lienzo')),
    { cajon: reglaDelCajon.replace(/\s+/g, ' '), lienzo: reglaDe('.riberas-lienzo').replace(/\s+/g, ' ') },
  );

  // ── 7. El raíl entero, una sola vez, y en el orden del cajón ──

  /*
   * ═══ SE MONTA UNA VEZ Y VIVE EN DOS SITIOS ═══
   *
   * Con delta, el raíl va dentro del cajón; sin delta —el respaldo SVG, o cualquier otro
   * arcade— se queda en su `<aside>`. Quien decide cuál de los dos no es la Sala: es el propio
   * pintor, DENTRO de su render, y por eso lo dice con el mismo aviso con el que ya decía
   * dónde ha quedado su recuadro.
   *
   * DOS COPIAS SERÍAN DOS CRÓNICAS, dos códigos de mesa, dos regiones vivas diciendo lo mismo
   * y dos botones de «Tirar la mesa». Ninguna sería la partida sin la mitad de sus datos. Se
   * compra que se monte UNA vez, en un fragmento, y que el `<aside>` no salga cuando hay
   * lienzo.
   */
  comprobar(
    'el raíl se monta una sola vez, en `elRail`, y se le pasa entero al pintor: dos copias serían dos crónicas y dos botones de «Tirar la mesa»',
    /const elRail = \(\s*<>/.test(laSala) &&
      /elRail=\{elRail\}/.test(laSala) &&
      (laSala.match(/<LaCronica/g) ?? []).length === 1,
    (laSala.match(/<LaCronica/g) ?? []).length,
  );
  /*
   * ═══ Y LA CRÓNICA SE LLAMA POR LO QUE ES, QUE ES LA DECISIÓN QUE FALTABA ═══
   *
   * Jugando cuatrocientos movimientos el sondeo devolvió `avisos: []` de principio a fin, o
   * sea que esto daba `null` toda la partida y quedaba la duda de si estaba roto. NO LO ESTÁ:
   * es el registro DEL CANAL de la mesa, y el canal de un arcade dice UNA cosa —«Se acabó la
   * partida.»— y sólo al cerrarse. Eso lo mide `verify:mesa` jugando contra un servidor de
   * verdad y contando lo que ha salido por ahí después de veinte movimientos.
   *
   * La decisión, escrita entera en `LaCronica`: un arcade NO va a emitir un aviso por jugada
   * —lo que hay que contar ya tiene un sitio y una redacción— y la caja se QUEDA, porque ese
   * renglón único llega en el momento en que el tablero solo no explica nada. Lo que cambia es
   * el RÓTULO: «Lo que ha pasado» prometía el relato de la partida, y con esa promesa una caja
   * vacía se lee como un mueble roto.
   *
   * Aquí se compra que el rótulo no vuelva a prometerlo, que el encabezado y el nombre
   * accesible salgan de UNA cadena —dos copias se separan— y que con la crónica vacía no se
   * pinte nada, que es lo que hace que quedarse no cueste un punto del cajón.
   */
  comprobar(
    'la crónica se llama «Avisos de la mesa» y no «Lo que ha pasado»: es el registro del canal —que dice una cosa, y al final— y no el relato de la partida, y con aquel rótulo la caja vacía se leía como un mueble roto',
    /export const AVISOS_DE_LA_MESA = 'Avisos de la mesa';/.test(laSala) &&
      !laSala.includes('>Lo que ha pasado<') &&
      !laSala.includes('aria-label="Lo que ha pasado"') &&
      (laSala.match(/\{AVISOS_DE_LA_MESA\}/g) ?? []).length === 2,
    (laSala.match(/\{AVISOS_DE_LA_MESA\}/g) ?? []).length,
  );
  comprobar(
    'y con la crónica vacía no se pinta NADA —ni rótulo ni caja—, que es lo que hace que quedarse en el cajón no cueste un punto mientras el canal calla',
    /function LaCronica\(\{ mesa \}: \{ mesa: LaMesa \}\): JSX\.Element \| null \{\s*if \(mesa\.cronica\.length === 0\) return null;/.test(
      sinComentarios(laSala),
    ),
    /function LaCronica[\s\S]{0,200}/.exec(sinComentarios(laSala))?.[0]?.replace(/\s+/g, ' ') ?? null,
  );
  comprobar(
    'y el `<aside>` sólo se pinta cuando NO hay lienzo: quien lo dice es el aviso del pintor, porque él decide dentro de su render si cae al retablo',
    /\{conLienzo \? null : \(\s*<aside className="rail"/.test(laSala) &&
      /const \[conLienzo, ponerConLienzo\] = useState\(false\);/.test(laSala) &&
      /ponerConLienzo\(recuadro !== null\);/.test(laSala),
    /\{conLienzo[^\n]*/.exec(laSala)?.[0] ?? null,
  );
  /*
   * EL ORDEN DEL CAJÓN NO ES EL DEL `<aside>`, y el cambio es del §1.11: en una columna que se
   * ve entera el orden daba igual; en un cajón que se abre y se cierra, el primer renglón es
   * el único que se lee sin desplazar. Va delante lo que se mira ANTES de decidir una jugada
   * —el marcador con lo de cada cual, y luego el código y el reloj—, después los paneles, y al
   * final las dos salidas y la crónica.
   */
  /*
   * SE MIDE SOBRE EL CÓDIGO Y NO SOBRE LOS COMENTARIOS: la cabecera del botón de
   * «Levantarse» explica en qué se diferencia del de «Tirar la mesa», o sea que NOMBRA al de
   * abajo dos párrafos antes de que exista. Sin pelar, el orden salía cruzado y esto se ponía
   * rojo por documentar bien.
   */
  const dentroDelRail = sinComentarios(/const elRail = \(([\s\S]*?)\n  \);/.exec(laSala)?.[1] ?? '');
  const sitios = ['<MarcadorDeRiberas', '<LaFicha', '<Paneles', 'Levantarse de la mesa', 'Tirar la mesa', '<LaCronica'];
  const posiciones = sitios.map((s) => dentroDelRail.indexOf(s));
  comprobar(
    'y dentro va, en este orden: el marcador, la ficha de la mesa con su código y su reloj, los paneles del juego, las dos salidas y la crónica',
    posiciones.every((p) => p >= 0) && posiciones.every((p, i) => i === 0 || p > (posiciones[i - 1] as number)),
    Object.fromEntries(sitios.map((s, i) => [s, posiciones[i]])),
  );
  /*
   * EL RELOJ ES LO QUE NO ESTABA EN EL §1.11 Y SÍ ESTÁ EN LA PANTALLA. `LaFicha` lo repinta
   * cada segundo con `cuantoQueda(venceEn − Date.now())`, y `avisoDe` no menciona el tiempo ni
   * una vez: en La Larga, con plazos de siete días, es el dato que decide si hay que jugar hoy.
   * Se va al cajón dentro de la ficha, sin tocarlo, así que lo que se compra aquí es que la
   * ficha que se lleva el cajón sea la que lo trae.
   */
  comprobar(
    'y el reloj del plazo se va con la ficha, que es donde vive: `avisoDe` no dice el tiempo ni una vez, y con plazos de días es el dato que decide si hay que jugar hoy',
    /cuantoQueda\(/.test(laSala) && dentroDelRail.includes('<LaFicha mesa={puesta} silla={silla} />'),
    dentroDelRail.slice(0, 200).replace(/\s+/g, ' '),
  );
  /*
   * LOS SEIS PANELES QUE EL JUEGO DECLARA, con «Lo mío» el primero y sin los bienes ajenos. Las
   * dos cosas las hace `panelesEnTres`, en `shared/`, donde `verify:riberas-en-tres` las mide
   * con los paneles de una partida de verdad. Aquí se compra que esta pantalla las use, y que
   * las use SÓLO para Riberas: los títulos por los que busca son los que escribe `panelesDe` de
   * Riberas, y otro arcade con un panel llamado «La mesa» no tiene por qué querer nada de esto.
   */
  /*
   * ═══ Y LA FICHA DE CADA COLONO SON DOS RENGLONES, QUE HAY QUE ESCRIBIRLO ═══
   *
   * El §1.11 pide fichas de 44 puntos con «vado L · N chozas · M torres» en el SEGUNDO
   * renglón. Eso lo daba la rejilla de tres columnas: `.lo-del-colono` se colaba a la fila de
   * abajo con su `grid-column: 1 / -1`. Al envolver el nombre y ese renglón en una caja
   * —para llevarse la ficha entera a `aria-hidden` y decir la frase completa una sola vez—
   * dejaron de ser hijos de la rejilla, y dos `<span>` seguidos fluyen en el MISMO renglón.
   *
   * VISTO EN EL NAVEGADOR, con el cajón abierto: «Alguien (tú)vado 1 de 5 · 2» y el resto
   * partido donde cayó. No falla nada, no hay error en ninguna consola y el texto está todo:
   * simplemente el marcador no se lee. Se ata la caja, sus dos renglones y el recorte.
   */
  const laFichaDelColono = reglaDe('.ficha-del-colono');
  comprobar(
    'la ficha de cada colono son DOS renglones y no dos `<span>` seguidos: al envolverlos para poder decir la frase una sola vez dejaron de ser hijos de la rejilla y el nombre se pegaba al vado',
    /flex-direction:\s*column/.test(laFichaDelColono) &&
      /min-width:\s*0/.test(laFichaDelColono) &&
      laFichaDelColono.includes(`min-height: ${enRem(44)};`),
    laFichaDelColono.replace(/\s+/g, ' '),
  );
  comprobar(
    'y los dos se recortan con puntos suspensivos en vez de ensanchar la columna y echar la cifra de puntos fuera del cajón; lo recortado se sigue oyendo entero en la lista de apoyo',
    /text-overflow:\s*ellipsis/.test(reglaDe('.ficha-del-colono > .nombre-del-colono,\n.ficha-del-colono > .lo-del-colono')) &&
      /class="riberas-solo-apoyo"/.test(renderToStaticMarkup(<MarcadorDeRiberas vista={vista} />)),
    reglaDe('.ficha-del-colono > .nombre-del-colono,\n.ficha-del-colono > .lo-del-colono').replace(/\s+/g, ' '),
  );
  /*
   * ═══ Y LO QUE SE SUELTA CUANDO NO CABE ES EL VADO, NO LAS TORRES ═══
   *
   * VISTO JUGANDO, con la ventana en 852×922 y el cajón en 313 puntos: el renglón salía «vado
   * 1 de 5 · 2 chozas · 0…». Los puntos suspensivos recortan por donde el texto acaba, y el
   * texto acaba en las TORRES — que es justo la cifra que la fase 0 subió al contrato del
   * marcador y que, con el marcador dentro del cajón, no está en ningún otro sitio de la
   * pantalla. El vado sí lo está: en su propio panel y en la frase que se oye.
   *
   * Se compra por las dos mitades y con las medidas de aquella ventana, y no con un umbral
   * elegido a ojo: con el cajón ancho el renglón sale ENTERO, y con el de 313 se cae el vado y
   * NO las torres. Soltando el trozo que no es, la primera mitad se pone roja.
   */
  const marcadorDeLaFicha = marcadorEnTres(vista);
  comprobar('la partida trae marcador y colonos, o esto no mediría ningún renglón', marcadorDeLaFicha?.colonos[0] !== undefined);
  const unColono = marcadorDeLaFicha?.colonos[0];
  if (marcadorDeLaFicha === null || unColono === undefined) return;
  /*
   * EL HUECO DE AQUELLA VENTANA, rehecho y no copiado: el cajón mide lo que la cinta, y de sus
   * 313 puntos se van su relleno (`1rem` a cada lado), el del panel (`1.25rem`) y el filo del
   * panel. Lo que queda es el ancho de la lista, que es lo que el pintor mide con su ojo.
   */
  const anchoDeLaLista = (ancho: number): number => ancho - 2 * RAIZ_DE_LA_CASA - 2 * (1.25 * RAIZ_DE_LA_CASA + 1);
  const conCajonDe = (ancho: number): string =>
    elRenglonDelColonoQueCabe(
      unColono,
      marcadorDeLaFicha,
      huecoDelRenglonDelColono(anchoDeLaLista(ancho), cifrasDeLosPuntos(unColono), RAIZ_DE_LA_CASA),
      RAIZ_DE_LA_CASA,
    );
  const construido = `${String(unColono.chozas)} ${unColono.chozas === 1 ? 'choza' : 'chozas'} · ${String(unColono.torres)} ${unColono.torres === 1 ? 'torre' : 'torres'}`;
  comprobar(
    'con el cajón de 313 puntos —el de la ventana de 852×922 donde se leyó «vado 1 de 5 · 2 chozas · 0…»— el renglón suelta EL VADO y se queda con las chozas y las TORRES, que es la cifra que no está en ningún otro sitio de la pantalla',
    conCajonDe(313) === construido && conCajonDe(313).endsWith(unColono.torres === 1 ? 'torre' : 'torres'),
    {
      hueco: +huecoDelRenglonDelColono(anchoDeLaLista(313), cifrasDeLosPuntos(unColono), RAIZ_DE_LA_CASA).toFixed(1),
      sale: conCajonDe(313),
    },
  );
  comprobar(
    'y con sitio de sobra sale ENTERO y con el vado delante: soltarlo siempre sería perder la cifra que le habría contestado a Miguel cuando encadenó cinco veredas y no le salió el premio',
    conCajonDe(640) === `${renglonDelVado(unColono, marcadorDeLaFicha)} · ${construido}` &&
      conCajonDe(640) !== conCajonDe(313),
    { ancho: conCajonDe(640), estrecho: conCajonDe(313) },
  );
  comprobar(
    'y sin medir —el primer render, y Node, donde no hay `ResizeObserver`— se pinta entero: un hueco de cero puntos no puede leerse como «no cabe nada»',
    huecoDelRenglonDelColono(0, 2) === 0 &&
      elRenglonDelColonoQueCabe(unColono, marcadorDeLaFicha, 0) === conCajonDe(640) &&
      renderToStaticMarkup(<MarcadorDeRiberas vista={vista} />).includes(renglonDelVado(unColono, marcadorDeLaFicha)),
    elRenglonDelColonoQueCabe(unColono, marcadorDeLaFicha, 0),
  );
  /*
   * Y LOS PUNTOS SE MIDEN POR SUS CIFRAS. «12+3» es cuatro veces «4», y con seis colonos esa
   * columna se lleva varias letras del renglón de al lado: medirla con un ancho fijo haría que
   * el renglón del que va ganando se recortara antes sin que nada lo dijera.
   */
  comprobar(
    'la columna de puntos se mide por sus CIFRAS y con el «+N» de lo oculto dentro: con un ancho fijo, el renglón del que va ganando se recortaría antes y nadie sabría por qué',
    cifrasDeLosPuntos({ ...unColono, puntos: 4, puntosConLoOculto: null }) === 1 &&
      cifrasDeLosPuntos({ ...unColono, puntos: 12, puntosConLoOculto: 12 }) === 2 &&
      cifrasDeLosPuntos({ ...unColono, puntos: 12, puntosConLoOculto: 15 }) === 4 &&
      huecoDelRenglonDelColono(200, 4) < huecoDelRenglonDelColono(200, 1),
    {
      solo: cifrasDeLosPuntos({ ...unColono, puntos: 12, puntosConLoOculto: 12 }),
      conOculto: cifrasDeLosPuntos({ ...unColono, puntos: 12, puntosConLoOculto: 15 }),
    },
  );
  comprobar(
    'los paneles que declara el juego van al cajón con «Lo mío» el primero y sin la cifra de bienes ajenos (decisión 17), y el criterio vive en `shared/`, no aquí',
    /panelesFueraDelPregon\(panelesEnTres\(pintado\.tablero\.paneles\), elPregonSePinta\)/.test(laSala.replace(/\s+/g, ' ')) &&
      /import \{ elPregonEnTres, panelesEnTres, panelesFueraDelPregon \} from '\.\.\/\.\.\/shared\/arcade\/juegos\/riberas-en-tres';/.test(laSala),
    /paneles=\{esRiberas[^\n]*/.exec(laSala)?.[0] ?? null,
  );

  // ── 8. EL CARRIL: UN SIETE NO DEJA LA MESA PARADA ──

  /*
   * ═══ EL AGUJERO QUE ESTE BLOQUE EXISTE PARA CERRAR, DICHO CON SUS NÚMEROS ═══
   *
   * Con el estiaje por mover, `opciones()` emite un destino POR ISLA —dieciocho— y uno más por
   * cada víctima de más: VEINTE en la mesa de tres que se jugó, y hasta veintitrés con los
   * colonos apretados. Y el delta no pinta ni uno: los veinte salen por la puerta de los
   * botones. Hasta esta fase esos botones eran `.opcion`
   * de 238 puntos de ancho EN FLUJO por debajo del lienzo, o sea 4.284 puntos de lista
   * colgando de un recuadro que ya vale la ventana entera menos la cabecera. Y mover la pieza
   * es OBLIGATORIO: no es una lista incómoda, es una mesa parada.
   *
   * Y NINGUNA COMPROBACIÓN SE PONÍA ROJA, que es la mitad que importa. Las que había —las del
   * bloque del mazo— miran la LISTA DE OPCIONES: que ninguna se pierda entre la barra, las dos
   * manos y los botones. Esa cuenta seguía saliendo bien con los veinte botones fuera de la
   * pantalla, porque estaban EN EL ÁRBOL. Nadie miraba si se podían alcanzar.
   *
   * Así que esto mira lo otro: que los veinte lleguen al CARRIL, dentro del recuadro, en
   * cuadrados del suelo de toque y con su nombre entero para quien no ve el número. Es
   * hermana del bloque 12 bis del mazo y se mide igual: con la partida de verdad, renderizando
   * el pintor de verdad, y contando sobre el HTML.
   */
  /*
   * ═══ Y SE MIDE EL CASO PEOR Y NO EL CÓMODO, QUE ES LO QUE ESTE BLOQUE CLAVABA ═══
   *
   * Aquí se pedían DIECIOCHO exactos, y la partida de verdad dio VEINTE: en una mesa jugada
   * las chozas se acaban tocando, y una isla con dos colonos alrededor emite una opción POR
   * VÍCTIMA. O sea que este bloque medía el reparto de laboratorio —una choza por colono, en
   * tres hexágonos separados— y nunca el que se da jugando; el encargo nombra hasta
   * veintitrés, y con más colonos apretados saldrán.
   *
   * Se miden los DOS repartos y se exige que el segundo dé más: el dieciocho sigue escrito
   * porque es el suelo —lo que da un reparto separado— y el veinte es el que tiene que caber
   * en la pantalla. Subir el número a secas habría dejado de decir por qué sube.
   */
  const conEstiajeSuelto = laProyeccionConMazo(3, { conElEstiajePorMover: true });
  const conEstiaje = laProyeccionConMazo(3, { conElEstiajePorMover: true, victimasJuntas: true });
  const tableroDelEstiaje = tableroDeLaVista(conEstiaje.vista);
  comprobar('la partida del estiaje trae tablero declarado, o esto no mediría nada', tableroDelEstiaje !== null);
  const sueltos = conEstiajeSuelto.opciones.filter((o) => o.tipo === 'riberas:estiaje');
  const destinos = conEstiaje.opciones.filter((o) => o.tipo === 'riberas:estiaje');
  comprobar(
    'con las chozas separadas el juego ofrece DIECIOCHO destinos —uno por isla— y con dos colonos alrededor de la misma isla VEINTE, que es lo que dio la partida de verdad: aquí se mide el caso peor y no el cómodo',
    sueltos.length === 18 && destinos.length === 20 && destinos.length > sueltos.length,
    { sueltos: sueltos.length, juntos: destinos.length },
  );
  if (tableroDelEstiaje !== null) {
    const puestaDelEstiaje = mesaPuestaDe(conEstiaje.sentados, conEstiaje.vista, conEstiaje.opciones);
    const htmlDelEstiaje = renderToStaticMarkup(
      <RiberasEnTres
        manifiesto={riberas}
        mesa={unaMesa('dentro', puestaDelEstiaje)}
        puesta={puestaDelEstiaje}
        tablero={tableroDelEstiaje}
        opciones={conEstiaje.opciones}
        laSalida="/sala/"
        elRail={<p className="el-rail-de-prueba">el raíl</p>}
      />,
    );
    const cuadrados = htmlDelEstiaje.split('class="riberas-carril-opcion').length - 1;
    comprobar(
      'los VEINTE se alcanzan desde la pantalla completa: uno por cuadrado en el carril de la cinta, DENTRO del recuadro y no en una lista debajo del lienzo que en pantalla completa no existe',
      cuadrados === destinos.length && htmlDelEstiaje.includes('class="riberas-carril"'),
      { cuadrados, destinos: destinos.length },
    );
    /*
     * Y NI UNO SOLO ES UN `.opcion` EN FLUJO. Es la mitad que se rompe sola si alguien
     * «arregla» la accesibilidad devolviendo la lista larga al pie: los veinte volverían a
     * estar en el árbol y fuera de la pantalla, y la cuenta de arriba seguiría cuadrando.
     */
    comprobar(
      'y ninguno vuelve como `.opcion` de 238 puntos debajo del lienzo: veinte de ésos son 4.760 puntos de lista colgando de un recuadro que ya vale la ventana entera',
      !htmlDelEstiaje.includes('class="opcion-rotulo"') && !htmlDelEstiaje.includes('class="formulario"'),
      /<div class="formulario"[\s\S]{0,120}/.exec(htmlDelEstiaje)?.[0] ?? null,
    );
    /*
     * CADA CUADRADO DICE SU DESTINO, aunque en pantalla ponga un número. En 44 puntos no cabe
     * «Mover el estiaje al cantil 10»; veinte botones llamados «1»…«20» no son veinte
     * movimientos distintos para quien navega con lector de pantalla, y sin esto el carril
     * sería accesible sólo para quien ve. El rótulo y la ayuda van en el árbol, recortados de
     * la vista con `clip-path` y nunca con `display: none`, que los lectores saltan.
     */
    const dichos = palabrasDe(htmlDelEstiaje);
    const mudos = destinos.filter((o) => !dichos.includes(o.rotulo) || !dichos.includes(o.ayuda));
    comprobar(
      'y cada cuadrado dice adónde va: su rótulo y su ayuda enteros en el árbol, recortados de la vista y no escondidos con `display: none`, o veinte botones llamados «1»…«20» no serían veinte movimientos',
      mudos.length === 0 &&
        (htmlDelEstiaje.match(/aria-labelledby="/g) ?? []).length >= destinos.length &&
        /clip-path:\s*inset\(50%\)/.test(reglaDe('.riberas-carril-dicho')),
      mudos.slice(0, 3).map((o) => o.rotulo),
    );
    /*
     * Y EL CARRIL NO CABE, QUE ES EL PUNTO: veinte cuadrados del suelo de toque son 935
     * puntos de carril con la letra de esta casa —el mismo `scrollWidth` que se midió jugando—,
     * y la cinta mide 115,2 en el lienzo más estrecho de este cliente y 640 en un monitor. O
     * sea que RUEDA, y por eso la hoja lo dice. Sin `overflow-x`, los dieciocho que no caben se salen del recuadro y volvemos a
     * empezar; sin `touch-action: auto`, se ven dos y con el dedo no hay manera de llegar a
     * los otros, porque el recuadro lleva `touch-action: none` por el gesto del delta.
     */
    const reglaDelCarril = reglaDe('.riberas-carril');
    const laCintaMasEstrecha = anchoDeLaCinta(288, 420);
    comprobar(
      'y como no caben —veinte cuadrados son 935 puntos y la cinta mide 115,2 en el lienzo más estrecho— el carril RUEDA a lo ancho, y rueda TAMBIÉN con el dedo pese al `touch-action: none` del recuadro',
      destinos.length * ladoDelBotonDeLaCinta(raizDeLaCasa) > laCintaMasEstrecha &&
        cuantosSeVenEnElCarril(laCintaMasEstrecha, ladoDelBotonDeLaCinta(raizDeLaCasa)) === 2 &&
        cuantosSeVenEnElCarril(anchoDeLaCinta(1920, 1080), ladoDelBotonDeLaCinta(raizDeLaCasa)) === 13 &&
        /overflow-x:\s*auto/.test(reglaDelCarril) &&
        /touch-action:\s*auto/.test(reglaDelCarril) &&
        /overscroll-behavior:\s*contain/.test(reglaDelCarril),
      {
        carril: destinos.length * ladoDelBotonDeLaCinta(raizDeLaCasa),
        cinta: laCintaMasEstrecha,
        seVen: cuantosSeVenEnElCarril(laCintaMasEstrecha, ladoDelBotonDeLaCinta(raizDeLaCasa)),
        regla: reglaDelCarril.replace(/\s+/g, ' ').slice(0, 200),
      },
    );
    /*
     * Y NO SE ENCOGEN AL NO CABER, que es el fallo que un flex hace solo: con `flex-shrink`
     * por omisión, dieciocho botones dentro de 115 puntos se reparten la falta y salen de seis
     * puntos cada uno. No da error, no se sale nada, y el suelo de toque se pierde justo en el
     * lienzo más pequeño —que es donde se juega con el dedo—.
     */
    comprobar(
      'y los cuadrados no se encogen al no caber: `flex: 0 0 auto` y el lado del suelo de toque, o veinte dentro de 115 puntos saldrían de menos de seis puntos cada uno sin que nada fallara',
      /flex:\s*0 0 auto/.test(reglaDe('.riberas-carril-opcion')) &&
        reglaDe('.riberas-carril-opcion').includes(`width: ${enRem(BOTON_DE_LA_CINTA)};`) &&
        reglaDe('.riberas-carril-opcion').includes(`height: ${enRem(BOTON_DE_LA_CINTA)};`),
      reglaDe('.riberas-carril-opcion').replace(/\s+/g, ' '),
    );
    /*
     * ═══ Y LA LISTA LARGA SIGUE EXISTIENDO, EN EL CAJÓN, QUE ES DONDE HAY ANCHO ═══
     *
     * El encargo es «una opción tiene que poder alcanzarse por los dos sitios», y no es adorno:
     * un cuadrado con un «7» dentro no dice a qué isla va el estiaje, y esa frase tiene que
     * poder LEERSE. El cajón nace cerrado, así que esto se compra por texto —como todo lo de
     * dentro del cajón—: que la lista esté ahí, que vaya la primera (el primer renglón es el
     * único que se lee sin desplazar) y que NO se quede también con las teclas 1-9.
     */
    const dentroDelCajon = /<div\b[\s\S]*?className=\{hayCarril \? `\$\{EL_CAJON\}[\s\S]*?\{elRail\}/.exec(codigo)?.[0] ?? '';
    comprobar(
      'y la lista larga con rótulo Y ayuda sigue existiendo dentro del cajón, la PRIMERA —el primer renglón es el único que se lee sin desplazar—: un cuadrado con un número no dice a qué isla va el estiaje',
      dentroDelCajon.includes('<Formulario') &&
        dentroDelCajon.indexOf('<Formulario') < dentroDelCajon.indexOf('{elRail}') &&
        /opciones=\{fuera\}/.test(dentroDelCajon) &&
        dentroDelCajon.includes('titulo={TITULO_DE_LO_QUE_SE_HACE}'),
      dentroDelCajon.replace(/\s+/g, ' ').slice(-320),
    );
    /*
     * Y LAS TECLAS SON DE UNO SOLO. Los atajos se registran EN LA VENTANA: con las dos copias
     * escuchándolas, el «3» manda el mismo movimiento DOS VECES, las dos antes de que React
     * repinte —`quieto` es un estado y no un cerrojo—, y la segunda viaja con la revisión vieja
     * y vuelve rancia. Se queda con ellas el carril, que está montado también con el cajón
     * abierto, así que la tecla significa lo mismo se mire donde se mire.
     */
    const elFormulario = readFileSync(new URL('../src/formulario.tsx', import.meta.url), 'utf8');
    comprobar(
      'y las teclas 1-9 las escucha UN solo mueble: la copia del cajón declara `atajos={false}`, o el «3» mandaría el mismo movimiento dos veces y el segundo viajaría con la revisión vieja',
      dentroDelCajon.includes('atajos={false}') &&
        /usarLosAtajos\(pintables, alElegir, quieto\);/.test(codigo) &&
        /export function usarLosAtajos\(/.test(elFormulario) &&
        /if \(quieto \|\| !activos\) return;/.test(sinComentarios(elFormulario)),
      dentroDelCajon.replace(/\s+/g, ' ').slice(-320),
    );
    /*
     * Y EL CARRIL SÓLO EXISTE CUANDO HAY ALGO QUE OFRECER. Una tira vacía de 44 puntos sería
     * cromo pegado encima del tablero en todos los turnos ajenos, y además le restaría banda al
     * cartel de los naipes sin que hubiera nada que leer en ella. Se mide con la partida de
     * arriba, la del turno corriente, donde `fuera` trae una sola opción; y con la del
     * descarte, que trae cinco.
     */
    const conDescarte = laProyeccionConMazo(3, { descartando: true });
    const tableroDelDescarte = tableroDeLaVista(conDescarte.vista);
    const puestaDelDescarte = mesaPuestaDe(conDescarte.sentados, conDescarte.vista, conDescarte.opciones);
    const htmlDelDescarte =
      tableroDelDescarte === null
        ? ''
        : renderToStaticMarkup(
            <RiberasEnTres
              manifiesto={riberas}
              mesa={unaMesa('dentro', puestaDelDescarte)}
              puesta={puestaDelDescarte}
              tablero={tableroDelDescarte}
              opciones={conDescarte.opciones}
              laSalida="/sala/"
              elRail={<p className="el-rail-de-prueba">el raíl</p>}
            />,
          );
    comprobar(
      'y el descarte también cabe: sus CINCO botones —uno por clase de bien que quede en la mano— salen en el mismo carril, que es la otra lista que un siete pone encima de la mesa',
      htmlDelDescarte.split('class="riberas-carril-opcion').length - 1 === 5 &&
        conDescarte.opciones.filter((o) => o.tipo === 'riberas:descartar').length === 5,
      {
        cuadrados: htmlDelDescarte.split('class="riberas-carril-opcion').length - 1,
        descartes: conDescarte.opciones.filter((o) => o.tipo === 'riberas:descartar').length,
      },
    );
  }

  // ── 9. EL MENÚ DE ELEGIR, MODAL, PORQUE «DEBAJO» DEJÓ DE SER UN SITIO ──

  /*
   * ═══ EL SEGUNDO AGUJERO DE LA MISMA FAMILIA, Y EL MÁS CALLADO ═══
   *
   * `ElijeUna` —«a quién se lo propones», «a quién le robas», «qué dos bienes coges», hasta
   * quince opciones— se pintaba EN FLUJO por debajo del lienzo. Con la página de pie el
   * recuadro vale la ventana entera menos la cabecera: DEBAJO NO HAY NADA, porque debajo está
   * fuera de la pantalla. El menú aparecía donde no se ve. Y como el menú se abre encima de
   * una jugada obligatoria, eso es la partida parada sin un error en ninguna consola. En la
   * app su hermano `HojaDeAQuien` ya era modal desde su primera versión.
   *
   * No se puede renderizar abierto —se abre pulsando un naipe del `<canvas>` y en Node no hay
   * quién pulse—, así que se compra el marcado y la hoja, como todo lo del cajón abierto.
   */
  /*
   * SE BUSCA SOBRE LA FUENTE CON LOS FINES DE LÍNEA NORMALIZADOS. Los fuentes de esta casa se
   * guardan con el fin de línea de Windows, así que el cierre de una función no es un salto y
   * una llave: lleva un retorno de carro delante. La ventana salía VACÍA y esto se ponía rojo
   * con la función entera escrita como toca, que es la peor manera de ponerse rojo. Es el
   * mismo tropiezo que ya costó la regla de los dos botones de la cinta.
   */
  const fuentePelada = fuente.replace(/\r\n/g, '\n');
  const elMenu = sinComentarios(/function ElijeUna\(\{[\s\S]*?\n\}\n/.exec(fuentePelada)?.[0] ?? '');
  comprobar(
    'el menú de elegir es MODAL y vive dentro del recuadro: en flujo por debajo del lienzo se pintaba donde no se ve, y «a quién le robas» es una jugada obligatoria',
    /role="dialog"/.test(elMenu) &&
      /aria-modal="true"/.test(elMenu) &&
      /aria-label=\{titulo\}/.test(elMenu) &&
      /tabIndex=\{-1\}/.test(elMenu) &&
      /position:\s*absolute/.test(reglaDe('.riberas-elige')),
    elMenu.replace(/\s+/g, ' ').slice(0, 300),
  );
  comprobar(
    'y lleva su velo, que es la mitad que se olvida: sin él un clic fuera del menú cierra la pregunta Y funda una choza donde estaba el dedo',
    /<div className=\{[^\n]*EL_VELO[^\n]*\} onClick=\{alDejarlo\} aria-hidden="true" \/>/.test(elMenu),
    elMenu.replace(/\s+/g, ' ').slice(0, 300),
  );
  /*
   * ═══ Y DESDE EL RETABLO SE COLOCA SOBRE LA VENTANA, QUE ES OTRA COSA ═══
   *
   * El menú vive dentro del recuadro con `position: absolute`, y eso funciona porque el
   * recuadro vale la ventana entera. En el retablo no hay recuadro y LA PÁGINA RUEDA: una
   * caja colocada sobre el flujo se queda centrada en un documento de mil puntos, o sea
   * fuera de la pantalla en cuanto alguien haya bajado a mirar el tablero. Y ahí la hoja no
   * es un adorno: es donde se aceptan los trueques de una mesa de cinco.
   *
   * Se compra que el parámetro exista, que lo lleven LAS DOS mitades —caja y velo, porque un
   * velo en flujo deja pasar el clic por debajo— y que la hoja diga `fixed` de verdad.
   */
  comprobar(
    'y con `fijo` se coloca sobre la VENTANA: la caja y su velo, las dos, y con el tope de alto de la ventana',
    /fijo = false/.test(elMenu) &&
      /fijo \? `\$\{EL_VELO\} \$\{EL_VELO\}-fijo`/.test(elMenu) &&
      /fijo \? `formulario \$\{EL_MENU\} \$\{EL_MENU\}-fijo`/.test(elMenu) &&
      /position:\s*fixed/.test(reglaDe('.riberas-elige-fijo')) &&
      /position:\s*fixed/.test(reglaDe('.riberas-velo-fijo')) &&
      /max-height:\s*calc\(100vh/.test(reglaDe('.riberas-elige-fijo')),
    { caja: reglaDe('.riberas-elige-fijo').replace(/\s+/g, ' '), velo: reglaDe('.riberas-velo-fijo').replace(/\s+/g, ' ') },
  );
  /*
   * ═══ Y SUS OPCIONES SE APAGAN CON `aria-disabled`, QUE DENTRO DE UN MODAL VALE DOBLE ═══
   *
   * Un `<button>` al que se le pone `disabled` TENIENDO EL FOCO lo pierde, y el foco cae al
   * `<body>`. En una lista en flujo eso era molesto —y por eso `formulario.tsx` ya lo tenía
   * escrito—; dentro de un modal es ESCAPARSE DE LA TRAMPA: el foco sale de la caja, tabular
   * desde ahí lleva a la cabecera de la Sala, y encima queda un diálogo opaco que ya no se
   * puede cerrar con el teclado. Aquí estuvo `disabled={quieto}` mientras el menú vivía en
   * flujo; al hacerlo modal ese cabo pasó a ser el agujero de su propia trampa.
   */
  comprobar(
    'y sus opciones se apagan con `aria-disabled` y no con `disabled`: un botón deshabilitado teniendo el foco lo suelta al `body`, y dentro de un modal eso es escaparse de su propia trampa',
    /aria-disabled=\{quieto\}/.test(elMenu) &&
      /* `\b` no vale aquí: el guión de «aria-disabled» es frontera de palabra y casaba con él. */
      !/(?<!aria-)disabled=\{quieto\}/.test(elMenu) &&
      /className=\{quieto \? 'opcion opcion-quieta' : 'opcion'\}/.test(elMenu) &&
      /if \(quieto\) return;/.test(elMenu),
    elMenu.replace(/\s+/g, ' ').slice(0, 400),
  );
  /*
   * Y AL CERRARLO EL FOCO VUELVE AL RECUADRO. El menú se DESMONTA al cerrarse, y desmontarse
   * con el foco dentro lo suelta al `<body>`: quien juega con teclado tendría que tabular
   * desde la cabecera de la Sala en cada carta que juega. Vuelve al RECUADRO y no a un botón
   * porque al menú lo abre un naipe del `<canvas>`, y un `<canvas>` no recibe foco. Y no entra
   * en `soltarTodo`: allí el menú se cierra sin que nadie lo haya pedido —una jugada ajena— y
   * mover el foco por algo que pasó en otra pantalla es robárselo a quien estaba en otro sitio.
   */
  const cerrarElMenu = sinComentarios(/const cerrarElMenu = useCallback\([\s\S]*?\n {2}\}, \[\]\);/.exec(fuente)?.[0] ?? '');
  comprobar(
    'y al cerrarlo el foco vuelve al RECUADRO —no hay botón al que volver: lo abre un naipe del `<canvas>`—, y ese rescate NO entra en `soltarTodo`, que cierra el menú sin que nadie lo pida',
    cerrarElMenu.includes('ponerPreguntando(null)') &&
      cerrarElMenu.includes('elRecuadro.current?.focus()') &&
      /alDejarlo=\{cerrarElMenu\}/.test(codigo) &&
      !sinComentarios(/const soltarTodo = useCallback\([\s\S]*?\n {2}\}, \[\]\);/.exec(fuente)?.[0] ?? '').includes('focus()'),
    cerrarElMenu.replace(/\s+/g, ' '),
  );
  /*
   * Y CABE: quince opciones de dos renglones no entran en un lienzo de 128 puntos —el SE
   * apaisado— de ninguna manera. Con `max-height` y desplazamiento por dentro se leen rodando;
   * sin ellos, las de abajo se salen del recuadro y vuelven a estar donde no se ve, que es el
   * fallo que este bloque viene a cerrar. Y `touch-action: auto`, por lo mismo que el cajón.
   */
  const reglaDelMenu = reglaDe('.riberas-elige');
  comprobar(
    'y cabe: topado por el recuadro y desplazable por dentro y con el dedo, porque el menú del año bueno son QUINCE opciones de dos renglones y el lienzo apaisado del SE mide 128 puntos de alto',
    /max-height:\s*calc\(100% - 1\.5rem\)/.test(reglaDelMenu) &&
      /overflow-y:\s*auto/.test(reglaDelMenu) &&
      /touch-action:\s*auto/.test(reglaDelMenu) &&
      /background:\s*var\(--teja\)/.test(reglaDelMenu),
    reglaDelMenu.replace(/\s+/g, ' '),
  );
}

/**
 * ═══ EL RELOJ DE LA CINTA: EL AGUJERO QUE HIZO QUE LA MESA JUGARA SOLA ═══
 *
 * Esto NO se encontró leyendo. Un revisor abrió tres mesas contra el servidor y jugó con el
 * ratón, y esto es lo que le pasó: la cinta ponía «Sacaste 6. Alza, truécalo o pasa.» y no
 * decía NI UNA VEZ cuánto quedaba de turno. Con el plazo de serie —«Como venga», medido en
 * `venceEn − turnoDesde = 119.998 ms`— el reloj vivía SÓLO dentro del cajón, en `LaFicha`
 * («quedan 47 s · Revisión 11»), o sea detrás de un toque. Al vencer, la mesa jugó por él:
 * fundó una choza que no puso. Le costó TRES TURNOS creyendo que era un fallo del ratón.
 *
 * ═══ Y POR QUÉ NO LO CAZÓ NADIE, QUE ES LA MITAD QUE HAY QUE ARREGLAR APARTE ═══
 *
 * `relojes.ts` lo tenía escrito en su propia cabecera: de sus dos cuentas, la de la pausa del
 * sondeo tenía ocho comprobaciones y `cuantoQueda` —«la mitad que la gente LEE en pantalla»—
 * tenía CERO. O sea que cambiar un `Math.ceil` por un `Math.floor` dejaba la batería entera en
 * verde con «quedan 23 h» en una mesa de veinticuatro horas recién abierta, que es exactamente
 * la regresión que la app ya pagó una vez. Aquí se cierran las dos cosas a la vez: que el
 * rótulo esté en la CINTA, y que los rótulos digan lo que dicen.
 */
function elRelojDeLaCinta(): void {
  paso('El reloj de la cinta: la línea de estado dice cuánto queda de turno, y lo dice igual que el cajón');

  const UN_SEGUNDO = 1000;
  const UN_MINUTO = 60_000;
  const UNA_HORA = 60 * UN_MINUTO;
  const UN_DIA = 24 * UNA_HORA;

  // ── 1. Los dos rótulos son la MISMA cuenta ────────────────────────────────

  /*
   * ═══ EL BARRIDO, Y POR QUÉ UN BARRIDO Y NO UNA LISTA DE CASOS ═══
   *
   * Una lista de casos se escribe con las fronteras que quien la escribe recuerda, y las que
   * no recuerda son justamente por donde se rompe: `cuantoQueda` tiene CUATRO tramos, tres
   * fronteras (un minuto, una hora, dos días) y un redondeo hacia arriba dentro de cada uno.
   * Se barren en su lugar mil doscientos instantes repartidos por todo el eje —de un segundo a
   * seis días— y se afirma que el rótulo corto y el largo dicen SIEMPRE la misma cifra. Es lo
   * único que garantiza que la cinta y el cajón no puedan discrepar.
   */
  const instantes: number[] = [];
  for (let i = 1; i <= 300; i++) {
    instantes.push(i * UN_SEGUNDO, i * UN_MINUTO, i * UNA_HORA, Math.round(i * UN_DIA * 0.02));
  }
  const cifraDe = (rotulo: string): string | null => /(\d+)\s/.exec(rotulo)?.[1] ?? null;
  const discrepan = instantes.filter((ms) => {
    const larga = cifraDe(cuantoQueda(ms));
    const corta = cifraDe(cuantoQuedaEnLaCinta(ms));
    return larga === null || corta === null || larga !== corta;
  });
  comprobar(
    `el rótulo corto de la cinta y el largo del cajón dicen la misma cifra en los ${String(instantes.length)} instantes del barrido: son la misma cuenta con otro nombre`,
    discrepan.length === 0,
    discrepan.slice(0, 5).map((ms) => `${String(ms)}: «${cuantoQueda(ms)}» / «${cuantoQuedaEnLaCinta(ms)}»`),
  );
  /*
   * Y LA CUENTA VA HACIA ARRIBA, en los dos. Es el lado correcto del error en una cuenta
   * atrás: nunca dice que quede menos de lo que queda, así que nadie deja de mover por creer
   * que ya no llegaba. La regresión que la app pagó fue la contraria —truncando, a 48 h se
   * leía «2 días» y un minuto después «47 h»—, y hasta hoy aquí no la miraba nadie.
   */
  comprobar(
    'y las dos redondean HACIA ARRIBA: a un segundo y pico quedan «2 s» y no «1 s», que es lo que hace que nadie deje de mover por creer que ya no llegaba',
    cuantoQueda(1001) === 'quedan 2 s' &&
      cuantoQuedaEnLaCinta(1001) === '2 s' &&
      cuantoQuedaEnLaCinta(UN_MINUTO + 1) === '2 min',
    { largo: cuantoQueda(1001), corto: cuantoQuedaEnLaCinta(1001), unMinutoYPico: cuantoQuedaEnLaCinta(UN_MINUTO + 1) },
  );
  /*
   * LA VACUNA DE ESTA PAREJA: la misma comparación con un `Math.floor` en el corto, que es
   * exactamente la regresión temida. Tiene que caer, o el barrido de arriba estaría pasando
   * por comparar dos cosas que en realidad no se miran.
   */
  const truncando = (ms: number): string =>
    ms < UN_MINUTO ? `${String(Math.floor(ms / UN_SEGUNDO))} s` : `${String(Math.floor(ms / UN_MINUTO))} min`;
  const conElFloor = instantes.filter(
    (ms) => ms < UNA_HORA && cifraDe(cuantoQueda(ms)) !== cifraDe(truncando(ms)),
  );
  comprobar(
    'se ve fallar: con el redondeo truncado, el corto y el largo discrepan y el barrido lo caza',
    conElFloor.length > 0,
    { cuantos: conElFloor.length, primero: conElFloor[0] },
  );

  // ── 2. Las dos ramas sin número no dicen lo mismo ─────────────────────────

  /*
   * VENCIDO y DESCONOCIDO son dos cosas distintas y hay que decirlas distintas. Con el plazo
   * pasado se dice «0 s», que es cierto y es lo que hay que ver de un vistazo: el turno ya se
   * está jugando solo. Con un dato roto —`venceEn` llega por un `as` pelado y puede venir como
   * fecha ISO, que da `NaN`— se dice «?», porque afirmar que venció es lo contrario de lo que
   * se sabe. Sin esa rama, lo que se pintaba era «quedan NaN días», repintado cada segundo.
   */
  comprobar(
    'el plazo vencido dice «0 s» y el dato roto dice «?», que no son lo mismo: uno afirma que se acabó y el otro que no se sabe',
    cuantoQuedaEnLaCinta(0) === SE_ACABO_EN_LA_CINTA &&
      cuantoQuedaEnLaCinta(-5000) === SE_ACABO_EN_LA_CINTA &&
      cuantoQuedaEnLaCinta(Number.NaN) === PLAZO_DESCONOCIDO_EN_LA_CINTA &&
      cuantoQuedaEnLaCinta(Number.POSITIVE_INFINITY) === PLAZO_DESCONOCIDO_EN_LA_CINTA &&
      /*
       * Y QUE LAS DOS CONSTANTES NO SEAN LA MISMA CADENA. Se lee con `String()` a propósito:
       * el compilador conoce el valor literal de las dos y descarta la comparación como
       * imposible, que es justo lo que hay que afirmar aquí — el día que alguien iguale las
       * dos, esto tiene que ponerse rojo en vez de dejar de compilar.
       */
      String(SE_ACABO_EN_LA_CINTA) !== String(PLAZO_DESCONOCIDO_EN_LA_CINTA),
    { vencido: cuantoQuedaEnLaCinta(0), roto: cuantoQuedaEnLaCinta(Number.NaN) },
  );

  // ── 3. El rótulo cabe en el hueco que la cinta le descuenta ───────────────

  /*
   * `LETRAS_DEL_RELOJ_DE_LA_CINTA` es lo que `loQueLlevaLaCinta` descuenta ANTES de decidir si
   * el «‹» cabe. Si el rótulo pudiera ser más largo que eso, la cuenta prometería a la frase
   * unos puntos que en pantalla ya se llevó el reloj — y eso no se ve como un número mal: se
   * ve como una frase que se recorta antes de tiempo, que es el mismo fallo que costó 17
   * puntos de los 80 de una frase el día que la cinta tuvo `gap`.
   *
   * Se barre el mismo eje en vez de creerse el seis.
   */
  const masLargo = instantes
    .concat([0, -1, Number.NaN, Number.POSITIVE_INFINITY])
    .map((ms) => cuantoQuedaEnLaCinta(ms))
    .reduce((a, b) => (b.length > a.length ? b : a), '');
  comprobar(
    `lo más largo que el reloj puede escribir son ${String(masLargo.length)} caracteres («${masLargo}»), y la cinta descuenta ${String(LETRAS_DEL_RELOJ_DE_LA_CINTA)}: no le promete a la frase puntos que el reloj ya se llevó`,
    masLargo.length <= LETRAS_DEL_RELOJ_DE_LA_CINTA,
    { masLargo, descontadas: LETRAS_DEL_RELOJ_DE_LA_CINTA },
  );
  /*
   * Y NO SE DESCUENTA DE MÁS TAMPOCO, que es el error por el otro lado y también cuesta: cada
   * letra de sobra es una letra menos de línea de estado en el lienzo estrecho, que es donde no
   * sobra ninguna.
   */
  comprobar(
    'ni de más: las letras descontadas son exactamente el peor caso, no un número redondo por encima',
    LETRAS_DEL_RELOJ_DE_LA_CINTA === masLargo.length,
    { descontadas: LETRAS_DEL_RELOJ_DE_LA_CINTA, peorCaso: masLargo.length },
  );

  // ── 4. El último minuto se pinta de alarma, y ni un minuto antes ──────────

  comprobar(
    'el plazo aprieta en el último minuto y ni un milisegundo antes: 59.999 sí, 60.000 no',
    elPlazoAprieta(UN_MINUTO - 1) && !elPlazoAprieta(UN_MINUTO) && elPlazoAprieta(0) && elPlazoAprieta(-1),
    {
      casiUnMinuto: elPlazoAprieta(UN_MINUTO - 1),
      unMinuto: elPlazoAprieta(UN_MINUTO),
      vencido: elPlazoAprieta(0),
    },
  );
  /*
   * Y UN DATO ROTO NO APRIETA. Pintar de alarma lo que no se sabe es afirmarlo, y `--alarma`
   * está reservado en la hoja para «lo que de verdad se acaba»: encenderla por un `NaN` la
   * gastaría justo en el caso en que no hay nada que decir.
   */
  comprobar(
    'y un plazo que no es un número no aprieta: no se pinta de alarma lo que no se sabe',
    !elPlazoAprieta(Number.NaN) && !elPlazoAprieta(Number.POSITIVE_INFINITY),
  );

  // ── 5. El reparto de la cinta descuenta el reloj de VERDAD ────────────────

  /*
   * LOS NÚMEROS DEL REPARTO, con la letra de la casa (raíz 17: cuerpo 13,94, ancho de letra
   * 8,364) y el botón que la hoja pinta (46,75, que son los 44 escritos `2.75rem`). Lo que se
   * compra es que el reloj se descuente ANTES de preguntar por el «‹»: sin eso, la cuenta diría
   * que la frase conserva sus ocho letras mientras el reloj ya se llevó seis de ellas.
   */
  const raiz = RAIZ_DE_LA_CASA;
  const ochoLetras = huecoMinimoDeLaFrase(raiz);
  const boton = ladoDelBotonDeLaCinta(raiz);
  const delReloj = huecoDelRelojDeLaCinta(raiz);
  const enUnMonitor = loQueLlevaLaCinta(1920, 1080, ochoLetras, boton, delReloj);
  const sinReloj = loQueLlevaLaCinta(1920, 1080, ochoLetras, boton);
  comprobar(
    `en un monitor la cinta vale 640 y el reloj le quita ${delReloj.toFixed(1)} puntos a la frase: quedan ${enUnMonitor.hueco.toFixed(1)} en vez de ${sinReloj.hueco.toFixed(1)}, y el «‹» se queda dentro`,
    enUnMonitor.salidaDentro &&
      Math.abs(enUnMonitor.ancho - 640) < 0.1 &&
      Math.abs(sinReloj.hueco - enUnMonitor.hueco - delReloj) < 1e-9 &&
      enUnMonitor.hueco > ochoLetras,
    { conReloj: enUnMonitor, sinReloj: sinReloj.hueco, delReloj },
  );
  /*
   * Y CON EL HUECO DEL RELOJ A CERO LA CUENTA ES LA DE ANTES, punto por punto. Es lo que hace
   * que una mesa sin plazo, una mesa terminada y todo cliente que todavía no pinte reloj sigan
   * repartiendo la cinta exactamente como la repartían: el parámetro nuevo no puede cambiar
   * nada de lo que ya estaba medido.
   */
  const deSerie = loQueLlevaLaCinta(288, 420, ochoLetras, boton);
  comprobar(
    'y sin reloj el reparto es el de siempre: a 288 de lienzo el «‹» se va y a la frase le quedan 68,4',
    !deSerie.salidaDentro && Math.abs(deSerie.hueco - 68.45) < 0.1,
    deSerie,
  );
  /*
   * LA VACUNA DEL DESCUENTO: si el reloj NO se descontara —que es lo que hacía la función antes
   * de este cambio— habría lienzos en los que la cuenta dice que la frase conserva sus ocho
   * letras y en pantalla no las tiene. Se buscan sobre los lienzos de verdad de este cliente, y
   * tiene que haber al menos uno, o el parámetro nuevo no estaría comprando nada.
   */
  const mentirosos = LIENZOS.filter(([, ancho, alto]) => {
    const conCuenta = loQueLlevaLaCinta(ancho, alto, ochoLetras, boton);
    const deVerdad = loQueLlevaLaCinta(ancho, alto, ochoLetras, boton, delReloj);
    return conCuenta.hueco >= ochoLetras && deVerdad.hueco < ochoLetras;
  });
  comprobar(
    `se ve fallar: sin descontar el reloj, la cuenta prometería ocho letras a la frase en ${String(mentirosos.length)} lienzos donde en pantalla no las tiene`,
    mentirosos.length > 0,
    mentirosos.map(([nombre]) => nombre),
  );

  // ── 6. Y en la pantalla de verdad: está, y no es una segunda región viva ──

  const riberas = elCatalogoQuePublicaElServidor().find((m) => m.id === 'riberas');
  comprobar('Riberas está instalado', riberas !== undefined);
  if (riberas === undefined) return;
  const { vista, opciones } = laProyeccionDeVerdad();
  const tablero = tableroDeLaVista(vista);
  comprobar('y su proyección trae tablero declarado', tablero !== null);
  if (tablero === null) return;

  /*
   * EL PLAZO DE SERIE, que es el que se jugó: «Como venga» son 120 s medidos en la mesa de
   * verdad (`venceEn − turnoDesde = 119.998`). Se pone a 47 s del final, que es el instante de
   * la captura del cajón, para que lo que se mide sea el mismo rótulo que allí se leyó.
   */
  const conPlazo = mesaPuestaDe(sentadosDePrueba(2), vista, opciones, { venceEn: Date.now() + 47_000 });
  const html = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', conPlazo)}
      puesta={conPlazo}
      tablero={tablero}
      opciones={opciones}
      laSalida="/sala/"
      elRail={<p className="el-rail-de-prueba">el raíl</p>}
    />,
  );
  const elReloj = /<span class="riberas-cinta-reloj[^"]*"[\s\S]*?<\/span><\/span>/.exec(html)?.[0] ?? '';
  comprobar(
    'la cinta pinta el reloj, y dice «47 s»: la cuenta atrás deja de vivir sólo dentro del cajón',
    elReloj.includes('47 s'),
    { reloj: elReloj || null, cinta: /<div class="riberas-cinta[^"]*"[^>]*>/.exec(html)?.[0] ?? null },
  );
  /*
   * ═══ Y NO ES UNA SEGUNDA REGIÓN VIVA, QUE SERÍA PEOR QUE NO PONERLO ═══
   *
   * La frase de al lado ya es `aria-live="polite"`. Un reloj vivo a su lado anunciaría la
   * cuenta atrás EN VOZ ALTA cada segundo durante el último minuto, encima del aviso del juego
   * y pisándolo — que es el mismo fallo por el que el aviso se MUDÓ a la cinta en vez de
   * pintarse en los dos sitios. `role="timer"` es lo contrario: una región de tiempo que un
   * lector encuentra y lee cuando quiere, y que no se anuncia sola.
   */
  comprobar(
    'y es `role="timer"` y NO una segunda región viva: con dos `aria-live` la cuenta atrás se anunciaría en voz alta cada segundo encima del aviso del juego',
    elReloj.includes('role="timer"') && !elReloj.includes('aria-live'),
    elReloj,
  );
  /*
   * LO QUE SE OYE ES LA FRASE ENTERA, no el rótulo abreviado. El «47 s» existe sólo porque en
   * la cinta no caben los trece de «quedan 12 min»; quien lo oye no tiene ese problema y
   * merece la misma frase que lee el cajón.
   */
  comprobar(
    'y lo que se oye y se ve al posar el ratón es la frase ENTERA del cajón —«quedan 47 s»—, no el rótulo abreviado que sólo existe por falta de sitio',
    elReloj.includes('aria-label="quedan 47 s"') && elReloj.includes('title="quedan 47 s"'),
    elReloj,
  );
  /*
   * Y SIN PLAZO NO HAY RELOJ, que es la otra mitad. Una mesa sin plazo pintando un «?» o un
   * «0 s» diría que se le acaba el tiempo a quien tiene todo el del mundo, y además le
   * descontaría letras a la frase para nada.
   */
  const sinPlazo = mesaPuestaDe(sentadosDePrueba(2), vista, opciones);
  const htmlSinPlazo = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', sinPlazo)}
      puesta={sinPlazo}
      tablero={tablero}
      opciones={opciones}
      laSalida="/sala/"
    />,
  );
  comprobar(
    'y una mesa SIN plazo no pinta reloj ninguno: ni «?» ni «0 s», que dirían que se acaba el tiempo a quien tiene todo el del mundo',
    !htmlSinPlazo.includes('riberas-cinta-reloj') && htmlSinPlazo.includes('riberas-cinta-frase'),
  );
  /*
   * Y UNA MESA TERMINADA TAMPOCO. Ahí el plazo sigue viajando por el cable —`venceEn` no se
   * borra al acabar— y un reloj corriendo sobre una partida acabada es una cuenta atrás hacia
   * nada. Es la misma guarda que `LaFicha` ya tenía para no dejar un `setInterval` eterno.
   */
  const acabada = mesaPuestaDe(sentadosDePrueba(2), vista, opciones, {
    venceEn: Date.now() + 47_000,
    terminada: true,
  });
  const htmlAcabada = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', acabada)}
      puesta={acabada}
      tablero={tablero}
      opciones={opciones}
      laSalida="/sala/"
    />,
  );
  comprobar(
    'ni una mesa terminada, aunque su `venceEn` siga viajando por el cable: una cuenta atrás sobre una partida acabada cuenta hacia nada',
    !htmlAcabada.includes('riberas-cinta-reloj'),
  );

  // ── 7. Y el latido no es uno por segundo ─────────────────────────────────

  /*
   * ═══ POR QUÉ ESTO IMPORTA AQUÍ Y NO IMPORTABA EN EL CAJÓN ═══
   *
   * `LaFicha` se repinta con un `setInterval` de 1000 ms. Para una ficha dentro de un cajón
   * cerrado eso ya era caro; en la CINTA es otra cosa, porque quien se repinta es el
   * componente que pinta el DELTA ENTERO. `msHastaQueCambieElRotulo` existe en `relojes.ts`
   * exactamente para esto —con el ejemplo escrito en su cabecera— y hasta hoy no lo llamaba
   * NADIE: su cabecera dice que `sala.tsx` late al segundo «porque este fichero no ofrecía
   * ninguna forma de preguntar cuándo cambia el texto», y la forma llevaba ahí escrita todo el
   * tiempo.
   *
   * Se compra el número: en una mesa de tres días son unas decenas de esperas y no 259.200
   * latidos.
   */
  const tresDias = 3 * UN_DIA;
  let esperas = 0;
  let queda = tresDias;
  while (queda > 0 && esperas < 400_000) {
    const espera = msHastaQueCambieElRotulo(queda);
    if (!Number.isFinite(espera)) break;
    queda -= espera;
    esperas++;
  }
  comprobar(
    `una mesa de tres días son ${String(esperas)} esperas y no 259.200 latidos, y aquí quien late pinta el delta entero`,
    esperas > 0 && esperas < 200,
    { esperas, alSegundo: tresDias / UN_SEGUNDO },
  );
  /*
   * Y EN EL ÚLTIMO MINUTO SIGUE CONTANDO AL SEGUNDO, que es donde la cuenta importa de verdad:
   * un reloj que ahorra latidos y deja de moverse justo cuando quedan segundos no ahorra nada,
   * miente.
   */
  comprobar(
    'y en el último minuto la espera vuelve a ser de un segundo o menos: donde el número se mueve, se mueve',
    msHastaQueCambieElRotulo(47_000) <= UN_SEGUNDO && msHastaQueCambieElRotulo(1_500) <= UN_SEGUNDO,
    { a47s: msHastaQueCambieElRotulo(47_000), a1500ms: msHastaQueCambieElRotulo(1_500) },
  );
  /*
   * Y CON EL PLAZO PASADO NO SE PROGRAMA NADA: `Infinity` es la señal de «el rótulo ya no va a
   * cambiar nunca». Sin ella, un `setTimeout` con `NaN` se convierte en cero en silencio y
   * queda un bucle de repintado a toda velocidad sobre una mesa que ya no cuenta.
   */
  comprobar(
    'y con el plazo pasado o el dato roto no se programa ninguna espera: `Infinity` es «esto ya no va a cambiar»',
    !Number.isFinite(msHastaQueCambieElRotulo(0)) &&
      !Number.isFinite(msHastaQueCambieElRotulo(-1)) &&
      !Number.isFinite(msHastaQueCambieElRotulo(Number.NaN)),
  );
}

/**
 * ═══ EL CARRIL DECÍA «1», «2», … «20», Y ESO NO ES DECIR NADA ═══
 *
 * También salió jugando. Con un siete de verdad en una mesa de tres, el juego emitió VEINTE
 * opciones de mover el estiaje —dieciocho islas más dos que sólo se distinguen por la
 * víctima— y el carril las pintó como veinte cuadrados numerados del uno al veinte. Rodar
 * funcionaba (`.riberas-carril` de 313 × 46,8 con `scrollWidth` 935); lo que no existía era
 * QUÉ hace cada uno. Y los cuadrados 5 y 6 decían los dos «Mover el estiaje a la marisma …».
 *
 * La cabecera de `ElCarril` defendía ese número de orden con una premisa falsa —«es lo ÚNICO
 * que distingue a los dieciocho»—: lo que los distingue es SU ISLA, y la isla tiene un número
 * que ya está pintado en el tablero. Lo que se compra aquí:
 *
 *   · que cada cuadrado del estiaje diga el número de SU isla y no su puesto en la lista;
 *   · que dos cuadrados que digan lo mismo se distingan por algo más —el terreno al pie, la
 *     víctima en el filo—, y que no queden dos indistinguibles del todo;
 *   · que en las listas cortas, donde no hay isla que nombrar, siga el número de orden, que es
 *     el atajo de teclado;
 *   · y que el nombre accesible siga contando la frase entera, que es lo que no cabe.
 */
function elCarrilDiceAdondeVa(): void {
  paso('El carril del estiaje: cada cuadrado dice a qué isla va, y los gemelos se distinguen');

  const riberas = elCatalogoQuePublicaElServidor().find((m) => m.id === 'riberas');
  comprobar('Riberas está instalado', riberas !== undefined);
  if (riberas === undefined) return;

  /* La mesa del siete, la misma que mide el bloque del estiaje: tres colonos con bienes. */
  const { vista, opciones, sentados } = laProyeccionConMazo(3, {
    conElEstiajePorMover: true,
    victimasJuntas: true,
  });
  const tablero = tableroDeLaVista(vista);
  comprobar('la proyección del turno del siete trae tablero', tablero !== null);
  if (tablero === null) return;

  const delEstiaje = opciones.filter((o) => o.tipo === 'riberas:estiaje');
  /*
   * PRIMERO, QUE HAYA CASO. Sin esta línea todo lo de abajo sería verde con la lista vacía —el
   * `every` de un array vacío es `true`—, que es el fallo de guardia que este árbol ya tiene
   * apuntado dos veces. Y se exige que pase de dieciocho: el bloque que mide el estiaje clava
   * dieciocho y la partida de verdad dio VEINTE, porque hay islas con dos víctimas. Sin al
   * menos una de ésas, los dos cuadrados gemelos no existirían aquí.
   */
  comprobar(
    `la mesa del siete emite ${String(delEstiaje.length)} destinos, más que las dieciocho islas: hay islas con dos víctimas, que es el caso que hay que distinguir`,
    delEstiaje.length > 18,
    delEstiaje.length,
  );

  const glifos = glifosDelCarril(vista, delEstiaje);
  comprobar(
    'y cada uno de los destinos tiene su glifo: ni uno se queda con el número de orden',
    glifos.size === delEstiaje.length,
    { conGlifo: glifos.size, destinos: delEstiaje.length },
  );

  /*
   * ═══ EL GLIFO ES EL NÚMERO QUE ESTÁ ESCRITO EN EL TABLERO ═══
   *
   * No se compara contra una lista escrita aquí: se compara contra el TABLERO DECLARADO, que es
   * lo que el retablo pinta y lo que lleva el disco de cada comarca. Un glifo que dijera un
   * número que en el tablero no está sería peor que no tener nada — mandaría a buscar algo que
   * no existe.
   */
  const cifrasDelTablero = new Set(tablero.caras.map((c) => c.cifra).filter((c) => c.length > 0));
  const fuera = [...glifos.values()]
    .map((g) => g.glifo)
    .filter((g) => /^\d+$/.test(g) && !cifrasDelTablero.has(g));
  comprobar(
    'todo glifo que es una cifra está escrito en el tablero: se busca mirando el delta, no adivinando',
    fuera.length === 0,
    { fuera, enElTablero: [...cifrasDelTablero].sort() },
  );
  /*
   * Y LA FILA YA NO ES 1,2,3,… Con veinte destinos, el uno y el dos son a la vez números de isla
   * posibles y puestos en la lista, así que compararlos uno a uno no diría nada; lo que sí dice
   * es que la SECUENCIA entera no sea la de los ordinales, que es exactamente lo que se pintaba.
   */
  const enOrden = delEstiaje.map((o) => glifos.get(o.id)?.glifo ?? '?').join(',');
  const elOrdinal = delEstiaje.map((_, i) => String(i + 1)).join(',');
  comprobar(
    'y la fila de glifos ya no es 1,2,3,…: se ve fallar contra lo que se pintaba antes',
    enOrden !== elOrdinal,
    { ahora: enOrden, antes: elOrdinal },
  );

  /*
   * ═══ Y LOS GEMELOS SE DISTINGUEN, QUE ES LA MITAD QUE EL NÚMERO NO ARREGLA ═══
   *
   * El reparto lleva DOS de cada cifra, y una isla puede tener DOS víctimas. Así que el número
   * solo no basta, y por eso el cuadrado lleva además el terreno al pie y el filo de la
   * víctima. Se afirma que la terna entera —glifo, terreno, víctima— no se repite: dos
   * cuadrados idénticos en las tres cosas serían dos botones que hacen cosas distintas y se ven
   * iguales, que es el fallo de hoy con otro disfraz.
   */
  const ternas = delEstiaje.map((o) => {
    const g = glifos.get(o.id);
    return `${g?.glifo ?? '?'}|${g?.terreno ?? '?'}|${g?.rail ?? 'nadie'}`;
  });
  /*
   * ═══ Y LA VARA ES EL RÓTULO, NO LA UNICIDAD ABSOLUTA ═══
   *
   * Lo que se exige es que EL CUADRADO NO PIERDA NINGUNA DISTINCIÓN QUE EL RÓTULO TENGA: si
   * dos opciones se llaman distinto, sus cuadrados tienen que verse distintos. No se puede
   * exigir más, y conviene decir por qué en vez de bajar la vara sin avisar: el reparto pone
   * DOS islas con la misma cifra, y una isla puede tener DOS víctimas — y esas dos opciones
   * comparten rótulo a propósito, porque primero se elige adónde y sólo después a quién.
   *
   * Lo que aquí ponía y ya no vale: «si las dos islas del mismo número son además del mismo
   * terreno, el propio juego las llama igual, y eso no lo puede cerrar el cuadrado». Era
   * cierto y estaba sin arreglar. Ya está cerrado donde tenía que estarlo —`nombresDeLasIslas`
   * en `riberas.ts` le pone el rumbo a las que comparten nombre— y aquí abajo hay una línea
   * que lo compra sobre la pantalla de verdad.
   */
  const porRotulo = new Map<string, string>();
  const pierden: string[] = [];
  delEstiaje.forEach((o, i) => {
    const dicho = `${o.rotulo} · ${o.ayuda}`;
    const visto = ternas[i] as string;
    const antes = porRotulo.get(visto);
    if (antes !== undefined && antes !== dicho) pierden.push(`«${antes}» y «${dicho}» se ven igual: ${visto}`);
    porRotulo.set(visto, dicho);
  });
  comprobar(
    'dos opciones que se llaman distinto se ven distintas: el cuadrado no pierde ninguna distinción que el rótulo tenga',
    pierden.length === 0,
    pierden,
  );
  /*
   * Y QUE HAYA CASO QUE PERDER, o lo de arriba sería verde por vacío: tiene que haber al menos
   * un par de opciones con el MISMO rótulo de isla y distinta víctima, que es el par que sólo
   * el filo separa.
   */
  const gemelas = delEstiaje.filter((o, i) =>
    delEstiaje.some((otra, j) => j !== i && otra.rotulo === o.rotulo && otra.ayuda !== o.ayuda),
  );
  comprobar(
    `hay ${String(gemelas.length)} opciones que dicen la misma isla y roban a distinta gente: es el par que sólo el filo de color separa, y sin él la comprobación de arriba sería verde por vacío`,
    gemelas.length >= 2,
    gemelas.map((o) => `${o.rotulo} — ${o.ayuda}`),
  );
  /*
   * LA VACUNA, y es la que sostiene que las tres señales hagan falta: con SÓLO el número —que es
   * lo que cabe dentro del cuadrado sin las dos barras de color— hay cuadrados que se ven
   * iguales. Tiene que haberlos, o el terreno y el filo estarían pintados para nada.
   */
  const soloNumero = delEstiaje.map((o) => glifos.get(o.id)?.glifo ?? '?');
  const chocan = soloNumero.filter((t, i) => soloNumero.indexOf(t) !== i);
  comprobar(
    `se ve fallar: con sólo el número dentro del cuadrado, ${String(chocan.length)} de los ${String(delEstiaje.length)} se verían iguales — de ahí el terreno al pie y el filo de la víctima`,
    chocan.length > 0,
    chocan,
  );

  /*
   * EL FILO ES EL COLOR DE LA VÍCTIMA DE VERDAD, leído de la vista y no de una tabla: el mismo
   * `colonos[i].color` con el que esa persona se pinta en el marcador. Un color inventado aquí
   * sería un código nuevo que nadie ha visto nunca.
   */
  const coloresDeLaMesa = new Set((vista as { colonos: { color: string }[] }).colonos.map((c) => c.color));
  const filosRaros = [...glifos.values()].map((g) => g.rail).filter((r) => r !== null && !coloresDeLaMesa.has(r));
  comprobar(
    'el filo de cada cuadrado es el color con el que su víctima se pinta en el marcador, no un código nuevo',
    filosRaros.length === 0 && [...glifos.values()].some((g) => g.rail !== null),
    { filosRaros, deLaMesa: [...coloresDeLaMesa] },
  );
  /*
   * Y LAS ISLAS SIN VÍCTIMA NO LLEVAN FILO. Un color donde no se roba a nadie diría que ahí hay
   * alguien, que es peor que no decir nada: el estiaje se mueve para secar Y para robar, y esas
   * dos jugadas no valen lo mismo.
   */
  comprobar(
    'y las islas donde no hay a quién robar no llevan filo: un color donde no hay nadie diría que lo hay',
    delEstiaje.filter((o) => o.id.endsWith(':nadie')).every((o) => glifos.get(o.id)?.rail === null) &&
      delEstiaje.some((o) => o.id.endsWith(':nadie')),
    delEstiaje.filter((o) => o.id.endsWith(':nadie')).length,
  );

  // ── Y en la pantalla de verdad ───────────────────────────────────────────

  const puesta = mesaPuestaDe(sentados, vista, opciones);
  const html = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', puesta)}
      puesta={puesta}
      tablero={tablero}
      opciones={opciones}
      laSalida="/sala/"
    />,
  );
  /*
   * ═══ SE LEE BOTÓN A BOTÓN, Y NO COMO UNA BOLSA DE GLIFOS ═══
   *
   * La primera versión de esto comparaba el CONJUNTO de glifos pintados contra el conjunto
   * esperado, y pasaba en verde con el número de orden de antes puesto: con veinte destinos,
   * los ordinales van del 1 al 20 y todos los números de isla —del 2 al 12— están dentro de
   * ese rango, así que «cada glifo esperado aparece en la lista» era cierto sin que ni un solo
   * cuadrado dijera lo suyo. Es exactamente el fallo que este bloque existe para cazar, y se
   * coló en el propio comprobador.
   *
   * Así que se emparejan por el `title`, que el carril pinta con el rótulo Y la ayuda dentro y
   * que por tanto identifica a cada opción —incluidas las dos gemelas, que comparten rótulo y
   * se separan por la ayuda—, y se compara cuadrado por cuadrado.
   */
  const porTitulo = new Map<string, string>();
  for (const m of html.matchAll(
    /<button [^>]*class="riberas-carril-opcion[^"]*"[^>]*title="([^"]*)"[\s\S]*?<span class="riberas-carril-glifo"[^>]*>([^<]*)<\/span>/g,
  )) {
    porTitulo.set(m[1] as string, m[2] as string);
  }
  const escapa = (t: string): string => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const malPintados = delEstiaje.filter((o) => {
    const titulo = escapa(o.ayuda.length > 0 ? `${o.rotulo}. ${o.ayuda}` : o.rotulo);
    return porTitulo.get(titulo) !== glifos.get(o.id)?.glifo;
  });
  comprobar(
    `el carril pinta ${String(porTitulo.size)} cuadrados y CADA uno de los del estiaje lleva dentro el número de SU isla, emparejado por su rótulo y no por el conjunto`,
    porTitulo.size >= delEstiaje.length && malPintados.length === 0,
    malPintados.slice(0, 4).map((o) => {
      const titulo = escapa(o.ayuda.length > 0 ? `${o.rotulo}. ${o.ayuda}` : o.rotulo);
      return `«${o.rotulo}»: pinta «${porTitulo.get(titulo) ?? 'nada'}» y su isla es «${glifos.get(o.id)?.glifo ?? '?'}»`;
    }),
  );
  /*
   * EL FILO Y LA BARRA SE PINTAN DE VERDAD, y con un color de la mesa dentro del `style`. Sin
   * esto, la tabla de arriba podría estar perfecta y la pantalla no enseñar ni una raya: es la
   * diferencia entre comprobar la traducción y comprobar lo que se ve.
   */
  const filos = [...html.matchAll(/class="riberas-carril-rail" style="background:([^"]*)"/g)].map((m) =>
    (m[1] as string).trim(),
  );
  comprobar(
    'y el filo de la víctima llega a la pantalla, con el color de la mesa dentro',
    filos.length > 0 && filos.every((c) => coloresDeLaMesa.has(c)),
    filos,
  );
  comprobar(
    'y la barra del terreno también: una por cuadrado con isla, ni una más',
    html.split('class="riberas-carril-terreno"').length - 1 === glifos.size,
    { pintadas: html.split('class="riberas-carril-terreno"').length - 1, conIsla: glifos.size },
  );
  /*
   * ═══ Y EL NOMBRE ACCESIBLE SIGUE CONTANDO LA FRASE ENTERA ═══
   *
   * Lo que se pinta es un resumen, no un recorte del nombre. Un cuadrado que dijera «11» y se
   * llamara «11» sería el mismo botón mudo de antes para quien usa lector de pantalla — y la
   * víctima, que en pantalla es un color, ahí sólo existe en palabras.
   */
  const dichos = [...html.matchAll(/<span class="riberas-carril-dicho"[^>]*>([^<]*)<\/span>/g)].map(
    (m) => m[1] as string,
  );
  const sinDecir = delEstiaje.filter((o) => !dichos.includes(o.rotulo) || !dichos.includes(o.ayuda));
  comprobar(
    'cada cuadrado sigue llevando su rótulo y su ayuda enteros en el árbol: lo pintado es un resumen, no un recorte del nombre',
    sinDecir.length === 0,
    sinDecir.slice(0, 3).map((o) => o.rotulo),
  );
  /*
   * ═══ Y DOS CUADRADOS QUE APUNTAN A ISLAS DISTINTAS NO SE LLAMAN IGUAL ═══
   *
   * Éste es el que faltaba, y el fallo que lo trae se encontró jugando: en la primera partida
   * de verdad, dos de los diecinueve destinos eran iguales en TODO lo que se ve —mismo glifo
   * («10»), mismo terreno al pie, sin filo ninguno porque en ninguna de las dos había a quién
   * robar— y encima con el MISMO RÓTULO, «Mover el estiaje al cantil 10». Se pulsaba uno de los
   * dos a ciegas en una fase que es obligatoria.
   *
   * Se lee del HTML que sale y no de la lista de opciones, que es lo que separa esta línea de
   * las de `verify:riberas`: allí se compra que el juego escriba nombres distintos, aquí que el
   * carril los ENSEÑE — el `title` que sale al posar el ratón y el `riberas-carril-dicho` que es
   * el nombre accesible del botón. Un rótulo perfecto que el carril recortara sería el mismo
   * botón mudo de antes.
   */
  const islaDelTitulo = new Map<string, string>();
  const gemelosDeVerdad: string[] = [];
  for (const o of delEstiaje) {
    const donde = (o.carga as { donde?: unknown }).donde;
    if (typeof donde !== 'string') continue;
    const antes = islaDelTitulo.get(o.rotulo);
    if (antes !== undefined && antes !== donde) gemelosDeVerdad.push(`«${o.rotulo}» nombra a ${antes} y a ${donde}`);
    islaDelTitulo.set(o.rotulo, donde);
  }
  comprobar(
    'dos cuadrados que llevan a ISLAS DISTINTAS nunca se llaman igual: el rumbo separa a las dos que comparten terreno y cifra',
    gemelosDeVerdad.length === 0,
    gemelosDeVerdad,
  );
  /*
   * Y QUE EL CARRIL LO ENSEÑE, no sólo que el juego lo escriba: los rumbos que el rótulo trae
   * tienen que estar en el HTML, dentro del `title` de su botón y dentro del nombre accesible.
   */
  const conRumbo = delEstiaje.filter((o) => / del [a-z]+$/u.test(o.rotulo));
  const noLlegan = conRumbo.filter((o) => {
    const titulo = escapa(o.ayuda.length > 0 ? `${o.rotulo}. ${o.ayuda}` : o.rotulo);
    return !porTitulo.has(titulo) || !dichos.includes(o.rotulo);
  });
  comprobar(
    `hay ${String(conRumbo.length)} destinos con rumbo en esta mesa y los ${String(conRumbo.length)} llegan enteros al carril: en su \`title\` y en su nombre accesible`,
    conRumbo.length > 0 && noLlegan.length === 0,
    noLlegan.slice(0, 3).map((o) => o.rotulo),
  );
  comprobar(
    'y la víctima, que en pantalla es un color, se dice con su nombre en la ayuda: quien no vea colores lo lee igual',
    delEstiaje
      .filter((o) => !o.id.endsWith(':nadie'))
      .every((o) => sentados.some((s) => o.ayuda.includes(s.nombre))),
    delEstiaje
      .filter((o) => !o.id.endsWith(':nadie'))
      .slice(0, 3)
      .map((o) => o.ayuda),
  );

  /*
   * ═══ Y UNA ISLA ROTA POR EL CABLE NO SE LLEVA EL DELTA POR DELANTE ═══
   *
   * `esVistaQueSePinta` mira CUATRO campos y ninguno es la forma de una isla —está dicho en su
   * cabecera—, así que el tipo promete `hex`, `terreno` y `numero` y la puerta no los comprueba.
   * Es el mismo agujero que ya se pagó en `marcadorEnTres` el día que empezó a contar chozas: una
   * vista legítima sin ese campo reventó con «no se puede leer 'length' de undefined».
   *
   * Aquí costaría más: esto se llama en cada render del delta, así que una isla mal formada
   * dejaría la mesa ENTERA sin pintar por un cuadrado que ni siquiera se iba a pintar. Lo que
   * tiene que pasar es que esa isla se salte y las demás sigan teniendo su número.
   */
  const conUnaIslaRota = {
    ...(vista as Record<string, unknown>),
    islas: [{ terreno: 'marisma' }, ...(vista as { islas: unknown[] }).islas.slice(1)],
  };
  let revento = false;
  let sobreviven = 0;
  try {
    sobreviven = glifosDelCarril(conUnaIslaRota, delEstiaje).size;
  } catch {
    revento = true;
  }
  comprobar(
    `una isla sin \`hex\` no tumba el delta entero: no lanza, y los otros ${String(sobreviven)} destinos conservan su número`,
    !revento && sobreviven > 0 && sobreviven < glifos.size,
    { revento, sobreviven, conLaVistaBuena: glifos.size },
  );

  /*
   * ═══ Y LAS LISTAS CORTAS SE QUEDAN COMO ESTABAN ═══
   *
   * Tirar, pasar, aceptar y rechazar no nombran ninguna isla, así que no hay glifo y el cuadrado
   * sigue con su número de orden — que ahí SÍ significa algo: es el atajo de teclado que el
   * carril anuncia. Sin esta línea, «los glifos ya no son 1,2,3…» podría estar pasando porque el
   * número de orden hubiera desaparecido de toda la pantalla.
   */
  const {
    vista: turnoNormal,
    opciones: opcionesNormales,
    sentados: losDelDescarte,
  } = laProyeccionConMazo(3, { descartando: true });
  const tableroNormal = tableroDeLaVista(turnoNormal);
  comprobar('la proyección del descarte trae tablero', tableroNormal !== null);
  if (tableroNormal === null) return;
  const sinIslas = glifosDelCarril(turnoNormal, opcionesNormales);
  comprobar(
    'en el descarte de un siete —cinco botones, uno por clase de bien— ninguna opción tiene glifo de isla: no hay ninguna isla que nombrar',
    sinIslas.size === 0,
    [...sinIslas.keys()],
  );
  const puestaNormal = mesaPuestaDe(losDelDescarte, turnoNormal, opcionesNormales);
  const htmlNormal = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', puestaNormal)}
      puesta={puestaNormal}
      tablero={tableroNormal}
      opciones={opcionesNormales}
      laSalida="/sala/"
    />,
  );
  const cuadradosNormales = [
    ...htmlNormal.matchAll(/<span class="riberas-carril-glifo"[^>]*>([^<]*)<\/span>/g),
  ].map((m) => m[1] as string);
  comprobar(
    'y allí el cuadrado sigue llevando su número de orden, que es el atajo de teclado que el carril anuncia',
    cuadradosNormales.length > 0 &&
      cuadradosNormales.every((g, i) => g === String(i + 1)) &&
      !htmlNormal.includes('riberas-carril-terreno'),
    cuadradosNormales,
  );
}

/**
 * ═══ EL PREGÓN DEL TRUEQUE: LAS PROPUESTAS EN LA PANTALLA, Y LA HOJA DONDE SE CONFIRMA ═══
 *
 * Miguel: «se tiene que mostrar en la pantalla las propuestas de trueque por cada jugador con
 * capacidad de aceptar o rechazar, la aceptación debe tener que confirmarse para que no se
 * acepte por equivocación». Lo que había eran dos cosas que no valían:
 *
 *   · el panel «Trueques» que declara el juego, un renglón de TEXTO por trato con el
 *     seudónimo delante —«t3: Ana da junco por limo a Bruno — propuesta»—, sin nada que
 *     pulsar y, desde la pantalla completa, DENTRO del cajón, o sea detrás de un botón que
 *     hay que abrir. Una propuesta caduca al acabar el turno de quien la hizo, así que una
 *     oferta que sólo se ve abriendo un cajón es una oferta que casi nadie contesta;
 *   · y unos botones sueltos —«Aceptar el trueque t3»— entre los demás, a un solo toque.
 *
 * Lo que se compra aquí es lo de ESTA pantalla: que las tiras se pinten, que no lleven botón
 * de aceptar dentro, que contestar no salga además por el otro lado, que el pregón no sea
 * modal —se lee mientras juega otro— y que la caja no tape lo que hay debajo. Que las frases
 * digan lo que pasó y que el ciclo de vida del trato sea el del reductor lo compra
 * `verify:riberas-en-tres` jugando los movimientos de verdad por el árbitro.
 */
function elPregonDelTrueque(): void {
  paso('El pregón: las propuestas de trueque se ven sin abrir nada, y aceptar cuesta dos toques');

  const fuente = readFileSync(new URL('../src/riberas-en-tres.tsx', import.meta.url), 'utf8');
  const laSala = readFileSync(new URL('../src/sala.tsx', import.meta.url), 'utf8');
  const hoja = readFileSync(new URL('../src/estilo.css', import.meta.url), 'utf8');
  const codigo = sinComentarios(fuente);
  const hojaPelada = hoja.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const reglaDe = (selector: string): string => {
    const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escapado}\\s*\\{([^}]*)\\}`, 'm').exec(hojaPelada)?.[1] ?? '';
  };

  const riberas = elCatalogoQuePublicaElServidor().find((m) => m.id === 'riberas');
  comprobar('Riberas está instalado', riberas !== undefined);
  if (riberas === undefined) return;

  // ── 1. Con propuestas vivas hay pregón, y las tiras están donde se ven ──

  const conPregon = laProyeccionConMazo(3, { elPregon: true });
  const tablero = tableroDeLaVista(conPregon.vista);
  comprobar('la partida del pregón trae tablero declarado, o esto no mediría nada', tablero !== null);
  if (tablero === null) return;
  const puesta = mesaPuestaDe(conPregon.sentados, conPregon.vista, conPregon.opciones);
  const html = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', puesta)}
      puesta={puesta}
      tablero={tablero}
      opciones={conPregon.opciones}
      laSalida="/sala/"
      elRail={<p className="el-rail-de-prueba">el raíl</p>}
    />,
  );
  const pregon = elPregonEnTres(conPregon.vista, 's1', conPregon.opciones);
  comprobar(
    'la partida trae DOS propuestas vivas dirigidas a mí y TRES tratos ya cerrados, o los tres bloques no se medirían',
    pregon !== null && pregon.paraContestar.length === 2 && pregon.cerrados.length === 3,
    pregon && { contestar: pregon.paraContestar.length, mias: pregon.mias.length, cerrados: pregon.cerrados.length },
  );
  if (pregon === null) return;

  comprobar(
    'y se pinta sin mundo, dentro del recuadro y con nombre de región: no hace falta `<canvas>` para leer una propuesta',
    !html.includes('<canvas') && /<div class="riberas-pregon"[^>]*role="region"/.test(html) && html.includes(EL_PREGON_DE_LA_MESA),
    /<div class="riberas-pregon"[^>]*>/.exec(html)?.[0] ?? null,
  );
  const tiras = html.split('class="riberas-pregon-tira"').length - 1;
  comprobar(
    'una tira por trato y ni una más: las dos vivas y las tres cerradas',
    tiras === pregon.paraContestar.length + pregon.mias.length + pregon.cerrados.length && tiras === 5,
    tiras,
  );
  const rotulos = [...html.matchAll(/<h2 class="rotulo-de-panel">([^<]*)<\/h2>/g)].map((m) => m[1]);
  comprobar(
    'y los bloques que se pintan son los que tienen algo: aquí «Para contestar» y los cerrados, y NO «Tuyas» vacío',
    rotulos.includes('Para contestar') && rotulos.includes('Trueques cerrados') && !rotulos.includes('Tuyas'),
    rotulos,
  );

  /*
   * ═══ LA TIRA NO LLEVA BOTÓN DE ACEPTAR, Y ÉSA ES LA MITAD DEL ENCARGO DE MIGUEL ═══
   *
   * «La aceptación debe tener que confirmarse para que no se acepte por equivocación.» La
   * forma de garantizarlo no es un diálogo detrás del botón: es que en la tira no haya botón.
   * Y es además lo que hace que la oferta quepa —medido en el diseño: con «Aceptar» y
   * «Rechazar» al lado a la oferta le quedan 77 puntos en el SE apaisado y 16 en 320×360, o
   * sea cero fichas—. Un `<button>` dentro de otro `<button>` ni siquiera es HTML válido: el
   * navegador lo desanida y lo que queda es un botón suelto encima del tablero.
   */
  const dentroDeLasTiras = [...html.matchAll(/<button[^>]*class="riberas-pregon-tira"[^>]*>([\s\S]*?)<\/button>/g)]
    .map((m) => m[1] ?? '')
    .join('');
  comprobar(
    'la tira ENTERA es el botón y no lleva ninguno dentro: aceptar cuesta dos toques y el primero no está encima del segundo',
    tiras === 5 && !dentroDeLasTiras.includes('<button') && !/Aceptar/i.test(dentroDeLasTiras),
    dentroDeLasTiras.slice(0, 200),
  );
  /*
   * Y LO QUE SE OYE ES LA FRASE ENTERA. En la tira caben «1 junco → 1 limo» y cuatro palabras
   * de estado; lo que un lector tiene que oír es quién, qué, en qué dirección y qué hace un
   * toque. Las dos cajas pintadas van `aria-hidden` para que nada se diga dos veces.
   */
  const laPrimera = pregon.paraContestar[0];
  comprobar(
    'y su nombre accesible es la frase entera con el estado y qué hace un toque, no lo poco que se pinta',
    laPrimera !== undefined && html.includes(`aria-label="${laPrimera.frase}. ${laPrimera.comoAnda}. Toca para contestar"`),
    laPrimera && `${laPrimera.frase}. ${laPrimera.comoAnda}. Toca para contestar`,
  );
  comprobar(
    'y lleva su seudónimo escrito, que es por donde el foco vuelve a la tira al cerrar la hoja',
    pregon.paraContestar.concat(pregon.cerrados).every((t) => html.includes(`data-trato="${t.id}"`)) &&
      codigo.includes('[data-trato="${cual}"]'),
    [...html.matchAll(/data-trato="([^"]+)"/g)].map((m) => m[1]),
  );

  /*
   * ═══ CONTESTAR NO SALE DOS VECES, Y LA MITAD MUDA ES LA QUE IMPORTA ═══
   *
   * Con el pregón pintado, ACEPTAR y RECHAZAR se caen de los botones sueltos: la regla de la
   * casa es que cada movimiento se enseña exactamente una vez. Lo que este bloque compra es
   * que el filtro pase por `opcionesFueraDelPregon` y no por un `filter` escrito aquí, porque
   * la otra mitad —que SIN pregón se queden— es la que salva al respaldo del retablo y al
   * mirón de una propuesta que no se puede contestar en toda la tarde.
   */
  comprobar(
    'con el pregón puesto, contestar no sale además como botón suelto: ni en el carril ni en la lista del cajón',
    !html.includes('Aceptar el trueque') && !html.includes('Rechazar el trueque'),
    palabrasDe(html).slice(0, 300),
  );
  comprobar(
    'y quien lo quita es `opcionesFueraDelPregon` con EL PREGÓN por la puerta, no un filtro escrito en la pantalla: sin pregón los botones se quedan',
    codigo.includes('opcionesFueraDelPregon(') &&
      /opcionesFueraDelPregon\(\s*opcionesFueraDeLaMesa\([^)]*\),\s*pregon\s*\)/.test(codigo.replace(/\s+/g, ' ')),
    /opcionesFueraDelPregon\([^;]*/.exec(codigo)?.[0]?.slice(0, 160) ?? null,
  );
  /*
   * Y EL PREGÓN RECIBE LAS OPCIONES ENTERAS, ANTES DE NINGÚN FILTRO. El mismo orden que
   * `mazoEnLaBarra` con el mazo: al revés, cada tira se quedaría sin los dos botones que
   * cuelga, que son justo lo que hay que pulsar.
   */
  comprobar(
    'y el pregón se compone ANTES, con la lista completa: al revés cada tira se quedaría sin los botones que cuelga',
    /elPregonEnTres\(vista, yo, opciones\)/.test(codigo),
    /elPregonEnTres\([^)]*\)/.exec(codigo)?.[0] ?? null,
  );
  comprobar(
    'y el panel «Trueques» del cajón se retira cuando el pregón lo hereda, compuesto con el otro filtro y sólo para Riberas',
    /panelesFueraDelPregon\(panelesEnTres\(pintado\.tablero\.paneles\), elPregonSePinta\)/.test(sinComentarios(laSala).replace(/\s+/g, ' ')),
    /panelesFueraDelPregon\([^;]*/.exec(sinComentarios(laSala).replace(/\s+/g, ' '))?.[0]?.slice(0, 160) ?? null,
  );

  /*
   * ═══ Y AQUÍ SE PINTA LA MESA DE CINCO, PORQUE LA REGULAR DE ARRIBA NO VE EL ARGUMENTO ═══
   *
   * Lo de arriba exige que la LLAMADA exista. Lo que no puede ver es CON QUÉ se la llama, y
   * ahí estuvo el fallo una fase entera: `elPregonSePinta` llevaba `conLienzo &&` delante
   * —una guarda de cuando el retablo no tenía pregón—, así que por el camino del respaldo la
   * criba recibía `null` y el panel se quedaba. Y el camino del respaldo NO es un respaldo:
   * el atlas del delta trae CUATRO colores, así que con el quinto sentado es la ÚNICA
   * pantalla que hay. Reproducido en el navegador con cinco asientos de verdad: el mismo
   * trueque vivo salía como tira del pregón («1 piedra → 1 limo») y como renglón del panel
   * («t1: Ana da piedra por limo a Bruno — propuesta»), con dos redacciones distintas.
   *
   * Y quitando la guarda `verify:escritorio` salía IGUAL DE VERDE que dejándola. Por eso
   * esto no lee el fuente: pinta `LaMesaPuesta` entera con cinco sentados y cuenta los
   * rótulos del árbol. Se comprueban las DOS mitades —que el pregón esté y que el panel no—
   * porque con una sola, una pantalla que no pintara ninguno de los dos pasaría.
   */
  {
    const cinco = laProyeccionConMazo(5, { elPregon: true });
    const puestaCinco = mesaPuestaDe(cinco.sentados, cinco.vista, cinco.opciones);
    /*
     * EL ÚNICO `window` QUE ESTA PANTALLA TOCA AL PINTARSE, y se pone y se quita aquí.
     *
     * `LaFicha` arma el enlace para invitar con `window.location.origin`, y en Node no hay
     * `window`. Se le da uno con lo justo, en vez de sacar la ficha del raíl: lo que este
     * bloque compra es qué PANELES quedan en el raíl, así que un raíl recortado para que
     * quepa en Node sería comprar otra pantalla. Se restaura al salir para que ningún otro
     * bloque de este fichero herede un `window` que no pidió.
     */
    const conVentana = globalThis as { window?: unknown };
    const habiaVentana = 'window' in conVentana ? conVentana.window : undefined;
    conVentana.window = { location: { origin: 'https://ejemplo.invalid' } };
    const htmlCinco = renderToStaticMarkup(
      <LaMesaPuesta
        manifiesto={riberas}
        mesa={unaMesa('dentro', puestaCinco)}
        silla="a"
        codigoDeLaUrl="QWXYZ"
      />,
    );
    if (habiaVentana === undefined) delete conVentana.window;
    else conVentana.window = habiaVentana;
    const rotulosCinco = [...htmlCinco.matchAll(/<h2 class="rotulo-de-panel">([^<]*)<\/h2>/g)].map((m) => m[1]);
    comprobar(
      'con CINCO sentados la mesa cae al retablo, que es la única pantalla que hay ahí, y aun así pinta el pregón',
      htmlCinco.includes('riberas-pregon-tira') && rotulosCinco.includes(EL_PREGON_DE_LA_MESA),
      rotulosCinco,
    );
    comprobar(
      'y con el pregón pintado el panel «Trueques» del cajón NO está: el mismo trueque no se cuenta dos veces con dos redacciones',
      !rotulosCinco.includes(PANEL_DE_TRUEQUES),
      rotulosCinco,
    );
    /*
     * ═══ Y SIN DOS CONJUNTOS QUE NO PODÍAN CAERSE NUNCA ═══
     *
     * Esta línea llevaba `htmlCinco.includes('el-rail-de-verdad') === false`, y esa cadena no
     * existe en NINGÚN fichero del árbol: un `grep` sobre todo el repositorio acierta sólo en
     * esta misma línea, así que el conjunto era siempre cierto. Y llevaba `length >= 5`, que
     * vale 8 con el código bueno y 9 con la vacuna del `conLienzo`: tampoco distinguía nada.
     * Media comprobación que no se había visto caer, justo al lado de la que caza el fallo.
     *
     * Lo que de verdad quiere comprarse es que al retirar «Trueques» no se haya llevado por
     * delante el resto del raíl, así que se nombran los paneles que TIENEN que seguir, uno a
     * uno y por su rótulo.
     */
    const LOS_QUE_SE_QUEDAN = ['Lo mío', 'La mesa', 'El vado largo', 'La mayor guardia'];
    const seFueronDeMas = LOS_QUE_SE_QUEDAN.filter((p) => !rotulosCinco.some((r) => r.toLowerCase() === p.toLowerCase()));
    comprobar(
      'y no es que falte el raíl entero: los demás paneles del juego siguen puestos, uno por uno',
      seFueronDeMas.length === 0,
      { seFueronDeMas, rotulosCinco },
    );
    comprobar(
      'y el renglón de texto del panel viejo tampoco se cuela por otro sitio: «da … por … a …» no está en toda la pantalla',
      !/ da .{0,40} por .{0,40} — propuesta/.test(htmlCinco),
      /.{0,60} — propuesta/.exec(htmlCinco)?.[0] ?? null,
    );
  }

  // ── 2. NO es modal, y eso son cuatro cosas que NO están ──

  /*
   * El cajón y el menú de elegir llevan velo, `role="dialog"`, `aria-modal` y trampa de foco.
   * El pregón no lleva ninguna de las cuatro, Y ES EL PUNTO: lo lee quien NO tiene el turno
   * mientras otro juega, así que por debajo se sigue girando el tablero y cogiendo cartas. Un
   * velo aquí sería exactamente el fallo que este mueble viene a arreglar.
   */
  const elMarcadoDelPregon = /<div class="riberas-pregon"[^>]*>/.exec(html)?.[0] ?? '';
  comprobar(
    'el pregón NO es modal: ni `aria-modal`, ni `role="dialog"`, ni velo montado con él — por debajo se sigue jugando, que es para lo que existe',
    !elMarcadoDelPregon.includes('aria-modal') &&
      !elMarcadoDelPregon.includes('role="dialog"') &&
      !html.includes('riberas-velo'),
    elMarcadoDelPregon,
  );
  comprobar(
    'y la rueda encima de él la desplaza a él y no acerca el delta: está NOMBRADO en la lista de las cajas que se desplazan solas, junto al cajón, el carril, el menú y el componedor',
    codigo.includes(
      'const SE_DESPLAZAN_SOLAS = [EL_CAJON, EL_CARRIL, EL_MENU, EL_PREGON, EL_COMPONEDOR_EN_EL_LIENZO]',
    ),
    /const SE_DESPLAZAN_SOLAS = \[[^\]]*\]/.exec(codigo)?.[0] ?? null,
  );
  const reglaDelPregon = reglaDe('.riberas-pregon');
  comprobar(
    'y rueda por dentro también CON EL DEDO: el recuadro tiene `touch-action: none` por el gesto del delta y el pregón lo heredaría, así que la tercera propuesta quedaría fuera de alcance sin un error en ninguna consola',
    /overflow-y:\s*auto/.test(reglaDelPregon) &&
      /touch-action:\s*auto/.test(reglaDelPregon) &&
      /overscroll-behavior:\s*contain/.test(reglaDelPregon),
    reglaDelPregon.replace(/\s+/g, ' '),
  );
  comprobar(
    'y va POR DEBAJO del velo del cajón y del menú, que sí son modales: con uno abierto, el pregón queda detrás y no se pulsa',
    /z-index:\s*2\b/.test(reglaDelPregon) &&
      /z-index:\s*3\b/.test(reglaDe('.riberas-velo')) &&
      /z-index:\s*4\b/.test(reglaDe('.riberas-cajon')),
    { pregon: reglaDelPregon.replace(/\s+/g, ' ').slice(0, 120) },
  );
  comprobar(
    'el ancho no está en la hoja —lo pone `elEstiloDelPregon` con el mismo `anchoDeLaCinta`— y NO lleva el suelo de ancho del cajón, que sólo es legítimo por ser modal',
    !/width:/.test(reglaDelPregon) && !/min-width:/.test(reglaDelPregon) && codigo.includes('elEstiloDelPregon(ancho, alto)'),
    reglaDelPregon.replace(/\s+/g, ' '),
  );
  comprobar(
    'y arranca al pie de la cinta, en la misma unidad que ella y que el cajón, con una tira más abajo cuando hay carril',
    /top:\s*2\.75rem/.test(reglaDelPregon) && /top:\s*5\.5rem/.test(reglaDe('.riberas-pregon-bajo-el-carril')),
    { pregon: reglaDelPregon.replace(/\s+/g, ' '), conCarril: reglaDe('.riberas-pregon-bajo-el-carril').replace(/\s+/g, ' ') },
  );
  comprobar(
    'y cada tira mide el suelo de toque, en `rem`: es la caja que se pulsa para contestar',
    reglaDe('.riberas-pregon-tira').includes('min-height: 2.75rem;'),
    reglaDe('.riberas-pregon-tira').replace(/\s+/g, ' '),
  );
  /*
   * ═══ Y EL HUECO DE LETRAS SE DESCUENTA DE LA HOJA, NO DE MEMORIA ═══
   *
   * De `huecoDeLaTira` sale si en el renglón de estado cabe el nombre de quien contestó, y esa
   * cuenta se apoya en lo que la hoja pinta ALREDEDOR del texto: los dos rellenos, el raíl de
   * color y el aire entre el raíl y las letras. Escrita de memoria se desfasa en silencio —una
   * cuenta que dice que caben diez letras más de las que caben no falla: recorta con puntos
   * suspensivos justo donde prometía no hacerlo—. Se leen los tres números DE LA HOJA.
   */
  const laTira = reglaDe('.riberas-pregon-tira');
  const relleno = Number(/padding:\s*0\s+(\d+)px/.exec(laTira)?.[1] ?? NaN);
  const aire = Number(/gap:\s*(\d+)px/.exec(laTira)?.[1] ?? NaN);
  const rail = Number(/width:\s*(\d+)px/.exec(reglaDe('.riberas-pregon-rail'))?.[1] ?? NaN);
  comprobar(
    'el hueco de letras de la tira descuenta EXACTAMENTE lo que la hoja pinta a su alrededor —los dos rellenos, el raíl de color y su aire—, leído de la hoja y no escrito de memoria',
    Number.isFinite(relleno) && Number.isFinite(aire) && Number.isFinite(rail) &&
      huecoDeLaTira(200) === 200 - 2 * relleno - rail - aire &&
      huecoDeLaTira(rail) === 0,
    { relleno, aire, rail, hueco: huecoDeLaTira(200) },
  );
  comprobar(
    'y los dos renglones se recortan con puntos suspensivos y con `min-width: 0`, sin el cual una oferta larga empujaría la tira y se llevaría por delante el ancho medido de la cinta',
    /min-width:\s*0/.test(reglaDe('.riberas-pregon-dicho')) &&
      /text-overflow:\s*ellipsis/.test(reglaDe('.riberas-pregon-oferta,\n.riberas-pregon-estado')),
    { dicho: reglaDe('.riberas-pregon-dicho').replace(/\s+/g, ' ') },
  );

  // ── 3. La hoja donde se confirma, y es `ElijeUna` y no un quinto modal casi igual ──

  comprobar(
    'la hoja de una propuesta es el MISMO `ElijeUna` que las otras preguntas —velo, `role="dialog"`, trampa de foco escrita una vez, `Escape`— y no un quinto modal casi igual',
    /<ElijeUna\s+titulo=\{laTiraAbierta\.frase\}/.test(codigo) &&
      codigo.includes('nota={laTiraAbierta.comoAnda}'),
    /<ElijeUna[^>]*laTiraAbierta[^>]*/.exec(codigo)?.[0]?.slice(0, 120) ?? null,
  );
  comprobar(
    'y sus botones son las opciones DEL JUEGO, aceptar delante, y desaparecen solas cuando el juego no las ofrece: una tira cerrada abre la hoja en lectura',
    codigo.includes('[laTiraAbierta.aceptar, laTiraAbierta.rechazar].filter'),
    /\[laTiraAbierta[^\n]*/.exec(codigo)?.[0] ?? null,
  );
  /*
   * Y SE GUARDA EL SEUDÓNIMO Y NO LA TIRA. Una propuesta se acepta, se aparta o caduca al
   * pasar el turno, y la lista sólo recuerda las ocho últimas: guardando el objeto, la hoja se
   * quedaría ofreciendo «Aceptar» sobre un trato que el juego ya no ofrece.
   */
  comprobar(
    'y la hoja guarda el SEUDÓNIMO y busca la tira en el pregón de cada render: guardando el objeto se quedaría ofreciendo aceptar sobre un trato que el juego ya no ofrece',
    /const \[tratoAbierto, ponerTratoAbierto\] = useState<string \| null>\(null\)/.test(codigo) &&
      codigo.includes('.find((t) => t.id === tratoAbierto)'),
    /const laTiraAbierta[^;]*/.exec(codigo)?.[0]?.slice(0, 200) ?? null,
  );
  comprobar(
    'y si el trato desaparece con la hoja abierta, la hoja se cierra sola y el foco vuelve al recuadro en vez de caer al `body`',
    /if \(tratoAbierto === null \|\| laTiraAbierta !== null\) return;/.test(codigo) &&
      codigo.includes('elRecuadro.current?.focus()'),
    /if \(tratoAbierto === null[^}]*}/.exec(codigo)?.[0]?.slice(0, 200) ?? null,
  );
  comprobar(
    'y NO entra en `soltarTodo`: allí se suelta lo que se tiene en la mano porque cambió la mesa, y una hoja que se cerrara con cada jugada ajena sería ilegible justo en el turno de otro',
    !/soltarTodo = useCallback\(\(\) => \{[^}]*ponerTratoAbierto/.test(codigo),
    /soltarTodo = useCallback\(\(\) => \{[\s\S]{0,200}/.exec(codigo)?.[0] ?? null,
  );

  // ── 4. La cuenta del sitio: el pregón se para en el asa, y el cartel se apaga ──

  /*
   * ═══ LA REGLA DE EXCLUSIÓN, QUE ES LA QUE PAGA ESTA FASE ═══
   *
   * Con la cinta a 88 y el cartel de un naipe puesto, al pregón le quedan 32 puntos en el SE
   * apaisado: CERO tiras. Así que con el pregón pintado el cartel NO se pinta. Se compra por
   * las DOS mitades: que con pregón no salga en NINGUNO de los dieciocho lienzos, y que sin
   * pregón sí salga —sin la segunda, un `return null` puesto por descuido pasaría en verde—.
   */
  const explicacion = { hace: 'Mueve el estiaje.', consigues: 'Robas un bien.', usas: 'Se juega en tu turno.' };
  const conPregonPuesto = LIENZOS.filter(([, a, al]) => elCartelQueCabe({ ancho: a, alto: al }, 4, explicacion, RAIZ_DE_LA_CASA, false, true) !== null);
  const sinPregon = LIENZOS.filter(([, a, al]) => elCartelQueCabe({ ancho: a, alto: al }, 4, explicacion, RAIZ_DE_LA_CASA, false, false) !== null);
  comprobar(
    'con el pregón pintado el cartel de los naipes NO se pinta en ninguno de los dieciocho lienzos: con la cinta a 88 y el cartel puesto al pregón le quedan 32 puntos en el SE apaisado, o sea cero tiras',
    conPregonPuesto.length === 0 && sinPregon.length === LIENZOS.length,
    { conPregon: conPregonPuesto.length, sinPregon: sinPregon.length },
  );

  /*
   * Y EL PREGÓN NO CUELGA HASTA EL CANTO. Se para en el techo del asa de la barra menos el
   * mismo aire con que se para el cartel, porque NO es modal: hasta abajo taparía las tres
   * piezas de construir y el naipe del mazo, o sea cromo opaco encima de lo único que se pulsa
   * para jugar. Se mide contra `techoDelAsaEnPuntos`, la misma función que usa el cartel.
   */
  const alturas = LIENZOS.map(([nombre, a, al]) => {
    const lienzo = { ancho: a, alto: al };
    const cinta = ladoDelBotonDeLaCinta(RAIZ_DE_LA_CASA);
    return {
      nombre,
      sin: elAltoDelPregon(lienzo, 4, false),
      con: elAltoDelPregon(lienzo, 4, true),
      techo: techoDelAsaEnPuntos(lienzo, 4),
      cinta,
      alto: al,
    };
  });
  comprobar(
    'el pregón se para en el techo del asa menos el aire, y nunca llega al canto de abajo: por debajo están las tres piezas de construir y el naipe del mazo, y esto NO es modal',
    alturas.every((f) => Math.abs(f.sin + f.cinta + 8 - f.techo) < 0.01 && f.sin < f.alto - f.cinta),
    alturas.map((f) => [f.nombre, +f.sin.toFixed(1), +f.techo.toFixed(1)]),
  );
  const tirasSin = alturas.map((f) => cuantasTirasSeVen(f.sin));
  const tirasCon = alturas.map((f) => cuantasTirasSeVen(f.con));
  comprobar(
    'y caben CUATRO tiras sin carril y TRES con él en los dieciocho lienzos, que es lo que dice la cabecera de `elAltoDelPregon`: los peores son 288×355, 288×317, 320×360, el SE apaisado y el Android de 360',
    Math.min(...tirasSin) === 4 && Math.min(...tirasCon) === 3 && Math.max(...tirasSin) === 16,
    { peorSin: Math.min(...tirasSin), peorCon: Math.min(...tirasCon), mejor: Math.max(...tirasSin) },
  );
  comprobar(
    'y con carril NUNCA caben más que sin él: la segunda tira de la cinta cuesta, y con la resta escrita a un número fijo saldrían idénticas y nada se pondría rojo',
    alturas.every((f, i) => (tirasCon[i] as number) <= (tirasSin[i] as number)) &&
      alturas.some((f, i) => (tirasCon[i] as number) < (tirasSin[i] as number)),
    LIENZOS.map(([n], i) => [n, tirasSin[i], tirasCon[i]]),
  );
  comprobar(
    'y `elEstiloDelPregon` pone ese alto en el `maxHeight` y el ancho en el `width`, y nada más; con el lienzo sin medir no pone estilo y manda la hoja',
    JSON.stringify(elEstiloDelPregon({ ancho: 115.2 }, 223.9)) === '{"width":"115px","maxHeight":"224px"}' &&
      elEstiloDelPregon({ ancho: 0 }, 100) === undefined,
    elEstiloDelPregon({ ancho: 115.2 }, 223.9),
  );

  /*
   * ═══ Y EL RENGLÓN DE ESTADO: SE RECORTA EL NOMBRE, NUNCA EL ESTADO ═══
   *
   * Medido frase a frase y no lienzo a lienzo, que es lo que la regla pide: en el SE apaisado
   * «la aceptó Ana» entra y «se la llevó alguien», seis letras más, no.
   *
   * La frase larga era «caducó sin respuesta» y se cambia porque dejó de existir: desde que
   * la guarda del oferente cierra el trato impagable, a «caducada» se llega también pulsando
   * «Aceptar», y decir que caducó SIN RESPUESTA sería lo único falso de la tira. Se mide con
   * otra de las que el pregón escribe de verdad, que es lo que esta comprobación necesita:
   * medir una frase que ninguna pantalla pinta no dice nada de ninguna pantalla.
   */
  const aceptada = { comoAnda: 'la aceptó Ana', comoAndaSinNombre: 'aceptada' };
  const conNombre = LIENZOS.filter(([, a, al]) => {
    const cinta = loQueLlevaLaCinta(a, al, huecoMinimoDeLaFrase(RAIZ_DE_LA_CASA), ladoDelBotonDeLaCinta(RAIZ_DE_LA_CASA));
    return elEstadoQueCabe(aceptada, huecoDeLaTira(cinta.ancho), RAIZ_DE_LA_CASA) === aceptada.comoAnda;
  });
  comprobar(
    'el nombre de quien contestó cabe en CATORCE de los dieciocho lienzos, y en los cuatro más estrechos se recorta EL NOMBRE y nunca el estado: saber que te la aceptaron importa más que saber quién',
    conNombre.length === 14 &&
      !conNombre.some(([n]) => n.startsWith('escritorio de pie')) &&
      elEstadoQueCabe(aceptada, 0, RAIZ_DE_LA_CASA) === 'aceptada',
    { cuantos: conNombre.length, fuera: LIENZOS.filter((l) => !conNombre.includes(l)).map(([n]) => n) },
  );
  comprobar(
    'y se decide FRASE A FRASE y no lienzo a lienzo: en el SE apaisado «la aceptó Ana» entra y «se la llevó alguien», que son seis letras más, no',
    (() => {
      const cinta = loQueLlevaLaCinta(568, 320, huecoMinimoDeLaFrase(RAIZ_DE_LA_CASA), ladoDelBotonDeLaCinta(RAIZ_DE_LA_CASA));
      const h = huecoDeLaTira(cinta.ancho);
      return (
        elEstadoQueCabe(aceptada, h, RAIZ_DE_LA_CASA) === 'la aceptó Ana' &&
        elEstadoQueCabe({ comoAnda: 'se la llevó alguien', comoAndaSinNombre: 'aceptada' }, h, RAIZ_DE_LA_CASA) === 'aceptada'
      );
    })(),
  );
  /*
   * Y LO QUE NO CABE EN LOS ESTRECHOS ES LA OFERTA. El diseño la pinta con FICHAS de bien y
   * ahí caben cuatro en el peor lienzo; el DOM la escribe con palabras y se queda corto antes.
   * Queda medido para que quien toque el reparto de la cinta vuelva a mirarlo.
   */
  const laOferta = '1 junco → 1 limo';
  const cabeEntera = LIENZOS.filter(([, a, al]) => {
    const cinta = loQueLlevaLaCinta(a, al, huecoMinimoDeLaFrase(RAIZ_DE_LA_CASA), ladoDelBotonDeLaCinta(RAIZ_DE_LA_CASA));
    /* Con la MISMA función que decide el renglón de estado: si la oferta cabiera, la elegiría. */
    return elEstadoQueCabe({ comoAnda: laOferta, comoAndaSinNombre: '!' }, huecoDeLaTira(cinta.ancho), RAIZ_DE_LA_CASA) === laOferta;
  });
  comprobar(
    'y la oferta entera cabe en ONCE de los dieciocho: en los siete de pie más estrechos se recorta con puntos suspensivos, y la frase completa sigue en el árbol y en la hoja',
    cabeEntera.length === 11,
    { cuantos: cabeEntera.length, fuera: LIENZOS.filter((l) => !cabeEntera.includes(l)).map(([n]) => n) },
  );

  // ── 5. Y EN MI TURNO SE PLIEGA, que es el agujero que salió jugando y no leyendo ──

  /*
   * ═══ EL PREGÓN OPACO TAPABA EL TERCIO DE ARRIBA DEL TABLERO EN EL TURNO PROPIO ═══
   *
   * Medido en una partida de verdad: con las propuestas propias vivas la caja iba de y=159 a
   * y≈540 de un recuadro de 857, o sea el 44 % de arriba del tablero, justo encima de los
   * anillos de fundar. Y lo que tapaba era lo que NO hay que contestar. Se compra por sus dos
   * mitades, que es lo que impide arreglar una y romper la otra:
   *
   *   · CON algo dirigido a mí NO se pliega nunca —taparlo es su trabajo—;
   *   · SIN nada que contestar se pliega a UNA tira, y las cinco de dentro no se pintan.
   */
  const mias = laProyeccionConMazo(3, { misPropuestas: true });
  const elPregonMio = elPregonEnTres(mias.vista, 's1', mias.opciones);
  comprobar(
    'el escenario del pliegue es el reverso del otro: TRES ofertas mías en pie, DOS ya cerradas y NADA dirigido a mí, que es el único estado en el que el pregón puede plegarse',
    elPregonMio !== null &&
      elPregonMio.mias.length === 3 &&
      elPregonMio.cerrados.length === 2 &&
      elPregonMio.paraContestar.length === 0,
    elPregonMio && {
      contestar: elPregonMio.paraContestar.length,
      mias: elPregonMio.mias.length,
      cerrados: elPregonMio.cerrados.length,
    },
  );
  comprobar(
    'y `elPregonSePliega` dice que SÍ en ése y que NO en el que tiene dos propuestas esperando mi respuesta: la regla es «no hay nada que contestar» y no «es mi turno», aunque hoy sean la misma frase',
    elPregonSePliega(elPregonMio) && !elPregonSePliega(pregon) && !elPregonSePliega(null),
    { mio: elPregonSePliega(elPregonMio), paraMi: elPregonSePliega(pregon) },
  );
  const puestaMia = mesaPuestaDe(mias.sentados, mias.vista, mias.opciones);
  const tableroMio = tableroDeLaVista(mias.vista);
  comprobar('y ese escenario trae tablero declarado, o esto no pintaría nada', tableroMio !== null);
  if (tableroMio === null) return;
  const htmlPlegado = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', puestaMia)}
      puesta={puestaMia}
      tablero={tableroMio}
      opciones={mias.opciones}
      laSalida="/sala/"
      elRail={<p className="el-rail-de-prueba">el raíl</p>}
    />,
  );
  const tirasPlegado = htmlPlegado.split('class="riberas-pregon-tira').length - 1;
  comprobar(
    'con el pregón plegado se pinta UNA tira y no cinco: las tres mías y las dos cerradas dejan de estar encima del tablero justo en el turno en que se decide dónde construir',
    tirasPlegado === 1 &&
      htmlPlegado.includes('riberas-pregon-resume') &&
      !/<h2 class="rotulo-de-panel">Tuyas<\/h2>/.test(htmlPlegado) &&
      !/<h2 class="rotulo-de-panel">Trueques cerrados<\/h2>/.test(htmlPlegado),
    {
      tiras: tirasPlegado,
      rotulos: [...htmlPlegado.matchAll(/<h2 class="rotulo-de-panel">([^<]*)<\/h2>/g)].map((m) => m[1]),
    },
  );
  comprobar(
    'y con algo que contestar NO se pliega: la tira que resume no se pinta y las cinco siguen ahí, porque taparle el tablero a quien tiene que contestar es justo para lo que el pregón existe',
    !html.includes('riberas-pregon-resume') && tiras === 5,
    { resume: html.includes('riberas-pregon-resume'), tiras },
  );
  const elResumen = elResumenDelPregon(elPregonMio);
  comprobar(
    'la tira plegada dice las DOS cifras —cuántas mías en pie y cuántas ya cerradas— y se anuncia como región desplegable, no como una propuesta más',
    elResumen !== null &&
      elResumen.cuantas === 3 &&
      elResumen.cerradas === 2 &&
      elResumen.dicho === '3 propuestas tuyas' &&
      elResumen.comoAnda === 'y 2 ya cerradas' &&
      htmlPlegado.includes(`aria-label="${elResumen.seOye}"`) &&
      /<button[^>]*class="riberas-pregon-tira riberas-pregon-resume"[^>]*aria-expanded="false"/.test(htmlPlegado),
    elResumen,
  );
  /*
   * ═══ Y «CERRADAS» NO ES «TROCADAS», QUE ES LO QUE DECÍA Y ERA FALSO ═══
   *
   * La versión larga de esta cifra decía «y N ya trocadas», y de las cerradas sólo se trocan
   * las ACEPTADAS: entre ellas hay apartadas y caducadas. Con seis cerradas de las que tres
   * las rechazaron, la cinta decía literalmente «1 propuesta tuya | y 6 ya trocadas». Y la
   * que mentía era justo la que se lee: la corta ya decía «cerradas», y la corta es la que
   * sale cuando el sitio NO llega, o sea la que casi nunca sale.
   *
   * Se mide con las cerradas MEZCLADAS y no con dos aceptadas, que es lo que había arriba:
   * con todas aceptadas «trocadas» habría sido verdad y la comprobación no habría dicho
   * nada. Se mira en las TRES redacciones que salen de aquí —la larga, la corta y la que se
   * oye— porque la que mentía era una sola de las tres.
   */
  const unCerrado = elPregonMio?.cerrados[0];
  const conDeTodo =
    unCerrado === undefined || elPregonMio === null
      ? null
      : elResumenDelPregon({
          paraContestar: [],
          mias: elPregonMio.mias,
          cerrados: [
            { ...unCerrado, estado: 'aceptada' },
            { ...unCerrado, estado: 'aceptada' },
            { ...unCerrado, estado: 'aceptada' },
            { ...unCerrado, estado: 'rechazada' },
            { ...unCerrado, estado: 'rechazada' },
            { ...unCerrado, estado: 'rechazada' },
          ],
        });
  comprobar(
    'con seis cerradas de las que TRES las rechazaron, la cinta dice «cerradas» y no «trocadas»: trocar es sólo lo que se aceptó',
    conDeTodo !== null &&
      conDeTodo.cerradas === 6 &&
      conDeTodo.comoAnda === 'y 6 ya cerradas' &&
      !/trocad/i.test(`${conDeTodo.comoAnda} ${conDeTodo.comoAndaSinNombre} ${conDeTodo.seOye}`),
    conDeTodo,
  );
  comprobar(
    'y en singular tampoco: una sola cerrada que apartaron no es «1 ya trocada»',
    unCerrado !== undefined &&
      (() => {
        const una = elResumenDelPregon({ paraContestar: [], mias: elPregonMio?.mias ?? [], cerrados: [{ ...unCerrado, estado: 'rechazada' }] });
        return una !== null && una.comoAnda === 'y 1 ya cerrada' && !/trocad/i.test(`${una.comoAnda} ${una.seOye}`);
      })(),
    unCerrado === undefined ? null : elResumenDelPregon({ paraContestar: [], mias: elPregonMio?.mias ?? [], cerrados: [{ ...unCerrado, estado: 'rechazada' }] }),
  );

  const unaSola = elPregonMio?.mias[0];
  comprobar(
    'y en singular no dice «1 propuestas»: la misma tira se lee en la mesa de un trato y en la de ocho',
    unaSola !== undefined &&
      (() => {
        const uno = elResumenDelPregon({ paraContestar: [], mias: [unaSola], cerrados: [] });
        return (
          uno !== null &&
          uno.dicho === '1 propuesta tuya' &&
          uno.dichoCorto === '1 tuya' &&
          uno.comoAnda === 'esperando respuesta'
        );
      })(),
    unaSola === undefined ? null : elResumenDelPregon({ paraContestar: [], mias: [unaSola], cerrados: [] }),
  );
  /*
   * Y LA PUERTA DE VUELTA. La tira se pinta TAMBIÉN con el pregón desplegado —con
   * `aria-expanded` en cierto y el triángulo al revés—: es lo único que vuelve a plegarlo, y
   * un mueble que sólo se sabe abrir tapa el tablero hasta que cambia el turno. Se lee del
   * fuente porque desplegarlo es pulsar, y en Node no hay quien pulse.
   */
  comprobar(
    'y la tira que resume se pinta también con el pregón DESPLEGADO, que es la única puerta de vuelta: un mueble que sólo se sabe abrir tapa el tablero hasta que cambia el turno',
    /\{resumen === null \? null : \(/.test(codigo) &&
      codigo.includes('aria-expanded={desplegado}') &&
      /\{sePliega && !desplegado\s*\?\s*null\s*:\s*bloques\.map/.test(codigo),
    /\{sePliega && !desplegado[\s\S]{0,80}/.exec(codigo)?.[0] ?? null,
  );
  /*
   * Y SE VUELVE A PLEGAR SOLO CUANDO DEJA DE PODER PLEGARSE, no con cada revisión del sondeo:
   * cerrarle el pregón debajo a quien lo abrió sería el mismo fallo que un cajón que se cierra
   * solo, y eso ya está apuntado en este cliente como peor que no tenerlo.
   */
  comprobar(
    'y lo desplegado se olvida cuando el pregón deja de poder plegarse —o sea al llegar algo que contestar—, y no en cada jugada: el turno siguiente empieza plegado y nadie se lo cierra a media lectura',
    /if \(!pregonSePliega\) ponerPregonDesplegado\(false\);/.test(codigo) &&
      /\}, \[pregonSePliega\]\);/.test(codigo) &&
      !/soltarTodo = useCallback\(\(\) => \{[^}]*ponerPregonDesplegado/.test(codigo),
    /if \(!pregonSePliega\)[\s\S]{0,80}/.exec(codigo)?.[0] ?? null,
  );
  /*
   * ═══ Y CUÁNTO TABLERO DEVUELVE, MEDIDO EN LOS DIECIOCHO LIENZOS ═══
   *
   * `elAltoDelPregon` es lo que el pregón desplegado PUEDE ocupar —el techo del asa—, y en el
   * turno propio llegaba justo ahí. `altoDelPregonPlegado` son 63,75 puntos fijos. La cifra
   * que se compra es la de la partida: aquel 44 % pasa a ser menos del 10 % en los lienzos
   * altos, y en NINGUNO de los dieciocho el plegado ocupa más que el desplegado.
   */
  const loQueTapa = LIENZOS.map(([nombre, a, al]) => ({
    nombre,
    alto: al,
    abierto: elAltoDelPregon({ ancho: a, alto: al }, 4, false),
    plegado: altoDelPregonPlegado(RAIZ_DE_LA_CASA),
  }));
  comprobar(
    'plegado son 63,75 puntos —su aire más una tira— y no ocupa más que desplegado en ninguno de los dieciocho lienzos: es lo mismo que decir que plegarlo nunca tapa más tablero',
    Math.abs(altoDelPregonPlegado(RAIZ_DE_LA_CASA) - 63.75) < 0.01 &&
      Math.abs(altoDelPregonPlegado(16) - 60) < 0.01 &&
      loQueTapa.every((f) => f.plegado <= f.abierto),
    { plegado: +altoDelPregonPlegado(RAIZ_DE_LA_CASA).toFixed(2), conRaiz16: altoDelPregonPlegado(16) },
  );
  const losAltos = loQueTapa.filter((f) => f.alto >= 800);
  comprobar(
    'y en los lienzos altos —los de la forma del recuadro de 857 donde se midió el 44 %— el pregón pasa de poder tapar más de un tercio del tablero a tapar menos de un décimo',
    losAltos.length > 0 && losAltos.every((f) => f.abierto / f.alto > 0.33 && f.plegado / f.alto < 0.1),
    losAltos.map((f) => [f.nombre, `${((f.abierto / f.alto) * 100).toFixed(1)} %`, `${((f.plegado / f.alto) * 100).toFixed(1)} %`]),
  );
}

/**
 * ═══ EL TRUEQUE EN EL RETABLO, QUE ES LA ÚNICA PANTALLA DE UNA MESA DE CINCO O DE SEIS ═══
 *
 * `MANIFIESTO_RIBERAS.jugadores` admite hasta SEIS y el atlas del delta trae CUATRO colores,
 * así que con el quinto sentado `bastanColores` manda al retablo y ahí se juega la partida
 * entera. Hasta esta fase, en esas mesas:
 *
 *   · las propuestas de trueque no se veían —el pregón cuelga de la cinta, y aquí no hay
 *     cinta—, sino que aceptar y rechazar eran botones sueltos de `AccionesDelTablero`, a UN
 *     toque, o sea sin la confirmación que Miguel pidió;
 *   · y no había ninguna manera de MONTAR una oferta de varios bienes: el juego declara la
 *     puerta y no enumera la combinatoria (5.000 opciones y 1.141,9 kB por lectura), así que
 *     sin componedor un tres por dos era jugable por el cable y no con el dedo.
 *
 * Lo que este bloque compra es lo de ESTA pantalla: el ORDEN en el DOM —el pregón antes del
 * tablero, porque debajo no se ve—, que la tira no lleve botón de aceptar, que contestar no
 * salga además por los otros dos caminos, y que el componedor exista, no monte `disabled`
 * nativo y saque su botón de la DECLARACIÓN y no de la lista de acciones. Que las cuentas del
 * componedor sean las del motor lo compra `verify:riberas-en-tres`, jugándolas por el árbitro.
 */
function elTruequeEnElRetablo(): void {
  paso('El retablo de cinco: el pregón antes del tablero, la hoja donde se confirma, y el componedor');

  const fuente = readFileSync(new URL('../src/riberas-en-tres.tsx', import.meta.url), 'utf8');
  const codigo = sinComentarios(fuente);
  const codigoSeguido = codigo.replace(/\s+/g, ' ');
  const riberas = elCatalogoQuePublicaElServidor().find((m) => m.id === 'riberas');
  comprobar('Riberas está instalado', riberas !== undefined);
  if (riberas === undefined) return;

  // ── 1. Con cinco sentados y propuestas vivas: el retablo, y el pregón encima ──

  const conPregon = laProyeccionConMazo(5, { elPregon: true });
  const tablero = tableroDeLaVista(conPregon.vista);
  comprobar('la mesa de cinco con propuestas trae tablero declarado', tablero !== null);
  if (tablero === null) return;
  comprobar(
    'y NO cabe en el lienzo: son cinco colonos y el atlas trae cuatro colores, o sea que esto es el retablo y no un respaldo',
    !seVeEnTres(conPregon.vista),
  );
  const puesta = mesaPuestaDe(conPregon.sentados, conPregon.vista, conPregon.opciones);
  const html = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', puesta)}
      puesta={puesta}
      tablero={tablero}
      opciones={conPregon.opciones}
      laSalida="/sala/"
    />,
  );
  const texto = palabrasDe(html);
  const pregon = elPregonEnTres(conPregon.vista, 's1', conPregon.opciones);
  comprobar(
    'y hay propuestas vivas dirigidas a mí, o esto no mediría nada',
    pregon !== null && pregon.paraContestar.length > 0,
    pregon && { contestar: pregon.paraContestar.length, cerrados: pregon.cerrados.length },
  );
  if (pregon === null) return;
  comprobar('se juega sobre el retablo SVG y sin `<canvas>`', html.includes('<svg') && !html.includes('<canvas'));
  comprobar(
    'el pregón se pinta como panel de la casa, con su nombre de región',
    /<section class="panel riberas-pregon-en-el-retablo"[^>]*aria-label="Los trueques de la mesa"/.test(html),
    /<section class="panel riberas-pregon-en-el-retablo"[^>]*>/.exec(html)?.[0] ?? null,
  );

  /*
   * ═══ Y VA ANTES DEL TABLERO, QUE ES LA DECISIÓN QUE ESTE BLOQUE COMPRA ═══
   *
   * Debajo del `<Retablo>` no se ve. El alto pintado del SVG es
   * `min(max(408, 62 % del alto), ancho útil de la columna / 1,101)`, y medido en los quince
   * lienzos de la casa, en CUATRO —568×320, 780×360, 667×375 y 844×390— el tablero ya pasa
   * del pliegue él solo; sólo SEIS dejan debajo los 233,75 puntos que miden el rótulo y
   * cuatro tiras. Un botón de aceptar al que hay que desplazarse después de pasar el tablero
   * entero es un botón que en una partida real no se pulsa. Se compra por el ORDEN del DOM,
   * que es lo único que decide esta pantalla y lo que un cambio de sitio rompería en silencio.
   */
  comprobar(
    'y va ANTES del `<Retablo>` en el orden del DOM: debajo del tablero, en cuatro de los quince lienzos, está bajo el pliegue',
    html.indexOf('riberas-pregon-en-el-retablo') < html.indexOf('<svg') &&
      html.indexOf('riberas-pregon-en-el-retablo') > html.indexOf('riberas-sin-mundo'),
    {
      pregon: html.indexOf('riberas-pregon-en-el-retablo'),
      letraChica: html.indexOf('riberas-sin-mundo'),
      tablero: html.indexOf('<svg'),
    },
  );

  /*
   * LA TIRA NO LLEVA BOTÓN DE ACEPTAR, igual que en el lienzo y por lo mismo: «la aceptación
   * debe tener que confirmarse». La tira ENTERA es el botón y lo único que hace es abrir la
   * hoja. Y aquí importa doble, porque ésta es la pantalla donde aceptar era un toque.
   */
  const tiras = html.split('class="riberas-pregon-tira"').length - 1;
  const dentroDeLasTiras = [...html.matchAll(/<button[^>]*class="riberas-pregon-tira"[^>]*>([\s\S]*?)<\/button>/g)]
    .map((m) => m[1] ?? '')
    .join('');
  comprobar(
    'una tira por trato, y la tira entera es el botón: ni uno dentro, ni la palabra «Aceptar» suelta encima del tablero',
    tiras === pregon.paraContestar.length + pregon.mias.length + pregon.cerrados.length &&
      tiras > 0 &&
      !dentroDeLasTiras.includes('<button') &&
      !/Aceptar/i.test(dentroDeLasTiras),
    { tiras, dentro: dentroDeLasTiras.slice(0, 160) },
  );
  comprobar(
    'y es LA MISMA tira que la del lienzo, no una segunda copia: un solo mueble, y por eso un solo sitio donde se recorta el renglón de estado',
    codigo.includes('<UnaTira key={t.id} t={t} hueco={hueco} raiz={raiz} abierta={abierta} alAbrir={alAbrir} />') &&
      (codigo.match(/function UnaTira\(/g) ?? []).length === 1 &&
      (codigo.match(/className="riberas-pregon-tira"/g) ?? []).length === 1,
    (codigo.match(/className="riberas-pregon-tira"/g) ?? []).length,
  );

  /*
   * ═══ CONTESTAR NO SALE ADEMÁS COMO BOTÓN, Y AQUÍ SON DOS CAMINOS Y NO UNO ═══
   *
   * En el lienzo bastaba `opcionesFueraDelPregon`, porque allí los botones sueltos son la
   * única puerta. En el retablo hay DOS: `tableroDeRiberas` copia contestar a las `acciones`
   * del tablero —y `AccionesDelTablero` las pinta a un toque, que era el fallo— y lo que no
   * cabe en el mapa cae en el `Formulario` de «Y además puedes». Los dos filtros reciben EL
   * PREGÓN y no un interruptor, para que donde no hay tiras los botones se queden.
   */
  comprobar(
    'con el pregón puesto, contestar no sale además como botón: ni en las acciones del tablero ni en «Y además puedes»',
    !texto.includes('Aceptar el trueque') && !texto.includes('Rechazar el trueque'),
    tablero.acciones.map((a) => a.rotulo),
  );
  comprobar(
    'y el tablero SÍ traía esos botones antes del filtro, o la línea de arriba estaría pasando en verde por no haber nada que quitar',
    tablero.acciones.some((a) => a.toque.tipo === ACEPTAR || a.toque.tipo === RECHAZAR),
    tablero.acciones.map((a) => [a.rotulo, a.toque.tipo]),
  );
  comprobar(
    'quien los quita son los dos filtros de `shared/`, compuestos, y no un `filter` escrito en la pantalla',
    /const sueltas = opcionesFueraDelPregon\(opcionesSueltas\(tablero, opciones\), pregon\);/.test(codigo) &&
      /const sinContestar = accionesFueraDelPregon\(tablero, pregon\);/.test(codigo),
    /const sueltas = [^;]*;/.exec(codigo)?.[0] ?? null,
  );
  /*
   * Y LA MITAD MUDA, que es la que importa: SIN pregón —un mirón, una vista sin tratos— los
   * botones se QUEDAN. Quitarlos siempre dejaría una propuesta que no se puede contestar en
   * toda la tarde, sin un error en ninguna parte. Se compra con el mismo objeto: sin pregón
   * el tablero vuelve TAL CUAL, no una copia recortada.
   */
  comprobar(
    'y sin pregón el tablero vuelve entero y es el MISMO objeto: donde no hay tiras que pulsar, contestar sigue saliendo como botón',
    accionesFueraDelPregon(tablero, null) === tablero &&
      accionesFueraDelPregon(tablero, pregon).acciones.length < tablero.acciones.length,
    {
      conPregon: accionesFueraDelPregon(tablero, pregon).acciones.length,
      sinPregon: accionesFueraDelPregon(tablero, null).acciones.length,
    },
  );

  /*
   * LA HOJA ES `ElijeUna`, LA MISMA DE LAS OTRAS CUATRO PREGUNTAS, en su forma FIJA. No hay
   * componente nuevo, que es lo que el §4.2 del diseño promete: velo, `role="dialog"` con
   * nombre, trampa de foco escrita una vez, `Escape` y «Dejarlo» que nunca se apaga. Se lee
   * del fuente porque abrirla es pulsar una tira, y en Node no hay quien pulse.
   */
  comprobar(
    'la hoja donde se confirma es `ElijeUna` —la misma de las otras cuatro preguntas—, con el título y el estado que redacta `shared/`, y colocada sobre la VENTANA porque aquí la página rueda',
    codigoSeguido.includes('<ElijeUna fijo titulo={laTiraAbierta.frase} nota={laTiraAbierta.comoAnda}'),
    /<ElijeUna[^>]{0,120}/.exec(codigo.replace(/\s+/g, ' ')) ?? null,
  );

  // ── 2. Mi turno: el componedor, que es la única manera de montar un trueque gordo ──

  const mias = laProyeccionConMazo(5, { misPropuestas: true });
  const tableroMio = tableroDeLaVista(mias.vista);
  comprobar('la mesa de cinco en MI turno trae tablero', tableroMio !== null);
  if (tableroMio === null) return;
  const puestaMia = mesaPuestaDe(mias.sentados, mias.vista, mias.opciones);
  const htmlMio = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', puestaMia)}
      puesta={puestaMia}
      tablero={tableroMio}
      opciones={mias.opciones}
      laSalida="/sala/"
    />,
  );
  const laPuerta = puertaDelTrueque(mias.opciones);
  comprobar(
    'en mi turno el juego declara la puerta del trueque, o no habría componedor que pintar',
    laPuerta !== null,
    mias.opciones.filter((o) => o.declaracion === true).map((o) => o.id),
  );
  comprobar(
    'y el componedor se pinta como sección propia, con el rótulo que escribe EL JUEGO en la declaración',
    /<section class="panel riberas-componedor">/.test(htmlMio) &&
      laPuerta !== null &&
      htmlMio.includes(laPuerta.rotulo) &&
      htmlMio.includes(laPuerta.ayuda),
    laPuerta && [laPuerta.rotulo, laPuerta.ayuda],
  );
  comprobar(
    'y ese botón sale de `puertaDelTrueque` y NO de `acciones`: el tablero no trae ninguna acción que mande la declaración',
    !tableroMio.acciones.some((a) => a.rotulo === (laPuerta?.rotulo ?? '')) &&
      codigoSeguido.includes('const componedor = useMemo( () => elComponedor(vista, yo, opciones, loQueSeCompone),'),
    tableroMio.acciones.map((a) => a.rotulo),
  );
  comprobar(
    'y va DEBAJO del tablero: el pregón es de quien no tiene el turno y hay que verlo sin buscarlo, el componedor es mío y sólo crece cuando lo abro',
    htmlMio.indexOf('riberas-componedor') > htmlMio.indexOf('<svg'),
    { tablero: htmlMio.indexOf('<svg'), componedor: htmlMio.indexOf('riberas-componedor') },
  );
  comprobar(
    'y arranca CERRADO: ocho renglones abiertos de salida serían 374 puntos debajo del tablero en cada turno de todo el mundo',
    !htmlMio.includes('riberas-componedor-dentro') && /aria-expanded="false"/.test(htmlMio),
    htmlMio.includes('riberas-componedor-dentro'),
  );

  /*
   * ═══ Y ABIERTO, PORQUE ABRIRLO ES PULSAR Y EN NODE NO HAY QUIEN PULSE ═══
   *
   * El mueble se pinta suelto con `abierto` puesto, que es lo que un toque hace. Lo que se
   * compra aquí es lo de la PANTALLA —los renglones, los dos mandos, `aria-disabled` en vez
   * de `disabled`, y que el resumen sea región viva—; las CUENTAS —el tope, lo que tengo, el
   * bien que ya está en el otro lado— las compra `verify:riberas-en-tres` con el motor.
   */
  const compuesto: LoQueSeCompone = { lado: 'doy', doy: { sal: 3 }, pido: { limo: 1 }, para: null };
  const elMueble = elComponedor(mias.vista, 's1', mias.opciones, compuesto);
  comprobar('el componedor se compone sobre la vista de esta misma mesa', elMueble !== null, elMueble?.resumen);
  if (elMueble === null) return;
  const htmlAbierto = renderToStaticMarkup(
    <ElComponedorDelRetablo
      componedor={elMueble}
      ponerPuesto={() => undefined}
      quieto={false}
      abierto
      alAbrir={() => undefined}
      alProponer={() => undefined}
    />,
  );
  const renglones = htmlAbierto.split('class="riberas-componedor-renglon"').length - 1;
  comprobar(
    'abierto pinta un renglón por bien del lado que se toca, con sus dos mandos cada uno',
    renglones === elMueble.renglones.length &&
      renglones > 0 &&
      htmlAbierto.split('riberas-componedor-mando').length - 1 === renglones * 2,
    { renglones, esperados: elMueble.renglones.length },
  );
  comprobar(
    'y el conmutador de lado dice cuál se está tocando, con `aria-pressed` y no sólo con un color',
    /aria-pressed="true"/.test(htmlAbierto) && palabrasDe(htmlAbierto).includes('Doy') && palabrasDe(htmlAbierto).includes('Pido'),
    [...htmlAbierto.matchAll(/aria-pressed="(true|false)"/g)].map((m) => m[1]),
  );
  comprobar(
    'y los destinos son los de la declaración: «la mesa» primero y luego los rivales con bienes',
    elMueble.destinos.length > 1 && elMueble.destinos.every((d) => palabrasDe(htmlAbierto).includes(d.nombre)),
    elMueble.destinos.map((d) => d.nombre),
  );
  /*
   * ═══ NI UN `disabled` NATIVO, Y AQUÍ ES PEOR QUE EN NINGÚN OTRO SITIO ═══
   *
   * Un `<button>` al que se le pone `disabled` TENIENDO EL FOCO lo pierde, y el foco cae al
   * `<body>`. En el componedor eso pasa en CADA toque: se sube la tercera sal y el «+» de los
   * cinco renglones se apaga de golpe, o sea que quien juega con teclado montaría un lado y
   * se quedaría sin sitio donde estar. Es la misma regla que el botón de tirar los dados y
   * que la lista de `ElijeUna`, y aquí se dispara sola.
   */
  comprobar(
    'y ni un `disabled` nativo en toda la sección: se apaga con `aria-disabled`, que cuenta lo mismo y conserva el foco',
    !/<button[^>]*\sdisabled/.test(htmlAbierto) && /aria-disabled="true"/.test(htmlAbierto),
    /<button[^>]*\sdisabled[^>]*>/.exec(htmlAbierto)?.[0] ?? null,
  );
  comprobar(
    'lo que se va a mandar se lee antes de pulsar, y es región viva porque cambia con cada toque',
    /<p class="riberas-componedor-resumen" aria-live="polite">/.test(htmlAbierto) &&
      palabrasDe(htmlAbierto).includes(elMueble.resumen),
    elMueble.resumen,
  );
  comprobar(
    'y con los dos lados puestos «Proponer» está vivo y sin ningún porqué que dar',
    elMueble.movimiento !== null && elMueble.porQueNo === '' && htmlAbierto.includes('opcion opcion-primaria'),
    elMueble.porQueNo,
  );

  /*
   * Y APAGADO DICE POR QUÉ. Es la mitad que separa un botón que no responde de una regla
   * explicada: el §1.12 mide con 2.834 movimientos lo que cuesta un botón encendido que no
   * juega, y un botón apagado y mudo es el mismo fallo con menos tinta.
   */
  const aMedias = elComponedor(mias.vista, 's1', mias.opciones, { lado: 'doy', doy: { sal: 1 }, pido: {}, para: null });
  const htmlAMedias =
    aMedias === null
      ? ''
      : renderToStaticMarkup(
          <ElComponedorDelRetablo
            componedor={aMedias}
            ponerPuesto={() => undefined}
            quieto={false}
            abierto
            alAbrir={() => undefined}
            alProponer={() => undefined}
          />,
        );
  comprobar(
    'con un lado vacío «Proponer» va apagado Y DICE POR QUÉ, que es lo que separa una regla explicada de un botón que no responde',
    aMedias !== null &&
      aMedias.movimiento === null &&
      aMedias.porQueNo.length > 0 &&
      palabrasDe(htmlAMedias).includes(aMedias.porQueNo) &&
      /class="opcion opcion-quieta"[^>]*aria-disabled="true"/.test(htmlAMedias),
    aMedias?.porQueNo,
  );
  comprobar(
    'y lo mismo con la mesa quieta: mientras un movimiento viaja no se manda otro, y el botón lo dice sin perder el foco',
    (() => {
      const quieta = renderToStaticMarkup(
        <ElComponedorDelRetablo
          componedor={elMueble}
          ponerPuesto={() => undefined}
          quieto
          abierto
          alAbrir={() => undefined}
          alProponer={() => undefined}
        />,
      );
      return !/<button[^>]*\sdisabled/.test(quieta) && (quieta.match(/aria-disabled="true"/g) ?? []).length > 0;
    })(),
  );
}

// ---------------------------------------------------------------------------

/**
 * ═══ EL COMPONEDOR EN EL LIENZO, QUE ES LA PANTALLA EN LA QUE MIGUEL JUEGA ═══
 *
 * Todo lo de arriba es el RETABLO, o sea la mesa de cinco o de seis. Miguel juega de tres y
 * de cuatro, y ahí no hay retablo: hay lienzo, y hasta esta fase el componedor no existía en
 * él. Un trueque de tres por dos se podía hacer —el motor lo admite desde la fase 1— pero no
 * se podía MONTAR con el dedo en la única pantalla donde él se sienta.
 *
 * LO QUE SE COMPRA AQUÍ ES LA CAJA Y DÓNDE ESTÁ EL BOTÓN, y nada más: las cuentas del
 * componedor —el tope, lo que tengo, el bien que ya está en el otro lado— las compra
 * `verify:riberas-en-tres` con el motor, y las TRIPAS son literalmente el mismo mueble que
 * el retablo pinta, cosa que aquí se compra comparando los dos marcados.
 */
function elComponedorEnElLienzo(): void {
  const riberas = elCatalogoQuePublicaElServidor().find((m) => m.id === 'riberas');
  comprobar('Riberas está instalado', riberas !== undefined);
  if (riberas === undefined) return;
  const enTres = laProyeccionConMazo(3, { misPropuestas: true });
  const tableroEnTres = tableroDeLaVista(enTres.vista);
  comprobar('la mesa de TRES en mi turno trae tablero', tableroEnTres !== null);
  if (tableroEnTres === null) return;
  const puestaEnTres = mesaPuestaDe(enTres.sentados, enTres.vista, enTres.opciones);
  const html = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', puestaEnTres)}
      puesta={puestaEnTres}
      tablero={tableroEnTres}
      opciones={enTres.opciones}
      laSalida="/sala/"
    />,
  );
  const laPuerta = puertaDelTrueque(enTres.opciones);
  comprobar(
    'con tres sentados se juega en el LIENZO y no en el retablo, que es donde Miguel se sienta',
    html.includes('riberas-lienzo') && !html.includes('panel riberas-componedor'),
    { lienzo: html.includes('riberas-lienzo'), seccionDelRetablo: html.includes('panel riberas-componedor') },
  );
  /*
   * ═══ EL BOTÓN VIVE EN LA CINTA, Y ESO ES LO QUE EL §3.2 PIDE ═══
   *
   * «El renglón puede quedar fuera del recorte del pregón; el botón no, porque está en la
   * cinta.» En la primera tira no cabe —medido en la cabecera de la cinta: en un lienzo de
   * 288 son 115,2 puntos y ya se le cae uno de los tres trozos que lleva—, así que va en la
   * segunda, que es el carril, como un cuadrado del suelo de toque más.
   */
  comprobar(
    'el botón que abre el componedor va DENTRO de la cinta, en su segunda tira, y no como un `.opcion` en flujo debajo del lienzo',
    /<div class="riberas-carril"[\s\S]{0,600}?riberas-carril-puerta/.test(html) &&
      laPuerta !== null &&
      html.includes(`aria-label="${laPuerta.rotulo}"`),
    /<button[^>]*riberas-carril-puerta[^>]*>/.exec(html)?.[0] ?? null,
  );
  comprobar(
    'y dice la regla que escribe EL JUEGO, sin redactar aquí una palabra del trueque',
    laPuerta !== null && html.includes(`${laPuerta.rotulo}. ${laPuerta.ayuda}`),
    laPuerta && [laPuerta.rotulo, laPuerta.ayuda],
  );
  /*
   * Y ARRANCA CERRADO, como la sección del retablo y por lo mismo en peor: aquí la caja es
   * MODAL y a todo el ancho, o sea que abierta de salida taparía el tablero entero en cada
   * turno propio, con velo y todo.
   */
  comprobar(
    'y el componedor arranca CERRADO: una caja modal a todo el ancho abierta de salida taparía el tablero en cada turno propio',
    !html.includes('riberas-componedor-hoja') && /riberas-carril-puerta[^>]*aria-expanded="false"/.test(html),
    /riberas-carril-puerta[^>]*aria-expanded="[^"]*"/.exec(html)?.[0] ?? null,
  );

  // ── Abierto, que es lo que hace un toque y en Node no hay quien pulse ──

  const compuesto: LoQueSeCompone = { lado: 'doy', doy: { sal: 3 }, pido: { limo: 1 }, para: null };
  const mueble = elComponedor(enTres.vista, 's1', enTres.opciones, compuesto);
  comprobar('el componedor se compone sobre la vista de la mesa de tres', mueble !== null, mueble?.resumen);
  if (mueble === null) return;
  const abierto = renderToStaticMarkup(
    <ElComponedorEnElLienzo
      componedor={mueble}
      ponerPuesto={() => undefined}
      quieto={false}
      alProponer={() => undefined}
      alDejarlo={() => undefined}
    />,
  );
  /*
   * ═══ ES MODAL, Y EL PREGÓN QUE CUELGA DEL MISMO SITIO NO LO ES ═══
   *
   * La diferencia es quién lo usa: el pregón lo lee quien NO tiene el turno y por debajo se
   * sigue girando el tablero; esto lo usa quien SÍ lo tiene, y mientras compone un toque
   * perdido funda una choza. Las cuatro mitades son las del cajón: velo, diálogo con NOMBRE,
   * la trampa de foco escrita una vez y el foco de vuelta al cuadrado que lo abrió.
   */
  comprobar(
    'abierto es MODAL: velo, `role="dialog"`, `aria-modal` y NOMBRE — mientras se compone, un toque perdido no funda una choza',
    abierto.includes('class="riberas-velo"') &&
      /<div class="riberas-componedor-hoja" role="dialog" aria-modal="true" aria-label="[^"]+"/.test(abierto),
    /<div class="riberas-componedor-hoja"[^>]*>/.exec(abierto)?.[0] ?? null,
  );
  comprobar(
    'y la regla del juego se lee arriba, porque el cuadrado de la cinta mide 44 puntos y la frase no cabe dentro',
    palabrasDe(abierto).includes(mueble.ayuda),
    mueble.ayuda,
  );
  comprobar(
    'y lleva «Dejarlo» escrito: el velo y el `Escape` cierran igual, pero con el dedo y el tablero tapado un botón es la única salida que se VE',
    palabrasDe(abierto).includes('Dejarlo'),
  );
  /*
   * ═══ Y LAS TRIPAS SON EL MISMO MUEBLE, NO UNA COPIA CON LA MISMA PINTA ═══
   *
   * Es la comprobación que compra la decisión: el retablo y el lienzo pintan cajas distintas
   * y contenido IDÉNTICO. Se comparan los dos marcados desde `riberas-componedor-dentro`, y
   * si algún día uno de los dos crece un renglón que el otro no tiene, esto se cae. Dos
   * copias de los cinco renglones serían dos sitios donde el día que el «+» cambie sólo
   * cambiará uno, y el que se queda atrás es el que se mira menos.
   */
  /*
   * Se recorta el `<div>` ENTERO y no «desde aquí hasta el final»: la caja del lienzo lleva
   * un «Dejarlo» detrás de las tripas y la del retablo cierra su `<section>`, así que cortar
   * por el final compararía las dos cajas y no el mueble. Se cuentan las etiquetas hasta
   * cerrar el que se abrió.
   */
  const tripasDe = (h: string): string => {
    const desde = h.indexOf('<div class="riberas-componedor-dentro">');
    if (desde < 0) return '';
    let hondura = 0;
    for (const et of h.slice(desde).matchAll(/<(\/?)div\b/g)) {
      hondura += et[1] === '/' ? -1 : 1;
      if (hondura === 0) return h.slice(desde, desde + (et.index ?? 0) + '</div>'.length);
    }
    return '';
  };
  const enElRetablo = renderToStaticMarkup(
    <ElComponedorDelRetablo
      componedor={mueble}
      ponerPuesto={() => undefined}
      quieto={false}
      abierto
      alAbrir={() => undefined}
      alProponer={() => undefined}
    />,
  );
  comprobar(
    'y por dentro es EL MISMO MUEBLE que pinta el retablo, renglón por renglón: lo que cambia es la caja, no el contenido',
    tripasDe(abierto).length > 0 && tripasDe(abierto) === tripasDe(enElRetablo),
    {
      lienzo: tripasDe(abierto).length,
      retablo: tripasDe(enElRetablo).length,
      renglones: abierto.split('class="riberas-componedor-renglon"').length - 1,
    },
  );
  comprobar(
    'y ni un `disabled` nativo en toda la caja: se apaga con `aria-disabled`, que cuenta lo mismo y conserva el foco',
    !/<button[^>]*\sdisabled/.test(abierto) && /aria-disabled="true"/.test(abierto),
    /<button[^>]*\sdisabled[^>]*>/.exec(abierto)?.[0] ?? null,
  );

  // ── Y las cuatro vivas apagan EL BOTÓN QUE ABRE, no sólo el que manda ──

  /*
   * ═══ POR QUÉ SE APAGA EL DE ABRIR Y NO SÓLO «PROPONER» ═══
   *
   * Con cuatro propuestas en la mesa no hay nada que montar hasta que se contesten o pase el
   * turno, y el §3.2 quiere que eso se lea SIN abrir nada: el pregón se recorta —en el SE
   * apaisado caben tres tiras de las ocho que puede haber— y el botón de la cinta no. Hasta
   * esta fase el botón se abría, dentro «Proponer» salía apagado con su porqué, y para leer
   * el porqué había que abrir una caja de ocho renglones.
   *
   * Y la frase no se redacta aquí: es la `ayuda` de la puerta, que el juego cambia de texto
   * cuando el tope está puesto. Se compra que sea LA MISMA cadena.
   */
  const conCuatro = laProyeccionConMazo(3, { cuatroVivas: true });
  const muebleLleno = elComponedor(conCuatro.vista, 's1', conCuatro.opciones, NADA_COMPUESTO);
  comprobar(
    'con CUATRO propuestas mías en pie el componedor lo dice, y lo dice con la frase que escribe el juego',
    muebleLleno !== null &&
      muebleLleno.noCabenMas &&
      muebleLleno.porQueNo === muebleLleno.ayuda &&
      muebleLleno.ayuda.includes('4'),
    muebleLleno?.ayuda,
  );
  const tableroLleno = tableroDeLaVista(conCuatro.vista);
  if (tableroLleno === null) {
    comprobar('la mesa con cuatro vivas trae tablero', false);
    return;
  }
  const puestaLlena = mesaPuestaDe(conCuatro.sentados, conCuatro.vista, conCuatro.opciones);
  const htmlLleno = renderToStaticMarkup(
    <RiberasEnTres
      manifiesto={riberas}
      mesa={unaMesa('dentro', puestaLlena)}
      puesta={puestaLlena}
      tablero={tableroLleno}
      opciones={conCuatro.opciones}
      laSalida="/sala/"
    />,
  );
  const elCuadrado = /<button[^>]*riberas-carril-puerta[^>]*>/.exec(htmlLleno)?.[0] ?? '';
  comprobar(
    'y el cuadrado de la cinta se apaga con `aria-disabled` y DICE POR QUÉ sin abrir nada, que es para lo que está en la cinta y no en el pregón',
    elCuadrado.includes('aria-disabled="true"') &&
      elCuadrado.includes('riberas-carril-quieta') &&
      muebleLleno !== null &&
      elCuadrado.includes(muebleLleno.ayuda.slice(0, 30)),
    elCuadrado,
  );
  comprobar(
    'y el del RETABLO se apaga igual, con la misma frase: es el mismo botón en dos cajas (§4.2)',
    muebleLleno !== null &&
      (() => {
        const h = renderToStaticMarkup(
          <ElComponedorDelRetablo
            componedor={muebleLleno}
            ponerPuesto={() => undefined}
            quieto={false}
            abierto={false}
            alAbrir={() => undefined}
            alProponer={() => undefined}
          />,
        );
        return /class="opcion opcion-quieta"[^>]*aria-disabled="true"/.test(h) && palabrasDe(h).includes(muebleLleno.ayuda);
      })(),
  );

  /*
   * ═══ EL FOCO, QUE ES LO QUE SE ROMPE SIN QUE NADA FALLE ═══
   *
   * Dos caminos cierran esta caja sin que nadie pulse «Dejarlo»: proponer —que la desmonta
   * con el foco puesto en «Proponer»— y que se vaya la puerta, o sea que pase mi turno, cosa
   * que pasa sola cada pocos segundos por el sondeo. Los dos sueltan el foco al `<body>`, y
   * desde el `<body>` hay que tabular la cabecera entera de la Sala para volver al tablero:
   * es el mismo fallo mudo que la hoja de una propuesta ya tenía escrito.
   *
   * Se lee del fuente porque en Node no hay foco que mover, y se compra ADEMÁS la guarda de
   * `componedorAbierto`: sin ella la condición es cierta en todos los turnos ajenos, y el
   * recuadro le robaría el foco a quien esté leyendo la crónica cada vez que juega otro.
   */
  const fuenteDeLaPantalla = readFileSync(new URL('../src/riberas-en-tres.tsx', import.meta.url), 'utf8');
  const seguida = fuenteDeLaPantalla.replace(/\s+/g, ' ');
  comprobar(
    'al cerrar el componedor el foco vuelve al cuadrado que lo abrió, y proponer lo devuelve también: la caja se desmonta con el foco dentro y sin esto cae al `body`',
    seguida.includes(
      'const cerrarElComponedor = useCallback(() => { ponerComponedorAbierto(false); laPuertaDelTrueque.current?.focus(); }, []);',
    ) && (seguida.match(/laPuertaDelTrueque\.current\?\.focus\(\);/g) ?? []).length === 2,
    (seguida.match(/laPuertaDelTrueque\.current\?\.focus\(\);/g) ?? []).length,
  );
  comprobar(
    'y si la puerta se va con el componedor abierto —o sea si pasa el turno— vuelve al recuadro, y SÓLO si estaba abierto: si no, le robaría el foco a la crónica en cada turno ajeno',
    seguida.includes('if (!componedorAbierto) return; ponerComponedorAbierto(false); elRecuadro.current?.focus();') &&
      seguida.includes('}, [hayPuerta, componedorAbierto]);'),
    /if \(!componedorAbierto\)[\s\S]{0,120}/.exec(fuenteDeLaPantalla)?.[0] ?? null,
  );

  // ── Y la hoja de estilo, que es donde vive lo que en Node no se pinta ──

  const hoja = readFileSync(new URL('../src/estilo.css', import.meta.url), 'utf8');
  const laCaja = /\.riberas-componedor-hoja\s*\{([^}]*)\}/.exec(hoja)?.[1] ?? '';
  /*
   * ═══ A TODO EL ANCHO Y NO A LO QUE MIDE LA CINTA ═══
   *
   * El renglón de un bien son 162 puntos —la ficha (44), el «−» (44), la cifra (30) y el «+»
   * (44)— y el tercio central de la cinta se queda corto en los lienzos de pie de esta casa.
   * Puede ir a todo el ancho porque es MODAL: con el velo puesto no hay carta que arrastrar a
   * los lados, que es justo el motivo por el que la cinta mide un tercio. Y por eso NO lo pone
   * `elEstiloDelPregon` ni `elEstiloDelCajon`: no hay `anchoDeLaCinta` que consultar.
   */
  comprobar(
    'la caja del componedor va a TODO EL ANCHO del recuadro y no a lo que mide la cinta: un renglón de bien son 162 puntos y el tercio central se queda corto en los lienzos de pie',
    /width:\s*calc\(100% - 1\.5rem\)/.test(laCaja) && !laCaja.includes('anchoDeLaCinta'),
    laCaja.replace(/\s+/g, ' '),
  );
  comprobar(
    'y cuelga del PIE de la cinta con carril (5,5rem), que es donde vive el cuadrado que la abre — escrito en `rem` como la cinta, para que crezcan juntos con la letra del navegador',
    /top:\s*5\.5rem/.test(laCaja),
    laCaja.replace(/\s+/g, ' '),
  );
  comprobar(
    'y rueda por dentro también CON EL DEDO: ocho renglones del suelo de toque son 374 puntos y en los lienzos bajos no caben, y el recuadro tiene `touch-action: none` por el gesto del delta',
    /overflow-y:\s*auto/.test(laCaja) &&
      /touch-action:\s*auto/.test(laCaja) &&
      /overscroll-behavior:\s*contain/.test(laCaja),
    laCaja.replace(/\s+/g, ' '),
  );
  /*
   * ═══ EL CUADRADO SE QUEDA PEGADO AL CANTO, Y ESTO SE MIDIÓ ROTO EN EL NAVEGADOR ═══
   *
   * Con un siete de verdad el carril lleva hasta veinte destinos del estiaje y rueda a lo
   * ancho; si el cuadrado rodara con ellos, proponer un trueque sería rodar veinte cuadrados
   * hacia atrás para encontrar el primero.
   *
   * Y LA SEGUNDA MITAD ES EL ORDEN, que es lo que falló medido: la regla estaba escrita ANTES
   * que `.riberas-carril-opcion`, que declara `position: relative` con la misma
   * especificidad, así que ganaba la de abajo y `getComputedStyle` decía `relative`. Medido
   * en el navegador con el carril estrechado a mano: con `scrollLeft` en 24 el cuadrado se
   * iba de x=249 a x=225. Con la regla movida detrás, se queda en 249. El orden se compra
   * aquí porque no se ve leyendo la declaración.
   */
  comprobar(
    'el cuadrado de la puerta se queda PEGADO al canto mientras los demás ruedan, y su regla va DESPUÉS de `.riberas-carril-opcion` o `position: relative` se la come',
    /\.riberas-carril-puerta\s*\{[^}]*position:\s*sticky/.test(hoja) &&
      /\.riberas-carril-puerta\s*\{[^}]*left:\s*0/.test(hoja) &&
      hoja.indexOf('.riberas-carril-puerta {') > hoja.indexOf('.riberas-carril-opcion {'),
    {
      puerta: hoja.indexOf('.riberas-carril-puerta {'),
      cuadrado: hoja.indexOf('.riberas-carril-opcion {'),
    },
  );
  /*
   * Y CON FONDO PROPIO, que los demás cuadrados no llevan: sin él, los que ruedan por debajo
   * se leerían a través de la flecha.
   */
  comprobar(
    'y con fondo propio, o los cuadrados que ruedan por debajo se leerían a través de la flecha',
    /\.riberas-carril-puerta\s*\{[^}]*background:\s*var\(--teja-alta\)/.test(hoja),
    /\.riberas-carril-puerta\s*\{[^}]*\}/.exec(hoja)?.[0]?.replace(/\s+/g, ' ') ?? null,
  );
}

elCatalogoNoMiente();
noSePintaDeMas();
elEstiajeSeOye();
laPausaCabe();
loQueLaPantallaDecideSola();
lasDirecciones();
elMuelle();
riberasEnTres();
elAcercamientoDelDelta();
elMazoEnLaPantalla();
elResultadoDeMover();
losDadosLleganAparte();
losDadosEnLaPantalla();
recogerLaMesa();
elCartelDeLaCarta();
laPaginaDePie();
laCintaYElCajon();
elRelojDeLaCinta();
elCarrilDiceAdondeVa();
elPregonDelTrueque();
elTruequeEnElRetablo();
elComponedorEnElLienzo();

console.log('');
/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS», el mismo que llevan el servidor y la escena.
 *
 * Este guion no lo tuvo nunca, y la fase que metió aquí las comprobaciones del empate del
 * Vado —las que compran el grave de «vado 5 de 5»— lo dejó dicho: un bloque borrado, o un
 * guion que se cae a la mitad, termina con código cero y una lista corta de aciertos, y
 * eso se lee como verde. Con el número escrito, salir con menos es un fallo ruidoso. Va a
 * mano y se sube al añadir comprobaciones; un guardia desfasado no guarda nada.
 *
 * ═══ Y VA CON MARGEN, PORQUE AL RAS HACE LO CONTRARIO DE LO QUE QUIERE ═══
 *
 * Estuvo en 467 con el guion haciendo 467 exactos, y así la PRIMERA comprobación que
 * dejara de correr —una sola línea dentro de un `if` que ya no entra— mataba el guion
 * gritando «sólo se han hecho 466 de 467», en vez de enseñar las rojas con su nombre.
 * Este guardia existe para cazar un guion que se cae A LA MITAD, que son decenas o
 * cientos de comprobaciones, no una.
 *
 * El margen es 10, un 2 % medido y no elegido a ojo: hay llamadas a `comprobar` dentro de
 * un `if` o un `for` en este fichero, y las de los bucles se repiten POR LIENZO, así que
 * una forma de ventana que deje de darse quita más de una — y desde la página de pie la
 * lista tiene dieciocho formas y no dieciséis. Es el mismo criterio con el que
 * `verificar-riberas.ts` puso el suyo: medir el peor caso y dejar hueco debajo.
 *
 * Y VOLVIÓ A QUEDARSE AL RAS —666 escritas y 666 hechas— cuando entró el trueque
 * paramétrico, que es lo contrario de lo que este párrafo lleva explicando. Con el retablo
 * del trueque dentro se hacen 700 y el guardia va en 690, con el mismo margen de diez. Y con
 * el COMPONEDOR DEL LIENZO —la pantalla en la que se juega de dos a cuatro— se hacen 723, así
 * que el guardia va en 713, que es el mismo margen otra vez.
 *
 * Y CON LA MESA DE CINCO PINTADA DE VERDAD —el bloque que compra que el panel «Trueques» no
 * salga cuando el pregón lo hereda, más las dos cifras del pregón plegado— se hacen 729, así
 * que el guardia va en 719: el mismo margen de diez, y medido con la vacuna que devuelve el
 * `conLienzo &&` a `sala.tsx` —729 comprobaciones y 2 rojas—, o sea que ninguna se cae de su
 * bloque y el guardia no se pone delante de los nombres.
 *
 * Y LAS ROJAS SE IMPRIMEN ANTES DE IRSE: el orden estaba al revés, así que el día que el
 * guardia saltara se llevaría por delante los nombres de todo lo que ya se había encontrado.
 */
const COMPROBACIONES_ESCRITAS = 719;
if (hechas < COMPROBACIONES_ESCRITAS) {
  for (const f of fallos) console.log(`   · ${f}`);
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
      '\n  Y EL CARTEL QUE EXPLICA EL NAIPE: cae al pie del lienzo sin tapar un naipe del mazo, ni\n' +
      `  la mano de bienes, ni el asa de la barra en ninguno de los ${String(loQueMidioElCartel.lienzos)} lienzos medidos —contra\n` +
      '  lo que la escena PINTA y no contra la misma fórmula copiada—; enseña frases ENTERAS y en\n' +
      `  su orden, las tres en ${String(loQueMidioElCartel.conLasTres)} de ellos y menos en los ${String(loQueMidioElCartel.losEstrechos.length)} estrechos (${loQueMidioElCartel.losEstrechos.join('; ')}),\n` +
      '  con la letra y el relleno leídos de la hoja y no dados por hechos; con la preferencia de\n' +
      '  letra del navegador en grande se degrada frase a frase y en el extremo no se pinta, que\n' +
      '  es lo prometido, y ahí el texto sigue vivo en la lista de apoyo; sale de los dos\n' +
      '  manejadores que el naipe ya tenía, sin robarle nada al toque que lo coge y sin apagarse\n' +
      '  al cruzar de una carta a la de al lado; no recibe un solo puntero; y lo que no cabe se\n' +
      '  oye igual, con el nombre y las tres frases de cada naipe en la lista de apoyo, contadas\n' +
      '  sobre el HTML de verdad.\n' +
      '\n  Y LA PANTALLA COMPLETA: la cadena de seis cajas reparte el alto desde la ventana hasta\n' +
      '  el recuadro, el título sale del flujo y el foco se muda al lienzo, con rescate al título\n' +
      '  si el modelo acaba fallando. El aviso del turno se muda a la CINTA del tercio central,\n' +
      '  cuyo ancho reparte `escenas/cinta.ts` y mide `verify:escena` contra las dos manos: a la\n' +
      '  frase le quedan ocho letras o más en los dieciocho lienzos, y donde no caben los tres el\n' +
      '  que se va es el «‹», que en esta pantalla vuelve a existir en la cabecera. Y el raíl\n' +
      '  ENTERO —marcador con chozas y torres, código, reloj, los paneles del juego con «Lo mío»\n' +
      '  delante y sin los bienes ajenos, las dos salidas y la crónica— se monta una sola vez y\n' +
      '  se va al CAJÓN que abre la ficha de mis puntos: modal de verdad, con velo que se come el\n' +
      '  clic, trampa de tabulador, `Escape`, el foco de vuelta a su ficha y desplazable con el\n' +
      '  dedo pese al `touch-action: none` del recuadro.\n' +
      '\n  Y LA CINTA DICE CUÁNTO QUEDA DE TURNO, que es lo que no decía NUNCA: la cuenta atrás\n' +
      '  vivía sólo dentro del cajón —detrás de un toque— y con el plazo de serie de 120 s una mesa\n' +
      '  jugó sola tres turnos y fundó una choza que nadie puso. Ahora va en la línea de estado, con\n' +
      '  `role=\"timer\"` para que no se anuncie sola encima del aviso del juego, con la frase entera\n' +
      '  en el nombre accesible, en `--alarma` el último minuto, latiendo por cambio de rótulo y no\n' +
      '  una vez por segundo, y descontada del reparto de la cinta ANTES de decidir si cabe el «‹».\n' +
      '  Los dos rótulos —el corto de la cinta y el largo del cajón— salen del mismo tramo y dicen\n' +
      '  la misma cifra en los 1.200 instantes de un barrido: el `Math.floor` que la app ya pagó una\n' +
      '  vez se pone rojo aquí por tres sitios.\n' +
      '\n  Y LO QUE UN SIETE PONE ENCIMA DE LA MESA CABE: los VEINTE destinos del estiaje —y\n' +
      '  los cinco del descarte— se alcanzan desde la pantalla completa por el CARRIL de la\n' +
      '  cinta, un cuadrado del suelo de toque por opción que rueda a lo ancho y con el dedo,\n' +
      '  y cada uno DICE ADÓNDE VA: dentro lleva el número de su isla —el que está pintado en el\n' +
      '  disco de esa comarca—, al pie una barra del color de su terreno, porque el reparto trae\n' +
      '  dos onces, y en el filo el color de a quién le robas, que es lo único que separa los dos\n' +
      '  cuadrados de una isla con dos víctimas. Antes decían «1», «2», … «20». Ni uno vuelve a ser un\n' +
      '  `.opcion` de 238 puntos debajo del lienzo, que eran 4.760 puntos de lista fuera de la\n' +
      '  pantalla en una jugada OBLIGATORIA, y la lista larga con rótulo y ayuda sigue entera\n' +
      '  dentro del cajón, la primera, sin quedarse también con las teclas. Y el MENÚ de elegir\n' +
      '  —a quién le robas, qué dos bienes coges— es modal dentro del recuadro, con la misma\n' +
      '  trampa de foco escrita una sola vez, porque debajo del lienzo ya no hay sitio ninguno.\n' +
      '\n  Y EL PREGÓN: las propuestas de trueque cuelgan de esa misma cinta y se leen SIN abrir\n' +
      '  nada —ni velo, ni diálogo, ni trampa de foco: por debajo se sigue girando el tablero,\n' +
      '  que es para lo que existe—, en tres bloques que son las dos mitades de la decisión 17\n' +
      '  más la que el que propone no veía: lo vivo que me toca, lo vivo que ofrecí y lo ya\n' +
      '  cerrado. La tira ENTERA es el botón y no lleva aceptar dentro —dos toques, y el primero\n' +
      '  no está encima del segundo, que es lo que Miguel pidió—; la hoja donde se confirma es el\n' +
      '  MISMO menú de elegir y no un quinto modal casi igual; contestar deja de salir además\n' +
      '  como botón suelto, y el panel «Trueques» del cajón se retira cuando el pregón lo hereda,\n' +
      '  los dos por la puerta del propio pregón para que sin él vuelvan —el respaldo del retablo\n' +
      '  no tiene cinta de la que colgar tiras—. Y la cuenta del sitio: el pregón se para en el\n' +
      '  techo del asa y nunca llega al canto, caben cuatro tiras sin carril y tres con él en los\n' +
      '  dieciocho lienzos, el nombre de quien contestó se recorta antes que el estado en los\n' +
      '  cuatro más estrechos, y con el pregón pintado el cartel de los naipes NO se pinta en\n' +
      '  ninguno: con los dos puestos, en el SE apaisado no queda banda para una sola tira.\n' +
      '  Y SE PLIEGA cuando no queda nada que contestar —que hoy es el turno de uno—: ahí era una\n' +
      '  caja opaca que llegaba al 44 % de arriba del tablero, encima de los anillos de fundar, y\n' +
      '  pasa a una tira de 63,75 puntos que dice cuántas hay, y que se despliega y se vuelve a\n' +
      '  plegar al tocarla. Con algo dirigido a uno NO se pliega: taparlo entonces es su trabajo.\n' +
      '\n  Y LAS TRES QUE SE ROMPÍAN EN SILENCIO DENTRO DEL CAJÓN: la trampa de foco vive ahora en\n' +
      '  `document` y no en la caja —enganchada en la caja se rompía en el primer toque, porque el\n' +
      '  botón pulsado se desmonta y el navegador suelta el foco al `body`—, con rescate del foco\n' +
      '  caído y una pila para que `Escape` no cierre de un golpe el menú y el cajón de debajo; el\n' +
      '  renglón de cada colono suelta EL VADO y no las TORRES cuando el cajón baja de 350 puntos,\n' +
      '  que es la cifra que no está en ningún otro sitio de la pantalla; y la crónica se llama por\n' +
      '  lo que es —el registro del canal, que dice una cosa y al final— en vez de prometer el\n' +
      '  relato de la partida y quedarse vacía toda la tarde.\n' +
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
