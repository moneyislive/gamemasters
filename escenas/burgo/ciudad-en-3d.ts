/**
 * DE LA DESCRIPCIÓN DE LA CIUDAD A GEOMETRÍA DE `three`.
 *
 * ═══ POR QUÉ ESTO NO ESTÁ EN `ciudad.ts` NI EN `Burgo.tsx` ═══
 *
 * `escenas/burgo/ciudad.ts` no importa `three` a propósito: es aritmética, la corre un
 * guion de Node sin contexto de dibujo y por eso `verify:la-ciudad` puede medir veinte
 * ciudades en 1,2 s. Y `Burgo.tsx` ya tiene bastante con la partida. En medio falta una
 * pieza: convertir un `BultoPropio`, una `CintaPropia` y un rótulo en `BufferGeometry`.
 * Eso es esto, y también importa `three` PERO NO abre un contexto de dibujo, así que un
 * comprobador de Node puede pedir las geometrías y contarles los triángulos — que es
 * justo lo que no se ve mirando la ciudad, porque un prisma con dos triángulos de más
 * parece una decisión de arte.
 *
 * ═══ LA REGLA DURA: LA GEOMETRÍA TIENE LOS TRIÁNGULOS QUE DICE EL PRESUPUESTO ═══
 *
 * `BultoPropio.triangulos` no es una estimación: es lo que `montarLaCiudad` suma para
 * decidir si un montaje cabe, y lo que `verify:la-ciudad` compara contra
 * `TOPE_DE_LA_CIUDAD`. Si la escena construyera el bulto «a ojo» —una caja de 12 donde el
 * presupuesto dice 30, o un templete de 400 donde dice 112— el comprobador seguiría en
 * verde y el móvil se caería igual. Así que `geometriaDeUnBulto(n)` construye una
 * geometría con EXACTAMENTE `n` triángulos, y `verify:burgo-escena` lo vuelve a contar
 * para todas las cuentas que la ciudad usa y para las nueve alturas de torre.
 *
 * La forma sale del número, y no al revés, con una sola regla:
 *
 *     n = 2   → un cuadro tumbado (praderas, céspedes, agua, mantas de asfalto, losas)
 *     n = 10  → la caja sin fondo (tabiques, isletas, andenes, cantiles, prismas de L3)
 *     n ≥ 12  → la caja (12) + k BANDAS de ventanas (8 cada una) + r cornisas (2 cada una)
 *
 * con `k = ⌊(n − 12) / 8⌋` y `r = (n − 12 − 8k) / 2`. Las diez cuentas de la ciudad caen
 * solas: 16 = caja + 2 cornisas, 20 = caja + 1 banda, 30 = el prisma del plano (12 de
 * prisma, 16 de dos bandas y 2 de cornisa, §8), 40 la nave, 48 la escalera, 112 el
 * templete, 180 las gradas, y una torre de `p` plantas 12 + 8p + 20, que es 12 + 8(p+2) + 4.
 * O sea que una torre de seis plantas lleva ocho bandas: las seis de sus plantas y dos del
 * remate, que es exactamente lo que `triangulosDeUnaTorre` dice que se paga.
 *
 * Entre 2 y 10 no hay nada: ver `cuentaDeBulto`. Ocho triángulos eran cuatro paredes sin
 * techo, y desde el aire eso no es una caja sino un cajón abierto.
 *
 * ═══ LA BANDA SE PINTA CON EL COLOR DE LA INSTANCIA, MULTIPLICADO ═══
 *
 * Todo bulto va en una `InstancedMesh` con `instanceColor`, y `instanceColor` multiplica al
 * color por vértice. Así que el cuerpo se hornea BLANCO (1, 1, 1) —y sale del color que
 * pida el bulto— y la banda se hornea a `TONO_DE_LA_BANDA` (0,34), que sale del mismo color
 * a un tercio. Una sola geometría por cuenta de triángulos sirve para los 600 edificios sin
 * un material por color, y una ciudad entera son once llamadas de dibujo y no seiscientas.
 *
 * ═══ LA CAJA ESTÁ APOYADA, NO CENTRADA ═══
 *
 * `y` de un `BultoPropio` es la COTA DE LA BASE (`ciudad.ts` pone `y: 0` y `alto` la altura
 * total), así que la caja unitaria va de `y = 0` a `y = 1` y de −0,5 a 0,5 en `x` y en `z`.
 * Centrarla habría metido medio edificio bajo el asfalto, y el fallo se ve como «la ciudad
 * está hundida» y no como «la caja está mal».
 *
 * ═══ LOS RÓTULOS DEL TABLERO LEEN AL REVÉS QUE UNA PIEZA EN PIE ═══
 *
 * `guarismosDelPrecio` y `huecosDeLosEmblemas` publican el `giro` de una PIEZA que mira a
 * +Z. Una silueta TUMBADA no mira: se lee, y lo que hay que decidir es a dónde apunta su
 * «arriba». Quien mira el tablero está FUERA del anillo, así que el arriba de un precio
 * tiene que apuntar al centro. Con el cuarto de vuelta que tumba la silueta, eso es media
 * vuelta más que el giro de la pieza — y con la misma media vuelta la flecha del sentido de
 * la marcha apunta hacia adelante y no hacia atrás. Una sola regla, `giroDelRotulo`, y las
 * dos salen bien; sin ella, o los precios se leen desde la ciudad o la flecha señala al
 * revés, y las dos cosas parecen una decisión de arte.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAJA_DEL_GUARISMO, CONTORNOS_DEL_EMBLEMA, CONTORNOS_DEL_GUARISMO, LIENZO_DEL_ICONO } from '../iconos';
import { geometriaDeContornos } from '../formas';
import { CASILLAS, guarismosDelPrecio, huecosDeLosEmblemas } from './anillo-en-3d';
import type { BultoPropio, CintaPropia, Punto } from './ciudad';

/* ─────────────────────────────── Los bultos ─────────────────────────────── */

