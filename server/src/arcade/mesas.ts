/**
 * LAS MESAS: quién está sentado, quién manda y dónde se guarda todo.
 *
 * Este fichero es la otra mitad de `arbitro.ts`. Allí está la decisión —quién
 * puede mover, sobre qué revisión, y llamar a las reglas—; aquí está lo que hace
 * falta para que esa decisión ocurra: una mesa que existe, un código para
 * entrar, un candado que serializa, un almacén que sobrevive al despliegue y un
 * reloj de pared que hace vencer los plazos.
 *
 * ═══ UNA MESA NACE DE UN CÓDIGO QUE GENERA EL PRIMER JUGADOR ═══
 *
 * Y no de `personasDe(game)` copiado por un Game Master. Es LA diferencia con el
 * motor de veladas, donde la sesión nace copiando a sillas las entidades que un
 * humano dio de alta en el taller: allí nadie puede jugar si antes no hubo un
 * taller, una cuenta y una contraseña.
 *
 * Aquí quien quiere jugar abre la mesa. El servidor le devuelve un código de
 * cinco letras, y quien tenga el código se sienta. No hay taller, no hay cuenta,
 * no hay correo y no hay obligaciones de datos personales: un asiento es un
 * nombre tecleado. Por eso `routes/arcade.ts` va DELANTE de `requireAuth` y no
 * detrás — un arcade no tiene Game Master y no puede vivir detrás del guardián
 * del taller.
 *
 * ═══ LAS CUATRO COSAS QUE OBLIGA «LA LARGA», PAGADAS AQUÍ ═══
 *
 * La Larga —Riberas jugado en turnos de DÍAS— se estrena dos fases más tarde, y
 * sus cuatro requisitos se pagan en este fichero porque escribirlos después
 * significaría reescribirlo entero. Escribir `mesas.ts` pensando solo en La
 * Ronda —cuatro personas, diez minutos, todas mirando— es cómo la mesa saldría
 * con forma de partida corta.
 *
 *  1. LA MESA PERSISTE. Una partida de tres días no puede vivir en un proceso
 *     que Render reemplaza en cada despliegue. Ver «El almacén», abajo.
 *  2. PRESENCIA ≠ PARTICIPACIÓN. En una velada, quien no está conectado no está
 *     jugando, y el panel lo pinta gris. En una mesa asíncrona sigue en la
 *     partida y LE TOCA. Aquí `sillas` es participación y no cambia nunca por
 *     desconectarse; la presencia se lee aparte, de `mecanicas/presencia.ts`, y
 *     solo sirve para pintar un punto.
 *  3. LOS PLAZOS SE MIDEN EN RELOJ DE PARED cuando el juego no tiene tic. Ver
 *     «El plazo que no vencía nunca», abajo, que es lo más delicado del fichero.
 *  4. UN `rev` RANCIO DE DÍAS NO ES UN ERROR. Es alguien que volvió del trabajo.
 *     Por eso la revisión se comprueba al ESCRIBIR y jamás al leer: leer con una
 *     revisión de la semana pasada devuelve el estado completo y ya está. Ver
 *     `mirar`.
 *
 * ═══ EL PLAZO QUE NO VENCÍA NUNCA ═══
 *
 * El §5.4 del diseño lo plantea así: con `tickHz: 0` y autoridad de servidor,
 * los plazos vencen entrando por el reductor PERO SI NADIE SE MUEVE NO ENTRA
 * NADA. Una oferta con caducidad no caduca; un turno con reloj no pasa.
 *
 * La salida NO es un temporizador de servidor —un plazo que vence fuera del
 * reductor es un cambio de estado que no está en el diario, así que reejecutar
 * la partida daría otra cosa y la repetición dejaría de verificar nada— sino
 * EVALUACIÓN PEREZOSA EN LA LECTURA: antes de devolver nada, se compara el reloj
 * de pared con el vencimiento de la mesa y, si toca, se mete un tic por la
 * puerta de siempre. El reductor sigue siendo la única puerta y sigue siendo
 * puro.
 *
 * Eso convierte una lectura en una escritura, y tiene DOS consecuencias que el
 * diseño exigía resolver y no esquivar:
 *
 *   · EL CANDADO CUBRE LA RUTA DE LECTURA. Aquí no hay una función de leer y
 *     otra de escribir: hay `conLaMesa`, y las dos pasan por ella. Ver abajo.
 *   · UNA ESPERA APARCADA VEINTICINCO SEGUNDOS TIENE QUE DESPERTARSE POR
 *     VENCIMIENTO. Eso es el sexto verbo del canal, `despertarAlVencer`, y lo
 *     usa `routes/arcade.ts` porque avisar es transporte.
 *
 * ═══ DÓNDE VIVE EL PLAZO, QUE ES LA DECISIÓN QUE EL DOCUMENTO NO CIERRA ═══
 *
 * El §5.4 dice «el sondeo compara el reloj de pared con los plazos absolutos que
 * hay EN EL ESTADO». Y el estado del juego es OPACO: esta capa no puede leer un
 * plazo de dentro sin romper lo único de lo que cuelga todo el diseño. Con
 * `tickHz > 0` no haría falta —tic y reloj de pared se convierten el uno en el
 * otro sabiendo la frecuencia— pero con `tickHz: 0` no hay conversión posible:
 * `ticsPara(45, 0)` es infinito por contrato.
 *
 * Así que el plazo absoluto vive AQUÍ, en la mesa, que es autoridad y sí sabe
 * qué hora es. El reparto queda:
 *
 *   · LA MESA sabe cuánto se espera (`plazoMs`) y cuándo se acaba (`venceEn`).
 *     Es un dato de la mesa y no del juego, y eso además es lo correcto de
 *     producto: «veinticuatro horas por turno» es una decisión de quien abre la
 *     partida, no una regla de Riberas.
 *   · EL JUEGO sabe QUÉ SIGNIFICA que venza, y lo escribe como su rama de
 *     `arcade:tic`. En La Ronda significa «se le pasa el turno y se le echa la
 *     carta más baja».
 *
 * Queda escrito como decisión y no como descuido: si algún día un juego necesita
 * varios plazos distintos a la vez —dos ofertas de trueque caducando a horas
 * distintas— esto se queda corto y habrá que darle a la mesa una lista de
 * vencimientos en vez de uno. Hoy no hay ningún juego que lo pida, y el diseño
 * es explícito en que nada se escribe antes de su fase.
 *
 * ═══ EL ALMACÉN ES PROPIO, Y ESO TAMBIÉN ES UNA DECISIÓN ═══
 *
 * No se reutiliza `db/store.ts`: su interfaz es forma de velada —`getLive`,
 * `saveLive`, `listGames`— y meter mesas ahí obligaría a ampliarla con métodos
 * que las veladas no usan, que es la primera de las cien líneas que acaban
 * deshaciendo la separación.
 *
 * Se guarda UN FICHERO POR MESA, con escritura atómica —fichero temporal y
 * renombrado— por lo mismo que el almacén de veladas: un proceso que muere a
 * mitad de una escritura deja el fichero a medias, y un JSON a medias no se
 * puede leer.
 *
 * ═══ UN FICHERO POR MESA, Y NO UNO CON TODAS: SE MIDIÓ ═══
 *
 * La primera versión de esta fase guardaba las mesas en un solo `mesas.json` y
 * lo reescribía ENTERO en cada movimiento de cualquier partida. Parece
 * inofensivo con cuatro mesas y no lo es:
 *
 *   · El coste de un movimiento pasa a ser O(todas las mesas del proceso × su
 *     diario) en vez de O(esta mesa). Medido en este árbol: con el fichero en
 *     10 MB, abrir una mesa más costaba 26 ms, y CADA carta de CUALQUIER
 *     partida reescribía los 10 MB antes de contestar.
 *   · Y como abrir una mesa no pide credencial, el coste lo elige quien llama:
 *     unos miles de aperturas dejan el fichero en megas y a partir de ahí la
 *     mesa de cuatro personas que sí está jugando paga la cuenta de todas las
 *     demás. Es cuadrático y es de fuera.
 *
 * Con un fichero por código, escribir una mesa cuesta esa mesa y nada más,
 * borrarla es borrar su fichero, y el §6 vuelve a ser verdad: «las mesas viven
 * en memoria y el almacén es el respaldo». El precio es una carpeta con muchos
 * ficheros pequeños, que es exactamente lo que un sistema de ficheros hace bien.
 *
 * NO SE MIGRA DEL FORMATO VIEJO, y queda dicho: esta fase no está desplegada en
 * ningún sitio, así que lo único que existiría es el `data/mesas.json` de un
 * portátil. Una migración que nadie ejecuta es código que se descubre roto el
 * día que hace falta.
 *
 * ═══ Y DÓNDE ESTÁ LA CARPETA, QUE ERA UN FALLO DE DESPLIEGUE ENTERO ═══
 *
 * En `MESAS_DIR`, y el valor por defecto —`data/` junto al proceso— vale solo
 * para el portátil. Los dos despliegues documentados BORRAN esa carpeta:
 *
 *   · En Render el único disco persistente se monta en `/var/data`, y el proceso
 *     corre con el directorio en `server/`. Sin la variable, `server/data` es el
 *     sistema de ficheros efímero del contenedor y desaparece en CADA
 *     despliegue — o sea que el requisito 2 de esta fase («sin eso, cada
 *     despliegue mata todas las partidas en curso») no se cumpliría desde el
 *     día uno, y el volcado de `SIGTERM` tampoco salvaría nada porque vuelca a
 *     la misma carpeta condenada.
 *   · En la VPS es peor: la unidad de systemd corre con `ProtectSystem=strict` y
 *     `ReadWritePaths=/var/lib/gamemasters`, así que `/opt/gamemasters/data` es
 *     de SOLO LECTURA y el fichero no se puede ni crear.
 *
 * Es el mismo patrón —y la misma variable— que `UPLOADS_DIR`, cuya ausencia ya
 * costó una vez que las fotos se borraran en cada despliegue. Por eso está en
 * `.env.example`, en `render.yaml` y en la unidad de systemd, y por eso
 * `verify:entorno` la exige.
 *
 * LO QUE FALTA, DICHO EN VOZ ALTA: con `MONGODB_URI` puesta, las veladas van a
 * Mongo y las mesas siguen yendo al disco de la instancia. En Render eso
 * significa que sobreviven a un reinicio del proceso pero no necesariamente a un
 * cambio de máquina. La costura está puesta —`AlmacenDeMesas` es una interfaz y
 * `almacenEnFichero` una implementación— y escribir la de Mongo es media tarde;
 * no se ha hecho en esta fase porque no hay ninguna base a mano para probarla, y
 * una implementación de persistencia que nadie ha ejecutado es exactamente la
 * clase de pieza que se descubre rota el día del despliegue.
 *
 * ═══ Y SI EL ALMACÉN FALLA, SE DICE ═══
 *
 * Con `tickHz: 0` la escritura es síncrona y su promesa es literal: «cuando el
 * servidor contesta hecho, está guardado». Si no se ha podido guardar, esa frase
 * es falsa y hay que decirlo en la respuesta —503 CON la mesa dentro, para que
 * quien juega vea que su movimiento entró y que este servidor no lo ha
 * guardado— en vez de contestar 200 y dejarlo en el registro.
 *
 * La versión anterior lo registraba y callaba. En la VPS, con la carpeta de solo
 * lectura, ese era el estado NORMAL: todas las mesas en memoria, nadie
 * enterándose, y el primer `systemctl restart` llevándose todas las partidas.
 * Un fallo de escritura que no llega a nadie es un fallo que dura hasta el
 * reinicio.
 *
 * ═══ EL CANDADO, QUE ES EL DE `mutar` CON DOS DIFERENCIAS ═══
 *
 * La técnica es la misma de `live/sesion.ts`: una cadena de promesas por
 * partida, cada una esperando a la anterior, y el candado se retira cuando nadie
 * más espera —comparando contra la promesa que SE GUARDÓ, que es donde aquel
 * fichero tuvo una fuga silenciosa que costó encontrar—.
 *
 * Las dos diferencias:
 *
 *  1. CUBRE LA LECTURA. En veladas leer no escribe, así que el candado solo
 *     rodea las mutaciones. Aquí leer puede meter un tic.
 *  2. NO LEE Y ESCRIBE LA MESA ENTERA CONTRA EL ALMACÉN EN CADA VUELTA. El §6
 *     del diseño lo apunta como límite conocido: «las mesas de arcade no heredan
 *     el patrón de `mutar` —candado + lectura y escritura completa por acción—:
 *     correcto a ritmo de velada, seis lecturas y seis escrituras por segundo en
 *     una mesa de seis». Las mesas viven en memoria y el almacén es el respaldo,
 *     no la fuente.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  abrirMesa as abrirMesaDelArbitro,
  avanzarElReloj,
  cerrarMesa,
  jugar,
  MovimientoRechazado,
} from './arbitro';
import type { Mesa } from './arbitro';
import { medirMovimiento, medirTamano } from './presupuesto';
import { marcarPresencia, olvidarPresencia, senalEnMemoria } from '../mecanicas/presencia';
import { manifiestoDeArcade, necesitaMesa, tieneReloj, vistaDeAsiento } from '../../../shared/arcade';
import type { ArcadeId, AsientoId, ManifiestoDeArcade, Movimiento } from '../../../shared/arcade';

// ---------------------------------------------------------------------------
// El vocabulario
// ---------------------------------------------------------------------------

/**
 * UN SITIO OCUPADO. Un nombre tecleado y una llave, y nada más.
 *
 * ═══ POR QUÉ HAY UNA LLAVE SI LOS ASIENTOS SON ANÓNIMOS ═══
 *
 * Porque anónimo no es lo mismo que suplantable. Sin llave, el identificador del
 * asiento viajaría en el cuerpo de la petición y cualquiera que lo viera —está
 * en la vista de los otros tres, que es donde tiene que estar para pintar la
 * mesa— podría jugar por él. Eso no es un arcade sin cuentas: es un arcade sin
 * puerta.
 *
 * La llave es un secreto que el servidor reparte una vez, al sentarse, y que
 * solo conoce quien se sentó. No es una cuenta —no tiene correo, ni contraseña,
 * ni nada que recuperar— y muere con la mesa. Es exactamente la misma idea que
 * el `joinCode` de las veladas sin nada de lo que lo rodea allí.
 *
 * Y NO se manda nunca en la vista de nadie, ni siquiera en la del dueño: quien
 * se sienta la recibe en la respuesta de sentarse y la guarda él.
 */
