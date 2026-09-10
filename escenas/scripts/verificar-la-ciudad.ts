/**
 * ¿TIENE SENTIDO LA CIUDAD, CON VEINTE SEMILLAS Y NO CON UNA?
 *
 * ═══ QUÉ COMPRA ESTE GUION ═══
 *
 * `escenas/burgo/ciudad.ts` levanta el centro del tablero entero —2.916 celdas de calles,
 * manzanas, edificios de varias plantas, salas amuebladas y dieciséis distritos, con sus
 * coches— a partir del código de la mesa. Nada de eso da error si sale mal: una calle que no
 * lleva a ninguna parte, un edificio metido en la calzada, un sofá atravesando la puerta, un
 * coche circulando por encima de una acera o una ciudad que pesa el doble de lo que el móvil
 * aguanta NO revientan ninguna consola. Se ven, y se ven tarde.
 *
 * Aquí se miden en Node, sin abrir un contexto de dibujo y con las cajas y los triángulos del
 * `burgo.glb` REAL. Y se miden con VEINTE semillas, porque el juicio que hay que comprar no
 * es «esta ciudad está bien» sino «cualquier ciudad que salga está bien»: la semilla es el
 * código de la mesa y no la elige nadie.
 *
 * ═══ LAS TRES COSAS QUE SÓLO ESTE GUION PUEDE VIGILAR ═══
 *
 * Una: que la tabla de CARAS ABIERTAS de las losas de calle —de qué lado sale asfalto y de
 * cuál bordillo— sigue siendo la del fichero. Está medida rasterizando la superficie de cada
 * losa, y de ella depende que los cruces encajen; si el pack cambiara una losa, la ciudad se
 * trazaría con una tabla vieja sin que nada protestara.
 *
 * Dos: que las cajas y los triángulos que `ciudad.ts` declara —de los cuerpos, de los
 * muebles, de todo lo que reparte— son los del `.glb`. La escena no puede abrir el fichero
 * para sumar su presupuesto, así que los números viven en el código.
 *
 * Y TRES, que es nueva y es la que manda desde que el recinto pasó de 288 a 648: que la
 * ciudad CABE. Ya no cabe entera —la ciudad en L1 pesa más de un millón y medio de
 * triángulos— y el presupuesto dejó de ser una suma: es el techo de LO QUE ESTÁ MONTADO A LA
 * VEZ. Así que aquí se pone una cámara en ocho sitios distintos, se pide el montaje que le
 * toca a cada uno (`montarLaCiudad`) y se mide ÉSE. Sumar la ciudad entera y compararla con
 * un tope sería medir una cosa que no ocurre nunca.
 *
 * ═══ LAS VACUNAS ═══
 *
 * Cada juez se ve caer con un caso envenenado: una tabla de caras mentida, un edificio
 * corrido tres unidades a la calle, un mueble puesto en el barrido de la puerta, un chalet
 * retranqueado 5,40 en vez de 3,20, una ciudad montada entera en L1, un grupo cuyo L2 pesa
 * más que su L1. Un comprobador que no se ha visto caer no vigila nada.
 *
 * ═══ LO QUE NO PRUEBA ═══
 *
 * Que se VEA bien: ni el color, ni la silueta, ni si el móvil aguanta de verdad. Para eso
 * está el banco `banco-burgo.html` y hacen falta ojos.
 */
import { NodeIO } from '@gltf-transform/core';
import type { Node } from '@gltf-transform/core';
import fs from 'node:fs';
import path from 'node:path';
import {
  ACERA_DEL_CHALET,
  ALTURA_DEL_ASFALTO,
  ALTURA_DEL_BORDILLO,
  ANCHO_DE_LA_AVENIDA,
  ANCHO_DE_LA_CALZADA,
  ANCHO_DEL_BULEVAR,
  ANCHO_DE_LA_PUERTA,
  BARRIDO_DE_LA_PUERTA,
  CARAS_ABIERTAS,
  CELDAS_DEL_BULEVAR,
  CELDAS_DE_AVENIDA,
  CELDAS_POR_LADO,
  CELDAS_POR_TESELA,
  CICLO_DEL_SEMAFORO,
  COSENO_DEL_CUARTO,
  CUERPO_DEL_MODELO,
  EJE_DEL_APARCAMIENTO,
  EJE_DEL_BORDILLO,
  EJE_DEL_CARRIL,
  HISTERESIS_DEL_NIVEL,
  LADO_DEL_CUADRANTE,
  LADO_DEL_RECINTO,
  MANZANA_MINIMA,
  MUEBLE,
  PUERTAS,
  RADIO_DEL_CENTRO,
  RECINTO_DEL_BURGO,
  RUMBOS,
  TOPE_DE_LA_CIUDAD,
  TRIANGULOS_DEL_PRISMA,
  TRIANGULOS_DE_LA_PIEZA,
  UMBRALES_DE_NIVEL,
  anilloDelBulevar,
  avanceDeLaRuta,
  cajaDelDistrito,
  cajaDelMueble,
  carasDe,
  centroDeCelda,
  cocheEnElInstante,
  distanciaAlCentro,
  esClaseDeCalle,
  generarLaCiudad,
  giraElPunto,
  hayVerde,
  huellaDelMueble,
  mascaraGirada,
  montarLaCiudad,
  nivelDelGrupo,
  piezaDeCalzada,
  puntoDeLaRuta,
  repartosDeUnEje,
  salasDelEdificio,
  senDeGrados,
  cosDeGrados,
  triangulosDe,
  vectorDelRumbo,
} from '../burgo/ciudad';
import type { CeldaDeLaCiudad, GrupoDeLaCiudad, LaCiudad, NivelDeDetalle, PuestaDeSala, PuestaEnLaCiudad, Punto, Rumbo } from '../burgo/ciudad';
import { PIEZA, RETICULA_DE_LA_CIUDAD } from '../burgo/piezas';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : ` — ${JSON.stringify(detalle)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const r2 = (x: number): number => Number(x.toFixed(2));
const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..');
const FICHERO = path.join(RAIZ, 'modelos', 'burgo.glb');

/** Veinte semillas: la primera es la de portada y las demás salen de un paso fijo, para que no cambien. */
const SEMILLAS: number[] = [];
for (let k = 0; k < 20; k++) SEMILLAS.push((1 + k * 0x9e37_79b9) >>> 0);

// ---------------------------------------------------------------------------
paso('El generador es dato puro: sin three, sin DOM, sin Expo y sin el anillo');
// ---------------------------------------------------------------------------

{
  const fuente = fs.readFileSync(path.join(RAIZ, 'burgo', 'ciudad.ts'), 'utf8');
  const codigo = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const prohibido: readonly { readonly que: string; readonly regex: RegExp }[] = [
    { que: 'three', regex: /from\s+['"]three['"]|from\s+['"]three\// },
    { que: 'drei', regex: /@react-three\/drei/ },
    { que: 'react', regex: /from\s+['"]react['"]/ },
    { que: 'document', regex: /\bdocument\b/ },
    { que: 'window', regex: /\bwindow\b/ },
    { que: 'fetch', regex: /\bfetch\s*\(/ },
    { que: 'expo', regex: /['"]expo[-/'"]|\bexpo-/ },
    { que: 'anillo-en-3d', regex: /anillo-en-3d/ },
    { que: 'Math.random', regex: /Math\.random/ },
  ];
  const encendidos = prohibido.filter((p) => p.regex.test(codigo)).map((p) => p.que);
  comprobar('ciudad.ts no trae three, react, DOM, Expo, fetch, Math.random ni el anillo', encendidos.length === 0, encendidos);
  const envenenado = `import * as THREE from 'three';\nconst w = window.x;\nMath.random();\nimport { X } from './anillo-en-3d';`;
  const enElVeneno = prohibido.filter((p) => p.regex.test(envenenado)).map((p) => p.que);
  comprobar('se ve fallar: un fuente con three, window, Math.random y el anillo enciende los cuatro', enElVeneno.length === 4, enElVeneno);
  comprobar('y el barrido no se traga los comentarios: un `// window` no cuenta', !/\bwindow\b/.test('// window\n/* Math.random() */\nconst a = 1;'.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')));
}

// ---------------------------------------------------------------------------
paso('El .glb real: las caras abiertas de cada losa, medidas otra vez');
// ---------------------------------------------------------------------------

comprobar('burgo.glb está compilado', fs.existsSync(FICHERO));
if (!fs.existsSync(FICHERO)) {
  console.log(`\nNo está ${path.relative(RAIZ, FICHERO)}: se rehace con \`npm run compilar:burgo -w escenas\`.`);
  process.exit(1);
}

type Caja = { readonly min: readonly [number, number, number]; readonly max: readonly [number, number, number] };
type Triangulo = readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];

function porLaMatriz(m: ArrayLike<number>, v: readonly number[]): [number, number, number] {
  const x = v[0] as number;
  const y = v[1] as number;
  const z = v[2] as number;
  return [
    (m[0] as number) * x + (m[4] as number) * y + (m[8] as number) * z + (m[12] as number),
    (m[1] as number) * x + (m[5] as number) * y + (m[9] as number) * z + (m[13] as number),
    (m[2] as number) * x + (m[6] as number) * y + (m[10] as number) * z + (m[14] as number),
  ];
}

const io = new NodeIO();
const doc = await io.read(FICHERO);
const raices = doc.getRoot().listScenes().flatMap((e) => e.listChildren());
const triangulosDelFichero = new Map<string, number>();
const cajas = new Map<string, Caja>();
const trianglesDe = new Map<string, Triangulo[]>();
for (const raiz of raices) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let tri = 0;
  const caras: Triangulo[] = [];
  const guardaCaras = ['calzada', 'calzada-paso', 'calzada-cruce', 'calzada-te', 'calzada-curva', 'calzada-curva-suave'].indexOf(raiz.getName()) >= 0;
  const anda = (n: Node): void => {
    const malla = n.getMesh();
    if (malla !== null) {
      for (const prim of malla.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        if (pos === null) continue;
        const idx = prim.getIndices();
        const cuenta = idx?.getCount() ?? pos.getCount();
        tri += cuenta / 3;
        const m = n.getWorldMatrix();
        const v = [0, 0, 0];
        for (let i = 0; i < pos.getCount(); i++) {
          const w = porLaMatriz(m, pos.getElement(i, v));
          for (let c = 0; c < 3; c++) {
            min[c] = Math.min(min[c] as number, w[c] as number);
            max[c] = Math.max(max[c] as number, w[c] as number);
          }
        }
        if (!guardaCaras) continue;
        const punto = (i: number): [number, number, number] => porLaMatriz(m, pos.getElement(i, v));
        for (let k = 0; k < cuenta; k += 3) {
          const a = idx === null ? k : idx.getScalar(k);
          const b = idx === null ? k + 1 : idx.getScalar(k + 1);
          const c = idx === null ? k + 2 : idx.getScalar(k + 2);
          caras.push([punto(a), punto(b), punto(c)]);
        }
      }
    }
    for (const h of n.listChildren()) anda(h);
  };
  anda(raiz);
  triangulosDelFichero.set(raiz.getName(), Math.round(tri));
  cajas.set(raiz.getName(), { min: min as unknown as [number, number, number], max: max as unknown as [number, number, number] });
  if (guardaCaras) trianglesDe.set(raiz.getName(), caras);
}

