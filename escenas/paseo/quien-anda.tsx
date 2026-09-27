/**
 * QUIEN ANDA: la marioneta de quien pasea, en tercera persona.
 *
 * ═══ EL HUECO QUE TAPÓ ═══
 *
 * Miguel lo pidió con estas palabras: «un tablero enorme que se pueda recorrer en primera o
 * tercera persona CON LOS AVATARES ENCIMA DEL TABLERO». Las tres cámaras estaban —mesa, hombro y
 * ojos— y la bitácora daba la capa por hecha. Pero `Lindes.tsx` no tenía ni una referencia a un
 * avatar: **la cámara de hombro iba detrás de nadie**. Se ve en cuanto se pulsa «hombro» y no
 * antes, y no falla nada.
 *
 * ═══ QUÉ SE REUTILIZA, QUE ES TODO ═══
 *
 * La misma marioneta del Muelle y de La Linde Alta (`aventureros/marioneta.ts`), traída, montada
 * y pintada con lo común (`usarLaFigura`, `usarMarioneta` y `<Marioneta>`, de
 * `comun/marioneta.tsx`), la misma tabla de figuras y los mismos clips. Aquí no se modela nada
 * nuevo: lo único propio es CUÁNDO anda, cuándo corre, cuándo está quieta y a qué ritmo, y eso
 * está en `mueveAQuienAnda`, que es también lo que mueve a los demás (`los-demas.tsx`).
 *
 * ═══ NO SABE QUIÉN LA MUEVE ═══
 *
 * Nació en `escenas/lindes/` leyendo al paseante de Las Lindes, y se muda al paseo común
 * leyendo sólo una POSE: dónde, a qué altura, hacia dónde mira y a qué velocidad se ha movido.
 * La de quien pasea la escribe el paseo (`usar-el-paseo.ts`); la de otro jugador, el día que se
 * vean unos a otros, la escribirá la red con lo que llegue. La marioneta es la misma.
 *
 * ═══ EL CLIP Y SU RITMO SALEN DE LA VELOCIDAD MEDIDA, NO DE LO PULSADO ═══
 *
 * Aquí se elegía el clip con la derivada de un contador de SEGUNDOS contra un umbral en
 * unidades por segundo: el de correr no sonaba nunca, contra una pared se andaba en el sitio, y
 * el clip iba siempre a su velocidad de serie mientras el suelo corría el triple. Las tres cosas
 * y su medida están en `zancada.ts`; aquí sólo se aplican.
 *
 * ═══ Y EN PRIMERA PERSONA NO SE PINTA ═══
 *
 * Porque la cámara está dentro de su cabeza: se vería el interior del cráneo, que es peor que
 * no ver nada. Es la misma razón por la que ningún juego de esta casa pinta al jugador desde sus
 * propios ojos.
 *
 * ═══ EN LA REFRIEGA, LO SUYO LO DICE EL CANAL ═══
 *
 * En una mesa de botas (`cliente`, el canal de la escena) quien pasea también lanza, recibe, cae y
 * renace, y se le pinta igual que a los demás (`los-demas.tsx`): el gesto manda sobre el paso
 * mientras dura, en el suelo se queda tumbado, intocable parpadea. Su `lanzar` sale en cuanto se
 * pulsa —el canal lo apunta al mandar el golpe—, sin esperar a que vuelva nada. Y encima de la
 * cabeza lleva sus corazones, sin nombre, en una placa como la de los demás; en primera persona no
 * se ven, y por eso los dice también el cartel del canal de cada cliente.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { figuraQueSePinta } from '../embarcadero/figuras';
import type { Traer } from '../embarcadero/tipos';
import { giroCorto, reproduce } from '../aventureros/marioneta';
import type { Marioneta as MarionetaMontada } from '../aventureros/marioneta';
import { Marioneta, usarLaFigura, usarMarioneta } from '../comun/marioneta';
import { giroDeLaMarioneta } from './camaras';
import type { ClienteDelCanal } from './canal-de-botas';
import type { ComoVaEnLaRefriega } from './refriega';
import { ALTURA_DEL_ROTULO, altoDelRotulo, geometriaDeLosCorazones, ponerLosCorazones } from './rotulo';
import { TALLA_A_PIE } from './talla';
import { clipDelPaso, ritmoDelClip } from './zancada';

/**
 * CUÁNTO SE VUELVE LA CABEZA POR SEGUNDO, en radianes.
 *
 * Una figura que girase de golpe —al nacer mirando a otro lado, o cuando la red la corrija— se
 * leería como un muñeco que salta. Esto la deja alcanzar su rumbo en poco más de un tercio de
 * segundo, que es lo que tarda alguien en volverse.
 */
const LO_QUE_SE_VUELVE = 9;

