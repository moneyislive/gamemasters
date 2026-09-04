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
 * tiene sal. Nada se cae; se juega mal.
 *
 * Por eso aquí NO se comprueba contra vistas inventadas: se abre una mesa de
 * verdad con el árbitro, se empieza, se funda y se alza, y a cada paso se mira que
 * lo que la escena recibiría coincide, uno a uno, con lo que `opcionesDeRiberas`
 * ofrece. La única vista montada a mano es la del trueque, y se monta con el
 * mismo escenario que usa `verify:riberas`, porque llegar a un trueque jugando
 * exige tirar los dados y el azar no es cosa de un comprobador.
 *
 * ═══ LAS VACUNAS ═══
 *
 * Cada bloque comprueba también que la traducción SE VE FALLAR: una vista que no
 * es de Riberas devuelve `null` y no un tablero vacío, un mirón sin asiento no
 * tiene barra, y una pieza que no se puede poner devuelve `null` en vez de un
 * anillo sin sitios.
 */
import { abrirMesa, jugar } from '../src/arcade/arbitro';
import type { Mesa } from '../src/arcade/arbitro';
import { aristaDeHex, verticeDeHex } from '../../shared/mecanicas/malla-hexagonal';
import '../../shared/arcade/juegos';
import {
  ALZAR,
  EMPEZAR_RIBERAS,
  FUNDAR,
  OFRECER,
  opcionesDeRiberas,
  PASAR,
  proyectarRiberas,
  RIBERAS,
  TIRAR,
} from '../../shared/arcade/juegos';
import type { Bien, EstadoDeRiberas, Ficha } from '../../shared/arcade/juegos';
import {
  barraEnTres,
  BIEN_EN_LA_ESCENA,
  bienDeRiberas,
  bienesQueSeCambianPor,
  colocandoEnTres,
  esVistaQueSePinta,
  manoEnTres,
  meToca,
  opcionesFueraDelTablero,
  tableroEnTres,
  truequesPosibles,
} from '../../shared/arcade/juegos/riberas-en-tres';

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
    'el poblado y la ciudad llevan el color del colono en el nombre del modelo, y el puente no',
    porId['poblado']?.modelo === 'poblado-blue' && porId['ciudad']?.modelo === 'ciudad-blue' && porId['puente']?.modelo === 'puente',
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
    'y el delta enseña la choza como poblado azul en ese vértice',
    tableroFundado !== null &&
      tableroFundado.piezas.length === 1 &&
      tableroFundado.piezas[0]?.vertice === primerSitio &&
      tableroFundado.piezas[0]?.clase === 'poblado' &&
      tableroFundado.piezas[0]?.color === 'blue',
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
    'y el delta la enseña como camino con el color hexadecimal del colono',
    tableroAlzado !== null &&
      tableroAlzado.caminos.length === 1 &&
      tableroAlzado.caminos[0]?.arista === sitioDeVereda &&
      /^#[0-9a-f]{6}$/i.test(tableroAlzado.caminos[0]?.color ?? ''),
    tableroAlzado?.caminos,
  );

  /* La serpentina pasa a B: A se apaga, B se enciende. */
  const vistaB2 = proyectarRiberas(estadoDe(alzada), 'B');
  comprobar('ahora le toca a B', meToca(vistaB2) && !meToca(proyectarRiberas(estadoDe(alzada), 'A')));
  comprobar('B ve el poblado como el segundo color del pack', barraEnTres(vistaB2, 'B').find((p) => p.id === 'poblado')?.modelo === 'poblado-red');
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
  comprobar('y los bienes van traducidos al idioma de la escena', mano.map((c) => c.bien).join(',') === 'madera,ladrillo,madera', mano);
  comprobar(
    'la traducción va y vuelve para los cinco bienes',
    (['limo', 'junco', 'sal', 'piedra', 'grano'] as const).every((b) => bienDeRiberas(BIEN_EN_LA_ESCENA[b] as string) === b),
  );
  comprobar('un bien que la escena no conoce pasa tal cual, sin romper', bienDeRiberas('ambar') === 'ambar');

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

/* ═══ 4. VACUNAS: LO QUE NO ES DE RIBERAS NO SE PINTA ═══ */
{
  const ajena = { desde: 'frente', momento: 'jugando', colonos: [], islas: [{}] };
  comprobar('una vista de otro juego no se pinta', esVistaQueSePinta(ajena) === false && tableroEnTres(ajena) === null);
  comprobar('ni tiene barra, mano ni turno', barraEnTres(ajena, 'A').length === 0 && manoEnTres(ajena).length === 0 && meToca(ajena) === false);
  comprobar('ni trueques', bienesQueSeCambianPor(ajena, [], 'junco').length === 0 && truequesPosibles(ajena, [], 'junco', 'sal').length === 0);
  comprobar('`null` y `undefined` tampoco', tableroEnTres(null) === null && tableroEnTres(undefined) === null);
  const rota = { desde: 'riberas', momento: 'jugando', colonos: [], islas: [], misFichas: ['sinbien', 'b1:', ':grano', 'b2:sal'] };
  comprobar('una ficha sin la forma `serie:bien` se salta en vez de romper la mano', manoEnTres(rota).map((c) => c.bien).join(',') === 'grano,lana', manoEnTres(rota));
}

/* ═══ EL RECUENTO, PARA QUE NO SE VACÍE SIN QUE NADIE LO NOTE ═══ */
const MINIMO = 55;
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
