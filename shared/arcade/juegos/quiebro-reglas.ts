/**
 * LOS NÚMEROS DE EL QUIEBRO, Y LA ÚNICA TRADUCCIÓN DE LA VISTA A NÚMEROS.
 *
 * ═══ POR QUÉ LAS TABLAS VIVEN APARTE DEL REDUCTOR Y DEL PRODUCTOR ═══
 *
 * La vista de la mesa no lleva ni un número de juego: lleva QUÉ se eligió —nivel, avería,
 * contramedida, el estilo y los retoques de cada asiento— (ver la cabecera de `quiebro-vista.ts`).
 * Lo leen tres sitios que tienen que llegar a los MISMOS números: la sala del servidor (por el
 * productor, `quiebro-liza.ts`), el aparato (el HUD y la predicción del propio paso) y el reductor
 * de la mesa (cuánto aguante es «lleno», cuántas monedas trae la noche). Si cada uno tuviera su
 * copia de «la Ligera aguanta 80», la primera vez que alguien afinara un número tras una prueba con
 * gente el aparato predeciría un quiebro de 4,5 m y la sala le corregiría a 3,5. Así que hay UNA
 * función, `componerReglamento`, y todo el que necesita un número de un asiento pasa por ella.
 *
 * ═══ LAS UNIDADES, Y POR QUÉ NO ES Q16.16 AQUÍ ═══
 *
 * Las tablas van en las unidades del documento de diseño (`docs/EL-QUIEBRO.md`, §3, §4 y §6), para
 * que revisarlas contra él sea leer dos columnas iguales:
 *
 *   · longitudes en METROS (1 u = 1 m, §4.1), todas múltiplos exactos de 0,05; el productor las pasa
 *     a Q16.16 con `deNumero` de `fijo.ts`, una vez, al declarar;
 *   · tiempos de la sala en TICS de 50 ms, y ventanas del aparato en MILISEGUNDOS, con el sufijo en
 *     el nombre (`…Tics`, `…Ms`) como en la Liza;
 *   · multiplicadores del diseño (×0,8, ×1,25…) como POR CIENTOS ENTEROS, aplicados con
 *     `porCiento`: un producto de enteros y un redondeo, igual en Node y en Hermes. Nada de coma
 *     flotante acumulada en una regla.
 *
 * ═══ LOS IDS DEL CABLE, TAMBIÉN AQUÍ ═══
 *
 * Acciones, estados, clases de enemigo, proyectil y avisos viajan por la Liza como enteros de 1 a
 * 255. Los necesitan el productor (que los declara) y el cliente (que pinta un gesto por estado y
 * un anillo por acción), así que se fijan aquí, una vez, con nombre. Los nombres que ve la gente son
 * otra cosa y están en `quiebro-nombres.ts`.
 *
 * ═══ LO QUE NO ESTÁ ═══
 *
 * Ni el reductor (`quiebro.ts`), ni la declaración de la Liza (`quiebro-liza.ts`), ni la ciudad. Este
 * fichero no importa nada que se ejecute salvo los nombres y la vista: lo cargan la app y el
 * escritorio al arrancar, y tiene que costar poco.
 */
import { IDS_DE_RETOQUE, NOMBRES_DEL_QUIEBRO, PRIMER_NIVEL, ULTIMO_NIVEL } from './quiebro-nombres';
import type { IdDeAveria, IdDeContramedida, IdDeEstilo, IdDeReceta, IdDeRetoque } from './quiebro-nombres';
import { OLEADAS_COMO_MUCHO, OLEADAS_FIJAS } from './quiebro-vista';
import type { AsientoDelQuiebro, FaseDelQuiebro, ReglamentoDelQuiebro } from './quiebro-vista';

/* ─── LOS IDS DEL CABLE ──────────────────────────────────────────────────── */

/**
 * LAS ACCIONES, por su id en la Liza (`aqui.a[0]`, `anuncio.acc`). Las del desvelado van del 1 al 19
 * y las de los enemigos del 20 en adelante: la Liza exige que no se pisen (el aparato sabe qué pintar
 * por el id solo) y así se lee a simple vista de quién es cada una.
 *
 * `seguida1` y `seguida2` son el mismo golpe dos veces, con dos ids: una acción no se encadena tras sí
 * misma (se repetiría sin fin), así que la Tanda queda escrita entera y el aparato sabe por el id en
 * qué eslabón va. Lo mismo la Tanda de 3 del Celador.
 */
export const ACCION_DEL_QUIEBRO = {
  entrada: 1,
  seguida1: 2,
  seguida2: 3,
  cierre: 4,
  empellon: 5,
  replica: 6,
  /** El segundo golpe de la Réplica, sólo con el retoque «Réplica doble». */
  replicaDoble: 7,
  quiebro: 8,
  rescatar: 9,
  /** Desalojar a un Celador caído: la acción sostenida del remate. */
  desalojar: 10,
  descolgar: 11,
  golpeDePrestado: 20,
  entradaDeCelador: 21,
  seguidaDeCelador: 22,
  cierreDeCelador: 23,
  /** Lo que contesta la guardia al parar una Entrada de frente. No abre un ataque por sí sola. */
  respuestaDeCelador: 24,
  entradaDeTirador: 25,
  seguidaDeTirador: 26,
} as const;

/**
 * LOS ESTADOS, por su id en la Liza (foto y suceso `estado`). Las claves que tienen nombre visible
 * son las de `NOMBRES_DEL_QUIEBRO.estados`, para que el HUD rotule con `estados[clave]` sin tabla
 * de traducción.
 */
export const ESTADO_DEL_QUIEBRO = {
  quiebro: 1,
  tocado: 2,
  descolocado: 3,
  derribado: 4,
  remanso: 5,
  desconectado: 6,
  /** Recién vuelto por la cabina de refugio: intocable y fuera de los turnos 2 s. */
  reaparecido: 7,
  /** El quiebro de ruptura: sale de un tocado con intocable. */
  ruptura: 8,
  desalojando: 9,
  rescatando: 10,
  descolgando: 11,
  vigia: 12,
  ausente: 13,
  desalojable: 14,
  /** El Celador que se levanta a costa de un Prestado: el Trasvase. */
  absorbiendo: 15,
} as const;

/** LAS CLASES DE ENEMIGO (`nace.clase`). */
export const CLASE_DEL_QUIEBRO = { prestado: 1, celador: 2, tirador: 3 } as const;

/** EL PROYECTIL del tirador. */
export const PROYECTIL_DEL_QUIEBRO = { bala: 1 } as const;

/** LAS CLASES DE AVISO: las de `NOMBRES_DEL_QUIEBRO.avisos`. */
export const AVISO_DEL_QUIEBRO = { marcar: 1, rescate: 2, voy: 3, desalojalo: 4 } as const;

/* ─── LA ARITMÉTICA DE LAS TABLAS ────────────────────────────────────────── */

/**
 * UN ENTERO POR UN POR CIENTO, redondeado. `x` y `pct` son enteros, así que el producto es exacto y
 * el único redondeo es el del final: da lo mismo en todos los motores. Lo usan los multiplicadores
 * del diseño (×0,8 de la Ligera, ×1,1 del daño en Aguacero, media vida de «Cristal»…).
 */
export function porCiento(x: number, pct: number): number {
  return Math.round((x * pct) / 100);
}

/** Lo que vale llevar `n` esquirlas al salir por la cabina: T(n) × 10 (§4.9). */
export function pagoDeLasEsquirlas(n: number): number {
  const k = Number.isInteger(n) && n > 0 ? n : 0;
  return ((k * (k + 1)) / 2) * PUNTOS.porEsquirla;
}

/* ─── LO QUE ES IGUAL PARA TODO DESVELADO (§4.1, §4.2) ───────────────────── */

/** La versión de las tablas que nombra `reglamento.base`. Cambiar un número de partida es otra base. */
export const BASE_DEL_REGLAMENTO = 'v1';

/**
 * EL CUERPO: persona de 1,8 m con 0,35 de radio; andar, trote y carrera; los dos presupuestos con
 * que la sala valida el sitio (el corto, 7 × 1,25 m/s con un segundo acumulable, y el largo, 80 m
 * cada 10 s) y la pulsación que se guarda tres tics.
 */
export const CUERPO_DEL_DESVELADO = {
  radioMetros: 0.35,
  marchas: [2, 5, 7],
  aceleracionTics: 3,
  presupuestoCorto: { metrosPorSegundo: 8.75, acumulaTics: 20 },
  presupuestoLargo: { metros: 80, enTics: 200 },
  guardaTics: 3,
} as const;

