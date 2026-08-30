/**
 * El rompecabezas de El Nudo de Valdehierro, comprobado a lo bruto.
 *
 *   npm run verify:cuadro-nudo
 *
 * ═══ QUÉ DEMUESTRA Y POR QUÉ NO BASTA CON PROBARLO UNA VEZ ═══
 *
 * Un cuadro de marchas es un rompecabezas GENERADO: cada partida trae el suyo,
 * con otra solución, otros telegramas y otro reparto. Probar uno demuestra que
 * uno sale bien. Lo que hace falta demostrar es que salen bien TODOS —con
 * cuatro personas y con doce, con la semilla que sea— porque el que salga mal lo
 * va a descubrir una mesa a las dos de la mañana y no habrá forma de arreglarlo.
 *
 * Así que se generan cientos, con semillas distintas y mesas de todos los
 * tamaños, y de cada uno se comprueban las cuatro garantías CON UNA
 * IMPLEMENTACIÓN QUE NO ES LA DEL GENERADOR: `verificarCuadro` enumera desde
 * cero, sin la caché de bits. Esa segunda opinión ya ha cazado un fallo real
 * —el generador leía un mapa de bits como si fuera un array de booleanos y
 * creía haber determinado un cuadro único cuando quedaban cuatro— y lo cazó sin
 * que nada diera un error.
 *
 * ═══ Y LOS CUATRO INSTRUMENTOS ═══
 *
 * Los minijuegos tienen el mismo problema: se generan, así que hay que
 * demostrar que TODOS los que se pueden generar tienen solución. Aquí se
 * plantean los cuatro para las seis franjas y decenas de semillas, y se
 * RESUELVEN de verdad —con el mismo solucionador que usa el generador para la
 * maniobra, con la solución guardada para el parte y el enclavamiento, y con
 * una búsqueda propia para el cargue— y se comprueba que la corrección los
 * acepta. Un instrumento sin solución es alguien plantado delante de una
 * pantalla que no puede terminar.
 *
 * Es puro: no arranca servidor y no toca la red. La velada entera la prueba
 * `npm run verify:nudo`.
 */
import {
  escribirTelegramas,
  generarCuadro,
  redactarTelegrama,
  resolublePorEliminacion,
  universoDeTelegramas,
  verificarCuadro,
} from '../src/juegos/nudo-cuadro';
import {
  comprobarCargue,
  corregirInstrumento,
  minimoDelEnclavamiento,
  plantearInstrumento,
  resolverManiobra,
} from '../src/juegos/nudo-instrumentos';
import {
  claveDeTelegrama,
  cuadrosDe,
  cumpleTelegrama,
  franjasDe,
  retrasoMaximoPara,
  CONVOYES_DE_LA_NOCHE,
  RETRASO_POR_ORDEN_RECHAZADA,
  FRANJAS_DE_LA_NOCHE,
  OFICIOS,
} from '../../shared/juegos/nudo-tipos';
import type {
  CarguePlanteado,
  EnclavamientoPlanteado,
  ManiobraPlanteada,
  MovimientoDeManiobra,
  PartePlanteado,
} from '../../shared/juegos/nudo-tipos';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 320)}`}`,
  );
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const CONVOYES = Array.from({ length: CONVOYES_DE_LA_NOCHE }, (_, i) => `c${i}`);
const NOMBRES: Record<string, string> = {
  c0: 'El Correo de Medianoche',
  c1: 'El mixto de Penarroya',
  c2: 'El carbonero de la Cuenca',
  c3: 'El expreso de la frontera',
  c4: 'El tren de obras del 84',
  c5: 'El ganadero de Villaseca',
};

// ---------------------------------------------------------------------------
// 1 · El universo de telegramas
// ---------------------------------------------------------------------------

