/**
 * EL TABLERO DE LAS LINDES, EN TRES DIMENSIONES.
 *
 * ═══ QUÉ MONTA, Y EN QUÉ ORDEN ═══
 *
 *  1. EL SUELO. Una sola geometría con todas las losas puestas y su faldón, de
 *     `suelo.ts`. Una llamada de dibujo para el tablero entero.
 *  2. LAS PIEZAS. Todo lo que `losa.ts` decidió poner, agrupado POR MODELO en una
 *     `InstancedMesh` cada uno. Cuarenta llamadas para mil quinientas piezas.
 *  3. LOS LABRIEGOS, que son la única pieza propia: un peón torneado que se tiñe
 *     con el color del asiento (ver `labriego.ts`).
 *  4. LAS CASILLAS DONDE CABE LA LOSA DE LA MANO, que son lo único que se toca, y
 *     el FANTASMA de la losa sobre la que se está señalando.
 *
 * ═══ LO QUE ESTA ESCENA NO SABE ═══
 *
 * A qué se juega. Recibe un tablero de losas cuadradas —cuáles hay, con qué giro,
 * quién tiene un labriego dónde y en qué casillas cabe la siguiente— y devuelve
 * toques. Ni una regla, ni un turno, ni una puntuación. Quien traduce la partida a
 * esto es `shared/arcade/juegos/lindes-en-tres.ts`, y vive en `shared/` para que
 * la traducción sea UNA y no una por cliente.
 *
 * ═══ EL NIVEL DE DETALLE NO ES UN AHORRO: ES LA CONDICIÓN ═══
 *
 * Setenta y dos losas con todo puesto pasan del techo de triángulos de un PC, y la
 * cuenta está en `medidas.ts`. Así que el relleno —árboles, matas, casas— se monta
 * sólo dentro de un radio alrededor de donde mira la cámara, y lo que cuenta una
 * regla —murallas, ermitas, labriegos— se monta SIEMPRE. Un tablero sin árboles
 * lejos sigue siendo el tablero; un tablero sin la muralla de una villa cerrada es
 * el tablero mintiendo.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { abrirGlb } from '../embarcadero/cargar';
import { ALTURA_DE_UNA_PERSONA, ESCALA_DEL_PACK } from '../escala';
import { rutaDelTablero } from '../ruta-de-modelos';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import { LADO_DE_LOSA } from './medidas';
import { LO_QUE_NO_SE_RECORTA, montarLaLosa, semillaDeLaLosa } from './losa';
import type { PuestaEnLaLosa } from './losa';
import { COLOR_DE_LA_MESA, geometriaDeLaMesa, geometriaDeLosHuecos, geometriaDelSuelo } from './suelo';
import type { LosaQueSePinta } from './suelo';
import { geometriaDeLaPeana, geometriaDelLabriego } from './labriego';
import { ALTO_DEL_LABRIEGO } from './medidas';
import {
  QUIETO,
  camaraDeHombro,
  camaraDeMesa,
  camaraDeOjos,
  loQueAbarca,
  nacerEn,
  nacerEnLaLosa,
  unPaso,
} from './paseo';
import type { Mandos, Paseante } from './paseo';
import type { PropsDeLasLindes } from './tipos';
import type { Giro } from '../../shared/arcade/juegos/lindes-losas';
import { llaveDeCasilla } from '../../shared/arcade/juegos/lindes-losas';
import { MINIMO_PARA_GIRAR } from '../camara';
import {
  INCLINACION_DE_LA_MANO,
  loQueHaCaido,
  sitioDeLaMano,
  sitioDelRelojDeLaBolsa,
} from './rincones';
import { ALTO_DEL_RELOJ_EN_LADOS, RelojDeArena } from '../reloj';
import { QuienAnda } from './quien-anda';

/* ─────────────────────────────── Constantes ─────────────────────────────── */

/** Cuánto se espera a que lleguen los modelos antes de enseñar lo que haya. */
const TOPE_DE_ARRANQUE_MS = 15_000;

/** El cielo de una mañana de siega: azul arriba, paja en el horizonte. */
const COLOR_DEL_CIELO = '#8cb8de';
const COLOR_DE_LA_NIEBLA = '#cfdae2';

/**
 * LOS DOS ANILLOS DE DETALLE, en losas alrededor de donde mira la cámara.
 *
 * ═══ POR QUÉ DOS Y NO UNO ═══
 *
 * Con uno solo hay que elegir entre un tablero pelado de cerca o uno que no cabe de
 * lejos. Con dos, lo que desaparece primero es lo que primero deja de verse:
 *
 *     hasta 1,8 losas .... todo, hasta el último barril
 *     hasta 4 losas ...... lo que tiene bulto: casas, edificios, árboles, mieses
 *     más allá ........... sólo lo que cuenta una regla: murallas, torres, ermitas
 *
 * Los dos números salieron de MEDIR, no de elegir: con siete y dos con seis, un
 * tablero de nueve por nueve pintaba cuatro millones y medio de triángulos contra un
 * techo de tres. `verify:lindes-escena` hace esa cuenta con los triángulos reales del
 * `.glb` y es la que manda.
 *
 * La tercera línea es la que no se puede tocar. Un tablero sin árboles al fondo
 * sigue siendo el tablero; uno sin la muralla de una villa cerrada es el tablero
 * mintiendo sobre la partida, y eso se paga en una jugada mal hecha.
 */
const LOSAS_CON_MENUDO = 1.8;
const LOSAS_CON_RELLENO = 4;

/** Lo que se levanta la última losa puesta, para que se vea cuál es. */
const ALTO_DE_LA_ULTIMA = LADO_DE_LOSA * 0.03;

