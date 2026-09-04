/**
 * LO QUE EL TABLERO EN TRES DIMENSIONES TIENE QUE MARCAR, SEGÚN LAS REGLAS DE RIBERAS.
 *
 * ═══ QUÉ PROBLEMA RESUELVE, QUE SE VEÍA EN PANTALLA ═══
 *
 * Al arrastrar cualquier modelo —casa, castillo o puente— el tablero marcaba lo mismo:
 * todos los vértices libres. Para la casa colaba; para lo demás era mentira. El castillo
 * ofrecía plantarse en mitad del campo cuando sólo puede subir sobre un poblado PROPIO, y
 * la casa se ofrecía pegada a otra casa cuando tiene que haber dos aristas de por medio y
 * un camino propio que llegue.
 *
 * Y la escena no tenía la culpa. `escenas/sitios.ts` dice por escrito que la legalidad
 * llega de fuera y que la escena no opina; hacía exactamente eso, pintar la lista que le
 * daban. Quien inventaba reglas era el banco de pruebas.
 *
 * ═══ NO HAY NI UNA REGLA NUEVA AQUÍ, Y ES EL PUNTO ═══
 *
 * Las tres reglas que faltaban ya estaban escritas y probadas en `riberas.ts`:
 *
 *   · la distancia — `libreYSeparado` mira el vértice y sus tres vecinos, y mira las
 *     piezas de CUALQUIERA, no sólo las propias;
 *   · el camino propio — `cuelgaDeUnaVereda`, y sólo fuera de la colocación inicial,
 *     que es cuando el catán tampoco lo exige;
 *   · la ciudad sobre poblado propio — las opciones de torre no recorren el tablero:
 *     recorren `mio.chozas`, así que no pueden salir de ahí.
 *
 * Este fichero no las reescribe: llama a `opcionesDeRiberas` —la MISMA lista que el
 * reductor exige por su portillo antes de aceptar nada— y la reparte por piezas. Si
 * alguna regla cambia, cambia en un sitio y esto la sigue sin enterarse.
 *
 * Reescribirlas aquí habría sido rapidísimo y habría creado la peor clase de fallo: dos
 * jueces que casi siempre coinciden. El día que discrepen, el tablero ofrece algo que el
 * servidor rechaza, y el jugador ve un anillo verde que no hace nada.
 *
 * ═══ POR QUÉ VIVE EN `shared/` Y NO EN `escenas/` ═══
 *
 * Porque `escenas/` no puede saber que existe el catán. Hoy sólo importa geometría
 * —`shared/mecanicas/malla-hexagonal`— y ni una regla; el día que importara `riberas.ts`,
 * la escena tendría opinión sobre lo legal y podría discrepar del servidor. Aquí la
 * frontera se mantiene: esto habla de Riberas por un lado y devuelve llaves y cadenas por
 * el otro, y quien las junta es el cliente.
 */
import type { CartaEnLaMano } from '../../../escenas/baraja';
import type { ColorDeJugador, DeltaEn3D } from '../../../escenas/tipos';
import type { LlaveDeArista, LlaveDeVertice } from '../../mecanicas/malla-hexagonal';
import { claseDeLlave } from '../../mecanicas/malla-hexagonal';
import type { Opcion } from '../opciones';
import { ALZAR, bienDeLaFicha, FUNDAR, opcionesDeRiberas } from './riberas';

/*
 * ═══ POR QUÉ ESTE FICHERO IMPORTA TIPOS DE `escenas/` Y NO AL REVÉS ═══
 *
 * Sólo TIPOS, con `import type`, que se borra al compilar: no queda ni una dependencia en
 * ejecución. `escenas/tipos.ts` es EL CONTRATO del tablero en tres dimensiones —dice él
 * mismo que es un dato llano, sin `three` y sin React, para que lo pueda leer un
 * comprobador de Node— y `escenas/baraja.ts` es el de la mano.
 *
 * Declararlos otra vez aquí sería duplicar un contrato, que es la forma más fácil de que
 * dos mitades dejen de encajar sin que nadie lo note. La dirección de la flecha importa
 * menos que el hecho de que haya UNA sola definición.
 */

