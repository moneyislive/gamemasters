/**
 * EL PASO EN CURSO: lo que las piezas de la sala comparten mientras dan un tic.
 *
 * ═══ UN ESTADO QUE NO SE TOCA, Y UN PASO QUE SÍ ═══
 *
 * `avanzarLaSala` recibe un `EstadoDeLaSala` y devuelve otro sin tocar el que entró: es lo que deja
 * reproducir un fallo con la declaración, las entradas y la semilla, y comparar la sala entre Node y
 * Hermes (ver `tipos-de-la-sala.ts`). Pero dentro de un tic pasan decenas de cosas en orden —un aqui,
 * un golpe que se resuelve, una bala que toca, un montón que se recoge— y escribir cada una como
 * «devuelve un estado nuevo» sería copiar la sala entera por cada suceso.
 *
 * Así que el paso ABRE una copia de trabajo al empezar (`abrirPaso`): los asientos y las entidades se
 * copian una vez, las listas una vez, y a partir de ahí las piezas escriben en la copia. Lo que no
 * cambia se comparte con el estado de antes, que nadie toca. Al acabar, `cerrarPaso` da el estado nuevo.
 * Las listas de dentro de cada cuerpo —el rastro, los tramos, las esquivas— se copian SÓLO cuando se
 * escriben: un asiento quieto no copia su rastro.
 *
 * ═══ LO QUE LA SALA GUARDA PARA VALIDAR Y JUZGAR, YA EN EL CONTRATO ═══
 *
 * La primera sala llevaba siete campos que `tipos-de-la-sala.ts` no decía —el silencio tras corregir,
 * qué venía de camino, la distancia extra, la recuperación, hasta dónde se juzgaron las balas, la
 * acometida; y en las balas y las entidades, lo suyo— en tipos que extendían los del contrato. Entraban
 * en la huella canónica, así que eran estado de verdad que el contrato no contaba: se han subido allí
 * (ver cada campo), junto con los dos del `aqui` vivo del ausente momentáneo. Los nombres de aquí quedan
 * como alias para las piezas de la sala.
 *
 * ═══ LOS ÍNDICES, Y POR QUÉ UN `WeakMap` NO ROMPE LA PUREZA ═══
 *
 * La sala pregunta miles de veces por segundo «¿qué estado es el 7?», «¿qué hace la acción 12 de este
 * asiento?». Buscarlo en las listas de la declaración cada vez es lineal; construir un índice en cada
 * tic es basura. El índice se construye UNA vez por declaración y se recuerda en un `WeakMap` con la
 * declaración como llave: es una función pura de la declaración, así que recordarla no cambia ningún
 * resultado —sólo lo que cuesta—, y el `WeakMap` la suelta cuando la declaración se va.
 */
import { siguiente } from '../azar';
import type { Azar } from '../azar';
import type { Arena } from '../mundo';
import { MS_POR_TIC, TOPE_DE_TICS } from './declaracion';
import type {
  AccionDeclarada,
  ClaseDeEntidad,
  EstadoDeclarado,
  LimiteDelMundo,
  LizaDeclarada,
  PortableDeclarado,
  ProyectilDeclarado,
  PuestaDeEstado,
  ReglasDeAsiento,
  SitioDeNacer,
  VeredictoDeLaLiza,
  ZonaDelMundo,
} from './declaracion';
import { aCentesimas, PRIMER_NUMERO_DE_ENTIDAD, TOPE_DE_NUMERO } from './protocolo';
import type { CodigoDeIrse, SucesoDelTic } from './protocolo';
import type {
  AnuncioPendiente,
  BalaDeLaSala,
  Bienvenida,
  ContadoresDeAsiento,
  Correccion,
  CuerpoDeAsiento,
  EncuentroEnCurso,
  EntidadDeLaSala,
  EstadoDeLaSala,
  EstadoEnCurso,
  FaseEnCurso,
  MontonDeLaSala,
  SucesoDeLaSala,
} from './tipos-de-la-sala';

/* ─── LAS CONSTANTES DE LA SALA ──────────────────────────────────────────── */

/**
 * «Nunca», en tics de la sala: el `hastaTic` de un estado que no se acaba solo (el ausente, el sin
 * cuerpo que no vuelve). Entero y finito a propósito: `canonico.ts` rechaza `Infinity`.
 */
export const SIN_FIN = 2147483647;

