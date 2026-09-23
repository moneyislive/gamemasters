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
 * contra una pared se queda quieto aunque esté pulsando, también visto desde fuera. Y no es una
 * copia: el fotograma de la figura es `mueveAQuienAnda`, el de quien pasea, y la figura se trae, se
 * monta y se pinta con lo común (`comun/marioneta.tsx`).
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
 *
 * ═══ Y LA REFRIEGA, POR EL MISMO CLIENTE ═══
 *
 * Cómo va cada uno en la refriega se le pregunta al canal en el fotograma, igual que su sitio
 * (`refriegaDe`, y ya a su hora: la de su pose). Lo que contesta manda sobre el paso: el clip de un
 * gesto —lanzar, recibir, caer y quedarse en el suelo, aparecer— pisa al de andar mientras dura,
 * mientras es intocable la figura parpadea, y sus corazones van en su rótulo, encima del nombre.
 * Los corazones se repintan sólo el fotograma en que cambian; el resto, se leen números.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { figuraQueSePinta } from '../embarcadero/figuras';
import type { Traer } from '../embarcadero/tipos';
import { Marioneta, usarLaFigura, usarMarioneta } from '../comun/marioneta';
import type { ClienteDelCanal } from './canal-de-botas';
import type { AsientoQueAnda } from './mesa-de-botas';
import { mueveAQuienAnda } from './quien-anda';
import type { RumboPintado } from './quien-anda';
import { ALTURA_DEL_ROTULO, altoDelRotulo, geometriaDelRotulo, ponerLosCorazones } from './rotulo';

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
  const cuerpo = useRef<THREE.Group>(null);
  const placa = useRef<THREE.Group>(null);
  const rumbo = useRef<RumboPintado>({ de: null, ahora: null });
  const alturaAhora = useRef<number | null>(null);
  /* Cómo están pintados sus corazones: sólo se repintan cuando esto cambia. */
  const corazonesPintados = useRef<string | null>(null);
  const camera = useThree((s) => s.camera);

  /*
   * LA FIGURA Y LOS CLIPS, sin tumbar la escena si no llegan. A quien pasea, si su figura no llega,
   * se le cae el valle entero al retablo (`alFallar` de la escena); por la figura de OTRO no: se
   * dice en la consola y se le sigue viendo el rótulo.
   */
  const laFigura = figuraQueSePinta(asiento, figura);
  const { cargado, biblioteca } = usarLaFigura(traer, laFigura, (que, motivo) => {
    console.warn(que === 'figura' ? `No ha llegado la figura de ${nombre} (${laFigura}): ${motivo}` : `No han llegado los gestos de las figuras: ${motivo}`);
  });
  const marioneta = usarMarioneta(cargado, biblioteca, `a ${nombre} sólo se le ve el rótulo`);

  /*
   * La placa se compone una vez por nombre y color —con sus corazones, escondidos hasta que el canal
   * sepa cómo va la refriega—, y se suelta al cambiar o al irse.
   */
  const geometria = useMemo(() => geometriaDelRotulo(nombre, color, true), [nombre, color]);
  useEffect(() => {
    corazonesPintados.current = null;
    return () => geometria?.dispose();
  }, [geometria]);
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
    const canal = cliente.current;
    const pose = canal?.poseDe(asiento) ?? null;
    if (pose === null) {
      if (g !== null) g.visible = false;
      if (r !== null) r.visible = false;
      return;
    }
    /* La refriega, a la misma hora que su pose. `null` sin `vidas`: entonces sólo anda. */
    const como = canal?.refriegaDe(asiento) ?? null;

    const suelo = alturaEn(pose.x, pose.z);
    const antes = alturaAhora.current;
    const cuanto = Number.isFinite(dt) && dt > 0 ? Math.min(1, dt * LO_QUE_SE_ASIENTA) : 0;
    const y = antes === null ? suelo : antes + (suelo - antes) * cuanto;
    alturaAhora.current = y;

    /*
     * La figura, como la de quien pasea (`mueveAQuienAnda`): parpadea si es intocable, se vuelve por
     * el camino corto, y el gesto de la refriega manda sobre el paso, que va a la velocidad MEDIDA
     * entre dos fotos. Aquí sólo cambia de dónde sale la pose —la foto— y la altura, que es la suya.
     */
    if (g !== null && marioneta !== null) mueveAQuienAnda(marioneta, g, pose, y, como, rumbo.current, dt);

    /* Sus corazones: se repintan sólo si han cambiado. */
    const pintar = como === null ? 'sin' : `${String(como.corazones.llenos)}:${String(como.corazones.apagados)}`;
    if (geometria !== null && pintar !== corazonesPintados.current) {
      ponerLosCorazones(geometria, como === null ? null : como.corazones);
      corazonesPintados.current = pintar;
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
      <Marioneta de={marioneta} grupo={cuerpo} visible={false} />
      {geometria === null ? null : (
        <group ref={placa} visible={false}>
          <mesh geometry={geometria} material={material} />
        </group>
      )}
    </>
  );
}
