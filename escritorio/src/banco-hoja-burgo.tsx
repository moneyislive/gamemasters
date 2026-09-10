/**
 * EL BANCO DE LA INTERFAZ DEL BURGO: EL ÚNICO SITIO DONDE SE JUZGA QUE **SE VE**.
 *
 * ═══ EL AGUJERO QUE TAPA ═══
 *
 * El §6.2 del diseño dice que el banco es el único sitio donde se juzga que el Burgo SE VE, y
 * hasta hoy el banco que había (`banco-burgo.tsx`) montaba la ESCENA pelada: el anillo, los
 * peones y los dados dentro de un `Canvas`, sin una sola pieza de interfaz. Todo lo demás —la
 * cinta, el cajón, la hoja, la ficha de una casilla, el componedor de un trato, el cartel del
 * pie— no se podía mirar sin levantar el servidor, abrir una mesa, sentar a seis y jugar
 * hasta el momento que se quería ver. Medido al sacar los momentos de aquí abajo: llegar a un
 * apuro cuesta 71 movimientos con un robot que va a por él a propósito —y 727 con uno que
 * juega normal—, y a un fin de partida, 53. Cada iteración de diseño costaba una partida, así
 * que no se iteraba: se escribía a ciegas y se miraba en producción.
 *
 * Esto pinta LA MISMA interfaz —`BurgoEnTres`, el pintor de verdad, con el retablo de verdad
 * detrás— contra momentos fijos, sin servidor, sin mesa y sin nadie sentado enfrente. Se abre
 * en http://localhost:5175/sala/banco-hoja-burgo.html
 *
 * ═══ LOS MOMENTOS NO ESTÁN ESCRITOS A MANO: SE JUGARON ═══
 *
 * Y no se congela el ESTADO, que sería lo obvio y sería lo malo. Un `EstadoDelBurgo` pegado
 * aquí en JSON envejece en silencio: el día que el reductor gane un campo, el banco sigue
 * pintando la forma vieja y lo que se juzga en él deja de ser lo que se juega. Lo que se
 * congela es EL GUION DE MOVIMIENTOS que llevó hasta cada momento, sacado jugando de verdad
 * contra `shared/arcade/juegos/burgo.ts` con un robot sembrado que sólo elige entre lo que
 * `opcionesDelBurgo` ofrece. El reductor es determinista con la misma semilla —el azar vive
 * DENTRO del estado y la semilla viaja en el contexto—, así que el banco rebobina el guion al
 * abrirse y llega exactamente al mismo sitio, con el reductor de HOY.
 *
 * La receta, para volver a sacarlos cuando haga falta un momento nuevo: partir de
 * `partidaNueva()`, mandar `EMPEZAR` CON LA CARGA QUE EL JUEGO COMPUSO (un `{}` escrito a mano
 * se rechaza en silencio y la mesa se queda reunida), y desde ahí, en cada vuelta y para cada
 * asiento, pedir `opcionesDelBurgo(proyectarElBurgo(estado, quien, sentados), quien)` y mandar
 * una con `avanzarElBurgo`, parando en cuanto el estado cumple lo que el momento pide. Es lo
 * mismo que hace `server/scripts/verificar-burgo-en-tres.ts`, en pequeño.
 *
 * ═══ Y SI EL GUION DEJA DE LLEVAR DONDE LLEVABA, SE DICE EN PANTALLA ═══
 *
 * Ésta es la mitad que hace que el banco no mienta. Un guion rebobinado contra un reductor que
 * cambió puede quedarse a medias —un movimiento deja de estar ofrecido, el portillo lo
 * descarta y el estado no avanza— y el banco enseñaría OTRO momento con el rótulo del que se
 * pidió: la subasta sin subasta, el apuro sin apuro. Eso no es un error de nadie, es la
 * pantalla que nadie mira. Por eso cada momento declara EN VOCABULARIO DEL JUEGO qué tiene que
 * ser verdad al llegar (`exige`), `loQueFaltaEnElMomento` lo comprueba, y lo que falte sale
 * escrito en rojo encima de la pantalla. `verify:escritorio` corre esa misma función sobre los
 * mismos guiones, así que un guion que caduque se pone rojo en la batería y no sólo aquí.
 *
 * ═══ AQUÍ SE JUEGA DE VERDAD, Y ESO ES A PROPÓSITO ═══
 *
 * Los botones del banco no están pintados: `mover` pasa por `avanzarElBurgo` igual que
 * pasaría por el árbitro, sube la revisión y repinta. O sea que desde cualquier momento se
 * puede seguir jugando la partida entera sin servidor, y «volver al momento» rebobina. Lo que
 * el banco NO tiene es autoridad: no hay secreto que esconder de nadie porque no hay nadie más
 * —se proyecta para el asiento que se está mirando, como haría el servidor—, y por eso cambiar
 * de asiento aquí es legítimo y en una mesa de verdad no lo sería.
 *
 * ═══ CON MUNDO Y SIN MUNDO, PORQUE EL RESPALDO ES UNA PANTALLA DE VERDAD ═══
 *
 * `BurgoEnTres` decide por dentro si hay lienzo, y una de las cuatro razones por las que cae
 * al retablo es que el `.glb` del anillo no llegue. Aquí no hay servidor de juego que lo
 * sirva, así que el banco se pone en medio de `fetch` para las NUEVE rutas de modelo que esta
 * pantalla usa —las dos del pintor y las siete de la escena; ver `ficheroDeVite`— y contesta
 * con los ficheros que Vite sirve, que es la misma frontera que en la partida: el pintor no
 * sabe de dónde vienen los bytes. Con `?mundo=0` el banco las
 * RECHAZA a propósito, y entonces se ve exactamente lo que ve quien abre el Burgo en un
 * aparato sin WebGL: el retablo SVG entero, con su renglón de por qué. Esa pantalla no la
 * miraba nadie.
 *
 * La rechaza en vez de limitarse a no servirlas porque el rechazo tiene que ser SEGURO: si
 * alguien tiene el servidor de juego levantado en 5174, el proxy de Vite serviría el modelo y
 * `?mundo=0` enseñaría el mundo. Un banco que a veces no hace lo que dice es peor que no
 * tenerlo.
 *
 * ═══ LAS DIECIOCHO MEDIDAS SON LAS DE LA BATERÍA, COPIADAS Y COMPROBADAS ═══
 *
 * `LIENZOS_DEL_BANCO` es la lista de `escritorio/scripts/verificar-escritorio.tsx`, copiada
 * porque aquel fichero es un GUION que se ejecuta entero al importarlo —importarlo desde el
 * navegador correría la batería dentro de la pestaña— y no exporta nada. Copiar una lista es
 * la manera de que un lienzo nuevo entre en una copia y no en la otra, así que la copia se
 * COMPRA: `verify:escritorio` importa ésta y afirma que son las mismas dieciocho, nombre a
 * nombre y número a número. Es el mismo trato que `tema.ts` tiene con los colores del Burgo.
 *
 * Y se aplican como medida de la VENTANA, que es lo único que un banco puede emular. El
 * recuadro que sale de dentro es más pequeño, y cuánto sale es justamente lo que aquí se
 * puede leer sin abrir las herramientas del navegador: el banco lo mide con un
 * `ResizeObserver` y lo imprime al lado.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import {
  avanzarElBurgo,
  BURGO,
  MANIFIESTO_BURGO,
  opcionesDelBurgo,
  partidaNueva,
  proyectarElBurgo,
} from '../../shared/arcade/juegos/burgo';
import type { EstadoDelBurgo } from '../../shared/arcade/juegos/burgo';
import type { AsientoNombrado, Opcion } from '../../shared/arcade';
import { tableroDeLaVista } from '../../shared/mecanicas/tablero-declarado';
import { rutaDeLosDados, rutaDelBurgo } from '../../escenas/ruta-de-modelos';
import { FIGURAS, rutaDeLasAnimaciones, rutaDelAventurero } from '../../escenas/embarcadero/figuras';
import { BurgoEnTres } from './burgo-en-tres';
import type { LaMesa, MesaVista, ResultadoDelMovimiento } from './mesa';
import type { ArcadeDelCatalogo } from './muebles';

// ---------------------------------------------------------------------------
// Los bytes de los modelos, sin servidor de juego detrás
// ---------------------------------------------------------------------------

/**
 * LOS `.glb`, PEDIDOS A VITE Y NO POR `?url`.
 *
 * `new URL(…, import.meta.url)` y no `import burgoGlb from '…?url'` porque este módulo tiene
 * que poder IMPORTARSE DESDE NODE: `verify:escritorio` lee de aquí las dieciocho medidas y los
 * guiones de los momentos, y un `?url` es una invención de Vite que Node no sabe resolver —el
 * comprobador reventaría al importar—. La forma con `URL` es de la plataforma, Vite la
 * reescribe igual al empaquetar, y en Node se queda en un `file://` que nadie pide.
 *
 * ═══ Y SON NUEVE Y NO DOS, QUE ES LO PRIMERO QUE ESTE BANCO ENSEÑÓ AL ABRIRSE ═══
 *
 * El pintor pide DOS —el anillo y los dados, con su `recordada` cada uno—, así que la primera
 * versión de esto servía dos. Y el banco salía al RETABLO diciendo «el burgo en tres
 * dimensiones no ha arrancado: no han llegado las animaciones de los aventureros». Los otros
 * siete no los pide el pintor: los pide LA ESCENA, por el `traer` que el pintor le pasa, y su
 * fallo no entra por `usarLosModelos` sino por el límite del mundo, o sea que se lee como «el
 * lienzo reventó» y no como «faltan bytes». Medido aquí mismo, en el navegador:
 * `aventureros/animaciones.glb` contestó 500 —el proxy de Vite hacia un servidor de juego que
 * en un banco no existe— y el banco enseñaba el respaldo creyendo enseñar el mundo. Es
 * exactamente el fallo que este banco existe para cazar, cazado el primer día y en sí mismo.
 */
