/**
 * EL CEREBRO GENÉRICO DE LAS ENTIDADES (declaración J) y los TURNOS DE ATAQUE (declaración K). Es una
 * pieza de `sala.ts`.
 *
 * ═══ LO QUE HACE UNA ENTIDAD, Y NADA MÁS ═══
 *
 * Aparece (intocable mientras se imprime o sale de su punto), elige a quién perseguir, se acerca —en
 * recta si lo ve, por el grafo si no, resbalando contra la estructura si no hay grafo—, ronda a su
 * distancia, y ataca o dispara SÓLO CON TURNO. Cuando cae rematable, espera su remate; si nadie llega,
 * absorbe a otra de la clase que diga su declaración o se deshace y vuelve a aparecer lejos. Todo con
 * los números de su clase: el cerebro no sabe de qué juego es.
 *
 * ═══ LOS TURNOS, O CÓMO SE REPARTE LA PRESIÓN ═══
 *
 * Es lo que hace legible un combate contra muchos: no pegan todos a la vez. Cada asiento admite a la vez
 * `cuerpoACuerpo` unidades de ataque cercano y `disparo` de disparo (cada clase gasta su coste), nunca
 * más de `anunciosALaVez` anuncios contra él, y NINGÚN turno nuevo mientras esté en un estado de
 * `excluyen` —el premio de una esquiva limpia, el ausente, el recién reaparecido—; y quien ya lo tenía
 * lo suelta si su blanco entra en uno (la ráfaga a medias no sigue, como no sigue la cadena). La entidad
 * sin turno ronda a su distancia: está cerca, amenaza, y espera. Los turnos se cuentan de nuevo en cada
 * tic desde lo que hay (quién tiene turno contra quién y qué anuncios vuelan): no hay un contador que un
 * despiste deje desfasado para siempre.
 *
 * ═══ RONDAR ES ESPERAR TURNO, NO QUEDARSE DONDE SE ESTÁ ═══
 *
 * La banda de `CerebroDeclarado` dice a qué distancia se espera. No dice que desde ahí se pueda golpear:
 * las declaraciones de un juego de verdad rondan entre 1,3 y 2,2 m con un golpe de 1,1, y su entidad se
 * quedaba a 1,25 m de un asiento quieto mil tics sin lanzar nada (lo midió el revisor del frente). Así
 * que quien PODRÍA atacar —acción lista, sin recarga ni recuperación, y un turno que se le concedería—
 * se acerca a su alcance aunque esté dentro de la banda; y quien dispara, si desde su sitio no VE al
 * blanco, se mueve hasta verlo (por el grafo si lo sigue): rondar a su distancia sin línea de vista es
 * estar quieto detrás de una pared, y así se pasaba cien tics seguidos sin disparar. Sólo espera quieto
 * quien no tiene turno, que es para lo que está la banda.
 *
 * ═══ A QUIÉN SE PERSIGUE ═══
 *
 * Al que menos perseguidores tiene; empate, el más cercano; empate, el de número menor. Con histéresis:
 * se sigue al de ahora mientras no tenga más de UNO por encima del mínimo, para que dos asientos a la
 * misma distancia no hagan dar media vuelta a la entidad en cada decisión.
 *
 * ═══ SIN BASURA EN LO CALIENTE ═══
 *
 * El cerebro corre por cada entidad en cada tic. Los recuentos de turnos, las distancias del grafo y la
 * cola del recorrido en anchura viven en arrays del módulo que se rellenan ENTEROS antes de usarse:
 * ningún resultado depende de lo que quedara del tic anterior, y no se crea un array por pregunta.
 */
import { COSENO, DT_DEL_TIC, SENO } from '../andar';
import { por, UNO } from '../fijo';
import { unPaso } from '../mundo';
import type { AsientoEnCurso, EntidadEnCurso, PasoEnCurso } from './paso-en-curso';
import type { ModoDelCerebro } from './tipos-de-la-sala';
import { bloqueaElPaso, bloqueaLaAccion, contar, enCurso, nuevoNumero, tirar } from './paso-en-curso';
import type { AccionDeclarada, ClaseDeEntidad, ZonaDelMundo } from './declaracion';
import { dentroDelRadio, distanciaAlCuadrado, hayLineaDeVista, rumboHacia, trayectoria } from './geometria';
import { aCentesimas, MOTIVO_DE_IRSE } from './protocolo';
import { compTics, dentroDelLimite, largo, ponerEstadoALaEntidad, sePuedeEstarEn } from './cuerpo';
import { anuncioDelAutor, asientoDe, entidadEnPie, lanzarAnuncio, rumboDeA } from './combate';
import { puestaDesde } from './paso-en-curso';
import { dispararBala } from './proyectiles';

/* ─── LOS ARRAYS DEL MÓDULO (ver «sin basura en lo caliente») ─────────────── */

/** Unidades de cuerpo a cuerpo y de disparo concedidas contra cada asiento, anuncios contra él y perseguidores. */
let CUERPO_A_CUERPO = new Int32Array(16);
let DISPARO = new Int32Array(16);
let ANUNCIOS = new Int32Array(16);
let PERSIGUEN = new Int32Array(16);
/** El recorrido en anchura del grafo: distancias en saltos y cola. */
let SALTOS = new Int32Array(0);
let COLA = new Int32Array(0);
/** Los nudos más cercanos a un punto, para buscar el primero que se vea. */
const CERCANOS = 6;
const NUDO_CERCANO = new Int32Array(CERCANOS);
const DISTANCIA_CERCANA = new Float64Array(CERCANOS);