/** Tras un `corrige`, cuánto se callan los `aqui` que ya venían de camino: un segundo, como en botas. */
export const SILENCIO_TRAS_CORREGIR_TICS = 20;

/** Lo que tarda una pulsación en salir del aparato, y lo que hace vivo a un `aqui`: son del contrato. */
export { AQUIS_PARA_ESTAR, TICS_DE_LA_VUELTA, TICS_DEL_AQUI } from './tipos-de-la-sala';

/** Cuántas esquivas recientes guarda un asiento: las que pueden decidir una ventana o un torpe. */
export const TOPE_DE_ESQUIVAS_RECIENTES = 8;

/** Los tipos de acción que un asiento puede mandar por el cable (`IndicesDelAsiento.tipo`). */
export const TIPO_DE_ACCION = { ninguna: 0, golpe: 1, esquiva: 2, rescate: 3, remate: 4, zona: 5 } as const;

/* ─── LOS TIPOS DEL ESTADO, CON EL NOMBRE QUE USAN LAS PIEZAS (ver la cabecera) ─── */

export type CuerpoInterno = CuerpoDeAsiento;
export type EntidadInterna = EntidadDeLaSala;
export type BalaInterna = BalaDeLaSala;
export type EstadoInterno = EstadoDeLaSala;

/* ─── LA COPIA DE TRABAJO ────────────────────────────────────────────────── */

/** Quita el `readonly` de primer nivel: la copia de trabajo sí se escribe. */
export type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** Un asiento en la copia de trabajo: él y sus contadores se escriben; sus listas, copiándolas. */
export type AsientoEnCurso = Omit<Mutable<CuerpoInterno>, 'contadores'> & { contadores: Mutable<ContadoresDeAsiento> };

/** Una entidad en la copia de trabajo. */
export type EntidadEnCurso = Mutable<EntidadInterna>;

/**
 * LO QUE LLEVA UN PASO MIENTRAS SE DA. Lo escriben las piezas; `cerrarPaso` lo convierte en el estado
 * nuevo y en lo que sale (`PasoDeLaSala`).
 */
export interface PasoEnCurso {
  /** El tic de la sala que se está dando: el de antes más uno. */
  readonly k: number;
  declaracion: LizaDeclarada;
  arena: Arena;
  indices: IndicesDeLaLiza;
  fase: FaseEnCurso;
  azar: Azar;
  readonly asientos: AsientoEnCurso[];
  entidades: EntidadEnCurso[];
  balas: BalaInterna[];
  montones: MontonDeLaSala[];
  anuncios: AnuncioPendiente[];
  encuentro: EncuentroEnCurso | null;
  recurso: number;
  siguienteNumero: number;
  siguienteAnuncio: number;
  readonly sucesos: SucesoDeLaSala[];
  readonly veredictos: VeredictoDeLaLiza[];
  readonly correcciones: Correccion[];
  readonly bienvenidas: Bienvenida[];
  /**
   * Los asientos que conectaron en este paso y aún no se han puesto al día: se les pone cuando acaban las
   * entradas, y entonces la lista se vacía. Mientras están aquí no se les anuncia nada: lo que se lance
   * antes de su puesta al día les llega DENTRO de ella, en su orden (ver `anunciar` en `combate.ts`).
   */
  readonly porPoner: number[];
  /** Un bit por asiento cuya `cuenta` cambió (se manda una al final del paso). */
  cuentaSucia: number;
  /** Un bit por asiento cuya carga cambió. */
  cargaSucia: number;
  recursoSucio: boolean;
  /** La zona de acción se apagó en este tic sin recurso para encender otra: el final lo lee (`encuentros.ts`). */
  zonaApagadaSinRecurso: boolean;
}

/** Abre la copia de trabajo del tic siguiente. Ver la cabecera. */
export function abrirPaso(sala: EstadoInterno): PasoEnCurso {
  const asientos: AsientoEnCurso[] = [];
  for (let i = 0; i < sala.asientos.length; i++) {
    const a = sala.asientos[i] as CuerpoInterno;
    asientos.push({ ...a, contadores: { ...a.contadores } });
  }
  const entidades: EntidadEnCurso[] = [];
  for (let i = 0; i < sala.entidades.length; i++) entidades.push({ ...(sala.entidades[i] as EntidadInterna) });
  return {
    k: sala.tic + 1,
    declaracion: sala.declaracion,
    arena: sala.arena,
    indices: indicesDe(sala.declaracion),
    fase: sala.fase,
    azar: sala.azar,
    asientos,
    entidades,
    balas: sala.balas.slice(),
    montones: sala.montones.slice(),
    anuncios: sala.anuncios.slice(),
    encuentro: sala.encuentro,
    recurso: sala.recurso,
    siguienteNumero: sala.siguienteNumero,
    siguienteAnuncio: sala.siguienteAnuncio,
    sucesos: [],
    veredictos: [],
    correcciones: [],
    bienvenidas: [],
    porPoner: [],
    cuentaSucia: 0,
    cargaSucia: 0,
    recursoSucio: false,
    zonaApagadaSinRecurso: false,
  };
}

