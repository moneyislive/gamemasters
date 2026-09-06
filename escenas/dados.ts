/**
 * LOS DADOS DE LA MESA: en qué par se parte una suma, y en qué fase está su animación.
 *
 * ═══ SIN `three`, SIN REACT, Y SIN SABER QUE ESTO ES RIBERAS ═══
 *
 * Aquí no se pinta nada. Lo que hay son dos cosas que se pueden comprobar en Node con
 * una serie de sucesos, y por eso viven aparte de quien las dibuja: el REPARTO de una
 * suma en dos caras, y la MÁQUINA que dice si los dados están quietos, rodando o
 * asentándose. Quien pinta les pregunta en cada fotograma y escribe posición y giro; no
 * decide nada. Es la misma partición que `gestos.ts` en el Muelle: el reloj se inyecta
 * (`ahora`, en segundos) y ninguna transición mira la hora del sistema.
 *
 * Y no se importa nada de `shared/arcade`: la escena no sabe que existe Riberas. Lo que
 * le llega es una SUMA, un SELLO y una SEMILLA —tres enteros— y quién los calcula (el
 * sello es el turno en que se tiró: `selloDeLaTirada` en `riberas-en-tres.ts`) es cosa
 * de quien sí conoce el juego.
 *
 * ═══ EL REPARTO ES TEATRO, Y POR ESO NO SE PIDE AL SERVIDOR ═══
 *
 * El servidor publica la SUMA (`ultimaTirada`) y nada más: el juego sólo usa la suma. Un
 * solo cubo no puede enseñar un 7, así que son dos dados, y las dos caras las elige el
 * cliente. Lo que no puede pasar es que dos aparatos vean pares distintos, ni que el par
 * cambie a mitad de turno: el par sale de `revoltijo(suma, sello, semilla)`, tres enteros
 * que viajan en la vista o se derivan del código de la mesa, así que es el mismo en los
 * cuatro teléfonos y tras recargar. El sello es el TURNO y no `rev` —`rev` sube con cada
 * movimiento y el par cambiaría al pasar una carta— ni el asiento —con el asiento cada
 * colono enseña SIEMPRE el mismo par para la misma suma: medido, 3 de los 6 pares del 7
 * en toda la partida; dados trucados a la vista—.
 *
 * ═══ CÓMO SE LLEVA CADA COSA A ENTERO ═══
 *
 * `revoltijo` hace `| 0` con cada argumento, o sea entero de 32 bits con signo. La suma
 * (2..12) y el sello (un contador de turnos) ya son enteros y pasan tal cual. La semilla es
 * FNV-1a de 32 bits SIN signo —puede pasar de 2³¹— y se mezcla con un canal propio,
 * `semilla ^ CANAL_DEL_REPARTO`, para no correlar con el paisaje que siembra la misma
 * semilla; el `^` ya la deja en 32 bits con signo y el `| 0` de después lo dice en voz
 * alta. Los mismos bits en todos los motores: es lo que hace que el par sea el mismo.
 */
import { revoltijo } from './revoltijo';

/** El canal con el que se mezcla la semilla de la mesa para el reparto. Fijo. */
export const CANAL_DEL_REPARTO = 41_011;

// ---------------------------------------------------------------------------
// La malla del dado: lo que el compilador y la escena tienen que leer IGUAL
// ---------------------------------------------------------------------------

/**
 * LA ARISTA DEL D6 DE KAYKIT TAL COMO VIENE EN EL PACK, medida la primera vez.
 *
 * `compilar-dados.ts` mide la caja envolvente de `D6_A.gltf` (Board Game Bits 1.0,
 * CC0) en los tres ejes y se niega si alguno se aparta de esto más del 1 %, o si los
 * tres no son iguales: un pack reexportado en otra unidad se cargaría sin error y
 * pondría un dado del tamaño de una choza en la mesa. El fichero compilado se queda a
 * la unidad del pack (como el tablero y el embarcadero, que no se escalan al compilar)
 * y la escena lo escala al instanciar con `ARISTA_DEL_DADO · lado / esto`. Es el mismo
 * papel que hace `ALTURA_DE_LA_CASA_EN_EL_PACK` en `escala.ts`.
 */
export const ARISTA_DEL_D6_EN_EL_PACK = 0.75;