/** A qué distancia de un nudo se da por llegado: una unidad. */
const LLEGADO = UNO;

/* ─── NACER ──────────────────────────────────────────────────────────────── */

/**
 * UNA ENTIDAD NUEVA de la clase `clase` en `(x, z)`, mirando a `mira`: apareciendo durante sus
 * `aparicion.tics` (intocable, sin actuar). Cuenta su `nace`.
 */
export function nuevaEntidad(p: PasoEnCurso, clase: ClaseDeEntidad, grupo: number, x: number, z: number, mira: number): EntidadEnCurso {
  const e: EntidadEnCurso = {
    numero: nuevoNumero(p),
    clase: clase.id,
    grupo,
    x,
    z,
    mira,
    marcha: 0,
    vida: clase.vida,
    estado: null,
    blanco: 0,
    turno: 'ninguno',
    cerebro: { modo: 'aparecer', desdeTic: p.k, repiensaEnTic: p.k + clase.aparicion.tics, nudo: -1, apuntaX: x, apuntaZ: z, balasPorSalir: 0 },
    cadena: null,
    recargas: [],
    recuperaHastaTic: 0,
  };
  p.entidades.push(e);
  contar(p, 0, { e: 'nace', id: e.numero, clase: clase.id, x: aCentesimas(x), z: aCentesimas(z), r: mira });
  return e;
}

/**
 * UN PUNTO DE UNA ZONA donde quepa un cuerpo de radio `radio`, sorteado con el azar de la sala (cuatro
 * intentos); si ninguno cabe, el centro. Dos entidades que salen de la misma zona no salen encima. La
 * zona puede estar fuera del límite de la fase: es de donde vienen (ver `darPaso`).
 */
export function puntoEnLaZona(p: PasoEnCurso, zona: ZonaDelMundo, radio: number): { x: number; z: number } {
  const c = zona.caja;
  for (let i = 0; i < 4; i++) {
    const x = c.x0 + tirar(p, c.x1 - c.x0 + 1);
    const z = c.z0 + tirar(p, c.z1 - c.z0 + 1);
    if (sePuedeEstarEn(p, x, z, radio)) return { x, z };
  }
  return { x: Math.floor((c.x0 + c.x1) / 2), z: Math.floor((c.z0 + c.z1) / 2) };
}

/** Hacia qué rumbo mira quien aparece en `(x, z)`: hacia el asiento con cuerpo más cercano (0 si no hay). */
export function miraAlMasCercano(p: PasoEnCurso, x: number, z: number): number {
  let mejor: AsientoEnCurso | null = null;
  let mejorD = 0;
  for (const a of p.asientos) {
    if (!a.conCuerpo) continue;
    const d = distanciaAlCuadrado(a.x - x, a.z - z);
    if (mejor === null || d < mejorD) {
      mejor = a;
      mejorD = d;
    }
  }
  return mejor === null ? 0 : rumboDeA(x, z, mejor.x, mejor.z, 0);
}

/* ─── CADA TIC ───────────────────────────────────────────────────────────── */

/** Cuenta desde lo que hay los turnos concedidos, los anuncios y los perseguidores de cada asiento. */
function contarTurnos(p: PasoEnCurso): void {
  const n = p.asientos.length + 1;
  if (CUERPO_A_CUERPO.length < n) {
    CUERPO_A_CUERPO = new Int32Array(n);
    DISPARO = new Int32Array(n);
    ANUNCIOS = new Int32Array(n);
    PERSIGUEN = new Int32Array(n);
  }
  CUERPO_A_CUERPO.fill(0);
  DISPARO.fill(0);
  ANUNCIOS.fill(0);
  PERSIGUEN.fill(0);
  for (const e of p.entidades) {
    if (e.blanco < 1 || e.blanco >= n) continue;
    PERSIGUEN[e.blanco] = (PERSIGUEN[e.blanco] as number) + 1;
    const clase = p.indices.clases[e.clase];
    if (clase === undefined) continue;
    if (e.turno === 'cuerpoACuerpo') CUERPO_A_CUERPO[e.blanco] = (CUERPO_A_CUERPO[e.blanco] as number) + clase.cerebro.costeCuerpoACuerpo;
    else if (e.turno === 'disparo') DISPARO[e.blanco] = (DISPARO[e.blanco] as number) + clase.cerebro.costeDisparo;
  }
  for (const an of p.anuncios) {
    if (an.lanzadoEnTic > p.k || an.a < 1 || an.a >= n) continue;
    ANUNCIOS[an.a] = (ANUNCIOS[an.a] as number) + 1;
  }
}

/**
 * TODAS LAS ENTIDADES, UN TIC. Las que otra absorbe en este tic se quitan al acabar la vuelta (su `seva`
 * ya salió), para no mover la lista mientras se recorre.
 */
export function pensarLasEntidades(p: PasoEnCurso): void {
  contarTurnos(p);
  let quitar: number[] | null = null;
  for (let i = 0; i < p.entidades.length; i++) {
    const e = p.entidades[i] as EntidadEnCurso;
    if (quitar !== null && quitar.indexOf(e.numero) >= 0) continue;
    const clase = p.indices.clases[e.clase];
    if (clase === undefined) continue;
    e.marcha = 0;
    const absorbida = pensarUna(p, e, clase);
    if (absorbida !== 0) {
      if (quitar === null) quitar = [];
      quitar.push(absorbida);
    }
  }
  if (quitar === null) return;
  const quedan: EntidadEnCurso[] = [];
  for (const e of p.entidades) if (quitar.indexOf(e.numero) < 0) quedan.push(e);
  p.entidades = quedan;
}

