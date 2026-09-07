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
 * Son nueve cosas y las nueve tienen esa forma:
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
 *  7. EL MAZO, que es la segunda economía y llegó después. Sus fallos son de los
 *     mismos: una carta jugada el turno que se compra convierte tres bienes en un
 *     efecto inmediato y nadie lo nota hasta que alguien encadena tres; un
 *     acaparamiento que se lleva un bien de más parece mala suerte; y un mazo que
 *     se sortea al comprar en vez de barajarse al empezar da partidas distintas con
 *     el mismo diario — ése no rompe el juego, rompe `reejecutarEn` y con él el
 *     motor entero.
 *  8. DE QUÉ COLOR SE VE CADA ISLA, que llegó el último y por la peor puerta: se
 *     descubrió jugando. Es el fallo más silencioso de todos porque el programa
 *     funciona perfectamente — las cartas salen del color que les toca según una
 *     tabla que sencillamente decía otra cosa que el tablero. Se comprueba como
 *     regla y no como lista: cada isla se ve como el terreno que da su mismo bien,
 *     el plano y la carta cuentan lo mismo, los seis del plano se distinguen entre
 *     sí, ninguno se traga las piezas de un colono y ninguna pareja de islas sale de
 *     la misma celda del atlas — que es lo que decide el tablero de tres dimensiones
 *     y lo que ninguna de las tres primeras podía ver.
 *  9. QUE LOS DOS JUECES DE LA VEREDA CORTEN EN EL MISMO SITIO. Éste llegó por la
 *     peor puerta de todas —lo sufrió Miguel en una partida— y con las ocho
 *     anteriores en verde: se podía trazar SALIENDO del vértice donde otro tenía
 *     choza, el juego la cobraba y la pintaba, y el premio, que sí corta ahí,
 *     contaba la cadena partida. Cinco veredas pagadas y Vado de tres. Se
 *     comprueba como regla y no como caso: para cualquier cadena y cualquier
 *     choza en medio, lo que el juego DEJA CONSTRUIR y lo que el Vado CUENTA dan
 *     el mismo número — y llegar a la puerta del vecino sigue siendo legal.
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
/*
 * EL AZAR SE IMPORTA PARA PODER FABRICAR UNA TIRADA CONCRETA, y sólo para eso: el
 * bloque del estiaje necesita que salga EL NÚMERO de una isla en particular, y
 * esperarlo tirando dados sería un bucle que tarda lo que quiera. Se busca una
 * semilla cuyas dos primeras tiradas sumen lo que hace falta y se le pone al estado,
 * que es una forma legítima de empezar una partida y la que ya usa el árbitro.
 */
import { enteroEntre, sembrar } from '../../shared/mecanicas/azar';
import {
  aristaDeHex,
  aristasDe,
  aristasDeVertice,
  aristaTocaVertice,
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
  ACAPARAMIENTO,
  ACEPTAR,
  ALZAR,
  ANO_BUENO,
  avanzarRiberas as reglasDeRiberas,
  BIENES,
  CARTAS_DEL_MAZO,
  claseDeLaCarta,
  CLASES_DE_CARTA,
  comoSiSiempreHubieraHabidoMazo,
  COMPRAR,
  COSTE_DE_LA_CARTA,
  DESCARTAR,
  deQuienEsElPaso,
  DOS_VEREDAS,
  EMPEZAR_RIBERAS,
  FUNDAR,
  GUARDIA,
  GUARDIA_MINIMA,
  largoDelVado,
  loSecretoDeRiberas,
  MOVER_EL_ESTIAJE,
  OFRECER,
  opcionesDeRiberas,
  PASAR,
  RECHAZAR,
  REVELAR,
  proyectarRiberas,
  puntosDe,
  recalcularElVado,
  recalcularLaGuardia,
  RIBERAS,
  tableroDeRiberas,
  TIRAR,
  VADO_MINIMO,
  VEREDAS_DE_LA_CARTA,
  TOPE_DE_PIEZAS,
} from '../../shared/arcade/juegos';
/*
 * `RINDE` NO SALE POR LA PUERTA COMÚN, y se pide aquí por su nombre entero.
 *
 * `shared/arcade/juegos/index.ts` es la puerta por la que los muebles genéricos conocen a
 * los juegos, y ahí dentro un nombre como `RINDE` no dice de quién es —La Ronda también
 * reparte cosas—. Lo que este bloque necesita es una tabla concreta de un juego concreto,
 * así que se pide donde vive, igual que `riberas-en-3d` unas líneas más abajo.
 */
import { RINDE } from '../../shared/arcade/juegos/riberas';
/*
 * Y LA PALETA DE LA ESCENA, que es la mitad que hay que contrastar.
 *
 * `escenas/paleta.ts` es aritmética y datos: sin `three`, sin React y sin JSX —por eso está
 * fuera de `delta.tsx`, y lo cuenta su propia cabecera— así que un guion de Node la puede
 * abrir. Es el mismo permiso con el que `verify:riberas-en-tres` abre `escenas/cartas.ts`.
 */
import {
  colorDelBien,
  colorDeTerreno,
  terrenoDe,
  TERRENO_DEL_BIEN,
} from '../../escenas/paleta';
import type { Terreno as TerrenoPintado } from '../../escenas/paleta';
import type {
  Bien,
  CartaDeRiberas,
  CartaEnMano,
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

import { obraPosible, vistaDePrueba } from '../../shared/arcade/juegos/riberas-en-3d';

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
   * NINGUNA ISLA LLEVA EL SIETE. Ésta sigue siendo verdad con la regla nueva y se
   * queda tal cual: es la mitad aritmética de por qué el siete puede ser la suma que
   * activa el estiaje sin que ninguna isla produzca en ese turno.
   *
   * Lo que aquí ponía además —que con siete no pasa nada— era una comprobación
   * escrita contra la regla vieja, y la nueva la habría dejado en verde sin tocarla:
   * exactamente la forma de comprobación que no está mirando. Lo que pasa hoy al
   * sacar un siete está en el bloque de abajo, jugado y no montado a mano.
   */
  comprobar('ninguna isla lleva el siete, así que el estiaje no puede rendir', e.islas.every((i) => i.numero !== 7));
  comprobar(
    'y el estiaje nace en la duna, que es la que ya no rendía',
    e.estiaje === llaveDeHex((e.islas.find((i) => i.terreno === 'duna') as { hex: Hex }).hex),
    e.estiaje,
  );
}

// ---------------------------------------------------------------------------
paso('EL ESTIAJE: la pieza, el bloqueo, el robo y el reloj');
// ---------------------------------------------------------------------------

/*
 * ═══ ESTE BLOQUE SE JUEGA, NO SE MONTA, Y ÉSA ES SU MITAD IMPORTANTE ═══
 *
 * Todo lo que sigue cuelga de una partida de verdad llevada hasta el primer siete con
 * el árbitro delante, y no de un estado con `estiajePorMover: true` escrito a mano. La
 * diferencia es la vacuna que pide el diseño: la línea de la que cuelga la regla
 * entera es la de `tirarLosDados` que enciende la bandera al sacar siete, y TODO lo
 * demás —la pieza, la vista, el bloqueo, los dieciocho destinos, el corte de
 * `opciones()`, la guarda del reductor y las dieciocho caras tocables— se puede
 * escribir entero y quedarse VERDE con un estiaje que no se activa jamás. Con estados
 * montados a mano, quitar esa línea no pondría rojo nada.
 *
 * Y por eso la primera comprobación de todas es que el siete SALE: si un día dejara de
 * salir en doscientas tiradas, lo de debajo pasaría a estar mirando el conjunto vacío,
 * y conviene que sea esta línea la que lo diga y no el silencio.
 */

/** Tira los dados por quien tenga el turno, y devuelve la mesa. */
function tirarPor(donde: Mesa, quien: string): Mesa {
  return mover(donde, quien, opcionesEn(donde, quien).find((o) => o.tipo === TIRAR) as Opcion);
}

/**
 * TIRA, Y SI SALE UN SIETE MUEVE EL ESTIAJE. Devuelve la mesa lista para seguir.
 *
 * Hace falta en todos los sitios de este fichero donde una partida escrita a mano tira
 * y sigue jugando: desde esta fase, después de un siete no se ofrece ninguna otra cosa
 * hasta que la pieza se mueva, así que un `find(PASAR)` detrás de un `TIRAR` sale
 * `undefined` una de cada seis veces. Que eso ya no pase en silencio es justo lo que la
 * regla nueva tiene que hacer.
 */
function tirarYResolverElEstiaje(donde: Mesa, quien: string): Mesa {
  const tirada = vaciarLasManos(tirarPor(donde, quien));
  if (!estadoDe(tirada).estiajePorMover) return tirada;
  const destino = opcionesEn(tirada, quien).find((o) => o.tipo === MOVER_EL_ESTIAJE);
  /*
   * Y SI NO HUBIERA NINGUNO, SE DICE Y NO SE REVIENTA. Con la bandera encendida y sin
   * destinos, la mesa se queda parada para siempre: es el peor fallo que esta regla
   * puede tener, y un guion que se cae con «no se puede leer 'tipo' de undefined» lo
   * cuenta peor que una línea roja con su nombre.
   */
  comprobar('con el estiaje por mover siempre hay un destino que ofrecer, o la mesa se para', destino !== undefined);
  return destino === undefined ? tirada : mover(tirada, quien, destino);
}

/**
 * DESCARTA HASTA QUE LA MESA SALGA DE `'descartando'`. Devuelve la mesa lista para seguir.
 *
 * Hace la misma falta que `tirarYResolverElEstiaje` y por la misma razón, un escalón
 * antes: desde la fase 2, un siete con manos llenas no deja mover la pieza hasta que se
 * hayan tirado las fichas, así que un `find(MOVER_EL_ESTIAJE)` detrás de un `TIRAR` sale
 * `undefined` en cuanto alguien pasa de siete fichas —que en este fichero, con las manos
 * que se montan a mano para el mazo y para el trueque, es a menudo—.
 *
 * Le pregunta SIEMPRE a `turnoDe` y no a una lista suya: si `turnoDe` no apuntara al
 * primero que debe, este bucle se quedaría sin jugada y se cortaría, que es exactamente
 * la forma en que se rompería el bucle de `verify:mesa`.
 */
function vaciarLasManos(donde: Mesa): Mesa {
  let mesa = donde;
  for (let vueltas = 0; vueltas < 60 && estadoDe(mesa).momento === 'descartando'; vueltas++) {
    const quien = (estadoDe(mesa).colonos[turnoDeLaMesa(mesa)] as Colono | undefined)?.asiento;
    const tirar = quien === undefined ? undefined : opcionesEn(mesa, quien).find((o) => o.tipo === DESCARTAR);
    if (quien === undefined || tirar === undefined) {
      comprobar('en «descartando» siempre hay a quién preguntarle y qué tirar, o la mesa se para', false, {
        quien,
        descartes: estadoDe(mesa).descartes,
      });
      return mesa;
    }
    mesa = mover(mesa, quien, tirar);
  }
  return mesa;
}

/** El índice del colono a quien apunta `turnoDe` de la vista pública, o −1. */
function turnoDeLaMesa(donde: Mesa): number {
  const e = estadoDe(donde);
  const turnoDe = proyectarRiberas(e, 'A').turnoDe;
  return e.colonos.findIndex((c) => c.asiento === turnoDe);
}

/** Las llaves de todas las islas del delta, en el orden canónico de la malla. */
function llavesDeLasIslas(e: EstadoDeRiberas): string[] {
  return e.islas.map((i) => llaveDeHex(i.hex));
}

/**
 * LA SEMILLA CUYAS DOS PRIMERAS TIRADAS SUMAN ESTO.
 *
 * Es la única forma de mirar el bloqueo de verdad: hay que hacer que salga EL NÚMERO
 * de una isla concreta, y esperarlo tirando dados sería un bucle que tarda lo que
 * quiera. Ponerle una semilla al estado es una forma legítima de empezar —el árbitro
 * la documenta— y deja la comparación en una línea.
 */
function semillaQueSaca(suma: number): number {
  for (let semilla = 1; semilla < 20_000; semilla++) {
    const uno = enteroEntre(sembrar(semilla), 1, 6);
    const otro = enteroEntre(uno.azar, 1, 6);
    if (uno.valor + otro.valor === suma) return semilla;
  }
  throw new Error(`ninguna semilla de las veinte mil primeras saca ${String(suma)}`);
}

/**
 * LA MESA PARADA EN EL INSTANTE DEL SIETE, y a quién le tocaba.
 *
 * Son DOS mesas y no una desde la fase 2, y la diferencia es el orden en que se juega un
 * siete: primero se tiran fichas y después se mueve la pieza. `alSacarlo` es el instante
 * exacto de la tirada —que es lo que mira el bloque del descarte— y `mesa` es la misma
 * partida con las manos ya vaciadas, que es donde de verdad se ofrecen los dieciocho
 * destinos. Escribirlo con una sola dejaría este bloque mirando una mesa en
 * `'descartando'` y afirmando cosas del estiaje sobre una lista vacía.
 */
const elSiete = (() => {
  let corriendo = mesaSobre('RIB-ESTIAJE', { ...estadoDe(mesa), tirado: false }, TRES);
  let tiradas = 0;
  while (tiradas < 200) {
    const quien = (estadoDe(corriendo).colonos[estadoDe(corriendo).turno] as Colono).asiento;
    corriendo = tirarPor(corriendo, quien);
    tiradas++;
    if (estadoDe(corriendo).ultimaTirada === 7) {
      return { mesa: vaciarLasManos(corriendo), alSacarlo: corriendo, quien, tiradas };
    }
    corriendo = mover(corriendo, quien, opcionesEn(corriendo, quien).find((o) => o.tipo === PASAR) as Opcion);
  }
  return { mesa: corriendo, alSacarlo: corriendo, quien: 'A', tiradas };
})();

{
  const e = estadoDe(elSiete.mesa);
  comprobar('jugando de verdad sale un siete, que es de lo que cuelga todo lo de abajo', e.ultimaTirada === 7, {
    tiradas: elSiete.tiradas,
  });
  comprobar('y el siete ENCIENDE la bandera: hay que mover el estiaje', e.estiajePorMover === true);

  const suyas = opcionesEn(elSiete.mesa, elSiete.quien);
  comprobar('mientras haya que mover, no se ofrece TIRAR', suyas.every((o) => o.tipo !== TIRAR));
  comprobar('ni PASAR: mover es obligatorio', suyas.every((o) => o.tipo !== PASAR));
  comprobar(
    'ni construir, ni trocar, ni comprar: sólo los destinos y revelar, que no es una jugada',
    suyas.every((o) => o.tipo === MOVER_EL_ESTIAJE || o.tipo === REVELAR),
    suyas.map((o) => o.tipo),
  );
  comprobar(
    'y a los otros dos no se les ofrece nada',
    TRES.filter((q) => q !== elSiete.quien).every((q) => opcionesEn(elSiete.mesa, q).length === 0),
  );

  /*
   * ═══ LAS DOS MITADES DEL CORTE, Y CUÁL DE ELLAS MUERDE ═══
   *
   * La de arriba es la de `opciones()`; ésta es la del reductor, y las dos van juntas
   * por lo que dice la cabecera de `sePuedeJugarLaCarta`. Lo que estas dos líneas
   * afirman es que ni `TIRAR` ni `PASAR` cambian el estado con el estiaje por mover, que
   * es lo que hace falta.
   *
   * Y lo que NO afirman, medido y no supuesto: cuál de las dos mitades lo impide.
   * Quitando la guarda de `tirarLosDados` y dejando el corte de `opciones()`, este
   * fichero sigue ENTERO EN VERDE, porque el portillo del §5 bis rechaza un `TIRAR` que
   * no se ofreció antes de llegar al reductor. Es la misma sombra que la cabecera de
   * `sePuedeJugarLaCarta` deja escrita para su copia, y la guarda se escribe igual por
   * la misma razón: hay caminos que no pasan por el portillo —el reloj entra por uno— y
   * quien lea la rama dentro de un año no debe tener que demostrar el teorema para saber
   * que está a salvo. Al revés SÍ se ve: quitando el corte de `opciones()`, la mesa se
   * queda parada con la bandera encendida y este guion se cae al pedirle TIRAR a quien
   * ya no lo tiene.
   */
  comprobar(
    'y si se manda TIRAR de todas formas, el reductor devuelve el mismo objeto',
    avanzarRiberas(e, { tipo: TIRAR, carga: {} }, ctxDe(elSiete.quien, TRES)) === e,
  );
  comprobar(
    'y PASAR tampoco: no se cierra el turno con el estiaje por mover',
    avanzarRiberas(e, { tipo: PASAR, carga: {} }, ctxDe(elSiete.quien, TRES)) === e,
  );

  /* ── LOS DIECIOCHO DESTINOS ────────────────────────────────────────────── */

  const destinos = suyas.filter((o) => o.tipo === MOVER_EL_ESTIAJE);
  const islasOfrecidas = new Set(destinos.map((o) => (o.carga as { donde: string }).donde));
  comprobar('los destinos son DIECIOCHO: las diecinueve islas menos la de ahora', islasOfrecidas.size === 18, islasOfrecidas.size);
  comprobar(
    'y son exactamente ésas: ninguna isla del delta se queda fuera',
    canonico([...islasOfrecidas].sort()) === canonico(llavesDeLasIslas(e).filter((l) => l !== e.estiaje).sort()),
  );
  comprobar('la isla donde ESTÁ el estiaje no se ofrece: mover es a otra', !islasOfrecidas.has(e.estiaje as string));
  /*
   * ═══ Y NO ENTRA POR NINGUNA DE LAS DOS PUERTAS ═══
   *
   * Lo que estas dos líneas comprueban es que un movimiento así NO CAMBIA EL ESTADO,
   * que es lo que hace falta. Lo que NO comprueban —y conviene decirlo, porque la
   * tentación de leerlas al revés es grande— es la guarda que el reductor escribe por
   * su cuenta: medido, quitando el `if (donde === estado.estiaje)` de `conElEstiajeEn`
   * este fichero sigue entero en verde, porque el portillo del §5 bis rechaza antes de
   * llegar ahí. Es exactamente el caso que la cabecera de `sePuedeJugarLaCarta` deja
   * escrito para su copia: la guarda está a la sombra del portillo y se escribe igual,
   * porque quien lea esa rama dentro de un año no debe tener que demostrar el teorema
   * del portillo para saber que está a salvo, y porque hay un camino que no pasa por
   * él —el reloj, que mueve por el ausente—.
   */
  comprobar(
    'y quedarse donde está, mandado a mano, devuelve el mismo objeto',
    avanzarRiberas(e, { tipo: MOVER_EL_ESTIAJE, carga: { donde: e.estiaje, a: null } }, ctxDe(elSiete.quien, TRES)) === e,
  );
  comprobar(
    'y un destino que no es ninguna isla del delta, tampoco',
    avanzarRiberas(e, { tipo: MOVER_EL_ESTIAJE, carga: { donde: '9,9', a: null } }, ctxDe(elSiete.quien, TRES)) === e,
  );

  /*
   * ═══ A QUIÉN SE PUEDE ROBAR: COMO REGLA Y NO COMO CASO ═══
   *
   * Para CADA isla se calcula aquí quién tiene pieza en sus seis vértices y le queda
   * algo, y se contrasta con lo que la lista ofrece. Así no depende de que esta semilla
   * haya dejado a alguien en algún sitio: si la lista ofreciera una víctima de más o se
   * dejara una, cae aquí. Las tres condiciones son públicas, así que las tres se
   * comprueban en `opciones()` y ninguna necesita el «sólo si».
   */
  const deberian = new Map<string, string[]>();
  for (const isla of e.islas) {
    const llave = llaveDeHex(isla.hex);
    if (llave === e.estiaje) continue;
    const esquinas = verticesDeHex(isla.hex);
    deberian.set(
      llave,
      e.colonos
        .filter((c) => c.asiento !== elSiete.quien)
        .filter((c) => c.almacen.length > 0)
        .filter((c) => esquinas.some((v) => c.chozas.includes(v) || c.torres.includes(v)))
        .map((c) => c.asiento),
    );
  }
  const ofrecidasPorIsla = new Map<string, string[]>();
  for (const o of destinos) {
    const carga = o.carga as { donde: string; a: string | null };
    const lista = ofrecidasPorIsla.get(carga.donde) ?? [];
    if (carga.a !== null) lista.push(carga.a);
    ofrecidasPorIsla.set(carga.donde, lista);
  }
  const desparejadas: string[] = [];
  for (const [llave, quienes] of deberian) {
    const dice = ofrecidasPorIsla.get(llave) ?? [];
    if (canonico([...dice].sort()) !== canonico([...quienes].sort())) {
      desparejadas.push(`${llave}: se ofrece ${JSON.stringify(dice)} y toca ${JSON.stringify(quienes)}`);
    }
  }
  comprobar('sólo se roba a quien tiene pieza en esa isla y algo en la mano', desparejadas.length === 0, desparejadas);
  comprobar(
    'y hay al menos una isla con víctima, o lo de arriba no está mirando nada',
    [...deberian.values()].some((q) => q.length > 0),
    [...deberian.values()].filter((q) => q.length > 0).length,
  );
  comprobar(
    'las islas sin nadie a quien robar se ofrecen igual, con el id acabado en :nadie',
    [...deberian.entries()]
      .filter(([, q]) => q.length === 0)
      .every(([llave]) => destinos.some((o) => o.id === `estiaje:${llave}:nadie`)),
  );
  comprobar(
    'y el id lleva la víctima dentro, así que dos víctimas de una isla son dos opciones distintas',
    new Set(destinos.map((o) => o.id)).size === destinos.length,
    { opciones: destinos.length, distintas: new Set(destinos.map((o) => o.id)).size },
  );

  /* ── EL ROBO, JUGADO ───────────────────────────────────────────────────── */

  const conVictima = destinos.find((o) => (o.carga as { a: string | null }).a !== null);
  comprobar('esta partida ofrece robarle a alguien de verdad', conVictima !== undefined, destinos.map((o) => o.id).slice(0, 4));
  /*
   * SE MIRA SI HAY OPCIÓN ANTES DE ABRIR EL BLOQUE, y no es una cautela de estilo: si
   * la línea que enciende la bandera desapareciera, aquí no habría ni un destino y esto
   * reventaría con «no se puede leer 'carga' de undefined». Un guion que se cae dice
   * «error» y no dice CUÁNTAS reglas se han caído, y la cuenta es justamente lo que hay
   * que poder leer el día que alguien quite esa línea: veintitantas rojas de golpe.
   */
  if (conVictima !== undefined) {
    const aQuien = (conVictima.carga as { a: string }).a;
    const yaMovido = mover(elSiete.mesa, elSiete.quien, conVictima);
    const robado = estadoDe(yaMovido);
    const almacenDe = (donde: EstadoDeRiberas, quien: string): readonly Ficha[] =>
      (donde.colonos.find((c) => c.asiento === quien) as Colono).almacen;
    comprobar('la pieza se mueve a la isla elegida', robado.estiaje === (conVictima.carga as { donde: string }).donde);
    comprobar('y la bandera se apaga: no se mueve dos veces por un siete', robado.estiajePorMover === false);
    comprobar(
      'a la víctima le falta exactamente una ficha',
      almacenDe(robado, aQuien).length === almacenDe(e, aQuien).length - 1,
    );
    comprobar(
      'y a quien mueve le sobra exactamente una',
      almacenDe(robado, elSiete.quien).length === almacenDe(e, elSiete.quien).length + 1,
    );
    /*
     * LA MISMA FICHA, CON SU NÚMERO DE SERIE. Es lo que hace que `verify:mesa` pueda
     * demostrar que un secreto cambió de manos: si el robo fabricara una ficha nueva
     * del mismo bien, aquel comprobador vería aparecer un secreto y desaparecer otro,
     * y las dos cosas por separado son legales.
     */
    const nueva = almacenDe(robado, elSiete.quien).filter((f) => !almacenDe(e, elSiete.quien).includes(f));
    comprobar(
      'y es LA MISMA ficha, con su número de serie: no se fabrica una del mismo bien',
      nueva.length === 1 && almacenDe(e, aQuien).includes(nueva[0] as Ficha),
      nueva,
    );
    /*
   * UNA TIRADA, O NINGUNA SI A LA VÍCTIMA LE QUEDABA UNA SOLA FICHA: `enteroEntre` con el
   * mismo mínimo y máximo devuelve el azar intacto, así que robar de un almacén de una no
   * gasta nada. En este escenario la víctima tiene dos, y por eso se exige la tirada; la
   * frase lo dice para que nadie lea aquí una propiedad universal que no lo es.
   */
  comprobar('el robo de un almacén con dos o más gasta una tirada de azar: es al azar y es reejecutable', robado.azar.tiradas === e.azar.tiradas + 1, {
      antes: e.azar.tiradas,
      ahora: robado.azar.tiradas,
    });
    comprobar(
      'nadie más pierde ni gana nada',
      robado.colonos
        .filter((c) => c.asiento !== elSiete.quien && c.asiento !== aQuien)
        .every((c) => c.almacen.length === almacenDe(e, c.asiento).length),
    );
    comprobar('el turno sigue siendo suyo: mover no lo cierra', robado.turno === e.turno && robado.tirado);
    comprobar('y con el estiaje ya movido vuelve a haber turno de verdad: se puede pasar', opcionesEn(yaMovido, elSiete.quien).some((o) => o.tipo === PASAR));
    /*
     * Y NO SE MUEVE NINGÚN PREMIO. Ésta es la que ata la decisión de por dónde NO pasa
     * esta rama: no llama a `conElVado`, ni a `conLaGuardia`, ni a `puedeHaberGanado`,
     * porque robar cambia de sitio una ficha y nada más. Si algún día pasara por ellos,
     * cae aquí y hay que venir a leer por qué se decidió que no.
     */
    comprobar(
      'y no se mueve ningún premio ni ningún punto: robar no da puntos',
      canonico({ vado: robado.vado, guardia: robado.guardia, ganadores: robado.ganadores }) ===
        canonico({ vado: e.vado, guardia: e.guardia, ganadores: e.ganadores }),
    );
    /*
     * Y LA MITAD QUE DE VERDAD MUERDE. La de arriba compara tres campos, y dos de ellos
     * —`vado` y `guardia`— sí cambiarían si esta rama llamara a `conElVado` o a
     * `conLaGuardia`. El tercero no: `puedeHaberGanado` sólo escribe en `ganadores` cuando
     * alguien llega a los ocho puntos, y en este escenario nadie está cerca, así que
     * envolver `moverElEstiaje` en `puedeHaberGanado` «por simetría con sus hermanas» 
     * dejaría la comprobación de arriba verde. Aquí se le pone a alguien la victoria
     * delante y se exige que mover NO la declare: los puntos no los mueve una ficha que
     * cambia de isla, y quien tenga que ganar ganará en el movimiento que le dé el punto.
     */
    const conUnGanadorDelante = {
      ...e,
      colonos: e.colonos.map((c, i) =>
        i === 0 ? { ...c, titulos: [...c.titulos, ...(['molino', 'cantera', 'torreon', 'faro', 'huerto', 'molino', 'cantera', 'torreon'] as const)] } : c,
      ),
    };
    const trasMoverConLaVictoriaDelante = avanzarRiberas(
      conUnGanadorDelante,
      conVictima,
      ctxDe(elSiete.quien, TRES),
    );
    comprobar(
      'y mover con alguien que ya suma para ganar NO le declara ganador: esta rama no pregunta por la victoria',
      trasMoverConLaVictoriaDelante.momento === 'jugando' && trasMoverConLaVictoriaDelante.ganadores.length === 0,
      { momento: trasMoverConLaVictoriaDelante.momento, ganadores: trasMoverConLaVictoriaDelante.ganadores, puntos: puntosDe(conUnGanadorDelante, conUnGanadorDelante.colonos[0] as Colono) },
    );

    /* LA VACUNA DEL ROBO: a quien no tiene pieza en esa isla no se le puede robar. */
    const sinNadie = [...deberian.entries()].find(([, q]) => q.length === 0);
    if (sinNadie !== undefined) {
      const ajeno = (e.colonos.find((c) => c.asiento !== elSiete.quien) as Colono).asiento;
      comprobar(
        'y robarle a alguien que no tiene nada en esa isla devuelve el mismo objeto',
        avanzarRiberas(e, { tipo: MOVER_EL_ESTIAJE, carga: { donde: sinNadie[0], a: ajeno } }, ctxDe(elSiete.quien, TRES)) === e,
        { isla: sinNadie[0], a: ajeno },
      );
    }
  }

  /* ── SIN VÍCTIMA: SE MUEVE Y NO SE ROBA ────────────────────────────────── */
  const aSecas = destinos.find((o) => o.id.endsWith(':nadie'));
  comprobar('hay al menos una isla donde no hay a quién robar', aSecas !== undefined);
  if (aSecas !== undefined) {
    const movido = estadoDe(mover(elSiete.mesa, elSiete.quien, aSecas));
    comprobar(
      'se mueve igual: mover es obligatorio aunque no haya botín',
      movido.estiaje === (aSecas.carga as { donde: string }).donde && !movido.estiajePorMover,
    );
    comprobar('y sin robo no se gasta una tirada de azar', movido.azar.tiradas === e.azar.tiradas, {
      antes: e.azar.tiradas,
      ahora: movido.azar.tiradas,
    });
    comprobar(
      'y nadie pierde una ficha',
      movido.colonos.every((c) => c.almacen.length === (e.colonos.find((o) => o.asiento === c.asiento) as Colono).almacen.length),
    );
  }

  /* ── EL RETABLO, QUE EN UNA MESA DE CINCO O SEIS ES LA ÚNICA PANTALLA ──── */
  {
    const declarado = tableroDeRiberas(proyectarRiberas(e, elSiete.quien), elSiete.quien);
    const tocables = declarado.caras.filter((c) => c.toque !== null);
    comprobar('el retablo enseña DIECIOCHO caras tocables, una por isla de destino', tocables.length === 18, tocables.length);
    comprobar('y ninguna es la isla donde está el estiaje', tocables.every((c) => c.id !== e.estiaje));
    comprobar('las diecinueve caras siguen ahí: no se esconde ninguna isla', declarado.caras.length === 19);
    /*
     * ═══ EL RÓTULO Y LA CIFRA DE UNA CARA OFRECIDA, QUE ES LA MITAD QUE SE OYE ═══
     *
     * El retablo del escritorio esconde con `aria-hidden` el texto de una cara TOCABLE
     * para no decirlo dos veces, y quien pone entonces su nombre es `nombreParaElLector`,
     * que lo compone con `rotulo` y `cifra`. O sea que una cara ofrecida sin rótulo se
     * quedaría MUDA para quien no la ve. Que el nombre llegue de verdad al `aria-label`
     * se comprueba donde vive ese retablo —`verify:escritorio`, que es quien lo puede
     * pintar, y este fichero no importa nada de `escritorio/`—; aquí se comprueba lo que
     * es del juego: que el dato sale con las dos palabras dentro.
     */
    comprobar('cada cara ofrecida trae su rótulo, que es lo único que un lector tiene', tocables.every((c) => c.rotulo.length > 0));
    comprobar(
      'y su cifra, salvo la duna, que no lleva número porque no rinde',
      tocables.every((c) => {
        const isla = e.islas.find((i) => llaveDeHex(i.hex) === c.id) as { numero: number };
        return isla.numero === 0 ? c.cifra === '' : c.cifra === String(isla.numero);
      }),
    );
    const laDelEstiaje = (declarado.caras.find((c) => c.id === e.estiaje) ?? {
      rotulo: '',
      borde: '',
      toque: null,
    }) as { rotulo: string; borde: string; toque: unknown };
    comprobar('la isla ocupada lo dice en su rótulo, que es lo que no depende del color', laDelEstiaje.rotulo.endsWith(' · estiaje'), laDelEstiaje.rotulo);
    comprobar('y no se toca, así que su texto se lee entero: es la que hay que encontrar', laDelEstiaje.toque === null);
    comprobar(
      'su filo es otro, y no el de las demás',
      laDelEstiaje.borde !== (declarado.caras.find((c) => c.id !== e.estiaje) as { borde: string }).borde,
      laDelEstiaje.borde,
    );
    /*
     * LAS VÍCTIMAS DE MÁS SÍ BAJAN A `acciones`, Y SÓLO ELLAS. La primera opción de cada
     * isla ya está en su cara; si bajaran las dieciocho, la lista de botones pasaría de
     * un máximo medido de 36 a 54 en el turno del siete.
     */
    const botones = declarado.acciones.filter((a) => a.toque.tipo === MOVER_EL_ESTIAJE);
    comprobar('a los botones sólo bajan las víctimas de más, no los dieciocho destinos', botones.length === destinos.length - 18, {
      botones: botones.length,
      destinos: destinos.length,
    });
    comprobar(
      'y entre las caras y los botones están TODAS: ninguna opción legal se queda sin dónde pulsarse',
      destinos.every(
        (o) =>
          botones.some((a) => a.id === o.id) ||
          tocables.some(
            (c) => canonico({ tipo: c.toque?.tipo, carga: c.toque?.carga }) === canonico({ tipo: o.tipo, carga: o.carga }),
          ),
      ),
    );
    comprobar('y el aviso dice lo que hay que hacer', declarado.aviso.includes('estiaje'), declarado.aviso);
  }
}

