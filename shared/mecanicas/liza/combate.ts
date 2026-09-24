/**
 * EL COMBATE DE LA SALA: golpes anunciados, esquivas en ventana, guardias, empujones contra la
 * estructura, acciones sostenidas, caídas y reapariciones. Es una pieza de `sala.ts`.
 *
 * ═══ UN GOLPE, DE LA PULSACIÓN AL VEREDICTO ═══
 *
 *   1. SE LANZA. Un asiento lo pulsa (va dentro de su `aqui` con el `ms` de su aparato) o el cerebro de
 *      una entidad lo decide. Se ANUNCIA ya: un `anuncio` por destinatario con el instante del impacto
 *      en SU reloj, y para el blanco y el autor ese instante se GUARDA en el anuncio (`tBlanco`,
 *      `tAutor`): es el mismo número que se juzgará. El anuncio de una entidad contra un asiento se
 *      alarga en el `comp` del blanco si la liza lo pide (`alargarConLaRed`): la mala red no castiga.
 *   2. SE ESPERA. Contra un asiento, la sala no resuelve en el impacto sino en `impacto + comp` del
 *      blanco y un tic más (`TICS_DEL_AQUI`): es lo que puede tardar en llegar la esquiva que el aparato
 *      pulsó a tiempo —la red, y el tic en que el `aqui` que la lleva sale del aparato—, y el sitio que
 *      declaró para ese tic. Sin ese tic, que una esquiva pulsada a tiempo saliera limpia dependía de en
 *      qué punto de su tic estuviera el aparato (ver `TICS_DEL_AQUI`).
 *   3. SE JUZGA, en el orden de `EsquivaDeclarada` y sin otro: LEJOS (con el sitio que el blanco declaró
 *      para el tic del impacto, o el de justo antes de la esquiva que la ventana juzgaría: ver
 *      `ticDelAlcance`) → `fallada`; LA VENTANA en el reloj del aparato, salvo imparable →
 *      `limpia` o `esquivada`; EL INTOCABLE en el tic del impacto → `esquivada`; si no, DA. Contra una
 *      entidad no hay ventana: está su guardia de frente (`parada`), su esquiva al azar y su intocable.
 *   4. SE APLICA. El efecto empieza en el tic del IMPACTO, no en el de la resolución: el derribo que se
 *      resuelve un `comp` tarde dura lo mismo contado desde el golpe.
 *
 * ═══ QUIÉN ESTÁ FUERA DE COMBATE ═══
 *
 * Un golpe cuyo autor quedó fuera de combate antes del impacto sale `cortada`: el autor se fue, cayó, o
 * entró DESPUÉS de lanzarlo en un estado que bloquea sus acciones (un golpe recibido, su propia esquiva).
 * Esquivar en mitad de tu propio golpe lo corta; que te den en mitad del suyo, también. Es lo que hace
 * que pegar primero sirva de algo.
 *
 * ═══ LA CADENA, EN EL RELOJ DEL APARATO ═══
 *
 * Encadenar se juzga como la esquiva: la pulsación (`ms` del aparato) contra el impacto anterior en el
 * reloj del mismo aparato (`tAutor`, guardado en el eslabón). Una pulsación que llega ANTES del impacto
 * anterior —dentro de `antesMs`— se guarda y sale al resolverse ese impacto; el golpe encadenado empieza
 * donde acabó el anterior, nunca solapado.
 */
import { COSENO, SENO } from '../andar';
import { UNO } from '../fijo';
import type { AccionRecibida, AnuncioPendiente } from './tipos-de-la-sala';
import type {
  AccionDeclarada,
  ClaseDeEntidad,
  EfectoDeclarado,
  EngancheDeclarado,
  ReglasDeAsiento,
  ZonaDeAccionDeclarada,
} from './declaracion';
import { MS_POR_TIC } from './declaracion';
import { dentroDelCono, dentroDelRadio, desplazado, distanciaAlCuadrado, hayLineaDeVista, puntoDelTramo, rumboHacia, trayectoria } from './geometria';
import { aCentesimas, MOTIVO_DE_IRSE, PRIMER_NUMERO_DE_ENTIDAD, RESULTADO } from './protocolo';
import type { CodigoDeResultado } from './protocolo';
import {
  bloqueaLaAccion,
  contar,
  enCurso,
  ensuciarCuenta,
  estadoSinFin,
  intocableEn,
  msDelTic,
  PUEDE,
  puedeEmpezar,
  puestaDesde,
  SIN_FIN,
  TICS_DEL_AQUI,
  TIPO_DE_ACCION,
  TOPE_DE_ESQUIVAS_RECIENTES,
  tirar,
  ticsQueCubren,
} from './paso-en-curso';
import type { AsientoEnCurso, EntidadEnCurso, PasoEnCurso } from './paso-en-curso';
import {
  compTics,
  darExtra,
  largo,
  librar,
  ponerEstado,
  ponerEstadoALaEntidad,
  ponerPuesta,
  recolocar,
  recortadoAlLimite,
  sePuedeEstarEn,
  sitioDeNacer,
  sitioEnElTic,
  ticDeLaPulsacion,
} from './cuerpo';
import { cobrarAlSalir, dejarCaerLoQueLleva, soltarMonton, sumarMedidor, sumarPuntos } from './portables';

/**
 * El medio ancho del frente de una acción SIN enganche («sale hacia donde se mira»): 43 rumbos, 60°. Es
 * a quién le da un golpe que no nombra blanco: al más cercano de delante, al alcance.
 */
export const FRENTE_SIN_ENGANCHE = 43;

/* ─── LOS CUERPOS, POR NÚMERO ────────────────────────────────────────────── */

/** El asiento de número `n` (1-15), o `null`. */
export function asientoDe(p: PasoEnCurso, n: number): AsientoEnCurso | null {
  if (n < 1 || n > p.asientos.length) return null;
  return p.asientos[n - 1] as AsientoEnCurso;
}

/** La entidad de número `n` (aunque esté caída o deshecha), o `null`. */
export function entidadDe(p: PasoEnCurso, n: number): EntidadEnCurso | null {
  if (n < PRIMER_NUMERO_DE_ENTIDAD) return null;
  for (const e of p.entidades) if (e.numero === n) return e;
  return null;
}

/** ¿Está en pie: con vida, sin caer, sin absorber y sin deshacerse? (Apareciendo sí cuenta.) */
export function entidadEnPie(e: EntidadEnCurso): boolean {
  const m = e.cerebro.modo;
  return e.vida > 0 && m !== 'caida' && m !== 'absorber' && m !== 'deshecha';
}

/** El anuncio sin resolver que lanzó este cuerpo (no una repetición), o `null`. */
export function anuncioDelAutor(p: PasoEnCurso, n: number): AnuncioPendiente | null {
  for (const an of p.anuncios) if (an.de === n && !an.esRepeticion) return an;
  return null;
}

/* ─── LANZAR Y ANUNCIAR ──────────────────────────────────────────────────── */

function montarAnuncio(
  p: PasoEnCurso,
  id: number,
  de: number,
  x: number,
  z: number,
  accion: number,
  a: number,
  lanzadoEnTic: number,
  impactoEnTic: number,
  alRitmo: boolean,
  esRepeticion: boolean,
): AnuncioPendiente {
  const impactoMs = msDelTic(impactoEnTic);
  const blanco = asientoDe(p, a);
  const autor = asientoDe(p, de);
  return {
    id,
    de,
    a,
    accion,
    x,
    z,
    lanzadoEnTic,
    impactoEnTic,
    impactoMs,
    tBlanco: blanco === null ? null : impactoMs + blanco.red.desfaseMs,
    tAutor: autor === null ? null : impactoMs + autor.red.desfaseMs,
    alRitmo,
    esperaMs: blanco === null ? 0 : blanco.red.compMs,
    esRepeticion,
  };
}

/**
 * LANZA UN GOLPE: lo apunta como pendiente y, si ya salió (`lanzadoEnTic` ≤ ahora), lo anuncia. Un
 * golpe de entidad contra un asiento programa además su repetición sin autor si la liza la pide
 * (`TurnosDeclarados.repetirTrasTics`), que se anuncia cuando le toca salir.
 */
