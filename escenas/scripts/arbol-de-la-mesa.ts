/**
 * UN MODELO DEL ÁRBOL DE `delta.tsx`, ORDENADO CON EL PINTOR DE `three` DE VERDAD.
 *
 * ═══ QUÉ ES ESTO Y QUÉ NO ═══
 *
 * Es un MODELO: no monta React ni `delta.tsx`. Reproduce a mano el árbol de grupos y
 * mallas que `delta.tsx` cuelga de la cámara —la mesa con su tapa, sombras, tapete,
 * piezas y naipe; la mano de bienes con sus cartas y áreas; la mano del mazo con sus
 * cartas y casillas— con los MISMOS materiales (opaco o transparente, con o sin prueba de
 * profundidad, con o sin escritura de color), y lo mete en el `WebGLRenderLists` de
 * `three` 0.185.1, que es quien decide el orden de dibujo en el navegador y en el móvil.
 *
 * Lo que NO se copia, se IMPORTA: las constantes de capa salen de `capas.ts` —las mismas
 * que pinta `delta.tsx`—, y las posiciones de `huecosDeLaMesa` (la rama con dados de la
 * barra: sus piezas, y el asa y los dos cubos donde hay sitio), `tapaDeLaMesa`,
 * `huecosDeLaBaraja`, `areasDeTrueque`, `huecosDeLasCartas` y `casillasDeLaMano`, con la
 * cámara del mirador de salida puesta con `ojoDelMirador`. Si
 * alguien mueve una constante o un hueco, este modelo se mueve con él. Lo que sí puede
 * quedarse atrás es la FORMA del árbol —qué grupo lleva número, qué malla es transparente—
 * y por eso `verify:escena` lee además los diez grupos de `delta.tsx` por texto: el texto
 * afirma que los números están puestos; esto afirma que, puestos, el pintor hace con ellos
 * lo que se quiere.
 *
 * ═══ LAS DOS COSAS QUE EL GUION IDEALIZADO NO MIRABA, Y QUE AQUÍ SÍ ═══
 *
 * La primera medida del orden (cuarta vuelta del diseño) ponía todas las mallas a `z = −2`
 * en un solo grupo y sin poda. Le faltaban dos cosas del `projectObject` real:
 *
 *  1. La POSICIÓN de cada malla respecto al grupo anclado a la cámara. La `z` de la lista
 *     sale de la posición proyectada, y el desempate de `painterSortStable` entre dos
 *     mallas del mismo grupo, orden y material es esa `z`.
 *  2. La PODA POR FRUSTUM: `projectObject` sólo mete en la lista lo que
 *     `frustum.intersectsObject` acepta (o lo que lleva `frustumCulled = false`). Una malla
 *     en el ORIGEN de un grupo que copia la posición de la cámara está en el ojo, detrás
 *     del plano cercano, y se poda: no se dibuja y su `onBeforeRender` no se llama. Así se
 *     descubrió que los dos testigos de `clearDepth` de `delta.tsx` no habían corrido
 *     nunca (cabecera de `capas.ts`). `podados` lista lo que se queda fuera, y el juez
 *     exige que nada de la mesa esté ahí.
 *
 * Correr este fichero suelto (`npx tsx escenas/scripts/arbol-de-la-mesa.ts`) imprime la
 * lista ordenada y los fallos, que es lo que se mira cuando algo del orden se discute.
 */
import * as THREE from 'three';
import { WebGLRenderLists } from 'three/src/renderers/webgl/WebGLRenderLists.js';
import type { RenderItem } from 'three/src/renderers/webgl/WebGLRenderLists.js';
import {
  ORDEN_DE_LA_BARRA,
  ORDEN_DE_LAS_AREAS,
  ORDEN_DE_LAS_CARTAS,
  ORDEN_DE_LAS_CARTAS_DEL_MAZO,
  ORDEN_DE_LAS_CASILLAS,
} from '../capas';
import { ZOCALO, huecosDeLaMesa } from '../barra';
import { ARISTA_DEL_DADO, CENTRO_DEL_DADO_SOBRE_LA_TAPA, RADIO_DE_LA_SOMBRA_DEL_DADO, centroDelDado } from '../dados';
import { tapaDeLaMesa } from '../mesa';
import {
  FONDO_DEL_TAPETE,
  RADIO_DE_LA_SOMBRA,
  SOBRE_LA_TAPA,
  geometriaDeLaTapa,
  geometriaDeLasSombras,
  geometriaDelTapete,
} from '../tablon';
import { ALCANCE_DEL_DELTA, FILAS_DE_LA_MESA, segmentosDeLaMesa } from '../presupuesto-del-delta';
import { areasDeTrueque, huecosDeLaBaraja } from '../baraja';
import { casillasDeLaMano, huecosDeLasCartas } from '../cartas';
import { MIRADOR_DE_SALIDA, ojoDelMirador } from '../camara';
import { ALTURA_DE_UNA_PERSONA, RADIO_DE_TESELA } from '../escala';

