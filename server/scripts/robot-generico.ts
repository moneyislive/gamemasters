/**
 * EL ROBOT GENÉRICO: juega CUALQUIER arcade de mesa sin saber a qué se juega.
 *
 * ═══ PARA QUÉ EXISTE, SI YA HAY DOS ROBOTS ═══
 *
 * `robot-del-burgo.ts` y `robot-de-las-lindes.ts` tienen la misma forma —elegir entre lo que el
 * juego ofrece hasta que se acaba— y cada uno la escribe desde cero con reglas de su juego dentro
 * (compra si puede pagar, planta repartiendo por clases, coloca pegado a lo que hay). Esos dos
 * juegan BIEN, y por eso congelan el oro y comparan motores. Éste no juega bien: juega CUALQUIER
 * juego instalado, incluido el que se dé de alta mañana, sin una línea escrita para él. Lo único
 * que sabe es lo que la plataforma sabe de todos: el registro (`shared/arcade/index.ts`), la vista
 * de cada asiento, las `opciones()` que el propio juego le da a esa vista, el `turnoDe` que la
 * vista declara (`shared/mecanicas/turno-declarado.ts`) y `seAcaboLaPartida`.
 *
 * ═══ JUEGA COMO LA MESA, NO COMO UN ATAJO ═══
 *
 * Todo lo que hace lo hace por la misma puerta que `server/src/arcade/mesas.ts`:
 *
 *   · Proyecta con `vistaDeAsiento` y CON LOS NOMBRES de los sentados, que es como compone la
 *     mesa lo que viaja a cada móvil; y le pregunta a `opcionesDeArcade` con esa vista.
 *   · La carga viaja por JSON antes de llegar al reductor, porque por la red viaja así: un juego
 *     que comparara la carga por identidad, o que dejara un `undefined` que el cable se come, se
 *     ve aquí y no en un móvil.
 *   · Un rechazo se descarta ENTERO y un movimiento que no cambia nada también: ni diario, ni
 *     revisión. El diario que sale es el que la mesa habría guardado.
 *   · El tic entra con `quien: null`, sube el reloj ANTES de llamar al reductor y se descarta si
 *     no cambia nada, que es exactamente `avanzarElReloj` más `ponerAlDiaElPlazo`. En una mesa de
 *     `tickHz: 0` el tic es el plazo que vence por el ausente, y los juegos de servidor deciden
 *     algo con él (tirar por él, pasarle el turno, echar su carta más baja): no meterlo dejaría
 *     esa rama sin jugar.
 *
 * ═══ CÓMO ELIGE, Y LO QUE APRENDIÓ DE LOS OTROS DOS Y DE LA MEMORIA DE LA CASA ═══
 *
 * La memoria tiene apuntado el bucle que decía jugar y no jugaba: 26 de 40 vueltas ofreciendo
 * trueques, cero sietes, 856 comprobaciones en verde encima. La causa era elegir «el primero de la
 * lista», y la lista empezaba por lo que siempre está disponible y nunca agota nada. Medido aquí
 * antes de escribir la política: elegir al azar UNIFORME entre todas las opciones tampoco juega.
 * El Burgo ofrece «declararse en quiebra» a todo el que sigue vivo, en todo momento, y un robot
 * uniforme se rinde en los cuatro primeros movimientos: la partida «termina» en seis, con ganador
 * y en verde. Y en Riberas la familia de trueques ahoga al «pasar», que va solo.
 *
 * Así que la política es la de quien juega a lo que le ponen delante:
 *
 *  1. ELIGE EL TIPO Y LUEGO LA OPCIÓN. Primero la clase de movimiento, después una de esa clase.
 *     Cincuenta trueques y un «pasar» son dos tipos, no cincuenta y uno.
 *  2. MÁS PESO A LO QUE EL JUEGO OFRECE POCO. Construir, comprar o descartar salen cuando la mesa
 *     lo permite; ofrecer un trueque sale siempre. El peso de un tipo es la inversa de la fracción
 *     de miradas en que se ha ofrecido en esta partida: lo raro se hace cuando aparece.
 *  3. LO QUE SE OFRECE A LA VEZ AL DEL TURNO Y A QUIEN NO LO TIENE NO ES LA JUGADA DEL TURNO. Es
 *     una salida o una obra que vale en cualquier momento —rendirse, hipotecar—. El del turno juega
 *     su turno; esas las hace cuando no le queda otra (el apuro del Burgo) o, una vez por tipo y
 *     partida, cuando la partida ya ha dado unas vueltas (`MADUREZ`): así se ejercitan sin que la
 *     partida se acabe por abandono.
 *  4. QUIEN NO TIENE EL TURNO CONTESTA LO QUE LE LLEGA. Cada paso se mira al del turno y a otro
 *     asiento sorteado; ése actúa la mitad de las veces si tiene algo que no sea de lo del punto 3
 *     (un trueque que contestar). Es la lección de
 *     `robot-del-burgo.ts`: si el del turno pasa antes de que el otro conteste, el trato caduca en
 *     el relevo. Si ninguno de los dos tiene nada, se mira a los demás y actúa el primero que tenga.
 *  5. LO QUE SE RECHAZÓ O NO CAMBIÓ NADA NO SE VUELVE A ELEGIR hasta que la mesa cambie. Es un
 *     fallo y se apunta, pero repetirlo sólo gastaría el tope.
 *
 * ═══ Y LO QUE APUNTA, QUE ES PARA LO QUE EXISTE ═══
 *
 * No afirma nada: cuenta. Cada movimiento aceptado por tipo, cada tipo ofrecido, cada declaración
 * que saltó (`declaracion: true` no se manda, se lee: `opciones.ts`), cada opción ofrecida que el
 * reductor rechazó o que no cambió nada, lo que se le ofreció al espectador o con el prefijo
 * reservado `arcade:`, los ids repetidos, la excepción que escapó y dónde, los tics y los cambios
 * de turno, y cómo de viva estaba la partida al final. Las afirmaciones las hace
 * `verificar-robot-generico.ts`.
 *
 * ═══ LO QUE CUESTA, QUE DECIDIÓ CUÁNTO SE MIRA ═══
 *
 * Proyectar es lo caro, y no por el robot: la vista de Riberas recalcula el Vado Largo de cada
 * colono por búsqueda exhaustiva, y una sola vista pasa de 0,6 ms con dos y tres veredas a 2,4 ms
 * con doce y once (medido). Mirar a los seis asientos y al espectador en cada paso eran treinta
 * milisegundos por movimiento en una partida larga. Por eso cada paso mira a DOS —el del turno y
 * otro; el turno se lee de la vista del primero que se mira, porque `turnoDe` es público— y al
 * espectador sólo uno de cada `UNA_MIRADA_DEL_ESPECTADOR_CADA` pasos y al final. Así el verificador
 * entero, con Riberas tres veces y dos vueltas, tarda entre 34 y 39 s (medido cinco veces).
 *
 * ═══ CORRE EN CUALQUIER MOTOR ═══
 *
 * Como los otros dos robots, sin `node:`, sin `class`, sin reloj ni `Math.random`, y sin cerrar
 * sobre el `let` de un bucle (Hermes 0.12 no lo liga por iteración). El azar es el de
 * `shared/mecanicas/azar.ts`, sembrado con la semilla de la mesa y SEPARADO del de la partida:
 * el juego siembra el suyo con `ctx.azar` y éste no lo toca. Los pesos son enteros.
 */
