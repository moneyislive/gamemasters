/**
 * ¿DICE LA ESCENA LO MISMO QUE LAS REGLAS? — EL ADAPTADOR DE RIBERAS EN TRES
 *
 *   npm run verify:riberas-en-tres
 *
 * ═══ QUÉ AFIRMA ESTE FICHERO ═══
 *
 * Entre la vista de Riberas y el tablero en tres dimensiones hay UNA traducción,
 * `shared/arcade/juegos/riberas-en-tres.ts`, y los dos clientes la usan sin añadir
 * nada. Si esa traducción miente, el fallo es de los silenciosos: la barra ofrece
 * una obra que las reglas no permiten, el anillo señala un vértice donde el
 * servidor va a rechazar el movimiento, o la mano enseña «lana» donde el juego
 * tiene junco. Nada se cae; se juega mal.
 *
 * Por eso aquí NO se comprueba contra vistas inventadas: se abre una mesa de
 * verdad con el árbitro, se empieza, se funda y se alza, y a cada paso se mira que
 * lo que la escena recibiría coincide, uno a uno, con lo que `opcionesDeRiberas`
 * ofrece. La única vista montada a mano es la del trueque, y se monta con el
 * mismo escenario que usa `verify:riberas`, porque llegar a un trueque jugando
 * exige tirar los dados y el azar no es cosa de un comprobador.
 *
 * ═══ Y DESDE QUE HAY MAZO, LA MITAD DE ESTE FICHERO ES SUYA ═══
 *
 * Las cartas traen una clase de fallo que la barra no tenía: una carta encendida
 * que no se puede jugar. La barra apagada de más se ve —la pieza no se coge—; un
 * naipe encendido de más se arrastra, se suelta, y el servidor devuelve el mismo
 * estado sin decir nada. Así que la regla de las dos banderas se juega ENTERA con
 * el árbitro: se compra, se intenta jugar hoy, se pasa el turno de verdad y se
 * vuelve a mirar. Montar «el turno siguiente» a mano habría comprobado una
 * comparación de dos números y no la regla.
 *
 * Y se comprueba contra LA ESCENA DE VERDAD: lo que sale de la traducción entra en
 * `huecosDeLasCartas` y en `puertasDeLaCarta` de `escenas/cartas.ts`, y los dibujos
 * se buscan en `CONTORNOS_DE_LA_CARTA` de `escenas/iconos.ts`. Los dos contratos
 * están declarados dos veces —a un lado y a otro— y encajan por estructura; esto es
 * lo que hace que el día que uno cambie, esto ni compile.
 *
 * ═══ Y EN ESA MISMA MANO VAN LOS DOS PREMIOS, QUE NO SON CARTAS ═══
 *
 * El Vado Largo y La Mayor Guardia se pintan como naipe junto a las cartas del mazo (§8
 * bis) y llegan por una puerta distinta: `premiosEnTres`. La razón es de seguridad y no de
 * estilo —las cartas son secretas y los premios son públicos—, así que aquí no basta con
 * comprobar que el naipe SALE: se comprueba además que no ha entrado por `misCartas`, que
 * no aparece entre los secretos que declara `loSecretoDeRiberas`, que el juego no ofrece
 * ninguna manera de jugarlo, y que la escena no le abre casilla ni lo pinta apagado.
 *
 * ═══ LAS VACUNAS ═══
 *
 * Cada bloque comprueba también que la traducción SE VE FALLAR: una vista que no
 * es de Riberas devuelve `null` y no un tablero vacío, un mirón sin asiento no
 * tiene barra, una pieza que no se puede poner devuelve `null` en vez de un
 * anillo sin sitios, y la mano de otro no se puede pedir por ninguna puerta.
 */
import { readFileSync } from 'node:fs';
import { abrirMesa, avanzarElReloj, jugar } from '../src/arcade/arbitro';
import type { Mesa } from '../src/arcade/arbitro';
import { aristaDeHex, verticeDeHex, verticesDeArista } from '../../shared/mecanicas/malla-hexagonal';
import type { LlaveDeArista } from '../../shared/mecanicas/malla-hexagonal';
import '../../shared/arcade/juegos';
import {
  ACAPARAMIENTO,
  ALZAR,
  ANO_BUENO,
  BIENES,
  BIENES_DEL_ANO_BUENO,
  bienDeLaFicha,
  claseDeLaCarta,
  CLASES_DE_CARTA,
  COMPRAR,
  DOS_VEREDAS,
  EMPEZAR_RIBERAS,
  esTitulo,
  FUNDAR,
  GUARDIA,
  GUARDIA_MINIMA,
  OFRECER,
  PUNTOS_DEL_TITULO,
  PUNTOS_DEL_VADO,
  PUNTOS_DE_LA_GUARDIA,
  VEREDAS_DE_LA_CARTA,
  opcionesDeRiberas,
  MOVER_EL_ESTIAJE,
  PASAR,
  largoDelVado,
  loSecretoDeRiberas,
  proyectarRiberas,
  recalcularElVado,
  recalcularLaGuardia,
  REVELAR,
  RIBERAS,
  TIRAR,
  VADO_MINIMO,
} from '../../shared/arcade/juegos';
import type {
  Bien,
  CartaDeRiberas,
  CartaEnMano,
  EstadoDeRiberas,
  Ficha,
  Opcion,
} from '../../shared/arcade/juegos';
import {
  aQuienSeLeRoba,
  barraEnTres,
  bienesQueSeAcaparan,
  bienesQueSeCambianPor,
  cardinal,
  cartasEnTres,
  colocandoEnTres,
  comprarEnTres,
  dadosEnTres,
  enCabeza,
  estadoDelVado,
  esVistaQueSePinta,
  jugadaSinPreguntar,
  jugadasDeLaCarta,
  laManoDeLaIzquierda,
  loQueSeOyeDelVado,
  manoEnTres,
  marcadorEnTres,
  mazoEnLaBarra,
  meToca,
  opcionesFueraDeLaBarra,
  opcionesFueraDeLaMano,
  opcionesFueraDeLaMesa,
  opcionesFueraDelTablero,
  paresDelAnoBueno,
  plural,
  premiosEnTres,
  renglonDelVado,
  retratoDeLaCarta,
  revelarDe,
  selloDeLaTirada,
  seVeEnTres,
  tableroEnTres,
  TIPOS_QUE_PINTA_LA_MANO,
  tirarEnTres,
  truequesPosibles,
  turnoEnTres,
  colorDePiezaDelColono,
} from '../../shared/arcade/juegos/riberas-en-tres';
import type { CartaDelMazoEnTres, ExplicacionDeLaCarta } from '../../shared/arcade/juegos/riberas-en-tres';
/*
 * Y `obrasPosibles`, que es la que enciende las tres piezas de la barra de obra del
 * tablero de tres dimensiones. Se pide aquí, por su nombre entero, para poder afirmar qué
 * hace —y qué NO hace— con el estiaje por mover. Ver el bloque 12 bis.
 */
import { COLORES_EN_3D, obrasPosibles } from '../../shared/arcade/juegos/riberas-en-3d';
/*
 * LA ESCENA DE VERDAD, Y NO UNA COPIA DE SUS NÚMEROS.
 *
 * `escenas/cartas.ts` es aritmética pura —lo dice su cabecera: sin `three` y sin
 * React, para que un guion de Node pueda pedirle el reparto— y `escenas/iconos.ts`
 * son datos. Meterlos aquí es lo que convierte «la traducción dice `dibujo: faro`»
 * en «hay un contorno llamado `faro`», que es la afirmación que importa.
 */
import {
  colorDeLaFamilia,
  COLOR_SIN_FAMILIA,
  FAMILIA_DE_LOS_TITULOS,
  franjaDeLasCartas,
  huecosDeLasCartas,
  loQueSeVeEnLasCartas,
  ORDEN_DE_LAS_FAMILIAS,
  puertasDeLaCarta,
} from '../../escenas/cartas';
import type { CartaDelMazo } from '../../escenas/cartas';
/*
 * Y LA MANO DE BIENES, que aquí sirve para UNA cosa sola: saber por dónde se acaba la
 * banda libre del pie del lienzo, que es la que decide cuántas letras caben en un renglón
 * del cartel. Se pide a la escena de verdad, y no se copia el número medido, para que el
 * día que la mano de bienes se mueva el presupuesto de las frases se mueva con ella.
 */
import { huecosDeLaBaraja, loQueSeVeEnLaBaraja } from '../../escenas/baraja';
/*
 * Y LA BARRA, por lo mismo: el cuarto hueco no se mide con un reparto escrito aquí sino con
 * el de verdad, y su dibujo se pide por el nombre que usa la escena y no por una cadena
 * copiada — una cadena copiada dejaría el comprobador verde vigilando un dibujo que ya no
 * pide nadie.
 */
