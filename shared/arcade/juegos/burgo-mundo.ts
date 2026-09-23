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
 *   · Las OBRAS DEL ANILLO, con la caja de lo que de ellas para, medida en sus caras: ver abajo.
 *
 * ═══ LAS OBRAS DEL ANILLO: LO QUE PARA, MEDIDO EN SUS CARAS ═══
 *
 * La cárcel, la comisaría, el cartel del aparcamiento, los tres cofres, la oficina, los tres casinos,
 * la central, las aguas, la tasa y las cuatro estaciones son estructura fija, igual en todas las mesas
 * y en las dos calidades, pero `escenas/burgo/obras.ts` no las escribe como cajas sino como CARAS de
 * una malla, y `shared/` no importa de `escenas/`. Así que lo que para de ellas va aquí como TABLA
 * LITERAL (`OBRAS_QUE_PARAN`), y `verify:burgo-mundo` la vuelve a medir en esas caras y exige los
 * mismos números; con `-- --obras` la escribe lista para pegar. Hasta el 24 de septiembre el anillo
 * era suelo y se atravesaban la cárcel, la comisaría y las estaciones.
 *
 * La vara es la de Las Lindes —la CINTURA y la CABEZA de quien anda (1,272 y 2,543)— sobre el suelo
 * que se pinta en cada banda del anillo: de cada pieza de la obra, lo que empieza por encima de la
 * cabeza se pasa por debajo (las marquesinas del casino y de los andenes, la visera de la comisaría,
 * el panel del cartel, el depósito del agua, los tejadillos, los barrotes de la cárcel, las bóvedas);
 * lo que no pasa de la cintura se pisa (el asfalto, las rayas, la alfombra, el andén, su canto, la
 * base del cofre, el primer peldaño de la oficina); y lo demás PARA, con la caja de su planta por
 * debajo de la cabeza. De 195 piezas paran 94, y quitando las que caben enteras en otra de su obra
 * quedan 87 cajas. Tres cosas que salen de la vara y conviene saber:
 *
 *   · La escalinata de la oficina: el segundo peldaño sube a 1,60, pasa de la cintura y para desde
 *     ahí, aunque de verdad se subiría desde el primero. La arena es plana: subir una escalera
 *     pediría alturas, que el mundo no contesta.
 *   · Las torres de refrigeración de la central y su chimenea son redondas y paran con la caja de
 *     su pie: sobra por las esquinas, como en el campo de Las Lindes.
 *   · El borde de la alberca de las aguas (1,40) para y encierra el agua; la nave de Delicias
 *     cierra su interior con cuatro muros. Son dos bolsillos a los que no se llega y en los que no
 *     hay ningún sitio de nacer: `verify:burgo-mundo` exige que todos se alcancen andando.
 *
 * Ninguna caja se mete en la ciudad ni pisa el carril de la marcha (la más cerca, la nave de la
 * central, a 20 del carril), y todas quedan dentro del tablero.
 *
 * ═══ LO QUE NO ESTÁ, Y POR QUÉ ═══
 *
 *   · El ADORNO: farolas, semáforos, árboles, bancos, tumbas, coches aparcados, carga del
 *     muelle… Depende de la calidad, y un paseante lo atraviesa. Y en el anillo, las piezas del
 *     pack de las esquinas —la verja del patio de la cárcel, con su hoja que sube, los coches
 *     patrulla, los coches del aparcamiento, el contenedor—: lo mismo que en la ciudad.
 *   · Lo que SE MUEVE: los coches que circulan y los trenes, y en las obras la tapa de los cofres,
 *     las ruletas, la joya, la reja de la celda y la moneda. Presentación.
 *   · El QUITAMIEDOS del circuito, que es una cinta con curvas.
 *   · El TEMPLETE y el ESTANQUE del parque, por razones distintas, contadas en
 *     `burgo-distritos.ts`: el templete es estructura de verdad pero se pinta en otro sitio en
 *     sobria que en plena, y el estanque es agua a ras de la acera, que no para a nadie de pie.
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
 * todos los rumbos son múltiplos exactos de π/2 y se escriben tal cual.
 *
 * ═══ Y DÓNDE SE RENACE: DETRÁS DE LOS OCHO, Y REPARTIDOS ═══
 *
 * Quien cae renace en el sitio LIBRE más cercano a donde cayó de entre los que están a 52,8 o más
 * de quien lo tumbó —lo que éste corre en los dos segundos de intocable—; si ninguno libre está
 * tan lejos, en el libre más lejano (la regla del servidor). Con sólo los ocho de entrar eso no
 * funcionaba: las Puertas están a 330 de la glorieta y los brazos de la glorieta a 25 entre sí, y
 * con las Puertas ocupadas por quien no baja de su asiento, quien caía en la glorieta renacía a
 * veintitantos de quien lo tumbó, en el segundo escalón. Medido en `verify:botas`: a 22.
 *
 * Así que detrás de los ocho de entrar —que no cambian, ni su orden: el servidor reparte al entrar
 * por el orden del asiento— van los de RENACER, en este orden:
 *
 *   · 76 EN EL ANILLO, iguales en todas las mesas: la primera fila en el eje de las 32 casillas
 *     laterales que no son Puerta, a 40 del borde de dentro —fuera del carril del avatar, que va de
 *     23 a 29, y antes de las obras—; la segunda, al tresbolillo en las rayas entre casillas, a 88
 *     —entre las obras y los andenes—; y tres por esquina, fuera de la ele de la marcha. Todos
 *     mirando a la ciudad.
 *   · Y LOS DE LA CIUDAD, que dependen de la traza: uno por cada nudo de una rejilla de seis
 *     celdas (72), en la celda de calle más cercana al nudo, mirando a lo largo de la calle, con
 *     tres celdas de calle delante y a veinte o más de cualquier otro sitio. De 77 a 80 por mesa.
 *
 * Una calle no tiene cuerpos, y el anillo, donde se ponen, tampoco. `verify:burgo-mundo` exige que
 * desde cada punto donde se puede estar haya por lo menos DOS de los de renacer a entre 52,8 y 132
 * —lo que se corre en los cinco segundos que se está caído—, que todos se alcancen andando desde
 * una Puerta y que ninguno mire a una pared. Cuesta de 161 a 164 sitios por mesa en vez de 8, y la
 * búsqueda de los de la ciudad mira de 475 a 623 celdas de las 2.916 de la retícula. Con las obras,
 * el mundo de una mesa pasa, de media, de 726 a 813 cuerpos y de 39,5 a 49,7 kB canonizado.
 */
