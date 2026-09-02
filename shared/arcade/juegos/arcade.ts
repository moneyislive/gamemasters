/**
 * «EL ARCADE»: el tercer juego-prueba, y el que mide si la pureza era de verdad.
 *
 * Un jugador, sesenta fotogramas por segundo, con marcador. Cae basura del cielo
 * y hay que esquivarla moviendo una nave a izquierda y derecha; cada cosa que
 * pasa de largo suma un punto, y la primera que te toca acaba la partida. No hay
 * más reglas, y la pobreza es deliberada: lo que esta fase prueba no es el juego,
 * es que el motor no necesita turnos y que reejecutar una partida da EXACTAMENTE
 * lo que pasó.
 *
 * ═══ POR QUÉ ESTE JUEGO Y NO OTRO MÁS BONITO ═══
 *
 * Porque las tres propiedades que la fase 3 tiene que probar son propiedades del
 * MANIFIESTO, no de la mecánica, y cualquier riqueza de reglas por encima de eso
 * es riqueza que después hay que mantener sin que compre nada:
 *
 *   · `sede: 'dispositivo'` — el reductor corre en el móvil, en Hermes, a sesenta
 *     hercios. Es donde la divergencia entre motores de JavaScript se nota.
 *   · `tickHz: 60` — el reloj es la mecánica entera. Sin paso fijo el juego corre
 *     al doble de velocidad en un móvil de 120 Hz. Ver `app/src/arcade/bucle.ts`.
 *   · `mueble: 'lienzo'` — píxeles a ritmo de fotograma. Es lo que estrena Skia.
 *   · `marcador: { tipo: 'cifra' }` — y de ahí sale, DERIVADA y no declarada, la
 *     exigencia de reejecutabilidad: `exigeReejecutabilidad()` es cierta para
 *     este juego porque publica una cifra, y por eso `verify:determinismo` y
 *     `verify:marcador` tienen sobre qué morder.
 *
 * ═══ TODA LA ARITMÉTICA ES ENTERA, Y ESO NO ES ESTILO ═══
 *
 * El campo mide 1000 × 1000 MILÉSIMAS, no píxeles. Las velocidades son enteros de
 * milésimas por tic. Las posiciones son enteros. No hay ni una división que no
 * sea `Math.floor` de un cociente, y no hay ni una llamada a las trascendentales
 * de `Math`.
 *
 * La razón está escrita entera en `verify:pureza` y es la que da sentido a la
 * fase: `sin`, `cos`, `pow`, `exp`, `log`, `atan2` e `hypot` son
 * *implementation-approximated* en la especificación de ECMAScript, y Hermes y V8
 * usan librerías matemáticas distintas. Una trayectoria en coma flotante
 * divergiría en el último bit, la repetición dejaría de coincidir con la partida
 * que hubo, y el récord de alguien que jugó limpio saldría rechazado — o al
 * revés: dos jugadores verían partidas distintas con la misma semilla.
 *
 * Con enteros de milésimas eso no puede pasar. La suma, la resta y el producto de
 * enteros pequeños son exactos en un `number` de doble precisión, y `Math.floor`,
 * `Math.abs` y `Math.imul` están fijados al bit. Lo que se pierde —una parábola
 * de verdad, un rebote elástico— no lo echa de menos un juego de esquivar; y el
 * día que un arcade lo eche de menos, el sustituto va en `shared/mecanicas/` como
 * tabla precalculada, que es lo que dice el §5.5 del diseño.
 *
 * ═══ EL JUEGO CUENTA SUS PROPIOS TICS, Y NO SE FÍA DE `ctx.tic` ═══
 *
 * `ContextoMovimiento.tic` dice en qué tic va la partida SEGÚN QUIEN LA HOSPEDA.
 * Este juego lo ignora para la física y lleva su propio contador, que sube de uno
 * en uno con cada `arcade:tic` que entra.
 *
 * No es desconfianza gratuita: es lo que hace que la física no dependa del
 * anfitrión. Si la caída avanzara `vy × (ctx.tic − estado.tic)`, un móvil que se
 * fuera al fondo diez segundos y volviera metería un solo tic con un salto de
 * seiscientos y la basura atravesaría la nave sin tocarla —o la mataría desde el
 * otro lado de la pantalla—. Peor: dos anfitriones con distinta política de
 * puesta al día producirían partidas distintas con el mismo registro, y entonces
 * la repetición no verifica nada.
 *
 * Así que el contrato de este juego con quien lo hospeda es exacto y pequeño: UN
 * TIC ES UN PASO. Cuántos pasos entran y cuándo es problema del bucle, y de ahí
 * sale el paso fijo de `bucle.ts`. Lo que el juego garantiza a cambio es que el
 * mismo número de pasos, en el mismo orden, da el mismo estado en cualquier
 * motor.
 *
 * ═══ POR QUÉ `secretos: false` EN UN JUEGO QUE BARAJA ═══
 *
 * `mecanicas/azar.ts` avisa de que la semilla y el contador son información
 * secreta EN TODO JUEGO QUE BARAJE, porque quien los tenga calcula lo que viene.
 * Aquí se declara `false` a sabiendas, y conviene decir por qué no es un descuido:
 *
 * Los secretos del motor de arcade son secretos ENTRE ASIENTOS —la proyección
 * recorta lo que se le manda a otro—, y aquí no hay otro. Un jugador, un aparato,
 * su propio estado. Declarar `true` obligaría a registrar una proyección y un
 * `loSecreto` para tapar un estado ante nadie, que es ceremonia sin comprobación
 * detrás.
 *
 * Lo que sí se hace con la semilla está en `server/src/arcade/marcadores.ts`, y no
 * es esconderla: es que LA REPARTE EL SERVIDOR al anunciar el inicio. Un jugador
 * no puede probar semillas hasta encontrar la fácil, porque no elige la suya. Eso
 * es autoridad, no proyección, y por eso vive allí y no aquí.
 *
 * ═══ LO QUE ESTE FICHERO NO IMPORTA ═══
 *
 * Nada de `node:`, nada de React, nada de Skia, nada de `server/`, nada de
 * `shared/juegos` y nada de `shared/live`. El mismo fichero lo lee el móvil para
 * jugar y el servidor para verificar el récord, y esa es la línea de la que
 * cuelga todo: `shared/` son las reglas, `server/` es la autoridad.
 */
