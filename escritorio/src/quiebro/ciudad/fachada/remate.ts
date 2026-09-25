/**
 * EL REMATE DE CADA VOLUMEN: la azotea (siempre) y, con relieve, la cornisa que vuela, el pretil, la imposta
 * sobre la planta baja y lo que hay en la azotea del volumen más alto (maquinaria, caseta de la escalera y, a
 * veces, el depósito de agua de madera). `respiraderosDe` dice dónde echa vapor una azotea.
 *
 * `azoteaDelVolumen` cede al acabar cada volumen, como siempre. La cornisa vuela FUERA del muro y nunca
 * encima del tejado: ahí pelearía en profundidad con la azotea.
 */
import type { Molde } from '../geometria';
import { azarEn } from '../azar';
import { NUMERO_DEL_ESTILO } from '../hash';
import type { CajaXZ, EdificioDelPlano, Volumen } from '../tipos';
import { BAJO, TIPO } from './tipos-de-cara';
import type { GradoDeLaFachada, ObraDeLaFachada, PuntoDeAzotea } from './tipos-de-cara';
import { tinteDe } from './caras';
import { hayRemateDeTorre, hitoDe, volumenMasAlto } from './torres';

/** El «estilo» de lo que es de chapa en una azotea y de lo que es de madera (lo lee el sombreador). */
export const CHAPA_DE_AZOTEA = 7;
export const MADERA_DE_AZOTEA = 6;

/** LA AZOTEA DEL VOLUMEN `iv` y, con relieve, su remate. Cede al acabar. */
export function* azoteaDelVolumen(m: Molde, e: EdificioDelPlano, iv: number, obra: ObraDeLaFachada): Generator<void, void, void> {
  const v = e.volumenes[iv] as Volumen;
  const estilo = NUMERO_DEL_ESTILO[e.estilo];
  const tinte = tinteDe(e);
  m.poner('aCara', 1, estilo, 0, TIPO.tejado);
  m.poner('aVolumen', e.plantaBaja, v.y1, tinte, e.vano);
  m.poner('aPlanta', e.alturaDePlanta, BAJO.sinCalle);
  m.losa(v.x0, v.z0, v.x1, v.z1, v.y1, true);
  if (obra.relieve) escribirElRemate(m, e, v, estilo, tinte, iv, obra.grado);
  yield;
}

/** Cuatro listones que vuelan `vuelo` fuera de las caras de un volumen, entre `y0` e `y1`. */
function anilloQueVuela(m: Molde, v: CajaXZ, y0: number, y1: number, vuelo: number): void {
  m.caja(v.x0 - vuelo, y0, v.z0 - vuelo, v.x1 + vuelo, y1, v.z0, 'neoab');
  m.caja(v.x0 - vuelo, y0, v.z1, v.x1 + vuelo, y1, v.z1 + vuelo, 'seoab');
  m.caja(v.x1, y0, v.z0, v.x1 + vuelo, y1, v.z1, 'eab');
  m.caja(v.x0 - vuelo, y0, v.z0, v.x0, y1, v.z1, 'oab');
}