import { avanzarConMotivo, ESPECTADOR, movimientoDeTic, opcionesDeArcade, seAcaboLaPartida, vistaDeAsiento } from '../../shared/arcade';
import type { ArcadeId, AsientoId, AsientoNombrado, ContextoMovimiento, Movimiento, MovimientoRegistrado, Opcion } from '../../shared/arcade';
import { enteroEntre, sembrar } from '../../shared/mecanicas/azar';
import type { Azar } from '../../shared/mecanicas/azar';
import { canonico } from '../../shared/mecanicas/canonico';
import { turnoDeLaVista } from '../../shared/mecanicas/turno-declarado';
import type { TurnoDeLaVista } from '../../shared/mecanicas/turno-declarado';

/** Cuántos pasos como mucho: un juego que no acaba no bloquea la batería. Ver `OpcionesDelRobot.tope`. */
export const TOPE_DE_PASOS = 1200;
/** Uno de cada tantos pasos, el plazo vence por el ausente y entra un tic. `0` apaga los tics. */
export const UN_TIC_CADA = 24;
/** Uno de cada tantos pasos se mira también al espectador: a quien sólo mira no se le ofrece nada. */
export const UNA_MIRADA_DEL_ESPECTADOR_CADA = 8;
/** De cuántos movimientos aceptados se mira la cola para decir si la partida seguía viva. */
export const VENTANA_DE_VIDA = 200;
/**
 * Cuántos cambios de turno por asiento tiene que haber visto la partida antes de que el robot
 * pruebe, una vez por tipo, las salidas de siempre (punto 3 de la cabecera).
 */
export const MADUREZ = 10;
/** El prefijo que la plataforma se reserva. Ver `Movimiento.tipo`. */
const RESERVADO = 'arcade:';
/** Los nombres con los que se sienta el robot: la vista se compone con ellos, como en la mesa. */
const NOMBRES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fermín', 'Gala', 'Hugo', 'Inés', 'Julio', 'Lola', 'Mario'];

