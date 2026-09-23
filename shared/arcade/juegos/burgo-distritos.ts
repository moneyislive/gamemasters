/**
 * LO QUE SE LEVANTA EN LOS DISTRITOS DEL BURGO Y NO ES ADORNO: naves, gradas, muros, pilares,
 * surtidores, el agua del canal y sus puentes, las cáscaras del pack de los edificios de distrito
 * y el pedestal de la glorieta.
 *
 * ═══ POR QUÉ ESTO ESTÁ PARTIDO DEL RESTO DEL DISTRITO ═══
 *
 * Cada distrito de reserva se llena en la escena (`montarElEstadio`, `montarElCanal`… en
 * `escenas/burgo/ciudad.ts`) con dos clases de cosas que conviven en la misma función y no tienen
 * el mismo estatuto:
 *
 *   · LO QUE ESTÁ Y ES IGUAL PARA TODOS: la nave del centro comercial, las gradas del estadio,
 *     los bloques del hospital. Sale sólo de la caja del distrito —que sale de la traza— con
 *     sumas y productos: ni azar, ni calidad. Eso es estructura, se declara aquí y es lo que
 *     `burgo-mundo.ts` convierte en cajas con las que se choca.
 *   · LO QUE CAMBIA CON EL APARATO O CON EL AZAR: las tumbas, los árboles del parque, la carga
 *     del muelle, los coches aparcados, la verja que en sobria va de cuatro en cuatro. Eso es
 *     adorno, y se queda en la escena.
 *
 * Las funciones de aquí devuelven los MISMOS números que la escena escribía, con la misma cuenta y
 * en el mismo orden, y la escena pinta a partir de ellos: una sola fuente para lo que se ve y lo
 * que para. `verify:burgo-mundo` guarda la huella de la ciudad de antes de la mudanza y compara,
 * en las dos calidades, lo que la escena pinta con lo que el mundo declara.
 *
 * ═══ LO QUE NO ESTÁ, AUNQUE PAREZCA ESTRUCTURA ═══
 *
 *   · El TEMPLETE y el ESTANQUE del parque. Cuelgan del sendero, y el sendero sortea su onda con
 *     el chorro de azar de la ciudad DESPUÉS de distritos cuya densidad depende de la calidad:
 *     medido, en 48 de 62 mesas salen en otro sitio en un móvil que en un PC. Declararlos sería
 *     poner una pared invisible a medio mundo. Arreglarlo es sacar su sorteo a un azar propio, y
 *     eso los mueve de sitio en la app de hoy: no se hace aquí.
 *   · El QUITAMIEDOS del circuito, que es una cinta con curvas y no una caja.
 *   · Las piezas del pack que un distrito pone como MOBILIARIO —la cripta, las mesas de la feria,
 *     la torre de agua de la grúa—. Van en la lista cuya densidad decide la calidad; alguna, como
 *     la cripta, sale igual en las dos, pero eso se decide por capas y no pieza a pieza: la que
 *     tenga que parar a alguien se sube aquí, con su caja medida.
 *
 * ═══ EL FALLO DE DIBUJO QUE ESTO DEJABA A LA VISTA, Y CÓMO SE ARREGLÓ ═══
 *
 * Los muros del este y del oeste del estadio llevaban el ancho y el fondo YA cambiados —un metro
 * de ancho y el largo del lado de fondo— y además el cuarto de vuelta de `giroMirandoA`: giraban
 * DOS veces. Se pintaban a lo ancho y no a lo largo, o sea como una pared de 107 × 1 cruzada al
 * lado que tenían que cerrar, y se salían 53 del distrito por fuera, atravesando la calle entera.
 * Desde el aire era una raya gris sobre el asfalto; a pie era una pared en mitad de la calle, y
 * como aquí se declaraban tal como se pintaban, el paseo chocaba con ella de verdad.
 *
 * Se arregló el 23-sep-2026 en el ÚNICO sitio que lo decide: los cuatro muros van ahora en sus
 * ejes —lo largo en su `ancho`, el grueso en su `fondo`— y el giro los lleva a su lado. Como la
 * escena los pinta con estos números (`montarElEstadio` en `escenas/burgo/ciudad.ts`), lo que se
 * ve y lo que para cambiaron a la vez. Medido: el muro del este y el del oeste miden ahora 1 × 107
 * en planta, dentro de su distrito; el del norte y el del sur salen idénticos a los de antes, bit
 * a bit. `verify:burgo-mundo` comprueba en todas sus mesas que ningún muro del estadio pisa una
 * celda de calle ni se sale del distrito, y lo ve fallar con la cuenta vieja.
 */
