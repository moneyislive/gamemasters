/**
 * EL BANCO DE LA IMAGEN DEL QUIEBRO: el posproceso y la calidad automática, a la vista y sin servidor.
 *
 * ═══ QUÉ SE JUZGA AQUÍ, Y QUE NINGÚN COMPROBADOR PUEDE JUZGAR ═══
 *
 * `verificar-quiebro-calidad.ts` demuestra que el gobernador decide bien y que la LUT es su fórmula.
 * Lo que no puede decir es si la noche SE VE como tiene que verse: si el brillo de los neones abre
 * sin quemar, si la gradación deja el ámbar y el magenta vivos sobre una ciudad verde-cian apagada,
 * si N0 y N1 parecen el mismo juego, si el Remanso se lee (color fuera, enfoque, viñeta) y si la capa
 * nítida (el anillo ámbar y el contorno del enemigo) sigue igual de legible en todos los niveles.
 * Eso se mira aquí, con una escena de prueba de noche: fachadas con ventanas emisivas, suelo
 * brillante, farolas de sodio, neones de color y figuras de pie.
 *
 * ═══ LOS MANDOS ═══
 *
 *   · Nivel: «Auto» deja al gobernador; N0-N3 lo fuerzan (`usarElNivel({ fijo })`).
 *   · Remanso: el botón dispara uno (sube en 0,12 s, aguanta 0,45 s y se suelta en 0,45 s, como en
 *     el diseño §4.4); la barra lo deja fijo para mirarlo con calma.
 *   · Lastre: un sombreador caro e invisible a pantalla completa, para ver al gobernador BAJAR
 *     (y, al quitarlo, volver a subir a prueba a los 20 s).
 *   · Afinar: el brillo (multiplica la fuerza de los dos brillos), el grano, la viñeta, la LUT y la
 *     aberración, encima de `IMAGEN_DE_LA_NOCHE`, sin rehacer el compositor. Lo que se decida aquí
 *     se escribe DESPUÉS en `IMAGEN_DE_LA_NOCHE` (`compositor.ts`): el banco no guarda nada.
 *   · Arrastrar gira la cámara alrededor de la calle (con ratón o con el dedo).
 *   · Autoprueba: pinta con los cuatro caminos en un lienzo aparte y lee píxeles (`autoprueba.ts`):
 *     errores de WebGL, fotograma negro o congelado, Remanso, capa nítida y cuenta. Es lo primero que
 *     se corre en un aparato nuevo.
 *
 * Y en la URL: `?nivel=auto|0|1|2|3`, `?remanso=0..1`, `?lastre=0..4000`, `?panel=0` (sin panel,
 * para capturas).
 *
 * ═══ POR QUÉ LA ESCENA ES FIJA ═══
 *
 * La ciudad sale de un generador con semilla FIJA (congruencial, sin `Math.random`): comparar dos
 * ejecuciones —antes y después de tocar la gradación— sólo sirve si la escena es la misma.
 *
 * Se abre en http://localhost:5291/sala/banco-quiebro-imagen.html (o el puerto del Vite del escritorio).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, JSX } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { NivelDeCalidad } from '../calidad/niveles';
import { TABLA_DE_NIVELES, comoNivel } from '../calidad/niveles';
import type { ElNivel } from '../calidad/usar-el-nivel';
import { usarElNivel } from '../calidad/usar-el-nivel';
import { dprDe } from '../calidad/gobernador';
import { Posproceso } from './Posproceso';
import type { AjustesDeLaImagen } from './compositor';
import { CAPA_NITIDA, IMAGEN_DE_LA_NOCHE } from './compositor';
import type { CaminoDelPosproceso } from './camino';
import { falloDelTono } from './tono';
import type { ComprobacionDelCamino } from './autoprueba';
import { probarLosCaminos } from './autoprueba';

/* ─────────────────────────────── Lo que dice la URL ─────────────────────────────── */

