/**
 * LOS MODELOS 3D DE LA SALA DE ARCADE, SERVIDOS COMO BYTES.
 *
 * ═══ QUÉ ES ESTO Y QUÉ NO ES ═══
 *
 * Cuatro rutas que entregan ficheros `.glb` (el tablero, los dados y el
 * embarcadero de Riberas, y los aventureros del lobby) y nada más. El servidor NO
 * SABE QUÉ HAY DENTRO: no importa `three`
 * (`server/` no lo tiene), no importa nada de `escenas/`, no abre el fichero para
 * mirarlo. Sirve bytes con el tipo correcto y una caché razonable, como sirve el
 * empaquetado del escritorio en `/sala`, y por la misma razón: el arte vive en el
 * repositorio y viaja con el despliegue. Que la figura de un asiento sea una
 * cadena opaca para la mesa (ver `Silla.figura`) y que aquí no haya una lista de
 * aventureros son la misma decisión vista desde dos sitios: el núcleo del arcade
 * no nombra ningún aspecto, y este fichero tampoco.
 *
 * ═══ VA DELANTE DE `requireAuth`, JUNTO A `arcadeRouter` ═══
 *
 * Un arcade no tiene Game Master ni contraseña de la casa (ver la cabecera de
 * `routes/arcade.ts`). Un lobby que pidiera sus modelos detrás del guardián del
 * taller pintaría figuras en blanco a todo el que no supiera la contraseña del
 * estudio de misterios, que es todo el que juega. Se monta en `index.ts` al lado
 * del router del arcade, bajo `/api`, para que el cliente pida los modelos al
 * mismo origen al que pide la mesa.
 *
 * ═══ DÓNDE ESTÁ LA CARPETA, Y DESDE DÓNDE ARRANCA EL PROCESO ═══
 *
 * `escenas/modelos/`, en la raíz del repositorio. Se busca como busca
 * `carpetaDelEscritorio()` su empaquetado —dos candidatas desde `process.cwd()`
 * y una variable que manda sobre las dos—, porque el proceso no arranca siempre
 * desde el mismo sitio y adivinarlo con una sola ruta relativa deja de funcionar
 * en cuanto alguien lo arranca desde otro:
 *
 *   · EN RENDER, `startCommand: npm start` delega en `npm run start -w server`, y
 *     npm ejecuta el guion de un workspace CON EL DIRECTORIO EN `server/`. Desde
 *     ahí la carpeta es `../escenas/modelos`. `render.yaml` lo deja escrito a
 *     propósito de `MESAS_DIR`: «corre con el directorio en `server/`».
 *   · EN LA VPS, la unidad de systemd tiene `WorkingDirectory=/opt/gamemasters` y
 *     arranca `node server/dist/index.js`: desde la raíz, y la carpeta es
 *     `escenas/modelos`. La propia unidad dice que ese directorio se queda así
 *     a propósito porque de él cuelgan las búsquedas relativas a la raíz.
 *   · EN EL PORTÁTIL, `npm run dev -w server` arranca desde `server/`.
 *
 * Y VIAJA CON EL DESPLIEGUE PORQUE ESTÁ EN GIT: Render clona el repositorio en
 * cada despliegue y la VPS hace `git pull --ff-only` (`despliegue/desplegar.sh`),
 * y `escenas/modelos/tablero.glb` está versionado —no es el material bruto de
 * KayKit, que `.gitignore` deja fuera a propósito—. Lo que se genere en
 * `escenas/modelos/aventureros/` tiene que estar versionado también, o en el
 * despliegue contestará 404 mientras en el portátil contesta 200, sin que nada
 * avise en ningún registro.
 *
 * `MODELOS_DIR` manda por encima de las dos candidatas, como `ESCRITORIO_DIR`, y
 * está para lo mismo: para cuando el proceso arranca desde otro sitio —los
 * comprobadores lo levantan en una carpeta temporal— y para que el fallo, si lo
 * hay, no sea «ese fichero no existe» sin decir dónde se buscaba.
 *
 * ═══ LA LISTA BLANCA ES POR FORMA, NO POR NOMBRE ═══
 *
 * `/aventureros/:fichero` acepta sólo `^[a-z0-9-]+\.glb$`: sin más puntos, sin
 * barras, sin mayúsculas, sin `..`. Es la misma gramática que exige la mesa para
 * una figura, y no es casualidad: el cliente compone el nombre del modelo a
 * partir de la figura que eligió el asiento, y una cadena que no puede llevar una
 * barra no puede salirse de la carpeta. El servidor sigue sin saber qué
 * aventureros existen: sabe qué FORMA tiene un nombre que le está permitido
 * buscar. Y `res.sendFile` con `root` se niega además a cualquier `..` que llegara
 * por otro camino, que es la segunda cerradura de la misma puerta.
 *
 * ═══ LO QUE HACE EXPRESS POR SU CUENTA, Y SE DEJA ═══
 *
 * `res.sendFile` pone `ETag` débil, `Last-Modified` y `Accept-Ranges`, contesta
 * `304` a un `If-None-Match` que coincida, y sirve `HEAD` con las cabeceras y sin
 * cuerpo (una ruta `get` de Express atiende también `HEAD`). Con `maxAge` de una
 * hora escribe `Cache-Control: public, max-age=3600`. El tipo lo pondría también
 * —`send` conoce `.glb`— pero se escribe a mano para no depender de la tabla de
 * una dependencia: un modelo servido como `application/octet-stream` se descarga
 * en vez de cargarse, y no hay error en ningún sitio.
 *
 * ═══ Y SI NO HAY CARPETA, SE CONTESTA 404 Y SE DICE; NO SE REVIENTA ═══
 *
 * `escenas/modelos/aventureros/` puede no existir todavía, y un despliegue sin
 * `escenas/` es imaginable. Ninguno de los dos casos tumba el arranque ni
 * convierte una petición en un 500: se contesta 404 diciendo qué carpeta falta y
 * el resto del servidor sigue. Un lobby sin modelos es un lobby feo; un servidor
 * que no arranca por un `.glb` deja fuera también a las veladas, que no tienen
 * nada que ver.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Response } from 'express';
import { crearRouter } from '../rutas';

const router = crearRouter();

/**
 * Dónde están los modelos. `undefined` si no se encuentran en ningún sitio.
 *
 * Se mira que exista LA CARPETA y no un fichero concreto, al revés que el
 * escritorio con su `index.html`: aquí puede haber aventureros sin tablero o al
 * revés, y el que falte tiene que dar 404 él solo sin arrastrar al otro.
 */
