/**
 * EL CUERPO DE UN ASIENTO EN LA SALA: dónde está, cuánto puede andar, en qué estado está y qué sitios
 * declaró. Es una pieza de `sala.ts` (ver `tipos-de-la-sala.ts`).
 *
 * ═══ EL APARATO ANDA, LA SALA VALIDA EL SITIO ═══
 *
 * Es el modelo de Boots on Board, y por lo mismo: el paso se predice en el aparato para que responda
 * en el mismo fotograma, y la sala sólo dice si el sitio que le cuentan es posible. La validación de un
 * `aqui`, en su orden (cada paso que falla corrige y los de después no se miran):
 *
 *   0. SIN CUERPO NO SE ANDA. Quien salió o espera volver no manda `aqui`; si lo manda, se ignora.
 *   1. EL TIC CRECE. Un `n` que no pasa del último de ESTE canal es viejo o repetido: se ignora.
 *   2. EL SILENCIO TRAS CORREGIR. Tras un `corrige`, lo que ya venía de camino —los `aqui` que el
 *      aparato mandó ANTES de que el `corrige` le llegara— se ignora sin contestar durante
 *      `SILENCIO_TRAS_CORREGIR_TICS`, salvo lo que esté a un tic del sitio corregido. Contestar a cada
 *      uno con otro `corrige` haría saltar atrás al aparato una vez por paso en vuelo (lo midió Boots on
 *      Board; ver `botas/canal.ts`). Cuáles venían de camino lo dice su `n` (ver `enVueloHastaN`): la
 *      primera versión lo decidía por la distancia, y la esquiva que el aparato empezaba desde el sitio
 *      corregido —pasos de más de un tic de andar— se callaba entera y acababa en un segundo `corrige`.
 *   3. EL PRESUPUESTO CORTO. Se rellena a `presupuestoCorto.velocidad` por tic de la sala, hasta
 *      `acumulaTics` de ellos: los `aqui` que llegan juntos tras un tirón de red caben. Lo que da la
 *      distancia extra (una esquiva, un avance, un empujón) SE SUMA al presupuesto y le deja pasar de
 *      su tope hasta `extraHastaTic`; un estado que bloquea el paso lo deja en lo suyo y nada más.
 *   4. LA ESTRUCTURA. El tramo desde el último sitio bueno se anda en línea recta (`seAndaEnRecta`, con
 *      el radio del asiento). Y una tolerancia medida en botas: un tramo de UN TIC DEL APARATO que no
 *      pasa en recta pero sí en ESCUADRA —un eje y luego el otro— se admite, porque el paso del aparato
 *      (`unPaso`) mira sólo la llegada y en diagonal muerde esquinas que la recta no deja. Un tic del
 *      aparato, y no «un paso de andar»: los pasos de una esquiva son más largos y muerden igual (el
 *      revisor vio 13 esquivas de 2208 junto al quiosco corregidas por eso).
 *   5. EL LÍMITE DE LA FASE. No es una caja con la que se choca sino una regla de la sala: un centro
 *      fuera del límite es un sitio que no se acepta.
 *   6. EL PRESUPUESTO LARGO. En cualquier ventana de `enTics` no más de `distancia`. Lo suspende la
 *      distancia extra: un empujón de cinco metros no es ir con holgura permanente.
 *
 * ═══ EL RASTRO VA EN EL TIC DEL APARATO, NO EN EL DE LLEGADA ═══
 *
 * Cada sitio aceptado se apunta en el rastro con el tic de la SALA al que corresponde SU `n`
 * (`floor((n·50 − desfase) / 50)`), no con el tic en que llegó: una bala se juzga contra el sitio que el
 * blanco declaró para ESE tic (ver `proyectiles.ts`), y el `aqui` que lo dice llega media ida y vuelta
 * después. Con el tic de llegada, la red decidiría quién esquiva.
 */
