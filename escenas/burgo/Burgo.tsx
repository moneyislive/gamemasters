/**
 * EL BURGO EN TRES DIMENSIONES: el tablero que se ve, contra el contrato de `tipos.ts`.
 *
 * ═══ QUÉ MONTA ═══
 *
 * Lo que `docs/burgo/DISENO-2.md` §5 describe: el anillo de cuarenta casillas con sus
 * tres bandas de suelo propio (`anillo-en-3d.ts` da los sitios; aquí sólo se instancia),
 * los edificios de cada solar, las cuatro esquinas, la muralla con sus puertas, la plaza
 * con el Concejo y el suelo de dados, la ronda de árboles, el campo de teselas sembrado
 * con el código de la mesa, tres nubes derivando, la cúpula de mediodía y la niebla. Y
 * encima lo que cambia con la partida: casas y posadas, banderas de dueño, seis peones,
 * UN aventurero (el que mueve), los dos dados, las monedas que vuelan, el naipe de la
 * carta, la marca de la casilla que se puede tocar y la reja de la Mazmorra.
 *
 * ═══ CÓMO SE CUENTAN LAS LLAMADAS, QUE ES LO QUE MANDA (§5.2) ═══
 *
 * Todo lo ESTÁTICO —solares, esquinas, muralla, plaza, ronda, campo— se aplana y se FUNDE
 * en UNA geometría (`fundir` de `embarcadero/cargar.ts`; el `.glb` trae un solo material)
 * y el suelo del anillo es otra geometría propia con `vertexColors`: dos llamadas. Lo que
 * cambia va instanciado: las casas (y las casas de posada) en UNA `InstancedMesh` con
 * `instanceColor` sobre la geometría a gris de `tinte-del-burgo.ts`; los peones, igual;
 * las banderas en una `InstancedMesh` POR COLOR (la bandera tiene mástil: no se puede
 * pintar con `instanceColor`); discos de contacto, monedas, marcas de casilla, discos del
 * trato y asas, una cada uno; el aventurero fundido, uno; los dados, dos; las aspas del
 * molino, una; la reja que sube, una (la fija va en el fundido); el naipe, el cielo y las
 * nubes, cuatro (el agua de la ribera es un cuadro más del suelo propio). Medido en el
 * banco con seis sentados, tablero lleno, siete colores de bandera, el aventurero en pie
 * y el asa de los dados montada: 24 llamadas. Los triángulos los suma
 * `verify:burgo-escena` con el `.glb` real; las llamadas se miran en `banco-burgo.html`
 * con `gl.info.render`.
 *
 * ═══ EL `.glb` VA HORNEADO Y A ESCALA DEL MUNDO ═══
 *
 * `burgo.glb` trae el color por vértice (nada de texturas: Hermes no las decodifica) y
 * la escala de los siete packs ya aplicada (`burgo/piezas.ts`). Por eso aquí NO se usa
 * `matrizDePuesta` de `cargar.ts`, que multiplica por `ESCALA_DEL_PACK`: las puestas se
 * instancian a talla 1 con `matrizDelBurgo`. Una pieza multiplicada por 5,47 sería una
 * silla del tamaño de una iglesia, sin error.
 *
 * ═══ NINGUNA ANIMACIÓN DECIDE NADA ═══
 *
 * La vista que llega por props ES el estado final. Los `sucesos` de cada jugada nueva se
 * encolan en la cola pura de `coreografia.ts` y se reproducen en `useFrame`: cada suceso
 * del peón se le entrega a la máquina de SU asiento (`peon.ts`) cuando la cola dice que
 * arranca, y lo demás (dados, monedas, naipe, reja, banderas, casas) se pinta leyendo
 * `enCurso`. Un toque en el lienzo SALTA la cola: todo a su estado final en el acto. La
 * primera vista que se ve al montar no se anima: es noticia vieja.
 *
 * ═══ UN AVENTURERO EN PIE A LA VEZ (decisión 11) ═══
 *
 * Los seis asientos están SIEMPRE como peón instanciado. El aventurero de KayKit sólo
 * se monta para el asiento en pie, y antes de entregar a un asiento un suceso que lo
 * pone en pie (`mueve`, `a-la-mazmorra`, `sale-de-la-mazmorra`, `quiebra`) se despide
 * al que estuviera (`despedir`, 0,4 s encogiendo) y se ESPERA a que se haya ido. Con dos
 * aventureros el tablero lleno pasaría de los 110.000 triángulos.
 *
 * ═══ SI NO HAY MARIONETA, EL PEÓN SE DESLIZA ═══
 *
 * En calidad `sobria`, o mientras `animaciones.glb` o la figura no han llegado, no se
 * monta ningún aventurero (nunca T-pose, regla del Muelle) y el peón instanciado del
 * asiento en pie ocupa el sitio que `posicionYRumbo` daría al aventurero: se ve deslizar
 * por la polilínea a la misma velocidad.
 *
 * ═══ LOS DADOS: LA VISTA SE ENTREGA CUANDO LA COLA LO DICE ═══
 *
 * La máquina de `dados-del-burgo.ts` recibe la vista de `props.dados`, pero no en cuanto
 * llega: si la cola tiene un `tira` o un `sale` por arrancar, la vista se retiene y se
 * entrega al arrancar ese suceso (con el par del suceso y el sello de la vista), para
 * que los dados rueden cuando toca y no antes que el peón del turno anterior haya
 * terminado de andar. En el sorteo cada `sale` rueda con un sello propio (el de la ronda
 * y el asiento), y la vista de después —sin tirada aún— no vuelve a rodar.
 *
 * ═══ LA CÁMARA ES DEL CLIENTE; AQUÍ SÓLO SE LA EMPUJA ═══
 *
 * Quien monta el `Canvas` pone el ojo en cada fotograma (`CamaraAerea` en el escritorio,
 * `usarMiradorTactil` en la app, con `poseDelBurgo`). «Seguir al que mueve» se hace aquí
 * en un `useFrame` de prioridad 1 —que corre DESPUÉS del del cliente— mezclando la pose
 * que el cliente dejó con una que mira al aventurero a `CERCANIA_DE_SEGUIMIENTO`, con un
 * peso amortiguado que sube al empezar un `mueve` y baja `REPOSO_TRAS_SEGUIR` después
 * del salto. El cliente cancela el seguimiento con `seguirAlQueMueve: false` (lo hace
 * ante cualquier gesto). En `fin`, la misma mezcla lleva la cámara a plomo sobre la plaza.
 * El modo `tercera-persona` de `camara` está RESERVADO: hoy se ignora, a sabiendas.
 *
 * ═══ LOS AVISOS DEL CONTRATO, Y CÓMO SE CUMPLEN AQUÍ ═══
 *
 * `alEstarListo` se llama SIEMPRE y una sola vez: cuando `burgo.glb` y `dados.glb` han
 * llegado O HAN FALLADO se deja pintar un fotograma y en el siguiente se avisa; si
 * `traer` no contesta nunca, un tope de quince segundos avisa igual con cielo y luz.
 * `alFallar` va una vez por fichero. `alMedir` una vez por segundo con la media real de
 * milisegundos (cada fotograma acotado a 100 ms). `alTerminarLaCola` cuando la cola y
 * todas las máquinas de peón han quedado en reposo tras una jugada con sucesos.
 *
 * ═══ LO QUE NO HAY, A PROPÓSITO ═══
 *
 * Ni `drei`, ni `document`, ni `window`, ni `fetch`, ni Expo: sólo `three`, React y el
 * núcleo de r3f. Ni sombras (2048 baja un móvil de 60 a 20 fps): discos de contacto. Ni
 * texto en el lienzo: el nombre, el precio y la carta van a la hoja. Ni `visible=false`
 * para quitar un toque: el asa de los dados se DESMONTA cuando no hay que tirar, y las
 * asas de las casillas sólo se montan si hay quien atienda el toque. Ni `Vector3` en
 * props: ternas. Ni estado escrito tras desmontar: cada promesa mira `vivo`. Ni las
 * partículas de la lluvia de monedas del `fin` (§5.7): queda anotado como pendiente.
 */
import * as React from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LEJANIA, loCogeLaInterfaz, MINIMO_PARA_GIRAR } from '../camara';
import { ORDEN_DE_LAS_CARTAS, ORDEN_DE_LAS_CASILLAS } from '../capas';
import { catalogoDeModelos, MODELO } from '../modelos';
import type { CatalogoDeModelos } from '../modelos';
import { rutaDeLosDados, rutaDelBurgo } from '../ruta-de-modelos';
import {
  ARISTA_DEL_D6_EN_EL_PACK,
  COLOR_DEL_NUMERO,
  COLOR_DEL_PUNTO,
  SACUDIDA,
  anguloRodado,
  avanceDelAsentado,
  giroDelDadoAsentado,
  parQueSeEnsena,
  reboteDelDado,
  sacudida,
  saltoDelDado,
  sucesoDelResultado,
} from '../dados';
import type { ValorDelDado } from '../caras-del-dado';
import { cuaternionDelValor, geometriaDeLosPuntosDelDado, geometriaDelCuerpoDelDado } from '../cubo-del-dado';
import { abrirGlb, aplana, cargadorPara, fundir } from '../embarcadero/cargar';
import type { AventureroCargado, Instanciable, ParteAFundir } from '../embarcadero/cargar';
import { amortiguado } from '../embarcadero/camara';
import { CLIP, figura as datosDeFigura } from '../embarcadero/figuras';
import type { FiguraId } from '../embarcadero/figuras';
import { DURACION } from '../embarcadero/gestos';
import { ATRIBUTO_DE_TINTE_CARGADO } from '../embarcadero/piezas';
import type { Traer } from '../embarcadero/tipos';
import { PIEZA } from './piezas';
import type { NombreDePieza } from './piezas';
import {
  ACERA,
  AGUA_DE_LA_RIBERA,
  ALTURA_DE_LA_ACERA,
  ANCHO_DE_CASILLA,
  ANILLO_DEL_BURGO,
  ARISTA_DE_LOS_DADOS,
  BANDERA_SOBRE_LA_POSADA,
  BORDE_INTERIOR,
  CALLE,
  CASILLAS,
  CONFIN_DE_LAS_NUBES,
  DERIVA_DE_LAS_NUBES,
  EL_CONCEJO,
  HUECOS_DE_LOS_DADOS,
  LADO_INTERIOR,
  LINEA_MEDIA_DE_LA_CALLE,
  MEDIO_LADO,
  RADIO_DEL_ASA_DE_LOS_DADOS,
  SOLAR,
  SUBIDA_DE_LA_REJA,
  SUELO_DE_DADOS,
  campo,
  huecoDeBandera,
  huecoDeCasa,
  huecoDePeon,
  huecoDePosada,
  marcoDeCasilla,
  mundoEstatico,
  puestaDeLaReja,
  puestaDelAgua,
  puestasDeLasEsquinas,
  puntoEnCasilla,
  puntoEnEsquina,
  semillaDelCampo,
} from './anillo-en-3d';
import type { AnilloEn3D, Punto, Puesta } from './anillo-en-3d';
import { CASAS_DEL_CONCEJO, DISCOS_DEL_TRATO, DISCOS_DE_CONTACTO, MONEDAS_EN_VUELO, POSADAS_DEL_CONCEJO, SEGMENTOS_DEL_CIELO, SEGMENTOS_DEL_DISCO, TITULOS } from './presupuesto';
import {
  HUNDIR_CASAS,
  LUMINANCIA_EMPENADA,
  POR_CASA,
  alzadoDeLaReja,
  arcoDeMoneda,
  avanzarLaCola,
  backOut,
  caidaConRebote,
  caidaDelPeonDelSorteo,
  colaVacia,
  encolar as encolarEnLaCola,
  enCurso,
  escalaDelNaipe,
  hundirse,
  mediaAsta,
  monedasDe,
  parpadeo,
  progresoDeLaMoneda,
  saltar as saltarLaColaDeSucesos,
  terminada as colaTerminada,
} from './coreografia';
import type { ColaDeSucesos, SucesoProgramado } from './coreografia';
import { PASO_DE_LA_REJA, avanzar, despedir, encolar as encolarAlPeon, esSucesoDelPeon, nacer, posicionDelPeon, posicionYRumbo, saltarLaCola, terminada as peonTerminado } from './peon';
import type { EstadoDelPeon } from './peon';
import { dadosDelBurgoEnReposo, faseDeLosDadosConPar, saltoDelDoble } from './dados-del-burgo';
import type { EstadoDeLosDadosDelBurgo, SucesoDeLosDadosDelBurgo, VistaDeLosDadosDelBurgo } from './dados-del-burgo';
import { ALCANCE_DEL_BURGO, ALTURA_MINIMA_DEL_OJO_DEL_BURGO, AMORTIGUACION_DEL_SEGUIMIENTO, CERCANIA_DE_SEGUIMIENTO, REPOSO_TRAS_SEGUIR } from './camara-del-burgo';
import { AMBAR_DEL_CONCEJO, coloresDeLasBanderas, geometriaParaInstanciar, geometriaTenidaDe, soltarTintesDeGeometrias } from './tinte-del-burgo';
import { Aventurero } from './Aventurero';
import type { CasillaEn3D, FiguraEn3D, PropsDelBurgo } from './tipos';
import type { SucesoDelBurgo } from '../../shared/arcade/juegos/burgo';

