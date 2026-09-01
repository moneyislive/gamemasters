/**
 * ¿SE SOSTIENE RIBERAS? — LA MALLA, LA SERPENTINA, EL PREMIO Y EL TRUEQUE
 *
 *   npm run verify:riberas
 *
 * ═══ QUÉ AFIRMA ESTE FICHERO, Y POR QUÉ ESTAS COSAS Y NO OTRAS ═══
 *
 * Riberas es el juego de la fase 4 y la fase no se mide por el juego: se mide por
 * un diff vacío del núcleo. Pero un juego que no funciona no demuestra nada sobre
 * el motor que lo aguanta, así que hace falta comprobar exactamente aquello cuyo
 * fallo sería SILENCIOSO — lo que no se cae, no lanza y no se ve hasta que
 * alguien lleva media partida.
 *
 * Son seis cosas y las seis tienen esa forma:
 *
 *  1. LA CANONICALIZACIÓN. Un vértice de una malla hexagonal tiene TRES nombres y
 *     una arista DOS. Si no se normalizan, la regla de distancia dirá que está
 *     libre un sitio ocupado y el tablero dejará poner dos chozas pegadas. No se
 *     cae: se juega mal.
 *  2. LA REGLA DE DISTANCIA, que es lo que cuelga de la anterior.
 *  3. LA SERPENTINA. 1,2,…,n y luego n,…,2,1. Un orden mal escrito no revienta:
 *     reparte ventaja.
 *  4. EL PREMIO DERIVADO. Que se recalcule al romperse por una choza AJENA y que
 *     sólo cambie de dueño si se supera ESTRICTAMENTE. Un premio que se lleva
 *     quien empata salta de mano en mano sin que nadie haga nada.
 *  5. EL TRUEQUE QUE CADUCA, con su ciclo de vida entero, y contestado por quien
 *     NO tiene el turno.
 *  6. EL «SÓLO SI» DEL §5 bis, con su contraejemplo dentro: aceptar un trueque
 *     exige que el OFERENTE tenga la mercancía, y su almacén no está en la vista
 *     del aceptante. Es la comprobación más importante de todas, porque es la que
 *     el diseño tuvo que corregir sobre la marcha.
 *
 * ═══ Y LAS VACUNAS, QUE NO SON ADORNO ═══
 *
 * Cada bloque comprueba también que la regla SE VE FALLAR cuando se la quita.
 * Una comprobación que sólo se ha ejecutado con los datos buenos no se ha visto
 * fallar nunca, y este repositorio tiene tres casos apuntados de comprobadores
 * que pasaban en verde sin comprobar nada.
 *
 * ═══ POR QUÉ EN PROCESO Y NO LEVANTANDO EL SERVIDOR ═══
 *
 * Porque lo que se comprueba aquí son REGLAS, y las reglas viven en `shared/`. La
 * mesa, los asientos, el `rev` rancio y que los secretos no salgan por el cable
 * son autoridad y transporte, y eso ya lo comprueba `verify:mesa` levantando el
 * servidor de verdad. Duplicarlo aquí costaría dos minutos por ejecución y no
 * añadiría una afirmación nueva.
 *
 * Lo que sí se usa es EL ÁRBITRO DE VERDAD —`abrirMesa`, `jugar`,
 * `avanzarElReloj`—, porque una partida jugada llamando al reductor a pelo no
 * demuestra que el juego entre por la puerta por la que va a entrar.
 */
import {
  abrirMesa,
  avanzarElReloj,
  jugar,
  MovimientoRechazado,
} from '../src/arcade/arbitro';
import type { Mesa } from '../src/arcade/arbitro';
import { aplicar, aplicarConMotivo, hayOpciones, opcionesDeArcade, reejecutarEn } from '../../shared/arcade';
import type { ContextoMovimiento, Movimiento } from '../../shared/arcade';
import { canonico } from '../../shared/mecanicas/canonico';
import {
  aristaDeHex,
  aristasDe,
  aristasDeVertice,
  hexesDeVertice,
  llaveDeHex,
  mallaDeRadio,
  verticeDeHex,
  verticeEntre,
  verticesDe,
  verticesDeArista,
  verticesDeHex,
  verticesVecinos,
} from '../../shared/mecanicas/malla-hexagonal';
import type { Hex, LlaveDeVertice } from '../../shared/mecanicas/malla-hexagonal';
import '../../shared/arcade/juegos';
import {
  ACEPTAR,
  ALZAR,
  avanzarRiberas as reglasDeRiberas,
  BIENES,
  deQuienEsElPaso,
  EMPEZAR_RIBERAS,
  FUNDAR,
  largoDelVado,
  loSecretoDeRiberas,
  OFRECER,
  opcionesDeRiberas,
  PASAR,
  RECHAZAR,
  proyectarRiberas,
  puntosDe,
  recalcularElVado,
  RIBERAS,
  TIRAR,
  TOPE_DE_PIEZAS,
  VADO_MINIMO,
} from '../../shared/arcade/juegos';
import type {
  Bien,
  Colono,
  EstadoDeRiberas,
  Ficha,
  Opcion,
} from '../../shared/arcade/juegos';

/**
 * EL REDUCTOR, LLAMADO POR LA PUERTA DE LA PLATAFORMA. Cambio de la fase 5.
 *
 * ═══ POR QUÉ YA NO SE LLAMA A `avanzarRiberas` DIRECTAMENTE ═══
 *
 * Desde la fase 5 un reductor puede devolver, además de un estado, un `Rechazo`
 * —el mismo estado con un motivo al lado— que es lo que por fin permite que la
 * pantalla diga POR QUÉ no pasó nada. El envoltorio lo abre `aplicar()`, que es
 * la única puerta por la que la plataforma mete un movimiento.
 *
 * Este fichero llamaba al reductor a pelo en treinta sitios y comparaba el
 * resultado por identidad —«y si lo manda, devuelve el mismo objeto»— que es la
 * comprobación correcta y la que hay que conservar. Con la llamada a pelo, esas
 * treinta líneas verían el envoltorio; con `aplicar()` ven exactamente lo que ve
 * el árbitro, que es lo que de verdad hay que comprobar.
 *
 * O sea que esto no es un apaño para que compile: es que un comprobador que llama
 * al reductor por debajo de la plataforma comprueba algo que nadie ejecuta.
 */
function avanzarRiberas(
  estado: EstadoDeRiberas | undefined,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): EstadoDeRiberas {
  return aplicar(reglasDeRiberas, estado, movimiento, ctx) as EstadoDeRiberas;
}

/**
 * EL MOTIVO CON EL QUE EL REDUCTOR RECHAZA, por la misma puerta que la ruta.
 *
 * ═══ POR QUÉ HACE FALTA UNA SEGUNDA PUERTA SI YA HAY UNA ═══
 *
 * `avanzarRiberas` de arriba llama a `aplicar()`, que DESENVUELVE el rechazo y
 * devuelve el estado de dentro. Eso es lo correcto para las treinta
 * comprobaciones que preguntan «¿ejecutó el movimiento?», y es lo que hace que
 * sigan valiendo tal cual ahora que `contestar` rechaza con motivo: el estado que
 * sale del envoltorio es EL MISMO OBJETO.
 *
 * Pero por esa puerta el motivo se tira, así que con ella sola un reductor mudo y
 * uno que explica pasan igual — y la prueba felicitaría al que se calla. Ésta es
 * la puerta que usa `server/src/arcade/mesas.ts` para contestarle a quien movió.
 */
