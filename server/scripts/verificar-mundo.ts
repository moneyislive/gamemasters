/**
 * ¿EL MUNDO DECLARADO ES CONTRATO, Y LA ARENA DA LO MISMO EN LOS DOS MOTORES?
 *
 *   npm run verify:mundo
 *
 * ═══ LAS DOS COSAS QUE ESTA CAPA PROMETE, Y QUE SI FALLAN NO DAN ERROR ═══
 *
 *  1. QUE EL MUNDO SE PUEDE COMPARAR. `MundoDeclarado` sólo sirve si pasa por `canonico.ts`:
 *     es lo que permite decir «el servidor y el aparato derivaron el MISMO mundo». Un
 *     `Int16Array` colado dentro lo rompe, y el síntoma no es un error al escribirlo sino un
 *     `NoCanonizable` el día que alguien intente congelarlo. El primer diseño de esta capa
 *     metía dos listas tipadas en el contrato y por eso no se escribió.
 *  2. QUE LA ARENA NO DEPENDE DEL MOTOR. Se recorre el mismo mundo en Node y en Hermes y se
 *     compara la huella del recorrido. Es la misma comparación que hace `verify:determinismo`
 *     y por la misma razón: el servidor arbitra sobre la arena, el aparato pinta sobre la
 *     arena, y si no son la misma, el jugador ve que atraviesa un muro que el servidor dice
 *     que no atravesó.
 *
 * ═══ Y EL SUELO, QUE AQUÍ ES LA MITAD DEL COMPROBADOR ═══
 *
 * Un paseante que no toca nada da la MISMA huella en los dos motores: la de no tocar nada. Es
 * el verde por conjunto vacío, y en una capa de colisiones es especialmente fácil de servir
 * —basta con que el radio sea cero, o que el índice de cajones quede vacío, o que el paseo
 * caiga en una esquina despejada—. Por eso, antes de comparar una sola huella, se exige que
 * el recorrido SE HAYA CHOCADO: que lo hayan parado los cuerpos y que lo haya parado el borde,
 * contados los dos por separado. Se han visto rojos.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonico, porQueNoEsCanonico } from '../../shared/mecanicas/canonico';
import { UNO } from '../../shared/mecanicas/fijo';
import { arenaDe, hayPiso, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Cuerpo } from '../../shared/mecanicas/mundo';
import { LADO, mundoDePrueba, pasear, PASOS } from './paseo-del-banco';
import type { Paseo } from './paseo-del-banco';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '..', '..');

const fallos: string[] = [];
let hechas = 0;

function comprobar(que: string, bien: boolean, detalle?: unknown): void {
  hechas++;
  if (bien) return;
  const cola = detalle === undefined ? '' : ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
// UN TABLERO DE VERDAD, QUE ES EL PEOR CASO MEDIDO DEL JUEGO
// ---------------------------------------------------------------------------

const mundo = mundoDePrueba();

// ---------------------------------------------------------------------------
// ESCALÓN 1 · EL MUNDO ES CONTRATO
// ---------------------------------------------------------------------------

paso('El mundo declarado pasa por el serializador canónico');

comprobar('el mundo de prueba tiene las 72 casillas de un tablero lleno', mundo.pisables.length === 72, {
  pisables: mundo.pisables.length,
});
comprobar('y las 3.024 piezas del peor caso', mundo.cuerpos.length === 3024, { cuerpos: mundo.cuerpos.length });

const porQue = porQueNoEsCanonico(mundo);
comprobar('el mundo declarado canoniza', porQue === null, porQue);

let pesoDelMundo = 0;
if (porQue === null) {
  pesoDelMundo = canonico(mundo).length;
  console.log(`  un tablero lleno son ${(pesoDelMundo / 1024).toFixed(1)} kB canonizado`);
}
comprobar('y canonizarlo da algo, no una cadena vacía', pesoDelMundo > 10000, { pesoDelMundo });

/*
 * ═══ LA VACUNA: QUE LA REGLA QUE SE INVOCA SIGA SIENDO VERDAD ═══
 *
 * Todo el argumento de por qué la arena se DERIVA en vez de declararse cuelga de que una lista
 * tipada no canoniza. Si algún día `canonico.ts` aprendiera a serializarlas, este comprobador
 * se pondría rojo y lo que habría que hacer no es arreglarlo: es volver a pensar el diseño.
 */
const conTipada = { ...mundo, cuerpos: new Int32Array(4) } as unknown;
comprobar(
  'y una lista tipada metida dentro SIGUE sin canonizar: por eso la arena se deriva',
  porQueNoEsCanonico(conTipada) !== null,
  porQueNoEsCanonico(conTipada) ?? 'canonizó, y no debería',
);

// ---------------------------------------------------------------------------
// ESCALÓN 2 · LA ARENA CONTESTA LO QUE DICE
// ---------------------------------------------------------------------------

paso('La arena derivada, y lo que contesta');

const arena = arenaDe(mundo);

