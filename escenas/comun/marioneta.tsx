/**
 * LA MARIONETA EN REACT: traer la figura, montarla, soltarla y pintarla, una vez para todas las escenas.
 *
 * ═══ POR QUÉ ESTO ES UN FICHERO Y NO SEIS TROZOS ═══
 *
 * `aventureros/marioneta.ts` es la aritmética —clonar la figura, montarle el mezclador, fundir de un
 * clip a otro, soltar el esqueleto— y no sabe nada de React. Encima de ella había SEIS envoltorios
 * casi iguales: el amarre del Muelle, el puesto de la Plaza, el aventurero del Burgo, el que está de
 * pie en La Linde Alta, quien anda y los demás del paseo. Cada uno montaba a su manera y no hacían lo
 * mismo:
 *
 *   · Tres montaban en el pintado (`useMemo`) y tres en un efecto, con un estado más y un pintado de
 *     más para enseñar lo que ya tenían.
 *   · Los tres del pintado clonaban la figura entera —y la tiraban— cada vez que llegaba una sin que
 *     hubiera llegado todavía la biblioteca de clips, que es lo normal al abrir.
 *   · Los tres del efecto decían por consola que una figura había llegado sin `reposo-a`; los otros
 *     tres se callaban, y un respaldo mudo es un fallo que nadie ve.
 *   · Y dos de ellos, quien anda y los demás, traían la figura y los clips con el mismo efecto copiado.
 *
 * Aquí está lo bueno de cada uno, una vez:
 *
 *   · `usarLaFigura` pide al cargador de la escena la figura y la biblioteca, sin tumbar nada si no
 *     llegan: lo dice quien la usa, que sabe si eso es un fallo de la escena o sólo una consola.
 *   · `usarMarioneta` la monta EN EL PINTADO en que llegan las dos cosas —ni un clon antes de tener
 *     clips—, la suelta al cambiar o al irse, y avisa si la biblioteca no trae `reposo-a`.
 *   · `<Marioneta>` pinta el grupo que se coloca y se gira, con la figura dentro y lo que cuelgue de
 *     ella (su disco de contacto). Sin marioneta no pinta NADA: ni la figura, que sería la T, ni su
 *     disco, que sería una sombra sin nadie encima.
 *
 * Lo que NO está aquí, a propósito: DÓNDE está la figura, hacia dónde mira y qué clip suena. Eso es de
 * cada escena —un amarre, una casilla, un camino, una pose que llega por la red— y lo decide en su
 * propio `useFrame` con `reproduce` y el mezclador de la marioneta que le devuelve `usarMarioneta`. Si
 * ese `useFrame` viviera aquí, correría ANTES que el de la escena (los hijos se apuntan antes que los
 * padres) y cada fotograma pintaría la pose del anterior.
 *
 * ═══ NUNCA T-POSE ═══
 *
 * La pose de enlace del rig ES la T. `montaMarioneta` devuelve `null` si no hay `reposo-a` que
 * reproducir, y entonces aquí no se pinta nada: se ve el sitio un instante antes que a su dueño, que es
 * lo que se vería en cualquier sitio de verdad.
 *
 * `import * as React` va a propósito: los comprobadores cargan los `.tsx` con `tsx`, que usa el runtime
 * clásico de JSX, y sin él un componente de aquí revienta sólo en la batería.
 */
import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX, ReactNode, Ref } from 'react';
import type { AnimationClip, Group } from 'three';
import { cargadorPara } from '../embarcadero/cargar';
import type { AventureroCargado } from '../embarcadero/cargar';
import type { FiguraId } from '../embarcadero/figuras';
import type { Traer } from '../embarcadero/tipos';
import { desmontaMarioneta, montaMarioneta } from '../aventureros/marioneta';
import type { Marioneta as MarionetaMontada } from '../aventureros/marioneta';

/** Qué no llegó, para quien decide qué decir: la figura, o la biblioteca de clips. */
export type LoQueNoLlego = 'figura' | 'clips';

