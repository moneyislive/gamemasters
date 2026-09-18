/**
 * EL VALLE DE LAS LINDES, MEDIDO.
 *
 *   npm run verify:lindes-escena -w escenas
 *
 * ═══ QUÉ MIRA, Y POR QUÉ ESTO NO LO PUEDE DECIR NINGÚN OTRO COMPROBADOR ═══
 *
 * `verify:lindes` mide las REGLAS: que una villa de tres losas valga ocho. Esto mide
 * el DIBUJO, que es lo que la partida enseña y lo que nadie más mira. Un tablero mal
 * montado no da error en ninguna consola: se ve, y se ve tarde.
 *
 *  1. LAS CARAS MIRAN AL CIELO. Cada triángulo del suelo se comprueba contra su
 *     propia normal con un producto vectorial. Esta casa ya pagó dos veces el mismo
 *     fallo —los tejados de una ciudad entera, y el suelo de este tablero el día que
 *     se escribió— y las dos veces no hubo un solo error: simplemente no se veía.
 *  2. LAS LOSAS CASAN EN LA RAYA. Para cada par de losas que las reglas dejan pegar,
 *     el suelo de las dos tiene que decir lo mismo celda a celda en el borde
 *     compartido. Si no, una senda llega a la raya y muere contra la hierba de la de
 *     al lado — y las reglas siguen contando que es la misma senda.
 *  3. LA MURALLA NO PARTE UNA VILLA. Ni un muro en un lado por el que la villa SALE:
 *     ahí la villa continúa en la losa vecina, y un muro por medio enseñaría dos
 *     recintos donde la partida cuenta uno.
 *  4. NADA SE SALE NI FLOTA. Toda pieza dentro de su losa y apoyada en el suelo.
 *  5. NADA EN MITAD DEL CAMINO. Ni una pieza dentro del ancho de una senda.
 *  6. EL PRESUPUESTO SE CUMPLE. Con las setenta y dos losas puestas y los triángulos
 *     REALES de cada modelo —leídos del `.glb`, no estimados—, el tablero cabe.
 *  7. Y EL LOBBY: cinco sitios en corro, nadie dentro de una piedra, y nada sembrado
 *     en el pasillo por el que mira la cámara.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import {
  GIROS,
  LADOS,
  LAS_LOSAS,
  ladoOpuesto,
  lindeDelLado,
  losaPorId,
} from '../../shared/arcade/juegos/lindes-losas';
import type { Giro, Lado, Losa } from '../../shared/arcade/juegos/lindes-losas';
import { LOSAS_EN_TOTAL } from '../../shared/arcade/juegos/lindes-losas';
import {
  CELDAS_POR_LOSA,
  CELDAS_POR_MURO,
  LADO_DE_LOSA,
  PIEZAS_POR_LOSA,
  TOPE_DE_TRIANGULOS,
} from '../lindes/medidas';
import {
  CELDAS_MINIMAS_DE_MURO,
  LO_QUE_NO_SE_RECORTA,
  montarLaLosa,
  murallasDeLaLosa,
  sueloDeLaLosa,
} from '../lindes/losa';
import type { CeldaDeSuelo, PorQueEsta } from '../lindes/losa';
import { ANCHO_DE_LA_SENDA } from '../lindes/medidas';
import { geometriaDelSuelo } from '../lindes/suelo';
import {
  RADIO_DEL_ALTOZANO,
  RADIO_DEL_CORRO,
  SITIOS_EN_EL_CORRO,
  loQueHayEnLaLinde,
  sitiosDeLaLinde,
} from '../linde-alta/la-linde';
import { ALTURA_DE_UNA_PERSONA } from '../escala';
import { camaraDeMesa, loQueAbarca } from '../lindes/paseo';
import { loQueHaCaido, sitioDeLaMano, sitioDelRelojDeLaBolsa } from '../lindes/rincones';
import { ALTO_DEL_RELOJ_EN_LADOS } from '../reloj';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`,
  );
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
paso('Las caras del suelo miran al cielo');
// ---------------------------------------------------------------------------

/*
 * ═══ LA COMPROBACIÓN QUE HABRÍA AHORRADO DOS PASADAS ═══
 *
 * Un triángulo mira hacia donde lo lleva el ORDEN de sus vértices, y `three` sólo
 * pinta la cara de delante. Con el orden natural —de oeste a este y luego al sur— la
 * cara de arriba de una losa mira HACIA ABAJO: el suelo está, tiene sus triángulos, y
 * no se ve ni uno. No hay error, no hay aviso, y lo que se ve es un tablero con las
 * casas puestas sobre el vacío.
 *
 * Aquí se saca la normal de cada triángulo por producto vectorial y se compara con la
 * que el propio vértice declara. Si no apuntan al mismo lado, está del revés.
 */
{
  const geometria = geometriaDelSuelo([
    { x: 0, y: 0, losa: 'puerta-senda', giro: 0 },
    { x: 1, y: 0, losa: 'villa-tres-senda', giro: 2 },
    { x: 0, y: 1, losa: 'ermita', giro: 0 },
  ]);
  comprobar('el suelo de tres losas produce geometría', geometria !== null);
  if (geometria !== null) {
    const pos = geometria.getAttribute('position');
    const nor = geometria.getAttribute('normal');
    let alReves = 0;
    let arriba = 0;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const cara = new THREE.Vector3();
    const declarada = new THREE.Vector3();
    for (let t = 0; t + 2 < pos.count; t += 3) {
      a.fromBufferAttribute(pos as THREE.BufferAttribute, t);
      b.fromBufferAttribute(pos as THREE.BufferAttribute, t + 1);
      c.fromBufferAttribute(pos as THREE.BufferAttribute, t + 2);
      declarada.fromBufferAttribute(nor as THREE.BufferAttribute, t);
      cara.copy(b).sub(a).cross(c.clone().sub(a));
      if (cara.lengthSq() <= 0) continue;
      if (cara.normalize().dot(declarada) < 0.5) alReves++;
      if (declarada.y > 0.9) arriba++;
    }
    comprobar('ni un triángulo del suelo está del revés', alReves === 0, { alReves });
    comprobar('y hay caras mirando al cielo, o no se estaría midiendo nada', arriba > 0, { arriba });
    geometria.dispose();
  }

  comprobar('sin losas puestas no hay geometría, y es `null` y no una malla vacía', geometriaDelSuelo([]) === null);
}

