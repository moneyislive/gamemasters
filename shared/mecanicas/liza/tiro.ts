/**
 * EL TIRO CARGADO DE UN ASIENTO (declaración W, `TiroDeclarado`): cargar, soltar, el vuelo de su bala, el
 * juicio contra las entidades y el área. Es una pieza de `sala.ts`, como `combate.ts` y `proyectiles.ts`, y
 * usa las dos: la sala le da sus manos a `atenderLaAccionDelAqui` (`MANOS_DEL_TIRO`) y le hace volar las
 * balas en cada tic (`avanzarLosTiros`), para que ninguna de aquéllas tenga que importar ésta.
 *
 * ═══ DE LA PULSACIÓN AL IMPACTO ═══
 *
 *   1. SE CARGA. Un `apuntar` que la sala acepta (ver «cuándo no se empieza a cargar» en `TiroDeclarado`)
 *      abre una sostenida con el `ms` de la pulsación y el tic de la sala en que cayó, y pone el estado de
 *      cargar desde ese tic. Cada `aqui` que la repite la mantiene; el primero sin ella la suelta SIN
 *      disparar, y también el daño que corta su estado, el fin del combate, quedarse ausente o que su estado
 *      se acabe o lo pise otro (`avanzarSostenidas`, en `combate.ts`).
 *   2. SE SUELTA. El `soltar` recibe la carga tal como estaba antes de su `aqui` (si no había una carga viva,
 *      no sale nada). La carga es `msSoltar − msPulsar`, dos instantes del reloj del mismo aparato —el desfase
 *      no la mueve—, acotada por lo que la sala VIO (los tics desde que empezó, más un `comp` y el tic en que
 *      sale un `aqui`: un aparato no puede haber mantenido más que eso) y por `cargaMaximaMs`. El nivel es el
 *      último con `desdeMs` ≤ la carga. La bala sale en el tic de la pulsación de `soltar`, nunca antes del de
 *      `apuntar`, hacia la mira de ese `aqui` o, con un blanco que el enganche acepta, hacia él. Se apunta la
 *      recarga de su nivel desde ese tic.
 *   3. VUELA. Como las de las entidades: `sitioDeLaBala`, parada contra la estructura con el radio de su
 *      proyectil y recortada al límite de la fase (`paradaDeLaBalaEn`). En cada tic se juzgan los tics de
 *      vuelo que pasaron —en el paso en que sale, desde su salida, que puede haber sido hace unos tics—.
 *   4. SE JUZGA contra las ENTIDADES EN PIE, en el presente de la sala: la sala no guarda los sitios pasados
 *      de lo que ella misma mueve, y la `holgura` del tiro cubre lo que el aparato las pinta atrás. Nunca
 *      contra un asiento (no hay fuego amigo). La primera que el tramo toca —fracción menor, y a igualdad
 *      número menor—, con línea de vista desde donde entra hasta su centro, es el blanco DIRECTO.
 *   5. ESTALLA donde se para: en el centro del blanco directo, o donde la estructura la detiene. Sale
 *      `estalla`, y detrás un `impacta` por cuerpo: primero el directo (el efecto de su bala, empujado en la
 *      dirección del vuelo) y luego, si el nivel tiene área, las demás entidades en pie a su alcance y con
 *      línea de vista desde el centro, por número (el efecto del área, empujadas hacia fuera). Quien aparece o
 *      está en su intocable lo recibe `esquivada`, sin daño. La que llega a su alcance sin tocar nada se va
 *      sin estallar.
 *
 * ═══ POR QUÉ NO PASA POR LA GUARDIA ═══
 *
 * La guardia de una clase para de FRENTE golpes que ella misma nombra, y contesta al que tiene delante; su
 * esquiva al azar es la de esos golpes. Un tiro no llega de frente a nadie en ese sentido —llega de lejos, y
 * su área por detrás—, y una guardia que lo nombrara prometería algo que la sala no sabría cumplir: la
 * revisión no lo deja (`revisarLoQueElTiroPideDeLaLiza`).
 *
 * ═══ PURA Y EN CUALQUIER MOTOR ═══
 *
 * Como toda la sala: nada de relojes, azar sin sembrar ni trigonometría (rumbos de la tabla, `rumboHacia`),
 * enteros y Q16.16, órdenes totales (el área se recorre por número, ordenada a mano), y ningún cierre sobre la
 * variable de un bucle (Hermes 0.12 no la liga por vuelta).
 */