export function lanzarAnuncio(
  p: PasoEnCurso,
  de: number,
  x: number,
  z: number,
  accion: AccionDeclarada,
  a: number,
  alRitmo: boolean,
  lanzadoEnTic: number,
  masTics: number,
  esRepeticion: boolean,
): AnuncioPendiente {
  const tics = alRitmo && accion.cadena !== null ? accion.cadena.anuncioTicsAlRitmo : accion.anuncioTics;
  let impacto = lanzadoEnTic + tics + masTics;
  if (impacto <= p.k) impacto = p.k + 1;
  const an = montarAnuncio(p, p.siguienteAnuncio, de, x, z, accion.id, a, lanzadoEnTic, impacto, alRitmo, esRepeticion);
  p.siguienteAnuncio++;
  p.anuncios.push(an);
  if (lanzadoEnTic <= p.k) anunciar(p, an);
  const tras = p.declaracion.turnos.repetirTrasTics;
  if (!esRepeticion && tras > 0 && de >= PRIMER_NUMERO_DE_ENTIDAD && asientoDe(p, a) !== null) {
    p.anuncios.push(montarAnuncio(p, p.siguienteAnuncio, 0, x, z, accion.id, a, lanzadoEnTic + tras, impacto + tras, alRitmo, true));
    p.siguienteAnuncio++;
  }
  return an;
}

/** El instante del impacto de un anuncio en el reloj del asiento `s`: el guardado si es su blanco o su autor. */
export function instanteParaElAsiento(an: AnuncioPendiente, s: AsientoEnCurso): number {
  if (s.numero === an.a && an.tBlanco !== null) return an.tBlanco;
  if (s.numero === an.de && an.tAutor !== null) return an.tAutor;
  return an.impactoMs + s.red.desfaseMs;
}

/**
 * Un `anuncio` a cada canal abierto, con el instante en SU reloj. Menos a quien conectó en este paso y aún
 * no se ha puesto al día (`porPoner`): su puesta al día, que va detrás de las entradas, ya lleva cada
 * anuncio pendiente en su orden; anunciárselo aquí también se lo daba dos veces, y la primera antes de
 * saber en qué fase está.
 */
export function anunciar(p: PasoEnCurso, an: AnuncioPendiente): void {
  const x = aCentesimas(an.x);
  const z = aCentesimas(an.z);
  for (const s of p.asientos) {
    if (!s.conectado || p.porPoner.indexOf(s.numero) >= 0) continue;
    contar(p, s.numero, { e: 'anuncio', id: an.id, de: an.de, a: an.a, acc: an.accion, t: instanteParaElAsiento(an, s), x, z });
  }
}

/**
 * El tic en que la sala resuelve un anuncio: su impacto, más lo que espera la esquiva de su blanco si el
 * blanco es un asiento (ver la cabecera). Contra una entidad, o al aire, no hay pulsación que esperar: se
 * resuelve en el impacto.
 */
export function ticDeResolver(an: AnuncioPendiente): number {
  return an.tBlanco === null ? an.impactoEnTic : an.impactoEnTic + ticsQueCubren(an.esperaMs) + TICS_DEL_AQUI;
}

/**
 * LAS REPETICIONES QUE SALEN AHORA: se anuncian con el desfase y el `comp` del blanco de AHORA —cuando se
 * programaron aún no se había mandado nada, así que no hay número viejo que respetar—. La de un blanco que
 * ya no está en pie (cayó, salió, espera volver) no sale: no se anunció nunca, así que se quita sin más.
 * Contra quien está en su premio sí sale: es la gracia de la repetición, que obliga a esquivar dos veces.
 */
export function anunciarProgramados(p: PasoEnCurso): void {
  let i = 0;
  while (i < p.anuncios.length) {
    const an = p.anuncios[i] as AnuncioPendiente;
    if (!an.esRepeticion || an.lanzadoEnTic !== p.k) {
      i++;
      continue;
    }
    const blanco = asientoDe(p, an.a);
    if (blanco !== null && (!blanco.conCuerpo || blanco.vida <= 0)) {
      p.anuncios.splice(i, 1);
      continue;
    }
    const puesto: AnuncioPendiente =
      blanco === null ? an : { ...an, tBlanco: an.impactoMs + blanco.red.desfaseMs, esperaMs: blanco.red.compMs };
    p.anuncios[i] = puesto;
    anunciar(p, puesto);
    i++;
  }
}

/* ─── LO QUE PULSA UN ASIENTO ────────────────────────────────────────────── */

/**
 * LA ACCIÓN DE UN `aqui` (o su falta). Primero, la sostenida: el primer `aqui` sin ella —o con otra, o
 * con la misma y otro `ms`, que es otra pulsación— la suelta (ver `protocolo.ts`). Después, lo pulsado.
 */
export function atenderLaAccionDelAqui(p: PasoEnCurso, a: AsientoEnCurso, accion: AccionRecibida | null, desfaseMs: number): void {
  const s = a.sostenida;
  if (s !== null && (accion === null || accion.id !== s.accion || accion.msDelAparato !== s.msDelAparato)) soltarLaSostenida(p, a);
  if (accion === null || !a.conCuerpo || a.vida <= 0) return;
  const reglas = p.declaracion.asientos[a.numero - 1] as ReglasDeAsiento;
  const indices = p.indices.porAsiento[a.numero - 1];
  if (indices === undefined) return;
  const tipo = indices.tipo[accion.id];
  if (tipo === TIPO_DE_ACCION.esquiva) empezarEsquiva(p, a, reglas, accion, desfaseMs);
  else if (tipo === TIPO_DE_ACCION.golpe) {
    const golpe = indices.acciones[accion.id];
    if (golpe !== undefined) intentarGolpe(p, a, reglas, golpe, accion, desfaseMs, false);
  } else if (tipo === TIPO_DE_ACCION.rescate || tipo === TIPO_DE_ACCION.remate || tipo === TIPO_DE_ACCION.zona) {
    if (a.sostenida === null) empezarSostenida(p, a, reglas, tipo, accion);
  }
}

/**
 * LA ESQUIVA (declaración F). En un estado de `ruptura.desde` y con medidor, es la de RUPTURA: gasta, saca
 * del estado y protege con su intocable, sin pasar por la ventana. Si no, la normal: la `cada`-ésima en
 * menos de `enTics` sale TORPE —desplaza igual y no esquiva— y todas se apuntan con su pulsación en ms
 * del aparato, que es contra lo que se juzga la ventana. El estado empieza en el tic de la PULSACIÓN.
 *
 * ═══ EN UN ESTADO QUE NO BLOQUEA, SE ESQUIVA SIN SALIR DE ÉL ═══
 *
 * `EstadoDeclarado.bloqueaAccion` lo dice: un estado que no bloquea deja empezar cualquier acción y NO se
 * termina por ello. La esquiva también es una acción. Así que en el premio de una limpia (el Remanso de
 * un juego) o en el intocable de quien reaparece, la esquiva se apunta —cuenta para la ventana, para la
 * torpe y para las `primeras`— y desplaza —su distancia extra se admite—, pero el cuerpo SIGUE en su
 * estado, con su intocable y lo que se pueda hacer en él. La primera versión ponía el estado de la
 * esquiva encima: quebrar dentro del Remanso lo acababa y se perdían su intocable y la Réplica (lo midió el
 * revisor del frente). Un estado que bloquea, en cambio, se termina al esquivar: es lo que dice su
 * `cancelaCon` o su `soltableDesdeTic`, y lo decide `puedeEmpezar`.
 */
function empezarEsquiva(p: PasoEnCurso, a: AsientoEnCurso, reglas: ReglasDeAsiento, accion: AccionRecibida, desfaseMs: number): void {
  const es = reglas.esquiva;
  const enTic = ticDeLaPulsacion(p, a, accion.msDelAparato, desfaseMs);
  const activo = enCurso(a.estado, p.k);
  if (activo !== null && es.ruptura.desde.indexOf(activo.estado) >= 0) {
    if (a.medidor < es.ruptura.coste) return;
    a.medidor -= es.ruptura.coste;
    ensuciarCuenta(p, a.numero);
    ponerPuesta(p, a, es.ruptura.puesta, enTic, 0);
    return;
  }
  const puede = puedeEmpezar(p.indices, a.estado, es.accion, p.k);
  if (puede === PUEDE.no) return;
  let recientes = 0;
  for (const h of a.esquivasRecientes) if (h.enTic > enTic - es.torpe.enTics) recientes++;
  const torpe = es.torpe.cada > 0 && recientes + 1 >= es.torpe.cada;
  const viejas = a.esquivasRecientes;
  const nuevas = viejas.length >= TOPE_DE_ESQUIVAS_RECIENTES ? viejas.slice(viejas.length - TOPE_DE_ESQUIVAS_RECIENTES + 1) : viejas.slice();
  nuevas.push({ enTic, msDelAparato: accion.msDelAparato, torpe });
  a.esquivasRecientes = nuevas;
  a.contadores.esquivas++;
  /* Ver la cabecera: en un estado que no bloquea (y que no es otra esquiva), se sigue en él. */
  if (puede === PUEDE.libre && activo !== null && activo.estado !== es.puesta.estado) darExtra(a, es.puesta.distanciaExtra, enTic + es.puesta.tics);
  else ponerPuesta(p, a, es.puesta, enTic, 0);
}