/** El estado que deja el paso. */
export function cerrarPaso(p: PasoEnCurso): EstadoInterno {
  return {
    tic: p.k,
    declaracion: p.declaracion,
    arena: p.arena,
    fase: p.fase,
    azar: p.azar,
    asientos: p.asientos,
    entidades: p.entidades,
    balas: p.balas,
    montones: p.montones,
    anuncios: p.anuncios,
    encuentro: p.encuentro,
    recurso: p.recurso,
    siguienteNumero: p.siguienteNumero,
    siguienteAnuncio: p.siguienteAnuncio,
  };
}

/* ─── LO QUE SALE ────────────────────────────────────────────────────────── */

/** Apunta un suceso para `para` (0 = todos los canales; 1-15, ese asiento). */
export function contar(p: PasoEnCurso, para: number, suceso: SucesoDelTic): void {
  p.sucesos.push({ para, suceso });
}

/**
 * LA LÍNEA DE APUNTADO DE `e` CONTRA `a`, para `para` (0 = todos los canales, cada uno con el instante
 * en SU reloj): se fija en el tic en que `e` deja de apuntar, `cerebro.repiensaEnTic`. Ver `SucesoApunta`.
 */
export function contarApuntado(p: PasoEnCurso, e: EntidadEnCurso, a: number, para: number): void {
  const clase = p.indices.clases[e.clase];
  if (clase === undefined || clase.proyectil === 0) return;
  const fija = msDelTic(e.cerebro.repiensaEnTic);
  const x = aCentesimas(e.x);
  const z = aCentesimas(e.z);
  for (const s of p.asientos) {
    if (!s.conectado || (para !== 0 && s.numero !== para)) continue;
    contar(p, s.numero, { e: 'apunta', de: e.numero, a, p: clase.proyectil, x, z, t: fija + s.red.desfaseMs });
  }
}

/**
 * `e` DEJA DE APUNTAR SIN DISPARAR: si estaba apuntando, sale su `apunta` con `a` 0 y la línea se quita.
 * Se llama ANTES de cambiarle el modo; lo que sale de apuntar hacia la ráfaga no la llama (la línea se
 * fija sola en su instante).
 */
export function dejarDeApuntar(p: PasoEnCurso, e: EntidadEnCurso): void {
  if (e.cerebro.modo !== 'apuntar') return;
  const clase = p.indices.clases[e.clase];
  if (clase === undefined || clase.proyectil === 0) return;
  contar(p, 0, { e: 'apunta', de: e.numero, a: 0, p: clase.proyectil, x: aCentesimas(e.x), z: aCentesimas(e.z), t: 0 });
}

/** Marca que la `cuenta` de un asiento cambió: sale una al final del paso, no una por cada cambio. */
export function ensuciarCuenta(p: PasoEnCurso, numero: number): void {
  p.cuentaSucia |= 1 << numero;
}

/** Marca que lo que lleva un asiento cambió. */
export function ensuciarCarga(p: PasoEnCurso, numero: number): void {
  p.cargaSucia |= 1 << numero;
}

/* ─── LOS ÍNDICES DE UNA DECLARACIÓN (ver la cabecera) ───────────────────── */

/** Lo de cada asiento que se busca por id. */
export interface IndicesDelAsiento {
  /** Sus golpes por id (0-255). */
  readonly acciones: readonly (AccionDeclarada | undefined)[];
  /** Qué es cada id del cable para él (`TIPO_DE_ACCION`). */
  readonly tipo: Uint8Array;
}

/** Lo de una clase de entidad que se busca por id. */
export interface IndicesDeLaClase {
  readonly acciones: readonly (AccionDeclarada | undefined)[];
  /**
   * Las acciones con que el cerebro ABRE un ataque, en su orden: las que no van tras nada (`cadena:
   * null`) salvo la respuesta de su guardia, que es de la guardia (ver `GuardiaDeclarada.respuesta`).
   */
  readonly abren: readonly AccionDeclarada[];
}

