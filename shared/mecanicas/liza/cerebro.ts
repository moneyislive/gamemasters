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
 * Y SÓLO A QUIEN ESTÁ A SU ALCANCE (L10, `CerebroDeclarado.alcanceDeBlanco`): en una liza grande, sin él,
 * todo lo vivo cruzaba el mundo detrás del único que se alejaba. Quien se le va más allá deja de ser su
 * blanco en ese mismo tic (`blancoAlAlcance`). Lo que se queda lejos de todos lo recoge el olvido
 * (`olvidarLasEntidades`, en `encuentros.ts`).
 *
 * ═══ SIN NADIE A SU ALCANCE PERO ACOMPAÑADA, SE ACERCA ═══
 *
 * Entre el alcance y la distancia del olvido había una franja en la que una entidad no tenía blanco y
 * tampoco se olvidaba: la primera versión la dejaba donde estaba, y allí se quedaba PARA SIEMPRE mientras
 * alguien siguiera a esa distancia. Bastaba con rodear una manzana: el camino por las calles se aleja en
 * recta, a los 45,1 m soltaba al asiento y se quedaba en la esquina, a la vista y sin olvidarse, ocupando
 * su hueco de vivas y sin dejar vaciar el encuentro (lo midió la revisión de la entrega 1 con la ciudad de
 * verdad: 4 de 60 persecuciones, y en partida hasta diez paradas así, la peor 1.868 tics). Ahora la que no
 * tiene a nadie a su alcance pero está ACOMPAÑADA —algún asiento que valdría de blanco a la distancia del
 * olvido o menos— anda hacia el más cercano por el mismo camino que si lo persiguiera
 * (`acercarseSinBlanco`), sin hacerlo su blanco: ni cuenta como perseguidora, ni toma turno, ni apunta
 * hasta tenerlo a su alcance. Sola, se queda donde está y le corre el olvido. Así no queda estado sin
 * salida: con blanco, pelea; acompañada, se acerca; sola, se olvida. Sin olvido declarado no hay franja
 * que medir, y sin nadie a su alcance se queda donde está, como antes.
 *
 * ═══ SIN BASURA EN LO CALIENTE ═══
 *
 * El cerebro corre por cada entidad en cada tic. Los recuentos de turnos, las distancias del grafo y la
 * cola del recorrido en anchura viven en arrays del módulo que se rellenan ENTEROS antes de usarse:
 * ningún resultado depende de lo que quedara del tic anterior, y no se crea un array por pregunta.
 *
 * ═══ Y LO QUE SE GUARDA, SÓLO CUESTA MENOS ═══
 *
 * Con una ciudad (el diseño de la ciudad abierta, §5.4) hay dos memorias más, y las dos son funciones
 * puras del grafo guardadas por su identidad: el índice de los nudos por celdas y los campos de
 * distancias por meta. Ninguna cambia una respuesta —`verify:liza` juega la misma sala con y sin ellas
 * y compara tic a tic—; sólo dejan de repetir lo que ya se sabía.
 */
import { COSENO, DT_DEL_TIC, SENO } from '../andar';
import { por, UNO } from '../fijo';
import { seAndaEnRecta, unPaso } from '../mundo';
import type { AsientoEnCurso, EntidadEnCurso, PasoEnCurso } from './paso-en-curso';
import type { ModoDelCerebro } from './tipos-de-la-sala';
import { bloqueaElPaso, bloqueaLaAccion, contar, contarApuntado, dejarDeApuntar, enCurso, indicesDe, nuevoNumero, tirar } from './paso-en-curso';
import type { AccionDeclarada, ClaseDeEntidad, LizaDeclarada, ZonaDelMundo } from './declaracion';
import { alcanceDeBlancoDe, olvidoDelEncuentro } from './declaracion';
import {
  celdaDelIndice,
  CELDA_DEL_INDICE,
  CUENTAS_DE_LOS_INDICES,
  dentroDelRadio,
  desplazado,
  distanciaAlCuadrado,
  hayLineaDeVista,
  losIndicesDeLaLizaEstanActivos,
  rumboHacia,
  TOPE_DE_LA_LIZA,
  trayectoria,
} from './geometria';
import { aCentesimas, MOTIVO_DE_IRSE } from './protocolo';
import { compTics, dentroDelLimite, largo, ponerEstadoALaEntidad, sePuedeEstarEn } from './cuerpo';
import { anuncioDelAutor, asientoDe, entidadEnPie, lanzarAnuncio, rumboDeA } from './combate';
import { puestaDesde } from './paso-en-curso';
import { dispararBala } from './proyectiles';

/**
 * El interruptor y las cuentas de los índices de la Liza (`geometria.ts`), también desde aquí. Con `tsx`,
 * un guion que importa `geometria.ts` directamente puede tener OTRA copia del módulo que la que carga la
 * sala por dentro (lo que se importa desde un guion y lo que se pide desde `shared/` van por dos caminos),
 * y un interruptor puesto en la copia que nadie usa no apaga nada: la comparación con y sin índices saldría
 * igual porque serían los mismos. Lo que se re-exporta desde aquí es lo de la copia que usa el cerebro.
 */
export { cuentasDeLosIndices, usarLosIndicesDeLaLiza } from './geometria';

/* ─── LOS ARRAYS DEL MÓDULO (ver «sin basura en lo caliente») ─────────────── */

/** Unidades de cuerpo a cuerpo y de disparo concedidas contra cada asiento, anuncios contra él y perseguidores. */
let CUERPO_A_CUERPO = new Int32Array(16);
let DISPARO = new Int32Array(16);
let ANUNCIOS = new Int32Array(16);
let PERSIGUEN = new Int32Array(16);
/**
 * El camino más corto por el grafo: las distancias andadas (Q16.16) hasta la meta EN USO y el montículo
 * (nudo y clave). `DISTANCIA` apunta al campo de esa meta (ver «los campos por meta»), o a `DISTANCIA_SUELTA`
 * con los índices apagados, que es el Dijkstra entero de siempre en cada pregunta.
 */
let DISTANCIA: Float64Array = new Float64Array(0);
let DISTANCIA_SUELTA: Float64Array = new Float64Array(0);
let MONTON = new Int32Array(0);
let CLAVE = new Float64Array(0);
let TAM = 0;
/** Los nudos más cercanos a un punto, para buscar el primero que se vea. */
const CERCANOS = 6;
const NUDO_CERCANO = new Int32Array(CERCANOS);
const DISTANCIA_CERCANA = new Float64Array(CERCANOS);
/** Los de ésos que se ven desde donde está la entidad (`primerNudo`). */
const VISIBLES = new Int32Array(CERCANOS);
/** Cuántos de `NUDO_CERCANO` dejó la última pregunta de `nudoVisibleMasCercano` (menos de `CERCANOS` si hay pocos nudos). */
let HALLADOS = 0;

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
    cercaEnTic: p.k,
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
    dejarDeApuntar(p, e);
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
  let b = blancoAlAlcance(p, e, clase, e.blanco);
  if (k >= e.cerebro.repiensaEnTic || b === null) {
    pensar(p, e, clase);
    b = blancoAlAlcance(p, e, clase, e.blanco);
  }
  if (b === null) {
    /* Sin nadie a quien perseguir (el asiento cayó, espera volver o está ausente) también entra: ver «entrar primero». */
    const dentro = puntoParaEntrar(p, e.x, e.z);
    if (dentro === null) {
      /* Dentro y sin nadie a su alcance: si está acompañada, se acerca (ver la cabecera); si no, se queda. */
      const guia = acompananteMasCercano(p, e);
      if (guia !== null) acercarseSinBlanco(p, e, clase, guia);
      return 0;
    }
    /* En recta si se llega con los hombros; si no, por el grafo (y si el grafo no sabe, lo que se pueda en recta). */
    if (seLlega(p, e.x, e.z, dentro.x, dentro.z, clase.radio) && entrarSiEstaFuera(p, e, clase)) return 0;
    if (!entrarPorElGrafo(p, e, clase)) entrarSiEstaFuera(p, e, clase);
    return 0;
  }
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