/** Guarda una pulsación para reintentarla hasta el tic `hastaTic` (ver `CuerpoDeclarado.guardaTics`). */
function guardar(a: AsientoEnCurso, accion: AccionRecibida, desfaseMs: number, hastaTic: number): void {
  a.guardada = { accion, desfaseMs, hastaTic };
}

function enRecarga(a: AsientoEnCurso, accion: number, k: number): boolean {
  for (const r of a.recargas) if (r.accion === accion && r.hastaTic > k) return true;
  return false;
}

function dentroDeLaCadena(delta: number, antesMs: number, despuesMs: number): boolean {
  return delta >= -antesMs && delta <= despuesMs;
}

/**
 * INTENTA LANZAR UN GOLPE DE ASIENTO. Devuelve `true` si la pulsación ya no tiene que esperar más (se
 * lanzó o no vale), `false` si queda guardada. Ver la cabecera para la cadena.
 */
export function intentarGolpe(
  p: PasoEnCurso,
  a: AsientoEnCurso,
  reglas: ReglasDeAsiento,
  golpe: AccionDeclarada,
  pulsacion: AccionRecibida,
  desfaseMs: number,
  reintento: boolean,
): boolean {
  if (!a.conCuerpo || a.vida <= 0) return true;
  const k = p.k;
  const pendiente = anuncioDelAutor(p, a.numero);
  if (pendiente !== null) {
    /* A media anuncio sólo vale encadenar: se guarda hasta que el impacto se resuelva. */
    const c = golpe.cadena;
    if (c !== null && c.tras.indexOf(pendiente.accion) >= 0 && pendiente.tAutor !== null) {
      if (dentroDeLaCadena(pulsacion.msDelAparato - pendiente.tAutor, c.antesMs, c.despuesMs)) {
        guardar(a, pulsacion, desfaseMs, ticDeResolver(pendiente) + reglas.cuerpo.guardaTics + 1);
        return false;
      }
    }
    return true;
  }
  if (golpe.soloEn.length > 0) {
    const activo = enCurso(a.estado, k);
    if (activo === null || golpe.soloEn.indexOf(activo.estado) < 0) return true;
  }
  if (enRecarga(a, golpe.id, k)) return true;
  let alRitmo = false;
  let desdeElAnterior = -1;
  const c = golpe.cadena;
  if (c !== null) {
    const eslabon = a.cadena;
    if (eslabon === null || c.tras.indexOf(eslabon.accion) < 0 || (c.soloSiDio && !eslabon.dio)) return true;
    const delta = pulsacion.msDelAparato - eslabon.impactoEnSuReloj;
    if (!dentroDeLaCadena(delta, c.antesMs, c.despuesMs)) return true;
    alRitmo = c.ritmoMs > 0 && delta >= -c.ritmoMs && delta <= c.ritmoMs;
    desdeElAnterior = Math.floor((eslabon.impactoEnSuReloj - a.red.desfaseMs) / MS_POR_TIC);
  } else if (k < a.recuperaHastaTic) {
    if (!reintento && reglas.cuerpo.guardaTics > 0) guardar(a, pulsacion, desfaseMs, k + reglas.cuerpo.guardaTics);
    return reintento ? false : reglas.cuerpo.guardaTics <= 0;
  }
  const puede = puedeEmpezar(p.indices, a.estado, golpe.id, k);
  if (puede === PUEDE.no) {
    if (!reintento && reglas.cuerpo.guardaTics > 0) guardar(a, pulsacion, desfaseMs, k + reglas.cuerpo.guardaTics);
    return reintento ? false : reglas.cuerpo.guardaTics <= 0;
  }
  if (puede === PUEDE.corta) librar(p, a);
  const blanco = golpe.enganche === null ? 0 : aceptarBlanco(p, a, golpe.enganche, pulsacion.blanco);
  let lanzado = ticDeLaPulsacion(p, a, pulsacion.msDelAparato, desfaseMs);
  if (desdeElAnterior > lanzado) lanzado = desdeElAnterior > k ? k : desdeElAnterior;
  if (c === null) a.cadena = null;
  const an = lanzarAnuncio(p, a.numero, a.x, a.z, golpe, blanco, alRitmo, lanzado, 0, false);
  if (golpe.recargaTics > 0) {
    const recargas = a.recargas.filter(sigueRecargando(k));
    recargas.push({ accion: golpe.id, hastaTic: lanzado + golpe.recargaTics });
    a.recargas = recargas;
  }
  darExtra(a, golpe.avance, an.impactoEnTic);
  a.guardada = null;
  return true;
}

/** El filtro de las recargas vivas (fuera de todo bucle: nada de cierres sobre su variable). */
function sigueRecargando(k: number): (r: { readonly accion: number; readonly hastaTic: number }) => boolean {
  return (r) => r.hastaTic > k;
}

/**
 * EL BLANCO QUE MANDÓ EL APARATO, SI LA SALA LO ACEPTA: una entidad en pie a `radio + holgura` o menos y
 * con línea de vista (prueba de losa). Si no, 0: el golpe sale igual, al aire, y fallará —es lo que el
 * aparato ya está pintando—.
 */
function aceptarBlanco(p: PasoEnCurso, a: AsientoEnCurso, enganche: EngancheDeclarado, n: number): number {
  const e = entidadDe(p, n);
  if (e === null || !entidadEnPie(e)) return 0;
  if (!dentroDelRadio(e.x - a.x, e.z - a.z, enganche.radio + enganche.holgura)) return 0;
  if (!hayLineaDeVista(p.arena.cuerpos, a.x, a.z, e.x, e.z)) return 0;
  return n;
}

/** Las pulsaciones guardadas, otra vez (tras resolver los impactos de este tic: la cadena ya tiene eslabón). */
export function reintentarGuardadas(p: PasoEnCurso): void {
  for (const a of p.asientos) {
    const g = a.guardada;
    if (g === null) continue;
    if (!a.conCuerpo || a.vida <= 0 || p.k > g.hastaTic) {
      a.guardada = null;
      continue;
    }
    const reglas = p.declaracion.asientos[a.numero - 1] as ReglasDeAsiento;
    const golpe = p.indices.porAsiento[a.numero - 1]?.acciones[g.accion.id];
    if (golpe === undefined) {
      a.guardada = null;
      continue;
    }
    if (intentarGolpe(p, a, reglas, golpe, g.accion, g.desfaseMs, true)) a.guardada = null;
  }
}

/**
 * EL FINAL DEL VUELO de una esquiva limpia contra una bala: la sala lanza sola la acción de
 * `contraProyectil` contra el tirador, sin mirar recargas ni `soloEn` (la lanza ella, no se pulsa).
 */
export function lanzarAcometidas(p: PasoEnCurso): void {
  for (const a of p.asientos) {
    const ac = a.acometida;
    if (ac === null || p.k < ac.enTic) continue;
    a.acometida = null;
    if (!a.conCuerpo || a.vida <= 0) continue;
    const reglas = p.declaracion.asientos[a.numero - 1] as ReglasDeAsiento;
    const golpe = p.indices.porAsiento[a.numero - 1]?.acciones[reglas.esquiva.contraProyectil.accion];
    if (golpe === undefined) continue;
    const e = entidadDe(p, ac.blanco);
    a.cadena = null;
    lanzarAnuncio(p, a.numero, a.x, a.z, golpe, e !== null && entidadEnPie(e) ? e.numero : 0, false, p.k, 0, false);
  }
}

/* ─── LAS ACCIONES SOSTENIDAS: REMATAR, RESCATAR, USAR LA ZONA ───────────── */

/** La zona de acción del encuentro, si la hay. */
function zonaDeAccion(p: PasoEnCurso): ZonaDeAccionDeclarada | null {
  const en = p.declaracion.fase.encuentro;
  return en !== null && en.fin.tipo === 'salida' ? en.fin.zona : null;
}

/** El centro de una zona del mundo, en Q16.16. */
export function centroDeLaZona(p: PasoEnCurso, id: number): { x: number; z: number } | null {
  const z = p.indices.zonas[id];
  if (z === undefined) return null;
  return { x: Math.floor((z.caja.x0 + z.caja.x1) / 2), z: Math.floor((z.caja.z0 + z.caja.z1) / 2) };
}