import { enteroEntre, sembrar } from '../../mecanicas/azar';
import type { Azar } from '../../mecanicas/azar';
import { esTic } from '../reloj';
import type { ContextoMovimiento, Movimiento } from '../movimiento';
import type { ArcadeId, ManifiestoDeArcade } from '../tipos';

/** El identificador de este arcade. */
export const EL_ARCADE: ArcadeId = 'el-arcade';

// ---------------------------------------------------------------------------
// LAS MEDIDAS DEL CAMPO
//
// Todo en MILÉSIMAS de un campo cuadrado de 1000 × 1000, y quien pinta multiplica
// por el tamaño real de la pantalla. El campo es cuadrado y no rectangular a
// propósito: un móvil apaisado y otro vertical tienen que jugar la MISMA partida,
// y si el campo se midiera en píxeles el mismo registro de movimientos daría dos
// resultados según el aparato. Que quepa o no en la pantalla es cosa del mueble.
// ---------------------------------------------------------------------------

/** El ancho y el alto del campo, en milésimas. */
export const CAMPO = 1000;

/** A qué altura vuela la nave. Fija: este juego no sube ni baja. */
export const NAVE_Y = 900;

/** Medio ancho y medio alto de la nave, para el solape. */
export const NAVE_MEDIO_ANCHO = 55;
export const NAVE_MEDIO_ALTO = 30;

/** Medio lado de una cosa que cae. Son cuadradas. */
export const CAIDA_MEDIO = 42;

