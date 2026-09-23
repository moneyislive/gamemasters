/**
 * QUIEN PASEA POR EL DELTA: el paseo común montado sobre Riberas.
 *
 * ═══ AQUÍ NO SE ANDA: SE DECLARA ═══
 *
 * El paso, los choques, el borde, las cámaras de a pie y la marioneta son del paseo común
 * (`escenas/paseo/`), el mismo que anda Las Lindes. Riberas no escribe ni un paso: le da su
 * MUNDO —`mundoDeRiberas`, derivado de la vista pública igual que lo derivará el servidor en
 * Boots on Board—, de qué sitio se nace, y a qué altura está lo que se pisa. Es el patrón de la
 * casa, el juego declara y el motor consume (`docs/TABLERO-RECORRIBLE.md` §4), y es lo que hace
 * que en el delta se choque con las chozas y las torres, se vadee la orilla a paso de agua y no
 * se entre en lo hondo sin que este fichero sepa qué es un choque.
 *
 * ═══ EL MUNDO SE DERIVA A PIE, Y SÓLO CUANDO CAMBIA ═══
 *
 * Mirando la mesa no se deriva: nadie lo usa, y ahí se pasa casi toda la partida. A pie se deriva
 * cuando llega una vista nueva —una por revisión, no una por fotograma— y, si sale el mismo
 * mundo, se entrega EL MISMO objeto (`firmaDelMundo`): el paseo rehace su arena por identidad, y
 * una tirada de dados no tiene por qué rehacer el índice de cajones. Medido en Node, con una mesa
 * de cuatro a media partida: 1,3 ms el mundo y 0,7 ms la arena.
 *
 * ═══ SE NACE JUNTO A LO SUYO ═══
 *
 * `mundoDeRiberas` declara seis sitios, uno por colono en el orden de asiento, en tierra firme
 * junto a su primera choza y mirando al centro. Aquí se elige el del asiento de quien mira; quien
 * mira sin estar sentado nace en el primero. Ver `sitioDeNacer`.
 *
 * ═══ LA ALTURA SIGUE A LO PINTADO, Y EN EL AGUA SE HUNDE ═══
 *
 * La cuenta y sus medidas están en `delta-a-pie.ts`: en tierra, la cara de su tesela (y lo que
 * sube la rampa); en el agua que se pinta —el mar del vado, los ríos y los lagos—, la lámina
 * menos la cintura. La cámara se apoya en esa misma altura, así que en el agua los ojos bajan
 * con el cuerpo y no se quedan flotando a la altura de la playa.
 *
 * ═══ A PIE, LA NIEBLA Y EL FONDO SON DEL PASEO; EN LA MESA, DE QUIEN MONTA ═══
 *
 * La niebla de la mesa la mueve el cliente en cada fotograma (el `Ojo` de la app, la
 * `CamaraAerea` del escritorio) y a pie no corre. Así que al bajar se pone la de a pie
 * (`NIEBLA_A_PIE`) y el fondo de la cámara en su canto, que lo que queda detrás ya es del color
 * del cielo; y al subir se devuelve el fondo que había. La niebla no se devuelve: la vuelve a
 * poner en su primer fotograma quien mira la mesa.
 *
 * ═══ Y EL CANAL DE BOOTS ON BOARD, CUANDO LLEGUE, ENTRA POR DONDE EN LAS LINDES ═══
 *
 * La estructura es la de `Lindes.tsx` a propósito: un `usarElPaseo` con sus dos costuras y la
 * marioneta a pie. Enchufar el canal son las tres piezas que allí ya están: `usarElCanal` antes
 * del paseo con una referencia para corregir, su `alDarUnTic` en las opciones del paseo, y
 * `LosDemas` junto a `QuienAnda` con ESTA MISMA `alturaEn`, para que los demás también vadeen con
 * el agua por la cintura. No se escribe hoy: la prop es del frente del canal.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { mundoDeRiberas } from '../shared/arcade/juegos/riberas-mundo';
import type { MundoDeclarado } from '../shared/mecanicas/mundo';
import type { Traer } from './embarcadero/tipos';
import type { MandosDeFuera } from './paseo/mandos';
import { QuienAnda } from './paseo/quien-anda';
import { usarElPaseo } from './paseo/usar-el-paseo';
import type { Relieve } from './relieve';
import {
  alturaAPie,
  colonoDeQuienMira,
  firmaDelMundo,
  NIEBLA_A_PIE,
  sitioDeNacer,
  sueloPintadoDe,
} from './delta-a-pie';
import type { ModoDeCamaraDelDelta } from './delta-a-pie';

export interface AndarPorElDeltaProps {
  /** El relieve que ya pinta la escena: de él sale la altura, y no se vuelve a levantar. */
  readonly relieve: Relieve;
  /** La vista pública de la mesa, tal cual llega. De ella se deriva el mundo con el que se choca. */
  readonly vista: unknown;
  readonly camara: ModoDeCamaraDelDelta;
  readonly traer: Traer;
  /** La figura que eligió quien pasea; sin ella, `figuraQueSePinta` saca una de su asiento. */
  readonly figura?: string;
  /** La palanca y el correr de la app. El escritorio anda con el teclado, que lee el paseo. */
  readonly mandos?: { readonly current: MandosDeFuera };
}

