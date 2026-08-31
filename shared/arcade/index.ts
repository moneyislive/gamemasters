/**
 * LOS ARCADES INSTALADOS. Registro propio, y separado del de veladas.
 *
 * ═══ POR QUÉ NO SE REGISTRAN EN `shared/juegos` ═══
 *
 * Es la tentación más barata de todo el diseño: ya hay un registro que funciona,
 * anclado, probado y con reparto por servidor. Meter aquí los arcades sería una
 * línea.
 *
 * Y el día siguiente, `app/src/vitrina.ts` pintaría los arcades en el carrusel
 * de VELADAS de la portada, porque ese carrusel lee `juegosInstalados()`. Para
 * evitarlo alguien metería un `if (esArcade)` dentro de `veladas()` — que es la
 * primera de las cien banderas que acaban deshaciendo la separación. La segunda
 * la pondría el generador de tramas, que le pediría un `Plot` a un juego de
 * pulsar un botón; la tercera, el paquete imprimible.
 *
 * Dos registros con dos símbolos distintos hacen que esa línea no se pueda
 * escribir por descuido. `verify:fronteras` lo comprueba estáticamente, y este
 * fichero lo hace imposible en tiempo de ejecución: no hay ninguna función aquí
 * que sepa qué es un `ManifiestoDeJuego`.
 *
 * ═══ REEXPORTADO UNO A UNO, NO CON `export *` ═══
 *
 * Y esto no es estilo: es un fallo que ya ocurrió y que cuesta una tarde
 * encontrar. Con la estrella, `tsx` dejaba fuera las funciones de `tipos.ts` en
 * tiempo de EJECUCIÓN mientras el compilador las daba por buenas — los tres
 * paquetes compilaban y el servidor reventaba al arrancar con «does not provide
 * an export named …». Está documentado en `shared/juegos/index.ts`, que es de
 * donde viene esta cautela.
 *
 * Un contrato que importan el móvil y el servidor no puede depender de esa
 * sutileza. Cuesta una línea por nombre y se paga una vez.
 */
import type { Avanzar, MovimientoRegistrado } from './motor';
import { aplicar, reejecutar } from './motor';
import {
  ArcadeSinLoSecreto,
  ArcadeSinProyeccion,
  hayLoSecreto,
  hayProyeccion,
  proyectar,
  registrarLoSecreto,
  registrarProyeccion,
} from './proyeccion';
import type { LoSecreto, Proyeccion } from './proyeccion';
import { exigeProyeccion, problemasDelManifiesto } from './tipos';
import type { ArcadeId, ManifiestoDeArcade, QuienMira } from './tipos';
import type { ContextoMovimiento, Movimiento } from './movimiento';

// ---------------------------------------------------------------------------
// Lo que se reexporta, uno a uno
// ---------------------------------------------------------------------------

export {
  cabenEnLaMesa,
  ESPECTADOR,
  exigeProyeccion,
  exigeReejecutabilidad,
  necesitaMesa,
  problemasDelManifiesto,
  tieneReloj,
} from './tipos';
export type {
  AforoDeArcade,
  ArcadeId,
  AsientoId,
  IconoDeArcade,
  ManifiestoDeArcade,
  MarcadorDeArcade,
  MuebleDeArcade,
  ProcedenciaDeArcade,
  QuienMira,
  SedeDeArcade,
} from './tipos';

export type { ContextoMovimiento, Movimiento } from './movimiento';

export { aplicar, reejecutar, ReductorMudo } from './motor';
export type { Avanzar, MovimientoRegistrado } from './motor';

export {
  ArcadeSinLoSecreto,
  ArcadeSinProyeccion,
  hayLoSecreto,
  hayProyeccion,
  loSecretoDe,
  olvidarElTapado,
  proyectar,
  ProyeccionNoRegistrada,
  registrarLoSecreto,
  registrarProyeccion,
} from './proyeccion';
export type { LoSecreto, Proyeccion } from './proyeccion';

export {
  esTic,
  movimientoDeTic,
  NUNCA,
  plazoDentroDe,
  quedanTics,
  segundosDe,
  TIC,
  ticsPara,
  vencido,
} from './reloj';
export type { Plazo, Tic } from './reloj';

