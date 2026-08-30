/**
 * Los juegos instalados.
 *
 * CATA. Un registro por nombre, que es lo mínimo que hace falta para que
 * «¿de qué juego es esta partida?» tenga respuesta.
 */
import { entidadesDe } from './entidades';
import type { Entidad } from './entidades';
import { categoriaDeJugadores, categoriasDeLugar } from './tipos';
import { CLUEDO } from './cluedo';
import { MOMIA } from './momia';
import { SOMBRAS } from './sombras';
import type { CategoriaId, JuegoId, ManifiestoDeJuego } from './tipos';
import { TROFEOS } from '../live';
import type { GameSession } from '../types';
import type { TrofeoInfo } from '../live';

/**
 * Reexportado uno a uno, no con `export *`.
 *
 * Con la estrella, tsx dejaba fuera las ocho funciones de `tipos.ts` en tiempo
 * de EJECUCIÓN mientras el compilador las daba por buenas: los tres paquetes
 * compilaban y el servidor reventaba al arrancar con «does not provide an
 * export named 'aciertos'». Un contrato que se importa desde tres sitios no
 * puede depender de esa sutileza.
 */
export {
  aciertos,
  accionDeAcusacion,
  faseEs,
  fasesConPapel,
  papelDe,
  accionDeEntrarEnLugar,
  categoria,
  categoriaDeJugadores,
  categoriasDeLugar,
  eje,
  ejes,
  ejeDeJugadores,
  esElSenalado,
  respuestaCompleta,
} from './tipos';
export type {
  BloqueDeDosier,
  CategoriaId,
  DefinicionAccion,
  DefinicionCategoria,
  DefinicionDeRonda,
  DefinicionEje,
  AsistenteDeJuego,
  EjeId,
  IconoId,
  PantallaDeApp,
  PestanaDeBarra,
  ReglaDeJuego,
  JuegoId,
  ManifiestoDeJuego,
  ModoDeTurno,
} from './tipos';
export { CLUEDO };
export { MOMIA };
export {
  cumple,
  permutaciones,
  solucionesDe,
  RITOS_DEL_SELLADO,
  MARCAS_PARA_TOCADO,
  AMULETOS_INICIALES,
} from './momia-tipos';
export type {
  DonId,
  EstadoDePersona,
  EstadoMomia,
  Fragmento,
  Restriccion,
  RitoId,
} from './momia-tipos';
export { SOMBRAS };
/*
 * NINGÚN NOMBRE DE AQUÍ CHOCA CON LOS DE LA MOMIA, y no es suerte: este índice
 * es plano, así que el nombre ES el espacio de nombres. `cumple`,
 * `permutaciones` y `solucionesDe` ya estaban cogidos, y un tercer juego que los
 * reutilizara no daría un error evidente — resolvería su rompecabezas con las
 * reglas del ajeno. Por eso los de aquí se llaman `cumpleCondicion`,
 * `variaciones` y `sendasDe`. Está razonado en la cabecera de `sombras-tipos`.
 */
export {
  cumpleCondicion,
  variaciones,
  sendasDe,
  normalizarContrasena,
  rastroMaximoPara,
  TRAMOS_DE_LA_SENDA,
  PRENDAS_INICIALES,
  PRENDAS_RECIBIDAS_MAXIMO,
} from './sombras-tipos';
export type {
  Condicion,
  CondicionEscrita,
  EstadoDeEscolta,
  EstadoSombras,
  Hito,
  PapelId,
  PasoId,
  PorteId,
  TramaSombras,
} from './sombras-tipos';
export {
  entidadesDe,
  entidadDe,
  nombreDeEntidad,
  entidadesDelEje,
  listaDeCategoria,
} from './entidades';
export type { Entidad } from './entidades';

/** Con qué se juega si una partida no dice de qué juego es. */
export const JUEGO_POR_DEFECTO: JuegoId = 'cluedo';

/**
 * El registro, anclado al ámbito global.
 *
 * Podría ser una simple constante de módulo, y lo era. Lo cambió la prueba del
 * segundo juego: registraba «El Legado» y `computeStaleness` seguía viendo solo
 * CLUEDO. La causa es que este fichero se puede cargar DOS VECES —una prueba lo
 * importa como `../../shared/juegos` y `staleness.ts` como `./juegos`, y el
 * cargador las trata como módulos distintos—, con lo que cada copia tenía su
 * propio registro y las altas se perdían por el camino.
 *
 * Con el ámbito global hay uno solo, cargue quien lo cargue y por donde lo
 * cargue. Es la misma cautela que toman las librerías que no admiten dos
 * instancias, y aquí no es teórica: el fallo estaba ocurriendo.
 */
const LLAVE = Symbol.for('gamemasters.juegos.instalados');
const global_ = globalThis as unknown as Record<symbol, Record<JuegoId, ManifiestoDeJuego>>;

