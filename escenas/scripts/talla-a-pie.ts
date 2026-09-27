/**
 * LA TALLA A PIE, MEDIDA: la parte de `verify:paseo` que mira `shared/mecanicas/talla.ts` y lo que cuelga
 * de ella. Vive aparte porque abre `burgo.glb` y `tablero.glb`, como `paseo-con-adorno.ts`, y la llama
 * `verificar-paseo.ts` con su `comprobar` y su `paso`.
 *
 * ═══ LO QUE ESTO CIERRA ═══
 *
 * Miguel (27-sep-2026): «los avatares son grandes de forma desproporcionada […] con las cosas del
 * entorno». Nada fallaba: las comprobaciones medían el mundo contra `ALTURA_DE_UNA_PERSONA`, que es la
 * vara con la que está hecho, y nunca a quien anda contra lo que tiene al lado. Aquí se mide eso, en
 * cada juego, con las piezas de verdad y cada cosa con su vacuna:
 *
 *   1. QUIEN ANDA CABE POR UNA PUERTA Y NO ES UN MUÑECO A SU LADO, en los tres juegos: la puerta le
 *      saca entre un 10 % y el triple. El respaldo de un banco del Burgo le llega por la cintura, y un
 *      barril del pack no pasa de su coronilla. Vacunas: a la talla de antes, la puerta de Riberas le
 *      llegaba al pecho y el banco a la rodilla; al 0,3 que también se pidió, el barril le sacaría una
 *      cabeza y la puerta de Las Lindes más de cuatro cuerpos.
 *   2. EL GOLPE Y LA RECOGIDA, A LA MEDIDA DEL CUERPO: el golpe llega más lejos que dos cuerpos pegados
 *      y no más de una altura; la honda, el arma más larga, no más de dos alturas y media; se recoge a
 *      menos de un cuerpo de distancia. Vacuna: los números de antes (2,5, 6 y 1,5) con el cuerpo nuevo.
 *   3. EL PASO: andando no pasa de cinco cuerpos por segundo —se veía correr andando—, y el servidor
 *      sigue aceptando la velocidad de la app 1.8.x (`VELOCIDAD_QUE_ACEPTA_EL_SERVIDOR`). La vacuna,
 *      12 u/s con el cuerpo nuevo. Que un aparato viejo andando a su velocidad no reciba correcciones lo
 *      mide `verify:sala-de-botas` por el canal de verdad.
 *   4. LA MARIONETA SE PINTA A ESA TALLA: `mueveAQuienAnda` escala el grupo a `TALLA_A_PIE`, y se ve
 *      fallar sin la línea.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { RADIO_DEL_PASEANTE, VELOCIDAD_ANDANDO, VELOCIDAD_CORRIENDO, VELOCIDAD_QUE_ACEPTA_EL_SERVIDOR } from '../../shared/mecanicas/andar';
import { ALCANCE_DEL_GOLPE } from '../../shared/mecanicas/canal-de-botas';
import { aNumero } from '../../shared/mecanicas/fijo';
import { RADIO_DE_RECOGER } from '../../shared/mecanicas/hallazgos';
import { ARMAS, FICHA_DEL_ARMA } from '../../shared/arcade/juegos/riberas-armas';
import { ESCALA_DE_LA_CASA } from '../../shared/arcade/juegos/lindes-medidas';
import { ALTURA_DE_UNA_PERSONA, ESCALA_DEL_PACK } from '../escala';
import { ALTURA_DE_QUIEN_ANDA, TALLA_A_PIE } from '../paseo/talla';
import { elCatalogoDelBurgo, elCatalogoDelTablero } from './adorno-en-node';

type Comprobar = (que: string, condicion: boolean, detalle?: unknown) => void;

const AQUI = path.dirname(fileURLToPath(import.meta.url));

/**
 * LA PUERTA DE LA CASA DEL PACK HEXAGONAL, en unidades del pack: de 0,210 —lo alto del zócalo de piedra
 * sobre el que se levanta— a 0,504, en la cara delantera. Medida en `tablero.glb` agrupando los vértices
 * de la casa por su color del atlas (27-sep-2026): el hueco oscuro de 0,154 × 0,294. No se lee del
 * `.glb` en cada pasada porque la puerta no es un nodo; lo que sí se lee es la casa entera, que la ancla.
 */
const PUERTA_DE_LA_CASA_EN_EL_PACK = 0.294;
const ALTO_DE_LA_CASA_EN_EL_PACK = 1.28;

/** Cuántas veces la altura de quien anda mide algo. */
const enCuerpos = (medida: number, talla: number): number => medida / talla;