// ---------------------------------------------------------------------------
paso('Las losas casan en la raya');
// ---------------------------------------------------------------------------

/** Las clases del suelo a lo largo de un lado, de la primera celda a la última. */
function bordeDe(losa: Losa, giro: Giro, lado: Lado): string[] {
  const celdas = sueloDeLaLosa(losa, giro);
  const en = (i: number, j: number): string =>
    (celdas[j * CELDAS_POR_LOSA + i] as CeldaDeSuelo).clase;
  const salida: string[] = [];
  const ultima = CELDAS_POR_LOSA - 1;
  for (let k = 0; k < CELDAS_POR_LOSA; k++) {
    if (lado === 0) salida.push(en(k, 0));
    else if (lado === 1) salida.push(en(ultima, k));
    else if (lado === 2) salida.push(en(ultima - k, ultima));
    else salida.push(en(0, ultima - k));
  }
  return salida;
}

/*
 * Se miran unos cuantos pares, no los 24 × 24 × 4 × 4 (que son 9.216 y tardarían):
 * las combinaciones que de verdad cuentan son las que llevan senda o muralla al
 * borde, porque el campo contra campo no puede fallar. Se recorren TODAS las losas
 * contra la que tiene los tres linderos —la de salida— con los cuatro giros, más las
 * parejas de cada losa consigo misma.
 */
{
  let mirados = 0;
  for (const losa of LAS_LOSAS) {
    for (const giro of GIROS) {
      for (const l of LADOS) {
        const linde = lindeDelLado(losa, giro, l);
        /* La vecina que casa: la misma losa girada para que enseñe lo mismo enfrente. */
        for (const otraLosa of LAS_LOSAS) {
          for (const otroGiro of GIROS) {
            const opuesto = ladoOpuesto(l);
            if (lindeDelLado(otraLosa, otroGiro, opuesto) !== linde) continue;
            mirados++;
            const mio = bordeDe(losa, giro, l);
            /*
             * El vecino recorre su lado en el sentido contrario, así que se compara
             * su borde DADO LA VUELTA. Es el mismo cruce que `huecoQueToca` hace con
             * los huecos, y escribirlo al revés se ve como dos losas que casan por
             * las reglas y no por el dibujo.
             */
            const suyo = [...bordeDe(otraLosa, otroGiro, opuesto)].reverse();
            const iguales = mio.every((c, k) => c === suyo[k]);
            comprobar(
              `${losa.id}/${giro} lado ${l} («${linde}») casa en el suelo con ${otraLosa.id}/${otroGiro}`,
              iguales,
              { mio, suyo },
            );
            /* Con una pareja por combinación basta: lo que se prueba es la simetría. */
            break;
          }
        }
      }
    }
  }
  comprobar('se han mirado parejas de verdad', mirados > 300, { mirados });
  console.log(`  ${mirados} parejas de losas comparadas raya a raya`);
}

// ---------------------------------------------------------------------------
paso('La muralla no parte una villa');
// ---------------------------------------------------------------------------

for (const losa of LAS_LOSAS) {
  for (const giro of GIROS) {
    const celdas = sueloDeLaLosa(losa, giro);
    const tramos = murallasDeLaLosa(losa, giro, celdas);
    for (const t of tramos) {
      /*
       * Un tramo que va por el borde de la losa sólo puede estar donde la villa NO
       * sale. Se mira la fila o columna que le toca: si es la del canto y por ese
       * lado sale muralla, está mal.
       */
      const enElCanto =
        (t.haciaDonde === 0 && t.fija === 0) ||
        (t.haciaDonde === 2 && t.fija === CELDAS_POR_LOSA - 1) ||
        (t.haciaDonde === 3 && t.fija === 0) ||
        (t.haciaDonde === 1 && t.fija === CELDAS_POR_LOSA - 1);
      if (!enElCanto) continue;
      comprobar(
        `${losa.id}/${giro}: no hay muro en el lado ${t.haciaDonde}, por el que sale la villa`,
        lindeDelLado(losa, giro, t.haciaDonde) !== 'muralla',
        { tramo: t },
      );
    }
  }
}

/* Y una villa que toca el prado SIEMPRE tiene muro: si no, el recinto no se lee. */
for (const losa of LAS_LOSAS) {
  if (losa.villas.length === 0) continue;
  const celdas = sueloDeLaLosa(losa, 0);
  const tocaPrado = celdas.some((c, k) => {
    if (c.clase !== 'villa') return false;
    const i = k % CELDAS_POR_LOSA;
    const j = Math.floor(k / CELDAS_POR_LOSA);
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const vi = i + di;
      const vj = j + dj;
      if (vi < 0 || vj < 0 || vi >= CELDAS_POR_LOSA || vj >= CELDAS_POR_LOSA) continue;
      if ((celdas[vj * CELDAS_POR_LOSA + vi] as CeldaDeSuelo).clase !== 'villa') return true;
    }
    return false;
  });
  const tramos = murallasDeLaLosa(losa, 0, celdas);
  comprobar(
    `${losa.id}: si la villa toca el prado, hay muralla`,
    !tocaPrado || tramos.length > 0,
    { tocaPrado, tramos: tramos.length },
  );
}

// ---------------------------------------------------------------------------
paso('Nada se sale de su losa, nada flota y nada está en mitad del camino');
// ---------------------------------------------------------------------------