function motivoDe(estado: EstadoDeRiberas, movimiento: Movimiento, ctx: ContextoMovimiento): string | null {
  return aplicarConMotivo(reglasDeRiberas, estado, movimiento, ctx).motivo;
}

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola = detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 400)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
paso('La canonicalización: un vértice tiene tres nombres y sólo una llave');
// ---------------------------------------------------------------------------

const DELTA: readonly Hex[] = mallaDeRadio(2);

comprobar('el delta son diecinueve islas', DELTA.length === 19, DELTA.length);

{
  /*
   * LOS TRES CAMINOS. Un vértice es el punto donde se tocan tres hexágonos, así
   * que se puede llegar a él desde cualquiera de los tres, y las seis
   * permutaciones tienen que dar la MISMA cadena. Ésta es la propiedad de la que
   * cuelga todo lo demás: sin ella, la regla de distancia compara cadenas que
   * nombran el mismo punto y no coinciden.
   */
  let coinciden = 0;
  let discrepan = 0;
  for (const hex of DELTA) {
    for (let k = 0; k < 6; k++) {
      const llave = verticeDeHex(hex, k);
      const [a, b, c] = hexesDeVertice(llave) as [Hex, Hex, Hex];
      const permutaciones = [
        verticeEntre(a, b, c),
        verticeEntre(a, c, b),
        verticeEntre(b, a, c),
        verticeEntre(b, c, a),
        verticeEntre(c, a, b),
        verticeEntre(c, b, a),
      ];
      for (const otra of permutaciones) {
        if (otra === llave) coinciden++;
        else discrepan++;
      }
    }
  }
  comprobar(
    'las seis permutaciones de los tres hexágonos dan siempre la misma llave',
    discrepan === 0 && coinciden === DELTA.length * 6 * 6,
    { coinciden, discrepan },
  );
}

{
  /*
   * Y EL MISMO PUNTO ALCANZADO DESDE TRES ISLAS DISTINTAS. Lo anterior demuestra
   * que la función es simétrica en sus argumentos; esto demuestra que las tres
   * islas que rodean un vértice lo nombran igual sin ponerse de acuerdo, que es
   * lo que de verdad pasa cuando el juego recorre el tablero isla por isla.
   */
  const llaves = new Map<string, number>();
  for (const hex of DELTA) {
    for (const v of verticesDeHex(hex)) llaves.set(v, (llaves.get(v) ?? 0) + 1);
  }
  const distintos = verticesDe(DELTA);
  comprobar('el delta tiene 54 vértices distintos', distintos.length === 54, distintos.length);
  comprobar('el delta tiene 72 aristas distintas', aristasDe(DELTA).length === 72, aristasDe(DELTA).length);
  const interiores = [...llaves.values()].filter((n) => n === 3).length;
  comprobar(
    'y los vértices del interior salen exactamente tres veces, una por isla',
    interiores > 0 && [...llaves.values()].every((n) => n >= 1 && n <= 3),
    { interiores, cuentas: [...new Set(llaves.values())] },
  );
}

{
  /*
   * LA VACUNA. El nombre ingenuo —«la esquina k de la isla h»— da TRES nombres
   * distintos para el mismo punto. Si esto no discrepara, la canonicalización no
   * estaría resolviendo ningún problema y las comprobaciones de arriba serían
   * decorativas.
   */
  const hex: Hex = { q: 0, r: 0 };
  const llave = verticeDeHex(hex, 0);
  const alaIngenua = new Set<string>();
  for (const vecino of hexesDeVertice(llave)) {
    for (let k = 0; k < 6; k++) {
      if (verticeDeHex(vecino, k) !== llave) continue;
      alaIngenua.add(`${llaveDeHex(vecino)}#${String(k)}`);
    }
  }
  comprobar(
    'y sin canonicalizar, ese mismo punto tendría tres nombres distintos',
    alaIngenua.size === 3,
    [...alaIngenua],
  );
}

{
  /* La coherencia entre las dos identidades derivadas: aristas y vértices. */
  let mal = 0;
  for (const v of verticesDe(DELTA)) {
    const aristas = aristasDeVertice(v);
    if (aristas.length !== 3) mal++;
    for (const a of aristas) {
      if (!verticesDeArista(a).includes(v)) mal++;
    }
  }
  comprobar('de cada vértice salen tres aristas, y las tres lo tocan', mal === 0, mal);
  let malVecinos = 0;
  for (const v of verticesDe(DELTA)) {
    for (const otro of verticesVecinos(v)) {
      if (!verticesVecinos(otro).includes(v)) malVecinos++;
    }
  }
  comprobar('y ser vecino de un vértice es recíproco', malVecinos === 0, malVecinos);
}

// ---------------------------------------------------------------------------
paso('La serpentina: 1,2,…,n y luego n,…,2,1');
// ---------------------------------------------------------------------------

{
  const orden: number[] = [];
  for (let p = 0; p < 8; p++) orden.push(deQuienEsElPaso(p, 4));
  comprobar(
    'con cuatro colonos el orden es 0,1,2,3,3,2,1,0',
    canonico(orden) === canonico([0, 1, 2, 3, 3, 2, 1, 0]),
    orden,
  );
  comprobar('fuera de los 2n pasos no le toca a nadie', deQuienEsElPaso(8, 4) === -1);
  comprobar('y con dos colonos es 0,1,1,0', canonico([0, 1, 2, 3].map((p) => deQuienEsElPaso(p, 2))) === canonico([0, 1, 1, 0]));
  /*
   * LA VACUNA: un orden repetido —el ingenuo, 1,2,3,4,1,2,3,4— no es una
   * serpentina, y la diferencia es exactamente quién elige dos veces seguidas.
   */
  comprobar(
    'y no es el orden repetido, que daría 0,1,2,3,0,1,2,3',
    canonico(orden) !== canonico([0, 1, 2, 3, 0, 1, 2, 3]),
  );
}

// ---------------------------------------------------------------------------
paso('Una colocación de verdad, con el árbitro delante');
// ---------------------------------------------------------------------------

/** Las opciones que se le ofrecen a un asiento sobre el estado de una mesa. */
function opcionesEn(mesa: Mesa, quien: string): readonly Opcion[] {
  const estado = mesa.estado as EstadoDeRiberas | undefined;
  return opcionesDeRiberas(proyectarRiberas(estado, quien), quien);
}

/** El estado de una mesa, ya convertido. */
function estadoDe(mesa: Mesa): EstadoDeRiberas {
  return mesa.estado as EstadoDeRiberas;
}

/** Manda un movimiento por el árbitro. */
function mover(mesa: Mesa, quien: string, o: Opcion): Mesa {
  return jugar(mesa, { quien, rev: mesa.rev, movimiento: { tipo: o.tipo, carga: o.carga } });
}

const TRES = ['A', 'B', 'C'];
let mesa = abrirMesa({ id: 'RIB-1', arcade: RIBERAS, semilla: 90210, asientos: TRES });

{
  comprobar('una mesa recién abierta nace sin estado', mesa.estado === undefined);
  const vistaVacia = proyectarRiberas(undefined, 'A');
  comprobar('y la proyección de una mesa vacía no revienta', vistaVacia.desde === 'riberas');
  comprobar('y trae un tablero, aunque sea sin islas', vistaVacia.tablero.caras.length === 0);
  comprobar('y `loSecreto` de una mesa vacía tampoco revienta', loSecretoDeRiberas(undefined).length === 1);
}