/** Una entidad, un tic. Devuelve el número de la que absorbió (0 si ninguna). */
function pensarUna(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad): number {
  const k = p.k;
  const cer = e.cerebro;
  if (cer.modo === 'deshecha') {
    if (k >= cer.repiensaEnTic) reaparecer(p, e, clase);
    return 0;
  }
  if (cer.modo === 'caida') return k >= cer.repiensaEnTic ? siNoLaRematan(p, e, clase) : 0;
  if (cer.modo === 'absorber') {
    if (enCurso(e.estado, k) === null && clase.alCaer.tipo === 'rematable') {
      e.vida = clase.alCaer.siNo.vida;
      e.cerebro = { ...cer, modo: 'acechar', desdeTic: k, repiensaEnTic: k };
    }
    return 0;
  }
  if (cer.modo === 'aparecer') {
    if (k < cer.repiensaEnTic) return 0;
    e.cerebro = { ...cer, modo: 'acechar', desdeTic: k, repiensaEnTic: k };
  }
  if (bloqueaLaAccion(p.indices, e.estado, k) || bloqueaElPaso(p.indices, e.estado, k)) {
    /* Aturdida: no piensa ni se mueve, y el turno que tuviera se suelta (salvo el del golpe en vuelo). */
    const m = e.cerebro.modo;
    if (m === 'apuntar' || m === 'disparar') e.cerebro = { ...e.cerebro, modo: 'acechar', desdeTic: k, repiensaEnTic: k, balasPorSalir: 0 };
    if (e.cerebro.modo !== 'atacar') soltarTurno(e, clase);
    return 0;
  }
  const modo = e.cerebro.modo;
  if (modo === 'atacar') {
    const an = anuncioDelAutor(p, e.numero);
    if (an !== null) {
      avanzarAlAtacar(p, e, clase, an.accion, an.impactoEnTic - an.lanzadoEnTic);
      return 0;
    }
    e.cerebro = { ...e.cerebro, modo: 'acechar', desdeTic: k, repiensaEnTic: k };
  }
  if (modo === 'apuntar' || modo === 'disparar') {
    apuntarYDisparar(p, e, clase);
    return 0;
  }
  let b = blancoValido(p, e.blanco);
  if (k >= e.cerebro.repiensaEnTic || b === null) {
    pensar(p, e, clase);
    b = blancoValido(p, e.blanco);
  }
  if (b === null) return 0;
  const quiere = intentarAtacar(p, e, clase, b);
  if (quiere === QUIERE.atacado) return 0;
  moverse(p, e, clase, b, quiere);
  return 0;
}

/** El asiento de número `n` si se le puede perseguir: con cuerpo, con vida, y ni ausente ni sin cuerpo. */
function blancoValido(p: PasoEnCurso, n: number): AsientoEnCurso | null {
  const a = asientoDe(p, n);
  if (a === null || !a.conCuerpo || a.vida <= 0) return null;
  const activo = enCurso(a.estado, p.k);
  if (activo !== null && (activo.estado === p.declaracion.presencia.estadoAusente || activo.estado === p.declaracion.sinCuerpo.estado)) return null;
  return a;
}

/** Suelta el turno que tenga (los recuentos del tic se corrigen para las que piensan después). */
function soltarTurno(e: EntidadEnCurso, clase: ClaseDeEntidad): void {
  if (e.turno === 'cuerpoACuerpo' && e.blanco > 0 && e.blanco < CUERPO_A_CUERPO.length) {
    CUERPO_A_CUERPO[e.blanco] = (CUERPO_A_CUERPO[e.blanco] as number) - clase.cerebro.costeCuerpoACuerpo;
  } else if (e.turno === 'disparo' && e.blanco > 0 && e.blanco < DISPARO.length) {
    DISPARO[e.blanco] = (DISPARO[e.blanco] as number) - clase.cerebro.costeDisparo;
  }
  e.turno = 'ninguno';
}

/** ¿Está el asiento en un estado de `excluyen`, por el que no se le dan turnos? */
function excluido(p: PasoEnCurso, b: AsientoEnCurso): boolean {
  const activo = enCurso(b.estado, p.k);
  return activo !== null && p.indices.excluyen[activo.estado] === true;
}

/** ¿SE LE CONCEDERÍA un turno de `tipo` contra `b`? La pregunta sin conceder nada (ver `concederTurno`). */
function turnoPosible(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, b: AsientoEnCurso, tipo: 'cuerpoACuerpo' | 'disparo'): boolean {
  if (e.turno === tipo && e.blanco === b.numero) return true;
  if (excluido(p, b)) return false;
  const t = p.declaracion.turnos;
  if (tipo === 'cuerpoACuerpo') {
    if ((CUERPO_A_CUERPO[b.numero] as number) + clase.cerebro.costeCuerpoACuerpo > t.cuerpoACuerpo) return false;
    return (ANUNCIOS[b.numero] as number) < t.anunciosALaVez;
  }
  return (DISPARO[b.numero] as number) + clase.cerebro.costeDisparo <= t.disparo;
}

/**
 * ¿SE LE CONCEDE UN TURNO de `tipo` contra `b`? Ver «los turnos» en la cabecera. Si sí, se apunta ya en
 * los recuentos del tic: la siguiente entidad que pregunte en este mismo tic lo ve.
 */
