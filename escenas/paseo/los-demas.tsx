/**
 * LOS DEMÁS: los otros asientos de la mesa, andando por el mismo tablero.
 *
 * ═══ ES LA MISMA MARIONETA, CON OTRA POSE ═══
 *
 * `quien-anda.tsx` ya lo decía: la marioneta no sabe quién la mueve, sólo lee una pose —dónde, a
 * qué altura, hacia dónde mira, a qué velocidad—, y «la de otro jugador, el día que se vean unos a
 * otros, la escribirá la red con lo que llegue». Es este día. Cada asiento que sale en las fotos del
 * canal (`canal-de-botas.ts`) lleva la figura que eligió —la de serie del asiento si no eligió,
 * `figuraQueSePinta`, igual que en el Muelle—, en el sitio interpolado entre dos fotos, girada a
 * su rumbo por el camino corto y con el clip que da su velocidad (`zancada.ts`): quien se para
 * contra una pared se queda quieto aunque esté pulsando, también visto desde fuera.
 *
 * ═══ NADA SE CARGA POR FOTOGRAMA ═══
 *
 * La figura y los clips se piden al cargador de la escena (`cargadorPara`), que guarda uno por
 * ruta: seis asientos con el mismo caballero son un fichero, y el tuyo ya lo había pedido quien
 * pasea. Cada uno se monta UNA vez, al aparecer en las fotos, y se desmonta al dejar de salir. En el
 * fotograma sólo se leen números.
 *
 * ═══ EL RÓTULO VA APARTE DE LA FIGURA ═══
 *
 * La placa con el nombre (`rotulo.ts`) mira siempre a la cámara y no gira con quien la lleva, así
 * que no cuelga del grupo de la figura: va en el suyo, encima de la cabeza, orientado con la cámara
 * y escalado con la distancia para leerse igual de cerca que de lejos. Y se pinta aunque la figura
 * no haya llegado —o no llegue—: saber que hay alguien es más importante que verle las botas.
 *
 * ═══ A LA ALTURA DEL SUELO QUE DA LA ESCENA ═══
 *
 * Con la misma `alturaEn` que quien pasea, y alcanzándola en un par de fotogramas en vez de
 * copiarla (`LO_QUE_SE_ASIENTA`, el mismo número que el paseo): bajar de la senda al prado son 1,2
 * unidades, y los demás tampoco tienen que dar respingos.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { cargadorPara } from '../embarcadero/cargar';
import type { AventureroCargado } from '../embarcadero/cargar';
import { figuraQueSePinta } from '../embarcadero/figuras';
import type { Traer } from '../embarcadero/tipos';
import { desmontaMarioneta, giroCorto, montaMarioneta, reproduce } from '../aventureros/marioneta';
import type { Marioneta } from '../aventureros/marioneta';
import { giroDeLaMarioneta } from './camaras';
import type { ClienteDelCanal } from './canal-de-botas';
import type { AsientoQueAnda } from './mesa-de-botas';
import { ALTURA_DEL_ROTULO, altoDelRotulo, geometriaDelRotulo } from './rotulo';
import { clipDelPaso, ritmoDelClip } from './zancada';

/** Lo deprisa que se vuelve una figura hacia su rumbo, por segundo: el mismo de `quien-anda.tsx`. */
const LO_QUE_SE_VUELVE = 9;

/** Lo deprisa que la altura pintada alcanza la del suelo, por segundo: el mismo del paseo. */
const LO_QUE_SE_ASIENTA = 14;

export interface LosDemasProps {
  readonly traer: Traer;
  /** El canal abierto: de él sale, en cada fotograma, dónde está cada uno. */
  readonly cliente: { readonly current: ClienteDelCanal | null };
  /** Quién sale en las fotos. Montar y desmontar figuras cuelga de esto, no de cada foto. */
  readonly presentes: readonly string[];
  /** Los asientos de la mesa, con su nombre, su figura y su color. */
  readonly asientos: readonly AsientoQueAnda[];
  /** Mi asiento, que nunca se pinta aquí: a quien pasea lo pinta `QuienAnda`. */
  readonly yo: string;
  /** A qué altura está el suelo de la escena en un punto. Sólo para pintar. */
  readonly alturaEn: (x: number, z: number) => number;
}

export function LosDemas({ traer, cliente, presentes, asientos, yo, alturaEn }: LosDemasProps): JSX.Element {
  return (
    <group>
      {presentes
        .filter((asiento) => asiento !== yo)
        .map((asiento) => {
          const suyo = asientos.find((a) => a.id === asiento);
          return (
            <UnoDeLosDemas
              key={asiento}
              traer={traer}
              cliente={cliente}
              asiento={asiento}
              nombre={suyo?.nombre ?? '?'}
              figura={suyo?.figura}
              color={suyo?.color ?? '#9aa0a6'}
              alturaEn={alturaEn}
            />
          );
        })}
    </group>
  );
}

interface UnoDeLosDemasProps {
  readonly traer: Traer;
  readonly cliente: { readonly current: ClienteDelCanal | null };
  readonly asiento: string;
  readonly nombre: string;
  readonly figura: string | undefined;
  readonly color: string;
  readonly alturaEn: (x: number, z: number) => number;
}

