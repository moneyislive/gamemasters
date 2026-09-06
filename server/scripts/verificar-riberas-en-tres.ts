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
import { abrirMesa, jugar } from '../src/arcade/arbitro';
import type { Mesa } from '../src/arcade/arbitro';
import { aristaDeHex, verticeDeHex } from '../../shared/mecanicas/malla-hexagonal';
import type { LlaveDeArista } from '../../shared/mecanicas/malla-hexagonal';
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
  cartasEnTres,
  colocandoEnTres,
  comprarEnTres,
  dadosEnTres,
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
  colorDeLaFamilia,
  COLOR_SIN_FAMILIA,
  FAMILIA_DE_LOS_TITULOS,
  huecosDeLasCartas,
  ORDEN_DE_LAS_FAMILIAS,
  puertasDeLaCarta,
} from '../../escenas/cartas';
import type { CartaDelMazo } from '../../escenas/cartas';
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
const MINIMO = 293;
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