// ---------------------------------------------------------------------------
// El registro
// ---------------------------------------------------------------------------

/** Un arcade instalado: sus reglas como dato y sus reglas como código. */
export interface ArcadeInstalado {
  manifiesto: ManifiestoDeArcade;
  /**
   * El reductor. Se guarda como `Avanzar<unknown>` porque el registro no puede
   * conocer la forma del estado de un juego que no conoce — es la misma razón
   * por la que `LiveSession.estado` es `Record<string, unknown>` en el otro
   * motor, y el mismo trato: el juego sabe lo que metió y lo lee tipado en su
   * propio fichero.
   */
  avanzar: Avanzar<unknown>;
}

/**
 * La tabla, ANCLADA AL ÁMBITO GLOBAL.
 *
 * Podría ser una constante de módulo, y en el otro motor lo era hasta que una
 * prueba encontró el fallo: este fichero se puede cargar DOS VECES —una ruta lo
 * importa como `../../shared/arcade` y otra como `./arcade`, y el cargador las
 * trata como módulos distintos—, con lo que cada copia tendría su propia tabla y
 * las altas se perderían EN SILENCIO.
 *
 * El símbolo es PROPIO: `gamemasters.arcade.instalados`, hermano y no pariente
 * de `gamemasters.juegos.instalados`. Si compartieran símbolo compartirían
 * tabla, y entonces la separación de la que cuelga todo esto sería una
 * convención de nombres.
 */
const LLAVE = Symbol.for('gamemasters.arcade.instalados');
const global_ = globalThis as unknown as Record<symbol, Record<ArcadeId, ArcadeInstalado>>;
const INSTALADOS: Record<ArcadeId, ArcadeInstalado> = global_[LLAVE] ?? (global_[LLAVE] = {});

/**
 * Un manifiesto mal escrito. Se niega el alta.
 *
 * Fallar aquí es infinitamente mejor que dejar entrar un arcade con `tickHz`
 * negativo o sin nombre: lo primero lo lee quien despliega, lo segundo lo
 * descubre quien abre la Sala y encuentra una tarjeta en blanco.
 */
export class ArcadeMalEscrito extends Error {
  constructor(
    public readonly arcade: ArcadeId,
    public readonly problemas: string[],
  ) {
    super(`El arcade «${arcade}» no se puede instalar:\n  · ${problemas.join('\n  · ')}`);
    this.name = 'ArcadeMalEscrito';
  }
}

/**
 * Se ha pedido un arcade que este servidor no tiene instalado.
 *
 * No es un error de programación: es la situación normal el día que un servidor
 * instale un reparto distinto. Lo que no es normal es seguir adelante — y esa es
 * la lección más cara de este repositorio, donde `manifiestoDe` devolvía CLUEDO
 * por defecto y una partida entera se jugaba con las reglas de otro juego sin
 * que nada diera un error.
 */
export class ArcadeNoInstalado extends Error {
  constructor(public readonly arcade: ArcadeId) {
    super(`«${arcade}» no es un arcade instalado aquí.`);
    this.name = 'ArcadeNoInstalado';
  }
}

/**
 * DA DE ALTA UN ARCADE. Manifiesto y reductor van juntos, a propósito.
 *
 * En el otro motor son dos llamadas —`registrarJuego` y `registrarAcciones`— y
 * eso permite un estado intermedio raro: un juego declarado del que no se sabe
 * jugar, que se lista en el catálogo y revienta al primer movimiento. Aquí no
 * hay manera de llegar a ese estado, porque las reglas como dato y las reglas
 * como código entran por la misma puerta.
 *
 * La proyección va aparte y es opcional porque de verdad lo es: la mitad de los
 * arcades no tienen nada que esconder. Lo que no es opcional es que un juego con
 * `secretos: true` la traiga, y eso lo comprueba `exigirProyecciones()` cuando
 * ya están todas las altas hechas — para no obligar a un orden.
 */