export interface IndicesDeLaLiza {
  readonly estados: readonly (EstadoDeclarado | undefined)[];
  readonly clases: readonly (ClaseDeEntidad | undefined)[];
  readonly porClase: readonly (IndicesDeLaClase | undefined)[];
  readonly proyectiles: readonly (ProyectilDeclarado | undefined)[];
  readonly portables: readonly (PortableDeclarado | undefined)[];
  readonly zonas: readonly (ZonaDelMundo | undefined)[];
  /** Las zonas de cada clase, en el orden de la declaración. */
  readonly zonasDeLaClase: readonly (readonly ZonaDelMundo[] | undefined)[];
  readonly limites: readonly (LimiteDelMundo | undefined)[];
  readonly naceAsiento: readonly SitioDeNacer[];
  readonly naceReaparicion: readonly SitioDeNacer[];
  /** Los estados por los que un asiento no recibe turnos (`TurnosDeclarados.excluyen`). */
  readonly excluyen: readonly boolean[];
  readonly porAsiento: readonly IndicesDelAsiento[];
  /**
   * El grafo como listas de vecinos compactas: los vecinos del nudo `i` son
   * `vecinos[inicio[i]] … vecinos[inicio[i + 1] − 1]`.
   */
  readonly inicio: Int32Array;
  readonly vecinos: Int32Array;
}

const INDICES = new WeakMap<LizaDeclarada, IndicesDeLaLiza>();

/** Los índices de una declaración: construidos una vez y recordados (ver la cabecera). */
export function indicesDe(d: LizaDeclarada): IndicesDeLaLiza {
  const hecho = INDICES.get(d);
  if (hecho !== undefined) return hecho;
  const nuevo = construirIndices(d);
  INDICES.set(d, nuevo);
  return nuevo;
}

function porId<T extends { readonly id: number }>(lista: readonly T[]): (T | undefined)[] {
  const t: (T | undefined)[] = [];
  for (let i = 0; i < 256; i++) t.push(undefined);
  for (const x of lista) if (x.id >= 0 && x.id < 256) t[x.id] = x;
  return t;
}

function construirIndices(d: LizaDeclarada): IndicesDeLaLiza {
  const porClase: (IndicesDeLaClase | undefined)[] = [];
  for (let i = 0; i < 256; i++) porClase.push(undefined);
  for (const c of d.clases) {
    const abren: AccionDeclarada[] = [];
    const respuesta = c.guardia === null ? 0 : c.guardia.respuesta;
    for (const a of c.acciones) if (a.cadena === null && a.id !== respuesta) abren.push(a);
    porClase[c.id] = { acciones: porId(c.acciones), abren };
  }
  const zonasDeLaClase: (ZonaDelMundo[] | undefined)[] = [];
  for (let i = 0; i < 256; i++) zonasDeLaClase.push(undefined);
  for (const z of d.mundo.zonas) {
    if (z.clase < 0 || z.clase > 255) continue;
    const lista = zonasDeLaClase[z.clase];
    if (lista === undefined) zonasDeLaClase[z.clase] = [z];
    else lista.push(z);
  }
  const naceAsiento: SitioDeNacer[] = [];
  const naceReaparicion: SitioDeNacer[] = [];
  for (const s of d.mundo.nace) {
    if (s.papel === 'asiento') naceAsiento.push(s);
    else naceReaparicion.push(s);
  }
  const excluyen: boolean[] = [];
  for (let i = 0; i < 256; i++) excluyen.push(false);
  for (const e of d.turnos.excluyen) if (e >= 0 && e < 256) excluyen[e] = true;

  const remates: number[] = [];
  for (const c of d.clases) if (c.alCaer.tipo === 'rematable') remates.push(c.alCaer.remate.accion);
  const zona = d.fase.encuentro !== null && d.fase.encuentro.fin.tipo === 'salida' ? d.fase.encuentro.fin.zona.accion : 0;
  const porAsiento: IndicesDelAsiento[] = [];
  for (const r of d.asientos) porAsiento.push(indicesDelAsiento(r, remates, zona));

  /* El grafo, en listas compactas: se recorre en anchura muchas veces y no se quiere basura. */
  const cuantos = d.mundo.grafo.nudos.length;
  const grado = new Int32Array(cuantos + 1);
  for (const arista of d.mundo.grafo.aristas) {
    grado[arista[0]] = (grado[arista[0]] as number) + 1;
    grado[arista[1]] = (grado[arista[1]] as number) + 1;
  }
  const inicio = new Int32Array(cuantos + 1);
  for (let i = 0; i < cuantos; i++) inicio[i + 1] = (inicio[i] as number) + (grado[i] as number);
  const vecinos = new Int32Array(inicio[cuantos] as number);
  const puesto = new Int32Array(cuantos);
  for (const arista of d.mundo.grafo.aristas) {
    const [u, v] = arista;
    vecinos[(inicio[u] as number) + (puesto[u] as number)] = v;
    puesto[u] = (puesto[u] as number) + 1;
    vecinos[(inicio[v] as number) + (puesto[v] as number)] = u;
    puesto[v] = (puesto[v] as number) + 1;
  }

  return {
    estados: porId(d.estados),
    clases: porId(d.clases),
    porClase,
    proyectiles: porId(d.proyectiles),
    portables: porId(d.portables),
    zonas: porId(d.mundo.zonas),
    zonasDeLaClase,
    limites: porId(d.mundo.limites),
    naceAsiento,
    naceReaparicion,
    excluyen,
    porAsiento,
    inicio,
    vecinos,
  };
}

