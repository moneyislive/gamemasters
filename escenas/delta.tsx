/**
 * EL DELTA EN TRES DIMENSIONES.
 *
 * ═══ LA GEOMETRÍA SALE DE LA MALLA, NO DE UNA CONVENCIÓN NUEVA ═══
 *
 * Es la decisión que sostiene todo lo demás. Un hexágono se podría dibujar aquí
 * con seis senos y seis cosenos, y quedaría igual de bien — hasta el día en que
 * alguien coloque una choza y caiga medio radio fuera de la esquina.
 *
 * Lo que se hace es construir la tesela a partir de `esquinasDeHex`, la misma
 * función que ya usa el tablero plano, y colocar las piezas con `puntoDeVertice` y
 * `puntoDeArista`, las mismas que usa él. Con eso, que una choza caiga exactamente
 * donde se tocan tres islas no es algo que haya que acertar: es una consecuencia.
 * Y el día que la malla cambie de convención, las dos vistas cambian a la vez.
 *
 * ═══ DEL PLANO AL ESPACIO: LA `y` DEL TABLERO ES LA `z` DEL MUNDO ═══
 *
 * La malla trabaja en un plano `(x, y)` y `three` tiene la `y` hacia arriba. Así
 * que el mapa se tumba: la `x` del tablero es la `x` del mundo, la `y` del tablero
 * es la `z`, y la `y` del mundo queda libre para lo único que en un tablero de
 * mesa sube: el grosor de las teselas y la altura de las piezas.
 *
 * ═══ NI UNA IMPORTACIÓN DE `drei`, Y NO ES AUSTERIDAD ═══
 *
 * `@react-three/drei` está instalado en el escritorio y es MIT limpio, pero buena
 * parte de sus componentes dan por hecho que hay DOM debajo. Este fichero lo
 * pintan DOS clientes —la app sobre `expo-gl` y el escritorio sobre WebGL del
 * navegador— y un componente que asuma el DOM aquí dentro sale negro en el móvil
 * sin un error en ninguna consola: el fallo mudo que esta casa persigue.
 *
 * Así que aquí sólo entran mallas, materiales y luces, que es vocabulario de
 * `three` y funciona en los dos sitios. Lo que sea de una plataforma —los
 * controles de cámara, el postprocesado— se monta FUERA, alrededor de esto.
 *
 * ═══ Y LOS NÚMEROS SE DIBUJAN CON PUNTOS, QUE NO ES UN APAÑO ═══
 *
 * Escribir un dígito en 3D exige una fuente tipográfica o una textura, y las dos
 * vías tienen mal encaje en `expo-gl` hoy. Pero es que además los números de un
 * tablero de mesa se leen mejor con PUNTOS: cuantos más puntos, más probable es
 * ese número, y eso se ve de un vistazo sin contar. Aquí van los dos —el disco con
 * sus puntos— y el dígito exacto lo pone la interfaz plana que va encima, donde
 * escribir texto es gratis.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
/*
 * IMPORTACIÓN SOLO DE TIPOS, Y HACE FALTA AUNQUE PAREZCA QUE NO.
 *
 * Este fichero usa `<mesh>`, `<group>` y `<meshStandardMaterial>`, que no son
 * etiquetas de React: las declara `@react-three/fiber` ampliando `JSX` desde su
 * `three-types.d.ts`. Y una ampliación de módulo sólo se carga si el módulo se
 * importa. Sin esta línea el compilador dice «Property 'mesh' does not exist on
 * type 'JSX.IntrinsicElements'» doce veces y no menciona a r3f por ningún lado.
 *
 * Va como `import type {}` a propósito: trae los tipos y NO añade una importación
 * en ejecución, así que este fichero sigue sin depender de r3f para funcionar —
 * lo pinta quien monte el `Canvas`, que es distinto en cada cliente.
 */
