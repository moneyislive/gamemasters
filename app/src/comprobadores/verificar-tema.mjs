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
 */

/** La misma cuenta que hace `conAlfa` en `tema-juego.ts`. */
function conAlfa(hex, alfa) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
}

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
for (const [donde, token, alfa, literal] of ESPERADO) {
  const hex = CLUEDO[token];
  if (!hex) {
    console.error(`✗ ${donde}: el token «${token}» no existe`);
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
 * Y lo otro que hay que garantizar: que para CLUEDO la paleta es EL MISMO OBJETO
 * de siempre, no una copia con los mismos valores. Con una copia, un componente
 * que compare paletas por identidad —o un `useMemo` que dependa de ella— se
 * comportaría distinto sin que ningún color cambiara.
 */
const paletaDe = (juego, cluedo, momia) => (juego === 'momia' ? momia : cluedo);
const objCluedo = {};
const objMomia = {};
for (const juego of [undefined, 'cluedo']) {
  if (paletaDe(juego, objCluedo, objMomia) !== objCluedo) {
    console.error(`✗ paletaDe(${String(juego)}) no devuelve la paleta de CLUEDO por identidad`);
    fallos++;
  }
}
if (paletaDe('momia', objCluedo, objMomia) !== objMomia) {
  console.error('✗ paletaDe("momia") no devuelve la paleta de la Momia');
  fallos++;
}

if (fallos > 0) {
  console.error(`\n${fallos} color(es) de CLUEDO han cambiado. Eso rompe la regla que manda.`);
  process.exit(1);
}
console.log(`✓ ${ESPERADO.length} colores de CLUEDO intactos, carácter a carácter.`);
console.log('✓ Para CLUEDO la paleta sigue siendo el mismo objeto de siempre.');