/**
 * LOS DOS COLORES DEL DADO, que son los de las fichas del tablero y no los del pack.
 *
 * El D6_A viene blanco con puntos gris oscuro, sacados de un atlas con degradado (37
 * tonos bajo sus 521 vértices, medido al compilar). Los dados y las fichas de número
 * son del mismo juego, así que al compilar el cuerpo se pinta del crema de los discos
 * de las fichas y los puntos del color de sus cifras, y el degradado se aplana: una
 * cara, un color. Viven aquí, sin `three`, para que `compilar-dados.ts` escriba los
 * mismos bytes que `delta.tsx` usa para las fichas y para el respaldo procedimental,
 * y `verify:dados` los pueda contrastar con el fichero sin arrastrar el motor.
 */
export const COLOR_DEL_NUMERO = '#efe6cd';
export const COLOR_DEL_PUNTO = '#2a2118';

// ---------------------------------------------------------------------------
// Las medidas del dado en la mesa: lo que pinta la escena y lo que exige el comprobador
// ---------------------------------------------------------------------------

/**
 * LA ARISTA DE CADA DADO, en lados del hueco del reparto: 0,52.
 *
 * Era 0,46 y en el iPhone SE apaisado daba 20,6 puntos de dado y 3,7 de punto, por
 * debajo del mínimo legible con el asa en regla (§1.15 de `docs/LA-MESA-DE-RIBERAS.md`).
 * El asa tiene aire de sobra (1,6 lados para un par que ocupaba 1,0), así que subió: el par
 * mide `2 · 0,52 + 0,08 = 1,12` lados y deja 0,24 a cada lado del asa, exactamente el
 * `AIRE` de la barra. Con eso las dos exigencias caen en el mismo sitio: al asa mínima de
 * 44 puntos el dado mide 22,9 y el punto 4,1. Vive aquí, sin `three`, para que la escena
 * escale con el mismo número que `verify:escena` mide en puntos.
 */
export const ARISTA_DEL_DADO = 0.52;
/** Cuánto aire queda entre los dos dados, en lados del hueco. */
export const HUECO_ENTRE_DADOS = 0.08;
/**
 * LO QUE MIDE EL PAR DE PUNTA A PUNTA, en lados del hueco: 1,12. Es lo que `huecosDeLaMesa`
 * reserva para el asa y el tapete cuando los dados van como quinto hueco —un hueco de un
 * lado se le queda corto en 0,12— y lo que el colgado deja dentro de sus 1,6 con el
 * `AIRE` a cada lado. Vive aquí, junto a la arista, para que la barra no repita la suma.
 */
export const ANCHO_DEL_PAR_DE_DADOS = 2 * ARISTA_DEL_DADO + HUECO_ENTRE_DADOS;
/**
 * EL DIÁMETRO DE CADA PUNTO, en aristas del dado: el 18 %. Es lo que hace que el punto no
 * baje de 4 puntos de pantalla cuando el dado no baja de 22; el D6 del pack lleva sus
 * puntos a esa misma proporción, y el respaldo procedimental los pinta con este número.
 */
export const PUNTO_DEL_DADO = 0.18;
/**
 * EL MÍNIMO LEGIBLE, en puntos de pantalla (decisión 15): el punto del dado no baja de 4
 * (el grosor del raíl de color de la ficha del colono, la marca más fina que la Sala pide
 * leer a distancia de brazo), y por tanto la arista no baja de 22. `verify:escena` lo exige
 * en todos los lienzos que tienen sitio para dados.
 */
export const DADO_MINIMO = 22;
export const PUNTO_MINIMO = 4;
/**
 * A QUÉ ALTURA SOBRE LA TAPA VA EL CENTRO DEL CUBO cuando está apoyado: media arista.
 * Con la tapa en la cara de abajo del zócalo (`cotaDeLaTapa`, 0,48 lados bajo el centro
 * del hueco) el centro queda 0,22 lados bajo el centro del hueco, y la cara de arriba del
 * dado apoyado, justo en él.
 */
export const CENTRO_DEL_DADO_SOBRE_LA_TAPA = ARISTA_DEL_DADO / 2;
/**
 * CUÁNTO SALTA EL DADO AL RODAR, en lados. En lo alto del salto la cara de arriba llega a
 * `hueco.y + 0,24 · lado` (`−0,48 + 0,26 + 0,20 + 0,26`), por debajo del techo del asa
 * (`hueco.y + 0,5 · lado`): el dado no se sale de lo que se puede pulsar.
 */