/** Un lienzo en puntos, como los de la lista `LIENZOS` de `verify:escena`. */
export interface LienzoDelModelo {
  ancho: number;
  alto: number;
}

/** Lo que devuelve el pintor: la lista en orden de dibujo, por pasadas, y lo podado. */
export interface OrdenDeDibujoDeLaMesa {
  /** `PASADA nombre [gN rN zZ]`, en el orden exacto en que `three` lo pintaría. */
  lineas: string[];
  /** Los nombres de las mallas que `projectObject` deja fuera por frustum. */
  podados: string[];
}

const CAMPO_EN_GRADOS = 45;
/** El anillo de una señal flota a esta altura sobre el vértice (`ALTO_DEL_ANILLO` de `delta.tsx`). */
const ALTO_DEL_ANILLO = ALTURA_DE_UNA_PERSONA * 2.5;

function grupo(nombre: string, renderOrder: number | null, posicion?: readonly [number, number, number]): THREE.Group {
  const g = new THREE.Group();
  g.name = nombre;
  if (renderOrder !== null) g.renderOrder = renderOrder;
  if (posicion !== undefined) g.position.set(...posicion);
  return g;
}

function malla(
  nombre: string,
  geometria: THREE.BufferGeometry,
  material: THREE.Material,
  renderOrder = 0,
  posicion: readonly [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const m = new THREE.Mesh(geometria, material);
  m.name = nombre;
  m.renderOrder = renderOrder;
  m.position.set(...posicion);
  return m;
}

/* Los materiales, con lo que decide la pasada y el desempate: nada más. */
const cuadrito = (): THREE.PlaneGeometry => new THREE.PlaneGeometry(0.2, 0.2);
const opaco = (): THREE.Material => new THREE.MeshStandardMaterial();
const basicoSinProfundidad = (): THREE.Material =>
  new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false });
const transparente = (): THREE.Material =>
  new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
const transparenteSinProfundidad = (): THREE.Material =>
  new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false });
const transparenteEstandar = (): THREE.Material =>
  new THREE.MeshStandardMaterial({ transparent: true });
const invisible = (): THREE.Material =>
  new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

/**
 * EL ÁRBOL, tal como lo cuelga `delta.tsx` para un lienzo, con la cámara del mirador de
 * salida. Cuatro huecos en la barra (tres piezas y el mazo) y los dos dados con su asa donde
 * caben, cinco cartas de bienes con el imán tirando de la segunda, dos áreas de trueque,
 * dos cartas del mazo y una casilla.
 */
