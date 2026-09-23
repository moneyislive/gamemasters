/**
 * EL MUNDO DEL BURGO: por dónde se anda y con qué se choca en una mesa del Burgo.
 *
 * ═══ UNA FUNCIÓN DEL CÓDIGO DE LA MESA, Y DE NADA MÁS ═══
 *
 * `mundoDelBurgo(código)` no recibe la calidad del aparato ni la vista de la partida, y las dos
 * ausencias son la decisión:
 *
 *   · LA CALIDAD NO ENTRA porque la decide cada aparato con sus primeros 120 fotogramas, y el
 *     mundo tiene que ser el mismo para los seis de la mesa y para el servidor que arbitra. Se
 *     midió que la ciudad de sobria tiene 2.808 obstáculos menos que la de plena: todo lo que
 *     cambia con la calidad es adorno y aquí no está. Lo que está —la traza y lo sólido de los
 *     distritos, de `burgo-traza.ts` y `burgo-distritos.ts`— sale igual en las dos, y
 *     `verify:burgo-mundo` lo comprueba sacando el mundo de lo que la escena PINTA en cada una.
 *   · LA VISTA NO ENTRA, y es lo que hubo que decidir. Lo único del Burgo que se levanta durante
 *     la partida son las casas y las posadas de la franja del barrio, y sus banderas. Son las
 *     FICHAS del juego, no el tablero: cambian con cada compra, y meterlas obligaría a derivar
 *     otra vez la arena con cada revisión y dejaría una ventana en la que el aparato y el
 *     servidor andan por mundos distintos porque la vista les llegó en momentos distintos.
 *     Viven en la franja (de 324 a 345 del centro), fuera del carril por el que se anda (de 347
 *     a 353). Si Boots on Board las quiere sólidas, van como una segunda capa derivada de la
 *     vista —`mundoDelBurgo(código)` más las cajas de las fichas—, con su propio comprobador.
 *
 * ═══ EL SUELO ES EL TABLERO ENTERO ═══
 *
 * 864 × 864: la ciudad de 648 y el anillo de casillas alrededor. Todo es suelo —calzada, acera,
 * parcela, casilla—, así que basta UNA casilla de 864 centrada en el origen, y su borde es el del
 * tablero. Fuera está el campo, que no se pisa. El agua del canal no se declara como hueco en el
 * suelo sino como cuerpo: tiene 18 de ancho y ninguna rejilla de casillas del tablero cae sobre
 * ella; con cajas, en cambio, se le pueden dejar los tres puentes abiertos.
 *
 * ═══ LOS CUERPOS: CAJAS EXACTAS, PORQUE TODO GIRA DE CUARTO EN CUARTO ═══
 *
 * Todos los edificios de la ciudad y todo lo sólido de los distritos está girado un múltiplo
 * exacto de un cuarto de vuelta: su huella es una caja alineada con los ejes, sin aproximar y sin
 * un seno. La cuenta se hace con el RUMBO al que mira cada cosa (0 a 3) y no con su giro en
 * radianes, que es lo que se pinta: multiplicar por ±1 es exacto, y `Math.cos(π/2)` no da cero.
 *
 *   · Un edificio con cáscara del pack ocupa su caja MEDIDA, que no está centrada en su origen:
 *     en ejes del edificio va de `frente − fondo` a `frente` (`CUERPO_DEL_MODELO`), porque tres de
 *     los modelos sacan el alero 0,90 por delante. El alero cuenta: es la caja del `.glb`, la
 *     misma con la que `verify:la-ciudad` mide que ningún edificio se sale de su parcela.
 *   · Una torre del centro y los prismas de los distritos están centrados: son geometría propia
 *     y se pintan con una caja unitaria escalada.
 *   · Lo que está en el aire —marquesinas, porches, toldos, el brazo de la grúa, los forjados y
 *     pilares de las plantas altas de la obra— no para a nadie: se pasa por debajo. Sus pilares
 *     de la planta baja, sí.
 *
 * ═══ LO QUE NO ESTÁ, Y POR QUÉ ═══
 *
 *   · El ADORNO: farolas, semáforos, árboles, bancos, tumbas, coches aparcados, carga del
 *     muelle… Depende de la calidad, y un paseante lo atraviesa.
 *   · Lo que SE MUEVE: los coches que circulan y los trenes. Presentación.
 *   · El TEMPLETE y el ESTANQUE del parque, que salen en otro sitio en sobria en 48 de 62 mesas
 *     (ver `burgo-distritos.ts`). El QUITAMIEDOS del circuito, que es una cinta con curvas.
 *   · LAS OBRAS DEL ANILLO —la cárcel, la comisaría, las estaciones, los cofres, los casinos, la
 *     central, las aguas y la oficina—, que son estructura fija pero están escritas como CARAS
 *     de una malla en `escenas/burgo/obras.ts`, no como cajas, y en la escena. Declararlas pide
 *     medir sus cajas en el mundo y escribirlas aquí como tabla, con un comprobador que las
 *     vuelva a medir contra `obras.ts`. No está hecho: hoy el anillo es suelo, y por eso donde
 *     se nace en él es sobre la línea de la marcha, que ninguna obra pisa por construcción.
 *
 * ═══ DÓNDE SE NACE ═══
 *
 * Ocho sitios, en orden de reparto: las cuatro Puertas del anillo (las casillas 5, 15, 25 y 35,
 * por donde entran las cuatro avenidas), sobre la línea de la marcha y mirando a la ciudad por
 * su avenida; y los cuatro brazos de la glorieta, en el asfalto que rodea la isleta y mirando
 * hacia fuera por la misma avenida. Con cuatro jugadores, cada uno entra por una Puerta.
 *
 * El rumbo va en el convenio del paseante (`shared/mecanicas/mundo.ts`): 0 es el norte —la z
 * negativa— y crece hacia el este. El Burgo cuenta al revés en su escena: `rumboDeLaMarcha` es
 * `atan2(dx, dz)`, o sea 0 hacia +z; en el paseante eso es `π − giro`. Aquí no se convierte nada:
 * los ocho rumbos son múltiplos exactos de π/2 y se escriben tal cual.
 */