/** El estado en que se está mientras el asiento `n` sostiene la acción `accion` (0 si no se sabe). */
function estadoDeLaSostenida(p: PasoEnCurso, n: number, accion: number): number {
  const reglas = p.declaracion.asientos[n - 1];
  const tipo = p.indices.porAsiento[n - 1]?.tipo[accion] ?? 0;
  if (reglas === undefined) return 0;
  if (tipo === TIPO_DE_ACCION.rescate) return reglas.rescate.puesta.estado;
  if (tipo === TIPO_DE_ACCION.zona) return zonaDeAccion(p)?.puesta.estado ?? 0;
  if (tipo === TIPO_DE_ACCION.remate) {
    for (const c of p.declaracion.clases) if (c.alCaer.tipo === 'rematable' && c.alCaer.remate.accion === accion) return c.alCaer.remate.puesta.estado;
  }
  return 0;
}

function empezarSostenida(p: PasoEnCurso, a: AsientoEnCurso, reglas: ReglasDeAsiento, tipo: number, accion: AccionRecibida): void {
  const puede = puedeEmpezar(p.indices, a.estado, accion.id, p.k);
  if (puede === PUEDE.no) return;
  if (anuncioDelAutor(p, a.numero) !== null) return;
  if (tipo === TIPO_DE_ACCION.rescate) {
    const b = asientoDe(p, accion.blanco);
    if (b === null || b === a || !b.conCuerpo || b.vida > 0) return;
    if (!dentroDelRadio(b.x - a.x, b.z - a.z, reglas.rescate.radio)) return;
    if (puede === PUEDE.corta) librar(p, a);
    a.sostenida = { accion: accion.id, blanco: b.numero, desdeTic: p.k, msDelAparato: accion.msDelAparato };
    ponerPuesta(p, a, reglas.rescate.puesta, p.k, 0);
    return;
  }
  if (tipo === TIPO_DE_ACCION.remate) {
    const e = entidadDe(p, accion.blanco);
    if (e === null || e.cerebro.modo !== 'caida') return;
    const clase = p.indices.clases[e.clase];
    if (clase === undefined || clase.alCaer.tipo !== 'rematable' || clase.alCaer.remate.accion !== accion.id) return;
    if (!dentroDelRadio(e.x - a.x, e.z - a.z, clase.alCaer.remate.radio)) return;
    if (puede === PUEDE.corta) librar(p, a);
    a.sostenida = { accion: accion.id, blanco: e.numero, desdeTic: p.k, msDelAparato: accion.msDelAparato };
    ponerPuesta(p, a, clase.alCaer.remate.puesta, p.k, 0);
    return;
  }
  const zona = zonaDeAccion(p);
  const activa = p.encuentro === null ? null : p.encuentro.zona;
  if (zona === null || activa === null) return;
  const centro = centroDeLaZona(p, activa.zona);
  if (centro === null || !dentroDelRadio(centro.x - a.x, centro.z - a.z, zona.radio)) return;
  if (puede === PUEDE.corta) librar(p, a);
  a.sostenida = { accion: accion.id, blanco: 0, desdeTic: -1, msDelAparato: accion.msDelAparato };
  entrarEnLaZona(p, a, zona);
}

/** Si cabe, entra en la zona («de `capacidad` en `capacidad`»): empieza a contar y se pone en su estado. */
function entrarEnLaZona(p: PasoEnCurso, a: AsientoEnCurso, zona: ZonaDeAccionDeclarada): void {
  const en = p.encuentro;
  const s = a.sostenida;
  if (en === null || en.zona === null || s === null || s.desdeTic >= 0) return;
  if (en.zona.usando.length >= zona.capacidad) return;
  const usando = en.zona.usando.slice();
  usando.push(a.numero);
  p.encuentro = { ...en, zona: { ...en.zona, usando } };
  a.sostenida = { ...s, desdeTic: p.k };
  ponerPuesta(p, a, zona.puesta, p.k, 0);
}

/** Suelta lo que sostiene: sale de la zona si estaba y deja el estado de sostener. */
export function soltarLaSostenida(p: PasoEnCurso, a: AsientoEnCurso): void {
  const s = a.sostenida;
  if (s === null) return;
  a.sostenida = null;
  const en = p.encuentro;
  if (en !== null && en.zona !== null && en.zona.usando.indexOf(a.numero) >= 0) {
    const usando: number[] = [];
    for (const n of en.zona.usando) if (n !== a.numero) usando.push(n);
    p.encuentro = { ...en, zona: { ...en.zona, usando } };
  }
  const activo = enCurso(a.estado, p.k);
  if (activo !== null && activo.estado === estadoDeLaSostenida(p, a.numero, s.accion)) ponerEstado(p, a, null);
}

/**
 * LAS SOSTENIDAS DE CADA TIC: se sigue cumpliendo lo que hacía falta (el blanco sigue ahí y a tiro, la
 * zona sigue encendida) o se suelta; y la que llega a sus tics se completa. Quien espera turno en la
 * zona entra en cuanto hay sitio, en orden de número.
 */
export function avanzarSostenidas(p: PasoEnCurso): void {
  for (const a of p.asientos) {
    const s = a.sostenida;
    if (s === null) continue;
    if (!a.conCuerpo || a.vida <= 0) {
      soltarLaSostenida(p, a);
      continue;
    }
    const reglas = p.declaracion.asientos[a.numero - 1] as ReglasDeAsiento;
    const tipo = p.indices.porAsiento[a.numero - 1]?.tipo[s.accion] ?? 0;
    if (tipo === TIPO_DE_ACCION.rescate) {
      const b = asientoDe(p, s.blanco);
      if (b === null || !b.conCuerpo || b.vida > 0 || !dentroDelRadio(b.x - a.x, b.z - a.z, reglas.rescate.radio)) soltarLaSostenida(p, a);
      else if (p.k - s.desdeTic >= reglas.rescate.mantenerTics) completarRescate(p, a, reglas, b);
    } else if (tipo === TIPO_DE_ACCION.remate) {
      const e = entidadDe(p, s.blanco);
      const clase = e === null ? undefined : p.indices.clases[e.clase];
      if (e === null || clase === undefined || clase.alCaer.tipo !== 'rematable' || e.cerebro.modo !== 'caida') soltarLaSostenida(p, a);
      else if (!dentroDelRadio(e.x - a.x, e.z - a.z, clase.alCaer.remate.radio)) soltarLaSostenida(p, a);
      else if (p.k - s.desdeTic >= clase.alCaer.remate.mantenerTics) completarRemate(p, a, reglas, e, clase);
    } else if (tipo === TIPO_DE_ACCION.zona) {
      const zona = zonaDeAccion(p);
      const activa = p.encuentro === null ? null : p.encuentro.zona;
      const centro = activa === null ? null : centroDeLaZona(p, activa.zona);
      if (zona === null || activa === null || centro === null || !dentroDelRadio(centro.x - a.x, centro.z - a.z, zona.radio)) {
        soltarLaSostenida(p, a);
        continue;
      }
      if (s.desdeTic < 0) entrarEnLaZona(p, a, zona);
      else if (p.k - s.desdeTic >= zona.mantenerTics) salirPorLaZona(p, a, reglas, activa.zona);
    } else soltarLaSostenida(p, a);
  }
}

function completarRescate(p: PasoEnCurso, a: AsientoEnCurso, reglas: ReglasDeAsiento, b: AsientoEnCurso): void {
  const reglasB = p.declaracion.asientos[b.numero - 1] as ReglasDeAsiento;
  a.sostenida = null;
  librar(p, a);
  const vida = reglas.rescate.vidaAlVolver;
  b.vida = vida > reglasB.cuerpo.vidaTope ? reglasB.cuerpo.vidaTope : vida;
  ponerEstado(p, b, null);
  ensuciarCuenta(p, b.numero);
  sumarMedidor(p, a, reglas, reglas.rescate.medidorAmbos);
  sumarMedidor(p, b, reglasB, reglas.rescate.medidorAmbos);
  a.contadores.rescates++;
  sumarPuntos(p, a, reglas, reglas.puntos.porRescate);
}

function completarRemate(p: PasoEnCurso, a: AsientoEnCurso, reglas: ReglasDeAsiento, e: EntidadEnCurso, clase: ClaseDeEntidad): void {
  if (clase.alCaer.tipo !== 'rematable') return;
  a.sostenida = null;
  librar(p, a);
  contar(p, 0, { e: 'seva', id: e.numero, por: MOTIVO_DE_IRSE.rematada, quien: a.numero });
  quitarEntidad(p, e.numero);
  soltarMonton(p, clase.alCaer.suelta.portable, clase.alCaer.suelta.n, e.x, e.z);
  const vida = a.vida + reglas.cuerpo.vidaAlRematar;
  a.vida = vida > reglas.cuerpo.vidaTope ? reglas.cuerpo.vidaTope : vida;
  ensuciarCuenta(p, a.numero);
  sumarMedidor(p, a, reglas, reglas.medidor.porRemate);
  sumarPuntos(p, a, reglas, reglas.puntos.porRemate);
  a.contadores.rematadas++;
}