/**
 * QUÉ SE PUEDE LEVANTAR. Son las tres piezas de Riberas, dichas con sus nombres.
 *
 * No se traducen a «casa / castillo / puente»: esos son los nombres del MODELO, y viven
 * en la barra del cliente. Mezclar el vocabulario de las reglas con el del arte es cómo
 * se acaba con una regla que depende de qué `.glb` esté cargado.
 */
export type PiezaDeObra = 'choza' | 'torre' | 'vereda';

export const PIEZAS_DE_OBRA: readonly PiezaDeObra[] = ['choza', 'torre', 'vereda'];

/**
 * UN SITIO DONDE SE PUEDE CONSTRUIR, con el movimiento que hay que mandar ya montado.
 *
 * ═══ POR QUÉ VIAJA EL MOVIMIENTO Y NO SÓLO LA LLAVE ═══
 *
 * Porque si sólo viajara la llave, quien recibe el clic tendría que volver a montar el
 * movimiento —`{ tipo: ALZAR, carga: { que: 'torre', donde } }`— y entonces la forma del
 * movimiento estaría escrita en DOS sitios: aquí, al ofrecerlo, y allí, al mandarlo. Es
 * la misma duplicación que ya causó que el banco construyera un poblado agarrases lo que
 * agarrases: el sitio que montaba el movimiento no miraba la pieza.
 *
 * Viajando entero, el cliente no monta nada: recoge y manda. No puede equivocarse de
 * pieza porque no elige la pieza.
 */
export interface SitioDeObra {
  /** La llave del vértice o de la arista. Su prefijo dice cuál de las dos es. */
  llave: string;
  /** Lo que hay que mandar al reductor si se suelta aquí. Ya montado, tal cual. */
  movimiento: { tipo: string; carga: Record<string, unknown> };
}

/** Lo que se puede construir con esta pieza ahora mismo, y dónde. */
export interface ObraPosible {
  pieza: PiezaDeObra;
  /** Deducida de las llaves, nunca escrita a mano. `null` si no hay ni un sitio. */
  clase: 'vertice' | 'arista' | null;
  sitios: readonly SitioDeObra[];
}

/**
 * DE QUÉ PIEZA HABLA ESTA OPCIÓN, si es que habla de construir.
 *
 * Se mira el TIPO y la CARGA, nunca el `id`. El `id` es texto para las listas —
 * `fundar:v:...`, `torre:v:...`— y cambiarlo es una decisión de presentación que nadie
 * espera que rompa nada. Colgar de él la interpretación de un movimiento sería atar las
 * reglas a un rótulo.
 */
function piezaDeLaOpcion(opcion: Opcion): { pieza: PiezaDeObra; llave: string } | null {
  const carga = opcion.carga as Record<string, unknown>;
  if (opcion.tipo === FUNDAR) {
    const vertice = carga['vertice'];
    return typeof vertice === 'string' ? { pieza: 'choza', llave: vertice } : null;
  }
  if (opcion.tipo === ALZAR) {
    const que = carga['que'];
    const donde = carga['donde'];
    if (typeof donde !== 'string') return null;
    if (que === 'torre') return { pieza: 'torre', llave: donde };
    if (que === 'vereda') return { pieza: 'vereda', llave: donde };
  }
  return null;
}

/**
 * DÓNDE PUEDE ESTE ASIENTO LEVANTAR ESTA PIEZA, ahora mismo.
 *
 * Sale vacío muy a menudo y eso es correcto, no un fallo: no es tu turno, no has tirado,
 * no te llegan los bienes, se te acabaron las piezas, o —el caso que más se ve— estás en
 * la colocación inicial, donde la torre no existe todavía. Una lista vacía es la respuesta
 * honrada a «aquí no puedes poner esto», y es lo que apaga la pieza en la barra.
 */