import { ALTURA_DE_PLANTA_DEL_BURGO, ALTURA_DEL_BORDILLO, RETICULA_DEL_BURGO, RUMBOS, centroDeCelda, cuartosMirandoA, giroMirandoA, rumboALaDerecha, rumboContrario, vectorDelRumbo } from './burgo-traza';
import type { CascaraDelBurgo, DistritoPuesto, Punto, RecintoDeLaCiudad, Rumbo } from './burgo-traza';

/* ─── La caja de un distrito ─────────────────────────────────────────────── */

export interface CajaEnPlanta {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  readonly cx: number;
  readonly cz: number;
  readonly ancho: number;
  readonly fondo: number;
}

export function cajaDelDistrito(recinto: RecintoDeLaCiudad, d: DistritoPuesto): CajaEnPlanta {
  const a = centroDeCelda(recinto, d.i0, d.j0);
  const x0 = a.x - RETICULA_DEL_BURGO / 2;
  const z0 = a.z - RETICULA_DEL_BURGO / 2;
  const ancho = d.ancho * RETICULA_DEL_BURGO;
  const fondo = d.fondo * RETICULA_DEL_BURGO;
  return { x0, z0, x1: x0 + ancho, z1: z0 + fondo, cx: x0 + ancho / 2, cz: z0 + fondo / 2, ancho, fondo };
}

/** Hacia dónde queda el centro de la ciudad desde un distrito: a esa cara dan su entrada y su fachada. */
export function haciaElCentroDe(recinto: RecintoDeLaCiudad, caja: CajaEnPlanta): Rumbo {
  return Math.abs(caja.cx - recinto.centro.x) > Math.abs(caja.cz - recinto.centro.z) ? (caja.cx > recinto.centro.x ? 2 : 0) : caja.cz > recinto.centro.z ? 3 : 1;
}

/** Cuál es el eje largo de una caja: 0 si va en x, 1 si va en z. Lo usan la estación y el canal. */
export function ejeLargo(caja: CajaEnPlanta): 0 | 1 {
  return caja.ancho >= caja.fondo ? 0 : 1;
}

/* ─── Lo que se levanta ──────────────────────────────────────────────────── */

export type ClaseDeEstructura = 'nave' | 'gradas' | 'cantil' | 'pilar' | 'surtidor' | 'agua' | 'puente' | 'pedestal' | 'forjado';

/**
 * UN PRISMA DE GEOMETRÍA PROPIA: centrado en `(x, z)` sobre la cota `y`, girado `cuartos` cuartos
 * de vuelta, con `ancho` en su x y `fondo` en su z. Es la caja con la que la escena lo pinta
 * (`ponBulto`), y con cuartos enteros su huella en el suelo es una caja alineada con los ejes:
 * con un número impar de cuartos, el ancho y el fondo se cambian.
 */
export interface VolumenDeEstructura {
  readonly clase: ClaseDeEstructura;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly cuartos: number;
  readonly ancho: number;
  readonly alto: number;
  readonly fondo: number;
}

