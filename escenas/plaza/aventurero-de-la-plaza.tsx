/**
 * UN AVENTURERO EN SU PUESTO DE LA PLAZA: la figura, su disco y su humo.
 *
 * ═══ QUÉ HAY AQUÍ Y QUÉ NO ═══
 *
 * Lo que pertenece a UN asiento y se mueve con él: la `SkinnedMesh` clonada con su
 * mezclador (`aventureros/marioneta.ts`, la misma del Muelle y la del tablero), el clip
 * que toca según `gestos-de-la-plaza.ts`, por dónde anda al llegar y al irse, hacia
 * dónde mira, el disco de contacto y el humo del cambio de figura. El NOMBRE no: lo
 * pinta el HUD. El BANCO, la FAROLA y el ESTANDARTE tampoco: son del puesto, estén
 * ocupados o no, y los pone `Plaza.tsx` —los dos primeros dentro de la malla fundida y
 * el tercero instanciado con el color del asiento—.
 *
 * La máquina de estados no vive en React: vive en una referencia y se le da el reloj del
 * `useFrame`. Los cambios de props se traducen a SUCESOS que se aplican en el siguiente
 * fotograma, para que la coreografía no dependa de en qué orden React vuelva a pintar.
 * Es la estructura de `embarcadero/aventurero.tsx`, con el barco cambiado por un camino.
 *
 * ═══ LO QUE CAMBIA RESPECTO DEL MUELLE ═══
 *
 *   · SE LLEGA ANDANDO. En vez de un barco que cruza la niebla, un camino que sale de
 *     una boca de calle (`la-plaza.ts`) y se recorre en los 4,83 s de la fase, con el clip
 *     de `andar` acelerado o frenado para que los pies no patinen (`ritmo`).
 *   · SE SALE CORRIENDO. El zarpe no acaba en un salto a cubierta: acaba fuera de
 *     cuadro, hacia la calle del lado de la cámara, y quien llega al final de su camino
 *     deja de pintarse.
 *   · AUSENTE ES DARLE LA ESPALDA A LA CÁMARA Y MIRAR AL MONUMENTO, que es lo que hace
 *     quien está en una plaza pensando en otra cosa. En el Muelle era mirar al mar.
 *
 * ═══ NUNCA T-POSE ═══
 *
 * La pose de enlace del rig ES la T. `montaMarioneta` devuelve `null` mientras no haya
 * biblioteca de clips, y entonces la figura NO se enseña: se ve el puesto con su farola
 * y su estandarte un instante antes que a su dueño. `clipDeLaPlaza` no pide `t-pose` por
 * construcción, y `reproduce` cae a `reposo-a` si le piden un clip que no exista.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { amortiguado } from '../embarcadero/camara';
import type { AventureroCargado } from '../embarcadero/cargar';
import type { FiguraId } from '../embarcadero/figuras';
import { sorteo } from '../embarcadero/cala';
import {
  cuantoHaNacido,
  nacer,
  progresoDeVestido,
  siguiente,
} from '../embarcadero/gestos';
import type { EstadoDeAventurero, ModoDeNacer, Suceso } from '../embarcadero/gestos';
import { escalaDePantallaDe, geometriaDeMotas, materialDeMotas } from '../embarcadero/particulas';
import type { Calidad } from '../embarcadero/tipos';
import { desmontaMarioneta, giroCorto, montaMarioneta, reproduce } from '../aventureros/marioneta';
import { clipDeLaPlaza, largoDelCamino, metrosDeLaSalida, progresoDeLaEntrada, puntoDelCamino } from './gestos-de-la-plaza';
import { MONUMENTO, SUELO_DE_LA_PLAZA, rumboDe } from './la-plaza';
import type { PuestoDeLaPlaza } from './la-plaza';
import { MOTAS_DE_HUMO, SEGMENTOS_DEL_DISCO } from './presupuesto-de-la-plaza';

export interface PropsDelAventureroDeLaPlaza {
  readonly puesto: PuestoDeLaPlaza;
  /** La posición del asiento en la lista, para el escalonado de los saludos. */
  readonly indice: number;
  readonly color: string;
  readonly figura: FiguraId;
  readonly presente: boolean;
  readonly esLocal: boolean;
  readonly calidad: Calidad;
  readonly modoDeNacer: ModoDeNacer;
  readonly retraso: number;
  readonly zarpando: boolean;
  /** Cuántos han llegado desde que se montó la escena: cada uno más es alguien a quien saludar. */
  readonly llegadas: number;
  readonly semilla: number;
  readonly figuras: ReadonlyMap<FiguraId, AventureroCargado>;
  /** La biblioteca de clips. Vacía hasta que llega: entonces no se enseña. */
  readonly biblioteca: readonly THREE.AnimationClip[];
  /** Ha empezado a entrar en la plaza: la cámara le echa una mirada. */
  readonly alEntrar?: (puesto: PuestoDeLaPlaza) => void;
  /** Ha llegado a su puesto: los demás le saludan. */
  readonly alLlegar?: (puesto: PuestoDeLaPlaza) => void;
}

