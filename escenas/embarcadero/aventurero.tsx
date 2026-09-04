/**
 * UN AVENTURERO EN SU AMARRE: la figura, su barco y su bandera.
 *
 * ═══ QUÉ HAY AQUÍ Y QUÉ NO ═══
 *
 * Aquí está todo lo que pertenece a UN asiento y se mueve con él: la
 * `SkinnedMesh` clonada con su `AnimationMixer`, el fundido entre clips según
 * `gestos.ts`, el giro suave hacia la cámara (o hacia el mar si está ausente), el
 * barco de su color cabeceando, la bandera de su color (a media asta si se ha
 * ido), el disco de contacto y el humo del cambio de figura. El NOMBRE no: lo
 * pinta el HUD, porque un texto en el mundo se lee mal desde un móvil y peor con
 * niebla. Y la PLATAFORMA y el FAROL tampoco: son de los seis amarres, estén
 * ocupados o no, y los pone `Embarcadero.tsx` instanciados en dos llamadas para
 * los seis en vez de dos por asiento.
 *
 * La máquina de estados no vive en React: vive en una referencia y se le da el
 * reloj del `useFrame`. Los cambios de props se traducen a SUCESOS que se
 * aplican en el siguiente fotograma, para que la coreografía no dependa de en
 * qué orden React decida volver a pintar.
 *
 * ═══ NUNCA T-POSE, Y CÓMO SE CUMPLE AQUÍ ═══
 *
 * `gestos.ts` nunca pide `t-pose`; lo que sí puede pasar es que la biblioteca de
 * clips aún no haya llegado. La pose de enlace del rig ES la T, así que mientras
 * no haya un `reposo-a` que reproducir la figura no se enseña. Se ve un farol y
 * un barco un instante antes que a su dueño, que es lo que se vería en un muelle.
 *
 * ═══ EL CAMBIO DE FIGURA: EL «QUÉ» Y EL «CUÁNDO», DESACOPLADOS ═══
 *
 * `figura` puede cambiar con el asiento montado (me visto, o el otro se viste).
 * Lo que se PIDE es una cosa y lo que se VE es otra, y el paso de una a otra lo
 * decide cada fotograma mirando el estado, no un efecto de React:
 *
 *   · Si la figura pedida aún no está cargada, no pasa nada: se espera.
 *   · Si está cargada y no hay nada que despedir —la vieja nunca llegó, o
 *     falló—, o el aventurero ya va en el barco, se cambia en seco: nadie vería
 *     el gesto y esperarlo dejaría la figura equivocada.
 *   · Si está cargada y el aventurero espera, ENTONCES se entra en
 *     `vistiendose`: el `lanzar` cortado con la vieja, un soplo de humo, y la
 *     nueva `aparece` cuando `gestos.ts` dice `cambiaYa`.
 *
 * La primera versión mandaba `se-viste` al cambiar la prop y sólo cambiaba la
 * figura si el `.glb` nuevo llegaba dentro de los 1,9 s de la fase: si tardaba
 * más, la vieja se quedaba para siempre, para mí y para los demás. Y si se
 * cambiaba de figura antes de que cargase la primera, se pintaba la primera.
 *
 * ═══ LO QUE SE SUELTA AL DESMONTAR ═══
 *
 * El mezclador se para y se desengancha de su raíz, el esqueleto del clon suelta
 * su textura de huesos, y la geometría y el material del humo se destruyen. Las
 * geometrías del barco, la bandera y el estandarte NO: son de la caché de
 * `tinte.ts` y las comparten los asientos del mismo color; las suelta la escena
 * entera al irse (`soltarTintes`).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ESCALA_DEL_PACK, LAMINA } from '../escala';
import { PIEZA } from './piezas';
import { CLIP } from './figuras';
import type { FiguraId, NombreDeClip } from './figuras';
import { clonarAventurero, fundirClips } from './cargar';
import type { AventureroCargado, CatalogoDelEmbarcadero } from './cargar';
import { tenir } from './tinte';
import { amortiguado } from './camara';
import {
  clipQueToca,
  cuantoHaNacido,
  nacer,
  progresoDeLlegada,
  progresoDeVestido,
  progresoDeZarpe,
  siguiente,
} from './gestos';
import type { EstadoDeAventurero, ModoDeNacer, Suceso } from './gestos';
import { escalaDePantallaDe, geometriaDeMotas, materialDeMotas } from './particulas';
import { SEGMENTOS_DEL_DISCO } from './presupuesto';
import { sorteo } from './cala';
import type { Amarre } from './cala';
import type { Calidad } from './tipos';

export interface PropsDelAventurero {
  readonly amarre: Amarre;
  /** La posición del asiento en la lista, para el color y el escalonado. */
  readonly indice: number;
  readonly color: string;
  readonly figura: FiguraId;
  readonly presente: boolean;
  readonly esLocal: boolean;
  readonly calidad: Calidad;
  readonly modoDeNacer: ModoDeNacer;
  readonly retraso: number;
  readonly zarpando: boolean;
  /** Cuántos barcos han atracado desde que se montó la escena: cada uno más es alguien a quien saludar. */
  readonly llegadas: number;
  readonly semilla: number;
  /** `null` si el embarcadero no llegó: entonces hay figura, pero ni barco ni bandera. */
  readonly catalogo: CatalogoDelEmbarcadero | null;
  readonly figuras: ReadonlyMap<FiguraId, AventureroCargado>;
  /** La biblioteca de clips. Vacía hasta que llega. */
  readonly biblioteca: readonly THREE.AnimationClip[];
  /** El barco ha atracado: la cámara mira un momento hacia allí. */
  readonly alAtracar?: (amarre: Amarre) => void;
}