export interface Silla {
  /** El identificador público. Sale en la vista de los demás: es quien juega. */
  id: AsientoId;
  /** Lo que tecleó. Sale en la vista de los demás. */
  nombre: string;
  /** El secreto con el que demuestra que es él. NO sale en ninguna vista. */
  llave: string;
}

/** Una mesa viva, con todo lo que la autoridad guarda de ella. */
export interface MesaEnCurso {
  /** El código con el que se entra. Es también el identificador de la mesa. */
  codigo: string;
  /** Lo que el árbitro conoce: estado opaco, revisión, tic, semilla y diario. */
  mesa: Mesa;
  /** Quién está sentado, en el orden en que se sentaron. */
  sillas: Silla[];
  /**
   * Cuánto se espera sin que pase nada antes de meter un tic, en milisegundos.
   *
   * Lo elige quien abre la mesa: diez minutos para una partida de after, un día
   * para una de las que duran una semana. Cero significa que esta mesa no tiene
   * plazo y no se le mete ningún tic nunca — legítimo para un juego sin nada que
   * caducar.
   */
  plazoMs: number;
  /** Instante absoluto de pared en que toca meter el tic. `null` si no hay plazo. */
  venceEn: number | null;
  /** Cuándo se abrió, en epoch ms. Para el barrido de mesas viejas. */
  abiertaEn: number;
  /** Cuándo se tocó por última vez. Para lo mismo. */
  ultimoToqueEn: number;
}

/** Lo que se le enseña a quien mira una mesa. */
export interface VistaDeMesa {
  codigo: string;
  arcade: ArcadeId;
  /** La revisión de AHORA. Es la que hay que devolver al mover. */
  rev: number;
  /** En qué tic va. Con `tickHz: 0` es cuántos plazos se han pasado. */
  tic: number;
  terminada: boolean;
  /**
   * Cuándo vence el plazo, en epoch ms, o `null` si esta mesa no tiene.
   *
   * Sale en la vista porque el móvil lo necesita para pintar la cuenta atrás, y
   * sale como INSTANTE ABSOLUTO y no como «quedan 40 s» por lo mismo que un
   * `Plazo` se guarda como instante: una cuenta atrás obliga a que el servidor la
   * decremente, o sea a escribir el estado sin que pase nada.
   */
  venceEn: number | null;
  /** Quiénes están en la partida. Estar aquí NO depende de estar conectado. */
  asientos: Array<{
    id: AsientoId;
    nombre: string;
    /**
     * ¿Se le ha visto hace poco?
     *
     * COSMÉTICO Y NADA MÁS. Quien no está sigue en `asientos`, sigue teniendo su
     * turno y sigue contando para el aforo. Ésta es la línea donde una velada y
     * una mesa asíncrona dejan de parecerse: allí la presencia es un buen proxy
     * de la participación porque la gente está sentada a la mesa; aquí alguien
     * puede estar tres días sin abrir la app y seguir jugando.
     */
    presente: boolean;
  }>;
  /** Quién soy yo aquí, o `null` si miro sin asiento. */
  yo: AsientoId | null;
  /** LO QUE EL JUEGO DEJA VER DESDE AQUÍ. Opaco: lo compone la proyección. */
  vista: unknown;
}

// ---------------------------------------------------------------------------
// Códigos y llaves
// ---------------------------------------------------------------------------

/**
 * El alfabeto de los códigos, SIN las letras que se confunden al dictarlas.
 *
 * Sin I ni 1, sin O ni 0, sin S ni 5. Un código de mesa se dice en voz alta
 * —«entrad con KJ7RM»— y una L y un 1 en una tipografía de móvil son el mismo
 * dibujo. Es el mismo criterio que el `ALFABETO_CODIGO` de las veladas, escrito
 * aquí en vez de importado: `shared/live.ts` es el contrato de la otra familia y
 * traérselo por seis caracteres sería empezar a compartir vocabulario por la
 * puerta de atrás.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRTUVWXYZ23456789';

/** Cinco letras: casi treinta millones de combinaciones. De sobra y se dictan. */
const LARGO_DEL_CODIGO = 5;

/**
 * Cuánto mide una llave de asiento.
 *
 * Veinticuatro caracteres del mismo alfabeto son unos 119 bits de entropía. No
 * se dicta ni se teclea —viaja en una cabecera— así que aquí lo que importa es
 * que no se pueda adivinar, y adivinar una llave es jugar por otro.
 */