const PARAMETROS = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const NIVEL_DE_LA_URL: NivelDeCalidad | null = (() => {
  const crudo = PARAMETROS.get('nivel');
  if (crudo === null || crudo === 'auto') return null;
  const n = Number(crudo);
  return Number.isFinite(n) ? comoNivel(n) : null;
})();
const REMANSO_DE_LA_URL = Math.min(1, Math.max(0, Number(PARAMETROS.get('remanso') ?? 0) || 0));
const LASTRE_DE_LA_URL = Math.min(4000, Math.max(0, Number(PARAMETROS.get('lastre') ?? 0) || 0));
const CON_PANEL = PARAMETROS.get('panel') !== '0';

/* ─────────────────────────────── La escena de prueba ─────────────────────────────── */

/** Congruencial de Park-Miller: la misma ciudad en cada carga. */
function generador(semilla: number): () => number {
  let s = semilla % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Color lineal por encima de 1: lo que el brillo tiene que recoger. */
function emisivo(r: number, g: number, b: number, fuerza: number): THREE.Color {
  return new THREE.Color(r * fuerza, g * fuerza, b * fuerza);
}

const AMBAR = emisivo(1, 0.55, 0.12, 4);
const MAGENTA = emisivo(1, 0.08, 0.62, 4);
const CIAN = emisivo(0.12, 0.9, 1, 3);
const VERDE_GRAFIA = emisivo(0.15, 1, 0.6, 3);
/*
 * Lo de la capa nítida va SIN pasar de 1: allí no hay brillo que lo recoja y el ACES que se le aplica
 * lavaría a blanco un color de 3 o 4. Es también el consejo para los efectos del juego.
 */
const AMBAR_NITIDO = new THREE.Color(1, 0.55, 0.12);
const VERDE_NITIDO = new THREE.Color(0.15, 1, 0.6);

/**
 * La rejilla de ventanas: 32×64 téxeles, cada ventana de 2×3 dentro de una celda de 4×4, encendidas
 * según el generador. Se repite por las fachadas con las UV escaladas a metros (una celda = 4 × 3,5 m).
 */
function texturaDeVentanas(): THREE.DataTexture {
  const ancho = 32;
  const alto = 64;
  const datos = new Uint8Array(ancho * alto * 4);
  const azar = generador(1312);
  for (let celdaY = 0; celdaY < alto / 4; celdaY++) {
    for (let celdaX = 0; celdaX < ancho / 4; celdaX++) {
      const tirada = azar();
      const color: [number, number, number] =
        tirada < 0.6 ? [0, 0, 0] : tirada < 0.84 ? [255, 168, 88] : tirada < 0.93 ? [150, 225, 255] : [255, 95, 190];
      const brillo = 0.45 + 0.55 * azar();
      for (let y = 1; y < 4; y++) {
        for (let x = 1; x < 3; x++) {
          const i = ((celdaY * 4 + y) * ancho + celdaX * 4 + x) * 4;
          datos[i] = Math.round(color[0] * brillo);
          datos[i + 1] = Math.round(color[1] * brillo);
          datos[i + 2] = Math.round(color[2] * brillo);
          datos[i + 3] = 255;
        }
      }
    }
  }
  const textura = new THREE.DataTexture(datos, ancho, alto, THREE.RGBAFormat);
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.magFilter = THREE.LinearFilter;
  textura.minFilter = THREE.LinearMipmapLinearFilter;
  textura.generateMipmaps = true;
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.needsUpdate = true;
  return textura;
}

/**
 * Una caja-edificio con las UV en metros: cada cara repite la rejilla según su tamaño, y las tapas
 * (arriba y abajo) leen el téxel (0, 0), que es un marco apagado.
 */
function cajaDeEdificio(ancho: number, alto: number, fondo: number): THREE.BoxGeometry {
  const caja = new THREE.BoxGeometry(ancho, alto, fondo);
  const uv = caja.getAttribute('uv') as THREE.BufferAttribute;
  /* BoxGeometry: +x, −x, +y, −y, +z, −z; cuatro vértices por cara. */
  const medidas: [number, number][] = [
    [fondo, alto],
    [fondo, alto],
    [0, 0],
    [0, 0],
    [ancho, alto],
    [ancho, alto],
  ];
  for (let cara = 0; cara < 6; cara++) {
    const [u, v] = medidas[cara] ?? [0, 0];
    for (let k = 0; k < 4; k++) {
      const i = cara * 4 + k;
      uv.setXY(i, (uv.getX(i) * u) / 4, (uv.getY(i) * v) / 14);
    }
  }
  uv.needsUpdate = true;
  return caja;
}

interface Edificio {
  readonly x: number;
  readonly z: number;
  readonly ancho: number;
  readonly alto: number;
  readonly fondo: number;
}

function calleDePrueba(): readonly Edificio[] {
  const azar = generador(4242);
  const edificios: Edificio[] = [];
  for (const lado of [-1, 1]) {
    let z = -80;
    while (z < 30) {
      const ancho = 7 + azar() * 9;
      const fondo = 8 + azar() * 6;
      const alto = 9 + azar() * 26;
      edificios.push({ x: lado * (9 + fondo / 2), z: z + ancho / 2, ancho: fondo, alto, fondo: ancho });
      z += ancho + 0.4;
    }
  }
  return edificios;
}

function Ciudad(): JSX.Element {
  const ventanas = useMemo(texturaDeVentanas, []);
  const edificios = useMemo(calleDePrueba, []);
  const cajas = useMemo(() => edificios.map((e) => cajaDeEdificio(e.ancho, e.alto, e.fondo)), [edificios]);
  const fachada = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2a3134',
        roughness: 0.82,
        metalness: 0.05,
        emissive: '#ffffff',
        emissiveMap: ventanas,
        emissiveIntensity: 1.25,
      }),
    [ventanas],
  );
  const suelo = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0b0e0f', roughness: 0.14, metalness: 0.0 }), []);
  const acera = useMemo(() => new THREE.MeshStandardMaterial({ color: '#16191a', roughness: 0.5 }), []);
  const poste = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1d2224', roughness: 0.6, metalness: 0.6 }), []);
  const figura = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6a7076', roughness: 0.7 }), []);
  useEffect(
    () => () => {
      ventanas.dispose();
      fachada.dispose();
      suelo.dispose();
      acera.dispose();
      poste.dispose();
      figura.dispose();
      for (const c of cajas) c.dispose();
    },
    [ventanas, fachada, suelo, acera, poste, figura, cajas],
  );

  const farolas = [-44, -28, -12, 4].map((z, i) => ({ x: i % 2 === 0 ? -7.2 : 7.2, z }));
  const neones: { x: number; y: number; z: number; ancho: number; color: THREE.Color; mira: 1 | -1 }[] = [
    { x: -8.85, y: 6.5, z: -18, ancho: 4.5, color: MAGENTA, mira: 1 },
    { x: 8.85, y: 5.2, z: -30, ancho: 3.5, color: CIAN, mira: -1 },
    { x: -8.85, y: 4.4, z: -40, ancho: 3, color: VERDE_GRAFIA, mira: 1 },
    { x: 8.85, y: 7.8, z: -9, ancho: 5, color: AMBAR, mira: -1 },
  ];
  const figuras: [number, number][] = [
    [-3.2, -6],
    [2.4, -9],
    [-5.5, -15],
    [4.8, -21],
    [-1.4, -27],
    [3.6, -34],
  ];

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} material={suelo}>
        <planeGeometry args={[18, 220]} />
      </mesh>
      {[-1, 1].map((lado) => (
        <mesh key={lado} position={[lado * 8, 0.08, -25]} material={acera}>
          <boxGeometry args={[2, 0.16, 220]} />
        </mesh>
      ))}
      {edificios.map((e, i) => (
        <mesh key={i} position={[e.x, e.alto / 2, e.z]} geometry={cajas[i]} material={fachada} />
      ))}
      {farolas.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]}>
          <mesh position={[0, 2.8, 0]} material={poste}>
            <cylinderGeometry args={[0.07, 0.1, 5.6, 8]} />
          </mesh>
          <mesh position={[0, 5.65, 0]}>
            <sphereGeometry args={[0.22, 12, 8]} />
            <meshBasicMaterial color={AMBAR} />
          </mesh>
          <pointLight position={[0, 5.4, 0]} color="#ffae52" intensity={55} distance={26} decay={2} />
        </group>
      ))}
      {neones.map((n, i) => (
        <group key={i}>
          <mesh position={[n.x, n.y, n.z]} rotation-y={(n.mira * Math.PI) / 2}>
            <boxGeometry args={[n.ancho, 0.55, 0.08]} />
            <meshBasicMaterial color={n.color} />
          </mesh>
          <pointLight position={[n.x + n.mira * 1.2, n.y, n.z]} color={n.color.clone().multiplyScalar(0.25)} intensity={18} distance={16} decay={2} />
        </group>
      ))}
      {figuras.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.9, z]} material={figura}>
          <capsuleGeometry args={[0.3, 1.2, 4, 10]} />
        </mesh>
      ))}
      <hemisphereLight args={['#2c6b5c', '#0a0c0c', 1.1]} />
      <directionalLight position={[-20, 40, 10]} intensity={0.35} color="#8fd9c8" />
    </group>
  );
}

