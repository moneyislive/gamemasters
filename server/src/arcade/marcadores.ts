/**
 * EL MARCADOR: quién dice qué, y qué se le cree.
 *
 * ═══ LAS DOS MITADES, Y NINGUNA SIRVE SOLA ═══
 *
 * 1. EL AVISO DE INICIO. Antes de jugar, el dispositivo pide una partida y el
 *    servidor le da DOS cosas: un identificador y una SEMILLA. Apunta la hora.
 * 2. EL AVISO DE FIN. Al acabar, el dispositivo sube la repetición entera y el
 *    servidor la reejecuta con esa semilla —ver `repeticiones.ts`— y compara: la
 *    cifra que sale contra la que se declara, y la duración declarada contra el
 *    tiempo de pared que ha pasado entre los dos avisos.
 *
 * Sin la primera mitad, la segunda no vale nada: si la semilla la eligiera quien
 * juega, probaría semillas hasta encontrar la que le reparte la partida fácil, y
 * la repetición sería perfectamente honrada. Y sin la segunda, la primera tampoco:
 * un identificador sin nada que verificar es un número que se manda.
 *
 * ═══ LO QUE ESTO CONSIGUE Y LO QUE NO ═══
 *
 * NO ES INFALIBLE. Se dice aquí, en la cabecera, para que nadie lo lea al revés:
 * el juego corre en el aparato de quien juega y ahí manda quien juega. Un robot
 * que juegue de verdad, con la semilla que le tocó y durante el tiempo que dura la
 * partida, pasa todas las comprobaciones de este fichero — y tiene que pasarlas,
 * porque desde aquí es indistinguible de alguien con buenos reflejos.
 *
 * Lo que consigue es acotado y suficiente para lo que hay: EL COSTE DE LA TRAMPA
 * PASA DE CERO A MUCHO.
 *
 *   · «Mandar un número» deja de funcionar: no hay ninguna ruta que acepte una
 *     cifra sin repetición, y `verify:marcador` lo comprueba en las dos formas en
 *     que alguien lo intentaría.
 *   · «Fabricar una repetición a mano» deja de funcionar: hay que producir
 *     entradas que, jugadas de verdad, den esa cifra.
 *   · «Reejecutar una partida buena mil veces por segundo» deja de funcionar: el
 *     reloj de pared no acompaña.
 *   · «Elegir la semilla» deja de funcionar: no la elige quien juega.
 *
 * Lo que queda fuera —un robot con paciencia— es un problema distinto, se combate
 * con otras cosas (límites por identidad, análisis de las entradas, revisión
 * manual de los récords altos) y ninguna de ellas cabe en esta fase. Queda dicho
 * para que no aparezca dentro de seis meses como una sorpresa.
 *
 * ═══ EL RELOJ DE PARED, Y POR QUÉ LOS DOS MÁRGENES SON DISTINTOS ═══
 *
 * La duración declarada se saca de la repetición: `tics ÷ tickHz` segundos. El
 * tiempo de pared se saca de los dos avisos. Y no se exige que se parezcan, se
 * exige que no se contradigan, con un margen ancho por arriba y estrecho por
 * abajo — porque las dos direcciones significan cosas distintas:
 *
 *   · POR ABAJO (la partida dice durar más de lo que ha pasado) NO HAY EXCUSA
 *     POSIBLE. Sesenta segundos de juego no caben en cinco de reloj: eso es una
 *     repetición generada, o una buena reproducida a toda velocidad. El margen es
 *     estrecho y lo único que absorbe es el desfase entre el reloj del móvil y el
 *     del servidor y lo que tarda la petición en llegar.
 *   · POR ARRIBA (ha pasado más tiempo del que dice la partida) HAY EXCUSAS DE
 *     SOBRA Y SON LO NORMAL: el bucle de fotogramas tira el tiempo que se acumula
 *     con la app al fondo —está razonado en `app/src/arcade/bucle.ts`— así que
 *     quien atiende una llamada a mitad vuelve a una partida donde no ha pasado
 *     nada mientras el reloj de pared seguía. Rechazar eso sería tirar el récord
 *     de alguien por haber recibido un mensaje.
 *
 * El margen de arriba existe igual, ancho, porque un aviso de inicio guardado
 * durante horas y usado para colar una repetición fabricada con calma es
 * exactamente lo que el par de comprobaciones tiene que encarecer.
 *
 * ═══ LOS RÉCORDS VIVEN EN MEMORIA, Y ESO ES UNA LIMITACIÓN DE VERDAD ═══
 *
 * Cada despliegue de Render reemplaza la instancia y se lleva por delante la tabla
 * entera. El §6 del diseño ya cuenta esto de las mesas y aquí vale igual, con un
 * agravante: una mesa perdida es una partida cortada, y una tabla de récords
 * perdida es el trabajo de todo el mundo.
 *
 * No se ha resuelto en esta fase y se dice en vez de disimularse. Lo que hace
 * falta —el mismo almacén de fichero que `mesas.ts` ya tiene montado, o Mongo
 * cuando haya— es media tarde y no cabía aquí. Mientras tanto, la tabla es una
 * demostración de que la verificación funciona, no un producto.
 */