/**
 * Cuánto se mueve la nave por tic cuando el rumbo no es cero.
 *
 * Doce milésimas por tic a sesenta tics por segundo son 720 milésimas por
 * segundo: cruzar el campo entero cuesta algo menos de segundo y medio, que es lo
 * que hace que esquivar sea una decisión y no un reflejo imposible.
 */
export const VELOCIDAD_NAVE = 12;

/** Lo más lento y lo más rápido que cae algo, en milésimas por tic. */
export const CAIDA_LENTA = 7;
export const CAIDA_RAPIDA = 13;

/**
 * Cada cuántos tics nace algo, al principio y como mucho.
 *
 * ═══ LA DIFICULTAD SUBE POR ESCALONES ENTEROS, Y ESO ES A PROPÓSITO ═══
 *
 * La curva evidente —`intervalo = INICIAL × 0.97 ^ esquivadas`— usa `Math.pow`,
 * que es exactamente una de las funciones que la especificación deja aproximadas
 * y que Hermes y V8 redondean distinto. Una curva de dificultad es el sitio más
 * inocente del mundo para colar una divergencia, y es el ejemplo que el §5.5 del
 * diseño pone con nombre y apellidos.
 *
 * Con una división entera y una resta, la dificultad sube igual de bien y el
 * resultado es el mismo bit en cualquier motor.
 */
export const INTERVALO_INICIAL = 54;
/** Y lo más apretado que llega a ponerse: nueve por segundo largos. */
export const INTERVALO_MINIMO = 15;
/** Cuántas esquivadas hacen falta para apretar un escalón. */
const ESQUIVADAS_POR_ESCALON = 5;
/** Cuántos tics se recorta en cada escalón. */
const TICS_POR_ESCALON = 3;

/**
 * Cuántas cosas puede haber cayendo a la vez.
 *
 * No es un ajuste de dificultad: es un TOPE DEL ESTADO. Una partida larga con la
 * dificultad al máximo tiene unas diez cosas en el aire, así que veinticuatro no
 * se alcanza jugando; existe para que el estado de una partida no pueda crecer sin
 * límite pase lo que pase, que es lo que mira `verify:presupuesto` cuando llegue
 * su fase y lo que impide que una repetición fabricada haga trabajar al servidor
 * más de la cuenta al reejecutarla.
 */
export const TOPE_DE_CAIDAS = 24;

/** A cuántos tics por segundo va esto. */
export const TICK_HZ = 60;

// ---------------------------------------------------------------------------
// EL ESTADO
// ---------------------------------------------------------------------------

/** En qué punto está la partida. */
export type MomentoDelArcade =
  /** Nadie ha empezado todavía: la nave está quieta en el centro. */
  | 'antes'
  /** Cayendo cosas. */
  | 'jugando'
  /** Le ha dado a algo. Se acabó, y la cifra ya no cambia. */
  | 'perdida';

/** Hacia dónde va la nave: izquierda, quieta o derecha. */
export type Rumbo = -1 | 0 | 1;

/** Una cosa cayendo. */
export interface Caida {
  /**
   * Un entero que solo sube, y que NO se reutiliza.
   *
   * Sirve para que quien pinta sepa que el cuadrado de arriba a la izquierda es
   * el mismo que había en el fotograma anterior, y por tanto pueda interpolar
   * entre los dos en vez de teletransportarlo. Con la posición en la lista no
   * bastaría: cuando una se va por abajo, todas las de detrás cambian de índice.
   */
  id: number;
  /** El centro, en milésimas. */
  x: number;
  y: number;
  /** Cuánto baja por tic. */
  vy: number;
}

/**
 * El estado de una partida. Todo enteros, listas y objetos llanos.
 *
 * Sobrevive a `shared/mecanicas/canonico.ts` por construcción: ni fechas, ni
 * mapas, ni conjuntos, ni infinitos, ni `undefined` dentro. Eso no es una
 * casualidad afortunada — es el requisito para que `verify:determinismo` pueda
 * comparar dos ejecuciones carácter a carácter.
 */
