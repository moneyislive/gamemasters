/**
 * UN ARCADE QUE NO ESTÁ EN EL BINARIO, instalado desde disco y JUGADO.
 *
 *   npm run verify:arcade-de-fuera
 *
 * ═══ ESTA ES LA PIEZA DE LEGO DE LA SALA DE ARCADE ═══
 *
 * Es el gemelo de `verificar-juego-de-fuera.ts`, y está calcado a propósito: aquel
 * fichero ya demostró la misma cosa para las veladas y no hacía falta inventar una
 * forma nueva de demostrarla. Se escribe un arcade ENTERO en un `.mjs` dentro de
 * un directorio temporal —fuera del repositorio, sin compilar, sin un solo
 * `import` del servidor—, se arranca el servidor con `ARCADES_EXTERNOS=<esa ruta>`
 * y se juega una partida de dos por HTTP.
 *
 * ═══ QUÉ TIENE DE DIFERENTE «LA ORILLA», EL ARCADE DE PRUEBA ═══
 *
 * Usa TODA la superficie que el §7 promete a un arcade de fuera, y ni una cosa
 * más:
 *
 *   · MANIFIESTO con mueble GENÉRICO (`tablero`). No pide píxeles propios, que es
 *     justo lo que el enchufe no alcanza.
 *   · REDUCTOR puro, con su azar sembrado tomado del enchufe.
 *   · PROYECCIÓN con mano oculta —`secretos: true`— y `loSecreto` al lado. Si
 *     faltara cualquiera de las dos, el servidor NO ARRANCARÍA, y eso también se
 *     comprueba aquí: que las garantías de arranque alcancen a los de fuera y no
 *     sólo a los cuatro de dentro es la mitad del valor de esta prueba.
 *   · `opciones()`, que es el hueco que abre la fase 5. Sin él, un arcade de fuera
 *     no puede tener opciones genéricas y el mueble no tiene qué pintar.
 *   · PUNTUACIÓN, dada de alta por el enchufe. Sin `registrarPuntuacion` la tabla
 *     de cifras era una constante escrita a mano y un arcade de fuera con récord
 *     era imposible por construcción.
 *   · Y RECHAZA CON MOTIVO, que es la factura del «sólo si» pagada en esta misma
 *     fase. Se comprueba que el texto que escribe el juego llega hasta la
 *     respuesta de quien movió.
 *
 * Además nombra a la gente por su nombre, que es el otro hueco de la fase 5: hasta
 * ahora la proyección sólo recibía un identificador de observador y un juego con
 * mesa no podía escribir «le toca a Ana». Que eso lo consiga un arcade de FUERA es
 * la prueba de que el arreglo está en el contrato y no en un mueble de la casa.
 *
 * ═══ Y «EL VADO», QUE ES EL SEGUNDO ARCADE Y EXISTE POR UNA CORRECCIÓN ═══
 *
 * «La Orilla» usa su `opciones()` LLAMÁNDOSE A SÍ MISMA desde su propio
 * `tableroDe()` — que es el mismo rodeo que Riberas hacía en la fase 4, cuando el
 * hueco todavía no existía. Con eso, lo único que quedaba demostrado del hueco era
 * una ida y vuelta por el registro, no un camino que recorriera nadie: la
 * plataforma seguía pintando el dibujo YA RESUELTO que viajaba dentro de la vista.
 *
 * «El Vado» es el caso que el hueco existe para permitir y el que faltaba: registra
 * `opciones()` y NO se resuelve el tablero. Su proyección son dos campos. Si
 * `mesas.ts` dejara de preguntarle al registro qué se puede hacer, su mesa llegaría
 * al móvil con la pantalla vacía y esa mitad del fichero se pondría roja.
 *
 * ═══ Y LA RUTA DE WINDOWS, QUE ES EL FALLO QUE SÓLO SALE AQUÍ ═══
 *
 * `import('C:/…/la-orilla.mjs')` NO funciona: el cargador lee `C:` como un
 * esquema de URL. En Linux la misma línea va bien. O sea que sin `pathToFileURL`
 * esta función pasaría todas las pruebas del servidor de producción y sería
 * imposible probarla en la máquina donde se escribe. Aquí se pasa una ruta
 * absoluta de verdad, la que dé el sistema operativo, precisamente para pisar ese
 * agujero.
 *
 * ═══ LO QUE ESTO NO PRUEBA ═══
 *
 * Que sea seguro. El arcade corre en el mismo proceso y con los mismos permisos
 * que el servidor. Lo único que hay contra eso es `verify:presupuesto`, y su
 * cabecera dice exactamente cuánto vale: impide que un reductor caro entre en el
 * hilo DOS veces, y no puede impedir la primera. Instalar un arcade es una
 * decisión de quien administra la máquina, del mismo orden que instalar un módulo
 * de nginx. No es una tienda abierta.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
const PUERTO = 7300 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PUERTO}/api`;

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 400)}`}`);
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

interface Respuesta {
  estado: number;
  datos: Record<string, unknown>;
}

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; asiento?: string } = {},
): Promise<Respuesta> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.asiento === undefined ? {} : { 'X-Asiento': opciones.asiento }),
    },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
  });
  const texto = await r.text();
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    datos = { crudo: texto };
  }
  return { estado: r.status, datos: (datos ?? {}) as Record<string, unknown> };
}

async function esperarServidor(): Promise<void> {
  for (let i = 0; i < 160; i++) {
    try {
      await fetch(`${BASE}/arcade`);
      return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('el servidor no arrancó');
}

/**
 * EL ARCADE, escrito como lo escribiría alguien de fuera.
 *
 * Un `.mjs` suelto. No importa NADA del servidor ni de `shared/`: todo lo que
 * necesita —el alta, el azar sembrado, la forma de rechazar con motivo, cómo se
 * llama un asiento— le llega en `api`. Eso es exactamente lo que se está probando:
 * si tuviera que importar algo de aquí, no sería una pieza de Lego, sería un
 * parche.
 *
 * «La Orilla» son cinco piedras en fila. En tu turno coges una piedra y te la
 * guardas en la mano, que nadie más ve; quien junte tres, gana. Es
 * deliberadamente pequeño: lo que se prueba no es el juego, es la superficie.
 */
