/**
 * LA RAÍZ DE LOS EFECTOS: monta todas las piezas y marca el paso del reloj.
 *
 * ═══ CÓMO LA USA EL JUEGO ═══
 *
 *     const sistema = usarElSistemaDeEfectos();
 *     …
 *     <Canvas>
 *       <EfectosDelQuiebro sistema={sistema} nivel={nivel} />
 *     </Canvas>
 *     …
 *     // al llegar un `anuncio` del canal (con `t` ya en el reloj del aparato):
 *     sistema.anillos.anunciar({ inicio: performance.now(), impacto: t, amenaza: 'celador', propio: true, sobre: yo });
 *     // al quebrar en limpio (veredicto del servidor):
 *     sistema.reloj.remansar(performance.now());
 *
 * El sistema es un objeto de siempre, no estado de React (ver `sistema.ts`), y vive lo que viva el
 * componente que lo crea. El juego le pone `localizar` para que los anillos y las líneas sigan a
 * los cuerpos.
 *
 * ═══ EL PASO DEL RELOJ, UNA VEZ POR FOTOGRAMA Y ANTES QUE NADIE ═══
 *
 * `sistema.fotograma(performance.now())` corre con prioridad −1, antes de los `useFrame` normales:
 * todas las piezas leen el MISMO `ahora` (verdadero y presentado) en el fotograma, y lo que terminó
 * se suelta antes de pintar. Leer `performance.now()` en cada pieza daría instantes distintos en el
 * mismo fotograma y, en el anillo, un cierre que no coincide con el de la línea de al lado.
 *
 * ═══ EL NIVEL ═══
 *
 * Lo manda el gobernador (`calidad/`, de otro frente) como prop. Cambiarlo no rehace ninguna malla:
 * cada pieza reserva la capacidad del nivel más alto y el nivel sólo dice cuántas instancias se
 * pintan. El atlas se suelta al desmontar la raíz.
 */
import { useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import { AnillosDelAnuncio } from './anillos';
import { soltarElAtlas } from './atlas';
import { ChispasDeImpacto, EsquirlasAmbar } from './chispas';
import { Hilos } from './hilos';
import type { Nivel } from './presupuesto';
import { crearRelojDePresentacion, rejillaDelRemanso } from './reloj';
import { UNIFORMES_DE_LA_CIUDAD } from '../ciudad/retoques';
import type { SistemaDeEfectos } from './sistema';
import { crearSistemaDeEfectos } from './sistema';
import { CieloDeGrafia, MarcoDelBis, MuroDelBis, PantallasDeGrafia, SiluetasDeGrafia } from './tapices';
import { Ondas, Trazos } from './trazos';

/** Crea el sistema de efectos una vez por montaje, con su reloj de presentación. */
export function usarElSistemaDeEfectos(): SistemaDeEfectos {
  return useMemo(() => crearSistemaDeEfectos(crearRelojDePresentacion(), performance.now()), []);
}

export interface PropsDeLosEfectos {
  readonly sistema: SistemaDeEfectos;
  readonly nivel: Nivel;
  /** Siembra las columnas del cielo; el barrio de la noche da una. */
  readonly semillaDelCielo?: number;
  /** Sin cielo de Grafía (si `atmosfera/` pinta el suyo o en bancos que no lo quieren). */
  readonly sinCielo?: boolean;
}

export function EfectosDelQuiebro({ sistema, nivel, semillaDelCielo = 1, sinCielo = false }: PropsDeLosEfectos): JSX.Element {
  useFrame(() => {
    sistema.nivel = nivel;
    const ahora = performance.now();
    sistema.fotograma(ahora);
    /* El pico del Remanso: las fachadas enseñan su rejilla de glifos (el uniforme es de la ciudad). */
    UNIFORMES_DE_LA_CIUDAD.uRejillaDeGlifos.value = rejillaDelRemanso(sistema.reloj.ultimoInicio(), ahora);
  }, -1);
  useEffect(() => () => soltarElAtlas(), []);

  return (
    <group name="efectos-del-quiebro">
      {sinCielo ? null : <CieloDeGrafia sistema={sistema} semilla={semillaDelCielo} />}
      <PantallasDeGrafia sistema={sistema} />
      <MuroDelBis sistema={sistema} />
      <SiluetasDeGrafia sistema={sistema} />
      <Hilos sistema={sistema} />
      <EsquirlasAmbar sistema={sistema} />
      <ChispasDeImpacto sistema={sistema} />
      <Ondas sistema={sistema} />
      <Trazos sistema={sistema} />
      <AnillosDelAnuncio sistema={sistema} />
      <MarcoDelBis sistema={sistema} />
    </group>
  );
}