import type {} from '@react-three/fiber';
import {
  centroDeHex,
  esquinasDeHex,
  puntoDeArista,
  puntoDeVertice,
  verticesDeArista,
} from '../shared/mecanicas/malla-hexagonal';
import type { Hex, Punto } from '../shared/mecanicas/malla-hexagonal';
import { colorDeTerreno, puntosDeLaCifra } from './paleta';
import type { CaminoEn3D, DeltaEn3D, IslaEn3D, PiezaEn3D } from './tipos';

/** El radio de una isla en unidades de mundo. Todo lo demás se mide con esto. */
export const RADIO_DE_ISLA = 1;

/** Lo que sobresale una tesela sobre el agua, sin contar el bisel. */
const GROSOR_DE_ISLA = 0.28;

/**
 * El bisel del canto, y por qué su medida no se queda dentro de la geometría.
 *
 * `ExtrudeGeometry` con bisel NO acaba en `depth`: el bisel crece por FUERA, a los
 * dos lados, así que la cara de arriba queda en `depth + bevelThickness`. Es un
 * detalle de tres centésimas y costó la primera captura: el disco del número y las
 * piezas se colocaban a `depth` y quedaban ENTERRADOS dentro de la tesela — no
 * medio tapados, invisibles del todo, y sin ningún error en ninguna consola.
 *
 * Por eso la altura de la cara superior es una constante con nombre y la usan
 * todos los que se apoyan en ella. Un número suelto repetido en cuatro sitios es
 * un número que un día se cambia en tres.
 */
const BISEL = 0.03;

/** Dónde está de verdad la cara de arriba de una isla. Todo lo que se apoya, aquí. */
const ALTURA_DE_LA_MESA = GROSOR_DE_ISLA + BISEL;

/**
 * Un pelo de separación entre teselas.
 *
 * Sin esto las paredes de dos islas vecinas quedan a cero distancia y el buscador
 * de profundidad no sabe cuál está delante: aparecen costuras que parpadean al
 * mover la cámara. Es el mismo motivo por el que un tablero de verdad tiene junta.
 */
const JUNTA = 0.02;

const COLOR_DEL_MAR = '#1d4f6b';
const COLOR_DEL_NUMERO = '#efe6cd';
const COLOR_DEL_PUNTO = '#2a2118';
const COLOR_DEL_LADRON = '#20242b';

/** El plano del tablero puesto en el mundo: la `y` de la malla pasa a ser la `z`. */
function alMundo(p: Punto, altura: number): [number, number, number] {
  return [p.x, altura, p.y];
}

/**
 * LA TESELA, extruida del hexágono de la malla.
 *
 * `THREE.Shape` toma los seis puntos tal cual salen de `esquinasDeHex` y
 * `ExtrudeGeometry` le da grosor. Se construye tumbada —el extruido crece en `z`—
 * y se gira un cuarto de vuelta para que el grosor quede en la vertical del mundo.
 *
 * `useMemo` sobre el tamaño y no sobre el hexágono: la FORMA de todas las teselas
 * es la misma, sólo cambia dónde se pone. Construir una geometría por isla serían
 * diecinueve mallas idénticas ocupando memoria para nada.
 */
function useGeometriaDeIsla(radio: number): THREE.ExtrudeGeometry {
  return useMemo(() => {
    const esquinas = esquinasDeHex({ q: 0, r: 0 }, radio - JUNTA);
    const forma = new THREE.Shape();
    const primera = esquinas[0] as Punto;
    forma.moveTo(primera.x, primera.y);
    for (let i = 1; i < esquinas.length; i++) {
      const e = esquinas[i] as Punto;
      forma.lineTo(e.x, e.y);
    }
    forma.closePath();
    const geometria = new THREE.ExtrudeGeometry(forma, {
      depth: GROSOR_DE_ISLA,
      bevelEnabled: true,
      bevelThickness: BISEL,
      bevelSize: BISEL,
      bevelSegments: 2,
    });
    /* Tumbarla: el extruido crece en `z` y aquí la altura es `y`. */
    geometria.rotateX(-Math.PI / 2);
    return geometria;
  }, [radio]);
}

