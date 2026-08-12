/**
 * Los dos arrastres de la app, comprobados.
 *
 *   node app/src/comprobadores/verificar-app.mjs
 *
 * POR QUÉ ESTÁ AQUÍ Y NO EN `app/scripts/`. Este agente solo posee `app/src/**`
 * y `app/app/**`, y en `app/app/**` no cabe: todo lo que hay ahí es una RUTA de
 * expo-router. Metro no empaqueta lo que nadie importa, así que un `.mjs`
 * suelto en `src/` no llega al binario. La línea para `app/package.json` va en
 * el informe, que ese fichero lo integra otra persona.
 *
 * POR QUÉ NO ES UN `grep` CON DELIRIOS DE GRANDEZA. La decisión de qué servidor
 * manda vive en `servidor-elegido.ts` sin importar nada de React Native
 * justamente para poder EJECUTARLA aquí: este comprobador la transpila con el
 * TypeScript que ya está instalado en `app/` y la llama de verdad. Una
 * comprobación que solo mirase el texto del fichero pasaría en verde con la
 * lógica invertida, que es exactamente el fallo que hay que cazar.
 *
 * Lo que sí se mira leyendo ficheros es el CABLEADO —que esa decisión esté
 * enchufada donde toca, que los desvíos apunten a rutas que existen y que el
 * enlace muerto de la tienda no se haya colado en la app—, porque eso no es
 * una función que se pueda llamar: es cómo encajan unos ficheros con otros, y
 * ahí es donde se rompen las cosas sin que nadie se entere.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(AQUI, '..');
const RUTAS = path.resolve(SRC, '..', 'app');

let hechas = 0;
const fallos = [];

function comprobar(que, condicion, detalle) {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`,
  );
}

function paso(titulo) {
  console.log(`\n· ${titulo}`);
}

function leer(fichero) {
  return fs.readFileSync(fichero, 'utf8');
}

/**
 * Carga un módulo TypeScript sin dependencias y lo devuelve ejecutable.
 *
 * Se transpila a una URL `data:` en vez de a un fichero temporal para no dejar
 * basura si la prueba se cae a la mitad.
 */