/* ─────────────────────────────── Constantes ─────────────────────────────── */

/** Cuánto se espera a `traer` antes de levantar el telón con lo que haya. */
const TOPE_DE_ARRANQUE_MS = 15_000;
/** El mediodía: azul en el cénit, crema en el horizonte, y la niebla del color del horizonte. */
const COLOR_DEL_CENIT = '#6fa9dc';
const COLOR_DEL_HORIZONTE = '#e9e0c8';
const COLOR_DE_LA_NIEBLA = '#d6dfe4';
/** La cúpula, más cerca que el plano lejano de los dos clientes (alcance × 8). */
const RADIO_DEL_CIELO = ALCANCE_DEL_BURGO * 6;
/** La niebla lineal: de dos a cuatro alcances (§5.6). */
const NIEBLA = { cerca: ALCANCE_DEL_BURGO * 2, lejos: ALCANCE_DEL_BURGO * 4 } as const;
/** Las luces de mediodía: sin sombras en ningún cliente. */
const LUZ = { hemisferio: { cielo: '#d8e8ff', suelo: '#8a7a5a', intensidad: 0.85 }, sol: { rumbo: [1, 2, 1.2] as const, color: '#fff3dd', intensidad: 1.7 } } as const;
/** Los colores del suelo propio. */
const COLOR_DE_LA_CALLE = '#b5a88f';
const COLOR_DEL_SOLAR = '#8db264';
const COLOR_DE_LA_ESQUINA = '#c9bda2';
const COLOR_DE_LA_ACERA_SIN_BARRIO = '#d7cbb0';
const COLOR_DEL_INTERIOR = '#95b56c';
const COLOR_DE_LA_TIERRA = '#7a9b55';
/** Cuánto mide de lado la tierra bajo el campo. */
const LADO_DE_LA_TIERRA = CONFIN_DE_LAS_NUBES * 3;
/** El acento con el que se enciende la casilla tocable, y el blanco de la destacada. */
const COLOR_DEL_ACENTO = '#f2b134';
const COLOR_DE_LA_DESTACADA = '#fff6dc';
/** Los colores del naipe por mazo (§5.5). */
const COLOR_DEL_NAIPE = { pregon: '#c9a227', arca: '#3f9a5a' } as const;
/** El naipe mide 3 × 4,2 y ocupa el 28 % del alto del lienzo, arriba. */
const NAIPE = { ancho: 3, alto: 4.2, parteDelAlto: 0.28, margenArriba: 0.05 } as const;
/** El radio de la marca de casilla: un anillo plano que cabe en la calle. */
const MARCA = { interior: 2.2, exterior: 3.0, alza: 0.06 } as const;
/** Lo que mide la moneda en vuelo (la pieza mide 2,64 de diámetro: se instancia a esto). */
const TALLA_DE_LA_MONEDA = 0.45;
/** El disco de contacto de un peón. */
const RADIO_DEL_DISCO_DEL_PEON = 0.7;
/** Los discos del trato: doce de 0,5 en línea entre los dos peones. */
const LADO_DEL_DISCO_DEL_TRATO = 0.5;
const COLOR_DEL_TRATO = '#f2e8cf';
/** Las aspas del molino, radianes por segundo. */
const GIRO_DE_LAS_ASPAS = 0.9;
/** Desde qué altura caen los peones en el sorteo. */
const CAIDA_DEL_SORTEO = 4;
/** El asa de los dados: un cilindro invisible de radio 5 y este alto. */
const ALTO_DEL_ASA_DE_LOS_DADOS = 6;
/** El asa de una casilla: un plano invisible de su tamaño, un pelo sobre el suelo. */
const ALZA_DEL_ASA = 0.4;
/** Cuánto pesa la mezcla hacia la pose de `fin`: a plomo sobre la plaza, a este alto. */
const ALTURA_DEL_FIN = ALCANCE_DEL_BURGO * 1.35;
/** El amortiguado con el que la marca destacada se desliza al siguiente. */
const AMORTIGUACION_DE_LA_MARCA = 8;
/** Capacidades de las mallas instanciadas: un tablero lleno y una casa de más que se hunde. */
const CAPACIDAD = {
  casas: CASAS_DEL_CONCEJO + POSADAS_DEL_CONCEJO + 2,
  banderas: TITULOS + POSADAS_DEL_CONCEJO + 1,
  peones: 6,
  discos: DISCOS_DE_CONTACTO,
  monedas: MONEDAS_EN_VUELO,
  marcas: CASILLAS + 1,
  trato: DISCOS_DEL_TRATO,
} as const;

const EJE_Y = new THREE.Vector3(0, 1, 0);
const EJE_Z = new THREE.Vector3(0, 0, 1);
const auxPosicion = new THREE.Vector3();
const auxGiro = new THREE.Quaternion();
const auxGiro2 = new THREE.Quaternion();
const auxEuler = new THREE.Euler();
const auxEscala = new THREE.Vector3();
const auxMatriz = new THREE.Matrix4();
const auxColor = new THREE.Color();
const auxVector = new THREE.Vector3();
const auxVector2 = new THREE.Vector3();
const auxRayo = new THREE.Ray();
const PLANO_DEL_SUELO = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const NADA = new THREE.Matrix4().makeScale(0, 0, 0);

const pinza = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/** La matriz de una puesta del Burgo: SIN `ESCALA_DEL_PACK`, que ya va horneada (ver la cabecera). */
function matrizDelBurgo(x: number, y: number, z: number, giro: number, talla: number, destino = new THREE.Matrix4()): THREE.Matrix4 {
  return destino.compose(auxPosicion.set(x, y, z), auxGiro.setFromAxisAngle(EJE_Y, giro), auxEscala.set(talla, talla, talla));
}

/** ¿Es el botón derecho o el del medio? Ésos son de la cámara. Copia de `delta.tsx`. */
function noEsElPrimario(e: { nativeEvent: { button?: number } }): boolean {
  const boton = e.nativeEvent.button;
  return boton !== undefined && boton !== 0;
}

/* ─────────────────────────── La carga, con caché por `traer` ─────────────────────────── */

const catalogosDelBurgo = new WeakMap<Traer, Promise<CatalogoDeModelos>>();
const catalogosDeLosDados = new WeakMap<Traer, Promise<CatalogoDeModelos | null>>();

/** El catálogo de `burgo.glb`, una vez por función `traer`; el fallo no se queda en la caché. */
function catalogoDelBurgoDe(traer: Traer): Promise<CatalogoDeModelos> {
  const hecho = catalogosDelBurgo.get(traer);
  if (hecho !== undefined) return hecho;
  const promesa = traer(rutaDelBurgo())
    .then((bytes) => abrirGlb(bytes))
    .then((gltf) => catalogoDeModelos(gltf.scene))
    .catch((fallo: unknown) => {
      catalogosDelBurgo.delete(traer);
      throw fallo instanceof Error ? fallo : new Error(String(fallo));
    });
  catalogosDelBurgo.set(traer, promesa);
  return promesa;
}

/** El catálogo de `dados.glb`, o `null` si no llega: entonces se pinta el respaldo. */
function catalogoDeLosDadosDe(traer: Traer, alFallar: (motivo: string) => void): Promise<CatalogoDeModelos | null> {
  const hecho = catalogosDeLosDados.get(traer);
  if (hecho !== undefined) return hecho;
  const promesa = traer(rutaDeLosDados())
    .then((bytes) => abrirGlb(bytes))
    .then((gltf) => catalogoDeModelos(gltf.scene))
    .catch((fallo: unknown): null => {
      catalogosDeLosDados.delete(traer);
      alFallar(`no han llegado los dados (${rutaDeLosDados()}): ${fallo instanceof Error ? fallo.message : String(fallo)}`);
      return null;
    });
  catalogosDeLosDados.set(traer, promesa);
  return promesa;
}

/* ─────────────────────────────── El mundo fijo ─────────────────────────────── */

interface Aspas {
  readonly matrizDelMolino: THREE.Matrix4;
  readonly posicion: readonly [number, number, number];
  readonly giro: THREE.Quaternion;
  readonly geometria: THREE.BufferGeometry;
  readonly material: THREE.Material;
}

interface PiezaSuelta {
  readonly geometria: THREE.BufferGeometry;
  readonly material: THREE.Material;
  readonly puesta: Puesta;
}

interface Nubes {
  readonly geometria: THREE.BufferGeometry;
  readonly material: THREE.Material;
  readonly puestas: readonly Puesta[];
}

interface Mundo {
  readonly fundido: { readonly geometria: THREE.BufferGeometry; readonly material: THREE.Material } | null;
  readonly material: THREE.Material | null;
  readonly aspas: Aspas | null;
  /** La reja que sube y baja, suelta; la fija va en el fundido. */
  readonly reja: PiezaSuelta | null;
  readonly nubes: readonly Nubes[];
  /** Las geometrías de las piezas dinámicas, ya en una sola por pieza. */
  readonly casa: THREE.BufferGeometry | null;
  readonly peon: THREE.BufferGeometry | null;
  readonly bandera: THREE.BufferGeometry | null;
  readonly moneda: THREE.BufferGeometry | null;
  readonly soltar: () => void;
}

/**
 * LAS PARTES DE UNA PIEZA EN UNA SOLA GEOMETRÍA, conservando la máscara de tinte.
 * `fundir` de `cargar.ts` la tira al normalizar (sólo posición, normal y color), y las
 * piezas que se instancian teñidas la necesitan. Si la pieza es una sola malla, se
 * devuelve tal cual.
 */
function unaGeometria(partes: readonly Instanciable[]): THREE.BufferGeometry | null {
  const primera = partes[0];
  if (primera === undefined) return null;
  if (partes.length === 1) return primera.geometria;
  const conMascara = partes.every((p) => p.geometria.getAttribute(ATRIBUTO_DE_TINTE_CARGADO) !== undefined);
  const listas = partes.map((p) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', p.geometria.getAttribute('position').clone());
    if (p.geometria.getAttribute('normal') === undefined) p.geometria.computeVertexNormals();
    g.setAttribute('normal', p.geometria.getAttribute('normal').clone());
    const color = p.geometria.getAttribute('color');
    const n = p.geometria.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      c[i * 3] = color === undefined ? 1 : color.getX(i);
      c[i * 3 + 1] = color === undefined ? 1 : color.getY(i);
      c[i * 3 + 2] = color === undefined ? 1 : color.getZ(i);
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    if (conMascara) g.setAttribute(ATRIBUTO_DE_TINTE_CARGADO, p.geometria.getAttribute(ATRIBUTO_DE_TINTE_CARGADO).clone());
    const idx = p.geometria.getIndex();
    if (idx !== null) g.setIndex(idx.clone());
    return g;
  });
  const fundida = mergeGeometries(listas, false) as THREE.BufferGeometry | null;
  for (const g of listas) g.dispose();
  return fundida;
}

/**
 * CONSTRUYE EL MUNDO FIJO de una mesa con el catálogo: lo fundido, lo suelto que se
 * anima (aspas, reja), las nubes y las geometrías de lo que se instancia. Devuelve cómo
 * soltarlo: todas las geometrías de aquí son copias nuestras (`aplana` clona).
 */
