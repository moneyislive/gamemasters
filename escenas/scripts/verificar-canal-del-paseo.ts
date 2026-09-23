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
 *     con la espera doblándose hasta su tope; con `quieto`, sólo al volver a moverse. Y la frase del
 *     corte sale bien cerrada diga lo que diga el servidor: ni punto doble, ni mayúscula tras dos puntos.
 *  5. LA REFRIEGA. `vidas` inicia y reinicia; `lanza`, `da`, `cae` y `renace` cambian lo que deben y
 *     a la hora a la que se pinta a cada uno; lo intocable caduca solo; lo mal formado no cambia
 *     nada. El golpe sale sólo dentro, con su tic y su mirada, con la recarga y nunca caído; caído no
 *     se anda; `renace` recoloca y mira; y al cortarse se olvida todo.
 *  6. LA CÁMARA DE HOMBRO. Se acerca delante de un muro sin saltar, no se queda nunca al otro
 *     lado, no baja del mínimo, y vuelve a su sitio al apartarse.
 *  7. EL RÓTULO. Se escribe lo que tiene dibujo, mira a la cámara y se lee desde el hombro; la
 *     tesela lleva un canto claro que se lee con cualquier color; y los corazones van encima.
 *  8. EL MONTAJE. La escena abre el canal SÓLO con la prop, y los dos clientes se la pasan SÓLO en
 *     una mesa `botas`, con la misma pregunta.
 *  9. LOS TRES JUEGOS QUE SE ANDAN. Las Lindes, el Burgo y Riberas cosen el canal igual —la prop, su
 *     `alDarUnTic` en el paseo, la corrección por una referencia, y la refriega: `caido` en el paseo y
 *     el cliente en `QuienAnda`—, pintan a los demás UNA vez, sólo
 *     con canal y a pie, y con LA MISMA altura del suelo que el paseo le da a quien anda; los dos
 *     clientes del Burgo y los dos de Riberas construyen el canal SÓLO en una mesa `botas`, se lo
 *     pasan a la escena una vez, empiezan a pie, dicen cómo va el canal sólo en botas, y dan a cada
 *     asiento el color de su juego: el de su peón en el Burgo, el de sus chozas en Riberas.
 *
 * Cada comprobación se ha visto roja rompiendo a propósito lo que vigila (ver el informe de la
 * sesión que la escribió); las que pueden llevan además su vacuna aquí dentro: la cuenta del revés
 * tiene que salir distinta, o la comprobación no está mirando lo que dice.
 */
import fs from 'node:fs';
import * as THREE from 'three';
import {
  AVISOS_QUIETO_POR_SEGUNDO,
  CAIDO,
  CIERRE,
  DE_PIE,
  INTOCABLE,
  INTOCABLE_MS,
  RECARGA_DEL_GOLPE_MS,
  RETRASO_DE_LOS_DEMAS_MS,
  TOPE_DE_MENSAJE_BYTES,
  VERSION_DEL_CANAL,
  VIDA_ENTERA,
  leerMensajeDelAparato,
  rutaDelCanal,
} from '../../shared/mecanicas/canal-de-botas';
import { ANDANDO, QUIETO, RADIO_DEL_PASEANTE, RUMBOS, TICS_POR_SEGUNDO, radianesDelRumbo } from '../../shared/mecanicas/andar';
import { COLORES_DEL_BURGO } from '../../shared/arcade/juegos/burgo';
import { CLIP } from '../embarcadero/figuras';
import { DURACION } from '../embarcadero/gestos';
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
import { corregirElPaseo, fotogramaDelPaseo, fotogramaDeQuienPasea, nacerEnElPaseo, poseDelPaseo } from '../paseo/paseante';
import type { EstadoDelPaseo } from '../paseo/paseante';
import { PARPADEO_MS } from '../paseo/refriega';
import {
  ALTO_MAXIMO_DEL_ROTULO,
  CANTO_DE_LA_TESELA,
  COLOR_DE_LA_PLACA,
  COLOR_DE_LA_TINTA,
  COLOR_DEL_CORAZON,
  COLOR_DEL_CORAZON_APAGADO,
  COLOR_DEL_CORAZON_PERDIDO,
  altoDeLaPlaca,
  altoDelRotulo,
  corazonesDelRotulo,
  geometriaDeLosCorazones,
  geometriaDelRotulo,
  letrasDelRotulo,
  ponerLosCorazones,
} from '../paseo/rotulo';
import { asientosQueAndanPorElBurgo } from '../burgo/a-pie';
import { asientosQueAndanPorElDelta } from '../delta-a-pie';
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
  /** El rumbo de cada corrección, en radianes: sólo lo lleva la del `renace`. */
  readonly rumbos: (number | undefined)[];
  readonly estados: EstadoDelCanal[];
  readonly presentes: (readonly string[])[];
  /** El último socket que abrió el canal. */
  socket(): SocketDePrueba;
  /** Lo que se ha mandado por el último socket, ya leído con el lector ESTRICTO del servidor. */
  leidos(): ReturnType<typeof leerMensajeDelAparato>[];
}