function Isla({
  isla,
  geometria,
  radio,
  conLadron,
}: {
  isla: IslaEn3D;
  geometria: THREE.ExtrudeGeometry;
  radio: number;
  conLadron: boolean;
}): JSX.Element {
  const centro = centroDeHex(isla.hex, radio);
  const color = colorDeTerreno(isla.terreno);
  const puntos = isla.cifra === null ? 0 : puntosDeLaCifra(isla.cifra);

  return (
    <group position={alMundo(centro, 0)}>
      <mesh geometry={geometria} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.02} />
      </mesh>

      {isla.cifra !== null ? (
        <group position={[0, ALTURA_DE_LA_MESA + 0.001, 0]}>
          {/* El disco del número, apoyado en la tesela. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[radio * 0.3, 32]} />
            <meshStandardMaterial color={COLOR_DEL_NUMERO} roughness={0.6} />
          </mesh>
          {/* Y sus puntos, en fila y centrados. Ver `puntosDeLaCifra`. */}
          {Array.from({ length: puntos }, (_, i) => (
            <mesh
              key={i}
              position={[(i - (puntos - 1) / 2) * radio * 0.075, 0.002, radio * 0.115]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <circleGeometry args={[radio * 0.022, 12]} />
              <meshBasicMaterial color={COLOR_DEL_PUNTO} />
            </mesh>
          ))}
        </group>
      ) : null}

      {conLadron ? (
        <mesh position={[0, ALTURA_DE_LA_MESA + radio * 0.28, 0]} castShadow>
          <coneGeometry args={[radio * 0.17, radio * 0.55, 12]} />
          <meshStandardMaterial color={COLOR_DEL_LADRON} roughness={0.5} />
        </mesh>
      ) : null}
    </group>
  );
}

/**
 * UNA PIEZA EN UN VÉRTICE.
 *
 * La choza es una caja con tejado; la torre, la misma caja más alta y con una
 * planta más. Se distinguen por SILUETA y no por color, que es la misma regla que
 * el tablero plano aplica con `forma: 'redondo' | 'cuadrado'`: el color dice de
 * quién es, y la forma dice qué es. Dos cosas distintas no pueden depender del
 * mismo canal, porque entonces dos jugadores de colores parecidos dejan de poder
 * distinguir sus propias construcciones.
 */
function Pieza({ pieza, radio }: { pieza: PiezaEn3D; radio: number }): JSX.Element {
  const p = puntoDeVertice(pieza.vertice, radio);
  const esTorre = pieza.clase === 'torre';
  const lado = radio * (esTorre ? 0.3 : 0.24);
  const alto = radio * (esTorre ? 0.42 : 0.26);

  return (
    <group position={alMundo(p, ALTURA_DE_LA_MESA)}>
      <mesh position={[0, alto / 2, 0]} castShadow>
        <boxGeometry args={[lado, alto, lado]} />
        <meshStandardMaterial color={pieza.color} roughness={0.7} />
      </mesh>
      {/* El tejado, que es lo que la hace legible a vista de pájaro. */}
      <mesh position={[0, alto + lado * 0.28, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[lado * 0.78, lado * 0.56, 4]} />
        <meshStandardMaterial color={pieza.color} roughness={0.6} />
      </mesh>
      {esTorre ? (
        <mesh position={[0, alto * 1.5 + lado * 0.5, 0]} castShadow>
          <boxGeometry args={[lado * 0.55, alto * 0.5, lado * 0.55]} />
          <meshStandardMaterial color={pieza.color} roughness={0.7} />
        </mesh>
      ) : null}
    </group>
  );
}

/**
 * UN CAMINO EN UNA ARISTA.
 *
 * El ángulo NO se calcula desde el hexágono ni desde un índice de lado: sale de
 * los DOS VÉRTICES de la arista, que la malla sabe dar por su llave. Así un camino
 * apunta siempre de esquina a esquina aunque la convención de la malla cambie.
 */
function Camino({ camino, radio }: { camino: CaminoEn3D; radio: number }): JSX.Element | null {
  const [a, b] = verticesDeArista(camino.arista);
  if (a === undefined || b === undefined) return null;
  const pa = puntoDeVertice(a, radio);
  const pb = puntoDeVertice(b, radio);
  const medio = puntoDeArista(camino.arista, radio);
  const largo = Math.hypot(pb.x - pa.x, pb.y - pa.y);
  /* En el mundo, la `y` del plano es la `z`: el giro va sobre el eje vertical. */
  const giro = Math.atan2(pb.y - pa.y, pb.x - pa.x);

  return (
    <mesh
      position={alMundo(medio, ALTURA_DE_LA_MESA + radio * 0.035)}
      rotation={[0, -giro, 0]}
      castShadow
    >
      <boxGeometry args={[largo * 0.72, radio * 0.07, radio * 0.1]} />
      <meshStandardMaterial color={camino.color} roughness={0.75} />
    </mesh>
  );
}

/** El mar: un plano grande debajo de todo, para que el delta no flote en el vacío. */
function Mar({ radio }: { radio: number }): JSX.Element {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <circleGeometry args={[radio * 14, 64]} />
      <meshStandardMaterial color={COLOR_DEL_MAR} roughness={0.35} metalness={0.15} />
    </mesh>
  );
}

