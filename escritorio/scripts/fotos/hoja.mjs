/**
 * LA HOJA DEL PROTOCOLO DE FOTOS (plan del detalle de la ciudad, §8): compara fotos del protocolo una a una, da
 * los números con los que se juzga y una hoja «antes | después» para mirar.
 *
 *   node escritorio/scripts/fotos/hoja.mjs ANTES DESPUES [opciones]      dos tandas, foto a foto por el nombre
 *   node escritorio/scripts/fotos/hoja.mjs --recentrado TANDA [opciones]  la P de una tanda: antes contra después
 *   node escritorio/scripts/fotos/hoja.mjs --niveles TANDA [opciones]     N1 contra N3 dentro de una tanda
 *
 * Con dos tandas se emparejan los `.png` con el MISMO nombre (las máscaras de profundidad, `*-mascaraNN.png`, no
 * se comparan: se usan). Con `--recentrado`, dentro de TANDA, cada `…-antes….png` con su `…-despues….png`, y sólo
 * cuenta lo que su `…-mascara40.png` pinta en blanco: lo que está a menos de 40 m («a menos de 40 m no cambia
 * nada», §8). Con `--niveles`, dentro de TANDA, cada `X-…-n1-<luz>….png` con su `X-…-n3-<luz>….png` (lo mismo
 * con N1 donde ANTES y N3 donde DESPUÉS): el criterio «N3 contra N1» de §8, que pide ≥ 12 % de píxeles distintos
 * en A-D y O y ≥ 5 % en E-G. Las demás letras (H-N, P, R) se miden y no se juzgan: §8 no les pone umbral. Por
 * cada par:
 *
 *   · `dif`: la diferencia media por canal, de 0 a 255, sólo en los píxeles que cuentan;
 *   · `cambian`: el % de esos píxeles cuya diferencia media pasa de 12;
 *   · `negro`: el % de negro puro (0,0,0) en DESPUÉS: un NaN o un material roto suelen pintar negro. §8 pide
 *     menos de 0,5 % en TODAS las fotos (con `--niveles`, en las dos: N1 y N3). La tanda «antes» ya lo pasa en H,
 *     M y N de madrugada (bajos de coches, cristales, el poste de una farola: 0,5-1,4 %; ver `POSICIONES.md`),
 *     y el acta de la ola 1 (§13, decisión 3) lo separa en dos:
 *       - el HEREDADO, el que la MISMA foto de «antes» ya pasaba, es un AVISO: sale con 3, no con 1. Es heredado
 *         sólo si es ESE negro: comparada píxel a píxel con su foto de «antes», el negro que allí no lo era no llega
 *         al tope, y el % no ha subido un tope entero. Si no, por mucho que «antes» ya pasara, es nuevo;
 *       - el NUEVO, el que en «antes» no pasaba del tope (o el que llega encima del heredado), es un FALLO (1).
 *     Con dos tandas, «antes» es ANTES. Con `--niveles` o `--recentrado` las dos fotos son de la misma tanda, y
 *     hace falta `--antes CARPETA` (la tanda «antes») para saber si ya estaba: sin ella, todo negro es un fallo,
 *     como antes de la decisión 3. Con ella, CADA foto se juzga sólo contra SU foto de «antes» (la N3 contra la N3
 *     de «antes», no contra la N1 de su tanda). Sobre la tanda «antes» misma: `--antes` esa misma carpeta;
 *   · `nuevo`: el % de negro puro en DESPUÉS que en ANTES no lo era, píxel a píxel: lo que ha roto ESTE cambio.
 *     También se juzga (< 0,5 %, fallo), y es el que distingue un material roto del negro de siempre aunque la
 *     foto ya pasara del tope. Sólo donde ANTES es de verdad el «antes» de DESPUÉS: con dos tandas, y con
 *     `--niveles` o `--recentrado` SIN `--antes`. Con `--antes`, ANTES es la otra foto del par (N1, o la P de antes
 *     del cruce), y un negro que N1 no tiene y la N3 ya tenía en «antes» no es nuevo: ahí manda la regla de arriba;
 *   · `magenta`: el % de magenta saturado en DESPUÉS (r y b > 240, g < 20): una textura que falta. §8 pide cero en
 *     TODAS (con `--niveles`, en las dos: N1 y N3), y se parte igual que el negro, con la MISMA regla y con tope
 *     «un píxel» (decisión del coordinador, remate de la 1b):
 *       - el HEREDADO, el que la MISMA foto de «antes» ya tenía, y en los mismos píxeles (ninguno magenta que allí
 *         no lo fuera), es un AVISO (3). Es el caso del rótulo rosa de la N de N1, 3-6 píxeles (`POSICIONES.md`);
 *       - el NUEVO, en una foto que en «antes» no tenía, sin `--antes`, o en un solo píxel que en «antes» no era
 *         magenta, es un FALLO (1).
 *
 * ═══ OPCIONES ═══
 *
 *   --mascara x0,y0,x1,y1[;…]  rectángulos (en píxeles de la foto, el final excluido) que NO cuentan. `panel` es el
 *                              panel de medidas del banco, 0-545 × 0-145 a 1280 × 720 (con `panel=0` ya no sale;
 *                              las fotos de antes de O1-FOTOS lo llevan).
 *   --profundidad              con dos tandas: en las fotos que tengan máscara de profundidad (la P), sólo cuenta lo
 *                              blanco. Con `--recentrado` va siempre.
 *   --ruido CARPETA            una SEGUNDA toma de ANTES (o de la tanda, con `--recentrado` o `--niveles`), sacada igual: por cada
 *                              foto se da también la diferencia entre las dos tomas, que es el ruido (lluvia,
 *                              parpadeos, vapor), y si la foto queda por debajo o por encima de él.
 *   --exigir-ruido             con `--ruido`: sale con 1 si alguna pasa del ruido (más 0,05 de tolerancia en `dif`).
 *                              Es lo que piden los paquetes que no deben cambiar nada visible, y la P.
 *   --hoja SALIDA.png          la hoja «antes | después», fila a fila, con el nombre encima.
 *   --json SALIDA.json         los números, para otro guion.
 *   --minimo N                 cuántos pares tiene que haber como poco (por omisión 1): cero pares mirados son cero
 *                              diferencias, y eso no es un verde.
 *   --antes CARPETA            con `--niveles` o `--recentrado`: la tanda «antes», para separar el negro y el magenta
 *                              heredados (aviso, 3) de los nuevos (fallo, 1). Cada foto se busca ahí por su nombre;
 *                              la que no está se juzga como nueva.
 *
 * ═══ SALIDA ═══
 *
 * 0 si todo cabe; 1 si alguna foto llega a 0,5 % de negro NUEVO o tiene magenta NUEVO (lo que su «antes» no tenía,
 * o no en esos píxeles; y, donde se juzga, el píxel a píxel de `nuevo`: los criterios que valen para TODAS las fotos,
 * §8), con `--niveles` si algún par con umbral se queda por debajo, o con `--exigir-ruido` si alguna pasa del ruido;
 * 3 si nada de eso pasa pero hay negro o magenta HEREDADOS (la foto de «antes» ya los tenía: aviso, acta §13
 * decisión 3 y remate de la 1b); 2 si no se puede mirar (sin
 * carpetas, menos pares que el mínimo, fotos de distinto tamaño, una máscara que falta o no deja ni un píxel). El
 * orden manda: 2 antes que 1, y 1 antes que 3.
 *
 * Usa el `sharp` que ya está en `node_modules` de la raíz: no instala nada.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PANEL = [[0, 0, 545, 145]];
const UMBRAL_DE_CAMBIO = 12;
const TOPE_DE_NEGRO = 0.5;
const TOLERANCIA_DEL_RUIDO = 0.05;
const ANCHO_DE_LA_HOJA = 640;
/** «N3 contra N1» (§8): el % mínimo de píxeles que cambian, por letra. Las que no están no tienen umbral. */
const UMBRAL_DE_NIVELES = { A: 12, B: 12, C: 12, D: 12, O: 12, E: 5, F: 5, G: 5 };