const EL_ARCADE = `
export function instalar(api) {
  const ID = 'la-orilla';
  const PIEDRAS = 5;
  const PARA_GANAR = 3;

  const MANIFIESTO = {
    id: ID,
    nombre: 'La Orilla',
    gancho: 'Cinco piedras en la orilla y dos manos que no se ven.',
    icono: 'mando',
    jugadores: { minimo: 2, maximo: 2 },
    sede: 'servidor',
    tickHz: 0,
    mueble: 'tablero',
    secretos: true,
    marcador: { tipo: 'cifra', rotulo: 'Piedras', sentido: 'mas-alto' },
    procedencia: { tipo: 'creacion-propia' },
  };

  const RECIEN = { momento: 'reuniendo', piedras: [], manos: {}, turno: 0, asientos: [], ganador: null };

  /* El delta de piedras, repartido con el azar que reparte el servidor. */
  function empezar(estado, ctx) {
    if (ctx.asientos.length < MANIFIESTO.jugadores.minimo) return estado;
    const tirada = api.barajar(api.sembrar(ctx.azar), ['gris', 'blanca', 'negra', 'rosa', 'verde']);
    const manos = {};
    for (const a of ctx.asientos) manos[a] = [];
    return {
      momento: 'jugando',
      piedras: tirada.valor.slice(0, PIEDRAS),
      manos,
      turno: 0,
      asientos: [...ctx.asientos],
      ganador: null,
    };
  }

  function avanzar(estado, movimiento, ctx) {
    const actual = estado ?? RECIEN;
    if (api.esTic(movimiento)) return actual;

    if (movimiento.tipo === 'empezar') {
      if (actual.momento !== 'reuniendo') {
        return api.rechazar(actual, 'La orilla ya está repartida.');
      }
      return empezar(actual, ctx);
    }

    if (movimiento.tipo !== 'coger') return actual;
    if (actual.momento !== 'jugando') return api.rechazar(actual, 'Todavía no hay piedras.');

    const mio = actual.asientos[actual.turno % actual.asientos.length];
    if (ctx.quien !== mio) return api.rechazar(actual, 'No es tu turno.');

    const cual = movimiento.carga && movimiento.carga.piedra;
    const donde = actual.piedras.indexOf(cual);
    if (donde < 0) return api.rechazar(actual, 'Esa piedra ya no está en la orilla.');

    const piedras = actual.piedras.slice(0, donde).concat(actual.piedras.slice(donde + 1));
    const manos = { ...actual.manos, [ctx.quien]: [...(actual.manos[ctx.quien] ?? []), cual] };
    const gano = manos[ctx.quien].length >= PARA_GANAR;
    return {
      ...actual,
      piedras,
      manos,
      turno: actual.turno + 1,
      momento: gano || piedras.length === 0 ? 'terminada' : 'jugando',
      ganador: gano ? ctx.quien : null,
    };
  }

  /*
   * LA PROYECCIÓN. Recibe quién está sentado y CÓMO SE LLAMA, que es el hueco que
   * la fase 5 abrió en el contrato: sin el tercer argumento, este juego sólo podría
   * escribir «le toca a aJLFR7ZJ3».
   */
  function proyectar(estado, quien, sentados) {
    const e = estado ?? RECIEN;
    const nombreDe = (a) => (a === null ? 'nadie' : api.comoSeLlama(sentados, a));
    const aQuienLeToca =
      e.momento === 'jugando' && e.asientos.length > 0
        ? e.asientos[e.turno % e.asientos.length]
        : null;

    const base = {
      desde: ID,
      momento: e.momento,
      /* Cuántas tiene cada cual es público; CUÁLES tiene, no. */
      cuentas: e.asientos.map((a) => ({ asiento: a, nombre: nombreDe(a), tiene: (e.manos[a] ?? []).length })),
      piedras: [...e.piedras],
      turnoDe: aQuienLeToca,
      miMano: quien === api.ESPECTADOR ? [] : [...(e.manos[quien] ?? [])],
      ganador: e.ganador,
      nombreDelGanador: e.ganador === null ? '' : nombreDe(e.ganador),
    };

    return { ...base, tablero: tableroDe(base, quien) };
  }

  /* Lo que jamás puede salir en la vista de otro: las piedras de cada mano. */
  function loSecreto(estado) {
    const e = estado ?? RECIEN;
    const fuera = [];
    for (const a of e.asientos) for (const p of e.manos[a] ?? []) fuera.push(a + ':' + p);
    return fuera;
  }

  /*
   * opciones(): recibe LA VISTA y jamás el estado. Es lo que hace que un mueble
   * genérico pueda pintar botones sin saber a qué se juega.
   */
  function opciones(vista, quien) {
    if (vista === null || typeof vista !== 'object') return [];
    if (quien === api.ESPECTADOR) return [];
    if (vista.momento === 'reuniendo') {
      return [{ id: 'empezar', tipo: 'empezar', carga: {}, rotulo: 'Repartir la orilla', ayuda: 'Hacen falta dos.' }];
    }
    if (vista.momento !== 'jugando') return [];
    if (vista.turnoDe !== quien) return [];
    return vista.piedras.map((p) => ({
      id: 'coger:' + p,
      tipo: 'coger',
      carga: { piedra: p },
      rotulo: 'Coger la ' + p,
      ayuda: 'Se queda en tu mano y nadie más la ve.',
    }));
  }

  /* El tablero YA RESUELTO, que es lo que hace genérico al mueble. */
  function tableroDe(v, quien) {
    const ops = opciones(v, quien);
    const aviso =
      v.momento === 'terminada'
        ? (v.nombreDelGanador ? 'Gana ' + v.nombreDelGanador + '.' : 'Se acabaron las piedras.')
        : v.momento === 'reuniendo'
          ? 'La orilla está sin repartir.'
          : 'Turno de ' + (v.cuentas.find((c) => c.asiento === v.turnoDe) || { nombre: 'nadie' }).nombre + '.';
    return {
      vista: { x: 0, y: 0, ancho: 500, alto: 120 },
      caras: [],
      lineas: [],
      nudos: v.piedras.map((p, i) => ({
        id: p,
        punto: { x: 50 + i * 90, y: 60 },
        color: '#5fd4c8',
        radio: 20,
        forma: 'redondo',
        tenue: false,
        toque: (() => {
          const o = ops.find((x) => x.id === 'coger:' + p);
          return o ? { tipo: o.tipo, carga: o.carga } : null;
        })(),
      })),
      acciones: ops
        .filter((o) => o.tipo === 'empezar')
        .map((o) => ({ id: o.id, rotulo: o.rotulo, ayuda: o.ayuda, disponible: true, toque: { tipo: o.tipo, carga: o.carga } })),
      paneles: [
        { titulo: 'La mesa', lineas: v.cuentas.map((c) => c.nombre + ' — ' + c.tiene + ' piedra(s)') },
        { titulo: 'Lo mío', lineas: v.miMano.length === 0 ? ['(nada)'] : v.miMano },
      ],
      aviso,
    };
  }

  api.instalarArcade({
    manifiesto: MANIFIESTO,
    avanzar,
    proyeccion: proyectar,
    loSecreto,
    opciones,
  });

  /* Y cómo se le lee la cifra, que sin el enchufe no se podía dar de alta. */
  api.registrarPuntuacion(ID, (estado) => {
    const e = estado ?? RECIEN;
    if (e.ganador === null) return 0;
    return (e.manos[e.ganador] ?? []).length;
  });

  /*
   * ═══ «EL VADO»: EL ARCADE QUE MIDE SI EL HUECO DE 'opciones()' SIRVE PARA ALGO ═══
   *
   * «La Orilla» de aquí arriba usa 'opciones()' LLAMÁNDOSE A SÍ MISMA desde su
   * propio 'tableroDe()', que es exactamente lo que ya hacía Riberas antes de que
   * el hueco existiera. Con eso, lo único demostrado era una ida y vuelta por el
   * registro —«lo que contesta el registro es lo que contesta el juego»— y NO un
   * camino que recorriera nadie: la plataforma seguía pintando el dibujo ya
   * resuelto que venía dentro de la vista.
   *
   * Éste es el otro caso, que es el que el hueco existe para permitir: un arcade
   * que registra 'opciones()' y NO SE RESUELVE EL TABLERO. Su proyección no trae un
   * 'tablero' por ninguna parte. Antes de esta ronda, una mesa suya llegaba al móvil
   * con la pantalla vacía —«esta vista no trae tablero»— y no había forma de jugarlo;
   * o sea que el hueco existía en la tabla del registro y no cambiaba nada de lo que
   * un arcade de fuera tiene que escribir para poder pintarse.
   *
   * Es deliberadamente absurdo de simple: un número y dos botones. Lo que se mide no
   * es el juego, es que la PLATAFORMA PREGUNTE.
   */
  const VADO = 'el-vado';

  api.instalarArcade({
    manifiesto: {
      id: VADO,
      nombre: 'El Vado',
      gancho: 'Un número y dos botones, y la plataforma pintándolos sola.',
      icono: 'mando',
      jugadores: { minimo: 1, maximo: 2 },
      sede: 'servidor',
      tickHz: 0,
      mueble: 'tablero',
      secretos: false,
      marcador: { tipo: 'ninguno' },
      procedencia: { tipo: 'creacion-propia' },
    },
    avanzar(estado, movimiento, ctx) {
      const actual = estado ?? { cuenta: 0 };
      if (api.esTic(movimiento)) return actual;
      if (ctx.quien === null) return actual;
      if (movimiento.tipo === 'subir') return { cuenta: actual.cuenta + 1 };
      if (movimiento.tipo === 'bajar') {
        if (actual.cuenta === 0) return api.rechazar(actual, 'Ya está en el fondo del vado.');
        return { cuenta: actual.cuenta - 1 };
      }
      return api.rechazar(actual, 'Aquí sólo se sube y se baja.');
    },
    /* SIN 'tablero' dentro. Es lo que hace de éste el caso interesante. */
    proyeccion(estado) {
      const e = estado ?? { cuenta: 0 };
      return { desde: VADO, cuenta: e.cuenta };
    },
    opciones(vista, quien) {
      if (quien === api.ESPECTADOR) return [];
      const arriba = { id: 'subir', tipo: 'subir', carga: {}, rotulo: 'Subir el vado', ayuda: '' };
      if (vista.cuenta === 0) return [arriba];
      return [
        arriba,
        { id: 'bajar', tipo: 'bajar', carga: {}, rotulo: 'Bajar el vado', ayuda: 'Hasta el fondo.' },
      ];
    },
  });
}
`;