export interface EstadoDelArcade {
  momento: MomentoDelArcade;
  /** La semilla y el contador, dentro del estado. Ver `mecanicas/azar.ts`. */
  azar: Azar;
  /** El centro de la nave, en milésimas. */
  nave: number;
  /** Hacia dónde la está empujando el dedo AHORA. */
  rumbo: Rumbo;
  caidas: readonly Caida[];
  /** El siguiente identificador libre. Sube y no se reutiliza. */
  siguienteId: number;
  /** En qué tic propio nace la próxima. */
  proxima: number;
  /** LA CIFRA: cuántas han pasado de largo. */
  esquivadas: number;
  /**
   * Cuántos tics ha vivido esta partida, contados por el juego.
   *
   * Es lo que se compara contra el reloj de pared al verificar un récord: a
   * sesenta tics por segundo, 1.800 tics son treinta segundos de juego, y treinta
   * segundos de juego no caben en dos segundos de reloj. Ver `marcadores.ts`.
   */
  tic: number;
}

/**
 * De dónde parte todo. Sin barajar y SIN GASTAR AZAR.
 *
 * La semilla es cero aquí a propósito: la de verdad llega en `ctx.azar` con el
 * movimiento `empezar`, porque en un juego con marcador la reparte el servidor y
 * no el aparato. Sembrar aquí con algo que el dispositivo se invente sería dejar
 * que quien juega probara semillas hasta encontrar la que le da la partida fácil.
 */
export function partidaNueva(): EstadoDelArcade {
  return {
    momento: 'antes',
    azar: sembrar(0),
    nave: CAMPO / 2,
    rumbo: 0,
    caidas: [],
    siguienteId: 1,
    proxima: INTERVALO_INICIAL,
    esquivadas: 0,
    tic: 0,
  };
}

// ---------------------------------------------------------------------------
// LOS MOVIMIENTOS
//
// Ninguno lleva el prefijo `arcade:`, que lo reserva la plataforma y hoy usa solo
// el tic. Son tres, y son pocos porque el juego entero cabe en un dedo que se
// mueve.
// ---------------------------------------------------------------------------

/** Arranca la partida con la semilla que traiga el contexto. */
export const EMPEZAR = 'empezar';
/** Cambia el rumbo. La carga es −1, 0 o 1 y NO se cree lo que llegue. */
export const RUMBO = 'rumbo';
/** Vuelve a dejarlo todo como al principio, para pedir otra semilla y empezar. */
export const OTRA = 'otra';

/**
 * ¿Se acabó ya? Función del estado, no un campo aparte.
 *
 * ADMITE `undefined` como los otros dos, y no por simetría: sin eso NO SE PUEDE
 * DECLARAR. Su alta es `instalarArcade<EstadoDelArcade | undefined>`, y con
 * `strictFunctionTypes` una función que exige el estado no encaja donde se pide
 * una que admite `undefined`. O sea que esto no estaba sin declarar por descuido:
 * era imposible declararlo, y desde fuera se veía igual que un olvido.
 */
export function seAcabo(estado: EstadoDelArcade | undefined): boolean {
  return (estado ?? partidaNueva()).momento === 'perdida';
}

/**
 * LA CIFRA que este arcade publica, leída de su estado.
 *
 * Existe porque el motor no puede leerla: el estado es OPACO, y esa opacidad es
 * de lo que cuelga el diseño entero. El manifiesto dice que hay una cifra y cómo
 * se llama; qué número es, solo lo sabe el juego.
 *
 * Entra por el alta, como el reductor. La tabla escrita a mano de
 * `./puntuaciones.ts` ya se mudó al núcleo; ese fichero cuenta la mudanza entera.
 */
export function puntuacionDelArcade(estado: EstadoDelArcade): number {
  return estado.esquivadas;
}

// ---------------------------------------------------------------------------
// EL REDUCTOR
// ---------------------------------------------------------------------------

