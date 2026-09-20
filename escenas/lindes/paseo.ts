/**
 * EL PASEO: andar por encima del tablero, en primera o en tercera persona.
 *
 * ═══ QUÉ ES ESTO Y QUÉ NO ═══
 *
 * Es una máquina PURA —recibe dónde estabas, qué tecla llevas pulsada y cuánto
 * tiempo ha pasado, y dice dónde estás ahora— y NO toca el estado del juego. Andar
 * no es un movimiento: no entra por el reductor, no viaja por el cable y no cambia
 * la partida. Es una cámara y un avatar, y por eso cabe entero en la escena.
 *
 * Pura por lo mismo que `escenas/burgo/peon.ts`: un aventurero que atraviesa una
 * muralla, o que se sale del tablero y se queda andando sobre el vacío, no da
 * ningún error — se ve. La única forma de prometer que no pasa es que la función
 * que lo decide se pueda recorrer diez mil pasos en Node.
 *
 * ═══ LOS LÍMITES SON LAS LOSAS PUESTAS, Y ESO ES UNA DECISIÓN ═══
 *
 * Se anda por donde hay tablero, y el tablero crece durante la partida. Podría
 * dejarse andar por el vacío —es más fácil— y sería peor: el valle de alrededor no
 * existe, así que quien saliera vería el mundo por debajo y no sabría volver. Al
 * llegar al borde de la última losa, se para. Es la misma clase de decisión que
 * `cala.ts` toma con el agua del embarcadero.
 */
import { LADO_DE_LOSA } from './medidas';
import { centroDeCelda } from './losa';
import type { CeldaDeSuelo } from './losa';
import { ALTURA_DE_UNA_PERSONA, PASO_POR_SEGUNDO } from '../escala';

/** A qué velocidad anda un aventurero por el tablero. */
export const VELOCIDAD_DEL_PASEO = PASO_POR_SEGUNDO * 3;

/** Y corriendo. */
export const VELOCIDAD_CORRIENDO = VELOCIDAD_DEL_PASEO * 2.2;

/** Lo deprisa que gira, en radianes por segundo. */
export const GIRO_POR_SEGUNDO = 2.6;

/** A qué altura van los ojos. */
export const ALTURA_DE_LOS_OJOS = ALTURA_DE_UNA_PERSONA * 0.92;

/** Cuánto se queda la cámara de hombro por detrás y por encima. */
export const ATRAS_DEL_HOMBRO = ALTURA_DE_UNA_PERSONA * 2.6;
export const SOBRE_EL_HOMBRO = ALTURA_DE_UNA_PERSONA * 1.5;

/** Dónde está y hacia dónde mira quien pasea. */
export interface Paseante {
  /** Hacia el este, en unidades del mundo. */
  readonly x: number;
  /** Hacia el sur, en unidades del mundo. */
  readonly z: number;
  /** Hacia dónde mira, en radianes: 0 es el norte y crece hacia el este. */
  readonly rumbo: number;
  /** Cuánto lleva andando seguido, para el clip de la animación. */
  readonly andando: number;
}

/** Lo que se lleva pulsado. */
export interface Mandos {
  readonly adelante: boolean;
  readonly atras: boolean;
  readonly izquierda: boolean;
  readonly derecha: boolean;
  readonly deprisa: boolean;
}

/** Nadie tocando nada. */
export const QUIETO: Mandos = {
  adelante: false,
  atras: false,
  izquierda: false,
  derecha: false,
  deprisa: false,
};

/** Dónde empieza el paseo: en el centro de una casilla, mirando al norte. */
export function nacerEn(x: number, y: number): Paseante {
  return { x: x * LADO_DE_LOSA, z: -y * LADO_DE_LOSA, rumbo: 0, andando: 0 };
}

