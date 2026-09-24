/**
 * LOS ENCUENTROS (declaraciones L y M): quién sale, de dónde y a qué ritmo; la zona de acción que se
 * enciende y se apaga; cuándo se acaba y con qué resultado; y la ronda que sale para la mesa. Es una
 * pieza de `sala.ts`.
 *
 * ═══ LOS PRESENTES LOS DICE LA DECLARACIÓN, NO LOS CANALES ═══
 *
 * Todas las tablas por presentes se leen con `encuentro.presentes`, que decide el productor con la vista
 * de la mesa. La sala NO cuenta canales abiertos: tras un despliegue renace con el primer `hola` y un
 * solo canal, y contando canales escalaría para uno el combate de seis (ver `EncuentroDeclarado`).
 *
 * ═══ CÓMO SALEN ═══
 *
 * Cada grupo, en su orden, saca una entidad cada `cadaTics` (todas las que quepan si es 0) desde su
 * `desdeTic`, mientras no pase de sus vivas a la vez, de las del encuentro, ni del aforo. Las caídas y
 * las deshechas CUENTAN como vivas: ocupan su número y van a volver. La zona de cada una se elige como
 * dice el grupo (`EleccionDeZona`); el sitio dentro de la zona, con el azar de la sala.
 *
 * ═══ CÓMO ACABA ═══
 *
 * Acabar es UN `arcade:ronda` con el resultado, las cuentas de la fase y el recurso; y disolver lo que
 * queda (entidades, balas y montones con `seva … disuelta`; los anuncios, `cortada`). Después la sala no
 * saca nada más: espera la vista de la fase siguiente. Lo que estaba en un montón se pierde.
 *
 * «Nadie puede seguir» no cuenta a quien SE FUE —`veredictoTrasTics` sin canal, o ausente—: un asiento
 * vacío tiene cuerpo, es intocable y no cae nunca, y con él contado no se perdía ningún encuentro ni se
 * dejaba de pagar la zona de salida por quien no iba a salir (ver `seFue` en `cuerpo.ts`).
 */
import type { ColumnaDeCuenta, GrupoDeclarado, ResultadoDeRonda, ZonaDeAccionDeclarada, ZonaDelMundo } from './declaracion';
import { porPresentes, veredictoDeRonda } from './declaracion';
import { COSENO, SENO } from '../andar';
import { por } from '../fijo';
import { MOTIVO_DE_IRSE, RESULTADO } from './protocolo';
import type { GrupoEnCurso } from './tipos-de-la-sala';
import { contar, SIN_FIN, tirar } from './paso-en-curso';
import type { AsientoEnCurso, PasoEnCurso } from './paso-en-curso';
import { soltarLaSostenida } from './combate';
import { miraAlMasCercano, nuevaEntidad, puntoEnLaZona } from './cerebro';
import { seFue } from './cuerpo';
import { llevaDe } from './portables';

/* ─── EMPEZAR ────────────────────────────────────────────────────────────── */

/** EMPIEZA EL ENCUENTRO de la fase (paso 5 de `FaseDeLaLiza`): su reloj cuenta desde este tic. */
export function empezarElEncuentro(p: PasoEnCurso): void {
  const en = p.declaracion.fase.encuentro;
  if (en === null) {
    p.encuentro = null;
    return;
  }
  const grupos: GrupoEnCurso[] = [];
  for (const g of en.grupos) grupos.push({ salidas: 0, total: porPresentes(g.cuantos, en.presentes), proximaEnTic: p.k + g.desdeTic });
  p.encuentro = { ronda: en.ronda, desdeTic: p.k, presentes: en.presentes, grupos, zona: null, resultado: null };
  if (en.fin.tipo === 'salida') encenderLaZona(p, en.fin.zona, 0, en.fin.zona.activaTics);
}

/**
 * ENCIENDE UNA ZONA DE ACCIÓN de su clase, sorteada, sin repetir la que se acaba de apagar (`antes`) si
 * hay otra. Cuenta el suceso `zona` con sus tics.
 */