function concederTurno(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, b: AsientoEnCurso, tipo: 'cuerpoACuerpo' | 'disparo'): boolean {
  if (!turnoPosible(p, e, clase, b, tipo)) return false;
  if (e.turno === tipo && e.blanco === b.numero) return true;
  soltarTurno(e, clase);
  if (e.blanco !== b.numero) {
    if (e.blanco > 0 && e.blanco < PERSIGUEN.length) PERSIGUEN[e.blanco] = (PERSIGUEN[e.blanco] as number) - 1;
    PERSIGUEN[b.numero] = (PERSIGUEN[b.numero] as number) + 1;
  }
  e.turno = tipo;
  e.blanco = b.numero;
  if (tipo === 'cuerpoACuerpo') CUERPO_A_CUERPO[b.numero] = (CUERPO_A_CUERPO[b.numero] as number) + clase.cerebro.costeCuerpoACuerpo;
  else DISPARO[b.numero] = (DISPARO[b.numero] as number) + clase.cerebro.costeDisparo;
  return true;
}

/* ─── PENSAR: A QUIÉN, Y POR DÓNDE ───────────────────────────────────────── */

function pensar(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad): void {
  const actual = blancoValido(p, e.blanco);
  let minimo = -1;
  let elegido: AsientoEnCurso | null = null;
  let elegidoD = 0;
  for (const a of p.asientos) {
    if (blancoValido(p, a.numero) === null) continue;
    const persiguen = (PERSIGUEN[a.numero] as number) - (a.numero === e.blanco ? 1 : 0);
    const d = distanciaAlCuadrado(a.x - e.x, a.z - e.z);
    if (minimo < 0 || persiguen < minimo) minimo = persiguen;
    if (elegido === null) {
      elegido = a;
      elegidoD = d;
      continue;
    }
    const persiguenElegido = (PERSIGUEN[elegido.numero] as number) - (elegido.numero === e.blanco ? 1 : 0);
    if (persiguen < persiguenElegido || (persiguen === persiguenElegido && d < elegidoD)) {
      elegido = a;
      elegidoD = d;
    }
  }
  if (actual !== null) {
    const persiguenActual = (PERSIGUEN[actual.numero] as number) - 1;
    if (persiguenActual <= minimo + 1) elegido = actual;
  }
  if (elegido === null) {
    soltarTurno(e, clase);
    if (e.blanco > 0 && e.blanco < PERSIGUEN.length) PERSIGUEN[e.blanco] = (PERSIGUEN[e.blanco] as number) - 1;
    e.blanco = 0;
    e.cerebro = { ...e.cerebro, repiensaEnTic: p.k + clase.cerebro.decideCadaTics };
    return;
  }
  if (elegido.numero !== e.blanco) {
    soltarTurno(e, clase);
    if (e.blanco > 0 && e.blanco < PERSIGUEN.length) PERSIGUEN[e.blanco] = (PERSIGUEN[e.blanco] as number) - 1;
    PERSIGUEN[elegido.numero] = (PERSIGUEN[elegido.numero] as number) + 1;
    e.blanco = elegido.numero;
  }
  let nudo = e.cerebro.nudo;
  if (hayLineaDeVista(p.arena.cuerpos, e.x, e.z, elegido.x, elegido.z)) nudo = -1;
  else if (clase.cerebro.sigueElGrafo && p.declaracion.mundo.grafo.nudos.length > 0 && nudo < 0) nudo = nudoVisibleMasCercano(p, e.x, e.z);
  e.cerebro = { ...e.cerebro, modo: modoDeLaBanda(e.cerebro.modo, elegido.x - e.x, elegido.z - e.z, clase), nudo, repiensaEnTic: p.k + clase.cerebro.decideCadaTics };
}

/**
 * ACECHAR O RONDAR, con histéresis, como dice `CerebroDeclarado`: más lejos que `distanciaMaxima` va a
 * por él; acechando, se acerca HASTA `distanciaMinima` y entonces ronda; rondando, sigue rondando
 * mientras no se le escape más allá de `distanciaMaxima`.
 *
 * La primera versión paraba en la máxima, y lo cazaron las declaraciones de un juego de verdad: su
 * cuerpo a cuerpo ronda entre 1,0 y 1,8 m con un golpe de 1,1, y sus entidades se quedaban a 1,8 m
 * mirando al asiento sin atacar nunca. Con la liza de juguete (0 y 1,1) no se veía.
 */
function modoDeLaBanda(modo: ModoDelCerebro, dx: number, dz: number, clase: ClaseDeEntidad): ModoDelCerebro {
  const ce = clase.cerebro;
  if (!dentroDelRadio(dx, dz, ce.distanciaMaxima)) return 'acechar';
  if (dentroDelRadio(dx, dz, ce.distanciaMinima)) return 'rondar';
  return modo === 'rondar' ? 'rondar' : 'acechar';
}

/** Demasiado cerca para rondar: a menos de tres cuartos de la mínima, se aparta (con margen, para no temblar). */
function demasiadoCerca(dx: number, dz: number, clase: ClaseDeEntidad): boolean {
  const cerca = Math.floor((clase.cerebro.distanciaMinima * 3) / 4);
  return cerca > 0 && dentroDelRadio(dx, dz, cerca);
}

/**
 * EL NUDO DEL GRAFO MÁS CERCANO QUE SE VE desde `(x, z)`: de los `CERCANOS` más cercanos, el primero con
 * línea de vista. −1 si ninguno. Los más cercanos se sacan de una pasada, sin ordenar la lista entera.
 */
