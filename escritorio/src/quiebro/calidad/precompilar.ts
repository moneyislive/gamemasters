/**
 * COMPILAR ANTES DE PINTAR: que ningún sombreador se compile en el fotograma en que hace falta.
 *
 * ═══ EL PROBLEMA (revisión de rendimiento del 24-sep) ═══
 *
 * three compila el programa de un material la primera vez que lo PINTA, y lo usa en ese mismo instante: el
 * hilo principal se queda esperando al compilador (`getProgramInfoLog`) programa a programa. Medido en un
 * PC de sobremesa, cada cambio de nivel se paraba 150-400 ms así, y cada comienzo de noche 120-240 ms. Y
 * buena parte era compilar lo que ya existía: al soltar la ciudad vieja antes de pintar la nueva, three
 * soltaba sus programas (nadie más los usaba) y los volvía a compilar, con el MISMO fuente, un fotograma
 * después.
 *
 * ═══ LAS TRES PIEZAS DE AQUÍ ═══
 *
 *   · `alPintarLaEscena`: una cita en el pintado PRINCIPAL de cada fotograma, dentro de
 *     `scene.onBeforeRender`, que es el único sitio donde el estado del renderizador (el blanco, el mapeo
 *     tonal, las sombras, las luces) es exactamente el del pintado: compilar ahí compila la variante que se
 *     va a usar, y no otra. Principal = el primero tras los `useFrame` (el posproceso pinta la escena otra
 *     vez para la capa nítida, con otro estado).
 *   · `Compilacion`: compila un objeto que aún NO se pinta (la ciudad del nivel nuevo, el cielo nuevo) con
 *     `compileAsync` —con `KHR_parallel_shader_compile` el hilo principal no espera— y, cuando está, comprueba
 *     en el pintado de ese momento que no le falta ningún programa (si el estado cambió entretanto, vuelve a
 *     empezar). Quien la usa enseña el objeto nuevo y suelta el viejo DESPUÉS: los programas iguales pasan de
 *     uno a otro sin compilarse (three los comparte por su clave).
 *   · `usarLaPrecompilacionAlCambiar`: tras un cambio de nivel el estado del renderizador cambia de todas
 *     formas (el posproceso cambia de mapeo tonal o de blanco; en N2+ hay sombras y luces de verdad) y TODO lo
 *     que se ve necesita programas nuevos en el primer pintado con el estado nuevo. Eso no se puede evitar,
 *     pero sí que sea uno detrás de otro: en ese pintado se piden TODOS a la vez (`renderer.compile` de lo que
 *     cuelga de la escena) antes de que el pintado use el primero, y el compilador los hace en paralelo.
 *   · `guardarLosProgramas`: lo que se suelta (la ciudad del nivel de antes, el cielo de antes) guarda sus
 *     programas para la próxima pieza igual. Medido en el juego (24-sep, PC, caché del navegador caliente):
 *     con las tres de arriba, un cambio de nivel aún enlazaba 22-25 programas, todos de la ciudad y del cielo
 *     (la ciudad vieja con el estado nuevo mientras la nueva se prepara, y la nueva), 30-40 ms esperando al
 *     compilador y un fotograma de 42-60 ms; three los soltaba con sus materiales y los volvía a enlazar en el
 *     siguiente cambio. Un material sin soltar sostiene los programas de todos los estados con que se pintó.
 *
 * Nada de esto cambia qué se pinta ni cómo: sólo CUÁNDO se compila. Sin la extensión de compilación en
 * paralelo, `compileAsync` espera igual (three marca los programas listos en seguida) y todo queda como antes.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';

/* ═══════════════════════════════ LA CITA EN EL PINTADO PRINCIPAL ═══════════════════════════════ */

/** Lo que se le pide al renderizador: lo de `THREE.WebGLRenderer` que se usa aquí (el comprobador pone uno falso). */
export interface Compilador {
  compile(objeto: THREE.Object3D, camara: THREE.Camera, escena?: THREE.Scene | null): unknown;
  compileAsync(objeto: THREE.Object3D, camara: THREE.Camera, escena?: THREE.Scene | null): Promise<unknown>;
  readonly info: { readonly programs: readonly { readonly id: number }[] | null };
}