/**
 * HACIA DÓNDE HAY QUE GIRAR LA MARIONETA PARA QUE MIRE A SU RUMBO.
 *
 * ═══ POR QUÉ NO ES `rumbo + π`, QUE ES LO QUE PARECE ═══
 *
 * El rumbo de esta casa tiene el cero al NORTE y crece hacia el ESTE, así que quien anda
 * se mueve hacia `(sin r, −cos r)` — está escrito en `unPaso`. Las marionetas de KayKit,
 * en cambio, nacen mirando a su `+z`, y un giro de `θ` alrededor del eje vertical deja ese
 * `+z` en `(sin θ, cos θ)`. Igualando las dos cosas sale `θ = π − r`, que es exactamente
 * `atan2(sin r, −cos r)`: el ángulo de su propio rumbo, sin más.
 *
 * Aquí había `r + π`, y **las dos cuentas dan lo mismo mirando al norte y al sur**. Por eso
 * pasó: el paseante nace mirando al norte, se mira, se ve la nuca, y todo parece bien. Al
 * este y al oeste dan lo CONTRARIO, y el aventurero andaba de espaldas.
 *
 * Mirado en el móvil girando de cuarenta y cinco en cuarenta y cinco: en 180° de giro se
 * vieron dos nucas y dos caras. Con la cámara pegada detrás, el ángulo aparente sólo puede
 * cambiar al DOBLE del giro si el muñeco está espejado; si estuviera bien, no cambiaría
 * nunca.
 */
export function giroDeLaMarioneta(rumbo: number): number {
  return Math.PI - rumbo;
}

/** Lo justo que se mira de una pieza puesta: dónde está. */
export interface DondeHayAlgo {
  readonly x: number;
  readonly z: number;
}

/**
 * DÓNDE NACE QUIEN PASEA, DENTRO DE LA LOSA EN LA QUE NACE.
 *
 * ═══ EL CENTRO DE UNA LOSA NO ES UN SITIO ═══
 *
 * `nacerEn` deja al paseante en el centro exacto de la casilla. En un prado da igual; en
 * una villa es un desastre. LA VILLA AMURALLADA es ciudad de lado a lado, así que nacer
 * en su centro es nacer DENTRO de una casa — y el paseante nace en la ÚLTIMA losa
 * puesta, que en este juego es villa cuatro veces de cada diez.
 *
 * Medido en el móvil, en una mesa de dos losas: al pulsar «hombro» la pantalla entera era
 * un tejado rojo a un palmo de la cara, y en «ojos» lo mismo. Andando cinco segundos se
 * salía del pueblo y el paisaje aparecía de golpe. No falla nada, no avisa nadie, no lo
 * ve ningún comprobador de geometría — y es lo PRIMERO que se ve al pulsar el botón.
 *
 * ═══ SE ELIGE CON LO QUE LA LOSA YA SABE DE SÍ MISMA ═══
 *
 * Ni lista de modelos que estorban ni umbral de tamaño: las dos cosas se quedan viejas el
 * día que alguien añade una pieza, y se quedan viejas EN SILENCIO. Se usan las CELDAS del
 * suelo, que ya dicen si son `senda`, `prado` o `villa`, y las PUESTAS, que ya dicen
 * dónde hay algo levantado. Se prefiere la senda —un camino es, literalmente, por donde
 * se anda—, luego el prado, y entre las celdas que valen gana la que más lejos tenga lo
 * más cercano.
 */
export function nacerEnLaLosa(
  x: number,
  y: number,
  celdas: readonly CeldaDeSuelo[],
  puestas: readonly DondeHayAlgo[],
): Paseante {
  const sendas = celdas.filter((c) => c.clase === 'senda');
  const prados = celdas.filter((c) => c.clase === 'prado');
  /*
   * Si la losa es villa entera no hay celda buena y se cogen todas: entre malas, la plaza
   * más despejada. Quedarse sin nacer sería peor que nacer en un sitio regular.
   */
  const candidatas = sendas.length > 0 ? sendas : prados.length > 0 ? prados : celdas;

  let mejor: DondeHayAlgo | null = null;
  let suHolgura = -1;
  let loMasCerca: DondeHayAlgo | null = null;
  for (const c of candidatas) {
    const enFracciones = centroDeCelda(c.i, c.j);
    const punto = { x: enFracciones.x * LADO_DE_LOSA, z: enFracciones.z * LADO_DE_LOSA };
    let holgura = Number.POSITIVE_INFINITY;
    let cerca: DondeHayAlgo | null = null;
    for (const q of puestas) {
      const d = Math.hypot(punto.x - q.x, punto.z - q.z);
      if (d < holgura) {
        holgura = d;
        cerca = q;
      }
    }
    if (holgura > suHolgura) {
      suHolgura = holgura;
      mejor = punto;
      loMasCerca = cerca;
    }
  }
  if (mejor === null) return nacerEn(x, y);

  /*
   * Y MIRANDO A LO ABIERTO, de espaldas a lo más cercano. Nacer pegado a un muro mirándolo
   * es la mitad del fallo que esto arregla: se ve lo mismo que dentro de la casa.
   */
  const rumbo =
    loMasCerca === null ? 0 : Math.atan2(mejor.x - loMasCerca.x, -(mejor.z - loMasCerca.z));
  return { x: x * LADO_DE_LOSA + mejor.x, z: -y * LADO_DE_LOSA + mejor.z, rumbo, andando: 0 };
}