/** LOS TRES ESTILOS (§3). Sólo cambian números: las habilidades de Foco 100 son de la fase 2. */
export interface FilaDeEstilo {
  readonly aguante: number;
  readonly quiebroMetros: number;
  /** Desde qué tic del quiebro se puede golpear: la Ligera, dos tics antes. */
  readonly soltableDesdeTic: number;
  /** El multiplicador de sus golpes, y el de su Cierre (la Mole lo lleva a ×1,5). */
  readonly golpesPorCiento: number;
  readonly cierrePorCiento: number;
  readonly engancheMetros: number;
  /** La Mole aguanta sin quedar tocada un golpe cada 6 s; 0 = nunca. */
  readonly firmeCadaTics: number;
}

/**
 * Los tres aguantes son DISTINTOS con cualquier avería (100, 80 y 130; 50, 40 y 65 con «Cristal»), y la
 * mesa se apoya en ello: el estilo se cambia una vez por tramo, y la vista sabe si ya se cambió porque
 * el aguante del punto de control deja de ser el lleno del estilo que se lleva (`quiebro.ts`, «El
 * diario tiene tope»). Dos estilos con el mismo aguante se podrían alternar sin fin; `verify:quiebro`
 * lo vigila.
 */
export const ESTILOS: Readonly<Record<IdDeEstilo, FilaDeEstilo>> = {
  gabardina: { aguante: 100, quiebroMetros: 3.5, soltableDesdeTic: 6, golpesPorCiento: 100, cierrePorCiento: 100, engancheMetros: 7, firmeCadaTics: 0 },
  ligera: { aguante: 80, quiebroMetros: 4.5, soltableDesdeTic: 4, golpesPorCiento: 80, cierrePorCiento: 80, engancheMetros: 9, firmeCadaTics: 0 },
  mole: { aguante: 130, quiebroMetros: 2.5, soltableDesdeTic: 6, golpesPorCiento: 100, cierrePorCiento: 150, engancheMetros: 7, firmeCadaTics: 120 },
};

/** El estilo con que se sienta todo el mundo hasta que elige otro. */
export const ESTILO_POR_DEFECTO: IdDeEstilo = 'gabardina';

/**
 * LA TANDA Y LO DEMÁS QUE GOLPEA (§4.4, §4.5). Los daños son los de la Gabardina: el estilo los
 * multiplica en `componerReglamento`.
 *
 * «A compás» es una BONIFICACIÓN de las Seguidas (+5 de daño y de puntos, anuncio un tic más corto):
 * una Tanda entera a compás hace 10 + 15 + 15 + 20 = 60, que es la cuenta del diseño, así que el
 * Cierre no la lleva. El plan B del diseño —ensanchar el compás a ±100 ms si en el banco se acierta
 * menos del 15 %— es otra `BASE_DEL_REGLAMENTO`, no un número que se toca en caliente.
 */
export const GOLPES = {
  /** El impacto da a 1,1 m de alcance más 1,2 de holgura por la interpolación: 2,3 m. */
  alcanceMetros: 1.1,
  holguraMetros: 1.2,
  /** El aparato engancha a 7 m y ±60° (43 rumbos de 256); el servidor lo acepta hasta 7,5 m. */
  enganche: { conoRumbos: 43, holguraMetros: 0.5 },
  entrada: { anuncioTics: 8, dano: 10, tocadoTics: 12, avanceMetros: 5.5, puntos: 10 },
  seguida: { anuncioTics: 5, anuncioAlCompas: 4, dano: 10, danoAlCompas: 15, tocadoTics: 10, avanceMetros: 0.5, puntos: 10, puntosAlCompas: 15 },
  cierre: { anuncioTics: 7, dano: 20, derribadoTics: 30, empujeMetros: 3, avanceMetros: 0.5, puntos: 10 },
  empellon: { anuncioTics: 10, dano: 8, tocadoTics: 24, empujeMetros: 4, recargaTics: 60, puntos: 10 },
  /**
   * La Réplica avanza lo que se quebró y un metro más: tras el quiebro de lado, quien falló queda clavado
   * donde estaba y hay que volver a él (la acometida corta; §4.4). Sin avance salía `fallada` siempre.
   */
  replica: { anuncioTics: 3, dano: 25, derribadoTics: 30, puntos: 25, avanceTrasElQuiebroMetros: 1 },
  replicaDoble: { anuncioTics: 3, dano: 15, puntos: 15 },
  /** Encadenar: de −100 a +250 ms del impacto anterior; a compás, ±75 ms. En el reloj del aparato. */
  cadena: { antesMs: 100, despuesMs: 250, compasMs: 75 },
  /** Fallar (blanco lejos, blanco que quiebra, guardia): descolocado 8 tics. */
  falloDescolocaTics: 8,
  /** El estampado contra la estructura: +15 de daño y +10 tics de derribado. */
  estampado: { dano: 15, tics: 10 },
} as const;

/**
 * EL QUIEBRO (§4.3, §4.4). La esquiva de la Liza no tiene intocable en tics —se juzga por su ventana
 * en el reloj del aparato— y por eso los 250 ms de intocable del diseño son `esquivaHastaMs`, y el
 * «+1 tic de intocable» del retoque «Paso largo» son 50 ms más de eso.
 */
export const QUIEBRO_DEL_DESVELADO = {
  tics: 9,
  /** Lo que el presupuesto admite de más sobre lo que se desplaza: 3,5 m de quiebro, 4 de extra. */
  holguraMetros: 0.5,
  esquivaHastaMs: 250,
  /** El tercero en menos de 1,2 s sale torpe: desplaza pero no esquiva. */
  torpe: { cada: 3, enTics: 24 },
  /** La primera noche del aparato: los tres primeros quiebros con 300 ms de ventana limpia. */
  aprendizMs: 300,
  remansoTics: 20,
  /** Lo que queda clavado quien falló contra un limpio. */
  descolocaAlQueFallaTics: 20,
  /**
   * Contra una bala: vuelas hasta 14 m hacia el tirador en 10 tics y terminas en Réplica. Los 10 m del
   * diseño se quedaban cortos: con el avance de la Réplica (3,5 m la Mole) y su alcance (2,3 m) no se
   * llegaba a un tirador a más de 15,8 m, y el tirador se pone hasta a 18. Así llega siempre (decisión
   * del coordinador, 24-sep).
   */
  acometida: { metros: 14, tics: 10 },
  /** El quiebro de ruptura: 50 de Foco para salir de un tocado con 6 tics de intocable. */
  ruptura: { coste: 50, intocableTics: 6 },
} as const;

/** EL FOCO (§4.7). */
export const FOCO = { tope: 100, porLimpio: 35, porCompas: 5, porDesalojo: 20, porEstampado: 10 } as const;

/**
 * LOS PUNTOS (§4.12). Todo se multiplica por la racha (+10 % por limpio seguido sin recibir daño,
 * hasta ×2) y por el factor del nivel. Los de cada golpe van con el golpe, en `GOLPES`.
 */
export const PUNTOS = {
  porLimpio: 50,
  porEstampado: 30,
  porDesalojo: 100,
  porRescate: 75,
  porSalir: 150,
  porEsquirla: 10,
  racha: { pasoPorCiento: 10, topePorCiento: 200 },
} as const;

/**
 * EL AGUANTE QUE SE RECUPERA Y CON EL QUE SE VUELVE (§4.7, §5.3): +10 al desalojar, +30 al cerrar
 * una oleada ganada, y 60 al volver en la pausa quien acabó desconectado; 40 al ser rescatado y 60
 * al reaparecer pagando una moneda. La avería «Cristal» lo parte todo por la mitad.
 */
export const AGUANTE = {
  porDesalojo: 10,
  porOleadaGanada: 30,
  alVolverEnLaPausa: 60,
  alSerRescatado: 40,
  alReaparecer: 60,
} as const;

/** CAER Y VOLVER (§4.7): 12 s en el suelo; rescate de 1,5 s a 1,5 m; moneda y 8 s; 2 s intocable. */
export const CAIDA = {
  desconectadoTics: 240,
  rescate: { metros: 1.5, tics: 30 },
  reaparece: { esperaTics: 160, intocableTics: 40 },
} as const;

/** LAS ESQUIRLAS (§4.9). */
export const ESQUIRLAS = { tope: 12, recogidaMetros: 1.2, montonTics: 400, porCelador: 3 } as const;

