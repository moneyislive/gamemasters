/**
 * LA SALA DE LA LIZA: el paso PURO que da un tic. `salaNueva` y `avanzarLaSala`, con las firmas de
 * `tipos-de-la-sala.ts`, que es donde está el contrato entero (léelo antes que esto).
 *
 * ═══ QUÉ HACE UN PASO, EN SU ORDEN ═══
 *
 *   1. Si la fase de la declaración no es la que corre (la sala recién nacida, o una vista con otra
 *      `clave`), EMPIEZA la fase: los seis pasos de `FaseDeLaLiza`, en su orden.
 *   2. Las ENTRADAS, en el orden en que llegaron: `aqui` (validar el sitio y atender su acción), `eco`,
 *      `aviso`, `conexion`, `desconexion` y `vista`. Quien conectó no se pone al día todavía, y lo que
 *      otro lance en este paso antes de su puesta al día no se le anuncia aparte: le llega dentro de
 *      ella. (Anunciárselo también le daba el mismo anuncio dos veces, el primero antes de su `fase`.)
 *   3. LA PUESTA AL DÍA de los que conectaron: su `dentro` y, `para` él, todo lo que hay en la sala en
 *      el orden de `Bienvenida`. Va DESPUÉS de las entradas y ANTES de simular: lo que pase en el tic
 *      (un `estado`, un `resuelve`) llega detrás de lo que lo explica, nunca de algo que no conoce.
 *   4. EL TIC, si la fase no es `quieta`: los presupuestos; y en un encuentro vivo, por este orden, las
 *      repeticiones que salen, los impactos que tocan, las balas, las pulsaciones guardadas, las
 *      acometidas, las sostenidas, las caídas, la presencia, las entidades, lo que sale del encuentro,
 *      los montones, y si se acabó. Los impactos van antes que las guardadas para que un golpe encadenado
 *      salga en el mismo tic en que se resuelve el anterior; las entidades, después de los impactos,
 *      para que piensen sabiendo cómo acabó su golpe.
 *   5. Los RELOJES: el `arcade:reloj` de la fase (una vez) y el `arcade:ausente` de quien lleva sin
 *      canal lo que diga la presencia (una vez por asiento y fase, sólo en encuentro).
 *   6. Las CUENTAS que cambiaron (`cuenta`, `carga`, `recurso`): una por asiento al final, no una por
 *      cada suma.
 *   7. La FOTO, en los tics pares.
 *
 * ═══ PURA ═══
 *
 * Nada de relojes, red ni `Math.random`: el tiempo es el número de tic y el azar viaja dentro del estado
 * (`azar.ts`), sembrado con la semilla pública de la fase. La misma sala y las mismas entradas dan el
 * mismo paso en Node y en Hermes; `verify:liza` lo comprueba en los dos.
 */
import { sembrar } from '../azar';
import { UNO } from '../fijo';
import { canonico } from '../canonico';
import type { AnuncioPendiente, AvanzarLaSala, ContadoresDeAsiento, EntradaConexion, EntradaDeLaSala, EntradaVista, EstadoDeLaSala, PasoDeLaSala, SalaNueva } from './tipos-de-la-sala';
import type { LizaDeclarada, ReglasDeAsiento, SitioDeNacer } from './declaracion';
import { arenaDeLaLiza, veredictoDeAusente, veredictoDeReloj } from './declaracion';
import type { SucesoDelTic, TuplaDeFoto } from './protocolo';
import { aCentesimas, CODIGO_DE_MODO, MOTIVO_DE_IRSE, PRIMER_NUMERO_DE_ENTIDAD, RESULTADO } from './protocolo';
import {
  abrirPaso,
  bitDe,
  cerrarPaso,
  contar,
  enCurso,
  ensuciarCarga,
  ensuciarCuenta,
  indicesDe,
  msDelTic,
  sucesoDeEstado,
} from './paso-en-curso';
import type { AsientoEnCurso, BalaInterna, CuerpoInterno, EstadoInterno, PasoEnCurso } from './paso-en-curso';
import { dentroDelLimite, mirarLaPresencia, recolocar, redDelAsiento, rellenarPresupuestos, sinCanalDeMas, sitioDeNacer, topeDelCorto, validarAqui } from './cuerpo';
import {
  anunciarProgramados,
  atenderLaAccionDelAqui,
  avanzarLasCaidas,
  avanzarSostenidas,
  instanteParaElAsiento,
  lanzarAcometidas,
  reintentarGuardadas,
  resolverAnuncios,
  soltarLaSostenida,
} from './combate';
import { avanzarLasBalas } from './proyectiles';
import { pensarLasEntidades } from './cerebro';
import { avanzarElEncuentro, empezarElEncuentro, mirarElFinal, vidaDelBlanco } from './encuentros';
import { caducarMontones, llevaDe, recogerMontones } from './portables';