/**
 * Las tres reglas del contrato, y cómo se cumplen aquí:
 *
 *  1. NO MUTA. Cada rama construye listas nuevas. Un `push` sobre `estado.caidas`
 *     haría que la partida reejecutada para verificar un récord diera otra cosa
 *     que la que hubo, y el récord de quien jugó limpio se caería.
 *  2. NO MIRA EL RELOJ NI EL AZAR DEL SISTEMA. El tiempo son tics y el azar viaja
 *     en el estado.
 *  3. SIEMPRE DEVUELVE UN ESTADO. Y cuando no pasa nada devuelve EL MISMO OBJETO,
 *     no una copia: quien pinta compara por identidad para no repintar sesenta
 *     veces por segundo una pantalla de «se acabó» que no cambia. Es el
 *     guardarraíl `sinTocar` que `oro:arcade` congela.
 */
export function avanzarElArcade(
  estado: EstadoDelArcade | undefined,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): EstadoDelArcade {
  /*
   * `undefined` no puede llegar hoy —este juego es de dispositivo y no tiene mesa
   * que abrir— y se admite igual porque cuesta una línea. Un arcade de servidor
   * que se cayera aquí dejaría una mesa huérfana a la que nadie puede sentarse ni
   * cerrar, y eso ya pasó una vez en la fase 2: está contado en
   * `arcadesQueNoAguantanVacio()`.
   */
  const actual = estado ?? partidaNueva();

  if (esTic(movimiento)) return unPaso(actual);

  if (movimiento.tipo === EMPEZAR) {
    if (actual.momento !== 'antes') return actual;
    return { ...partidaNueva(), momento: 'jugando', azar: sembrar(ctx.azar) };
  }

  if (movimiento.tipo === RUMBO) {
    /*
     * LO QUE LLEGA NO ESTÁ VALIDADO, y el contrato del motor lo dice con todas las
     * letras: `carga` es `unknown` y el motor no la mira, porque no sabe qué es.
     * La comprobación no desaparece — BAJA AQUÍ, que es el único sitio que sabe
     * qué es un rumbo. Un `carga as Rumbo` a secas dejaría que un cliente
     * manipulado mandara `1000` y cruzara el campo en un tic.
     */
    const pedido = movimiento.carga;
    if (pedido !== -1 && pedido !== 0 && pedido !== 1) return actual;
    if (pedido === actual.rumbo) return actual;
    return { ...actual, rumbo: pedido };
  }

  if (movimiento.tipo === OTRA) {
    if (actual.momento !== 'perdida') return actual;
    return partidaNueva();
  }

  /*
   * Un movimiento que este juego no conoce no es una excepción: es el estado que
   * había. Quien hospeda no tiene forma de distinguir «lo rechacé» de «reventé»,
   * y por eso la tercera regla del contrato existe.
   */
  return actual;
}

/**
 * UN TIC ES UN PASO, y el orden de este cuerpo ES la regla del juego.
 *
 * ═══ POR QUÉ EL ORDEN IMPORTA TANTO COMO LAS CUENTAS ═══
 *
 * Cambiar dos de estos seis apartados de sitio no rompe nada visible y cambia el
 * resultado de todas las partidas guardadas. Si la colisión se mirara ANTES de
 * mover la nave, un jugador se salvaría de cosas que le acaban de dar; si la
 * nueva caída naciera antes de contar las esquivadas, el contador se adelantaría
 * un tic. Ninguna de las dos da un error: las dos hacen que una repetición
 * honrada deje de coincidir, o sea que un récord legítimo salga rechazado.
 *
 * Está escrito aquí y lo congela `oro:arcade` byte a byte, que es el único sitio
 * donde un cambio de orden se ve como lo que es.
 */