export function AndarPorElDelta({ relieve, vista, camara, traer, figura, mandos }: AndarPorElDeltaProps): JSX.Element | null {
  const aPie = camara.modo !== 'mesa';
  const asiento = camara.modo === 'mesa' ? '' : camara.asiento;

  /* ── El mundo, sólo a pie, y el mismo objeto mientras no cambie ──────────── */
  const mundoVisto = useRef<{ readonly firma: number; readonly mundo: MundoDeclarado } | null>(null);
  const mundo = useMemo(() => {
    if (!aPie) return null;
    const nuevo = mundoDeRiberas(vista);
    const firma = firmaDelMundo(nuevo);
    const antes = mundoVisto.current;
    if (antes !== null && antes.firma === firma) return antes.mundo;
    mundoVisto.current = { firma, mundo: nuevo };
    return nuevo;
  }, [aPie, vista]);

  /* ── Dónde se nace: el sitio del colono de quien mira ────────────────────── */
  const colono = useMemo(() => colonoDeQuienMira(vista, asiento), [vista, asiento]);
  const nace = useMemo(() => (mundo === null ? null : sitioDeNacer(mundo, colono)), [mundo, colono]);

  /* ── A qué altura se pinta: lo que pinta el relieve, con el agua por la cintura ── */
  const suelo = useMemo(() => sueloPintadoDe(relieve), [relieve]);
  const alturaEn = useCallback((x: number, z: number) => alturaAPie(suelo, x, z), [suelo]);

  const paseo = usarElPaseo({ mundo, nace, modo: camara.modo, mandos, alturaEn });

  /* ── A pie, el fondo de la cámara en el canto de la niebla; al subir, el de antes ── */
  const laCamara = useThree((s) => s.camera);
  const laEscena = useThree((s) => s.scene);
  useEffect(() => {
    const c = laCamara as THREE.PerspectiveCamera;
    if (!aPie || c.isPerspectiveCamera !== true) return undefined;
    const fondoDeLaMesa = c.far;
    c.far = NIEBLA_A_PIE.lejos;
    c.updateProjectionMatrix();
    return () => {
      c.far = fondoDeLaMesa;
      c.updateProjectionMatrix();
    };
  }, [aPie, laCamara]);
  useFrame(() => {
    if (!aPie) return;
    const niebla = laEscena.fog;
    if (niebla instanceof THREE.Fog) {
      niebla.near = NIEBLA_A_PIE.cerca;
      niebla.far = NIEBLA_A_PIE.lejos;
    }
  });

  /*
   * Si la figura no llega se anda igual, sin verla: el delta no cae al retablo por un
   * aventurero. Se dice, porque un respaldo mudo es un fallo que nadie ve.
   */
  const alFallarLaFigura = useCallback((motivo: string) => {
    console.warn(`La figura de quien pasea no ha llegado (${motivo}): se anda por el delta sin verla.`);
  }, []);

  if (!aPie) return null;
  return (
    <QuienAnda
      traer={traer}
      asiento={asiento}
      figura={figura}
      pose={paseo.pose}
      enPrimeraPersona={camara.modo === 'ojos'}
      alFallar={alFallarLaFigura}
    />
  );
}