let enCajones = 0;
let peorCajon = 0;
for (const c of arena.cajones) {
  enCajones += c.length;
  if (c.length > peorCajon) peorCajon = c.length;
}
console.log(
  `  ${String(arena.cajones.length)} cajones · media ${(enCajones / Math.max(1, arena.cajones.length)).toFixed(1)} cuerpos · ` +
    `peor ${String(peorCajon)} · pisable ${String(arena.pisable.length)} B · cuerpos ${(arena.cuerpos.length * 4 / 1024).toFixed(1)} kB`,
);

/*
 * El índice tiene que apuntar CADA cuerpo al menos una vez. Un índice vacío no da error: da
 * un mundo sin obstáculos, que se atraviesa tan tranquilo y en el que todas las huellas
 * coinciden entre motores.
 */
comprobar('el índice apunta todos los cuerpos, y alguno en más de un cajón', enCajones >= mundo.cuerpos.length, {
  enCajones,
  cuerpos: mundo.cuerpos.length,
});
comprobar('y ningún cajón se queda con la mitad del tablero dentro', peorCajon < 100, { peorCajon });

const medio = (v: number): number => Math.round(v * UNO);
comprobar('dentro del tablero hay piso', hayPiso(arena, medio(LADO / 2), medio(-LADO / 2)));
comprobar('y fuera no', !hayPiso(arena, medio(-500), 0));
comprobar('muy lejos tampoco', !hayPiso(arena, medio(99999), medio(-99999)));

const primero = mundo.cuerpos[0] as Cuerpo;
comprobar(
  'no se puede estar dentro de un cuerpo',
  !sePuedeEstar(arena, medio((primero.x0 + primero.x1) / 2), medio((primero.z0 + primero.z1) / 2), medio(0.4)),
);

// ---------------------------------------------------------------------------
// ESCALÓN 3 · EL PASEO, CON EL SUELO DELANTE
// ---------------------------------------------------------------------------

paso('Un paseo largo, y que se haya chocado de verdad');

const paseo = pasear();
console.log(
  `  ${String(PASOS)} pasos · parado por un cuerpo ${String(paseo.porCuerpo)} · por el borde ${String(paseo.porBorde)} · ` +
    `resbalando ${String(paseo.resbalados)} · ` +
    `acaba en x=${(paseo.x / UNO).toFixed(2)} z=${(paseo.z / UNO).toFixed(2)}`,
);

/*
 * LOS SUELOS. Sin ellos, un paseante al que no para nada da la misma huella en los dos motores
 * —la de no tocar nada— y el comprobador entero sale verde sin vigilar una sola colisión.
 */
comprobar('a los CUERPOS los ha tropezado de verdad', paseo.porCuerpo >= 50, { porCuerpo: paseo.porCuerpo });
comprobar('y el BORDE del tablero también lo ha parado', paseo.porBorde >= 20, { porBorde: paseo.porBorde });
comprobar('y ha resbalado pegado a algo, que es la otra mitad', paseo.resbalados >= 50, {
  resbalados: paseo.resbalados,
});
comprobar('y no se ha salido del tablero ni una vez', paseo.fuera === 0, { fuera: paseo.fuera });
comprobar('y se ha movido: no está donde nació', paseo.x !== Math.round((LADO / 2) * UNO), { x: paseo.x });

// ---------------------------------------------------------------------------
// ESCALÓN 4 · EL MISMO PASEO, EN NODE Y EN HERMES
// ---------------------------------------------------------------------------

paso('El mismo paseo, ejecutado en Node y en Hermes');

function dondeEstaHermes(): string | null {
  const carpeta = path.join(REPO, 'node_modules', 'hermes-engine-cli');
  const candidato =
    process.platform === 'win32'
      ? path.join(carpeta, 'win64-bin', 'hermes.exe')
      : process.platform === 'darwin'
        ? path.join(carpeta, 'osx-bin', 'hermes')
        : path.join(carpeta, 'linux64-bin', 'hermes');
  return fs.existsSync(candidato) ? candidato : null;
}

const hermes = dondeEstaHermes();
comprobar(
  'el intérprete de Hermes está instalado',
  hermes !== null,
  'falta `hermes-engine-cli`. SIN ÉL ESTO NO COMPARA DOS MOTORES, y es la mitad de lo que ' +
    'este guión afirma: se pone rojo en vez de saltárselo.',
);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mundo-'));
const entrada = path.join(dir, 'entrada.ts');
const crudo = path.join(dir, 'crudo.js');

/*
 * Se empaqueta ESTE MISMO FICHERO. La entrada importa `pasear` de aquí y escribe su resultado;
 * así lo que corre en Hermes es el mismo código que acaba de correr en proceso, y no una copia
 * que alguien tendrá que acordarse de actualizar.
 */
fs.writeFileSync(
  entrada,
  `import { pasear } from ${JSON.stringify(path.join(AQUI, 'paseo-del-banco.ts').replace(/\\/g, '/'))};\n` +
    'const r = pasear();\n' +
    'const linea = JSON.stringify(r);\n' +
    "if (typeof print === 'function') print(linea); else console.log(linea);\n",
  'utf8',
);