function nudoVisibleMasCercano(p: PasoEnCurso, x: number, z: number): number {
  const nudos = p.declaracion.mundo.grafo.nudos;
  let cuantos = 0;
  for (let i = 0; i < nudos.length; i++) {
    const n = nudos[i] as { x: number; z: number };
    const d = distanciaAlCuadrado(n.x - x, n.z - z);
    let j = cuantos < CERCANOS ? cuantos : CERCANOS - 1;
    if (cuantos === CERCANOS && d >= (DISTANCIA_CERCANA[j] as number)) continue;
    while (j > 0 && (DISTANCIA_CERCANA[j - 1] as number) > d) {
      DISTANCIA_CERCANA[j] = DISTANCIA_CERCANA[j - 1] as number;
      NUDO_CERCANO[j] = NUDO_CERCANO[j - 1] as number;
      j--;
    }
    DISTANCIA_CERCANA[j] = d;
    NUDO_CERCANO[j] = i;
    if (cuantos < CERCANOS) cuantos++;
  }
  for (let j = 0; j < cuantos; j++) {
    const i = NUDO_CERCANO[j] as number;
    const n = nudos[i] as { x: number; z: number };
    if (hayLineaDeVista(p.arena.cuerpos, x, z, n.x, n.z)) return i;
  }
  return -1;
}

/**
 * EL SIGUIENTE NUDO desde `desde` hacia el asiento `b`: el vecino más cerca en saltos del nudo que ve a
 * `b` (recorrido en anchura desde ése). −1 si `desde` ya es ese nudo o no hay camino: entonces en recta.
 */
function siguienteNudo(p: PasoEnCurso, desde: number, b: AsientoEnCurso): number {
  const meta = nudoVisibleMasCercano(p, b.x, b.z);
  if (meta < 0 || meta === desde) return -1;
  const cuantos = p.declaracion.mundo.grafo.nudos.length;
  if (SALTOS.length < cuantos) {
    SALTOS = new Int32Array(cuantos);
    COLA = new Int32Array(cuantos);
  }
  SALTOS.fill(-1, 0, cuantos);
  const inicio = p.indices.inicio;
  const vecinos = p.indices.vecinos;
  let cabeza = 0;
  let cola = 0;
  SALTOS[meta] = 0;
  COLA[cola++] = meta;
  while (cabeza < cola) {
    const u = COLA[cabeza++] as number;
    const du = SALTOS[u] as number;
    for (let j = inicio[u] as number; j < (inicio[u + 1] as number); j++) {
      const v = vecinos[j] as number;
      if ((SALTOS[v] as number) >= 0) continue;
      SALTOS[v] = du + 1;
      COLA[cola++] = v;
    }
  }
  let mejor = -1;
  let mejorSaltos = -1;
  for (let j = inicio[desde] as number; j < (inicio[desde + 1] as number); j++) {
    const v = vecinos[j] as number;
    const s = SALTOS[v] as number;
    if (s < 0) continue;
    if (mejor < 0 || s < mejorSaltos || (s === mejorSaltos && v < mejor)) {
      mejor = v;
      mejorSaltos = s;
    }
  }
  return mejor;
}

/* ─── ATACAR Y DISPARAR ──────────────────────────────────────────────────── */

function enRecarga(e: EntidadEnCurso, accion: number, k: number): boolean {
  for (const r of e.recargas) if (r.accion === accion && r.hastaTic > k) return true;
  return false;
}

/**
 * Lo que sale de `intentarAtacar`: ya atacó (o empezó a apuntar); nada que hacer más que su banda; quiere
 * ACERCARSE a su alcance porque se le daría el turno; o quiere VER al blanco para dispararle. Ver «rondar
 * es esperar turno» en la cabecera.
 */
const QUIERE = { nada: 0, atacado: 1, acercarse: 2, verlo: 3 } as const;
type Quiere = (typeof QUIERE)[keyof typeof QUIERE];

/**
 * SI PUEDE, ATACA O EMPIEZA A APUNTAR. Cuerpo a cuerpo con la primera acción que abre y alcanza; si no,
 * disparo, con el blanco entre sus dos distancias y a la vista. Las dos cosas, sólo con turno. Si no ataca,
 * dice qué le haría falta para poder (ver `QUIERE`).
 *
 * Quien dispara no se acerca a golpear: su sitio es su banda de tiro, y el cuerpo a cuerpo es para
 * cuando se le echan encima.
 */
function intentarAtacar(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, b: AsientoEnCurso): Quiere {
  const k = p.k;
  if (k < e.recuperaHastaTic) return QUIERE.nada;
  const dx = b.x - e.x;
  const dz = b.z - e.z;
  const proyectil = clase.proyectil === 0 ? undefined : p.indices.proyectiles[clase.proyectil];
  const abren = p.indices.porClase[clase.id]?.abren ?? [];
  let acercarse = false;
  for (const accion of abren) {
    if (enRecarga(e, accion.id, k)) continue;
    if (accion.soloEn.length > 0) {
      const activo = enCurso(e.estado, k);
      if (activo === null || accion.soloEn.indexOf(activo.estado) < 0) continue;
    }
    if (!dentroDelRadio(dx, dz, accion.alcance)) {
      if (proyectil === undefined && !acercarse) acercarse = turnoPosible(p, e, clase, b, 'cuerpoACuerpo');
      continue;
    }
    if (!concederTurno(p, e, clase, b, 'cuerpoACuerpo')) return QUIERE.nada;
    atacar(p, e, clase, accion, b);
    return QUIERE.atacado;
  }
  if (proyectil === undefined) return acercarse ? QUIERE.acercarse : QUIERE.nada;
  if (!dentroDelRadio(dx, dz, clase.cerebro.distanciaMaxima) || demasiadoCerca(dx, dz, clase)) return QUIERE.nada;
  if (!hayLineaDeVista(p.arena.cuerpos, e.x, e.z, b.x, b.z)) return QUIERE.verlo;
  if (!concederTurno(p, e, clase, b, 'disparo')) return QUIERE.nada;
  e.mira = rumboDeA(e.x, e.z, b.x, b.z, e.mira);
  e.cerebro = { ...e.cerebro, modo: 'apuntar', desdeTic: k, repiensaEnTic: k + proyectil.apuntarTics, apuntaX: b.x, apuntaZ: b.z, balasPorSalir: 0 };
  return QUIERE.atacado;
}