export function carpetaDeLosModelos(): string | undefined {
  const puesta = process.env.MODELOS_DIR?.trim();
  const candidatas = puesta
    ? [path.resolve(puesta)]
    : [
        path.resolve(process.cwd(), '../escenas/modelos'),
        path.resolve(process.cwd(), 'escenas/modelos'),
      ];
  return candidatas.find((ruta) => {
    try {
      return fs.statSync(ruta).isDirectory();
    } catch {
      return false;
    }
  });
}

const carpeta = carpetaDeLosModelos();

/** La forma de un nombre de aventurero. Ver la cabecera: por forma, no por lista. */
const NOMBRE_DE_AVENTURERO = /^[a-z0-9-]+\.glb$/;

/** Más largo que esto no es un nombre: es alguien probando el sistema de ficheros. */
const LARGO_MAXIMO_DE_NOMBRE = 64;

const TIPO_DE_GLB = 'model/gltf-binary';

const UNA_HORA_MS = 60 * 60_000;

function faltaLaCarpeta(res: Response): void {
  res.status(404).json({
    error:
      'Este servidor no encuentra la carpeta de los modelos 3D (`escenas/modelos`, buscada ' +
      'desde donde arranca el proceso; `MODELOS_DIR` la fija). Sin ella no hay tablero ni ' +
      'aventureros que servir.',
    motivo: 'sin-carpeta-de-modelos',
  });
}