/**
 * LA CABINA (§4.11): suena 60 s (50 en los niveles 4 y 5); si calla con gente dentro, una moneda y
 * suena otra 40 s; se descuelga manteniendo 1,5 s a 1,5 m, de uno en uno.
 *
 * Los 60 y 50 s son los de la Llamada de la ciudad (`docs/quiebro/CIUDAD-ABIERTA.md`, §3.7 y §3.9), y van
 * con su banda: la cabina suena a 100-160 m por calles (`BANDA_DE_LA_CABINA_CERCANA`, ver `quiebro-liza.ts`),
 * que al trote son 20-32 s de carrera limpia. Los 50 y 40 s de antes eran los de la glorieta, con la cabina a
 * 60-110 m: la entrega 1 pasó a la banda de la ciudad y se quedó con el reloj de la glorieta, y la revisión de
 * jugar llegó a una a 126 m con 5 s de margen. Y la entrega 1 mide la banda desde la plaza de la Bajada, no
 * desde el grupo (medirla desde el grupo es L5, de la sala): el reloj de la ciudad es lo que ponen las reglas.
 * Medido en las 32 trazas bajando a cada plaza: desde 105 m de la plaza o menos (lo que se corre en una pausa)
 * la cabina queda a 245 m por calles como mucho, 49 s al trote; desde 150 m, a 287; desde 200 m, a 341.
 */
export const CABINA = { suenaTics: 1200, suenaTicsCorta: 1000, otraTics: 800, descolgarTics: 30, metros: 1.5 } as const;

/**
 * Cuánto dura cada fase con reloj (§5), en ms: la sala los hace vencer con `arcade:reloj`.
 *
 * LA BAJADA ES TAMBIÉN LA PREPARACIÓN: el estilo sólo se puede elegir ahí (en la reunión cerraría la mesa
 * a los que aún no han llegado: ver `quiebro.ts`), y con los 6 s de la caída no daba tiempo a leer las
 * tres tarjetas. Así que la Bajada dura hasta que todos están listos —eligieron estilo o dijeron «listo»—,
 * con `bajadaConTodos` (los 6 s de la caída, contados desde que empezó) como mínimo, y `bajada` (15 s)
 * como tope.
 */
export const DURACION_MS = { bajada: 15000, bajadaConTodos: 6000, pausa: 15000, recuento: 20000 } as const;

/** El reloj de una oleada: 150 s (§4.10). Si vence, la oleada queda «aguantada». */
export const OLEADA_TICS = 3000;

/** LA PRESENCIA (§5): 2 s sin `aqui` es ausente momentáneo; 60 s sin canal, ausente de la mesa. */
export const PRESENCIA = { ausenteTrasTics: 40, veredictoTrasTics: 1200 } as const;

/** LO QUE LA SALA LE PERDONA A LA RED (§4.3, §4.6): `comp = min(rtt/2 + 25, 150)`, balas 250 ms. */
export const RED = { compBaseMs: 25, compTopeMs: 150, esperaDeSitiosMs: 250 } as const;

/** LOS TURNOS DE ATAQUE (§3): 2 de cuerpo a cuerpo y 1 de disparo por desvelado, 3 anuncios a la vez. */
export const TURNOS = { cuerpoACuerpo: 2, disparo: 1, anunciosALaVez: 3 } as const;

/** LOS AVISOS (§7): lo que dura cada uno en pantalla, y uno por segundo como mucho. */
export const AVISOS = { marcarTics: 80, rescateTics: 100, voyTics: 100, desalojaloTics: 60, cadaTics: 20 } as const;

/* ─── EL SISTEMA (§4.8) ──────────────────────────────────────────────────── */

/**
 * LOS ENEMIGOS, en el nivel 1 y sin avería. El nivel acorta sus anuncios y sube su daño; la avería
 * «Cristal» les parte la vida. Todo eso lo aplica `componerReglamento`.
 *
 * Lo que deja a un desvelado cada golpe no lo fija el diseño salvo que la ruptura saca «de un tocado
 * o de una Tanda enemiga»: los golpes dejan TOCADO (del que se sale con la ruptura), y el Cierre del
 * Celador DERRIBA y empuja 2 m, que es lo que el presupuesto de «ser empujado» (+5 m) cubre de sobra.
 */
export const ENEMIGOS = {
  prestado: {
    vida: 20,
    velocidad: 4,
    golpe: { anuncioTics: 14, dano: 8, tocadoTics: 10 },
    /** Lo que tiembla antes de echar a andar: sale de la gente, a coste cero. */
    apareceTics: 10,
    cerebro: { minimaMetros: 1, maximaMetros: 1.8, decideCadaTics: 10, turnos: 1 },
  },
  celador: {
    vida: 90,
    velocidad: 5.5,
    /** La Tanda de 3: 11 tics, y 6 los siguientes si el anterior dio. */
    entrada: { anuncioTics: 11, dano: 10, tocadoTics: 10 },
    seguida: { anuncioTics: 6, dano: 10, tocadoTics: 10 },
    cierre: { anuncioTics: 6, dano: 15, derribadoTics: 20, empujeMetros: 2 },
    respuesta: { anuncioTics: 6, dano: 15, tocadoTics: 12 },
    /** Para las Entradas de frente (±60°) salvo tocado, descolocado o derribado; el Empellón no. */
    guardia: { conoRumbos: 43, esquivaElEmpellonPorCiento: 50 },
    imprimeTics: 24,
    cerebro: { minimaMetros: 1.3, maximaMetros: 2.2, decideCadaTics: 8, turnos: 2 },
  },
  tirador: {
    vida: 70,
    velocidad: 4.5,
    /** Su Tanda de 2 son los dos primeros golpes del Celador. */
    bala: { apuntarTics: 12, balas: 3, cadaTics: 3, metrosPorSegundo: 20, radioMetros: 0.2, alcanceMetros: 30, dano: 12, tocadoTics: 6 },
    imprimeTics: 24,
    cerebro: { minimaMetros: 8, maximaMetros: 18, decideCadaTics: 10, turnos: 2, disparos: 1 },
  },
  radioMetros: 0.35,
  /** Caído: DESALOJABLE 3 s; se desaloja manteniendo 1,2 s a 2,5 m, intocable, y suelta 3 esquirlas. */
  desalojo: { tics: 60, metros: 2.5, remateTics: 24 },
  /** Si nadie lo desaloja: absorbe al Prestado vivo más cercano a 12 m (0,6 s) o se reimprime a 2 s y 15 m. */
  trasvase: { metros: 12, tics: 12, vida: 45, reimprimeTics: 40, reimprimeMetros: 15 },
} as const;

/* ─── LOS NIVELES DE NOCHE (§4.10) ───────────────────────────────────────── */

export interface FilaDeNivel {
  readonly nivel: number;
  /** La ventana limpia del quiebro, en ms del aparato. */
  readonly ventanaMs: number;
  /** Los anuncios del Sistema, y su daño, en por cientos. */
  readonly anuncioPorCiento: number;
  readonly danoPorCiento: number;
  readonly monedas: number;
  /** Celadores de más en las oleadas 2 a 5. */
  readonly celadoresDeMas: number;
  /** Un Celador guarda la cabina en la Llamada. */
  readonly guardian: boolean;
  /** Lo que suena la cabina, en tics. */
  readonly cabinaTics: number;
  readonly puntosPorCiento: number;
}

/**
 * LAS CINCO FILAS. Los extras son acumulativos: el Aguacero trae el primer Celador de más y el
 * guardián de la cabina, el Temporal además la Llamada de 50 s y la Tormenta un Celador más.
 */
export const NIVELES: readonly FilaDeNivel[] = [
  { nivel: 1, ventanaMs: 200, anuncioPorCiento: 100, danoPorCiento: 100, monedas: 3, celadoresDeMas: 0, guardian: false, cabinaTics: CABINA.suenaTics, puntosPorCiento: 100 },
  { nivel: 2, ventanaMs: 175, anuncioPorCiento: 95, danoPorCiento: 100, monedas: 3, celadoresDeMas: 0, guardian: false, cabinaTics: CABINA.suenaTics, puntosPorCiento: 125 },
  { nivel: 3, ventanaMs: 150, anuncioPorCiento: 90, danoPorCiento: 110, monedas: 3, celadoresDeMas: 1, guardian: true, cabinaTics: CABINA.suenaTics, puntosPorCiento: 150 },
  { nivel: 4, ventanaMs: 135, anuncioPorCiento: 85, danoPorCiento: 120, monedas: 2, celadoresDeMas: 1, guardian: true, cabinaTics: CABINA.suenaTicsCorta, puntosPorCiento: 175 },
  { nivel: 5, ventanaMs: 120, anuncioPorCiento: 80, danoPorCiento: 130, monedas: 2, celadoresDeMas: 2, guardian: true, cabinaTics: CABINA.suenaTicsCorta, puntosPorCiento: 200 },
];

/** La fila de un nivel, acotado de 1 a 5: un nivel fuera de rango es un error de otro, no un reventón. */
export function filaDelNivel(nivel: number): FilaDeNivel {
  const n = !Number.isInteger(nivel) || nivel < PRIMER_NIVEL ? PRIMER_NIVEL : nivel > ULTIMO_NIVEL ? ULTIMO_NIVEL : nivel;
  return NIVELES[n - 1] as FilaDeNivel;
}