import { randomInt, randomUUID } from 'node:crypto';
import {
  exigeReejecutabilidad,
  manifiestoDeArcadeSiExiste,
  tieneReloj,
} from '../../../shared/arcade';
import type { ArcadeId, ManifiestoDeArcade } from '../../../shared/arcade';
import { puntuacionDe } from '../../../shared/arcade/juegos/puntuaciones';
import { leerRepeticion, reejecutar, RepeticionMalFormada } from './repeticiones';
import type { MotivoMalFormada, Repeticion } from './repeticiones';

// ---------------------------------------------------------------------------
// Los números
// ---------------------------------------------------------------------------

/**
 * Cuánto vale un aviso de inicio antes de caducar.
 *
 * Dos horas. Tiene que ser holgadamente mayor que la partida más larga que se
 * admite —media hora, ver `TOPE_DE_SEGUNDOS`— porque el reloj de pared puede
 * correr mucho más que la partida cuando la app se va al fondo. Y no puede ser
 * eterno: un aviso guardado es una licencia para subir una repetición fabricada
 * con calma, y caducarlo es lo que pone prisa.
 */
export const VIDA_DEL_AVISO_MS = 2 * 60 * 60 * 1000;

/** Cuántos avisos abiertos se guardan a la vez, para que la tabla no crezca sola. */
const TOPE_DE_AVISOS = 5000;

/** Cuántos récords se guardan por arcade. */
const RECORDS_POR_ARCADE = 50;

/**
 * Lo más deprisa que se admite haber jugado, comparado con lo declarado.
 *
 * La mitad de lo declarado, y encima la holgura fija de aquí abajo. Ver la
 * cabecera del fichero para por qué este margen es estrecho y el de arriba ancho.
 */
const MINIMO_DE_PARED = 0.5;
/**
 * Y tres segundos fijos encima.
 *
 * Tres y no medio porque el reloj de un móvil puede ir desajustado de verdad
 * —segundos, no milisegundos— y porque la petición viaja. Lo que se regala con
 * esta holgura es que alguien declare una partida de hasta seis segundos y la suba
 * en el acto sin jugarla; una partida de seis segundos de este juego vale tres o
 * cuatro puntos y no entra en ninguna tabla, así que el regalo no compra nada.
 * Lo que se evita es rechazar el récord de alguien con el reloj mal puesto, que sí
 * duele.
 */
const HOLGURA_ABAJO_MS = 3000;

/** Y lo más despacio. Ancho a propósito: irse al fondo es lo normal. */
const MAXIMO_DE_PARED = 3;
const HOLGURA_ARRIBA_MS = 120000;

/**
 * ¿CUADRA LA DURACIÓN DECLARADA CON EL TIEMPO QUE HA PASADO DE VERDAD?
 *
 * ═══ POR QUÉ ESTO ES UNA FUNCIÓN SUELTA Y PURA ═══
 *
 * Para poder vacunarla. Comprobar el margen de arriba desde fuera exigiría que la
 * batería esperase más de dos minutos con una partida abierta, y una comprobación
 * que tarda dos minutos es una comprobación que alguien acaba quitando de la
 * batería. Sacándola aquí, `verify:marcador` la llama con números y ve las tres
 * respuestas en un milisegundo — y la que usa `registrarRecord` es exactamente
 * ésta, no una copia.
 *
 * Los dos márgenes son deliberadamente asimétricos y el porqué está en la cabecera
 * del fichero: por abajo no hay excusa posible y por arriba las hay de sobra.
 */