import { seAndaEnRecta, sePuedeEstar } from '../mundo';
import { UNO } from '../fijo';
import { TICS_POR_SEGUNDO } from '../andar';
import { AQUIS_PARA_ESTAR, TICS_DE_LA_VUELTA, TOPE_DEL_RASTRO } from './tipos-de-la-sala';
import type { EntradaAqui, EstadoEnCurso, RedDelAsiento, SitioEnElTic } from './tipos-de-la-sala';
import type { CajaDeLaLiza, LizaDeclarada, PapelDeNacer, PuestaDeEstado, ReglasDeAsiento, SitioDeNacer } from './declaracion';
import { puntoDelTramo } from './geometria';
import { MS_POR_TIC } from './declaracion';
import {
  bloqueaElPaso,
  contar,
  enCurso,
  estadoSinFin,
  msDelTic,
  puestaDesde,
  SILENCIO_TRAS_CORREGIR_TICS,
  sucesoDeEstado,
  TICS_DEL_AQUI,
  ticsQueCubren,
} from './paso-en-curso';
import type { AsientoEnCurso, EntidadEnCurso, PasoEnCurso } from './paso-en-curso';

/* ─── LA RED ─────────────────────────────────────────────────────────────── */

/** La red de un asiento con una medida nueva: `comp = min(rtt/2 + compBaseMs, compTopeMs)`. */
export function redDelAsiento(d: LizaDeclarada, rttMs: number, desfaseMs: number): RedDelAsiento {
  const rtt = rttMs < 0 ? 0 : Math.floor(rttMs);
  const comp = Math.floor(rtt / 2) + d.red.compBaseMs;
  return { rttMs: rtt, compMs: comp > d.red.compTopeMs ? d.red.compTopeMs : comp, desfaseMs: Math.floor(desfaseMs) };
}

/** El `comp` de un asiento en tics de la sala, hacia arriba. */
export function compTics(a: AsientoEnCurso): number {
  return ticsQueCubren(a.red.compMs);
}

/**
 * EL TIC DE LA SALA DE UNA PULSACIÓN: `floor((ms − desfase) / 50)`, con el desfase que la E/S tenía al
 * recibirla. Acotado: no antes de un `comp` y un tic atrás —la pulsación no puede haber viajado más que
 * eso: la red y el tic en que el `aqui` que la lleva sale del aparato (`TICS_DEL_AQUI`)— ni después de
 * ahora —una pulsación del futuro es un aparato que miente, y se toma como «ahora»—.
 */
export function ticDeLaPulsacion(p: PasoEnCurso, a: AsientoEnCurso, ms: number, desfaseMs: number): number {
  const t = Math.floor((ms - desfaseMs) / 50);
  const desde = p.k - compTics(a) - TICS_DEL_AQUI;
  if (t > p.k) return p.k;
  if (t < desde) return desde;
  return t;
}

/* ─── LOS PRESUPUESTOS ───────────────────────────────────────────────────── */

/** Lo que el presupuesto corto se rellena en un tic (Q16.16). */
export function corteDelTic(reglas: ReglasDeAsiento): number {
  return Math.floor(reglas.cuerpo.presupuestoCorto.velocidad / TICS_POR_SEGUNDO);
}

/** El tope del presupuesto corto (Q16.16): `acumulaTics` tics de su velocidad. */
export function topeDelCorto(reglas: ReglasDeAsiento): number {
  return Math.floor((reglas.cuerpo.presupuestoCorto.velocidad * reglas.cuerpo.presupuestoCorto.acumulaTics) / TICS_POR_SEGUNDO);
}

/**
 * La gracia de la distancia extra: lo que tarda en llegar el último `aqui` del recorrido que la dio.
 * Un `comp` —media ida y vuelta con su margen— y dos tics más por el tic en que el aparato lo manda.
 */
function graciaDelExtra(a: AsientoEnCurso): number {
  return compTics(a) + 2;
}

/**
 * LE ADMITE `distancia` MÁS hasta el tic `hastaTic` (más la gracia): una esquiva que desplaza, un avance,
 * un empujón que recibe, el vuelo de una esquiva limpia contra una bala. Ver la cabecera.
 */
export function darExtra(a: AsientoEnCurso, distancia: number, hastaTic: number): void {
  if (distancia <= 0) return;
  a.presupuestoCorto += distancia;
  const hasta = hastaTic + graciaDelExtra(a);
  if (hasta > a.extraHastaTic) a.extraHastaTic = hasta;
}

/**
 * EL RELLENO DE CADA TIC. Quien está en un estado que bloquea el paso no rellena; la distancia extra que
 * ya pasó su gracia se recorta al tope (o a cero, si sigue bloqueado).
 */
