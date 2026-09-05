/**
 * LA ARITMÉTICA DE LA COSTA: dónde acaba la tierra, a qué distancia está el mar de
 * ella, y el disco de anillos que lleva ese número en cada vértice.
 *
 * ═══ POR QUÉ ESTA CUENTA ESTÁ AQUÍ Y NO EN EL SOMBREADOR ═══
 *
 * `docs/EL-MAR-DE-RIBERAS.md` §1.2 lo fija: la distancia a la costa se calcula en la
 * CPU, una vez, y viaja en el vértice. Las dos razones, y la segunda es la que manda:
 *
 *   · El contorno del delta es dentado —diecinueve comarcas hexagonales hechas de
 *     lados de subtesela, con bahías y estuarios—. Aproximarlo dentro del sombreador
 *     con un hexágono grande o un círculo dejaría la espuma despegada de la orilla
 *     media comarca, que a esta escala son setenta y cinco unidades de mundo.
 *   · Una cuenta escrita en GLSL no se puede comprobar sin abrir un navegador y
 *     mirarla. Ésta se ejercita en Node con `verify:escena`, que es como se comprueba
 *     todo lo demás en esta casa. La aritmética fuera, el sombreador tonto.
 *
 * Se calcula al montar el mundo, cuando ya se conocen las comarcas, y no cambia
 * durante la partida: el delta no se mueve.
 *
 * ═══ Y POR QUÉ NO VALE LA DISTANCIA QUE YA HABÍA ═══
 *
 * `aguas.ts` calcula `dOrilla` y `relieve.ts` la pasea hasta `Subtesela.aOrilla`. No
 * sirve, y no por poco: mide DESDE EL AGUA HACIA TIERRA —lo contrario de lo que la
 * espuma necesita—, es entera y en pasos de celda de casi once unidades, y sólo cubre
 * las subteselas del tablero, que es precisamente donde el disco de mar NO se ve. Se
 * deja como está; esto es otra cosa.
 *
 * ═══ EL SIGNO NO SALE DE LOS SEGMENTOS: SE LE PREGUNTA AL TERRENO ═══
 *
 * Lo tentador es orientar cada segmento y mirar de qué lado cae el punto. Eso falla en
 * las esquinas cóncavas —y un contorno hecho de hexágonos es casi todo esquinas—:
 * el segmento más cercano a un punto metido en una bahía puede tener la normal
 * apuntando al otro lado, y ahí el signo se da la vuelta sin avisar. La versión seria
 * de ese truco es la normal pseudo-angular, que es más código y más sitios donde
 * equivocarse.
 *
 * Aquí sobra: la respuesta exacta está a una consulta de distancia. `hexDePunto` dice
 * en qué subtesela cae un punto, y el propio contorno se construyó a partir de qué
 * subteselas son tierra. Preguntarle al terreno es O(1), es exacto, y —lo que
 * importa— el signo cambia EXACTAMENTE en el contorno, porque el contorno es el borde
 * de ese mismo conjunto de celdas. Con una normal aproximada no lo sería.
 *
 * ═══ QUÉ CUENTA COMO MAR, Y LOS ESTANQUES SIN SALIDA ═══
 *
 * Mar es lo que se alcanza NAVEGANDO desde fuera: se inunda el plano desde el
 * exterior del tablero a través de todo lo que no es tierra. Eso mete los estuarios
 * —el contorno sube por el río y la línea de costa se cierra en la desembocadura en
 * vez de quedar cortada de un tajo— y deja fuera las lagunas sin salida, que quedan
 * del lado de tierra. Es lo correcto para lo que se va a pintar: una laguna interior
 * no tiene por qué llevar el disco de mar debajo con espuma alrededor, y
 * `docs/EL-MAR-DE-RIBERAS.md` §4 la deja expresamente fuera del encargo.
 */
import * as THREE from 'three';
import { puntoDeVertice, vecino, verticeDeHex } from '../shared/mecanicas/malla-hexagonal';
import type { Hex } from '../shared/mecanicas/malla-hexagonal';
import { CAUCE, CUERPO } from './aguas';
import { RADIO_DE_TESELA } from './escala';
import { hexDePunto } from './relieve';
import {
  ALCANCE_DEL_DELTA,
  SECTORES_DEL_MAR,
  radiosDelMar,
} from './presupuesto-del-delta';