export type AlPintar = (gl: Compilador, escena: THREE.Scene, camara: THREE.Camera) => void;

const CITAS = new WeakMap<THREE.Object3D, Set<AlPintar>>();

/**
 * Llama a `fn` cada vez que se pinta `escena`, antes de que three arme lo que pinta (dentro de su
 * `onBeforeRender`, encadenado con el que hubiera). Devuelve cómo quitarla.
 */
export function alPintarLaEscena(escena: THREE.Scene, fn: AlPintar): () => void {
  let citas = CITAS.get(escena);
  if (citas === undefined) {
    const lista = new Set<AlPintar>();
    citas = lista;
    CITAS.set(escena, lista);
    const antes = escena.onBeforeRender;
    const envolver = function (this: THREE.Object3D, ...a: unknown[]): void {
      (antes as (...b: unknown[]) => void).apply(this, a);
      const [gl, s, c] = a as [Compilador, THREE.Scene, THREE.Camera];
      for (const f of lista) f(gl, s, c);
    };
    escena.onBeforeRender = envolver as unknown as THREE.Object3D['onBeforeRender'];
  }
  const suyas = citas;
  suyas.add(fn);
  return () => {
    suyas.delete(fn);
  };
}

/**
 * La cita en el pintado PRINCIPAL de cada fotograma (ver la cabecera): el primero después de los `useFrame`.
 * `fn` puede cambiar en cada render de React; se llama la última.
 */
export function usarAlPintarLaEscena(fn: AlPintar | null): void {
  const escena = useThree((s) => s.scene);
  const ultima = useRef(fn);
  ultima.current = fn;
  const nuevo = useRef(false);
  /* Antes que nadie: sólo marca que empieza un fotograma. */
  useFrame(() => {
    nuevo.current = true;
  }, -1000);
  useEffect(
    () =>
      alPintarLaEscena(escena, (gl, s, c) => {
        if (!nuevo.current) return;
        nuevo.current = false;
        ultima.current?.(gl, s, c);
      }),
    [escena],
  );
}

/* ═══════════════════════════════ COMPILAR UNA PIEZA QUE AÚN NO SE PINTA ═══════════════════════════════ */

/** El programa más nuevo que tiene el renderizador (three los numera al crearlos). */
export function ultimoPrograma(gl: Compilador): number {
  let n = -1;
  for (const p of gl.info.programs ?? []) if (p.id > n) n = p.id;
  return n;
}

/**
 * LA COMPILACIÓN DE UNA PIEZA que se prepara sin pintarse (ver la cabecera). Se le da la vez en el pintado
 * principal (`enElPintado`), que devuelve `true` cuando la pieza tiene TODOS sus programas para el estado de
 * ese pintado: entonces, y no antes, se puede enseñar sin que ese fotograma compile nada.
 */
export class Compilacion {
  private estado: 'nada' | 'compilando' | 'lista' = 'nada';
  private alAcabar: (() => void) | null = null;
  /** Cuántas veces se pidió compilarla (una, si el estado del renderizador no cambió entretanto). */
  pedidas = 0;
  /** Cuántas veces se vio que el estado había cambiado y le faltaban programas. */
  rehechas = 0;

  constructor(readonly objeto: THREE.Object3D) {}

  get compilando(): boolean {
    return this.estado === 'compilando';
  }

  enElPintado(gl: Compilador, escena: THREE.Scene, camara: THREE.Camera): boolean {
    if (this.estado === 'compilando') return false;
    if (this.estado === 'lista') {
      /* ¿Sigue valiendo para ESTE estado? Si al compilarla ahora aparece algún programa, no. */
      const antes = ultimoPrograma(gl);
      gl.compile(this.objeto, camara, escena);
      if (ultimoPrograma(gl) === antes) return true;
      this.rehechas++;
    }
    this.estado = 'compilando';
    this.pedidas++;
    void gl.compileAsync(this.objeto, camara, escena).then(() => {
      if (this.estado === 'compilando') this.estado = 'lista';
      const f = this.alAcabar;
      this.alAcabar = null;
      f?.();
    });
    return false;
  }