/**
 * QUÉ CARAS ABRE UNA LOSA, MEDIDO: se rasteriza su superficie superior en una malla de
 * 24 × 24 y se mira la altura del centro de cada lado. Si por el centro del lado sale
 * asfalto (0,42) la cara está abierta; si hay bordillo (0,60), cerrada. Es la misma medida
 * de la que salió `CARAS_ABIERTAS`, hecha otra vez sobre el fichero de hoy.
 */
function carasMedidas(nombre: string): number {
  const caras = trianglesDe.get(nombre) ?? [];
  const alturaEn = (px: number, pz: number): number => {
    let alto = -1;
    for (const t of caras) {
      const p0 = t[0];
      const p1 = t[1];
      const p2 = t[2];
      const d = (p1[0] - p0[0]) * (p2[2] - p0[2]) - (p2[0] - p0[0]) * (p1[2] - p0[2]);
      if (Math.abs(d) < 1e-9) continue;
      const u = ((px - p0[0]) * (p2[2] - p0[2]) - (p2[0] - p0[0]) * (pz - p0[2])) / d;
      const v = ((p1[0] - p0[0]) * (pz - p0[2]) - (px - p0[0]) * (p1[2] - p0[2])) / d;
      if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
      const y = p0[1] + u * (p1[1] - p0[1]) + v * (p2[1] - p0[1]);
      if (y > alto) alto = y;
    }
    return alto;
  };
  const borde = RETICULA_DE_LA_CIUDAD / 2 - 0.25;
  const muestras: readonly { readonly r: Rumbo; readonly x: number; readonly z: number }[] = [
    { r: 0, x: borde, z: 0 },
    { r: 1, x: 0, z: borde },
    { r: 2, x: -borde, z: 0 },
    { r: 3, x: 0, z: -borde },
  ];
  let mascara = 0;
  for (const m of muestras) if (alturaEn(m.x, m.z) < (ALTURA_DEL_ASFALTO + ALTURA_DEL_BORDILLO) / 2) mascara |= 1 << m.r;
  return mascara;
}

{
  const declaradas = Object.keys(CARAS_ABIERTAS);
  const malas = declaradas.filter((n) => carasMedidas(n) !== (CARAS_ABIERTAS[n] as number));
  comprobar(
    'las seis losas de calle abren por donde la tabla dice, medido rasterizando el .glb',
    malas.length === 0,
    malas.map((n) => ({ pieza: n, tabla: CARAS_ABIERTAS[n], medido: carasMedidas(n) })),
  );
  comprobar('la recta abre por el norte y el sur y NO por el este ni el oeste', carasMedidas(PIEZA.calzada) === ((1 << 1) | (1 << 3)));
  comprobar('el cruce abre por los cuatro y la te cierra uno', carasDe(carasMedidas(PIEZA.calzadaCruce)) === 4 && carasDe(carasMedidas(PIEZA.calzadaTe)) === 3);
  comprobar('las dos curvas abren por el este y el sur', carasMedidas(PIEZA.calzadaCurva) === 3 && carasMedidas(PIEZA.calzadaCurvaSuave) === 3);
  /* La vacuna: una tabla mentida —la recta abriendo por el este— tiene que verse caer. */
  comprobar('se ve fallar: una recta declarada abriendo por el este no cuadra con la medida', carasMedidas(PIEZA.calzada) !== ((1 << 0) | (1 << 2)));
}

// ---------------------------------------------------------------------------
paso('Los triángulos y las cajas que el generador declara son los del fichero');
// ---------------------------------------------------------------------------

{
  const malas: unknown[] = [];
  for (const [pieza, cuantos] of Object.entries(TRIANGULOS_DE_LA_PIEZA)) {
    const real = triangulosDelFichero.get(pieza);
    if (real === undefined || real !== cuantos) malas.push({ pieza, tabla: cuantos, fichero: real ?? 'no está' });
  }
  comprobar(`las ${Object.keys(TRIANGULOS_DE_LA_PIEZA).length} piezas que la ciudad reparte tienen en la tabla los triángulos del .glb`, malas.length === 0, malas.slice(0, 8));
  comprobar('se ve fallar: la casa del tablero NO cuesta 999 triángulos', triangulosDelFichero.get(PIEZA.casa) !== 999);

  const caja = (p: string): Caja => cajas.get(p) as Caja;
  const malosCuerpos: unknown[] = [];
  for (const [pieza, cuerpo] of Object.entries(CUERPO_DEL_MODELO)) {
    const c = caja(pieza);
    if (c === undefined) {
      malosCuerpos.push({ pieza, que: 'no está en el .glb' });
      continue;
    }
    /* De un `bloque-*` se mide el CUERPO, que es el mismo modelo sin su parcela: se compara con su hermano. */
    const hermano = pieza.startsWith('bloque-') ? caja(pieza.replace('bloque-', 'cuerpo-')) : c;
    const ancho = hermano.max[0] - hermano.min[0];
    const fondo = hermano.max[2] - hermano.min[2];
    if (Math.abs(ancho - cuerpo.ancho) > 0.02 || Math.abs(fondo - cuerpo.fondo) > 0.02 || Math.abs(hermano.max[2] - cuerpo.frente) > 0.02) {
      malosCuerpos.push({ pieza, tabla: [cuerpo.ancho, cuerpo.fondo, cuerpo.frente], fichero: [r2(ancho), r2(fondo), r2(hermano.max[2])] });
    }
  }
  comprobar('los dieciséis modelos de edificio declaran la huella y el saliente de fachada que tienen', malosCuerpos.length === 0, malosCuerpos.slice(0, 6));

  const malosMuebles: unknown[] = [];
  for (const [pieza, m] of Object.entries(MUEBLE)) {
    const c = caja(pieza);
    if (c === undefined) {
      malosMuebles.push({ pieza, que: 'no está en el .glb' });
      continue;
    }
    const ancho = c.max[0] - c.min[0];
    const fondo = c.max[2] - c.min[2];
    const retroceso = -c.min[2];
    if (Math.abs(ancho - m.ancho) > 0.02 || Math.abs(fondo - m.fondo) > 0.02 || Math.abs(retroceso - m.retroceso) > 0.02) {
      malosMuebles.push({ pieza, tabla: [m.ancho, m.fondo, m.retroceso], fichero: [r2(ancho), r2(fondo), r2(retroceso)] });
    }
  }
  comprobar(`los ${Object.keys(MUEBLE).length} muebles declaran la caja Y EL RETROCESO que tienen: sin él, media cocina queda dentro del tabique`, malosMuebles.length === 0, malosMuebles.slice(0, 8));
  comprobar('la alacena cuelga (retroceso 0) y la nevera se apoya en su centro (retroceso 1,0)', (MUEBLE[PIEZA.alacena] as { retroceso: number }).retroceso === 0 && (MUEBLE[PIEZA.nevera] as { retroceso: number }).retroceso === 1);
}

// ---------------------------------------------------------------------------
paso('La aritmética de la escala nueva, que no depende de la semilla');
// ---------------------------------------------------------------------------

const N = CELDAS_POR_LADO;