const INSTALADOS: Record<JuegoId, ManifiestoDeJuego> = global_[LLAVE] ?? (global_[LLAVE] = {});

/**
 * El reparto de este servidor, si se ha elegido uno. ANCLADO AL AMBITO GLOBAL.
 *
 * ═══ ESTO LO ENCONTRO UNA PRUEBA EN SU PRIMERA EJECUCION ═══
 *
 * El filtro se aplicaba una vez, al final de `juegos/instalados.ts`, y
 * funcionaba —el arranque imprimia «instalados: sombras»— y aun asi el servidor
 * creaba partidas de CLUEDO tan contento.
 *
 * La causa es la que este mismo fichero lleva documentada desde hace tiempo unas
 * lineas mas abajo: ESTE MODULO SE CARGA DOS VECES. Una prueba lo importa como
 * `../../shared/juegos` y `staleness.ts` como `./juegos`, y el cargador las
 * trata como modulos distintos. La tabla se salva porque esta anclada con
 * `Symbol.for`; lo que no se salvaba era el filtro, porque la SEGUNDA carga
 * volvia a ejecutar las tres altas de aqui abajo y las metia otra vez —despues
 * de haberlas quitado—.
 *
 * Asi que el reparto tambien se ancla, y las altas lo respetan. Un juego que no
 * esta en el reparto no entra por ningun camino: ni por la carga inicial, ni por
 * la segunda, ni por `registrarJuego`.
 */
const LLAVE_REPARTO = Symbol.for('gamemasters.juegos.reparto');
const globalReparto = globalThis as unknown as Record<symbol, Set<JuegoId> | undefined>;

function admitido(id: JuegoId): boolean {
  const reparto = globalReparto[LLAVE_REPARTO];
  return reparto === undefined || reparto.has(id);
}

/** Da de alta un manifiesto si el reparto de este servidor lo admite. */
function alta(manifiesto: ManifiestoDeJuego): void {
  if (!admitido(manifiesto.id)) return;
  INSTALADOS[manifiesto.id] = manifiesto;
}

alta(CLUEDO);
alta(MOMIA);
alta(SOMBRAS);

/**
 * Da de alta un juego.
 *
 * Esta función ES la respuesta a «¿podemos meter otro juego?». Un juego nuevo
 * escribe su manifiesto, lo registra aquí, y el motor —fases, proyección,
 * acusación, ganador, desenlace— funciona sin tocar una línea. Lo comprueba
 * `npm run verify:segundo-juego`, que registra uno de dos ejes y juega con él
 * una velada entera.
 */
export function registrarJuego(manifiesto: ManifiestoDeJuego): void {
  alta(manifiesto);
}

/**
 * Deja instalados SOLO estos juegos. Lo llama el servidor al arrancar.
 *
 * ═══ POR QUE ESTO Y NO OTRA COSA ═══
 *
 * El objetivo es que el mismo binario sirva a paises distintos con repartos
 * distintos: aqui se juega a la Momia, alli a las Sombras. Sin esto habria que
 * compilar un servidor por pais, que es justo lo que no escala.
 *
 * Y no hace falta nada mas que esto porque el trabajo pesado ya esta hecho: con
 * un juego fuera de `INSTALADOS`, `manifiestoDe` lanza `JuegoNoInstalado`, el
 * middleware lo traduce a un 409 que dice cuales SI estan, el recibidor del
 * taller no lista sus partidas y el catalogo no le pinta tarjeta. Todo eso ya se
 * comporta bien; lo unico que faltaba era poder decidir la lista.
 *
 * SE LLAMA EN EL ARRANQUE Y NO EN CALIENTE. Quitar un juego con partidas
 * abiertas dejaria a doce personas a media velada con un 409 en el movil, asi
 * que esto no es una perilla que se toque en marcha: es lo que arranca el
 * proceso.
 */
export function instalarSoloEstos(ids: JuegoId[]): void {
  const queridos = new Set(ids);
  /*
   * Se ANOTA el reparto antes de filtrar, y ese orden importa: sin anotarlo, la
   * segunda carga de este modulo volveria a dar de alta lo que se acaba de
   * quitar. Con el anotado, las altas de arriba lo respetan cargue quien cargue.
   */
  globalReparto[LLAVE_REPARTO] = queridos;
  for (const id of Object.keys(INSTALADOS)) {
    if (!queridos.has(id)) delete INSTALADOS[id];
  }
}

