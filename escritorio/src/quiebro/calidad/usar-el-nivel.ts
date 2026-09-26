/**
 * `usarElNivel`: el gancho que junta el sondeo, el gobernador y el lienzo. Va DENTRO del `<Canvas>`.
 *
 * ═══ QUÉ HACE, EN ORDEN ═══
 *
 *   1. Sondea el aparato una vez por renderizador (`sondeo.ts`) y decide el arranque y el techo
 *      (`capacidades.ts`), con el recuerdo de la última noche encima si la gráfica es la misma.
 *   2. En cada fotograma le da al gobernador (`gobernador.ts`) una muestra: el tiempo desde el
 *      fotograma anterior, si la pestaña estaba oculta, y la cuenta de la ESCENA del fotograma
 *      anterior tal como la apuntó el posproceso (`medida.ts`). Si no hay posproceso montado, la cuenta
 *      es la de `gl.info.render`, que sin compositor ES la de la escena.
 *   3. Cuando el gobernador cambia de nivel o de DPR, lo aplica: el DPR con `setDpr` de r3f (que
 *      redimensiona el lienzo, y el posproceso se entera solo), y el nivel como estado de React, para
 *      que la ciudad, la atmósfera, los personajes y el posproceso se vuelvan a montar con sus palancas.
 *   4. Y en los pintados que siguen a un cambio de nivel (y en el que cambia el estado del renderizador),
 *      pide A LA VEZ los programas de todo lo que se pinta antes de que el pintado los use
 *      (`usarLaPrecompilacionAlCambiar`, en `precompilar.ts`): el compilador los hace en paralelo en vez de
 *      uno detrás de otro, con el hilo principal parado en cada uno.
 *
 * Hacia fuera da el nivel, sus palancas y la palabra de la casa (`calidad`: `sobria` en N0, `plena`
 * en el resto), que es la que se guarda para la compuerta de Boots on Board si alguien la guarda.
 *
 * ═══ POR QUÉ EL NIVEL ES ESTADO DE REACT Y LO DEMÁS VA POR REFERENCIA ═══
 *
 * El nivel cambia pocas veces por noche y cuando cambia hay que volver a montar cosas: es estado. El
 * gobernador y la última medida cambian en CADA fotograma y sólo los lee quien quiera enseñarlos (el
 * banco): van por referencia, y leerlos no vuelve a pintar React sesenta veces por segundo.
 *
 * ═══ `fijo` ═══
 *
 * Con `fijo` el gobernador se calla y el nivel es el pedido, en su peldaño alto (el banco lo usa para
 * mirar cada nivel; una lista de ajustes lo usaría para «calidad: baja»). Al volver a `null`, el
 * gobernador empieza de nuevo desde lo que dijo el sondeo: lo aprendido con otro nivel forzado no vale.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Calidad } from '../../../../escenas/embarcadero/tipos';
import type { NivelDeCalidad, PalancasDelNivel } from './niveles';
import { TABLA_DE_NIVELES, calidadDeFuera, escaleraDeDpr } from './niveles';
import type { CapacidadesDelAparato, VeredictoDelSondeo } from './capacidades';
import { veredictoDelSondeo } from './capacidades';
import type { CambioDelGobernador, EstadoDelGobernador } from './gobernador';
import {
  LLAVE_DEL_RECUERDO,
  arranqueConRecuerdo,
  dprDe,
  gobernadorNuevo,
  gobernar,
  leerElRecuerdo,
  recuerdoDe,
  seRecuerda,
} from './gobernador';
import { sondearElAparato } from './sondeo';
import { laCuentaDe } from './medida';
import { compilandoEnBloque, usarLaPrecompilacionAlCambiar } from './precompilar';

export interface OpcionesDelNivel {
  /** Un nivel forzado; `null` o sin dar = lo decide el gobernador. */
  readonly fijo?: NivelDeCalidad | null;
  /** Si el gancho aplica el DPR al lienzo (por omisión, sí). */
  readonly aplicarDpr?: boolean;
  /** Si se guarda y se lee el nivel que aguantó en este aparato (por omisión, sí). */
  readonly recordar?: boolean;
  /** Cada cambio del gobernador, para el diagnóstico o para contárselo al jugador. */
  readonly alCambiar?: (cambio: CambioDelGobernador) => void;
  /** ¿Se pelea ahora? Entonces el gobernador sólo toca el DPR (ver `nivelQuieto` en `gobernador.ts`). */
  readonly nivelQuieto?: () => boolean;
  /** Lo que, al cambiar, pide compilar en bloque además del nivel (la fase de la cámara: llegan cuerpos y efectos). */
  readonly claveDelBloque?: string;
  /** ¿Se puede dejar la escena sin pintar mientras compila? (En la pelea no: ver `compilarEnBloque`.) */
  readonly esconderAlCompilar?: () => boolean;
}

