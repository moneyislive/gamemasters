/**
 * EL EMBARCADERO: la escena del lobby de Riberas, a la hora azul.
 *
 * ═══ QUÉ MONTA ═══
 *
 * Lo que `docs/EL-MUELLE.md` §2, §3 y §4 describen, contra el contrato de
 * `tipos.ts`: la cala sembrada con el código de la mesa (`cala.ts`), el mar con
 * su sombreador (`agua.ts`), la cúpula del cielo como fondo (`cielo.ts`), la
 * niebla del color del horizonte, las luces de la hora azul, las motas y el humo
 * (`particulas.ts`), los seis amarres con su plataforma y su farol, y un
 * `Aventurero` por asiento ocupado. La cámara es una sola y viva: toda pose es
 * un objetivo de `camara.ts` al que se llega por amortiguado exponencial, y sólo
 * en el primer fotograma se asigna en seco.
 *
 * ═══ CÓMO SE CUENTAN LAS LLAMADAS, QUE ES LO QUE MANDA ═══
 *
 * El presupuesto del §2 son setenta llamadas de dibujo con seis sentados. Aquí
 * se gastan así: el cielo y el mar (2); las teselas de la cala, UNA llamada por
 * pieza de suelo con `InstancedMesh` (unas 6); las ocho tablas del muelle
 * instanciadas (1); TODO lo demás que no se mueve —caserío, trastos, árboles,
 * rocas, montañas, juncos— fundido en UNA geometría (1); las nubes, los barcos de
 * nadie y el bote del muelle instanciados por pieza (4); las aspas del molino
 * (1); los seis postes y las seis esferas de farol instanciados (2); los botes de
 * los amarres vacíos (1); motas, humo, fuego, brumas y reflejos (5); y por cada
 * sentado el barco, la bandera, la figura y su disco (4 × 6 = 24). Unas
 * cincuenta con todo. `verify:embarcadero` suma los triángulos con la misma
 * cala; las llamadas se miran en el banco.
 *
 * ═══ LOS AVISOS DEL CONTRATO, Y CÓMO SE CUMPLEN AQUÍ ═══
 *
 * `alEstarListo` se llama SIEMPRE y una sola vez: cuando el embarcadero y la
 * figura local han llegado O HAN FALLADO, se deja pintar un fotograma con lo que
 * haya y en el siguiente se avisa. Si `traer` no contesta nunca —ni bien ni
 * mal—, un tope de quince segundos avisa igual con cielo, agua y luz. `alFallar`
 * se llama una vez por fichero que no llegó, antes o después de eso. `alZarpar`
 * se llama exactamente una vez por coreografía: a los 3,2 s de empezarla o, si
 * `zarpando` llega sin embarcadero, en el fotograma siguiente sin esperar a nada.
 * `alMedir` va una vez por segundo con la media real de milisegundos del reloj
 * de `useFrame` y cuántos fotogramas cubre.
 *
 * ═══ LO QUE NO HAY, A PROPÓSITO ═══
 *
 * Ni `drei`, ni `document`, ni `window`, ni `fetch`: sólo `three`, React y el
 * núcleo de r3f. Ni `<color attach="background">`: el fondo es la cúpula. Ni
 * sombras: ningún cliente las activa en su `Canvas`, y en su lugar cada
 * aventurero lleva un disco de contacto. Ni estado escrito tras desmontar: cada
 * promesa comprueba `vivo` antes de tocar nada, y al irse se sueltan mezcladores,
 * geometrías clonadas, materiales propios, la textura de las partículas y el
 * temporizador del tope.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { ESCALA_DEL_PACK, ESCALON, LAMINA } from '../escala';
import { geometriaDelMar, materialDelAgua } from './agua';
import { Aventurero } from './aventurero';
import { generarCala, semillaDeCodigo, sorteo } from './cala';
import type { Amarre, Cala, PiezaPuesta, TeselaDeLaCala } from './cala';
import {
  amortiguado,
  conRespiracion,
  DURACION_DE_LA_LLEGADA,
  DURACION_DEL_ZARPE,
  easeInOutQuart,
  encuadre,
  poseDeLlegada,
  poseDeZarpe,
} from './camara';
import type { Pose } from './camara';
import { aplana, cargadorPara, fundir, matrizDePuesta } from './cargar';
import type { AventureroCargado, CatalogoDelEmbarcadero, Instanciable, ParteAFundir } from './cargar';
import { COLOR_DEL_HORIZONTE, colorDeLaNiebla, materialDelCielo } from './cielo';
import { esFigura, figura as datosDeFigura, figuraQueSePinta, rutaDelEmbarcadero } from './figuras';
import type { FiguraId } from './figuras';
import type { ModoDeNacer } from './gestos';
import {
  escalaDePantallaDe,
  geometriaDeMotas,
  materialDeMotas,
  materialDePlanoSuave,
  soltarSprite,
} from './particulas';
import { PIEZA } from './piezas';
import type { NombreDePieza } from './piezas';
import {
  BRUMAS,
  LADOS_DEL_POSTE,
  MOTAS,
  MOTAS_DE_HUMO,
  RADIO_DEL_CIELO,
  SEGMENTOS_DE_LA_ESFERA,
  SEGMENTOS_DEL_CIELO,
} from './presupuesto';
import { colorDeAsiento } from './tema';
import { tenirGeometria } from './tinte';
import type { AsientoEnElMuelle, PropsDelEmbarcadero } from './tipos';

/* ─────────────────────────────── Constantes ─────────────────────────────── */

const A_FLOTE = LAMINA + 0.06;
/** Los 44 vértices «de color» del muelle se pintan de madera: el color de asiento va sólo en barco y bandera. */
const COLOR_DE_LA_MADERA = '#5a4532';
const COLOR_DEL_FAROL = new THREE.Color('#ffb765');
const COLOR_DE_LA_LLAMA = '#ffa040';
/** La niebla: empieza detrás del caserío y se cierra antes del canto del mar. */
const NIEBLA = { cerca: 70, lejos: 560 } as const;
/** Cuánto se espera a `traer` antes de levantar el telón con lo que haya. */
const TOPE_DE_ARRANQUE_MS = 15_000;
/** Los que ya estaban al montar nacen escalonados así, sin coreografía. */
const ESCALON_DE_NACIMIENTO = 0.25;
/** El farol a cada intensidad: ocupado y presente, ausente, y amarre vacío (el noray a oscuras). */
const FAROL = { vivo: 1.6, ausente: 0.55, apagado: 0.05 } as const;
/** El arrastre: ±25° con el dedo, ±2° con el ratón sin pulsar. */
const ARRASTRE = { dedo: (25 * Math.PI) / 180, raton: (2 * Math.PI) / 180 } as const;