import type { EfectoDeclarado, NivelDelTiro, ProyectilDeclarado, ReglasDeAsiento, TiroDeclarado } from './declaracion';
import { MS_POR_TIC } from './declaracion';
import { dentroDelCono, dentroDelRadio, desplazado, hayLineaDeVista, pruebaDeLosa, puntoDelTramo, rumboHacia, TOPE_DE_DIFERENCIA, TOPE_DE_RADIO } from './geometria';
import { aCentesimas, MOTIVO_DE_IRSE, PRIMER_NUMERO_DE_ENTIDAD, RESULTADO } from './protocolo';
import type { AccionRecibida, SostenidaEnCurso } from './tipos-de-la-sala';
import { contar, enCurso, intocableEn, msDelTic, nuevoNumero, PUEDE, puedeEmpezar, TICS_DEL_AQUI } from './paso-en-curso';
import type { AsientoEnCurso, BalaInterna, EntidadEnCurso, PasoEnCurso } from './paso-en-curso';
import { compTics, librar, ponerPuesta, ticDeLaPulsacion } from './cuerpo';
import { anuncioDelAutor, asientoDe, enRecarga, entidadDe, entidadEnPie, golpearEntidad, rumboDeA } from './combate';
import type { ManosDelTiro } from './combate';
import { paradaDeLaBalaEn, sitioDeLaBala } from './proyectiles';

/* ─── LA TABLA DE NIVELES ────────────────────────────────────────────────── */

/**
 * EL NIVEL QUE SALE con `cargaMs` de carga: el ÚLTIMO de la tabla con `desdeMs` ≤ la carga. Entero y sin
 * interpolar; el aparato hace la misma cuenta para enseñar lo que saldría.
 */
export function nivelDeLaCarga(tiro: TiroDeclarado, cargaMs: number): NivelDelTiro {
  let elegido = tiro.niveles[0] as NivelDelTiro;
  for (let i = 1; i < tiro.niveles.length; i++) {
    const n = tiro.niveles[i] as NivelDelTiro;
    if (n.desdeMs <= cargaMs) elegido = n;
  }
  return elegido;
}

/** El nivel de un tiro cuya bala es el proyectil `p`, o `null`. */
export function nivelDelProyectil(tiro: TiroDeclarado | null, p: number): NivelDelTiro | null {
  if (tiro === null) return null;
  for (let i = 0; i < tiro.niveles.length; i++) {
    const n = tiro.niveles[i] as NivelDelTiro;
    if (n.proyectil === p) return n;
  }
  return null;
}

/**
 * LA CARGA QUE SE CREE, en ms del aparato: la que dice el aparato (`msSoltar − msPulsar`), sin pasar de lo que
 * la sala vio —los tics desde el de la pulsación de `apuntar` hasta ahora, más un `comp` y el tic del `aqui`—
 * ni de `cargaMaximaMs`. Nunca negativa. Ver la cabecera.
 */
export function cargaQueSeCree(tiro: TiroDeclarado, carga: SostenidaEnCurso, msSoltar: number, k: number, compTicsDelAsiento: number): number {
  let ms = msSoltar - carga.msDelAparato;
  if (ms < 0) ms = 0;
  const vio = (k - carga.desdeTic + compTicsDelAsiento + TICS_DEL_AQUI) * MS_POR_TIC;
  if (ms > vio) ms = vio;
  if (ms > tiro.cargaMaximaMs) ms = tiro.cargaMaximaMs;
  return ms;
}

/* ─── CARGAR ─────────────────────────────────────────────────────────────── */