const LARGO_DE_LA_LLAVE = 24;

/**
 * Letras al azar de verdad, de `crypto`, y no del azar sembrado del juego.
 *
 * Los dos azares del sistema no son el mismo y conviene que se note: el de
 * `shared/mecanicas/azar.ts` es REPRODUCIBLE a propósito, porque tiene que
 * repartir las mismas cartas al reejecutar una partida. Usarlo para una llave
 * sería repartir credenciales que cualquiera que conozca la semilla puede
 * recalcular.
 */
function letrasAlAzar(cuantas: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(cuantas));
  let salida = '';
  for (let i = 0; i < cuantas; i++) {
    salida += ALFABETO[(bytes[i] as number) % ALFABETO.length];
  }
  return salida;
}

/** Un código que no esté ya en uso. */
function codigoLibre(): string {
  for (let intento = 0; intento < 50; intento++) {
    const codigo = letrasAlAzar(LARGO_DEL_CODIGO);
    if (!mesas.has(codigo)) return codigo;
  }
  /*
   * Cincuenta colisiones seguidas con veintiocho millones de códigos no pasa: si
   * pasa, es que hay un fallo en `letrasAlAzar` —el caso real sería que
   * devolviera siempre lo mismo— y seguir dando códigos sería dar el mismo a
   * todo el mundo. Es mejor negarse ruidosamente que repartir una mesa
   * compartida sin que nadie lo pidiera.
   */
  throw new Error(
    'No se ha podido generar un código de mesa libre en cincuenta intentos. ' +
      'Con veintiocho millones de combinaciones eso no es mala suerte: es que el generador ' +
      'de códigos no está devolviendo códigos distintos.',
  );
}

// ---------------------------------------------------------------------------
// EL ALMACÉN
// ---------------------------------------------------------------------------

/**
 * Dónde se guardan las mesas. Interfaz porque el día que haya una base detrás
 * cambia esto y no el resto del fichero.
 *
 * ═══ SE GUARDA DE UNA EN UNA, Y ESA ES LA FIRMA QUE IMPORTA ═══
 *
 * `guardar` recibe UNA mesa y no el conjunto. Con el conjunto, cualquier
 * implementación —la de fichero, la de Mongo el día que exista— tiene la
 * tentación de escribirlo todo en cada movimiento, y eso es lo que convierte el
 * coste de una partida en el coste de todas las del proceso. La interfaz lo
 * impide antes de que nadie lo escriba.
 *
 * `guardarYa` sí recibe el conjunto, porque el volcado de la despedida es
 * justamente lo contrario: una sola vez, todo, y antes de morir.
 */
export interface AlmacenDeMesas {
  /** Lo que hubiera guardado. Se llama una vez, al arrancar. */
  leer(): MesaEnCurso[];
  /** Guarda UNA mesa. Devuelve cuando está en disco; LANZA si no ha podido. */
  guardar(mesa: MesaEnCurso): Promise<void>;
  /** Se acabó esta mesa: que no vuelva a aparecer al arrancar. */
  borrar(codigo: string): Promise<void>;
  /** Todas de golpe y SIN esperar a nadie. Para `SIGTERM`. Ver abajo. */
  guardarYa(mesas: readonly MesaEnCurso[]): void;
}

/**
 * La carpeta de las mesas. `MESAS_DIR` manda; si no está, `data/` junto al
 * proceso, que vale para el portátil y para nada más. Ver la cabecera.
 */
const CARPETA = path.resolve(process.env.MESAS_DIR?.trim() || path.join(process.cwd(), 'data', 'mesas'));

/** El fichero de una mesa. El código ya es de un alfabeto sin barras ni puntos. */
function ficheroDe(codigo: string): string {
  return path.join(CARPETA, `${codigo}.json`);
}

/** Lo que hay dentro del fichero de una mesa, con su versión por delante. */
interface Guardado {
  /**
   * Para poder cambiar la forma sin que una instancia vieja se coma un fichero
   * nuevo. Hoy solo sirve para descartar lo que no reconoce, que es infinitamente
   * mejor que interpretarlo mal: una mesa medio entendida es una partida que se
   * comporta raro.
   */
  version: 2;
  mesa: MesaEnCurso;
}

/**
 * Escribe un fichero de forma atómica, y LIMPIA EL TEMPORAL SI FALLA.
 *
 * Lo segundo no es cosmético: la versión anterior dejaba un `.tmp` huérfano por
 * cada intento fallido, así que una carpeta de solo lectura —el caso de la VPS—
 * producía un fichero suelto por movimiento y nadie los recogía nunca.
 */
async function escribirAtomico(destino: string, texto: string): Promise<void> {
  await fsp.mkdir(CARPETA, { recursive: true });
  const temporal = `${destino}.${letrasAlAzar(6)}.tmp`;
  try {
    await fsp.writeFile(temporal, texto, 'utf8');
    await fsp.rename(temporal, destino);
  } catch (error) {
    await fsp.rm(temporal, { force: true }).catch(() => {});
    throw error;
  }
}

const almacenEnFichero: AlmacenDeMesas = {
  leer() {
    let nombres: string[];
    try {
      nombres = fs.readdirSync(CARPETA).filter((n) => n.endsWith('.json'));
    } catch {
      /*
       * No existe todavía. Se parte de vacío y no se lanza: un servidor que no
       * arranca porque no hay carpeta de mesas deja fuera también a las veladas,
       * que no tienen nada que ver.
       */
      return [];
    }

    const recuperadas: MesaEnCurso[] = [];
    for (const nombre of nombres) {
      try {
        const leido = JSON.parse(fs.readFileSync(path.join(CARPETA, nombre), 'utf8')) as Partial<Guardado>;
        if (leido.version !== 2 || !leido.mesa) continue;
        recuperadas.push(leido.mesa);
      } catch (error) {
        /*
         * Una mesa ilegible se salta y se DICE, en vez de tumbar el arranque o
         * desaparecer en silencio. Ésta es la ventaja concreta de un fichero por
         * mesa sobre uno con todas: antes, un JSON a medias se llevaba por
         * delante TODAS las partidas del servidor; ahora se lleva la suya.
         */
        console.error(`[arcade] La mesa guardada en «${nombre}» no se puede leer y se ignora:`, error);
      }
    }
    return recuperadas;
  },

  async guardar(mesa) {
    await escribirAtomico(ficheroDe(mesa.codigo), JSON.stringify({ version: 2, mesa } satisfies Guardado));
  },

  async borrar(codigo) {
    await fsp.rm(ficheroDe(codigo), { force: true });
  },

  guardarYa(mesas) {
    /*
     * ═══ POR QUÉ AQUÍ SÍ SE ESCRIBE SÍNCRONO, SI EN TODAS PARTES ES PECADO ═══
     *
     * Porque esto solo lo llama el manejador de `SIGTERM`, y ahí el bucle de
     * eventos ya no vale para nada: Render manda la señal y mata el proceso unos
     * segundos después, así que una escritura asíncrona puede no llegar a
     * ejecutarse nunca. Bloquear el hilo cuando ya no queda nada que atender no
     * cuesta nada; no bloquearlo cuesta las partidas en curso.
     */
    try {
      fs.mkdirSync(CARPETA, { recursive: true });
    } catch (error) {
      console.error('[arcade] No se han podido volcar las mesas al recibir la señal:', error);
      return;
    }
    for (const mesa of mesas) {
      const destino = ficheroDe(mesa.codigo);
      const temporal = `${destino}.${letrasAlAzar(6)}.tmp`;
      try {
        fs.writeFileSync(temporal, JSON.stringify({ version: 2, mesa } satisfies Guardado), 'utf8');
        fs.renameSync(temporal, destino);
      } catch (error) {
        /*
         * Se sigue con las demás: en un volcado de despedida, perder una mesa
         * porque su fichero da error no es razón para perder las otras
         * trescientas.
         */
        try {
          fs.rmSync(temporal, { force: true });
        } catch {
          /* si no se puede ni borrar el temporal, no hay nada más que hacer */
        }
        console.error(`[arcade] No se ha podido volcar la mesa ${mesa.codigo}:`, error);
      }
    }
  },
};

let almacen: AlmacenDeMesas = almacenEnFichero;

/** Cambia el almacén. Para las pruebas, y para el día que haya una base detrás. */
export function ponerAlmacenDeMesas(otro: AlmacenDeMesas): void {
  almacen = otro;
  cargadas = false;
}

// ---------------------------------------------------------------------------
// La tabla en memoria
// ---------------------------------------------------------------------------

/**
 * Las mesas vivas, por código.
 *
 * Vive en memoria y el almacén es el RESPALDO, no la fuente. Es la diferencia
 * con `mutar`, que relee la sesión entera de la base en cada vuelta: correcto a
 * ritmo de velada y ruinoso a ritmo de mesa, donde en una partida de cuatro hay
 * un movimiento cada pocos segundos y una lectura por móvil cada veinticinco.
 *
 * La consecuencia, que es un límite conocido y preexistente y conviene no
 * echársela al motor nuevo: esto NO escala a dos instancias. Con dos procesos en
 * Render, dos jugadores de la misma mesa caen en procesos distintos y dejan de
 * verse. Le pasa exactamente igual al `hub.ts` de las veladas, cuyos `esperas` y
 * `avisos` son también mapas de ámbito de módulo. Está apuntado en el §6 del
 * diseño como uno de los tres límites que ya existían.
 */