export function rellenarPresupuestos(p: PasoEnCurso): void {
  for (let i = 0; i < p.asientos.length; i++) {
    const a = p.asientos[i] as AsientoEnCurso;
    if (!a.conCuerpo) continue;
    const reglas = p.declaracion.asientos[i] as ReglasDeAsiento;
    const tope = topeDelCorto(reglas);
    const bloqueado = bloqueaElPaso(p.indices, a.estado, p.k);
    if (!bloqueado && a.presupuestoCorto < tope) {
      const lleno = a.presupuestoCorto + corteDelTic(reglas);
      a.presupuestoCorto = lleno > tope ? tope : lleno;
    }
    if (p.k >= a.extraHastaTic) {
      if (bloqueado) a.presupuestoCorto = 0;
      else if (a.presupuestoCorto > tope) a.presupuestoCorto = tope;
    }
  }
}

/* ─── LOS ESTADOS DE UN ASIENTO ──────────────────────────────────────────── */

/**
 * PONE A UN ASIENTO EN UN ESTADO (o lo deja libre con `null`) y lo cuenta a todos. Si el estado bloquea
 * el paso, el presupuesto se queda en la distancia extra del estado y nada más; si no, la extra se suma.
 * Un estado que ya acabó (empezó en el pasado y es más corto que el retraso) no se pone.
 */
export function ponerEstado(p: PasoEnCurso, a: AsientoEnCurso, e: EstadoEnCurso | null): void {
  if (e !== null && e.hastaTic <= p.k) return;
  a.estado = e;
  const suceso = sucesoDeEstado(a.numero, e, p.k);
  if (suceso !== null) contar(p, 0, suceso);
  if (e === null) return;
  const declarado = p.indices.estados[e.estado];
  if (declarado !== undefined && declarado.bloqueaPaso) {
    a.presupuestoCorto = e.distanciaExtra;
    if (e.distanciaExtra > 0) {
      const hasta = e.hastaTic + graciaDelExtra(a);
      if (hasta > a.extraHastaTic) a.extraHastaTic = hasta;
    }
  } else {
    darExtra(a, e.distanciaExtra, e.hastaTic);
  }
}

/** Pone una puesta de estado desde el tic `desde`, alargada `masTics`. */
export function ponerPuesta(p: PasoEnCurso, a: AsientoEnCurso, puesta: PuestaDeEstado, desde: number, masTics: number): void {
  ponerEstado(p, a, puestaDesde(puesta, desde, masTics));
}

/** Si está en un estado, lo termina y lo cuenta («libre»). */
export function librar(p: PasoEnCurso, a: AsientoEnCurso): void {
  if (enCurso(a.estado, p.k) === null) {
    a.estado = null;
    return;
  }
  ponerEstado(p, a, null);
}

/** Lo mismo para una entidad (no tiene presupuesto: la mueve la sala). */
export function ponerEstadoALaEntidad(p: PasoEnCurso, e: EntidadEnCurso, estado: EstadoEnCurso | null): void {
  if (estado !== null && estado.hastaTic <= p.k) return;
  e.estado = estado;
  const suceso = sucesoDeEstado(e.numero, estado, p.k);
  if (suceso !== null) contar(p, 0, suceso);
}

/* ─── EL RASTRO ──────────────────────────────────────────────────────────── */

/**
 * Apunta un sitio en el rastro en el tic `tic` de la sala. El rastro va siempre hacia delante: un sitio
 * de un tic que no pasa del último (el desfase se afinó entre dos `aqui`) sustituye al último. Se copia
 * al escribirlo: el del estado de antes no se toca.
 */
export function apuntarEnElRastro(a: AsientoEnCurso, tic: number, x: number, z: number): void {
  const viejo = a.rastro;
  const ultimo = viejo.length > 0 ? (viejo[viejo.length - 1] as SitioEnElTic) : null;
  let nuevo: SitioEnElTic[];
  if (ultimo !== null && tic <= ultimo.tic) {
    nuevo = viejo.slice(0, viejo.length - 1);
    nuevo.push({ tic: ultimo.tic, x, z });
  } else {
    nuevo = viejo.length >= TOPE_DEL_RASTRO ? viejo.slice(viejo.length - TOPE_DEL_RASTRO + 1) : viejo.slice();
    nuevo.push({ tic, x, z });
  }
  a.rastro = nuevo;
}

/**
 * EL SITIO QUE EL ASIENTO DECLARÓ PARA EL TIC `tic`: el último del rastro con tic ≤ `tic` (se estuvo
 * ahí hasta el siguiente). `null` si el rastro no llega tan atrás o está vacío: entonces vale su sitio
 * de ahora.
 */
