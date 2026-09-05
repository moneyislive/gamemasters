/**
 * ¿ESTÁ `escenas/iconos.ts` EN SINCRONÍA CON EL GUION QUE LO GENERA?
 *
 * ═══ EL FALLO QUE CAZA ═══
 *
 * `escenas/iconos.ts` son DATOS compilados por `compilar-iconos.ts`: los contornos de los
 * cinco bienes salen de los SVG de `arte/game-icons`, y los de las cartas y las cifras
 * están dibujados en el propio guion. Nada de los setenta y tantos comprobadores afirmaba
 * que las dos cosas dijeran lo mismo. Si alguien mueve un punto en el guion y no recompila
 * —o recompila y no guarda el resultado— todo sigue verde con las dos verdades separadas,
 * y la que se pinta en la mesa es la vieja. No revienta nada: un dibujo que no está sale
 * como un naipe de color plano, que es el fallo silencioso de siempre en esta escena.
 *
 * ═══ CÓMO: RECOMPILA A UN TEMPORAL Y COMPARA BYTE A BYTE ═══
 *
 * No cuenta cartas ni contornos a mano —«doce cartas», «cinco bienes»—: el guion crece (las
 * cifras de las fichas entran hoy) y una cuenta escrita aquí caducaría con él sin ponerse
 * roja. Se lanza el compilador DE VERDAD, con `--a <temporal>` —la puerta que existe para
 * esto y que no toca el bueno— y se compara lo que produce con lo que hay en el árbol. Si
 * difieren, el arreglo es recompilar: `npx tsx scripts/compilar-iconos.ts` desde `escenas/`.
 *
 * Y se comprueba que el bueno NO ha cambiado por el camino: si `--a` dejara de obedecerse,
 * el compilador escribiría encima del fichero que se está comprobando y la comparación
 * saldría verde por definición.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const AQUI = path.resolve(import.meta.dirname ?? __dirname);
const RAIZ = path.resolve(AQUI, '..', '..');
const COMPILADOR = path.join(AQUI, 'compilar-iconos.ts');
const EL_BUENO = path.join(RAIZ, 'escenas', 'iconos.ts');

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : ` — ${JSON.stringify(detalle)}`}`);
}

/* El mismo `tsx` que corre este guion, resuelto por Node y no buscado en el PATH. */
const tsx = createRequire(import.meta.url).resolve('tsx/cli');

const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'iconos-recompilados-'));
const temporal = path.join(carpeta, 'iconos.ts');
const antes = fs.existsSync(EL_BUENO) ? fs.readFileSync(EL_BUENO) : null;
comprobar('`escenas/iconos.ts` existe: es lo que la escena importa', antes !== null, EL_BUENO);

const salida = spawnSync(process.execPath, [tsx, COMPILADOR, '--a', temporal], {
  cwd: AQUI,
  encoding: 'utf8',
  timeout: 120_000,
});
comprobar(
  'el compilador de iconos termina con salida 0 escribiendo a la ruta que se le pide',
  salida.status === 0,
  { status: salida.status, error: salida.error?.message, cola: (salida.stderr ?? '').slice(-600) },
);
const recompilado = fs.existsSync(temporal) ? fs.readFileSync(temporal) : null;
comprobar('y deja un fichero con contenido en esa ruta, no en otra', recompilado !== null && recompilado.length > 0, temporal);

const despues = fs.existsSync(EL_BUENO) ? fs.readFileSync(EL_BUENO) : null;
comprobar(
  'el bueno no ha cambiado por el camino: `--a` se ha obedecido y no se ha escrito encima de lo que se compara',
  antes !== null && despues !== null && antes.equals(despues),
);

/*
 * LA COMPARACIÓN. Byte a byte, y si difiere se dice la PRIMERA línea distinta con las dos
 * versiones, que es lo que hace falta para saber si es un punto movido o el fichero entero.
 * Los finales de línea se igualan antes: el compilador escribe `\n` y el árbol puede llevar
 * `\r\n` por `core.autocrlf`, y eso no es una desincronía de los dibujos.
 */
const lineasDe = (b: Buffer | null): string[] => (b === null ? [] : b.toString('utf8').replace(/\r\n/g, '\n').split('\n'));
const delArbol = lineasDe(antes);
const delGuion = lineasDe(recompilado);
let primeraDistinta = -1;
for (let i = 0; i < Math.max(delArbol.length, delGuion.length); i++) {
  if (delArbol[i] !== delGuion[i]) {
    primeraDistinta = i;
    break;
  }
}
comprobar(
  '`escenas/iconos.ts` es exactamente lo que `compilar-iconos.ts` produce hoy: si no, recompila (`npx tsx scripts/compilar-iconos.ts` en escenas/)',
  antes !== null && recompilado !== null && primeraDistinta === -1,
  primeraDistinta === -1
    ? undefined
    : {
        linea: primeraDistinta + 1,
        enElArbol: (delArbol[primeraDistinta] ?? '<no hay línea>').slice(0, 160),
        recompilada: (delGuion[primeraDistinta] ?? '<no hay línea>').slice(0, 160),
        lineas: { arbol: delArbol.length, recompilado: delGuion.length },
      },
);

fs.rmSync(carpeta, { recursive: true, force: true });

/* Cinco comprobaciones, siempre: si un día son menos es que alguien ha borrado una. */
const COMPROBACIONES_ESCRITAS = 5;
if (hechas < COMPROBACIONES_ESCRITAS) {
  fallos.push(`sólo se han hecho ${String(hechas)} de las ${String(COMPROBACIONES_ESCRITAS)} comprobaciones escritas`);
}

if (fallos.length > 0) {
  console.log(`\n${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log('');
  process.exit(1);
}
console.log(
  `\n${String(hechas)} comprobaciones\n\n` +
    'Los dibujos que pinta la escena son los que el guion dibuja hoy: `escenas/iconos.ts` es\n' +
    'byte a byte lo que `compilar-iconos.ts` produce, y el bueno no se ha tocado para saberlo.\n',
);
