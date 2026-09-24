/**
 * LAS CHISPAS DE LOS IMPACTOS Y LAS ESQUIRLAS ÁMBAR: lo que hay a cientos y no decide nada.
 *
 * ═══ LA CPU ESCRIBE AL NACER, Y NO VUELVE A TOCARLAS ═══
 *
 * Una chispa sale de un sitio con una velocidad en un instante, y a partir de ahí es física de
 * libro (gravedad y un freno de aire) que el sombreador calcula con el tiempo. Una esquirla salta
 * desde el cuerpo, flota, gira y, si alguien la recoge, sube hacia su pecho y se apaga: también
 * sale del tiempo. Así que en cada fotograma estas piezas NO recorren sus instancias: suben a la GPU
 * sólo el tramo que `sistema.ts` apuntó como sucio al escribir (los arrays son los mismos) y ponen el
 * reloj. Cien chispas o trescientas cuestan lo mismo en la CPU: nada.
 *
 * Las dos van en el reloj PRESENTADO: en el Remanso las chispas se quedan colgadas en el aire y las
 * esquirlas giran despacio. Las esquirlas son señal de juego (se recogen pasando cerca) y por eso
 * su número no cambia con el nivel; las chispas sí.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import { subirElTramo, subirLasPrimeras } from './geometrias';
import { mallaDeEfecto } from './malla';
import { ajuste } from './presupuesto';
import type { SistemaDeEfectos } from './sistema';

export function ChispasDeImpacto({ sistema }: { sistema: SistemaDeEfectos }): JSX.Element {
  const ch = sistema.chispas;
  const pieza = useMemo(
    () =>
      mallaDeEfecto(
        'chispas',
        { aOrigen: 3, aVelocidad: 3, aTiempos: 4, aColor: 3 },
        { datos: { aOrigen: ch.origen, aVelocidad: ch.velocidad, aTiempos: ch.tiempos, aColor: ch.color } },
      ),
    [ch],
  );
  useEffect(() => () => pieza.soltar(), [pieza]);
  const todos = useMemo(() => Object.values(pieza.atributos), [pieza]);

  useFrame(() => {
    if (ch.suciasHasta > ch.suciasDesde) {
      for (const a of todos) subirElTramo(a, ch.suciasDesde, ch.suciasHasta);
      ch.limpiar();
    }
    const s = sistema.segundos(sistema.ahora.presentado);
    (pieza.material.uniforms.uTiempo as { value: number }).value = s;
    pieza.pintar(s < ch.vivasHasta ? Math.min(ch.escritas, ajuste('chispasVivas', sistema.nivel)) : 0);
  });

  return <primitive object={pieza.malla} />;
}

export function EsquirlasAmbar({ sistema }: { sistema: SistemaDeEfectos }): JSX.Element {
  const es = sistema.esquirlas;
  const pieza = useMemo(
    () =>
      mallaDeEfecto(
        'esquirlas',
        { aSitio: 3, aDesde: 3, aHacia: 3, aTiempos: 4 },
        { datos: { aSitio: es.sitio, aDesde: es.desde, aHacia: es.hacia, aTiempos: es.tiempos } },
      ),
    [es],
  );
  useEffect(() => () => pieza.soltar(), [pieza]);
  const todos = useMemo(() => Object.values(pieza.atributos), [pieza]);
  const version = useRef(-1);

  useFrame(() => {
    if (es.version !== version.current) {
      /* Hasta la última ranura visible: las de después no se dibujan; las apagadas de en medio se
         pliegan en el sombreador (visible = 0) y no llegan a pintar un píxel. */
      let alto = 0;
      for (let i = 0; i < es.capacidad; i++) if ((es.tiempos[i * 4 + 3] as number) > 0.5) alto = i + 1;
      for (const a of todos) subirLasPrimeras(a, Math.max(alto, 1));
      pieza.pintar(alto);
      version.current = es.version;
    }
    (pieza.material.uniforms.uTiempo as { value: number }).value = sistema.segundos(sistema.ahora.presentado);
  });

  return <primitive object={pieza.malla} />;
}