/**
 * Lo que va en la capa nítida: un anillo ámbar alrededor del desvelado (el aviso de golpe, que se
 * cierra) y el contorno verde-cian de un enemigo. El contorno es una piel por detrás un poco más
 * gorda, más el cuerpo del enemigo pintado SÓLO en profundidad antes que ella: así se ve el borde y
 * no una silueta rellena, también dentro de la capa nítida (que limpia la profundidad de la escena).
 */
function CapaNitida(): JSX.Element {
  const anillo = useRef<THREE.Mesh>(null);
  const nitidos = useRef<THREE.Group>(null);
  useEffect(() => {
    nitidos.current?.traverse((o) => o.layers.set(CAPA_NITIDA));
  }, []);
  useFrame((estado) => {
    const t = estado.clock.elapsedTime % 1.4;
    const cierre = Math.max(0.35, 1.6 - t);
    anillo.current?.scale.set(cierre, cierre, cierre);
  });
  return (
    <group ref={nitidos}>
      <mesh ref={anillo} position={[0, 0.03, -2]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.9, 1.0, 64]} />
        <meshBasicMaterial color={AMBAR_NITIDO} side={THREE.DoubleSide} fog={false} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <mesh position={[1.6, 0.95, -7]} renderOrder={0}>
        <capsuleGeometry args={[0.32, 1.2, 4, 12]} />
        <meshBasicMaterial colorWrite={false} fog={false} />
      </mesh>
      <mesh position={[1.6, 0.95, -7]} renderOrder={1}>
        <capsuleGeometry args={[0.37, 1.24, 4, 12]} />
        <meshBasicMaterial color={VERDE_NITIDO} side={THREE.BackSide} fog={false} />
      </mesh>
    </group>
  );
}