/** Lo último medido, para quien lo quiera enseñar. */
export interface LoUltimoMedido {
  readonly ms: number;
  readonly oculta: boolean;
  readonly llamadasDeLaEscena: number;
  readonly triangulosDeLaEscena: number;
  readonly llamadas: number;
  readonly triangulos: number;
}

export interface ElNivel {
  readonly nivel: NivelDeCalidad;
  /** La palabra de la casa: `sobria` en N0, `plena` en N1-N3. */
  readonly calidad: Calidad;
  readonly dpr: number;
  readonly palancas: PalancasDelNivel;
  readonly capacidades: CapacidadesDelAparato;
  readonly sondeo: VeredictoDelSondeo;
  /** El estado del gobernador, por referencia (cambia en cada fotograma). */
  readonly gobernador: { readonly current: EstadoDelGobernador };
  /** La última medida, por referencia. */
  readonly ultimo: { readonly current: LoUltimoMedido };
}

const NADA_MEDIDO: LoUltimoMedido = {
  ms: 0,
  oculta: false,
  llamadasDeLaEscena: 0,
  triangulosDeLaEscena: 0,
  llamadas: 0,
  triangulos: 0,
};

/*
 * ═══ EL NIVEL FORZADO DESDE FUERA ═══
 *
 * Quien monta el gancho puede pasar `fijo`; quien NO lo monta (una captura del juego real, la lupa del
 * frente de imagen, `?nivel=0..3` en la dirección con el servidor de desarrollo) también tiene que poder
 * mirar cada nivel sin tocar la raíz del juego. `fijo` manda sobre esto; esto manda sobre el gobernador.
 */
function nivelDeLaDireccion(): NivelDeCalidad | null {
  /* Sólo en desarrollo: en el juego empaquetado el nivel lo deciden el sondeo y el gobernador. */
  const env = import.meta.env as { readonly DEV?: boolean } | undefined;
  if (env?.DEV !== true || typeof location === 'undefined') return null;
  const pedido = new URLSearchParams(location.search).get('nivel');
  if (pedido === '0' || pedido === '1' || pedido === '2' || pedido === '3') return Number(pedido) as NivelDeCalidad;
  return null;
}
let nivelForzado: NivelDeCalidad | null = nivelDeLaDireccion();
const oyentesDelNivel = new Set<() => void>();

/** Fuerza un nivel en todos los lienzos que usen el gancho sin `fijo` (o lo suelta con `null`). */
export function forzarElNivel(nivel: NivelDeCalidad | null): void {
  nivelForzado = nivel;
  for (const avisar of oyentesDelNivel) avisar();
}

function suscribirAlNivel(avisar: () => void): () => void {
  oyentesDelNivel.add(avisar);
  return () => {
    oyentesDelNivel.delete(avisar);
  };
}