export function veredictoDelReloj(
  declaradoMs: number,
  paredMs: number,
): 'cuadra' | 'mas-rapido-que-el-reloj' | 'mas-lento-que-el-reloj' {
  if (paredMs < declaradoMs * MINIMO_DE_PARED - HOLGURA_ABAJO_MS) return 'mas-rapido-que-el-reloj';
  if (paredMs > declaradoMs * MAXIMO_DE_PARED + HOLGURA_ARRIBA_MS) return 'mas-lento-que-el-reloj';
  return 'cuadra';
}

// ---------------------------------------------------------------------------
// El aviso de inicio
// ---------------------------------------------------------------------------

/** Un aviso de inicio abierto. */
interface Aviso {
  partida: string;
  arcade: ArcadeId;
  semilla: number;
  /** Cuándo se dio, en milisegundos de reloj de pared del SERVIDOR. */
  desde: number;
}

/** Lo que se le devuelve al dispositivo al anunciar el inicio. */
export interface InicioAnunciado {
  partida: string;
  arcade: ArcadeId;
  /**
   * La semilla de esta partida. LA ELIGE EL SERVIDOR.
   *
   * Viaja al dispositivo porque el reductor corre allí y la necesita para
   * sembrar; y no es un secreto que haya que esconder —quien juega ve su propia
   * partida entera de todas formas—. Lo que compra no es ocultarla: es que no la
   * ELIJA. Sin esto, quien quiera un récord prueba semillas en su móvil hasta que
   * le salga una fácil y después juega esa, honradamente, y la repetición cuadra.
   */
  semilla: number;
  /** Cuándo caduca, para que la app pueda decirlo en vez de fallar al subir. */
  caduca: number;
}

const AVISOS = new Map<string, Aviso>();

/** Este arcade no admite récords, y aquí está por qué. */
export class ArcadeSinRecords extends Error {
  constructor(
    public readonly arcade: ArcadeId,
    public readonly porque: 'no-instalado' | 'sin-marcador' | 'sin-reloj',
    detalle: string,
  ) {
    super(detalle);
    this.name = 'ArcadeSinRecords';
  }
}

/** El manifiesto de un arcade que de verdad puede tener récords, o falla. */
function elQuePuedeTenerRecords(arcade: ArcadeId): ManifiestoDeArcade {
  const m = manifiestoDeArcadeSiExiste(arcade);
  if (m === undefined) {
    throw new ArcadeSinRecords(arcade, 'no-instalado', `«${arcade}» no está instalado aquí.`);
  }
  if (!exigeReejecutabilidad(m)) {
    throw new ArcadeSinRecords(
      arcade,
      'sin-marcador',
      `«${arcade}» declara \`marcador: { tipo: 'ninguno' }\`: no publica ninguna cifra, así que ` +
        'no hay récord que llevar. La renuncia está escrita con una palabra en su manifiesto.',
    );
  }
  if (!tieneReloj(m)) {
    throw new ArcadeSinRecords(
      arcade,
      'sin-reloj',
      `«${arcade}» declara \`tickHz: 0\`, y el formato de repetición de hoy cuenta la partida en ` +
        'tics. Un juego por turnos con marcador necesitaría otro formato, y no existe todavía.',
    );
  }
  return m;
}

/**
 * ANUNCIA QUE EMPIEZA UNA PARTIDA. Reparte semilla y apunta la hora.
 *
 * La semilla sale de `randomInt` de `node:crypto` y no de `Math.random()`, y no
 * es por manía criptográfica: `Math.random()` en V8 es un generador con estado
 * predecible a partir de unas cuantas salidas, así que quien pidiera cincuenta
 * avisos seguidos podría calcular la semilla del siguiente y prepararse la
 * partida antes de empezarla. Cuesta lo mismo hacerlo bien.
 *
 * El rango es el de un entero de 32 bits sin signo porque es lo que `sembrar()`
 * sabe usar: normaliza a eso de todas formas, y mandar algo mayor sería mandar
 * bits que se tiran.
 */