import { medioLado } from '../../mecanicas/anillo';
import type { Cuerpo, MundoDeclarado, Sitio } from '../../mecanicas/mundo';
import { semillaDelCodigo } from '../../mecanicas/semilla';
import { ALTURA_DEL_BORDILLO, CUERPO_DEL_MODELO, RECINTO_DEL_BURGO, RUMBOS, centroDeCelda, esClaseDeCalle, trazaDelBurgo, vectorDelRumbo } from './burgo-traza';
import type { ClaseDeCelda, CuerpoDelPack, EdificioDelBurgo, Punto, RecintoDeLaCiudad, Rumbo, TrazaDelBurgo } from './burgo-traza';
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

/* ─── Dónde se renace ────────────────────────────────────────────────────── */

/** Lo que un sitio de renacer deja, como poco, entre él y cualquier otro: lo que exige `verify:burgo-mundo`. */
export const SEPARACION_ENTRE_SITIOS_DEL_BURGO = 20;

/** La primera fila del anillo: a 40 del borde de dentro de la casilla, fuera del carril del avatar (23 a 29) y antes de las obras (desde 48,5). */
export const V_DE_LA_PRIMERA_FILA = 40;
/** La segunda: a 88, entre las obras (hasta 80) y los andenes (desde 92), en la raya entre dos casillas. */
export const V_DE_LA_SEGUNDA_FILA = 88;

/**
 * LOS SITIOS DE RENACER DEL ANILLO, en el orden en que se dicen: la primera fila de cada lado (sur,
 * oeste, norte, este) en el eje de cada casilla lateral que no es Puerta; la segunda fila, en las
 * rayas entre casillas, al tresbolillo con la primera; y tres por esquina. Todos mirando a la ciudad
 * por el eje, que es por donde hay suelo libre delante.
 */