/** ¿Vuela todavía la bala del tiro de este asiento? (Su PLAZA: una en el aire como mucho; ver `TiroDeclarado`.) */
export function tiroEnElAire(p: PasoEnCurso, numero: number): boolean {
  for (const b of p.balas) if (b.de === numero) return true;
  return false;
}

/**
 * EMPIEZA LA CARGA, si se puede (ver «cuándo no se empieza a cargar» en `TiroDeclarado`). Un estado en curso
 * que bloquea y se deja soltar (`PUEDE.corta`) se acaba; uno que no bloquea —el premio de una limpia, el
 * intocable de quien reaparece— NO deja cargar: la Liza promete que empezar algo en él no lo acaba, y la
 * carga pondría su estado encima. La pulsación guardada se olvida: la carga es la pulsación nueva.
 */
function empezarLaCarga(p: PasoEnCurso, a: AsientoEnCurso, reglas: ReglasDeAsiento, accion: AccionRecibida, desfaseMs: number): void {
  const tiro = reglas.tiro;
  if (tiro === null) return;
  const k = p.k;
  let corta = false;
  if (enCurso(a.estado, k) !== null) {
    if (puedeEmpezar(p.indices, a.estado, tiro.apuntar, k) !== PUEDE.corta) return;
    corta = true;
  }
  /* El mismo dedo de una carga que ya se dejó (cortada por un golpe, pongamos) no la vuelve a empezar. */
  if (accion.msDelAparato === a.cargaDejadaMs) return;
  if (anuncioDelAutor(p, a.numero) !== null) return;
  if (k < a.recuperaHastaTic) return;
  if (enRecarga(a, tiro.apuntar, k)) return;
  if (tiroEnElAire(p, a.numero)) return;
  if (corta) librar(p, a);
  const desde = ticDeLaPulsacion(p, a, accion.msDelAparato, desfaseMs);
  a.guardada = null;
  a.sostenida = { accion: tiro.apuntar, blanco: 0, desdeTic: desde, msDelAparato: accion.msDelAparato };
  ponerPuesta(p, a, tiro.puesta, desde, 0);
}

/* ─── SOLTAR ─────────────────────────────────────────────────────────────── */

/** Un radio acotado a lo que la geometría calcula exacto. */
function acotado(radio: number, tope: number): number {
  return radio > tope ? tope : radio;
}

/**
 * HACIA DÓNDE SALE: la mira del `aqui` que la suelta, o hacia el blanco que manda el aparato si el enganche
 * lo acepta —una entidad en pie a `radio + holgura` o menos, dentro del cono de la mira y con línea de vista—.
 * Es para lo que está: la mira va en rumbos de la tabla (1,4° por paso) y a treinta metros eso es más que un
 * cuerpo; el blanco va derecho a su sitio de ahora.
 */
function rumboDelTiro(p: PasoEnCurso, a: AsientoEnCurso, tiro: TiroDeclarado, blanco: number): number {
  const en = tiro.enganche;
  if (en === null || blanco < PRIMER_NUMERO_DE_ENTIDAD) return a.mira;
  const e = entidadDe(p, blanco);
  if (e === null || !entidadEnPie(e)) return a.mira;
  const dx = e.x - a.x;
  const dz = e.z - a.z;
  if (dx === 0 && dz === 0) return a.mira;
  if (!dentroDelRadio(dx, dz, acotado(en.radio + en.holgura, TOPE_DE_DIFERENCIA))) return a.mira;
  if (!dentroDelCono(a.mira, dx, dz, en.conoRumbos)) return a.mira;
  if (!hayLineaDeVista(p.arena.cuerpos, a.x, a.z, e.x, e.z)) return a.mira;
  return rumboHacia(dx, dz);
}

/**
 * LA BALA DE UN TIRO SALE: del sitio del asiento, en el tic `salio`, hacia `rumbo`, con la misma parada que
 * pintará el aparato. Va a cada canal abierto con el instante en su reloj, salvo a quien conectó en este
 * paso: su puesta al día, detrás de las entradas, ya lleva una `bala` por bala en vuelo.
 */