/**
 * EL ASIENTO `n` COMO BLANCO DE `e`: válido (`blancoValido`) y a su ALCANCE DE BLANCO o menos en recta (L10;
 * con 0, sin tope, a cualquier distancia). Es LA pregunta por el blanco de una entidad —con ella elige
 * (`pensar`), lo mantiene en cada tic (`pensarUna`) y apunta (`apuntarYDisparar`)—, así que no queda un
 * camino por el que persiga, tome turno o apunte contra quien se le fue más allá: en el tic en que se va,
 * lo suelta. El que está justo a esa distancia todavía vale (`dentroDelRadio` es «o menos»).
 */
function blancoAlAlcance(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, n: number): AsientoEnCurso | null {
  const a = blancoValido(p, n);
  if (a === null) return null;
  const alcance = alcanceDeBlancoDe(clase.cerebro);
  return alcance === 0 || dentroDelRadio(a.x - e.x, a.z - e.z, alcance) ? a : null;
}

/**
 * EL ASIENTO QUE ACOMPAÑA A UNA ENTIDAD SIN BLANCO (ver «sin nadie a su alcance pero acompañada» en la
 * cabecera): de los que valdrían de blanco (`blancoValido`), el más cercano en recta a la distancia del olvido
 * del encuentro o menos; empate, el de número menor. `null` si el encuentro no declara olvido o no hay ninguno.
 *
 * Es la pregunta del olvido (`acompanada`, en `encuentros.ts`) con una diferencia a propósito: allí acompaña
 * también el caído —la pelea sigue donde cayó, y lo que está a su lado no se olvida—, pero hacia él no se anda,
 * como no se le persigue. Lo que tiene al lado sólo a un caído espera sin olvidarse, como esperaba antes.
 */
function acompananteMasCercano(p: PasoEnCurso, e: EntidadEnCurso): AsientoEnCurso | null {
  const en = p.declaracion.fase.encuentro;
  const olvido = en === null ? null : olvidoDelEncuentro(en);
  if (olvido === null) return null;
  let mejor: AsientoEnCurso | null = null;
  let mejorD = 0;
  for (const a of p.asientos) {
    if (blancoValido(p, a.numero) === null || !dentroDelRadio(a.x - e.x, a.z - e.z, olvido.distancia)) continue;
    const d = distanciaAlCuadrado(a.x - e.x, a.z - e.z);
    if (mejor === null || d < mejorD) {
      mejor = a;
      mejorD = d;
    }
  }
  return mejor;
}

/**
 * SE ACERCA A `a` SIN HACERLO SU BLANCO, acechando: por el mismo camino que si lo persiguiera (el de `moverse`,
 * sin banda ni turno, que aquí no hay), yendo al nudo del grafo que lleve y, al llegar, al siguiente; en recta
 * si lo ve (y, cerca, si llega con los hombros). El primer nudo se busca sólo cuando no lleva ninguno. En cuanto
 * `a` le queda a su alcance, `pensar` lo toma por blanco en ese mismo tic y sigue por el mismo camino. Dos
 * diferencias con perseguir: a qué nudo se va cuando ninguno ve al asiento (ver `metaParaAcercarse`), y que si
 * otra le tapa el paso al nudo, la pisa (ver `pasoAunqueLaTapeOtra`).
 */
function acercarseSinBlanco(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, a: AsientoEnCurso): void {
  if (e.cerebro.modo !== 'acechar') e.cerebro = { ...e.cerebro, modo: 'acechar' };
  const nudos = p.declaracion.mundo.grafo.nudos;
  let nudo = e.cerebro.nudo;
  if (nudo >= 0 && nudo < nudos.length) {
    const n = nudos[nudo] as { x: number; z: number };
    if (dentroDelRadio(n.x - e.x, n.z - e.z, LLEGADO)) nudo = siguienteHacia(p, nudo, metaParaAcercarse(p, a, clase.radio));
  } else if (clase.cerebro.sigueElGrafo && nudos.length > 0 && !enRecta(p, e, a, clase)) nudo = primerNudoHacia(p, e.x, e.z, metaParaAcercarse(p, a, clase.radio), clase.radio);
  else nudo = -1;
  if (nudo !== e.cerebro.nudo) e.cerebro = { ...e.cerebro, nudo };
  if (nudo >= 0) {
    const n = nudos[nudo] as { x: number; z: number };
    pasoAunqueLaTapeOtra(p, e, clase, n.x, n.z);
  } else haciaSuBlanco(p, e, clase, a);
}

/**
 * UN PASO HACIA `(tx, tz)` QUE ACERQUE AUNQUE OTRA LA TAPE: primero sin meterse en otra; si así ningún paso
 * acerca, pisándola, como la que entra en el límite (ver «entrar primero»); y si ni así, el de siempre. Lo
 * usa la que se acerca sin blanco: en la frontera del olvido, la que va delante y queda a más de su distancia
 * se para a esperar que la olviden, y la de detrás, acompañada por unos centímetros, se quedaba temblando
 * contra ella hasta que la olvidaban —130 tics, lo vio la vigilancia en una Llamada de El Quiebro con L10—.
 */
function pasoAunqueLaTapeOtra(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, tx: number, tz: number): void {
  if (elegirPaso(p, e, clase, tx, tz, false, true) && PASO.avanza) {
    aplicarPaso(e);
    return;
  }
  if (elegirPaso(p, e, clase, tx, tz, false, false) && PASO.avanza) {
    aplicarPaso(e);
    return;
  }
  if (elegirPaso(p, e, clase, tx, tz, false, true)) aplicarPaso(e);
}

/**
 * EL NUDO AL QUE SE VA PARA ACERCARSE A `a`: el que lo ve y llega hasta él andando (`nudoVisibleMasCercano`, el
 * de perseguir); y si ninguno de los más cercanos llega —un asiento detrás de una valla que se ve pero no se
 * cruza, o en un rincón sin grafo—, el más cercano a secas. Al perseguir, sin nudo que vea al blanco se va en
 * recta y se rodea lo que estorba de cerca; pero desde la franja del olvido la recta cruza manzanas enteras, y
 * la entidad temblaba entre su nudo y un paso contra la fachada, acompañada y sin llegar nunca a su alcance (lo
 * vio la vigilancia de la ciudad de juguete: 649 tics, con el asiento detrás de una valla de bolardos). Por el
 * más cercano llega por las calles hasta su lado, y ahí ya lo tiene a su alcance y lo persigue.
 */
