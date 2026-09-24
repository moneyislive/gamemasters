/**
 * `<CamaraDelQuiebro>`: la cámara por defecto del lienzo, puesta cada fotograma donde dicen las cuentas
 * de `encuadre.ts`, y el oído del sonido pegado a ella.
 *
 * Es la cámara POR DEFECTO de r3f a propósito: el posproceso (`posproceso/Posproceso.tsx`) pinta con
 * «la escena y la cámara por defecto del lienzo», y una cámara propia montada aparte sería una segunda
 * cámara que nadie pinta.
 *
 * ═══ LOS TRES MODOS ═══
 *
 *   · `orbita`: sin noche en juego (la reunión, el final). La cámara da vueltas despacio sobre la plaza:
 *     la ciudad se ve viva detrás de las pantallas de la mesa.
 *   · `bajada`: la Bajada (diseño §2.1, §8): cae entre fachadas desde lo alto hasta el hombro en unos
 *     seis segundos, mientras el barrio se escribe. Tapa la conexión del canal.
 *   · `juego`: al hombro, con todo lo de `encuadrar`; o Vigía si no tengo cuerpo.
 *
 * Corre en su `useFrame` con prioridad −2: después del bucle de la partida (que ya puso mi cuerpo en su
 * sitio de este fotograma) y antes de los efectos y la ciudad, que leen la cámara.
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Barrio, CajaDelBarrio } from '../../../../shared/arcade/juegos/quiebro-barrio';
import type { EstadoDeLosMandos } from '../mandos/estado';
import type { Partida } from '../red/partida';
import type { Escenificador } from '../red/escenificar';
import type { SistemaDeEfectos } from '../efectos';
import type { Sonido } from '../sonido';
import type { CajaAlta, EncuadreDeLaCamara } from './encuadre';
import { CABECEO_MAXIMO, CABECEO_MINIMO, camaraNueva, encuadrar, FOV_MOVIL, FOV_PC } from './encuadre';

export type ModoDeLaCamara = 'orbita' | 'bajada' | 'juego';

export interface PropsDeLaCamara {
  readonly partida: Partida;
  readonly mandos: EstadoDeLosMandos;
  readonly escena: Escenificador;
  readonly sistema: SistemaDeEfectos;
  readonly sonido: Sonido;
  readonly barrio: Barrio | null;
  readonly modo: ModoDeLaCamara;
  /** Cuándo empezó la Bajada (ms de `performance.now()`). */
  readonly bajadaDesdeMs: number;
  readonly tactil: boolean;
}

/**
 * LA CAJA CON QUE ALGO TAPA A LA CÁMARA. La caja de choque dice hasta dónde llega lo que PARA a quien
 * anda (la fuente, 1 m), pero lo que se PINTA encima puede subir más: el tejado del quiosco, el capó con
 * su luna, la columna de la fuente. Con la caja tal cual, la cámara quedaba flotando a 1,7 m sobre la
 * fuente y por dentro de su taza (visto en el navegador el 24-sep: media pantalla de piedra mojada).
 *
 *   · Lo que llega al pecho (0,9 m o más) tapa como una pared.
 *   · La FUENTE es la excepción, porque es ancha y baja: el pilón (0,7 m) no tapa, y lo que sí tapa es
 *     su columna con la taza, en el centro (`ciudad/mobiliario.ts`: taza de 0,85 m de radio a 1,5 m, y el
 *     surtidor hasta 2,4). Tratarla entera como pared pegaba la cámara al cogote de quien nace de
 *     espaldas a ella.
 *   · Un banco, no tapa.
 */
export function cajaParaLaCamara(c: CajaDelBarrio): CajaAlta {
  if (c.tipo === 'fuente') {
    const cx = (c.x0 + c.x1) / 2;
    const cz = (c.z0 + c.z1) / 2;
    return { x0: cx - 0.95, z0: cz - 0.95, x1: cx + 0.95, z1: cz + 0.95, alto: 2.6 };
  }
  return { x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1, alto: c.alto >= 0.9 ? Math.max(c.alto, 6) : c.alto };
}

/** Lo que dura la caída de la Bajada. */
const BAJADA_MS = 5600;