/**
 * LANZA UN GOLPE CONTRA `b`, alargado en su `comp` si la liza lo pide. Si la acción avanza, el sitio al
 * que avanza —hacia el blanco, parándose al tocarlo y antes de la estructura— se guarda en `apunta`.
 */
function atacar(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, accion: AccionDeclarada, b: AsientoEnCurso): void {
  e.mira = rumboDeA(e.x, e.z, b.x, b.z, e.mira);
  e.cadena = null;
  const mas = p.declaracion.turnos.alargarConLaRed ? compTics(b) : 0;
  lanzarAnuncio(p, e.numero, e.x, e.z, accion, b.numero, false, p.k, mas, false);
  ANUNCIOS[b.numero] = (ANUNCIOS[b.numero] as number) + 1;
  if (accion.recargaTics > 0) {
    const recargas: { accion: number; hastaTic: number }[] = [];
    for (const r of e.recargas) if (r.hastaTic > p.k) recargas.push(r);
    recargas.push({ accion: accion.id, hastaTic: p.k + accion.recargaTics });
    e.recargas = recargas;
  }
  let apuntaX = e.x;
  let apuntaZ = e.z;
  if (accion.avance > 0) {
    const dx = b.x - e.x;
    const dz = b.z - e.z;
    const d = largo(dx, dz);
    const hueco = d - clase.radio - (p.declaracion.asientos[b.numero - 1]?.cuerpo.radio ?? 0);
    const anda = hueco < accion.avance ? hueco : accion.avance;
    if (anda > 0 && d > 0) {
      const t = trayectoria(p.arena.cuerpos, e.x, e.z, Math.floor((dx * anda) / d), Math.floor((dz * anda) / d), clase.radio);
      apuntaX = t.x;
      apuntaZ = t.z;
    }
  }
  e.cerebro = { ...e.cerebro, modo: 'atacar', desdeTic: p.k, apuntaX, apuntaZ };
}

/** El avance de un golpe, repartido en los tics de su anuncio: nunca más allá del sitio guardado. */
function avanzarAlAtacar(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, accion: number, ticsDelAnuncio: number): void {
  const a = p.indices.porClase[clase.id]?.acciones[accion];
  if (a === undefined || a.avance <= 0) return;
  const dx = e.cerebro.apuntaX - e.x;
  const dz = e.cerebro.apuntaZ - e.z;
  const falta = largo(dx, dz);
  if (falta <= 0) return;
  const tramo = Math.ceil(a.avance / (ticsDelAnuncio > 0 ? ticsDelAnuncio : 1));
  const x = falta <= tramo ? e.cerebro.apuntaX : e.x + Math.floor((dx * tramo) / falta);
  const z = falta <= tramo ? e.cerebro.apuntaZ : e.z + Math.floor((dz * tramo) / falta);
  if (!sePuedeEstarEn(p, x, z, clase.radio) || chocaConOtra(p, e, x, z, clase.radio)) return;
  e.x = x;
  e.z = z;
  e.marcha = 1;
}

/**
 * APUNTAR Y DISPARAR: apunta `apuntarTics` al sitio que el blanco tenga al TERMINAR de apuntar —apuntar
 * a donde estará sería adivinar— y dispara la ráfaga, una bala cada `cadaTics`. Al acabar suelta el turno.
 * Si el blanco entra en un estado de `excluyen` (su premio, sobre todo) lo deja: el turno se le dio antes,
 * pero «nunca a quien está en su premio» es también no seguir disparándole (y la cadena de un golpe
 * tampoco sigue: ver `seguirTrasElImpacto` en `combate.ts`). Lo que ya vuela, vuela.
 */