  /**
   * Suelta la pieza cuando se pueda: YA si no se está compilando; si no, cuando acabe (three mira sus
   * materiales mientras compila, y un material soltado a medias rompe su espera).
   */
  soltarCuandoSePueda(soltar: () => void): void {
    if (this.estado !== 'compilando') {
      soltar();
      return;
    }
    const antes = this.alAcabar;
    this.alAcabar = () => {
      antes?.();
      soltar();
    };
  }
}

/* ═══════════════════════════════ EL RELEVO DE UNA PIEZA ═══════════════════════════════ */

interface PiezaEnRelevo {
  readonly objeto: THREE.Object3D;
  readonly soltar: () => void;
  readonly compilacion: Compilacion;
}

/**
 * EL RELEVO DE UNA PIEZA SUELTA (el cielo, la lluvia): se enseña la que hay hasta que la nueva está
 * compilada para el pintado de ese momento, y la vieja se suelta después (sus programas iguales siguen vivos
 * en la nueva). La primera se enseña en seguida: antes no hay nada que enseñar.
 */
export class RelevoDePieza {
  readonly grupo: THREE.Group;
  private actual: PiezaEnRelevo | null = null;
  private siguiente: PiezaEnRelevo | null = null;
  private readonly porSoltar: (() => void)[] = [];
  /** Cuántas veces se relevó (para el comprobador). */
  relevos = 0;

  constructor(grupo: THREE.Group) {
    this.grupo = grupo;
  }

  get mostrada(): THREE.Object3D | null {
    return this.actual?.objeto ?? null;
  }

  poner(objeto: THREE.Object3D, soltar: () => void): void {
    if (this.actual?.objeto === objeto || this.siguiente?.objeto === objeto) return;
    const nueva: PiezaEnRelevo = { objeto, soltar, compilacion: new Compilacion(objeto) };
    const s = this.siguiente;
    if (s !== null) s.compilacion.soltarCuandoSePueda(s.soltar);
    if (this.actual === null) {
      this.actual = nueva;
      this.siguiente = null;
      this.grupo.add(objeto);
      return;
    }
    this.siguiente = nueva;
  }

  /** En el pintado principal: compila la que viene y, cuando está, la cambia por la que se ve. */
  enElPintado(gl: Compilador, escena: THREE.Scene, camara: THREE.Camera): void {
    const s = this.siguiente;
    if (s === null || !s.compilacion.enElPintado(gl, escena, camara)) return;
    const vieja = this.actual;
    if (vieja !== null) {
      this.grupo.remove(vieja.objeto);
      this.porSoltar.push(vieja.soltar);
    }
    this.grupo.add(s.objeto);
    s.objeto.updateMatrixWorld(true);
    this.actual = s;
    this.siguiente = null;
    this.relevos++;
  }

  /** En el fotograma siguiente al relevo: lo viejo, ya sin pintarse y con sus programas compartidos. */
  soltarLoViejo(): void {
    while (this.porSoltar.length > 0) this.porSoltar.shift()?.();
  }

  liberar(): void {
    this.soltarLoViejo();
    const s = this.siguiente;
    if (s !== null) s.compilacion.soltarCuandoSePueda(s.soltar);
    const a = this.actual;
    if (a !== null) {
      this.grupo.remove(a.objeto);
      a.soltar();
    }
    this.actual = null;
    this.siguiente = null;
  }
}

/* ═══════════════════════════════ TODO A LA VEZ, AL CAMBIAR DE ESTADO ═══════════════════════════════ */

/** Cuántos pintados principales se compila en bloque tras un cambio de nivel (el posproceso cambia uno después). */
export const PINTADOS_EN_BLOQUE = 3;

/** La clave del estado del renderizador que cambia los programas de todo lo que se pinta (ver la cabecera). */
export function claveDelPintado(gl: { readonly toneMapping: number; readonly outputColorSpace: string; readonly shadowMap: { readonly enabled: boolean } }, conBlanco: boolean): string {
  return `${String(gl.toneMapping)}|${gl.outputColorSpace}|${gl.shadowMap.enabled ? 1 : 0}|${conBlanco ? 1 : 0}`;
}

/**
 * CUÁNDO SE COMPILA EN BLOQUE (sin three ni React: el comprobador lo ejercita): en los `PINTADOS_EN_BLOQUE`
 * pintados principales que siguen a un cambio de `clave` (el nivel), y en el primero en que cambia el estado
 * del renderizador (`claveDelPintado`: el posproceso cambia de camino un fotograma después que el nivel).
 */