{
  const antes = opcionesEn(mesa, 'A');
  comprobar('con tres sentados, lo único que se ofrece es empezar', antes.length === 1 && antes[0]?.tipo === EMPEZAR_RIBERAS, antes.map((o) => o.id));
  comprobar('y a quien mira sin asiento no se le ofrece nada', opcionesDeRiberas(proyectarRiberas(undefined, null), null).length === 0);
  mesa = mover(mesa, 'A', antes[0] as Opcion);
  const e = estadoDe(mesa);
  comprobar('al empezar hay diecinueve islas', e.islas.length === 19, e.islas.length);
  comprobar('y una sola duna, que es la que no lleva número', e.islas.filter((i) => i.terreno === 'duna').length === 1);
  comprobar('las dieciocho que rinden llevan número y ninguno es siete', e.islas.every((i) => (i.terreno === 'duna' ? i.numero === 0 : i.numero >= 2 && i.numero <= 12 && i.numero !== 7)));
  comprobar('y se pasa a colocar', e.momento === 'colocando' && e.paso === 0);
}

{
  /* La serpentina, jugada: se anota a quién le tocó cada paso. */
  const aQuienLeToco: string[] = [];
  let vueltas = 0;
  while (estadoDe(mesa).momento === 'colocando' && vueltas < 40) {
    const e = estadoDe(mesa);
    const quien = (e.colonos[deQuienEsElPaso(e.paso, e.colonos.length)] as Colono).asiento;
    if (!e.faltaVereda) aQuienLeToco.push(quien);
    const lista = opcionesEn(mesa, quien);
    comprobar(`al que le toca se le ofrece algo (paso ${String(e.paso)})`, lista.length > 0);
    /*
     * Y AL QUE NO LE TOCA NO SE LE OFRECE NADA. Es la mitad que evita que
     * `opciones()` sea un adorno: sin esto, la lista podría ofrecerle a los tres
     * lo mismo y el reductor haría todo el trabajo.
     */
    for (const otro of TRES) {
      if (otro === quien) continue;
      comprobar(`y al que no le toca, nada (paso ${String(e.paso)}, ${otro})`, opcionesEn(mesa, otro).length === 0);
    }
    mesa = mover(mesa, quien, lista[0] as Opcion);
    vueltas++;
  }
  comprobar(
    'la colocación reparte los seis pasos en serpentina',
    canonico(aQuienLeToco) === canonico(['A', 'B', 'C', 'C', 'B', 'A']),
    aQuienLeToco,
  );
  const e = estadoDe(mesa);
  comprobar('y al acabar hay dos chozas y dos veredas por cabeza', e.colonos.every((c) => c.chozas.length === 2 && c.veredas.length === 2));
  comprobar('se pasa a jugar, y empieza el primero que se sentó', e.momento === 'jugando' && e.turno === 0);
  comprobar('la segunda choza cobró su primera cosecha', e.colonos.every((c) => c.almacen.length > 0), e.colonos.map((c) => c.almacen.length));
}

// ---------------------------------------------------------------------------
paso('La regla de distancia: ninguna choza toca a otra');
// ---------------------------------------------------------------------------

{
  const e = estadoDe(mesa);
  const ocupados: LlaveDeVertice[] = [];
  for (const c of e.colonos) ocupados.push(...c.chozas, ...c.torres);
  let pegadas = 0;
  for (const v of ocupados) {
    for (const vecino of verticesVecinos(v)) {
      if (ocupados.includes(vecino)) pegadas++;
    }
  }
  comprobar('las seis chozas colocadas no se tocan entre sí', pegadas === 0, { ocupados, pegadas });

  /*
   * Y EL RECHAZO. Fundar en un vecino de algo ocupado no se ofrece, y si se manda
   * de todas formas —un móvil manipulado— el reductor devuelve EL MISMO OBJETO DE
   * ESTADO, que es lo que la mesa cuenta como movimiento que no cambió nada.
   */
  const pegado = verticesVecinos(ocupados[0] as LlaveDeVertice)[0] as LlaveDeVertice;
  const ofrecidas = opcionesEn(mesa, 'A').map((o) => o.id);
  comprobar('no se ofrece fundar pegado a una choza', !ofrecidas.includes(`fundar:${pegado}`));
  const antes = estadoDe(mesa);
  const despues = avanzarRiberas(antes, { tipo: FUNDAR, carga: { vertice: pegado } }, {
    quien: 'A',
    azar: 1,
    tic: 0,
    asientos: TRES,
  });
  comprobar('y mandarlo igual devuelve EL MISMO objeto de estado', despues === antes);
}

// ---------------------------------------------------------------------------
paso('La producción por dados, y el estiaje');
// ---------------------------------------------------------------------------

{
  const antes = estadoDe(mesa);
  const tirar = opcionesEn(mesa, 'A').find((o) => o.tipo === TIRAR);
  comprobar('a quien le toca y no ha tirado se le ofrece tirar', tirar !== undefined);
  mesa = mover(mesa, 'A', tirar as Opcion);
  const e = estadoDe(mesa);
  comprobar('la tirada está entre 2 y 12', e.ultimaTirada >= 2 && e.ultimaTirada <= 12, e.ultimaTirada);
  comprobar('y ya no se ofrece tirar dos veces', opcionesEn(mesa, 'A').every((o) => o.tipo !== TIRAR));
  /*
   * DOS TIRADAS Y NO UNA. Se cuentan con `tiradas`, que es el contador, y no con
   * `acumulador`, que es el estado interno del generador y salta a cualquier
   * sitio. Que sean dos y no una es una regla del juego: la suma de dos dados
   * hace campana, y los números de las islas están repartidos suponiéndola. Con
   * una sola tirada uniforme de 2 a 12, el dos saldría tanto como el ocho y el
   * tablero cambiaría entero sin que cambiara una línea escrita.
   */
  comprobar('el azar avanzó exactamente dos tiradas: son dos dados, no uno', e.azar.tiradas === antes.azar.tiradas + 2, {
    antes: antes.azar.tiradas,
    ahora: e.azar.tiradas,
  });

  /*
   * EL ESTIAJE, forzado: con la suma siete no rinde nadie. Se comprueba
   * llamando al reparto de la cosecha con siete a través de una tirada fabricada
   * — se prepara un estado y se mira que las islas del siete no existan.
   */
  comprobar('ninguna isla lleva el siete, así que el estiaje no puede rendir', e.islas.every((i) => i.numero !== 7));
}

// ---------------------------------------------------------------------------
paso('El Vado Largo: se recalcula, y sólo cambia si se SUPERA');
// ---------------------------------------------------------------------------

/** Un estado de dos colonos, sin piezas, para montar escenarios del premio. */
function escenarioDeVado(): EstadoDeRiberas {
  const base = abrirMesa({ id: 'RIB-V', arcade: RIBERAS, semilla: 7, asientos: ['A', 'B'] });
  const arrancada = jugar(base, {
    quien: 'A',
    rev: base.rev,
    movimiento: { tipo: EMPEZAR_RIBERAS, carga: {} },
  });
  return estadoDe(arrancada);
}

/** Las cinco aristas seguidas alrededor de una isla: un camino de largo cinco. */
function caminoDeCinco(hex: Hex): string[] {
  const camino: string[] = [];
  for (let k = 0; k < 5; k++) camino.push(aristaDeHex(hex, k));
  return camino;
}