import { medioLado } from '../../mecanicas/anillo';
import type { Cuerpo, MundoDeclarado, Sitio } from '../../mecanicas/mundo';
import { semillaDelCodigo } from '../../mecanicas/semilla';
import { ALTURA_DEL_BORDILLO, CUERPO_DEL_MODELO, RECINTO_DEL_BURGO, trazaDelBurgo, vectorDelRumbo } from './burgo-traza';
import type { CuerpoDelPack, EdificioDelBurgo, Punto, RecintoDeLaCiudad, Rumbo, TrazaDelBurgo } from './burgo-traza';
import {
  cajaDelDistrito,
  estructuraDeLaEstacion,
  estructuraDeLaGasolinera,
  estructuraDeLaObra,
  estructuraDelCanal,
  estructuraDelColegio,
  estructuraDelEstadio,
  estructuraDelHospital,
  gradasDelCircuito,
  haciaElCentroDe,
  naveDelCentroComercial,
  navesDelPoligono,
  pedestalDeLaGlorieta,
} from './burgo-distritos';
import type { CascaraPuesta, VolumenDeEstructura } from './burgo-distritos';

/* ─── El tablero ─────────────────────────────────────────────────────────── */

/*
 * Las medidas del anillo, escritas aquí porque `shared/` no importa de `escenas/`: son las de
 * `escenas/burgo/anillo-en-3d.ts` (casilla de 72 × 108, once por lado, y la franja del barrio y el
 * filete de sus bandas), y `verify:burgo-mundo` comprueba que siguen siéndolo.
 */