/** Lo que se apaga la banda de ventanas respecto del color del bulto. Multiplica, no sustituye. */
export const TONO_DE_LA_BANDA = 0.34;
/** Y lo que se aclara una cornisa, por lo mismo. */
export const TONO_DE_LA_CORNISA = 1.18;
/** Cuánto sobresale una banda de la cara, para que no pelee en profundidad con el muro. */
export const RESALTE_DE_LA_BANDA = 0.012;
/** Cuánto vuela una cornisa por delante de la cara. */
export const VUELO_DE_LA_CORNISA = 0.05;

/** La cuenta de triángulos de una caja con `k` bandas y `r` cornisas. */
export function triangulosDeUnaCaja(bandas: number, cornisas: number): number {
  return 12 + 8 * bandas + 2 * cornisas;
}

/** Las bandas y las cornisas que le tocan a una cuenta de triángulos de 12 en adelante. */
export function repartoDeLaCaja(triangulos: number): { readonly bandas: number; readonly cornisas: number } {
  const sobra = Math.max(0, triangulos - 12);
  const bandas = Math.floor(sobra / 8);
  return { bandas, cornisas: (sobra - bandas * 8) / 2 };
}

interface Cara {
  readonly a: readonly [number, number, number];
  readonly b: readonly [number, number, number];
  readonly c: readonly [number, number, number];
  readonly d: readonly [number, number, number];
  readonly tono: number;
}

/** Los cuatro puntos de un cuadro, en orden, con el tono con el que se hornea su color. */
function cuadro(a: readonly number[], b: readonly number[], c: readonly number[], d: readonly number[], tono: number): Cara {
  return { a: a as [number, number, number], b: b as [number, number, number], c: c as [number, number, number], d: d as [number, number, number], tono };
}

/** Una geometría de cuadros con normales calculadas y color por vértice. */
function geometriaDeCuadros(caras: readonly Cara[]): THREE.BufferGeometry {
  const posiciones = new Float32Array(caras.length * 6 * 3);
  const colores = new Float32Array(caras.length * 6 * 3);
  const normales = new Float32Array(caras.length * 6 * 3);
  let v = 0;
  for (const cara of caras) {
    const ux = cara.b[0] - cara.a[0];
    const uy = cara.b[1] - cara.a[1];
    const uz = cara.b[2] - cara.a[2];
    const wx = cara.c[0] - cara.a[0];
    const wy = cara.c[1] - cara.a[1];
    const wz = cara.c[2] - cara.a[2];
    let nx = uy * wz - uz * wy;
    let ny = uz * wx - ux * wz;
    let nz = ux * wy - uy * wx;
    const largo = Math.hypot(nx, ny, nz) || 1;
    nx /= largo;
    ny /= largo;
    nz /= largo;
    for (const p of [cara.a, cara.b, cara.c, cara.a, cara.c, cara.d]) {
      posiciones[v * 3] = p[0];
      posiciones[v * 3 + 1] = p[1];
      posiciones[v * 3 + 2] = p[2];
      colores[v * 3] = cara.tono;
      colores[v * 3 + 1] = cara.tono;
      colores[v * 3 + 2] = cara.tono;
      normales[v * 3] = nx;
      normales[v * 3 + 1] = ny;
      normales[v * 3 + 2] = nz;
      v++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normales, 3));
  g.computeBoundingSphere();
  return g;
}