/* ─── NACER ──────────────────────────────────────────────────────────────── */

function contadoresACero(): ContadoresDeAsiento {
  return {
    limpias: 0,
    serie: 0,
    serieMaxima: 0,
    amenazas: 0,
    rematadas: 0,
    choques: 0,
    rescates: 0,
    caidas: 0,
    reapariciones: 0,
    esquivas: 0,
    salio: 0,
    cobrado: [],
  };
}

/**
 * LA SALA DE UNA MESA QUE NO TIENE SALA EN ESTE PROCESO (ver `SalaNueva`): sin nadie conectado, cada
 * asiento en su sitio de nacer y sin cuerpo todavía, y la fase SIN EMPEZAR —su clave vacía—: la empieza
 * el primer paso, como cualquier otra. El azar se siembra con `semilla`; las fases siguientes, con la
 * suya.
 */
export function salaNueva(declaracion: LizaDeclarada, semilla: number): EstadoDeLaSala {
  const indices = indicesDe(declaracion);
  const asientos: CuerpoInterno[] = [];
  for (let i = 0; i < declaracion.asientos.length; i++) {
    const r = declaracion.asientos[i] as ReglasDeAsiento;
    const lista = indices.naceAsiento.length > 0 ? indices.naceAsiento : indices.naceReaparicion;
    const s = lista.length > 0 ? (lista[i % lista.length] as SitioDeNacer) : { papel: 'asiento' as const, x: 0, z: 0, rumbo: 0 };
    const comp = declaracion.red.compBaseMs < declaracion.red.compTopeMs ? declaracion.red.compBaseMs : declaracion.red.compTopeMs;
    asientos.push({
      numero: i + 1,
      asiento: r.asiento,
      conectado: false,
      conexionCambioEnTic: 0,
      ultimoAquiEnTic: -1,
      ultimoTicDelAparato: -1,
      conCuerpo: false,
      x: s.x,
      z: s.z,
      mira: s.rumbo,
      marcha: 0,
      rastro: [],
      presupuestoCorto: 0,
      tramosRecientes: [],
      estado: null,
      vida: r.alEmpezar.vida,
      medidor: r.alEmpezar.medidor,
      puntos: 0,
      multiplicador: UNO,
      cadena: null,
      recargas: [],
      esquivasRecientes: [],
      firmeGastadoEnTic: -1,
      sostenida: null,
      guardada: null,
      lleva: r.alEmpezar.lleva.slice(),
      contadores: contadoresACero(),
      red: { rttMs: 0, compMs: comp, desfaseMs: 0 },
      ultimoAvisoEnTic: -1,
      ausenteDado: false,
      corregidoEnTic: -1,
      enVueloHastaN: -1,
      nDelSitio: -1,
      extraHastaTic: 0,
      recuperaHastaTic: 0,
      balasHastaTic: 0,
      acometida: null,
    });
  }
  const sala: EstadoInterno = {
    tic: 0,
    declaracion,
    arena: arenaDeLaLiza(declaracion),
    fase: { clave: '', desdeTic: 0, relojDado: false },
    azar: sembrar(semilla),
    asientos,
    entidades: [],
    balas: [],
    montones: [],
    anuncios: [],
    encuentro: null,
    recurso: declaracion.equipo.recurso,
    siguienteNumero: PRIMER_NUMERO_DE_ENTIDAD,
    siguienteAnuncio: 1,
  };
  return sala;
}