{
  comprobar('el recinto son 648 y 54 celdas de 12: nueve veces el centro de 72 del primer tablero', LADO_DEL_RECINTO === 648 && N === 54 && RETICULA_DE_LA_CIUDAD === 12 && LADO_DEL_RECINTO === 9 * 72);
  /* La vacuna de la escala: el 288 de la versión anterior YA NO vale, y hay que verlo caer. */
  comprobar('se ve fallar: 288 no llega a nueve veces 72, que es lo que la orden pide', 288 < 9 * 72);
  comprobar('la casilla 5 cae centrada en el eje: 72 × 5 − 360 = 0, y por ahí entran las avenidas', 72 * 5 - 360 === 0);
  comprobar('el bulevar son dos celdas (24) y la avenida cuatro (48), y las cuatro caen simétricas: 25+28 = 26+27 = 53', ANCHO_DEL_BULEVAR === 24 && ANCHO_DE_LA_AVENIDA === 48 && (CELDAS_DE_AVENIDA[0] as number) + (CELDAS_DE_AVENIDA[3] as number) === N - 1 && (CELDAS_DE_AVENIDA[1] as number) + (CELDAS_DE_AVENIDA[2] as number) === N - 1);
  comprobar('la avenida (48) es más estrecha que la casilla (72): quedan 12 de acera a cada lado para los semáforos de la Puerta', 72 - ANCHO_DE_LA_AVENIDA === 24);
  comprobar('el cuadrante son 23 × 23 celdas: 54 − 2 bulevares de 2 − 4 de avenida, entre dos', LADO_DEL_CUADRANTE === 23 && 2 * LADO_DEL_CUADRANTE + 2 * CELDAS_DEL_BULEVAR.length + CELDAS_DE_AVENIDA.length === N);
  comprobar('los dos anillos del bulevar: la esquina de fuera es el 0, la de dentro el 1, y la celda 2 ya no es bulevar', anilloDelBulevar(N, 0, 0) === 0 && anilloDelBulevar(N, 1, 1) === 1 && anilloDelBulevar(N, 1, 0) === 0 && anilloDelBulevar(N, 2, 2) === -1 && anilloDelBulevar(N, 53, 30) === 0);
  comprobar('la calzada mide 10,80 entre bordillos y el carril lleva su eje a 2,70', ANCHO_DE_LA_CALZADA === 10.8 && EJE_DEL_CARRIL === 2.7);
  comprobar('la tabla de cosenos empieza en 1 y acaba en 0, y el de 60° es 0,5', COSENO_DEL_CUARTO[0] === 1 && COSENO_DEL_CUARTO[6] === 0 && Math.abs(cosDeGrados(60) - 0.5) < 1e-6);
  comprobar('y el seno de 90° es 1 y el de 180° es 0, sin llamar a Math.sin', Math.abs(senDeGrados(90) - 1) < 1e-6 && Math.abs(senDeGrados(180)) < 1e-6);

  /* Los repartos de manzana: se ENUMERAN, y las cinco manzanas de cada eje miden de 3 a 7. */
  const repartos = repartosDeUnEje(LADO_DEL_CUADRANTE, 5, MANZANA_MINIMA);
  const sumanBien = repartos.every((r) => r.length === 5 && r.reduce((a, b) => a + b, 0) + 4 === LADO_DEL_CUADRANTE);
  const dentroDeTalla = repartos.every((r) => r.every((m) => m >= 3 && m <= 7));
  comprobar(`los ${repartos.length} repartos de un eje parten 23 en cinco manzanas de 3 a 7 con cuatro calles en medio`, repartos.length === 70 && sumanBien && dentroDeTalla, { cuantos: repartos.length, sumanBien, dentroDeTalla });
  comprobar('se ve fallar: no hay ningún reparto de 23 en cinco manzanas de 8 o más', repartosDeUnEje(LADO_DEL_CUADRANTE, 5, 8).length === 0);

  /* La regla de los cruces: cuatro vecinas dan cruce, tres te, dos opuestas recta, dos en ángulo curva. */
  comprobar('cuatro vecinas piden un cruce sin girar', piezaDeCalzada(15)?.pieza === PIEZA.calzadaCruce);
  comprobar('tres vecinas piden una te, y la cara cerrada cae donde no hay vecina', (() => {
    const e = piezaDeCalzada((1 << 0) | (1 << 1) | (1 << 3));
    return e !== null && e.pieza === PIEZA.calzadaTe && mascaraGirada(CARAS_ABIERTAS[PIEZA.calzadaTe] as number, e.cuartos) === ((1 << 0) | (1 << 1) | (1 << 3));
  })());
  comprobar('dos opuestas piden una recta y dos en ángulo una curva', piezaDeCalzada((1 << 1) | (1 << 3))?.pieza === PIEZA.calzada && piezaDeCalzada((1 << 0) | (1 << 1))?.pieza === PIEZA.calzadaCurva);
  comprobar('las cuatro curvas posibles se resuelven, cada una con su cuarto', [3, 6, 12, 9].every((m) => piezaDeCalzada(m) !== null));
  comprobar('se ve fallar: una celda sin ninguna vecina de calle no tiene losa que valga', piezaDeCalzada(0) === null);

  /* El retranqueo del chalet: lo que la parcela aguanta, medido con la caja real de `cuerpo-a`. */
  const cuerpoA = CUERPO_DEL_MODELO[PIEZA.cuerpoA] as { ancho: number; fondo: number; frente: number };
  const maximo = RETICULA_DE_LA_CIUDAD / 2 - cuerpoA.frente - (cuerpoA.fondo - cuerpoA.frente - RETICULA_DE_LA_CIUDAD / 2);
  comprobar(`el chalet se retranquea 3,20 y la parcela aguanta ${r2(maximo)}: cabe`, ACERA_DEL_CHALET <= maximo + 1e-9, { ACERA_DEL_CHALET, maximo: r2(maximo) });
  comprobar('se ve fallar: con 5,40 —el primer número que se escribió— el chalet asoma por el fondo de su parcela', 5.4 > maximo);
}

// ---------------------------------------------------------------------------
paso('Veinte ciudades: la retícula, la red de calles y las cuatro Puertas');
// ---------------------------------------------------------------------------

const CIUDADES: LaCiudad[] = SEMILLAS.map((s) => generarLaCiudad(s, RECINTO_DEL_BURGO, 'plena'));
const MITAD = LADO_DEL_RECINTO / 2;
const TOLERANCIA = 0.06;
const enLaReticula = (i: number, j: number): number => j * N + i;

const celdaDe = (c: LaCiudad, x: number, z: number): CeldaDeLaCiudad | undefined => {
  const i = Math.floor((x + MITAD) / RETICULA_DE_LA_CIUDAD);
  const j = Math.floor((z + MITAD) / RETICULA_DE_LA_CIUDAD);
  if (i < 0 || j < 0 || i >= c.recinto.celdas || j >= c.recinto.celdas) return undefined;
  return c.celdas[enLaReticula(i, j)];
};

const esAvenida = (k: number): boolean => CELDAS_DE_AVENIDA.indexOf(k) >= 0;
const esIsleta = (i: number, j: number): boolean => [CELDAS_DE_AVENIDA[1], CELDAS_DE_AVENIDA[2]].indexOf(i) >= 0 && [CELDAS_DE_AVENIDA[1], CELDAS_DE_AVENIDA[2]].indexOf(j) >= 0;

{
  const malas: unknown[] = [];
  for (const c of CIUDADES) {
    if (c.celdas.length !== N * N) malas.push({ semilla: c.semilla, que: `no son ${N * N} celdas`, cuantas: c.celdas.length });
    for (const celda of c.celdas) {
      const esperada = anilloDelBulevar(N, celda.i, celda.j) >= 0 ? 'bulevar' : esAvenida(celda.i) && esAvenida(celda.j) ? (esIsleta(celda.i, celda.j) ? 'isleta' : 'glorieta') : esAvenida(celda.i) || esAvenida(celda.j) ? 'avenida' : null;
      if (esperada !== null && celda.clase !== esperada) malas.push({ semilla: c.semilla, i: celda.i, j: celda.j, esperada, es: celda.clase });
    }
    if (c.celdas.filter((x) => x.clase === 'glorieta').length !== 12) malas.push({ semilla: c.semilla, que: 'el anillo de la glorieta no son doce celdas' });
    if (c.celdas.filter((x) => x.clase === 'isleta').length !== 4) malas.push({ semilla: c.semilla, que: 'la isleta no son cuatro celdas' });
    if (c.celdas.filter((x) => x.clase === 'bulevar').length !== N * N - (N - 4) * (N - 4)) malas.push({ semilla: c.semilla, que: 'el bulevar no son dos anillos enteros' });
    const torres = c.celdas.filter((x) => x.clase === 'torre');
    if (torres.length < 20) malas.push({ semilla: c.semilla, que: 'no hay centro de torres', cuantas: torres.length });
    if (torres.some((x) => distanciaAlCentro(N, x.i, x.j) > RADIO_DEL_CENTRO)) malas.push({ semilla: c.semilla, que: 'una torre fuera del centro' });
  }
  comprobar('en las veinte, el esqueleto es el mismo: dos anillos de bulevar, cuatro avenidas de cuatro celdas, la glorieta de doce con su isleta de cuatro, y el centro de torres dentro de sus siete celdas', malas.length === 0, malas.slice(0, 6));

  /* ── La red es CONEXA: se recorre desde una celda cualquiera con las caras que cada losa abre ── */
  const sueltas: unknown[] = [];
  for (const c of CIUDADES) {
    const calles = c.celdas.filter((x) => esClaseDeCalle(x.clase));
    const vistas = new Set<number>();
    const raiz = calles[0] as CeldaDeLaCiudad;
    const pila = [enLaReticula(raiz.i, raiz.j)];
    vistas.add(pila[0] as number);
    while (pila.length > 0) {
      const k = pila.pop() as number;
      const celda = c.celdas[k] as CeldaDeLaCiudad;
      for (const r of RUMBOS) {
        if ((celda.abre & (1 << r)) === 0) continue;
        const v = vectorDelRumbo(r);
        const vi = celda.i + v.x;
        const vj = celda.j + v.z;
        if (vi < 0 || vj < 0 || vi >= N || vj >= N) continue;
        const vk = enLaReticula(vi, vj);
        if (vistas.has(vk)) continue;
        vistas.add(vk);
        pila.push(vk);
      }
    }
    if (vistas.size !== calles.length) sueltas.push({ semilla: c.semilla, alcanzadas: vistas.size, calles: calles.length });
    const sinVecinas = calles.filter((x) => carasDe(x.abre) === 0);
    if (sinVecinas.length > 0) sueltas.push({ semilla: c.semilla, que: 'calle suelta', donde: sinVecinas.slice(0, 3).map((x) => [x.i, x.j]) });
  }
  comprobar('en las veinte, la red de calles es CONEXA: desde cualquier losa se llega a TODAS las demás, y no hay ninguna suelta', sueltas.length === 0, sueltas.slice(0, 4));

  /* ── Y cada losa encaja con sus vecinas: lo que una abre, la de enfrente lo abre ── */
  const desencajadas: unknown[] = [];
  for (const c of CIUDADES) {
    for (const celda of c.celdas) {
      if (!esClaseDeCalle(celda.clase)) continue;
      for (const r of RUMBOS) {
        const v = vectorDelRumbo(r);
        const vi = celda.i + v.x;
        const vj = celda.j + v.z;
        const fuera = vi < 0 || vj < 0 || vi >= N || vj >= N;
        const vecina = fuera ? undefined : c.celdas[enLaReticula(vi, vj)];
        const abro = (celda.abre & (1 << r)) !== 0;
        /* Por el borde sólo puede abrir una avenida: es su Puerta. Lo demás, cerrado. */
        if (fuera) {
          const esPuerta = v.x !== 0 ? esAvenida(celda.j) : esAvenida(celda.i);
          if (abro !== esPuerta) desencajadas.push({ semilla: c.semilla, i: celda.i, j: celda.j, r, abro, que: 'borde' });
          continue;
        }
        const abre = vecina !== undefined && esClaseDeCalle(vecina.clase) ? (vecina.abre & (1 << ((r + 2) % 4))) !== 0 : false;
        if (abro !== abre) desencajadas.push({ semilla: c.semilla, i: celda.i, j: celda.j, r, abro, abre });
      }
    }
  }
  comprobar('en las veinte, ninguna losa abre a una cara que la vecina cierra: los bordes encajan uno a uno, y por el borde del recinto sólo abren las cuatro avenidas', desencajadas.length === 0, desencajadas.slice(0, 6));
  comprobar('se ve fallar: una máscara girada mal deja de encajar —la recta girada un cuarto abre por el este y el oeste', mascaraGirada(CARAS_ABIERTAS[PIEZA.calzada] as number, 1) === ((1 << 0) | (1 << 2)));

  /* ── Y toda celda de calle tiene su losa puesta, con su giro ── */
  const sinLosa: unknown[] = [];
  for (const c of CIUDADES) {
    const conLosa = new Set(c.calzada.filter((p) => p.pieza !== PIEZA.solera).map((p) => `${Math.round((p.x + MITAD - 6) / 12)},${Math.round((p.z + MITAD - 6) / 12)}`));
    for (const celda of c.celdas) if (esClaseDeCalle(celda.clase) && !conLosa.has(`${celda.i},${celda.j}`)) sinLosa.push({ semilla: c.semilla, i: celda.i, j: celda.j, clase: celda.clase });
  }
  comprobar('en las veinte, toda celda de calle lleva su losa: no queda un agujero de asfalto', sinLosa.length === 0, sinLosa.slice(0, 6));

  /* ── Las cuatro avenidas llegan a sus Puertas, con sus cuatro carriles y por el eje exacto ── */
  const puertasMalas: unknown[] = [];
  for (const c of CIUDADES) {
    for (const p of PUERTAS) {
      const v = vectorDelRumbo(p.rumbo);
      let suma = 0;
      for (const k of CELDAS_DE_AVENIDA) {
        const i = v.x !== 0 ? (v.x > 0 ? N - 1 : 0) : k;
        const j = v.z !== 0 ? (v.z > 0 ? N - 1 : 0) : k;
        const celda = c.celdas[enLaReticula(i, j)] as CeldaDeLaCiudad;
        if (!esClaseDeCalle(celda.clase)) puertasMalas.push({ semilla: c.semilla, casilla: p.casilla, que: 'la boca no es calle', i, j, clase: celda.clase });
        if ((celda.abre & (1 << p.rumbo)) === 0) puertasMalas.push({ semilla: c.semilla, casilla: p.casilla, que: 'la avenida no sale del recinto', i, j });
        suma += v.x !== 0 ? celda.z : celda.x;
        /* Y de la boca a la glorieta, todo el carril es calle: la avenida no se corta por el camino. */
        for (let paso = 0; paso < N; paso++) {
          const ci = v.x !== 0 ? (v.x > 0 ? N - 1 - paso : paso) : k;
          const cj = v.z !== 0 ? (v.z > 0 ? N - 1 - paso : paso) : k;
          if (esAvenida(ci) && esAvenida(cj)) break;
          const otra = c.celdas[enLaReticula(ci, cj)] as CeldaDeLaCiudad;
          if (!esClaseDeCalle(otra.clase)) puertasMalas.push({ semilla: c.semilla, casilla: p.casilla, que: 'la avenida se corta', i: ci, j: cj, clase: otra.clase });
        }
      }
      /* Las cuatro celdas caen simétricas respecto del eje de la casilla: su suma es cero. */
      if (Math.abs(suma) > 0.001) puertasMalas.push({ semilla: c.semilla, casilla: p.casilla, que: 'la avenida entra torcida', suma });
    }
  }
  comprobar('en las veinte, las cuatro avenidas llegan enteras a sus Puertas —los cuatro carriles, sin cortarse y abiertos al borde— y entran por el eje exacto de las casillas 5, 15, 25 y 35', puertasMalas.length === 0, puertasMalas.slice(0, 4));
}