/** ¿Hay losa puesta en la casilla que contiene este punto? */
export function hayLosaEn(
  puestas: ReadonlySet<string>,
  x: number,
  z: number,
): boolean {
  const i = Math.round(x / LADO_DE_LOSA);
  const j = Math.round(-z / LADO_DE_LOSA);
  return puestas.has(`${i},${j}`);
}

/**
 * UN PASO.
 *
 * ═══ EL SENO Y EL COSENO ESTÁN AQUÍ Y NO PASA NADA ═══
 *
 * `verify:pureza` prohíbe la trigonometría en `shared/arcade/` y en
 * `shared/mecanicas/`, porque de ahí sale el ESTADO y un último bit distinto entre
 * dos motores desincroniza una partida. Esto no es estado: es dónde está mirando
 * una cámara en un aparato, no viaja a ningún sitio y nadie lo compara con nada.
 * Prohibirlo aquí sería aplicar la regla sin su razón.
 *
 * ═══ Y SE PARA EN EL BORDE EN VEZ DE RESBALAR ═══
 *
 * Si el paso siguiente cae fuera del tablero se prueba SÓLO en `x` y SÓLO en `z`,
 * y se queda con lo que sí quepa. Eso es lo que hace que andar pegado al borde no
 * se enganche: sin ello, quien camina en diagonal contra el borde se queda clavado
 * aunque uno de los dos ejes esté libre, y se lee como que el juego se ha colgado.
 */
export function unPaso(
  quien: Paseante,
  mandos: Mandos,
  dt: number,
  puestas: ReadonlySet<string>,
): Paseante {
  const paso = Math.min(dt, 0.1);
  let rumbo = quien.rumbo;
  if (mandos.izquierda) rumbo -= GIRO_POR_SEGUNDO * paso;
  if (mandos.derecha) rumbo += GIRO_POR_SEGUNDO * paso;
  /* El rumbo se guarda siempre en [−π, π] para que no crezca sin fin en una sesión larga. */
  while (rumbo > Math.PI) rumbo -= Math.PI * 2;
  while (rumbo < -Math.PI) rumbo += Math.PI * 2;

  const adelante = (mandos.adelante ? 1 : 0) - (mandos.atras ? 1 : 0);
  if (adelante === 0) return { x: quien.x, z: quien.z, rumbo, andando: 0 };

  const velocidad = (mandos.deprisa ? VELOCIDAD_CORRIENDO : VELOCIDAD_DEL_PASEO) * adelante * paso;
  /* El norte es la `z` negativa: mirando al rumbo 0 se va hacia −z. */
  const dx = Math.sin(rumbo) * velocidad;
  const dz = -Math.cos(rumbo) * velocidad;

  let x = quien.x;
  let z = quien.z;
  if (hayLosaEn(puestas, x + dx, z + dz)) {
    x += dx;
    z += dz;
  } else {
    if (hayLosaEn(puestas, x + dx, z)) x += dx;
    if (hayLosaEn(puestas, x, z + dz)) z += dz;
  }
  return { x, z, rumbo, andando: quien.andando + paso };
}

/** Dónde va la cámara y hacia dónde mira, según el modo. */
export interface PoseDeCamara {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly miraX: number;
  readonly miraY: number;
  readonly miraZ: number;
}

/**
 * LA POSE DE LA CÁMARA DE MESA, que ademas dice HASTA DONDE hay que ver.
 *
 * Las cámaras de paseo no lo dicen porque no encuadran nada: van pegadas al suelo y lo
 * que se ve de lejos es niebla. La de mesa sí, y por eso el campo va aquí y no en el
 * común: un campo opcional que en la práctica siempre está es la mejor manera de que un
 * día se olvide justo donde importa.
 */
/** Un rectángulo de suelo, en coordenadas del mundo. */
export interface TrozoDeSuelo {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
  /** Lo que hay desde la cámara hasta la esquina del cuadro que pisa más lejos. */
  readonly masLejos: number;
}