/** SALE POR LA ZONA: cobra lo que lleva y su premio, se queda sin cuerpo y cuenta como salido. */
function salirPorLaZona(p: PasoEnCurso, a: AsientoEnCurso, reglas: ReglasDeAsiento, zona: number): void {
  soltarLaSostenida(p, a);
  cobrarAlSalir(p, a, reglas);
  sumarPuntos(p, a, reglas, reglas.puntos.porSalir);
  a.contadores.salio = 1;
  a.conCuerpo = false;
  a.guardada = null;
  a.acometida = null;
  ponerEstado(p, a, estadoSinFin(p.declaracion.sinCuerpo.estado, p.k));
  contar(p, 0, { e: 'sale', a: a.numero, zona });
  ensuciarCuenta(p, a.numero);
}

/** Quita una entidad de la sala (el suceso que lo dice lo pone quien la quita). */
export function quitarEntidad(p: PasoEnCurso, n: number): void {
  for (let i = 0; i < p.entidades.length; i++) {
    if ((p.entidades[i] as EntidadEnCurso).numero === n) {
      p.entidades.splice(i, 1);
      return;
    }
  }
}

/* ─── EL JUICIO ──────────────────────────────────────────────────────────── */

/**
 * LA VENTANA (paso 2 del juicio), en el reloj del aparato del blanco: de sus esquivas recientes que no
 * salieron torpes, la de mejor resultado para el instante `t`. `t − pulsación` en `[0, ventana]` es
 * limpia; en `(ventana, hasta]`, esquivada. Las `primeras` de la fase usan su ventana: el índice de cada
 * esquiva en la fase se saca de su sitio en la lista, que va en orden y se recorta por el principio.
 * Devuelve 0 si ninguna esquiva decide.
 */
export function juzgarLaVentana(a: AsientoEnCurso, reglas: ReglasDeAsiento, t: number): number {
  return laVentana(a, reglas, t, false);
}

/**
 * La ventana, y si `tic` es verdadero, EL TIC EN QUE EMPEZÓ la esquiva que decide (−1 si ninguna), en vez
 * del resultado. Una sola vuelta para las dos preguntas: no pueden discrepar sobre qué esquiva decide.
 */
function laVentana(a: AsientoEnCurso, reglas: ReglasDeAsiento, t: number, tic: boolean): number {
  const es = reglas.esquiva;
  const lista = a.esquivasRecientes;
  let mejor = 0;
  let mejorTic = -1;
  for (let j = 0; j < lista.length; j++) {
    const h = lista[j];
    if (h === undefined || h.torpe) continue;
    const indice = a.contadores.esquivas - (lista.length - 1 - j);
    const ventana = indice <= es.primeras.cuantas ? es.primeras.ventanaMs : es.ventanaMs;
    const hasta = es.esquivaHastaMs > ventana ? es.esquivaHastaMs : ventana;
    const d = t - h.msDelAparato;
    if (d >= 0 && d <= ventana) return tic ? h.enTic : RESULTADO.limpia;
    if (d > ventana && d <= hasta) {
      mejor = RESULTADO.esquivada;
      mejorTic = h.enTic;
    }
  }
  return tic ? mejorTic : mejor;
}

/**
 * EL TIC CON QUE SE MIRA SI UN GOLPE ALCANZA (paso 1 del juicio de un anuncio).
 *
 * ═══ LEJOS ES «NO TE IBA A DAR», NO «TU ESQUIVA YA TE HABÍA APARTADO» ═══
 *
 * La esquiva DESPLAZA (una declarada puede llevarte 3,5 m en seis tics) y la ventana premia pulsarla ANTES del
 * impacto. Si el alcance se mirara con el sitio del tic del impacto, quien esquiva pronto —dentro de su
 * ventana— ya estaría fuera de alcance y saldría `fallada` en vez de `limpia`: la ventana limpia se
 * encogería a lo que tarda la esquiva en sacarte del alcance, y eso depende de la holgura y no del
 * reloj. Así que, si hay una esquiva que la ventana juzgaría, el alcance se mira con el sitio de JUSTO
 * ANTES de empezarla; si no, con el del tic del impacto. Quien se alejó andando sigue saliendo `fallada`.
 * Las balas no: su contrato dice «su sitio declarado para ese tic», y una bala esquivada de lejos pasa
 * de largo (ver `proyectiles.ts`).
 */
function ticDelAlcance(a: AsientoEnCurso, reglas: ReglasDeAsiento, an: AnuncioPendiente, imparable: boolean): number {
  if (imparable) return an.impactoEnTic;
  const empezo = laVentana(a, reglas, an.tBlanco ?? an.impactoMs + a.red.desfaseMs, true);
  if (empezo < 0) return an.impactoEnTic;
  return empezo - 1 < an.impactoEnTic ? empezo - 1 : an.impactoEnTic;
}

/** Los anuncios cuyo impacto ya pasó y cuya espera ya venció, resueltos en orden de lanzamiento. */
export function resolverAnuncios(p: PasoEnCurso): void {
  let i = 0;
  while (i < p.anuncios.length) {
    const an = p.anuncios[i] as AnuncioPendiente;
    if (an.lanzadoEnTic > p.k || p.k < ticDeResolver(an)) {
      i++;
      continue;
    }
    p.anuncios.splice(i, 1);
    resolver(p, an);
  }
}

/** La acción de un anuncio: la del asiento o la clase que la lanzó; la de una repetición, en las clases. */
function accionDelAnuncio(p: PasoEnCurso, an: AnuncioPendiente): AccionDeclarada | undefined {
  if (an.de >= 1 && an.de <= p.asientos.length) return p.indices.porAsiento[an.de - 1]?.acciones[an.accion];
  const autor = entidadDe(p, an.de);
  if (autor !== null) return p.indices.porClase[autor.clase]?.acciones[an.accion];
  for (const c of p.declaracion.clases) {
    const a = p.indices.porClase[c.id]?.acciones[an.accion];
    if (a !== undefined) return a;
  }
  return undefined;
}

function resolver(p: PasoEnCurso, an: AnuncioPendiente): void {
  const accion = accionDelAnuncio(p, an);
  if (accion === undefined) {
    contar(p, 0, { e: 'resuelve', id: an.id, r: RESULTADO.cortada, dano: 0, vida: 0 });
    return;
  }
  if (asientoDe(p, an.a) !== null) resolverContraAsiento(p, an, accion);
  else resolverDelAsiento(p, an, accion);
}

/** ¿Sigue pudiendo golpear la entidad que lanzó en `lanzado`? (Ver «quién está fuera de combate».) */
function entidadPuedeGolpear(p: PasoEnCurso, e: EntidadEnCurso | null, lanzado: number): boolean {
  if (e === null || !entidadEnPie(e)) return false;
  const activo = enCurso(e.estado, p.k);
  return !(activo !== null && bloqueaLaAccion(p.indices, activo, p.k) && activo.desdeTic > lanzado);
}

function asientoPuedeGolpear(p: PasoEnCurso, a: AsientoEnCurso, lanzado: number): boolean {
  if (!a.conCuerpo || a.vida <= 0) return false;
  const activo = enCurso(a.estado, p.k);
  return !(activo !== null && bloqueaLaAccion(p.indices, activo, p.k) && activo.desdeTic > lanzado);
}