const mesas = new Map<string, MesaEnCurso>();

let cargadas = false;

function cargar(): void {
  if (cargadas) return;
  cargadas = true;
  /*
   * Se cuenta lo que se ha LEÍDO y no lo que hay en la tabla. Parece lo mismo
   * —al arrancar la tabla está vacía— y no lo es en cuanto alguien cambia el
   * almacén en marcha: entonces el mensaje decía «3 mesas recuperadas» habiendo
   * recuperado cero, que es un registro que miente sobre lo único que este
   * mensaje existe para contar.
   */
  let recuperadas = 0;
  for (const m of almacen.leer()) {
    mesas.set(m.codigo, m);
    recuperadas++;
  }
  if (recuperadas > 0) console.log(`[arcade] ${recuperadas} mesa(s) recuperadas del almacén.`);
}

/**
 * Cuánto se guarda una mesa a la que nadie toca.
 *
 * TREINTA DÍAS, y el número es grande a propósito: una partida de La Larga dura
 * días y su ritmo normal es un movimiento cada mañana. Con la caducidad de una
 * velada —horas— una partida de tres días se borraría sola la segunda noche, y
 * el síntoma sería «la app dice que esa mesa no existe» sin ningún error en
 * ningún sitio.
 *
 * Lo que esto evita es lo contrario: que el fichero crezca una mesa por partida
 * jugada, para siempre. Es la misma fuga que ya tuvieron el mapa de candados y
 * el de presencia, y que no se ve desde fuera hasta que la instancia se queda
 * sin memoria.
 */
const OLVIDO_MS = 30 * 24 * 60 * 60_000;

/** Cuánto hace falta que se haya visto a alguien para pintarlo conectado. */
const CONECTADO_MS = 60_000;

function barrerLasViejas(ahora: number): void {
  for (const [codigo, m] of mesas) {
    if (ahora - m.ultimoToqueEn <= OLVIDO_MS) continue;
    mesas.delete(codigo);
    /*
     * Y su fichero se va con ella. Con el almacén de un solo fichero esto salía
     * gratis —la siguiente escritura completa ya no la incluía— y con un fichero
     * por mesa hay que decirlo: si no, la carpeta se queda con las mesas que la
     * memoria ya olvidó y el arranque siguiente las resucita.
     */
    void almacen.borrar(codigo).catch((error: unknown) => {
      console.error(`[arcade] No se ha podido borrar la mesa vieja ${codigo}:`, error);
    });
  }
}

// ---------------------------------------------------------------------------
// La persistencia, PARTIDA POR FRECUENCIA
// ---------------------------------------------------------------------------

/**
 * ═══ SÍNCRONA SIN RELOJ, DIFERIDA CON RELOJ (§6 DEL DISEÑO) ═══
 *
 * El reparto no es por familia de juego sino POR FRECUENCIA, y la razón está en
 * la aritmética:
 *
 *   · `tickHz === 0` —Riberas, La Ronda, La Larga— es un movimiento cada varios
 *     segundos. Escribir en el acto cuesta una escritura por movimiento, o sea
 *     nada, y a cambio da la única garantía que de verdad importa en una partida
 *     de tres días: cuando el servidor contesta «hecho», está guardado. Un
 *     jugador que mueve y ve caer el despliegue no pierde su movimiento.
 *   · `tickHz > 0` —El Arcade— son sesenta movimientos por segundo. Escribir en
 *     el acto serían sesenta escrituras por segundo y por mesa, que es
 *     exactamente la clase de coste que hunde una instancia. Ahí se difiere, y
 *     lo peor que puede pasar es perder una fracción de segundo de una partida
 *     que dura un minuto.
 *
 * Y en los dos casos, VOLCADO AL RECIBIR `SIGTERM`, que es lo que manda Render
 * antes de reemplazar la instancia. Sin eso, cada `git push` mata todas las
 * partidas en curso desde el día uno.
 */
const pendientesDeGuardar = new Set<string>();
let temporizadorDiferido: NodeJS.Timeout | undefined;

/** Cada cuánto se vuelca cuando la escritura es diferida. */
const DIFERIDO_MS = 1_000;

function todas(): MesaEnCurso[] {
  return [...mesas.values()];
}

/**
 * EL ALMACÉN NO HA PODIDO GUARDAR, y quien movía tiene que enterarse.
 *
 * ═══ POR QUÉ ESTO SUBE Y NO SE QUEDA EN EL REGISTRO ═══
 *
 * La versión anterior lo registraba y contestaba 200. El razonamiento parecía
 * bueno —«su movimiento SÍ ha entrado, está en memoria y lo ven los otros
 * tres»— y tenía un agujero: la promesa de la escritura síncrona es literal,
 * «cuando el servidor contesta hecho, está guardado», y contestar «hecho» sin
 * haber guardado la convierte en mentira precisamente el día que importa.
 *
 * Y no es hipotético: en la VPS, con la carpeta de mesas fuera de
 * `ReadWritePaths`, ese era el estado NORMAL. Todas las partidas en memoria,
 * nadie enterándose, y el primer reinicio llevándoselas. Un fallo que solo
 * aparece en el registro del despliegue dura hasta que alguien mira el registro
 * del despliegue.
 *
 * Sube con la mesa dentro y la ruta lo traduce a 503: quien juega ve que su
 * movimiento entró Y que no está guardado, que son las dos cosas ciertas.
 */
export class AlmacenNoGuarda extends Error {
  constructor(
    public readonly codigo: string,
    public readonly causa: unknown,
  ) {
    super(
      `El movimiento ha entrado en la mesa «${codigo}» y los demás lo ven, pero este servidor ` +
        'no ha podido guardarlo: si se reinicia, se pierde. Revisa la carpeta de `MESAS_DIR`.',
    );
    this.name = 'AlmacenNoGuarda';
  }
}

/**
 * Lo último que falló al guardar, para el diagnóstico.
 *
 * Existe porque un fallo de escritura no se ve desde fuera de ninguna otra
 * forma: la mesa funciona, los cuatro juegan y el disco no tiene nada. Con la
 * escritura diferida —`tickHz > 0`— no hay ninguna petición esperando a la que
 * contestarle 503, así que esto es lo único que queda.
 */
let ultimoFalloAlGuardar: { cuando: number; codigo: string; que: string } | undefined;
let fallosAlGuardar = 0;

/**
 * Lo que sabe el diagnóstico sobre el almacén. Ver `routes/arcade.ts`.
 *
 * ═══ AQUÍ NO SALE LA RUTA DE LA CARPETA, Y ESO ES DELIBERADO ═══
 *
 * `/api/arcade/diagnostico` se sirve SIN CREDENCIAL, porque va delante del
 * guardián del taller como todo este motor. Poner ahí `/var/lib/gamemasters/…`
 * —o el mensaje crudo del sistema, que lleva la ruta dentro— sería publicarle a
 * cualquiera cómo está montado el disco del servidor a cambio de un dato que
 * quien despliega ya tiene delante.
 *
 * Lo que sí sale es lo único que hace falta desde fuera: si la carpeta está
 * DECLARADA —o sea, si `MESAS_DIR` existe o se está cayendo al valor por defecto,
 * que es el que se borra en cada despliegue—, cuántas escrituras han fallado y de
 * qué clase fue la última. La ruta entera y el error completo van al registro del
 * proceso, que es donde los lee quien puede arreglarlos.
 */
export function saludDelAlmacen(): {
  carpetaDeclarada: boolean;
  fallos: number;
  ultimoFallo?: { cuando: number; codigo: string; que: string };
} {
  return {
    carpetaDeclarada: (process.env.MESAS_DIR?.trim() ?? '') !== '',
    fallos: fallosAlGuardar,
    ultimoFallo: ultimoFalloAlGuardar,
  };
}

/** La clase del fallo —`EPERM`, `ENOSPC`— sin el mensaje, que lleva la ruta. */
function claseDelFallo(error: unknown): string {
  const codigo = (error as { code?: unknown } | null)?.code;
  if (typeof codigo === 'string' && codigo.length > 0) return codigo;
  return error instanceof Error ? error.name : 'desconocido';
}

function anotarElFallo(codigo: string, error: unknown): void {
  fallosAlGuardar++;
  ultimoFalloAlGuardar = { cuando: Date.now(), codigo, que: claseDelFallo(error) };
  /*
   * En el registro sí va todo, y con la carpeta delante: quien lo lea está en el
   * despliegue y lo primero que necesita saber es DÓNDE se estaba intentando
   * escribir. Es la mitad del diagnóstico que no puede salir por la red.
   */
  console.error(`[arcade] Error al guardar la mesa ${codigo} en «${CARPETA}»:`, error);
}

/**
 * Guarda ESTA mesa, por frecuencia. Lanza `AlmacenNoGuarda` si no ha podido.
 *
 * Antes recibía solo el manifiesto y guardaba TODAS las mesas del proceso. Ver
 * la cabecera: eso hacía que el coste de un movimiento fuera el de todas las
 * partidas abiertas, y que abrirlas —cosa que no pide credencial— fuera la
 * forma de encarecer las de los demás.
 */
async function guardar(manifiesto: ManifiestoDeArcade, m: MesaEnCurso): Promise<void> {
  if (tieneReloj(manifiesto)) {
    guardarDiferido(m.codigo);
    return;
  }
  try {
    await almacen.guardar(m);
  } catch (error) {
    anotarElFallo(m.codigo, error);
    throw new AlmacenNoGuarda(m.codigo, error);
  }
}