const ANILLO_DE_VITE = new URL('../../escenas/modelos/burgo.glb', import.meta.url).href;
const DADOS_DE_VITE = new URL('../../escenas/modelos/dados.glb', import.meta.url).href;
/**
 * Los seis aventureros y su fichero de animaciones, indexados por NOMBRE DE FICHERO, que es lo
 * último de `rutaDelAventurero`: así la tabla se recorre con `FIGURAS` y aquí no se escribe una
 * segunda lista de quiénes son. Uno a uno y no con un `glob`, que no entra en los tipos de este
 * proyecto — lo dice ya la cabecera de `banco-burgo.tsx`, que paga esto mismo para la escena.
 */
const AVENTUREROS_DE_VITE: Readonly<Record<string, string>> = {
  'caballero.glb': new URL('../../escenas/modelos/aventureros/caballero.glb', import.meta.url).href,
  'barbaro.glb': new URL('../../escenas/modelos/aventureros/barbaro.glb', import.meta.url).href,
  'maga.glb': new URL('../../escenas/modelos/aventureros/maga.glb', import.meta.url).href,
  'exploradora.glb': new URL('../../escenas/modelos/aventureros/exploradora.glb', import.meta.url).href,
  'picaro.glb': new URL('../../escenas/modelos/aventureros/picaro.glb', import.meta.url).href,
  'encapuchado.glb': new URL('../../escenas/modelos/aventureros/encapuchado.glb', import.meta.url).href,
  'animaciones.glb': new URL('../../escenas/modelos/aventureros/animaciones.glb', import.meta.url).href,
};

/** La ruta que Vite sirve para una del servidor de juego, o `null` si esa petición no es de un modelo. */
function ficheroDeVite(ruta: string): string | null {
  if (ruta === rutaDelBurgo()) return ANILLO_DE_VITE;
  if (ruta === rutaDeLosDados()) return DADOS_DE_VITE;
  if (ruta === rutaDeLasAnimaciones()) return AVENTUREROS_DE_VITE['animaciones.glb'] ?? null;
  for (const f of FIGURAS) {
    if (ruta === rutaDelAventurero(f.id)) return AVENTUREROS_DE_VITE[f.fichero] ?? null;
  }
  return null;
}