export function usarElNivel(opciones: OpcionesDelNivel = {}): ElNivel {
  const gl = useThree((s) => s.gl);
  const setDpr = useThree((s) => s.setDpr);
  const forzado = useSyncExternalStore(suscribirAlNivel, () => nivelForzado, () => null);
  const fijo = opciones.fijo ?? forzado;
  const recordar = opciones.recordar !== false;

  /* El sondeo va en caché por renderizador: repetirlo (modo estricto) no vuelve a pintar nada. */
  const capacidades = useMemo(() => sondearElAparato(gl), [gl]);
  const sondeo = useMemo(() => veredictoDelSondeo(capacidades), [capacidades]);
  const dprDelAparato = capacidades.pantalla.dpr;

  const arrancar = (): EstadoDelGobernador => {
    const recuerdo = recordar ? leerElRecuerdo(leerDelAlmacen(LLAVE_DEL_RECUERDO)) : null;
    const inicial = arranqueConRecuerdo(sondeo.inicial, sondeo.techo, capacidades.grafica, recuerdo);
    return gobernadorNuevo({ inicial, techo: sondeo.techo, dprDelAparato });
  };
  const gobernador = useRef<EstadoDelGobernador | null>(null);
  if (gobernador.current === null) gobernador.current = arrancar();

  const ultimo = useRef<LoUltimoMedido>(NADA_MEDIDO);
  const alCambiar = useRef(opciones.alCambiar);
  alCambiar.current = opciones.alCambiar;
  const nivelQuieto = useRef(opciones.nivelQuieto);
  nivelQuieto.current = opciones.nivelQuieto;

  const [donde, setDonde] = useState<{ readonly nivel: NivelDeCalidad; readonly dpr: number }>(() =>
    fijo !== null ? fijoEn(fijo, dprDelAparato) : { nivel: gobernador.current?.nivel ?? 1, dpr: gobernador.current === null ? 1 : dprDe(gobernador.current) },
  );

  /* Al forzar un nivel, o al soltarlo: con `null` el gobernador vuelve a empezar (ver la cabecera). */
  const fijoAntes = useRef(fijo);
  useEffect(() => {
    if (fijoAntes.current === fijo) return;
    fijoAntes.current = fijo;
    if (fijo !== null) {
      setDonde(fijoEn(fijo, dprDelAparato));
      return;
    }
    const nuevo = arrancar();
    gobernador.current = nuevo;
    setDonde({ nivel: nuevo.nivel, dpr: dprDe(nuevo) });
    // `arrancar` lee lo mismo que ya está en las dependencias de su resultado; no hace falta en la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fijo, dprDelAparato]);

  useEffect(() => {
    if (opciones.aplicarDpr === false) return;
    setDpr(donde.dpr);
  }, [donde.dpr, opciones.aplicarDpr, setDpr]);

  useFrame((estado, deltaSegundos) => {
    const cuenta = laCuentaDe(estado.gl);
    const info = estado.gl.info.render;
    /* Un fotograma sin la escena (se compila en bloque: ver `precompilar.ts`) tampoco dice nada del aparato. */
    const oculta = (typeof document !== 'undefined' && document.visibilityState === 'hidden') || compilandoEnBloque(estado.scene);
    const medido: LoUltimoMedido = {
      ms: deltaSegundos * 1000,
      oculta,
      llamadasDeLaEscena: cuenta?.llamadasDeLaEscena ?? info.calls,
      triangulosDeLaEscena: cuenta?.triangulosDeLaEscena ?? info.triangles,
      llamadas: cuenta?.llamadas ?? info.calls,
      triangulos: cuenta?.triangulos ?? info.triangles,
    };
    ultimo.current = medido;
    if (fijo !== null || gobernador.current === null) return;

    const paso = gobernar(gobernador.current, {
      ms: medido.ms,
      oculta,
      llamadas: medido.llamadasDeLaEscena,
      triangulos: medido.triangulosDeLaEscena,
      nivelQuieto: nivelQuieto.current?.() === true,
    });
    gobernador.current = paso.estado;
    const cambio = paso.cambio;
    if (cambio === null) return;
    if (cambio.de.nivel !== cambio.a.nivel || cambio.de.dpr !== cambio.a.dpr) setDonde(cambio.a);
    /*
     * El recuerdo: el nivel que aguantó (prueba superada) o el que quedó tras bajar (el de arriba
     * falló aquí), salvo que la bajada viniera de fotogramas frenados (`seRecuerda`). Subir a prueba no
     * se recuerda: todavía no ha demostrado nada.
     */
    if (recordar && seRecuerda(cambio)) {
      escribirEnElAlmacen(LLAVE_DEL_RECUERDO, JSON.stringify(recuerdoDe(cambio.a.nivel, capacidades.grafica)));
    }
    alCambiar.current?.(cambio);
  });

  /* Los programas del nivel nuevo, pedidos a la vez (ver la cabecera). */
  const esconder = useRef(opciones.esconderAlCompilar);
  esconder.current = opciones.esconderAlCompilar;
  usarLaPrecompilacionAlCambiar(`${String(donde.nivel)}|${opciones.claveDelBloque ?? ''}`, () => esconder.current?.() !== false);

  const gobernadorLeido = gobernador as { readonly current: EstadoDelGobernador };
  return useMemo<ElNivel>(
    () => ({
      nivel: donde.nivel,
      calidad: calidadDeFuera(donde.nivel),
      dpr: donde.dpr,
      palancas: TABLA_DE_NIVELES[donde.nivel],
      capacidades,
      sondeo,
      gobernador: gobernadorLeido,
      ultimo,
    }),
    [donde, capacidades, sondeo, gobernadorLeido],
  );
}

function fijoEn(nivel: NivelDeCalidad, dprDelAparato: number): { readonly nivel: NivelDeCalidad; readonly dpr: number } {
  return { nivel, dpr: escaleraDeDpr(nivel, dprDelAparato)[0] ?? 1 };
}

/*
 * El almacén del navegador puede no estar (ventana privada, datos bloqueados, una vista previa) o
 * lanzar al tocarlo: cada acceso va protegido y fallar es lo mismo que no tener recuerdo.
 */
function leerDelAlmacen(llave: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(llave);
  } catch {
    return null;
  }
}

function escribirEnElAlmacen(llave: string, valor: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(llave, valor);
  } catch {
    /* Sin almacén no hay recuerdo; la noche sigue igual. */
  }
}