export function anunciarInicio(arcade: ArcadeId): InicioAnunciado {
  const manifiesto = elQuePuedeTenerRecords(arcade);
  limpiarAvisosViejos();

  const aviso: Aviso = {
    partida: randomUUID(),
    arcade: manifiesto.id,
    semilla: randomInt(0, 4294967296),
    desde: Date.now(),
  };
  AVISOS.set(aviso.partida, aviso);

  return {
    partida: aviso.partida,
    arcade: aviso.arcade,
    semilla: aviso.semilla,
    caduca: aviso.desde + VIDA_DEL_AVISO_MS,
  };
}

/**
 * Tira los avisos caducados, y los más viejos si hay demasiados.
 *
 * Se llama al anunciar y no con un temporizador: un `setInterval` en el servidor
 * es una cosa más que sobrevive a que nadie use la función, y aquí el trabajo solo
 * aparece cuando alguien juega. El tope duro está por si alguien pide avisos en
 * bucle: sin él, esta tabla es un sitio donde un desconocido escribe sin límite.
 */
function limpiarAvisosViejos(): void {
  const ahora = Date.now();
  for (const [id, aviso] of AVISOS) {
    if (ahora - aviso.desde > VIDA_DEL_AVISO_MS) AVISOS.delete(id);
  }
  if (AVISOS.size <= TOPE_DE_AVISOS) return;
  /*
   * `Map` conserva el orden de inserción, así que los primeros son los más
   * viejos. Se tiran esos, que es lo menos malo: tirar los recientes castigaría a
   * quien está jugando ahora mismo.
   */
  const sobran = AVISOS.size - TOPE_DE_AVISOS;
  let quitados = 0;
  for (const id of AVISOS.keys()) {
    if (quitados >= sobran) break;
    AVISOS.delete(id);
    quitados++;
  }
}

/** Cuántos avisos hay abiertos. Para el diagnóstico y para las pruebas. */
export function avisosAbiertos(): number {
  return AVISOS.size;
}

/** Tira todo. Para las pruebas, que necesitan empezar de cero. */
export function olvidarLosMarcadores(): void {
  AVISOS.clear();
  RECORDS.clear();
}

// ---------------------------------------------------------------------------
// El veredicto
// ---------------------------------------------------------------------------

/** Por qué NO se acepta un récord. UNIÓN CERRADA, como todo lo que decide algo. */
export type MotivoDeRechazo =
  /** La repetición ni siquiera tiene forma de repetición. Trae el motivo dentro. */
  | 'repeticion-mal-formada'
  /**
   * No hay ningún aviso de inicio con ese identificador.
   *
   * Es el motivo por el que se cae UNA CIFRA SUELTA: sin aviso no hay semilla,
   * sin semilla no hay reejecución, y sin reejecución no hay nada que creerse.
   */
  | 'sin-aviso-de-inicio'
  /** El aviso existía y ha caducado. */
  | 'aviso-caducado'
  /** El aviso era de otro arcade. */
  | 'aviso-de-otro-arcade'
  /** La cifra declarada no es la que sale al reejecutar. */
  | 'cifra-que-no-sale'
  /** Ha pasado menos tiempo del que la partida dice durar. */
  | 'mas-rapido-que-el-reloj'
  /** Ha pasado muchísimo más. */
  | 'mas-lento-que-el-reloj';

/** Un récord aceptado. */
export interface RecordDeArcade {
  arcade: ArcadeId;
  partida: string;
  cifra: number;
  /** Cuánto duró la partida, en tics del juego. */
  tics: number;
  /** Cuándo se aceptó. */
  cuando: number;
  /**
   * El estado final serializado con `canonico.ts`.
   *
   * Se guarda porque es lo que permite volver a discutir un récord dentro de seis
   * meses: si alguien cambia una regla del juego, la misma repetición dará otro
   * estado y esta huella lo dirá. Sin ella, un cambio de reglas invalida en
   * silencio todos los récords anteriores y nadie se entera.
   *
   * ═══ ES LA DEL ESTADO REEJECUTADO, Y TIENE QUE SERLO ═══
   *
   * No es la del estado que hubo en el aparato: el aparato no manda su estado, y
   * si lo mandara no habría que creérselo — la mitad del sentido de esta ruta es
   * que el servidor no se fía de lo que le cuentan. Lo que se archiva es lo que
   * calculó LA AUTORIDAD con la semilla que ella misma repartió.
   *
   * Que además sea el estado que el jugador tuvo delante no es una casualidad ni
   * una esperanza: se sostiene sobre que la regla de expansión de
   * `repeticiones.movimientosDe` sea la misma con la que graba el dispositivo. Eso
   * ESTUVO ROTO —un paso de desfase— y entonces esta huella describía, en más de
   * la mitad de los récords, una partida que nadie jugó. No se arregló aquí porque
   * aquí no estaba el fallo; se arregló en la expansión, y lo que impide que
   * vuelva es el tercer escalón de `verify:determinismo`, que compara la huella de
   * jugar con la de expandir esa misma partida.
   */
  huella: string;
}