/** Con mundo (por defecto) o sin él. Vive en la dirección para que un enlace enseñe lo mismo. */
function hayQueDarElMundo(): boolean {
  if (typeof location === 'undefined') return true;
  return new URLSearchParams(location.search).get('mundo') !== '0';
}

/**
 * EL BANCO SE PONE EN MEDIO DE `fetch` PARA LAS RUTAS DE MODELO, y sólo para ésas.
 *
 * Se instala al cargar el módulo y ANTES de montar nada, porque `burgo-en-tres.tsx` guarda la
 * promesa del anillo en una `recordada` de módulo: la primera petición se recuerda para toda
 * la pestaña, así que llegar tarde sería no llegar. Por lo mismo, cambiar de `?mundo` recarga
 * la página en vez de repintar — una caché por pestaña no se puede deshacer desde dentro, y
 * fingir que sí sería un botón que a veces no hace nada.
 *
 * Lo que no es un modelo pasa TAL CUAL —con el `entrada` original y no con la cadena— para no
 * convertir en un `GET` de cadena una petición que traía cabeceras o cuerpo.
 */
function ponerseEnMedio(conMundo: boolean): void {
  if (typeof window === 'undefined') return;
  const deSiempre = window.fetch.bind(window);
  window.fetch = (entrada: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const ruta = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    const fichero = ficheroDeVite(ruta);
    if (fichero === null) return deSiempre(entrada, init);
    if (!conMundo) {
      return Promise.reject(new Error(`el banco está en «sin mundo»: no se sirve ${ruta}`));
    }
    return deSiempre(fichero, init);
  };
}

// ---------------------------------------------------------------------------
// Las dieciocho medidas
// ---------------------------------------------------------------------------

/** Nombre, ancho y alto. Copiada de `verificar-escritorio.tsx` y comprada allí; ver la cabecera. */
export const LIENZOS_DEL_BANCO: ReadonlyArray<readonly [string, number, number]> = [
  ['escritorio de pie, la cabecera en un renglón', 288, 355],
  ['escritorio de pie, la cabecera en dos renglones', 288, 317],
  ['escritorio estrecho, con algo más de ventana', 288, 420],
  ['móvil estrecho, lienzo al mínimo', 320, 360],
  ['móvil pequeño', 360, 490],
  ['móvil corriente', 390, 490],
  ['móvil de pie, lienzo entero', 390, 845],
  ['tableta', 768, 640],
  ['tableta con el navegador de pie', 768, 1024],
  ['monitor', 1920, 900],
  ['apaisado SE 1ª', 568, 320],
  ['apaisado SE 2ª/3ª', 667, 375],
  ['apaisado Android de 360', 780, 360],
  ['apaisado iPhone 14', 844, 390],
  ['apaisado Pro Max', 932, 430],
  ['apaisado tableta 4:3', 1024, 768],
  ['apaisado iPad Air', 1180, 820],
  ['apaisado monitor 1080', 1920, 1080],
];

// ---------------------------------------------------------------------------
// Los momentos
// ---------------------------------------------------------------------------

/** Un movimiento del guion, tal como salió de la partida que se jugó en Node. */
export interface PasoDelGuion {
  quien: string;
  tipo: string;
  carga: unknown;
}

/**
 * LO QUE TIENE QUE SER VERDAD AL LLEGAR, dicho con el vocabulario público del juego.
 *
 * No es adorno ni documentación: es el filtro que impide que el banco enseñe un momento con el
 * rótulo de otro. Se declara con datos —y no con una función— para que `verify:escritorio`
 * pueda evaluarlo con la MISMA función que el navegador y no con una segunda lectura suya.
 */
export interface LoQueExigeElMomento {
  /** `reuniendo`, `jugando` o `terminada`. */
  momento?: string;
  /** El paso del turno: `almoneda`, `apuro`, `por-tirar`… */
  paso?: string;
  /** Tipos de movimiento que TIENEN que estar ofrecidos a quien mira. */
  ofrece?: readonly string[];
  /** Que haya alguien quebrado en la mesa. */
  hayQuebrado?: boolean;
}

export interface MomentoDelBanco {
  id: string;
  /** Cómo se llama en el botón. Vocabulario de pantalla. */
  rotulo: string;
  /** Qué hay que mirar aquí. Es lo que el banco existe para enseñar. */
  porque: string;
  asientos: readonly string[];
  semilla: number;
  /** El asiento desde el que se sacó. Se puede cambiar en el banco. */
  mirando: string;
  guion: readonly PasoDelGuion[];
  exige: LoQueExigeElMomento;
}

/** Los nombres de los asientos. Seis, que es el aforo del Burgo. */
const NOMBRES: readonly string[] = ['Ana', 'Bea', 'Ciro', 'Dora', 'Elio', 'Fina'];

export function sentadosDe(asientos: readonly string[]): readonly AsientoNombrado[] {
  return asientos.map((a, i) => ({ asiento: a, nombre: NOMBRES[i] ?? a }));
}

/**
 * LOS MOMENTOS, JUGADOS Y CONGELADOS. Ver la cabecera: lo que se congela es el GUION, no el
 * estado, y cada uno declara en `exige` qué tiene que ser verdad al llegar.
 *
 * El orden es el de una partida: se abre la mesa, se juega un turno, se subasta, se trata, se
 * pasa un apuro, alguien quiebra y se acaba. Quien abre el banco para mirar una pieza nueva
 * los recorre de izquierda a derecha y ve la pieza en los siete sitios donde tiene que caber.
 */