/** Lo que tiene que cumplir quien anda contra las piezas de un juego, a una talla cualquiera. */
interface Piezas {
  readonly puertaDelBurgo: number;
  readonly bancoDelBurgo: number;
  readonly puertaDeRiberas: number;
  readonly puertaDeLasLindes: number;
  readonly barril: number;
}
function problemasDeLaTalla(p: Piezas, talla: number): string[] {
  const problemas: string[] = [];
  for (const [que, puerta] of [
    ['el Burgo', p.puertaDelBurgo],
    ['Riberas', p.puertaDeRiberas],
    ['Las Lindes', p.puertaDeLasLindes],
  ] as const) {
    const veces = enCuerpos(puerta, talla);
    if (!(veces >= 1.1 && veces <= 3)) problemas.push(`puerta de ${que}: ${veces.toFixed(2)} veces quien anda`);
  }
  const banco = enCuerpos(p.bancoDelBurgo, talla);
  if (!(banco >= 0.35 && banco <= 0.6)) problemas.push(`banco del Burgo: le llega al ${(banco * 100).toFixed(0)} %`);
  const barril = enCuerpos(p.barril, talla);
  if (!(barril <= 1)) problemas.push(`barril: ${barril.toFixed(2)} veces quien anda`);
  return problemas;
}

/** Lo que tiene que cumplir el combate y la recogida contra un cuerpo de `talla`. */
function problemasDelAlcance(golpe: number, alcances: readonly number[], recoger: number, talla: number): string[] {
  const problemas: string[] = [];
  const radio = aNumero(RADIO_DEL_PASEANTE);
  if (!(golpe > 2 * radio && golpe <= talla)) problemas.push(`golpe: ${golpe.toFixed(2)} contra un cuerpo de ${talla.toFixed(2)}`);
  const mayor = Math.max(...alcances);
  if (!(mayor <= 2.5 * talla)) problemas.push(`arma más larga: ${mayor.toFixed(2)}, ${(mayor / talla).toFixed(2)} cuerpos`);
  if (!(recoger <= 0.6 * talla)) problemas.push(`recoger: ${recoger.toFixed(2)}, ${(recoger / talla).toFixed(2)} cuerpos`);
  return problemas;
}