/**
 * UN PUNTO DEL PLANO DEL MAR, en coordenadas de MUNDO.
 *
 * `x` y `z`, no `x` e `y`, y el nombre no es cosmético: la malla trabaja en un plano
 * `{x, y}` que la escena tumba —`t.centro.y` va al eje `z` del mundo, como hace
 * `delta.tsx` al colocar cada tesela—. Escribir `z` obliga a hacer esa conversión a
 * la vista en vez de arrastrar una `y` que unas veces es profundidad y otras altura.
 */
export interface PuntoDelMar {
  readonly x: number;
  readonly z: number;
}

/** Un tramo recto del contorno: el lado de una subtesela, en coordenadas de mundo. */
export interface Segmento {
  readonly ax: number;
  readonly az: number;
  readonly bx: number;
  readonly bz: number;
}

/**
 * LO QUE HACE FALTA SABER DE UNA SUBTESELA para trazar la costa: dónde cae y si es
 * agua. Es un subconjunto de `Subtesela`, así que `relieve.todas()` encaja tal cual.
 */
export interface CeldaDeLaCosta {
  readonly sub: Hex;
  /** `TIERRA`, `CAUCE`, `CUERPO` o `VAGUADA`, tal y como los define `aguas.ts`. */
  readonly agua: number;
}

/** El contorno del delta, con lo que hace falta para medir contra él. */
export interface Contorno {
  /** Los segmentos que separan la tierra del mar, en coordenadas de mundo. */
  readonly segmentos: readonly Segmento[];
  /** Si un punto cae en el mar abierto. Es lo que le da el SIGNO a la distancia. */
  esMar(punto: PuntoDelMar): boolean;
  /**
   * El índice con el que se busca el segmento más cercano. Va en el contorno y no en
   * una variable de `distanciaALaCosta` porque se construye UNA vez y se consulta doce
   * mil: si se rehiciera en cada llamada costaría más que no tenerlo.
   */
  readonly rejilla: RejillaDeLaCosta;
}

/** Los seis vecinos, en el orden de `DIRECCIONES`, para no repetir la vuelta. */
const LADOS = 6;

const llave = (h: Hex): string => `${String(h.q)},${String(h.r)}`;

/**
 * EL TAMAÑO DEL CUBO DE LA REJILLA con la que se busca el segmento más cercano.
 *
 * Cuatro radios de tesela: unos veinticinco de mundo, o sea cuatro segmentos de costa
 * por cubo. Más pequeño y la búsqueda visita muchos cubos vacíos; más grande y cada
 * cubo trae una lista larga que hay que recorrer entera. No es un número delicado —la
 * respuesta es la misma con cualquiera, sólo cambia lo que tarda—, y `verify:escena`
 * comprueba que coincide con la fuerza bruta precisamente para que se pueda tocar sin
 * miedo.
 */
const PASO_DE_LA_REJILLA = RADIO_DE_TESELA * 4;

/**
 * LA REJILLA DE CUBOS. No es optimización prematura: son doce mil vértices contra
 * novecientos segmentos, once millones de distancias punto-segmento, y eso son
 * décimas de segundo en un escritorio y bastante más en un teléfono, justo en el
 * momento en que se monta el mundo. Con la rejilla son milisegundos.
 */
export interface RejillaDeLaCosta {
  readonly paso: number;
  readonly minX: number;
  readonly minZ: number;
  readonly columnas: number;
  readonly filas: number;
  readonly cubos: readonly (readonly number[])[];
}

/**
 * EL CONTORNO DEL DELTA: los lados de subtesela que separan la tierra del mar.
 *
 * Una celda que está del lado de tierra aporta el lado por el que da al exterior del
 * tablero o al mar. El lado `m` de una subtesela —el que comparte con su vecino `m`—
 * va de la esquina `m-1` a la esquina `m`, y las dos esquinas se piden por su LLAVE
 * canónica: así el mismo punto geométrico sale con los mismos bits desde las dos
 * celdas que lo comparten, y el contorno se cierra de verdad en vez de casi. Que no
 * queden puntas sueltas se comprueba en `verify:escena`.
 */
