/**
 * LOS BALCONES: qué hueco es balconera (`tieneBalcon`) y la losa con su barandilla de hierro que se escribe
 * debajo, con relieve.
 *
 * ═══ LA REGLA NO DEPENDE DEL RELIEVE NI DEL GRADO ═══
 *
 * `tieneBalcon` es una función del edificio, la cara, la planta y el hueco, y de nada más: la LOD1, N0 y la
 * ventana tienen que decir lo mismo de cada hueco, porque un edificio que entra en la ventana no puede
 * cambiar de cara (`lejos.ts`, cabecera). Lo que depende del relieve es sólo si se escribe la LOSA, y eso lo
 * decide `fachadasPorPartes`. Hoy la regla es la de siempre: lleva balcón todo hueco de las plantas 0 a 5 de un
 * edificio con balcones que no sea de vidrio ni de hormigón. Los voladizos la importan para no colgar nada
 * donde hay uno.
 *
 * `patronDeBalcon` (qué reparto de balcones lleva el edificio: todas las plantas, principal corrido, alternos…)
 * da 0 mientras la regla sea la de hoy. Es un número pequeño y entero: va empaquetado en `aPlanta.y`.
 */
import type { Molde } from '../geometria';
import { NUMERO_DEL_ESTILO } from '../hash';
import type { EdificioDelPlano } from '../tipos';
import { BAJO, HUECO_DEL_ESTILO, TIPO } from './tipos-de-cara';
import type { Cara, CaraDelVolumen, ObraDeLaFachada, QueCara } from './tipos-de-cara';
import { normalDe, puntoDeLaCara, tinteDe } from './caras';

/** Cada cuántos balcones se cede el paso: seis son unos 700 triángulos con sus barandillas. */
export const BALCONES_POR_TROZO = 6;

/** La planta más alta (contando desde la primera sobre la baja, que es la 0) que lleva balcón. */
const PLANTA_MAS_ALTA_CON_BALCON = 5;

/**
 * ¿Puede llevar balcones algún hueco de este edificio? El atajo de `fachadasPorPartes` para no recorrer los
 * huecos de balde: tiene que ser cierto siempre que `tieneBalcon` pueda serlo para algún hueco.
 */
export function puedeLlevarBalcones(e: EdificioDelPlano): boolean {
  return e.balcones && e.estilo !== 'vidrio' && e.estilo !== 'hormigon';
}

/** ¿Es balconera el hueco de la columna `hueco` y la planta `planta` de esa cara? Ver la cabecera. */
export function tieneBalcon(e: EdificioDelPlano, cara: QueCara, planta: number, hueco: number): boolean {
  return puedeLlevarBalcones(e) && planta <= PLANTA_MAS_ALTA_CON_BALCON;
}

/** El reparto de balcones del edificio: 0 es el de hoy (ver la cabecera). */
export function patronDeBalcon(e: EdificioDelPlano): number {
  return 0;
}

/**
 * LOS BALCONES DE UNA CARA, uno por hueco de `huecos` (su `u` a lo largo de la cara y la altura de su
 * alféizar), cediendo cada `BALCONES_POR_TROZO` y al acabar si quedó un puñado a medias.
 */
export function* balconesDeLaCara(
  m: Molde,
  e: EdificioDelPlano,
  c: CaraDelVolumen,
  huecos: readonly (readonly [number, number])[],
  obra: ObraDeLaFachada,
): Generator<void, void, void> {
  const estilo = NUMERO_DEL_ESTILO[e.estilo];
  const tinte = tinteDe(e);
  const ancho = c.cara.hasta - c.cara.desde;
  for (let k = 0; k < huecos.length; k++) {
    const [ux, ySuelo] = huecos[k] as readonly [number, number];
    escribirUnBalcon(m, e, c.cara, ux, ySuelo, estilo, c.semilla, ancho, c.volumen.y1, tinte);
    if ((k + 1) % BALCONES_POR_TROZO === 0) yield;
  }
  if (huecos.length % BALCONES_POR_TROZO !== 0) yield;
}