const pinza = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/* ─────────────────────────── Los asientos y sus amarres ─────────────────────────── */

interface Sentado {
  readonly llave: string;
  readonly asiento: AsientoEnElMuelle | null;
  readonly amarre: Amarre;
  readonly indice: number;
  readonly color: string;
  readonly figura: FiguraId;
  readonly presente: boolean;
  readonly esLocal: boolean;
  readonly modoDeNacer: ModoDeNacer;
  readonly retraso: number;
}

/* ──────────────────────────────── El mundo fijo ──────────────────────────────── */

interface Instanciado {
  readonly llave: string;
  readonly partes: readonly Instanciable[];
  readonly matrices: readonly THREE.Matrix4[];
}

interface Animado {
  readonly llave: string;
  readonly partes: readonly Instanciable[];
  readonly puestas: readonly PiezaPuesta[];
}

interface Aspas {
  readonly matrizDelMolino: THREE.Matrix4;
  readonly posicion: THREE.Vector3;
  readonly giro: THREE.Quaternion;
  readonly geometria: THREE.BufferGeometry;
  readonly material: THREE.Material;
}

interface Mundo {
  readonly suelo: readonly Instanciado[];
  readonly tablas: Instanciado | null;
  readonly fundido: { readonly geometria: THREE.BufferGeometry; readonly material: THREE.Material } | null;
  readonly animados: readonly Animado[];
  readonly aspas: Aspas | null;
  readonly bote: readonly Instanciable[];
  readonly alturaDeLaAtalaya: number;
  readonly alturaDeLaTaberna: number;
  readonly soltar: () => void;
}

/** Las piezas de suelo, que van instanciadas y no fundidas: se repiten decenas de veces. */
const PIEZAS_DE_SUELO: readonly NombreDePieza[] = [
  PIEZA.tesela,
  PIEZA.fondo,
  PIEZA.agua,
  PIEZA.rampaBaja,
  PIEZA.rampaAlta,
  PIEZA.orillaA,
  PIEZA.orillaB,
  PIEZA.orillaC,
  PIEZA.orillaD,
  PIEZA.orillaE,
];

function alturaDe(objeto: THREE.Object3D | undefined): number {
  if (objeto === undefined) return 0;
  const caja = new THREE.Box3().setFromObject(objeto);
  return (caja.max.y - caja.min.y) * ESCALA_DEL_PACK;
}

/**
 * CONSTRUYE EL MUNDO FIJO de una cala con un catálogo: lo instanciado, lo fundido
 * y lo que se mueve. Devuelve también cómo soltarlo, porque todas las geometrías
 * de aquí son copias nuestras (`aplana` clona) y hay que destruirlas al irse.
 */
function construirMundo(cala: Cala, catalogo: CatalogoDelEmbarcadero): Mundo {
  const geometriasPropias: THREE.BufferGeometry[] = [];
  const porPieza = new Map<string, Instanciable[]>();
  const partesDe = (nombre: string): Instanciable[] => {
    const hechas = porPieza.get(nombre);
    if (hechas !== undefined) return hechas;
    const nodo = catalogo.piezas.get(nombre);
    const partes = nodo === undefined ? [] : aplana(nodo);
    for (const p of partes) geometriasPropias.push(p.geometria);
    porPieza.set(nombre, partes);
    return partes;
  };

  /* 1. El suelo: por pieza, una lista de matrices. */
  const teselasPorPieza = new Map<NombreDePieza, TeselaDeLaCala[]>();
  for (const t of cala.teselas) {
    if (t.pieza === null) continue;
    const lista = teselasPorPieza.get(t.pieza) ?? [];
    lista.push(t);
    teselasPorPieza.set(t.pieza, lista);
  }
  const suelo: Instanciado[] = [];
  for (const [pieza, teselas] of teselasPorPieza) {
    const partes = partesDe(pieza);
    if (partes.length === 0) continue;
    suelo.push({
      llave: pieza,
      partes,
      matrices: teselas.map((t) => matrizDePuesta(t.x, t.nivel * ESCALON, t.z, t.giro, 1)),
    });
  }
  /* Los zócalos bajo la terraza vienen como piezas puestas: van con el suelo, instanciados. */
  const zocalos = cala.piezas.filter((p) => PIEZAS_DE_SUELO.includes(p.pieza));
  const zocalosPorPieza = new Map<NombreDePieza, PiezaPuesta[]>();
  for (const z of zocalos) zocalosPorPieza.set(z.pieza, [...(zocalosPorPieza.get(z.pieza) ?? []), z]);
  for (const [pieza, puestas] of zocalosPorPieza) {
    const partes = partesDe(pieza);
    if (partes.length === 0) continue;
    suelo.push({
      llave: `${pieza}-puesta`,
      partes,
      matrices: puestas.map((p) => matrizDePuesta(p.x, p.y, p.z, p.giro, p.talla)),
    });
  }

  /* 2. Las tablas: los tramos de la cala y las seis plataformas, teñidas de madera. */
  let tablas: Instanciado | null = null;
  {
    const partes = partesDe(PIEZA.muelle).map((p) => {
      const tenida = tenirGeometria(p.geometria, COLOR_DE_LA_MADERA);
      if (tenida !== p.geometria) geometriasPropias.push(tenida);
      return { geometria: tenida, material: p.material };
    });
    if (partes.length > 0) {
      const matrices = [
        ...cala.muelle.map((t) => matrizDePuesta(t.x, 0, t.z, t.giro, 1)),
        ...cala.amarres.map((a) => matrizDePuesta(a.x, 0, a.z, a.giro, 1)),
      ];
      tablas = { llave: 'tablas', partes, matrices };
    }
  }

  /* 3. Lo que se mueve, por pieza; y el molino, cuyas aspas van aparte. */
  const animados: Animado[] = [];
  const animadosPorPieza = new Map<NombreDePieza, PiezaPuesta[]>();
  let aspas: Aspas | null = null;
  const fijas: PiezaPuesta[] = [];
  for (const p of cala.piezas) {
    if (PIEZAS_DE_SUELO.includes(p.pieza) || p.pieza === PIEZA.muelle) continue;
    if (p.animacion === 'molino') {
      const molino = catalogo.piezas.get(PIEZA.molino);
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
            matrizDelMolino: matrizDePuesta(p.x, p.y, p.z, p.giro, p.talla),
            posicion,
            giro,
            geometria: v.geometry,
            material: Array.isArray(v.material) ? (v.material[0] as THREE.Material) : v.material,
          };
          v.removeFromParent();
        }
        const cuerpo = aplana(copia);
        for (const c of cuerpo) geometriasPropias.push(c.geometria);
        porPieza.set('molino-sin-aspas', cuerpo);
        fijas.push({ ...p, pieza: 'molino-sin-aspas' as NombreDePieza });
      }
      continue;
    }
    if (p.animacion !== undefined) {
      animadosPorPieza.set(p.pieza, [...(animadosPorPieza.get(p.pieza) ?? []), p]);
      continue;
    }
    fijas.push(p);
  }
  for (const [pieza, puestas] of animadosPorPieza) {
    const partes = partesDe(pieza);
    if (partes.length === 0) continue;
    animados.push({ llave: pieza, partes, puestas });
  }

  /* 4. Todo lo fijo, en una sola geometría. */
  const aFundir: ParteAFundir[] = [];
  let materialFundido: THREE.Material | null = null;
  for (const p of fijas) {
    const partes = p.pieza === ('molino-sin-aspas' as NombreDePieza) ? (porPieza.get('molino-sin-aspas') ?? []) : partesDe(p.pieza);
    const matriz = matrizDePuesta(p.x, p.y, p.z, p.giro, p.talla);
    for (const parte of partes) {
      aFundir.push({ geometria: parte.geometria, matriz });
      materialFundido ??= parte.material;
    }
  }
  const geometriaFundida = fundir(aFundir);
  if (geometriaFundida !== null) geometriasPropias.push(geometriaFundida);
  const fundido = geometriaFundida === null || materialFundido === null ? null : { geometria: geometriaFundida, material: materialFundido };

  return {
    suelo,
    tablas,
    fundido,
    animados,
    aspas,
    bote: partesDe(PIEZA.bote),
    alturaDeLaAtalaya: alturaDe(catalogo.piezas.get(PIEZA.atalaya)),
    alturaDeLaTaberna: alturaDe(catalogo.piezas.get(PIEZA.taberna)),
    soltar: () => {
      for (const g of geometriasPropias) g.dispose();
    },
  };
}