function dispararElTiro(p: PasoEnCurso, a: AsientoEnCurso, proyectil: ProyectilDeclarado, rumbo: number, salio: number): void {
  const { parada, choca, vuelo } = paradaDeLaBalaEn(p.declaracion, p.arena, a.x, a.z, rumbo, proyectil);
  const salidaEnSuReloj: number[] = [];
  for (const s of p.asientos) salidaEnSuReloj.push(msDelTic(salio) + s.red.desfaseMs);
  const bala: BalaInterna = {
    numero: nuevoNumero(p),
    proyectil: proyectil.id,
    de: a.numero,
    x: a.x,
    z: a.z,
    rumbo,
    salioEnTic: salio,
    salidaEnSuReloj,
    finTic: salio + vuelo,
    finPor: choca ? MOTIVO_DE_IRSE.choca : MOTIVO_DE_IRSE.alcance,
    juzgadaContra: 0,
    parada,
  };
  p.balas.push(bala);
  p.tirosDelPaso.push(bala.numero);
  const cx = aCentesimas(bala.x);
  const cz = aCentesimas(bala.z);
  for (let i = 0; i < p.asientos.length; i++) {
    const s = p.asientos[i] as AsientoEnCurso;
    if (!s.conectado || p.porPoner.indexOf(s.numero) >= 0) continue;
    contar(p, s.numero, { e: 'bala', id: bala.numero, de: a.numero, p: proyectil.id, x: cx, z: cz, r: rumbo, t: salidaEnSuReloj[i] as number });
  }
}

/**
 * SUELTA LA CARGA `carga` (la que había antes de este `aqui`; sin ella, nada): el nivel de la carga que se
 * cree, su bala hacia la mira o el blanco, y su recarga desde el tic en que sale. Ver la cabecera.
 */
function soltarElTiro(p: PasoEnCurso, a: AsientoEnCurso, reglas: ReglasDeAsiento, carga: SostenidaEnCurso | null, accion: AccionRecibida, desfaseMs: number): void {
  const tiro = reglas.tiro;
  if (tiro === null || carga === null || carga.accion !== tiro.apuntar) return;
  const k = p.k;
  let salio = ticDeLaPulsacion(p, a, accion.msDelAparato, desfaseMs);
  if (salio < carga.desdeTic) salio = carga.desdeTic;
  const nivel = nivelDeLaCarga(tiro, cargaQueSeCree(tiro, carga, accion.msDelAparato, k, compTics(a)));
  const proyectil = p.indices.proyectiles[nivel.proyectil];
  if (proyectil === undefined) return;
  dispararElTiro(p, a, proyectil, rumboDelTiro(p, a, tiro, accion.blanco), salio);
  if (nivel.recargaTics > 0) {
    const recargas: { accion: number; hastaTic: number }[] = [];
    for (const r of a.recargas) if (r.hastaTic > k && r.accion !== tiro.apuntar) recargas.push(r);
    recargas.push({ accion: tiro.apuntar, hastaTic: salio + nivel.recargaTics });
    a.recargas = recargas;
  }
}

/** LAS MANOS DEL TIRO, para `atenderLaAccionDelAqui` (ver `ManosDelTiro` en `combate.ts`). */
export const MANOS_DEL_TIRO: ManosDelTiro = Object.freeze({ empezar: empezarLaCarga, soltar: soltarElTiro });

/* ─── EL VUELO, EL JUICIO Y EL ÁREA ──────────────────────────────────────── */

/** Una entidad que el tramo toca, y en qué fracción de él (Q16.16). */
interface Tocada {
  readonly e: EntidadEnCurso;
  readonly f: number;
}

/**
 * LA PRIMERA ENTIDAD QUE TOCA EL TRAMO `(ax, az) → (bx, bz)` de una bala de ancho `ancho` (más el radio de su
 * clase y la `holgura`): la de fracción menor y, a igualdad, la de número menor, de las que se ven desde donde
 * el tramo entra hasta su centro. `null` si ninguna.
 */