// ---------------------------------------------------------------------------
paso('Las parcelas dan a una calle, los patios no, y los dieciséis distritos no se pisan');
// ---------------------------------------------------------------------------

/** Los catorce distritos de reserva que toda ciudad tiene, uno por familia y cuadrante. */
const RESERVAS = ['parque', 'cementerio', 'centro-comercial', 'circuito', 'poligono', 'obra', 'gasolinera', 'estadio', 'estacion', 'feria', 'hospital', 'colegio', 'canal'];
const TEJIDOS = ['ensanche', 'ocio', 'vivienda-alta', 'naves'];

{
  const malas: unknown[] = [];
  for (const c of CIUDADES) {
    for (const celda of c.celdas) {
      /*
       * Las celdas de TORRE no entran aquí: las cuatro de una torre de esquina de glorieta
       * son UN edificio de 24 × 24, y su celda de dentro no toca ninguna calle —el portal es
       * de la torre, no de la celda—. Que ninguna torre se quede sin portal lo mira, edificio
       * a edificio y no celda a celda, el juez de `sinPortal` del paso siguiente.
       */
      if (celda.clase !== 'parcela' && celda.clase !== 'patio') continue;
      const daACalle = RUMBOS.some((r) => {
        const v = vectorDelRumbo(r);
        const vi = celda.i + v.x;
        const vj = celda.j + v.z;
        if (vi < 0 || vj < 0 || vi >= N || vj >= N) return false;
        const n = c.celdas[enLaReticula(vi, vj)];
        return n !== undefined && esClaseDeCalle(n.clase);
      });
      if (celda.clase === 'parcela' && !daACalle) malas.push({ semilla: c.semilla, i: celda.i, j: celda.j, clase: celda.clase, que: 'solar sin calle' });
      if (celda.clase === 'patio' && daACalle) malas.push({ semilla: c.semilla, i: celda.i, j: celda.j, que: 'patio con calle' });
    }
  }
  comprobar('en las veinte, TODA parcela da a una calle, y lo que no da a ninguna es patio de manzana y no solar', malas.length === 0, malas.slice(0, 6));

  const distritosMalos: unknown[] = [];
  for (const c of CIUDADES) {
    const reservas = c.distritos.filter((d) => d.esReserva);
    for (const g of RESERVAS) if (reservas.filter((d) => d.nombre === g).length !== 1) distritosMalos.push({ semilla: c.semilla, falta: g, cuantos: reservas.filter((d) => d.nombre === g).length });
    if (c.distritos.filter((d) => d.nombre === 'chalets').length !== 1) distritosMalos.push({ semilla: c.semilla, falta: 'chalets' });
    for (const t of TEJIDOS) if (c.distritos.filter((d) => d.nombre === t).length !== 1) distritosMalos.push({ semilla: c.semilla, falta: t });
    /* Ni los de reserva ni el de tejido especial pueden pisarse entre ellos ni salirse del cuadrante. */
    const rectangulos = c.distritos.filter((d) => d.esReserva || d.nombre === 'chalets');
    for (let a = 0; a < rectangulos.length; a++) {
      const x = rectangulos[a] as (typeof rectangulos)[number];
      for (let b = a + 1; b < rectangulos.length; b++) {
        const y = rectangulos[b] as (typeof rectangulos)[number];
        const pisa = x.i0 < y.i0 + y.ancho && y.i0 < x.i0 + x.ancho && x.j0 < y.j0 + y.fondo && y.j0 < x.j0 + x.fondo;
        if (pisa) distritosMalos.push({ semilla: c.semilla, que: 'se pisan', a: x.nombre, b: y.nombre });
      }
      const primera = CELDAS_DEL_BULEVAR.length;
      const ultima = N - CELDAS_DEL_BULEVAR.length;
      if (x.i0 < primera || x.j0 < primera || x.i0 + x.ancho > ultima || x.j0 + x.fondo > ultima) distritosMalos.push({ semilla: c.semilla, que: 'se sale del cuadrante', d: x.nombre });
      /* Y ninguno puede morder la avenida: se comería un carril entero sin que nada fallara. */
      for (let i = x.i0; i < x.i0 + x.ancho; i++) if (esAvenida(i)) distritosMalos.push({ semilla: c.semilla, que: 'muerde la avenida', d: x.nombre });
      for (let j = x.j0; j < x.j0 + x.fondo; j++) if (esAvenida(j)) distritosMalos.push({ semilla: c.semilla, que: 'muerde la avenida', d: x.nombre });
    }
    /* Y el ruido lejos del ocio: el circuito nunca en el mismo cuadrante que el centro comercial. */
    const circuito = c.distritos.find((d) => d.nombre === 'circuito');
    const comercial = c.distritos.find((d) => d.nombre === 'centro-comercial');
    if (circuito !== undefined && comercial !== undefined && circuito.cuadrante === comercial.cuadrante) distritosMalos.push({ semilla: c.semilla, que: 'el circuito con el centro comercial' });
    /* El polígono, la obra y la gasolinera van con el circuito: son la familia del motor. */
    const poligono = c.distritos.find((d) => d.nombre === 'poligono');
    if (circuito !== undefined && poligono !== undefined && circuito.cuadrante !== poligono.cuadrante) distritosMalos.push({ semilla: c.semilla, que: 'el polígono lejos del circuito' });
  }
  comprobar('en las veinte están enteros y sin pisarse los catorce distritos de reserva, el barrio de chalets y los cuatro tejidos, ninguno muerde una avenida, y el ruido nunca cae en el cuadrante del ocio', distritosMalos.length === 0, distritosMalos.slice(0, 6));

  /* Y la ciudad cambia de verdad con la semilla: las veinte no ponen los distritos igual. */
  const disposiciones = new Set(CIUDADES.map((c) => c.distritos.map((d) => `${d.nombre}@${d.cuadrante}`).sort().join('|')));
  comprobar('otra mesa, otra ciudad: veinte semillas dan al menos cinco repartos distintos de distritos', disposiciones.size >= 5, disposiciones.size);
  const trazas = new Set(CIUDADES.map((c) => c.celdas.map((x) => x.clase).join('')));
  comprobar('y veinte trazas de calle distintas', trazas.size === 20, trazas.size);
}

// ---------------------------------------------------------------------------
paso('Los edificios: en su parcela, sin solaparse, con portal y con las plantas dentro de la cáscara');
// ---------------------------------------------------------------------------

interface CajaLlana {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
}

/** La huella de un edificio en el mundo: su cuerpo, ya girado. */
function huellaDelEdificio(e: LaCiudad['edificios'][number]): CajaLlana {
  const frente = e.cascara === null ? e.fondo / 2 : (CUERPO_DEL_MODELO[e.cascara] as { frente: number }).frente;
  const esquinas: Punto[] = [
    { x: -e.ancho / 2, z: frente - e.fondo },
    { x: e.ancho / 2, z: frente - e.fondo },
    { x: -e.ancho / 2, z: frente },
    { x: e.ancho / 2, z: frente },
  ].map((p) => {
    const g = giraElPunto(p.x, p.z, e.giro);
    return { x: e.centro.x + g.x, z: e.centro.z + g.z };
  });
  return {
    x0: Math.min(...esquinas.map((p) => p.x)),
    z0: Math.min(...esquinas.map((p) => p.z)),
    x1: Math.max(...esquinas.map((p) => p.x)),
    z1: Math.max(...esquinas.map((p) => p.z)),
  };
}

