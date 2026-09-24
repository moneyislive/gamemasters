/**
 * `<CiudadAbierta>`: la ciudad de 540 m montada en una escena de r3f. Todo el trabajo está en `abierta.ts`, y
 * el paso de una ciudad a otra en `relevo.ts`; esto pide la ciudad de la noche y del nivel, le da cada
 * fotograma la cámara, el tiempo del adorno y el tic, le da la vez en el pintado principal (para compilar la
 * que viene y relevar: ver `calidad/precompilar.ts`) y la suelta al desmontar. La ventana de celdas y la luz
 * por losetas siguen a la CÁMARA: en la Bajada (desde lo alto) y con el Vigía (cenital) también, sin que nadie
 * les diga dónde está el jugador.
 *
 * Por defecto la primera ciudad NO monta la ventana de golpe: el primer fotograma la empieza y los siguientes la
 * llenan con prisa (ver `PRISA_DEL_PRINCIPIO`), mientras lo lejano ya enseña la ciudad entera; un teléfono
 * modesto tardaría más de un segundo en montarla de un tirón. `montarYa` la monta al construir (el banco, para
 * repetir capturas). Las siguientes (otro nivel, otra noche) se preparan detrás y relevan a la que se pinta
 * cuando están listas y compiladas.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CiudadAbiertaConstruida, CiudadParaPintar, FotogramaDeLaCiudadAbierta } from './abierta';
import type { SubidorDeLaCiudad } from './relevo';
import { RelevoDeLaCiudad } from './relevo';
import type { NivelDeLaCiudad } from './tipos';
import { usarAlPintarLaEscena } from '../calidad/precompilar';

/**
 * EL SUBIDOR del relevo (ver `relevo.ts`): sube las geometrías de una malla de la ciudad que viene pintándola
 * sola, con un material de lo más simple, en un blanco de 1×1 que no se ve. three sube lo que pinta; el programa
 * de ese material se hace una vez. No toca el grafo de la ciudad (la malla se cuelga de la escena de subir sin
 * cambiarle el padre), ni el blanco ni las cuentas del renderizador (quien mida el fotograma no ve este pintado).
 */
function crearElSubidor(gl: THREE.WebGLRenderer): SubidorDeLaCiudad & { liberar(): void } {
  const blanco = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const escena = new THREE.Scene();
  const simple = new THREE.MeshBasicMaterial();
  escena.overrideMaterial = simple;
  /* Las posiciones dan igual: no se recalculan (la malla sigue con las de su ciudad). */
  escena.matrixWorldAutoUpdate = false;
  const camara = new THREE.OrthographicCamera();
  return {
    subirMalla(malla: THREE.Object3D): void {
      const cortada = malla.frustumCulled;
      const visible = malla.visible;
      malla.frustumCulled = false;
      malla.visible = true;
      const info = gl.info.render;
      const cuentas = { calls: info.calls, triangles: info.triangles, points: info.points, lines: info.lines, frame: info.frame };
      const antes = gl.getRenderTarget();
      escena.children.push(malla);
      try {
        gl.setRenderTarget(blanco);
        gl.render(escena, camara);
      } finally {
        escena.children.length = 0;
        gl.setRenderTarget(antes);
        Object.assign(info, cuentas);
        malla.frustumCulled = cortada;
        malla.visible = visible;
      }
    },
    subirTextura(textura: THREE.Texture): void {
      gl.initTexture(textura);
    },
    liberar(): void {
      blanco.dispose();
      simple.dispose();
    },
  };
}

export interface PropsDeLaCiudadAbierta {
  readonly fuente: CiudadParaPintar;
  readonly nivel: NivelDeLaCiudad;
  /** El tiempo del adorno, en segundos. */
  readonly reloj?: () => number;
  /** El tic (20 Hz) con el que pasa el tren: el de la sala. */
  readonly tic?: () => number;
  /** Monta la ventana y la luz alrededor de este punto al construir la primera. */
  readonly montarYa?: { readonly x: number; readonly z: number };
  /** Con cada ciudad que pasa a pintarse (la primera y cada relevo). */
  readonly alConstruir?: (ciudad: CiudadAbiertaConstruida) => void;
}

/**
 * SÓLO EN DESARROLLO: la ciudad viva, el trabajo de su último fotograma y el relevo en `window.__quiebroCiudad`,
 * para medir desde fuera el cruce de la ciudad DENTRO DEL JUEGO (con la lupa de `posproceso/lupa.ts`), igual
 * que `__bancoAbierto` en su banco. En el empaquetado no existe.
 */
interface MiradorDeLaCiudad {
  ciudad: CiudadAbiertaConstruida | null;
  ultimo: FotogramaDeLaCiudadAbierta | null;
  readonly relevo: RelevoDeLaCiudad;
}
const EN_DESARROLLO = (import.meta.env as { readonly DEV?: boolean } | undefined)?.DEV === true && typeof window !== 'undefined';

export function CiudadAbierta({ fuente, nivel, reloj, tic, montarYa, alConstruir }: PropsDeLaCiudadAbierta): JSX.Element {
  const { gl } = useThree();
  /* three sólo sube una textura cuando la pinta: la luz de atrás se sube fila a fila con esto. */
  const relevo = useMemo(() => new RelevoDeLaCiudad({ alCrear: (c) => c.ponerElSubidor((t) => gl.initTexture(t)) }), [gl]);
  const primera = useRef(true);
  /* Pedir es idempotente: lo mismo otra vez no hace nada, y lo que ya se pinta deja lo que se preparaba. */
  useMemo(() => {
    relevo.pedir(fuente, nivel);
    if (primera.current && montarYa !== undefined) relevo.actual?.montarYa(montarYa.x, montarYa.z);
    primera.current = false;
    /* `montarYa` sólo cuenta con la primera. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relevo, fuente, nivel]);
  const mirador = useMemo<MiradorDeLaCiudad>(() => ({ ciudad: null, ultimo: null, relevo }), [relevo]);
  const avisar = useRef(alConstruir);
  avisar.current = alConstruir;
  /* Lo de la ciudad que viene se sube a trozos antes de enseñarla (ver `relevo.ts`). */
  useEffect(() => {
    const subidor = crearElSubidor(gl);
    relevo.ponerElSubidor(subidor);
    return () => {
      relevo.ponerElSubidor(null);
      subidor.liberar();
    };
  }, [relevo, gl]);

  useEffect(() => {
    /* La primera, en cuanto se monta (las demás, al relevar: ver el `useFrame`). */
    const primeraCiudad = relevo.tomarLaNueva();
    if (primeraCiudad !== null) {
      mirador.ciudad = primeraCiudad;
      avisar.current?.(primeraCiudad);
    }
    const w = window as unknown as { __quiebroCiudad?: MiradorDeLaCiudad };
    if (EN_DESARROLLO) w.__quiebroCiudad = mirador;
    return () => {
      relevo.liberar();
      if (EN_DESARROLLO && w.__quiebroCiudad === mirador) delete w.__quiebroCiudad;
    };
  }, [relevo, mirador]);

  useFrame((estado) => {
    const t = reloj !== undefined ? reloj() : estado.clock.elapsedTime;
    const f = relevo.actualizar(estado.camera, t, tic !== undefined ? tic() : t * 20);
    const nueva = relevo.tomarLaNueva();
    if (nueva !== null) {
      mirador.ciudad = nueva;
      avisar.current?.(nueva);
    }
    if (EN_DESARROLLO) mirador.ultimo = f;
  });
  usarAlPintarLaEscena((r, escena, camara) => relevo.enElPintado(r, escena, camara));
  return <primitive object={relevo.grupo} />;
}