/* ───────────────────────────── Piezas instanciadas ───────────────────────────── */

/** Copias fijas de una parte: las matrices se escriben una vez. Ver `Copias` en `delta.tsx`. */
function CopiasFijas({ parte, matrices }: { parte: Instanciable; matrices: readonly THREE.Matrix4[] }): JSX.Element | null {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (m === null) return;
    matrices.forEach((matriz, i) => {
      m.setMatrixAt(i, matriz);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [matrices]);
  if (matrices.length === 0) return null;
  return <instancedMesh ref={ref} key={matrices.length} args={[parte.geometria, parte.material, matrices.length]} />;
}

/** Las copias de una pieza que se mueve: `mueve` escribe la matriz de cada puesta en cada fotograma. */
function CopiasVivas({
  partes,
  puestas,
  mueve,
}: {
  partes: readonly Instanciable[];
  puestas: readonly PiezaPuesta[];
  mueve: (p: PiezaPuesta, i: number, t: number, destino: THREE.Matrix4) => void;
}): JSX.Element | null {
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const matriz = useMemo(() => new THREE.Matrix4(), []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    for (const m of refs.current) {
      if (m === null) continue;
      puestas.forEach((p, i) => {
        mueve(p, i, t, matriz);
        m.setMatrixAt(i, matriz);
      });
      m.instanceMatrix.needsUpdate = true;
    }
  });
  if (puestas.length === 0) return null;
  return (
    <>
      {partes.map((parte, k) => (
        <instancedMesh
          key={`${String(k)}-${String(puestas.length)}`}
          ref={(m) => {
            refs.current[k] = m;
          }}
          args={[parte.geometria, parte.material, puestas.length]}
          frustumCulled={false}
        />
      ))}
    </>
  );
}

/* ─────────────────────────── Cómo se mueve cada cosa ─────────────────────────── */

const eje = new THREE.Vector3(0, 1, 0);
const ejeZ = new THREE.Vector3(0, 0, 1);
const auxPosicion = new THREE.Vector3();
const auxGiro = new THREE.Quaternion();
const auxEuler = new THREE.Euler();
const auxEscala = new THREE.Vector3();
const auxMatriz = new THREE.Matrix4();

function mueveNube(p: PiezaPuesta, i: number, t: number, destino: THREE.Matrix4): void {
  /* Deslizan de lado, despacio y sin volver por el mismo sitio: dos periodos que no se alcanzan. */
  const x = p.x + 30 * Math.sin(t / 95 + i * 1.7) + 6 * Math.sin(t / 23 + i);
  const s = ESCALA_DEL_PACK * p.talla;
  auxGiro.setFromAxisAngle(eje, p.giro);
  destino.compose(auxPosicion.set(x, p.y, p.z), auxGiro, auxEscala.set(s, s, s));
}

function mueveBarcoDeNadie(p: PiezaPuesta, i: number, t: number, destino: THREE.Matrix4): void {
  const fase = i * 2.1;
  const s = ESCALA_DEL_PACK * p.talla;
  auxEuler.set(Math.sin(t * 0.7 + fase) * 0.03, p.giro, Math.sin(t * 0.55 + fase) * 0.045);
  auxGiro.setFromEuler(auxEuler);
  destino.compose(auxPosicion.set(p.x, p.y + Math.sin(t * 0.8 + fase) * 0.18, p.z), auxGiro, auxEscala.set(s, s, s));
}

function mueveBote(p: PiezaPuesta, i: number, t: number, destino: THREE.Matrix4): void {
  const fase = i * 1.3 + p.x;
  const s = ESCALA_DEL_PACK * p.talla;
  auxEuler.set(Math.sin(t * 1.4 + fase) * 0.05, p.giro + Math.sin(t * 0.5 + fase) * 0.04, Math.sin(t * 1.1 + fase) * 0.07);
  auxGiro.setFromEuler(auxEuler);
  destino.compose(auxPosicion.set(p.x, p.y + Math.sin(t * 1.6 + fase) * 0.05, p.z), auxGiro, auxEscala.set(s, s, s));
}

const MOVIMIENTOS: Readonly<Record<string, (p: PiezaPuesta, i: number, t: number, destino: THREE.Matrix4) => void>> = {
  [PIEZA.nubeGrande]: mueveNube,
  [PIEZA.nubePequena]: mueveNube,
  [PIEZA.barcoDeNadie]: mueveBarcoDeNadie,
  [PIEZA.bote]: mueveBote,
};

/* ─────────────────────────────── La cala en escena ─────────────────────────────── */

