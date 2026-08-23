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
import { MeshoptDecoder } from 'meshoptimizer';
import { Canvas } from './tres/Lienzo';
import { decodificaImagenes, texturasLisas } from './tres/texturas-nativas';
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
  alFallar,
}: {
  ancho: number;
  alto: number;
  modeloUrl: string;
  progreso: ProgresoCompartido;
  /**
   * Se llama cuando el modelo no se puede enseñar, para que quien manda decida
   * qué poner en su lugar. `definitivo` distingue «ese fichero ya no existe»
   * —hay que olvidarlo— de «ahora mismo no se ha podido traer», que puede ser
   * la cobertura del salón y no debe borrarle a nadie su avatar.
   */
  alFallar?: (definitivo: boolean) => void;
}): JSX.Element {
  const [objeto, setObjeto] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let vivo = true;
    setObjeto(null);
    void (async () => {
      try {
        const r = await fetch(api.urlAbsoluta(modeloUrl));
        if (!r.ok) {
          /*
           * ESTE `return` ERA MUDO, y es la razón de que un avatar generado se
           * evaporara sin dejar rastro: el fichero desaparecía del servidor
           * —los modelos viven en el disco de las subidas, que en un plan sin
           * disco persistente se borra en cada despliegue— la app pedía un 404,
           * salía por aquí en silencio, y la escena se quedaba sin personaje.
           * Ni un aviso en la consola. «No se ve nada» y a adivinar.
           */
          console.warn(`[avatar] el modelo respondió ${r.status}: ${modeloUrl}`);
          // 404 y 410 son definitivos: ese fichero no va a volver.
          if (vivo) alFallar?.(r.status === 404 || r.status === 410);
          return;
        }
        const bytes = await r.arrayBuffer();
        /*
         * EL DESCODIFICADOR DE GEOMETRÍA COMPRIMIDA, y ojo con cuál.
         *
         * El servidor pide los modelos comprimidos —el primero sin comprimir
         * pesaba 12,3 MB y el mismo comprimido pesa 0,47— y sin descodificador
         * el GLB llega entero pero no se abre: la escena sale vacía y sin una
         * palabra de por qué. Fue la primera versión de este fichero.
         *
         * Y la trampa: Tripo comprime con MESHOPT, no con Draco. Poner el
         * descodificador equivocado falla exactamente igual que no poner
         * ninguno. El propio three lo dice —«setMeshoptDecoder must be called
         * before loading compressed files»— pero solo si alguien escucha el
         * error, que es la razón de que el manejador de abajo registre en vez
         * de callar.
         *
         * Va empaquetado con la app (no de un CDN): funciona igual en el móvil
         * y en una casa sin buena conexión, que es donde se juega.
         */
        const cargador = new GLTFLoader();
        /*
         * SIN NAVEGADOR, LAS TEXTURAS EMPOTRADAS NO SE PUEDEN DECODIFICAR, y lo
         * grave es que su fallo se lleva por delante la carga ENTERA: no se ve
         * ni la geometria, que si se abriria. Ver `tres/texturas-nativas.ts`
         * para el mecanismo exacto.
         *
         * El complemento solo se registra donde hace falta: en un navegador las
         * texturas de verdad si cargan, y ponerlo alli las sustituiria por nada.
         */
        if (!decodificaImagenes()) cargador.register(texturasLisas);
        /*
         * EL DESCODIFICADOR SE INTENTA, PERO NO SE ESPERA QUE FUNCIONE AQUÍ.
         *
         * `meshoptimizer` está compilado a WebAssembly, y Hermes —el motor de
         * JavaScript de React Native— no lo ejecuta. Así que en el teléfono
         * esto no puede descomprimir nada, por bien escrito que esté.
         *
         * Por eso el servidor ya NO pide la geometría comprimida (ver
         * `ia/tripo.ts`): los modelos nuevos llegan sin comprimir y se abren
         * sin descodificador. Esto se queda por los modelos VIEJOS, que sí
         * están comprimidos: en un navegador —donde WebAssembly existe— aún se
         * abren, y en el móvil fallan con un mensaje que lo dice.
         *
         * Y va envuelto: si preparar el descodificador revienta, no puede
         * llevarse por delante la carga de un modelo que no lo necesita.
         */
        try {
          await MeshoptDecoder.ready;
          cargador.setMeshoptDecoder(MeshoptDecoder);
        } catch (fallo) {
          console.warn(
            '[avatar] no hay descodificador de geometría comprimida en este ' +
              'aparato (Hermes no ejecuta WebAssembly). Los modelos SIN comprimir ' +
              'se abrirán igual; los comprimidos, no. Motivo:',
            fallo,
          );
        }
        cargador.parse(
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
          (error) => {
            /*
             * Se REGISTRA, no se traga. Un modelo que no carga deja la escena
             * sin personaje, y sin este aviso el síntoma es «no se ve nada» sin
             * una sola pista de por qué. Costó una tarde averiguar que era el
             * descodificador de geometría comprimida.
             */
            console.warn('[avatar] el modelo no se pudo abrir:', error);
            /*
             * NO ES DEFINITIVO, aunque lo parezca. El fichero LLEGÓ: lo que
             * falla es abrirlo, y eso apunta al descodificador de geometría
             * comprimida o a una descarga a medias — cosas que se arreglan y
             * que pueden funcionar en el siguiente intento o en otro teléfono.
             *
             * Marcarlo como definitivo —que es lo que hacía— apagaba la
             * selección de la persona: volvía a la figura dibujada, y al entrar
             * al estudio su avatar esculpido ya no salía elegido. Tenía que
             * volver a marcarlo cada vez, y la causa real no aparecía por
             * ninguna parte. Se pierde la sesión, no la elección.
             */
            if (vivo) alFallar?.(false);
          },
        );
      } catch (error) {
        console.warn('[avatar] no se pudo traer el modelo:', error);
        // Sin respuesta: puede ser la cobertura. No se borra nada.
        if (vivo) alFallar?.(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [modeloUrl, alFallar]);

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