export function contornoDelDelta(celdas: readonly CeldaDeLaCosta[]): Contorno {
  const enElTablero = new Set<string>();
  const tierra = new Set<string>();
  for (const c of celdas) {
    enElTablero.add(llave(c.sub));
    if (c.agua !== CAUCE && c.agua !== CUERPO) tierra.add(llave(c.sub));
  }

  /*
   * LA INUNDACIÓN DESDE FUERA. Se siembra con las celdas de agua que tocan el borde
   * del tablero —las bocas de los ríos— y se extiende por el agua hacia dentro. Lo
   * que no alcanza es una laguna sin salida, y ésa cuenta como tierra: ni lleva
   * espuma ni parte el disco en dos.
   */
  const mar = new Set<string>();
  const cola: Hex[] = [];
  for (const c of celdas) {
    for (let k = 0; k < LADOS; k++) {
      const fuera = vecino(c.sub, k);
      if (enElTablero.has(llave(fuera))) continue;
      /* `c` toca el exterior: si `c` es agua, el mar entra por aquí. */
      const suyo = llave(c.sub);
      if (!tierra.has(suyo) && !mar.has(suyo)) {
        mar.add(suyo);
        cola.push(c.sub);
      }
    }
  }
  while (cola.length > 0) {
    const h = cola.pop() as Hex;
    for (let k = 0; k < LADOS; k++) {
      const v = vecino(h, k);
      const suyo = llave(v);
      if (mar.has(suyo) || tierra.has(suyo) || !enElTablero.has(suyo)) continue;
      mar.add(suyo);
      cola.push(v);
    }
  }

  /*
   * EL CONJUNTO DEL QUE SE MIDE EL BORDE: tierra más lagunas sin salida. El contorno
   * es su frontera exacta, y por eso el signo de la distancia cambia justo ahí.
   */
  const dentro = new Set<string>();
  for (const c of celdas) if (!mar.has(llave(c.sub))) dentro.add(llave(c.sub));

  const segmentos: Segmento[] = [];
  for (const c of celdas) {
    if (!dentro.has(llave(c.sub))) continue;
    for (let m = 0; m < LADOS; m++) {
      if (dentro.has(llave(vecino(c.sub, m)))) continue;
      const a = puntoDeVertice(verticeDeHex(c.sub, m + LADOS - 1), RADIO_DE_TESELA);
      const b = puntoDeVertice(verticeDeHex(c.sub, m), RADIO_DE_TESELA);
      segmentos.push({ ax: a.x, az: a.y, bx: b.x, bz: b.y });
    }
  }

  return {
    segmentos,
    rejilla: rejillaDe(segmentos),
    esMar(punto: PuntoDelMar): boolean {
      return !dentro.has(llave(hexDePunto({ x: punto.x, y: punto.z }, RADIO_DE_TESELA)));
    },
  };
}

/** Reparte los segmentos en cubos por su rectángulo envolvente. */
function rejillaDe(segmentos: readonly Segmento[]): RejillaDeLaCosta {
  if (segmentos.length === 0) {
    return { paso: PASO_DE_LA_REJILLA, minX: 0, minZ: 0, columnas: 1, filas: 1, cubos: [[]] };
  }
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const s of segmentos) {
    minX = Math.min(minX, s.ax, s.bx);
    maxX = Math.max(maxX, s.ax, s.bx);
    minZ = Math.min(minZ, s.az, s.bz);
    maxZ = Math.max(maxZ, s.az, s.bz);
  }
  const paso = PASO_DE_LA_REJILLA;
  const columnas = Math.max(1, Math.floor((maxX - minX) / paso) + 1);
  const filas = Math.max(1, Math.floor((maxZ - minZ) / paso) + 1);
  const cubos: number[][] = [];
  for (let i = 0; i < columnas * filas; i++) cubos.push([]);

  const acota = (v: number, tope: number): number => (v < 0 ? 0 : v > tope ? tope : v);
  for (let i = 0; i < segmentos.length; i++) {
    const s = segmentos[i] as Segmento;
    /*
     * Por el rectángulo envolvente, y eso basta: un segmento vive entero dentro de su
     * rectángulo, así que meterlo en todos los cubos que el rectángulo toca no puede
     * dejarse ninguno por el que el segmento pase.
     */
    const c0 = acota(Math.floor((Math.min(s.ax, s.bx) - minX) / paso), columnas - 1);
    const c1 = acota(Math.floor((Math.max(s.ax, s.bx) - minX) / paso), columnas - 1);
    const f0 = acota(Math.floor((Math.min(s.az, s.bz) - minZ) / paso), filas - 1);
    const f1 = acota(Math.floor((Math.max(s.az, s.bz) - minZ) / paso), filas - 1);
    for (let f = f0; f <= f1; f++) for (let c = c0; c <= c1; c++) (cubos[f * columnas + c] as number[]).push(i);
  }
  return { paso, minX, minZ, columnas, filas, cubos };
}

