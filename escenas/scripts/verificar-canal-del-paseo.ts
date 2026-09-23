/**
 * EL CANAL DEL PASEO, MEDIDO SIN RED.
 *
 *   npm run verify:canal-del-paseo -w escenas
 *
 * ═══ QUÉ SE MIDE, Y CON QUÉ ═══
 *
 * El lado del aparato del canal de Boots on Board (`escenas/paseo/canal-de-botas.ts`) contra un
 * WebSocket DE MENTIRA —que apunta lo que se le manda y deja al comprobador hacer de servidor— y
 * un reloj de mentira que sólo avanza cuando se le dice. Sin red, sin servidor y sin esperar de
 * verdad: las esperas de reconexión son de quince segundos y aquí se recorren en un instante.
 * Y con el paseo DE VERDAD (`paseante.ts`): los tics que se mandan son los que da el paso de
 * `shared/`, no unos inventados para la prueba.
 *
 *  1. EL ORDEN. `hola` lo primero, con la llave, y la llave en ningún otro sitio; nada más hasta
 *     `dentro`; y con `dentro` el paseante está donde dijo el servidor.
 *  2. LO QUE SE MANDA. Un `aqui` por tic con los números de la costura, que el lector estricto del
 *     servidor acepta; quieto, sólo los avisos de quieto.
 *  3. LO QUE SE RECIBE. `corrige` corrige, y una corrección ya contestada no vuelve a tirar; las
 *     fotos se pintan `RETRASO_DE_LOS_DEMAS_MS` atrás y nunca por delante de la última; quien deja
 *     de salir desaparece; lo mal formado se tira y se cuenta.
 *  4. CUANDO SE CORTA. Con `llaveMala`, `mesaQueNo` y `reemplazado` no se vuelve; con lo demás sí,
 *     con la espera doblándose hasta su tope; con `quieto`, sólo al volver a moverse.
 *  5. LA CÁMARA DE HOMBRO. Se acerca delante de un muro sin saltar, no se queda nunca al otro
 *     lado, no baja del mínimo, y vuelve a su sitio al apartarse.
 *  6. EL RÓTULO. Se escribe lo que tiene dibujo, mira a la cámara y se lee desde el hombro.
 *  7. EL MONTAJE. La escena abre el canal SÓLO con la prop, y los dos clientes se la pasan SÓLO en
 *     una mesa `botas`, con la misma pregunta.
 *
 * Cada comprobación se ha visto roja rompiendo a propósito lo que vigila (ver el informe de la
 * sesión que la escribió); las que pueden llevan además su vacuna aquí dentro: la cuenta del revés
 * tiene que salir distinta, o la comprobación no está mirando lo que dice.
 */
import fs from 'node:fs';
import * as THREE from 'three';
import {
  AVISOS_QUIETO_POR_SEGUNDO,
  CIERRE,
  RETRASO_DE_LOS_DEMAS_MS,
  TOPE_DE_MENSAJE_BYTES,
  VERSION_DEL_CANAL,
  leerMensajeDelAparato,
  rutaDelCanal,
} from '../../shared/mecanicas/canal-de-botas';
import { ANDANDO, QUIETO, RADIO_DEL_PASEANTE, RUMBOS, TICS_POR_SEGUNDO, radianesDelRumbo } from '../../shared/mecanicas/andar';
import { aNumero, deNumero } from '../../shared/mecanicas/fijo';
import { arenaDe, seAndaEnRecta, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Andante, Arena, Casilla, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
import {
  abrirElCanal,
  esperaTras,
  PLAZO_PARA_ENTRAR_MS,
  poseEntreFotos,
  PRIMERA_ESPERA_MS,
  SE_DA_POR_ESTABLE_MS,
  TICS_ENTRE_AVISOS_QUIETO,
  TOPE_DE_ESPERA_MS,
} from '../paseo/canal-de-botas';
import type { ClienteDelCanal, EstadoDelCanal, Muestra, RelojDelCanal, SocketDelCanal } from '../paseo/canal-de-botas';
import {
  acercarElHombro,
  ATRAS_DEL_HOMBRO,
  ATRAS_MINIMO_DEL_HOMBRO,
  camaraDeHombro,
  hastaDondeCabeElHombro,
} from '../paseo/camaras';
import { mandosDelFotograma, SIN_MANDOS_DE_FUERA, SIN_TECLAS } from '../paseo/mandos';
import type { EntradaDelTic, Mandos } from '../paseo/mandos';
import { asientosQueAndan, COLOR_SIN_DECLARAR, esMesaDeBotas } from '../paseo/mesa-de-botas';
import { corregirElPaseo, fotogramaDelPaseo, nacerEnElPaseo, poseDelPaseo } from '../paseo/paseante';
import type { EstadoDelPaseo } from '../paseo/paseante';
import { ALTO_MAXIMO_DEL_ROTULO, altoDelRotulo, geometriaDelRotulo, letrasDelRotulo } from '../paseo/rotulo';
import { direccionDelCanal as direccionDelEscritorio } from '../../escritorio/src/mesa';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`);
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

/* ─── El servidor de mentira: un socket que apunta, y un reloj que sólo anda cuando se le dice ─── */

/** Un WebSocket de mentira. Lo que el canal le hace se apunta; lo que haría el servidor, se llama. */
class SocketDePrueba implements SocketDelCanal {
  readyState = 0;
  readonly url: string;
  readonly enviados: string[] = [];
  cerradoPorElCliente: { readonly codigo: number | undefined; readonly motivo: string | undefined } | null = null;
  onopen: ((suceso: unknown) => void) | null = null;
  onmessage: ((suceso: { readonly data: unknown }) => void) | null = null;
  onclose: ((suceso: { readonly code: number; readonly reason: string }) => void) | null = null;
  onerror: ((suceso: unknown) => void) | null = null;
  constructor(url: string) {
    this.url = url;
  }
  send(datos: string): void {
    /* Un navegador lanza si se manda sin abrir: el canal no debe intentarlo. */
    if (this.readyState !== 1) throw new Error('se ha mandado algo con el socket sin abrir');
    this.enviados.push(datos);
  }
  close(codigo?: number, motivo?: string): void {
    this.cerradoPorElCliente = { codigo, motivo };
    this.readyState = 3;
  }
  /* ── Lo que hace el servidor ── */
  abrir(): void {
    this.readyState = 1;
    this.onopen?.({});
  }
  llega(datos: unknown): void {
    this.onmessage?.({ data: datos });
  }
  cae(codigo: number, razon = ''): void {
    this.readyState = 3;
    this.onclose?.({ code: codigo, reason: razon });
  }
}

/** Un reloj que sólo avanza con `avanzar`, y que llama a los temporizadores en su orden. */
class RelojDePrueba implements RelojDelCanal {
  t = 1000;
  private pendientes: { cuando: number; fn: () => void; vivo: boolean }[] = [];
  ahora(): number {
    return this.t;
  }
  tras(ms: number, fn: () => void): () => void {
    const p = { cuando: this.t + ms, fn, vivo: true };
    this.pendientes.push(p);
    return () => {
      p.vivo = false;
    };
  }
  avanzar(ms: number): void {
    const hasta = this.t + ms;
    for (;;) {
      const listos = this.pendientes.filter((p) => p.vivo && p.cuando <= hasta).sort((a, b) => a.cuando - b.cuando);
      const siguiente = listos[0];
      if (siguiente === undefined) break;
      this.t = siguiente.cuando;
      siguiente.vivo = false;
      siguiente.fn();
    }
    this.t = hasta;
    this.pendientes = this.pendientes.filter((p) => p.vivo);
  }
}

const CODIGO = 'LNDS1';
const DIRECCION = `ws://localhost:5174${rutaDelCanal(CODIGO)}`;
const LLAVE = 'llave-de-asiento-0123456789abcdef';

interface Banco {
  readonly cliente: ClienteDelCanal;
  readonly creados: SocketDePrueba[];
  readonly reloj: RelojDePrueba;
  readonly correcciones: Andante[];
  readonly estados: EstadoDelCanal[];
  readonly presentes: (readonly string[])[];
  /** El último socket que abrió el canal. */
  socket(): SocketDePrueba;
  /** Lo que se ha mandado por el último socket, ya leído con el lector ESTRICTO del servidor. */
  leidos(): ReturnType<typeof leerMensajeDelAparato>[];
}

/** Un canal contra el servidor de mentira. `corregir` es la costura (b); por defecto sólo apunta. */
function unBanco(corregir?: (sitio: Andante) => void): Banco {
  const creados: SocketDePrueba[] = [];
  class Fabrica extends SocketDePrueba {
    constructor(url: string) {
      super(url);
      creados.push(this);
    }
  }
  const reloj = new RelojDePrueba();
  const correcciones: Andante[] = [];
  const estados: EstadoDelCanal[] = [];
  const presentes: (readonly string[])[] = [];
  const cliente = abrirElCanal({
    url: DIRECCION,
    llave: LLAVE,
    yo: 's1',
    corregir: (sitio) => {
      correcciones.push(sitio);
      corregir?.(sitio);
    },
    alCambiar: (e) => estados.push(e),
    alCambiarLosPresentes: (p) => presentes.push(p),
    WebSocket: Fabrica,
    reloj,
  });
  const socket = (): SocketDePrueba => {
    const s = creados[creados.length - 1];
    if (s === undefined) throw new Error('el canal no ha abierto ningún socket');
    return s;
  };
  return {
    cliente,
    creados,
    reloj,
    correcciones,
    estados,
    presentes,
    socket,
    leidos: () => socket().enviados.map((t) => leerMensajeDelAparato(t)),
  };
}

function dentro(x: number, z: number, yo = 's1'): string {
  return JSON.stringify({ t: 'dentro', yo, x: deNumero(x), z: deNumero(z), r: 0, hz: 10 });
}

/** Una foto: `[asiento, x, z, rumbo]` en unidades del mundo, andando. */
function unaFoto(k: number, quienes: readonly (readonly [string, number, number, number])[]): string {
  return JSON.stringify({ t: 'foto', k, p: quienes.map(([a, x, z, r]) => [a, deNumero(x), deNumero(z), r, ANDANDO]) });
}

/* ─── Un mundo de prueba: siete por siete casillas de diez, como el de `verify:paseo` ─── */

const LADO = 10;
function mundoDePrueba(cuerpos: readonly Cuerpo[]): MundoDeclarado {
  const pisables: Casilla[] = [];
  for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) pisables.push({ x, y });
  return { lado: LADO, pisables, vados: [], cuerpos, nace: [{ x: 0, z: 0, rumbo: 0 }] };
}
/** Una muralla al SUR de donde se nace: de −30 a 30 en `x`, de 10 a 12 en `z`. */
const MURALLA: Cuerpo = { x0: -30, z0: 10, x1: 30, z1: 12 };
const ABIERTO = arenaDe(mundoDePrueba([]));
const CON_MURALLA = arenaDe(mundoDePrueba([MURALLA]));