function guardarDiferido(codigo: string): void {
  pendientesDeGuardar.add(codigo);
  if (temporizadorDiferido !== undefined) return;
  temporizadorDiferido = setTimeout(() => {
    temporizadorDiferido = undefined;
    void volcarLoPendiente();
  }, DIFERIDO_MS);
  temporizadorDiferido.unref?.();
}

/**
 * Escribe las mesas que esperaban su turno.
 *
 * Aquí el fallo NO se propaga y solo se anota, y la diferencia con el camino
 * síncrono no es un descuido: en el diferido no hay ninguna petición esperando
 * —quien movió recibió su respuesta hace un segundo— así que no hay a quién
 * contestarle. Lo que queda es el registro y `/api/arcade/diagnostico`.
 */
async function volcarLoPendiente(): Promise<void> {
  const codigos = [...pendientesDeGuardar];
  pendientesDeGuardar.clear();
  for (const codigo of codigos) {
    const m = mesas.get(codigo);
    if (!m) continue;
    try {
      await almacen.guardar(m);
    } catch (error) {
      anotarElFallo(codigo, error);
    }
  }
}

/**
 * EL VOLCADO DE LA DESPEDIDA.
 *
 * ═══ POR QUÉ SE REGISTRA AL CARGAR EL MÓDULO Y NO EN `index.ts` ═══
 *
 * Porque la garantía tiene que estar puesta por el hecho de que exista una mesa,
 * no por el hecho de que alguien se acordara de encenderla en el arranque. Una
 * red que hay que activar a mano en otro fichero es la clase de red que se queda
 * sin activar el día que alguien reordena el arranque —y este repositorio ya
 * tiene apuntado el caso contrario, `exigirSecretosTapados()`, que existía,
 * funcionaba y no la llamaba nadie.
 *
 * `once` y no `on`: si llegan dos señales seguidas, la segunda encontraría el
 * proceso a medio volcar y escribiría encima.
 *
 * ═══ Y POR QUÉ, DESPUÉS DE VOLCAR, SE VUELVE A MANDAR LA SEÑAL ═══
 *
 * Aquí había escrito lo contrario —«no se llama a `process.exit`: se vuelca y se
 * deja que el proceso termine como iba a terminar»— y era falso, con la mejor
 * intención. Node lo documenta: instalar un oyente de `SIGTERM` o `SIGINT`
 * ELIMINA su comportamiento por defecto. Con un oyente puesto, el proceso ya no
 * iba a terminar; y como el servidor HTTP mantiene vivo el bucle de eventos, no
 * terminaba en absoluto.
 *
 * Las consecuencias eran las dos que se ven de verdad:
 *
 *   · En Render, tras el `SIGTERM` el proceso volcaba y SEGUÍA SIRVIENDO hasta
 *     que llegaba el `SIGKILL` del final de la ventana de gracia. O sea que cada
 *     despliegue se alargaba hasta el tope y el volcado quedaba desactualizado
 *     respecto a lo que se atendió después de hacerlo.
 *   · En local, el primer Ctrl+C dejaba de parar el servidor.
 *
 * La salida no es `process.exit`, que sí se llevaría por delante lo que otros
 * estuvieran cerrando: es volver a mandarse la señal a uno mismo. Como el
 * oyente era `once`, ya no está cuando llega la segunda, así que lo que corre es
 * el comportamiento por defecto — exactamente «terminar como iba a terminar»,
 * pero de verdad esta vez.
 *
 * NO REPRODUCIDO EN ESTA MÁQUINA: Windows no entrega estas señales. Se deriva de
 * lo que Node documenta y de leer el código, y por eso `verify:mesa` comprueba
 * que la despedida ocurre y con qué señal, en vez de fiarse.
 */
function volcarAlMorir(senal: string): void {
  if (mesas.size === 0) return;
  console.log(`[arcade] ${senal}: volcando ${mesas.size} mesa(s) antes de terminar.`);
  almacen.guardarYa(todas());
}

/**
 * Cómo se devuelve el proceso a su destino después de volcar.
 *
 * Es una costura de prueba y solo eso, con la misma justificación que
 * `ponerAlmacenDeMesas`: la de verdad MATA EL PROCESO, así que un comprobador
 * que quiera ejercitar el manejador —y `verify:mesa` lo hace, porque en Windows
 * no hay otra forma— se mataría a sí mismo en mitad de la comprobación.
 */
let despedirse: (senal: NodeJS.Signals) => void = (senal) => {
  process.kill(process.pid, senal);
};

/** Cambia lo que se hace tras volcar. SOLO para `verify:mesa`. Ver arriba. */
export function ponerLaDespedida(otra: (senal: NodeJS.Signals) => void): void {
  despedirse = otra;
}

function alRecibirLaSenal(senal: NodeJS.Signals): void {
  volcarAlMorir(senal);
  despedirse(senal);
}

process.once('SIGTERM', () => alRecibirLaSenal('SIGTERM'));
/*
 * `SIGINT` es Ctrl+C en el portátil de quien desarrolla. No lo manda Render y no
 * es un requisito, y está por la misma razón por la que se prueban las cosas en
 * local: si el volcado solo se ejercitara en producción, la primera vez que se
 * sabría si funciona sería el día que hiciera falta.
 */
process.once('SIGINT', () => alRecibirLaSenal('SIGINT'));

// ---------------------------------------------------------------------------
// EL CANDADO, QUE CUBRE TAMBIÉN LA LECTURA
// ---------------------------------------------------------------------------

const candados = new Map<string, Promise<unknown>>();

/** Cuántos candados quedan vivos. Solo para comprobar que no hay fuga. */
export function candadosDeMesaVivos(): number {
  return candados.size;
}

/**
 * Hace algo con una mesa, en exclusión mutua con todo lo demás de esa mesa.
 *
 * ═══ POR QUÉ LO USA TAMBIÉN LA LECTURA ═══
 *
 * Porque desde esta fase LEER PUEDE ESCRIBIR: antes de devolver nada se evalúan
 * los plazos, y si uno ha vencido entra un tic por el reductor. Sin el candado,
 * cuatro móviles sondeando la misma mesa harían vencer el mismo plazo cuatro
 * veces —cuatro tics, cuatro turnos saltados— y ninguno de los cuatro daría un
 * error. Es un fallo de los caros: aparece solo cuando hay gente de verdad
 * mirando a la vez, o sea nunca en una prueba de un solo cliente.
 *
 * El candado se retira comparando contra la promesa QUE SE GUARDÓ y no contra la
 * que se creó. Esa distinción parece una minucia y es la fuga silenciosa que ya
 * tuvo `live/sesion.ts`: guardando una y comparando la otra, la condición es
 * siempre falsa y el mapa crece una entrada por partida jugada.
 */
export async function conLaMesa<T>(
  codigo: string,
  hacer: (m: MesaEnCurso) => T | Promise<T>,
): Promise<T> {
  cargar();
  const anterior = candados.get(codigo) ?? Promise.resolve();
  let liberar!: () => void;
  const turno = new Promise<void>((r) => {
    liberar = r;
  });
  const miVez = anterior.then(() => turno);
  candados.set(codigo, miVez);
  await anterior;

  try {
    const m = mesas.get(codigo);
    if (!m) throw new MesaDesconocida(codigo);
    return await hacer(m);
  } finally {
    liberar();
    if (candados.get(codigo) === miVez) candados.delete(codigo);
  }
}

/** No hay ninguna mesa con ese código. */
export class MesaDesconocida extends Error {
  constructor(public readonly codigo: string) {
    super(
      `No hay ninguna mesa con el código «${codigo}». O se ha tecleado mal, o la partida ya se ` +
        'cerró, o este servidor no es el que la abrió.',
    );
    this.name = 'MesaDesconocida';
  }
}

/** La mesa está llena, o el aforo del juego no admite a nadie más. */
export class MesaLlena extends Error {
  constructor(
    public readonly codigo: string,
    public readonly maximo: number,
  ) {
    super(`En esta mesa caben ${maximo} y ya están todos sentados.`);
    this.name = 'MesaLlena';
  }
}

/**
 * SE HA PEDIDO UNA MESA DE SERVIDOR PARA UN ARCADE QUE CORRE EN EL APARATO.
 *
 * ═══ POR QUÉ ESTO FALLA EN LA PETICIÓN QUE ABRE, Y NO MÁS TARDE ═══
 *
 * `necesitaMesa(manifiesto)` existe en `shared/arcade/tipos.ts` desde la fase 0
 * para responder exactamente esta pregunta, y hasta ahora no la llamaba ni una
 * línea de producción: solo un comprobador. Sin ella, `POST /api/arcade/mesas`
 * con un arcade de `sede: 'dispositivo'` —La Frente, hoy, y está en el catálogo
 * que el propio servidor publica— abría la mesa, la metía en la tabla, la
 * persistía… y REVENTABA al componer la vista, porque la proyección de ese juego
 * está escrita sobre su propio estado y la mesa nace con `estado: undefined`.
 *
 * Lo que quedaba era una mesa envenenada: 500 al leerla, 500 al sentarse y 500
 * al borrarla —el `DELETE` exige estar sentado y para saberlo hay que leerla—,
 * repetible sin credencial ninguna y viva treinta días.
 *
 * Pero el fallo de verdad no era el 500, que se arregla solo al no abrirla: es
 * que sin esta comprobación la plataforma hospeda, persiste y sirve durante un
 * mes partidas de un juego cuyo reductor está declarado para correr en el
 * aparato. La lección está escrita tres veces en este fichero —fallar en la
 * petición que abre y no cuando ya hay gente esperando— y aquí cuesta una línea.
 */