/**
 * Cómo elige el robot. `'primera'` es LA VACUNA: el bucle viejo que siempre cogía lo primero de la
 * lista del primer asiento que tuviera algo, sin tics. Existe para que el comprobador vea caer con
 * él los suelos de avance: un suelo que el bucle viejo también pasa no mide nada.
 */
export type PoliticaDelRobot = 'jugador' | 'primera';

export interface OpcionesDelRobot {
  /** Pasos como mucho, contando tics. Por defecto `TOPE_DE_PASOS`. */
  tope?: number;
  /** Un tic cada tantos pasos, sorteado. Por defecto `UN_TIC_CADA`; `0`, ninguno. */
  unTicCada?: number;
  /** Por defecto `'jugador'`. */
  politica?: PoliticaDelRobot;
}

/** Algo que salió mal, con lo necesario para reproducirlo: el paso, quién y qué se mandó. */
export interface Incidente {
  /** El número de paso del bucle. */
  paso: number;
  /** Cuántos movimientos llevaba el diario: el diario hasta ahí reproduce el estado en que ocurrió. */
  enElDiario: number;
  quien: AsientoId | null;
  id: string;
  tipo: string;
  carga: unknown;
  /** El motivo del rechazo, o la excepción, o qué se vio. */
  que: string;
}

/** Lo que sale de una partida del robot. */
export interface PartidaGenerica {
  arcade: ArcadeId;
  semilla: number;
  asientos: AsientoId[];
  politica: PoliticaDelRobot;
  /** El estado final. */
  estado: unknown;
  /** Lo que la mesa habría guardado: sólo lo que cambió el estado, con su contexto. */
  diario: MovimientoRegistrado[];
  /** `seAcaboLaPartida` dijo que sí. */
  terminada: boolean;
  /** Se agotaron los pasos sin que se acabara. */
  topeAlcanzado: boolean;
  /** Por qué se paró antes de acabar y antes del tope, o `null`. */
  corte: string | null;
  pasos: number;
  /** Movimientos de asiento aceptados, por tipo. */
  aceptadas: Record<string, number>;
  /** En cuántas miradas se ofreció cada tipo, contando sólo lo que se podía mandar. */
  ofrecidas: Record<string, number>;
  /** Cuántas declaraciones (`declaracion: true`) se vieron, por tipo. No se mandan. */
  declaraciones: Record<string, number>;
  /** Cuántos movimientos aceptados hizo cada asiento. */
  movieron: Record<string, number>;
  /** Opción ofrecida, elegida y RECHAZADA por el reductor: lo que se ofrece no se pudo hacer. */
  rechazadas: Incidente[];
  /** Opción ofrecida y elegida que devolvió el MISMO objeto sin motivo: un botón mudo. */
  mudas: Incidente[];
  /** Opción ofrecida y elegida que devolvió OTRO objeto igual al de antes: copia sin cambio. */
  copias: Incidente[];
  /** Opciones que se le ofrecieron al espectador, que no puede mandar nada. Una por id. */
  alEspectador: Incidente[];
  /** Opciones con el prefijo reservado de la plataforma, que la mesa rechaza en la puerta. Una por id. */
  reservadas: Incidente[];
  /** Dos opciones con el mismo id en la misma lista de un asiento. Una por id. */
  idsRepetidos: Incidente[];
  /** La excepción que escapó del código del juego, si alguna. La partida se para ahí. */
  excepcion: Incidente | null;
  tics: { metidos: number; aceptados: number };
  /** Cuántas veces cambió de quién es el turno, según las vistas que se miraron. */
  cambiosDeTurno: number;
  /**
   * De ésos, cuántos los trajo el RELOJ —un tic que pasó el turno por el ausente— y no un
   * movimiento de asiento. Se separan porque el reloj hace avanzar una mesa en la que nadie
   * puede terminar su turno: un «pasar» que no pasa sigue viendo cambiar el turno cada vez que
   * vence el plazo, y eso no es avance de la partida.
   */
  cambiosDeTurnoPorElReloj: number;
  /** ¿Declara el juego de quién es el turno en su vista? */
  declaraTurno: boolean;
  /** Cuántas veces se miró al espectador. */
  miradasDelEspectador: number;
  /**
   * La cola de la partida: en los últimos `VENTANA_DE_VIDA` movimientos de asiento aceptados,
   * cuántos cambios de turno trajeron ELLOS (los del reloj no cuentan: ver
   * `cambiosDeTurnoPorElReloj`), cuántos tipos distintos y cuántos asientos movieron.
   */
  vida: { aceptados: number; cambiosDeTurno: number; tipos: number; asientos: number };
  /** La racha más larga del mismo asiento haciendo el mismo tipo sin que cambie el turno. */
  rachaMasLarga: { quien: AsientoId; tipo: string; largo: number };
  /** El estado final en forma canónica. Es lo que se compara entre dos corridas. */
  huella: string;
}