/** Cornisa, pretil, imposta de la planta baja y maquinaria de azotea. `grado` hoy no cambia nada. */
function escribirElRemate(m: Molde, e: EdificioDelPlano, v: Volumen, estilo: number, tinte: number, iv: number, grado: GradoDeLaFachada): void {
  m.poner('aCara', 1, estilo, 0, TIPO.relieve);
  m.poner('aVolumen', e.plantaBaja, v.y1, tinte, e.vano);
  m.poner('aPlanta', e.alturaDePlanta, BAJO.sinCalle);
  const vidrio = e.estilo === 'vidrio';
  const vuelo = vidrio ? 0.12 : 0.35;
  const canto = vidrio ? 0.25 : 0.4;
  /* La cornisa vuela FUERA del muro (nunca encima del tejado: ahí pelearía en profundidad con la
     azotea). Sus caras de abajo se ven desde la calle. La planta baja no lleva: lleva la imposta. */
  if (iv > 0) anilloQueVuela(m, v, v.y1 - canto, v.y1, vuelo);
  /* El pretil: un murete de 0,9 m retranqueado. */
  if (!vidrio && iv > 0) {
    const r = 0.1;
    m.caja(v.x0 + r, v.y1, v.z0 + r, v.x1 - r, v.y1 + 0.9, v.z0 + r + 0.25, 'nseoa');
    m.caja(v.x0 + r, v.y1, v.z1 - r - 0.25, v.x1 - r, v.y1 + 0.9, v.z1 - r, 'nseoa');
    m.caja(v.x0 + r, v.y1, v.z0 + r, v.x0 + r + 0.25, v.y1 + 0.9, v.z1 - r, 'nseoa');
    m.caja(v.x1 - r - 0.25, v.y1, v.z0 + r, v.x1 - r, v.y1 + 0.9, v.z1 - r, 'nseoa');
  }
  /* La imposta sobre la planta baja, en el cuerpo: vuela sobre la acera, por encima de la cabeza. */
  if (iv === 1 && !vidrio) anilloQueVuela(m, v, e.plantaBaja - 0.02, e.plantaBaja + 0.24, 0.12);
  /* Maquinaria: uno a cuatro bultos en la azotea del volumen más alto. */
  if (iv === e.volumenes.length - 1) {
    const cuantos = 1 + Math.floor(azarEn(e.semilla, 21) * 4);
    const anchoV = v.x1 - v.x0;
    const fondoV = v.z1 - v.z0;
    m.poner('aCara', 1, CHAPA_DE_AZOTEA, 0, TIPO.relieve);
    for (let i = 0; i < cuantos; i++) {
      const w = 1.2 + azarEn(e.semilla, 30 + i) * 2.2;
      const d = 1.0 + azarEn(e.semilla, 40 + i) * 1.8;
      const h = 1.0 + azarEn(e.semilla, 50 + i) * 1.8;
      if (w > anchoV - 2 || d > fondoV - 2) continue;
      const x = v.x0 + 1 + azarEn(e.semilla, 60 + i) * (anchoV - 2 - w);
      const z = v.z0 + 1 + azarEn(e.semilla, 70 + i) * (fondoV - 2 - d);
      m.caja(x, v.y1, z, x + w, v.y1 + h, z + d, 'nseoa');
    }
    escribirLaAzotea(m, e, v, estilo);
  }
}

/**
 * LO QUE HAY EN UNA AZOTEA, además de la maquinaria: la caseta de la escalera y, en los edificios de
 * ladrillo, piedra y revoco, a veces el depósito de agua de madera sobre sus patas con su tejadillo
 * cónico, que es lo que dice «ciudad americana» desde el aire. Todo por el hash del edificio, igual en
 * todos los aparatos, y sólo con relieve (N1+ en el barrio, N2+ en el anillo). Cuesta unos 150
 * triángulos por edificio; nada de esto estorba ni se choca: está en la azotea.
 */