function apuntarYDisparar(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad): void {
  const k = p.k;
  const proyectil = p.indices.proyectiles[clase.proyectil];
  const b = blancoValido(p, e.blanco);
  const blancoFijo = asientoDe(p, e.blanco);
  const dejarlo = blancoFijo !== null && excluido(p, blancoFijo);
  if (proyectil === undefined || (e.cerebro.modo === 'apuntar' && b === null) || dejarlo) {
    const aMedias = e.cerebro.modo === 'disparar';
    soltarTurno(e, clase);
    if (aMedias) e.recuperaHastaTic = k + clase.cerebro.decideCadaTics;
    e.cerebro = { ...e.cerebro, modo: 'acechar', desdeTic: k, repiensaEnTic: k, balasPorSalir: 0 };
    return;
  }
  if (e.cerebro.modo === 'apuntar') {
    if (b !== null) e.mira = rumboDeA(e.x, e.z, b.x, b.z, e.mira);
    if (k < e.cerebro.repiensaEnTic || b === null) return;
    e.cerebro = { ...e.cerebro, modo: 'disparar', desdeTic: k, repiensaEnTic: k, apuntaX: b.x, apuntaZ: b.z, balasPorSalir: proyectil.balas };
  }
  if (k < e.cerebro.repiensaEnTic || e.cerebro.balasPorSalir <= 0) return;
  dispararBala(p, e, proyectil, e.cerebro.apuntaX, e.cerebro.apuntaZ);
  const quedan = e.cerebro.balasPorSalir - 1;
  if (quedan > 0) {
    e.cerebro = { ...e.cerebro, balasPorSalir: quedan, repiensaEnTic: k + (proyectil.cadaTics > 0 ? proyectil.cadaTics : 1) };
    return;
  }
  soltarTurno(e, clase);
  e.recuperaHastaTic = k + clase.cerebro.decideCadaTics;
  e.cerebro = { ...e.cerebro, modo: 'acechar', desdeTic: k, repiensaEnTic: k, balasPorSalir: 0 };
}

/* ─── MOVERSE ────────────────────────────────────────────────────────────── */

/**
 * SE ACERCA, SE ALEJA O RONDA según su banda (`modoDeLaBanda`) y lo que le haga falta para atacar
 * (`quiere`). Acercarse va al nudo del grafo si lo tiene (y al llegar pasa al siguiente) o en recta;
 * rondar es quedarse a su distancia mirando al blanco, y apartarse si se le ha echado encima. Pero quien
 * se acercaría a golpear con turno, o no ve a quien dispara, no ronda: se acerca (ver la cabecera). Quien
 * va a golpear no se aparta por «demasiado cerca»: su alcance puede quedar dentro de ese margen.
 */
function moverse(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, b: AsientoEnCurso, quiere: Quiere): void {
  const dx = b.x - e.x;
  const dz = b.z - e.z;
  const modo = modoDeLaBanda(e.cerebro.modo, dx, dz, clase);
  if (modo !== e.cerebro.modo) e.cerebro = { ...e.cerebro, modo };
  if (modo === 'rondar' && quiere !== QUIERE.acercarse) {
    if (demasiadoCerca(dx, dz, clase)) {
      darPaso(p, e, clase, b.x, b.z, true);
      e.mira = rumboDeA(e.x, e.z, b.x, b.z, e.mira);
      return;
    }
    if (quiere !== QUIERE.verlo) {
      e.mira = rumboDeA(e.x, e.z, b.x, b.z, e.mira);
      return;
    }
  }
  let nudo = e.cerebro.nudo;
  const nudos = p.declaracion.mundo.grafo.nudos;
  if (nudo >= 0 && nudo < nudos.length) {
    const n = nudos[nudo] as { x: number; z: number };
    if (dentroDelRadio(n.x - e.x, n.z - e.z, LLEGADO)) {
      nudo = siguienteNudo(p, nudo, b);
      e.cerebro = { ...e.cerebro, nudo };
    }
  } else nudo = -1;
  if (nudo >= 0) {
    const n = nudos[nudo] as { x: number; z: number };
    darPaso(p, e, clase, n.x, n.z, false);
  } else darPaso(p, e, clase, b.x, b.z, false);
}

/**
 * Probar el rumbo, y si otra entidad estorba, cada vez más de lado: 22°, 45°, 67° y 90° a cada mano. Con
 * sólo el primer desvío, las que llegan detrás de la primera se quedaban tapadas por ella y nunca
 * rodeaban al blanco: el comprobador de turnos vio seis entidades encima de un asiento y UNA atacando.
 */
const DESVIOS = [0, 16, 240, 32, 224, 48, 208, 64, 192];

/**
 * UN PASO DE UN TIC hacia `(tx, tz)` (o alejándose): `unPaso` de `mundo.ts`, que resbala contra la
 * estructura, sin meterse en otra entidad y sin SALIR del límite de la fase.
 *
 * ═══ EL LÍMITE NO SE CRUZA HACIA FUERA, PERO SÍ HACIA DENTRO ═══
 *
 * Las zonas de las que salen las entidades pueden estar fuera del límite de la fase (las bocas de las
 * calles que dan a una plaza). La primera versión exigía el límite a cada paso, y las que nacían fuera
 * se quedaban clavadas para siempre donde salían: ningún paso caía dentro. Ahora sólo se le exige a la
 * que ya está dentro.
 */
function darPaso(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, tx: number, tz: number, alejarse: boolean): boolean {
  const dx = tx - e.x;
  const dz = tz - e.z;
  if (dx === 0 && dz === 0) return false;
  let r0 = rumboHacia(dx, dz);
  if (alejarse) r0 = (r0 + 128) % 256;
  const dentro = dentroDelLimite(p, e.x, e.z);
  for (let i = 0; i < DESVIOS.length; i++) {
    const r = (r0 + (DESVIOS[i] as number)) % 256;
    const vx = por(clase.velocidad, SENO[r] as number);
    const vz = -por(clase.velocidad, COSENO[r] as number);
    const q = unPaso(p.arena, e, vx, vz, DT_DEL_TIC, clase.radio);
    if (q.x === e.x && q.z === e.z) continue;
    if ((dentro && !dentroDelLimite(p, q.x, q.z)) || chocaConOtra(p, e, q.x, q.z, clase.radio)) continue;
    e.x = q.x;
    e.z = q.z;
    e.marcha = 1;
    e.mira = r;
    return true;
  }
  return false;
}