function primeraEntidadDelTramo(p: PasoEnCurso, ax: number, az: number, bx: number, bz: number, ancho: number, holgura: number): EntidadEnCurso | null {
  const tocadas: Tocada[] = [];
  for (const e of p.entidades) {
    if (!entidadEnPie(e)) continue;
    const clase = p.indices.clases[e.clase];
    if (clase === undefined) continue;
    const f = pruebaDeLosa(ax, az, bx, bz, e.x, e.z, e.x, e.z, acotado(ancho + clase.radio + holgura, TOPE_DE_RADIO));
    if (f !== null) tocadas.push({ e, f });
  }
  /* De menos a más fracción (y número), la primera que se ve. Son pocas: se escoge a mano, sin `sort`. */
  while (tocadas.length > 0) {
    let mejor = 0;
    for (let i = 1; i < tocadas.length; i++) {
      const t = tocadas[i] as Tocada;
      const m = tocadas[mejor] as Tocada;
      if (t.f < m.f || (t.f === m.f && t.e.numero < m.e.numero)) mejor = i;
    }
    const elegida = tocadas[mejor] as Tocada;
    const entra = puntoDelTramo(ax, az, bx, bz, elegida.f);
    if (hayLineaDeVista(p.arena.cuerpos, entra.x, entra.z, elegida.e.x, elegida.e.z)) return elegida.e;
    tocadas.splice(mejor, 1);
  }
  return null;
}

/**
 * LO QUE LE PASA A UNA ENTIDAD ALCANZADA POR UN TIRO: `esquivada` si aparece o está en su intocable en el tic
 * `t`; si no, el efecto, con el empuje hacia `rumbo`, sus puntos al autor y su `impacta`.
 */
function alcanzar(p: PasoEnCurso, b: BalaInterna, autor: AsientoEnCurso, reglas: ReglasDeAsiento, e: EntidadEnCurso, efecto: EfectoDeclarado, rumbo: number, t: number): void {
  const clase = p.indices.clases[e.clase];
  if (clase === undefined) return;
  if (e.cerebro.modo === 'aparecer' || intocableEn(e.estado, t)) {
    contar(p, 0, { e: 'impacta', bala: b.numero, a: e.numero, r: RESULTADO.esquivada, dano: 0, vida: e.vida });
    return;
  }
  golpearEntidad(p, e, clase, efecto, false, autor, reglas, t, 0, rumbo, b.numero);
}

/** Ordena números de menos a más, a mano (un orden total, igual en cualquier motor). */
function ordenados(numeros: number[]): number[] {
  for (let i = 1; i < numeros.length; i++) {
    const x = numeros[i] as number;
    let j = i - 1;
    while (j >= 0 && (numeros[j] as number) > x) {
      numeros[j + 1] = numeros[j] as number;
      j--;
    }
    numeros[j + 1] = x;
  }
  return numeros;
}

/**
 * LA BALA DE UN TIRO ESTALLA en `(cx, cz)`, en el tic de vuelo `t`: `estalla`, el blanco directo si lo hay, y el
 * área de su nivel —las demás entidades en pie a `area + holgura` o menos del centro y con línea de vista desde
 * él, elegidas ANTES de aplicar nada (dónde estaban al estallar) y alcanzadas por número—.
 */
