/**
 * El tope diario de lo que cuesta dinero.
 *
 * Había un tope y estaba puesto en la ruta BARATA —avatares y fondos—; las
 * caras no llevaban ninguno. Aquí se comprueban las dos mitades del arreglo: que
 * el freno frena, y que NO frena a quien no toca, que es la mitad que suele
 * salir mal. Un tope que muerde a quien está preparando su velada es peor que no
 * tenerlo.
 *
 * Se ejecuta con el entorno enumerado a mano, así que la calibración que se mide
 * es la del guion y no la de la casa.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, bien: boolean, detalle?: unknown): void {
  hechas += 1;
  if (bien) {
    console.log(`  ✔ ${que}`);
    return;
  }
  console.log(`  ✘ ${que}`);
  if (detalle !== undefined) console.log(`      ${JSON.stringify(detalle)}`);
  fallos.push(que);
}

/**
 * Se ejecuta en un proceso aparte por cada calibración.
 *
 * Los topes se leen del entorno UNA VEZ, al cargar el módulo — que es lo que hay
 * que hacer, porque leer `process.env` en cada petición es trabajo por nada. El
 * precio es que no se pueden probar dos calibraciones en el mismo proceso, así
 * que cada una tiene el suyo.
 */
function conEntorno(vars: Record<string, string>, guion: string): unknown {
  // Sin barras invertidas en el fuente: `path.sep` las trae del sistema.
  const modulo = path.join(AQUI, '..', 'src', 'gasto', 'tope.ts').split(path.sep).join('/');
  const fichero = path.join(os.tmpdir(), `tope-${proceso}-${contador++}.ts`);
  const contenido = [
    `import { cabeHoy, topesConfigurados, cubosVivos } from ${JSON.stringify(modulo)};`,
    'void cabeHoy; void topesConfigurados; void cubosVivos;',
    guion,
    '',
  ].join(SALTO);
  fs.writeFileSync(fichero, contenido, 'utf8');
  try {
    const salida = execFileSync('npx', ['tsx', fichero], {
      env: { ...process.env, ...vars },
      encoding: 'utf8',
      shell: true,
      cwd: path.join(AQUI, '..'),
    });
    return JSON.parse(salida.trim().split(SALTO).pop() ?? 'null');
  } finally {
    try {
      fs.unlinkSync(fichero);
    } catch {
      // da igual
    }
  }
}

/** El salto de línea, sin escaparlo en el fuente. */
const SALTO = String.fromCharCode(10);
const proceso = process.pid;
let contador = 0;

console.log('\nEl tope de lo que cuesta dinero\n');

console.log('\n· Lo que hay puesto por defecto');
{
  const topes = conEntorno({}, 'console.log(JSON.stringify(topesConfigurados()))') as Record<string, number>;
  comprobar('las tres familias tienen tope', topes.tramas > 0 && topes.charla > 0 && topes.estudio > 0, topes);
  // Generoso a propósito: ocho tramas son unos seis euros de techo por
  // identidad, y quien dirige de verdad genera una vez y actualiza dos o tres.
  comprobar('las tramas, holgadas para quien dirige de verdad', topes.tramas >= 8, topes.tramas);
  comprobar('la charla, muy holgada: es la que solo debe cortar un bucle', topes.charla >= 100, topes.charla);
}

console.log('\n· Frena');
{
  const r = conEntorno(
    { TOPE_DIARIO_TRAMAS: '3' },
    `const q=[];for(let i=0;i<6;i++)q.push(cabeHoy('cuenta:x','tramas'));console.log(JSON.stringify(q))`,
  ) as boolean[];
  comprobar('las tres primeras pasan', r.slice(0, 3).every(Boolean), r);
  comprobar('y de la cuarta en adelante, no', r.slice(3).every((x) => x === false), r);
}

