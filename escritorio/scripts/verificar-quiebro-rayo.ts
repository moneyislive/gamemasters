/**
 * ¿SE CUMPLE EL CONTRATO DEL RAYO? — lo que se dicen los cuatro frentes que construyen el rayo de El Quiebro a
 * la vez (`docs/quiebro/EL-RAYO.md` §9), comprobado sin navegador.
 *
 *   npm run verify:quiebro-rayo -w escritorio
 *
 * ═══ POR QUÉ UN COMPROBADOR PROPIO ═══
 *
 * El contrato (`src/quiebro/rayo/contrato.ts`) es de la fase 0 y del coordinador, no de ningún frente: si sus
 * comprobaciones vivieran en el comprobador de uno, ese frente podría «arreglarlas» a su favor sin que los otros
 * tres se enterasen. Aquí sólo se mira LO QUE SE PROMETEN: las firmas, cómo se lee la declaración, y que cada
 * stub de la fase 0 está en el camino de verdad. Lo que cada frente construye detrás de esas firmas lo mira su
 * propio comprobador. Y está escrito para seguir en verde cuando los frentes lo rellenen: no exige que un stub
 * no haga nada, sino que cumpla lo que el contrato dice.
 *
 * ═══ QUÉ AFIRMA ═══
 *
 *   1. LA LECTURA DEL TIRO: sobre la liza DE VERDAD de una mesa (el productor del registro) con el tiro que le
 *      toca —el suyo si REGLAS ya lo declara; si no, uno de juguete con los ids reservados y la tabla del §1.2—,
 *      la Liza no le pone otra pega que la de hoy (que la sala todavía no lo cumple), `leerElTiro` da los números
 *      de la tabla en metros y ms, el nivel de una carga es el de la sala y el de una bala se reconoce por su
 *      proyectil, y el diccionario del cliente saca de ahí el botón, los gestos y el estado de cargar.
 *   2. LO DEMÁS DEL CONTRATO: el estado apagado, la semilla, los efectos nulos, los uniformes del destello y los
 *      gestos; y que el contrato se lee en Node (ni three, ni React, ni el DOM), en LF y sin la marca ajena.
 *   3. LOS STUBS EN SU CAMINO: los efectos del rayo cuelgan del sistema; el botón del rayo no entra en la cola de
 *      pulsaciones y soltarlo todo lo cancela; la carga de la cámara es opcional; y `escenificar.ts` suelta el
 *      rayo de otro desde su `bala`, no suelta dos veces el propio, estalla con `estalla` y deja la bala del
 *      tirador como estaba.
 *
 * Cada comprobación se vio roja rompiendo en una copia lo que mira (el informe de la fase 0 del rayo). Usa el
 * arnés en corto de los comprobadores del cliente (0 verde, 1 rojo, 2 bloque saltado, 3 reventado).
 */
import { readFileSync } from 'node:fs';
import '../../shared/arcade/juegos';
import { avanzarConMotivo, vistaDeAsiento } from '../../shared/arcade';
import { lizaDeLaMesa, sePuedeLidiar } from '../../shared/arcade/juegos/lizas';
import { ACCION_DEL_QUIEBRO, ESTADO_DEL_QUIEBRO, NIVELES_DEL_RAYO, PROYECTIL_DEL_QUIEBRO } from '../../shared/arcade/juegos/quiebro-reglas';
import type { NivelDelRayo } from '../../shared/arcade/juegos/quiebro-reglas';
import { leerVistaDelQuiebro } from '../../shared/arcade/juegos/quiebro-vista';
import { deNumero } from '../../shared/mecanicas/fijo';
import { accionesDelCable, problemasDeLaDeclaracion } from '../../shared/mecanicas/liza/declaracion';
import type { EfectoDeclarado, LizaDeclarada, PuestaDeEstado, ReglasDeAsiento, TiroDeclarado } from '../../shared/mecanicas/liza/declaracion';
import type { SucesoDelTic } from '../../shared/mecanicas/liza/protocolo';
import { PRIMER_NUMERO_DE_ENTIDAD } from '../../shared/mecanicas/liza/protocolo';
import { camaraNueva, encuadrar } from '../src/quiebro/camara/encuadre';
import { crearRelojDePresentacion } from '../src/quiebro/efectos/reloj';
import { crearSistemaDeEfectos } from '../src/quiebro/efectos/sistema';
import { EstadoDeLosMandos } from '../src/quiebro/mandos/estado';
import { INFO_DE_GESTOS } from '../src/quiebro/personajes/gestos';
import {
  ALTO_DE_LA_BOCA_SIN_MANO,
  cargaDe,
  cargaDelNivel,
  DESTELLOS_COMO_MUCHO,
  EFECTOS_DEL_RAYO_NULOS,
  estadoDelRayoApagado,
  GESTO_DE_CARGAR,
  GESTO_DE_LANZAR,
  leerElTiro,
  nivelDelProyectil,
  nivelDeLaCarga,
  semillaDelRayo,
  UNIFORMES_DEL_DESTELLO,
} from '../src/quiebro/rayo/contrato';
import type { EfectosDelRayo } from '../src/quiebro/rayo/contrato';
import { leerLaLiza } from '../src/quiebro/red/diccionario';
import { Escenificador } from '../src/quiebro/red/escenificar';
import type { Partida } from '../src/quiebro/red/partida';
import type { BalaVista, Novedad } from '../src/quiebro/red/sala-vista';
import type { Sonido } from '../src/quiebro/sonido';