/** UN GOLPE CONTRA UN ASIENTO: el juicio de la cabecera, en su orden. */
function resolverContraAsiento(p: PasoEnCurso, an: AnuncioPendiente, accion: AccionDeclarada): void {
  const b = asientoDe(p, an.a) as AsientoEnCurso;
  const autor = an.de >= PRIMER_NUMERO_DE_ENTIDAD ? entidadDe(p, an.de) : null;
  const reglasB = p.declaracion.asientos[b.numero - 1] as ReglasDeAsiento;
  if (!an.esRepeticion && an.de >= PRIMER_NUMERO_DE_ENTIDAD && !entidadPuedeGolpear(p, autor, an.lanzadoEnTic)) {
    contar(p, 0, { e: 'resuelve', id: an.id, r: RESULTADO.cortada, dano: 0, vida: b.vida });
    if (autor !== null) terminarElAtaque(p, autor, accion, an.impactoEnTic);
    return;
  }
  let r: number = RESULTADO.da;
  let ax = an.x;
  let az = an.z;
  if (!an.esRepeticion && autor !== null) {
    ax = autor.x;
    az = autor.z;
  }
  let bx = b.x;
  let bz = b.z;
  if (!b.conCuerpo || b.vida <= 0) r = RESULTADO.fallada;
  else {
    const sitio = sitioEnElTic(b, ticDelAlcance(b, reglasB, an, accion.imparable));
    if (sitio !== null) {
      bx = sitio.x;
      bz = sitio.z;
    }
    if (!dentroDelRadio(bx - ax, bz - az, accion.alcance + accion.holgura)) r = RESULTADO.fallada;
    else {
      const ventana = accion.imparable ? 0 : juzgarLaVentana(b, reglasB, an.tBlanco ?? an.impactoMs + b.red.desfaseMs);
      if (ventana !== 0) r = ventana;
      else if (intocableEn(b.estado, an.impactoEnTic)) r = RESULTADO.esquivada;
    }
  }
  const deEntidad = an.esRepeticion || an.de >= PRIMER_NUMERO_DE_ENTIDAD;
  if (deEntidad && (r === RESULTADO.da || r === RESULTADO.limpia || r === RESULTADO.esquivada)) b.contadores.amenazas++;
  if (r === RESULTADO.da) {
    golpearAsiento(p, b, reglasB, accion.efecto, an.alRitmo, an.de, ax, az, -1, an.impactoEnTic, an.id, 0);
  } else {
    contar(p, 0, { e: 'resuelve', id: an.id, r: r as CodigoDeResultado, dano: 0, vida: b.vida });
    if (r === RESULTADO.limpia) {
      premiarLimpia(p, b, reglasB, an.impactoEnTic);
      if (!an.esRepeticion && autor !== null) ponerEstadoALaEntidad(p, autor, puestaDesde(reglasB.esquiva.alAcertar.alAutor, an.impactoEnTic, 0));
    }
  }
  if (!an.esRepeticion && autor !== null) seguirTrasElImpacto(p, autor, an, accion, r === RESULTADO.da);
}

/**
 * EL PREMIO DE UNA ESQUIVA LIMPIA: su estado (el Remanso de un juego), medidor, puntos con el
 * multiplicador de antes, y el multiplicador sube un paso (hasta su tope) con la serie.
 */
export function premiarLimpia(p: PasoEnCurso, a: AsientoEnCurso, reglas: ReglasDeAsiento, desde: number): void {
  a.contadores.limpias++;
  a.contadores.serie++;
  if (a.contadores.serie > a.contadores.serieMaxima) a.contadores.serieMaxima = a.contadores.serie;
  sumarPuntos(p, a, reglas, reglas.puntos.porLimpia);
  const mult = a.multiplicador + reglas.puntos.multiplicador.paso;
  a.multiplicador = mult > reglas.puntos.multiplicador.tope ? reglas.puntos.multiplicador.tope : mult;
  sumarMedidor(p, a, reglas, reglas.medidor.porLimpia);
  ensuciarCuenta(p, a.numero);
  ponerPuesta(p, a, reglas.esquiva.alAcertar.puesta, desde, 0);
}

/** El mejor blanco de delante para un golpe sin enganche: el más cercano al alcance (empate, número menor). */
function blancoDeDelante(p: PasoEnCurso, a: AsientoEnCurso, accion: AccionDeclarada): EntidadEnCurso | null {
  let mejor: EntidadEnCurso | null = null;
  let mejorD = 0;
  const alcance = accion.alcance + accion.holgura;
  for (const e of p.entidades) {
    if (!entidadEnPie(e)) continue;
    const dx = e.x - a.x;
    const dz = e.z - a.z;
    if (!dentroDelRadio(dx, dz, alcance) || !dentroDelCono(a.mira, dx, dz, FRENTE_SIN_ENGANCHE)) continue;
    const d = distanciaAlCuadrado(dx, dz);
    if (mejor === null || d < mejorD || (d === mejorD && e.numero < mejor.numero)) {
      mejor = e;
      mejorD = d;
    }
  }
  return mejor;
}

/** UN GOLPE DE UN ASIENTO: contra su blanco, o contra el de delante si no lleva enganche. */
function resolverDelAsiento(p: PasoEnCurso, an: AnuncioPendiente, accion: AccionDeclarada): void {
  const a = asientoDe(p, an.de);
  if (a === null) {
    contar(p, 0, { e: 'resuelve', id: an.id, r: RESULTADO.cortada, dano: 0, vida: 0 });
    return;
  }
  const reglas = p.declaracion.asientos[a.numero - 1] as ReglasDeAsiento;
  const eslabon = (dio: boolean) => ({ accion: an.accion, impactoEnSuReloj: an.tAutor ?? an.impactoMs + a.red.desfaseMs, dio });
  if (!asientoPuedeGolpear(p, a, an.lanzadoEnTic)) {
    contar(p, 0, { e: 'resuelve', id: an.id, r: RESULTADO.cortada, dano: 0, vida: 0 });
    a.cadena = eslabon(false);
    return;
  }
  let e: EntidadEnCurso | null = null;
  if (an.a >= PRIMER_NUMERO_DE_ENTIDAD) e = entidadDe(p, an.a);
  else if (accion.enganche === null) e = blancoDeDelante(p, a, accion);
  const clase = e === null ? undefined : p.indices.clases[e.clase];
  let r: number = RESULTADO.da;
  if (e === null || clase === undefined || !entidadEnPie(e)) r = RESULTADO.fallada;
  else if (!dentroDelRadio(e.x - a.x, e.z - a.z, accion.alcance + accion.holgura)) r = RESULTADO.fallada;
  else if (!accion.imparable && guardaDeFrente(p, e, clase, accion, a)) r = RESULTADO.parada;
  else if (!accion.imparable && esquivaAlAzar(p, e, clase, accion, a)) r = RESULTADO.esquivada;
  else if (e.cerebro.modo === 'aparecer' || intocableEn(e.estado, an.impactoEnTic)) r = RESULTADO.esquivada;

  if (r === RESULTADO.da && e !== null && clase !== undefined) {
    golpearEntidad(p, e, clase, accion.efecto, an.alRitmo, a, reglas, an.impactoEnTic, an.id);
  } else {
    contar(p, 0, { e: 'resuelve', id: an.id, r: r as CodigoDeResultado, dano: 0, vida: e === null ? 0 : e.vida });
  }
  a.cadena = eslabon(r === RESULTADO.da);
  const recupera = an.impactoEnTic + accion.recuperacionTics;
  if (recupera > a.recuperaHastaTic) a.recuperaHastaTic = recupera;
  if (r === RESULTADO.parada && e !== null && clase !== undefined && clase.guardia !== null) {
    ponerPuesta(p, a, clase.guardia.alParar, an.impactoEnTic, 0);
    responder(p, e, clase, a);
  } else if ((r === RESULTADO.fallada || r === RESULTADO.esquivada) && accion.alFallar !== null) {
    ponerPuesta(p, a, accion.alFallar, an.impactoEnTic, 0);
  }
}

/** ¿Está la entidad en un estado que la deja sin guardia (y sin esquiva al azar)? */
function sinGuardia(p: PasoEnCurso, e: EntidadEnCurso, salvoEn: readonly number[]): boolean {
  if (e.cerebro.modo === 'aparecer') return true;
  const activo = enCurso(e.estado, p.k);
  return activo !== null && salvoEn.indexOf(activo.estado) >= 0;
}

/** LA GUARDIA DE FRENTE (declaración G): para lo que viene de delante y está en su lista, salvo en sus estados. */
function guardaDeFrente(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, accion: AccionDeclarada, a: AsientoEnCurso): boolean {
  const g = clase.guardia;
  if (g === null || accion.efecto.rompeGuardia || g.para.indexOf(accion.id) < 0) return false;
  if (sinGuardia(p, e, g.salvoEn)) return false;
  return dentroDelCono(e.mira, a.x - e.x, a.z - e.z, g.conoRumbos);
}

/** LO QUE VIENE DE FRENTE Y SE ESQUIVA A VECES, con el azar de la sala. */
function esquivaAlAzar(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, accion: AccionDeclarada, a: AsientoEnCurso): boolean {
  const g = clase.guardia;
  if (g === null || g.esquivaAlAzar.acciones.indexOf(accion.id) < 0) return false;
  if (sinGuardia(p, e, g.salvoEn)) return false;
  if (!dentroDelCono(e.mira, a.x - e.x, a.z - e.z, g.conoRumbos)) return false;
  return tirar(p, UNO) < g.esquivaAlAzar.probabilidad;
}