/** El suelo de una losa, recordado: se pide una vez por losa y giro y se usa mucho. */
const SUELOS = new Map<string, readonly CeldaDeSuelo[]>();
function celdasDe(losa: Losa, giro: Giro): readonly CeldaDeSuelo[] {
  const llave = `${losa.id}/${giro}`;
  const hecho = SUELOS.get(llave);
  if (hecho !== undefined) return hecho;
  const nuevo = sueloDeLaLosa(losa, giro);
  SUELOS.set(llave, nuevo);
  return nuevo;
}

{
  const media = LADO_DE_LOSA / 2;
  let piezas = 0;
  let enLaSenda = 0;
  for (const losa of LAS_LOSAS) {
    for (const giro of GIROS) {
      const contenido = montarLaLosa(losa.id, giro, 1234 + giro * 7 + losa.id.length);
      piezas += contenido.puestas.length;
      for (const p of contenido.puestas) {
        comprobar(
          `${losa.id}/${giro}: ${p.pieza} está dentro de su losa`,
          Math.abs(p.x) <= media + 0.001 && Math.abs(p.z) <= media + 0.001,
          { x: p.x, z: p.z, media },
        );
        comprobar(`${losa.id}/${giro}: ${p.pieza} se apoya en el suelo`, p.y >= 0, { y: p.y });
        comprobar(`${losa.id}/${giro}: ${p.pieza} tiene escala positiva`, p.escala > 0 && p.largo > 0);

        /*
         * ═══ NI UNA PIEZA EN MITAD DEL CAMINO ═══
         *
         * Se mira LA CELDA EN LA QUE CAE, y no la traza del camino, y la diferencia
         * es la que separa un fallo de una regla bien aplicada:
         *
         *   · La ERMITA está en el final de un camino que muere en su puerta. La
         *     traza pasa por debajo de ella, y tiene que pasar.
         *   · En una losa con villa y camino, el camino entra en la villa y desaparece
         *     bajo el empedrado —la villa gana a la senda—, así que la traza sigue
         *     hacia el centro por donde ya no hay camino que ver, y las casas de esa
         *     zona están donde tienen que estar.
         *
         * Lo que de verdad no puede haber es una pieza donde EL SUELO ENSEÑA CAMINO.
         * Las murallas, sus puertas y la ermita se saltan la regla a propósito: una
         * puerta en mitad del camino es exactamente lo que es una puerta, y un camino
         * que muere en la puerta de una ermita tiene la ermita en su final.
         */
        if (p.porque === 'muralla' || p.porque === 'remate' || p.porque === 'ermita') continue;
        const i = Math.floor((p.x / LADO_DE_LOSA + 0.5) * CELDAS_POR_LOSA);
        const j = Math.floor((p.z / LADO_DE_LOSA + 0.5) * CELDAS_POR_LOSA);
        const celda = celdasDe(losa, giro)[
          Math.min(CELDAS_POR_LOSA - 1, Math.max(0, j)) * CELDAS_POR_LOSA +
            Math.min(CELDAS_POR_LOSA - 1, Math.max(0, i))
        ];
        if (celda !== undefined && celda.clase === 'senda') enLaSenda++;
      }
      comprobar(
        `${losa.id}/${giro}: no se pasa del cupo de relleno`,
        contenido.puestas.length <= PIEZAS_POR_LOSA + 200,
        contenido.puestas.length,
      );
    }
  }
  comprobar('ni una pieza suelta en mitad de una senda', enLaSenda === 0, { enLaSenda });
  console.log(`  ${piezas} piezas puestas en las 24 losas por sus 4 giros`);
}

// ---------------------------------------------------------------------------
paso('El presupuesto de triángulos, con los del `.glb` de verdad');
// ---------------------------------------------------------------------------

/**
 * LOS TRIÁNGULOS DE CADA MODELO, LEÍDOS DEL FICHERO.
 *
 * Del trozo JSON del `.glb`, sin abrir un contexto de dibujo: cada nodo raíz, sus
 * mallas, y de cada primitiva el número de índices entre tres. Es la misma lectura
 * que hace `verify:escena` para comprobar los nombres, aplicada a las cuentas.
 *
 * Estimarlos sería exactamente el error que este comprobador existe para no cometer:
 * un presupuesto con números inventados da verde con el tablero fuera de cuota.
 */
function triangulosPorModelo(): ReadonlyMap<string, number> {
  const ruta = path.resolve(import.meta.dirname ?? __dirname, '..', 'modelos', 'tablero.glb');
  const crudo = fs.readFileSync(ruta);
  const largoJson = crudo.readUInt32LE(12);
  const gltf = JSON.parse(crudo.subarray(20, 20 + largoJson).toString('utf8')) as {
    scene?: number;
    scenes: { nodes: number[] }[];
    nodes: { name?: string; mesh?: number; children?: number[] }[];
    meshes: { primitives: { indices?: number; attributes: { POSITION: number } }[] }[];
    accessors: { count: number }[];
  };
  const deMalla = (i: number): number => {
    let tri = 0;
    for (const prim of gltf.meshes[i]?.primitives ?? []) {
      const cuantos =
        prim.indices !== undefined
          ? (gltf.accessors[prim.indices]?.count ?? 0)
          : (gltf.accessors[prim.attributes.POSITION]?.count ?? 0);
      tri += cuantos / 3;
    }
    return tri;
  };
  const deNodo = (i: number): number => {
    const n = gltf.nodes[i];
    if (n === undefined) return 0;
    let tri = n.mesh === undefined ? 0 : deMalla(n.mesh);
    for (const h of n.children ?? []) tri += deNodo(h);
    return tri;
  };
  const tabla = new Map<string, number>();
  for (const i of gltf.scenes[gltf.scene ?? 0]?.nodes ?? []) {
    const n = gltf.nodes[i];
    if (n?.name === undefined || n.name.length === 0) continue;
    tabla.set(n.name, Math.round(deNodo(i)));
  }
  return tabla;
}