/** El nivel de la noche siguiente: sube con la victoria, baja con la derrota (§2.4). */
export function nivelTrasLaNoche(nivel: number, ganada: boolean): number {
  const siguiente = ganada ? nivel + 1 : nivel - 1;
  return siguiente < PRIMER_NIVEL ? PRIMER_NIVEL : siguiente > ULTIMO_NIVEL ? ULTIMO_NIVEL : siguiente;
}

/**
 * EL NIVEL CON QUE JUEGA EL SISTEMA en una fase: el de la noche, salvo en las oleadas de propina,
 * que van «con la receta del nivel siguiente» (§5.4): anuncios más cortos y más daño, y sus extras.
 * El reglamento del DESVELADO (su ventana, sus puntos) sigue siendo el de la noche.
 */
export function nivelDelSistema(nivel: number, fase: FaseDelQuiebro): number {
  const oleada = fase.tipo === 'oleada' ? fase.oleada : fase.tipo === 'interrumpida' && fase.en.tipo === 'oleada' ? fase.en.oleada : 0;
  const n = filaDelNivel(nivel).nivel;
  return oleada > OLEADAS_FIJAS && n < ULTIMO_NIVEL ? n + 1 : n;
}

/* ─── LAS AVERÍAS (§6.3) ─────────────────────────────────────────────────── */

export interface FilaDeAveria {
  /** «Cristal»: todos a media vida (desvelados y enemigos). */
  readonly vidaPorCiento: number;
  /** «Cristal»: puntos ×1,5. */
  readonly puntosPorCiento: number;
  /** «Eco»: cada ataque enemigo se repite como fantasma 1 s después. 0 = no. */
  readonly repetirTrasTics: number;
  /** «Apagón»: sólo el cliente (contornos a más de 15 m); la sala no cambia. */
  readonly apagon: boolean;
}

export const AVERIAS: Readonly<Record<IdDeAveria, FilaDeAveria>> = {
  ninguna: { vidaPorCiento: 100, puntosPorCiento: 100, repetirTrasTics: 0, apagon: false },
  eco: { vidaPorCiento: 100, puntosPorCiento: 100, repetirTrasTics: 20, apagon: false },
  cristal: { vidaPorCiento: 50, puntosPorCiento: 150, repetirTrasTics: 0, apagon: false },
  apagon: { vidaPorCiento: 100, puntosPorCiento: 100, repetirTrasTics: 0, apagon: true },
};

/** Las averías que se barajan de la segunda noche en adelante (la primera va sin avería). */
export const AVERIAS_QUE_SE_SORTEAN: readonly IdDeAveria[] = ['eco', 'cristal', 'apagon', 'ninguna'];

/* ─── LA MEMORIA DEL SISTEMA (§6.5) ──────────────────────────────────────── */

/**
 * LOS UMBRALES DE LAS CONTRAMEDIDAS: «Monedas caras» con 4 reapariciones o más; «Tiradores» si el
 * 60 % o más de los anuncios acabó en limpio; «Plaza despejada» con 8 estampados o más.
 */
export const MEMORIA = { reapariciones: 4, limpiosPorCiento: 60, estampados: 8 } as const;

/** Lo que la mesa sabe de la noche anterior para decidir la contramedida: la suma de todos. */
export interface NocheParaLaMemoria {
  readonly reapariciones: number;
  readonly limpios: number;
  readonly amenazas: number;
  readonly estampados: number;
}

/**
 * LA CONTRAMEDIDA DE LA NOCHE SIGUIENTE. Sólo se aplica la más fuerte (§6.5), y «más fuerte» es la
 * que más pasa de su umbral en proporción: 6 reapariciones (1,5 veces el umbral) pesan más que 9
 * estampados (1,125). Se compara en cruz, con enteros: sin divisiones que redondear. A igualdad,
 * manda el orden de la lista (tiradores, monedas caras, plaza despejada), que va de lo que más
 * cambia la pelea a lo que menos.
 */
export function contramedidaTrasLaNoche(n: NocheParaLaMemoria): IdDeContramedida {
  /* Cada candidata es una fracción valor/umbral: se guarda como numerador y denominador. */
  const candidatas: { id: IdDeContramedida; num: number; den: number }[] = [];
  if (n.amenazas > 0 && n.limpios * 100 >= n.amenazas * MEMORIA.limpiosPorCiento) {
    candidatas.push({ id: 'tiradores', num: n.limpios * 100, den: n.amenazas * MEMORIA.limpiosPorCiento });
  }
  if (n.reapariciones >= MEMORIA.reapariciones) candidatas.push({ id: 'monedas-caras', num: n.reapariciones, den: MEMORIA.reapariciones });
  if (n.estampados >= MEMORIA.estampados) candidatas.push({ id: 'plaza-despejada', num: n.estampados, den: MEMORIA.estampados });
  let mejor: { id: IdDeContramedida; num: number; den: number } | null = null;
  for (const c of candidatas) {
    if (mejor === null || c.num * mejor.den > mejor.num * c.den) mejor = c;
  }
  return mejor === null ? 'ninguna' : mejor.id;
}

/** Las monedas con que empieza una noche: las del nivel, una menos con «Monedas caras». */
export function monedasAlEmpezar(nivel: number, contramedida: IdDeContramedida): number {
  const m = filaDelNivel(nivel).monedas - (contramedida === 'monedas-caras' ? 1 : 0);
  return m < 0 ? 0 : m;
}

/* ─── LOS RETOQUES (§6.4) ────────────────────────────────────────────────── */

/**
 * LO QUE HACE CADA RETOQUE. Un retoque repetido en la misma noche cuenta UNA vez: el reductor no
 * ofrece uno que ya se tiene, y así una vista que llegara con dos iguales tampoco rompería un número.
 *
 * «Paso largo» es +1,5 m sobre el quiebro del estilo: la Gabardina queda en los 5 m del diseño y
 * cada estilo conserva su diferencia (con «quiebro de 5 m» a secas, la Mole ganaría el doble que la
 * Ligera con el mismo retoque).
 */
export const RETOQUES = {
  pasoLargo: { quiebroMetros: 1.5, esquivaHastaMs: 50 },
  ventanaAncha: { ventanaMs: 50 },
  punoDePlomo: { empujeMetros: 5, estampadoDano: 25 },
  iman: { engancheMetros: 9, avanceMetros: 7 },
  enlace: { rescateTics: 16, focoAmbos: 30 },
} as const;

/* ─── LAS OLEADAS: ESCALADO Y RECETAS (§4.10, §6.2) ──────────────────────── */

/** NPC vivos a la vez como mucho, por desvelados presentes (1 a 6). */
export const VIVAS_POR_PRESENTES: readonly number[] = [6, 8, 11, 11, 14, 14];
/** En la Llamada: Prestados de uno en uno cada 2 s, con estos vivos como mucho. */
export const VIVAS_EN_LA_LLAMADA: readonly number[] = [4, 5, 7, 7, 9, 9];
/** Uno cada 2 s en la Llamada. */
export const LLAMADA_CADA_TICS = 40;

/** Cuántos de cada, por presentes, antes de repartirlos en grupos. */
export interface ComposicionDeLaOleada {
  readonly prestados: number;
  readonly celadores: number;
  readonly tiradores: number;
}

function porPresentes(tabla: readonly number[], n: number): number {
  const i = n < 1 ? 0 : n > tabla.length ? tabla.length - 1 : n - 1;
  return tabla[i] as number;
}

/**
 * LA COMPOSICIÓN DE UNA OLEADA para `n` presentes, con la tabla del §4.10 tal cual: la 1, sólo
 * Prestados (4 + 2n); la 2, ⌈n/2⌉ Celadores y 3 + n Prestados; la 3, lo mismo más uno o dos
 * tiradores; las de propina, un Celador más. Encima, los extras del nivel del Sistema (oleadas 2 a
 * 5) y la contramedida «Tiradores» (+1 tirador en las oleadas 2 y 3).
 */
export function composicionDeLaOleada(oleada: number, n: number, nivel: number, contramedida: IdDeContramedida): ComposicionDeLaOleada {
  const mitad = Math.ceil(n / 2);
  let prestados: number;
  let celadores: number;
  let tiradores: number;
  if (oleada <= 1) {
    prestados = 4 + 2 * n;
    celadores = 0;
    tiradores = 0;
  } else if (oleada === 2) {
    prestados = 3 + n;
    celadores = mitad;
    tiradores = 0;
  } else if (oleada === 3) {
    prestados = 2 + n;
    celadores = mitad;
    tiradores = n >= 5 ? 2 : 1;
  } else {
    prestados = 2 + n;
    celadores = mitad + 1;
    tiradores = n <= 2 ? 1 : 2;
  }
  if (oleada >= 2) celadores += filaDelNivel(nivel).celadoresDeMas;
  if (contramedida === 'tiradores' && (oleada === 2 || oleada === 3)) tiradores += 1;
  return { prestados, celadores, tiradores };
}