function estallar(
  p: PasoEnCurso,
  b: BalaInterna,
  autor: AsientoEnCurso,
  reglas: ReglasDeAsiento,
  nivel: NivelDelTiro | null,
  proyectil: ProyectilDeclarado,
  directo: EntidadEnCurso | null,
  cx: number,
  cz: number,
  holgura: number,
  t: number,
): void {
  contar(p, 0, { e: 'estalla', bala: b.numero, x: aCentesimas(cx), z: aCentesimas(cz) });
  const delArea: number[] = [];
  if (nivel !== null && nivel.area > 0 && nivel.efectoDelArea !== null) {
    const radio = acotado(nivel.area + holgura, TOPE_DE_DIFERENCIA);
    for (const e of p.entidades) {
      if ((directo !== null && e.numero === directo.numero) || !entidadEnPie(e)) continue;
      if (!dentroDelRadio(e.x - cx, e.z - cz, radio)) continue;
      if (!hayLineaDeVista(p.arena.cuerpos, cx, cz, e.x, e.z)) continue;
      delArea.push(e.numero);
    }
    ordenados(delArea);
  }
  if (directo !== null) alcanzar(p, b, autor, reglas, directo, proyectil.efecto, b.rumbo, t);
  if (nivel === null || nivel.efectoDelArea === null) return;
  for (const n of delArea) {
    const e = entidadDe(p, n);
    if (e === null || !entidadEnPie(e)) continue;
    alcanzar(p, b, autor, reglas, e, nivel.efectoDelArea, rumboDeA(cx, cz, e.x, e.z, b.rumbo), t);
  }
}

/**
 * EL VUELO DE UNA BALA DE TIRO EN ESTE TIC: sus tics de vuelo sin juzgar (en el paso en que sale, desde su
 * salida; luego, el de ahora), tramo a tramo, contra las entidades; y si llega a su fin sin tocar a nadie,
 * estalla contra la estructura o se va por su alcance. `true` si ya acabó.
 */
function volarElTiro(p: PasoEnCurso, b: BalaInterna): boolean {
  const proyectil = p.indices.proyectiles[b.proyectil];
  const autor = asientoDe(p, b.de);
  const reglas = p.declaracion.asientos[b.de - 1];
  if (proyectil === undefined || autor === null || reglas === undefined) {
    contar(p, 0, { e: 'seva', id: b.numero, por: MOTIVO_DE_IRSE.disuelta, quien: 0 });
    return true;
  }
  const tiro = reglas.tiro;
  const nivel = nivelDelProyectil(tiro, b.proyectil);
  const ancho = nivel === null ? 0 : nivel.ancho;
  const holgura = tiro === null ? 0 : tiro.holgura;
  const desde = p.tirosDelPaso.indexOf(b.numero) >= 0 ? b.salioEnTic + 1 : p.k;
  const hasta = p.k < b.finTic ? p.k : b.finTic;
  for (let t = desde; t <= hasta; t++) {
    const antes = sitioDeLaBala(b.x, b.z, b.rumbo, proyectil.velocidad, t - 1 - b.salioEnTic, b.parada);
    const ahora = sitioDeLaBala(b.x, b.z, b.rumbo, proyectil.velocidad, t - b.salioEnTic, b.parada);
    const e = primeraEntidadDelTramo(p, antes.x, antes.z, ahora.x, ahora.z, ancho, holgura);
    if (e !== null) {
      estallar(p, b, autor, reglas, nivel, proyectil, e, e.x, e.z, holgura, t);
      return true;
    }
  }
  if (p.k < b.finTic) return false;
  if (b.finPor === MOTIVO_DE_IRSE.choca) {
    const fin = desplazado(b.x, b.z, b.rumbo, b.parada);
    estallar(p, b, autor, reglas, nivel, proyectil, null, fin.x, fin.z, holgura, b.finTic);
  }
  contar(p, 0, { e: 'seva', id: b.numero, por: b.finPor, quien: 0 });
  return true;
}

/**
 * LAS BALAS DE LOS TIROS EN CADA TIC (las de las entidades las lleva `avanzarLasBalas`): cada una vuela lo que
 * le toca y se juzga; la que acaba, fuera. En el orden en que salieron.
 */
export function avanzarLosTiros(p: PasoEnCurso): void {
  let i = 0;
  while (i < p.balas.length) {
    const b = p.balas[i] as BalaInterna;
    if (b.de >= PRIMER_NUMERO_DE_ENTIDAD) {
      i++;
      continue;
    }
    if (volarElTiro(p, b)) {
      p.balas.splice(i, 1);
      continue;
    }
    i++;
  }
}