function LaCala({ mundo }: { mundo: Mundo }): JSX.Element {
  const aspas = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const m = aspas.current;
    if (m === null || mundo.aspas === null) return;
    /* Las aspas giran alrededor de su propio eje, que en el pack es la Z local del ventilador. */
    auxGiro.setFromAxisAngle(ejeZ, s.clock.elapsedTime * 0.45);
    m.quaternion.copy(mundo.aspas.giro).multiply(auxGiro);
  });

  return (
    <group>
      {mundo.suelo.map((inst) => inst.partes.map((parte, k) => <CopiasFijas key={`${inst.llave}-${String(k)}`} parte={parte} matrices={inst.matrices} />))}
      {mundo.tablas === null ? null : mundo.tablas.partes.map((parte, k) => <CopiasFijas key={`tablas-${String(k)}`} parte={parte} matrices={(mundo.tablas as Instanciado).matrices} />)}
      {mundo.fundido === null ? null : <mesh geometry={mundo.fundido.geometria} material={mundo.fundido.material} />}
      {mundo.animados.map((a) => (
        <CopiasVivas key={a.llave} partes={a.partes} puestas={a.puestas} mueve={MOVIMIENTOS[a.llave] ?? mueveBote} />
      ))}
      {mundo.aspas === null ? null : (
        <group matrix={mundo.aspas.matrizDelMolino} matrixAutoUpdate={false}>
          <mesh ref={aspas} position={mundo.aspas.posicion} geometry={mundo.aspas.geometria} material={mundo.aspas.material} />
        </group>
      )}
    </group>
  );
}

/* ─────────────────────────────── Los faroles ─────────────────────────────── */

/**
 * SEIS POSTES Y SEIS ESFERAS EN DOS LLAMADAS. La esfera lleva material básico y
 * su brillo va por `instanceColor`: viva con ruido si el amarre está ocupado y
 * presente, a media luz si se ha ido, casi negra si el amarre está vacío. La
 * LUZ de verdad sólo la tiene el farol local, y la pone la escena.
 */
function Faroles({
  amarres,
  tablas,
  intensidades,
  reflejos,
}: {
  amarres: readonly Amarre[];
  tablas: number;
  intensidades: { readonly current: readonly number[] };
  reflejos: boolean;
}): JSX.Element {
  const esferas = useRef<THREE.InstancedMesh>(null);
  const postes = useRef<THREE.InstancedMesh>(null);
  const planos = useRef<THREE.InstancedMesh>(null);
  const suavizadas = useRef<number[]>(amarres.map(() => FAROL.apagado));
  const materiales = useMemo(
    () => ({
      poste: new THREE.MeshStandardMaterial({ color: '#2a2118', roughness: 0.9 }),
      esfera: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: true }),
      plano: materialDePlanoSuave(0.55),
      cilindro: new THREE.CylinderGeometry(0.07, 0.09, 2.8, LADOS_DEL_POSTE),
      bola: new THREE.SphereGeometry(0.22, SEGMENTOS_DE_LA_ESFERA.ancho, SEGMENTOS_DE_LA_ESFERA.alto),
      hoja: new THREE.PlaneGeometry(1, 1),
    }),
    [],
  );
  useEffect(
    () => () => {
      materiales.poste.dispose();
      materiales.esfera.dispose();
      materiales.plano.dispose();
      materiales.cilindro.dispose();
      materiales.bola.dispose();
      materiales.hoja.dispose();
    },
    [materiales],
  );

  useLayoutEffect(() => {
    const p = postes.current;
    if (p === null) return;
    amarres.forEach((a, i) => {
      auxGiro.identity();
      p.setMatrixAt(i, auxMatriz.compose(auxPosicion.set(a.farol.x, tablas + 1.4, a.farol.z), auxGiro, auxEscala.set(1, 1, 1)));
    });
    p.instanceMatrix.needsUpdate = true;
    p.computeBoundingSphere();
  }, [amarres, tablas]);

  const color = useMemo(() => new THREE.Color(), []);
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    const e = esferas.current;
    const pl = planos.current;
    const cam = s.camera;
    amarres.forEach((a, i) => {
      const objetivo = intensidades.current[i] ?? FAROL.apagado;
      const actual = suavizadas.current[i] ?? objetivo;
      const nueva = actual + (objetivo - actual) * amortiguado(dt, 3);
      suavizadas.current[i] = nueva;
      const ruido = 1 + 0.08 * Math.sin(t * 7.3 + i * 1.9) + 0.05 * Math.sin(t * 11.7 + i * 3.1);
      const brillo = nueva * ruido;
      if (e !== null) {
        auxGiro.identity();
        e.setMatrixAt(i, auxMatriz.compose(auxPosicion.set(a.farol.x, tablas + 2.95, a.farol.z), auxGiro, auxEscala.set(1, 1, 1)));
        e.setColorAt(i, color.copy(COLOR_DEL_FAROL).multiplyScalar(0.12 + brillo));
      }
      if (pl !== null) {
        /* El reflejo: un plano vertical aditivo bajo el farol, encarado a la cámara, que se estira con el brillo. */
        const haciaLaCamara = Math.atan2(cam.position.x - a.farol.x, cam.position.z - a.farol.z);
        auxGiro.setFromAxisAngle(eje, haciaLaCamara);
        pl.setMatrixAt(i, auxMatriz.compose(auxPosicion.set(a.farol.x, LAMINA - 1.4, a.farol.z), auxGiro, auxEscala.set(1.1, 3.2 + 0.4 * Math.sin(t * 2.3 + i), 1)));
        pl.setColorAt(i, color.copy(COLOR_DEL_FAROL).multiplyScalar(Math.max(0, brillo - FAROL.apagado) * 0.4));
      }
    });
    if (e !== null) {
      e.instanceMatrix.needsUpdate = true;
      if (e.instanceColor !== null) e.instanceColor.needsUpdate = true;
    }
    if (pl !== null) {
      pl.instanceMatrix.needsUpdate = true;
      if (pl.instanceColor !== null) pl.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={postes} args={[materiales.cilindro, materiales.poste, amarres.length]} />
      <instancedMesh ref={esferas} args={[materiales.bola, materiales.esfera, amarres.length]} frustumCulled={false} />
      {reflejos ? <instancedMesh ref={planos} args={[materiales.hoja, materiales.plano, amarres.length]} frustumCulled={false} /> : null}
    </group>
  );
}

/* ───────────────────────────── Lo que flota en el aire ───────────────────────────── */