function fallar(mensaje) {
  console.error(`hoja: ${mensaje}`);
  process.exit(2);
}

const USO = 'uso: node hoja.mjs ANTES DESPUES | --recentrado TANDA | --niveles TANDA  [--antes TANDA_ANTES] [--mascara panel] [--profundidad] [--ruido TOMA2] [--exigir-ruido] [--hoja S.png] [--json S.json] [--minimo N]';
/** El código de salida del aviso: sólo hay negro heredado (acta §13, decisión 3). */
const SALIDA_DEL_AVISO = 3;

function leerArgumentos(argv) {
  const a = { carpetas: [], recentrado: null, niveles: null, antes: null, mascara: [], profundidad: false, ruido: null, exigirRuido: false, hoja: null, json: null, minimo: 1 };
  for (let k = 0; k < argv.length; k++) {
    const x = argv[k];
    const valor = () => {
      const v = argv[++k];
      if (v === undefined) fallar(`${x} necesita un valor`);
      return v;
    };
    if (x === '--mascara') {
      const v = valor();
      if (v === 'panel') a.mascara.push(...PANEL);
      else {
        for (const r of v.split(';')) {
          const n = r.split(',').map(Number);
          if (n.length !== 4 || !n.every(Number.isFinite) || n[2] <= n[0] || n[3] <= n[1]) fallar(`máscara ilegible: «${r}» (x0,y0,x1,y1)`);
          a.mascara.push(n);
        }
      }
    } else if (x === '--recentrado') a.recentrado = valor();
    else if (x === '--niveles') a.niveles = valor();
    else if (x === '--antes') a.antes = valor();
    else if (x === '--profundidad') a.profundidad = true;
    else if (x === '--ruido') a.ruido = valor();
    else if (x === '--exigir-ruido') a.exigirRuido = true;
    else if (x === '--hoja') a.hoja = valor();
    else if (x === '--json') a.json = valor();
    else if (x === '--minimo') {
      a.minimo = Number(valor());
      if (!Number.isInteger(a.minimo) || a.minimo < 1) fallar('--minimo tiene que ser un entero ≥ 1');
    } else if (x.startsWith('--')) fallar(`opción desconocida: ${x}`);
    else a.carpetas.push(x);
  }
  if (a.recentrado !== null && a.niveles !== null) fallar('--recentrado y --niveles no van juntos: una cosa por vez');
  const unaTanda = a.recentrado !== null || a.niveles !== null;
  if (unaTanda ? a.carpetas.length !== 0 : a.carpetas.length !== 2) fallar(USO);
  if (a.antes !== null && !unaTanda) fallar('--antes es para --niveles y --recentrado: con dos tandas, «antes» es la primera');
  for (const c of [...a.carpetas, ...[a.recentrado, a.niveles, a.ruido, a.antes].filter((c) => c !== null)]) {
    if (!fs.existsSync(c) || !fs.statSync(c).isDirectory()) fallar(`no existe la carpeta ${c}`);
  }
  if (a.exigirRuido && a.ruido === null) fallar('--exigir-ruido necesita --ruido');
  if (a.recentrado !== null) a.profundidad = true;
  return a;
}