/**
 * POR DÓNDE ENTRA UN GRUPO, dicho por su papel; el productor lo pasa a las clases de zona de la ciudad
 * (`quiebro-ciudad.ts`, «La numeración que ve la Liza»). En la entrega 1 las oleadas siguen en la plaza
 * de la Bajada (`docs/quiebro/CIUDAD-ABIERTA.md`, §6.1), así que:
 *
 *   · `aparicion` — las 8 bocas de las calles de la plaza de la Bajada (lo que en el barrio eran los
 *     cruces de alrededor y las bocas): de ahí salen los Prestados y el tirador del Francotirador;
 *   · `impresion` — los 8 huecos de impresión de esa plaza: los Celadores y los tiradores impresos;
 *   · `cabina` — la cabina que suena en la Llamada (ver `encuentroDeLaLlamada`).
 *
 * Lo que el barrio llamaba `aparicion-lejana` —los cruces de fuera— no existe en la ciudad: una plaza
 * no tiene «fuera» a 40 m, tiene 540 m de ciudad. Ver la Llamada.
 */
export type ZonaDeEntrada = 'aparicion' | 'impresion' | 'cabina';

/** Cómo se elige la zona de cada uno: la `EleccionDeZona` de la Liza. */
export type EleccionDeEntrada = 'azar' | 'aLaEspalda' | 'zonaDeAccion';

/** UN GRUPO DE UNA OLEADA, ya con sus tablas por presentes. Lo traduce el productor a la Liza. */
export interface GrupoDeLaNoche {
  readonly clase: keyof typeof CLASE_DEL_QUIEBRO;
  /** Por presentes, del 1 al número de asientos. */
  readonly cuantos: readonly number[];
  readonly vivas: readonly number[];
  readonly zona: ZonaDeEntrada;
  readonly eleccion: EleccionDeEntrada;
  readonly desdeTic: number;
  readonly cadaTics: number;
}

/** LA OLEADA ENTERA: los vivos a la vez por presentes y sus grupos. */
export interface EncuentroDeLaNoche {
  readonly vivas: readonly number[];
  readonly grupos: readonly GrupoDeLaNoche[];
}

/**
 * CÓMO REPARTE CADA RECETA (§6.2). La receta no cambia CUÁNTOS vienen —eso es el escalado, y lo que
 * permite comparar noches— sino CÓMO entran:
 *
 *   · enjambre: Prestados en salida escalonada continua, y los Celadores tarde: la plaza se llena de
 *     gente antes de que asome el primer traje;
 *   · pareja: los Celadores de dos en dos y a la vez (con uno solo, entra otro);
 *   · pinza: los Prestados en dos grupos, uno por delante y otro a la espalda del grupo;
 *   · marea: Prestados sin parar, la mitad más, contra un tope de vivos a la mitad;
 *   · francotirador: un tirador desde un borde (zona de aparición) desde la oleada 2, con escolta;
 *   · emboscada: la impresión nace detrás del grupo.
 */
export const RECETAS: Readonly<Record<IdDeReceta, { readonly que: string }>> = {
  enjambre: { que: 'Prestados escalonados y los Celadores tarde' },
  pareja: { que: 'Celadores de dos en dos, a la vez' },
  pinza: { que: 'Prestados por delante y por la espalda' },
  marea: { que: 'Prestados sin parar contra un tope de vivos' },
  francotirador: { que: 'Un tirador desde el borde, con escolta' },
  emboscada: { que: 'La impresión nace a la espalda del grupo' },
};

/** Una tabla por presentes de 1 a `asientos`, sacada de una función de `n`. */
function tabla(asientos: number, f: (n: number) => number): number[] {
  const t: number[] = [];
  for (let n = 1; n <= asientos; n++) t.push(f(n));
  return t;
}

/** Un grupo con sus vivos acotados: al menos uno, y nunca más de los que salen ni de los de la oleada. */
function grupo(
  clase: GrupoDeLaNoche['clase'],
  cuantos: readonly number[],
  vivasDeLaOleada: readonly number[],
  zona: ZonaDeEntrada,
  eleccion: EleccionDeEntrada,
  desdeTic: number,
  cadaTics: number,
  topeDeVivas: readonly number[] | null,
): GrupoDeLaNoche {
  const vivas: number[] = [];
  for (let i = 0; i < cuantos.length; i++) {
    const tope = topeDeVivas === null ? (vivasDeLaOleada[i] as number) : Math.min(vivasDeLaOleada[i] as number, topeDeVivas[i] as number);
    const v = Math.min(cuantos[i] as number, tope);
    vivas.push(v < 1 ? 1 : v);
  }
  return { clase, cuantos, vivas, zona, eleccion, desdeTic, cadaTics };
}

/** ¿Sale alguno en algún número de presentes? Un grupo vacío en todas no se declara. */
function haceFalta(cuantos: readonly number[]): boolean {
  for (const c of cuantos) if (c > 0) return true;
  return false;
}

/**
 * LA OLEADA `oleada` DE UNA NOCHE con su receta, para una mesa de `asientos` asientos, con el nivel
 * del Sistema de esa oleada y la contramedida de la noche.
 */
export function encuentroDeLaOleada(
  oleada: number,
  receta: IdDeReceta,
  nivel: number,
  contramedida: IdDeContramedida,
  asientos: number,
): EncuentroDeLaNoche {
  const vivas = tabla(asientos, (n) => porPresentes(VIVAS_POR_PRESENTES, n));
  const comp = tabla(asientos, (n) => n).map((n) => composicionDeLaOleada(oleada, n, nivel, contramedida));
  let prestados = comp.map((c) => c.prestados);
  let celadores = comp.map((c) => c.celadores);
  let tiradores = comp.map((c) => c.tiradores);
  const grupos: GrupoDeLaNoche[] = [];

  if (receta === 'marea') prestados = prestados.map((p) => Math.ceil((p * 3) / 2));
  if (receta === 'pareja') celadores = celadores.map((c) => (c === 1 ? 2 : c));
  if (receta === 'francotirador' && oleada >= 2) tiradores = tiradores.map((t) => (t < 1 ? 1 : t));

  /* Los Prestados. */
  if (receta === 'pinza') {
    const delante = prestados.map((p) => Math.ceil(p / 2));
    const detras = prestados.map((p, i) => p - (delante[i] as number));
    grupos.push(grupo('prestado', delante, vivas, 'aparicion', 'azar', 0, 20, null));
    if (haceFalta(detras)) grupos.push(grupo('prestado', detras, vivas, 'aparicion', 'aLaEspalda', 0, 20, null));
  } else if (receta === 'enjambre') {
    grupos.push(grupo('prestado', prestados, vivas, 'aparicion', 'azar', 0, 10, null));
  } else if (receta === 'marea') {
    grupos.push(grupo('prestado', prestados, vivas, 'aparicion', 'azar', 0, 20, vivas.map((v) => Math.ceil(v / 2))));
  } else if (oleada <= 1) {
    /* La primera oleada, en tres tandas separadas 15 s (§4.10). */
    const primera = prestados.map((p) => Math.ceil(p / 3));
    const segunda = prestados.map((p, i) => Math.ceil((p - (primera[i] as number)) / 2));
    const tercera = prestados.map((p, i) => p - (primera[i] as number) - (segunda[i] as number));
    grupos.push(grupo('prestado', primera, vivas, 'aparicion', 'azar', 0, 0, null));
    if (haceFalta(segunda)) grupos.push(grupo('prestado', segunda, vivas, 'aparicion', 'azar', 300, 0, null));
    if (haceFalta(tercera)) grupos.push(grupo('prestado', tercera, vivas, 'aparicion', 'azar', 600, 0, null));
  } else {
    grupos.push(grupo('prestado', prestados, vivas, 'aparicion', 'azar', 0, 20, null));
  }

  /* Los Celadores: se imprimen en la plaza. */
  if (haceFalta(celadores)) {
    const desde = receta === 'enjambre' ? 400 : 100;
    const cada = receta === 'pareja' ? 0 : 100;
    const eleccion: EleccionDeEntrada = receta === 'emboscada' ? 'aLaEspalda' : 'azar';
    grupos.push(grupo('celador', celadores, vivas, 'impresion', eleccion, desde, cada, null));
  }

  /* Los tiradores: impresos en la plaza, o desde un borde con la receta del francotirador. */
  if (haceFalta(tiradores)) {
    const francotirador = receta === 'francotirador';
    const zona: ZonaDeEntrada = francotirador ? 'aparicion' : 'impresion';
    const eleccion: EleccionDeEntrada = receta === 'emboscada' ? 'aLaEspalda' : 'azar';
    grupos.push(grupo('tirador', tiradores, vivas, zona, eleccion, francotirador ? 0 : 200, 200, null));
  }

  return { vivas, grupos };
}