function sitiosDelAnillo(): Sitio[] {
  const salida: Sitio[] = [];
  const primera = MEDIO_LADO_DEL_BURGO - FONDO_DE_CASILLA_DEL_BURGO + V_DE_LA_PRIMERA_FILA;
  const segunda = MEDIO_LADO_DEL_BURGO - FONDO_DE_CASILLA_DEL_BURGO + V_DE_LA_SEGUNDA_FILA;
  /* Las nueve laterales de un lado tienen el eje en 72·k, de −288 a 288; la del centro es la Puerta. */
  const mitad = (CASILLAS_POR_LADO_DEL_BURGO - 3) / 2;
  const filas: { readonly radial: number; readonly t: number[] }[] = [
    { radial: primera, t: [] },
    { radial: segunda, t: [] },
  ];
  for (let k = -mitad; k <= mitad; k++) {
    if (k !== 0) (filas[0] as { t: number[] }).t.push(k * ANCHO_DE_CASILLA_DEL_BURGO);
    if (k < mitad) (filas[1] as { t: number[] }).t.push((k + 0.5) * ANCHO_DE_CASILLA_DEL_BURGO);
  }
  for (const fila of filas) {
    for (const t of fila.t) salida.push({ x: t, z: fila.radial, rumbo: AL_NORTE });
    for (const t of fila.t) salida.push({ x: -fila.radial, z: t, rumbo: AL_ESTE });
    for (const t of fila.t) salida.push({ x: t, z: -fila.radial, rumbo: AL_SUR });
    for (const t of fila.t) salida.push({ x: fila.radial, z: t, rumbo: AL_OESTE });
  }
  /* Las esquinas: una en el rincón de dentro, pasada la ele de la marcha, y dos hacia fuera. */
  for (const [a, b] of ESQUINAS_DE_RENACER) {
    for (const sx of [1, -1]) {
      for (const sz of [1, -1]) salida.push({ x: sx * a, z: sz * b, rumbo: sx > 0 ? AL_OESTE : AL_ESTE });
    }
  }
  return salida;
}

/** Los tres sitios de cada esquina, en su cuarto de tablero: `(|x|, |z|)`. */
const ESQUINAS_DE_RENACER: readonly (readonly [number, number])[] = [
  [364, 364],
  [360, 420],
  [420, 360],
];

/** Los del anillo, iguales en todas las mesas: van detrás de los ocho de entrar. */
export const RENACE_EN_EL_ANILLO: readonly Sitio[] = sitiosDelAnillo();

/** Cada cuántas celdas de la retícula se busca un sitio de renacer en la ciudad: seis, 72 unidades. */
export const PASO_DE_LOS_SITIOS_DE_LA_CIUDAD = 6;

/** Cuántas celdas de calle tiene que haber delante de un sitio de la ciudad: tres, las 36 unidades que se andan en sesenta tics. */
const CALLE_DELANTE = 3;

/** El rumbo del paseante de cada rumbo del Burgo (0 este, 1 sur, 2 oeste, 3 norte). */
const RUMBO_DEL_PASEANTE: readonly number[] = [AL_ESTE, AL_SUR, AL_OESTE, AL_NORTE];

/*
 * ═══ Y LO QUE CUESTA, CONTADO ═══
 *
 * Como en `lindes-mundo.ts`: cuántos mundos se han derivado y cuántas celdas ha mirado la búsqueda de
 * los sitios de la ciudad, para que un comprobador CUENTE lo que cuesta en vez de cronometrarlo. Nada
 * de aquí lo lee.
 */
let mundosDerivados = 0;
let celdasMiradasParaRenacer = 0;

/** Lo que ha trabajado este módulo desde que se cargó. */
export function cuentasDelMundoDelBurgo(): { readonly mundos: number; readonly celdasMiradasParaRenacer: number } {
  return { mundos: mundosDerivados, celdasMiradasParaRenacer };
}

/**
 * LOS SITIOS DE RENACER DE LA CIUDAD DE UNA TRAZA: uno por cada nudo de una rejilla de
 * `PASO_DE_LOS_SITIOS_DE_LA_CIUDAD` celdas, en la celda de CALLE más cercana al nudo —en anillos de
 * Chebyshev de hasta medio paso, y dentro de cada anillo por filas—, mirando a lo largo de la calle
 * por donde más calle hay delante, y sólo si hay por lo menos `CALLE_DELANTE`. Una calle no tiene
 * cuerpos: ni edificio, ni distrito, ni obra. Si la celda queda a menos de la separación de un sitio
 * ya puesto, se prueba la siguiente; si ninguna vale, ese nudo se queda sin sitio.
 *
 * Sin clausuras dentro de los bucles, que Hermes 0.12 no liga el `let` por iteración.
 */