export const SALTO_DEL_DADO = 0.2;
/**
 * EL RADIO DE LA SOMBRA DE CONTACTO DE CADA DADO, en lados del hueco: un poco más que la
 * media arista (0,26) para que asome por los cuatro lados, y poco más que la media
 * distancia entre los dos centros (0,30) para que las dos sombras apenas se toquen. La
 * misma geometría fundida que las de los huecos: se AÑADEN a su lista de centros.
 */
export const RADIO_DE_LA_SOMBRA_DEL_DADO = 0.32;

/** Dónde cae cada uno de los dos dados respecto del centro de su hueco, en lados. */
export function centroDelDado(indice: 0 | 1): number {
  return (indice === 0 ? -1 : 1) * ((ARISTA_DEL_DADO + HUECO_ENTRE_DADOS) / 2);
}

/**
 * LO QUE LA ESCENA RECIBE PARA PINTAR LOS DADOS, y por qué es un tipo de aquí.
 *
 * La escena no importa nada de `shared/arcade`: no sabe que esto es Riberas. Lo que le
 * llega es la vista de la máquina (`tirado`, `ultimaTirada`, `sello`) más `disponible`,
 * la ÚNICA bandera que mira para dejar tocar y para vibrar, como `MazoDeLaBarra`. Quien
 * conoce el juego (`dadosEnTres` en `shared/arcade/juegos/riberas-en-tres.ts`) construye
 * algo que cumple este contrato; la pantalla la apaga con `quieto` mientras una petición
 * vuela, y la escena no sabe por qué está apagada.
 */
export interface DadosDeLaMesa extends VistaDeLosDados {
  readonly disponible: boolean;
}

/**
 * CÓMO ACABÓ EL TOQUE, tal como lo devuelve `mover` en las dos `mesa.ts`
 * (`ResultadoDelMovimiento`): escrito aquí otra vez, con los mismos tres valores, porque
 * la escena no puede importar de un cliente. Si un día `mover` gana un cuarto valor, la
 * pantalla dejará de compilar al pasárselo a `onPulsarLosDados`, que es lo que se quiere.
 */
export type ResultadoDelToque = 'hecho' | 'rechazado' | 'sin-red';

/**
 * QUÉ SUCESO EMPUJA A LA MÁQUINA LA RESPUESTA DE `mover`, exhaustivo: un `switch` sin
 * `default` sobre la unión, para que un cuarto valor no compile.
 *
 *   · `hecho` → NADA: la vista traerá la tirada y la máquina se asentará con ella.
 *   · `rechazado` y `sin-red` → `rechazado`: la mesa no cambió y no va a llegar ninguna
 *     tirada mía; sin esto los dados rodarían los seis segundos del tope.
 */
export function sucesoDelResultado(resultado: ResultadoDelToque): SucesoDeLosDados | null {
  switch (resultado) {
    case 'hecho':
      return null;
    case 'rechazado':
    case 'sin-red':
      return { que: 'rechazado' };
  }
}

// ---------------------------------------------------------------------------
// Las curvas de la animación, puras y en segundos: quien pinta las pregunta cada fotograma
// ---------------------------------------------------------------------------

/**
 * LA VIBRACIÓN DE «ME TOCA TIRAR»: patrón de 1,6 s con una sacudida de 0,36 s a 8 Hz y
 * envolvente senoidal, y el resto quietos. Medido: se mueven el 21 % del tiempo, diez
 * avisos en dieciséis segundos. Es un temblor que se ve en el rabillo del ojo y no un
 * bote: la barra ya enseñó que cuatro cosas moviéndose en el borde del ojo mientras se
 * mira el tablero molestan (`GIRO_DE_LA_VITRINA`). Devuelve un valor en [−1, 1]; la
 * amplitud la ponen `traslacion` (fracción del lado) y `giro` (radianes).
 */
export const SACUDIDA = {
  periodo: 1.6,
  dura: 0.36,
  hercios: 8,
  /** 3 % del lado: 1,35 puntos en el SE, 1,6 en un iPhone 14, 4,5 en un monitor a 1080. */
  traslacion: 0.03,
  /** 4 grados, en radianes. */
  giro: (4 * Math.PI) / 180,
} as const;

export function sacudida(t: number): number {
  const fase = ((t % SACUDIDA.periodo) + SACUDIDA.periodo) % SACUDIDA.periodo;
  if (fase > SACUDIDA.dura) return 0;
  const envolvente = Math.sin((fase / SACUDIDA.dura) * Math.PI);
  return Math.sin(fase * 2 * Math.PI * SACUDIDA.hercios) * envolvente;
}