const ADELANTE: Mandos = mandosDelFotograma({ ...SIN_TECLAS, adelante: true }, SIN_MANDOS_DE_FUERA);
const ATRAS: Mandos = mandosDelFotograma({ ...SIN_TECLAS, atras: true }, SIN_MANDOS_DE_FUERA);
const NADA: Mandos = mandosDelFotograma(SIN_TECLAS, SIN_MANDOS_DE_FUERA);

/**
 * Da `n` fotogramas de un sesentavo con el paseo de verdad, pasándole cada tic al canal y
 * apuntándolo. Devuelve el estado y lo que dio la costura.
 */
function andarCon(
  arena: Arena,
  desde: EstadoDelPaseo,
  mandos: Mandos,
  n: number,
  canal: ClienteDelCanal,
): { estado: EstadoDelPaseo; costura: { entrada: EntradaDelTic; sitio: Andante }[] } {
  let e = desde;
  const costura: { entrada: EntradaDelTic; sitio: Andante }[] = [];
  const apunta = (entrada: EntradaDelTic, sitio: Andante): void => {
    costura.push({ entrada, sitio });
    canal.alDarUnTic(entrada, sitio);
  };
  for (let i = 0; i < n; i++) e = fotogramaDelPaseo(arena, e, 1 / 60, mandos, apunta);
  return { estado: e, costura };
}

// ---------------------------------------------------------------------------
paso('El orden: `hola` lo primero y con la llave, nada antes de `dentro`, y con `dentro` se está donde dice el servidor');
// ---------------------------------------------------------------------------

{
  /* El paseante de verdad, y la costura (b) que lo corrige: lo que haría `usarElPaseo`. */
  let paseante = nacerEnElPaseo(ABIERTO, { x: -20, z: 20, rumbo: 0 });
  const b = unBanco((sitio) => {
    paseante = corregirElPaseo(paseante, sitio);
  });

  comprobar('abrir el canal abre UN socket, a la dirección que dio el cliente', b.creados.length === 1 && b.socket().url === DIRECCION, {
    creados: b.creados.length,
  });
  comprobar(
    'y la llave NO va en la dirección: las direcciones acaban en los registros del borde',
    !b.socket().url.includes(LLAVE) && !/llave=/.test(b.socket().url),
  );
  comprobar('antes de abrirse no se ha mandado nada', b.socket().enviados.length === 0);
  const primero = b.estados[0];
  comprobar('y la pantalla dice «Conectando…»', primero?.fase === 'conectando' && primero.texto === 'Conectando…', primero);

  b.socket().abrir();
  const hola = b.leidos()[0];
  comprobar(
    'al abrirse, lo primero es `hola`, con la versión y la llave, y el lector estricto del servidor lo acepta',
    b.socket().enviados.length === 1 && hola !== null && hola !== undefined && hola.t === 'hola' && hola.v === VERSION_DEL_CANAL && hola.llave === LLAVE,
    b.socket().enviados,
  );

  /* El paseo anda antes de que el servidor conteste: nada de eso puede salir. */
  const antes = andarCon(ABIERTO, paseante, ADELANTE, 45, b.cliente);
  paseante = antes.estado;
  comprobar(
    `con ${String(antes.costura.length)} tics dados antes de \`dentro\`, no sale ninguno: sólo el \`hola\``,
    antes.costura.length >= 10 && b.socket().enviados.length === 1,
    { tics: antes.costura.length, enviados: b.socket().enviados.length },
  );

  b.socket().llega(dentro(3.5, -2.25));
  const pose = poseDelPaseo(paseante);
  comprobar(
    'con `dentro`, el paseante está EXACTAMENTE donde dijo el servidor, y se pinta ahí',
    b.correcciones.length === 1 &&
      paseante.ahora.x === deNumero(3.5) &&
      paseante.ahora.z === deNumero(-2.25) &&
      Math.abs(pose.x - 3.5) < 1e-9 &&
      Math.abs(pose.z + 2.25) < 1e-9,
    { ahora: paseante.ahora, pose: { x: pose.x, z: pose.z } },
  );
  const ahora = b.cliente.estado();
  comprobar('y la pantalla dice «Dentro», con el asiento que dio el servidor', ahora.fase === 'dentro' && ahora.texto === 'Dentro' && ahora.yo === 's1', ahora);
}

// ---------------------------------------------------------------------------
paso('Lo que se manda: un `aqui` por tic con los números de la costura, y quieto sólo los avisos de quieto');
// ---------------------------------------------------------------------------

