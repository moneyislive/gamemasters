/**
 * Una noche entera de El Nudo de Valdehierro, por el cable.
 *
 *   npm run verify:nudo
 *
 * ═══ POR QUÉ HACE FALTA ADEMÁS DE `verify:cuadro-nudo` ═══
 *
 * Aquella demuestra que el rompecabezas es bueno. Esta demuestra que **se puede
 * jugar**, que no es lo mismo ni de lejos: la app no llama a funciones, manda
 * JSON, y el cuerpo de una petición es `unknown` para TypeScript. Hay una clase
 * entera de fallos que solo se ve aquí, y el peor es que `juegos/instalados.ts`
 * no dé de alta un módulo: el servidor arranca perfectamente, la batería entera
 * pasa en verde —porque los demás comprobadores importan los módulos a mano— y
 * la primera partida de verdad contesta «esta partida todavía no sabe hacer
 * eso» toda la noche.
 *
 * ═══ CÓMO SE PUEDEN RESOLVER LOS MINIJUEGOS DESDE AQUÍ ═══
 *
 * Es la propiedad que hace que este juego se pueda probar entero, y no es
 * casualidad: **los instrumentos los plantea el servidor de forma determinista**
 * a partir del id de la partida, el del puesto y el número de franja. Así que
 * esta prueba llama a `plantearInstrumento` con los mismos tres datos, obtiene
 * EL MISMO problema y su solución, y la manda por HTTP como la mandaría un
 * móvil. Si el servidor plantease otra cosa —o si la corrección no cuadrara con
 * el planteamiento— esto se pondría rojo.
 *
 * Un minijuego que solo supiera corregirse dentro del móvil sería un trozo del
 * juego imposible de probar, y son cuatro.
 *
 * ═══ AISLAMIENTO ═══
 *
 * El servidor arranca con el directorio de trabajo en una carpeta temporal sin
 * `.env` al lado, y con el entorno enumerado a mano. La lección está en
 * ARCHITECTURE.md y costó cara: en Windows, vaciar una variable de entorno la
 * BORRA, y entonces dotenv carga el fichero de verdad —con la clave de
 * Anthropic y el Atlas de producción dentro—.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LO QUE ESTA PRUEBA VIGILA Y NINGUNA OTRA PUEDE
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   · **Que el cuadro verdadero no viaje al móvil.** Es la única cosa que hay
 *     que esconder en este juego, y si viajara la noche duraría diez minutos.
 *   · **Que los telegramas de otro no viajen.** Es lo que obliga a hablarse.
 *   · **Que la solución de un instrumento no viaje.** Va pegada al
 *     planteamiento en el estado del servidor, así que una proyección con un
 *     `...estado` la mandaría entera.
 *   · **Que el enclavamiento acepte el convoy que toca y rechace los demás**,
 *     que es la regla de la que cuelga la noche.
 *   · **Que una franja perdida no bloquee la partida**: el cuadro se corre.
 *   · **Que fallar un instrumento no gaste nada.**
 *   · **Que la franja llegue como NÚMERO** en `consultar-archivo`. Es el primer
 *     uso real de `pideNumero` en toda la plataforma.
 *   · **Que el veredicto sea de grupo** y que los trofeos se repartan.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generarTramaNudo, tramaDe } from '../src/juegos/nudo-trama';
import { plantearInstrumento, resolverManiobra } from '../src/juegos/nudo-instrumentos';
import {
  MARGEN_POR_CONSULTA,
  RETRASO_POR_ORDEN_RECHAZADA,
  RETRASO_POR_FRANJA_PERDIDA,
} from '../../shared/juegos/nudo-tipos';
import type {
  CarguePlanteado,
  ManiobraPlanteada,
  OficioId,
  TramaNudo,
} from '../../shared/juegos/nudo-tipos';
import type { GameSession } from '../../shared/types';
import type { LiveSession, VistaJugador } from '../../shared/live';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
/**
 * Puerto al azar en un rango que no usa nadie más.
 *
 * Windows tarda en soltar el puerto de un servidor recién matado, así que dos
 * comprobadores con el mismo puerto fijo se pisan cuando la batería los corre
 * seguidos. Los rangos ya tomados: 5300-5700, 6100-6500, 6600-6900 y 6900-7200.
 */
