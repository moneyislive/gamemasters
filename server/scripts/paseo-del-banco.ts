/**
 * EL MUNDO DE PRUEBA Y EL PASEO QUE SE CORRE EN LOS DOS MOTORES.
 *
 * Vive aparte de `verificar-mundo.ts` por una razón concreta: el comprobador EMPAQUETA este
 * paseo con esbuild y lo ejecuta en Hermes. Si viviera dentro del comprobador, el paquete
 * arrastraría también sus efectos al cargarse —levantar Hermes, escribir temporales— y el
 * banco se lanzaría a sí mismo dentro de sí mismo. Un fichero sin efectos es lo que se puede
 * empaquetar.
 *
 * Por lo mismo, aquí NO se importa nada de `node:`: `--platform=neutral` lo rechazaría, y el
 * mensaje que sale cuando eso pasa se lee como «los motores no coinciden», que no es.
 *
 * ═══ EL PASEO DA EL PASO DE VERDAD, NO UNO PARECIDO ═══
 *
 * La primera versión de este banco andaba en ocho rumbos escritos a mano, del triángulo 3-4-5,
 * a 26,4 u/s y con el `dt` de un fotograma de 60. Comparaba el determinismo de ESA operación, y
 * esa operación no la hace nadie: el aparato y el servidor andan con `pasoDelTic`, que saca la
 * dirección de una tabla de 256 rumbos y multiplica con `por`. Es la lección que esta casa ya
 * pagó con la coma fija —un banco que recibe los incrementos ya hechos certifica el determinismo
 * de la operación que no es—, así que aquí se anda con la función de verdad, con rumbos de toda
 * la tabla y con las dos marchas.
 */
import { UNO } from '../../shared/mecanicas/fijo';
import { ANDANDO, CORRIENDO, COSENO, DT_DEL_TIC, pasoDelTic, RUMBOS, SENO } from '../../shared/mecanicas/andar';
import { VELOCIDAD_ANDANDO, VELOCIDAD_CORRIENDO } from '../../shared/mecanicas/andar';
import type { Marcha } from '../../shared/mecanicas/andar';
import { por } from '../../shared/mecanicas/fijo';
import { arenaDe, hayPiso, sueloEn, VADO } from '../../shared/mecanicas/mundo';
import type { Andante, Casilla, Cuerpo, MundoDeclarado, Sitio } from '../../shared/mecanicas/mundo';

/** El lado de una losa de Las Lindes, en unidades del mundo. */
export const LADO = 175;
/** Piezas por losa: el peor caso medido de Las Lindes. */
export const PIEZAS_POR_LOSA = 42;
export const LOSAS_ANCHO = 9;
export const LOSAS_FONDO = 8;

export const PASOS = 40000;

/**
 * El mundo de prueba se siembra con un generador entero propio y NO con `Math.random`: este
 * mundo se recorre en dos motores y se comparan las huellas, así que tiene que ser el mismo
 * mundo en los dos. Con azar sin semilla la comparación no compararía nada.
 *
 * Una fila más al sur, sin piezas, es VADO: agua por las rodillas. Está para que el paseo pase
 * por ella y el comprobador pueda exigir que el vado se haya pisado y haya frenado.
 */
export function mundoDePrueba(): MundoDeclarado {
  let semilla = 12345;
  const siguiente = (): number => {
    semilla = (Math.imul(semilla, 1103515245) + 12345) | 0;
    return (semilla >>> 8) / 16777216;
  };
  const pisables: Casilla[] = [];
  const vados: Casilla[] = [];
  const cuerpos: Cuerpo[] = [];
  for (let y = 0; y < LOSAS_FONDO; y++) {
    for (let x = 0; x < LOSAS_ANCHO; x++) {
      pisables.push({ x, y });
      /*
       * Las piezas van DENTRO de su losa, y por eso el `- 0.5`: una casilla `i` ocupa
       * `[i·LADO − LADO/2, i·LADO + LADO/2]`, porque el índice se saca redondeando —es el
       * convenio de `casillaDe` en `mundo.ts`, heredado del `hayLosaEn` del paseante viejo—. Sin restar
       * medio lado, las piezas caen a caballo entre dos casillas y la mitad quedan fuera de
       * lo pisable, donde el paseante nunca las va a tocar.
       */
      for (let p = 0; p < PIEZAS_POR_LOSA; p++) {
        const px = x * LADO + (siguiente() - 0.5) * LADO;
        const pz = -y * LADO - (siguiente() - 0.5) * LADO;
        const w = 0.5 + siguiente() * 2;
        cuerpos.push({ x0: px, z0: pz, x1: px + w, z1: pz + w });
      }
    }
  }
  for (let x = 0; x < LOSAS_ANCHO; x++) vados.push({ x, y: -1 });
  const nace: Sitio[] = [{ x: 0, z: 0, rumbo: 0 }];
  return { lado: LADO, pisables, vados, cuerpos, nace };
}