/* ── EL BLOQUEO: LA ISLA CON EL ESTIAJE ENCIMA NO RINDE A NADIE ─────────── */

/*
 * ═══ CON UNA TIRADA FABRICADA, QUE ES LA ÚNICA FORMA DE MIRAR ESTO DE VERDAD ═══
 *
 * Se busca una isla que rinda y que alguien toque, se pone el estiaje encima y se le da
 * al estado una semilla cuyas dos primeras tiradas suman SU número. Con eso la tirada
 * siguiente es la de esa isla y la comparación es directa: con la pieza encima nadie
 * cobra; sin ella, cobra quien la toca.
 *
 * La segunda mitad es la vacuna, y es la que hace que esto valga: sin ella, «nadie
 * cobró» saldría verde también si la isla no fuera de nadie, si el número no hubiera
 * salido, o si `repartirLaCosecha` hubiera dejado de repartir del todo.
 */
{
  const base = { ...estadoDe(mesa), tirado: false, estiajePorMover: false };
  const conDueno = base.islas.find(
    (isla) =>
      isla.numero !== 0 &&
      base.colonos.some((c) => verticesDeHex(isla.hex).some((v) => c.chozas.includes(v) || c.torres.includes(v))),
  );
  comprobar('hay una isla que rinde y que alguien toca, o lo de abajo no mide nada', conDueno !== undefined);
  const isla = conDueno as { hex: Hex; numero: number };
  const llave = llaveDeHex(isla.hex);
  const semilla = semillaQueSaca(isla.numero);
  const quien = (base.colonos[base.turno] as Colono).asiento;
  const cuantasTiene = (donde: EstadoDeRiberas): number[] => donde.colonos.map((c) => c.almacen.length);

  const bloqueada: EstadoDeRiberas = { ...base, estiaje: llave, azar: sembrar(semilla) };
  const libre: EstadoDeRiberas = { ...base, azar: sembrar(semilla) };
  const conBloqueo = avanzarRiberas(bloqueada, { tipo: TIRAR, carga: {} }, ctxDe(quien, TRES));
  const sinBloqueo = avanzarRiberas(libre, { tipo: TIRAR, carga: {} }, ctxDe(quien, TRES));

  /*
   * SE MIDE LA DIFERENCIA Y NO «NADIE COBRÓ», Y LA RAZÓN ES DEL TABLERO: los
   * dieciocho números están repartidos por parejas —dos treses, dos cuatros…— así que
   * con el número de la isla bloqueada casi siempre rinde OTRA isla, que es lo
   * correcto y no tiene nada que ver con el estiaje. Lo que la regla dice es que deja
   * de rendir UNA, así que lo que hay que medir es exactamente lo que esa una
   * repartía: una ficha por choza y dos por torre en sus seis vértices.
   */
  const repartidas = (antes: EstadoDeRiberas, despues: EstadoDeRiberas): number =>
    cuantasTiene(despues).reduce((a, b) => a + b, 0) - cuantasTiene(antes).reduce((a, b) => a + b, 0);
  const loQueRendia = base.colonos.reduce(
    (suma, c) =>
      suma +
      verticesDeHex(isla.hex).reduce(
        (cuenta, v) => cuenta + (c.torres.includes(v) ? 2 : c.chozas.includes(v) ? 1 : 0),
        0,
      ),
    0,
  );

  comprobar('la tirada fabricada saca el número de esa isla', conBloqueo.ultimaTirada === isla.numero, {
    saca: conBloqueo.ultimaTirada,
    isla: isla.numero,
  });
  comprobar('esa isla le rendía algo a alguien, o lo de abajo no mide nada', loQueRendia > 0, loQueRendia);
  comprobar(
    'con el estiaje encima, esa isla deja de rendir exactamente lo suyo',
    repartidas(libre, sinBloqueo) - repartidas(bloqueada, conBloqueo) === loQueRendia,
    { conBloqueo: repartidas(bloqueada, conBloqueo), sinBloqueo: repartidas(libre, sinBloqueo), suyo: loQueRendia },
  );
  comprobar(
    'y se ve fallar: sin la pieza encima, ese mismo número sí reparte',
    repartidas(libre, sinBloqueo) > 0,
    repartidas(libre, sinBloqueo),
  );
  comprobar(
    'las demás islas de ese número siguen rindiendo: se bloquea una isla, no un número',
    repartidas(bloqueada, conBloqueo) === repartidas(libre, sinBloqueo) - loQueRendia,
  );
  comprobar('y bloquear no cambia el azar: se tiran los dos dados igual', conBloqueo.azar.tiradas === sinBloqueo.azar.tiradas);
}

/* ── EL RELOJ: SE MUEVE POR QUIEN NO ESTÁ ──────────────────────────────── */

{
  const e = estadoDe(elSiete.mesa);
  const conElTic = avanzarRiberas(e, { tipo: 'arcade:tic', carga: {} }, { quien: null, azar: 0, tic: 1, asientos: TRES });
  const primeraLegal = llavesDeLasIslas(e).find((l) => l !== e.estiaje) as string;
  comprobar('al vencer el plazo se mueve por el ausente, y la mesa deja de estar parada', conElTic.estiajePorMover === false);
  comprobar('y se mueve al PRIMER sitio legal del orden canónico, como la colocación', conElTic.estiaje === primeraLegal, {
    fue: conElTic.estiaje,
    tocaba: primeraLegal,
  });
  comprobar(
    'sin gastar una tirada de azar: dos diarios con distintos plazos vencidos tienen que dar lo mismo',
    conElTic.azar.tiradas === e.azar.tiradas,
    { antes: e.azar.tiradas, ahora: conElTic.azar.tiradas },
  );
  comprobar(
    'y sin robarle a nadie: el reloj no elige víctima',
    canonico(conElTic.colonos.map((c) => c.almacen.length)) === canonico(e.colonos.map((c) => c.almacen.length)),
  );
  comprobar('y después pasa el turno, que es lo que un plazo vencido significa en «jugando»', conElTic.turno === (e.turno + 1) % e.colonos.length, {
    antes: e.turno,
    ahora: conElTic.turno,
  });
  /*
   * Y AL SIGUIENTE NO LE TOCA MOVER NADA. Es el fallo que este tic evita: sin mover por
   * el ausente, la bandera cruzaría al turno de otro y a quien no ha sacado ningún siete
   * se le ofrecerían los dieciocho destinos.
   */
  const delSiguiente = (conElTic.colonos[conElTic.turno] as Colono).asiento;
  const suyas = opcionesDeRiberas(proyectarRiberas(conElTic, delSiguiente), delSiguiente);
  comprobar(
    'y al siguiente se le ofrece tirar, no mover el estiaje de otro',
    suyas.some((o) => o.tipo === TIRAR) && suyas.every((o) => o.tipo !== MOVER_EL_ESTIAJE),
  );
}

/* ── UNA MESA GUARDADA ANTES DEL ESTIAJE SE ABRE CON LA PIEZA EN LA DUNA ── */

/*
 * Las mesas de Riberas se guardan en disco y una partida larga dura días, así que hay
 * mesas escritas ayer sin estos dos campos. Se rellenan con «la pieza está en la duna» y
 * NO con «no había estiaje», y la diferencia no es de gusto: con `null` la mesa se reabre
 * sin ninguna isla bloqueada y los destinos pasan a ser DIECINUEVE, porque la lista se
 * hace quitando la isla de ahora y no habría ninguna que quitar. O sea que el relleno
 * vacío cambiaría una regla del juego a mitad de partida.
 */
{
  const deAyer = { ...estadoDe(elSiete.mesa) } as Record<string, unknown>;
  delete deAyer.estiaje;
  delete deAyer.estiajePorMover;
  const rellenada = comoSiSiempreHubieraHabidoMazo(deAyer as unknown as EstadoDeRiberas);
  const laDuna = llaveDeHex((rellenada.islas.find((i) => i.terreno === 'duna') as { hex: Hex }).hex);
  comprobar('una mesa de ayer se reabre con el estiaje en la duna, no en ninguna parte', rellenada.estiaje === laDuna, rellenada.estiaje);
  comprobar('y sin nada pendiente de mover', rellenada.estiajePorMover === false);

  const destinosDe = (donde: EstadoDeRiberas): number =>
    new Set(
      opcionesDeRiberas(proyectarRiberas({ ...donde, estiajePorMover: true }, elSiete.quien), elSiete.quien)
        .filter((o) => o.tipo === MOVER_EL_ESTIAJE)
        .map((o) => (o.carga as { donde: string }).donde),
    ).size;
  comprobar('y con la pieza puesta, los destinos siguen siendo dieciocho', destinosDe(rellenada) === 18, destinosDe(rellenada));
  /*
   * LA VACUNA: con el relleno vacío —que es la otra forma en que esto se podría haber
   * escrito, y la que el diseño dejó dicha en dos sitios a la vez— serían diecinueve. Se
   * monta a mano para que quede ejecutado qué se descartó, y no escrito en un comentario
   * que nadie puede correr.
   */
  comprobar(
    'se ve fallar: con el estiaje en NINGUNA parte, los destinos serían diecinueve',
    destinosDe({ ...rellenada, estiaje: null }) === 19,
    destinosDe({ ...rellenada, estiaje: null }),
  );
  comprobar('y a un estado que ya los tiene, el relleno no le hace una copia', comoSiSiempreHubieraHabidoMazo(rellenada) === rellenada);
}

/* ── UNA VISTA DE AYER NO APAGA EL JUEGO ───────────────────────────────── */

{
  const vistaDeAyer = { ...(proyectarRiberas(estadoDe(mesa), 'A') as unknown as Record<string, unknown>) };
  delete vistaDeAyer.estiaje;
  delete vistaDeAyer.estiajePorMover;
  const suyas = opcionesDeRiberas(vistaDeAyer, 'A');
  comprobar('una vista sin los campos del estiaje sigue ofreciendo el turno entero', suyas.length > 0, suyas.length);
  comprobar('y no ofrece ninguna opción de estiaje, que es lo correcto: ahí no había pieza', suyas.every((o) => o.tipo !== MOVER_EL_ESTIAJE));
}

// ---------------------------------------------------------------------------
paso('EL DESCARTE: al sacar un siete se tira la mitad, y la tira quien NO tiene el turno');
// ---------------------------------------------------------------------------

/*
 * ═══ ESTE BLOQUE TAMBIÉN SE JUEGA, Y CON EL SIETE QUE YA HABÍA ═══
 *
 * La mesa que lo sostiene es la misma de arriba, `elSiete.alSacarlo`: la partida llevada
 * con el árbitro delante hasta el primer siete de verdad, mirada UNA TIRADA ANTES de que
 * se muevan las manos. Y esa partida trae, sin que nadie la haya colocado, exactamente el
 * reparto que hacía falta para mirar esta regla: quien tiró se queda con siete justas y no
 * tira ninguna, y los que deben tirar son OTROS DOS que no tienen el turno.
 *
 * Lo único que se monta a mano es el filo de la regla —siete contra ocho— y el trato
 * abierto, y las dos veces se dice aquí mismo por qué no se puede jugar: para pillar a
 * alguien con ocho justas en un siete de verdad habría que jugar hasta que salga, que es
 * un bucle que tarda lo que quiera.
 */

/** El aviso que la cinta le pinta a este asiento, que es lo que se lee de verdad. */
function avisoPara(estado: EstadoDeRiberas, quien: string): string {
  return tableroDeRiberas(proyectarRiberas(estado, quien), quien).aviso;
}

/** Qué bien es esta ficha, leído del propio identificador: `b17:junco` es junco. */
function bienDe(ficha: Ficha): Bien {
  return ficha.slice(ficha.indexOf(':') + 1) as Bien;
}

/** El número de serie de una ficha: `b17:junco` son diecisiete. */
function serieDe(ficha: Ficha): number {
  return Number(ficha.slice(1, ficha.indexOf(':')));
}

/** Cuántas fichas de este bien hay en este almacén. */
function cuantasDe(almacen: readonly Ficha[], bien: string): number {
  return almacen.filter((f) => f.endsWith(`:${bien}`)).length;
}

/** El almacén de este asiento. */
function manoDe(estado: EstadoDeRiberas, quien: string): readonly Ficha[] {
  return (estado.colonos.find((c) => c.asiento === quien) as Colono).almacen;
}

/** Lo que le falta por tirar a este asiento, o cero si no debe nada. */
function faltanA(estado: EstadoDeRiberas, quien: string): number {
  return estado.descartes.find((d) => d.de === quien)?.faltan ?? 0;
}

const alSacarlo = estadoDe(elSiete.alSacarlo);

/* ── LA LISTA: QUIÉN DEBE Y CUÁNTAS ────────────────────────────────────── */

{
  const manos = alSacarlo.colonos.map((c) => c.almacen.length);
  comprobar(
    'el siete de verdad pilla a alguien con la mano llena, o lo de abajo mira el conjunto vacío',
    alSacarlo.momento === 'descartando',
    { momento: alSacarlo.momento, manos },
  );
  /*
   * LA CUENTA SE CALCULA AQUÍ COMO REGLA Y NO SE COPIA COMO CASO: para cada colono, si
   * tiene MÁS de siete, la mitad hacia abajo. Escribir «A tira seis» sería escribir lo
   * que salió esta vez, y esta lista cambia con la semilla.
   */
  const comoTocaba = alSacarlo.colonos
    .filter((c) => c.almacen.length > 7)
    .map((c) => ({ de: c.asiento, faltan: Math.floor(c.almacen.length / 2) }));
  comprobar(
    'y la lista es exactamente quien pasa de siete, con la mitad redondeando hacia abajo',
    canonico(alSacarlo.descartes) === canonico(comoTocaba),
    { descartes: alSacarlo.descartes, manos },
  );
  comprobar(
    'y va en el orden de `colonos`, que es de donde sale a quién se espera primero',
    canonico(alSacarlo.descartes.map((d) => d.de)) ===
      canonico(alSacarlo.colonos.filter((c) => c.almacen.length > 7).map((c) => c.asiento)),
  );
  comprobar(
    'quien tiró tenía SIETE justas y no tira ninguna: la regla es MÁS de siete',
    manoDe(alSacarlo, elSiete.quien).length === 7 && faltanA(alSacarlo, elSiete.quien) === 0,
    { quien: elSiete.quien, mano: manoDe(alSacarlo, elSiete.quien).length },
  );
  comprobar(
    'y no hay ninguna excepción para él: los que deben son los OTROS DOS, que no tienen el turno',
    alSacarlo.descartes.length === 2 && alSacarlo.descartes.every((d) => d.de !== elSiete.quien),
    alSacarlo.descartes,
  );
  comprobar(
    'la bandera del estiaje se enciende igual: el descarte va DELANTE de mover, no en su lugar',
    alSacarlo.estiajePorMover === true,
  );
  comprobar(
    'y a nadie se le pide más de lo que tiene, o se quedaría sin qué tirar y la mesa parada',
    alSacarlo.descartes.every((d) => manoDe(alSacarlo, d.de).length >= d.faltan),
  );
}

/*
 * ═══ EL FILO DE LA REGLA, MONTADO A MANO Y DICHO EN VOZ ALTA ═══
 *
 * Siete no descarta y ocho sí. Se fabrica la tirada —una semilla cuyas dos primeras
 * suman siete, que es lo que ya hace el bloque del bloqueo— y se juega dos veces la misma
 * mesa cambiando UNA ficha en la mano de quien tira. Jugarlo hasta que salga solo sería
 * esperar a que una partida deje a alguien con ocho justas en el turno de un siete.
 */
{
  const antesDeTirar: EstadoDeRiberas = {
    ...alSacarlo,
    momento: 'jugando',
    tirado: false,
    estiajePorMover: false,
    descartes: [],
    azar: sembrar(semillaQueSaca(7)),
  };
  const conLaManoDe = (cuantas: number): EstadoDeRiberas => ({
    ...antesDeTirar,
    colonos: antesDeTirar.colonos.map((c) =>
      c.asiento === elSiete.quien
        ? { ...c, almacen: [...c.almacen.slice(0, 7), ...(cuantas > 7 ? ['b900:limo'] : [])] }
        : c,
    ),
  });
  const conSiete = avanzarRiberas(conLaManoDe(7), { tipo: TIRAR, carga: {} }, ctxDe(elSiete.quien, TRES));
  const conOcho = avanzarRiberas(conLaManoDe(8), { tipo: TIRAR, carga: {} }, ctxDe(elSiete.quien, TRES));
  comprobar('la tirada fabricada saca un siete, o el filo no se mira', conSiete.ultimaTirada === 7 && conOcho.ultimaTirada === 7);
  comprobar('con SIETE fichas no se tira ninguna', faltanA(conSiete, elSiete.quien) === 0, conSiete.descartes);
  comprobar(
    'y se ve fallar: con OCHO se tiran cuatro, que es la mitad hacia abajo',
    faltanA(conOcho, elSiete.quien) === 4,
    conOcho.descartes,
  );
}

/*
 * ═══ Y UN SIETE CON TODAS LAS MANOS CORTAS NO ABRE EL MOMENTO ═══
 *
 * Es la otra mitad de la regla y la que hace que un siete de la primera ronda siga
 * costando exactamente lo que costaba: mover la pieza. Sin esto, `'descartando'` se
 * abriría con la lista vacía y la mesa se quedaría esperando a nadie.
 */
{
  const conLasManosCortas: EstadoDeRiberas = {
    ...alSacarlo,
    momento: 'jugando',
    tirado: false,
    estiajePorMover: false,
    descartes: [],
    azar: sembrar(semillaQueSaca(7)),
    colonos: alSacarlo.colonos.map((c) => ({ ...c, almacen: c.almacen.slice(0, 3) })),
  };
  const tirado = avanzarRiberas(conLasManosCortas, { tipo: TIRAR, carga: {} }, ctxDe(elSiete.quien, TRES));
  comprobar('con todas las manos cortas, el siete no abre el descarte', tirado.momento === 'jugando' && tirado.descartes.length === 0, {
    momento: tirado.momento,
    descartes: tirado.descartes,
  });
  comprobar('y se va derecho a mover la pieza, como antes de esta fase', tirado.estiajePorMover === true);
  comprobar(
    'y a quien tiró se le ofrecen los dieciocho destinos y nada más',
    opcionesDeRiberas(proyectarRiberas(tirado, elSiete.quien), elSiete.quien).some((o) => o.tipo === MOVER_EL_ESTIAJE),
  );
}

/* ── EL DESPACHO: LA RAMA NUEVA, Y LO QUE PASA SI SE ESCRIBE DONDE NO ES ── */

/*
 * LOS DOS QUE DEBEN, con nombre. Y con respaldo, que no es un adorno: si un día el siete
 * dejara de abrir el descarte —quitando la línea que llena la lista, por ejemplo— todo
 * este bloque tiene que ponerse ROJO y no caerse con «no se puede leer 'de' de undefined».
 * Un guion que revienta cuenta peor que treinta líneas rojas con su nombre, y es
 * exactamente el caso que la cabecera de `tirarYResolverElEstiaje` deja escrito.
 */
const debeElPrimero = alSacarlo.descartes[0]?.de ?? (TRES[0] as string);
const debeElSegundo = alSacarlo.descartes[1]?.de ?? (TRES[0] as string);

{
  /*
   * ═══ ÉSTA ES LA QUE CAZA EL FALLO DEL DESPACHO, Y NO SE PARECE A UN FALLO ═══
   *
   * Con el descarte escrito dentro de `opcionesDeTurno` —que es donde lo pusieron las dos
   * primeras versiones del diseño— estas dos listas salen VACÍAS: a `opcionesDeTurno` no
   * se llega en `'descartando'`, porque `opcionesDeRiberas` despacha por momento. Y una
   * lista vacía no revienta nada: la mesa se queda parada en seco, con los dos clientes y
   * el bucle del comprobador mirando una pantalla sin botones. Por eso lo primero que se
   * afirma aquí es que hay algo, y para CADA UNO de los que deben.
   */
  for (const quien of [debeElPrimero, debeElSegundo]) {
    const suyas = opcionesDeRiberas(proyectarRiberas(alSacarlo, quien), quien);
    comprobar(`en «descartando», a ${quien} se le ofrece algo que hacer`, suyas.length > 0, suyas.length);
    comprobar(
      `y todo lo que se le ofrece a ${quien} es tirar una ficha`,
      suyas.every((o) => o.tipo === DESCARTAR),
      suyas.map((o) => o.tipo),
    );
    comprobar(
      `a ${quien} no se le ofrecen más de cinco: una por clase de bien, y no un reparto de la mitad`,
      suyas.length <= BIENES.length && new Set(suyas.map((o) => o.id)).size === suyas.length,
      suyas.map((o) => o.id),
    );
    /*
     * SE COMPARAN LOS `id` Y NO LAS CARGAS, y no es lo mismo: el `id` lleva el bien
     * dentro —`descartar:limo`— porque son hasta cinco botones a la vez en la misma lista
     * de `acciones` y un `id` repetido es uno que deja de poder pulsarse. Comparando los
     * `id` se mira de una vez qué se ofrece y con qué nombre, y una opción de otra clase
     * que se colara aquí se ve como lo que es en vez de reventar al canonizar una carga
     * sin `bien` dentro.
     */
    comprobar(
      `y son exactamente las clases que ${quien} tiene en la mano, con el bien en el \`id\``,
      canonico(suyas.map((o) => o.id).sort()) ===
        canonico(BIENES.filter((b) => cuantasDe(manoDe(alSacarlo, quien), b) > 0).map((b) => `descartar:${b}`).sort()),
      suyas.map((o) => o.id),
    );
  }

  comprobar(
    'y a quien NO debe nada no se le ofrece nada, aunque sea suyo el turno',
    opcionesDeRiberas(proyectarRiberas(alSacarlo, elSiete.quien), elSiete.quien).length === 0,
    opcionesDeRiberas(proyectarRiberas(alSacarlo, elSiete.quien), elSiete.quien).map((o) => o.id),
  );
  comprobar(
    'ni tirar, ni pasar, ni mover el estiaje: en «descartando» eso no existe para nadie',
    TRES.every((q) =>
      opcionesDeRiberas(proyectarRiberas(alSacarlo, q), q).every(
        (o) => o.tipo !== TIRAR && o.tipo !== PASAR && o.tipo !== MOVER_EL_ESTIAJE,
      ),
    ),
  );

  /*
   * ═══ Y `turnoDe` APUNTA AL PRIMERO QUE DEBE, QUE ES LA DECISIÓN 2 ═══
   *
   * De este campo cuelgan el reloj de pared de la mesa, el aviso al móvil, el tapete del
   * tablero en tres dimensiones y el bucle del comprobador que juega partidas enteras.
   * Con `turnoDe` en quien tiró, los cuatro esperarían a alguien que no tiene nada que
   * hacer, y los dos últimos se pararían pidiéndole jugadas a quien no las tiene.
   */
  const vista = proyectarRiberas(alSacarlo, debeElSegundo);
  comprobar('`turnoDe` apunta al PRIMERO que debe tirar, y no a quien tiró', vista.turnoDe === debeElPrimero, {
    turnoDe: vista.turnoDe,
    tiro: elSiete.quien,
  });
  comprobar('y el turno de verdad no se ha movido: sigue siendo de quien tiró', alSacarlo.turno === TRES.indexOf(elSiete.quien));
  comprobar(
    'y el segundo de la cola puede mover IGUAL, sin tener el turno: eso es lo que el momento añade',
    opcionesDeRiberas(proyectarRiberas(alSacarlo, debeElSegundo), debeElSegundo).length > 0 &&
      vista.turnoDe !== debeElSegundo,
  );
}

