/**
 * LAS FIGURAS: los seis aventureros entre los que se elige, y cómo se llaman sus
 * ficheros y sus clips.
 *
 * ═══ POR QUÉ ESTA TABLA VIVE AQUÍ Y NO EN EL SERVIDOR NI EN `shared/arcade` ═══
 *
 * El servidor guarda la figura de un asiento como una CADENA OPACA: no sabe qué
 * es un caballero y no debe saberlo, igual que no sabe qué es una choza
 * (`server/src/arcade/mesas.ts`). Y `shared/arcade/` está sellado: es el contrato
 * del motor, y un pack de arte no es contrato. Lo que sí tiene que conocer la
 * lista son los DOS clientes que la pintan, y los dos compilan `escenas/`. Aquí.
 *
 * Una figura que llegue por el cable y no esté en esta tabla no rompe nada: se
 * pinta la de serie del asiento. Es la misma regla con la que la portada trata un
 * icono de arcade que no conoce.
 *
 * ═══ LOS NOMBRES DE FICHERO Y DE CLIP SON LOS QUE ESCRIBE EL COMPILADOR ═══
 *
 * `escenas/scripts/compilar-aventureros.ts` es quien traduce `Knight.glb` a
 * `caballero.glb` y `Idle_A` a `reposo-a`. Esta tabla tiene que decir lo mismo, y
 * `verify:aventureros` lo comprueba contra los `.glb` de verdad.
 *
 * ═══ SIN `three`, A PROPÓSITO ═══
 *
 * Es dato. Lo importan la app, el escritorio y los comprobadores de Node.
 */

/** Los identificadores que viajan por el cable. Unión cerrada para el binario. */
export type FiguraId = 'caballero' | 'barbaro' | 'maga' | 'exploradora' | 'picaro' | 'encapuchado';

export interface Figura {
  readonly id: FiguraId;
  /** Cómo se llama al elegir. */
  readonly nombre: string;
  /** Una línea que se lee bajo el nombre. Voz de la casa, sin nombrar el pack. */
  readonly nota: string;
  /** El fichero dentro de `escenas/modelos/aventureros/`. */
  readonly fichero: string;
}

export const FIGURAS: readonly Figura[] = [
  { id: 'caballero', nombre: 'El Caballero', nota: 'Llega el primero y se queda el último.', fichero: 'caballero.glb' },
  { id: 'barbaro', nombre: 'El Bárbaro', nota: 'No negocia: propone.', fichero: 'barbaro.glb' },
  { id: 'maga', nombre: 'La Maga', nota: 'Sabe qué número va a salir. O eso dice.', fichero: 'maga.glb' },
  { id: 'exploradora', nombre: 'La Exploradora', nota: 'Conoce el delta antes de que se reparta.', fichero: 'exploradora.glb' },
  { id: 'picaro', nombre: 'El Pícaro', nota: 'Cambia junco por sal y sale ganando.', fichero: 'picaro.glb' },
  { id: 'encapuchado', nombre: 'El Encapuchado', nota: 'Nadie le ha visto la cara ni las cartas.', fichero: 'encapuchado.glb' },
];

/** ¿Es una figura que este binario sabe pintar? Lo que llega por la red no lo es hasta que se mira. */
export function esFigura(x: unknown): x is FiguraId {
  return typeof x === 'string' && FIGURAS.some((f) => f.id === x);
}

export function figura(id: FiguraId): Figura {
  return FIGURAS.find((f) => f.id === id) as Figura;
}

/**
 * LA FIGURA DE SERIE de un asiento que no ha elegido ninguna.
 *
 * Sale del IDENTIFICADOR del asiento y no de su posición: la posición cambia si
 * alguien se levanta, y una figura que cambiara sola al irse otro se leería como
 * un fallo. El identificador es estable mientras dure la mesa, y es el mismo en
 * todos los aparatos, así que los seis ven al mismo aventurero en la misma silla.
 *
 * El sorteo es una suma de códigos de carácter: no hace falta más para repartir
 * seis figuras entre seis sillas, y no hace falta que sea el mismo `hash` que
 * ningún otro sitio.
 */
export function figuraDeSerie(asientoId: string): FiguraId {
  let suma = 0;
  for (let i = 0; i < asientoId.length; i++) suma = (suma * 31 + asientoId.charCodeAt(i)) >>> 0;
  return (FIGURAS[suma % FIGURAS.length] as Figura).id;
}

/** La figura que se pinta para un asiento: la elegida si vale, la de serie si no. */
export function figuraQueSePinta(asientoId: string, elegida: string | undefined): FiguraId {
  return esFigura(elegida) ? elegida : figuraDeSerie(asientoId);
}

/**
 * LOS CLIPS de `animaciones.glb`, con los nombres que escribe el compilador.
 *
 * Constantes y no cadenas sueltas: un clip mal escrito no lo ve el compilador de
 * TypeScript, y el síntoma es un aventurero clavado en T-pose.
 */
export const CLIP = {
  reposoA: 'reposo-a',
  reposoB: 'reposo-b',
  andar: 'andar',
  correr: 'correr',
  saludar: 'saludar',
  recoger: 'recoger',
  aparecer: 'aparecer',
  usar: 'usar',
  lanzar: 'lanzar',
  golpe: 'golpe',
  salto: 'salto',
  tPose: 't-pose',
} as const;

export type NombreDeClip = (typeof CLIP)[keyof typeof CLIP];

/** El fichero de la biblioteca de clips, junto a los personajes. */
export const FICHERO_DE_ANIMACIONES = 'animaciones.glb';

/**
 * DÓNDE PIDE CADA CLIENTE LOS MODELOS.
 *
 * Rutas RELATIVAS a la raíz del servidor de juego, sin dominio: la app las pega a
 * `servidorActual()` y el escritorio las pide tal cual, que en desarrollo pasa
 * por el proxy de Vite y en producción es el mismo Node. Las sirve
 * `server/src/routes/modelos.ts`, delante del guardián.
 */
import { RUTA_DE_MODELOS } from '../ruta-de-modelos';

export { RUTA_DE_MODELOS };

export function rutaDelAventurero(id: FiguraId): string {
  return `${RUTA_DE_MODELOS}/aventureros/${figura(id).fichero}`;
}

export function rutaDeLasAnimaciones(): string {
  return `${RUTA_DE_MODELOS}/aventureros/${FICHERO_DE_ANIMACIONES}`;
}

export function rutaDelEmbarcadero(): string {
  return `${RUTA_DE_MODELOS}/embarcadero.glb`;
}
