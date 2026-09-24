/**
 * `<Atmosfera>`: cielo, niebla de altura, lluvia, salpicaduras y luces, montados en una escena.
 *
 * ═══ LA NIEBLA LLEGA A TODO, TAMBIÉN A LO QUE NO ES MÍO ═══
 *
 * Al montar y después cada medio segundo se recorre la escena entera y se le pone la niebla de
 * altura a cualquier material que no la lleve (`nieblaEnLaEscena`): los personajes, los anillos, los
 * glifos, lo que monte otro frente. Recorrer unos cientos de objetos dos veces por segundo no se
 * nota; que un muñeco se recortara nítido contra la bruma, sí.
 *
 * Las sombras se encienden en el renderizador desde N2 (sólo la direccional, 40 m). Encenderlas o
 * apagarlas recompila los materiales, así que sólo cambia con el nivel. Y desde N2 también las
 * PROYECTAN los cuerpos con esqueleto (el desvelado, los Celadores, los Prestados cercanos): con la
 * misma pasada que les pone la niebla se les enciende `castShadow`. Sólo a esos: la multitud del rebaño
 * se deforma con una textura de huesos que el pase de sombra de three no lee, y proyectaría la pose de
 * reposo. Es aspecto (una sombra blanda en el suelo al alba), no cambia nada de la partida.
 *
 * ═══ LA LUZ DEL BARRIO ═══
 *
 * `luz` (madrugada de sodio o alba gris, ver `luz-del-barrio.ts`) escribe la paleta compartida
 * (`paleta.ts`): cielo, reflejos, niebla y sus capas, hemisferio, direccional, ventanas, halos,
 * tarjetas, lluvia y la luz de los cuerpos. Son uniformes y propiedades de luces: cambiarla no
 * recompila nada, así que se puede forzar en caliente para mirar las dos.
 *
 * ═══ EL CIELO, LA LLUVIA Y LAS SALPICADURAS, AL CAMBIAR DE NIVEL ═══
 *
 * Se rehacen con el nivel (el cielo fino desde N1, más gotas, salpicaduras desde N2). Antes se soltaba el
 * viejo antes de pintar el nuevo, y three compilaba otra vez programas que ya tenía (la revisión de
 * rendimiento del 24-sep los vio en cada tirón de cambio de nivel). Ahora van en un RELEVO
 * (`calidad/precompilar.ts`): se pinta el que hay hasta que el nuevo está compilado para el pintado de ese
 * momento, y el viejo se suelta después.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RelevoDePieza, guardarLosProgramas, usarAlPintarLaEscena } from '../calidad/precompilar';
import { crearElCielo, UNIFORMES_DEL_CIELO } from './cielo';
import { crearLaLluvia, crearLasSalpicaduras, UNIFORMES_DE_LA_LLUVIA } from './lluvia';
import type { FarolaEncendible } from './luz';
import { LucesDeLaNoche } from './luz';
import type { TiempoDeLaNoche } from './niebla';
import { nieblaEnLaEscena, ponerLaNiebla } from './niebla';
import type { NivelDeLaCiudad } from '../ciudad/tipos';
import { DETALLE_DEL_NIVEL } from '../ciudad/tipos';
import { UNIFORMES_DE_LOS_HALOS } from '../ciudad/halos';
import type { LuzDeLaNoche } from './luz-del-barrio';
import { ponerLaPaleta, UNIFORMES_DE_LA_LUZ } from './paleta';

export interface PropsDeLaAtmosfera {
  readonly tiempo: TiempoDeLaNoche;
  readonly nivel: NivelDeLaCiudad;
  /** Las farolas que pueden encenderse de verdad (N2+): fijas, o las de la ventana de celdas de ahora. */
  readonly farolas: readonly FarolaEncendible[] | (() => readonly FarolaEncendible[]);
  readonly semilla: number;
  /** El tiempo del adorno (el Remanso lo frena). */
  readonly reloj?: () => number;
  /** 1 encendidas, 0 Apagón. */
  readonly farolasEncendidas?: number;
  /** La luz del barrio (ver `luz-del-barrio.ts`); sin ella, la madrugada. */
  readonly luz?: LuzDeLaNoche;
}

const MADRUGADA: LuzDeLaNoche = { luz: 'madrugada', claridad: 0 };

/** Enciende (o apaga) la sombra de los cuerpos con esqueleto: ver la cabecera. */
function sombrasDeLosCuerpos(escena: THREE.Object3D, encendidas: boolean): void {
  escena.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh !== true) return;
    const material = m.material as THREE.Material | THREE.Material[];
    if (Array.isArray(material) || material.name !== 'personaje-quiebro') return;
    if (m.castShadow !== encendidas) m.castShadow = encendidas;
  });
}

/**
 * Lo que pesan los halos según el nivel: desde N1 el posproceso ya pone brillo alrededor de lo que
 * pasa de 1, y el halo pintado encima lo contaría dos veces (la farola de N2 era una bola).
 */
const HALOS_DEL_NIVEL: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 1, 1: 0.85, 2: 0.6, 3: 0.6 };

const FUERZA_DE_LA_LLUVIA: Readonly<Record<TiempoDeLaNoche, number>> = { llovizna: 0.7, aguacero: 1.25, niebla: 0.4 };

