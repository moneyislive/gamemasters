/**
 * Por dónde entra un juego que NO viene dentro del binario.
 *
 * ═══ QUÉ PROBLEMA RESUELVE ═══
 *
 * `JUEGOS=sombras` ya deja elegir el reparto de un servidor entre los juegos
 * que el binario trae. Eso resuelve la mitad: el mismo despliegue sirve a países
 * distintos sin recompilar.
 *
 * La otra mitad es que un juego se pueda instalar SIN estar dentro. Mientras
 * haya que meterlo en el binario, «añadir un juego» significa tocar este
 * repositorio, compilar y desplegar en todas partes — y el fichero que los
 * enumera crece con cada uno.
 *
 * ═══ POR QUÉ HACÍA FALTA UN ENCHUFE Y NO BASTABA CON IMPORTAR ═══
 *
 * El servidor se compila con `esbuild --packages=external`, así que lo que viva
 * en `node_modules` NO entra en el paquete y se puede importar en tiempo de
 * ejecución. La capacidad estaba.
 *
 * Lo que faltaba es que un módulo de fuera no tiene forma de llamar a
 * `registrarAcciones` ni a `registrarProyeccion`: esas funciones viven DENTRO
 * del paquete, y un `import` desde fuera resolvería a otra copia del código con
 * sus propias tablas. Las tablas están ancladas con `Symbol.for`, así que en
 * realidad se compartirían — pero apoyarse en eso sería pedirle a cada juego que
 * conozca dieciséis nombres de símbolo y escriba en las estructuras a pelo, sin
 * validación y sin contrato.
 *
 * Así que se le pasa. El juego exporta `instalar(api)`, recibe las funciones que
 * necesita y no importa nada del servidor. Eso es lo que lo hace una pieza de
 * Lego de verdad: encaja por un contrato, no por conocer las tripas.
 *
 * ═══ LO QUE ESTE FICHERO NO HACE, Y CONVIENE SABERLO ═══
 *
 * No aísla. Un juego cargado así corre en el mismo proceso, con los mismos
 * permisos, y si su reductor entra en un bucle infinito se lleva el servidor por
 * delante. Instalar un juego es una decisión de quien administra el servidor,
 * del mismo orden que instalar un módulo de nginx — no es una tienda de
 * extensiones abierta a cualquiera.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { registrarDosieres } from '../docs/dosieres';
import { registrarImprimibles, registrarImprimiblesDeLaCasa } from '../docs/imprimibles/registro';
import { registrarVoz } from '../agent/voces';
import { registrarAmpliacion } from './ampliaciones';
import { registrarCierre } from './cierres';
import { registrarGenerador } from './generadores';
import { registrarInicio } from './inicios';
import { registrarMaterial } from './materiales';
import { registrarAcciones } from './motor';
import { registrarProyeccion, registrarProyeccionParaGm } from './proyecciones';
import { registrarTrofeos } from './trofeos';
import { registrarVeredicto } from './veredictos';
import {
  entidadDe,
  entidadesDe,
  entidadesDelEje,
  nombreDeEntidad,
  registrarJuego,
} from '../../../shared/juegos';

/**
 * Lo que un juego recibe para darse de alta.
 *
 * Son las MISMAS funciones que usan los tres juegos de dentro. No hay una API
 * de segunda para los de fuera: si un juego externo no pudiera hacer algo que
 * hace CLUEDO, el contrato estaría mintiendo sobre lo que es un juego.
 */
export interface Enchufe {
  /** Lo primero y sin lo cual nada: el manifiesto. */
  registrarJuego: typeof registrarJuego;

  // Cómo se juega.
  registrarAcciones: typeof registrarAcciones;
  registrarProyeccion: typeof registrarProyeccion;
  registrarProyeccionParaGm: typeof registrarProyeccionParaGm;
  registrarInicio: typeof registrarInicio;
  registrarCierre: typeof registrarCierre;
  registrarVeredicto: typeof registrarVeredicto;
  registrarTrofeos: typeof registrarTrofeos;

  // Cómo se escribe su trama.
  registrarGenerador: typeof registrarGenerador;
  registrarAmpliacion: typeof registrarAmpliacion;
  registrarMaterial: typeof registrarMaterial;
  registrarVoz: typeof registrarVoz;

