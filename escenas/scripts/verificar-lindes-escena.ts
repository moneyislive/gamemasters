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
 *  8. Y LO QUE DEL PASEO ES DE ESTE VALLE: que la escena anda con el paseo común y no con
 *     uno suyo, que nace donde declara su mundo y con sitio alrededor, y que la figura se
 *     pinta a la altura del suelo que se dibuja. El paseo en sí —tics, choques, mandos,
 *     marioneta— lo mide `verify:paseo`.
 *  9. LA SOBRIA PINTA MENOS, Y LO DICE LA MEDIDA. Los triángulos de las dos calidades con la
 *     misma cuenta del punto 6, lo que cuenta una regla igual en las dos, y el juez que baja a
 *     sobria —con el tablero creciendo, que es lo que le pasa a esta partida—.
 * 10. EN EL TELÉFONO EL VALLE TIENE COLOR. Se abre `tablero.glb` en Node como lo abre la escena:
 *     sin complemento no llega el atlas —el fallo de la app, reproducido—, y con el que pasa la
 *     app, todas las piezas del valle lo llevan.
 * 11. LA VALLA ESTIRADA SE ALARGA, NO ENGORDA. Medido en la caja de cada modelo, y sin tocar
 *     cómo se estira lo que choca.
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
  ALTO_DE_LA_ULTIMA,
  ALTO_DEL_LABRIEGO,
  CELDAS_POR_LOSA,
  CELDAS_POR_MURO,
  LADO_DE_LOSA,
  PIEZAS_POR_LOSA,
  TOPE_DE_TRIANGULOS,
  loQueEncogeElLabriego,
  loQueSeLevantaLaUltima,
} from '../lindes/medidas';
import {
  alturaDe,
  CELDAS_MINIMAS_DE_MURO,
  centroDeCelda,
  LO_QUE_NO_SE_RECORTA,
  montarLaLosa,
  murallasDeLaLosa,
  queHayEn,
  semillaDeLaLosa,
  sueloDeLaLosa,
} from '../lindes/losa';
import type { CeldaDeSuelo, PorQueEsta } from '../lindes/losa';
import { ANCHO_DE_LA_SENDA } from '../lindes/medidas';
import {
  COLOR_DE_LA_ARENA,
  COLOR_DE_LA_CASILLA_CLARA,
  COLOR_DEL_FALDON,
  COLOR_DEL_PRADO,
  COLOR_DE_LA_SENDA,
  COLOR_DE_LA_VILLA,
  VELO_DE_LA_CASILLA_CLARA,
  geometriaDeLaArena,
  geometriaDelSuelo,
} from '../lindes/suelo';
import {
  CUANTAS_EN_EL_DESIERTO,
  LO_QUE_CRECE_EN_LA_ARENA,
  MARGEN_DE_LA_ARENA,
  loQueHayEnElDesierto,
  loQueSeEstira,
} from '../lindes/desierto';
import {
  RADIO_DEL_ALTOZANO,
  RADIO_DEL_CORRO,
  SITIOS_EN_EL_CORRO,
  loQueHayEnLaLinde,
  sitiosDeLaLinde,
} from '../linde-alta/la-linde';
import { ALTURA_DE_UNA_PERSONA, ESCALA_DEL_PACK } from '../escala';
/*
 * Las cámaras de a pie y el giro de la marioneta se miden en su casa de ahora, el paseo común:
 * `lindes/paseo.ts` las reexporta, pero lo que se vigila es lo que se usa, no el cartel.
 */
import { ALTURA_DE_LOS_OJOS, SOBRE_EL_HOMBRO, camaraDeHombro, giroDeLaMarioneta } from '../paseo/camaras';
import {
  alcanceDeLaArena,
  alturaDeLaCamara,
  alturaDelSuelo,
  camaraDeMesa,
  dondeNaceQuienPasea,
  loQueAbarca,
  losasPorCasilla,
} from '../lindes/paseo';
import { mundoDeLasLindes } from '../../shared/arcade/juegos/lindes-mundo';
import {
  ALTO_DE_LA_CAJA_DEL_RELOJ,
  DISTANCIA_DE_LA_MANO,
  DISTANCIA_DE_LA_MANO_A_PIE,
  loQueHaCaido,
  sitioDeLaMano,
  sitioDelRelojDeLaBolsa,
} from '../lindes/rincones';
import { ALTO_DEL_RELOJ_EN_LADOS } from '../reloj';
import { ANILLOS_DE_DETALLE, calidadDelValle, conLaMuestra, MUESTRAS_DE_LA_VENTANA } from '../lindes/detalle';
import type { AnillosDeDetalle } from '../lindes/detalle';
import {
  abrirElTablero,
  cajaDelModelo,
  catalogoDe,
  ejeDelLargo,
  escalaDeLaPuesta,
  VECES_QUE_HACEN_UN_LARGO,
} from '../lindes/catalogo';
import type { Catalogo, ComplementoDelCargador } from '../lindes/catalogo';
import { LARGO_DE_LA_VALLA_EN_PACK } from '../lindes/medidas';
import { juzgarCalidad } from '../embarcadero/calidad';
import type { MuestraDelHilo } from '../embarcadero/calidad';
import type { Calidad } from '../embarcadero/tipos';
import { IMAGEN_DEL_ATLAS } from '../atlas-del-tablero';
import { MODELO } from '../nombres';
import { comoEstorba } from '../../shared/arcade/juegos/lindes-piezas';
/*
 * El complemento del teléfono se importa DE LA APP, que es de donde lo coge su pantalla: lo que
 * se compra es que ÉSE —y no una copia— pinta el valle. `verify:atlas-del-tablero` hace lo mismo.
 */