function construirMundo(catalogo: CatalogoDeModelos, semilla: number, calidad: 'plena' | 'sobria'): Mundo {
  const propias: THREE.BufferGeometry[] = [];
  const porPieza = new Map<string, Instanciable[]>();
  const partesDe = (nombre: string): Instanciable[] => {
    const hechas = porPieza.get(nombre);
    if (hechas !== undefined) return hechas;
    const nodo = catalogo.get(nombre);
    const partes = nodo === undefined ? [] : aplana(nodo);
    for (const p of partes) propias.push(p.geometria);
    porPieza.set(nombre, partes);
    return partes;
  };

  /* El molino: las aspas fuera, el cuerpo al fundido. */
  let aspas: Aspas | null = null;
  const molino = catalogo.get(PIEZA.molino);
  if (molino !== undefined) {
    const copia = molino.clone(true);
    copia.updateWorldMatrix(true, true);
    let ventilador: THREE.Mesh | null = null;
    copia.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh && m.name.includes('fan')) ventilador = m;
    });
    if (ventilador !== null) {
      const v = ventilador as THREE.Mesh;
      const relativa = new THREE.Matrix4().copy(copia.matrixWorld).invert().multiply(v.matrixWorld);
      const posicion = new THREE.Vector3();
      const giro = new THREE.Quaternion();
      relativa.decompose(posicion, giro, new THREE.Vector3());
      aspas = {
        matrizDelMolino: new THREE.Matrix4(),
        posicion: [posicion.x, posicion.y, posicion.z],
        giro,
        geometria: v.geometry,
        material: Array.isArray(v.material) ? (v.material[0] as THREE.Material) : v.material,
      };
      v.removeFromParent();
    }
    const cuerpo = aplana(copia);
    for (const c of cuerpo) propias.push(c.geometria);
    porPieza.set(PIEZA.molino, cuerpo);
  }

  /*
   * Todo lo estático, en una sola geometría. La reja FIJA de la Mazmorra entra también
   * (`mundoEstatico` deja fuera las dos por si acaso; sólo una se anima): así son 24
   * llamadas y no 25, medido en el banco.
   */
  const aFundir: ParteAFundir[] = [];
  let material: THREE.Material | null = null;
  const laQueSube = puestaDeLaReja();
  const rejaFijaPuesta = puestasDesLasRejas().find((p) => !(Math.abs(p.x - laQueSube.x) < 1e-6 && Math.abs(p.z - laQueSube.z) < 1e-6)) ?? null;
  for (const p of [...mundoEstatico(semilla, calidad), ...(rejaFijaPuesta === null ? [] : [rejaFijaPuesta])]) {
    const matriz = matrizDelBurgo(p.x, p.y, p.z, p.giro, p.talla);
    if (p.pieza === PIEZA.molino && aspas !== null) aspas.matrizDelMolino.copy(matriz);
    for (const parte of partesDe(p.pieza)) {
      /* Los estandartes de la Puerta Mayor van teñidos del ámbar del Concejo (§5.1). */
      const geometria = p.pieza === PIEZA.estandarte ? geometriaTenidaDe(PIEZA.estandarte, parte.geometria, AMBAR_DEL_CONCEJO) : parte.geometria;
      aFundir.push({ geometria, matriz });
      material ??= parte.material;
    }
  }
  const geometriaFundida = fundir(aFundir);
  if (geometriaFundida !== null) propias.push(geometriaFundida);
  const fundido = geometriaFundida === null || material === null ? null : { geometria: geometriaFundida, material };

  /* La reja que sube y baja, suelta. */
  let reja: PiezaSuelta | null = null;
  const geometriaDeLaReja = unaGeometria(partesDe(PIEZA.muroReja));
  if (geometriaDeLaReja !== null) {
    if (geometriaDeLaReja !== partesDe(PIEZA.muroReja)[0]?.geometria) propias.push(geometriaDeLaReja);
    const materialDeLaReja = partesDe(PIEZA.muroReja)[0]?.material ?? material;
    reja = { geometria: geometriaDeLaReja, material: materialDeLaReja as THREE.Material, puesta: laQueSube };
  }

  /* Las nubes, instanciadas por pieza, sólo en plena. */
  const nubes: Nubes[] = [];
  if (calidad === 'plena') {
    const porNube = new Map<NombreDePieza, Puesta[]>();
    for (const n of campo(semilla).nubes) porNube.set(n.pieza, [...(porNube.get(n.pieza) ?? []), n]);
    for (const [pieza, puestas] of porNube) {
      const g = unaGeometria(partesDe(pieza));
      const m = partesDe(pieza)[0]?.material;
      if (g === null || m === undefined) continue;
      if (g !== partesDe(pieza)[0]?.geometria) propias.push(g);
      nubes.push({ geometria: g, material: m, puestas });
    }
  }

  /* Las piezas que se instancian por la partida: casa y peón a gris, bandera y moneda tal cual. */
  const dinamica = (pieza: NombreDePieza, aGris: boolean): THREE.BufferGeometry | null => {
    const g = unaGeometria(partesDe(pieza));
    if (g === null) return null;
    if (g !== partesDe(pieza)[0]?.geometria) propias.push(g);
    return aGris ? geometriaParaInstanciar(pieza, g) : g;
  };

  return {
    fundido,
    material,
    aspas,
    reja,
    nubes,
    casa: dinamica(PIEZA.casa, true),
    peon: dinamica(PIEZA.peon, true),
    bandera: dinamica(PIEZA.bandera, false),
    moneda: dinamica(PIEZA.moneda, false),
    soltar: () => {
      soltarTintesDeGeometrias(propias);
      for (const g of propias) g.dispose();
    },
  };
}

/** Las dos puestas de `muro-reja` de la Mazmorra, en el mundo. */
function puestasDesLasRejas(): Puesta[] {
  return puestasDeLasEsquinas().filter((p) => p.pieza === PIEZA.muroReja);
}

/* ─────────────────────────────── El suelo propio ─────────────────────────────── */

interface Suelo {
  readonly geometria: THREE.BufferGeometry;
  /** Por casilla lateral, el tramo de vértices de su acera (desde, hasta) para repintarla. */
  readonly aceras: ReadonlyMap<number, { readonly desde: number; readonly hasta: number }>;
}

/**
 * EL SUELO DEL ANILLO, geometría propia con color por vértice: por casilla lateral, las
 * tres bandas (la acera alzada 0,15 con sus dos cantos), las cuatro esquinas, el suelo de
 * dados de la plaza, el suelo de la ciudad interior y la tierra bajo el campo. El color
 * de la acera es el del barrio y se REESCRIBE por vértice cuando cambia la vista o se
 * empeña (nunca con opacidad). Las cuentas están en `presupuesto.ts` (`triangulosDelSuelo`).
 */
function construirSuelo(): Suelo {
  const posiciones: number[] = [];
  const colores: number[] = [];
  const normales: number[] = [];
  const aceras = new Map<number, { desde: number; hasta: number }>();
  let vertices = 0;
  const color = new THREE.Color();
  const cuadro = (a: readonly number[], b: readonly number[], c: readonly number[], d: readonly number[], hex: string, normal: readonly number[]): void => {
    color.set(hex);
    /*
     * EL SENTIDO DE GIRO SE DERIVA DE LA NORMAL PEDIDA, no se supone: la primera versión
     * escribía los cuatro puntos en un orden fijo y en las casillas laterales la cara
     * salía mirando hacia ABAJO (el producto vectorial daba −y), así que la calle y el
     * solar se pintaban a oscuras —iluminados por el suelo del hemisferio— sin error.
     */
    const ux = (b[0] as number) - (a[0] as number);
    const uy = (b[1] as number) - (a[1] as number);
    const uz = (b[2] as number) - (a[2] as number);
    const vx = (c[0] as number) - (a[0] as number);
    const vy = (c[1] as number) - (a[1] as number);
    const vz = (c[2] as number) - (a[2] as number);
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const alDerecho = nx * (normal[0] as number) + ny * (normal[1] as number) + nz * (normal[2] as number) >= 0;
    for (const v of alDerecho ? [a, b, c, c, d, a] : [a, d, c, c, b, a]) {
      posiciones.push(v[0] as number, v[1] as number, v[2] as number);
      colores.push(color.r, color.g, color.b);
      normales.push(normal[0] as number, normal[1] as number, normal[2] as number);
      vertices++;
    }
  };
  const medio = ANCHO_DE_CASILLA / 2;
  for (let i = 0; i < CASILLAS; i++) {
    const m = marcoDeCasilla(i);
    if (m.esEsquina) {
      const e = (u: number, v: number): number[] => {
        const p = puntoEnEsquina(m, u, v);
        return [p.x, 0, p.z];
      };
      cuadro(e(BORDE_INTERIOR, BORDE_INTERIOR), e(MEDIO_LADO, BORDE_INTERIOR), e(MEDIO_LADO, MEDIO_LADO), e(BORDE_INTERIOR, MEDIO_LADO), COLOR_DE_LA_ESQUINA, [0, 1, 0]);
      continue;
    }
    const p = (radial: number, aLoLargo: number, y: number): number[] => {
      const q = puntoEnCasilla(m, radial, aLoLargo);
      return [q.x, y, q.z];
    };
    const desde = vertices;
    /* La acera: la tapa alzada y los dos cantos. */
    cuadro(p(ACERA.desde, -medio, ALTURA_DE_LA_ACERA), p(ACERA.hasta, -medio, ALTURA_DE_LA_ACERA), p(ACERA.hasta, medio, ALTURA_DE_LA_ACERA), p(ACERA.desde, medio, ALTURA_DE_LA_ACERA), COLOR_DE_LA_ACERA_SIN_BARRIO, [0, 1, 0]);
    cuadro(p(ACERA.desde, -medio, 0), p(ACERA.desde, -medio, ALTURA_DE_LA_ACERA), p(ACERA.desde, medio, ALTURA_DE_LA_ACERA), p(ACERA.desde, medio, 0), COLOR_DE_LA_ACERA_SIN_BARRIO, [-m.fuera.x, 0, -m.fuera.z]);
    cuadro(p(ACERA.hasta, -medio, ALTURA_DE_LA_ACERA), p(ACERA.hasta, -medio, 0), p(ACERA.hasta, medio, 0), p(ACERA.hasta, medio, ALTURA_DE_LA_ACERA), COLOR_DE_LA_ACERA_SIN_BARRIO, [m.fuera.x, 0, m.fuera.z]);
    aceras.set(i, { desde, hasta: vertices });
    cuadro(p(CALLE.desde, -medio, 0), p(CALLE.hasta, -medio, 0), p(CALLE.hasta, medio, 0), p(CALLE.desde, medio, 0), COLOR_DE_LA_CALLE, [0, 1, 0]);
    cuadro(p(SOLAR.desde, -medio, 0), p(SOLAR.hasta, -medio, 0), p(SOLAR.hasta, medio, 0), p(SOLAR.desde, medio, 0), COLOR_DEL_SOLAR, [0, 1, 0]);
  }
  /* El agua de la ribera, detrás del muelle: un cuadro más de este suelo, y no una malla (una llamada menos). */
  {
    const agua = puestaDelAgua();
    const c = Math.cos(agua.giro);
    const s = Math.sin(agua.giro);
    const w = AGUA_DE_LA_RIBERA.ancho / 2;
    const f = AGUA_DE_LA_RIBERA.fondo / 2;
    const q = (u: number, v: number): number[] => [agua.x + u * c + v * s, AGUA_DE_LA_RIBERA.y, agua.z - u * s + v * c];
    cuadro(q(-w, -f), q(w, -f), q(w, f), q(-w, f), AGUA_DE_LA_RIBERA.color, [0, 1, 0]);
  }
  /* El suelo de dados, el de la ciudad interior y la tierra bajo el campo. */
  const d = SUELO_DE_DADOS.lado / 2;
  cuadro([-d, SUELO_DE_DADOS.y, -d], [-d, SUELO_DE_DADOS.y, d], [d, SUELO_DE_DADOS.y, d], [d, SUELO_DE_DADOS.y, -d], SUELO_DE_DADOS.color, [0, 1, 0]);
  const h = LADO_INTERIOR / 2;
  cuadro([-h, 0, -h], [-h, 0, h], [h, 0, h], [h, 0, -h], COLOR_DEL_INTERIOR, [0, 1, 0]);
  const t = LADO_DE_LA_TIERRA / 2;
  cuadro([-t, -0.03, -t], [-t, -0.03, t], [t, -0.03, t], [t, -0.03, -t], COLOR_DE_LA_TIERRA, [0, 1, 0]);

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posiciones), 3));
  geometria.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colores), 3));
  geometria.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normales), 3));
  geometria.computeBoundingSphere();
  return { geometria, aceras };
}