{
  let paseante = nacerEnElPaseo(ABIERTO, { x: 0, z: 25, rumbo: 0 });
  const b = unBanco((sitio) => {
    paseante = corregirElPaseo(paseante, sitio);
  });
  b.socket().abrir();
  b.socket().llega(dentro(0, 25));

  /* ANDANDO: tres segundos, sesenta tics. */
  const andando = andarCon(ABIERTO, paseante, ADELANTE, 180, b.cliente);
  paseante = andando.estado;
  const aquis = b.leidos().slice(1);
  const iguales = andando.costura.every((c, i) => {
    const m = aquis[i];
    return (
      m !== null &&
      m !== undefined &&
      m.t === 'aqui' &&
      m.n === c.entrada.tic &&
      m.r === c.entrada.mira &&
      m.m === c.entrada.marcha &&
      m.x === c.sitio.x &&
      m.z === c.sitio.z
    );
  });
  comprobar(
    `andando, ${String(andando.costura.length)} tics dan ${String(aquis.length)} \`aqui\`: uno por tic, y todos pasan el lector estricto del servidor`,
    andando.costura.length === 60 && aquis.length === andando.costura.length && aquis.every((m) => m !== null),
    { tics: andando.costura.length, aquis: aquis.length },
  );
  comprobar('y cada uno lleva los números de la costura tal cual: tic, mirada, marcha y el sitio en Q16.16', iguales);

  /*
   * ANDANDO HACIA ATRÁS: `r` es hacia dónde MIRA, no hacia dónde da el paso. Con el rumbo del paso
   * —media vuelta de más— los demás verían a quien retrocede darse la vuelta y andar de frente.
   */
  {
    let otro = nacerEnElPaseo(ABIERTO, { x: 0, z: 25, rumbo: 0 });
    const c = unBanco((sitio) => {
      otro = corregirElPaseo(otro, sitio);
    });
    c.socket().abrir();
    c.socket().llega(dentro(0, 25));
    const atras = andarCon(ABIERTO, otro, ATRAS, 30, c.cliente);
    const suyos = c.leidos().slice(1).filter((m) => m !== null && m.t === 'aqui');
    const primera = atras.costura[0];
    const primero = suyos[0];
    comprobar(
      'andando hacia atrás, lo que viaja es la mirada y no el paso (que lleva media vuelta de más)',
      primera !== undefined &&
        primero !== null &&
        primero !== undefined &&
        primero.t === 'aqui' &&
        primero.r === primera.entrada.mira &&
        primera.entrada.rumbo === (primera.entrada.mira + RUMBOS / 2) % RUMBOS,
      { primera: primera?.entrada, primero },
    );
  }
  const largo = Math.max(...b.socket().enviados.map((t) => t.length));
  const porSegundo = (b.socket().enviados.slice(1).reduce((a, t) => a + t.length, 0) / 3) | 0;
  console.log(`  andando: ${String(TICS_POR_SEGUNDO)} mensajes por segundo, ${String(porSegundo)} bytes por segundo; el más largo, ${String(largo)} de ${String(TOPE_DE_MENSAJE_BYTES)}`);
  comprobar('y ninguno pasa del tope de un mensaje del aparato', largo <= TOPE_DE_MENSAJE_BYTES, { largo });

  /* QUIETO: diez segundos, doscientos tics. */
  const antesDeParar = b.socket().enviados.length;
  const parado = andarCon(ABIERTO, paseante, NADA, 600, b.cliente);
  paseante = parado.estado;
  const quietos = b.leidos().slice(antesDeParar);
  const segundos = parado.costura.length / TICS_POR_SEGUNDO;
  console.log(`  quieto: ${String(parado.costura.length)} tics en ${String(segundos)} s dan ${String(quietos.length)} avisos`);
  comprobar(
    `quieto, ${String(parado.costura.length)} tics dan ${String(AVISOS_QUIETO_POR_SEGUNDO)} avisos por segundo y ni uno más`,
    parado.costura.length === 200 && quietos.length === parado.costura.length / TICS_ENTRE_AVISOS_QUIETO && quietos.length === segundos * AVISOS_QUIETO_POR_SEGUNDO,
    { tics: parado.costura.length, avisos: quietos.length },
  );
  const primeroQuieto = quietos[0];
  comprobar(
    'y el primero sale en el primer tic quieto: es el que dice a los demás que se ha parado',
    primeroQuieto !== null && primeroQuieto !== undefined && primeroQuieto.t === 'aqui' && primeroQuieto.n === parado.costura[0]?.entrada.tic && primeroQuieto.m === QUIETO,
    primeroQuieto,
  );
  comprobar('y todos dicen marcha quieta', quietos.every((m) => m !== null && m.t === 'aqui' && m.m === QUIETO));

  /* Y al volver a andar, otra vez uno por tic. */
  const antesDeVolver = b.socket().enviados.length;
  const otraVez = andarCon(ABIERTO, paseante, ATRAS, 30, b.cliente);
  comprobar(
    'y al volver a andar, otra vez uno por tic',
    b.socket().enviados.length - antesDeVolver === otraVez.costura.length && otraVez.costura.length === 10,
    { tics: otraVez.costura.length, mandados: b.socket().enviados.length - antesDeVolver },
  );
}

// ---------------------------------------------------------------------------
paso('Lo que se recibe: `corrige` corrige, y una corrección ya contestada no vuelve a tirar');
// ---------------------------------------------------------------------------

{
  let paseante = nacerEnElPaseo(ABIERTO, { x: 0, z: 25, rumbo: 0 });
  const b = unBanco((sitio) => {
    paseante = corregirElPaseo(paseante, sitio);
  });
  b.socket().abrir();
  b.socket().llega(dentro(0, 25));
  paseante = andarCon(ABIERTO, paseante, ADELANTE, 60, b.cliente).estado;
  const ultimo = b.leidos().filter((m) => m !== null && m.t === 'aqui').pop();
  const n = ultimo !== null && ultimo !== undefined && ultimo.t === 'aqui' ? ultimo.n : -1;

  b.socket().llega(JSON.stringify({ t: 'corrige', n: n - 3, x: deNumero(-7), z: deNumero(18) }));
  comprobar(
    '`corrige` pone al paseante en el sitio bueno que dice el servidor',
    b.correcciones.length === 2 && paseante.ahora.x === deNumero(-7) && paseante.ahora.z === deNumero(18),
    { correcciones: b.correcciones.length, ahora: paseante.ahora },
  );
  /* Los tics que se mandaron detrás del malo el servidor los rechaza también: esos `corrige` ya están contestados. */
  b.socket().llega(JSON.stringify({ t: 'corrige', n: n - 2, x: deNumero(-7), z: deNumero(18) }));
  b.socket().llega(JSON.stringify({ t: 'corrige', n, x: deNumero(-7), z: deNumero(18) }));
  paseante = andarCon(ABIERTO, paseante, ADELANTE, 30, b.cliente).estado;
  const tarde = paseante.ahora;
  b.socket().llega(JSON.stringify({ t: 'corrige', n: n - 1, x: deNumero(-7), z: deNumero(18) }));
  comprobar(
    'y los `corrige` de los tics que salieron antes de corregirse no lo devuelven atrás: ya se había andado desde el sitio bueno',
    b.correcciones.length === 2 && paseante.ahora === tarde,
    { correcciones: b.correcciones.length },
  );
  const siguiente = b.leidos().filter((m) => m !== null && m.t === 'aqui').pop();
  const m2 = siguiente !== null && siguiente !== undefined && siguiente.t === 'aqui' ? siguiente.n : -1;
  b.socket().llega(JSON.stringify({ t: 'corrige', n: m2, x: deNumero(5), z: deNumero(5) }));
  comprobar(
    'y uno de un tic de DESPUÉS de corregirse sí corrige',
    b.correcciones.length === 3 && paseante.ahora.x === deNumero(5) && paseante.ahora.z === deNumero(5),
    { correcciones: b.correcciones.length, ahora: paseante.ahora },
  );
}

// ---------------------------------------------------------------------------
paso(`Las fotos: a los demás se les pinta ${String(RETRASO_DE_LOS_DEMAS_MS)} ms atrás, y nunca por delante de la última`);
// ---------------------------------------------------------------------------

