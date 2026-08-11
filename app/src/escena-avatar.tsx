/**
 * La escena del avatar: TU modelo 3D, compuesto sobre el fondo generado.
 *
 * LA COMPOSICIÓN, que es la del cartel de un juego: detrás, una ilustración de
 * la sala generada en alta resolución (ver `fondos-sala.tsx`); delante, el
 * personaje 3D REAL —el GLB esculpido desde tu foto— sobre un lienzo
 * transparente, con su propia luz de retrato. El fondo pone la atmósfera; el
 * 3D pone la presencia. Es el montaje que usan los lobbies de los juegos
 * móviles grandes, y la razón es de peso: cada capa puede ser espectacular sin
 * pagar el coste de la otra.
 *
 * EL PERSONAJE VIVE: gira despacio sobre sí para enseñarse, respira, y cuando
 * arrastras el carrusel da un giro más vivo, como volviéndose hacia la sala
 * nueva. Todo dentro del bucle de dibujo, sin tocar React.
 *
 * NOTA NATIVA. La carga del GLB va por fetch + parse, que funciona igual en
 * web y en nativo; las TEXTURAS empotradas, en cambio, dependen de la
 * decodificación de imágenes del motor y en un dispositivo puede hacer falta
 * el puente de expo-three. Es el punto a vigilar en la primera prueba real en
 * un móvil, y está aislado aquí.
 */
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Canvas } from './tres/Lienzo';
import * as api from './api';

/** El puente con el carrusel: objeto mutable, sin re-render por fotograma. */
export interface ProgresoCompartido {
  valor: number;
}

/** Altura a la que se normaliza cualquier modelo: 1,7 unidades, pies en 0. */
const ALTURA_PERSONAJE = 1.7;

function Personaje({
  objeto,
  progreso,
}: {
  objeto: THREE.Group;
  progreso: ProgresoCompartido;
}): JSX.Element {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    // La fracción del arrastre: 0 quieto en una sala, 0,5 en pleno tránsito.
    const fraccion = Math.abs(progreso.valor - Math.round(progreso.valor));
    const transito = Math.min(fraccion * 2, 1);
    // De guardia gira despacio, enseñándose; en tránsito se revuelve más vivo.
    g.rotation.y = 0.35 * Math.sin(t * 0.35) + transito * 1.4 * Math.sin(t * 3);
    g.position.y = 0.015 * Math.sin(t * 1.8) + transito * 0.05 * Math.abs(Math.sin(t * 8));
  });

  return (
    <group ref={ref}>
      <primitive object={objeto} />
      {/* La sombra de contacto: barata, y lo que lo «posa» sobre el fondo. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

function Luces(): JSX.Element {
  return (
    <>
      {/* La luz de retrato: cálida y alta, como la lámpara de la sala. */}
      <ambientLight intensity={0.55} color="#4a3a40" />
      <pointLight position={[1.2, 2.4, 1.8]} intensity={14} color="#ffd9a0" distance={7} decay={1.7} />
      {/* Relleno frío desde el otro lado: sin él, media cara desaparece. */}
      <pointLight position={[-1.6, 1.4, 1.2]} intensity={5} color="#9bb8d4" distance={6} decay={1.8} />
      {/* El recorte trasero que lo separa del fondo. */}
      <directionalLight position={[-1.5, 2.5, -2.5]} intensity={2.2} color="#d4636f" />
    </>
  );
}

function Camara(): JSX.Element {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    // Un vaivén de cámara casi imperceptible: es lo que quita el olor a foto.
    camera.position.x = 0.05 * Math.sin(t * 0.4);
    camera.position.y = 1.12 + 0.02 * Math.sin(t * 0.7);
    camera.lookAt(0, ALTURA_PERSONAJE * 0.52, 0);
  });
  return <></>;
}

export function EscenaAvatar({
  ancho,
  alto,
  modeloUrl,
  progreso,
}: {
  ancho: number;
  alto: number;
  modeloUrl: string;
  progreso: ProgresoCompartido;
}): JSX.Element {
  const [objeto, setObjeto] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let vivo = true;
    setObjeto(null);
    void (async () => {
      try {
        const r = await fetch(api.urlAbsoluta(modeloUrl));
        if (!r.ok) return;
        const bytes = await r.arrayBuffer();
        new GLTFLoader().parse(
          bytes,
          '',
          (gltf) => {
            if (!vivo) return;
            const escena = gltf.scene;
            /*
             * Normalizar SIEMPRE: cada generación llega con su propia escala y
             * su propio origen. Se mide la caja, se escala a la altura de la
             * casa y se posan los pies en el suelo. Sin esto, un modelo llega
             * gigante y el siguiente enano, y parece un fallo del render.
             */
            const caja = new THREE.Box3().setFromObject(escena);
            const alturaBruta = caja.max.y - caja.min.y;
            if (alturaBruta > 0) escena.scale.setScalar(ALTURA_PERSONAJE / alturaBruta);
            caja.setFromObject(escena);
            const centro = caja.getCenter(new THREE.Vector3());
            escena.position.x -= centro.x;
            escena.position.z -= centro.z;
            escena.position.y -= caja.min.y;
            setObjeto(escena);
          },
          () => {
            /* Un GLB que no carga deja el hueco vacío; la portada ya tiene CTA. */
          },
        );
      } catch {
        /* Sin red no hay modelo: el fondo aguanta la escena solo. */
      }
    })();
    return () => {
      vivo = false;
    };
  }, [modeloUrl]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: ancho, height: alto }}>
      <Canvas
        // Transparente: el fondo lo pone la ilustración de la sala, no el GL.
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 34, position: [0, 1.12, 3.6] }}
        dpr={[1, 2]}
        style={{ width: ancho, height: alto, backgroundColor: 'transparent' }}
      >
        <Luces />
        <Camara />
        {objeto && <Personaje objeto={objeto} progreso={progreso} />}
      </Canvas>
    </View>
  );
}