/** Todos los juegos instalados, para el catálogo del taller. */
/**
 * Todos los trofeos que puede haber en una vitrina: los de la plataforma más
 * los de cada juego instalado.
 *
 * POR QUÉ HACE FALTA. Los trofeos se guardan en la CUENTA, no en la partida, y
 * la vitrina se mira al día siguiente, sin ninguna partida abierta. Con la
 * lista de la plataforma a secas —los seis de CLUEDO— quien selló una tumba
 * abría su vitrina y no encontraba ni «El Sellador» ni «Ojo de Horus»: los tenía
 * concedidos y guardados, y no se veían en ninguna parte. Un trofeo que no se
 * puede enseñar no es un trofeo.
 *
 * El orden importa para la vitrina: primero los comunes, que los tiene todo el
 * mundo, y detrás los de cada juego.
 */
export function todosLosTrofeos(): TrofeoInfo[] {
  const vistos = new Set<string>();
  const salida: TrofeoInfo[] = [];
  for (const trofeo of [...TROFEOS, ...juegosInstalados().flatMap((m) => m.trofeos)]) {
    if (vistos.has(trofeo.id)) continue;
    vistos.add(trofeo.id);
    salida.push(trofeo);
  }
  return salida;
}

/**
 * Ids de trofeo que dos sitios declaran con contenido DISTINTO. Vacío es lo
 * correcto, y no es una precaución de manual: los ids no llevan prefijo de
 * juego, así que dos juegos pueden usar el mismo sin que nada avise y entonces
 * el trofeo de uno aparecería en la vitrina con el nombre y el glifo del otro.
 *
 * REPETIR EL MISMO NO ES CHOCAR. CLUEDO declara en su manifiesto los seis de la
 * plataforma —los mismos objetos— porque son los suyos. Eso no es una colisión:
 * es la misma cosa nombrada dos veces. Lo que sí lo es: el mismo id con otro
 * nombre detrás.
 */
export function trofeosQueChocan(): string[] {
  const porId = new Map<string, string>();
  const chocan = new Set<string>();
  for (const t of [...TROFEOS, ...juegosInstalados().flatMap((m) => m.trofeos)]) {
    const visto = porId.get(t.id);
    if (visto === undefined) porId.set(t.id, t.nombre);
    else if (visto !== t.nombre) chocan.add(t.id);
  }
  return [...chocan];
}

export function juegosInstalados(): ManifiestoDeJuego[] {
  return Object.values(INSTALADOS);
}

/**
 * Se ha pedido el manifiesto de un juego que este servidor no tiene instalado.
 *
 * No es un error de programación: es la situación normal el día que haya un
 * servidor por país y cada uno instale su reparto. Lo que no es normal es
 * seguir adelante.
 */
export class JuegoNoInstalado extends Error {
  constructor(public readonly juego: JuegoId) {
    super(`«${juego}» no es un juego instalado aquí.`);
    this.name = 'JuegoNoInstalado';
  }
}

/**
 * El manifiesto de un juego. FALLA SI NO ESTÁ INSTALADO.
 *
 * ═══ ANTES DEVOLVÍA CLUEDO Y NO SE ENTERABA NADIE ═══
 *
 * El cuerpo era `INSTALADOS[id ?? JUEGO_POR_DEFECTO] ?? CLUEDO`, y ese `??
 * CLUEDO` colapsaba dos casos que no tienen nada que ver:
 *
 *   · UNA PARTIDA SIN JUEGO DECLARADO. Todas las de antes de existir el campo.
 *     Son CLUEDO de verdad, y caer ahí es correcto — es lo que evitó tener que
 *     migrar la base de datos entera.
 *
 *   · UN JUEGO QUE NO ESTÁ INSTALADO. Aquí caer en CLUEDO significa que la
 *     partida SE JUEGA como CLUEDO: con sus fases, sus acciones, sus
 *     imprimibles y sus trofeos, sobre los datos de otro juego. Sin un solo
 *     error por ninguna parte.
 *
 * Mientras la lista de juegos fue la misma en todas partes, el segundo caso no
 * podía darse y el colapso era inofensivo. Con juegos instalados por servidor
 * pasa a ser el modo de fallo más probable que hay, y de los peores: el que no
 * falla. Una velada entera repartiendo sobres de un asesinato que no ocurre.
 *
 * Y había una consecuencia escondida. `generadores.ts` hace
 * `GENERADORES[manifiestoDe(juego).id]`, así que con un id desconocido siempre
 * encontraba el de CLUEDO — y el bloque «FALLA CERRADO» de `plot/pipeline.ts`,
 * escrito justamente para negarse a generar sin generador, era código muerto
 * que no podía ejecutarse nunca.
 *
 * ═══ CUÁNDO USAR ESTA Y CUÁNDO LA OTRA ═══
 *
 * En el SERVIDOR, esta: si no se sabe a qué se juega, no se juega. Fallar es
 * infinitamente mejor que repartir el material equivocado, y las rutas
 * convierten esto en una respuesta clara.
 *
 * En el TALLER y en el MÓVIL, `manifiestoSiExiste`: allí una excepción durante
 * el pintado es una pantalla en blanco, que no ayuda a nadie. Lo que hay que
 * hacer allí es enseñar que ese juego no está disponible.
 */