export interface PoseDeMesa extends PoseDeCamara {
  /** El plano de fondo que hace falta para que la esquina de allá se vea. */
  readonly lejos: number;
  /** Desde dónde y hasta dónde va la niebla SIN comerse el tablero. Ver abajo. */
  readonly niebla: { readonly cerca: number; readonly lejos: number };
  /**
   * EL SUELO QUE HAY QUE PINTAR PARA QUE NO SE LE VEA EL CANTO. Ver `sueloQueSeVe`.
   */
  readonly suelo: TrozoDeSuelo;
}

/**
 * DÓNDE PISA EL SUELO CADA ESQUINA DEL CUADRO.
 *
 * ═══ POR QUÉ ESTA CUENTA EXISTE ═══
 *
 * La arena se dimensionaba desde EL TABLERO —su caja más `MARGEN_DE_LA_ARENA`, dos
 * losas por lado— con el comentario «para que no se le vea el borde». Medido en la
 * pantalla con una partida en marcha: **el 35 % del cuadro era cielo**, y el 18 % de la
 * mitad de abajo. El desierto salía como un rombo flotando, con dos cuñas de cielo a
 * izquierda y derecha bajando hasta el filo inferior.
 *
 * Y no es que faltara horizonte: con cincuenta grados de inclinación y 45 de campo, el
 * rayo de la esquina de arriba baja con `−sen i + t·cos i = −0,50`, o sea que **las
 * cuatro esquinas del cuadro pisan el suelo**. Lo que se veía era el CANTO de la arena,
 * no el fin del mundo. El margen estaba atado al tamaño del tablero y lo que manda es
 * a qué distancia se ha puesto la cámara, que crece con el tablero Y con lo estrecha
 * que sea la ventana.
 *
 * Es la misma regla que ya gobierna `lejos` y la niebla tres renglones más abajo: quien
 * sabe dónde se pone la cámara es esta cuenta, así que es esta cuenta la que dice hasta
 * dónde hay que pintar.
 *
 * ═══ LA CUENTA, QUE ES EXACTA ═══
 *
 * Con la cámara en `(0, h, D·cos i)` mirando al centro, el rayo que sale por el punto
 * `(u, v)` del cuadro —los dos en [−1, 1]— es, sin normalizar:
 *
 *     dir = (u·t·aspecto,  −sen i + v·t·cos i,  −cos i − v·t·sen i)
 *
 * y corta el suelo en `s = h / (sen i − v·t·cos i)`. Las cuatro esquinas dan la caja.
 */
export function sueloQueSeVe(
  centroX: number,
  centroZ: number,
  distancia: number,
  inclinacion: number,
  t: number,
  aspecto: number,
): TrozoDeSuelo {
  const sen = Math.sin(inclinacion);
  const cos = Math.cos(inclinacion);
  const alto = distancia * sen;
  const camaraZ = centroZ + distancia * cos;
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let z0 = Number.POSITIVE_INFINITY;
  let z1 = Number.NEGATIVE_INFINITY;
  let masLejos = 0;
  for (const u of [-1, 1]) {
    for (const v of [-1, 1]) {
      const baja = sen - v * t * cos;
      /*
       * Si el rayo no baja, esa esquina mira por encima del horizonte y ningún suelo
       * finito la tapa. No pasa con 50° y 45 de campo —sale 0,50— pero el día que alguien
       * tumbe la cámara esto tiene que devolver algo, no un infinito.
       */
      if (baja <= 1e-6) continue;
      const s = alto / baja;
      const x = centroX + s * (u * t * aspecto);
      const z = camaraZ + s * (-cos - v * t * sen);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
      /* `s` va sobre el rayo sin normalizar; el largo de verdad lo da su módulo. */
      const largoDelRayo = Math.sqrt(
        (u * t * aspecto) ** 2 + baja ** 2 + (cos + v * t * sen) ** 2,
      );
      const hasta = s * largoDelRayo;
      if (hasta > masLejos) masLejos = hasta;
    }
  }
  if (!Number.isFinite(x0)) {
    return { x0: centroX, x1: centroX, z0: centroZ, z1: centroZ, masLejos: distancia };
  }
  return { x0, x1, z0, z1, masLejos };
}

