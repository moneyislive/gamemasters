/**
 * LA PLAZA: la escena del lobby del Burgo, a última hora de la tarde.
 *
 * ═══ QUÉ MONTA ═══
 *
 * Lo que `docs/burgo/LA-PLAZA.md` describe, contra el MISMO contrato que el Muelle
 * (`embarcadero/tipos.ts`, `PropsDelEmbarcadero`): la plaza sembrada con el código de la
 * mesa (`la-plaza.ts`), fundida en una sola malla con las piezas de `burgo.glb`
 * (`mundo-de-la-plaza.ts`), la cúpula del cielo de la tarde que se va al mediodía del
 * tablero al zarpar (`cielo-de-la-plaza.ts`, `tarde.ts`), los seis puestos con su farola
 * encendida o apagada y su estandarte del color del asiento, y un aventurero por asiento
 * que entra andando, espera, se viste y se va corriendo (`aventurero-de-la-plaza.tsx`).
 * La cámara es una sola y viva: toda pose es un objetivo de `camara-de-la-plaza.ts` al
 * que se llega por amortiguado exponencial, y sólo en el primer fotograma se asigna en
 * seco.
 *
 * ═══ POR QUÉ ES UNA ESCENA HERMANA Y NO UN PARÁMETRO DEL MUELLE ═══
 *
 * El Muelle es una cala a la hora azul con seis amarres y barcos; esto es una plaza de
 * ciudad a la tarde con seis puestos y aceras. Comparten el CONTRATO —las mismas props,
 * los mismos avisos, el mismo tope de quince segundos— y comparten todo lo que es
 * aritmética o carga (`gestos.ts`, `camara.ts`, `cargar.ts`, `tinte.ts`, `particulas.ts`,
 * `marioneta.ts`), que es justamente lo que hace que dos paisajes distintos se comporten
 * igual. Lo que no comparten es el paisaje, y por eso son dos ficheros y no un `if`.
 *
 * ═══ LAS LLAMADAS DE DIBUJO, QUE ES LO QUE MANDA EN UN MÓVIL ═══
 *
 * Todo lo que no se mueve va en UNA malla fundida: veinticuatro losas de calle, cuarenta
 * y cuatro soleras, diecinueve fachadas, el monumento, los seis bancos, las seis farolas,
 * las terrazas, el arbolado y los coches. Encima, una `InstancedMesh` para los seis
 * estandartes (teñidos por color de instancia), otra para las seis bombillas y otra para
 * sus halos; la cúpula; las motas; y por cada aventurero su malla con piel, su disco y su
 * humo. Con los seis sentados son veinticuatro llamadas contra un tope de setenta
 * (`presupuesto-de-la-plaza.ts`), y el banco las mide de verdad.
 *
 * ═══ LOS AVISOS DEL CONTRATO, Y CÓMO SE CUMPLEN AQUÍ ═══
 *
 * `alEstarListo` se llama SIEMPRE y una sola vez: cuando el catálogo del Burgo y la
 * figura local han llegado O HAN FALLADO, se deja pintar un fotograma con lo que haya y
 * en el siguiente se avisa; si `traer` no contesta nunca, un tope de quince segundos
 * avisa igual con cielo y luz. `alFallar` se llama una vez por fichero que no llegó.
 * `alZarpar`, exactamente una vez por coreografía: a los 3,2 s de empezarla o, si
 * `zarpando` llega sin mundo, en el fotograma siguiente. `alMedir`, una vez por segundo
 * con la media real del reloj de `useFrame` (cada fotograma acotado a 100 ms: un
 * navegador en segundo plano deja pasar segundos entre dos). `alEstarListo` y `alMedir`
 * los lleva el gancho común de `comun/arranque.ts`, el mismo de las demás escenas.
 *
 * ═══ LO QUE NO HAY, A PROPÓSITO ═══
 *
 * Ni `drei`, ni `document`, ni `window`, ni `fetch`: sólo `three`, React y el núcleo de
 * r3f. Ni sombras proyectadas: ningún cliente activa el mapa de sombras, y en su lugar
 * cada aventurero lleva un disco de contacto. Ni estado escrito tras desmontar: cada
 * promesa comprueba `vivo` antes de tocar nada, y al irse se sueltan geometrías,
 * materiales, la textura de las partículas y el temporizador del tope.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { amortiguado, conRespiracion, easeInOutQuart } from '../embarcadero/camara';
import type { Pose } from '../embarcadero/camara';
import { cargadorPara } from '../embarcadero/cargar';
import type { AventureroCargado } from '../embarcadero/cargar';
import { sorteo } from '../embarcadero/cala';
import { esFigura, figura as datosDeFigura, figuraQueSePinta, rutaDeLasAnimaciones } from '../embarcadero/figuras';
import type { FiguraId } from '../embarcadero/figuras';
import type { ModoDeNacer } from '../embarcadero/gestos';
import { escalaDePantallaDe, geometriaDeMotas, materialDeMotas, materialDePlanoSuave, soltarSprite } from '../embarcadero/particulas';
import { colorDeAsiento } from '../embarcadero/tema';
import type { AsientoEnElMuelle, PropsDelEmbarcadero } from '../embarcadero/tipos';
import { catalogoDelBurgoDe } from '../burgo/catalogo-del-burgo';
import { rutaDelBurgo } from '../ruta-de-modelos';
import { AventureroDeLaPlaza } from './aventurero-de-la-plaza';
import {
  DURACION_DEL_ZARPE,
  DURACION_DE_LA_MIRADA,
  ARRASTRE,
  giraAlrededorDelObjetivo,
  poseDeGrua,
  poseDeMirada,
  poseDeReposo,
} from './camara-de-la-plaza';
import { colorDeLaNieblaDeLaPlaza, distanciasDeLaNiebla, materialDelCieloDeLaPlaza, rumboDelSol } from './cielo-de-la-plaza';
import { componerLaPlaza, semillaDeLaPlaza, SUELO_DE_LA_PLAZA, TALLA_DE_LA_BANDERA } from './la-plaza';
import type { PuestoDeLaPlaza } from './la-plaza';
import { construirElMundoDeLaPlaza } from './mundo-de-la-plaza';
import { MOTAS, RADIO_DEL_CIELO, SEGMENTOS_DEL_CIELO, SEGMENTOS_DE_LA_BOMBILLA } from './presupuesto-de-la-plaza';
import { MEDIODIA_DEL_TABLERO, TARDE, mezclaDeNumeros } from './tarde';
import { usarArranqueYMedida } from '../comun/arranque';

/* ─────────────────────────────── Constantes ─────────────────────────────── */

