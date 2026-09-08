/**
 * EL RELOJ DE ARENA DE LA MESA: cuánto queda de tu turno, y el botón de pasarlo.
 *
 * ═══ QUÉ PROBLEMA RESUELVE, QUE NO ES DECORATIVO ═══
 *
 * Dos, y los dos salieron jugando. El primero: para pasar el turno hay que abrir el cajón de
 * arriba, que es un clic y una lectura para la jugada más corriente de la partida. El segundo es
 * peor y es mudo: **nada avisa de que el plazo se acaba**. El que trae el servidor de serie son
 * dos minutos, y en una partida de prueba se acabó mientras se miraba el tablero y el servidor
 * colocó una choza por su dueño sin decir una palabra. Un reloj que empieza a caer al empezar la
 * ronda enseña eso sin números y sin leer nada.
 *
 * Va al canto DERECHO del estante, simétrico de los dados, que están al izquierdo. Su sitio lo
 * reparte `sitioDelReloj` en `barra.ts`, con el mismo aire y el mismo alto que el asa de aquéllos.
 *
 * ═══ SIN GANCHOS, COMO EL ZÓCALO Y POR LO MISMO ═══
 *
 * Este componente no usa ningún gancho: se puede LLAMAR desde Node y recorrer el árbol que
 * devuelve, que es lo único que permite comprobar desde una batería que el reloj está, que su
 * arena es arena y que su asa se pulsa. Lo que se mueve —la caída, el giro y el vaciado de
 * golpe— lo lleva quien lo monta, con referencias y un `useFrame`, igual que los dados.
 *
 * ═══ Y LA ARENA NO ES UNA TEXTURA ═══
 *
 * Son dos conos y un hilo. El de arriba encoge por su base y el de abajo crece por la suya, que
 * es lo que hace un reloj de verdad: el montón de arriba se hunde por el centro y el de abajo
 * sube en punta. Con una textura habría que pintarla, y sobre todo no se podría medir desde Node
 * qué parte de la arena queda — que es justo lo que un comprobador tiene que poder preguntar.
 */

import type { Ref } from 'react';
import * as THREE from 'three';

/** El vidrio de los dos bulbos. Casi transparente, sin luz propia. */
export const COLOR_DEL_VIDRIO = '#cfe4ef';
/** La arena. El mismo tono de la duna del delta, que es de donde vendría. */
export const COLOR_DE_LA_ARENA = '#e8c37a';
/** La madera del marco: la misma que la tapa de la mesa. */
export const COLOR_DEL_MARCO = '#6b4a2f';

/**
 * ═══ LAS PROPORCIONES, EN FRACCIONES DEL LADO DE SU HUECO ═══
 *
 * Todo se mide contra el ALTO del hueco, no contra su ancho, porque un reloj de arena es alto y
 * estrecho y lo que lo hace reconocible es la silueta: dos triángulos por la punta. Con la
 * cintura en el medio y los bulbos ocupando cada uno el 38 % del alto, la silueta se lee a la
 * talla de la barra —44 puntos de suelo de toque— sin más detalle que eso.
 */
export const ALTO_DEL_BULBO = 0.38;
/** El radio del bulbo por su base, o sea lo más ancho del cristal. */
export const RADIO_DEL_BULBO = 0.26;
/** El grueso de las dos tapas de madera. */
export const GRUESO_DEL_MARCO = 0.06;
/** El radio del hilo de arena que cae por la cintura. */
export const RADIO_DEL_HILO = 0.022;
/** Cuántos lados tienen los conos. Ocho basta a esta talla y son la cuarta parte de triángulos. */
export const LADOS_DEL_CONO = 12;

/**
 * CUÁNTO DURA EL GIRO DE LA VUELTA, en segundos.
 *
 * Medio segundo: lo justo para que el ojo lo cace como «ha empezado algo» y no tanto como para
 * que haya que esperar a que acabe antes de poder pulsarlo. El asa NO se apaga mientras gira —el
 * botón es el rectángulo y no el cristal—, así que quien quiera pasar el turno en el primer
 * instante puede.
 */
export const GIRO_DEL_RELOJ = 0.5;
/**
 * CUÁNTO TARDA EN VACIARSE DE GOLPE cuando se pulsa, en segundos.
 *
 * «Casi de inmediato», que es como lo pidió Miguel, pero no cero: la arena tiene que VERSE caer o
 * el reloj daría un salto y no se leería como una consecuencia de haber pulsado. Un tercio de
 * segundo es la misma escala que el rebote de una pieza al construirse.
 */