export function sitioEnElTic(a: AsientoEnCurso, tic: number): SitioEnElTic | null {
  const r = a.rastro;
  for (let i = r.length - 1; i >= 0; i--) {
    const s = r[i] as SitioEnElTic;
    if (s.tic <= tic) return s;
  }
  return null;
}

/* ─── EL LÍMITE DE LA FASE Y LOS SITIOS DE NACER ─────────────────────────── */

/** ¿Está el centro `(x, z)` dentro del límite de la fase? Bordes incluidos (ver `LimiteDelMundo`). */
export function dentroDelLimite(p: PasoEnCurso, x: number, z: number): boolean {
  const l = p.indices.limites[p.declaracion.fase.limite];
  if (l === undefined) return true;
  return x >= l.caja.x0 && x <= l.caja.x1 && z >= l.caja.z0 && z <= l.caja.z1;
}

/**
 * EL TRAMO `(sx, sz) → (ex, ez)` RECORTADO AL LÍMITE DE LA FASE, como fracción Q16.16 del tramo (UNO =
 * entero). Se recorta a lo largo del tramo y no por ejes: recortar un vector por ejes le cambia el rumbo.
 * Si el origen ya está fuera, 0.
 */
export function fraccionDentroDelLimite(p: PasoEnCurso, sx: number, sz: number, ex: number, ez: number): number {
  return fraccionDentroDeLaCaja(p.indices.limites[p.declaracion.fase.limite]?.caja, sx, sz, ex, ez);
}

/**
 * Lo mismo contra una caja cualquiera (`undefined` = sin límite): la pregunta pura, sin el paso, para
 * que el aparato recorte igual que la sala (ver `paradaDeLaBalaEn` en `proyectiles.ts`).
 */
export function fraccionDentroDeLaCaja(c: CajaDeLaLiza | undefined, sx: number, sz: number, ex: number, ez: number): number {
  if (c === undefined) return UNO;
  if (sx < c.x0 || sx > c.x1 || sz < c.z0 || sz > c.z1) return 0;
  let f = UNO;
  const dx = ex - sx;
  const dz = ez - sz;
  if (ex > c.x1) f = menor(f, Math.floor(((c.x1 - sx) * UNO) / dx));
  if (ex < c.x0) f = menor(f, Math.floor(((c.x0 - sx) * UNO) / dx));
  if (ez > c.z1) f = menor(f, Math.floor(((c.z1 - sz) * UNO) / dz));
  if (ez < c.z0) f = menor(f, Math.floor(((c.z0 - sz) * UNO) / dz));
  return f < 0 ? 0 : f;
}

function menor(a: number, b: number): number {
  return a < b ? a : b;
}

/** El sitio de nacer de un asiento para un papel: el `i` usa el `i` módulo cuántos haya. */
export function sitioDeNacer(p: PasoEnCurso, numero: number, papel: PapelDeNacer): SitioDeNacer {
  const lista = papel === 'asiento' ? p.indices.naceAsiento : p.indices.naceReaparicion;
  const respaldo = papel === 'asiento' ? p.indices.naceReaparicion : p.indices.naceAsiento;
  const usar = lista.length > 0 ? lista : respaldo;
  return usar[(numero - 1) % usar.length] as SitioDeNacer;
}

/**
 * LA SALA MUEVE A UN ASIENTO: al empezar una fase fuera del límite nuevo, al reaparecer. Su rastro
 * vuelve a empezar ahí, su presupuesto se llena y, si tiene canal, se le manda un `corrige` para que el
 * aparato lo sepa; el silencio de después se come lo que ya venía de camino desde el sitio viejo. Sin
 * canal no se le manda nada: cuando conecte, su `dentro` ya dirá dónde está.
 */
export function recolocar(p: PasoEnCurso, a: AsientoEnCurso, reglas: ReglasDeAsiento, x: number, z: number, mira: number): void {
  a.x = x;
  a.z = z;
  a.mira = mira;
  a.marcha = 0;
  a.nDelSitio = -1;
  a.rastro = [{ tic: p.k, x, z }];
  a.tramosRecientes = [];
  a.presupuestoCorto = topeDelCorto(reglas);
  if (!a.conectado) return;
  mandarCorrige(p, a, a.ultimoTicDelAparato + 1, x, z);
}

