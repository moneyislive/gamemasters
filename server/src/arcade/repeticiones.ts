/**
 * LA REPETICIÓN DE UNA PARTIDA: lo que se sube en vez de una cifra.
 *
 * ═══ UNA PUNTUACIÓN ENVIADA COMO CIFRA ES UNA PUNTUACIÓN INVENTADA ═══
 *
 * Es la frase entera de esta fase y conviene no suavizarla. Un `POST` con
 * `{ puntos: 999999 }` lo manda cualquiera con veinte segundos y un depurador
 * abierto —o con `curl`, que ni siquiera exige abrir la app—. No hace falta ser
 * programador: hace falta saber que existe la petición.
 *
 * Lo que sí se puede comprobar es la PARTIDA. El dispositivo sube la semilla que
 * le dio el servidor y todo lo que hizo el dedo; el servidor reejecuta el MISMO
 * reductor de `shared/` —el mismo fichero, no una copia— y mira qué cifra sale.
 * Si no coincide con la declarada, el récord se cae.
 *
 * ═══ LO QUE ESTO NO ES, DICHO ANTES DE QUE ALGUIEN LO VENDA COMO SEGURIDAD ═══
 *
 * NO ES INFALIBLE Y NO HAY QUE PRESENTARLO COMO TAL. Lo que consigue es exacto y
 * pequeño: quien quiera un récord falso ya no puede escribir un número — tiene
 * que producir una secuencia de entradas que, jugada de verdad, dé esa cifra. O
 * sea que tiene que escribir un robot que juegue bien, con la semilla que le tocó
 * y no otra, y esperar el tiempo que dura la partida.
 *
 * Eso no lo impide nada del lado del servidor y no se puede impedir: el juego
 * corre en el aparato de quien juega, y ahí manda quien juega. Lo que cambia es
 * el COSTE de la trampa, que pasa de cero a mucho — y, sobre todo, deja de estar
 * al alcance de quien solo sabe editar un JSON.
 *
 * ═══ POR QUÉ LA REPETICIÓN NO LLEVA LOS TICS DENTRO ═══
 *
 * Una partida de cuarenta segundos a sesenta hercios son dos mil cuatrocientos
 * tics y unas cincuenta decisiones del dedo. Mandar los tics sería mandar dos mil
 * cuatrocientas líneas idénticas para decir lo que el manifiesto ya dice: que a
 * este arcade le entran sesenta tics por segundo, seguidos y sin huecos.
 *
 * Así que viaja lo que NO se puede deducir —qué se hizo y en qué tic— más cuántos
 * tics hubo en total, y este fichero lo expande. LA REGLA DE EXPANSIÓN ES EL
 * CONTRATO y está escrita una sola vez, aquí abajo, en `movimientosDe`.
 *
 * Se paga un precio y conviene verlo: el servidor ya no reejecuta «lo que el
 * dispositivo dijo que pasó» sino «lo que tuvo que pasar si el dispositivo dice
 * la verdad sobre las entradas». Es exactamente lo que se quiere — un anfitrión
 * que se saltara tics o los metiera de más NO puede contarlo en la repetición,
 * porque no hay dónde escribirlo.
 *
 * ═══ Y POR QUÉ TODO LO QUE LLEGA SE MIRA CON LUPA ═══
 *
 * Porque esto es la única ruta del motor de arcade donde un desconocido, sin
 * cuenta y sin asiento, le da trabajo al servidor. Una repetición con un millón
 * de tics es un bucle de un millón de vueltas en el único hilo de Node: no roba
 * nada, deja el servicio quieto — y las veladas viven en el mismo proceso.
 *
 * De ahí los topes de aquí abajo, que se miran ANTES de reejecutar nada y no
 * después. Es la forma en que el §10 del diseño describe `verify:presupuesto`:
 * «se rechaza antes de bloquear el bucle de eventos».
 */
import { canonico, porQueNoEsCanonico } from '../../../shared/mecanicas/canonico';
import {
  exigeReejecutabilidad,
  manifiestoDeArcadeSiExiste,
  movimientoDeTic,
  reejecutarEn,
  tieneReloj,
} from '../../../shared/arcade';
import type { ArcadeId, ManifiestoDeArcade, MovimientoRegistrado } from '../../../shared/arcade';
import { medirMovimiento } from './presupuesto';