/** Lo que sale de intentar registrar un récord. */
export type Veredicto =
  | { acepta: true; record: RecordDeArcade; paredMs: number; declaradoMs: number }
  | {
      acepta: false;
      motivo: MotivoDeRechazo;
      /** Si el motivo es `repeticion-mal-formada`, cuál en concreto. */
      detalle: MotivoMalFormada | null;
      porque: string;
    };

const RECORDS = new Map<ArcadeId, RecordDeArcade[]>();

/**
 * REGISTRA UN RÉCORD, o dice exactamente por qué no.
 *
 * ═══ POR QUÉ DEVUELVE UN VEREDICTO Y NO LANZA ═══
 *
 * Porque el rechazo es la situación NORMAL de esta función, no una avería. La
 * mitad de lo que llega aquí va a ser una repetición que no cuadra —un móvil
 * manipulado, una versión vieja de la app, alguien probando— y con excepciones
 * todo eso pasaría por el mismo `catch`, que es donde los motivos se confunden.
 *
 * Con un veredicto, la ruta traduce cada motivo a su código HTTP y
 * `verify:marcador` comprueba que cada trampa concreta se cae POR SU MOTIVO y no
 * por otro. Un comprobador que solo mire «lo rechazó» pasaría en verde el día que
 * todo se rechace por un fallo tonto.
 */