/** Los cuatro cuadros laterales de un prisma entre las cotas `y0` e `y1`, a `radio` del eje. */
function anillo(y0: number, y1: number, radio: number, tono: number): Cara[] {
  const r = radio;
  return [
    cuadro([-r, y0, r], [r, y0, r], [r, y1, r], [-r, y1, r], tono),
    cuadro([r, y0, -r], [-r, y0, -r], [-r, y1, -r], [r, y1, -r], tono),
    cuadro([r, y0, r], [r, y0, -r], [r, y1, -r], [r, y1, r], tono),
    cuadro([-r, y0, -r], [-r, y0, r], [-r, y1, r], [-r, y1, -r], tono),
  ];
}

/**
 * UN CUADRO TUMBADO de lado `2r` a la cota `y`, mirando arriba o abajo.
 *
 * ═══ EL ORDEN DE LOS CUATRO PUNTOS DECIDE SI EL TECHO EXISTE ═══
 *
 * El material de los bultos es `MeshStandardMaterial` sin `side`, o sea `FrontSide`, o sea
 * que `three` TIRA las caras que se ven por detrás. Y «por detrás» lo decide el orden de los
 * puntos: la normal es `(b − a) × (c − a)`, así que para que una cara horizontal mire hacia
 * arriba hay que recorrerla en sentido antihorario VISTA DESDE ARRIBA, que en un eje `z` que
 * crece hacia el espectador es empezar por la esquina de `z` mayor.
 *
 * Este orden estuvo al revés y no falló nada: los prismas seguían teniendo sus doce
 * triángulos, `verify:burgo-escena` los contaba, la ciudad cabía en el presupuesto y desde el
 * suelo la manzana se veía entera, porque las paredes sí estaban bien. Lo único que pasaba es
 * que el techo se tiraba, y también el suelo de cada distrito, y el césped, y el agua, y las
 * plazas de aparcamiento — todo lo tumbado. Miguel lo vio a la primera desde el aire:
 * «prismas inacabados sin techo ni el resto de paredes». Contra eso hay ahora una lupa
 * cenital en `verify:burgo-escena`, porque contar triángulos nunca lo habría cazado.
 */
function tapa(y: number, radio: number, tono: number, arriba: boolean): Cara {
  const r = radio;
  return arriba ? cuadro([-r, y, r], [r, y, r], [r, y, -r], [-r, y, -r], tono) : cuadro([-r, y, -r], [r, y, -r], [r, y, r], [-r, y, r], tono);
}

const cacheDeBultos = new Map<string, THREE.BufferGeometry>();

/** Cuatro paredes y una tapa: lo menos que se puede mirar desde el aire sin verle el hueco. */
export const MINIMO_DE_UN_VOLUMEN = 10;

/**
 * LA CUENTA QUE DE VERDAD SE CONSTRUYE, que no es siempre la que se pide.
 *
 * Ocho triángulos son CUATRO PAREDES Y NADA MÁS: un anillo hueco por arriba y por abajo.
 * Desde el suelo pasa por una caja; desde el aire —que es como se mira este tablero— se le ve
 * el interior, y encima las dos paredes del fondo desaparecen, porque el material tira lo que
 * se ve por detrás. Eso no es un volumen: es un decorado de teatro.
 *
 * Así que la regla la pone la geometría y no quien la pide: **un bulto con altura se
 * construye cerrado por arriba, cueste lo que cueste**. Diez es lo mínimo que lo consigue; el
 * fondo se queda fuera porque se apoya en el suelo y no se ve nunca. Lo tumbado (`llano`) no
 * entra en el trato: una losa es una losa y le basta un cuadro.
 *
 * Quien pida menos de diez recibe diez, y esta función es lo que mantiene diciendo el mismo
 * número al presupuesto y a la geometría: de aquí salen la clave de la malla, la capacidad que
 * se reserva y los triángulos que `verify:burgo-escena` cuenta. Ese mismo guion exige
 * además que ningún bulto con altura declare menos, para que el presupuesto de `ciudad.ts` no
 * se quede corto por la promoción.
 */