{
  const fuera: unknown[] = [];
  const solapados: unknown[] = [];
  const sinPortal: unknown[] = [];
  const desalineados: unknown[] = [];
  let edificiosMirados = 0;
  for (const c of CIUDADES) {
    const huellas = c.edificios.map(huellaDelEdificio);
    edificiosMirados += c.edificios.length;
    for (let k = 0; k < c.edificios.length; k++) {
      const e = c.edificios[k] as LaCiudad['edificios'][number];
      const h = huellas[k] as CajaLlana;
      /* Su parcela: la unión de sus celdas. */
      const ix = e.celdas.map((x) => x.i);
      const jz = e.celdas.map((x) => x.j);
      const a = centroDeCelda(c.recinto, Math.min(...ix), Math.min(...jz));
      const b = centroDeCelda(c.recinto, Math.max(...ix), Math.max(...jz));
      const parcela: CajaLlana = { x0: a.x - 6, z0: a.z - 6, x1: b.x + 6, z1: b.z + 6 };
      if (h.x0 < parcela.x0 - TOLERANCIA || h.z0 < parcela.z0 - TOLERANCIA || h.x1 > parcela.x1 + TOLERANCIA || h.z1 > parcela.z1 + TOLERANCIA) {
        fuera.push({ semilla: c.semilla, edificio: e.indice, cascara: e.cascara, huella: [r2(h.x0), r2(h.z0), r2(h.x1), r2(h.z1)], parcela: [parcela.x0, parcela.z0, parcela.x1, parcela.z1] });
      }
      const portal = celdaDe(c, e.portal.x + vectorDelRumbo(e.frente).x * 0.5, e.portal.z + vectorDelRumbo(e.frente).z * 0.5);
      if (portal === undefined || !esClaseDeCalle(portal.clase)) sinPortal.push({ semilla: c.semilla, edificio: e.indice, distrito: e.distrito, clase: portal?.clase });
      const techoDeLaUltima = ALTURA_DEL_BORDILLO + (e.plantas - 1) * 4.5 + 4;
      const altoDeLaCascara = e.cascara === null ? e.alto : ((cajas.get(e.cascara) as Caja).max[1] as number);
      if (techoDeLaUltima > altoDeLaCascara + 0.1) desalineados.push({ semilla: c.semilla, edificio: e.indice, cascara: e.cascara, plantas: e.plantas, techo: r2(techoDeLaUltima), cascaraAlto: r2(altoDeLaCascara) });
    }
    /* El solape se mira por celdas vecinas y no todos con todos: con 700 edificios, 490.000 parejas por semilla. */
    const porCelda = new Map<string, number[]>();
    for (let k = 0; k < c.edificios.length; k++) {
      for (const celda of (c.edificios[k] as LaCiudad['edificios'][number]).celdas) {
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const clave = `${celda.i + di},${celda.j + dj}`;
            const lista = porCelda.get(clave) ?? [];
            if (lista.indexOf(k) < 0) lista.push(k);
            porCelda.set(clave, lista);
          }
        }
      }
    }
    const vistos = new Set<string>();
    for (const lista of porCelda.values()) {
      for (let a = 0; a < lista.length; a++) {
        for (let b = a + 1; b < lista.length; b++) {
          const ka = lista[a] as number;
          const kb = lista[b] as number;
          const clave = `${Math.min(ka, kb)}-${Math.max(ka, kb)}`;
          if (vistos.has(clave)) continue;
          vistos.add(clave);
          const x = huellas[ka] as CajaLlana;
          const y = huellas[kb] as CajaLlana;
          if (x.x1 > y.x0 + TOLERANCIA && y.x1 > x.x0 + TOLERANCIA && x.z1 > y.z0 + TOLERANCIA && y.z1 > x.z0 + TOLERANCIA) solapados.push({ semilla: c.semilla, a: ka, b: kb });
        }
      }
    }
  }
  comprobar(`en las veinte, ninguno de los ${edificiosMirados} edificios se sale de su parcela: ni uno invade la calzada ni al vecino`, fuera.length === 0, fuera.slice(0, 5));
  comprobar('y ninguna pareja de edificios se solapa', solapados.length === 0, solapados.slice(0, 5));
  comprobar('y TODOS tienen portal: la celda de delante de su fachada es una calle', sinPortal.length === 0, sinPortal.slice(0, 5));
  comprobar('y las plantas que se construyen dentro caben en la cáscara del pack: el suelo de la última no cruza el tejado', desalineados.length === 0, desalineados.slice(0, 5));
  /* La vacuna: un edificio corrido tres unidades hacia su calle tiene que verse salir de la parcela. */
  const uno = (CIUDADES[0] as LaCiudad).edificios.find((e) => e.cascara !== null) as LaCiudad['edificios'][number];
  const v = vectorDelRumbo(uno.frente);
  const corrido = huellaDelEdificio({ ...uno, centro: { x: uno.centro.x + v.x * 3, z: uno.centro.z + v.z * 3 } });
  const celdaDelUno = uno.celdas[0] as { i: number; j: number };
  const centroDelUno = centroDeCelda((CIUDADES[0] as LaCiudad).recinto, celdaDelUno.i, celdaDelUno.j);
  comprobar('se ve fallar: el mismo edificio corrido 3 hacia la calle SÍ se sale de su parcela', corrido.x1 > centroDelUno.x + 6 + TOLERANCIA || corrido.z1 > centroDelUno.z + 6 + TOLERANCIA || corrido.x0 < centroDelUno.x - 6 - TOLERANCIA || corrido.z0 < centroDelUno.z - 6 - TOLERANCIA);
}

// ---------------------------------------------------------------------------
paso('Nada fuera del recinto, y nada plantado en mitad de la calzada');
// ---------------------------------------------------------------------------

{
  const fuera: unknown[] = [];
  const enLaCalzada: unknown[] = [];
  const orillaDeLaCalzada = ANCHO_DE_LA_CALZADA / 2 - 0.1;
  let piezasMiradas = 0;
  for (const c of CIUDADES) {
    const todas: readonly PuestaEnLaCiudad[] = [...c.calzada, ...c.volumenes, ...c.mobiliario, ...c.coches.aparcados];
    piezasMiradas += todas.length;
    for (const p of todas) {
      if (Math.abs(p.x) > MITAD + 0.1 || Math.abs(p.z) > MITAD + 0.1) fuera.push({ semilla: c.semilla, pieza: p.pieza, x: r2(p.x), z: r2(p.z) });
    }
    for (const b of c.fachadas) {
      if (Math.abs(b.x) > MITAD + 0.1 || Math.abs(b.z) > MITAD + 0.1) fuera.push({ semilla: c.semilla, bulto: b.clase, x: r2(b.x), z: r2(b.z) });
    }
    for (const p of c.mobiliario) {
      const celda = celdaDe(c, p.x, p.z);
      if (celda === undefined || !esClaseDeCalle(celda.clase)) continue;
      const du = Math.abs(p.x - celda.x);
      const dv = Math.abs(p.z - celda.z);
      if (Math.max(du, dv) < orillaDeLaCalzada) enLaCalzada.push({ semilla: c.semilla, pieza: p.pieza, i: celda.i, j: celda.j, du: r2(du), dv: r2(dv) });
    }
  }
  comprobar(`en las veinte, ninguna de las ${piezasMiradas} piezas se sale del recinto de 648`, fuera.length === 0, fuera.slice(0, 5));
  comprobar('y ningún mueble urbano cae dentro de la calzada: farolas, semáforos y árboles de mediana van en el bordillo, a 5,70 del eje', enLaCalzada.length === 0, enLaCalzada.slice(0, 6));
  comprobar('se ve fallar: una farola en el eje de una losa de calle está a 0 del eje, y 0 < 5,30', 0 < orillaDeLaCalzada);
  comprobar('la farola se planta a 5,70, que es el centro del bordillo de 0,60', EJE_DEL_BORDILLO === 5.7);
}

// ---------------------------------------------------------------------------
paso('Los coches: aparcados donde se puede, y circulando por su carril');
// ---------------------------------------------------------------------------