const esMascara = (f) => /-mascara\d+/.test(f);
const pngs = (c) => fs.readdirSync(c).filter((f) => f.endsWith('.png'));

async function cargar(fichero) {
  const { data, info } = await sharp(fichero).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { px: data, ancho: info.width, alto: info.height };
}

/** La máscara de profundidad de una foto: la de su mismo nombre hasta la variante (`…-antes` → `…-mascara40`). */
function mascaraDe(f, carpetas) {
  const base = f.replace(/\.png$/, '');
  for (const c of carpetas) {
    if (c === null || !fs.existsSync(c)) continue;
    for (const g of pngs(c)) {
      if (!esMascara(g)) continue;
      const raiz = g.replace(/-mascara\d+.*$/, '');
      if (base === raiz || base.startsWith(`${raiz}-`)) return path.join(c, g);
    }
  }
  return null;
}

/**
 * Los pares a mirar: { nombre, a, b, ruido (la segunda toma de `a`, o null), mascaraDe (dónde buscar la máscara) }.
 */
function losPares(a) {
  if (a.recentrado !== null) {
    const d = a.recentrado;
    return pngs(d)
      .filter((f) => !esMascara(f) && /-antes(?=[-.])/.test(f))
      .sort()
      .map((f) => {
        const g = f.replace(/-antes(?=[-.])/, '-despues');
        /* El ruido de la P es el MAYOR de los dos: antes contra antes y después contra después (en N3 las luces
           de verdad de la ventana de después no salen iguales en dos tomas). */
        const ruido = a.ruido === null ? null : [[path.join(d, f), path.join(a.ruido, f)], [path.join(d, g), path.join(a.ruido, g)]];
        return { nombre: f.replace(/-antes(?=[-.])/, ''), a: path.join(d, f), b: path.join(d, g), ruido, donde: [d], clave: f };
      })
      .filter((p) => {
        if (fs.existsSync(p.b)) return true;
        console.log(`${path.basename(p.a)}: sin su «después»`);
        return false;
      });
  }
  if (a.niveles !== null) {
    const d = a.niveles;
    const N1 = /^([A-Z])-(.+)-n1-(madrugada|alba)(?=[-.])/;
    return pngs(d)
      .filter((f) => !esMascara(f) && N1.test(f))
      .sort()
      .map((f) => {
        const g = f.replace(/-n1-(madrugada|alba)(?=[-.])/, '-n3-$1');
        const letra = f.charAt(0);
        const ruido = a.ruido === null ? null : [[path.join(d, f), path.join(a.ruido, f)], [path.join(d, g), path.join(a.ruido, g)]];
        return { nombre: f.replace(/-n1-(madrugada|alba)(?=[-.])/, '-n1↔n3-$1'), a: path.join(d, f), b: path.join(d, g), ruido, donde: [d], clave: f, umbral: UMBRAL_DE_NIVELES[letra] ?? null, negroEnLasDos: true };
      })
      .filter((p) => {
        if (fs.existsSync(p.b)) return true;
        /* Las de móvil sólo van en N1 (§8): no tienen pareja, y no es una falta. */
        if (!/-movil(?=[-.])/.test(path.basename(p.a))) console.log(`${path.basename(p.a)}: sin su N3`);
        return false;
      });
  }
  const [antes, despues] = a.carpetas;
  const solos = pngs(antes).filter((f) => !esMascara(f) && !fs.existsSync(path.join(despues, f)));
  if (solos.length > 0) console.log(`sin pareja en ${despues}: ${solos.join(', ')}`);
  return pngs(antes)
    .filter((f) => !esMascara(f) && fs.existsSync(path.join(despues, f)))
    .sort()
    .map((f) => ({ nombre: f, a: path.join(antes, f), b: path.join(despues, f), ruido: a.ruido === null ? null : [[path.join(antes, f), path.join(a.ruido, f)]], donde: [despues, antes], clave: f }));
}

