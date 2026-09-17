/**
 * LA LINDE ALTA: la escena del lobby de Las Lindes.
 *
 * ═══ QUÉ MONTA ═══
 *
 * Contra el MISMO contrato que el Muelle y la Plaza (`embarcadero/tipos.ts`,
 * `PropsDelEmbarcadero`): un altozano de hierba con su reborde de piedra, una mesa
 * de piedra en medio con la bolsa de losas encima, un corro de mojones —uno por
 * sitio de la mesa— y un aventurero de pie junto al suyo. Abajo y alrededor, el
 * valle vacío: el sitio donde va a crecer el tablero.
 *
 * Toda la aritmética —dónde va cada mojón, dónde se pone cada cual, qué crece en el
 * alto— vive en `la-linde.ts` y se puede recorrer en Node. Aquí sólo se instancia.
 *
 * ═══ ES DELIBERADAMENTE MÁS SENCILLA QUE LA PLAZA, Y CONVIENE DECIRLO ═══
 *
 * La Plaza tiene coreografía de entrada y de salida, farolas que se encienden
 * puesto a puesto, grúa al zarpar y cielo que corre hacia el mediodía. Aquí no. No
 * es una versión a medias: es que este lobby tiene UNA cosa que contar —quién está
 * y de qué color— y la cuenta con un corro de mojones y cinco figuras de pie. Lo
 * que sí comparte es todo lo que hace que dos paisajes se comporten igual: los
 * mismos gestos (`embarcadero/gestos.ts`), la misma marioneta
 * (`aventureros/marioneta.ts`), el mismo cargador y los mismos cuatro avisos del
 * contrato.
 *
 * El día que alguien quiera aquí la llegada andando de la Plaza, la máquina de
 * `gestos.ts` ya la tiene: lo que faltaría es el camino, y el camino ya está escrito
 * en `SitioDeLaLinde.entrada`.
 *
 * ═══ LOS CUATRO AVISOS, Y CÓMO SE CUMPLEN ═══
 *
 * `alEstarListo` se llama SIEMPRE y una sola vez: cuando el catálogo y las figuras
 * han llegado O HAN FALLADO; y si `traer` no contesta nunca, un tope de quince
 * segundos avisa igual con el cielo y la luz puestos. `alFallar`, una vez por
 * fichero que no llegó. `alZarpar`, una vez cuando `zarpando` llega. `alMedir`, una
 * vez por segundo con la media real del reloj de `useFrame`.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ALTURA_DE_UNA_PERSONA } from '../escala';
import { cargadorPara } from '../embarcadero/cargar';
import type { AventureroCargado } from '../embarcadero/cargar';
import { figuraQueSePinta } from '../embarcadero/figuras';
import type { FiguraId } from '../embarcadero/figuras';
import { clipQueToca, nacer, siguiente } from '../embarcadero/gestos';
import type { EstadoDeAventurero } from '../embarcadero/gestos';
import { colorDeAsiento } from '../embarcadero/tema';
import type { PropsDelEmbarcadero } from '../embarcadero/tipos';
import { desmontaMarioneta, giroCorto, montaMarioneta, reproduce } from '../aventureros/marioneta';
import type { Marioneta } from '../aventureros/marioneta';
import { rutaDelTablero } from '../ruta-de-modelos';
import { abrirGlb } from '../embarcadero/cargar';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import {
  ALTO_DE_LA_MESA,
  ALTO_DEL_REBORDE,
  RADIO_DEL_ALTOZANO,
  RADIO_DEL_CORRO,
  RADIO_DE_LA_MESA,
  elValleDelFondo,
  loQueHayEnLaLinde,
  sitiosDeLaLinde,
} from './la-linde';
import type { PuestaEnLaLinde } from './la-linde';

/* ─────────────────────────────── Constantes ─────────────────────────────── */

/** Cuánto se espera a `traer` antes de levantar el telón con lo que haya. */
const TOPE_DE_ARRANQUE_MS = 15_000;

/** La hora: media tarde de verano, con el sol bajo por el oeste. */
const COLOR_DEL_CIELO = '#9cc3e4';
const COLOR_DE_LA_NIEBLA = '#c9d8e2';
const COLOR_DE_LA_HIERBA = '#6f9a4e';
const COLOR_DE_LA_PIEDRA = '#a9a394';
const COLOR_DE_LA_TIERRA = '#4c3b28';

/** Cuántos lados tiene el disco del altozano. Cuarenta y ocho: se ve redondo. */
const LADOS_DEL_ALTOZANO = 48;