/** La distancia de un punto a un segmento, al cuadrado. Sin raíces hasta el final. */
function alCuadradoContra(x: number, z: number, s: Segmento): number {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const largo = dx * dx + dz * dz;
  let u = largo > 0 ? ((x - s.ax) * dx + (z - s.az) * dz) / largo : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const qx = s.ax + u * dx - x;
  const qz = s.az + u * dz - z;
  return qx * qx + qz * qz;
}

/**
 * LA DISTANCIA DE UN PUNTO A LA COSTA, en unidades de mundo, POSITIVA mar adentro y
 * NEGATIVA dentro de tierra. Es el único número del que cuelgan las cuatro cosas del
 * §2 del documento: la orilla que se moja, la rompiente, la altura de las olas y el
 * vaivén sobre la arena.
 *
 * ═══ CÓMO SE BUSCA EL SEGMENTO MÁS CERCANO SIN MIRARLOS TODOS ═══
 *
 * Se recorren los cubos de la rejilla en anillos alrededor del cubo del punto. Al
 * terminar el anillo `k` se sabe una cosa que permite parar: cualquier segmento que
 * quede en un cubo del anillo `k+1` o más lejos está a `k` pasos de rejilla por lo
 * menos —el punto está dentro de su propio cubo, así que entre él y un cubo `k+1`
 * columnas más allá hay `k` cubos enteros—. Si lo mejor encontrado ya es más corto
 * que eso, no hay nada que buscar.
 *
 * Y si el punto cae FUERA de la rejilla —el disco llega seis veces más lejos que la
 * costa— se empieza directamente por el primer anillo que la toca, en vez de dar
 * vueltas por el vacío.
 */
export function distanciaALaCosta(punto: PuntoDelMar, contorno: Contorno): number {
  const signo = contorno.esMar(punto) ? 1 : -1;
  const { x, z } = punto;

  /* Un delta sin costa no existe —`verify:escena` lo comprueba—, pero decirlo es más
   * honrado que devolver un cero que se leería como «estás justo en la orilla». */
  if (contorno.segmentos.length === 0) return signo * Infinity;

  const { paso, minX, minZ, columnas, filas, cubos } = contorno.rejilla;
  const cx = Math.floor((x - minX) / paso);
  const cz = Math.floor((z - minZ) / paso);
  const desde = Math.max(0, -cx, cx - (columnas - 1), -cz, cz - (filas - 1));
  const hasta = Math.max(Math.abs(cx), Math.abs(cx - (columnas - 1)), Math.abs(cz), Math.abs(cz - (filas - 1)));

  let mejor = Infinity;
  for (let k = desde; k <= hasta; k++) {
    const suelo = (k - 1) * paso;
    if (k > desde && mejor <= suelo * suelo) break;
    const c0 = Math.max(0, cx - k);
    const c1 = Math.min(columnas - 1, cx + k);
    const f0 = Math.max(0, cz - k);
    const f1 = Math.min(filas - 1, cz + k);
    for (let f = f0; f <= f1; f++) {
      const enElBorde = f === cz - k || f === cz + k;
      for (let c = c0; c <= c1; c++) {
        /* Sólo el marco del anillo: el interior ya se miró en las vueltas anteriores. */
        if (!enElBorde && c !== cx - k && c !== cx + k) continue;
        for (const i of cubos[f * columnas + c] as readonly number[]) {
          const d = alCuadradoContra(x, z, contorno.segmentos[i] as Segmento);
          if (d < mejor) mejor = d;
        }
      }
    }
  }
  return signo * Math.sqrt(mejor);
}

