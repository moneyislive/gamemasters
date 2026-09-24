/**
 * EL RENGLÓN DE LOS PERSONAJES: cuántos triángulos y cuántas llamadas pueden costar los cuerpos, los
 * 48 durmientes y lo que llevan encima en cada nivel, y la regla que reparte el detalle cuerpo a cuerpo.
 * Puro: sin three, para que el comprobador lo sume en Node con el manifiesto de verdad.
 *
 * ═══ LA CUOTA: UN CUARTO DE CADA TOPE ═══
 *
 * Los topes del juego entero son los del §8 (N0 150.000 triángulos y 60 llamadas, N1 250.000 / 90,
 * N2 600.000 / 150, N3 1.500.000 / 250) y viven en `calidad/niveles.ts`, que es de otro frente: se
 * leen de allí y no se copian, para que el día que el banco en aparato los cambie, este renglón se
 * vuelva a juzgar solo. A los personajes les toca un cuarto (`CUOTA_DE_LOS_PERSONAJES`): la ciudad se
 * queda el 60 % y el resto es de los efectos, el posproceso y el HUD.
 *
 * ═══ UN CUERPO, UNA LLAMADA ═══
 *
 * Cada figura de la forja trae un material por zona, y three pinta cada material en una llamada: el
 * desvelado del prototipo son 10 llamadas y el Celador 12, y veinte cuerpos pasarían de todo N0 ellos
 * solos. `malla.ts` funde las zonas de cada LOD en UNA geometría con un atributo de zona y un solo
 * material con una paleta por zona: cualquier cuerpo, a cualquier nivel de detalle y con lo que lleve
 * enganchado (la pistola, el sombrero, el paraguas), es UNA llamada. Y el contorno va dentro del mismo
 * sombreador (`material.ts`): no hay casco aparte que doble las llamadas en N0.
 *
 * ═══ EL PEOR CASO, Y QUIÉN LO HACE CUMPLIR ═══
 *
 * El renglón es el peor caso de la noche: los 20 cuerpos a la vez (6 desvelados y los 14 NPC vivos
 * como mucho de `quiebro-reglas.ts`), los más posibles cerca de la cámara, los 48 durmientes a la vista
 * y con paraguas, y cada NPC con su pistola y su sombrero. No es una media: es lo que rompe un N0. Y no
 * es una promesa: `repartirElDetalle` es la ÚNICA función que decide qué cuerpo lleva esqueleto y con
 * qué LOD, el componente la llama en cada fotograma, y lo que decide no puede pasar de lo que aquí se
 * suma (el comprobador la ejecuta con miles de repartos al azar y lo mira).
 *
 * ═══ LOS DURMIENTES NO BAJAN DE NÚMERO, BAJAN DE DETALLE ═══
 *
 * «Los 48 durmientes de guion son idénticos en todos los niveles» (§8): de ellos salen los Prestados.
 * Lo que cambia es con cuántos triángulos se pintan (el maniquí de 400 en N0) y cuántos de los más
 * cercanos llevan esqueleto en vez de textura de huesos (N2 y N3). El §8 pide 1.500 triángulos en N1;
 * 48 × 1.500 son 72.000, más que el cuarto entero de N1 (62.500). Aquí N1 pinta el maniquí de N0 y
 * gasta la diferencia en los cuerpos que pelean, que son los que se miran. Está en el informe.
 */
import { TABLA_DE_NIVELES } from '../calidad/niveles';
import type { NivelDeCalidad } from '../calidad/niveles';
import { DURMIENTES } from '../../../../shared/arcade/juegos/quiebro-durmientes';
import { VIVAS_POR_PRESENTES } from '../../../../shared/arcade/juegos/quiebro-reglas';
import { triangulosDeLaFigura, variantesDeLaFigura, varianteMasLigera } from './reparto';
import type { Reparto } from './reparto';

export type Nivel = NivelDeCalidad;
export const NIVELES: readonly Nivel[] = [0, 1, 2, 3];

/** La parte de cada tope que es de los personajes. */
export const CUOTA_DE_LOS_PERSONAJES = 0.25;

