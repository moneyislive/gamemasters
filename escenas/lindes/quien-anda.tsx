/**
 * QUIEN ANDA POR EL TABLERO: el aventurero de quien pasea, en tercera persona.
 *
 * ═══ EL HUECO QUE ESTO TAPA ═══
 *
 * Miguel lo pidió con estas palabras: «un tablero enorme que se pueda recorrer en primera
 * o tercera persona CON LOS AVATARES ENCIMA DEL TABLERO». Las tres cámaras estaban —mesa,
 * hombro y ojos— y la bitácora daba la capa por hecha. Pero `Lindes.tsx` no tenía ni una
 * referencia a un avatar: **la cámara de hombro iba detrás de nadie**. Se ve en cuanto se
 * pulsa «hombro» y no antes, y no falla nada.
 *
 * ═══ QUÉ SE REUTILIZA, QUE ES TODO ═══
 *
 * La misma marioneta del Muelle y de La Linde Alta (`aventureros/marioneta.ts`), el mismo
 * cargador (`embarcadero/cargar.ts`), la misma tabla de figuras y los mismos clips. Aquí
 * no se modela nada nuevo: lo único propio es CUÁNDO anda, cuándo corre y cuándo está
 * quieto, que sale del paseante y de nada más.
 *
 * ═══ Y EN PRIMERA PERSONA NO SE PINTA ═══
 *
 * Porque la cámara está dentro de su cabeza: se vería el interior del cráneo, que es peor
 * que no ver nada. Es la misma razón por la que ningún juego de esta casa pinta al
 * jugador desde sus propios ojos.
 */
import { useEffect, useRef, useState } from 'react';
import type { JSX, MutableRefObject } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { cargadorPara } from '../embarcadero/cargar';
import type { AventureroCargado } from '../embarcadero/cargar';
import { CLIP, figuraQueSePinta } from '../embarcadero/figuras';
import { desmontaMarioneta, giroCorto, montaMarioneta, reproduce } from '../aventureros/marioneta';
import type { Marioneta } from '../aventureros/marioneta';
import { giroDeLaMarioneta } from './paseo';
import type { Paseante, Traer } from './tipos';

/**
 * CUÁNTO SE VUELVE LA CABEZA POR SEGUNDO, en radianes.
 *
 * El paseante gira de golpe —su rumbo es un número, no una animación— y una figura que
 * girase de golpe se leería como un muñeco que salta. Esto la deja alcanzar el rumbo en
 * poco más de un tercio de segundo, que es lo que tarda alguien en volverse.
 */
const LO_QUE_SE_VUELVE = 9;

/**
 * A PARTIR DE CUÁNTO SE CONSIDERA QUE CORRE, en unidades por segundo.
 *
 * El paseante no dice si corre: dice cuánto se ha movido. Se mide, y el umbral está a
 * medio camino entre el paso y la carrera de `escala.ts`, para que ni un paso largo se
 * lea como carrera ni una carrera como paseo.
 */
const CORRE_A_PARTIR_DE = 1.6;

export interface QuienAndaProps {
  readonly traer: Traer;
  /** El asiento de quien pasea: de él sale la figura cuando no eligió ninguna. */
  readonly asiento: string;
  /** La figura que eligió, si eligió. Puede venir una que este binario no conozca. */
  readonly figura?: string;
  /** Dónde está y hacia dónde mira. Es la misma referencia que mueve la cámara. */
  readonly paseante: MutableRefObject<Paseante>;
  /** En primera persona no se pinta: la cámara está dentro de su cabeza. */
  readonly enPrimeraPersona: boolean;
  readonly alFallar?: (motivo: string) => void;
}

export function QuienAnda({
  traer,
  asiento,
  figura,
  paseante,
  enPrimeraPersona,
  alFallar,
}: QuienAndaProps): JSX.Element | null {
  const [cargada, setCargada] = useState<AventureroCargado | null>(null);
  const [biblioteca, setBiblioteca] = useState<readonly THREE.AnimationClip[]>([]);
  const [montada, setMontada] = useState<THREE.Object3D | null>(null);
  const marioneta = useRef<Marioneta | null>(null);
  const grupo = useRef<THREE.Group>(null);
  const rumboAhora = useRef<number | null>(null);
  const andabaAntes = useRef(0);

  /*
   * LA FIGURA Y LOS CLIPS, con su propia red y sin tumbar nada si no llegan. Un tablero
   * sin aventurero se sigue jugando; lo que no puede es dejar la escena a medias. Es el
   * mismo trato que tienen los dados, el reloj y el pack.
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
       * Sin `reposo-a` no hay marioneta: la figura llegaría en T. Se dice, porque un
       * respaldo mudo es un fallo que nadie ve — la misma regla que en La Linde Alta.
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
    const quien = paseante.current;

    g.position.set(quien.x, 0, quien.z);

    /*
     * ═══ EL RUMBO SE ALCANZA, NO SE COPIA ═══
     *
     * El rumbo del paseante cambia de golpe al pulsar una tecla, y una figura que girase
     * de golpe se leería como un muñeco que salta. Se gira hacia él por el camino CORTO
     * —`giroCorto`, el mismo del Muelle—, que es lo que evita la vuelta larga al cruzar
     * el norte.
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
     * Aquí ponía `+ Math.PI`, y funciona mirando al norte y al sur. Al este y al oeste hace
     * lo contrario de lo que debe, y el aventurero anda de espaldas sin que falle nada. La
     * cuenta buena —y el porqué— están en `giroDeLaMarioneta`.
     */
    g.rotation.y = giroDeLaMarioneta(rumboAhora.current ?? quien.rumbo);

    /*
     * ═══ QUÉ CLIP TOCA, SACADO DE LO QUE SE HA MOVIDO ═══
     *
     * `andando` cuenta cuánto lleva andando seguido, así que su DERIVADA dice si se mueve
     * y a qué ritmo. Preguntarle a los mandos sería preguntar por lo que se pulsa y no por
     * lo que pasa: contra una pared se pulsa adelante y no se anda, y la figura correría
     * en el sitio.
     */
    const cuanto = (quien.andando - andabaAntes.current) / Math.max(1e-6, dt);
    andabaAntes.current = quien.andando;
    const clip = cuanto <= 0.01 ? CLIP.reposoA : cuanto > CORRE_A_PARTIR_DE ? CLIP.correr : CLIP.andar;
    reproduce(m, clip, true, 0, 0);
    m.mezclador.update(dt);
  });

  if (montada === null || enPrimeraPersona) return null;
  return (
    <group ref={grupo}>
      <primitive object={montada} />
    </group>
  );
}