/** Los que ya estaban al montar nacen escalonados así, y en ese mismo orden zarpan. */
const ESCALON = 0.15;
/** La farola de un puesto: encendida, a media luz si se ha ido, y apagada si no hay nadie. */
const FAROL = { vivo: 1.7, ausente: 0.6, apagado: 0.04 } as const;
/** El color de la bombilla y de su halo: la luz cálida que se acaba de encender. */
const COLOR_DE_LA_BOMBILLA = new THREE.Color('#ffd79a');
/** Lo que mide el halo de una farola en unidades de mundo. */
const HALO = 2.8;
/** El radio de la bombilla. */
const RADIO_DE_LA_BOMBILLA = 0.3;
/** Por debajo de esta relación de aspecto la ventana es «de móvil» y se ahorra la luz del puesto local. */
const ASPECTO_PANORAMICO_PARA_LUCES = 1.2;
/**
 * LA LUZ DE CARA, la misma idea que en el Muelle y por el mismo motivo medido: con sólo
 * el sol rasante, quien mira a la cámara queda con la cara en sombra. Va CON la cámara
 * —la plaza se gira con el dedo— apartada 28° para modelar en vez de aplanar, y se apaga
 * al llegar el mediodía, porque el tablero no la tiene.
 */
const LUZ_DE_CARA = { giro: (28 * Math.PI) / 180, altura: 40, lejania: 120 } as const;
const EJE_VERTICAL = new THREE.Vector3(0, 1, 0);

const pinza = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/* ─────────────────────────── Los asientos y sus puestos ─────────────────────────── */

interface Sentado {
  readonly llave: string;
  readonly asiento: AsientoEnElMuelle | null;
  readonly puesto: PuestoDeLaPlaza;
  readonly indice: number;
  readonly color: string;
  readonly figura: FiguraId;
  readonly presente: boolean;
  readonly esLocal: boolean;
  readonly modoDeNacer: ModoDeNacer;
  readonly retraso: number;
}

/* ─────────────────────────── Los estandartes y las farolas ─────────────────────────── */

/**
 * LOS SEIS ESTANDARTES EN UNA LLAMADA. La geometría va «a gris» —cada vértice guarda su
 * luminancia relativa al azul del pack— y el color del asiento entra por `instanceColor`,
 * que la multiplica: seis colores, una malla. El asta baja a media asta si el dueño se ha
 * ido y a cero si el puesto está vacío, y ondea despacio con un seno por puesto.
 */
