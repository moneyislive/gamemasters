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
 * La misma marioneta del Muelle y de La Linde Alta (`aventureros/marioneta.ts`), el mismo
 * cargador (`embarcadero/cargar.ts`), la misma tabla de figuras y los mismos clips. Aquí no se
 * modela nada nuevo: lo único propio es CUÁNDO anda, cuándo corre, cuándo está quieta y a qué
 * ritmo.
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
 */
import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { cargadorPara } from '../embarcadero/cargar';
import type { AventureroCargado } from '../embarcadero/cargar';
import { figuraQueSePinta } from '../embarcadero/figuras';
import type { Traer } from '../embarcadero/tipos';
import { desmontaMarioneta, giroCorto, montaMarioneta, reproduce } from '../aventureros/marioneta';
import type { Marioneta } from '../aventureros/marioneta';
import { giroDeLaMarioneta } from './camaras';
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
}

export function QuienAnda({
  traer,
  asiento,
  figura,
  pose,
  enPrimeraPersona,
  alFallar,
}: QuienAndaProps): JSX.Element | null {
  const [cargada, setCargada] = useState<AventureroCargado | null>(null);
  const [biblioteca, setBiblioteca] = useState<readonly THREE.AnimationClip[]>([]);
  const [montada, setMontada] = useState<THREE.Object3D | null>(null);
  const marioneta = useRef<Marioneta | null>(null);
  const grupo = useRef<THREE.Group>(null);
  const rumboAhora = useRef<number | null>(null);

  /*
   * LA FIGURA Y LOS CLIPS, con su propia red y sin tumbar nada si no llegan. Un tablero sin
   * aventurero se sigue jugando; lo que no puede es dejar la escena a medias. Es el mismo trato
   * que tienen los dados, el reloj y el pack.
   */
  const laFigura = figuraQueSePinta(asiento, figura);
  useEffect(() => {
    let vivo = true;
    const cargador = cargadorPara(traer);
    void cargador
      .aventurero(laFigura)
      .then((a) => {
        if (vivo) setCargada(a);
      })
      .catch((e: unknown) => {
        alFallar?.(e instanceof Error ? e.message : String(e));
      });
    void cargador
      .animaciones()
      .then((clips) => {
        if (vivo) setBiblioteca(clips);
      })
      .catch((e: unknown) => {
        alFallar?.(e instanceof Error ? e.message : String(e));
      });
    return () => {
      vivo = false;
    };
  }, [alFallar, laFigura, traer]);

  useEffect(() => {
    if (cargada === null || biblioteca.length === 0) return;
    const m = montaMarioneta(cargada, biblioteca);
    if (m === null) {
      /*
       * Sin `reposo-a` no hay marioneta: la figura llegaría en T. Se dice, porque un respaldo
       * mudo es un fallo que nadie ve — la misma regla que en La Linde Alta.
       */
      console.warn(`La figura ${laFigura} ha llegado sin el clip de reposo: no se pinta a quien anda.`);
      return;
    }
    marioneta.current = m;
    setMontada(m.raiz);
    rumboAhora.current = null;
    return () => {
      desmontaMarioneta(m);
      marioneta.current = null;
      setMontada(null);
    };
  }, [biblioteca, cargada, laFigura]);

  useFrame((_, dt) => {
    const m = marioneta.current;
    const g = grupo.current;
    if (m === null || g === null) return;
    const quien = pose.current;

    g.position.set(quien.x, quien.y, quien.z);

    /*
     * ═══ EL RUMBO SE ALCANZA, NO SE COPIA ═══
     *
     * Se gira hacia él por el camino CORTO —`giroCorto`, el mismo del Muelle—, que es lo que
     * evita la vuelta larga al cruzar el norte.
     */
    const rumbo = rumboAhora.current;
    if (rumbo === null) {
      rumboAhora.current = quien.rumbo;
    } else {
      const falta = giroCorto(rumbo, quien.rumbo);
      const paso = Math.min(Math.abs(falta), LO_QUE_SE_VUELVE * dt) * Math.sign(falta);
      rumboAhora.current = rumbo + paso;
    }
    /*
     * ═══ Y MIRANDO A SU RUMBO, QUE NO ES SUMARLE MEDIA VUELTA ═══
     *
     * Aquí ponía `+ Math.PI`, y funciona mirando al norte y al sur. Al este y al oeste hace lo
     * contrario de lo que debe, y el aventurero anda de espaldas sin que falle nada. La cuenta
     * buena —y el porqué— están en `giroDeLaMarioneta`.
     */
    g.rotation.y = giroDeLaMarioneta(rumboAhora.current ?? quien.rumbo);

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
    const clip = clipDelPaso(quien.velocidad);
    reproduce(m, clip, true, 0, 0);
    const accion = m.acciones.get(clip);
    if (accion !== undefined && accion === m.actual) accion.timeScale = ritmoDelClip(clip, quien.velocidad);
    m.mezclador.update(dt);
  });

  if (montada === null || enPrimeraPersona) return null;
  return (
    <group ref={grupo}>
      <primitive object={montada} />
    </group>
  );
}
