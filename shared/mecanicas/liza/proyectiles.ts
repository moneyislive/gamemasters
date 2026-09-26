/**
 * LAS BALAS DE LA SALA (declaración I): lentas, visibles, y juzgadas contra lo que el blanco DECLARÓ.
 * Es una pieza de `sala.ts`; `sitioDeLaBala` y `paradaDeLaBalaEn` son también del aparato, que pinta
 * cada bala con ellas en su sitio verdadero y hasta donde la sala la para. (El origen le llega en
 * centésimas en el suceso `bala`: su parada queda a menos de un centímetro de la de la sala.)
 *
 * ═══ LO QUE SE VE ES LO QUE SE JUZGA ═══
 *
 * Una bala sale de un sitio, hacia un rumbo de la tabla, en un tic de la sala. Con eso y la declaración,
 * su sitio en cualquier tic es una función (`sitioDeLaBala`): la misma en la sala y en el aparato, sin
 * seno, sin arcotangente, y sin rebobinar nada. Dónde se para contra la estructura también
 * (`paradaDeLaBala`): se calcula al salir con la prueba de losa, y el aparato la calcula igual.
 *
 * El blanco se juzga contra LOS SITIOS QUE ÉL MISMO DECLARÓ para cada tic del vuelo —su rastro, con el
 * tic del aparato (ver `cuerpo.ts`)—, no contra dónde lo ve la sala al llegar la bala. Esos sitios
 * llegan media ida y vuelta tarde, así que cada asiento tiene su HORIZONTE: el último tic para el que ya
 * se sabe dónde estuvo (su último sitio declarado), o `esperaDeSitiosMs` atrás si no manda nada (se
 * quedó quieto donde estaba). Cada tic se juzgan, contra cada asiento, los tics de vuelo que entraron en
 * su horizonte desde el tic anterior (`balasHastaTic`). Quien esquivó con el aparato ve la bala pasar,
 * y la sala también.
 *
 * El juicio es el de siempre (`EsquivaDeclarada`): la bala no toca su sitio → sigue; la ventana en el
 * reloj de su aparato, con el instante `salida en su reloj + tics de vuelo × 50` → limpia o esquivada, y
 * la bala sigue; su intocable en ese tic → esquivada; si no, da, y la bala se acaba ahí (`impacta`).
 * Una limpia contra una bala no descoloca al tirador, que está lejos: da la acometida de `contraProyectil`
 * —el vuelo hacia él y su acción, que la sala lanza en el acto con el impacto al final (`lanzarLaAcometida`,
 * en `combate.ts`)—.
 *
 * Una bala que se para (estructura o alcance) sigue en la sala hasta que todos los horizontes pasan su
 * último tic: un asiento con la red lenta todavía puede estar en su camino en un tic que aún no se juzgó.
 *
 * Las balas del TIRO de un asiento (declaración W) vuelan con estas mismas cuentas —`sitioDeLaBala`,
 * `paradaDeLaBalaEn`— pero se juzgan al revés: contra las entidades, en el presente de la sala, y en
 * `tiro.ts`. Aquí sólo se saltan, y no cuentan en el aforo (`balasDeEntidades`).
 */
import { TICS_POR_SEGUNDO } from '../andar';
import { UNO } from '../fijo';
import type { Arena } from '../mundo';
import type { CajaDeLaLiza, LizaDeclarada, ProyectilDeclarado, ReglasDeAsiento } from './declaracion';
import { desplazado, primeraLosa, puntoDelTramo, rumboHacia, tramoTocaCuerpo } from './geometria';
import { aCentesimas, MOTIVO_DE_IRSE, PRIMER_NUMERO_DE_ENTIDAD, RESULTADO } from './protocolo';
import type { CodigoDeResultado } from './protocolo';
import { bitDe, contar, intocableEn, msDelTic, nuevoNumero, ticsQueCubren } from './paso-en-curso';
import type { AsientoEnCurso, BalaInterna, EntidadEnCurso, PasoEnCurso } from './paso-en-curso';
import { fraccionDentroDeLaCaja, sitioEnElTic } from './cuerpo';
import { golpearAsiento, juzgarLaVentana, lanzarLaAcometida, premiarLimpia } from './combate';