/* ─────────────────────────────── El arnés, en corto ─────────────────────────────── */

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, bien: boolean, detalle?: unknown): boolean {
  hechas++;
  if (!bien) {
    let texto = '';
    if (detalle !== undefined) {
      try {
        texto = ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`.slice(0, 900);
      } catch {
        texto = ` — ${String(detalle)}`;
      }
    }
    fallos.push(`${que}${texto}`);
  }
  return bien;
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}
function nota(texto: string): void {
  console.log(`  ${texto}`);
}
function terminar(escritas: number): never {
  hechas++;
  if (fallos.length > 0) {
    console.log(`\n${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
    for (const f of fallos) console.log(`  ✗ ${f}`);
  }
  if (hechas < escritas) {
    console.error(`\nSólo se han hecho ${hechas} de las ${escritas} comprobaciones escritas: SE HA SALTADO UN BLOQUE.`);
    process.exit(2);
  }
  if (fallos.length > 0) process.exit(1);
  console.log(`\n✔ ${hechas} comprobaciones. Los frentes del rayo se dicen lo que el contrato promete, y cada stub está en su camino.`);
  if (hechas > escritas) console.log(`  (El suelo dice ${escritas} y se han hecho ${hechas}: sube \`escritas\`.)`);
  process.exit(0);
}
const reventar = (error: unknown): void => {
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.error(`\nEL GUION HA REVENTADO después de ${hechas} comprobaciones: no es un veredicto sobre el producto.\n`);
  console.error(error);
  process.exit(3);
};
process.on('uncaughtException', reventar);
process.on('unhandledRejection', reventar);

const casi = (a: number, b: number, tol = 1e-4): boolean => Math.abs(a - b) <= tol;

/* ─────────────────────────────── La liza de verdad, con su tiro ─────────────────────────────── */

/** Una mesa por la misma puerta que la de verdad: el reductor registrado, dos asientos, empezar y vencer la Bajada. */
function lizaDeUnaMesa(): LizaDeclarada | null {
  let estado: unknown = undefined;
  const asientos = ['s1', 's2'];
  const sentados = asientos.map((asiento) => ({ asiento, nombre: asiento }));
  const mandar = (quien: string | null, tipo: string, carga: unknown): void => {
    const s = avanzarConMotivo('quiebro', estado, { tipo, carga }, { quien, azar: 20260926, tic: 0, asientos });
    if (s.motivo === null) estado = s.estado;
  };
  const vista = (): unknown => vistaDeAsiento('quiebro', estado, null, sentados);
  mandar('s1', 'empezar', null);
  const enLaBajada = leerVistaDelQuiebro(vista());
  if (enLaBajada?.reloj !== null && enLaBajada?.reloj !== undefined) mandar(null, 'arcade:reloj', { id: enLaBajada.reloj.id });
  return lizaDeLaMesa('quiebro', vista(), 'RAYOS');
}

const puesta = (estado: number, tics: number): PuestaDeEstado => ({ estado, tics, intocableTics: 0, soltableDesdeTic: tics, distanciaExtra: 0 });
const efecto = (dano: number, p: PuestaDeEstado | null, empuje: number): EfectoDeclarado => ({
  dano,
  danoAlRitmo: dano,
  puntos: 10,
  puntosAlRitmo: 10,
  puesta: p,
  empuje,
  alChocar: { dano: 0, tics: 0 },
  rompeGuardia: false,
});

/**
 * EL TIRO DE JUGUETE sobre una liza de verdad, mientras REGLAS no declare el suyo: los ids reservados, la tabla del
 * §1.2 (sus alcances, áreas, daños y recargas), un estado de cargar y una bala por nivel con ids libres. Los números
 * que la tabla no fija (anchos, velocidad, holgura, carga máxima) son de juguete: aquí no se juzgan.
 */
function conTiroDeJuguete(l: LizaDeclarada): LizaDeclarada {
  let estado = 0;
  for (const e of l.estados) estado = Math.max(estado, e.id);
  estado++;
  let primera = 0;
  for (const p of l.proyectiles) primera = Math.max(primera, p.id);
  primera++;
  const deja = (n: NivelDelRayo): PuestaDeEstado => puesta(ESTADO_DEL_QUIEBRO[n.deja], n.dejaTics);
  const tiro: TiroDeclarado = {
    apuntar: ACCION_DEL_QUIEBRO.apuntarRayo,
    soltar: ACCION_DEL_QUIEBRO.soltarRayo,
    puesta: puesta(estado, 40),
    niveles: NIVELES_DEL_RAYO.map((n, i) => ({
      desdeMs: n.desdeMs,
      proyectil: primera + i,
      ancho: deNumero(0.2),
      area: deNumero(n.areaMetros),
      efectoDelArea: n.areaMetros === 0 ? null : efecto(n.dano, deja(n), deNumero(n.empujeMetros)),
      recargaTics: n.recargaTics,
    })),
    enganche: { radio: deNumero(45), conoRumbos: 8, holgura: deNumero(0.5) },
    holgura: deNumero(0.6),
    cargaMaximaMs: 2000,
  };
  const balas = NIVELES_DEL_RAYO.map((n, i) => ({
    id: primera + i,
    apuntarTics: 1,
    balas: 1,
    cadaTics: 0,
    velocidad: deNumero(400),
    radio: deNumero(0.05),
    alcance: deNumero(n.alcanceMetros),
    efecto: efecto(n.dano, deja(n), deNumero(n.empujeMetros)),
  }));
  return {
    ...l,
    asientos: l.asientos.map((a) => ({ ...a, tiro })),
    estados: [...l.estados, { id: estado, bloqueaPaso: true, bloqueaAccion: false, cancelaCon: [], seCortaConDano: true }],
    proyectiles: [...l.proyectiles, ...balas],
  };
}

/* ─────────────────────────────── 1. La lectura del tiro ─────────────────────────────── */

paso('1. La lectura del tiro: la declaración de verdad, `leerElTiro` y el diccionario');
const HOY = sePuedeLidiar('quiebro') ? lizaDeUnaMesa() : null;
comprobar('El Quiebro está en el registro de lizas y el productor da la liza de una mesa', HOY !== null);
if (HOY !== null) {
  const primero = HOY.asientos[0] as ReglasDeAsiento;
  const yaDeclarado = primero.tiro !== null;
  nota(yaDeclarado ? 'La liza de verdad ya declara su tiro: se mira ése.' : 'La liza de verdad aún no declara tiro (la sala no lo cumple): se mira uno de juguete con los ids reservados y la tabla del §1.2.');
  const CON = yaDeclarado ? HOY : conTiroDeJuguete(HOY);
  const problemas = problemasDeLaDeclaracion(CON);
  /* La frase de hoy la vigila `verify:liza-protocolo` (de REGLAS, que la quita al cablear la sala): aquí, ninguna otra. */
  comprobar(
    'la Liza no le pone al tiro otra pega que la de hoy: que la sala todavía no lo cumple (una por asiento; cuando lo cumpla, ninguna)',
    problemas.every((p) => p.includes('la sala todavía no cumple el tiro')) && (problemas.length === 0 || problemas.length === CON.asientos.length),
    problemas.slice(0, 4),
  );
  const cable = accionesDelCable(CON, CON.asientos[0] as ReglasDeAsiento);
  comprobar(
    'los ids reservados del rayo son los del tiro y van por el cable del asiento',
    cable.indexOf(ACCION_DEL_QUIEBRO.apuntarRayo) >= 0 && cable.indexOf(ACCION_DEL_QUIEBRO.soltarRayo) >= 0,
    cable,
  );

  const declarado = (CON.asientos[0] as ReglasDeAsiento).tiro;
  const t = leerElTiro(declarado, CON.proyectiles);
  const ultimo = NIVELES_DEL_RAYO[NIVELES_DEL_RAYO.length - 1] as NivelDelRayo;
  comprobar(
    'leerElTiro: los ids reservados, el estado de su puesta, y la carga llena en el último nivel de la tabla',
    t !== null && t.apuntar === ACCION_DEL_QUIEBRO.apuntarRayo && t.soltar === ACCION_DEL_QUIEBRO.soltarRayo && t.estado === declarado?.puesta.estado && t.cargaLlenaMs === ultimo.desdeMs && t.cargaMaximaMs === declarado.cargaMaximaMs,
    t === null ? null : { apuntar: t.apuntar, soltar: t.soltar, estado: t.estado, llena: t.cargaLlenaMs },
  );
  const deLaTabla = NIVELES_DEL_RAYO.map((n) => `${n.nivel}:${n.desdeMs}:${n.alcanceMetros}:${n.areaMetros}:${n.recargaTics * 50}`).join('|');
  const leidos = t === null ? '' : t.niveles.map((n) => `${n.nivel}:${n.desdeMs}:${Math.round(n.alcance * 100) / 100}:${Math.round(n.area * 100) / 100}:${n.recargaMs}`).join('|');
  comprobar('y sus niveles son los de la tabla del §1.2, en metros y ms: alcance de su bala, área y recarga', leidos === deLaTabla, { leidos, deLaTabla });
  comprobar(
    'con la velocidad, el radio contra la estructura y el ancho de la declaración, en metros',
    t !== null &&
      t.niveles.every((n, i) => {
        const nd = declarado?.niveles[i];
        const bala = CON.proyectiles.find((p) => p.id === n.proyectil);
        return nd !== undefined && bala !== undefined && casi(n.velocidad, bala.velocidad / 65536) && casi(n.radioContraLaEstructura, bala.radio / 65536) && casi(n.ancho, nd.ancho / 65536);
      }),
  );
  if (declarado !== null) {
    const sinBala = { ...declarado, niveles: [...declarado.niveles.slice(0, -1), { ...(declarado.niveles[declarado.niveles.length - 1] as TiroDeclarado['niveles'][number]), proyectil: 250 }] };
    comprobar(
      'y no lanza: sin tiro, sin niveles o con un nivel sin su bala, `null`',
      leerElTiro(null, CON.proyectiles) === null && leerElTiro({ ...declarado, niveles: [] }, CON.proyectiles) === null && leerElTiro(sinBala, CON.proyectiles) === null,
    );
  }
  if (t !== null) {
    const bordes: string[] = [];
    for (let i = 0; i < t.niveles.length; i++) {
      const n = t.niveles[i];
      if (n === undefined) continue;
      if (nivelDeLaCarga(t, n.desdeMs).nivel !== n.nivel) bordes.push(`en ${String(n.desdeMs)} no sale el ${String(n.nivel)}`);
      if (i > 0 && nivelDeLaCarga(t, n.desdeMs - 1).nivel !== n.nivel - 1) bordes.push(`en ${String(n.desdeMs - 1)} no sale el ${String(n.nivel - 1)}`);
    }
    if (nivelDeLaCarga(t, -50).nivel !== 1 || nivelDeLaCarga(t, Number.NaN).nivel !== 1 || nivelDeLaCarga(t, 60000).nivel !== t.niveles.length) bordes.push('fuera de la tabla');
    comprobar('el nivel de una carga es el ÚLTIMO con desdeMs ≤ la carga (la cuenta de la sala), en cada borde de la tabla', bordes.length === 0, bordes);
    const segundo = t.niveles[1];
    comprobar(
      'la carga de 0 a 1 llega a 1 en la carga llena y no pasa; la de un rayo ajeno es la del principio de su nivel',
      cargaDe(t, 0) === 0 && cargaDe(t, t.cargaLlenaMs / 2) === 0.5 && cargaDe(t, t.cargaLlenaMs) === 1 && cargaDe(t, t.cargaLlenaMs * 4) === 1 && cargaDe(t, -10) === 0 && segundo !== undefined && cargaDelNivel(t, segundo) === segundo.desdeMs / t.cargaLlenaMs,
    );
    comprobar(
      'el nivel de una bala se reconoce por su proyectil, y la bala del tirador no es de ningún nivel',
      t.niveles.every((n) => nivelDelProyectil(t, n.proyectil)?.nivel === n.nivel) && nivelDelProyectil(t, PROYECTIL_DEL_QUIEBRO.bala) === null,
    );
  }

  const l = leerLaLiza(CON, 1);
  comprobar(
    'el diccionario: el botón del rayo es la sostenida del tiro, cargar y soltar tienen sus gestos, y su estado es «cargando»',
    t !== null &&
      l.botones.rayo === t.apuntar &&
      l.tiro?.soltar === t.soltar &&
      l.gestoDeLaAccion(t.apuntar) === GESTO_DE_CARGAR &&
      l.gestoDeLaAccion(t.soltar) === GESTO_DE_LANZAR &&
      l.sentidoDelEstado(t.estado) === 'cargando' &&
      l.gestoDelEstado(t.estado) === 'cargar-rayo',
    { botones: l.botones, sentido: t === null ? null : l.sentidoDelEstado(t.estado) },
  );
  comprobar(
    'y el tiro de cada asiento por su número, y ninguno fuera de la liza',
    CON.asientos.every((_, i) => l.tiroDelAsiento(i + 1)?.apuntar === ACCION_DEL_QUIEBRO.apuntarRayo) && l.tiroDelAsiento(0) === null && l.tiroDelAsiento(CON.asientos.length + 1) === null,
  );
  const deHoy = leerLaLiza(HOY, 1);
  comprobar(
    'la liza de hoy, tal cual: sin tiro, ni botón del rayo ni tiro de nadie; con él, el de su declaración',
    yaDeclarado ? deHoy.botones.rayo === ACCION_DEL_QUIEBRO.apuntarRayo && deHoy.tiro !== null : deHoy.botones.rayo === 0 && deHoy.tiro === null && deHoy.tiroDelAsiento(1) === null,
  );

  /* ─────────────────────────────── 1 bis. Un stub en su camino: `escenificar.ts` ─────────────────────────────── */

  paso('1 bis. `escenificar.ts`, sobre la liza de verdad: el rayo de otro, el propio, `estalla` y la bala del tirador');
  if (t !== null) {
    const sistema = crearSistemaDeEfectos(crearRelojDePresentacion(), 0);
    const llamadas: string[] = [];
    const espia: EfectosDelRayo = {
      empezarCarga: (quien) => void llamadas.push(`empezar ${String(quien)}`),
      actualizarCarga: (quien) => void llamadas.push(`actualizar ${String(quien)}`),
      cancelarCarga: (quien) => void llamadas.push(`cancelar ${String(quien)}`),
      soltar: (d) => void llamadas.push(`soltar ${String(d.quien)} ${String(d.bala)} n${String(d.nivel)} a${String(Math.round(d.area * 1000) / 1000)}`),
      estallar: (e) => void llamadas.push(`estallar ${String(e.quien)} ${String(e.bala)} n${String(e.nivel)} a${String(Math.round(e.area * 1000) / 1000)}`),
    };
    sistema.rayo = espia;
    let balasDelSistema = 0;
    const disparar = sistema.balas.disparar.bind(sistema.balas);
    sistema.balas.disparar = (bala) => {
      balasDelSistema++;
      return disparar(bala);
    };
    const sonados: string[] = [];
    const sonido = { sonar: (id: string) => void sonados.push(id) } as unknown as Sonido;
    const cola: Novedad[] = [];
    const falsa = (lectura: ReturnType<typeof leerLaLiza>): Partida =>
      ({ lectura, sala: { yo: 1 }, paraLaEscena: cola, pulsacionesAtendidas: [], sitioDe: () => null, pintadoDe: () => null }) as unknown as Partida;
    const suceso = (s: SucesoDelTic, bala: BalaVista | null): Novedad => ({ tipo: 'suceso', k: 1, llegoMs: 1000, suceso: s, anuncio: null, bala, entidad: null, monton: null, apuntado: null });
    const vista = (id: number, de: number, p: number): BalaVista => ({ id, de, p, x: 1, z: 2, r: 64, salidaMs: 990 });
    const segundo = t.niveles[1] as (typeof t.niveles)[number];
    const pleno = t.niveles[t.niveles.length - 1] as (typeof t.niveles)[number];
    const tirador = PRIMER_NUMERO_DE_ENTIDAD + 4;
    const escena = new Escenificador(falsa(l), sistema, sonido);
    cola.push(suceso({ e: 'bala', id: 30, de: 2, p: segundo.proyectil, x: 100, z: 200, r: 64, t: 5 }, vista(30, 2, segundo.proyectil)));
    cola.push(suceso({ e: 'bala', id: 31, de: 1, p: pleno.proyectil, x: 0, z: 0, r: 0, t: 5 }, vista(31, 1, pleno.proyectil)));
    cola.push(suceso({ e: 'estalla', bala: 30, x: 150, z: 250 }, vista(30, 2, segundo.proyectil)));
    cola.push(suceso({ e: 'bala', id: 40, de: tirador, p: PROYECTIL_DEL_QUIEBRO.bala, x: 0, z: 0, r: 0, t: 5 }, vista(40, tirador, PROYECTIL_DEL_QUIEBRO.bala)));
    escena.drenar(1000);
    const cuantas = (x: string): number => llamadas.filter((c) => c === x).length;
    const area = Math.round(segundo.area * 1000) / 1000;
    comprobar(
      'el rayo de otro se suelta desde su `bala`, una vez, con su nivel y su área; el propio no se suelta otra vez; `estalla` estalla; y la bala del tirador sigue siendo una bala',
      cuantas(`soltar 2 30 n${String(segundo.nivel)} a${String(area)}`) === 1 &&
        !llamadas.some((c) => c.startsWith('soltar 1 ')) &&
        cuantas(`estallar 2 30 n${String(segundo.nivel)} a${String(area)}`) === 1 &&
        balasDelSistema === 1 &&
        sonados.filter((s) => s === 'disparo').length === 1,
      { llamadas, balasDelSistema, sonados },
    );
    llamadas.length = 0;
    balasDelSistema = 0;
    const sinTiro = new Escenificador(falsa(leerLaLiza(HOY, 1)), sistema, sonido);
    cola.push(suceso({ e: 'bala', id: 32, de: 2, p: PROYECTIL_DEL_QUIEBRO.bala, x: 0, z: 0, r: 0, t: 5 }, vista(32, 2, PROYECTIL_DEL_QUIEBRO.bala)));
    sinTiro.drenar(1000);
    comprobar('y una bala que no es de ningún nivel de un tiro es la de siempre, sea de quien sea (nada del rayo)', !llamadas.some((c) => c.startsWith('soltar')) && balasDelSistema === 1, { llamadas, balasDelSistema });
  }
}

/* ─────────────────────────────── 2. Lo demás del contrato ─────────────────────────────── */

paso('2. Lo demás del contrato: el estado, la semilla, los efectos nulos, la luz del destello y los gestos');
{
  const a = estadoDelRayoApagado();
  const b = estadoDelRayoApagado();
  comprobar(
    'el estado de la carga empieza apagado (sin carga, sin nivel, sin blanco, sin recarga) y cada dueño tiene el suyo',
    !a.activo && Number.isNaN(a.desdeMs) && a.c === 0 && a.nivel === 0 && a.blanco === 0 && a.area === 0 && a.recargaHastaMs === 0 && a !== b && a.apuntado !== b.apuntado,
  );
  const semillas = new Set<number>();
  for (let de = 1; de <= 6; de++) for (let n = 16; n < 216; n++) semillas.add(semillaDelRayo(de, n));
  comprobar(
    'la semilla del rayo: la misma para lo mismo, un entero sin signo de 32 bits, y distinta para rayos distintos',
    semillaDelRayo(2, 30) === semillaDelRayo(2, 30) && semillaDelRayo(2, 30) !== semillaDelRayo(3, 30) && [...semillas].every((s) => Number.isInteger(s) && s >= 0 && s <= 0xffffffff) && semillas.size === 1200,
    semillas.size,
  );
  const metodos = ['empezarCarga', 'actualizarCarga', 'cancelarCarga', 'soltar', 'estallar'] as const;
  comprobar(
    'los efectos nulos tienen los cinco métodos, no hacen nada y no se pueden cambiar',
    Object.isFrozen(EFECTOS_DEL_RAYO_NULOS) && metodos.every((k) => typeof EFECTOS_DEL_RAYO_NULOS[k] === 'function') && EFECTOS_DEL_RAYO_NULOS.soltar({} as never) === undefined,
  );
  comprobar(
    'los uniformes del destello: un vec4 de sitio y otro de color por destello, y empiezan apagados',
    DESTELLOS_COMO_MUCHO >= 1 &&
      UNIFORMES_DEL_DESTELLO.uDestelloQ.value.length === 4 * DESTELLOS_COMO_MUCHO &&
      UNIFORMES_DEL_DESTELLO.uDestelloColorQ.value.length === 4 * DESTELLOS_COMO_MUCHO &&
      UNIFORMES_DEL_DESTELLO.uDestelloQ.value.every((x) => x === 0) &&
      UNIFORMES_DEL_DESTELLO.uDestelloColorQ.value.every((x) => x === 0),
  );
  comprobar(
    'los dos gestos del rayo: cargar es un bucle y lanzar un golpe (con su impacto en el instante del destello)',
    GESTO_DE_CARGAR === 'cargar-rayo' && GESTO_DE_LANZAR === 'lanzar-rayo' && INFO_DE_GESTOS['cargar-rayo'].tipo === 'bucle' && INFO_DE_GESTOS['lanzar-rayo'].tipo === 'golpe',
  );
  const crudo = readFileSync(new URL('../src/quiebro/rayo/contrato.ts', import.meta.url), 'utf8');
  const codigo = crudo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  comprobar(
    'el contrato se lee en Node: ni three, ni React, ni el DOM, ni el reloj del navegador',
    !/from\s+['"](three|react|react-dom|@react-three\/[^'"]+)['"]/.test(codigo) && !/\b(document|window|performance)\./.test(codigo) && ALTO_DE_LA_BOCA_SIN_MANO > 0,
  );
  const marcas = /the matrix|matrix (reloaded|revolutions|resurrections)|agente? smith|\bmorpheus\b|\btrinity\b|nabucodonosor|bullet[- ]?time/i;
  comprobar('y está en LF y sin nada de la marca ajena', !crudo.includes('\r') && !marcas.test(crudo));
}

/* ─────────────────────────────── 3. Los stubs en su camino ─────────────────────────────── */

paso('3. Los stubs en su camino: el sistema de efectos, los mandos y la cámara');
{
  const sistema = crearSistemaDeEfectos(crearRelojDePresentacion(), 0);
  const metodos = ['empezarCarga', 'actualizarCarga', 'cancelarCarga', 'soltar', 'estallar'] as const;
  comprobar('el sistema de efectos cuelga los efectos del rayo, y la boca empieza sin poner (la ponen los personajes)', metodos.every((k) => typeof sistema.rayo[k] === 'function') && sistema.boca === null);
  const m = new EstadoDeLosMandos();
  m.pulsar('rayo', 5);
  const enLaCola = m.tomarPulsaciones().length;
  /* Una carga a medias (puesta a mano: en la fase 0 `cargarRayo` todavía no la pone) que soltarlo todo tiene que cancelar. */
  m.rayoDesde = 5;
  m.soltarTodo();
  comprobar('el rayo no pasa por la cola de pulsaciones, y soltarlo todo lo CANCELA (irse no dispara)', enLaCola === 0 && m.rayoDesde === null && m.tomarPulsaciones().length === 0);
  const situacion = { x: 0, z: 0, dt: 1, enemigosCerca: false, blanco: null, mandaElDedo: true, remanso: 0, tactil: true, vigia: false, cajas: [] };
  const sinCarga = encuadrar(camaraNueva(0), situacion);
  const cargaCero = encuadrar(camaraNueva(0), { ...situacion, carga: 0 });
  comprobar(
    'la carga de la cámara es opcional: sin ella, o con 0, el encuadre es el de siempre',
    sinCarga.fov === cargaCero.fov && sinCarga.ojo.x === cargaCero.ojo.x && sinCarga.ojo.y === cargaCero.ojo.y && sinCarga.ojo.z === cargaCero.ojo.z && sinCarga.fov === 75,
    { sinCarga, cargaCero },
  );
}

/*
 * El suelo: 3 de la liza de verdad y su cable, 4 de `leerElTiro`, 3 del nivel y la carga, 3 del diccionario, 2 de
 * `escenificar.ts`, 7 de lo demás del contrato, 3 de los stubs, y el cierre, que cuenta como en los demás del cliente.
 */
terminar(26);
