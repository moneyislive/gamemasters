/**
 * LA TRADUCCIÓN DE LAS LINDES A LA ESCENA, COMPROBADA CON PARTIDAS DE VERDAD.
 *
 *   npm run verify:lindes-en-tres -w server
 *
 * ═══ QUÉ MIRA, Y POR QUÉ HACE FALTA UN COMPROBADOR SÓLO PARA ESTO ═══
 *
 * Entre las reglas y los píxeles hay una capa que no es ninguna de las dos:
 * `lindes-en-tres.ts`, que traduce la vista que manda la mesa a lo que la escena
 * levanta, y los toques de la escena a movimientos. Vive en `shared/` para que la
 * traducción sea UNA y no una por cliente — y eso es exactamente lo que la hace
 * peligrosa: si miente, mienten las dos pantallas a la vez y de la misma manera, así
 * que compararlas no lo descubre.
 *
 * Lo único que lo descubre es preguntarle a las REGLAS. Así que aquí se juegan
 * partidas con el mismo reductor que corre en Render y, en cada revisión, se afirma:
 *
 *  1. La escena recibe EXACTAMENTE las losas que la vista dice, con su giro y su
 *     número de serie. Ni una de más, ni una de menos, ni una girada de otra manera.
 *  2. Cada casilla donde la escena deja poner es una que `opcionesDeLasLindes` ofrece,
 *     y el movimiento que se manda al tocarla es LA CARGA DE LA OPCIÓN, sin montar
 *     nada por el camino. Un movimiento montado a mano es un movimiento que el
 *     portillo del reductor rechaza, y se ve como un toque que no hace nada.
 *  3. Lo que se ofrece plantar sale de las OPCIONES y no de la vista. La diferencia
 *     importa: `vista.sitios` dice dónde CABE un labriego —es público y lo ve todo el
 *     mundo— y las opciones dicen qué puede hacer ESTE asiento AHORA. Mirando la
 *     vista, a un mirón se le pintarían botones.
 *  4. Los labriegos caen dentro de su losa y con el color de su asiento.
 *  5. Y una vista que no es de este juego devuelve NADA, en vez de un valle vacío.
 */