export function instalarArcade<E>(alta: {
  manifiesto: ManifiestoDeArcade;
  avanzar: Avanzar<E>;
  proyeccion?: Proyeccion<E>;
  /**
   * Qué esconde este juego. Obligatorio de hecho si declara `secretos: true`,
   * y no de tipo: el arcade puede venir de fuera del binario, y allí no hay
   * compilador. Lo exige `exigirSecretosTapados()` al arrancar. Ver `LoSecreto`.
   */
  loSecreto?: LoSecreto<E>;
}): void {
  const problemas = problemasDelManifiesto(alta.manifiesto);
  if (problemas.length > 0) throw new ArcadeMalEscrito(alta.manifiesto.id, problemas);

  INSTALADOS[alta.manifiesto.id] = {
    manifiesto: alta.manifiesto,
    avanzar: alta.avanzar as Avanzar<unknown>,
  };
  if (alta.proyeccion) registrarProyeccion(alta.manifiesto.id, alta.proyeccion);
  if (alta.loSecreto) registrarLoSecreto(alta.manifiesto.id, alta.loSecreto);
}

/** Quita un arcade. Para las pruebas y para el reparto de un servidor. */
export function olvidarArcade(arcade: ArcadeId): void {
  delete INSTALADOS[arcade];
}

/** Todos los arcades instalados, para la Sala. */
export function arcadesInstalados(): ManifiestoDeArcade[] {
  return Object.values(INSTALADOS).map((a) => a.manifiesto);
}

/** ¿Está instalado? */
export function arcadeInstalado(arcade: ArcadeId): boolean {
  return INSTALADOS[arcade] !== undefined;
}

/** El manifiesto de un arcade, o nada. Para quien puede seguir sin saberlo. */
export function manifiestoDeArcadeSiExiste(arcade: ArcadeId): ManifiestoDeArcade | undefined {
  return INSTALADOS[arcade]?.manifiesto;
}

/** El manifiesto de un arcade. FALLA si no está instalado. */
export function manifiestoDeArcade(arcade: ArcadeId): ManifiestoDeArcade {
  const instalado = INSTALADOS[arcade];
  if (!instalado) throw new ArcadeNoInstalado(arcade);
  return instalado.manifiesto;
}

/** El reductor de un arcade. FALLA si no está instalado. */
export function reductorDe(arcade: ArcadeId): Avanzar<unknown> {
  const instalado = INSTALADOS[arcade];
  if (!instalado) throw new ArcadeNoInstalado(arcade);
  return instalado.avanzar;
}

/**
 * AVANZAR: la operación que da nombre a todo esto, con el arcade delante.
 *
 * El motor de `motor.ts` no conoce ningún registro y por tanto su `aplicar`
 * recibe el reductor ya resuelto. Aquí se resuelve por id, porque quien hospeda
 * lleva muchas mesas de muchos juegos distintos en el mismo proceso y no tiene
 * por qué acordarse de qué función le tocaba a cuál.
 *
 * Es la única función de este fichero que se usa en el camino caliente, y no
 * hace nada más que buscar en un objeto y llamar.
 */
export function avanzar(
  arcade: ArcadeId,
  estado: unknown,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): unknown {
  return aplicar(reductorDe(arcade), estado, movimiento, ctx);
}

/** Reejecuta una partida entera de un arcade instalado. Ver `motor.reejecutar`. */
export function reejecutarEn(
  arcade: ArcadeId,
  inicial: unknown,
  registrados: readonly MovimientoRegistrado[],
): unknown {
  return reejecutar(reductorDe(arcade), inicial, registrados);
}

/**
 * LO QUE SE LE MANDA A UN ASIENTO.
 *
 * ═══ AQUÍ ESTÁ LA ÚNICA DECISIÓN DELICADA DEL FICHERO ═══
 *
 * Un arcade con `secretos: true` se proyecta, y si no hay proyección esto no se
 * llega a ejecutar nunca porque `exigirProyecciones()` habrá impedido arrancar.
 *
 * Un arcade con `secretos: false` manda el estado ENTERO. Y conviene decir por
 * qué eso NO es «una proyección por defecto», que es lo que `proyeccion.ts` se
 * niega a tener: no se está adivinando qué tapar ni privilegiando ningún nombre
 * de campo. Se está creyendo al juego cuando declara que no tiene nada que
 * tapar. La diferencia práctica es que aquí no hay ninguna heurística que pueda
 * equivocarse; hay una declaración que, si es falsa, es un fallo del juego y no
 * de la plataforma.
 *
 * Un juego con secretos que además registre proyección recorta; uno sin secretos
 * que la registre también, porque registrarla es una declaración de intención
 * más fuerte que el booleano. Al revés no: el booleano solo, sin función, no
 * puede recortar nada.
 */