export const VACIADO_DEL_RELOJ = 0.34;

/**
 * LO QUE LA MESA LE DICE AL RELOJ.
 *
 * No lleva «cuánto queda» ya calculado, y eso es a propósito: si viniera la fracción como prop,
 * cambiaría sesenta veces por segundo y React repintaría el delta entero con ella. Vienen los DOS
 * INSTANTES y el reloj saca la fracción en su `useFrame`, que es donde ya se está mirando el
 * tiempo de todas formas.
 */
/** El `.glb` del reloj tal como llega: su escena y los clips que trae dentro. */
export interface RelojCargado {
  readonly escena: THREE.Object3D;
  readonly clips: readonly THREE.AnimationClip[];
}

export interface RelojDeLaMesa {
  /** Cuándo empezó el turno, en milisegundos de reloj de pared. */
  readonly desde: number;
  /**
   * Cuándo vence, o `null` si la mesa se abrió SIN PLAZO.
   *
   * Sin plazo el reloj se pinta lleno y quieto: no hay nada que contar, pero sigue siendo el
   * botón de pasar el turno, que es la otra mitad de para qué está. Poner una arena que no cae
   * es más honrado que esconder el reloj, porque el sitio en la barra no baila según cómo se
   * abrió la mesa.
   */
  readonly venceEn: number | null;
  /** Si se puede pulsar: sólo cuando el juego ofrece pasar el turno. */
  readonly disponible: boolean;
  /**
   * SUBE AL CAMBIAR DE TURNO, y es lo que dispara el giro. Vale `turnosAbiertos` de la vista:
   * un número que sólo crece y que es el mismo en todos los aparatos, así que el reloj gira a la
   * vez en las dos pantallas sin mandar nada por el cable.
   */
  readonly vuelta: number;
}

