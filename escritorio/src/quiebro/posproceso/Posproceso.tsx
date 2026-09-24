/**
 * `<Posproceso nivel remanso />`: el componente r3f que se queda con el pintado del lienzo.
 *
 * ═══ CÓMO SE USA ═══
 *
 *     const { nivel, capacidades } = usarElNivel();
 *     <Posproceso nivel={nivel} capacidades={capacidades} remanso={refDelRemanso} />
 *
 * Va DENTRO del `<Canvas>`, una sola vez. Con él montado, r3f deja de pintar por su cuenta (su
 * `useFrame` tiene prioridad 1, y cualquier prioridad positiva le quita el pintado a r3f): pinta el
 * compositor del nivel (`compositor.ts`), con la escena y la cámara por defecto del lienzo. Todo lo
 * que otras piezas hagan en sus `useFrame` de prioridad 0 o negativa corre ANTES, como siempre.
 * Nadie más debe pintar con prioridad positiva en el mismo lienzo (un `Hud` de drei, por ejemplo):
 * serían dos pintores sobre el mismo fotograma.
 *
 * ═══ EL REMANSO SE ANIMA SIN REPINTAR REACT ═══
 *
 * `remanso` (y `foco`) aceptan un número o una referencia `{ current }`. El Remanso dura un segundo
 * y sube y baja en cada fotograma: pasarlo como estado de React repintaría el árbol sesenta veces
 * por segundo. Con una referencia, quien lo anima (los efectos, el juego) escribe `current` en su
 * `useFrame` y aquí se lee en el mismo fotograma.
 *
 * ═══ CAMBIAR DE NIVEL ═══
 *
 * Un nivel nuevo rehace el compositor: se suelta el viejo (blancos, materiales, la LUT; y el mapeo
 * tonal del renderizador vuelve a como estaba) y se crea el nuevo. Cuesta compilar sus sombreadores,
 * que es por lo que el gobernador da gracia tras cada cambio. Al desmontar se suelta todo y el
 * renderizador queda como lo encontró. Los `ajustes` NO rehacen nada: se leen en cada fotograma.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { NivelDeCalidad } from '../calidad/niveles';
import type { CapacidadesDelAparato } from '../calidad/capacidades';
import { sondearElAparato } from '../calidad/sondeo';
import type { AjustesDeLaImagen, Compositor } from './compositor';
import { IMAGEN_DE_LA_NOCHE, crearElCompositor } from './compositor';
import type { CaminoDelPosproceso } from './camino';
import { apuntarEnLaLupa, camaraDeLaLupa } from './lupa';
import { UNIFORMES_DE_LA_LUZ } from '../atmosfera/paleta';

/**
 * EL UMBRAL DEL BRILLO SUBE CON EL ALBA. De madrugada lo único que pasa de 1 son las farolas, los
 * neones y las ventanas, y es lo que tiene que brillar. Al alba, el cielo cubierto ES lo más claro de
 * la imagen y pasa de 1: con el umbral de la noche brillaba el cielo entero y su velo levantaba los
 * negros de toda la imagen (la plaza de N3 no bajaba de 64 sobre 255, la de N0, sin brillo, de 13).
 * El umbral sube con la claridad de la luz del barrio (`uClaridad`: 0 de madrugada, 0,7-1 al alba).
 */
function conLaLuz(base: AjustesDeLaImagen, claridad: number): AjustesDeLaImagen {
  if (claridad <= 0) return base;
  return {
    ...base,
    brillo: { ...base.brillo, umbral: base.brillo.umbral + 1.6 * claridad },
    brilloBarato: { ...base.brilloBarato, umbral: Math.min(0.94, base.brilloBarato.umbral + 0.32 * claridad) },
  };
}

/** Un número, o una referencia que se lee en cada fotograma. */
export type NumeroVivo = number | { readonly current: number };