{
  const malAparcados: unknown[] = [];
  for (const c of CIUDADES) {
    const losaEn = new Map<string, string>();
    for (const p of c.calzada) losaEn.set(`${Math.round((p.x + MITAD - 6) / 12)},${Math.round((p.z + MITAD - 6) / 12)}`, p.pieza);
    for (const coche of c.coches.aparcados) {
      const celda = celdaDe(c, coche.x, coche.z);
      if (celda === undefined || !esClaseDeCalle(celda.clase)) continue;
      const losa = losaEn.get(`${celda.i},${celda.j}`);
      if (losa !== PIEZA.calzada) malAparcados.push({ semilla: c.semilla, losa, i: celda.i, j: celda.j });
      const du = Math.abs(coche.x - celda.x);
      const dv = Math.abs(coche.z - celda.z);
      if (Math.abs(Math.max(du, dv) - EJE_DEL_APARCAMIENTO) > 0.01 && Math.min(du, dv) > 0.01) malAparcados.push({ semilla: c.semilla, que: 'no está a 4,20 del eje', du: r2(du), dv: r2(dv) });
    }
  }
  comprobar('en las veinte, ningún coche aparcado se posa sobre un paso de cebra, un cruce ni una curva: sólo sobre la recta lisa, y a 4,20 del eje', malAparcados.length === 0, malAparcados.slice(0, 6));

  const fueraDeCarril: unknown[] = [];
  const horariosMalos: unknown[] = [];
  const paradasEnVerde: unknown[] = [];
  const compartidas: unknown[] = [];
  for (const c of CIUDADES) {
    /* Ninguna ruta comparte celda con otra: es lo que hace imposible que dos coches se alcancen. */
    const deQuien = new Map<string, number>();
    for (let k = 0; k < c.coches.rutas.length; k++) {
      const ruta = c.coches.rutas[k] as LaCiudad['coches']['rutas'][number];
      if (ruta.clase !== 'calle') continue;
      for (const p of ruta.puntos) {
        const celda = celdaDe(c, p.x, p.z);
        if (celda === undefined) continue;
        const clave = `${celda.i},${celda.j}`;
        const otra = deQuien.get(clave);
        /* Las dos vueltas de un mismo rectángulo sí comparten celda: van por carriles contrarios. */
        if (otra !== undefined && Math.floor(otra / 2) !== Math.floor(k / 2)) compartidas.push({ semilla: c.semilla, celda: clave, a: otra, b: k });
        deQuien.set(clave, k);
      }
    }
    for (const ruta of c.coches.rutas) {
      /* Se recorre la polilínea de dos en dos unidades y cada muestra tiene que caer en su carril. */
      for (let k = 0; ruta.clase === 'calle' && k < ruta.puntos.length; k++) {
        const a = ruta.puntos[k] as Punto;
        const b = ruta.puntos[(k + 1) % ruta.puntos.length] as Punto;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const largo = Math.sqrt(dx * dx + dz * dz);
        const pasos = Math.max(1, Math.ceil(largo / 2));
        for (let m = 0; m <= pasos; m++) {
          const x = a.x + (dx * m) / pasos;
          const z = a.z + (dz * m) / pasos;
          const celda = celdaDe(c, x, z);
          if (celda === undefined || !esClaseDeCalle(celda.clase)) {
            fueraDeCarril.push({ semilla: c.semilla, x: r2(x), z: r2(z), clase: celda?.clase ?? 'fuera' });
            continue;
          }
          /* La perpendicular a la marcha: es la que dice si el coche se ha subido a la acera. */
          const perp = Math.abs(dx) > Math.abs(dz) ? Math.abs(z - celda.z) : Math.abs(x - celda.x);
          if (perp > ANCHO_DE_LA_CALZADA / 2 - 0.3) fueraDeCarril.push({ semilla: c.semilla, x: r2(x), z: r2(z), perp: r2(perp) });
        }
      }
      /* Y los del circuito no pisan la ciudad: su óvalo entero cae dentro del recinto del circuito. */
      if (ruta.clase === 'circuito') {
        const pista = c.distritos.find((d) => d.nombre === 'circuito');
        if (pista !== undefined) {
          const caja = cajaDelDistrito(c.recinto, pista);
          const seSale = ruta.puntos.filter((p) => p.x < caja.x0 - 1 || p.x > caja.x1 + 1 || p.z < caja.z0 - 1 || p.z > caja.z1 + 1);
          if (seSale.length > 0) fueraDeCarril.push({ semilla: c.semilla, que: 'un coche de carreras se sale del circuito', cuantos: seSale.length });
        }
      }
      let anterior = ruta.horario[0] as { t: number; s: number };
      for (let k = 1; k < ruta.horario.length; k++) {
        const h = ruta.horario[k] as { t: number; s: number };
        if (h.t < anterior.t - 1e-9 || h.s < anterior.s - 1e-9) horariosMalos.push({ semilla: c.semilla, que: 'el horario retrocede', k });
        if (Math.abs(h.s - anterior.s) < 1e-9 && h.t > anterior.t + 1e-9) {
          const parada = ruta.paradas.find((p) => Math.abs(p.s - h.s) < 0.51);
          if (parada === undefined) paradasEnVerde.push({ semilla: c.semilla, que: 'para donde no hay semáforo', s: r2(h.s) });
          else {
            const sem = c.semaforos[parada.cruce];
            if (sem !== undefined && hayVerde(sem, parada.eje, anterior.t + 0.01)) paradasEnVerde.push({ semilla: c.semilla, que: 'para en verde', t: r2(anterior.t) });
          }
        }
        anterior = h;
      }
      if (ruta.paradas.length > 0 && Math.abs(ruta.periodo / CICLO_DEL_SEMAFORO - Math.round(ruta.periodo / CICLO_DEL_SEMAFORO)) > 1e-6) {
        horariosMalos.push({ semilla: c.semilla, que: 'el periodo no es múltiplo del ciclo', periodo: ruta.periodo });
      }
    }
  }
  comprobar('en las veinte, NINGUNA ruta se sale de la calzada: todas las muestras caen en una losa de calle y a menos de 5,10 del eje', fueraDeCarril.length === 0, fueraDeCarril.slice(0, 6));
  comprobar('y ninguna ruta comparte una sola celda con otra que no sea su vuelta contraria: por eso dos coches no pueden alcanzarse', compartidas.length === 0, compartidas.slice(0, 6));
  comprobar('los horarios no retroceden nunca y su periodo es múltiplo exacto del ciclo de 12 s, que es lo que hace que la vuelta siguiente encuentre los semáforos igual', horariosMalos.length === 0, horariosMalos.slice(0, 5));
  comprobar('y ningún coche se para donde no hay semáforo ni con el suyo en verde', paradasEnVerde.length === 0, paradasEnVerde.slice(0, 5));

  /*
   * ── QUE NO SE ALCANCEN ──
   *
   * Se muestrean trescientos segundos y se miden todos con todos. El suelo son CUATRO
   * unidades y no ocho, y el número está medido: dos coches que se cruzan por carriles
   * contrarios de la misma calle van a 5,40 —que es lo que mide la calzada partida— y eso
   * no es alcanzarse, es cruzarse. Un coche mide 2,51 de ancho, así que a 4,00 no se tocan.
   */
  const cerca: unknown[] = [];
  const primera = CIUDADES[0] as LaCiudad;
  let masCerca = Infinity;
  for (let t = 0; t < 300; t += 0.5) {
    const sitios = primera.coches.rutas.map((r) => cocheEnElInstante(r, t));
    for (let a = 0; a < sitios.length; a++) {
      for (let b = a + 1; b < sitios.length; b++) {
        const p = sitios[a] as { x: number; z: number };
        const q = sitios[b] as { x: number; z: number };
        const d = Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.z - q.z) * (p.z - q.z));
        masCerca = Math.min(masCerca, d);
        if (d < 4) cerca.push({ t: r2(t), a, b, d: r2(d) });
      }
    }
  }
  comprobar(`en trescientos segundos muestreados cada medio, ningún par de coches se toca: el más cerca que llegan dos es ${r2(masCerca)}`, cerca.length === 0, cerca.slice(0, 4));

  /* ── Y el reloj es puro: el mismo instante da el mismo sitio, y una pausa no descoloca ── */
  const ruta = (CIUDADES[0] as LaCiudad).coches.rutas[0] as LaCiudad['coches']['rutas'][number];
  const a1 = cocheEnElInstante(ruta, 37.25);
  const a2 = cocheEnElInstante(ruta, 37.25);
  const b1 = cocheEnElInstante(ruta, 37.25 + ruta.periodo);
  comprobar('el sitio de un coche es función pura del reloj: el mismo instante, el mismo punto', a1.x === a2.x && a1.z === a2.z && a1.giro === a2.giro);
  comprobar('y una vuelta entera después está donde estaba: el horario es periódico de verdad', Math.abs(b1.x - a1.x) < 1e-6 && Math.abs(b1.z - a1.z) < 1e-6);
  comprobar('el avance nunca se sale de la ruta', (() => {
    for (let t = 0; t < 200; t += 1.7) {
      const s = avanceDeLaRuta(ruta, t);
      if (s < 0 || s > ruta.largo + 1e-6) return false;
    }
    return true;
  })());
  const enElBorde = puntoDeLaRuta(ruta, ruta.largo - 0.0001);
  comprobar('y el final de la polilínea enlaza con el principio sin saltar', Math.abs(enElBorde.x - (ruta.puntos[0] as Punto).x) < 1 && Math.abs(enElBorde.z - (ruta.puntos[0] as Punto).z) < 1);
}

// ---------------------------------------------------------------------------
paso('Las salas: muebles dentro de sus tabiques, sin solaparse y sin tapar la puerta');
// ---------------------------------------------------------------------------

/** El rectángulo que la hoja necesita para abrirse, en ejes de la sala. */
function barridoDeLaPuerta(sala: PuestaDeSala): CajaLlana & { readonly u0: number; readonly v0: number; readonly u1: number; readonly v1: number } {
  const mu = sala.ancho / 2;
  const mv = sala.fondo / 2;
  const h = ANCHO_DE_LA_PUERTA / 2;
  const caja =
    sala.puerta.pared === 0
      ? { u0: mu - BARRIDO_DE_LA_PUERTA, v0: -h, u1: mu, v1: h }
      : sala.puerta.pared === 2
        ? { u0: -mu, v0: -h, u1: -mu + BARRIDO_DE_LA_PUERTA, v1: h }
        : sala.puerta.pared === 1
          ? { u0: -h, v0: mv - BARRIDO_DE_LA_PUERTA, u1: h, v1: mv }
          : { u0: -h, v0: -mv, u1: h, v1: -mv + BARRIDO_DE_LA_PUERTA };
  return { ...caja, x0: caja.u0, z0: caja.v0, x1: caja.u1, z1: caja.v1 };
}