function Motas({
  semilla,
  taberna,
  alturaDeLaTaberna,
  atalaya,
  alturaDeLaAtalaya,
  calidad,
}: {
  semilla: number;
  taberna: { x: number; y: number; z: number };
  alturaDeLaTaberna: number;
  atalaya: { x: number; y: number; z: number };
  alturaDeLaAtalaya: number;
  calidad: 'plena' | 'sobria';
}): JSX.Element {
  const cosas = useMemo(() => {
    const azar = sorteo(semilla ^ 0x0777);
    const motas = {
      geometria: geometriaDeMotas(MOTAS, { x: [-16, 16], y: [0.4, 8], z: [-30, 14] }, azar),
      material: materialDeMotas('#ffd7a3', 0.07, 0.3),
    };
    const humo = {
      geometria: geometriaDeMotas(
        MOTAS_DE_HUMO,
        { x: [taberna.x - 1.2, taberna.x + 1.2], y: [taberna.y + alturaDeLaTaberna - 0.5, taberna.y + alturaDeLaTaberna + 9], z: [taberna.z - 1.2, taberna.z + 1.2] },
        azar,
      ),
      material: materialDeMotas('#8e97a8', 1.4, 0.7),
    };
    const fuego = {
      geometria: geometriaDeMotas(
        10,
        { x: [atalaya.x - 0.4, atalaya.x + 0.4], y: [atalaya.y + alturaDeLaAtalaya - 0.3, atalaya.y + alturaDeLaAtalaya + 0.9], z: [atalaya.z - 0.4, atalaya.z + 0.4] },
        azar,
      ),
      material: materialDeMotas(COLOR_DE_LA_LLAMA, 0.7, 0.15),
    };
    humo.material.uniforms.opacidad.value = 0.35;
    return { motas, humo, fuego };
  }, [semilla, taberna, alturaDeLaTaberna, atalaya, alturaDeLaAtalaya]);
  useEffect(
    () => () => {
      for (const c of [cosas.motas, cosas.humo, cosas.fuego]) {
        c.geometria.dispose();
        c.material.dispose();
      }
    },
    [cosas],
  );

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const cam = s.camera as THREE.PerspectiveCamera;
    const escala = escalaDePantallaDe(s.size.height * s.viewport.dpr, cam.fov);
    for (const c of [cosas.motas, cosas.humo, cosas.fuego]) {
      c.material.uniforms.tiempo.value = t;
      c.material.uniforms.escalaDePantalla.value = escala;
    }
  });

  return (
    <group>
      {calidad === 'plena' ? <points geometry={cosas.motas.geometria} material={cosas.motas.material} frustumCulled={false} /> : null}
      {calidad === 'plena' ? <points geometry={cosas.humo.geometria} material={cosas.humo.material} frustumCulled={false} /> : null}
      <points geometry={cosas.fuego.geometria} material={cosas.fuego.material} frustumCulled={false} />
    </group>
  );
}