function suave(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function CamaraDelQuiebro(p: PropsDeLaCamara): null {
  const camara = useThree((s) => s.camera);
  const cajas = useMemo<readonly CajaAlta[]>(
    () => (p.barrio === null ? [] : p.barrio.cajas.map(cajaParaLaCamara)),
    [p.barrio],
  );
  const estado = useRef(camaraNueva(0));
  const primera = useRef(true);
  const mirar = useRef(new THREE.Vector3());
  const adelante = useRef(new THREE.Vector3());

  useFrame((_s, dt) => {
    const ahora = performance.now();
    const cam = camara as THREE.PerspectiveCamera;
    const e = estado.current;
    const giro = p.mandos.tomarMirada();
    e.giro += giro.giro;
    e.cabeceo = Math.max(CABECEO_MINIMO, Math.min(CABECEO_MAXIMO, e.cabeceo + giro.cabeceo));
    const yo = p.partida.yo();
    const cuerpo = yo === null ? null : p.partida.pintadoDe(yo);
    let encuadre: EncuadreDeLaCamara;

    if (p.modo === 'orbita' || cuerpo === null) {
      const a = (ahora / 1000) * 0.05;
      encuadre = {
        ojo: { x: Math.sin(a) * 34, y: 22, z: Math.cos(a) * 34 },
        mira: { x: 0, y: 2, z: 0 },
        fov: p.tactil ? FOV_MOVIL : FOV_PC,
      };
    } else {
      if (primera.current) {
        /* La primera vez, detrás de mí: mirando hacia donde miro al aparecer. */
        e.giro = cuerpo.rumbo;
        primera.current = false;
      }
      const blanco = p.partida.blanco === 0 ? null : p.partida.pintadoDe(p.partida.blanco);
      const alHombro = encuadrar(e, {
        x: cuerpo.x,
        z: cuerpo.z,
        dt: Math.min(0.1, dt),
        enemigosCerca: p.partida.enemigosCerca(),
        blanco,
        mandaElDedo: p.mandos.mandaElDedo(ahora),
        remanso: p.sistema.reloj.intensidad(ahora),
        tactil: p.tactil,
        vigia: !p.partida.conCuerpo(),
        cajas,
      });
      if (p.modo === 'bajada') {
        /* La caída: desde muy arriba sobre la plaza hasta el hombro, frenando al final. */
        const f = suave((ahora - p.bajadaDesdeMs) / BAJADA_MS);
        const alto = { x: cuerpo.x * 0.4, y: 70, z: cuerpo.z * 0.4 + 26 };
        encuadre = {
          ojo: {
            x: alto.x + (alHombro.ojo.x - alto.x) * f,
            y: alto.y + (alHombro.ojo.y - alto.y) * f * f,
            z: alto.z + (alHombro.ojo.z - alto.z) * f,
          },
          mira: {
            x: alHombro.mira.x * f + cuerpo.x * (1 - f),
            y: alHombro.mira.y * f,
            z: alHombro.mira.z * f + cuerpo.z * (1 - f),
          },
          fov: alHombro.fov + 10 * (1 - f),
        };
      } else encuadre = alHombro;
    }

    /* La sacudida de un golpe: unos centímetros, y se apaga en un cuarto de segundo. */
    const s = p.escena.sacudida;
    const temblor = s > 0.01 ? s * 0.07 : 0;
    p.escena.sacudida = s * Math.exp(-Math.min(0.1, dt) / 0.08);
    cam.position.set(
      encuadre.ojo.x + (temblor === 0 ? 0 : Math.sin(ahora * 0.09) * temblor),
      encuadre.ojo.y + (temblor === 0 ? 0 : Math.sin(ahora * 0.13 + 1.7) * temblor),
      encuadre.ojo.z,
    );
    mirar.current.set(encuadre.mira.x, encuadre.mira.y, encuadre.mira.z);
    cam.lookAt(mirar.current);
    if (Math.abs(cam.fov - encuadre.fov) > 0.01) {
      cam.fov = encuadre.fov;
      cam.updateProjectionMatrix();
    }
    /* La palanca empuja relativa a hacia donde mira la cámara (su giro sin la órbita del Remanso). */
    p.partida.giroDeLaCamara = e.giro;
    /* El oído, en la cámara. */
    cam.getWorldDirection(adelante.current);
    p.sonido.oyente({ x: cam.position.x, y: cam.position.y, z: cam.position.z }, { x: adelante.current.x, y: adelante.current.y, z: adelante.current.z });
  }, -2);

  return null;
}