export function Atmosfera({ tiempo, nivel, farolas, semilla, reloj, farolasEncendidas = 1, luz = MADRUGADA }: PropsDeLaAtmosfera): JSX.Element {
  const { scene, gl } = useThree();
  const detalle = DETALLE_DEL_NIVEL[nivel];

  useEffect(() => {
    UNIFORMES_DE_LA_LLUVIA.uFuerza.value = FUERZA_DE_LA_LLUVIA[tiempo];
    UNIFORMES_DE_LA_LLUVIA.uVelocidad.value = tiempo === 'aguacero' ? 11 : 9;
  }, [tiempo]);

  useEffect(() => {
    const antes = gl.shadowMap.enabled;
    gl.shadowMap.enabled = detalle.sombras > 0;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    return () => {
      gl.shadowMap.enabled = antes;
    };
  }, [gl, detalle.sombras]);

  const cieloFino = nivel >= 1;
  /* Con su niebla ya puesta: se compilan antes de colgarse (ver la cabecera), y la de después sería otro programa. */
  const cielo = useMemo(() => conNiebla(crearElCielo(cieloFino)), [cieloFino]);
  const lluvia = useMemo(() => conNiebla(crearLaLluvia(detalle.lluvia, semilla)), [detalle.lluvia, semilla]);
  const salpicaduras = useMemo(
    () => (detalle.salpicaduras > 0 ? conNiebla(crearLasSalpicaduras(detalle.salpicaduras, semilla)) : null),
    [detalle.salpicaduras, semilla],
  );
  const luces = useMemo(
    () => new LucesDeLaNoche(farolas, { reales: detalle.lucesReales, sombras: detalle.sombras }),
    [farolas, detalle.lucesReales, detalle.sombras],
  );

  /* Los relevos del cielo, la lluvia y las salpicaduras (ver la cabecera). */
  const relevos = useMemo(
    () => ({ cielo: new RelevoDePieza(new THREE.Group()), lluvia: new RelevoDePieza(new THREE.Group()), salpicaduras: new RelevoDePieza(new THREE.Group()) }),
    [],
  );
  useLayoutEffect(() => relevos.cielo.poner(cielo, () => soltarLaMalla(cielo)), [relevos, cielo]);
  useLayoutEffect(() => relevos.lluvia.poner(lluvia, () => soltarLaMalla(lluvia)), [relevos, lluvia]);
  useLayoutEffect(() => {
    if (salpicaduras === null) relevos.salpicaduras.liberar();
    else relevos.salpicaduras.poner(salpicaduras, () => soltarLaMalla(salpicaduras));
  }, [relevos, salpicaduras]);
  useEffect(
    () => () => {
      relevos.cielo.liberar();
      relevos.lluvia.liberar();
      relevos.salpicaduras.liberar();
    },
    [relevos],
  );
  usarAlPintarLaEscena((gl, escena, camara) => {
    relevos.cielo.enElPintado(gl, escena, camara);
    relevos.lluvia.enElPintado(gl, escena, camara);
    relevos.salpicaduras.enElPintado(gl, escena, camara);
  });
  useEffect(
    () => () => {
      luces.direccional.shadow.map?.dispose();
    },
    [luces],
  );

  /* La luz del barrio: la niebla, la paleta compartida y las luces. No recompila nada. */
  useEffect(() => {
    ponerLaNiebla(scene, tiempo, luz.luz);
    const p = ponerLaPaleta(luz.luz, luz.claridad);
    luces.ponerLaPaleta(p);
    UNIFORMES_DEL_CIELO.uColumnas.value = p.cielo.columnas;
    UNIFORMES_DE_LOS_HALOS.uHalos.value = p.halos * HALOS_DEL_NIVEL[nivel];
    /* Las farolas horneadas en los cuerpos: sólo donde no hay farolas de verdad que les den luz. */
    UNIFORMES_DE_LA_LUZ.uFarolasEnLosCuerpos.value = detalle.lucesReales > 0 ? 0.35 : 1;
  }, [scene, tiempo, luz.luz, luz.claridad, luces, nivel, detalle.lucesReales]);

  const desdeLaNiebla = useRef(0);
  const conSombras = detalle.sombras > 0;
  useEffect(() => {
    nieblaEnLaEscena(scene);
    sombrasDeLosCuerpos(scene, conSombras);
  }, [scene, cielo, lluvia, luces, conSombras]);

  useFrame((estado, dt) => {
    /* Lo relevado en el fotograma anterior, ya sin pintarse y con sus programas en lo nuevo. */
    relevos.cielo.soltarLoViejo();
    relevos.lluvia.soltarLoViejo();
    relevos.salpicaduras.soltarLoViejo();
    const t = reloj !== undefined ? reloj() : estado.clock.elapsedTime;
    UNIFORMES_DEL_CIELO.uTiempo.value = t;
    luces.farolasEncendidas = farolasEncendidas;
    luces.actualizar(estado.camera, Math.min(dt, 0.1));
    desdeLaNiebla.current += dt;
    if (desdeLaNiebla.current > 0.5) {
      desdeLaNiebla.current = 0;
      nieblaEnLaEscena(scene);
      sombrasDeLosCuerpos(scene, conSombras);
    }
  });

  return (
    <>
      <primitive object={relevos.cielo.grupo} />
      <primitive object={relevos.lluvia.grupo} />
      <primitive object={relevos.salpicaduras.grupo} />
      <primitive object={luces.grupo} />
    </>
  );
}

/** Le pone la niebla de altura antes de colgarla (ver `cielo` y `lluvia`). */
function conNiebla<T extends THREE.Object3D>(o: T): T {
  nieblaEnLaEscena(o);
  return o;
}

/**
 * Suelta la geometría y GUARDA el material con sus programas (`guardarLosProgramas`): el cielo fino y el llano, o
 * la lluvia de dos niveles, vuelven al volver el nivel, y así no se enlazan otra vez. Dos por pieza: las dos
 * variantes que alternan.
 */
function soltarLaMalla(m: THREE.Mesh | THREE.Points | THREE.LineSegments): void {
  m.geometry.dispose();
  const material = m.material as THREE.Material;
  guardarLosProgramas(`atmosfera-${material.name}`, [material], 2);
}