const A_FLOTE = LAMINA + 0.06;
const FUNDIDO = 0.22;
/** El aventurero va sobre la cubierta del barco, que está a esta altura de la lámina. */
const CUBIERTA = 1.1;
/** Cuánto tarda en saludar al que llega cada asiento más que el anterior. */
const ESCALON_DEL_SALUDO = 0.15;

const pinza = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));
const suaveFuera = (t: number): number => 1 - Math.pow(1 - pinza(t, 0, 1), 3);

/** El giro más corto de `a` hacia `b`, en radianes. */
function giroCorto(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/* ─────────────────────────────── La figura ─────────────────────────────── */

interface Marioneta {
  readonly raiz: THREE.Object3D;
  readonly mezclador: THREE.AnimationMixer;
  readonly acciones: ReadonlyMap<string, THREE.AnimationAction>;
  actual: THREE.AnimationAction | null;
  desdeActual: number;
}

function montaMarioneta(cargado: AventureroCargado, biblioteca: readonly THREE.AnimationClip[]): Marioneta | null {
  const raiz = clonarAventurero(cargado);
  const mezclador = new THREE.AnimationMixer(raiz);
  const acciones = new Map<string, THREE.AnimationAction>();
  for (const clip of fundirClips(cargado.clips, biblioteca)) {
    if (clip.name === CLIP.tPose) continue;
    acciones.set(clip.name, mezclador.clipAction(clip));
  }
  if (!acciones.has(CLIP.reposoA)) {
    desmontaMarioneta({ raiz, mezclador, acciones, actual: null, desdeActual: -1 });
    return null;
  }
  return { raiz, mezclador, acciones, actual: null, desdeActual: -1 };
}

function desmontaMarioneta(m: Marioneta): void {
  m.mezclador.stopAllAction();
  m.mezclador.uncacheRoot(m.raiz);
  m.raiz.traverse((n) => {
    const piel = n as THREE.SkinnedMesh;
    if (piel.isSkinnedMesh) piel.skeleton.dispose();
  });
}

/** Pone el clip que toca, fundiendo desde el anterior. Si el clip falta, `reposo-a`. */
function reproduce(m: Marioneta, clip: NombreDeClip, bucle: boolean, desde: number, ahora: number): void {
  const accion = m.acciones.get(clip) ?? m.acciones.get(CLIP.reposoA);
  if (accion === undefined) return;
  if (accion === m.actual && (bucle || Math.abs(m.desdeActual - desde) < 1e-3)) return;
  accion.reset();
  accion.setLoop(bucle ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  accion.clampWhenFinished = !bucle;
  accion.enabled = true;
  accion.setEffectiveTimeScale(1);
  accion.setEffectiveWeight(1);
  const duracion = Math.max(1e-3, accion.getClip().duration);
  const transcurrido = Math.max(0, ahora - desde);
  /* En bucle se entra en la vuelta que toca; de una vez, en su instante o clavado al final. */
  accion.time = bucle ? transcurrido % duracion : Math.min(transcurrido, duracion - 0.001);
  if (m.actual !== null && m.actual !== accion) accion.crossFadeFrom(m.actual, FUNDIDO, true);
  accion.play();
  m.actual = accion;
  m.desdeActual = desde;
}

/* ──────────────────────────────── El amarre ──────────────────────────────── */

export function Aventurero(props: PropsDelAventurero): JSX.Element {
  const { amarre, indice, color, figura, presente, esLocal, calidad, modoDeNacer, retraso, zarpando, llegadas, semilla, catalogo, figuras, biblioteca, alAtracar } = props;
  const camara = useThree((s) => s.camera);

  /* La máquina de estados y los sucesos pendientes de aplicar en el siguiente fotograma. */
  const estado = useRef<EstadoDeAventurero | null>(null);
  const pendientes = useRef<Suceso[]>([]);
  const primeraPresencia = useRef(true);
  const atracado = useRef(false);
  const alAtracarRef = useRef(alAtracar);
  alAtracarRef.current = alAtracar;

  /*
   * La figura que se VE, que va por detrás de la que se pide. La pedida se lee en
   * cada fotograma; el cambio lo decide el hilo de dibujo (ver la cabecera), y
   * `vestidoPedidoPara` recuerda para qué figura se mandó ya el `se-viste`, para
   * no mandarlo en cada fotograma mientras la máquina lo aplica.
   */
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

  /*
   * Alguien ha atracado: se saluda, escalonado por asiento. Se programa con el
   * reloj de la escena en el siguiente fotograma (−1 = «pendiente de fechar»), y
   * los que ya estaban al montar no cuentan: sólo las llegadas de verdad.
   */
  const llegadasVistas = useRef(llegadas);
  const saludaEn = useRef<number | null>(null);
  useEffect(() => {
    if (llegadas === llegadasVistas.current) return;
    llegadasVistas.current = llegadas;
    saludaEn.current = -1;
  }, [llegadas]);

  /* La marioneta: el clon con su mezclador. Se rehace al cambiar la figura visible o al llegar la biblioteca. */
  const cargado = figuras.get(figuraVisible);
  const marioneta = useMemo(
    () => (cargado === undefined ? null : montaMarioneta(cargado, biblioteca)),
    [cargado, biblioteca],
  );
  useEffect(
    () => () => {
      if (marioneta !== null) desmontaMarioneta(marioneta);
    },
    [marioneta],
  );

  /* Las piezas teñidas del asiento. La caché de `tinte.ts` hace que dos asientos del mismo color compartan geometría. */
  const barco = useMemo(() => {
    const p = catalogo?.piezas.get(PIEZA.barco);
    return p === undefined ? null : tenir(p, color).clone(true);
  }, [catalogo, color]);
  const bandera = useMemo(() => {
    const p = catalogo?.piezas.get(PIEZA.bandera);
    return p === undefined ? null : tenir(p, color).clone(true);
  }, [catalogo, color]);
  /* El estandarte, sólo en la plataforma del local, junto al farol: 72 vértices y una llamada. */
  const estandarte = useMemo(() => {
    if (!esLocal) return null;
    const p = catalogo?.piezas.get(PIEZA.estandarte);
    return p === undefined ? null : tenir(p, color).clone(true);
  }, [catalogo, color, esLocal]);

  /* El humo del cambio de figura: catorce motas que viven 1,3 s. */
  const humo = useMemo(() => {
    const azar = sorteo(semilla ^ 0x51ab);
    return {
      geometria: geometriaDeMotas(14, { x: [-0.7, 0.7], y: [0.2, 2.2], z: [-0.7, 0.7] }, azar),
      material: materialDeMotas('#b9c4d8', 0.6, 0.35),
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

  const grupoDeLaFigura = useRef<THREE.Group>(null);
  const grupoDelBarco = useRef<THREE.Group>(null);
  const grupoDeLaBandera = useRef<THREE.Group>(null);
  const grupoDelHumo = useRef<THREE.Points>(null);
  const giroActual = useRef<number | null>(null);
  const banderaActual = useRef(1);
  const fase = useMemo(() => sorteo(semilla)() * Math.PI * 2, [semilla]);

  const tablas = catalogo?.alturaDeLasTablas ?? 0;

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

    /* El cambio de figura: el «qué» lo dice la prop, el «cuándo» el estado (ver la cabecera). */
    const vestido = progresoDeVestido(e, ahora);
    const pedida = figuraPedida.current;
    if (pedida !== figuraVisible && figuras.has(pedida)) {
      if (marioneta === null || e.fase === 'zarpando' || e.fase === 'zarpado') {
        /* Nada que despedir, o nadie que lo vea: en seco. */
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

    /* El barco: cabeceo, llegada desde la niebla y zarpe hacia ella. */
    const llegada = progresoDeLlegada(e, ahora);
    const zarpe = progresoDeZarpe(e, ahora);
    const cabeceo = Math.sin(ahora * 1.3 + fase) * 0.09;
    let bx = amarre.barco.x;
    let bz = amarre.barco.z;
    if (llegada.etapa === 'viaje') {
      const u = suaveFuera(llegada.u);
      bx = amarre.llegadaDesde.x + (amarre.barco.x - amarre.llegadaDesde.x) * u;
      bz = amarre.llegadaDesde.z + (amarre.barco.z - amarre.llegadaDesde.z) * u;
    } else if (!atracado.current) {
      atracado.current = true;
      if (modoDeNacer === 'barco') alAtracarRef.current?.(amarre);
    }
    if (zarpe.etapa === 'hecho') {
      const desdeQueZarpo = ahora - e.desde;
      bz -= desdeQueZarpo * 9;
      bx -= desdeQueZarpo * 1.5;
    }
    const b = grupoDelBarco.current;
    if (b !== null) {
      b.position.set(bx, A_FLOTE + cabeceo, bz);
      b.rotation.set(Math.sin(ahora * 1.1 + fase) * 0.018, amarre.barco.giro, Math.sin(ahora * 0.9 + fase) * 0.025);
    }

    /* La figura: dónde está, hacia dónde mira, cuánto se ve. */
    const g = grupoDeLaFigura.current;
    if (g !== null) {
      let x = amarre.pie.x;
      let y = amarre.pie.y + tablas;
      let z = amarre.pie.z;
      let visible = marioneta !== null;
      if (llegada.etapa === 'viaje') {
        x = bx;
        y = A_FLOTE + cabeceo + CUBIERTA;
        z = bz;
      } else if (llegada.etapa === 'salto') {
        const u = llegada.u;
        x = bx + (amarre.pie.x - bx) * u;
        z = bz + (amarre.pie.z - bz) * u;
        y = A_FLOTE + CUBIERTA + (amarre.pie.y + tablas - A_FLOTE - CUBIERTA) * u + Math.sin(Math.PI * u) * 1.2;
      } else if (zarpe.etapa === 'carrera') {
        const u = zarpe.u;
        x = amarre.pie.x + (bx - amarre.pie.x) * u * 0.8;
        z = amarre.pie.z + (bz - amarre.pie.z) * u * 0.8;
      } else if (zarpe.etapa === 'salto') {
        const u = zarpe.u;
        x = amarre.pie.x + (bx - amarre.pie.x) * (0.8 + 0.2 * u);
        z = amarre.pie.z + (bz - amarre.pie.z) * (0.8 + 0.2 * u);
        y = amarre.pie.y + tablas + (A_FLOTE + CUBIERTA - amarre.pie.y - tablas) * u + Math.sin(Math.PI * u) * 1.4;
      } else if (zarpe.etapa === 'hecho') {
        x = bx;
        y = A_FLOTE + cabeceo + CUBIERTA;
        z = bz;
      }
      g.position.set(x, y, z);

      /* Hacia la cámara si está; hacia el mar si se ha ido; hacia el barco cuando corre. */
      let objetivo: number;
      if (zarpe.etapa === 'carrera' || zarpe.etapa === 'salto') objetivo = Math.atan2(bx - amarre.pie.x, bz - amarre.pie.z);
      else if (zarpe.etapa === 'hecho' || llegada.etapa === 'viaje') objetivo = Math.PI;
      else if (!e.presente) objetivo = Math.PI;
      else objetivo = Math.atan2(camara.position.x - x, camara.position.z - z);
      if (giroActual.current === null) giroActual.current = objetivo;
      giroActual.current += giroCorto(giroActual.current, objetivo) * amortiguado(dt, 4);
      g.rotation.set(0, giroActual.current, 0);

      const nacido = cuantoHaNacido(e, ahora);
      if (nacido <= 0.001) visible = false;
      if (e.fase === 'vistiendose' && !vestido.cambiaYa && vestido.u > 0.85) visible = false;
      g.visible = visible;
      const rebote = 1 + Math.sin(Math.PI * nacido) * 0.1;
      g.scale.set(0.8 + 0.2 * nacido, Math.max(0.001, nacido * rebote), 0.8 + 0.2 * nacido);
    }

    /* El clip. */
    if (marioneta !== null) {
      const clip = clipQueToca(e, ahora);
      reproduce(marioneta, clip.clip, clip.bucle, clip.desde, ahora);
      marioneta.mezclador.update(dt);
    }

    /* La bandera a media asta cuando no está. */
    const asta = e.presente ? 1 : 0.55;
    banderaActual.current += (asta - banderaActual.current) * amortiguado(dt, 2.5);
    const bd = grupoDeLaBandera.current;
    if (bd !== null) {
      bd.scale.set(ESCALA_DEL_PACK, ESCALA_DEL_PACK * banderaActual.current, ESCALA_DEL_PACK);
      bd.rotation.y = amarre.giro + Math.sin(ahora * 2.1 + fase) * 0.06;
    }

    /* El humo del vestido. */
    const h = grupoDelHumo.current;
    if (h !== null) {
      const vida = humoDesde.current < 0 ? 2 : ahora - humoDesde.current;
      h.visible = vida < 1.3;
      if (h.visible) {
        const cam = s.camera as THREE.PerspectiveCamera;
        humo.material.uniforms.tiempo.value = ahora;
        humo.material.uniforms.opacidad.value = 1 - vida / 1.3;
        humo.material.uniforms.escalaDePantalla.value = escalaDePantallaDe(s.size.height * s.viewport.dpr, cam.fov ?? 55);
        h.position.set(amarre.pie.x, amarre.pie.y + tablas + vida * 1.2, amarre.pie.z);
      }
    }
  });

  const s = ESCALA_DEL_PACK;
  return (
    <group>
      <group ref={grupoDelBarco}>{barco === null ? null : <primitive object={barco} scale={[s, s, s]} />}</group>

      <group ref={grupoDeLaBandera} position={[amarre.bandera.x, tablas, amarre.bandera.z]}>
        {bandera === null ? null : <primitive object={bandera} />}
      </group>

      {estandarte === null ? null : (
        <group position={[amarre.estandarte.x, tablas, amarre.estandarte.z]} rotation={[0, amarre.giro + 0.6, 0]}>
          <primitive object={estandarte} scale={[s, s, s]} />
        </group>
      )}

      <group ref={grupoDeLaFigura} visible={false}>
        {marioneta === null ? null : <primitive object={marioneta.raiz} />}
        {/*
          El disco de contacto va en las dos calidades: la escena no proyecta
          sombras en ningún cliente (el `Canvas` del escritorio no las activa y
          en el móvil no caben), y sin algo oscuro bajo los pies la figura flota.
        */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <circleGeometry args={[0.75, SEGMENTOS_DEL_DISCO]} />
          <meshBasicMaterial color="#000000" transparent opacity={calidad === 'sobria' ? 0.38 : 0.3} depthWrite={false} />
        </mesh>
      </group>

      <points ref={grupoDelHumo} geometry={humo.geometria} material={humo.material} visible={false} frustumCulled={false} />
    </group>
  );
}