export class ArcadeSinMesa extends Error {
  constructor(
    public readonly arcade: ArcadeId,
    public readonly nombre: string,
  ) {
    super(
      `«${nombre}» se juega en el aparato (\`sede: 'dispositivo'\`) y no tiene mesa de servidor: ` +
        'su reductor corre en el móvil y su estado no sale de ahí. No hay nada que abrir aquí.',
    );
    this.name = 'ArcadeSinMesa';
  }
}

/**
 * UN MOVIMIENTO CON UN `tipo` QUE RESERVA LA PLATAFORMA.
 *
 * ═══ LA INVARIANTE QUE ESTABA ESCRITA Y NO EXISTÍA ═══
 *
 * `shared/arcade/movimiento.ts` declara que los tipos que empiezan por `arcade:`
 * los reserva la plataforma, y la cabecera de `arbitro.ts` dice por qué importa:
 * «el tic no lo manda un dispositivo … hacerlo pasar por la misma puerta abriría
 * la llave maestra». No lo comprobaba nadie.
 *
 * Lo que eso valía, MEDIDO contra el servidor levantado: un sentado a quien NO
 * le tocaba mandaba `{ tipo: 'arcade:tic' }`, recibía 200, y al que sí tenía el
 * turno se le echaba su carta más baja y se le sumaba una pasada. Repitiéndolo,
 * un solo cliente jugó la partida entera de cuatro personas —cinco bazas, la
 * mesa terminada, cinco pasadas en cada uno de los otros tres y ninguna en él—
 * sin que los demás tocaran el móvil. Y como forzar siempre la carta más baja
 * ajena decide las bazas, no era solo actuar cuando no te toca: era ganar.
 *
 * Se comprueba AQUÍ, en la única puerta por la que entra un movimiento de un
 * dispositivo, y no dentro de cada juego. Un reductor que tuviera que acordarse
 * de mirar `ctx.quien` en su rama del tic estaría reescribiendo una regla de
 * plataforma en cada juego, y el que se olvidara —Riberas, dentro de dos fases—
 * volvería a abrir esto sin que nada avisara.
 */
export class MovimientoReservado extends Error {
  constructor(public readonly tipo: string) {
    super(
      `«${tipo}» es un movimiento de la plataforma y no lo puede mandar un dispositivo. ` +
        'El prefijo `arcade:` está reservado: hoy es el tic del reloj, y el reloj lo mete quien ' +
        'hospeda la partida, no quien juega.',
    );
    this.name = 'MovimientoReservado';
  }
}

/** El prefijo que reserva la plataforma. Ver `shared/arcade/movimiento.ts`. */
const PREFIJO_RESERVADO = 'arcade:';

// ---------------------------------------------------------------------------
// LOS PLAZOS, EVALUADOS EN LA LECTURA
// ---------------------------------------------------------------------------

/**
 * Tope de tics que se meten de una vez. Ver `ponerAlDiaElPlazo`.
 *
 * No debería llegarse nunca, porque cada tic reprograma el vencimiento a partir
 * de AHORA y por tanto solo puede vencer uno por lectura. Está por lo que está
 * cualquier tope en un bucle que depende de un reloj: si alguien cambia la
 * política de reprogramación por «vence otra vez cuando le tocaba», una mesa
 * aparcada tres días con plazo de un minuto metería cuatro mil trescientos tics
 * en una sola petición HTTP, con el bucle de eventos bloqueado mientras tanto.
 */
const TICS_DE_GOLPE = 8;

/**
 * ¿Ha vencido el plazo? Si sí, mete el tic. Devuelve si la mesa ha cambiado.
 *
 * ═══ EL TIC QUE NO CAMBIA NADA SE DESCARTA, Y ESO NO ES UNA OPTIMIZACIÓN ═══
 *
 * `avanzarElReloj` del árbitro SIEMPRE sube la revisión y SIEMPRE anota el
 * movimiento en el diario, porque desde su punto de vista un tic es un
 * movimiento como cualquier otro. Aquí eso no vale: una mesa que lleva dos días
 * esperando al cuarto jugador recibe un tic por lectura, y el juego devuelve el
 * mismo estado porque no hay nada que hacer vencer. Sin este descarte, esa mesa
 * acumularía miles de entradas en el diario, la revisión subiría sola, y los
 * móviles que sondean se despertarían continuamente para pintar exactamente lo
 * mismo.
 *
 * La comprobación es por IDENTIDAD y se apoya en una regla que el contrato del
 * reductor ya exige y que `oro:arcade` mide: un movimiento que no cambia nada
 * devuelve EL MISMO objeto. Un juego que copiara el estado en cada tic haría
 * crecer su diario, y eso se vería en `oro:arcade` como un salto en la cuenta de
 * movimientos que no tocan nada — no aquí, en silencio.
 *
 * ═══ Y POR QUÉ EL VENCIMIENTO SE REPROGRAMA DESDE AHORA ═══
 *
 * Podría reprogramarse «desde donde vencía» —`venceEn += plazoMs`—, que es lo
 * que hace un metrónomo. Sería el comportamiento equivocado: una mesa de La
 * Larga aparcada un fin de semana con plazo de una hora tendría cuarenta y ocho
 * plazos vencidos, y al volver el lunes se encontraría cuarenta y ocho turnos
 * saltados de golpe. Reprogramando desde ahora, se pierde UN turno por plazo
 * transcurrido sin que nadie mire, que es lo que significa de verdad «se te pasó
 * la hora».
 */
function ponerAlDiaElPlazo(m: MesaEnCurso, manifiesto: ManifiestoDeArcade): boolean {
  if (m.plazoMs <= 0 || m.mesa.terminada) {
    m.venceEn = null;
    return false;
  }

  let cambio = false;
  for (let vueltas = 0; vueltas < TICS_DE_GOLPE; vueltas++) {
    const ahora = Date.now();
    if (m.venceEn === null) {
      m.venceEn = ahora + m.plazoMs;
      return cambio;
    }
    if (ahora < m.venceEn) return cambio;

    const antes = m.mesa;
    const despues = medirMovimiento(m.mesa.arcade, 'arcade:tic', () => avanzarElReloj(antes));
    m.venceEn = Date.now() + m.plazoMs;
    if (despues.estado === antes.estado) continue;

    m.mesa = despues;
    m.ultimoToqueEn = Date.now();
    medirTamano(m.mesa.arcade, m.mesa.estado, tieneReloj(manifiesto));
    cambio = true;
  }
  return cambio;
}

// ---------------------------------------------------------------------------
// ABRIR, SENTARSE, MIRAR, MOVER, CERRAR
// ---------------------------------------------------------------------------

/** El plazo por defecto si quien abre no dice otra cosa: dos minutos por turno. */
export const PLAZO_POR_DEFECTO_S = 120;

/** Lo más largo que se admite: siete días. Ver `abrir`. */
export const PLAZO_MAXIMO_S = 7 * 24 * 60 * 60;

/**
 * ABRE UNA MESA. La abre EL PRIMER JUGADOR, que se sienta de paso.
 *
 * Abrir y sentarse van juntos y no en dos pasos, y la razón es que el paso
 * intermedio —una mesa abierta sin nadie— no significa nada y sí abre un hueco:
 * quien la abriera podría no sentarse, y entonces habría mesas fantasma que
 * caducan solas y códigos repartidos que no llevan a ninguna partida.
 *
 * `plazoSegundos` es de quien abre y no del juego, por lo que cuenta la cabecera:
 * «veinticuatro horas por turno» es una decisión de producto de quien monta la
 * partida. Se admite `0` explícito, que significa «esta mesa no tiene prisa» y
 * deja los plazos apagados.
 */
export async function abrir(datos: {
  arcade: ArcadeId;
  nombre: string;
  plazoSegundos?: number;
}): Promise<{ mesa: MesaEnCurso; silla: Silla }> {
  cargar();
  const ahora = Date.now();
  barrerLasViejas(ahora);

  /*
   * El manifiesto se pide ANTES de nada. Abrir una mesa de un arcade que no está
   * instalado tiene que fallar aquí —en la petición que la abre, con el nombre
   * del juego en el mensaje— y no al primer movimiento, con gente esperando. Es
   * la lección de `manifiestoDe`, que devolvía CLUEDO por defecto y dejaba jugar
   * una velada entera con las reglas de otro juego sin un solo error.
   */
  const manifiesto = manifiestoDeArcade(datos.arcade);

  /*
   * Y SE MIRA QUE ESTE JUEGO TENGA MESA. Es la pregunta que `necesitaMesa`
   * responde desde la fase 0 y que no le hacía nadie: ver `ArcadeSinMesa`.
   */
  if (!necesitaMesa(manifiesto)) throw new ArcadeSinMesa(datos.arcade, manifiesto.nombre);

  const codigo = codigoLibre();
  const silla = sillaNueva(datos.nombre);

  const enCurso: MesaEnCurso = {
    codigo,
    mesa: abrirMesaDelArbitro({
      id: codigo,
      arcade: datos.arcade,
      /*
       * LA SEMILLA LA ELIGE EL SERVIDOR, y del azar de verdad. Si la eligiera el
       * dispositivo, un cliente manipulado probaría semillas hasta dar con la
       * que le reparte la mano que quiere — y en un juego de mano oculta eso no
       * es una ventaja, es el juego entero.
       */
      semilla: semillaNueva(),
      asientos: [silla.id],
    }),
    sillas: [silla],
    plazoMs: plazoValido(datos.plazoSegundos) * 1000,
    venceEn: null,
    abiertaEn: ahora,
    ultimoToqueEn: ahora,
  };
  if (enCurso.plazoMs > 0) enCurso.venceEn = ahora + enCurso.plazoMs;

  mesas.set(codigo, enCurso);
  try {
    await guardar(manifiesto, enCurso);
  } catch (error) {
    /*
     * Si no se ha podido guardar, la mesa NO se abre: se saca de la tabla y el
     * fallo sube. Una mesa que existe en memoria y no en el disco es una partida
     * que se pierde en el siguiente reinicio sin que nadie lo sepa, y aquí —a
     * diferencia de un movimiento a mitad de partida— no hay nada que salvar:
     * todavía no ha jugado nadie.
     */
    mesas.delete(codigo);
    throw error;
  }
  return { mesa: enCurso, silla };
}

