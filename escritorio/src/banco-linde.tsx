/**
 * EL BANCO DE PRUEBAS DE LA LINDE ALTA: el lobby de Las Lindes, sin servidor.
 *
 * ═══ QUÉ DEMUESTRA, QUE ES LO ÚNICO QUE PRETENDE ═══
 *
 * Lo que ningún comprobador puede decir: que el altozano SE VE. Que los cinco
 * mojones caen en corro, que quien se sienta aparece junto al suyo mirando a la
 * piedra del centro, que el valle del fondo da profundidad en vez de parecer una
 * pared, y que con la mesa llena la cámara los coge a todos.
 *
 * Los asientos se sientan y se levantan con botones, y los bytes de los `.glb` se
 * piden a las direcciones que da Vite con `?url`. La escena no se entera: recibe la
 * misma `MesaEnElMuelle` y la misma `traer` que en la Sala. Es la misma frontera que
 * `banco-lobby.tsx` y `banco-plaza.tsx`.
 */
import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { LindeAlta } from '../../escenas/linde-alta/LindeAlta';
import { FICHERO_DE_ANIMACIONES, FIGURAS, RUTA_DE_MODELOS } from '../../escenas/embarcadero/figuras';
import { temaDelMuelle } from '../../escenas/embarcadero/tema';
import type { TemaDelMuelle } from '../../escenas/embarcadero/tema';
import type { AsientoEnElMuelle, MesaEnElMuelle, Traer } from '../../escenas/embarcadero/tipos';
import { rutaDelTablero } from '../../escenas/ruta-de-modelos';
import tableroGlb from '../../escenas/modelos/tablero.glb?url';
import animacionesGlb from '../../escenas/modelos/aventureros/animaciones.glb?url';
import caballeroGlb from '../../escenas/modelos/aventureros/caballero.glb?url';
import barbaroGlb from '../../escenas/modelos/aventureros/barbaro.glb?url';
import magaGlb from '../../escenas/modelos/aventureros/maga.glb?url';
import exploradoraGlb from '../../escenas/modelos/aventureros/exploradora.glb?url';
import picaroGlb from '../../escenas/modelos/aventureros/picaro.glb?url';
import encapuchadoGlb from '../../escenas/modelos/aventureros/encapuchado.glb?url';

/* ─────────────────────────── Las direcciones de Vite ─────────────────────────── */

const DIRECCIONES: Readonly<Record<string, string>> = {
  [rutaDelTablero()]: tableroGlb,
  [`${RUTA_DE_MODELOS}/aventureros/${FICHERO_DE_ANIMACIONES}`]: animacionesGlb,
  [`${RUTA_DE_MODELOS}/aventureros/caballero.glb`]: caballeroGlb,
  [`${RUTA_DE_MODELOS}/aventureros/barbaro.glb`]: barbaroGlb,
  [`${RUTA_DE_MODELOS}/aventureros/maga.glb`]: magaGlb,
  [`${RUTA_DE_MODELOS}/aventureros/exploradora.glb`]: exploradoraGlb,
  [`${RUTA_DE_MODELOS}/aventureros/picaro.glb`]: picaroGlb,
  [`${RUTA_DE_MODELOS}/aventureros/encapuchado.glb`]: encapuchadoGlb,
};

/** Una `traer` de módulo: la caché del cargador va por identidad de la función. */
const traer: Traer = async (ruta) => {
  const direccion = DIRECCIONES[ruta];
  if (direccion === undefined) throw new Error(`el banco no tiene dirección para ${ruta}`);
  const r = await fetch(direccion);
  if (!r.ok) throw new Error(`${direccion} contestó ${String(r.status)}`);
  return r.arrayBuffer();
};

const NOMBRES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena'];

