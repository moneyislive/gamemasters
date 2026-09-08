/**
 * LA MANCHA DE UN COLONO: el territorio de `territorio.ts`, pintado.
 *
 * ═══ POR QUÉ ES UNA SOLA MALLA Y NO UNA POR PIEZA ═══
 *
 * Porque la unión no se puede hacer apilando translúcidos: donde dos se pisan la mezcla alfa se
 * aplica dos veces y sale una costura más oscura. `territorio.ts` resuelve eso por los dos lados
 * —recorta las figuras para que no se solapen y saca la opacidad de un campo que las cose—, y
 * aquí lo único que queda es meter sus números en un `bufferGeometry`. Una malla por colono, y
 * dentro de ella el disco de cada asentamiento, la junta de cada cruce y el trazo de cada vereda,
 * ya unidos.
 *
 * ═══ SIN GANCHOS, A PROPÓSITO ═══
 *
 * Es la misma regla que el zócalo aprendió a base de perderse tres veces: un componente que no
 * usa ningún gancho se puede LLAMAR como una función corriente desde Node, y `verify:escena`
 * recorre el árbol que devuelve. De dentro de un `useFrame` no se mide nada, y una marca que se
 * puede apagar sin que ningún comprobador se entere es una marca que se pierde en dos semanas.
 * La malla llega hecha por la puerta; aquí no se calcula nada.
 *
 * ═══ Y EL COLOR VA EN EL MATERIAL, LA OPACIDAD EN LOS VÉRTICES ═══
 *
 * Los colores de vértice llevan `(1, 1, 1, opacidad)` y el material lleva el color del dueño: al
 * multiplicarse sale el color entero con el degradado del campo encima. Escrito al revés —el
 * color en los vértices— habría cuatro copias del mismo `#rrggbb` por cada punto de la malla y el
 * día que alguien retoque un color habría que reconstruirla entera.
 */

import * as THREE from 'three';

import type { MallaDelTerritorio } from './territorio';
import { OPACIDAD_DEL_TERRITORIO } from './territorio';

/**
 * EL SITIO EN LA PILA DE DIBUJO. Va detrás del suelo y de los caminos del pack, y delante de las
 * piezas: la mancha se pinta SOBRE la tierra y DEBAJO de las casas, que es lo que la hace parecer
 * pintura en el suelo y no un cristal por encima del poblado.
 */
export const ORDEN_DE_LA_MANCHA = 3;

export function Mancha({
  color,
  malla,
}: {
  color: string;
  malla: MallaDelTerritorio;
}): JSX.Element {
  /*
   * SIN REFERENCIA Y SIN `useFrame`, y ésa es la diferencia con el zócalo que sustituye. Aquélla
   * se reescalaba en cada fotograma porque su tamaño salía de la distancia a la cámara; ésta es
   * pintura sobre el suelo, con tamaños de mundo, así que una vez puesta no se toca hasta que el
   * colono construye. Miguel lo pidió con estas palabras: «que no reescale con el zoom, debe ser
   * fija en el tablero».
   */
  return (
    <mesh renderOrder={ORDEN_DE_LA_MANCHA} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[malla.posiciones, 3]} />
        <bufferAttribute attach="attributes-color" args={[malla.colores, 4]} />
        <bufferAttribute attach="index" args={[malla.indices, 1]} />
      </bufferGeometry>
      {/*
        Sin luz —no la apaga la sombra ni la modula el sol—, transparente, y `depthWrite` apagado
        para que no tape lo que tiene detrás. `DoubleSide` porque la malla sigue el relieve y en
        una ladera vista desde abajo alguna cara queda del revés.
      */}
      <meshBasicMaterial
        color={color}
        vertexColors
        transparent
        opacity={OPACIDAD_DEL_TERRITORIO}
        depthWrite={false}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}
