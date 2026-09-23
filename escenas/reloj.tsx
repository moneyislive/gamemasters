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
 * ═══ HAY UN SOLO RELOJ, Y ES `reloj.glb` ═══
 *
 * Aquí vivieron DOS: el bueno —el modelo, con sus dos montones de arena con morfología y su
 * clip— y un respaldo de conos y cilindros que se pintaba cuando el modelo no llegaba. El
 * respaldo era anterior al modelo, y mientras estuvo se pudo pasar `modelo={null}` y quedarse
 * con el viejo sin que fallara nada: es exactamente lo que le pasó a Las Lindes, que enseñó
 * durante semanas un reloj que ya no era el de la casa.
 *
 * Así que el respaldo está borrado, y `modelo` es OBLIGATORIO. Mientras el `.glb` viaja —y si
 * no llega nunca— se pinta el asa y nada más: el botón de pasar el turno sigue ahí, que era la
 * razón de fondo para tener respaldo, y lo que no puede volver a pasar es que se cuele un
 * segundo reloj con otra cara.
 */

import type { Ref } from 'react';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { RelojCargado } from './comun/reloj';

/*
 * EL CARGADOR, `relojDe`, Y LO QUE DEVUELVE, `RelojCargado`, viven en `comun/reloj.ts`: ahí está el
 * porqué. Se reexportan para que quien los buscara aquí los siga encontrando.
 */
export { relojDe } from './comun/reloj';
export type { RelojCargado } from './comun/reloj';

/**
 * ═══ LA SILUETA QUE OCUPA EL RELOJ EN SU HUECO, en fracciones del lado ═══
 *
 * Esto NO pinta nada: es el contrato de tamaño entre el reloj y el mueble que lo rodea. La
 * bandeja de los dados del Burgo talla su nicho con estos números
 * (`PROPORCIONES_DEL_RELOJ` en `bandeja-de-los-dados.ts`, y `verify:burgo-escena` exige que
 * coincidan) y el rincón de Las Lindes reparte su esquina con `ALTO_DEL_RELOJ_EN_LADOS`, que
 * sale de aquí.
 *
 * Se mide contra el ALTO del hueco y no contra su ancho, porque un reloj de arena es alto y
 * estrecho: lo que lo hace reconocible es la silueta, dos triángulos por la punta.
 */
export const ALTO_DEL_BULBO = 0.38;
/** El radio del bulbo por su base, o sea lo más ancho del cristal. */
export const RADIO_DEL_BULBO = 0.26;
/** El grueso de las dos tapas de madera. */
export const GRUESO_DEL_MARCO = 0.06;

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
  asa,
  lado,
  ancho,
  encendido,
  modelo,
  onPulsar,
}: {
  /** El grupo que GIRA al empezar la ronda. Lo mueve quien monta. */
  cuerpo: Ref<THREE.Group>;
  /** El rectángulo que se pulsa. Invisible pero presente, como el asa de los dados. */
  asa: Ref<THREE.Mesh>;
  lado: number;
  ancho: number;
  /** Apagado cuando no se puede pasar el turno: se pinta más flojo y no coge el toque. */
  encendido: boolean;
  /**
   * EL RELOJ, ya clonado y con su mezclador puesto por quien monta, o `null` mientras viaja.
   *
   * NO TIENE VALOR POR DEFECTO, y eso es el arreglo: mientras lo tuvo, `modelo={null}` era una
   * forma silenciosa de pedir el reloj viejo, y Las Lindes lo estuvo pidiendo. Ahora hay que
   * decir de dónde sale, y la única respuesta posible es `relojDe` + `montarElReloj`.
   *
   * Con `null` se pinta el asa y nada más. Eso es un reloj que no ha llegado —un 404, un
   * despliegue sin el fichero—, no un segundo reloj: el botón de pasar el turno sigue puesto,
   * que era la única razón de fondo para tener respaldo.
   */
  modelo: THREE.Object3D | null;
  onPulsar: () => void;
}): JSX.Element {
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
      </group>
    </group>
  );
}
