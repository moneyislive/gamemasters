/**
 * EL BANCO DE LA MATERIA: las cuatro superficies del prototipo (muros de sillar, ladrillo y revoco;
 * acera, bordillo, asfalto y plaza; el costado de un coche) pintadas con los materiales REALES de hoy, a
 * la izquierda tal cual y a la derecha con la materia cableada a mano (`prueba.ts`), desde cinco
 * distancias. Es la misma escena, con las mismas cámaras y luces, que `mat-analitico/banco/vista.mjs`
 * del plan, para ponerla al lado de sus `vista-n*.png`.
 *
 *   /sala/banco-quiebro-materia.html?nivel=0..3&expo=3
 *   /sala/banco-quiebro-materia.html?prueba=barniz        (lo lee `verify:quiebro-materia`, g)
 *
 * ═══ `prueba=barniz` ═══
 *
 * Pinta el coche con la carrocería de la materia seis veces por nivel, a un blanco de coma flotante, y
 * compara los píxeles:
 *
 *   · A: con el lóbulo de barniz y las superficies con barniz 0 (forzado por el banco);
 *   · B: igual, SIN el lóbulo (quitado del retoque);
 *   · C: la VACUNA, con el lóbulo y barniz 1 forzado;
 *   · A0: el coche SIN la marca de barniz y sin forzar nada: el barniz es el que devuelva la familia;
 *   · B0: igual, sin el lóbulo;
 *   · V0: la VACUNA DEL STUB: como A0, pero el reparto devuelve la carrocería con barniz 1.
 *
 * Con barniz 0 el lóbulo no puede cambiar el color: A tiene que ser B. Sin la marca, la familia no puede
 * poner barniz: A0 tiene que ser B0 (un stub que devolviera barniz 1 lo rompería, y V0 lo enseña). Si C o
 * V0 salieran iguales que A o A0, la comparación no estaría mirando.
 *
 * Las seis opciones tocan SÓLO el retoque de la materia (`prueba.ts`): el barniz forzado va en
 * `recordarSuperficieQ`, la vacuna del stub en el reparto y «sin lóbulo» quita el lóbulo. Así valen igual
 * con el mobiliario cableado a mano de hoy que con el de la ola 2, que ya traerá la materia: entonces se
 * le sustituye su retoque `materia-*` por el mismo con las opciones.
 *
 * Además PINTA las cinco superficies de prueba en los cuatro niveles y pregunta a GL si su programa
 * enlazó (`compile` no mira el enlace en three r185: `onShaderError` sólo salta al usar el programa), y
 * pinta una fachada con una línea que no es GLSL, que tiene que dar exactamente un error. Deja el
 * resultado en JSON en `#resultado-materia`.
 *
 * El banco no dice de qué árbol sale: eso lo comprueba el comprobador preguntando al servidor por un
 * fichero de SU árbol (`/sala/@fs/…`), que un Vite de otro worktree no sirve.
 */
import * as THREE from 'three';
import { FALLOS_DEL_PARCHEO, parchear } from '../../atmosfera/parcheo';
import { UNIFORMES_DE_LA_CIUDAD } from '../retoques';
import type { NivelDeLaCiudad } from '../tipos';
import { FAMILIA, acabado } from './familias';
import { SUPERFICIES_DE_PRUEBA, materialConMateria, materialDeHoy } from './prueba';
import type { OpcionesDePrueba, SuperficieDePrueba } from './prueba';

const consulta = new URLSearchParams(location.search);
const nivelPedido = Number(consulta.get('nivel') ?? 3);
const NIVEL: NivelDeLaCiudad = nivelPedido === 0 || nivelPedido === 1 || nivelPedido === 2 ? nivelPedido : 3;
const EXPO = Number(consulta.get('expo') ?? 3);

const errores: string[] = [];

/* ═══════════════════════════════ LA ESCENA DEL PROTOTIPO ═══════════════════════════════ */

type Atributos = Readonly<Record<string, readonly number[]>>;