export class BloqueAlCambiar {
  private clave: unknown;
  private pendientes = 0;
  private estado: string | null = null;
  /** Cuántas veces se compiló en bloque. */
  bloques = 0;

  constructor(clave: unknown) {
    this.clave = clave;
  }

  /** La clave de ahora (el nivel): si cambió, tocan los siguientes pintados. */
  ponerLaClave(clave: unknown): void {
    if (clave === this.clave) return;
    this.clave = clave;
    this.pendientes = PINTADOS_EN_BLOQUE;
  }

  /** En el pintado principal, con la clave del estado del renderizador: ¿se compila en bloque ahora? */
  toca(estado: string): boolean {
    const cambio = this.estado !== null && this.estado !== estado;
    this.estado = estado;
    if (this.pendientes <= 0 && !cambio) return false;
    this.pendientes = Math.max(0, this.pendientes - 1);
    this.bloques++;
    return true;
  }
}

/**
 * COMPILA EN BLOQUE lo que cuelga de la escena en el pintado principal, antes de que el pintado lo use, cuando
 * toca (`BloqueAlCambiar`). Cada hijo visible de la escena por separado, para no compilar lo apagado del todo.
 */
export function usarLaPrecompilacionAlCambiar(clave: unknown): BloqueAlCambiar {
  const bloque = useRef<BloqueAlCambiar | null>(null);
  bloque.current ??= new BloqueAlCambiar(clave);
  const b = bloque.current;
  b.ponerLaClave(clave);
  /* SÓLO EN DESARROLLO: para medirlo desde fuera (cuántos bloques se compilaron). */
  if ((import.meta.env as { readonly DEV?: boolean } | undefined)?.DEV === true && typeof window !== 'undefined') {
    (window as unknown as { __quiebroBloque?: BloqueAlCambiar }).__quiebroBloque = b;
  }
  usarAlPintarLaEscena((gl, escena, camara) => {
    const r = gl as unknown as THREE.WebGLRenderer;
    if (b.toca(claveDelPintado(r, r.getRenderTarget() !== null))) compilarEnBloque(gl, escena, camara);
  });
  return b;
}

/** Pide a la vez los programas de todo lo que cuelga de la escena (sus hijos visibles), para el estado de ahora. */
export function compilarEnBloque(gl: Compilador, escena: THREE.Scene, camara: THREE.Camera): void {
  for (const hijo of escena.children) if (hijo.visible) gl.compile(hijo, camara, escena);
}

/* ═══════════════════════════════ LOS PROGRAMAS QUE SE GUARDAN ═══════════════════════════════ */

/** Cuántos juegos de materiales soltados se guardan por clave (ver `guardarLosProgramas`). */
export const JUEGOS_GUARDADOS_POR_CLAVE = 1;

const GUARDADOS = new Map<string, THREE.Material[][]>();

/**
 * GUARDA LOS PROGRAMAS de unos materiales que su dueño suelta, en vez de soltarlos (ver la cabecera): three
 * suelta el programa de un material cuando ningún material vivo lo usa, y la próxima pieza igual (la ciudad de
 * ese nivel la próxima vez, el mismo cielo) lo volvería a enlazar, esperando al compilador en el fotograma en
 * que se pinta. Se guardan los `cuantos` últimos juegos de cada `clave` y se sueltan los más viejos: lo guardado
 * no se pinta nunca, sólo sostiene sus programas. Quien guarda suelta antes sus texturas propias (lo guardado
 * no debe retener imágenes: ver los neones en `ciudad/abierta.ts`).
 */
export function guardarLosProgramas(clave: string, materiales: readonly THREE.Material[], cuantos = JUEGOS_GUARDADOS_POR_CLAVE): void {
  const lista = GUARDADOS.get(clave) ?? [];
  lista.push([...materiales]);
  while (lista.length > cuantos) for (const m of lista.shift() ?? []) m.dispose();
  GUARDADOS.set(clave, lista);
}

/** Cuántos materiales hay guardados (para el comprobador). */
export function materialesGuardados(clave?: string): number {
  let n = 0;
  for (const [k, lista] of GUARDADOS) if (clave === undefined || k === clave) for (const j of lista) n += j.length;
  return n;
}