/* ─── UN TIC ─────────────────────────────────────────────────────────────── */

/** UN TIC DE LA SALA. Ver la cabecera para el orden. */
export function avanzarLaSala(sala: EstadoDeLaSala, entradas: readonly EntradaDeLaSala[]): PasoDeLaSala {
  const p = abrirPaso(sala as EstadoInterno);
  if (p.fase.clave !== p.declaracion.fase.clave) empezarLaFase(p);
  for (const e of entradas) atenderEntrada(p, e);
  for (const n of p.porPoner) ponerAlDia(p, n);
  /* Ya están al día: desde aquí, lo que se anuncie les llega como a los demás. */
  p.porPoner.length = 0;
  if (p.declaracion.fase.modo !== 'quieta') simular(p);
  mirarLosRelojes(p);
  contarLoQueCambio(p);
  const fotoDebida = p.k % 2 === 0 ? foto(p) : null;
  return {
    sala: cerrarPaso(p),
    sucesos: p.sucesos,
    veredictos: p.veredictos,
    fotoDebida,
    correcciones: p.correcciones,
    bienvenidas: p.bienvenidas,
  };
}

/** Las firmas, contra el contrato: si una cambia, esto deja de compilar. */
const FIRMAS: { readonly salaNueva: SalaNueva; readonly avanzarLaSala: AvanzarLaSala } = { salaNueva, avanzarLaSala };
void FIRMAS;

/**
 * LA HUELLA DE UNA SALA: su forma canónica sin la `arena`, que es derivada y va por referencia (ver
 * `EstadoDeLaSala.arena`). Dos salas con la misma huella son la misma sala, en cualquier motor.
 */
export function huellaDeLaSala(sala: EstadoDeLaSala): string {
  return canonico({ ...sala, arena: null });
}

/** ¿Hay combate vivo? Modo encuentro con un encuentro que no ha acabado. */
function hayCombate(p: PasoEnCurso): boolean {
  return p.declaracion.fase.modo === 'encuentro' && p.encuentro !== null && p.encuentro.resultado === null;
}

function simular(p: PasoEnCurso): void {
  rellenarPresupuestos(p);
  if (!hayCombate(p)) return;
  anunciarProgramados(p);
  resolverAnuncios(p);
  avanzarLasBalas(p);
  reintentarGuardadas(p);
  lanzarAcometidas(p);
  avanzarSostenidas(p);
  avanzarLasCaidas(p);
  mirarLaPresencia(p, (a) => soltarLaSostenida(p, a));
  pensarLasEntidades(p);
  avanzarElEncuentro(p);
  caducarMontones(p);
  recogerMontones(p);
  mirarElFinal(p);
  if (!hayCombate(p)) contar(p, 0, sucesoDeFase(p));
}

/* ─── EMPEZAR UNA FASE ───────────────────────────────────────────────────── */

/** El suceso `fase` con lo que le queda a cada reloj en este tic. */
function sucesoDeFase(p: PasoEnCurso): SucesoDelTic {
  const f = p.declaracion.fase;
  let relojMs = 0;
  if (f.reloj !== null) {
    const queda = f.reloj.duraMs - msDelTic(p.k - p.fase.desdeTic);
    relojMs = queda > 0 ? queda : 0;
  }
  let encuentroTics = 0;
  const en = p.encuentro;
  if (f.modo === 'encuentro' && f.encuentro !== null && en !== null && en.resultado === null) {
    const queda = f.encuentro.relojTics - (p.k - en.desdeTic);
    encuentroTics = queda > 0 ? queda : 0;
  }
  return { e: 'fase', clave: p.fase.clave, modo: CODIGO_DE_MODO[f.modo], limite: f.limite, relojMs, encuentroTics };
}