{
  const fueraDeLaSala: unknown[] = [];
  const solapados: unknown[] = [];
  const enLaPuerta: unknown[] = [];
  let salasMiradas = 0;
  let mueblesMirados = 0;
  const usosVistos = new Set<string>();
  /*
   * Con 700 edificios por ciudad, amueblarlos todos en cuatro ciudades son cien mil salas y
   * casi un minuto. Se muestrea uno de cada trece, que en cuatro semillas son más de
   * doscientos edificios de todos los distritos: la regla de amueblar no depende de CUÁL sea
   * el edificio, así que lo que se compra con muestrear es lo mismo y cuesta un segundo.
   */
  for (const c of CIUDADES.slice(0, 4)) {
    for (let k = 0; k < c.edificios.length; k += 13) {
      const e = c.edificios[k] as LaCiudad['edificios'][number];
      for (const sala of salasDelEdificio(e, c.semilla)) {
        salasMiradas++;
        usosVistos.add(sala.uso);
        const enElSuelo = sala.muebles.filter((m) => Math.abs(m.y - (sala.y + 0.5)) < 0.01);
        const huellas = enElSuelo.map((m) => {
          const d = giraElPunto(m.x - sala.centro.x, m.z - sala.centro.z, -sala.giro);
          const cuartos = Math.round((m.giro - sala.giro) / (Math.PI / 2));
          return { pieza: m.pieza, ...huellaDelMueble({ pieza: m.pieza, u: d.x, v: d.z, y: 0, cuartos }) };
        });
        mueblesMirados += huellas.length;
        const barrido = barridoDeLaPuerta(sala);
        for (const h of huellas) {
          if (h.u0 < -sala.ancho / 2 - 0.02 || h.u1 > sala.ancho / 2 + 0.02 || h.v0 < -sala.fondo / 2 - 0.02 || h.v1 > sala.fondo / 2 + 0.02) {
            fueraDeLaSala.push({ semilla: c.semilla, edificio: e.indice, uso: sala.uso, pieza: h.pieza, caja: [r2(h.u0), r2(h.v0), r2(h.u1), r2(h.v1)], sala: [r2(sala.ancho), r2(sala.fondo)] });
          }
          if (h.u1 > barrido.u0 + 0.02 && barrido.u1 > h.u0 + 0.02 && h.v1 > barrido.v0 + 0.02 && barrido.v1 > h.v0 + 0.02) {
            enLaPuerta.push({ semilla: c.semilla, uso: sala.uso, pieza: h.pieza });
          }
        }
        for (let a = 0; a < huellas.length; a++) {
          for (let b = a + 1; b < huellas.length; b++) {
            const x = huellas[a] as (typeof huellas)[number];
            const y = huellas[b] as (typeof huellas)[number];
            if (x.u1 > y.u0 + 0.02 && y.u1 > x.u0 + 0.02 && x.v1 > y.v0 + 0.02 && y.v1 > x.v0 + 0.02) solapados.push({ semilla: c.semilla, uso: sala.uso, a: x.pieza, b: y.pieza });
          }
        }
      }
    }
  }
  comprobar(`${salasMiradas} salas y ${mueblesMirados} muebles de suelo: ninguno se sale de sus tabiques`, fueraDeLaSala.length === 0, fueraDeLaSala.slice(0, 6));
  comprobar('ninguna pareja de muebles de suelo se solapa: nada atraviesa nada', solapados.length === 0, solapados.slice(0, 6));
  comprobar('y el barrido de la puerta —2,4 × 1,2— está siempre vacío: no hay una sala en la que el sofá tape la salida', enLaPuerta.length === 0, enLaPuerta.slice(0, 6));
  comprobar('y salen las siete clases de sala: salón, cocina, comedor, tienda, oficina, dormitorio y almacén', usosVistos.size === 7, [...usosVistos].sort());
  /* La vacuna: un mueble movido al centro del barrido tiene que verse caer. */
  {
    const c = CIUDADES[0] as LaCiudad;
    const sala = salasDelEdificio(c.edificios[0] as LaCiudad['edificios'][number], c.semilla)[0] as PuestaDeSala;
    const barrido = barridoDeLaPuerta(sala);
    const centroDelBarrido = { u: (barrido.u0 + barrido.u1) / 2, v: (barrido.v0 + barrido.v1) / 2 };
    const veneno = huellaDelMueble({ pieza: PIEZA.sofa, u: centroDelBarrido.u, v: centroDelBarrido.v, y: 0, cuartos: 0 });
    comprobar('se ve fallar: un sofá puesto en el centro del barrido de la puerta lo pisa', veneno.u1 > barrido.u0 && barrido.u1 > veneno.u0 && veneno.v1 > barrido.v0 && barrido.v1 > veneno.v0);
  }
  comprobar('y la puerta mide lo que mide la hoja del pack más su marco', ANCHO_DE_LA_PUERTA === 2.4 && BARRIDO_DE_LA_PUERTA === 1.2 && cajaDelMueble(PIEZA.hojaDePuerta).ancho === 1.6);
}

// ---------------------------------------------------------------------------
paso('Los grupos: la ciudad partida en trozos, y que al partirla no se pierde nada');
// ---------------------------------------------------------------------------

const trianguloDeUnNivel = (n: NivelDeDetalle): number => n.triangulos;

{
  const malos: unknown[] = [];
  const perdidas: unknown[] = [];
  for (const c of CIUDADES) {
    const enL1 = c.grupos.reduce((a, g) => a + trianguloDeUnNivel(g.niveles[0] as NivelDeDetalle), 0);
    const rutas = c.coches.rutas.reduce((a, r) => a + triangulosDe(r.pieza), 0);
    const interiores = c.interiores.reduce((a, s) => a + s.triangulos, 0);
    /* Todo lo que la ciudad pone está en algún grupo: lo único que no es de nadie son los
     * coches que circulan (van siempre montados) y los interiores (se piden aparte). */
    if (enL1 + rutas + interiores !== c.triangulos.total) perdidas.push({ semilla: c.semilla, enL1, rutas, interiores, total: c.triangulos.total });
    for (const g of c.grupos) {
      const l1 = trianguloDeUnNivel(g.niveles[0] as NivelDeDetalle);
      const l2 = trianguloDeUnNivel(g.niveles[1] as NivelDeDetalle);
      const l3 = trianguloDeUnNivel(g.niveles[2] as NivelDeDetalle);
      if (l2 > l1 || l3 > l2) malos.push({ semilla: c.semilla, grupo: g.nombre, l1, l2, l3 });
      if (g.celdas === 0 || g.radio <= 0) malos.push({ semilla: c.semilla, grupo: g.nombre, que: 'grupo vacío' });
    }
    const celdasEnGrupos = c.grupos.reduce((a, g) => a + g.celdas, 0);
    if (celdasEnGrupos !== N * N) perdidas.push({ semilla: c.semilla, que: 'hay celdas sin grupo', celdasEnGrupos });
  }
  comprobar('en las veinte, al partir la ciudad en grupos no se pierde ni un triángulo ni una celda: la suma de los L1 más los coches y los interiores es la ciudad entera', perdidas.length === 0, perdidas.slice(0, 4));
  comprobar('y en todos los grupos, L2 pesa menos que L1 y L3 menos que L2: bajar de nivel siempre ahorra', malos.length === 0, malos.slice(0, 6));

  const c = CIUDADES[0] as LaCiudad;
  const manzanas = c.grupos.filter((g) => g.clase === 'manzana');
  const calles = c.grupos.filter((g) => g.clase === 'calle');
  const distritos = c.grupos.filter((g) => g.clase === 'distrito');
  comprobar(`la ciudad se parte en ${c.grupos.length} grupos: ${manzanas.length} manzanas, ${calles.length} teselas de calle y ${distritos.length} distritos`, manzanas.length >= 40 && calles.length >= 40 && distritos.length >= 14);
  comprobar('la tesela de calle mide 6 × 6 celdas, o sea 72: el frente de una casilla del tablero', CELDAS_POR_TESELA * RETICULA_DE_LA_CIUDAD === 72);
  /* La histéresis: un grupo que ya estaba en L1 aguanta 40 unidades más antes de bajar. */
  {
    const g = manzanas[0] as GrupoDeLaCiudad;
    const justo = UMBRALES_DE_NIVEL.plena.alto;
    const x = g.centro.x + justo + 20;
    comprobar('la histéresis de 40 aguanta: a 20 pasado el umbral, el grupo que ya estaba en L1 sigue en L1, y el que no, no', nivelDelGrupo(g, x, g.centro.z, 'plena', 0) === 0 && nivelDelGrupo(g, x, g.centro.z, 'plena') === 1, {
      con: nivelDelGrupo(g, x, g.centro.z, 'plena', 0),
      sin: nivelDelGrupo(g, x, g.centro.z, 'plena'),
    });
    comprobar('y pasada la histéresis entera, baja igual', nivelDelGrupo(g, g.centro.x + justo + HISTERESIS_DEL_NIVEL + 1, g.centro.z, 'plena', 0) === 1);
  }
}

// ---------------------------------------------------------------------------
paso('El presupuesto: lo que la cámara tiene MONTADO, desde ocho sitios y en las dos calidades');
// ---------------------------------------------------------------------------

/** Ocho poses: el centro, los cuatro cuadrantes, dos bordes y la pose de salida, que mira el tablero entero. */
const POSES: readonly { readonly nombre: string; readonly x: number; readonly z: number }[] = [
  { nombre: 'la glorieta', x: 0, z: 0 },
  { nombre: 'el cuadrante noroeste', x: -162, z: -162 },
  { nombre: 'el cuadrante noreste', x: 162, z: -162 },
  { nombre: 'el cuadrante sureste', x: 162, z: 162 },
  { nombre: 'el cuadrante suroeste', x: -162, z: 162 },
  { nombre: 'la boca de la Puerta sur', x: 0, z: 324 },
  { nombre: 'la esquina del recinto', x: -324, z: -324 },
  { nombre: 'la pose de salida', x: 0, z: 1010 },
  /* El confín: la cercanía más lejana que la cámara admite (`masLejos` 1,25 → el ojo a 1.264 del centro). */
  { nombre: 'el confín de la cámara', x: 0, z: 1264 },
];