/** Qué píxeles cuentan: 1 sí, 0 no. Rectángulos fuera; con máscara de profundidad, sólo lo blanco. */
function cuentan(ancho, alto, rectangulos, profundidad) {
  const m = new Uint8Array(ancho * alto).fill(1);
  for (const [x0, y0, x1, y1] of rectangulos) {
    for (let y = Math.max(0, y0); y < Math.min(alto, y1); y++) for (let x = Math.max(0, x0); x < Math.min(ancho, x1); x++) m[y * ancho + x] = 0;
  }
  if (profundidad !== null) {
    if (profundidad.ancho !== ancho || profundidad.alto !== alto) return null;
    for (let i = 0; i < ancho * alto; i++) if (profundidad.px[i * 3] < 128) m[i] = 0;
  }
  return m;
}

function comparar(a, b, m) {
  let suma = 0;
  let cambian = 0;
  let negro = 0;
  let nuevo = 0;
  let negroA = 0;
  let magenta = 0;
  let magentaA = 0;
  let magentaNuevo = 0;
  let n = 0;
  for (let i = 0, p = 0; i < m.length; i++, p += 3) {
    if (m[i] === 0) continue;
    n++;
    const d = (Math.abs(a.px[p] - b.px[p]) + Math.abs(a.px[p + 1] - b.px[p + 1]) + Math.abs(a.px[p + 2] - b.px[p + 2])) / 3;
    suma += d;
    if (d > UMBRAL_DE_CAMBIO) cambian++;
    const aNegro = a.px[p] === 0 && a.px[p + 1] === 0 && a.px[p + 2] === 0;
    if (aNegro) negroA++;
    if (b.px[p] === 0 && b.px[p + 1] === 0 && b.px[p + 2] === 0) {
      negro++;
      if (!aNegro) nuevo++;
    }
    const aMagenta = esMagenta(a.px, p);
    if (aMagenta) magentaA++;
    if (esMagenta(b.px, p)) {
      magenta++;
      if (!aMagenta) magentaNuevo++;
    }
  }
  const pc = (x) => (n === 0 ? 0 : (100 * x) / n);
  return {
    pixeles: n,
    dif: n === 0 ? 0 : suma / n,
    cambian: pc(cambian),
    negro: pc(negro),
    nuevo: pc(nuevo),
    negroAntes: pc(negroA),
    magenta: pc(magenta),
    magentaNuevo: pc(magentaNuevo),
    magentaAntes: pc(magentaA),
  };
}