/**
 * Sirve un `.glb` de dentro de `raiz`, o 404 si no está.
 *
 * El error de `sendFile` se atiende en su propia llamada y no se deja subir: el
 * envoltorio de `crearRouter` sólo ve lo que lanza el manejador, y esto llega
 * por un callback. Y un fichero que no existe NO es un fallo del servidor —es la
 * respuesta normal a un aventurero que este despliegue no trae—, así que va como
 * 404 en JSON, igual que las demás rutas de `/api`, y no como el 500 del
 * manejador de error final.
 */
function servir(res: Response, raiz: string, fichero: string): void {
  res.sendFile(
    fichero,
    {
      root: raiz,
      maxAge: UNA_HORA_MS,
      dotfiles: 'deny',
      headers: { 'Content-Type': TIPO_DE_GLB },
    },
    (error?: Error) => {
      if (!error || res.headersSent) return;
      const estado = (error as { status?: number; statusCode?: number }).status ??
        (error as { statusCode?: number }).statusCode;
      /*
       * `send` marca con 404 lo que no existe (`ENOENT`, `ENOTDIR`, un nombre
       * demasiado largo) y con 403 lo que se niega a servir (un `..`, un fichero
       * oculto). Desde fuera las dos cosas son lo mismo: aquí no hay ese modelo.
       */
      if (estado === 404 || estado === 403) {
        res.status(404).json({ error: `No hay ningún modelo «${fichero}».`, motivo: 'sin-modelo' });
        return;
      }
      console.error(`[arcade] No se ha podido servir el modelo «${fichero}» desde «${raiz}»:`, error);
      res.status(500).json({ error: 'No se ha podido leer el modelo.' });
    },
  );
}

/** El tablero. Uno solo, con nombre fijo. */
router.get('/arcade/modelos/tablero.glb', (_req, res) => {
  if (carpeta === undefined) {
    faltaLaCarpeta(res);
    return;
  }
  servir(res, carpeta, 'tablero.glb');
});

/**
 * El embarcadero: las piezas del lobby, con el color horneado. Nombre fijo
 * también, y ruta propia y no un comodín sobre la carpeta: lo que se puede pedir
 * por HTTP es exactamente lo que se ha decidido servir, fichero a fichero. Ver
 * `escenas/embarcadero/piezas.ts` para qué hay dentro y por qué no es el tablero.
 */
router.get('/arcade/modelos/embarcadero.glb', (_req, res) => {
  if (carpeta === undefined) {
    faltaLaCarpeta(res);
    return;
  }
  servir(res, carpeta, 'embarcadero.glb');
});

/**
 * Los dados de la mesa de Riberas: el D6 de KayKit horneado, unos kB. Fichero
 * APARTE del tablero para que un dado no obligue a recargar cuatro megas y para que
 * su fallo no tumbe el tablero (las pantallas lo piden con su propia red); ruta fija
 * como las otras dos, por lo mismo. Ver `escenas/scripts/compilar-dados.ts`.
 */
router.get('/arcade/modelos/dados.glb', (_req, res) => {
  if (carpeta === undefined) {
    faltaLaCarpeta(res);
    return;
  }
  servir(res, carpeta, 'dados.glb');
});

/**
 * Un aventurero, por nombre de fichero. La lista blanca va ANTES de mirar si
 * existe la carpeta, para que un nombre fuera de forma conteste siempre lo mismo
 * y no diga, según el despliegue, si hay carpeta o no.
 */
router.get('/arcade/modelos/aventureros/:fichero', (req, res) => {
  const fichero = String(req.params.fichero ?? '');
  if (fichero.length > LARGO_MAXIMO_DE_NOMBRE || !NOMBRE_DE_AVENTURERO.test(fichero)) {
    res.status(404).json({
      error:
        'Un aventurero se pide por un nombre de fichero en minúsculas, dígitos y guiones, ' +
        'acabado en `.glb`. Ése no tiene esa forma.',
      motivo: 'nombre-fuera-de-forma',
    });
    return;
  }
  if (carpeta === undefined) {
    faltaLaCarpeta(res);
    return;
  }
  servir(res, path.join(carpeta, 'aventureros'), fichero);
});

export default router;