/** El estado que la foto enseña de un asiento (0 = libre). */
function estadoVisible(p: PasoEnCurso, a: AsientoEnCurso): number {
  const activo = enCurso(a.estado, p.k);
  if (activo !== null) return activo.estado;
  return a.conCuerpo ? 0 : p.declaracion.sinCuerpo.estado;
}

/**
 * EMPIEZA LA FASE DE LA DECLARACIÓN: los seis pasos de `FaseDeLaLiza`, en su orden. Quien no tenía cuerpo
 * o queda fuera del límite nuevo aparece en su sitio de nacer (y su aparato, si tiene canal, recibe el
 * `corrige`); todos quedan libres, y el aparato lo sabe por un `estado` 0 de quien no lo estaba.
 */
function empezarLaFase(p: PasoEnCurso): void {
  const d = p.declaracion;
  /* 1. Se va todo lo que vivía en la sala. */
  for (const e of p.entidades) if (e.cerebro.modo !== 'deshecha') contar(p, 0, { e: 'seva', id: e.numero, por: MOTIVO_DE_IRSE.disuelta, quien: 0 });
  for (const b of p.balas) contar(p, 0, { e: 'seva', id: b.numero, por: MOTIVO_DE_IRSE.disuelta, quien: 0 });
  for (const m of p.montones) contar(p, 0, { e: 'seva', id: m.numero, por: MOTIVO_DE_IRSE.disuelta, quien: 0 });
  for (const an of p.anuncios) {
    if (an.lanzadoEnTic > p.k) continue;
    contar(p, 0, { e: 'resuelve', id: an.id, r: RESULTADO.cortada, dano: 0, vida: vidaDelBlanco(p, an.a) });
  }
  p.entidades = [];
  p.balas = [];
  p.montones = [];
  p.anuncios = [];
  /* 2. El azar, con la semilla de la fase (la primera fase se queda con la del nacimiento). */
  if (p.fase.clave !== '') p.azar = sembrar(d.fase.semilla);
  p.fase = { clave: d.fase.clave, desdeTic: p.k, relojDado: false };
  /* 3. Cada asiento, desde su punto de control, libre y con cuerpo. */
  for (const a of p.asientos) {
    const r = d.asientos[a.numero - 1] as ReglasDeAsiento;
    const visible = estadoVisible(p, a);
    soltarLaSostenida(p, a);
    a.vida = r.alEmpezar.vida;
    a.medidor = r.alEmpezar.medidor;
    a.lleva = r.alEmpezar.lleva.slice();
    a.multiplicador = UNO;
    a.puntos = 0;
    a.contadores = { ...contadoresACero() };
    a.estado = null;
    a.cadena = null;
    a.recargas = [];
    a.esquivasRecientes = [];
    a.guardada = null;
    a.acometida = null;
    a.firmeGastadoEnTic = -1;
    a.ausenteDado = false;
    a.recuperaHastaTic = 0;
    a.extraHastaTic = 0;
    a.balasHastaTic = p.k;
    if (!a.conCuerpo || !dentroDelLimite(p, a.x, a.z)) {
      const s = sitioDeNacer(p, a.numero, 'asiento');
      a.conCuerpo = true;
      recolocar(p, a, r, s.x, s.z, s.rumbo);
    } else {
      a.presupuestoCorto = topeDelCorto(r);
      a.tramosRecientes = [];
    }
    if (visible !== 0) contar(p, 0, { e: 'estado', a: a.numero, est: 0, tics: 0, into: 0 });
    ensuciarCuenta(p, a.numero);
    ensuciarCarga(p, a.numero);
  }
  /* 4. El recurso del equipo. */
  p.recurso = d.equipo.recurso;
  p.recursoSucio = true;
  /* 5. El encuentro, si lo hay: su reloj cuenta desde este tic. */
  p.encuentro = null;
  if (d.fase.modo === 'encuentro') empezarElEncuentro(p);
  /* 6. A todos, la fase. */
  contar(p, 0, sucesoDeFase(p));
}

/* ─── LAS ENTRADAS ───────────────────────────────────────────────────────── */

