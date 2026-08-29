/**
 * Que el tema por juego NO le ha cambiado un color a CLUEDO.
 *
 * ═══ POR QUÉ ESTA COMPROBACIÓN Y NO UN «lo he mirado» ═══
 *
 * Para que la Momia pudiera tener su propia paleta hubo que sacar los colores de
 * los `StyleSheet.create` de módulo —que se evalúan al importar, o sea antes de
 * que se sepa a qué se juega— y ponerlos en línea, calculados desde el tema. Eso
 * significa tocar `ui.tsx`, `barra.tsx`, `reloj.tsx`, `avisos.tsx` y las
 * pantallas compartidas, que es exactamente el código del que depende CLUEDO.
 *
 * La regla que manda dice que CLUEDO no puede cambiar de comportamiento, y eso
 * no se demuestra mirando capturas: dos verdes oscuros distintos son iguales en
 * una pantalla y distintos en un móvil a media luz. Se demuestra comprobando que
 * la cadena que se genera hoy es CARÁCTER A CARÁCTER la que estaba escrita a
 * mano antes.
 *
 * Y sale barato porque resultó que TODOS los `rgba(...)` que había esparcidos
 * eran un token de `tema.ts` con transparencia: 201,162,39 es `oro500`;
 * 31,18,12 es `caoba900`; 11,23,16 es `feltoscuro`; 179,64,47 es `peligro`;
 * 217,201,163 es `pergaminoTenue`; 109,26,42 es `burdeos700`; 140,35,55 es
 * `burdeos600`; 26,63,42 es `felt700`.
 *
 * ═══ CÓMO SE ROMPE A PROPÓSITO ═══
 *
 * Cámbiale un dígito a cualquier color de `tema.ts` y esto tiene que fallar
 * señalando cuál. Si se toca `tema-momia.ts`, no: esta comprobación no opina
 * sobre la Momia, solo sobre que CLUEDO siga donde estaba.
 *
 *   node app/src/comprobadores/verificar-tema.mjs
 *
 * ═══ Y AQUÍ ESTUVO DANDO UN VERDE FALSO ═══
 *
 * Durante un tiempo este fichero NO LEÍA NI UN FICHERO DEL PROYECTO. Tenía los
 * colores copiados a mano, la función `conAlfa` copiada a mano y la lista de
 * cadenas esperadas escrita a mano, así que lo único que comprobaba era que una
 * copia aplicada a unas constantes diera unas cadenas: aritmética entre valores
 * fijos. Se podía cambiar cualquier color de la app y esto seguía anunciando
 * «30 colores de CLUEDO intactos, carácter a carácter».
 *
 * El razonamiento de arriba —copiar lo ESPERADO para que no se mueva con lo
 * observado— era correcto y sigue intacto. Lo que faltaba era la otra mitad: que
 * lo OBSERVADO viniera del proyecto. Ahora `tema.ts` se carga y se ejecuta de
 * verdad, y `conAlfa` es la suya. Los valores esperados siguen escritos a mano.
 *
 * La otra mitad del fallo se veía peor: la comprobación de que la paleta de
 * CLUEDO llega por identidad se hacía sobre un TERNARIO escrito aquí mismo,
 * cuando la implementación real hace tiempo que es una tabla y ya conoce un
 * tercer juego. Comprobaba su propio juguete. Ahora se lee el fichero real y se
 * exige que las tres tablas por juego cubran exactamente los mismos juegos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(AQUI, '..');

/** Carga un módulo TypeScript sin dependencias y lo devuelve ejecutable. */
async function cargar(fichero) {
  const js = ts.transpileModule(fs.readFileSync(fichero, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js, 'utf8').toString('base64')}`);
}

/*
 * EL TEMA DE VERDAD, ejecutado. `tema.ts` no importa nada —ni React, ni React
 * Native— y esa propiedad no es casual: es lo que permite cargarlo aquí. Si
 * algún día alguien le mete un import, esto dejará de cargar; lo que hay que
 * hacer entonces es quitarle el import, no volver a copiar la tabla aquí.
 */
const tema = await cargar(path.join(SRC, 'tema.ts'));
const conAlfa = tema.conAlfa;
const COLOR_REAL = tema.color;

/**
 * Los colores de CLUEDO, copiados de `tema.ts`.
 *
 * COPIADOS Y NO IMPORTADOS, a conciencia: si esto importara `tema.ts`, cambiarle
 * un color allí cambiaría también lo que se espera aquí y la comprobación
 * pasaría siempre. Un valor esperado que se mueve solo con el valor observado no
 * comprueba nada. Estos son los de la versión que se jugó, escritos a mano.
 */
const CLUEDO = {
  feltoscuro: '#0b1710',
  felt700: '#1a3f2a',
  caoba900: '#1f120c',
  oro300: '#e8cf7f',
  oro400: '#d9b64a',
  oro500: '#c9a227',
  laton: '#b08d2e',
  burdeos700: '#6d1a2a',
  burdeos600: '#8c2337',
  pergamino: '#f1e5c9',
  pergaminoTenue: '#d9c9a3',
  peligro: '#b3402f',
};

/**
 * Cada cadena que estaba escrita a mano en un `StyleSheet`, con de dónde salía.
 *
 * La lista es el inventario del cambio: si mañana alguien mueve otro color a
 * `conAlfa`, su renglón va aquí y queda cubierto.
 */
const ESPERADO = [
  // ui.tsx
  ['ui.tsx  Marco oscuro (fondo)', 'caoba900', 0.72, 'rgba(31,18,12,0.72)'],
  ['ui.tsx  Marco oscuro (borde)', 'oro500', 0.35, 'rgba(201,162,39,0.35)'],
  ['ui.tsx  Marco peligro (fondo)', 'burdeos700', 0.24, 'rgba(109,26,42,0.24)'],
  ['ui.tsx  Sello (borde)', 'oro500', 0.6, 'rgba(201,162,39,0.6)'],
  ['ui.tsx  Ornamento (línea)', 'oro500', 0.35, 'rgba(201,162,39,0.35)'],
  ['ui.tsx  Botón (borde)', 'oro500', 0.55, 'rgba(201,162,39,0.55)'],
  ['ui.tsx  Botón (fondo)', 'oro500', 0.08, 'rgba(201,162,39,0.08)'],
  ['ui.tsx  Botón peligro (fondo)', 'burdeos600', 0.28, 'rgba(140,35,55,0.28)'],
  ['ui.tsx  Pie (regla)', 'oro500', 0.4, 'rgba(201,162,39,0.4)'],
  ['ui.tsx  Pie (marca)', 'oro500', 0.75, 'rgba(201,162,39,0.75)'],
  ['ui.tsx  Pie (lema)', 'pergaminoTenue', 0.45, 'rgba(217,201,163,0.45)'],
  ['ui.tsx  Error (borde)', 'peligro', 0.6, 'rgba(179,64,47,0.6)'],
  ['ui.tsx  Error (fondo)', 'peligro', 0.15, 'rgba(179,64,47,0.15)'],
  // barra.tsx
  ['barra.tsx  Silueta de la barra', 'feltoscuro', 0.94, 'rgba(11,23,16,0.94)'],
  ['barra.tsx  Pestaña sin enfocar', 'pergaminoTenue', 0.68, 'rgba(217,201,163,0.68)'],
  // reloj.tsx
  ['reloj.tsx  Caja (borde)', 'oro500', 0.35, 'rgba(201,162,39,0.35)'],
  ['reloj.tsx  Caja (fondo)', 'feltoscuro', 0.55, 'rgba(11,23,16,0.55)'],
  ['reloj.tsx  Caja apurada (borde)', 'peligro', 0.7, 'rgba(179,64,47,0.7)'],
  ['reloj.tsx  Caja apurada (fondo)', 'burdeos700', 0.22, 'rgba(109,26,42,0.22)'],
  ['reloj.tsx  Barra de progreso (pista)', 'oro500', 0.18, 'rgba(201,162,39,0.18)'],
  // avisos.tsx
  ['avisos.tsx  Degradado (arriba)', 'caoba900', 0.98, 'rgba(31,18,12,0.98)'],
  ['avisos.tsx  Degradado (abajo)', 'feltoscuro', 0.98, 'rgba(11,23,16,0.98)'],
  // pantallas compartidas
  ['personaje.tsx  Retrato sin foto', 'felt700', 0.6, 'rgba(26,63,42,0.6)'],
  ['perfil.tsx  Trofeo ganado (borde)', 'oro500', 0.55, 'rgba(201,162,39,0.55)'],
  ['perfil.tsx  Trofeo ganado (fondo)', 'oro500', 0.1, 'rgba(201,162,39,0.1)'],
  ['perfil.tsx  Trofeo vacío (borde)', 'oro500', 0.16, 'rgba(201,162,39,0.16)'],
  ['perfil.tsx  Trofeo vacío (fondo)', 'feltoscuro', 0.4, 'rgba(11,23,16,0.4)'],
  ['perfil.tsx  Rótulo de trofeo vacío', 'pergaminoTenue', 0.35, 'rgba(217,201,163,0.35)'],
  ['consejero.tsx  Campo (borde)', 'oro500', 0.4, 'rgba(201,162,39,0.4)'],
  ['consejero.tsx  Campo (fondo)', 'feltoscuro', 0.6, 'rgba(11,23,16,0.6)'],
];

let fallos = 0;

/*
 * PRIMERO: que los colores del proyecto sigan siendo los que se jugaron.
 *
 * Este es el eslabón que faltaba y el que convierte el fichero en una
 * comprobación. `CLUEDO` de arriba es lo ESPERADO, escrito a mano; `COLOR_REAL`
 * sale de EJECUTAR `tema.ts`. Cambiar un dígito allí pone esto rojo.
 */
if (!COLOR_REAL || typeof COLOR_REAL !== 'object') {
  console.error('✗ no se ha podido cargar `color` de tema.ts: sin eso aquí no se comprueba nada');
  fallos++;
}
if (typeof conAlfa !== 'function') {
  console.error('✗ no se ha podido cargar `conAlfa` de tema.ts');
  fallos++;
}
for (const [token, esperado] of Object.entries(CLUEDO)) {
  const real = COLOR_REAL?.[token];
  if (real === undefined) {
    console.error(`✗ tema.ts ya no tiene el color «${token}»`);
    fallos++;
  } else if (real !== esperado) {
    console.error(`✗ tema.ts · ${token}\n    se jugó con ${esperado}\n    y ahora es  ${real}`);
    fallos++;
  }
}

/* Y después, que cada cadena que estaba escrita a mano siga saliendo igual. */
for (const [donde, token, alfa, literal] of ESPERADO) {
  const hex = COLOR_REAL?.[token];
  if (!hex) {
    console.error(`✗ ${donde}: el token «${token}» no existe en tema.ts`);
    fallos++;
    continue;
  }
  const salida = conAlfa(hex, alfa);
  if (salida !== literal) {
    console.error(`✗ ${donde}\n    esperaba ${literal}\n    y sale   ${salida}`);
    fallos++;
  }
}

/*
 * ═══ LAS TRES TABLAS POR JUEGO CUBREN LOS MISMOS JUEGOS ═══
 *
 * `tema-juego.ts` reparte lo propio de cada juego en tres tablas: `PALETAS` (los
 * colores), `FONDOS` (el degradado de pantalla) y `ORNAMENTOS` (el signo del
 * divisor). Son tres porque son tres cosas distintas, y por eso mismo se pueden
 * quedar a medias — que es un fallo peor que no tematizar nada: con la paleta
 * puesta y el fondo olvidado, los marcos y los botones salen del color nuevo
 * sobre el fieltro verde de CLUEDO, y la app parece a medio pintar en vez de mal
 * configurada.
 *
 * Se lee el fichero de verdad, y también se exige que CLUEDO NO esté en ninguna
 * de las tres: le tiene que llegar por el respaldo, que es lo que garantiza que
 * reciba el MISMO objeto de siempre y no una copia con los mismos valores.
 */
{
  const rutaTemaJuego = path.join(SRC, 'tema-juego.ts');
  const texto = fs.readFileSync(rutaTemaJuego, 'utf8');
  const fuente = ts.createSourceFile('tema-juego.ts', texto, ts.ScriptTarget.Latest, true);

  /** Las claves de un `const X = { … }` de nivel de módulo, o null si no está. */
  const clavesDe = (nombre) => {
    let claves = null;
    for (const sent of fuente.statements) {
      if (!ts.isVariableStatement(sent)) continue;
      for (const d of sent.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || d.name.text !== nombre) continue;
        if (d.initializer && ts.isObjectLiteralExpression(d.initializer)) {
          claves = d.initializer.properties
            .filter((pr) => ts.isPropertyAssignment(pr) && pr.name)
            .map((pr) => pr.name.getText().replace(/['"]/g, ''));
        }
      }
    }
    return claves;
  };

  const tablas = [['PALETAS', clavesDe('PALETAS')], ['FONDOS', clavesDe('FONDOS')], ['ORNAMENTOS', clavesDe('ORNAMENTOS')]];
  for (const [nombre, claves] of tablas) {
    if (claves === null) {
      console.error(`✗ tema-juego.ts ya no tiene la tabla «${nombre}»: el reparto por juego ha cambiado de forma`);
      fallos++;
    }
  }
  const conClaves = tablas.filter((t) => t[1] !== null);
  if (conClaves.length === tablas.length) {
    const referencia = conClaves[0][1];
    for (const [nombre, claves] of conClaves.slice(1)) {
      const faltan = referencia.filter((j) => !claves.includes(j));
      const sobran = claves.filter((j) => !referencia.includes(j));
      if (faltan.length || sobran.length) {
        console.error(
          `✗ «${nombre}» no cubre los mismos juegos que «${conClaves[0][0]}»` +
            (faltan.length ? `\n    le faltan: ${faltan.join(', ')}` : '') +
            (sobran.length ? `\n    le sobran: ${sobran.join(', ')}` : '') +
            '\n    un juego con paleta y sin fondo sale a medio pintar, que engaña más que no tematizarlo',
        );
        fallos++;
      }
    }
    if (referencia.includes('cluedo')) {
      console.error('✗ una tabla por juego incluye «cluedo»: tiene que llegarle por el respaldo, para que sea el MISMO objeto');
      fallos++;
    }
    console.log(`✓ Las tres tablas por juego cubren los mismos: ${referencia.join(', ')}.`);
  }

  /* Y que el respaldo siga siendo el de CLUEDO en los tres sitios. */
  const RESPALDOS = [['la paleta', '?? color'], ['el fondo', '?? fondoMesa'], ['el ornamento', '?? ']];
  for (const [que, marca] of RESPALDOS) {
    if (!texto.includes(marca)) {
      console.error(`✗ ${que} ya no cae en el respaldo de CLUEDO: su tema dejaría de ser el de siempre`);
      fallos++;
    }
  }
}

if (fallos > 0) {
  console.error(`\n${fallos} comprobacion(es) del tema han fallado. Eso rompe la regla que manda.`);
  process.exit(1);
}
console.log(
  `✓ ${Object.keys(CLUEDO).length} colores leídos de tema.ts y ${ESPERADO.length} cadenas, carácter a carácter.`,
);