export const MOMENTOS: readonly MomentoDelBanco[] = [
  {"id": "arranque", "rotulo": "El arranque", "porque": "La mesa reunida: lo único que el juego ofrece es empezar, y por eso el cajón nace cerrado y ese botón NO puede quedarse detrás de un «≡».", "asientos": ["s1", "s2", "s3", "s4"], "semilla": 1, "mirando": "s1", "guion": [], "exige": {"momento": "reuniendo", "ofrece": ["burgo:empezar"]}},
  {"id": "mi-turno", "rotulo": "Mi turno, con solar debajo", "porque": "Me toca y la casilla de debajo se compra: la casilla se enciende en el anillo y la obra NO se repite como botón suelto. Es la partición de los cuatro cajones, vista.", "asientos": ["s1", "s2", "s3", "s4"], "semilla": 1, "mirando": "s1", "guion": [{"quien": "s1", "tipo": "burgo:empezar", "carga": {"topeDeVueltas": 0}}, {"quien": "s3", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s3", "tipo": "burgo:comprar", "carga": {"casilla": 3}}, {"quien": "s3", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s4", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s4", "tipo": "burgo:a-almoneda", "carga": {"casilla": 5}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 10}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 20}}, {"quien": "s3", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 30}}, {"quien": "s4", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 40}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 50}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 60}}, {"quien": "s3", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 70}}, {"quien": "s4", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 80}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 90}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 100}}, {"quien": "s3", "tipo": "burgo:pasar-puja", "carga": {"casilla": 5}}, {"quien": "s4", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 110}}, {"quien": "s1", "tipo": "burgo:pasar-puja", "carga": {"casilla": 5}}, {"quien": "s2", "tipo": "burgo:pasar-puja", "carga": {"casilla": 5}}, {"quien": "s4", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}], "exige": {"momento": "jugando", "ofrece": ["burgo:comprar"]}},
  {"id": "subasta", "rotulo": "La subasta, y me toca pujar", "porque": "La almoneda abierta con la puja libre por su puerta: el escalón, el mínimo y el tope los dice el juego, y aquí se mira que quepan en la pantalla más estrecha.", "asientos": ["s1", "s2", "s3", "s4"], "semilla": 1, "mirando": "s1", "guion": [{"quien": "s1", "tipo": "burgo:empezar", "carga": {"topeDeVueltas": 0}}, {"quien": "s3", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s3", "tipo": "burgo:a-almoneda", "carga": {"casilla": 3}}, {"quien": "s4", "tipo": "burgo:pujar", "carga": {"casilla": 3, "cuanto": 10}}], "exige": {"momento": "jugando", "paso": "almoneda"}},
  {"id": "trato", "rotulo": "Un trato dirigido a mí", "porque": "Alguien me propone un trato mientras juega otro: se lee sin abrir nada y el tablero sigue girando por debajo. Es la caja que NO es modal.", "asientos": ["s1", "s2", "s3"], "semilla": 1, "mirando": "s1", "guion": [{"quien": "s1", "tipo": "burgo:empezar", "carga": {"topeDeVueltas": 0}}, {"quien": "s3", "tipo": "burgo:proponer", "carga": {"a": "s1", "doy": {"mrs": 100, "titulos": [], "indultos": 0}, "pido": {"mrs": 0, "titulos": [], "indultos": 0}}}], "exige": {"momento": "jugando", "ofrece": ["burgo:aceptar", "burgo:rechazar"]}},
  {"id": "apuro", "rotulo": "El apuro, con la cuenta atrás", "porque": "Debo más de lo que tengo y el reloj de la cinta corre: hay que poder hipotecar, vender o rendirse sin salir de esta pantalla, y en 288×317 también.", "asientos": ["s1", "s2"], "semilla": 26, "mirando": "s1", "guion": [{"quien": "s1", "tipo": "burgo:empezar", "carga": {"topeDeVueltas": 0}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:comprar", "carga": {"casilla": 5}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:empenar", "carga": {"casilla": 5}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:desempenar", "carga": {"casilla": 5}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:comprar", "carga": {"casilla": 18}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:comprar", "carga": {"casilla": 26}}, {"quien": "s1", "tipo": "burgo:empenar", "carga": {"casilla": 5}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:comprar", "carga": {"casilla": 28}}, {"quien": "s2", "tipo": "burgo:empenar", "carga": {"casilla": 26}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:comprar", "carga": {"casilla": 34}}, {"quien": "s2", "tipo": "burgo:desempenar", "carga": {"casilla": 26}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:desempenar", "carga": {"casilla": 5}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:pagar-impuesto", "carga": {"como": "fijo"}}, {"quien": "s2", "tipo": "burgo:empenar", "carga": {"casilla": 26}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:comprar", "carga": {"casilla": 39}}, {"quien": "s1", "tipo": "burgo:empenar", "carga": {"casilla": 5}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:desempenar", "carga": {"casilla": 26}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:pagar-impuesto", "carga": {"como": "fijo"}}, {"quien": "s1", "tipo": "burgo:desempenar", "carga": {"casilla": 5}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:comprar", "carga": {"casilla": 16}}, {"quien": "s2", "tipo": "burgo:empenar", "carga": {"casilla": 26}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:comprar", "carga": {"casilla": 11}}, {"quien": "s1", "tipo": "burgo:empenar", "carga": {"casilla": 5}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:comprar", "carga": {"casilla": 21}}, {"quien": "s2", "tipo": "burgo:empenar", "carga": {"casilla": 11}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:desempenar", "carga": {"casilla": 5}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:empenar", "carga": {"casilla": 5}}, {"quien": "s1", "tipo": "burgo:comprar", "carga": {"casilla": 29}}, {"quien": "s2", "tipo": "burgo:desempenar", "carga": {"casilla": 11}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:comprar", "carga": {"casilla": 24}}, {"quien": "s1", "tipo": "burgo:empenar", "carga": {"casilla": 16}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:desempenar", "carga": {"casilla": 5}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}], "exige": {"momento": "jugando", "paso": "apuro"}},
  {"id": "quiebra", "rotulo": "Una quiebra, con la partida en marcha", "porque": "Alguien ha quebrado y los demás siguen: su fila se queda en el marcador, en tenue y tachada, porque una fila que desaparece se lee como un fallo del sondeo.", "asientos": ["s1", "s2", "s3"], "semilla": 1, "mirando": "s1", "guion": [{"quien": "s1", "tipo": "burgo:empezar", "carga": {"topeDeVueltas": 0}}, {"quien": "s3", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s3", "tipo": "burgo:comprar", "carga": {"casilla": 5}}, {"quien": "s3", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:a-almoneda", "carga": {"casilla": 3}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 3, "cuanto": 10}}, {"quien": "s3", "tipo": "burgo:pujar", "carga": {"casilla": 3, "cuanto": 20}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 3, "cuanto": 30}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 3, "cuanto": 40}}, {"quien": "s3", "tipo": "burgo:pujar", "carga": {"casilla": 3, "cuanto": 50}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 3, "cuanto": 60}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 3, "cuanto": 70}}, {"quien": "s3", "tipo": "burgo:pujar", "carga": {"casilla": 3, "cuanto": 80}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 3, "cuanto": 90}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 3, "cuanto": 100}}, {"quien": "s3", "tipo": "burgo:pasar-puja", "carga": {"casilla": 3}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 3, "cuanto": 110}}, {"quien": "s2", "tipo": "burgo:pasar-puja", "carga": {"casilla": 3}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s3", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s3", "tipo": "burgo:a-almoneda", "carga": {"casilla": 11}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 11, "cuanto": 10}}, {"quien": "s2", "tipo": "burgo:pasar-puja", "carga": {"casilla": 11}}, {"quien": "s3", "tipo": "burgo:pujar", "carga": {"casilla": 11, "cuanto": 20}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 11, "cuanto": 30}}, {"quien": "s3", "tipo": "burgo:pujar", "carga": {"casilla": 11, "cuanto": 40}}, {"quien": "s1", "tipo": "burgo:pasar-puja", "carga": {"casilla": 11}}, {"quien": "s3", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:a-almoneda", "carga": {"casilla": 8}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 8, "cuanto": 10}}, {"quien": "s3", "tipo": "burgo:pujar", "carga": {"casilla": 8, "cuanto": 20}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 8, "cuanto": 30}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 8, "cuanto": 40}}, {"quien": "s3", "tipo": "burgo:pasar-puja", "carga": {"casilla": 8}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 8, "cuanto": 50}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 8, "cuanto": 60}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 8, "cuanto": 70}}, {"quien": "s2", "tipo": "burgo:pasar-puja", "carga": {"casilla": 8}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s3", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s3", "tipo": "burgo:comprar", "carga": {"casilla": 21}}, {"quien": "s3", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:comprar", "carga": {"casilla": 16}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s3", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s3", "tipo": "burgo:comprar", "carga": {"casilla": 28}}, {"quien": "s3", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:comprar", "carga": {"casilla": 39}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s3", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s3", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:comprar", "carga": {"casilla": 9}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:pagar-fianza", "carga": {}}, {"quien": "s3", "tipo": "burgo:rendirse", "carga": {}}], "exige": {"momento": "jugando", "hayQuebrado": true}},
  {"id": "fin", "rotulo": "El fin de la partida", "porque": "Terminada: sin dados, sin casillas que se toquen y sin botones. Lo único que queda es leer quién se quedó con el burgo y volver a la Sala.", "asientos": ["s1", "s2"], "semilla": 1, "mirando": "s1", "guion": [{"quien": "s1", "tipo": "burgo:empezar", "carga": {"topeDeVueltas": 0}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:comprar", "carga": {"casilla": 11}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:a-almoneda", "carga": {"casilla": 5}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 10}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 20}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 30}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 40}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 50}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 60}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 70}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 80}}, {"quien": "s2", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 90}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 5, "cuanto": 100}}, {"quien": "s2", "tipo": "burgo:pasar-puja", "carga": {"casilla": 5}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:comprar", "carga": {"casilla": 14}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:comprar", "carga": {"casilla": 15}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:a-almoneda", "carga": {"casilla": 23}}, {"quien": "s1", "tipo": "burgo:pujar", "carga": {"casilla": 23, "cuanto": 10}}, {"quien": "s2", "tipo": "burgo:pasar-puja", "carga": {"casilla": 23}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:comprar", "carga": {"casilla": 25}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:comprar", "carga": {"casilla": 31}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s1", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s1", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:tirar", "carga": {}}, {"quien": "s2", "tipo": "burgo:pasar", "carga": {}}, {"quien": "s2", "tipo": "burgo:rendirse", "carga": {}}], "exige": {"momento": "terminada"}}
];