/** Una cáscara del pack puesta en un distrito: su origen, a qué rumbo mira su fachada y el giro que eso da. */
export interface CascaraPuesta {
  readonly cascara: CascaraDelBurgo;
  readonly x: number;
  readonly z: number;
  readonly mira: Rumbo;
  readonly giro: number;
}

function cascaraMirandoA(cascara: CascaraDelBurgo, x: number, z: number, mira: Rumbo): CascaraPuesta {
  return { cascara, x, z, mira, giro: giroMirandoA(mira) };
}

/* ─── El centro comercial, el polígono y el circuito ─────────────────────── */

/** La nave del centro comercial: casi todo el ancho, y el 45 % del fondo pegado a su lado de arriba. */
export function naveDelCentroComercial(caja: CajaEnPlanta): VolumenDeEstructura {
  const naveFondo = caja.fondo * 0.45;
  return { clase: 'nave', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.z0 + naveFondo / 2, cuartos: 0, ancho: caja.ancho - 6, alto: 12, fondo: naveFondo };
}

/**
 * Las dos naves del polígono, en fila: la segunda más alta. Una que no cabe en el distrito es
 * `null` y no un hueco en la lista, porque la escena cuelga de cada una cosas distintas según
 * sea la primera o la segunda.
 */
export function navesDelPoligono(caja: CajaEnPlanta): readonly (VolumenDeEstructura | null)[] {
  const naveAncho = caja.ancho - 4;
  const naveFondo = 24;
  const salida: (VolumenDeEstructura | null)[] = [];
  for (const k of [0, 1]) {
    const z = caja.z0 + 14 + k * (naveFondo + 2);
    if (z + naveFondo / 2 > caja.z1) {
      salida.push(null);
      continue;
    }
    salida.push({ clase: 'nave', x: caja.cx, y: ALTURA_DEL_BORDILLO, z, cuartos: 0, ancho: naveAncho, alto: 9 + k * 2, fondo: naveFondo });
  }
  return salida;
}

/** La grada del circuito, a lo largo de su recta de meta. */
export function gradasDelCircuito(caja: CajaEnPlanta): VolumenDeEstructura {
  return { clase: 'gradas', x: caja.cx, y: ALTURA_DEL_BORDILLO, z: caja.z1 - 8, cuartos: 0, ancho: caja.ancho - 12, alto: 3.6, fondo: 9 };
}

/* ─── El estadio ─────────────────────────────────────────────────────────── */

/** La grada del estadio: nueve de fondo y 3,6 de alto, en los cuatro lados. */
export const GRADA_DEL_ESTADIO = { fondo: 9, alto: 3.6 } as const;

/**
 * EL ESTADIO: la grada en anillo, las cuatro torres de luz sobre su pilar y el muro perimetral.
 *
 * Cada muro se escribe EN SUS EJES y el giro lo lleva a su lado: lo largo en `ancho`, el grueso
 * en `fondo`. Es la misma regla que la grada de dos líneas más arriba. Los del este y del oeste
 * llevaban las dos medidas ya cambiadas y además el giro, y se pintaban cruzando la calle: ver la
 * cabecera.
 */