// ---------------------------------------------------------------------------

async function jugarElDeFuera(): Promise<void> {
  paso('El arcade de fuera está en el catálogo, y con su mueble genérico');

  const catalogo = await pedir('/arcade');
  const arcades = (catalogo.datos.arcades ?? []) as Array<Record<string, unknown>>;
  const suyo = arcades.find((a) => a.id === 'la-orilla');
  comprobar('el catálogo se lee', catalogo.estado === 200, catalogo.estado);
  comprobar('y trae un arcade que este binario no conocía', suyo !== undefined, arcades.map((a) => a.id));
  if (suyo === undefined) return;
  comprobar('con el mueble genérico que declaró', suyo.mueble === 'tablero', suyo.mueble);
  comprobar('con su cifra declarada', JSON.stringify(suyo.marcador).includes('cifra'), suyo.marcador);
  comprobar('y con su procedencia, que es un campo legal y obligatorio', suyo.procedencia !== undefined);
  /*
   * Y LOS CUATRO DE DENTRO SIGUEN. Un enchufe que sustituyera el reparto en vez de
   * añadirse sería un fallo silencioso: la Sala se vería llena y le faltarían
   * cuatro juegos.
   */
  comprobar('y los de dentro siguen instalados', arcades.length >= 5, arcades.map((a) => a.id));

  paso('Se abre una mesa suya y se sientan dos');

  const abierta = await pedir('/arcade/mesas', {
    metodo: 'POST',
    cuerpo: { arcade: 'la-orilla', nombre: 'Ana', plazoSegundos: 0 },
  });
  comprobar('la mesa se abre', abierta.estado === 201 || abierta.estado === 200, abierta);
  const codigo = String(abierta.datos.codigo ?? '');
  const llaveDeAna = String(abierta.datos.llave ?? '');
  comprobar('y devuelve código y llave', codigo.length > 0 && llaveDeAna.length > 0, {
    codigo,
    llave: llaveDeAna.length,
  });
  if (codigo.length === 0) return;

  const segunda = await pedir(`/arcade/mesas/${codigo}/asientos`, {
    metodo: 'POST',
    cuerpo: { nombre: 'Bruno' },
  });
  comprobar('el segundo se sienta', segunda.estado < 400, segunda);
  const llaveDeBruno = String(segunda.datos.llave ?? '');

  paso('La proyección le pone NOMBRE a la gente, desde fuera del binario');

  const antesDeEmpezar = await pedir(`/arcade/mesas/${codigo}`, { asiento: llaveDeAna });
  const mesa0 = antesDeEmpezar.datos.mesa as Record<string, unknown>;
  comprobar('la mesa se lee', antesDeEmpezar.estado === 200, antesDeEmpezar.estado);
  comprobar(
    'y trae la vista que compuso el arcade de fuera',
    (mesa0.vista as Record<string, unknown>).desde === 'la-orilla',
    mesa0.vista,
  );

  paso('Se juega: `opciones()` manda lo que el mueble pinta, y el juego valida igual');

  let rev = Number(mesa0.rev);
  const mover = async (llave: string, tipo: string, carga?: unknown): Promise<Respuesta> => {
    const r = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      cuerpo: { rev, tipo, carga },
      asiento: llave,
    });
    const m = r.datos.mesa as Record<string, unknown> | undefined;
    if (m !== undefined) rev = Number(m.rev);
    return r;
  };

  const repartida = await mover(llaveDeAna, 'empezar');
  comprobar('se reparte la orilla', repartida.estado === 200, repartida);
  const trasRepartir = repartida.datos.mesa as Record<string, unknown>;
  const vista1 = trasRepartir.vista as Record<string, unknown>;
  comprobar('hay cinco piedras', (vista1.piedras as unknown[]).length === 5, vista1.piedras);
  comprobar(
    'y el aviso del tablero nombra a alguien por su NOMBRE y no por su identificador',
    /Turno de (Ana|Bruno)\./.test(String((vista1.tablero as Record<string, unknown>).aviso)),
    (vista1.tablero as Record<string, unknown>).aviso,
  );
  comprobar(
    'y el panel de la mesa también',
    JSON.stringify((vista1.tablero as Record<string, unknown>).paneles).includes('Ana'),
    (vista1.tablero as Record<string, unknown>).paneles,
  );

  /*
   * ═══ LOS BOTONES SALEN DE `opciones()`, QUE ES EL HUECO DE ESTA FASE ═══
   *
   * El tablero que viaja trae, dentro de cada piedra, EL MOVIMIENTO que manda
   * tocarla. Eso lo compone el juego llamando a su propia `opciones()`, y lo que
   * la fase 5 añade es que la plataforma también pueda preguntárselo — que es lo
   * que hace posible un mueble genérico para un juego que no está en el binario.
   */
  const nudos = ((vista1.tablero as Record<string, unknown>).nudos ?? []) as Array<Record<string, unknown>>;
  const tocables = nudos.filter((n) => n.toque !== null);
  comprobar('las piedras del tablero traen el movimiento dentro', tocables.length === 5, nudos.length);

  paso('El rechazo del reductor llega a la pantalla CON SU MOTIVO');

  /*
   * ═══ LA FACTURA DEL «SÓLO SI», COBRADA DESDE FUERA DEL BINARIO ═══
   *
   * A Bruno no le toca. `opciones()` no le ofrece nada, el reductor lo rechaza —y
   * ahora dice por qué—. Antes de esta fase, lo único que la app podía saber es
   * que la revisión no había subido.
   */
  const revAntes = rev;
  const fueraDeTurno = await mover(llaveDeBruno, 'coger', { piedra: (vista1.piedras as string[])[0] });
  comprobar('la petición se atiende con normalidad', fueraDeTurno.estado === 200, fueraDeTurno.estado);
  const mesaTrasElIntento = fueraDeTurno.datos.mesa as Record<string, unknown>;
  comprobar('y la revisión NO sube: el juego no lo tomó', Number(mesaTrasElIntento.rev) === revAntes, {
    antes: revAntes,
    ahora: mesaTrasElIntento.rev,
  });
  comprobar(
    'pero ahora sí se sabe POR QUÉ, y lo dijo el arcade de fuera',
    mesaTrasElIntento.motivo === 'No es tu turno.',
    mesaTrasElIntento.motivo,
  );

  /* Y un motivo distinto, para que no sea una cadena fija que casualmente cuadra. */
  const otroMotivo = await mover(llaveDeAna, 'coger', { piedra: 'una-que-no-existe' });
  comprobar(
    'y el motivo cambia con el caso',
    (otroMotivo.datos.mesa as Record<string, unknown>).motivo === 'Esa piedra ya no está en la orilla.',
    (otroMotivo.datos.mesa as Record<string, unknown>).motivo,
  );

  paso('La mano de cada cual no viaja al móvil del otro');

  const cogida = (vista1.piedras as string[])[0] as string;
  const conPiedra = await mover(llaveDeAna, 'coger', { piedra: cogida });
  comprobar('a quien le toca sí coge', conPiedra.estado === 200, conPiedra.estado);
  const mesaDeAna = conPiedra.datos.mesa as Record<string, unknown>;
  comprobar(
    'y la ve en su mano',
    ((mesaDeAna.vista as Record<string, unknown>).miMano as string[]).includes(cogida),
    (mesaDeAna.vista as Record<string, unknown>).miMano,
  );

  /*
   * ═══ LA COMPROBACIÓN QUE DE VERDAD CIERRA EL AGUJERO ═══
   *
   * Se lee la mesa CON LA LLAVE DE BRUNO y se busca la piedra de Ana dentro de todo
   * lo que se le manda. Si la proyección de un arcade de fuera fuera la identidad
   * —o si la plataforma la ignorara— la piedra estaría ahí y nadie vería un error.
   * Es la misma prueba que `verify:mesa` le hace a los de dentro, hecha a uno que
   * el binario no conoce.
   */
  const loDeBruno = await pedir(`/arcade/mesas/${codigo}`, { asiento: llaveDeBruno });
  const suMesa = loDeBruno.datos.mesa as Record<string, unknown>;
  const suTexto = JSON.stringify(suMesa.vista);
  comprobar('Bruno lee la mesa', loDeBruno.estado === 200, loDeBruno.estado);
  comprobar('su propia mano está vacía', ((suMesa.vista as Record<string, unknown>).miMano as string[]).length === 0);
  comprobar(
    'y la piedra que cogió Ana NO aparece en nada de lo que se le manda a Bruno',
    !suTexto.includes(`"${cogida}"`),
    { buscada: cogida, en: suTexto.slice(0, 200) },
  );
  comprobar(
    'aunque sí sabe CUÁNTAS tiene, que es público',
    JSON.stringify((suMesa.vista as Record<string, unknown>).cuentas).includes('"tiene":1'),
    (suMesa.vista as Record<string, unknown>).cuentas,
  );

  paso('Y el presupuesto se le aplica igual que a los de dentro');

  const presupuesto = await pedir('/arcade/presupuesto');
  comprobar('los topes están publicados y no son `null`', typeof presupuesto.datos.topeMs === 'number', {
    topeMs: presupuesto.datos.topeMs,
    topeBytes: presupuesto.datos.topeBytes,
  });
  comprobar(
    'el arcade de fuera ha pasado por la báscula',
    JSON.stringify(presupuesto.datos.medidas).includes('la-orilla'),
    presupuesto.datos.medidas,
  );
  comprobar('y nadie está apartado, porque se porta bien', (presupuesto.datos.apartados as unknown[]).length === 0, presupuesto.datos.apartados);
}