/** Un enemigo de verdad (en la escena), dentro del contorno de la capa nítida. */
function Enemigo(): JSX.Element {
  return (
    <mesh position={[1.6, 0.95, -7]}>
      <capsuleGeometry args={[0.32, 1.2, 4, 12]} />
      <meshStandardMaterial color="#1f2e2a" roughness={0.6} />
    </mesh>
  );
}

/**
 * EL LASTRE: un triángulo a pantalla completa con un bucle caro y una aportación de color nula. Sólo
 * existe para hacer sudar a la gráfica y ver al gobernador bajar; con 0 vueltas no se monta.
 */
function Lastre({ vueltas }: { vueltas: number }): JSX.Element | null {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uVueltas: { value: 0 } },
        vertexShader: /* glsl */ `
void main() { gl_Position = vec4( position.xy, 0.0, 1.0 ); }`,
        fragmentShader: /* glsl */ `
uniform float uVueltas;
void main() {
	vec2 p = gl_FragCoord.xy * 0.001;
	float a = 0.0;
	for ( int i = 0; i < 4000; i ++ ) {
		if ( float( i ) >= uVueltas ) break;
		a += sin( p.x * float( i ) + a ) * cos( p.y + a );
	}
	gl_FragColor = vec4( vec3( a * 1e-7 ), 0.0 );
}`,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );
  const geometria = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
    return g;
  }, []);
  useEffect(
    () => () => {
      material.dispose();
      geometria.dispose();
    },
    [material, geometria],
  );
  /* Se cambia el VALOR: three guarda referencias a los objetos de uniforme al compilar. */
  (material.uniforms['uVueltas'] as THREE.IUniform<number>).value = vueltas;
  if (vueltas <= 0) return null;
  return <mesh geometry={geometria} material={material} frustumCulled={false} renderOrder={999} />;
}

