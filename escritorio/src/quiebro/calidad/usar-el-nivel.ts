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
import { useEffect, useMemo, useRef, useState } from 'react';
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
} from './gobernador';
import { sondearElAparato } from './sondeo';
import { laCuentaDe } from './medida';

export interface OpcionesDelNivel {
  /** Un nivel forzado; `null` o sin dar = lo decide el gobernador. */
  readonly fijo?: NivelDeCalidad | null;
  /** Si el gancho aplica el DPR al lienzo (por omisión, sí). */
  readonly aplicarDpr?: boolean;
  /** Si se guarda y se lee el nivel que aguantó en este aparato (por omisión, sí). */
  readonly recordar?: boolean;
  /** Cada cambio del gobernador, para el diagnóstico o para contárselo al jugador. */
  readonly alCambiar?: (cambio: CambioDelGobernador) => void;
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

export function usarElNivel(opciones: OpcionesDelNivel = {}): ElNivel {
  const gl = useThree((s) => s.gl);
  const setDpr = useThree((s) => s.setDpr);
  const fijo = opciones.fijo ?? null;
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
    const oculta = typeof document !== 'undefined' && document.visibilityState === 'hidden';
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
    });
    gobernador.current = paso.estado;
    const cambio = paso.cambio;
    if (cambio === null) return;
    if (cambio.de.nivel !== cambio.a.nivel || cambio.de.dpr !== cambio.a.dpr) setDonde(cambio.a);
    /*
     * El recuerdo: el nivel que aguantó (prueba superada) o el que quedó tras bajar (el de arriba
     * falló aquí). Subir a prueba no se recuerda: todavía no ha demostrado nada.
     */
    if (recordar && (cambio.motivo === 'prueba-superada' || cambio.motivo === 'bajar-nivel' || cambio.motivo === 'prueba-fallida')) {
      escribirEnElAlmacen(LLAVE_DEL_RECUERDO, JSON.stringify(recuerdoDe(cambio.a.nivel, capacidades.grafica)));
    }
    alCambiar.current?.(cambio);
  });

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