export interface PropsDelPosproceso {
  readonly nivel: NivelDeCalidad;
  /** 0..1: 0 fuera del Remanso, 1 en su pico. */
  readonly remanso?: NumeroVivo;
  /** Distancia del foco en metros, para el enfoque con profundidad de N3 (por omisión 4,5 m). */
  readonly foco?: NumeroVivo;
  /** Lo que dijo el sondeo; si no se da, se sondea aquí (con la misma caché: no se repite). */
  readonly capacidades?: CapacidadesDelAparato;
  /** Pintar la capa nítida al final (por omisión, sí). */
  readonly capaNitida?: boolean;
  /** Retoques del aspecto, encima de `IMAGEN_DE_LA_NOCHE`. */
  readonly ajustes?: Partial<AjustesDeLaImagen>;
  /** Cada vez que el camino o su aviso cambian (el banco lo enseña). */
  readonly alAvisar?: (camino: CaminoDelPosproceso, aviso: string | null) => void;
}

/** Por omisión, a qué distancia está lo que importa con la cámara al hombro (3,2 m detrás + el blanco). */
const FOCO_POR_OMISION = 4.5;

function leerNumero(n: NumeroVivo | undefined, porOmision: number): number {
  if (n === undefined) return porOmision;
  const valor = typeof n === 'number' ? n : n.current;
  return Number.isFinite(valor) ? valor : porOmision;
}

export function Posproceso(props: PropsDelPosproceso): null {
  const gl = useThree((s) => s.gl);
  const escenaViva = useThree((s) => s.scene);
  const camaraViva = useThree((s) => s.camera);
  const capacidades = useMemo(() => props.capacidades ?? sondearElAparato(gl), [props.capacidades, gl]);
  const compositor = useRef<Compositor | null>(null);
  const semilla = useRef(0);
  const conClaridad = useRef<{ base: AjustesDeLaImagen | null; claridad: number; ajustes: AjustesDeLaImagen }>({ base: null, claridad: -1, ajustes: IMAGEN_DE_LA_NOCHE });
  const dicho = useRef<{ camino: CaminoDelPosproceso; aviso: string | null } | null>(null);

  useEffect(() => {
    const nuevo = crearElCompositor(gl, props.nivel, capacidades);
    compositor.current = nuevo;
    dicho.current = null;
    return () => {
      if (compositor.current === nuevo) compositor.current = null;
      nuevo.liberar();
    };
  }, [gl, props.nivel, capacidades]);

  /* La lupa del frente de imagen: sólo en desarrollo (ver `lupa.ts`). */
  useEffect(() => apuntarEnLaLupa(gl, escenaViva, camaraViva), [gl, escenaViva, camaraViva]);

  useFrame((estado) => {
    camaraDeLaLupa(estado.camera);
    const c = compositor.current;
    if (c === null) {
      /* Entre soltar un compositor y montar el siguiente no puede quedar un fotograma sin pintar. */
      estado.gl.render(estado.scene, estado.camera);
      return;
    }
    semilla.current = (semilla.current + 1) % 1_000_000;
    const base: AjustesDeLaImagen = props.ajustes === undefined ? IMAGEN_DE_LA_NOCHE : { ...IMAGEN_DE_LA_NOCHE, ...props.ajustes };
    const claridad = UNIFORMES_DE_LA_LUZ.uClaridad.value;
    const cc = conClaridad.current;
    if (cc.base !== base || cc.claridad !== claridad) {
      cc.base = base;
      cc.claridad = claridad;
      cc.ajustes = conLaLuz(base, claridad);
    }
    const ajustes = cc.ajustes;
    c.pintar(estado.scene, estado.camera, {
      remanso: leerNumero(props.remanso, 0),
      foco: leerNumero(props.foco, FOCO_POR_OMISION),
      semilla: semilla.current,
      capaNitida: props.capaNitida !== false,
      ajustes,
    });
    const aviso = c.aviso();
    const antes = dicho.current;
    if (antes === null || antes.camino !== c.camino || antes.aviso !== aviso) {
      dicho.current = { camino: c.camino, aviso };
      props.alAvisar?.(c.camino, aviso);
    }
  }, 1);

  return null;
}
