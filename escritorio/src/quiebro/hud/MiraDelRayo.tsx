/**
 * LA MIRA DEL RAYO (`docs/quiebro/EL-RAYO.md` §1.1 y §3): tres marcas que cercan al blanco mientras se carga.
 *
 * ═══ LO QUE ES, Y LO QUE NO ═══
 *
 * TRES MARCAS a 120° que apuntan hacia dentro —un chevrón fino cada una, blanco cálido con filo ámbar y un halo
 * difuminado de verdad (un desenfoque, no un trazo ancho)—, un ARCO fino de progreso partido en tres (entre marca y
 * marca, así que nunca cierra un círculo) y nada más. Nada de retícula de arma, ni cruz, ni círculo de mira
 * telescópica: el zoom de la cámara ya dice «apunta», y lo que se enseña es el ÁREA de verdad.
 *
 *   · DÓNDE: sobre el pecho del blanco enganchado, o sobre lo que toca la línea de la mira sin él (`partida.rayo`,
 *     que la partida apunta con la cámara de cada fotograma).
 *   · CUÁNTO ABREN: el radio del área del nivel que saldría AHORA, proyectado a la distancia del blanco (entre
 *     10 y 90 px): se CIERRAN con la carga, a saltos de nivel, con un muelle que se pasa un poco (se nota el
 *     escalón).
 *   · EL ARCO va por fuera de las marcas sólo mientras están ABIERTAS: por debajo de 30 px de radio se apaga, y
 *     a 18 ya no está. Cerradas, un arco alrededor sería justo lo prohibido: un aro con algo dentro.
 *   · EN EL PLENO, que es una línea sin área, las marcas SE JUNTAN EN UN PUNTO: bajan del radio mínimo hacia el
 *     del pleno encogiendo, se funden (su luz baja) y en su sitio queda un punto de luz, que late (el pulso).
 *   · AL FIJAR un blanco nuevo, se TENSAN: un salto de escala que vuelve en 140 ms y más brillo (el «tic» suena
 *     en los efectos, `actualizarCarga`).
 *   · AL SOLTAR se cierran de golpe en el punto y se apagan (el disparo); al CANCELAR se abren y se apagan (nada
 *     salió).
 *
 * Lo que se dibuja en cada fotograma lo decide `pasoDeLaMira`, PURA (la prueba `verify:quiebro-juego`): la tensión,
 * el pulso, el cierre, el punto, el arco y los dos finales. El componente sólo lee la partida y la cámara, se lo
 * pasa, y escribe el resultado en el DOM: fuera de React, a sesenta por segundo, como `RotulosDeLaGente` (un
 * `requestAnimationFrame` que proyecta con la cámara del lienzo y mueve con `transform`; sin eventos). En N0, sin
 * halo ni desenfoque (`data-nivel`).
 */
import { useEffect, useRef } from 'react';
import type { JSX, MutableRefObject } from 'react';
import * as THREE from 'three';
import type { Partida } from '../red/partida';

/** El radio de las marcas en pantalla: entre esto y aquello (px), y el del pleno (donde se juntan). */
export const RADIO_MINIMO_PX = 10;
export const RADIO_MAXIMO_PX = 90;
export const RADIO_DEL_PLENO_PX = 3;
/**
 * Lo que el arco de progreso va por fuera de las marcas (px) y lo que abarca cada tramo (grados de 120): 72, así
 * que lleno deja tres huecos de 48° y nunca se lee como un círculo de mira.
 */
const ARCO_POR_FUERA_PX = 13;
export const TRAMO_DEL_ARCO = 72;
/** El arco, entero con las marcas a este radio o más; apagado del todo por debajo de aquel (px). */
export const ARCO_ENTERO_DESDE_PX = 30;
export const ARCO_NINGUNO_BAJO_PX = 18;
/** El punto del pleno: el radio de su núcleo (px). */
export const RADIO_DEL_PUNTO_PX = 2.6;
/** Lo que queda de la luz de las marcas cuando ya se han juntado en el punto. */
const MARCAS_EN_EL_PUNTO = 0.22;
/** La tensión al fijar un blanco: cuánto crece y lo que tarda en volver. */
export const TENSION = 0.2;
export const TENSION_MS = 140;
/** El pulso del pleno: su periodo y cuánto crece. */
export const PULSO_MS = 520;
const PULSO = 0.07;
/** Lo que duran el disparo y la cancelación en la mira. */
export const DISPARO_MS = 170;
export const CANCELAR_MS = 140;
/** El chevrón de cada marca, con el vértice en el centro de la marca (apunta hacia +y, hacia dentro). */
export const CHEVRON = 'M-6 -9.5L0 0L6 -9.5';
/** Dónde va cada marca (grados, 0 arriba y en el sentido del reloj). */
const ANGULOS = [0, 120, 240] as const;
/** El desenfoque del halo (en las unidades de la marca: encoge con ella). */
export const DESENFOQUE_DEL_HALO = 2.2;