/** Las brumas a ras del agua: planos aditivos tumbados que derivan despacio. Sólo en plena. */
function Brumas({ semilla }: { semilla: number }): JSX.Element {
  const ref = useRef<THREE.InstancedMesh>(null);
  const cosas = useMemo(() => {
    const azar = sorteo(semilla ^ 0x0b0b);
    const puestas = Array.from({ length: BRUMAS }, () => ({
      x: -30 + azar() * 60,
      z: -50 + azar() * 50,
      talla: 18 + azar() * 16,
      fase: azar() * Math.PI * 2,
    }));
    return { puestas, geometria: new THREE.PlaneGeometry(1, 1), material: materialDePlanoSuave(0.08) };
  }, [semilla]);
  useEffect(
    () => () => {
      cosas.geometria.dispose();
      cosas.material.dispose();
    },
    [cosas],
  );
  const color = useMemo(() => new THREE.Color('#3a4670'), []);
  useFrame((s) => {
    const m = ref.current;
    if (m === null) return;
    const t = s.clock.elapsedTime;
    cosas.puestas.forEach((p, i) => {
      auxEuler.set(-Math.PI / 2, 0, p.fase + t * 0.01);
      auxGiro.setFromEuler(auxEuler);
      m.setMatrixAt(i, auxMatriz.compose(auxPosicion.set(p.x + Math.sin(t / 31 + p.fase) * 4, LAMINA + 0.4, p.z + Math.cos(t / 41 + p.fase) * 3), auxGiro, auxEscala.set(p.talla, p.talla, 1)));
      m.setColorAt(i, color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor !== null) m.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[cosas.geometria, cosas.material, BRUMAS]} frustumCulled={false} />;
}

/* ───────────────────────────── Los botes de los amarres vacíos ───────────────────────────── */

function BotesVacios({ amarres, partes }: { amarres: readonly Amarre[]; partes: readonly Instanciable[] }): JSX.Element | null {
  const puestas = useMemo<PiezaPuesta[]>(
    () =>
      amarres.map((a) => ({
        pieza: PIEZA.bote,
        x: a.barco.x - (a.barco.x - a.x) * 0.45,
        y: A_FLOTE,
        z: a.barco.z - (a.barco.z - a.z) * 0.45,
        giro: a.barco.giro + 0.4,
        talla: 1,
        nivel: 0,
        animacion: 'bote',
      })),
    [amarres],
  );
  if (partes.length === 0) return null;
  return <CopiasVivas partes={partes} puestas={puestas} mueve={mueveBote} />;
}

/* ─────────────────────────────── La escena entera ─────────────────────────────── */

export function Embarcadero(props: PropsDelEmbarcadero): JSX.Element {
  const { mesa, ventana, traer, calidad, figuraQuePruebo, zarpando } = props;
  const plena = calidad === 'plena';

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

  // -------------------------------------------------------------------------
  // La cala y los amarres
  // -------------------------------------------------------------------------

  const cala = useMemo(() => generarCala(semillaDeCodigo(mesa.codigo)), [mesa.codigo]);
  const semilla = cala.semilla;

  /*
   * A QUIÉN LE TOCA QUÉ AMARRE, y que no cambie. El local siempre el 0. Los demás
   * cogen el primer amarre libre la primera vez que se les ve y lo conservan
   * aunque se levante alguien delante: un amarre que se recorriera al irse otro
   * sería un aventurero teletransportado. Y quién estaba ya al montar nace
   * quieto y escalonado; quien llega después, en barco.
   */
  const amarreDe = useRef(new Map<string, number>());
  const modoDe = useRef(new Map<string, { modo: ModoDeNacer; retraso: number }>());
  const yaMontado = useRef(false);
  const yo = mesa.asientos.find((a) => a.id === mesa.yo) ?? null;
  const figuraLocal: FiguraId | null = esFigura(figuraQuePruebo)
    ? figuraQuePruebo
    : yo !== null
      ? figuraQueSePinta(yo.id, yo.figura)
      : null;

  const sentados = useMemo<Sentado[]>(() => {
    const lista: Sentado[] = [];
    const idsDeAhora = new Set(mesa.asientos.map((a) => a.id));
    for (const id of [...amarreDe.current.keys()]) if (!idsDeAhora.has(id)) amarreDe.current.delete(id);
    for (const id of [...modoDe.current.keys()]) if (!idsDeAhora.has(id) && id !== 'local') modoDe.current.delete(id);

    if (figuraLocal !== null) {
      const modo = modoDe.current.get('local') ?? { modo: yaMontado.current ? 'aparecer' : 'quieto', retraso: 0 };
      modoDe.current.set('local', modo);
      const indice = yo === null ? 0 : mesa.asientos.indexOf(yo);
      lista.push({
        llave: 'local',
        asiento: yo,
        amarre: cala.amarres[0] as Amarre,
        indice,
        color: colorDeAsiento(mesa.tema, Math.max(0, indice)),
        figura: figuraLocal,
        presente: yo?.presente ?? true,
        esLocal: true,
        modoDeNacer: modo.modo,
        retraso: modo.retraso,
      });
    }
    let orden = 0;
    mesa.asientos.forEach((a, indice) => {
      if (a.id === mesa.yo) return;
      let cual = amarreDe.current.get(a.id);
      if (cual === undefined) {
        const ocupados = new Set(amarreDe.current.values());
        for (let k = 1; k < cala.amarres.length; k++) {
          if (!ocupados.has(k)) {
            cual = k;
            break;
          }
        }
        if (cual === undefined) return;
        amarreDe.current.set(a.id, cual);
      }
      const modo = modoDe.current.get(a.id) ?? {
        modo: yaMontado.current ? 'barco' : 'quieto',
        retraso: yaMontado.current ? 0 : ESCALON_DE_NACIMIENTO * (orden + 1),
      };
      modoDe.current.set(a.id, modo);
      orden++;
      lista.push({
        llave: a.id,
        asiento: a,
        amarre: cala.amarres[cual] as Amarre,
        indice,
        color: colorDeAsiento(mesa.tema, indice),
        figura: figuraQueSePinta(a.id, a.figura),
        presente: a.presente,
        esLocal: false,
        modoDeNacer: modo.modo,
        retraso: modo.retraso,
      });
    });
    return lista;
  }, [mesa.asientos, mesa.yo, mesa.tema, yo, figuraLocal, cala]);

  useEffect(() => {
    yaMontado.current = true;
  }, []);

  const amarresVacios = useMemo(
    () => cala.amarres.filter((a) => !sentados.some((s) => s.amarre.indice === a.indice)),
    [cala, sentados],
  );

  /* Las intensidades de los seis faroles, que `Faroles` suaviza en el hilo de dibujo. */
  const intensidades = useRef<number[]>([]);
  intensidades.current = cala.amarres.map((a) => {
    const s = sentados.find((x) => x.amarre.indice === a.indice);
    if (s === undefined) return FAROL.apagado;
    return s.presente ? FAROL.vivo : FAROL.ausente;
  });

  // -------------------------------------------------------------------------
  // La carga progresiva
  // -------------------------------------------------------------------------

  const cargador = useMemo(() => cargadorPara(traer), [traer]);
  const [catalogo, ponerCatalogo] = useState<CatalogoDelEmbarcadero | null>(null);
  const [biblioteca, ponerBiblioteca] = useState<readonly THREE.AnimationClip[]>([]);
  const [figuras, ponerFiguras] = useState<ReadonlyMap<FiguraId, AventureroCargado>>(new Map());
  const pedidas = useRef(new Set<FiguraId>());
  const embarcaderoResuelto = useRef(false);
  const localResuelta = useRef<FiguraId | null>(null);
  const [arranque, ponerArranque] = useState(false);
  const arranqueRef = useRef(false);
  arranqueRef.current = arranque;

  const figuraLocalRef = useRef(figuraLocal);
  figuraLocalRef.current = figuraLocal;

  const falla = (motivo: string): void => {
    if (vivo.current) avisos.current.alFallar?.(motivo);
  };
  const porQue = (fallo: unknown): string => (fallo instanceof Error ? fallo.message : String(fallo));

  /* El arranque está cuando el embarcadero y la figura local han contestado, bien o mal. */
  const compruebaArranque = (): void => {
    if (!vivo.current || arranqueRef.current) return;
    if (embarcaderoResuelto.current && (figuraLocalRef.current === null || localResuelta.current === figuraLocalRef.current)) ponerArranque(true);
  };

  /* 1. El embarcadero: lo primero, con o sin él se avisa. */
  useEffect(() => {
    cargador.embarcadero().then(
      (c) => {
        if (!vivo.current) return;
        ponerCatalogo(c);
        embarcaderoResuelto.current = true;
        compruebaArranque();
      },
      (fallo: unknown) => {
        embarcaderoResuelto.current = true;
        falla(`no ha llegado el embarcadero (${rutaDelEmbarcadero()}): ${porQue(fallo)}`);
        compruebaArranque();
      },
    );
    /* El tope: si `traer` no contesta, se levanta el telón con cielo, agua y luz. */
    const tope = setTimeout(() => {
      if (!vivo.current || arranqueRef.current) return;
      if (!embarcaderoResuelto.current) falla('el embarcadero no ha contestado en quince segundos');
      ponerArranque(true);
    }, TOPE_DE_ARRANQUE_MS);
    return () => {
      clearTimeout(tope);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargador]);

  /* 2. Las figuras que hacen falta, la local la primera; 3. la biblioteca, después de la local. */
  const figurasQueHacenFalta = useMemo(() => {
    const lista: FiguraId[] = [];
    for (const s of sentados) if (!lista.includes(s.figura)) lista.push(s.figura);
    return lista;
  }, [sentados]);
  const bibliotecaPedida = useRef(false);

  useEffect(() => {
    const pideBiblioteca = (): void => {
      if (bibliotecaPedida.current) return;
      bibliotecaPedida.current = true;
      cargador.animaciones().then(
        (clips) => {
          if (vivo.current) ponerBiblioteca(clips);
        },
        (fallo: unknown) => {
          falla(`no han llegado las animaciones de los aventureros: ${porQue(fallo)}`);
        },
      );
    };
    for (const id of figurasQueHacenFalta) {
      if (pedidas.current.has(id)) continue;
      pedidas.current.add(id);
      const esLaLocal = id === figuraLocalRef.current;
      cargador.aventurero(id).then(
        (a) => {
          if (!vivo.current) return;
          ponerFiguras((antes) => {
            const nuevas = new Map(antes);
            nuevas.set(id, a);
            return nuevas;
          });
          if (esLaLocal) {
            localResuelta.current = id;
            compruebaArranque();
          }
          pideBiblioteca();
        },
        (fallo: unknown) => {
          falla(`no ha llegado la figura «${datosDeFigura(id).nombre}»: ${porQue(fallo)}`);
          if (esLaLocal) {
            localResuelta.current = id;
            compruebaArranque();
          }
          pideBiblioteca();
        },
      );
    }
    if (figurasQueHacenFalta.length === 0 && !bibliotecaPedida.current) pideBiblioteca();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargador, figurasQueHacenFalta]);

  /* Si la figura local cambia antes de que llegue la primera, el arranque espera a la nueva. */
  useEffect(() => {
    compruebaArranque();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figuraLocal]);

  // -------------------------------------------------------------------------
  // El mundo fijo y sus materiales
  // -------------------------------------------------------------------------

  const mundo = useMemo(() => (catalogo === null ? null : construirMundo(cala, catalogo)), [cala, catalogo]);
  useEffect(() => () => mundo?.soltar(), [mundo]);

  const mar = useMemo(() => ({ geometria: geometriaDelMar(), material: materialDelAgua(cala.sol) }), [cala.sol]);
  const cielo = useMemo(() => materialDelCielo(cala.sol), [cala.sol]);
  useEffect(
    () => () => {
      mar.geometria.dispose();
      mar.material.dispose();
    },
    [mar],
  );
  useEffect(() => () => cielo.dispose(), [cielo]);
  useEffect(() => () => soltarSprite(), []);

  const niebla = useRef<THREE.Fog>(null);
  const cupula = useRef<THREE.Mesh>(null);
  const tablas = catalogo?.alturaDeLasTablas ?? 0;

  // -------------------------------------------------------------------------
  // La cámara, el zarpe, la llegada, el arrastre y las medidas
  // -------------------------------------------------------------------------

  const camara = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useEffect(() => {
    /* El plano lejano tiene que dejar dentro la cúpula y el mar; la cámara de serie de r3f se queda en mil. */
    camara.near = 0.3;
    camara.far = Math.max(camara.far, RADIO_DEL_CIELO * 2.2);
    camara.updateProjectionMatrix();
  }, [camara]);

  const primerFotograma = useRef(true);
  const posicionActual = useMemo(() => new THREE.Vector3(), []);
  const objetivoActual = useMemo(() => new THREE.Vector3(), []);
  const fovActual = useRef(55);
  const llegada = useRef<{ desde: number; amarre: Amarre } | null>(null);
  const zarpe = useRef<{ pedido: boolean; desde: number | null; avisado: boolean }>({ pedido: false, desde: null, avisado: false });
  const amanecer = useRef(0);
  const arrastre = useRef({ activo: false, x0: 0, objetivo: 0, actual: 0 });
  const fotogramasDesdeElArranque = useRef(0);
  const listoAvisado = useRef(false);
  const medida = useRef({ segundos: 0, fotogramas: 0 });
  const colorDeNiebla = useMemo(() => new THREE.Color(COLOR_DEL_HORIZONTE), []);

  useEffect(() => {
    if (zarpando === true) {
      zarpe.current = { pedido: true, desde: null, avisado: false };
    } else {
      zarpe.current = { pedido: false, desde: null, avisado: false };
    }
  }, [zarpando]);

  const alAtracar = useMemo(
    () => (amarre: Amarre) => {
      llegada.current = { desde: -1, amarre };
    },
    [],
  );

  const ocupados = Math.max(1, sentados.length);
  const franja = pinza(ventana.franjaInferior, 0, 0.8);

  useFrame((s, dtCrudo) => {
    const t = s.clock.elapsedTime;
    const dt = Math.min(0.1, Math.max(0, dtCrudo));
    const cam = s.camera as THREE.PerspectiveCamera;

    /* ─ El arranque: dos fotogramas después de que el mundo esté (o haya fallado), se avisa. ─ */
    if (arranqueRef.current && !listoAvisado.current) {
      fotogramasDesdeElArranque.current++;
      if (fotogramasDesdeElArranque.current >= 2) {
        listoAvisado.current = true;
        avisos.current.alEstarListo?.();
      }
    }

    /* ─ El zarpe. ─ */
    const z = zarpe.current;
    if (z.pedido && z.desde === null && !z.avisado) {
      if (catalogo === null) {
        /* Sin mundo no hay coreografía: se avisa en cuanto se puede. */
        z.avisado = true;
        avisos.current.alZarpar?.();
      } else {
        z.desde = t;
      }
    }
    let u = 0;
    if (z.desde !== null) {
      u = pinza((t - z.desde) / DURACION_DEL_ZARPE, 0, 1);
      if (u >= 1 && !z.avisado) {
        z.avisado = true;
        avisos.current.alZarpar?.();
      }
    }
    const amanecerObjetivo = z.desde === null ? 0 : easeInOutQuart(u);
    amanecer.current += (amanecerObjetivo - amanecer.current) * (z.desde === null ? amortiguado(dt, 2) : 1);

    /* ─ El cielo, la niebla y el agua siguen al amanecer. ─ */
    cielo.uniforms.amanecer.value = amanecer.current;
    colorDeLaNiebla(amanecer.current, colorDeNiebla);
    if (niebla.current !== null) niebla.current.color.copy(colorDeNiebla);
    mar.material.uniforms.tiempo.value = t;
    mar.material.uniforms.brillo.value = 1 - 0.85 * amanecer.current;
    if (cupula.current !== null) cupula.current.position.copy(cam.position);

    /* ─ La cámara: el objetivo de este fotograma. ─ */
    const aspecto = ventana.ancho > 0 && ventana.alto > 0 ? ventana.ancho / ventana.alto : s.size.width / Math.max(1, s.size.height);
    let pose: Pose = conRespiracion(encuadre(ocupados, aspecto, franja), t);
    const ar = arrastre.current;
    ar.actual += (ar.objetivo - ar.actual) * amortiguado(dt, ar.activo ? 10 : 4);
    if (Math.abs(ar.actual) > 1e-4) pose = giraAlrededorDelObjetivo(pose, ar.actual);
    const ll = llegada.current;
    if (ll !== null) {
      if (ll.desde < 0) ll.desde = t;
      const v = (t - ll.desde) / DURACION_DE_LA_LLEGADA;
      if (v >= 1) llegada.current = null;
      else pose = poseDeLlegada(pose, ll.amarre, v);
    }
    if (z.desde !== null) pose = poseDeZarpe(pose, u);

    /* ─ Y el amortiguado hacia él: la posición más viva que el objetivo, que sigue con 0,25 s. ─ */
    if (primerFotograma.current) {
      primerFotograma.current = false;
      posicionActual.set(pose.posicion.x, pose.posicion.y, pose.posicion.z);
      objetivoActual.set(pose.objetivo.x, pose.objetivo.y, pose.objetivo.z);
      fovActual.current = pose.fov;
    } else {
      posicionActual.lerp(auxPosicion.set(pose.posicion.x, pose.posicion.y, pose.posicion.z), amortiguado(dt, 6));
      objetivoActual.lerp(auxPosicion.set(pose.objetivo.x, pose.objetivo.y, pose.objetivo.z), amortiguado(dt, 4));
      fovActual.current += (pose.fov - fovActual.current) * amortiguado(dt, 4);
    }
    cam.position.copy(posicionActual);
    cam.lookAt(objetivoActual);
    if (Math.abs(cam.fov - fovActual.current) > 0.01) {
      cam.fov = fovActual.current;
      cam.updateProjectionMatrix();
    }

    /* ─ La medida: una vez por segundo, con la media real. ─ */
    const m = medida.current;
    m.segundos += dtCrudo;
    m.fotogramas++;
    if (m.segundos >= 1) {
      const info = s.gl.info.render;
      avisos.current.alMedir?.({
        triangulos: info.triangles,
        llamadas: info.calls,
        ms: (m.segundos * 1000) / m.fotogramas,
        fotogramas: m.fotogramas,
      });
      m.segundos = 0;
      m.fotogramas = 0;
    }
  });

  /* El arrastre: ±25° con el dedo, ±2° con el ratón sin pulsar, y vuelta con muelle al soltar. */
  const alPulsar = (e: ThreeEvent<PointerEvent>): void => {
    arrastre.current.activo = true;
    arrastre.current.x0 = e.pointer.x;
  };
  const alMover = (e: ThreeEvent<PointerEvent>): void => {
    const ar = arrastre.current;
    const tipo = (e as { pointerType?: string }).pointerType ?? 'touch';
    if (ar.activo) ar.objetivo = pinza((e.pointer.x - ar.x0) * ARRASTRE.dedo, -ARRASTRE.dedo, ARRASTRE.dedo);
    else if (tipo === 'mouse') ar.objetivo = e.pointer.x * ARRASTRE.raton;
  };
  const alSoltar = (): void => {
    arrastre.current.activo = false;
    arrastre.current.objetivo = 0;
  };

  // -------------------------------------------------------------------------

  const solX = cala.sol.x;
  const solZ = cala.sol.z;
  const farolLocal = cala.amarres[0] as Amarre;

  return (
    <>
      {/* La niebla del color del horizonte; su color lo mueve el amanecer en cada fotograma. */}
      <fog ref={niebla} attach="fog" args={[COLOR_DEL_HORIZONTE, NIEBLA.cerca, NIEBLA.lejos]} />

      {/* El fondo: la cúpula pegada a la cámara. Se dibuja la primera y no escribe profundidad. */}
      <mesh
        ref={cupula}
        material={cielo}
        frustumCulled={false}
        renderOrder={-10}
        onPointerDown={alPulsar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerLeave={alSoltar}
      >
        <sphereGeometry args={[RADIO_DEL_CIELO, SEGMENTOS_DEL_CIELO.ancho, SEGMENTOS_DEL_CIELO.alto]} />
      </mesh>

      {/* Las luces del §2: hemisférica, contraluz rasante desde donde se puso el sol, y los faroles con luz. */}
      <hemisphereLight args={['#3a4a7a', '#1a1410', 0.9]} />
      <directionalLight position={[solX * 200, 14, solZ * 200]} intensity={1.7} color="#ff9a4d" />
      <pointLight position={[farolLocal.farol.x, tablas + 2.9, farolLocal.farol.z]} color="#ffb765" intensity={26} distance={24} decay={2} />
      <pointLight position={[cala.taberna.x, cala.taberna.y + 4.5, cala.taberna.z]} color="#ffa254" intensity={60} distance={46} decay={2} />
      {plena ? (
        <pointLight
          position={[cala.atalaya.x, cala.atalaya.y + (mundo?.alturaDeLaAtalaya ?? 13) + 0.6, cala.atalaya.z]}
          color={COLOR_DE_LA_LLAMA}
          intensity={40}
          distance={50}
          decay={2}
        />
      ) : null}

      {/* El mar, a la cota de la lámina. */}
      <mesh
        geometry={mar.geometria}
        material={mar.material}
        position={[0, LAMINA, 0]}
        frustumCulled={false}
        onPointerDown={alPulsar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerLeave={alSoltar}
      />

      {mundo === null ? null : <LaCala mundo={mundo} />}

      {mundo === null ? null : <Faroles amarres={cala.amarres} tablas={tablas} intensidades={intensidades} reflejos={plena} />}
      {mundo === null ? null : <BotesVacios amarres={amarresVacios} partes={mundo.bote} />}

      {mundo === null ? null : (
        <Motas
          semilla={semilla}
          taberna={cala.taberna}
          alturaDeLaTaberna={mundo.alturaDeLaTaberna}
          atalaya={cala.atalaya}
          alturaDeLaAtalaya={mundo.alturaDeLaAtalaya}
          calidad={calidad}
        />
      )}
      {plena ? <Brumas semilla={semilla} /> : null}

      {sentados.map((s) => (
        <Aventurero
          key={s.llave}
          amarre={s.amarre}
          indice={s.indice}
          color={s.color}
          figura={s.figura}
          presente={s.presente}
          esLocal={s.esLocal}
          calidad={calidad}
          modoDeNacer={s.modoDeNacer}
          retraso={s.retraso}
          zarpando={zarpando === true}
          semilla={(semilla ^ (s.amarre.indice * 0x9e37_79b9)) >>> 0}
          catalogo={catalogo}
          figuras={figuras}
          biblioteca={biblioteca}
          alAtracar={alAtracar}
        />
      ))}
    </>
  );
}

/** Gira la posición de una pose alrededor de su objetivo, en horizontal. Para el arrastre. */
function giraAlrededorDelObjetivo(pose: Pose, angulo: number): Pose {
  const rx = pose.posicion.x - pose.objetivo.x;
  const rz = pose.posicion.z - pose.objetivo.z;
  const cos = Math.cos(angulo);
  const sin = Math.sin(angulo);
  return {
    ...pose,
    posicion: {
      x: pose.objetivo.x + rx * cos + rz * sin,
      y: pose.posicion.y,
      z: pose.objetivo.z - rx * sin + rz * cos,
    },
  };
}