/**
 * Cuánto puede durar como mucho una partida que se suba, en segundos de juego.
 *
 * Media hora. No es una regla del juego —ningún arcade dice cuánto dura— sino un
 * techo del TRABAJO que un desconocido puede pedirle al servidor: media hora a
 * sesenta hercios son ciento ocho mil pasos del reductor, que en la máquina de
 * Render se reejecutan en un par de segundos largos. Un techo más alto convierte
 * esta ruta en una forma cómoda de dejar el proceso quieto.
 *
 * Está en SEGUNDOS y no en tics a propósito: el tope tiene que significar lo
 * mismo para un arcade de sesenta hercios y para uno de cuatro, y en tics no lo
 * significaría.
 */
export const TOPE_DE_SEGUNDOS = 1800;

/**
 * Cuántas entradas del dedo caben en una repetición.
 *
 * Veinte mil son más de siete por segundo durante media hora seguida, o sea muy
 * por encima de lo que una mano hace. Se acota igual porque la lista la escribe
 * quien manda la petición y nada le obliga a ser humano.
 */
export const TOPE_DE_ENTRADAS = 20000;

/**
 * El prefijo que reserva la plataforma. Ver `shared/arcade/movimiento.ts`.
 *
 * ═══ ESTÁ ESCRITO DOS VECES Y ESO ES UNA DEUDA, DICHA AQUÍ ═══
 *
 * La otra copia es `PREFIJO_RESERVADO` en `mesas.ts`, privada de aquel módulo.
 * Duplicar una cadena que decide qué se rechaza es exactamente la clase de cosa
 * que se separa sin que nadie se entere.
 *
 * No se importa de allí porque traería la maquinaria entera de mesas —candados,
 * almacén, plazos— a un fichero que no tiene mesas; y no se sube a
 * `shared/arcade/movimiento.ts`, que es donde le tocaría vivir y donde el propio
 * contrato ya lo documenta en prosa, porque esa carpeta es núcleo y esta fase
 * tiene prohibido tocarla. Queda apuntado con dirección: el día que el núcleo
 * exporte `PREFIJO_RESERVADO`, estas dos líneas se borran.
 */
const PREFIJO_RESERVADO = 'arcade:';

/** Una cosa que hizo el dedo, y en qué tic la hizo. */
export interface EntradaDeRepeticion {
  tic: number;
  tipo: string;
  carga?: unknown;
}

/** Una partida entera, tal como la sube el dispositivo. Ya revisada. */
export interface Repeticion {
  arcade: ArcadeId;
  /** Contra qué aviso de inicio se juega. Lo dio el servidor. Ver `marcadores.ts`. */
  partida: string;
  /** Cuántos tics entraron por el reductor, en total. */
  tics: number;
  entradas: readonly EntradaDeRepeticion[];
  /** Lo que el dispositivo DICE que sacó. Se contrasta, no se cree. */
  cifra: number;
}

/**
 * Por qué una repetición no vale. UNIÓN CERRADA, y no un texto.
 *
 * Es la misma disciplina que `MotivoDeRechazo` en el árbitro y por la misma
 * razón: quien recibe esto tiene que poder decidir qué hacer sin comparar
 * cadenas, y un cambio de redacción no puede llevarse por delante esa decisión.
 * Aquí además importa para otra cosa: `verify:marcador` exige que cada trampa
 * concreta salte por SU motivo, y no le vale con que salte por alguno.
 */
export type MotivoMalFormada =
  /** No es ni un objeto con los campos que hacen falta. */
  | 'no-es-una-repeticion'
  /** Este servidor no tiene instalado ese arcade. */
  | 'arcade-desconocido'
  /** Ese arcade no publica ninguna cifra, así que no hay récord que verificar. */
  | 'arcade-sin-marcador'
  /** Ese arcade no tiene reloj: una repetición contada en tics no significa nada. */
  | 'arcade-sin-reloj'
  /** Cero tics, tics no enteros, o más de los que caben. */
  | 'duracion-imposible'
  /** Más entradas de las que caben. */
  | 'demasiadas-entradas'
  /** Una entrada sin `tic` entero o sin `tipo` con texto. */
  | 'entrada-mal-formada'
  /** Una entrada en un tic que no existe en esta partida. */
  | 'entrada-fuera-de-la-partida'
  /** Las entradas no vienen en orden de tic. */
  | 'entradas-desordenadas'
  /** Alguien intenta colar un `arcade:tic` a mano. */
  | 'movimiento-reservado'
  /** La carga de una entrada no sobrevive a `canonico.ts`. */
  | 'carga-no-serializable'
  /** La cifra declarada no es un entero. */
  | 'cifra-imposible';