/* ─── LA VALIDACIÓN DE UN `aqui` ─────────────────────────────────────────── */

/** El largo de `(dx, dz)` en Q16.16, hacia abajo. Exacto: los cuadrados caben en 2^53 dentro de la liza. */
export function largo(dx: number, dz: number): number {
  return Math.floor(Math.sqrt(dx * dx + dz * dz));
}

/** Una esquina para probar la escuadra, sin crear un objeto por pregunta. */
const ESQUINA = { x: 0, z: 0 };

/**
 * ¿Se anda de `desde` a `hasta`? La recta, y la escuadra si el tramo es de un tic: de un tic del aparato
 * (`unTicDelAparato`), o no más largo que un tic de andar (ver la cabecera).
 */
function seAndaElTramo(
  p: PasoEnCurso,
  desde: { x: number; z: number },
  hasta: { x: number; z: number },
  radio: number,
  unTic: number,
  unTicDelAparato: boolean,
): boolean {
  if (seAndaEnRecta(p.arena, desde, hasta, radio)) return true;
  const dx = hasta.x - desde.x;
  const dz = hasta.z - desde.z;
  if (dx === 0 || dz === 0) return false;
  if (!unTicDelAparato && largo(dx, dz) > unTic) return false;
  ESQUINA.x = hasta.x;
  ESQUINA.z = desde.z;
  if (seAndaEnRecta(p.arena, desde, ESQUINA, radio) && seAndaEnRecta(p.arena, ESQUINA, hasta, radio)) return true;
  ESQUINA.x = desde.x;
  ESQUINA.z = hasta.z;
  return seAndaEnRecta(p.arena, desde, ESQUINA, radio) && seAndaEnRecta(p.arena, ESQUINA, hasta, radio);
}

/** Manda `corrige` a este asiento por su tic `n`: vuelve a su último sitio bueno. */
function corregir(p: PasoEnCurso, a: AsientoEnCurso, n: number): void {
  mandarCorrige(p, a, n, a.x, a.z);
}

/**
 * UN `corrige` A `(x, z)` POR EL TIC `n` DEL APARATO, y el silencio que le sigue: desde este tic se callan
 * los `aqui` que ya venían de camino, que son los de `n` hasta `enVueloHastaN`.
 *
 * ═══ CUÁNDO LE LLEGA EL `corrige` AL APARATO, EN SU RELOJ ═══
 *
 * Sale al acabar este tic de la sala y tarda media ida y vuelta: llega en `k·50 + rtt/2` de la sala, que
 * en el reloj del aparato es eso más su desfase. Lo que el aparato mandó hasta ese tic suyo salió desde
 * el sitio malo; lo de después, desde el corregido. Un tic de margen por lo que la estimación del desfase
 * y una ida y vuelta asimétrica mueven ese instante: un `aqui` bueno que se calla de más sólo pierde su
 * sitio (el siguiente lo trae entero, que los sitios son absolutos); uno malo que se validara de menos
 * costaría otro `corrige`.
 *
 * `n` es 0 cuando se recoloca a quien acaba de conectar sin haber dicho nada todavía: el `corrige` lo
 * admite (ver `Corrige` en `protocolo.ts`).
 */
function mandarCorrige(p: PasoEnCurso, a: AsientoEnCurso, n: number, x: number, z: number): void {
  p.correcciones.push({ asiento: a.numero, n: n < 0 ? 0 : n, x, z });
  a.corregidoEnTic = p.k;
  const llega = msDelTic(p.k) + Math.ceil(a.red.rttMs / 2) + a.red.desfaseMs;
  a.enVueloHastaN = Math.floor(llega / MS_POR_TIC) + 1;
}

/**
 * Lo que pasó con un `aqui`: `tirado` (sin cuerpo, o `n` viejo: ni su acción cuenta), `aceptado`,
 * `callado` (lo que venía de camino tras un `corrige`), o por qué se corrigió.
 */
export type ResultadoDelAqui = 'tirado' | 'aceptado' | 'callado' | 'presupuesto' | 'estructura' | 'limite' | 'largo' | 'repetida';

/**
 * VALIDA UN `aqui`: el orden de la cabecera. No mira la acción: ésa la atiende `combate.ts` después, si
 * el `aqui` no se tiró (una pulsación es una pulsación aunque el sitio se corrija).
 */