/** Magenta saturado: r y b > 240, g < 20 (una textura que falta). */
function esMagenta(px, p) {
  return px[p] > 240 && px[p + 1] < 20 && px[p + 2] > 240;
}

/**
 * Los dos criterios que valen para TODAS las fotos (§8), con la regla del heredado de la cabecera escrita UNA vez
 * para los dos. `pasa(pc)` es «llega al tope»: el negro, al 0,5 %; el magenta, con un solo píxel. `ahora`, `antes` y
 * `nuevo` son los campos de `comparar` (la foto de ahora como B y su «antes» como A): el % de ahora, el de «antes» y
 * el de ahora que en «antes» no lo era, píxel a píxel.
 */
const CRITERIOS = [
  { nombre: 'negro', tope: `≥ ${TOPE_DE_NEGRO} %`, pasa: (pc) => pc >= TOPE_DE_NEGRO, ahora: 'negro', antes: 'negroAntes', nuevo: 'nuevo', decimales: 2 },
  { nombre: 'magenta', tope: '> 0', pasa: (pc) => pc > 0, ahora: 'magenta', antes: 'magentaAntes', nuevo: 'magentaNuevo', decimales: 4 },
];

/**
 * Juzga un criterio en una foto: `null` si no llega al tope; si llega, `{ heredado, texto }`. `enAntes` es la
 * comparación de su foto de «antes» (como A) con ella (como B), o `null` si no hay «antes» con que compararla.
 * Heredado sólo si su «antes» ya llegaba al tope Y lo de ahora es lo mismo: lo que no estaba en «antes» píxel a píxel
 * no llega al tope, ni el % ha subido un tope entero (en el magenta, ni un píxel).
 */
function juzgar(c, pc, enAntes, sinAntes) {
  if (!c.pasa(pc)) return null;
  const d = c.decimales;
  const cifra = `${c.nombre} ${pc.toFixed(d)} %`;
  if (enAntes === null) return { heredado: false, texto: `${cifra}, ${sinAntes}` };
  const antes = enAntes[c.antes];
  const nuevo = enAntes[c.nuevo];
  if (!c.pasa(antes)) return { heredado: false, texto: `${cifra}, y ANTES ${antes.toFixed(d)} %` };
  if (c.pasa(nuevo) || c.pasa(pc - antes)) return { heredado: false, texto: `${cifra}, y ANTES ${antes.toFixed(d)} %, pero ${nuevo.toFixed(d)} % no lo era en ANTES` };
  return { heredado: true, texto: `${cifra}, y ANTES ya ${antes.toFixed(d)} % (nuevo ${nuevo.toFixed(d)} %)` };
}

