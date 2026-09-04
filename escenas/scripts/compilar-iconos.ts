/**
 * COMPILA LOS ICONOS DE LOS BIENES A UN MÓDULO DE TYPESCRIPT.
 *
 * ═══ POR QUÉ NO SE CARGAN LOS `.svg` DIRECTAMENTE ═══
 *
 * Porque hay dos clientes y cargan distinto. Vite sabe traer un fichero como texto con
 * `?raw`; Metro, que es lo que empaqueta la app, no — allí un `import` de un `.svg` pasa
 * por un transformador de imágenes que devuelve otra cosa. Un camino que funcione en los
 * dos sin configurar nada en ninguno es que el arte acabe siendo CÓDIGO.
 *
 * Son cinco trazos y unos veinte kilobytes: cabe de sobra en un módulo, se empaqueta
 * solo y no hay que servir ni esperar a nada en tiempo de ejecución. Un `.glb` de cuatro
 * megas no cabría; esto sí.
 *
 * ═══ QUÉ LE QUITA A CADA UNO ═══
 *
 * El rectángulo de fondo. Los iconos de game-icons.net traen dos trazos: un cuadrado que
 * cubre el lienzo entero —el fondo negro de su ficha— y el dibujo. Sin quitarlo, la
 * carta saldría con un cuadrado macizo encima del bien.
 *
 * Se reconoce por su forma exacta, `M0 0h512v512H0z` para un lienzo de 512, y no por ser
 * el primero: dar por hecho que el fondo va primero es la clase de suposición que un día
 * borra el dibujo y deja el fondo.
 *
 * ═══ Y APLANA LAS CURVAS AQUÍ, NO ALLÍ ═══
 *
 * Lo que sale no son trazos de SVG: son listas de puntos. La gramática de `d` se recorre
 * en esta máquina, una vez, y lo que viaja a los dos clientes son contornos que sólo hay
 * que enhebrar.
 *
 * No es una optimización, es lo único que funciona: analizar SVG en tiempo de ejecución
 * exige `DOMParser`, que es del navegador. En React Native no existe, así que un icono
 * analizado al vuelo se vería en el escritorio y saldría vacío en la app — sin un error
 * en ninguna consola. Ver `aplana-trazo.ts`.
 *
 * ═══ Y POR QUÉ NO CONOCE A NADIE ═══
 *
 * Este guion no sabe de dónde salen los iconos ni quién los hizo: lee los `.svg` que haya
 * en la carpeta, por su nombre de fichero. El arte de ahora es PROVISIONAL —ver
 * `arte/game-icons/LEEME.md`— y cambiarlo tiene que ser dejar cinco ficheros y volver a
 * ejecutar esto, sin tocar una línea de la escena. Un arte provisional del que dependa
 * código ya no es provisional.
 */

import fs from 'node:fs';
import path from 'node:path';
import { aplanaTrazo, simplificaContorno } from './aplana-trazo';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const ORIGEN = path.join(RAIZ, 'arte', 'game-icons');
const DESTINO = path.join(RAIZ, 'escenas', 'iconos.ts');

/**
 * LOS CINCO BIENES Y EL FICHERO DE CADA UNO.
 *
 * El nombre del bien es el del juego y el del fichero es el del arte, y se escriben los
 * dos porque son dos vocabularios distintos: el día que el arte nuevo llame `trigo.svg`
 * al grano, se cambia aquí y nada más.
 */
const BIENES: ReadonlyArray<{ bien: string; fichero: string }> = [
  { bien: 'madera', fichero: 'wood-pile.svg' },
  { bien: 'ladrillo', fichero: 'brick-pile.svg' },
  { bien: 'lana', fichero: 'sheep.svg' },
  { bien: 'grano', fichero: 'grain-bundle.svg' },
  { bien: 'mineral', fichero: 'stone-pile.svg' },
];

/** El lienzo que se espera. Si un icono trae otro, se dice en vez de escalarlo a ciegas. */
const LIENZO = 512;

function fondoDelLienzo(lado: number): string {
  return `M0 0h${String(lado)}v${String(lado)}H0z`;
}

interface Icono {
  bien: string;
  /** Cada contorno, como una tira llana de `x, y, x, y`. */
  contornos: number[][];
  puntos: number;
}

