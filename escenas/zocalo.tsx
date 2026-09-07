/**
 * EL ZÓCALO: EL ARO DEL COLOR DE SU DUEÑO QUE LLEVA TODA PIEZA DE JUGADOR.
 *
 * ═══ EL FALLO QUE TAPA, MEDIDO JUGANDO Y NO LEYENDO ═══
 *
 * En una partida entera nadie consiguió señalar su propia choza. Con el encuadre de «Ver el
 * tablero entero», el tablero recién repartido y el mismo con seis chozas y seis veredas
 * puestas salían indistinguibles. Y no es que las piezas no se pinten: es que el tejado de
 * una casa de adorno y el tejado del poblado de alguien son EL MISMO TÉXEL del atlas
 * —`poblar.ts` reparte casas de tejado rojo, azul y amarillo por todas las comarcas, y ésos
 * son tres de los cuatro colores de jugador—, y a esa distancia una pieza mide once píxeles
 * en una ventana de novecientos. Buscar el color propio entre el caserío es buscar una casa
 * roja entre casas rojas.
 *
 * Así que la pieza de jugador gana algo que el decorado no puede tener: un aro del color de
 * su dueño, pegado al suelo, que MIDE LO MISMO EN PANTALLA desde donde se mire.
 *
 * ═══ POR QUÉ ESTO SALIÓ DE `delta.tsx`, QUE ES LA MITAD DEL ARREGLO ═══
 *
 * Por dos razones, y la segunda es la cara.
 *
 * LA PRIMERA: HAY DOS SITIOS QUE LO NECESITAN. El zócalo nació en el asentamiento, y las
 * VEREDAS se quedaron sin nada: `PuenteDeJugador` sólo colorea el banderín del asta, y desde
 * el encuadre de tablero una vereda propia era indistinguible del paisaje — con el Vado Largo,
 * que es uno de los dos títulos de la partida, jugándose a contar cinco veredas seguidas que
 * no se ven. Dos marcas escritas en dos sitios coinciden hasta el primer retoque; una escrita
 * aquí y montada dos veces no puede discrepar.
 *
 * LA SEGUNDA: DE DENTRO DE `delta.tsx` NO SE PUEDE COMPRAR. El zócalo es lo único que hace
 * jugable el tablero, y estuvo escrito dentro del JSX de un componente con `useFrame`, o sea
 * en el único sitio del árbol al que un comprobador de Node no llega: se le puso
 * `visible={false}` y las 378 comprobaciones de `verify:escena` y las 657 de
 * `verify:escritorio` siguieron LAS DOS EN VERDE mientras el tablero con cuatro chozas y
 * cuatro veredas volvía a ser idéntico al vacío. Ésa es la historia que este árbol ya tiene
 * escrita tres veces: un arreglo que se pierde dentro de dos semanas sin que nadie lo vea
 * venir.
 *
 * `Zocalo` NO USA NINGÚN GANCHO, y eso es a propósito y es lo que compra la vigilancia: un
 * componente sin ganchos se puede LLAMAR como una función corriente, y lo que devuelve es un
 * árbol de elementos de React —objetos llanos con su `type` y sus `props`— que se recorre
 * desde Node sin montar nada. `verify:escena` lo recorre y compra que el aro existe, que lleva
 * el color de su dueño, que tiene filo, que mide una marca de pantalla y que nadie lo ha
 * apagado. El `useFrame` que lo escala se queda fuera, en `delta.tsx`, porque de un `useFrame`
 * no se mide — pero la CUENTA que ese `useFrame` hace vive aquí (`tallaDelZocalo`) por la
 * misma razón por la que `tallaDeUnaMarca` vive en `escala.ts`.
 *
 * ═══ SE PARECE A `Senal` Y NO ES `Senal`, Y LAS DIFERENCIAS SON LA MITAD DEL DISEÑO ═══
 *
 *   · NO LATE y no responde al ratón. La señal dice «aquí PUEDES construir» y por eso respira;
 *     el zócalo dice «esto YA es de alguien». Un aro que late sobre algo construido invita a
 *     pulsarlo, y ahí no hay nada que pulsar.
 *   · NO RECIBE RAYOS, y va escrito aunque HOY no haga falta. Hoy no hace falta porque r3f
 *     sólo mete en su lista de trazado las mallas que tienen manejadores, y éstas no tienen
 *     ninguno; el día que alguien le cuelgue un `onPointerUp` este aro pasaría a ocupar desde
 *     el aire más que la propia comarca y se comería los toques de lo que tiene debajo.
 *     `raycast={() => null}` es lo que de verdad lo desactiva: con `raycast={null}` el motor
 *     revienta al primer rayo, y `visible={false}` NO lo quita del trazado — las dos cosas
 *     están medidas sobre el paquete instalado en la cabecera de `Senal`.
 *   · VA MÁS BAJO Y MÁS PEQUEÑO. La señal flota dos personas y media para no perderse entre el
 *     follaje; el zócalo se apoya casi en el suelo porque tiene una pieza encima que lo levanta
 *     visualmente, y ocupa menos pantalla porque hay uno por pieza y puede haber ciento
 *     veintiséis — al tamaño de una señal, eso sí sería una alfombra.
 *
 * `depthWrite={false}` y `DoubleSide` como el de la señal, y por lo mismo: que no tape lo que
 * tiene detrás y que no desaparezca visto a ras de suelo.
 */