paso('El universo de telegramas no tiene duplicados ni cosas raras');
{
  const universo = universoDeTelegramas(CONVOYES, FRANJAS_DE_LA_NOCHE);
  const claves = universo.map(claveDeTelegrama);
  comprobar('hay telegramas que ofrecer', universo.length > 100, universo.length);
  comprobar(
    'ninguno se repite: dos iguales dejarían un telegrama que no aporta nada',
    new Set(claves).size === claves.length,
    { total: claves.length, distintos: new Set(claves).size },
  );

  /*
   * NINGUNO PUEDE SER SIEMPRE CIERTO NI SIEMPRE FALSO. Uno siempre cierto no
   * recorta nada y el generador lo descartaría —o sea, sobra en la lista—; uno
   * siempre falso haría el rompecabezas insatisfacible si lo eligiera. Ninguna
   * de las dos cosas debería poder ocurrir, y la única forma de saberlo es
   * contar.
   */
  const inutiles = universo.filter((t) => {
    const n = cuadrosDe(CONVOYES, [t]).length;
    return n === 0 || n === 720;
  });
  comprobar(
    'ningún telegrama es siempre cierto ni imposible',
    inutiles.length === 0,
    inutiles.slice(0, 3).map(claveDeTelegrama),
  );

  /* Y todos se pueden redactar: un `switch` sin rama daría `undefined`. */
  const sinTexto = universo.filter((t) => {
    const texto = redactarTelegrama(t, (id) => NOMBRES[id] ?? id);
    return typeof texto !== 'string' || texto.length < 20;
  });
  comprobar('todos se pueden redactar', sinTexto.length === 0, sinTexto.slice(0, 2));
}

// ---------------------------------------------------------------------------
// 2 · Las cuatro garantías, sobre cientos de cuadros
// ---------------------------------------------------------------------------

const MESAS = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const SEMILLAS = 40;

paso(`Las cuatro garantías, en ${MESAS.length * SEMILLAS} cuadros`);
{
  const tallas: number[] = [];
  const rotos: string[] = [];
  let intentosTotales = 0;

  for (const gente of MESAS) {
    for (let s = 0; s < SEMILLAS; s++) {
      const semilla = `mesa${gente}:${s}`;
      let puzle;
      try {
        puzle = generarCuadro({ convoyes: CONVOYES, ferroviarios: gente, semilla });
      } catch (error) {
        rotos.push(`${semilla}: lanzó «${error instanceof Error ? error.message : error}»`);
        continue;
      }
      intentosTotales += puzle.intentos;
      tallas.push(puzle.telegramas.length);

      const informe = verificarCuadro(CONVOYES, puzle);
      if (!informe.ok) {
        rotos.push(
          `${semilla}: soluciones=${informe.soluciones} único=${informe.unico} ` +
            `mínimo=${informe.minimo} repartido=${informe.repartida} papel=${informe.todosConPapel}`,
        );
        continue;
      }

      /*
       * Y UNA COMPROBACIÓN MÁS, QUE NO HACE `verificarCuadro`: que el cuadro
       * que el generador dice que es el bueno CUMPLE sus propios telegramas.
       * Suena redundante con la unicidad y no lo es: unicidad dice «solo hay
       * uno», esto dice «y es el que has apuntado». Un fallo de índice al
       * copiar la solución pasaría la primera y no la segunda.
       */
      const donde = franjasDe(puzle.cuadro);
      const incumplidos = puzle.telegramas.filter((t) => !cumpleTelegrama(donde, t));
      if (incumplidos.length > 0) {
        rotos.push(`${semilla}: el cuadro apuntado incumple ${incumplidos.length} telegramas`);
      }

      /* El reparto cubre TODOS los telegramas: uno sin dueño es una tira que no
         está en la mesa, y entonces el cuadro no se puede sacar. */
      const repartidos = new Set(puzle.reparto.flat());
      if (repartidos.size !== puzle.telegramas.length) {
        rotos.push(
          `${semilla}: se reparten ${repartidos.size} de ${puzle.telegramas.length} telegramas`,
        );
      }
    }
  }

  tallas.sort((a, b) => a - b);
  comprobar(
    `los ${MESAS.length * SEMILLAS} cuadros cumplen las cuatro garantías`,
    rotos.length === 0,
    rotos.slice(0, 5),
  );
  comprobar('se generaron todos', tallas.length === MESAS.length * SEMILLAS, tallas.length);
  console.log(
    `  telegramas por cuadro: mínimo ${tallas[0]}, mediana ${tallas[Math.floor(tallas.length / 2)]}, ` +
      `máximo ${tallas[tallas.length - 1]} · ${(intentosTotales / Math.max(1, tallas.length)).toFixed(1)} intentos de media`,
  );
}

// ---------------------------------------------------------------------------
// 2 bis · Que se pueda sacar con un lápiz
// ---------------------------------------------------------------------------