/** Lo que la marioneta necesita saber, en cada fotograma, de quien anda. */
export interface PoseQueSePinta {
  /** Hacia el este, en unidades del mundo. */
  readonly x: number;
  /** La altura del suelo que pisa: la pone la escena, que es quien lo dibuja. */
  readonly y: number;
  /** Hacia el sur, en unidades del mundo. */
  readonly z: number;
  /** Hacia dónde mira, en radianes: 0 es el norte y crece hacia el este. */
  readonly rumbo: number;
  /** Lo que se ha movido de verdad, en unidades por segundo; negativo si fue hacia atrás. */
  readonly velocidad: number;
}

export interface QuienAndaProps {
  readonly traer: Traer;
  /** El asiento de quien pasea: de él sale la figura cuando no eligió ninguna. */
  readonly asiento: string;
  /** La figura que eligió, si eligió. Puede venir una que este binario no conozca. */
  readonly figura?: string;
  /** Dónde está, hacia dónde mira y a qué paso va. La misma referencia que mueve la cámara. */
  readonly pose: { readonly current: PoseQueSePinta };
  /** En primera persona no se pinta: la cámara está dentro de su cabeza. */
  readonly enPrimeraPersona: boolean;
  readonly alFallar?: (motivo: string) => void;
  /**
   * El canal de la escena, en una mesa de botas: de él sale cómo va quien pasea en la refriega. Sin
   * canal abierto su `current` es `null` y quien pasea sólo anda.
   */
  readonly cliente?: { readonly current: ClienteDelCanal | null };
}

/**
 * LO QUE UNA MARIONETA QUE ANDA RECUERDA ENTRE FOTOGRAMAS: hacia dónde mira de verdad, y de qué
 * montaje. Una marioneta nueva —otra figura, o la misma vuelta a montar— mira a su rumbo de golpe.
 */
export interface RumboPintado {
  de: MarionetaMontada | null;
  ahora: number | null;
}

/** Dónde anda y a qué paso, que es lo que dice la pose de quien pasea y la foto de cualquiera de los demás. */
export interface PasoQueSePinta {
  readonly x: number;
  readonly z: number;
  readonly rumbo: number;
  readonly velocidad: number;
}

/**
 * LA MARIONETA DE QUIEN ANDA, EN UN FOTOGRAMA: se enseña —o parpadea—, se pone en su sitio, se
 * vuelve hacia su rumbo y toca el clip que manda.
 *
 * Es la misma para quien pasea y para los demás (`los-demas.tsx`): estuvo escrita dos veces, línea a
 * línea, y lo único distinto era de dónde sale la pose y a qué altura se pinta, que es lo que llega
 * por parámetro. Así un arreglo del paso llega a todas las figuras que andan y no sólo a la propia.
 */
export function mueveAQuienAnda(
  m: MarionetaMontada,
  g: THREE.Group,
  quien: PasoQueSePinta,
  y: number,
  como: ComoVaEnLaRefriega | null,
  rumbo: RumboPintado,
  dt: number,
): void {
  /* Intocable, parpadea: ver `refriega.ts`. */
  g.visible = como === null || como.seVe;
  g.position.set(quien.x, y, quien.z);
  /*
   * ═══ A SU TALLA A PIE, NO A LA DE SERIE ═══
   *
   * La figura de KayKit mide una persona del mundo (2,543), y a pie se pinta a `TALLA_A_PIE` de eso
   * (`talla.ts`, con las medidas que lo decidieron en `shared/mecanicas/talla.ts`). Se escala el
   * grupo y no la raíz de la marioneta: el mezclador mueve huesos, no escalas, y así la misma
   * marioneta montada sirve en el Muelle a su tamaño de siempre.
   */
  g.scale.setScalar(TALLA_A_PIE);

  /*
   * ═══ EL RUMBO SE ALCANZA, NO SE COPIA ═══
   *
   * Se gira hacia él por el camino CORTO —`giroCorto`, el mismo del Muelle—, que es lo que
   * evita la vuelta larga al cruzar el norte.
   */
  if (rumbo.de !== m) {
    rumbo.de = m;
    rumbo.ahora = null;
  }
  const antes = rumbo.ahora;
  let ahora: number;
  if (antes === null) {
    ahora = quien.rumbo;
  } else {
    const falta = giroCorto(antes, quien.rumbo);
    const paso = Math.min(Math.abs(falta), LO_QUE_SE_VUELVE * dt) * Math.sign(falta);
    ahora = antes + paso;
  }
  rumbo.ahora = ahora;
  /*
   * ═══ Y MIRANDO A SU RUMBO, QUE NO ES SUMARLE MEDIA VUELTA ═══
   *
   * Aquí ponía `+ Math.PI`, y funciona mirando al norte y al sur. Al este y al oeste hace lo
   * contrario de lo que debe, y el aventurero anda de espaldas sin que falle nada. La cuenta
   * buena —y el porqué— están en `giroDeLaMarioneta`.
   */
  g.rotation.y = giroDeLaMarioneta(ahora);

  /*
   * ═══ QUÉ CLIP TOCA, Y A QUÉ RITMO ═══
   *
   * De la velocidad MEDIDA entre los dos últimos tics: contra una pared es cero aunque se
   * pulse, y la figura se queda quieta. El ritmo se le pone a la acción de ese clip y sólo a
   * ella: si el clip faltara, `reproduce` cae en el reposo, y el reposo a ritmo de carrera
   * sería un muñeco temblando. Se asigna `timeScale` a pelo, y no con
   * `setEffectiveTimeScale`, porque ésta quita el acompasado del fundido —el `warp` que
   * `crossFadeFrom` pone al cambiar de clip— y el paso de andar a correr daría un tirón.
   */
  const gesto = como?.gesto ?? null;
  if (como !== null && gesto !== null) {
    /* Un gesto de la refriega manda sobre el paso mientras dura; el mezclador cuenta en segundos. */
    reproduce(m, gesto.clip, gesto.bucle, gesto.desde / 1000, como.a / 1000);
  } else {
    const clip = clipDelPaso(quien.velocidad);
    reproduce(m, clip, true, 0, 0);
    const accion = m.acciones.get(clip);
    if (accion !== undefined && accion === m.actual) accion.timeScale = ritmoDelClip(clip, quien.velocidad);
  }
  m.mezclador.update(dt);
}