/** Los asientos de una partida del robot: `s1`..`sN`. */
export function asientosDelRobotGenerico(cuantos: number): AsientoId[] {
  const salida: AsientoId[] = [];
  for (let i = 1; i <= cuantos; i++) salida.push(`s${i}`);
  return salida;
}

/** Quién está sentado y cómo se llama, como lo compone la mesa. */
export function sentadosDelRobot(asientos: readonly AsientoId[]): AsientoNombrado[] {
  const salida: AsientoNombrado[] = [];
  for (let i = 0; i < asientos.length; i++) {
    salida.push({ asiento: asientos[i] as AsientoId, nombre: NOMBRES[i] ?? `Asiento ${i + 1}` });
  }
  return salida;
}

/** Lo que vio un asiento en una mirada. */
interface Mirada {
  quien: AsientoId;
  /** De quién es el turno según SU vista: es público, así que vale la de cualquiera. */
  turno: TurnoDeLaVista;
  /** Lo que se le puede mandar: sin declaraciones, sin reservadas y sin lo vetado en este estado. */
  elegibles: Opcion[];
  /** Los tipos de `elegibles`, en el orden en que aparecen. */
  tipos: string[];
}

function sumar(tabla: Record<string, number>, llave: string, cuanto: number): void {
  tabla[llave] = (tabla[llave] ?? 0) + cuanto;
}

/** El mensaje de una excepción, sin fiarse de que sea un `Error`. */
function mensajeDe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

/** La carga tal como llega por la red: una vuelta por JSON. `undefined` se queda en `undefined`. */
function porElCable(carga: unknown): unknown {
  if (carga === undefined) return undefined;
  return JSON.parse(JSON.stringify(carga)) as unknown;
}

/** Un índice al azar entre 0 y n − 1. */
function unoDe(azar: Azar, n: number): { azar: Azar; indice: number } {
  const t = enteroEntre(azar, 0, n - 1);
  return { azar: t.azar, indice: t.valor };
}

/** ¿Sale uno de cada `n`? Con `n <= 1`, siempre. */
function unoDeCada(azar: Azar, n: number): { azar: Azar; si: boolean } {
  if (n <= 1) return { azar, si: true };
  const t = enteroEntre(azar, 1, n);
  return { azar: t.azar, si: t.valor === 1 };
}

const NADA = { id: '', tipo: '', carga: undefined };

/**
 * JUEGA UNA PARTIDA ENTERA de `arcade` con `cuantos` asientos y la semilla dada.
 *
 * La semilla es la de la MESA (`ctx.azar`, la que el juego usa para sembrar su azar) y, pasada por
 * una constante, la del robot. Dos llamadas con los mismos argumentos juegan la misma partida,
 * movimiento a movimiento: `verificar-robot-generico.ts` lo exige.
 */