export function cuentaDeBulto(triangulos: number, llano: boolean): number {
  const n = Math.max(2, Math.round(triangulos / 2) * 2);
  if (llano || n === 2) return n;
  return n < MINIMO_DE_UN_VOLUMEN ? MINIMO_DE_UN_VOLUMEN : n;
}

/** La clave de la caché (y de la malla instanciada) de un bulto: su cuenta, y si va tumbado. */
export function claveDelBulto(triangulos: number, llano: boolean): string {
  return `bulto-${String(cuentaDeBulto(triangulos, llano))}${llano ? '-llano' : ''}`;
}

/**
 * LA GEOMETRÍA UNITARIA DE UN BULTO DE `n` TRIÁNGULOS: apoyada en `y = 0`, de lado 1.
 *
 * `llano` es para los bultos SIN ALTURA —praderas, céspedes, agua, mantas de asfalto, losas
 * de sala—, y hace falta porque sus cuentas no son 2: el suelo de un distrito declara
 * `celdasX · celdasZ · 2`, que en el parque son 260 triángulos, «dos por celda». Construirlo
 * como una caja con treinta y un anillos de altura cero se ve exactamente igual (todo colapsa
 * al plano) pero es una mentira sobre lo que hay ahí; construirlo como una TIRA de `n/2`
 * cuadros gasta los mismos triángulos que el presupuesto ya contó y es lo que la cuenta decía.
 *
 * Se cachea por clave: la ciudad pone miles de bultos y hay poco más de una docena de cuentas
 * distintas. Quien la pida NO la suelta: las suelta `soltarLosBultos`.
 */
export function geometriaDeUnBulto(triangulos: number, llano = false): THREE.BufferGeometry {
  const n = cuentaDeBulto(triangulos, llano);
  const clave = claveDelBulto(n, llano);
  const hecha = cacheDeBultos.get(clave);
  if (hecha !== undefined) return hecha;
  const caras: Cara[] = [];
  if (llano && n > 2) {
    /* La tira: `n / 2` cuadros tumbados que reparten el ancho, todos a la cota de arriba. */
    const cuantos = n / 2;
    for (let k = 0; k < cuantos; k++) {
      const x0 = -0.5 + k / cuantos;
      const x1 = -0.5 + (k + 1) / cuantos;
      /* Antihorario visto desde arriba, como la tapa: si se recorre al revés, el distrito entero se tira. */
      caras.push(cuadro([x0, 1, 0.5], [x1, 1, 0.5], [x1, 1, -0.5], [x0, 1, -0.5], 1));
    }
  } else if (n === 2) {
    /* La losa suelta: una pradera, un forjado, una plaza de aparcamiento. Sólo se mira desde arriba. */
    caras.push(tapa(1, 0.5, 1, true));
  } else if (n === MINIMO_DE_UN_VOLUMEN) {
    /* Cuatro paredes y el techo. El fondo se lo come el suelo, y por eso no se paga. */
    caras.push(...anillo(0, 1, 0.5, 1), tapa(1, 0.5, 1, true));
  } else {
    caras.push(...anillo(0, 1, 0.5, 1), tapa(1, 0.5, 1, true), tapa(0, 0.5, 1, false));
    const { bandas, cornisas } = repartoDeLaCaja(n);
    /*
     * Las bandas se reparten por PLANTAS, no por gusto: la banda `m` de `k` ocupa el tercio
     * central de su planta. En una torre de seis plantas con ocho bandas eso deja las dos
     * de arriba como remate, que es lo que el presupuesto llama «remate» y cuesta 20.
     */
    for (let m = 0; m < bandas; m++) {
      const y0 = (m + 0.32) / bandas;
      const y1 = (m + 0.72) / bandas;
      caras.push(...anillo(y0, y1, 0.5 + RESALTE_DE_LA_BANDA, TONO_DE_LA_BANDA));
    }
    for (let m = 0; m < cornisas; m++) {
      /* La primera corona el remate; la segunda es el zócalo, que es lo que ancla el volumen al suelo. */
      const y = m === 0 ? 1 : 0.06;
      caras.push(tapa(y, 0.5 + VUELO_DE_LA_CORNISA, TONO_DE_LA_CORNISA, true));
    }
  }
  const g = geometriaDeCuadros(caras);
  cacheDeBultos.set(clave, g);
  return g;
}