export const ANCHO_DE_CASILLA_DEL_BURGO = 72;
export const FONDO_DE_CASILLA_DEL_BURGO = 108;
export const CASILLAS_POR_LADO_DEL_BURGO = 11;
/** 432: la mitad del lado del tablero. */
export const MEDIO_LADO_DEL_BURGO = medioLado(ANCHO_DE_CASILLA_DEL_BURGO, FONDO_DE_CASILLA_DEL_BURGO, CASILLAS_POR_LADO_DEL_BURGO);
/** 864: el tablero entero, que es el suelo. */
export const LADO_DEL_TABLERO_DEL_BURGO = 2 * MEDIO_LADO_DEL_BURGO;
/** La franja del barrio (21) y el filete (9) de una casilla, de dentro afuera. */
export const FRANJA_DEL_BARRIO = 21;
export const FILETE_DE_LA_CASILLA = 9;
/** 349,5: la línea por la que anda el aventurero, el centro del filete. */
export const LINEA_DE_LA_MARCHA_DEL_BURGO = MEDIO_LADO_DEL_BURGO - FONDO_DE_CASILLA_DEL_BURGO + FRANJA_DEL_BARRIO + FILETE_DE_LA_CASILLA / 2;

/* ─── Las cajas ──────────────────────────────────────────────────────────── */

/**
 * LA CAJA DE UNA HUELLA GIRADA A UN RUMBO, sin trigonometría.
 *
 * En ejes de la pieza, `x` va de `−ancho/2` a `ancho/2` y `z` de `desde` a `hasta`; la pieza mira
 * a `mira`, o sea que su +Z local acaba en `vectorDelRumbo(mira)` y su +X local en `(v.z, −v.x)`
 * —el `rotation.y` de three con `giroMirandoA`—. Como uno de los dos ejes de `v` vale ±1 y el otro
 * 0, cada eje del mundo recibe exactamente uno de los locales, y multiplicar por ±1 es exacto.
 */
export function cajaDeLaHuella(centro: Punto, mira: Rumbo, ancho: number, desde: number, hasta: number): Cuerpo {
  const v = vectorDelRumbo(mira);
  if (v.x !== 0) {
    const a = centro.x + v.x * desde;
    const b = centro.x + v.x * hasta;
    return { x0: Math.min(a, b), z0: centro.z - ancho / 2, x1: Math.max(a, b), z1: centro.z + ancho / 2 };
  }
  const a = centro.z + v.z * desde;
  const b = centro.z + v.z * hasta;
  return { x0: centro.x - ancho / 2, z0: Math.min(a, b), x1: centro.x + ancho / 2, z1: Math.max(a, b) };
}

/** La caja de una cáscara del pack: la medida del modelo, que va de `frente − fondo` a `frente` en sus ejes. */
function cajaDelModelo(cascara: string, centro: Punto, mira: Rumbo): Cuerpo {
  const m = CUERPO_DEL_MODELO[cascara] as CuerpoDelPack;
  return cajaDeLaHuella(centro, mira, m.ancho, m.frente - m.fondo, m.frente);
}

/** La caja de un edificio de la traza: la de su modelo si tiene cáscara, y la de su prisma centrado si es una torre. */
export function cajaDelEdificio(e: EdificioDelBurgo): Cuerpo {
  if (e.cascara === null) return cajaDeLaHuella(e.centro, e.frente, e.ancho, -e.fondo / 2, e.fondo / 2);
  return cajaDelModelo(e.cascara, e.centro, e.frente);
}

/** La caja de una cáscara del pack puesta en un distrito. */
export function cajaDeLaCascara(c: CascaraPuesta): Cuerpo {
  return cajaDelModelo(c.cascara, { x: c.x, z: c.z }, c.mira);
}

/** La caja de un prisma de la estructura: centrada, y con el ancho y el fondo cambiados si gira un número impar de cuartos. */
export function cajaDelVolumen(v: VolumenDeEstructura): Cuerpo {
  const par = v.cuartos % 2 === 0;
  const mx = (par ? v.ancho : v.fondo) / 2;
  const mz = (par ? v.fondo : v.ancho) / 2;
  return { x0: v.x - mx, z0: v.z - mz, x1: v.x + mx, z1: v.z + mz };
}