/* ─── DÓNDE ESTÁ UNA BALA (sala y aparato) ───────────────────────────────── */

/** Lo que ha recorrido una bala en `ticsDeVuelo` tics, en Q16.16: `floor(velocidad · tics / 20)`, exacto. */
export function recorridoDeLaBala(velocidad: number, ticsDeVuelo: number): number {
  return ticsDeVuelo <= 0 ? 0 : Math.floor((velocidad * ticsDeVuelo) / TICS_POR_SEGUNDO);
}

/**
 * DÓNDE ESTÁ UNA BALA a los `ticsDeVuelo` tics de salir de `(x, z)` hacia `rumbo`, sin pasar de
 * `parada` (lo que recorre antes de pararse: ver `paradaDeLaBala`). Todo en Q16.16.
 */
export function sitioDeLaBala(x: number, z: number, rumbo: number, velocidad: number, ticsDeVuelo: number, parada: number): { x: number; z: number } {
  const hecho = recorridoDeLaBala(velocidad, ticsDeVuelo);
  return desplazado(x, z, rumbo, hecho > parada ? parada : hecho);
}

/**
 * LO QUE RECORRE UNA BALA ANTES DE PARARSE: su alcance, o menos si una caja de la estructura (`cuerpos`,
 * la `Arena.cuerpos` de `mundo.ts`) se cruza antes, con el radio de la bala. `hastaX/hastaZ` es el final
 * del alcance ya recortado al límite de la fase, que la sala sabe y el aparato también.
 */
export function paradaDeLaBala(cuerpos: ArrayLike<number>, x: number, z: number, hastaX: number, hastaZ: number, radio: number): { parada: number; choca: boolean } {
  const dx = hastaX - x;
  const dz = hastaZ - z;
  const total = Math.floor(Math.sqrt(dx * dx + dz * dz));
  const choque = primeraLosa(cuerpos, x, z, hastaX, hastaZ, radio);
  if (choque === null) return { parada: total, choca: false };
  return { parada: Math.floor((total * choque.fraccion) / UNO), choca: true };
}

/**
 * DÓNDE SE PARA UNA BALA DE ESTA LIZA que sale de `(x, z)` hacia `rumbo`, y en cuántos tics de vuelo: su
 * alcance recortado al límite de la fase y parado contra la estructura. Es LA MISMA cuenta que hace la
 * sala al disparar (la usa `dispararBala`), escrita sin el paso para que el aparato, que tiene la liza y
 * su arena, pinte cada bala hasta donde la sala la juzga: ni un tic más allá del muro, ni uno menos.
 */
export function paradaDeLaBalaEn(
  liza: LizaDeclarada,
  arena: Arena,
  x: number,
  z: number,
  rumbo: number,
  proyectil: ProyectilDeclarado,
): { parada: number; choca: boolean; vuelo: number } {
  const fin = desplazado(x, z, rumbo, proyectil.alcance);
  let caja: CajaDeLaLiza | undefined;
  for (const l of liza.mundo.limites) if (l.id === liza.fase.limite) caja = l.caja;
  const f = fraccionDentroDeLaCaja(caja, x, z, fin.x, fin.z);
  const dentro = f >= UNO ? fin : puntoDelTramo(x, z, fin.x, fin.z, f);
  const { parada, choca } = paradaDeLaBala(arena.cuerpos, x, z, dentro.x, dentro.z, proyectil.radio);
  return { parada, choca, vuelo: parada <= 0 ? 0 : Math.ceil((parada * TICS_POR_SEGUNDO) / proyectil.velocidad) };
}

/* ─── DISPARAR ───────────────────────────────────────────────────────────── */

/**
 * Las balas de ENTIDADES que vuelan: las que cuenta el aforo. Las de los tiros de los asientos (`de` es un
 * número de asiento) tienen su plaza aparte, una por asiento (ver «el aforo» en `TiroDeclarado`).
 */