/** Las cuentas de triángulos que la ciudad usa hoy. La comprueba `verify:burgo-escena`. */
export const CUENTAS_DE_BULTO: readonly number[] = [2, 10, 12, 16, 20, 30, 40, 48, 112, 180];

/** Suelta la caché de bultos. La escena la llama al desmontar. */
export function soltarLosBultos(): void {
  for (const g of cacheDeBultos.values()) g.dispose();
  cacheDeBultos.clear();
}

/* ─────────────────────────────── Las cintas ─────────────────────────────── */

/** La perpendicular unitaria del tramo de una polilínea en el punto `k`. */
function normalEn(puntos: readonly Punto[], k: number, cerrada: boolean): Punto {
  const n = puntos.length;
  const antes = puntos[(k - 1 + n) % n] as Punto;
  const este = puntos[k] as Punto;
  const luego = puntos[(k + 1) % n] as Punto;
  const primero = k === 0 && !cerrada;
  const ultimo = k === n - 1 && !cerrada;
  const dx = (ultimo ? este.x : luego.x) - (primero ? este.x : antes.x);
  const dz = (ultimo ? este.z : luego.z) - (primero ? este.z : antes.z);
  const largo = Math.hypot(dx, dz) || 1;
  return { x: -dz / largo, z: dx / largo };
}

/**
 * LA GEOMETRÍA DE UNA CINTA: dos triángulos por tramo, que es lo que su presupuesto dice.
 *
 * Si `alto` es cero es una alfombra (el sendero del parque, la pista del circuito, la línea
 * de meta); si no, es un PARAPETO en pie (el quitamiedos), y entonces la cinta no se tumba:
 * se levanta desde `y` hasta `y + alto` sobre la propia polilínea. Un quitamiedos tumbado a
 * media altura se ve flotando, y un quitamiedos a ras de suelo no se ve.
 */
export function geometriaDeUnaCinta(cinta: CintaPropia): THREE.BufferGeometry {
  const puntos = cinta.puntos;
  const n = puntos.length;
  const caras: Cara[] = [];
  const tramos = cinta.cerrada ? n : n - 1;
  const medio = cinta.ancho / 2;
  /*
   * CUÁNTOS CUADROS POR TRAMO, y por qué no siempre uno.
   *
   * El presupuesto de una cinta se declara por LARGO, no por vértices: el paso de un puente
   * dice «dos triángulos por cada doce unidades» aunque su polilínea sean dos puntos. Con un
   * cuadro por tramo, esa cinta dibujaba 2 triángulos donde el presupuesto contaba 28 —lo
   * cazó el juez que compara las dos cosas— y el que sobraba no se veía por ningún lado. Se
   * reparte: los cuadros declarados se REPARTEN entre los tramos —no uno por tramo, ni un
   * cociente redondeado, sino el reparto entero que suma exactamente lo declarado— y cada
   * tramo se parte en los suyos. No es sólo contabilidad; una cinta con más vértices se dobla
   * mejor en las curvas del circuito.
   */
  const cuadros = Math.max(tramos, Math.round(cinta.triangulos / 2));
  for (let k = 0; k < tramos; k++) {
    const a = puntos[k] as Punto;
    const b = puntos[(k + 1) % n] as Punto;
    const na = normalEn(puntos, k, cinta.cerrada);
    const nb = normalEn(puntos, (k + 1) % n, cinta.cerrada);
    const porTramo = Math.floor(((k + 1) * cuadros) / tramos) - Math.floor((k * cuadros) / tramos);
    for (let j = 0; j < porTramo; j++) {
      const t0 = j / porTramo;
      const t1 = (j + 1) / porTramo;
      const p0 = { x: a.x + (b.x - a.x) * t0, z: a.z + (b.z - a.z) * t0 };
      const p1 = { x: a.x + (b.x - a.x) * t1, z: a.z + (b.z - a.z) * t1 };
      const n0 = { x: na.x + (nb.x - na.x) * t0, z: na.z + (nb.z - na.z) * t0 };
      const n1 = { x: na.x + (nb.x - na.x) * t1, z: na.z + (nb.z - na.z) * t1 };
      if (cinta.alto > 0) {
        caras.push(cuadro([p0.x, cinta.y, p0.z], [p1.x, cinta.y, p1.z], [p1.x, cinta.y + cinta.alto, p1.z], [p0.x, cinta.y + cinta.alto, p0.z], 1));
        continue;
      }
      caras.push(
        cuadro(
          [p0.x - n0.x * medio, cinta.y, p0.z - n0.z * medio],
          [p1.x - n1.x * medio, cinta.y, p1.z - n1.z * medio],
          [p1.x + n1.x * medio, cinta.y, p1.z + n1.z * medio],
          [p0.x + n0.x * medio, cinta.y, p0.z + n0.z * medio],
          1,
        ),
      );
    }
  }
  const g = geometriaDeCuadros(caras);
  /* Las cintas van sin `instanceColor`: el color se hornea aquí, que son nueve en toda la ciudad. */
  const color = new THREE.Color(cinta.color);
  const atributo = g.getAttribute('color') as THREE.BufferAttribute;
  for (let i = 0; i < atributo.count; i++) atributo.setXYZ(i, color.r, color.g, color.b);
  atributo.needsUpdate = true;
  return g;
}