/**
 * LA RESPUESTA DE LA GUARDIA: contesta al que paró con su acción, sin gastar turno, si no está ya en otra.
 * Sin gastar turno, pero tampoco llevándose el que tuviera contra otro: si contesta a otro asiento, suelta
 * el suyo (si no, ese turno pasaba a contar contra quien paró, por encima de lo que admite). Y lo que no
 * hace ningún golpe de entidad tampoco lo hace ella: pasar de `anunciosALaVez` contra él, ni contestar a
 * quien está en un estado de `excluyen`.
 */
function responder(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad, a: AsientoEnCurso): void {
  const g = clase.guardia;
  if (g === null || g.respuesta === 0) return;
  if (anuncioDelAutor(p, e.numero) !== null || bloqueaLaAccion(p.indices, e.estado, p.k)) return;
  const accion = p.indices.porClase[clase.id]?.acciones[g.respuesta];
  if (accion === undefined) return;
  const t = p.declaracion.turnos;
  const activo = enCurso(a.estado, p.k);
  if (activo !== null && p.indices.excluyen[activo.estado] === true) return;
  let contraEl = 0;
  for (const an of p.anuncios) if (an.a === a.numero && an.lanzadoEnTic <= p.k) contraEl++;
  if (contraEl >= t.anunciosALaVez) return;
  const mas = t.alargarConLaRed ? compTics(a) : 0;
  e.mira = rumboDeA(e.x, e.z, a.x, a.z, e.mira);
  if (e.blanco !== a.numero) e.turno = 'ninguno';
  e.blanco = a.numero;
  e.cerebro = { ...e.cerebro, modo: 'atacar', desdeTic: p.k };
  lanzarAnuncio(p, e.numero, e.x, e.z, accion, a.numero, false, p.k, mas, false);
}

/** El rumbo de `(x0, z0)` hacia `(x1, z1)`, o `siNo` si están en el mismo sitio. */
export function rumboDeA(x0: number, z0: number, x1: number, z1: number, siNo: number): number {
  const dx = x1 - x0;
  const dz = z1 - z0;
  return dx === 0 && dz === 0 ? siNo : rumboHacia(dx, dz);
}

/**
 * TRAS EL IMPACTO DE UNA ENTIDAD: su eslabón, y si la cadena sigue (su siguiente golpe va tras éste y,
 * si lo pide, dio), lo lanza ya contra el mismo blanco y sin soltar el turno. Si no, termina el ataque.
 */
function seguirTrasElImpacto(p: PasoEnCurso, e: EntidadEnCurso, an: AnuncioPendiente, accion: AccionDeclarada, dio: boolean): void {
  e.cadena = { accion: an.accion, impactoEnSuReloj: an.impactoMs, dio };
  const clase = p.indices.clases[e.clase];
  const b = asientoDe(p, an.a);
  if (clase === undefined || b === null || !entidadEnPie(e) || bloqueaLaAccion(p.indices, e.estado, p.k) || !b.conCuerpo || b.vida <= 0) {
    terminarElAtaque(p, e, accion, an.impactoEnTic);
    return;
  }
  const activoB = enCurso(b.estado, p.k);
  if (activoB !== null && p.indices.excluyen[activoB.estado] === true) {
    terminarElAtaque(p, e, accion, an.impactoEnTic);
    return;
  }
  let siguiente: AccionDeclarada | null = null;
  for (const c of clase.acciones) {
    if (c.cadena !== null && c.cadena.tras.indexOf(an.accion) >= 0 && (!c.cadena.soloSiDio || dio)) {
      siguiente = c;
      break;
    }
  }
  if (siguiente === null) {
    terminarElAtaque(p, e, accion, an.impactoEnTic);
    return;
  }
  const mas = p.declaracion.turnos.alargarConLaRed ? compTics(b) : 0;
  e.mira = rumboDeA(e.x, e.z, b.x, b.z, e.mira);
  lanzarAnuncio(p, e.numero, e.x, e.z, siguiente, b.numero, false, p.k, mas, false);
}

/** Termina el ataque de una entidad: suelta el turno, se recupera y vuelve a pensar. */
export function terminarElAtaque(p: PasoEnCurso, e: EntidadEnCurso, accion: AccionDeclarada | null, impactoEnTic: number): void {
  e.turno = 'ninguno';
  const recupera = impactoEnTic + (accion === null ? 0 : accion.recuperacionTics);
  if (recupera > e.recuperaHastaTic) e.recuperaHastaTic = recupera;
  if (e.cerebro.modo === 'atacar') e.cerebro = { ...e.cerebro, modo: 'acechar', desdeTic: p.k, repiensaEnTic: p.k };
}

/* ─── DAR: DAÑO, EMPUJE Y ESTADO ─────────────────────────────────────────── */

/** Adónde llega un empujón y contra qué caja se para (−1 = ninguna). */
interface Empujon {
  readonly rumbo: number;
  readonly x: number;
  readonly z: number;
  readonly d: number;
  readonly caja: number;
}

/**
 * EL EMPUJÓN (declaración H): del cuerpo en `(x, z)` hacia `rumbo`, `distancia`, recortado al límite de
 * la fase y parado antes de la primera caja de la estructura (`geometria.trayectoria`, con el radio del
 * cuerpo). Si se para contra una caja, es un CHOQUE. Si la llegada no tiene suelo (el límite y la
 * estructura no lo cubren todo), se acorta a la mitad hasta cinco veces, y sin choque.
 */
function empujon(p: PasoEnCurso, x: number, z: number, radio: number, rumbo: number, distancia: number): Empujon {
  const destino = desplazado(x, z, rumbo, distancia);
  const dentro = recortadoAlLimite(p, x, z, destino.x, destino.z);
  const t = trayectoria(p.arena.cuerpos, x, z, dentro.x - x, dentro.z - z, radio);
  let ex = t.x;
  let ez = t.z;
  let caja = t.caja === null ? -1 : t.caja;
  if (!sePuedeEstarEn(p, ex, ez, radio)) {
    caja = -1;
    let f = UNO / 2;
    let hallado = false;
    for (let i = 0; i < 5 && !hallado; i++) {
      const q = puntoDelTramo(x, z, t.x, t.z, f);
      if (sePuedeEstarEn(p, q.x, q.z, radio)) {
        ex = q.x;
        ez = q.z;
        hallado = true;
      }
      f = f / 2;
    }
    if (!hallado) {
      ex = x;
      ez = z;
    }
  }
  return { rumbo, x: ex, z: ez, d: largo(ex - x, ez - z), caja };
}

/** El premio de un choque contra la estructura, al autor si es un asiento. */
function premiarChoque(p: PasoEnCurso, autor: number): void {
  const a = asientoDe(p, autor);
  if (a === null) return;
  const reglas = p.declaracion.asientos[a.numero - 1] as ReglasDeAsiento;
  a.contadores.choques++;
  sumarMedidor(p, a, reglas, reglas.medidor.porChoque);
  sumarPuntos(p, a, reglas, reglas.puntos.porChoque);
}

/**
 * DA A UN ASIENTO. Cuenta el `resuelve` (o el `impacta` de una bala: `bala` ≠ 0) con el daño y la vida
 * que le queda, y después lo que le pasa: el empujón (lo hace su aparato; la sala se lo admite), el
 * daño, lo que el daño corta, la caída o el estado. `rumbo` −1 = del autor hacia el blanco.
 */
export function golpearAsiento(
  p: PasoEnCurso,
  b: AsientoEnCurso,
  reglasB: ReglasDeAsiento,
  efecto: EfectoDeclarado,
  alRitmo: boolean,
  autor: number,
  ax: number,
  az: number,
  rumbo: number,
  desde: number,
  anuncio: number,
  bala: number,
): void {
  let dano = alRitmo ? efecto.danoAlRitmo : efecto.dano;
  let masTics = 0;
  let emp: Empujon | null = null;
  if (efecto.empuje > 0) {
    const r = rumbo >= 0 ? rumbo : rumboDeA(ax, az, b.x, b.z, b.mira);
    emp = empujon(p, b.x, b.z, reglasB.cuerpo.radio, r, efecto.empuje);
    if (emp.caja >= 0) {
      dano += efecto.alChocar.dano;
      masTics = efecto.alChocar.tics;
    }
  }
  const vida = b.vida - dano > 0 ? b.vida - dano : 0;
  if (bala !== 0) contar(p, 0, { e: 'impacta', bala, a: b.numero, r: RESULTADO.da, dano, vida });
  else contar(p, 0, { e: 'resuelve', id: anuncio, r: RESULTADO.da, dano, vida });
  if (emp !== null) {
    contar(p, 0, { e: 'empuja', a: b.numero, r: emp.rumbo, d: aCentesimas(emp.d), caja: emp.caja + 1 });
    if (emp.caja >= 0) premiarChoque(p, autor);
  }
  b.vida = vida;
  ensuciarCuenta(p, b.numero);
  if (dano > 0) {
    b.multiplicador = UNO;
    b.contadores.serie = 0;
  }
  cortarPorDano(p, b);
  if (vida <= 0) caeElAsiento(p, b, desde);
  else if (efecto.puesta !== null) {
    const firme = reglasB.cuerpo.firmeCadaTics;
    if (firme > 0 && (b.firmeGastadoEnTic < 0 || p.k - b.firmeGastadoEnTic >= firme)) b.firmeGastadoEnTic = p.k;
    else ponerPuesta(p, b, efecto.puesta, desde, masTics);
  }
  /*
   * El recorrido del empujón se admite DESPUÉS del estado: un estado que bloquea el paso deja el
   * presupuesto en su propia distancia extra, y el aparato de este asiento va a hacer además el
   * recorrido que dice `empuja`. Admitirlo antes sería borrarlo.
   */
  if (emp !== null) darExtra(b, emp.d, p.k + 20);
}