export function validarAqui(p: PasoEnCurso, a: AsientoEnCurso, e: EntradaAqui): ResultadoDelAqui {
  if (!a.conCuerpo) return 'tirado';
  if (e.n <= a.ultimoTicDelAparato) return 'tirado';
  const anterior = a.ultimoTicDelAparato;
  a.ultimoTicDelAparato = e.n;
  a.ultimoAquiEnTic = p.k;
  a.mira = e.r;
  const tic = ticDelAqui(p, e);
  /*
   * ¿ES UN `aqui` VIVO? El que cierra una racha de tics del aparato seguidos (ver `AQUIS_PARA_ESTAR` en
   * `tipos-de-la-sala.ts`). Y ¿JUEGA? El que pulsa algo o se mueve: una pestaña oculta no hace ninguna de
   * las dos cosas. Cualquiera de los dos aleja el ausente; sólo el vivo lo acaba. Se mira ANTES de validar
   * el sitio: un aparato despierto que dice un sitio malo sigue despierto.
   */
  a.aquisSeguidos = e.n === anterior + 1 ? a.aquisSeguidos + 1 : 1;
  const vivo = a.aquisSeguidos >= AQUIS_PARA_ESTAR;
  const juega = e.accion !== null || e.x !== a.x || e.z !== a.z;
  if (vivo || juega) a.vivoEnTic = p.k;
  /*
   * VOLVER DEL AUSENTE, al primer `aqui` vivo (con «basta con decir algo», la ráfaga de una pestaña frenada
   * lo devolvía cada segundo: ver `tipos-de-la-sala.ts`). Se valida el sitio DESPUÉS: el `aqui` que lo
   * devuelve lo manda un aparato que sabía que estaba ausente, quieto donde se quedó.
   */
  const activo = enCurso(a.estado, p.k);
  if (vivo && activo !== null && activo.estado === p.declaracion.presencia.estadoAusente) volverDelAusente(p, a, activo);
  if (p.declaracion.fase.modo === 'quieta') return 'aceptado';

  const reglas = p.declaracion.asientos[a.numero - 1] as ReglasDeAsiento;
  const dx = e.x - a.x;
  const dz = e.z - a.z;
  const unTic = corteDelTic(reglas);
  if (dx === 0 && dz === 0) {
    a.marcha = e.m;
    a.corregidoEnTic = -1;
    a.nDelSitio = e.n;
    apuntarEnElRastro(a, tic, a.x, a.z);
    return 'aceptado';
  }
  const d = largo(dx, dz);

  if (a.corregidoEnTic >= 0 && d > unTic && e.n <= a.enVueloHastaN) {
    if (p.k - a.corregidoEnTic < SILENCIO_TRAS_CORREGIR_TICS) return 'callado';
    corregir(p, a, e.n);
    return 'repetida';
  }
  if (d > a.presupuestoCorto) {
    corregir(p, a, e.n);
    return 'presupuesto';
  }
  if (!seAndaElTramo(p, a, e, reglas.cuerpo.radio, unTic, a.nDelSitio >= 0 && e.n === a.nDelSitio + 1)) {
    corregir(p, a, e.n);
    return 'estructura';
  }
  if (!dentroDelLimite(p, e.x, e.z)) {
    corregir(p, a, e.n);
    return 'limite';
  }
  if (p.k >= a.extraHastaTic) {
    const ventana = reglas.cuerpo.presupuestoLargo.enTics;
    const tramos = a.tramosRecientes;
    let primero = 0;
    while (primero < tramos.length && (tramos[primero] as { tic: number }).tic <= p.k - ventana) primero++;
    let suma = 0;
    for (let i = primero; i < tramos.length; i++) suma += (tramos[i] as { distancia: number }).distancia;
    if (suma + d > reglas.cuerpo.presupuestoLargo.distancia) {
      corregir(p, a, e.n);
      return 'largo';
    }
    const nuevos = tramos.slice(primero);
    nuevos.push({ tic: p.k, distancia: d });
    a.tramosRecientes = nuevos;
  }
  a.presupuestoCorto -= d;
  a.x = e.x;
  a.z = e.z;
  a.marcha = e.m;
  a.corregidoEnTic = -1;
  a.nDelSitio = e.n;
  apuntarEnElRastro(a, tic, e.x, e.z);
  return 'aceptado';
}

