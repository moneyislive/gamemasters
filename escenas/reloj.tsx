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
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

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
/**
 * LO ALTO QUE ES UN RELOJ, EN LADOS DE SU HUECO — Y POR QUÉ ES UNO Y NO 0,82.
 *
 * Porque hay DOS relojes y no miden lo mismo. El de conos del respaldo llega hasta sus
 * tapas, o sea `(ALTO_DEL_BULBO + GRUESO_DEL_MARCO/2) · 2 = 0,82` lados. El del `.glb`
 * llega a UN lado exacto, porque `montarElReloj` lo normaliza a una unidad de alto y aquí
 * se pinta con `scale={lado}`.
 *
 * Quien lo coloque tiene que contar con el MÁS ALTO de los dos o se le sale por abajo el
 * día que el fichero llegue —que es justo el día en que se ve bonito—. Medido en Las
 * Lindes: colocado con 0,82, el pie del reloj se salía del lienzo un 4 % en cuanto entró
 * el modelo de verdad, y con los conos no se salía. Un fallo que sólo aparece cuando todo
 * va bien es de los peores que hay.
 */
export const ALTO_DEL_RELOJ_EN_LADOS = Math.max(1, (ALTO_DEL_BULBO + GRUESO_DEL_MARCO / 2) * 2);

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

/**
 * EL RELOJ YA MONTADO: lo que hay que tener a mano para pintarlo y para moverlo.
 *
 * `clon` es lo que se le pasa al componente como `modelo`; `mezclador` hay que
 * empujarlo cada fotograma para que caigan los granos; y `montones` son las dos
 * mallas con morfologia, cada una sabiendo si es la de arriba.
 */
export interface RelojMontado {
  readonly clon: THREE.Group;
  readonly mezclador: THREE.AnimationMixer;
  readonly montones: readonly { readonly malla: THREE.Mesh; readonly arriba: boolean }[];
}

/**
 * MONTA EL `.glb` DEL RELOJ: lo clona, lo normaliza, arranca sus clips y ordena sus montones.
 *
 * ═══ POR QUÉ ESTÁ AQUÍ Y NO EN LA ESCENA QUE LO PINTA ═══
 *
 * Porque vivía dentro de un `useMemo` de `delta.tsx`, o sea dentro de Riberas, y nada de lo
 * que hace es de Riberas: es del reloj. En cuanto una segunda escena quiso el mismo reloj
 * —Las Lindes, para enseñar cuánto queda de bolsa— la única salida era copiar cincuenta
 * renglones que hay que arreglar a la vez el día que alguien recompile el modelo. Aquí hay
 * uno solo, y lo mide `verify:escena` con un `.glb` fabricado a mano.
 *
 * No usa ningún gancho, como todo lo de este fichero y por lo mismo: se puede llamar desde
 * Node y preguntarle qué montó.
 *
 * ═══ SE MIDE LA CAJA, NO SE SUPONE ═══
 *
 * El `.glb` trae su propia escala en la raíz —los modelos de Sketchfab salen casi siempre con
 * una— y multiplicar la nuestra encima daba 0,0001 de escala de mundo: el reloj estaba en la
 * escena, con sus mallas y su clip corriendo, y medía tres milésimas de unidad. No se veía y
 * no fallaba nada, que es la peor forma de no estar.
 *
 * Así que se envuelve en un grupo que lo normaliza a UNA UNIDAD DE ALTO centrado en el
 * origen, con la caja medida sobre el clon ya montado. Quien lo pinta sólo tiene que
 * multiplicar por el lado de su hueco, y el día que alguien recompile el modelo con otra
 * escala esto sigue saliendo bien sin tocar una línea.
 *
 * ═══ LOS DOS MONTONES, Y CUÁL ES CUÁL ═══
 *
 * Son las dos mallas con morfología —el compilador las deja como «0» y «1»— y hay que saber
 * cuál va arriba, porque se mueven AL REVÉS la una de la otra. No se distinguen por el
 * nombre: «0» y «1» los pone el exportador y el día que alguien recompile pueden salir
 * cambiados, y el fallo sería un reloj que cuenta al revés sin que nada falle. Se distinguen
 * midiendo dónde está cada una: la de arriba tiene el centro de su caja más alto.
 */