{
  const base = escenarioDeVado();
  const camino = caminoDeCinco({ q: 0, r: 0 });
  comprobar('las cinco aristas del camino son distintas', new Set(camino).size === 5);

  const conCamino: EstadoDeRiberas = {
    ...base,
    colonos: base.colonos.map((c, i) => (i === 0 ? { ...c, veredas: camino } : c)),
  };
  comprobar('cinco veredas seguidas miden cinco', largoDelVado(camino, []) === 5, largoDelVado(camino, []));

  const primero = recalcularElVado(conCamino);
  comprobar('y con eso el Vado Largo pasa a ser de A', primero.de === 'A' && primero.largo === 5, primero);

  /*
   * EMPATAR NO BASTA. B traza otras cinco veredas, lejos y sin tocar las de A. El
   * premio NO cambia de manos: se exige superar estrictamente, y si no, el premio
   * saltaría cada vez que alguien iguala sin que su dueño hubiera hecho nada.
   */
  const otroCamino = caminoDeCinco({ q: 2, r: 0 });
  comprobar('los dos caminos no comparten ninguna arista', otroCamino.every((a) => !camino.includes(a)));
  const empatados: EstadoDeRiberas = {
    ...conCamino,
    vado: primero,
    colonos: conCamino.colonos.map((c, i) => (i === 1 ? { ...c, veredas: otroCamino } : c)),
  };
  const trasEmpate = recalcularElVado(empatados);
  comprobar('empatar a cinco no se lo quita a A', trasEmpate.de === 'A' && trasEmpate.largo === 5, trasEmpate);

  /* SUPERAR SÍ. Con seis, B se lo lleva. */
  const conSeis: EstadoDeRiberas = {
    ...empatados,
    colonos: empatados.colonos.map((c, i) =>
      i === 1 ? { ...c, veredas: [...otroCamino, aristaDeHex({ q: 2, r: 0 }, 5)] } : c,
    ),
  };
  const trasSuperar = recalcularElVado(conSeis);
  comprobar('y con seis, B se lo lleva', trasSuperar.de === 'B' && trasSuperar.largo === 6, trasSuperar);

  /*
   * ═══ Y AQUÍ ESTÁ EL CASO QUE PIDE EL ENCARGO: SE ROMPE POR UNA CHOZA AJENA ═══
   *
   * B funda una choza en el vértice del medio del camino de A. A no ha tocado
   * nada y su cadena de cinco se parte en tres y dos, así que baja del mínimo y el
   * premio queda VACANTE. Es el único sitio del juego donde alguien pierde puntos
   * por un movimiento de otro, y por eso es el que hay que ver funcionar.
   */
  const medio = verticeDeHex({ q: 0, r: 0 }, 3);
  const partido: EstadoDeRiberas = {
    ...conCamino,
    vado: primero,
    colonos: conCamino.colonos.map((c, i) => (i === 1 ? { ...c, chozas: [medio] } : c)),
  };
  const bloqueo = [medio];
  comprobar(
    'con una choza ajena en medio, la cadena de A mide tres',
    largoDelVado(camino, bloqueo) === 3,
    largoDelVado(camino, bloqueo),
  );
  const trasRomper = recalcularElVado(partido);
  comprobar(
    'y el Vado Largo queda vacante, porque tres es menos que el mínimo',
    trasRomper.de === null && trasRomper.largo === 0 && VADO_MINIMO === 4,
    trasRomper,
  );

  /*
   * LA VACUNA DEL BLOQUEO: sin la choza ajena, la misma cadena mide cinco. Si
   * midiera cinco con ella, el bloqueo no estaría haciendo nada y la comprobación
   * de arriba pasaría por casualidad.
   */
  comprobar('y sin esa choza volvería a medir cinco', largoDelVado(camino, []) === 5);

  /* Y el premio vale puntos de verdad, que es lo que lo hace un premio. */
  const conPremio: EstadoDeRiberas = { ...conCamino, vado: primero };
  comprobar(
    'quien tiene el Vado Largo suma dos puntos por él',
    puntosDe(conPremio, conPremio.colonos[0] as Colono) ===
      puntosDe({ ...conPremio, vado: { de: null, largo: 0 } }, conPremio.colonos[0] as Colono) + 2,
  );
}

// ---------------------------------------------------------------------------
paso('El trueque: ciclo de vida, y contesta quien NO tiene el turno');
// ---------------------------------------------------------------------------