/**
 * CUÁNTOS TIENEN QUE SALIR para ganar la Llamada con `presentes` desvelados: la mitad, redondeando
 * hacia arriba (§4.11). Lo declara el productor (`salenComoMinimo`) y lo exige el reductor a la ronda
 * que dice «ganada»: la misma cuenta en los dos lados, escrita una vez.
 */
export function salenParaGanar(presentes: number): number {
  return Math.ceil(presentes / 2);
}

/** Lo que dura como mucho la Llamada: la primera cabina y una más por cada moneda. */
export function ticsDeLaLlamada(cabinaTics: number, monedas: number): number {
  return cabinaTics + monedas * CABINA.otraTics;
}

/**
 * LA LLAMADA (§4.11): Prestados de uno en uno cada 2 s, uno desde la plaza y el siguiente desde la
 * cabina que suena, con los vivos de la tabla repartidos entre los dos, y desde el Aguacero un Celador, el
 * guardián, que nace en la cabina. Salen tantos como caben en lo que puede durar. La carrera es por la
 * ciudad: los de la plaza corren DETRÁS del grupo, y los de la cabina (el guardián también) le salen al
 * paso y, cuando llega, le hacen el cordón.
 *
 * Los de la cabina salían en el barrio de los cruces de fuera, a cuarenta metros de la plaza y de camino a
 * cualquier cabina. En la ciudad la cabina está a 100-160 m por calles (ver `quiebro-liza.ts`), y lo que
 * queda de camino depende de por dónde se vaya: nacen EN la cabina (`zonaDeAccion`, como el guardián),
 * que es el «cordón» de la cercana de la entrega 2 (`docs/quiebro/CIUDAD-ABIERTA.md`, §3.7) sin inventar
 * sitios sueltos, que son de nudos (L1).
 *
 * Los de la plaza salen de las bocas de la plaza de la Bajada, que es donde el grupo pelea las oleadas, y no
 * de donde el grupo está al sonar: son la mitad «por detrás» del §3.7 sin sus nudos alrededor del grupo (L1,
 * entrega 2). Con el olvido de la travesía se quedaban atrás —la revisión de la sala vio llegar a 45 m a 2 de
 * cada 8 u 9, y olvidarse a 3 o 4—; sin él (`PERSECUCION_DEL_SISTEMA`) siguen al grupo por las calles hasta la
 * cabina, que es donde se para a descolgar. Si el grupo se fue lejos de la plaza en la última pausa, llegan
 * tarde o no llegan: el Prestado anda a 4 m/s y el trote es de 5.
 */
export function encuentroDeLaLlamada(nivel: number, monedas: number, asientos: number): EncuentroDeLaNoche {
  const fila = filaDelNivel(nivel);
  const total = Math.ceil(ticsDeLaLlamada(fila.cabinaTics, monedas) / LLAMADA_CADA_TICS);
  const vivasDePrestados = tabla(asientos, (n) => porPresentes(VIVAS_EN_LA_LLAMADA, n));
  const guardian = fila.guardian ? 1 : 0;
  const vivas = vivasDePrestados.map((v) => v + guardian);
  const deCerca = vivasDePrestados.map((v) => Math.ceil(v / 2));
  const deLejos = vivasDePrestados.map((v, i) => v - (deCerca[i] as number));
  const cada = 2 * LLAMADA_CADA_TICS;
  const grupos: GrupoDeLaNoche[] = [
    grupo('prestado', tabla(asientos, () => Math.ceil(total / 2)), vivasDePrestados, 'aparicion', 'azar', 0, cada, deCerca),
    grupo('prestado', tabla(asientos, () => Math.floor(total / 2)), vivasDePrestados, 'cabina', 'zonaDeAccion', LLAMADA_CADA_TICS, cada, deLejos),
  ];
  if (fila.guardian) grupos.push(grupo('celador', tabla(asientos, () => 1), vivas, 'cabina', 'zonaDeAccion', 0, 0, null));
  return { vivas, grupos };
}

/* ─── QUIÉN CUENTA Y DÓNDE SE JUEGA ──────────────────────────────────────── */

/**
 * LOS PRESENTES: los asientos que la mesa no da por ausentes (§3: un asiento sin canal 60 s deja de
 * contar en la oleada siguiente), uno como poco. Con esto se leen todas las tablas por presentes; lo
 * decide la MESA y no la sala contando canales, porque la sala que renace tras un despliegue sólo
 * tiene abierto el canal del primero que vuelve.
 */
export function presentesDeLaMesa(asientos: readonly Pick<AsientoDelQuiebro, 'ausente'>[]): number {
  let n = 0;
  for (const a of asientos) if (!a.ausente) n++;
  return n < 1 ? 1 : n;
}

/**
 * EL LÍMITE DE UNA FASE, dicho por lo que es: la plaza de la Bajada o la ciudad entera. El productor lo
 * pasa a su id de la Liza (`idDelLimiteDePlaza` e `ID_DEL_LIMITE_DE_LA_CIUDAD` de `quiebro-ciudad.ts`).
 */
export type LimiteDeLaFase = { readonly tipo: 'ciudad' } | { readonly tipo: 'plaza'; readonly plaza: number };

/**
 * EL LÍMITE DE UNA FASE (`docs/quiebro/CIUDAD-ABIERTA.md`, §3.1): en la Bajada, su plaza (60 × 60 m, la
 * número `bajada`); en TODO lo demás, la ciudad, también en las oleadas y en la pausa, que siguen en la
 * plaza de la Bajada pero ya no la encierran: la queja de Miguel, tal cual. Ya no depende de los
 * presentes —la glorieta de 48 y la de 60 se fueron con el barrio—, así que dentro de una fase el límite
 * no cambia nunca, venga el ausente que venga.
 */
export function limiteDeLaFase(fase: FaseDelQuiebro, bajada: number): LimiteDeLaFase {
  return fase.tipo === 'bajada' ? { tipo: 'plaza', plaza: bajada } : { tipo: 'ciudad' };
}

/**
 * A QUIÉN PERSIGUE EL SISTEMA Y SI OLVIDA (declaración L10 de la Liza: el alcance de blanco de cada clase y
 * el olvido de cada encuentro; §3.4 de la ciudad abierta). Los declara el productor, en metros de aquí.
 *
 * ═══ EN LA ENTREGA 1, EL SISTEMA NO SUELTA A NADIE ═══
 *
 * Todo encuentro de la entrega 1 está ANCLADO a un sitio: la oleada, a la plaza de la Bajada (sus bocas y
 * sus huecos de impresión); la Llamada, a esa plaza y a la cabina que suena. Con el olvido del §3.4 (lo que
 * pasa 10 s sin nadie a 90 m se disuelve y vuelve a la cola de su grupo) y su alcance de 45 m, alejarse del
 * ancla era un refugio: lo que salía de la plaza no tenía a nadie cerca, se olvidaba y volvía a salir de la
 * plaza, y la oleada acababa «aguantada» a los 150 s sin un solo golpe. La revisión de la sala lo midió con
 * el grupo quieto a 118-123 m (0 anuncios en las oleadas 1 a 4, todos a vida llena); con la franja de 45 a
 * 90 m ya cerrada en la Liza, sigue igual a 140 y a 170 m. Y pasar las oleadas así y ganar la Llamada es
 * subir de nivel sin pelear.
 *
 * El olvido es para la TRAVESÍA: huir de una emboscada por un callejón sin arrastrar al Sistema por la
 * ciudad. En la entrega 1 no hay travesía con combate —la pausa es calma—, y alejarse de una oleada no es
 * huir de una emboscada: es no jugarla. Así que aquí el Sistema persigue a cualquiera, esté donde esté
 * (alcance 0, «sin tope»), y no olvida (sin olvido): la oleada va a donde vaya el grupo, como iba en la
 * glorieta, y en la Llamada los de la plaza corren detrás del grupo y los de la cabina le salen al paso. El
 * precio es el del §4 («separarse se paga»): quien se va lejos se lleva detrás su parte de la oleada, y
 * hasta que se la quita de encima no se vacía.
 *
 * Los números del §3.4 (90 m y 10 s de olvido, 45 m de alcance) vuelven con lo que NACE donde está el grupo
 * —emboscadas, rezagado y la presión de la Llamada, que salen de nudos a su alrededor (L1, entrega 2)—:
 * entonces alejarse sí es escapar, y lo que se queda atrás se puede olvidar sin regalar la ronda.
 */
export interface PersecucionDelSistema {
  /** Ninguna clase toma por blanco a un asiento a más de esto en recta; 0 = sin tope. */
  readonly alcanceMetros: number;
  /** Lo que pasa `tics` sin nadie a `metros` se disuelve y vuelve a su grupo; `null` = no se olvida nada. */
  readonly olvido: { readonly metros: number; readonly tics: number } | null;
}