{
  const porModelo = triangulosPorModelo();
  comprobar('el `.glb` del tablero trae más de cien modelos', porModelo.size > 100, porModelo.size);

  /*
   * El peor tablero posible: las setenta y dos losas, cada una con la clase que más
   * triángulos gasta y el giro que más gasta. No es el tablero de una partida: es la
   * cota, y es la que tiene que caber.
   */
  let peorPorLosa = 0;
  let laPeor = '';
  let sueloPorLosa = 0;
  let laPeorPuesta: readonly { pieza: string; porque: PorQueEsta; menuda: boolean }[] = [];
  for (const losa of LAS_LOSAS) {
    for (const giro of GIROS) {
      const contenido = montarLaLosa(losa.id, giro, 99 + giro);
      let tri = 0;
      for (const p of contenido.puestas) tri += porModelo.get(p.pieza) ?? 0;
      if (tri > peorPorLosa) {
        peorPorLosa = tri;
        laPeor = `${losa.id}/${giro}`;
        laPeorPuesta = contenido.puestas.map((p) => ({
          pieza: p.pieza,
          porque: p.porque,
          menuda: p.menuda,
        }));
      }
    }
    const g = geometriaDelSuelo([{ x: 0, y: 0, losa: losa.id, giro: 0 }]);
    if (g !== null) {
      sueloPorLosa = Math.max(sueloPorLosa, (g.getAttribute('position').count ?? 0) / 3);
      g.dispose();
    }
  }

  /*
   * ═══ Y LA MEDIDA QUE DE VERDAD IMPORTA: EL TABLERO CON EL RECORTE PUESTO ═══
   *
   * Un tablero de las setenta y dos losas sale un cuadrado de nueve por nueve. Se
   * monta ese cuadrado con la losa más cara en todas las casillas —que no pasa nunca,
   * y por eso es una cota— y se le aplica el mismo recorte por distancia que aplica
   * la escena: el relleno sólo dentro de su anillo, lo que cuenta una regla siempre.
   *
   * Sin esta cuenta, el presupuesto se comprueba contra un número que la pantalla no
   * pinta jamás, y eso es un comprobador que da rojo sin que haya nada roto o verde
   * con el tablero fuera de cuota, según de qué lado caiga.
   */
  const LADO_DEL_CUADRADO = 9;
  let conRecorte = 0;
  const centro = (LADO_DEL_CUADRADO - 1) / 2;
  for (let fila = 0; fila < LADO_DEL_CUADRADO; fila++) {
    for (let col = 0; col < LADO_DEL_CUADRADO; col++) {
      conRecorte += sueloPorLosa;
      const dx = col - centro;
      const dy = fila - centro;
      const lejos = Math.sqrt(dx * dx + dy * dy);
      for (const p of laPeorPuesta) {
        const obligada = LO_QUE_NO_SE_RECORTA.indexOf(p.porque) >= 0;
        const tope = p.menuda ? 1.8 : 4;
        if (!obligada && lejos > tope) continue;
        conRecorte += porModelo.get(p.pieza) ?? 0;
      }
    }
  }
  console.log(
    `  con el recorte por distancia puesto, un tablero de nueve por nueve de la losa más cara`,
  );
  console.log(
    `  pinta ${conRecorte.toLocaleString('es')} triángulos contra un tope de ${TOPE_DE_TRIANGULOS.toLocaleString('es')}`,
  );
  comprobar('el tablero con el recorte puesto cabe en el presupuesto', conRecorte <= TOPE_DE_TRIANGULOS, {
    conRecorte,
    tope: TOPE_DE_TRIANGULOS,
  });

  const delTablero = peorPorLosa * LOSAS_EN_TOTAL + sueloPorLosa * LOSAS_EN_TOTAL;
  console.log(`  la losa más cara es ${laPeor}, con ${peorPorLosa.toLocaleString('es')} triángulos`);
  console.log(`  el suelo más caro son ${sueloPorLosa} triángulos por losa`);
  console.log(
    `  setenta y dos así serían ${delTablero.toLocaleString('es')} contra un tope de ${TOPE_DE_TRIANGULOS.toLocaleString('es')}`,
  );
  /*
   * ═══ SE MIDE EL PEOR CASO SIN NIVEL DE DETALLE, Y SE EXIGE UN MÚLTIPLO ═══
   *
   * El tablero de verdad NO pinta eso: el relleno se recorta por distancia y sólo lo
   * que cuenta una regla se pinta siempre (ver `LO_QUE_NO_SE_RECORTA`). Así que lo que
   * se exige aquí no es caber sin recortar —no cabría, y está bien que no quepa— sino
   * que el peor caso no se dispare hasta un sitio del que el recorte no pueda volver.
   * Cuatro veces el tope es la señal: por debajo, el anillo de detalle lo baja de
   * sobra; por encima, es que una losa se ha llenado de algo que no debía.
   */
  comprobar(
    'el peor tablero sin recortar no pasa de cuatro veces el tope',
    delTablero < TOPE_DE_TRIANGULOS * 4,
    { delTablero, tope: TOPE_DE_TRIANGULOS },
  );
  comprobar('y el suelo de una losa cabe en mil triángulos gracias a la fusión', sueloPorLosa < 1000, sueloPorLosa);
}

// ---------------------------------------------------------------------------
paso('El muro cubre su tramo sin huecos ni solapes');
// ---------------------------------------------------------------------------