// ---------------------------------------------------------------------------
// Rebobinar, y decir si no se llegó
// ---------------------------------------------------------------------------

/** El estado del juego al que llega un guion, y por dónde se quedó si se quedó. */
export interface LoRebobinado {
  estado: EstadoDelBurgo;
  /** El paso en el que el reductor dejó de aceptar, o `null` si entró entero. */
  seAtascoEn: number | null;
}

/**
 * REBOBINAR EL GUION CONTRA EL REDUCTOR DE HOY.
 *
 * El contexto es el mismo en cada paso —la semilla del momento, `tic: 0` y los asientos—,
 * porque es lo que hace el árbitro: la semilla siembra el azar la primera vez y a partir de
 * ahí el azar viaja DENTRO del estado. Cambiarla a mitad de guion daría otra partida con los
 * mismos movimientos, que es la manera más silenciosa de que un banco enseñe otra cosa.
 *
 * Un movimiento que el reductor devuelve POR IDENTIDAD es un movimiento que ya no está
 * ofrecido: se anota el paso y se para. Seguir empujando los que quedan sobre un estado que se
 * quedó atrás compone una partida que no existió nunca.
 */
export function rebobinar(m: MomentoDelBanco): LoRebobinado {
  let estado: EstadoDelBurgo = partidaNueva();
  for (let i = 0; i < m.guion.length; i++) {
    const paso = m.guion[i];
    if (paso === undefined) continue;
    const antes = estado;
    estado = avanzarElBurgo(estado, { tipo: paso.tipo, carga: paso.carga }, {
      quien: paso.quien,
      azar: m.semilla,
      tic: 0,
      asientos: m.asientos,
    }) as EstadoDelBurgo;
    if (estado === antes) return { estado: antes, seAtascoEn: i };
  }
  return { estado, seAtascoEn: null };
}