function atenderEntrada(p: PasoEnCurso, e: EntradaDeLaSala): void {
  switch (e.tipo) {
    case 'aqui': {
      const a = asiento(p, e.asiento);
      if (a === null) return;
      const r = validarAqui(p, a, e);
      if (r === 'tirado') return;
      if (hayCombate(p)) atenderLaAccionDelAqui(p, a, e.accion, e.desfaseMs);
      else if (a.sostenida !== null) soltarLaSostenida(p, a);
      return;
    }
    case 'eco': {
      const a = asiento(p, e.asiento);
      if (a !== null) a.red = redDelAsiento(p.declaracion, e.rttMs, e.desfaseMs);
      return;
    }
    case 'aviso':
      avisar(p, e.asiento, e.clase, e.objetivo);
      return;
    case 'conexion':
      conectar(p, e);
      return;
    case 'desconexion': {
      const a = asiento(p, e.asiento);
      if (a === null) return;
      a.conectado = false;
      a.conexionCambioEnTic = p.k;
      soltarLaSostenida(p, a);
      return;
    }
    case 'vista':
      tomarLaVista(p, e);
      return;
  }
}

function asiento(p: PasoEnCurso, n: number): AsientoEnCurso | null {
  if (!Number.isInteger(n) || n < 1 || n > p.asientos.length) return null;
  return p.asientos[n - 1] as AsientoEnCurso;
}

/**
 * UN CANAL NUEVO ES UN RELOJ NUEVO (ver `tipos-de-la-sala.ts`): se olvida lo que dependía del reloj
 * viejo —su último `n`, lo guardado, lo sostenido, su eslabón y sus esquivas, cuyos `ms` eran del reloj
 * de antes—, se REESCRIBEN con el desfase nuevo los instantes guardados que le tocan (el `tBlanco` y el
 * `tAutor` de los anuncios, su salida en cada bala), y se le pondrá al día al acabar las entradas.
 */
function conectar(p: PasoEnCurso, e: EntradaConexion): void {
  const a = asiento(p, e.asiento);
  if (a === null) return;
  a.conectado = true;
  a.conexionCambioEnTic = p.k;
  a.red = redDelAsiento(p.declaracion, e.rttMs, e.desfaseMs);
  a.ultimoTicDelAparato = -1;
  a.nDelSitio = -1;
  a.guardada = null;
  soltarLaSostenida(p, a);
  a.cadena = null;
  a.esquivasRecientes = [];
  a.corregidoEnTic = -1;
  const desfase = a.red.desfaseMs;
  for (let i = 0; i < p.anuncios.length; i++) {
    const an = p.anuncios[i] as AnuncioPendiente;
    if (an.a !== a.numero && an.de !== a.numero) continue;
    p.anuncios[i] = {
      ...an,
      tBlanco: an.a === a.numero ? an.impactoMs + desfase : an.tBlanco,
      tAutor: an.de === a.numero ? an.impactoMs + desfase : an.tAutor,
    };
  }
  for (let i = 0; i < p.balas.length; i++) {
    const b = p.balas[i] as BalaInterna;
    const salidas = b.salidaEnSuReloj.slice();
    salidas[a.numero - 1] = msDelTic(b.salioEnTic) + desfase;
    p.balas[i] = { ...b, salidaEnSuReloj: salidas };
  }
  if (p.porPoner.indexOf(a.numero) < 0) p.porPoner.push(a.numero);
}

/**
 * UNA DECLARACIÓN NUEVA. Con otra `clave` es otra fase y se empieza; con la misma, son otros números para
 * lo que empiece desde ahora. Si la arena cambió se deriva otra. Una declaración con OTROS asientos (otro
 * número, otro orden) no es de esta mesa: los números del cable saldrían de otro sitio, y se ignora.
 */