function sitiosDeLaCiudad(recinto: RecintoDeLaCiudad, traza: TrazaDelBurgo, yaPuestos: readonly Sitio[]): Sitio[] {
  const t = traza.trazado;
  const n = t.n;
  const esCalle = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < n && j < n && esClaseDeCalle(t.clase[j * n + i] as ClaseDeCelda);
  const separacion2 = SEPARACION_ENTRE_SITIOS_DEL_BURGO * SEPARACION_ENTRE_SITIOS_DEL_BURGO;
  const puestos: Sitio[] = yaPuestos.slice();
  const salida: Sitio[] = [];
  const medio = Math.floor(PASO_DE_LOS_SITIOS_DE_LA_CIUDAD / 2);
  for (let aj = medio; aj < n; aj += PASO_DE_LOS_SITIOS_DE_LA_CIUDAD) {
    for (let ai = medio; ai < n; ai += PASO_DE_LOS_SITIOS_DE_LA_CIUDAD) {
      let hallado: Sitio | null = null;
      for (let d = 0; d <= medio && hallado === null; d++) {
        for (let j = aj - d; j <= aj + d && hallado === null; j++) {
          for (let i = ai - d; i <= ai + d && hallado === null; i++) {
            if (Math.max(Math.abs(i - ai), Math.abs(j - aj)) !== d) continue;
            celdasMiradasParaRenacer++;
            if (!esCalle(i, j)) continue;
            let mejor = -1;
            let cuanta = 0;
            for (const r of RUMBOS) {
              const v = vectorDelRumbo(r);
              let k = 0;
              while (k < CALLE_DELANTE && esCalle(i + v.x * (k + 1), j + v.z * (k + 1))) k++;
              if (k > cuanta) {
                cuanta = k;
                mejor = r;
              }
            }
            if (mejor < 0 || cuanta < CALLE_DELANTE) continue;
            const c = centroDeCelda(recinto, i, j);
            let cerca = false;
            for (const q of puestos) {
              if ((q.x - c.x) * (q.x - c.x) + (q.z - c.z) * (q.z - c.z) < separacion2) cerca = true;
            }
            if (cerca) continue;
            hallado = { x: c.x, z: c.z, rumbo: RUMBO_DEL_PASEANTE[mejor] as number };
          }
        }
      }
      if (hallado === null) continue;
      salida.push(hallado);
      puestos.push(hallado);
    }
  }
  return salida;
}

/* ─── Las obras del anillo que paran a quien anda ────────────────────────── */

/** Las cajas de una obra del anillo que paran a quien anda, en el mundo, y la casilla de la obra. */
export interface ObraQueParaDelBurgo {
  readonly casilla: number;
  readonly cajas: readonly Cuerpo[];
}

/**
 * LAS OBRAS DEL ANILLO QUE PARAN A QUIEN ANDA — TABLA MEDIDA: NO SE EDITA A MANO.
 *
 *   npm run verify:burgo-mundo -w server -- --obras
 *
 * la escribe lista para pegar, midiendo las caras de `escenas/burgo/obras.ts`, y el mismo comprobador
 * exige que sea exactamente lo que miden. Cómo se mide, en la cabecera de este fichero.
 */
