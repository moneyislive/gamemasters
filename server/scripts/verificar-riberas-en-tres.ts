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
 * ═══ LAS VACUNAS ═══
 *
 * Cada bloque comprueba también que la traducción SE VE FALLAR: una vista que no
 * es de Riberas devuelve `null` y no un tablero vacío, un mirón sin asiento no
 * tiene barra, una pieza que no se puede poner devuelve `null` en vez de un
 * anillo sin sitios, y la mano de otro no se puede pedir por ninguna puerta.
 */
import { abrirMesa, jugar } from '../src/arcade/arbitro';
import type { Mesa } from '../src/arcade/arbitro';
import { aristaDeHex, verticeDeHex } from '../../shared/mecanicas/malla-hexagonal';
import '../../shared/arcade/juegos';
import {
  ACAPARAMIENTO,
  ALZAR,
  ANO_BUENO,
  BIENES,
  bienDeLaFicha,
  claseDeLaCarta,
  CLASES_DE_CARTA,
  COMPRAR,
  DOS_VEREDAS,
  EMPEZAR_RIBERAS,
  esTitulo,
  FUNDAR,
  GUARDIA,
  OFRECER,
  opcionesDeRiberas,
  PASAR,
  proyectarRiberas,
  recalcularLaGuardia,
  REVELAR,
  RIBERAS,
  TIRAR,
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
  cartasEnTres,
  colocandoEnTres,
  comprarEnTres,
  esVistaQueSePinta,
  jugadaSinPreguntar,
  jugadasDeLaCarta,
  manoEnTres,
  marcadorEnTres,
  meToca,
  opcionesFueraDeLaMano,
  opcionesFueraDelTablero,
  paresDelAnoBueno,
  retratoDeLaCarta,
  revelarDe,
  seVeEnTres,
  tableroEnTres,
  TIPOS_QUE_PINTA_LA_MANO,
  truequesPosibles,
} from '../../shared/arcade/juegos/riberas-en-tres';
import type { CartaDelMazoEnTres } from '../../shared/arcade/juegos/riberas-en-tres';
import { COLORES_EN_3D } from '../../shared/arcade/juegos/riberas-en-3d';
/*
 * LA ESCENA DE VERDAD, Y NO UNA COPIA DE SUS NÚMEROS.
 *
 * `escenas/cartas.ts` es aritmética pura —lo dice su cabecera: sin `three` y sin
 * React, para que un guion de Node pueda pedirle el reparto— y `escenas/iconos.ts`
 * son datos. Meterlos aquí es lo que convierte «la traducción dice `dibujo: faro`»
 * en «hay un contorno llamado `faro`», que es la afirmación que importa.
 */
import {
  FAMILIA_DE_LOS_TITULOS,
  huecosDeLasCartas,
  ORDEN_DE_LAS_FAMILIAS,
  puertasDeLaCarta,
} from '../../escenas/cartas';
import type { CartaDelMazo } from '../../escenas/cartas';
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
  comprobar('no hay ladrón en Riberas', tablero?.ladron === null);
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
 */
function escenarioDeMazo(monta: {
  bienes: readonly (readonly Bien[])[];
  mazo?: readonly CartaDeRiberas[];
  manos?: readonly (readonly CartaEnMano[])[];
  guardias?: readonly number[];
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
      veredas: [aristaDeHex({ q: i * 2 - 2, r: 0 }, 0)],
    })),
  };
  /* El premio es derivado: se recalcula, no se escribe. Es la regla, no un campo. */
  return { ...puesto, guardia: recalcularLaGuardia(puesto) };
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
  partida = mover(partida, 'B', opcionesEn(partida, 'B').find((o) => o.tipo === TIRAR) as Opcion);
  partida = mover(partida, 'B', opcionesEn(partida, 'B').find((o) => o.tipo === PASAR) as Opcion);
  partida = mover(partida, 'A', opcionesEn(partida, 'A').find((o) => o.tipo === TIRAR) as Opcion);

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
  const sueltas = opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones));
  comprobar('hay cartas que pintar y obra que ofrecer, o esto no comprobaría nada', enLaMano > 0 && enElTablero > 0, { enLaMano, enElTablero });
  comprobar(
    'lo del tablero, lo de la mano y los botones suman las opciones: ni una dos veces, ni una perdida',
    sueltas.length + enElTablero + enLaMano === opciones.length,
    { sueltas: sueltas.length, enElTablero, enLaMano, todas: opciones.length },
  );
  comprobar('ningún botón es de los que pinta la mano', sueltas.every((o) => !TIPOS_QUE_PINTA_LA_MANO.includes(o.tipo)), sueltas.map((o) => o.id));
  comprobar(
    'COMPRAR SIGUE SIENDO UN BOTÓN: no es una carta de la mano y no hay mazo que pulsar',
    sueltas.some((o) => o.tipo === COMPRAR) && comprarEnTres(sueltas) !== null,
    sueltas.map((o) => o.id),
  );
  comprobar('y pasar también', sueltas.some((o) => o.tipo === PASAR));
  comprobar(
    'la función de siempre NO quita las del mazo, para no dejar sin cartas a quien todavía no pinta la mano',
    opcionesFueraDelTablero(opciones).some((o) => o.tipo === GUARDIA || o.tipo === REVELAR),
  );
  comprobar('los cuatro que gastan la jugada del turno y revelar son los que pinta la mano', canonico([...TIPOS_QUE_PINTA_LA_MANO].sort()) === canonico([ACAPARAMIENTO, ANO_BUENO, DOS_VEREDAS, GUARDIA, REVELAR].sort()), TIPOS_QUE_PINTA_LA_MANO);
  comprobar('y comprar no está entre ellos', !TIPOS_QUE_PINTA_LA_MANO.includes(COMPRAR));
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
  const pobre = marcadorEnTres(sinMazo);
  comprobar('y su marcador sale con ceros y sin premios, que es la verdad', pobre?.mazo === 0 && pobre?.vado === null && pobre?.mayorGuardia === null, pobre);
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

/* ═══ EL RECUENTO, PARA QUE NO SE VACÍE SIN QUE NADIE LO NOTE ═══ */
const MINIMO = 145;
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