{
  /*
   * Un `muro` del pack mide siete celdas con la escala de la muralla, y un tramo de
   * N celdas se cubre con `round(N / 7)` muros estirados a `N / (7 · cuantos)`. Lo
   * que hay que comprobar es que ese estirado se queda en un margen razonable: un
   * muro al 40 % tiene el mortero aplastado y se ve.
   */
  let peorEstirado = 1;
  let masFino = 1;
  for (const losa of LAS_LOSAS) {
    for (const giro of GIROS) {
      const contenido = montarLaLosa(losa.id, giro, 7);
      for (const p of contenido.puestas) {
        if (p.porque !== 'muralla') continue;
        peorEstirado = Math.max(peorEstirado, p.largo);
        masFino = Math.min(masFino, p.largo);
      }
    }
  }
  console.log(`  el muro más estirado va a ${peorEstirado.toFixed(2)} y el más encogido a ${masFino.toFixed(2)}`);
  comprobar('ningún muro se estira más de la mitad de su largo', peorEstirado <= 1.5, peorEstirado);
  comprobar('ni se encoge a menos de un tercio', masFino >= 0.33, masFino);
  comprobar('los tramos de menos de tres celdas no llevan muro', CELDAS_MINIMAS_DE_MURO === 3);
  comprobar('un muro del pack cubre siete celdas', CELDAS_POR_MURO === 7);
}

// ---------------------------------------------------------------------------
paso('La Linde Alta: el lobby');
// ---------------------------------------------------------------------------

{
  const sitios = sitiosDeLaLinde();
  comprobar('el corro tiene cinco sitios', sitios.length === SITIOS_EN_EL_CORRO, sitios.length);

  for (const s of sitios) {
    const r = Math.sqrt(s.mojon.x * s.mojon.x + s.mojon.z * s.mojon.z);
    comprobar(`el mojón ${s.indice} está en el corro`, Math.abs(r - RADIO_DEL_CORRO) < 0.01, r);
    const rp = Math.sqrt(s.pie.x * s.pie.x + s.pie.z * s.pie.z);
    comprobar(`quien ocupa el sitio ${s.indice} está por dentro del mojón`, rp < r, { rp, r });
    comprobar(`y dentro del altozano`, rp < RADIO_DEL_ALTOZANO, { rp });
    /*
     * ═══ Y MIRA AL CENTRO, QUE ES LO QUE SE VE SI ESTÁ MAL ═══
     *
     * El rumbo de la casa es cero mirando al norte (−z) y creciendo hacia el este, así
     * que mirando al centro desde el punto (x, z) el rumbo cumple sin(r) = −x/|p| y
     * cos(r) = z/|p|. Un signo cambiado deja a los cinco de espaldas a la mesa, que es
     * exactamente lo que se ve cuando nadie ha mirado el lobby.
     */
    const haciaX = -s.pie.x / rp;
    const haciaZ = s.pie.z / rp;
    comprobar(
      `el sitio ${s.indice} mira a la piedra del centro`,
      Math.abs(Math.sin(s.giro) - haciaX) < 0.02 && Math.abs(Math.cos(s.giro) - haciaZ) < 0.02,
      { giro: s.giro, seno: Math.sin(s.giro), haciaX, coseno: Math.cos(s.giro), haciaZ },
    );
  }

  /* Dos mojones no pueden estar uno encima de otro. */
  for (let i = 0; i < sitios.length; i++) {
    for (let j = i + 1; j < sitios.length; j++) {
      const a = sitios[i] as { mojon: { x: number; z: number } };
      const b = sitios[j] as { mojon: { x: number; z: number } };
      const dx = a.mojon.x - b.mojon.x;
      const dz = a.mojon.z - b.mojon.z;
      comprobar(
        `los mojones ${i} y ${j} no se tocan`,
        dx * dx + dz * dz > (ALTURA_DE_UNA_PERSONA * 2) ** 2,
        Math.sqrt(dx * dx + dz * dz),
      );
    }
  }

  /* Y lo sembrado no le cae encima a nadie ni tapa la cámara. */
  for (const semilla of [1, 2, 3, 77, 1234]) {
    const puestas = loQueHayEnLaLinde(semilla);
    comprobar(`con la semilla ${semilla} se siembra algo`, puestas.length > 6, puestas.length);
    for (const p of puestas) {
      /*
       * Los mojones están pegados a su sitio A PROPÓSITO: son lo que lo marca. Y lo
       * que hay sobre la piedra del centro está por encima del suelo, así que no le
       * cae encima a nadie. Lo que se vigila es lo que CRECE en el alto.
       */
      if (p.porque !== 'campo') continue;
      for (const s of sitios) {
        const dx = p.x - s.pie.x;
        const dz = p.z - s.pie.z;
        comprobar(
          `con la semilla ${semilla}, ${p.pieza} no está encima del sitio ${s.indice}`,
          dx * dx + dz * dz > (ALTURA_DE_UNA_PERSONA * 1.2) ** 2 || p.y > 0,
          { pieza: p.pieza, d: Math.sqrt(dx * dx + dz * dz) },
        );
      }
      comprobar(
        `con la semilla ${semilla}, ${p.pieza} no tapa el pasillo de la cámara`,
        p.y > 0 || !(p.z > RADIO_DEL_CORRO * 0.36 && Math.abs(p.x) < RADIO_DEL_ALTOZANO * 0.6),
        { pieza: p.pieza, x: p.x, z: p.z },
      );
    }
  }
}


// ---------------------------------------------------------------------------
paso('Lo que se ve CABE en el lienzo, y se mide donde se sale');
// ---------------------------------------------------------------------------