/**
 * EL CANAL, MENOS SUS PUENTES: la banda de agua y cantiles de punta a punta, cortada donde la
 * cruza cada puente. Salen tantos trozos como huecos entre puentes, cada uno de borde a borde.
 */
export function cuerposDelCanal(agua: VolumenDeEstructura, cantiles: readonly VolumenDeEstructura[], puentes: readonly VolumenDeEstructura[]): Cuerpo[] {
  const cajas = [cajaDelVolumen(agua), ...cantiles.map(cajaDelVolumen)];
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  for (const c of cajas) {
    x0 = Math.min(x0, c.x0);
    z0 = Math.min(z0, c.z0);
    x1 = Math.max(x1, c.x1);
    z1 = Math.max(z1, c.z1);
  }
  const aLoLargoEnX = x1 - x0 >= z1 - z0;
  const huecos = puentes
    .map(cajaDelVolumen)
    .map((p) => (aLoLargoEnX ? { desde: p.x0, hasta: p.x1 } : { desde: p.z0, hasta: p.z1 }))
    .sort((a, b) => a.desde - b.desde);
  const salida: Cuerpo[] = [];
  let cursor = aLoLargoEnX ? x0 : z0;
  const fin = aLoLargoEnX ? x1 : z1;
  const trozo = (desde: number, hasta: number): void => {
    if (hasta <= desde) return;
    salida.push(aLoLargoEnX ? { x0: desde, z0, x1: hasta, z1 } : { x0, z0: desde, x1, z1: hasta });
  };
  for (const h of huecos) {
    trozo(cursor, h.desde);
    cursor = Math.max(cursor, h.hasta);
  }
  trozo(cursor, fin);
  return salida;
}

/** ¿Pisa el suelo este prisma, o está en el aire? Un pilar sobre un andén cuenta: el andén se pisa. */
function pisaElSuelo(v: VolumenDeEstructura): boolean {
  return v.y <= ALTURA_DEL_BORDILLO + 0.6;
}

/**
 * LO SÓLIDO DE LOS DISTRITOS DE RESERVA, en el orden en que la traza los pone.
 *
 * El parque, el cementerio y la feria no ponen nada: lo suyo o es suelo, o es adorno, o depende
 * de la calidad (ver la cabecera). Los demás ponen sus naves, sus gradas, sus muros, sus pilares
 * en el suelo, sus surtidores, sus cáscaras del pack y, el canal, su agua menos los puentes.
 */
export function cuerposDeLosDistritos(recinto: RecintoDeLaCiudad, traza: TrazaDelBurgo): Cuerpo[] {
  const salida: Cuerpo[] = [];
  const volumenes = (lista: readonly VolumenDeEstructura[]): void => {
    for (const v of lista) if (pisaElSuelo(v)) salida.push(cajaDelVolumen(v));
  };
  const cascaras = (lista: readonly CascaraPuesta[]): void => {
    for (const c of lista) salida.push(cajaDeLaCascara(c));
  };
  for (const d of traza.trazado.distritos) {
    if (!d.esReserva) continue;
    const caja = cajaDelDistrito(recinto, d);
    const haciaElCentro = haciaElCentroDe(recinto, caja);
    if (d.nombre === 'centro-comercial') volumenes([naveDelCentroComercial(caja)]);
    else if (d.nombre === 'poligono') {
      for (const nave of navesDelPoligono(caja)) if (nave !== null) volumenes([nave]);
    } else if (d.nombre === 'circuito') volumenes([gradasDelCircuito(caja)]);
    else if (d.nombre === 'estadio') {
      const e = estructuraDelEstadio(caja);
      volumenes(e.gradas);
      volumenes(e.pilares);
      volumenes(e.muros);
    } else if (d.nombre === 'estacion') {
      const e = estructuraDeLaEstacion(caja);
      volumenes(e.pilares);
      cascaras([e.viajeros]);
    } else if (d.nombre === 'canal') {
      const e = estructuraDelCanal(caja);
      for (const c of cuerposDelCanal(e.agua, e.cantiles, e.puentes)) salida.push(c);
    } else if (d.nombre === 'hospital') cascaras(estructuraDelHospital(caja, haciaElCentro).cascaras);
    else if (d.nombre === 'colegio') cascaras(estructuraDelColegio(caja, haciaElCentro));
    else if (d.nombre === 'gasolinera') {
      const e = estructuraDeLaGasolinera(caja, haciaElCentro);
      volumenes(e.pilares);
      volumenes(e.surtidores);
      cascaras([e.tienda]);
    } else if (d.nombre === 'obra') {
      for (const planta of estructuraDeLaObra(caja)) volumenes(planta.pilares);
    }
  }
  return salida;
}