/** El radio en px de un área de `metros` a `profundidad` m con una cámara de campo `fovGrados` en `alto` px. */
export function radioDeLaMira(metros: number, profundidad: number, fovGrados: number, alto: number): number {
  if (!(metros > 0)) return RADIO_DEL_PLENO_PX;
  if (!(profundidad > 0.3) || !(fovGrados > 0)) return RADIO_MAXIMO_PX;
  const px = (metros / (profundidad * Math.tan((fovGrados * Math.PI) / 360))) * (alto / 2);
  return Math.max(RADIO_MINIMO_PX, Math.min(RADIO_MAXIMO_PX, px));
}

/** La rigidez y el freno del muelle del radio (ζ ≈ 0,7: rápido, y se pasa un poco, para que el escalón se note). */
const RIGIDEZ = 900;
const FRENO = 42;
/** El paso más largo con que se integra el muelle: con más, un fotograma lento lo haría estallar. */
const PASO_DEL_MUELLE_S = 1 / 120;

/**
 * EL MUELLE DEL RADIO: de `radio` (con `velocidad`) hacia `quiere` en `dt` s, integrado en pasos cortos. Con un
 * paso de 50 ms de golpe (un fotograma lento) el freno se pasaba de frenada (42 × 0,05 > 2) y el radio salía
 * disparado; en pasos de 1/120 s es estable siempre. Puro, para que el comprobador lo mire.
 */
export function muelleDelRadio(radio: number, velocidad: number, quiere: number, dt: number): { radio: number; velocidad: number } {
  if (!Number.isFinite(radio) || !Number.isFinite(velocidad)) return { radio: quiere, velocidad: 0 };
  const pasos = Math.max(1, Math.ceil(Math.max(0, dt) / PASO_DEL_MUELLE_S));
  const h = Math.max(0, dt) / pasos;
  let r = radio;
  let v = velocidad;
  for (let i = 0; i < pasos; i++) {
    v += (RIGIDEZ * (quiere - r) - FRENO * v) * h;
    r += v * h;
  }
  return { radio: r, velocidad: v };
}

/**
 * El tamaño de cada marca con el radio `r` (px): entera desde 18 px; por debajo encoge con él (hasta el 40 %), para
 * que tres chevrones de 9,5 px no se crucen en el centro cuando el área se cierra.
 */
export function escalaDeLaMarca(r: number): number {
  return Math.max(0.4, Math.min(1, r / 18));
}

/** Cuánto se han juntado las marcas en el punto (0 abiertas, 1 en el punto): sólo por debajo del radio mínimo. */
export function cierreDeLaMira(r: number): number {
  return Math.max(0, Math.min(1, (RADIO_MINIMO_PX - r) / (RADIO_MINIMO_PX - RADIO_DEL_PLENO_PX)));
}

/** Lo que se ve del arco de progreso con las marcas a `r` px: entero abiertas, nada cerradas. */
export function luzDelArco(r: number): number {
  return Math.max(0, Math.min(1, (r - ARCO_NINGUNO_BAJO_PX) / (ARCO_ENTERO_DESDE_PX - ARCO_NINGUNO_BAJO_PX)));
}

/** El tramo `k` del arco de progreso (de su marca hacia la siguiente), lleno hasta `c`, con radio `r`. */
export function tramoDelArco(k: number, r: number, c: number): string {
  const lleno = Math.max(0, Math.min(1, c)) * TRAMO_DEL_ARCO;
  if (lleno < 0.5) return '';
  const desde = ((ANGULOS[k % 3] as number) + (120 - TRAMO_DEL_ARCO) / 2 - 90) * (Math.PI / 180);
  const hasta = desde + lleno * (Math.PI / 180);
  const f = (n: number): string => String(Math.round(n * 10) / 10);
  return `M${f(Math.cos(desde) * r)} ${f(Math.sin(desde) * r)}A${f(r)} ${f(r)} 0 0 1 ${f(Math.cos(hasta) * r)} ${f(Math.sin(hasta) * r)}`;
}