/*
 * ═══ LA ÚNICA PARTE DE UNA ESCENA QUE SE PUEDE COMPROBAR DESDE NODE ═══
 *
 * Aquí no hay WebGL: nadie puede mirar un lienzo. Lo que sí se puede es proyectar a
 * mano —la cuenta de la perspectiva son cuatro renglones— y preguntar si lo que tiene
 * que verse queda entre −1 y 1. Por eso la aritmética de la cámara vive en `paseo.ts`
 * y la de la losa de la mano en `mano.ts`, sueltas de `three`: para poder llamarlas.
 *
 * ═══ Y NO ES TEÓRICO: LAS DOS ESTABAN MAL ═══
 *
 * El tablero salía al 110 % del ancho en el banco de escritorio —los dos cantos
 * cortados— porque `camaraDeMesa` despejaba la distancia en el CENTRO del tablero, y
 * lo que se sale es el canto de acá, que está más cerca y se proyecta más ancho. Y la
 * losa de la mano se colocaba por dos fracciones sueltas que no sabían su tamaño.
 *
 * Las dos son el mismo fallo de esta casa, ya apuntado con la caja del Burgo: medir
 * desde donde es cómodo en vez de desde donde asoma. Y ninguna de las 22.000
 * comprobaciones de aquí arriba lo veía, porque todas miran GEOMETRÍA y ninguna
 * miraba ENCUADRE.
 */

/** Las formas de pantalla que este producto tiene de verdad. */
const LIENZOS: readonly (readonly [string, number])[] = [
  ['banco de escritorio', 961 / 922],
  ['portatil apaisado', 1440 / 800],
  ['tableta de pie', 768 / 1024],
  ['movil de pie', 375 / 812],
  ['movil tumbado', 812 / 375],
  ['una franja rarisima', 2400 / 600],
];

/** Lo que abarca un tablero de N por M losas, que es lo que le cambia el encuadre. */
const TABLEROS: readonly (readonly [string, number, number])[] = [
  ['la primera losa', 0, 0],
  ['media docena', 2, 2],
  ['el del banco', 6, 5],
  ['uno largo y estrecho', 11, 2],
  ['uno alto y estrecho', 2, 11],
  ['la bolsa entera', 9, 8],
];

const CAMPO_DE_LA_CAMARA = 45;
const T_DEL_CAMPO = Math.tan(((CAMPO_DE_LA_CAMARA / 2) * Math.PI) / 180);

/**
 * PROYECTA UN PUNTO DEL SUELO A COORDENADAS DE LIENZO, con la cámara de mesa puesta.
 *
 * La cámara mira siempre al centro del tablero desde una recta que sube con su
 * inclinación, así que sus tres ejes salen sin álgebra: el de la derecha es el X del
 * mundo, y los otros dos son el seno y el coseno de lo que está inclinada.
 */
function enElLienzo(
  pose: { x: number; y: number; z: number; miraX: number; miraY: number; miraZ: number },
  aspecto: number,
  punto: { x: number; z: number },
): { x: number; y: number; hondo: number } {
  /* El eje que mira: de la camara al tablero, normalizado. */
  const mx = pose.miraX - pose.x;
  const my = pose.miraY - pose.y;
  const mz = pose.miraZ - pose.z;
  const largo = Math.max(1e-9, Math.sqrt(mx * mx + my * my + mz * mz));
  const fx = mx / largo;
  const fy = my / largo;
  const fz = mz / largo;

  /* La derecha: `mira x arriba-del-mundo`, normalizado. */
  const cx = fy * 0 - fz * 1;
  const cy = fz * 0 - fx * 0;
  const cz = fx * 1 - fy * 0;
  const dc = Math.max(1e-9, Math.sqrt(cx * cx + cy * cy + cz * cz));
  const ux = cx / dc;
  const uy = cy / dc;
  const uz = cz / dc;

  /* Y el arriba de la camara: `derecha x mira`. */
  const ax = uy * fz - uz * fy;
  const ay = uz * fx - ux * fz;
  const az = ux * fy - uy * fx;

  const vx = punto.x - pose.x;
  const vy = 0 - pose.y;
  const vz = punto.z - pose.z;
  const hondo = vx * fx + vy * fy + vz * fz;
  const enDerecha = vx * ux + vy * uy + vz * uz;
  const enArriba = vx * ax + vy * ay + vz * az;
  return {
    x: enDerecha / Math.max(1e-6, hondo * T_DEL_CAMPO * aspecto),
    y: enArriba / Math.max(1e-6, hondo * T_DEL_CAMPO),
    hondo,
  };
}

for (const [comoEs, ancho, alto] of TABLEROS) {
  const casillas = [
    { x: 0, y: 0 },
    { x: ancho, y: alto },
  ];
  const abarca = loQueAbarca(casillas);
  for (const [pantalla, aspecto] of LIENZOS) {
    const pose = camaraDeMesa(abarca, aspecto, CAMPO_DE_LA_CAMARA);
    let peorX = 0;
    let peorY = 0;
    let masLejos = 0;
    for (const ex of [abarca.minX - 0.5, abarca.maxX + 0.5]) {
      for (const ey of [abarca.minY - 0.5, abarca.maxY + 0.5]) {
        const v = enElLienzo(pose, aspecto, { x: ex * LADO_DE_LOSA, z: -ey * LADO_DE_LOSA });
        peorX = Math.max(peorX, Math.abs(v.x));
        peorY = Math.max(peorY, Math.abs(v.y));
        masLejos = Math.max(masLejos, v.hondo);
      }
    }
    comprobar(
      `${comoEs} cabe entero en «${pantalla}»`,
      peorX <= 1 && peorY <= 1,
      { peorX: peorX.toFixed(3), peorY: peorY.toFixed(3) },
    );
    /*
     * Y la otra mitad, que es la que nadie mira hasta que el tablero se pone grande: la
     * esquina más lejana tiene que caer DELANTE del plano de fondo del lienzo. Si se
     * pasa, la esquina del tablero desaparece y no falla nada — se ve, y tarde.
     */
    comprobar(
      `${comoEs} no se sale por el fondo en «${pantalla}»`,
      masLejos < pose.lejos,
      { masLejos: Math.round(masLejos), lejos: Math.round(pose.lejos) },
    );
    /* Y no se queda diminuto: si ocupa menos de un tercio, el encuadre esta desperdiciado. */
    comprobar(
      `${comoEs} llena algo de «${pantalla}» y no se queda de sello`,
      Math.max(peorX, peorY) > 0.33,
      { peorX: peorX.toFixed(3), peorY: peorY.toFixed(3) },
    );
  }
}