/*
 * ═══ LA LOSA DE LA MANO, PEGADA A LA CÁMARA ═══
 *
 * La pieza que toca poner, EN TRES DIMENSIONES y en una esquina del lienzo: se ve la losa
 * de verdad —su villa, sus caminos, sus casas, sus árboles— en lugar de leer «La puerta de
 * la villa · N muralla · E senda» en un renglón y tener que imaginársela.
 *
 * ═══ POR QUÉ COLGADA DE LA CÁMARA Y NO EN UN RINCÓN DEL MUNDO ═══
 *
 * Porque el tablero CRECE y la cámara se aleja con él: cualquier sitio del mundo que hoy
 * caiga en una esquina del encuadre, con setenta losas puestas cae en medio o fuera.
 * Colgada de la cámara ocupa siempre el mismo trozo de pantalla, que es lo que una pieza
 * en la mano tiene que hacer. Es la misma decisión que la bandeja de los dados del Burgo,
 * y por el mismo motivo.
 *
 * ═══ Y POR QUÉ NO ES UN SEGUNDO LIENZO ═══
 *
 * Porque un `<Canvas>` aparte serían DOS contextos de WebGL en la misma pantalla, y en
 * esta casa ya está apuntado lo que pasa con eso en un móvil: el navegador tira uno de los
 * dos y la escena desaparece sin que falle nada. Un grupo más en el lienzo que ya hay no
 * cuesta ni un contexto ni una llamada de dibujo por losa.
 *
 * DÓNDE VA EXACTAMENTE no se decide aquí: está en `mano.ts`, que es aritmética sin
 * `three` y por tanto lo único de esto que un comprobador puede mirar desde Node.
 */

/* ───────────────────────────────── Ayudas ───────────────────────────────── */

/** Una parte de un modelo, ya lista para instanciar. */
interface ParteDelModelo {
  readonly geometria: THREE.BufferGeometry;
  readonly material: THREE.Material;
}

/**
 * LAS PARTES DE UN MODELO DEL PACK, en coordenadas del modelo.
 *
 * Un nodo del `.glb` puede traer varias mallas dentro con materiales distintos
 * —una casa con su tejado y su pared—, así que se aplanan todas y se guarda cada
 * una con SU material y SU matriz ya aplicada. Instanciar un grupo entero no se
 * puede; instanciar cada malla suelta sí.
 */
function partesDe(nodo: THREE.Object3D): ParteDelModelo[] {
  const partes: ParteDelModelo[] = [];
  nodo.updateWorldMatrix(true, true);
  const inversa = new THREE.Matrix4().copy(nodo.matrixWorld).invert();
  nodo.traverse((hijo) => {
    const malla = hijo as THREE.Mesh;
    if (!malla.isMesh || malla.geometry === undefined) return;
    const g = malla.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inversa, malla.matrixWorld));
    const material = Array.isArray(malla.material) ? malla.material[0] : malla.material;
    if (material === undefined) return;
    partes.push({ geometria: g, material });
  });
  return partes;
}

/** Cuántos triángulos tiene una geometría. */
function triangulosDe(g: THREE.BufferGeometry): number {
  const indice = g.getIndex();
  if (indice !== null) return indice.count / 3;
  const pos = g.getAttribute('position');
  return pos === undefined ? 0 : pos.count / 3;
}

/* ──────────────────────────── El catálogo cargado ──────────────────────────── */

interface Catalogo {
  readonly partes: ReadonlyMap<string, readonly ParteDelModelo[]>;
  readonly soltar: () => void;
}

function catalogoDe(raiz: THREE.Object3D): Catalogo {
  const partes = new Map<string, readonly ParteDelModelo[]>();
  for (const hijo of raiz.children) {
    if (hijo.name.length === 0) continue;
    partes.set(hijo.name, partesDe(hijo));
  }
  return {
    partes,
    soltar: () => {
      for (const lista of partes.values()) for (const p of lista) p.geometria.dispose();
    },
  };
}

/* ─────────────────────────────── La escena ─────────────────────────────── */