/**
 * El plazo pedido, acotado.
 *
 * El máximo existe por lo que existe cualquier tope en un número que llega de
 * fuera: sin él, `plazoSegundos: 1e18` da un `venceEn` que no vence nunca y una
 * mesa que se queda quieta para siempre sin que nada falle. Siete días es más
 * que de sobra para el juego más lento que el diseño contempla —La Larga, «se
 * entra, se juega uno, se cierra la app»— y sigue siendo un número.
 *
 * Un valor que no sea un número finito se trata como «no dijo nada» y cae al
 * defecto, en vez de lanzar: quien abre una mesa está tecleando un nombre en un
 * móvil, y una petición rechazada por un campo opcional mal formado es peor
 * producto que un plazo razonable.
 */
function plazoValido(pedido: number | undefined): number {
  if (pedido === undefined || !Number.isFinite(pedido)) return PLAZO_POR_DEFECTO_S;
  if (pedido <= 0) return 0;
  return Math.min(Math.floor(pedido), PLAZO_MAXIMO_S);
}

function sillaNueva(nombre: string): Silla {
  const limpio = nombre.trim().slice(0, 24);
  return {
    id: `a${letrasAlAzar(8)}`,
    nombre: limpio.length > 0 ? limpio : 'Alguien',
    llave: letrasAlAzar(LARGO_DE_LA_LLAVE),
  };
}

/**
 * Una semilla de 32 bits del azar de verdad.
 *
 * `crypto` y no `Math.random()`: no porque haga falta criptografía para barajar,
 * sino porque `Math.random()` en Node se siembra de una forma que no está
 * documentada y no hay ninguna razón para usar el generador flojo cuando el
 * bueno está a la misma distancia.
 */
function semillaNueva(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] as number;
}

/**
 * SE SIENTA ALGUIEN MÁS, con el código.
 *
 * El aforo lo dice el MANIFIESTO y no este fichero. Con cuatro sentados en una
 * mesa de La Ronda, el quinto se queda fuera sin que nadie haya escrito «cuatro»
 * aquí.
 *
 * ═══ SE MIRA EL MÁXIMO Y NO `cabenEnLaMesa`, Y HAY QUE DECIR POR QUÉ ═══
 *
 * `cabenEnLaMesa(m, n)` responde a «¿es `n` una cantidad JUGABLE?», o sea que
 * comprueba el mínimo además del máximo. Es la pregunta correcta para empezar
 * una partida y la equivocada para sentarse: con ella, el segundo en llegar a
 * una mesa de cuatro recibiría «la mesa está llena», porque dos no es una
 * cantidad jugable de La Ronda. Se probó y eso es exactamente lo que hizo.
 *
 * Sentarse solo puede chocar con el techo. Que haya bastante gente para jugar es
 * una pregunta del REDUCTOR —La Ronda no reparte hasta que hay cuatro— y no de
 * la puerta, y ahí está bien puesta: si la puerta exigiera el mínimo, nadie
 * podría llegar a alcanzarlo.
 *
 * Sentarse SUBE LA REVISIÓN aunque no toque el estado del juego, y eso es
 * deliberado: los otros tres están sondeando y tienen que enterarse de que ha
 * llegado alguien. El precio es que un movimiento en vuelo se queda rancio y hay
 * que reintentarlo, lo cual solo puede pasar mientras la mesa se reúne.
 */
export async function sentarse(codigo: string, nombre: string): Promise<Silla> {
  return conLaMesa(codigo, async (m) => {
    const manifiesto = manifiestoDeArcade(m.mesa.arcade);
    if (m.mesa.terminada) throw new MesaLlena(codigo, manifiesto.jugadores.maximo);
    if (m.sillas.length + 1 > manifiesto.jugadores.maximo) {
      throw new MesaLlena(codigo, manifiesto.jugadores.maximo);
    }

    const silla = sillaNueva(nombre);
    m.sillas = [...m.sillas, silla];
    m.mesa = {
      ...m.mesa,
      asientos: m.sillas.map((s) => s.id),
      rev: m.mesa.rev + 1,
    };
    m.ultimoToqueEn = Date.now();
    await guardar(manifiesto, m);
    return silla;
  });
}

/**
 * MIRAR LA MESA. Y sí, mirar puede escribir.
 *
 * ═══ AQUÍ NO SE COMPRUEBA NINGUNA REVISIÓN, Y ESO ES EL PUNTO 4 DE «LA LARGA» ═══
 *
 * Un `rev` rancio de días no es un error: es alguien que volvió del trabajo. La
 * resincronización lo trata como el caso normal y devuelve el estado COMPLETO,
 * que es el mismo razonamiento que ya está escrito en la cabecera de `hub.ts`
 * —«si se pierde un aviso, la siguiente petición trae el estado completo»— y lo
 * que permite que el día que exista un canal continuo se pueda degradar a sondeo
 * en caliente.
 *
 * La revisión se comprueba al ESCRIBIR, en `mover`, y solo allí: ahí sí importa,
 * porque actuar sobre un estado que ya no existe cambia el resultado. Mirar con
 * una revisión vieja no cambia nada de nadie.
 */
export async function mirar(codigo: string, llave: string | null): Promise<VistaDeMesa> {
  return conLaMesa(codigo, async (m) => {
    const manifiesto = manifiestoDeArcade(m.mesa.arcade);
    const yo = asientoDe(m, llave);

    if (ponerAlDiaElPlazo(m, manifiesto)) await guardar(manifiesto, m);

    /*
     * La presencia se marca AQUÍ, en la lectura, porque es lo que significa: «se
     * le ha visto». No se escribe en ningún sitio ni pide el candado de nada —es
     * un número en un mapa— y por eso puede ocurrir en cada vuelta de sondeo sin
     * costar nada. La lección viene de las veladas, donde marcar «sigo aquí»
     * pasaba por el candado de la partida y estrechaba la velada entera por el
     * cuello del dato más insignificante que hay en ella.
     */
    if (yo !== null) marcarPresencia(clavePresencia(codigo), yo);

    return vistaDe(m, yo);
  });
}

/**
 * MOVER. La única puerta por la que un dispositivo cambia una partida.
 *
 * ═══ EL PLAZO SE EVALÚA ANTES DE ADMITIR EL MOVIMIENTO ═══
 *
 * Y el orden es la regla, no una casualidad de implementación: si a alguien se le
 * ha pasado el turno mientras escribía, lo que tiene que entrar primero es el
 * tic. Al revés, el movimiento de quien llegó tarde se colaría por delante de su
 * propio vencimiento, y entonces «se acabó el tiempo» significaría cosas
 * distintas según lo llena que estuviera la cola de peticiones del servidor. Es
 * el mismo criterio que La Frente ya tenía escrito para el pulgar y el reloj.
 *
 * La consecuencia visible es buena: quien llega tarde recibe `revision-rancia`
 * —porque el tic subió la revisión— vuelve a pedir el estado y se encuentra con
 * que su turno pasó. Eso es exactamente lo que ocurrió.
 *
 * ═══ Y EL MOVIMIENTO QUE NO CAMBIA NADA SE DESCARTA ENTERO ═══
 *
 * Es la misma regla que `ponerAlDiaElPlazo` ya aplicaba al tic, que faltaba en
 * el camino del cliente, y que aquí vale por tres cosas a la vez. Un reductor
 * devuelve EL MISMO objeto cuando el movimiento no significa nada en su juego
 * —una carta que no tienes, un turno que no es el tuyo, un `tipo` que no
 * conoce—, y hasta ahora eso subía la revisión igual, se anotaba en el diario
 * igual y se escribía en el disco igual. Medido: dos mil movimientos de un tipo
 * inexistente desde un solo cliente dejaban el diario de esa mesa en 1,2 MB, y
 * uno solo con 240 kB de carga dentro quedaba archivado tal cual durante treinta
 * días. Con el descarte, un movimiento que el juego ignora no deja rastro:
 *
 *   · NO CRECE EL DIARIO ni el estado guardado, así que no hay forma de llenar
 *     el disco de un servidor sin credencial ninguna.
 *   · NO SUBE LA REVISIÓN, así que los otros tres no se despiertan de su sondeo
 *     para repintar exactamente lo mismo.
 *   · Y NO REPROGRAMA EL PLAZO, que es lo grave y lo que sigue.
 */
