/**
 * EL BANCO DE PRUEBAS DEL DELTA EN TRES DIMENSIONES.
 *
 * ═══ QUÉ DEMUESTRA, QUE ES LO ÚNICO QUE PRETENDE ═══
 *
 * Que el cliente de PC pinta una escena de `three` con React 19, y que la escena
 * que pinta es la MISMA que va a pintar el móvil — el fichero `escenas/delta.tsx`
 * no sabe en qué plataforma está y no importa nada de `drei`.
 *
 * Y una segunda cosa que sólo se ve mirando: que la geometría cuadra. Las teselas
 * salen de `esquinasDeHex`, las chozas de `puntoDeVertice` y los caminos de
 * `verticesDeArista`, todas de `shared/mecanicas/malla-hexagonal.ts`. Si una choza
 * cayera medio radio fuera de la esquina, o un camino no fuera de vértice a
 * vértice, aquí se ve en el acto. Ningún comprobador de Node puede mirar eso: no
 * abre un contexto de dibujo.
 *
 * ═══ EL DELTA DE PRUEBA ES FIJO Y NO ALEATORIO ═══
 *
 * Se dibuja siempre el mismo tablero, con las mismas piezas en los mismos sitios.
 * Un reparto aleatorio haría bonita la captura y quitaría lo único que esto vale:
 * poder comparar dos ejecuciones y ver que ha cambiado lo que se tocó.
 */
import { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  aristaEntre,
  mallaDeRadio,
  verticeEntre,
} from '../../shared/mecanicas/malla-hexagonal';
import type { Hex } from '../../shared/mecanicas/malla-hexagonal';
import { Delta, encuadreDelDelta, RADIO_DE_ISLA } from '../../escenas/delta';
import type { DeltaEn3D } from '../../escenas/tipos';
import './estilo.css';

/**
 * EL REPARTO DE PRUEBA.
 *
 * Diecinueve islas —el delta de radio 2— con los terrenos y los números repartidos
 * a mano. No sale de `azar.ts` a propósito: ver la cabecera.
 */
function deltaDePrueba(): DeltaEn3D {
  const hexes = mallaDeRadio(2);
  const terrenos = [
    'bosque', 'pradera', 'campo', 'colina', 'montana', 'bosque', 'pradera',
    'campo', 'desierto', 'colina', 'montana', 'bosque', 'pradera', 'campo',
    'colina', 'montana', 'bosque', 'pradera', 'campo',
  ];
  const cifras = [5, 2, 6, 3, 8, 10, 9, 12, null, 4, 11, 4, 8, 10, 9, 5, 6, 3, 11];

  const islas = hexes.map((hex, i) => ({
    hex,
    terreno: terrenos[i % terrenos.length] as string,
    cifra: cifras[i % cifras.length] ?? null,
  }));

  /*
   * Las piezas se colocan por VÉRTICES DERIVADOS de hexágonos reales, no por
   * llaves escritas a mano. Escribir `"0,0|0,-1|1,-1"` a mano aquí sería fijar en
   * el banco de pruebas la convención de la malla, y entonces esto dejaría de
   * comprobarla: pasaría igual el día que la convención cambiara y el tablero de
   * verdad se pintara girado.
   */
  const centro: Hex = { q: 0, r: 0 };
  const norte: Hex = { q: 0, r: -1 };
  const noreste: Hex = { q: 1, r: -1 };
  const sureste: Hex = { q: 1, r: 0 };
  const sur: Hex = { q: 0, r: 1 };
  const suroeste: Hex = { q: -1, r: 1 };

  return {
    islas,
    piezas: [
      { vertice: verticeEntre(centro, norte, noreste), clase: 'choza', color: '#d24b3a' },
      { vertice: verticeEntre(centro, sureste, sur), clase: 'torre', color: '#2f7fd0' },
      { vertice: verticeEntre(centro, sur, suroeste), clase: 'choza', color: '#e8b93c' },
    ],
    caminos: [
      { arista: aristaEntre(centro, norte), color: '#d24b3a' },
      { arista: aristaEntre(centro, noreste), color: '#d24b3a' },
      { arista: aristaEntre(centro, sureste), color: '#2f7fd0' },
      { arista: aristaEntre(centro, sur), color: '#2f7fd0' },
      { arista: aristaEntre(centro, suroeste), color: '#e8b93c' },
    ],
    ladron: { q: 0, r: -2 },
  };
}