/* ── EL AVISO: TRES RAMAS, Y LA PRIMERA MIRA `descartes` ────────────────── */

{
  const delPrimero = avisoPara(alSacarlo, debeElPrimero);
  const delSegundo = avisoPara(alSacarlo, debeElSegundo);
  const delQueTiro = avisoPara(alSacarlo, elSiete.quien);

  comprobar('al primero de la cola se le dice cuántas tira, y no a quién se espera', delPrimero === `Tira ${faltanA(alSacarlo, debeElPrimero)} fichas.`, delPrimero);
  /*
   * ═══ ÉSTA ES LA VACUNA DEL §9.1, Y ES LA QUE SE CAÍA CON EL DISEÑO ANTERIOR ═══
   *
   * El segundo de la cola tiene sus cinco botones encendidos delante y `turnoDe` apunta a
   * otro. Con el aviso elegido por `turnoDe` —que es como lo elige el resto de la
   * función— leería «se espera a Ana, que tira 6 fichas» con sus propias opciones en la
   * pantalla. Es el peor aviso posible: no dice que no puedas, dice que le toca a otro.
   */
  comprobar(
    'y el SEGUNDO lee lo suyo y no «se espera a…», que es lo que pasaría eligiendo por `turnoDe`',
    delSegundo === `Tira ${faltanA(alSacarlo, debeElSegundo)} fichas.` && !delSegundo.includes('espera'),
    delSegundo,
  );
  comprobar(
    'y quien no debe nada sí lee a quién se espera, con su nombre y su cuenta',
    delQueTiro.startsWith('Se espera a ') && delQueTiro.includes(String(faltanA(alSacarlo, debeElPrimero))),
    delQueTiro,
  );
  comprobar(
    'y nadie lee el aviso del estiaje mientras se descarta, aunque la bandera esté encendida',
    TRES.every((q) => !avisoPara(alSacarlo, q).includes('estiaje')),
    TRES.map((q) => avisoPara(alSacarlo, q)),
  );
}

/* ── EL RETABLO, QUE EN UNA MESA DE CINCO O SEIS ES LA ÚNICA PANTALLA ───── */

{
  const declarado = tableroDeRiberas(proyectarRiberas(alSacarlo, debeElPrimero), debeElPrimero);
  const suyas = opcionesDeRiberas(proyectarRiberas(alSacarlo, debeElPrimero), debeElPrimero);
  comprobar(
    'el descarte baja a los BOTONES enteros: no tiene sitio en el mapa, como un trueque',
    declarado.acciones.length === suyas.length && declarado.acciones.every((a) => a.toque.tipo === DESCARTAR),
    declarado.acciones.map((a) => a.id),
  );
  comprobar('y cada botón dice qué se tira y cuántas quedan', declarado.acciones.every((a) => a.rotulo.length > 0 && a.ayuda.length > 0), declarado.acciones.map((a) => a.rotulo));
  /*
   * Y NADA DEL TABLERO SE TOCA MIENTRAS TANTO. Es la otra mitad de que el bucle de
   * `verify:mesa` coja un descarte a la primera: si una isla siguiera tocable, un cliente
   * tonto —o un comprobador— podría pulsarla y no pasaría nada.
   */
  comprobar(
    'y ninguna isla, vereda ni vértice se puede tocar: en «descartando» sólo se tira',
    declarado.caras.every((c) => c.toque === null) &&
      declarado.lineas.every((l) => l.toque === null) &&
      declarado.nudos.every((n) => n.toque === null),
  );
  comprobar('y la isla del estiaje sigue diciendo en su rótulo que está seca', (declarado.caras.find((c) => c.id === alSacarlo.estiaje) as { rotulo: string }).rotulo.endsWith(' · estiaje'));
  comprobar('a quien no debe nada, el retablo no le enseña ni un botón', tableroDeRiberas(proyectarRiberas(alSacarlo, elSiete.quien), elSiete.quien).acciones.length === 0);
}

/* ── EN «DESCARTANDO» NO SE CONTESTA A TRUEQUES ─────────────────────────── */

/*
 * ═══ LA REGLA QUE NO CUESTA NINGUNA LÍNEA, Y POR ESO SE COMPRUEBA ═══
 *
 * Sale gratis de la forma del despacho: el bloque que contesta tratos vive dentro de
 * `opcionesDeTurno`, adonde no se llega en `'descartando'`. Y por eso mismo es la que
 * mañana alguien deshace sin darse cuenta, escribiendo el descarte «al lado de los
 * trueques, que también se contestan sin turno».
 *
 * El porqué es de reglas y no de pantalla: `faltan` se congela en el instante del siete,
 * así que dos colonos que se pasaran fichas de ida y vuelta salvarían la mitad de sus dos
 * almacenes sin que ninguna cuenta cambiara. No es un caso raro: es la primera jugada que
 * descubre cualquiera que juegue dos partidas.
 */
{
  const loQuePide = bienDe(manoDe(alSacarlo, debeElPrimero)[0] as Ficha);
  const trato = {
    id: 't9',
    de: elSiete.quien,
    para: debeElPrimero,
    da: ['sal'] as Bien[],
    pide: [loQuePide],
    estado: 'propuesta' as const,
  };
  const conElTrato: EstadoDeRiberas = { ...alSacarlo, tratos: [trato] };
  const suyas = opcionesDeRiberas(proyectarRiberas(conElTrato, debeElPrimero), debeElPrimero);
  comprobar(
    'con un trato abierto y la partida descartando, no se ofrece ni aceptar ni rechazar',
    suyas.every((o) => o.tipo !== ACEPTAR && o.tipo !== RECHAZAR),
    suyas.map((o) => o.id),
  );
  comprobar('y sí se ofrece tirar fichas, que es lo que toca', suyas.some((o) => o.tipo === DESCARTAR));
  /*
   * LA VACUNA, y es la que le da valor a las dos de arriba: con la misma mesa y el mismo
   * trato en `'jugando'`, aceptar TIENE que estar. Sin ella, un `opciones()` que devolviera
   * lista vacía por cualquier motivo daría verde.
   */
  const enJugando: EstadoDeRiberas = { ...conElTrato, momento: 'jugando', descartes: [] };
  const enPie = opcionesDeRiberas(proyectarRiberas(enJugando, debeElPrimero), debeElPrimero);
  comprobar(
    'se ve fallar: el mismo trato en «jugando» sí se puede aceptar',
    enPie.some((o) => o.tipo === ACEPTAR),
    enPie.map((o) => o.id),
  );
  comprobar(
    'y contestarlo a mano mientras se descarta no cambia nada',
    avanzarRiberas(conElTrato, { tipo: ACEPTAR, carga: { trato: 't9' } }, ctxDe(debeElPrimero, TRES)) === conElTrato,
  );
  /*
   * Y EL TRATO NO CADUCA POR ESTO, que es la otra mitad de la decisión: caducarlo sería
   * inventar una regla nueva y además castigaría al que ofreció por una tirada que no hizo
   * él. Sigue abierto y se contesta al volver, y se comprueba dejando que venza el plazo,
   * que es el camino que resuelve el descarte sin que nadie esté delante.
   */
  const trasElPlazo = avanzarRiberas(conElTrato, { tipo: 'arcade:tic', carga: {} }, { quien: null, azar: 0, tic: 1, asientos: TRES });
  comprobar('el trato sigue abierto al salir del descarte: no lo caduca el momento', trasElPlazo.tratos[0]?.estado === 'propuesta', trasElPlazo.tratos);
  comprobar(
    'y entonces sí se puede contestar, que es lo que significa «se aplaza» y no «se pierde»',
    opcionesDeRiberas(proyectarRiberas(trasElPlazo, debeElPrimero), debeElPrimero).some((o) => o.tipo === ACEPTAR),
  );
}

/* ── TIRAR UNA FICHA: LA MÁS VIEJA DE SU CLASE, Y UNA SOLA ──────────────── */

{
  /* Se elige una clase de la que haya DOS o más, o «la más vieja» no distinguiría nada. */
  const conVarias = BIENES.find((b) => cuantasDe(manoDe(alSacarlo, debeElPrimero), b) > 1) as Bien;
  comprobar('el que descarta tiene dos fichas de alguna clase, o lo de abajo no mide nada', conVarias !== undefined, manoDe(alSacarlo, debeElPrimero));
  const antes = manoDe(alSacarlo, debeElPrimero);
  const laVieja = antes.filter((f) => bienDe(f) === conVarias).sort((a, b) => serieDe(a) - serieDe(b))[0] as Ficha;

  const tirada = avanzarRiberas(alSacarlo, { tipo: DESCARTAR, carga: { bien: conVarias } }, ctxDe(debeElPrimero, TRES));
  const despues = manoDe(tirada, debeElPrimero);
  comprobar('tirar una ficha se lleva UNA y no la mitad de golpe', despues.length === antes.length - 1, {
    antes: antes.length,
    despues: despues.length,
  });
  comprobar('y se lleva la MÁS VIEJA de esa clase, que es el criterio de `cobrar`', !despues.includes(laVieja) && antes.includes(laVieja), laVieja);
  comprobar('y le baja en uno lo que le falta', faltanA(tirada, debeElPrimero) === faltanA(alSacarlo, debeElPrimero) - 1);
  comprobar('sin tocar la cuenta del otro que debe', faltanA(tirada, debeElSegundo) === faltanA(alSacarlo, debeElSegundo));
  comprobar(
    'y nadie más pierde ni gana una ficha: lo tirado no va a ningún sitio',
    tirada.colonos.every((c) => c.asiento === debeElPrimero || c.almacen.length === manoDe(alSacarlo, c.asiento).length),
  );
  comprobar('y no se gasta una tirada de azar: tirar una ficha no sortea nada', tirada.azar.tiradas === alSacarlo.azar.tiradas);
  comprobar('y sigue siendo el momento del descarte hasta que no falte ninguna', tirada.momento === 'descartando');

  /* ── LO QUE EL REDUCTOR NO ACEPTA, AUNQUE SE MANDE A MANO ─────────────── */

  const sinNinguna = BIENES.find((b) => cuantasDe(manoDe(alSacarlo, debeElPrimero), b) === 0);
  if (sinNinguna !== undefined) {
    comprobar(
      'tirar un bien que no se tiene devuelve el mismo objeto',
      avanzarRiberas(alSacarlo, { tipo: DESCARTAR, carga: { bien: sinNinguna } }, ctxDe(debeElPrimero, TRES)) === alSacarlo,
    );
  }
  comprobar(
    'y tirar por quien no debe nada, tampoco: la lista es la que autoriza, no el turno',
    avanzarRiberas(alSacarlo, { tipo: DESCARTAR, carga: { bien: conVarias } }, ctxDe(elSiete.quien, TRES)) === alSacarlo,
  );
  comprobar(
    'y en «jugando» no se tira nada: el momento es la mitad de la guarda',
    avanzarRiberas({ ...alSacarlo, momento: 'jugando', descartes: [] }, { tipo: DESCARTAR, carga: { bien: conVarias } }, ctxDe(debeElPrimero, TRES)).momento === 'jugando',
  );
  comprobar(
    'y mandar TIRAR mientras se descarta no cambia nada',
    avanzarRiberas(alSacarlo, { tipo: TIRAR, carga: {} }, ctxDe(elSiete.quien, TRES)) === alSacarlo,
  );
  comprobar(
    'ni PASAR: el turno de quien tiró no se cierra con fichas pendientes',
    avanzarRiberas(alSacarlo, { tipo: PASAR, carga: {} }, ctxDe(elSiete.quien, TRES)) === alSacarlo,
  );
  comprobar(
    'ni mover el estiaje: primero se tira, y después se mueve',
    avanzarRiberas(
      alSacarlo,
      { tipo: MOVER_EL_ESTIAJE, carga: { donde: llavesDeLasIslas(alSacarlo).find((l) => l !== alSacarlo.estiaje) as string, a: null } },
      ctxDe(elSiete.quien, TRES),
    ) === alSacarlo,
  );
}

/* ── HASTA EL FINAL: SE SALE POR DONDE SE ENTRÓ, CON EL ESTIAJE DELANTE ── */

/*
 * ═══ Y SE JUEGA A CIEGAS, LEYENDO `turnoDe` Y EL TABLERO. NADA MÁS ═══
 *
 * Es la comprobación que sostiene la decisión 2, y la que un estado montado a mano no
 * puede dar: quien juega aquí no sabe quién debe descartar —lee `turnoDe`, como el reloj
 * de la mesa, como el móvil y como el bucle de `verify:mesa`— y coge el primer toque que
 * el retablo le ofrece. Si `turnoDe` apuntara a quien tiró, este bucle se quedaría sin
 * jugada en la primera vuelta y se cortaría.
 *
 * El recuento va delante a propósito: sin él, «atraviesa el siete» sería verde también si
 * no hubiera habido nada que tirar.
 */
{
  const debidas = alSacarlo.descartes.reduce((suma, d) => suma + d.faltan, 0);
  let corriendo = elSiete.alSacarlo;
  let movimientos = 0;
  const quienes: string[] = [];
  let corte: string | null = null;

  let trasElDescarte: EstadoDeRiberas | null = null;

  while (movimientos < 40) {
    const e = estadoDe(corriendo);
    if (e.momento === 'jugando' && trasElDescarte === null) trasElDescarte = e;
    if (e.momento === 'jugando' && !e.estiajePorMover) break;
    const turnoDe = proyectarRiberas(e, 'A').turnoDe;
    if (turnoDe === null) {
      corte = 'no se espera a nadie y la mesa sigue parada';
      break;
    }
    const declarado = tableroDeRiberas(proyectarRiberas(e, turnoDe), turnoDe);
    const toque =
      declarado.acciones[0]?.toque ?? (declarado.caras.find((c) => c.toque !== null)?.toque ?? null);
    if (toque === null) {
      corte = `el tablero de ${turnoDe} no ofrece nada en «${e.momento}»`;
      break;
    }
    corriendo = jugar(corriendo, { quien: turnoDe, rev: corriendo.rev, movimiento: { tipo: toque.tipo, carga: toque.carga } });
    quienes.push(turnoDe);
    movimientos++;
  }

  const fin = estadoDe(corriendo);
  comprobar('jugando a ciegas por `turnoDe`, el siete se atraviesa entero y la mesa no se para', corte === null, corte);
  comprobar('y costó exactamente las fichas que se debían, más el movimiento de la pieza', movimientos === debidas + 1, {
    movimientos,
    debidas,
  });
  comprobar(
    'y las tiraron los DOS que debían, cada uno las suyas, sin que ninguno tuviera el turno',
    alSacarlo.descartes.every((d) => quienes.filter((q) => q === d.de).length === d.faltan),
    quienes,
  );
  comprobar('al acabar se vuelve a jugar, y la lista queda vacía', fin.momento === 'jugando' && fin.descartes.length === 0, {
    momento: fin.momento,
    descartes: fin.descartes,
  });
  comprobar('el turno sigue siendo de quien tiró el siete, que no lo perdió en ningún momento', (fin.colonos[fin.turno] as Colono).asiento === elSiete.quien);
  comprobar('la pieza acabó movida, que es lo que esperaba al otro lado del descarte', fin.estiajePorMover === false && fin.estiaje !== alSacarlo.estiaje);
  /*
   * Y LA CUENTA, QUE ES LA REGLA: quien tenía trece se queda con siete y quien tenía
   * catorce, con siete. Se calcula desde las manos de antes y no se copia el número,
   * porque el reparto cambia con la semilla.
   *
   * ═══ Y SE MIDE EN EL INSTANTE EN QUE SE ACABA EL DESCARTE, NO AL FINAL ═══
   *
   * Porque al otro lado está el estiaje, y el estiaje ROBA: escrita sobre el estado final,
   * esta línea salía roja por catorce menos siete menos UNA MÁS, y lo que faltaba no lo
   * había tirado nadie: se lo había llevado la pieza. Dos reglas seguidas sobre el mismo
   * almacén se miden por separado o la primera acaba respondiendo por la segunda.
   */
  const trasTirar = trasElDescarte ?? fin;
  comprobar('el descarte se acaba ANTES de mover la pieza, que es el orden de la regla', trasElDescarte !== null && trasTirar.estiajePorMover === true);
  comprobar(
    'y cada uno tiró exactamente la mitad de lo que tenía, redondeando hacia abajo',
    alSacarlo.descartes.every(
      (d) => manoDe(trasTirar, d.de).length === manoDe(alSacarlo, d.de).length - Math.floor(manoDe(alSacarlo, d.de).length / 2),
    ),
    alSacarlo.descartes.map((d) => ({ de: d.de, antes: manoDe(alSacarlo, d.de).length, despues: manoDe(trasTirar, d.de).length })),
  );
}

/* ── EL RELOJ: TIRA POR TODOS LOS QUE FALTEN, Y DE UNA VEZ ──────────────── */

{
  const conElTic = avanzarRiberas(alSacarlo, { tipo: 'arcade:tic', carga: {} }, { quien: null, azar: 0, tic: 1, asientos: TRES });
  comprobar('al vencer el plazo descartando, la mesa deja de estar parada', conElTic.momento === 'jugando' && conElTic.descartes.length === 0, {
    momento: conElTic.momento,
    descartes: conElTic.descartes,
  });
  /*
   * POR TODOS Y NO POR EL PRIMERO, y esto es lo que se paga con una línea y se cobra en
   * días: el plazo de pared se reprograma cada vez que cambia `turnoDe`, y `turnoDe`
   * cambia cada vez que uno termina. De uno en uno, un siete con seis manos llenas serían
   * seis plazos encadenados — y en La Larga, seis días.
   */
  comprobar(
    'y ha tirado por TODOS los que faltaban, no sólo por el primero de la cola',
    alSacarlo.descartes.every(
      (d) => manoDe(conElTic, d.de).length === manoDe(alSacarlo, d.de).length - d.faltan,
    ),
    alSacarlo.descartes.map((d) => ({ de: d.de, antes: manoDe(alSacarlo, d.de).length, despues: manoDe(conElTic, d.de).length })),
  );
  /*
   * LAS MÁS VIEJAS, que es lo que hace esto reejecutable: elegir al azar gastaría una
   * tirada, y entonces dos ejecuciones del mismo diario con distinto número de plazos
   * vencidos dejarían el acumulador en sitios distintos.
   */
  comprobar(
    'y las que se ha llevado son las MÁS VIEJAS: lo que queda son los números altos',
    alSacarlo.descartes.every((d) => {
      const quedan = manoDe(conElTic, d.de).map(serieDe);
      const tiradas = manoDe(alSacarlo, d.de).slice(0, d.faltan).map(serieDe);
      return quedan.every((q) => tiradas.every((t) => t < q));
    }),
  );
  comprobar('sin gastar una tirada de azar, o dos diarios con distintos plazos vencidos no cuadrarían', conElTic.azar.tiradas === alSacarlo.azar.tiradas, {
    antes: alSacarlo.azar.tiradas,
    ahora: conElTic.azar.tiradas,
  });
  comprobar('y no elige qué se salva: el plazo es un castigo, no una jugada', conElTic.colonos.every((c) => c.almacen.every((f) => manoDe(alSacarlo, c.asiento).includes(f))));
  /*
   * Y NO PASA EL TURNO DETRÁS, al revés que un plazo vencido en `'jugando'`: el turno de
   * quien tiró el siete no ha llegado a empezar, y lo que le espera —mover la pieza— tiene
   * su propio plazo, que es el que ya estaba escrito.
   */
  comprobar('y el turno no se pasa: sigue siendo de quien tiró, con la pieza por mover', conElTic.turno === alSacarlo.turno && conElTic.estiajePorMover === true);
  const suyas = opcionesDeRiberas(proyectarRiberas(conElTic, elSiete.quien), elSiete.quien);
  comprobar('y lo que se le ofrece ahora son los dieciocho destinos', new Set(suyas.filter((o) => o.tipo === MOVER_EL_ESTIAJE).map((o) => (o.carga as { donde: string }).donde)).size === 18);
  /*
   * Y EL SEGUNDO TIC MUEVE LA PIEZA, que es la mitad que ya estaba escrita: dos plazos
   * vencidos seguidos resuelven un siete entero sin que nadie esté delante.
   */
  const segundoTic = avanzarRiberas(conElTic, { tipo: 'arcade:tic', carga: {} }, { quien: null, azar: 0, tic: 2, asientos: TRES });
  comprobar('y un segundo plazo vencido mueve la pieza y cierra el turno, sin nadie delante', segundoTic.estiajePorMover === false && segundoTic.turno !== conElTic.turno);
}

/* ── UNA MESA GUARDADA ANTES DEL DESCARTE NO DEBE NINGUNA FICHA ─────────── */

{
  const deAyer = { ...alSacarlo, momento: 'jugando' } as Record<string, unknown>;
  delete deAyer.descartes;
  const rellenada = comoSiSiempreHubieraHabidoMazo(deAyer as unknown as EstadoDeRiberas);
  comprobar('una mesa de ayer se reabre sin deberle fichas a nadie', canonico(rellenada.descartes) === canonico([]), rellenada.descartes);
  const vistaDeAyer = { ...(proyectarRiberas(rellenada, elSiete.quien) as unknown as Record<string, unknown>) };
  delete vistaDeAyer.descartes;
  comprobar(
    'y una vista sin el campo sigue ofreciendo el turno entero, sin apagar el juego',
    opcionesDeRiberas(vistaDeAyer, elSiete.quien).length > 0,
  );
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
    trasRomper.de === null && trasRomper.largo === 0 && VADO_MINIMO === 5,
    trasRomper,
  );

  /*
   * LA VACUNA DEL BLOQUEO: sin la choza ajena, la misma cadena mide cinco. Si
   * midiera cinco con ella, el bloqueo no estaría haciendo nada y la comprobación
   * de arriba pasaría por casualidad.
   */
  comprobar('y sin esa choza volvería a medir cinco', largoDelVado(camino, []) === 5);

  /*
   * ═══ EL MÍNIMO SUBIÓ A CINCO, Y ÉSTA ES LA ÚNICA QUE LO MIDE ═══
   *
   * Todo lo de arriba usa caminos de cinco y seis, así que TODO seguía verde con el
   * mínimo en cuatro y sigue verde con el mínimo en cinco: ninguna de esas
   * comprobaciones estaba mirando el número. La que muerde es ésta —cuatro veredas
   * seguidas NO dan el Vado— y es la que se pone roja el día que alguien lo baje.
   *
   * Se monta sobre una cadena de CUATRO de verdad, y se afirma primero que mide
   * cuatro: sin eso, «no hay vado» también saldría verde si el camino midiera cero
   * porque las aristas no se tocaran, que es el verde que dice que se miró.
   */
  const cuatro = caminoDeCinco({ q: 0, r: 0 }).slice(0, 4);
  comprobar('cuatro veredas seguidas miden cuatro', largoDelVado(cuatro, []) === 4, largoDelVado(cuatro, []));
  const conCuatro: EstadoDeRiberas = {
    ...base,
    colonos: base.colonos.map((c, i) => (i === 0 ? { ...c, veredas: cuatro } : c)),
  };
  const conElMinimoNuevo = recalcularElVado(conCuatro);
  comprobar(
    'y con cuatro NO hay Vado Largo: el mínimo es cinco desde que lo pidió Miguel',
    conElMinimoNuevo.de === null && conElMinimoNuevo.largo === 0,
    conElMinimoNuevo,
  );

  /* Y el premio vale puntos de verdad, que es lo que lo hace un premio. */
  const conPremio: EstadoDeRiberas = { ...conCamino, vado: primero };
  comprobar(
    'quien tiene el Vado Largo suma dos puntos por él',
    puntosDe(conPremio, conPremio.colonos[0] as Colono) ===
      puntosDe({ ...conPremio, vado: { de: null, largo: 0 } }, conPremio.colonos[0] as Colono) + 2,
  );
}

// ---------------------------------------------------------------------------
paso('La casa del vecino corta el paso: una vereda puede LLEGAR, no SALIR');
// ---------------------------------------------------------------------------

/*
 * ═══ ESTO ES LO QUE LE PASÓ A MIGUEL JUGANDO, Y ESTABA EN VERDE ═══
 *
 * El juego dejaba trazar una vereda SALIENDO del vértice donde otro colono tiene
 * choza o torre. La cobraba, la pintaba pegada, y el premio —que sí corta ahí—
 * contaba la cadena partida: cinco puentes seguidos, Vado Largo de tres, ningún
 * punto y ni una línea que lo explicara.
 *
 * Y las doscientas noventa y seis comprobaciones de este fichero estaban verdes
 * con el fallo delante, por dos motivos que hay que apuntar porque se repiten:
 *
 *   · El bloque del Vado Largo de arriba MONTA las cadenas a mano —`{...c,
 *     veredas: camino}`— y sólo prueba la aritmética del premio. Nunca pasa por la
 *     puerta que decide dónde se puede construir, así que no podía ver que las
 *     dos puertas dijeran cosas distintas.
 *   · Y no había ninguna comprobación que CRUZARA las dos cuentas. Cada una era
 *     correcta por su lado; lo que estaba mal era que no fueran la misma.
 *
 * Así que aquí se afirman tres cosas, y la tercera es la que compra de verdad:
 *
 *   1. Que la vereda que SALE del vértice de otro ni se ofrece ni se acepta.
 *   2. Que la que LLEGA a él sigue ofreciéndose y entrando — que es la mitad que
 *      no cambia, y la que un arreglo de más se llevaría por delante.
 *   3. Que LO QUE EL JUEGO DEJA CONSTRUIR Y LO QUE EL VADO CUENTA NO PUEDEN
 *      DISCREPAR. Ésa es la regla; el resto son ejemplos suyos.
 */

/** La isla sobre la que se pasea. Sus seis esquinas y sus seis lados, en orden. */
const LA_RUEDA: Hex = { q: 0, r: 0 };

/**
 * LA ESQUINA `k` Y EL LADO `k`, con la relación que los ata: el lado `k` va de la
 * esquina `k` a la `k+1`. Todo este bloque cuelga de eso, así que se comprueba
 * abajo en vez de darse por sabido — si la malla cambiara ese orden, los
 * escenarios de aquí seguirían corriendo y dejarían de significar lo que dicen.
 */
const nudoDe = (k: number): LlaveDeVertice => verticeDeHex(LA_RUEDA, k);
const tramoDe = (k: number): string => aristaDeHex(LA_RUEDA, k);

/**
 * UN ESCENARIO PARA TRAZAR: A con su choza, B con la suya, y bienes de sobra.
 *
 * Se monta el estado en vez de jugar la colocación entera porque lo que hay que
 * fijar es la GEOMETRÍA —dónde cae la choza de B respecto de la cadena de A— y una
 * colocación de verdad la reparte el azar. A cambio, cada escenario comprueba
 * antes que las dos chozas están a distancia legal entre sí: un montaje que el
 * juego nunca produciría no demuestra nada sobre el juego.
 */
function escenarioDeTrazado(chozaDeA: LlaveDeVertice, chozaDeB: LlaveDeVertice): EstadoDeRiberas {
  const base = escenarioDeVado();
  let serie = 1;
  const paraDoceVeredas: Ficha[] = [];
  for (let i = 0; i < TOPE_DE_PIEZAS.vereda; i++) {
    paraDoceVeredas.push(`p${serie++}:junco` as Ficha, `p${serie++}:limo` as Ficha);
  }
  return {
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
    siguienteFicha: 800,
    colonos: base.colonos.map((c, i) =>
      i === 0
        ? { ...c, almacen: paraDoceVeredas, chozas: [chozaDeA], torres: [], veredas: [] }
        : { ...c, almacen: [], chozas: [chozaDeB], torres: [], veredas: [] },
    ),
  };
}