export const PERSECUCION_DEL_SISTEMA: PersecucionDelSistema = { alcanceMetros: 0, olvido: null };

/* ─── LAS RONDAS Y LAS FASES QUE NUMERA LA MESA ──────────────────────────── */

/**
 * EL NÚMERO DE RONDA de una fase de combate: el `n` del `arcade:ronda` con que la sala la cierra.
 * Único en toda la mesa (`noche × 10 + oleada`, y la Llamada es la `6`), no sólo en la noche: una
 * ronda de la oleada 1 de la noche 2 no se puede confundir con una rezagada de la noche 1, que el
 * reductor rechazaría igual pero diciendo por qué. `null` si la fase no se cierra con una ronda.
 */
export function rondaDeLaFase(noche: number, fase: FaseDelQuiebro): number | null {
  if (fase.tipo === 'oleada') return noche * 10 + fase.oleada;
  if (fase.tipo === 'llamada') return noche * 10 + OLEADAS_COMO_MUCHO + 1;
  return null;
}

/* ─── EL REGLAMENTO COMPUESTO ────────────────────────────────────────────── */

/** EL REGLAMENTO DE UN DESVELADO, ya compuesto con su estilo, sus retoques y la noche. */
export interface ReglasDelDesvelado {
  readonly asiento: string;
  readonly estilo: IdDeEstilo;
  /** Los retoques de la noche, sin repetir, en el orden en que se eligieron. */
  readonly retoques: readonly IdDeRetoque[];
  /** El aguante lleno (con la avería). */
  readonly aguante: number;
  readonly quiebro: {
    readonly metros: number;
    readonly tics: number;
    readonly soltableDesdeTic: number;
    readonly ventanaMs: number;
    readonly esquivaHastaMs: number;
    /** Los quiebros con la ventana de aprender que le quedan, y esa ventana. */
    readonly aprendiz: number;
    readonly aprendizMs: number;
  };
  readonly enganche: { readonly metros: number; readonly conoRumbos: number; readonly holguraMetros: number };
  readonly entrada: { readonly anuncioTics: number; readonly dano: number; readonly tocadoTics: number; readonly avanceMetros: number; readonly puntos: number };
  readonly seguida: {
    readonly anuncioTics: number;
    readonly anuncioAlCompas: number;
    readonly dano: number;
    readonly danoAlCompas: number;
    readonly tocadoTics: number;
    readonly puntos: number;
    readonly puntosAlCompas: number;
  };
  readonly cierre: { readonly anuncioTics: number; readonly dano: number; readonly derribadoTics: number; readonly empujeMetros: number; readonly puntos: number };
  readonly empellon: {
    readonly anuncioTics: number;
    readonly dano: number;
    readonly tocadoTics: number;
    readonly empujeMetros: number;
    readonly recargaTics: number;
    readonly puntos: number;
  };
  /** `avanceMetros`: lo que acomete hacia quien falló (lo que se quebró, y un metro más). */
  readonly replica: { readonly anuncioTics: number; readonly dano: number; readonly derribadoTics: number; readonly puntos: number; readonly avanceMetros: number };
  /** El segundo golpe de la Réplica, o `null` sin el retoque. */
  readonly replicaDoble: { readonly anuncioTics: number; readonly dano: number; readonly puntos: number } | null;
  readonly estampado: { readonly dano: number; readonly tics: number };
  readonly rescate: { readonly metros: number; readonly tics: number; readonly aguanteAlVolver: number; readonly focoAmbos: number };
  readonly firmeCadaTics: number;
}

/** UN ENEMIGO, ya con el nivel del Sistema y la avería aplicados. */
export interface GolpeCompuesto {
  readonly anuncioTics: number;
  readonly dano: number;
  readonly tics: number;
}

export interface EnemigosCompuestos {
  readonly prestado: { readonly vida: number; readonly golpe: GolpeCompuesto };
  readonly celador: {
    readonly vida: number;
    readonly entrada: GolpeCompuesto;
    readonly seguida: GolpeCompuesto;
    readonly cierre: GolpeCompuesto;
    readonly respuesta: GolpeCompuesto;
  };
  readonly tirador: { readonly vida: number; readonly entrada: GolpeCompuesto; readonly seguida: GolpeCompuesto; readonly apuntarTics: number; readonly balaDano: number };
  /** Con cuánta vida se levanta un Celador tras el Trasvase (o al reimprimirse). */
  readonly vidaTrasElTrasvase: number;
  readonly vidaTrasElTrasvaseDelTirador: number;
}

/** EL REGLAMENTO DE LA NOCHE, compuesto. Lo que sale de `componerReglamento`. */
export interface ReglamentoCompuesto {
  readonly base: string;
  readonly nivel: number;
  /** El nivel con que juega el Sistema en la fase de la vista (el siguiente en las propinas). */
  readonly nivelDelSistema: number;
  readonly averia: IdDeAveria;
  readonly contramedida: IdDeContramedida;
  readonly fila: FilaDeNivel;
  readonly filaDelSistema: FilaDeNivel;
  /** Un reglamento por asiento, en el orden de la mesa. */
  readonly asientos: readonly ReglasDelDesvelado[];
  readonly enemigos: EnemigosCompuestos;
  /**
   * El factor de puntos, nivel de la noche por avería, en DIEZMILÉSIMAS y exacto: 12.500 en Chaparrón,
   * 18.750 con «Cristal» en Chaparrón (×1,875). En por ciento no cabría sin redondear (187,5), y un
   * factor redondeado aquí y exacto en la declaración son dos traducciones del mismo número.
   */
  readonly puntosPorDiezMil: number;
  /** Aguante al reaparecer pagando una moneda, y al volver en la pausa tras caer. */
  readonly aguanteAlReaparecer: number;
  readonly aguanteAlVolverEnLaPausa: number;
  readonly monedasAlEmpezar: number;
  /** «Eco»: tics tras los que se repite cada ataque del Sistema; 0 = no se repite. */
  readonly repetirTrasTics: number;
  readonly apagon: boolean;
  readonly plazaDespejada: boolean;
}

/** Lo que `componerReglamento` necesita de la vista: el reglamento, la fase y el aprendiz de cada uno. */
export interface VistaParaComponer {
  readonly fase: FaseDelQuiebro;
  readonly reglamento: ReglamentoDelQuiebro;
  readonly asientos: readonly Pick<AsientoDelQuiebro, 'aprendiz'>[];
}

/** El aguante lleno de un estilo en una noche con esta avería. */
export function aguanteLleno(estilo: IdDeEstilo, averia: IdDeAveria): number {
  return porCiento(ESTILOS[estilo].aguante, AVERIAS[averia].vidaPorCiento);
}

/** Un golpe del Sistema con el anuncio y el daño del nivel. El anuncio no baja de un tic. */
function golpeDelSistema(anuncioTics: number, dano: number, tics: number, fila: FilaDeNivel): GolpeCompuesto {
  const anuncio = porCiento(anuncioTics, fila.anuncioPorCiento);
  return { anuncioTics: anuncio < 1 ? 1 : anuncio, dano: porCiento(dano, fila.danoPorCiento), tics };
}