{
  const b = unBanco();
  b.socket().abrir();
  b.socket().llega(dentro(0, 0));
  /*
   * `s2` anda hacia el este a doce por segundo: una foto cada cien milisegundos, doce fotos. En cada
   * foto sale también `s1`, que soy yo. Se pregunta como pregunta la escena —a la hora de AHORA,
   * cada siete milisegundos, con las fotos llegando entre medias— y se compara con la cuenta hecha
   * aparte sobre las fotos que ya habían llegado.
   */
  const ESTE = 64;
  const inicio = b.reloj.ahora();
  const xDe = (k: number): number => aNumero(deNumero(-10 + 1.2 * k));
  const llegadas: { readonly t: number; readonly x: number }[] = [];
  let malInterpolados = 0;
  let porDelante = 0;
  let velocidadMala = 0;
  let rumboMalo = 0;
  let entreDos = 0;
  const peor: unknown[] = [];
  for (let d = 0; d <= 1400; d += 7) {
    const ahora = inicio + d;
    while (llegadas.length < 12 && inicio + 100 * llegadas.length <= ahora) {
      const k = llegadas.length + 1;
      b.reloj.avanzar(inicio + 100 * (k - 1) - b.reloj.ahora());
      b.socket().llega(unaFoto(k, [['s1', 0, 0, 0], ['s2', -10 + 1.2 * k, 5, ESTE]]));
      llegadas.push({ t: b.reloj.ahora(), x: xDe(k) });
    }
    b.reloj.avanzar(ahora - b.reloj.ahora());
    const p = b.cliente.poseDe('s2');
    /* Lo esperado, a `ahora − retraso`, entre las fotos que ya habían llegado. */
    const t = ahora - RETRASO_DE_LOS_DEMAS_MS;
    let esperado = llegadas[0]?.x ?? Number.NaN;
    let medio = false;
    for (let i = 0; i + 1 < llegadas.length; i++) {
      const a = llegadas[i] as { t: number; x: number };
      const c = llegadas[i + 1] as { t: number; x: number };
      if (t >= a.t && t < c.t) {
        esperado = a.x + (c.x - a.x) * ((t - a.t) / (c.t - a.t));
        medio = true;
      }
    }
    const ultimaLlegada = llegadas[llegadas.length - 1];
    if (ultimaLlegada !== undefined && t >= ultimaLlegada.t) esperado = ultimaLlegada.x;
    if (p === null || Math.abs(p.x - esperado) > 1e-9 || Math.abs(p.z - aNumero(deNumero(5))) > 1e-9) {
      malInterpolados++;
      if (peor.length < 2) peor.push({ d, x: p?.x, esperado });
    }
    if (p !== null && ultimaLlegada !== undefined && p.x > ultimaLlegada.x + 1e-12) porDelante++;
    if (p !== null && medio) {
      entreDos++;
      if (Math.abs(p.velocidad - 12) > 0.02) velocidadMala++;
    }
    if (p !== null && Math.abs(p.rumbo - radianesDelRumbo(ESTE)) > 1e-12) rumboMalo++;
  }
  const ultima = b.reloj.ahora();
  comprobar('en las fotos sale mi asiento, y no se me pinta: los demás son los demás', b.cliente.presentes().join(',') === 's2' && b.cliente.poseDe('s1') === null, b.cliente.presentes());
  comprobar(`pintado a la hora \`ahora − ${String(RETRASO_DE_LOS_DEMAS_MS)}\`, entre las dos fotos que la rodean, exacto`, malInterpolados === 0 && entreDos > 100, {
    malInterpolados,
    entreDos,
    peor,
  });
  comprobar('y nunca por delante de la última foto que ha llegado', porDelante === 0, { porDelante });
  comprobar('y con la velocidad que medía entre las dos (doce por segundo), para el clip de andar', velocidadMala === 0, { velocidadMala });
  comprobar('y girado a su rumbo', rumboMalo === 0, { rumboMalo });

  const quieto = b.cliente.poseDe('s2', ultima + 2000);
  comprobar(
    'y si no llegan más fotos, se queda en la última y QUIETO: no se inventa por dónde sigue',
    quieto !== null && quieto.x === xDe(12) && quieto.velocidad === 0,
    quieto,
  );
  const todos = b.cliente.losDemas(inicio + 1000);
  comprobar('y `losDemas` da lo mismo que `poseDe`', todos.length === 1 && todos[0]?.x === b.cliente.poseDe('s2', inicio + 1000)?.x);

  /*
   * LA VACUNA: sin el retraso —pintando a la hora de ahora— entre dos fotos se iría POR DELANTE de
   * donde se pinta con él. Si esto no se distinguiera, la comprobación de arriba no miraría el retraso.
   */
  const fotosDePrueba: Muestra[] = [1, 2, 3].map((k) => ({ t: 100 * k, x: xDe(k), z: 0, rumbo: 0 }));
  const conRetraso = poseEntreFotos('s2', fotosDePrueba, 350 - RETRASO_DE_LOS_DEMAS_MS);
  const sinRetraso = poseEntreFotos('s2', fotosDePrueba, 350);
  comprobar('y sin el retraso se pintaría en otro sitio, por delante: la guarda distingue', conRetraso !== null && sinRetraso !== null && sinRetraso.x > conRetraso.x, {
    conRetraso: conRetraso?.x,
    sinRetraso: sinRetraso?.x,
  });

  /* UN SALTO QUE NO SE ANDA —el servidor ha corregido a esa persona— no se pinta como una carrera. */
  const conSalto: Muestra[] = [
    { t: 0, x: 0, z: 0, rumbo: 0 },
    { t: 100, x: 40, z: 0, rumbo: 0 },
  ];
  const aMitad = poseEntreFotos('s2', conSalto, 50);
  comprobar(
    'y un salto de cuarenta unidades en una décima no se pinta cruzando: se espera en su sitio y quieto',
    aMitad !== null && aMitad.x === 0 && aMitad.velocidad === 0,
    aMitad,
  );
}

// ---------------------------------------------------------------------------
paso('Quien deja de salir en las fotos desaparece, y lo mal formado se tira y se cuenta');
// ---------------------------------------------------------------------------

{
  const b = unBanco();
  b.socket().abrir();
  b.socket().llega(dentro(0, 0));
  b.socket().llega(unaFoto(1, [['s2', 1, 1, 0], ['s3', 2, 2, 0]]));
  b.reloj.avanzar(100);
  b.socket().llega(unaFoto(2, [['s2', 1, 1, 0], ['s3', 2, 2, 0]]));
  comprobar('con dos más en las fotos, salen los dos', b.cliente.presentes().join(',') === 's2,s3', b.cliente.presentes());
  comprobar('y la pantalla lo cuenta', b.cliente.estado().texto === 'Dentro · 2 más andando', b.cliente.estado().texto);
  b.reloj.avanzar(100);
  b.socket().llega(unaFoto(3, [['s2', 1, 1, 0]]));
  comprobar(
    'quien deja de salir en una foto desaparece en el acto: ni se pinta ni cuenta',
    b.cliente.poseDe('s3') === null && b.cliente.presentes().join(',') === 's2' && b.cliente.losDemas().length === 1,
    b.cliente.presentes(),
  );
  const ultimoAviso = b.presentes[b.presentes.length - 1];
  comprobar('y a quien monta las figuras se le avisa, para desmontar la suya', ultimoAviso?.join(',') === 's2', b.presentes);

  /* Lo mal formado. */
  const antes = b.cliente.ignorados();
  const presentesAntes = b.cliente.presentes();
  const MALOS: unknown[] = [
    '{',
    'null',
    '{"t":"foto","k":9,"p":[["s2",1.5,0,0,1]]}',
    '{"t":"dentro","yo":"s1","x":0,"z":0,"r":300,"hz":10}',
    '{"t":"corrige","n":5,"x":"0","z":0}',
    '{"t":"lo-que-sea"}',
    new ArrayBuffer(8),
  ];
  for (const m of MALOS) b.socket().llega(m);
  comprobar(
    `${String(MALOS.length)} mensajes mal formados se tiran y se cuentan uno a uno`,
    b.cliente.ignorados() - antes === MALOS.length,
    { contados: b.cliente.ignorados() - antes },
  );
  comprobar(
    'y no tocan nada: ni corrigen, ni cambian a quién se ve, ni sacan de dentro',
    b.correcciones.length === 1 && b.cliente.presentes() === presentesAntes && b.cliente.estado().fase === 'dentro',
    { correcciones: b.correcciones.length, fase: b.cliente.estado().fase },
  );
  /* Una foto con una `k` que no es nueva es un eco: tampoco cambia nada, y no es un mensaje malo. */
  b.socket().llega(unaFoto(2, [['s2', 9, 9, 0], ['s4', 3, 3, 0]]));
  comprobar('y una foto repetida no pinta a nadie nuevo', b.cliente.presentes().join(',') === 's2' && b.cliente.ignorados() - antes === MALOS.length);
}