/**
 * EL DISCO DEL MAR: anillos con la distancia a la costa en cada vértice.
 *
 * ═══ POR QUÉ ANILLOS Y NO UN `circleGeometry` ═══
 *
 * `docs/EL-MAR-DE-RIBERAS.md` §1.3. Un `circleGeometry` pone todos sus vértices en el
 * borde y uno en el centro: no hay dónde interpolar una distancia ni dónde levantar
 * una ola. Con anillos hay malla justo donde se mira.
 *
 * ═══ Y POR QUÉ LOS ANILLOS NO SE REPARTEN COMO EN EL MUELLE ═══
 *
 * En el muelle la cámara está sobre el agua y lo que hay que resolver es lo de los
 * pies: los anillos crecen geométricamente DESDE EL CENTRO. Aquí no. Lo que hay que
 * resolver es un ARO a media distancia —la costa, entre 269 y 347 de radio—, con el
 * centro tapado por el tablero y el horizonte a dos mil. Un reparto geométrico desde
 * el centro gastaría los anillos debajo del tablero, donde no se ve nada, y llegaría a
 * la costa con saltos de setenta.
 *
 * El reparto —y el porqué de cada número— está en `presupuesto-del-delta.ts`, sin
 * `three`, para que el comprobador cuente exactamente los mismos triángulos que aquí
 * se dibujan.
 *
 * El atributo se llama `costa` y es un `float` por vértice. El sombreador lo declara
 * como `attribute float costa;`.
 */
export function geometriaDelMar(contorno: Contorno, alcance = ALCANCE_DEL_DELTA): THREE.BufferGeometry {
  const radios = radiosDelMar(alcance);
  const sectores = SECTORES_DEL_MAR;
  const anillos = radios.length;

  const cosenos = new Float64Array(sectores);
  const senos = new Float64Array(sectores);
  for (let s = 0; s < sectores; s++) {
    const a = (s / sectores) * Math.PI * 2;
    cosenos[s] = Math.cos(a);
    senos[s] = Math.sin(a);
  }

  const posiciones = new Float32Array(anillos * sectores * 3);
  const costa = new Float32Array(anillos * sectores);
  for (let i = 0; i < anillos; i++) {
    const r = radios[i] ?? 0;
    /*
     * EL ANILLO CERO ES EL MISMO PUNTO REPETIDO EN LOS 288 SECTORES —el abanico del centro
     * necesita un vértice por sector para indexar— así que su distancia se calcula UNA vez
     * y se copia. No es un ahorro cosmético: la consulta desde el origen es la peor de
     * todas, porque el centro del tablero es lo más lejos que hay de cualquier segmento de
     * costa y la rejilla tiene que abrir anillos de cubos hasta encontrarlo. Eran 287
     * repeticiones de la consulta más cara, justo en el momento en que se monta el mundo.
     *
     * La geometría no cambia: los mismos vértices, los mismos triángulos y los mismos
     * índices que antes. Sólo se deja de preguntar lo mismo 288 veces.
     */
    const laMismaParaTodos = r === 0 ? distanciaALaCosta({ x: 0, z: 0 }, contorno) : undefined;
    for (let s = 0; s < sectores; s++) {
      const n = i * sectores + s;
      const x = (cosenos[s] as number) * r;
      const z = (senos[s] as number) * r;
      posiciones[n * 3] = x;
      posiciones[n * 3 + 1] = 0;
      posiciones[n * 3 + 2] = z;
      costa[n] = laMismaParaTodos ?? distanciaALaCosta({ x, z }, contorno);
    }
  }

  const indices: number[] = [];
  for (let i = 0; i + 1 < anillos; i++) {
    for (let s = 0; s < sectores; s++) {
      const s1 = (s + 1) % sectores;
      const a = i * sectores + s;
      const b = i * sectores + s1;
      const c = (i + 1) * sectores + s;
      const d = (i + 1) * sectores + s1;
      if (i === 0) {
        /* El anillo cero es el centro repetido: sólo un triángulo por sector. */
        indices.push(a, d, c);
      } else {
        indices.push(a, d, c, a, b, d);
      }
    }
  }

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  geometria.setAttribute('costa', new THREE.BufferAttribute(costa, 1));
  geometria.setIndex(indices);
  geometria.computeBoundingSphere();
  return geometria;
}