/** Una repetición que no se puede ni empezar a mirar. */
export class RepeticionMalFormada extends Error {
  constructor(
    public readonly motivo: MotivoMalFormada,
    detalle: string,
  ) {
    super(detalle);
    this.name = 'RepeticionMalFormada';
  }
}

/**
 * Convierte lo que llegó por la red en una repetición, o se niega.
 *
 * ═══ POR QUÉ NO HAY NI UN `as` SIN COMPROBAR ═══
 *
 * Porque esto viene de fuera. El contrato de `Movimiento.carga` ya dice que LO
 * QUE LLEGA NO ESTÁ VALIDADO y que la comprobación baja al reductor; aquí hay
 * otra capa antes, y no es duplicarla: el reductor comprueba que un rumbo sea
 * −1, 0 o 1, y esto comprueba que la petición tenga forma de partida. Son dos
 * preguntas distintas y la segunda no la puede contestar el juego.
 */
export function leerRepeticion(crudo: unknown): Repeticion {
  if (typeof crudo !== 'object' || crudo === null) {
    throw new RepeticionMalFormada('no-es-una-repeticion', 'El cuerpo no es un objeto.');
  }
  const c = crudo as Record<string, unknown>;

  if (typeof c.arcade !== 'string' || c.arcade.length === 0) {
    throw new RepeticionMalFormada('no-es-una-repeticion', 'Falta `arcade`.');
  }
  if (typeof c.partida !== 'string' || c.partida.length === 0) {
    throw new RepeticionMalFormada('no-es-una-repeticion', 'Falta `partida`.');
  }

  const manifiesto = manifiestoDeArcadeSiExiste(c.arcade);
  if (manifiesto === undefined) {
    throw new RepeticionMalFormada(
      'arcade-desconocido',
      `«${c.arcade}» no es un arcade instalado en este servidor.`,
    );
  }
  if (!exigeReejecutabilidad(manifiesto)) {
    throw new RepeticionMalFormada(
      'arcade-sin-marcador',
      `«${manifiesto.id}» declara \`marcador: { tipo: 'ninguno' }\`, así que no publica ninguna ` +
        'cifra y no hay nada que verificar. Un récord de un juego sin marcador no es un récord ' +
        'rechazado: es una petición que no significa nada.',
    );
  }
  if (!tieneReloj(manifiesto)) {
    throw new RepeticionMalFormada(
      'arcade-sin-reloj',
      `«${manifiesto.id}» declara \`tickHz: 0\`, así que nadie le mete tics y una repetición ` +
        'contada en tics no se puede expandir. Un juego por turnos con marcador necesitaría otro ' +
        'formato de repetición, y ese día se escribe: hoy no hay ninguno.',
    );
  }

  if (typeof c.cifra !== 'number' || !Number.isInteger(c.cifra) || c.cifra < 0) {
    throw new RepeticionMalFormada(
      'cifra-imposible',
      'La cifra declarada tiene que ser un entero de cero en adelante.',
    );
  }

  const tope = topeDeTics(manifiesto);
  if (typeof c.tics !== 'number' || !Number.isInteger(c.tics) || c.tics < 1 || c.tics > tope) {
    throw new RepeticionMalFormada(
      'duracion-imposible',
      `\`tics\` tiene que ser un entero entre 1 y ${tope} (${TOPE_DE_SEGUNDOS} segundos a ` +
        `${manifiesto.tickHz} Hz). Ha llegado ${String(c.tics)}.`,
    );
  }

  if (!Array.isArray(c.entradas)) {
    throw new RepeticionMalFormada('no-es-una-repeticion', 'Falta la lista `entradas`.');
  }
  if (c.entradas.length > TOPE_DE_ENTRADAS) {
    throw new RepeticionMalFormada(
      'demasiadas-entradas',
      `Han llegado ${c.entradas.length} entradas y el tope son ${TOPE_DE_ENTRADAS}.`,
    );
  }

  const entradas: EntradaDeRepeticion[] = [];
  let anterior = -1;
  for (let i = 0; i < c.entradas.length; i++) {
    const cruda = c.entradas[i] as unknown;
    if (typeof cruda !== 'object' || cruda === null) {
      throw new RepeticionMalFormada('entrada-mal-formada', `La entrada ${i} no es un objeto.`);
    }
    const e = cruda as Record<string, unknown>;
    if (typeof e.tic !== 'number' || !Number.isInteger(e.tic)) {
      throw new RepeticionMalFormada('entrada-mal-formada', `La entrada ${i} no trae un tic entero.`);
    }
    if (typeof e.tipo !== 'string' || e.tipo.length === 0) {
      throw new RepeticionMalFormada('entrada-mal-formada', `La entrada ${i} no trae `+'`tipo`.');
    }
    /*
     * EL PREFIJO `arcade:` LO RESERVA LA PLATAFORMA, y aquí esa reserva deja de
     * ser vocabulario y pasa a ser una defensa: sin esto, cualquiera podría meter
     * `arcade:tic` a mano entre las entradas y darse pasos de más sin que el
     * contador de tics —lo único que se contrasta con el reloj de pared— subiera.
     * O sea, jugar una partida de cinco minutos declarando que duró diez segundos.
     * Es la misma razón por la que `mesas.ts` tiene su `MovimientoReservado`.
     */
    if (e.tipo.startsWith(PREFIJO_RESERVADO)) {
      throw new RepeticionMalFormada(
        'movimiento-reservado',
        `La entrada ${i} dice ser «${e.tipo}», y el prefijo \`arcade:\` lo reserva la plataforma. ` +
          'Los tics no se mandan: se deducen del campo `tics`, que es lo único que se contrasta ' +
          'con el reloj de pared.',
      );
    }
    if (e.tic < 0 || e.tic > (c.tics as number)) {
      throw new RepeticionMalFormada(
        'entrada-fuera-de-la-partida',
        `La entrada ${i} dice ocurrir en el tic ${e.tic} y la partida duró ${String(c.tics)}.`,
      );
    }
    if (e.tic < anterior) {
      throw new RepeticionMalFormada(
        'entradas-desordenadas',
        `La entrada ${i} va en el tic ${e.tic} y la anterior en el ${anterior}. El orden es la ` +
          'mitad de lo que se reejecuta: dos movimientos cruzados dan otra partida.',
      );
    }
    anterior = e.tic;

    if ('carga' in e && e.carga !== undefined) {
      const malo = porQueNoEsCanonico(e.carga);
      if (malo !== null) {
        throw new RepeticionMalFormada(
          'carga-no-serializable',
          `La carga de la entrada ${i} no sobrevive a la serialización canónica: ${malo}`,
        );
      }
      entradas.push({ tic: e.tic, tipo: e.tipo, carga: e.carga });
    } else {
      entradas.push({ tic: e.tic, tipo: e.tipo });
    }
  }

  return {
    arcade: manifiesto.id,
    partida: c.partida,
    tics: c.tics,
    entradas,
    cifra: c.cifra,
  };
}