/** Arrastrar gira la cámara alrededor de la calle. Pointer Events: ratón y dedo por igual. */
function Camara(): null {
  const { camera, gl } = useThree();
  const giro = useRef({ yaw: 0, pitch: 0.12 });
  useEffect(() => {
    const lienzo = gl.domElement;
    lienzo.style.touchAction = 'none';
    let desde: { x: number; y: number } | null = null;
    const baja = (e: PointerEvent): void => {
      desde = { x: e.clientX, y: e.clientY };
      lienzo.setPointerCapture(e.pointerId);
    };
    const mueve = (e: PointerEvent): void => {
      if (desde === null) return;
      giro.current.yaw -= (e.clientX - desde.x) * 0.005;
      giro.current.pitch = Math.min(0.9, Math.max(-0.15, giro.current.pitch + (e.clientY - desde.y) * 0.004));
      desde = { x: e.clientX, y: e.clientY };
    };
    const suelta = (): void => {
      desde = null;
    };
    lienzo.addEventListener('pointerdown', baja);
    lienzo.addEventListener('pointermove', mueve);
    lienzo.addEventListener('pointerup', suelta);
    lienzo.addEventListener('pointercancel', suelta);
    return () => {
      lienzo.removeEventListener('pointerdown', baja);
      lienzo.removeEventListener('pointermove', mueve);
      lienzo.removeEventListener('pointerup', suelta);
      lienzo.removeEventListener('pointercancel', suelta);
    };
  }, [gl]);
  const objetivo = useMemo(() => new THREE.Vector3(0, 1.3, -6), []);
  useFrame(() => {
    const { yaw, pitch } = giro.current;
    const distancia = 6.5;
    camera.position.set(
      objetivo.x + Math.sin(yaw) * Math.cos(pitch) * distancia,
      objetivo.y + 0.5 + Math.sin(pitch) * distancia,
      objetivo.z + Math.cos(yaw) * Math.cos(pitch) * distancia,
    );
    camera.lookAt(objetivo);
  }, -2);
  return null;
}

/* ─────────────────────────────── El mando y el informe ─────────────────────────────── */

interface Informe {
  readonly nivel: NivelDeCalidad;
  readonly calidad: string;
  readonly dpr: number;
  readonly camino: CaminoDelPosproceso | null;
  readonly aviso: string | null;
  readonly msMedia: number;
  readonly llamadasDeLaEscena: number;
  readonly triangulosDeLaEscena: number;
  readonly llamadas: number;
  readonly triangulos: number;
  readonly gobernador: string;
  readonly capacidades: ElNivel['capacidades'];
  readonly sondeo: ElNivel['sondeo'];
}

/** La duración del Remanso visual (diseño §4.4): sube, aguanta y se suelta. */
const SUBIDA_S = 0.12;
const AGUANTE_S = 0.45;
const BAJADA_S = 0.45;

function remansoEn(t: number): number {
  if (t < 0) return 0;
  if (t < SUBIDA_S) return t / SUBIDA_S;
  if (t < SUBIDA_S + AGUANTE_S) return 1;
  const r = 1 - (t - SUBIDA_S - AGUANTE_S) / BAJADA_S;
  return Math.max(0, r);
}