function laDireccion(): { codigo: string; jugadores: number } {
  const p = new URLSearchParams(window.location.search);
  const codigo = (p.get('codigo') ?? 'LINDE').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  const jugadores = Math.max(0, Math.min(5, Number(p.get('jugadores') ?? '3') || 0));
  return { codigo: codigo.length > 0 ? codigo : 'LINDE', jugadores };
}

function Banco(): JSX.Element {
  const inicial = useMemo(laDireccion, []);
  const tema = temaDelMuelle('lindes') as TemaDelMuelle;
  const [cuantos, ponerCuantos] = useState(inicial.jugadores);
  const [medida, ponerMedida] = useState<{ triangulos: number; llamadas: number; ms: number } | null>(null);
  const [fallos, ponerFallos] = useState<readonly string[]>([]);

  const asientos: AsientoEnElMuelle[] = useMemo(() => {
    const salida: AsientoEnElMuelle[] = [];
    for (let i = 0; i < cuantos; i++) {
      salida.push({
        id: `s${String(i)}`,
        nombre: NOMBRES[i] ?? `s${String(i)}`,
        presente: true,
        figura: (FIGURAS[i % FIGURAS.length] as { id: string }).id,
      });
    }
    return salida;
  }, [cuantos]);

  const mesa: MesaEnElMuelle = useMemo(
    () => ({
      codigo: inicial.codigo,
      asientos,
      yo: asientos[0]?.id ?? null,
      empezada: false,
      aforo: { minimo: 2, maximo: 5 },
      tema,
    }),
    [asientos, inicial.codigo, tema],
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#9cc3e4' }}>
      <Canvas
        shadows={false}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ fov: 42, near: 0.5, far: 4000 }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.02;
        }}
      >
        <LindeAlta
          mesa={mesa}
          ventana={{ ancho: window.innerWidth, alto: window.innerHeight, franjaInferior: 0 }}
          traer={traer}
          calidad="plena"
          alMedir={(m) => ponerMedida({ triangulos: m.triangulos, llamadas: m.llamadas, ms: m.ms })}
          alFallar={(motivo) => ponerFallos((antes) => [...antes, motivo])}
        />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          font: '13px system-ui, sans-serif',
          color: '#1b2411',
          background: 'rgba(243, 236, 216, 0.88)',
          padding: '8px 10px',
          borderRadius: 8,
          maxWidth: 620,
        }}
      >
        <strong>La Linde Alta</strong>
        <span>· {tema.lugar}</span>
        <span>· código {inicial.codigo}</span>
        <span>· {cuantos} sentados</span>
        {medida !== null ? (
          <span>
            · {medida.triangulos.toLocaleString('es')} tri, {medida.llamadas} llamadas,{' '}
            {medida.ms.toFixed(1)} ms
          </span>
        ) : null}
        <button type="button" onClick={() => ponerCuantos((n) => Math.max(0, n - 1))}>
          Se levanta uno
        </button>
        <button type="button" onClick={() => ponerCuantos((n) => Math.min(5, n + 1))}>
          Se sienta uno
        </button>
        {fallos.length > 0 ? <span style={{ color: '#8a1d1d' }}>· {fallos.join(' · ')}</span> : null}
      </div>
    </div>
  );
}

/*
 * LA RAÍZ SE GUARDA EN EL PROPIO NODO, igual que en `banco-hoja-burgo.tsx` y por lo que
 * allí está explicado: con `createRoot` a pelo, cada reejecución en caliente crea OTRA raíz
 * sobre el mismo `div` y React llena la consola de avisos. Que no es un fallo del producto
 * da igual: lo que importa es que TAPA el que sí lo sea, y la consola de un banco existe
 * exactamente para eso.
 */
type ConRaiz = HTMLElement & { __raizDeReact?: ReturnType<typeof createRoot> };

const donde = document.getElementById('raiz') as ConRaiz | null;
if (donde !== null) {
  donde.__raizDeReact ??= createRoot(donde);
  donde.__raizDeReact.render(<Banco />);
}