export function obraPosible(vista: unknown, quien: string, pieza: PiezaDeObra): ObraPosible {
  const sitios: SitioDeObra[] = [];
  for (const opcion of opcionesDeRiberas(vista, quien)) {
    const cual = piezaDeLaOpcion(opcion);
    if (cual === null || cual.pieza !== pieza) continue;
    sitios.push({
      llave: cual.llave,
      movimiento: { tipo: opcion.tipo, carga: opcion.carga as Record<string, unknown> },
    });
  }
  /*
   * LA CLASE SALE DE LAS LLAVES, y se exige que TODAS digan lo mismo.
   *
   * Una lista con un vértice y una arista dentro no es una lista con dos clases: es un
   * fallo, y devolver la clase de la primera llave lo escondería. Aquí no puede pasar
   * —cada pieza sale de un solo tipo de opción— y por eso mismo esto es barato: es la
   * afirmación de que sigue sin poder pasar.
   */
  const clases = new Set(sitios.map((s) => claseDeLlave(s.llave)));
  const clase = clases.size === 1 ? ([...clases][0] ?? null) : null;
  return { pieza, clase, sitios };
}

/** Todo lo que se puede levantar ahora, pieza por pieza. Para pintar la barra entera. */
export function obrasPosibles(vista: unknown, quien: string): readonly ObraPosible[] {
  return PIEZAS_DE_OBRA.map((p) => obraPosible(vista, quien, p));
}

/**
 * UNA VISTA DE MENTIRA PARA PROBAR EL TABLERO, con las reglas de verdad.
 *
 * ═══ POR QUÉ ESTO NO ES HACER TRAMPA ═══
 *
 * Porque lo que se finge es el ESTADO —qué hay construido, de quién, cuántos bienes
 * tengo—, no las REGLAS. La vista que sale de aquí tiene la misma forma que la que manda
 * el servidor, y quien la interroga es `opcionesDeRiberas`, la de verdad. Un banco de
 * pruebas que fingiera las reglas no probaría nada: es justo lo que hacía antes.
 *
 * El almacén se llena a propósito. En el banco interesa ver DÓNDE se puede construir, no
 * si llegan los bienes; con el almacén vacío todas las listas saldrían vacías y no se
 * podría mirar nada. Y es una mentira que no cambia lo que se mira: el coste no mueve un
 * anillo de sitio, sólo apaga la pieza entera.
 */
export interface ColonoDePrueba {
  asiento: string;
  color: string;
  chozas: readonly LlaveDeVertice[];
  torres: readonly LlaveDeVertice[];
  veredas: readonly LlaveDeArista[];
}

export function vistaDePrueba(
  hexes: readonly { q: number; r: number }[],
  colonos: readonly ColonoDePrueba[],
  quien: string,
): unknown {
  return {
    desde: 'riberas',
    momento: 'jugando',
    colonos: colonos.map((c) => ({
      asiento: c.asiento,
      nombre: c.asiento,
      color: c.color,
      bienes: 20,
      chozas: [...c.chozas],
      torres: [...c.torres],
      veredas: [...c.veredas],
      puntos: 0,
      vado: 0,
    })),
    /*
     * El terreno y el número no entran en ninguna regla de construcción: las opciones
     * sólo leen `islas.map(i => i.hex)` para saber qué vértices y qué aristas existen.
     * Se rellenan con algo válido para que la vista tenga la forma que declara su tipo.
     */
    islas: hexes.map((h) => ({ hex: { q: h.q, r: h.r }, terreno: 'vega', numero: 6 })),
    turnoDe: quien,
    paso: 0,
    faltaVereda: false,
    ultimaChoza: null,
    tirado: true,
    ultimaTirada: 6,
    tratos: [],
    misFichas: fichasDeSobra(),
    ganadores: [],
  };
}