/**
 * Las cuatro garantías dicen que el cuadro es ÚNICO, no que sea DEDUCIBLE, y no
 * es lo mismo: un conjunto mínimo puede exigir suponer y ver qué se rompe, que
 * es lo que en un sudoku separa un «medio» de un «diabólico».
 *
 * Aquí eso importa más que en un sudoku, porque **el placer del juego ES la
 * deducción**: si la cuadrícula de papel no avanza, la mesa se rinde y pasa a
 * probar órdenes, que sale caro y es menos divertido.
 *
 * Se midió antes de que el generador lo tuviera en cuenta y salió **38 %**.
 * Ahora el generador prefiere los que se dejan sacar a lápiz —sin sacrificar
 * ninguna garantía: el respaldo ya las ha pasado todas— y sale por encima del
 * 95 %. Este listón está puesto en 90 para no ponerse rojo por una racha, y lo
 * que vigila es que nadie lo desactive sin darse cuenta.
 */
paso('Se sacan tachando casillas, sin tener que suponer nada');
{
  let conLapiz = 0;
  let total = 0;
  for (const gente of MESAS) {
    for (let s = 0; s < 12; s++) {
      const puzle = generarCuadro({
        convoyes: CONVOYES,
        ferroviarios: gente,
        semilla: `lapiz${gente}:${s}`,
      });
      total++;
      if (puzle.conLapiz) conLapiz++;
      /*
       * Y la marca no puede mentir: se vuelve a comprobar aquí, con la misma
       * función pero sobre lo entregado. Un `conLapiz: true` sobre un cuadro
       * que no se deja tachar sería peor que no tener la marca.
       */
      if (
        puzle.conLapiz !==
        resolublePorEliminacion(CONVOYES, puzle.telegramas, FRANJAS_DE_LA_NOCHE)
      ) {
        fallos.push(`lapiz${gente}:${s}: la marca \`conLapiz\` no coincide con la realidad`);
        hechas++;
      }
    }
  }
  const porcentaje = Math.round((conLapiz / Math.max(1, total)) * 100);
  console.log(`  ${conLapiz} de ${total} se resuelven a lápiz (${porcentaje} %)`);
  comprobar(
    `al menos 9 de cada 10 se resuelven tachando casillas (salen ${porcentaje} %)`,
    porcentaje >= 90,
    porcentaje,
  );
}

// ---------------------------------------------------------------------------
// 3 · Que a nadie se le quede la mesa sin papel
// ---------------------------------------------------------------------------

paso('Cada persona recibe al menos una tira, se siente quien se siente');
{
  const sinPapel: string[] = [];
  for (const gente of MESAS) {
    for (let s = 0; s < 10; s++) {
      const puzle = generarCuadro({
        convoyes: CONVOYES,
        ferroviarios: gente,
        semilla: `papel${gente}:${s}`,
      });
      const vacios = puzle.reparto.filter((mios) => mios.length === 0).length;
      if (vacios > 0) sinPapel.push(`mesa de ${gente}, semilla ${s}: ${vacios} personas sin tira`);
    }
  }
  comprobar('nadie se queda sin tira', sinPapel.length === 0, sinPapel.slice(0, 4));
}

// ---------------------------------------------------------------------------
// 4 · La misma semilla da el mismo cuadro
// ---------------------------------------------------------------------------

paso('Es determinista: la misma semilla, el mismo cuadro');
{
  const a = generarCuadro({ convoyes: CONVOYES, ferroviarios: 8, semilla: 'igual' });
  const b = generarCuadro({ convoyes: CONVOYES, ferroviarios: 8, semilla: 'igual' });
  comprobar('el cuadro coincide', a.cuadro.join('|') === b.cuadro.join('|'), {
    a: a.cuadro,
    b: b.cuadro,
  });
  comprobar(
    'los telegramas coinciden',
    a.telegramas.map(claveDeTelegrama).join('|') === b.telegramas.map(claveDeTelegrama).join('|'),
  );
  comprobar('y el reparto también', JSON.stringify(a.reparto) === JSON.stringify(b.reparto));

  const c = generarCuadro({ convoyes: CONVOYES, ferroviarios: 8, semilla: 'distinta' });
  comprobar(
    'y con otra semilla sale otro cuadro',
    c.cuadro.join('|') !== a.cuadro.join('|') ||
      c.telegramas.length !== a.telegramas.length,
    { a: a.cuadro, c: c.cuadro },
  );
}

// ---------------------------------------------------------------------------
// 5 · Se niega a trazar lo que no se puede jugar
// ---------------------------------------------------------------------------