/** Pinta la acera de una casilla con su color, apagado al tanto que se diga (1 = entera). */
function pintaLaAcera(suelo: Suelo, casilla: CasillaEn3D, luminancia: number): void {
  const tramo = suelo.aceras.get(casilla.indice);
  if (tramo === undefined) return;
  const color = suelo.geometria.getAttribute('color') as THREE.BufferAttribute;
  auxColor.set(casilla.colorDelBarrio ?? COLOR_DE_LA_ACERA_SIN_BARRIO).multiplyScalar(luminancia);
  for (let i = tramo.desde; i < tramo.hasta; i++) color.setXYZ(i, auxColor.r, auxColor.g, auxColor.b);
  color.needsUpdate = true;
}

/* ─────────────────────────────── El cielo ─────────────────────────────── */

/** La cúpula con degradado por vértice: azul arriba, crema en el horizonte. Sin sombreador con tiempo. */
function geometriaDelCielo(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(RADIO_DEL_CIELO, SEGMENTOS_DEL_CIELO.ancho, SEGMENTOS_DEL_CIELO.alto);
  const pos = g.getAttribute('position');
  const colores = new Float32Array(pos.count * 3);
  const cenit = new THREE.Color(COLOR_DEL_CENIT);
  const horizonte = new THREE.Color(COLOR_DEL_HORIZONTE);
  for (let i = 0; i < pos.count; i++) {
    const u = pinza(pos.getY(i) / RADIO_DEL_CIELO, 0, 1);
    const t = Math.sqrt(u);
    auxColor.copy(horizonte).lerp(cenit, t);
    colores[i * 3] = auxColor.r;
    colores[i * 3 + 1] = auxColor.g;
    colores[i * 3 + 2] = auxColor.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  return g;
}

/* ─────────────────────────────── Ayudas de estado ─────────────────────────────── */

interface Asiento {
  readonly figura: FiguraEn3D;
  readonly indice: number;
}

/** Los sucesos que ponen a un asiento en pie: antes hay que despedir al que estuviera. */
function poneEnPie(s: SucesoDelBurgo): boolean {
  return s.que === 'mueve' || s.que === 'a-la-mazmorra' || s.que === 'sale-de-la-mazmorra' || s.que === 'quiebra';
}

function quienDe(s: SucesoDelBurgo): string | null {
  return 'quien' in s ? s.quien : null;
}

/** El estado de un peón que acaba de nacer con lo que dice la vista: sin animar. */
function nacidoDeLaVista(f: FiguraEn3D, indice: number, semilla: number, ahora: number): EstadoDelPeon {
  const e = nacer(f.casilla, (semilla ^ (indice + 1) * 0x9e37_79b9) >>> 0, ahora, indice);
  return { ...e, fase: f.presa ? 'preso' : 'quieto', presa: f.presa, quebrada: f.quebrada };
}

/** El punto de un peón (o del Concejo si `asiento` es null) para que las monedas sepan de dónde a dónde. */
function puntoDelDinero(asiento: string | null, casilla: number, asientos: readonly Asiento[], peones: ReadonlyMap<string, EstadoDelPeon>): Punto {
  if (asiento === null) return EL_CONCEJO;
  const a = asientos.find((x) => x.figura.asiento === asiento);
  const e = a === undefined ? undefined : peones.get(asiento);
  const donde = e === undefined ? casilla : e.enCasilla;
  return huecoDePeon(donde, a?.indice ?? 0);
}

/** El centro de la calle de una casilla: donde se pone la marca. */
function centroDeLaMarca(casilla: number): Punto {
  const m = marcoDeCasilla(casilla);
  return m.esEsquina ? puntoEnEsquina(m, LINEA_MEDIA_DE_LA_CALLE, MEDIO_LADO - 6.5) : m.centro;
}

/* ─────────────────────────────── La escena entera ─────────────────────────────── */

export function Burgo(props: PropsDelBurgo): JSX.Element {
  const { tablero, dados, sucesos, codigo, traer, calidad, quieto, seguirAlQueMueve } = props;
  const plena = calidad === 'plena';
  const anillo: AnilloEn3D = ANILLO_DEL_BURGO;

  /* Los avisos van por referencia: el hilo de dibujo llama siempre a la versión de este render. */
  const avisos = useRef(props);
  avisos.current = props;
  const vivo = useRef(true);
  useEffect(
    () => () => {
      vivo.current = false;
    },
    [],
  );
  const falla = (motivo: string): void => {
    if (vivo.current) avisos.current.alFallar?.(motivo);
  };

  // -------------------------------------------------------------------------
  // La carga: burgo.glb, dados.glb, las figuras de los sentados y la biblioteca
  // -------------------------------------------------------------------------

  const [catalogo, ponerCatalogo] = useState<CatalogoDeModelos | null>(null);
  const [catalogoDeDados, ponerCatalogoDeDados] = useState<CatalogoDeModelos | null>(null);
  const [arranque, ponerArranque] = useState(false);
  const arranqueRef = useRef(false);
  arranqueRef.current = arranque;

  useEffect(() => {
    const burgo = catalogoDelBurgoDe(traer).then(
      (c) => {
        if (vivo.current) ponerCatalogo(c);
      },
      (fallo: unknown) => {
        falla(`no ha llegado el burgo (${rutaDelBurgo()}): ${fallo instanceof Error ? fallo.message : String(fallo)}`);
      },
    );
    const losDados = catalogoDeLosDadosDe(traer, falla).then((c) => {
      if (vivo.current && c !== null) ponerCatalogoDeDados(c);
    });
    void Promise.all([burgo, losDados]).then(() => {
      if (vivo.current) ponerArranque(true);
    });
    const tope = setTimeout(() => {
      if (!vivo.current || arranqueRef.current) return;
      falla('el burgo no ha contestado en quince segundos');
      ponerArranque(true);
    }, TOPE_DE_ARRANQUE_MS);
    return () => {
      clearTimeout(tope);
    };
  }, [traer]);

  const cargador = useMemo(() => cargadorPara(traer), [traer]);
  const [figuras, ponerFiguras] = useState<ReadonlyMap<FiguraId, AventureroCargado>>(new Map());
  const [biblioteca, ponerBiblioteca] = useState<readonly THREE.AnimationClip[]>([]);
  const pedidas = useRef(new Set<FiguraId>());
  const bibliotecaPedida = useRef(false);
  const figurasQueHacenFalta = useMemo(() => {
    const lista: FiguraId[] = [];
    for (const f of tablero.figuras) if (!lista.includes(f.figura)) lista.push(f.figura);
    return lista;
  }, [tablero.figuras]);

  /* Sólo en plena: en sobria no hay aventurero y no se baja nada. Se precargan TODAS las figuras (memoria, no llamadas). */
  useEffect(() => {
    if (!plena) return;
    const pideBiblioteca = (): void => {
      if (bibliotecaPedida.current) return;
      bibliotecaPedida.current = true;
      cargador.animaciones().then(
        (clips) => {
          if (vivo.current) ponerBiblioteca(clips);
        },
        (fallo: unknown) => {
          falla(`no han llegado las animaciones de los aventureros: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
        },
      );
    };
    for (const id of figurasQueHacenFalta) {
      if (pedidas.current.has(id)) continue;
      pedidas.current.add(id);
      cargador.aventurero(id).then(
        (a) => {
          if (!vivo.current) return;
          ponerFiguras((antes) => {
            const nuevas = new Map(antes);
            nuevas.set(id, a);
            return nuevas;
          });
          pideBiblioteca();
        },
        (fallo: unknown) => {
          falla(`no ha llegado la figura «${datosDeFigura(id).nombre}»: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
          pideBiblioteca();
        },
      );
    }
  }, [cargador, figurasQueHacenFalta, plena]);

  // -------------------------------------------------------------------------
  // El mundo fijo, el suelo, el cielo y los materiales propios
  // -------------------------------------------------------------------------

  const semilla = useMemo(() => semillaDelCampo(codigo), [codigo]);
  const mundo = useMemo(() => (catalogo === null ? null : construirMundo(catalogo, semilla, calidad)), [catalogo, semilla, calidad]);
  useEffect(() => () => mundo?.soltar(), [mundo]);

  const suelo = useMemo(construirSuelo, []);
  useEffect(() => () => suelo.geometria.dispose(), [suelo]);

  const materiales = useMemo(
    () => ({
      suelo: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
      cielo: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false }),
      disco: new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.3, depthWrite: false }),
      marca: new THREE.MeshBasicMaterial({ vertexColors: false, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
      trato: new THREE.MeshBasicMaterial({ color: COLOR_DEL_TRATO, transparent: true, opacity: 0.8, depthWrite: false }),
      naipePregon: new THREE.MeshBasicMaterial({ color: COLOR_DEL_NAIPE.pregon, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
      naipeArca: new THREE.MeshBasicMaterial({ color: COLOR_DEL_NAIPE.arca, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
      asa: new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
      dadoCuerpo: new THREE.MeshStandardMaterial({ color: COLOR_DEL_NUMERO, roughness: 0.6 }),
      dadoPuntos: new THREE.MeshStandardMaterial({ color: COLOR_DEL_PUNTO, roughness: 0.6 }),
    }),
    [],
  );
  const geometrias = useMemo(
    () => ({
      cielo: geometriaDelCielo(),
      disco: new THREE.CircleGeometry(RADIO_DEL_DISCO_DEL_PEON, SEGMENTOS_DEL_DISCO),
      marca: new THREE.RingGeometry(MARCA.interior, MARCA.exterior, SEGMENTOS_DEL_DISCO, 1),
      trato: new THREE.PlaneGeometry(LADO_DEL_DISCO_DEL_TRATO, LADO_DEL_DISCO_DEL_TRATO),
      naipe: new THREE.PlaneGeometry(NAIPE.ancho, NAIPE.alto),
      asaDeCasilla: new THREE.PlaneGeometry(1, 1),
      asaDeDados: new THREE.CylinderGeometry(RADIO_DEL_ASA_DE_LOS_DADOS, RADIO_DEL_ASA_DE_LOS_DADOS, ALTO_DEL_ASA_DE_LOS_DADOS, 12),
      dadoCuerpo: geometriaDelCuerpoDelDado(ARISTA_DE_LOS_DADOS),
      dadoPuntos: geometriaDeLosPuntosDelDado(ARISTA_DE_LOS_DADOS),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const m of Object.values(materiales)) m.dispose();
      for (const g of Object.values(geometrias)) g.dispose();
    },
    [materiales, geometrias],
  );

  /* El dado del pack, aplanado, o nada (entonces el respaldo). */
  const dadoDelPack = useMemo(() => {
    const nodo = catalogoDeDados?.get(MODELO.dado);
    if (nodo === undefined) return null;
    const partes = aplana(nodo);
    const g = unaGeometria(partes);
    const m = partes[0]?.material;
    return g === null || m === undefined ? null : { geometria: g, material: m, partes };
  }, [catalogoDeDados]);
  useEffect(
    () => () => {
      if (dadoDelPack === null) return;
      for (const p of dadoDelPack.partes) p.geometria.dispose();
      if (dadoDelPack.partes.length > 1) dadoDelPack.geometria.dispose();
    },
    [dadoDelPack],
  );

  /* Las banderas: una geometría teñida por color, de la caché de `tinte.ts`. */
  const coloresDeBanderas = useMemo(() => coloresDeLasBanderas(tablero.figuras.map((f) => f.color)), [tablero.figuras]);
  const banderasPorColor = useMemo(
    () => (mundo?.bandera === null || mundo === null ? [] : coloresDeBanderas.map((hex) => ({ hex, geometria: geometriaTenidaDe(PIEZA.bandera, mundo.bandera as THREE.BufferGeometry, hex) }))),
    [mundo, coloresDeBanderas],
  );

  /* Las aceras se repintan cuando cambia la lista de casillas (misma identidad si la firma no cambió). */
  useLayoutEffect(() => {
    for (const c of tablero.casillas) pintaLaAcera(suelo, c, c.empenada ? LUMINANCIA_EMPENADA : 1);
  }, [suelo, tablero.casillas]);

  // -------------------------------------------------------------------------
  // El estado vivo: peones, cola, dados, cámara. Todo en referencias.
  // -------------------------------------------------------------------------

  const asientos = useMemo<Asiento[]>(() => tablero.figuras.map((figura, indice) => ({ figura, indice })), [tablero.figuras]);
  const asientosRef = useRef(asientos);
  asientosRef.current = asientos;
  const casillasRef = useRef(tablero.casillas);
  casillasRef.current = tablero.casillas;

  const peones = useRef(new Map<string, EstadoDelPeon>());
  /** Por asiento, la referencia que lee su `Aventurero`. */
  const refsDePeon = useRef(new Map<string, { current: EstadoDelPeon | null }>());
  const cola = useRef<ColaDeSucesos>(colaVacia(0));
  const alimentados = useRef(new WeakSet<SucesoProgramado>());
  const ultimaJugada = useRef<number | null>(null);
  const colaPendiente = useRef<readonly SucesoDelBurgo[] | null>(null);
  const colaAvisada = useRef(true);
  const cartaCerrada = useRef<SucesoProgramado | null>(null);

  /* La primera vista no se anima; las siguientes se encolan en el hilo de dibujo. */
  useEffect(() => {
    if (ultimaJugada.current === null) {
      ultimaJugada.current = sucesos.jugada;
      return;
    }
    if (sucesos.jugada === ultimaJugada.current) return;
    ultimaJugada.current = sucesos.jugada;
    colaPendiente.current = [...(colaPendiente.current ?? []), ...sucesos.lista];
  }, [sucesos]);

  const maquinaDeDados = useRef<EstadoDeLosDadosDelBurgo>(dadosDelBurgoEnReposo());
  const sucesosDeDados = useRef<SucesoDeLosDadosDelBurgo[]>([]);
  const vistaDeDadosPendiente = useRef<VistaDeLosDadosDelBurgo | null>(null);
  const asentadoEn = useRef(-1);
  const selloDelPar = useRef(0);
  useEffect(() => {
    if (dados === null) return;
    vistaDeDadosPendiente.current = { par: dados.par, tirado: dados.tirado, sello: dados.sello };
  }, [dados]);

  const [enPie, ponerEnPie] = useState<string | null>(null);
  const enPieRef = useRef<string | null>(null);
  const [ganadorEnPlaza, ponerGanadorEnPlaza] = useState(false);

  const seguimiento = useRef({ peso: 0, objetivo: { x: 0, z: 0 }, hastaCuando: -1 });
  const marcaDestacada = useRef<{ x: number; z: number } | null>(null);
  const medida = useRef({ segundos: 0, fotogramas: 0 });
  const fotogramasDesdeElArranque = useRef(0);
  const listoAvisado = useRef(false);

  /* Las mallas instanciadas. */
  const casas = useRef<THREE.InstancedMesh>(null);
  const peonesMalla = useRef<THREE.InstancedMesh>(null);
  const discos = useRef<THREE.InstancedMesh>(null);
  const monedas = useRef<THREE.InstancedMesh>(null);
  const marcas = useRef<THREE.InstancedMesh>(null);
  const tratoMalla = useRef<THREE.InstancedMesh>(null);
  const asas = useRef<THREE.InstancedMesh>(null);
  const banderas = useRef<(THREE.InstancedMesh | null)[]>([]);
  const nubes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const aspas = useRef<THREE.Mesh>(null);
  const rejaGrupo = useRef<THREE.Group>(null);
  const naipeGrupo = useRef<THREE.Group>(null);
  const naipe = useRef<THREE.Mesh>(null);
  const cupula = useRef<THREE.Mesh>(null);
  const dadosGrupos = useRef<(THREE.Group | null)[]>([null, null]);
  const dadoEnReposo = useRef([new THREE.Quaternion(), new THREE.Quaternion()]);
  const dadoAlDejarDeRodar = useRef([new THREE.Quaternion(), new THREE.Quaternion()]);
  const dadoObjetivo = useRef([new THREE.Quaternion(), new THREE.Quaternion()]);
  const claveDelObjetivo = useRef('');

  /* Las asas de las casillas: una matriz por casilla, escritas una vez. */
  useLayoutEffect(() => {
    const m = asas.current;
    if (m === null) return;
    for (let i = 0; i < CASILLAS; i++) {
      const marco = marcoDeCasilla(i);
      const centro = marco.esEsquina ? puntoEnEsquina(marco, MEDIO_LADO - 7, MEDIO_LADO - 7) : puntoEnCasilla(marco, MEDIO_LADO - 7, 0);
      const ancho = marco.esEsquina ? 14 : ANCHO_DE_CASILLA;
      auxEuler.set(-Math.PI / 2, 0, 0);
      auxGiro.setFromEuler(auxEuler);
      auxGiro2.setFromAxisAngle(EJE_Y, Math.atan2(marco.fuera.x, marco.fuera.z));
      auxGiro.premultiply(auxGiro2);
      m.setMatrixAt(i, auxMatriz.compose(auxPosicion.set(centro.x, ALZA_DEL_ASA, centro.z), auxGiro, auxEscala.set(ancho, 14, 1)));
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [props.alTocarCasilla]);

  const tamano = useThree((s) => s.size);
  const reloj = useThree((s) => s.clock);
  /** Las aceras repintadas este fotograma por un empeño en curso: al acabar, vuelven a su color base. */
  const acerasEnCurso = useRef(new Set<number>());

  // -------------------------------------------------------------------------
  // Saltar la cola: todo a su estado final
  // -------------------------------------------------------------------------

  const saltarTodo = (ahora: number): void => {
    cola.current = saltarLaColaDeSucesos(cola.current);
    colaPendiente.current = null;
    for (const [id, e] of peones.current) peones.current.set(id, saltarLaCola(e, ahora));
    cartaCerrada.current = null;
    seguimiento.current.hastaCuando = -1;
    const v = vistaDeDadosPendiente.current;
    if (v !== null) {
      sucesosDeDados.current.push({ que: 'vista', vista: v });
      vistaDeDadosPendiente.current = null;
    }
  };

  // -------------------------------------------------------------------------
  // El fotograma
  // -------------------------------------------------------------------------

  useFrame((s, dtCrudo) => {
    const ahora = s.clock.elapsedTime;
    const dt = Math.min(0.1, Math.max(0, dtCrudo));
    const losAsientos = asientosRef.current;
    const casillas = casillasRef.current;

    /* ─ El arranque: dos fotogramas después de que el mundo esté (o haya fallado), se avisa. ─ */
    if (arranqueRef.current && !listoAvisado.current) {
      fotogramasDesdeElArranque.current++;
      if (fotogramasDesdeElArranque.current >= 2) {
        listoAvisado.current = true;
        avisos.current.alEstarListo?.();
      }
    }

    /* ─ Los peones nacen con la vista, y se resincronizan cuando no animan nada. ─ */
    for (const a of losAsientos) {
      const id = a.figura.asiento;
      let e = peones.current.get(id);
      if (e === undefined) {
        e = nacidoDeLaVista(a.figura, a.indice, semilla, ahora);
        peones.current.set(id, e);
      }
      if (!refsDePeon.current.has(id)) refsDePeon.current.set(id, { current: null });
    }
    for (const id of [...peones.current.keys()]) if (!losAsientos.some((a) => a.figura.asiento === id)) peones.current.delete(id);

    /* ─ La cola: lo que llegó por props entra aquí, con el reloj de la escena. ─ */
    if (colaPendiente.current !== null) {
      cola.current = encolarEnLaCola({ ...cola.current, ahora }, colaPendiente.current, anillo);
      colaPendiente.current = null;
      colaAvisada.current = false;
    }
    cola.current = avanzarLaCola(cola.current, dt);
    if (cola.current.ahora !== ahora) cola.current = { ...cola.current, ahora };

    /* ─ Entregar a cada máquina lo que arranca ahora, con un solo aventurero en pie. ─ */
    let quienEstaEnPie: string | null = null;
    for (const [id, e] of peones.current) if (e.enPie) quienEstaEnPie = id;
    for (const p of cola.current.programados) {
      if (p.desde > ahora) break;
      if (alimentados.current.has(p)) continue;
      const sc = p.suceso;
      const quien = quienDe(sc);
      if (sc.que === 'tira' || sc.que === 'sale' || sc.que === 'tirada-de-oficio') {
        /* Los dados ruedan cuando la cola lo dice, con el par del suceso. */
        const vista = vistaDeDadosPendiente.current;
        const sello = sc.que === 'sale' ? -(1_000 + sc.ronda * 10 + losAsientos.findIndex((a) => a.figura.asiento === sc.quien)) : (vista?.sello ?? maquinaDeDados.current.vista?.sello ?? 0) + (sc.que === 'tirada-de-oficio' ? 0.5 : 0);
        /* «La primera vista nunca es nueva»: si la máquina no ha visto ninguna, se le da una en reposo antes. */
        if (maquinaDeDados.current.vista === null) sucesosDeDados.current.push({ que: 'vista', vista: { par: null, tirado: false, sello: -1 } });
        sucesosDeDados.current.push({ que: 'tocado' }, { que: 'vista', vista: { par: sc.dados, tirado: true, sello } });
        if (sc.que === 'tira' && vista !== null) vistaDeDadosPendiente.current = null;
        alimentados.current.add(p);
        continue;
      }
      if (sc.que === 'mueve' && quien !== null) {
        seguimiento.current.objetivo = huecoDePeon(sc.desde, losAsientos.find((a) => a.figura.asiento === quien)?.indice ?? 0);
        seguimiento.current.hastaCuando = p.hasta + REPOSO_TRAS_SEGUIR;
      }
      if (!esSucesoDelPeon(sc) || quien === null) {
        alimentados.current.add(p);
        continue;
      }
      const e = peones.current.get(quien);
      if (e === undefined) {
        alimentados.current.add(p);
        continue;
      }
      if (poneEnPie(sc) && quienEstaEnPie !== null && quienEstaEnPie !== quien) {
        /* Decisión 11: el otro se despide primero; este suceso espera. */
        const otro = peones.current.get(quienEstaEnPie);
        if (otro !== undefined && otro.fase === 'quieto') peones.current.set(quienEstaEnPie, despedir(otro, ahora));
        break;
      }
      peones.current.set(quien, encolarAlPeon(e, [sc]));
      if (poneEnPie(sc)) quienEstaEnPie = quien;
      alimentados.current.add(p);
    }
    /* Sin nada por arrancar, la vista de dados retenida entra. */
    const hayTiradaPorArrancar = cola.current.programados.some((p) => p.desde > ahora && (p.suceso.que === 'tira' || p.suceso.que === 'sale'));
    if (!hayTiradaPorArrancar && vistaDeDadosPendiente.current !== null) {
      sucesosDeDados.current.push({ que: 'vista', vista: vistaDeDadosPendiente.current });
      vistaDeDadosPendiente.current = null;
    }

    /* ─ Las máquinas de peón avanzan; se resincronizan con la vista cuando están en reposo. ─ */
    for (const a of losAsientos) {
      const id = a.figura.asiento;
      let e = peones.current.get(id);
      if (e === undefined) continue;
      e = avanzar(e, ahora, dt, anillo);
      if (peonTerminado(e) && colaTerminada(cola.current) && (e.enCasilla !== a.figura.casilla || e.presa !== a.figura.presa || e.quebrada !== a.figura.quebrada) && !e.enPie) {
        e = nacidoDeLaVista(a.figura, a.indice, semilla, ahora);
      }
      peones.current.set(id, e);
      const ref = refsDePeon.current.get(id);
      if (ref !== undefined) ref.current = e;
    }
    let ahoraEnPie: string | null = null;
    for (const [id, e] of peones.current) if (e.enPie) ahoraEnPie = id;
    if (ahoraEnPie !== enPieRef.current) {
      enPieRef.current = ahoraEnPie;
      ponerEnPie(ahoraEnPie);
    }

    /* ─ Aviso de cola terminada, una vez por jugada. ─ */
    const todoQuieto = colaTerminada(cola.current) && [...peones.current.values()].every(peonTerminado);
    if (todoQuieto && !colaAvisada.current) {
      colaAvisada.current = true;
      avisos.current.alTerminarLaCola?.();
    }

    const sonando = enCurso(cola.current);
    const enCursoDe = (que: SucesoDelBurgo['que']): (typeof sonando)[number] | undefined => sonando.find((x) => x.suceso.que === que);

    /* ─ Los dados: la cola de sucesos, el tic, y la pose de cada uno. ─ */
    {
      for (const suceso of sucesosDeDados.current) maquinaDeDados.current = faseDeLosDadosConPar(maquinaDeDados.current, suceso, ahora);
      sucesosDeDados.current = [];
      const antes = maquinaDeDados.current.fase.fase;
      maquinaDeDados.current = faseDeLosDadosConPar(maquinaDeDados.current, { que: 'tic' }, ahora);
      const { fase } = maquinaDeDados.current;
      if (antes === 'asentando' && fase.fase === 'quieta') asentadoEn.current = ahora;
      const par = parQueSeEnsena(fase);
      const sello = maquinaDeDados.current.vista?.sello ?? 0;
      const clave = `${String(par[0])},${String(par[1])},${String(sello)}`;
      if (claveDelObjetivo.current !== clave) {
        claveDelObjetivo.current = clave;
        selloDelPar.current = sello;
        for (const i of [0, 1] as const) {
          const valor = Math.min(6, Math.max(1, Math.round(par[i]))) as ValorDelDado;
          cuaternionDelValor(valor, giroDelDadoAsentado(i, Math.round(sello)), dadoObjetivo.current[i] as THREE.Quaternion);
        }
      }
      const disponible = dados?.porTirar === true && fase.fase === 'quieta';
      for (const i of [0, 1] as const) {
        const g = dadosGrupos.current[i];
        if (g === null || g === undefined) continue;
        const hueco = HUECOS_DE_LOS_DADOS[i] as Punto;
        g.position.set(hueco.x, SUELO_DE_DADOS.y + ARISTA_DE_LOS_DADOS / 2, hueco.z);
        const reposo = dadoEnReposo.current[i] as THREE.Quaternion;
        const alDejar = dadoAlDejarDeRodar.current[i] as THREE.Quaternion;
        const objetivo = dadoObjetivo.current[i] as THREE.Quaternion;
        if (fase.fase === 'rodando') {
          const transcurrido = ahora - fase.desde;
          const angulo = anguloRodado(transcurrido);
          auxEuler.set(angulo * (i === 0 ? 1 : 0.8), 0, angulo * (i === 0 ? 0.7 : -1));
          auxGiro.setFromEuler(auxEuler);
          g.quaternion.copy(reposo).premultiply(auxGiro);
          g.position.y += saltoDelDado(transcurrido) * ARISTA_DE_LOS_DADOS * 2;
          alDejar.copy(g.quaternion);
          continue;
        }
        if (fase.fase === 'asentando') {
          const transcurrido = ahora - fase.desde;
          g.quaternion.slerpQuaternions(alDejar, objetivo, avanceDelAsentado(transcurrido));
          g.position.y += reboteDelDado(transcurrido) * ARISTA_DE_LOS_DADOS * 6;
          continue;
        }
        g.quaternion.copy(objetivo);
        reposo.copy(g.quaternion);
        alDejar.copy(g.quaternion);
        if (asentadoEn.current >= 0) g.position.y += saltoDelDoble(par, ahora - asentadoEn.current) * ARISTA_DE_LOS_DADOS;
        if (disponible) {
          const sac = sacudida(ahora + i * 0.05);
          g.position.x += sac * SACUDIDA.traslacion * ARISTA_DE_LOS_DADOS * 2;
          auxGiro.setFromAxisAngle(EJE_Y, sac * SACUDIDA.giro);
          g.quaternion.premultiply(auxGiro);
        }
      }
    }

    /* ─ Las casas y las banderas: lo que dice la vista, con lo que brota, cae o se hunde. ─ */
    {
      const alza = enCursoDe('alza');
      const vende = enCursoDe('vende');
      const compra = sonando.filter((x) => x.suceso.que === 'compra' || (x.suceso.que === 'almoneda-cerrada' && x.suceso.ganador !== null) || x.suceso.que === 'cambia-de-mano');
      const empenos = sonando.filter((x) => x.suceso.que === 'empena' || x.suceso.que === 'desempena');
      const desierta = sonando.find((x) => x.suceso.que === 'almoneda-cerrada' && x.suceso.ganador === null);
      const mc = casas.current;
      let nCasas = 0;
      const porColor = new Map<string, number>();
      const escribeBandera = (hex: string, x: number, y: number, z: number, giro: number, escalaY: number): void => {
        const k = coloresDeBanderas.indexOf(hex);
        const malla = banderas.current[k];
        if (k < 0 || malla === null || malla === undefined) return;
        const n = porColor.get(hex) ?? 0;
        if (n >= CAPACIDAD.banderas) return;
        malla.setMatrixAt(n, auxMatriz.compose(auxPosicion.set(x, y, z), auxGiro.setFromAxisAngle(EJE_Y, giro), auxEscala.set(1, Math.max(0.001, escalaY), 1)));
        porColor.set(hex, n + 1);
      };
      for (const c of casillas) {
        const marco = marcoDeCasilla(c.indice);
        if (marco.esEsquina) continue;
        const giro = Math.atan2(-marco.fuera.x, -marco.fuera.z);
        const suyo = c.dueno;
        /* Las casas. */
        if (mc !== null && suyo !== null && c.casas > 0) {
          auxColor.set(suyo);
          const esPosada = c.casas >= 5;
          const cuantas = esPosada ? 1 : c.casas;
          const alzaAqui = alza !== undefined && alza.suceso.que === 'alza' && alza.suceso.casilla === c.indice ? alza : undefined;
          const t = alzaAqui === undefined ? 0 : ahora - alzaAqui.desde;
          if (esPosada && alzaAqui !== undefined && t < HUNDIR_CASAS) {
            /* Las cuatro se hunden antes de que brote la posada. */
            for (let k = 0; k < 4 && nCasas < CAPACIDAD.casas; k++) {
              const h = huecoDeCasa(c.indice, k);
              const e = hundirse(t);
              mc.setMatrixAt(nCasas, matrizDelBurgo(h.x, 0, h.z, giro, Math.max(0.001, e), auxMatriz));
              mc.setColorAt(nCasas, auxColor);
              nCasas++;
            }
          } else {
            for (let k = 0; k < cuantas && nCasas < CAPACIDAD.casas; k++) {
              const h = esPosada ? huecoDePosada(c.indice) : huecoDeCasa(c.indice, k);
              let escala = 1;
              if (alzaAqui !== undefined) {
                const brota = esPosada ? 0 : cuantas - 1;
                if (k === brota) escala = backOut((t - (esPosada ? HUNDIR_CASAS : 0)) / POR_CASA);
              }
              mc.setMatrixAt(nCasas, matrizDelBurgo(h.x, ALTURA_DE_LA_ACERA, h.z, giro, Math.max(0.001, escala), auxMatriz));
              mc.setColorAt(nCasas, auxColor);
              nCasas++;
            }
          }
          if (esPosada) {
            const p = puntoEnCasilla(marco, ACERA.centro, BANDERA_SOBRE_LA_POSADA.aLoLargo);
            const escala = alzaAqui !== undefined ? backOut((t - HUNDIR_CASAS) / POR_CASA) : 1;
            escribeBandera(suyo, p.x, ALTURA_DE_LA_ACERA + BANDERA_SOBRE_LA_POSADA.alza * Math.max(0.001, escala), p.z, giro, escala);
          }
        }
        /* La casa que se vende, hundiéndose donde estaba. */
        if (mc !== null && vende !== undefined && vende.suceso.que === 'vende' && vende.suceso.casilla === c.indice && suyo !== null && nCasas < CAPACIDAD.casas) {
          const k = Math.min(3, vende.suceso.casas);
          const h = huecoDeCasa(c.indice, k);
          auxColor.set(suyo);
          mc.setMatrixAt(nCasas, matrizDelBurgo(h.x, ALTURA_DE_LA_ACERA, h.z, giro, Math.max(0.001, hundirse(ahora - vende.desde, vende.hasta - vende.desde)), auxMatriz));
          mc.setColorAt(nCasas, auxColor);
          nCasas++;
        }
        /* La bandera del dueño, o la ámbar de la almoneda. */
        const b = huecoDeBandera(c.indice);
        if (suyo !== null) {
          const cae = compra.find((x) => 'casilla' in x.suceso && x.suceso.casilla === c.indice);
          const empeno = empenos.find((x) => 'casilla' in x.suceso && x.suceso.casilla === c.indice);
          let f = c.empenada ? 1 : 0;
          let luminancia = c.empenada ? LUMINANCIA_EMPENADA : 1;
          if (empeno !== undefined) {
            f = mediaAsta(ahora - empeno.desde, empeno.suceso.que === 'empena');
            luminancia = 1 - (1 - LUMINANCIA_EMPENADA) * f;
            pintaLaAcera(suelo, c, luminancia);
            acerasEnCurso.current.add(c.indice);
          } else if (acerasEnCurso.current.has(c.indice)) {
            acerasEnCurso.current.delete(c.indice);
            pintaLaAcera(suelo, c, luminancia);
          }
          const y = cae === undefined ? 0 : caidaConRebote(ahora - cae.desde);
          const giroDeLaBandera = cae !== undefined && cae.suceso.que === 'cambia-de-mano' ? giro + Math.PI * pinza((ahora - cae.desde) / (cae.hasta - cae.desde), 0, 1) : giro;
          escribeBandera(suyo, b.x, ALTURA_DE_LA_ACERA + y, b.z, giroDeLaBandera, 1 - 0.45 * f);
        } else if (c.enAlmoneda || (desierta !== undefined && 'casilla' in desierta.suceso && desierta.suceso.casilla === c.indice)) {
          const escala = desierta !== undefined && 'casilla' in desierta.suceso && desierta.suceso.casilla === c.indice ? hundirse(ahora - desierta.desde, desierta.hasta - desierta.desde) : parpadeo(ahora);
          escribeBandera(AMBAR_DEL_CONCEJO, b.x, ALTURA_DE_LA_ACERA, b.z, giro, escala);
        }
      }
      if (mc !== null) {
        mc.count = nCasas;
        mc.instanceMatrix.needsUpdate = true;
        if (mc.instanceColor !== null) mc.instanceColor.needsUpdate = true;
        mc.computeBoundingSphere();
      }
      coloresDeBanderas.forEach((hex, k) => {
        const malla = banderas.current[k];
        if (malla === null || malla === undefined) return;
        malla.count = porColor.get(hex) ?? 0;
        malla.instanceMatrix.needsUpdate = true;
        malla.computeBoundingSphere();
      });
    }

    /* ─ Los peones y sus discos; el aventurero que no hay se sustituye por el peón deslizando. ─ */
    {
      const mp = peonesMalla.current;
      const md = discos.current;
      const sorteo = sonando.find((x) => x.suceso.que === 'sale' && x.suceso.ronda <= 1);
      const apuro = enCursoDe('apuro');
      let nDiscos = 0;
      losAsientos.forEach((a, k) => {
        const e = peones.current.get(a.figura.asiento);
        if (mp === null || e === undefined || k >= CAPACIDAD.peones) return;
        const conAventurero = plena && enPieRef.current === a.figura.asiento && figuras.has(a.figura.figura) && biblioteca.length > 0;
        let p = posicionDelPeon(e, anillo, ahora);
        if (e.enPie && !conAventurero && !p.visible) {
          const av = posicionYRumbo(e, anillo, ahora);
          p = { x: av.x, y: 0, z: av.z, tumbado: 0, visible: av.escala > 0.01 };
        }
        let y = p.y;
        if (sorteo !== undefined) {
          const u = caidaDelPeonDelSorteo(k, ahora - sorteo.desde);
          y += CAIDA_DEL_SORTEO * (1 - u) + reboteDelDado(u * 0.35) * 10;
        }
        let x = p.x;
        if (apuro !== undefined && apuro.suceso.que === 'apuro' && apuro.suceso.quien === a.figura.asiento) x += sacudida(ahora) * 0.25;
        auxColor.set(a.figura.color);
        if (!p.visible) {
          mp.setMatrixAt(k, NADA);
        } else {
          auxEuler.set((Math.PI / 2) * p.tumbado, 0, 0);
          auxGiro.setFromEuler(auxEuler);
          mp.setMatrixAt(k, auxMatriz.compose(auxPosicion.set(x, y, p.z), auxGiro, auxEscala.set(1, 1, 1)));
          if (md !== null && nDiscos < CAPACIDAD.discos) {
            auxEuler.set(-Math.PI / 2, 0, 0);
            md.setMatrixAt(nDiscos, auxMatriz.compose(auxPosicion.set(x, 0.03, p.z), auxGiro.setFromEuler(auxEuler), auxEscala.set(1, 1, 1)));
            nDiscos++;
          }
        }
        mp.setColorAt(k, auxColor);
      });
      /* El disco del aventurero en pie (y del que se despide), en la misma malla que los de los peones. */
      if (md !== null) {
        for (const [id, e] of peones.current) {
          if (!e.enPie || nDiscos >= CAPACIDAD.discos) continue;
          const conAventurero = plena && figuras.has(losAsientos.find((a) => a.figura.asiento === id)?.figura.figura ?? 'caballero') && biblioteca.length > 0;
          if (!conAventurero) continue;
          const av = posicionYRumbo(e, anillo, ahora);
          if (av.escala <= 0.01) continue;
          auxEuler.set(-Math.PI / 2, 0, 0);
          md.setMatrixAt(nDiscos, auxMatriz.compose(auxPosicion.set(av.x, 0.03, av.z), auxGiro.setFromEuler(auxEuler), auxEscala.set(1.1 * av.escala, 1.1 * av.escala, 1)));
          nDiscos++;
        }
      }
      if (mp !== null) {
        for (let k = losAsientos.length; k < CAPACIDAD.peones; k++) mp.setMatrixAt(k, NADA);
        mp.instanceMatrix.needsUpdate = true;
        if (mp.instanceColor !== null) mp.instanceColor.needsUpdate = true;
      }
      if (md !== null) {
        md.count = nDiscos;
        md.instanceMatrix.needsUpdate = true;
      }
    }

    /* ─ Las monedas en vuelo. ─ */
    {
      const mm = monedas.current;
      if (mm !== null) {
        let n = 0;
        for (const x of sonando) {
          const sc = x.suceso;
          if (sc.que !== 'cobra' && sc.que !== 'paga') continue;
          const cuantas = monedasDe(sc.cuanto);
          const de = sc.que === 'cobra' ? puntoDelDinero(sc.de, sc.casilla, losAsientos, peones.current) : puntoDelDinero(sc.quien, sc.casilla, losAsientos, peones.current);
          const a = sc.que === 'cobra' ? puntoDelDinero(sc.quien, sc.casilla, losAsientos, peones.current) : puntoDelDinero(sc.a, sc.casilla, losAsientos, peones.current);
          for (let k = 0; k < cuantas && n < CAPACIDAD.monedas; k++) {
            const u = progresoDeLaMoneda(k, ahora - x.desde, sc.cuanto);
            if (u <= 0 || u >= 1) continue;
            const px = de.x + (a.x - de.x) * u;
            const pz = de.z + (a.z - de.z) * u;
            auxEuler.set(0, ahora * 6 + k, Math.PI / 2);
            mm.setMatrixAt(n, auxMatriz.compose(auxPosicion.set(px, 1 + arcoDeMoneda(u), pz), auxGiro.setFromEuler(auxEuler), auxEscala.set(TALLA_DE_LA_MONEDA, TALLA_DE_LA_MONEDA, TALLA_DE_LA_MONEDA)));
            n++;
          }
        }
        mm.count = n;
        mm.instanceMatrix.needsUpdate = true;
      }
    }

    /* ─ Las marcas: las casillas tocables y la destacada, que se desliza. ─ */
    {
      const mk = marcas.current;
      if (mk !== null) {
        let n = 0;
        auxEuler.set(-Math.PI / 2, 0, 0);
        auxGiro.setFromEuler(auxEuler);
        auxColor.set(COLOR_DEL_ACENTO);
        for (const c of casillas) {
          if (!c.tocable || n >= CAPACIDAD.marcas - 1) continue;
          const p = centroDeLaMarca(c.indice);
          const pulso = 1 + 0.04 * Math.sin(ahora * 4 + c.indice);
          mk.setMatrixAt(n, auxMatriz.compose(auxPosicion.set(p.x, MARCA.alza, p.z), auxGiro, auxEscala.set(pulso, pulso, 1)));
          mk.setColorAt(n, auxColor);
          n++;
        }
        /* La destacada: la casilla de quien tiene el turno, o el peón delante del que ruedan los dados en el sorteo. */
        let objetivo: Punto | null = null;
        const delante = dados?.delanteDe ?? null;
        if (delante !== null) {
          const a = losAsientos.find((x) => x.figura.asiento === delante);
          const e = a === undefined ? undefined : peones.current.get(delante);
          if (a !== undefined && e !== undefined) objetivo = huecoDePeon(e.enCasilla, a.indice);
        } else if (tablero.destacada !== null) {
          objetivo = centroDeLaMarca(tablero.destacada);
        }
        if (objetivo !== null) {
          const actual = marcaDestacada.current ?? { x: objetivo.x, z: objetivo.z };
          const k = amortiguado(dt, AMORTIGUACION_DE_LA_MARCA);
          actual.x += (objetivo.x - actual.x) * k;
          actual.z += (objetivo.z - actual.z) * k;
          marcaDestacada.current = actual;
          auxColor.set(COLOR_DE_LA_DESTACADA);
          const talla = delante !== null ? 0.55 : 1.12;
          mk.setMatrixAt(n, auxMatriz.compose(auxPosicion.set(actual.x, MARCA.alza + 0.01, actual.z), auxGiro, auxEscala.set(talla, talla, 1)));
          mk.setColorAt(n, auxColor);
          n++;
        } else {
          marcaDestacada.current = null;
        }
        mk.count = n;
        mk.instanceMatrix.needsUpdate = true;
        if (mk.instanceColor !== null) mk.instanceColor.needsUpdate = true;
        mk.computeBoundingSphere();
      }
    }

    /* ─ Los discos del trato: una línea entre los dos peones mientras dure. ─ */
    {
      const mt = tratoMalla.current;
      if (mt !== null) {
        const t = tablero.trato;
        let n = 0;
        if (t !== null) {
          const de = puntoDelDinero(t.de, 0, losAsientos, peones.current);
          const a = puntoDelDinero(t.a, 0, losAsientos, peones.current);
          auxEuler.set(-Math.PI / 2, 0, 0);
          auxGiro.setFromEuler(auxEuler);
          for (let k = 0; k < DISCOS_DEL_TRATO; k++) {
            const u = (k + 0.5) / DISCOS_DEL_TRATO;
            const brillo = 0.7 + 0.3 * Math.sin(ahora * 3 - k * 0.6);
            mt.setMatrixAt(n, auxMatriz.compose(auxPosicion.set(de.x + (a.x - de.x) * u, 0.05, de.z + (a.z - de.z) * u), auxGiro, auxEscala.set(brillo, brillo, 1)));
            n++;
          }
        }
        mt.count = n;
        mt.instanceMatrix.needsUpdate = true;
      }
    }

    /* ─ La reja de la Mazmorra, las aspas, las nubes, el agua quieta. ─ */
    {
      const rg = rejaGrupo.current;
      if (rg !== null && mundo?.reja) {
        let alzado = 0;
        const entra = enCursoDe('a-la-mazmorra');
        const sale = enCursoDe('sale-de-la-mazmorra');
        if (entra !== undefined) alzado = alzadoDeLaReja(ahora - entra.desde);
        else if (sale !== undefined) {
          const t = ahora - sale.desde;
          alzado = t < PASO_DE_LA_REJA ? t / PASO_DE_LA_REJA : Math.max(0, 1 - (t - PASO_DE_LA_REJA) / (sale.hasta - sale.desde - PASO_DE_LA_REJA));
        }
        rg.position.y = mundo.reja.puesta.y + alzado * SUBIDA_DE_LA_REJA;
      }
      const asp = aspas.current;
      if (asp !== null && mundo?.aspas) {
        auxGiro.setFromAxisAngle(EJE_Z, ahora * GIRO_DE_LAS_ASPAS);
        asp.quaternion.copy(mundo.aspas.giro).multiply(auxGiro);
      }
      if (mundo !== null) {
        mundo.nubes.forEach((nube, k) => {
          const malla = nubes.current[k];
          if (malla === null || malla === undefined) return;
          nube.puestas.forEach((p, i) => {
            const recorrido = (p.x + CONFIN_DE_LAS_NUBES + ahora * DERIVA_DE_LAS_NUBES) % (2 * CONFIN_DE_LAS_NUBES);
            const x = recorrido - CONFIN_DE_LAS_NUBES;
            malla.setMatrixAt(i, matrizDelBurgo(x, p.y + Math.sin(ahora / 7 + i) * 0.6, p.z, p.giro, p.talla, auxMatriz));
          });
          malla.instanceMatrix.needsUpdate = true;
        });
      }
    }

    /* ─ El naipe, pegado a la cámara. ─ */
    {
      const ng = naipeGrupo.current;
      const nm = naipe.current;
      const carta = enCursoDe('carta');
      const cam = s.camera as THREE.PerspectiveCamera;
      if (ng !== null && nm !== null) {
        const seVe = carta !== undefined && cartaCerrada.current !== carta;
        ng.visible = seVe;
        if (seVe && carta !== undefined && carta.suceso.que === 'carta') {
          ng.position.copy(cam.position);
          ng.quaternion.copy(cam.quaternion);
          const medioAlto = Math.tan((cam.fov * Math.PI) / 360);
          const d = NAIPE.alto / (NAIPE.parteDelAlto * 2 * medioAlto);
          const arriba = d * medioAlto * (1 - NAIPE.margenArriba * 2) - NAIPE.alto / 2;
          const t = ahora - carta.desde;
          const e = escalaDelNaipe(t);
          nm.position.set(0, arriba, -d);
          nm.rotation.set(0, (1 - e) * Math.PI, 0);
          nm.scale.set(Math.max(0.001, e), Math.max(0.001, e), 1);
          nm.material = carta.suceso.mazo === 'arca' ? materiales.naipeArca : materiales.naipePregon;
        }
      }
      if (cupula.current !== null) cupula.current.position.copy(cam.position);
    }

    /* ─ La medida: una vez por segundo, con la media real. ─ */
    const m = medida.current;
    m.segundos += dt;
    m.fotogramas++;
    if (m.segundos >= 1) {
      const info = s.gl.info.render;
      avisos.current.alMedir?.({ triangulos: info.triangles, llamadas: info.calls, ms: (m.segundos * 1000) / m.fotogramas, fotogramas: m.fotogramas });
      m.segundos = 0;
      m.fotogramas = 0;
    }

    /* ─ El fin: el ganador aparece en la plaza. ─ */
    const fin = enCursoDe('fin') !== undefined || (tablero.ganador !== null && colaTerminada(cola.current));
    if (fin !== ganadorEnPlaza) ponerGanadorEnPlaza(fin);
  });

  /*
   * ─ La cámara: seguir al que mueve y la pose de `fin`, DESPUÉS del cliente. ─
   *
   * Con la misma prioridad (0) que el `useFrame` del cliente, a propósito: r3f deja de
   * pintar solo en cuanto alguien se suscribe con prioridad mayor que cero (pasa a
   * «render manual»). Los suscriptores de igual prioridad corren en orden de montaje,
   * y el cliente monta su cámara ANTES que `<Burgo>` (§6.1, §6.2 y el banco): este
   * fotograma ve la pose que el cliente acaba de dejar y la mezcla desde ahí.
   */
  useFrame((s, dtCrudo) => {
    const dt = Math.min(0.1, Math.max(0, dtCrudo));
    const ahora = s.clock.elapsedTime;
    const cam = s.camera as THREE.PerspectiveCamera;
    const sg = seguimiento.current;
    const fin = ganadorEnPlaza;
    const enPieAhora = enPieRef.current;
    let objetivo: Punto | null = null;
    if (fin) objetivo = { x: 0, z: 0 };
    else if (seguirAlQueMueve && enPieAhora !== null && ahora < sg.hastaCuando) {
      const e = peones.current.get(enPieAhora);
      if (e !== undefined) {
        const p = posicionYRumbo(e, anillo, ahora);
        objetivo = { x: p.x, z: p.z };
      }
    }
    const pesoObjetivo = objetivo === null ? 0 : 1;
    sg.peso += (pesoObjetivo - sg.peso) * amortiguado(dt, AMORTIGUACION_DEL_SEGUIMIENTO);
    if (objetivo !== null) sg.objetivo = objetivo;
    if (sg.peso < 0.002) return;
    /* Dónde mira ahora la cámara del cliente: donde su rayo corta el suelo. */
    auxRayo.origin.copy(cam.position);
    cam.getWorldDirection(auxRayo.direction);
    const corte = auxRayo.intersectPlane(PLANO_DEL_SUELO, auxVector);
    if (corte === null) return;
    const objetivoActual = auxVector;
    const direccion = auxVector2.copy(cam.position).sub(objetivoActual).normalize();
    let distancia: number;
    let mira: THREE.Vector3;
    if (fin) {
      distancia = ALTURA_DEL_FIN;
      mira = new THREE.Vector3(sg.objetivo.x, 0, sg.objetivo.z);
      direccion.set(0.02, 1, 0.02).normalize();
    } else {
      distancia = ALCANCE_DEL_BURGO * CERCANIA_DE_SEGUIMIENTO * LEJANIA;
      mira = new THREE.Vector3(sg.objetivo.x, 0, sg.objetivo.z);
    }
    const posicion = mira.clone().addScaledVector(direccion, distancia);
    posicion.y = Math.max(ALTURA_MINIMA_DEL_OJO_DEL_BURGO, posicion.y);
    const miraMezclada = objetivoActual.clone().lerp(mira, sg.peso);
    const posicionMezclada = cam.position.clone().lerp(posicion, sg.peso);
    cam.position.copy(posicionMezclada);
    cam.lookAt(miraMezclada);
  });

  // -------------------------------------------------------------------------
  // Los toques
  // -------------------------------------------------------------------------

  const pulsado = useRef<{ instancia: number | undefined; x: number; y: number } | null>(null);
  const empiezaElToque = (e: ThreeEvent<PointerEvent>): void => {
    if (noEsElPrimario(e)) return;
    e.stopPropagation();
    loCogeLaInterfaz(e.nativeEvent);
    pulsado.current = { instancia: e.instanceId, x: e.pointer.x, y: e.pointer.y };
  };
  const esUnToque = (e: ThreeEvent<PointerEvent>): boolean => {
    const p = pulsado.current;
    pulsado.current = null;
    if (p === null || noEsElPrimario(e)) return false;
    const dx = ((e.pointer.x - p.x) * tamano.width) / 2;
    const dy = ((e.pointer.y - p.y) * tamano.height) / 2;
    return Math.hypot(dx, dy) < MINIMO_PARA_GIRAR && p.instancia === e.instanceId;
  };
  const tocaCasilla = (e: ThreeEvent<PointerEvent>): void => {
    if (!esUnToque(e)) return;
    e.stopPropagation();
    const i = e.instanceId;
    if (i === undefined || i < 0 || i >= CASILLAS) return;
    saltarTodo(reloj.elapsedTime);
    if (avisos.current.quieto) return;
    avisos.current.alTocarCasilla?.(i);
  };
  const tocaPeon = (e: ThreeEvent<PointerEvent>): void => {
    if (!esUnToque(e)) return;
    e.stopPropagation();
    const i = e.instanceId;
    const a = i === undefined ? undefined : asientosRef.current[i];
    if (a === undefined) return;
    avisos.current.alTocarFigura?.(a.figura.asiento);
  };
  const tocaLosDados = (e: ThreeEvent<PointerEvent>): void => {
    if (!esUnToque(e)) return;
    e.stopPropagation();
    if (avisos.current.quieto) return;
    const alTocar = avisos.current.alTocarLosDados;
    if (alTocar === undefined) return;
    sucesosDeDados.current.push({ que: 'tocado' });
    void alTocar().then((resultado) => {
      /* `sucesoDelResultado` sólo devuelve `rechazado` o nada: aquí se escribe con la vista del Burgo. */
      const suceso = sucesoDelResultado(resultado);
      if (suceso !== null && suceso.que === 'rechazado' && vivo.current) sucesosDeDados.current.push({ que: 'rechazado' });
    });
  };
  const cierraElNaipe = (e: ThreeEvent<PointerEvent>): void => {
    if (noEsElPrimario(e)) return;
    e.stopPropagation();
    loCogeLaInterfaz(e.nativeEvent);
    const carta = enCurso(cola.current).find((x) => x.suceso.que === 'carta');
    if (carta !== undefined) cartaCerrada.current = cola.current.programados.find((p) => p.suceso === carta.suceso) ?? null;
  };

  // -------------------------------------------------------------------------

  const asientoEnPie = asientos.find((a) => a.figura.asiento === enPie) ?? null;
  const cargadoEnPie = asientoEnPie === null ? undefined : figuras.get(asientoEnPie.figura.figura);
  const refEnPie = asientoEnPie === null ? undefined : refsDePeon.current.get(asientoEnPie.figura.asiento);
  const ganador = asientos.find((a) => a.figura.asiento === tablero.ganador) ?? null;
  const cargadoDelGanador = ganador === null ? undefined : figuras.get(ganador.figura.figura);
  const estadoDelGanador = useMemo<{ current: EstadoDelPeon | null }>(() => ({ current: null }), []);
  const anilloDeLaPlaza = useMemo<AnilloEn3D>(
    () => ({
      ...ANILLO_DEL_BURGO,
      huecoDeAventurero: () => ({ x: 0, z: 0 }),
      rumboDeLaMarcha: () => 0.35,
    }),
    [],
  );
  useEffect(() => {
    if (!ganadorEnPlaza || ganador === null) {
      estadoDelGanador.current = null;
      return;
    }
    const e = nacer(0, semilla ^ 0x51, 0, ganador.indice);
    estadoDelGanador.current = { ...e, enPie: true, gesto: { clip: CLIP.saludar, desde: 0, dura: DURACION.saludar } };
  }, [ganadorEnPlaza, ganador, semilla, estadoDelGanador]);
  useFrame((s) => {
    const e = estadoDelGanador.current;
    if (e === null) return;
    const ahora = s.clock.elapsedTime;
    /* Saluda en bucle: se reprograma el gesto cada vez que termina. */
    if (e.gesto === null || ahora - e.gesto.desde >= e.gesto.dura) estadoDelGanador.current = { ...e, gesto: { clip: CLIP.saludar, desde: ahora, dura: DURACION.saludar } };
  });

  return (
    <>
      <fog attach="fog" args={[COLOR_DE_LA_NIEBLA, NIEBLA.cerca, NIEBLA.lejos]} />

      {/* El fondo: la cúpula de mediodía pegada a la cámara. Se dibuja la primera y no escribe profundidad. */}
      <mesh ref={cupula} geometry={geometrias.cielo} material={materiales.cielo} frustumCulled={false} renderOrder={-10} raycast={() => null} />

      {/* Las luces de mediodía, sin sombras (§5.6). */}
      <hemisphereLight args={[LUZ.hemisferio.cielo, LUZ.hemisferio.suelo, LUZ.hemisferio.intensidad]} />
      <directionalLight position={[LUZ.sol.rumbo[0] * 100, LUZ.sol.rumbo[1] * 100, LUZ.sol.rumbo[2] * 100]} intensity={LUZ.sol.intensidad} color={LUZ.sol.color} />

      {/* El suelo del anillo, la plaza y la tierra: una geometría propia con color por vértice. */}
      <mesh geometry={suelo.geometria} material={materiales.suelo} raycast={() => null} />

      {mundo === null ? null : (
        <group>
          {mundo.fundido === null ? null : <mesh geometry={mundo.fundido.geometria} material={mundo.fundido.material} raycast={() => null} />}
          {mundo.aspas === null ? null : (
            <group matrix={mundo.aspas.matrizDelMolino} matrixAutoUpdate={false}>
              {/* La posición como TERNA, no como Vector3: fiber sólo copia un vector de SU copia de three. */}
              <mesh ref={aspas} position={[mundo.aspas.posicion[0], mundo.aspas.posicion[1], mundo.aspas.posicion[2]]} geometry={mundo.aspas.geometria} material={mundo.aspas.material} raycast={() => null} />
            </group>
          )}
          {mundo.reja === null ? null : (
            <group ref={rejaGrupo} position={[mundo.reja.puesta.x, mundo.reja.puesta.y, mundo.reja.puesta.z]} rotation={[0, mundo.reja.puesta.giro, 0]}>
              <mesh geometry={mundo.reja.geometria} material={mundo.reja.material} raycast={() => null} />
            </group>
          )}
          {mundo.nubes.map((nube, k) => (
            <instancedMesh
              key={`nube-${String(k)}`}
              ref={(m) => {
                nubes.current[k] = m;
              }}
              args={[nube.geometria, nube.material, nube.puestas.length]}
              frustumCulled={false}
              raycast={() => null}
            />
          ))}
          {mundo.casa === null || mundo.material === null ? null : (
            <instancedMesh ref={casas} args={[mundo.casa, mundo.material, CAPACIDAD.casas]} frustumCulled={false} raycast={() => null} />
          )}
          {mundo.peon === null || mundo.material === null ? null : (
            <instancedMesh ref={peonesMalla} args={[mundo.peon, mundo.material, CAPACIDAD.peones]} frustumCulled={false} onPointerDown={empiezaElToque} onPointerUp={tocaPeon} />
          )}
          {mundo.material === null
            ? null
            : banderasPorColor.map((b, k) => (
                <instancedMesh
                  key={b.hex}
                  ref={(m) => {
                    banderas.current[k] = m;
                  }}
                  args={[b.geometria, mundo.material as THREE.Material, CAPACIDAD.banderas]}
                  frustumCulled={false}
                  raycast={() => null}
                />
              ))}
          {mundo.moneda === null || mundo.material === null || !plena ? null : (
            <instancedMesh ref={monedas} args={[mundo.moneda, mundo.material, CAPACIDAD.monedas]} frustumCulled={false} raycast={() => null} />
          )}
        </group>
      )}

      {/* Los discos de contacto de los peones, la marca de casilla y los discos del trato. */}
      <instancedMesh ref={discos} args={[geometrias.disco, materiales.disco, CAPACIDAD.discos]} frustumCulled={false} raycast={() => null} />
      <group renderOrder={ORDEN_DE_LAS_CASILLAS}>
        <instancedMesh ref={marcas} args={[geometrias.marca, materiales.marca, CAPACIDAD.marcas]} frustumCulled={false} renderOrder={ORDEN_DE_LAS_CASILLAS} raycast={() => null} />
      </group>
      <instancedMesh ref={tratoMalla} args={[geometrias.trato, materiales.trato, CAPACIDAD.trato]} frustumCulled={false} raycast={() => null} />

      {/* Las asas de las casillas: UNA malla instanciada, `instanceId → casilla`, sólo si hay quien atienda. */}
      {props.alTocarCasilla === undefined ? null : (
        <instancedMesh ref={asas} args={[geometrias.asaDeCasilla, materiales.asa, CASILLAS]} onPointerDown={empiezaElToque} onPointerUp={tocaCasilla} />
      )}

      {/* Los dados en el suelo de dados de la plaza, y su asa sólo cuando hay que tirar. */}
      {([0, 1] as const).map((i) => (
        <group
          key={`dado-${String(i)}`}
          ref={(g) => {
            dadosGrupos.current[i] = g;
          }}
        >
          {dadoDelPack !== null ? (
            <mesh geometry={dadoDelPack.geometria} material={dadoDelPack.material} scale={[ARISTA_DE_LOS_DADOS / ARISTA_DEL_D6_EN_EL_PACK, ARISTA_DE_LOS_DADOS / ARISTA_DEL_D6_EN_EL_PACK, ARISTA_DE_LOS_DADOS / ARISTA_DEL_D6_EN_EL_PACK]} raycast={() => null} />
          ) : (
            <>
              <mesh geometry={geometrias.dadoCuerpo} material={materiales.dadoCuerpo} raycast={() => null} />
              <mesh geometry={geometrias.dadoPuntos} material={materiales.dadoPuntos} raycast={() => null} />
            </>
          )}
        </group>
      ))}
      {dados?.porTirar === true ? (
        <mesh position={[0, SUELO_DE_DADOS.y + ALTO_DEL_ASA_DE_LOS_DADOS / 2, 0]} geometry={geometrias.asaDeDados} material={materiales.asa} onPointerDown={empiezaElToque} onPointerUp={tocaLosDados} />
      ) : null}

      {/* El naipe de la carta, pegado a la cámara, en su capa. */}
      <group ref={naipeGrupo} visible={false} renderOrder={ORDEN_DE_LAS_CARTAS}>
        <mesh ref={naipe} geometry={geometrias.naipe} material={materiales.naipePregon} renderOrder={ORDEN_DE_LAS_CARTAS} onPointerDown={cierraElNaipe} />
      </group>

      {/* El aventurero en pie: uno, y sólo con marioneta. */}
      {plena && asientoEnPie !== null && cargadoEnPie !== undefined && refEnPie !== undefined && biblioteca.length > 0 ? (
        <Aventurero key={asientoEnPie.figura.asiento} estado={refEnPie} cargado={cargadoEnPie} biblioteca={biblioteca} anillo={anillo} />
      ) : null}
      {/* Y el ganador en la plaza, en `fin`. */}
      {plena && ganadorEnPlaza && cargadoDelGanador !== undefined && biblioteca.length > 0 ? (
        <Aventurero key="ganador" estado={estadoDelGanador} cargado={cargadoDelGanador} biblioteca={biblioteca} anillo={anilloDeLaPlaza} />
      ) : null}
    </>
  );
}

/** Para el banco y el comprobador: las capacidades de las mallas instanciadas y la matriz de una puesta. */
export { CAPACIDAD, matrizDelBurgo };