/** Los asientos de una mesa (§3). */
export const ASIENTOS_COMO_MUCHO = 6;
/** Cuerpos a la vez como mucho: los seis desvelados y los NPC vivos de la sala más llena. */
export const CUERPOS_COMO_MUCHO = ASIENTOS_COMO_MUCHO + Math.max(...VIVAS_POR_PRESENTES);

/**
 * Los triángulos de cada pieza que se engancha a un hueso. Las hace `piezas.ts` con geometría de
 * código (el reparto todavía no trae ninguna); el comprobador construye las de verdad y exige que den
 * estas cifras exactas.
 */
export const TRIANGULOS_DE_PIEZA: Readonly<Record<'paraguas' | 'pistola' | 'sombrero', number>> = {
  paraguas: 64,
  pistola: 44,
  sombrero: 56,
};

/** Cómo reparte el detalle un nivel. Ver `repartirElDetalle`. */
export interface PoliticaDePersonajes {
  /** Cuerpos con esqueleto como mucho, el propio incluido (del §8, en `calidad/niveles.ts`). */
  readonly esqueletos: number;
  /** Sólo llevan esqueleto los que están a menos de esto (N0: «los cercanos»); `null`, sin límite. */
  readonly soloCercanosM: number | null;
  /** A cuántos hercios se anima un cuerpo con esqueleto lejano (0: en cada fotograma). */
  readonly hzLejanos: number;
  /** Desde qué distancia un cuerpo con esqueleto es «lejano» para `hzLejanos`. */
  readonly lejanoDesdeM: number;
  /** Tope de triángulos del LOD del propio. */
  readonly trisPropio: number;
  /** Los `cuantosCerca` más cercanos a menos de `cercaM` van con `trisCerca`; el resto con `trisLejos`. */
  readonly cercaM: number;
  readonly cuantosCerca: number;
  readonly trisCerca: number;
  readonly trisLejos: number;
  /** Tope del LOD de los cuerpos sin esqueleto (texturas de huesos) y de la multitud. */
  readonly trisRebano: number;
  readonly trisMultitud: number;
  /** Durmientes con esqueleto: los más cercanos (del §8). */
  readonly durmientesConEsqueleto: number;
  /** Muelles en el faldón de la gabardina, y hasta qué distancia. */
  readonly muelles: boolean;
  readonly muellesHastaM: number;
}

/**
 * LA POLÍTICA DE CADA NIVEL. Lo que viene del §8 se lee de `TABLA_DE_NIVELES`; lo demás es de este
 * frente, provisional como los topes. Los topes de triángulos no son LODs: son lo MÁS que se acepta, y
 * `lodParaTope` escoge el LOD más rico del manifiesto que quepa.
 */
export const POLITICA: Readonly<Record<Nivel, PoliticaDePersonajes>> = {
  0: {
    esqueletos: TABLA_DE_NIVELES[0].esqueletos.tope,
    soloCercanosM: TABLA_DE_NIVELES[0].esqueletos.soloCercanos ? 12 : null,
    hzLejanos: TABLA_DE_NIVELES[0].esqueletos.hzLejanos,
    lejanoDesdeM: 7,
    trisPropio: 5000,
    cercaM: 6,
    cuantosCerca: 1,
    trisCerca: 1500,
    trisLejos: 400,
    trisRebano: 400,
    trisMultitud: TABLA_DE_NIVELES[0].durmientes.triangulosDelVat,
    durmientesConEsqueleto: TABLA_DE_NIVELES[0].durmientes.conEsqueleto,
    muelles: false,
    muellesHastaM: 0,
  },
  1: {
    esqueletos: TABLA_DE_NIVELES[1].esqueletos.tope,
    soloCercanosM: TABLA_DE_NIVELES[1].esqueletos.soloCercanos ? 12 : null,
    hzLejanos: TABLA_DE_NIVELES[1].esqueletos.hzLejanos,
    lejanoDesdeM: 20,
    trisPropio: 5000,
    cercaM: 8,
    cuantosCerca: 3,
    trisCerca: 5000,
    trisLejos: 1500,
    trisRebano: 400,
    /* El §8 dice 1.500: ver «Los durmientes no bajan de número» en la cabecera. */
    trisMultitud: 400,
    durmientesConEsqueleto: TABLA_DE_NIVELES[1].durmientes.conEsqueleto,
    muelles: false,
    muellesHastaM: 0,
  },
  2: {
    esqueletos: TABLA_DE_NIVELES[2].esqueletos.tope,
    soloCercanosM: TABLA_DE_NIVELES[2].esqueletos.soloCercanos ? 12 : null,
    hzLejanos: TABLA_DE_NIVELES[2].esqueletos.hzLejanos,
    lejanoDesdeM: 30,
    trisPropio: 20000,
    cercaM: 10,
    cuantosCerca: 4,
    trisCerca: 5000,
    trisLejos: 1500,
    trisRebano: 1500,
    trisMultitud: TABLA_DE_NIVELES[2].durmientes.triangulosDelVat,
    durmientesConEsqueleto: TABLA_DE_NIVELES[2].durmientes.conEsqueleto,
    muelles: true,
    muellesHastaM: 15,
  },
  3: {
    esqueletos: TABLA_DE_NIVELES[3].esqueletos.tope,
    soloCercanosM: TABLA_DE_NIVELES[3].esqueletos.soloCercanos ? 12 : null,
    hzLejanos: TABLA_DE_NIVELES[3].esqueletos.hzLejanos,
    lejanoDesdeM: 40,
    trisPropio: 20000,
    cercaM: 12,
    cuantosCerca: 5,
    trisCerca: 20000,
    trisLejos: 5000,
    trisRebano: 1500,
    trisMultitud: TABLA_DE_NIVELES[3].durmientes.triangulosDelVat,
    durmientesConEsqueleto: TABLA_DE_NIVELES[3].durmientes.conEsqueleto,
    muelles: true,
    muellesHastaM: 25,
  },
};

