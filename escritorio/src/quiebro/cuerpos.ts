/**
 * LO QUE EL JUEGO LE PIDE A LOS PERSONAJES: qué cuerpo pintar, dónde y haciendo qué, fotograma a
 * fotograma. Es la frontera entre dos frentes que se escriben a la vez —«juego» (la red, los mandos y
 * el HUD) y «personajes» (los modelos, los clips y la multitud)— y por eso vive en un fichero de nadie,
 * sin React ni three, que se lee en Node.
 *
 * ═══ POR QUÉ UNA FUNCIÓN QUE SE LEE EN CADA FOTOGRAMA Y NO UN ESTADO DE REACT ═══
 *
 * Los cuerpos se mueven sesenta veces por segundo y React no tiene por qué enterarse: un `setState` por
 * fotograma y por cuerpo es un render de React por fotograma, y en un teléfono modesto eso es la mitad
 * del presupuesto. El juego ESCRIBE una lista (la misma, reutilizada, sin asignar) y los personajes la
 * LEEN dentro de su `useFrame`. Es el patrón de `mandos.current` del paseo de Boots on Board.
 *
 * ═══ QUIÉN DECIDE QUÉ ═══
 *
 *   · El JUEGO decide el sitio (predicho para el propio, interpolado 150 ms atrás para los demás, por
 *     guion en el presente para las acciones ajenas: ver `docs/EL-QUIEBRO.md` §12), el rumbo, el gesto
 *     y sus instantes. Sabe de la Liza; no sabe de huesos.
 *   · Los PERSONAJES deciden cómo se ve ese gesto: qué clip, con qué fundido, a qué ritmo (el paso se
 *     sincroniza con `velocidad`), la anticipación elástica (estirar la preparación para que el golpe
 *     llegue en `impactoMs`), el nivel de detalle y la multitud. No saben de la Liza.
 *   · Los DURMIENTES no pasan por aquí: los pinta el frente de personajes con la función pura de
 *     `shared/arcade/juegos/quiebro-durmientes.ts`, que da el mismo sitio en todos los aparatos. El juego
 *     sólo le dice qué durmientes están «prestados» ahora (no se pintan como civiles mientras lo son).
 *     Con la ciudad abierta pasan de 48 a unos 630 y se pintan los cercanos (`durmientesCercaEnLaCiudad`,
 *     firmas en `quiebro-ciudad.ts`); sus índices son los de la ciudad de la mesa, iguales todas las noches.
 *   · Lo que el HUD necesita para ORIENTARSE (minimapa, plano, rumbo) no pasa por aquí: es `orientacion.ts`.
 */

/** Qué clase de cuerpo es. Decide el reparto de figuras y la paleta. */
export type ClaseDeCuerpo = 'desvelado' | 'prestado' | 'celador' | 'tirador';

/**
 * Lo que un cuerpo HACE ahora. Es vocabulario de presentación, no de reglas: varios estados de la Liza
 * pueden pintarse con el mismo gesto, y un gesto puede no tener estado detrás (`victoria`).
 */
export type Gesto =
  | 'reposo'
  | 'andar'
  | 'trotar'
  | 'correr'
  | 'quiebro'
  | 'quiebro-torpe'
  | 'tocado'
  | 'descolocado'
  | 'derribado'
  | 'levantarse'
  | 'entrada'
  | 'seguida-1'
  | 'seguida-2'
  | 'cierre'
  | 'empellon'
  | 'replica'
  | 'avance'
  | 'guardia'
  | 'respuesta'
  | 'golpe-de-prestado'
  | 'apuntar'
  | 'disparar'
  | 'desalojable'
  | 'rematar'
  | 'absorber'
  | 'rescatar'
  | 'descolgar'
  | 'imprimirse'
  | 'salir'
  | 'desconectado'
  | 'victoria';

/** Un cuerpo tal como hay que pintarlo en ESTE fotograma. Todo en metros, radianes y ms de `performance.now()`. */
export interface CuerpoPintado {
  /** El número de la Liza: 1-6 los asientos, 16 en adelante las entidades del servidor. Estable mientras vive. */
  id: number;
  clase: ClaseDeCuerpo;
  /** Qué figura dentro de la clase (silueta y ropa). Estable por `id`: el juego la saca del número. */
  variante: number;
  /** Color del asiento (forro de la gabardina y contorno) en CSS `#rrggbb`, o `null` si no es de nadie. */
  color: string | null;
  /** Sitio en metros: x al este, z al sur. Ya interpolado o predicho: los personajes no suavizan. */
  x: number;
  z: number;
  /** Hacia dónde mira, en radianes: 0 es el norte (−z) y crece hacia el este, como `andar.ts`. */
  rumbo: number;
  /** Rapidez medida en m/s, para acompasar el paso con el suelo (sin patinar). */
  velocidad: number;
  gesto: Gesto;
  /** Cuándo empezó el gesto, en el reloj de presentación de ESTE cuerpo (el Remanso lo dilata). */
  gestoDesdeMs: number;
  /** Para los golpes: el instante en que tiene que llegar el impacto (anticipación elástica), o `null`. */
  impactoMs: number | null;
  /** Hacia dónde va el gesto que se desplaza (quiebro, avance, empuje), en radianes, o `null`. */
  direccionDelGesto: number | null;
  /** Silueta con contorno visible a distancia (los rivales se leen igual en todos los niveles). */
  contorno: boolean;
  /** Pintado tenue: un compañero lejano, un fantasma del Eco, el propio en Vigía. */
  tenue: boolean;
}

/** Lo que el juego entrega a los personajes. Se lee en cada fotograma; no se copia. */
export interface FuenteDeCuerpos {
  /** Los cuerpos de este fotograma. La lista y sus objetos pueden reutilizarse entre fotogramas. */
  cuerpos(): readonly CuerpoPintado[];
  /**
   * Los durmientes que ahora son Prestados y NO deben pintarse como civiles: índices 0-47 con el barrio de
   * hoy, y los de `durmientesDeLaCiudad` con la ciudad abierta.
   */
  prestados(): ReadonlySet<number>;
  /** El tic de los durmientes (50 ms), el mismo número en todos los aparatos: el del reloj de la sala. */
  ticDeLosDurmientes(): number;
  /** El número de asiento propio, o `null` si se mira sin sentarse. El propio se pinta con más detalle. */
  yo(): number | null;
}