export function balasDeEntidades(p: PasoEnCurso): number {
  let n = 0;
  for (const b of p.balas) if (b.de >= PRIMER_NUMERO_DE_ENTIDAD) n++;
  return n;
}

/**
 * DISPARA UNA BALA de la entidad `e` hacia `(ax, az)`. Si ya vuelan tantas de entidades como el aforo, no
 * sale: el aforo es tope. La salida se apunta en el reloj de cada asiento (`salidaEnSuReloj`) y va a cada
 * canal abierto con el instante en el suyo.
 */
export function dispararBala(p: PasoEnCurso, e: EntidadEnCurso, proyectil: ProyectilDeclarado, ax: number, az: number): void {
  if (balasDeEntidades(p) >= p.declaracion.aforo.balas) return;
  const dx = ax - e.x;
  const dz = az - e.z;
  const rumbo = dx === 0 && dz === 0 ? e.mira : rumboHacia(dx, dz);
  const { parada, choca, vuelo } = paradaDeLaBalaEn(p.declaracion, p.arena, e.x, e.z, rumbo, proyectil);
  const salidaEnSuReloj: number[] = [];
  for (const s of p.asientos) salidaEnSuReloj.push(msDelTic(p.k) + s.red.desfaseMs);
  const bala: BalaInterna = {
    numero: nuevoNumero(p),
    proyectil: proyectil.id,
    de: e.numero,
    x: e.x,
    z: e.z,
    rumbo,
    salioEnTic: p.k,
    salidaEnSuReloj,
    finTic: p.k + vuelo,
    finPor: choca ? MOTIVO_DE_IRSE.choca : MOTIVO_DE_IRSE.alcance,
    juzgadaContra: 0,
    parada,
  };
  p.balas.push(bala);
  e.mira = rumbo;
  const cx = aCentesimas(bala.x);
  const cz = aCentesimas(bala.z);
  for (let i = 0; i < p.asientos.length; i++) {
    const s = p.asientos[i] as AsientoEnCurso;
    if (!s.conectado) continue;
    contar(p, s.numero, { e: 'bala', id: bala.numero, de: e.numero, p: proyectil.id, x: cx, z: cz, r: rumbo, t: salidaEnSuReloj[i] as number });
  }
}

/* ─── EL VUELO Y EL JUICIO ───────────────────────────────────────────────── */

/** Los horizontes de este tic, uno por asiento (−1 = no se le juzga nada: sin cuerpo o sin vida). */
let HORIZONTES = new Int32Array(16);

/**
 * LAS BALAS DE CADA TIC: el juicio de la cabecera contra cada asiento, tic de vuelo a tic de vuelo
 * dentro de su horizonte; y las que ya se pararon y nadie puede tener en su camino, fuera (`seva`).
 */