function Estandartes({
  puestos,
  geometria,
  material,
  estados,
}: {
  puestos: readonly PuestoDeLaPlaza[];
  geometria: THREE.BufferGeometry;
  material: THREE.Material;
  estados: { readonly current: readonly { readonly color: string; readonly asta: number }[] };
}): JSX.Element {
  const malla = useRef<THREE.InstancedMesh>(null);
  const suavizada = useRef<number[]>(puestos.map(() => 0));
  const color = useMemo(() => new THREE.Color(), []);
  const posicion = useMemo(() => new THREE.Vector3(), []);
  const giro = useMemo(() => new THREE.Quaternion(), []);
  const escala = useMemo(() => new THREE.Vector3(), []);
  const matriz = useMemo(() => new THREE.Matrix4(), []);

  useFrame((s, dt) => {
    const m = malla.current;
    if (m === null) return;
    const t = s.clock.elapsedTime;
    puestos.forEach((puesto, i) => {
      const estado = estados.current[i];
      const objetivo = estado?.asta ?? 0;
      const antes = suavizada.current[i] ?? objetivo;
      const asta = antes + (objetivo - antes) * amortiguado(dt, 2.5);
      suavizada.current[i] = asta;
      giro.setFromAxisAngle(EJE_VERTICAL, puesto.bandera.giro + Math.sin(t * 1.7 + i * 1.3) * 0.07);
      posicion.set(puesto.bandera.x, SUELO_DE_LA_PLAZA, puesto.bandera.z);
      escala.set(TALLA_DE_LA_BANDERA, TALLA_DE_LA_BANDERA * Math.max(0.001, asta), TALLA_DE_LA_BANDERA);
      m.setMatrixAt(i, matriz.compose(posicion, giro, escala));
      m.setColorAt(i, color.set(estado?.color ?? '#ffffff'));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor !== null) m.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={malla} args={[geometria, material, puestos.length]} frustumCulled={false} />;
}

/**
 * LAS SEIS BOMBILLAS Y SUS HALOS: dos llamadas para las seis farolas.
 *
 * La bombilla es una esfera con material básico y su brillo va por `instanceColor`; el
 * halo es un plano aditivo encarado a la cámara, que es lo que hace que una luz se LEA
 * como encendida en una escena sin postprocesado. Un puesto vacío tiene las dos casi
 * negras: la plaza se enciende puesto a puesto según llega gente, que es el raíl de aforo
 * hecho paisaje.
 */
function Farolas({
  puestos,
  intensidades,
  conHalo,
}: {
  puestos: readonly PuestoDeLaPlaza[];
  intensidades: { readonly current: readonly number[] };
  conHalo: boolean;
}): JSX.Element {
  const bombillas = useRef<THREE.InstancedMesh>(null);
  const halos = useRef<THREE.InstancedMesh>(null);
  const suavizadas = useRef<number[]>(puestos.map(() => FAROL.apagado));
  const cosas = useMemo(
    () => ({
      esfera: new THREE.SphereGeometry(RADIO_DE_LA_BOMBILLA, SEGMENTOS_DE_LA_BOMBILLA.ancho, SEGMENTOS_DE_LA_BOMBILLA.alto),
      basico: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: true }),
      hoja: new THREE.PlaneGeometry(1, 1),
      suave: materialDePlanoSuave(0.5),
    }),
    [],
  );
  useEffect(
    () => () => {
      cosas.esfera.dispose();
      cosas.basico.dispose();
      cosas.hoja.dispose();
      cosas.suave.dispose();
    },
    [cosas],
  );
  const color = useMemo(() => new THREE.Color(), []);
  const posicion = useMemo(() => new THREE.Vector3(), []);
  const giro = useMemo(() => new THREE.Quaternion(), []);
  const escala = useMemo(() => new THREE.Vector3(), []);
  const matriz = useMemo(() => new THREE.Matrix4(), []);

  useLayoutEffect(() => {
    const b = bombillas.current;
    if (b === null) return;
    puestos.forEach((p, i) => {
      giro.identity();
      b.setMatrixAt(i, matriz.compose(posicion.set(p.bombilla.x, p.bombilla.y, p.bombilla.z), giro, escala.set(1, 1, 1)));
    });
    b.instanceMatrix.needsUpdate = true;
    b.computeBoundingSphere();
  }, [puestos, giro, matriz, posicion, escala]);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    const b = bombillas.current;
    const h = halos.current;
    const cam = s.camera;
    puestos.forEach((p, i) => {
      const objetivo = intensidades.current[i] ?? FAROL.apagado;
      const antes = suavizadas.current[i] ?? objetivo;
      const ahora = antes + (objetivo - antes) * amortiguado(dt, 3);
      suavizadas.current[i] = ahora;
      /* Un poco de ruido: una bombilla que no parpadea nada se lee como un plástico. */
      const brillo = ahora * (1 + 0.05 * Math.sin(t * 6.1 + i * 2.3) + 0.03 * Math.sin(t * 9.7 + i));
      if (b !== null) b.setColorAt(i, color.copy(COLOR_DE_LA_BOMBILLA).multiplyScalar(0.1 + brillo));
      if (h !== null) {
        /* El halo mira a la cámara: un plano tumbado se vería de canto desde el aire. */
        const haciaLaCamara = Math.atan2(cam.position.x - p.bombilla.x, cam.position.z - p.bombilla.z);
        giro.setFromAxisAngle(EJE_VERTICAL, haciaLaCamara);
        posicion.set(p.bombilla.x, p.bombilla.y, p.bombilla.z);
        const lado = HALO * (0.6 + 0.4 * Math.min(1, brillo));
        h.setMatrixAt(i, matriz.compose(posicion, giro, escala.set(lado, lado, 1)));
        h.setColorAt(i, color.copy(COLOR_DE_LA_BOMBILLA).multiplyScalar(Math.max(0, brillo - FAROL.apagado) * 0.5));
      }
    });
    if (b !== null && b.instanceColor !== null) b.instanceColor.needsUpdate = true;
    if (h !== null) {
      h.instanceMatrix.needsUpdate = true;
      if (h.instanceColor !== null) h.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={bombillas} args={[cosas.esfera, cosas.basico, puestos.length]} frustumCulled={false} />
      {conHalo ? <instancedMesh ref={halos} args={[cosas.hoja, cosas.suave, puestos.length]} frustumCulled={false} renderOrder={5} /> : null}
    </group>
  );
}

/** Las motas que flotan en la luz rasante. Sólo en plena: son un lujo de tarde. */
function Motas({ semilla }: { semilla: number }): JSX.Element {
  const cosas = useMemo(() => {
    const azar = sorteo(semilla ^ 0x0d0c);
    return {
      geometria: geometriaDeMotas(MOTAS, { x: [-30, 30], y: [1, 11], z: [-26, 28] }, azar),
      material: materialDeMotas('#ffdcae', 0.09, 0.25),
    };
  }, [semilla]);
  useEffect(
    () => () => {
      cosas.geometria.dispose();
      cosas.material.dispose();
    },
    [cosas],
  );
  useFrame((s) => {
    const cam = s.camera as THREE.PerspectiveCamera;
    cosas.material.uniforms.tiempo.value = s.clock.elapsedTime;
    cosas.material.uniforms.escalaDePantalla.value = escalaDePantallaDe(s.size.height * s.viewport.dpr, cam.fov);
  });
  return <points geometry={cosas.geometria} material={cosas.material} frustumCulled={false} />;
}

/** La luz que va con la cámara. Ver `LUZ_DE_CARA`: se recoloca cada fotograma porque la plaza se gira. */
function LuzDeCara({ intensidad, color }: { intensidad: { readonly current: number }; color: { readonly current: THREE.Color } }): JSX.Element {
  const luz = useRef<THREE.DirectionalLight>(null);
  const sitio = useMemo(() => new THREE.Vector3(), []);
  useFrame((s) => {
    const l = luz.current;
    if (l === null) return;
    sitio.set(s.camera.position.x, 0, s.camera.position.z);
    if (sitio.lengthSq() < 1e-6) sitio.set(0, 0, 1);
    sitio.normalize().applyAxisAngle(EJE_VERTICAL, LUZ_DE_CARA.giro).multiplyScalar(LUZ_DE_CARA.lejania);
    sitio.y = LUZ_DE_CARA.altura;
    l.position.copy(sitio);
    l.intensity = intensidad.current;
    l.color.copy(color.current);
  });
  return <directionalLight ref={luz} intensity={TARDE.cara.intensidad} />;
}

/* ─────────────────────────────── La escena entera ─────────────────────────────── */

export function Plaza(props: PropsDelEmbarcadero): JSX.Element {
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
  // La plaza y los puestos
  // -------------------------------------------------------------------------

  const semilla = useMemo(() => semillaDeLaPlaza(mesa.codigo), [mesa.codigo]);
  const plaza = useMemo(() => componerLaPlaza(semilla, calidad), [semilla, calidad]);
  const puestos = plaza.puestos;

  /*
   * A QUIÉN LE TOCA QUÉ PUESTO, y que no cambie. El local siempre el 0; los demás cogen
   * el primer puesto libre la primera vez que se les ve y lo conservan aunque se levante
   * alguien de delante: un puesto que se recorriera al irse otro sería un aventurero
   * teletransportado. Es la regla del Muelle, y la cámara cuenta con ella (el encuadre
   * se abre según el puesto ocupado MÁS ALTO, no según cuántos hay).
   */
  const puestoDe = useRef(new Map<string, number>());
  const modoDe = useRef(new Map<string, { modo: ModoDeNacer; retraso: number }>());
  const yaMontado = useRef(false);
  const codigoDeLaVistaAnterior = useRef<string | null | undefined>(undefined);
  const yo = mesa.asientos.find((a) => a.id === mesa.yo) ?? null;
  const figuraLocal: FiguraId | null = esFigura(figuraQuePruebo)
    ? figuraQuePruebo
    : yo !== null
      ? figuraQueSePinta(yo.id, yo.figura)
      : null;

  const sentados = useMemo<Sentado[]>(() => {
    const lista: Sentado[] = [];
    const idsDeAhora = new Set(mesa.asientos.map((a) => a.id));
    for (const id of [...puestoDe.current.keys()]) if (!idsDeAhora.has(id)) puestoDe.current.delete(id);
    for (const id of [...modoDe.current.keys()]) if (!idsDeAhora.has(id) && id !== 'local') modoDe.current.delete(id);
    /* La primera vista con este código es un estreno: los que ya estaban nacen quietos. */
    const estreno = codigoDeLaVistaAnterior.current !== mesa.codigo;
    codigoDeLaVistaAnterior.current = mesa.codigo;
    const llegaAndando = yaMontado.current && !estreno;

    if (figuraLocal !== null) {
      const modo = modoDe.current.get('local') ?? { modo: yaMontado.current ? 'aparecer' : 'quieto', retraso: 0 };
      modoDe.current.set('local', modo);
      const indice = yo === null ? 0 : mesa.asientos.indexOf(yo);
      lista.push({
        llave: 'local',
        asiento: yo,
        puesto: puestos[0] as PuestoDeLaPlaza,
        indice,
        color: colorDeAsiento(mesa.tema, Math.max(0, indice)),
        figura: figuraLocal,
        presente: yo?.presente ?? true,
        esLocal: true,
        modoDeNacer: modo.modo,
        retraso: modo.retraso,
      });
    }
    mesa.asientos.forEach((a, indice) => {
      if (a.id === mesa.yo) return;
      let cual = puestoDe.current.get(a.id);
      if (cual === undefined) {
        const ocupados = new Set(puestoDe.current.values());
        for (let k = 1; k < puestos.length; k++) {
          if (!ocupados.has(k)) {
            cual = k;
            break;
          }
        }
        if (cual === undefined) return;
        puestoDe.current.set(a.id, cual);
      }
      /* El retraso es el del PUESTO: escalona el brote al montar y el saludo al zarpar. */
      const modo = modoDe.current.get(a.id) ?? { modo: llegaAndando ? 'barco' : 'quieto', retraso: ESCALON * cual };
      modoDe.current.set(a.id, modo);
      lista.push({
        llave: a.id,
        asiento: a,
        puesto: puestos[cual] as PuestoDeLaPlaza,
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
  }, [mesa.asientos, mesa.yo, mesa.tema, mesa.codigo, yo, figuraLocal, puestos]);

  useEffect(() => {
    yaMontado.current = true;
  }, []);

  /** El puesto ocupado más alto: es lo que abre el encuadre. */
  const puestoMasAlto = sentados.reduce((mayor, s) => Math.max(mayor, s.puesto.indice), 0);

  /* El estado de cada farola y de cada estandarte, que las mallas instanciadas suavizan. */
  const intensidades = useRef<number[]>([]);
  const banderas = useRef<{ color: string; asta: number }[]>([]);
  intensidades.current = puestos.map((p) => {
    const s = sentados.find((x) => x.puesto.indice === p.indice);
    if (s === undefined) return FAROL.apagado;
    return s.presente ? FAROL.vivo : FAROL.ausente;
  });
  banderas.current = puestos.map((p) => {
    const s = sentados.find((x) => x.puesto.indice === p.indice);
    if (s === undefined) return { color: '#404040', asta: 0 };
    return { color: s.color, asta: s.presente ? 1 : 0.55 };
  });

  // -------------------------------------------------------------------------
  // La carga progresiva
  // -------------------------------------------------------------------------

  const cargador = useMemo(() => cargadorPara(traer), [traer]);
  const [catalogo, ponerCatalogo] = useState<ReadonlyMap<string, THREE.Object3D> | null>(null);
  const [biblioteca, ponerBiblioteca] = useState<readonly THREE.AnimationClip[]>([]);
  const [figuras, ponerFiguras] = useState<ReadonlyMap<FiguraId, AventureroCargado>>(new Map());
  const pedidas = useRef(new Set<FiguraId>());
  const figurasListas = useRef(new Set<FiguraId>());
  const figurasFallidas = useRef(new Set<FiguraId>());
  const plazaResuelta = useRef(false);
  /*
   * EL ARRANQUE Y LA MEDIDA, con el gancho común (`comun/arranque.ts`), como en el Muelle: dos fotogramas
   * después de `arrancar`, o a los quince segundos con cielo y luz —diciendo que la plaza no contestó, si
   * no lo hizo—, y `alMedir` una vez por segundo.
   */
  const arrancar = usarArranqueYMedida(props, {
    llave: traer,
    alVencerElTope: () => {
      if (!plazaResuelta.current) falla('la plaza no ha contestado en quince segundos');
    },
  });
  const figuraLocalRef = useRef(figuraLocal);
  figuraLocalRef.current = figuraLocal;

  const falla = (motivo: string): void => {
    if (vivo.current) avisos.current.alFallar?.(motivo);
  };
  const porQue = (fallo: unknown): string => (fallo instanceof Error ? fallo.message : String(fallo));

  /* El arranque está cuando la plaza ha contestado y la figura local de AHORA está o ha fallado. */
  const compruebaArranque = (): void => {
    if (!vivo.current || !plazaResuelta.current) return;
    const local = figuraLocalRef.current;
    if (local === null || figurasListas.current.has(local) || figurasFallidas.current.has(local)) arrancar();
  };

  /* 1. El catálogo del Burgo: la caché la comparte el tablero, así que al zarpar ya está hecha. El tope, del gancho. */
  useEffect(() => {
    catalogoDelBurgoDe(traer).then(
      (c) => {
        if (!vivo.current) return;
        ponerCatalogo(c);
        plazaResuelta.current = true;
        compruebaArranque();
      },
      (fallo: unknown) => {
        plazaResuelta.current = true;
        falla(`no ha llegado la plaza (${rutaDelBurgo()}): ${porQue(fallo)}`);
        compruebaArranque();
      },
    );
  }, [traer]);

  /* 2. Las figuras que hacen falta, la local la primera; 3. la biblioteca, tras la primera figura. */
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
          falla(`no han llegado las animaciones de los aventureros (${rutaDeLasAnimaciones()}): ${porQue(fallo)}`);
        },
      );
    };
    for (const id of figurasQueHacenFalta) {
      if (pedidas.current.has(id)) continue;
      pedidas.current.add(id);
      cargador.aventurero(id).then(
        (a) => {
          if (!vivo.current) return;
          figurasListas.current.add(id);
          ponerFiguras((antes) => {
            const nuevas = new Map(antes);
            nuevas.set(id, a);
            return nuevas;
          });
          compruebaArranque();
          pideBiblioteca();
        },
        (fallo: unknown) => {
          figurasFallidas.current.add(id);
          falla(`no ha llegado la figura «${datosDeFigura(id).nombre}»: ${porQue(fallo)}`);
          compruebaArranque();
          pideBiblioteca();
        },
      );
    }
    if (figurasQueHacenFalta.length === 0 && !bibliotecaPedida.current) pideBiblioteca();
  }, [cargador, figurasQueHacenFalta]);

  useEffect(() => {
    compruebaArranque();
  }, [figuraLocal]);

  // -------------------------------------------------------------------------
  // El mundo fijo, el cielo y la niebla
  // -------------------------------------------------------------------------

  const mundo = useMemo(() => (catalogo === null ? null : construirElMundoDeLaPlaza(plaza, catalogo)), [plaza, catalogo]);
  useEffect(() => () => mundo?.soltar(), [mundo]);
  useEffect(() => {
    if (mundo !== null && mundo.desconocidas.length > 0) falla(`faltan piezas de la plaza en el modelo: ${mundo.desconocidas.join(', ')}`);
  }, [mundo]);

  const cielo = useMemo(() => materialDelCieloDeLaPlaza(), []);
  useEffect(() => () => cielo.dispose(), [cielo]);
  useEffect(() => () => soltarSprite(), []);

  const niebla = useRef<THREE.Fog>(null);
  const cupula = useRef<THREE.Mesh>(null);
  const sol = useRef<THREE.DirectionalLight>(null);
  const hemisferio = useRef<THREE.HemisphereLight>(null);
  const colorDeLaCara = useRef(new THREE.Color(TARDE.cara.color));
  const intensidadDeLaCara = useRef(TARDE.cara.intensidad);

  // -------------------------------------------------------------------------
  // La cámara, el zarpe, la mirada, el arrastre y las medidas
  // -------------------------------------------------------------------------

  const camara = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const tamanoDelLienzo = useThree((s) => s.size);
  useEffect(() => {
    /* El plano lejano tiene que dejar dentro la cúpula; la cámara de serie de r3f se queda corta. */
    camara.near = 0.5;
    camara.far = Math.max(camara.far, RADIO_DEL_CIELO * 1.3);
    camara.updateProjectionMatrix();
  }, [camara]);

  const primerFotograma = useRef(true);
  const posicionActual = useMemo(() => new THREE.Vector3(), []);
  const objetivoActual = useMemo(() => new THREE.Vector3(), []);
  const auxPosicion = useMemo(() => new THREE.Vector3(), []);
  const fovActual = useRef(55);
  const mirada = useRef<{ desde: number; punto: { x: number; z: number } } | null>(null);
  const zarpe = useRef<{ pedido: boolean; desde: number | null; avisado: boolean }>({ pedido: false, desde: null, avisado: false });
  const mediodia = useRef(0);
  const arrastre = useRef({ activo: false, x0: 0, objetivo: 0, actual: 0 });
  const colorDeNiebla = useMemo(() => new THREE.Color(TARDE.niebla), []);
  const colorDelSol = useMemo(() => new THREE.Color(TARDE.sol.color), []);
  const colorDelCielo = useMemo(() => new THREE.Color(TARDE.hemisferio.cielo), []);
  const colorDelSuelo = useMemo(() => new THREE.Color(TARDE.hemisferio.suelo), []);
  const rumbo = useMemo(() => new THREE.Vector3(), []);
  const finDeLaTarde = useMemo(
    () => ({
      niebla: new THREE.Color(MEDIODIA_DEL_TABLERO.niebla),
      sol: new THREE.Color(MEDIODIA_DEL_TABLERO.sol.color),
      cielo: new THREE.Color(MEDIODIA_DEL_TABLERO.hemisferio.cielo),
      suelo: new THREE.Color(MEDIODIA_DEL_TABLERO.hemisferio.suelo),
      cara: new THREE.Color(MEDIODIA_DEL_TABLERO.cara.color),
    }),
    [],
  );

  useEffect(() => {
    /* De ida: un `false` después del `true` no deshace nada, como en el Muelle. */
    if (zarpando === true) zarpe.current = { pedido: true, desde: null, avisado: false };
  }, [zarpando]);

  /* Cuántos han llegado a su puesto desde que se montó: los que esperan les saludan. */
  const [llegadas, ponerLlegadas] = useState(0);
  const alEntrar = useMemo(
    () => (puesto: PuestoDeLaPlaza) => {
      mirada.current = { desde: -1, punto: { x: puesto.pie.x, z: puesto.pie.z } };
    },
    [],
  );
  const alLlegar = useMemo(
    () => () => {
      ponerLlegadas((n) => n + 1);
    },
    [],
  );

  const franja = pinza(ventana.franjaInferior, 0, 0.8);
  const aspectoDeLaVentana =
    ventana.ancho > 0 && ventana.alto > 0 ? ventana.ancho / ventana.alto : tamanoDelLienzo.width / Math.max(1, tamanoDelLienzo.height);

  useFrame((s, dtCrudo) => {
    const t = s.clock.elapsedTime;
    const dt = Math.min(0.1, Math.max(0, dtCrudo));
    const cam = s.camera as THREE.PerspectiveCamera;

    /* ─ El zarpe. ─ */
    const z = zarpe.current;
    if (z.pedido && z.desde === null && !z.avisado) {
      if (mundo === null) {
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
    const objetivoDelMediodia = z.desde === null ? 0 : easeInOutQuart(u);
    mediodia.current += (objetivoDelMediodia - mediodia.current) * (z.desde === null ? amortiguado(dt, 2) : 1);
    const m = mediodia.current;

    /* ─ El cielo, la niebla y las luces corren hacia el mediodía del tablero. ─ */
    cielo.uniforms.mediodia.value = m;
    colorDeLaNieblaDeLaPlaza(m, colorDeNiebla);
    const distancias = distanciasDeLaNiebla(m);
    if (niebla.current !== null) {
      niebla.current.color.copy(colorDeNiebla);
      niebla.current.near = distancias.cerca;
      niebla.current.far = distancias.lejos;
    }
    if (cupula.current !== null) cupula.current.position.copy(cam.position);
    if (sol.current !== null) {
      rumboDelSol(m, rumbo).multiplyScalar(300);
      sol.current.position.copy(rumbo);
      sol.current.color.copy(colorDelSol.set(TARDE.sol.color).lerp(finDeLaTarde.sol, m));
      sol.current.intensity = mezclaDeNumeros(TARDE.sol.intensidad, MEDIODIA_DEL_TABLERO.sol.intensidad, m);
    }
    if (hemisferio.current !== null) {
      hemisferio.current.color.copy(colorDelCielo.set(TARDE.hemisferio.cielo).lerp(finDeLaTarde.cielo, m));
      hemisferio.current.groundColor.copy(colorDelSuelo.set(TARDE.hemisferio.suelo).lerp(finDeLaTarde.suelo, m));
      hemisferio.current.intensity = mezclaDeNumeros(TARDE.hemisferio.intensidad, MEDIODIA_DEL_TABLERO.hemisferio.intensidad, m);
    }
    colorDeLaCara.current.set(TARDE.cara.color).lerp(finDeLaTarde.cara, m);
    intensidadDeLaCara.current = mezclaDeNumeros(TARDE.cara.intensidad, MEDIODIA_DEL_TABLERO.cara.intensidad, m);

    /* ─ La cámara: el objetivo de este fotograma. ─ */
    const aspecto = ventana.ancho > 0 && ventana.alto > 0 ? ventana.ancho / ventana.alto : s.size.width / Math.max(1, s.size.height);
    let pose: Pose = conRespiracion(poseDeReposo(puestoMasAlto, aspecto, franja), t);
    const ar = arrastre.current;
    ar.actual += (ar.objetivo - ar.actual) * amortiguado(dt, ar.activo ? 10 : 4);
    if (Math.abs(ar.actual) > 1e-4) pose = giraAlrededorDelObjetivo(pose, ar.actual);
    const mir = mirada.current;
    if (mir !== null) {
      if (mir.desde < 0) mir.desde = t;
      const v = (t - mir.desde) / DURACION_DE_LA_MIRADA;
      if (v >= 1) mirada.current = null;
      else pose = poseDeMirada(pose, mir.punto, v);
    }
    if (z.desde !== null) pose = poseDeGrua(pose, u);

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
  });

  /*
   * EL ARRASTRE: ±22° con el dedo, ±2° con el ratón, y vuelta con muelle al soltar. Lo
   * recibe UN solo objeto, la cúpula, que rodea a la cámara y por tanto está bajo el
   * puntero siempre: si lo recibieran también el suelo y las piezas, pasar de uno a otro
   * dispararía un `leave` en mitad del arrastre y lo cortaría. Es la lección del Muelle.
   */
  const alPulsar = (e: ThreeEvent<PointerEvent>): void => {
    arrastre.current.activo = true;
    arrastre.current.x0 = e.pointer.x;
  };
  const alMover = (e: ThreeEvent<PointerEvent>): void => {
    const ar = arrastre.current;
    const tipo = (e as { pointerType?: string }).pointerType ?? 'touch';
    const tope = tipo === 'mouse' ? ARRASTRE.raton : ARRASTRE.dedo;
    if (ar.activo) ar.objetivo = pinza((e.pointer.x - ar.x0) * tope, -tope, tope);
    else if (tipo === 'mouse') ar.objetivo = e.pointer.x * ARRASTRE.raton;
  };
  const alSoltar = (): void => {
    arrastre.current.activo = false;
    arrastre.current.objetivo = 0;
  };

  // -------------------------------------------------------------------------

  const puestoLocal = puestos[0] as PuestoDeLaPlaza;

  return (
    <>
      {/* La niebla del color del horizonte; su color y sus distancias corren con el mediodía. */}
      <fog ref={niebla} attach="fog" args={[TARDE.niebla, TARDE.nieblaCerca, TARDE.nieblaLejos]} />

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

      {/* Las luces de la tarde: hemisférica, sol bajo y cálido, y la luz de cara que va con la cámara. */}
      <hemisphereLight ref={hemisferio} args={[TARDE.hemisferio.cielo, TARDE.hemisferio.suelo, TARDE.hemisferio.intensidad]} />
      <directionalLight ref={sol} intensity={TARDE.sol.intensidad} color={TARDE.sol.color} />
      <LuzDeCara intensidad={intensidadDeLaCara} color={colorDeLaCara} />
      {/* La bombilla del puesto local da luz de verdad; las otras cinco sólo se ven encendidas. */}
      {aspectoDeLaVentana >= ASPECTO_PANORAMICO_PARA_LUCES || plena ? (
        <pointLight
          position={[puestoLocal.bombilla.x, puestoLocal.bombilla.y, puestoLocal.bombilla.z]}
          color="#ffc98a"
          intensity={22}
          distance={26}
          decay={2}
        />
      ) : null}

      {/* Todo lo que no se mueve, en una sola llamada. */}
      {mundo?.fundido == null ? null : <mesh geometry={mundo.fundido.geometria} material={mundo.fundido.material} raycast={() => null} />}

      {/* Los seis estandartes y las seis farolas. */}
      {mundo?.estandarte == null ? null : (
        <Estandartes puestos={puestos} geometria={mundo.estandarte.geometria} material={mundo.estandarte.material} estados={banderas} />
      )}
      <Farolas puestos={puestos} intensidades={intensidades} conHalo={true} />

      {plena ? <Motas semilla={semilla} /> : null}

      {sentados.map((s) => (
        <AventureroDeLaPlaza
          key={s.llave}
          puesto={s.puesto}
          indice={s.indice}
          color={s.color}
          figura={s.figura}
          presente={s.presente}
          esLocal={s.esLocal}
          calidad={calidad}
          modoDeNacer={s.modoDeNacer}
          retraso={s.retraso}
          zarpando={zarpando === true}
          llegadas={llegadas}
          semilla={(semilla ^ (s.puesto.indice * 0x9e37_79b9)) >>> 0}
          figuras={figuras}
          biblioteca={biblioteca}
          alEntrar={alEntrar}
          alLlegar={alLlegar}
        />
      ))}
    </>
  );
}