/* ─────────────────────────────── Los rótulos del tablero ─────────────────────────────── */

/** El giro de un rótulo TUMBADO a partir del giro de una pieza EN PIE. Ver la cabecera. */
export function giroDelRotulo(giroDeLaPieza: number): number {
  return giroDeLaPieza + Math.PI;
}

/** La tinta de un precio y la de un emblema: dos negros distintos, los dos del tablero. */
export const TINTA_DEL_PRECIO = '#4a4238';
export const TINTA_DEL_EMBLEMA = '#5b5145';
/** Lo que se alza un rótulo sobre la superficie de su casilla, para no pelear en profundidad. */
export const ALZA_DEL_ROTULO = 0.08;

/**
 * LA SILUETA DE UN GUARISMO, normalizada por `CAJA_DEL_GUARISMO` Y NO POR LA SUYA.
 *
 * Es la única regla que `iconos.ts` pide para los diez, y si se rompe no falla nada: sale un
 * precio con el `1` tan ancho como el `8` y los dígitos a alturas distintas. `formas.ts`
 * encaja por el lado mayor —que es lo que quieren los bienes y las cartas— así que aquí se
 * enhebra a mano: alto 1, ancho 0,75, centrada en la caja COMÚN.
 */
export function geometriaDeUnGuarismo(guarismo: string): THREE.BufferGeometry | null {
  const contornos = CONTORNOS_DEL_GUARISMO[guarismo];
  if (contornos === undefined) return null;
  const camino = new THREE.ShapePath();
  for (const tira of contornos) {
    if (tira.length < 6) continue;
    camino.moveTo(tira[0] as number, tira[1] as number);
    for (let i = 2; i + 1 < tira.length; i += 2) camino.lineTo(tira[i] as number, tira[i + 1] as number);
  }
  if (camino.subPaths.length === 0) return null;
  const formas = camino.toShapes();
  if (formas.length === 0) return null;
  const g = new THREE.ShapeGeometry(formas);
  const posicion = g.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (posicion === undefined || posicion.count === 0) {
    g.dispose();
    return null;
  }
  /* En SVG la `y` crece hacia abajo: sin darle la vuelta el precio sale cabeza abajo, y al reflejar hay que invertir el giro de cada triángulo. */
  g.scale(1, -1, 1);
  const indice = g.getIndex();
  if (indice !== null) {
    const a = indice.array as Uint16Array | Uint32Array;
    for (let i = 0; i + 2 < a.length; i += 3) {
      const t = a[i] as number;
      a[i] = a[i + 2] as number;
      a[i + 2] = t;
    }
    indice.needsUpdate = true;
  }
  const cx = CAJA_DEL_GUARISMO.x + CAJA_DEL_GUARISMO.ancho / 2;
  const cy = CAJA_DEL_GUARISMO.y + CAJA_DEL_GUARISMO.alto / 2;
  g.translate(-cx, cy, 0);
  g.scale(1 / CAJA_DEL_GUARISMO.alto, 1 / CAJA_DEL_GUARISMO.alto, 1);
  g.computeBoundingBox();
  return g;
}