export async function mover(
  codigo: string,
  llave: string | null,
  rev: number,
  movimiento: Movimiento,
): Promise<VistaDeMesa> {
  /*
   * EL PREFIJO RESERVADO SE COMPRUEBA ANTES QUE NADA, y antes incluso de coger
   * el candado: un dispositivo no manda movimientos de la plataforma. Ver
   * `MovimientoReservado`, que cuenta lo que costaba no comprobarlo.
   */
  if (movimiento.tipo.startsWith(PREFIJO_RESERVADO)) {
    throw new MovimientoReservado(movimiento.tipo);
  }

  return conLaMesa(codigo, async (m) => {
    const manifiesto = manifiestoDeArcade(m.mesa.arcade);
    const yo = asientoDe(m, llave);

    const vencio = ponerAlDiaElPlazo(m, manifiesto);

    /*
     * `jugar` lanza `MovimientoRechazado` con su motivo, y aquí no se traduce a
     * nada: sube tal cual hasta la ruta, que es quien sabe convertir un motivo en
     * un código HTTP. Traducirlo aquí obligaría a este fichero a saber de HTTP,
     * y entonces no se podría usar la misma autoridad desde un guion de
     * comprobación sin montar un servidor.
     */
    const antes = m.mesa;
    let despues: typeof antes;
    try {
      despues = medirMovimiento(antes.arcade, movimiento.tipo, () =>
        jugar(antes, { quien: yo, movimiento, rev }),
      );
    } catch (error) {
      if (vencio) await guardar(manifiesto, m);
      throw error;
    }

    /*
     * ═══ EL PLAZO SOLO SE REPROGRAMA SI DE VERDAD HA PASADO ALGO ═══
     *
     * Aquí estaba escrito «el vencimiento se reprograma con CADA movimiento
     * aceptado: mover es justo lo que demuestra que sigues ahí». La frase es
     * cierta para quien juega y falsa para la mesa, porque el árbitro acepta el
     * movimiento de CUALQUIERA de los cuatro con la revisión fresca —le toque o
     * no— y también los que el reductor ignora.
     *
     * Lo que salía de ahí, medido contra el servidor levantado: con un plazo de
     * tres segundos, un jugador al que NO le tocaba mandando un movimiento
     * cualquiera una vez por segundo mantuvo el plazo sin vencer DIEZ segundos
     * —cero tics— y en cuanto paró, el primer silencio lo hizo vencer. O sea que
     * una petición por plazo, desde cualquier asiento, apagaba el vencimiento
     * para siempre: al que le tocaba no perdía el turno nunca, y los otros tres
     * se lo prolongaban sin querer con cada movimiento suyo. Con La Larga —
     * veinticuatro horas por turno— eso es un jugador congelando el reloj de los
     * otros cinco indefinidamente, que es justo la garantía que esta fase existe
     * para traer.
     *
     * La regla correcta, y la única que esta capa puede escribir sin saber qué
     * es un turno: EL PLAZO SE REPROGRAMA CUANDO EL ESTADO CAMBIA. La mesa no
     * puede saber a quién le tocaba —el estado es opaco— pero sí sabe si el
     * juego avanzó, que es lo que significa de verdad «ha pasado algo».
     */
    const cambio = despues.estado !== antes.estado;

    if (!cambio) {
      /*
       * Ni se guarda ni se sube la revisión: para la mesa no ha ocurrido nada.
       * Se devuelve la vista de ahora, que es la verdad —el juego ignoró el
       * movimiento— y con la revisión intacta, que es lo que le dice a la ruta
       * que no hay a quién avisar.
       */
      if (vencio) await guardar(manifiesto, m);
      return vistaDe(m, yo);
    }

    m.mesa = despues;
    m.ultimoToqueEn = Date.now();
    if (m.plazoMs > 0) m.venceEn = Date.now() + m.plazoMs;
    medirTamano(m.mesa.arcade, m.mesa.estado, tieneReloj(manifiesto));
    await guardar(manifiesto, m);
    return vistaDe(m, yo);
  });
}

/**
 * CIERRA LA MESA. Lo pide quien está sentado, cuando el juego dice que se acabó.
 *
 * ═══ POR QUÉ NO LO DECIDE LA AUTORIDAD SOLA ═══
 *
 * Porque «fin como función del estado» es uno de los conceptos que el diseño
 * aplaza hasta que llegue un juego que lo pida, y aplazarlo tiene un motivo: en
 * cuanto la plataforma sepa preguntarle a un juego si ha terminado, tendrá una
 * opinión sobre qué es terminar —si hay un ganador, si son varios, si se puede
 * seguir jugando después—. El estado es opaco y este fichero no puede mirarlo.
 *
 * Así que cerrar es un acto de quien está en la mesa. Es el peaje que esta fase
 * paga, y está pagado a la vista: `verify:arcade-pobre` ya lo lleva anotado como
 * «el fin lo anota quien hospeda leyendo el estado».
 *
 * Una mesa cerrada NO se borra: se marca `terminada` y se queda hasta que el
 * barrido se la lleve. Borrarla en el acto dejaría a los otros tres con una
 * pantalla que dice «esa mesa no existe» en lugar del resultado, que es
 * literalmente quitarle el final al juego.
 */
export async function cerrar(codigo: string, llave: string | null): Promise<VistaDeMesa> {
  return conLaMesa(codigo, async (m) => {
    const manifiesto = manifiestoDeArcade(m.mesa.arcade);
    const yo = asientoDe(m, llave);
    if (yo === null) {
      throw new MovimientoRechazado(
        'no-estas-sentado',
        'Solo puede cerrar la mesa quien está sentado a ella.',
      );
    }
    if (!m.mesa.terminada) {
      m.mesa = cerrarMesa(m.mesa);
      m.venceEn = null;
      m.ultimoToqueEn = Date.now();
      await guardar(manifiesto, m);
    }
    return vistaDe(m, yo);
  });
}

/**
 * Olvida una mesa del todo: de la memoria, del almacén y de la presencia.
 *
 * La llaman el `DELETE` de `routes/arcade.ts` —quien está sentado tira la mesa— y
 * la apertura cuando la primera mirada falla, para no dejar una mesa huérfana de
 * la que nadie tiene llave. Aquí ponía «no la llama ninguna ruta», que era cierto
 * mientras se escribía y dejó de serlo el mismo día: un comentario que cuenta una
 * historia vieja es peor que ninguno, porque quien lo lea creerá que puede
 * cambiar esta función sin mirar a quién rompe.
 */
export async function olvidarMesa(codigo: string): Promise<void> {
  cargar();
  const m = mesas.get(codigo);
  if (!m) return;
  mesas.delete(codigo);
  pendientesDeGuardar.delete(codigo);
  olvidarPresencia(clavePresencia(codigo));
  /*
   * El fallo al borrar se anota y no sube: la mesa ya está fuera de la memoria y
   * de la partida, y quien pidió olvidarla no puede hacer nada con «el fichero
   * sigue ahí». Lo que sí importa es que salga en el diagnóstico, porque una
   * mesa que vuelve al arrancar es exactamente lo que se creía haber borrado.
   */
  try {
    await almacen.borrar(codigo);
  } catch (error) {
    anotarElFallo(codigo, error);
  }
}

// ---------------------------------------------------------------------------
// Lo pequeño
// ---------------------------------------------------------------------------

/**
 * La llave de presencia de una mesa, PREFIJADA.
 *
 * `mecanicas/presencia.ts` es una tabla plana compartida con las veladas,
 * indexada por identificador de partida. Sin el prefijo, un código de mesa que
 * coincidiera con un identificador de velada haría que `olvidarMesa` de una
 * partida de diez minutos borrara la presencia de una velada de tres horas. Es
 * exactamente la misma cautela que toma `canal/sondeo.ts` con el hub, y por el
 * mismo motivo.
 */
function clavePresencia(codigo: string): string {
  return `arcade:${codigo}`;
}

/** Quién es quien trae esta llave, o `null` si no trae ninguna válida. */
function asientoDe(m: MesaEnCurso, llave: string | null): AsientoId | null {
  if (llave === null) return null;
  const silla = m.sillas.find((s) => s.llave === llave);
  return silla ? silla.id : null;
}

/** Compone lo que se le enseña a alguien. La proyección la hace el juego. */
function vistaDe(m: MesaEnCurso, yo: AsientoId | null): VistaDeMesa {
  const ahora = Date.now();
  return {
    codigo: m.codigo,
    arcade: m.mesa.arcade,
    rev: m.mesa.rev,
    tic: m.mesa.tic,
    terminada: m.mesa.terminada,
    venceEn: m.venceEn,
    asientos: m.sillas.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      presente: ahora - senalEnMemoria(clavePresencia(m.codigo), s.id) < CONECTADO_MS,
    })),
    yo,
    /*
     * ═══ AQUÍ NO SE MANDA EL ESTADO, SE MANDA LA PROYECCIÓN ═══
     *
     * `vistaDeAsiento` mira el manifiesto: si el juego declara secretos y tiene
     * proyección registrada, recorta; y si declara secretos y NO la tiene, lanza
     * en vez de mandar el estado entero. Esa negativa no debería poder ocurrir
     * nunca en un servidor sano, porque `exigirSecretosTapados()` impide arrancar
     * — pero está, porque un respaldo silencioso que mandara el estado entero
     * convertiría un juego mal instalado en un juego que filtra, y nadie lo
     * vería jamás.
     */
    vista: vistaDeAsiento(m.mesa.arcade, m.mesa.estado, yo),
  };
}

/** Cuántas mesas hay vivas. Para el diagnóstico y para comprobar que no hay fuga. */
export function mesasVivas(): number {
  cargar();
  return mesas.size;
}