/** Un cuadrilátero (a, b, c, d en sentido antihorario visto desde la normal) con atributos constantes. */
function cuadro(
  a: readonly number[],
  b: readonly number[],
  c: readonly number[],
  d: readonly number[],
  n: readonly number[],
  uv: readonly (readonly number[])[],
  atributos: Atributos,
): THREE.BufferGeometry {
  const esquinas = [a, b, c, a, c, d];
  const uvs = [uv[0], uv[1], uv[2], uv[0], uv[2], uv[3]] as (readonly number[])[];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(esquinas.flat(), 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(esquinas.flatMap(() => [...n]), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs.flat(), 2));
  for (const [nombre, valor] of Object.entries(atributos)) {
    g.setAttribute(nombre, new THREE.Float32BufferAttribute(esquinas.flatMap(() => [...valor]), valor.length));
  }
  return g;
}

function muro(x0: number, x1: number, cara: readonly number[], volumen: readonly number[], planta: readonly number[]): THREE.BufferGeometry {
  const l = x1 - x0;
  return cuadro([x0, 0, 0], [x1, 0, 0], [x1, 14, 0], [x0, 14, 0], [0, 0, 1], [[0, 0], [l, 0], [l, 14], [0, 14]], {
    aCara: cara,
    aVolumen: volumen,
    aPlanta: planta,
  });
}

function losa(x0: number, z0: number, x1: number, z1: number, y: number, atributos: Atributos): THREE.BufferGeometry {
  return cuadro([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], [[x0, z1], [x1, z1], [x1, z0], [x0, z0]], atributos);
}

/** Hoy, con la materia, o con la materia y el coche SIN la marca de barniz (la prueba de la familia). */
type Lado = 'hoy' | 'materia' | 'materia-sin-marca';

interface Pieza {
  readonly superficie: SuperficieDePrueba;
  readonly geometria: (lado: Lado) => THREE.BufferGeometry;
}

const ISLA = { aIsla: [-30, -10, 30, 3], aSuelo: [0] };
const CALLE = { aTramo: [1, 9, -30, 30], aCalle: [12, 3, 0, 0] };
const PLAZA = { aIsla: [-60, -10, -30, 70], aSuelo: [1] };
const GRIS_DEL_COCHE = [0.62, 0.63, 0.62];
const ACABADO_DE_HOY = [0.2, 0.12];
const ACABADO_CON_MATERIA = acabado(FAMILIA.carroceria, 0.2, 0.12, { barniz: true });
const ACABADO_SIN_LA_MARCA = acabado(FAMILIA.carroceria, 0.2, 0.12);

function acabadoDe(lado: Lado): Atributos {
  return { aAcabado: lado === 'hoy' ? ACABADO_DE_HOY : lado === 'materia' ? ACABADO_CON_MATERIA : ACABADO_SIN_LA_MARCA, color: GRIS_DEL_COCHE };
}

const costadoDelCoche = (lado: Lado): THREE.BufferGeometry =>
  cuadro([10, 0.32, 6.7], [14.4, 0.32, 6.7], [14.4, 0.95, 6.7], [10, 0.95, 6.7], [0, 0, 1], [[-2.2, 0.32], [2.2, 0.32], [2.2, 0.95], [-2.2, 0.95]], acabadoDe(lado));
const techoDelCoche = (lado: Lado): THREE.BufferGeometry => losa(10, 5.0, 14.4, 6.7, 0.95, acabadoDe(lado));

const PIEZAS: readonly Pieza[] = [
  { superficie: 'fachada', geometria: () => muro(0, 8, [8, 0, 4321, 0], [4.5, 14, 0.5, 3.2], [3.1, 3]) },
  { superficie: 'fachada', geometria: () => muro(8, 16, [8, 1, 5555, 0], [4.5, 14, 0.3, 2.8], [3.0, 3]) },
  { superficie: 'fachada', geometria: () => muro(16, 26, [10, 4, 7777, 0], [4.5, 14, 0.6, 3.3], [3.2, 1]) },
  { superficie: 'acera', geometria: () => losa(-30, 0, 30, 3, 0.15, ISLA) },
  {
    superficie: 'acera',
    geometria: () => cuadro([-30, 0, 3], [30, 0, 3], [30, 0.15, 3], [-30, 0.15, 3], [0, 0, 1], [[0, 0], [60, 0], [60, 0.15], [0, 0.15]], ISLA),
  },
  { superficie: 'asfalto', geometria: () => losa(-30, 3, 30, 70, 0, CALLE) },
  { superficie: 'acera', geometria: () => losa(-60, -10, -30, 70, 0.15, PLAZA) },
  { superficie: 'mobiliario', geometria: costadoDelCoche },
  { superficie: 'mobiliario', geometria: techoDelCoche },
];