console.log('\n· Cada familia lleva su propio cubo');
{
  const r = conEntorno(
    { TOPE_DIARIO_TRAMAS: '1', TOPE_DIARIO_CHARLA: '1', TOPE_DIARIO_ESTUDIO: '1' },
    `console.log(JSON.stringify([cabeHoy('a','tramas'),cabeHoy('a','tramas'),cabeHoy('a','charla'),cabeHoy('a','estudio')]))`,
  ) as boolean[];
  comprobar('agotar las tramas no cierra la charla', r[0] === true && r[1] === false && r[2] === true && r[3] === true, r);
}

console.log('\n· Cada quien lleva el suyo');
{
  const r = conEntorno(
    { TOPE_DIARIO_TRAMAS: '1' },
    `console.log(JSON.stringify([cabeHoy('cuenta:ana','tramas'),cabeHoy('cuenta:ana','tramas'),cabeHoy('cuenta:bruno','tramas')]))`,
  ) as boolean[];
  comprobar('que una persona se pase no deja fuera a la siguiente', r[0] === true && r[1] === false && r[2] === true, r);
}

console.log('\n· La casa va aparte, porque su contraseña la comparte todo el mundo');
{
  const r = conEntorno(
    { TOPE_DIARIO_TRAMAS: '2' },
    `const q=[];for(let i=0;i<11;i++)q.push(cabeHoy('casa','tramas'));console.log(JSON.stringify(q.filter(Boolean).length))`,
  ) as number;
  comprobar('le caben más que a una identidad suelta', r > 2, r);
  // Y SIGUE TENIENDO TECHO: si esa contraseña se filtra, es justo la identidad
  // por la que entraría el abuso.
  comprobar('pero sigue teniendo techo', r < 11, r);
}

console.log('\n· Se puede apagar, y esa es la salida de emergencia');
{
  const r = conEntorno(
    { TOPE_DIARIO_TRAMAS: '0' },
    `const q=[];for(let i=0;i<50;i++)q.push(cabeHoy('cuenta:x','tramas'));console.log(JSON.stringify(q.every(Boolean)))`,
  ) as boolean;
  comprobar('con 0 no hay tope', r === true);
}

console.log('\n· Un valor ilegible no lo desactiva en silencio');
{
  const a = conEntorno({ TOPE_DIARIO_TRAMAS: 'muchas' }, 'console.log(JSON.stringify(topesConfigurados().tramas))');
  const b = conEntorno({ TOPE_DIARIO_TRAMAS: '-4' }, 'console.log(JSON.stringify(topesConfigurados().tramas))');
  const c = conEntorno({ TOPE_DIARIO_TRAMAS: '' }, 'console.log(JSON.stringify(topesConfigurados().tramas))');
  comprobar('«muchas» cae en el valor por defecto', a === 8, a);
  comprobar('un negativo, también', b === 8, b);
  comprobar('y vacío, también', c === 8, c);
}

console.log('\n· Quien se ha pasado no empuja su propio techo');
{
  const r = conEntorno(
    { TOPE_DIARIO_TRAMAS: '2' },
    `for(let i=0;i<20;i++)cabeHoy('cuenta:x','tramas');console.log(JSON.stringify(cabeHoy('cuenta:x','tramas')))`,
  ) as boolean;
  comprobar('reintentar veinte veces no le devuelve el cupo', r === false);
}

console.log('\n· Y el mapa no crece sin fin');
{
  const r = conEntorno(
    { TOPE_DIARIO_TRAMAS: '1000' },
    `for(let i=0;i<300;i++)cabeHoy('cuenta:'+i,'tramas');console.log(JSON.stringify(cubosVivos()))`,
  ) as number;
  comprobar('un cubo por identidad y familia, ni uno más', r === 300, r);
}

console.log(`\n${hechas} comprobaciones`);
if (fallos.length > 0) {
  console.log(`\n${fallos.length} sin pasar:`);
  for (const f of fallos) console.log(`  ✘ ${f}`);
  process.exit(1);
}
console.log('El freno frena, y no frena a quien no toca.');