function tomarLaVista(p: PasoEnCurso, e: EntradaVista): void {
  const d = e.declaracion;
  if (d.asientos.length !== p.asientos.length) return;
  for (let i = 0; i < d.asientos.length; i++) if ((d.asientos[i] as ReglasDeAsiento).asiento !== (p.asientos[i] as AsientoEnCurso).asiento) return;
  const antes = p.declaracion;
  p.declaracion = d;
  p.indices = indicesDe(d);
  if (d.mundo !== antes.mundo) p.arena = arenaDeLaLiza(d);
  if (d.fase.clave !== p.fase.clave) empezarLaFase(p);
}

/**
 * UN AVISO (declaración Q): de una clase declarada, que apunte a lo que su clase dice (una entidad que
 * está, un asiento, o nada), y uno por asiento cada `cadaTics` como mucho. Se reenvía a todos. Lo puede
 * mandar quien no tiene cuerpo: es para lo que está el rol sin cuerpo.
 */
function avisar(p: PasoEnCurso, n: number, clase: number, objetivo: number): void {
  const a = asiento(p, n);
  if (a === null) return;
  let declarada = null;
  for (const c of p.declaracion.avisos.clases) if (c.id === clase) declarada = c;
  if (declarada === null) return;
  if (a.ultimoAvisoEnTic >= 0 && p.k - a.ultimoAvisoEnTic < p.declaracion.avisos.cadaTics) return;
  let obj = 0;
  if (declarada.objetivo === 'asiento') {
    if (asiento(p, objetivo) === null) return;
    obj = objetivo;
  } else if (declarada.objetivo === 'entidad') {
    let esta = false;
    for (const e of p.entidades) if (e.numero === objetivo && e.cerebro.modo !== 'deshecha') esta = true;
    if (!esta) return;
    obj = objetivo;
  }
  a.ultimoAvisoEnTic = p.k;
  contar(p, 0, { e: 'aviso', de: a.numero, clase, obj });
}

/* ─── LA PUESTA AL DÍA ───────────────────────────────────────────────────── */

/**
 * PONE AL DÍA A QUIEN CONECTÓ: su `dentro` y, sólo para él, en el orden de `Bienvenida`: la fase, el
 * recurso, una `cuenta` por asiento, una `carga` por asiento y portable que lleve algo, un `nace` por
 * entidad (en su sitio de ahora), un `estado` por cuerpo que esté en alguno (con lo que le queda), un
 * `monton` por montón, la zona activa, una `bala` por bala y un `anuncio` por anuncio, los dos con el
 * instante en su reloj nuevo.
 */
function ponerAlDia(p: PasoEnCurso, n: number): void {
  const a = asiento(p, n);
  if (a === null || !a.conectado) return;
  if (a.conCuerpo) p.bienvenidas.push({ asiento: n, x: a.x, z: a.z, r: a.mira });
  else {
    const s = sitioDeNacer(p, n, 'asiento');
    p.bienvenidas.push({ asiento: n, x: s.x, z: s.z, r: a.mira });
  }
  contar(p, n, sucesoDeFase(p));
  contar(p, n, { e: 'recurso', n: p.recurso });
  for (const s of p.asientos) contar(p, n, sucesoDeCuenta(s));
  for (const s of p.asientos) {
    for (const po of p.declaracion.portables) {
      const lleva = llevaDe(s, po.id);
      if (lleva > 0) contar(p, n, { e: 'carga', a: s.numero, p: po.id, n: lleva });
    }
  }
  for (const e of p.entidades) {
    if (e.cerebro.modo === 'deshecha') continue;
    contar(p, n, { e: 'nace', id: e.numero, clase: e.clase, x: aCentesimas(e.x), z: aCentesimas(e.z), r: e.mira });
  }
  for (const s of p.asientos) {
    const activo = enCurso(s.estado, p.k);
    if (activo === null) continue;
    const suceso = sucesoDeEstado(s.numero, activo, p.k);
    if (suceso !== null) contar(p, n, suceso);
  }
  for (const e of p.entidades) {
    if (e.cerebro.modo === 'deshecha') continue;
    const activo = enCurso(e.estado, p.k);
    if (activo === null) continue;
    const suceso = sucesoDeEstado(e.numero, activo, p.k);
    if (suceso !== null) contar(p, n, suceso);
  }
  for (const m of p.montones) contar(p, n, { e: 'monton', id: m.numero, p: m.portable, n: m.n, x: aCentesimas(m.x), z: aCentesimas(m.z) });
  const zona = p.encuentro === null ? null : p.encuentro.zona;
  if (zona !== null && zona.hastaTic > p.k) contar(p, n, { e: 'zona', id: zona.zona, tics: zona.hastaTic - p.k });
  for (const b of p.balas) {
    contar(p, n, {
      e: 'bala',
      id: b.numero,
      de: b.de,
      p: b.proyectil,
      x: aCentesimas(b.x),
      z: aCentesimas(b.z),
      r: b.rumbo,
      t: b.salidaEnSuReloj[n - 1] as number,
    });
  }
  for (const an of p.anuncios) {
    if (an.lanzadoEnTic > p.k) continue;
    contar(p, n, { e: 'anuncio', id: an.id, de: an.de, a: an.a, acc: an.accion, t: instanteParaElAsiento(an, a), x: aCentesimas(an.x), z: aCentesimas(an.z) });
  }
}

