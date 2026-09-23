/**
 * EL PASEO POR LAS LINDES: lo que del paseo es sólo de este valle.
 *
 * ═══ LO QUE SE FUE AL PASEO COMÚN, Y POR QUÉ ═══
 *
 * Aquí vivía el paseo entero —el paso, el rumbo, las teclas, las dos cámaras de a pie y el giro
 * de la marioneta—, porque era el único sitio de la casa donde se andaba. Y se andaba mal de tres
 * maneras que no daban ningún error:
 *
 *   · con un `unPaso` propio —uno por fotograma, en coma flotante, con un punto sin radio— que
 *     sólo paraba en el borde: casas y murallas se atravesaban. El paso de verdad, con choques,
 *     estaba escrito en `shared/mecanicas/andar.ts` y no lo llamaba nadie;
 *   · leyendo las teclas de `document`, que en el móvil no existe: en la app no se andaba;
 *   · y contando lo andado en SEGUNDOS, que la marioneta leía como distancia.
 *
 * Todo lo que no sabe de losas se ha ido a `escenas/paseo/` —el motor de tics, los mandos, las
 * cámaras de hombro y de ojos, la marioneta— y lo genérico se reexporta desde aquí para que quien
 * lo pedía a este fichero lo siga encontrando. El `unPaso` viejo NO se reexporta: se ha borrado,
 * y a propósito. Dejar dos es exactamente la trampa que avisaba BOOTS-ON-BOARD §6.1: git los
 * fusiona tan contento, los comprobadores siguen en verde y la escena sigue llamando al malo.
 *
 * ═══ LO QUE SE QUEDA, QUE ES LO QUE SABE DE ESTE VALLE ═══
 *
 *   · de qué losa se nace —de la última puesta—, con el sitio que declara su mundo;
 *   · a qué altura está el suelo que se pisa, que depende de la celda: prado, senda o villa;
 *   · la niebla del paseo, y hasta dónde tiene que llegar la arena;
 *   · y la cámara de mesa, que encuadra un tablero que crece.
 *
 * ═══ LOS LÍMITES SON LAS LOSAS PUESTAS, Y ESO SIGUE SIENDO UNA DECISIÓN ═══
 *
 * Se anda por donde hay tablero, y el tablero crece durante la partida. Podría dejarse andar por
 * el vacío —es más fácil— y sería peor: el valle de alrededor no existe, así que quien saliera
 * vería el mundo por debajo y no sabría volver. Lo decía `hayLosaEn` en cada paso; ahora lo dice
 * el mundo declarado —sus casillas pisables son las losas puestas, `lindes-mundo.ts`— y lo hace
 * cumplir la arena, que es la misma para todos los juegos.
 */
import { CELDAS_POR_LOSA, LADO_DE_LOSA } from './medidas';
import { alturaDe, centroDeCelda, queHayEn } from './losa';
import { llaveDeCasilla, losaPorId } from '../../shared/arcade/juegos/lindes-losas';
import type { Giro } from '../../shared/arcade/juegos/lindes-losas';
import type { MundoDeclarado, Sitio } from '../../shared/mecanicas/mundo';
import type { PoseDeCamara } from '../paseo/camaras';

/* Lo genérico, que vive en `escenas/paseo/`: reexportado, no copiado. */
export {
  ALTURA_DE_LOS_OJOS,
  ATRAS_DEL_HOMBRO,
  SOBRE_EL_HOMBRO,
  camaraDeHombro,
  camaraDeOjos,
  giroDeLaMarioneta,
} from '../paseo/camaras';
export type { PoseDeCamara, QuienSeMira } from '../paseo/camaras';
export type { Paseante } from '../paseo/paseante';

/* ─── De dónde se nace ───────────────────────────────────────────────────── */

/**
 * DE QUÉ LOSA SE NACE, Y EN QUÉ SITIO DE ELLA.
 *
 * De la ÚLTIMA puesta —la que la vista marca con `ultima`—, que es donde está pasando algo; si
 * ninguna lo está, de la primera. Y el sitio dentro de ella no se elige aquí: lo declara el
 * mundo, `nace[i]` para `losas[i]`, porque nacer dentro de una casa o mirando a una pared es un
 * fallo del MUNDO —quien lo declara sabe qué hay en cada losa— y no de quien lo pinta (ver `Sitio`
 * en `shared/mecanicas/mundo.ts`). `verify:lindes-escena` mide ese sitio en las noventa y seis
 * losas del mazo, que es lo que antes medía sobre la cuenta de esta escena.
 *
 * `null` si el mundo no declara dónde: una mesa que todavía se está reuniendo no tiene losas.
 */