export function vistaDeAsiento(arcade: ArcadeId, estado: unknown, quien: QuienMira): unknown {
  if (hayProyeccion(arcade)) return proyectar(arcade, estado, quien);
  const manifiesto = manifiestoDeArcade(arcade);
  if (exigeProyeccion(manifiesto)) throw new ArcadeSinProyeccion(arcade);
  return estado;
}

/** Lo que le falta a un arcade con secretos para poder arrancar. */
export interface SecretoSinTapar {
  arcade: ArcadeId;
  /** `'proyeccion'` si no recorta; `'lo-secreto'` si no dice qué habría que recortar. */
  falta: Array<'proyeccion' | 'lo-secreto'>;
}

/**
 * SE COMPRUEBA AL ARRANCAR: todo arcade con secretos trae LAS DOS COSAS.
 *
 * ═══ POR QUÉ DOS Y NO UNA ═══
 *
 * La proyección es la que RECORTA. `loSecreto` es la que dice QUÉ habría que
 * recortar, y sin ella la primera no se puede comprobar: un juego que registre
 * `(estado) => estado` como proyección pasa en verde filtrándolo todo, porque un
 * comprobador genérico sobre estado opaco no sabe qué buscar. Exigir solo la
 * proyección comprueba que el sitio existe, no que haga nada.
 *
 * ═══ POR QUÉ AL ARRANCAR Y NO AL PROYECTAR ═══
 *
 * Porque un fallo al proyectar ocurre con la mesa puesta y la gente dentro, y la
 * única salida decente en ese momento es cortar la partida — o sea, castigar a
 * quien está jugando por un error de quien instaló el juego. Un fallo al
 * arrancar lo lee quien despliega, en el registro del despliegue, antes de que
 * nadie entre.
 *
 * Devuelve la lista entera en vez de lanzar en el primero para que quien lo lea
 * vea los tres de una vez. Quien llama decide si eso es una negativa a arrancar
 * —y en el servidor lo es— o un aviso.
 */
export function arcadesConSecretosSinTapar(): SecretoSinTapar[] {
  const mal: SecretoSinTapar[] = [];
  for (const instalado of Object.values(INSTALADOS)) {
    if (!exigeProyeccion(instalado.manifiesto)) continue;
    const id = instalado.manifiesto.id;
    const falta: Array<'proyeccion' | 'lo-secreto'> = [];
    if (!hayProyeccion(id)) falta.push('proyeccion');
    if (!hayLoSecreto(id)) falta.push('lo-secreto');
    if (falta.length > 0) mal.push({ arcade: id, falta });
  }
  return mal;
}

/**
 * Y la versión que NO deja arrancar. Es la que llama quien levanta el proceso.
 *
 * Lanza con el primer problema y nombra a los demás en el mensaje: una excepción
 * solo puede llevar un `arcade` dentro, y quien lea el registro necesita la
 * lista entera para no arreglarlos de uno en uno a golpe de despliegue.
 *
 * NADIE LA LLAMA TODAVÍA, y conviene que esté escrito: en la fase 0 no hay
 * `routes/arcade.ts` ni ningún arcade instalado que proteger, así que el
 * enganche al arranque del servidor es de la fase 2. Una garantía que existe y
 * no está conectada es una garantía que no existe; queda apuntado aquí para que
 * no se dé por hecha.
 */
export function exigirSecretosTapados(): void {
  const mal = arcadesConSecretosSinTapar();
  const primero = mal[0];
  if (primero === undefined) return;
  const error = primero.falta.includes('proyeccion')
    ? new ArcadeSinProyeccion(primero.arcade)
    : new ArcadeSinLoSecreto(primero.arcade);
  if (primero.falta.length > 1) {
    error.message += '\nY tampoco ha registrado `loSecreto`.';
  }
  if (mal.length > 1) {
    const otros = mal.slice(1).map((m) => `${m.arcade} (falta: ${m.falta.join(', ')})`);
    error.message += `\nY hay más sin tapar: ${otros.join('; ')}.`;
  }
  throw error;
}