/** Cuántos tics caben en una partida de este arcade. */
export function topeDeTics(manifiesto: ManifiestoDeArcade): number {
  return Math.floor(TOPE_DE_SEGUNDOS * manifiesto.tickHz);
}

/**
 * LA REGLA DE EXPANSIÓN, que es el contrato entero de este formato.
 *
 * ═══ EL TIC DE UNA ENTRADA ES CUÁNTOS PASOS SE HABÍAN DADO YA ═══
 *
 * O sea: una entrada marcada en el tic T se aplica DESPUÉS del paso T. El tic 0
 * es «antes de que empiece nada» —por eso el movimiento que arranca la partida
 * va ahí— y a partir de ahí, para cada paso de 1 a `tics`: primero el tic, y
 * luego todo lo que el dedo hizo con ese contador puesto.
 *
 * ═══ ESTA CONVENCIÓN ESTUVO AL REVÉS, Y ASÍ SE VEÍA ═══
 *
 * La primera versión de esta función metía las entradas del tic T ANTES del paso
 * T, y la prosa afirmaba que los grabadores hacían lo mismo. No lo hacían:
 * `app/src/arcade/bucle.ts` apunta `tic: ticAhora.current` DESPUÉS de haber
 * subido el contador en cada paso, y el robot de `server/scripts/
 * guion-determinismo.ts` apunta `tic: pasos` con `pasos` pasos ya dados. Los dos
 * graban «cuántos pasos llevo», y esto expandía «antes del paso número T».
 *
 * El resultado era un desfase de exactamente un paso, y no daba ningún error:
 * medido sobre doscientas partidas del robot, 108 reejecutaban a un estado final
 * DISTINTO y 14 daban otra cifra — o sea récords honrados rechazados con
 * `cifra-que-no-sale`. Casi siempre cuadraba, y de vez en cuando no: exactamente
 * el falso negativo que la cabecera de `bucle.ts` dice existir para evitar.
 * Con la expansión de aquí abajo, las doscientas cuadran al carácter.
 *
 * Da igual CUÁL sea la convención; lo que no da igual es que esté escrita en un
 * solo sitio y que sea la de quien graba. Por eso el tercer escalón de
 * `verify:determinismo` juega con el robot, expande con esta función y compara
 * las dos huellas: la afirmación de la que cuelga el marcador entero dejó de
 * estar solo en esta prosa.
 *
 * La semilla no viene en la repetición: la pone quien llama, y la tiene el
 * servidor porque la repartió él. Si viajara en la repetición, quien juega
 * elegiría la suya y probaría hasta encontrar la fácil.
 */