/**
 * La MISMA foto en la tanda «antes» (`--antes`) contra la de ahora, con los mismos píxeles que cuentan: lo que da
 * `comparar` con la de «antes» como A (`negroAntes`, `magentaAntes`: lo que ya tenía; `nuevo`, `magentaNuevo`: lo
 * de AHORA que en ella no lo era, píxel a píxel). `null` si no hay `--antes`, la foto no está o tiene otro tamaño (y
 * entonces se juzga como nuevo). Comparar sólo los porcentajes no basta: una foto que ya pasaba del tope dejaría
 * pasar como «heredado» cualquier negro que llegara después, por grande que fuera o esté donde esté.
 */
async function laDeAntes(carpeta, fichero, actual, m) {
  if (carpeta === null) return null;
  const f = path.join(carpeta, path.basename(fichero));
  if (!fs.existsSync(f)) return null;
  const x = await cargar(f);
  if (x.ancho !== actual.ancho || x.alto !== actual.alto || x.ancho * x.alto !== m.length) return null;
  return comparar(x, actual, m);
}

function etiqueta(texto, ancho) {
  const limpio = texto.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  return Buffer.from(`<svg width="${ancho}" height="22"><rect width="100%" height="100%" fill="#000"/><text x="6" y="16" font-family="Consolas, monospace" font-size="13" fill="#cfe">${limpio}</text></svg>`);
}