/**
 * LO QUE GASTA EL RESTO DEL JUEGO, MEDIDO EN EL JUEGO REAL (24-sep-2026), para juzgar la cuota contra
 * el tope del juego ENTERO y no contra un reparto de papel.
 *
 * Cómo se tomó: `/sala/quiebro.html?prueba=1` en un Chrome de esta máquina, noches enteras jugadas en
 * solitario y a dos pestañas, con enemigos en pantalla (de 2 a 4 a menos de 30 m: la oleada 1, la 3
 * con su tirador y la Llamada, con el barrio abierto), cada nivel forzado con `forzarElNivel` y de 25 a
 * 40 muestras por nivel de `__quiebro.medir()`: la escena como la cuenta el posproceso
 * (`calidad/medida.ts`, sin los pases, que no cuentan para los topes) menos lo que su director dice que
 * pintaron los personajes. Es el PEOR fotograma medido, redondeado hacia arriba: la ciudad, la lluvia,
 * los efectos (instanciados: sus llamadas no crecen con los cuerpos) y el cielo. Lo que el frente de
 * dirección de arte añada después se vuelve a medir con la misma orden.
 *
 * Lo que dice: el peor caso de los personajes (15, 19, 31 y 39 llamadas) más esto cabe de sobra en los
 * topes (60, 90, 150 y 250), así que la cuota de un cuarto no hace falta subirla. Con los seis estilos
 * de la forja, cada uno en su rebaño, sí se pasaba de su cuarto en N0 y N1 (19 de 15, 23 de 22); la
 * salida fue juntar los rebaños de los desvelados (ver «Los desvelados lejanos» en `director.ts`), no
 * subir la cuota. `verify:quiebro-personajes` suma las dos cosas contra el tope de cada nivel.
 */
export const RESTO_DEL_JUEGO_MEDIDO: Readonly<Record<Nivel, { readonly triangulos: number; readonly llamadas: number }>> = {
  0: { triangulos: 38_000, llamadas: 25 },
  1: { triangulos: 91_000, llamadas: 23 },
  2: { triangulos: 176_000, llamadas: 23 },
  3: { triangulos: 125_000, llamadas: 18 },
};

/** La cuota de los personajes en un nivel. */
export function cuotaDelNivel(nivel: Nivel): { triangulos: number; llamadas: number } {
  const t = TABLA_DE_NIVELES[nivel].topes;
  return { triangulos: Math.floor(t.triangulos * CUOTA_DE_LOS_PERSONAJES), llamadas: Math.floor(t.llamadas * CUOTA_DE_LOS_PERSONAJES) };
}

/* ─────────────────────────────── Los LODs del manifiesto ─────────────────────────────── */