async function cargarModuloTs(fichero) {
  const js = ts.transpileModule(leer(fichero), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js, 'utf8').toString('base64')}`);
}

/**
 * El cuerpo de una función, para poder afirmar cosas de ELLA y no del fichero.
 *
 * La primera llave que aparece tras la firma NO es la del cuerpo: en
 * `cargarSesionGuardada(): Promise<{ token: ... }>` es la del tipo de retorno,
 * y quedarse con ella devolvía una firma disfrazada de cuerpo en la que, por
 * supuesto, no había ninguna de las llamadas que se buscan. Se salta lo que
 * esté dentro de paréntesis o de ángulos.
 */
function cuerpoDe(fuente, firma) {
  const inicio = fuente.indexOf(firma);
  if (inicio === -1) return null;
  let parentesis = 0;
  let angulos = 0;
  let abre = -1;
  for (let i = inicio + firma.length; i < fuente.length; i++) {
    const c = fuente[i];
    if (c === '(') parentesis++;
    else if (c === ')') parentesis--;
    else if (c === '<') angulos++;
    else if (c === '>' && fuente[i - 1] !== '=') angulos--;
    else if (c === '{' && parentesis === 0 && angulos === 0) {
      abre = i;
      break;
    }
  }
  if (abre === -1) return null;
  let nivel = 0;
  for (let i = abre; i < fuente.length; i++) {
    if (fuente[i] === '{') nivel++;
    else if (fuente[i] === '}') {
      nivel--;
      if (nivel === 0) return fuente.slice(abre, i + 1);
    }
  }
  return null;
}

/**
 * Qué parámetros de ruta lee de verdad una pantalla.
 *
 * Se miran los nombres DESESTRUCTURADOS de `useLocalSearchParams`, y no si el
 * fichero menciona la palabra por algún sitio: la primera versión de esta
 * comprobación hacía lo segundo y pasaba en verde con el destino arreglado para
 * ignorar el parámetro, porque el `import` de arriba y el nombre de una
 * variable cualquiera bastaban para engañarla.
 */
function parametrosQueLee(fuente) {
  const nombres = new Set();
  for (const m of fuente.matchAll(/const\s*\{([^}]*)\}\s*=\s*useLocalSearchParams/g)) {
    for (const trozo of m[1].split(',')) {
      const nombre = trozo.split(':')[0].trim();
      if (nombre) nombres.add(nombre);
    }
  }
  return nombres;
}

/**
 * Cada `router.replace(...)` de un desvío, con su destino y SUS parámetros.
 *
 * Se recorta el argumento de cada llamada equilibrando paréntesis en vez de
 * buscar destinos y parámetros por separado en todo el fichero. Una pantalla de
 * desvío tiene más de una salida —con cuenta a un sitio, sin cuenta a otro— y
 * al buscarlos sueltos se emparejaba cada destino con los parámetros de todos
 * los demás, con lo que la comprobación exigía a la portada que leyera el sobre
 * que solo se le manda a la pantalla de cuenta.
 */
function llamadasDeDesvio(fuente) {
  const salida = [];
  const marca = 'router.replace(';
  let i = fuente.indexOf(marca);
  while (i !== -1) {
    let nivel = 0;
    let fin = -1;
    for (let j = i + marca.length - 1; j < fuente.length; j++) {
      if (fuente[j] === '(') nivel++;
      else if (fuente[j] === ')') {
        nivel--;
        if (nivel === 0) {
          fin = j;
          break;
        }
      }
    }
    if (fin === -1) break;
    const argumento = fuente.slice(i + marca.length, fin);
    const literal = argumento.match(/^\s*'([^']+)'/);
    const conNombre = argumento.match(/pathname:\s*'([^']+)'/);
    salida.push({
      destino: literal ? literal[1] : conNombre ? conNombre[1] : null,
      // `[^{}\n]*` y no `\s*`: los parámetros se pasan a menudo tras un
      // condicional —`params: sobre ? { invitacion } : {}`— y con `\s*` no
      // casaba nada, de modo que no se miraba ni un parámetro y la
      // comprobación pasaba en verde por no haber hecho nada.
      params: [...argumento.matchAll(/params:[^{}\n]*\{([^}]*)\}/g)].flatMap((m) =>
        [...m[1].matchAll(/(\w+)\s*:/g)].map((p) => p[1]),
      ),
    });
    i = fuente.indexOf(marca, fin);
  }
  return salida;
}

/** De un `pathname` de expo-router al fichero que lo sirve, si existe. */
function ficheroDeRuta(ruta) {
  const limpia = ruta.replace(/^\/+/, '');
  const candidatos =
    limpia === ''
      ? ['index.tsx', 'index.ts']
      : [`${limpia}.tsx`, `${limpia}.ts`, `${limpia}/index.tsx`, `${limpia}/index.ts`];
  for (const c of candidatos) {
    const entero = path.join(RUTAS, c);
    if (fs.existsSync(entero)) return entero;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1 · La dirección compilada gana a la guardada cuando ha cambiado
// ---------------------------------------------------------------------------

paso('La decisión de servidor, ejecutada de verdad');

const CASA = 'http://192.168.1.40:5174';
const VIEJO = 'http://localhost:5174';
const NUEVO = 'https://harkania.com';

const { decidirServidor } = await cargarModuloTs(path.join(SRC, 'servidor-elegido.ts'));

comprobar('sin elección guardada se usa la compilada', (() => {
  const v = decidirServidor({ elegido: null, compiladoDeEntonces: null }, NUEVO);
  return v.servidor === NUEVO && v.olvidar === false && v.motivo === 'sin-eleccion';
})());

comprobar('quien elige a propósito en ESTA versión conserva su elección', (() => {
  const v = decidirServidor({ elegido: CASA, compiladoDeEntonces: NUEVO }, NUEVO);
  return v.servidor === CASA && v.olvidar === false && v.motivo === 'eleccion-de-esta-version';
})());

comprobar(
  'el fósil de las veladas ya jugadas (elección sin testigo) se descarta y se borra',
  (() => {
    const v = decidirServidor({ elegido: CASA, compiladoDeEntonces: null }, NUEVO);
    return v.servidor === NUEVO && v.olvidar === true && v.motivo === 'eleccion-sin-testigo';
  })(),
);

comprobar(
  'si la dirección compilada cambió desde que se eligió, manda la compilada',
  (() => {
    const v = decidirServidor({ elegido: CASA, compiladoDeEntonces: VIEJO }, NUEVO);
    return v.servidor === NUEVO && v.olvidar === true && v.motivo === 'eleccion-de-otra-version';
  })(),
);

comprobar(
  'una elección que apuntaba a la compilada de entonces tampoco sobrevive al cambio',
  (() => {
    const v = decidirServidor({ elegido: VIEJO, compiladoDeEntonces: VIEJO }, NUEVO);
    return v.servidor === NUEVO && v.olvidar === true;
  })(),
);

comprobar('elegir la misma dirección compilada no se confunde con no elegir', (() => {
  const v = decidirServidor({ elegido: NUEVO, compiladoDeEntonces: NUEVO }, NUEVO);
  return v.servidor === NUEVO && v.olvidar === false && v.motivo === 'eleccion-de-esta-version';
})());

// ---------------------------------------------------------------------------
// 2 · Y esa decisión está enchufada donde se arranca
// ---------------------------------------------------------------------------

paso('El cableado en api.ts');

const api = leer(path.join(SRC, 'api.ts'));
const cargar = cuerpoDe(api, 'export async function cargarSesionGuardada');
const fijar = cuerpoDe(api, 'export async function fijarServidor');

comprobar('api.ts importa la decisión de servidor-elegido', /from '\.\/servidor-elegido'/.test(api));
comprobar('se encontró el cuerpo de cargarSesionGuardada', cargar !== null);
comprobar('se encontró el cuerpo de fijarServidor', fijar !== null);

comprobar(
  'cargarSesionGuardada decide con decidirServidor',
  Boolean(cargar && cargar.includes('decidirServidor(')),
);
comprobar(
  'cargarSesionGuardada NO vuelve a coger la guardada a pelo',
  Boolean(cargar && !/almacen\.get\(CLAVE_SERVIDOR\)\s*\)?\s*\?\?/.test(cargar)),
  cargar?.slice(0, 200),
);
comprobar(
  'cargarSesionGuardada borra la elección caducada Y su testigo',
  Boolean(
    cargar &&
      cargar.includes('almacen.del(CLAVE_SERVIDOR)') &&
      cargar.includes('almacen.del(CLAVE_SERVIDOR_COMPILADO)'),
  ),
);
comprobar(
  'fijarServidor guarda el testigo junto a la elección',
  Boolean(
    fijar &&
      fijar.includes('almacen.set(CLAVE_SERVIDOR,') &&
      fijar.includes('almacen.set(CLAVE_SERVIDOR_COMPILADO, SERVIDOR_POR_DEFECTO)'),
  ),
);
comprobar(
  'el testigo se guarda con la dirección COMPILADA, no con la elegida',
  Boolean(fijar && !/almacen\.set\(CLAVE_SERVIDOR_COMPILADO,\s*servidor\)/.test(fijar)),
);

paso('Nadie guarda una elección de servidor que no ha hecho');

const entrar = leer(path.join(RUTAS, 'entrar.tsx'));
comprobar(
  'la pantalla de códigos solo fija el servidor si de verdad ha cambiado',
  /!==\s*api\.servidorActual\(\)[^\n]*\n?[^\n]*api\.fijarServidor|api\.fijarServidor/.test(entrar) &&
    /!==\s*api\.servidorActual\(\)/.test(entrar),
);

// ---------------------------------------------------------------------------
// 3 · Los desvíos de los enlaces llevan a alguna parte
// ---------------------------------------------------------------------------

paso('Los desvíos de harkania.com/i y harkania.com/e');

const DESVIOS = [
  { fichero: path.join(RUTAS, 'i', '[sobre].tsx'), parametro: 'sobre' },
  { fichero: path.join(RUTAS, 'e', '[codigo].tsx'), parametro: 'codigo' },
];

for (const desvio of DESVIOS) {
  const nombre = path.relative(RUTAS, desvio.fichero).replace(/\\/g, '/');
  comprobar(`${nombre}: el fichero de la ruta existe`, fs.existsSync(desvio.fichero));
  if (!fs.existsSync(desvio.fichero)) continue;
  const fuente = leer(desvio.fichero);

  comprobar(
    `${nombre}: lee su propio parámetro «${desvio.parametro}»`,
    parametrosQueLee(fuente).has(desvio.parametro),
    [...parametrosQueLee(fuente)],
  );
  comprobar(
    `${nombre}: desvía con replace y nunca con push (o el gesto de atrás hace bucle)`,
    fuente.includes('router.replace(') && !fuente.includes('router.push('),
  );

  const llamadas = llamadasDeDesvio(fuente);
  comprobar(`${nombre}: desvía a alguna parte`, llamadas.length > 0);
  for (const { destino, params } of llamadas) {
    comprobar(`${nombre}: el desvío dice a dónde va`, destino !== null);
    if (destino === null) continue;
    const fichero = ficheroDeRuta(destino);
    comprobar(`${nombre}: la ruta «${destino}» existe de verdad`, fichero !== null, destino);
    if (!fichero) continue;

    // Cada parámetro que se manda tiene que leerlo quien lo recibe. Un
    // parámetro que el destino tira no es un error de compilación ni un aviso:
    // simplemente no pasa nada, y eso no se descubre nunca.
    const lee = parametrosQueLee(leer(fichero));
    for (const p of params) {
      comprobar(
        `${nombre}: «${destino}» lee el parámetro «${p}» que se le manda`,
        lee.has(p),
        [...lee],
      );
    }
  }
}

paso('Las pantallas de destino no son un callejón sin salida');

for (const [nombre, fuente] of [
  ['entrar.tsx', entrar],
  ['cuenta.tsx', leer(path.join(RUTAS, 'cuenta.tsx'))],
]) {
  comprobar(
    `${nombre}: el botón de volver contempla que la pila esté vacía`,
    fuente.includes('router.canGoBack()'),
  );
  comprobar(
    `${nombre}: y en ese caso lleva a la portada`,
    /canGoBack\(\)[\s\S]{0,120}router\.replace\('\/'\)/.test(fuente),
  );
}

// ---------------------------------------------------------------------------
// 4 · El botón muerto de la App Store no vive en la app
// ---------------------------------------------------------------------------

paso('Ningún enlace de tienda con identificador de relleno');

function ficherosDe(dir) {
  const salida = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const entero = path.join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...ficherosDe(entero));
    else if (/\.(ts|tsx|mjs|js|json)$/.test(entrada.name)) salida.push(entero);
  }
  return salida;
}

const sospechosos = [...ficherosDe(SRC), ...ficherosDe(RUTAS)].filter(
  (f) => f !== fileURLToPath(import.meta.url),
);
const conRelleno = sospechosos.filter((f) => /apps\.apple\.com[^\s'"]*id0{6,}/.test(leer(f)));
comprobar(
  'nadie ha copiado a la app el `id0000000000` de las páginas de aterrizaje',
  conRelleno.length === 0,
  conRelleno.map((f) => path.relative(RUTAS, f)),
);

console.log('');
if (fallos.length === 0) {
  console.log(
    `✔ ${hechas} comprobaciones. La dirección compilada gana a los fósiles y los enlaces llevan a algún sitio.`,
  );
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