/** La losa de un balcón con su barandilla, bajo el hueco. */
function escribirUnBalcon(
  m: Molde,
  e: EdificioDelPlano,
  c: Cara,
  u: number,
  ySuelo: number,
  estilo: number,
  semilla: number,
  anchoCara: number,
  techo: number,
  tinte: number,
): void {
  const hueco = HUECO_DEL_ESTILO[e.estilo];
  const nV = Math.max(1, Math.floor(anchoCara / Math.max(e.vano, 0.5) + 0.5));
  const vano = anchoCara / nV;
  const medio = ((hueco[1] - hueco[0]) * vano) / 2 + 0.3;
  const fondo = 0.55;
  const [nx, nz] = normalDe(c.mira);
  const [px, pz] = puntoDeLaCara(c, u);
  /* Tangente a la derecha de quien mira la cara: T = (n.z, 0, −n.x). */
  const tx = nz;
  const tz = -nx;
  const y0 = ySuelo - 0.14;
  const y1 = ySuelo;
  m.poner('aCara', anchoCara, estilo, semilla, TIPO.relieve);
  m.poner('aVolumen', e.plantaBaja, techo, tinte, e.vano);
  m.poner('aPlanta', e.alturaDePlanta, BAJO.sinCalle);
  const esq = (s: number, f: number, y: number): [number, number, number] => [px + tx * s + nx * f, y, pz + tz * s + nz * f];
  const n: [number, number, number] = [nx, 0, nz];
  m.quad(esq(-medio, fondo, y0), esq(medio, fondo, y0), esq(medio, fondo, y1), esq(-medio, fondo, y1), n, [0, y0, 1, y0, 1, y1, 0, y1]);
  m.quad(esq(-medio, fondo, y1), esq(medio, fondo, y1), esq(medio, 0, y1), esq(-medio, 0, y1), [0, 1, 0], [0, y1, 1, y1, 1, y1, 0, y1]);
  m.quad(esq(-medio, 0, y0), esq(medio, 0, y0), esq(medio, fondo, y0), esq(-medio, fondo, y0), [0, -1, 0], [0, y0, 1, y0, 1, y0, 0, y0]);
  m.quad(esq(medio, fondo, y0), esq(medio, 0, y0), esq(medio, 0, y1), esq(medio, fondo, y1), [tx, 0, tz], [0, y0, 1, y0, 1, y1, 0, y1]);
  m.quad(esq(-medio, 0, y0), esq(-medio, fondo, y0), esq(-medio, fondo, y1), esq(-medio, 0, y1), [-tx, 0, -tz], [0, y0, 1, y0, 1, y1, 0, y1]);
  /* La barandilla: delante y a los lados, con UV propias (u a lo largo en metros, v de 0 a 0.95). */
  m.poner('aCara', anchoCara, estilo, semilla, TIPO.barandilla);
  const f2 = fondo - 0.03;
  const alto = 0.95;
  const lado = 2 * medio;
  m.quad(esq(-medio, f2, y1), esq(medio, f2, y1), esq(medio, f2, y1 + alto), esq(-medio, f2, y1 + alto), n, [0, 0, lado, 0, lado, alto, 0, alto]);
  m.quad(esq(medio, f2, y1), esq(-medio, f2, y1), esq(-medio, f2, y1 + alto), esq(medio, f2, y1 + alto), [-nx, 0, -nz], [0, 0, lado, 0, lado, alto, 0, alto]);
  for (const s of [-medio + 0.03, medio - 0.03]) {
    const fuera: [number, number, number] = [s < 0 ? -tx : tx, 0, s < 0 ? -tz : tz];
    const dentro: [number, number, number] = [-fuera[0], 0, -fuera[2]];
    m.quad(esq(s, 0, y1), esq(s, f2, y1), esq(s, f2, y1 + alto), esq(s, 0, y1 + alto), s < 0 ? fuera : dentro, [0, 0, f2, 0, f2, alto, 0, alto]);
    m.quad(esq(s, f2, y1), esq(s, 0, y1), esq(s, 0, y1 + alto), esq(s, f2, y1 + alto), s < 0 ? dentro : fuera, [0, 0, f2, 0, f2, alto, 0, alto]);
  }
}