export function estructuraDelEstadio(caja: CajaEnPlanta): { readonly gradas: readonly VolumenDeEstructura[]; readonly pilares: readonly VolumenDeEstructura[]; readonly muros: readonly VolumenDeEstructura[] } {
  const GRADA = GRADA_DEL_ESTADIO;
  const gradas: VolumenDeEstructura[] = [];
  for (const r of RUMBOS) {
    const v = vectorDelRumbo(r);
    const largo = (r % 2 === 0 ? caja.fondo : caja.ancho) - 8;
    gradas.push({
      clase: 'gradas',
      x: caja.cx + v.x * (caja.ancho / 2 - GRADA.fondo / 2 - 3),
      y: ALTURA_DEL_BORDILLO,
      z: caja.cz + v.z * (caja.fondo / 2 - GRADA.fondo / 2 - 3),
      cuartos: cuartosMirandoA(rumboContrario(r)),
      ancho: largo,
      alto: GRADA.alto,
      fondo: GRADA.fondo,
    });
  }
  const pilares: VolumenDeEstructura[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = caja.cx + sx * (caja.ancho / 2 - 4);
      const z = caja.cz + sz * (caja.fondo / 2 - 4);
      pilares.push({ clase: 'pilar', x, y: ALTURA_DEL_BORDILLO, z, cuartos: 0, ancho: 1.6, alto: 9, fondo: 1.6 });
    }
  }
  const muros: VolumenDeEstructura[] = [];
  for (const r of RUMBOS) {
    const v = vectorDelRumbo(r);
    const largo = (r % 2 === 0 ? caja.fondo : caja.ancho) - 1;
    muros.push({
      clase: 'cantil',
      x: caja.cx + v.x * (caja.ancho / 2 - 0.5),
      y: ALTURA_DEL_BORDILLO,
      z: caja.cz + v.z * (caja.fondo / 2 - 0.5),
      cuartos: cuartosMirandoA(r),
      /* En los ejes del muro, para los cuatro: el giro de `cuartosMirandoA` ya lo pone a lo largo de su lado. */
      ancho: largo,
      alto: 2.2,
      fondo: 1,
    });
  }
  return { gradas, pilares, muros };
}

/* ─── La estación y el canal ─────────────────────────────────────────────── */

/** Un punto de una caja larga: `a` a lo largo de su eje largo y `b` a lo ancho, desde su centro. */
function enLaCajaLarga(caja: CajaEnPlanta): (a: number, b: number) => Punto {
  const largo = ejeLargo(caja);
  return (a, b) => (largo === 0 ? { x: caja.cx + a, z: caja.cz + b } : { x: caja.cx + b, z: caja.cz + a });
}

/** LA ESTACIÓN: los seis pilares de la marquesina, sobre el andén de la ciudad, y el edificio de viajeros. */
export function estructuraDeLaEstacion(caja: CajaEnPlanta): { readonly pilares: readonly VolumenDeEstructura[]; readonly viajeros: CascaraPuesta } {
  const largo = ejeLargo(caja);
  const aLoLargo = largo === 0 ? caja.ancho : caja.fondo;
  const aLoAncho = largo === 0 ? caja.fondo : caja.ancho;
  const en = enLaCajaLarga(caja);
  const pilares: VolumenDeEstructura[] = [];
  for (let k = 0; k < 6; k++) {
    const p = en((k - 2.5) * (aLoLargo / 8), aLoAncho / 2 - 18);
    pilares.push({ clase: 'pilar', x: p.x, y: ALTURA_DEL_BORDILLO + 0.6, z: p.z, cuartos: 0, ancho: 0.8, alto: 5.4, fondo: 0.8 });
  }
  const viajeros = en(-aLoLargo / 2 + 12, aLoAncho / 2 - 6);
  return { pilares, viajeros: cascaraMirandoA('bloque-e', viajeros.x, viajeros.z, largo === 0 ? 1 : 0) };
}

/**
 * EL CANAL: el agua (18 de ancho), sus dos cantiles (3 cada uno, a 10,5 del eje) y los tres
 * puentes de 8 que lo cruzan. Lo que para al que anda es la banda de agua y cantiles entera
 * MENOS los puentes: eso lo corta `burgo-mundo.ts`, con estos mismos números.
 */