function unPaso(estado: EstadoDelArcade): EstadoDelArcade {
  /* Fuera de la partida, un tic no hace nada. El MISMO objeto: ver la regla 3. */
  if (estado.momento !== 'jugando') return estado;

  const tic = estado.tic + 1;

  // 1 · La nave se mueve, y se queda dentro del campo.
  const nave = dentroDelCampo(estado.nave + estado.rumbo * VELOCIDAD_NAVE);

  // 2 · Todo lo que cae, baja.
  const bajadas: Caida[] = [];
  for (const c of estado.caidas) bajadas.push({ id: c.id, x: c.x, y: c.y + c.vy, vy: c.vy });

  /*
   * 3 · Lo que ha pasado de largo se va y suma. Se cuenta con el borde superior
   * del cuadrado por debajo del suelo, o sea cuando ya no se ve NADA de él: con el
   * centro, la cosa desaparecería a media pantalla de basura.
   */
  const siguen: Caida[] = [];
  let esquivadas = estado.esquivadas;
  for (const c of bajadas) {
    if (c.y - CAIDA_MEDIO > CAMPO) esquivadas = esquivadas + 1;
    else siguen.push(c);
  }

  /*
   * 4 · Y nace la siguiente si toca. El azar se gasta EN ESTE ORDEN —primero la
   * posición, después la velocidad— y cambiarlo desplaza toda la secuencia de una
   * partida: el mismo registro daría otra cosa. Por eso las dos tiradas están
   * juntas y en una sola rama.
   */
  let azar = estado.azar;
  let siguienteId = estado.siguienteId;
  let proxima = estado.proxima;
  if (tic >= estado.proxima) {
    if (siguen.length < TOPE_DE_CAIDAS) {
      const donde = enteroEntre(azar, CAIDA_MEDIO, CAMPO - CAIDA_MEDIO);
      const cuanto = enteroEntre(donde.azar, CAIDA_LENTA, CAIDA_RAPIDA);
      azar = cuanto.azar;
      siguen.push({ id: siguienteId, x: donde.valor, y: -CAIDA_MEDIO, vy: cuanto.valor });
      siguienteId = siguienteId + 1;
    }
    /*
     * El plazo se recalcula aunque no haya nacido nada por el tope. Si no, con el
     * campo lleno el juego intentaría parir una por tic para siempre y la partida
     * quedaría clavada en el tope en cuanto se rozara una vez.
     */
    proxima = tic + intervaloCon(esquivadas);
  }

  // 5 · ¿Le ha dado a algo?
  const perdida = siguen.some((c) => choca(c, nave));

  // 6 · Y el estado nuevo, entero.
  return {
    momento: perdida ? 'perdida' : 'jugando',
    azar,
    nave,
    rumbo: estado.rumbo,
    caidas: siguen,
    siguienteId,
    proxima,
    esquivadas,
    tic,
  };
}

/**
 * Cada cuántos tics nace algo, con estas esquivadas encima.
 *
 * División entera y resta, y ni una función aproximada. Ver `INTERVALO_INICIAL`.
 */
export function intervaloCon(esquivadas: number): number {
  const escalones = Math.floor(esquivadas / ESQUIVADAS_POR_ESCALON);
  const intervalo = INTERVALO_INICIAL - escalones * TICS_POR_ESCALON;
  return intervalo < INTERVALO_MINIMO ? INTERVALO_MINIMO : intervalo;
}

/** La nave no se sale del campo. Sin `Math.min`/`max` anidados, que se leen peor. */
function dentroDelCampo(x: number): number {
  if (x < NAVE_MEDIO_ANCHO) return NAVE_MEDIO_ANCHO;
  if (x > CAMPO - NAVE_MEDIO_ANCHO) return CAMPO - NAVE_MEDIO_ANCHO;
  return x;
}

/**
 * ¿Se solapan el cuadrado que cae y la nave?
 *
 * Dos rectángulos alineados con los ejes: se tocan si se solapan en las dos
 * dimensiones. `Math.abs` está fijado al bit y es de las que `verify:pureza` no
 * prohíbe.
 *
 * ═══ POR QUÉ NO HAY QUE PREOCUPARSE POR EL TÚNEL ═══
 *
 * Lo más rápido que cae algo son trece milésimas por tic y la nave mide sesenta de
 * alto, así que ninguna caída puede saltársela entre dos tics. Es la razón por la
 * que la colisión se puede mirar solo en las posiciones y no en el trayecto — y
 * también la razón por la que `CAIDA_RAPIDA` no se sube sin volver aquí.
 */