export function RelojDeArena({
  cuerpo,
  arenaArriba,
  arenaAbajo,
  hilo,
  asa,
  lado,
  ancho,
  encendido,
  modelo = null,
  onPulsar,
}: {
  /** El grupo que GIRA al empezar la ronda. Lo mueve quien monta. */
  cuerpo: Ref<THREE.Group>;
  /**
   * EL MONTÓN DE ARRIBA. Es un GRUPO y no una malla, y eso decide desde dónde se encoge: el
   * grupo está en la CINTURA y el cono cuelga de él con su vértice ahí, así que escalar el
   * grupo en `y` hunde el montón hacia el agujero — que es lo que hace la arena de verdad.
   * Escalando la malla se encogería por su centro y la arena se separaría del cristal.
   */
  arenaArriba: Ref<THREE.Group>;
  /**
   * EL DE ABAJO, y su grupo está en el SUELO del bulbo por lo mismo al revés: el montón crece
   * en punta desde donde cae, no desde la cintura.
   */
  arenaAbajo: Ref<THREE.Group>;
  /** El hilo que cae por la cintura. Se apaga cuando no queda arena arriba. */
  hilo: Ref<THREE.Mesh>;
  /** El rectángulo que se pulsa. Invisible pero presente, como el asa de los dados. */
  asa: Ref<THREE.Mesh>;
  lado: number;
  ancho: number;
  /** Apagado cuando no se puede pasar el turno: se pinta más flojo y no coge el toque. */
  encendido: boolean;
  /**
   * EL MODELO DE VERDAD, ya clonado y con su mezclador puesto por quien monta, o `null`.
   *
   * `null` es el caso normal mientras `reloj.glb` viaja, y el caso PERMANENTE si no llega —un
   * despliegue sin el fichero, un 404, un binario roto—. Entonces se pintan los conos de aquí
   * abajo, que hacen exactamente lo mismo con veinte triángulos. Es el mismo trato que tienen los
   * dados con su respaldo procedimental, y por la misma razón: un fichero de arte que no llega no
   * puede dejar la mesa sin el botón de pasar el turno.
   */
  modelo?: THREE.Object3D | null;
  onPulsar: () => void;
}): JSX.Element {
  const cintura = 0;
  const arriba = cintura + (ALTO_DEL_BULBO * lado) / 2;
  const abajo = cintura - (ALTO_DEL_BULBO * lado) / 2;
  const altoDelBulbo = ALTO_DEL_BULBO * lado;
  const radio = RADIO_DEL_BULBO * lado;
  const tapa = (ALTO_DEL_BULBO + GRUESO_DEL_MARCO / 2) * lado;

  return (
    <group>
      {/*
        EL ASA: la casilla entera, invisible por `colorWrite` y no por `visible`.

        Es la misma decisión que el asa de los dados y del mazo, y por el mismo motivo medido:
        `visible={false}` NO saca un objeto de la lista de sucesos de r3f —ni el `Raycaster` ni
        el `intersect` de fiber miran `visible`— así que un asa apagada seguiría cogiendo el
        toque. Con `colorWrite` la malla no escribe un píxel y sigue estando donde se pulsa.
      */}
      <mesh
        ref={asa}
        position={[0, 0, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (encendido) onPulsar();
        }}
      >
        <planeGeometry args={[ancho, lado]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>

      <group ref={cuerpo}>
        {/* Llega normalizado a una unidad de alto y centrado: sólo hay que darle su lado. */}
        {modelo !== null && <primitive object={modelo} scale={lado} />}
        {modelo !== null ? null : (
        <>
        {/* Las dos tapas de madera y los tres postes que las unen. */}
        {[tapa, -tapa].map((y) => (
          <mesh key={`tapa:${String(y)}`} position={[0, y, 0]} raycast={() => null}>
            <cylinderGeometry
              args={[radio * 1.15, radio * 1.15, GRUESO_DEL_MARCO * lado, LADOS_DEL_CONO]}
            />
            <meshStandardMaterial color={COLOR_DEL_MARCO} roughness={0.9} />
          </mesh>
        ))}
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh
              key={`poste:${String(i)}`}
              position={[Math.cos(a) * radio * 1.05, 0, Math.sin(a) * radio * 1.05]}
              raycast={() => null}
            >
              <cylinderGeometry
                args={[0.018 * lado, 0.018 * lado, tapa * 2, 6]}
              />
              <meshStandardMaterial color={COLOR_DEL_MARCO} roughness={0.9} />
            </mesh>
          );
        })}

        {/*
          EL VIDRIO. Dos conos por su vértice, en la cintura. Van con `depthWrite` apagado para
          que la arena de dentro se vea a través y no se pelee con ellos por el z-buffer.
        */}
        <mesh position={[0, arriba, 0]} raycast={() => null}>
          <coneGeometry args={[radio, altoDelBulbo, LADOS_DEL_CONO, 1, true]} />
          <meshBasicMaterial
            color={COLOR_DEL_VIDRIO}
            transparent
            opacity={0.28}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, abajo, 0]} rotation={[Math.PI, 0, 0]} raycast={() => null}>
          <coneGeometry args={[radio, altoDelBulbo, LADOS_DEL_CONO, 1, true]} />
          <meshBasicMaterial
            color={COLOR_DEL_VIDRIO}
            transparent
            opacity={0.28}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/*
          LA ARENA. Los dos conos van con su vértice en la cintura y se escalan desde ahí, así
          que el `position` es el de la punta y no el del centro: el de arriba encoge hacia la
          cintura y el de abajo crece desde ella, que es lo que se ve en un reloj de verdad.
        */}
        <group ref={arenaArriba} position={[0, cintura, 0]}>
          <mesh position={[0, altoDelBulbo / 2, 0]} rotation={[Math.PI, 0, 0]} raycast={() => null}>
            <coneGeometry args={[radio * 0.92, altoDelBulbo, LADOS_DEL_CONO]} />
            <meshStandardMaterial color={COLOR_DE_LA_ARENA} roughness={1} />
          </mesh>
        </group>
        <group ref={arenaAbajo} position={[0, abajo - altoDelBulbo / 2, 0]}>
          <mesh position={[0, altoDelBulbo / 2, 0]} raycast={() => null}>
            <coneGeometry args={[radio * 0.92, altoDelBulbo, LADOS_DEL_CONO]} />
            <meshStandardMaterial color={COLOR_DE_LA_ARENA} roughness={1} />
          </mesh>
        </group>

        {/* EL HILO que cae por la cintura mientras queda arena arriba. */}
        <mesh ref={hilo} position={[0, abajo / 2, 0]} raycast={() => null}>
          <cylinderGeometry args={[RADIO_DEL_HILO * lado, RADIO_DEL_HILO * lado, altoDelBulbo, 5]} />
          <meshStandardMaterial color={COLOR_DE_LA_ARENA} roughness={1} />
        </mesh>
        </>
        )}
      </group>
    </group>
  );
}