/*
 * ═══ POR QUÉ ESTE FICHERO IMPORTA `React` Y `delta.tsx` NO ═══
 *
 * Porque se compila de DOS maneras, y ésa es justamente la gracia de que exista.
 *
 * En el navegador lo compila Vite con el runtime automático de JSX (`jsx: react-jsx`), que no
 * necesita nada en el ámbito: por eso ningún otro `.tsx` de esta carpeta lo importa. Pero este
 * fichero lo carga además `tsx` desde `verify:escena` —que es lo que compra que el zócalo
 * exista— y `tsx` compila JSX con el runtime CLÁSICO, que traduce cada etiqueta a
 * `React.createElement` y revienta con «React is not defined» si el nombre no está.
 *
 * La importación sobra en el navegador y se elide sola; aquí es lo que hace que el comprobador
 * pueda llamar a `Zocalo`. Quitarla no rompe la pantalla: rompe la vigilancia, en silencio y
 * sólo al correr la batería.
 */
import * as React from 'react';
import type { Ref } from 'react';
import * as THREE from 'three';
import {
  RADIO_DE_TESELA,
  SUELO_DEL_ZOCALO,
  tallaDeUnaMarca,
  TECHO_DEL_ZOCALO,
  ZOCALO_EN_PANTALLA,
} from './escala';
import { colorLlanoDelJugador, FILO_DEL_ZOCALO } from './paleta';

/** Uno de los dos aros: de dónde a dónde llega, de qué color y con cuánto cuerpo. */
export interface AnilloDelZocalo {
  /** El radio de dentro, en múltiplos de `RADIO_DE_TESELA`. */
  readonly dentro: number;
  /** El radio de fuera, en múltiplos de `RADIO_DE_TESELA`. */
  readonly fuera: number;
  readonly color: string;
  readonly opacidad: number;
  /**
   * EL SITIO EN LA PILA DE DIBUJO, y no una altura.
   *
   * El filo va debajo del color, y eso se resuelve con `renderOrder` porque dos planos
   * separados en el eje vertical se cruzarían al mirar desde el ras del suelo: el filo
   * asomaría por delante del color en unos ángulos y por detrás en otros.
   */
  readonly orden: number;
}

/**
 * EN CUÁNTOS TROZOS SE PARTE EL ARO. Veintiocho.
 *
 * A la talla de marca de pantalla el aro mide unos cuarenta y dos píxeles de diámetro en una
 * ventana de novecientos: con veintiocho lados, el trozo de circunferencia mide menos de cinco
 * píxeles y el ojo lee un círculo. Menos se vería como un polígono, y más son triángulos
 * pagados por nada — y de estos aros puede haber más de cien en pantalla a la vez.
 */
export const LADOS_DEL_ARO = 28;

/**
 * LOS DOS AROS, Y POR QUÉ EL DE COLOR NO PUEDE IR SOLO.
 *
 * Porque MEDIDO no se ve. El zócalo se posa sobre el suelo de su isla, y ese suelo sale del
 * atlas: el verde de jugador es `#007d52` y la celda del bosque —que es la que pinta el
 * carrizal de Riberas— es `#008454`. Son CUATRO unidades de CIE76, o sea el mismo color; el
 * amarillo sobre la vega son 14,8, y el umbral con el que esta casa mide que una superficie no
 * se come una pieza es 20. Un aro verde sobre un carrizal es un aro que no está, y el carrizal
 * es uno de los seis terrenos: en un delta de diecinueve islas hay tres o cuatro.
 *
 * La salida es la de siempre para un trazo sobre un fondo cualquiera: un FILO. Un aro casi
 * negro un poco más grande, con el aro de color encima, y entonces lo que tiene que separarse
 * del terreno es el filo —uno solo, y siempre el mismo— y no los cuatro colores. Los números y
 * la decisión entera, en `FILO_DEL_ZOCALO` (`paleta.ts`).
 *
 * Los radios salen de aquí y no del JSX para que se puedan medir: `verify:escena` compra con
 * ellos que el filo asoma por fuera del color y que el aro entero no se come a su vecino.
 */