export function QuienAnda({
  traer,
  asiento,
  figura,
  pose,
  enPrimeraPersona,
  alFallar,
  cliente,
}: QuienAndaProps): JSX.Element | null {
  const grupo = useRef<THREE.Group>(null);
  const rumbo = useRef<RumboPintado>({ de: null, ahora: null });
  const placa = useRef<THREE.Group>(null);
  const corazonesPintados = useRef<string | null>(null);
  const camera = useThree((s) => s.camera);

  /*
   * SUS CORAZONES, sólo con canal: una placa sin nombre, escondida hasta que el canal sepa cómo va
   * la refriega. Sin niebla y sin el tono de la escena, como el rótulo de los demás.
   */
  const corazones = useMemo(() => (cliente === undefined ? null : geometriaDeLosCorazones()), [cliente]);
  useEffect(() => {
    corazonesPintados.current = null;
    return () => corazones?.dispose();
  }, [corazones]);
  const tinta = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false }), []);
  useEffect(() => () => tinta.dispose(), [tinta]);

  /*
   * LA FIGURA Y LOS CLIPS, con su propia red y sin tumbar nada si no llegan. Un tablero sin
   * aventurero se sigue jugando; lo que no puede es dejar la escena a medias. Es el mismo trato
   * que tienen los dados, el reloj y el pack. Lo que no llega se le dice a la escena, que sabe si
   * eso tumba algo (Las Lindes) o sólo se dice por consola (el Burgo). Y si llega sin `reposo-a`,
   * no hay marioneta —llegaría en T— y lo dice `usarMarioneta`.
   */
  const laFigura = figuraQueSePinta(asiento, figura);
  const { cargado, biblioteca } = usarLaFigura(traer, laFigura, (_, motivo) => alFallar?.(motivo));
  const marioneta = usarMarioneta(cargado, biblioteca, 'no se pinta a quien anda');

  useFrame((_, dt) => {
    const quien = pose.current;
    /* La refriega, a la hora de ahora: a uno mismo se le pinta en el presente. `null` sin `vidas`. */
    const como = cliente?.current?.refriegaDe(asiento) ?? null;

    /* Sus corazones, encima de la cabeza y mirando a la cámara; se repintan sólo si han cambiado. */
    const r = placa.current;
    if (corazones !== null) {
      const pintar = como === null ? 'sin' : `${String(como.corazones.llenos)}:${String(como.corazones.apagados)}`;
      if (pintar !== corazonesPintados.current) {
        ponerLosCorazones(corazones, como === null ? null : como.corazones);
        corazonesPintados.current = pintar;
      }
    }
    if (r !== null) {
      r.visible = como !== null;
      r.position.set(quien.x, quien.y + ALTURA_DEL_ROTULO, quien.z);
      r.quaternion.copy(camera.quaternion);
      const campo = (((camera as THREE.PerspectiveCamera).fov ?? 45) * Math.PI) / 180;
      r.scale.setScalar(altoDelRotulo(camera.position.distanceTo(r.position), campo));
    }

    const g = grupo.current;
    if (marioneta === null || g === null) return;
    mueveAQuienAnda(marioneta, g, quien, quien.y, como, rumbo.current, dt);
  });

  if (enPrimeraPersona) return null;
  return (
    <>
      <Marioneta de={marioneta} grupo={grupo} />
      {corazones === null ? null : (
        <group ref={placa} visible={false}>
          <mesh geometry={corazones} material={tinta} />
        </group>
      )}
    </>
  );
}