export function arbolDeLaMesa(lienzo: LienzoDelModelo): { escena: THREE.Scene; camara: THREE.PerspectiveCamera } {
  const proporcion = lienzo.ancho / lienzo.alto;
  const campo = (CAMPO_EN_GRADOS * Math.PI) / 180;
  const camara = new THREE.PerspectiveCamera(CAMPO_EN_GRADOS, proporcion, 0.5, ALCANCE_DEL_DELTA * 8);
  camara.position.set(...ojoDelMirador(MIRADOR_DE_SALIDA, ALCANCE_DEL_DELTA, proporcion));
  camara.lookAt(0, 0, 0);
  camara.updateMatrixWorld();
  camara.updateProjectionMatrix();

  /* Un grupo pegado a la cámara: lo que hace el `useFrame` de Barra, Baraja y ManoDelMazo. */
  const pegadoALaCamara = (nombre: string, renderOrder: number | null): THREE.Group => {
    const g = grupo(nombre, renderOrder);
    g.position.copy(camara.position);
    g.quaternion.copy(camara.quaternion);
    return g;
  };

  const escena = new THREE.Scene();
  const raiz = grupo('raíz de Delta', null);
  escena.add(raiz);

  /* ── El mundo: el suelo y una señal con su anillo y su asa ── */
  const suelo = malla('mundo:suelo', new THREE.PlaneGeometry(ALCANCE_DEL_DELTA * 2, ALCANCE_DEL_DELTA * 2), opaco());
  suelo.rotateX(-Math.PI / 2);
  raiz.add(suelo);
  const senal = grupo('Senal', null, [10, 0, 10]);
  senal.add(malla('mundo:asa de la señal', new THREE.CylinderGeometry(RADIO_DE_TESELA, RADIO_DE_TESELA, ALTO_DEL_ANILLO * 1.6, 8), invisible(), 0, [0, ALTO_DEL_ANILLO * 0.6, 0]));
  senal.add(malla('mundo:anillo de la señal', new THREE.RingGeometry(1, 2, 8), transparente(), 2, [0, ALTO_DEL_ANILLO, 0]));
  raiz.add(senal);

  /* ── La mano de bienes: áreas y cartas, en sus grupos ── */
  const baraja = pegadoALaCamara('Baraja', ORDEN_DE_LAS_CARTAS);
  for (const [i, h] of areasDeTrueque(2, campo, proporcion).entries()) {
    const area = grupo(`AreaDeTrueque ${String(i)}`, ORDEN_DE_LAS_AREAS, [h.x, h.y, h.z]);
    area.add(malla(`baraja:área ${String(i)} cuerpo`, cuadrito(), transparenteSinProfundidad(), ORDEN_DE_LAS_AREAS + 1));
    area.add(malla(`baraja:área ${String(i)} borde`, cuadrito(), transparenteSinProfundidad(), ORDEN_DE_LAS_AREAS, [0, 0, -0.002]));
    area.add(malla(`baraja:área ${String(i)} icono`, cuadrito(), basicoSinProfundidad(), ORDEN_DE_LAS_AREAS + 2, [0, 0, 0.01]));
    baraja.add(area);
  }
  const mano = ['limo', 'junco', 'sal', 'piedra', 'grano'].map((bien, i) => ({ id: `b${String(i)}`, bien }));
  const quietas = huecosDeLaBaraja(mano, campo, proporcion, null);
  const apunta = quietas[1]?.hueco.y ?? null;
  for (const [i, colocada] of huecosDeLaBaraja(mano, campo, proporcion, apunta).entries()) {
    const h = colocada.hueco;
    const cogida = i === 1;
    const base = ORDEN_DE_LAS_CARTAS + h.orden + Math.round(h.iman * 300) + (cogida ? 600 : 0);
    const carta = grupo(`Carta ${String(i)}${cogida ? ' cogida' : ''}`, ORDEN_DE_LAS_CARTAS, [h.x, h.y, h.z]);
    carta.add(malla(`baraja:carta ${String(i)} borde`, cuadrito(), basicoSinProfundidad(), base, [0, 0, -0.002]));
    carta.add(malla(`baraja:carta ${String(i)} cuerpo`, cuadrito(), basicoSinProfundidad(), base + 1));
    carta.add(malla(`baraja:carta ${String(i)} icono`, cuadrito(), basicoSinProfundidad(), base + 2, [0, 0, 0.01]));
    baraja.add(carta);
  }
  raiz.add(baraja);

  /* ── La mano del mazo: casillas y cartas, en sus grupos ── */
  const manoDelMazo = pegadoALaCamara('ManoDelMazo', ORDEN_DE_LAS_CARTAS_DEL_MAZO);
  for (const casilla of casillasDeLaMano(['jugar'], campo, proporcion)) {
    const h = casilla.hueco;
    const g = grupo(`Casilla ${casilla.clase}`, ORDEN_DE_LAS_CASILLAS, [h.x, h.y, h.z]);
    g.add(malla('mazo:casilla cuerpo', cuadrito(), transparenteSinProfundidad(), ORDEN_DE_LAS_CASILLAS + 1));
    g.add(malla('mazo:casilla borde', cuadrito(), transparenteSinProfundidad(), ORDEN_DE_LAS_CASILLAS, [0, 0, -0.002]));
    g.add(malla('mazo:casilla icono', cuadrito(), basicoSinProfundidad(), ORDEN_DE_LAS_CASILLAS + 2, [0, 0, 0.01]));
    manoDelMazo.add(g);
  }
  const cartasDelMazo = [
    { id: 'm0', familia: 'guardia', dibujo: 'guardia', nombre: 'La Guardia', sePuedeJugar: true, sePuedeRevelar: false },
    { id: 'm1', familia: 'titulo', dibujo: 'faro', nombre: 'El Faro', sePuedeJugar: false, sePuedeRevelar: true },
  ];
  for (const [i, colocada] of huecosDeLasCartas(cartasDelMazo, campo, proporcion, null).entries()) {
    const h = colocada.hueco;
    const base = ORDEN_DE_LAS_CARTAS_DEL_MAZO + h.orden;
    const g = grupo(`CartaDelMazoEnLaMano ${String(i)}`, ORDEN_DE_LAS_CARTAS_DEL_MAZO, [h.x, h.y, h.z]);
    g.add(malla(`mazo:carta ${String(i)} borde`, cuadrito(), transparenteSinProfundidad(), base, [0, 0, -0.002]));
    g.add(malla(`mazo:carta ${String(i)} cuerpo`, cuadrito(), transparenteSinProfundidad(), base + 1));
    g.add(malla(`mazo:carta ${String(i)} icono`, cuadrito(), transparenteSinProfundidad(), base + 2, [0, 0, 0.01]));
    manoDelMazo.add(g);
  }
  raiz.add(manoDelMazo);

  /* ── La mesa: tapa, sombras, tapete, tres piezas, el mazo y los dados con su asa ── */
  const barra = pegadoALaCamara('Barra', ORDEN_DE_LA_BARRA);
  /*
   * La rama CON dados de `Barra` (la llave `dados !== null`, §4.4): `.piezas` para las
   * piezas y `.dados` para el asa, el tapete y los dos cubos, colgado o quinto. En los
   * lienzos sin sitio (320×360, 360×490) `dados` es `null` y `.piezas` es `huecosDeLaBarra`.
   */
  const mesa = huecosDeLaMesa(4, campo, proporcion, lienzo.alto);
  const huecos = mesa.piezas;
  const primero = huecos[0];
  if (primero !== undefined) {
    const tapa = tapaDeLaMesa(primero, campo, proporcion);
    barra.add(
      malla(
        'barra:TAPA',
        geometriaDeLaTapa(segmentosDeLaMesa(lienzo.ancho), FILAS_DE_LA_MESA, tapa.ancho, tapa.fondo),
        new THREE.MeshStandardMaterial({ vertexColors: true }),
        0,
        [0, tapa.cota, tapa.centroZ],
      ),
    );
    const { dados } = mesa;
    const centros = huecos.map((h) => ({ x: h.x, z: h.z, radio: h.lado * RADIO_DE_LA_SOMBRA }));
    if (dados !== null) {
      for (const i of [0, 1] as const) {
        centros.push({ x: dados.x + centroDelDado(i) * dados.lado, z: dados.z, radio: dados.lado * RADIO_DE_LA_SOMBRA_DEL_DADO });
      }
    }
    barra.add(
      malla(
        'barra:SOMBRAS',
        geometriaDeLasSombras(centros),
        new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }),
        0,
        [0, tapa.cota + SOBRE_LA_TAPA, 0],
      ),
    );
    if (dados !== null) {
      barra.add(
        malla(
          'barra:TAPETE',
          geometriaDelTapete(dados.ancho, dados.lado * FONDO_DEL_TAPETE),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false }),
          0,
          [dados.x, tapa.cota + SOBRE_LA_TAPA, dados.z],
        ),
      );
      /* El grupo de los dados con su asa única, y dentro un grupo por cubo, como en `Dados`. */
      const grupoDeLosDados = grupo('Dados', ORDEN_DE_LA_BARRA, [dados.x, dados.y, dados.z]);
      grupoDeLosDados.add(malla('barra:asa de los dados', new THREE.BoxGeometry(dados.ancho, dados.alto, dados.lado * 0.8), invisible()));
      const arista = ARISTA_DEL_DADO * dados.lado;
      const reposoY = tapa.cota - dados.y + CENTRO_DEL_DADO_SOBRE_LA_TAPA * dados.lado;
      for (const i of [0, 1] as const) {
        const cubo = grupo(`dado ${String(i)} ref={cubos}`, ORDEN_DE_LA_BARRA, [centroDelDado(i) * dados.lado, reposoY, 0]);
        cubo.add(malla(`barra:DADO ${String(i)}`, new THREE.BoxGeometry(arista, arista, arista), opaco()));
        grupoDeLosDados.add(cubo);
      }
      barra.add(grupoDeLosDados);
    }
  }
  for (const [i, h] of huecos.entries()) {
    const esElMazo = i === huecos.length - 1;
    const exterior = grupo(esElMazo ? 'MazoEnLaBarra' : `PiezaEnLaBarra ${String(i)}`, ORDEN_DE_LA_BARRA, [h.x, h.y, h.z]);
    exterior.add(malla(`barra:asa ${String(i)}`, new THREE.BoxGeometry(h.lado, h.lado, h.lado * 0.8), invisible()));
    exterior.add(
      malla(
        `barra:zócalo ${String(i)}`,
        new THREE.CylinderGeometry(h.lado * 0.46, h.lado * ZOCALO.radio, h.lado * ZOCALO.alto, 6),
        transparenteEstandar(),
        0,
        [0, -h.lado * ZOCALO.centro, 0],
      ),
    );
    /* El grupo interior, el del `ref={grupo}`: el más cercano a las mallas, el que el pintor mira. */
    const interior = grupo('interior ref={grupo}', ORDEN_DE_LA_BARRA);
    if (esElMazo) {
      interior.add(malla('barra:naipe filo', cuadrito(), transparente(), 0, [0, 0, -0.002]));
      interior.add(malla('barra:naipe cuerpo', cuadrito(), transparente()));
      interior.add(malla('barra:naipe icono', cuadrito(), transparente(), 0, [0, 0, 0.004]));
    } else {
      interior.add(malla(`barra:PIEZA modelo ${String(i)}`, new THREE.BoxGeometry(0.2, 0.2, 0.2), opaco()));
    }
    exterior.add(interior);
    barra.add(exterior);
  }
  raiz.add(barra);

  return { escena, camara };
}