/** Lo que ocupa el lienzo del icono, para saber si un guarismo se salió de su caja. */
export const LIENZO = LIENZO_DEL_ICONO;

export interface Rotulos {
  readonly geometria: THREE.BufferGeometry;
  readonly triangulos: number;
  readonly guarismos: number;
  readonly emblemas: number;
}

/**
 * TODOS LOS RÓTULOS DEL TABLERO EN UNA SOLA GEOMETRÍA.
 *
 * Los precios y los emblemas NO cambian con la partida —el precio de una casilla es del
 * reglamento y el emblema es del dibujo—, así que no hay ninguna razón para instanciarlos:
 * se funden una vez, con su color por vértice, y son UNA llamada de dibujo para los sesenta
 * y tantos dígitos y los doce emblemas. Instanciarlos habrían sido quince llamadas (una por
 * silueta distinta) a cambio de nada.
 */
export function geometriaDeLosRotulos(): Rotulos | null {
  const partes: THREE.BufferGeometry[] = [];
  const propias: THREE.BufferGeometry[] = [];
  let guarismos = 0;
  let emblemas = 0;
  const tinta = new THREE.Color();
  const matriz = new THREE.Matrix4();
  const cuaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const pon = (silueta: THREE.BufferGeometry, x: number, z: number, giro: number, lado: number, hex: string): void => {
    const copia = silueta.clone();
    euler.set(-Math.PI / 2, 0, 0);
    cuaternion.setFromEuler(euler);
    cuaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), giroDelRotulo(giro)));
    matriz.compose(new THREE.Vector3(x, ALZA_DEL_ROTULO, z), cuaternion, new THREE.Vector3(lado, lado, lado));
    copia.applyMatrix4(matriz);
    if (copia.getAttribute('normal') === undefined) copia.computeVertexNormals();
    const cuenta = (copia.getAttribute('position') as THREE.BufferAttribute).count;
    const colores = new Float32Array(cuenta * 3);
    tinta.set(hex);
    for (let i = 0; i < cuenta; i++) {
      colores[i * 3] = tinta.r;
      colores[i * 3 + 1] = tinta.g;
      colores[i * 3 + 2] = tinta.b;
    }
    copia.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    /* `mergeGeometries` exige los mismos atributos en todas: nada de uv sueltos. */
    copia.deleteAttribute('uv');
    partes.push(copia);
    propias.push(copia);
  };

  const siluetasDeGuarismo = new Map<string, THREE.BufferGeometry>();
  for (let i = 0; i < CASILLAS; i++) {
    for (const d of guarismosDelPrecio(i)) {
      let silueta = siluetasDeGuarismo.get(d.guarismo);
      if (silueta === undefined) {
        const nueva = geometriaDeUnGuarismo(d.guarismo);
        if (nueva === null) continue;
        silueta = nueva;
        siluetasDeGuarismo.set(d.guarismo, nueva);
      }
      pon(silueta, d.x, d.z, d.giro, d.alto, TINTA_DEL_PRECIO);
      guarismos++;
    }
  }
  const siluetasDeEmblema = new Map<string, THREE.BufferGeometry>();
  for (const e of huecosDeLosEmblemas()) {
    let silueta = siluetasDeEmblema.get(e.emblema);
    if (silueta === undefined) {
      const nueva = geometriaDeContornos(CONTORNOS_DEL_EMBLEMA[e.emblema] ?? []);
      if (nueva === null) continue;
      silueta = nueva;
      siluetasDeEmblema.set(e.emblema, nueva);
    }
    pon(silueta, e.x, e.z, e.giro, e.lado, TINTA_DEL_EMBLEMA);
    emblemas++;
  }
  for (const g of siluetasDeGuarismo.values()) g.dispose();
  for (const g of siluetasDeEmblema.values()) g.dispose();
  if (partes.length === 0) return null;
  const fundida = mergeGeometries(partes, false) as THREE.BufferGeometry | null;
  for (const g of propias) g.dispose();
  if (fundida === null) return null;
  fundida.computeBoundingSphere();
  const indice = fundida.getIndex();
  const triangulos = indice !== null ? indice.count / 3 : (fundida.getAttribute('position') as THREE.BufferAttribute).count / 3;
  return { geometria: fundida, triangulos, guarismos, emblemas };
}