/**
 * QUÉ LE FALTA A ESTE MOMENTO PARA SER EL QUE DICE SER. Lista vacía = está donde prometía.
 *
 * Se le pasan el estado rebobinado y las opciones de quien mira, y devuelve reproches en
 * castellano. La corren los dos: el banco, para escribirlos encima de la pantalla, y
 * `verify:escritorio`, para ponerse rojo. Una sola función, porque dos lecturas del mismo
 * contrato son dos contratos.
 */
export function loQueFaltaEnElMomento(
  m: MomentoDelBanco,
  rebobinado: LoRebobinado,
  opciones: readonly Opcion[],
): readonly string[] {
  const falta: string[] = [];
  if (rebobinado.seAtascoEn !== null) {
    const paso = m.guion[rebobinado.seAtascoEn];
    falta.push(
      `el guion se atascó en el movimiento ${String(rebobinado.seAtascoEn + 1)} de ${String(m.guion.length)}` +
        ` (${paso?.tipo ?? '?'} de ${paso?.quien ?? '?'}): el reductor ya no lo ofrece ahí`,
    );
  }
  const e = rebobinado.estado;
  if (m.exige.momento !== undefined && e.momento !== m.exige.momento) {
    falta.push(`la partida tenía que estar «${m.exige.momento}» y está «${e.momento}»`);
  }
  if (m.exige.paso !== undefined && e.paso !== m.exige.paso) {
    falta.push(`el turno tenía que estar en «${m.exige.paso}» y está en «${e.paso}»`);
  }
  if (m.exige.hayQuebrado === true && !e.jugadores.some((j) => j.quebrado)) {
    falta.push('tenía que haber alguien quebrado y no hay nadie');
  }
  for (const tipo of m.exige.ofrece ?? []) {
    if (!opciones.some((o) => o.tipo === tipo && o.declaracion !== true)) {
      falta.push(`a ${m.mirando} tenían que ofrecerle «${tipo}» y no se lo ofrecen`);
    }
  }
  return falta;
}

// ---------------------------------------------------------------------------
// Lo que el banco tiene abierto, que vive en la dirección
// ---------------------------------------------------------------------------

/**
 * EL ESTADO DEL BANCO VA EN LA DIRECCIÓN, y no es un capricho: lo que se mira en un banco se
 * enseña. «Mira cómo queda la subasta desde el asiento de Bea en un móvil apaisado» es un
 * enlace y no un párrafo de instrucciones, y al recargar sale lo mismo.
 */
interface LoAbierto {
  momento: string;
  asiento: string;
  lienzo: string;
  mundo: boolean;
}

function loQueDiceLaDireccion(momentos: readonly MomentoDelBanco[]): LoAbierto {
  const p = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);
  const primero = momentos[0];
  const pedido = p.get('momento');
  const elMomento = momentos.find((m) => m.id === pedido) ?? primero;
  const lienzo = p.get('lienzo');
  return {
    momento: elMomento?.id ?? '',
    asiento: p.get('asiento') ?? elMomento?.mirando ?? 's1',
    lienzo: LIENZOS_DEL_BANCO.some(([n]) => n === lienzo) ? (lienzo as string) : 'apaisado monitor 1080',
    mundo: p.get('mundo') !== '0',
  };
}

/** Reescribe la dirección sin recargar. El mundo NO pasa por aquí: ver `ponerseEnMedio`. */
function apuntarEnLaDireccion(lo: LoAbierto): void {
  if (typeof history === 'undefined') return;
  const p = new URLSearchParams();
  p.set('momento', lo.momento);
  p.set('asiento', lo.asiento);
  p.set('lienzo', lo.lienzo);
  if (!lo.mundo) p.set('mundo', '0');
  history.replaceState(null, '', `?${p.toString()}`);
}

// ---------------------------------------------------------------------------
// La mesa de mentira: de mentira SÓLO en lo que no es del juego
// ---------------------------------------------------------------------------

/** El manifiesto que el pintor necesita, con el del juego de verdad dentro. */
const EL_MANIFIESTO: ArcadeDelCatalogo = { ...MANIFIESTO_BURGO, publicaOpciones: true };

// ---------------------------------------------------------------------------
// El banco
// ---------------------------------------------------------------------------

/** Cuánto plazo se le finge a la mesa, para que la cinta tenga reloj que pintar y cuenta atrás. */
const PLAZO_DEL_BANCO = 90_000;