/**
 * LA CÁMARA QUE GIRA SOLA, y por qué gira sola en vez de traer controles.
 *
 * `camera-controls` y `OrbitControls` de `drei` necesitan un `HTMLElement` para
 * engancharse, o sea que no valen en el móvil — lo comprobó el rastreo leyendo su
 * `connect()`. Los controles de verdad se montan FUERA de la escena y son
 * distintos en cada cliente; aquí, para MIRAR si la escena está bien, basta con
 * que el delta gire despacio: en una vuelta se ven las cuatro caras, las sombras
 * cambiando y si alguna pieza flota.
 */
function CamaraQueRonda({ alcance, quieta }: { alcance: number; quieta: boolean }): null {
  const { camera } = useThree();
  const angulo = useRef(0.6);

  useFrame((_, delta) => {
    if (!quieta) angulo.current += delta * 0.18;
    const a = angulo.current;
    camera.position.set(
      Math.sin(a) * alcance * 1.35,
      alcance * 1.15,
      Math.cos(a) * alcance * 1.35,
    );
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/** Cuenta los triángulos que de verdad se dibujan. El dato que decide si cabe en un móvil. */
function Contador({ alContar }: { alContar: (n: number) => void }): null {
  const { gl } = useThree();
  const ultimo = useRef(-1);
  useFrame(() => {
    const n = gl.info.render.triangles;
    if (n !== ultimo.current) {
      ultimo.current = n;
      alContar(n);
    }
  });
  return null;
}

function Banco(): JSX.Element {
  const datos = useMemo(deltaDePrueba, []);
  const encuadre = useMemo(
    () => encuadreDelDelta(datos.islas.map((i) => i.hex), RADIO_DE_ISLA),
    [datos],
  );
  const alcance = encuadre.posicion[2];
  const [quieta, ponerQuieta] = useState(false);
  const [triangulos, ponerTriangulos] = useState(0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#06110f' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: encuadre.posicion, fov: 42 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <color attach="background" args={['#0b2233']} />
        <fog attach="fog" args={['#0b2233', alcance * 1.6, alcance * 3.4]} />
        <CamaraQueRonda alcance={alcance} quieta={quieta} />
        <Contador alContar={ponerTriangulos} />
        <Delta datos={datos} />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          left: 18,
          bottom: 18,
          color: '#cfe3d6',
          font: '13px/1.6 system-ui, sans-serif',
          background: 'rgba(6,17,15,0.72)',
          border: '1px solid #24483c',
          borderRadius: 10,
          padding: '10px 14px',
        }}
      >
        <div style={{ letterSpacing: 2, fontSize: 11, opacity: 0.65 }}>BANCO DE PRUEBAS</div>
        <div>
          {datos.islas.length} islas · {datos.piezas.length} piezas · {datos.caminos.length} caminos
        </div>
        <div>
          {triangulos.toLocaleString('es-ES')} triángulos por fotograma
        </div>
        <button
          type="button"
          onClick={() => ponerQuieta((q) => !q)}
          style={{
            marginTop: 8,
            background: '#12312a',
            color: '#7fd4b0',
            border: '1px solid #2f6b58',
            borderRadius: 8,
            padding: '6px 12px',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          {quieta ? 'Girar' : 'Parar'}
        </button>
      </div>
    </div>
  );
}

const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('Falta el <div id="raiz"> de banco3d.html');
createRoot(raiz).render(<Banco />);