/** La cámara de ojos: donde está la cara, mirando adelante. */
export function camaraDeOjos(quien: Paseante): PoseDeCamara {
  return {
    x: quien.x,
    y: ALTURA_DE_LOS_OJOS,
    z: quien.z,
    miraX: quien.x + Math.sin(quien.rumbo) * 10,
    miraY: ALTURA_DE_LOS_OJOS * 0.85,
    miraZ: quien.z - Math.cos(quien.rumbo) * 10,
  };
}

/** La cámara de hombro: por detrás y por encima, mirando a la nuca. */
export function camaraDeHombro(quien: Paseante): PoseDeCamara {
  return {
    x: quien.x - Math.sin(quien.rumbo) * ATRAS_DEL_HOMBRO,
    y: SOBRE_EL_HOMBRO,
    z: quien.z + Math.cos(quien.rumbo) * ATRAS_DEL_HOMBRO,
    miraX: quien.x + Math.sin(quien.rumbo) * 6,
    miraY: ALTURA_DE_UNA_PERSONA * 0.6,
    miraZ: quien.z - Math.cos(quien.rumbo) * 6,
  };
}

/**
 * LA CÁMARA DE MESA: desde arriba, abarcando lo que hay puesto.
 *
 * ═══ LA DISTANCIA SE MIDE, NO SE ELIGE ═══
 *
 * El tablero de este juego CRECE: empieza en una losa y acaba en setenta y dos, y
 * una distancia fija sirve para una de las dos cosas. Así que se calcula: se mira
 * lo que abarca lo puesto, se le suma un margen, y se aleja la cámara lo que haga
 * falta para que quepa a lo ancho Y a lo alto — lo segundo es lo que se olvida, y
 * se ve como un tablero que se sale por arriba en un móvil apaisado.
 */