/**
 * EL VADO: LA PLATAFORMA PREGUNTA, Y ESO ES TODO LO QUE SE MIDE AQUÍ.
 *
 * ═══ POR QUÉ ESTA SEGUNDA MITAD EXISTE ═══
 *
 * Porque «La Orilla» no demostraba el hueco: se resolvía su propio tablero
 * llamando a su propia `opciones()`, o sea el rodeo que Riberas ya hacía en la
 * fase 4. Lo que la fase 5 dice que compra es que un arcade de fuera pueda decirle
 * a la plataforma «pregúntame», y eso sólo se ve con un juego que NO se resuelva el
 * dibujo. Éste no se lo resuelve: su proyección es `{desde, cuenta}` y nada más.
 *
 * Si `mesas.ts` dejara de preguntarle al registro, todo lo de aquí abajo se pone
 * rojo — que es la diferencia entre un hueco pagado y un hueco anotado.
 */
async function jugarAlVado(): Promise<void> {
  paso('El Vado: un arcade de fuera SIN tablero propio, pintado por la plataforma');

  const abierta = await pedir('/arcade/mesas', {
    metodo: 'POST',
    cuerpo: { arcade: 'el-vado', nombre: 'Carla', plazoSegundos: 0 },
  });
  comprobar('la mesa del Vado se abre', abierta.estado < 400, abierta);
  const codigo = String(abierta.datos.codigo ?? '');
  const llave = String(abierta.datos.llave ?? '');
  if (codigo.length === 0) return;

  const recien = await pedir(`/arcade/mesas/${codigo}`, { asiento: llave });
  const mesa0 = recien.datos.mesa as Record<string, unknown>;
  comprobar('la mesa se lee', recien.estado === 200, recien.estado);
  comprobar(
    'y su vista NO trae tablero: este juego no se dibuja a sí mismo',
    (mesa0.vista as Record<string, unknown>).tablero === undefined,
    mesa0.vista,
  );

  /*
   * ═══ AQUÍ ESTÁ EL HUECO, RECORRIDO ═══
   *
   * Estas opciones no las ha pedido nadie desde el juego: las ha compuesto
   * `mesas.ts` preguntándole al registro por un arcade cuyo código NO está en este
   * binario ni en el del móvil. Es el único sitio donde eso puede ocurrir, porque
   * es el único proceso donde ese código existe.
   */
  const opciones0 = mesa0.opciones as Array<Record<string, unknown>>;
  comprobar('la mesa trae las opciones que dice el juego', Array.isArray(opciones0), mesa0.opciones);
  comprobar(
    'y con la cuenta a cero sólo se puede subir',
    opciones0.length === 1 && opciones0[0]?.id === 'subir',
    opciones0,
  );
  comprobar(
    'con su rótulo tal y como lo escribió el arcade de fuera',
    opciones0[0]?.rotulo === 'Subir el vado',
    opciones0[0],
  );

  /* Y a quien mira SIN asiento no se le ofrece nada, que es lo que el juego dijo. */
  const deEspectador = await pedir(`/arcade/mesas/${codigo}`);
  comprobar(
    'a quien mira sin asiento no se le ofrece nada',
    ((deEspectador.datos.mesa as Record<string, unknown>).opciones as unknown[]).length === 0,
    (deEspectador.datos.mesa as Record<string, unknown>).opciones,
  );

  /*
   * ═══ Y EL RECHAZO EN EL PRIMER MOVIMIENTO DE UNA MESA RECIÉN ABIERTA ═══
   *
   * Éste es el caso que la cabecera de `Rechazo` llama «legítimo y frecuente» y que
   * la capa de mesa castigaba: el reductor hace `estado ?? {cuenta: 0}`, así que al
   * rechazar devuelve un objeto que NO es idénticamente el que recibió —recibió
   * `undefined`—. La mesa lo contaba como un cambio: subía la revisión, metía el
   * movimiento rechazado en el diario y TIRABA el motivo.
   *
   * `verify:arcade-de-fuera` no lo cazaba porque su rechazo iba después de un
   * `empezar` aceptado, con el estado ya hecho. Aquí va el primero de todos.
   */
  const rev0 = Number(mesa0.rev);
  const noOfrecido = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
    metodo: 'POST',
    cuerpo: { rev: rev0, tipo: 'saltar' },
    asiento: llave,
  });
  const trasElIntento = noOfrecido.datos.mesa as Record<string, unknown>;
  comprobar('el movimiento no ofrecido se atiende con normalidad', noOfrecido.estado === 200, noOfrecido);
  comprobar(
    'el PRIMER movimiento de una mesa nueva, rechazado, NO sube la revisión',
    Number(trasElIntento.rev) === rev0,
    { antes: rev0, ahora: trasElIntento.rev },
  );
  comprobar(
    'y trae el motivo que escribió el arcade de fuera',
    trasElIntento.motivo === 'Aquí sólo se sube y se baja.',
    trasElIntento.motivo,
  );

  /* Y la opción que sí se ofrecía se puede jugar mandando lo que la opción lleva dentro. */
  const subida = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
    metodo: 'POST',
    cuerpo: { rev: rev0, tipo: String(opciones0[0]?.tipo), carga: opciones0[0]?.carga },
    asiento: llave,
  });
  const trasSubir = subida.datos.mesa as Record<string, unknown>;
  comprobar('la opción que se ofrecía sí entra', Number(trasSubir.rev) === rev0 + 1, trasSubir.rev);
  comprobar('y la cuenta sube', (trasSubir.vista as Record<string, unknown>).cuenta === 1, trasSubir.vista);
  comprobar(
    'y ahora la plataforma ofrece las dos, sin que nadie se lo haya dicho',
    (trasSubir.opciones as Array<Record<string, unknown>>).map((o) => o.id).join(',') === 'subir,bajar',
    trasSubir.opciones,
  );
}

// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arcade-de-fuera-'));
const rutaDelArcade = path.join(dir, 'la-orilla.mjs');
fs.writeFileSync(rutaDelArcade, EL_ARCADE, 'utf8');
fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
fs.writeFileSync(
  path.join(dir, 'data', 'db.json'),
  JSON.stringify({ games: [], messages: {}, config: {}, live: [], accounts: [] }, null, 2),
  'utf8',
);

let servidor: ChildProcess | undefined;
console.log(`\nUn arcade escrito fuera del repositorio\n  ${rutaDelArcade}`);
/*
 * SE PASA LA RUTA ABSOLUTA TAL Y COMO LA DA EL SISTEMA. En Windows eso es
 * `C:\\Users\\…\\la-orilla.mjs`, que es exactamente lo que `import()` no traga sin
 * `pathToFileURL`. Convertirla aquí a `file://` dejaría la conversión del enchufe
 * sin probar en la única máquina donde el fallo aparece.
 */

try {
  servidor = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(PUERTO),
      NODE_ENV: 'test',
      MESAS_DIR: path.join(dir, 'mesas'),
      // Lo único que hace falta para instalarlo.
      ARCADES_EXTERNOS: rutaDelArcade,
    },
    stdio: 'ignore',
  });
  await esperarServidor();
  await jugarElDeFuera();
  await jugarAlVado();
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  servidor?.kill();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* en Windows a veces el fichero sigue tomado un instante */
  }
}

console.log('');
if (fallos.length === 0) {
  console.log(
    `✔ ${hechas} comprobaciones. Un arcade que la plataforma no conocía se instala desde un fichero\n` +
      '  suelto, sale en el catálogo, abre mesa, esconde la mano de cada cual, y dice POR QUÉ rechaza\n' +
      '  un movimiento. Y el segundo, «El Vado», no se dibuja a sí mismo: la plataforma le pregunta\n' +
      '  qué se puede hacer y pinta eso, que es el hueco de la fase recorrido de verdad.\n' +
      '\n  Lo que esto NO prueba: que sea seguro. Corre en el mismo proceso y con los mismos\n' +
      '  permisos. Ver `verify:presupuesto`, y su cabecera para saber cuánto vale.',
  );
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