export function dondeNaceQuienPasea(
  losas: readonly { readonly ultima: boolean }[],
  mundo: MundoDeclarado,
): Sitio | null {
  const i = losas.findIndex((l) => l.ultima);
  return mundo.nace[i >= 0 ? i : 0] ?? null;
}

/* ─── A qué altura está el suelo ─────────────────────────────────────────── */

/** Lo justo de una losa puesta para saber qué suelo tiene. */
export interface LosaConSuelo {
  /** Hacia el este. */
  readonly x: number;
  /** Hacia el norte. */
  readonly y: number;
  /** La clase de losa, del catálogo. */
  readonly losa: string;
  readonly giro: Giro;
}

/** Las losas puestas por su casilla, para preguntar por el suelo sin recorrer la lista. */
export function losasPorCasilla(losas: readonly LosaConSuelo[]): Map<string, LosaConSuelo> {
  const salida = new Map<string, LosaConSuelo>();
  for (const l of losas) salida.set(llaveDeCasilla(l.x, l.y), l);
  return salida;
}

/**
 * A QUÉ ALTURA ESTÁ EL SUELO EN UN PUNTO DEL VALLE, para pintar encima a quien pasea.
 *
 * ═══ POR QUÉ HACE FALTA ═══
 *
 * El aventurero se pintaba siempre a la altura cero, y el suelo del valle no está en el cero: la
 * senda está hundida 1,20 unidades —media persona— y la villa alzada 0,66. En la senda se le
 * veía flotando sobre el camino y en la villa enterrado hasta los tobillos. No falla nada: se ve.
 *
 * ═══ SE PREGUNTA A LA MISMA CELDA QUE DIBUJA EL SUELO ═══
 *
 * `geometriaDelSuelo` pinta cada celda de la retícula plana, a la altura de su clase, y la clase
 * sale de `queHayEn` en el centro de la celda. Aquí se hace esa misma pregunta en esa misma
 * celda, así que se contesta lo que se ve y no una media. `verify:lindes-escena` lo compara con
 * los triángulos de la geometría de verdad, que es la que no se puede equivocar de celda.
 *
 * Fuera de las losas puestas, cero: ahí no se puede estar, y lo de debajo es la arena.
 */
export function alturaDelSuelo(losas: ReadonlyMap<string, LosaConSuelo>, x: number, z: number): number {
  const i = Math.round(x / LADO_DE_LOSA);
  const j = Math.round(-z / LADO_DE_LOSA);
  const puesta = losas.get(llaveDeCasilla(i, j));
  if (puesta === undefined) return 0;
  const losa = losaPorId(puesta.losa);
  if (losa === null) return 0;
  /* En fracciones de losa desde su centro: `x` hacia el este y `z` hacia el sur, entre −½ y ½. */
  const fx = x / LADO_DE_LOSA - i;
  const fz = z / LADO_DE_LOSA + j;
  const ci = Math.min(CELDAS_POR_LOSA - 1, Math.max(0, Math.floor((fx + 0.5) * CELDAS_POR_LOSA)));
  const cj = Math.min(CELDAS_POR_LOSA - 1, Math.max(0, Math.floor((fz + 0.5) * CELDAS_POR_LOSA)));
  return alturaDe(queHayEn(losa, puesta.giro, centroDeCelda(ci, cj)));
}