/**
 * ¿SE METERÍA EN OTRA ENTIDAD yendo a `(x, z)`? Cuadrados, como todo en la casa. Un paso que SEPARA a
 * dos que ya se solapaban sí se deja: si no, dos que nacen juntas no se despegarían nunca.
 */
function chocaConOtra(p: PasoEnCurso, e: EntidadEnCurso, x: number, z: number, radio: number): boolean {
  for (const o of p.entidades) {
    if (o === e || o.cerebro.modo === 'deshecha') continue;
    const clase = p.indices.clases[o.clase];
    const s = radio + (clase === undefined ? radio : clase.radio);
    const nx = o.x - x;
    const nz = o.z - z;
    if (nx >= s || nx <= -s || nz >= s || nz <= -s) continue;
    const ax = o.x - e.x;
    const az = o.z - e.z;
    const antes = ax < s && ax > -s && az < s && az > -s;
    if (!antes) return true;
    if (distanciaAlCuadrado(nx, nz) < distanciaAlCuadrado(ax, az)) return true;
  }
  return false;
}

/* ─── LA CAÍDA SIN REMATE ────────────────────────────────────────────────── */

/**
 * NADIE LA REMATÓ (ver `SiNoLaRematan`): absorbe a la entidad viva más cercana de la clase `absorbe` a
 * `radio` o menos (empate, número menor) y se levanta tras `absorbiendo`, o se deshace y vuelve más tarde
 * con su mismo número. Devuelve el número de la absorbida (0 si ninguna).
 */
function siNoLaRematan(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad): number {
  if (clase.alCaer.tipo !== 'rematable') return 0;
  const s = clase.alCaer.siNo;
  let presa: EntidadEnCurso | null = null;
  let presaD = 0;
  if (s.absorbe !== 0) {
    for (const o of p.entidades) {
      if (o === e || o.clase !== s.absorbe || !entidadEnPie(o) || o.cerebro.modo === 'aparecer') continue;
      if (!dentroDelRadio(o.x - e.x, o.z - e.z, s.radio)) continue;
      const d = distanciaAlCuadrado(o.x - e.x, o.z - e.z);
      if (presa === null || d < presaD || (d === presaD && o.numero < presa.numero)) {
        presa = o;
        presaD = d;
      }
    }
  }
  if (presa !== null) {
    contar(p, 0, { e: 'seva', id: presa.numero, por: MOTIVO_DE_IRSE.absorbida, quien: e.numero });
    presa.turno = 'ninguno';
    e.cerebro = { ...e.cerebro, modo: 'absorber', desdeTic: p.k, repiensaEnTic: p.k + s.absorbiendo.tics };
    ponerEstadoALaEntidad(p, e, puestaDesde(s.absorbiendo, p.k, 0));
    return presa.numero;
  }
  contar(p, 0, { e: 'seva', id: e.numero, por: MOTIVO_DE_IRSE.seDeshace, quien: 0 });
  e.estado = null;
  e.turno = 'ninguno';
  e.blanco = 0;
  e.cerebro = { modo: 'deshecha', desdeTic: p.k, repiensaEnTic: p.k + s.reapareceTras, nudo: -1, apuntaX: e.x, apuntaZ: e.z, balasPorSalir: 0 };
  return 0;
}

/**
 * VUELVE LA QUE SE DESHIZO: en una zona de `claseDeZona` a `distanciaMinima` o más de todo asiento con
 * cuerpo (sorteada entre las que valen); si ninguna vale, la que queda más lejos del más cercano. Con
 * su mismo número, en un `nace` nuevo, y apareciendo otra vez.
 */
function reaparecer(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad): void {
  if (clase.alCaer.tipo !== 'rematable') return;
  const s = clase.alCaer.siNo;
  const zonas = p.indices.zonasDeLaClase[s.claseDeZona] ?? [];
  if (zonas.length === 0) return;
  const valen: ZonaDelMundo[] = [];
  let lejana: ZonaDelMundo | null = null;
  let lejanaD = -1;
  const minima = s.distanciaMinima * s.distanciaMinima;
  for (const z of zonas) {
    const cx = Math.floor((z.caja.x0 + z.caja.x1) / 2);
    const cz = Math.floor((z.caja.z0 + z.caja.z1) / 2);
    let masCerca = -1;
    for (const a of p.asientos) {
      if (!a.conCuerpo) continue;
      const d = distanciaAlCuadrado(a.x - cx, a.z - cz);
      if (masCerca < 0 || d < masCerca) masCerca = d;
    }
    if (masCerca < 0 || masCerca >= minima) valen.push(z);
    if (masCerca > lejanaD) {
      lejana = z;
      lejanaD = masCerca;
    }
  }
  const zona = valen.length > 0 ? (valen[tirar(p, valen.length)] as ZonaDelMundo) : lejana;
  if (zona === null) return;
  const punto = puntoEnLaZona(p, zona, clase.radio);
  e.x = punto.x;
  e.z = punto.z;
  e.vida = s.vida;
  e.estado = null;
  e.mira = miraAlMasCercano(p, punto.x, punto.z);
  e.cerebro = { modo: 'aparecer', desdeTic: p.k, repiensaEnTic: p.k + clase.aparicion.tics, nudo: -1, apuntaX: punto.x, apuntaZ: punto.z, balasPorSalir: 0 };
  contar(p, 0, { e: 'nace', id: e.numero, clase: clase.id, x: aCentesimas(punto.x), z: aCentesimas(punto.z), r: e.mira });
}