import { texturasDelTablero } from '../../app/src/tres/texturas-nativas';

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
        /*
         * ═══ «SE APOYA EN EL SUELO» ERA `p.y >= 0`, Y TODAS LAS `y` VALÍAN CERO ═══
         *
         * O sea `0 >= 0`, 4.991 veces. Una comprobación que no puede ponerse roja no vigila
         * nada, y ésta además tapaba un fallo de verdad: el suelo de una losa NO está a cero
         * —la villa se alza `ALZADO_DE_LA_VILLA` y la senda se hunde `HUNDIDO_DE_LA_SENDA`—,
         * así que medido contra el terreno había 1.707 piezas ENTERRADAS y 8 FLOTANDO.
         *
         * Ahora se compara contra la altura de la celda en la que la pieza acaba de verdad,
         * que es lo que `montarLaLosa` le pone al final. Es la misma cuenta por los dos lados
         * —sí—, pero la que se vigila es que la pieza y su celda coincidan DESPUÉS del
         * empujón al azar y del acotado al canto, que es donde se descolocaban.
         */
        const iDeLaPieza = Math.min(
          CELDAS_POR_LOSA - 1,
          Math.max(0, Math.floor((p.x / LADO_DE_LOSA + 0.5) * CELDAS_POR_LOSA)),
        );
        const jDeLaPieza = Math.min(
          CELDAS_POR_LOSA - 1,
          Math.max(0, Math.floor((p.z / LADO_DE_LOSA + 0.5) * CELDAS_POR_LOSA)),
        );
        const suya = celdasDe(losa, giro)[jDeLaPieza * CELDAS_POR_LOSA + iDeLaPieza];
        const suelo = suya === undefined ? 0 : alturaDe(suya.clase);
        comprobar(
          `${losa.id}/${giro}: ${p.pieza} se apoya en el suelo que tiene debajo`,
          Math.abs(p.y - suelo) < 1e-6,
          { y: p.y, suelo, clase: suya?.clase },
        );
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
      /*
       * EL TOPE ERA `PIEZAS_POR_LOSA + 200` —242— y el máximo de verdad es 66, en
       * `calle-blason/0`. Ciento setenta y seis de holgura no es un tope: es un número que
       * no se puede alcanzar, o sea otra comprobación que no vigila nada. El cupo del
       * relleno son `PIEZAS_POR_LOSA`; lo demás son las OBLIGADAS —murallas, remates,
       * casas de la villa, ermita—, que no salen de ese cupo y que en la losa más cargada
       * son 42. Con el doble del cupo se deja sitio a una losa nueva bien poblada y se
       * sigue cazando una fuga.
       */
      comprobar(
        `${losa.id}/${giro}: no se pasa del cupo de relleno`,
        contenido.puestas.length <= PIEZAS_POR_LOSA * 2,
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
  const centro = (LADO_DEL_CUADRADO - 1) / 2;
  /*
   * LA CUENTA, PARA UNOS ANILLOS. Los de la escena, que viven en `detalle.ts`: aquí había un
   * «1.8» y un «4» copiados a mano, y una copia es un presupuesto que sigue midiendo lo de antes
   * el día que alguien cambia la escena. Se lleva aparte lo que cuenta una regla, lo menudo y el
   * relleno, porque la sobria se juzga por partes.
   */
  const conRecorteDe = (
    anillos: AnillosDeDetalle,
  ): { total: number; obligado: number; menudo: number; relleno: number } => {
    const cuenta = { total: 0, obligado: 0, menudo: 0, relleno: 0 };
    for (let fila = 0; fila < LADO_DEL_CUADRADO; fila++) {
      for (let col = 0; col < LADO_DEL_CUADRADO; col++) {
        cuenta.total += sueloPorLosa;
        const dx = col - centro;
        const dy = fila - centro;
        const lejos = Math.sqrt(dx * dx + dy * dy);
        for (const p of laPeorPuesta) {
          const obligada = LO_QUE_NO_SE_RECORTA.indexOf(p.porque) >= 0;
          const tope = p.menuda ? anillos.menudo : anillos.relleno;
          /* Como en la escena: un anillo de cero es NUNCA, y no «lo que caiga justo en el centro». */
          if (!obligada && (tope <= 0 || lejos > tope)) continue;
          const suyos = porModelo.get(p.pieza) ?? 0;
          cuenta.total += suyos;
          if (obligada) cuenta.obligado += suyos;
          else if (p.menuda) cuenta.menudo += suyos;
          else cuenta.relleno += suyos;
        }
      }
    }
    return cuenta;
  };
  const enPlena = conRecorteDe(ANILLOS_DE_DETALLE.plena);
  const conRecorte = enPlena.total;
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

  /*
   * ═══ Y LA SOBRIA, CON LA MISMA CUENTA ═══
   *
   * La escena recibía `calidad` y no la leía: `sobria` pintaba lo mismo que `plena`, y los dos
   * clientes la forzaban a `plena` de todos modos. Se compran tres cosas, las tres con los
   * triángulos del `.glb`: que la sobria PINTA MENOS —y no un poco—; que lo que quita es lo que
   * esta casa quita —lo menudo entero, el relleno de lejos—; y que lo que cuenta una regla se
   * pinta igual en las dos, porque un tablero sin la muralla de una villa cerrada es el tablero
   * mintiendo, y eso no es una cuestión de rendimiento.
   *
   * UNA QUINTA PARTE COMO MÍNIMO, y no «menos que la plena»: con quitar un barril ya sería menos,
   * y una sobria que se deja todo lo que pesa es la plena con otro nombre. Lo medido son un 27 %;
   * el techo lo pone lo que cuenta una regla, que es más de la mitad del tablero peor y no se
   * toca en ninguna calidad.
   */
  paso('En la calidad sobria se pinta menos, medido, y lo que cuenta una regla sigue entero');
  const AHORRO_MINIMO_DE_LA_SOBRIA = 0.2;
  const enSobria = conRecorteDe(ANILLOS_DE_DETALLE.sobria);
  const ahorro = enPlena.total - enSobria.total;
  console.log(
    `  plena ${enPlena.total.toLocaleString('es')} · sobria ${enSobria.total.toLocaleString('es')} ` +
      `(−${ahorro.toLocaleString('es')}, un ${((100 * ahorro) / Math.max(1, enPlena.total)).toFixed(1)} % menos)`,
  );
  console.log(
    `  lo que cuenta una regla, ${enSobria.obligado.toLocaleString('es')} en las dos; lo menudo, ` +
      `${enPlena.menudo.toLocaleString('es')} → ${enSobria.menudo.toLocaleString('es')}; el relleno, ` +
      `${enPlena.relleno.toLocaleString('es')} → ${enSobria.relleno.toLocaleString('es')}`,
  );
  comprobar('la sobria cabe en el presupuesto', enSobria.total <= TOPE_DE_TRIANGULOS, {
    sobria: enSobria.total,
    tope: TOPE_DE_TRIANGULOS,
  });
  comprobar(
    'y pinta al menos una quinta parte menos que la plena en el tablero peor: si no, es la plena con otro nombre',
    enSobria.total <= enPlena.total * (1 - AHORRO_MINIMO_DE_LA_SOBRIA),
    { plena: enPlena.total, sobria: enSobria.total, anillos: ANILLOS_DE_DETALLE },
  );
  comprobar(
    'en sobria no se pinta nada menudo, y en plena sí había',
    enSobria.menudo === 0 && enPlena.menudo > 0,
    { plena: enPlena.menudo, sobria: enSobria.menudo },
  );
  comprobar(
    'y el relleno llega menos lejos',
    enSobria.relleno < enPlena.relleno,
    { plena: enPlena.relleno, sobria: enSobria.relleno },
  );
  comprobar(
    'lo que cuenta una regla —murallas, torres, ermitas— se pinta ENTERO en las dos calidades',
    enSobria.obligado === enPlena.obligado && enPlena.obligado > 0,
    { plena: enPlena.obligado, sobria: enSobria.obligado },
  );
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
  const m = sitioDeLaMano(CAMPO_DE_LA_CAMARA, aspecto, DISTANCIA_DE_LA_MANO);
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
  const r = sitioDelRelojDeLaBolsa(
    CAMPO_DE_LA_CAMARA,
    aspecto,
    ALTO_DEL_RELOJ_EN_LADOS,
    DISTANCIA_DE_LA_MANO,
  );
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
  const m = sitioDeLaMano(CAMPO_DE_LA_CAMARA, aspecto, DISTANCIA_DE_LA_MANO);
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


// ---------------------------------------------------------------------------
paso('El paseo: la tercera persona va detrás de ALGUIEN, y en primera no se pinta a nadie');
// ---------------------------------------------------------------------------

/*
 * ═══ LO QUE ESTO CIERRA ═══
 *
 * Miguel pidió «un tablero enorme que se pueda recorrer en primera o tercera persona CON
 * LOS AVATARES ENCIMA DEL TABLERO». Las tres cámaras estaban y la bitácora daba la capa
 * por hecha — pero `Lindes.tsx` no tenía ni una referencia a un avatar: la cámara de
 * hombro iba DETRÁS DE NADIE. Sólo se ve pulsando «hombro», y no falla nada.
 *
 * Se comprueban las dos mitades que se pueden comprobar sin WebGL: que la cámara esté de
 * verdad detrás —si no, un avatar no arregla nada—, y que la escena lo monte donde toca y
 * no donde no.
 */
{
  const RUMBOS = [0, Math.PI / 4, Math.PI / 2, 2.6, Math.PI, 4.2, 5.5];
  for (const rumbo of RUMBOS) {
    const quien = { x: 137, z: -412, rumbo, andando: 0 };
    const hombro = camaraDeHombro(quien);

    /* Hacia dónde mira quien pasea: cero al norte (−z) y creciendo hacia el este. */
    const adelante = { x: Math.sin(rumbo), z: -Math.cos(rumbo) };
    /* Y del ojo a él: si la cámara está detrás, este vector apunta HACIA delante. */
    const delOjo = { x: quien.x - hombro.x, z: quien.z - hombro.z };
    const conElRumbo = delOjo.x * adelante.x + delOjo.z * adelante.z;
    comprobar(
      `con rumbo ${rumbo.toFixed(2)}, la cámara de hombro está DETRÁS de quien anda`,
      conElRumbo > 0,
      { conElRumbo: conElRumbo.toFixed(2) },
    );
    /* Y mirando hacia donde él mira, que es lo que hace que se le vea la nuca y no la oreja. */
    const aDondeMira = { x: hombro.miraX - hombro.x, z: hombro.miraZ - hombro.z };
    const largo = Math.hypot(aDondeMira.x, aDondeMira.z);
    const alineada = (aDondeMira.x * adelante.x + aDondeMira.z * adelante.z) / Math.max(1e-9, largo);
    comprobar(
      `y mirando hacia donde él mira, no de lado (rumbo ${rumbo.toFixed(2)})`,
      alineada > 0.98,
      { alineada: alineada.toFixed(3) },
    );
    /*
     * Y NO ENCIMA DE ÉL: una cámara de hombro a cero de distancia es una cámara de ojos
     * con otro nombre, y el avatar taparía la pantalla entera.
     */
    comprobar(
      `y a una distancia de persona, no encima (rumbo ${rumbo.toFixed(2)})`,
      Math.hypot(delOjo.x, delOjo.z) > ALTURA_DE_UNA_PERSONA,
      { atras: Math.hypot(delOjo.x, delOjo.z).toFixed(2) },
    );
  }

  /*
   * Y LA ESCENA LO MONTA DONDE TOCA. Se mira en el fuente porque aquí no hay WebGL: lo
   * que se compra es que el avatar EXISTA en la escena y que la primera persona lo
   * apague, que son las dos cosas que no estaban.
   */
  const laEscena = fs.readFileSync(new URL('../lindes/Lindes.tsx', import.meta.url), 'utf8');

  /*
   * ═══ EL FANTASMA ES LA LOSA QUE SE VA A PONER, NO UNA PARECIDA ═══
   *
   * Lo que se pone se monta con `semillaDeLaLosa(semilla, x, y)` —la casilla decide dónde cae
   * cada casa, cada árbol y cada valla— y el fantasma se montaba con `semilla ^ 0x9e37`, que
   * es otra cosa. Medido: 0 de 384 coincidían. Se señalaba una casilla, se veía un reparto, se
   * soltaba la losa y salía otro. Y lo mismo la losa del rincón, la que se tiene «en la mano».
   *
   * Se mira en el fuente porque aquí no hay WebGL, y se mira por la marca exacta que lo
   * causaba: en esta escena no se tuerce ninguna semilla a mano.
   */
  const escenaSinComentarios = laEscena.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  comprobar(
    'ni el fantasma ni la losa de la mano se montan con una semilla inventada',
    !/semilla \^ 0x/.test(escenaSinComentarios),
    { donde: /semilla \^ 0x[0-9a-f]+/.exec(escenaSinComentarios)?.[0] },
  );
  comprobar(
    'y las dos se montan con la de la casilla, que es la que decide lo que cae en la losa',
    /semillaDeLaLosa\(semilla, elegido\.x, elegido\.y\)/.test(escenaSinComentarios) &&
      /semillaDeLaLosa\(semilla, senalado\.x, senalado\.y\)/.test(escenaSinComentarios),
  );

  comprobar(
    'la escena monta a quien anda: sin esto, «tercera persona» es una cámara detrás de nadie',
    /<QuienAnda\b/.test(laEscena),
    laEscena.includes('QuienAnda'),
  );
  comprobar(
    'y no lo monta en la vista de mesa, donde no hay a quién seguir',
    /camara\.modo === 'mesa' \? null : \(/.test(laEscena),
  );
  comprobar(
    'y le dice cuándo está en primera persona, que es cuando la cámara va dentro de su cabeza',
    /enPrimeraPersona=\{camara\.modo === 'ojos'\}/.test(laEscena),
  );
  comprobar(
    'y la figura lee la pose que escribe el paseo, no un paseante propio de la escena',
    /pose=\{paseo\.pose\}/.test(escenaSinComentarios),
  );

  /*
   * ═══ Y SE ANDA CON EL PASEO COMÚN, NO CON UNO PROPIO ═══
   *
   * BOOTS-ON-BOARD §6.1 lo dejó escrito antes de que pasara: el paso con choques se escribe en
   * `shared/mecanicas/andar.ts`, git lo fusiona tan contento con el `unPaso` de siempre, los
   * comprobadores siguen en verde, y `Lindes.tsx` sigue llamando al viejo —uno por fotograma,
   * en coma flotante, sin radio, parando sólo en el borde—: el único juego que se puede andar
   * atravesando murallas. Se mira en el FUENTE sin comentarios, porque es lo único que hay sin
   * WebGL, y se mira por las tres marcas del camino viejo y las dos del nuevo.
   */
  const elPaseoDeLasLindes = fs.readFileSync(new URL('../lindes/paseo.ts', import.meta.url), 'utf8');
  comprobar(
    'la escena anda con el paseo común (`usarElPaseo`), que da el paso de `shared/` por tics',
    /\busarElPaseo\(\{/.test(escenaSinComentarios),
  );
  comprobar(
    'y le da el mundo de Las Lindes, derivado de las mismas losas y la misma semilla que el paisaje',
    /mundoDeLasLindes\(tablero\.losas, semilla\)/.test(escenaSinComentarios) &&
      /const semilla = useMemo\(\(\) => semillaDelCodigo\(codigo, 0x5eed\), \[codigo\]\)/.test(escenaSinComentarios),
  );
  /*
   * Y SÓLO A PIE: derivar el mundo de un tablero lleno cuesta lo que montar su paisaje otra vez
   * —entre 210 y 345 ms en Node, medido—, y mirando la mesa, que es casi toda la partida, no lo
   * usa nadie. Sin la condición, cada losa puesta lo pagaría en todos los aparatos de la mesa.
   */
  comprobar(
    'y lo deriva sólo mientras se anda: en la mesa no se paga',
    /aPie \? mundoDeLasLindes\(tablero\.losas, semilla\) : null/.test(escenaSinComentarios) &&
      /const aPie = camara\.modo !== 'mesa';/.test(escenaSinComentarios),
  );
  comprobar(
    'y ya no da el paso viejo: ni `unPaso(`, ni `hayLosaEn(`, ni un `Set` de casillas puestas',
    !/\bunPaso\(/.test(escenaSinComentarios) &&
      !/\bhayLosaEn\(/.test(escenaSinComentarios) &&
      !/new Set\(tablero\.losas/.test(escenaSinComentarios),
    {
      unPaso: /\bunPaso\(/.test(escenaSinComentarios),
      hayLosaEn: /\bhayLosaEn\(/.test(escenaSinComentarios),
    },
  );
  comprobar(
    'y `lindes/paseo.ts` no guarda un segundo paso que alguien pueda volver a llamar',
    !/export function unPaso\b/.test(elPaseoDeLasLindes) && !/export function hayLosaEn\b/.test(elPaseoDeLasLindes),
  );
  comprobar(
    'y nace donde declara el mundo, en la última losa puesta (`dondeNaceQuienPasea`)',
    /dondeNaceQuienPasea\(tablero\.losas, mundo\)/.test(escenaSinComentarios),
  );
  comprobar(
    'y le dice al paseo a qué altura pisa y en cuál se apoya la cámara, con las cuentas medidas abajo',
    /alturaDelSuelo\(porCasilla, x, z\)/.test(escenaSinComentarios) &&
      /alturaDeLaCamara\(porCasilla, x, z\)/.test(escenaSinComentarios) &&
      /\balturaDeLaCamaraEn,/.test(escenaSinComentarios),
  );
}


// ---------------------------------------------------------------------------
paso('Quien pasea no nace dentro de una casa');
// ---------------------------------------------------------------------------

/*
 * ═══ LO QUE ESTO CIERRA ═══
 *
 * El paseante nacía en el CENTRO EXACTO de la última losa puesta. En un prado da igual;
 * en una villa es nacer dentro de una casa, y la última losa es villa cuatro veces de
 * cada diez. Mirado en el móvil: al pulsar «hombro» la pantalla entera era un tejado rojo
 * a un palmo de la cara. Ninguna geometría falla, ningún comprobador se pone rojo, y es
 * lo PRIMERO que ve quien pulsa el botón.
 *
 * Se barre el mazo entero con sus cuatro giros, que son noventa y seis paisajes, y se
 * mide la holgura: la distancia de donde nace a la pieza levantada más cercana.
 *
 * ═══ SE MIDE EL SITIO QUE USA LA ESCENA, NO UNA CUENTA DE AL LADO ═══
 *
 * Hasta el paseo común esto medía `nacerEnLaLosa`, porque era lo que la escena llamaba.
 * Ahora la escena nace donde DECLARA EL MUNDO —`mundoDeLasLindes(losas, semilla).nace[i]`,
 * con `dondeNaceQuienPasea` eligiendo la `i`—, y seguir midiendo la cuenta vieja habría sido
 * vigilar un camino que ya no se recorre: verde encima de un paseante naciendo en una casa.
 * Así que se mide el sitio declarado, con la misma vara y la misma vacuna, y con la losa
 * montada con la semilla que le toca en la mesa, que es la que decide qué casas se ven.
 */
{
  const holguraEn = (
    x: number,
    z: number,
    puestas: readonly { readonly x: number; readonly z: number }[],
  ): number => {
    let d = Number.POSITIVE_INFINITY;
    for (const q of puestas) d = Math.min(d, Math.hypot(x - q.x, z - q.z));
    return d;
  };

  /*
   * ═══ «LO MÁS CERCANO» ES EL PUNTO MÁS CERCANO DE CUALQUIER COSA ═══
   *
   * El centro de cada pieza, como siempre, y desde que el mundo tiene cuerpos, el punto más
   * cercano de cada caja. Con sólo los centros, un lienzo de muralla contaba por su centro, a
   * veinte unidades de su propia cara: medido al estrenar los cuerpos, en cuatro losas del mazo
   * —la ermita, la calle, la calle con blasón y las dos murallas enfrentadas— la cara del muro
   * quedaba a la espalda de quien nace y un árbol más lejano delante, y la cuenta de centros lo
   * leía como «mirando al bulto». Con las cajas no sale ninguna, y del revés salen las 96: la
   * vacuna de abajo lo exige.
   */
  const loMasCerca = (
    x: number,
    z: number,
    puestas: readonly { readonly x: number; readonly z: number }[],
    cajas: readonly { readonly x0: number; readonly z0: number; readonly x1: number; readonly z1: number }[],
  ): { x: number; z: number; d: number } | null => {
    let mejor: { x: number; z: number; d: number } | null = null;
    for (const q of puestas) {
      const d = Math.hypot(x - q.x, z - q.z);
      if (mejor === null || d < mejor.d) mejor = { x: q.x, z: q.z, d };
    }
    for (const b of cajas) {
      const qx = Math.min(Math.max(x, b.x0), b.x1);
      const qz = Math.min(Math.max(z, b.z0), b.z1);
      const d = Math.hypot(x - qx, z - qz);
      if (mejor === null || d < mejor.d) mejor = { x: qx, z: qz, d };
    }
    return mejor;
  };

  /*
   * DOS PERSONAS DE HOLGURA. No es un número redondo elegido a ojo: los doce centros
   * malos del mazo estaban entre 0.0 y 2.6 —la ermita, exactamente encima de la ermita—,
   * y el peor sitio que elegía la cuenta de la escena tenía 10.35. El umbral cae en medio,
   * lejos de los dos, así que ni deja pasar el fallo ni se pone rojo porque alguien mueva un
   * barril. El peor sitio que declara el mundo, contando ya las cajas, tenía 7,08 al estrenarlo,
   * y 5,64 desde que las piedras que pasan de la cintura estorban (`comoEstorba`): en
   * `villa-tres-senda`, con y sin blasón, giro 1, la caja de una piedra de la cuneta echó al
   * paseante del sitio de antes, y el mejor que queda en esa senda corta tiene una arboleda a
   * 5,64. Sigue por encima del umbral —5,09—, pero ya no lejos: si un día baja de él, es la
   * senda de esa losa la que se ha quedado sin sitio, y hay que mirarla antes que el número.
   */
  const HOLGURA_MINIMA = ALTURA_DE_UNA_PERSONA * 2;

  let centrosMalos = 0;
  let peor = Number.POSITIVE_INFINITY;
  let peorQuien = '';
  let mirandoAlBulto = 0;
  let deEspaldasAlBulto = 0;
  let sinSitio = 0;
  for (const losa of LAS_LOSAS) {
    for (const giro of GIROS) {
      const quien = `${losa.id}/${giro}`;
      const semillaDeLaMesa = 12345 + giro;
      const puestasEnLaMesa = [{ x: 0, y: 0, losa: losa.id, giro, ultima: true }];
      const c = montarLaLosa(losa.id, giro, semillaDeLaLosa(semillaDeLaMesa, 0, 0));
      const suMundo = mundoDeLasLindes(puestasEnLaMesa, semillaDeLaMesa);
      const nace = dondeNaceQuienPasea(puestasEnLaMesa, suMundo);
      if (nace === null) {
        sinSitio++;
        continue;
      }

      /* Lo de antes, para saber si esta comprobación muerde: ver la vacuna de abajo. */
      if (holguraEn(0, 0, c.puestas) < ALTURA_DE_UNA_PERSONA) centrosMalos++;

      const suya = loMasCerca(nace.x, nace.z, c.puestas, suMundo.cuerpos)?.d ?? Number.POSITIVE_INFINITY;
      if (suya < peor) {
        peor = suya;
        peorQuien = quien;
      }
      if (suya < HOLGURA_MINIMA) {
        comprobar(`en ${quien} se nace con sitio alrededor`, false, { holgura: suya.toFixed(2) });
      }

      /* Y DENTRO DE SU LOSA: nacer en el prado del vecino es nacer donde no toca. */
      if (Math.abs(nace.x) > LADO_DE_LOSA / 2 || Math.abs(nace.z) > LADO_DE_LOSA / 2) {
        comprobar(`en ${quien} se nace dentro de la losa`, false, { x: nace.x, z: nace.z });
      }

      /*
       * Y NO EN LA VILLA CUANDO HAY DÓNDE ELEGIR. Es la regla de verdad: la holgura
       * sola se contentaría con la plaza más ancha del pueblo, y por una plaza no se
       * pasea, se va a sitios.
       */
      const i = Math.round(((nace.x / LADO_DE_LOSA) + 0.5) * CELDAS_POR_LOSA - 0.5);
      const j = Math.round(((nace.z / LADO_DE_LOSA) + 0.5) * CELDAS_POR_LOSA - 0.5);
      const suCelda = c.celdas.find((celda) => celda.i === i && celda.j === j);
      const hayDondeElegir = c.celdas.some((celda) => celda.clase !== 'villa');
      if (hayDondeElegir && suCelda !== undefined && suCelda.clase === 'villa') {
        comprobar(`en ${quien} no se nace en la villa habiendo prado o senda`, false, {
          i,
          j,
        });
      }

      /* Y DE ESPALDAS A LO MÁS CERCANO, que si no se nace mirando un muro. */
      const cerca = loMasCerca(nace.x, nace.z, c.puestas, suMundo.cuerpos);
      if (cerca !== null) {
        const adelante = { x: Math.sin(nace.rumbo), z: -Math.cos(nace.rumbo) };
        const alBulto = { x: cerca.x - nace.x, z: cerca.z - nace.z };
        const hacia = adelante.x * alBulto.x + adelante.z * alBulto.z;
        if (hacia > 0) mirandoAlBulto++;
        if (hacia < 0) deEspaldasAlBulto++;
      }
    }
  }

  comprobar('el mundo declara dónde se nace en las noventa y seis losas del mazo', sinSitio === 0, { sinSitio });
  comprobar('en las noventa y seis losas del mazo se nace con sitio alrededor', peor >= HOLGURA_MINIMA, {
    peor: peor.toFixed(2),
    quien: peorQuien,
    minimo: HOLGURA_MINIMA.toFixed(2),
  });
  comprobar('y ninguna nace mirando a lo que tiene más cerca', mirandoAlBulto === 0, {
    mirandoAlBulto,
  });
  /*
   * Y que esa cuenta DISTINGUE: todas las que tienen algo cerca lo tienen a la ESPALDA. Si la
   * dirección se hubiera escrito del revés, o «lo más cercano» no encontrara nada, las dos de
   * arriba seguirían en verde con cero.
   */
  comprobar(
    'y las noventa y seis lo tienen a la espalda, que es lo que la de arriba afirma sin decirlo',
    deEspaldasAlBulto === LAS_LOSAS.length * GIROS.length,
    { deEspaldasAlBulto, deCuantas: LAS_LOSAS.length * GIROS.length },
  );

  /*
   * ═══ LA VACUNA ═══
   *
   * Una comprobación que sólo dice «todo bien» no prueba nada: podría estar mirando una
   * lista vacía. Esto afirma que el fallo EXISTÍA —que el centro de la losa, que es donde
   * se nacía antes de que nadie lo mirase, deja al paseante dentro de algo en doce de los
   * noventa y seis paisajes—, así que el día que el mundo vuelva a declarar el centro esta
   * sección se pone roja.
   */
  comprobar(
    'y el centro de la losa —de donde se venía— sí metía al paseante dentro de algo',
    centrosMalos > 0,
    { centrosMalos, deCuantos: LAS_LOSAS.length * GIROS.length },
  );

  /*
   * ═══ Y DE LA ÚLTIMA LOSA, QUE ES DONDE ESTÁ PASANDO ALGO ═══
   *
   * `nace[i]` es el sitio de `losas[i]`: si la `i` se eligiera mal, se nacería en la primera
   * losa de la partida, a veinte losas de la jugada. Se prueba con la última en medio de la
   * lista —ni la primera ni la del final, que son las dos que un índice mal puesto acierta por
   * casualidad— y sin ninguna marcada, que es cuando vale la primera.
   */
  const tres = [
    { x: 0, y: 0, losa: LAS_LOSAS[0]?.id ?? '', giro: 0 as Giro, ultima: false },
    { x: 1, y: 0, losa: LAS_LOSAS[1]?.id ?? '', giro: 1 as Giro, ultima: true },
    { x: 1, y: 1, losa: LAS_LOSAS[2]?.id ?? '', giro: 2 as Giro, ultima: false },
  ];
  const suMundo = mundoDeLasLindes(tres, 777);
  comprobar(
    'se nace en el sitio que el mundo declara para la ÚLTIMA losa puesta, esté donde esté en la lista',
    dondeNaceQuienPasea(tres, suMundo) === suMundo.nace[1] && suMundo.nace[1] !== undefined,
  );
  comprobar(
    'y si ninguna está marcada como la última, en la primera',
    dondeNaceQuienPasea(
      tres.map((l) => ({ ...l, ultima: false })),
      suMundo,
    ) === suMundo.nace[0],
  );
}


// ---------------------------------------------------------------------------
paso('El avatar MIRA hacia donde anda, y no sólo cuando anda al norte');
// ---------------------------------------------------------------------------

/*
 * ═══ LO QUE ESTO CIERRA ═══
 *
 * `quien-anda.tsx` giraba la marioneta con `rumbo + Math.PI`. Esa cuenta acierta al NORTE
 * y al SUR, y da lo CONTRARIO al este y al oeste: el aventurero andaba de espaldas media
 * vuelta de cada dos. Como el paseante nace mirando al norte, mirarlo una vez lo daba por
 * bueno — y de hecho así se dio por bueno, con un comentario explicando la media vuelta.
 *
 * Visto en el móvil girando de cuarenta y cinco en cuarenta y cinco: dos nucas y dos caras
 * en 180° de giro. Con la cámara pegada detrás, el ángulo aparente sólo cambia si el muñeco
 * está espejado.
 *
 * Lo que se compra aquí es la cuenta, que es donde estaba el fallo: que al girar la
 * marioneta por `giroDeLaMarioneta(r)` su cara acabe mirando EXACTAMENTE al rumbo, en las
 * cuatro direcciones y en las de en medio.
 */
{
  /* Las marionetas de KayKit nacen mirando a su +z; girar θ deja ese +z en (sin θ, cos θ). */
  const aDondeMira = (giro: number): { x: number; z: number } => ({
    x: Math.sin(giro),
    z: Math.cos(giro),
  });

  let peorError = 0;
  for (let k = 0; k < 24; k++) {
    const rumbo = -Math.PI + (k * (Math.PI * 2)) / 24;
    /* Hacia donde ANDA, que es lo que dice `unPaso` y de donde no se puede discrepar. */
    const anda = { x: Math.sin(rumbo), z: -Math.cos(rumbo) };
    const mira = aDondeMira(giroDeLaMarioneta(rumbo));
    const error = Math.hypot(mira.x - anda.x, mira.z - anda.z);
    if (error > peorError) peorError = error;
    if (error > 1e-9) {
      comprobar(`con rumbo ${rumbo.toFixed(2)} la marioneta mira a donde anda`, false, {
        anda: `${anda.x.toFixed(3)},${anda.z.toFixed(3)}`,
        mira: `${mira.x.toFixed(3)},${mira.z.toFixed(3)}`,
      });
    }
  }
  comprobar('en las veinticuatro direcciones la marioneta mira a donde anda', peorError <= 1e-9, {
    peorError: peorError.toExponential(2),
  });

  /*
   * ═══ LA VACUNA ═══
   *
   * Que la cuenta vieja NO pasaría esto. Sin esta línea, alguien podría escribir una
   * comprobación que acepte las dos —por ejemplo comparando sólo el eje z, que en las dos
   * cuentas coincide— y quedarse tan tranquilo. Aquí se afirma que discrimina, y en cuántas
   * direcciones.
   */
  let malasConLaVieja = 0;
  for (let k = 0; k < 24; k++) {
    const rumbo = -Math.PI + (k * (Math.PI * 2)) / 24;
    const anda = { x: Math.sin(rumbo), z: -Math.cos(rumbo) };
    const mira = aDondeMira(rumbo + Math.PI);
    if (Math.hypot(mira.x - anda.x, mira.z - anda.z) > 1e-9) malasConLaVieja++;
  }
  comprobar(
    'y la cuenta de antes —«+ media vuelta»— fallaba en 22 de las 24, acertando sólo norte y sur',
    malasConLaVieja === 22,
    { malasConLaVieja },
  );

  /*
   * Y que la escena usa la cuenta, no una copia suelta que se quede vieja aparte. Se lee la
   * marioneta en su casa de ahora, el paseo común, que es la que monta `Lindes.tsx`: la de
   * `lindes/quien-anda.tsx` sólo la reexporta, y mirar ahí sería leer el cartel de la mudanza.
   */
  const elAvatar = fs.readFileSync(new URL('../paseo/quien-anda.tsx', import.meta.url), 'utf8');
  comprobar(
    'la escena gira al avatar con `giroDeLaMarioneta`, no con una media vuelta a mano',
    /g\.rotation\.y = giroDeLaMarioneta\(/.test(elAvatar) && !/rotation\.y = .*\+ Math\.PI/.test(elAvatar),
  );
  comprobar(
    'y la escena monta ESA marioneta, la del paseo común',
    /import \{ QuienAnda \} from '\.\.\/paseo\/quien-anda';/.test(
      fs.readFileSync(new URL('../lindes/Lindes.tsx', import.meta.url), 'utf8'),
    ),
  );
}


// ---------------------------------------------------------------------------
paso('Andando, la losa de la mano y el reloj NO se entierran bajo el tablero');
// ---------------------------------------------------------------------------

/*
 * ═══ LO QUE ESTO CIERRA ═══
 *
 * Los dos rincones no cuelgan de la cámara: se recolocan delante de ella y son objetos del
 * MUNDO, para que se iluminen y se enniebla con lo que tienen alrededor. Eso está bien
 * razonado — y tiene una consecuencia que no se había mirado: un objeto del mundo puede
 * quedar DEBAJO DEL SUELO.
 *
 * A sesenta unidades, el canto de abajo cae dieciocho por debajo del ojo. Mirando la mesa
 * da igual, que la cámara va altísima. Andando, el ojo está a dos y medio: la losa de la
 * mano y el reloj se quedaban catorce unidades bajo el tablero y DESAPARECÍAN los dos al
 * pulsar «hombro» u «ojos». Visto en el móvil; no falla nada, no avisa nadie, y el jugador
 * deja de ver qué losa tiene y cuánto queda en la bolsa.
 */
{
  /* Lo más bajo que llega el rincón, en unidades del mundo, con el ojo a esa altura. */
  const loMasBajo = (ojo: number, arriba: number, mediaEnAlto: number): number =>
    ojo + arriba - mediaEnAlto;

  const OJOS: readonly (readonly [string, number])[] = [
    ['en primera persona', ALTURA_DE_LOS_OJOS],
    ['por encima del hombro', SOBRE_EL_HOMBRO],
  ];

  let elPeor = Number.POSITIVE_INFINITY;
  for (const [pantalla, aspecto] of LIENZOS) {
    const m = sitioDeLaMano(CAMPO_DE_LA_CAMARA, aspecto, DISTANCIA_DE_LA_MANO_A_PIE);
    const r = sitioDelRelojDeLaBolsa(
      CAMPO_DE_LA_CAMARA,
      aspecto,
      ALTO_DEL_RELOJ_EN_LADOS,
      DISTANCIA_DE_LA_MANO_A_PIE,
    );
    for (const [comoSeMira, ojo] of OJOS) {
      for (const [queEs, sitio, cuelga] of [
        ['la losa de la mano', m, 0],
        /*
         * El reloj ya no acaba en su base: debajo lleva la CAJA en la que se apoya, y es la
         * caja la que toca el suelo primero. Sin este sumando la comprobación mediría un
         * objeto que no es el que se entierra.
         */
        ['el reloj de la bolsa', r, r.lado * ALTO_DE_LA_CAJA_DEL_RELOJ],
      ] as const) {
        const bajo = loMasBajo(ojo, sitio.arriba, sitio.mediaEnAlto) - cuelga;
        if (bajo < elPeor) elPeor = bajo;
        if (bajo <= 0) {
          comprobar(`${queEs} se ve ${comoSeMira} en «${pantalla}»`, false, {
            loMasBajo: bajo.toFixed(2),
          });
        }
      }
    }

    /*
     * ═══ Y SE VEN EXACTAMENTE IGUAL QUE EN LA MESA ═══
     *
     * Esto es lo que hace que el arreglo sea acercarlos y no moverlos: TODO lo que
     * devuelven las dos cuentas es proporcional a la distancia, así que las fracciones de
     * pantalla no cambian. Si algún día alguien mete un término que no escale, el rincón
     * cambiaría de sitio o de tamaño al echar a andar — y saldría aquí.
     */
    const lejos = sitioDeLaMano(CAMPO_DE_LA_CAMARA, aspecto, DISTANCIA_DE_LA_MANO);
    comprobar(
      `la losa de la mano ocupa lo mismo en la pantalla de cerca que de lejos en «${pantalla}»`,
      Math.abs(m.derecha / m.medioAncho - lejos.derecha / lejos.medioAncho) < 1e-12 &&
        Math.abs(m.mediaEnAlto / m.medioAlto - lejos.mediaEnAlto / lejos.medioAlto) < 1e-12,
      {
        cerca: (m.derecha / m.medioAncho).toFixed(6),
        lejos: (lejos.derecha / lejos.medioAncho).toFixed(6),
      },
    );
  }
  comprobar('el rincón más bajo sigue estando por encima del tablero', elPeor > 0, {
    elPeor: elPeor.toFixed(2),
  });

  /*
   * ═══ LA VACUNA ═══
   *
   * Que con la distancia de la mesa SÍ se entierran. Sin esto, la comprobación de arriba
   * podría estar midiendo algo que nunca da negativo y leerse como vigilada.
   */
  let enterradosConLaDeLejos = 0;
  for (const [, aspecto] of LIENZOS) {
    const m = sitioDeLaMano(CAMPO_DE_LA_CAMARA, aspecto, DISTANCIA_DE_LA_MANO);
    const r = sitioDelRelojDeLaBolsa(
      CAMPO_DE_LA_CAMARA,
      aspecto,
      ALTO_DEL_RELOJ_EN_LADOS,
      DISTANCIA_DE_LA_MANO,
    );
    for (const [, ojo] of OJOS) {
      if (loMasBajo(ojo, m.arriba, m.mediaEnAlto) < 0) enterradosConLaDeLejos++;
      if (loMasBajo(ojo, r.arriba, r.mediaEnAlto) < 0) enterradosConLaDeLejos++;
    }
  }
  comprobar(
    'y con la distancia de la mesa se enterraban los dos en todas las pantallas',
    enterradosConLaDeLejos === LIENZOS.length * OJOS.length * 2,
    { enterradosConLaDeLejos },
  );
}


// ---------------------------------------------------------------------------
paso('Quien pasea se pinta SOBRE el suelo que pisa, y la cámara no baja a la senda');
// ---------------------------------------------------------------------------

/*
 * ═══ LO QUE ESTO CIERRA ═══
 *
 * El aventurero se pintaba a la altura cero, y el suelo del valle no está en el cero: la senda
 * va hundida y la villa alzada. En la senda —que es por donde se anda— se le veía flotando
 * media persona sobre el camino. Ahora el paseo le pregunta a la escena la altura del suelo en
 * cada punto (`alturaDelSuelo`), y aquí se compara con el suelo QUE SE DIBUJA: los rectángulos
 * de arriba de la geometría de verdad, leídos triángulo a triángulo. Si la cuenta se equivocara
 * de celda, de eje o de signo, pintaría la figura a la altura de la celda de al lado.
 *
 * Las losas van repartidas lejos del origen y con sus cuatro giros: en la casilla (0, 0) un
 * signo cambiado en la `z` no se ve, porque menos cero es cero.
 */
{
  const losasDeLaPrueba = LAS_LOSAS.map((l, k) => ({
    x: (k % 6) - 2,
    y: Math.floor(k / 6) - 1,
    losa: l.id,
    giro: (k % 4) as Giro,
  }));
  const porCasilla = losasPorCasilla(losasDeLaPrueba);
  const geometria = geometriaDelSuelo(losasDeLaPrueba);
  /* Los rectángulos de arriba: cada seis vértices son una cara, y las de arriba miran al cielo. */
  const tapas: { x0: number; x1: number; z0: number; z1: number; y: number }[] = [];
  if (geometria !== null) {
    const p = geometria.getAttribute('position').array as ArrayLike<number>;
    const n = geometria.getAttribute('normal').array as ArrayLike<number>;
    for (let v = 0; v + 5 < p.length / 3; v += 6) {
      if ((n[v * 3 + 1] as number) < 0.99) continue;
      let x0 = Number.POSITIVE_INFINITY;
      let x1 = Number.NEGATIVE_INFINITY;
      let z0 = Number.POSITIVE_INFINITY;
      let z1 = Number.NEGATIVE_INFINITY;
      for (let k = 0; k < 6; k++) {
        const x = p[(v + k) * 3] as number;
        const z = p[(v + k) * 3 + 2] as number;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (z < z0) z0 = z;
        if (z > z1) z1 = z;
      }
      tapas.push({ x0, x1, z0, z1, y: p[v * 3 + 1] as number });
    }
    geometria.dispose();
  }
  comprobar('la geometría del suelo tiene tapas que mirar', tapas.length > losasDeLaPrueba.length, {
    tapas: tapas.length,
  });

  let muestras = 0;
  let distintas = 0;
  let conCeldasCambiadas = 0;
  const alturasVistas = new Set<number>();
  let primeraMala: unknown = null;
  for (const l of losasDeLaPrueba) {
    const suLosa = losaPorId(l.losa);
    if (suLosa === null) continue;
    for (let ci = 1; ci < CELDAS_POR_LOSA; ci += 3) {
      for (let cj = 2; cj < CELDAS_POR_LOSA; cj += 3) {
        /* Dentro de la celda y fuera de su centro, que es donde una cuenta a medias acierta. */
        const fx = (ci + 0.3) / CELDAS_POR_LOSA - 0.5;
        const fz = (cj + 0.7) / CELDAS_POR_LOSA - 0.5;
        const x = (l.x + fx) * LADO_DE_LOSA;
        const z = (-l.y + fz) * LADO_DE_LOSA;
        const tapa = tapas.find((t) => x > t.x0 && x < t.x1 && z > t.z0 && z < t.z1);
        if (tapa === undefined) continue;
        muestras++;
        alturasVistas.add(Math.round(tapa.y * 1000));
        const cuenta = alturaDelSuelo(porCasilla, x, z);
        if (Math.abs(cuenta - tapa.y) > 1e-6) {
          distintas++;
          if (primeraMala === null) primeraMala = { losa: l.losa, giro: l.giro, ci, cj, cuenta, dibujada: tapa.y };
        }
        /* La vacuna: la misma pregunta con las dos celdas cruzadas, que es el error de siempre. */
        const cruzada = alturaDe(queHayEn(suLosa, l.giro, centroDeCelda(cj, ci)));
        if (Math.abs(cruzada - tapa.y) > 1e-6) conCeldasCambiadas++;
      }
    }
  }
  comprobar(
    'la altura a la que se pinta a quien pasea es la del suelo que se dibuja, en cada muestra',
    distintas === 0 && muestras > 1000,
    { muestras, distintas, primeraMala },
  );
  comprobar(
    'y las muestras pisan las tres alturas: senda, prado y villa',
    alturasVistas.has(Math.round(alturaDe('senda') * 1000)) &&
      alturasVistas.has(0) &&
      alturasVistas.has(Math.round(alturaDe('villa') * 1000)),
    [...alturasVistas],
  );
  comprobar(
    'y la comprobación distingue: con las celdas cruzadas, la cuenta se equivoca',
    conCeldasCambiadas > muestras / 20,
    { conCeldasCambiadas, muestras },
  );
  comprobar(
    'y fuera de las losas puestas no hay suelo que pisar: cero',
    alturaDelSuelo(porCasilla, 40 * LADO_DE_LOSA, 40 * LADO_DE_LOSA) === 0,
  );
  comprobar(
    'la senda de verdad está por debajo del cero: una figura a la altura cero flotaba sobre el camino',
    alturaDe('senda') < -ALTURA_DE_UNA_PERSONA / 4,
    { senda: alturaDe('senda').toFixed(3) },
  );

  /*
   * ═══ Y LA CÁMARA NO BAJA A LA SENDA CON LOS PIES ═══
   *
   * Los rincones de a pie —la losa de la mano y el reloj— cuelgan delante de la cámara con sus
   * cuentas hechas para un suelo en el cero, y el paso de arriba mide que su canto de abajo queda
   * por encima del suelo DESDE DONDE MIRA la cámara. Si la cámara bajara con los pies a la senda,
   * ese canto quedaría por debajo del prado de al lado, y andando pegado al borde del camino los
   * dos se meterían en el suelo. Por eso `alturaDeLaCamara` no baja del prado.
   */
  let camaraEnLaSenda = 0;
  for (const l of losasDeLaPrueba) {
    for (let ci = 1; ci < CELDAS_POR_LOSA; ci += 3) {
      for (let cj = 2; cj < CELDAS_POR_LOSA; cj += 3) {
        const x = (l.x + (ci + 0.5) / CELDAS_POR_LOSA - 0.5) * LADO_DE_LOSA;
        const z = (-l.y + (cj + 0.5) / CELDAS_POR_LOSA - 0.5) * LADO_DE_LOSA;
        const pies = alturaDelSuelo(porCasilla, x, z);
        const camara = alturaDeLaCamara(porCasilla, x, z);
        if (camara < 0 || camara !== Math.max(0, pies)) camaraEnLaSenda++;
      }
    }
  }
  comprobar('la cámara de a pie se apoya en el suelo, y nunca por debajo del prado', camaraEnLaSenda === 0, {
    camaraEnLaSenda,
  });

  /*
   * La vacuna: con la cámara en la senda, el canto de abajo de la mano y del reloj en «ojos»
   * quedaría por debajo del prado en TODAS las pantallas. Si algún día los rincones se acercan o
   * se suben lo bastante, esto se pone rojo, y entonces la cámara ya puede bajar con los pies.
   */
  let bajoElPrado = 0;
  for (const [, aspecto] of LIENZOS) {
    const m = sitioDeLaMano(CAMPO_DE_LA_CAMARA, aspecto, DISTANCIA_DE_LA_MANO_A_PIE);
    const r = sitioDelRelojDeLaBolsa(CAMPO_DE_LA_CAMARA, aspecto, ALTO_DEL_RELOJ_EN_LADOS, DISTANCIA_DE_LA_MANO_A_PIE);
    const ojoEnLaSenda = alturaDe('senda') + ALTURA_DE_LOS_OJOS;
    if (ojoEnLaSenda + m.arriba - m.mediaEnAlto < 0) bajoElPrado++;
    if (ojoEnLaSenda + r.arriba - r.mediaEnAlto - r.lado * ALTO_DE_LA_CAJA_DEL_RELOJ < 0) bajoElPrado++;
  }
  comprobar(
    'y con la cámara en la senda, la mano y el reloj se meterían en el prado en todas las pantallas',
    bajoElPrado === LIENZOS.length * 2,
    { bajoElPrado, deCuantos: LIENZOS.length * 2 },
  );
}


// ---------------------------------------------------------------------------
paso('Las ayudas de la mesa se quedan en la mesa, que a pie son disparates');
// ---------------------------------------------------------------------------

/*
 * ═══ LO QUE ESTO CIERRA, Y POR QUÉ SON EL MISMO FALLO DOS VECES ═══
 *
 * Hay cosas del tablero que NO están a escala del paisaje a propósito, porque su trabajo
 * es leerse desde arriba entre las casitas:
 *
 *   · el LABRIEGO mide siete personas, para que se vea de quién es cada cosa;
 *   · la ÚLTIMA LOSA levanta sus piezas, para que se vea cuál acaba de ponerse.
 *
 * Las dos decisiones son buenas y las dos están razonadas en `medidas.ts`. Y las dos se
 * escribieron cuando este tablero sólo se miraba desde arriba. Al recorrerlo a pie, la
 * primera es un gigante rojo de trece metros —lo que llenaba la pantalla al pulsar
 * «hombro», y lo que me hizo creer que el avatar salía gigante— y la segunda son las casas
 * de una losa entera flotando a dos alturas de hombre sobre su propio terreno, justo la
 * losa donde NACE el paseante.
 *
 * Por eso las dos medidas viven fuera de la escena: para que esto se pueda comprobar sin
 * montar WebGL, y para que la próxima ayuda de mesa que alguien añada tenga dónde mirar.
 */
{
  comprobar(
    'desde la mesa el labriego sigue midiendo lo suyo, que es de lo que sirve',
    loQueEncogeElLabriego(false) === 1,
  );
  comprobar(
    'y a pie mide EXACTAMENTE lo que el aventurero que anda a su lado',
    Math.abs(ALTO_DEL_LABRIEGO * loQueEncogeElLabriego(true) - ALTURA_DE_UNA_PERSONA) < 1e-9,
    { aPie: (ALTO_DEL_LABRIEGO * loQueEncogeElLabriego(true)).toFixed(3) },
  );
  comprobar(
    'desde la mesa la última losa sigue levantándose, que es como se ve cuál es',
    loQueSeLevantaLaUltima(false) === ALTO_DE_LA_ULTIMA && ALTO_DE_LA_ULTIMA > 0,
  );
  comprobar('y a pie no se levanta nada del tablero', loQueSeLevantaLaUltima(true) === 0);

  /*
   * ═══ LA VACUNA: QUE LAS DOS AYUDAS SON DE VERDAD DISPARATES A PIE ═══
   *
   * Sin esto, las cuatro líneas de arriba seguirían en verde el día que alguien dejara las
   * dos ayudas en un tamaño que no molesta —y entonces el interruptor sobraría y nadie lo
   * sabría—. Aquí se afirma lo que hace falta que sea verdad para que el interruptor tenga
   * sentido: que aplicadas a pie se verían, y mucho.
   */
  comprobar(
    'el labriego de la mesa, a pie, mediría más de cinco personas',
    ALTO_DEL_LABRIEGO / ALTURA_DE_UNA_PERSONA > 5,
    { personas: (ALTO_DEL_LABRIEGO / ALTURA_DE_UNA_PERSONA).toFixed(1) },
  );
  comprobar(
    'y el resalte de la última losa dejaría más de una persona de aire bajo cada casa',
    ALTO_DE_LA_ULTIMA / ALTURA_DE_UNA_PERSONA > 1,
    { personas: (ALTO_DE_LA_ULTIMA / ALTURA_DE_UNA_PERSONA).toFixed(1) },
  );

  /* Y que la escena pregunta por las medidas en vez de llevar su propia copia. */
  const laEscena = fs.readFileSync(new URL('../lindes/Lindes.tsx', import.meta.url), 'utf8');
  comprobar(
    'la escena encoge al labriego preguntando, no con una cuenta suya',
    /const cuanto = loQueEncogeElLabriego\(aPie\);/.test(laEscena),
  );
  comprobar(
    'y levanta la última losa preguntando, no con la constante a pelo',
    /const seLevanta = loQueSeLevantaLaUltima\(aPie\);/.test(laEscena) &&
      /casilla === ultima \? seLevanta : 0/.test(laEscena),
  );
}


// ---------------------------------------------------------------------------
paso('La arena se distingue del tablero, y el desierto está donde tiene que estar');
// ---------------------------------------------------------------------------

/*
 * ═══ LO QUE ESTO CIERRA ═══
 *
 * El fondo era un fieltro verde casi negro. Cumplía lo suyo —tapar las juntas entre losas para
 * que no se viera el cielo por ellas— y traía dos cosas que Miguel vio al sentarse: el tablero
 * parecía flotar sobre un agujero, y el reloj de arena, con su marco horneado casi negro, se
 * perdía contra él.
 *
 * Lo que decide si dos cosas se distinguen no es el tono: es la LUMINANCIA. Y ahí estaba el
 * fallo, que no se ve mirando los colores en la paleta: el faldón de la losa iba a 61 y el
 * fieltro a 50. Once puntos. Con la arena a 200 hay ciento cuarenta.
 */
{
  const luz = (hex: string): number => {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const DEL_FIELTRO_DE_ANTES = '#2b3524';
  const arena = luz(COLOR_DE_LA_ARENA);
  const faldon = luz(COLOR_DEL_FALDON);

  /*
   * EL FALDÓN CONTRA EL FONDO es el número que importa: es el canto de cada losa, o sea la
   * raya que dice dónde acaba una pieza y empieza la siguiente. Si eso no recorta, el tablero
   * se lee como una mancha y no como piezas puestas.
   */
  comprobar(
    'el canto de la losa recorta contra la arena: más de cien de luminancia',
    arena - faldon > 100,
    { arena: arena.toFixed(0), faldon: faldon.toFixed(0), diferencia: (arena - faldon).toFixed(0) },
  );

  /* Y los tres suelos de losa, que van casi juntos, también se separan del fondo. */
  for (const [que, color] of [
    ['el prado', COLOR_DEL_PRADO],
    ['la senda', COLOR_DE_LA_SENDA],
    ['la villa', COLOR_DE_LA_VILLA],
  ] as const) {
    comprobar(`y ${que} se separa de la arena`, Math.abs(arena - luz(color)) > 40, {
      suelo: luz(color).toFixed(0),
      arena: arena.toFixed(0),
    });
  }

  /*
   * ═══ LA VACUNA ═══
   *
   * Que el fieltro de antes NO pasaría esto. Sin esta línea, la comprobación de arriba podría
   * estar midiendo algo que cualquier color cumple, y se leería como vigilada.
   */
  comprobar(
    'y el fieltro verde de antes no lo cumplía: once puntos de luminancia contra el canto',
    luz(DEL_FIELTRO_DE_ANTES) - faldon < 20,
    { fieltro: luz(DEL_FIELTRO_DE_ANTES).toFixed(0), faldon: faldon.toFixed(0) },
  );


  /*
   * ═══ Y LA CASILLA CLARA, QUE ES UN VELO Y SE JUZGA COMPUESTO ═══
   *
   * La marca de «aquí cabe tu losa» es un velo translúcido encima del suelo, así que su color
   * a secas no dice nada: lo que se ve es el color COMPUESTO sobre lo que tiene debajo. Era
   * `#f3e7b8` al 32 %, que sobre el fieltro verde oscuro de antes se leía de sobra — y sobre
   * la arena compone 210 contra 200. **Diez puntos.** El panel seguía diciendo «señala una
   * casilla clara y tócala» mientras las casillas claras eran del color del suelo.
   *
   * Lo encontré probándolo: no acertaba a poner una losa porque no veía dónde. Es el mismo
   * fallo que el fieltro y en el sitio de al lado, y el mismo que no ve nadie mirando la
   * paleta — porque en la paleta los dos colores son muy distintos.
   */
  {
    const compuesto = (fondo: number, velo: string, cuanto: number): number =>
      fondo * (1 - cuanto) + luz(velo) * cuanto;

    const laCasilla = compuesto(arena, COLOR_DE_LA_CASILLA_CLARA, VELO_DE_LA_CASILLA_CLARA);
    comprobar(
      'la casilla clara se distingue de la arena que tiene debajo: más de treinta de luminancia',
      Math.abs(laCasilla - arena) > 30,
      { casilla: laCasilla.toFixed(0), arena: arena.toFixed(0), diferencia: Math.abs(laCasilla - arena).toFixed(0) },
    );

    /*
     * ═══ LA VACUNA ═══
     *
     * Que el velo de antes NO lo cumplía sobre la arena. Sin esto, la línea de arriba podría
     * estar midiendo algo que cualquier velo cumple —y no lo es: el de antes daba diez—.
     */
    const elDeAntes = compuesto(arena, '#f3e7b8', 0.32);
    comprobar(
      'y el velo claro de antes se perdía sobre la arena: menos de quince',
      Math.abs(elDeAntes - arena) < 15,
      { antes: elDeAntes.toFixed(0), arena: arena.toFixed(0) },
    );
    /* Y que sobre el fieltro viejo SÍ valía, que es lo que explica por qué nadie lo vio. */
    comprobar(
      'y sobre el fieltro de antes sí valía, que por eso estaba escrito así',
      Math.abs(compuesto(luz(DEL_FIELTRO_DE_ANTES), '#f3e7b8', 0.32) - luz(DEL_FIELTRO_DE_ANTES)) > 30,
    );
  }

  /* ── El desierto ── */
  const LOSAS_DE_PRUEBA = [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ];
  const piezas = loQueHayEnElDesierto(LOSAS_DE_PRUEBA, 20260918);

  comprobar(`el desierto son ${String(CUANTAS_EN_EL_DESIERTO)} piezas, ni una más`, piezas.length === CUANTAS_EN_EL_DESIERTO, {
    cuantas: piezas.length,
  });

  /* LA MISMA MESA, EL MISMO DESIERTO: si no, cada pantalla vería un sitio distinto. */
  const otraVez = loQueHayEnElDesierto(LOSAS_DE_PRUEBA, 20260918);
  comprobar(
    'dos veces la misma semilla dan el mismo desierto, hasta el último decimal',
    JSON.stringify(piezas) === JSON.stringify(otraVez),
  );
  /* Y vacuna de lo contrario: que la semilla sirva para algo. */
  comprobar(
    'y otra semilla da otro desierto, que si no la semilla no pintaría nada',
    JSON.stringify(piezas) !== JSON.stringify(loQueHayEnElDesierto(LOSAS_DE_PRUEBA, 777)),
  );

  const x0 = -0.5 * LADO_DE_LOSA;
  const x1 = 1.5 * LADO_DE_LOSA;
  const z0 = -1.5 * LADO_DE_LOSA;
  const z1 = 0.5 * LADO_DE_LOSA;
  const sectores = new Set<number>();
  for (const pieza of piezas) {
    /*
     * NINGUNA ENCIMA DEL TABLERO. Es lo primero: un peñasco sobre una losa tapa la partida, y
     * es lo que pasaría el día que alguien toque la cuenta del radio sin mirar.
     */
    const dentro = pieza.x > x0 && pieza.x < x1 && pieza.z > z0 && pieza.z < z1;
    comprobar(`ninguna pieza del desierto cae sobre el tablero (${pieza.pieza})`, !dentro, {
      x: pieza.x.toFixed(0),
      z: pieza.z.toFixed(0),
    });

    /* Y ninguna fuera de la arena, que sería un peñasco flotando sobre el vacío azul. */
    const fuera =
      pieza.x < x0 - MARGEN_DE_LA_ARENA ||
      pieza.x > x1 + MARGEN_DE_LA_ARENA ||
      pieza.z < z0 - MARGEN_DE_LA_ARENA ||
      pieza.z > z1 + MARGEN_DE_LA_ARENA;
    comprobar(`ni fuera de la arena (${pieza.pieza})`, !fuera, {
      x: pieza.x.toFixed(0),
      z: pieza.z.toFixed(0),
    });

    /* El tamaño, en personas: ni guijarros que no se ven ni pedruscos que tapan el tablero. */
    const personas = pieza.tamano / ALTURA_DE_UNA_PERSONA;
    comprobar(`y su lado mayor mide entre cinco y diez personas (${pieza.pieza})`, personas >= 5 && personas <= 10, {
      personas: personas.toFixed(1),
    });

    /* Y sale del pack que este juego ya baja: pedir un modelo de más sería pedir otro fichero. */
    comprobar(
      `y es una pieza de las que crecen en la arena (${pieza.pieza})`,
      LO_QUE_CRECE_EN_LA_ARENA.includes(pieza.pieza),
    );

    const centroX = (x0 + x1) / 2;
    const centroZ = (z0 + z1) / 2;
    const angulo = Math.atan2(pieza.z - centroZ, pieza.x - centroX);
    sectores.add(Math.floor(((angulo + Math.PI * 2) % (Math.PI * 2)) / ((Math.PI * 2) / CUANTAS_EN_EL_DESIERTO)));
  }

  /*
   * ═══ Y NINGUNA SE ESTIRA HASTA SER UN LANCHÓN ═══
   *
   * La primera versión pedía el ALTO y dividía por el alto del modelo. Con una pieza
   * rechoncha sale bien; con una plana, no: medido en `tablero.glb`, `roca-a` es CUATRO VECES
   * Y MEDIA más ancha que alta, así que pidiéndole nueve personas de alto salía con noventa y
   * ocho unidades de ancho —más de media losa de tablero— mientras la cuenta decía tan
   * tranquila «nueve personas». Miguel lo vio en el tablero: «son demasiado grandes, o al
   * menos no es proporcional la forma al tamaño».
   *
   * Aquí se le da a `loQueSeEstira` una caja PLANA A PROPÓSITO y se le pregunta qué ocupa el
   * resultado. Es la comprobación que no existía, y la que se pone roja el día que alguien
   * vuelva a dividir por el alto.
   */
  {
    const UN_LANCHON = { ancho: 0.30, alto: 0.07, fondo: 0.28 };
    const UNA_RECHONCHA = { ancho: 0.42, alto: 0.28, fondo: 0.36 };
    const TOPE = ALTURA_DE_UNA_PERSONA * 10;

    for (const [comoEs, caja] of [
      ['plana como un lanchón', UN_LANCHON],
      ['rechoncha', UNA_RECHONCHA],
    ] as const) {
      const escala = loQueSeEstira(caja, TOPE);
      const enElMundo = {
        ancho: caja.ancho * escala * ESCALA_DEL_PACK,
        alto: caja.alto * escala * ESCALA_DEL_PACK,
        fondo: caja.fondo * escala * ESCALA_DEL_PACK,
      };
      const mayor = Math.max(enElMundo.ancho, enElMundo.alto, enElMundo.fondo);
      comprobar(
        `una piedra ${comoEs} pedida al máximo ocupa lo que se le pide y ni una unidad más`,
        Math.abs(mayor - TOPE) < 1e-9,
        { mayor: mayor.toFixed(1), pedido: TOPE.toFixed(1) },
      );
      /* Y en losas, que es la unidad en la que se ve si tapa la partida. */
      comprobar(
        `y no se come el tablero: menos de un sexto de losa (${comoEs})`,
        mayor < LADO_DE_LOSA / 6,
        { enLosas: (mayor / LADO_DE_LOSA).toFixed(3) },
      );
    }

    /*
     * ═══ LA VACUNA ═══
     *
     * Que la cuenta vieja —dividir por el ALTO— sí rompía esto, y por cuánto. Sin esta línea
     * las de arriba seguirían en verde el día que alguien las cambie por algo que no
     * discrimina, y se leerían como vigiladas.
     */
    const porElAlto = TOPE / (UN_LANCHON.alto * ESCALA_DEL_PACK);
    const anchoConLaVieja = UN_LANCHON.ancho * porElAlto * ESCALA_DEL_PACK;
    comprobar(
      'y la cuenta de antes —por el alto— sacaba del lanchón más de media losa de ancho',
      anchoConLaVieja > LADO_DE_LOSA / 2,
      { ancho: anchoConLaVieja.toFixed(0), enLosas: (anchoConLaVieja / LADO_DE_LOSA).toFixed(2) },
    );
  }

  /*
   * ═══ Y DESPERDIGADAS, QUE NO ES LO MISMO QUE AL AZAR ═══
   *
   * Ocho tiradas independientes dejan parejas pegadas y lados vacíos, y eso no se lee como un
   * paisaje sino como un descuido. Una por sector es lo que lo evita, y esto lo comprueba: si
   * alguien cambia el reparto por un `Math.random()` suelto, los sectores se repiten y salta.
   */
  comprobar('y hay una en cada sector: ninguna pareja pegada y ningún lado vacío', sectores.size === CUANTAS_EN_EL_DESIERTO, {
    sectores: sectores.size,
  });
}

paso('La arena llega hasta donde pisa el cuadro, y ni la niebla ni el fondo la cortan');

/*
 * ═══ EL DESIERTO TIENE QUE SER EL FONDO, NO UN ROMBO FLOTANDO ═══
 *
 * Medido en el lienzo con una partida de cuatro losas en marcha: el 35 % del cuadro era
 * CIELO —`#8cb8de` exacto, no niebla— en dos cuñas a izquierda y derecha que bajaban hasta
 * el filo de abajo, y el 18 % de la mitad inferior. Miguel había pedido que «el fondo pasaría
 * a ser color arena»; con eso, un tercio del fondo seguía sin serlo.
 *
 * Y las tres cosas que lo causaban eran la misma: la arena se dimensionaba desde EL TABLERO
 * —su caja más dos losas— y el plano de fondo y la niebla desde LA ESQUINA DEL TABLERO,
 * cuando lo que decide qué entra en el cuadro es a qué distancia se ha puesto la cámara. La
 * esquina de ARRIBA del cuadro pisa el suelo a 1,5 veces esa distancia, o sea más allá de
 * las tres. Es otra vez «medido en el centro, no en la esquina».
 *
 * Esto lo mira por donde se rompió: se echan los cuatro rayos de las esquinas del cuadro,
 * se ve dónde pisan, y se exige que pisen ARENA, por delante del plano de fondo y por delante
 * de la niebla. Los rayos se construyen aquí con la base de la cámara —no con `sueloQueSeVe`—
 * para que la comprobación no sea la misma cuenta mirándose al espejo.
 */
{
  /** Dónde pisa el suelo el rayo que sale por la esquina `(u, v)` del cuadro. */
  const dondePisa = (
    pose: { x: number; y: number; z: number; miraX: number; miraY: number; miraZ: number },
    aspecto: number,
    u: number,
    v: number,
  ): { x: number; z: number; hasta: number } | null => {
    const mx = pose.miraX - pose.x;
    const my = pose.miraY - pose.y;
    const mz = pose.miraZ - pose.z;
    const largo = Math.max(1e-9, Math.sqrt(mx * mx + my * my + mz * mz));
    const fx = mx / largo;
    const fy = my / largo;
    const fz = mz / largo;
    /* La derecha: `mira x arriba-del-mundo`. */
    const cx = -fz;
    const cz = fx;
    const dc = Math.max(1e-9, Math.sqrt(cx * cx + cz * cz));
    const dx = cx / dc;
    const dz = cz / dc;
    /* Y el arriba de la cámara: `derecha x mira`. */
    const ax = -dz * fy;
    const ay = dz * fx - dx * fz;
    const az = dx * fy;
    const t = T_DEL_CAMPO;
    const rx = fx + u * t * aspecto * dx + v * t * ax;
    const ry = fy + v * t * ay;
    const rz = fz + u * t * aspecto * dz + v * t * az;
    if (ry >= -1e-9) return null;
    const s = -pose.y / ry;
    const largoDelRayo = Math.sqrt(rx * rx + ry * ry + rz * rz);
    return { x: pose.x + s * rx, z: pose.z + s * rz, hasta: s * largoDelRayo };
  };

  /** Los cantos de la arena que pinta la escena, leídos de la geometría de verdad. */
  const cantosDeLaArena = (
    losas: readonly { readonly x: number; readonly y: number }[],
    alcanza?: { x0: number; x1: number; z0: number; z1: number },
  ): { x0: number; x1: number; z0: number; z1: number } => {
    const g = geometriaDeLaArena(losas.map((l) => ({ x: l.x, y: l.y, losa: 'X', giro: 0 as Giro })), alcanza);
    if (g === null) return { x0: 0, x1: 0, z0: 0, z1: 0 };
    const p = g.getAttribute('position').array as ArrayLike<number>;
    let x0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let z0 = Number.POSITIVE_INFINITY;
    let z1 = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i] as number;
      const z = p[i + 2] as number;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
    }
    g.dispose();
    return { x0, x1, z0, z1 };
  };

  let esquinasMiradas = 0;
  let seSalieronConLaVieja = 0;

  for (const [comoEs, ancho, alto] of TABLEROS) {
    const casillas = [
      { x: 0, y: 0 },
      { x: ancho, y: alto },
    ];
    const abarca = loQueAbarca(casillas);
    for (const [pantalla, aspecto] of LIENZOS) {
      const pose = camaraDeMesa(abarca, aspecto, CAMPO_DE_LA_CAMARA);
      /*
       * El alcance, con LA MISMA cuenta que usa `Lindes.tsx` —lo de la mesa y lo del paseo—, y
       * no con una copia: aquí había la cuenta entera escrita a mano, con el `LADO_DE_LOSA * 34`
       * de la niebla copiado de la escena, y el día que la niebla cambiase la copia seguiría en
       * verde midiendo la arena de antes. Que la escena usa esta cuenta se mira abajo.
       */
      const alcanza = alcanceDeLaArena(abarca, pose.suelo);
      const arena = cantosDeLaArena(casillas, alcanza);
      const vieja = cantosDeLaArena(casillas);

      let fuera = 0;
      let fueraConLaVieja = 0;
      let detrasDelFondo = 0;
      let conNiebla = 0;
      let sinPisar = 0;
      for (const u of [-1, 1]) {
        for (const v of [-1, 1]) {
          const pisa = dondePisa(pose, aspecto, u, v);
          esquinasMiradas++;
          if (pisa === null) {
            sinPisar++;
            continue;
          }
          const dentro = (a: { x0: number; x1: number; z0: number; z1: number }): boolean =>
            pisa.x >= a.x0 && pisa.x <= a.x1 && pisa.z >= a.z0 && pisa.z <= a.z1;
          if (!dentro(arena)) fuera++;
          if (!dentro(vieja)) fueraConLaVieja++;
          if (pisa.hasta > pose.lejos) detrasDelFondo++;
          if (pisa.hasta > pose.niebla.cerca + 1) conNiebla++;
        }
      }
      seSalieronConLaVieja += fueraConLaVieja;

      comprobar(
        `${comoEs} en «${pantalla}»: las cuatro esquinas del cuadro pisan arena`,
        fuera === 0,
        { fuera, arena },
      );
      comprobar(
        `${comoEs} en «${pantalla}»: y ninguna queda detrás del plano de fondo`,
        detrasDelFondo === 0,
        { detrasDelFondo, lejos: pose.lejos.toFixed(0) },
      );
      comprobar(
        `${comoEs} en «${pantalla}»: y la niebla no le quita el color a nada que se vea`,
        conNiebla === 0,
        { conNiebla, nieblaCerca: pose.niebla.cerca.toFixed(0) },
      );
      /*
       * Con 50° de inclinación y 45 de campo el rayo de arriba baja con 0,50, así que las
       * cuatro pisan. Si alguien tumba la cámara y alguna se va al horizonte, esto lo dice
       * en vez de dejar que la comprobación de arriba pase sin mirar ninguna.
       */
      comprobar(`${comoEs} en «${pantalla}»: las cuatro esquinas miran al suelo`, sinPisar === 0, {
        sinPisar,
      });
    }
  }

  /*
   * ═══ LAS DOS VACUNAS ═══
   *
   * La primera, que se ha mirado algo: cero esquinas es cero fuera, y se leería como vigilado.
   * La segunda, que la guarda MUERDE: con la arena de antes —la caja de las losas más
   * `MARGEN_DE_LA_ARENA` y nada más— tienen que salirse esquinas. Si no se saliera ninguna,
   * esta sección estaría comprando algo que ya pasaba y el 35 % de cielo seguiría ahí.
   */
  comprobar('y se han echado las cuatro esquinas de cada tablero en cada pantalla', esquinasMiradas === TABLEROS.length * LIENZOS.length * 4, {
    esquinasMiradas,
    esperadas: TABLEROS.length * LIENZOS.length * 4,
  });
  comprobar(
    `y con la arena de antes —sólo ${(MARGEN_DE_LA_ARENA / LADO_DE_LOSA).toFixed(0)} losas de margen— se salían esquinas: por eso se veía el cielo`,
    seSalieronConLaVieja > 0,
    { seSalieronConLaVieja, deCuantas: esquinasMiradas },
  );

  /*
   * Y QUE LA ESCENA USA ESTA CUENTA Y ESTA NIEBLA. Si `Lindes.tsx` volviera a escribirse la
   * suya, todo lo de arriba mediría una arena que no se pinta: por eso la cuenta salió de la
   * escena a `lindes/paseo.ts`, y por eso se mira que la escena no lleve números propios.
   */
  const laEscenaDeLaArena = fs
    .readFileSync(new URL('../lindes/Lindes.tsx', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  comprobar(
    'la escena monta la arena con `alcanceDeLaArena` y la niebla del paseo con `NIEBLA_DEL_PASEO`, sin números suyos',
    /alcanceDeLaArena\(abarca, camaraDeMesa\(/.test(laEscenaDeLaArena) &&
      /nAndando\.near = NIEBLA_DEL_PASEO\.cerca;/.test(laEscenaDeLaArena) &&
      /nAndando\.far = NIEBLA_DEL_PASEO\.lejos;/.test(laEscenaDeLaArena) &&
      !/LADO_DE_LOSA \* (8|34)\b/.test(laEscenaDeLaArena),
  );
}

paso('El relleno del prado cae donde hay prado, y no se gasta entero en la banda de arriba');

/*
 * ═══ EL CUPO SE GASTABA DE NORTE A SUR ═══
 *
 * El barrido que siembra el prado va por filas, de norte a sur, y cortaba en cuanto la lista
 * llegaba al cupo de `PIEZAS_POR_LOSA`. O sea que las primeras filas se lo llevaban entero.
 * Medido sobre `senda-recta`, que tiene el prado UNIFORME —276 celdas en cada una de las ocho
 * bandas—: las piezas salían 8, 8, 9, 0, 0, 0, 0, 0. Los cinco octavos del sur, pelados. En
 * `muralla`, 11, 19, 24, 0, 0, 0, 0, 0. Y multiplicado por setenta y dos losas, el tablero
 * entero sale rayado.
 *
 * Esto lo mide por donde se rompió: se cuentan las CELDAS de prado por bandas y las PIEZAS de
 * prado por bandas, y se exige que donde hay prado de sobra haya algo puesto. No se pide un
 * reparto exacto —el azar es azar y una banda puede quedarse corta— sino que ninguna banda con
 * prado de verdad se quede en cero mientras otra se lleva el montón.
 */
{
  const BANDAS = 8;
  const medioDeLaLosa = LADO_DE_LOSA / 2;
  const deQueBanda = (z: number): number =>
    Math.min(BANDAS - 1, Math.max(0, Math.floor(((z + medioDeLaLosa) / LADO_DE_LOSA) * BANDAS)));
  /* La `z` de una fila de celdas, con la misma cuenta que usa `losa.ts` a la inversa. */
  const zDeLaFila = (j: number): number => ((j + 0.5) / CELDAS_POR_LOSA - 0.5) * LADO_DE_LOSA;

  let miradas = 0;
  let conPradoEnLasDosMitades = 0;
  let pelada = 0;
  const peores: string[] = [];
  /** Lo mismo, con el reparto viejo simulado: coger las primeras hasta el cupo. */
  let peladaALaVieja = 0;
  /* Y el recuento del corpus entero, que es donde la propiedad se puede afirmar sin azar. */
  let celdasSurTotal = 0;
  let celdasTotal = 0;
  let piezasSurTotal = 0;
  let piezasTotal = 0;

  for (const losa of LAS_LOSAS) {
    for (const giro of GIROS) {
      for (const semilla of [1000, 7, 424242]) {
        const { puestas, celdas } = montarLaLosa(losa.id, giro, semilla);
        miradas++;
        const celdasPorBanda = new Array<number>(BANDAS).fill(0);
        for (let j = 0; j < CELDAS_POR_LOSA; j++) {
          for (let i = 0; i < CELDAS_POR_LOSA; i++) {
            const c = celdas[j * CELDAS_POR_LOSA + i];
            if (c === undefined || c.clase !== 'prado') continue;
            const b = deQueBanda(zDeLaFila(j));
            celdasPorBanda[b] = (celdasPorBanda[b] ?? 0) + 1;
          }
        }
        const delPrado = puestas.filter((p) => p.porque === 'prado');
        const piezasPorBanda = new Array<number>(BANDAS).fill(0);
        for (const p of delPrado) {
          const b = deQueBanda(p.z);
          piezasPorBanda[b] = (piezasPorBanda[b] ?? 0) + 1;
        }
        const mitad = BANDAS / 2;
        const celdasNorte = celdasPorBanda.slice(0, mitad).reduce((a, b) => a + b, 0);
        const celdasSur = celdasPorBanda.slice(mitad).reduce((a, b) => a + b, 0);
        const piezasSur = piezasPorBanda.slice(mitad).reduce((a, b) => a + b, 0);
        celdasTotal += celdasNorte + celdasSur;
        celdasSurTotal += celdasSur;
        piezasTotal += delPrado.length;
        piezasSurTotal += piezasSur;
        /*
         * Y la mirada losa a losa se reserva al caso en el que el azar no explica nada: la
         * mitad de abajo tiene LA MITAD del prado y hay doce piezas o más. Con menos de eso
         * —seis piezas y un sur que es el 29 % del campo— que no caiga ninguna al sur es
         * azar corriente, y una comprobación que se pone roja por azar es peor que ninguna.
         */
        if (celdasSur < celdasNorte || delPrado.length < 12) continue;
        conPradoEnLasDosMitades++;
        if (piezasSur === 0) {
          pelada++;
          if (peores.length < 5) peores.push(`${losa.id}/${giro}/${semilla}: ${piezasPorBanda.join(',')}`);
        }
        /*
         * Y el reparto viejo, simulado fielmente sobre la MISMA lista: el corte del barrido
         * se quedaba con las de más al norte, así que se ordena por `z` y se toma la mitad
         * de arriba. Es lo que tiene que salir pelado, y es lo que hace que esta sección
         * compre algo que no pasaba ya.
         */
        const aLaVieja = delPrado
          .slice()
          .sort((a, b) => a.z - b.z)
          .slice(0, Math.max(1, Math.floor(delPrado.length / 2)));
        if (aLaVieja.every((p) => deQueBanda(p.z) < mitad)) peladaALaVieja++;
      }
    }
  }

  /*
   * LA PROPIEDAD, SOBRE EL CORPUS ENTERO: el reparto de las piezas sigue al reparto del
   * campo. Aquí el azar ya no manda —son miles de piezas—, así que esto se puede exigir
   * estrecho. Antes del arreglo la mitad de abajo tenía el 49 % de las celdas y el 12 % de
   * las piezas; ahora las dos cifras se dan la mano.
   */
  const parteDelSurEnCeldas = celdasSurTotal / Math.max(1, celdasTotal);
  const parteDelSurEnPiezas = piezasSurTotal / Math.max(1, piezasTotal);
  comprobar(
    'las piezas del prado se reparten como el prado: la mitad de abajo recibe lo que le toca',
    parteDelSurEnPiezas > parteDelSurEnCeldas * 0.75,
    {
      celdas: `${(100 * parteDelSurEnCeldas).toFixed(1)} %`,
      piezas: `${(100 * parteDelSurEnPiezas).toFixed(1)} %`,
      piezasTotal,
    },
  );

  comprobar(
    'ninguna losa con MÁS prado abajo que arriba se queda sin una sola pieza en la de abajo',
    pelada === 0,
    { pelada, deCuantas: conPradoEnLasDosMitades, peores },
  );
  /* Vacuna 1: que hay losas que juzgar. Cero juzgadas es cero peladas, y se lee como vigilado. */
  comprobar('y hay losas con más prado abajo que arriba que juzgar', conPradoEnLasDosMitades >= 20, {
    conPradoEnLasDosMitades,
    miradas,
  });
  /*
   * Vacuna 2: que la guarda MUERDE. Con el reparto de antes —las primeras del barrido— tiene
   * que haber losas que se queden enteras en el norte. Si no saliera ninguna, esta sección
   * estaría comprando algo que ya pasaba.
   */
  comprobar(
    'y quedándose con las primeras del barrido, como antes, sí salen losas enteras en el norte',
    peladaALaVieja > 0,
    { peladaALaVieja, deCuantas: conPradoEnLasDosMitades },
  );
}

paso('Dos sitios con el mismo nombre se distinguen por su cifra, y la cifra va siempre');

/*
 * ═══ UNA LOSA PUEDE OFRECER DOS PRADOS, Y SE LLAMAN IGUAL ═══
 *
 * El rótulo de un sitio sale de su CLASE —«Labriego en el prado»— y una losa con dos
 * praderas que no se tocan ofrece dos sitios de la misma clase: dos renglones con la misma
 * frase palabra por palabra. Lo único que los distingue en la lista es la cifra de al lado.
 *
 * Los dos clientes la escondían cuando valía cero: el escritorio dejaba la cadena vacía y la
 * app pintaba una raya. Visto jugando una mesa de verdad —en la pantalla salían «Labriego en
 * el prado · vale 3» y «Labriego en el prado ·», y en el móvil los dos con «—»—, y en las dos
 * el jugador tenía que elegir entre dos botones idénticos sin saber en qué se diferencian.
 *
 * El cero no es «nada que decir»: es lo que hay que decir. Un prado que hoy no toca ninguna
 * villa cerrada vale cero HOY, y eso es justo lo que el jugador necesita para no plantar ahí
 * el labriego que no vuelve.
 */
{
  const CLIENTES = [
    ['el escritorio', '../../escritorio/src/lindes-en-tres.tsx'],
    ['la app', '../../app/src/arcade/lindes-en-tres-escena.tsx'],
  ] as const;
  for (const [quien, ruta] of CLIENTES) {
    const fuente = fs.readFileSync(new URL(ruta, import.meta.url), 'utf8');
    /* Sin comentarios: la explicación de por qué esto está prohibido no puede tumbarlo. */
    const soloCodigo = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    comprobar(
      `${quien} nunca esconde la cifra de un sitio: nada de «valdria > 0 ?»`,
      !/valdria\s*>\s*0\s*\?/.test(soloCodigo),
      { donde: /valdria\s*>\s*0\s*\?[^\n]*/.exec(soloCodigo)?.[0] },
    );
    /* Vacuna: que se está mirando el fichero que pinta los sitios, y no otro cualquiera. */
    comprobar(`y se ha leído el fichero que pinta los sitios de ${quien}`, soloCodigo.includes('s.valdria') && soloCodigo.includes('s.rotulo'), {
      letras: soloCodigo.length,
    });
  }

  /*
   * Y la razón por la que esto importa, comprobada en el mazo de verdad y no supuesta: hay
   * losas con dos prados. Si no las hubiera, la guarda de arriba estaría defendiendo un caso
   * que no existe y sobraría entera.
   */
  const conDosPrados = LAS_LOSAS.filter((l) => l.prados.length >= 2);
  comprobar(
    'y en el mazo hay losas con más de un prado, que es cuando dos rótulos salen idénticos',
    conDosPrados.length > 0,
    { cuantas: conDosPrados.length, ejemplos: conDosPrados.slice(0, 3).map((l) => l.nombre) },
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * DE AQUÍ ABAJO SE LEE TAMBIÉN EL FUENTE de la escena y de los dos clientes: en Node no hay
 * lienzo, y que la escena use lo que aquí se mide sólo se ve en lo que está escrito. Sin
 * comentarios —las cabeceras cuentan lo que estuvo mal con sus nombres, y una regla que
 * castigara nombrarlo enseñaría a no documentarlo— y cada regla VISTA CAER sobre una copia
 * envenenada del propio fichero: una regla que no se ve caer puede estar mirando otra cosa.
 * ───────────────────────────────────────────────────────────────────────────── */

const leerCodigo = (ruta: string): string =>
  fs
    .readFileSync(new URL(ruta, import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/** Afirma la regla sobre el fichero de verdad, y la ve caer con cada caso envenenado. */
function reglaDelFuente(
  que: string,
  prueba: (texto: string) => boolean,
  bueno: string,
  envenenados: readonly string[],
): void {
  comprobar(que, prueba(bueno));
  envenenados.forEach((envenenado, i) => {
    comprobar(
      `y «${que}» se ve CAER con el caso envenenado ${String(i + 1)}`,
      envenenado !== bueno && !prueba(envenenado),
      'una regla que no se ve caer puede estar mirando otra cosa, y entonces es verde para siempre',
    );
  });
}

/** El elemento `<Lindes … />` de un cliente, entero: lo que se le pasa a la escena. */
const elementoDeLaEscena = (texto: string): string => /<Lindes\b[\s\S]*?\/>/.exec(texto)?.[0] ?? '';

const fuenteDeLaEscena = leerCodigo('../lindes/Lindes.tsx');
const fuenteDeLaApp = leerCodigo('../../app/src/arcade/lindes-en-tres-escena.tsx');
const fuenteDelEscritorio = leerCodigo('../../escritorio/src/lindes-en-tres.tsx');
/* El controlador que usan las dos: lo que hacían igual, escrito una vez. */
const fuenteDelControlador = leerCodigo('../lindes/el-valle-en-la-mesa.ts');

paso('La calidad la decide lo que cuesta pintar: el juez de la casa, con el tablero creciendo');

{
  /* Muestras como las que manda la escena: la media de un segundo y cuántos fotogramas cubre. */
  const RAPIDA: MuestraDelHilo = { ms: 16, fotogramas: 60 };
  const LENTA: MuestraDelHilo = { ms: 30, fotogramas: 33 };
  const repetida = (m: MuestraDelHilo, veces: number): MuestraDelHilo[] => Array.from({ length: veces }, () => m);
  /** Lo que hace un cliente: cada muestra entra en la ventana y se vuelve a juzgar. */
  const siguiendo = (antes: Calidad, muestras: readonly MuestraDelHilo[]): Calidad => {
    let ventana: MuestraDelHilo[] = [];
    let calidad = antes;
    for (const m of muestras) {
      ventana = conLaMuestra(ventana, m);
      calidad = calidadDelValle(calidad, ventana);
    }
    return calidad;
  };

  comprobar('un aparato que pinta a 16 ms por fotograma se queda en plena', siguiendo('plena', repetida(RAPIDA, 6)) === 'plena');
  comprobar('uno que pinta a 30 ms baja a sobria', siguiendo('plena', repetida(LENTA, 6)) === 'sobria');
  comprobar(
    'y mientras no hay 120 fotogramas no se juzga: se sigue en plena',
    calidadDelValle('plena', [{ ms: 40, fotogramas: 60 }]) === 'plena',
  );
  comprobar(
    'un tirón suelto —un segundo de diez fotogramas— no baja a nadie',
    siguiendo('plena', [...repetida(RAPIDA, 5), { ms: 100, fotogramas: 10 }, ...repetida(RAPIDA, 5)]) === 'plena',
  );
  comprobar(
    'y la sobria no sube: un relleno que entrara y saliera sería peor que cualquiera de las dos',
    siguiendo('sobria', repetida(RAPIDA, 30)) === 'sobria',
  );
  let ventana: MuestraDelHilo[] = [];
  for (const m of repetida(RAPIDA, 100)) ventana = conLaMuestra(ventana, m);
  comprobar(
    `la ventana son las últimas ${String(MUESTRAS_DE_LA_VENTANA)} muestras: una partida de tres días no arrastra su historial`,
    ventana.length === MUESTRAS_DE_LA_VENTANA,
    ventana.length,
  );

  /*
   * ═══ EL TABLERO CRECE, Y POR ESO NO SE JUZGA UNA SOLA VEZ ═══
   *
   * Una partida empieza con UNA losa. Se simula lo que ve el cliente: medio minuto pintando un
   * tablero pequeño y luego uno grande con el que el aparato ya no puede. Preguntando al juez con
   * cada muestra, baja; preguntándole una vez al montar —lo que hace el Burgo en la app, cuya
   * ciudad está entera desde el primer fotograma— se habría quedado en plena para siempre. La
   * segunda comprobación es la vacuna de la primera: sin ella, podría estar comprando algo que ya
   * pasaba solo.
   */
  const partida = [...repetida(RAPIDA, 30), ...repetida(LENTA, 20)];
  comprobar(
    'con el tablero creciendo y el aparato quedándose justo, se baja a sobria',
    siguiendo('plena', partida) === 'sobria',
  );
  let unaVez: Calidad | null = null;
  const vistas: MuestraDelHilo[] = [];
  for (const m of partida) {
    vistas.push(m);
    unaVez = juzgarCalidad(vistas);
    if (unaVez !== null) break;
  }
  comprobar(
    'y juzgando una sola vez, al montar, se habría quedado en plena: por eso se juzga con cada muestra',
    unaVez === 'plena',
    { unaVez },
  );

  /* ─── Y la escena y los dos clientes usan esto, y no otra cosa ─── */

  /*
   * La cuenta de arriba da lo que cuenta una regla ENTERO en las dos calidades porque lo cuenta
   * así; que la escena también lo haga depende de que el recorte —el anillo, el cero que es
   * nunca, el desvanecerse— viva DENTRO de la guarda de `LO_QUE_NO_SE_RECORTA`. Se exige aquí.
   */
  reglaDelFuente(
    'la escena recorta con los anillos de la calidad que le llega, y no con números suyos; un anillo de cero es nunca; y lo que cuenta una regla no pasa por el recorte',
    (t) =>
      /const anillos = ANILLOS_DE_DETALLE\[calidad\];/.test(t) &&
      /<UnModelo\b[\s\S]*?\banillos=\{anillos\}[\s\S]*?\/>/.test(t) &&
      /const conRelleno = anillos\.relleno \* LADO_DE_LOSA;/.test(t) &&
      /const conMenudo = anillos\.menudo \* LADO_DE_LOSA;/.test(t) &&
      /<LoQueSePoneEncima\b[\s\S]*?\bcalidad=\{calidad\}[\s\S]*?\/>/.test(t) &&
      /if \(LO_QUE_NO_SE_RECORTA\.indexOf\(p\.porque\) < 0\) \{\s*const tope = p\.menuda \? conMenudo : conRelleno;\s*if \(tope <= 0\) continue;/.test(
        t,
      ),
    fuenteDeLaEscena,
    [
      fuenteDeLaEscena.replace('ANILLOS_DE_DETALLE[calidad]', 'ANILLOS_DE_DETALLE.plena'),
      fuenteDeLaEscena.replace('if (tope <= 0) continue;', ''),
      fuenteDeLaEscena.replace('if (LO_QUE_NO_SE_RECORTA.indexOf(p.porque) < 0) {', '{'),
    ],
  );
  /*
   * LA MEDIDA ES LA DEL GANCHO COMÚN (`comun/arranque.ts`): la escena se lo pide diciendo que sólo mida
   * con el tablero cargado, y no mide por su cuenta; el gancho acota cada fotograma a cien milisegundos,
   * manda una vez por segundo la media de ESE segundo y vuelve a contar desde cero. Se juzgan los dos
   * fuentes juntos para que cada caso envenenado rompa una sola cosa, en uno o en otro.
   */
  const SEPARADOR_DEL_GANCHO = '\n/* ── el gancho de arranque ── */\n';
  const laEscenaYSuGancho = `${fuenteDeLaEscena}${SEPARADOR_DEL_GANCHO}${leerCodigo('../comun/arranque.ts')}`;
  reglaDelFuente(
    'y mide una vez por segundo con la media de ESE segundo, y sólo con el tablero cargado: con el gancho común',
    (t) => {
      const [escena = '', gancho = ''] = t.split(SEPARADOR_DEL_GANCHO);
      return (
        /usarArranqueYMedida\(props, \{ llave: traer, midiendo: catalogo !== null \}\)/.test(escena) &&
        !/\balMedir(\?\.)?\(/.test(escena) &&
        /const midiendo = opciones\.midiendo !== false;/.test(gancho) &&
        /if \(!midiendo\) return;/.test(gancho) &&
        /export const LO_MAS_QUE_CUENTA_UN_FOTOGRAMA = 0\.1;/.test(gancho) &&
        /m\.segundos \+= Math\.min\(LO_MAS_QUE_CUENTA_UN_FOTOGRAMA, Math\.max\(0, dtCrudo\)\);/.test(gancho) &&
        /if \(m\.segundos < 1\) return;/.test(gancho) &&
        /ms: \(m\.segundos \* 1000\) \/ m\.fotogramas,\s*fotogramas: m\.fotogramas,/.test(gancho) &&
        /m\.segundos = 0;\s*m\.fotogramas = 0;/.test(gancho)
      );
    },
    laEscenaYSuGancho,
    [
      laEscenaYSuGancho.replace(', midiendo: catalogo !== null', ''),
      laEscenaYSuGancho.replace('m.fotogramas = 0;', ''),
      laEscenaYSuGancho.replace('if (!midiendo) return;', ''),
      laEscenaYSuGancho.replace(SEPARADOR_DEL_GANCHO, `\nprops.alMedir?.({ triangulos: 0, llamadas: 0, ms: 0, fotogramas: 0 });${SEPARADOR_DEL_GANCHO}`),
    ],
  );
  /*
   * Y SU LOBBY, LA LINDE ALTA, CON EL MISMO GANCHO. Mandaba cada sesenta fotogramas la media DESDE EL
   * PRINCIPIO con el total desde el principio —el fallo de arriba, que aquí ya se había arreglado— y
   * avisaba de listo con el mundo sin pintar. Se mira que arranque con el gancho y que no vuelva a
   * avisar ni a medir por su cuenta.
   */
  const fuenteDelLobby = leerCodigo('../linde-alta/LindeAlta.tsx');
  reglaDelFuente(
    'y el lobby de Las Lindes avisa y mide con el mismo gancho: ni un aviso de listo suyo ni una medida desde el principio',
    (t) =>
      /const arrancar = usarArranqueYMedida\(props, \{ llave: traer \}\);/.test(t) &&
      /if \(vivo\) arrancar\(\);/.test(t) &&
      !/\balEstarListo\?\.\(\)/.test(t) &&
      !/\balMedir(\?\.)?\(/.test(t),
    fuenteDelLobby,
    [
      fuenteDelLobby.replace('if (vivo) arrancar();', 'if (vivo) props.alEstarListo?.();'),
      `${fuenteDelLobby}\nprops.alMedir({ triangulos: 0, llamadas: 0, ms: 0, fotogramas: 60 });`,
    ],
  );
  /*
   * ═══ EL JUEZ ES UNO, EN EL CONTROLADOR, Y LOS DOS CLIENTES SE LO PASAN A LA ESCENA ═══
   *
   * Esta regla miraba cada cliente por separado —«juzga con `conLaMuestra` y `calidadDelValle`, y
   * se lo pasa a `<Lindes>`»— porque cada uno llevaba su copia del juez. Desde el controlador de Las
   * Lindes (`lindes/el-valle-en-la-mesa.ts`, el que usan las dos pantallas) el juez está escrito UNA
   * vez, y lo que hay que seguir comprando es lo de antes, por los dos extremos: que el controlador
   * juzgue con la ventana y ponga la calidad y su `alMedir` en lo que va a la escena, y que cada
   * cliente le pase eso a `<Lindes>` sin pisar la calidad con una escrita a mano ni juzgar por su
   * cuenta con otra cuenta.
   */
  reglaDelFuente(
    'el controlador de Las Lindes juzga la calidad con lo que mide la escena —la ventana y el juez de la casa— y la pone, con su `alMedir`, en lo que va a la escena',
    (t) => {
      const escena = /const escena: LaEscenaDelValle \| null =([\s\S]*?)\};/.exec(t)?.[1] ?? '';
      return (
        /conLaMuestra\(muestras\.current, \{ ms: m\.ms, fotogramas: m\.fotogramas \}\)/.test(t) &&
        /\(antes\) => calidadDelValle\(antes, muestras\.current\)/.test(t) &&
        /\n\s*calidad,\n/.test(escena) &&
        /\n\s*alMedir,\n/.test(escena) &&
        /return \{[^}]*\bescena\b[^}]*\};/.test(t) &&
        !/\bcalidad:\s*['"](plena|sobria)/.test(t)
      );
    },
    fuenteDelControlador,
    [
      fuenteDelControlador.replace(/(\n\s*)calidad,\n/, "$1calidad: 'plena',\n"),
      fuenteDelControlador.replace(/\n\s*alMedir,\n/, '\n'),
      fuenteDelControlador.replace('(antes) => calidadDelValle(antes, muestras.current)', '(antes) => antes'),
    ],
  );
  for (const [quien, fuente] of [
    ['la app', fuenteDeLaApp],
    ['el escritorio', fuenteDelEscritorio],
  ] as const) {
    reglaDelFuente(
      `${quien} le pasa a la escena lo que compone el controlador —con la calidad juzgada y su \`alMedir\`— y no la pisa: ni «plena» escrita a mano, ni un juez propio`,
      (t) => {
        const elemento = elementoDeLaEscena(t);
        return (
          /^<Lindes\s+\{\.\.\.valle\.escena\}/.test(elemento) &&
          !/\b(calidad|alMedir)=/.test(elemento) &&
          /\bconst valle = usarElValleEnLaMesa\(\{/.test(t) &&
          /import \{[^}]*\busarElValleEnLaMesa\b[^}]*\} from '(?:\.\.\/)+escenas\/lindes\/el-valle-en-la-mesa';/.test(t) &&
          !/\b(calidadDelValle|conLaMuestra|juzgarCalidad)\b/.test(t) &&
          !/\bcalidad=["'{]\s*['"]?(plena|sobria)/.test(t)
        );
      },
      fuente,
      [fuente.replace('{...valle.escena}', '{...valle.escena}\n calidad="plena"'), fuente.replace('{...valle.escena}', '')],
    );
  }
}

paso('En el teléfono el valle se abre con su atlas: la app pasa el complemento y la escena lo monta');

const bytesDelTablero = ((): ArrayBuffer => {
  const crudo = fs.readFileSync(path.resolve(import.meta.dirname ?? __dirname, '..', 'modelos', 'tablero.glb'));
  return crudo.buffer.slice(crudo.byteOffset, crudo.byteOffset + crudo.byteLength) as ArrayBuffer;
})();

/** Abre el tablero con el cargador de la escena, callando lo que `three` y el complemento dicen por consola. */
async function abrirComoLaEscena(
  complementos: readonly ComplementoDelCargador[],
): Promise<{ catalogo: Catalogo | null; fallo: string | null; dichos: number }> {
  let dichos = 0;
  const error = console.error;
  const aviso = console.warn;
  console.error = (): void => {
    dichos++;
  };
  console.warn = (): void => {
    dichos++;
  };
  try {
    const gltf = await abrirElTablero(bytesDelTablero, complementos);
    return { catalogo: catalogoDe(gltf.scene), fallo: null, dichos };
  } catch (f) {
    return { catalogo: null, fallo: f instanceof Error ? f.message : String(f), dichos };
  } finally {
    console.error = error;
    console.warn = aviso;
  }
}

/** Las piezas que pinta Las Lindes: todo lo que reparte una losa, lo del desierto y la caja del reloj. */
const piezasDelValle = new Set<string>([...LO_QUE_CRECE_EN_LA_ARENA, MODELO.caja]);
for (const losa of LAS_LOSAS) {
  for (const giro of GIROS) {
    for (const semilla of [7, 99, 1000]) {
      for (const p of montarLaLosa(losa.id, giro, semilla).puestas) piezasDelValle.add(p.pieza);
    }
  }
}

/** Cómo llegan las partes de las piezas del valle: con el atlas compilado, con otro mapa o sin mapa. */
function comoLlegan(catalogo: Catalogo | null): {
  partes: number;
  conAtlas: number;
  sinMapa: number;
  otras: string[];
  sinModelo: string[];
} {
  const cuenta = { partes: 0, conAtlas: 0, sinMapa: 0, otras: [] as string[], sinModelo: [] as string[] };
  if (catalogo === null) return cuenta;
  for (const pieza of piezasDelValle) {
    const partes = catalogo.partes.get(pieza) ?? [];
    if (partes.length === 0) cuenta.sinModelo.push(pieza);
    for (const parte of partes) {
      cuenta.partes++;
      const mapa =
        (parte.material as unknown as { map?: { isDataTexture?: boolean; name?: string } | null }).map ?? null;
      if (mapa === null) cuenta.sinMapa++;
      else if (mapa.isDataTexture === true && mapa.name === IMAGEN_DEL_ATLAS) cuenta.conAtlas++;
      else cuenta.otras.push(pieza);
    }
  }
  return cuenta;
}

/*
 * ═══ PRIMERO EL FALLO: SIN COMPLEMENTO NO LLEGA EL ATLAS ═══
 *
 * Node, como Hermes, no tiene con qué decodificar el PNG empotrado. Se le pone `self` —que React
 * Native sí define y Node no— para que el cargador recorra el camino del teléfono: llega hasta la
 * imagen, no puede con ella, y `three` 0.185 deja el mapa en `null`. Es lo que se veía en la app:
 * el valle montado, y blanco. Sin `self` la carga revienta antes, que es la otra cara del mismo
 * fallo y también vale: en ningún caso llega el atlas.
 */
const conSelf = globalThis as { self?: unknown };
const habiaSelf = conSelf.self !== undefined;
if (!habiaSelf) conSelf.self = globalThis;
const sinComplemento = await abrirComoLaEscena([]);
if (!habiaSelf) delete conSelf.self;
const comoLleganSin = comoLlegan(sinComplemento.catalogo);
console.log(
  sinComplemento.fallo === null
    ? `  sin complemento: ${String(comoLleganSin.partes)} partes de las piezas del valle, ${String(comoLleganSin.sinMapa)} sin mapa y ${String(comoLleganSin.conAtlas)} con el atlas`
    : `  sin complemento la carga revienta: ${sinComplemento.fallo}`,
);
comprobar(
  'sin complemento, en un motor que no decodifica imágenes, ninguna pieza del valle llega con su atlas: es el valle blanco de la app',
  sinComplemento.fallo !== null || (comoLleganSin.partes > 0 && comoLleganSin.conAtlas === 0),
  { fallo: sinComplemento.fallo, ...comoLleganSin, otras: comoLleganSin.otras.length },
);

/* ═══ Y CON EL QUE PASA LA APP, TODAS ═══ */
const conComplemento = await abrirComoLaEscena([texturasDelTablero]);
const comoLleganCon = comoLlegan(conComplemento.catalogo);
console.log(
  `  con \`texturasDelTablero\`: ${String(comoLleganCon.conAtlas)} de ${String(comoLleganCon.partes)} partes, de ${String(piezasDelValle.size)} piezas, con el atlas compilado`,
);
comprobar(
  'con el complemento de la app, TODAS las partes de TODAS las piezas del valle llevan el atlas compilado',
  conComplemento.fallo === null &&
    comoLleganCon.partes > 0 &&
    comoLleganCon.conAtlas === comoLleganCon.partes &&
    comoLleganCon.sinModelo.length === 0,
  {
    fallo: conComplemento.fallo,
    partes: comoLleganCon.partes,
    conAtlas: comoLleganCon.conAtlas,
    sinMapa: comoLleganCon.sinMapa,
    otras: comoLleganCon.otras.slice(0, 5),
    sinModelo: comoLleganCon.sinModelo.slice(0, 5),
  },
);
comprobar(
  'y se han mirado piezas de verdad: lo que reparte una losa, el desierto y la caja del reloj',
  piezasDelValle.size > 30,
  piezasDelValle.size,
);

reglaDelFuente(
  'la app le pasa ese complemento a la escena donde el motor no decodifica imágenes —el del tablero, no la blanca de los avatares—',
  (t) =>
    /const COMPLEMENTOS_DEL_TABLERO: readonly ComplementoDelCargador\[\] = decodificaImagenes\(\) \? \[\] : \[texturasDelTablero\];/.test(
      t,
    ) &&
    /\bcomplementosDelTablero=\{COMPLEMENTOS_DEL_TABLERO\}/.test(elementoDeLaEscena(t)) &&
    /import \{ decodificaImagenes, texturasDelTablero \} from '\.\.\/tres\/texturas-nativas';/.test(t) &&
    !/texturasLisas/.test(t),
  fuenteDeLaApp,
  [
    fuenteDeLaApp.replace('complementosDelTablero={COMPLEMENTOS_DEL_TABLERO}', ''),
    fuenteDeLaApp.replace('[texturasDelTablero];', '[texturasLisas];'),
  ],
);
reglaDelFuente(
  'y la escena abre `tablero.glb` con los complementos que le llegan, con su cargador y con ningún otro',
  (t) =>
    /const complementos = props\.complementosDelTablero \?\? \[\];/.test(t) &&
    /traer\(rutaDelTablero\(\)\)\s*\.then\(\(bytes\) => abrirElTablero\(bytes, complementos\)\)/.test(t) &&
    !/\babrirGlb\(/.test(t) &&
    !/new GLTFLoader\(/.test(t),
  fuenteDeLaEscena,
  [fuenteDeLaEscena.replace('abrirElTablero(bytes, complementos)', 'abrirElTablero(bytes, [])')],
);
comprobar(
  'el escritorio no pasa ninguno: su navegador decodifica el PNG, y el valle se ve como se veía',
  !/complementosDelTablero/.test(fuenteDelEscritorio) && elementoDeLaEscena(fuenteDelEscritorio).length > 0,
);

paso('Una valla estirada se alarga, no engorda; y lo que choca se sigue estirando como choca');

{
  const catalogo = conComplemento.catalogo;
  comprobar('el catálogo del tablero se ha abierto para medir las cajas', catalogo !== null);
  if (catalogo !== null) {
    const valla = cajaDelModelo(catalogo, MODELO.valla);
    const vallaPuerta = cajaDelModelo(catalogo, MODELO.vallaPuerta);
    const muro = cajaDelModelo(catalogo, MODELO.muro);
    const muroPuerta = cajaDelModelo(catalogo, MODELO.muroPuerta);
    const enPlanta = (c: { ancho: number; fondo: number }): string => `${c.ancho.toFixed(3)} × ${c.fondo.toFixed(3)}`;
    console.log(
      `  en planta, x × z del pack: valla ${enPlanta(valla)}, valla con puerta ${enPlanta(vallaPuerta)}, ` +
        `muro ${enPlanta(muro)}, muro con puerta ${enPlanta(muroPuerta)}`,
    );
    comprobar(
      'la valla del pack es larga en su z, medido en su caja: su `largo` va por ahí',
      ejeDelLargo(valla) === 'z' && ejeDelLargo(vallaPuerta) === 'z',
      { valla, vallaPuerta },
    );
    comprobar(
      'y lo que mide a lo largo es lo que el reparto cree que mide una valla (`LARGO_DE_LA_VALLA_EN_PACK`)',
      Math.abs(valla.fondo - LARGO_DE_LA_VALLA_EN_PACK) < 0.01,
      { fondo: valla.fondo, delReparto: LARGO_DE_LA_VALLA_EN_PACK },
    );
    comprobar(
      'el muro es largo en su x, y se sigue estirando por ahí',
      ejeDelLargo(muro) === 'x' && ejeDelLargo(muroPuerta) === 'x',
      { muro, muroPuerta },
    );

    /*
     * ═══ LO QUE SE PINTA, PIEZA A PIEZA ═══
     *
     * Cada puesta estirada del reparto, con la escala que le compone la escena: lo que mide a lo
     * largo —el lado MAYOR de su caja— tiene que crecer por su `largo`, y lo que mide de grueso
     * —el menor— y de alto, quedarse como el pack. Se decide cuál es el lado mayor aquí, con la
     * caja, y no preguntándole a `ejeDelLargo`: si se le preguntara, una regla equivocada se daría
     * la razón a sí misma.
     */
    const auxiliar = { x: 0, y: 0, z: 0 };
    let estiradas = 0;
    let malas = 0;
    const ejemplos: unknown[] = [];
    let sinLargoClaro = 0;
    const casiCuadradas = new Set<string>();
    let vallasEstiradas = 0;
    let gruesasALaVieja = 0;
    let chocanEstiradas = 0;
    let chocanPorLaZ = 0;
    const cercaDeLaErmita = { largo: 0, cada: Number.POSITIVE_INFINITY };
    for (const losa of LAS_LOSAS) {
      for (const giro of GIROS) {
        for (const semilla of [7, 99, 1000]) {
          const puestas = montarLaLosa(losa.id, giro, semilla).puestas;
          for (const p of puestas) {
            if (p.largo === 1) continue;
            estiradas++;
            const caja = cajaDelModelo(catalogo, p.pieza);
            const mayor = Math.max(caja.ancho, caja.fondo);
            const menor = Math.min(caja.ancho, caja.fondo);
            if (mayor < menor * VECES_QUE_HACEN_UN_LARGO) {
              sinLargoClaro++;
              casiCuadradas.add(p.pieza);
              continue;
            }
            const largaEnZ = caja.fondo > caja.ancho;
            const e = escalaDeLaPuesta(p.escala, p.largo, ejeDelLargo(caja), auxiliar);
            const s = p.escala * ESCALA_DEL_PACK;
            const largoPintado = largaEnZ ? caja.fondo * e.z : caja.ancho * e.x;
            const gruesoPintado = largaEnZ ? caja.ancho * e.x : caja.fondo * e.z;
            const bien =
              Math.abs(largoPintado - mayor * s * p.largo) < 1e-9 &&
              Math.abs(gruesoPintado - menor * s) < 1e-9 &&
              Math.abs(e.y - s) < 1e-9;
            if (!bien) {
              malas++;
              if (ejemplos.length < 5) ejemplos.push({ pieza: p.pieza, largo: p.largo, largoPintado, gruesoPintado });
            }
            if (p.pieza === MODELO.valla || p.pieza === MODELO.vallaPuerta) {
              vallasEstiradas++;
              /* La cuenta de antes: el `largo` siempre a la `x` del modelo. */
              const aLaVieja = escalaDeLaPuesta(p.escala, p.largo, 'x', { x: 0, y: 0, z: 0 });
              /*
               * Más gruesa en su `largo`: con la cuenta de antes el grueso crecía lo que debía crecer
               * el largo. El umbral era vez y media cuando los largos eran 1,7 y 1,8; la cerca de la
               * ermita va ahora a 1,083 —lo justo para cerrar sin montarse—, así que se mira que
               * engorde, no cuánto.
               */
              if (caja.ancho * aLaVieja.x > gruesoPintado * 1.01) gruesasALaVieja++;
              if (p.porque === 'ermita') cercaDeLaErmita.largo = Math.max(cercaDeLaErmita.largo, largoPintado);
            }
            if (comoEstorba(p.pieza) !== 'nada') {
              chocanEstiradas++;
              if (ejeDelLargo(caja) !== 'x') chocanPorLaZ++;
            }
          }
          /* Cada cuánto va una valla de la cerca de la ermita: la menor distancia entre dos de la misma raya. */
          const deLaErmita = puestas.filter((p) => p.porque === 'ermita' && p.pieza === MODELO.valla);
          for (let i = 0; i < deLaErmita.length; i++) {
            for (let j = i + 1; j < deLaErmita.length; j++) {
              const a = deLaErmita[i];
              const b = deLaErmita[j];
              if (a === undefined || b === undefined || a.giro !== b.giro) continue;
              const d = Math.hypot(a.x - b.x, a.z - b.z);
              if (Math.abs(a.x - b.x) < 1e-6 || Math.abs(a.z - b.z) < 1e-6) cercaDeLaErmita.cada = Math.min(cercaDeLaErmita.cada, d);
            }
          }
        }
      }
    }
    console.log(
      `  ${String(estiradas)} puestas estiradas en el reparto, ${String(vallasEstiradas)} de ellas vallas; ` +
        `${String(gruesasALaVieja)} salían más gruesas con la cuenta de antes`,
    );
    if (cercaDeLaErmita.largo > 0 && Number.isFinite(cercaDeLaErmita.cada)) {
      console.log(
        `  la cerca de la ermita: cada valla mide ${cercaDeLaErmita.largo.toFixed(2)} y van cada ` +
          `${cercaDeLaErmita.cada.toFixed(2)}: ${(cercaDeLaErmita.largo - cercaDeLaErmita.cada).toFixed(2)} de solape`,
      );
    }
    comprobar(
      'la cerca de la ermita cierra su lado sin montarse: cada valla mide lo que va de una a la siguiente, a una décima',
      cercaDeLaErmita.largo > 0 &&
        Number.isFinite(cercaDeLaErmita.cada) &&
        Math.abs(cercaDeLaErmita.largo - cercaDeLaErmita.cada) < 0.1,
      cercaDeLaErmita,
    );
    comprobar(
      'toda pieza estirada crece por su lado largo y conserva su grueso y su alto',
      estiradas > 0 && malas === 0,
      { estiradas, malas, ejemplos },
    );
    comprobar(
      'y todo lo que se estira tiene un largo claro —un lado que dobla al otro—: estirar algo casi cuadrado no dice hacia dónde',
      sinLargoClaro === 0,
      { sinLargoClaro, piezas: [...casiCuadradas] },
    );
    comprobar(
      'y en el reparto hay vallas estiradas que mirar —la cerca de la ermita y las de la senda—',
      vallasEstiradas > 0,
      vallasEstiradas,
    );
    comprobar(
      'con la cuenta de antes —el `largo` siempre a la x— TODAS esas vallas salían más gruesas en vez de más largas: el fallo, medido',
      gruesasALaVieja === vallasEstiradas,
      { gruesasALaVieja, vallasEstiradas },
    );
    comprobar(
      'nada que choque se estira por su z: el mundo (`cajasDeLaPuesta`) estira la x de su caja, y lo que se pinta es lo que para',
      chocanEstiradas > 0 && chocanPorLaZ === 0,
      { chocanEstiradas, chocanPorLaZ },
    );
  }

  reglaDelFuente(
    'las piezas del tablero y las de la mano se escalan con `escalaDeLaPuesta` y el eje de su caja, y no estirando la x a mano',
    (t) =>
      (t.match(/const eje = useMemo\(\(\) => ejeDelLargo\(cajaDeLasPartes\(partes\)\), \[partes\]\);/g) ?? []).length === 2 &&
      /escalaDeLaPuesta\(p\.escala \* desvanece, p\.largo, eje, AUX_ESCALA\);/.test(t) &&
      /escalaDeLaPuesta\(p\.escala, p\.largo, eje, AUX_ESCALA\);/.test(t) &&
      !/\bp\.largo\s*\*|\*\s*p\.largo\b/.test(t),
    fuenteDeLaEscena,
    [
      fuenteDeLaEscena.replace(
        'escalaDeLaPuesta(p.escala, p.largo, eje, AUX_ESCALA);',
        'AUX_ESCALA.set(p.escala * ESCALA_DEL_PACK * p.largo, p.escala * ESCALA_DEL_PACK, p.escala * ESCALA_DEL_PACK);',
      ),
    ],
  );
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