function Mando(props: {
  readonly fijo: NivelDeCalidad | null;
  readonly remansoFijo: number;
  readonly disparo: number;
  readonly lastre: number;
  readonly ajustes: Partial<AjustesDeLaImagen>;
  readonly alInformar: (informe: Informe) => void;
}): JSX.Element {
  const elNivel = usarElNivel({ fijo: props.fijo, recordar: false });
  const remanso = useRef(0);
  const disparadoEn = useRef<number | null>(null);
  const camino = useRef<{ camino: CaminoDelPosproceso | null; aviso: string | null }>({ camino: null, aviso: null });
  const tiempos = useRef<number[]>([]);
  const ultimoInforme = useRef(0);
  const disparoVisto = useRef(props.disparo);

  const alAvisar = useCallback((c: CaminoDelPosproceso, aviso: string | null) => {
    camino.current = { camino: c, aviso };
  }, []);

  useFrame((estado, delta) => {
    if (disparoVisto.current !== props.disparo) {
      disparoVisto.current = props.disparo;
      disparadoEn.current = estado.clock.elapsedTime;
    }
    const t = disparadoEn.current === null ? -1 : estado.clock.elapsedTime - disparadoEn.current;
    remanso.current = Math.max(props.remansoFijo, remansoEn(t));

    const tiemposAhora = tiempos.current;
    tiemposAhora.push(delta * 1000);
    if (tiemposAhora.length > 60) tiemposAhora.shift();
    if (estado.clock.elapsedTime - ultimoInforme.current < 0.25) return;
    ultimoInforme.current = estado.clock.elapsedTime;
    const g = elNivel.gobernador.current;
    const u = elNivel.ultimo.current;
    props.alInformar({
      nivel: elNivel.nivel,
      calidad: elNivel.calidad,
      dpr: props.fijo === null ? dprDe(g) : elNivel.dpr,
      camino: camino.current.camino,
      aviso: camino.current.aviso ?? falloDelTono(),
      msMedia: tiemposAhora.reduce((a, b) => a + b, 0) / Math.max(1, tiemposAhora.length),
      llamadasDeLaEscena: u.llamadasDeLaEscena,
      triangulosDeLaEscena: u.triangulosDeLaEscena,
      llamadas: u.llamadas,
      triangulos: u.triangulos,
      gobernador:
        props.fijo !== null
          ? 'callado (nivel forzado)'
          : `${g.aPrueba ? `a prueba ${(g.pruebaMs / 1000).toFixed(1)} s · ` : ''}holgura ${(g.holguraMs / 1000).toFixed(1)} s · ` +
            `última ventana ${g.ultimaMediaMs === null ? '—' : `${g.ultimaMediaMs.toFixed(1)} ms`}${g.ultimaSobreElTope ? ' (SOBRE EL TOPE)' : ''}` +
            `${g.fallidos.length > 0 ? ` · fallidos: ${g.fallidos.map((n) => `N${String(n)}`).join(', ')}` : ''}`,
      capacidades: elNivel.capacidades,
      sondeo: elNivel.sondeo,
    });
  });

  return (
    <>
      <Posproceso nivel={elNivel.nivel} capacidades={elNivel.capacidades} remanso={remanso} ajustes={props.ajustes} alAvisar={alAvisar} />
      <Lastre vueltas={props.lastre} />
    </>
  );
}

/* ─────────────────────────────── La página ─────────────────────────────── */

const ESTILO_PANEL: CSSProperties = {
  position: 'fixed',
  top: 8,
  left: 8,
  maxWidth: 'min(420px, calc(100vw - 16px))',
  maxHeight: 'calc(100vh - 16px)',
  overflowY: 'auto',
  padding: '10px 12px',
  background: 'rgba(4, 12, 10, 0.82)',
  color: '#cfe9e0',
  font: '12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  borderRadius: 8,
  border: '1px solid rgba(80, 200, 170, 0.25)',
  boxSizing: 'border-box',
};

function Boton(props: { readonly activo: boolean; readonly alPulsar: () => void; readonly children: string }): JSX.Element {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        props.alPulsar();
      }}
      style={{
        font: 'inherit',
        padding: '4px 9px',
        marginRight: 4,
        marginBottom: 4,
        borderRadius: 5,
        border: '1px solid rgba(80, 200, 170, 0.45)',
        background: props.activo ? '#ffae52' : 'transparent',
        color: props.activo ? '#140c02' : '#cfe9e0',
        cursor: 'pointer',
      }}
    >
      {props.children}
    </button>
  );
}