/** Lo que un golpe recibido corta: la sostenida de un estado que se corta con daño, o el uso de una zona que lo pide. */
function cortarPorDano(p: PasoEnCurso, b: AsientoEnCurso): void {
  const activo = enCurso(b.estado, p.k);
  const declarado = activo === null ? undefined : p.indices.estados[activo.estado];
  const s = b.sostenida;
  if (s !== null) {
    const zona = zonaDeAccion(p);
    const enLaZona = zona !== null && p.indices.porAsiento[b.numero - 1]?.tipo[s.accion] === TIPO_DE_ACCION.zona;
    if ((declarado !== undefined && declarado.seCortaConDano) || (enLaZona && zona !== null && zona.rompeConDano)) soltarLaSostenida(p, b);
  }
  if (declarado !== undefined && declarado.seCortaConDano && enCurso(b.estado, p.k) !== null) ponerEstado(p, b, null);
}

/** DA A UNA ENTIDAD: `resuelve`, empujón (la mueve la sala), daño, y su caída o su estado. */
function golpearEntidad(
  p: PasoEnCurso,
  e: EntidadEnCurso,
  clase: ClaseDeEntidad,
  efecto: EfectoDeclarado,
  alRitmo: boolean,
  a: AsientoEnCurso,
  reglas: ReglasDeAsiento,
  desde: number,
  anuncio: number,
): void {
  let dano = alRitmo ? efecto.danoAlRitmo : efecto.dano;
  let masTics = 0;
  let emp: Empujon | null = null;
  if (efecto.empuje > 0) {
    emp = empujon(p, e.x, e.z, clase.radio, rumboDeA(a.x, a.z, e.x, e.z, a.mira), efecto.empuje);
    if (emp.caja >= 0) {
      dano += efecto.alChocar.dano;
      masTics = efecto.alChocar.tics;
    }
  }
  const vida = e.vida - dano > 0 ? e.vida - dano : 0;
  contar(p, 0, { e: 'resuelve', id: anuncio, r: RESULTADO.da, dano, vida });
  if (emp !== null) {
    contar(p, 0, { e: 'empuja', a: e.numero, r: emp.rumbo, d: aCentesimas(emp.d), caja: emp.caja + 1 });
    e.x = emp.x;
    e.z = emp.z;
    if (emp.caja >= 0) premiarChoque(p, a.numero);
  }
  e.vida = vida;
  sumarPuntos(p, a, reglas, alRitmo ? efecto.puntosAlRitmo : efecto.puntos);
  if (alRitmo) sumarMedidor(p, a, reglas, reglas.medidor.porRitmo);
  if (vida <= 0) {
    caeLaEntidad(p, e, clase);
    return;
  }
  if (efecto.puesta !== null) ponerEstadoALaEntidad(p, e, puestaDesde(efecto.puesta, desde, masTics));
}

/**
 * UN ASIENTO SE QUEDA SIN VIDA: suelta lo que sostenía y lo que llevaba (un montón por portable) y entra
 * en la caída del equipo. Si nadie lo rescata mientras dura, `avanzarLasCaidas` decide si vuelve.
 */
export function caeElAsiento(p: PasoEnCurso, a: AsientoEnCurso, desde: number): void {
  a.vida = 0;
  a.contadores.caidas++;
  ensuciarCuenta(p, a.numero);
  soltarLaSostenida(p, a);
  a.guardada = null;
  a.acometida = null;
  dejarCaerLoQueLleva(p, a);
  ponerPuesta(p, a, p.declaracion.equipo.caida, desde < p.k ? p.k : desde, 0);
}

/**
 * UNA ENTIDAD SE QUEDA SIN VIDA: se va (`cae`) o queda rematable en su puesta de caída; lo que pasa si
 * nadie la remata lo decide su cerebro cuando la caída acaba (ver `cerebro.ts`).
 */
export function caeLaEntidad(p: PasoEnCurso, e: EntidadEnCurso, clase: ClaseDeEntidad): void {
  e.turno = 'ninguno';
  e.blanco = 0;
  if (clase.alCaer.tipo === 'irse') {
    contar(p, 0, { e: 'seva', id: e.numero, por: MOTIVO_DE_IRSE.cae, quien: 0 });
    quitarEntidad(p, e.numero);
    return;
  }
  e.vida = 0;
  ponerEstadoALaEntidad(p, e, puestaDesde(clase.alCaer.puesta, p.k, 0));
  e.cerebro = { modo: 'caida', desdeTic: p.k, repiensaEnTic: p.k + clase.alCaer.puesta.tics, nudo: -1, apuntaX: e.x, apuntaZ: e.z, balasPorSalir: 0 };
}

/**
 * LAS CAÍDAS DE LOS ASIENTOS, cada tic: la caída que acaba sin rescate gasta el recurso y espera sin
 * cuerpo (`reaparicion.esperaTics`) o, sin recurso, se queda sin cuerpo hasta la fase siguiente; y quien
 * termina de esperar reaparece en su sitio de reaparición, con su vida y su estado (intocable).
 */
export function avanzarLasCaidas(p: PasoEnCurso): void {
  const eq = p.declaracion.equipo;
  for (const a of p.asientos) {
    if (a.conCuerpo && a.vida <= 0) {
      const activo = enCurso(a.estado, p.k);
      if (activo !== null && activo.estado === eq.caida.estado) continue;
      a.conCuerpo = false;
      if (p.recurso >= eq.reaparicion.coste) {
        p.recurso -= eq.reaparicion.coste;
        p.recursoSucio = true;
        const hasta = p.k + (eq.reaparicion.esperaTics > 0 ? eq.reaparicion.esperaTics : 1);
        ponerEstado(p, a, { estado: p.declaracion.sinCuerpo.estado, desdeTic: p.k, hastaTic: hasta, intocableHastaTic: hasta, soltableEnTic: hasta, distanciaExtra: 0 });
      } else {
        ponerEstado(p, a, estadoSinFin(p.declaracion.sinCuerpo.estado, p.k));
      }
      continue;
    }
    if (!a.conCuerpo && a.contadores.salio === 0 && a.estado !== null && a.estado.hastaTic !== SIN_FIN && p.k >= a.estado.hastaTic) {
      const reglas = p.declaracion.asientos[a.numero - 1] as ReglasDeAsiento;
      const s = sitioDeNacer(p, a.numero, 'reaparicion');
      a.conCuerpo = true;
      const vida = eq.reaparicion.vida;
      a.vida = vida > reglas.cuerpo.vidaTope ? reglas.cuerpo.vidaTope : vida;
      a.contadores.reapariciones++;
      a.balasHastaTic = p.k;
      /*
       * El silencio sin cuerpo no cuenta para el ausente: sin cuerpo no se manda `aqui` (ver
       * `protocolo.ts`). Sin esto, quien vuelve tras esperar ocho segundos entraba DIRECTAMENTE en el
       * ausente —pisando su estado de recién vuelto— antes de que su aparato supiera que volvía.
       */
      a.ultimoAquiEnTic = p.k;
      recolocar(p, a, reglas, s.x, s.z, s.rumbo);
      ponerPuesta(p, a, eq.reaparicion.puesta, p.k, 0);
      ensuciarCuenta(p, a.numero);
    }
  }
}

/** El vector de un rumbo en Q16.16: lo usa el cerebro para mirar «por delante» de alguien. */
export function adelanteDe(rumbo: number): { x: number; z: number } {
  return { x: SENO[rumbo] as number, z: -(COSENO[rumbo] as number) };
}