/**
 * EL LOD MÁS RICO QUE CABE en `tope` triángulos, por índice en `lods` (0 es el de más detalle), contando
 * los de la variante que se pinta (`mallas`) y no los del fichero entero, que trae varias; con `mallas`
 * nulas, la variante más cara. Si ninguno cabe, el más ligero: un cuerpo sin pintar es peor que un
 * cuerpo caro, y el renglón lo pinta rojo para que se sepa.
 */
export function lodParaTope(reparto: Reparto, figura: string, tope: number, mallas: readonly string[] | null = null): number {
  const f = reparto.figuras[figura];
  if (f === undefined) throw new Error(`No hay figura «${figura}»`);
  let mejor = -1;
  let mejorTris = -1;
  let ligero = 0;
  let ligeroTris = Number.POSITIVE_INFINITY;
  f.lods.forEach((_l, i) => {
    const t = triangulosDeLaFigura(reparto, figura, i, mallas);
    if (t <= tope && t > mejorTris) {
      mejor = i;
      mejorTris = t;
    }
    if (t < ligeroTris) {
      ligero = i;
      ligeroTris = t;
    }
  });
  return mejor >= 0 ? mejor : ligero;
}

/**
 * Por debajo de esto no se simplifica: una persona de menos de 250 triángulos deja de leerse como
 * persona (brazos de un solo triángulo), y se pinta el LOD más ligero tal cual.
 */
export const MINIMO_DEL_MANIQUI = 250;

/** El LOD que toca: su índice y, si ni el más ligero cabe, a cuántos triángulos se simplifica. */
export interface LodElegido {
  readonly indice: number;
  readonly simplificado: number | null;
}

/**
 * EL LOD QUE TOCA con un tope: el más rico que cabe; y si ni el más ligero cabe, ése SIMPLIFICADO al
 * tope al cargar (`simplificarMalla` en `malla.ts`: el maniquí de 400 del §8, que el reparto no trae).
 */
export function lodElegido(reparto: Reparto, figura: string, tope: number, mallas: readonly string[] | null = null): LodElegido {
  const indice = lodParaTope(reparto, figura, tope, mallas);
  const t = triangulosDeLaFigura(reparto, figura, indice, mallas);
  return { indice, simplificado: t > tope && tope >= MINIMO_DEL_MANIQUI ? tope : null };
}

/** Los triángulos de un LOD elegido (con la simplificación, si la lleva). */
export function triangulosDelLod(reparto: Reparto, figura: string, l: LodElegido, mallas: readonly string[] | null = null): number {
  const t = triangulosDeLaFigura(reparto, figura, l.indice, mallas);
  return l.simplificado !== null ? Math.min(t, l.simplificado) : t;
}

/** Los triángulos del LOD que tocaría con `tope` (de esa variante, o de la más cara). */
export function triangulosConTope(reparto: Reparto, figura: string, tope: number, mallas: readonly string[] | null = null): number {
  return triangulosDelLod(reparto, figura, lodElegido(reparto, figura, tope, mallas), mallas);
}

/** Los triángulos de una pieza: los de la forja si el reparto la trae, los de código si no. */
export function triangulosDePieza(reparto: Reparto, nombre: string): number {
  const ligera = nombre.endsWith('-ligero') ? nombre.slice(0, -'-ligero'.length) : null;
  const deLaForja = ligera === null ? reparto.piezas[nombre] : undefined;
  if (deLaForja !== undefined) return deLaForja.triangulos;
  const base = (ligera ?? nombre) as keyof typeof TRIANGULOS_DE_PIEZA;
  return TRIANGULOS_DE_PIEZA[base] ?? 0;
}

/**
 * Las figuras que puede pintar cada papel. `rebanoDelDesvelado` son las del PRIMER estilo de cada cuerpo:
 * el desvelado lejano va en su maniquí, sea cual sea su estilo (ver «Los desvelados lejanos» en
 * `director.ts`), y así los rebaños de desvelados son dos llamadas y no una por estilo.
 */