export async function medirLaTallaAPie(comprobar: Comprobar, paso: (titulo: string) => void): Promise<void> {
  paso(`La talla a pie: ${ALTURA_DE_QUIEN_ANDA.toFixed(2)} de alto (${TALLA_A_PIE} de la persona del mundo), contra las puertas, el banco y el barril de cada juego`);

  const burgo = await elCatalogoDelBurgo();
  const { modelos: tablero } = await elCatalogoDelTablero();
  const alto = (m: THREE.Object3D | undefined): number => {
    if (m === undefined) return Number.NaN;
    const caja = new THREE.Box3().setFromObject(m);
    return caja.max.y - caja.min.y;
  };
  const casaDelPack = alto(tablero.get('casa'));
  comprobar(
    `la casa del pack mide lo que se midió al sacarle la puerta (${ALTO_DE_LA_CASA_EN_EL_PACK}): si cambia, hay que volver a medirla`,
    Math.abs(casaDelPack - ALTO_DE_LA_CASA_EN_EL_PACK) < 0.01,
    casaDelPack,
  );
  const piezas: Piezas = {
    puertaDelBurgo: alto(burgo.get('hoja-de-puerta')),
    bancoDelBurgo: alto(burgo.get('banco-de-calle')),
    /* Las casas de un poblado de Riberas van a la talla del pack (`asentamiento.ts`, talla 1); las de Las Lindes, a 2,2. */
    puertaDeRiberas: PUERTA_DE_LA_CASA_EN_EL_PACK * ESCALA_DEL_PACK,
    puertaDeLasLindes: PUERTA_DE_LA_CASA_EN_EL_PACK * ESCALA_DEL_PACK * ESCALA_DE_LA_CASA,
    barril: alto(tablero.get('barril')) * ESCALA_DEL_PACK,
  };
  console.log(
    `  quien anda mide ${ALTURA_DE_QUIEN_ANDA.toFixed(2)}: la puerta del Burgo ${enCuerpos(piezas.puertaDelBurgo, ALTURA_DE_QUIEN_ANDA).toFixed(2)} veces él, ` +
      `la de Riberas ${enCuerpos(piezas.puertaDeRiberas, ALTURA_DE_QUIEN_ANDA).toFixed(2)}, la de Las Lindes ${enCuerpos(piezas.puertaDeLasLindes, ALTURA_DE_QUIEN_ANDA).toFixed(2)}; ` +
      `el banco le llega al ${((piezas.bancoDelBurgo / ALTURA_DE_QUIEN_ANDA) * 100).toFixed(0)} % y el barril al ${((piezas.barril / ALTURA_DE_QUIEN_ANDA) * 100).toFixed(0)} %`,
  );
  const ahora = problemasDeLaTalla(piezas, ALTURA_DE_QUIEN_ANDA);
  comprobar('quien anda cabe por la puerta de cada juego sin ser un muñeco a su lado, el banco le llega por la cintura y el barril no le pasa', ahora.length === 0, ahora);
  const antes = problemasDeLaTalla(piezas, ALTURA_DE_UNA_PERSONA);
  comprobar(
    'la vacuna: a la talla de antes, la puerta de Riberas le llegaba al pecho y el banco a la rodilla',
    antes.some((p) => p.startsWith('puerta de Riberas')) && antes.some((p) => p.startsWith('banco')),
    antes,
  );
  const aLoMasPequeno = problemasDeLaTalla(piezas, ALTURA_DE_UNA_PERSONA * 0.3);
  comprobar(
    'y la otra vacuna: al 0,3 —el «70 % más pequeños»—, el barril le sacaría la cabeza y la puerta de Las Lindes, más de tres cuerpos',
    aLoMasPequeno.some((p) => p.startsWith('barril')) && aLoMasPequeno.some((p) => p.startsWith('puerta de Las Lindes')),
    aLoMasPequeno,
  );

  paso('El golpe, las armas y la recogida, a la medida del cuerpo; y el paso, sin correr andando');
  const alcances = ARMAS.map((a) => FICHA_DEL_ARMA[a].refriega.alcance);
  const delAlcance = problemasDelAlcance(ALCANCE_DEL_GOLPE, alcances, RADIO_DE_RECOGER, ALTURA_DE_QUIEN_ANDA);
  console.log(
    `  el golpe llega a ${ALCANCE_DEL_GOLPE} (${(ALCANCE_DEL_GOLPE / ALTURA_DE_QUIEN_ANDA).toFixed(2)} cuerpos), la honda a ${Math.max(...alcances)}, y se recoge a ${RADIO_DE_RECOGER}`,
  );
  comprobar('el golpe pasa de dos cuerpos pegados y no llega a una altura; la honda, a menos de dos alturas y media; se recoge a menos de un cuerpo', delAlcance.length === 0, delAlcance);
  const conLosDeAntes = problemasDelAlcance(2.5, [6, 4, 2.5, 2], 1.5, ALTURA_DE_QUIEN_ANDA);
  comprobar('la vacuna: con los números de antes (2,5, la honda a 6, recoger a 1,5) y el cuerpo nuevo, los tres se pasan', conLosDeAntes.length === 3, conLosDeAntes);

  const cuerposPorSegundo = aNumero(VELOCIDAD_ANDANDO) / ALTURA_DE_QUIEN_ANDA;
  comprobar(
    `andando se cruzan ${cuerposPorSegundo.toFixed(1)} cuerpos por segundo: no más de cinco, que es lo que se hacía con el cuerpo de antes`,
    cuerposPorSegundo <= 5 && VELOCIDAD_ANDANDO === Math.round(12 * TALLA_A_PIE * 65536) && VELOCIDAD_CORRIENDO === Math.round(12 * 2.2 * TALLA_A_PIE * 65536),
    { VELOCIDAD_ANDANDO, VELOCIDAD_CORRIENDO },
  );
  comprobar('la vacuna: a 12 u/s con el cuerpo nuevo se cruzaban más de nueve cuerpos por segundo', 12 / ALTURA_DE_QUIEN_ANDA > 9);
  comprobar(
    'y el servidor acepta lo que corre la app 1.8.x (26,4 u/s), que es más de lo que corre la de hoy',
    VELOCIDAD_QUE_ACEPTA_EL_SERVIDOR >= 1730150 && VELOCIDAD_QUE_ACEPTA_EL_SERVIDOR > VELOCIDAD_CORRIENDO,
    { VELOCIDAD_QUE_ACEPTA_EL_SERVIDOR, VELOCIDAD_CORRIENDO },
  );

  paso('La marioneta se pinta a la talla a pie, la propia y la de los demás');
  const quienAnda = fs.readFileSync(path.join(AQUI, '..', 'paseo', 'quien-anda.tsx'), 'utf8');
  const escalaLaFigura = (fuente: string): boolean =>
    /export function mueveAQuienAnda\([\s\S]*?\n\): void \{[\s\S]*?g\.scale\.setScalar\(TALLA_A_PIE\);[\s\S]*?\n\}/.test(fuente);
  comprobar('`mueveAQuienAnda`, que mueve a quien pasea y a los demás, escala su grupo a `TALLA_A_PIE`', escalaLaFigura(quienAnda));
  comprobar('se ve fallar: sin esa línea, la figura sale a su tamaño de serie', !escalaLaFigura(quienAnda.replace('g.scale.setScalar(TALLA_A_PIE);', '')));
}