/**
 * EN QUÉ ALTURA SE APOYA LA CÁMARA DE A PIE: la del suelo, pero nunca por debajo del prado.
 *
 * ═══ POR QUÉ NO ES LA MISMA QUE LA DE LOS PIES ═══
 *
 * Porque delante de la cámara cuelgan la losa de la mano y el reloj (`rincones.ts`), y sus cuentas
 * se hicieron con el suelo en el cero: en «ojos» el canto de abajo del reloj —con su caja— queda
 * 0,66 unidades por encima de donde se apoya la cámara, y el de la mano 0,85. Si la cámara bajara
 * con los pies a la senda, hundida 1,20, esos cantos quedarían medio metro POR DEBAJO del prado de
 * al lado: andando pegado al borde del camino, o entrando por la puerta de una villa, la mano y el
 * reloj se meterían en el suelo. `verify:lindes-escena` lo mide.
 *
 * Así que los pies van a su suelo y la cámara no baja del prado. En la senda se mira desde 1,20
 * más alto de lo que tocaría, que es lo que se hizo siempre; en la villa la cámara sube lo que
 * sube el empedrado, y eso es nuevo y es lo correcto.
 */
export function alturaDeLaCamara(losas: ReadonlyMap<string, LosaConSuelo>, x: number, z: number): number {
  return Math.max(0, alturaDelSuelo(losas, x, z));
}

/* ─── La niebla del paseo y la arena ─────────────────────────────────────── */

/**
 * LA NIEBLA DEL PASEO: desde dónde empieza a comerse las cosas y dónde ya no se ve nada.
 *
 * A ras de suelo es lo único que da idea de cuánto tablero queda por delante. Estaba escrita dos
 * veces en `Lindes.tsx` —en la niebla y en el alcance de la arena— y una tercera, copiada a mano,
 * en `verify:lindes-escena`: tres sitios que había que acordarse de cambiar a la vez, y sólo uno
 * se habría visto mal.
 */
export const NIEBLA_DEL_PASEO = { cerca: LADO_DE_LOSA * 8, lejos: LADO_DE_LOSA * 34 } as const;

/** Un rectángulo de suelo, en coordenadas del mundo. */
export interface TrozoDeSuelo {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
  /** Lo que hay desde la cámara hasta la esquina del cuadro que pisa más lejos. */
  readonly masLejos: number;
}

/**
 * LA POSE DE LA CÁMARA DE MESA, que además dice HASTA DÓNDE hay que ver.
 *
 * Las cámaras de paseo no lo dicen porque no encuadran nada: van pegadas al suelo y lo
 * que se ve de lejos es niebla. La de mesa sí, y por eso el campo va aquí y no en el
 * común: un campo opcional que en la práctica siempre está es la mejor manera de que un
 * día se olvide justo donde importa.
 */
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

/**
 * ═══ HASTA DÓNDE LLEGA LA ARENA ═══
 *
 * Dos alcances, y se pintan LOS DOS A LA VEZ aunque sólo uno esté en uso: el modo de cámara
 * cambia con un botón, y rehacer el suelo en ese momento es un parpadeo en la pantalla justo
 * cuando el jugador está mirando.
 *
 *   · MIRANDO LA MESA, lo que pisan las cuatro esquinas del cuadro (`sueloQueSeVe`). Crece con
 *     el tablero y con lo estrecha que sea la ventana, y por eso no se puede escribir como un
 *     margen fijo: es lo que se intentó y dejó el 35 % del cuadro en cielo.
 *   · ANDANDO, hasta donde llega la niebla del paseo —`NIEBLA_DEL_PASEO.lejos`—, que es justo
 *     donde se deja de ver: más allá no hay nada que tapar.
 *
 * Son dos triángulos con un color plano, así que sobrar no cuesta nada y faltar cuesta un tercio
 * de la pantalla. Vive aquí y no en la escena para que `verify:lindes-escena` mida esta misma
 * cuenta y no una copia suya.
 */
export function alcanceDeLaArena(
  abarca: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number },
  suelo: TrozoDeSuelo,
): { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number } {
  const andando = NIEBLA_DEL_PASEO.lejos;
  return {
    x0: Math.min(suelo.x0, (abarca.minX - 0.5) * LADO_DE_LOSA - andando),
    x1: Math.max(suelo.x1, (abarca.maxX + 0.5) * LADO_DE_LOSA + andando),
    z0: Math.min(suelo.z0, -(abarca.maxY + 0.5) * LADO_DE_LOSA - andando),
    z1: Math.max(suelo.z1, -(abarca.minY - 0.5) * LADO_DE_LOSA + andando),
  };
}