export function Lindes(props: PropsDeLasLindes): JSX.Element {
  const { tablero, codigo, traer, calidad, camara, giroEnMano, quieto } = props;
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const avisado = useRef(false);

  /* ── Los modelos ────────────────────────────────────────────────────────── */
  useEffect(() => {
    let vivo = true;
    let cargado: Catalogo | null = null;
    const reloj = setTimeout(() => {
      if (vivo && !avisado.current) {
        avisado.current = true;
        props.alEstarListo?.();
      }
    }, TOPE_DE_ARRANQUE_MS);

    traer(rutaDelTablero())
      .then((bytes) => abrirGlb(bytes))
      .then((gltf) => {
        if (!vivo) return;
        cargado = catalogoDe(gltf.scene);
        setCatalogo(cargado);
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        const motivo = e instanceof Error ? e.message : String(e);
        setFallo(motivo);
        props.alFallar?.(motivo);
      })
      .finally(() => {
        if (!vivo || avisado.current) return;
        avisado.current = true;
        props.alEstarListo?.();
      });

    return () => {
      vivo = false;
      clearTimeout(reloj);
      cargado?.soltar();
    };
    /* `traer` y los avisos son estables por contrato; el catálogo se pide una vez. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traer]);

  /* ── La semilla del paisaje: la misma mesa, el mismo valle ──────────────── */
  const semilla = useMemo(() => semillaDelCodigo(codigo, 0x5eed), [codigo]);
  /* ── El suelo ───────────────────────────────────────────────────────────── */
  const losasQueSePintan = useMemo<LosaQueSePinta[]>(
    () => tablero.losas.map((l) => ({ x: l.x, y: l.y, losa: l.losa, giro: l.giro })),
    [tablero.losas],
  );
  const suelo = useMemo(() => geometriaDelSuelo(losasQueSePintan), [losasQueSePintan]);
  useEffect(() => () => suelo?.dispose(), [suelo]);
  const mesa = useMemo(() => geometriaDeLaMesa(losasQueSePintan), [losasQueSePintan]);
  useEffect(() => () => mesa?.dispose(), [mesa]);

  /* ── Lo que se pone encima, agrupado por modelo ──────────────────────────── */
  const contenidos = useMemo(() => {
    const salida = new Map<string, { readonly puestas: readonly PuestaEnLaLosa[]; readonly x: number; readonly y: number }>();
    for (const l of tablero.losas) {
      const suya = semillaDeLaLosa(semilla, l.x, l.y);
      salida.set(l.casilla, { puestas: montarLaLosa(l.losa, l.giro, suya).puestas, x: l.x, y: l.y });
    }
    return salida;
  }, [tablero.losas, semilla]);

  /* ── La cámara ──────────────────────────────────────────────────────────── */
  const { camera, size } = useThree();
  const abarca = useMemo(() => loQueAbarca(tablero.losas), [tablero.losas]);
  const puestas = useMemo(() => new Set(tablero.losas.map((l) => l.casilla)), [tablero.losas]);
  const laNiebla = useRef<THREE.Fog>(null);
  const paseante = useRef<Paseante>(nacerEn(0, 0));
  const mandos = useRef<Mandos>(QUIETO);
  const mirandoA = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  /*
   * Quien pasea nace en la última losa puesta, que es donde está pasando algo — pero NO en
   * su centro a ciegas: el centro de una villa es el interior de una casa. Ver
   * `nacerEnLaLosa`, que es donde está el razonamiento y lo que se midió.
   */
  useEffect(() => {
    if (camara.modo === 'mesa') return;
    const ultima = tablero.losas.find((l) => l.ultima) ?? tablero.losas[0];
    if (ultima === undefined) return;
    const virgen =
      paseante.current.andando === 0 && paseante.current.x === 0 && paseante.current.z === 0;
    if (!virgen) return;
    const dentro = montarLaLosa(ultima.losa, ultima.giro, semillaDeLaLosa(semilla, ultima.x, ultima.y));
    paseante.current = nacerEnLaLosa(ultima.x, ultima.y, dentro.celdas, dentro.puestas);
  }, [camara.modo, semilla, tablero.losas]);

  /* Las teclas del paseo. Sólo mientras se pasea: en la mesa no se anda. */
  useEffect(() => {
    if (camara.modo === 'mesa' || typeof document === 'undefined') return;
    const cambia = (e: KeyboardEvent, pulsada: boolean): void => {
      const m = { ...mandos.current };
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') m.adelante = pulsada;
      else if (k === 's' || k === 'arrowdown') m.atras = pulsada;
      else if (k === 'a' || k === 'arrowleft') m.izquierda = pulsada;
      else if (k === 'd' || k === 'arrowright') m.derecha = pulsada;
      else if (k === 'shift') m.deprisa = pulsada;
      else return;
      e.preventDefault();
      mandos.current = m;
    };
    const abajo = (e: KeyboardEvent): void => cambia(e, true);
    const arriba = (e: KeyboardEvent): void => cambia(e, false);
    document.addEventListener('keydown', abajo);
    document.addEventListener('keyup', arriba);
    return () => {
      document.removeEventListener('keydown', abajo);
      document.removeEventListener('keyup', arriba);
      mandos.current = QUIETO;
    };
  }, [camara.modo]);

  useFrame((_, dt) => {
    if (camara.modo === 'mesa') {
      const pose = camaraDeMesa(abarca, size.width / Math.max(1, size.height));
      /*
       * ═══ EL PLANO DE FONDO LO DICE LA POSE, Y SE PONE ANTES DE MOVER NADA ═══
       *
       * Estaba escrito a mano en quien monta la escena —`far: 6000`— y valía mientras el
       * tablero fuera pequeño: con un tablero largo en una pantalla estrecha la cámara se
       * va a cuatro mil y la esquina de allá queda a seis mil trescientos, o sea detrás del
       * fondo. El tablero entero desaparece, se ve cielo, y no hay ni un error en la
       * consola. Quien sabe a qué distancia se pone la cámara es `camaraDeMesa`, así que es
       * ella la que dice hasta dónde hay que ver.
       */
      const camaraDeVerdad = camera as THREE.PerspectiveCamera;
      if (camaraDeVerdad.isPerspectiveCamera === true && camaraDeVerdad.far < pose.lejos) {
        camaraDeVerdad.far = pose.lejos;
        camaraDeVerdad.updateProjectionMatrix();
      }
      /* Y la niebla, detrás del tablero: mirando la mesa no da profundidad, se lo come. */
      const n = laNiebla.current;
      if (n !== null) {
        n.near = pose.niebla.cerca;
        n.far = pose.niebla.lejos;
      }
      if (quieto === true) camera.position.set(pose.x, pose.y, pose.z);
      /* Si no, se acerca poco a poco: el tablero crece y un salto de cámara marea. */
      else camera.position.lerp(new THREE.Vector3(pose.x, pose.y, pose.z), Math.min(1, dt * 2.5));
      camera.lookAt(pose.miraX, pose.miraY, pose.miraZ);
      mirandoA.current = { x: pose.miraX, z: pose.miraZ };
      return;
    }
    /*
     * Andando SÍ hace falta la niebla cerca: a ras de suelo es lo único que da idea de
     * cuánto tablero queda por delante. Se le devuelven sus dos números de siempre.
     */
    const nAndando = laNiebla.current;
    if (nAndando !== null) {
      nAndando.near = LADO_DE_LOSA * 8;
      nAndando.far = LADO_DE_LOSA * 34;
    }
    paseante.current = unPaso(paseante.current, mandos.current, dt, puestas);
    const pose = camara.modo === 'ojos' ? camaraDeOjos(paseante.current) : camaraDeHombro(paseante.current);
    camera.position.set(pose.x, pose.y, pose.z);
    camera.lookAt(pose.miraX, pose.miraY, pose.miraZ);
    mirandoA.current = { x: paseante.current.x, z: paseante.current.z };
  });

  /* ── Los toques ─────────────────────────────────────────────────────────── */
  const [senalado, setSenalado] = useState<{ x: number; y: number } | null>(null);
  const huecos = useMemo(() => geometriaDeLosHuecos(tablero.huecos), [tablero.huecos]);
  useEffect(() => () => huecos?.dispose(), [huecos]);

  const casillaDelPunto = useCallback((p: THREE.Vector3) => {
    return { x: Math.round(p.x / LADO_DE_LOSA), y: Math.round(-p.z / LADO_DE_LOSA) };
  }, []);

  /*
   * ═══ EL TOQUE ES `pointerdown` + `pointerup`, Y NO `onClick` ═══
   *
   * Esto era un `onClick` y en la app NO SE PODÍA PONER UNA LOSA — o sea, no se podía
   * jugar—. Los `pointermove` sí llegaban: el fantasma aparecía y el botón de girar se
   * encendía. Lo que no llegaba nunca era el `click`, porque React Native Web llama a
   * `preventDefault` en el `pointerdown` para su propio sistema de gestos y entonces el
   * navegador no sintetiza el `click`. Con ratón, en el escritorio, sí lo sintetiza, y por
   * eso allí funcionaba y aquí no: el mismo código, el mismo servidor, dos resultados.
   *
   * `Lindes.tsx` era el ÚNICO sitio de `escenas/` que usaba `onClick`; las otras veintiuna
   * asas de esta casa usan `onPointerDown`/`onPointerUp`, y ahora se ve por qué.
   *
   * ═══ Y UN TOQUE NO ES UN ARRASTRE ═══
   *
   * Con el dedo, girar la cámara empieza igual que tocar: bajando el puntero sobre el
   * tablero. Si `pointerup` pusiera la losa a secas, cada giro de cámara colocaría una. Se
   * guarda dónde bajó y sólo cuenta como toque si subió cerca —`MINIMO_PARA_GIRAR`, el
   * mismo umbral que usa el Burgo y que vive en `escenas/camara.ts`— y en la misma casilla.
   */
  const bajoEn = useRef<{ x: number; y: number; casilla: string } | null>(null);
  const alBajar = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.nativeEvent.button !== undefined && e.nativeEvent.button !== 0) return;
      e.stopPropagation();
      const donde = casillaDelPunto(e.point);
      bajoEn.current = { x: e.pointer.x, y: e.pointer.y, casilla: llaveDeCasilla(donde.x, donde.y) };
    },
    [casillaDelPunto],
  );

  const alTocar = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const bajo = bajoEn.current;
      bajoEn.current = null;
      if (bajo === null) return;
      if (e.nativeEvent.button !== undefined && e.nativeEvent.button !== 0) return;
      e.stopPropagation();
      const donde = casillaDelPunto(e.point);
      /*
       * El umbral se mide en PUNTOS de pantalla y no en las unidades de r3f, que van de
       * menos uno a uno: en un lienzo ancho, cuatro puntos son una centésima de esa escala.
       */
      const dx = ((e.pointer.x - bajo.x) * size.width) / 2;
      const dy = ((e.pointer.y - bajo.y) * size.height) / 2;
      if (Math.hypot(dx, dy) > MINIMO_PARA_GIRAR) return;
      if (bajo.casilla !== llaveDeCasilla(donde.x, donde.y)) return;
      const cabe = tablero.huecos.filter((h) => h.x === donde.x && h.y === donde.y);
      if (cabe.length === 0) return;
      /*
       * ═══ CON QUÉ GIRO SE PONE, QUE ES LA DECISIÓN DE INTERFAZ DEL JUEGO ═══
       *
       * La pantalla lleva un giro elegido —se cambia con un botón o con la rueda—
       * y aquí se usa ÉSE si cabe. Si no cabe, se pone con el primero que sí, y no
       * se rechaza el toque: quien señala una casilla que admite un solo giro no
       * tiene por qué adivinar cuál era.
       */
      const elegido = cabe.find((h) => h.giro === giroEnMano) ?? cabe[0];
      if (elegido === undefined) return;
      props.alTocarHueco?.(elegido.x, elegido.y, elegido.giro);
    },
    [casillaDelPunto, giroEnMano, props, tablero.huecos, size],
  );

  const alSenalar = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const donde = casillaDelPunto(e.point);
      if (senalado !== null && senalado.x === donde.x && senalado.y === donde.y) return;
      if (!tablero.huecos.some((h) => h.x === donde.x && h.y === donde.y)) return;
      setSenalado(donde);
      props.alSenalarHueco?.(donde.x, donde.y);
    },
    [casillaDelPunto, props, senalado, tablero.huecos],
  );

  /* ── El fantasma de la losa que se va a poner ────────────────────────────── */
  const fantasma = useMemo(() => {
    if (senalado === null || tablero.enMano === '') return null;
    const cabe = tablero.huecos.filter((h) => h.x === senalado.x && h.y === senalado.y);
    if (cabe.length === 0) return null;
    const elegido = cabe.find((h) => h.giro === giroEnMano) ?? cabe[0];
    if (elegido === undefined) return null;
    return {
      x: elegido.x,
      y: elegido.y,
      giro: elegido.giro,
      contenido: montarLaLosa(tablero.enMano, elegido.giro, semilla ^ 0x9e37),
    };
  }, [giroEnMano, semilla, senalado, tablero.enMano, tablero.huecos]);
  const sueloDelFantasma = useMemo(
    () =>
      fantasma === null
        ? null
        : geometriaDelSuelo([{ x: fantasma.x, y: fantasma.y, losa: tablero.enMano, giro: fantasma.giro }]),
    [fantasma, tablero.enMano],
  );
  useEffect(() => () => sueloDelFantasma?.dispose(), [sueloDelFantasma]);

  /* ── La medida, para el comprobador y para el presupuesto ────────────────── */
  const medido = useRef({ fotogramas: 0, ms: 0 });
  const { gl } = useThree();
  useFrame((_, dt) => {
    if (props.alMedir === undefined) return;
    medido.current.fotogramas++;
    medido.current.ms += dt * 1000;
    if (medido.current.fotogramas % 30 !== 0) return;
    props.alMedir({
      triangulos: gl.info.render.triangles,
      llamadas: gl.info.render.calls,
      ms: medido.current.ms / medido.current.fotogramas,
      fotogramas: medido.current.fotogramas,
    });
  });

  /*
   * ═══ SE DEVUELVE UN FRAGMENTO Y NO UN `<group>`, Y NO ES ESTILO ═══
   *
   * `attach="background"` y `attach="fog"` se enganchan al OBJETO PADRE. Dentro de
   * un `<group>` eso escribe `group.background`, que no existe y que a nadie le
   * importa: la escena se queda sin cielo y sin niebla, sin un error en ninguna
   * consola. Con el fragmento, el padre es la escena de verdad.
   *
   * Se ve como un lienzo NEGRO con el tablero dentro, y lo primero que uno piensa
   * es que no se ha pintado nada. Costó un rato y por eso está escrito aquí.
   */
  return (
    <>
      <color attach="background" args={[COLOR_DEL_CIELO]} />
      {/*
        LA NIEBLA LA MUEVE EL FOTOGRAMA, y no estos dos números: en la vista de mesa se
        aparta detrás del tablero y en el paseo se queda cerca, que es donde sirve. Ver
        `camaraDeMesa`. Los `args` son sólo con lo que nace, antes del primer fotograma.
      */}
      <fog ref={laNiebla} attach="fog" args={[COLOR_DE_LA_NIEBLA, LADO_DE_LOSA * 8, LADO_DE_LOSA * 34]} />
      <hemisphereLight args={['#eaf2ff', '#6b6a4a', 1.15]} />
      <directionalLight
        position={[LADO_DE_LOSA * 3, LADO_DE_LOSA * 5, LADO_DE_LOSA * 2]}
        intensity={1.5}
        color="#fff3dd"
      />

      {mesa !== null ? (
        <mesh geometry={mesa} receiveShadow={false}>
          <meshStandardMaterial color={COLOR_DE_LA_MESA} roughness={1} metalness={0} />
        </mesh>
      ) : null}

      {suelo !== null ? (
        <mesh geometry={suelo} receiveShadow={false}>
          <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
        </mesh>
      ) : null}

      {catalogo !== null ? (
        <LoQueSePoneEncima
          catalogo={catalogo}
          contenidos={contenidos}
          mirandoA={mirandoA}
          calidad={calidad}
          ultima={tablero.losas.find((l) => l.ultima)?.casilla ?? ''}
        />
      ) : null}

      <LosLabriegos labriegos={tablero.labriegos} aPie={camara.modo !== 'mesa'} />

      {/*
        QUIEN ANDA, en tercera persona. Sólo mientras se pasea: en la mesa no hay a quién
        seguir, y pintarlo allí sería una figura de dos unidades y media perdida en un
        tablero de mil seiscientas. Ver `quien-anda.tsx` para por qué no existía.
      */}
      {camara.modo === 'mesa' ? null : (
        <QuienAnda
          traer={traer}
          asiento={camara.asiento}
          figura={props.figura}
          paseante={paseante}
          enPrimeraPersona={camara.modo === 'ojos'}
          alFallar={props.alFallar}
        />
      )}

      {huecos !== null ? (
        <mesh geometry={huecos} onPointerDown={alBajar} onPointerUp={alTocar} onPointerMove={alSenalar}>
          <meshStandardMaterial
            color="#f3e7b8"
            transparent
            opacity={0.32}
            roughness={1}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      {catalogo !== null && tablero.enMano !== '' ? (
        <LaLosaEnLaMano catalogo={catalogo} losa={tablero.enMano} giro={giroEnMano} semilla={semilla} />
      ) : null}

      <ElRelojDeLaBolsa
        quedan={tablero.quedan}
        deLaBolsa={tablero.deLaBolsa}
        sePuedePasar={props.sePuedePasar === true}
        alPasar={props.alPasar}
      />

      {sueloDelFantasma !== null && fantasma !== null ? (
        <group position={[0, ALTO_DE_LA_ULTIMA, 0]}>
          <mesh geometry={sueloDelFantasma}>
            <meshStandardMaterial vertexColors transparent opacity={0.72} roughness={1} metalness={0} />
          </mesh>
        </group>
      ) : null}

      {fallo !== null ? null : null}
    </>
  );
}

/* ──────────────────── Las piezas del pack, instanciadas ──────────────────── */

interface LoQueSePoneEncimaProps {
  readonly catalogo: Catalogo;
  readonly contenidos: ReadonlyMap<string, { readonly puestas: readonly PuestaEnLaLosa[]; readonly x: number; readonly y: number }>;
  readonly mirandoA: { current: { x: number; z: number } };
  readonly calidad: string;
  readonly ultima: string;
}

/**
 * TODAS LAS PIEZAS DEL PACK, UNA `InstancedMesh` POR MODELO Y POR MATERIAL.
 *
 * ═══ POR QUÉ SE REPARTE POR MODELO Y NO POR LOSA ═══
 *
 * Porque una llamada de dibujo cuesta lo mismo con una pieza que con mil, y lo que
 * se paga es el número de llamadas. Por losa serían setenta y dos grupos con
 * veinte mallas cada uno: mil cuatrocientas llamadas, y una tarjeta de móvil se
 * arrodilla mucho antes. Por modelo son cuarenta, pase lo que pase en la partida.
 *
 * El precio es que hay que rehacer las matrices cuando cambia el tablero, y eso es
 * recorrer una lista: microsegundos, una vez por losa puesta.
 */
function LoQueSePoneEncima(props: LoQueSePoneEncimaProps): JSX.Element {
  const { catalogo, contenidos, mirandoA, ultima } = props;

  /* Lo que cuenta una regla se monta siempre; el relleno, sólo cerca. */
  const porModelo = useMemo(() => {
    const salida = new Map<string, PuestaEnLaLosa[]>();
    for (const [casilla, lo] of contenidos) {
      const dx = lo.x * LADO_DE_LOSA;
      const dz = -lo.y * LADO_DE_LOSA;
      for (const p of lo.puestas) {
        const lista = salida.get(p.pieza);
        const puesta: PuestaEnLaLosa = {
          ...p,
          x: p.x + dx,
          z: p.z + dz,
          y: p.y + (casilla === ultima ? ALTO_DE_LA_ULTIMA : 0),
        };
        if (lista === undefined) salida.set(p.pieza, [puesta]);
        else lista.push(puesta);
      }
    }
    return salida;
  }, [contenidos, ultima]);

  return (
    <group>
      {[...porModelo.keys()].sort().map((nombre) => (
        <UnModelo
          key={nombre}
          partes={catalogo.partes.get(nombre) ?? []}
          puestas={porModelo.get(nombre) ?? []}
          mirandoA={mirandoA}
        />
      ))}
    </group>
  );
}

interface UnModeloProps {
  readonly partes: readonly ParteDelModelo[];
  readonly puestas: readonly PuestaEnLaLosa[];
  readonly mirandoA: { current: { x: number; z: number } };
}

const AUX_MATRIZ = new THREE.Matrix4();
const AUX_POSICION = new THREE.Vector3();
const AUX_GIRO = new THREE.Quaternion();
const AUX_EJE = new THREE.Vector3(0, 1, 0);
const AUX_ESCALA = new THREE.Vector3();
/*
 * Los tres ejes de la cámara, reutilizados. Se declaran aquí y no dentro del
 * `useFrame` de la mano por lo mismo que los de arriba: tres `Vector3` nuevos por
 * fotograma son ciento ochenta objetos por segundo que el recolector tiene que
 * barrer, y el tirón se nota justo en la escena que hay que mirar bonita.
 */
const AUX_ADELANTE = new THREE.Vector3();
const AUX_DERECHA = new THREE.Vector3();
const AUX_ARRIBA = new THREE.Vector3();

/** Un modelo del pack, con todas sus copias del tablero en una sola malla por parte. */
function UnModelo({ partes, puestas, mirandoA }: UnModeloProps): JSX.Element | null {
  const mallas = useRef<(THREE.InstancedMesh | null)[]>([]);
  const conRelleno = LOSAS_CON_RELLENO * LADO_DE_LOSA;
  const conMenudo = LOSAS_CON_MENUDO * LADO_DE_LOSA;

  useFrame(() => {
    const centro = mirandoA.current;
    for (let k = 0; k < partes.length; k++) {
      const malla = mallas.current[k];
      if (malla === null || malla === undefined) continue;
      let n = 0;
      for (const p of puestas) {
        if (LO_QUE_NO_SE_RECORTA.indexOf(p.porque) < 0) {
          const dx = p.x - centro.x;
          const dz = p.z - centro.z;
          const lejos = dx * dx + dz * dz;
          const tope = p.menuda ? conMenudo : conRelleno;
          if (lejos > tope * tope) continue;
        }
        AUX_POSICION.set(p.x, p.y, p.z);
        AUX_GIRO.setFromAxisAngle(AUX_EJE, p.giro);
        AUX_ESCALA.set(
          p.escala * ESCALA_DEL_PACK * p.largo,
          p.escala * ESCALA_DEL_PACK,
          p.escala * ESCALA_DEL_PACK,
        );
        malla.setMatrixAt(n, AUX_MATRIZ.compose(AUX_POSICION, AUX_GIRO, AUX_ESCALA));
        n++;
      }
      malla.count = n;
      malla.instanceMatrix.needsUpdate = true;
    }
  });

  if (partes.length === 0 || puestas.length === 0) return null;
  return (
    <group>
      {partes.map((parte, k) => (
        <instancedMesh
          key={k}
          ref={(m: THREE.InstancedMesh | null) => {
            mallas.current[k] = m;
          }}
          args={[parte.geometria, parte.material, puestas.length]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}

/* ─────────────────────── El reloj de arena de la bolsa ─────────────────────── */

/**
 * CUÁNTA PARTIDA QUEDA, EN EL RINCÓN DE LA DERECHA.
 *
 * ═══ POR QUÉ UN RELOJ DE ARENA EN UN JUEGO SIN PLAZOS ═══
 *
 * Porque lo que se acaba aquí no es el turno: es LA BOLSA. Las Lindes declara `tickHz: 0`
 * —ni plazos ni nada que el servidor haga por ti si tardas—, así que un reloj que contara
 * el turno sería una mentira muy bien pintada. Pero la partida SÍ se acaba, y se acaba
 * exactamente cuando se saca la última losa: cuánto queda es lo que decide si mandar un
 * labriego al prado, de donde no vuelve, o guardárselo. Eso está en el raíl como «Quedan
 * 38», que es un número que hay que leer y comparar con otro que no está en ningún sitio.
 *
 * Es el MISMO reloj de Riberas: el mismo componente `RelojDeArena` y las mismas medidas.
 * Lo único que cambia es qué mide la arena, y eso lo decide quien lo monta.
 *
 * ═══ PERO CON SUS CONOS, Y NO CON `reloj.glb`. MEDIDO, NO DE OÍDAS ═══
 *
 * El componente admite las dos cosas: el modelo de arte de 717 kB, o los dos conos del
 * respaldo. Aquí van los conos, y no por ahorrar:
 *
 *   · El `.glb` trae su color HORNEADO A VÉRTICE, y horneado oscuro: la arena sale en
 *     `rgb(133, 74, 29)` —marrón de tierra— y la madera en `rgb(42, 10, 2)`, casi negra.
 *     Sobre la mesa oscura de Las Lindes y a un 17 % del alto del lienzo eso es una
 *     silueta negra donde no se distingue cuánta arena queda, que es lo único que este
 *     trasto tiene que decir. Contado sobre el lienzo, con la bolsa a dos tercios: 20
 *     píxeles claros dentro de los bulbos. Con los conos, 3.539, y repartidos entre
 *     arriba y abajo como toca.
 *   · En Riberas se ve bien porque allí vive en la BARRA, cerca del ojo y sobre madera
 *     clara. No es el mismo sitio ni la misma talla.
 *   · Y de propina: 20 triángulos y trece llamadas de dibujo en vez de 25.000 y ciento
 *     seis, y 717 kB que este juego no baja.
 *
 * Los conos usan la paleta de la casa —`COLOR_DE_LA_ARENA`— y se leen de un vistazo. Si
 * un día el modelo se hornea claro, volver a él es pasarle el `modelo` y nada más.
 *
 * ═══ Y ES TAMBIÉN EL BOTÓN DE PASAR ═══
 *
 * Como allí y por lo mismo: no plantar es el gesto más corriente de la partida y no tiene
 * que costar buscar un botón. Apagado cuando el juego no lo ofrece, y entonces ni coge el
 * toque.
 */
function ElRelojDeLaBolsa({
  quedan,
  deLaBolsa,
  sePuedePasar,
  alPasar,
}: {
  readonly quedan: number;
  readonly deLaBolsa: number;
  readonly sePuedePasar: boolean;
  readonly alPasar?: () => void;
}): JSX.Element {
  const grupo = useRef<THREE.Group>(null);
  const cuerpo = useRef<THREE.Group>(null);
  const arenaArriba = useRef<THREE.Group>(null);
  const arenaAbajo = useRef<THREE.Group>(null);
  const hilo = useRef<THREE.Mesh>(null);
  const asa = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();

  /*
   * El sitio se saca UNA vez por pintado y se usa en los dos lados: el tamaño se lo lleva
   * el componente y la pose la pone el fotograma. Sacarlo dos veces sería tener dos
   * cuentas que hay que acordarse de cambiar a la vez, y sólo una se vería mal.
   */
  const sitio = sitioDelRelojDeLaBolsa(
    (camera as THREE.PerspectiveCamera).fov ?? 45,
    size.width / Math.max(1, size.height),
    ALTO_DEL_RELOJ_EN_LADOS,
  );

  /*
   * La pose y la arena, en el mismo fotograma y sin pasar por el estado de React: la
   * fracción sólo cambia cuando se saca una losa, pero la POSE cambia con la cámara, que
   * se mueve sola mientras el tablero crece.
   *
   * Y el `cuerpo` no gira nunca, al revés que en Riberas: allí el reloj da media vuelta al
   * empezar la ronda porque el plazo se reinicia. Aquí no hay plazo y la bolsa no se
   * rellena, así que darle la vuelta sería decir que algo vuelve a empezar.
   */
  useFrame(() => {
    const g = grupo.current;
    if (g === null) return;
    const camara = camera as THREE.PerspectiveCamera;
    AUX_ADELANTE.set(0, 0, -1).applyQuaternion(camara.quaternion);
    AUX_DERECHA.set(1, 0, 0).applyQuaternion(camara.quaternion);
    AUX_ARRIBA.set(0, 1, 0).applyQuaternion(camara.quaternion);
    g.position
      .copy(camara.position)
      .addScaledVector(AUX_ADELANTE, sitio.adelante)
      .addScaledVector(AUX_DERECHA, sitio.derecha)
      .addScaledVector(AUX_ARRIBA, sitio.arriba);
    /*
     * El reloj está de pie en su plano y mira al frente, así que con el giro de la cámara
     * basta: no lleva la vuelta que sí necesita la losa, que está tumbada.
     */
    g.quaternion.copy(camara.quaternion);

    const parte = loQueHaCaido(quedan, deLaBolsa);
    const encima = arenaArriba.current;
    if (encima !== null) encima.scale.y = 1 - parte;
    const debajo = arenaAbajo.current;
    if (debajo !== null) debajo.scale.y = parte;
    const chorro = hilo.current;
    /* El hilo sólo cae mientras queda algo arriba y aún no ha llegado todo abajo. */
    if (chorro !== null) chorro.visible = parte > 0.001 && parte < 0.999;
  });

  return (
    <group ref={grupo}>
      <RelojDeArena
        cuerpo={cuerpo}
        arenaArriba={arenaArriba}
        arenaAbajo={arenaAbajo}
        hilo={hilo}
        asa={asa}
        lado={sitio.lado}
        ancho={sitio.ancho}
        encendido={sePuedePasar}
        modelo={null}
        onPulsar={() => alPasar?.()}
      />
    </group>
  );
}

/* ──────────────────────────── La losa de la mano ──────────────────────────── */

/**
 * LA LOSA QUE SE VA A PONER, EN UNA ESQUINA DEL LIENZO.
 *
 * Se monta la MISMA losa que se pondría —mismo generador, misma semilla, mismo giro—
 * a escala pequeña y siguiendo a la cámara. Que sea la misma y no un dibujo aparte es
 * la mitad del asunto: lo que se ve en la mano es EXACTAMENTE lo que va a aparecer en
 * el tablero, con las casas y los árboles que le tocaron. Un dibujo aparte se separa
 * del generador en la primera semana y nadie se entera hasta que alguien compara.
 *
 * ═══ Y GIRA CON EL BOTÓN, QUE ES PARA LO QUE SIRVE ═══
 *
 * El giro entra por `props`: quien pulsa «Girar» cambia el número y la losa de la mano
 * da un cuarto de vuelta. Sin esto, girar es una palabra en un botón y hay que
 * imaginarse el resultado; con esto se ve antes de tocar el tablero.
 */
function LaLosaEnLaMano({
  catalogo,
  losa,
  giro,
  semilla,
}: {
  readonly catalogo: Catalogo;
  readonly losa: string;
  readonly giro: Giro;
  readonly semilla: number;
}): JSX.Element | null {
  const grupo = useRef<THREE.Group>(null);
  const { camera, size } = useThree();

  const contenido = useMemo(() => montarLaLosa(losa, giro, semilla ^ 0x9e37), [giro, losa, semilla]);
  const suelo = useMemo(() => geometriaDelSuelo([{ x: 0, y: 0, losa, giro }]), [giro, losa]);
  useEffect(() => () => suelo?.dispose(), [suelo]);

  const porModelo = useMemo(() => {
    const salida = new Map<string, PuestaEnLaLosa[]>();
    for (const p of contenido.puestas) {
      const lista = salida.get(p.pieza);
      if (lista === undefined) salida.set(p.pieza, [p]);
      else lista.push(p);
    }
    return salida;
  }, [contenido]);

  /*
   * ═══ SE RECOLOCA CADA FOTOGRAMA EN VEZ DE COLGAR DE LA CÁMARA ═══
   *
   * Colgarla como hija de `camera` sería más corto y tiene un problema: la niebla y
   * las luces se calculan en coordenadas del MUNDO, así que una losa hija de la cámara
   * se ilumina como si estuviera en el origen —de noche cerrada cuando el paseante se
   * ha ido lejos, y sin niebla cuando todo lo demás la tiene—. Recolocándola a mano es
   * un objeto del mundo que casualmente va donde va la cámara, y se ilumina con lo que
   * tiene alrededor.
   */
  useFrame(() => {
    const g = grupo.current;
    if (g === null) return;
    const camara = camera as THREE.PerspectiveCamera;
    const sitio = sitioDeLaMano(camara.fov ?? 45, size.width / Math.max(1, size.height));

    AUX_ADELANTE.set(0, 0, -1).applyQuaternion(camara.quaternion);
    AUX_DERECHA.set(1, 0, 0).applyQuaternion(camara.quaternion);
    AUX_ARRIBA.set(0, 1, 0).applyQuaternion(camara.quaternion);
    g.position
      .copy(camara.position)
      .addScaledVector(AUX_ADELANTE, sitio.adelante)
      .addScaledVector(AUX_DERECHA, sitio.derecha)
      .addScaledVector(AUX_ARRIBA, sitio.arriba);
    g.quaternion.copy(camara.quaternion);
    g.rotateX(INCLINACION_DE_LA_MANO);
    g.scale.setScalar(sitio.escala);
  });

  if (suelo === null) return null;
  return (
    <group ref={grupo}>
      <mesh geometry={suelo}>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
      </mesh>
      {[...porModelo.keys()].sort().map((nombre) => (
        <UnModeloSinRecorte
          key={nombre}
          partes={catalogo.partes.get(nombre) ?? []}
          puestas={porModelo.get(nombre) ?? []}
        />
      ))}
    </group>
  );
}

/**
 * UN MODELO DEL PACK SIN EL RECORTE POR DISTANCIA.
 *
 * El del tablero se recorta con los dos anillos; el de la mano NO puede. La losa de la
 * mano vive en el ORIGEN del mundo —lo que se mueve es el grupo que la lleva—, así que
 * la cuenta de la distancia la compararía contra un paseante que puede estar a miles
 * de unidades y no pintaría ni un árbol: la pieza en la mano saldría pelada justo
 * cuando el tablero está grande, que es cuando más falta hace verla.
 *
 * Son quince renglones y evitan meter una bandera dentro del otro, que tendría que
 * mirarse en cada pieza de cada fotograma para un solo caso.
 */
function UnModeloSinRecorte({
  partes,
  puestas,
}: {
  readonly partes: readonly ParteDelModelo[];
  readonly puestas: readonly PuestaEnLaLosa[];
}): JSX.Element | null {
  const mallas = useRef<(THREE.InstancedMesh | null)[]>([]);

  useEffect(() => {
    for (let k = 0; k < partes.length; k++) {
      const malla = mallas.current[k];
      if (malla === null || malla === undefined) continue;
      for (let i = 0; i < puestas.length; i++) {
        const p = puestas[i] as PuestaEnLaLosa;
        AUX_POSICION.set(p.x, p.y, p.z);
        AUX_GIRO.setFromAxisAngle(AUX_EJE, p.giro);
        AUX_ESCALA.set(
          p.escala * ESCALA_DEL_PACK * p.largo,
          p.escala * ESCALA_DEL_PACK,
          p.escala * ESCALA_DEL_PACK,
        );
        malla.setMatrixAt(i, AUX_MATRIZ.compose(AUX_POSICION, AUX_GIRO, AUX_ESCALA));
      }
      malla.count = puestas.length;
      malla.instanceMatrix.needsUpdate = true;
    }
  }, [partes, puestas]);

  if (partes.length === 0 || puestas.length === 0) return null;
  return (
    <group>
      {partes.map((parte, k) => (
        <instancedMesh
          key={k}
          ref={(m: THREE.InstancedMesh | null) => {
            mallas.current[k] = m;
          }}
          args={[parte.geometria, parte.material, puestas.length]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}

/* ────────────────────────────── Los labriegos ────────────────────────────── */

/**
 * LOS PEONES PLANTADOS, con su peana del color de cada cual.
 *
 * ═══ EL MATERIAL SE CREA AQUÍ Y NO SE DEJA COMO HIJO DEL `<instancedMesh>` ═══
 *
 * Con `args={[geometria, undefined, cuantos]}` y un `<meshStandardMaterial>` de
 * hijo, la malla nace SIN material y `three` no dibuja nada hasta que r3f engancha
 * el hijo — y cuando lo engancha, la malla ya tiene `instanceColor` puesto por un
 * efecto que corrió antes, así que el color se pierde. El resultado es un tablero
 * con veintiséis labriegos plantados en el estado y NINGUNO a la vista, sin un solo
 * error en la consola. Costó encontrarlo porque todo lo demás —la partida, la
 * traducción, las posiciones— estaba bien.
 *
 * Creados aquí y pasados por `args`, la malla nace completa.
 */
function LosLabriegos({
  labriegos,
  aPie,
}: {
  readonly labriegos: readonly {
    readonly casilla: string;
    readonly enX: number;
    readonly enZ: number;
    readonly color: string;
  }[];
  /** ¿Se está andando por el tablero? Entonces el labriego es un hombre, no una ficha. */
  readonly aPie: boolean;
}): JSX.Element | null {
  /*
   * ═══ UNA FICHA DESDE LA MESA, UN HOMBRE DESDE EL SUELO ═══
   *
   * `ALTO_DEL_LABRIEGO` son siete personas, y está bien razonado: desde la mesa el
   * labriego no es un señor en un campo, es la marca de QUIÉN tiene qué, y tiene que
   * leerse de un vistazo entre las casitas. Ver su comentario en `medidas.ts`.
   *
   * Pero este juego se recorre a pie. Y a pie esa misma ficha es un gigante rojo de
   * TRECE METROS plantado en el prado, con una peana de once metros flotándole a la
   * altura de la rodilla y el paseante andando por debajo. Mirado en el móvil: al
   * pulsar «hombro» la pantalla se llenaba de rojo, y lo primero que pensé es que el
   * avatar salía gigante — el avatar estaba bien; lo gigante era la ficha.
   *
   * Así que la ficha se queda ficha en la mesa y se hace hombre al bajar. No es un apaño
   * de tamaño: un labriego ES un hombre en un campo, y a su lado va el avatar de quien
   * pasea, que mide exactamente lo mismo. Las dos lecturas son verdad, cada una desde
   * donde se mira.
   */
  const cuanto = aPie ? ALTURA_DE_UNA_PERSONA / ALTO_DEL_LABRIEGO : 1;
  const peon = useMemo(() => geometriaDelLabriego(), []);
  const peana = useMemo(() => geometriaDeLaPeana(ALTO_DEL_LABRIEGO * 0.42), []);
  const materialDelPeon = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 }),
    [],
  );
  const materialDeLaPeana = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, transparent: true, opacity: 0.8 }),
    [],
  );
  useEffect(
    () => () => {
      peon.dispose();
      peana.dispose();
      materialDelPeon.dispose();
      materialDeLaPeana.dispose();
    },
    [materialDeLaPeana, materialDelPeon, peana, peon],
  );

  const sitios = useMemo(
    () =>
      labriegos.map((l) => {
        const partes = l.casilla.split(',');
        const cx = Number(partes[0]) * LADO_DE_LOSA;
        const cz = -Number(partes[1]) * LADO_DE_LOSA;
        return {
          x: cx + l.enX * LADO_DE_LOSA,
          z: cz + l.enZ * LADO_DE_LOSA,
          color: new THREE.Color(l.color),
        };
      }),
    [labriegos],
  );

  const losPeones = useRef<THREE.InstancedMesh>(null);
  const lasPeanas = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    for (const malla of [losPeones.current, lasPeanas.current]) {
      if (malla === null) continue;
      const esPeana = malla === lasPeanas.current;
      for (let i = 0; i < sitios.length; i++) {
        const s = sitios[i] as { x: number; z: number; color: THREE.Color };
        AUX_POSICION.set(s.x, esPeana ? LADO_DE_LOSA * 0.006 * cuanto : 0, s.z);
        AUX_GIRO.identity();
        AUX_ESCALA.set(cuanto, cuanto, cuanto);
        malla.setMatrixAt(i, AUX_MATRIZ.compose(AUX_POSICION, AUX_GIRO, AUX_ESCALA));
        malla.setColorAt(i, s.color);
      }
      malla.count = sitios.length;
      malla.instanceMatrix.needsUpdate = true;
      if (malla.instanceColor !== null) malla.instanceColor.needsUpdate = true;
    }
  }, [cuanto, sitios]);

  if (sitios.length === 0) return null;
  return (
    <group>
      <instancedMesh
        ref={losPeones}
        args={[peon, materialDelPeon, sitios.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={lasPeanas}
        args={[peana, materialDeLaPeana, sitios.length]}
        frustumCulled={false}
      />
    </group>
  );
}