/*
 * LA LOSA DE LA MANO, en las mismas pantallas. Con su tamaño DENTRO de la cuenta del
 * sitio, esto no puede salir mal por mucho que se toquen las fracciones — que es
 * justamente lo que se compra: que tocarlas no vuelva a sacarla del lienzo.
 */
for (const [pantalla, aspecto] of LIENZOS) {
  const m = sitioDeLaMano(CAMPO_DE_LA_CAMARA, aspecto);
  const izquierda = (m.derecha - m.mediaEnAncho) / m.medioAncho;
  const derecha = (m.derecha + m.mediaEnAncho) / m.medioAncho;
  const abajo = (m.arriba - m.mediaEnAlto) / m.medioAlto;
  const arriba = (m.arriba + m.mediaEnAlto) / m.medioAlto;
  comprobar(
    `la losa de la mano cabe entera en «${pantalla}»`,
    izquierda >= -1 && derecha <= 1 && abajo >= -1 && arriba <= 1,
    { x: [izquierda.toFixed(3), derecha.toFixed(3)], y: [abajo.toFixed(3), arriba.toFixed(3)] },
  );
  comprobar(
    `y va al rincón de abajo a la izquierda en «${pantalla}», no en medio`,
    derecha < 0 && arriba < 0,
    { derecha: derecha.toFixed(3), arriba: arriba.toFixed(3) },
  );
  /*
   * ═══ Y SE VE, MEDIDA CONTRA EL LADO CORTO DE LA PANTALLA ═══
   *
   * Una losa que cabe siempre porque mide cero cumpliría las dos de arriba, así que hay
   * que exigirle un tamaño. Lo que NO vale es exigírselo en fracciones de cada lado: en
   * una franja de cuatro a uno, una losa que ocupa un tercio del alto —perfectamente
   * legible— sale al 15 % del ancho y el comprobador la daba por invisible. El tamaño de
   * algo que se mira no se mide contra el lado largo de la pantalla; se mide contra el
   * CORTO, que es el que decide cuántos milímetros son.
   */
  const corto = Math.min(m.medioAncho, m.medioAlto);
  const deAncho = (m.mediaEnAncho * 2) / corto;
  const deAlto = (m.mediaEnAlto * 2) / corto;
  comprobar(
    `y se ve lo bastante en «${pantalla}» para saber qué losa es`,
    deAncho > 0.25 && deAlto > 0.25,
    { deAncho: deAncho.toFixed(3), deAlto: deAlto.toFixed(3) },
  );
  /* Y no se come la pantalla: mas de tres cuartos del lado corto seria tapar el tablero. */
  comprobar(
    `y no se come «${pantalla}»`,
    deAncho < 0.75 && deAlto < 0.75,
    { deAncho: deAncho.toFixed(3), deAlto: deAlto.toFixed(3) },
  );
}

// ---------------------------------------------------------------------------

/*
 * ═══ EL RELOJ DE ARENA DE LA BOLSA, EN EL OTRO RINCÓN ═══
 *
 * Las mismas dos preguntas que la losa de la mano —¿cabe? ¿se ve?— más la suya propia,
 * que es la única que importa de verdad: QUÉ DICE LA ARENA. Un reloj que cabe, se ve y
 * cuenta al revés es peor que no tenerlo.
 *
 * Y una cosa que ya falló: el alto del reloj depende de CUÁL de los dos se pinte. El de
 * conos del respaldo mide 0,82 lados y el del `.glb` mide uno entero, así que colocarlo
 * con 0,82 lo dejaba dentro mientras el fichero de arte no llegaba y se lo salía por abajo
 * en cuanto llegaba. Aquí se mide con `ALTO_DEL_RELOJ_EN_LADOS`, que es el mayor de los
 * dos y viene de `reloj.tsx`, que es quien los sabe.
 */
for (const [pantalla, aspecto] of LIENZOS) {
  const r = sitioDelRelojDeLaBolsa(CAMPO_DE_LA_CAMARA, aspecto, ALTO_DEL_RELOJ_EN_LADOS);
  const izquierda = (r.derecha - r.mediaEnAncho) / r.medioAncho;
  const derecha = (r.derecha + r.mediaEnAncho) / r.medioAncho;
  const abajo = (r.arriba - r.mediaEnAlto) / r.medioAlto;
  const arriba = (r.arriba + r.mediaEnAlto) / r.medioAlto;
  comprobar(
    `el reloj de la bolsa cabe entero en «${pantalla}»`,
    izquierda >= -1 && derecha <= 1 && abajo >= -1 && arriba <= 1,
    { x: [izquierda.toFixed(3), derecha.toFixed(3)], y: [abajo.toFixed(3), arriba.toFixed(3)] },
  );
  comprobar(
    `y va al rincón de abajo a la DERECHA en «${pantalla}», enfrente de la losa`,
    izquierda > 0 && arriba < 0,
    { izquierda: izquierda.toFixed(3), arriba: arriba.toFixed(3) },
  );
  /* Y no se pisan: la losa está a la izquierda y el reloj a la derecha, sin tocarse. */
  const m = sitioDeLaMano(CAMPO_DE_LA_CAMARA, aspecto);
  comprobar(
    `y no se pisa con la losa de la mano en «${pantalla}»`,
    (m.derecha + m.mediaEnAncho) < (r.derecha - r.mediaEnAncho),
    {
      laLosaAcabaEn: ((m.derecha + m.mediaEnAncho) / m.medioAncho).toFixed(3),
      elRelojEmpiezaEn: izquierda.toFixed(3),
    },
  );
  /* Y se ve: medido contra el lado corto, por lo mismo que la losa. */
  const corto = Math.min(r.medioAncho, r.medioAlto);
  comprobar(
    `y se ve lo bastante en «${pantalla}» para leer la arena de un vistazo`,
    (r.mediaEnAlto * 2) / corto > 0.2,
    { deAlto: ((r.mediaEnAlto * 2) / corto).toFixed(3) },
  );
}