/**
 * EL SALTO DE «RODANDO», en lados: un arco que sube a `SALTO_DEL_DADO` a mitad del rodar
 * mínimo y vuelve al suelo al cumplirse; si la respuesta tarda, el dado sigue GIRANDO en
 * el suelo, sin volver a saltar. Nunca negativo: la mesa es sólida.
 */
export function saltoDelDado(transcurrido: number): number {
  if (transcurrido <= 0 || transcurrido >= RODAR_MINIMO) return 0;
  return SALTO_DEL_DADO * Math.sin((transcurrido / RODAR_MINIMO) * Math.PI);
}

/**
 * CUÁNTO HA GIRADO UN DADO QUE RUEDA, en radianes, con la velocidad DECRECIENDO: arranca a
 * dos vueltas por segundo y frena como `1 / (1 + t / FRENO)`, así que el ángulo crece como
 * un logaritmo y nunca se queda clavado mientras espera al servidor. En los 0,6 s mínimos
 * da algo más de tres cuartos de vuelta; a los 6 s del tope, dos vueltas y media.
 */
export const VELOCIDAD_DE_GIRO = 4 * Math.PI;
export const FRENO_DEL_GIRO = 0.5;

export function anguloRodado(transcurrido: number): number {
  if (transcurrido <= 0) return 0;
  return VELOCIDAD_DE_GIRO * FRENO_DEL_GIRO * Math.log(1 + transcurrido / FRENO_DEL_GIRO);
}

/**
 * CUÁNTO SE HA ASENTADO, entre 0 y 1: la misma `1 − (1 − t)³` con la que se asientan las
 * piezas (`asentamiento.ts`), que sale rápido y frena al llegar. El «rebote» es de
 * POSICIÓN (un salto chico de `REBOTE_DEL_DADO` lados que da `reboteDelDado`, un seno en
 * el último tercio), no del cuaternión: extrapolar un `slerp` más allá de 1 gira el dado
 * hacia una cara que no es y se ve como un dado que se lo piensa.
 */
export function avanceDelAsentado(transcurrido: number): number {
  const t = transcurrido / ASENTAR;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - (1 - t) ** 3;
}

/** La altura del rebote del asentado, en lados: un seno en el último tercio, y cero al final. */
export const REBOTE_DEL_DADO = 0.04;
export function reboteDelDado(transcurrido: number): number {
  const t = transcurrido / ASENTAR;
  if (t <= 2 / 3 || t >= 1) return 0;
  return REBOTE_DEL_DADO * Math.sin(((t - 2 / 3) / (1 / 3)) * Math.PI);
}

/**
 * EL GIRO LIBRE ALREDEDOR DE LA VERTICAL con el que se asienta cada dado, en radianes.
 *
 * El valor fija qué cara mira arriba y deja libre el giro sobre esa vertical; con el mismo
 * giro los dos dados saldrían clavados iguales y cada tirada igual que la anterior. Sale
 * del sello del turno y del índice del dado (dos enteros que son los mismos en los cuatro
 * aparatos), no del azar: el ángulo áureo por sello para que dos turnos seguidos no se
 * parezcan, y algo más de un cuarto de vuelta para el segundo dado.
 */
export function giroDelDadoAsentado(indice: 0 | 1, sello: number): number {
  const AUREO = Math.PI * (3 - Math.sqrt(5));
  const vuelta = 2 * Math.PI;
  return ((((sello | 0) * AUREO + indice * (Math.PI / 2 + 0.35)) % vuelta) + vuelta) % vuelta;
}

/** Un par de caras, cada una de 1 a 6. */
export type ParDeDados = readonly [number, number];

/** Los pares de caras que suman `suma`, en orden: el 7 tiene seis, el 2 y el 12 uno. */
export function paresDeLaSuma(suma: number): ParDeDados[] {
  const pares: ParDeDados[] = [];
  for (let a = 1; a <= 6; a++) {
    const b = suma - a;
    if (b >= 1 && b <= 6) pares.push([a, b]);
  }
  return pares;
}

/**
 * EN QUÉ PAR SE ENSEÑA UNA SUMA, determinista por (suma, sello, semilla).
 *
 * Con una suma que no se saca con dos dados —el 0 de antes de la primera tirada— devuelve
 * `[1, 1]`: los dados en reposo, sin tapete. No es un error: es «todavía no se ha tirado».
 */