export function estructuraDelCanal(caja: CajaEnPlanta): { readonly agua: VolumenDeEstructura; readonly cantiles: readonly VolumenDeEstructura[]; readonly puentes: readonly VolumenDeEstructura[] } {
  const largo = ejeLargo(caja);
  const aLoLargo = largo === 0 ? caja.ancho : caja.fondo;
  const en = enLaCajaLarga(caja);
  const agua: VolumenDeEstructura = { clase: 'agua', x: caja.cx, y: ALTURA_DEL_BORDILLO - 0.9, z: caja.cz, cuartos: 0, ancho: largo === 0 ? aLoLargo : 18, alto: 0, fondo: largo === 0 ? 18 : aLoLargo };
  const cantiles: VolumenDeEstructura[] = [];
  for (const lado of [-1, 1]) {
    const c = en(0, lado * 10.5);
    cantiles.push({ clase: 'cantil', x: c.x, y: ALTURA_DEL_BORDILLO - 0.9, z: c.z, cuartos: 0, ancho: largo === 0 ? aLoLargo : 3, alto: 1.5, fondo: largo === 0 ? 3 : aLoLargo });
  }
  const puentes: VolumenDeEstructura[] = [];
  for (let k = 0; k < 3; k++) {
    const p = en(-aLoLargo / 2 + (aLoLargo * (k + 1)) / 4, 0);
    puentes.push({ clase: 'puente', x: p.x, y: ALTURA_DEL_BORDILLO, z: p.z, cuartos: largo === 0 ? 1 : 0, ancho: 24, alto: 1.2, fondo: 8 });
  }
  return { agua, cantiles, puentes };
}

/* ─── El hospital, el colegio, la gasolinera y la obra ───────────────────── */

/** EL HOSPITAL: un `bloque-g` al fondo y dos alas hacia la entrada, en U. `fondo` es el del cuerpo del fondo. */
export function estructuraDelHospital(caja: CajaEnPlanta, haciaElCentro: Rumbo): { readonly cascaras: readonly CascaraPuesta[]; readonly fondo: Punto } {
  const v = vectorDelRumbo(haciaElCentro);
  const lado = vectorDelRumbo(rumboALaDerecha(haciaElCentro));
  const fondo = { x: caja.cx - v.x * (caja.ancho / 2 - 8), z: caja.cz - v.z * (caja.fondo / 2 - 8) };
  const cascaras: CascaraPuesta[] = [cascaraMirandoA('bloque-g', fondo.x, fondo.z, haciaElCentro)];
  for (const s of [-1, 1]) {
    cascaras.push(cascaraMirandoA('bloque-g', fondo.x + lado.x * s * 12 + v.x * 12, fondo.z + lado.z * s * 12 + v.z * 12, rumboALaDerecha(haciaElCentro)));
  }
  return { cascaras, fondo };
}

/** EL COLEGIO: cinco `bloque-a` en L, en las dos caras que dan la espalda a la calle. */
export function estructuraDelColegio(caja: CajaEnPlanta, haciaElCentro: Rumbo): readonly CascaraPuesta[] {
  const v = vectorDelRumbo(haciaElCentro);
  const lado = vectorDelRumbo(rumboALaDerecha(haciaElCentro));
  const salida: CascaraPuesta[] = [];
  for (let k = 0; k < 3; k++) {
    salida.push(cascaraMirandoA('bloque-a', caja.cx - v.x * (caja.ancho / 2 - 6) + lado.x * (k - 1) * 12, caja.cz - v.z * (caja.fondo / 2 - 6) + lado.z * (k - 1) * 12, haciaElCentro));
  }
  for (let k = 0; k < 2; k++) {
    salida.push(
      cascaraMirandoA(
        'bloque-a',
        caja.cx - v.x * (caja.ancho / 2 - 6 - (k + 1) * 12) - lado.x * (caja.ancho / 2 - 6),
        caja.cz - v.z * (caja.fondo / 2 - 6 - (k + 1) * 12) - lado.z * (caja.fondo / 2 - 6),
        rumboALaDerecha(haciaElCentro),
      ),
    );
  }
  return salida;
}