/** El tic de la SALA al que corresponde el `n` de un `aqui` (ver la cabecera), sin pasar de ahora. */
function ticDelAqui(p: PasoEnCurso, e: EntradaAqui): number {
  const t = Math.floor((e.n * 50 - e.desfaseMs) / 50);
  if (t > p.k) return p.k;
  if (t < p.k - TOPE_DEL_RASTRO) return p.k - TOPE_DEL_RASTRO;
  return t;
}

/* ─── LA PRESENCIA ───────────────────────────────────────────────────────── */

/**
 * VUELVE DEL AUSENTE: suma el rato a lo que lleva ausente en la fase y, en un encuentro, entra en su VUELTA
 * —la puesta de quien reaparece, recortada a `TICS_DE_LA_VUELTA`: medio segundo de intocable para ver lo
 * que tiene delante—, que se acaba en cuanto empieza una acción (`atenderLaAccionDelAqui`, en
 * `combate.ts`). Fuera de un encuentro, libre. Por qué así, en `AQUIS_PARA_ESTAR` (`tipos-de-la-sala.ts`).
 */
function volverDelAusente(p: PasoEnCurso, a: AsientoEnCurso, ausente: EstadoEnCurso): void {
  a.ausenteAcumulado += p.k - ausente.desdeTic;
  if (p.declaracion.fase.modo !== 'encuentro') {
    ponerEstado(p, a, null);
    return;
  }
  const e = puestaDesde(p.declaracion.equipo.reaparicion.puesta, p.k, 0);
  const tope = p.k + TICS_DE_LA_VUELTA;
  const hasta = e.hastaTic < tope ? e.hastaTic : tope;
  ponerEstado(p, a, {
    ...e,
    hastaTic: hasta,
    intocableHastaTic: e.intocableHastaTic < hasta ? e.intocableHastaTic : hasta,
    soltableEnTic: e.soltableEnTic < hasta ? e.soltableEnTic : hasta,
  });
  a.vueltaHastaTic = hasta;
}

/** ¿Está en la VUELTA del ausente (y no en otra cosa que se le haya puesto encima)? */
export function enLaVuelta(p: PasoEnCurso, a: AsientoEnCurso): boolean {
  if (p.k >= a.vueltaHastaTic) return false;
  const activo = enCurso(a.estado, p.k);
  return activo !== null && activo.estado === p.declaracion.equipo.reaparicion.puesta.estado && activo.hastaTic === a.vueltaHastaTic;
}

/**
 * EL AUSENTE MOMENTÁNEO (ver `PresenciaDeclarada`): sin un `aqui` VIVO ni uno que juegue durante
 * `ausenteTrasTics` (ver `AQUIS_PARA_ESTAR` en `tipos-de-la-sala.ts`), quien está en pie pasa al estado ausente —intocable, fuera
 * de los turnos, y sin andar ni pegar— hasta su próximo `aqui` vivo. Sólo en el modo encuentro. Al pasar,
 * `alQuedarAusente` (`combate.ts`) le suelta lo que sostenía, olvida sus esquivas y su acometida, y CORTA
 * lo que tenía anunciado en contra: «los NPC lo ignoran» es también que el golpe que venía no llega, ni
 * esquivado ni dado.
 *
 * ═══ PISA EL ESTADO QUE TUVIERA, MENOS LA CAÍDA ═══
 *
 * La primera versión miraba sólo a quien estaba LIBRE, para no pisar un derribo a medias. Y el
 * comprobador cazó lo que eso hacía: a quien se le cae la red en mitad de un combate le siguen pegando,
 * cada golpe lo deja tocado, un tocado no está libre… y el ausente no llega nunca: se le mata sin que
 * pueda hacer nada. El diseño dice «a los 2 s sin aqui, intocable y los NPC lo ignoran», sin «salvo que».
 * Así que pisa cualquier estado —y suelta lo que sostenía— menos la caída, que tiene su propio reloj.
 */
export function mirarLaPresencia(p: PasoEnCurso, alQuedarAusente: (a: AsientoEnCurso) => void): void {
  const pr = p.declaracion.presencia;
  for (const a of p.asientos) {
    if (!a.conCuerpo || a.vida <= 0) continue;
    const activo = enCurso(a.estado, p.k);
    if (activo !== null && activo.estado === pr.estadoAusente) continue;
    const desde = a.vivoEnTic > p.fase.desdeTic ? a.vivoEnTic : p.fase.desdeTic;
    if (p.k - desde < pr.ausenteTrasTics) continue;
    ponerEstado(p, a, estadoSinFin(pr.estadoAusente, p.k));
    alQuedarAusente(a);
  }
}