function indicesDelAsiento(r: ReglasDeAsiento, remates: readonly number[], zona: number): IndicesDelAsiento {
  const tipo = new Uint8Array(256);
  for (const a of r.acciones) tipo[a.id] = TIPO_DE_ACCION.golpe;
  tipo[r.esquiva.accion] = TIPO_DE_ACCION.esquiva;
  tipo[r.rescate.accion] = TIPO_DE_ACCION.rescate;
  for (const id of remates) tipo[id] = TIPO_DE_ACCION.remate;
  if (zona !== 0) tipo[zona] = TIPO_DE_ACCION.zona;
  return { acciones: porId(r.acciones), tipo };
}

/* ─── LOS ESTADOS DE LOS CUERPOS ─────────────────────────────────────────── */

/** El estado en que está un cuerpo EN el tic `tic`, o `null` si está libre. */
export function enCurso(e: EstadoEnCurso | null, tic: number): EstadoEnCurso | null {
  return e !== null && tic >= e.desdeTic && tic < e.hastaTic ? e : null;
}

/** ¿Es intocable en el tic `tic`? (Ver `PuestaDeEstado.intocableTics`: los primeros tics del estado.) */
export function intocableEn(e: EstadoEnCurso | null, tic: number): boolean {
  return e !== null && tic >= e.desdeTic && tic < e.intocableHastaTic;
}

/**
 * Una puesta de estado que empieza en el tic `desde` de la sala, alargada `masTics` (lo que añade un
 * choque). `desde` puede ser un tic pasado: el efecto de un impacto empieza en el impacto, aunque la sala
 * lo resuelva un `comp` después.
 */
export function puestaDesde(puesta: PuestaDeEstado, desde: number, masTics: number): EstadoEnCurso {
  return {
    estado: puesta.estado,
    desdeTic: desde,
    hastaTic: desde + puesta.tics + masTics,
    intocableHastaTic: desde + puesta.intocableTics,
    soltableEnTic: desde + puesta.soltableDesdeTic,
    distanciaExtra: puesta.distanciaExtra,
  };
}

/** Un estado sin fin (el ausente, el sin cuerpo que no vuelve): intocable entero y sin soltarse. */
export function estadoSinFin(estado: number, desde: number): EstadoEnCurso {
  return { estado, desdeTic: desde, hastaTic: SIN_FIN, intocableHastaTic: SIN_FIN, soltableEnTic: SIN_FIN, distanciaExtra: 0 };
}

/**
 * El suceso `estado` de un cuerpo que entra en `e`, con lo que LE QUEDA desde el tic `k` (el lector del
 * aparato admite hasta `TOPE_DE_TICS`: un estado sin fin se cuenta como una hora). `null` si ya acabó.
 */
export function sucesoDeEstado(numero: number, e: EstadoEnCurso | null, k: number): SucesoDelTic | null {
  if (e === null) return { e: 'estado', a: numero, est: 0, tics: 0, into: 0 };
  const quedan = e.hastaTic - k;
  if (quedan <= 0) return null;
  const tics = quedan > TOPE_DE_TICS ? TOPE_DE_TICS : quedan;
  let into = e.intocableHastaTic - k;
  if (into < 0) into = 0;
  if (into > tics) into = tics;
  return { e: 'estado', a: numero, est: e.estado, tics, into };
}