/** LA GASOLINERA: los cuatro pilares de la marquesina, los cuatro surtidores y la tienda. `isla` es el centro de la marquesina. */
export function estructuraDeLaGasolinera(
  caja: CajaEnPlanta,
  haciaElCentro: Rumbo,
): { readonly isla: Punto; readonly pilares: readonly VolumenDeEstructura[]; readonly surtidores: readonly VolumenDeEstructura[]; readonly tienda: CascaraPuesta } {
  const v = vectorDelRumbo(haciaElCentro);
  const lado = vectorDelRumbo(rumboALaDerecha(haciaElCentro));
  const isla = { x: caja.cx + v.x * 4, z: caja.cz + v.z * 4 };
  const pilares: VolumenDeEstructura[] = [];
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      const p = { x: isla.x + lado.x * s * 8 + v.x * t * 5, z: isla.z + lado.z * s * 8 + v.z * t * 5 };
      pilares.push({ clase: 'pilar', x: p.x, y: ALTURA_DEL_BORDILLO, z: p.z, cuartos: 0, ancho: 0.8, alto: 5.4, fondo: 0.8 });
    }
  }
  const surtidores: VolumenDeEstructura[] = [];
  for (let k = 0; k < 4; k++) {
    const a = (k - 1.5) * 4;
    surtidores.push({ clase: 'surtidor', x: isla.x + lado.x * a, y: ALTURA_DEL_BORDILLO, z: isla.z + lado.z * a, cuartos: cuartosMirandoA(haciaElCentro), ancho: 1.2, alto: 2.4, fondo: 0.8 });
  }
  const tienda = cascaraMirandoA('bloque-a', caja.cx - v.x * (caja.ancho / 2 - 6), caja.cz - v.z * (caja.fondo / 2 - 6), haciaElCentro);
  return { isla, pilares, surtidores, tienda };
}

/** Las plantas de la obra: cuatro forjados, uno sobre otro. */
export const PLANTAS_DE_LA_OBRA = 4;

/**
 * LA OBRA: por planta, su forjado y sus seis pilares. Sólo los de la planta baja pisan el suelo;
 * los demás están en el aire, encima del forjado de la planta de abajo.
 */
export function estructuraDeLaObra(caja: CajaEnPlanta): readonly { readonly forjado: VolumenDeEstructura; readonly pilares: readonly VolumenDeEstructura[] }[] {
  const salida: { forjado: VolumenDeEstructura; pilares: VolumenDeEstructura[] }[] = [];
  for (let p = 0; p < PLANTAS_DE_LA_OBRA; p++) {
    const forjado: VolumenDeEstructura = { clase: 'forjado', x: caja.cx, y: ALTURA_DEL_BORDILLO + p * ALTURA_DE_PLANTA_DEL_BURGO, z: caja.cz, cuartos: 0, ancho: caja.ancho - 12, alto: 0.5, fondo: caja.fondo - 12 };
    const pilares: VolumenDeEstructura[] = [];
    for (const sx of [-1, 0, 1]) {
      for (const sz of [-1, 1]) {
        pilares.push({
          clase: 'pilar',
          x: caja.cx + sx * ((caja.ancho - 14) / 2),
          y: ALTURA_DEL_BORDILLO + p * ALTURA_DE_PLANTA_DEL_BURGO,
          z: caja.cz + sz * ((caja.fondo - 14) / 2),
          cuartos: 0,
          ancho: 0.9,
          alto: ALTURA_DE_PLANTA_DEL_BURGO,
          fondo: 0.9,
        });
      }
    }
    salida.push({ forjado, pilares });
  }
  return salida;
}

/* ─── La glorieta ────────────────────────────────────────────────────────── */

/** El pedestal del centro de la isleta, con la figura encima: seis por seis y tres de alto. */
export function pedestalDeLaGlorieta(recinto: RecintoDeLaCiudad): VolumenDeEstructura {
  return { clase: 'pedestal', x: recinto.centro.x, y: ALTURA_DEL_BORDILLO, z: recinto.centro.z, cuartos: 0, ancho: 6, alto: 3, fondo: 6 };
}