/** Un canal contra el servidor de mentira. `corregir` es la costura (b); por defecto sólo apunta. */
function unBanco(corregir?: (sitio: Andante, rumbo?: number) => void): Banco {
  const creados: SocketDePrueba[] = [];
  class Fabrica extends SocketDePrueba {
    constructor(url: string) {
      super(url);
      creados.push(this);
    }
  }
  const reloj = new RelojDePrueba();
  const correcciones: Andante[] = [];
  const rumbos: (number | undefined)[] = [];
  const estados: EstadoDelCanal[] = [];
  const presentes: (readonly string[])[] = [];
  const cliente = abrirElCanal({
    url: DIRECCION,
    llave: LLAVE,
    yo: 's1',
    corregir: (sitio, rumbo) => {
      correcciones.push(sitio);
      rumbos.push(rumbo);
      corregir?.(sitio, rumbo);
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
    rumbos,
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
    b.cliente.alDarUnTic({ tic: 9999, rumbo: 0, marcha: ANDANDO, mira: 0, golpe: false }, { x: 0, z: 0 });
    comprobar('y ni echando a andar se vuelve', b.creados.length === 1);
  }
  /* El `fuera` que manda el servidor antes de cerrar es lo que se lee. */
  const b = unBanco();
  b.socket().abrir();
  b.socket().llega(dentro(0, 0));
  b.socket().llega(JSON.stringify({ t: 'fuera', motivo: 'Esta mesa se juega en la modalidad de siempre.' }));
  b.socket().cae(CIERRE.mesaQueNo);
  comprobar(
    'y si el servidor dijo por qué con un `fuera`, se lee lo que dijo, como frase suya: tras un punto y con su punto, no con dos',
    b.cliente.estado().texto === 'Sin conexión. Esta mesa se juega en la modalidad de siempre.',
    b.cliente.estado().texto,
  );
}

/*
 * ═══ LA FRASE DEL CORTE, BIEN CERRADA, DIGA LO QUE DIGA EL SERVIDOR ═══
 *
 * El `fuera` del servidor es una frase entera, con su mayúscula y su punto, y el cartel la ponía
 * detrás de dos puntos y le añadía otro: en la prueba de punta a punta salió «Sin conexión: Un
 * minuto sin moverte: el canal se cierra hasta que vuelvas a andar.. Echa a andar para volver.».
 * Aquí se recorren motivos con punto y sin él, con admiración, interrogación y puntos suspensivos,
 * en mayúscula y en minúscula, por las tres fases que enseñan un motivo —parado, dormido y
 * reintentando— y por la razón de un cierre de la red; y ninguna frase puede llevar un punto doble,
 * un punto detrás de otro cierre, mayúscula detrás de dos puntos, ni quedarse sin cerrar.
 */
{
  const MOTIVOS: readonly string[] = [
    'Un minuto sin moverte: el canal se cierra hasta que vuelvas a andar.',
    'La mesa se ha cerrado.',
    'la mesa se ha cerrado.',
    'Reinicio del servidor',
    '¿Sigues ahí?',
    '¡Hasta luego!',
    'Mantenimiento…',
    'Espera...',
  ];
  const CORTES: readonly (readonly [string, number])[] = [
    ['parado', CIERRE.mesaQueNo],
    ['dormido', CIERRE.quieto],
    ['reintentando', CIERRE.mesaCerrada],
  ];
  const malCerrada = (texto: string): boolean =>
    /(^|[^.])\.\.(?!\.)/.test(texto) || /[!?…]\./.test(texto) || /: \p{Lu}/u.test(texto) || /\.\)/.test(texto) || !/[.!?…]$/.test(texto);
  const malas: string[] = [];
  let casos = 0;
  for (const motivo of MOTIVOS) {
    for (const [fase, codigo] of CORTES) {
      const c = unBanco();
      c.socket().abrir();
      c.socket().llega(dentro(0, 0));
      c.socket().llega(JSON.stringify({ t: 'fuera', motivo }));
      c.socket().cae(codigo);
      const e = c.cliente.estado();
      casos++;
      const suyo = motivo.replace(/(^|[^.])\.$/, '$1');
      if (e.fase !== fase || malCerrada(e.texto) || !e.texto.includes(suyo)) malas.push(`${fase}: ${e.texto}`);
      c.cliente.cerrar();
    }
  }
  comprobar(
    `${String(casos)} frases de corte con los motivos del servidor, en las tres fases, sin punto doble, sin mayúscula tras dos puntos y cerradas una vez`,
    malas.length === 0 && casos === MOTIVOS.length * CORTES.length,
    malas,
  );
  const dormido = unBanco();
  dormido.socket().abrir();
  dormido.socket().llega(dentro(0, 0));
  dormido.socket().llega(JSON.stringify({ t: 'fuera', motivo: 'Un minuto sin moverte: el canal se cierra hasta que vuelvas a andar.' }));
  dormido.socket().cae(CIERRE.quieto);
  comprobar(
    'y la de la prueba de punta a punta dice lo que tiene que decir, letra a letra',
    dormido.cliente.estado().texto === 'Sin conexión. Un minuto sin moverte: el canal se cierra hasta que vuelvas a andar. Echa a andar para volver.',
    dormido.cliente.estado().texto,
  );
  const deLaRed = unBanco();
  deLaRed.socket().abrir();
  deLaRed.socket().llega(dentro(0, 0));
  deLaRed.socket().cae(1011, 'Reinicio del servidor.');
  comprobar(
    'y la razón de un cierre de la red va entre paréntesis sin su punto, y la frase se cierra una vez',
    deLaRed.cliente.estado().texto === 'Sin conexión: se ha perdido la conexión (Reinicio del servidor). Se vuelve a intentar en 1 s.',
    deLaRed.cliente.estado().texto,
  );
  /* LA VACUNA: la composición de antes, con el motivo tal cual y un punto detrás, sí sale mal cerrada. */
  comprobar(
    'y la composición de antes —dos puntos, el motivo tal cual y otro punto— sí la pilla: la guarda distingue',
    malCerrada(`Sin conexión: ${MOTIVOS[0] ?? ''}. Echa a andar para volver.`) && malCerrada(`Sin conexión: ${MOTIVOS[4] ?? ''}.`),
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
  for (let tic = 1; tic <= 100; tic++) b.cliente.alDarUnTic({ tic, rumbo: 0, marcha: QUIETO, mira: 0, golpe: false }, { x: 0, z: 0 });
  comprobar('ni con cien tics quieto', b.creados.length === 1);
  b.cliente.alDarUnTic({ tic: 101, rumbo: 0, marcha: ANDANDO, mira: 0, golpe: false }, { x: 0, z: 0 });
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
  b.cliente.alDarUnTic({ tic: 1, rumbo: 0, marcha: ANDANDO, mira: 0, golpe: false }, { x: 0, z: 0 });
  comprobar('cerrado el canal, no se vuelve a llamar aunque hubiera un intento programado', b.creados.length === 1 && b.cliente.estado().fase === 'cerrado');
  comprobar('y no se avisa a una pantalla que ya no está', b.estados.length === avisos, { antes: avisos, despues: b.estados.length });
  const abierto = unBanco();
  abierto.socket().abrir();
  abierto.cliente.cerrar();
  comprobar('y cerrarlo con el socket abierto lo cierra con un cierre normal', abierto.socket().cerradoPorElCliente?.codigo === 1000);
}

// ---------------------------------------------------------------------------
paso('La refriega: cada mensaje cambia lo que debe, lo mal formado no cambia nada, y el golpe sale cuando toca');
// ---------------------------------------------------------------------------

/*
 * ═══ LO QUE ESTO CIERRA ═══
 *
 * El contrato de la refriega (`shared/mecanicas/canal-de-botas.ts`) deja al aparato UNA palabra y
 * cinco que escuchar, y todo lo que puede ir mal aquí va mal en silencio: un golpe que sale fuera
 * del canal o en ráfaga, uno que sale en el suelo, un caído que sigue andando, un `renace` que no
 * recoloca, uno de otro que se pinta brotando donde cayó, lo intocable que no se apaga nunca, un
 * `vidas` que no pisa lo de la conexión anterior, o un mensaje roto que cambia algo. Se mide con el
 * servidor de mentira y, donde se anda, con el fotograma del gancho de verdad (`fotogramaDeQuienPasea`).
 */
{
  const llega = (b: Banco, m: unknown): void => b.socket().llega(JSON.stringify(m));
  const golpesDe = (b: Banco): { readonly n: number; readonly r: number }[] =>
    b.leidos().flatMap((m) => (m !== null && m !== undefined && m.t === 'golpe' ? [{ n: m.n, r: m.r }] : []));
  const aquisDe = (b: Banco): number => b.leidos().filter((m) => m !== null && m !== undefined && m.t === 'aqui').length;
  const tic = (n: number, golpe: boolean, marcha: 0 | 1 | 2 = ANDANDO, mira = 200): EntradaDelTic => ({ tic: n, rumbo: 0, marcha, mira, golpe });
  const SITIO: Andante = { x: deNumero(2), z: deNumero(3) };
  const ANTES = RETRASO_DE_LOS_DEMAS_MS;

  /* ── `vidas` inicia ── */
  const b = unBanco();
  b.socket().abrir();
  b.socket().llega(dentro(0, 0));
  b.socket().llega(unaFoto(1, [['s2', 1, 1, 0], ['s3', 5, 5, 0]]));
  comprobar(
    'antes de `vidas` no se enseña la refriega: ni corazones en el cartel, ni la de nadie',
    b.cliente.refriegaDe('s1') === null &&
      b.cliente.refriegaDe('s2') === null &&
      b.cliente.estado().refriega === null &&
      b.cliente.estado().texto === 'Dentro · 2 más andando',
    b.cliente.estado(),
  );
  llega(b, { t: 'vidas', v: [['s1', 2, DE_PIE], ['s2', 1, DE_PIE], ['s3', 0, CAIDO]] });
  const s3 = b.cliente.refriegaDe('s3');
  comprobar(
    '`vidas` lo pone todo: mis corazones en el cartel, y la vida y el estado de cada uno',
    b.cliente.estado().texto === 'Dentro · ♥♥♡ · 2 más andando' &&
      b.cliente.estado().refriega?.vida === 2 &&
      b.cliente.estado().refriega?.estado === DE_PIE &&
      b.cliente.refriegaDe('s2')?.vida === 1 &&
      b.cliente.refriegaDe('s2')?.estado === DE_PIE &&
      s3?.estado === CAIDO &&
      s3.corazones.apagados &&
      s3.corazones.llenos === 0,
    { texto: b.cliente.estado().texto, s2: b.cliente.refriegaDe('s2'), s3 },
  );
  const caidoDeAntes = s3?.gesto ?? null;
  comprobar(
    'y quien estaba en el suelo sale ya tumbado —su `caer`, terminado—, y nadie hace un gesto que nadie ha visto pasar',
    s3 !== null && caidoDeAntes !== null && caidoDeAntes.clip === CLIP.caer && s3.a - caidoDeAntes.desde >= DURACION.caer * 1000 && b.cliente.refriegaDe('s2')?.gesto === null,
    s3,
  );

  /* ── `lanza` ── */
  b.reloj.avanzar(10);
  const t0 = b.reloj.ahora();
  llega(b, { t: 'lanza', de: 's2' });
  const alLlegar = b.cliente.refriegaDe('s2', t0);
  const alPintarse = b.cliente.refriegaDe('s2', t0 + ANTES);
  const alAcabar = b.cliente.refriegaDe('s2', t0 + ANTES + DURACION.lanzar * 1000);
  comprobar(
    `\`lanza\` de otro: su \`lanzar\` a la hora a la que se le pinta, ${String(ANTES)} ms después de llegar —antes se pintaría donde ya no está—, y hasta que acaba`,
    alLlegar?.gesto === null && alPintarse?.gesto?.clip === CLIP.lanzar && alPintarse.gesto.desde === t0 && alAcabar?.gesto === null,
    { alLlegar: alLlegar?.gesto, alPintarse: alPintarse?.gesto, alAcabar: alAcabar?.gesto },
  );
  llega(b, { t: 'lanza', de: 's1' });
  comprobar(
    'y el eco de mi propio `lanza` no me hace lanzar: el gesto propio sale al mandar el golpe, no al volver',
    b.cliente.refriegaDe('s1')?.gesto === null,
    b.cliente.refriegaDe('s1'),
  );

  /* ── `da` ── */
  b.reloj.avanzar(10);
  const t1 = b.reloj.ahora();
  const avisosAntesDeDa = b.estados.length;
  llega(b, { t: 'da', de: 's2', a: 's1', vida: 1 });
  const yoTrasDa = b.cliente.refriegaDe('s1');
  comprobar(
    '`da` a mí: me quedo con la vida que dice, se me ve recibir en el acto, y el cartel lo dice',
    yoTrasDa?.vida === 1 &&
      yoTrasDa.gesto?.clip === CLIP.golpe &&
      yoTrasDa.gesto.desde === t1 &&
      b.estados.length > avisosAntesDeDa &&
      b.estados[b.estados.length - 1]?.texto === 'Dentro · ♥♡♡ · 2 más andando',
    { yoTrasDa, texto: b.estados[b.estados.length - 1]?.texto },
  );
  b.reloj.avanzar(10);
  const t2 = b.reloj.ahora();
  llega(b, { t: 'da', de: 's1', a: 's2', vida: 0 });
  const s2AntesDelDa = b.cliente.refriegaDe('s2', t2 + ANTES - 1);
  const s2TrasElDa = b.cliente.refriegaDe('s2', t2 + ANTES);
  comprobar(
    '`da` a otro: su vida nueva y su `golpe` a la hora de pintarle, y antes de esa hora la de antes',
    s2AntesDelDa?.vida === 1 && s2TrasElDa?.vida === 0 && s2TrasElDa.gesto?.clip === CLIP.golpe && s2TrasElDa.gesto.desde === t2,
    { s2AntesDelDa, s2TrasElDa },
  );

  /* ── `cae` de otro ── */
  b.reloj.avanzar(10);
  const t3 = b.reloj.ahora();
  llega(b, { t: 'cae', a: 's2', por: 's1' });
  const s2DePie = b.cliente.refriegaDe('s2', t3 + ANTES - 1);
  const s2EnElSuelo = b.cliente.refriegaDe('s2', t3 + ANTES);
  const s2Luego = b.cliente.refriegaDe('s2', t3 + ANTES + 4000);
  comprobar(
    '`cae` de otro: al suelo con su `caer` y los corazones apagados, a la hora de pintarle; un fotograma antes, de pie',
    s2DePie?.estado === DE_PIE &&
      s2EnElSuelo?.estado === CAIDO &&
      s2EnElSuelo.gesto?.clip === CLIP.caer &&
      s2EnElSuelo.gesto.desde === t3 &&
      s2EnElSuelo.corazones.apagados,
    { s2DePie, s2EnElSuelo },
  );
  comprobar(
    'y se queda en el suelo, con el mismo `caer` clavado, hasta que el servidor diga `renace`',
    s2Luego?.estado === CAIDO && s2Luego.gesto?.clip === CLIP.caer && s2Luego.gesto.desde === t3,
    s2Luego,
  );

  /* ── `renace` de otro: su sitio, en sus fotos, cuando empieza a brotar ── */
  b.reloj.avanzar(80);
  b.socket().llega(unaFoto(2, [['s2', 1, 1, 0], ['s3', 5, 5, 0]]));
  b.reloj.avanzar(100);
  const t4 = b.reloj.ahora();
  llega(b, { t: 'renace', a: 's2', x: deNumero(20), z: deNumero(-20), r: 64 });
  const unoAntes = b.cliente.poseDe('s2', t4 + ANTES - 1);
  const alBrotar = b.cliente.poseDe('s2', t4 + ANTES);
  const comoAlBrotar = b.cliente.refriegaDe('s2', t4 + ANTES);
  comprobar(
    '`renace` de otro: se le pinta en su sitio de nacer justo cuando empieza su `aparecer`, y un fotograma antes sigue en el suelo donde cayó',
    unoAntes?.x === 1 &&
      unoAntes.z === 1 &&
      b.cliente.refriegaDe('s2', t4 + ANTES - 1)?.estado === CAIDO &&
      alBrotar?.x === 20 &&
      alBrotar.z === -20 &&
      Math.abs(alBrotar.rumbo - radianesDelRumbo(64)) < 1e-12 &&
      comoAlBrotar?.gesto?.clip === CLIP.aparecer &&
      comoAlBrotar.estado === INTOCABLE &&
      comoAlBrotar.vida === VIDA_ENTERA,
    { unoAntes, alBrotar, comoAlBrotar },
  );

  /* ── Lo intocable parpadea, y se apaga solo ── */
  const parpadeos = [0, 1, 2, 3].map((k) => b.cliente.refriegaDe('s2', t4 + ANTES + k * PARPADEO_MS + 1)?.seVe);
  comprobar(`intocable, parpadea: se ve y no se ve cada ${String(PARPADEO_MS)} ms`, parpadeos.join() === 'true,false,true,false', parpadeos);
  const casi = b.cliente.refriegaDe('s2', t4 + ANTES + INTOCABLE_MS - 1);
  const pasado = b.cliente.refriegaDe('s2', t4 + ANTES + INTOCABLE_MS);
  comprobar(
    `y lo intocable se apaga solo a los ${String(INTOCABLE_MS)} ms de su \`renace\`: de pie, con la vida entera y sin parpadear`,
    casi?.estado === INTOCABLE && pasado?.estado === DE_PIE && pasado.vida === VIDA_ENTERA && pasado.seVe && pasado.corazones.llenos === VIDA_ENTERA,
    { casi: casi?.estado, pasado },
  );

  /* ── El golpe ── */
  let paseante = nacerEnElPaseo(ABIERTO, { x: 0, z: 25, rumbo: 0 });
  const g = unBanco((sitio, rumbo) => {
    paseante = corregirElPaseo(paseante, sitio, rumbo);
  });
  g.cliente.alDarUnTic(tic(1, true), SITIO);
  g.socket().abrir();
  g.cliente.alDarUnTic(tic(2, true), SITIO);
  comprobar(
    'fuera del canal no sale ningún golpe: ni conectando, ni abierto antes de `dentro` —sólo el `hola`—, ni se guarda para luego',
    g.socket().enviados.length === 1 && golpesDe(g).length === 0,
    g.socket().enviados,
  );
  g.socket().llega(dentro(0, 25));
  llega(g, { t: 'vidas', v: [['s1', VIDA_ENTERA, DE_PIE], ['s2', VIDA_ENTERA, DE_PIE]] });
  const tg = g.reloj.ahora();
  const antesDelGolpe = g.socket().enviados.length;
  g.cliente.alDarUnTic(tic(3, true, ANDANDO, 200), SITIO);
  const trasElGolpe = g.leidos().slice(antesDelGolpe);
  const elAqui = trasElGolpe[0];
  const elGolpe = trasElGolpe[1];
  comprobar(
    'dentro, un tic con golpe manda su `aqui` y DETRÁS un `golpe` con ese tic y esa mirada, que el lector estricto del servidor acepta',
    trasElGolpe.length === 2 &&
      elAqui !== null &&
      elAqui !== undefined &&
      elAqui.t === 'aqui' &&
      elAqui.n === 3 &&
      elGolpe !== null &&
      elGolpe !== undefined &&
      elGolpe.t === 'golpe' &&
      elGolpe.n === 3 &&
      elGolpe.r === 200,
    trasElGolpe,
  );
  const gestoPropio = g.cliente.refriegaDe('s1');
  comprobar(
    'y el gesto propio, `lanzar`, sale en el acto: no espera a que vuelva nada, y el impacto no se predice',
    gestoPropio?.gesto?.clip === CLIP.lanzar && gestoPropio.gesto.desde === tg && g.cliente.refriegaDe('s2')?.vida === VIDA_ENTERA,
    gestoPropio,
  );
  g.reloj.avanzar(100);
  g.cliente.alDarUnTic(tic(5, true), SITIO);
  g.reloj.avanzar(RECARGA_DEL_GOLPE_MS - 101);
  g.cliente.alDarUnTic(tic(20, true), SITIO);
  comprobar(`y hasta ${String(RECARGA_DEL_GOLPE_MS)} ms después no sale otro: un dedo nervioso no manda ráfagas`, golpesDe(g).length === 1, golpesDe(g));
  g.reloj.avanzar(1);
  g.cliente.alDarUnTic(tic(21, true), SITIO);
  comprobar('y pasada la recarga, sí: la guarda distingue', golpesDe(g).length === 2 && golpesDe(g)[1]?.n === 21, golpesDe(g));
  g.reloj.avanzar(RECARGA_DEL_GOLPE_MS);
  g.cliente.alDarUnTic(tic(22, false, QUIETO), SITIO);
  const antesDeQuieto = g.socket().enviados.length;
  g.cliente.alDarUnTic(tic(23, true, QUIETO), SITIO);
  const trasQuieto = g.leidos().slice(antesDeQuieto);
  comprobar(
    'y quieto, el golpe sale aunque al `aqui` de su tic no le toque salir',
    trasQuieto.length === 1 && trasQuieto[0]?.t === 'golpe',
    trasQuieto,
  );

  /* ── Mi `cae`: ni se anda, ni se golpea ── */
  llega(g, { t: 'cae', a: 's1', por: 's2' });
  comprobar(
    'mi `cae`: el canal dice que estoy en el suelo, el cartel lo dice y se me ve caer',
    g.cliente.caido() &&
      g.cliente.estado().refriega?.estado === CAIDO &&
      /♡♡♡ caído/.test(g.cliente.estado().texto) &&
      g.cliente.refriegaDe('s1')?.gesto?.clip === CLIP.caer,
    g.cliente.estado(),
  );
  g.reloj.avanzar(RECARGA_DEL_GOLPE_MS * 2);
  const golpesAntesDelSuelo = golpesDe(g).length;
  const aquisAntesDelSuelo = aquisDe(g);
  g.cliente.alDarUnTic(tic(40, true), SITIO);
  comprobar('y en el suelo no sale ningún golpe, ni pasada la recarga, ni un `aqui` aunque alguien le dé un tic', golpesDe(g).length === golpesAntesDelSuelo && aquisDe(g) === aquisAntesDelSuelo);
  let tumbado = paseante;
  let vistos: number | null = null;
  for (let i = 0; i < 120; i++) {
    const hecho = fotogramaDeQuienPasea(ABIERTO, tumbado, 1 / 60, { ...SIN_TECLAS, adelante: true }, SIN_MANDOS_DE_FUERA, 0, vistos, g.cliente.caido(), (en, s) =>
      g.cliente.alDarUnTic(en, s),
    );
    tumbado = hecho.paseo;
    vistos = hecho.golpesVistos;
  }
  comprobar(
    'caído, con el paseo de verdad y la W pulsada, en dos segundos no se anda ni sale un `aqui`',
    tumbado === paseante && aquisDe(g) === aquisAntesDelSuelo,
    { tic: tumbado.tic, aquis: aquisDe(g) - aquisAntesDelSuelo },
  );

  /* ── Mi `renace` ── */
  const ultimoAqui = g.leidos().filter((m) => m !== null && m !== undefined && m.t === 'aqui').pop();
  const nDelUltimo = ultimoAqui !== null && ultimoAqui !== undefined && ultimoAqui.t === 'aqui' ? ultimoAqui.n : -1;
  g.reloj.avanzar(10);
  llega(g, { t: 'renace', a: 's1', x: deNumero(-12), z: deNumero(8), r: 64 });
  comprobar(
    'mi `renace`: me pone en mi sitio de nacer mirando a donde dice, por la costura de corregir, y me levanta',
    paseante.ahora.x === deNumero(-12) &&
      paseante.ahora.z === deNumero(8) &&
      g.rumbos[g.rumbos.length - 1] === radianesDelRumbo(64) &&
      Math.abs(paseante.rumbo - radianesDelRumbo(64)) < 1e-12 &&
      !g.cliente.caido() &&
      g.cliente.estado().refriega?.estado === INTOCABLE &&
      /♥♥♥ intocable/.test(g.cliente.estado().texto) &&
      g.cliente.refriegaDe('s1')?.gesto?.clip === CLIP.aparecer,
    { ahora: paseante.ahora, rumbo: paseante.rumbo, texto: g.cliente.estado().texto },
  );
  const correccionesAntes = g.correcciones.length;
  llega(g, { t: 'corrige', n: nDelUltimo, x: deNumero(0), z: deNumero(0) });
  comprobar(
    'y un `corrige` de un tic de antes de renacer ya está contestado: no me devuelve a donde caí',
    nDelUltimo > 0 && g.correcciones.length === correccionesAntes && paseante.ahora.x === deNumero(-12),
    { nDelUltimo, correcciones: g.correcciones.length - correccionesAntes },
  );
  let levantado = paseante;
  const aquisAlLevantarse = aquisDe(g);
  for (let i = 0; i < 30; i++) {
    const hecho = fotogramaDeQuienPasea(ABIERTO, levantado, 1 / 60, { ...SIN_TECLAS, adelante: true }, SIN_MANDOS_DE_FUERA, 0, vistos, g.cliente.caido(), (en, s) =>
      g.cliente.alDarUnTic(en, s),
    );
    levantado = hecho.paseo;
    vistos = hecho.golpesVistos;
  }
  comprobar(
    'y en pie se anda en el acto, desde el sitio de nacer, contándoselo al canal',
    levantado.tic > paseante.tic && aquisDe(g) > aquisAlLevantarse && Math.abs(aNumero(levantado.ahora.x) + 12) > 1,
    { tics: levantado.tic - paseante.tic, aquis: aquisDe(g) - aquisAlLevantarse, x: aNumero(levantado.ahora.x) },
  );
  const avisosAlRenacer = g.estados.length;
  g.reloj.avanzar(INTOCABLE_MS - 1);
  const todaviaIntocable = g.cliente.estado().refriega?.estado === INTOCABLE && g.estados.length === avisosAlRenacer;
  g.reloj.avanzar(1);
  const elAviso = g.estados[g.estados.length - 1];
  comprobar(
    `y lo mío intocable se apaga solo a los ${String(INTOCABLE_MS)} ms, y el cartel se entera sin que llegue nada`,
    todaviaIntocable &&
      g.estados.length === avisosAlRenacer + 1 &&
      elAviso?.refriega?.estado === DE_PIE &&
      elAviso.texto.startsWith('Dentro · ♥♥♥') &&
      !/intocable/.test(elAviso.texto),
    { todaviaIntocable, aviso: elAviso },
  );

  /* ── Al cortarse se olvida; al volver, `vidas` reinicia ── */
  llega(g, { t: 'cae', a: 's1', por: 's2' });
  const enElSueloAlCortarse = g.cliente.caido();
  g.socket().cae(1006);
  comprobar(
    'al cortarse la refriega se olvida: ni corazones, ni un suelo del que no se pueda levantar mientras no haya canal',
    enElSueloAlCortarse && !g.cliente.caido() && g.cliente.refriegaDe('s1') === null && g.cliente.estado().refriega === null,
    g.cliente.estado(),
  );
  g.reloj.avanzar(PRIMERA_ESPERA_MS);
  g.socket().abrir();
  g.socket().llega(dentro(0, 25));
  const alVolver = g.cliente.estado().texto;
  llega(g, { t: 'vidas', v: [['s1', 1, INTOCABLE], ['s2', 2, DE_PIE]] });
  const yoAlVolver = g.cliente.refriegaDe('s1');
  comprobar(
    'y al volver no se enseña nada hasta su `vidas`, que lo pone todo otra vez: de lo de antes de cortarse no queda nada',
    alVolver === 'Dentro' &&
      yoAlVolver?.vida === 1 &&
      yoAlVolver.estado === INTOCABLE &&
      yoAlVolver.gesto === null &&
      g.cliente.refriegaDe('s2')?.vida === 2 &&
      g.cliente.estado().texto === 'Dentro · ♥♡♡ intocable',
    { alVolver, yoAlVolver, texto: g.cliente.estado().texto },
  );
  g.reloj.avanzar(INTOCABLE_MS);
  comprobar('y lo intocable de `vidas` también se apaga solo, contado desde que llegó', g.cliente.refriegaDe('s1')?.estado === DE_PIE && g.cliente.estado().texto === 'Dentro · ♥♡♡');

  /* ── Lo mal formado no cambia nada ── */
  const hora = g.reloj.ahora();
  const foto = (): string => JSON.stringify([g.cliente.refriegaDe('s1', hora), g.cliente.refriegaDe('s2', hora), g.cliente.estado().texto, g.correcciones.length, g.cliente.caido(hora)]);
  const antesDeLoMalo = foto();
  const ignoradosAntes = g.cliente.ignorados();
  const MALOS: readonly unknown[] = [
    { t: 'vidas', v: [['s1', VIDA_ENTERA + 1, DE_PIE]] },
    { t: 'vidas', v: [['s1', 2, 7]] },
    { t: 'vidas', v: [['s1', 2, DE_PIE], ['s1', 1, DE_PIE]] },
    { t: 'vidas', v: 's1' },
    { t: 'lanza' },
    { t: 'lanza', de: 3 },
    { t: 'da', de: 's2', a: 's1' },
    { t: 'da', de: 's2', a: 's1', vida: -1 },
    { t: 'da', de: 's2', a: 's1', vida: 1.5 },
    { t: 'cae', a: 's1' },
    { t: 'cae', a: 7, por: 's2' },
    { t: 'renace', a: 's1', x: 0, z: 0 },
    { t: 'renace', a: 's1', x: 0.5, z: 0, r: 0 },
    { t: 'renace', a: 's1', x: 0, z: 0, r: 256 },
  ];
  for (const m of MALOS) llega(g, m);
  comprobar(
    `${String(MALOS.length)} mensajes de la refriega mal formados se tiran y se cuentan, uno a uno`,
    g.cliente.ignorados() - ignoradosAntes === MALOS.length,
    { contados: g.cliente.ignorados() - ignoradosAntes },
  );
  comprobar('y no cambian nada: ni vidas, ni estados, ni el cartel, ni el sitio, ni el suelo', foto() === antesDeLoMalo, { antes: antesDeLoMalo, despues: foto() });
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
   * ═══ EL COLOR DEL ASIENTO SE LEE AUNQUE SEA OSCURO ═══
   *
   * El segundo asiento del Burgo es `#26262e` y la placa `#1b2411`: contraste de 1,07 a 1. La
   * tesela lleva ahora un canto claro, de la tinta. Se mide que el problema es de verdad —si no, el
   * canto no estaría arreglando nada—, que el canto contra la placa se lee, y que en los seis colores
   * del Burgo el canto está donde tiene que estar: rodeando la tesela, entre la placa y ella.
   */
  const luminancia = (hex: string): number => {
    const canal = (i: number): number => {
      const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
  };
  const contraste = (a: string, b: string): number => {
    const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p) as [number, number];
    return (x + 0.05) / (y + 0.05);
  };
  const casiIguales = COLORES_DEL_BURGO.filter((c) => contraste(c, COLOR_DE_LA_PLACA) < 1.5);
  comprobar(
    'el problema es de verdad: el segundo asiento del Burgo, #26262e, contra la placa no llega a 1,5 a 1',
    casiIguales.includes('#26262e'),
    COLORES_DEL_BURGO.map((c) => `${c}: ${contraste(c, COLOR_DE_LA_PLACA).toFixed(2)}`),
  );
  comprobar('y el canto, de la tinta, contra la placa pasa de siete a uno', contraste(COLOR_DE_LA_TINTA, COLOR_DE_LA_PLACA) >= 7, contraste(COLOR_DE_LA_TINTA, COLOR_DE_LA_PLACA));
  const sinCanto: string[] = [];
  for (const color of COLORES_DEL_BURGO) {
    const geo = geometriaDelRotulo('Bruno', color);
    const p = geo?.getAttribute('position');
    const k = geo?.getAttribute('color');
    if (geo === null || geo === undefined || p === undefined || k === undefined) {
      sinCanto.push(`${color}: sin geometría`);
      continue;
    }
    const suyo = new THREE.Color(color);
    const tinta = new THREE.Color(COLOR_DE_LA_TINTA);
    const es = (i: number, c: THREE.Color): boolean => Math.abs(k.getX(i) - c.r) < 1e-6 && Math.abs(k.getY(i) - c.g) < 1e-6 && Math.abs(k.getZ(i) - c.b) < 1e-6;
    const caja = (lista: number[]): { x0: number; x1: number; y0: number; y1: number; z: number } => ({
      x0: Math.min(...lista.map((i) => p.getX(i))),
      x1: Math.max(...lista.map((i) => p.getX(i))),
      y0: Math.min(...lista.map((i) => p.getY(i))),
      y1: Math.max(...lista.map((i) => p.getY(i))),
      z: p.getZ(lista[0] ?? 0),
    });
    const tesela: number[] = [];
    for (let i = 0; i < p.count; i++) if (es(i, suyo)) tesela.push(i);
    const t = tesela.length === 4 ? caja(tesela) : null;
    /* La tinta de las letras va delante, en el plano de la tesela; la del canto, entre la placa y ella. */
    const canto: number[] = [];
    for (let i = 0; i < p.count; i++) if (t !== null && es(i, tinta) && p.getZ(i) > 0 && p.getZ(i) < t.z) canto.push(i);
    const c = canto.length === 4 ? caja(canto) : null;
    const rodea =
      t !== null &&
      c !== null &&
      Math.abs(t.x0 - c.x0 - CANTO_DE_LA_TESELA) < 1e-5 &&
      Math.abs(c.x1 - t.x1 - CANTO_DE_LA_TESELA) < 1e-5 &&
      Math.abs(t.y0 - c.y0 - CANTO_DE_LA_TESELA) < 1e-5 &&
      Math.abs(c.y1 - t.y1 - CANTO_DE_LA_TESELA) < 1e-5 &&
      c.z > 0 &&
      c.z < t.z;
    if (!rodea) sinCanto.push(`${color}: tesela ${String(tesela.length)}, canto ${String(canto.length)}`);
    geo.dispose();
  }
  comprobar('en los seis colores del Burgo la tesela lleva su canto claro alrededor, entre la placa y ella', sinCanto.length === 0, sinCanto);

  /*
   * ═══ Y LOS CORAZONES ═══
   *
   * `VIDA_ENTERA` en su placa, encima del nombre, en la misma geometría y al final del índice:
   * escondidos hasta que se pongan, llenos según la vida, apagados en el suelo, y todos mirando a la
   * cámara —una cara al revés no la pinta nadie, y no falla nada—.
   */
  const conCorazones = geometriaDelRotulo('Ana', '#c0392b', true);
  const suyos = conCorazones === null ? null : corazonesDelRotulo(conCorazones);
  const indices = conCorazones?.getIndex() ?? null;
  const posiciones = conCorazones?.getAttribute('position');
  const colores = conCorazones?.getAttribute('color');
  const alReves = (geo: THREE.BufferGeometry | null): { triangulos: number; alReves: number } => {
    const idx = geo?.getIndex() ?? null;
    const pos = geo?.getAttribute('position');
    if (idx === null || pos === undefined) return { triangulos: 0, alReves: -1 };
    let triangulos = 0;
    let malos = 0;
    const a = new THREE.Vector3();
    const b2 = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let i = 0; i + 2 < idx.count; i += 3) {
      a.fromBufferAttribute(pos as THREE.BufferAttribute, idx.getX(i));
      b2.fromBufferAttribute(pos as THREE.BufferAttribute, idx.getX(i + 1));
      c.fromBufferAttribute(pos as THREE.BufferAttribute, idx.getX(i + 2));
      const normal = new THREE.Vector3().subVectors(b2, a).cross(new THREE.Vector3().subVectors(c, a));
      if (normal.lengthSq() < 1e-18) continue;
      triangulos++;
      if (normal.z <= 0) malos++;
    }
    return { triangulos, alReves: malos };
  };
  comprobar(
    `con corazones, el rótulo lleva ${String(VIDA_ENTERA)} al final del índice, y sin ponerlos no se dibujan`,
    conCorazones !== null && suyos !== null && indices !== null && suyos.vertices.length === VIDA_ENTERA && suyos.desdeIndice < indices.count && conCorazones.drawRange.count === suyos.desdeIndice,
    { suyos, indices: indices?.count, dibujados: conCorazones?.drawRange.count },
  );
  const caras = alReves(conCorazones);
  comprobar('y TODOS sus triángulos, corazones incluidos, miran a `+z`', caras.triangulos > 100 && caras.alReves === 0, caras);
  let encima = false;
  if (suyos !== null && posiciones !== undefined) {
    let y0 = Number.POSITIVE_INFINITY;
    let x0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    for (const [desde, hasta] of suyos.vertices) {
      for (let i = desde; i < hasta; i++) {
        y0 = Math.min(y0, posiciones.getY(i));
        x0 = Math.min(x0, posiciones.getX(i));
        x1 = Math.max(x1, posiciones.getX(i));
      }
    }
    encima = y0 > altoDeLaPlaca() && Math.abs(x0 + x1) < 1e-4;
  }
  comprobar('y van encima de la placa del nombre, centrados', encima);
  const tintes = (): string[] =>
    suyos === null || colores === undefined
      ? []
      : suyos.vertices.map(([desde, hasta]) => {
          const que = [COLOR_DEL_CORAZON, COLOR_DEL_CORAZON_PERDIDO, COLOR_DEL_CORAZON_APAGADO].find((hex) => {
            const c = new THREE.Color(hex);
            for (let i = desde; i < hasta; i++) {
              if (Math.abs(colores.getX(i) - c.r) > 1e-6 || Math.abs(colores.getY(i) - c.g) > 1e-6 || Math.abs(colores.getZ(i) - c.b) > 1e-6) return false;
            }
            return true;
          });
          return que === COLOR_DEL_CORAZON ? 'lleno' : que === COLOR_DEL_CORAZON_PERDIDO ? 'perdido' : que === COLOR_DEL_CORAZON_APAGADO ? 'apagado' : '?';
        });
  let puestos = '';
  let enElSuelo = '';
  let escondidos = false;
  if (conCorazones !== null) {
    ponerLosCorazones(conCorazones, { llenos: 2, apagados: false });
    puestos = `${tintes().join()}|${String(conCorazones.drawRange.count >= (indices?.count ?? Number.POSITIVE_INFINITY))}`;
    ponerLosCorazones(conCorazones, { llenos: 0, apagados: true });
    enElSuelo = tintes().join();
    ponerLosCorazones(conCorazones, null);
    escondidos = suyos !== null && conCorazones.drawRange.count === suyos.desdeIndice;
  }
  comprobar(
    'y se ponen como va: con dos vidas, dos llenos y uno perdido, y todo se dibuja; en el suelo, los tres apagados; y sin refriega, escondidos otra vez',
    puestos === 'lleno,lleno,perdido|true' && enElSuelo === 'apagado,apagado,apagado' && escondidos,
    { puestos, enElSuelo, escondidos },
  );
  conCorazones?.dispose();
  const propios = geometriaDeLosCorazones();
  propios.computeBoundingBox();
  const cajaPropia = propios.boundingBox;
  const carasPropias = alReves(propios);
  comprobar(
    'y los de quien pasea van en su placa sola, centrada y con el canto de abajo en el cero, mirando a `+z` y escondidos hasta que se pongan',
    cajaPropia !== null &&
      Math.abs(cajaPropia.min.x + cajaPropia.max.x) < 1e-4 &&
      Math.abs(cajaPropia.min.y) < 1e-6 &&
      carasPropias.alReves === 0 &&
      carasPropias.triangulos > 100 &&
      propios.drawRange.count === 0 &&
      corazonesDelRotulo(propios)?.vertices.length === VIDA_ENTERA,
    { caja: cajaPropia, carasPropias, dibujados: propios.drawRange.count },
  );
  propios.dispose();

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

// ---------------------------------------------------------------------------
paso('Los tres juegos que se andan: el canal cosido igual, los demás a la altura del suelo de cada juego, y sólo en una mesa `botas`');
// ---------------------------------------------------------------------------

/*
 * ═══ POR QUÉ UNA SOLA REGLA PARA TRES ESCENAS ═══
 *
 * Las Lindes, el Burgo y Riberas se andan con el MISMO paseo y el MISMO canal, y se cosen por los
 * mismos tres sitios: `usarElCanal` con la prop, ANTES del paseo; su `alDarUnTic` en las opciones del
 * paseo (la costura a); y la corrección por una referencia (la costura b). Lo que cambia de un juego a
 * otro es a qué altura está su suelo, y eso es justo lo que no se puede separar: los demás se pintan
 * con LA MISMA `alturaEn` que el paseo le da a quien anda —en el Burgo pisan el andén y el puente, en
 * Riberas vadean con el agua por la cintura—. Con otra, alguien anda a un metro de lo que pisa en su
 * propio aparato y nada se pone rojo: `LosDemas` recibe una función, la que se le dé. Así que la regla
 * se escribe una vez y se aplica a las tres, cada una con sus casos envenenados. (Que la altura del
 * paseo sea la del suelo que se pinta lo mide cada juego en el suyo: `verify:lindes-escena`,
 * `verify:burgo-escena` y `verify:escena`. Aquí se ata la de los demás a ésa.)
 *
 * ═══ Y EN LOS CLIENTES, QUE UNA MESA NORMAL NO ABRA NADA ═══
 *
 * El canal se construye SÓLO detrás de `esMesaDeBotas`, se le pasa a la escena una vez, se empieza a
 * pie, el cartel del canal sale sólo en botas y nadie compara la modalidad a pelo. Los dos clientes de
 * Las Lindes los mira el paso de arriba; aquí, los dos del Burgo y los dos de Riberas. Y el color de
 * cada asiento, que es del juego, se saca con UN ayudante por juego, que aquí se ejecuta.
 *
 * Todo se lee del CÓDIGO sin comentarios —las cabeceras cuentan el porqué con los mismos nombres— y
 * cada regla se ve CAER con sus casos envenenados sobre el propio fichero. Un envenenado que no
 * cambia el fichero cuenta como fallo: sería un filtro roto, y un filtro roto da verdes para siempre.
 */
{
  const leer = (ruta: string): string =>
    fs
      .readFileSync(new URL(ruta, import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  /** Afirma la regla sobre el fichero de verdad, y la ve CAER con cada caso envenenado. */
  const reglaDelFuente = (que: string, prueba: (t: string) => boolean, bueno: string, envenenados: readonly string[]): void => {
    comprobar(que, prueba(bueno));
    envenenados.forEach((envenenado, i) => {
      comprobar(
        `y «${que}» se ve CAER con el caso envenenado ${String(i + 1)}`,
        envenenado !== bueno && !prueba(envenenado),
        envenenado === bueno ? 'el envenenado no ha cambiado el fichero: la regla no se está poniendo a prueba' : undefined,
      );
    });
  };

  /* ─── Los colores de cada juego, ejecutados ─── */

  const SENTADOS = [
    { id: 's1', nombre: 'Ana', figura: 'maga' },
    { id: 's2', nombre: 'Bruno' },
    { id: 's3', nombre: 'Celia' },
  ] as const;
  const delBurgo = asientosQueAndanPorElBurgo(SENTADOS, [
    { asiento: 's1', color: '#7d3fd6' },
    { asiento: 's2', color: 'violeta' },
  ]);
  comprobar(
    'en el Burgo cada uno anda con el color de su PEÓN, con su figura; sin peón, o con un color que no es `#rrggbb`, en gris',
    delBurgo.length === 3 &&
      delBurgo[0]?.color === '#7d3fd6' &&
      delBurgo[0].figura === 'maga' &&
      delBurgo[0].nombre === 'Ana' &&
      delBurgo[1]?.color === COLOR_SIN_DECLARAR &&
      delBurgo[2]?.color === COLOR_SIN_DECLARAR,
    delBurgo,
  );
  /* LA VACUNA: las figuras a pelo no las lee nadie; el color lo da el ayudante, y sin él no sale. */
  const aPelo = asientosQueAndan(SENTADOS, { figuras: [{ asiento: 's1', color: '#7d3fd6' }] });
  comprobar('y sin el ayudante —las figuras del Burgo a pelo— no sale ni un color: la guarda distingue', aPelo.every((a) => a.color === COLOR_SIN_DECLARAR), aPelo);
  const vistaDeRiberas = {
    desde: 'riberas',
    momento: 'jugando',
    islas: [],
    colonos: [
      { asiento: 's1', nombre: 'Ana', color: '#e0533d' },
      { asiento: 's3', nombre: 'Celia', color: '#3d8be0' },
    ],
  };
  const delDelta = asientosQueAndanPorElDelta(SENTADOS, vistaDeRiberas);
  comprobar(
    'en Riberas cada uno anda con el color de sus CHOZAS, el de su colono en la vista; quien no es colono, en gris',
    delDelta.length === 3 && delDelta[0]?.color === '#e0533d' && delDelta[0].figura === 'maga' && delDelta[1]?.color === COLOR_SIN_DECLARAR && delDelta[2]?.color === '#3d8be0',
    delDelta,
  );
  const deOtroJuego = asientosQueAndanPorElDelta(SENTADOS, { ...vistaDeRiberas, desde: 'burgo' });
  comprobar('y con una vista que no es de Riberas no lo declara nadie: todos en gris, y se siguen leyendo', deOtroJuego.every((a) => a.color === COLOR_SIN_DECLARAR), deOtroJuego);

  /* ─── Las tres escenas ─── */

  interface EscenaQueAnda {
    readonly juego: string;
    readonly fuente: string;
    /** Con qué se pide el canal: la prop de la escena. */
    readonly prop: 'props.canal' | 'canal';
    /** La guarda que deja pintar a los demás sólo con canal y a pie, justo delante de `<LosDemas`. */
    readonly guarda: RegExp;
    /** Lo que le quita a esa guarda la pregunta por el canal, y lo que le quita el «a pie». */
    readonly sinCanal: readonly [string, string];
    readonly sinAPie: readonly [string, string];
  }
  const ESCENAS: readonly EscenaQueAnda[] = [
    {
      juego: 'Las Lindes',
      fuente: leer('../lindes/Lindes.tsx'),
      prop: 'props.canal',
      guarda: /\{props\.canal === undefined \|\| camara\.modo === 'mesa' \? null : \(\s*<LosDemas\b/,
      sinCanal: ["{props.canal === undefined || camara.modo === 'mesa' ? null : (", "{camara.modo === 'mesa' ? null : ("],
      sinAPie: ["{props.canal === undefined || camara.modo === 'mesa' ? null : (", '{props.canal === undefined ? null : ('],
    },
    {
      juego: 'el Burgo',
      fuente: leer('../burgo/Burgo.tsx'),
      prop: 'props.canal',
      guarda: /\{props\.canal === undefined \|\| !aPie \? null : \(\s*<LosDemas\b/,
      sinCanal: ['{props.canal === undefined || !aPie ? null : (', '{!aPie ? null : ('],
      sinAPie: ['{props.canal === undefined || !aPie ? null : (', '{props.canal === undefined ? null : ('],
    },
    {
      juego: 'Riberas',
      fuente: leer('../andar-por-el-delta.tsx'),
      prop: 'canal',
      guarda: /if \(!aPie\) return null;\s*return \(\s*<>(?:(?!return)[\s\S])*?\{canal === undefined \? null : \(\s*<LosDemas\b/,
      sinCanal: ['{canal === undefined ? null : (', '{false ? null : ('],
      sinAPie: ['if (!aPie) return null;\n  return (', 'return ('],
    },
  ];

  /** Lo que la escena le da al paseo, entre las llaves de la llamada. */
  const llamadaAlPaseo = (c: string): string | null => /const paseo = usarElPaseo\(\{([^}]*)\}\);/.exec(c)?.[1] ?? null;
  /**
   * CON QUÉ ALTURA ANDA QUIEN ANDA: lo que la llamada al paseo da como `alturaEn` —`alturaEn: algo`,
   * o `alturaEn` a secas—. Una función escrita ahí mismo no es un nombre, y no casa con nada: se
   * quiere el MISMO objeto en los dos sitios, no dos funciones que hoy den lo mismo.
   */
  const alturaDelPaseo = (c: string): string | null => {
    const llamada = llamadaAlPaseo(c);
    if (llamada === null) return null;
    const m = /(?:^|[\s,{])alturaEn(?:\s*:\s*([A-Za-z_$][\w$]*))?\s*(?:,|$)/.exec(llamada);
    return m === null ? null : (m[1] ?? 'alturaEn');
  };
  const losDemasEn = (c: string): readonly string[] => c.match(/<LosDemas\b[\s\S]*?\/>/g) ?? [];
  const aLaLetra = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const coseElCanal =
    (e: EscenaQueAnda) =>
    (c: string): boolean => {
      const llamada = llamadaAlPaseo(c) ?? '';
      return (
        new RegExp(`const elCanal = usarElCanal\\(${aLaLetra(e.prop)}, corregirAQuienPasea\\);`).test(c) &&
        (c.match(/\busarElCanal\(/g) ?? []).length === 1 &&
        c.indexOf('const elCanal = usarElCanal(') < c.indexOf('const paseo = usarElPaseo(') &&
        /\balDarUnTic: elCanal\.alDarUnTic\b/.test(llamada) &&
        /corregirAQuienPasea\.current = paseo\.corregir;/.test(c) &&
        !/abrirElCanal\(/.test(c) &&
        !/WebSocket/.test(c)
      );
    };
  const pintaALosDemas =
    (e: EscenaQueAnda) =>
    (c: string): boolean => {
      const todos = losDemasEn(c);
      const el = todos[0] ?? '';
      const altura = alturaDelPaseo(c);
      const p = aLaLetra(e.prop);
      return (
        todos.length === 1 &&
        e.guarda.test(c) &&
        altura !== null &&
        new RegExp(`\\balturaEn=\\{${aLaLetra(altura)}\\}`).test(el) &&
        /\bcliente=\{elCanal\.cliente\}/.test(el) &&
        /\bpresentes=\{elCanal\.presentes\}/.test(el) &&
        new RegExp(`\\basientos=\\{${p}\\.asientos\\}`).test(el) &&
        new RegExp(`\\byo=\\{${p}\\.yo\\}`).test(el) &&
        /\btraer=\{traer\}/.test(el)
      );
    };

  for (const e of ESCENAS) {
    reglaDelFuente(
      `${e.juego}: la escena abre el canal con la prop y con nada más, ANTES del paseo; le da cada tic, le deja corregir a quien anda, y no abre sockets por su cuenta`,
      coseElCanal(e),
      e.fuente,
      [
        e.fuente.replace('alDarUnTic: elCanal.alDarUnTic', 'alDarUnTic: undefined'),
        e.fuente.replace('corregirAQuienPasea.current = paseo.corregir;', ''),
        `${e.fuente}\nconst otro = new WebSocket('ws://localhost:5174');`,
      ],
    );
    reglaDelFuente(
      `${e.juego}: pinta a los demás UNA vez, sólo con canal y a pie, con los asientos y el asiento del canal, y con LA MISMA altura del suelo que el paseo le da a quien anda`,
      pintaALosDemas(e),
      e.fuente,
      [
        e.fuente.replace(/(<LosDemas\b[\s\S]*?)alturaEn=\{[A-Za-z_$][\w$]*\}/, '$1alturaEn={() => 0}'),
        e.fuente.replace(e.sinCanal[0], e.sinCanal[1]),
        e.fuente.replace(e.sinAPie[0], e.sinAPie[1]),
      ],
    );
    /*
     * LA REFRIEGA, POR LOS MISMOS HILOS: el paseo le pregunta al canal si quien anda está en el suelo
     * —sin eso, un caído sigue andando en su pantalla—, y `QuienAnda` cómo va —sin eso, quien pasea no
     * lanza, no cae y no lleva corazones—. `LosDemas` ya tiene el cliente, y la regla de arriba lo mira.
     */
    const quienAndaEn = (c: string): string => /<QuienAnda\b[\s\S]*?\/>/.exec(c)?.[0] ?? '';
    reglaDelFuente(
      `${e.juego}: la refriega llega por los mismos hilos: el paseo pregunta al canal si quien anda está en el suelo, y \`QuienAnda\` cómo va`,
      (c) =>
        /\bcaido: elCanal\.caido\b/.test(llamadaAlPaseo(c) ?? '') &&
        /\bcliente=\{elCanal\.cliente\}/.test(quienAndaEn(c)) &&
        (c.match(/<QuienAnda\b/g) ?? []).length === 1,
      e.fuente,
      [e.fuente.replace(/,\s*caido: elCanal\.caido/, ''), e.fuente.replace(/(<QuienAnda\b[\s\S]*?)\s*cliente=\{elCanal\.cliente\}/, '$1')],
    );
  }

  /*
   * El Burgo y Las Lindes lo declaran por EL MISMO contrato —`PropsDeEscenaDeTablero`, en
   * `comun/tablero.ts`, que lleva la prop una vez— y no cada uno el suyo: así es del mismo tipo por
   * construcción, y no porque dos copias coincidan hoy. Riberas lo pasa de la escena del delta al paseo.
   *
   * Los tres fuentes se juzgan juntos, separados, para que cada caso envenenado sea una copia del
   * conjunto con una sola cosa rota: la prop fuera del común, el Burgo sin el común, o Las Lindes
   * declarándose otra vez un `canal` suyo.
   */
  const SEPARADOR_DE_CONTRATOS = '\n/* ── otro fichero ── */\n';
  const losContratos = [leer('../comun/tablero.ts'), leer('../burgo/tipos.ts'), leer('../lindes/tipos.ts')].join(SEPARADOR_DE_CONTRATOS);
  reglaDelFuente(
    'el Burgo y Las Lindes: sus contratos extienden el común de tablero, que lleva UNA vez la prop `canal` del tipo de `mesa-de-botas`, y ninguno la vuelve a declarar',
    (c) => {
      const [comun = '', burgo = '', lindes = ''] = c.split(SEPARADOR_DE_CONTRATOS);
      return (
        /export interface PropsDeEscenaDeTablero<[^>]*> \{(?:(?!\n\})[\s\S])*\breadonly canal\?: CanalDeBotas;/.test(comun) &&
        /import type \{ CanalDeBotas \} from '\.\.\/paseo\/mesa-de-botas';/.test(comun) &&
        /from '\.\.\/comun\/tablero';/.test(burgo) &&
        /export interface PropsDelBurgo extends PropsDeEscenaDeTablero<ModoDeCamara> \{/.test(burgo) &&
        /from '\.\.\/comun\/tablero';/.test(lindes) &&
        /export interface PropsDeLasLindes extends PropsDeEscenaDeTablero<ModoDeCamaraDeLasLindes> \{/.test(lindes) &&
        ![burgo, lindes].some((t) => /\breadonly canal\?:/.test(t))
      );
    },
    losContratos,
    [
      losContratos.replace('readonly canal?: CanalDeBotas;', ''),
      losContratos.replace('export interface PropsDelBurgo extends PropsDeEscenaDeTablero<ModoDeCamara> {', 'export interface PropsDelBurgo {'),
      losContratos.replace(
        'export interface PropsDeLasLindes extends PropsDeEscenaDeTablero<ModoDeCamaraDeLasLindes> {',
        'export interface PropsDeLasLindes extends PropsDeEscenaDeTablero<ModoDeCamaraDeLasLindes> {\n  readonly canal?: CanalDeBotas | null;',
      ),
    ],
  );
  const laDelDelta = leer('../delta.tsx');
  reglaDelFuente(
    'Riberas: la escena del delta declara el canal y se lo pasa al paseo tal cual, UNA vez; ni lo abre ella ni pinta a nadie',
    (c) =>
      /\bcanal\?: CanalDeBotas;/.test(c) &&
      /import type \{ CanalDeBotas \} from '\.\/paseo\/mesa-de-botas';/.test(c) &&
      (c.match(/\bcanal=\{canal\}/g) ?? []).length === 1 &&
      /<AndarPorElDelta\b[^>]*\bcanal=\{canal\}[^>]*\/>/.test(c) &&
      !/\busarElCanal\(/.test(c) &&
      !/<LosDemas\b/.test(c) &&
      !/WebSocket/.test(c),
    laDelDelta,
    [laDelDelta.replace(/\n\s*canal=\{canal\}/, '')],
  );

  /* ─── Los cuatro clientes del Burgo y de Riberas ─── */

  interface ClienteQueAnda {
    readonly quien: string;
    readonly fuente: string;
    /** A qué se le pregunta si es de botas: la vista de la mesa en la app, la mesa puesta en el escritorio. */
    readonly pregunta: 'vista' | 'puesta';
    /** Los elementos de la escena, enteros (con `g`: tiene que haber UNO). */
    readonly escena: RegExp;
    /** El ayudante que da a cada asiento el color de su juego. */
    readonly ayudante: 'asientosQueAndanPorElBurgo' | 'asientosQueAndanPorElDelta';
    /** Cómo se empieza a pie, y lo que lo estropea. */
    readonly aPie: RegExp;
    readonly sinAPie: readonly [string, string];
    /** Cómo se dice cómo va el canal, y lo que le quita la pregunta de botas. */
    readonly cartel: RegExp;
    readonly sinPregunta: readonly [string | RegExp, string];
  }
  const EL_CARTEL_DEL_ESCRITORIO = "canal={esBotas ? (estadoDelCanal?.texto ?? 'Conectando…') : undefined}";
  const CLIENTES: readonly ClienteQueAnda[] = [
    {
      quien: 'la app del Burgo',
      fuente: leer('../../app/src/arcade/burgo-en-tres-escena.tsx'),
      pregunta: 'vista',
      escena: /<Burgo\n[\s\S]*?\/>/g,
      ayudante: 'asientosQueAndanPorElBurgo',
      aPie: /useEffect\(\(\) => \{\s*if \(esBotas\) ponerModo\('hombro'\);\s*\}, \[esBotas, vista\.codigo\]\);/,
      sinAPie: ["if (esBotas) ponerModo('hombro');", ''],
      cartel: /\{esBotas \? \(\s*<View pointerEvents="none">\s*<Text style=\{estilos\.canal\} numberOfLines=\{2\}>\s*\{estadoDelCanal\?\.texto \?\? 'Conectando…'\}/,
      sinPregunta: [/\{esBotas \? \(\s*<View pointerEvents="none">/, '{true ? (<View pointerEvents="none">'],
    },
    {
      quien: 'el escritorio del Burgo',
      fuente: leer('../../escritorio/src/burgo-en-tres.tsx'),
      pregunta: 'puesta',
      escena: /<Burgo\n[\s\S]*?\/>/g,
      ayudante: 'asientosQueAndanPorElBurgo',
      aPie: /useEffect\(\(\) => \{\s*if \(esBotas\) ponerModo\('hombro'\);\s*\}, \[esBotas, puesta\.codigo\]\);/,
      sinAPie: ["if (esBotas) ponerModo('hombro');", ''],
      cartel: new RegExp(`<LasCamarasDelBurgo\\b(?:(?!\\/>)[\\s\\S])*\\b${aLaLetra(EL_CARTEL_DEL_ESCRITORIO)}`),
      sinPregunta: [EL_CARTEL_DEL_ESCRITORIO, "canal={estadoDelCanal?.texto ?? 'Conectando…'}"],
    },
    {
      quien: 'la app de Riberas',
      fuente: leer('../../app/src/arcade/riberas-en-tres-escena.tsx'),
      pregunta: 'vista',
      escena: /<Delta\b[\s\S]*?\/>/g,
      ayudante: 'asientosQueAndanPorElDelta',
      aPie: /const bajadoEnLaMesa = useRef<string \| null>\(null\);\s*useEffect\(\(\) => \{\s*if \(!esBotas \|\| bajadoEnLaMesa\.current === vista\.codigo\) return;\s*bajadoEnLaMesa\.current = vista\.codigo;\s*cambiarDeCamara\('hombro'\);\s*\}, \[esBotas, vista\.codigo, cambiarDeCamara\]\);/,
      sinAPie: ["bajadoEnLaMesa.current = vista.codigo;\n    cambiarDeCamara('hombro');", "bajadoEnLaMesa.current = vista.codigo;\n    ponerModo('hombro');"],
      cartel: /\{esBotas \? \(\s*<Text style=\{estilos\.canal\} numberOfLines=\{2\}>\s*\{estadoDelCanal\?\.texto \?\? 'Conectando…'\}/,
      sinPregunta: [/\{esBotas \? \(\s*<Text style=\{estilos\.canal\}/, '{true ? (<Text style={estilos.canal}'],
    },
    {
      quien: 'el escritorio de Riberas',
      fuente: leer('../../escritorio/src/riberas-en-tres.tsx'),
      pregunta: 'puesta',
      escena: /<Delta\b[\s\S]*?\/>/g,
      ayudante: 'asientosQueAndanPorElDelta',
      aPie: /const bajadoEnLaMesa = useRef<string \| null>\(null\);\s*useEffect\(\(\) => \{\s*if \(!esBotas \|\| bajadoEnLaMesa\.current === puesta\.codigo\) return;\s*bajadoEnLaMesa\.current = puesta\.codigo;\s*cambiarDeCamara\('hombro'\);\s*\}, \[esBotas, puesta\.codigo, cambiarDeCamara\]\);/,
      sinAPie: ["bajadoEnLaMesa.current = puesta.codigo;\n    cambiarDeCamara('hombro');", "bajadoEnLaMesa.current = puesta.codigo;\n    ponerModo('hombro');"],
      cartel: new RegExp(`<ComoSeAndaPorElDelta modo=\\{modo\\} ${aLaLetra(EL_CARTEL_DEL_ESCRITORIO)} \\/>`),
      sinPregunta: [EL_CARTEL_DEL_ESCRITORIO, "canal={estadoDelCanal?.texto ?? 'Conectando…'}"],
    },
  ];

  const construyeSoloEnBotas =
    (k: ClienteQueAnda) =>
    (c: string): boolean => {
      const conSuColor = `asientos: ${k.ayudante}\\(${k.pregunta}\\.asientos, [^)]*\\),`;
      const soloEnBotas =
        k.pregunta === 'vista'
          ? new RegExp(
              `esBotas && yo !== null && llaveDelAsiento !== null\\s*\\?\\s*\\{\\s*url: direccionDelCanal\\(vista\\.codigo\\),\\s*llave: llaveDelAsiento,\\s*yo,\\s*${conSuColor}\\s*alCambiar: ponerEstadoDelCanal,\\s*\\}\\s*:\\s*undefined,`,
            )
          : new RegExp(
              `const url = esBotas \\? direccionDelCanal\\(puesta\\.codigo\\) : null;\\s*if \\(url === null \\|\\| llaveDelAsiento === null \\|\\| yo === null\\) return undefined;\\s*return \\{\\s*url,\\s*llave: llaveDelAsiento,\\s*yo,\\s*${conSuColor}\\s*alCambiar: ponerEstadoDelCanal,\\s*\\};`,
            );
      return (
        new RegExp(`const esBotas = esMesaDeBotas\\(${k.pregunta}\\);`).test(c) &&
        (c.match(/\bconst esBotas = /g) ?? []).length === 1 &&
        /const llaveDelAsiento = mesa\.llave \?\? null;/.test(c) &&
        soloEnBotas.test(c) &&
        (c.match(/\bdireccionDelCanal\(/g) ?? []).length === 1
      );
    };
  /*
   * UNA ESCENA, Y EL CANAL EN ELLA. Se cuentan los elementos de la escena y no las veces que sale
   * `canal={canal}` en el fichero: en el escritorio del Burgo la columna de las cámaras le pasa al
   * cartel SU `canal` —otro componente, otra variable: el texto de cómo va—, y eso no es pasarle el
   * canal a nadie. Lo que no puede haber es una segunda escena montada con él.
   */
  const seLaPasaUnaVez =
    (k: ClienteQueAnda) =>
    (c: string): boolean => {
      const escenas = c.match(k.escena) ?? [];
      return escenas.length === 1 && /\bcanal=\{canal\}/.test(escenas[0] ?? '');
    };
  const empiezaAPie = (k: ClienteQueAnda) => (c: string): boolean => k.aPie.test(c);
  const diceComoVaElCanal =
    (k: ClienteQueAnda) =>
    (c: string): boolean =>
      k.cartel.test(c) && (c.match(/estadoDelCanal\?\.texto/g) ?? []).length === 1;
  const noDecideLaModalidad = (c: string): boolean => !/modalidad\s*[!=]==/.test(c) && !/\.modalidad\b/.test(c);

  for (const k of CLIENTES) {
    const c = k.fuente;
    reglaDelFuente(
      `${k.quien} pregunta con \`esMesaDeBotas\` y construye el canal SÓLO si es de botas, con la llave, quién soy y los asientos con el color de su juego`,
      construyeSoloEnBotas(k),
      c,
      [
        k.pregunta === 'vista'
          ? c.replace('esBotas && yo !== null', 'yo !== null')
          : c.replace('const url = esBotas ? direccionDelCanal(puesta.codigo) : null;', 'const url = direccionDelCanal(puesta.codigo);'),
        c.replace(`asientos: ${k.ayudante}(`, 'asientos: asientosQueAndan('),
        `${c}\nconst otraDireccion = direccionDelCanal('AB12C');`,
      ],
    );
    reglaDelFuente(`${k.quien} se lo pasa a la escena, y a UNA escena`, seLaPasaUnaVez(k), c, [
      c.replace(k.escena, (el) => el.replace(/\n\s*canal=\{canal\}/, '')),
      `${c}\n${(c.match(k.escena) ?? [''])[0] ?? ''}`,
    ]);
    reglaDelFuente(`${k.quien} empieza a pie en una mesa de botas, una vez por mesa, por la misma puerta que sus botones`, empiezaAPie(k), c, [c.replace(k.sinAPie[0], k.sinAPie[1])]);
    reglaDelFuente(`${k.quien} dice cómo va el canal, en un solo sitio y SÓLO en una mesa de botas`, diceComoVaElCanal(k), c, [c.replace(k.sinPregunta[0], k.sinPregunta[1])]);
    reglaDelFuente(`${k.quien} no decide la modalidad por su cuenta: ni una comparación con \`modalidad\` a pelo`, noDecideLaModalidad, c, [`${c}\nconst deBotas = ${k.pregunta}.modalidad === 'botas';`]);
  }
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
console.log('con lo demás se vuelve doblando la espera hasta su tope, y con quieto al volver a andar; en la');
console.log('refriega el golpe sale sólo dentro, con su tic y su recarga y nunca en el suelo, caído no se anda,');
console.log('renacer recoloca, cada mensaje cambia lo suyo a la hora de pintarlo y lo roto no cambia nada; la');
console.log('cámara de hombro se acerca a un muro sin saltar y vuelve; el rótulo se lee desde el hombro, con');
console.log('un canto que deja leer cualquier color y los corazones encima; y sólo una');
console.log('mesa `botas` monta el canal: en Las Lindes, en el Burgo y en Riberas, cosido igual y con los demás');
console.log('a la altura del suelo de cada juego, y en sus seis clientes, que empiezan a pie, dicen cómo va el');
console.log('canal y dan a cada asiento el color de su juego.');