function leeUno(bien: string, fichero: string): Icono {
  const ruta = path.join(ORIGEN, fichero);
  if (!fs.existsSync(ruta)) {
    console.error(`Falta ${path.relative(RAIZ, ruta)}, que es el icono de ${bien}.`);
    process.exit(2);
  }
  const texto = fs.readFileSync(ruta, 'utf8');

  const caja = /viewBox="([^"]+)"/.exec(texto)?.[1] ?? '';
  const esperado = `0 0 ${String(LIENZO)} ${String(LIENZO)}`;
  if (caja !== esperado) {
    console.error(
      `El icono de ${bien} tiene el lienzo «${caja}» y se esperaba «${esperado}».\n` +
        'La carta coloca el dibujo dando por hecho un lienzo cuadrado de ese tamaño; con\n' +
        'otro saldría descentrado o de otro tamaño que sus cuatro compañeros. Ver\n' +
        '`arte/game-icons/LEEME.md`, que dice lo que tiene que cumplir el arte nuevo.',
    );
    process.exit(2);
  }

  const todos = [...texto.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1] ?? '');
  const fondo = fondoDelLienzo(LIENZO);
  const trazos = todos.filter((d) => d.replace(/\s+/g, '') !== fondo.replace(/\s+/g, ''));

  if (trazos.length === 0) {
    console.error(`El icono de ${bien} se queda sin nada al quitarle el fondo.`);
    process.exit(2);
  }

  /*
   * Se redondea a una décima. Sobre un lienzo de 512 dibujado a unos cien píxeles, una
   * décima es la milésima parte de un píxel: no hay diferencia que ver, y el módulo baja
   * a la mitad. Guardar quince decimales de un punto que nadie puede distinguir es
   * enviar ruido.
   */
  const contornos: number[][] = [];
  for (const d of trazos) {
    for (const bruto of aplanaTrazo(d, `el icono de ${bien}`)) {
      const contorno = simplificaContorno(bruto);
      const tira: number[] = [];
      for (const q of contorno) {
        tira.push(Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10);
      }
      if (tira.length >= 6) contornos.push(tira);
    }
  }
  if (contornos.length === 0) {
    console.error(`El icono de ${bien} no ha dado ni un contorno con tres puntos.`);
    process.exit(2);
  }
  const puntos = contornos.reduce((t, c) => t + c.length / 2, 0);
  return { bien, contornos, puntos };
}

const iconos = BIENES.map((b) => leeUno(b.bien, b.fichero));

const cuerpo = iconos
  .map(
    (i) =>
      `  ${i.bien}: [\n${i.contornos.map((c) => `    [${c.join(',')}],`).join('\n')}\n  ],`,
  )
  .join('\n');

const salida = `/**
 * LOS ICONOS DE LOS CINCO BIENES, en contornos de puntos.
 *
 * ═══ ESTE FICHERO SE GENERA. NO SE EDITA A MANO ═══
 *
 * Lo escribe \`escenas/scripts/compilar-iconos.ts\` a partir de los \`.svg\` de
 * \`arte/game-icons/\`. Cualquier cambio hecho aquí desaparece en la siguiente
 * compilación.
 *
 * Cada bien trae sus CONTORNOS: tiras llanas de \`x, y, x, y\` en el sistema de
 * coordenadas de SVG, con un lienzo de ${String(LIENZO)}×${String(LIENZO)} y la \`y\`
 * creciendo HACIA ABAJO. Quien los dibuje en tres dimensiones tiene que darles la vuelta
 * en \`y\`, o el trigo sale cabeza abajo.
 *
 * Vienen aplanados y no como trazos de SVG por una razón dura: analizar SVG en tiempo de
 * ejecución exige \`DOMParser\`, que es del navegador y NO existe en React Native. Un
 * icono analizado al vuelo se vería en el escritorio y saldría vacío en la app, sin un
 * error en ninguna consola. Ver \`escenas/scripts/aplana-trazo.ts\`.
 *
 * ═══ EL ARTE DE AHORA ES PROVISIONAL ═══
 *
 * Son de Delapouite (game-icons.net), CC BY 3.0, y están para probar la interfaz
 * mientras se dibujan los propios. La condición para que se queden y cómo se
 * sustituyen están en \`arte/game-icons/LEEME.md\`.
 */

/** El lienzo cuadrado en el que están dibujados todos. */
export const LIENZO_DEL_ICONO = ${String(LIENZO)};

/** Los contornos de cada bien, ya sin el rectángulo de fondo y ya aplanados. */
export const CONTORNOS_DEL_BIEN: Readonly<Record<string, readonly (readonly number[])[]>> = {
${cuerpo}
};

/** Los bienes que tienen icono. Sirve para comprobar que no falta ninguno. */
export const BIENES_CON_ICONO: readonly string[] = Object.keys(CONTORNOS_DEL_BIEN);
`;

fs.writeFileSync(DESTINO, salida, 'utf8');

const kb = (salida.length / 1024).toFixed(1);
console.log(`\n  ${String(iconos.length)} iconos compilados · ${kb} kB en ${path.relative(RAIZ, DESTINO)}`);
for (const i of iconos) {
  console.log(
    `    ${i.bien.padEnd(10)} ${String(i.contornos.length).padStart(2)} contorno(s) · ` +
      `${String(i.puntos)} puntos`,
  );
}