export function avanzarLasBalas(p: PasoEnCurso): void {
  const espera = ticsQueCubren(p.declaracion.red.esperaDeSitiosMs);
  if (HORIZONTES.length < p.asientos.length + 1) HORIZONTES = new Int32Array(p.asientos.length + 1);
  for (const a of p.asientos) {
    if (!a.conCuerpo || a.vida <= 0) {
      HORIZONTES[a.numero] = -1;
      continue;
    }
    const ultimo = a.rastro.length > 0 ? (a.rastro[a.rastro.length - 1] as { tic: number }).tic : -1;
    let h = ultimo > p.k - espera ? ultimo : p.k - espera;
    if (h > p.k) h = p.k;
    HORIZONTES[a.numero] = h;
  }
  let i = 0;
  while (i < p.balas.length) {
    let b = p.balas[i] as BalaInterna;
    /* Las de los tiros de los asientos se juzgan contra las entidades, en `tiro.ts` (`avanzarLosTiros`). */
    if (b.de < PRIMER_NUMERO_DE_ENTIDAD) {
      i++;
      continue;
    }
    const proyectil = p.indices.proyectiles[b.proyectil];
    if (proyectil === undefined) {
      p.balas.splice(i, 1);
      continue;
    }
    let acabada = false;
    for (const a of p.asientos) {
      const h = HORIZONTES[a.numero] as number;
      if (h < 0 || (b.juzgadaContra & bitDe(a.numero)) !== 0) continue;
      const desde = (a.balasHastaTic > b.salioEnTic ? a.balasHastaTic : b.salioEnTic) + 1;
      const hasta = h < b.finTic ? h : b.finTic;
      const reglas = p.declaracion.asientos[a.numero - 1] as ReglasDeAsiento;
      for (let t = desde; t <= hasta; t++) {
        const r = juzgarElTic(p, b, proyectil, a, reglas, t);
        if (r === 0) continue;
        b = { ...b, juzgadaContra: b.juzgadaContra | bitDe(a.numero) };
        if (r === RESULTADO.da) acabada = true;
        break;
      }
      if (acabada) break;
    }
    if (acabada) {
      p.balas.splice(i, 1);
      continue;
    }
    if (p.k >= b.finTic && todosPasaron(p, b.finTic)) {
      contar(p, 0, { e: 'seva', id: b.numero, por: b.finPor, quien: 0 });
      p.balas.splice(i, 1);
      continue;
    }
    p.balas[i] = b;
    i++;
  }
  for (const a of p.asientos) {
    const h = HORIZONTES[a.numero] as number;
    const juzgado = h < 0 ? p.k : h;
    if (juzgado > a.balasHastaTic) a.balasHastaTic = juzgado;
  }
}

/** ¿Han pasado todos los horizontes el tic `fin`? (Quien no tiene cuerpo no cuenta: no se le juzga.) */
function todosPasaron(p: PasoEnCurso, fin: number): boolean {
  for (const a of p.asientos) {
    const h = HORIZONTES[a.numero] as number;
    if (h >= 0 && h < fin) return false;
  }
  return true;
}

/**
 * EL TIC DE VUELO `t` DE UNA BALA CONTRA UN ASIENTO. 0 si no le toca; si le toca, el resultado ya
 * aplicado y contado (`impacta`).
 */
function juzgarElTic(p: PasoEnCurso, b: BalaInterna, proyectil: ProyectilDeclarado, a: AsientoEnCurso, reglas: ReglasDeAsiento, t: number): number {
  /* Otra bala de este mismo tic pudo dejarlo sin vida: a quien ya cayó no se le juzga. */
  if (!a.conCuerpo || a.vida <= 0) return 0;
  const antes = sitioDeLaBala(b.x, b.z, b.rumbo, proyectil.velocidad, t - 1 - b.salioEnTic, b.parada);
  const ahora = sitioDeLaBala(b.x, b.z, b.rumbo, proyectil.velocidad, t - b.salioEnTic, b.parada);
  const sitio = sitioEnElTic(a, t);
  const cx = sitio === null ? a.x : sitio.x;
  const cz = sitio === null ? a.z : sitio.z;
  if (!tramoTocaCuerpo(antes.x, antes.z, ahora.x, ahora.z, cx, cz, proyectil.radio + reglas.cuerpo.radio)) return 0;
  a.contadores.amenazas++;
  const instante = (b.salidaEnSuReloj[a.numero - 1] as number) + (t - b.salioEnTic) * 50;
  let r: number = juzgarLaVentana(a, reglas, instante);
  if (r === 0 && intocableEn(a.estado, t)) r = RESULTADO.esquivada;
  if (r === 0) {
    golpearAsiento(p, a, reglas, proyectil.efecto, false, b.de, b.x, b.z, b.rumbo, t, 0, b.numero);
    return RESULTADO.da;
  }
  contar(p, 0, { e: 'impacta', bala: b.numero, a: a.numero, r: r as CodigoDeResultado, dano: 0, vida: a.vida });
  if (r === RESULTADO.limpia) {
    premiarLimpia(p, a, reglas, t);
    lanzarLaAcometida(p, a, reglas, b.de);
  }
  return r;
}