export function repartoDeLaTirada(suma: number, sello: number, semilla: number): ParDeDados {
  const pares = paresDeLaSuma(suma);
  const primero = pares[0];
  if (primero === undefined) return [1, 1];
  return pares[revoltijo(suma, sello, (semilla ^ CANAL_DEL_REPARTO) | 0) % pares.length] ?? primero;
}

// ---------------------------------------------------------------------------
// La máquina
// ---------------------------------------------------------------------------

/** Cuánto ruedan como mínimo aunque la respuesta llegue antes, en segundos. */
export const RODAR_MINIMO = 0.6;
/** Cuánto tardan en asentarse en la cara objetivo una vez la tienen. */
export const ASENTAR = 0.35;
/**
 * CUÁNTO RUEDAN SIN OBJETIVO ANTES DE RENDIRSE. Sólo pasa cuando la red no ha contestado
 * ni bien ni mal: un rechazo llega como suceso `rechazado` en el acto y no espera esto.
 */
export const TOPE_SIN_RESPUESTA = 6;

/**
 * LO QUE LA MÁQUINA LEE DE UNA VISTA: la suma, si ya se tiró, y el sello del turno.
 *
 * Con esto y la semilla sabe qué par enseñar y si la tirada es NUEVA respecto de la
 * última vista que le llegó. No lee `turnosAbiertos` a secas: recibe el sello ya
 * calculado por quien conoce el juego.
 */
export interface VistaDeLosDados {
  readonly tirado: boolean;
  readonly ultimaTirada: number;
  readonly sello: number;
}

/**
 * LAS TRES FASES.
 *
 *   · `quieta(par)`: los dos enseñan `par`.
 *   · `rodando(desde, objetivo | null, anterior)`: giran desde el instante `desde`. Con
 *     `objetivo` a `null` todavía no se sabe el número —es mi propio toque esperando al
 *     servidor—; con objetivo, ya llegó (y `llegoEn` dice cuándo) y se asentarán en
 *     `max(desde + RODAR_MINIMO, llegoEn)`. `anterior` es el par al que se vuelve si el
 *     movimiento se rechaza o la red no contesta.
 *   · `asentando(desde, par)`: interpolan hacia `par` durante `ASENTAR` segundos.
 */
export type FaseDeLosDados =
  | { readonly fase: 'quieta'; readonly par: ParDeDados }
  | {
      readonly fase: 'rodando';
      readonly desde: number;
      readonly objetivo: { readonly par: ParDeDados; readonly llegoEn: number } | null;
      readonly anterior: ParDeDados;
    }
  | { readonly fase: 'asentando'; readonly desde: number; readonly par: ParDeDados };

/**
 * EL ESTADO ENTERO: la fase, la última vista que se vio y la semilla de la mesa.
 *
 * La última vista hace falta para saber si la siguiente trae una TIRADA NUEVA; la
 * semilla, para partir la suma. Ninguna de las dos cambia con los toques.
 */
export interface EstadoDeLosDados {
  readonly fase: FaseDeLosDados;
  readonly vista: VistaDeLosDados | null;
  readonly semilla: number;
}

/**
 * LOS SUCESOS.
 *
 *   · `tocado`: el asa se ha pulsado y la pantalla ha mandado TIRAR.
 *   · `vista`: ha llegado una vista (por el sondeo o con la respuesta del movimiento).
 *   · `tic`: un fotograma. Sólo mira el reloj.
 *   · `rechazado`: `mover` ha vuelto con `'rechazado'` o `'sin-red'`: la tirada que se
 *     esperaba no va a llegar.
 */
export type SucesoDeLosDados =
  | { readonly que: 'tocado' }
  | { readonly que: 'tic' }
  | { readonly que: 'rechazado' }
  | { readonly que: 'vista'; readonly vista: VistaDeLosDados };

/** Los dados antes de la primera vista: quietos en 1 y 1. */
export function dadosEnReposo(semilla: number): EstadoDeLosDados {
  return { fase: { fase: 'quieta', par: [1, 1] }, vista: null, semilla };
}

/** El par que hay que enseñar, o hacia el que se va, en cualquier fase. */
export function parQueSeEnsena(fase: FaseDeLosDados): ParDeDados {
  if (fase.fase === 'rodando') return fase.objetivo === null ? fase.anterior : fase.objetivo.par;
  return fase.par;
}