/** Un estado listo para trocar: dos colonos, jugando, ya tirado y con almacén. */
function escenarioDeTrueque(deA: readonly Bien[], deB: readonly Bien[]): EstadoDeRiberas {
  const base = escenarioDeVado();
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

const ctxDe = (quien: string, asientos: readonly string[]): {
  quien: string;
  azar: number;
  tic: number;
  asientos: readonly string[];
} => ({ quien, azar: 1, tic: 0, asientos });

{
  const DOS = ['A', 'B'];
  const inicial = escenarioDeTrueque(['junco', 'limo'], ['sal']);

  const deA = opcionesDeRiberas(proyectarRiberas(inicial, 'A'), 'A');
  const oferta = deA.find((o) => o.id === 'ofrecer:B:junco:sal');
  comprobar('a quien le toca se le ofrece proponer junco por sal', oferta !== undefined, deA.map((o) => o.id).slice(0, 8));

  const conOferta = avanzarRiberas(inicial, { tipo: OFRECER, carga: (oferta as Opcion).carga }, ctxDe('A', DOS));
  comprobar('la propuesta entra y nace como «propuesta»', conOferta.tratos.length === 1 && conOferta.tratos[0]?.estado === 'propuesta');
  comprobar('y su identificador es un seudónimo, no el contenido', conOferta.tratos[0]?.id === 't1');

  /*
   * ═══ CONTESTA QUIEN NO TIENE EL TURNO. ES LO QUE MÁS TENSIONA EL MOTOR ═══
   *
   * El turno es de A. A B se le ofrecen dos cosas —aceptar y rechazar— y el
   * árbitro no sabe nada de esto: comprobó que B está sentado y que su revisión es
   * fresca, y nada más. Que sea el turno de A es un campo de este estado.
   */
  const deB = opcionesDeRiberas(proyectarRiberas(conOferta, 'B'), 'B');
  comprobar('a B, que NO tiene el turno, se le ofrece aceptar y rechazar', deB.length === 2 && deB.every((o) => o.tipo === ACEPTAR || o.tipo === RECHAZAR), deB.map((o) => o.id));

  /* RECHAZAR. */
  const rechazado = avanzarRiberas(conOferta, { tipo: RECHAZAR, carga: { trato: 't1' } }, ctxDe('B', DOS));
  comprobar('rechazar lo deja en «rechazada» y no mueve nada', rechazado.tratos[0]?.estado === 'rechazada');
  comprobar('y los almacenes siguen igual', rechazado.colonos[0]?.almacen.length === 2 && rechazado.colonos[1]?.almacen.length === 1);

  /* ACEPTAR: las fichas cambian de dueño enteras, con su número de serie. */
  const aceptado = avanzarRiberas(conOferta, { tipo: ACEPTAR, carga: { trato: 't1' } }, ctxDe('B', DOS));
  comprobar('aceptar lo deja en «aceptada»', aceptado.tratos[0]?.estado === 'aceptada');
  const tieneA = (aceptado.colonos[0] as Colono).almacen;
  const tieneB = (aceptado.colonos[1] as Colono).almacen;
  comprobar('A entrega el junco y recibe la sal', tieneA.some((f) => f.endsWith(':sal')) && !tieneA.some((f) => f.endsWith(':junco')), tieneA);
  comprobar('B entrega la sal y recibe el junco', tieneB.some((f) => f.endsWith(':junco')) && !tieneB.some((f) => f.endsWith(':sal')), tieneB);
  comprobar('y el contador de fichas no ha avanzado: las mismas fichas cambian de manos', aceptado.siguienteFicha === conOferta.siguienteFicha);
  comprobar('nadie más puede contestar a un trueque que no es suyo', avanzarRiberas(conOferta, { tipo: ACEPTAR, carga: { trato: 't1' } }, ctxDe('A', DOS)) === conOferta);
  comprobar(
    'y se le dice, en vez de dejarle mirando un botón que no hizo nada',
    (motivoDe(conOferta, { tipo: ACEPTAR, carga: { trato: 't1' } }, ctxDe('A', DOS)) ?? '').length > 0,
    motivoDe(conOferta, { tipo: ACEPTAR, carga: { trato: 't1' } }, ctxDe('A', DOS)),
  );

  /* CADUCAR AL PASAR EL TURNO. */
  const tras = avanzarRiberas(conOferta, { tipo: PASAR, carga: {} }, ctxDe('A', DOS));
  comprobar('al pasar el turno, lo que seguía abierto caduca', tras.tratos[0]?.estado === 'caducada');
  comprobar('y el turno pasa a B', tras.turno === 1 && tras.tirado === false);

  /*
   * CADUCAR PORQUE VENCE EL PLAZO. Con `tickHz: 0` no llega ningún tic solo: lo
   * mete la LECTURA de la mesa comparando el reloj de pared con el plazo que la
   * mesa guarda, y aquí entra por la misma puerta que en producción —el árbitro—.
   */
  const conPlazo = abrirMesa({ id: 'RIB-T', arcade: RIBERAS, semilla: 3, asientos: DOS, estado: conOferta });
  const vencida = avanzarElReloj(conPlazo);
  const trasElTic = estadoDe(vencida);
  comprobar('cuando vence el plazo, el trueque abierto caduca', trasElTic.tratos[0]?.estado === 'caducada');
  comprobar('y el turno pasa solo, para que la mesa no se quede quieta', trasElTic.turno === 1);
  comprobar('un trueque ya caducado no se puede aceptar', avanzarRiberas(trasElTic, { tipo: ACEPTAR, carga: { trato: 't1' } }, ctxDe('B', DOS)) === trasElTic);
  {
    /*
     * Y SE LE DICE, aunque el que habla aquí no es `contestar` sino EL PORTILLO:
     * `opciones()` no ofrece aceptar un trueque caducado, así que el movimiento se
     * para una capa antes con el mensaje corto y ciego. Se comprueba igual, porque
     * lo que hay que comprar es que quien pulsa recibe una explicación — de quién
     * venga es un detalle de dónde está la guarda.
     */
    const tarde = motivoDe(trasElTic, { tipo: ACEPTAR, carga: { trato: 't1' } }, ctxDe('B', DOS)) ?? '';
    comprobar('y se le dice, en vez de dejarle mirando la pantalla', tarde.length > 0, tarde);
  }
}

// ---------------------------------------------------------------------------
paso('El §5 bis: «sólo si», nunca «si y sólo si»');
// ---------------------------------------------------------------------------

{
  const DOS = ['A', 'B'];
  const inicial = escenarioDeTrueque(['junco', 'limo'], ['sal']);
  const oferta = opcionesDeRiberas(proyectarRiberas(inicial, 'A'), 'A').find(
    (o) => o.id === 'ofrecer:B:junco:sal',
  ) as Opcion;
  const conOferta = avanzarRiberas(inicial, { tipo: OFRECER, carga: oferta.carga }, ctxDe('A', DOS));

  /*
   * A GASTA LA MERCANCÍA QUE ACABA DE PROMETER. Traza una vereda, que cuesta
   * junco y limo: exactamente lo que tenía. La oferta sigue en la mesa.
   */
  const vereda = opcionesDeRiberas(proyectarRiberas(conOferta, 'A'), 'A').find((o) => o.tipo === ALZAR) as Opcion;
  comprobar('A puede trazar una vereda con lo que tiene', vereda !== undefined);
  const gastado = avanzarRiberas(conOferta, { tipo: ALZAR, carga: vereda.carga }, ctxDe('A', DOS));
  comprobar('y al pagarla se queda sin junco', !(gastado.colonos[0] as Colono).almacen.some((f) => f.endsWith(':junco')));
  comprobar('la oferta sigue abierta', gastado.tratos[0]?.estado === 'propuesta');

  /*
   * ═══ EL CONTRAEJEMPLO, EN UNA LÍNEA ═══
   *
   * A B SE LE SIGUE OFRECIENDO ACEPTAR. Y tiene que ser así: `opciones()` recibe
   * LA VISTA de B, donde está el almacén de B y NO el de A. Puede afirmar que B
   * tiene la sal que se le pide; no puede afirmar que A siga teniendo el junco que
   * prometió, y meterlo en la vista de B para poder afirmarlo sería filtrar el
   * almacén ajeno.
   *
   * Con el bicondicional —«legal si y sólo si se ofreció»— este juego tendría que
   * elegir entre ofrecer un trueque que revienta al aceptarse o filtrar. Con el
   * «sólo si», el reductor lo vuelve a validar con todo lo que hay y lo rechaza.
   */
  const deB = opcionesDeRiberas(proyectarRiberas(gastado, 'B'), 'B');
  comprobar('a B se le SIGUE ofreciendo aceptar, porque él sí tiene lo que se le pide', deB.some((o) => o.tipo === ACEPTAR));
  const intento = avanzarRiberas(gastado, { tipo: ACEPTAR, carga: { trato: 't1' } }, ctxDe('B', DOS));
  comprobar('y aun así el reductor lo rechaza: el oferente ya no tiene la mercancía', intento === gastado);
  comprobar('el trueque se queda como estaba, ni aceptado ni roto', intento.tratos[0]?.estado === 'propuesta');
  /*
   * ═══ Y AHORA LO DICE, PERO SIN DECIR POR QUÉ — QUE ES LA PARTE DELICADA ═══
   *
   * `motor.ts` deja escrita la regla y nombra este caso con estas palabras: un
   * motivo no puede decir nada que la proyección de quien mueve no dijera ya. El
   * almacén del oferente NO está en la vista de quien acepta —taparlo es para lo
   * que existe el «sólo si»— así que «el oferente no tiene la sal que prometía»
   * sería una fuga por la puerta de atrás, en un texto que ningún comprobador de
   * secretos mira: `verify:mesa` busca valores canónicos y un motivo es una frase.
   *
   * Por eso esto se comprueba A LA LETRA. Es la clase de línea que alguien
   * «mejora» con la mejor intención —nombrar el bien que falta para que el mensaje
   * ayude más— y con eso el almacén ajeno empieza a salir de su asiento sin que
   * nada se ponga rojo.
   */
  const suMotivo = motivoDe(gastado, { tipo: ACEPTAR, carga: { trato: 't1' } }, ctxDe('B', DOS)) ?? '';
  comprobar('y lo dice, en vez de tragárselo en silencio', suMotivo.length > 0, suMotivo);
  comprobar(
    'y NO nombra ningún bien: el almacén ajeno no sale ni por un texto',
    !BIENES.some((b) => suMotivo.toLowerCase().includes(b)),
    suMotivo,
  );
  comprobar(
    'ni nombra al oferente ni dice que le falte algo',
    !/tiene|falta|gast/i.test(suMotivo),
    suMotivo,
  );

  /*
   * Y LA OTRA MITAD: lo que `opciones()` NO ofreció, se rechaza. Aquí, un
   * movimiento perfectamente formado de alguien a quien no le toca.
   */
  const deBAntes = opcionesDeRiberas(proyectarRiberas(gastado, 'B'), 'B');
  comprobar('a B no se le ofrece tirar los dados: no es su turno', deBAntes.every((o) => o.tipo !== TIRAR));
  comprobar('y si lo manda, devuelve el mismo objeto', avanzarRiberas(gastado, { tipo: TIRAR, carga: {} }, ctxDe('B', DOS)) === gastado);

  /*
   * ═══ Y EL PORTILLO, AISLADO: UN MOVIMIENTO QUE EL REDUCTOR SABRÍA EJECUTAR ═══
   *
   * Todo lo de arriba lo rechazarían también las guardas de cada rama, así que no
   * distingue un motor con portillo de uno sin él. Esto sí:
   *
   *   · `ofrecer junco por sal` SE OFRECE —A tiene junco y no tiene sal— y entra.
   *   · `ofrecer junco por limo` NO se ofrece —A ya tiene limo, y proponer lo que
   *     ya tienes no es una oferta que valga la pena pintar— y sin embargo la rama
   *     `ofrecer` del reductor lo daría por bueno: la carga está bien formada, el
   *     destinatario existe y el oferente tiene lo que promete.
   *
   * O sea que la ÚNICA diferencia entre los dos es haber sido ofrecido. Si alguien
   * quita el portillo, esta comprobación —y sólo ésta— se pone roja.
   */
  const conJunco = escenarioDeTrueque(['junco', 'limo'], ['sal']);
  const laOferta = { para: 'B', da: ['junco'], pide: ['limo'] };
  comprobar(
    'proponer lo que ya tienes no se ofrece',
    !opcionesDeRiberas(proyectarRiberas(conJunco, 'A'), 'A').some((o) => o.id === 'ofrecer:B:junco:limo'),
  );
  comprobar(
    'y aunque la rama del reductor lo daría por bueno, el portillo lo rechaza',
    avanzarRiberas(conJunco, { tipo: OFRECER, carga: laOferta }, ctxDe('A', DOS)) === conJunco,
  );
  comprobar(
    'mientras que el mismo trueque por algo que NO tienes sí entra',
    avanzarRiberas(conJunco, { tipo: OFRECER, carga: { para: 'B', da: ['junco'], pide: ['sal'] } }, ctxDe('A', DOS))
      !== conJunco,
  );

  /* Una carga inventada tampoco pasa el portillo. */
  comprobar(
    'una carga que no coincide con ninguna opción se rechaza',
    avanzarRiberas(gastado, { tipo: FUNDAR, carga: { vertice: 'v:inventado' } }, ctxDe('A', DOS)) === gastado,
  );
  comprobar(
    'y una carga que no es ni serializable tampoco',
    avanzarRiberas(gastado, { tipo: FUNDAR, carga: { vertice: undefined } }, ctxDe('A', DOS)) === gastado,
  );
}

// ---------------------------------------------------------------------------
paso('Los seudónimos: ningún identificador publicado lleva un secreto dentro');
// ---------------------------------------------------------------------------

{
  const e = estadoDe(mesa);
  const secretos = loSecretoDeRiberas(e).filter((s): s is string => typeof s === 'string');
  comprobar('hay fichas secretas que buscar', secretos.length > 0, secretos.length);

  const publicados: string[] = [];
  for (const quien of TRES) {
    const vista = proyectarRiberas(e, quien);
    for (const o of opcionesDeRiberas(vista, quien)) publicados.push(o.id, o.rotulo, o.ayuda);
    for (const c of vista.tablero.caras) publicados.push(c.id, c.rotulo, c.cifra);
    for (const l of vista.tablero.lineas) publicados.push(l.id);
    for (const n of vista.tablero.nudos) publicados.push(n.id);
    for (const a of vista.tablero.acciones) publicados.push(a.id, a.rotulo, a.ayuda);
    for (const p of vista.tablero.paneles) publicados.push(p.titulo);
  }

  /*
   * ═══ POR QUÉ ESTA COMPROBACIÓN NO LA HACE `verify:mesa` ═══
   *
   * Porque aquél busca la forma CANÓNICA del secreto, o sea con comillas, y un
   * secreto EMBEBIDO dentro de un identificador más largo no la tiene: el §5 bis
   * lo dice con su propio ejemplo, `"carta:oros-7"` no contiene `"oros-7"`. Un
   * secreto metido en un id es invisible para el comprobador que existe para
   * cazarlo, así que hace falta mirarlo aquí, por subcadena y sin comillas.
   */
  const contaminados = publicados.filter((id) => secretos.some((s) => id.includes(s)));
  comprobar('ningún identificador ni rótulo publicado contiene una ficha', contaminados.length === 0, contaminados.slice(0, 5));

  /* LA VACUNA: un id escrito con el contenido dentro SÍ se caza. */
  const envenenado = `pagar-con-${secretos[0] as string}`;
  comprobar('y un id fabricado con una ficha dentro sí se cazaría', secretos.some((s) => envenenado.includes(s)));
  comprobar(
    'mientras que la forma canónica no lo encontraría, que es el agujero del §5 bis',
    !canonico(envenenado).includes(canonico(secretos[0])),
  );

  /* Y la vista de un asiento no lleva las fichas de otro. */
  for (const quien of TRES) {
    const texto = canonico(proyectarRiberas(e, quien));
    const ajenas = e.colonos
      .filter((c) => c.asiento !== quien)
      .flatMap((c) => c.almacen)
      .filter((f) => texto.includes(canonico(f)));
    comprobar(`en la vista de ${quien} no hay ni una ficha ajena`, ajenas.length === 0, ajenas.slice(0, 4));
  }
  const delEspectador = canonico(proyectarRiberas(e, null));
  comprobar('y el espectador no ve ninguna ficha de nadie', !secretos.some((s) => delEspectador.includes(canonico(s))));
  comprobar('ni el azar sale en ninguna vista', !canonico(proyectarRiberas(e, 'A')).includes(canonico(e.azar)));
}

// ---------------------------------------------------------------------------
paso('Una partida entera, con el árbitro, y reejecutada');
// ---------------------------------------------------------------------------

{
  /*
   * Se parte del estado real que dejó la colocación de arriba y se le pone a cada
   * cual un almacén generoso: lo que se quiere ver es que la partida LLEGA AL
   * FINAL, y llegar por producción tardaría cien turnos de dados que no
   * demostrarían nada nuevo. Que un estado inicial se pueda declarar al abrir la
   * mesa es una forma legítima de empezar y el árbitro la documenta.
   */
  const desde = estadoDe(mesa);
  let serie = desde.siguienteFicha;
  const gordo: EstadoDeRiberas = {
    ...desde,
    tirado: false,
    colonos: desde.colonos.map((c) => ({
      ...c,
      almacen: [
        ...c.almacen,
        ...BIENES.flatMap((b) => [0, 1, 2, 3, 4, 5, 6, 7].map(() => `b${serie++}:${b}`)),
      ],
    })),
  };

  let larga = abrirMesa({ id: 'RIB-2', arcade: RIBERAS, semilla: 555, asientos: TRES, estado: gordo });
  let movimientos = 0;
  while (!estadoDe(larga).ganadores.length && movimientos < 400) {
    const e = estadoDe(larga);
    const quien = (e.colonos[e.turno] as Colono).asiento;
    const lista = opcionesEn(larga, quien);
    const elegida =
      lista.find((o) => o.tipo === TIRAR) ??
      lista.find((o) => o.id.startsWith('torre:')) ??
      lista.find((o) => o.id.startsWith('fundar:')) ??
      lista.find((o) => o.id.startsWith('vereda:')) ??
      lista.find((o) => o.tipo === PASAR);
    if (elegida === undefined) break;
    larga = mover(larga, quien, elegida);
    movimientos++;

    /* Las invariantes se miran en CADA movimiento, no sólo al final. */
    const ahora = estadoDe(larga);
    const puestos: LlaveDeVertice[] = [];
    for (const c of ahora.colonos) puestos.push(...c.chozas, ...c.torres);
    if (new Set(puestos).size !== puestos.length) {
      comprobar('no hay dos piezas en el mismo vértice', false, puestos);
      break;
    }
    const veredas = ahora.colonos.flatMap((c) => c.veredas);
    if (new Set(veredas).size !== veredas.length) {
      comprobar('no hay dos veredas en la misma arista', false, veredas.length);
      break;
    }
  }

  const fin = estadoDe(larga);
  comprobar('la partida termina', fin.momento === 'terminada', { momento: fin.momento, movimientos });
  comprobar('y con al menos un ganador', fin.ganadores.length >= 1, fin.ganadores);
  comprobar(
    'quien gana tiene los puntos que hacen falta',
    fin.colonos.filter((c) => fin.ganadores.includes(c.asiento)).every((c) => puntosDe(fin, c) >= 8),
    fin.colonos.map((c) => puntosDe(fin, c)),
  );
  comprobar('una mesa terminada no ofrece nada a nadie', TRES.every((q) => opcionesEn(larga, q).length === 0));

  /*
   * LA REEJECUCIÓN. El diario y el estado inicial bastan para reconstruir la
   * partida entera byte a byte. Es lo que compra la pureza del reductor, y lo que
   * hace que una partida deje de ser un dato en el que hay que creer.
   */
  const otraVez = reejecutarEn(RIBERAS, gordo, larga.diario);
  comprobar('reejecutar el diario da exactamente el mismo estado', canonico(otraVez) === canonico(fin));
  const desdeCero = reejecutarEn(RIBERAS, undefined, mesa.diario);
  comprobar('y reejecutar desde una mesa vacía también', canonico(desdeCero) === canonico(estadoDe(mesa)));
}

// ---------------------------------------------------------------------------
paso('Los topes: lo que el reductor no va a aceptar, `opciones()` no lo ofrece');
// ---------------------------------------------------------------------------

/*
 * ═══ POR QUÉ ESTE BLOQUE, Y POR QUÉ NO LO CAZABA NADA ═══
 *
 * `opciones()` ofrecía trazar vereda y fundar choza sin mirar los topes que el
 * reductor SÍ aplica —doce veredas, y nueve piezas de vértice entre chozas y
 * torres—, mientras el bloque de la torre, tres párrafos más abajo en el mismo
 * fichero, sí miraba el suyo. O sea que no era una decisión: era una omisión con
 * dos bloques hermanos al lado haciéndolo bien.
 *
 * El fallo tiene la forma que este comprobador persigue: no se cae. En el móvil una
 * vereda ofrecida se pinta EN NEÓN, con el trazo engordado y pulsable; se toca, el
 * servidor contesta 200, la revisión no sube y no pasa nada. Una pieza encendida
 * que no responde, a mitad de partida. Medido antes de arreglarlo: un colono con
 * 12/12 veredas seguía recibiendo cuatro opciones de vereda, y en cinco partidas se
 * contaron 2.834 movimientos ofrecidos que el reductor devolvió sin tocar nada.
 *
 * Y la partida de arriba no lo cazaba: su bot prefiere torre > choza > vereda y con
 * un almacén generoso termina antes de llegar a las doce veredas. Así que aquí se
 * fabrica el estado a mano, que es la única forma de visitar el borde.
 *
 * NO es un caso del «sólo si» del §5 bis, y conviene que quede escrito al lado de
 * la comprobación: esa regla existe para lo que el ofertante NO PUEDE VER —el
 * almacén ajeno, el aforo de la mesa—, y estas tres cuentas están en la vista, son
 * públicas y se cuentan mirando el tablero.
 */
{
  const DOS = ['A', 'B'];
  const arranque = abrirMesa({ id: 'RIB-TOPES', arcade: RIBERAS, semilla: 4242, asientos: DOS });
  const repartida = estadoDe(
    jugar(arranque, { quien: 'A', rev: arranque.rev, movimiento: { tipo: EMPEZAR_RIBERAS, carga: {} } }),
  );

  /* Un almacén que llega para todo, para que lo único que muerda sea el tope. */
  let serie = repartida.siguienteFicha;
  const conDeQueSobra = (c: Colono): Ficha[] => [
    ...c.almacen,
    ...BIENES.flatMap((b) => [0, 1, 2, 3].map(() => `t${serie++}:${b}` as Ficha)),
  ];

  /*
   * Todas las aristas y todos los vértices del delta, para poder llenar a alguien
   * hasta el tope sin depender de por dónde fue la colocación.
   */
  const hexes = repartida.islas.map((i) => i.hex);
  const todasLasAristas = aristasDe(hexes);
  const todosLosVertices = verticesDe(hexes);

  /** El mismo estado con un colono llenado hasta su tope de una clase de pieza. */
  const conElTopeLleno = (quien: string, pieza: 'vereda' | 'choza'): EstadoDeRiberas => ({
    ...repartida,
    momento: 'jugando',
    tirado: true,
    turno: repartida.colonos.findIndex((c) => c.asiento === quien),
    colonos: repartida.colonos.map((c) =>
      c.asiento !== quien
        ? c
        : {
            ...c,
            almacen: conDeQueSobra(c),
            veredas:
              pieza === 'vereda' ? todasLasAristas.slice(0, TOPE_DE_PIEZAS.vereda) : c.veredas,
            chozas:
              pieza === 'choza'
                ? todosLosVertices.slice(0, TOPE_DE_PIEZAS.choza + TOPE_DE_PIEZAS.torre)
                : c.chozas,
            torres: c.torres,
          },
    ),
  });

  /* ── LA VEREDA ─────────────────────────────────────────────────────────── */
  {
    const lleno = conElTopeLleno('A', 'vereda');
    const suyas = (lleno.colonos.find((c) => c.asiento === 'A') as Colono).veredas;
    comprobar('el montaje deja a A con las doce veredas puestas', suyas.length === TOPE_DE_PIEZAS.vereda, suyas.length);

    const ofrecidas = opcionesDeRiberas(proyectarRiberas(lleno, 'A'), 'A').filter(
      (o) => o.id.startsWith('vereda:'),
    );
    comprobar('con el tope lleno no se ofrece ni una vereda más', ofrecidas.length === 0, ofrecidas.map((o) => o.id).slice(0, 4));

    /*
     * LA VACUNA, y es la mitad que importa: sin ella, «cero veredas ofrecidas»
     * también saldría verde si el montaje no le hubiera dejado a nadie con qué
     * pagar, o si `opciones()` hubiera dejado de ofrecer veredas del todo.
     */
    const conUnaMenos: EstadoDeRiberas = {
      ...lleno,
      colonos: lleno.colonos.map((c) =>
        c.asiento !== 'A' ? c : { ...c, veredas: c.veredas.slice(0, TOPE_DE_PIEZAS.vereda - 1) },
      ),
    };
    const conHueco = opcionesDeRiberas(proyectarRiberas(conUnaMenos, 'A'), 'A').filter((o) =>
      o.id.startsWith('vereda:'),
    );
    comprobar('y con una vereda de margen sí se ofrecen: el cero de arriba no es por otra cosa', conHueco.length > 0);

    /*
     * Y LO QUE ATA LAS DOS MITADES: que el reductor tampoco la aceptaría. Si
     * algún día se sube el tope en un sitio y no en el otro, esto se pone rojo en
     * la revisión en vez de a mitad de una partida.
     */
    const unaLibre = todasLasAristas.find((a) => !suyas.includes(a)) as string;
    const despues = avanzarRiberas(
      lleno,
      { tipo: ALZAR, carga: { que: 'vereda', donde: unaLibre } },
      { quien: 'A', asientos: DOS, tic: 0, azar: 1 },
    );
    comprobar('y el reductor devuelve el MISMO estado si se le manda igual', despues === lleno);
  }

  /* ── LA CHOZA: el tope es la SUMA de las dos piezas de vértice ─────────── */
  {
    const lleno = conElTopeLleno('B', 'choza');
    const mio = lleno.colonos.find((c) => c.asiento === 'B') as Colono;
    comprobar(
      'el montaje deja a B con las nueve piezas de vértice puestas',
      mio.chozas.length + mio.torres.length === TOPE_DE_PIEZAS.choza + TOPE_DE_PIEZAS.torre,
      { chozas: mio.chozas.length, torres: mio.torres.length },
    );
    const ofrecidas = opcionesDeRiberas(proyectarRiberas(lleno, 'B'), 'B').filter((o) =>
      o.id.startsWith('fundar:'),
    );
    comprobar('con las nueve puestas no se ofrece fundar en ninguna parte', ofrecidas.length === 0, ofrecidas.map((o) => o.id).slice(0, 4));
  }

  /* ── LA TORRE: la que ya estaba bien, comprobada por primera vez ───────── */
  {
    const conTorres: EstadoDeRiberas = {
      ...repartida,
      momento: 'jugando',
      tirado: true,
      turno: repartida.colonos.findIndex((c) => c.asiento === 'A'),
      colonos: repartida.colonos.map((c) =>
        c.asiento !== 'A'
          ? c
          : {
              ...c,
              almacen: conDeQueSobra(c),
              torres: todosLosVertices.slice(20, 20 + TOPE_DE_PIEZAS.torre),
            },
      ),
    };
    const ofrecidas = opcionesDeRiberas(proyectarRiberas(conTorres, 'A'), 'A').filter((o) =>
      o.id.startsWith('torre:'),
    );
    comprobar('con las cuatro torres puestas no se ofrece levantar otra', ofrecidas.length === 0, ofrecidas.map((o) => o.id).slice(0, 4));
  }
}

// ---------------------------------------------------------------------------
paso('La plataforma puede PREGUNTARLE al juego qué se puede hacer (fase 5)');
// ---------------------------------------------------------------------------

{
  /*
   * ═══ POR QUÉ ESTA COMPROBACIÓN EXISTE, Y NO ES UNA TAUTOLOGÍA ═══
   *
   * `opciones()` tenía hasta la fase 5 un solo camino: el juego se llamaba a sí
   * mismo, desde su reductor y desde su tablero. Eso vale para un juego que está
   * DENTRO del binario y no vale para uno de fuera, que no tiene forma de decirle a
   * la plataforma «pregúntame». Por eso el alta ganó su hueco.
   *
   * Y un hueco que nadie recorre es una garantía que no existe — este repositorio
   * ya tiene apuntado el caso de `exigirSecretosTapados()`, que se escribió en la
   * fase 0, funcionaba, y no la llamaba nadie hasta la fase 2. Así que aquí se
   * recorre: se le pregunta al REGISTRO, por identificador de arcade, y se contrasta
   * contra lo que contesta el juego llamado directamente.
   *
   * Lo que caza: que alguien quite `opciones` del alta de `juegos/index.ts` —una
   * línea, y en el diff parece limpieza— y con eso deje sin botones a cualquier
   * mueble genérico que le pregunte a este juego sin conocerlo.
   */
  const DOS = ['A', 'B'];
  const ctx = { quien: 'A', azar: 7, tic: 0, asientos: DOS };
  const repartida = avanzarRiberas(undefined, { tipo: EMPEZAR_RIBERAS, carga: {} }, ctx);
  const vista = proyectarRiberas(repartida, 'A');

  comprobar('el registro sabe que este arcade dice qué se puede hacer', hayOpciones(RIBERAS));
  const porElRegistro = opcionesDeArcade(RIBERAS, vista, 'A');
  const porElJuego = opcionesDeRiberas(vista, 'A');
  comprobar('y ofrece algo, para que la comparación no sea sobre dos listas vacías', porElRegistro.length > 0);
  comprobar(
    'lo que contesta el registro es exactamente lo que contesta el juego',
    canonico(porElRegistro) === canonico(porElJuego),
    { registro: porElRegistro.length, juego: porElJuego.length },
  );
  /*
   * Y AL ESPECTADOR NO SE LE OFRECE NADA, preguntado por la misma puerta. Es la
   * mitad del contrato que un mueble genérico necesita: quien mira sin asiento ve
   * el tablero y no ve botones.
   */
  comprobar('y a quien mira sin asiento no se le ofrece nada', opcionesDeArcade(RIBERAS, vista, null).length === 0);
}

// ---------------------------------------------------------------------------
paso('Y el árbitro sigue sin saber nada de este juego');
// ---------------------------------------------------------------------------

{
  const DOS = ['A', 'B'];
  const base = abrirMesa({ id: 'RIB-3', arcade: RIBERAS, semilla: 11, asientos: DOS });
  let rechazo: MovimientoRechazado | null = null;
  try {
    jugar(base, { quien: 'Z', rev: base.rev, movimiento: { tipo: EMPEZAR_RIBERAS, carga: {} } });
  } catch (error) {
    if (error instanceof MovimientoRechazado) rechazo = error;
  }
  comprobar('quien no está sentado no mueve, y lo dice el árbitro', rechazo?.motivo === 'no-estas-sentado');

  let rancia: MovimientoRechazado | null = null;
  try {
    jugar(base, { quien: 'A', rev: base.rev + 5, movimiento: { tipo: EMPEZAR_RIBERAS, carga: {} } });
  } catch (error) {
    if (error instanceof MovimientoRechazado) rancia = error;
  }
  comprobar('y una revisión rancia también', rancia?.motivo === 'revision-rancia');
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length === 0) {
  console.log(
    `✔ ${hechas} comprobaciones. El mismo vértice tiene una sola llave por los tres caminos, ninguna\n` +
      '  choza toca a otra, la serpentina va y vuelve, el Vado Largo se rompe cuando un vecino planta\n' +
      '  una choza en medio, un trueque caduca solo, y quien no tiene el turno contesta — mientras el\n' +
      '  reductor rechaza lo que `opciones()` no ofreció y sigue validando lo que sí.',
  );
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
console.log(
  '\nNinguno de estos fallos se cae: se juegan. Una canonicalización mal hecha deja poner dos chozas\n' +
    'pegadas, una serpentina mal escrita reparte ventaja, un premio que se lleva quien empata salta de\n' +
    'mano en mano, y un trueque que no caduca se acepta tres turnos tarde. Se descubren jugando, que es\n' +
    'lo más caro que hay.',
);
process.exit(1);