export function manifiestoDe(id: JuegoId | undefined): ManifiestoDeJuego {
  const manifiesto = manifiestoSiExiste(id);
  if (!manifiesto) throw new JuegoNoInstalado(id ?? JUEGO_POR_DEFECTO);
  return manifiesto;
}

/**
 * El manifiesto de un juego, o nada si no está instalado.
 *
 * Para quien puede seguir sin saberlo: listar un catálogo, pintar un rótulo,
 * decidir si una partida está caducada, contestar «¿este juego se cierra con un
 * ritual?». Ninguna de esas cosas mejora reventando.
 *
 * `undefined` sigue cayendo en CLUEDO, que es lo que son las partidas de antes
 * del campo.
 */
export function manifiestoSiExiste(id: JuegoId | undefined): ManifiestoDeJuego | undefined {
  return INSTALADOS[id ?? JUEGO_POR_DEFECTO];
}

/**
 * LAS PERSONAS SENTADAS A LA MESA, sean cuales sean para este juego.
 *
 * ═══ POR QUE HACE FALTA ═══
 *
 * El nucleo leia `game.suspects` en treinta y seis sitios: el emparejamiento de
 * los moviles, los dosieres, los correos, la limpieza de fotos, la proyeccion,
 * el asistente. Y `suspects` es un campo heredado de CLUEDO, asi que la
 * categoria de personas de CUALQUIER juego tiene que acabar ahi o nada de eso
 * funciona. Es uno de los peajes que `verify:ajeno` lleva contando desde que
 * existe.
 *
 * Esto pregunta al manifiesto cual es su categoria de personas —la que declara
 * `sonJugadores`— y devuelve sus entidades. Para los tres juegos de hoy es
 * exactamente `game.suspects`, porque los tres declaran `almacen: 'suspects'`.
 * Para el que venga, es donde el diga.
 *
 * Vacio si el juego no tiene categoria de personas. Un juego asi no puede
 * repartir moviles, y es mejor que no reparta ninguno a que reparta los de otra
 * categoria.
 */
export function personasDe(game: GameSession): Entidad[] {
  const manifiesto = manifiestoSiExiste(game.settings?.juego);
  if (!manifiesto) return [];
  const cat = categoriaDeJugadores(manifiesto);
  return cat ? entidadesDe(game, cat.id) : [];
}

/**
 * LOS LUGARES de un juego, sean cuales sean para él.
 *
 * Las salas de una casa, las cámaras de una tumba, los pasos de un camino, las
 * cuevas de un mundo. El núcleo leía `game.rooms` —un campo heredado de
 * CLUEDO— para pintar el plano, colocar las chinchetas y decidir si hay mapa.
 *
 * Un juego puede tener DOS categorías de lugares o ninguna, así que esto
 * devuelve todas juntas y en el orden que las declara el manifiesto. Vacío
 * significa que ese juego no ocupa espacio físico, y entonces no tiene plano ni
 * pestaña de mapa — que es lo correcto y no un caso raro.
 */
export function lugaresDe(game: GameSession): Entidad[] {
  const manifiesto = manifiestoSiExiste(game.settings?.juego);
  if (!manifiesto) return [];
  return categoriasDeLugar(manifiesto).flatMap((c) => entidadesDe(game, c.id));
}

/**
 * TODAS las entidades de una partida, de todas sus categorías.
 *
 * Para quien no necesita saber qué es cada cosa: la limpieza de fotos huérfanas,
 * los recuentos de la ficha del recibidor. Leían los tres campos heredados uno
 * detrás de otro, así que a un juego con una cuarta categoría se le quedaban las
 * fotos sin borrar y el contador corto.
 */
export function todasLasEntidades(game: GameSession): Array<Entidad & { categoria: CategoriaId }> {
  const manifiesto = manifiestoSiExiste(game.settings?.juego);
  if (!manifiesto) return [];
  return manifiesto.categorias.flatMap((c) =>
    entidadesDe(game, c.id).map((e) => ({ ...e, categoria: c.id })),
  );
}

/** Cuántas entidades hay de cada categoría. Para las fichas del recibidor. */
export function recuentoDeEntidades(game: GameSession): Record<CategoriaId, number> {
  const manifiesto = manifiestoSiExiste(game.settings?.juego);
  if (!manifiesto) return {};
  const cuenta: Record<CategoriaId, number> = {};
  for (const c of manifiesto.categorias) cuenta[c.id] = entidadesDe(game, c.id).length;
  return cuenta;
}

/** ¿Está instalado este juego aquí? */
export function juegoInstalado(id: JuegoId | undefined): boolean {
  return manifiestoSiExiste(id) !== undefined;
}