function escribirLaAzotea(m: Molde, e: EdificioDelPlano, v: Volumen, estilo: number): void {
  const anchoV = v.x1 - v.x0;
  const fondoV = v.z1 - v.z0;
  if (anchoV < 8 || fondoV < 8) return;
  const h = (k: number): number => azarEn(e.semilla, 200 + k);
  /* La caseta: en una esquina, de 2,6 a 3,6 m de lado y 2,8 de alto. */
  m.poner('aCara', 1, estilo === 3 ? 2 : estilo, 0, TIPO.relieve);
  const lc = 2.6 + h(1) * 1.0;
  const cx = h(2) < 0.5 ? v.x0 + 1.2 : v.x1 - 1.2 - lc;
  const cz = h(3) < 0.5 ? v.z0 + 1.2 : v.z1 - 1.2 - lc;
  m.caja(cx, v.y1, cz, cx + lc, v.y1 + 2.8, cz + lc, 'nseoa');
  /* El depósito de agua. */
  if (e.estilo !== 'vidrio' && e.estilo !== 'hormigon' && h(4) < 0.55) {
    const r = 1.2 + h(5) * 0.6;
    const px = h(6) < 0.5 ? v.x1 - 2.2 - r : v.x0 + 2.2 + r;
    const pz = h(7) < 0.5 ? v.z1 - 2.2 - r : v.z0 + 2.2 + r;
    const patas = 1.6 + h(8) * 0.8;
    const alto = 2.4 + h(9) * 1.2;
    m.poner('aCara', 1, CHAPA_DE_AZOTEA, 0, TIPO.relieve);
    const g = 0.09;
    const o = r * 0.62;
    for (const [dx, dz] of [[-o, -o], [o, -o], [-o, o], [o, o]] as const) {
      m.caja(px + dx - g, v.y1, pz + dz - g, px + dx + g, v.y1 + patas, pz + dz + g, 'nseo');
    }
    m.poner('aCara', 1, MADERA_DE_AZOTEA, 0, TIPO.relieve);
    m.cilindro(px, pz, v.y1 + patas, v.y1 + patas + alto, r, r, 10, true);
    m.cilindro(px, pz, v.y1 + patas + alto, v.y1 + patas + alto + r * 0.7, r * 1.06, 0.08, 10, false);
  }
}

/** Lo que se aparta un respiradero del borde de la azotea (el pretil está a 0,1-0,35 m). */
const RESPIRADERO_LEJOS_DEL_BORDE = 1.5;

/**
 * LOS RESPIRADEROS DE UN EDIFICIO: de 1 a 3 puntos de la azotea de su volumen más alto (en el mundo, a la
 * altura del tejado), por el hash del edificio y a `RESPIRADERO_LEJOS_DEL_BORDE` del borde. Si el edificio
 * lleva remate de torre o un hito, se apartan también del centro (el cuadrado de lado la mitad del lado
 * menor), que es suyo; en una azotea de menos de 6 m de lado, ese cuadrado puede comerse el margen, y gana
 * el cuadrado. En una azotea de menos de 3 m, el punto va a su centro en ese eje. De aquí salen el respiradero
 * que pone la azotea y el vapor que echa: los dos, en el mismo sitio.
 */
export function respiraderosDe(e: EdificioDelPlano): PuntoDeAzotea[] {
  const v = e.volumenes[volumenMasAlto(e)];
  if (v === undefined) return [];
  const ancho = v.x1 - v.x0;
  const fondo = v.z1 - v.z0;
  const cx = (v.x0 + v.x1) / 2;
  const cz = (v.z0 + v.z1) / 2;
  const margen = RESPIRADERO_LEJOS_DEL_BORDE;
  const centroOcupado = hayRemateDeTorre(e) || hitoDe(e) !== null;
  const reservado = Math.min(ancho, fondo) / 4;
  const enEje = (a0: number, a1: number, h: number): number => {
    const libre = a1 - a0 - 2 * margen;
    return libre > 0 ? a0 + margen + h * libre : (a0 + a1) / 2;
  };
  const cuantos = 1 + Math.floor(azarEn(e.semilla, 400) * 3);
  const salida: PuntoDeAzotea[] = [];
  for (let i = 0; i < cuantos; i++) {
    let x = enEje(v.x0, v.x1, azarEn(e.semilla, 410 + i));
    let z = enEje(v.z0, v.z1, azarEn(e.semilla, 420 + i));
    if (centroOcupado && Math.abs(x - cx) < reservado && Math.abs(z - cz) < reservado) {
      /* Fuera del centro, por el eje por el que ya estaba más lejos. */
      if (Math.abs(x - cx) >= Math.abs(z - cz)) x = cx + (x >= cx ? reservado : -reservado);
      else z = cz + (z >= cz ? reservado : -reservado);
    }
    salida.push({ x, y: v.y1, z });
  }
  return salida;
}