export function montarElReloj(cargado: RelojCargado | null): RelojMontado | null {
  if (cargado === null) return null;
  const dentro = SkeletonUtils.clone(cargado.escena);

  const caja = new THREE.Box3().setFromObject(dentro);
  const alto = Math.max(1e-6, caja.max.y - caja.min.y);
  const centro = caja.getCenter(new THREE.Vector3());
  /*
   * ═══ LA POSICIÓN QUE EL MODELO YA TRAÍA CUENTA, Y SE LE ESTABA COMIENDO ═══
   *
   * Esto ponía `position = −centro/alto` a secas, y eso sólo sale bien si la raíz del
   * `.glb` venía en el origen — que es lo que pasa con `reloj.glb` y por lo que nunca se
   * notó. Un punto del modelo iba a `escala·p + posicion`, y lo que se quiere es
   * `(escala·p + posicion − centro)/alto`; despejando, la posición nueva es
   * `(posicion − centro)/alto` y NO `−centro/alto`. Con un modelo que traiga traslación
   * en la raíz —los de Sketchfab la traen tanto como la escala— el reloj se iba a
   * cincuenta unidades de donde tenía que estar.
   *
   * Lo cazó `verify:escena` con un `.glb` fabricado torcido a propósito, el mismo día que
   * esta función salió de dentro de Riberas. Es la razón de sacarla: ahí no la medía nadie.
   *
   * Y NO MUEVE EL RELOJ DE RIBERAS, comprobado y no supuesto: la raíz de `reloj.glb` es
   * `Sketchfab_Scene` con `position` exactamente en el origen, así que las dos cuentas dan
   * el mismo número hasta el último decimal. Esto arregla el modelo que venga, no el que hay.
   */
  dentro.position.set(
    (dentro.position.x - centro.x) / alto,
    (dentro.position.y - centro.y) / alto,
    (dentro.position.z - centro.z) / alto,
  );
  dentro.scale.multiplyScalar(1 / alto);
  const clon = new THREE.Group();
  clon.add(dentro);

  const mezclador = new THREE.AnimationMixer(dentro);
  for (const clip of cargado.clips) mezclador.clipAction(clip).play();

  const conAltura: { malla: THREE.Mesh; alturaDeSuCaja: number }[] = [];
  dentro.traverse((n) => {
    const m = n as THREE.Mesh;
    if (!m.isMesh || (m.morphTargetInfluences?.length ?? 0) === 0) return;
    m.geometry.computeBoundingBox();
    const suCaja = m.geometry.boundingBox;
    const suCentro = suCaja === null ? 0 : (suCaja.min.y + suCaja.max.y) / 2;
    conAltura.push({ malla: m, alturaDeSuCaja: suCentro });
  });
  conAltura.sort((a, b) => b.alturaDeSuCaja - a.alturaDeSuCaja);
  const montones = conAltura.map((c, i) => ({ malla: c.malla, arriba: i === 0 }));

  return { clon, mezclador, montones };
}

/** Lo que hay que soltar al desmontar: el mezclador se queda con el árbol si no. */
export function soltarElReloj(montado: RelojMontado | null): void {
  if (montado === null) return;
  montado.mezclador.stopAllAction();
  montado.mezclador.uncacheRoot(montado.clon.children[0] ?? montado.clon);
}

/**
 * PONE LOS DOS MONTONES A LA FRACCIÓN QUE TOQUE. `parte` es lo que YA cayó: 0 es lleno
 * arriba y 1 es todo abajo.
 *
 * El peso cero de cada malla es su montón LLENO y el uno es vacío —así lo dejó quien
 * modeló—, de modo que arriba va `parte` (empieza lleno y se vacía) y abajo va su
 * complementario. Aquí iba `parte` en los dos, y eso fabricaba arena: los dos montones son
 * inversamente proporcionales y su suma es siempre uno.
 */
export function ponerLaArena(montado: RelojMontado, parte: number): void {
  for (const monton of montado.montones) {
    const pesos = monton.malla.morphTargetInfluences;
    if (pesos !== undefined && pesos.length > 0) pesos[0] = monton.arriba ? parte : 1 - parte;
  }
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
