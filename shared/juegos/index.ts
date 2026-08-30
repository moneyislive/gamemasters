/**
 * Los juegos instalados.
 *
 * CATA. Un registro por nombre, que es lo mínimo que hace falta para que
 * «¿de qué juego es esta partida?» tenga respuesta.
 */
import { declararAlmacen } from './entidades';
import { CLUEDO } from './cluedo';
import { MOMIA } from './momia';
import { SOMBRAS } from './sombras';
import type { JuegoId, ManifiestoDeJuego } from './tipos';
import { TROFEOS } from '../live';
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
  declararAlmacen,
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

const INSTALADOS: Record<JuegoId, ManifiestoDeJuego> =
  global_[LLAVE] ?? (global_[LLAVE] = { [CLUEDO.id]: CLUEDO });
INSTALADOS[CLUEDO.id] = CLUEDO;
INSTALADOS[MOMIA.id] = MOMIA;
INSTALADOS[SOMBRAS.id] = SOMBRAS;
anotarAlmacenes(CLUEDO);
anotarAlmacenes(MOMIA);
anotarAlmacenes(SOMBRAS);

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
  INSTALADOS[manifiesto.id] = manifiesto;
  anotarAlmacenes(manifiesto);
}

/**
 * Apunta dónde vive cada categoría de un juego.
 *
 * Va aquí y no en el manifiesto porque el manifiesto es un DATO —una tabla que
 * algún día se leerá de una base de datos— y esto es el efecto de darlo de
 * alta. Registrar un juego es exactamente eso: que la plataforma sepa
 * encontrar sus cosas.
 */
function anotarAlmacenes(manifiesto: ManifiestoDeJuego): void {
  for (const categoria of manifiesto.categorias) {
    if (categoria.almacen) declararAlmacen(categoria.id, categoria.almacen);
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

/** ¿Está instalado este juego aquí? */
export function juegoInstalado(id: JuegoId | undefined): boolean {
  return manifiestoSiExiste(id) !== undefined;
}