async function main() {
  const a = leerArgumentos(process.argv.slice(2));
  const pares = losPares(a);
  if (pares.length < a.minimo) fallar(`${pares.length} pares comparables, y el mínimo es ${a.minimo}: mirar menos de lo pedido (o nada) no es un verde`);

  const filas = [];
  let malas = 0;
  let negras = 0;
  let heredadas = 0;
  const unaTanda = a.recentrado !== null || a.niveles !== null;
  let bajoElUmbral = 0;
  let sobreElRuido = 0;
  let errores = 0;
  for (const par of pares) {
    const f = par.nombre;
    const [x, y] = await Promise.all([cargar(par.a), cargar(par.b)]);
    if (x.ancho !== y.ancho || x.alto !== y.alto) {
      console.log(`${f}: TAMAÑOS DISTINTOS ${x.ancho}×${x.alto} y ${y.ancho}×${y.alto}`);
      errores++;
      continue;
    }
    let prof = null;
    let fichProf = null;
    if (a.profundidad) {
      fichProf = mascaraDe(par.clave, par.donde);
      if (fichProf !== null) prof = await cargar(fichProf);
      else if (a.recentrado !== null) {
        console.log(`${f}: sin máscara de profundidad (…-mascara40.png): no se puede mirar «a menos de 40 m»`);
        errores++;
        continue;
      }
    }
    const m = cuentan(x.ancho, x.alto, a.mascara, prof);
    if (m === null) {
      console.log(`${f}: la máscara ${path.basename(fichProf)} no tiene el tamaño de la foto`);
      errores++;
      continue;
    }
    const r = comparar(x, y, m);
    if (r.pixeles === 0) {
      console.log(`${f}: la máscara no deja ni un píxel: no se ha mirado nada`);
      errores++;
      continue;
    }
    const fila = { foto: f, a: par.a, b: par.b, ...r, mascaraDeProfundidad: fichProf === null ? null : path.basename(fichProf) };
    let texto = `${f}: dif ${r.dif.toFixed(2)} · cambian ${r.cambian.toFixed(1)} % · negro ${r.negro.toFixed(2)} % (nuevo ${r.nuevo.toFixed(2)} %) · magenta ${r.magenta.toFixed(3)} %`;
    if (fichProf !== null) texto += ` · a menos de 40 m: ${((100 * r.pixeles) / m.length).toFixed(0)} % de la foto`;
    /*
     * `nuevo` (el negro de B que en A no lo era, píxel a píxel) sólo se juzga donde A es el «antes» de B: con dos
     * tandas, y con `--niveles` o `--recentrado` SIN `--antes` (donde todo negro es fallo de todos modos). Con
     * `--antes`, A es la otra foto del par (N1 de N3, o la P de antes de la de después) y no su «antes»: el negro de
     * N3 que ya estaba en la N3 de «antes» salía como nuevo sólo porque N1 lo había perdido (lo vio la revisión 2).
     * Entonces cada foto se juzga sólo contra la suya de «antes» (`juzgadas`, abajo).
     */
    if (!(unaTanda && a.antes !== null) && r.nuevo >= TOPE_DE_NEGRO) {
      malas++;
      texto += `  ← NEGRO NUEVO (píxel a píxel contra ${unaTanda ? 'la otra foto del par' : 'ANTES'})`;
    }
    /*
     * Los absolutos (§8: negro < 0,5 % y magenta 0 en TODAS). Con `--niveles` las dos fotos son de la tanda y se juzgan
     * las dos. El que su foto de «antes» ya tenía, y es el mismo, es HEREDADO (aviso); el otro, NUEVO (fallo). Ver la
     * cabecera y `juzgar`.
     */
    const juzgadas = [];
    if (par.negroEnLasDos === true) juzgadas.push({ rotulo: 'N1 ', r: { negro: r.negroAntes, magenta: r.magentaAntes }, fichero: par.a, foto: x, antesDelPar: null });
    juzgadas.push({ rotulo: par.negroEnLasDos === true ? 'N3 ' : '', r, fichero: par.b, foto: y, antesDelPar: unaTanda ? null : r });
    const nuevasDelPar = { negro: [], magenta: [] };
    const heredadasDelPar = { negro: [], magenta: [] };
    for (const j of juzgadas) {
      if (!CRITERIOS.some((c) => c.pasa(j.r[c.ahora]))) continue;
      const enAntes = j.antesDelPar ?? (await laDeAntes(a.antes, j.fichero, j.foto, m));
      const sinAntes = a.antes === null ? 'sin --antes para saber si ya estaba' : 'sin esa foto en --antes';
      for (const c of CRITERIOS) {
        const juicio = juzgar(c, j.r[c.ahora], enAntes, sinAntes);
        if (juicio !== null) (juicio.heredado ? heredadasDelPar : nuevasDelPar)[c.nombre].push(`${j.rotulo}${juicio.texto}`);
      }
    }
    const hayNuevas = nuevasDelPar.negro.length + nuevasDelPar.magenta.length > 0;
    const hayHeredadas = heredadasDelPar.negro.length + heredadasDelPar.magenta.length > 0;
    for (const c of CRITERIOS) {
      if (nuevasDelPar[c.nombre].length > 0) texto += `  ← ${c.nombre.toUpperCase()} NUEVO ${c.tope} (${nuevasDelPar[c.nombre].join('; ')})`;
    }
    for (const c of CRITERIOS) {
      if (heredadasDelPar[c.nombre].length > 0) texto += `  · aviso: ${c.nombre} heredado ${c.tope} (${heredadasDelPar[c.nombre].join('; ')})`;
    }
    if (hayNuevas) negras++;
    else if (hayHeredadas) heredadas++;
    fila.negroNuevo = nuevasDelPar.negro;
    fila.negroHeredado = heredadasDelPar.negro;
    fila.magentaNuevo = nuevasDelPar.magenta;
    fila.magentaHeredado = heredadasDelPar.magenta;
    if (par.umbral !== undefined) {
      fila.umbral = par.umbral;
      if (par.umbral === null) texto += ' · sin umbral en §8';
      else if (r.cambian < par.umbral) {
        bajoElUmbral++;
        texto += `  ← POR DEBAJO DEL UMBRAL (N3 contra N1: ≥ ${par.umbral} % en §8)`;
      } else texto += ` · umbral ${par.umbral} %: cumple`;
    }
    if (par.ruido !== null) {
      let ruido = null;
      for (const [f1, f2] of par.ruido) {
        if (!fs.existsSync(f2)) {
          texto += ` · sin segunda toma de ${path.basename(f2)}`;
          ruido = null;
          break;
        }
        const [p, q] = await Promise.all([cargar(f1), cargar(f2)]);
        if (q.ancho !== p.ancho || q.alto !== p.alto || p.ancho !== x.ancho || p.alto !== x.alto) {
          texto += ` · la segunda toma de ${path.basename(f2)} tiene otro tamaño`;
          ruido = null;
          break;
        }
        const este = comparar(p, q, m);
        if (ruido === null || este.dif > ruido.dif) ruido = este;
      }
      if (ruido === null) errores++;
      else {
        fila.ruido = ruido;
        const pasa = r.dif > ruido.dif + TOLERANCIA_DEL_RUIDO;
        if (pasa) sobreElRuido++;
        texto += ` · ruido ${ruido.dif.toFixed(2)} (cambian ${ruido.cambian.toFixed(1)} %) · ${pasa ? 'SOBRE EL RUIDO' : '≤ ruido'}`;
      }
    }
    console.log(texto);
    filas.push(fila);
  }
  console.log(
    `pares mirados: ${filas.length} de ${pares.length}` +
      (a.ruido !== null ? ` · sobre el ruido: ${sobreElRuido}` : '') +
      (unaTanda && a.antes !== null ? '' : ` · con negro nuevo píxel a píxel dentro del par: ${malas}`) +
      ` · con negro ≥ ${TOPE_DE_NEGRO} % o magenta NUEVOS: ${negras} · sólo con negro o magenta heredados (aviso): ${heredadas}` +
      (a.niveles !== null ? ` · por debajo del umbral de N3 contra N1: ${bajoElUmbral} de ${filas.filter((f) => f.umbral !== null && f.umbral !== undefined).length} con umbral` : ''),
  );

  if (a.hoja !== null && filas.length > 0) {
    const W = ANCHO_DE_LA_HOJA;
    const comp = [];
    let yy = 0;
    for (const fila of filas) {
      const meta = await sharp(fila.a).metadata();
      const h = Math.round((W * meta.height) / meta.width);
      comp.push({ input: etiqueta(`${fila.foto}   ${a.niveles !== null ? 'N1 | N3' : 'antes | después'}   dif ${fila.dif.toFixed(2)} · cambian ${fila.cambian.toFixed(1)} %`, 2 * W), left: 0, top: yy });
      yy += 22;
      comp.push({ input: await sharp(fila.a).resize(W, h).toBuffer(), left: 0, top: yy });
      comp.push({ input: await sharp(fila.b).resize(W, h).toBuffer(), left: W, top: yy });
      yy += h;
    }
    await sharp({ create: { width: 2 * W, height: yy, channels: 3, background: '#000' } }).composite(comp).png().toFile(a.hoja);
    console.log(`hoja: ${a.hoja}`);
  }
  if (a.json !== null) fs.writeFileSync(a.json, `${JSON.stringify({ carpetas: a.carpetas, recentrado: a.recentrado, niveles: a.niveles, ruido: a.ruido, mascara: a.mascara, filas }, null, 2)}\n`);

  if (errores > 0) process.exit(2);
  if (malas > 0 || negras > 0 || bajoElUmbral > 0 || (a.exigirRuido && sobreElRuido > 0)) process.exit(1);
  if (heredadas > 0) {
    console.log(`aviso: ${heredadas} con negro o magenta heredados de «antes» (acta §13, decisión 3): sale con ${SALIDA_DEL_AVISO}`);
    process.exit(SALIDA_DEL_AVISO);
  }
}

await main();