export function Banco(): JSX.Element {
  const [abierto, ponerAbierto] = useState<LoAbierto>(() => loQueDiceLaDireccion(MOMENTOS));
  /** Los movimientos que se han jugado ENCIMA del momento, aquí en el banco. */
  const [jugadosAqui, ponerJugadosAqui] = useState<readonly PasoDelGuion[]>([]);
  const [recuadro, ponerRecuadro] = useState<{ ancho: number; alto: number } | null>(null);
  /** Lo que la ventana de mentira mide DE VERDAD, que no siempre es lo que se le pidió. */
  const [dada, ponerDada] = useState<{ ancho: number; alto: number } | null>(null);

  const elMomento = useMemo(
    () => MOMENTOS.find((m) => m.id === abierto.momento) ?? MOMENTOS[0],
    [abierto.momento],
  );

  useEffect(() => {
    apuntarEnLaDireccion(abierto);
  }, [abierto]);

  /*
   * REBOBINAR EL GUION MÁS LO JUGADO AQUÍ. Se rehace entero en cada jugada y no se guarda el
   * estado: son ciento y pico llamadas a una función pura, o sea nada, y a cambio no hay dos
   * sitios donde viva el estado de la partida. Un estado guardado y un guion son dos fuentes,
   * y la que se queda rancia es siempre la que no se mira.
   */
  const partida = useMemo(() => {
    if (elMomento === undefined) return null;
    const conLoJugado: MomentoDelBanco = { ...elMomento, guion: [...elMomento.guion, ...jugadosAqui] };
    const rebobinado = rebobinar(conLoJugado);
    const sentados = sentadosDe(elMomento.asientos);
    const vista = proyectarElBurgo(rebobinado.estado, abierto.asiento, sentados);
    const opciones = opcionesDelBurgo(vista, abierto.asiento);
    /* Los reproches se miden contra el momento TAL COMO SE CONGELÓ, no contra lo jugado encima. */
    const deSalida = rebobinar(elMomento);
    const vistaDeSalida = proyectarElBurgo(deSalida.estado, elMomento.mirando, sentados);
    const falta = loQueFaltaEnElMomento(elMomento, deSalida, opcionesDelBurgo(vistaDeSalida, elMomento.mirando));
    return { rebobinado, sentados, vista, opciones, falta };
  }, [elMomento, jugadosAqui, abierto.asiento]);

  const mover = useCallback(
    (movimiento: { tipo: string; carga?: unknown }): Promise<ResultadoDelMovimiento> => {
      ponerJugadosAqui((antes) => [
        ...antes,
        { quien: abierto.asiento, tipo: movimiento.tipo, carga: movimiento.carga ?? null },
      ]);
      return Promise.resolve<ResultadoDelMovimiento>('hecho');
    },
    [abierto.asiento],
  );

  /*
   * ═══ LAS DOS MEDIDAS SE MIDEN, NO SE SUPONEN, Y LA SEGUNDA ES LA QUE CAZA AL BANCO ═══
   *
   * LA DEL RECUADRO, porque la medida de la lista es la de la VENTANA y lo que el pintor deja
   * para el mundo es bastante menos: cuánto menos es justamente lo que aquí se puede leer sin
   * abrir las herramientas del navegador. Se busca por la clase GENÉRICA (`lienzo-propio`) y no
   * por la del Burgo, para que valga con el tercer pintor. Y `null` cuando no hay ninguno, que
   * es lo que pasa cuando la mesa cae al retablo: eso también hay que poder leerlo.
   *
   * Y LA DE LA VENTANA MISMA, que parece redundante y no lo es: es la que compra que el banco
   * no esté mintiendo con su propio rótulo. Con `resize: both` cualquiera la estira a mano, y
   * antes de quitarle el `max-width: 100%` a la caja el banco pedía 844 y pintaba 667 con el
   * rótulo de 844 al lado. Si las dos no coinciden se dice; un banco que enseña una medida y
   * pinta otra invalida todo lo que se juzgue encima. Y este aviso ya se ha ganado el sueldo
   * dos veces el mismo día: la segunda cazó los dos puntos que el `border: 1px` de la caja le
   * comía por dentro —844 pedidos, 842 dados—, que es lo que mandó el filo a `outline`.
   */
  const laVentana = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const caja = laVentana.current;
    if (caja === null || typeof ResizeObserver === 'undefined') return undefined;
    const mide = (): void => {
      const dentro = caja.querySelector<HTMLElement>('.lienzo-propio');
      ponerDada({ ancho: Math.round(caja.clientWidth), alto: Math.round(caja.clientHeight) });
      ponerRecuadro(
        dentro === null ? null : { ancho: Math.round(dentro.clientWidth), alto: Math.round(dentro.clientHeight) },
      );
    };
    mide();
    const vigia = new ResizeObserver(mide);
    vigia.observe(caja);
    /* Y también cuando el pintor cambia de forma: el retablo no tiene recuadro y el lienzo sí. */
    const cambios = new MutationObserver(mide);
    cambios.observe(caja, { childList: true, subtree: true });
    return () => {
      vigia.disconnect();
      cambios.disconnect();
    };
  }, [abierto.lienzo, abierto.momento, abierto.asiento]);

  if (elMomento === undefined || partida === null) {
    return <p className="banco-falta">Este banco se ha quedado sin momentos que enseñar.</p>;
  }

  const medida = LIENZOS_DEL_BANCO.find(([n]) => n === abierto.lienzo) ?? LIENZOS_DEL_BANCO[0];
  const [, ancho, alto] = medida ?? ['', 1920, 1080];
  /*
   * ¿MIDE LA VENTANA LO QUE SU RÓTULO DICE? Con un punto de holgura, que es lo que se lleva el
   * redondeo del filo; más que eso es que la caja se ha estirado a mano o la ha recortado
   * alguien, y entonces la medida del rótulo ya no es la de lo que se está mirando. Mientras
   * no se ha medido nada (`null`, el primer render) se calla: un aviso que sale medio segundo
   * en cada cambio de medida es un aviso que se aprende a no leer.
   */
  const laDelRotulo =
    dada === null || (Math.abs(dada.ancho - ancho) <= 1 && Math.abs(dada.alto - alto) <= 1);
  const tablero = tableroDeLaVista(partida.vista);

  const puesta: MesaVista = {
    codigo: 'BANCO',
    arcade: BURGO,
    /* La revisión sube con cada jugada del banco: el pintor suelta lo que tenga abierto al verla cambiar. */
    rev: elMomento.guion.length + jugadosAqui.length,
    tic: 0,
    terminada: partida.rebobinado.estado.momento === 'terminada',
    venceEn: Date.now() + PLAZO_DEL_BANCO,
    turnoDesde: Date.now() - 10_000,
    asientos: partida.sentados.map((s) => ({ id: s.asiento, nombre: s.nombre, presente: true })),
    yo: abierto.asiento,
    empezada: partida.rebobinado.estado.momento !== 'reuniendo',
    vista: partida.vista,
    opciones: partida.opciones,
  };
  const nada = (): void => undefined;
  const mesa: LaMesa = {
    fase: 'dentro',
    mesa: puesta,
    aviso: '',
    cronica: [],
    quieto: false,
    abrir: nada,
    entrar: nada,
    mover,
    vestir: nada,
    salir: nada,
    tirar: nada,
  };

  return (
    <div className="banco-hoja">
      <div className="banco-mandos">
        <div className="banco-grupo" role="group" aria-label="El momento que se mira">
          {MOMENTOS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={m.id === elMomento.id ? 'banco-mando banco-mando-puesto' : 'banco-mando'}
              aria-pressed={m.id === elMomento.id}
              title={m.porque}
              onClick={() => {
                ponerJugadosAqui([]);
                ponerAbierto((a) => ({ ...a, momento: m.id, asiento: m.mirando }));
              }}
            >
              {m.rotulo}
            </button>
          ))}
        </div>

        <div className="banco-grupo" role="group" aria-label="El asiento desde el que se mira">
          {partida.sentados.map((s) => (
            <button
              key={s.asiento}
              type="button"
              className={s.asiento === abierto.asiento ? 'banco-mando banco-mando-puesto' : 'banco-mando'}
              aria-pressed={s.asiento === abierto.asiento}
              onClick={() => {
                ponerAbierto((a) => ({ ...a, asiento: s.asiento }));
              }}
            >
              {s.nombre}
            </button>
          ))}
        </div>

        <div className="banco-grupo">
          {/*
            EL TAMAÑO VA EN UN `<select>` y no en dieciocho botones: dieciocho blancos de toque
            en la barra del banco le comen la pantalla a lo que se viene a mirar. Con nombre
            propio porque un `<select>` sin `<label>` se anuncia «lista» a secas.
          */}
          <label className="banco-rotulo" htmlFor="banco-lienzo">
            Ventana
          </label>
          <select
            id="banco-lienzo"
            className="banco-lista"
            value={abierto.lienzo}
            onChange={(e) => {
              const v = e.target.value;
              ponerAbierto((a) => ({ ...a, lienzo: v }));
            }}
          >
            {LIENZOS_DEL_BANCO.map(([nombre, a, al]) => (
              <option key={nombre} value={nombre}>
                {`${nombre} · ${String(a)}×${String(al)}`}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="banco-mando"
            title="Con y sin el mundo en tres dimensiones. Recarga la página: la promesa del modelo se recuerda por pestaña."
            onClick={() => {
              const p = new URLSearchParams(location.search);
              if (abierto.mundo) p.set('mundo', '0');
              else p.delete('mundo');
              location.search = p.toString();
            }}
          >
            {abierto.mundo ? 'Quitar el mundo' : 'Poner el mundo'}
          </button>
          <button
            type="button"
            className="banco-mando"
            onClick={() => {
              ponerJugadosAqui([]);
            }}
          >
            Volver al momento
          </button>
        </div>
      </div>

      <p className="banco-renglon">
        <span className="banco-porque">{elMomento.porque}</span>
        <span className="banco-cifras">
          {`ventana ${String(ancho)}×${String(alto)}`}
          {recuadro === null
            ? ' · sin recuadro (se juega sobre el tablero dibujado)'
            : ` · recuadro ${String(recuadro.ancho)}×${String(recuadro.alto)}`}
          {jugadosAqui.length === 0
            ? ''
            : ` · ${String(jugadosAqui.length)} movimiento${jugadosAqui.length === 1 ? '' : 's'} jugados aquí`}
        </span>
      </p>

      {/*
        LO QUE FALTA, SI FALTA, Y EN ROJO. Un banco que enseña un momento con el rótulo de otro
        no falla: miente. Ver la cabecera. Y la ventana que no mide lo que dice medir entra por
        la misma puerta: es la misma mentira, un piso más abajo.
      */}
      {partida.falta.length === 0 && laDelRotulo ? null : (
        <ul className="banco-falta">
          {laDelRotulo ? null : (
            <li>
              {`la ventana dice ${String(ancho)}×${String(alto)} y mide ${String(dada?.ancho ?? 0)}×${String(dada?.alto ?? 0)}:` +
                ' lo que se juzgue encima no es de esta medida'}
            </li>
          )}
          {partida.falta.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      {/*
        LA VENTANA DE MENTIRA, con la Sala de verdad dentro: la misma cadena de eslabones que
        reparte el alto en la pantalla completa (`.sala:has(.lienzo-propio)`), para que lo que
        se juzga aquí sea lo que se ve allí y no una maqueta parecida. La ÚNICA línea de esa
        cadena que no se puede honrar dentro de una caja es el `height: 100dvh` de `.sala`,
        que mide la ventana de verdad; lo sustituye `.banco-ventana .sala { height: 100% }`,
        y está escrito en la hoja al lado de este banco para que se lea junto a lo que corrige.
      */}
      <div className="banco-ventana" style={{ width: `${String(ancho)}px`, height: `${String(alto)}px` }} ref={laVentana}>
        <div className="sala">
          <main className="mesa-puesta dentro">
            <div className="tablero-y-panel">
              <section className="el-mueble">
                <h1 className="titulo">{EL_MANIFIESTO.nombre}</h1>
                {tablero === null ? (
                  <p className="banco-falta">Esta vista no trae tablero declarado: no hay nada que pintar.</p>
                ) : (
                  <BurgoEnTres
                    manifiesto={EL_MANIFIESTO}
                    mesa={mesa}
                    puesta={puesta}
                    tablero={tablero}
                    opciones={partida.opciones}
                  />
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/*
 * SE MONTA SÓLO SI HAY DOCUMENTO. Este módulo lo importa también `verify:escritorio` desde
 * Node —para leer las dieciocho medidas y rebobinar los guiones—, y un `createRoot` al ras del
 * módulo reventaría allí. Y la raíz se guarda en el propio nodo, como en los otros dos bancos:
 * con `createRoot` a pelo, cada reejecución en caliente crea OTRA raíz sobre el mismo `div` y
 * React avisa por consola de algo que no es el fallo que se está buscando.
 */
type ConRaiz = HTMLElement & { __raizDeReact?: ReturnType<typeof createRoot> };

if (typeof document !== 'undefined') {
  ponerseEnMedio(hayQueDarElMundo());
  const donde = document.getElementById('raiz') as ConRaiz | null;
  if (donde !== null) {
    donde.__raizDeReact ??= createRoot(donde);
    donde.__raizDeReact.render(<Banco />);
  }
}