/** Un almacén con de todo y de sobra, para que el coste no tape lo que se quiere mirar. */
function fichasDeSobra(): string[] {
  const fichas: string[] = [];
  /*
   * El bien va DESPUÉS de los dos puntos, que es como `bienDeLaFicha` lo lee. Escrito al
   * revés la ficha no es de ningún bien y el almacén sale vacío sin decirlo: todas las
   * listas saldrían vacías y parecería que las reglas no dejan construir nada.
   */
  for (const bien of ['limo', 'junco', 'sal', 'piedra', 'grano']) {
    for (let i = 0; i < 8; i++) fichas.push(`p${String(i)}:${bien}`);
  }
  return fichas;
}

// ---------------------------------------------------------------------------
// DE LA VISTA AL TABLERO: lo que la pantalla del juego necesita para no interpretar nada
// ---------------------------------------------------------------------------

/**
 * LOS COLORES QUE EL TABLERO EN 3D SABE PINTAR, y son CUATRO.
 *
 * ═══ Y RIBERAS ADMITE SEIS COLONOS, QUE ES UN PROBLEMA DE VERDAD ═══
 *
 * Las construcciones de jugador no se tiñen: se elige la pieza del pack que ya viene
 * pintada de ese color, y el atlas de KayKit tiene cuatro columnas de color de jugador.
 * `MANIFIESTO_RIBERAS` admite de dos a seis.
 *
 * Así que una mesa de cinco o seis NO se puede pintar entera hoy, y lo peor que se puede
 * hacer con eso es repartir los colores con un módulo: dos colonos saldrían del mismo
 * color, sobre el mismo tablero, sin un error en ninguna parte — y la partida se vuelve
 * injugable de una forma que nadie sabe explicar.
 *
 * Por eso hay `bastanColores`: quien monte la pantalla PREGUNTA antes, y si no bastan,
 * enseña el tablero plano en vez de uno que miente. Es una respuesta pobre y es honrada.
 * La buena —hornear el color al modelo y teñir al cargar— es otro trabajo.
 */
export const COLORES_EN_3D: readonly ColorDeJugador[] = ['red', 'blue', 'yellow', 'green'];

/** Lo mínimo de la vista que hace falta aquí, sin repetir el tipo entero de Riberas. */
interface ColonoLlano {
  asiento?: unknown;
  chozas?: unknown;
  torres?: unknown;
  veredas?: unknown;
}

function comoVistaLlana(
  vista: unknown,
): { colonos: ColonoLlano[]; islas: unknown[]; misFichas: unknown[] } | null {
  if (typeof vista !== 'object' || vista === null) return null;
  const v = vista as { desde?: unknown; colonos?: unknown; islas?: unknown; misFichas?: unknown };
  if (v.desde !== 'riberas') return null;
  if (!Array.isArray(v.colonos) || !Array.isArray(v.islas)) return null;
  return {
    colonos: v.colonos as ColonoLlano[],
    islas: v.islas as unknown[],
    misFichas: Array.isArray(v.misFichas) ? (v.misFichas as unknown[]) : [],
  };
}

/** Si esta mesa cabe en los colores que el tablero 3D sabe pintar. */
export function bastanColores(vista: unknown): boolean {
  const v = comoVistaLlana(vista);
  return v !== null && v.colonos.length <= COLORES_EN_3D.length;
}