import { DIBUJO_DEL_MAZO, huecosDeLaBarra } from '../../escenas/barra';
import { CONTORNOS_DE_LA_CARTA } from '../../escenas/iconos';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola = detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 400)}`;
  fallos.push(`${que}${cola}`);
}

const estadoDe = (mesa: Mesa): EstadoDeRiberas => mesa.estado as EstadoDeRiberas;
const TRES = ['A', 'B', 'C'] as const;

/* ═══ 1. LA MESA QUE SE REÚNE: TODAVÍA NO HAY DELTA, Y LA ESCENA LO SABE ═══ */
{
  const mesa = abrirMesa({ id: 'RIB-3D', arcade: RIBERAS, semilla: 11, asientos: [...TRES] });
  const vista = proyectarRiberas(estadoDe(mesa), 'A');
  const opciones = opcionesDeRiberas(vista, 'A');

  comprobar('la vista recién abierta es de Riberas y se puede pintar', esVistaQueSePinta(vista));
  comprobar('pero sin islas no hay tablero: `null`, no un delta vacío', tableroEnTres(vista) === null);
  comprobar('a nadie le toca mientras se reúne la mesa', meToca(vista) === false);
  comprobar('la barra está entera apagada antes de empezar', barraEnTres(vista, 'A').every((p) => !p.disponible), barraEnTres(vista, 'A'));
  comprobar('y coger una pieza no da anillo', colocandoEnTres(vista, 'A', 'poblado') === null);
  comprobar('y no hay hueco de mazo mientras se reúne la mesa: `null`, no apagado', mazoEnLaBarra(vista, 'A', opciones) === null, mazoEnLaBarra(vista, 'A', opciones));
  const sueltas = opcionesFueraDelTablero(opciones);
  comprobar('empezar sale como botón, fuera del tablero', sueltas.some((o) => o.tipo === EMPEZAR_RIBERAS), sueltas.map((o) => o.id));
  comprobar('y no se pierde ninguna opción por el camino (todas son de fuera)', sueltas.length === opciones.length);
}

/* ═══ 2. LA MESA EMPEZADA: EL DELTA, LA BARRA Y LOS ANILLOS DICEN LO QUE LAS REGLAS ═══ */
{
  const abierta = abrirMesa({ id: 'RIB-3D', arcade: RIBERAS, semilla: 11, asientos: [...TRES] });
  const empezada = jugar(abierta, { quien: 'A', rev: abierta.rev, movimiento: { tipo: EMPEZAR_RIBERAS, carga: {} } });
  const vistaA = proyectarRiberas(estadoDe(empezada), 'A');
  const opcionesA = opcionesDeRiberas(vistaA, 'A');
  const tablero = tableroEnTres(vistaA);

  comprobar('empezada, hay tablero', tablero !== null);
  comprobar('el delta tiene las diecinueve islas', tablero?.islas.length === 19, tablero?.islas.length);
  comprobar(
    'exactamente una isla —la duna— va sin cifra, y ninguna lleva el cero de Riberas',
    tablero !== null && tablero.islas.filter((i) => i.cifra === null).length === 1 && tablero.islas.every((i) => i.cifra !== 0),
  );
  comprobar('las islas con cifra la llevan entre 2 y 12', tablero !== null && tablero.islas.every((i) => i.cifra === null || (i.cifra >= 2 && i.cifra <= 12)));
  /*
   * Aquí ponía «no hay ladrón en Riberas» y compraba que el campo saliera vacío para
   * siempre. Ahora la pieza existe: al empezar no hay ninguna comarca seca porque el
   * estiaje nace en la DUNA, que no rinde, y se exige que sea justo la duna y no otra —con
   * cualquier isla valdría un `!== null` y no se vería el día que naciera donde no debe—.
   */
  const laDunaDelTablero = tablero?.islas.find((i) => i.cifra === null) ?? null;
  comprobar(
    'el estiaje empieza en la duna, que es la que no rinde, y la escena sabe cuál es',
    tablero !== null &&
      laDunaDelTablero !== null &&
      tablero.seca !== null &&
      tablero.seca.q === laDunaDelTablero.hex.q &&
      tablero.seca.r === laDunaDelTablero.hex.r,
    { seca: tablero?.seca, duna: laDunaDelTablero?.hex },
  );
  comprobar('antes de fundar no hay piezas ni caminos', tablero !== null && tablero.piezas.length === 0 && tablero.caminos.length === 0);

  /* La serpentina empieza por A. */
  comprobar('le toca a A, y la escena lo sabe', vistaA.turnoDe === 'A' && meToca(vistaA));
  const vistaB = proyectarRiberas(estadoDe(empezada), 'B');
  comprobar('a B no le toca', meToca(vistaB) === false);

  /* La barra: sólo la choza, porque primero se funda. */
  const barraA = barraEnTres(vistaA, 'A');
  const porId = Object.fromEntries(barraA.map((p) => [p.id, p]));
  comprobar('la barra trae poblado, ciudad y puente', barraA.length === 3 && 'poblado' in porId && 'ciudad' in porId && 'puente' in porId);
  comprobar(
    'al fundar sólo se enciende el poblado',
    porId['poblado']?.disponible === true && porId['ciudad']?.disponible === false && porId['puente']?.disponible === false,
    barraA,
  );
  comprobar(
    'el poblado y la ciudad llevan el color del colono en el nombre del modelo (A es el primero del atlas), y el puente no',
    porId['poblado']?.modelo === `poblado-${COLORES_EN_3D[0]}` && porId['ciudad']?.modelo === `ciudad-${COLORES_EN_3D[0]}` && porId['puente']?.modelo === 'puente',
  );
  comprobar('B, que no tiene el turno, tiene la barra apagada', barraEnTres(vistaB, 'B').every((p) => !p.disponible));
  comprobar('un mirón sin asiento no tiene barra', barraEnTres(vistaA, null).length === 0);

  /*
   * ═══ EL CUARTO HUECO NO EXISTE EN LA COLOCACIÓN ═══
   *
   * `mazoEnLaBarra` no miraba `momento` y aquí salía `{ disponible: false }`: un cuarto
   * hueco apagado que se llevaba un cuarto del ancho y encogía las tres piezas de fundar y
   * trazar, en la única fase en que la barra es lo único que se usa. Y lo vendía como «hoy
   * no se pulsa» siendo «no existe la jugada»: la propia cabecera de la función distingue
   * los dos casos y éste era de los primeros disfrazado de los segundos. La barra tiene
   * TRES, y el pie no pierde nada porque en esta fase no hay COMPRAR que devolver.
   */
  comprobar('en la colocación NO hay hueco de mazo: `null`, no apagado — comprar no es una jugada de esta fase', mazoEnLaBarra(vistaA, 'A', opcionesA) === null && barraA.length === 3, mazoEnLaBarra(vistaA, 'A', opcionesA));
  comprobar('tampoco lo tiene B, que ni siquiera tiene el turno', mazoEnLaBarra(vistaB, 'B', opcionesDeRiberas(vistaB, 'B')) === null);
  comprobar('y sin hueco el pie se queda con todas sus opciones, entre las que no hay ninguna compra', opcionesFueraDeLaBarra(opcionesA, null).length === opcionesA.length && !opcionesA.some((o) => o.tipo === COMPRAR), opcionesA.map((o) => o.tipo));

  /* El anillo de fundar es, sitio por sitio, lo que FUNDAR ofrece. */
  const fundares = opcionesA.filter((o) => o.tipo === FUNDAR);
  const verticeDe = (o: { carga: unknown }): string => (o.carga as { vertice: string }).vertice;
  /* Alzar lleva la arista en `donde`, con el `que` de la obra; fundar lleva `vertice` a secas. */
  const aristaDe = (o: { carga: unknown }): string => (o.carga as { donde: string }).donde;
  const colocando = colocandoEnTres(vistaA, 'A', 'poblado');
  comprobar('coger el poblado da un anillo de vértices', colocando?.clase === 'vertice');
  comprobar(
    'con tantos sitios como opciones de fundar hay, que no son pocas',
    colocando !== null && colocando.donde.length === fundares.length && fundares.length > 30,
    { anillo: colocando?.donde.length, opciones: fundares.length },
  );
  const llavesDeLasOpciones = new Set(fundares.map(verticeDe));
  comprobar('y cada sitio del anillo es un vértice que las reglas ofrecen', colocando !== null && colocando.donde.every((llave) => llavesDeLasOpciones.has(llave)));
  comprobar(
    'el movimiento de cada sitio es el de la opción, sin montar nada',
    colocando !== null &&
      colocando.donde.every((llave) => {
        const m = colocando.movimientos.get(llave);
        const o = fundares.find((f) => verticeDe(f) === llave);
        return m !== undefined && o !== undefined && m.tipo === o.tipo && JSON.stringify(m.carga) === JSON.stringify(o.carga);
      }),
  );
  comprobar('coger la ciudad o el puente ahora no da anillo', colocandoEnTres(vistaA, 'A', 'ciudad') === null && colocandoEnTres(vistaA, 'A', 'puente') === null);
  comprobar('las opciones fuera del tablero no incluyen fundar', opcionesFueraDelTablero(opcionesA).every((o) => o.tipo !== FUNDAR));

  /* Se funda mandando EL MOVIMIENTO DEL SITIO, que es lo que hará el cliente. */
  const primerSitio = colocando?.donde[0];
  const movimiento = primerSitio === undefined ? undefined : colocando?.movimientos.get(primerSitio);
  comprobar('hay un movimiento que mandar', movimiento !== undefined);
  const fundada = movimiento === undefined ? empezada : jugar(empezada, { quien: 'A', rev: empezada.rev, movimiento });
  const vistaFundada = proyectarRiberas(estadoDe(fundada), 'A');
  const tableroFundado = tableroEnTres(vistaFundada);
  comprobar('el árbitro acepta el movimiento del sitio tal cual', fundada.rev === empezada.rev + 1, { antes: empezada.rev, despues: fundada.rev });
  comprobar(
    'y el delta enseña la choza como poblado del color de A en ese vértice: el mismo que la barra enseñaba',
    tableroFundado !== null &&
      tableroFundado.piezas.length === 1 &&
      tableroFundado.piezas[0]?.vertice === primerSitio &&
      tableroFundado.piezas[0]?.clase === 'poblado' &&
      tableroFundado.piezas[0]?.color === COLORES_EN_3D[0],
    tableroFundado?.piezas,
  );

  /* Ahora toca la vereda: se apaga el poblado y se enciende el puente. */
  const barraTrasFundar = Object.fromEntries(barraEnTres(vistaFundada, 'A').map((p) => [p.id, p.disponible]));
  comprobar(
    'tras fundar, sólo se enciende el puente',
    barraTrasFundar['puente'] === true && barraTrasFundar['poblado'] === false && barraTrasFundar['ciudad'] === false,
    barraTrasFundar,
  );
  const alzares = opcionesDeRiberas(vistaFundada, 'A').filter((o) => o.tipo === ALZAR);
  const colocandoVereda = colocandoEnTres(vistaFundada, 'A', 'puente');
  comprobar('coger el puente da un anillo de aristas', colocandoVereda?.clase === 'arista');
  comprobar(
    'con las mismas aristas que ALZAR ofrece (las pegadas a la choza)',
    colocandoVereda !== null &&
      colocandoVereda.donde.length === alzares.length &&
      alzares.length >= 2 &&
      colocandoVereda.donde.every((llave) => alzares.some((o) => aristaDe(o) === llave)),
    { anillo: colocandoVereda?.donde, opciones: alzares.map((o) => o.carga) },
  );

  const sitioDeVereda = colocandoVereda?.donde[0];
  const mueveVereda = sitioDeVereda === undefined ? undefined : colocandoVereda?.movimientos.get(sitioDeVereda);
  const alzada = mueveVereda === undefined ? fundada : jugar(fundada, { quien: 'A', rev: fundada.rev, movimiento: mueveVereda });
  const tableroAlzado = tableroEnTres(proyectarRiberas(estadoDe(alzada), 'A'));
  comprobar('la vereda entra por el mismo camino', alzada.rev === fundada.rev + 1);
  comprobar(
    'y el delta la enseña como camino del mismo color que las piezas de A',
    tableroAlzado !== null &&
      tableroAlzado.caminos.length === 1 &&
      tableroAlzado.caminos[0]?.arista === sitioDeVereda &&
      tableroAlzado.caminos[0]?.color === COLORES_EN_3D[0],
    tableroAlzado?.caminos,
  );

  /* La serpentina pasa a B: A se apaga, B se enciende. */
  const vistaB2 = proyectarRiberas(estadoDe(alzada), 'B');
  comprobar('ahora le toca a B', meToca(vistaB2) && !meToca(proyectarRiberas(estadoDe(alzada), 'A')));
  comprobar('B ve el poblado con el segundo color del atlas, por orden de asiento', barraEnTres(vistaB2, 'B').find((p) => p.id === 'poblado')?.modelo === `poblado-${COLORES_EN_3D[1]}`);
  comprobar('y con tres en la mesa caben los colores: se ve en tres', seVeEnTres(vistaB2) === true);
  comprobar('y el delta que ve B es el mismo que ve A', JSON.stringify(tableroEnTres(vistaB2)) === JSON.stringify(tableroAlzado));

  /* La mano en la colocación está vacía y no rompe nada. */
  comprobar('durante la colocación la mano está vacía', manoEnTres(vistaFundada).length === 0);
  comprobar('un mirón no tiene mano', manoEnTres(proyectarRiberas(estadoDe(alzada), null)).length === 0);
}

/* ═══ 3. LA MANO Y EL TRUEQUE, CON EL ESCENARIO DE `verify:riberas` ═══ */
function escenarioDeTrueque(deA: readonly Bien[], deB: readonly Bien[]): EstadoDeRiberas {
  const abierta = abrirMesa({ id: 'RIB-3D-T', arcade: RIBERAS, semilla: 7, asientos: ['A', 'B'] });
  const base = estadoDe(jugar(abierta, { quien: 'A', rev: abierta.rev, movimiento: { tipo: EMPEZAR_RIBERAS, carga: {} } }));
  let serie = 1;
  const fichasDe = (bienes: readonly Bien[]): Ficha[] => bienes.map((b) => `b${serie++}:${b}`);
  return {
    ...base,
    momento: 'jugando',
    paso: 4,
    faltaVereda: false,
    ultimaChoza: null,
    turno: 0,
    tirado: true,
    ultimaTirada: 8,
    siguienteFicha: 100,
    colonos: base.colonos.map((c, i) => ({
      ...c,
      almacen: fichasDe(i === 0 ? deA : deB),
      chozas: [verticeDeHex({ q: i === 0 ? 0 : 2, r: 0 }, 0)],
      veredas: [aristaDeHex({ q: i === 0 ? 0 : 2, r: 0 }, 0)],
    })),
  };
}

{
  const estado = escenarioDeTrueque(['junco', 'limo', 'junco'], ['sal']);
  const vistaA = proyectarRiberas(estado, 'A');
  const opcionesA = opcionesDeRiberas(vistaA, 'A');

  /* La mano. */
  const mano = manoEnTres(vistaA);
  comprobar('la mano tiene una carta por ficha, con su identificador de serie', mano.length === 3 && new Set(mano.map((c) => c.id)).size === 3, mano);
  /*
   * LOS BIENES VIAJAN CON SU NOMBRE, y esto es una comprobación y no una obviedad:
   * aquí hubo una tabla que los traducía al catán para reaprovechar sus iconos, y con
   * ella la carta de sal se dibujaba como una oveja. En un juego de trueques eso no es
   * un provisional: es enseñar un bien que no se tiene.
   */
  comprobar('y los bienes salen con su nombre de Riberas, sin traducir', mano.map((c) => c.bien).join(',') === 'junco,limo,junco', mano);
  comprobar(
    'lo que la mano enseña es exactamente lo que va en la carga del movimiento',
    mano.every((c) => bienDeLaFicha(c.id) === c.bien),
    mano.map((c) => [c.id, c.bien]),
  );

  /* Lo que se cambia por junco: lo que A no tiene ya. */
  const porJunco = bienesQueSeCambianPor(vistaA, opcionesA, 'junco');
  comprobar(
    'por junco se puede pedir lo que A no tiene: sal, piedra y grano',
    porJunco.length === 3 && ['sal', 'piedra', 'grano'].every((b) => porJunco.includes(b)),
    porJunco,
  );
  comprobar('y nunca lo que ya se tiene', !porJunco.includes('junco') && !porJunco.includes('limo'));
  comprobar('por un bien que no tengo no se cambia nada', bienesQueSeCambianPor(vistaA, opcionesA, 'grano').length === 0);

  /* A quién: con dos en la mesa, uno solo. */
  const trueques = truequesPosibles(vistaA, opcionesA, 'junco', 'sal');
  comprobar('junco por sal se le puede proponer a B, y sólo a B', trueques.length === 1 && trueques[0]?.para === 'B', trueques);
  comprobar(
    'con el nombre del colono para preguntar, no su asiento',
    trueques[0]?.nombre === vistaA.colonos[1]?.nombre && (trueques[0]?.nombre ?? '') !== '',
  );
  comprobar(
    'y la opción entera, tal como Riberas la ofrece',
    trueques[0]?.opcion.tipo === OFRECER && trueques[0]?.opcion.id === 'ofrecer:B:junco:sal',
    trueques[0]?.opcion,
  );
  const vistaB = proyectarRiberas(estado, 'B');
  comprobar('quien no tiene el turno no propone', truequesPosibles(vistaB, opcionesDeRiberas(vistaB, 'B'), 'sal', 'junco').length === 0);

  /* Las opciones fuera del tablero: las que no son ni obra ni oferta. */
  const sueltas = opcionesFueraDelTablero(opcionesA);
  comprobar('ofrecer no sale como botón: lo pinta la mano', sueltas.every((o) => o.tipo !== OFRECER));
  comprobar('pasar sí, porque ya se ha tirado', sueltas.some((o) => o.tipo === PASAR) && !sueltas.some((o) => o.tipo === TIRAR), sueltas.map((o) => o.id));
  const enElTablero = opcionesA.filter((o) => o.tipo === OFRECER || o.tipo === FUNDAR || o.tipo === ALZAR).length;
  comprobar('y ninguna opción se enseña dos veces ni ninguna se pierde', sueltas.length + enElTablero === opcionesA.length);

  /* En el juego abierto la barra responde al almacén, no al momento. */
  const barra = Object.fromEntries(barraEnTres(vistaA, 'A').map((p) => [p.id, p.disponible]));
  const hayObra = opcionesA.some((o) => o.tipo === FUNDAR || o.tipo === ALZAR);
  comprobar(
    'con junco, limo y junco la barra dice exactamente lo que las reglas ofrecen',
    (barra['poblado'] === true || barra['ciudad'] === true || barra['puente'] === true) === hayObra,
    { barra, hayObra },
  );
  const conVereda = escenarioDeTrueque(['junco', 'limo'], ['sal']);
  const vistaConVereda = proyectarRiberas(conVereda, 'A');
  const barraConVereda = Object.fromEntries(barraEnTres(vistaConVereda, 'A').map((p) => [p.id, p.disponible]));
  const hayAlzar = opcionesDeRiberas(vistaConVereda, 'A').some((o) => o.tipo === ALZAR);
  comprobar('y el puente se enciende exactamente cuando las reglas ofrecen alzar', barraConVereda['puente'] === hayAlzar, { barra: barraConVereda, hayAlzar });
}

// ---------------------------------------------------------------------------
// EL MAZO: una partida en marcha con las manos puestas
// ---------------------------------------------------------------------------

/**
 * UNA PARTIDA CON MAZO Y MANOS, hermana de la de `verify:riberas`.
 *
 * Sale de una mesa abierta con el árbitro y de un `EMPEZAR` mandado por la puerta de
 * siempre, así que el delta, los colores y el orden de los colonos son los de verdad.
 * Lo que se pone a mano es lo que el azar no da a tiempo —los bienes, el mazo, las
 * manos— y ni una regla: quien contesta a todo lo que se prueba aquí sigue siendo
 * `opcionesDeRiberas` y el reductor.
 *
 * Cada colono recibe una choza y una vereda propias para que Las Dos Veredas tengan
 * dónde caer: esa carta sólo se ofrece si queda al menos un sitio, y sin nada puesto
 * el bloque entero pasaría de largo sin comprobar nada.
 *
 * `turnosAbiertos` arranca en uno: una carta con el sello 0 es de un turno anterior y
 * se puede jugar; una con el sello 1 es de hoy y no.
 *
 * `veredas` da a un colono una CADENA en vez de su vereda suelta, y existe por una sola
 * razón: sin ella no hay manera de montar aquí a un dueño del Vado Largo, y hasta hoy
 * este fichero sólo sabía afirmar que el premio estaba VACANTE. Un premio que sólo se ha
 * comprobado vacante es un premio del que no se ha comprobado nada.
 */
function escenarioDeMazo(monta: {
  bienes: readonly (readonly Bien[])[];
  mazo?: readonly CartaDeRiberas[];
  manos?: readonly (readonly CartaEnMano[])[];
  guardias?: readonly number[];
  veredas?: readonly (readonly LlaveDeArista[] | undefined)[];
}): EstadoDeRiberas {
  const asientos = ['A', 'B', 'C'].slice(0, monta.bienes.length);
  const abierta = abrirMesa({ id: 'RIB-3D-M', arcade: RIBERAS, semilla: 31, asientos });
  const base = estadoDe(
    jugar(abierta, { quien: 'A', rev: abierta.rev, movimiento: { tipo: EMPEZAR_RIBERAS, carga: {} } }),
  );
  let serie = 1;
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
    mazo: monta.mazo === undefined ? base.mazo : [...monta.mazo],
    colonos: base.colonos.map((c, i) => ({
      ...c,
      almacen: (monta.bienes[i] ?? []).map((b) => `b${serie++}:${b}` as Ficha),
      mano: [...(monta.manos?.[i] ?? [])].map((m) => ({ ...m })),
      guardias: monta.guardias?.[i] ?? 0,
      chozas: [verticeDeHex({ q: i * 2 - 2, r: 0 }, 0)],
      veredas: [...(monta.veredas?.[i] ?? [aristaDeHex({ q: i * 2 - 2, r: 0 }, 0)])],
    })),
  };
  /*
   * LOS DOS PREMIOS SON DERIVADOS: se recalculan, no se escriben. Son la regla, no un
   * campo, y escribirlos a mano aquí sería montar una mesa que el juego nunca produciría
   * —un dueño del Vado sin cadena— y comprobar contra ella.
   */
  const conGuardia: EstadoDeRiberas = { ...puesto, guardia: recalcularLaGuardia(puesto) };
  return { ...conGuardia, vado: recalcularElVado(conGuardia) };
}

/** Una mesa de verdad puesta sobre un estado montado, para jugar con el árbitro. */
function mesaSobre(id: string, estado: EstadoDeRiberas, asientos: readonly string[]): Mesa {
  return abrirMesa({ id, arcade: RIBERAS, semilla: 77, asientos: [...asientos], estado });
}

/** Lo que se le ofrece a un asiento sobre una mesa. */
function opcionesEn(mesa: Mesa, quien: string): readonly Opcion[] {
  return opcionesDeRiberas(proyectarRiberas(estadoDe(mesa), quien), quien);
}

/** Manda un movimiento por el árbitro. */
/**
 * TIRA LOS DADOS Y, SI SALE UN SIETE, MUEVE EL ESTIAJE.
 *
 * Desde la fase 1 de `docs/EL-LADRON-DE-RIBERAS.md` un siete no deja hacer ninguna otra
 * cosa hasta que la pieza se mueva, así que un `find(PASAR)` escrito detrás de un
 * `TIRAR` sale `undefined` una de cada seis veces y este guion se cae con «no se puede
 * leer 'tipo' de undefined». Se mueve al primer destino que se ofrezca: adónde va no le
 * importa a nada de lo que este fichero mira, que son las cartas y la escena.
 */
function tirarYMoverElEstiaje(mesa: Mesa, quien: string): Mesa {
  const tirada = mover(mesa, quien, opcionesEn(mesa, quien).find((o) => o.tipo === TIRAR) as Opcion);
  const pendiente = opcionesEn(tirada, quien).find((o) => o.tipo === MOVER_EL_ESTIAJE);
  return pendiente === undefined ? tirada : mover(tirada, quien, pendiente);
}

function mover(mesa: Mesa, quien: string, o: Opcion): Mesa {
  return jugar(mesa, { quien, rev: mesa.rev, movimiento: { tipo: o.tipo, carga: o.carga } });
}

/** La vista de un asiento sobre una mesa. */
const vistaEn = (mesa: Mesa, quien: string | null): unknown => proyectarRiberas(estadoDe(mesa), quien);

const canonico = (x: unknown): string => JSON.stringify(x);
const laCarta = (cartas: readonly CartaDelMazoEnTres[], id: string): CartaDelMazoEnTres | undefined =>
  cartas.find((c) => c.id === id);

/** Un lienzo cualquiera para pedirle a la escena el reparto de verdad. */
const CAMPO = 0.8;
const PROPORCION = 16 / 9;
/* Y el campo de verdad de los dos clientes, que montan la cámara con `fov: 45`. */
const CAMPO_DE_LA_BARRA = (45 * Math.PI) / 180;

/* ═══ 4. LA COMPRADA HOY NO SE JUEGA HOY: LA REGLA, JUGADA ENTERA ═══ */
{
  const DOS = ['A', 'B'];
  const inicial = escenarioDeMazo({
    bienes: [['sal', 'piedra', 'grano'], ['limo', 'junco']],
    mazo: ['c1:guardia'],
  });
  let partida = mesaSobre('RIB-3D-ESPERA', inicial, DOS);

  /* Antes de comprar, la mano está vacía y no hay nada que apagar ni que encender. */
  comprobar('sin cartas, la mano del mazo sale vacía', cartasEnTres(vistaEn(partida, 'A'), opcionesEn(partida, 'A')).length === 0);
  comprobar('y la escena no reparte ningún hueco con la mano vacía', huecosDeLasCartas([], CAMPO, PROPORCION, null).length === 0);

  /* SE COMPRA CON LA OPCIÓN DEL JUEGO, sin montar el movimiento. */
  const compra = comprarEnTres(opcionesEn(partida, 'A'));
  comprobar('con sal, piedra y grano se ofrece comprar', compra !== null && compra.tipo === COMPRAR, compra?.id);
  comprobar('y la carga de comprar va vacía, tal como el juego la escribe', canonico(compra?.carga) === canonico({}));
  partida = mover(partida, 'A', compra as Opcion);
  comprobar('el árbitro acepta la compra tal cual', estadoDe(partida).colonos[0]?.mano.length === 1);

  const reciennacida = cartasEnTres(vistaEn(partida, 'A'), opcionesEn(partida, 'A'));
  const hoy = laCarta(reciennacida, 'c1');
  comprobar('la carta comprada aparece en la mano, con su seudónimo por identificador', reciennacida.length === 1 && hoy !== undefined, reciennacida);
  comprobar('y con la cara de La Guardia', hoy?.familia === 'guardia' && hoy?.dibujo === 'guardia' && hoy?.nombre === 'La Guardia', hoy);
  comprobar('RECIÉN COMPRADA NO SE JUEGA: la bandera sale apagada', hoy?.sePuedeJugar === false && hoy?.sePuedeRevelar === false, hoy);
  comprobar(
    'y la bandera dice lo mismo que el juego: no ofrece jugarla',
    opcionesEn(partida, 'A').every((o) => o.tipo !== GUARDIA),
    opcionesEn(partida, 'A').map((o) => o.id),
  );
  comprobar('así que no hay ninguna jugada que ofrecer para ella', jugadasDeLaCarta(vistaEn(partida, 'A'), opcionesEn(partida, 'A'), 'c1').length === 0);
  comprobar('ni a quién robar', aQuienSeLeRoba(vistaEn(partida, 'A'), opcionesEn(partida, 'A'), 'c1').length === 0);
  comprobar('ni una jugada que mandar sin preguntar', jugadaSinPreguntar(vistaEn(partida, 'A'), opcionesEn(partida, 'A'), 'c1') === null);
  comprobar('ni nada que revelar: una guardia no es un título', revelarDe(opcionesEn(partida, 'A'), 'c1') === null);

  /* LA ESCENA DE VERDAD: la enseña, y la enseña APAGADA y sin abrir casillas. */
  const comoLaEscena: readonly CartaDelMazo[] = reciennacida;
  const repartida = huecosDeLasCartas(comoLaEscena, CAMPO, PROPORCION, null);
  comprobar('la escena la reparte igual: sigue viéndose, no desaparece', repartida.length === 1);
  comprobar('y sale apagada, que es lo que significa «hoy no»', repartida[0]?.apagada === true, repartida[0]);
  comprobar('y no abre ninguna casilla donde soltarla', puertasDeLaCarta(comoLaEscena[0] ?? null).length === 0);

  /* SE JUEGA EL TURNO DE B POR LA PUERTA DE SIEMPRE, y se vuelve a mirar. */
  partida = mover(partida, 'A', opcionesEn(partida, 'A').find((o) => o.tipo === PASAR) as Opcion);
  partida = tirarYMoverElEstiaje(partida, 'B');
  partida = mover(partida, 'B', opcionesEn(partida, 'B').find((o) => o.tipo === PASAR) as Opcion);
  partida = tirarYMoverElEstiaje(partida, 'A');

  const vistaA = vistaEn(partida, 'A');
  const opcionesA = opcionesEn(partida, 'A');
  const manana = laCarta(cartasEnTres(vistaA, opcionesA), 'c1');
  comprobar('AL TURNO SIGUIENTE, LA MISMA CARTA SE ENCIENDE', manana?.sePuedeJugar === true, manana);
  comprobar('y sigue sin ser revelable: revelar es de los títulos', manana?.sePuedeRevelar === false);
  const yaNoApagada = huecosDeLasCartas(cartasEnTres(vistaA, opcionesA), CAMPO, PROPORCION, null);
  comprobar('la escena deja de apagarla', yaNoApagada[0]?.apagada === false);
  comprobar('y le abre la casilla de jugar, y sólo ésa', canonico(puertasDeLaCarta(manana ?? null)) === canonico(['jugar']), puertasDeLaCarta(manana ?? null));

  /* LOS DESTINATARIOS SON EXACTAMENTE LOS QUE EL JUEGO OFRECE. */
  const ofrecidas = opcionesA.filter((o) => o.tipo === GUARDIA);
  const roban = aQuienSeLeRoba(vistaA, opcionesA, 'c1');
  comprobar(
    'a quien se le puede robar es, uno a uno, lo que el juego ofrece',
    canonico(roban.map((j) => j.a).sort()) === canonico(ofrecidas.map((o) => (o.carga as { a: string }).a).sort()),
    { traduccion: roban.map((j) => j.a), juego: ofrecidas.map((o) => (o.carga as { a: string }).a) },
  );
  comprobar('con dos en la mesa, sólo B, y con su nombre para preguntar', roban.length === 1 && roban[0]?.a === 'B' && (roban[0]?.nombre ?? '') !== '');
  comprobar('la jugada dice de qué clase es, y coincide con la familia del naipe', roban[0]?.clase === 'guardia' && roban[0]?.clase === manana?.familia);
  comprobar('una guardia no pide bienes', canonico(roban[0]?.bienes) === canonico([]));

  /* SIENDO UNA SOLA, SE MANDA SIN PREGUNTAR. */
  const sola = jugadaSinPreguntar(vistaA, opcionesA, 'c1');
  comprobar('con un solo destinatario no hay nada que preguntar', sola !== null && sola.a === 'B', sola?.a);
  comprobar(
    'y el movimiento que se manda es EL DE LA OPCIÓN, sin montar nada',
    sola !== null &&
      sola.opcion.tipo === ofrecidas[0]?.tipo &&
      canonico(sola.opcion.carga) === canonico(ofrecidas[0]?.carga),
    { manda: sola?.opcion.carga, ofrece: ofrecidas[0]?.carga },
  );
  const bienesDeBAntes = estadoDe(partida).colonos[1]?.almacen.length ?? 0;
  const jugada = mover(partida, 'A', sola?.opcion as Opcion);
  comprobar('el árbitro lo acepta tal cual', jugada.rev === partida.rev + 1, { antes: partida.rev, despues: jugada.rev });
  comprobar(
    'y roba de verdad: B pierde un bien y A suma una guardia',
    (estadoDe(jugada).colonos[1]?.almacen.length ?? 0) === bienesDeBAntes - 1 && estadoDe(jugada).colonos[0]?.guardias === 1,
  );
  comprobar('la carta se va de la mano, y la mano de la escena se queda vacía', cartasEnTres(vistaEn(jugada, 'A'), opcionesEn(jugada, 'A')).length === 0);
}

/* ═══ 5. LOS DESTINATARIOS SON LOS DEL JUEGO, TAMBIÉN CUANDO SON MENOS ═══ */
{
  /* C no tiene ni un bien: a quien no tiene nada no se le roba, y eso es público. */
  const estado = escenarioDeMazo({
    bienes: [[], ['limo', 'junco'], []],
    manos: [[{ carta: 'c1:guardia', comprada: 0 }], [], []],
  });
  const vista = proyectarRiberas(estado, 'A');
  const opciones = opcionesDeRiberas(vista, 'A');
  const roban = aQuienSeLeRoba(vista, opciones, 'c1');
  comprobar('a C, que no tiene nada, no se le ofrece robar', roban.length === 1 && roban[0]?.a === 'B', roban.map((j) => j.a));
  comprobar('y eso no lo decide esta traducción: es lo que el juego ofrece', roban.length === opciones.filter((o) => o.tipo === GUARDIA).length);

  const conDos = escenarioDeMazo({
    bienes: [[], ['limo'], ['grano']],
    manos: [[{ carta: 'c1:guardia', comprada: 0 }], [], []],
  });
  const vistaDos = proyectarRiberas(conDos, 'A');
  const opcionesDos = opcionesDeRiberas(vistaDos, 'A');
  const dosVictimas = aQuienSeLeRoba(vistaDos, opcionesDos, 'c1');
  comprobar('con dos que tienen algo, salen los dos', canonico(dosVictimas.map((j) => j.a).sort()) === canonico(['B', 'C']), dosVictimas.map((j) => j.a));
  comprobar('y entonces HAY que preguntar: no se manda nada solo', jugadaSinPreguntar(vistaDos, opcionesDos, 'c1') === null);
  comprobar(
    'cada una trae la opción entera y el nombre del colono, no su asiento',
    dosVictimas.every((j) => j.opcion.tipo === GUARDIA && j.nombre !== '' && canonico(j.opcion.carga) === canonico({ carta: 'c1', a: j.a })),
    dosVictimas.map((j) => [j.nombre, j.opcion.carga]),
  );
}

/* ═══ 6. EL TÍTULO SE REVELA HOY MISMO, Y LA MANO DE OTRO NO SE PIDE ═══ */
{
  const estado = escenarioDeMazo({
    bienes: [['limo'], ['junco'], []],
    /* El faro se compró HOY —sello 1, como `turnosAbiertos`— y aun así se revela. */
    manos: [
      [{ carta: 'c1:faro', comprada: 1 }],
      [{ carta: 'c2:guardia', comprada: 0 }],
      [],
    ],
  });
  const vistaA = proyectarRiberas(estado, 'A');
  const opcionesA = opcionesDeRiberas(vistaA, 'A');
  const mias = cartasEnTres(vistaA, opcionesA);
  const faro = laCarta(mias, 'c1');

  comprobar('el título sale con la cara de El Faro', faro?.familia === 'titulo' && faro?.dibujo === 'faro' && faro?.nombre === 'El Faro', faro);
  comprobar('EN MI TURNO SE PUEDE REVELAR, aunque se comprara hoy', faro?.sePuedeRevelar === true, faro);
  comprobar('y no se puede «jugar»: un título no se juega', faro?.sePuedeJugar === false);
  comprobar('la escena le abre la casilla de revelar, y sólo ésa', canonico(puertasDeLaCarta(faro ?? null)) === canonico(['revelar']));
  comprobar('y no la apaga', huecosDeLasCartas(mias, CAMPO, PROPORCION, null)[0]?.apagada === false);
  comprobar('su familia es la que la escena reserva a los títulos', faro?.familia === FAMILIA_DE_LOS_TITULOS);

  const revelar = revelarDe(opcionesA, 'c1');
  const suya = opcionesA.find((o) => o.tipo === REVELAR);
  comprobar('revelar devuelve la opción del juego, entera', revelar !== null && revelar === suya, revelar?.id);
  comprobar('con la carga que el juego escribe: el seudónimo y nada más', canonico(revelar?.carga) === canonico({ carta: 'c1' }));
  const revelado = jugar(mesaSobre('RIB-3D-REV', estado, ['A', 'B', 'C']), {
    quien: 'A',
    rev: 0,
    movimiento: { tipo: revelar?.tipo ?? '', carga: revelar?.carga },
  });
  comprobar('y el árbitro lo acepta tal cual: el título pasa a estar a la vista', canonico(estadoDe(revelado).colonos[0]?.titulos) === canonico(['faro']));

  /* ═══ LA MANO DE OTRO NO SE PIDE POR NINGUNA PUERTA ═══ */
  const vistaB = proyectarRiberas(estado, 'B');
  const opcionesB = opcionesDeRiberas(vistaB, 'B');
  const suyas = cartasEnTres(vistaB, opcionesB);
  comprobar('B ve su carta y sólo la suya', suyas.length === 1 && suyas[0]?.id === 'c2', suyas);
  comprobar('la carta de A no aparece en la mano de B ni por asomo', canonico(suyas).includes('faro') === false && laCarta(suyas, 'c1') === undefined);
  comprobar('ni A ve la de B', laCarta(mias, 'c2') === undefined && mias.length === 1);
  comprobar('pedir el revelar de una carta ajena da `null`', revelarDe(opcionesB, 'c1') === null);
  comprobar('y pedir sus jugadas da una lista vacía, no las de su dueño', jugadasDeLaCarta(vistaB, opcionesB, 'c1').length === 0);
  comprobar('a B, que no tiene el turno, su guardia le sale apagada', suyas[0]?.sePuedeJugar === false, suyas[0]);
  comprobar('un mirón sin asiento no tiene mano de cartas', cartasEnTres(proyectarRiberas(estado, null), []).length === 0);

  /*
   * EL IDENTIFICADOR ES EL SEUDÓNIMO, Y ESO ES EL §5 bis.
   *
   * `c1` no dice qué carta es; `c1:faro` sí. El `id` de un naipe acaba en una llave
   * de React y en un `onCoger`, y de ahí a un rótulo hay un paso — que es justo el
   * agujero que `verify:mesa` no caza, porque busca la forma canónica con comillas.
   */
  comprobar('ningún identificador de la mano lleva la carta dentro', mias.every((c) => !c.id.includes(':')), mias.map((c) => c.id));
  comprobar('y en toda la mano no viaja la carta entera', canonico(mias).includes('c1:faro') === false);
}

/* ═══ 7. LO QUE HAY QUE PREGUNTAR: PARES, BIENES Y LA QUE NO PREGUNTA NADA ═══ */
{
  const estado = escenarioDeMazo({
    bienes: [[], ['limo'], []],
    manos: [
      [
        { carta: 'c3:ano-bueno', comprada: 0 },
        { carta: 'c4:acaparamiento', comprada: 0 },
        { carta: 'c5:dos-veredas', comprada: 0 },
      ],
      [],
      [],
    ],
  });
  const vista = proyectarRiberas(estado, 'A');
  const opciones = opcionesDeRiberas(vista, 'A');
  const mano = cartasEnTres(vista, opciones);

  comprobar('las tres salen en la mano y las tres se pueden jugar', mano.length === 3 && mano.every((c) => c.sePuedeJugar), mano);
  comprobar(
    'cada una con su cara',
    canonico(mano.map((c) => [c.familia, c.dibujo, c.nombre])) ===
      canonico([
        ['anobueno', 'anobueno', 'El Año Bueno'],
        ['acaparamiento', 'acaparamiento', 'El Acaparamiento'],
        ['dosveredas', 'dosveredas', 'Las Dos Veredas'],
      ]),
    mano,
  );
  comprobar('ninguna de las tres se revela', mano.every((c) => !c.sePuedeRevelar && revelarDe(opciones, c.id) === null));
  comprobar('y la escena le abre a cada una la casilla de jugar', mano.every((c) => canonico(puertasDeLaCarta(c)) === canonico(['jugar'])));

  /* EL AÑO BUENO: los pares que el juego ofrece, sin repetir y con los dobles dentro. */
  const pares = paresDelAnoBueno(vista, opciones, 'c3');
  const delJuego = opciones.filter((o) => o.tipo === ANO_BUENO);
  comprobar('los pares son, uno a uno, los que el juego ofrece', pares.length === delJuego.length && pares.length > 0, { traduccion: pares.length, juego: delJuego.length });
  comprobar('que son las quince combinaciones sin repetir de cinco bienes', pares.length === (BIENES.length * (BIENES.length + 1)) / 2, pares.length);
  comprobar('todos con dos bienes dentro', pares.every((j) => j.bienes.length === 2));
  comprobar('los dobles están: dos iguales es legal', pares.some((j) => j.bienes[0] === j.bienes[1]));
  comprobar('y ninguno repetido: `sal y grano` no sale también del revés', new Set(pares.map((j) => canonico(j.bienes))).size === pares.length);
  comprobar(
    'cada par trae la opción entera, con la carga tal como el juego la escribe',
    pares.every((j) => canonico(j.opcion.carga) === canonico({ carta: 'c3', bienes: [...j.bienes] })),
    pares[0]?.opcion.carga,
  );
  comprobar('con dos bienes que elegir, no se manda nada sin preguntar', jugadaSinPreguntar(vista, opciones, 'c3') === null);

  /* EL ACAPARAMIENTO: los cinco bienes, tenga quien tenga. */
  const acapara = bienesQueSeAcaparan(vista, opciones, 'c4');
  comprobar('se puede pedir cualquiera de los cinco bienes', canonico(acapara.map((j) => j.bienes[0])) === canonico([...BIENES]), acapara.map((j) => j.bienes));
  comprobar('y son los mismos que el juego ofrece', acapara.length === opciones.filter((o) => o.tipo === ACAPARAMIENTO).length);
  comprobar('cada uno con su opción, sin montar la carga', acapara.every((j) => canonico(j.opcion.carga) === canonico({ carta: 'c4', bien: j.bienes[0] })));
  comprobar('un bien es uno: la jugada trae uno, no dos', acapara.every((j) => j.bienes.length === 1));

  /* LAS DOS VEREDAS: no pide nada, así que se manda sola. */
  const veredas = jugadaSinPreguntar(vista, opciones, 'c5');
  comprobar('Las Dos Veredas no preguntan nada: sale una sola jugada', veredas !== null && veredas.clase === 'dosveredas', veredas?.clase);
  comprobar('sin destinatario y sin bienes', veredas?.a === null && canonico(veredas?.bienes) === canonico([]));
  comprobar('y con la carga del juego: sólo la carta', canonico(veredas?.opcion.carga) === canonico({ carta: 'c5' }));

  /* LA CLASE DE LA JUGADA Y LA FAMILIA DEL NAIPE SON LA MISMA PALABRA. */
  comprobar(
    'la clase de cada jugada es la familia de su naipe: la pantalla sabe qué preguntar mirando la carta',
    mano.every((c) => jugadasDeLaCarta(vista, opciones, c.id).every((j) => j.clase === c.familia)),
  );

  /* Y SE MANDA POR EL ÁRBITRO, TAL CUAL. */
  const mesa = mesaSobre('RIB-3D-ANO', estado, ['A', 'B', 'C']);
  const dobleSal = pares.find((j) => canonico(j.bienes) === canonico(['sal', 'sal']));
  comprobar('hay un par de dos sales que pedir', dobleSal !== undefined);
  const cogido = mover(mesa, 'A', dobleSal?.opcion as Opcion);
  comprobar(
    'el árbitro acepta el año bueno y entran los dos bienes del arcón',
    (estadoDe(cogido).colonos[0]?.almacen.length ?? 0) === 2 &&
      (estadoDe(cogido).colonos[0]?.almacen.every((f) => f.endsWith(':sal')) ?? false),
    estadoDe(cogido).colonos[0]?.almacen,
  );
  comprobar(
    'y con la carta jugada, las otras dos se apagan: una por turno',
    cartasEnTres(vistaEn(cogido, 'A'), opcionesEn(cogido, 'A')).every((c) => !c.sePuedeJugar),
    cartasEnTres(vistaEn(cogido, 'A'), opcionesEn(cogido, 'A')),
  );
}

/*
 * ═══ 8 BIS. LOS DOS PREMIOS SE VEN COMO NAIPE, Y NO PASAN POR `misCartas` ═══
 *
 * ═══ EL FALLO, CONTADO POR QUIEN LO SUFRIÓ ═══
 *
 * Miguel encadenó cinco veredas y dijo: «no le otorga la carta de constructor de caminos».
 * Se la otorgaba: el premio saltaba solo y los dos puntos entraban. Lo que no pasaba es que
 * SE VIERA — el Vado Largo salía como una línea de texto en el marcador y en ninguna parte
 * más, y en la mano de la izquierda, que es donde se mira lo que uno tiene, no había nada.
 *
 * ═══ Y LA TRAMPA QUE TIENE ARREGLARLO ═══
 *
 * Lo primero que sale es meter el premio en `misCartas` y dejar que `cartasEnTres` lo
 * pinte. Eso convierte un dato PÚBLICO —quién tiene el Vado lo sabe la mesa entera— en un
 * pasajero del campo SECRETO, que es el que no viaja a nadie más. Por eso el premio sale
 * por una puerta hermana, `premiosEnTres`, y por eso aquí se comprueban las dos cosas: que
 * el naipe está, y que no ha entrado por la puerta que no era.
 *
 * A tiene una cadena de CINCO veredas de verdad —los cinco lados de una isla— y B tres
 * guardias jugadas, así que los dos premios tienen dueño y C no tiene ninguno. Los dos son
 * derivados: los recalcula `escenarioDeMazo` con las funciones del juego, no se escriben.
 */
{
  const LA_ISLA = { q: -2, r: 0 };
  const CADENA = [0, 1, 2, 3, 4].map((k) => aristaDeHex(LA_ISLA, k));
  const estado = escenarioDeMazo({
    bienes: [['limo'], ['junco'], []],
    manos: [[{ carta: 'c1:guardia', comprada: 0 }], [], []],
    guardias: [0, 3, 0],
    /* Sólo A cambia: los otros dos se quedan con su vereda suelta de siempre. */
    veredas: [CADENA],
  });

  /* EL ESCENARIO TIENE QUE VALER: sin dueño de los dos premios, todo lo de abajo pasa solo. */
  comprobar(
    'A tiene una cadena de cinco y el Vado Largo es suyo: el premio salió de la regla',
    largoDelVado(estado.colonos[0]?.veredas ?? [], []) === VADO_MINIMO && estado.vado.de === 'A',
    { largo: largoDelVado(estado.colonos[0]?.veredas ?? [], []), vado: estado.vado },
  );
  comprobar('y La Mayor Guardia es de B, para que los dos premios sean de dueños distintos', estado.guardia.de === 'B');

  const vistaA = proyectarRiberas(estado, 'A');
  const opcionesA = opcionesDeRiberas(vistaA, 'A');
  const premiosDeA = premiosEnTres(vistaA, 'A');
  comprobar('A tiene UN naipe de premio: el Vado Largo, y no el otro', premiosDeA.length === 1 && premiosDeA[0]?.nombre === 'El Vado Largo', premiosDeA.map((p) => p.nombre));
  comprobar('B tiene el suyo, y es el otro', canonico(premiosEnTres(vistaA, 'B').map((p) => p.nombre)) === canonico(['La Mayor Guardia']));
  comprobar('y C no tiene ninguno: un premio vacante no se reparte al primero de la lista', premiosEnTres(vistaA, 'C').length === 0);
  comprobar('un mirón sin asiento tampoco pide premios', premiosEnTres(vistaA, null).length === 0);
  comprobar('ni una vista que no es de Riberas', premiosEnTres({ desde: 'frente' }, 'A').length === 0 && premiosEnTres(null, 'A').length === 0);

  /*
   * SE PIDEN DESDE LA VISTA DE CUALQUIERA, y eso es la prueba de que son públicos: la mano
   * de cartas de otro no se puede pedir por ninguna puerta, y su premio sí — porque no hay
   * nada que tapar. Si algún día esto empieza a devolver vacío desde la vista ajena, es que
   * el premio se ha mudado a un campo secreto.
   */
  const vistaC = proyectarRiberas(estado, 'C');
  comprobar('desde la vista de C se ve el premio de A igual que desde la de A', canonico(premiosEnTres(vistaC, 'A')) === canonico(premiosDeA), premiosEnTres(vistaC, 'A'));
  comprobar('mientras que la mano de cartas de A desde la vista de C está vacía: eso sí es secreto', cartasEnTres(vistaC, opcionesDeRiberas(vistaC, 'C')).length === 0 && cartasEnTres(vistaA, opcionesA).length === 1);

  /*
   * ═══ Y `laManoDeLaIzquierda` OBEDECE A `quien` EN LAS DOS MITADES ═══
   *
   * Obedecía sólo en una: los premios eran los de `quien` y las cartas eran siempre las de
   * `misCartas`, o sea las del que mira. Pedir desde la vista de A la mano de B devolvía los
   * premios de B pegados a las cartas de A. No es fuga —eran cartas mías— pero es la firma
   * que los dos clientes llaman, prometiendo lo que no cumplía.
   */
  const manoDeBDesdeA = laManoDeLaIzquierda(vistaA, opcionesA, 'B');
  comprobar('pedida desde la vista de A, la mano de B son SUS premios y ni una carta', manoDeBDesdeA.every((n) => n.esPremio === true) && canonico(manoDeBDesdeA) === canonico(premiosEnTres(vistaA, 'B')) && manoDeBDesdeA.length === 1, manoDeBDesdeA.map((n) => n.nombre));
  comprobar('la de A desde su propia vista lleva su premio Y su carta', laManoDeLaIzquierda(vistaA, opcionesA, 'A').length === premiosDeA.length + cartasEnTres(vistaA, opcionesA).length && laManoDeLaIzquierda(vistaA, opcionesA, 'A').some((n) => n.esPremio !== true));
  comprobar('y la de nadie (`null`) está vacía, aunque la vista tenga cartas', laManoDeLaIzquierda(vistaA, opcionesA, null).length === 0);

  /* ── EL PREMIO NO ES UNA CARTA, Y SE COMPRUEBA POR LOS TRES CAMINOS ── */
  comprobar(
    'el naipe de premio NO sale por `cartasEnTres`: no está en `misCartas`',
    cartasEnTres(vistaA, opcionesA).every((c) => c.esPremio !== true && c.familia !== 'vado'),
    cartasEnTres(vistaA, opcionesA).map((c) => c.familia),
  );
  comprobar(
    'ni la vista de A lleva el premio dentro de `misCartas`, que es el campo que no viaja',
    canonico(vistaA.misCartas).includes('vado') === false && canonico(vistaA.misCartas).includes('premio') === false,
    vistaA.misCartas,
  );
  const secretos = loSecretoDeRiberas(estado).filter((s): s is string => typeof s === 'string');
  comprobar('hay secretos que buscar, o esto no probaría nada', secretos.length > 0, secretos.length);
  comprobar(
    'y NINGÚN naipe de premio es un secreto declarado: un premio es público, y lo secreto no se pinta',
    premiosDeA.every((p) => !secretos.includes(p.id) && !secretos.some((s) => p.id.includes(s))),
    { premios: premiosDeA.map((p) => p.id) },
  );

  /* ── NO SE PUEDE JUGAR, Y ESO LO DICEN A LA VEZ LA TRADUCCIÓN Y LA ESCENA ── */
  const elNaipe = premiosDeA[0];
  comprobar('el naipe de premio no se puede ni jugar ni revelar, y lo dice él mismo', elNaipe?.sePuedeJugar === false && elNaipe?.sePuedeRevelar === false && elNaipe?.esPremio === true, elNaipe);
  comprobar(
    'y el juego no ofrece ni una sola manera de jugarlo ni de revelarlo',
    jugadasDeLaCarta(vistaA, opcionesA, elNaipe?.id ?? '').length === 0 &&
      jugadaSinPreguntar(vistaA, opcionesA, elNaipe?.id ?? '') === null &&
      revelarDe(opcionesA, elNaipe?.id ?? '') === null,
  );
  comprobar(
    'la ESCENA tampoco le abre ninguna casilla donde soltarlo',
    puertasDeLaCarta(elNaipe ?? null).length === 0,
    puertasDeLaCarta(elNaipe ?? null),
  );

  /* ── Y ESTÁ EN LA MANO, REPARTIDO CON LAS CARTAS Y SIN APAGARSE ── */
  const laMano = laManoDeLaIzquierda(vistaA, opcionesA, 'A');
  comprobar(
    'la mano de la izquierda son los premios MÁS las cartas, sin perder ni duplicar ninguna',
    laMano.length === premiosDeA.length + cartasEnTres(vistaA, opcionesA).length &&
      new Set(laMano.map((c) => c.id)).size === laMano.length,
    laMano.map((c) => c.id),
  );
  const colocada = huecosDeLasCartas(laMano, (45 * Math.PI) / 180, 16 / 9, null);
  comprobar('y la escena de verdad la reparte entera: un hueco por naipe', colocada.length === laMano.length);
  comprobar(
    'el premio NO sale apagado, aunque no se pueda jugar: apagado querría decir «hoy no»',
    colocada.find((c) => c.carta.id === elNaipe?.id)?.apagada === false,
    colocada.map((c) => `${c.carta.id}:${String(c.apagada)}`),
  );
  comprobar(
    'y va arriba del todo, lejos de las casillas del pie que nunca va a usar',
    colocada[0]?.carta.id === elNaipe?.id,
    colocada.map((c) => c.carta.id),
  );

  /* ── LA CARA: familia propia, color vivo y dibujo que existe ── */
  comprobar('su familia es una que la escena reparte, y no la de los títulos', ORDEN_DE_LAS_FAMILIAS.includes(elNaipe?.familia ?? '') && elNaipe?.familia !== FAMILIA_DE_LOS_TITULOS);
  comprobar(
    'y NO es la familia `guardia` de la carta que se juega: el premio no es una guardia más',
    premiosEnTres(vistaA, 'B')[0]?.familia === 'mayorguardia',
    premiosEnTres(vistaA, 'B')[0]?.familia,
  );
  const dosPremios = [...premiosDeA, ...premiosEnTres(vistaA, 'B')];
  const contornosDePremio = Object.keys(CONTORNOS_DE_LA_CARTA);
  comprobar('los dos dibujos de premio existen en los iconos de la escena', dosPremios.every((p) => contornosDePremio.includes(p.dibujo)), { pide: dosPremios.map((p) => p.dibujo), hay: contornosDePremio });
  comprobar('y ninguno toma prestado el dibujo de una carta del mazo', dosPremios.every((p) => CLASES_DE_CARTA.every((clase) => retratoDeLaCarta(clase)?.dibujo !== p.dibujo)), dosPremios.map((p) => p.dibujo));
  comprobar('los dos tienen color propio, y ninguno es el de reserva', new Set(dosPremios.map((p) => colorDeLaFamilia(p.familia))).size === 2 && dosPremios.every((p) => colorDeLaFamilia(p.familia) !== COLOR_SIN_FAMILIA), dosPremios.map((p) => colorDeLaFamilia(p.familia)));
  comprobar('sus nombres se leen y son los del juego', canonico(dosPremios.map((p) => p.nombre)) === canonico(['El Vado Largo', 'La Mayor Guardia']));
  comprobar(
    'y su `id` no puede chocar con el seudónimo de una carta, porque lleva dos puntos dentro',
    dosPremios.every((p) => p.id.includes(':')) &&
      cartasEnTres(vistaA, opcionesA).every((c) => !c.id.includes(':')),
    { premios: dosPremios.map((p) => p.id), cartas: cartasEnTres(vistaA, opcionesA).map((c) => c.id) },
  );

  /* ── Y EL PREMIO SE VA CUANDO SE VA: no es un naipe que se queda pegado ── */
  const sinCadena: EstadoDeRiberas = {
    ...estado,
    colonos: estado.colonos.map((c) => (c.asiento === 'A' ? { ...c, veredas: [aristaDeHex(LA_ISLA, 0)] } : c)),
  };
  const cortada: EstadoDeRiberas = { ...sinCadena, vado: recalcularElVado(sinCadena) };
  comprobar(
    'sin cadena, el Vado queda vacante y el naipe DESAPARECE de la mano de A',
    cortada.vado.de === null && premiosEnTres(proyectarRiberas(cortada, 'A'), 'A').length === 0,
    cortada.vado,
  );
}

/* ═══ 8. EL MARCADOR: lo público de todos, y lo oculto sólo mío ═══ */
{
  const estado = escenarioDeMazo({
    bienes: [['limo'], ['junco'], []],
    manos: [
      [
        { carta: 'c1:faro', comprada: 0 },
        { carta: 'c2:guardia', comprada: 0 },
      ],
      [{ carta: 'c3:molino', comprada: 0 }],
      [],
    ],
    guardias: [3, 1, 0],
  });
  const marcador = marcadorEnTres(proyectarRiberas(estado, 'A'));
  comprobar('hay marcador, con un colono por asiento', marcador !== null && marcador.colonos.length === 3, marcador?.colonos.length);
  /*
   * EL COLOR DEL TURNO PARA EL TAPETE: el del colono al que le toca, con el MISMO reparto
   * que sus piezas en la barra, y `null` fuera de Riberas. Hasta esta fase ninguna pantalla
   * lo pasaba a `<Delta>` y la mesa salía sin tapete en la partida.
   */
  const vistaConTurnoDeB = proyectarRiberas({ ...estado, turno: 1 }, 'A');
  comprobar(
    'el tapete es del colono al que le toca: en el turno de A sale el color de la primera pieza de A, en el de B el de B, y fuera de Riberas `null`',
    turnoEnTres(proyectarRiberas(estado, 'A')) === COLORES_EN_3D[0] &&
      turnoEnTres(vistaConTurnoDeB) === COLORES_EN_3D[1] &&
      turnoEnTres(proyectarRiberas(estado, 'A')) === colorDePiezaDelColono(0) &&
      turnoEnTres({ desde: 'otro' }) === null,
    { enElDeA: turnoEnTres(proyectarRiberas(estado, 'A')), enElDeB: turnoEnTres(vistaConTurnoDeB) },
  );

  const mio = marcador?.colonos.find((c) => c.asiento === 'A');
  const otro = marcador?.colonos.find((c) => c.asiento === 'B');
  comprobar('el mío se marca como mío, y el de otro no', mio?.soyYo === true && otro?.soyYo === false);
  comprobar(
    'MIS PUNTOS CON LO OCULTO DENTRO son más que los públicos: llevo un título sin revelar',
    mio !== undefined && mio.puntosConLoOculto !== null && mio.puntosConLoOculto > mio.puntos,
    { publicos: mio?.puntos, mios: mio?.puntosConLoOculto },
  );
  comprobar(
    'y de los demás no se sabe: `null`, no los públicos otra vez',
    otro?.puntosConLoOculto === null,
    otro?.puntosConLoOculto,
  );
  comprobar('cuántas cartas guarda cada uno sí es público', mio?.cartas === 2 && otro?.cartas === 1 && marcador?.colonos[2]?.cartas === 0);
  comprobar('y cuántas guardias ha jugado también', mio?.guardias === 3 && otro?.guardias === 1);
  comprobar('con tres jugadas y más que nadie, La Mayor Guardia es de A', marcador?.mayorGuardia === 'A' && mio?.tieneLaMayorGuardia === true && otro?.tieneLaMayorGuardia === false);
  comprobar('el Vado Largo sigue vacante, y vacante es `null`', marcador?.vado === null && marcador?.colonos.every((c) => !c.tieneElVado) === true);

  /*
   * ── CUÁNTO MIDE LA CADENA DE CADA UNO, QUE ES LO QUE NO SE DECÍA ──
   *
   * `ColonoVisto.vado` lo publica `proyectarRiberas` desde que el premio existe y no lo
   * pintaba NADIE. Eso era la otra mitad del fallo de Miguel: sin premio y sin una cifra
   * que dijera cuánto contaba el juego, no había manera de saber si faltaban veredas o si
   * el vecino le estaba cortando el paso. Vacante o no, el número sale para TODOS —es la
   * carrera lo que se juega—, y el mínimo viene de la regla y no de un cinco escrito a mano.
   */
  comprobar('el marcador trae el largo de la cadena de cada colono, con una vereda cada uno', marcador?.colonos.every((c) => c.vado === 1) === true, marcador?.colonos.map((c) => c.vado));
  comprobar('y dice cuántas hacen falta, sacándolo de la regla y no de un número escrito a mano', marcador?.vadoMinimo === VADO_MINIMO && (marcador?.vadoMinimo ?? 0) > 1);
  comprobar('quedan las cartas del mazo que dice la vista', marcador?.mazo === estado.mazo.length && (marcador?.mazo ?? 0) > 0, marcador?.mazo);
  comprobar('nadie ha revelado nada todavía', marcador?.colonos.every((c) => c.titulos.length === 0) === true);
  comprobar('y los títulos ocultos de otro no salen por ninguna parte', canonico(marcador).includes('molino') === false && canonico(marcador).includes('Molino') === false);

  /* Al revelar, el título pasa a ser público, y con su nombre de Riberas. */
  const vistaB = proyectarRiberas(estado, 'B');
  const revelarB = revelarDe(opcionesDeRiberas(vistaB, 'B'), 'c3');
  comprobar('B no tiene el turno, así que no se le ofrece revelar', revelarB === null);
  const conTurnoDeB: EstadoDeRiberas = { ...estado, turno: 1 };
  const revelarAhora = revelarDe(opcionesDeRiberas(proyectarRiberas(conTurnoDeB, 'B'), 'B'), 'c3');
  comprobar('en su turno sí', revelarAhora !== null);
  const enseñado = jugar(mesaSobre('RIB-3D-MAR', conTurnoDeB, ['A', 'B', 'C']), {
    quien: 'B',
    rev: 0,
    movimiento: { tipo: revelarAhora?.tipo ?? '', carga: revelarAhora?.carga },
  });
  const despues = marcadorEnTres(vistaEn(enseñado, 'A'));
  const bAhora = despues?.colonos.find((c) => c.asiento === 'B');
  comprobar('revelado, el título sale en el marcador de todos, con su nombre', canonico(bAhora?.titulos) === canonico(['El Molino']), bAhora?.titulos);
  comprobar('y sus puntos públicos suben, que es lo que significa revelar', (bAhora?.puntos ?? 0) > (otro?.puntos ?? 0));
  comprobar('pero sigue sin decir cuántos me quedan a mí sin revelar', despues?.colonos.find((c) => c.asiento === 'B')?.puntosConLoOculto === null);

  /*
   * ── Y UN MARCADOR CON DUEÑO DEL VADO, QUE ES EL QUE FALTABA ──
   *
   * De este premio sólo se afirmaba que estaba VACANTE, y un premio comprobado sólo vacante
   * es un premio del que no se ha comprobado nada: la mitad de las frases del marcador —el
   * dueño, su bandera, el largo de su cadena— no las tocaba ninguna comprobación. Aquí A
   * encadena las cinco y se mira lo que la pantalla va a leer.
   */
  const LA_ISLA_DEL_VADO = { q: -2, r: 0 };
  const conVado = escenarioDeMazo({
    bienes: [['limo'], ['junco'], []],
    guardias: [3, 1, 0],
    veredas: [[0, 1, 2, 3, 4].map((k) => aristaDeHex(LA_ISLA_DEL_VADO, k))],
  });
  const conPremio = marcadorEnTres(proyectarRiberas(conVado, 'A'));
  const aConVado = conPremio?.colonos.find((c) => c.asiento === 'A');
  const bSinVado = conPremio?.colonos.find((c) => c.asiento === 'B');
  comprobar('el Vado Largo tiene dueño, y es quien encadenó las cinco', conPremio?.vado === 'A' && aConVado?.tieneElVado === true, conPremio?.vado);
  comprobar('y sólo él: la bandera no se le pone a la mesa entera', conPremio?.colonos.filter((c) => c.tieneElVado).length === 1);
  comprobar('su renglón dice cuánto mide la cadena, y son las cinco del mínimo', aConVado?.vado === VADO_MINIMO, aConVado?.vado);
  comprobar('y el de al lado dice la suya, que es más corta: el número sale para todos, no sólo para el dueño', bSinVado?.vado === 1 && bSinVado?.tieneElVado === false, bSinVado?.vado);
  comprobar('con los dos puntos del premio dentro, sus puntos públicos son más que los del otro', (aConVado?.puntos ?? 0) > (bSinVado?.puntos ?? 0), { a: aConVado?.puntos, b: bSinVado?.puntos });
  comprobar('y los dos premios pueden ser de dueños distintos a la vez', conPremio?.mayorGuardia === 'A' || conPremio?.mayorGuardia === 'B');

  /*
   * ═══ LA FRASE DEL RENGLÓN NACE AQUÍ, Y SUS TRES ESTADOS ═══
   *
   * Con el escenario de arriba: A tiene el premio y B una vereda. Lo que se comprueba es
   * el TEXTO, porque el texto es lo que se lee — y lo que mintió.
   */
  if (conPremio !== null && aConVado !== undefined && bSinVado !== undefined) {
    comprobar('a quien tiene el premio se le dice «El Vado Largo» y cuánto mide, sin el «de 5» que ya pasó', renglonDelVado(aConVado, conPremio).startsWith('El Vado Largo, 5') && !renglonDelVado(aConVado, conPremio).includes(' de '), renglonDelVado(aConVado, conPremio));
    comprobar('a quien va corto se le dice cuánto lleva y cuánto hace falta: «vado 1 de 5»', renglonDelVado(bSinVado, conPremio) === `vado 1 de ${String(VADO_MINIMO)}` && estadoDelVado(bSinVado, conPremio).clase === 'corta', renglonDelVado(bSinVado, conPremio));
    comprobar('y la frase que se oye dice lo mismo, con el mínimo dentro', loQueSeOyeDelVado(bSinVado, conPremio).includes(`de las ${String(VADO_MINIMO)}`) && loQueSeOyeDelVado(aConVado, conPremio).includes('es suyo'), { b: loQueSeOyeDelVado(bSinVado, conPremio), a: loQueSeOyeDelVado(aConVado, conPremio) });
  }

  /*
   * ═══ EL EMPATE, QUE ES DONDE LA FRASE MENTÍA ═══
   *
   * `recalcularElVado` sólo mueve el premio a quien SUPERA estrictamente al dueño. O sea
   * que el segundo en llegar a cinco tiene cadena de cinco, cero puntos de premio y —con
   * la frase vieja— un renglón que decía «vado 5 de 5», que se lee como «ya está». Es la
   * misma mitad del fallo de Miguel (la pantalla que no explica por qué no hay premio)
   * escrita en la línea que se añadió para explicarlo, y ningún comprobador la miraba.
   *
   * Se monta en DOS pasos y no en uno, porque así es como pasa en la mesa: A llega antes
   * y se lleva el premio; luego B llega a lo mismo y el premio no se mueve.
   */
  const LA_ISLA_DE_B = { q: 0, r: 0 };
  const bTambienLlega: EstadoDeRiberas = {
    ...conVado,
    colonos: conVado.colonos.map((c, i) => (i === 1 ? { ...c, veredas: [0, 1, 2, 3, 4].map((k) => aristaDeHex(LA_ISLA_DE_B, k)) } : c)),
  };
  const empatado: EstadoDeRiberas = { ...bTambienLlega, vado: recalcularElVado(bTambienLlega) };
  const marcadorEmpatado = marcadorEnTres(proyectarRiberas(empatado, 'B'));
  const aQueLlegoAntes = marcadorEmpatado?.colonos.find((c) => c.asiento === 'A');
  const bQueLlegoDespues = marcadorEmpatado?.colonos.find((c) => c.asiento === 'B');
  comprobar('B llega a las cinco y el premio NO se mueve: sigue siendo de A, que llegó antes', empatado.vado.de === 'A' && bQueLlegoDespues?.vado === VADO_MINIMO && bQueLlegoDespues?.tieneElVado === false, { vado: empatado.vado, b: bQueLlegoDespues?.vado });
  if (marcadorEmpatado !== null && aQueLlegoAntes !== undefined && bQueLlegoDespues !== undefined) {
    const deB = renglonDelVado(bQueLlegoDespues, marcadorEmpatado);
    const oidoDeB = loQueSeOyeDelVado(bQueLlegoDespues, marcadorEmpatado);
    const estadoDeB = estadoDelVado(bQueLlegoDespues, marcadorEmpatado);
    comprobar('el estado de B es «llega», con A de dueño: ni corta ni premio', estadoDeB.clase === 'llega' && estadoDeB.dueño === aQueLlegoAntes, estadoDeB.clase);
    comprobar('y su renglón NO dice «vado 5 de 5»: eso se lee como «ya está», y no está', !deB.includes(`de ${String(VADO_MINIMO)}`) && !/\bde \d/.test(deB), deB);
    comprobar('dice de quién es el premio, por su nombre, y que llegó antes', deB.includes(aQueLlegoAntes.nombre) && deB.includes('llegó antes') && deB.startsWith(`vado ${String(VADO_MINIMO)}`), deB);
    comprobar('la frase que se oye tampoco dice «de las 5», y nombra al dueño', !oidoDeB.includes(`de las ${String(VADO_MINIMO)}`) && oidoDeB.includes(aQueLlegoAntes.nombre) && oidoDeB.includes('superar'), oidoDeB);
    comprobar('y a A, que lo tiene, se le sigue diciendo «El Vado Largo»', renglonDelVado(aQueLlegoAntes, marcadorEmpatado).startsWith('El Vado Largo'), renglonDelVado(aQueLlegoAntes, marcadorEmpatado));
  }

  /* Y si el dueño mide MÁS, se dice con cuánto: es lo que hay que superar. */
  const aConSeis: EstadoDeRiberas = {
    ...bTambienLlega,
    colonos: bTambienLlega.colonos.map((c, i) => (i === 0 ? { ...c, veredas: [...c.veredas, aristaDeHex(LA_ISLA_DEL_VADO, 5)] } : c)),
  };
  const conSeis: EstadoDeRiberas = { ...aConSeis, vado: recalcularElVado(aConSeis) };
  const marcadorConSeis = marcadorEnTres(proyectarRiberas(conSeis, 'B'));
  const bContraSeis = marcadorConSeis?.colonos.find((c) => c.asiento === 'B');
  comprobar(
    'con A en seis, a B se le dice «lo tiene A con 6»: la cifra que hay que superar',
    marcadorConSeis !== null && bContraSeis !== undefined && conSeis.vado.largo === VADO_MINIMO + 1 && renglonDelVado(bContraSeis, marcadorConSeis).endsWith(`con ${String(VADO_MINIMO + 1)}`),
    marcadorConSeis === null || bContraSeis === undefined ? conSeis.vado : renglonDelVado(bContraSeis, marcadorConSeis),
  );

  /*
   * Y EL EMPATE DESDE VACANTE: los dos llegan a la vez y `recalcularElVado` no se lo da a
   * ninguno. Es el único caso en que una cadena llega y no hay dueño a quien nombrar, y la
   * frase tiene que decir eso y no «de 5».
   */
  const losDosALaVez = escenarioDeMazo({
    bienes: [['limo'], ['junco'], []],
    veredas: [[0, 1, 2, 3, 4].map((k) => aristaDeHex(LA_ISLA_DEL_VADO, k)), [0, 1, 2, 3, 4].map((k) => aristaDeHex(LA_ISLA_DE_B, k))],
  });
  const marcadorVacante = marcadorEnTres(proyectarRiberas(losDosALaVez, 'A'));
  const aVacante = marcadorVacante?.colonos.find((c) => c.asiento === 'A');
  comprobar('los dos a cinco desde vacante: nadie se lo lleva, y los dos miden cinco', losDosALaVez.vado.de === null && marcadorVacante?.colonos.filter((c) => c.vado === VADO_MINIMO).length === 2, { vado: losDosALaVez.vado, largos: marcadorVacante?.colonos.map((c) => c.vado) });
  if (marcadorVacante !== null && aVacante !== undefined) {
    const deA = renglonDelVado(aVacante, marcadorVacante);
    const estadoDeA = estadoDelVado(aVacante, marcadorVacante);
    comprobar('y el renglón dice «empatado y sin dueño», no «vado 5 de 5»', deA === `vado ${String(VADO_MINIMO)}, empatado y sin dueño` && estadoDeA.clase === 'llega' && estadoDeA.dueño === null, deA);
    comprobar('y la frase que se oye dice que el premio queda sin dueño hasta que alguien supere', loQueSeOyeDelVado(aVacante, marcadorVacante).includes('sin dueño') && loQueSeOyeDelVado(aVacante, marcadorVacante).includes('supere'), loQueSeOyeDelVado(aVacante, marcadorVacante));
  }
}

/* ═══ 9. LAS NUEVE CARAS SON LAS DE LA ESCENA, Y NI UNA MÁS ═══ */
{
  const caras = CLASES_DE_CARTA.map((clase) => ({ clase, cara: retratoDeLaCarta(clase) }));
  comprobar('las nueve clases del juego tienen cara', caras.every((c) => c.cara !== null), caras.filter((c) => c.cara === null).map((c) => c.clase));
  comprobar('y son nueve, ni una de más', CLASES_DE_CARTA.length === 9);
  comprobar('una clase que no existe no tiene cara: `null`, no una inventada', retratoDeLaCarta('la-carta-que-no-esta') === null && retratoDeLaCarta('') === null);

  comprobar(
    'cada familia es una de las que la escena reparte',
    caras.every((c) => ORDEN_DE_LAS_FAMILIAS.includes(c.cara?.familia ?? '')),
    caras.map((c) => c.cara?.familia),
  );
  comprobar(
    'los cinco títulos van a la familia de los títulos, y nadie más',
    caras.every((c) => (c.cara?.familia === FAMILIA_DE_LOS_TITULOS) === esTitulo(c.clase)),
    caras.map((c) => [c.clase, c.cara?.familia]),
  );
  comprobar('y son cinco', caras.filter((c) => c.cara?.familia === FAMILIA_DE_LOS_TITULOS).length === 5);

  /*
   * CADA DIBUJO EXISTE DE VERDAD. Un `dibujo` que no esté en `CONTORNOS_DE_LA_CARTA`
   * no revienta nada: sale un naipe con su color y su nombre y sin icono, que es
   * exactamente el fallo que nadie mira dos veces.
   */
  const contornos = Object.keys(CONTORNOS_DE_LA_CARTA);
  comprobar('los nueve dibujos existen en los iconos de la escena', caras.every((c) => contornos.includes(c.cara?.dibujo ?? '')), { pide: caras.map((c) => c.cara?.dibujo), hay: contornos });
  comprobar('y son nueve distintos: ninguna clase toma prestado el dibujo de otra', new Set(caras.map((c) => c.cara?.dibujo)).size === 9);
  comprobar('los nombres se leen y no se repiten', new Set(caras.map((c) => c.cara?.nombre)).size === 9 && caras.every((c) => (c.cara?.nombre ?? '').length > 2));
  comprobar('y están en la voz del juego', canonico(caras.map((c) => c.cara?.nombre)).includes('La Guardia') && canonico(caras.map((c) => c.cara?.nombre)).includes('El Faro'));
}

/* ═══ 9 BIS. LOS ONCE NAIPES SE EXPLICAN, Y EL TEXTO NO SE DESPEGA DE LA REGLA ═══ */
/*
 * QUÉ SE ARREGLA AQUÍ, EN UNA FRASE DE MIGUEL: «los usuarios no saben qué hace cada
 * carta, qué consiguen, ni cómo la tienen que usar».
 *
 * Hasta hoy la única explicación de una carta era la `ayuda` de su OPCIÓN, y tenía tres
 * agujeros: sólo existe si la carta se puede jugar AHORA —o sea que la carta que acabas
 * de comprar, que es justo la que no conoces, se dibuja apagada y muda—, está escrita para
 * la jugada y no para la carta, y los DOS PREMIOS no tienen opción ninguna y por tanto no
 * tienen ayuda ninguna. Son once naipes en la misma mano, no nueve.
 *
 * Este bloque es la fase 1 de `docs/LAS-CARTAS-SE-EXPLICAN.md`: el texto existe, viaja
 * dentro del naipe y está vigilado. Todavía no se ve en ninguna pantalla.
 */
{
  /* ── EL PRESUPUESTO NO SE ESCRIBE A MANO: SE LE PREGUNTA A LA ESCENA ──
   *
   * El cartel de la fase 3 va al pie del lienzo, en la banda que queda entre la mano de
   * cartas y la mano de bienes, y el lienzo más estrecho de los quince de `verify:escena`
   * (320×360, un móvil con el lienzo al mínimo) es el que decide cuántas letras entran en
   * un renglón. La banda se mide con `franjaDeLasCartas` y `huecosDeLaBaraja` de VERDAD,
   * con la mano de bienes quieta —legítimo: mientras hay cartel hay un naipe cogido, y
   * coger un naipe suelta el bien—, y de ahí sale el ancho.
   *
   * La aritmética entera, para que quien la toque sepa qué pantalla está gastando:
   * doce puntos de margen por lado; el cuerpo de `.opcion-ayuda` es `0.82rem` y LA RAÍZ DE
   * ESTA CASA VALE 17 PUNTOS —`estilo.css` abre con `html { font-size: 106.25%; }`, y su
   * cabecera dice que son «los 17 px de siempre»—, o sea 13,94; y el ancho por letra es el
   * 0,6 del cuerpo, que es el único ancho de letra que la casa tiene escrito
   * (`tamanoDeTexto`, `app/src/arcade/retablo.tsx`).
   *
   * Este número salió 27 cuando se dio por hecho que el rem valía 16, y con 27 una frase
   * de 51 caracteres parecía caber en dos renglones cuando ocupa tres. Un comprobador con
   * el ancho equivocado es un comprobador verde que no vigila nada.
   */
  const LIENZO_PEOR = { ancho: 320, alto: 360 };
  const PROP_PEOR = LIENZO_PEOR.ancho / LIENZO_PEOR.alto;
  const MARGEN_DEL_CARTEL = 12;
  const RAIZ_DE_LA_CASA = 17;
  const CUERPO_DE_LA_AYUDA = 0.82 * RAIZ_DE_LA_CASA;
  const ANCHO_POR_LETRA = CUERPO_DE_LA_AYUDA * 0.6;
  const RENGLONES_DE_UNA_FRASE = 2;

  const laBandaLibre = ((): number => {
    const visto = loQueSeVeEnLasCartas(CAMPO_DE_LA_BARRA, PROP_PEOR);
    const franja = franjaDeLasCartas(CAMPO_DE_LA_BARRA, PROP_PEOR);
    const enPuntos = (x: number, ancho: number): number => ((x + ancho / 2) / ancho) * LIENZO_PEOR.ancho;
    const vistoBienes = loQueSeVeEnLaBaraja(CAMPO_DE_LA_BARRA, PROP_PEOR);
    const manoDeBienes = Array.from({ length: 14 }, (_, i) => ({
      id: `b${String(i)}`,
      bien: (BIENES[i % BIENES.length] ?? 'limo') as string,
    }));
    const bienes = huecosDeLaBaraja(manoDeBienes, CAMPO_DE_LA_BARRA, PROP_PEOR, null);
    const cantoDeLosBienes = Math.min(...bienes.map((c) => c.hueco.x - c.hueco.ancho / 2));
    return enPuntos(cantoDeLosBienes, vistoBienes.ancho) - enPuntos(franja.derecha, visto.ancho);
  })();
  const LETRAS_POR_LINEA = Math.floor((laBandaLibre - 2 * MARGEN_DEL_CARTEL) / ANCHO_POR_LETRA);
  comprobar(
    'la banda del pie del lienzo peor se mide con la escena y da sitio para leer: veinticinco letras por renglón',
    laBandaLibre > 200 && LETRAS_POR_LINEA === 25,
    { banda: Number(laBandaLibre.toFixed(1)), letras: LETRAS_POR_LINEA, anchoPorLetra: Number(ANCHO_POR_LETRA.toFixed(2)) },
  );

  /** Envolver con avaricia, que es como envuelve un párrafo: cuántos renglones ocupa. */
  const renglonesDe = (frase: string): number => {
    let lineas = 1;
    let usado = 0;
    for (const palabra of frase.split(' ')) {
      if (palabra.length > LETRAS_POR_LINEA) return Number.POSITIVE_INFINITY;
      if (usado === 0) usado = palabra.length;
      else if (usado + 1 + palabra.length <= LETRAS_POR_LINEA) usado += 1 + palabra.length;
      else {
        lineas++;
        usado = palabra.length;
      }
    }
    return lineas;
  };

  /* ── LOS ONCE NAIPES, POR LAS DOS PUERTAS POR LAS QUE LLEGAN A LA MANO ── */
  const LA_ISLA_DEL_VADO = { q: -2, r: 0 };
  const CADENA_DE_CINCO = [0, 1, 2, 3, 4].map((k) => aristaDeHex(LA_ISLA_DEL_VADO, k));
  const conLosDosPremios = escenarioDeMazo({
    bienes: [['limo'], ['junco'], ['sal']],
    guardias: [GUARDIA_MINIMA, 0, 0],
    veredas: [CADENA_DE_CINCO],
  });
  const vistaDelDueno = proyectarRiberas(conLosDosPremios, 'A');
  const losDosPremios = premiosEnTres(vistaDelDueno, 'A');
  comprobar(
    'A tiene LOS DOS premios en la mano, o lo de abajo no miraría los naipes que nadie explica',
    losDosPremios.length === 2 && conLosDosPremios.vado.de === 'A' && conLosDosPremios.guardia.de === 'A',
    { premios: losDosPremios.map((p) => p.nombre), vado: conLosDosPremios.vado.de, guardia: conLosDosPremios.guardia.de },
  );

  const losNueveJuegos = CLASES_DE_CARTA.map((clase) => ({ clase, texto: retratoDeLaCarta(clase)?.explicacion }));
  const lasVeintiuna = [
    ...losNueveJuegos.map((j) => j.texto),
    ...losDosPremios.map((p) => p.explicacion),
  ];

  /* 1. LAS ONCE FILAS ESTÁN Y NINGUNA ESTÁ VACÍA.
   *
   * El compilador ya exige las nueve filas por el `Record<ClaseDeCarta, …>`; lo que el
   * compilador no mira es que una frase esté en blanco, y una carta sin texto es la que
   * nadie mira hasta que un jugador la compra. */
  comprobar(
    'las nueve clases y los dos premios traen sus tres frases, y ninguna en blanco',
    lasVeintiuna.length === 11 &&
      lasVeintiuna.every((t) => (t?.hace ?? '').trim().length > 0 && (t?.consigues ?? '').trim().length > 0 && (t?.usas ?? '').trim().length > 0),
    lasVeintiuna.map((t) => [t?.hace.length, t?.consigues.length, t?.usas.length]),
  );

  /* 3. NINGUNA SE REPITE DONDE NO DEBE, Y LOS CINCO TÍTULOS SÍ COMPARTEN.
   *
   * Que los cinco títulos digan lo mismo se AFIRMA, no se tolera: lo dice la cabecera de
   * `ClaseDeCarta` («cuestan lo mismo, valen lo mismo y hacen lo mismo»), y si un día un
   * título deja de compartirlo será porque alguien lo decidió y tuvo que tirar esta línea. */
  const delTitulo = canonico(retratoDeLaCarta('faro')?.explicacion);
  comprobar(
    'los cinco títulos comparten palabra por palabra sus tres frases',
    losNueveJuegos.filter((j) => esTitulo(j.clase)).every((j) => canonico(j.texto) === delTitulo) &&
      losNueveJuegos.filter((j) => esTitulo(j.clase)).length === 5,
    losNueveJuegos.filter((j) => esTitulo(j.clase)).map((j) => j.clase),
  );
  /*
   * ═══ Y CADA JUEGO DE FRASES VIAJA CON EL NOMBRE DE SU NAIPE ═══
   *
   * No es adorno para los detalles de un fallo: las redes de números de más abajo dejaban
   * de valer justamente por perder este dato. Con las veintiuna frases en un montón sin
   * dueño, «tres» estaba permitido en cualquiera de ellas porque `GUARDIA_MINIMA` vale
   * tres, y «cinco» en cualquiera porque `VADO_MINIMO` vale cinco. Un permiso que se
   * concede a todo el mundo no vigila a nadie.
   */
  const losSieteConNombre: Array<[string, ExplicacionDeLaCarta | undefined]> = [
    ...losNueveJuegos.filter((j) => !esTitulo(j.clase)).map((j): [string, ExplicacionDeLaCarta | undefined] => [retratoDeLaCarta(j.clase)?.nombre ?? j.clase, j.texto]),
    ['los títulos', retratoDeLaCarta('faro')?.explicacion],
    ...losDosPremios.map((p): [string, ExplicacionDeLaCarta | undefined] => [p.nombre, p.explicacion]),
  ];
  const losSieteJuegos = losSieteConNombre.map(([, texto]) => texto);
  comprobar(
    'y los siete juegos de frases —las cuatro que se juegan, el de los títulos y los dos premios— son distintos entre sí',
    losSieteJuegos.length === 7 && new Set(losSieteJuegos.map((t) => canonico(t))).size === 7,
    losSieteJuegos.map((t) => t?.hace),
  );

  /* 4. EL PRESUPUESTO SE CUMPLE, Y SE CUENTA EN RENGLONES.
   *
   * El tope viejo era de caracteres —145 las tres juntas— y dejó pasar dos frases que
   * ocupaban TRES renglones: una de 52 y otra de 51, las dos cómodas dentro del tope. Un
   * tope en caracteres no ve dónde cae el corte. El de 46 caracteres se conserva como
   * segunda red y no como la principal. */
  const lasVeintiunaConNaipe: Array<[string, 'hace' | 'consigues' | 'usas', string]> = losSieteConNombre.flatMap(
    ([naipe, t]): Array<[string, 'hace' | 'consigues' | 'usas', string]> => [
      [naipe, 'hace', t?.hace ?? ''],
      [naipe, 'consigues', t?.consigues ?? ''],
      [naipe, 'usas', t?.usas ?? ''],
    ],
  );
  const todasLasFrases = lasVeintiunaConNaipe.map(([, , frase]) => frase);
  const gordas = todasLasFrases.filter((f) => renglonesDe(f) > RENGLONES_DE_UNA_FRASE);
  comprobar(
    'las veintiuna frases caben en dos renglones del lienzo peor: se enseñan enteras o no se enseñan',
    todasLasFrases.length === 21 && gordas.length === 0,
    gordas.map((f) => `${f} (${String(renglonesDe(f))} renglones)`),
  );
  const largas = todasLasFrases.filter((f) => f.length > 46);
  comprobar('y ninguna pasa de 46 caracteres, que es la red de debajo', largas.length === 0, largas);

  /* LOS NÚMEROS SALEN DE LAS CONSTANTES Y NO DE LOS DEDOS DE NADIE.
   *
   * Se afirma leyendo la fuente, porque desde fuera una frase compuesta con plantilla y
   * una escrita a mano se leen igual — y es el día que alguien toque la constante cuando
   * se nota la diferencia.
   *
   * ═══ Y SE LEE EL CÓDIGO, NO LOS COMENTARIOS, PORQUE SI NO NO MIRA NADA ═══
   *
   * Escrito sobre el fichero entero, esta comprobación se quedaba VERDE con la frase
   * cambiada a mano: la cabecera de `EXPLICACION_DEL_TITULO` cita `${VEREDAS_DE_LA_CARTA}`
   * como ejemplo, y el `includes` la encontraba ahí. Se vio rompiéndola a propósito. Un
   * comprobador que se conforma con una cita en un comentario es un comprobador verde que
   * vigila la prosa: el mismo filtro roto que ya está escrito en la memoria de esta casa.
   * Por eso se quitan las líneas de comentario primero, igual que hace `soloCodigo` en el
   * último bloque de este fichero. */
  {
    const fuente = readFileSync(new URL('../../shared/arcade/juegos/riberas-en-tres.ts', import.meta.url), 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
      .join('\n');
    const conPlantilla: Array<[string, string]> = [
      ['BIENES_DEL_ANO_BUENO', 'El Año Bueno'],
      ['VEREDAS_DE_LA_CARTA', 'Las Dos Veredas'],
      ['PUNTOS_DEL_TITULO', 'los títulos'],
      ['VADO_MINIMO', 'El Vado Largo'],
      ['PUNTOS_DEL_VADO', 'El Vado Largo'],
      ['GUARDIA_MINIMA', 'La Mayor Guardia'],
      ['PUNTOS_DE_LA_GUARDIA', 'La Mayor Guardia'],
    ];
    const sinPlantilla = conPlantilla.filter(([constante]) => !fuente.includes(`\${${constante}}`));
    comprobar(
      'las siete cifras de las frases entran por plantilla desde `riberas.ts`: el día que una constante cambie, cambia el texto',
      sinPlantilla.length === 0,
      sinPlantilla.map(([constante, naipe]) => `${constante} (${naipe})`),
    );
    /*
     * ═══ LAS CIFRAS QUE SE LEEN SON LAS DE SU NAIPE, Y NINGUNA OTRA ═══
     *
     * El tope de antes eximía a mano las dos frases de premio (`/^(2 puntos|1 punto)/`), o
     * sea que el DOS y el UNO de los premios eran precisamente los dos números que nadie
     * miraba. Se quitó la exención y se puso en su sitio el juego entero de las siete
     * constantes —y eso autorizaba de más por el otro lado—: con un solo montón de valores,
     * el 3 de `GUARDIA_MINIMA` daba permiso para escribir un 3 en cualquiera de las
     * veintiuna frases, también en las que no hablan de guardias. Un permiso que vale para
     * todos los naipes no vigila ninguno.
     *
     * Así que cada naipe trae LAS SUYAS y ninguna más. Esta tabla es la parte que hay que
     * mantener a mano —qué regla nombra cada naipe es una decisión y no se deduce de nada—,
     * y por eso se afirma además que está completa: un naipe nuevo sin fila aquí pone esto
     * rojo en vez de colarse con permiso para escribir cualquier número.
     */
    const CONSTANTES_DEL_NAIPE: ReadonlyArray<[string, readonly number[]]> = [
      ['La Guardia', []],
      ['El Año Bueno', [BIENES_DEL_ANO_BUENO]],
      ['El Acaparamiento', []],
      ['Las Dos Veredas', [VEREDAS_DE_LA_CARTA]],
      ['los títulos', [PUNTOS_DEL_TITULO]],
      ['El Vado Largo', [VADO_MINIMO, PUNTOS_DEL_VADO]],
      ['La Mayor Guardia', [GUARDIA_MINIMA, PUNTOS_DE_LA_GUARDIA]],
    ];
    const susNumeros = new Map<string, readonly number[]>(CONSTANTES_DEL_NAIPE);
    const sinFila = losSieteConNombre.map(([naipe]) => naipe).filter((naipe) => !susNumeros.has(naipe));
    comprobar(
      'la tabla de qué números puede nombrar cada naipe cubre los siete y ni uno más: un naipe nuevo sin fila no hereda el permiso de otro',
      susNumeros.size === 7 && sinFila.length === 0,
      { sinFila, filas: [...susNumeros.keys()] },
    );
    const cifrasAjenas = lasVeintiunaConNaipe.flatMap(([naipe, campo, f]) => {
      const suyas = new Set((susNumeros.get(naipe) ?? []).map((n) => String(n)));
      return (f.match(/\d+/g) ?? []).filter((c) => !suyas.has(c)).map((c) => `${c} en ${naipe}.${campo}: «${f}»`);
    });
    comprobar(
      'y las cifras que se leen en cada frase son las de las constantes de SU naipe, sin una sola exención escrita a mano',
      cifrasAjenas.length === 0,
      cifrasAjenas,
    );

    /*
     * ═══ Y LOS NÚMEROS ESCRITOS CON LETRAS, IGUAL: ÉSA ERA LA MITAD QUE NADIE VIGILABA ═══
     *
     * «Dos bienes que no le quitas a nadie» y «Dos pasos del Vado Largo» llevaban el dos a
     * mano, y las concordancias («Vale 1 punto», «2 puntos») también. La cabecera prometía
     * «el día que una constante cambie, cambia el texto» y eso sólo cubría la cifra: un
     * `VEREDAS_DE_LA_CARTA` a tres dejaba «Abres 3 veredas» y «Dos pasos» peleándose dentro
     * del MISMO naipe, las dos frases perfectamente legibles.
     *
     * Se compone con las mismas funciones que compone el texto (`cardinal` y `plural`,
     * importadas de donde viven) y se exige la pareja entera: la palabra Y el nombre que
     * concuerda. Cambiar una constante sin tocar la frase pone ROJO su naipe, que es
     * exactamente lo que se pide de esto.
     */
    /*
     * ═══ Y LAS DOS FUNCIONES SE PINCHAN CONTRA PALABRAS ESCRITAS A MANO ═══
     *
     * Las parejas de aquí abajo se COMPONEN con `cardinal` y `plural`, o sea con las mismas
     * dos funciones con que se compone el texto que van a juzgar. Las dos orillas de la
     * afirmación salían del mismo sitio: el día que `cardinal(2)` devolviera otra palabra, el
     * naipe cambiaría, la expectativa cambiaría con él y esto seguiría verde. Una
     * comprobación cuyas dos mitades comparten fuente no mira nada.
     *
     * Así que la TABLA se clava aquí, con las palabras escritas a mano en este fichero y una
     * sola vez. Con el clavo puesto, lo de abajo sí compra algo: tocar `CARDINALES` o
     * `plural` pone rojo este renglón antes de que nadie mire una frase.
     */
    const LA_TABLA_A_MANO: ReadonlyArray<[number, string]> = [
      [0, 'cero'],
      [1, 'un'],
      [2, 'dos'],
      [3, 'tres'],
      [4, 'cuatro'],
      [5, 'cinco'],
    ];
    const malDichos = LA_TABLA_A_MANO.filter(([n, palabra]) => cardinal(n) !== palabra);
    comprobar(
      'la tabla de cardinales dice cero, un, dos, tres, cuatro y cinco —escrito a mano aquí— y el plural concuerda: sin este clavo, lo de abajo se compone consigo mismo',
      malDichos.length === 0 &&
        plural(1, 'punto', 'puntos') === 'punto' &&
        plural(2, 'punto', 'puntos') === 'puntos' &&
        plural(0, 'punto', 'puntos') === 'puntos' &&
        enCabeza('dos') === 'Dos',
      {
        malDichos: malDichos.map(([n, palabra]) => `cardinal(${String(n)}) da «${cardinal(n)}» y no «${palabra}»`),
        uno: plural(1, 'punto', 'puntos'),
        dos: plural(2, 'punto', 'puntos'),
        cero: plural(0, 'punto', 'puntos'),
        enCabeza: enCabeza('dos'),
      },
    );
    const lasParejas: Array<[string, string, string]> = [
      ['El Año Bueno', 'consigues', `${cardinal(BIENES_DEL_ANO_BUENO).charAt(0).toUpperCase()}${cardinal(BIENES_DEL_ANO_BUENO).slice(1)} ${plural(BIENES_DEL_ANO_BUENO, 'bien', 'bienes')}`],
      ['El Año Bueno', 'hace', `${String(BIENES_DEL_ANO_BUENO)} ${plural(BIENES_DEL_ANO_BUENO, 'bien', 'bienes')}`],
      ['Las Dos Veredas', 'consigues', `${cardinal(VEREDAS_DE_LA_CARTA).charAt(0).toUpperCase()}${cardinal(VEREDAS_DE_LA_CARTA).slice(1)} ${plural(VEREDAS_DE_LA_CARTA, 'paso', 'pasos')}`],
      ['Las Dos Veredas', 'hace', `${String(VEREDAS_DE_LA_CARTA)} ${plural(VEREDAS_DE_LA_CARTA, 'vereda', 'veredas')}`],
      ['los títulos', 'hace', `${String(PUNTOS_DEL_TITULO)} ${plural(PUNTOS_DEL_TITULO, 'punto', 'puntos')}`],
      ['El Vado Largo', 'consigues', `${String(PUNTOS_DEL_VADO)} ${plural(PUNTOS_DEL_VADO, 'punto', 'puntos')}`],
      ['La Mayor Guardia', 'consigues', `${String(PUNTOS_DE_LA_GUARDIA)} ${plural(PUNTOS_DE_LA_GUARDIA, 'punto', 'puntos')}`],
    ];
    const porNombre = new Map<string, { readonly hace: string; readonly consigues: string; readonly usas: string } | undefined>([
      ['El Año Bueno', retratoDeLaCarta('ano-bueno')?.explicacion],
      ['Las Dos Veredas', retratoDeLaCarta('dos-veredas')?.explicacion],
      ['los títulos', retratoDeLaCarta('faro')?.explicacion],
      ['El Vado Largo', losDosPremios.find((p) => p.nombre === 'El Vado Largo')?.explicacion],
      ['La Mayor Guardia', losDosPremios.find((p) => p.nombre === 'La Mayor Guardia')?.explicacion],
    ]);
    /*
     * SE MIRA LA PALABRA ENTERA Y NO UN TROZO. Con un `includes` a secas, «1 puntos»
     * escrito a mano pasaba en verde por llevar «1 punto» dentro, y ése es exactamente el
     * fallo de concordancia que esto viene a cazar. Se vio fallando así antes de cerrarlo.
     */
    const dicheEntero = (donde: string, dice: string): boolean =>
      new RegExp(`(^|[^0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ])${dice}([^0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]|$)`).test(donde);
    const sinConcordar = lasParejas.filter(([naipe, campo, dice]) => !dicheEntero(porNombre.get(naipe)?.[campo as 'hace' | 'consigues'] ?? '', dice));
    comprobar(
      'la palabra del número y el plural que la acompaña también salen de la constante: cambiarla pone rojo el texto que la nombra con letras',
      sinConcordar.length === 0 && porNombre.size === 5 && [...porNombre.values()].every((e) => e !== undefined),
      sinConcordar.map(([naipe, campo, dice]) => `${naipe}.${campo} no dice «${dice}»: «${String(porNombre.get(naipe)?.[campo as 'hace' | 'consigues'])}»`),
    );

    /*
     * Y LA RED DE DEBAJO: ningún cardinal escrito de dos para arriba que no valga lo que
     * vale una constante. Las parejas de arriba vigilan los cuatro sitios donde HOY hay un
     * número con letras; esto vigila el sitio donde alguien escriba el quinto.
     */
    const CARDINALES_ESCRITOS: readonly string[] = ['dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];
    const cardinalesAjenos = lasVeintiunaConNaipe.flatMap(([naipe, campo, f]) => {
      const suyos = new Set((susNumeros.get(naipe) ?? []).map((n) => cardinal(n)));
      return CARDINALES_ESCRITOS.filter(
        (c) => new RegExp(`(^|[^a-záéíóúñ])${c}([^a-záéíóúñ]|$)`, 'i').test(f) && !suyos.has(c),
      ).map((c) => `${c} en ${naipe}.${campo}: «${f}»`);
    });
    comprobar(
      'y ningún número escrito con letras que no valga lo que vale una constante DE ESE NAIPE: el quinto que alguien escriba a mano se ve aquí',
      cardinalesAjenos.length === 0,
      cardinalesAjenos,
    );
  }

  /* 5. NO SE DICE DOS VECES LO MISMO.
   *
   * Esta casa ya tropezó con eso: el `title` de `formulario.tsx` repetía la ayuda como
   * descripción y se fue entero por «dos lecturas de la misma frase por botón». Así que
   * ninguna de las veintiuna puede coincidir BYTE A BYTE con una `ayuda` del mazo o de
   * revelar. Se recogen de una mesa de verdad, con las cuatro clases jugables y un título
   * en la mano y con qué comprar, no de una lista escrita aquí. */
  {
    const conLasCuatro = escenarioDeMazo({
      bienes: [['sal', 'piedra', 'grano'], ['limo'], ['junco']],
      manos: [
        [
          { carta: 'c1:guardia', comprada: 0 },
          { carta: 'c2:ano-bueno', comprada: 0 },
          { carta: 'c3:acaparamiento', comprada: 0 },
          { carta: 'c4:dos-veredas', comprada: 0 },
          { carta: 'c5:faro', comprada: 0 },
        ],
        [],
        [],
      ],
    });
    const suyas = opcionesEn(mesaSobre('RIB-3D-AYUDAS', conLasCuatro, [...TRES]), 'A');
    const delMazo = suyas.filter((o) => TIPOS_QUE_PINTA_LA_MANO.includes(o.tipo) || o.tipo === COMPRAR);
    const clasesOfrecidas = new Set(delMazo.map((o) => o.tipo));
    comprobar(
      'la mesa ofrece las cuatro clases jugables, revelar y comprar, o esto no compararía nada',
      [GUARDIA, ANO_BUENO, ACAPARAMIENTO, DOS_VEREDAS, REVELAR, COMPRAR].every((t) => clasesOfrecidas.has(t)),
      [...clasesOfrecidas],
    );
    const ayudas = new Set(delMazo.map((o) => o.ayuda ?? ''));
    const repetidas = todasLasFrases.filter((f) => ayudas.has(f));
    comprobar(
      'ninguna de las veintiuna frases repite byte a byte una `ayuda` del mazo: no se lee dos veces lo mismo',
      repetidas.length === 0,
      repetidas,
    );
  }

  /* ── 6. LA VACUNA DE LA GUARDIA: SE LE PREGUNTA AL JUEGO, Y NO A UN CALENDARIO ──
   *
   * Es la comprobación más importante de este encargo, y está atada a una FASE y no a una
   * fecha. Hoy una guardia sólo se puede jugar después de tirar —`jugarLaGuardia` empieza
   * con `if (yo < 0 || !estado.tirado)`, y `opcionesDeRiberas` antes de tirar se va por su
   * `return` con TIRAR y revelar y nada más—, así que su frase dice «Tras tirar».
   *
   * Con el estiaje, Miguel pidió por escrito que la guardia se pueda jugar «incluso antes
   * de lanzar los dados». El día que la fase 3 de `docs/EL-LADRON-DE-RIBERAS.md` («La
   * guardia mueve») quite ese `!estado.tirado`, esta comprobación se pone ROJA — y eso es
   * lo que tiene que pasar. Ponerla verde otra vez es cambiar la fila de `RETRATO_DE_LA_CARTA`
   * por las tres frases del estiaje. Sin ella, la regla cambiaría y el cartel seguiría
   * explicando la de antes con toda la batería en verde, que es la clase de fallo que este
   * repositorio tiene escrita como la peor. */
  {
    const conGuardiaVieja = escenarioDeMazo({
      bienes: [['limo'], ['junco'], ['sal']],
      manos: [[{ carta: 'c1:guardia', comprada: 0 }], [], []],
    });
    const antesDeTirar: EstadoDeRiberas = { ...conGuardiaVieja, tirado: false };
    const guardiasAntes = opcionesEn(mesaSobre('RIB-3D-VAC-1', antesDeTirar, [...TRES]), 'A').filter((o) => o.tipo === GUARDIA);
    const guardiasDespues = opcionesEn(mesaSobre('RIB-3D-VAC-2', conGuardiaVieja, [...TRES]), 'A').filter((o) => o.tipo === GUARDIA);

    /* EL ESCENARIO TIENE QUE VALER: con los dados ya tirados la guardia SÍ se ofrece. Sin
     * esta línea, una guardia que no se ofreciera nunca —mano vacía, víctimas sin bienes,
     * carta comprada hoy— dejaría la vacuna verde sin haber preguntado nada. */
    comprobar(
      'la guardia de la mano se ofrece DESPUÉS de tirar, o la vacuna de abajo no estaría preguntando por la regla',
      guardiasDespues.length > 0 && antesDeTirar.turno === 0 && antesDeTirar.tirado === false,
      { despues: guardiasDespues.length, turno: antesDeTirar.turno },
    );

    const laOfreceAntesDeTirar = guardiasAntes.length > 0;
    const suUsas = retratoDeLaCarta('guardia')?.explicacion.usas ?? '';
    comprobar(
      'el texto de la guardia dice «Tras tirar» si y sólo si el juego no la ofrece antes de tirar: el día que la fase del estiaje le dé la vuelta, esto se pone rojo',
      suUsas.startsWith('Tras tirar') === !laOfreceAntesDeTirar,
      { ofreceAntesDeTirar: laOfreceAntesDeTirar, usas: suUsas },
    );
    comprobar(
      'y su «qué hace» cuenta la regla de hoy: roba, y no mueve nada por el tablero',
      (retratoDeLaCarta('guardia')?.explicacion.hace ?? '').includes('quitas') && !canonico(retratoDeLaCarta('guardia')?.explicacion).includes('estiaje'),
      retratoDeLaCarta('guardia')?.explicacion,
    );

    /*
     * ═══ 6 bis. LAS OTRAS DOS PUERTAS, PREGUNTADAS IGUAL QUE LA PRIMERA ═══
     *
     * «Tras tirar» era UNA de las tres condiciones de `sePuedeJugarLaCarta` y la frase la
     * decía como si fueran todas. Las otras dos (una carta al turno, y nunca la comprada
     * hoy) se preguntan aquí de la misma manera: sobre una mesa de verdad, mirando si el
     * juego ofrece la jugada, y exigiendo que la frase las diga si y sólo si el juego las
     * impone. El día que el §1.4 o el §1.5 cambien, esto se pone rojo y volverlo verde es
     * reescribir `USAS_DE_LA_JUGADA`.
     *
     * La ironía que hace grave esto: el naipe que un recién llegado mira primero es el que
     * acaba de comprar, o sea justo el único que el texto le explicaba cómo jugar y el
     * juego no le dejaba.
     */
    const laDeHoy = escenarioDeMazo({
      bienes: [['limo'], ['junco'], ['sal']],
      manos: [[{ carta: 'c1:acaparamiento', comprada: 1 }], [], []],
    });
    const ofreceLaDeHoy = opcionesEn(mesaSobre('RIB-3D-VAC-3', laDeHoy, [...TRES]), 'A').some((o) => o.tipo === ACAPARAMIENTO);
    const laDeAyer = escenarioDeMazo({
      bienes: [['limo'], ['junco'], ['sal']],
      manos: [[{ carta: 'c1:acaparamiento', comprada: 0 }], [], []],
    });
    const ofreceLaDeAyer = opcionesEn(mesaSobre('RIB-3D-VAC-4', laDeAyer, [...TRES]), 'A').some((o) => o.tipo === ACAPARAMIENTO);
    comprobar(
      'el escenario vale: la MISMA carta se ofrece comprada ayer y no comprada hoy, o lo de abajo no estaría preguntando por la regla',
      ofreceLaDeAyer && !ofreceLaDeHoy && laDeHoy.turnosAbiertos === 1,
      { deAyer: ofreceLaDeAyer, deHoy: ofreceLaDeHoy, turnosAbiertos: laDeHoy.turnosAbiertos },
    );
    const conOtraYaJugada = escenarioDeMazo({
      bienes: [['limo'], ['junco'], ['sal']],
      manos: [[{ carta: 'c1:acaparamiento', comprada: 0 }], [], []],
    });
    const ofreceLaSegunda = opcionesEn(
      mesaSobre('RIB-3D-VAC-5', { ...conOtraYaJugada, cartaJugada: true }, [...TRES]),
      'A',
    ).some((o) => o.tipo === ACAPARAMIENTO);
    comprobar(
      'y con una carta ya jugada este turno la segunda no se ofrece: la regla de «una al turno» existe de verdad',
      !ofreceLaSegunda,
    );
    comprobar(
      'las tres puertas están DICHAS en el «cómo se usa»: tras tirar, una al turno y la nueva no, y cada una si y sólo si el juego la impone',
      suUsas.startsWith('Tras tirar') === !laOfreceAntesDeTirar &&
        /una al turno/.test(suUsas) === !ofreceLaSegunda &&
        /la nueva no/.test(suUsas) === !ofreceLaDeHoy,
      { usas: suUsas, antesDeTirar: laOfreceAntesDeTirar, segunda: ofreceLaSegunda, deHoy: ofreceLaDeHoy },
    );
  }

  /* ── 6 ter. CON UN TÍTULO SIN REVELAR NO SE GANA, Y AHORA EL NAIPE LO DICE ──
   *
   * El «qué consigues» de los cinco títulos decía «Ese punto: secreto tuyo hasta que la
   * enseñes», y de ahí un recién llegado sale creyendo que guardarlo es gratis y que el
   * punto ya cuenta. `puntosDe` dice lo contrario en su cabecera («CON UN TÍTULO SIN
   * REVELAR NO SE GANA») y `puedeHaberGanado` cuenta `puntosDe` y no `puntosOcultosDe`.
   *
   * Así que no se lee la cabecera: SE JUEGA. Se monta un colono a un punto de ganar con un
   * título en la mano, se comprueba que la partida NO se ha terminado, se revela por el
   * árbitro y se comprueba que sí. Y con esa respuesta en la mano se le exige a la frase
   * que hable de enseñar y de ganar. El día que el §1.6 cambie y los títulos ocultos
   * cuenten, la primera mitad se pone roja antes que ninguna otra cosa. */
  {
    const casiOcho = escenarioDeMazo({
      bienes: [['junco', 'limo'], ['junco'], ['sal']],
      /*
       * B TAMBIÉN LLEVA UN TÍTULO EN LA MANO, y no es adorno: sin él, «a B no se le ofrece
       * revelar» sería verdad por no tener carta ninguna, y la comprobación de la puerta del
       * turno propio no estaría preguntando nada. Con el título puesto, lo único que le falta
       * a B es el turno.
       */
      manos: [[{ carta: 'c1:faro', comprada: 0 }], [{ carta: 'c2:huerto', comprada: 0 }], []],
    });
    /* Siete puntos en público: tres torres y una choza, más la que trae el escenario. */
    const conSiete: EstadoDeRiberas = {
      ...casiOcho,
      colonos: casiOcho.colonos.map((c, i) =>
        i !== 0
          ? c
          : {
              ...c,
              chozas: [verticeDeHex({ q: -2, r: 0 }, 0)],
              torres: [verticeDeHex({ q: 0, r: 0 }, 0), verticeDeHex({ q: 2, r: 0 }, 0), verticeDeHex({ q: 0, r: 1 }, 0)],
            },
      ),
    };
    const mesaDelTitulo = mesaSobre('RIB-3D-TITULO', conSiete, [...TRES]);
    const antesDeEnsenar = estadoDe(mesaDelTitulo);
    const revelar = opcionesEn(mesaDelTitulo, 'A').find((o) => o.tipo === REVELAR);
    /*
     * SE HACE UN MOVIMIENTO QUE NO DA PUNTOS (una vereda vale cero) y NO se pregunta por el
     * `momento` del estado montado a mano. Es la diferencia entre comprobar la regla y
     * comprobar lo que uno mismo escribió: `puedeHaberGanado` sólo corre al final de un
     * movimiento, así que un estado con `momento: 'jugando'` puesto por el escenario diría
     * «jugando» aunque los títulos ocultos ganaran. Trazando, el juez habla.
     */
    const laVereda = opcionesEn(mesaDelTitulo, 'A').find(
      (o) => o.tipo === ALZAR && (o.carga as { que?: unknown }).que === 'vereda',
    );
    const trasLaVereda = laVereda === undefined ? antesDeEnsenar : estadoDe(mover(mesaDelTitulo, 'A', laVereda));
    const despues = revelar === undefined ? antesDeEnsenar : estadoDe(mover(mesaDelTitulo, 'A', revelar));
    comprobar(
      'con SIETE puntos en público y el octavo en un título sin revelar, un movimiento sin puntos NO acaba la partida: el título guardado no gana',
      laVereda !== undefined && revelar !== undefined && trasLaVereda.momento === 'jugando' && trasLaVereda.ganadores.length === 0,
      { momento: trasLaVereda.momento, ganadores: trasLaVereda.ganadores, hayVereda: laVereda !== undefined, hayRevelar: revelar !== undefined },
    );
    comprobar(
      'y en cuanto se enseña, se acaba: ése es el punto que el naipe tiene que contar y el que decía que era secreto y ya estaba',
      despues.momento === 'terminada' && despues.ganadores.includes('A'),
      { momento: despues.momento, ganadores: despues.ganadores },
    );
    const suConsigues = retratoDeLaCarta('faro')?.explicacion.consigues ?? '';
    comprobar(
      'el «qué consigues» del título cuenta esa regla, enseñar y ganar, y no se queda en el secreto, que es lo que dejaba al lector peor de lo que estaba',
      /enseñar|enseñas|enseñarla|enseñarlo/.test(suConsigues) && /gana|ganas|cuenta/.test(suConsigues),
      suConsigues,
    );

    /*
     * ═══ Y EL GESTO SUBE A ESA MISMA FRASE, PORQUE LA TERCERA NO SIEMPRE SE PINTA ═══
     *
     * El cómo se enseña vivía en el «cómo se usa», o sea en la frase que en los dos lienzos
     * estrechos NO se lee: allí caben dos, y `verify:escritorio` lo mide contra las manos de
     * la escena. Quedaba «sin enseñarla no ganas» sin decir en ningún sitio CÓMO se enseña,
     * que es el mismo delito de nombrar una condición y callar la que hace falta para
     * cumplirla, girado. Así que la frase que SÍ se pinta lleva la regla y el gesto.
     */
    comprobar(
      'y lleva además el GESTO, porque ésta es la frase que se pinta en los dos lienzos estrechos donde sólo caben dos',
      /suéltala/i.test(suConsigues) && /hueco/i.test(suConsigues),
      suConsigues,
    );

    /*
     * ═══ Y EL «CÓMO SE USA» QUE QUEDA LIBRE NOMBRA SU PUERTA, QUE NO ES LA DE LAS OTRAS ═══
     *
     * `revelarUnTitulo` empieza por `elTurnoEsDe` y ahí se le acaban las condiciones: ni
     * mira `tirado`, ni `cartaJugada`, ni el sello de compra. O sea que un título no espera
     * a los dados como esperan las cuatro que se juegan, y su frase no puede empezar por
     * «Tras tirar». Las tres mitades se le preguntan a la mesa y no a esta cabecera: que se
     * ofrezca ANTES de tirar, que NO se le ofrezca a quien tiene un título y no el turno, y
     * que enseñarlo deje `cartaJugada` en falso. El día que revelar cueste la jugada o exija
     * los dados, esto se pone rojo y volverlo verde es reescribir la frase.
     */
    const sinTirar = mesaSobre('RIB-3D-TITULO-SIN-TIRAR', { ...conSiete, tirado: false }, [...TRES]);
    const revelarAntesDeTirar = opcionesEn(sinTirar, 'A').some((o) => o.tipo === REVELAR);
    const seLoOfrecenAB = opcionesEn(mesaDelTitulo, 'B').some((o) => o.tipo === REVELAR);
    comprobar(
      'a B, que tiene un título en la mano y no tiene el turno, NO se le ofrece revelar: la única puerta del título es el turno propio',
      !seLoOfrecenAB && (conSiete.colonos[1]?.mano.length ?? 0) === 1,
      { seLoOfrecenAB, manoDeB: conSiete.colonos[1]?.mano },
    );
    comprobar(
      'y en el turno propio se ofrece también ANTES de tirar, y enseñarlo no gasta la jugada: las dos cosas que el «cómo se usa» promete',
      revelarAntesDeTirar && despues.cartaJugada === false,
      { antesDeTirar: revelarAntesDeTirar, cartaJugada: despues.cartaJugada },
    );
    const suUsas = retratoDeLaCarta('faro')?.explicacion.usas ?? '';
    comprobar(
      'así que su frase dice el turno propio y que no gasta la jugada, y NO dice «Tras tirar», que es lo que dicen las cuatro que sí esperan a los dados',
      /en tu turno/i.test(suUsas) &&
        /no gasta la jugada/i.test(suUsas) &&
        /tras tirar/i.test(suUsas) === !revelarAntesDeTirar,
      { usas: suUsas, antesDeTirar: revelarAntesDeTirar },
    );
  }

  /* ── 6 quater. EL VADO SE PIERDE DE DOS MANERAS, Y EL NAIPE SÓLO CONTABA UNA ──
   *
   * «2 puntos mientras nadie te supere» es MEDIA regla. La cabecera de `recalcularElVado`
   * tiene la otra escrita en mayúsculas —«Si el dueño baja del mínimo, porque alguien le
   * partió la cadena con una choza, el premio queda VACANTE»— y el código la cumple: el
   * `sigueSiendoSuyo` exige `largoActual >= VADO_MINIMO`. O sea que el Vado se pierde sin
   * que nadie te supere, y quien leía el naipe no tenía manera de enterarse: se le van dos
   * puntos por una choza ajena que ni siquiera es una vereda.
   *
   * Así que no se lee la cabecera: SE JUEGA. Se monta al dueño con su cadena de cinco y con
   * La Mayor Guardia, se le parte la cadena por el vértice de en medio con una choza de B,
   * se hace un movimiento por el árbitro para que hable el reductor, y se exige que el Vado
   * quede VACANTE y que La Mayor Guardia siga siendo suya. Lo segundo es la otra mitad:
   * `recalcularLaGuardia` es la misma función con el mismo `sigueSiendoSuya`, pero lo que
   * cuenta —`c.guardias`— sólo sube, así que esa rama no se puede dar y su frase tiene razón
   * al contar UNA sola manera. El día que una de las dos reglas cambie, se pone roja la
   * frase que dejó de ser verdad y no la otra. */
  {
    const conCadenaYGuardia = escenarioDeMazo({
      bienes: [['junco', 'limo'], ['sal'], ['grano']],
      guardias: [GUARDIA_MINIMA, 0, 0],
      veredas: [CADENA_DE_CINCO],
    });
    comprobar(
      'A tiene el Vado con su cadena entera y también La Mayor Guardia, o lo de abajo no le quitaría nada a nadie',
      conCadenaYGuardia.vado.de === 'A' &&
        conCadenaYGuardia.vado.largo >= VADO_MINIMO &&
        conCadenaYGuardia.guardia.de === 'A',
      { vado: conCadenaYGuardia.vado, guardia: conCadenaYGuardia.guardia },
    );
    /* El vértice de en medio: el que comparten la segunda arista de la cadena y la tercera. */
    const deLaTercera = new Set(verticesDeArista(CADENA_DE_CINCO[2] as LlaveDeArista));
    const corte = verticesDeArista(CADENA_DE_CINCO[1] as LlaveDeArista).find((v) => deLaTercera.has(v));
    const partida: EstadoDeRiberas =
      corte === undefined
        ? conCadenaYGuardia
        : {
            ...conCadenaYGuardia,
            colonos: conCadenaYGuardia.colonos.map((c, i) => (i !== 1 ? c : { ...c, chozas: [...c.chozas, corte] })),
          };
    comprobar(
      'la choza de B le parte la cadena a A: su vado más largo baja del mínimo, y ni B ni C llegan a él ni de lejos',
      corte !== undefined &&
        largoDelVado(partida.colonos[0]?.veredas ?? [], [corte]) < VADO_MINIMO &&
        partida.colonos.slice(1).every((c) => c.veredas.length < VADO_MINIMO),
      {
        corte,
        largoDeA: corte === undefined ? null : largoDelVado(partida.colonos[0]?.veredas ?? [], [corte]),
        losDemas: partida.colonos.slice(1).map((c) => c.veredas.length),
      },
    );
    const mesaDelCorte = mesaSobre('RIB-3D-CORTE', partida, [...TRES]);
    const otraVereda = opcionesEn(mesaDelCorte, 'A').find(
      (o) => o.tipo === ALZAR && (o.carga as { que?: unknown }).que === 'vereda',
    );
    const trasElCorte = otraVereda === undefined ? partida : estadoDe(mover(mesaDelCorte, 'A', otraVereda));
    comprobar(
      'y en el primer movimiento el premio queda VACANTE sin que nadie le haya superado: se pierde por una choza ajena',
      otraVereda !== undefined && trasElCorte.vado.de === null,
      { vado: trasElCorte.vado, hayVereda: otraVereda !== undefined },
    );
    comprobar(
      'y La Mayor Guardia NO se le va con esa misma choza: sus guardias no bajan, así que ese premio sólo se pierde de una manera',
      trasElCorte.guardia.de === 'A',
      trasElCorte.guardia,
    );
    const consiguesDelVado = losDosPremios.find((p) => p.nombre === 'El Vado Largo')?.explicacion.consigues ?? '';
    const consiguesDeLaGuardia = losDosPremios.find((p) => p.nombre === 'La Mayor Guardia')?.explicacion.consigues ?? '';
    comprobar(
      'el naipe del Vado cuenta LAS DOS maneras de perderlo —que te superen y que te corten—, que es lo que el reductor acaba de hacer',
      /super/i.test(consiguesDelVado) && /cort/i.test(consiguesDelVado),
      consiguesDelVado,
    );
    comprobar(
      'y el de La Mayor Guardia sigue contando UNA sola, porque una sola tiene: añadirle el corte ahí sería mentir del otro lado',
      /super/i.test(consiguesDeLaGuardia) && !/cort/i.test(consiguesDeLaGuardia),
      consiguesDeLaGuardia,
    );
  }

  /* ── 6 quinquies. LAS DOS VEREDAS PROMETEN DOS Y EL JUEGO PUEDE DAR UNA, EN SILENCIO ──
   *
   * `jugarLasDosVeredas` no pone ni una vereda: deja `veredasGratis` en dos y las veredas se
   * alzan después, una a una. El crédito muere por dos caminos que el código tiene escritos
   * —`trazar` lo apaga si la primera se comió el último hueco, y `siguienteTurno` lo pone a
   * cero al pasar—, y el comentario de este segundo lo reconoce por escrito: «nadie que mire
   * el tablero sabría que existe». La decisión es buena; lo que no podía quedarse es que
   * tampoco se dijera. En la pantalla no hay contador hasta que YA hay crédito (la `ayuda`
   * de alzar), así que el naipe es el único sitio donde el plazo se lee ANTES de gastar la
   * carta.
   *
   * Se juega entero sobre una mesa de verdad: se juega la carta, se pone UNA, se pasa, y se
   * exige que el crédito haya muerto. */
  {
    const conLaCarta = escenarioDeMazo({
      bienes: [['limo'], ['junco'], ['sal']],
      manos: [[{ carta: 'c1:dos-veredas', comprada: 0 }], [], []],
    });
    const mesaDeLasVeredas = mesaSobre('RIB-3D-VEREDAS', conLaCarta, [...TRES]);
    const jugarla = opcionesEn(mesaDeLasVeredas, 'A').find((o) => o.tipo === DOS_VEREDAS);
    const conCredito = jugarla === undefined ? mesaDeLasVeredas : mover(mesaDeLasVeredas, 'A', jugarla);
    const veredasDe = (e: EstadoDeRiberas): number => e.colonos[0]?.veredas.length ?? 0;
    comprobar(
      'jugar Las Dos Veredas no pone ni una vereda: deja el crédito en dos y el tablero como estaba',
      jugarla !== undefined &&
        estadoDe(conCredito).veredasGratis === VEREDAS_DE_LA_CARTA &&
        veredasDe(estadoDe(conCredito)) === veredasDe(conLaCarta),
      { gratis: estadoDe(conCredito).veredasGratis, antes: veredasDe(conLaCarta), despues: veredasDe(estadoDe(conCredito)) },
    );
    const primeraVereda = opcionesEn(conCredito, 'A').find(
      (o) => o.tipo === ALZAR && (o.carga as { que?: unknown }).que === 'vereda',
    );
    const conUna = primeraVereda === undefined ? conCredito : mover(conCredito, 'A', primeraVereda);
    comprobar(
      'con la primera puesta queda UNA de crédito, y es ésa la que se puede perder sin que nadie lo vea',
      primeraVereda !== undefined &&
        estadoDe(conUna).veredasGratis === VEREDAS_DE_LA_CARTA - 1 &&
        veredasDe(estadoDe(conUna)) === veredasDe(conLaCarta) + 1,
      { gratis: estadoDe(conUna).veredasGratis, veredas: veredasDe(estadoDe(conUna)) },
    );
    /*
     * ═══ Y AQUÍ EL CÓDIGO DICE UNA COSA Y LAS OPCIONES OTRA, ASÍ QUE SE PREGUNTA ═══
     *
     * El comentario de `siguienteTurno` dice «quien juega Las Dos Veredas y luego pasa sin
     * poner la segunda la pierde». Pasar A PROPÓSITO no se puede: con crédito vivo,
     * `opcionesDeRiberas` se va por su `if (v.veredasGratis > 0)` con las veredas y revelar
     * y nada más, así que PASAR no se ofrece. Lo que sí acaba el turno es EL PLAZO —un tic
     * por `avanzarElReloj`, que es `venceElPlazo` y de ahí `siguienteTurno`—, y ahí el
     * crédito muere sin que nadie haya tocado nada. Ésa es la pérdida silenciosa de verdad,
     * y es la que se juega aquí: las dos mitades, que no se puede soltar a mano y que el
     * reloj sí se lo lleva.
     */
    const conCreditoOfrece = opcionesEn(conUna, 'A');
    comprobar(
      'con el crédito vivo no se puede pasar a propósito: el juego sólo ofrece veredas y revelar, así que la segunda no se suelta, se pierde',
      !conCreditoOfrece.some((o) => o.tipo === PASAR) &&
        conCreditoOfrece.length > 0 &&
        conCreditoOfrece.every((o) => o.tipo === ALZAR || o.tipo === REVELAR),
      [...new Set(conCreditoOfrece.map((o) => o.tipo))],
    );
    const trasElPlazo = estadoDe(avanzarElReloj(conUna));
    comprobar(
      'y cuando vence el plazo el crédito MUERE con el turno: la carta prometía dos y el turno ha dado una, sin un aviso',
      trasElPlazo.veredasGratis === 0 &&
        veredasDe(trasElPlazo) === veredasDe(conLaCarta) + 1 &&
        trasElPlazo.turno !== estadoDe(conUna).turno,
      { gratis: trasElPlazo.veredasGratis, veredas: veredasDe(trasElPlazo), turno: trasElPlazo.turno },
    );
    const suHace = retratoDeLaCarta('dos-veredas')?.explicacion.hace ?? '';
    comprobar(
      'así que el naipe dice el PLAZO, que es lo único que separa «abres dos» de una promesa que el juego no siempre cumple',
      /este turno/i.test(suHace),
      suHace,
    );
  }

  /* ── Y EL TEXTO LLEGA AL NAIPE, QUE ES PARA LO QUE ESTÁ ──
   *
   * Los once naipes de la mano, por las dos puertas, con la explicación dentro; y lo que
   * sale de la traducción entra en la escena de verdad, donde el campo es el mismo por
   * estructura. Sin esta línea el texto existiría en una tabla que no lo pide nadie. */
  {
    const conManoYPremios = escenarioDeMazo({
      bienes: [['limo'], ['junco'], ['sal']],
      guardias: [GUARDIA_MINIMA, 0, 0],
      manos: [
        [
          { carta: 'c1:guardia', comprada: 0 },
          { carta: 'c2:faro', comprada: 0 },
        ],
        [],
        [],
      ],
      veredas: [CADENA_DE_CINCO],
    });
    const mesa = mesaSobre('RIB-3D-EXPL', conManoYPremios, [...TRES]);
    const laMano = laManoDeLaIzquierda(vistaEn(mesa, 'A'), opcionesEn(mesa, 'A'), 'A');
    comprobar(
      'la mano lleva las cartas y los dos premios, y TODOS traen sus tres frases',
      laMano.length === 4 && laMano.every((c) => c.explicacion.hace.length > 0 && c.explicacion.consigues.length > 0 && c.explicacion.usas.length > 0),
      laMano.map((c) => `${c.nombre}: ${c.explicacion.hace}`),
    );
    comprobar(
      'el naipe del premio explica lo que nadie explicaba: aparece solo, no se juega, y ahora dice por qué',
      laMano.find((c) => c.esPremio === true)?.explicacion.usas.startsWith('Nada') === true,
      laMano.filter((c) => c.esPremio === true).map((c) => c.explicacion.usas),
    );
    /* Y ENTRA EN LA ESCENA DE VERDAD sin traducir nada: los dos contratos encajan por
     * estructura, así que si un lado cambia el campo esto ni compila. */
    const comoLaEscenaLoRecibe: readonly CartaDelMazo[] = laMano;
    const repartida = huecosDeLasCartas(comoLaEscenaLoRecibe, CAMPO_DE_LA_BARRA, PROPORCION, null);
    comprobar(
      'la escena reparte esos mismos naipes y el texto sigue dentro de cada uno al salir del reparto',
      repartida.length === laMano.length && repartida.every((c) => (c.carta.explicacion?.usas ?? '').length > 0),
      repartida.map((c) => c.carta.explicacion?.usas),
    );
  }
}

/* ═══ 10. CADA MOVIMIENTO SE ENSEÑA UNA VEZ: NI DOS BOTONES NI NINGUNO ═══ */
{
  const estado = escenarioDeMazo({
    bienes: [['sal', 'piedra', 'grano'], ['limo'], []],
    manos: [
      [
        { carta: 'c1:guardia', comprada: 0 },
        { carta: 'c2:faro', comprada: 0 },
      ],
      [],
      [],
    ],
  });
  const vista = proyectarRiberas(estado, 'A');
  const opciones = opcionesDeRiberas(vista, 'A');

  const enElTablero = opciones.filter((o) => o.tipo === FUNDAR || o.tipo === ALZAR || o.tipo === OFRECER).length;
  const enLaMano = opciones.filter((o) => TIPOS_QUE_PINTA_LA_MANO.includes(o.tipo)).length;
  /*
   * LA CUENTA TIENE CUATRO SUMANDOS DESDE ESTE ENCARGO, Y NO TRES.
   *
   * Aquí se exigía por escrito «COMPRAR SIGUE SIENDO UN BOTÓN: no es una carta de la mano
   * y no hay mazo que pulsar», y era verdad mientras el único sitio donde se ofrecía era
   * el pie. Ahora hay mazo que pulsar: el cuarto hueco de la barra. La comprobación no se
   * borra, se DA LA VUELTA — y se le añade la mitad que faltaba, que es que sin hueco de
   * mazo el botón tiene que volver, porque es lo único que salva al respaldo SVG.
   */
  const elMazo = mazoEnLaBarra(vista, 'A', opciones);
  const sueltas = opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones)), elMazo);
  const porElMazo = elMazo === null ? 0 : opciones.filter((o) => o.tipo === COMPRAR).length;
  comprobar('hay cartas que pintar y obra que ofrecer, o esto no comprobaría nada', enLaMano > 0 && enElTablero > 0, { enLaMano, enElTablero });
  comprobar('y hay hueco de mazo con una compra dentro, o el cuarto sumando sería cero', elMazo !== null && porElMazo === 1, { elMazo, porElMazo });
  comprobar(
    'lo del tablero, lo de la mano, el hueco del mazo y los botones suman las opciones: ni una dos veces, ni una perdida',
    sueltas.length + enElTablero + enLaMano + porElMazo === opciones.length,
    { sueltas: sueltas.length, enElTablero, enLaMano, porElMazo, todas: opciones.length },
  );
  comprobar('ningún botón es de los que pinta la mano', sueltas.every((o) => !TIPOS_QUE_PINTA_LA_MANO.includes(o.tipo)), sueltas.map((o) => o.id));
  comprobar(
    'COMPRAR YA NO ES UN BOTÓN: lo ofrece el cuarto hueco de la barra, y una vez es una vez',
    !sueltas.some((o) => o.tipo === COMPRAR) && comprarEnTres(sueltas) === null,
    sueltas.map((o) => o.id),
  );
  comprobar(
    'pero SIN hueco de mazo vuelve al pie, que es lo único que salva al respaldo y al mirón',
    opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones)), null).some((o) => o.tipo === COMPRAR),
  );
  comprobar('y pasar también', sueltas.some((o) => o.tipo === PASAR));
  comprobar(
    'la función de siempre NO quita las del mazo, para no dejar sin cartas a quien todavía no pinta la mano',
    opcionesFueraDelTablero(opciones).some((o) => o.tipo === GUARDIA || o.tipo === REVELAR),
  );
  comprobar('los cuatro que gastan la jugada del turno y revelar son los que pinta la mano', canonico([...TIPOS_QUE_PINTA_LA_MANO].sort()) === canonico([ACAPARAMIENTO, ANO_BUENO, DOS_VEREDAS, GUARDIA, REVELAR].sort()), TIPOS_QUE_PINTA_LA_MANO);
  comprobar('y comprar no está entre ellos', !TIPOS_QUE_PINTA_LA_MANO.includes(COMPRAR));
}

/* ═══ 10 BIS. COMPRAR SE PULSA EN LA BARRA, Y LA CARTA APARECE A LA IZQUIERDA ═══ */

/*
 * ═══ QUÉ COMPRA ESTE BLOQUE ═══
 *
 * Miguel pidió «un modelo de carta a la derecha del de puentes, que al pincharlo pregunte
 * si compro —sólo si tengo los recursos— y que al confirmar me salga la carta en la
 * izquierda». Eso son cuatro afirmaciones y aquí se miden las cuatro con números:
 *
 *  1. HAY CUARTO HUECO, y sale de las reglas: `comprarEnTres(opciones) !== null`, ni una
 *     segunda cuenta del coste. Se prueba quitándole los bienes y viendo que se apaga solo.
 *  2. APAGADO NO ES «NO ESTÁ». Sin bienes el hueco SIGUE, apagado. Un hueco que aparece y
 *     desaparece corre las otras tres piezas de sitio en cada jugada, porque la barra
 *     reparte centrado — y eso se lee como un fallo de dibujo, no como una regla.
 *  3. EL BOTÓN SE CAE EXACTAMENTE DONDE EL NAIPE APARECE, y en ningún sitio más. Lo ata
 *     que `opcionesFueraDeLaBarra` reciba EL MAZO y no un interruptor suelto.
 *  4. Y LA COMPRADA SALE A LA IZQUIERDA SOLA, sin que nadie la mueva: la mano es
 *     `laManoDeLaIzquierda`, que cuelga de `misCartas`, y `misCartas` la llena el árbitro
 *     al aceptar la compra. Se juega la compra POR LA PUERTA DE SIEMPRE y se cuenta antes
 *     y después.
 */
{
  const DOS = ['A', 'B'];
  const rico = escenarioDeMazo({
    bienes: [['sal', 'piedra', 'grano'], ['limo']],
    mazo: ['c1:guardia', 'c2:faro'],
  });
  let partida = mesaSobre('RIB-MAZO-BARRA', rico, DOS);
  const vista = vistaEn(partida, 'A');
  const opciones = opcionesEn(partida, 'A');

  /* ── 1. EL HUECO, Y DE DÓNDE SALE QUE ESTÉ ENCENDIDO ── */
  comprobar('el juego ofrece comprar en este escenario, o nada de lo de abajo mediría', comprarEnTres(opciones) !== null, opciones.map((o) => o.id));
  const mazo = mazoEnLaBarra(vista, 'A', opciones);
  comprobar('a un colono sentado se le pinta el cuarto hueco, y hoy se puede pulsar', mazo !== null && mazo.disponible === true, mazo);
  comprobar(
    'y su `disponible` es exactamente lo que dicen las reglas, no una cuenta nueva del coste',
    mazo?.disponible === (comprarEnTres(opciones) !== null),
  );

  /* ── 2. SIN BIENES SE APAGA, PERO NO DESAPARECE ── */
  const pobre = mesaSobre('RIB-MAZO-POBRE', escenarioDeMazo({ bienes: [['limo'], ['limo']], mazo: ['c1:guardia'] }), DOS);
  const mazoPobre = mazoEnLaBarra(vistaEn(pobre, 'A'), 'A', opcionesEn(pobre, 'A'));
  comprobar('sin sal, piedra y grano el juego no ofrece comprar', comprarEnTres(opcionesEn(pobre, 'A')) === null);
  comprobar(
    'y el hueco SIGUE ESTANDO, apagado: no aparece y desaparece según la mano',
    mazoPobre !== null && mazoPobre.disponible === false,
    mazoPobre,
  );
  comprobar('la barra de al lado sigue siendo la misma de tres piezas', barraEnTres(vistaEn(pobre, 'A'), 'A').length === 3);

  /* ── Y CON EL MAZO AGOTADO TAMPOCO: es la otra mitad de «sólo si se puede» ── */
  const seco = mesaSobre('RIB-MAZO-SECO', escenarioDeMazo({ bienes: [['sal', 'piedra', 'grano'], ['limo']], mazo: [] }), DOS);
  comprobar('con el mazo vacío el juego no ofrece comprar, aunque sobren bienes', comprarEnTres(opcionesEn(seco, 'A')) === null);
  comprobar(
    'y el hueco sale apagado por ese motivo también, sin que el cliente sepa cuál de los dos es',
    mazoEnLaBarra(vistaEn(seco, 'A'), 'A', opcionesEn(seco, 'A'))?.disponible === false,
  );

  /* ── 3. QUIEN NO TIENE BARRA NO TIENE HUECO, Y POR ESO CONSERVA EL BOTÓN ── */
  comprobar('un mirón no tiene hueco de mazo', mazoEnLaBarra(vista, null, opciones) === null);
  comprobar('ni lo tiene un asiento que no está en la mesa', mazoEnLaBarra(vista, 'Z', opciones) === null);
  const conNaipe = opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones)), mazo);
  const sinNaipe = opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones)), null);
  comprobar('con hueco de mazo, comprar deja de ser botón', !conNaipe.some((o) => o.tipo === COMPRAR), conNaipe.map((o) => o.id));
  comprobar('sin hueco de mazo, comprar sigue siendo botón', sinNaipe.some((o) => o.tipo === COMPRAR), sinNaipe.map((o) => o.id));
  comprobar(
    'y no se lleva por delante ningún otro movimiento: cae comprar y sólo comprar',
    sinNaipe.length === conNaipe.length + 1 &&
      canonico(sinNaipe.filter((o) => o.tipo !== COMPRAR).map((o) => o.id)) === canonico(conNaipe.map((o) => o.id)),
    { con: conNaipe.map((o) => o.id), sin: sinNaipe.map((o) => o.id) },
  );
  comprobar(
    'un hueco APAGADO tampoco devuelve el botón: apagado no es «no está», y ofrecerlo dos veces sería peor',
    !opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones)), { disponible: false }).some(
      (o) => o.tipo === COMPRAR,
    ),
  );

  /* ── 4. EL CUARTO HUECO EN LA BARRA DE VERDAD, Y VA EL ÚLTIMO ── */
  const piezas = barraEnTres(vista, 'A');
  comprobar('la barra trae las tres obras, y el mazo es el cuarto', piezas.length === 3 && mazo !== null, piezas.map((p) => p.id));
  const tres = huecosDeLaBarra(3, CAMPO_DE_LA_BARRA, PROPORCION);
  const cuatro = huecosDeLaBarra(4, CAMPO_DE_LA_BARRA, PROPORCION);
  comprobar('pedidos cuatro salen cuatro, todos del mismo lado', cuatro.length === 4 && new Set(cuatro.map((h) => h.lado)).size === 1);
  comprobar(
    'y el del mazo es el ÚLTIMO, el de más a la derecha: lo que se construye va junto',
    cuatro.every((h, i) => i === 0 || h.x > (cuatro[i - 1]?.x ?? 0)),
    cuatro.map((h) => Number(h.x.toFixed(4))),
  );
  comprobar(
    'LA BARRA ESTÁ CENTRADA: el cuarto no se añade a la derecha, corre los tres a la izquierda',
    (cuatro[0]?.x ?? 0) < (tres[0]?.x ?? 0) &&
      (cuatro[1]?.x ?? 0) < (tres[1]?.x ?? 0) &&
      (cuatro[2]?.x ?? 0) < (tres[2]?.x ?? 0) &&
      Math.abs((cuatro[0]?.x ?? 0) + (cuatro[3]?.x ?? 0)) < 1e-9,
    { tres: tres.map((h) => Number(h.x.toFixed(4))), cuatro: cuatro.map((h) => Number(h.x.toFixed(4))) },
  );

  /* ── EL DIBUJO EXISTE, Y NO ES EL DE NINGÚN NAIPE ── */
  const dibujos = Object.keys(CONTORNOS_DE_LA_CARTA);
  comprobar('el dibujo del mazo existe en los iconos de la escena', dibujos.includes(DIBUJO_DEL_MAZO), dibujos);
  comprobar(
    'y no es prestado de ninguna carta: un molino en la barra prometería El Molino, que es una de las cinco que pueden salir',
    CLASES_DE_CARTA.every((clase) => retratoDeLaCarta(clase)?.dibujo !== DIBUJO_DEL_MAZO),
  );
  comprobar(
    'ni de ninguno de los dos premios',
    premiosEnTres(vista, 'A').every((x) => x.dibujo !== DIBUJO_DEL_MAZO) &&
      premiosEnTres(vista, 'B').every((x) => x.dibujo !== DIBUJO_DEL_MAZO),
  );

  /* ── 5. Y LA COMPRADA APARECE A LA IZQUIERDA SOLA ── */
  const antes = laManoDeLaIzquierda(vista, opciones, 'A');
  comprobar('antes de comprar, la mano de la izquierda de A está vacía', antes.length === 0, antes.map((c) => c.id));
  partida = mover(partida, 'A', comprarEnTres(opciones) as Opcion);
  const vistaDespues = vistaEn(partida, 'A');
  const opcionesDespues = opcionesEn(partida, 'A');
  const despues = laManoDeLaIzquierda(vistaDespues, opcionesDespues, 'A');
  comprobar(
    'y después trae exactamente un naipe más: de 0 a 1, sin que nadie lo mueva de sitio',
    despues.length === antes.length + 1,
    { antes: antes.length, despues: despues.length },
  );
  comprobar('que es la carta que tocaba, con su cara entera', despues[0]?.id === 'c1' && despues[0]?.familia === 'guardia' && despues[0]?.nombre === 'La Guardia', despues[0]);
  const enLaFranja = huecosDeLasCartas(despues, CAMPO, PROPORCION, null);
  comprobar('la escena de verdad le da su hueco: uno por naipe', enLaFranja.length === despues.length);
  comprobar(
    'y ese hueco cae en la mitad IZQUIERDA de la pantalla, que es donde Miguel la pidió',
    (enLaFranja[0]?.hueco.x ?? 0) < 0,
    enLaFranja.map((c) => Number(c.hueco.x.toFixed(4))),
  );
  comprobar(
    'y el cuarto hueco se apaga SOLO: los tres bienes se han ido con la compra',
    mazoEnLaBarra(vistaDespues, 'A', opcionesDespues)?.disponible === false,
    mazoEnLaBarra(vistaDespues, 'A', opcionesDespues),
  );
  comprobar('y el mazo del marcador ha bajado una: se compró de verdad', marcadorEnTres(vistaDespues)?.mazo === 1, marcadorEnTres(vistaDespues)?.mazo);
}

/* ═══ 11. CUANDO NO CABEN LOS COLORES, NO SE PINTA UN TABLERO QUE MIENTE ═══ */
{
  const CINCO = ['A', 'B', 'C', 'D', 'E'];
  const abierta = abrirMesa({ id: 'RIB-3D-5', arcade: RIBERAS, semilla: 3, asientos: CINCO });
  const empezada = jugar(abierta, { quien: 'A', rev: abierta.rev, movimiento: { tipo: EMPEZAR_RIBERAS, carga: {} } });
  const vista = proyectarRiberas(estadoDe(empezada), 'E');
  comprobar('cinco colonos son más que los colores del atlas: no se ve en tres', COLORES_EN_3D.length === 4 && seVeEnTres(vista) === false);
  comprobar('y el tablero en tres es `null` aunque haya islas, para que el cliente pinte el plano', vista.islas.length === 19 && tableroEnTres(vista) === null);
  comprobar('el quinto colono no tiene barra, porque no tendría color', barraEnTres(vista, 'E').length === 0);
  comprobar('ni el primero: la mesa entera se ve en plano, no unos en tres y otros no', barraEnTres(proyectarRiberas(estadoDe(empezada), 'A'), 'A').length === 0 || tableroEnTres(proyectarRiberas(estadoDe(empezada), 'A')) === null);
  comprobar('pero las opciones fuera del tablero y el turno siguen sirviendo al plano', meToca(proyectarRiberas(estadoDe(empezada), 'A')) && opcionesFueraDelTablero(opcionesDeRiberas(vista, 'E')).length === 0);
}

/* ═══ 12. VACUNAS: LO QUE NO ES DE RIBERAS NO SE PINTA ═══ */
{
  const ajena = { desde: 'frente', momento: 'jugando', colonos: [], islas: [{}] };
  comprobar('una vista de otro juego no se pinta', esVistaQueSePinta(ajena) === false && tableroEnTres(ajena) === null);
  comprobar('ni tiene barra, mano ni turno', barraEnTres(ajena, 'A').length === 0 && manoEnTres(ajena).length === 0 && meToca(ajena) === false);
  comprobar('ni trueques', bienesQueSeCambianPor(ajena, [], 'junco').length === 0 && truequesPosibles(ajena, [], 'junco', 'sal').length === 0);
  comprobar('ni mano del mazo, ni jugadas, ni marcador', cartasEnTres(ajena, []).length === 0 && jugadasDeLaCarta(ajena, [], 'c1').length === 0 && marcadorEnTres(ajena) === null);
  comprobar('ni premios, ni mano de la izquierda', premiosEnTres(ajena, 'A').length === 0 && laManoDeLaIzquierda(ajena, [], 'A').length === 0);
  comprobar('`null` y `undefined` tampoco', tableroEnTres(null) === null && tableroEnTres(undefined) === null && marcadorEnTres(null) === null);
  const rota = { desde: 'riberas', momento: 'jugando', colonos: [], islas: [], misFichas: ['sinbien', 'b1:', ':grano', 'b2:sal'] };
  comprobar('una ficha sin la forma `serie:bien` se salta en vez de romper la mano', manoEnTres(rota).map((c) => c.bien).join(',') === 'grano,sal', manoEnTres(rota));

  /*
   * UNA VISTA SIN MAZO ES LEGÍTIMA, y por eso no se rompe con ella: el banco de
   * pruebas del tablero no lo trae, y una partida guardada antes de que el mazo
   * existiera se rellena con «no hay mazo». Lo que no puede pasar es que la mano
   * reviente, ni que el marcador se invente puntos que nadie ha visto.
   */
  const sinMazo = { desde: 'riberas', momento: 'jugando', colonos: [{ asiento: 'A', nombre: 'Ana', color: 'rojo' }], islas: [], turnoDe: 'A', yo: 'A' };
  comprobar('una vista sin mazo no tiene mano de cartas, y no revienta', cartasEnTres(sinMazo, []).length === 0);
  comprobar('ni premios: una vista sin `vado` ni `guardia` no le regala uno a nadie', premiosEnTres(sinMazo, 'A').length === 0 && laManoDeLaIzquierda(sinMazo, [], 'A').length === 0);
  const pobre = marcadorEnTres(sinMazo);
  comprobar('y su marcador sale con ceros y sin premios, que es la verdad', pobre?.mazo === 0 && pobre?.vado === null && pobre?.mayorGuardia === null, pobre);
  comprobar('con la cadena a cero, que es la verdad y no un hueco, y el mínimo de la regla igual', pobre?.colonos[0]?.vado === 0 && pobre?.vadoMinimo === VADO_MINIMO, { vado: pobre?.colonos[0]?.vado, minimo: pobre?.vadoMinimo });
  comprobar('con el colono que hay, sin cartas ni guardias ni títulos', pobre?.colonos.length === 1 && pobre?.colonos[0]?.cartas === 0 && pobre?.colonos[0]?.guardias === 0 && canonico(pobre?.colonos[0]?.titulos) === canonico([]));
  comprobar('y con mis puntos ocultos igualados a los públicos, no inventados', pobre?.colonos[0]?.puntosConLoOculto === 0 && pobre?.colonos[0]?.puntos === 0);

  /* Una carta con la forma rota se salta, como una ficha rota. */
  const manoRota = {
    desde: 'riberas',
    momento: 'jugando',
    colonos: [],
    islas: [],
    turnoDe: 'A',
    yo: 'A',
    misCartas: [{ carta: 'sinclase' }, { carta: 'c1:noexiste' }, { carta: 7 }, {}, { carta: 'c2:guardia' }],
  };
  const salvadas = cartasEnTres(manoRota, []);
  comprobar('de una mano con cartas rotas sale sólo la buena', salvadas.length === 1 && salvadas[0]?.id === 'c2', salvadas);
  comprobar('sin bandera ninguna, porque no hay opciones que la enciendan', salvadas[0]?.sePuedeJugar === false && salvadas[0]?.sePuedeRevelar === false);
  comprobar('y sin opciones no hay nada que revelar ni que comprar', revelarDe([], 'c2') === null && comprarEnTres([]) === null);
}

/* ═══ 12 bis. EL ESTIAJE POR MOVER: EN TRES DIMENSIONES TODAVÍA NO SE DIBUJA, Y SE JUEGA IGUAL ═══ */

/*
 * ═══ QUÉ COMPRA ESTE BLOQUE, Y POR QUÉ HACE FALTA AHORA Y NO EN LA FASE DEL DIBUJO ═══
 *
 * La fase 1 de `docs/EL-LADRON-DE-RIBERAS.md` trae la regla y el retablo; las señales de
 * comarca sobre el tablero de tres dimensiones son la fase 4 y todavía no están. Entre
 * las dos hay una ventana en la que una mesa de hasta CUATRO colonos —las que se juegan
 * en tres dimensiones, porque `COLORES_EN_3D` tiene cuatro colores— saca un siete y tiene
 * que poder moverlo con lo que ya hay. Esto afirma que puede, y afirma exactamente por
 * dónde: por los BOTONES, que es la reserva que este cliente tiene para todo lo que la
 * escena aún no sabe pintar.
 *
 * Si mañana alguien hiciera que `opcionesFueraDeLaMesa` se llevara lo que no reconoce, o
 * que `obraPosible` se inventara una clase de sitio para una llave de comarca, esta mesa
 * se quedaría PARADA con la bandera encendida: no hay ninguna otra opción hasta que se
 * mueva. Y no se caería nada, que es la forma de fallo que este fichero persigue entero.
 */
{
  const casiJugando = escenarioDeMazo({ bienes: [['limo'], ['limo'], []] });
  const porMover: EstadoDeRiberas = { ...casiJugando, ultimaTirada: 7, estiajePorMover: true };
  const mesaDelSiete = mesaSobre('RIB-3D-ESTIAJE', porMover, TRES);
  const vista = vistaEn(mesaDelSiete, 'A');
  const opciones = opcionesEn(mesaDelSiete, 'A');
  const destinos = opciones.filter((o) => o.tipo === MOVER_EL_ESTIAJE);

  comprobar('con el estiaje por mover, el juego ofrece los dieciocho destinos', new Set(destinos.map((o) => (o.carga as { donde: string }).donde)).size === 18, destinos.length);
  comprobar('y ninguna otra cosa salvo revelar: no se tira, no se construye y no se pasa', opciones.every((o) => o.tipo === MOVER_EL_ESTIAJE || o.tipo === REVELAR), opciones.map((o) => o.tipo));

  /*
   * LA BARRA DE OBRA SE QUEDA VACÍA, Y ESO ES LO CORRECTO, NO UN FALLO.
   *
   * `obrasPosibles` es lo que enciende y apaga las tres piezas de la barra, y con el
   * estiaje por mover no se puede levantar nada: no hay ni un sitio para ninguna de las
   * tres. Lo que importa de esta línea es lo OTRO que dice: que ninguna de las dieciocho
   * opciones nuevas se cuela ahí dentro haciéndose pasar por una obra. `piezaDeLaOpcion`
   * mira el TIPO y la CARGA y no el `id`, así que un `riberas:estiaje` no es ninguna
   * pieza; si mañana alguien lo interpretara por el `id` —que empieza por `estiaje:`, y se
   * parece a `torre:` y a `vereda:`— la barra ofrecería soltar una torre sobre una comarca
   * y `claseDeLlave` devolvería `null` para su llave, que es la forma de fallo que esa
   * función deja escrita. La lista de sitios de comarca la traerá `sitiosDelEstiaje`, en
   * la fase 4.
   */
  const obras = obrasPosibles(vista, 'A');
  comprobar(
    'con el estiaje por mover no se puede levantar ninguna pieza, y ninguna se inventa un sitio de comarca',
    obras.length === 3 && obras.every((o) => o.sitios.length === 0 && o.clase === null),
    obras.map((o) => `${o.pieza}: ${String(o.sitios.length)}`),
  );

  /*
   * Y LOS DIECIOCHO LLEGAN ENTEROS A LOS BOTONES. Es la reserva que hace que la mesa de
   * tres dimensiones se pueda jugar mientras la escena no dibuje las señales: se pintan
   * como «Y además puedes», con su rótulo, que dice a qué isla van.
   */
  const fuera = opcionesFueraDeLaMesa(opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones)), null), null);
  comprobar('y los dieciocho destinos llegan enteros a los botones: la mesa en tres dimensiones no se queda parada', fuera.filter((o) => o.tipo === MOVER_EL_ESTIAJE).length === destinos.length, {
    botones: fuera.filter((o) => o.tipo === MOVER_EL_ESTIAJE).length,
    destinos: destinos.length,
  });
  comprobar('cada uno con su rótulo, que es lo que dice a qué isla va', destinos.every((o) => o.rotulo.startsWith('Mover el estiaje')), destinos[0]?.rotulo);
  /*
   * LA VACUNA: los filtros de la escena se llevan lo que SÍ saben pintar. Con la misma
   * lista de opciones de un turno normal, `opcionesFueraDelTablero` quita las de sitio, y
   * eso es lo que demuestra que la línea de arriba no está diciendo «no filtra nada
   * nunca».
   */
  const deUnTurnoNormal = opcionesEn(mesaSobre('RIB-3D-ESTIAJE-2', casiJugando, TRES), 'A');
  comprobar(
    'se ve fallar el filtro: en un turno normal, los sitios del tablero SÍ se caen de los botones',
    opcionesFueraDelTablero(deUnTurnoNormal).length < deUnTurnoNormal.length,
    { antes: deUnTurnoNormal.length, despues: opcionesFueraDelTablero(deUnTurnoNormal).length },
  );
}

/* ═══ 13. LOS DADOS: TIRAR SE OFRECE UNA VEZ, EL SELLO ES EL TURNO, Y `comprada` SIGUE SIN ESCRIBIRSE ═══ */

/*
 * ═══ QUÉ COMPRA ESTE BLOQUE ═══
 *
 * Los dados de la mesa de madera (`docs/LA-MESA-DE-RIBERAS.md` §5) son el mazo otra vez:
 * un hueco de la escena que ofrece un movimiento —TIRAR— que hasta hoy era sólo un botón.
 * Los fallos son los mismos que con COMPRAR, y se miden igual:
 *
 *  1. EL ORDEN DE LOS FILTROS. `dadosEnTres` tiene que recibir las opciones ENTERAS y
 *     `opcionesFueraDeLaMesa` filtrar DESPUÉS; al revés `porTirar` sería siempre falso y
 *     los dados no avisarían nunca de que toca tirar. Se prueba en los dos órdenes.
 *  2. FUERA DE TURNO NO SE PUEDE PULSAR: `disponible` falso para quien no tiene el turno,
 *     aunque vea los dados (los ve todo el mundo: la tirada es pública).
 *  3. EN LA COLOCACIÓN, EN LA REUNIÓN, PARA UN MIRÓN Y CON CINCO COLONOS: `null`, no
 *     apagado. Donde no hay dados el botón se queda, que es lo que salva al respaldo.
 *  4. TIRAR SE OFRECE EXACTAMENTE UNA VEZ sumando lo de la mesa y lo de los botones.
 *  5. EL SELLO es `turnosAbiertos − (tirado ? 0 : 1)`: el turno en que se tiró.
 *  6. Y `turnosAbiertos` entra en `VistaQueSePinta` SÓLO como sello: `comprada` sigue sin
 *     declararse, y el código de la traducción no lo lee ni una vez. Es lo que protege
 *     la regla de «una carta comprada no se juega hoy», y se afirma leyendo el fichero.
 */
{
  const conTirada = escenarioDeMazo({ bienes: [['sal', 'piedra', 'grano'], ['limo'], []], mazo: ['c1:guardia'] });
  const porTirar: EstadoDeRiberas = { ...conTirada, tirado: false };
  const mesaPorTirar = mesaSobre('RIB-DADOS-1', porTirar, TRES);
  const mesaTirada = mesaSobre('RIB-DADOS-2', conTirada, TRES);

  /* ── 1. EL ORDEN ── */
  const vista = vistaEn(mesaPorTirar, 'A');
  const opciones = opcionesEn(mesaPorTirar, 'A');
  comprobar('el juego ofrece TIRAR a quien tiene el turno y no ha tirado, o nada de lo de abajo mediría', opciones.some((o) => o.tipo === TIRAR), opciones.map((o) => o.tipo));
  const dados = dadosEnTres(vista, 'A', opciones);
  comprobar('con las opciones ENTERAS, los dados saben que toca tirar: `porTirar` y `disponible` encendidos', dados !== null && dados.porTirar && dados.disponible, dados);
  comprobar('y traen lo que la máquina necesita: sin tirar, con la última suma, y el sello del turno anterior (1 − 1 = 0)', dados?.tirado === false && dados?.ultimaTirada === 8 && dados?.sello === 0, dados);
  /* La opción que el asa manda: la del juego, entera, y `null` cuando ya no se ofrece. */
  const tirar = tirarEnTres(opciones);
  comprobar('`tirarEnTres` devuelve la opción TIRAR del juego, entera, con su tipo y su carga', tirar !== null && tirar.tipo === TIRAR && 'carga' in tirar, tirar?.id);
  comprobar('y `null` con la tirada ya hecha: no hay TIRAR que mandar', tirarEnTres(opcionesEn(mesaTirada, 'A')) === null && tirarEnTres([]) === null);
  const alReves = dadosEnTres(vista, 'A', opcionesFueraDeLaMesa(opciones, dados));
  comprobar(
    'AL REVÉS —filtrar antes de preguntar— `porTirar` sale falso: por eso `dadosEnTres` va primero, como `mazoEnLaBarra`',
    alReves !== null && !alReves.porTirar && dados?.porTirar === true,
    { bien: dados?.porTirar, alReves: alReves?.porTirar },
  );

  /* ── 2. FUERA DE TURNO ── */
  const dadosDeB = dadosEnTres(vistaEn(mesaPorTirar, 'B'), 'B', opcionesEn(mesaPorTirar, 'B'));
  comprobar('B ve los dados —la tirada es pública— pero no le toca: `disponible` falso', dadosDeB !== null && !dadosDeB.porTirar && !dadosDeB.disponible, dadosDeB);
  comprobar('y ve el mismo sello y la misma suma que A: los dos van a partir la suma en el mismo par', dadosDeB?.sello === dados?.sello && dadosDeB?.ultimaTirada === dados?.ultimaTirada);
  const yaTirados = dadosEnTres(vistaEn(mesaTirada, 'A'), 'A', opcionesEn(mesaTirada, 'A'));
  comprobar('con la tirada hecha, A sigue viendo los dados, apagados, con el sello de ESTE turno (1)', yaTirados !== null && !yaTirados.porTirar && yaTirados.tirado && yaTirados.sello === 1, yaTirados);
  comprobar('el sello: turno 5 tirado y turno 6 sin tirar dan 5; turno 6 tirado da 6', selloDeLaTirada(5, true) === 5 && selloDeLaTirada(6, false) === 5 && selloDeLaTirada(6, true) === 6);

  /* ── 3. DÓNDE NO HAY DADOS ── */
  comprobar('un mirón no tiene dados', dadosEnTres(vista, null, opciones) === null);
  comprobar('ni un asiento que no está en la mesa', dadosEnTres(vista, 'Z', opciones) === null);
  const reunida = abrirMesa({ id: 'RIB-DADOS-R', arcade: RIBERAS, semilla: 11, asientos: [...TRES] });
  comprobar('mientras se reúne la mesa no hay dados: `null`', dadosEnTres(proyectarRiberas(estadoDe(reunida), 'A'), 'A', opcionesDeRiberas(proyectarRiberas(estadoDe(reunida), 'A'), 'A')) === null);
  const colocando = jugar(reunida, { quien: 'A', rev: reunida.rev, movimiento: { tipo: EMPEZAR_RIBERAS, carga: {} } });
  const vistaColocando = proyectarRiberas(estadoDe(colocando), 'A');
  comprobar('en la colocación tampoco: no es que no toque tirar, es que no existe la jugada', vistaColocando.momento !== 'jugando' && dadosEnTres(vistaColocando, 'A', opcionesDeRiberas(vistaColocando, 'A')) === null, vistaColocando.momento);
  const cinco = abrirMesa({ id: 'RIB-DADOS-5', arcade: RIBERAS, semilla: 3, asientos: ['A', 'B', 'C', 'D', 'E'] });
  const cincoEmpezada = jugar(cinco, { quien: 'A', rev: cinco.rev, movimiento: { tipo: EMPEZAR_RIBERAS, carga: {} } });
  const cincoJugando: EstadoDeRiberas = { ...estadoDe(cincoEmpezada), momento: 'jugando', tirado: false, turnosAbiertos: 1 };
  const vistaDeCinco = proyectarRiberas(cincoJugando, 'A');
  comprobar('con cinco colonos no hay dados para nadie: esa mesa se juega sobre el retablo y tira con el botón', !seVeEnTres(vistaDeCinco) && dadosEnTres(vistaDeCinco, 'A', opcionesDeRiberas(vistaDeCinco, 'A')) === null);

  /* ── 4. UNA VEZ ── */
  const mazo = mazoEnLaBarra(vista, 'A', opciones);
  const botones = opcionesFueraDeLaMesa(opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones)), mazo), dados);
  const botonesSinDados = opcionesFueraDeLaMesa(opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones)), mazo), null);
  const enLaMesa = dados !== null && dados.porTirar ? 1 : 0;
  comprobar('con dados, TIRAR se cae de los botones y se ofrece en la mesa: una vez', enLaMesa + botones.filter((o) => o.tipo === TIRAR).length === 1 && enLaMesa === 1, botones.map((o) => o.id));
  comprobar('sin dados, TIRAR vuelve a los botones: también una vez', botonesSinDados.filter((o) => o.tipo === TIRAR).length === 1);
  comprobar(
    'y `opcionesFueraDeLaMesa` no se lleva nada más: cae TIRAR y sólo TIRAR',
    botonesSinDados.length === botones.length + 1 && canonico(botonesSinDados.filter((o) => o.tipo !== TIRAR).map((o) => o.id)) === canonico(botones.map((o) => o.id)),
    { con: botones.map((o) => o.id), sin: botonesSinDados.map((o) => o.id) },
  );
  comprobar('unos dados apagados (ya tirados) tampoco devuelven el botón: apagado no es «no está»', !opcionesFueraDeLaMesa(opciones, yaTirados).some((o) => o.tipo === TIRAR));

  /* ── 6. `comprada` SIGUE SIN ESCRIBIRSE ── */
  const fuente = readFileSync(new URL('../../shared/arcade/juegos/riberas-en-tres.ts', import.meta.url), 'utf8');
  const soloCodigo = (texto: string): string[] => texto.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l));
  const interfaz = /interface VistaQueSePinta \{([\s\S]*?)\n\}/.exec(fuente)?.[1] ?? '';
  const codigoDeLaInterfaz = soloCodigo(interfaz).join('\n');
  comprobar('se sabe leer `VistaQueSePinta`, o lo de abajo no miraría nada', interfaz.length > 0 && /readonly misCartas\?:/.test(codigoDeLaInterfaz));
  comprobar(
    '`tirado`, `ultimaTirada` y `turnosAbiertos` están declarados, opcionales, para que los dados los lean sin `as`',
    /readonly tirado\?: boolean;/.test(codigoDeLaInterfaz) && /readonly ultimaTirada\?: number;/.test(codigoDeLaInterfaz) && /readonly turnosAbiertos\?: number;/.test(codigoDeLaInterfaz),
  );
  comprobar('y `comprada` NO: sin él nadie puede compararlo con `turnosAbiertos` y reescribir la regla de «comprada hoy no se juega hoy»', !/\bcomprada\b/.test(codigoDeLaInterfaz));
  const codigo = soloCodigo(fuente).join('\n');
  comprobar('el código de la traducción no lee `comprada` ni una vez', !/\.comprada\b/.test(codigo) && !/\bcomprada\b\s*[<>=!]/.test(codigo));
  const lecturas = codigo.match(/vista\.turnosAbiertos/g) ?? [];
  comprobar('y lee `vista.turnosAbiertos` exactamente una vez, dentro de `dadosEnTres`, como sello', lecturas.length === 1 && /selloDeLaTirada\(vista\.turnosAbiertos \?\? 0, tirado\)/.test(codigo), lecturas.length);
}

/* ═══ EL RECUENTO, PARA QUE NO SE VACÍE SIN QUE NADIE LO NOTE ═══ */
const MINIMO = 330;
if (hechas < MINIMO) {
  console.log(`✘ este comprobador debería hacer al menos ${MINIMO} comprobaciones y ha hecho ${hechas}: alguien ha borrado un bloque`);
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(`✔ riberas-en-tres: ${hechas} comprobaciones — la escena dice lo mismo que las reglas`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