/**
 * ¿PUEDE EMPEZAR LA ACCIÓN `accion` QUIEN ESTÁ EN `e`? `LIBRE` si nada lo impide y el estado sigue;
 * `CORTA` si puede pero empezarla termina el estado (la cancela o ya se suelta); `NO` si no.
 * Ver `EstadoDeclarado.bloqueaAccion` y `PuestaDeEstado.soltableDesdeTic`.
 */
export const PUEDE = { no: 0, libre: 1, corta: 2 } as const;
export type Puede = (typeof PUEDE)[keyof typeof PUEDE];

export function puedeEmpezar(indices: IndicesDeLaLiza, e: EstadoEnCurso | null, accion: number, k: number): Puede {
  const activo = enCurso(e, k);
  if (activo === null) return PUEDE.libre;
  const declarado = indices.estados[activo.estado];
  if (declarado === undefined || !declarado.bloqueaAccion) return PUEDE.libre;
  if (declarado.cancelaCon.indexOf(accion) >= 0) return PUEDE.corta;
  if (k >= activo.soltableEnTic) return PUEDE.corta;
  return PUEDE.no;
}

/** ¿Bloquea el paso el estado activo? */
export function bloqueaElPaso(indices: IndicesDeLaLiza, e: EstadoEnCurso | null, k: number): boolean {
  const activo = enCurso(e, k);
  if (activo === null) return false;
  const declarado = indices.estados[activo.estado];
  return declarado !== undefined && declarado.bloqueaPaso;
}

/** ¿Bloquea las acciones el estado activo (sin mirar si se suelta)? */
export function bloqueaLaAccion(indices: IndicesDeLaLiza, e: EstadoEnCurso | null, k: number): boolean {
  const activo = enCurso(e, k);
  if (activo === null) return false;
  const declarado = indices.estados[activo.estado];
  return declarado !== undefined && declarado.bloqueaAccion;
}

/* ─── LOS NÚMEROS Y EL TIEMPO ────────────────────────────────────────────── */

/**
 * UN NÚMERO LIBRE para una entidad, una bala o un montón: el siguiente que no esté vivo, dando la vuelta
 * del 65535 al 16. Los que se fueron no se reutilizan hasta la vuelta siguiente: así un `seva` y el `nace`
 * de otro con el mismo número no caen nunca en el mismo tic.
 */
export function nuevoNumero(p: PasoEnCurso): number {
  let n = p.siguienteNumero;
  for (let intentos = 0; intentos <= TOPE_DE_NUMERO; intentos++) {
    if (n > TOPE_DE_NUMERO || n < PRIMER_NUMERO_DE_ENTIDAD) n = PRIMER_NUMERO_DE_ENTIDAD;
    if (!numeroOcupado(p, n)) break;
    n++;
  }
  p.siguienteNumero = n + 1 > TOPE_DE_NUMERO ? PRIMER_NUMERO_DE_ENTIDAD : n + 1;
  return n;
}

function numeroOcupado(p: PasoEnCurso, n: number): boolean {
  for (const e of p.entidades) if (e.numero === n) return true;
  for (const b of p.balas) if (b.numero === n) return true;
  for (const m of p.montones) if (m.numero === n) return true;
  return false;
}

/** El instante en ms de la sala del tic `tic`. */
export function msDelTic(tic: number): number {
  return tic * MS_POR_TIC;
}

/** El tic de la sala al que pertenece un instante en ms de la sala. */
export function ticDelMs(ms: number): number {
  return Math.floor(ms / MS_POR_TIC);
}

/** Los tics enteros que cubren `ms` milisegundos (hacia arriba). */
export function ticsQueCubren(ms: number): number {
  return ms <= 0 ? 0 : Math.ceil(ms / MS_POR_TIC);
}

/** Un número del azar de la sala en `[0, n)`, avanzándolo. `n` ≥ 1. */
export function tirar(p: PasoEnCurso, n: number): number {
  const t = siguiente(p.azar);
  p.azar = t.azar;
  return Math.floor(t.valor * n);
}

/** Las filas del bit de un asiento: el bit `n` es el asiento `n` (1-15 caben de sobra en 32 bits). */
export function bitDe(numero: number): number {
  return 1 << numero;
}