import {
  EMPEZAR,
  LINDES,
  PASAR,
  PLANTAR,
  PONER,
  avanzarLasLindes,
  colorDeLabriego,
  deQuienEsElTurno,
  loQueSeVe,
  opcionesDeLasLindes,
  partidaNueva,
  seAcabo,
} from '../../shared/arcade/juegos/lindes';
import type { EstadoDeLasLindes } from '../../shared/arcade/juegos/lindes';
import {
  elSiguienteGiro,
  girosQueCaben,
  movimientoDePasar,
  movimientoDePlantar,
  movimientoDePoner,
  seVeEnTres,
  sitiosQueSeOfrecen,
  tableroEnTres,
} from '../../shared/arcade/juegos/lindes-en-tres';
import { losaPorId } from '../../shared/arcade/juegos/lindes-losas';
import { esRechazo } from '../../shared/arcade/motor';
import { canonico } from '../../shared/mecanicas/canonico';
import type { ContextoMovimiento } from '../../shared/arcade/movimiento';
import type { AsientoId, LosSentados } from '../../shared/arcade/tipos';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`,
  );
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const NOMBRES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena'];

function ctxDe(quien: AsientoId | null, asientos: readonly AsientoId[], azar: number): ContextoMovimiento {
  return { quien, azar, tic: 0, asientos };
}

/** Un sorteo con semilla, para que una partida rota se vuelva a romper igual. */
function sorteo(semilla: number): () => number {
  let x = (semilla * 2654435761) >>> 0;
  return () => {
    x = (Math.imul(x ^ (x >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    return x / 4294967296;
  };
}

// ---------------------------------------------------------------------------
paso('Una vista que no es de Las Lindes no da un valle vacío: no da nada');
// ---------------------------------------------------------------------------

for (const basura of [null, undefined, 42, 'una vista', {}, { momento: 'colocando' }, []]) {
  comprobar(`«${String(JSON.stringify(basura))}» no se traduce`, tableroEnTres(basura) === null);
  comprobar(`«${String(JSON.stringify(basura))}» no se puede ver en tres`, !seVeEnTres(basura));
}

// ---------------------------------------------------------------------------
paso('Partidas de verdad, revisión a revisión');
// ---------------------------------------------------------------------------

let revisiones = 0;
let conHuecos = 0;
let conSitios = 0;
let conLabriegos = 0;

for (const cuantos of [2, 3, 4, 5]) {
  const asientos: AsientoId[] = [];
  for (let i = 0; i < cuantos; i++) asientos.push(`a-${i}`);
  const sentados: LosSentados = asientos.map((a, i) => ({ asiento: a, nombre: NOMBRES[i] ?? a }));
  const tirada = sorteo(cuantos * 31 + 7);

  let estado = avanzarLasLindes(partidaNueva(), { tipo: EMPEZAR }, ctxDe(asientos[0] as AsientoId, asientos, 11 * cuantos));
  if (esRechazo(estado)) {
    comprobar(`la mesa de ${cuantos} se reparte`, false, estado.motivo);
    continue;
  }
  let actual: EstadoDeLasLindes = estado;

  let vueltas = 0;
  while (!seAcabo(actual) && vueltas < 260) {
    vueltas++;
    revisiones++;
    const quien = deQuienEsElTurno(actual);
    if (quien === null) break;
    const vista = loQueSeVe(actual, quien, sentados);
    const opciones = opcionesDeLasLindes(vista, quien);
    const datos = tableroEnTres(vista);

    comprobar(`mesa de ${cuantos}, vuelta ${vueltas}: la vista se traduce`, datos !== null);
    if (datos === null) break;

    /* ── 1 · Las mismas losas, con el mismo giro y la misma ficha ─────────── */
    comprobar(
      `mesa de ${cuantos}: la escena recibe tantas losas como hay puestas`,
      datos.losas.length === Object.keys(actual.tablero).length,
      { enLaEscena: datos.losas.length, enLaMesa: Object.keys(actual.tablero).length },
    );
    for (const l of datos.losas) {
      const puesta = actual.tablero[l.casilla];
      comprobar(`la losa ${l.casilla} existe en la mesa`, puesta !== undefined);
      if (puesta === undefined) continue;
      comprobar(`la losa ${l.casilla} es la misma clase`, l.losa === puesta.losa, { l, puesta });
      comprobar(`la losa ${l.casilla} lleva el mismo giro`, l.giro === puesta.giro, { l, puesta });
      comprobar(`la losa ${l.casilla} lleva su número de serie`, l.ficha === puesta.ficha, { l, puesta });
      comprobar(`la losa ${l.casilla} es una del catálogo`, losaPorId(l.losa) !== null);
    }
    comprobar(
      `mesa de ${cuantos}: sólo una losa es la última`,
      datos.losas.filter((l) => l.ultima).length <= 1,
    );

    /* ── 2 · Cada hueco es una opción, y su movimiento es la carga de la opción ── */
    if (datos.huecos.length > 0) conHuecos++;
    for (const h of datos.huecos) {
      const montado = movimientoDePoner(h.x, h.y, h.giro);
      const ofrecida = opciones.some(
        (o) => o.tipo === PONER && canonico({ t: o.tipo, c: o.carga }) === canonico({ t: montado.tipo, c: montado.carga }),
      );
      comprobar(
        `mesa de ${cuantos}: el hueco ${h.x},${h.y}/${h.giro} es un movimiento que el juego ofrece`,
        ofrecida,
        { hueco: h, montado },
      );
    }
    /* Y al revés: ninguna colocación ofrecida se queda sin su casilla en la escena. */
    for (const o of opciones) {
      if (o.tipo !== PONER) continue;
      const c = o.carga as { x: number; y: number; giro: number };
      comprobar(
        `mesa de ${cuantos}: la colocación ${c.x},${c.y}/${c.giro} llega a la escena`,
        datos.huecos.some((h) => h.x === c.x && h.y === c.y && h.giro === c.giro),
        { carga: c },
      );
    }

    /* ── 3 · Lo que se ofrece plantar sale de las opciones, no de la vista ─── */
    const sitios = sitiosQueSeOfrecen(vista, opciones);
    if (sitios.length > 0) conSitios++;
    comprobar(
      `mesa de ${cuantos}: hay tantos sitios ofrecidos como opciones de plantar`,
      sitios.length === opciones.filter((o) => o.tipo === PLANTAR).length,
      { sitios: sitios.length },
    );
    for (const s of sitios) {
      const montado = movimientoDePlantar(s.clase, s.indice);
      comprobar(
        `mesa de ${cuantos}: plantar en ${s.clase}/${s.indice} es la carga de su opción`,
        canonico({ t: s.movimiento.tipo, c: s.movimiento.carga }) ===
          canonico({ t: montado.tipo, c: montado.carga }),
        { suyo: s.movimiento, montado },
      );
    }

    /*
     * ═══ Y A UN MIRÓN NO SE LE OFRECE NADA, AUNQUE LA VISTA TRAIGA `sitios` ═══
     *
     * Es la mitad del §3 de la cabecera, y es la que no se ve sin preguntarlo: la
     * vista de un espectador trae la misma lista de sitios que la de quien juega
     * —dónde cabe un labriego es público, se ve mirando la mesa— y lo que cambia es
     * que sus OPCIONES están vacías. Traducir mirando la vista le pintaría botones
     * a quien no puede pulsar ninguno.
     */
    const delMiron = loQueSeVe(actual, null, sentados);
    comprobar(
      `mesa de ${cuantos}: a un mirón no se le ofrece plantar`,
      sitiosQueSeOfrecen(delMiron, opcionesDeLasLindes(delMiron, null)).length === 0,
    );

    /* ── 4 · Los labriegos, dentro de su losa y de su color ───────────────── */
    if (datos.labriegos.length > 0) conLabriegos++;
    for (const l of datos.labriegos) {
      comprobar(
        `mesa de ${cuantos}: el labriego de ${l.casilla} cae dentro de su losa`,
        Math.abs(l.enX) <= 0.5 && Math.abs(l.enZ) <= 0.5,
        l,
      );
      const donde = actual.labriegos.findIndex((x) => x.asiento === l.asiento);
      comprobar(
        `mesa de ${cuantos}: el labriego de ${l.asiento} lleva el color de su sitio`,
        donde >= 0 && l.color === colorDeLabriego(donde),
        { color: l.color, esperado: donde < 0 ? null : colorDeLabriego(donde) },
      );
      comprobar(
        `mesa de ${cuantos}: el labriego de ${l.casilla} está en una losa puesta`,
        datos.losas.some((x) => x.casilla === l.casilla),
      );
    }
    comprobar(
      `mesa de ${cuantos}: hay tantos labriegos en la escena como plantados`,
      datos.labriegos.length === actual.plantados.length,
    );

    /* ── 5 · Los giros que caben son los que de verdad caben ──────────────── */
    if (datos.huecos.length > 0) {
      const uno = datos.huecos[0] as { x: number; y: number; giro: number };
      const giros = girosQueCaben(datos, uno.x, uno.y);
      comprobar(`mesa de ${cuantos}: en una casilla con hueco cabe al menos un giro`, giros.length > 0);
      comprobar(
        `mesa de ${cuantos}: todos los giros que se dicen caben de verdad`,
        giros.every((g) => datos.huecos.some((h) => h.x === uno.x && h.y === uno.y && h.giro === g)),
        giros,
      );
      comprobar(
        `mesa de ${cuantos}: el siguiente giro es otro de los que caben`,
        giros.indexOf(elSiguienteGiro(giros, giros[0] as never)) >= 0,
      );
      comprobar(
        `mesa de ${cuantos}: girar con la lista vacía deja el giro donde estaba`,
        elSiguienteGiro([], 2) === 2,
      );
      /* Y en una casilla que no admite nada, la lista está vacía y no revienta. */
      comprobar(
        `mesa de ${cuantos}: una casilla sin hueco no ofrece giros`,
        girosQueCaben(datos, 900, 900).length === 0,
      );
    }

    /* Se juega la vuelta: plantar cuando se pueda, y si no, poner o pasar. */
    const plantar = opciones.find((o) => o.tipo === PLANTAR && tirada() < 0.7);
    const poner = opciones.filter((o) => o.tipo === PONER);
    const elegida =
      plantar ??
      (poner.length > 0
        ? (poner[Math.floor(tirada() * poner.length)] as (typeof poner)[number])
        : opciones.find((o) => o.tipo === PASAR));
    if (elegida === undefined) break;
    const salida = avanzarLasLindes(
      actual,
      { tipo: elegida.tipo, carga: elegida.carga },
      ctxDe(quien, asientos, 11 * cuantos + vueltas),
    );
    comprobar(
      `mesa de ${cuantos}, vuelta ${vueltas}: la jugada que la escena mandaría no se rechaza`,
      !esRechazo(salida),
      esRechazo(salida) ? salida.motivo : null,
    );
    actual = esRechazo(salida) ? salida.estado : salida;
  }

  comprobar(`la mesa de ${cuantos} llega al final`, seAcabo(actual), {
    momento: actual.momento,
    vueltas,
  });
}

console.log(
  `  ${revisiones} revisiones traducidas: ${conHuecos} con casillas donde poner, ` +
    `${conSitios} con sitios donde plantar y ${conLabriegos} con labriegos en el tablero`,
);

/*
 * ═══ Y SE EXIGE QUE HAYA PASADO ═══
 *
 * Sin estas tres líneas, todo lo de arriba pasaría en verde con una traducción que no
 * traduce nada: cero huecos, cero sitios y cero labriegos cumplen todas las
 * afirmaciones de más arriba, porque todas son «para cada…». Es el mismo agujero que
 * este repositorio ya tiene apuntado dos veces, y se cierra igual: contando.
 */
comprobar('se ha traducido alguna casilla donde poner', conHuecos > 100, conHuecos);
comprobar('y algún sitio donde plantar', conSitios > 50, conSitios);
comprobar('y algún labriego puesto en el tablero', conLabriegos > 100, conLabriegos);
comprobar('el movimiento de pasar es el del juego', movimientoDePasar().tipo === PASAR);
comprobar('y el identificador del arcade es el suyo', LINDES === 'lindes');

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos.slice(0, 20)) console.log(`  ✗ ${f}`);
  if (fallos.length > 20) console.log(`  … y ${fallos.length - 20} más`);
  process.exit(1);
}

console.log(`${hechas} comprobaciones`);
console.log('\nLa escena recibe las losas que hay, cada casilla que deja tocar es un movimiento que');
console.log('el juego ofrece, lo que se ofrece plantar sale de las opciones y no de la vista, y a');
console.log('quien mira sin jugar no se le pinta un botón.');