export function anillosDelZocalo(color: string): readonly AnilloDelZocalo[] {
  return [
    { dentro: 0.55, fuera: 1.07, color: FILO_DEL_ZOCALO, opacidad: 0.75, orden: 1 },
    { dentro: 0.62, fuera: 1, color: colorLlanoDelJugador(color), opacidad: 0.9, orden: 2 },
  ];
}

/**
 * EL CAMPO CON EL QUE SE CUENTA CUANDO LA CÁMARA NO ES DE PERSPECTIVA.
 *
 * Es el mismo 45 que trae `PerspectiveCamera` por defecto, y está escrito para que una cámara
 * ortográfica no deje el aro sin talla: `tallaDeUnaMarca` con un campo de cero devuelve el
 * SUELO, que es una china, y una china no es una marca.
 */
const CAMPO_DE_RESERVA = 45;

/**
 * CUÁNTO TIENE QUE MEDIR EL ZÓCALO DESDE DONDE ESTÉ LA CÁMARA.
 *
 * ═══ POR QUÉ ESTA CUENTA VIVE AQUÍ Y NO DENTRO DEL `useFrame` QUE LA LLAMA ═══
 *
 * Porque estaba allí, escrita a mano y por duplicado, y de ahí no se puede medir: un
 * comprobador de Node que quisiera afirmar que un aro se ve desde la vista de tablero tendría
 * que abrir un contexto de dibujo. Aquí es aritmética, y `verify:escena` la llama con la
 * cámara de VERDAD del encuadre del delta y con los ciento veintiséis sitios donde puede caer
 * una pieza. Es la misma frontera que separa `escala.ts` de `delta.tsx`, y la misma razón.
 *
 * Lo que devuelve es lo que va en `scale`: `tallaDeUnaMarca` cuenta en múltiplos de
 * `RADIO_DE_TESELA`, que es la unidad en la que están escritos los dos aros.
 */
export function tallaDelZocalo(
  camara: THREE.Camera,
  donde: readonly [number, number, number],
): number {
  const dx = camara.position.x - donde[0];
  const dy = camara.position.y - donde[1];
  const dz = camara.position.z - donde[2];
  const lejos = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const perspectiva = camara as THREE.PerspectiveCamera;
  const grados = perspectiva.isPerspectiveCamera === true ? perspectiva.fov : CAMPO_DE_RESERVA;
  const campo = (grados * Math.PI) / 180;
  return tallaDeUnaMarca(lejos, campo, ZOCALO_EN_PANTALLA, SUELO_DEL_ZOCALO, TECHO_DEL_ZOCALO);
}

/**
 * EL ARO, MONTADO. Sin ganchos, para que se pueda llamar desde un comprobador.
 *
 * `aro` es la referencia por la que quien lo monta le pone la talla en cada fotograma: el
 * grupo de fuera lleva la escala y los dos aros de dentro van en unidades de mundo, así que
 * quien anima toca UN objeto y no dos mallas.
 *
 * `donde` es la posición RELATIVA a su padre, y por eso no la decide este fichero: en un
 * asentamiento el padre ya está puesto en el vértice y lo único que falta es levantarlo del
 * suelo; en una vereda el padre es el grupo del delta y hay que decirle el punto medio de la
 * arista entero.
 *
 * Y no lleva `visible`: no es un descuido, es que este aro no se apaga nunca. Una pieza sin
 * zócalo es una pieza que no se encuentra, que es el fallo entero que esto existe para tapar.
 */
export function Zocalo({
  color,
  donde,
  aro,
}: {
  color: string;
  donde: readonly [number, number, number];
  aro: Ref<THREE.Group>;
}): JSX.Element {
  return (
    <group ref={aro} position={[donde[0], donde[1], donde[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      {anillosDelZocalo(color).map((anillo) => (
        <mesh key={anillo.orden} renderOrder={anillo.orden} raycast={() => null}>
          <ringGeometry
            args={[RADIO_DE_TESELA * anillo.dentro, RADIO_DE_TESELA * anillo.fuera, LADOS_DEL_ARO]}
          />
          <meshBasicMaterial
            color={anillo.color}
            transparent
            opacity={anillo.opacidad}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