/**
 * ¿LLEVA SIN CANAL `veredictoTrasTics` O MÁS?, contando desde que lo perdió, o desde que nació la sala si
 * nunca lo tuvo. Es cuando la sala mete su `arcade:ausente` (ver `sala.ts`) y cuando deja de contar como
 * alguien que puede seguir (ver `seFue`): las dos cosas, con el mismo número.
 */
export function sinCanalDeMas(p: PasoEnCurso, a: AsientoEnCurso): boolean {
  return !a.conectado && p.k - a.conexionCambioEnTic >= p.declaracion.presencia.veredictoTrasTics;
}

/**
 * ¿SE FUE? Lleva `veredictoTrasTics` sin canal, o está ausente y lleva ese mismo tiempo ausente EN LA FASE
 * contando todos sus ratos (`ausenteAcumulado` más el de ahora): la pestaña oculta que no vuelve, y la que
 * vuelve un segundo de cada minuto. Quien se fue no cuenta como alguien que pueda seguir en el encuentro
 * (`alguienPuedeSeguir` en `encuentros.ts`); si vuelve, vuelve a contar.
 *
 * ═══ POR QUÉ TODOS LOS RATOS ═══
 *
 * Con sólo el de ahora, 57 segundos oculto y uno a la vista, en bucle, no llegaba nunca a sesenta
 * seguidos: con el encuentro en solitario las entidades no tenían a quién perseguir, el reloj vencía y la
 * oleada salía AGUANTADA sin jugarla —las ocho que midió la revisión del frente, sin gastar una moneda—,
 * cuando el mismo asiento quieto las perdía todas. La gracia del diseño («quien se cae tiene 60 s») es de
 * la fase, no de cada rato.
 *
 * ═══ POR QUÉ HACE FALTA ═══
 *
 * Al empezar la fase TODOS tienen cuerpo (paso 3 de `FaseDeLaLiza`), también quien nunca abrió canal o
 * cerró la pestaña. Ése pasa al ausente —intocable, fuera de los turnos—, ninguna entidad lo persigue, y
 * nunca cae: contaba como alguien que podía seguir, así que un encuentro con un asiento vacío no se
 * perdía nunca (acababa «aguantado» al vencer su reloj) y uno de salida volvía a encender la zona
 * pagando el recurso por él. Lo midió el revisor del frente: con el otro sin conectar, la ronda que con
 * uno solo se pierde en el tic 27 salía aguantada en el 1201.
 *
 * ═══ Y POR QUÉ NO ANTES DE `veredictoTrasTics` ═══
 *
 * Porque recargar la pestaña o un corte de red de unos segundos no pueden perder el encuentro: quien juega
 * solo y recarga se quedaría sin canal un instante, y sin la espera eso sería una derrota. El diseño da a
 * quien se cae su gracia —«después es un asiento ausente»— y esa gracia es el `veredictoTrasTics` que la
 * liza declara: el mismo número con que la mesa se entera de que se fue.
 */
export function seFue(p: PasoEnCurso, a: AsientoEnCurso): boolean {
  if (sinCanalDeMas(p, a)) return true;
  const activo = enCurso(a.estado, p.k);
  if (activo === null || activo.estado !== p.declaracion.presencia.estadoAusente) return false;
  return a.ausenteAcumulado + (p.k - activo.desdeTic) >= p.declaracion.presencia.veredictoTrasTics;
}

/** ¿Puede estar un cuerpo de radio `radio` en `(x, z)`? La pregunta de `mundo.ts`, con la arena del paso. */
export function sePuedeEstarEn(p: PasoEnCurso, x: number, z: number, radio: number): boolean {
  return sePuedeEstar(p.arena, x, z, radio);
}

/**
 * El punto del tramo `(sx, sz) → (ex, ez)` recortado al límite de la fase. Lo usan el empujón y la bala.
 */
export function recortadoAlLimite(p: PasoEnCurso, sx: number, sz: number, ex: number, ez: number): { x: number; z: number } {
  const f = fraccionDentroDelLimite(p, sx, sz, ex, ez);
  if (f >= UNO) return { x: ex, z: ez };
  return puntoDelTramo(sx, sz, ex, ez, f);
}