let paqueteListo = false;
if (hermes !== null) {
  const esbuild = path.join(REPO, 'node_modules', 'esbuild', 'bin', 'esbuild');
  const hecho = spawnSync(
    process.execPath,
    [esbuild, entrada, '--bundle', '--format=iife', '--target=es2015', '--platform=neutral', `--outfile=${crudo}`],
    { encoding: 'utf8' },
  );
  paqueteListo = hecho.status === 0;
  comprobar('el paseo se empaqueta para los dos motores', paqueteListo, hecho.stderr.slice(0, 500));

  /*
   * ═══ Y `class` SE BAJA A FUNCIONES, COMO EN `verify:determinismo` ═══
   *
   * Hermes 0.12 no entiende `class`, ni declarada ni como expresión, y esbuild no sabe
   * bajarla («not supported yet», lo dice él). Aquí la clase la trae `fijo.ts`, que declara
   * `class FueraDeRango extends Error` — o sea que el fichero que existe para que la
   * aritmética sea igual en los dos motores era el que impedía ejecutarla en el segundo.
   *
   * Un solo complemento y no un preset: cuanto menos se reescriba, menos posibilidades hay
   * de que lo que se compare sea el transpilador. Y la pasada se hace UNA VEZ, sobre el
   * paquete que ejecutan LOS DOS: si Node corriera el original y Hermes el transformado, una
   * diferencia entre ficheros explicaría una diferencia entre motores y esto estaría midiendo
   * a Babel.
   */
  if (paqueteListo) {
    const antes = fs.readFileSync(crudo, 'utf8');
    comprobar('el paquete crudo trae alguna `class`, o esta pasada sobra', /\bclass\s/.test(antes), {
      letras: antes.length,
    });
    const NOMBRE_DEL_COMPLEMENTO = '@babel/plugin-transform-classes';
    const bajarClases = (await import(NOMBRE_DEL_COMPLEMENTO)) as { default: unknown };
    const babel = await import('@babel/core');
    const transformado = babel.transformFileSync(crudo, {
      babelrc: false,
      configFile: false,
      compact: false,
      plugins: [bajarClases.default as babel.PluginItem],
    });
    const codigo = transformado?.code ?? '';
    comprobar('y se bajan a funciones, que es lo único que Hermes 0.12 no entiende', codigo.length > 0);
    if (codigo.length > 0) fs.writeFileSync(crudo, codigo, 'utf8');
  }
}

if (paqueteListo && hermes !== null) {
  const enNode = spawnSync(process.execPath, [crudo], { encoding: 'utf8' });
  const enHermes = spawnSync(hermes, [crudo], { encoding: 'utf8' });
  comprobar('Node ejecuta el paquete sin caerse', enNode.status === 0, enNode.stderr.slice(0, 400));
  comprobar('Hermes ejecuta el paquete sin caerse', enHermes.status === 0, enHermes.stderr.slice(0, 400));
  const leer = (s: string): Paseo | null => {
    const linea = s.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(linea) as Paseo;
    } catch {
      return null;
    }
  };
  const a = leer(enNode.stdout);
  const b = leer(enHermes.stdout);
  comprobar('las dos tandas dicen algo', a !== null && b !== null, {
    node: enNode.stdout.slice(-200),
    hermes: enHermes.stdout.slice(-200),
  });
  if (a !== null && b !== null) {
    console.log(`  Node   · huella ${String(a.huella)} · cuerpo ${String(a.porCuerpo)} · borde ${String(a.porBorde)} · resbalando ${String(a.resbalados)}`);
    console.log(`  Hermes · huella ${String(b.huella)} · cuerpo ${String(b.porCuerpo)} · borde ${String(b.porBorde)} · resbalando ${String(b.resbalados)}`);
    /* El suelo otra vez, ahora del lado de fuera: un paquete que no choque no compara nada. */
    comprobar('al paseante del paquete también lo tropiezan los cuerpos', a.porCuerpo >= 50 && b.porCuerpo >= 50, {
      node: a.porCuerpo,
      hermes: b.porCuerpo,
    });
    comprobar('la huella del paseo es la MISMA en Node y en Hermes', a.huella === b.huella, {
      node: a.huella,
      hermes: b.huella,
    });
    comprobar(
      'y se chocaron las mismas veces contra lo mismo',
      a.porCuerpo === b.porCuerpo && a.porBorde === b.porBorde && a.resbalados === b.resbalados,
      {
        node: `${String(a.porCuerpo)}/${String(a.porBorde)}/${String(a.resbalados)}`,
        hermes: `${String(b.porCuerpo)}/${String(b.porBorde)}/${String(b.resbalados)}`,
      },
    );
    comprobar('y el paquete da lo mismo que el código sin empaquetar', a.huella === paseo.huella, {
      empaquetado: a.huella,
      enProceso: paseo.huella,
    });
  }
}

fs.rmSync(dir, { recursive: true, force: true });

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  process.exit(1);
}

console.log(`${String(hechas)} comprobaciones`);
console.log('\nEl mundo declarado es contrato —canoniza, se puede comparar y congelar— y la arena que');
console.log('se deriva de él contesta lo mismo en Node y en Hermes: el mismo paseo se para en los');
console.log('mismos sitios y acaba en el mismo punto. Por el cable no va ni un byte de todo esto.');