/**
 * LA LUZ DE UNA MAQUETA, que es lo que separa un tablero 3D de un render plano.
 *
 * Tres luces y ninguna más: una direccional alta y cálida que hace de sol y tira
 * las sombras, un ambiente frío que rellena lo que el sol no toca —sin él las
 * caras en sombra quedan negras y las piezas parecen recortadas—, y un
 * hemisférico suave que devuelve algo del color del mar por abajo, que es lo que
 * de verdad hace que una maqueta parezca estar SOBRE algo.
 */
function Luces({ radio }: { radio: number }): JSX.Element {
  return (
    <>
      <ambientLight intensity={0.55} color="#cfe0f0" />
      <hemisphereLight args={['#eaf4ff', COLOR_DEL_MAR, 0.45]} />
      <directionalLight
        position={[radio * 6, radio * 9, radio * 4]}
        intensity={2.1}
        color="#fff3dd"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-radio * 8}
        shadow-camera-right={radio * 8}
        shadow-camera-top={radio * 8}
        shadow-camera-bottom={-radio * 8}
      />
    </>
  );
}

/**
 * EL DELTA ENTERO.
 *
 * Recibe datos llanos y devuelve escena. No sabe de partidas, ni de turnos, ni de
 * quién mira: eso lo decide quien lo monta, que es distinto en cada cliente.
 */
export function Delta({
  datos,
  radio = RADIO_DE_ISLA,
}: {
  datos: DeltaEn3D;
  radio?: number;
}): JSX.Element {
  const geometria = useGeometriaDeIsla(radio);
  const ladron = datos.ladron;

  return (
    <group>
      <Luces radio={radio} />
      <Mar radio={radio} />
      {datos.islas.map((isla) => (
        <Isla
          key={`${String(isla.hex.q)},${String(isla.hex.r)}`}
          isla={isla}
          geometria={geometria}
          radio={radio}
          conLadron={ladron !== null && ladron.q === isla.hex.q && ladron.r === isla.hex.r}
        />
      ))}
      {datos.caminos.map((c) => (
        <Camino key={c.arista} camino={c} radio={radio} />
      ))}
      {datos.piezas.map((p) => (
        <Pieza key={`${p.vertice}:${p.clase}`} pieza={p} radio={radio} />
      ))}
    </group>
  );
}

/** Dónde poner la cámara para que quepa un delta de este radio. Sale de la malla. */
export function encuadreDelDelta(hexes: readonly Hex[], radio: number): {
  posicion: [number, number, number];
  mira: [number, number, number];
} {
  let maxX = radio;
  let maxY = radio;
  for (const h of hexes) {
    const c = centroDeHex(h, radio);
    maxX = Math.max(maxX, Math.abs(c.x) + radio);
    maxY = Math.max(maxY, Math.abs(c.y) + radio);
  }
  const alcance = Math.max(maxX, maxY);
  return { posicion: [0, alcance * 1.55, alcance * 1.35], mira: [0, 0, 0] };
}