/* ───────────────────────────────── Ayudas ───────────────────────────────── */

interface ParteDelModelo {
  readonly geometria: THREE.BufferGeometry;
  readonly material: THREE.Material;
}

/** Las partes de un modelo del pack, con su matriz ya aplicada. */
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

/**
 * EL ALTOZANO: un disco de hierba con su reborde de piedra y su falda de tierra.
 *
 * Tres anillos y nada más: la cara de arriba, el canto de piedra y la falda que se
 * pierde hacia abajo. La falda es lo que quita la sensación de plataforma flotante
 * sin tener que modelar una ladera entera.
 */
function geometriaDelAltozano(): THREE.BufferGeometry {
  const posiciones: number[] = [];
  const colores: number[] = [];
  const normales: number[] = [];
  const hierba = new THREE.Color(COLOR_DE_LA_HIERBA);
  const piedra = new THREE.Color(COLOR_DE_LA_PIEDRA);
  const tierra = new THREE.Color(COLOR_DE_LA_TIERRA);

  const empuja = (
    x: number,
    y: number,
    z: number,
    c: THREE.Color,
    n: readonly [number, number, number],
  ): void => {
    posiciones.push(x, y, z);
    colores.push(c.r, c.g, c.b);
    normales.push(n[0], n[1], n[2]);
  };

  const paso = (Math.PI * 2) / LADOS_DEL_ALTOZANO;
  const faldaAbajo = -ALTURA_DE_UNA_PERSONA * 9;
  for (let k = 0; k < LADOS_DEL_ALTOZANO; k++) {
    const a = k * paso;
    const b = (k + 1) * paso;
    const xa = Math.sin(a);
    const za = Math.cos(a);
    const xb = Math.sin(b);
    const zb = Math.cos(b);
    const r = RADIO_DEL_ALTOZANO;

    /*
     * La cara de arriba, en abanico desde el centro.
     *
     * ═══ EL ORDEN ES LA CARA, Y AL REVÉS NO FALLA NADA ═══
     *
     * Con `centro → b → a` el disco mira HACIA ABAJO y el altozano sale con la
     * tierra de la falda por arriba: se ve como un montículo de barro donde tenía
     * que haber hierba, sin un solo error en ninguna consola. Es el mismo fallo que
     * el suelo del tablero ya pagó una vez, y aquí se repitió en el mismo día.
     */
    empuja(0, 0, 0, hierba, [0, 1, 0]);
    empuja(xa * r, 0, za * r, hierba, [0, 1, 0]);
    empuja(xb * r, 0, zb * r, hierba, [0, 1, 0]);

    /* El canto de piedra: un cilindro corto que baja del borde. */
    const abajo = -ALTO_DEL_REBORDE;
    empuja(xa * r, 0, za * r, piedra, [xa, 0, za]);
    empuja(xb * r, 0, zb * r, piedra, [xb, 0, zb]);
    empuja(xb * r, abajo, zb * r, piedra, [xb, 0, zb]);
    empuja(xa * r, 0, za * r, piedra, [xa, 0, za]);
    empuja(xb * r, abajo, zb * r, piedra, [xb, 0, zb]);
    empuja(xa * r, abajo, za * r, piedra, [xa, 0, za]);

    /* Y la falda: se abre un poco y se pierde hacia abajo. */
    const rf = r * 1.6;
    empuja(xa * r, abajo, za * r, tierra, [xa, 0.4, za]);
    empuja(xb * r, abajo, zb * r, tierra, [xb, 0.4, zb]);
    empuja(xb * rf, faldaAbajo, zb * rf, tierra, [xb, 0.4, zb]);
    empuja(xa * r, abajo, za * r, tierra, [xa, 0.4, za]);
    empuja(xb * rf, faldaAbajo, zb * rf, tierra, [xb, 0.4, zb]);
    empuja(xa * rf, faldaAbajo, za * rf, tierra, [xa, 0.4, za]);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normales, 3));
  g.computeBoundingSphere();
  return g;
}

/* ─────────────────────────────── La escena ─────────────────────────────── */