  // Qué se imprime.
  registrarImprimibles: typeof registrarImprimibles;
  registrarImprimiblesDeLaCasa: typeof registrarImprimiblesDeLaCasa;
  registrarDosieres: typeof registrarDosieres;

  /**
   * Y lo que necesita LEER de la partida.
   *
   * Sin esto, un juego de fuera tendría que escarbar en `game.suspects` y
   * `game.entidades` a mano, que es exactamente el acoplamiento del que venimos.
   */
  entidadesDe: typeof entidadesDe;
  entidadDe: typeof entidadDe;
  entidadesDelEje: typeof entidadesDelEje;
  nombreDeEntidad: typeof nombreDeEntidad;
}

/** El enchufe, montado. */
export function elEnchufe(): Enchufe {
  return {
    registrarJuego,
    registrarAcciones,
    registrarProyeccion,
    registrarProyeccionParaGm,
    registrarInicio,
    registrarCierre,
    registrarVeredicto,
    registrarTrofeos,
    registrarGenerador,
    registrarAmpliacion,
    registrarMaterial,
    registrarVoz,
    registrarImprimibles,
    registrarImprimiblesDeLaCasa,
    registrarDosieres,
    entidadesDe,
    entidadDe,
    entidadesDelEje,
    nombreDeEntidad,
  };
}

/** Lo que un juego de fuera tiene que exportar. */
export type JuegoDeFuera = {
  instalar: (api: Enchufe) => void | Promise<void>;
};

/**
 * Instala los juegos que no vienen dentro del binario.
 *
 * `JUEGOS_EXTERNOS` acepta lo que acepte `import()`: el nombre de un paquete de
 * `node_modules` —`@harkania/juego-dnd`— o una ruta de fichero, que es lo que
 * sirve para montar un juego desde un disco al lado del servidor sin publicarlo
 * en ningún registro.
 *
 * ═══ UN JUEGO QUE FALLA NO TUMBA EL SERVIDOR ═══
 *
 * Se anota y se sigue con los demás. La alternativa —morir al arrancar— deja
 * sin partida también a los juegos que están bien, y por un fallo que quien
 * administra el servidor a lo mejor ni ha escrito. Lo que NO se hace es
 * disimularlo: el aviso lleva el nombre y el error entero.
 */
/**
 * Convierte una ruta de fichero en algo que `import()` acepte.
 *
 * ═══ ESTO LO ENCONTRO LA PRUEBA, Y SOLO OCURRE EN WINDOWS ═══
 *
 * `import('/opt/juegos/dnd.mjs')` funciona en Linux. En Windows,
 * `import('C:/juegos/dnd.mjs')` NO: el cargador de modulos lee `C:` como un
 * esquema de URL y contesta
 * «Only URLs with a scheme in: file, data, and node are supported».
 *
 * Es el fallo perfecto para escaparse: el desarrollo es en Windows y el
 * despliegue en Linux, asi que sin esto la funcion habria pasado todas las
 * pruebas del servidor de produccion y habria sido imposible probarla en la
 * maquina donde se escribe.
 *
 * Un NOMBRE DE PAQUETE —`@harkania/juego-dnd`— se deja tal cual: eso lo resuelve
 * Node por `node_modules` y convertirlo en una ruta lo rompería.
 */
function comoEspecificador(donde: string): string {
  const esRuta =
    donde.startsWith('.') || donde.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(donde);
  return esRuta ? pathToFileURL(path.resolve(donde)).href : donde;
}

export async function instalarJuegosDeFuera(especificadores: string[]): Promise<string[]> {
  const puestos: string[] = [];
  for (const donde of especificadores) {
    try {
      const modulo = (await import(comoEspecificador(donde))) as Partial<JuegoDeFuera>;
      if (typeof modulo.instalar !== 'function') {
        console.error(
          `[juegos] «${donde}» se cargó pero no exporta \`instalar(api)\`, así que no se ha dado de alta nada.`,
        );
        continue;
      }
      await modulo.instalar(elEnchufe());
      puestos.push(donde);
    } catch (error) {
      console.error(`[juegos] no se ha podido instalar «${donde}»:`, error);
    }
  }
  return puestos;
}