/**
 * EL PINTOR: `projectObject` de `WebGLRenderer` 0.185.1 en lo que toca a `Group` y `Mesh`
 * —el `groupOrder` se reescribe en cada grupo, la `z` sale de la posición proyectada y la
 * poda por frustum decide quién entra—, seguido del `sort` y el `finish` del
 * `WebGLRenderList` real. Después `three` pinta opacos → transmisivos → transparentes.
 */
export function ordenDeDibujo(escena: THREE.Scene, camara: THREE.PerspectiveCamera): OrdenDeDibujoDeLaMesa {
  escena.updateMatrixWorld(true);
  const proyeccion = new THREE.Matrix4().multiplyMatrices(camara.projectionMatrix, camara.matrixWorldInverse);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(proyeccion);
  /* El constructor real no pide nada; la declaración de tipos sí. */
  const Listas = WebGLRenderLists as unknown as new () => InstanceType<typeof WebGLRenderLists>;
  const lista = new Listas().get(escena, 0);
  lista.init();
  const v = new THREE.Vector4();
  const podados: string[] = [];
  const projectObject = (objeto: THREE.Object3D, groupOrder: number): void => {
    if (!objeto.visible) return;
    if ((objeto as THREE.Group).isGroup) groupOrder = objeto.renderOrder;
    else if ((objeto as THREE.Mesh).isMesh) {
      const m = objeto as THREE.Mesh;
      if (!m.frustumCulled || frustum.intersectsObject(m)) {
        v.setFromMatrixPosition(m.matrixWorld).applyMatrix4(proyeccion);
        lista.push(m, m.geometry, m.material as THREE.Material, groupOrder, v.z, null);
      } else podados.push(m.name);
    }
    for (const hijo of objeto.children) projectObject(hijo, groupOrder);
  };
  projectObject(escena, 0);
  /* Sin ordenadores a medida y sin profundidad invertida: lo que hacen los dos clientes. */
  (lista.sort as unknown as (a: null, b: null, invertida: boolean) => void)(null, null, false);
  lista.finish();
  const linea = (pasada: string, r: RenderItem): string =>
    `${pasada} ${r.object.name} [g${String(r.groupOrder)} r${String(r.renderOrder)} z${r.z.toFixed(2)}]`;
  return {
    lineas: [
      ...lista.opaque.map((r) => linea('OPACO', r)),
      ...lista.transmissive.map((r) => linea('TRANSM', r)),
      ...lista.transparent.map((r) => linea('TRANSP', r)),
    ],
    podados,
  };
}