function metaParaAcercarse(p: PasoEnCurso, a: AsientoEnCurso, radio: number): number {
  const meta = nudoVisibleMasCercano(p, a.x, a.z, radio);
  return meta >= 0 || HALLADOS === 0 ? meta : (NUDO_CERCANO[0] as number);
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
  const actual = blancoAlAlcance(p, e, clase, e.blanco);
  let minimo = -1;
  let elegido: AsientoEnCurso | null = null;
  let elegidoD = 0;
  for (const a of p.asientos) {
    if (blancoAlAlcance(p, e, clase, a.numero) === null) continue;
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
  if (enRecta(p, e, elegido, clase)) nudo = -1;
  else if (clase.cerebro.sigueElGrafo && p.declaracion.mundo.grafo.nudos.length > 0 && nudo < 0) nudo = primerNudo(p, e.x, e.z, elegido, clase.radio);
  e.cerebro = { ...e.cerebro, modo: modoDeLaBanda(e.cerebro.modo, elegido.x - e.x, elegido.z - e.z, clase), nudo, repiensaEnTic: p.k + clase.cerebro.decideCadaTics };
}

/** Cerca de su blanco, lo que decide si se va en recta es si se LLEGA con los hombros, no si se ve. */
const CERCA_PARA_ANDAR = 6 * UNO;

/**
 * ¿VA EN RECTA A SU BLANCO? Si lo ve; y, a menos de `CERCA_PARA_ANDAR`, si además llega andando con su
 * radio. Con sólo la línea de vista, un blanco pegado a la esquina de un pilar se «veía» por el filo y la
 * entidad temblaba contra el pilar con turno, a 1,8 m, sin rodearlo nunca (lo midió el banco con las
 * declaraciones de un juego). Lejos no se pregunta: recorrer el tramo entero es caro y, lejos, el
 * camino se vuelve a pensar al acercarse.
 */
function enRecta(p: PasoEnCurso, e: EntidadEnCurso, b: AsientoEnCurso, clase: ClaseDeEntidad): boolean {
  const cerca = dentroDelRadio(b.x - e.x, b.z - e.z, CERCA_PARA_ANDAR);
  return seLlega(p, e.x, e.z, b.x, b.z, cerca ? clase.radio : 0);
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
 * línea de vista —y, si se da un `radio`, al que un cuerpo de ese radio llega andando en recta
 * (`seAndaEnRecta`): la línea de vista es un segmento sin grosor, y un nudo que se ve rozando la esquina
 * de un pilar no se alcanza con los hombros—. −1 si ninguno. Los más cercanos se sacan de una pasada, sin
 * ordenar la lista entera (o, con un grafo de ciudad, por las celdas del índice de abajo: los mismos).
 */
function nudoVisibleMasCercano(p: PasoEnCurso, x: number, z: number, radio: number): number {
  const nudos = p.declaracion.mundo.grafo.nudos;
  const cuantos = losMasCercanos(nudos, x, z);
  HALLADOS = cuantos;
  for (let j = 0; j < cuantos; j++) {
    const i = NUDO_CERCANO[j] as number;
    const n = nudos[i] as { x: number; z: number };
    if (seLlega(p, x, z, n.x, n.z, radio)) return i;
  }
  return -1;
}

/**
 * LOS `CERCANOS` NUDOS MÁS CERCANOS A `(x, z)`, en `NUDO_CERCANO` (y sus distancias al cuadrado en
 * `DISTANCIA_CERCANA`), en orden de distancia y, a igual distancia, de índice. Devuelve cuántos (menos de
 * `CERCANOS` si el grafo tiene menos).
 */
function losMasCercanos(nudos: readonly { x: number; z: number }[], x: number, z: number): number {
  if (losIndicesDeLaLizaEstanActivos() && nudos.length >= NUDOS_PARA_INDEXAR) {
    const ix = indiceDeNudos(nudos);
    if (ix !== null) {
      CUENTAS_DE_LOS_INDICES.nudosPorCeldas++;
      return losMasCercanosPorCeldas(ix, nudos, x, z);
    }
  }
  return losMasCercanosEnLista(nudos, x, z);
}

/** Recorriendo la lista entera, en orden: lo de siempre, y lo que da el orden (distancia, índice) sin decirlo. */
function losMasCercanosEnLista(nudos: readonly { x: number; z: number }[], x: number, z: number): number {
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
  return cuantos;
}

/**
 * Para los comprobadores: los nudos más cercanos a `(x, z)`, en su orden, por donde vaya la sala (por
 * celdas o en lista, según `usarLosIndicesDeLaLiza`). Con los índices encendidos y apagados tienen que
 * salir los mismos.
 */
export function nudosMasCercanosParaProbar(nudos: readonly { x: number; z: number }[], x: number, z: number): number[] {
  const cuantos = losMasCercanos(nudos, x, z);
  const lista: number[] = [];
  for (let j = 0; j < cuantos; j++) lista.push(NUDO_CERCANO[j] as number);
  return lista;
}

/* ─── LOS NUDOS POR CELDAS (el diseño de la ciudad abierta, §5.4, punto 3) ───── *
 *
 * Con una ciudad son tres mil y pico nudos, y la pregunta de arriba los recorría todos varias veces por
 * decisión. Desde `NUDOS_PARA_INDEXAR` se apuntan en las celdas de 16 unidades de `geometria.ts` y se
 * recorren anillos de celdas alrededor de la del punto, hasta que el anillo siguiente queda MÁS LEJOS que
 * el `CERCANOS`-ésimo candidato: fuera del cuadrado ya mirado no hay nada más cerca que su borde.
 *
 * ═══ LOS MISMOS, EN EL MISMO ORDEN ═══
 *
 * El recorrido en lista se queda, sin decirlo, con el orden (distancia, índice): visita en orden de
 * índice y sólo desplaza a quien está ESTRICTAMENTE más lejos. Aquí los nudos no llegan en orden de índice,
 * así que el orden se hace explícito (`meterCercano`). Y el anillo que queda a la MISMA distancia que el
 * último candidato todavía se mira: un nudo justo en su raya, a esa distancia y con un índice menor, le
 * quitaría el sitio. Parar con `>=` en vez de `>` lo perdía (lo vio el banco de la medida, y ahora el
 * empate en la raya de `verify:liza`).
 *
 * Si algún nudo no es de enteros dentro de la liza, se queda en la lista, por la misma razón que las losas
 * (`geometria.ts`): allí lanza el primero en orden de índice.
 */
export const NUDOS_PARA_INDEXAR = 512;

interface IndiceDeNudos {
  readonly desdeX: number;
  readonly desdeZ: number;
  readonly ancho: number;
  readonly fondo: number;
  /** Los nudos de la celda `k` son `lista[inicio[k]] … lista[inicio[k + 1] − 1]`. */
  readonly inicio: Int32Array;
  readonly lista: Int32Array;
}

const INDICES_DE_NUDOS = new WeakMap<object, IndiceDeNudos | null>();

function indiceDeNudos(nudos: readonly { x: number; z: number }[]): IndiceDeNudos | null {
  const hecho = INDICES_DE_NUDOS.get(nudos);
  if (hecho !== undefined) return hecho;
  let desdeX = 0;
  let desdeZ = 0;
  let hastaX = -1;
  let hastaZ = -1;
  for (let i = 0; i < nudos.length; i++) {
    const n = nudos[i] as { x: number; z: number };
    if (!Number.isInteger(n.x) || !Number.isInteger(n.z) || n.x > TOPE_DE_LA_LIZA || n.x < -TOPE_DE_LA_LIZA || n.z > TOPE_DE_LA_LIZA || n.z < -TOPE_DE_LA_LIZA) {
      INDICES_DE_NUDOS.set(nudos, null);
      return null;
    }
    const cx = celdaDelIndice(n.x);
    const cz = celdaDelIndice(n.z);
    if (i === 0 || cx < desdeX) desdeX = cx;
    if (i === 0 || cz < desdeZ) desdeZ = cz;
    if (i === 0 || cx > hastaX) hastaX = cx;
    if (i === 0 || cz > hastaZ) hastaZ = cz;
  }
  const ancho = hastaX - desdeX + 1;
  const fondo = hastaZ - desdeZ + 1;
  const inicio = new Int32Array(ancho * fondo + 1);
  for (let i = 0; i < nudos.length; i++) {
    const n = nudos[i] as { x: number; z: number };
    const k = (celdaDelIndice(n.z) - desdeZ) * ancho + (celdaDelIndice(n.x) - desdeX);
    inicio[k + 1] = (inicio[k + 1] as number) + 1;
  }
  for (let k = 0; k < ancho * fondo; k++) inicio[k + 1] = (inicio[k + 1] as number) + (inicio[k] as number);
  const puesto = inicio.slice(0, ancho * fondo);
  const lista = new Int32Array(nudos.length);
  for (let i = 0; i < nudos.length; i++) {
    const n = nudos[i] as { x: number; z: number };
    const k = (celdaDelIndice(n.z) - desdeZ) * ancho + (celdaDelIndice(n.x) - desdeX);
    lista[puesto[k] as number] = i;
    puesto[k] = (puesto[k] as number) + 1;
  }
  const indice: IndiceDeNudos = { desdeX, desdeZ, ancho, fondo, inicio, lista };
  INDICES_DE_NUDOS.set(nudos, indice);
  CUENTAS_DE_LOS_INDICES.indicesDeNudos++;
  return indice;
}

/** Mete el nudo `i`, a distancia (al cuadrado) `d`, entre los `cuantos` que hay, con el orden (distancia, índice). */
function meterCercano(i: number, d: number, cuantos: number): number {
  if (cuantos === CERCANOS) {
    const ud = DISTANCIA_CERCANA[CERCANOS - 1] as number;
    if (d > ud || (d === ud && i > (NUDO_CERCANO[CERCANOS - 1] as number))) return cuantos;
  }
  let j = cuantos < CERCANOS ? cuantos : CERCANOS - 1;
  while (j > 0) {
    const dj = DISTANCIA_CERCANA[j - 1] as number;
    if (!(dj > d || (dj === d && (NUDO_CERCANO[j - 1] as number) > i))) break;
    DISTANCIA_CERCANA[j] = dj;
    NUDO_CERCANO[j] = NUDO_CERCANO[j - 1] as number;
    j--;
  }
  DISTANCIA_CERCANA[j] = d;
  NUDO_CERCANO[j] = i;
  return cuantos < CERCANOS ? cuantos + 1 : cuantos;
}

function mirarLaCelda(ix: IndiceDeNudos, nudos: readonly { x: number; z: number }[], cx: number, cz: number, x: number, z: number, cuantos: number): number {
  if (cx < 0 || cz < 0 || cx >= ix.ancho || cz >= ix.fondo) return cuantos;
  const k = cz * ix.ancho + cx;
  const hasta = ix.inicio[k + 1] as number;
  let c = cuantos;
  for (let j = ix.inicio[k] as number; j < hasta; j++) {
    const i = ix.lista[j] as number;
    const n = nudos[i] as { x: number; z: number };
    c = meterCercano(i, distanciaAlCuadrado(n.x - x, n.z - z), c);
  }
  return c;
}

function losMasCercanosPorCeldas(ix: IndiceDeNudos, nudos: readonly { x: number; z: number }[], x: number, z: number): number {
  const cx = celdaDelIndice(x) - ix.desdeX;
  const cz = celdaDelIndice(z) - ix.desdeZ;
  /* El anillo más lejano que todavía toca la rejilla. */
  const hasta = Math.max(Math.abs(cx), Math.abs(ix.ancho - 1 - cx), Math.abs(cz), Math.abs(ix.fondo - 1 - cz));
  let cuantos = mirarLaCelda(ix, nudos, cx, cz, x, z, 0);
  for (let r = 1; r <= hasta; r++) {
    if (cuantos === CERCANOS) {
      /* Lo más cerca que puede estar un nudo del anillo `r`: el borde del cuadrado de los anillos ya mirados. */
      const x0 = (cx - r + 1 + ix.desdeX) * CELDA_DEL_INDICE;
      const x1 = (cx + r + ix.desdeX) * CELDA_DEL_INDICE;
      const z0 = (cz - r + 1 + ix.desdeZ) * CELDA_DEL_INDICE;
      const z1 = (cz + r + ix.desdeZ) * CELDA_DEL_INDICE;
      const hueco = Math.min(x - x0, x1 - x, z - z0, z1 - z);
      if (hueco * hueco > (DISTANCIA_CERCANA[CERCANOS - 1] as number)) break;
    }
    for (let dx = -r; dx <= r; dx++) {
      cuantos = mirarLaCelda(ix, nudos, cx + dx, cz - r, x, z, cuantos);
      cuantos = mirarLaCelda(ix, nudos, cx + dx, cz + r, x, z, cuantos);
    }
    for (let dz = -r + 1; dz <= r - 1; dz++) {
      cuantos = mirarLaCelda(ix, nudos, cx - r, cz + dz, x, z, cuantos);
      cuantos = mirarLaCelda(ix, nudos, cx + r, cz + dz, x, z, cuantos);
    }
  }
  return cuantos;
}

/** Un punto reutilizable para `seAndaEnRecta`, que pide objetos `{x, z}`: sin crear uno por pregunta. */
const DESDE = { x: 0, z: 0 };
const HASTA = { x: 0, z: 0 };

/** ¿Se ve (radio 0), o se llega andando en recta con ese radio, de `(x0, z0)` a `(x1, z1)`? */
function seLlega(p: PasoEnCurso, x0: number, z0: number, x1: number, z1: number, radio: number): boolean {
  if (!hayLineaDeVista(p.arena.cuerpos, x0, z0, x1, z1)) return false;
  if (radio <= 0) return true;
  DESDE.x = x0;
  DESDE.z = z0;
  HASTA.x = x1;
  HASTA.z = z1;
  return seAndaEnRecta(p.arena, DESDE, HASTA, radio);
}

/**
 * LAS DISTANCIAS POR EL GRAFO HASTA EL NUDO `meta`, andadas y no en saltos, en `DISTANCIA` (Q16.16; −1 =
 * no se llega). Dijkstra con un montículo binario de arrays del módulo, con orden total (distancia, y
 * a igual distancia el índice menor): el mismo recorrido en cualquier motor.
 *
 * ═══ POR QUÉ ANDADAS Y NO EN SALTOS ═══
 *
 * La primera versión contaba saltos (un recorrido en anchura). Con un grafo de verdad —los cruces de las
 * calles delante, unidos por tramos de 48 m, y una rejilla fina detrás— un tramo de calle vale UN salto
 * y cruzar la plaza por la rejilla, doce: las entidades que salían por una boca de calle se iban por la
 * calle hasta la esquina en vez de entrar en la plaza, y se pasaban seis o diez segundos fuera del límite
 * de la fase caminando por su borde (lo midió el banco con las declaraciones de un juego, punto 4 del
 * encargo del frente). Andado, el camino corto es el corto.
 *
 * ═══ LOS CAMPOS POR META (el diseño de la ciudad abierta, §5.4, punto 4) ═══
 *
 * El Dijkstra recorría el grafo ENTERO en cada decisión de cada entidad: con una ciudad, tres mil y pico
 * nudos cada vez. Ahora el campo de cada meta se guarda —`CAMPOS_POR_GRAFO` por grafo, y sale el que
 * lleva más tiempo sin usarse— y se hace sólo hasta `COTA_DEL_CAMPO`: el mismo algoritmo con el mismo
 * orden, parado cuando lo que sale del montículo pasa de la cota. Lo que queda dentro es EXACTAMENTE lo
 * del Dijkstra entero, porque todo lo de dentro sale del montículo antes que nada de fuera y un camino
 * que sale de la cota ya es más largo que ella. Quien lee un nudo de fuera (`falta`) hace que ese campo
 * se complete entero: sigue su montículo donde lo dejó si nadie lo ha tocado desde entonces, y si no, lo
 * rehace de cero, que es el Dijkstra de siempre. Ni un paso cambia: sólo se deja de calcular lo que nadie
 * lee, y lo que ya se calculó no se repite. Un campo depende sólo del grafo y de la meta, así que se
 * guarda por la IDENTIDAD del grafo (un `WeakMap`): la sala lo comparte entre sus declaraciones, que
 * llevan el mismo mundo mientras dura la partida.
 */
function distanciasHasta(p: PasoEnCurso, meta: number): void {
  const grafo = p.declaracion.mundo.grafo;
  const cuantos = grafo.nudos.length;
  if (!losIndicesDeLaLizaEstanActivos()) {
    if (DISTANCIA_SUELTA.length < cuantos) DISTANCIA_SUELTA = new Float64Array(cuantos);
    DISTANCIA = DISTANCIA_SUELTA;
    CAMPO.de = null;
    CAMPO.cota = Number.POSITIVE_INFINITY;
    dijkstra(p, meta, Number.POSITIVE_INFINITY);
    return;
  }
  let c = CAMPOS.get(grafo);
  if (c === undefined) {
    c = { metas: new Int32Array(CAMPOS_POR_GRAFO).fill(-1), cotas: new Float64Array(CAMPOS_POR_GRAFO), usos: new Float64Array(CAMPOS_POR_GRAFO), campos: [], uso: 0 };
    for (let k = 0; k < CAMPOS_POR_GRAFO; k++) c.campos.push(new Float64Array(0));
    CAMPOS.set(grafo, c);
  }
  c.uso++;
  CAMPO.de = c;
  CAMPO.meta = meta;
  for (let k = 0; k < CAMPOS_POR_GRAFO; k++) {
    if (c.metas[k] !== meta) continue;
    c.usos[k] = c.uso;
    CAMPO.ranura = k;
    CAMPO.cota = c.cotas[k] as number;
    DISTANCIA = c.campos[k] as Float64Array;
    CUENTAS_DE_LOS_INDICES.camposReusados++;
    return;
  }
  let k = 0;
  for (let j = 1; j < CAMPOS_POR_GRAFO; j++) if ((c.usos[j] as number) < (c.usos[k] as number)) k = j;
  if ((c.campos[k] as Float64Array).length < cuantos) c.campos[k] = new Float64Array(cuantos);
  c.metas[k] = meta;
  c.cotas[k] = COTA_DEL_CAMPO;
  c.usos[k] = c.uso;
  CAMPO.ranura = k;
  CAMPO.cota = COTA_DEL_CAMPO;
  DISTANCIA = c.campos[k] as Float64Array;
  CUENTAS_DE_LOS_INDICES.camposAcotados++;
  dijkstra(p, meta, COTA_DEL_CAMPO);
}

/**
 * Para los comprobadores: lo que falta ANDANDO desde cada nudo de `leer` hasta `meta` por el grafo de `d`
 * (−1: no se llega), preguntado como lo pregunta la sala —el campo guardado y completado si hace falta, o
 * el Dijkstra entero con los índices apagados—, en el orden de `leer`. Tienen que salir iguales.
 */
export function faltaPorElGrafoParaProbar(d: LizaDeclarada, meta: number, leer: readonly number[]): number[] {
  const p = { declaracion: d, indices: indicesDe(d) } as unknown as PasoEnCurso;
  distanciasHasta(p, meta);
  const salida: number[] = [];
  for (const v of leer) salida.push(falta(p, v));
  return salida;
}

/** Hasta dónde se hace un campo antes de que alguien pida más: 160 unidades andadas. */
const COTA_DEL_CAMPO = 160 * UNO;
/** Cuántos campos se guardan por grafo: los metas de una sala llena cambian una vez por segundo o así. */
const CAMPOS_POR_GRAFO = 8;

interface CamposDelGrafo {
  /** La meta de cada ranura (−1 = libre), hasta dónde está hecho su campo, y cuándo se usó por última vez. */
  readonly metas: Int32Array;
  readonly cotas: Float64Array;
  readonly usos: Float64Array;
  readonly campos: Float64Array[];
  uso: number;
}

const CAMPOS = new WeakMap<object, CamposDelGrafo>();

/** El campo en uso: de qué grafo (`null` con los índices apagados), en qué ranura, de qué meta y hasta dónde está hecho. */
const CAMPO: { de: CamposDelGrafo | null; ranura: number; meta: number; cota: number } = { de: null, ranura: 0, meta: -1, cota: 0 };

/** El campo cuyo Dijkstra dejó el montículo como está: sólo ése puede seguirlo (ver `falta`). */
let DUENO_DEL_MONTON: Float64Array | null = null;

/**
 * LO QUE FALTA ANDANDO del nudo `v` a la meta en uso (−1: no se llega). Si el campo no llega a `v`
 * (más allá de su cota, o sin tocar), se completa entero antes de contestar: ver «los campos por meta».
 */
function falta(p: PasoEnCurso, v: number): number {
  const d = DISTANCIA[v] as number;
  if (CAMPO.cota === Number.POSITIVE_INFINITY || (d >= 0 && d <= CAMPO.cota)) return d;
  const c = CAMPO.de as CamposDelGrafo;
  c.cotas[CAMPO.ranura] = Number.POSITIVE_INFINITY;
  CAMPO.cota = Number.POSITIVE_INFINITY;
  if (DUENO_DEL_MONTON === DISTANCIA) {
    CUENTAS_DE_LOS_INDICES.camposSeguidos++;
    recorrerElMonton(p, Number.POSITIVE_INFINITY);
  } else {
    CUENTAS_DE_LOS_INDICES.camposRehechos++;
    dijkstra(p, CAMPO.meta, Number.POSITIVE_INFINITY);
  }
  return DISTANCIA[v] as number;
}

/** El Dijkstra hasta `meta` en `DISTANCIA`, de cero, parado al pasar de `cota` (ver `distanciasHasta`). */
function dijkstra(p: PasoEnCurso, meta: number, cota: number): void {
  const cuantos = p.declaracion.mundo.grafo.nudos.length;
  const aristas = p.indices.inicio[cuantos] as number;
  if (MONTON.length < aristas + cuantos + 1) {
    MONTON = new Int32Array(aristas + cuantos + 1);
    CLAVE = new Float64Array(aristas + cuantos + 1);
  }
  DISTANCIA.fill(-1, 0, cuantos);
  TAM = 0;
  DISTANCIA[meta] = 0;
  meterEnElMonton(meta, 0);
  DUENO_DEL_MONTON = DISTANCIA;
  recorrerElMonton(p, cota);
}

/**
 * Saca del montículo hasta vaciarlo o hasta que lo siguiente pase de `cota` (que se queda dentro: así el
 * mismo montículo se puede seguir más tarde, y seguirlo da lo mismo que no haberlo parado).
 */
function recorrerElMonton(p: PasoEnCurso, cota: number): void {
  const nudos = p.declaracion.mundo.grafo.nudos;
  const inicio = p.indices.inicio;
  const vecinos = p.indices.vecinos;
  while (TAM > 0) {
    const u = MONTON[0] as number;
    const du = CLAVE[0] as number;
    if (du > cota) return;
    TAM--;
    if (TAM > 0) {
      MONTON[0] = MONTON[TAM] as number;
      CLAVE[0] = CLAVE[TAM] as number;
      let i = 0;
      for (;;) {
        const iz = 2 * i + 1;
        const de = iz + 1;
        let m = i;
        if (iz < TAM && antes(iz, m)) m = iz;
        if (de < TAM && antes(de, m)) m = de;
        if (m === i) break;
        cambiar(i, m);
        i = m;
      }
    }
    if (du > (DISTANCIA[u] as number)) continue;
    const nu = nudos[u] as { x: number; z: number };
    for (let j = inicio[u] as number; j < (inicio[u + 1] as number); j++) {
      const v = vecinos[j] as number;
      const nv = nudos[v] as { x: number; z: number };
      const dv = du + largo(nv.x - nu.x, nv.z - nu.z);
      const ya = DISTANCIA[v] as number;
      if (ya >= 0 && ya <= dv) continue;
      DISTANCIA[v] = dv;
      meterEnElMonton(v, dv);
    }
  }
}

/** Mete `nudo` con la clave `d` en el montículo y lo sube a su sitio. */
function meterEnElMonton(nudo: number, d: number): void {
  let i = TAM++;
  MONTON[i] = nudo;
  CLAVE[i] = d;
  while (i > 0) {
    const padre = (i - 1) >> 1;
    if (!antes(i, padre)) break;
    cambiar(i, padre);
    i = padre;
  }
}

/** En el montículo, ¿va la posición `i` antes que la `j`? Distancia, y a igual distancia el nudo menor. */
function antes(i: number, j: number): boolean {
  const a = CLAVE[i] as number;
  const b = CLAVE[j] as number;
  return a < b || (a === b && (MONTON[i] as number) < (MONTON[j] as number));
}

function cambiar(i: number, j: number): void {
  const n = MONTON[i] as number;
  const d = CLAVE[i] as number;
  MONTON[i] = MONTON[j] as number;
  CLAVE[i] = CLAVE[j] as number;
  MONTON[j] = n;
  CLAVE[j] = d;
}

/**
 * EL SIGUIENTE NUDO desde `desde` hacia el asiento `b`: el vecino por el que se llega antes, ANDANDO, al
 * nudo que ve a `b` (ver `distanciasHasta`). −1 si `desde` ya es ese nudo o no hay camino: entonces en
 * recta.
 */
function siguienteNudo(p: PasoEnCurso, desde: number, b: AsientoEnCurso, radio: number): number {
  return siguienteHacia(p, desde, nudoVisibleMasCercano(p, b.x, b.z, radio));
}

/** El siguiente nudo desde `desde` hacia el nudo `meta`, andando (ver `siguienteNudo`). −1 si ya está o no hay camino. */
function siguienteHacia(p: PasoEnCurso, desde: number, meta: number): number {
  if (meta < 0 || meta === desde) return -1;
  distanciasHasta(p, meta);
  const nudos = p.declaracion.mundo.grafo.nudos;
  const inicio = p.indices.inicio;
  const vecinos = p.indices.vecinos;
  const nd = nudos[desde] as { x: number; z: number };
  let mejor = -1;
  let mejorD = -1;
  for (let j = inicio[desde] as number; j < (inicio[desde + 1] as number); j++) {
    const v = vecinos[j] as number;
    const queda = falta(p, v);
    if (queda < 0) continue;
    const nv = nudos[v] as { x: number; z: number };
    const d = queda + largo(nv.x - nd.x, nv.z - nd.z);
    if (mejor < 0 || d < mejorD || (d === mejorD && v < mejor)) {
      mejor = v;
      mejorD = d;
    }
  }
  return mejor;
}

/**
 * EL PRIMER NUDO desde donde está la entidad hacia `b`: de los `CERCANOS` nudos más cercanos que VE, el
 * que deja menos camino ANDADO hasta el nudo que ve a `b`, contando lo que hay hasta él. El más cercano
 * a secas podía estar detrás, y el camino empezaba dando la vuelta. −1 si no ve ninguno.
 */
function primerNudo(p: PasoEnCurso, x: number, z: number, b: AsientoEnCurso, radio: number): number {
  return primerNudoHacia(p, x, z, nudoVisibleMasCercano(p, b.x, b.z, radio), radio);
}

/**
 * El primer nudo desde `(x, z)` hacia el nudo `meta` (ver `primerNudo`). Si no llega a ninguno de los más
 * cercanos, el más cercano al que llega de los de `BUSQUEDA_DE_ESCAPE` (ver `nudoParaSalir`); −1 si ni así.
 */
function primerNudoHacia(p: PasoEnCurso, x: number, z: number, meta: number, radio: number): number {
  const desde = nudoVisibleMasCercano(p, x, z, radio);
  if (desde < 0) return nudoParaSalir(p, x, z, radio);
  if (meta < 0) return desde;
  const nudos = p.declaracion.mundo.grafo.nudos;
  /* `nudoVisibleMasCercano` deja en NUDO_CERCANO los más cercanos a (x, z): se copian antes de otra pregunta. */
  const hallados = HALLADOS;
  let cuantos = 0;
  for (let j = 0; j < hallados; j++) {
    const i = NUDO_CERCANO[j] as number;
    const n = nudos[i] as { x: number; z: number };
    if (!seLlega(p, x, z, n.x, n.z, radio)) continue;
    VISIBLES[cuantos++] = i;
  }
  distanciasHasta(p, meta);
  let mejor = desde;
  let mejorD = -1;
  for (let j = 0; j < cuantos; j++) {
    const i = VISIBLES[j] as number;
    const queda = falta(p, i);
    if (queda < 0) continue;
    const n = nudos[i] as { x: number; z: number };
    const d = queda + largo(n.x - x, n.z - z);
    if (mejorD < 0 || d < mejorD || (d === mejorD && i < mejor)) {
      mejor = i;
      mejorD = d;
    }
  }
  return mejor;
}

/**
 * ═══ EL BOLSILLO: CUANDO NO SE LLEGA A NINGÚN NUDO CERCANO ═══
 *
 * La primera versión, si no llegaba andando en recta a ninguno de los `CERCANOS` nudos más cercanos, se iba
 * en recta a su blanco, y contra lo que estorbaba temblaba para siempre. En la ciudad abierta pasa en un
 * bolsillo: la cabina de la Llamada está en la acera, con su poste, y un coche aparcado justo delante; lo
 * que sale de su zona queda entre el poste, el coche y la fachada, con los seis nudos más cercanos (los de
 * la calzada, a 3-13 m) tapados por el coche o por el poste. La salida existe —acera arriba, rodeando el
 * coche—, pero el primer nudo al que se llega en recta es el 21.º más cercano, a 29,5 m. Lo vio la
 * vigilancia de los NPC en las Llamadas de verdad de El Quiebro: Prestados clavados ahí 772 tics con su
 * blanco a 85-92 m (y, con L10, acercándose sin blanco, 780).
 *
 * Así que entonces se busca más lejos: de los nudos a `BUSQUEDA_DE_ESCAPE` o menos, en orden de distancia
 * (y a igual distancia, de índice), el primero al que se llega andando en recta con su radio. Es raro —sólo
 * cuando ninguno de los seis cercanos vale— y cuesta una pasada por los nudos más unas pocas rectas; lo que
 * sale se guarda como el nudo de la entidad, que va a él y desde él sigue por el grafo. −1 si no hay ninguno.
 */
const BUSQUEDA_DE_ESCAPE = 45 * UNO;
/** Los candidatos de `nudoParaSalir` y sus distancias al cuadrado (ver «sin basura en lo caliente»: crecen, no se crean). */
let ESCAPE = new Int32Array(64);
let DISTANCIA_DE_ESCAPE = new Float64Array(64);

function nudoParaSalir(p: PasoEnCurso, x: number, z: number, radio: number): number {
  const nudos = p.declaracion.mundo.grafo.nudos;
  let n = 0;
  for (let i = 0; i < nudos.length; i++) {
    const q = nudos[i] as { x: number; z: number };
    if (!dentroDelRadio(q.x - x, q.z - z, BUSQUEDA_DE_ESCAPE)) continue;
    if (n === ESCAPE.length) {
      const mas = new Int32Array(2 * n);
      mas.set(ESCAPE);
      ESCAPE = mas;
      const masD = new Float64Array(2 * n);
      masD.set(DISTANCIA_DE_ESCAPE);
      DISTANCIA_DE_ESCAPE = masD;
    }
    ESCAPE[n] = i;
    DISTANCIA_DE_ESCAPE[n] = distanciaAlCuadrado(q.x - x, q.z - z);
    n++;
  }
  /* En orden de (distancia, índice), probando cada uno al sacarlo: se para en el primero al que se llega. */
  for (let k = 0; k < n; k++) {
    let m = k;
    for (let j = k + 1; j < n; j++) {
      const dj = DISTANCIA_DE_ESCAPE[j] as number;
      const dm = DISTANCIA_DE_ESCAPE[m] as number;
      if (dj < dm || (dj === dm && (ESCAPE[j] as number) < (ESCAPE[m] as number))) m = j;
    }
    const i = ESCAPE[m] as number;
    const d = DISTANCIA_DE_ESCAPE[m] as number;
    ESCAPE[m] = ESCAPE[k] as number;
    DISTANCIA_DE_ESCAPE[m] = DISTANCIA_DE_ESCAPE[k] as number;
    ESCAPE[k] = i;
    DISTANCIA_DE_ESCAPE[k] = d;
    const q = nudos[i] as { x: number; z: number };
    if (seLlega(p, x, z, q.x, q.z, radio)) return i;
  }
  return -1;
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
 * «ALCANZA» ES SU ALCANCE MÁS SU AVANCE: el golpe acerca a quien lo lanza durante el anuncio (ver
 * `avanzarAlAtacar`), así que desde ahí ya llega. Con el alcance a secas, en cuanto dos se pegaban a un
 * asiento el tercero se quedaba a 1,3 m sin hueco para llegar al 1,1 y no atacaba nunca, con turno y
 * con el asiento quieto delante (lo midió el banco con las declaraciones de un juego).
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
    if (!dentroDelRadio(dx, dz, accion.alcance + accion.avance)) {
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
  contarApuntado(p, e, b.numero, 0);
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
 * Lo que dura el apuntado sale al cable (`apunta`, al empezar); si lo deja sin disparar, también.
 * Si el blanco entra en un estado de `excluyen` (su premio, sobre todo) lo deja: el turno se le dio antes,
 * pero «nunca a quien está en su premio» es también no seguir disparándole (y la cadena de un golpe
 * tampoco sigue: ver `seguirTrasElImpacto` en `combate.ts`). Lo que ya vuela, vuela.
 */
function apuntarYDisparar(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad): void {
  const k = p.k;
  const proyectil = p.indices.proyectiles[clase.proyectil];
  const b = blancoAlAlcance(p, e, clase, e.blanco);
  const blancoFijo = asientoDe(p, e.blanco);
  const dejarlo = blancoFijo !== null && excluido(p, blancoFijo);
  if (proyectil === undefined || (e.cerebro.modo === 'apuntar' && b === null) || dejarlo) {
    const aMedias = e.cerebro.modo === 'disparar';
    dejarDeApuntar(p, e);
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
  /* Quien está fuera del límite de la fase, primero entra (ver «entrar primero» abajo). */
  if (entrarSiEstaFuera(p, e, clase)) return;
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
      nudo = siguienteNudo(p, nudo, b, clase.radio);
      e.cerebro = { ...e.cerebro, nudo };
    }
  } else nudo = -1;
  if (nudo >= 0) {
    const n = nudos[nudo] as { x: number; z: number };
    darPaso(p, e, clase, n.x, n.z, false);
  } else haciaSuBlanco(p, e, clase, b);
}

/**
 * ═══ Y SI OTRA LE TAPA EL BLANCO, LO RODEA ═══
 *
 * Cerca de su blanco, con otra entidad pegada a él justo en medio (una que ataca, o un Celador caído), el
 * paso recto no acerca y los desvíos tampoco: la que llega detrás temblaba a 1,75 m, con turno y el
 * asiento quieto delante, hasta que la otra se iba (lo midió el banco). Así que, si ningún paso la acerca,
 * rodea: va a un punto a la misma distancia del blanco y unos 30° más allá, hacia un lado que cambia cada
 * dos segundos (el número de la entidad y el tic lo eligen: nada de azar que gastar), hasta que el paso
 * recto vuelve a acercar.
 */
function haciaSuBlanco(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, b: AsientoEnCurso): void {
  if (elegirPaso(p, e, clase, b.x, b.z, false, true) && PASO.avanza) {
    aplicarPaso(e);
    return;
  }
  const d = largo(b.x - e.x, b.z - e.z);
  if (d > 0 && d <= clase.cerebro.distanciaMaxima + 2 * UNO) {
    const lado = ((e.numero + Math.floor(p.k / 40)) & 1) === 0 ? RODEO : 256 - RODEO;
    const t = desplazado(b.x, b.z, (rumboDeA(b.x, b.z, e.x, e.z, 0) + lado) % 256, d);
    if (elegirPaso(p, e, clase, t.x, t.z, false, true) && PASO.avanza) {
      aplicarPaso(e);
      return;
    }
  }
  if (elegirPaso(p, e, clase, b.x, b.z, false, true)) aplicarPaso(e);
}

/** Lo que se desplaza el punto al que va quien rodea: 21 rumbos, unos 30°. */
const RODEO = 21;

/**
 * ═══ ENTRAR PRIMERO ═══
 *
 * Las entidades salen de zonas que pueden estar fuera del límite de la fase —las bocas de las calles que
 * dan a la plaza— y el límite no se cruza hacia fuera (ver `darPaso`). La primera versión las mandaba
 * derechas a su blanco o por el grafo, y el grafo de un juego de verdad tiene sus nudos de calle JUSTO en
 * el borde del límite: seguían la calle un centímetro por fuera durante seis o diez segundos sin entrar
 * nunca en la plaza (lo midió el banco con las declaraciones de ese juego). Así que quien está fuera va
 * primero al punto del límite más cercano, una unidad hacia dentro, con un paso que acerque de verdad; si
 * sólo se lo impide otra entidad —dos que bajan juntas por la calle, una por dentro y otra por fuera, la de
 * fuera no entraba en veinte metros—, la pisa; y si ni así, sigue su camino de siempre.
 *
 * Y ENTRA AUNQUE NO TENGA A QUIÉN PERSEGUIR. La segunda versión sólo entraba al moverse hacia su blanco,
 * y sin ninguno —el único asiento caído, esperando volver o ausente— las que nacían en ese rato se quedaban
 * donde nacían, fuera: la revisión del frente vio veinte más de cinco segundos en una calle, la peor
 * quince, hasta que el asiento reaparecía (`entrarSiEstaFuera`, desde `pensarUna`).
 *
 * El punto de dentro del límite más cercano a `(x, z)`, a una unidad del borde; `null` si ya está dentro
 * (o la fase no tiene límite).
 */
function puntoParaEntrar(p: PasoEnCurso, x: number, z: number): { x: number; z: number } | null {
  if (dentroDelLimite(p, x, z)) return null;
  const l = p.indices.limites[p.declaracion.fase.limite];
  if (l === undefined) return null;
  const c = l.caja;
  const margen = c.x1 - c.x0 > 2 * UNO && c.z1 - c.z0 > 2 * UNO ? UNO : 0;
  const cx = x < c.x0 + margen ? c.x0 + margen : x > c.x1 - margen ? c.x1 - margen : x;
  const cz = z < c.z0 + margen ? c.z0 + margen : z > c.z1 - margen ? c.z1 - margen : z;
  return { x: cx, z: cz };
}

/**
 * SIN BLANCO Y CON LA ESTRUCTURA EN MEDIO, ENTRA POR EL GRAFO: hacia el nudo de DENTRO del límite más
 * cercano, por el camino andado más corto (el nudo al que va se guarda en su cerebro, como cuando
 * persigue). Con blanco no hace falta: lo que la tapa lo rodea yendo a por él. Sin grafo, o sin nudos
 * dentro, se queda donde está: no hay por dónde. Lo vio la liza de juguete: la que nacía detrás de un muro
 * pegado al borde no entraba nunca con el paso directo, que no acercaba.
 */
function entrarPorElGrafo(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad): boolean {
  const nudos = p.declaracion.mundo.grafo.nudos;
  if (!clase.cerebro.sigueElGrafo || nudos.length === 0) return false;
  let meta = -1;
  let metaD = 0;
  for (let i = 0; i < nudos.length; i++) {
    const n = nudos[i] as { x: number; z: number };
    if (!dentroDelLimite(p, n.x, n.z)) continue;
    const d = distanciaAlCuadrado(n.x - e.x, n.z - e.z);
    if (meta < 0 || d < metaD) {
      meta = i;
      metaD = d;
    }
  }
  if (meta < 0) return false;
  let nudo = e.cerebro.nudo;
  if (nudo >= 0 && nudo < nudos.length) {
    const n = nudos[nudo] as { x: number; z: number };
    if (dentroDelRadio(n.x - e.x, n.z - e.z, LLEGADO)) nudo = siguienteHacia(p, nudo, meta);
  } else nudo = primerNudoHacia(p, e.x, e.z, meta, clase.radio);
  if (nudo !== e.cerebro.nudo) e.cerebro = { ...e.cerebro, nudo };
  if (nudo < 0) return false;
  const n = nudos[nudo] as { x: number; z: number };
  return darPaso(p, e, clase, n.x, n.z, false);
}

/** Si está fuera del límite, da un paso para entrar (ver «entrar primero»): `true` si lo dio. */
function entrarSiEstaFuera(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad): boolean {
  const dentro = puntoParaEntrar(p, e.x, e.z);
  if (dentro === null) return false;
  if (elegirPaso(p, e, clase, dentro.x, dentro.z, false, true) && PASO.avanza) {
    aplicarPaso(e);
    return true;
  }
  if (elegirPaso(p, e, clase, dentro.x, dentro.z, false, false) && PASO.avanza) {
    aplicarPaso(e);
    return true;
  }
  return false;
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
 *
 * ═══ UN PASO QUE NO ACERCA NO ES UN PASO ═══
 *
 * `unPaso` resbala contra la estructura: contra la esquina de un pilar, el paso recto devuelve un sitio
 * un palmo de lado que no acerca nada, y la primera versión se quedaba con el primer desvío que MOVÍA. Con
 * el blanco al otro lado del pilar, la entidad temblaba contra él cien tics con turno y a 1,8 m (lo midió
 * el banco con las declaraciones de un juego). Ahora se queda con el primer desvío que ACERCA (o aleja,
 * si se aparta) al menos un cuarto de paso —rodea la esquina—, y sólo si ninguno lo hace, con el primero
 * que mueve.
 */
function darPaso(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, tx: number, tz: number, alejarse: boolean): boolean {
  if (!elegirPaso(p, e, clase, tx, tz, alejarse, true)) return false;
  aplicarPaso(e);
  return true;
}

/** El paso elegido por `elegirPaso`: dónde, hacia qué rumbo, y si acerca (o aleja) de verdad. */
const PASO = { x: 0, z: 0, rumbo: 0, avanza: false };

/**
 * ELIGE EL PASO de `darPaso` sin darlo (en `PASO`): `false` si ningún desvío mueve. `contraOtras` a
 * `false` deja pisar a las demás entidades: sólo lo usa quien tiene que entrar en el límite (ver «entrar
 * primero»), que no puede quedarse fuera porque otra le vaya al lado por dentro.
 */
function elegirPaso(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, tx: number, tz: number, alejarse: boolean, contraOtras: boolean): boolean {
  const dx = tx - e.x;
  const dz = tz - e.z;
  if (dx === 0 && dz === 0) return false;
  let r0 = rumboHacia(dx, dz);
  if (alejarse) r0 = (r0 + 128) % 256;
  const dentro = dentroDelLimite(p, e.x, e.z);
  const antes = largo(dx, dz);
  const paso = por(clase.velocidad, DT_DEL_TIC);
  const cuarto = Math.floor(paso / 4) < Math.floor(antes / 4) ? Math.floor(paso / 4) : Math.floor(antes / 4);
  let hay = false;
  for (let i = 0; i < DESVIOS.length; i++) {
    const r = (r0 + (DESVIOS[i] as number)) % 256;
    const vx = por(clase.velocidad, SENO[r] as number);
    const vz = -por(clase.velocidad, COSENO[r] as number);
    const q = unPaso(p.arena, e, vx, vz, DT_DEL_TIC, clase.radio);
    if (q.x === e.x && q.z === e.z) continue;
    if ((dentro && !dentroDelLimite(p, q.x, q.z)) || (contraOtras && chocaConOtra(p, e, q.x, q.z, clase.radio))) continue;
    const despues = largo(tx - q.x, tz - q.z);
    const gana = alejarse ? despues - antes : antes - despues;
    if (gana >= cuarto) {
      PASO.x = q.x;
      PASO.z = q.z;
      PASO.rumbo = r;
      PASO.avanza = true;
      return true;
    }
    if (!hay) {
      hay = true;
      PASO.x = q.x;
      PASO.z = q.z;
      PASO.rumbo = r;
      PASO.avanza = false;
    }
  }
  return hay;
}

/** Da el paso que dejó `elegirPaso` en `PASO`. */
function aplicarPaso(e: EntidadEnCurso): void {
  e.x = PASO.x;
  e.z = PASO.z;
  e.marcha = 1;
  e.mira = PASO.rumbo;
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