export const OBRAS_QUE_PARAN: readonly ObraQueParaDelBurgo[] = [
  {
    casilla: 20,
    cajas: [
      { x0: -403.7, z0: -403.7, x1: -402.3, z1: -402.3 },
    ],
  },
  {
    casilla: 10,
    cajas: [
      { x0: -431, z0: 409, x1: -408, z1: 424 },
      { x0: -421, z0: 396, x1: -409, z1: 407 },
      { x0: -408, z0: 409, x1: -396, z1: 421 },
      { x0: -427, z0: 394.4, x1: -408, z1: 396 },
      { x0: -396, z0: 408, x1: -394.4, z1: 427 },
      { x0: -429.5, z0: 392.7, x1: -424.5, z1: 397.7 },
      { x0: -397.7, z0: 424.5, x1: -392.7, z1: 429.5 },
    ],
  },
  {
    casilla: 30,
    cajas: [
      { x0: 400, z0: -400, x1: 428, z1: -372 },
      { x0: 394, z0: -380.2, x1: 395.2, z1: -379 },
      { x0: 394, z0: -393, x1: 395.2, z1: -391.8 },
      { x0: 404, z0: -412, x1: 416, z1: -410.8 },
      { x0: 404, z0: -401.2, x1: 416, z1: -400 },
      { x0: 414.8, z0: -412, x1: 416, z1: -400 },
    ],
  },
  {
    casilla: 2,
    cajas: [
      { x0: 208, z0: 382, x1: 224, z1: 398 },
      { x0: 219.5, z0: 381.2, x1: 220.5, z1: 398.8 },
      { x0: 211.5, z0: 381.2, x1: 212.5, z1: 398.8 },
    ],
  },
  {
    casilla: 4,
    cajas: [
      { x0: 60, z0: 385, x1: 84, z1: 404 },
    ],
  },
  {
    casilla: 5,
    cajas: [
      { x0: 26.35, z0: 418.35, x1: 27.65, z1: 419.65 },
      { x0: 26.35, z0: 427.35, x1: 27.65, z1: 428.65 },
      { x0: 8.35, z0: 418.35, x1: 9.65, z1: 419.65 },
      { x0: 8.35, z0: 427.35, x1: 9.65, z1: 428.65 },
      { x0: -9.65, z0: 418.35, x1: -8.35, z1: 419.65 },
      { x0: -9.65, z0: 427.35, x1: -8.35, z1: 428.65 },
      { x0: -27.65, z0: 418.35, x1: -26.35, z1: 419.65 },
      { x0: -27.65, z0: 427.35, x1: -26.35, z1: 428.65 },
      { x0: -20, z0: 384, x1: 20, z1: 401 },
      { x0: 10.8, z0: 383.9, x1: 15.2, z1: 384 },
      { x0: -15.2, z0: 383.9, x1: -10.8, z1: 384 },
    ],
  },
  {
    casilla: 7,
    cajas: [
      { x0: -152, z0: 375, x1: -130, z1: 393 },
    ],
  },
  {
    casilla: 12,
    cajas: [
      { x0: -398, z0: 218.5, x1: -388, z1: 228.5 },
      { x0: -398, z0: 203.5, x1: -388, z1: 213.5 },
      { x0: -382.5, z0: 214.5, x1: -379.5, z1: 217.5 },
      { x0: -377, z0: 204, x1: -373.5, z1: 228 },
    ],
  },
  {
    casilla: 15,
    cajas: [
      { x0: -419.65, z0: 26.35, x1: -418.35, z1: 27.65 },
      { x0: -428.65, z0: 26.35, x1: -427.35, z1: 27.65 },
      { x0: -419.65, z0: 8.35, x1: -418.35, z1: 9.65 },
      { x0: -428.65, z0: 8.35, x1: -427.35, z1: 9.65 },
      { x0: -419.65, z0: -9.65, x1: -418.35, z1: -8.35 },
      { x0: -428.65, z0: -9.65, x1: -427.35, z1: -8.35 },
      { x0: -419.65, z0: -27.65, x1: -418.35, z1: -26.35 },
      { x0: -428.65, z0: -27.65, x1: -427.35, z1: -26.35 },
      { x0: -380, z0: -24, x1: -377, z1: 24 },
      { x0: -399, z0: -24, x1: -396, z1: 24 },
      { x0: -399, z0: 23, x1: -377, z1: 25 },
      { x0: -399, z0: -25, x1: -377, z1: -23 },
    ],
  },
  {
    casilla: 17,
    cajas: [
      { x0: -398, z0: -152, x1: -382, z1: -136 },
      { x0: -398.8, z0: -140.5, x1: -381.2, z1: -139.5 },
      { x0: -398.8, z0: -148.5, x1: -381.2, z1: -147.5 },
    ],
  },
  {
    casilla: 22,
    cajas: [
      { x0: -230, z0: -393, x1: -208, z1: -375 },
    ],
  },
  {
    casilla: 25,
    cajas: [
      { x0: -27.65, z0: -419.65, x1: -26.35, z1: -418.35 },
      { x0: -27.65, z0: -428.65, x1: -26.35, z1: -427.35 },
      { x0: -9.65, z0: -419.65, x1: -8.35, z1: -418.35 },
      { x0: -9.65, z0: -428.65, x1: -8.35, z1: -427.35 },
      { x0: 8.35, z0: -419.65, x1: 9.65, z1: -418.35 },
      { x0: 8.35, z0: -428.65, x1: 9.65, z1: -427.35 },
      { x0: 26.35, z0: -419.65, x1: 27.65, z1: -418.35 },
      { x0: 26.35, z0: -428.65, x1: 27.65, z1: -427.35 },
      { x0: -22, z0: -384, x1: -14, z1: -376 },
      { x0: 14, z0: -384, x1: 22, z1: -376 },
      { x0: -14, z0: -381, x1: 14, z1: -379 },
      { x0: -14, z0: -395, x1: 14, z1: -381 },
    ],
  },
  {
    casilla: 28,
    cajas: [
      { x0: 205.2, z0: -381, x1: 206, z1: -380.2 },
      { x0: 205.2, z0: -387.8, x1: 206, z1: -387 },
      { x0: 212, z0: -381, x1: 212.8, z1: -380.2 },
      { x0: 212, z0: -387.8, x1: 212.8, z1: -387 },
      { x0: 217, z0: -400, x1: 217.9, z1: -384 },
      { x0: 228.1, z0: -400, x1: 229, z1: -384 },
      { x0: 217.9, z0: -384.9, x1: 228.1, z1: -384 },
      { x0: 217.9, z0: -400, x1: 228.1, z1: -399.1 },
      { x0: 203, z0: -398.5, x1: 213, z1: -393 },
    ],
  },
  {
    casilla: 33,
    cajas: [
      { x0: 382, z0: -152, x1: 398, z1: -136 },
      { x0: 381.2, z0: -148.5, x1: 398.8, z1: -147.5 },
      { x0: 381.2, z0: -140.5, x1: 398.8, z1: -139.5 },
    ],
  },
  {
    casilla: 35,
    cajas: [
      { x0: 418.35, z0: -27.65, x1: 419.65, z1: -26.35 },
      { x0: 427.35, z0: -27.65, x1: 428.65, z1: -26.35 },
      { x0: 418.35, z0: -9.65, x1: 419.65, z1: -8.35 },
      { x0: 427.35, z0: -9.65, x1: 428.65, z1: -8.35 },
      { x0: 418.35, z0: 8.35, x1: 419.65, z1: 9.65 },
      { x0: 427.35, z0: 8.35, x1: 428.65, z1: 9.65 },
      { x0: 418.35, z0: 26.35, x1: 419.65, z1: 27.65 },
      { x0: 427.35, z0: 26.35, x1: 428.65, z1: 27.65 },
      { x0: 382, z0: -18, x1: 396, z1: 18 },
      { x0: 380, z0: -26, x1: 388, z1: -18 },
      { x0: 380, z0: 18, x1: 388, z1: 26 },
    ],
  },
  {
    casilla: 36,
    cajas: [
      { x0: 375, z0: 58, x1: 393, z1: 80 },
    ],
  },
  {
    casilla: 38,
    cajas: [
      { x0: 384, z0: 212, x1: 392, z1: 220 },
    ],
  },
];

