/**
 * HABLAR CON EL MARCADOR: pedir semilla al empezar y subir la partida al acabar.
 *
 * ═══ POR QUÉ ESTO NO ESTÁ EN `src/api.ts` ═══
 *
 * `api.ts` es el cliente de las VELADAS: guarda un testigo de jugador, un
 * pasaporte de cuenta y una partida activa, y los manda en cada petición. Las
 * rutas del arcade van DELANTE de `requireAuth` justamente porque no hay nada de
 * eso —cuatro personas abren una mesa y juegan, sin taller y sin correo— y meter
 * estas dos llamadas allí las ataría a un módulo que sabe de cuentas.
 *
 * Lo único que se le pide prestado es la DIRECCIÓN del servidor, que es una
 * decisión de la app entera y no de este fichero.
 *
 * ═══ Y POR QUÉ UN ARCADE QUE NO NECESITA RED HABLA CON EL SERVIDOR ═══
 *
 * Porque son dos cosas distintas: JUGAR no necesita red y PUBLICAR UNA CIFRA sí.
 * El reductor corre entero en el aparato; la red solo entra para que el récord
 * signifique algo.
 *
 * De ahí la regla que ordena este fichero: NADA DE LO QUE HAY AQUÍ PUEDE IMPEDIR
 * JUGAR. Si el servidor no contesta —el metro, un avión, un despliegue— la
 * partida empieza igual con una semilla de la casa y la pantalla lo dice: se juega
 * y no cuenta para la tabla. Lo contrario sería un juego de un solo dispositivo
 * que se cae sin cobertura, que es exactamente lo que La Frente demostró que no
 * hacía falta.
 */
import { urlDelServidor } from '../api';

/** Cuánto se espera a cada una de las dos llamadas. */
const PLAZO_MS = 8000;

/** Lo que el servidor contesta al anunciar el inicio. */
export interface PartidaAnunciada {
  partida: string;
  arcade: string;
  semilla: number;
  caduca: number;
}

/** Cómo acabó el intento de publicar la cifra. */
export type ComoFue =
  | { publicada: true; cifra: number; puesto: number | null }
  | { publicada: false; porque: string };

/** Lo que se manda al acabar. La forma la fija `server/src/arcade/repeticiones.ts`. */
export interface RepeticionParaSubir {
  arcade: string;
  partida: string;
  tics: number;
  entradas: ReadonlyArray<{ tic: number; tipo: string; carga?: unknown }>;
  cifra: number;
}

/**
 * Cuánto texto de un error ajeno se enseña. El resto sobra y estorba.
 *
 * Un mensaje del servidor cabe de sobra; una página de mantenimiento entera, no.
 * Sin este recorte, el motivo del rechazo que se pinta en la pantalla de fin de
 * partida podía ser un documento HTML de varios kilobytes encima del lienzo.
 */
const LARGO_MAXIMO_DEL_MOTIVO = 300;

/**
 * Una petición al arcade del servidor, con plazo y sin credenciales.
 *
 * `AbortSignal.timeout` no está garantizado en React Native —`api.ts` ya lo
 * documenta y monta el suyo—, así que aquí se hace igual: un controlador y un
 * temporizador. Copiar cuatro líneas es mejor que exportar el ayudante privado de
 * un módulo que sabe de cuentas.
 *
 * ═══ UN 200 CON UN CUERPO QUE NO ES JSON ES UN FALLO, Y AQUÍ SE TRATA COMO TAL ═══
 *
 * Esta función devolvía lo que hubiera: si el cuerpo no era JSON lo envolvía en
 * `{ error: texto }` y, como `res.ok` era cierto, lo devolvía con un `as T` sin
 * mirar una sola propiedad. Y eso no es un caso de laboratorio: reproducido dos
 * veces contra el servidor de desarrollo de Metro, un `POST /api/arcade/partidas`
 * contesta **200 con el `index.html`** porque el comodín se lo come. También lo
 * hace un proxy con una página de mantenimiento, o un despliegue a medias.
 *
 * Lo que pasaba entonces era lo contrario de la verdad: `anunciarQueEmpiezo`
 * devolvía algo no nulo con la semilla sin definir, la pantalla NO enseñaba el
 * aviso de «sin conexión» aunque no hubiera servidor, quien jugaba creía que su
 * récord contaba, y al morir se subía una repetición con `partida: undefined` y se
 * pintaba el documento HTML entero encima del lienzo.
 *
 * Este árbol acaba de aprender esto mismo por otro sitio —hay un commit reciente
 * titulado «Un 200 con otro cuerpo no es un fallo, y por eso nadie lo veía»— y la
 * fase 3 lo reintrodujo. El sitio exacto era el `as T`: la forma se comprueba
 * ahora, y quien llama dice cuál espera.
 */