function encenderLaZona(p: PasoEnCurso, zona: ZonaDeAccionDeclarada, antes: number, tics: number): void {
  const todas = p.indices.zonasDeLaClase[zona.claseDeZona] ?? [];
  const candidatas: ZonaDelMundo[] = [];
  for (const z of todas) if (z.id !== antes) candidatas.push(z);
  const usar = candidatas.length > 0 ? candidatas : todas;
  const en = p.encuentro;
  if (usar.length === 0 || en === null) return;
  const elegida = usar[tirar(p, usar.length)] as ZonaDelMundo;
  p.encuentro = { ...en, zona: { zona: elegida.id, hastaTic: p.k + tics, usando: [] } };
  contar(p, 0, { e: 'zona', id: elegida.id, tics });
}

/* ─── CADA TIC ───────────────────────────────────────────────────────────── */

/** La zona que se apaga y las entidades que salen, un tic. */
export function avanzarElEncuentro(p: PasoEnCurso): void {
  const en = p.declaracion.fase.encuentro;
  if (en === null || p.encuentro === null || p.encuentro.resultado !== null) return;
  if (en.fin.tipo === 'salida') apagarLaZonaSiToca(p, en.fin.zona);
  sacarEntidades(p);
}

/**
 * ¿Queda alguien que todavía pueda jugar (y salir)? En pie, esperando volver, o caído con recurso para
 * volver; y que no SE HAYA IDO: quien lleva `veredictoTrasTics` sin canal, o ausente con él abierto, no
 * cuenta (ver `seFue` en `cuerpo.ts`: sin esto, un asiento vacío hacía imposible perder).
 */
export function alguienPuedeSeguir(p: PasoEnCurso): boolean {
  const coste = p.declaracion.equipo.reaparicion.coste;
  for (const a of p.asientos) {
    if (a.contadores.salio === 1 || seFue(p, a)) continue;
    if (a.conCuerpo && a.vida > 0) return true;
    if (!a.conCuerpo && a.estado !== null && a.estado.hastaTic !== SIN_FIN) return true;
    if (a.conCuerpo && a.vida <= 0 && p.recurso >= coste) return true;
  }
  return false;
}

/**
 * LA ZONA QUE LLEGA A SU TIC SE APAGA. Si queda alguien que pueda salir, se gasta el coste y se enciende
 * OTRA; sin recurso, el encuentro se acaba (lo cierra `mirarElFinal`).
 */
function apagarLaZonaSiToca(p: PasoEnCurso, zona: ZonaDeAccionDeclarada): void {
  const en = p.encuentro;
  if (en === null || en.zona === null || p.k < en.zona.hastaTic) return;
  const apagada = en.zona.zona;
  for (const n of en.zona.usando) {
    const a = p.asientos[n - 1];
    if (a !== undefined) soltarLaSostenida(p, a);
  }
  contar(p, 0, { e: 'zona', id: apagada, tics: 0 });
  const tras = p.encuentro;
  if (tras !== null) p.encuentro = { ...tras, zona: null };
  if (!alguienPuedeSeguir(p)) return;
  if (p.recurso < zona.alApagarse.coste) {
    p.zonaApagadaSinRecurso = true;
    return;
  }
  p.recurso -= zona.alApagarse.coste;
  p.recursoSucio = true;
  encenderLaZona(p, zona, apagada, zona.alApagarse.siguienteTics);
}

/** Cuántas entidades del grupo `g` hay en la sala (caídas y deshechas incluidas: ver la cabecera). */
function vivasDelGrupo(p: PasoEnCurso, g: number): number {
  let n = 0;
  for (const e of p.entidades) if (e.grupo === g) n++;
  return n;
}