/* ─── El mundo ───────────────────────────────────────────────────────────── */

/**
 * EL MUNDO DE UNA SEMILLA. Función pura: la misma semilla da el mismo mundo en el servidor, en
 * los dos clientes y en los dos motores.
 */
export function mundoDeLaSemilla(semilla: number): MundoDeclarado {
  mundosDerivados++;
  const recinto = RECINTO_DEL_BURGO;
  const traza = trazaDelBurgo(semilla, recinto);
  const cuerpos: Cuerpo[] = [];
  for (const e of traza.edificios) cuerpos.push(cajaDelEdificio(e));
  for (const c of cuerposDeLosDistritos(recinto, traza)) cuerpos.push(c);
  cuerpos.push(cajaDelVolumen(pedestalDeLaGlorieta(recinto)));
  for (const o of OBRAS_QUE_PARAN) for (const c of o.cajas) cuerpos.push(c);
  const nace: Sitio[] = [...NACE_EN_EL_BURGO, ...RENACE_EN_EL_ANILLO];
  for (const s of sitiosDeLaCiudad(recinto, traza, nace)) nace.push(s);
  return {
    lado: LADO_DEL_TABLERO_DEL_BURGO,
    pisables: [{ x: 0, y: 0 }],
    vados: [],
    cuerpos,
    nace,
  };
}

/**
 * EL MUNDO DE UNA MESA DEL BURGO, por su código. La semilla es la de `ciudadDelCodigo` —la de
 * `semillaDelCodigo`, con la portada en 1—, así que el mundo es la ciudad que se ve.
 */
export function mundoDelBurgo(codigo: string): MundoDeclarado {
  return mundoDeLaSemilla(semillaDelCodigo(codigo, 1));
}