async function pedir<T>(ruta: string, cuerpo: unknown, esLoQueEspero: (x: unknown) => x is T): Promise<T> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), PLAZO_MS);
  try {
    const res = await fetch(`${urlDelServidor()}/api${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: controlador.signal,
    });
    const texto = await res.text();
    let leido: unknown;
    let esJson = true;
    try {
      leido = texto ? (JSON.parse(texto) as unknown) : {};
    } catch {
      esJson = false;
      leido = null;
    }
    if (!res.ok) {
      const mensaje =
        esJson && typeof leido === 'object' && leido !== null && 'error' in leido
          ? String((leido as { error: unknown }).error)
          : `Error ${res.status}`;
      throw new Error(mensaje.slice(0, LARGO_MAXIMO_DEL_MOTIVO));
    }
    /*
     * Un cuerpo que no es JSON no se envuelve ni se enseña: se dice que el
     * servidor contestó otra cosa. Enseñar el cuerpo sería volver a pintar el
     * HTML, y el texto de un error tiene que hablar del error y no ser el error.
     */
    if (!esJson) {
      throw new Error(
        `El servidor ha contestado ${res.status} con algo que no es JSON. No es el arcade quien ` +
          'contesta: puede ser un proxy, una página de mantenimiento o un despliegue a medias.',
      );
    }
    if (!esLoQueEspero(leido)) {
      throw new Error(
        `El servidor ha contestado ${res.status} con un JSON que no tiene la forma que esta ruta ` +
          'promete. Se trata como un fallo y no como una respuesta.',
      );
    }
    return leido;
  } finally {
    clearTimeout(temporizador);
  }
}

/** ¿Es un objeto con propiedades que mirar? El primer filtro de las dos formas. */
function esObjeto(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

/**
 * ¿Tiene esto forma de partida anunciada?
 *
 * Se exige lo que de verdad hace falta para jugar y para subir: la semilla, que
 * siembra el reductor, y el identificador de la partida, que es contra lo que se
 * sube. Sin comprobar la semilla, un cuerpo raro dejaba `semilla: undefined`
 * viajando hasta `sembrar()`.
 */
function esPartidaAnunciada(x: unknown): x is PartidaAnunciada {
  if (!esObjeto(x)) return false;
  return (
    typeof x.partida === 'string' &&
    x.partida.length > 0 &&
    typeof x.arcade === 'string' &&
    typeof x.semilla === 'number' &&
    Number.isFinite(x.semilla) &&
    typeof x.caduca === 'number'
  );
}

/** Lo que contesta la ruta de récords. `aceptado` es lo único obligatorio. */
interface RespuestaDeRecords {
  aceptado: boolean;
  record?: { cifra: number };
  error?: string;
}

function esRespuestaDeRecords(x: unknown): x is RespuestaDeRecords {
  if (!esObjeto(x)) return false;
  if (typeof x.aceptado !== 'boolean') return false;
  if (x.aceptado) {
    /* Si dice que sí, tiene que traer la cifra: es lo único que se enseña. */
    return esObjeto(x.record) && typeof x.record.cifra === 'number';
  }
  return x.error === undefined || typeof x.error === 'string';
}

/**
 * PIDE UNA PARTIDA. Devuelve `null` si el servidor no está.
 *
 * `null` y no una excepción porque no es un error: es el caso normal de un juego
 * que se puede jugar sin red. Quien llama lo enseña —«sin conexión: esta partida
 * no cuenta»— y sigue adelante. Lanzar obligaría a rodear la llamada de un `try`
 * en el sitio donde se decide si hay juego o no, que es donde peor sienta.
 */
export async function anunciarQueEmpiezo(arcade: string): Promise<PartidaAnunciada | null> {
  try {
    return await pedir('/arcade/partidas', { arcade }, esPartidaAnunciada);
  } catch {
    /*
     * Y aquí caen también los doscientos con otro cuerpo. Que un proxy conteste
     * una página no es «hay servidor»: es que no lo hay para esto, y la pantalla
     * tiene que decir lo mismo que diría en el metro. Ver la cabecera de `pedir`.
     */
    return null;
  }
}

/**
 * SUBE LA PARTIDA ENTERA. No una cifra: la partida.
 *
 * ═══ LO QUE VIAJA Y LO QUE NO ═══
 *
 * Viaja la lista de lo que hizo el dedo y cuántos tics duró. NO viaja la semilla
 * —la tiene el servidor, que la repartió— ni los tics uno a uno, que se deducen.
 * Y la cifra viaja, pero como una DECLARACIÓN que se contrasta, no como el dato:
 * si no coincide con la que sale al reejecutar, el récord se cae.
 *
 * Si el servidor dice que no, se devuelve por qué y se enseña. Un récord
 * rechazado en silencio es peor que uno rechazado a la cara: quien juega ve una
 * tabla donde no está y no sabe si es que juega mal o que la app está rota.
 */
export async function subirLaPartida(repeticion: RepeticionParaSubir): Promise<ComoFue> {
  try {
    const r = await pedir('/arcade/records', repeticion, esRespuestaDeRecords);
    if (r.aceptado && r.record) {
      return { publicada: true, cifra: r.record.cifra, puesto: null };
    }
    return {
      publicada: false,
      porque: (r.error ?? 'El servidor no ha aceptado la partida.').slice(0, LARGO_MAXIMO_DEL_MOTIVO),
    };
  } catch (error) {
    /*
     * El motivo va recortado. Lo que se pinta aquí acaba en la pantalla de fin de
     * partida, encima del lienzo, y un mensaje de un servidor que no es el nuestro
     * puede ser un documento entero: hubo un caso real de un `<!DOCTYPE html>…`
     * completo ahí puesto. Ver la cabecera de `pedir`.
     */
    return {
      publicada: false,
      porque:
        error instanceof Error
          ? error.message.slice(0, LARGO_MAXIMO_DEL_MOTIVO)
          : 'No se ha podido hablar con el servidor.',
    };
  }
}
