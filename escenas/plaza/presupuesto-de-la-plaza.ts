/**
 * EL PRESUPUESTO DE LA PLAZA: el tope, lo que la escena pone además de las piezas, y
 * la suma, con los mismos números con los que se construye.
 *
 * ═══ POR QUÉ ESTOS NÚMEROS NO VIVEN EN `Plaza.tsx` ═══
 *
 * Por lo mismo que en el Muelle (`embarcadero/presupuesto.ts`): las piezas del pack se
 * cuentan abriendo `burgo.glb`, pero la cúpula del cielo, los discos de contacto, las
 * bombillas de las farolas y los halos los hace la escena a mano, y sus triángulos
 * dependen de cuántos segmentos se le den a cada geometría. Si esos números vivieran
 * dentro del `.tsx` —que importa `three`— el comprobador no podría leerlos sin
 * arrastrar el motor de dibujo, y acabaría con una copia que el día menos pensado ya no
 * es la misma. Se declaran aquí, sin `three`, y los dos lados los importan.
 *
 * ═══ EL TOPE ES EL DE UN LOBBY, Y ESO ES UNA DECISIÓN ═══
 *
 * 110.000 triángulos y 70 llamadas con seis sentados, los mismos que el Muelle. NO son los
 * del tablero del Burgo (900.000 y 150): el tablero es una ciudad de 2.916 celdas que se
 * mira desde 570 unidades y se monta por niveles de detalle; esto es un lobby que tiene que
 * abrir en un móvil ANTES de la partida, con la misma exigencia que el lobby de Riberas.
 * Estuvo escrito aquí a mano, «una coincidencia con motivo, no una dependencia»; el motivo es
 * ser un lobby, y ahora tiene nombre y un solo sitio: `TOPE_DE_UN_LOBBY` en
 * `comun/presupuesto.ts`, junto con el renglón y la cuenta de las piezas, que también eran
 * copias.
 *
 * ═══ DÓNDE SE VA EL PRESUPUESTO, MEDIDO ═══
 *
 * Con seis sentados de la figura más pesada (la exploradora, 8.900 triángulos), los
 * aventureros SOLOS son 53.400: casi la mitad del tope. Lo demás —la calle, las
 * aceras, las fachadas, el monumento, las terrazas, el arbolado, los coches y los seis
 * puestos— tiene que caber en lo que queda, y por eso las fachadas se sortean con los
 * cuerpos baratos pesando más (ver `CUERPOS_DE_FACHADA` en `la-plaza.ts`). `verify:plaza`
 * suma las dos cosas con los triángulos del `.glb` de verdad y con la peor semilla de
 * las que prueba, no con la media.
 */
import { TOPE_DE_UN_LOBBY, renglonesDeLasPiezas, sumaDeLosRenglones, triangulosDeUnaEsfera } from '../comun/presupuesto';
import type { RenglonDelPresupuesto } from '../comun/presupuesto';
import type { Calidad } from '../embarcadero/tipos';
import type { LaPlaza } from './la-plaza';

/** El tope, con seis sentados y en calidad plena: el de un lobby. */
export const TOPE_DE_TRIANGULOS = TOPE_DE_UN_LOBBY.triangulos;
export const TOPE_DE_LLAMADAS = TOPE_DE_UN_LOBBY.llamadas;

/** Cuántos puestos hay, que es cuántos aventureros caben. */
export const ASIENTOS = 6;

/**
 * LA EXPLORADORA es la figura más pesada del pack: 8.900 triángulos medidos. El
 * comprobador la vuelve a medir sobre el `.glb`; este número está aquí para que la
 * cuenta se pueda leer sin abrir un fichero.
 */
export const TRIANGULOS_DE_LA_EXPLORADORA = 8_900;

/* ───────────────────────────── Las geometrías propias ───────────────────────────── */

/** La cúpula: una esfera vista por dentro, de radio menor que el plano lejano de la cámara. */
export const RADIO_DEL_CIELO = 900;
export const SEGMENTOS_DEL_CIELO = { ancho: 24, alto: 12 } as const;
/** El disco de contacto bajo cada aventurero: la escena no proyecta sombras en ningún cliente. */
export const SEGMENTOS_DEL_DISCO = 18;
/** La bombilla de cada farola de puesto: una esfera pequeña, instanciada con su color. */
export const SEGMENTOS_DE_LA_BOMBILLA = { ancho: 8, alto: 6 } as const;
/** El halo de cada farola: un plano aditivo encarado a la cámara. */
export const TRIANGULOS_DEL_HALO = 2;
/** El llano del fondo, bajo todo: dos triángulos. */
export const TRIANGULOS_DEL_LLANO = 2;
/** Las motas que flotan en la luz rasante, sólo en plena. Puntos, no triángulos. */
export const MOTAS = 240;
/** El humo del cambio de figura, por aventurero. Puntos, como en el Muelle. */
export const MOTAS_DE_HUMO = 14;