export function LindeAlta(props: PropsDelEmbarcadero): JSX.Element {
  const { mesa, traer, calidad, ventana, zarpando } = props;
  const [catalogo, setCatalogo] = useState<ReadonlyMap<string, readonly ParteDelModelo[]> | null>(null);
  const [figuras, setFiguras] = useState<ReadonlyMap<FiguraId, AventureroCargado>>(new Map());
  const [biblioteca, setBiblioteca] = useState<readonly THREE.AnimationClip[]>([]);
  const avisado = useRef(false);
  const zarpado = useRef(false);

  const sitios = useMemo(sitiosDeLaLinde, []);
  const semilla = useMemo(() => semillaDelCodigo(mesa.codigo ?? '', 0x11de), [mesa.codigo]);

  /* ── Los modelos ────────────────────────────────────────────────────────── */
  useEffect(() => {
    let vivo = true;
    const cargador = cargadorPara(traer);
    const reloj = setTimeout(() => {
      if (vivo && !avisado.current) {
        avisado.current = true;
        props.alEstarListo?.();
      }
    }, TOPE_DE_ARRANQUE_MS);

    const quienes: FiguraId[] = [];
    for (const a of mesa.asientos) quienes.push(figuraQueSePinta(a.id, a.figura));
    if (props.figuraQuePruebo !== undefined) {
      quienes.push(figuraQueSePinta('prueba', props.figuraQuePruebo));
    }

    const elPack = traer(rutaDelTablero())
      .then((bytes) => abrirGlb(bytes))
      .then((gltf) => {
        if (!vivo) return;
        const partes = new Map<string, readonly ParteDelModelo[]>();
        for (const hijo of gltf.scene.children) {
          if (hijo.name.length > 0) partes.set(hijo.name, partesDe(hijo));
        }
        setCatalogo(partes);
      })
      .catch((e: unknown) => {
        props.alFallar?.(e instanceof Error ? e.message : String(e));
      });

    const losClips = cargador
      .animaciones()
      .then((clips) => {
        if (vivo) setBiblioteca(clips);
      })
      .catch((e: unknown) => {
        props.alFallar?.(e instanceof Error ? e.message : String(e));
      });

    const lasFiguras = Promise.all(
      [...new Set(quienes)].map((id) =>
        cargador
          .aventurero(id)
          .then((cargada) => [id, cargada] as const)
          .catch((e: unknown) => {
            props.alFallar?.(e instanceof Error ? e.message : String(e));
            return null;
          }),
      ),
    ).then((pares) => {
      if (!vivo) return;
      const tabla = new Map<FiguraId, AventureroCargado>();
      for (const par of pares) if (par !== null) tabla.set(par[0], par[1]);
      setFiguras(tabla);
    });

    void Promise.all([elPack, losClips, lasFiguras]).then(() => {
      if (!vivo || avisado.current) return;
      avisado.current = true;
      props.alEstarListo?.();
    });

    return () => {
      vivo = false;
      clearTimeout(reloj);
    };
    /* `traer` y los avisos son estables por contrato; los asientos cambian de verdad. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traer, mesa.asientos, props.figuraQuePruebo]);

  /* ── El zarpe: un aviso y ni una coreografía ────────────────────────────── */
  useEffect(() => {
    if (zarpando !== true || zarpado.current) return;
    zarpado.current = true;
    props.alZarpar?.();
  }, [zarpando, props]);

  /* ── El suelo ───────────────────────────────────────────────────────────── */
  const altozano = useMemo(geometriaDelAltozano, []);
  useEffect(() => () => altozano.dispose(), [altozano]);
  const mesaDePiedra = useMemo(
    () => new THREE.CylinderGeometry(RADIO_DE_LA_MESA, RADIO_DE_LA_MESA * 1.12, ALTO_DE_LA_MESA, 18),
    [],
  );
  useEffect(() => () => mesaDePiedra.dispose(), [mesaDePiedra]);

  /* ── Lo que se pone encima ──────────────────────────────────────────────── */
  const puestas = useMemo(() => loQueHayEnLaLinde(semilla), [semilla]);
  const valle = useMemo(
    () => (calidad === 'plena' ? elValleDelFondo(semilla) : []),
    [calidad, semilla],
  );
  const porModelo = useMemo(() => {
    const salida = new Map<string, PuestaEnLaLinde[]>();
    for (const p of [...puestas, ...valle]) {
      const lista = salida.get(p.pieza);
      if (lista === undefined) salida.set(p.pieza, [p]);
      else lista.push(p);
    }
    return salida;
  }, [puestas, valle]);

  /* ── La cámara: quieta, mirando al corro desde fuera y un poco alta ──────── */
  const { camera, size } = useThree();
  useEffect(() => {
    const aspecto = size.width / Math.max(1, size.height);
    /*
     * Cuanto más estrecha la ventana, más atrás: en un móvil de pie el corro no cabe
     * a la distancia a la que cabe en un monitor, y acercarse sería cortar a quien
     * está en los sitios de los lados. Es la misma cuenta que la cámara de mesa del
     * tablero, y por lo mismo.
     */
    /*
     * ═══ LA CÁMARA MIRA A LA GENTE, NO AL PAISAJE ═══
     *
     * Esta pantalla contesta UNA pregunta —quién está sentado ya— y todo lo demás es
     * el sitio donde se contesta. Con la cámara a dos radios del alto, el corro
     * entero cabía y las figuras medían diez píxeles: se veía un claro bonito y no se
     * distinguía a nadie, que es justo al revés de lo que hace falta.
     *
     * Así que se encuadra el CORRO y no el altozano, y se baja a la altura de una
     * persona y media: desde ahí las cinco figuras se leen, y el valle del fondo
     * sigue estando detrás, que es para lo que está.
     */
    const atras = RADIO_DEL_CORRO * (aspecto < 1 ? 3.1 : 2.45);
    /*
     * Y bastante alta: con la cámara a la altura del pecho, quien está sentado en el
     * sitio del NORTE queda justo detrás de la piedra del centro y no se le ve. Un
     * lobby que esconde a uno de los cinco es un lobby que miente sobre el aforo.
     */
    const alto = ALTURA_DE_UNA_PERSONA * (aspecto < 1 ? 5.4 : 4.3);
    camera.position.set(0, alto, atras);
    camera.lookAt(0, ALTURA_DE_UNA_PERSONA * 1.15, 0);
  }, [camera, size.height, size.width, ventana.franjaInferior]);

  /* ── La medida ──────────────────────────────────────────────────────────── */
  const { gl } = useThree();
  const medido = useRef({ fotogramas: 0, ms: 0 });
  useFrame((_, dt) => {
    if (props.alMedir === undefined) return;
    medido.current.fotogramas++;
    medido.current.ms += Math.min(dt, 0.1) * 1000;
    if (medido.current.fotogramas % 60 !== 0) return;
    props.alMedir({
      triangulos: gl.info.render.triangles,
      llamadas: gl.info.render.calls,
      ms: medido.current.ms / medido.current.fotogramas,
      fotogramas: medido.current.fotogramas,
    });
  });

  return (
    <>
      <color attach="background" args={[COLOR_DEL_CIELO]} />
      <fog
        attach="fog"
        args={[COLOR_DE_LA_NIEBLA, RADIO_DEL_ALTOZANO * 2.2, RADIO_DEL_ALTOZANO * 9]}
      />
      <hemisphereLight args={['#eaf2ff', '#6b6a4a', 1.1]} />
      <directionalLight
        position={[-RADIO_DEL_ALTOZANO * 2, RADIO_DEL_ALTOZANO * 2.4, RADIO_DEL_ALTOZANO]}
        intensity={1.45}
        color="#ffeed6"
      />

      <mesh geometry={altozano}>
        <meshStandardMaterial vertexColors roughness={0.96} metalness={0} />
      </mesh>

      <mesh geometry={mesaDePiedra} position={[0, ALTO_DE_LA_MESA / 2, 0]}>
        <meshStandardMaterial color={COLOR_DE_LA_PIEDRA} roughness={0.9} metalness={0} />
      </mesh>

      {catalogo !== null
        ? [...porModelo.keys()].sort().map((nombre) => (
            <UnModeloDeLaLinde
              key={nombre}
              partes={catalogo.get(nombre) ?? []}
              puestas={porModelo.get(nombre) ?? []}
            />
          ))
        : null}

      {mesa.asientos.map((a, i) => {
        const sitio = sitios[i % sitios.length];
        if (sitio === undefined) return null;
        return (
          <UnoEnSuSitio
            key={a.id}
            sitio={sitio}
            figura={figuraQueSePinta(a.id, a.figura)}
            color={colorDeAsiento(mesa.tema, i)}
            presente={a.presente}
            esLocal={a.id === mesa.yo}
            figuras={figuras}
            biblioteca={biblioteca}
            semilla={semilla + i}
          />
        );
      })}
    </>
  );
}

/* ─────────────────── Las piezas del pack, instanciadas ─────────────────── */

const AUX_MATRIZ = new THREE.Matrix4();
const AUX_POSICION = new THREE.Vector3();
const AUX_GIRO = new THREE.Quaternion();
const AUX_EJE = new THREE.Vector3(0, 1, 0);
const AUX_ESCALA = new THREE.Vector3();

/** Un modelo del pack con todas sus copias del altozano. */
function UnModeloDeLaLinde({
  partes,
  puestas,
}: {
  readonly partes: readonly ParteDelModelo[];
  readonly puestas: readonly PuestaEnLaLinde[];
}): JSX.Element | null {
  const mallas = useRef<(THREE.InstancedMesh | null)[]>([]);

  useEffect(() => {
    for (let k = 0; k < partes.length; k++) {
      const malla = mallas.current[k];
      if (malla === null || malla === undefined) continue;
      for (let i = 0; i < puestas.length; i++) {
        const p = puestas[i] as PuestaEnLaLinde;
        AUX_POSICION.set(p.x, p.y, p.z);
        AUX_GIRO.setFromAxisAngle(AUX_EJE, p.giro);
        AUX_ESCALA.set(p.escala, p.escala, p.escala);
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

/* ────────────────────────── Quien está en su sitio ────────────────────────── */

/**
 * UN AVENTURERO DE PIE JUNTO A SU MOJÓN.
 *
 * Con la máquina de gestos de siempre —`nacer`, `siguiente`, `clipQueToca`— para que
 * respire, salude de vez en cuando y se desvanezca si su asiento se ausenta. Lo que
 * NO tiene es camino: aparece en su sitio, que es lo que este lobby cuenta.
 *
 * El disco de contacto debajo es lo que ata la figura al suelo sin sombras
 * proyectadas: es el mismo apaño que el Muelle y la Plaza ya tienen medido, y sin él
 * una figura sobre hierba lisa parece estar flotando.
 */
function UnoEnSuSitio({
  sitio,
  figura,
  color,
  presente,
  esLocal,
  figuras,
  biblioteca,
  semilla,
}: {
  readonly sitio: { readonly pie: { readonly x: number; readonly z: number }; readonly giro: number };
  readonly figura: FiguraId;
  readonly color: string;
  readonly presente: boolean;
  readonly esLocal: boolean;
  readonly figuras: ReadonlyMap<FiguraId, AventureroCargado>;
  readonly biblioteca: readonly THREE.AnimationClip[];
  readonly semilla: number;
}): JSX.Element | null {
  const cargada = figuras.get(figura) ?? null;
  const marioneta = useRef<Marioneta | null>(null);
  const grupo = useRef<THREE.Group>(null);
  const estado = useRef<EstadoDeAventurero | null>(null);
  const [montada, setMontada] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    if (cargada === null || biblioteca.length === 0) return;
    const m = montaMarioneta(cargada, biblioteca);
    if (m === null) {
      /*
       * Sin `reposo-a` no hay marioneta que valga, y callarlo deja un lobby con la
       * mesa puesta y NADIE de pie: se lee como que no se ha sentado nadie. Un
       * respaldo mudo es un fallo que no se ve.
       */
      console.warn(`La figura ${figura} ha llegado sin el clip de reposo: no se pinta.`);
      return;
    }
    marioneta.current = m;
    setMontada(m.raiz);
    estado.current = nacer(semilla, 0, 'quieto', 0, presente);
    return () => {
      desmontaMarioneta(m);
      marioneta.current = null;
      setMontada(null);
    };
  }, [biblioteca, cargada, figura, presente, semilla]);

  /* La ausencia y la vuelta entran por la misma puerta que todo lo demás. */
  const estabaPresente = useRef(presente);
  useEffect(() => {
    if (estabaPresente.current === presente) return;
    estabaPresente.current = presente;
    const e = estado.current;
    if (e === null) return;
    estado.current = siguiente(e, presente ? 'vuelve' : 'se-ausenta', 0);
  }, [presente]);

  useFrame((reloj, dt) => {
    const m = marioneta.current;
    const e = estado.current;
    if (m === null || e === null) return;
    const ahora = reloj.clock.elapsedTime;
    const siguienteEstado = siguiente(e, 'tic', ahora);
    estado.current = siguienteEstado;
    const clip = clipQueToca(siguienteEstado, ahora);
    reproduce(m, clip.clip, clip.bucle, clip.desde, ahora);
    m.mezclador.update(Math.min(dt, 0.1));

    const g = grupo.current;
    if (g === null) return;
    g.position.set(sitio.pie.x, 0, sitio.pie.z);
    /* Se gira poco a poco hacia la mesa: un giro instantáneo se ve como un salto. */
    g.rotation.y += giroCorto(g.rotation.y, sitio.giro) * Math.min(1, dt * 6);
  });

  if (montada === null) return null;
  return (
    <group ref={grupo}>
      <primitive object={montada} />
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[ALTURA_DE_UNA_PERSONA * 0.34, 20]} />
        <meshBasicMaterial color={color} transparent opacity={esLocal ? 0.55 : 0.32} />
      </mesh>
    </group>
  );
}