// ---------------------------------------------------------------------------
paso('Cuando se corta: sin vuelta con la llave mala, la mesa que no y el asiento en otro aparato');
// ---------------------------------------------------------------------------

{
  const SIN_VUELTA: readonly (readonly [string, number, RegExp])[] = [
    ['llaveMala', CIERRE.llaveMala, /llave/],
    ['mesaQueNo', CIERRE.mesaQueNo, /no se recorre/],
    ['reemplazado', CIERRE.reemplazado, /otro aparato/],
  ];
  for (const [nombre, codigo, dice] of SIN_VUELTA) {
    const b = unBanco();
    b.socket().abrir();
    b.socket().llega(dentro(0, 0));
    b.socket().llega(unaFoto(1, [['s2', 1, 1, 0]]));
    b.socket().cae(codigo);
    b.reloj.avanzar(10 * 60_000);
    const e = b.cliente.estado();
    comprobar(`con \`${nombre}\` no se vuelve a llamar en diez minutos`, b.creados.length === 1 && e.fase === 'parado', { sockets: b.creados.length, fase: e.fase });
    comprobar(`y se deja el motivo escrito para la pantalla: «${e.texto}»`, e.texto.startsWith('Sin conexión: ') && dice.test(e.texto), e.texto);
    comprobar('y ya no se pinta a nadie: esas fotos eran de una conexión que no vuelve', b.cliente.presentes().length === 0);
    /* Ni moviéndose. */
    b.cliente.alDarUnTic({ tic: 9999, rumbo: 0, marcha: ANDANDO, mira: 0 }, { x: 0, z: 0 });
    comprobar('y ni echando a andar se vuelve', b.creados.length === 1);
  }
  /* El `fuera` que manda el servidor antes de cerrar es lo que se lee. */
  const b = unBanco();
  b.socket().abrir();
  b.socket().llega(dentro(0, 0));
  b.socket().llega(JSON.stringify({ t: 'fuera', motivo: 'Esta mesa se juega en la modalidad de siempre.' }));
  b.socket().cae(CIERRE.mesaQueNo);
  comprobar(
    'y si el servidor dijo por qué con un `fuera`, se lee lo que dijo',
    b.cliente.estado().texto === 'Sin conexión: Esta mesa se juega en la modalidad de siempre..',
    b.cliente.estado().texto,
  );
}

// ---------------------------------------------------------------------------
paso('Cuando se corta por lo demás: se vuelve, con la espera doblándose hasta su tope');
// ---------------------------------------------------------------------------

{
  const b = unBanco();
  const esperas: number[] = [];
  let malContadas = 0;
  for (let i = 0; i < 8; i++) {
    b.socket().abrir();
    /* Se cae sin haber llegado a entrar: la red, un reinicio. */
    const antes = b.creados.length;
    b.socket().cae(1006);
    const e = b.cliente.estado();
    if (e.fase !== 'reintentando' || !e.texto.startsWith('Sin conexión: ')) malContadas++;
    /* Se mide cuánto tarda en abrir el siguiente, a milisegundos. */
    let esperado = 0;
    while (b.creados.length === antes && esperado < 60_000) {
      b.reloj.avanzar(1);
      esperado++;
    }
    esperas.push(esperado);
  }
  /* Lo esperado se cuenta aquí, aparte: comparar con `esperaTras` daría por buena una `esperaTras` rota. */
  const esperadas = esperas.map((_, i) => Math.min(TOPE_DE_ESPERA_MS, PRIMERA_ESPERA_MS * 2 ** i));
  const doblando = esperas.every((w, i) => w === esperadas[i] && w === esperaTras(i + 1));
  console.log(`  esperas entre intentos: ${esperas.join(', ')} ms`);
  comprobar(
    `tras un corte cualquiera se vuelve a llamar, primero a los ${String(PRIMERA_ESPERA_MS)} ms y doblando`,
    esperas[0] === PRIMERA_ESPERA_MS && doblando && esperas.slice(1).every((w, i) => w >= (esperas[i] as number)),
    { esperas, esperadas },
  );
  comprobar(`y sin pasar nunca de ${String(TOPE_DE_ESPERA_MS)} ms`, esperas.every((w) => w <= TOPE_DE_ESPERA_MS) && esperas[esperas.length - 1] === TOPE_DE_ESPERA_MS, esperas);
  comprobar('y mientras tanto la pantalla dice «Sin conexión: …» y que se reintenta', malContadas === 0, { malContadas });

  /* Todos los códigos que no son de los tres, y el cierre normal, vuelven: a la primera espera, un socket nuevo. */
  const QUE_VUELVEN: readonly number[] = [1000, 1001, 1006, 1011, CIERRE.sinHola, CIERRE.atropello, CIERRE.mesaCerrada];
  const noVuelven = QUE_VUELVEN.filter((codigo) => {
    const otro = unBanco();
    otro.socket().abrir();
    otro.socket().llega(dentro(0, 0));
    otro.socket().cae(codigo);
    otro.reloj.avanzar(PRIMERA_ESPERA_MS);
    return otro.creados.length !== 2 || otro.cliente.estado().fase !== 'conectando';
  });
  comprobar('y vuelven los cierres de la red, el normal, el de sin saludo, el de atropello y el de mesa cerrada', noVuelven.length === 0, noVuelven);

  /*
   * Una conexión que aguanta devuelve la primera espera; una que se cae al entrar, no. Cada espera
   * se recorre exacta —ni un milisegundo de más—, porque dentro de un salto de reloj largo el plazo
   * para entrar soltaría el socket nuevo y contaría otro intento que la prueba no ha pedido.
   */
  const estable = unBanco();
  for (let i = 1; i <= 4; i++) {
    estable.socket().abrir();
    estable.socket().cae(1006);
    estable.reloj.avanzar(esperaTras(i));
  }
  estable.socket().abrir();
  estable.socket().llega(dentro(0, 0));
  estable.reloj.avanzar(SE_DA_POR_ESTABLE_MS);
  const nAntes = estable.creados.length;
  estable.socket().cae(1006);
  estable.reloj.avanzar(PRIMERA_ESPERA_MS);
  comprobar('y tras una conexión que ha aguantado, se vuelve a la primera espera', nAntes === 5 && estable.creados.length === nAntes + 1, {
    antes: nAntes,
    despues: estable.creados.length,
  });
  const inestable = unBanco();
  for (let i = 1; i <= 4; i++) {
    inestable.socket().abrir();
    inestable.socket().llega(dentro(0, 0));
    inestable.reloj.avanzar(1000);
    inestable.socket().cae(1006);
    inestable.reloj.avanzar(esperaTras(i));
  }
  const nInestable = inestable.creados.length;
  inestable.socket().abrir();
  inestable.socket().llega(dentro(0, 0));
  inestable.socket().cae(1006);
  inestable.reloj.avanzar(PRIMERA_ESPERA_MS);
  comprobar(
    'y una que entra y se cae al instante NO: no gana el derecho a llamar cada medio segundo',
    nInestable === 5 && inestable.creados.length === nInestable && inestable.cliente.estado().intentos === 5,
    { sockets: nInestable, intentos: inestable.cliente.estado().intentos },
  );

  /* Un socket que se queda a medio abrir no deja la pantalla en «Conectando…» para siempre. */
  const colgado = unBanco();
  colgado.reloj.avanzar(PLAZO_PARA_ENTRAR_MS);
  comprobar(
    `y un socket que no llega a entrar en ${String(PLAZO_PARA_ENTRAR_MS / 1000)} s se suelta y se vuelve a intentar`,
    colgado.creados[0]?.cerradoPorElCliente !== null && colgado.cliente.estado().fase === 'reintentando',
    colgado.cliente.estado(),
  );
}

// ---------------------------------------------------------------------------
paso('Con `quieto`, se vuelve SÓLO al volver a moverse');
// ---------------------------------------------------------------------------