const VISTAS: readonly { ojo: readonly [number, number, number]; mira: readonly [number, number, number] }[] = [
  { ojo: [3.2, 1.7, 1.2], mira: [3.9, 0.8, 0] },
  { ojo: [11.5, 1.7, 1.0], mira: [12.4, 1.9, 0] },
  { ojo: [12, 1.7, 11], mira: [11, 2.2, 0] },
  { ojo: [10, 1.7, 48], mira: [10, 4, 0] },
  { ojo: [-14, 1.7, 2.2], mira: [26, 3.0, -0.4] },
];

/** Las luces de `vista.mjs`: la dirigida, el hemisferio y las farolas reales de N2 (4) y N3 (6). */
function ponerLasLuces(escena: THREE.Scene, nivel: NivelDeLaCiudad): void {
  const dirigida = new THREE.DirectionalLight(new THREE.Color(0.62, 0.7, 0.76), 0.12);
  dirigida.position.set(0.3, 1, 0.2);
  escena.add(dirigida, dirigida.target);
  escena.add(new THREE.HemisphereLight(new THREE.Color(0.11, 0.21, 0.2), new THREE.Color(0.04, 0.025, 0.016), 0.22));
  const farolas: readonly (readonly [number, number, number])[] = [
    [6, 5.5, 3.5],
    [18, 5.5, 3.5],
    [30, 5.5, 3.5],
    [-6, 5.5, 3.5],
    [6, 5.5, 20],
    [18, 5.5, 20],
  ];
  const cuantas = nivel === 3 ? 6 : nivel === 2 ? 4 : 0;
  for (const f of farolas.slice(0, cuantas)) {
    const luz = new THREE.PointLight(new THREE.Color(1.0, 0.55, 0.2), 30, 26, 2);
    luz.position.set(f[0], f[1], f[2]);
    escena.add(luz);
  }
  escena.fog = new THREE.Fog(new THREE.Color(0.03, 0.045, 0.044), 1, 1000);
}