function figurasDeCuerpo(reparto: Reparto): { desvelado: string[]; rebanoDelDesvelado: string[]; celador: string[]; npc: string[]; durmiente: string[] } {
  const desvelado = new Set<string>();
  for (const v of reparto.clases.desvelado.variantes) {
    desvelado.add(v.hombre.figura);
    desvelado.add(v.mujer.figura);
  }
  const primero = reparto.clases.desvelado.variantes[0];
  const rebanoDelDesvelado = primero === undefined ? [] : [...new Set([primero.hombre.figura, primero.mujer.figura])];
  const durmiente = new Set<string>();
  for (const c of reparto.durmientes.cuerpos) durmiente.add(c.figura);
  const celador = new Set<string>();
  for (const v of reparto.clases.celador.variantes) celador.add(v.figura);
  const npc = new Set<string>([...durmiente, ...celador]);
  return { desvelado: [...desvelado], rebanoDelDesvelado, celador: [...celador], npc: [...npc], durmiente: [...durmiente] };
}

/** El peor de unas figuras con un tope, en su variante más cara. */
function maximo(reparto: Reparto, figuras: readonly string[], tope: number): number {
  let m = 0;
  for (const f of figuras) m = Math.max(m, triangulosConTope(reparto, f, tope));
  return m;
}

/** El peor de unas figuras pintadas con su maniquí (la variante más ligera: ver `director.ts`). */
function maximoDelManiqui(reparto: Reparto, figuras: readonly string[], tope: number): number {
  let m = 0;
  for (const f of figuras) {
    const lod = lodParaTope(reparto, f, tope, varianteMasLigera(reparto, f, 0));
    const maniqui = varianteMasLigera(reparto, f, lod);
    m = Math.max(m, triangulosDelLod(reparto, f, lodElegido(reparto, f, tope, maniqui), maniqui));
  }
  return m;
}

/* ─────────────────────────────── El renglón ─────────────────────────────── */

export interface PartidaDelRenglon {
  readonly que: string;
  readonly triangulos: number;
  readonly llamadas: number;
}

export interface RenglonDeLosPersonajes {
  readonly nivel: Nivel;
  readonly triangulos: number;
  readonly llamadas: number;
  readonly cuota: { readonly triangulos: number; readonly llamadas: number };
  readonly desglose: readonly PartidaDelRenglon[];
}

/**
 * EL PEOR CASO DE UN NIVEL, partida a partida. Ver la cabecera: todo a la vez, cada papel con su
 * figura y su variante más caras, y las llamadas de los rebaños de textura de huesos (uno por figura
 * que pueda pintarse lejos, y uno por cuerpo de durmiente para la multitud, con el paraguas dentro).
 */