function choca(c: Caida, nave: number): boolean {
  const enX = Math.abs(c.x - nave) < CAIDA_MEDIO + NAVE_MEDIO_ANCHO;
  if (!enX) return false;
  const arribaDeLaNave = NAVE_Y - NAVE_MEDIO_ALTO;
  const abajoDeLaNave = NAVE_Y + NAVE_MEDIO_ALTO;
  return c.y + CAIDA_MEDIO > arribaDeLaNave && c.y - CAIDA_MEDIO < abajoDeLaNave;
}

// ---------------------------------------------------------------------------
// EL MANIFIESTO
// ---------------------------------------------------------------------------

export const MANIFIESTO_EL_ARCADE: ManifiestoDeArcade = {
  id: EL_ARCADE,
  nombre: 'El Arcade',
  /*
   * El gancho dice la postura, como el de La Frente: quien lee esto ya sabe
   * jugar, y eso es lo único que una tarjeta tiene que conseguir.
   */
  gancho: 'Cae basura del cielo. Esquívala y suma.',
  icono: 'mando',

  /*
   * UNO Y SOLO UNO. No es una limitación que se quite el día que apetezca: el
   * marcador de este juego se verifica reejecutando una partida, y una partida de
   * dos exigiría una mesa, asientos y autoridad — o sea el otro juego, el de la
   * fase 2. Aquí el mínimo y el máximo coinciden porque la mecánica es de uno.
   */
  jugadores: { minimo: 1, maximo: 1 },

  /*
   * EL APARATO SIMULA Y EL SERVIDOR VERIFICA, que es exactamente la fila del §6
   * del diseño para un arcade de un jugador: transporte HTTP normal, autoridad
   * repartida. El reductor corre aquí, en Hermes, sesenta veces por segundo; el
   * servidor no ve un solo fotograma y sin embargo puede desmentir la cifra,
   * porque tiene este mismo fichero.
   */
  sede: 'dispositivo',
  tickHz: TICK_HZ,

  /*
   * PÍXELES A RITMO DE FOTOGRAMA. Es el mueble que estrena Skia, y el primero de
   * los PROPIOS: lo pinta el juego, está en el binario y cuesta publicación. La
   * consecuencia está escrita en el §7 del diseño y es la decisión de producto más
   * cara del encargo — el enchufe alcanza a las reglas, no a los píxeles.
   */
  mueble: 'lienzo',

  /*
   * NADA QUE ESCONDER, y el razonamiento largo está en la cabecera: los secretos
   * de este motor son secretos entre asientos, y aquí solo hay uno.
   */
  secretos: false,

  /*
   * Y AQUÍ ESTÁ LO QUE HACE FALTA PARA LA FASE ENTERA.
   *
   * De este campo se DERIVA `exigeReejecutabilidad()`, que es lo que obliga a que
   * el reductor dé el mismo resultado en Hermes y en Node. No hay ninguna bandera
   * que lo apague: para renunciar habría que escribir `{ tipo: 'ninguno' }`, que
   * es una palabra que un revisor ve en el diff.
   *
   * Gana el número más alto porque son cosas esquivadas. Un juego de tiempos
   * declararía `mas-bajo`, y esa es toda la diferencia: es CONTENIDO —cómo se lee
   * el número— y no comportamiento.
   */
  marcador: { tipo: 'cifra', rotulo: 'Esquivadas', sentido: 'mas-alto' },

  /*
   * Esquivar cosas que caen es una mecánica genérica sin dueño, como reaccionar o
   * emparejar: no se está reproduciendo ningún juego concreto, ni su nombre, ni su
   * arte, ni sus textos. Por eso `mecanica-generica` y no `dominio-publico`, que
   * es lo que se declara cuando se juega a algo que existe y es de todos —las
   * charadas, la oca— y aquí no hay tal cosa.
   */
  procedencia: { tipo: 'mecanica-generica' },
};