function comoLlaves(x: unknown): string[] {
  return Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * EL TABLERO EN TRES DIMENSIONES A PARTIR DE LA VISTA.
 *
 * ═══ POR QUÉ ESTO NO LO HACE LA PANTALLA ═══
 *
 * Porque entonces cada cliente —la app y el escritorio— tendría su propia lectura de la
 * vista, y dos lecturas de lo mismo acaban divergiendo: una pinta las torres y la otra se
 * olvida, o una reparte los colores por orden de asiento y la otra por orden de lista, y
 * la misma partida se ve distinta en dos aparatos. Aquí se lee UNA vez.
 *
 * ═══ EL COLOR VA POR ORDEN DE ASIENTO, Y NO ES UN DETALLE ═══
 *
 * `colonos` se construye al empezar copiando los asientos en el orden en que se sentaron y
 * ya no cambia, así que el índice ES el jugador. Repartir por otra cosa —por el color que
 * trae la vista, por ejemplo— ataría el tablero 3D a la paleta del tablero plano, que son
 * dos decisiones distintas que hoy coinciden.
 *
 * ═══ Y NO HAY LADRÓN ═══
 *
 * Riberas no lo tiene: su desgracia es el ESTIAJE, que no ocupa una comarca sino que corta
 * la producción del turno. Así que `ladron` sale siempre `null`, y eso no es un hueco por
 * rellenar: es que este juego no tiene esa pieza. Cuando el estiaje quiera verse, será
 * otra cosa y tendrá su propio campo.
 */
export function deltaDeLaVista(vista: unknown): DeltaEn3D | null {
  const v = comoVistaLlana(vista);
  if (v === null) return null;

  const islas = v.islas.flatMap((i) => {
    if (typeof i !== 'object' || i === null) return [];
    const isla = i as { hex?: unknown; terreno?: unknown; numero?: unknown };
    const hex = isla.hex as { q?: unknown; r?: unknown } | undefined;
    if (hex === undefined || typeof hex.q !== 'number' || typeof hex.r !== 'number') return [];
    const numero = typeof isla.numero === 'number' ? isla.numero : 0;
    return [
      {
        hex: { q: hex.q, r: hex.r },
        terreno: typeof isla.terreno === 'string' ? isla.terreno : 'desconocido',
        /* El cero de la duna NO es un número que salga con los dados: es «no rinde». */
        cifra: numero === 0 ? null : numero,
      },
    ];
  });

  const piezas: DeltaEn3D['piezas'][number][] = [];
  const caminos: DeltaEn3D['caminos'][number][] = [];
  v.colonos.forEach((c, i) => {
    const color = COLORES_EN_3D[i];
    if (color === undefined) return;
    for (const vertice of comoLlaves(c.chozas)) {
      piezas.push({ vertice: vertice as LlaveDeVertice, clase: 'poblado', color });
    }
    for (const vertice of comoLlaves(c.torres)) {
      piezas.push({ vertice: vertice as LlaveDeVertice, clase: 'ciudad', color });
    }
    for (const arista of comoLlaves(c.veredas)) {
      caminos.push({ arista: arista as LlaveDeArista, color });
    }
  });

  return { islas, piezas, caminos, ladron: null };
}

/**
 * LA MANO DE QUIEN MIRA, en cartas.
 *
 * ═══ LOS BIENES SALEN CON SUS NOMBRES, SIN TRADUCIR ═══
 *
 * `limo`, `junco`, `sal`, `piedra` y `grano`. Traducirlos aquí a la jerga del catán
 * —madera, ladrillo, lana— sería meter entre el juego y su dibujo una tabla que nadie
 * mantendría; y además el juego se llama Riberas: sus bienes se llaman como se llaman. Lo
 * que tiene que adaptarse es el ARTE, no el vocabulario.
 *
 * (Hoy los iconos de las cartas son provisionales y están dibujados para el vocabulario
 * del catán, así que hasta que llegue el arte propio de Riberas cuatro de los cinco no
 * casan. Está dicho en `arte/game-icons/LEEME.md`, y es una razón más para sustituirlos.)
 *
 * ═══ EL IDENTIFICADOR ES LA FICHA, Y NO SALE DE AQUÍ ═══
 *
 * `misFichas` es MI almacén: la proyección ya se encarga de que el ajeno no viaje. Usar la
 * ficha como identificador da una llave estable —la carta no salta de sitio al repintar—
 * sin inventar un contador que habría que sincronizar. OJO y queda escrito: esto vale para
 * una llave de React, NO para un identificador de opción; ahí un identificador con una
 * ficha dentro publicaría un secreto, y eso lo prohíbe el §5 bis.
 */
export function manoDeLaVista(vista: unknown): CartaEnLaMano[] {
  const v = comoVistaLlana(vista);
  if (v === null) return [];
  return v.misFichas.flatMap((f) => {
    if (typeof f !== 'string') return [];
    const bien = bienDeLaFicha(f);
    return bien === null ? [] : [{ id: f, bien }];
  });
}