export function renglonDeLosPersonajes(reparto: Reparto, nivel: Nivel): RenglonDeLosPersonajes {
  const p = POLITICA[nivel];
  const figuras = figurasDeCuerpo(reparto);
  const todas = [...new Set([...figuras.desvelado, ...figuras.npc])];
  const otros = CUERPOS_COMO_MUCHO - 1;
  const conEsqueleto = Math.min(otros, p.esqueletos - 1);
  const cerca = Math.min(conEsqueleto, p.cuantosCerca);
  const lejos = conEsqueleto - cerca;
  const sinEsqueleto = otros - conEsqueleto;
  const npcs = CUERPOS_COMO_MUCHO - ASIENTOS_COMO_MUCHO;
  const paraguasDeLaForja = triangulosDePieza(reparto, reparto.durmientes.paraguas ?? 'paraguas');
  const paraguasLigero = triangulosDePieza(reparto, 'paraguas-ligero');
  /* El sombrero de código sólo lo lleva el Celador mayor del prototipo (la forja ya lo trae en su malla). */
  const conSombreroDeCodigo = reparto.clases.celador.variantes.some((v) => v.silueta === 'mayor' && variantesDeLaFigura(reparto, v.figura).length <= 1);
  const d: PartidaDelRenglon[] = [];
  d.push({ que: 'el propio', triangulos: maximo(reparto, figuras.desvelado, p.trisPropio), llamadas: 1 });
  d.push({ que: `${String(cerca)} cercanos con esqueleto`, triangulos: cerca * maximo(reparto, todas, p.trisCerca), llamadas: cerca });
  d.push({ que: `${String(lejos)} lejanos con esqueleto`, triangulos: lejos * maximo(reparto, todas, p.trisLejos), llamadas: lejos });
  /* Sin esqueleto: los Prestados van en el rebaño de la multitud; los desvelados, en el de su cuerpo; los Celadores, uno por figura. */
  const rebanosDeCuerpos = [...new Set([...figuras.rebanoDelDesvelado, ...figuras.celador])];
  d.push({
    que: `${String(sinEsqueleto)} sin esqueleto (texturas de huesos)`,
    triangulos: sinEsqueleto * Math.max(maximoDelManiqui(reparto, rebanosDeCuerpos, p.trisRebano), maximoDelManiqui(reparto, figuras.durmiente, p.trisMultitud) + paraguasLigero),
    llamadas: sinEsqueleto > 0 ? Math.min(sinEsqueleto, rebanosDeCuerpos.length) : 0,
  });
  const durmientesConEsqueleto = Math.min(DURMIENTES, p.durmientesConEsqueleto);
  d.push({
    que: `${String(durmientesConEsqueleto)} durmientes con esqueleto (con el paraguas de la forja)`,
    triangulos: durmientesConEsqueleto * (maximo(reparto, figuras.durmiente, p.trisLejos) + paraguasDeLaForja),
    llamadas: durmientesConEsqueleto,
  });
  d.push({
    que: `${String(DURMIENTES - durmientesConEsqueleto)} durmientes en la multitud (maniquí y paraguas en la malla)`,
    triangulos: (DURMIENTES - durmientesConEsqueleto) * (maximoDelManiqui(reparto, figuras.durmiente, p.trisMultitud) + paraguasLigero),
    llamadas: figuras.durmiente.length,
  });
  d.push({
    que: 'pistolas (y sombreros de código) de los NPC',
    triangulos: npcs * (triangulosDePieza(reparto, reparto.clases.tirador.pieza ?? 'pistola') + (conSombreroDeCodigo ? TRIANGULOS_DE_PIEZA.sombrero : 0)),
    llamadas: 0,
  });
  /* Las manchas de contacto (`sombras.ts`): una llamada para todas, dos triángulos cada una. */
  d.push({ que: 'sombras de contacto', triangulos: (CUERPOS_COMO_MUCHO + DURMIENTES) * 2, llamadas: 1 });
  let triangulos = 0;
  let llamadas = 0;
  for (const x of d) {
    triangulos += x.triangulos;
    llamadas += x.llamadas;
  }
  return { nivel, triangulos, llamadas, cuota: cuotaDelNivel(nivel), desglose: d };
}

/* ─────────────────────────────── El reparto del detalle ─────────────────────────────── */

/** Lo que se sabe de un cuerpo para repartir el detalle. */
export interface CuerpoAMedir {
  readonly id: number;
  /** Distancia a la cámara, en metros. */
  readonly distancia: number;
}

/** Cómo se pinta un cuerpo en este fotograma. */
export interface DetalleDelCuerpo {
  readonly modo: 'esqueleto' | 'rebano';
  /** El tope de triángulos de su LOD (se traduce a LOD por figura con `lodParaTope`). */
  readonly tope: number;
  /** A cuántos hercios se anima (0: cada fotograma). */
  readonly hz: number;
  /** Lleva muelles en el faldón. */
  readonly muelles: boolean;
}

/** Margen para no ir y volver de LOD en cada fotograma cuando alguien anda por la raya. */
export const HISTERESIS_M = 1.5;

/*
 * Sin asignar por fotograma: el orden se hace en una lista del módulo, y los detalles son unos pocos
 * objetos congelados (modo, tope, hercios, muelles) que se reutilizan. La primera versión creaba una
 * copia de la lista, un cierre y un objeto por cuerpo en cada fotograma.
 */
const ORDEN: CuerpoAMedir[] = [];
const porDistancia = (a: CuerpoAMedir, b: CuerpoAMedir): number => a.distancia - b.distancia || a.id - b.id;
const DETALLES: DetalleDelCuerpo[] = [];
const conMuelles = (p: PoliticaDePersonajes, d: number): boolean => p.muelles && d <= p.muellesHastaM;

/** El detalle con esos valores (el mismo objeto cada vez). */
export function detalleDe(modo: DetalleDelCuerpo['modo'], tope: number, hz: number, muelles: boolean): DetalleDelCuerpo {
  for (const d of DETALLES) if (d.modo === modo && d.tope === tope && d.hz === hz && d.muelles === muelles) return d;
  const nuevo: DetalleDelCuerpo = Object.freeze({ modo, tope, hz, muelles });
  DETALLES.push(nuevo);
  return nuevo;
}