/**
 * TRAE UNA FIGURA Y LA BIBLIOTECA con el cargador de la escena (`cargadorPara`, uno por `traer` y una
 * promesa por ruta: seis asientos con el mismo caballero son un fichero). Mientras viajan, `null` y una
 * biblioteca vacía; si una falla, se le dice a `alFallar` y lo demás sigue. Al cambiar de figura la
 * de antes se queda hasta que llega la nueva, y nada se escribe después de desmontar.
 */
export function usarLaFigura(
  traer: Traer,
  figura: FiguraId,
  alFallar: (que: LoQueNoLlego, motivo: string) => void,
): { readonly cargado: AventureroCargado | null; readonly biblioteca: readonly AnimationClip[] } {
  const [cargado, ponerCargado] = useState<AventureroCargado | null>(null);
  const [biblioteca, ponerBiblioteca] = useState<readonly AnimationClip[]>([]);
  /* Por referencia: un aviso nuevo no vuelve a pedir la figura, sólo se usa en el siguiente fallo. */
  const fallar = useRef(alFallar);
  fallar.current = alFallar;
  useEffect(() => {
    let vivo = true;
    const cargador = cargadorPara(traer);
    const porQue = (e: unknown): string => (e instanceof Error ? e.message : String(e));
    void cargador
      .aventurero(figura)
      .then((a) => {
        if (vivo) ponerCargado(a);
      })
      .catch((e: unknown) => {
        fallar.current('figura', porQue(e));
      });
    void cargador
      .animaciones()
      .then((clips) => {
        if (vivo) ponerBiblioteca(clips);
      })
      .catch((e: unknown) => {
        fallar.current('clips', porQue(e));
      });
    return () => {
      vivo = false;
    };
  }, [figura, traer]);
  return { cargado, biblioteca };
}

/**
 * MONTA LA MARIONETA de una figura cargada con la biblioteca, en el mismo pintado en que están las
 * dos, y la suelta al cambiar cualquiera de ellas o al desmontar. `null` mientras falte algo.
 *
 * Si la biblioteca ha llegado y aun así no hay marioneta, es que no trae `reposo-a`: se dice por
 * consola, con `loQueSePierde` —lo que el que mira deja de ver— al final de la frase.
 */
export function usarMarioneta(
  cargado: AventureroCargado | null | undefined,
  biblioteca: readonly AnimationClip[],
  loQueSePierde = 'no se pinta',
): MarionetaMontada | null {
  const marioneta = useMemo(
    () => (cargado === null || cargado === undefined || biblioteca.length === 0 ? null : montaMarioneta(cargado, biblioteca)),
    [cargado, biblioteca],
  );
  const aviso = useRef(loQueSePierde);
  aviso.current = loQueSePierde;
  useEffect(() => {
    if (marioneta !== null) {
      return () => {
        desmontaMarioneta(marioneta);
      };
    }
    if (cargado !== null && cargado !== undefined && biblioteca.length > 0) {
      console.warn(`La figura ${cargado.figura} ha llegado sin el clip de reposo: ${aviso.current}.`);
    }
    return undefined;
  }, [marioneta, cargado, biblioteca]);
  return marioneta;
}

export interface PropsDeLaMarioneta {
  /** La marioneta de `usarMarioneta`, o `null`: entonces no se pinta nada, ni lo que cuelgue de ella. */
  readonly de: MarionetaMontada | null;
  /** El grupo que se coloca, se gira y se enseña. Lo mueve quien la usa, en su `useFrame`. */
  readonly grupo?: Ref<Group>;
  /** Cómo nace el grupo: `false` si la escena lo enseña en su primer fotograma, y no antes. */
  readonly visible?: boolean;
  /** Lo que va pegado a la figura, como su disco de contacto. */
  readonly children?: ReactNode;
}

/** La figura montada, dentro del grupo que se mueve. Ver la cabecera. */
export function Marioneta({ de, grupo, visible, children }: PropsDeLaMarioneta): JSX.Element | null {
  if (de === null) return null;
  return (
    <group ref={grupo} visible={visible}>
      <primitive object={de.raiz} />
      {children}
    </group>
  );
}