/** Cuánto tarda en saludar al que llega cada asiento más que el anterior. */
const ESCALON_DEL_SALUDO = 0.15;

const pinza = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

export function AventureroDeLaPlaza(props: PropsDelAventureroDeLaPlaza): JSX.Element {
  const { puesto, indice, color, figura, presente, calidad, modoDeNacer, retraso, zarpando, llegadas, semilla, figuras, biblioteca, alEntrar, alLlegar } = props;
  const camara = useThree((s) => s.camera);

  /* La máquina de estados y los sucesos pendientes de aplicar en el siguiente fotograma. */
  const estado = useRef<EstadoDeAventurero | null>(null);
  const pendientes = useRef<Suceso[]>([]);
  const primeraPresencia = useRef(true);
  const avisoDeEntrada = useRef(false);
  const avisoDeLlegada = useRef(false);
  const avisos = useRef({ alEntrar, alLlegar });
  avisos.current = { alEntrar, alLlegar };

  /* La figura que se VE, que va por detrás de la que se pide (ver `embarcadero/aventurero.tsx`). */
  const [figuraVisible, ponerFiguraVisible] = useState<FiguraId>(figura);
  const figuraPedida = useRef(figura);
  figuraPedida.current = figura;
  const vestidoPedidoPara = useRef<FiguraId | null>(null);

  useEffect(() => {
    if (primeraPresencia.current) {
      primeraPresencia.current = false;
      return;
    }
    pendientes.current.push(presente ? 'vuelve' : 'se-ausenta');
  }, [presente]);

  useEffect(() => {
    if (zarpando) pendientes.current.push('zarpa');
  }, [zarpando]);

  /* Alguien ha llegado a su puesto: se le saluda, escalonado por asiento. */
  const llegadasVistas = useRef(llegadas);
  const saludaEn = useRef<number | null>(null);
  useEffect(() => {
    if (llegadas === llegadasVistas.current) return;
    llegadasVistas.current = llegadas;
    saludaEn.current = -1;
  }, [llegadas]);

  /* La marioneta: el clon con su mezclador. Se rehace al cambiar la figura visible o al llegar la biblioteca. */
  const cargado = figuras.get(figuraVisible);
  const marioneta = useMemo(() => (cargado === undefined ? null : montaMarioneta(cargado, biblioteca)), [cargado, biblioteca]);
  useEffect(
    () => () => {
      if (marioneta !== null) desmontaMarioneta(marioneta);
    },
    [marioneta],
  );

  /* El humo del cambio de figura: catorce motas que viven 1,3 s, como en el Muelle. */
  const humo = useMemo(() => {
    const azar = sorteo(semilla ^ 0x51ab);
    return {
      geometria: geometriaDeMotas(MOTAS_DE_HUMO, { x: [-0.7, 0.7], y: [0.2, 2.2], z: [-0.7, 0.7] }, azar),
      material: materialDeMotas('#d8c6ae', 0.6, 0.35),
    };
  }, [semilla]);
  useEffect(
    () => () => {
      humo.geometria.dispose();
      humo.material.dispose();
    },
    [humo],
  );
  const humoDesde = useRef(-1);

  const grupo = useRef<THREE.Group>(null);
  const grupoDelHumo = useRef<THREE.Points>(null);
  const giroActual = useRef<number | null>(null);
  const largoDeLaEntrada = useMemo(() => largoDelCamino(puesto.entrada), [puesto]);
  const largoDeLaSalida = useMemo(() => largoDelCamino(puesto.salida), [puesto]);

  useFrame((s, dt) => {
    const ahora = s.clock.elapsedTime;
    if (estado.current === null) estado.current = nacer(semilla, ahora, modoDeNacer, retraso, presente);
    let e = estado.current;
    for (const suceso of pendientes.current) e = siguiente(e, suceso, ahora);
    pendientes.current.length = 0;
    e = siguiente(e, 'tic', ahora);
    estado.current = e;

    /* El saludo al que llega, cuando le toca a este asiento. */
    if (saludaEn.current !== null) {
      if (saludaEn.current < 0) saludaEn.current = ahora + ESCALON_DEL_SALUDO * Math.max(0, indice);
      else if (ahora >= saludaEn.current) {
        saludaEn.current = null;
        pendientes.current.push('saluda');
      }
    }

    /* El cambio de figura: el «qué» lo dice la prop, el «cuándo» el estado (ver `embarcadero/aventurero.tsx`). */
    const vestido = progresoDeVestido(e, ahora);
    const pedida = figuraPedida.current;
    if (pedida !== figuraVisible && figuras.has(pedida)) {
      if (marioneta === null || e.fase === 'zarpando' || e.fase === 'zarpado') {
        vestidoPedidoPara.current = null;
        ponerFiguraVisible(pedida);
      } else if (e.fase === 'vistiendose') {
        if (vestido.cambiaYa) {
          humoDesde.current = ahora;
          vestidoPedidoPara.current = null;
          ponerFiguraVisible(pedida);
        }
      } else if ((e.fase === 'esperando' || e.fase === 'ausente') && vestidoPedidoPara.current !== pedida) {
        vestidoPedidoPara.current = pedida;
        pendientes.current.push('se-viste');
      }
    }

    /* Los dos avisos, una vez cada uno: entra en la plaza, y llega a su puesto. */
    if (!avisoDeEntrada.current && e.fase === 'llegando') {
      avisoDeEntrada.current = true;
      avisos.current.alEntrar?.(puesto);
    }
    if (!avisoDeLlegada.current && avisoDeEntrada.current && e.fase !== 'llegando') {
      avisoDeLlegada.current = true;
      avisos.current.alLlegar?.(puesto);
    }

    const g = grupo.current;
    if (g !== null) {
      /* Dónde está: andando por su camino, corriendo por el de salida, o en su sitio. */
      let x = puesto.pie.x;
      let z = puesto.pie.z;
      let rumbo: number | null = null;
      let visible = marioneta !== null;
      if (e.fase === 'llegando') {
        const punto = puntoDelCamino(puesto.entrada, progresoDeLaEntrada(e, ahora) * largoDeLaEntrada);
        x = punto.x;
        z = punto.z;
        rumbo = punto.rumbo;
      } else if (e.fase === 'zarpando' || e.fase === 'zarpado') {
        const metros = metrosDeLaSalida(e, ahora);
        if (metros > 0) {
          const punto = puntoDelCamino(puesto.salida, metros);
          x = punto.x;
          z = punto.z;
          rumbo = punto.rumbo;
        }
        /* Al final de su camino ya no está en la plaza: deja de pintarse. */
        if (metros >= largoDeLaSalida) visible = false;
      }
      g.position.set(x, SUELO_DE_LA_PLAZA, z);

      /* Hacia dónde mira: por donde anda, a la cámara si está, y al monumento si se ha ido. */
      const objetivo =
        rumbo !== null
          ? rumbo
          : e.presente
            ? Math.atan2(camara.position.x - x, camara.position.z - z)
            : rumboDe({ x, z }, { x: MONUMENTO.x, z: MONUMENTO.z });
      if (giroActual.current === null) giroActual.current = objetivo;
      giroActual.current += giroCorto(giroActual.current, objetivo) * amortiguado(dt, rumbo !== null ? 7 : 4);
      g.rotation.set(0, giroActual.current, 0);

      const nacido = cuantoHaNacido(e, ahora);
      if (nacido <= 0.001) visible = false;
      if (e.fase === 'vistiendose' && !vestido.cambiaYa && vestido.u > 0.85) visible = false;
      g.visible = visible;
      const rebote = 1 + Math.sin(Math.PI * nacido) * 0.1;
      g.scale.set(0.8 + 0.2 * nacido, Math.max(0.001, nacido * rebote), 0.8 + 0.2 * nacido);
    }

    /* El clip, con su velocidad: la de la entrada sale del largo de su camino. */
    if (marioneta !== null) {
      const clip = clipDeLaPlaza(e, ahora, puesto.ritmo);
      reproduce(marioneta, clip.clip, clip.bucle, clip.desde, ahora);
      if (marioneta.actual !== null) marioneta.actual.setEffectiveTimeScale(clip.velocidad);
      marioneta.mezclador.update(pinza(dt, 0, 0.1));
    }

    /* El humo del vestido, que sube donde esté. */
    const h = grupoDelHumo.current;
    if (h !== null) {
      const vida = humoDesde.current < 0 ? 2 : ahora - humoDesde.current;
      h.visible = vida < 1.3;
      if (h.visible) {
        const cam = s.camera as THREE.PerspectiveCamera;
        humo.material.uniforms.tiempo.value = ahora;
        humo.material.uniforms.opacidad.value = 1 - vida / 1.3;
        humo.material.uniforms.escalaDePantalla.value = escalaDePantallaDe(s.size.height * s.viewport.dpr, cam.fov ?? 55);
        h.position.set(grupo.current?.position.x ?? puesto.pie.x, SUELO_DE_LA_PLAZA + vida * 1.2, grupo.current?.position.z ?? puesto.pie.z);
      }
    }
  });

  return (
    <group>
      <group ref={grupo} visible={false}>
        {marioneta === null ? null : <primitive object={marioneta.raiz} />}
        {/*
          El disco de contacto va en las dos calidades: la escena no proyecta sombras en
          ningún cliente (ningún `Canvas` activa el mapa de sombras), y sin algo oscuro
          bajo los pies la figura flota sobre la acera.
        */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} raycast={() => null}>
          <circleGeometry args={[0.75, SEGMENTOS_DEL_DISCO]} />
          <meshBasicMaterial color={color} transparent opacity={calidad === 'sobria' ? 0.34 : 0.26} depthWrite={false} />
        </mesh>
      </group>

      <points ref={grupoDelHumo} geometry={humo.geometria} material={humo.material} visible={false} frustumCulled={false} />
    </group>
  );
}