function Banco(): JSX.Element {
  const [fijo, setFijo] = useState<NivelDeCalidad | null>(NIVEL_DE_LA_URL);
  const [remansoFijo, setRemansoFijo] = useState(REMANSO_DE_LA_URL);
  const [lastre, setLastre] = useState(LASTRE_DE_LA_URL);
  const [disparo, setDisparo] = useState(0);
  const [abierto, setAbierto] = useState(CON_PANEL);
  const [informe, setInforme] = useState<Informe | null>(null);
  const [autoprueba, setAutoprueba] = useState<readonly ComprobacionDelCamino[] | string | null>(null);
  const correrLaAutoprueba = (): void => {
    try {
      setAutoprueba(probarLosCaminos());
    } catch (e) {
      setAutoprueba(`la autoprueba reventó: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const [afinado, setAfinado] = useState({
    brillo: Number(PARAMETROS.get('brillo') ?? 1) || 1,
    grano: IMAGEN_DE_LA_NOCHE.grano,
    vineta: IMAGEN_DE_LA_NOCHE.vineta,
    lut: IMAGEN_DE_LA_NOCHE.fuerzaDeLaLut,
    aberracion: IMAGEN_DE_LA_NOCHE.aberracion,
  });
  const ajustes = useMemo<Partial<AjustesDeLaImagen>>(
    () => ({
      brillo: { ...IMAGEN_DE_LA_NOCHE.brillo, fuerza: IMAGEN_DE_LA_NOCHE.brillo.fuerza * afinado.brillo },
      brilloBarato: { ...IMAGEN_DE_LA_NOCHE.brilloBarato, fuerza: IMAGEN_DE_LA_NOCHE.brilloBarato.fuerza * afinado.brillo },
      grano: afinado.grano,
      vineta: afinado.vineta,
      fuerzaDeLaLut: afinado.lut,
      aberracion: afinado.aberracion,
    }),
    [afinado],
  );
  const barra = (que: keyof typeof afinado, max: number, paso: number): JSX.Element => (
    <label style={{ display: 'inline-block', marginRight: 10 }}>
      {`${que} `}
      <input
        type="range"
        min={0}
        max={max}
        step={paso}
        value={afinado[que]}
        onChange={(e) => {
          const v = Number(e.target.value);
          setAfinado((a) => ({ ...a, [que]: v }));
        }}
        style={{ verticalAlign: 'middle', width: 90 }}
      />
      {` ${afinado[que].toFixed(que === 'aberracion' ? 4 : 2)}`}
    </label>
  );

  const s = informe?.capacidades;
  return (
    <>
      <Canvas
        style={{ position: 'fixed', inset: 0, background: '#020605' }}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 70, near: 0.1, far: 400, position: [0, 2, 1] }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color('#020605');
          scene.fog = new THREE.FogExp2('#06120f', 0.028);
        }}
      >
        <Ciudad />
        <Enemigo />
        <CapaNitida />
        <Camara />
        <Mando fijo={fijo} remansoFijo={remansoFijo} disparo={disparo} lastre={lastre} ajustes={ajustes} alInformar={setInforme} />
      </Canvas>
      {abierto ? (
        <div style={ESTILO_PANEL}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <strong style={{ color: '#ffae52' }}>El Quiebro · imagen</strong>
            <Boton activo={false} alPulsar={() => setAbierto(false)}>
              ocultar
            </Boton>
          </div>
          <div>
            <Boton activo={fijo === null} alPulsar={() => setFijo(null)}>
              Auto
            </Boton>
            {([0, 1, 2, 3] as const).map((n) => (
              <Boton key={n} activo={fijo === n} alPulsar={() => setFijo(n)}>
                {`N${String(n)}`}
              </Boton>
            ))}
          </div>
          <div style={{ marginTop: 4 }}>
            <Boton activo={false} alPulsar={() => setDisparo((d) => d + 1)}>
              Remanso
            </Boton>
            <Boton activo={false} alPulsar={correrLaAutoprueba}>
              autoprueba
            </Boton>
            <label>
              {' fijo '}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={remansoFijo}
                onChange={(e) => setRemansoFijo(Number(e.target.value))}
                style={{ verticalAlign: 'middle', width: 110 }}
              />
              {` ${remansoFijo.toFixed(2)}`}
            </label>
          </div>
          <div style={{ marginTop: 4 }}>
            <label>
              {'lastre '}
              <input
                type="range"
                min={0}
                max={4000}
                step={50}
                value={lastre}
                onChange={(e) => setLastre(Number(e.target.value))}
                style={{ verticalAlign: 'middle', width: 150 }}
              />
              {` ${String(lastre)}`}
            </label>
          </div>
          <div style={{ marginTop: 4 }}>
            {barra('brillo', 4, 0.05)}
            {barra('grano', 0.15, 0.005)}
            {barra('vineta', 1, 0.02)}
            {barra('lut', 1, 0.05)}
            {barra('aberracion', 0.01, 0.0005)}
          </div>
          {autoprueba === null ? null : typeof autoprueba === 'string' ? (
            <div style={{ color: '#ff7a9a' }}>{autoprueba}</div>
          ) : (
            <div style={{ marginTop: 4 }}>
              <b style={{ color: autoprueba.every((f) => f.bien) ? '#7dffb0' : '#ff7a9a' }}>
                autoprueba: {String(autoprueba.filter((f) => f.bien).length)} de {String(autoprueba.length)} en verde
              </b>
              {autoprueba
                .filter((f) => !f.bien)
                .map((f) => (
                  <div key={`${String(f.nivel)}-${f.que}`} style={{ color: '#ff7a9a' }}>
                    ✗ N{String(f.nivel)} {f.que} {f.detalle}
                  </div>
                ))}
            </div>
          )}
          {informe === null ? (
            <div>midiendo…</div>
          ) : (
            <div style={{ marginTop: 6 }}>
              <div>
                <b>{TABLA_DE_NIVELES[informe.nivel].nombre}</b> ({TABLA_DE_NIVELES[informe.nivel].para}) · {informe.calidad} · DPR{' '}
                {informe.dpr.toFixed(2)} · camino {informe.camino ?? '—'}
              </div>
              {informe.aviso === null ? null : <div style={{ color: '#ff7a9a' }}>⚠ {informe.aviso}</div>}
              <div>
                {informe.msMedia.toFixed(1)} ms · escena {String(informe.llamadasDeLaEscena)} llamadas /{' '}
                {informe.triangulosDeLaEscena.toLocaleString('es')} tri · total {String(informe.llamadas)} /{' '}
                {informe.triangulos.toLocaleString('es')}
              </div>
              <div>
                topes {TABLA_DE_NIVELES[informe.nivel].nombre}: {String(TABLA_DE_NIVELES[informe.nivel].topes.llamadas)} /{' '}
                {TABLA_DE_NIVELES[informe.nivel].topes.triangulos.toLocaleString('es')}
              </div>
              <div>gobernador: {informe.gobernador}</div>
              <div style={{ marginTop: 6, color: '#8fd9c8' }}>
                sondeo: arranque N{String(informe.sondeo.inicial)}, techo N{String(informe.sondeo.techo)}
              </div>
              <ul style={{ margin: '2px 0 0 16px', padding: 0 }}>
                {informe.sondeo.porque.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              {s === undefined ? null : (
                <div style={{ marginTop: 6, color: '#9fb8b0' }}>
                  HalfFloat creado: {s.mediaFlotante ? 'sí' : 'NO'} · flotante en vértices: {s.flotanteEnVertices ? 'sí' : 'NO'} · multi_draw:{' '}
                  {s.multiDibujo ? 'sí' : 'no'} · textura máx {String(s.texturaMaxima)} · MSAA {String(s.muestrasMaximas)} · cronómetro de
                  GPU {s.cronometroDeGpu ? 'sí' : 'no'}
                  <br />
                  gráfica: {s.grafica === '' ? '(no la dice)' : s.grafica}
                  <br />
                  núcleos {s.nucleos === null ? '?' : String(s.nucleos)} · memoria {s.memoriaGb === null ? '?' : `${String(s.memoriaGb)} GB`} ·
                  pantalla {String(s.pantalla.ancho)}×{String(s.pantalla.alto)} @{String(s.pantalla.dpr)} · {s.tactil ? 'táctil' : 'ratón'}
                  {s.fallo === null ? null : <div style={{ color: '#ff7a9a' }}>fallo del sondeo: {s.fallo}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ position: 'fixed', top: 8, left: 8 }}>
          <Boton activo={false} alPulsar={() => setAbierto(true)}>
            panel
          </Boton>
        </div>
      )}
    </>
  );
}

const raiz = document.getElementById('raiz');
if (raiz !== null) createRoot(raiz).render(<Banco />);