/** El árbol de un lienzo, ya ordenado. */
export function ordenDeDibujoDeLaMesa(lienzo: LienzoDelModelo): OrdenDeDibujoDeLaMesa {
  const { escena, camara } = arbolDeLaMesa(lienzo);
  return ordenDeDibujo(escena, camara);
}

/**
 * EL JUEZ: lo que el orden tiene que cumplir para que la mesa se vea como se decidió.
 *
 *  · La tapa y las piezas (capa de la barra) antes que las cartas de bienes: si no, la
 *    tapa opaca les tapa los pies (§4.1 del diseño).
 *  · Nada de la mesa después de nada de las manos, EN CADA PASADA: opacos con opacos y
 *    transparentes con transparentes, que es como `three` las pinta.
 *  · Las sombras de contacto y el tapete en la pasada de transparentes, después de la tapa
 *    y de las piezas opacas y CON su profundidad: por eso no puede haber borrado entre
 *    medias.
 *  · Todo lo de la mesa en su capa (`g` = `ORDEN_DE_LA_BARRA`), y NADA de la mesa podado
 *    por frustum: lo que no entra en la lista no se pinta ni corre su `onBeforeRender`.
 */
export function fallosDelOrden(orden: OrdenDeDibujoDeLaMesa): string[] {
  const { lineas, podados } = orden;
  const fallos: string[] = [];
  const indice = (fragmento: string): number => lineas.findIndex((l) => l.includes(fragmento));
  const primeroDe = (prefijo: string, pasada: string): number =>
    lineas.findIndex((l) => l.startsWith(pasada) && l.includes(` ${prefijo}`));
  const ultimoDe = (prefijo: string, pasada: string): number =>
    lineas.reduce((ultimo, l, k) => (l.startsWith(pasada) && l.includes(` ${prefijo}`) ? k : ultimo), -1);

  const primeraCarta = primeroDe('baraja:carta', 'OPACO');
  const tapa = indice('barra:TAPA');
  if (tapa < 0) fallos.push('la tapa no está en la lista de dibujo');
  else if (primeraCarta >= 0 && tapa > primeraCarta) fallos.push('la tapa se pinta DESPUÉS de las cartas de bienes: les tapa los pies');
  for (const l of lineas.filter((x) => x.includes('barra:PIEZA'))) {
    if (primeraCarta >= 0 && lineas.indexOf(l) > primeraCarta) fallos.push(`${l.trim()} se pinta después de las cartas de bienes`);
  }
  for (const pasada of ['OPACO', 'TRANSP']) {
    for (const mano of ['baraja:', 'mazo:']) {
      const primeraDeLaMano = primeroDe(mano, pasada);
      if (primeraDeLaMano >= 0 && ultimoDe('barra:', pasada) > primeraDeLaMano) fallos.push(`${pasada}: algo de la mesa se pinta después de algo de ${mano}`);
    }
    const primeraDelMazo = primeroDe('mazo:', pasada);
    if (primeraDelMazo >= 0 && ultimoDe('baraja:', pasada) > primeraDelMazo) fallos.push(`${pasada}: algo de la mano de bienes se pinta después de algo de la mano del mazo`);
  }
  for (const nombre of ['barra:SOMBRAS', 'barra:TAPETE']) {
    const k = indice(nombre);
    if (k >= 0 && !(lineas[k] ?? '').startsWith('TRANSP')) fallos.push(`${nombre} no va en la pasada de transparentes`);
  }
  for (const l of lineas) {
    if (l.includes(' barra:') && !l.includes(`[g${String(ORDEN_DE_LA_BARRA)} `)) fallos.push(`fuera de su capa, se pinta con el mundo: ${l.trim()}`);
  }
  for (const nombre of podados) {
    if (nombre.startsWith('barra:')) fallos.push(`podado por frustum, no se pinta ni corre su onBeforeRender: ${nombre}`);
  }
  return fallos;
}

/* Suelto, imprime la lista del iPhone 14 apaisado y lo que el juez le encuentra. */
if (process.argv[1] !== undefined && /arbol-de-la-mesa\.ts$/.test(process.argv[1])) {
  const orden = ordenDeDibujoDeLaMesa({ ancho: 844, alto: 390 });
  orden.lineas.forEach((l, k) => console.log(`${String(k + 1).padStart(2)}. ${l}`));
  console.log('\nPODADOS POR FRUSTUM:', orden.podados.length > 0 ? orden.podados : 'ninguno');
  const fallos = fallosDelOrden(orden);
  console.log(fallos.length === 0 ? ' → sin fallos' : fallos.map((f) => ` ✗ ${f}`).join('\n'));
}
