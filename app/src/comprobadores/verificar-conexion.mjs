/**
 * La franja de «sin conexión» solo salta cuando toca.
 *
 *   node app/src/comprobadores/verificar-conexion.mjs
 *
 * ═══ QUÉ SE ROMPIÓ, Y CÓMO SE VEÍA ═══
 *
 * El sondeo largo deja la conexión CALLADA hasta veinticinco segundos —el
 * servidor no contesta hasta que la partida cambia—, y veinticinco segundos de
 * silencio son justo lo que cortan los NAT de las operadoras y algunos proxies.
 * Cuando lo cortan, el móvil ve un fetch fallido sin código HTTP.
 *
 * Con tolerancia cero, ese corte encendía la franja a lo ancho de la app. El
 * siguiente sondeo, dos segundos y medio después, la apagaba. Resultado en la
 * mesa: la partida responde perfectamente y el aviso de conexión parpadea sin
 * parar, que es exactamente como se describió el síntoma jugando al CLUEDO.
 *
 * ═══ POR QUÉ ESTE COMPROBADOR Y NO UN `grep` ═══
 *
 * `conexion-reglas.ts` no importa nada de React Native a propósito, para poder
 * EJECUTARSE aquí. Así que la regla se llama de verdad, con números de verdad.
 * Mirar el texto del fichero pasaría en verde con la lógica invertida.
 *
 * Lo que sí se lee es el CABLEADO en `estado.tsx`, porque eso no es una función
 * que se pueda llamar: es que la cuenta suba donde debe y —lo que de verdad
 * importa— que se REINICIE al primer acierto. Una cuenta que no se reinicia
 * convierte dos tropiezos separados por media hora en una caída.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(AQUI, '..');

let hechas = 0;
const fallos = [];

function comprobar(que, condicion, detalle) {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle ? `\n      ${detalle}` : ''}`);
}

const leer = (f) => fs.readFileSync(f, 'utf8');

async function cargarModuloTs(fichero) {
  const js = ts.transpileModule(leer(fichero), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js, 'utf8').toString('base64')}`);
}

const reglas = await cargarModuloTs(path.join(SRC, 'conexion-reglas.ts'));

// ---------------------------------------------------------------------------
// De quién es el problema
// ---------------------------------------------------------------------------

for (const estado of [401, 403, 404]) {
  const r = reglas.repartirFallo(estado);
  comprobar(
    `un ${estado} es cosa de la partida, y demuestra que hay red`,
    r.deLaPartida === true && r.sinRed === false,
    JSON.stringify(r),
  );
}

for (const estado of [0, 500, 502, 503]) {
  const r = reglas.repartirFallo(estado);
  comprobar(
    `un ${estado} es cosa de la plataforma`,
    r.sinRed === true && r.deLaPartida === false,
    JSON.stringify(r),
  );
}

// ---------------------------------------------------------------------------
// Cuándo merece la pena contarlo
// ---------------------------------------------------------------------------

comprobar(
  'un tropiezo suelto NO enciende la franja',
  reglas.hayQueAvisar(1) === false,
  'con esto en `true`, cada corte del sondeo largo pinta «Sin conexión» y la quita 2,5 s después',
);
comprobar('dos fallos seguidos SÍ la encienden', reglas.hayQueAvisar(2) === true);
comprobar('y tres también, claro', reglas.hayQueAvisar(3) === true);
comprobar(
  'sin fallos no hay franja',
  reglas.hayQueAvisar(0) === false,
  'encender el aviso sin ningún fallo dejaría la franja puesta desde el arranque',
);
comprobar(
  'la tolerancia es finita',
  Number.isInteger(reglas.FALLOS_ANTES_DE_AVISAR) &&
    reglas.FALLOS_ANTES_DE_AVISAR >= 2 &&
    reglas.FALLOS_ANTES_DE_AVISAR <= 4,
  `aguantar ${reglas.FALLOS_ANTES_DE_AVISAR} fallos es no avisar nunca de una caída de verdad`,
);

// ---------------------------------------------------------------------------
// Que esté enchufada
// ---------------------------------------------------------------------------

const estado = leer(path.join(SRC, 'estado.tsx'));

comprobar(
  '`estado.tsx` decide la franja con `hayQueAvisar`',
  estado.includes('hayQueAvisar('),
  'la regla existe pero nadie la llama: la franja seguiría saltando al primer tropiezo',
);

comprobar(
  'ningún sitio enciende la franja saltándose la cuenta',
  !/setSinRed\(\s*repartirFallo\(/.test(estado),
  'un `setSinRed(repartirFallo(...).sinRed)` suelto vuelve a la tolerancia cero por la puerta de atrás',
);

/*
 * EL REINICIO ES LA MITAD DE LA REGLA. Sin él la cuenta solo sube, y dos
 * tropiezos separados por media hora de partida impecable acaban pintando la
 * franja como si fuera una caída.
 */
comprobar(
  'la cuenta se reinicia cuando el sondeo acierta',
  /fallosSeguidos\.current\s*=\s*0/.test(estado),
  'sin reinicio, los tropiezos se acumulan durante toda la velada',
);

comprobar(
  'la cuenta no repinta la pantalla',
  /const\s+fallosSeguidos\s*=\s*useRef\(/.test(estado),
  'llevarla en `useState` repinta la app entera en cada tropiezo, que es justo lo que se quería dejar de hacer',
);

console.log('');
if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. Un tropiezo es un tropiezo y una caída es una caída.`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