/**
 * Lo que devuelve un paseo: la huella y CON QUÉ se topó, contado por separado.
 *
 * Separar «me paró un cuerpo» de «me paró el borde» no es cosmética, y se vio rompiéndolo: con
 * un solo contador, dejar los cuerpos invisibles —vaciar el índice, poner el radio a cero—
 * seguía dando miles de paradas, porque el borde del tablero para igual. El suelo se quedaba
 * en verde con la mitad de la capa apagada.
 */
export interface Paseo {
  huella: number;
  /** Tics en que un cuerpo no dejó dar el paso entero: parado en seco o resbalando. */
  porCuerpo: number;
  /** Tics en que el borde de lo pisable no dejó dar el paso entero. */
  porBorde: number;
  /** Pasos en los que sólo se pudo avanzar por un eje. */
  resbalados: number;
  /** Tics que empezaron con el agua por las rodillas. */
  enElVado: number;
  /** Veces que acabó fuera de lo pisable. Tiene que ser cero. */
  fuera: number;
  /** Cuántos rumbos distintos de la tabla se han andado. */
  rumbosAndados: number;
  x: number;
  z: number;
}

/** Cada cuántos tics se cambia de rumbo. 256 tics a 0,3-0,66 u ≈ 77-170 unidades: se cruza una losa. */
const TICS_POR_TRAMO = 256;

/** El paseo. La misma función en proceso y dentro del paquete. */
export function pasear(): Paseo {
  const a = arenaDe(mundoDePrueba());
  /* Se nace en el CENTRO de una casilla, que es donde el convenio de redondeo la pone. */
  let quien: Andante = { x: 0, z: 0 };
  let rumbo = 0;
  let marcha: Marcha = ANDANDO;
  let sorteo = 987654321;
  let h = 0;
  let porCuerpo = 0;
  let porBorde = 0;
  let resbalados = 0;
  let enElVado = 0;
  let fuera = 0;
  const vistos: boolean[] = [];
  for (let i = 0; i < RUMBOS; i++) vistos.push(false);
  for (let k = 0; k < PASOS; k++) {
    if (k % TICS_POR_TRAMO === 0) {
      /* Un rumbo y una marcha nuevos, sorteados con aritmética entera: los mismos en los dos. */
      sorteo = (Math.imul(sorteo, 1103515245) + 12345) | 0;
      rumbo = (sorteo >>> 8) % RUMBOS;
      marcha = ((sorteo >>> 20) & 1) === 0 ? ANDANDO : CORRIENDO;
      vistos[rumbo] = true;
    }
    const antes = quien;
    const vadeando = sueloEn(a, antes.x, antes.z) === VADO;
    if (vadeando) enElVado++;
    quien = pasoDelTic(a, quien, rumbo, marcha);
    const movioX = quien.x !== antes.x;
    const movioZ = quien.z !== antes.z;
    /* El destino, calculado EXACTAMENTE como lo calcula `unPaso`, mitad en el vado incluida. */
    const v = marcha === CORRIENDO ? VELOCIDAD_CORRIENDO : VELOCIDAD_ANDANDO;
    let dx = por(por(v, SENO[rumbo] as number), DT_DEL_TIC);
    let dz = por(-por(v, COSENO[rumbo] as number), DT_DEL_TIC);
    if (vadeando) {
      dx = (dx / 2) | 0;
      dz = (dz / 2) | 0;
    }
    if (quien.x !== antes.x + dx || quien.z !== antes.z + dz) {
      /*
       * QUÉ lo tropezó, no sólo QUE lo tropezaron: el paso entero no se dio. Si su destino no tenía
       * piso, fue el borde; si lo tenía, fue un cuerpo. Sin esta distinción el suelo del comprobador
       * lo cumple el borde él solo y los cuerpos pueden estar apagados enteros.
       *
       * Se cuenta todo tropiezo —pararse en seco o resbalar— y no sólo la parada en seco, que es lo que
       * se contaba hasta el 27-sep-2026. Desde que quien anda mide la mitad y anda a la mitad
       * (`shared/mecanicas/talla.ts`), con pasos de 0,3-0,66 se resbala alrededor de estos cuerpos
       * pequeños y casi nunca se para en seco: en 40.000 tics, cero paradas por un cuerpo, y el
       * comprobador habría leído «los cuerpos están apagados» con los cuerpos funcionando.
       */
      if (hayPiso(a, antes.x + dx, antes.z + dz)) porCuerpo++;
      else porBorde++;
      if (movioX !== movioZ) resbalados++;
    }
    if (!hayPiso(a, quien.x, quien.z)) fuera++;
    h = (h ^ quien.x) | 0;
    h = Math.imul(h, 2654435761) | 0;
    h = (h ^ (h >>> 15)) | 0;
    h = (h ^ quien.z) | 0;
    h = Math.imul(h, 2654435761) | 0;
    h = (h ^ (h >>> 15)) | 0;
  }
  let rumbosAndados = 0;
  for (const v of vistos) if (v) rumbosAndados++;
  return {
    huella: h >>> 0,
    porCuerpo,
    porBorde,
    resbalados,
    enElVado,
    fuera,
    rumbosAndados,
    x: quien.x,
    z: quien.z,
  };
}

/** Cuánto mide una unidad del mundo en coma fija, para quien lea las cifras. */
export const UNIDAD = UNO;