paso('Falla en vez de entregar un cuadro que no se puede jugar');
{
  const lanza = (que: () => unknown): string | null => {
    try {
      que();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };
  comprobar(
    'con cinco convoyes se niega',
    lanza(() => generarCuadro({ convoyes: CONVOYES.slice(0, 5), ferroviarios: 6 })) !== null,
  );
  comprobar(
    'con siete convoyes se niega',
    lanza(() => generarCuadro({ convoyes: [...CONVOYES, 'c6'], ferroviarios: 6 })) !== null,
  );
  comprobar(
    'con convoyes repetidos se niega',
    lanza(() => generarCuadro({ convoyes: ['a', 'a', 'b', 'c', 'd', 'e'], ferroviarios: 6 })) !== null,
  );
  comprobar(
    'con una sola persona se niega',
    lanza(() => generarCuadro({ convoyes: CONVOYES, ferroviarios: 1 })) !== null,
  );
}

// ---------------------------------------------------------------------------
// 6 · La redacción no miente
// ---------------------------------------------------------------------------

paso('Cada tira nombra a los convoyes de los que habla');
{
  const puzle = generarCuadro({ convoyes: CONVOYES, ferroviarios: 8, semilla: 'redaccion' });
  const escritos = escribirTelegramas(puzle.telegramas, (id) => NOMBRES[id] ?? id);
  const malos: string[] = [];
  for (const escrito of escritos) {
    const t = escrito.telegrama;
    const citados =
      t.tipo === 'no-franja' || t.tipo === 'paridad'
        ? [t.convoy]
        : t.tipo === 'antes'
          ? [t.antes, t.despues]
          : t.tipo === 'entre'
            ? [t.a, t.medio, t.c]
            : [t.a, t.b];
    for (const id of citados) {
      const nombre = (NOMBRES[id] ?? id).toUpperCase();
      if (!escrito.texto.includes(nombre)) malos.push(`${escrito.id} no nombra a ${nombre}`);
    }
  }
  comprobar('todas nombran a quien citan', malos.length === 0, malos.slice(0, 3));
  comprobar(
    'los ids son estables y en orden',
    escritos.every((e, i) => e.id === `t${i + 1}`),
    escritos.map((e) => e.id),
  );
}

// ---------------------------------------------------------------------------
// 7 · Los cuatro instrumentos: se plantean y se resuelven
// ---------------------------------------------------------------------------

const VOCABULARIO = {
  convoyes: Object.values(NOMBRES),
  puestos: ['La garita del kilometro 83', 'El cuarto del telegrafo', 'El muelle cubierto', 'La cocina'],
  mercancias: ['El suero antidifterico', 'Hulla de la Cuenca', 'Reses para el matadero'],
};

/** Resuelve un cargue por vuelta atrás. Es la búsqueda que el generador no hace. */
function resolverCargue(p: CarguePlanteado): Record<string, string> | undefined {
  const asignado: Record<string, string> = {};
  const back = (i: number): boolean => {
    if (i === p.bultos.length) return true;
    const bulto = p.bultos[i]!;
    for (const vagon of p.vagones) {
      const carga = p.bultos
        .filter((b) => asignado[b.id] === vagon.id)
        .reduce((a, b) => a + b.peso, 0);
      if (carga + bulto.peso > vagon.tope) continue;
      const choca = p.incompatibles.some(
        ([x, y]) =>
          (x === bulto.id && asignado[y] === vagon.id) ||
          (y === bulto.id && asignado[x] === vagon.id),
      );
      if (choca) continue;
      asignado[bulto.id] = vagon.id;
      if (back(i + 1)) return true;
      delete asignado[bulto.id];
    }
    return false;
  };
  return back(0) ? asignado : undefined;
}

paso(`Los cuatro instrumentos, en ${OFICIOS.length * FRANJAS_DE_LA_NOCHE * 30} planteamientos`);
{
  for (const cual of OFICIOS) {
    const rotos: string[] = [];
    let planteados = 0;
    let resueltos = 0;

    for (let s = 0; s < 30; s++) {
      for (let franja = 1; franja <= FRANJAS_DE_LA_NOCHE; franja++) {
        let inst;
        try {
          inst = plantearInstrumento(cual, franja, `semilla${s}`, VOCABULARIO);
        } catch (error) {
          rotos.push(`f${franja} s${s}: no se pudo plantear (${(error as Error).message})`);
          continue;
        }
        planteados++;

        let respuesta = '';
        if (cual === 'agujas') {
          const p = inst.planteamiento as ManiobraPlanteada;
          const camino = resolverManiobra(p.entrada, p.objetivo);
          if (!camino) {
            rotos.push(`f${franja} s${s}: maniobra SIN SOLUCIÓN`);
            continue;
          }
          if (camino.length !== p.optimo) {
            rotos.push(`f${franja} s${s}: el óptimo anunciado (${p.optimo}) no es el real (${camino.length})`);
          }
          respuesta = camino
            .map((m: MovimientoDeManiobra) =>
              m.hacer === 'pasar' ? 'p' : `${m.hacer === 'apartar' ? 'a' : 's'}${m.via}`,
            )
            .join(',');
        } else if (cual === 'telegrafo') {
          const p = inst.planteamiento as PartePlanteado;
          const palabra = (inst.solucion as { palabra: string }).palabra;
          if (p.letras !== palabra.length) rotos.push(`f${franja} s${s}: letras no cuadran`);
          if (p.morse.length !== palabra.length) rotos.push(`f${franja} s${s}: morse no cuadra`);
          if (p.morse.some((m) => m === '')) rotos.push(`f${franja} s${s}: una letra sin código`);
          if (palabra.length < 4) rotos.push(`f${franja} s${s}: palabra demasiado corta`);
          respuesta = palabra;
        } else if (cual === 'enclavamiento') {
          const p = inst.planteamiento as EnclavamientoPlanteado;
          const minimo = minimoDelEnclavamiento(p);
          if (!minimo) {
            rotos.push(`f${franja} s${s}: enclavamiento SIN CONFIGURACIÓN LEGAL`);
            continue;
          }
          if (!minimo.unica) rotos.push(`f${franja} s${s}: el mínimo no es único`);
          const guardada = (inst.solucion as { minima: number[] }).minima;
          if (guardada.join(',') !== minimo.minima.join(',')) {
            rotos.push(`f${franja} s${s}: la solución guardada no es la mínima`);
          }
          respuesta = minimo.minima.join(',');
        } else {
          const p = inst.planteamiento as CarguePlanteado;
          const reparto = resolverCargue(p);
          if (!reparto) {
            rotos.push(`f${franja} s${s}: cargue SIN SOLUCIÓN`);
            continue;
          }
          const veredicto = comprobarCargue(p, reparto);
          if (!veredicto.vale) rotos.push(`f${franja} s${s}: la solución no vale (${veredicto.porque})`);
          respuesta = Object.entries(reparto)
            .map(([b, v]) => `${b}:${v}`)
            .join(',');
        }

        const veredicto = corregirInstrumento(cual, inst.planteamiento, inst.solucion, respuesta);
        if (veredicto.vale) resueltos++;
        else rotos.push(`f${franja} s${s}: la corrección rechaza la solución (${veredicto.porque})`);
      }
    }

    comprobar(
      `${cual}: los ${planteados} planteamientos se resuelven`,
      rotos.length === 0 && resueltos === planteados,
      rotos.slice(0, 3),
    );
  }
}

// ---------------------------------------------------------------------------
// 8 · Y la corrección no se cree cualquier cosa
// ---------------------------------------------------------------------------

paso('La corrección rechaza lo que no vale, y no revienta con basura');
{
  const inst = plantearInstrumento('agujas', 3, 'basura', VOCABULARIO);
  const p = inst.planteamiento as ManiobraPlanteada;

  const basura = ['', 'aaaa', '{"hacer":"pasar"}', 'a9,s7,p'.repeat(30), ' '];
  for (const texto of basura) {
    const r = corregirInstrumento('agujas', inst.planteamiento, inst.solucion, texto);
    comprobar(`la maniobra rechaza «${texto.slice(0, 12)}» sin reventar`, r.vale === false);
  }

  /* Una maniobra legal pero que deja el tren en otro orden NO vale. */
  const alReves = [...p.objetivo].reverse();
  const camino = resolverManiobra(p.entrada, alReves);
  if (camino && alReves.join('') !== p.objetivo.join('')) {
    const texto = camino
      .map((m) => (m.hacer === 'pasar' ? 'p' : `${m.hacer === 'apartar' ? 'a' : 's'}${m.via}`))
      .join(',');
    const r = corregirInstrumento('agujas', inst.planteamiento, inst.solucion, texto);
    comprobar('una maniobra que coloca otro orden se rechaza', r.vale === false, r.porque);
  }

  const enclave = plantearInstrumento('enclavamiento', 5, 'basura', VOCABULARIO);
  const minima = (enclave.solucion as { minima: number[] }).minima;
  const deMas = corregirInstrumento(
    'enclavamiento',
    enclave.planteamiento,
    enclave.solucion,
    [...minima, 99].join(','),
  );
  comprobar('el enclavamiento rechaza una palanca de más', deMas.vale === false);

  const parte = plantearInstrumento('telegrafo', 2, 'basura', VOCABULARIO);
  const palabra = (parte.solucion as { palabra: string }).palabra;
  comprobar(
    'el parte acepta minúsculas y acentos: se transcribe a oído',
    corregirInstrumento('telegrafo', parte.planteamiento, parte.solucion, palabra.toLowerCase()).vale,
  );
  comprobar(
    'y rechaza otra palabra',
    corregirInstrumento('telegrafo', parte.planteamiento, parte.solucion, `${palabra}X`).vale === false,
  );

  const cargue = plantearInstrumento('muelle', 6, 'basura', VOCABULARIO);
  const pc = cargue.planteamiento as CarguePlanteado;
  const todoEnUno = pc.bultos.map((b) => `${b.id}:${pc.vagones[0]!.id}`).join(',');
  const r = corregirInstrumento('muelle', cargue.planteamiento, cargue.solucion, todoEnUno);
  comprobar('el cargue rechaza meterlo todo en un vagón', r.vale === false, r.porque);
  comprobar(
    'y rechaza dejarse un bulto',
    corregirInstrumento('muelle', cargue.planteamiento, cargue.solucion, '').vale === false,
  );
}

// ---------------------------------------------------------------------------
// 9 · La economía de la noche cuadra
// ---------------------------------------------------------------------------

paso('El tope de retraso deja sitio para equivocarse y no para adivinarlo todo');
{
  /*
   * ═══ LA CUENTA QUE DECIDE SI EL JUEGO ES UN JUEGO ═══
   *
   * Adivinar a ciegas el primer convoy cuesta de media 2,5 intentos fallidos
   * (uno de cada seis acierta a la primera, y hay que probar hasta dar); el
   * segundo, 2; y así hasta el último, que sale solo. En total 7,5 órdenes
   * rechazadas de media, y en el peor caso 15.
   *
   * El tope tiene que quedar POR DEBAJO del coste ESPERADO de adivinar. Si
   * queda por encima, una mesa que no deduzca nada gana la noche y las tiras de
   * telegrama —o sea, el juego— pasan a ser decoración. Y tiene que quedar por
   * encima de tres o cuatro fallos, o una mesa que razona bien y se atasca una
   * vez pierde por nada.
   *
   * Con el coste a UNO, esta comprobación salía roja para las mesas grandes. Es
   * lo que hizo subirlo a dos. La cuenta está aquí y no en un comentario del
   * manifiesto justamente para que no se pueda cambiar sin que salte.
   */
  const rechazosParaAdivinar = Array.from(
    { length: CONVOYES_DE_LA_NOCHE },
    (_, i) => (CONVOYES_DE_LA_NOCHE - i - 1) / 2,
  ).reduce((a, b) => a + b, 0);
  const costeDeAdivinar = rechazosParaAdivinar * RETRASO_POR_ORDEN_RECHAZADA;

  for (const gente of [4, 6, 8, 10, 12, 16]) {
    const tope = retrasoMaximoPara(gente);
    comprobar(
      `con ${gente} personas el tope (${tope}) queda por debajo de adivinar (${costeDeAdivinar})`,
      tope < costeDeAdivinar,
      tope,
    );
    comprobar(
      `con ${gente} personas caben al menos tres fallos`,
      tope >= 3 * RETRASO_POR_ORDEN_RECHAZADA,
      tope,
    );
  }
  comprobar(
    'el tope no baja al crecer la mesa',
    retrasoMaximoPara(12) >= retrasoMaximoPara(6),
    { seis: retrasoMaximoPara(6), doce: retrasoMaximoPara(12) },
  );
}

// ---------------------------------------------------------------------------

console.log('\nEl cuadro de marchas de El Nudo de Valdehierro');
console.log(`${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('\n✔ Todo en orden: el cuadro siempre tiene una sola solución y los instrumentos siempre se pueden resolver.');
  process.exit(0);
}
console.log(`\n✘ ${fallos.length} de ${hechas} han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