{
  const b = unBanco();
  b.socket().abrir();
  b.socket().llega(dentro(0, 0));
  b.socket().cae(CIERRE.quieto);
  b.reloj.avanzar(10 * 60_000);
  comprobar('desalojado por quieto, no se vuelve en diez minutos', b.creados.length === 1 && b.cliente.estado().fase === 'dormido', b.cliente.estado());
  comprobar('y la pantalla dice por qué y cómo volver', /Echa a andar para volver/.test(b.cliente.estado().texto), b.cliente.estado().texto);
  for (let tic = 1; tic <= 100; tic++) b.cliente.alDarUnTic({ tic, rumbo: 0, marcha: QUIETO, mira: 0 }, { x: 0, z: 0 });
  comprobar('ni con cien tics quieto', b.creados.length === 1);
  b.cliente.alDarUnTic({ tic: 101, rumbo: 0, marcha: ANDANDO, mira: 0 }, { x: 0, z: 0 });
  comprobar('y en el primer tic que se anda, se vuelve a llamar en el acto', b.creados.length === 2 && b.cliente.estado().fase === 'conectando', {
    sockets: b.creados.length,
  });
  b.socket().abrir();
  const hola = b.leidos()[0];
  comprobar('y lo primero otra vez es el `hola`', hola !== null && hola !== undefined && hola.t === 'hola' && b.socket().enviados.length === 1);
}

// ---------------------------------------------------------------------------
paso('Cerrar es para siempre: sin sockets, sin temporizadores y sin avisos');
// ---------------------------------------------------------------------------

{
  const b = unBanco();
  b.socket().abrir();
  b.socket().llega(dentro(0, 0));
  b.socket().cae(1006);
  const avisos = b.estados.length;
  b.cliente.cerrar();
  b.reloj.avanzar(10 * 60_000);
  b.cliente.alDarUnTic({ tic: 1, rumbo: 0, marcha: ANDANDO, mira: 0 }, { x: 0, z: 0 });
  comprobar('cerrado el canal, no se vuelve a llamar aunque hubiera un intento programado', b.creados.length === 1 && b.cliente.estado().fase === 'cerrado');
  comprobar('y no se avisa a una pantalla que ya no está', b.estados.length === avisos, { antes: avisos, despues: b.estados.length });
  const abierto = unBanco();
  abierto.socket().abrir();
  abierto.cliente.cerrar();
  comprobar('y cerrarlo con el socket abierto lo cierra con un cierre normal', abierto.socket().cerradoPorElCliente?.codigo === 1000);
}

// ---------------------------------------------------------------------------
paso('La cámara de hombro: se acerca delante de un muro sin saltar, no pasa al otro lado, y vuelve');
// ---------------------------------------------------------------------------

{
  const RADIO = RADIO_DEL_PASEANTE;
  /* Mirando al norte con la muralla a la espalda: la cámara de siempre, a 6,6 detrás, cae dentro de ella. */
  const quien = { x: 0, z: 7, rumbo: 0 };
  const cabe = hastaDondeCabeElHombro(CON_MURALLA, quien);
  const donde = camaraDeHombro(quien, 0, cabe);
  const deSiempre = camaraDeHombro(quien);
  const avatar: Andante = { x: deNumero(quien.x), z: deNumero(quien.z) };
  console.log(`  con la muralla a ${(MURALLA.z0 - quien.z).toFixed(1)} de la espalda, la cámara cabe a ${cabe.toFixed(2)} de ${ATRAS_DEL_HOMBRO.toFixed(2)}`);
  comprobar(
    'con una muralla a la espalda, la cámara se queda más cerca, en el último trozo libre del tramo',
    cabe < ATRAS_DEL_HOMBRO && cabe > 0 && sePuedeEstar(CON_MURALLA, deNumero(donde.x), deNumero(donde.z), RADIO),
    { cabe },
  );
  comprobar(
    'y de quien pasea a la cámara no hay nada en medio',
    seAndaEnRecta(CON_MURALLA, avatar, { x: deNumero(donde.x), z: deNumero(donde.z) }, RADIO),
  );
  /* LA VACUNA: la cámara de siempre, sin acercarse, sí tiene la muralla en medio. */
  comprobar(
    'y la de siempre, sin acercarse, SÍ la tiene en medio: la guarda distingue',
    !seAndaEnRecta(CON_MURALLA, avatar, { x: deNumero(deSiempre.x), z: deNumero(deSiempre.z) }, RADIO),
  );
  comprobar('y sin muralla cabe entera', hastaDondeCabeElHombro(ABIERTO, quien) === ATRAS_DEL_HOMBRO);
  /* Y el borde del suelo cuenta como un muro: detrás de quien está en el borde no hay mundo. */
  const enElBorde = { x: 0, z: 33, rumbo: 0 };
  const cabeEnElBorde = hastaDondeCabeElHombro(ABIERTO, enElBorde);
  comprobar(
    'y en el borde del suelo, de espaldas al vacío, tampoco sale del suelo',
    cabeEnElBorde < ATRAS_DEL_HOMBRO && sePuedeEstar(ABIERTO, deNumero(0), deNumero(33 + cabeEnElBorde), RADIO),
    { cabeEnElBorde },
  );

  /*
   * AL PASEAR: de espaldas contra la muralla, con el paseo de verdad y la cámara como la pone
   * `usarElPaseo` —lo que cabe, alcanzado con `acercarElHombro`—, fotograma a fotograma.
   */
  let e = nacerEnElPaseo(CON_MURALLA, { x: 0, z: -15, rumbo: 0 });
  let atras: number | null = null;
  let alOtroLado = 0;
  let dentroDelMuro = 0;
  let loMasDentro = Number.NEGATIVE_INFINITY;
  let saltos = 0;
  let pordebajo = 0;
  let masCerca = ATRAS_DEL_HOMBRO;
  let peorPaso = 0;
  const pasos: number[] = [];
  const dt = 1 / 60;
  for (let i = 0; i < 360; i++) {
    e = fotogramaDelPaseo(CON_MURALLA, e, dt, ATRAS);
    const p = poseDelPaseo(e);
    const antes: number | null = atras;
    const quiere = hastaDondeCabeElHombro(CON_MURALLA, p);
    atras = acercarElHombro(antes, quiere, dt);
    pasos.push(atras);
    const c = camaraDeHombro(p, 0, atras);
    if (c.z >= MURALLA.z1) alOtroLado++;
    /*
     * Mientras quien pasea está lejos del muro, la cámara no entra en él más que el retraso de
     * alcanzar lo que cabe: `camaras.ts` lo cifra en ocho centésimas andando, y se exige una décima.
     */
    if (MURALLA.z0 - p.z > ATRAS_MINIMO_DEL_HOMBRO + 1) {
      if (c.z - MURALLA.z0 > loMasDentro) loMasDentro = c.z - MURALLA.z0;
      if (c.z > MURALLA.z0 + 0.1) dentroDelMuro++;
    }
    if (atras < ATRAS_MINIMO_DEL_HOMBRO - 1e-12) pordebajo++;
    if (atras < masCerca) masCerca = atras;
    if (antes !== null) {
      const hueco = Math.abs(antes - Math.min(ATRAS_DEL_HOMBRO, Math.max(ATRAS_MINIMO_DEL_HOMBRO, quiere)));
      const dio = Math.abs(atras - antes);
      if (dio > peorPaso) peorPaso = dio;
      /* Un salto es cubrir de golpe el hueco entero; suavizado, cada fotograma cubre una parte. */
      if (hueco > 0.05 && dio >= hueco * 0.999) saltos++;
    }
  }
  console.log(
    `  de espaldas contra la muralla: quien pasea se para a ${(MURALLA.z0 - aNumero(e.ahora.z)).toFixed(2)} y la cámara llega a ${masCerca.toFixed(2)} de él; el mayor paso en un fotograma, ${peorPaso.toFixed(3)}; lo más que entra en la cara del muro andando lejos de ella, ${loMasDentro.toFixed(3)}`,
  );
  comprobar('andando de espaldas contra la muralla, la cámara no se queda NUNCA al otro lado', alOtroLado === 0, { alOtroLado });
  comprobar('y mientras quien pasea está lejos de ella, la cámara no entra en ella más de una décima', dentroDelMuro === 0, { dentroDelMuro, loMasDentro });
  comprobar(`y nunca más cerca que el mínimo, ${ATRAS_MINIMO_DEL_HOMBRO.toFixed(2)}`, pordebajo === 0 && masCerca >= ATRAS_MINIMO_DEL_HOMBRO - 1e-12, {
    masCerca,
  });
  comprobar('y pegado de espaldas a la muralla, se queda en el mínimo', Math.abs((pasos[pasos.length - 1] ?? 0) - ATRAS_MINIMO_DEL_HOMBRO) < 1e-3, {
    ultimo: pasos[pasos.length - 1],
  });
  comprobar('y sin saltos: ningún fotograma cubre de golpe lo que le falta', saltos === 0, { saltos });

  /* Y AL APARTARSE, VUELVE A SU SITIO: poco a poco. */
  let lejos = 0;
  let pasosDeVuelta = 0;
  let saltosDeVuelta = 0;
  for (let i = 0; i < 360; i++) {
    e = fotogramaDelPaseo(CON_MURALLA, e, dt, ADELANTE);
    const p = poseDelPaseo(e);
    const antes = atras;
    atras = acercarElHombro(antes, hastaDondeCabeElHombro(CON_MURALLA, p), dt);
    if (antes !== null && Math.abs(atras - antes) > 0.2) saltosDeVuelta++;
    if (Math.abs(atras - ATRAS_DEL_HOMBRO) < 1e-3 && lejos === 0) {
      lejos = i;
      pasosDeVuelta = i;
    }
  }
  console.log(`  y al apartarse vuelve a su sitio en ${(pasosDeVuelta / 60).toFixed(2)} s`);
  comprobar('y al apartarse de la muralla, vuelve a su sitio de siempre', Math.abs((atras ?? 0) - ATRAS_DEL_HOMBRO) < 1e-6 && lejos > 0, { atras, lejos });
  comprobar('y vuelve sin saltos: ni dos décimas de unidad en un fotograma', saltosDeVuelta === 0, { saltosDeVuelta });

  /* LA VACUNA DEL SUAVIZADO: ponerse de golpe en lo que cabe sí sería un salto, y la guarda lo cuenta. */
  const deGolpe = ((): number => {
    let n = 0;
    let a: number = ATRAS_DEL_HOMBRO;
    for (const q of [ATRAS_DEL_HOMBRO, 2, 2, 5]) {
      const quiere = Math.min(ATRAS_DEL_HOMBRO, Math.max(ATRAS_MINIMO_DEL_HOMBRO, q));
      const hueco = Math.abs(a - quiere);
      if (hueco > 0.05) n++;
      a = quiere;
    }
    return n;
  })();
  comprobar('y ponerse de golpe en lo que cabe sí sería un salto: la guarda distingue', deGolpe > 0, { deGolpe });
}