export function camaraDeMesa(
  abarca: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number },
  aspecto: number,
  campoEnGrados = 45,
): PoseDeMesa {
  const centroX = ((abarca.minX + abarca.maxX) / 2) * LADO_DE_LOSA;
  const centroZ = (-(abarca.minY + abarca.maxY) / 2) * LADO_DE_LOSA;
  const ancho = (abarca.maxX - abarca.minX + 1.6) * LADO_DE_LOSA;
  const alto = (abarca.maxY - abarca.minY + 1.6) * LADO_DE_LOSA;

  /* Cincuenta grados de inclinación: se ve el grueso de las losas y no se pierde el plano. */
  const inclinacion = (50 * Math.PI) / 180;

  /*
   * ═══ LA DISTANCIA SE DESPEJA EN LA ESQUINA QUE SE SALE, NO EN EL CENTRO ═══
   *
   * Esto era `ancho / 2 / tan(medioCampo) / aspecto`: la distancia a la que el ancho del
   * tablero cabe en el campo SI el tablero estuviera de frente y todo él a la misma
   * distancia. No lo está: está tumbado y la cámara lo mira desde cincuenta grados, así que
   * el canto de ACÁ queda bastante más cerca que el centro y se proyecta bastante más
   * ancho. Medido: el tablero del banco salía al 110 % del lienzo —los dos cantos cortados—
   * con la cuenta dando por buena la distancia.
   *
   * Es otra vez la lección de la caja del Burgo: medir desde el centro cuando lo que se
   * sale es la esquina. Ahora se despeja la distancia CON la esquina dentro.
   *
   * Poniendo el origen en el centro del tablero, con la cámara a `d` sobre la recta que
   * sube con `inclinacion`, para un punto del suelo `(x, z)` sale, y las dos son exactas:
   *
   *     hondo = d − z · cos(inclinacion)
   *     en la pantalla: x / (hondo · t · aspecto) y −z · sen(inclinacion) / (hondo · t)
   *
   * Pedir que las dos se queden en uno y despejar `d` da los dos renglones de abajo. El
   * caso peor es siempre el canto de acá —`z = +alto/2`, el más cercano—, y por eso el
   * `cos` SUMA en los dos.
   */
  const t = Math.tan(((campoEnGrados / 2) * Math.PI) / 180);
  const medioAncho = ancho / 2;
  const medioAlto = alto / 2;
  const porAncho = medioAncho / (t * Math.max(0.35, aspecto)) + medioAlto * Math.cos(inclinacion);
  const porAlto = (medioAlto * Math.sin(inclinacion)) / t + medioAlto * Math.cos(inclinacion);
  /* Un pelo de aire para que el canto no vaya pegado al borde del lienzo. */
  const distancia = Math.max(porAlto, porAncho) * 1.04;

  /*
   * ═══ Y HASTA DÓNDE TIENE QUE LLEGAR EL LIENZO ═══
   *
   * El plano de fondo lo escribía a mano quien montaba la escena —`far: 6000` en el banco
   * y en los dos clientes— y eso vale mientras el tablero sea pequeño. Con un tablero
   * largo en una pantalla estrecha la cámara se va a cuatro mil y la esquina de allá queda
   * a SEIS MIL TRESCIENTOS: detrás del fondo. El tablero entero desaparece, se ve cielo, y
   * no hay un solo error en la consola — que es como se pierde una tarde.
   *
   * Quien sabe a qué distancia se pone la cámara es esta cuenta, así que es esta cuenta la
   * que tiene que decir hasta dónde hay que ver. La esquina de allá está a `distancia` más
   * media diagonal del tablero, con un tercio de sobra para el cielo del fondo.
   *
   * ═══ Y NO BASTA CON EL TABLERO: TAMBIÉN EL SUELO QUE SE VE ═══
   *
   * Porque la esquina de arriba del CUADRO pisa el suelo más lejos que la esquina del
   * tablero —su rayo baja con 0,50 en vez de 0,77, o sea 1,5 veces la distancia de la
   * cámara— y ahí el plano de fondo la cortaba. Lo que quedaba detrás no era niebla: era
   * el color del cielo, `#8cb8de`, medido en el lienzo. Por eso el desierto salía como un
   * rombo con dos cuñas azules a los lados.
   */
  const diagonal = Math.sqrt(ancho * ancho + alto * alto);
  const suelo = sueloQueSeVe(centroX, centroZ, distancia, inclinacion, t, Math.max(0.35, aspecto));
  const finDelTablero = distancia + diagonal / 2;
  const hastaDondeSeVe = Math.max(finDelTablero, suelo.masLejos);
  const lejos = hastaDondeSeVe * 1.35;

  /*
   * ═══ Y DÓNDE EMPIEZA LA NIEBLA, QUE ES DEL PASEO Y NO DE LA MESA ═══
   *
   * La niebla de esta escena se afinó para andar por encima del tablero: a ras de suelo,
   * lo que está lejos se desvanece y eso es lo que da profundidad. Con la cámara de mesa no
   * da profundidad: SE COME EL TABLERO. Y no se veía, porque con pocas losas la cámara está
   * cerca y no llega a la niebla.
   *
   * Medido al mirar el final de una partida, con las setenta y dos puestas: la cámara se va
   * a 2.796 y las esquinas quedan entre 2.524 y 3.469, o sea entre el 25 % y el 45 % de
   * niebla —31 % en el centro— con la niebla fija de 1.400 a 5.950. El tablero entero salía
   * pálido y sin color, justo en la pantalla que más se mira: la del final.
   *
   * Aquí la niebla empieza DONDE ACABA LO QUE SE VE y llega hasta el plano de fondo: en la
   * vista de mesa no se desvanece nada.
   *
   * Empezaba donde acaba EL TABLERO, dejando la arena de alrededor a merced de la niebla, y
   * eso era correcto mientras la arena fuera un ruedo estrecho alrededor de las losas. Desde
   * que la arena llega hasta donde pisa el cuadro, dejarla ahí cambiaría las cuñas azules
   * por cuñas grises: `#cfdae2` en vez de `#8cb8de`, y seguiría sin ser un desierto. Un
   * tablero se mira desde arriba: la niebla no le da profundidad, sólo le quita color.
   */
  const niebla = { cerca: hastaDondeSeVe, lejos };
  return {
    x: centroX,
    y: distancia * Math.sin(inclinacion),
    z: centroZ + distancia * Math.cos(inclinacion),
    miraX: centroX,
    miraY: 0,
    miraZ: centroZ,
    lejos,
    niebla,
    suelo,
  };
}

/** Lo que abarcan unas casillas, en coordenadas de tablero. */
export function loQueAbarca(
  casillas: readonly { readonly x: number; readonly y: number }[],
): { minX: number; maxX: number; minY: number; maxY: number } {
  if (casillas.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const c of casillas) {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.y > maxY) maxY = c.y;
  }
  return { minX, maxX, minY, maxY };
}