function sucesoDeCuenta(a: AsientoEnCurso): SucesoDelTic {
  return { e: 'cuenta', a: a.numero, vida: a.vida, medidor: a.medidor, puntos: a.puntos, mult: a.multiplicador };
}

/* ─── LOS RELOJES, LAS CUENTAS Y LA FOTO ─────────────────────────────────── */

/**
 * EL RELOJ DE FASE vence una vez (`arcade:reloj`), en el primer tic en que han pasado `duraMs` desde que
 * empezó. Y en un encuentro, quien lleva `veredictoTrasTics` sin canal —contando desde que lo perdió, o
 * desde que nació la sala si nunca lo tuvo— sale `arcade:ausente`, una vez por asiento y fase.
 */
function mirarLosRelojes(p: PasoEnCurso): void {
  const f = p.declaracion.fase;
  if (f.reloj !== null && !p.fase.relojDado && msDelTic(p.k - p.fase.desdeTic) >= f.reloj.duraMs) {
    p.veredictos.push(veredictoDeReloj(f.reloj.id));
    p.fase = { ...p.fase, relojDado: true };
  }
  if (f.modo !== 'encuentro') return;
  for (const a of p.asientos) {
    if (a.ausenteDado || !sinCanalDeMas(p, a)) continue;
    a.ausenteDado = true;
    p.veredictos.push(veredictoDeAusente(a.asiento));
  }
}

/** Una `cuenta` por asiento cuya cuenta cambió, sus `carga`, y el `recurso` si cambió. */
function contarLoQueCambio(p: PasoEnCurso): void {
  for (const a of p.asientos) {
    if ((p.cuentaSucia & bitDe(a.numero)) !== 0) contar(p, 0, sucesoDeCuenta(a));
    if ((p.cargaSucia & bitDe(a.numero)) !== 0) {
      for (const po of p.declaracion.portables) contar(p, 0, { e: 'carga', a: a.numero, p: po.id, n: llevaDe(a, po.id) });
    }
  }
  if (p.recursoSucio) contar(p, 0, { e: 'recurso', n: p.recurso });
}

/**
 * LA FOTO: todos los asientos —sin canal, quietos donde se quedaron; sin cuerpo, en su último sitio con
 * el estado de sin cuerpo— y todas las entidades menos las deshechas, que no están. En centésimas.
 */
function foto(p: PasoEnCurso): TuplaDeFoto[] {
  const tuplas: TuplaDeFoto[] = [];
  for (const a of p.asientos) tuplas.push([a.numero, aCentesimas(a.x), aCentesimas(a.z), a.mira, a.marcha, estadoVisible(p, a)]);
  for (const e of p.entidades) {
    if (e.cerebro.modo === 'deshecha') continue;
    const activo = enCurso(e.estado, p.k);
    tuplas.push([e.numero, aCentesimas(e.x), aCentesimas(e.z), e.mira, e.marcha, activo === null ? 0 : activo.estado]);
  }
  return tuplas;
}