export function jugarConElRobotGenerico(
  arcade: ArcadeId,
  cuantos: number,
  semilla: number,
  opciones: OpcionesDelRobot = {},
): PartidaGenerica {
  const tope = opciones.tope ?? TOPE_DE_PASOS;
  const unTicCada = opciones.unTicCada ?? UN_TIC_CADA;
  const politica: PoliticaDelRobot = opciones.politica ?? 'jugador';
  const asientos = asientosDelRobotGenerico(cuantos);
  const sentados = sentadosDelRobot(asientos);

  let azar: Azar = sembrar((semilla ^ 0x5bd1e995) >>> 0);
  let estado: unknown = undefined;
  /** La forma canónica del estado actual, para ver las copias sin cambio. Una vez por cambio. */
  let huellaActual = canonico(null);
  let tic = 0;
  const diario: MovimientoRegistrado[] = [];

  const aceptadas: Record<string, number> = {};
  const ofrecidas: Record<string, number> = {};
  const declaraciones: Record<string, number> = {};
  const movieron: Record<string, number> = {};
  const rechazadas: Incidente[] = [];
  const mudas: Incidente[] = [];
  const copias: Incidente[] = [];
  const alEspectador: Incidente[] = [];
  const reservadas: Incidente[] = [];
  const idsRepetidos: Incidente[] = [];
  /*
   * `null as …` y no `: … = null`, por lo que cuenta `robot-del-burgo.ts` con su `estado`: con el
   * inicializador a secas TypeScript estrecha la variable a `null` y no ve que la escriben los
   * cierres de abajo, así que cada `excepcion !== null` del bucle le parecería siempre falso.
   */
  let excepcion = null as Incidente | null;
  const tics = { metidos: 0, aceptados: 0 };

  /** Lo vetado EN ESTE ESTADO: `quien|id`. Se vacía cada vez que el estado cambia. */
  let vetadas: Record<string, true> = {};
  /** Cuántas miradas tuvieron algo que mandar. Con `ofrecidas`, da el peso de lo raro. */
  let miradasConAlgo = 0;
  /** Tipos vistos a la vez en el del turno y en quien no lo tiene. Ver el punto 3. */
  const deSiempre: Record<string, true> = {};
  /** Lo reservado, lo del espectador y los ids repetidos se apuntan una vez por id: si no, serían miles. */
  const yaApuntado: Record<string, true> = {};

  let terminada = false;
  let topeAlcanzado = false;
  let corte = null as string | null;
  let pasos = 0;

  let declaraTurno = false;
  let turnoAnterior = '\u0000sin mirar';
  let cambiosDeTurno = 0;
  let cambiosDeTurnoPorElReloj = 0;
  /** Cuántos cambios de turno trajo un movimiento de asiento: los que cuentan para la vida. */
  let cambiosPorJugada = 0;
  /**
   * ¿Lo último que cambió la mesa fue un tic? Cada paso acepta como mucho una cosa, y el cambio de
   * turno se ve en la primera mirada del paso siguiente: así que se le atribuye a eso.
   */
  let loUltimoFueElReloj = false;
  let miradasDelEspectador = 0;
  /** La cola de aceptados: tipo, asiento y cuántos cambios de turno por jugada llevaba. Anillo de `VENTANA_DE_VIDA`. */
  const cola: { tipo: string; quien: string; turnos: number }[] = [];
  let enLaCola = 0;
  let racha = { quien: '', tipo: '', largo: 0, turnos: -1 };
  let rachaMasLarga = { quien: '', tipo: '', largo: 0 };

  const ctxDe = (quien: AsientoId | null, enTic: number): ContextoMovimiento => ({
    quien,
    azar: semilla,
    tic: enTic,
    asientos,
  });

  const incidente = (quien: AsientoId | null, o: { id: string; tipo: string; carga: unknown }, que: string): Incidente => ({
    paso: pasos,
    enElDiario: diario.length,
    quien,
    id: o.id,
    tipo: o.tipo,
    carga: o.carga,
    que,
  });

  /** Algo del juego reventó: se apunta y la partida se para aquí. */
  const reventar = (donde: string, quien: AsientoId | null, o: { id: string; tipo: string; carga: unknown }, error: unknown): void => {
    excepcion = incidente(quien, o, `${donde}: ${mensajeDe(error)}`);
    corte = `excepción en ${donde}`;
  };

  /** Apunta de quién es el turno según una vista, y si cambió. */
  const anotarElTurno = (turno: TurnoDeLaVista): void => {
    if (!turno.declarado) return;
    declaraTurno = true;
    const de = turno.de === null ? '\u0000nadie' : turno.de;
    if (de !== turnoAnterior) {
      cambiosDeTurno++;
      if (loUltimoFueElReloj) cambiosDeTurnoPorElReloj++;
      else cambiosPorJugada++;
      turnoAnterior = de;
    }
  };

  /** Mira un asiento: su vista, sus opciones, y lo que hay que apuntar de ellas. `null` si revienta. */
  const mirar = (quien: AsientoId): Mirada | null => {
    let vista: unknown;
    try {
      vista = vistaDeAsiento(arcade, estado, quien, sentados);
    } catch (error) {
      reventar('proyección', quien, NADA, error);
      return null;
    }
    let lista: readonly Opcion[];
    try {
      lista = opcionesDeArcade(arcade, vista, quien);
    } catch (error) {
      reventar('opciones', quien, NADA, error);
      return null;
    }
    const elegibles: Opcion[] = [];
    const tipos: string[] = [];
    const ids: Record<string, true> = {};
    for (const o of lista) {
      if (ids[o.id] === true && yaApuntado[`repetido|${o.id}`] !== true) {
        yaApuntado[`repetido|${o.id}`] = true;
        idsRepetidos.push(incidente(quien, o, 'el mismo id dos veces en la misma lista'));
      }
      ids[o.id] = true;
      if (o.declaracion === true) {
        sumar(declaraciones, o.tipo, 1);
        continue;
      }
      if (o.tipo.indexOf(RESERVADO) === 0) {
        if (yaApuntado[`reservada|${o.id}`] !== true) {
          yaApuntado[`reservada|${o.id}`] = true;
          reservadas.push(incidente(quien, o, 'lleva el prefijo que la plataforma se reserva'));
        }
        continue;
      }
      if (vetadas[`${quien}|${o.id}`] === true) continue;
      elegibles.push(o);
      if (tipos.indexOf(o.tipo) < 0) tipos.push(o.tipo);
    }
    if (elegibles.length > 0) {
      miradasConAlgo++;
      for (const t of tipos) sumar(ofrecidas, t, 1);
    }
    return { quien, turno: turnoDeLaVista(vista), elegibles, tipos };
  };

  /** Mira al espectador: a quien sólo mira no se le puede ofrecer nada que mandar. */
  const mirarAlEspectador = (): void => {
    miradasDelEspectador++;
    let vista: unknown;
    try {
      vista = vistaDeAsiento(arcade, estado, ESPECTADOR, sentados);
    } catch (error) {
      reventar('proyección (espectador)', null, NADA, error);
      return;
    }
    let lista: readonly Opcion[];
    try {
      lista = opcionesDeArcade(arcade, vista, ESPECTADOR);
    } catch (error) {
      reventar('opciones (espectador)', null, NADA, error);
      return;
    }
    for (const o of lista) {
      if (yaApuntado[`espectador|${o.id}`] === true) continue;
      yaApuntado[`espectador|${o.id}`] = true;
      alEspectador.push(incidente(null, o, 'se le ofrece a quien sólo mira'));
    }
  };

  /** ¿Se acabó? Si revienta, se apunta y cuenta como que no. */
  const seAcabo = (): boolean => {
    try {
      return seAcaboLaPartida(arcade, estado);
    } catch (error) {
      reventar('seAcabo', null, NADA, error);
      return false;
    }
  };

  /** Un tipo al azar de éstos, con el peso de lo raro (punto 2). */
  const tipoConPeso = (tipos: readonly string[]): string => {
    let total = 0;
    const pesos: number[] = [];
    for (const t of tipos) {
      const veces = ofrecidas[t] ?? 0;
      let peso = Math.floor(((miradasConAlgo + 1) * 8) / (veces + 1));
      if (peso < 1) peso = 1;
      if (peso > 256) peso = 256;
      pesos.push(peso);
      total += peso;
    }
    const t = enteroEntre(azar, 0, total - 1);
    azar = t.azar;
    let acumulado = 0;
    for (let i = 0; i < tipos.length; i++) {
      acumulado += pesos[i] as number;
      if (t.valor < acumulado) return tipos[i] as string;
    }
    return tipos[tipos.length - 1] as string;
  };

  /** Una opción al azar de ese tipo, entre las elegibles de la mirada. */
  const opcionDelTipo = (m: Mirada, tipo: string): Opcion => {
    const delTipo: Opcion[] = [];
    for (const o of m.elegibles) if (o.tipo === tipo) delTipo.push(o);
    const u = unoDe(azar, delTipo.length);
    azar = u.azar;
    return delTipo[u.indice] as Opcion;
  };

  /**
   * QUÉ HACE QUIEN ACTÚA con lo que tiene. Los puntos 1 a 3 de la cabecera: tipo antes que
   * opción, peso de lo raro, y lo de siempre sólo si no queda otra o, una vez, en madurez.
   */
  const elegirEn = (m: Mirada): Opcion => {
    const propios: string[] = [];
    const salidas: string[] = [];
    for (const t of m.tipos) {
      if (deSiempre[t] === true) salidas.push(t);
      else propios.push(t);
    }
    if (cambiosDeTurno >= MADUREZ * asientos.length) {
      const sinProbar: string[] = [];
      for (const t of salidas) if ((aceptadas[t] ?? 0) === 0) sinProbar.push(t);
      if (sinProbar.length > 0) {
        const prueba = unoDeCada(azar, 8);
        azar = prueba.azar;
        if (prueba.si) {
          const u = unoDe(azar, sinProbar.length);
          azar = u.azar;
          return opcionDelTipo(m, sinProbar[u.indice] as string);
        }
      }
    }
    if (propios.length > 0) return opcionDelTipo(m, tipoConPeso(propios));
    const u = unoDe(azar, salidas.length);
    azar = u.azar;
    return opcionDelTipo(m, salidas[u.indice] as string);
  };

  /** Apunta un movimiento aceptado en la cola y en la racha. */
  const contarAceptado = (quien: AsientoId, tipo: string): void => {
    sumar(aceptadas, tipo, 1);
    sumar(movieron, quien, 1);
    loUltimoFueElReloj = false;
    const entrada = { tipo, quien, turnos: cambiosPorJugada };
    if (cola.length < VENTANA_DE_VIDA) cola.push(entrada);
    else cola[enLaCola % VENTANA_DE_VIDA] = entrada;
    enLaCola++;
    if (racha.quien === quien && racha.tipo === tipo && racha.turnos === cambiosDeTurno) racha.largo++;
    else racha = { quien, tipo, largo: 1, turnos: cambiosDeTurno };
    if (racha.largo > rachaMasLarga.largo) rachaMasLarga = { quien, tipo, largo: racha.largo };
  };

  /** Aplica y clasifica, como la mesa: lo rechazado y lo que no cambia nada no entran. */
  const aplicar = (quien: AsientoId, o: Opcion): void => {
    const movimiento: Movimiento =
      o.carga === undefined ? { tipo: o.tipo } : { tipo: o.tipo, carga: porElCable(o.carga) };
    const ctx = ctxDe(quien, tic);
    let salida: { estado: unknown; motivo: string | null };
    try {
      salida = avanzarConMotivo(arcade, estado, movimiento, ctx);
    } catch (error) {
      reventar('reductor', quien, o, error);
      return;
    }
    if (salida.motivo !== null) {
      rechazadas.push(incidente(quien, o, salida.motivo));
      vetadas[`${quien}|${o.id}`] = true;
      return;
    }
    if (salida.estado === estado) {
      mudas.push(incidente(quien, o, 'devolvió el mismo estado y ningún motivo'));
      vetadas[`${quien}|${o.id}`] = true;
      return;
    }
    let nueva: string;
    try {
      nueva = canonico(salida.estado);
    } catch (error) {
      reventar('canonico del estado', quien, o, error);
      return;
    }
    if (nueva === huellaActual) {
      copias.push(incidente(quien, o, 'devolvió otro objeto con lo mismo dentro'));
      vetadas[`${quien}|${o.id}`] = true;
      return;
    }
    estado = salida.estado;
    huellaActual = nueva;
    diario.push({ movimiento, ctx });
    vetadas = {};
    contarAceptado(quien, o.tipo);
  };

  /** El tic, como lo mete la mesa: reloj adelantado antes, y si no cambia nada, como si no hubiera pasado. */
  const meterUnTic = (): void => {
    tics.metidos++;
    const enTic = tic + 1;
    const movimiento = movimientoDeTic();
    const ctx = ctxDe(null, enTic);
    let salida: { estado: unknown; motivo: string | null };
    try {
      salida = avanzarConMotivo(arcade, estado, movimiento, ctx);
    } catch (error) {
      reventar('reductor (tic)', null, { id: 'tic', tipo: movimiento.tipo, carga: undefined }, error);
      return;
    }
    if (salida.motivo !== null || salida.estado === estado) return;
    let nueva: string;
    try {
      nueva = canonico(salida.estado);
    } catch (error) {
      reventar('canonico del estado (tic)', null, { id: 'tic', tipo: movimiento.tipo, carga: undefined }, error);
      return;
    }
    tic = enTic;
    estado = salida.estado;
    huellaActual = nueva;
    diario.push({ movimiento, ctx });
    vetadas = {};
    tics.aceptados++;
    loUltimoFueElReloj = true;
  };

  /** EL BUCLE VIEJO, para la vacuna: el primer asiento con algo, y lo primero de su lista. */
  const conLaPrimera = (): { actor: Mirada; opcion: Opcion } | null => {
    for (const quien of asientos) {
      const m = mirar(quien);
      if (m === null) return null;
      anotarElTurno(m.turno);
      const primera = m.elegibles[0];
      if (primera !== undefined) return { actor: m, opcion: primera };
    }
    return null;
  };

  /**
   * LA POLÍTICA: el del turno y otro, y si ninguno tiene nada, los demás (puntos 3 y 4).
   *
   * Se mira primero a uno sorteado porque hace falta UNA vista para saber de quién es el turno.
   * Si el sorteado resulta ser el del turno, se sortea otro entre los demás: sin esa segunda
   * mirada el del turno actuaría sin que nadie hubiera visto aún qué se le ofrece también a los
   * demás, y el punto 3 no sabría que rendirse es de siempre. Medido: en una mesa de cuatro del
   * Burgo, un asiento se rendía en su PRIMER movimiento por eso.
   */
  const comoJugador = (): { actor: Mirada; opcion: Opcion } | null => {
    const s = unoDe(azar, asientos.length);
    azar = s.azar;
    const sorteado = mirar(asientos[s.indice] as AsientoId);
    if (sorteado === null) return null;
    anotarElTurno(sorteado.turno);
    let delTurno: Mirada | null = null;
    let otro: Mirada | null = sorteado;
    if (sorteado.turno.declarado && sorteado.turno.de !== null && asientos.indexOf(sorteado.turno.de) >= 0) {
      const de = sorteado.turno.de;
      if (de === sorteado.quien) {
        delTurno = sorteado;
        otro = null;
        const demas: AsientoId[] = [];
        for (const a of asientos) if (a !== de) demas.push(a);
        if (demas.length > 0) {
          const u = unoDe(azar, demas.length);
          azar = u.azar;
          otro = mirar(demas[u.indice] as AsientoId);
          if (otro === null) return null;
        }
      } else {
        delTurno = mirar(de);
        if (delTurno === null) return null;
      }
    }
    /* Lo que se ofrece a la vez al del turno y a otro es de siempre (punto 3). */
    if (delTurno !== null && otro !== null) {
      for (const t of delTurno.tipos) if (otro.tipos.indexOf(t) >= 0) deSiempre[t] = true;
    }
    const delTurnoTiene = delTurno !== null && delTurno.elegibles.length > 0;
    let actor: Mirada | null = null;
    if (otro !== null && otro.elegibles.length > 0) {
      if (!delTurnoTiene) actor = otro;
      else {
        let tieneLoSuyo = false;
        for (const t of otro.tipos) if (deSiempre[t] !== true) tieneLoSuyo = true;
        if (tieneLoSuyo) {
          const mitad = unoDeCada(azar, 2);
          azar = mitad.azar;
          if (mitad.si) actor = otro;
        }
      }
    }
    if (actor === null && delTurno !== null && delTurnoTiene) actor = delTurno;
    if (actor === null) {
      /* Ni el del turno ni el otro: se mira a los demás, en orden sorteado, y actúa el primero con algo. */
      const quedan: AsientoId[] = [];
      for (const a of asientos) {
        if (otro !== null && a === otro.quien) continue;
        if (delTurno !== null && a === delTurno.quien) continue;
        quedan.push(a);
      }
      while (quedan.length > 0 && actor === null) {
        const u = unoDe(azar, quedan.length);
        azar = u.azar;
        const quien = quedan[u.indice] as AsientoId;
        quedan.splice(u.indice, 1);
        const m = mirar(quien);
        if (m === null) return null;
        if (m.elegibles.length > 0) actor = m;
      }
    }
    if (actor === null) return null;
    return { actor, opcion: elegirEn(actor) };
  };

  for (pasos = 0; pasos < tope; pasos++) {
    if (excepcion !== null) break;
    if (seAcabo()) {
      terminada = true;
      break;
    }
    if (excepcion !== null) break;

    if (politica === 'jugador') {
      const e = unoDeCada(azar, UNA_MIRADA_DEL_ESPECTADOR_CADA);
      azar = e.azar;
      if (e.si) {
        mirarAlEspectador();
        if (excepcion !== null) break;
      }
      if (unTicCada > 0) {
        const t = unoDeCada(azar, unTicCada);
        azar = t.azar;
        if (t.si) {
          meterUnTic();
          continue;
        }
      }
    }

    const eleccion = politica === 'primera' ? conLaPrimera() : comoJugador();
    if (excepcion !== null) break;
    if (eleccion === null) {
      corte = 'nadie tiene nada que hacer y la partida no se ha acabado';
      break;
    }
    aplicar(eleccion.actor.quien, eleccion.opcion);
    if (excepcion !== null) break;
  }
  if (!terminada && corte === null && excepcion === null && pasos >= tope) {
    if (seAcabo()) terminada = true;
    else if (excepcion === null) topeAlcanzado = true;
  }
  /* Y el espectador, también en el estado en que se quedó: el final es de lo que más se mira. */
  if (excepcion === null) mirarAlEspectador();

  /* La cola: cuántos cambios de turno, tipos y asientos en los últimos aceptados. */
  let primeraVuelta = -1;
  let ultimaVuelta = -1;
  const tiposDeLaCola: string[] = [];
  const asientosDeLaCola: string[] = [];
  for (const e of cola) {
    if (primeraVuelta < 0 || e.turnos < primeraVuelta) primeraVuelta = e.turnos;
    if (e.turnos > ultimaVuelta) ultimaVuelta = e.turnos;
    if (tiposDeLaCola.indexOf(e.tipo) < 0) tiposDeLaCola.push(e.tipo);
    if (asientosDeLaCola.indexOf(e.quien) < 0) asientosDeLaCola.push(e.quien);
  }

  return {
    arcade,
    semilla,
    asientos,
    politica,
    estado,
    diario,
    terminada,
    topeAlcanzado,
    corte,
    pasos,
    aceptadas,
    ofrecidas,
    declaraciones,
    movieron,
    rechazadas,
    mudas,
    copias,
    alEspectador,
    reservadas,
    idsRepetidos,
    excepcion,
    tics,
    cambiosDeTurno,
    cambiosDeTurnoPorElReloj,
    declaraTurno,
    miradasDelEspectador,
    vida: {
      aceptados: cola.length,
      cambiosDeTurno: cola.length === 0 ? 0 : ultimaVuelta - primeraVuelta,
      tipos: tiposDeLaCola.length,
      asientos: asientosDeLaCola.length,
    },
    rachaMasLarga,
    huella: canonico(estado),
  };
}