export function registrarRecord(crudo: unknown): Veredicto {
  let repeticion: Repeticion;
  try {
    repeticion = leerRepeticion(crudo);
  } catch (error) {
    if (error instanceof RepeticionMalFormada) {
      return {
        acepta: false,
        motivo: 'repeticion-mal-formada',
        detalle: error.motivo,
        porque: error.message,
      };
    }
    throw error;
  }

  const aviso = AVISOS.get(repeticion.partida);
  if (aviso === undefined) {
    return {
      acepta: false,
      motivo: 'sin-aviso-de-inicio',
      detalle: null,
      porque:
        'No hay ninguna partida abierta con ese identificador. Una puntuación sin aviso de ' +
        'inicio es una puntuación sin semilla, y sin semilla no se puede reejecutar nada: o sea, ' +
        'es una cifra que habría que creerse. Eso no se hace aquí.',
    };
  }

  const ahora = Date.now();
  if (ahora - aviso.desde > VIDA_DEL_AVISO_MS) {
    AVISOS.delete(aviso.partida);
    return {
      acepta: false,
      motivo: 'aviso-caducado',
      detalle: null,
      porque: `Ese aviso de inicio es de hace ${Math.floor((ahora - aviso.desde) / 60000)} minutos y ya no vale.`,
    };
  }
  if (aviso.arcade !== repeticion.arcade) {
    return {
      acepta: false,
      motivo: 'aviso-de-otro-arcade',
      detalle: null,
      porque: `Ese aviso se dio para «${aviso.arcade}» y la repetición dice ser de «${repeticion.arcade}».`,
    };
  }

  /*
   * EL AVISO SE GASTA AQUÍ, ANTES DE REEJECUTAR Y PASE LO QUE PASE DESPUÉS.
   *
   * Es de un solo uso, y esa es media defensa: sin esto, quien tuviera un aviso
   * válido podría subir repeticiones en bucle hasta dar con una que cuadre —o
   * simplemente hacer trabajar al servidor gratis, que es lo mismo con menos
   * imaginación—. Y se gasta ANTES de la reejecución para que un rechazo no deje
   * el aviso vivo: si no, el bucle sigue siendo posible probando cosas que fallan.
   */
  AVISOS.delete(aviso.partida);

  const manifiesto = manifiestoDeArcadeSiExiste(repeticion.arcade);
  /* No puede pasar —`leerRepeticion` ya lo comprobó— y si pasara sería un
   * desinstalar a mitad de partida. Se contesta como lo que es. */
  if (manifiesto === undefined) {
    return {
      acepta: false,
      motivo: 'repeticion-mal-formada',
      detalle: 'arcade-desconocido',
      porque: `«${repeticion.arcade}» ha dejado de estar instalado entre el aviso y el récord.`,
    };
  }

  const declaradoMs = (repeticion.tics / manifiesto.tickHz) * 1000;
  const paredMs = ahora - aviso.desde;
  const delReloj = veredictoDelReloj(declaradoMs, paredMs);

  if (delReloj !== 'cuadra') {
    return {
      acepta: false,
      motivo: delReloj,
      detalle: null,
      porque:
        `La partida dice durar ${(declaradoMs / 1000).toFixed(1)} s y entre el aviso de inicio y ` +
        `el de fin han pasado ${(paredMs / 1000).toFixed(1)} s. ` +
        (delReloj === 'mas-rapido-que-el-reloj'
          ? 'Eso no es jugar deprisa: es que la partida no se ha jugado.'
          : 'El margen por arriba es ancho a propósito —irse al fondo es lo normal— y esto lo pasa de largo.'),
    };
  }

  /*
   * Y AQUÍ SE DEJA DE CREER AL DISPOSITIVO: el mismo reductor, la semilla del
   * servidor, y a ver qué sale.
   */
  const salida = reejecutar(repeticion, aviso.semilla);
  const cifraDeVerdad = puntuacionDe(repeticion.arcade, salida.estado);

  if (cifraDeVerdad !== repeticion.cifra) {
    return {
      acepta: false,
      motivo: 'cifra-que-no-sale',
      detalle: null,
      porque:
        `La repetición dice ${repeticion.cifra} y al reejecutarla salen ${cifraDeVerdad}. ` +
        'Puede ser una repetición fabricada, o una app de una versión anterior cuyas reglas ya no ' +
        'son éstas: las dos cosas se arreglan igual, no aceptando la cifra.',
    };
  }

  const record: RecordDeArcade = {
    arcade: repeticion.arcade,
    partida: repeticion.partida,
    cifra: cifraDeVerdad,
    tics: repeticion.tics,
    cuando: ahora,
    huella: salida.huella,
  };
  guardar(record, manifiesto);
  return { acepta: true, record, paredMs, declaradoMs };
}

/**
 * Mete el récord en la tabla, ordenada según diga el manifiesto.
 *
 * El sentido —si gana el más alto o el más bajo— es CONTENIDO del manifiesto y no
 * una decisión de este fichero: un juego de tiempos gana bajando, y escribirlo
 * aquí obligaría a venir a tocar el servidor cada vez que entre un arcade de otra
 * clase.
 *
 * El comparador es explícito, con `<` y `>`, y no `a - b`: `verify:pureza`
 * prohíbe los `sort` sin comparador porque el orden lo decidiría el motor, y la
 * costumbre de escribirlo entero vale también aquí, donde no está prohibido.
 */
function guardar(record: RecordDeArcade, manifiesto: ManifiestoDeArcade): void {
  const tabla = RECORDS.get(record.arcade) ?? [];
  tabla.push(record);
  const masAlto = manifiesto.marcador.tipo === 'cifra' && manifiesto.marcador.sentido === 'mas-alto';
  tabla.sort((a, b) => {
    if (a.cifra === b.cifra) return a.cuando < b.cuando ? -1 : a.cuando > b.cuando ? 1 : 0;
    if (masAlto) return a.cifra > b.cifra ? -1 : 1;
    return a.cifra < b.cifra ? -1 : 1;
  });
  RECORDS.set(record.arcade, tabla.slice(0, RECORDS_POR_ARCADE));
}

/** La tabla de un arcade, de mejor a peor. Vacía si nadie ha jugado. */
export function recordsDe(arcade: ArcadeId): readonly RecordDeArcade[] {
  return RECORDS.get(arcade) ?? [];
}
