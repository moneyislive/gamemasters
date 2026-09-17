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
import { ESCALA_DEL_PACK } from '../escala';
import { rutaDelTablero } from '../ruta-de-modelos';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import { LADO_DE_LOSA } from './medidas';
import { LO_QUE_NO_SE_RECORTA, montarLaLosa } from './losa';
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
  unPaso,
} from './paseo';
import type { Mandos, Paseante } from './paseo';
import type { PropsDeLasLindes } from './tipos';

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
      /*
       * La semilla de cada losa mezcla la de la mesa con SUS COORDENADAS y no con
       * su número de serie: así una losa puesta en el mismo sitio se ve igual
       * aunque la partida se rebobine, y dos losas iguales en sitios distintos no
       * salen clonadas — que es lo que delata un paisaje generado.
       */
      const suya = (semilla ^ Math.imul(l.x + 512, 73856093) ^ Math.imul(l.y + 512, 19349663)) >>> 0;
      salida.set(l.casilla, { puestas: montarLaLosa(l.losa, l.giro, suya).puestas, x: l.x, y: l.y });
    }
    return salida;
  }, [tablero.losas, semilla]);

  /* ── La cámara ──────────────────────────────────────────────────────────── */
  const { camera, size } = useThree();
  const abarca = useMemo(() => loQueAbarca(tablero.losas), [tablero.losas]);
  const puestas = useMemo(() => new Set(tablero.losas.map((l) => l.casilla)), [tablero.losas]);
  const paseante = useRef<Paseante>(nacerEn(0, 0));
  const mandos = useRef<Mandos>(QUIETO);
  const mirandoA = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  /* Quien pasea nace en la última losa puesta, que es donde está pasando algo. */
  useEffect(() => {
    if (camara.modo === 'mesa') return;
    const ultima = tablero.losas.find((l) => l.ultima) ?? tablero.losas[0];
    if (ultima !== undefined && paseante.current.andando === 0 && paseante.current.x === 0 && paseante.current.z === 0) {
      paseante.current = nacerEn(ultima.x, ultima.y);
    }
  }, [camara.modo, tablero.losas]);

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
    if (quieto === true && camara.modo === 'mesa') {
      const pose = camaraDeMesa(abarca, size.width / Math.max(1, size.height));
      camera.position.set(pose.x, pose.y, pose.z);
      camera.lookAt(pose.miraX, pose.miraY, pose.miraZ);
      mirandoA.current = { x: pose.miraX, z: pose.miraZ };
      return;
    }
    if (camara.modo === 'mesa') {
      const pose = camaraDeMesa(abarca, size.width / Math.max(1, size.height));
      /* Se acerca poco a poco: el tablero crece y un salto de cámara marea. */
      camera.position.lerp(new THREE.Vector3(pose.x, pose.y, pose.z), Math.min(1, dt * 2.5));
      camera.lookAt(pose.miraX, pose.miraY, pose.miraZ);
      mirandoA.current = { x: pose.miraX, z: pose.miraZ };
      return;
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

  const alTocar = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const donde = casillaDelPunto(e.point);
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
    [casillaDelPunto, giroEnMano, props, tablero.huecos],
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
      <fog attach="fog" args={[COLOR_DE_LA_NIEBLA, LADO_DE_LOSA * 8, LADO_DE_LOSA * 34]} />
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

      <LosLabriegos labriegos={tablero.labriegos} />

      {huecos !== null ? (
        <mesh geometry={huecos} onClick={alTocar} onPointerMove={alSenalar}>
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
}: {
  readonly labriegos: readonly {
    readonly casilla: string;
    readonly enX: number;
    readonly enZ: number;
    readonly color: string;
  }[];
}): JSX.Element | null {
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
        AUX_POSICION.set(s.x, esPeana ? LADO_DE_LOSA * 0.006 : 0, s.z);
        AUX_GIRO.identity();
        AUX_ESCALA.set(1, 1, 1);
        malla.setMatrixAt(i, AUX_MATRIZ.compose(AUX_POSICION, AUX_GIRO, AUX_ESCALA));
        malla.setColorAt(i, s.color);
      }
      malla.count = sitios.length;
      malla.instanceMatrix.needsUpdate = true;
      if (malla.instanceColor !== null) malla.instanceColor.needsUpdate = true;
    }
  }, [sitios]);

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