export function triangulosDelCielo(ancho = SEGMENTOS_DEL_CIELO.ancho, alto = SEGMENTOS_DEL_CIELO.alto): number {
  return triangulosDeUnaEsfera(ancho, alto);
}
export function triangulosDeLaBombilla(): number {
  return triangulosDeUnaEsfera(SEGMENTOS_DE_LA_BOMBILLA.ancho, SEGMENTOS_DE_LA_BOMBILLA.alto);
}

/* ───────────────────────────── La suma de triángulos ───────────────────────────── */

/**
 * LO QUE PESA UNA PLAZA CON `sentados` AVENTUREROS, renglón a renglón.
 *
 * Las piezas del pack se cuentan de la composición de verdad —no de una tabla escrita a
 * mano— y sus triángulos salen del `.glb`; los bultos propios traen su cuenta consigo
 * (`BultoDeLaPlaza.triangulos`), que es la misma que `geometriaDeUnBulto` construye; y
 * lo que la escena añade se declara arriba. Las banderas van aparte de las piezas del
 * pack porque no son del decorado: hay una por puesto y se tiñen del color del asiento.
 */
export function renglonesDeLaPlaza(
  plaza: LaPlaza,
  piezasPintadas: readonly { readonly pieza: string }[],
  triangulosDe: (pieza: string) => number | undefined,
  triangulosDeUnAventurero: number,
  sentados = ASIENTOS,
): { readonly renglones: readonly RenglonDelPresupuesto[]; readonly total: number; readonly desconocidas: readonly string[] } {
  const cuenta = new Map<string, number>();
  for (const p of piezasPintadas) cuenta.set(p.pieza, (cuenta.get(p.pieza) ?? 0) + 1);
  const { renglones, desconocidas } = renglonesDeLasPiezas(cuenta, triangulosDe);
  const bultos = plaza.bultos.reduce((s, b) => s + b.triangulos, 0);
  const bandera = triangulosDe('bandera') ?? 0;
  const plena = plaza.calidad === 'plena';
  renglones.push({ que: 'bultos propios (pedestal y llano)', cuantos: plaza.bultos.length, triangulos: bultos });
  renglones.push({ que: 'estandartes de los puestos', cuantos: ASIENTOS, triangulos: ASIENTOS * bandera });
  renglones.push({ que: 'bombillas de los puestos', cuantos: ASIENTOS, triangulos: ASIENTOS * triangulosDeLaBombilla() });
  renglones.push({ que: 'halos de las farolas', cuantos: ASIENTOS, triangulos: ASIENTOS * TRIANGULOS_DEL_HALO });
  renglones.push({ que: 'discos de contacto', cuantos: sentados, triangulos: sentados * SEGMENTOS_DEL_DISCO });
  renglones.push({ que: 'la cúpula del cielo', cuantos: 1, triangulos: triangulosDelCielo() });
  renglones.push({ que: `aventureros (${plena ? 'plena' : 'sobria'})`, cuantos: sentados, triangulos: sentados * triangulosDeUnAventurero });
  return { renglones, total: sumaDeLosRenglones(renglones), desconocidas };
}

/* ───────────────────────────── Las llamadas de dibujo ───────────────────────────── */

export interface RenglonDeLlamadas {
  readonly que: string;
  readonly llamadas: number;
}

/**
 * CÓMO SE GASTAN LAS LLAMADAS, que es lo que de verdad manda en un móvil.
 *
 * TODO lo que no se mueve va en UNA malla fundida (`aplana` + `fundir` + la matriz del
 * Burgo, como el tablero): las 24 losas de la calle, las 44 soleras, las 19 fachadas, el
 * monumento, los seis bancos, las seis farolas, las terrazas, el arbolado y los coches
 * son una sola llamada. Los seis estandartes son otra —una `InstancedMesh` con la
 * geometría a gris y el color por instancia, porque el estandarte se tiñe entero— y las
 * seis bombillas y los seis halos, una cada uno. Lo que queda es por aventurero: su
 * malla con piel, su disco y su humo.
 *
 * Esta cuenta es una PROMESA que el comprobador puede leer y que el banco mide de
 * verdad con `gl.info.render.calls`: si un día alguien saca una pieza del fundido, aquí
 * hay que sumarla, y el banco lo delata al primer fotograma.
 */
export function llamadasDeLaPlaza(calidad: Calidad, sentados = ASIENTOS): { readonly renglones: readonly RenglonDeLlamadas[]; readonly total: number } {
  const plena = calidad === 'plena';
  const renglones: RenglonDeLlamadas[] = [
    { que: 'la cúpula del cielo', llamadas: 1 },
    { que: 'todo lo fijo, fundido', llamadas: 1 },
    { que: 'los seis estandartes, instanciados', llamadas: 1 },
    { que: 'las seis bombillas, instanciadas', llamadas: 1 },
    { que: 'los seis halos, instanciados', llamadas: 1 },
    { que: 'motas en la luz (sólo plena)', llamadas: plena ? 1 : 0 },
    { que: 'aventureros', llamadas: sentados },
    { que: 'discos de contacto', llamadas: sentados },
    { que: 'humo del cambio de figura (a la vez, como mucho)', llamadas: sentados },
  ];
  return { renglones, total: renglones.reduce((s, r) => s + r.llamadas, 0) };
}