/**
 * ¿TRAE ESTA VISTA UNA TIRADA NUEVA respecto de la anterior?
 *
 * Lo es si `tirado` pasa de falso a verdadero, o si con `tirado` verdadero cambian el
 * sello o la suma (dos movimientos entre dos vueltas del sondeo). La PRIMERA vista nunca
 * es nueva: al montar o al recargar, lo que hay en la mesa es noticia vieja y se enseña
 * en reposo. Y si el sello cambia con `tirado` falso, la tirada del turno anterior se
 * perdió entre sondeos: también se enseña sin animar.
 */
function traeTiradaNueva(anterior: VistaDeLosDados | null, vista: VistaDeLosDados): boolean {
  if (anterior === null || !vista.tirado) return false;
  return !anterior.tirado || anterior.sello !== vista.sello || anterior.ultimaTirada !== vista.ultimaTirada;
}

/**
 * LA TRANSICIÓN. Pura: devuelve el estado siguiente y no toca el que recibe.
 *
 * Las reglas, una por suceso; lo que no está escrito no hace nada, a propósito:
 *
 *   · `tocado` en `quieta` → `rodando(ahora, null)`. En cualquier otra fase, nada: el
 *     segundo toque de un doble toque no arranca nada.
 *   · `rechazado` en `rodando` SIN objetivo → `quieta(anterior)` en el acto. Con objetivo,
 *     nada: la vista ya trajo una tirada (de otro, o de mi otra pestaña) y se asienta en
 *     ella. Lo que falló lo dice el aviso de la mesa; los dados no inventan un error.
 *   · `vista` con tirada nueva: en `rodando`, se fija el objetivo y se asienta en
 *     `max(desde + RODAR_MINIMO, ahora)`; en `quieta` o `asentando` (la tirada es de otro,
 *     o la mía llegó sin que yo tocara), `rodando(ahora, objetivo)`. Sin tirada nueva, en
 *     `quieta` se actualiza el par sin animar; en las demás fases no cambia nada.
 *   · `tic`: `rodando` con objetivo y pasado el mínimo → `asentando`; `asentando` pasados
 *     `ASENTAR` → `quieta(par)`; `rodando` sin objetivo pasado el tope → `quieta(anterior)`.
 */
export function faseDeLosDados(estado: EstadoDeLosDados, suceso: SucesoDeLosDados, ahora: number): EstadoDeLosDados {
  const { fase } = estado;

  if (suceso.que === 'tocado') {
    if (fase.fase !== 'quieta') return estado;
    return { ...estado, fase: { fase: 'rodando', desde: ahora, objetivo: null, anterior: fase.par } };
  }

  if (suceso.que === 'rechazado') {
    if (fase.fase !== 'rodando' || fase.objetivo !== null) return estado;
    return { ...estado, fase: { fase: 'quieta', par: fase.anterior } };
  }

  if (suceso.que === 'vista') {
    const { vista } = suceso;
    const par = repartoDeLaTirada(vista.ultimaTirada, vista.sello, estado.semilla);
    const conVista = { ...estado, vista };
    if (!traeTiradaNueva(estado.vista, vista)) {
      return fase.fase === 'quieta' ? { ...conVista, fase: { fase: 'quieta', par } } : conVista;
    }
    if (fase.fase === 'rodando') {
      const asentarDesde = Math.max(fase.desde + RODAR_MINIMO, ahora);
      return asentarDesde <= ahora
        ? { ...conVista, fase: { fase: 'asentando', desde: asentarDesde, par } }
        : { ...conVista, fase: { ...fase, objetivo: { par, llegoEn: ahora } } };
    }
    return {
      ...conVista,
      fase: { fase: 'rodando', desde: ahora, objetivo: { par, llegoEn: ahora }, anterior: parQueSeEnsena(fase) },
    };
  }

  /* tic */
  if (fase.fase === 'rodando') {
    if (fase.objetivo !== null) {
      const asentarDesde = Math.max(fase.desde + RODAR_MINIMO, fase.objetivo.llegoEn);
      return ahora >= asentarDesde ? { ...estado, fase: { fase: 'asentando', desde: asentarDesde, par: fase.objetivo.par } } : estado;
    }
    return ahora >= fase.desde + TOPE_SIN_RESPUESTA ? { ...estado, fase: { fase: 'quieta', par: fase.anterior } } : estado;
  }
  if (fase.fase === 'asentando') {
    return ahora >= fase.desde + ASENTAR ? { ...estado, fase: { fase: 'quieta', par: fase.par } } : estado;
  }
  return estado;
}