/** SALEN LAS QUE TOCAN: ver «cómo salen» en la cabecera. */
function sacarEntidades(p: PasoEnCurso): void {
  const declarado = p.declaracion.fase.encuentro;
  if (declarado === null || p.encuentro === null) return;
  const presentes = p.encuentro.presentes;
  const deLaTabla = porPresentes(declarado.vivasALaVez, presentes);
  const tope = deLaTabla < p.declaracion.aforo.entidades ? deLaTabla : p.declaracion.aforo.entidades;
  let grupos: GrupoEnCurso[] | null = null;
  for (let gi = 0; gi < declarado.grupos.length; gi++) {
    const g = declarado.grupos[gi] as GrupoDeclarado;
    const clase = p.indices.clases[g.clase];
    if (clase === undefined) continue;
    const topeDelGrupo = porPresentes(g.vivasALaVez, presentes);
    let gc = (grupos === null ? p.encuentro.grupos[gi] : grupos[gi]) as GrupoEnCurso;
    while (gc.salidas < gc.total && p.k >= gc.proximaEnTic && p.entidades.length < tope && vivasDelGrupo(p, gi) < topeDelGrupo) {
      const zona = zonaDeSalida(p, g);
      if (zona === null) break;
      const punto = puntoEnLaZona(p, zona, clase.radio);
      nuevaEntidad(p, clase, gi, punto.x, punto.z, miraAlMasCercano(p, punto.x, punto.z));
      gc = { salidas: gc.salidas + 1, total: gc.total, proximaEnTic: g.cadaTics > 0 ? p.k + g.cadaTics : p.k };
      if (grupos === null) grupos = p.encuentro.grupos.slice();
      grupos[gi] = gc;
      if (g.cadaTics > 0) break;
    }
  }
  if (grupos !== null) p.encuentro = { ...p.encuentro, grupos };
}

/** De qué zona sale la siguiente de un grupo, según su `eleccion`; `null` si ahora no puede salir. */
function zonaDeSalida(p: PasoEnCurso, g: GrupoDeclarado): ZonaDelMundo | null {
  if (g.eleccion === 'zonaDeAccion') {
    const activa = p.encuentro === null ? null : p.encuentro.zona;
    return activa === null ? null : (p.indices.zonas[activa.zona] ?? null);
  }
  const zonas = p.indices.zonasDeLaClase[g.claseDeZona] ?? [];
  if (zonas.length === 0) return null;
  if (g.eleccion === 'aLaEspalda') {
    let mejor: ZonaDelMundo | null = null;
    let mejorSuma = 0;
    let alguien = false;
    for (const z of zonas) {
      const cx = Math.floor((z.caja.x0 + z.caja.x1) / 2);
      const cz = Math.floor((z.caja.z0 + z.caja.z1) / 2);
      let suma = 0;
      for (const a of p.asientos) {
        if (!a.conCuerpo) continue;
        alguien = true;
        suma += por(cx - a.x, SENO[a.mira] as number) - por(cz - a.z, COSENO[a.mira] as number);
      }
      if (mejor === null || suma < mejorSuma || (suma === mejorSuma && z.id < mejor.id)) {
        mejor = z;
        mejorSuma = suma;
      }
    }
    if (alguien) return mejor;
  }
  return zonas[tirar(p, zonas.length)] as ZonaDelMundo;
}

/* ─── ACABAR ─────────────────────────────────────────────────────────────── */

/**
 * ¿SE ACABÓ? Ver `EncuentroDeclarado`: con fin `vaciar`, ganada al vaciarse (sin montones), perdida si
 * nadie puede seguir, aguantada si vence el reloj; con fin `salida`, cuando nadie más puede salir, la
 * zona se apagó sin recurso o vence el reloj, ganada si salió el mínimo y perdida si no.
 */
export function mirarElFinal(p: PasoEnCurso): void {
  const declarado = p.declaracion.fase.encuentro;
  const en = p.encuentro;
  if (declarado === null || en === null || en.resultado !== null) return;
  const vencido = p.k - en.desdeTic >= declarado.relojTics;
  const fin = declarado.fin;
  let resultado: ResultadoDeRonda | null = null;
  if (fin.tipo === 'vaciar') {
    let salieronTodas = true;
    for (const g of en.grupos) if (g.salidas < g.total) salieronTodas = false;
    if (salieronTodas && p.entidades.length === 0 && p.montones.length === 0) resultado = 'ganada';
    else if (!alguienPuedeSeguir(p)) resultado = 'perdida';
    else if (vencido) resultado = 'aguantada';
  } else {
    if (!alguienPuedeSeguir(p) || p.zonaApagadaSinRecurso || vencido) {
      let salidos = 0;
      for (const a of p.asientos) salidos += a.contadores.salio;
      resultado = salidos >= porPresentes(fin.salenComoMinimo, en.presentes) ? 'ganada' : 'perdida';
    }
  }
  if (resultado !== null) cerrarElEncuentro(p, resultado);
}