/*
 * ═══ Y LO QUE DICE LA ARENA, QUE ES PARA LO ÚNICO QUE ESTÁ ═══
 *
 * `loQueHaCaido` devuelve lo que YA cayó, que es lo que el componente llama `parte`: cero
 * es la bolsa llena y uno es la bolsa vacía. Al revés —que es como sale si alguien escribe
 * `quedan / deLaBolsa` sin pensarlo— el reloj empieza la partida vacío y se llena, que es
 * exactamente lo contrario de lo que cualquiera va a leer.
 */
{
  const LOSAS = 71;
  comprobar('con la bolsa llena no ha caído nada', loQueHaCaido(LOSAS, LOSAS) === 0, loQueHaCaido(LOSAS, LOSAS));
  comprobar('con la bolsa vacía ha caído todo', loQueHaCaido(0, LOSAS) === 1, loQueHaCaido(0, LOSAS));
  comprobar(
    'y a media bolsa, media arena',
    Math.abs(loQueHaCaido(LOSAS / 2, LOSAS) - 0.5) < 1e-9,
    loQueHaCaido(LOSAS / 2, LOSAS),
  );
  /* Y NO CRECE HACIA ATRÁS: sacar losas sólo puede hacer caer más arena, nunca menos. */
  let anterior = -1;
  for (let quedan = LOSAS; quedan >= 0; quedan--) {
    const ahora = loQueHaCaido(quedan, LOSAS);
    comprobar(
      `con ${String(quedan)} en la bolsa, la arena no ha vuelto a subir`,
      ahora >= anterior && ahora >= 0 && ahora <= 1,
      { quedan, ahora, anterior },
    );
    anterior = ahora;
  }
  /*
   * Y los dos casos que no pueden pasar pero pasarían: una bolsa de cero —que sería una
   * división por cero— y una cuenta pasada de rosca por un estado a medio migrar.
   */
  comprobar('una bolsa de cero no divide por cero', loQueHaCaido(0, 0) === 1, loQueHaCaido(0, 0));
  comprobar('y una cuenta imposible se queda en el tope', loQueHaCaido(-5, LOSAS) === 1 && loQueHaCaido(999, LOSAS) === 0, {
    menos: loQueHaCaido(-5, LOSAS),
    demasiadas: loQueHaCaido(999, LOSAS),
  });
}


/*
 * ═══ Y LA NIEBLA NO SE COME EL TABLERO ═══
 *
 * La niebla de esta escena es del PASEO: a ras de suelo, lo que está lejos se desvanece y
 * eso es lo que da idea de cuánto tablero queda por delante. Mirando la mesa no da
 * profundidad ninguna — se come el tablero.
 *
 * Y no se veía, porque con pocas losas la cámara está cerca y no llega. Se vio mirando el
 * FINAL de una partida, que es la pantalla que más se mira y la única donde el tablero
 * está lleno: con las setenta y dos puestas, la cámara se iba a 2.796 y las esquinas
 * quedaban entre 2.524 y 3.469, con la niebla fija de 1.400 a 5.950. O sea entre el 25 %
 * y el 45 % de niebla encima del tablero, 31 % en el centro. Pálido y sin color.
 *
 * Lo que se exige es lo único que importa: que NINGUNA esquina del tablero llegue a la
 * niebla. Y la otra mitad —que la niebla exista y no se haya ido al infinito—, porque una
 * niebla que empieza detrás del plano de fondo no es niebla: es nada, y entonces la mesa
 * de debajo acaba en un canto duro.
 */
for (const [comoEs, ancho, alto] of TABLEROS) {
  const abarca = loQueAbarca([
    { x: 0, y: 0 },
    { x: ancho, y: alto },
  ]);
  for (const [pantalla, aspecto] of LIENZOS) {
    const pose = camaraDeMesa(abarca, aspecto, CAMPO_DE_LA_CAMARA);
    let laEsquinaMasLejos = 0;
    for (const ex of [abarca.minX - 0.5, abarca.maxX + 0.5]) {
      for (const ey of [abarca.minY - 0.5, abarca.maxY + 0.5]) {
        const dx = ex * LADO_DE_LOSA - pose.x;
        const dz = -ey * LADO_DE_LOSA - pose.z;
        laEsquinaMasLejos = Math.max(laEsquinaMasLejos, Math.sqrt(dx * dx + pose.y * pose.y + dz * dz));
      }
    }
    comprobar(
      `${comoEs} en «${pantalla}»: ni una esquina llega a la niebla`,
      pose.niebla.cerca >= laEsquinaMasLejos - 1e-6,
      { esquina: Math.round(laEsquinaMasLejos), nieblaDesde: Math.round(pose.niebla.cerca) },
    );
    comprobar(
      `${comoEs} en «${pantalla}»: y la niebla existe, que si empieza detrás del fondo no es niebla`,
      pose.niebla.cerca < pose.lejos && pose.niebla.lejos <= pose.lejos,
      { cerca: Math.round(pose.niebla.cerca), lejos: Math.round(pose.niebla.lejos), fondo: Math.round(pose.lejos) },
    );
  }
}


console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos.slice(0, 25)) console.log(`  ✗ ${f}`);
  if (fallos.length > 25) console.log(`  … y ${fallos.length - 25} más`);
  process.exit(1);
}

console.log(`${hechas} comprobaciones`);
console.log('\nEl suelo mira al cielo, las losas casan raya a raya, la muralla no parte ninguna');
console.log('villa, no hay nada en mitad de un camino, el tablero cabe y en el lobby se ve a los cinco.');