function suave(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/** Lo que la mira ve en un fotograma (lo lee el componente de la partida y la cámara). */
export interface VistaDeLaMira {
  /** Se está cargando y hay cámara. */
  readonly activa: boolean;
  /** Lo apuntado cae delante de la cámara (si no, la mira no se pinta ese fotograma). */
  readonly enPantalla: boolean;
  /** Dónde cae en la pantalla (px). */
  readonly x: number;
  readonly y: number;
  /** El radio que pide el área de ahora (`radioDeLaMira`). */
  readonly quiere: number;
  readonly blanco: number;
  readonly c: number;
  /** La hora del último disparo propio, o `null`. */
  readonly disparo: number | null;
}

/** La memoria de la mira entre fotogramas. */
export interface EstadoDeLaMira {
  radio: number;
  velocidad: number;
  blancoAntes: number;
  tensionDesde: number;
  activaAntes: boolean;
  final: { tipo: 'disparo' | 'cancelar'; desde: number; x: number; y: number; r: number } | null;
  disparoVisto: number;
  x: number;
  y: number;
}

export function estadoDeLaMiraNuevo(disparo: number | null): EstadoDeLaMira {
  return {
    radio: RADIO_MAXIMO_PX,
    velocidad: 0,
    blancoAntes: 0,
    tensionDesde: Number.NEGATIVE_INFINITY,
    activaAntes: false,
    final: null,
    disparoVisto: disparo ?? Number.NEGATIVE_INFINITY,
    x: 0,
    y: 0,
  };
}

/** Lo que se pinta en un fotograma. */
export interface DibujoDeLaMira {
  x: number;
  y: number;
  opacidad: number;
  /** La escala de toda la mira (la tensión y el pulso). */
  escala: number;
  /** 0..1: el brillo del halo (blanco fijado, pleno, disparo). */
  brillo: number;
  /** El radio del vértice de las marcas (px) y el tamaño de cada una. */
  radio: number;
  tamano: number;
  /** La luz de las marcas (bajan al fundirse en el punto) y la del punto del pleno. */
  marcas: number;
  punto: number;
  /** La luz del arco y su radio (px); `c`, lo lleno. */
  arco: number;
  radioDelArco: number;
  c: number;
}

/**
 * UN FOTOGRAMA DE LA MIRA: de lo que ve (`v`) y lo que recuerda (`e`, que actualiza), lo que se pinta, o `null` si
 * no se ve. Puro salvo por `e`: la tensión al cambiar de blanco, el pulso del pleno, el muelle del radio, el punto
 * y el arco según el radio, y los dos finales (disparo o cancelación) al dejar de cargar.
 */
export function pasoDeLaMira(e: EstadoDeLaMira, v: VistaDeLaMira, ahora: number, dt: number): DibujoDeLaMira | null {
  if (e.activaAntes && !v.activa) {
    const disparada = v.disparo !== null && v.disparo !== e.disparoVisto;
    e.final = { tipo: disparada ? 'disparo' : 'cancelar', desde: ahora, x: e.x, y: e.y, r: e.radio };
  }
  if (v.disparo !== null) e.disparoVisto = v.disparo;
  e.activaAntes = v.activa;

  let opacidad = 1;
  let escala = 1;
  let r: number;
  let c = 0;
  let brillo = 0;
  let pulso = 0;
  if (v.activa) {
    e.final = null;
    const muelle = muelleDelRadio(e.radio, e.velocidad, v.quiere, dt);
    e.radio = muelle.radio;
    e.velocidad = muelle.velocidad;
    r = Math.max(RADIO_DEL_PLENO_PX * 0.5, e.radio);
    c = v.c;
    if (v.enPantalla) {
      e.x = v.x;
      e.y = v.y;
    }
    if (v.blanco !== 0 && v.blanco !== e.blancoAntes) e.tensionDesde = ahora;
    e.blancoAntes = v.blanco;
    const k = (ahora - e.tensionDesde) / TENSION_MS;
    const tension = k >= 0 && k < 1 ? (1 - k) * (1 - k) : 0;
    escala *= 1 + TENSION * tension;
    brillo = Math.max(tension, v.blanco !== 0 ? 0.35 : 0);
    if (c >= 1) {
      pulso = 0.5 + 0.5 * Math.sin((ahora / PULSO_MS) * Math.PI * 2);
      escala *= 1 + PULSO * pulso;
      brillo = Math.max(brillo, 0.6 + 0.4 * pulso);
    }
    if (!v.enPantalla) opacidad = 0;
  } else if (e.final !== null) {
    const f = e.final;
    const t = ahora - f.desde;
    e.x = f.x;
    e.y = f.y;
    if (f.tipo === 'disparo') {
      const k = suave(t / DISPARO_MS);
      r = f.r * (1 - k) + 1 * k;
      c = 1;
      brillo = 1;
      /* El punto en que se cierran, a toda luz: es el destello del disparo en la mira. */
      pulso = 1;
      opacidad = 1 - suave((t - DISPARO_MS * 0.4) / (DISPARO_MS * 0.6));
      if (t >= DISPARO_MS) e.final = null;
    } else {
      const k = suave(t / CANCELAR_MS);
      r = f.r + 16 * k;
      opacidad = 1 - k;
      if (t >= CANCELAR_MS) e.final = null;
    }
    e.radio = RADIO_MAXIMO_PX;
    e.velocidad = 0;
    e.blancoAntes = 0;
  } else {
    e.radio = RADIO_MAXIMO_PX;
    e.velocidad = 0;
    e.blancoAntes = 0;
    return null;
  }
  if (opacidad <= 0.01) return null;
  /* Cerradas, las marcas encogen con el radio y, por debajo del mínimo, se funden en el punto del pleno. */
  const tamano = escalaDeLaMarca(r);
  const cierre = cierreDeLaMira(r);
  return {
    x: e.x,
    y: e.y,
    opacidad,
    escala,
    brillo,
    radio: r,
    tamano,
    marcas: 1 - (1 - MARCAS_EN_EL_PUNTO) * cierre,
    punto: cierre * (0.75 + 0.25 * pulso),
    arco: luzDelArco(r),
    radioDelArco: r + ARCO_POR_FUERA_PX * tamano,
    c,
  };
}

const redondo = (n: number, en = 10): string => String(Math.round(n * en) / en);

export function MiraDelRayo({ partida, ojo }: { readonly partida: Partida | null; readonly ojo: MutableRefObject<THREE.Camera | null> }): JSX.Element {
  const raiz = useRef<HTMLDivElement>(null);
  const marcas = useRef<(SVGGElement | null)[]>([]);
  const arcos = useRef<(SVGPathElement | null)[]>([]);
  const grupoDeArcos = useRef<SVGGElement>(null);
  const grupoDeMarcas = useRef<SVGGElement>(null);
  const punto = useRef<SVGGElement>(null);

  useEffect(() => {
    let vivo = true;
    let pedido = 0;
    const lugar = new THREE.Vector3();
    const delante = new THREE.Vector3();
    const hasta = new THREE.Vector3();
    const estado = estadoDeLaMiraNuevo(partida?.ultimoDisparo?.t ?? null);
    let antes = performance.now();
    let escrito = '';
    const pintar = (): void => {
      if (!vivo) return;
      pedido = requestAnimationFrame(pintar);
      const caja = raiz.current;
      const camara = ojo.current;
      const ahora = performance.now();
      const dt = Math.min(0.05, Math.max(0, (ahora - antes) / 1000));
      antes = ahora;
      if (caja === null) return;
      const rayo = partida?.rayo ?? null;
      const activa = rayo !== null && rayo.activo && camara !== null;
      let enPantalla = false;
      let x = 0;
      let y = 0;
      let quiere = RADIO_MAXIMO_PX;
      if (activa && camara !== null) {
        /* La pantalla es la del HUD (el padre), no la caja de la mira, que mide lo que su dibujo. */
        const pantalla = caja.parentElement;
        const ancho = pantalla?.clientWidth ?? window.innerWidth;
        const alto = pantalla?.clientHeight ?? window.innerHeight;
        const quien = rayo.blanco === 0 ? null : (partida?.pintadoDe(rayo.blanco) ?? null);
        if (quien !== null) lugar.set(quien.x, rayo.apuntado.y, quien.z);
        else lugar.set(rayo.apuntado.x, rayo.apuntado.y, rayo.apuntado.z);
        camara.getWorldDirection(delante);
        const profundidad = hasta.copy(lugar).sub(camara.position).dot(delante);
        lugar.project(camara);
        enPantalla = !(lugar.z > 1 || lugar.z < -1 || profundidad <= 0.3);
        x = (lugar.x * 0.5 + 0.5) * ancho;
        y = (0.5 - lugar.y * 0.5) * alto;
        const fov = camara instanceof THREE.PerspectiveCamera ? camara.fov : 70;
        quiere = radioDeLaMira(rayo.area, profundidad, fov, alto);
      }
      const d = pasoDeLaMira(
        estado,
        { activa, enPantalla, x, y, quiere, blanco: rayo?.blanco ?? 0, c: rayo?.c ?? 0, disparo: partida?.ultimoDisparo?.t ?? null },
        ahora,
        dt,
      );
      if (d === null) {
        if (escrito !== 'fuera') {
          caja.style.opacity = '0';
          escrito = 'fuera';
        }
        return;
      }
      escrito = 'dentro';
      caja.style.opacity = redondo(d.opacidad, 100);
      caja.style.transform = `translate(${redondo(d.x)}px, ${redondo(d.y)}px) scale(${redondo(d.escala, 1000)})`;
      caja.style.setProperty('--q-mira-brillo', redondo(d.brillo, 100));
      const rMarca = Math.round(d.radio * 10) / 10;
      const tamano = redondo(d.tamano, 1000);
      for (let k = 0; k < 3; k++) {
        marcas.current[k]?.setAttribute('transform', `rotate(${String(ANGULOS[k])}) translate(0 ${String(-rMarca)}) scale(${tamano})`);
        arcos.current[k]?.setAttribute('d', d.arco > 0 ? tramoDelArco(k, d.radioDelArco, d.c) : '');
      }
      grupoDeMarcas.current?.setAttribute('opacity', redondo(d.marcas, 100));
      grupoDeArcos.current?.setAttribute('opacity', redondo(d.arco, 100));
      punto.current?.setAttribute('opacity', redondo(d.punto, 100));
    };
    pedido = requestAnimationFrame(pintar);
    return () => {
      vivo = false;
      cancelAnimationFrame(pedido);
    };
  }, [partida, ojo]);

  return (
    <div ref={raiz} className="q-mira" aria-hidden="true">
      <svg viewBox="-130 -130 260 260" width="260" height="260">
        <defs>
          {/* El halo: la marca, ancha y desenfocada (un resplandor, no un contorno). En la caja de la marca, que encoge con ella. */}
          <filter id="q-mira-difuso" filterUnits="userSpaceOnUse" x="-20" y="-24" width="40" height="40">
            <feGaussianBlur stdDeviation={DESENFOQUE_DEL_HALO} />
          </filter>
          <filter id="q-mira-difuso-punto" filterUnits="userSpaceOnUse" x="-14" y="-14" width="28" height="28">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
        </defs>
        <g ref={grupoDeArcos} className="arcos" opacity="1">
          {[0, 1, 2].map((k) => (
            <path
              key={`a${String(k)}`}
              className="carga"
              d=""
              ref={(el) => {
                arcos.current[k] = el;
              }}
            />
          ))}
        </g>
        <g ref={grupoDeMarcas} className="marcas" opacity="1">
          {[0, 1, 2].map((k) => (
            <g
              key={`m${String(k)}`}
              className="marca"
              transform={`rotate(${String(ANGULOS[k])}) translate(0 ${String(-RADIO_MAXIMO_PX)})`}
              ref={(el) => {
                marcas.current[k] = el;
              }}
            >
              <path className="halo" d={CHEVRON} filter="url(#q-mira-difuso)" />
              <path className="filo" d={CHEVRON} />
              <path className="nucleo" d={CHEVRON} />
            </g>
          ))}
        </g>
        {/* El punto del pleno: donde se juntan las marcas (relleno, sin trazo: una luz, no un aro). */}
        <g ref={punto} className="punto" opacity="0">
          <path className="halo" d={puntoDeRadio(RADIO_DEL_PUNTO_PX * 2.4)} filter="url(#q-mira-difuso-punto)" />
          <path className="nucleo" d={puntoDeRadio(RADIO_DEL_PUNTO_PX)} />
        </g>
      </svg>
    </div>
  );
}

/** Un punto relleno de radio `r` como trayecto (dos medias vueltas). */
export function puntoDeRadio(r: number): string {
  return `M0 ${String(-r)}A${String(r)} ${String(r)} 0 1 1 0 ${String(r)}A${String(r)} ${String(r)} 0 1 1 0 ${String(-r)}Z`;
}