function reglasDelDesvelado(
  asiento: string,
  estilo: IdDeEstilo,
  elegidos: readonly IdDeRetoque[],
  aprendiz: number,
  fila: FilaDeNivel,
  averia: FilaDeAveria,
): ReglasDelDesvelado {
  const e = ESTILOS[estilo];
  const retoques: IdDeRetoque[] = [];
  for (const r of elegidos) if (retoques.indexOf(r) < 0 && IDS_DE_RETOQUE.indexOf(r) >= 0) retoques.push(r);
  const tiene = (r: IdDeRetoque): boolean => retoques.indexOf(r) >= 0;
  const pasoLargo = tiene('paso-largo');
  const ancha = tiene('ventana-ancha');
  const plomo = tiene('puno-de-plomo');
  const iman = tiene('iman');
  const enlace = tiene('enlace');
  const golpe = (dano: number): number => porCiento(dano, e.golpesPorCiento);
  const g = GOLPES;
  return {
    asiento,
    estilo,
    retoques,
    aguante: porCiento(e.aguante, averia.vidaPorCiento),
    quiebro: {
      metros: e.quiebroMetros + (pasoLargo ? RETOQUES.pasoLargo.quiebroMetros : 0),
      tics: QUIEBRO_DEL_DESVELADO.tics,
      soltableDesdeTic: e.soltableDesdeTic,
      ventanaMs: fila.ventanaMs + (ancha ? RETOQUES.ventanaAncha.ventanaMs : 0),
      esquivaHastaMs: QUIEBRO_DEL_DESVELADO.esquivaHastaMs + (pasoLargo ? RETOQUES.pasoLargo.esquivaHastaMs : 0),
      aprendiz,
      aprendizMs: QUIEBRO_DEL_DESVELADO.aprendizMs + (ancha ? RETOQUES.ventanaAncha.ventanaMs : 0),
    },
    enganche: {
      metros: iman && RETOQUES.iman.engancheMetros > e.engancheMetros ? RETOQUES.iman.engancheMetros : e.engancheMetros,
      conoRumbos: g.enganche.conoRumbos,
      holguraMetros: g.enganche.holguraMetros,
    },
    entrada: { anuncioTics: g.entrada.anuncioTics, dano: golpe(g.entrada.dano), tocadoTics: g.entrada.tocadoTics, avanceMetros: iman ? RETOQUES.iman.avanceMetros : g.entrada.avanceMetros, puntos: g.entrada.puntos },
    seguida: {
      anuncioTics: g.seguida.anuncioTics,
      anuncioAlCompas: g.seguida.anuncioAlCompas,
      dano: golpe(g.seguida.dano),
      danoAlCompas: golpe(g.seguida.danoAlCompas),
      tocadoTics: g.seguida.tocadoTics,
      puntos: g.seguida.puntos,
      puntosAlCompas: g.seguida.puntosAlCompas,
    },
    cierre: {
      anuncioTics: g.cierre.anuncioTics,
      dano: porCiento(g.cierre.dano, e.cierrePorCiento),
      derribadoTics: g.cierre.derribadoTics,
      empujeMetros: plomo ? RETOQUES.punoDePlomo.empujeMetros : g.cierre.empujeMetros,
      puntos: g.cierre.puntos,
    },
    empellon: {
      anuncioTics: g.empellon.anuncioTics,
      dano: golpe(g.empellon.dano),
      tocadoTics: g.empellon.tocadoTics,
      empujeMetros: plomo ? RETOQUES.punoDePlomo.empujeMetros : g.empellon.empujeMetros,
      recargaTics: g.empellon.recargaTics,
      puntos: g.empellon.puntos,
    },
    replica: {
      anuncioTics: g.replica.anuncioTics,
      dano: golpe(g.replica.dano),
      derribadoTics: g.replica.derribadoTics,
      puntos: g.replica.puntos,
      avanceMetros: e.quiebroMetros + (pasoLargo ? RETOQUES.pasoLargo.quiebroMetros : 0) + g.replica.avanceTrasElQuiebroMetros,
    },
    replicaDoble: tiene('replica-doble') ? { anuncioTics: g.replicaDoble.anuncioTics, dano: golpe(g.replicaDoble.dano), puntos: g.replicaDoble.puntos } : null,
    estampado: { dano: plomo ? RETOQUES.punoDePlomo.estampadoDano : g.estampado.dano, tics: g.estampado.tics },
    rescate: {
      metros: CAIDA.rescate.metros,
      tics: enlace ? RETOQUES.enlace.rescateTics : CAIDA.rescate.tics,
      aguanteAlVolver: porCiento(AGUANTE.alSerRescatado, averia.vidaPorCiento),
      focoAmbos: enlace ? RETOQUES.enlace.focoAmbos : 0,
    },
    firmeCadaTics: e.firmeCadaTics,
  };
}

/**
 * COMPONE EL REGLAMENTO DE LA VISTA: de los ids que publica la mesa, los números de cada asiento y
 * del Sistema. Es la ÚNICA traducción (ver la cabecera). `null` si la vista nombra una base de tablas
 * que este binario no conoce: un aparato viejo no puede adivinar los números de una base nueva, y
 * jugar con los suyos sería jugar a otra cosa que la sala.
 */
export function componerReglamento(v: VistaParaComponer): ReglamentoCompuesto | null {
  const r = v.reglamento;
  if (r.base !== BASE_DEL_REGLAMENTO) return null;
  const fila = filaDelNivel(r.nivel);
  const sistema = nivelDelSistema(fila.nivel, v.fase);
  const filaDelSistema = filaDelNivel(sistema);
  const averia = AVERIAS[r.averia];
  const asientos: ReglasDelDesvelado[] = [];
  for (let i = 0; i < r.asientos.length; i++) {
    const e = r.asientos[i] as ReglamentoDelQuiebro['asientos'][number];
    const aprendiz = v.asientos[i]?.aprendiz ?? 0;
    asientos.push(reglasDelDesvelado(e.asiento, e.estilo, e.retoques, aprendiz, fila, averia));
  }
  const vida = (x: number): number => {
    const y = porCiento(x, averia.vidaPorCiento);
    return y < 1 ? 1 : y;
  };
  const E = ENEMIGOS;
  const celadorVida = vida(E.celador.vida);
  const tiradorVida = vida(E.tirador.vida);
  const trasvase = vida(E.trasvase.vida);
  return {
    base: r.base,
    nivel: fila.nivel,
    nivelDelSistema: sistema,
    averia: r.averia,
    contramedida: r.contramedida,
    fila,
    filaDelSistema,
    asientos,
    enemigos: {
      prestado: { vida: vida(E.prestado.vida), golpe: golpeDelSistema(E.prestado.golpe.anuncioTics, E.prestado.golpe.dano, E.prestado.golpe.tocadoTics, filaDelSistema) },
      celador: {
        vida: celadorVida,
        entrada: golpeDelSistema(E.celador.entrada.anuncioTics, E.celador.entrada.dano, E.celador.entrada.tocadoTics, filaDelSistema),
        seguida: golpeDelSistema(E.celador.seguida.anuncioTics, E.celador.seguida.dano, E.celador.seguida.tocadoTics, filaDelSistema),
        cierre: golpeDelSistema(E.celador.cierre.anuncioTics, E.celador.cierre.dano, E.celador.cierre.derribadoTics, filaDelSistema),
        respuesta: golpeDelSistema(E.celador.respuesta.anuncioTics, E.celador.respuesta.dano, E.celador.respuesta.tocadoTics, filaDelSistema),
      },
      tirador: {
        vida: tiradorVida,
        entrada: golpeDelSistema(E.celador.entrada.anuncioTics, E.celador.entrada.dano, E.celador.entrada.tocadoTics, filaDelSistema),
        seguida: golpeDelSistema(E.celador.seguida.anuncioTics, E.celador.seguida.dano, E.celador.seguida.tocadoTics, filaDelSistema),
        apuntarTics: golpeDelSistema(E.tirador.bala.apuntarTics, 0, 0, filaDelSistema).anuncioTics,
        balaDano: porCiento(E.tirador.bala.dano, filaDelSistema.danoPorCiento),
      },
      vidaTrasElTrasvase: trasvase > celadorVida ? celadorVida : trasvase,
      vidaTrasElTrasvaseDelTirador: trasvase > tiradorVida ? tiradorVida : trasvase,
    },
    puntosPorDiezMil: fila.puntosPorCiento * averia.puntosPorCiento,
    aguanteAlReaparecer: vida(AGUANTE.alReaparecer),
    aguanteAlVolverEnLaPausa: vida(AGUANTE.alVolverEnLaPausa),
    monedasAlEmpezar: monedasAlEmpezar(fila.nivel, r.contramedida),
    repetirTrasTics: averia.repetirTrasTics,
    apagon: averia.apagon,
    plazaDespejada: r.contramedida === 'plaza-despejada',
  };
}

/* ─── LO QUE SE ENSEÑA DE UN ESTILO ──────────────────────────────────────── */

/**
 * LA FRASE DE UN ESTILO para su botón: el aguante, el quiebro y el rasgo. Sale de la tabla, así que
 * no puede decir un número distinto del que se juega.
 */
export function comoEsElEstilo(estilo: IdDeEstilo): string {
  const e = ESTILOS[estilo];
  const metros = String(e.quiebroMetros).replace('.', ',');
  const rasgos: string[] = [`${String(e.aguante)} de aguante`, `quiebro de ${metros} m`];
  if (e.golpesPorCiento !== 100) rasgos.push(`golpes ×${String(e.golpesPorCiento / 100).replace('.', ',')}`);
  if (e.cierrePorCiento !== e.golpesPorCiento) rasgos.push(`${NOMBRES_DEL_QUIEBRO.golpes.cierre} ×${String(e.cierrePorCiento / 100).replace('.', ',')}`);
  if (e.engancheMetros !== ESTILOS.gabardina.engancheMetros) rasgos.push(`engancha a ${String(e.engancheMetros)} m`);
  if (e.soltableDesdeTic < ESTILOS.gabardina.soltableDesdeTic) rasgos.push('recupera antes del quiebro');
  if (e.firmeCadaTics > 0) rasgos.push(`aguanta un golpe sin quedar ${NOMBRES_DEL_QUIEBRO.estados.tocado.toLowerCase()} cada ${String(e.firmeCadaTics / 20)} s`);
  return rasgos.join(' · ');
}
