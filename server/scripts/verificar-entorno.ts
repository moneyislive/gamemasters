/**
 * Lo que el código lee del entorno, y lo que el despliegue declara.
 *
 *   npm run verify:entorno
 *
 * POR QUÉ EXISTE. `render.yaml` declaraba `UPLOADS_DIR`, la sincronización del
 * blueprint fue rechazada por otro motivo, y la variable nunca llegó a crearse.
 * Nadie se entera: el servidor arranca igual, las fotos y los avatares 3D se
 * escriben en el sistema de ficheros efímero, y desaparecen en el siguiente
 * despliegue. Días después, sin relación aparente con nada.
 *
 * Y AL REVÉS TAMBIÉN IMPORTA: una variable declarada que ya nadie lee es basura
 * que alguien rellenará con cuidado para nada.
 *
 * LO QUE NO EXIGE. Muchas variables son opcionales por diseño —cada función
 * comprueba si tiene lo suyo y se apaga sola diciéndolo— así que esto no obliga
 * a declararlas todas: obliga a que las que el despliegue TIENE que traer estén,
 * y avisa de las demás sin tumbar nada.
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${String(detalle).slice(0, 300)}`}`);
}

/** Recorre server/src recogiendo cada variable de entorno que se lee. */
function leidasPorElCodigo(): Set<string> {
  const encontradas = new Set<string>();
  const recorrer = (dir: string): void => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        recorrer(ruta);
        continue;
      }
      if (!entrada.name.endsWith('.ts')) continue;
      const texto = fs.readFileSync(ruta, 'utf8');
      for (const m of texto.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) {
        encontradas.add(m[1] as string);
      }
      // Las que se leen por nombre dinámico, con su ayudante.
      for (const m of texto.matchAll(/(?:listaDeEntorno|delEntorno)\('([A-Z_][A-Z0-9_]*)'\)/g)) {
        encontradas.add(m[1] as string);
      }
      /*
       * Y LAS QUE SE LEEN POR CORCHETE, pero solo el patrón exacto:
       * `const NOMBRE = 'VARIABLE'` seguido de `process.env[NOMBRE]`.
       *
       * Es como lee `secreto.ts` la clave que firma TODAS las sesiones, y
       * ningún `process.env.NOMBRE` la encuentra: la primera versión de este
       * comprobador la dio por muerta y pidió retirarla del despliegue.
       *
       * Y se acota a ese patrón porque la versión siguiente, que recogía
       * cualquier literal en mayúsculas del fichero, empezó a inventarse
       * variables: cogía prefijos como `OIDC_ISS_` y constantes como `SHA256`.
       * Un comprobador que acusa de más se acaba desactivando igual que uno que
       * no ve nada.
       */
      for (const uso of texto.matchAll(/process\.env\[([A-Za-z_$][\w$]*)\]/g)) {
        /*
         * SIN EXPRESION REGULAR, y no por gusto: construirla dentro de un
         * literal de plantilla se comia las barras —`\s` se resuelve a `s`— y
         * la busqueda quedaba en «consts+…», que no encuentra nada nunca. Un
         * comprobador que no encuentra nada no falla: aprueba.
         */
        const marca = `const ${uso[1]} = '`;
        const donde = texto.indexOf(marca);
        if (donde !== -1) {
          const resto = texto.slice(donde + marca.length);
          const nombre = resto.slice(0, resto.indexOf("'"));
          if (/^[A-Z_][A-Z0-9_]*$/.test(nombre)) encontradas.add(nombre);
        }
      }
    }
  };
  recorrer(path.join(REPO, 'server', 'src'));
  return encontradas;
}

const declaradas = new Set(
  [...fs.readFileSync(path.join(REPO, 'render.yaml'), 'utf8').matchAll(/key: ([A-Z_]+)/g)].map(
    (m) => m[1] as string,
  ),
);
const documentadas = new Set(
  [...fs.readFileSync(path.join(REPO, '.env.example'), 'utf8').matchAll(/^([A-Z_][A-Z0-9_]*)=/gm)].map(
    (m) => m[1] as string,
  ),
);
const leidas = leidasPorElCodigo();

/**
 * Las que el DESPLIEGUE tiene que traer sí o sí.
 *
 * No son «todas las que se leen»: la mayoría son opcionales y su función se
 * apaga sola. Estas son las que, si faltan, o no arranca o hace algo peor que
 * no arrancar — como escribir en un disco que se borra.
 */
const IMPRESCINDIBLES = [
  'NODE_ENV', // de ella cuelgan seis comportamientos
  'PUBLIC_ORIGIN', // sin ella no arranca en producción
  'HOST', // en Render hay que abrir la escucha
  'UPLOADS_DIR', // sin ella las subidas van al disco efímero
  'MESAS_DIR', // sin ella cada despliegue mata las partidas de arcade en curso
  'APP_PASSWORD',
  'PLAYER_TOKEN_SECRET',
  'MONGODB_URI',
];

/**
 * Costuras de prueba: NO pueden estar en producción, así que tampoco se
 * declaran. `index.ts` se niega a arrancar si las encuentra.
 */
const PROHIBIDAS = ['OIDC_ISS_GOOGLE', 'OIDC_ISS_APPLE', 'SES_ENDPOINT'];

/** Las que no vienen del despliegue: las pone la plataforma o el propio Node. */
const AJENAS = ['PORT', 'NODE_VERSION', 'CHROME_PATH', 'CLIENT_DIR', 'DEFAULT_MODEL'];

console.log('\n· El despliegue trae lo que el código necesita');
for (const clave of IMPRESCINDIBLES) {
  comprobar(`render.yaml declara ${clave}`, declaradas.has(clave), [...declaradas].join(', '));
}

console.log('\n· Y las costuras de prueba NO se declaran');
for (const clave of PROHIBIDAS) {
  comprobar(`render.yaml NO declara ${clave}`, !declaradas.has(clave));
}

console.log('\n· Todo lo que se lee está documentado en .env.example');
/*
 * Documentado, no declarado: quien despliega en otro sitio necesita saber que
 * la variable existe aunque Render no la traiga. Una variable que solo vive en
 * el código es una que nadie configurará nunca.
 */
for (const clave of [...leidas].sort()) {
  if (AJENAS.includes(clave)) continue;
  // Las costuras de prueba NO se documentan: documentarlas es invitar a
  // ponerlas, y con ellas cualquiera se fabrica la identidad de quien quiera.
  if (PROHIBIDAS.includes(clave)) continue;
  comprobar(
    `${clave} aparece en .env.example`,
    documentadas.has(clave) || declaradas.has(clave),
    'se lee en el código y no está en ningún sitio donde alguien la vea',
  );
}

console.log('\n· Y no se declara nada que ya no se lea');
for (const clave of [...declaradas].sort()) {
  if (AJENAS.includes(clave)) continue;
  comprobar(
    `${clave} se sigue usando`,
    leidas.has(clave),
    'declarada en render.yaml y no la lee nadie: alguien la rellenará para nada',
  );
}

console.log('');
if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. El despliegue y el código hablan de lo mismo.`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