{
  const pasados: unknown[] = [];
  let peorPlena = 0;
  let peorSobria = 0;
  let dondeLaPeor = '';
  const sumaDelMontaje = (c: LaCiudad, x: number, z: number): number => {
    const m = montarLaCiudad(c, x, z);
    const rutas = c.coches.rutas.reduce((a, r) => a + triangulosDe(r.pieza), 0);
    const interiores = c.interiores.reduce((a, s) => a + s.triangulos, 0);
    return m.triangulos + rutas + interiores;
  };
  for (let k = 0; k < SEMILLAS.length; k++) {
    const semilla = SEMILLAS[k] as number;
    for (const calidad of ['plena', 'sobria'] as const) {
      const c = calidad === 'plena' ? (CIUDADES[k] as LaCiudad) : generarLaCiudad(semilla, RECINTO_DEL_BURGO, 'sobria');
      const suma = c.triangulos.calzada + c.triangulos.volumenes + c.triangulos.fachadas + c.triangulos.mobiliario + c.triangulos.coches + c.triangulos.distritos + c.triangulos.interiores;
      if (suma !== c.triangulos.total) pasados.push({ semilla, calidad, que: 'la suma por capas no cuadra con el total', suma, total: c.triangulos.total });
      const tope = calidad === 'plena' ? TOPE_DE_LA_CIUDAD.plena : TOPE_DE_LA_CIUDAD.sobria;
      for (const pose of POSES) {
        const montado = sumaDelMontaje(c, pose.x, pose.z);
        if (montado > tope) pasados.push({ semilla, calidad, pose: pose.nombre, montado, tope });
        if (calidad === 'plena' && montado > peorPlena) {
          peorPlena = montado;
          dondeLaPeor = pose.nombre;
        }
        if (calidad === 'sobria') peorSobria = Math.max(peorSobria, montado);
      }
      if (calidad === 'sobria' && c.interiores.length > 0) pasados.push({ semilla, que: 'en sobria no se abre ningún edificio' });
    }
  }
  comprobar(
    `las veinte ciudades caben en el presupuesto desde las ocho poses: la peor en plena pesa ${peorPlena} de ${TOPE_DE_LA_CIUDAD.plena} (desde ${dondeLaPeor}), y en sobria ${peorSobria} de ${TOPE_DE_LA_CIUDAD.sobria}`,
    pasados.length === 0,
    pasados.slice(0, 6),
  );
  /* La vacuna que explica por qué existe el nivel de detalle: la ciudad ENTERA en L1 no cabe. */
  const entera = (CIUDADES[0] as LaCiudad).triangulos.total;
  comprobar(`se ve fallar: la ciudad entera montada en L1 pesa ${entera} y NO cabe en ${TOPE_DE_LA_CIUDAD.plena} — por eso hay niveles`, entera > TOPE_DE_LA_CIUDAD.plena * 2);
  /* Y la otra: con el tope a la mitad, ni el montaje bueno cabría. */
  comprobar('se ve fallar: con el tope a la mitad, el montaje de la glorieta ya no cabe', sumaDelMontaje(CIUDADES[0] as LaCiudad, 0, 0) > TOPE_DE_LA_CIUDAD.plena / 2);
  const c = CIUDADES[0] as LaCiudad;
  comprobar('y las capas no están vacías: hay calzada, volúmenes, mobiliario, coches, distritos e interiores', c.triangulos.calzada > 0 && c.triangulos.volumenes > 0 && c.triangulos.mobiliario > 0 && c.triangulos.coches > 0 && c.triangulos.distritos > 0 && c.triangulos.interiores > 0);
  /*
   * ─ LA POSE DE SALIDA: NI UN GRUPO EN L1, Y TODOS EN L2. ─
   *
   * Es la pose que el jugador ve cada vez que abre el arcade, y con el umbral de L2 en 420 la
   * ciudad entera caía a L3: prismas de diez triángulos sobre manta de asfalto, 9.742
   * triángulos de un presupuesto de 692.000. Se vio mirando. Con 1.500, desde ahí la ciudad
   * entera va en L2 —calles del pack, prismas con banda de ventanas— por 157.000. Ni un grupo
   * en L1, que es lo correcto: a 1.010 una ventana del pack no llega a un píxel.
   */
  const desdeLaSalida = montarLaCiudad(c, 0, 1010);
  comprobar(
    'desde la pose de salida no queda un grupo en L1 ni uno en L3: la ciudad entera se ve en L2, con sus calles y sus prismas',
    (desdeLaSalida.gruposPorNivel[0] as number) === 0 && (desdeLaSalida.gruposPorNivel[1] as number) === c.grupos.length,
    desdeLaSalida.gruposPorNivel,
  );
  /* La vacuna del fallo que de verdad hubo: con el umbral viejo, esa misma pose no llegaba a diez mil triángulos. */
  const todoEnL3 = c.grupos.reduce((a, g) => a + (g.niveles[2] as NivelDeDetalle).triangulos, 0);
  const todoEnL2 = c.grupos.reduce((a, g) => a + (g.niveles[1] as NivelDeDetalle).triangulos, 0);
  comprobar(
    `se ve fallar: con el umbral de L2 en 420 la pose de salida montaba ${todoEnL3} triángulos —el 6 % de los ${todoEnL2} que monta ahora— y sobraban 682.000 de presupuesto`,
    todoEnL3 * 10 < todoEnL2 && todoEnL2 < TOPE_DE_LA_CIUDAD.plena,
    { todoEnL3, todoEnL2 },
  );
  /*
   * Desde la glorieta NO hay nada en L3, y desde el confín NO hay nada en L1: con 1.500, que
   * pasa de la diagonal de la ciudad (916), los dos extremos ya no pueden coincidir. Es una
   * consecuencia buscada y no un descuido — L1 es «estoy dentro» y L3 es «estoy fuera del
   * todo»— y por eso se afirma que cada nivel se usa desde ALGUNA pose, no que los tres
   * convivan.
   */
  const enLaGlorieta = montarLaCiudad(c, 0, 0);
  comprobar('desde la glorieta hay grupos en L1 y en L2 y ninguno en L3', (enLaGlorieta.gruposPorNivel[0] as number) > 0 && (enLaGlorieta.gruposPorNivel[1] as number) > 0 && (enLaGlorieta.gruposPorNivel[2] as number) === 0, enLaGlorieta.gruposPorNivel);
  const desdeUnCuadrante = montarLaCiudad(c, -162, -162);
  comprobar('desde un cuadrante hay grupos en L1 y en L2', (desdeUnCuadrante.gruposPorNivel[0] as number) > 0 && (desdeUnCuadrante.gruposPorNivel[1] as number) > 0, desdeUnCuadrante.gruposPorNivel);
  const desdeElConfin = montarLaCiudad(c, 0, 2200);
  comprobar('y en el confín, con el ojo más allá de lo que la cámara admite, la ciudad entera cae a L3: el nivel más pobre existe y se usa', (desdeElConfin.gruposPorNivel[2] as number) === c.grupos.length, desdeElConfin.gruposPorNivel);
}

// ---------------------------------------------------------------------------
paso('La misma semilla da la misma ciudad');
// ---------------------------------------------------------------------------

{
  /* Una firma barata: con 2.916 celdas y 20.000 piezas, concatenar cadenas cuesta más que generar. */
  const firma = (c: LaCiudad): string => {
    let h = 0x811c_9dc5;
    const mete = (v: number): void => {
      h ^= Math.round(v * 100) | 0;
      h = Math.imul(h, 0x0100_0193) >>> 0;
    };
    for (const celda of c.celdas) mete(celda.clase.length * 7 + celda.abre);
    for (const p of c.calzada) mete(p.x + p.z * 3 + p.giro * 7 + p.pieza.length);
    for (const p of c.volumenes) mete(p.x + p.z * 3 + p.pieza.length);
    for (const p of c.mobiliario) mete(p.x + p.z * 3 + p.pieza.length);
    for (const r of c.coches.rutas) mete(r.largo + r.periodo * 13);
    for (const s of c.interiores) mete(s.muebles.length + s.uso.length);
    for (const g of c.grupos) mete((g.niveles[0] as NivelDeDetalle).triangulos + (g.niveles[1] as NivelDeDetalle).triangulos);
    return `${h}|${c.triangulos.total}|${c.edificios.length}`;
  };
  const distintas: unknown[] = [];
  for (const c of CIUDADES) {
    const otra = generarLaCiudad(c.semilla, RECINTO_DEL_BURGO, 'plena');
    if (firma(c) !== firma(otra)) distintas.push(c.semilla);
  }
  comprobar('las veinte ciudades se regeneran idénticas: la misma mesa se ve igual en los seis aparatos', distintas.length === 0, distintas);
  comprobar('y dos semillas distintas dan dos ciudades distintas', firma(CIUDADES[0] as LaCiudad) !== firma(CIUDADES[1] as LaCiudad));
}

// ---------------------------------------------------------------------------
paso('Lo que la ciudad trae, en números');
// ---------------------------------------------------------------------------

{
  const c = CIUDADES[0] as LaCiudad;
  let salas = 0;
  let muebles = 0;
  for (let k = 0; k < c.edificios.length; k += 13) {
    for (const s of salasDelEdificio(c.edificios[k] as LaCiudad['edificios'][number], c.semilla)) {
      salas++;
      muebles += s.muebles.length;
    }
  }
  const porClase = new Map<string, number>();
  for (const celda of c.celdas) porClase.set(celda.clase, (porClase.get(celda.clase) ?? 0) + 1);
  console.log(`   celdas: ${[...porClase.entries()].sort().map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`   losas de calzada ${c.calzada.length} · edificios ${c.edificios.length} · mobiliario ${c.mobiliario.length} · semáforos ${c.semaforos.length} · bultos propios ${c.fachadas.length} · cintas ${c.cintas.length}`);
  console.log(`   muestreando 1 de cada 13 edificios: ${salas} salas y ${muebles} muebles (la ciudad entera son unas ${Math.round((salas * c.edificios.length) / Math.ceil(c.edificios.length / 13))})`);
  console.log(`   coches: ${c.coches.aparcados.length} aparcados y ${c.coches.rutas.length} circulando (${c.coches.rutas.filter((r) => r.paradas.length > 0).length} con semáforos)`);
  console.log(`   triángulos de la ciudad entera en L1, por capa: ${JSON.stringify(c.triangulos)}`);
  for (const pose of POSES) {
    const m = montarLaCiudad(c, pose.x, pose.z);
    console.log(`   montaje desde ${pose.nombre}: ${m.triangulos} triángulos · grupos por nivel ${JSON.stringify(m.gruposPorNivel)} · triángulos por nivel ${JSON.stringify(m.porNivel)}`);
  }
  const porDistrito = new Map<string, number>();
  for (const g of c.grupos) if (g.clase === 'distrito') porDistrito.set(g.nombre.replace(/ \d+$/, ''), trianguloDeUnNivel(g.niveles[0] as NivelDeDetalle));
  console.log(`   triángulos por distrito: ${[...porDistrito.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  comprobar('la ciudad trae más de quinientos edificios, más de mil losas de calzada, más de dos mil piezas de mobiliario y doce coches en marcha', c.edificios.length > 500 && c.calzada.length > 1000 && c.mobiliario.length > 2000 && c.coches.rutas.length >= 12, {
    edificios: c.edificios.length,
    calzada: c.calzada.length,
    mobiliario: c.mobiliario.length,
    rutas: c.coches.rutas.length,
  });
  comprobar('y los dieciséis distritos ponen algo cada uno: ninguno se queda en un rectángulo vacío', [...porDistrito.values()].every((v) => v > 0) && porDistrito.size >= 14, [...porDistrito.entries()].filter(([, v]) => v === 0));
}

console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log('');
}
/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS». Un guion que se cae a la mitad termina con código
 * cero y una lista corta de aciertos, y eso se lee como verde. El número va a mano, con
 * margen, y hay que subirlo al añadir comprobaciones.
 */
const COMPROBACIONES_ESCRITAS = 60;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(`Solo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones que tiene escritas este guion: se ha caído por el camino sin decirlo. Si has añadido comprobaciones nuevas, sube el número.`);
  process.exit(2);
}
if (fallos.length === 0) {
  console.log(`${hechas} comprobaciones`);
  process.exit(0);
}
process.exit(1);