/** La luz de la calle horneada de `vista.mjs`: el sodio bajo tres farolas, en [-10, 40]². */
function ponerLaLuzDeLaCalle(): void {
  const LC = new Uint8Array(64 * 64 * 4);
  for (let j = 0; j < 64; j++) {
    for (let i = 0; i < 64; i++) {
      const x = -10 + ((i + 0.5) * 50) / 64;
      const z = -10 + ((j + 0.5) * 50) / 64;
      let a = 0;
      for (const fx of [6, 18, 30]) a += Math.exp(-((x - fx) ** 2 + (z - 3.5) ** 2) / 18);
      const k = (j * 64 + i) * 4;
      LC[k] = 6;
      LC[k + 1] = 7;
      LC[k + 2] = 8;
      LC[k + 3] = Math.min(255, a * 120);
    }
  }
  const t = new THREE.DataTexture(LC, 64, 64, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  UNIFORMES_DE_LA_CIUDAD.uLuzCalle.value = t;
  UNIFORMES_DE_LA_CIUDAD.uLuzCalleCaja.value.set(-10, -10, 1 / 50, 1 / 50);
  UNIFORMES_DE_LA_CIUDAD.uOclusionCaja.value.set(-100, -100, 1 / 200, 1 / 200);
  UNIFORMES_DE_LA_CIUDAD.uTiempo.value = 3;
  UNIFORMES_DE_LA_CIUDAD.uHumedad.value = 0.5;
}

function crearElPintor(ancho: number, alto: number): THREE.WebGLRenderer {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  document.body.appendChild(lienzo);
  const pintor = new THREE.WebGLRenderer({ canvas: lienzo, antialias: false, preserveDrawingBuffer: true });
  pintor.setPixelRatio(1);
  pintor.setSize(ancho, alto, false);
  pintor.toneMapping = THREE.ACESFilmicToneMapping;
  pintor.toneMappingExposure = EXPO;
  /* El fondo de `vista.mjs` se borraba en el espacio de la pantalla, sin pasar a sRGB. */
  pintor.setClearColor(new THREE.Color().setRGB(0.02, 0.03, 0.03, THREE.SRGBColorSpace), 1);
  pintor.debug.checkShaderErrors = true;
  pintor.debug.onShaderError = (gl, programa, vertice, fragmento): void => {
    const registro = [gl.getProgramInfoLog(programa), gl.getShaderInfoLog(vertice), gl.getShaderInfoLog(fragmento)]
      .map((x) => (x ?? '').trim())
      .filter((x) => x !== '')
      .join(' / ');
    recolector.push(`enlace: ${registro.slice(0, 300)}`);
  };
  return pintor;
}

/*
 * Dónde van los errores de enlace. Por defecto, a `errores` (que el comprobador exige vacío); durante la
 * vacuna del enlace, a su propia lista. `onShaderError` sólo salta la PRIMERA vez que three usa el programa
 * (al pintar): `compile` no lo mira.
 */
let recolector: string[] = errores;

/**
 * ¿Enlazó en la GPU el programa con el que se acaba de pintar este material? Se pregunta a GL por el
 * programa que three le ha puesto, no se deduce de que no haya saltado nada.
 */
function enlazado(pintor: THREE.WebGLRenderer, material: THREE.Material): boolean {
  const propiedades = pintor.properties.get(material) as { currentProgram?: { program?: WebGLProgram } } | undefined;
  const programa = propiedades?.currentProgram?.program;
  if (programa === undefined) return false;
  const gl = pintor.getContext();
  return gl.getProgramParameter(programa, gl.LINK_STATUS) === true;
}

function escribirElResultado(resultado: unknown): void {
  const pre = document.createElement('pre');
  pre.id = 'resultado-materia';
  pre.style.display = 'none';
  pre.textContent = JSON.stringify(resultado);
  document.body.appendChild(pre);
  document.title = 'listo';
}

/* ═══════════════════════════════ LA VISTA ═══════════════════════════════ */

function vista(): void {
  ponerLaLuzDeLaCalle();
  const pintor = crearElPintor(1280, 1800);
  pintor.autoClear = false;
  const escenas = { hoy: new THREE.Scene(), materia: new THREE.Scene() };
  const faltan: string[] = [];
  const materiales = new Map<string, THREE.Material>();
  for (const lado of ['hoy', 'materia'] as const) {
    const escena = escenas[lado];
    ponerLasLuces(escena, NIVEL);
    for (const p of PIEZAS) {
      const llave = `${lado}/${p.superficie}`;
      let m = materiales.get(llave);
      if (m === undefined) {
        if (lado === 'hoy') m = materialDeHoy(p.superficie, NIVEL);
        else {
          const hecho = materialConMateria(p.superficie, NIVEL);
          faltan.push(...hecho.faltan);
          m = hecho.material;
        }
        materiales.set(llave, m);
      }
      const malla = new THREE.Mesh(p.geometria(lado), m);
      malla.frustumCulled = false;
      escena.add(malla);
    }
  }
  const camara = new THREE.PerspectiveCamera(60, 640 / 360, 0.1, 500);
  pintor.setScissorTest(true);
  VISTAS.forEach((v, fila) => {
    camara.position.set(v.ojo[0], v.ojo[1], v.ojo[2]);
    camara.lookAt(v.mira[0], v.mira[1], v.mira[2]);
    camara.updateMatrixWorld();
    (['hoy', 'materia'] as const).forEach((lado, columna) => {
      const x = columna * 640;
      const y = (4 - fila) * 360;
      pintor.setViewport(x, y, 640, 360);
      pintor.setScissor(x, y, 640, 360);
      pintor.clear();
      pintor.render(escenas[lado], camara);
    });
  });
  const rotulo = document.createElement('pre');
  rotulo.id = 't';
  rotulo.textContent = [
    `N${String(NIVEL)} · izquierda HOY, derecha MATERIA (cableada a mano, prueba.ts) · filas: sillar a 1,2 m, ladrillo a 1 m, 8 m, 40 m, muros a ras de 14 a 40 m · exposición ${String(EXPO)}`,
    `programas ${String(pintor.info.programs?.length ?? 0)} · ${[...errores, ...faltan, ...FALLOS_DEL_PARCHEO].join(' | ') || 'sin errores'} · ${location.host}`,
  ].join('\n');
  document.body.appendChild(rotulo);
  escribirElResultado({ modo: 'vista', nivel: NIVEL, errores, faltan, fallosDelParcheo: FALLOS_DEL_PARCHEO });
}

/* ═══════════════════════════════ LA PRUEBA DEL BARNIZ ═══════════════════════════════ */

interface MedidaDelBarniz {
  readonly nivel: NivelDeLaCiudad;
  /** Píxeles del coche (distintos del fondo en A). */
  readonly pixelesDelCoche: number;
  /** La mayor diferencia por canal entre A (con lóbulo) y B (sin lóbulo), con barniz 0. */
  readonly maxAB: number;
  /** Píxeles que cambian más de 1e-3 entre A y la vacuna C (barniz 1). */
  readonly cambianConLaVacuna: number;
  /** La mayor diferencia entre A0 y B0: la familia sin la marca de barniz y sin forzar nada, con y sin lóbulo. */
  readonly maxSinMarca: number;
  /** Píxeles que cambian entre A0 y V0, la vacuna del stub (la carrocería con barniz 1 sin la marca). */
  readonly cambianConElStubRoto: number;
}

const LADO_DEL_BLANCO = 192;

function pintarAlBlanco(pintor: THREE.WebGLRenderer, escena: THREE.Scene, camara: THREE.Camera, blanco: THREE.WebGLRenderTarget): Float32Array {
  pintor.setRenderTarget(blanco);
  pintor.clear();
  pintor.render(escena, camara);
  const px = new Float32Array(LADO_DEL_BLANCO * LADO_DEL_BLANCO * 4);
  pintor.readRenderTargetPixels(blanco, 0, 0, LADO_DEL_BLANCO, LADO_DEL_BLANCO, px);
  pintor.setRenderTarget(null);
  return px;
}

function barniz(): void {
  ponerLaLuzDeLaCalle();
  const pintor = crearElPintor(LADO_DEL_BLANCO, LADO_DEL_BLANCO);
  pintor.setClearColor(new THREE.Color(0, 0, 0), 0);
  const blanco = new THREE.WebGLRenderTarget(LADO_DEL_BLANCO, LADO_DEL_BLANCO, { type: THREE.FloatType });
  const camara = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camara.position.set(12.9, 1.9, 9.4);
  camara.lookAt(12.2, 0.7, 6.2);
  camara.updateMatrixWorld();
  const medidas: MedidaDelBarniz[] = [];
  const faltan: string[] = [];
  /** La mayor diferencia por canal, y cuántos píxeles cambian más de 1e-3. */
  const comparar = (X: Float32Array, Y: Float32Array): { max: number; cambian: number } => {
    let max = 0;
    let cambian = 0;
    for (let i = 0; i < X.length; i += 4) {
      let d = 0;
      for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs((X[i + k] as number) - (Y[i + k] as number)));
      max = Math.max(max, d);
      if (d > 1e-3) cambian++;
    }
    return { max, cambian };
  };
  for (const nivel of [0, 1, 2, 3] as const) {
    const pintar = (opciones: OpcionesDePrueba, lado: Lado): Float32Array => {
      const hecho = materialConMateria('mobiliario', nivel, opciones);
      faltan.push(...hecho.faltan);
      const escena = new THREE.Scene();
      ponerLasLuces(escena, nivel);
      for (const g of [costadoDelCoche(lado), techoDelCoche(lado)]) escena.add(new THREE.Mesh(g, hecho.material));
      return pintarAlBlanco(pintor, escena, camara, blanco);
    };
    /* El lóbulo, con el barniz forzado por el banco (0, y la vacuna 1). */
    const A = pintar({ barnizForzado: 0 }, 'materia');
    const B = pintar({ barnizForzado: 0, sinBarniz: true }, 'materia');
    const C = pintar({ barnizForzado: 1 }, 'materia');
    /* La familia, sin forzar nada y SIN la marca de barniz: lo que ella devuelva; y la vacuna del stub roto. */
    const A0 = pintar({}, 'materia-sin-marca');
    const B0 = pintar({ sinBarniz: true }, 'materia-sin-marca');
    const V0 = pintar({ familiaConBarnizDeVacuna: true }, 'materia-sin-marca');
    let coche = 0;
    for (let i = 0; i < A.length; i += 4) if ((A[i + 3] as number) > 0) coche++;
    medidas.push({
      nivel,
      pixelesDelCoche: coche,
      maxAB: comparar(A, B).max,
      cambianConLaVacuna: comparar(A, C).cambian,
      maxSinMarca: comparar(A0, B0).max,
      cambianConElStubRoto: comparar(A0, V0).cambian,
    });
  }
  /*
   * Y que las cinco superficies de prueba ENLAZAN en la GPU en los cuatro niveles. Se PINTAN (three sólo
   * mira el enlace la primera vez que usa el programa; `compile` no lo mira) y a cada una se le pregunta a
   * GL por el programa con el que se pintó. Sólo cuentan las que enlazan sin error.
   */
  const compiladas: string[] = [];
  const sinEnlazar: string[] = [];
  const gl = pintor.getContext();
  const pintarUna = (material: THREE.Material, geometria: THREE.BufferGeometry, nivel: NivelDeLaCiudad): boolean => {
    const antes = recolector.length;
    const escena = new THREE.Scene();
    ponerLasLuces(escena, nivel);
    escena.add(new THREE.Mesh(geometria, material));
    try {
      pintarAlBlanco(pintor, escena, camara, blanco);
    } catch (e) {
      recolector.push(`al pintar: ${e instanceof Error ? e.message : String(e)}`);
    }
    return recolector.length === antes && enlazado(pintor, material);
  };
  for (const nivel of [0, 1, 2, 3] as const) {
    for (const s of SUPERFICIES_DE_PRUEBA) {
      const hecho = materialConMateria(s, nivel);
      faltan.push(...hecho.faltan);
      const pieza = PIEZAS.find((p) => p.superficie === s) ?? PIEZAS[0];
      if (pintarUna(hecho.material, (pieza as Pieza).geometria('materia'), nivel)) compiladas.push(`${s}-n${String(nivel)}`);
      else sinEnlazar.push(`${s}-n${String(nivel)}`);
    }
  }
  const errorDeGl = gl.getError();
  /*
   * LA VACUNA DEL ENLACE: una fachada de N1 con una línea que no es GLSL. Tiene que dar EXACTAMENTE un error
   * de enlace y no contar como enlazada; si no, la cuenta de arriba no está mirando.
   */
  const erroresDeLaVacuna: string[] = [];
  recolector = erroresDeLaVacuna;
  const rota = materialConMateria('fachada', 1).material;
  parchear(rota, { nombre: 'vacuna-glsl-roto', orden: 200, fragmento: [{ buscar: '#include <aomap_fragment>', como: 'antes', texto: 'esto no es glsl;' }] });
  const laVacunaEnlaza = pintarUna(rota, (PIEZAS[0] as Pieza).geometria('materia'), 1);
  recolector = errores;
  /* El programa roto deja errores de GL al dibujar: se vacían para no ensuciar a nadie. */
  for (let k = 0; k < 16 && gl.getError() !== gl.NO_ERROR; k++);
  escribirElResultado({
    modo: 'barniz',
    medidas,
    compiladas,
    sinEnlazar,
    vacunaDelEnlace: { errores: erroresDeLaVacuna.length, enlaza: laVacunaEnlaza, primero: (erroresDeLaVacuna[0] ?? '').slice(0, 160) },
    errores,
    faltan,
    fallosDelParcheo: FALLOS_DEL_PARCHEO,
    programas: pintor.info.programs?.length ?? 0,
    errorDeGl,
  });
}

try {
  if (consulta.get('prueba') === 'barniz') barniz();
  else vista();
} catch (e) {
  errores.push(`excepción: ${e instanceof Error ? e.message : String(e)}`);
  escribirElResultado({ modo: 'roto', errores });
}