// ---------------------------------------------------------------------------
paso('El rótulo: se escribe lo que tiene dibujo, mira a la cámara y se lee desde el hombro');
// ---------------------------------------------------------------------------

{
  comprobar('un nombre se escribe en mayúsculas, con sus tildes y su eñe', letrasDelRotulo('Ana-María Núñez').join('') === 'ANA-MARÍA NÚÑEZ', letrasDelRotulo('Ana-María Núñez').join(''));
  comprobar('una letra con un acento que no hay se escribe sin él', letrasDelRotulo('Çà Öl').join('') === 'CA OL', letrasDelRotulo('Çà Öl').join(''));
  comprobar('lo que no tiene dibujo no se escribe, y si no queda nada sale una interrogación', letrasDelRotulo('😀_😀').join('') === '?' && letrasDelRotulo('').join('') === '?');
  comprobar('y un nombre larguísimo no pasa de veinte letras', letrasDelRotulo('A'.repeat(60)).length === 20);

  const g = geometriaDelRotulo('Ana', '#c0392b');
  const pos = g?.getAttribute('position');
  const col = g?.getAttribute('color');
  const idx = g?.getIndex();
  let haciaAtras = 0;
  let triangulos = 0;
  let conSuColor = 0;
  if (g !== null && g !== undefined && pos !== undefined && idx !== null && idx !== undefined) {
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let i = 0; i + 2 < idx.count; i += 3) {
      a.fromBufferAttribute(pos as THREE.BufferAttribute, idx.getX(i));
      b.fromBufferAttribute(pos as THREE.BufferAttribute, idx.getX(i + 1));
      c.fromBufferAttribute(pos as THREE.BufferAttribute, idx.getX(i + 2));
      const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
      if (normal.lengthSq() < 1e-18) continue;
      triangulos++;
      if (normal.z <= 0) haciaAtras++;
    }
    const suyo = new THREE.Color('#c0392b');
    for (let i = 0; i < (col?.count ?? 0); i++) {
      if (col !== undefined && Math.abs(col.getX(i) - suyo.r) < 1e-6 && Math.abs(col.getY(i) - suyo.g) < 1e-6 && Math.abs(col.getZ(i) - suyo.b) < 1e-6) conSuColor++;
    }
  }
  g?.computeBoundingBox();
  const caja = g?.boundingBox ?? null;
  comprobar(
    'la placa de «Ana» son triángulos de verdad, TODOS mirando a `+z`, que es hacia la cámara',
    triangulos > 20 && haciaAtras === 0,
    { triangulos, haciaAtras },
  );
  comprobar('y lleva el color de su asiento', conSuColor >= 4, { conSuColor });
  comprobar(
    'y está centrada a lo ancho con el canto de abajo en el cero, que es lo que se sienta encima de la cabeza',
    caja !== null && Math.abs(caja.min.x + caja.max.x) < 1e-6 && Math.abs(caja.min.y) < 1e-6 && caja.max.y > 1,
    caja === null ? null : { min: caja.min, max: caja.max },
  );
  g?.dispose();

  /*
   * SE LEE DESDE EL HOMBRO: de la cámara de hombro a alguien que anda por ahí hay de unas pocas
   * unidades a cientos. En un lienzo de 400 puntos de alto —el del teléfono con la hoja abajo— y en
   * uno de 900, una mayúscula del rótulo no baja de doce puntos en todo ese tramo.
   */
  const CAMPO = (45 * Math.PI) / 180;
  const LIENZOS = [400, 900];
  let pequenos = 0;
  let enormes = 0;
  const peores: unknown[] = [];
  for (let d = ATRAS_DEL_HOMBRO; d <= 450; d *= 1.15) {
    const alto = altoDelRotulo(d, CAMPO);
    const abarca = 2 * d * Math.tan(CAMPO / 2);
    for (const lienzo of LIENZOS) {
      const puntos = (alto / abarca) * lienzo;
      if (puntos < 12) {
        pequenos++;
        if (peores.length < 3) peores.push({ d: d.toFixed(1), lienzo, puntos: puntos.toFixed(1) });
      }
      if (alto / abarca > 0.08) enormes++;
    }
  }
  comprobar('desde la cámara de hombro hasta 450 unidades, una mayúscula del rótulo no baja de 12 puntos ni en el teléfono', pequenos === 0, peores);
  comprobar('y no pasa del 8 % de la pantalla: es un rótulo, no un cartel que tape', enormes === 0, { enormes });
  comprobar('y con datos imposibles no desaparece', altoDelRotulo(Number.NaN, CAMPO) > 0 && altoDelRotulo(10, 0) > 0 && altoDelRotulo(1e9, CAMPO) === ALTO_MAXIMO_DEL_ROTULO);
}

// ---------------------------------------------------------------------------
paso('El montaje: la escena abre el canal sólo con la prop, y los dos clientes se la pasan sólo en una mesa `botas`');
// ---------------------------------------------------------------------------

