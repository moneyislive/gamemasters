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
 *
 * ═══ COMPILADOS ANTES DE HACER FALTA ═══
 *
 * Casi todos los efectos se pintan de tarde en tarde (el muro del Bis, sólo en un Bis), y three compila el
 * programa de un material la primera vez que lo pinta, esperando al compilador en ese fotograma: el muro, con
 * sus dos caras, eran 49 ms en el primer Bis de la noche (revisión de rendimiento del 24-sep). Al montarse, en
 * el primer pintado principal, se piden los programas de TODOS (también de lo que no se ve, y las dos caras de
 * lo que tiene dos: `renderer.compile` lo hace como el pintado): el compilador los hace mientras tanto y el
 * primer Bis ya los encuentra. Tras cada cambio de nivel los vuelve a pedir `usarLaPrecompilacionAlCambiar`
 * (`calidad/precompilar.ts`), con el estado nuevo del renderizador.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { usarAlPintarLaEscena } from '../calidad/precompilar';
import { AnillosDelAnuncio } from './anillos';
import { soltarElAtlas } from './atlas';
import { ChispasDeImpacto, EsquirlasAmbar } from './chispas';
import { Hilos } from './hilos';
import type { Nivel } from './presupuesto';
import { evaluarLosRayos } from './rayo';
import { RayosDelRayo } from './rayos';
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
  /**
   * SÓLO PARA LOS BANCOS: el reloj de los efectos (ms en la escala de `performance.now()`). El banco del rayo lo
   * fija para fotografiar un instante exacto; sin él, `performance.now()`, como en el juego.
   */
  readonly reloj?: () => number;
}

export function EfectosDelQuiebro({ sistema, nivel, semillaDelCielo = 1, sinCielo = false, reloj }: PropsDeLosEfectos): JSX.Element {
  useFrame(() => {
    sistema.nivel = nivel;
    const ahora = reloj === undefined ? performance.now() : reloj();
    sistema.fotograma(ahora);
    /* El rayo: las manos de quien carga, las luces del destello y lo que pone en la imagen (`rayo.ts`). */
    evaluarLosRayos(sistema, ahora);
    /* El pico del Remanso: las fachadas enseñan su rejilla de glifos (el uniforme es de la ciudad). */
    UNIFORMES_DE_LA_CIUDAD.uRejillaDeGlifos.value = rejillaDelRemanso(sistema.reloj.ultimoInicio(), ahora);
  }, -1);
  useEffect(() => () => soltarElAtlas(), []);

  /* Los programas de todos los efectos, pedidos en el primer pintado principal (ver la cabecera). */
  const grupo = useRef<THREE.Group>(null);
  const porCompilar = useRef(true);
  usarAlPintarLaEscena((gl, escena, camara) => {
    const g = grupo.current;
    if (!porCompilar.current || g === null) return;
    porCompilar.current = false;
    gl.compile(g, camara, escena);
  });

  return (
    <group name="efectos-del-quiebro" ref={grupo}>
      {sinCielo ? null : <CieloDeGrafia sistema={sistema} semilla={semillaDelCielo} />}
      <PantallasDeGrafia sistema={sistema} />
      <MuroDelBis sistema={sistema} />
      <SiluetasDeGrafia sistema={sistema} />
      <Hilos sistema={sistema} />
      <EsquirlasAmbar sistema={sistema} />
      <ChispasDeImpacto sistema={sistema} />
      <Ondas sistema={sistema} />
      <Trazos sistema={sistema} />
      <RayosDelRayo sistema={sistema} />
      <AnillosDelAnuncio sistema={sistema} />
      <MarcoDelBis sistema={sistema} />
    </group>
  );
}