/**
 * CIERRA EL ENCUENTRO: la ronda para la mesa, y se disuelve lo que queda. Ver la cabecera.
 */
export function cerrarElEncuentro(p: PasoEnCurso, resultado: ResultadoDeRonda): void {
  const en = p.encuentro;
  if (en === null) return;
  p.veredictos.push(veredictoDeRonda({ n: en.ronda, resultado, cuentas: cuentasDeLaRonda(p), recurso: p.recurso }));
  for (const a of p.asientos) {
    soltarLaSostenida(p, a);
    a.guardada = null;
    a.acometida = null;
  }
  for (const e of p.entidades) if (e.cerebro.modo !== 'deshecha') contar(p, 0, { e: 'seva', id: e.numero, por: MOTIVO_DE_IRSE.disuelta, quien: 0 });
  for (const b of p.balas) contar(p, 0, { e: 'seva', id: b.numero, por: MOTIVO_DE_IRSE.disuelta, quien: 0 });
  for (const m of p.montones) contar(p, 0, { e: 'seva', id: m.numero, por: MOTIVO_DE_IRSE.disuelta, quien: 0 });
  for (const an of p.anuncios) {
    if (an.lanzadoEnTic > p.k) continue;
    contar(p, 0, { e: 'resuelve', id: an.id, r: RESULTADO.cortada, dano: 0, vida: vidaDelBlanco(p, an.a) });
  }
  if (en.zona !== null) contar(p, 0, { e: 'zona', id: en.zona.zona, tics: 0 });
  p.entidades = [];
  p.balas = [];
  p.montones = [];
  p.anuncios = [];
  p.encuentro = { ...en, zona: null, resultado };
}

/** La vida de un cuerpo por su número (0 si no está). */
export function vidaDelBlanco(p: PasoEnCurso, n: number): number {
  if (n >= 1 && n <= p.asientos.length) return (p.asientos[n - 1] as AsientoEnCurso).vida;
  for (const e of p.entidades) if (e.numero === n) return e.vida;
  return 0;
}

/**
 * LAS CUENTAS DE LA RONDA: una fila por asiento, `[número, …columnas]`, en el orden que declara la liza
 * (`VeredictosDeclarados`). Todo es de la fase (ver `ContadorDeAsiento`).
 */
export function cuentasDeLaRonda(p: PasoEnCurso): number[][] {
  const columnas = p.declaracion.veredictos.columnas;
  const filas: number[][] = [];
  for (const a of p.asientos) {
    const fila: number[] = [a.numero];
    for (const c of columnas) fila.push(valorDeLaColumna(a, c));
    filas.push(fila);
  }
  return filas;
}

function valorDeLaColumna(a: AsientoEnCurso, c: ColumnaDeCuenta): number {
  switch (c.que) {
    case 'lleva':
      return llevaDe(a, c.portable);
    case 'cobrado': {
      for (const k of a.contadores.cobrado) if (k.portable === c.portable) return k.n;
      return 0;
    }
    case 'puntos':
      return a.puntos;
    case 'vida':
      return a.vida;
    case 'medidor':
      return a.medidor;
    case 'limpias':
      return a.contadores.limpias;
    case 'serieMaxima':
      return a.contadores.serieMaxima;
    case 'amenazas':
      return a.contadores.amenazas;
    case 'rematadas':
      return a.contadores.rematadas;
    case 'choques':
      return a.contadores.choques;
    case 'rescates':
      return a.contadores.rescates;
    case 'caidas':
      return a.contadores.caidas;
    case 'reapariciones':
      return a.contadores.reapariciones;
    case 'esquivas':
      return a.contadores.esquivas;
    case 'salio':
      return a.contadores.salio;
  }
}
