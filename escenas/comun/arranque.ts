/**
 * EL ARRANQUE Y LA MEDIDA DE UNA ESCENA: `alEstarListo` una sola vez y con el mundo ya pintado, y
 * `alMedir` una vez por segundo con la media de ESE segundo.
 *
 * ═══ POR QUÉ UN GANCHO Y NO CINCO BUCLES ═══
 *
 * Son dos promesas del contrato (`embarcadero/tipos.ts`, `comun/tablero.ts`) que cumplía cada escena
 * a mano, y no las cumplían igual:
 *
 *   · EL MUELLE, LA PLAZA Y EL BURGO avisaban DOS FOTOGRAMAS después de que el mundo llegara (o
 *     fallara): se deja pintar uno con lo que haya y en el siguiente se avisa, que es lo que promete
 *     el contrato —«el primer fotograma con el mundo se ha pintado: ya se puede quitar el telón»—.
 *     LAS LINDES Y LA LINDE ALTA avisaban en cuanto llegaba el `.glb`, con el mundo aún sin pintar:
 *     el telón se podía levantar sobre un fotograma vacío.
 *   · LA MEDIDA iba una vez por segundo con la media de ese segundo en cuatro de ellas; La Linde Alta
 *     mandaba cada sesenta fotogramas la media DESDE EL PRINCIPIO con el total desde el principio,
 *     que es el fallo que Las Lindes ya había arreglado en la suya —el juez de la calidad, que suma
 *     los fotogramas de las muestras, contaba los primeros varias veces— y que se quedó en el lobby.
 *     Su propia cabecera decía «una vez por segundo».
 *   · EL TOPE de quince segundos, en La Linde Alta, volvía a empezar cada vez que se sentaba alguien:
 *     un lobby concurrido podía aplazarlo sin fin, que es justo lo que un tope no puede hacer.
 *
 * Lo bueno de cada una es de todas desde aquí, y lo que era deriva se ha ido.
 *
 * ═══ CÓMO SE USA ═══
 *
 * La escena le da sus avisos —sus `props` valen tal cual—, la llave del tope (su `traer`: si cambia, el
 * tope vuelve a contar) y, si quiere, qué decir cuando el tope vence sin que haya llegado nada. Recibe
 * `arrancar`, que llama cuando lo que espera ha llegado o ha fallado; llamarlo más de una vez no hace
 * nada. Y si no debe medir todavía —Las Lindes no mide hasta tener tablero: antes no hay valle que
 * medir— lo dice con `midiendo`.
 *
 * ═══ LO QUE NO CAMBIA RESPECTO DE LOS BUCLES DE ANTES ═══
 *
 * Cada fotograma cuenta como mucho CIEN MILISEGUNDOS: un navegador en segundo plano deja pasar
 * segundos entre dos, y la media salía en miles. Los triángulos y las llamadas son los del último
 * fotograma pintado (`gl.info.render`), y un `useFrame` se ejecuta antes de pintar, así que da lo mismo
 * en qué lugar de la escena corra el suyo: la cuenta es la misma que cuando iba al final del bucle de
 * cada una, y el aviso sale en el mismo fotograma.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MedidaDelHilo } from './tablero';

/** Cuánto se espera a `traer` antes de levantar el telón con lo que haya. */
export const TOPE_DE_ARRANQUE_MS = 15_000;
/** Lo más que cuenta un fotograma en la medida, en segundos: ver la cabecera. */
export const LO_MAS_QUE_CUENTA_UN_FOTOGRAMA = 0.1;
/** Cuántos fotogramas se pintan con el mundo antes de avisar: uno se pinta, en el siguiente se avisa. */
export const FOTOGRAMAS_ANTES_DE_AVISAR = 2;

/** Los dos avisos del contrato que lleva este gancho. Las `props` de cualquier escena valen. */
export interface AvisosDelArranque {
  readonly alEstarListo?: () => void;
  readonly alMedir?: (medida: MedidaDelHilo) => void;
}

export interface OpcionesDelArranque {
  /** Si cambia, el tope vuelve a contar desde cero: el `traer` de la escena, o lo que salga de él. */
  readonly llave: unknown;
  /** Lo que se dice si el tope vence sin arranque, antes de arrancar igual: el fallo que toque. */
  readonly alVencerElTope?: () => void;
  /** Si se mide ya. Por omisión, siempre. */
  readonly midiendo?: boolean;
}

export function usarArranqueYMedida(avisos: AvisosDelArranque, opciones: OpcionesDelArranque): () => void {
  /* Por referencia: el hilo de dibujo y el tope llaman siempre a los de este pintado. */
  const losAvisos = useRef(avisos);
  losAvisos.current = avisos;
  const alVencer = useRef(opciones.alVencerElTope);
  alVencer.current = opciones.alVencerElTope;

  const arranque = useRef({ arrancado: false, fotogramas: 0, avisado: false });
  const medida = useRef({ segundos: 0, fotogramas: 0 });

  useEffect(() => {
    const tope = setTimeout(() => {
      if (arranque.current.arrancado) return;
      alVencer.current?.();
      arranque.current.arrancado = true;
    }, TOPE_DE_ARRANQUE_MS);
    return () => {
      clearTimeout(tope);
    };
  }, [opciones.llave]);

  const midiendo = opciones.midiendo !== false;
  useFrame((s, dtCrudo) => {
    /* ─ El arranque: dos fotogramas después de que el mundo esté (o haya fallado), se avisa. ─ */
    const a = arranque.current;
    if (a.arrancado && !a.avisado) {
      a.fotogramas++;
      if (a.fotogramas >= FOTOGRAMAS_ANTES_DE_AVISAR) {
        a.avisado = true;
        losAvisos.current.alEstarListo?.();
      }
    }

    /* ─ La medida: una vez por segundo, con la media real y cada fotograma acotado a 100 ms. ─ */
    if (!midiendo) return;
    const m = medida.current;
    m.segundos += Math.min(LO_MAS_QUE_CUENTA_UN_FOTOGRAMA, Math.max(0, dtCrudo));
    m.fotogramas++;
    if (m.segundos < 1) return;
    const info = s.gl.info.render;
    losAvisos.current.alMedir?.({
      triangulos: info.triangles,
      llamadas: info.calls,
      ms: (m.segundos * 1000) / m.fotogramas,
      fotogramas: m.fotogramas,
    });
    m.segundos = 0;
    m.fotogramas = 0;
  });

  return useCallback(() => {
    arranque.current.arrancado = true;
  }, []);
}