{
  comprobar(
    'una mesa es de botas si y sólo si dice `botas`: sin el campo, `normal`, o cualquier otra cosa, no',
    esMesaDeBotas({ modalidad: 'botas' }) &&
      !esMesaDeBotas({ modalidad: 'normal' }) &&
      !esMesaDeBotas({}) &&
      !esMesaDeBotas(null) &&
      !esMesaDeBotas(undefined) &&
      !esMesaDeBotas({ modalidad: 'BOTAS' }) &&
      !esMesaDeBotas({ modalidad: true }),
  );
  const conColor = asientosQueAndan(
    [
      { id: 's1', nombre: 'Ana', figura: 'maga' },
      { id: 's2', nombre: 'Bruno' },
      { id: 's3', nombre: 'Celia' },
    ],
    { labriegos: [{ asiento: 's1', color: '#c0392b' }, { asiento: 's2', color: 'rojo' }] },
  );
  comprobar(
    'los asientos llevan el color que declara la vista del juego, y en gris quien no lo tiene o lo trae mal escrito',
    conColor[0]?.color === '#c0392b' && conColor[0].figura === 'maga' && conColor[1]?.color === COLOR_SIN_DECLARAR && conColor[2]?.color === COLOR_SIN_DECLARAR,
    conColor,
  );

  /* Se mira el FUENTE sin comentarios: las cabeceras cuentan el porqué con los mismos nombres. */
  const leer = (ruta: string): string =>
    fs
      .readFileSync(new URL(ruta, import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const escena = leer('../lindes/Lindes.tsx');
  const gancho = leer('../paseo/usar-el-canal.ts');
  const app = leer('../../app/src/arcade/lindes-en-tres-escena.tsx');
  const escritorio = leer('../../escritorio/src/lindes-en-tres.tsx');
  const mesaDeLaApp = leer('../../app/src/arcade/mesa.ts');
  const mesaDelEscritorio = leer('../../escritorio/src/mesa.ts');

  comprobar(
    'la escena abre el canal con la prop y con nada más, y le da los tics del paseo',
    /const elCanal = usarElCanal\(props\.canal, corregirAQuienPasea\);/.test(escena) &&
      /usarElPaseo\(\{[^}]*alDarUnTic: elCanal\.alDarUnTic,[^}]*\}\)/.test(escena) &&
      /corregirAQuienPasea\.current = paseo\.corregir;/.test(escena),
  );
  comprobar(
    'y no abre sockets por su cuenta: ni `abrirElCanal`, ni un `WebSocket`',
    !/abrirElCanal\(/.test(escena) && !/WebSocket/.test(escena),
  );
  const cuantosLosDemas = escena.match(/<LosDemas\b/g)?.length ?? 0;
  comprobar(
    'y pinta a los demás UNA vez, y sólo con canal y a pie',
    cuantosLosDemas === 1 && /\{props\.canal === undefined \|\| camara\.modo === 'mesa' \? null : \(\s*<LosDemas\b/.test(escena),
    { cuantosLosDemas },
  );
  comprobar(
    'y el gancho no abre nada sin dirección o sin llave, y sin canal no le da al paseo ni una llamada por tic',
    /useEffect\(\(\) => \{\s*if \(url === null \|\| llave === null\) return;\s*const abierto = abrirElCanal\(/.test(gancho) &&
      /alDarUnTic: conCanal \? alDarUnTic : undefined/.test(gancho) &&
      /const conCanal = url !== null && llave !== null;/.test(gancho),
  );

  /* LOS DOS CLIENTES: la misma pregunta, y el canal sólo detrás de ella. */
  comprobar(
    'la app pregunta con `esMesaDeBotas` y construye el canal SÓLO si es de botas',
    /const esBotas = esMesaDeBotas\(mesa\.mesa\);/.test(app) &&
      /esBotas && codigoDeLaMesa !== null && yoEnLaMesa !== null && llaveDelAsiento !== null\s*\?\s*\{\s*url: direccionDelCanal\(codigoDeLaMesa\),/.test(app) &&
      /: undefined,\s*\[asientosDeLaMesa, codigoDeLaMesa, esBotas, llaveDelAsiento, vistaDeLaMesa, yoEnLaMesa\],/.test(app),
  );
  comprobar(
    'y se lo pasa a la escena, una vez, y empieza a pie en una mesa de botas',
    (app.match(/\bcanal=\{/g)?.length ?? 0) === 1 && /\bcanal=\{canal\}/.test(app) && /if \(esBotas\) ponerModo\('hombro'\);/.test(app),
  );
  comprobar(
    'el escritorio pregunta lo mismo y construye el canal SÓLO si es de botas',
    /const esBotas = esMesaDeBotas\(puesta\);/.test(escritorio) &&
      /const url = esBotas \? direccionDelCanal\(puesta\.codigo\) : null;\s*if \(url === null \|\| llaveDelAsiento === null \|\| yoEnLaMesa === null\) return undefined;/.test(escritorio),
  );
  comprobar(
    'y se lo pasa a la escena, una vez, y nace al hombro en una mesa de botas',
    (escritorio.match(/\bcanal=\{canal\}/g)?.length ?? 0) === 1 &&
      /useState<'mesa' \| 'hombro' \| 'ojos'>\(\(\) => \(esBotas \? 'hombro' : 'mesa'\)\)/.test(escritorio),
  );
  comprobar(
    'y ninguno de los dos decide la modalidad por su cuenta: ni una comparación con `modalidad` a pelo',
    !/modalidad\s*[!=]==/.test(app) && !/modalidad\s*[!=]==/.test(escritorio) && !/\.modalidad\b/.test(app) && !/\.modalidad\b/.test(escritorio),
  );

  /* LA TUBERÍA DE LA MESA: el campo en la vista, y la modalidad en el alta sólo si se da. */
  for (const [quien, fuente] of [
    ['la app', mesaDeLaApp],
    ['el escritorio', mesaDelEscritorio],
  ] as const) {
    comprobar(
      `${quien}: la vista de mesa trae \`modalidad\` opcional, y abrir la manda en el cuerpo sólo si se da`,
      /modalidad\?: 'normal' \| 'botas';/.test(fuente) &&
        /abrir: \(nombre: string, plazoSegundos\?: number, figura\?: string, modalidad\?: 'normal' \| 'botas'\) => void;/.test(fuente) &&
        /\.\.\.\(modalidad === undefined \? \{\} : \{ modalidad \}\),/.test(fuente),
    );
    comprobar(`${quien}: y el gancho da la llave del asiento a la pantalla`, /llave: llaveDelAsiento,/.test(fuente) && /llave\?: string \| null;/.test(fuente));
  }
  comprobar(
    'la app llama al servidor que tiene elegido, con `ws` en vez de `http` y la ruta del contrato',
    /return `\$\{servidorActual\(\)\.replace\(\/\^http\/i, 'ws'\)\}\$\{rutaDelCanal\(codigo\)\}`;/.test(mesaDeLaApp),
  );

  /* Y la del escritorio se ejecuta: la misma casa que sirvió la página. */
  const conLocation = globalThis as { location?: { protocol: string; host: string } };
  const antes = conLocation.location;
  conLocation.location = { protocol: 'https:', host: 'harkania.onrender.com' };
  const seguro = direccionDelEscritorio('AB12C');
  conLocation.location = { protocol: 'http:', host: 'localhost:5175' };
  const deCasa = direccionDelEscritorio('AB12C');
  conLocation.location = antes;
  if (antes === undefined) delete conLocation.location;
  comprobar(
    'el escritorio llama a su misma casa: `wss` detrás de `https`, `ws` en local, y sin la llave',
    seguro === 'wss://harkania.onrender.com/api/arcade/mesas/AB12C/botas' && deCasa === 'ws://localhost:5175/api/arcade/mesas/AB12C/botas',
    { seguro, deCasa },
  );
  comprobar('y sin `location` —un pintado estático— no hay dirección, ni canal', direccionDelEscritorio('AB12C') === null);
}

console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos.slice(0, 30)) console.log(`  ✗ ${f}`);
  if (fallos.length > 30) console.log(`  … y ${fallos.length - 30} más`);
  process.exit(1);
}

console.log(`${hechas} comprobaciones`);
console.log('\nEl `hola` va primero y con la llave, nada sale antes de `dentro` y con él se está donde dijo el');
console.log('servidor; un `aqui` por tic con los números de la costura y quieto sólo dos por segundo; `corrige`');
console.log('corrige sin ping-pong; a los demás se les pinta 150 ms atrás y nunca por delante, quien se va');
console.log('desaparece y lo mal formado se cuenta; sin vuelta con llave mala, mesa que no u otro aparato, y');
console.log('con lo demás se vuelve doblando la espera hasta su tope, y con quieto al volver a andar; la cámara');
console.log('de hombro se acerca a un muro sin saltar y vuelve; el rótulo se lee desde el hombro; y sólo una');
console.log('mesa `botas` monta el canal, en la escena y en los dos clientes.');