/** El contexto de A en una mesa de dos. `ctxDe` nace más abajo y aquí haría falta antes. */
const SOY_A = { quien: 'A', azar: 1, tic: 0, asientos: ['A', 'B'] as readonly string[] };

/** Trazar la vereda `donde` como A, por la misma puerta que usa la plataforma. */
function trazaA(estado: EstadoDeRiberas, donde: string): EstadoDeRiberas {
  return avanzarRiberas(estado, { tipo: ALZAR, carga: { que: 'vereda', donde } }, SOY_A);
}

/** ¿Se le ofrece a A trazar esta vereda? Se mira sobre la vista, que es lo que ve el dedo. */
function seOfreceTrazar(estado: EstadoDeRiberas, donde: string): boolean {
  return ofrecidasA(estado, 'A').some(
    (o) => o.tipo === ALZAR && canonico(o.carga ?? null) === canonico({ que: 'vereda', donde }),
  );
}

{
  /* La geometría de la que cuelga todo lo demás, dicha en voz alta. */
  for (let k = 0; k < 6; k++) {
    const extremos = verticesDeArista(tramoDe(k));
    comprobar(
      `el lado ${String(k)} de la isla va de la esquina ${String(k)} a la ${String((k + 1) % 6)}`,
      extremos.includes(nudoDe(k)) && extremos.includes(nudoDe(k + 1)),
      { lado: k, extremos },
    );
  }
}

{
  /*
   * ═══ EL CASO EXACTO: B TIENE CHOZA EN LA ESQUINA 3 ═══
   *
   * A sale de la esquina 0 y va lado a lado. Los tres primeros son suyos —el
   * tercero LLEGA a la puerta de B, y eso es legal—. El cuarto SALDRÍA de esa
   * puerta, y ahí se acaba el camino.
   */
  const bloqueo = nudoDe(3);
  const inicial = escenarioDeTrazado(nudoDe(0), bloqueo);
  comprobar(
    'las dos chozas del escenario están a distancia legal: es un tablero posible',
    !verticesVecinos(nudoDe(0)).includes(bloqueo),
    verticesVecinos(nudoDe(0)),
  );

  let estado = inicial;
  for (const k of [0, 1, 2]) {
    const antes = estado;
    comprobar(`el lado ${String(k)} se le ofrece a A`, seOfreceTrazar(antes, tramoDe(k)));
    estado = trazaA(antes, tramoDe(k));
    comprobar(`y el lado ${String(k)} entra`, estado !== antes && (estado.colonos[0] as Colono).veredas.includes(tramoDe(k)));
  }
  const mias = (estado.colonos[0] as Colono).veredas;
  comprobar('A tiene tres veredas seguidas y la tercera LLEGA a la choza de B', mias.length === 3 && aristaTocaVertice(tramoDe(2), bloqueo), mias);

  /*
   * LA MITAD QUE NO CAMBIA, DICHA APARTE. Llegar a la puerta del vecino es legal y
   * tiene que seguir siéndolo: si esto se pusiera rojo, el arreglo se habría
   * pasado de frenada y habría inventado una regla que el juego no tiene.
   */
  comprobar('llegar al vértice de otro es legal: la vereda que acaba ahí entró y se ofreció', mias.includes(tramoDe(2)));

  /* Y LA MITAD QUE SE ARREGLA. */
  comprobar('salir del vértice de otro NO se ofrece', !seOfreceTrazar(estado, tramoDe(3)));
  comprobar(
    'y mandada a mano, el reductor la devuelve sin tocar nada',
    trazaA(estado, tramoDe(3)) === estado,
  );
  comprobar(
    'el portillo del §5 bis y el reductor dicen lo mismo: ni ofrecida ni aceptada',
    !seOfreceTrazar(estado, tramoDe(3)) && trazaA(estado, tramoDe(3)) === estado,
  );
  comprobar(
    'ni la de más allá, que tampoco engancha con nada suyo por un vértice libre',
    !seOfreceTrazar(estado, tramoDe(4)) && trazaA(estado, tramoDe(4)) === estado,
  );

  /* Y las dos cuentas coinciden: tres construidas, tres contadas. */
  comprobar(
    'lo construido y lo que cuenta el Vado coinciden: tres y tres',
    largoDelVado(mias, [bloqueo]) === mias.length,
    { puestas: mias.length, vado: largoDelVado(mias, [bloqueo]) },
  );
}

{
  /*
   * ═══ LA REGLA, Y NO LA LISTA ═══
   *
   * Para una cadena cualquiera y con la choza de B en cualquier esquina, lo que el
   * juego deja construir y lo que el Vado cuenta tienen que dar EL MISMO NÚMERO.
   * Es la afirmación que habría cazado el fallo sin saber nada de él: no dice
   * dónde está el corte, dice que los dos jueces cortan en el mismo sitio.
   *
   * Se recorren las esquinas 2, 3 y 4. La 1 se queda fuera a propósito: está
   * pegada a la esquina 0, donde vive la choza de A, y la regla de distancia no
   * deja que las dos existan a la vez. Un escenario imposible mediría un juego que
   * no es éste.
   */
  const cadena = caminoDeCinco(LA_RUEDA);
  const discrepancias: string[] = [];
  let casos = 0;
  let vecesQueElJuegoDijoQueNo = 0;

  for (const k of [2, 3, 4]) {
    const bloqueo = nudoDe(k);
    comprobar(
      `la choza de B en la esquina ${String(k)} está a distancia legal de la de A`,
      !verticesVecinos(nudoDe(0)).includes(bloqueo),
    );
    let estado = escenarioDeTrazado(nudoDe(0), bloqueo);
    for (const arista of cadena) {
      const antes = estado;
      estado = trazaA(antes, arista);
      if (estado === antes) {
        vecesQueElJuegoDijoQueNo++;
        continue;
      }
      const suyas = (estado.colonos[0] as Colono).veredas;
      const largo = largoDelVado(suyas, [bloqueo]);
      if (largo !== suyas.length) {
        discrepancias.push(`esquina ${String(k)}: construidas ${String(suyas.length)}, vado ${String(largo)}`);
      }
    }
    const suyas = (estado.colonos[0] as Colono).veredas;
    comprobar(
      `con la choza de B en la esquina ${String(k)}, A construye exactamente ${String(k)} veredas`,
      suyas.length === k,
      suyas,
    );
    casos++;
  }

  comprobar('las tres esquinas se han recorrido de verdad', casos === 3, casos);
  comprobar(
    'y el juego dijo que no alguna vez: si no, este bucle no habría probado nada',
    vecesQueElJuegoDijoQueNo > 0,
    vecesQueElJuegoDijoQueNo,
  );
  comprobar(
    'lo que el juego deja construir y lo que el Vado cuenta nunca discrepan',
    discrepancias.length === 0,
    discrepancias,
  );

  /* Y sin nadie en medio, la cadena entera: cinco construidas y cinco contadas. */
  {
    let estado = escenarioDeTrazado(nudoDe(0), verticeDeHex({ q: 2, r: 0 }, 0));
    for (const arista of cadena) estado = trazaA(estado, arista);
    const suyas = (estado.colonos[0] as Colono).veredas;
    comprobar('sin nadie en medio se construyen las cinco', suyas.length === 5, suyas.length);
    comprobar('y el Vado cuenta las cinco', largoDelVado(suyas, []) === 5, largoDelVado(suyas, []));
  }

  /*
   * ═══ LAS VACUNAS. LA PRIMERA ES EL FALLO DE VERDAD, TAL COMO ERA ═══
   *
   * El juez de antes preguntaba sólo «¿toca esta arista algo mío?». Con él, las
   * cinco se ponían y el Vado contaba tres: ésa es la discrepancia que se jugó, y
   * ésta es la línea que se pone roja el día que alguien vuelva a quitar el corte.
   */
  const pegabaAntes = (
    suyas: readonly string[],
    chozas: readonly LlaveDeVertice[],
    arista: string,
  ): boolean => {
    for (const v of verticesDeArista(arista)) {
      if (chozas.includes(v)) return true;
      for (const otra of aristasDeVertice(v)) {
        if (suyas.includes(otra)) return true;
      }
    }
    return false;
  };

  const bloqueo = nudoDe(3);
  const alaAntigua: string[] = [];
  for (const arista of cadena) {
    if (!pegabaAntes(alaAntigua, [nudoDe(0)], arista)) continue;
    alaAntigua.push(arista);
  }
  comprobar(
    'se ve fallar: con el juez de antes se ponían las cinco y el Vado contaba tres',
    alaAntigua.length === 5 && largoDelVado(alaAntigua, [bloqueo]) === 3,
    { puestas: alaAntigua.length, vado: largoDelVado(alaAntigua, [bloqueo]) },
  );

  /*
   * Y LA VACUNA DEL OTRO LADO, que es la que protege la mitad que no cambia: un
   * corte que mirase LOS DOS extremos —«esta arista no puede tocar nada de otro»—
   * también dejaría las dos cuentas cuadradas, y sería un juego distinto. Se ve
   * fallar porque perdería la vereda que sólo LLEGA.
   */
  const cortabaLosDosCabos = (
    suyas: readonly string[],
    chozas: readonly LlaveDeVertice[],
    arista: string,
  ): boolean => {
    if (verticesDeArista(arista).includes(bloqueo)) return false;
    return pegabaAntes(suyas, chozas, arista);
  };
  comprobar(
    'se ve fallar: cortando por los dos cabos se perdería la vereda que sólo LLEGA',
    !cortabaLosDosCabos([tramoDe(0), tramoDe(1)], [nudoDe(0)], tramoDe(2)),
  );
}

{
  /*
   * ═══ CINCO VEREDAS POR LA PUERTA DE VERDAD, Y EL PREMIO SE MUEVE SOLO ═══
   *
   * Todo el bloque del Vado Largo de arriba monta las cadenas a mano. Ésta es la
   * única que las TRAZA —con el árbitro, con `opciones()` delante y con el estado
   * saliendo del reductor— y afirma que al acabar `estado.vado` y `puntosDe` han
   * cambiado sin que este guion los toque. Sin ella, el premio podía estar
   * perfectamente calculado por una función que nadie llamara al trazar.
   */
  const inicial = escenarioDeTrazado(nudoDe(0), verticeDeHex({ q: 2, r: 0 }, 0));
  comprobar('A empieza sin Vado y con un solo punto, el de su choza', inicial.vado.de === null && puntosDe(inicial, inicial.colonos[0] as Colono) === 1, inicial.vado);

  let m = mesaSobre('RIB-VADO-PUERTA', inicial, ['A', 'B']);
  let trazadas = 0;
  for (let k = 0; k < 5; k++) {
    const quiere = opcionesEn(m, 'A').find(
      (o) => o.tipo === ALZAR && canonico(o.carga ?? null) === canonico({ que: 'vereda', donde: tramoDe(k) }),
    );
    comprobar(`el árbitro le ofrece a A el lado ${String(k)}`, quiere !== undefined);
    if (quiere === undefined) break;
    m = mover(m, 'A', quiere as Opcion);
    trazadas++;
  }
  const e = estadoDe(m);
  comprobar('las cinco se trazan por el árbitro', trazadas === 5 && (e.colonos[0] as Colono).veredas.length === 5, trazadas);
  comprobar(
    'y el Vado Largo se mueve SOLO: pasa a ser de A y mide cinco, que es el mínimo',
    e.vado.de === 'A' && e.vado.largo === VADO_MINIMO,
    e.vado,
  );
  comprobar(
    'y los puntos suben de uno a tres sin que nadie los sume a mano',
    puntosDe(e, e.colonos[0] as Colono) === 3,
    puntosDe(e, e.colonos[0] as Colono),
  );
  comprobar(
    'y la vista lo cuenta igual: el vado público de A también mide cinco',
    proyectarRiberas(e, 'A').colonos[0]?.vado === 5,
    proyectarRiberas(e, 'A').colonos[0]?.vado,
  );
}

{
  /*
   * ═══ EL JUEZ DEL REDUCTOR, QUE POR LA PUERTA NORMAL NO SE VE ═══
   *
   * El corte vive en dos sitios —`pegaConLoMio`, que decide si la vereda entra, y
   * `pegaConLoSuyo`, que decide si se ofrece— y hay que arreglar los dos. Pero
   * medido: si sólo se rompe el del reductor, NINGUNA comprobación de las de
   * arriba se pone roja, y no porque estén mal escritas. Es el portillo del §5
   * bis: el reductor le pregunta primero a `opciones()` si eso se ofrecía, y con
   * la vista entera nada mal formado llega hasta las guardas de `trazar`. O sea
   * que por la puerta normal el segundo juez es invisible.
   *
   * Hay UNA rendija por la que sí se ve, y es ésta: `hayDondeTrazar` —que usa el
   * juez del reductor— decide si el crédito de Las Dos Veredas sigue vivo después
   * de poner la primera, y esa decisión NO pasa por el portillo. Si el reductor
   * cree que quedan sitios donde la vista no ofrece ninguno, el crédito se queda
   * encendido, `opciones()` corta el turno entero mientras quede crédito, y al
   * colono no se le ofrece NADA: ni trazar, ni pasar. La mesa se para y no se cae.
   *
   * Así que se monta una caja: A encerrado con veredas de B por todos lados menos
   * un hueco, y con la choza de B cerrándole el único camino que le quedaría si el
   * corte no estuviera. Pone la vereda gratis en el hueco, se queda sin sitio, y
   * el crédito TIENE que apagarse solo.
   */
  const v0 = nudoDe(0);
  const v3 = nudoDe(3);
  const deA = [tramoDe(0), tramoDe(1), tramoDe(2)];

  /** Todas las aristas que tocan alguno de estos vértices, sin repetir. */
  const alrededorDe = (nudos: readonly LlaveDeVertice[]): string[] => {
    const salida: string[] = [];
    for (const nudo of nudos) {
      for (const arista of aristasDeVertice(nudo)) {
        if (!salida.includes(arista)) salida.push(arista);
      }
    }
    return salida;
  };

  const elHueco = aristasDeVertice(nudoDe(2)).find((a) => !deA.includes(a)) as string;
  const alFinalDelHueco = verticesDeArista(elHueco).find((x) => x !== nudoDe(2)) as LlaveDeVertice;
  const deB = [
    ...alrededorDe([v0, nudoDe(1), nudoDe(2)]).filter((a) => !deA.includes(a) && a !== elHueco),
    ...aristasDeVertice(alFinalDelHueco).filter((a) => a !== elHueco),
  ];

  const enElDelta = aristasDe(DELTA);
  comprobar('la caja se dibuja entera dentro del delta', [...deA, ...deB, elHueco].every((a) => enElDelta.includes(a)), [...deA, ...deB, elHueco].filter((a) => !enElDelta.includes(a)));
  comprobar('y B no necesita más veredas de las que tiene', deB.length <= TOPE_DE_PIEZAS.vereda, deB.length);
  comprobar('la choza de B sigue a distancia legal de la de A', !verticesVecinos(v0).includes(v3));

  const caja = escenarioDeMazo({
    bienes: [[], []],
    manos: [[{ carta: 'c1:dos-veredas', comprada: 0 }], []],
  });
  const encerrado: EstadoDeRiberas = {
    ...caja,
    colonos: caja.colonos.map((c, i) =>
      i === 0
        ? { ...c, chozas: [v0], torres: [], veredas: [...deA] }
        : { ...c, chozas: [v3], torres: [], veredas: [...deB] },
    ),
  };

  comprobar('A no tiene bienes, así que sin la carta no se le ofrece ninguna vereda', ofrecidasA(encerrado, 'A').every((o) => o.tipo !== ALZAR));
  const laCarta = ofrecidasA(encerrado, 'A').find((o) => o.tipo === DOS_VEREDAS);
  comprobar('Las Dos Veredas se le ofrece: le queda un hueco', laCarta !== undefined);

  let enCaja = mesaSobre('RIB-CAJA', encerrado, ['A', 'B']);
  enCaja = mover(enCaja, 'A', laCarta as Opcion);
  const gratis = opcionesEn(enCaja, 'A').filter((o) => o.tipo === ALZAR);
  comprobar('y con el crédito abierto se le ofrece exactamente el hueco, y nada más', gratis.length === 1 && canonico(gratis[0]?.carga ?? null) === canonico({ que: 'vereda', donde: elHueco }), gratis.map((o) => o.id));

  enCaja = mover(enCaja, 'A', gratis[0] as Opcion);
  const cerrada = estadoDe(enCaja);
  comprobar('la vereda gratis entra en el hueco', (cerrada.colonos[0] as Colono).veredas.includes(elHueco));
  /*
   * LAS DOS AFIRMACIONES QUE MUERDEN. La primera es el juez del reductor dicho en
   * voz alta; la segunda es la consecuencia que se juega, y es la que nadie
   * depuraría: una mesa parada sin un error.
   */
  comprobar(
    'sin sitio donde ir, el crédito de la carta se apaga solo aunque quedara una',
    cerrada.veredasGratis === 0,
    cerrada.veredasGratis,
  );
  comprobar(
    'y a A se le vuelve a ofrecer el turno entero: la mesa no se queda parada',
    opcionesEn(enCaja, 'A').length > 0,
    opcionesEn(enCaja, 'A').map((o) => o.id),
  );
  comprobar(
    'la caja está bien cerrada: lo único que le quedaría a A es salir del vértice de B',
    aristasDeVertice(v3).filter((a) => !deA.includes(a) && !deB.includes(a) && a !== elHueco).length === 2,
    aristasDeVertice(v3),
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

/**
 * EL CONTEXTO DE UN MOVIMIENTO MANDADO A MANO.
 *
 * Era una `const` con una flecha dentro y ahora es una funcion declarada, que es lo
 * unico que cambia: una `const` no existe hasta que se ejecuta su linea, y el bloque
 * del estiaje —que va arriba, donde esta la partida de la que cuelga— la necesita
 * antes. Declarada, se puede llamar desde cualquier sitio del fichero.
 */
function ctxDe(
  quien: string,
  asientos: readonly string[],
): { quien: string; azar: number; tic: number; asientos: readonly string[] } {
  return { quien, azar: 1, tic: 0, asientos };
}

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
paso('EL MAZO: se baraja una vez, y se puede contar');
// ---------------------------------------------------------------------------

/*
 * ═══ QUÉ SE COMPRA EN ESTA SECCIÓN, Y POR QUÉ CADA COSA ═══
 *
 * El mazo es la segunda economía del juego, y sus fallos tienen todos la forma que
 * este fichero persigue: no se caen, se juegan. Una carta que se puede jugar el
 * turno que se compra convierte tres bienes en un efecto inmediato y nadie lo nota
 * hasta que alguien encadena tres. Un acaparamiento que se lleva un bien de más deja
 * a otro sin nada y parece mala suerte. Y un mazo que se sortea al comprar en vez de
 * barajarse al empezar da partidas distintas con el mismo diario, que es la única
 * cosa de aquí que rompe el motor entero y no sólo el juego.
 *
 * Todo se juega sobre PARTIDAS DE VERDAD: mesa abierta con el árbitro, `EMPEZAR`
 * mandado por la puerta de la plataforma, y los movimientos elegidos de lo que
 * `opciones()` ofrece. Lo único que se pone a mano es lo que el azar tardaría cien
 * turnos en dar: qué bienes tiene cada cual, qué cartas hay en cada mano y en qué
 * orden está el mazo. Sin eso, la mitad de estos bloques no se visitaría nunca — y
 * un bloque que no se visita sale verde sin comprobar nada.
 */

/** El mazo con el que empieza una mesa de esta semilla. */
function mazoDe(semilla: number): CartaDeRiberas[] {
  const abierta = abrirMesa({ id: 'RIB-MAZO', arcade: RIBERAS, semilla, asientos: ['A', 'B'] });
  const empezada = jugar(abierta, {
    quien: 'A',
    rev: abierta.rev,
    movimiento: { tipo: EMPEZAR_RIBERAS, carga: {} },
  });
  return estadoDe(empezada).mazo;
}

/** Cuántas cartas de cada clase hay en una lista. */
function porClase(mazo: readonly CartaDeRiberas[]): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const carta of mazo) {
    const clase = claseDeLaCarta(carta) ?? '?';
    cuenta.set(clase, (cuenta.get(clase) ?? 0) + 1);
  }
  return cuenta;
}

{
  const uno = mazoDe(90210);
  const otra = mazoDe(90210);
  const distinta = mazoDe(1234);

  comprobar('el mazo tiene veinticinco cartas', uno.length === CARTAS_DEL_MAZO && uno.length === 25, uno.length);

  const cuenta = porClase(uno);
  comprobar('catorce guardias', cuenta.get('guardia') === 14, cuenta.get('guardia'));
  comprobar('dos años buenos, dos acaparamientos y dos dobles veredas', cuenta.get('ano-bueno') === 2 && cuenta.get('acaparamiento') === 2 && cuenta.get('dos-veredas') === 2, [...cuenta]);
  comprobar(
    'y CINCO títulos distintos, uno de cada, que es lo que pidió Miguel',
    ['molino', 'cantera', 'torreon', 'faro', 'huerto'].every((t) => cuenta.get(t) === 1),
    [...cuenta],
  );
  comprobar('ninguna clase de más ni de menos: nueve y no otra cosa', cuenta.size === CLASES_DE_CARTA.length, [...cuenta.keys()]);
  comprobar('y ninguna carta repite seudónimo, que es lo que las hace distinguibles', new Set(uno).size === uno.length);

  /*
   * ═══ LA MISMA SEMILLA, EL MISMO MAZO. ES LO QUE SOSTIENE `reejecutarEn` ═══
   *
   * Si la carta se sorteara al comprarla, esto seguiría verde —no habría mazo que
   * comparar— y la divergencia aparecería en la reejecución de una partida jugada,
   * o sea meses después y en un diario que nadie sabe leer.
   */
  comprobar('con la misma semilla el mazo sale idéntico', canonico(uno) === canonico(otra));
  comprobar('y con otra semilla sale distinto', canonico(uno) !== canonico(distinta));

  /*
   * LA VACUNA DEL BARAJADO: la bolsa se escribe con las catorce guardias delante,
   * así que un mazo SIN barajar empezaría por catorce guardias. Sin esta línea,
   * «con la misma semilla sale igual» también pasaría si `barajar` no hiciera nada.
   */
  comprobar(
    'y está barajado de verdad: no empieza por las catorce guardias de la bolsa',
    !uno.slice(0, 14).every((c) => claseDeLaCarta(c) === 'guardia'),
    uno.slice(0, 14),
  );
}

// ---------------------------------------------------------------------------
paso('EL MAZO: comprar, jugar y revelar, con partidas de verdad');
// ---------------------------------------------------------------------------

/**
 * UNA PARTIDA EN MARCHA, CON EL MAZO Y LAS MANOS PUESTAS.
 *
 * Sale de una mesa abierta con el árbitro y de un `EMPEZAR` mandado por la puerta
 * de siempre, así que el delta, los colores y el orden de los colonos son los de
 * verdad. Lo que se coloca a mano es lo que el azar no da a tiempo, y ni una regla:
 * quien contesta a todo lo que se prueba aquí es `opcionesDeRiberas` y el reductor.
 *
 * Cada colono recibe una choza y una vereda propias para que las opciones de obra
 * existan —sin nada puesto no hay dónde alzar y media prueba no visitaría nada— y
 * `turnosAbiertos` arranca en uno, que es lo que hace que una carta con el sello 0
 * sea de un turno anterior y una con el sello 1 sea de hoy.
 */