/* ─── Dónde se nace ──────────────────────────────────────────────────────── */

/** Los cuatro rumbos del paseante, en radianes: 0 al norte (la z negativa), creciendo hacia el este. */
const AL_NORTE = 0;
const AL_ESTE = Math.PI / 2;
const AL_SUR = Math.PI;
const AL_OESTE = (3 * Math.PI) / 2;

/** A qué distancia del centro se nace en la glorieta: en medio del anillo de asfalto, entre la isleta (12) y las avenidas (24). */
export const RADIO_DE_LA_GLORIETA_AL_NACER = 18;

/** Los ocho sitios, en orden de reparto: ver la cabecera. */
export const NACE_EN_EL_BURGO: readonly Sitio[] = [
  /* Las cuatro Puertas, sobre la marcha y mirando a la ciudad: la 5 (sur), la 25 (norte), la 15 (oeste) y la 35 (este). */
  { x: 0, z: LINEA_DE_LA_MARCHA_DEL_BURGO, rumbo: AL_NORTE },
  { x: 0, z: -LINEA_DE_LA_MARCHA_DEL_BURGO, rumbo: AL_SUR },
  { x: -LINEA_DE_LA_MARCHA_DEL_BURGO, z: 0, rumbo: AL_ESTE },
  { x: LINEA_DE_LA_MARCHA_DEL_BURGO, z: 0, rumbo: AL_OESTE },
  /* Y los cuatro brazos de la glorieta, mirando hacia fuera por su avenida. */
  { x: 0, z: RADIO_DE_LA_GLORIETA_AL_NACER, rumbo: AL_SUR },
  { x: 0, z: -RADIO_DE_LA_GLORIETA_AL_NACER, rumbo: AL_NORTE },
  { x: -RADIO_DE_LA_GLORIETA_AL_NACER, z: 0, rumbo: AL_OESTE },
  { x: RADIO_DE_LA_GLORIETA_AL_NACER, z: 0, rumbo: AL_ESTE },
];

/* ─── El mundo ───────────────────────────────────────────────────────────── */

/**
 * EL MUNDO DE UNA SEMILLA. Función pura: la misma semilla da el mismo mundo en el servidor, en
 * los dos clientes y en los dos motores.
 */
export function mundoDeLaSemilla(semilla: number): MundoDeclarado {
  const recinto = RECINTO_DEL_BURGO;
  const traza = trazaDelBurgo(semilla, recinto);
  const cuerpos: Cuerpo[] = [];
  for (const e of traza.edificios) cuerpos.push(cajaDelEdificio(e));
  for (const c of cuerposDeLosDistritos(recinto, traza)) cuerpos.push(c);
  cuerpos.push(cajaDelVolumen(pedestalDeLaGlorieta(recinto)));
  return {
    lado: LADO_DEL_TABLERO_DEL_BURGO,
    pisables: [{ x: 0, y: 0 }],
    vados: [],
    cuerpos,
    nace: NACE_EN_EL_BURGO,
  };
}

/**
 * EL MUNDO DE UNA MESA DEL BURGO, por su código. La semilla es la de `ciudadDelCodigo` —la de
 * `semillaDelCodigo`, con la portada en 1—, así que el mundo es la ciudad que se ve.
 */
export function mundoDelBurgo(codigo: string): MundoDeclarado {
  return mundoDeLaSemilla(semillaDelCodigo(codigo, 1));
}