export function movimientosDe(repeticion: Repeticion, semilla: number): MovimientoRegistrado[] {
  const registrados: MovimientoRegistrado[] = [];
  let siguiente = 0;

  const meterLasDe = (tic: number): void => {
    while (siguiente < repeticion.entradas.length) {
      const e = repeticion.entradas[siguiente];
      if (e === undefined || e.tic !== tic) break;
      registrados.push({
        movimiento: e.carga === undefined ? { tipo: e.tipo } : { tipo: e.tipo, carga: e.carga },
        ctx: { quien: null, azar: semilla, tic, asientos: [] },
      });
      siguiente++;
    }
  };

  /* Lo que se hizo con cero pasos dados: el `empezar` de la partida. */
  meterLasDe(0);
  for (let tic = 1; tic <= repeticion.tics; tic++) {
    registrados.push({
      /*
       * El tic sale de `movimientoDeTic()` de `shared/arcade/reloj.ts` y no de
       * una cadena escrita aquí. Es lo mismo hoy y dejaría de serlo el día que
       * alguien renombrara la constante: entonces el móvil metería una cosa y el
       * servidor reejecutaría otra, el reductor ignoraría ese movimiento
       * desconocido, y TODAS las repeticiones darían cero puntos. Un fallo que se
       * lee como «el marcador rechaza a todo el mundo».
       */
      movimiento: movimientoDeTic(),
      ctx: { quien: null, azar: semilla, tic, asientos: [] },
    });
    /* Y ahora sí, lo que el dedo hizo con el contador ya en `tic`. */
    meterLasDe(tic);
  }
  return registrados;
}

/** Lo que sale de reejecutar una repetición. */
export interface Reejecutada {
  /** El estado final, tal como salió del mismo reductor que corrió en el móvil. */
  estado: unknown;
  /** Cuántos movimientos se aplicaron, tics incluidos. Para el registro. */
  movimientos: number;
  /** El estado final serializado, que es lo que se compara y lo que se guarda. */
  huella: string;
}

/**
 * REEJECUTA la partida. Aquí es donde el servidor deja de fiarse.
 *
 * Usa `reejecutarEn` de `shared/arcade`, o sea EL MISMO REDUCTOR que corrió en el
 * teléfono. No una copia, no una reimplementación «de servidor»: el mismo
 * fichero. Es la mitad concreta de la frase que ordena el árbol —`shared/` son
 * las reglas, `server/` es la autoridad— y la razón por la que la autoridad sale
 * gratis.
 *
 * Empieza desde `undefined` y no desde un estado inicial construido aquí: una
 * partida nace sin estado y es el reductor quien lo monta en el primer
 * movimiento, con la semilla que le llega en el contexto. Montarlo aquí sería
 * escribir una segunda vez, en el servidor, algo que ya está escrito en el juego
 * — y las dos copias se separarían.
 */
export function reejecutar(repeticion: Repeticion, semilla: number): Reejecutada {
  const movimientos = movimientosDe(repeticion, semilla);
  const estado = medirMovimiento(repeticion.arcade, 'repeticion', () =>
    reejecutarEn(repeticion.arcade, undefined, movimientos),
  );
  return { estado, movimientos: movimientos.length, huella: canonico(estado) };
}