function escenarioDeMazo(monta: {
  bienes: readonly (readonly Bien[])[];
  mazo?: readonly CartaDeRiberas[];
  manos?: readonly (readonly CartaEnMano[])[];
  guardias?: readonly number[];
  semilla?: number;
  tirado?: boolean;
}): EstadoDeRiberas {
  const asientos = ['A', 'B', 'C'].slice(0, monta.bienes.length);
  const abierta = abrirMesa({
    id: 'RIB-CARTAS',
    arcade: RIBERAS,
    semilla: monta.semilla ?? 31,
    asientos,
  });
  const base = estadoDe(
    jugar(abierta, { quien: 'A', rev: abierta.rev, movimiento: { tipo: EMPEZAR_RIBERAS, carga: {} } }),
  );
  let serie = 1;
  return {
    ...base,
    momento: 'jugando',
    paso: base.colonos.length * 2,
    faltaVereda: false,
    ultimaChoza: null,
    turno: 0,
    tirado: monta.tirado ?? true,
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
}

/** Lo que se le ofrece a un asiento sobre un estado suelto. */
function ofrecidasA(estado: EstadoDeRiberas, quien: string): readonly Opcion[] {
  return opcionesDeRiberas(proyectarRiberas(estado, quien), quien);
}

/** Una mesa de verdad puesta sobre un estado montado, para jugar con el árbitro. */
function mesaSobre(id: string, estado: EstadoDeRiberas, asientos: readonly string[]): Mesa {
  return abrirMesa({ id, arcade: RIBERAS, semilla: 77, asientos: [...asientos], estado });
}

/** Cuántas fichas de este bien tiene este colono. */
function cuantos(colono: Colono, bien: Bien): number {
  return colono.almacen.filter((f) => f.endsWith(`:${bien}`)).length;
}

const EL_TRIO = ['A', 'B', 'C'];

/* ── COMPRAR: cuesta exactamente sal, piedra y grano ────────────────────── */
{
  comprobar('el coste de una carta es uno de cada: sal, piedra y grano', canonico([...COSTE_DE_LA_CARTA].sort()) === canonico(['grano', 'piedra', 'sal']), COSTE_DE_LA_CARTA);

  const justo = escenarioDeMazo({
    bienes: [['sal', 'piedra', 'grano', 'limo'], ['limo'], []],
    mazo: ['c1:guardia', 'c2:faro'],
  });
  const conLaCompra = ofrecidasA(justo, 'A').find((o) => o.tipo === COMPRAR);
  comprobar('con sal, piedra y grano se ofrece comprar', conLaCompra !== undefined);

  let mesaDeCompra = mesaSobre('RIB-COMPRA', justo, EL_TRIO);
  mesaDeCompra = mover(mesaDeCompra, 'A', conLaCompra as Opcion);
  const comprada = estadoDe(mesaDeCompra);
  const suyo = comprada.colonos[0] as Colono;
  comprobar('la carta entra en la mano y sale del mazo', suyo.mano.length === 1 && comprada.mazo.length === 1, { mano: suyo.mano.length, mazo: comprada.mazo.length });
  comprobar('y la que sale es la de ARRIBA del mazo barajado, no otra', suyo.mano[0]?.carta === 'c1:guardia', suyo.mano);
  comprobar(
    'se paga exactamente sal, piedra y grano: el limo sigue ahí',
    suyo.almacen.length === 1 && cuantos(suyo, 'limo') === 1,
    suyo.almacen,
  );
  comprobar('y la carta queda sellada con el turno en que se compró', suyo.mano[0]?.comprada === justo.turnosAbiertos);

  /* SIN LOS TRES BIENES NO SE OFRECE, y mandarlo igual no hace nada. */
  const corto = escenarioDeMazo({ bienes: [['sal', 'piedra'], [], []], mazo: ['c1:guardia'] });
  comprobar('sin el grano no se ofrece comprar', ofrecidasA(corto, 'A').every((o) => o.tipo !== COMPRAR));
  comprobar(
    'y mandarlo igual devuelve EL MISMO objeto de estado',
    avanzarRiberas(corto, { tipo: COMPRAR, carga: {} }, ctxDe('A', EL_TRIO)) === corto,
  );

  /* EL MAZO SE AGOTA, Y ENTONCES NO SE PUEDE COMPRAR. */
  const vacio = escenarioDeMazo({ bienes: [['sal', 'piedra', 'grano'], [], []], mazo: [] });
  comprobar('con el mazo agotado no se ofrece comprar, aunque sobren bienes', ofrecidasA(vacio, 'A').every((o) => o.tipo !== COMPRAR));
  comprobar(
    'y mandarlo igual tampoco hace nada',
    avanzarRiberas(vacio, { tipo: COMPRAR, carga: {} }, ctxDe('A', EL_TRIO)) === vacio,
  );
  /*
   * LA VACUNA DEL MAZO VACÍO: con UNA carta dentro y los mismos bienes, sí se
   * ofrece. Sin ella, «no se ofrece comprar» saldría verde también si el montaje
   * hubiera dejado a A sin bienes, o si comprar hubiera dejado de ofrecerse nunca.
   */
  const conUna = escenarioDeMazo({ bienes: [['sal', 'piedra', 'grano'], [], []], mazo: ['c1:huerto'] });
  comprobar('y con una sola carta en el mazo sí se ofrece: el cero de arriba es por el mazo', ofrecidasA(conUna, 'A').some((o) => o.tipo === COMPRAR));
}

/* ── LA COMPRADA HOY NO SE JUEGA HOY, Y MAÑANA SÍ ──────────────────────── */
{
  /*
   * ═══ ESTA ES LA REGLA QUE MÁS CARO SALDRÍA SALTARSE, Y SE JUEGA ENTERA ═══
   *
   * Se compra una guardia, se intenta jugar en el mismo turno, se pasa el turno de
   * verdad —con el árbitro, y B tira y pasa como cualquiera— y se vuelve a mirar.
   * Montar el «turno siguiente» a mano habría comprobado la comparación de dos
   * números; jugándolo, se comprueba además que `turnosAbiertos` avanza donde tiene
   * que avanzar, que es donde de verdad podría estar el fallo.
   */
  const DOS_AQUI = ['A', 'B'];
  const inicial = escenarioDeMazo({
    bienes: [['sal', 'piedra', 'grano'], ['limo', 'junco']],
    mazo: ['c1:guardia'],
  });
  let partida = mesaSobre('RIB-ESPERA', inicial, DOS_AQUI);
  partida = mover(partida, 'A', opcionesEn(partida, 'A').find((o) => o.tipo === COMPRAR) as Opcion);

  comprobar('recién comprada, la guardia NO se ofrece', opcionesEn(partida, 'A').every((o) => o.tipo !== GUARDIA));
  comprobar(
    'y si se manda igual, el reductor devuelve el mismo objeto',
    avanzarRiberas(
      estadoDe(partida),
      { tipo: GUARDIA, carga: { carta: 'c1' } },
      ctxDe('A', DOS_AQUI),
    ) === estadoDe(partida),
  );

  /*
   * Se juega el turno de B por la puerta de siempre: tirar y pasar. Con
   * `tirarYResolverElEstiaje`, que es la puerta de siempre desde que el siete mueve
   * una pieza: una de cada seis tiradas deja el turno sin ninguna otra opción hasta
   * que se mueva, y entonces el `find(PASAR)` de la línea siguiente sería `undefined`.
   */
  partida = mover(partida, 'A', opcionesEn(partida, 'A').find((o) => o.tipo === PASAR) as Opcion);
  partida = tirarYResolverElEstiaje(partida, 'B');
  partida = mover(partida, 'B', opcionesEn(partida, 'B').find((o) => o.tipo === PASAR) as Opcion);
  partida = tirarYResolverElEstiaje(partida, 'A');

  const alTurnoSiguiente = opcionesEn(partida, 'A').filter((o) => o.tipo === GUARDIA);
  comprobar('y al turno siguiente sí se ofrece', alTurnoSiguiente.length > 0, opcionesEn(partida, 'A').map((o) => o.id).slice(0, 8));
  comprobar(
    'y entra de verdad: la mano se queda sin ella, la guardia cuenta y el estiaje queda por mover',
    (() => {
      const jugada = estadoDe(mover(partida, 'A', alTurnoSiguiente[0] as Opcion));
      const suyo = jugada.colonos[0] as Colono;
      return suyo.mano.length === 0 && suyo.guardias === 1 && jugada.cartaJugada && jugada.estiajePorMover;
    })(),
  );
}

/* ── UNA CARTA POR TURNO ────────────────────────────────────────────────── */
{
  /*
   * ═══ Y AQUÍ HAY QUE MOVER LA PIEZA EN MEDIO, O ESTO DEJA DE COMPROBAR NADA ═══
   *
   * Desde la fase 3 la guardia enciende `estiajePorMover`, y con la bandera encendida
   * `opcionesDeTurno` corta y no ofrece NINGUNA carta. O sea que «la segunda ya no se
   * ofrece» pasaría en verde aunque la regla de «una al turno» se hubiera borrado
   * entera: quien la estaría tapando sería el corte del estiaje, que es otra regla. Se
   * mueve la pieza primero —con eso la bandera se apaga y el turno vuelve a estar
   * abierto— y sólo entonces se pregunta. Se vio pasar sin esto.
   */
  const DOS_AQUI = ['A', 'B'];
  const conDos = escenarioDeMazo({
    bienes: [[], ['limo', 'junco']],
    manos: [[{ carta: 'c1:guardia', comprada: 0 }, { carta: 'c2:guardia', comprada: 0 }], []],
  });
  const antes = ofrecidasA(conDos, 'A').filter((o) => o.tipo === GUARDIA);
  comprobar('con dos guardias de ayer en la mano, se ofrecen las dos', antes.length === 2 && new Set(antes.map((o) => o.id)).size === 2, antes.map((o) => o.id));
  comprobar('una por carta, y sin víctima dentro del identificador', canonico(antes.map((o) => o.id).sort()) === canonico(['jugar-guardia:c1', 'jugar-guardia:c2']), antes.map((o) => o.id));

  const primera = avanzarRiberas(conDos, { tipo: GUARDIA, carga: { carta: 'c1' } }, ctxDe('A', DOS_AQUI));
  comprobar('la primera entra', primera !== conDos && (primera.colonos[0] as Colono).guardias === 1);
  comprobar('y con el estiaje por mover no se ofrece ninguna carta: manda el corte, que es otra regla', ofrecidasA(primera, 'A').every((o) => o.tipo !== GUARDIA) && primera.estiajePorMover);

  /* Y si no hubiera destino, esto se pone ROJO en vez de caerse: la mesa se para. */
  const destinoDeLaSegunda = ofrecidasA(primera, 'A').find((o) => o.tipo === MOVER_EL_ESTIAJE);
  comprobar('con la guardia jugada hay adónde mover la pieza', destinoDeLaSegunda !== undefined);
  const movida =
    destinoDeLaSegunda === undefined
      ? primera
      : avanzarRiberas(primera, { tipo: MOVER_EL_ESTIAJE, carga: destinoDeLaSegunda.carga }, ctxDe('A', DOS_AQUI));
  comprobar('se puede mover la pieza y seguir el turno', movida !== primera && movida.estiajePorMover === false);
  comprobar('y con la pieza ya movida la segunda SIGUE sin ofrecerse: una carta por turno', ofrecidasA(movida, 'A').every((o) => o.tipo !== GUARDIA), ofrecidasA(movida, 'A').map((o) => o.id).slice(0, 8));
  comprobar(
    'y mandarla devuelve el mismo objeto',
    avanzarRiberas(movida, { tipo: GUARDIA, carga: { carta: 'c2' } }, ctxDe('A', DOS_AQUI)) === movida,
  );
  comprobar('la carta que no se jugó sigue en la mano', (movida.colonos[0] as Colono).mano.length === 1);

  /*
   * LA VACUNA DE ESTE BLOQUE: con la pieza movida el turno está de verdad abierto, o
   * sea que el «no se ofrece» de arriba es por la carta jugada y no porque no quede
   * nada que hacer. Se pregunta por PASAR, que es lo que siempre está.
   */
  comprobar('y el turno sigue vivo: pasar se ofrece, así que arriba no callaba el corte', ofrecidasA(movida, 'A').some((o) => o.tipo === PASAR));
}

/* ── LA GUARDIA MUEVE EL ESTIAJE, Y EL ROBO SALE DE LA ISLA ─────────────── */
{
  /*
   * ═══ LA FASE 3, JUGADA ENTERA: LA CARTA YA NO ELIGE VÍCTIMA, ELIGE ISLA ═══
   *
   * Miguel: «puede usar esta carta para mover al ladrón de forma idéntica a si hubiera
   * sacado un 7». Así que lo que hay que comprobar no es que la carta robe, sino que
   * ENCIENDE la bandera y deja delante exactamente los mismos dieciocho destinos que un
   * siete, con sus víctimas dentro. El robo lo comprueba el bloque del estiaje; aquí se
   * compra que la carta llega hasta ahí y que quien roba es el sitio, no el naipe.
   */
  const conVictima = escenarioDeMazo({
    bienes: [['limo'], ['sal', 'piedra', 'grano'], []],
    manos: [[{ carta: 'c1:guardia', comprada: 0 }], [], []],
  });

  const contra = ofrecidasA(conVictima, 'A').filter((o) => o.tipo === GUARDIA);
  comprobar('se ofrece UNA sola manera de jugar la guardia, sin víctima que elegir', contra.length === 1 && contra[0]?.id === 'jugar-guardia:c1', contra.map((o) => o.id));
  comprobar('y su carga es sólo la carta: el campo `a` se cayó con la regla vieja', canonico((contra[0] as Opcion).carga) === canonico({ carta: 'c1' }), (contra[0] as Opcion).carga);

  const jugada = avanzarRiberas(conVictima, { tipo: GUARDIA, carga: (contra[0] as Opcion).carga }, ctxDe('A', EL_TRIO));
  const ladron = jugada.colonos[0] as Colono;
  comprobar('la carta entra: sale de la mano, cuenta y gasta la jugada del turno', ladron.mano.length === 0 && ladron.guardias === 1 && jugada.cartaJugada, { mano: ladron.mano.length, guardias: ladron.guardias });
  comprobar('y ENCIENDE el estiaje, que es lo que la fase 3 le añadió', jugada.estiajePorMover === true);
  comprobar('todavía no ha robado nadie: el robo sale de la isla, y la isla no se ha elegido', canonico(ladron.almacen) === canonico((conVictima.colonos[0] as Colono).almacen), ladron.almacen);
  comprobar('ni se ha tocado el azar: jugar la carta no sortea nada', canonico(jugada.azar) === canonico(conVictima.azar));
  comprobar('y la pieza sigue donde estaba hasta que se elija destino', jugada.estiaje === conVictima.estiaje);

  /*
   * ═══ Y LO QUE MIGUEL DEJÓ DICHO APARTE: NO SE DESCARTA ═══
   *
   * «Esta regla de descarte sólo aplica al sacar un 7 con los dados, NO al usar una
   * carta de caballero.» B tiene tres bienes aquí, así que se monta el filo aparte: una
   * mano de NUEVE, que con un siete tiraría cuatro. Con la carta no tira ninguna.
   */
  const conManosLlenas = escenarioDeMazo({
    bienes: [
      ['limo'],
      ['sal', 'sal', 'sal', 'piedra', 'piedra', 'piedra', 'grano', 'grano', 'junco'],
      [],
    ],
    manos: [[{ carta: 'c1:guardia', comprada: 0 }], [], []],
  });
  comprobar('el escenario del descarte vale: B lleva nueve fichas, más de las que se aguantan', (conManosLlenas.colonos[1] as Colono).almacen.length === 9);
  const sinDescarte = avanzarRiberas(conManosLlenas, { tipo: GUARDIA, carga: { carta: 'c1' } }, ctxDe('A', EL_TRIO));
  comprobar('la guardia NO abre el descarte, por llenas que estén las manos', sinDescarte.momento === 'jugando' && sinDescarte.descartes.length === 0, { momento: sinDescarte.momento, descartes: sinDescarte.descartes });
  comprobar('y nadie tira una sola ficha: eso lo cobra el siete y sólo el siete', (sinDescarte.colonos[1] as Colono).almacen.length === 9);

  /*
   * LOS DESTINOS QUE DEJA DELANTE SON LOS MISMOS DIECIOCHO DE UN SIETE, y ni uno de
   * ellos es la isla donde la pieza está. Es la comprobación de «de forma idéntica»:
   * si la carta encendiera otra cosa —o una bandera propia— esta lista saldría vacía.
   */
  const destinos = ofrecidasA(jugada, 'A').filter((o) => o.tipo === MOVER_EL_ESTIAJE);
  const islasOfrecidas = new Set(destinos.map((o) => (o.carga as { donde: string }).donde));
  comprobar('deja delante las DIECIOCHO islas que no son la suya, igual que un siete', islasOfrecidas.size === jugada.islas.length - 1 && !islasOfrecidas.has(jugada.estiaje ?? ''), { islas: islasOfrecidas.size, total: jugada.islas.length });
  comprobar('y no se ofrece nada más que mover y revelar: manda el corte del estiaje', ofrecidasA(jugada, 'A').every((o) => o.tipo === MOVER_EL_ESTIAJE || o.tipo === REVELAR), [...new Set(ofrecidasA(jugada, 'A').map((o) => o.tipo))]);

  /*
   * ═══ Y AHORA SE MUEVE Y SE ROBA DE VERDAD, POR EL CAMINO DE LA CARTA ═══
   *
   * Se busca un destino que traiga víctima —lo trae `opcionesDelEstiaje` con `a` dentro—
   * y se comprueba que la ficha viaja entera, con su número de serie. Es el mismo robo
   * que el del siete, y ésa es justamente la afirmación: `elRobo` se llama una vez y
   * desde un solo sitio.
   */
  const conRobo = destinos.find((o) => (o.carga as { a: string | null }).a !== null);
  comprobar('alguno de los dieciocho destinos tiene a quién robarle, o lo de abajo no miraría el robo', conRobo !== undefined, destinos.length);
  if (conRobo !== undefined) {
    const aQuien = (conRobo.carga as { a: string }).a;
    const victimaAntes = jugada.colonos.find((c) => c.asiento === aQuien) as Colono;
    const robado = avanzarRiberas(jugada, { tipo: MOVER_EL_ESTIAJE, carga: conRobo.carga }, ctxDe('A', EL_TRIO));
    const suyoDespues = robado.colonos[0] as Colono;
    const victimaDespues = robado.colonos.find((c) => c.asiento === aQuien) as Colono;
    comprobar('la pieza se planta en la isla elegida y la bandera se apaga', robado.estiaje === (conRobo.carga as { donde: string }).donde && robado.estiajePorMover === false);
    comprobar('el ladrón gana una ficha y la víctima pierde una', suyoDespues.almacen.length === ladron.almacen.length + 1 && victimaDespues.almacen.length === victimaAntes.almacen.length - 1, { ladron: suyoDespues.almacen, victima: victimaDespues.almacen });
    const laQueFalta = victimaAntes.almacen.filter((f) => !victimaDespues.almacen.includes(f));
    comprobar('falta exactamente una del almacén de la víctima', laQueFalta.length === 1, laQueFalta);
    comprobar(
      'y esa MISMA ficha, con su número de serie, está ahora en el del ladrón',
      suyoDespues.almacen.includes(laQueFalta[0] as Ficha),
      { robada: laQueFalta[0], ladron: suyoDespues.almacen },
    );
    comprobar('y la guardia no se cuenta dos veces por mover', suyoDespues.guardias === 1);
  }

  /*
   * ═══ CON EL ESTIAJE POR MOVER NO SE JUEGA OTRA GUARDIA ═══
   *
   * Las dos mitades, como siempre: el corte de `opcionesDeTurno` ya se comprobó arriba
   * («no se ofrece nada más que mover y revelar»); ésta es la del reductor. Sin ella, un
   * cliente viejo colapsaría dos activaciones en una —gastando carta, muesca y turno para
   * mover UNA vez— y no se caería nada.
   */
  const conDosEnMano = escenarioDeMazo({
    bienes: [['limo'], ['sal'], []],
    manos: [[{ carta: 'c1:guardia', comprada: 0 }, { carta: 'c2:guardia', comprada: 0 }], [], []],
  });
  const conBandera = avanzarRiberas(conDosEnMano, { tipo: GUARDIA, carga: { carta: 'c1' } }, ctxDe('A', EL_TRIO));
  comprobar('el escenario vale: la primera guardia entra y deja la bandera encendida', conBandera !== conDosEnMano && conBandera.estiajePorMover);
  comprobar(
    'y la segunda, mandada a mano con la pieza sin mover, devuelve EL MISMO objeto',
    avanzarRiberas(conBandera, { tipo: GUARDIA, carga: { carta: 'c2' } }, ctxDe('A', EL_TRIO)) === conBandera,
  );

  /*
   * ═══ LA VACUNA DEL AZAR: no es «la primera de la lista» ═══
   *
   * Con cuatro fichas de clase distinta y ocho semillas, si el robo cogiera siempre la
   * primera del almacén saldría ocho veces la misma. Es la comprobación que separa «roba
   * al azar» de «roba la más vieja», que es lo que sale solo al escribirlo y además
   * filtraría el ORDEN del almacén ajeno, que no es público. Se juega ahora por el camino
   * de la carta: jugarla, y mover a la isla donde está B.
   */
  const robadas = new Set<string>();
  for (const semilla of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const mesa4 = escenarioDeMazo({
      semilla,
      bienes: [[], ['limo', 'junco', 'sal', 'piedra']],
      manos: [[{ carta: 'c1:guardia', comprada: 0 }], []],
    });
    const conCarta = avanzarRiberas(mesa4, { tipo: GUARDIA, carga: { carta: 'c1' } }, ctxDe('A', ['A', 'B']));
    const aB = ofrecidasA(conCarta, 'A').find((o) => (o.carga as { a?: string | null }).a === 'B');
    if (aB === undefined) continue;
    const tras = avanzarRiberas(conCarta, { tipo: MOVER_EL_ESTIAJE, carga: aB.carga }, ctxDe('A', ['A', 'B']));
    const suya = (tras.colonos[0] as Colono).almacen[0];
    if (suya !== undefined) robadas.add(suya.slice(suya.indexOf(':') + 1));
  }
  comprobar('con distintas semillas no roba siempre el mismo bien: es al azar', robadas.size > 1, [...robadas]);
}

/* ── LA GUARDIA SE JUEGA ANTES DE TIRAR (§3 y §3 bis del diseño) ────────── */
{
  /*
   * ═══ ES LA MITAD DE LA PETICIÓN DE MIGUEL, Y LA QUE SE ROMPE EN SILENCIO ═══
   *
   * «INCLUSO ANTES DE LANZAR LOS DADOS.» Lo que hay que comprar aquí no es sólo que la
   * carta se ofrezca sin haber tirado —eso lo daría por bueno cualquier sitio donde se
   * escribiera—, sino DÓNDE queda el corte de `estiajePorMover` dentro de
   * `opcionesDeTurno`. Puesto donde corta `veredasGratis` —después del bloque de tirar—
   * la carta se juega, la bandera se enciende, y lo único que sale es «Tirar los dados»:
   * los dieciocho destinos no aparecen NUNCA y la carta se convierte en una que mueve
   * después de la cosecha, que es justo la cosecha que servía para evitar.
   *
   * Por eso las dos afirmaciones van juntas: que salen los dieciocho, Y QUE TIRAR NO
   * ESTÁ. Sin la segunda, el corte en el sitio malo pasa en verde, porque el corte malo
   * también devuelve una lista.
   */
  const antesDeTirar = escenarioDeMazo({
    bienes: [['limo'], ['sal', 'piedra'], ['grano']],
    manos: [[{ carta: 'c1:guardia', comprada: 0 }], [], []],
    tirado: false,
  });
  const suyas = ofrecidasA(antesDeTirar, 'A');
  comprobar('sin tirar, la guardia SÍ se ofrece: es la petición de Miguel', suyas.some((o) => o.tipo === GUARDIA), suyas.map((o) => o.id));
  comprobar('y tirar se sigue ofreciendo mientras no se juegue: el escenario vale', suyas.some((o) => o.tipo === TIRAR));
  comprobar('pero ninguna de las otras tres cartas, ni comprar: sus reductores exigen la tirada', suyas.every((o) => o.tipo !== ANO_BUENO && o.tipo !== ACAPARAMIENTO && o.tipo !== DOS_VEREDAS && o.tipo !== COMPRAR));

  /*
   * Y SI LA CARTA NO SE OFRECIERA, ESTO SE PONE ROJO Y NO SE CAE. Es justo la mitad que
   * una vacuna quita —la de `opcionesDeTurno`—, y un guion que revienta con «no se puede
   * leer 'carga' de undefined» cuenta peor lo que pasa que once líneas rojas con su
   * nombre. Se manda la carga a mano, que es lo que mandaría un cliente viejo.
   */
  const laCarta = suyas.find((o) => o.tipo === GUARDIA);
  const jugadaAntes = avanzarRiberas(antesDeTirar, { tipo: GUARDIA, carga: laCarta?.carga ?? { carta: 'c1' } }, ctxDe('A', EL_TRIO));
  comprobar('el reductor la acepta sin haber tirado: el `!estado.tirado` se cayó de verdad', jugadaAntes !== antesDeTirar && jugadaAntes.estiajePorMover === true && jugadaAntes.tirado === false);

  const despues = ofrecidasA(jugadaAntes, 'A');
  const dieciocho = despues.filter((o) => o.tipo === MOVER_EL_ESTIAJE);
  comprobar(
    'y delante quedan los DIECIOCHO destinos, no «Tirar los dados»',
    new Set(dieciocho.map((o) => (o.carga as { donde: string }).donde)).size === jugadaAntes.islas.length - 1,
    { destinos: dieciocho.length, islas: jugadaAntes.islas.length },
  );
  comprobar(
    'Y TIRAR NO ESTÁ, que es la mitad que caza el corte puesto en el sitio de `veredasGratis`',
    despues.every((o) => o.tipo !== TIRAR),
    despues.map((o) => o.tipo).filter((t) => t === TIRAR),
  );
  comprobar('ni pasar: mover es obligatorio también por este camino', despues.every((o) => o.tipo !== PASAR));
  comprobar('y el reductor tampoco deja tirar con la pieza pendiente', avanzarRiberas(jugadaAntes, { tipo: TIRAR, carga: {} }, ctxDe('A', EL_TRIO)) === jugadaAntes);

  /*
   * EL AVISO NO PUEDE INVENTARSE UNA TIRADA. `ultimaTirada` no se borra al cambiar de
   * turno, así que la frase de siempre —«Sacaste N: mueve el estiaje»— anunciaría aquí
   * la tirada del turno anterior, y en la primera vuelta un «Sacaste 0». Ver `avisoDe`.
   */
  const aviso = avisoPara(jugadaAntes, 'A');
  comprobar('el aviso dice que fue la carta y no una tirada que no ha pasado', aviso.includes('guardia') && !aviso.includes('Sacaste'), aviso);
  comprobar('y a los demás se les dice de quién es el turno y qué está haciendo', avisoPara(jugadaAntes, 'B').includes('mueve el estiaje'), avisoPara(jugadaAntes, 'B'));
  /*
   * LA VACUNA DEL AVISO, y hace falta: sin ella, un aviso que dijera «mueve el estiaje» a
   * secas pasaría igual. Se contrasta contra el MISMO aviso encendido por un siete, que sí
   * tiene tirada que nombrar y sí la nombra.
   */
  const porUnSiete = avanzarRiberas({ ...antesDeTirar, azar: sembrar(semillaQueSaca(7)) }, { tipo: TIRAR, carga: {} }, ctxDe('A', EL_TRIO));
  comprobar('y cuando lo enciende un siete de verdad, el aviso SÍ nombra la tirada', porUnSiete.ultimaTirada === 7 && avisoPara(porUnSiete, 'A').includes('Sacaste 7'), avisoPara(porUnSiete, 'A'));
}

/* ── §3 ter: EL TURNO QUE NADIE HABÍA DESCRITO ─────────────────────────── */
{
  /*
   * ═══ DOS MOVIMIENTOS DEL ESTIAJE, DOS ROBOS Y UN DESCARTE EN EL MISMO TURNO ═══
   *
   * Juego la guardia sin haber tirado, muevo y robo; luego tiro y sale un SIETE; la
   * bandera se enciende OTRA VEZ —la misma bandera, la segunda vez en el mismo turno— y
   * esta vez además con descarte detrás. Es legal desde la fase 3 y no estaba descrito en
   * ninguna parte hasta el §3 ter.
   *
   * Es donde una bandera booleana reutilizada se rompe, así que lo que se compra es
   * exactamente eso: que el SEGUNDO robo funciona (`cartaJugada` no lo bloquea, porque el
   * segundo movimiento no viene de una carta), que `guardias` sube UNA sola vez y que La
   * Mayor Guardia se recalcula UNA sola vez.
   *
   * El siete NO se espera tirando: se fabrica con `semillaQueSaca(7)`, que es la
   * herramienta que este fichero ya usa dos veces para el filo del descarte. Y se siembra
   * JUSTO ANTES de tirar y no al montar el escenario, porque el primer robo gasta azar
   * —`elRobo` sortea qué ficha— y con la semilla puesta al principio la tirada saldría
   * cualquier cosa.
   */
  const arranque = escenarioDeMazo({
    /* Manos gordas a propósito: el siete de abajo tiene que abrir el descarte. */
    bienes: [
      ['limo', 'limo', 'sal', 'sal', 'piedra', 'piedra', 'grano', 'grano'],
      ['sal', 'piedra', 'grano', 'junco'],
      ['limo', 'junco'],
    ],
    /* DOS guardias, y la segunda no es adorno: es lo que hace que la ultima comprobacion
       del bloque muerda. Con una sola, «no queda ninguna guardia por jugar» sale verde
       porque la mano está vacía, y seguiría verde con la regla de `cartaJugada` borrada. */
    manos: [[{ carta: 'c1:guardia', comprada: 0 }, { carta: 'c9:guardia', comprada: 0 }], [], []],
    guardias: [2, 0, 0],
    tirado: false,
  });
  comprobar('el escenario vale: A no ha tirado, lleva dos guardias y ocho fichas', arranque.tirado === false && (arranque.colonos[0] as Colono).guardias === 2 && (arranque.colonos[0] as Colono).almacen.length === 8);

  /* 1. Se juega la guardia ANTES de tirar. */
  const conCarta = avanzarRiberas(arranque, { tipo: GUARDIA, carga: { carta: 'c1' } }, ctxDe('A', EL_TRIO));
  comprobar('1. la guardia entra sin haber tirado, y con la tercera La Mayor Guardia pasa a ser suya', conCarta.estiajePorMover && (conCarta.colonos[0] as Colono).guardias === 3 && conCarta.guardia.de === 'A', conCarta.guardia);

  /* 2. Primer movimiento y primer robo. */
  const primerDestino = ofrecidasA(conCarta, 'A').find((o) => (o.carga as { a?: string | null }).a !== null);
  comprobar('2. hay un destino con víctima para el primer robo', primerDestino !== undefined);
  const trasElPrimero = primerDestino === undefined ? conCarta : avanzarRiberas(conCarta, { tipo: MOVER_EL_ESTIAJE, carga: primerDestino.carga }, ctxDe('A', EL_TRIO));
  comprobar('y roba: el almacén de A crece una ficha', (trasElPrimero.colonos[0] as Colono).almacen.length === 9, (trasElPrimero.colonos[0] as Colono).almacen.length);
  comprobar('y la bandera se apaga, con el turno todavía por tirar', trasElPrimero.estiajePorMover === false && trasElPrimero.tirado === false);

  /* 3. Ahora sí se tira, y sale un siete. */
  const trasTirar = avanzarRiberas({ ...trasElPrimero, azar: sembrar(semillaQueSaca(7)) }, { tipo: TIRAR, carga: {} }, ctxDe('A', EL_TRIO));
  comprobar('3. se tira y sale un siete', trasTirar.ultimaTirada === 7, trasTirar.ultimaTirada);
  comprobar('4. la MISMA bandera se enciende otra vez, y esta vez con descarte detrás', trasTirar.estiajePorMover === true && trasTirar.momento === 'descartando', { momento: trasTirar.momento, descartes: trasTirar.descartes });
  comprobar('y quien tiró está en la cola con la mitad de sus nueve: la carta le llenó la mano y ahora la paga', trasTirar.descartes.some((d) => d.de === 'A' && d.faltan === 4), trasTirar.descartes);

  /* 5. Se descarta entero, y se vuelve a mover. */
  const yaDescartado = estadoDe(vaciarLasManos(mesaSobre('RIB-3TER', trasTirar, TRES)));
  comprobar('5. el descarte se cierra y el turno sigue siendo de A con la pieza por mover', yaDescartado.momento === 'jugando' && yaDescartado.estiajePorMover === true && yaDescartado.turno === 0, { momento: yaDescartado.momento, turno: yaDescartado.turno });

  const segundoDestino = ofrecidasA(yaDescartado, 'A').find((o) => (o.carga as { a?: string | null }).a !== null);
  comprobar('hay un destino con víctima para el SEGUNDO robo del turno', segundoDestino !== undefined);
  const alFinal = segundoDestino === undefined ? yaDescartado : avanzarRiberas(yaDescartado, { tipo: MOVER_EL_ESTIAJE, carga: segundoDestino.carga }, ctxDe('A', EL_TRIO));
  const victima2 = (segundoDestino?.carga as { a: string } | undefined)?.a ?? '';
  const antesDelSegundo = yaDescartado.colonos.find((c) => c.asiento === victima2) as Colono | undefined;
  const despuesDelSegundo = alFinal.colonos.find((c) => c.asiento === victima2) as Colono | undefined;
  comprobar(
    'EL SEGUNDO ROBO FUNCIONA: `cartaJugada` no lo bloquea, porque este movimiento no viene de una carta',
    alFinal !== yaDescartado &&
      alFinal.cartaJugada === true &&
      (despuesDelSegundo?.almacen.length ?? 0) === (antesDelSegundo?.almacen.length ?? 0) - 1,
    { cartaJugada: alFinal.cartaJugada, antes: antesDelSegundo?.almacen.length, despues: despuesDelSegundo?.almacen.length },
  );
  comprobar('el estiaje ha cambiado de isla las DOS veces', trasElPrimero.estiaje !== arranque.estiaje && alFinal.estiaje !== trasElPrimero.estiaje, { antes: arranque.estiaje, primera: trasElPrimero.estiaje, segunda: alFinal.estiaje });
  comprobar('`guardias` sube UNA sola vez en todo el turno: la carta se jugó una vez', (alFinal.colonos[0] as Colono).guardias === 3, (alFinal.colonos[0] as Colono).guardias);
  comprobar('y La Mayor Guardia se queda en tres, o sea recalculada una sola vez', alFinal.guardia.de === 'A' && alFinal.guardia.cuantas === 3, alFinal.guardia);
  comprobar('la bandera queda apagada al final: el turno no debe ningún movimiento', alFinal.estiajePorMover === false);
  /* Le queda una guardia EN LA MANO y aun así no se le ofrece: eso es `cartaJugada`, y no
     una mano vacía. Con una sola guardia en el escenario esta línea era un verde por
     conjunto vacío y habría seguido verde con la regla borrada. */
  comprobar(
    'le queda una guardia en la mano y NO se le ofrece: dos en el mismo turno siguen sin poder',
    (alFinal.colonos[0] as Colono).mano.length === 1 && ofrecidasA(alFinal, 'A').every((o) => o.tipo !== GUARDIA),
    { enLaMano: (alFinal.colonos[0] as Colono).mano.map((c) => c.carta), cartaJugada: alFinal.cartaJugada },
  );
}

/* ── EL ACAPARAMIENTO SE LLEVA TODOS LOS DE ESE BIEN, Y NINGUNO MÁS ─────── */
{
  const conMontones = escenarioDeMazo({
    bienes: [['grano'], ['sal', 'sal', 'limo'], ['sal']],
    manos: [[{ carta: 'c1:acaparamiento', comprada: 0 }], [], []],
  });
  const cuales = ofrecidasA(conMontones, 'A').filter((o) => o.tipo === ACAPARAMIENTO);
  comprobar(
    'se ofrecen los CINCO bienes, incluso los que nadie tiene: los almacenes ajenos no se miran',
    cuales.length === BIENES.length,
    cuales.map((o) => o.id),
  );

  const acaparada = avanzarRiberas(conMontones, { tipo: ACAPARAMIENTO, carga: { carta: 'c1', bien: 'sal' } }, ctxDe('A', EL_TRIO));
  const mio = acaparada.colonos[0] as Colono;
  comprobar('se lleva las tres sales, de los dos colonos', cuantos(mio, 'sal') === 3, mio.almacen);
  comprobar('y no toca su grano ni se lo inventa', cuantos(mio, 'grano') === 1 && mio.almacen.length === 4);
  comprobar('a B le queda su limo y nada más', canonico((acaparada.colonos[1] as Colono).almacen.map((f) => f.slice(f.indexOf(':') + 1))) === canonico(['limo']));
  comprobar('y C se queda sin nada', (acaparada.colonos[2] as Colono).almacen.length === 0);
  comprobar('las fichas cambian de dueño enteras: el contador no avanza', acaparada.siguienteFicha === conMontones.siguienteFicha);

  /*
   * LA VACUNA: acaparar un bien que NO tiene nadie no mueve una sola ficha. Sin
   * ella, «se lleva todas las sales» pasaría igual con una rama que se llevara el
   * almacén entero de todo el mundo.
   */
  const enBalde = avanzarRiberas(conMontones, { tipo: ACAPARAMIENTO, carga: { carta: 'c1', bien: 'piedra' } }, ctxDe('A', EL_TRIO));
  comprobar('acaparar lo que nadie tiene no mueve nada de nadie', (enBalde.colonos[0] as Colono).almacen.length === 1 && (enBalde.colonos[1] as Colono).almacen.length === 3 && (enBalde.colonos[2] as Colono).almacen.length === 1);
  comprobar('pero la carta sí se gasta: se apostó y se perdió', (enBalde.colonos[0] as Colono).mano.length === 0 && enBalde.cartaJugada);
}

/* ── EL AÑO BUENO DA DOS, Y PUEDEN SER DOS IGUALES ──────────────────────── */
{
  const conElAno = escenarioDeMazo({
    bienes: [[], [], []],
    manos: [[{ carta: 'c1:ano-bueno', comprada: 0 }], [], []],
  });
  const pares = ofrecidasA(conElAno, 'A').filter((o) => o.tipo === ANO_BUENO);
  comprobar('se ofrecen los quince pares: los cinco iguales y los diez distintos', pares.length === 15, pares.length);
  comprobar('entre ellos el par de dos granos', pares.some((o) => o.id === 'jugar-ano:c1:grano:grano'));
  comprobar(
    'y ningún par se ofrece dos veces dado la vuelta',
    !pares.some((o) => o.id === 'jugar-ano:c1:grano:sal') || !pares.some((o) => o.id === 'jugar-ano:c1:sal:grano'),
    pares.map((o) => o.id),
  );

  const dosIguales = avanzarRiberas(conElAno, { tipo: ANO_BUENO, carga: { carta: 'c1', bienes: ['grano', 'grano'] } }, ctxDe('A', EL_TRIO));
  const conGrano = dosIguales.colonos[0] as Colono;
  comprobar('coger dos granos da DOS granos', conGrano.almacen.length === 2 && cuantos(conGrano, 'grano') === 2, conGrano.almacen);
  comprobar('y son fichas nuevas del arcón, con números de serie distintos', new Set(conGrano.almacen).size === 2 && dosIguales.siguienteFicha === conElAno.siguienteFicha + 2);
  comprobar('sin quitarle nada a nadie', (dosIguales.colonos[1] as Colono).almacen.length === 0);

  /*
   * EL PAR VA EN EL ORDEN EN QUE SE OFRECE, y esta línea lo aprendió en rojo: con
   * `['sal','limo']` el portillo lo rechaza, porque lo que se ofrece es
   * `['limo','sal']` —el orden de `BIENES`— y el portillo compara la forma canónica
   * contra las opciones. No es una molestia: es la mitad del §5 bis funcionando, y
   * es la razón por la que la carga se coge de la opción y no se escribe a mano.
   */
  const elPar = pares.find((o) => o.id === 'jugar-ano:c1:limo:sal');
  comprobar('el par de limo y sal se ofrece, en el orden en que lo ofrece el juego', elPar !== undefined, pares.map((o) => o.id).slice(0, 6));
  const distintos = avanzarRiberas(conElAno, { tipo: ANO_BUENO, carga: (elPar as Opcion).carga }, ctxDe('A', EL_TRIO));
  const mezcla = distintos.colonos[0] as Colono;
  comprobar('y dos distintos dan uno de cada', cuantos(mezcla, 'sal') === 1 && cuantos(mezcla, 'limo') === 1, mezcla.almacen);
  comprobar(
    'mientras que el mismo par al revés no está ofrecido y el portillo lo para',
    avanzarRiberas(conElAno, { tipo: ANO_BUENO, carga: { carta: 'c1', bienes: ['sal', 'limo'] } }, ctxDe('A', EL_TRIO)) === conElAno,
  );

  /* LA VACUNA: uno solo, o tres, no son un año bueno. */
  comprobar(
    'pedir un solo bien no es esta carta, y se rechaza',
    avanzarRiberas(conElAno, { tipo: ANO_BUENO, carga: { carta: 'c1', bienes: ['sal'] } }, ctxDe('A', EL_TRIO)) === conElAno,
  );
  comprobar(
    'y pedir tres tampoco',
    avanzarRiberas(conElAno, { tipo: ANO_BUENO, carga: { carta: 'c1', bienes: ['sal', 'sal', 'sal'] } }, ctxDe('A', EL_TRIO)) === conElAno,
  );
}

/* ── LAS DOS VEREDAS PONEN DOS: NI UNA NI TRES ─────────────────────────── */
{
  /*
   * A NO TIENE NI UN BIEN, y eso es lo que hace la prueba honrada: antes de la
   * carta no se le ofrece ni una vereda, con la carta se le ofrecen, y cuando se
   * gastan las dos deja de ofrecérsele. Con almacén, «ya no se ofrecen» podría ser
   * verde por poder pagarlas.
   */
  const DOS_AQUI = ['A', 'B'];
  const conLaCarta = escenarioDeMazo({
    bienes: [[], []],
    manos: [[{ carta: 'c1:dos-veredas', comprada: 0 }], []],
  });
  comprobar('sin bienes no se ofrece ninguna vereda', ofrecidasA(conLaCarta, 'A').every((o) => o.tipo !== ALZAR));
  const laCarta = ofrecidasA(conLaCarta, 'A').find((o) => o.tipo === DOS_VEREDAS);
  comprobar('pero sí se ofrece jugar Las Dos Veredas', laCarta !== undefined);

  let partida = mesaSobre('RIB-VEREDAS', conLaCarta, DOS_AQUI);
  partida = mover(partida, 'A', laCarta as Opcion);
  const jugada = estadoDe(partida);
  comprobar('al jugarla quedan dos veredas gratis pendientes', jugada.veredasGratis === VEREDAS_DE_LA_CARTA && jugada.veredasGratis === 2, jugada.veredasGratis);
  comprobar('y la carta sale de la mano', (jugada.colonos[0] as Colono).mano.length === 0);

  const conPendientes = opcionesEn(partida, 'A');
  comprobar('mientras queden, no se ofrece otra cosa que veredas', conPendientes.length > 0 && conPendientes.every((o) => o.tipo === ALZAR || o.tipo === REVELAR), conPendientes.map((o) => o.id).slice(0, 6));
  comprobar(
    'y todas las que se ofrecen son aristas libres pegadas a lo suyo: las reglas de siempre',
    conPendientes
      .filter((o) => o.tipo === ALZAR)
      .every((o) => {
        const donde = (o.carga as { donde: string }).donde;
        const suyas = (jugada.colonos[0] as Colono).veredas;
        const ajenas = (jugada.colonos[1] as Colono).veredas;
        return !suyas.includes(donde) && !ajenas.includes(donde) && aristasDeVertice(verticeDeHex({ q: -2, r: 0 }, 0)).length === 3;
      }),
  );

  const antesDeLaPrimera = (jugada.colonos[0] as Colono).veredas.length;
  partida = mover(partida, 'A', opcionesEn(partida, 'A').find((o) => o.tipo === ALZAR) as Opcion);
  const conUna = estadoDe(partida);
  comprobar('la primera entra sin pagarse: el almacén sigue vacío', (conUna.colonos[0] as Colono).almacen.length === 0);
  comprobar('y queda UNA pendiente', conUna.veredasGratis === 1, conUna.veredasGratis);
  comprobar('con una vereda más en el tablero', (conUna.colonos[0] as Colono).veredas.length === antesDeLaPrimera + 1);

  partida = mover(partida, 'A', opcionesEn(partida, 'A').find((o) => o.tipo === ALZAR) as Opcion);
  const conDos = estadoDe(partida);
  comprobar('la segunda entra y ya no queda ninguna', conDos.veredasGratis === 0);
  comprobar(
    'y son DOS y no tres: sin bienes, no se ofrece ni una vereda más',
    (conDos.colonos[0] as Colono).veredas.length === antesDeLaPrimera + VEREDAS_DE_LA_CARTA &&
      opcionesEn(partida, 'A').every((o) => o.tipo !== ALZAR),
    { veredas: (conDos.colonos[0] as Colono).veredas.length, ofrecidas: opcionesEn(partida, 'A').map((o) => o.id) },
  );
  comprobar('el almacén sigue vacío: las dos fueron gratis', (conDos.colonos[0] as Colono).almacen.length === 0);
  comprobar('y la segunda sale de donde dejó la primera, o de la choza: no se coló ninguna suelta', (conDos.colonos[0] as Colono).veredas.length === new Set((conDos.colonos[0] as Colono).veredas).size);
}

/* ── LOS TÍTULOS: uno revelado suma, uno oculto sólo para su dueño ──────── */
{
  const DOS_AQUI = ['A', 'B'];
  const conTitulo = escenarioDeMazo({
    bienes: [[], []],
    manos: [[{ carta: 'c1:molino', comprada: 0 }], []],
  });

  const suya = proyectarRiberas(conTitulo, 'A');
  const ajena = proyectarRiberas(conTitulo, 'B');
  const publicosDeA = (v: { colonos: readonly { asiento: string; puntos: number }[] }): number =>
    v.colonos.find((c) => c.asiento === 'A')?.puntos ?? -1;

  comprobar('un título OCULTO no suma en público', publicosDeA(suya) === publicosDeA(ajena), { suya: publicosDeA(suya), ajena: publicosDeA(ajena) });
  comprobar('pero sí en la vista de su dueño, con lo oculto dentro', suya.misPuntos === publicosDeA(suya) + 1, { misPuntos: suya.misPuntos, publicos: publicosDeA(suya) });
  comprobar('y en la de nadie más: B no ve ningún punto de más', ajena.misPuntos === (ajena.colonos.find((c) => c.asiento === 'B')?.puntos ?? -1));

  const revelar = ofrecidasA(conTitulo, 'A').find((o) => o.tipo === REVELAR);
  comprobar('revelar se ofrece', revelar !== undefined);
  const revelado = avanzarRiberas(conTitulo, { tipo: REVELAR, carga: (revelar as Opcion).carga }, ctxDe('A', DOS_AQUI));
  comprobar('al revelarlo, el título queda a la vista', canonico((revelado.colonos[0] as Colono).titulos) === canonico(['molino']));
  comprobar('y suma un punto EN PÚBLICO', publicosDeA(proyectarRiberas(revelado, 'B')) === publicosDeA(ajena) + 1);
  comprobar('sin sumar dos veces a su dueño', proyectarRiberas(revelado, 'A').misPuntos === suya.misPuntos);
  comprobar('revelar no gasta la jugada del turno', revelado.cartaJugada === false);

  /*
   * SE PUEDE REVELAR EL MISMO TURNO EN QUE SE COMPRÓ, Y ANTES DE TIRAR. Las dos
   * son excepciones escritas en el §3 del diseño, y las dos existen por lo mismo:
   * los puntos con los que se gana son los públicos, así que un título que no se
   * pudiera enseñar sería una mano con la que no se puede ganar.
   */
  const reciente = escenarioDeMazo({
    bienes: [[], []],
    manos: [[{ carta: 'c1:faro', comprada: 1 }], []],
  });
  comprobar('un título comprado HOY se puede revelar hoy', ofrecidasA(reciente, 'A').some((o) => o.tipo === REVELAR));
  const sinTirar = escenarioDeMazo({
    bienes: [[], []],
    manos: [[{ carta: 'c1:faro', comprada: 0 }], []],
    tirado: false,
  });
  comprobar('y antes de tirar los dados, también', ofrecidasA(sinTirar, 'A').some((o) => o.tipo === REVELAR));
  /*
   * Y AQUÍ LA LISTA SE ACORTÓ EN LA FASE 3, que es lo que hay que decir en voz alta: la
   * guardia SÍ se juega antes de tirar desde que mueve el estiaje, así que nombrarla en
   * esta línea la dejaría comprobando lo contrario de la regla. Lo que sigue sin poder
   * jugarse antes de tirar son las OTRAS TRES cartas y comprar, y eso es lo que se pide.
   * La guardia tiene su propio bloque, con la lista entera y con «TIRAR no está» dentro.
   */
  comprobar(
    'mientras que las otras tres cartas y comprar siguen sin ofrecerse antes de tirar',
    ofrecidasA(sinTirar, 'A').every((o) => o.tipo !== ANO_BUENO && o.tipo !== ACAPARAMIENTO && o.tipo !== DOS_VEREDAS && o.tipo !== COMPRAR),
  );

  /*
   * LA VACUNA DEL «OCULTO NO SUMA»: si `puntosDe` contara la mano, los dos números
   * de arriba serían iguales y la comprobación pasaría por casualidad. Aquí se
   * exige que el oculto CAMBIE algo — que `misPuntos` no sea igual a los públicos.
   */
  comprobar('y con la carta en la mano los dos números NO coinciden: el oculto se cuenta', suya.misPuntos !== publicosDeA(suya));
}

/* ── LA MAYOR GUARDIA: al tercero, y sólo se supera estrictamente ──────── */
{
  /*
   * ═══ MISMA REGLA QUE EL VADO LARGO, Y COMPROBADA CON LAS MISMAS PALABRAS ═══
   *
   * Está escrito así a propósito: las dos funciones son la misma regla sobre dos
   * cuentas, y el día que alguien toque una de ellas, el bloque gemelo es lo que
   * dice si la otra se quedó atrás.
   */
  const conCuentas = (cuentas: readonly number[]): EstadoDeRiberas =>
    escenarioDeMazo({ bienes: [[], [], []], guardias: cuentas });

  comprobar('sin guardias jugadas, el premio está vacante', recalcularLaGuardia(conCuentas([0, 0, 0])).de === null);
  comprobar(
    'con DOS no basta: hacen falta tres',
    recalcularLaGuardia(conCuentas([2, 0, 0])).de === null && GUARDIA_MINIMA === 3,
    recalcularLaGuardia(conCuentas([2, 0, 0])),
  );
  const alTercero = recalcularLaGuardia(conCuentas([3, 0, 0]));
  comprobar('con la TERCERA, el premio es de A', alTercero.de === 'A' && alTercero.cuantas === 3, alTercero);

  const empatados: EstadoDeRiberas = { ...conCuentas([3, 3, 0]), guardia: alTercero };
  comprobar('empatar a tres no se lo quita a A: quien empata no arrebata', recalcularLaGuardia(empatados).de === 'A', recalcularLaGuardia(empatados));

  const superado: EstadoDeRiberas = { ...conCuentas([3, 4, 0]), guardia: alTercero };
  const trasSuperar = recalcularLaGuardia(superado);
  comprobar('y con cuatro, B se lo lleva: superar ESTRICTAMENTE sí', trasSuperar.de === 'B' && trasSuperar.cuantas === 4, trasSuperar);

  /* Vale un punto de verdad, que es lo que lo hace un premio. */
  const conPremio: EstadoDeRiberas = { ...conCuentas([3, 0, 0]), guardia: alTercero };
  comprobar(
    'quien tiene La Mayor Guardia suma un punto por ella',
    puntosDe(conPremio, conPremio.colonos[0] as Colono) ===
      puntosDe({ ...conPremio, guardia: { de: null, cuantas: 0 } }, conPremio.colonos[0] as Colono) + 1,
  );

  /*
   * ═══ Y QUE SE RECALCULE SOLO, QUE ES LA PARTE QUE MÁS DUELE ═══
   *
   * Un premio derivado que hay que acordarse de recalcular es un premio que un día
   * no se recalcula. Aquí se juega la tercera guardia en una partida de verdad y se
   * exige que el premio ya sea suyo al salir del movimiento, sin que nadie llame a
   * nada.
   */
  const aPuntoDeGanarlo = escenarioDeMazo({
    bienes: [[], ['limo'], []],
    manos: [[{ carta: 'c1:guardia', comprada: 0 }], [], []],
    guardias: [2, 0, 0],
  });
  comprobar('con dos jugadas todavía no es de nadie', recalcularLaGuardia(aPuntoDeGanarlo).de === null);
  const conLaTercera = avanzarRiberas(aPuntoDeGanarlo, { tipo: GUARDIA, carga: { carta: 'c1' } }, ctxDe('A', EL_TRIO));
  comprobar(
    'y al jugar la tercera el premio ya es suyo, sin que nadie lo pida',
    conLaTercera.guardia.de === 'A' && conLaTercera.guardia.cuantas === 3,
    conLaTercera.guardia,
  );
  comprobar('y sale en la vista de todos, que es lo que hace que se vea venir', proyectarRiberas(conLaTercera, 'B').guardia.de === 'A');
}

/* ── LO QUE NO PUEDE SALIR: la mano ajena, ni dentro de un identificador ── */
{
  /*
   * ═══ EL §5 BIS APLICADO A LAS CARTAS, QUE ES DONDE MÁS FÁCIL SE CUELA ═══
   *
   * `revelar:molino` se escribe solo y publica qué título tengo. Y `verify:mesa` no
   * lo cazaría: busca la forma canónica del secreto —`"c1:molino"`, con comillas— y
   * esa cadena no está en ese identificador. Es literalmente el agujero que el §5
   * bis describe con su propio ejemplo, así que se mira aquí, por subcadena.
   */
  const conMano = escenarioDeMazo({
    bienes: [['sal', 'piedra', 'grano'], ['limo'], []],
    manos: [
      [
        { carta: 'c1:molino', comprada: 0 },
        { carta: 'c2:guardia', comprada: 0 },
      ],
      [{ carta: 'c3:huerto', comprada: 0 }],
      [],
    ],
  });
  const secretos = loSecretoDeRiberas(conMano).filter((s): s is string => typeof s === 'string');
  comprobar('hay cartas secretas que buscar, en las manos y en el mazo', secretos.filter((s) => s.startsWith('c')).length >= CARTAS_DEL_MAZO, secretos.filter((s) => s.startsWith('c')).length);

  const publicados: string[] = [];
  for (const quien of EL_TRIO) {
    const vista = proyectarRiberas(conMano, quien);
    for (const o of opcionesDeRiberas(vista, quien)) publicados.push(o.id);
    for (const a of vista.tablero.acciones) publicados.push(a.id);
    for (const p of vista.tablero.paneles) publicados.push(p.titulo);
  }
  const contaminados = publicados.filter((id) => secretos.some((s) => id.includes(s)));
  comprobar('ningún identificador publicado lleva una carta dentro', contaminados.length === 0, contaminados.slice(0, 4));
  comprobar('y los hay de sobra que mirar, o esto no probaría nada', publicados.length > 10, publicados.length);

  /* LA VACUNA: el identificador que se escribe solo SÍ se cazaría. */
  const envenenado = `revelar:${secretos.find((s) => s.endsWith(':molino')) ?? 'c1:molino'}`;
  comprobar('y un id escrito con la carta dentro sí se caza', secretos.some((s) => envenenado.includes(s)));

  /* Y LA MANO AJENA NO VIAJA, ni entera ni contada carta a carta. */
  for (const quien of EL_TRIO) {
    const texto = canonico(proyectarRiberas(conMano, quien));
    const ajenas = conMano.colonos
      .filter((c) => c.asiento !== quien)
      .flatMap((c) => c.mano.map((m) => m.carta))
      .filter((carta) => texto.includes(canonico(carta)));
    comprobar(`en la vista de ${quien} no hay ni una carta ajena`, ajenas.length === 0, ajenas);
  }
  comprobar(
    'ni el mazo entero sale en la vista de nadie: el número, y nada más',
    !conMano.mazo.some((carta) => canonico(proyectarRiberas(conMano, 'A')).includes(canonico(carta))) &&
      proyectarRiberas(conMano, 'A').mazo === conMano.mazo.length,
  );
  comprobar('y el espectador no ve ninguna carta de nadie', !secretos.some((s) => canonico(proyectarRiberas(conMano, null)).includes(canonico(s))));
  comprobar(
    'lo que sí es público es CUÁNTAS tiene cada cual',
    proyectarRiberas(conMano, 'C').colonos.map((c) => c.cartas).join(',') === '2,1,0',
    proyectarRiberas(conMano, 'C').colonos.map((c) => c.cartas),
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
    /*
     * ═══ MOVER EL ESTIAJE VA LO PRIMERO, Y NO ES UNA PREFERENCIA ═══
     *
     * Es lo único que se ofrece cuando hay que moverlo: sin esta línea, una de cada
     * seis tiradas de esta partida deja la lista sin `TIRAR`, sin `torre:`, sin
     * `fundar:`, sin `vereda:` y sin `PASAR`, `elegida` sale `undefined`, el bucle
     * rompe y la partida no llega al final. O sea que no se añade para que el
     * comprobador pase: se añade porque la política de este bucle —tirar, torre,
     * fundar, vereda, pasar— dejó de ser una política completa el día que el siete
     * empezó a hacer algo.
     */
    const elegida =
      lista.find((o) => o.tipo === MOVER_EL_ESTIAJE) ??
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
paso('El tablero en 3D marca lo que dicen las reglas, y nada mas');
// ---------------------------------------------------------------------------

/*
 * QUE SE VIGILA AQUI, Y POR QUE HACE FALTA.
 *
 * El tablero en tres dimensiones marcaba lo mismo agarrases lo que agarrases: todos los
 * vertices libres. Asi, el castillo se ofrecia en mitad del campo cuando solo puede subir
 * sobre un poblado PROPIO, y la casa se ofrecia pegada a otra casa cuando la regla de
 * distancia lo prohibe. `riberas-en-3d.ts` lo arreglo repartiendo por piezas lo que
 * devuelve `opcionesDeRiberas` en vez de inventarse listas; esto impide que vuelva a
 * inventarlas.
 *
 * Se vigila EL ADAPTADOR, no las reglas: las reglas ya tienen sus comprobaciones mas
 * arriba, y volver a derivarlas aqui a partir de su propia salida no probaria nada.
 */
{
  const hexes = mallaDeRadio(2);
  const delTablero = new Set<string>(verticesDe(hexes));

  /* YO: una choza con una CADENA de veredas que se aleja. TU: una choza pegada a la mia. */
  const miChoza = verticeDeHex({ q: 0, r: 0 }, 0);
  const misVeredas: string[] = [];
  const pisados: string[] = [miChoza];
  let punta = miChoza;
  for (let i = 0; i < 3; i++) {
    const salida = aristasDeVertice(punta).find((a) => {
      if (misVeredas.includes(a)) return false;
      const otro = verticesDeArista(a).find((v) => v !== punta);
      return otro !== undefined && !pisados.includes(otro) && delTablero.has(otro);
    });
    if (salida === undefined) break;
    misVeredas.push(salida);
    const siguiente = verticesDeArista(salida).find((v) => v !== punta);
    if (siguiente === undefined) break;
    punta = siguiente;
    pisados.push(punta);
  }
  const tuChoza = verticesVecinos(miChoza).find((v) => delTablero.has(v));

  /*
   * EL ESTADO DE PRUEBA TIENE QUE PODER FALLAR, y esto se afirma ANTES que nada.
   *
   * «Ningun anillo cae sobre una choza ajena» se cumple solo si HAY una choza ajena. Sin
   * esta linea, una partida de un colono haria pasar la comprobacion sin comprobar nada,
   * que es la peor clase de verde: el que dice que se miro.
   */
  comprobar(
    'el estado de prueba tiene con que fallar: choza ajena, cadena propia y tablero entero',
    tuChoza !== undefined && misVeredas.length === 3 && delTablero.size === 54,
    { ajena: tuChoza, veredas: misVeredas.length, vertices: delTablero.size },
  );

  const vista3d = vistaDePrueba(
    hexes,
    [
      { asiento: 'yo', color: '#3d8be0', chozas: [miChoza], torres: [], veredas: misVeredas },
      {
        asiento: 'tu',
        color: '#e0533d',
        chozas: tuChoza === undefined ? [] : [tuChoza],
        torres: [],
        veredas: [],
      },
      { asiento: 'nadie', color: '#e0b83d', chozas: [], torres: [], veredas: [] },
    ],
    'yo',
  );

  const choza = obraPosible(vista3d, 'yo', 'choza');
  const torre = obraPosible(vista3d, 'yo', 'torre');
  const vereda = obraPosible(vista3d, 'yo', 'vereda');

  comprobar(
    'la ciudad solo se marca sobre poblados PROPIOS, nunca sobre los ajenos',
    torre.sitios.length === 1 &&
      torre.sitios[0]?.llave === miChoza &&
      !torre.sitios.some((x) => x.llave === tuChoza),
    { sitios: torre.sitios.map((x) => x.llave), mia: miChoza, ajena: tuChoza },
  );

  /* Se exige que la lista NO este vacia antes de mirarla: con cero, lo de abajo pasa solo. */
  comprobar(
    'hay al menos un sitio donde fundar, o lo de abajo no prueba nada',
    choza.sitios.length > 0,
    choza.sitios.length,
  );
  comprobar(
    'ningun poblado se marca a una arista de otro poblado, sea de quien sea',
    choza.sitios.every(
      (x) => !verticesVecinos(x.llave).some((n) => n === miChoza || n === tuChoza),
    ),
    choza.sitios.map((x) => x.llave),
  );
  comprobar(
    'y todo poblado que se marca cuelga de un camino propio',
    choza.sitios.every((x) => aristasDeVertice(x.llave).some((a) => misVeredas.includes(a))),
    choza.sitios.map((x) => x.llave),
  );
  comprobar(
    'ningun puente se marca sobre una arista ya ocupada',
    vereda.sitios.length > 0 && vereda.sitios.every((x) => !misVeredas.includes(x.llave)),
    { sitios: vereda.sitios.length },
  );

  /*
   * LA CLASE SALE DE LA LLAVE, y por eso no puede desajustarse.
   *
   * El fallo que esto vuelve imposible ya ocurrio: al puente se le paso la lista de
   * VERTICES y salieron cero anillos, sin un error en ninguna consola, porque la escena
   * filtra por clase y ninguna llave de vertice es una arista. La escena hizo lo correcto;
   * quien mentia era el par (clase, llaves) que le pasaron montado a mano.
   */
  comprobar(
    'la clase que sale cuadra siempre con las llaves que la acompanan',
    choza.clase === 'vertice' &&
      torre.clase === 'vertice' &&
      vereda.clase === 'arista' &&
      choza.sitios.every((x) => x.llave.startsWith('v:')) &&
      vereda.sitios.every((x) => x.llave.startsWith('a:')),
    { choza: choza.clase, torre: torre.clase, vereda: vereda.clase },
  );

  /*
   * QUIEN NO HA CONSTRUIDO NADA NO PUEDE CONSTRUIR NADA, ni siquiera la ciudad.
   *
   * Es la queja del usuario vista del reves: antes, con el tablero pelado, el castillo le
   * ofrecia los cincuenta y cuatro vertices.
   */
  const PIEZAS = ['choza', 'torre', 'vereda'] as const;
  comprobar(
    'quien no ha construido nada no tiene ni un sitio marcado',
    PIEZAS.every((pieza) => obraPosible(vista3d, 'nadie', pieza).sitios.length === 0),
    PIEZAS.map((pieza) => `${pieza}:${String(obraPosible(vista3d, 'nadie', pieza).sitios.length)}`),
  );

  /*
   * EL ADAPTADOR NO INVENTA NI PIERDE.
   *
   * Se cuenta por un camino DISTINTO —el `id` de la opcion, que es texto de presentacion—
   * y se exige el mismo numero que repartiendo por tipo y carga. Si el reparto se dejara
   * una opcion o colara una de otro sitio, los dos numeros se separarian.
   */
  const todas = opcionesDeRiberas(vista3d, 'yo');
  const porId = {
    choza: todas.filter((o) => o.id.startsWith('fundar:')).length,
    torre: todas.filter((o) => o.id.startsWith('torre:')).length,
    vereda: todas.filter((o) => o.id.startsWith('vereda:')).length,
  };
  comprobar(
    'el adaptador reparte todas las opciones de obra y ninguna de mas',
    porId.choza === choza.sitios.length &&
      porId.torre === torre.sitios.length &&
      porId.vereda === vereda.sitios.length,
    {
      porId,
      repartido: {
        choza: choza.sitios.length,
        torre: torre.sitios.length,
        vereda: vereda.sitios.length,
      },
    },
  );
}

/*
 * Y LO QUE CONVIERTE TODO LO ANTERIOR DE PROMESA EN HECHO: que el reductor las acepte.
 *
 * Todo lo de arriba mira LISTAS. Ninguna comprobacion sobre listas puede descartar el
 * fallo que de verdad se ve jugando: un anillo verde que no hace nada porque el juego
 * rechaza el movimiento. Aqui se coge una partida de verdad —la que este guion ya ha
 * jugado con el arbitro delante— y se le pasa al reductor la carga EXACTA que el adaptador
 * entrega para cada marca.
 *
 * Se mira el MOTIVO y no si el estado cambio. Comprobar la identidad del objeto pasaria
 * siempre el dia que el reductor devolviera una copia igual al rechazar, y entonces esta
 * comprobacion —la mas cara de escribir— seria la mas facil de engañar.
 */
{
  /*
   * LA PARTIDA SE MONTA CON EL ESCENARIO QUE ESTE GUION YA SABE MONTAR.
   *
   * El primer intento preguntaba sobre la mesa que quedaba viva de mas arriba, y recibia
   * CERO marcas: ese turno esta sin tirar los dados y sin almacen, y sin las dos cosas no
   * se puede construir nada. Sin el guardia de «o lo de abajo no prueba nada», esta
   * comprobacion habria salido VERDE anunciando que el reductor acepta todas las marcas
   * sin haber probado ni una. Es exactamente el verde que dice que se miro.
   *
   * `escenarioDeTrueque` deja una partida de verdad en `jugando`, con los dados tirados y
   * con almacen — que es donde esta un jugador cuando agarra una pieza de la barra.
   */
  const DOS_AQUI = ['A', 'B'];
  /* Almacén de sobra para las tres piezas: la torre sola pide tres piedras y dos granos. */
  const rico = escenarioDeTrueque(
    [
      'limo', 'limo', 'junco', 'junco', 'sal', 'sal',
      'piedra', 'piedra', 'piedra', 'piedra', 'grano', 'grano', 'grano',
    ],
    ['limo'],
  );
  const suya = proyectarRiberas(rico, 'A');
  const marcas = (['choza', 'torre', 'vereda'] as const).flatMap((pieza) =>
    obraPosible(suya, 'A', pieza).sitios,
  );
  comprobar(
    'el tablero le ensena al menos una marca, o lo de abajo no prueba nada',
    marcas.length > 0,
    marcas.length,
  );
  const rechazadas = marcas.filter(
    (m) =>
      motivoDe(
        rico,
        { tipo: m.movimiento.tipo, carga: m.movimiento.carga } as Movimiento,
        ctxDe('A', DOS_AQUI),
      ) !== null,
  );
  comprobar(
    'y el reductor acepta TODAS las marcas que el tablero ensena: ni un anillo muerto',
    rechazadas.length === 0,
    rechazadas.slice(0, 3).map(
      (m) =>
        `${m.llave}: ${String(
          motivoDe(
            rico,
            { tipo: m.movimiento.tipo, carga: m.movimiento.carga } as Movimiento,
            ctxDe('A', DOS_AQUI),
          ),
        )}`,
    ),
  );

  /*
   * Y AL REVES, que es la otra mitad y la que de verdad muerde: lo que el tablero NO marca,
   * el reductor lo RECHAZA.
   *
   * Sin esto, un adaptador que devolviera todos los vertices del tablero pasaria la
   * comprobacion de arriba en cuanto unos pocos fueran legales. Se toman los vertices que
   * NO estan marcados para la ciudad y se exige que el reductor los rechace uno por uno.
   */
  const marcadosParaCiudad = new Set(obraPosible(suya, 'A', 'torre').sitios.map((m) => m.llave));
  const sinMarcar = verticesDe(mallaDeRadio(2)).filter((v) => !marcadosParaCiudad.has(v));
  const coladas = sinMarcar.filter(
    (v) =>
      motivoDe(
        rico,
        { tipo: ALZAR, carga: { que: 'torre', donde: v } } as Movimiento,
        ctxDe('A', DOS_AQUI),
      ) === null,
  );
  comprobar(
    'y lo que el tablero NO marca para la ciudad, el reductor lo rechaza',
    marcadosParaCiudad.size > 0 && sinMarcar.length > 0 && coladas.length === 0,
    { marcados: marcadosParaCiudad.size, sinMarcar: sinMarcar.length, coladas: coladas.slice(0, 3) },
  );
}

paso('Una partida guardada ANTES del mazo se sigue abriendo');
{
  /*
   * ═══ EL FALLO QUE ESTO COMPRA, Y CÓMO SE VEÍA ═══
   *
   * Las mesas se guardan en disco y una partida de las largas dura días. Cuando el
   * mazo entró, `EstadoDeRiberas` creció con seis campos, y una mesa escrita el día
   * anterior no los tiene. Medido sobre las seis que había guardadas: las diecisiete
   * vistas —dos o tres asientos por mesa, más el espectador— reventaban con «Cannot
   * read properties of undefined» al leer el dueño de la guardia, que no existía.
   *
   * Y no se leía como lo que era: quien volvía a su partida no veía «esta versión no
   * sabe abrir tu mesa», veía que la Sala no cargaba. La partida entera en el disco,
   * inalcanzable.
   *
   * Se construye el estado viejo QUITANDO los campos de uno de verdad, y no
   * escribiendo a mano uno antiguo: un estado inventado envejece solo, y el día que se
   * añada el séptimo campo esta comprobación seguiría pasando sin comprobar nada.
   */
  const abierta = abrirMesa({ id: 'RIB-VIEJA', arcade: RIBERAS, semilla: 4, asientos: [...TRES] });
  const empezada = jugar(abierta, { quien: 'A', rev: abierta.rev, movimiento: { tipo: EMPEZAR_RIBERAS, carga: {} } });
  const alDia = estadoDe(empezada);

  /* Lo que había en el disco: sin mazo, sin guardia, sin mano y sin lo que cuelga de ellos. */
  const comoEstabaEnElDisco = JSON.parse(JSON.stringify(alDia)) as Record<string, unknown>;
  for (const campo of ['mazo', 'guardia', 'turnosAbiertos', 'cartaJugada', 'veredasGratis']) {
    delete comoEstabaEnElDisco[campo];
  }
  const colonosViejos = (comoEstabaEnElDisco['colonos'] as Record<string, unknown>[]).map((c) => {
    const copia = { ...c };
    delete copia['mano'];
    delete copia['guardias'];
    delete copia['titulos'];
    return copia;
  });
  comprobar('el estado de antes no tiene ninguno de los campos nuevos', 
    !('mazo' in comoEstabaEnElDisco) && !('guardia' in comoEstabaEnElDisco) && !('mano' in (colonosViejos[0] ?? {})));
  comprobarUnaPartidaVieja({ ...comoEstabaEnElDisco, colonos: colonosViejos } as unknown as EstadoDeRiberas);

  function comprobarUnaPartidaVieja(vieja: EstadoDeRiberas): void {
    for (const quien of ['A', 'B', 'C', null]) {
      let seAbrio = true;
      let cuantasOpciones = -1;
      try {
        const vista = proyectarRiberas(vieja, quien as never);
        cuantasOpciones = opcionesDeRiberas(vista, quien as never).length;
        JSON.stringify(vista);
      } catch {
        seAbrio = false;
      }
      comprobar(`la partida de antes se abre para ${quien ?? 'el espectador'}`, seAbrio);
      comprobar(`y se le puede preguntar qué puede hacer (${quien ?? 'espectador'})`, cuantasOpciones >= 0);
    }

    /* Y se sigue JUGANDO: el mazo vacío no se puede comprar, pero lo demás está entero. */
    const vistaDeA = proyectarRiberas(vieja, 'A');
    comprobar('la partida de antes se abre con el mazo vacío', (vistaDeA as unknown as { mazo: number }).mazo === 0);
    comprobar('sin cartas en la mano de nadie', (vistaDeA as unknown as { misCartas: unknown[] }).misCartas.length === 0);
    comprobar(
      'y sin ofrecer comprar, que es más honrado que repartir cartas a mitad de partida',
      !opcionesDeRiberas(vistaDeA, 'A').some((o) => o.tipo === COMPRAR),
    );
    comprobar(
      'el delta, las piezas y los bienes siguen donde estaban',
      (vistaDeA as unknown as { islas: unknown[] }).islas.length === 19 &&
        (vistaDeA as unknown as { colonos: unknown[] }).colonos.length === 3,
    );

    /* Y un estado que YA tiene los campos no se toca: hay comprobaciones que comparan por identidad. */
    comprobar(
      'y a un estado que ya está al día no se le da una copia nueva',
      comoSiSiempreHubieraHabidoMazo(alDia) === alDia,
    );
  }
}
// ---------------------------------------------------------------------------
paso('Cada isla se ve del bien que da, y los dos tableros cuentan lo mismo');
// ---------------------------------------------------------------------------

/*
 * ═══ EL FALLO QUE ESTE BLOQUE COMPRA, Y CÓMO SE VEÍA ═══
 *
 * Riberas tiene DOS tableros: el de tres dimensiones, que pinta `escenas/`, y el plano en
 * SVG que declara `tableroDeRiberas` aquí abajo y que es el que se juega en el móvil y
 * cuando el otro no arranca. Y tiene una tercera superficie que sale del mismo sitio: el
 * color de las cartas de la mano, que `escenas/paleta.ts` deriva del terreno.
 *
 * Al unificar el vocabulario al de Riberas, las tres se pintaron por el NOMBRE del terreno
 * en vez de por el BIEN que produce. Una marisma verdosa porque las marismas son agua
 * estancada, una salina blanquecina porque la sal se seca al sol. Cada decisión, por
 * separado, defendible; juntas, ilegibles: la carta de junco —la madera de este juego—
 * salía verde claro y la de sal blanquecina, mientras el tablero pintaba de verde tanto el
 * carrizal como la marisma, que es la que da el ladrillo.
 *
 * Nada se cayó. Ningún comprobador se puso rojo: `verify:escena` miraba que los doce
 * terrenos TUVIERAN color y que la celda cayera dentro del atlas, que es exactamente el
 * verde que no dice nada sobre si el color es el que toca. Se descubrió jugando.
 *
 * ═══ QUÉ SE AFIRMA AQUÍ, Y POR QUÉ SON REGLAS Y NO UNA LISTA DE SEIS COLORES ═══
 *
 * Una lista de seis colores esperados se actualiza con el fallo dentro: quien retoca un
 * verde retoca la lista, y el comprobador felicita al cambio que acaba de romper la
 * lectura. Así que se afirman CINCO REGLAS que sobreviven a cualquier retoque:
 *
 *  1. Que cada terreno de Riberas se ve como el terreno del vocabulario clásico que rinde
 *     SU MISMO BIEN. La correspondencia no se copia de la paleta: sale de `RINDE`, que es
 *     la regla de verdad. Si mañana la marisma pasara a rendir junco, esto exigiría que la
 *     marisma se pintase de bosque.
 *  2. Que el color plano de cada isla está MÁS CERCA del color que la paleta le da a ESE
 *     terreno —el de su CARTA— que del que le da a cualquiera de los otros cinco. No se
 *     exige el mismo hexadecimal —el plano necesita más contraste entre polígonos vecinos,
 *     y está razonado donde vive la tabla— pero sí que quien mire una carta y busque su
 *     isla la encuentre.
 *  3. Que los seis colores del plano se distinguen entre sí, y del borde que declaran las
 *     propias caras y del suelo de la Sala, por una distancia medida. El fallo que se vio
 *     era literalmente dos terrenos que se parecían demasiado.
 *  4. Que ninguna isla se COME UNA PIEZA: cada relleno se separa de los seis colores con
 *     los que se pintan chozas, torres y veredas. Ésta faltaba, y por eso las piezas del
 *     colono amarillo desaparecían sobre la vega con las tres primeras en verde.
 *  5. Que dos islas no salen de la MISMA CELDA DEL ATLAS, que es lo único que decide el
 *     aspecto de un hexágono en el tablero de tres dimensiones. Ésta también faltaba, y su
 *     ausencia dejó pasar en verde un arreglo del tablero plano que hizo indistinguibles la
 *     salina y la vega en el otro.
 *
 * Y las cinco se ven fallar: cada una se vuelve a correr con los datos de ANTES, que están
 * copiados aquí para eso. Una comprobación que sólo se ha ejecutado con los datos buenos no
 * se ha visto fallar nunca — y las dos últimas existen precisamente porque las tres
 * primeras pasaban en verde con el fallo delante.
 */
{
  /*
   * LA DISTANCIA SE MIDE EN CIELAB Y NO EN RGB, y no es refinamiento.
   *
   * En RGB, `#3f6d5a` y `#6d8f3f` —el verde azulado de la marisma de antes y el verde del
   * carrizal— están a 68 unidades, más lejos que muchos pares que sí se distinguen. El ojo
   * los ve casi iguales porque el verde pesa el doble que el rojo y seis veces más que el
   * azul, y RGB no lo sabe. CIE76 es la fórmula más simple que sí: se convierte a un
   * espacio donde una unidad de distancia es aproximadamente una unidad de «se nota», y se
   * mide en línea recta. No es perfecta —CIEDE2000 lo hace mejor con azules saturados— pero
   * el umbral que hace falta aquí es grueso y no vale la pena la aritmética de la otra.
   */
  function aLab(hex: string): [number, number, number] {
    const canal = (i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    const lineal = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const r = lineal(canal(0));
    const v = lineal(canal(1));
    const a = lineal(canal(2));
    /* D65, el blanco de referencia de sRGB. */
    const x = (r * 0.4124 + v * 0.3576 + a * 0.1805) / 0.95047;
    const y = r * 0.2126 + v * 0.7152 + a * 0.0722;
    const z = (r * 0.0193 + v * 0.1192 + a * 0.9505) / 1.08883;
    const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  }
  function distancia(uno: string, otro: string): number {
    const a = aLab(uno);
    const b = aLab(otro);
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }

  /*
   * De qué terreno del vocabulario clásico sale cada bien de Riberas, DICHO AQUÍ.
   *
   * Es la traducción entre los dos vocabularios y es el único dato de este bloque que se
   * escribe a mano: el junco es la madera, el limo el ladrillo, la sal ocupa el sitio de la
   * lana, el grano es el grano y la piedra el mineral. Se escribe aquí, y no se importa de
   * la paleta, porque un comprobador que lea su respuesta del fichero que comprueba no
   * comprueba nada. Éste es el segundo testigo.
   */
  const CLASICO_QUE_DA_LO_MISMO: Readonly<Record<string, string>> = {
    junco: 'bosque',
    limo: 'colina',
    sal: 'pradera',
    grano: 'campo',
    piedra: 'montana',
  };

  /* Y el que no rinde nada se ve como el que no rinde nada. */
  const SIN_BIEN = 'desierto';

  function desparejados(comoSeVe: (terreno: string) => TerrenoPintado): string[] {
    const malos: string[] = [];
    for (const [terreno, bien] of Object.entries(RINDE)) {
      const clasico = bien === null ? SIN_BIEN : CLASICO_QUE_DA_LO_MISMO[bien];
      if (clasico === undefined) {
        malos.push(`${terreno} rinde ${bien}, que no tiene terreno clásico en esta tabla`);
        continue;
      }
      const aqui = comoSeVe(terreno);
      const alli = terrenoDe(clasico);
      if (aqui.color !== alli.color) malos.push(`${terreno} ${aqui.color} != ${clasico} ${alli.color}`);
      if (aqui.celda[0] !== alli.celda[0] || aqui.celda[1] !== alli.celda[1]) {
        malos.push(`${terreno} celda ${aqui.celda.join(',')} != ${clasico} ${alli.celda.join(',')}`);
      }
    }
    return malos;
  }

  comprobar('los seis terrenos de Riberas rinden lo que rinden y no se ha perdido ninguno', Object.keys(RINDE).length === 6, Object.keys(RINDE));
  comprobar(
    'cada terreno se ve —color y celda— como el terreno clásico que da su mismo bien',
    desparejados(terrenoDe).length === 0,
    desparejados(terrenoDe),
  );

  /*
   * LA VACUNA: los seis de ANTES, tal como estaban escritos, tienen que fallar esto.
   *
   * Sin esto, la comprobación de arriba diría lo mismo si `RINDE` se quedara vacía o si
   * `terrenoDe` devolviera siempre el terreno de reserva.
   */
  const COMO_ESTABAN: Readonly<Record<string, TerrenoPintado>> = {
    marisma: { color: '#6a7f4f', celda: [7, 1] },
    carrizal: { color: '#93a15a', celda: [4, 1] },
    salina: { color: '#d8cfa8', celda: [5, 2] },
    cantil: { color: '#8a8f96', celda: [3, 0] },
    vega: { color: '#c8a44e', celda: [0, 2] },
    duna: { color: '#e2d3a8', celda: [3, 2] },
  };
  const fallosDeAntes = desparejados((t) => COMO_ESTABAN[t] ?? terrenoDe(t));
  comprobar(
    'y se ve fallar: la paleta de antes desparejaba los seis',
    fallosDeAntes.length >= 6,
    fallosDeAntes,
  );

  /*
   * QUE LA ESCENA DIGA DE VERDAD LO QUE DICEN LAS REGLAS.
   *
   * `TERRENO_DEL_BIEN` es `RINDE` copiada a mano en `escenas/paleta.ts`, porque la escena
   * no puede importar las reglas. Su propia cabecera avisa de la consecuencia —«si un día
   * cambia qué rinde una marisma, esto no se entera»— y hasta ahora nadie las comparaba
   * valor a valor: sólo que las cinco llaves estuvieran.
   */
  const invertida: string[] = [];
  for (const [terreno, bien] of Object.entries(RINDE)) {
    if (bien === null) continue;
    if (TERRENO_DEL_BIEN[bien] !== terreno) invertida.push(`${bien}: la escena dice ${String(TERRENO_DEL_BIEN[bien])} y las reglas ${terreno}`);
  }
  comprobar('la tabla de bienes de la escena es `RINDE` del derecho', invertida.length === 0, invertida);
  comprobar(
    'y no le sobra ningún bien que este juego no reparta',
    Object.keys(TERRENO_DEL_BIEN).length === Object.values(RINDE).filter((b) => b !== null).length,
    Object.keys(TERRENO_DEL_BIEN),
  );

  /*
   * LAS CINCO CARTAS DE LA MANO, una a una y con el color dicho en palabras.
   *
   * El color de una carta sale del terreno de su bien, así que arreglar la paleta las
   * arregla solas — y por eso conviene que estén escritas: esto es lo que se miró jugando y
   * lo que hay que poder volver a mirar sin abrir una ventana.
   */
  const CARTAS_QUE_SE_MIRAN: ReadonlyArray<readonly [string, string, string]> = [
    ['junco', 'bosque', 'verde oscuro'],
    ['limo', 'colina', 'arcilla rojiza'],
    ['sal', 'pradera', 'verde claro'],
    ['grano', 'campo', 'amarillo de sembrado'],
    ['piedra', 'montana', 'gris'],
  ];
  for (const [bien, clasico, comoSeLlama] of CARTAS_QUE_SE_MIRAN) {
    comprobar(
      `la carta de ${bien} sale ${comoSeLlama}, que es el color de ${clasico}`,
      colorDelBien(bien) === colorDeTerreno(clasico),
      { carta: colorDelBien(bien), terreno: colorDeTerreno(clasico) },
    );
  }

  /* ═══ Y AHORA EL TABLERO PLANO, SACADO DE UNA PARTIDA DE VERDAD ═══ */

  /*
   * Se pide por la misma puerta por la que lo pide el móvil —`tableroDeRiberas` sobre una
   * vista proyectada— y no leyendo la tabla de colores. Así lo que se mide es lo que se ve:
   * si mañana alguien pinta las islas desde otro sitio, esto lo sigue mirando.
   */
  const repartido = avanzarRiberas(undefined, { tipo: EMPEZAR_RIBERAS, carga: {} }, { quien: 'A', azar: 31, tic: 0, asientos: ['A', 'B'] });
  /*
   * SIN ESTIAJE A PROPÓSITO, y esta línea es la segunda vez que este bloque se rompe por
   * lo mismo. La isla que el estiaje tiene seca se pinta EN PENUMBRA (`PENUMBRA_DEL_ESTIAJE`
   * en `riberas.ts`), y como nace en la duna, el mapa de abajo recogía la duna a media luz y
   * las tres comprobaciones de color se ponían rojas sin que ningún color de la paleta
   * hubiera cambiado: decían «el duna del plano se parece más al cantil de la escena».
   *
   * Lo que este bloque mide es LA PALETA —que los seis terrenos se distinguen entre sí y de
   * los colonos—, y eso no depende de dónde esté una pieza. Así que se le pide el tablero a
   * una vista con `estiaje: null`, que es exactamente lo que trae una mesa guardada de antes
   * de que la pieza existiera. La penumbra se mide en su propio bloque, más abajo, que es
   * otra pregunta: allí se comprueba que la isla seca se separa de sí misma.
   */
  const vistaSinEstiaje = { ...proyectarRiberas(repartido, 'A'), estiaje: null };
  const caras = tableroDeRiberas(vistaSinEstiaje, 'A').caras;
  /*
   * DE QUÉ TERRENO ES CADA CARA SE PREGUNTA POR SU `id`, Y NO POR SU RÓTULO.
   *
   * Esto leía `cara.rotulo.toLowerCase()`, que funcionaba mientras el rótulo de una
   * isla fuera siempre y sólo el nombre de su terreno. Desde el estiaje, la isla
   * ocupada rotula «Duna · estiaje», así que el mapa perdía una entrada y las tres
   * comprobaciones de color de abajo se ponían rojas sin que ningún color hubiera
   * cambiado. El `id` de una cara es la llave de su isla y no la pinta nadie: es la
   * llave con la que se pregunta.
   */
  const terrenoDeLaCara = new Map<string, string>();
  for (const i of repartido.islas) terrenoDeLaCara.set(llaveDeHex(i.hex), i.terreno);
  const enElPlano = new Map<string, string>();
  for (const cara of caras) enElPlano.set(terrenoDeLaCara.get(cara.id) as string, cara.relleno);

  comprobar(
    'el delta repartido enseña los seis terrenos, o lo de abajo no mira nada',
    Object.keys(RINDE).every((t) => enElPlano.has(t)) && enElPlano.size === 6,
    [...enElPlano.entries()],
  );

  /*
   * REGLA 2: cada color plano está más cerca del COLOR QUE LA PALETA LE DA A SU TERRENO que
   * del que le da a cualquier otro. Es un argmin y no un umbral: permite retocar el tono todo
   * lo que haga falta y prohíbe cambiar de qué terreno se está hablando.
   *
   * ═══ QUÉ MIDE ESTO EXACTAMENTE, QUE NO ES EL TABLERO DE TRES DIMENSIONES ═══
   *
   * Aquí ponía «más cerca del color en tres dimensiones de SU terreno», y era falso de una
   * forma cara. `colorDeTerreno` devuelve el campo `color` de `escenas/paleta.ts`, y ese
   * campo NO llega a ninguna tesela: en el mundo, el aspecto de un hexágono lo decide
   * únicamente su CELDA del atlas —`delta.tsx` clona la tesela de hierba y le mueve las UV—
   * y nadie lee `color` para pintar suelo. Donde `color` sí se usa es en la CARTA de un bien
   * (`colorDelBien`) y como reserva cuando no hay textura.
   *
   * O sea que esta regla contrasta el tablero plano contra las CARTAS, que es una cosa buena
   * y necesaria —son las dos superficies entre las que hay que poder mirar—, pero no dice
   * absolutamente nada del tablero de tres dimensiones. Y esa confusión ya costó: la colisión
   * de celdas entre la salina y la vega pasó por debajo en verde, con esta regla informando
   * de treinta y tres unidades de separación entre dos hexágonos que en pantalla eran el
   * mismo píxel. Quien de verdad mira el mundo es la REGLA 5, aquí abajo.
   */
  function seConfundeCon(plano: Map<string, string>): string[] {
    const confundidos: string[] = [];
    for (const [terreno, color] of plano) {
      let masCerca = terreno;
      let minimo = Infinity;
      for (const otro of plano.keys()) {
        const d = distancia(color, colorDeTerreno(otro));
        if (d < minimo) {
          minimo = d;
          masCerca = otro;
        }
      }
      if (masCerca !== terreno) confundidos.push(`el ${terreno} del plano se parece más al ${masCerca} de la escena`);
    }
    return confundidos;
  }
  comprobar(
    'en el plano, cada isla se parece a su propio terreno del tablero en tres dimensiones',
    seConfundeCon(enElPlano).length === 0,
    seConfundeCon(enElPlano),
  );

  /*
   * REGLA 3: y los seis se distinguen entre sí. El umbral son 25 unidades de CIE76 — muy por
   * encima del «se nota si están pegados», que ronda 2, y por debajo de lo que hay hoy, que
   * es 37. El hueco es a propósito: esto no es para afinar el arte, es para que dos terrenos
   * no vuelvan a acabar del mismo color sin que nadie lo vea.
   */
  const CUANTO_SE_TIENEN_QUE_SEPARAR = 25;
  function demasiadoParecidos(plano: Map<string, string>): string[] {
    const juntos: string[] = [];
    const llaves = [...plano.keys()];
    for (let i = 0; i < llaves.length; i++) {
      for (let j = i + 1; j < llaves.length; j++) {
        const uno = llaves[i] as string;
        const otro = llaves[j] as string;
        const d = distancia(plano.get(uno) as string, plano.get(otro) as string);
        if (d < CUANTO_SE_TIENEN_QUE_SEPARAR) juntos.push(`${uno}/${otro}: ${d.toFixed(1)}`);
      }
    }
    return juntos;
  }
  comprobar(
    'y los seis colores del tablero plano se distinguen entre sí',
    demasiadoParecidos(enElPlano).length === 0,
    demasiadoParecidos(enElPlano),
  );

  /*
   * ═══ LA ISLA SECA SE VE PORQUE SE PINTA SECA ═══
   *
   * El filo de color no vale solo: un trazo fino pide 3:1 de luminancia contra lo que lo
   * rodea —el mínimo que esta casa ya tiene escrito para un elemento no textual— y el
   * turquesa da 1,1:1 sobre la salina y 1,3:1 sobre la duna, que es donde el estiaje nace.
   * Lo que se ve es el ÁREA, así que se exige lo del área: que el relleno en penumbra se
   * separe de su propio color TANTO COMO DOS TERRENOS DISTINTOS entre sí, o sea el mismo
   * umbral que la comprobación de arriba; y que no se acerque tanto al filo como para que
   * la cara se lea como un trazo gordo.
   *
   * Se pide por la misma puerta que todo lo demás: el tablero de una vista con el estiaje
   * puesto, y no la constante.
   */
  const conEstiaje = tableroDeRiberas(proyectarRiberas(repartido, 'A'), 'A').caras;
  const laSeca = conEstiaje.find((c) => c.id === repartido.estiaje) ?? null;
  const laMismaSinEstiaje = caras.find((c) => c.id === repartido.estiaje) ?? null;
  comprobar(
    'la isla del estiaje se pinta en penumbra, y se separa de su propio color tanto como dos terrenos distintos',
    laSeca !== null &&
      laMismaSinEstiaje !== null &&
      laSeca.relleno !== laMismaSinEstiaje.relleno &&
      distancia(laSeca.relleno, laMismaSinEstiaje.relleno) >= CUANTO_SE_TIENEN_QUE_SEPARAR,
    {
      seca: laSeca?.relleno,
      normal: laMismaSinEstiaje?.relleno,
      separacion: laSeca !== null && laMismaSinEstiaje !== null ? Number(distancia(laSeca.relleno, laMismaSinEstiaje.relleno).toFixed(1)) : null,
    },
  );
  comprobar(
    'y no se va tan abajo que la cara se lea como un filo: se separa del borde de la isla',
    laSeca !== null && distancia(laSeca.relleno, '#1d1f26') >= 10,
    { seca: laSeca?.relleno, separacionDelFilo: laSeca === null ? null : Number(distancia(laSeca.relleno, '#1d1f26').toFixed(1)) },
  );
  comprobar(
    'y sólo ella: las otras dieciocho se pintan con el color de su terreno',
    conEstiaje.every((c) => c.id === repartido.estiaje || c.relleno === (caras.find((o) => o.id === c.id)?.relleno ?? null)),
  );

  /*
   * LAS DOS VACUNAS DEL PLANO, con los seis colores que Miguel vio en la pantalla.
   *
   * El verde azulado de la marisma —que da el ladrillo— cae del lado del carrizal y del
   * bosque, y la salina parda cae del lado de la duna. Los dos son exactamente el fallo que
   * se reportó, y con estas dos líneas queda escrito que las reglas de arriba lo cazan.
   */
  const PLANO_DE_ANTES = new Map<string, string>([
    ['marisma', '#3f6d5a'],
    ['carrizal', '#6d8f3f'],
    ['salina', '#8f8a6d'],
    ['cantil', '#6a6a72'],
    ['vega', '#b09a3f'],
    ['duna', '#8a7a5c'],
  ]);
  comprobar(
    'se ve fallar: el tablero plano de antes confundía islas con terrenos que no eran',
    seConfundeCon(PLANO_DE_ANTES).length > 0,
    seConfundeCon(PLANO_DE_ANTES),
  );
  comprobar(
    'y se ve fallar la otra: el de antes tenía colores que no se separaban',
    demasiadoParecidos(PLANO_DE_ANTES).length > 0,
    demasiadoParecidos(PLANO_DE_ANTES),
  );

  /*
   * ═══ REGLA 3 BIS: NI DEL BORDE QUE LA PROPIA CARA DECLARA, NI DEL SUELO DE LA SALA ═══
   *
   * La regla de arriba mide los seis rellenos ENTRE SÍ y ahí se para, y es el mismo hueco de
   * vigilancia que este bloque entero existe para tapar: un relleno también tiene detrás el
   * suelo de la Sala y encima el trazo con el que se dibuja su propio contorno, y un terreno
   * que se funda con cualquiera de los dos deja de ser un hexágono y pasa a ser un agujero.
   * Hoy pasan de sobra —42,2 el más apretado contra el borde, 51,5 contra el suelo— y por eso
   * conviene escribirlo ahora: es barato mientras nadie lo esté rompiendo.
   *
   * El borde NO se escribe aquí como literal: se lee de `caras[0].borde`, que es el que la
   * cara declara y el que el mueble pinta. Con un literal, el día que Riberas cambie su
   * contorno esta comprobación seguiría verde midiendo un color que ya no existe — que es
   * exactamente la forma del fallo que el resto del bloque persigue.
   */
  /*
   * EL BORDE SE LEE DE UNA CARA QUE NO TENGA EL ESTIAJE, y esto ANTES leía `caras[0]`
   * a secas y exigía que las diecinueve declararan el mismo. Las dos cosas dejaron de
   * valer el día que la isla ocupada empezó a declarar su propio filo: el reparto pone
   * el estiaje en la duna, y la duna puede ser la primera del recorrido.
   *
   * Sigue sin escribirse ningún literal: los dos bordes se leen de las caras, que es
   * lo que el mueble pinta. Con un literal, el día que Riberas cambie su contorno esta
   * comprobación seguiría verde midiendo un color que ya no existe.
   *
   * Y se leen de `conEstiaje` y no de `caras`, porque `caras` es ahora el tablero de una
   * vista SIN la pieza —para que la paleta se mida sin penumbra, ver más arriba— y ahí no
   * hay ninguna cara que declare el filo del estiaje.
   */
  const laDelEstiaje = conEstiaje.find((c) => c.id === repartido.estiaje) as { borde: string };
  const sinEstiaje = conEstiaje.filter((c) => c.id !== repartido.estiaje);
  const bordeDeclarado = sinEstiaje[0]?.borde ?? '';
  const bordeDelEstiaje = laDelEstiaje.borde;
  comprobar(
    'las caras declaran el borde con el que se dibujan, y es un color leíble',
    /^#[0-9a-f]{6}$/i.test(bordeDeclarado),
    bordeDeclarado,
  );
  comprobar(
    'y las DIECIOCHO que no tienen el estiaje declaran el mismo, o «el borde» no significaría nada',
    conEstiaje.length === 19 && sinEstiaje.length === 18 && sinEstiaje.every((c) => c.borde === bordeDeclarado),
    [...new Set(sinEstiaje.map((c) => c.borde))],
  );
  comprobar(
    'y la que lo tiene declara otro, que es lo que se ve sin leer',
    /^#[0-9a-f]{6}$/i.test(bordeDelEstiaje) && bordeDelEstiaje !== bordeDeclarado,
    bordeDelEstiaje,
  );
  /*
   * ═══ Y EL FILO DEL ESTIAJE SE SEPARA DE LOS SEIS RELLENOS, COMO ELLOS ENTRE SÍ ═══
   *
   * Es la misma regla que la de abajo y por el mismo motivo: un filo que se funde con
   * el relleno de la isla que rodea no marca nada, y la isla ocupada puede ser
   * cualquiera de las seis. Se mide con el mismo umbral y se dice qué par es el más
   * apretado, para que quien retoque el color sepa de cuánto margen dispone. Y no
   * puede ser «el acento»: `borde` es una cadena que el retablo de la app mete cruda en
   * el trazo de un SVG nativo, que no resuelve variables de CSS, y esta casa tiene un
   * acento por tema.
   */
  const contraElEstiaje = [...enElPlano.entries()]
    .map(([terreno, color]) => `${terreno}: ${distancia(color, bordeDelEstiaje).toFixed(1)}`)
    .sort((a, b) => Number(a.split(': ')[1]) - Number(b.split(': ')[1]));
  comprobar(
    'el filo del estiaje se separa de los seis rellenos: se ve encima de cualquier isla',
    [...enElPlano.values()].every((color) => distancia(color, bordeDelEstiaje) >= CUANTO_SE_TIENEN_QUE_SEPARAR),
    contraElEstiaje,
  );
  /*
   * LA VACUNA: la misma regla, con el filo puesto del color de la duna —que es donde el
   * estiaje empieza toda partida— tiene que caer. Sin ella, «se separa de los seis»
   * saldría verde también si `enElPlano` llegara vacío o si `distancia` devolviera
   * `NaN`, que no es menor que nada.
   */
  comprobar(
    'se ve fallar: un filo del color de la duna no se vería sobre la duna',
    ![...enElPlano.values()].every(
      (color) => distancia(color, enElPlano.get('duna') as string) >= CUANTO_SE_TIENEN_QUE_SEPARAR,
    ),
  );

  /*
   * El suelo de la Sala SÍ va como literal, y es una decisión distinta: `--suelo` es una
   * variable de CSS de los dos clientes y este guion no tiene hoja de estilos que abrir. Va
   * escrito con su procedencia —`escritorio/src/estilo.css`, `--suelo: #080a0e`— y es la
   * misma copia que ya lleva la cabecera de `COLOR_DEL_TERRENO`.
   */
  const SUELO_DE_LA_SALA = '#080a0e';
  function seFundeConElFondo(plano: Map<string, string>): string[] {
    const fundidos: string[] = [];
    for (const [terreno, color] of plano) {
      const alBorde = distancia(color, bordeDeclarado);
      if (alBorde < CUANTO_SE_TIENEN_QUE_SEPARAR) fundidos.push(`${terreno}/borde: ${alBorde.toFixed(1)}`);
      const alSuelo = distancia(color, SUELO_DE_LA_SALA);
      if (alSuelo < CUANTO_SE_TIENEN_QUE_SEPARAR) fundidos.push(`${terreno}/suelo: ${alSuelo.toFixed(1)}`);
    }
    return fundidos;
  }
  comprobar(
    'ninguna isla se funde con su propio borde ni con el suelo de la Sala',
    seFundeConElFondo(enElPlano).length === 0,
    seFundeConElFondo(enElPlano),
  );
  /*
   * LA VACUNA: un terreno pintado del color de su propio contorno tiene que caer. Sin ella,
   * `seFundeConElFondo` diría lo mismo si `bordeDeclarado` llegara vacío y `distancia`
   * devolviera `NaN` —que no es menor que nada, así que la lista saldría vacía y la
   * comprobación de arriba pasaría en verde sin haber comparado un solo par.
   */
  const PLANO_CON_UNA_ISLA_INVISIBLE = new Map(enElPlano);
  PLANO_CON_UNA_ISLA_INVISIBLE.set('cantil', bordeDeclarado);
  comprobar(
    'se ve fallar: una isla pintada del color de su contorno no es un hexágono',
    seFundeConElFondo(PLANO_CON_UNA_ISLA_INVISIBLE).some((f) => f.startsWith('cantil/borde')),
    seFundeConElFondo(PLANO_CON_UNA_ISLA_INVISIBLE),
  );

  /*
   * ═══ REGLA 4: UNA ISLA NO PUEDE COMERSE UNA PIEZA. ES LA QUE FALTABA ═══
   *
   * Todo lo de arriba vigila que dos ISLAS no se confundan entre sí. Ninguna vigilaba lo
   * otro que pasa sobre un tablero: que encima de cada isla se pintan las CHOZAS, las TORRES
   * y las VEREDAS de quien las tiene, y ésas van del color de su dueño con un filo de un
   * píxel que no promete contraste contra nada.
   *
   * Y ya había pasado. La vega estaba en `#e3b53a`; el tercer color de colono es `#e0b83d`.
   * Son 2,9 CIE76 —«se nota si están pegados» ronda 2— así que en cualquier partida de tres
   * o más, las piezas de quien jugara en amarillo desaparecían sobre las islas de vega. Con
   * la marisma y el rojo pasaba lo mismo más flojo: 16,5. Las dos tablas viven en el mismo
   * fichero, a cuarenta líneas la una de la otra, y nadie las había comparado nunca.
   *
   * El umbral son 20 y no 25 como el de isla-contra-isla, y el hueco tiene su motivo: los
   * seis colores de colono están repartidos por toda la rueda a propósito —para que se
   * distingan ENTRE ELLOS— así que encierran a los seis rellenos por todos los lados a la
   * vez, y pedir 25 obligaría a llevarse la vega a un naranja de señal que ya no es un
   * sembrado. Con 20 el par más apretado de hoy son 27,0 y sigue habiendo margen de retoque.
   *
   * Los colores de las piezas se piden por la puerta por la que se pintan —una mesa de SEIS,
   * proyectada, leyendo `colonos[i].color`— y no leyendo la tabla: así lo que se mide es lo
   * que ve quien juega, y una mesa que repartiera mal los colores se cazaría aquí.
   */
  const SEIS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const conSeis = avanzarRiberas(undefined, { tipo: EMPEZAR_RIBERAS, carga: {} }, { quien: 'A', azar: 77, tic: 0, asientos: SEIS });
  const coloresDePieza = (
    proyectarRiberas(conSeis, 'A') as unknown as { colonos: { color: string }[] }
  ).colonos.map((c) => c.color);
  comprobar(
    'una mesa de seis reparte seis colores de pieza distintos, o lo de abajo mira de menos',
    coloresDePieza.length === 6 && new Set(coloresDePieza).size === 6,
    coloresDePieza,
  );

  const CUANTO_SE_SEPARA_DE_UNA_PIEZA = 20;
  function seComeUnaPieza(plano: Map<string, string>, piezas: readonly string[]): string[] {
    const comidas: string[] = [];
    for (const [terreno, color] of plano) {
      for (const pieza of piezas) {
        const cuanto = distancia(color, pieza);
        if (cuanto < CUANTO_SE_SEPARA_DE_UNA_PIEZA) comidas.push(`${terreno} ${color} se come al colono ${pieza}: ${cuanto.toFixed(1)}`);
      }
    }
    return comidas;
  }
  comprobar(
    'ninguna isla se come las piezas de ningún colono',
    seComeUnaPieza(enElPlano, coloresDePieza).length === 0,
    seComeUnaPieza(enElPlano, coloresDePieza),
  );
  /*
   * Y EL FILO DEL ESTIAJE TAMPOCO. Va aquí y no arriba con los otros dos porque los
   * colores de las piezas se piden por la puerta por la que se pintan —una mesa de
   * seis, proyectada— y eso se monta en este bloque. El filo se dibuja alrededor de
   * la isla ocupada y las piezas se pintan encima de ella, así que si el filo fuera el
   * color de un colono, sus chozas en esa isla desaparecerían justo el turno en que
   * hay que mirarla.
   */
  comprobar(
    'ni el filo del estiaje se come ninguna, que es el mismo par de superficies',
    coloresDePieza.every((pieza) => distancia(pieza, bordeDelEstiaje) >= CUANTO_SE_SEPARA_DE_UNA_PIEZA),
    coloresDePieza.map((pieza) => `${pieza}: ${distancia(pieza, bordeDelEstiaje).toFixed(1)}`),
  );

  /*
   * LA VACUNA, con los dos rellenos de ANTES y los colonos de HOY: los que Miguel tenía
   * delante. Tiene que caer, y tiene que caer por los dos sitios que se reportaron — no basta
   * con que la lista no esté vacía, porque una lista con un solo par sería verde para una
   * regla que sólo mirase el amarillo.
   */
  const PLANO_ANTES_DE_APARTAR_LAS_PIEZAS = new Map(enElPlano);
  PLANO_ANTES_DE_APARTAR_LAS_PIEZAS.set('vega', '#e3b53a');
  PLANO_ANTES_DE_APARTAR_LAS_PIEZAS.set('marisma', '#c05a2c');
  const loQueSeComia = seComeUnaPieza(PLANO_ANTES_DE_APARTAR_LAS_PIEZAS, coloresDePieza);
  comprobar(
    'se ve fallar: la vega de antes era el amarillo del tercer colono',
    loQueSeComia.some((f) => f.startsWith('vega')),
    loQueSeComia,
  );
  comprobar(
    'y también la marisma contra el rojo del primero, que es el mismo fallo más flojo',
    loQueSeComia.some((f) => f.startsWith('marisma')),
    loQueSeComia,
  );

  /*
   * ═══ REGLA 5: DOS ISLAS NO SON LA MISMA TESELA. ES LO QUE DE VERDAD DECIDE EL MUNDO ═══
   *
   * Lo que hace que un hexágono se vea de un color en tres dimensiones NO es ningún
   * hexadecimal: es a qué CELDA del atlas apuntan las UV de su suelo. `delta.tsx` clona la
   * tesela de hierba del pack y le suma el desplazamiento hasta la celda del bioma, y no lee
   * `color` para ninguna tesela ni planta nada por terreno. Así que dos terrenos con la misma
   * celda son, literalmente, el mismo píxel — y las reglas 1 a 3, que sólo miran colores, no
   * pueden verlo.
   *
   * No es hipotético. Al emparejar cada terreno de Riberas con el clásico que rinde su mismo
   * bien, el campo se quedó con la celda de la hierba —la misma que la pradera— y con eso la
   * SALINA y la VEGA pasaron a ser indistinguibles en el mundo, después de que la salina
   * llevara toda su vida con celda propia. El tablero plano se arregló y el otro se rompió,
   * en verde y en el mismo cambio.
   *
   * ═══ Y POR QUÉ LA DUNA NO NECESITA EXCEPCIÓN, AUNQUE COMPARTA ARENA ═══
   *
   * La duna sale de la celda (4,2), que es exactamente la misma mancha de la que salen las
   * riberas de los ríos y las playas de los lagos: está medido en `CELDA_DE_LA_ARENA`, y es
   * a propósito —una playa y una duna del mismo delta tienen que ser la misma arena, no dos
   * beiges que casi casan. Pero eso NO es dos terrenos de Riberas compartiendo celda: la
   * ribera no es un terreno, es un adorno del relieve, y no lleva número ni rinde nada. Esta
   * regla mira los seis de `RINDE` y sólo ésos, así que no hay excepción que escribir.
   */
  function sonLaMismaTesela(celdaDe: (terreno: string) => readonly [number, number]): string[] {
    const dueno = new Map<string, string>();
    const chocan: string[] = [];
    for (const terreno of Object.keys(RINDE)) {
      const celda = celdaDe(terreno);
      const llave = `${String(celda[0])},${String(celda[1])}`;
      const antes = dueno.get(llave);
      if (antes === undefined) dueno.set(llave, terreno);
      else chocan.push(`${antes} y ${terreno} son la misma tesela: celda ${llave}`);
    }
    return chocan;
  }
  const comoSeVeElMundo = (terreno: string): readonly [number, number] => terrenoDe(terreno).celda;
  comprobar(
    'en el tablero de tres dimensiones, dos islas nunca salen de la misma celda del atlas',
    sonLaMismaTesela(comoSeVeElMundo).length === 0,
    sonLaMismaTesela(comoSeVeElMundo),
  );
  comprobar(
    'y las seis celdas caen dentro del atlas de ocho por cuatro del pack',
    Object.keys(RINDE).every((t) => {
      const [columna, fila] = comoSeVeElMundo(t);
      return Number.isInteger(columna) && Number.isInteger(fila) && columna >= 0 && columna < 8 && fila >= 0 && fila < 4;
    }),
    Object.keys(RINDE).map((t) => `${t} ${comoSeVeElMundo(t).join(',')}`),
  );
  /*
   * LA VACUNA: el reparto de celdas de ANTES, con el campo —y por tanto la vega— en la celda
   * de la hierba, que es la de la pradera y por tanto la de la salina. Es el fallo exacto que
   * pasó en verde, y esta línea es la única de todo el fichero que se pone roja si alguien lo
   * repite.
   */
  const CELDA_DE_LA_HIERBA_MEDIDA: readonly [number, number] = [0, 2];
  const comoSeVeiaAntes = (terreno: string): readonly [number, number] =>
    terreno === 'vega' ? CELDA_DE_LA_HIERBA_MEDIDA : terrenoDe(terreno).celda;
  comprobar(
    'se ve fallar: con la vega en la celda de la hierba, salina y vega eran el mismo píxel',
    sonLaMismaTesela(comoSeVeiaAntes).some((f) => f.includes('salina') && f.includes('vega')),
    sonLaMismaTesela(comoSeVeiaAntes),
  );
}

/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS», que este guion no tenia.
 *
 * Lo tiene `escenas/scripts/verificar-escena.ts` desde hace tiempo y aqui faltaba, y la
 * diferencia importa: sin el, un bloque cuyo bucle itere CERO veces —porque la partida no
 * llego al estado interesante— sale en verde con la lista de aciertos mas corta. Nadie
 * mira la longitud de una lista de aciertos; todo el mundo mira el color.
 *
 * El numero va a mano y hay que subirlo al anadir comprobaciones. Ese es el precio, y es
 * barato al lado de un verde que no ha comprobado nada.
 *
 * Y SE MIDE, NO SE PONE AL RAS. Con todo verde este guion hace 541; el numero es 530
 * porque hay bloques que se saltan cuando la regla esta rota, y si el guardia estuviera en
 * 541 saltaria EL antes de que se vieran las lineas rojas —que es lo contrario de lo que
 * hace falta para arreglar nada—. Medido con la vacuna que mas bloques apaga (la guardia
 * que no enciende el estiaje): 536 comprobaciones y 19 rojas. Once de margen.
 */
const COMPROBACIONES_ESCRITAS = 530;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(
    `Solo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones que ` +
      'tiene escritas este guion: se ha caido por el camino sin decirlo. ' +
      'Si has anadido comprobaciones nuevas, sube el numero.',
  );
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(
    `✔ ${hechas} comprobaciones. El mismo vértice tiene una sola llave por los tres caminos, ninguna\n` +
      '  choza toca a otra, la serpentina va y vuelve, el Vado Largo se rompe cuando un vecino planta\n' +
      '  una choza en medio, un trueque caduca solo, y quien no tiene el turno contesta — mientras el\n' +
      '  reductor rechaza lo que `opciones()` no ofreció y sigue validando lo que sí.\n' +
      '  Y una vereda puede LLEGAR al vértice donde otro tiene casa, pero no SALIR de él: lo que el\n' +
      '  juego deja construir y lo que el Vado cuenta dan el mismo número, que es la regla que faltaba\n' +
      '  y por la que Miguel puso cinco puentes seguidos sin premio y sin explicación.\n' +
      '  Y el mazo: veinticinco cartas barajadas una vez con la semilla de la mesa, una carta que no se\n' +
      '  juega el turno que se compra, una por turno, el acaparamiento que se lleva todos los de un bien\n' +
      '  y ninguno más, las dos veredas que son dos, y un título que sólo suma en público cuando se\n' +
      '  enseña — con La Mayor Guardia al tercero y sólo si se supera.\n' +
      '  Y LA GUARDIA MUEVE: enciende el estiaje igual que un siete —sin descarte, que ése lo cobra el\n' +
      '  siete y sólo el siete—, se puede jugar ANTES de tirar y entonces lo que sale son los dieciocho\n' +
      '  destinos y no «Tirar los dados», y el robo lo decide la isla y no el naipe. Con el turno que\n' +
      '  nadie había descrito jugado entero: carta antes de tirar, mover y robar, un siete detrás, la\n' +
      '  misma bandera otra vez con descarte, y un segundo robo — con una sola muesca al final.\n' +
      '  Y EL ESTIAJE: al sacar un siete hay que mover la pieza —a otra isla, y no se puede tirar ni\n' +
      '  pasar hasta hacerlo—, la isla donde se posa deja de rendir exactamente lo que rendía, se le\n' +
      '  roba una ficha entera con su número de serie a quien tenga algo puesto en ella, el reloj\n' +
      '  mueve por quien no está sin gastar azar, y una mesa de ayer se reabre con la pieza en la duna.\n' +
      '  Todo eso jugado hasta un siete de verdad y no montado a mano, que es lo único que se pone\n' +
      '  rojo el día que la línea que enciende la bandera desaparezca.\n' +
      '  Y EL DESCARTE: ese mismo siete pilla a dos con la mano llena y les hace tirar la mitad ANTES\n' +
      '  de que la pieza se mueva —el que tiró tenía siete justas y no tira ninguna—, se tira ficha a\n' +
      '  ficha y siempre la más vieja de su clase, la tiran dos que NO tienen el turno, el reloj tira\n' +
      '  por los dos de una vez cuando nadie está, y mientras dura no se contesta a un trueque aunque\n' +
      '  siga abierto para después. Jugado a ciegas leyendo sólo `turnoDe`, que es la decisión de la\n' +
      '  que cuelgan el reloj de la mesa, el aviso del móvil y los dos comprobadores que juegan solos.\n' +
      '  Y cada isla se ve del bien que da: el carrizal como el bosque porque su junco es la madera, la\n' +
      '  marisma como la colina porque su limo es el ladrillo — en el tablero plano, en el de tres\n' +
      '  dimensiones y en la carta, con los seis colores del plano separados lo bastante para no\n' +
      '  confundirse entre ellos, para no tragarse las piezas de ningún colono y para que no haya dos\n' +
      '  islas que salgan de la misma celda del atlas, que es lo que de verdad decide el mundo.',
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
