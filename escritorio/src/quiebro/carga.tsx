/**
 * LA CARGA DEL JUEGO, DESDE DENTRO DEL LIENZO: cuánto falta para poder jugar de verdad, y cuándo ya se puede.
 *
 * ═══ QUÉ ES «YA SE PUEDE JUGAR» ═══
 *
 * El menú de la noche es DOM y sale en cuanto `<Quiebro>` monta; la escena no. Detrás del menú quedan:
 *
 *   · LOS PERSONAJES: sus `.glb` los baja `personajes/almacen.ts` con el `GLTFLoader` de three, que avisa por
 *     el `DefaultLoadingManager` (cuántos van y cuántos faltan). Unos megas: en un teléfono con datos, lo que
 *     más tarda después del código.
 *   · LOS GRÁFICOS: con la caché de sombreadores fría, la escena se compila «en bloque» (`calidad/precompilar.ts`)
 *     y mientras tanto no se pinta; medido el 26-sep, de 1,7 a 8 s en la portada. Se sabe con
 *     `compilandoEnBloque(escena)`.
 *
 * `jugable` es: nada bajando, nada compilándose, y así `FOTOGRAMAS_QUIETOS` fotogramas seguidos (lo que llega a
 * trozos —la ciudad, un cuerpo que termina de bajar— rompe la racha y se vuelve a contar). No hay plazo: si
 * nunca se queda quieto, la barra lo dice y el anfitrión, a los 3 minutos, también.
 *
 * El seguidor (`SeguidorDeLaCarga`) no sabe de three ni de React, y `verify:quiebro-juego` lo ejercita a mano.
 */
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { DefaultLoadingManager } from 'three';
import { compilandoEnBloque } from './calidad/precompilar';
import type { EtapaDeLaCarga } from './contrato';

/** Los fotogramas seguidos sin nada bajando ni compilándose que hacen falta para decir `jugable`. */
export const FOTOGRAMAS_QUIETOS = 20;

/** Lo que se mira en cada fotograma. */
export interface ObservacionDeLaCarga {
  /** Hay algo bajando por el `DefaultLoadingManager`. */
  readonly bajando: boolean;
  readonly bajados: number;
  readonly total: number;
  /** La escena se está compilando en bloque (no se pinta). */
  readonly compilando: boolean;
}

export type PasoDeLaCarga = { readonly fraccion: number; readonly etapa: EtapaDeLaCarga; readonly que: string } | 'jugable' | null;

/**
 * Del juego montado (0,76) a jugable (1). Los tramos SE SUMAN, no se turnan: los personajes hasta 0,16 por lo
 * bajado, los gráficos 0,03 en cuanto se han compilado una vez, y la racha quieta hasta 0,04. Se turnaban al
 * principio y, como los gráficos se compilan ANTES de que empiecen a bajar los personajes, la barra se quedaba
 * en 90 % mientras bajaban 32 `.glb` (visto con el fotógrafo y la red estrangulada, 27-sep).
 */
export class SeguidorDeLaCarga {
  private quietos = 0;
  private compilo = false;
  private hecho = false;

  /** Un fotograma: lo que la barra dice ahora, `'jugable'` una sola vez, y luego `null`. */
  paso(o: ObservacionDeLaCarga): PasoDeLaCarga {
    if (this.hecho) return null;
    if (o.compilando) this.compilo = true;
    const personajes = o.total > 0 ? Math.min(1, Math.max(0, o.bajados / o.total)) : 0;
    const base = 0.76 + 0.16 * personajes + (this.compilo ? 0.03 : 0);
    if (o.bajando && o.total > 0) {
      this.quietos = 0;
      return { fraccion: base, etapa: 'personajes', que: `los personajes (${String(o.bajados)} de ${String(o.total)})` };
    }
    if (o.compilando) {
      this.quietos = 0;
      return { fraccion: base, etapa: 'graficos', que: 'los gráficos' };
    }
    this.quietos++;
    if (this.quietos >= FOTOGRAMAS_QUIETOS) {
      this.hecho = true;
      return 'jugable';
    }
    return { fraccion: base + 0.04 * (this.quietos / FOTOGRAMAS_QUIETOS), etapa: 'graficos', que: 'los últimos detalles' };
  }
}

/* ─── Lo que dice el `DefaultLoadingManager`, sin quitarle nada a quien ya lo escuchara ─── */

const CUENTA = { bajando: false, bajados: 0, total: 0 };
let enganchada = false;

function engancharLaCuenta(): void {
  if (enganchada) return;
  enganchada = true;
  const m = DefaultLoadingManager;
  const alEmpezar = m.onStart;
  const alAvanzar = m.onProgress;
  const alAcabar = m.onLoad;
  m.onStart = (url: string, bajados: number, total: number) => {
    CUENTA.bajando = true;
    CUENTA.bajados = bajados;
    CUENTA.total = total;
    alEmpezar?.(url, bajados, total);
  };
  m.onProgress = (url: string, bajados: number, total: number) => {
    CUENTA.bajados = bajados;
    CUENTA.total = total;
    CUENTA.bajando = bajados < total;
    alAvanzar?.(url, bajados, total);
  };
  m.onLoad = () => {
    CUENTA.bajando = false;
    alAcabar?.();
  };
}

/* El gancho, en cuanto se carga este módulo: los personajes empiezan a bajar al montar, antes del primer fotograma. */
engancharLaCuenta();

export interface PropsDelVigia {
  readonly alPreparar: (fraccion: number, etapa: EtapaDeLaCarga, que: string) => void;
  readonly alJugable: () => void;
}

/** DENTRO DEL LIENZO: mira cada fotograma y avisa. Sin pintar nada, con la prioridad 0 (no toca el orden). */
export function VigiaDeLaCarga({ alPreparar, alJugable }: PropsDelVigia): null {
  const escena = useThree((s) => s.scene);
  const seguidor = useMemo(() => new SeguidorDeLaCarga(), []);
  useEffect(() => {
    alPreparar(0.76, 'ciudad', 'la ciudad');
  }, [alPreparar]);
  useFrame(() => {
    const paso = seguidor.paso({ ...CUENTA, compilando: compilandoEnBloque(escena) });
    if (paso === null) return;
    if (paso === 'jugable') alJugable();
    else alPreparar(paso.fraccion, paso.etapa, paso.que);
  });
  return null;
}