/**
 * REPARTE EL DETALLE de este fotograma: el propio siempre con esqueleto y su tope; los demás, por
 * distancia, hasta agotar los esqueletos del nivel (y sólo los cercanos en N0); los `cuantosCerca` más
 * cercanos bajo `cercaM` con el LOD de cerca; el resto, a la textura de huesos. `anterior` es el reparto
 * del fotograma de antes (por id), para la histéresis. Escribe en `salida` (por id) y la devuelve.
 */
export function repartirElDetalle(
  cuerpos: readonly CuerpoAMedir[],
  yo: number | null,
  nivel: Nivel,
  anterior: ReadonlyMap<number, DetalleDelCuerpo>,
  salida: Map<number, DetalleDelCuerpo>,
): Map<number, DetalleDelCuerpo> {
  const p = POLITICA[nivel];
  /*
   * Se sobrescribe por id sin vaciar (vaciar un `Map` le rehace la tabla, y llenarlo la hace crecer: unos
   * 2 KiB por fotograma). Lo de un id que ya no viene se queda hasta que sobran muchos.
   */
  if (salida.size > cuerpos.length + 16) salida.clear();
  ORDEN.length = 0;
  for (const c of cuerpos) ORDEN.push(c);
  ORDEN.sort(porDistancia);
  const orden = ORDEN;
  let esqueletos = 0;
  let cerca = 0;
  let propio: CuerpoAMedir | undefined;
  for (const c of orden) {
    if (c.id === yo) {
      propio = c;
      break;
    }
  }
  if (propio !== undefined) {
    salida.set(propio.id, detalleDe('esqueleto', p.trisPropio, 0, conMuelles(p, propio.distancia)));
    esqueletos++;
  }
  for (const c of orden) {
    if (c.id === yo) continue;
    const antes = anterior.get(c.id);
    /* Histéresis: quien ya estaba dentro sale un poco más lejos de lo que entró. */
    const holgura = antes?.modo === 'esqueleto' ? HISTERESIS_M : 0;
    const dentro = p.soloCercanosM === null || c.distancia <= p.soloCercanosM + holgura;
    if (esqueletos < p.esqueletos && dentro) {
      esqueletos++;
      const eraCerca = antes !== undefined && antes.tope === p.trisCerca && p.trisCerca !== p.trisLejos;
      const esCerca = cerca < p.cuantosCerca && c.distancia <= p.cercaM + (eraCerca ? HISTERESIS_M : 0);
      if (esCerca) cerca++;
      const hz = p.hzLejanos > 0 && c.distancia > p.lejanoDesdeM ? p.hzLejanos : 0;
      salida.set(c.id, detalleDe('esqueleto', esCerca ? p.trisCerca : p.trisLejos, hz, conMuelles(p, c.distancia)));
    } else {
      salida.set(c.id, detalleDe('rebano', p.trisRebano, 0, false));
    }
  }
  ORDEN.length = 0;
  return salida;
}

/**
 * ¿CABE UNO MÁS QUE SE DESVANECE? Un cuerpo que deja de venir se desvanece en un cuarto de segundo
 * (`director.ts`), y mientras tanto es una llamada más. La primera versión no lo contaba: en N0, con los
 * ocho esqueletos ocupados, un cercano que se iba y otro que llegaba daban 16 llamadas de 15 durante 15
 * fotogramas, y el margen de triángulos (284) era menor que cualquier cuerpo (lo midió la revisión). El
 * renglón suma el peor caso con TODOS los esqueletos del nivel; así que el que se va sólo se desvanece
 * si deja un hueco (los vivos con esqueleto más los que ya se desvanecen son menos que el tope), y con
 * el LOD de los lejanos, que es el más ligero de los esqueletos: ocupa ese hueco sin pasar de él. Si no
 * cabe, se va de golpe, como se fue del juego.
 */
export function cabeUnoQueSeVa(nivel: Nivel, vivosConEsqueleto: number, yendose: number): boolean {
  return vivosConEsqueleto + yendose < POLITICA[nivel].esqueletos;
}