function UnoDeLosDemas({ traer, cliente, asiento, nombre, figura, color, alturaEn }: UnoDeLosDemasProps): JSX.Element {
  const [cargada, setCargada] = useState<AventureroCargado | null>(null);
  const [biblioteca, setBiblioteca] = useState<readonly THREE.AnimationClip[]>([]);
  const [montada, setMontada] = useState<THREE.Object3D | null>(null);
  const marioneta = useRef<Marioneta | null>(null);
  const cuerpo = useRef<THREE.Group>(null);
  const placa = useRef<THREE.Group>(null);
  const rumboAhora = useRef<number | null>(null);
  const alturaAhora = useRef<number | null>(null);
  const camera = useThree((s) => s.camera);

  /*
   * LA FIGURA Y LOS CLIPS, sin tumbar la escena si no llegan. A quien pasea, si su figura no llega,
   * se le cae el valle entero al retablo (`alFallar` de la escena); por la figura de OTRO no: se
   * dice en la consola y se le sigue viendo el rótulo.
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
        console.warn(`No ha llegado la figura de ${nombre} (${laFigura}): ${e instanceof Error ? e.message : String(e)}`);
      });
    void cargador
      .animaciones()
      .then((clips) => {
        if (vivo) setBiblioteca(clips);
      })
      .catch((e: unknown) => {
        console.warn(`No han llegado los gestos de las figuras: ${e instanceof Error ? e.message : String(e)}`);
      });
    return () => {
      vivo = false;
    };
  }, [laFigura, nombre, traer]);

  useEffect(() => {
    if (cargada === null || biblioteca.length === 0) return;
    const m = montaMarioneta(cargada, biblioteca);
    if (m === null) {
      console.warn(`La figura ${laFigura} ha llegado sin el clip de reposo: a ${nombre} sólo se le ve el rótulo.`);
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
  }, [biblioteca, cargada, laFigura, nombre]);

  /* La placa se compone una vez por nombre y color, y se suelta al cambiar o al irse. */
  const geometria = useMemo(() => geometriaDelRotulo(nombre, color), [nombre, color]);
  useEffect(() => () => geometria?.dispose(), [geometria]);
  const material = useMemo(
    /*
     * Sin niebla —de lejos es cuando más falta encontrar a alguien— y sin el tono de la escena, que
     * en el escritorio lleva ACES y apagaría la tinta. Con prueba de profundidad: un muro tapa el
     * nombre de quien está detrás, como tapa a quien lo lleva.
     */
    () => new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, dt) => {
    const g = cuerpo.current;
    const r = placa.current;
    const pose = cliente.current?.poseDe(asiento) ?? null;
    if (pose === null) {
      if (g !== null) g.visible = false;
      if (r !== null) r.visible = false;
      return;
    }

    const suelo = alturaEn(pose.x, pose.z);
    const antes = alturaAhora.current;
    const cuanto = Number.isFinite(dt) && dt > 0 ? Math.min(1, dt * LO_QUE_SE_ASIENTA) : 0;
    const y = antes === null ? suelo : antes + (suelo - antes) * cuanto;
    alturaAhora.current = y;

    const m = marioneta.current;
    if (g !== null && m !== null) {
      g.visible = true;
      g.position.set(pose.x, y, pose.z);
      /* El rumbo se alcanza por el camino corto, como el de quien pasea. */
      const rumbo = rumboAhora.current;
      if (rumbo === null) {
        rumboAhora.current = pose.rumbo;
      } else {
        const falta = giroCorto(rumbo, pose.rumbo);
        rumboAhora.current = rumbo + Math.min(Math.abs(falta), LO_QUE_SE_VUELVE * dt) * Math.sign(falta);
      }
      g.rotation.y = giroDeLaMarioneta(rumboAhora.current ?? pose.rumbo);
      /* El clip y su ritmo, de la velocidad MEDIDA entre dos fotos: ver `zancada.ts`. */
      const clip = clipDelPaso(pose.velocidad);
      reproduce(m, clip, true, 0, 0);
      const accion = m.acciones.get(clip);
      if (accion !== undefined && accion === m.actual) accion.timeScale = ritmoDelClip(clip, pose.velocidad);
      m.mezclador.update(dt);
    }

    if (r !== null) {
      r.visible = true;
      r.position.set(pose.x, y + ALTURA_DEL_ROTULO, pose.z);
      r.quaternion.copy(camera.quaternion);
      const campo = (((camera as THREE.PerspectiveCamera).fov ?? 45) * Math.PI) / 180;
      r.scale.setScalar(altoDelRotulo(camera.position.distanceTo(r.position), campo));
    }
  });

  return (
    <>
      {montada === null ? null : (
        <group ref={cuerpo} visible={false}>
          <primitive object={montada} />
        </group>
      )}
      {geometria === null ? null : (
        <group ref={placa} visible={false}>
          <mesh geometry={geometria} material={material} />
        </group>
      )}
    </>
  );
}