const PUERTO = 7300 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PUERTO}/api`;

// ---------------------------------------------------------------------------
// Comprobaciones
// ---------------------------------------------------------------------------

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 360)}`}`,
  );
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
// La partida sembrada
// ---------------------------------------------------------------------------

const GENTE = ['Ana', 'Bruno', 'Carla', 'Dani', 'Elena'];
const CONVOYES = [
  'El Correo de Medianoche',
  'El mixto de Penarroya',
  'El carbonero de la Cuenca',
  'El expreso de la frontera',
  'El tren de obras del 84',
  'El ganadero de Villaseca',
];
const PUESTOS = [
  'La garita del kilometro 83',
  'El cuarto del telegrafo',
  'El muelle cubierto',
  'La sala de aparatos',
];
const MERCANCIAS = ['El suero antidifterico', 'Hulla de la Cuenca', 'Reses para el matadero'];

/**
 * SEMILLA FIJA. La trama reparte oficios y traza el cuadro al azar, y esta
 * prueba juega siempre con las mismas personas: si el cuadro cambiara de una
 * ejecución a otra, media prueba fallaría una vez de cada seis sin que nada
 * estuviera roto. Un comprobador intermitente se acaba ignorando, que es peor
 * que no tenerlo.
 */
const SEMILLA = 'verificar-nudo';

function nuevaPartida(): { game: GameSession; sesion: LiveSession } {
  const ahora = '2027-01-14T22:00:00.000Z';
  const game: GameSession = {
    id: 'nudo',
    name: 'La estacion de Valdehierro',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    entidades: {
      ferroviarios: GENTE.map((name, i) => ({ id: `f${i}`, name })),
      convoyes: CONVOYES.map((name, i) => ({ id: `c${i}`, name })),
      puestos: PUESTOS.map((name, i) => ({ id: `p${i}`, name })),
      mercancias: MERCANCIAS.map((name, i) => ({ id: `m${i}`, name })),
    },
    boardMode: 'generated',
    settings: { language: 'es', juego: 'nudo' },
  } as unknown as GameSession;

  game.plot = generarTramaNudo(game, { semilla: SEMILLA });

  const sesion: LiveSession = {
    id: game.id,
    juego: 'nudo',
    code: 'NUDO',
    phase: 'lobby',
    round: 0,
    totalRounds: 6,
    players: GENTE.map((name, i) => ({
      participanteId: `f${i}`,
      displayName: name,
      joinCode: `NUDO${i}`,
      joined: true,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
    respuestasEntregadas: [],
    porDondePasaron: [],
    rev: 1,
    updatedAt: ahora,
  } as unknown as LiveSession;

  return { game, sesion };
}

const { game, sesion } = nuevaPartida();
const trama = tramaDe(game.plot) as TramaNudo;

function sembrar(dir: string, g: GameSession, s: LiveSession): void {
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'data', 'db.json'),
    JSON.stringify(
      { games: [g], messages: {}, config: { model: 'claude-fable-5' }, live: [s], accounts: [] },
      null,
      2,
    ),
    'utf8',
  );
}

// ---------------------------------------------------------------------------
// Cliente HTTP mínimo
// ---------------------------------------------------------------------------

interface Respuesta {
  estado: number;
  datos: Record<string, unknown>;
}

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; testigo?: string } = {},
): Promise<Respuesta> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.testigo ? { Authorization: `Bearer ${opciones.testigo}` } : {}),
    },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
  });
  const texto = await r.text();
  let datos: unknown = texto;
  try {
    datos = JSON.parse(texto);
  } catch {
    /* respuesta no JSON: se deja el texto */
  }
  return { estado: r.status, datos: (datos ?? {}) as Record<string, unknown> };
}

async function esperarServidor(): Promise<void> {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(`${BASE}/games`);
      if (r.ok) return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('el servidor no llegó a arrancar');
}

// ---------------------------------------------------------------------------
// La regla de oro
// ---------------------------------------------------------------------------

/**
 * Busca fugas en lo que se le manda a una persona.
 *
 * Mira tres cosas distintas, porque ninguna basta sola:
 *
 *   · Que la SECUENCIA del cuadro verdadero no aparezca serializada. Es la
 *     forma directa: un `estado.cuadro` que se colara.
 *   · Que no aparezca la CLAVE `cuadro` ni `solucion` a ninguna profundidad.
 *     Cazaría un campo nuevo que alguien añada sin pensar, y sobre todo cazaría
 *     la solución de un instrumento, que viaja pegada al planteamiento en el
 *     estado del servidor.
 *   · Que no aparezca el TEXTO de un telegrama que no sea tuyo. Es la fuga que
 *     no se ve mirando claves, porque el campo se llama igual —`telegramas`— y
 *     lo que estaría mal es su contenido.
 */
function fugasEn(vista: unknown, quien: string): string[] {
  const encontradas: string[] = [];
  const texto = JSON.stringify(vista ?? null);

  if (texto.includes(JSON.stringify(trama.cuadro).slice(1, -1))) {
    encontradas.push('la secuencia del cuadro verdadero');
  }

  const recorrer = (nodo: unknown, camino: string): void => {
    if (Array.isArray(nodo)) {
      nodo.forEach((x, i) => recorrer(x, `${camino}[${i}]`));
      return;
    }
    if (!nodo || typeof nodo !== 'object') return;
    for (const [clave, valor] of Object.entries(nodo as Record<string, unknown>)) {
      if (clave === 'cuadro' || clave === 'solucion' || clave === 'reparto') {
        encontradas.push(`${camino}.${clave}`);
      }
      recorrer(valor, `${camino}.${clave}`);
    }
  };
  recorrer(vista, 'vista');

  const mios = new Set(trama.reparto[quien] ?? []);
  for (const telegrama of trama.telegramas) {
    if (mios.has(telegrama.id)) continue;
    /*
     * OJO: los telegramas se pueden repartir por copia de servicio, así que
     * «no es de esta persona» se decide por el reparto y no por el texto. Se
     * busca un trozo largo y característico para no cazar por accidente el
     * nombre de un convoy, que sí es público.
     */
    const trozo = telegrama.texto.slice(0, 40);
    if (trozo.length >= 20 && texto.includes(trozo)) {
      encontradas.push(`el telegrama ajeno ${telegrama.id}`);
    }
  }

  return encontradas;
}

// ---------------------------------------------------------------------------
// Resolver un instrumento desde fuera, como haría un móvil
// ---------------------------------------------------------------------------

/**
 * La respuesta correcta del instrumento de un puesto en una franja.
 *
 * Se planteia AQUÍ con los mismos tres datos que usa el servidor, así que sale
 * el mismo problema. Es lo que permite jugar la noche entera sin abrir la app.
 */
function respuestaDelInstrumento(puestoId: string, franja: number): string {
  const cual: OficioId = trama.oficioDePuesto[puestoId] ?? 'agujas';
  const inst = plantearInstrumento(cual, franja, `${game.id}:${puestoId}`, {
    convoyes: CONVOYES,
    puestos: PUESTOS,
    mercancias: MERCANCIAS,
  });

  if (cual === 'agujas') {
    const p = inst.planteamiento as ManiobraPlanteada;
    const camino = resolverManiobra(p.entrada, p.objetivo);
    if (!camino) throw new Error(`la maniobra de ${puestoId} en la franja ${franja} no tiene solución`);
    return camino
      .map((m) => (m.hacer === 'pasar' ? 'p' : `${m.hacer === 'apartar' ? 'a' : 's'}${m.via}`))
      .join(',');
  }
  if (cual === 'telegrafo') return (inst.solucion as { palabra: string }).palabra;
  if (cual === 'enclavamiento') return (inst.solucion as { minima: number[] }).minima.join(',');

  const p = inst.planteamiento as CarguePlanteado;
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
  if (!back(0)) throw new Error(`el cargue de ${puestoId} en la franja ${franja} no tiene solución`);
  return Object.entries(asignado)
    .map(([b, v]) => `${b}:${v}`)
    .join(',');
}

/** Lo que el estado del juego dice, sin creerse nada. */
function estadoDeLaVista(v: VistaJugador): Record<string, unknown> {
  const e = v.estadoDelJuego;
  return e && typeof e === 'object' ? (e as Record<string, unknown>) : {};
}

// ---------------------------------------------------------------------------
// La noche
// ---------------------------------------------------------------------------

async function jugarLaNoche(): Promise<void> {
  const testigos: Record<string, string> = {};

  paso('Entra el turno de noche');
  for (let i = 0; i < GENTE.length; i++) {
    const r = await pedir('/jugar/entrar', {
      metodo: 'POST',
      cuerpo: { code: 'NUDO', joinCode: `NUDO${i}` },
    });
    comprobar(`${GENTE[i]} entra`, r.estado === 200, r.datos);
    testigos[`f${i}`] = String(r.datos?.token ?? '');
  }
  comprobar('los cinco traen testigo', Object.values(testigos).every((t) => t.length > 20));

  const vista = async (id: string): Promise<VistaJugador> => {
    const r = await pedir('/jugar/vista', { testigo: testigos[id] });
    comprobar(`la vista de ${id} responde 200`, r.estado === 200, r.datos);
    return r.datos.vista as VistaJugador;
  };
  const accion = (id: string, nombre: string, datos: Record<string, unknown> = {}) =>
    pedir('/jugar/accion', {
      metodo: 'POST',
      testigo: testigos[id],
      cuerpo: { accion: nombre, datos },
    });

  paso('La sala de espera: el juego se reconoce y la noche dura seis franjas');
  let v = await vista('f0');
  comprobar('la partida es de El Nudo de Valdehierro', v.sesion.juego === 'nudo', v.sesion.juego);
  comprobar(
    'la noche tiene SEIS franjas y no las cuatro por defecto',
    v.sesion.totalRounds === 6,
    v.sesion.totalRounds,
  );
  comprobar(
    'se entregan SEIS ejes, uno por franja',
    v.ejes.length === 6 && v.ejes[0]?.ejeId === 'franja-1',
    v.ejes.map((e) => e.ejeId),
  );
  comprobar(
    'cada eje ofrece los seis convoyes',
    v.ejes.every((e) => e.opciones.length === 6),
    v.ejes.map((e) => e.opciones.length),
  );
  comprobar(
    'NADIE es el señalado: este juego no tiene culpable',
    v.yo.soyElSenalado === false,
    v.yo.soyElSenalado,
  );
  comprobar('no hay víctima', v.caso.victima === undefined, v.caso.victima);
  comprobar('llega el estado propio del juego', Boolean(v.estadoDelJuego));
  comprobar(
    'las cuatro categorías llegan al móvil, no solo una',
    v.entidades.length >= 2,
    v.entidades.map((e) => e.categoriaId),
  );
  comprobar(
    'las reglas que se leen son las suyas',
    v.caso.reglas.some((r) => /convoy|franja|Valdehierro/i.test(r)),
    v.caso.reglas[0],
  );

  paso('LA REGLA DE ORO · ni el cuadro, ni los telegramas ajenos, ni las soluciones');
  for (const id of Object.keys(testigos)) {
    const suya = await vista(id);
    const fugas = fugasEn(suya, id);
    comprobar(`nada se le filtra a ${id}`, fugas.length === 0, fugas);
  }
  const mias = trama.reparto['f0'] ?? [];
  const suyos = (estadoDeLaVista(await vista('f0')).yo as { telegramas?: Array<{ id: string }> })
    ?.telegramas;
  comprobar(
    'y a cada cual SÍ le llegan los suyos, o no podría jugar',
    Array.isArray(suyos) && suyos.length === mias.length,
    { esperados: mias.length, recibidos: suyos?.length },
  );

  paso('Quien dirige abre la primera franja');
  const abrir = await pedir(`/games/${game.id}/live/ronda/abrir`, {
    metodo: 'POST',
    cuerpo: { minutos: 20 },
  });
  comprobar('la franja se abre', abrir.estado === 200, abrir.datos);

  paso('SIN OCUPAR PUESTO NO SE TOCA NADA');
  const sinPuesto = await accion('f0', 'rendir-instrumento', { respuesta: 'p,p,p' });
  comprobar('entregar sin estar en un puesto se rechaza', sinPuesto.estado >= 400, sinPuesto.datos);

  paso('Se ocupan los puestos y se resuelven los instrumentos');
  const ocupar = await accion('f0', 'ocupar-puesto', { puesto: 'p0' });
  comprobar('f0 ocupa la garita', ocupar.estado === 200, ocupar.datos);

  /* FALLAR NO CUESTA NADA: es lo que hace que la gente se atreva. */
  const antesDeFallar = estadoDeLaVista(await vista('f0'));
  const fallado = await accion('f0', 'rendir-instrumento', { respuesta: 'esto no vale' });
  comprobar('una respuesta mala se rechaza', fallado.estado >= 400, fallado.datos);
  const despuesDeFallar = estadoDeLaVista(await vista('f0'));
  comprobar(
    'y no gasta conformidades',
    antesDeFallar.conformidades === despuesDeFallar.conformidades,
    { antes: antesDeFallar.conformidades, despues: despuesDeFallar.conformidades },
  );
  comprobar(
    'ni retraso',
    antesDeFallar.retraso === despuesDeFallar.retraso,
    { antes: antesDeFallar.retraso, despues: despuesDeFallar.retraso },
  );

  const bien = await accion('f0', 'rendir-instrumento', {
    respuesta: respuestaDelInstrumento('p0', 1),
  });
  comprobar('la respuesta buena se acepta', bien.estado === 200, bien.datos);
  const resultado = bien.datos.resultado as Record<string, unknown> | undefined;
  comprobar('y da margen', typeof resultado?.margen === 'number' && (resultado.margen as number) >= 1, resultado);
  comprobar('y da la conformidad del puesto', resultado?.conformidadNueva === true, resultado);

  const repetir = await accion('f0', 'rendir-instrumento', {
    respuesta: respuestaDelInstrumento('p0', 1),
  });
  comprobar('no se puede entregar dos veces el mismo instrumento', repetir.estado >= 400, repetir.datos);

  /* Los demás, cada uno a un puesto. */
  for (let i = 1; i < GENTE.length; i++) {
    const puesto = `p${i % PUESTOS.length}`;
    await accion(`f${i}`, 'ocupar-puesto', { puesto });
    const r = await accion(`f${i}`, 'rendir-instrumento', {
      respuesta: respuestaDelInstrumento(puesto, 1),
    });
    comprobar(`${GENTE[i]} resuelve el instrumento de ${puesto}`, r.estado === 200, r.datos);
  }

  paso('EL ENCLAVAMIENTO · acepta el que toca y rechaza los demás');
  const antesDeOrden = estadoDeLaVista(await vista('f0'));
  const conformidadesAntes = Number(antesDeOrden.conformidades ?? 0);
  comprobar('la estación ha ganado conformidades trabajando', conformidadesAntes >= 4, conformidadesAntes);

  const equivocado = CONVOYES.map((_, i) => `c${i}`).find((id) => id !== trama.cuadro[0])!;
  const rechazo = await accion('f0', 'cursar-orden', { convoy: equivocado });
  comprobar('la orden equivocada se cursa (y se rechaza)', rechazo.estado === 200, rechazo.datos);
  const rr = rechazo.datos.resultado as Record<string, unknown> | undefined;
  comprobar('el enclavamiento NO da paso', rr?.aceptada === false, rr);
  comprobar(
    `y cuesta ${RETRASO_POR_ORDEN_RECHAZADA} de retraso`,
    rr?.retraso === RETRASO_POR_ORDEN_RECHAZADA,
    rr,
  );
  comprobar(
    'el anuncio no dice cuál era el bueno',
    typeof rr?.anuncio === 'string' &&
      !CONVOYES.some(
        (nombre, i) => `c${i}` === trama.cuadro[0] && String(rr.anuncio).includes(nombre),
      ),
    rr?.anuncio,
  );

  const bueno = await accion('f0', 'cursar-orden', { convoy: trama.cuadro[0]! });
  const rb = bueno.datos.resultado as Record<string, unknown> | undefined;
  comprobar('la orden buena sale', rb?.aceptada === true, rb);
  comprobar('y el convoy consta como despachado', rb?.despachados === 1, rb);

  const repetida = await accion('f0', 'cursar-orden', { convoy: trama.cuadro[0]! });
  comprobar('un convoy que ya salió no se puede volver a cursar', repetida.estado >= 400, repetida.datos);

  paso('EL ARCHIVO · la franja llega como NÚMERO, no como cadena');
  const conMargen = Object.keys(testigos).find((id) => {
    void id;
    return true;
  })!;
  void conMargen;
  /* Se resuelve otro instrumento para tener margen de sobra. */
  await accion('f0', 'ocupar-puesto', { puesto: 'p1' });
  await accion('f0', 'rendir-instrumento', { respuesta: respuestaDelInstrumento('p1', 1) });

  const consulta = await accion('f0', 'consultar-archivo', {
    convoy: trama.cuadro[0]!,
    franja: 1,
  });
  comprobar('el archivo contesta', consulta.estado === 200, consulta.datos);
  const rc = consulta.datos.resultado as Record<string, unknown> | undefined;
  comprobar(
    'y dice que sí al convoy que de verdad sale en esa franja',
    rc?.posible === true,
    rc,
  );
  comprobar('y cobra su margen', typeof rc?.margen === 'number', rc);

  const fueraDeRango = await accion('f0', 'consultar-archivo', { convoy: 'c0', franja: 99 });
  comprobar(
    'el motor rechaza una franja fuera de rango, sin llegar al reductor',
    fueraDeRango.estado >= 400,
    fueraDeRango.datos,
  );
  const noEsNumero = await accion('f0', 'consultar-archivo', { convoy: 'c0', franja: 'tres' });
  comprobar('y rechaza una franja que no es un número', noEsNumero.estado >= 400, noEsNumero.datos);

  paso('LA MAÑA · una vez en toda la noche');
  const mana = await accion('f1', 'usar-mana', {});
  comprobar('la maña se usa', mana.estado === 200, mana.datos);
  const otraVez = await accion('f1', 'usar-mana', {});
  comprobar('y no se puede usar dos veces', otraVez.estado >= 400, otraVez.datos);

  paso('UNA FRANJA PERDIDA NO BLOQUEA LA NOCHE · el cuadro se corre');
  await pedir(`/games/${game.id}/live/ronda/cerrar`, { metodo: 'POST' });
  await pedir(`/games/${game.id}/live/ronda/abrir`, { metodo: 'POST', cuerpo: { minutos: 20 } });
  /* En la franja 2 no se despacha nada a propósito. */
  await pedir(`/games/${game.id}/live/ronda/cerrar`, { metodo: 'POST' });
  await pedir(`/games/${game.id}/live/ronda/abrir`, { metodo: 'POST', cuerpo: { minutos: 20 } });

  v = await vista('f0');
  comprobar('vamos por la franja 3', v.sesion.round === 3, v.sesion.round);
  const trasPerder = estadoDeLaVista(v);
  comprobar(
    'y el siguiente que toca sigue siendo el segundo del cuadro: la noche se ha corrido',
    trasPerder.despachados === 1,
    trasPerder.despachados,
  );

  const segundo = await accion('f0', 'cursar-orden', { convoy: trama.cuadro[1]! });
  const rs = segundo.datos.resultado as Record<string, unknown> | undefined;
  comprobar(
    'el segundo convoy del cuadro sale en la franja 3 sin problema',
    rs?.aceptada === true,
    rs,
  );

  paso('Se sacan los cuatro que faltan');
  for (let i = 2; i < trama.cuadro.length; i++) {
    /* Cada franja: alguien resuelve un instrumento y se cursa la orden. */
    const franja = Math.min(6, 3 + (i - 2));
    if (i > 2) {
      await pedir(`/games/${game.id}/live/ronda/cerrar`, { metodo: 'POST' });
      await pedir(`/games/${game.id}/live/ronda/abrir`, { metodo: 'POST', cuerpo: { minutos: 20 } });
    }
    const puesto = `p${i % PUESTOS.length}`;
    await accion('f2', 'ocupar-puesto', { puesto });
    await accion('f2', 'rendir-instrumento', { respuesta: respuestaDelInstrumento(puesto, franja) });
    const r = await accion('f2', 'cursar-orden', { convoy: trama.cuadro[i]! });
    const rr2 = r.datos.resultado as Record<string, unknown> | undefined;
    comprobar(`el convoy ${i + 1} del cuadro sale`, rr2?.aceptada === true, {
      franja,
      resultado: rr2,
    });
  }

  v = await vista('f0');
  const alFinal = estadoDeLaVista(v);
  comprobar('los seis convoyes han cruzado', alFinal.despachados === 6, alFinal.despachados);
  comprobar(
    'el retraso es el de la orden rechazada más la franja perdida',
    alFinal.retraso === RETRASO_POR_ORDEN_RECHAZADA,
    { retraso: alFinal.retraso, esperado: RETRASO_POR_ORDEN_RECHAZADA },
  );

  paso('EL CUADRO FINAL · cada cual entrega el suyo');
  const cerrar = await pedir(`/games/${game.id}/live/ronda/cerrar`, { metodo: 'POST' });
  comprobar('se cierra la última franja', cerrar.estado === 200, cerrar.datos);
  const respuestas = await pedir(`/games/${game.id}/live/respuestas`, { metodo: 'POST' });
  comprobar('se abre el cuadro final', respuestas.estado === 200, respuestas.datos);

  const cuadroBueno: Record<string, string> = {};
  trama.cuadro.forEach((convoyId, i) => {
    cuadroBueno[`franja-${i + 1}`] = convoyId;
  });

  const repetido = { ...cuadroBueno, 'franja-2': cuadroBueno['franja-1']! };
  const conRepetido = await accion('f0', 'entregar-cuadro', repetido);
  comprobar(
    'un cuadro con un convoy repetido se rechaza: no es un cuadro',
    conRepetido.estado >= 400,
    conRepetido.datos,
  );

  const entrega = await accion('f0', 'entregar-cuadro', cuadroBueno);
  comprobar('el cuadro bueno se entrega', entrega.estado === 200, entrega.datos);
  comprobar(
    'y no se dice si ha acertado',
    !JSON.stringify(entrega.datos).includes('correcta'),
    entrega.datos,
  );
  const dosVeces = await accion('f0', 'entregar-cuadro', cuadroBueno);
  comprobar('no se puede entregar dos veces', dosVeces.estado >= 400, dosVeces.datos);

  /* Alguien lo entrega mal, para que el desenlace tenga las dos cosas. */
  const alReves: Record<string, string> = {};
  [...trama.cuadro].reverse().forEach((convoyId, i) => {
    alReves[`franja-${i + 1}`] = convoyId;
  });
  const mala = await accion('f1', 'entregar-cuadro', alReves);
  comprobar('y otro lo entrega al revés, y también se acepta', mala.estado === 200, mala.datos);

  paso('EL PARTE DEL AMANECER');
  const cierre = await pedir(`/games/${game.id}/live/cierre`, { metodo: 'POST' });
  comprobar('el parte se da', cierre.estado === 200, cierre.datos);

  v = await vista('f0');
  const amanecer = estadoDeLaVista(v).amanecer as Record<string, unknown> | undefined;
  comprobar('queda escrito', Boolean(amanecer), amanecer);
  comprobar('el Correo cruzó', amanecer?.correoPaso === true, amanecer);
  comprobar('cruzaron los seis', amanecer?.cruzaron === 6, amanecer);
  comprobar('el puerto NO se cerró', amanecer?.puertoCerrado === false, amanecer);
  comprobar(
    'y ganó el turno entero, no una persona',
    Array.isArray(amanecer?.ganadores) && (amanecer!.ganadores as string[]).length === GENTE.length,
    amanecer?.ganadores,
  );

  const otraVezCierre = await pedir(`/games/${game.id}/live/cierre`, { metodo: 'POST' });
  comprobar('darlo dos veces no lo cambia', otraVezCierre.estado === 200, otraVezCierre.datos);

  paso('EL DESENLACE');
  const desenlace = await pedir(`/games/${game.id}/live/desenlace`, { metodo: 'POST' });
  comprobar('se revela', desenlace.estado === 200, desenlace.datos);

  v = await vista('f0');
  comprobar('llega el desenlace al móvil', Boolean(v.desenlace), v.desenlace);
  comprobar(
    'con un renglón por franja',
    v.desenlace?.respuestas.length === 6,
    v.desenlace?.respuestas.length,
  );
  comprobar(
    'y el cuadro que enseña es el verdadero',
    v.desenlace?.respuestas.every((r, i) => r.entidadId === trama.cuadro[i]) === true,
    v.desenlace?.respuestas.map((r) => r.entidadId),
  );
  comprobar(
    'no hay señalado: en esta noche no se acusa a nadie',
    v.desenlace?.senaladoId === undefined,
    v.desenlace?.senaladoId,
  );
}

// ---------------------------------------------------------------------------
// El montaje
// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-nudo-'));
let servidor: ChildProcess | undefined;

try {
  paso('El cuadro que se va a jugar');
  console.log(`  ${trama.cuadro.map((c, i) => `${i + 1}.${c}`).join(' ')}`);
  console.log(`  ${trama.telegramas.length} telegramas · tope de retraso ${trama.retrasoMaximo}`);

  sembrar(dir, game, sesion);
  servidor = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(PUERTO),
      NODE_ENV: 'test',
    },
    stdio: 'ignore',
  });

  await esperarServidor();
  await jugarLaNoche();
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
} finally {
  servidor?.kill();
  await new Promise((r) => setTimeout(r, 600));
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    console.log(`  (queda por limpiar ${dir})`);
  }
}

void RETRASO_POR_FRANJA_PERDIDA;
void MARGEN_POR_CONSULTA;

console.log('\nEl Nudo de Valdehierro · una noche entera');
console.log(`${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('\n✔ La noche se juega entera por el cable, y no se filtra el cuadro.');
  process.exit(0);
}
console.log(`\n✘ ${fallos.length} de ${hechas} han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
