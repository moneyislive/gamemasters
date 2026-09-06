/**
 * LA MESA EN LÍNEA, CON UN SERVIDOR DE VERDAD LEVANTADO.
 *
 *   npm run verify:mesa
 *
 * ═══ POR QUÉ LEVANTANDO EL SERVIDOR Y NO EN PROCESO ═══
 *
 * Porque es un patrón de fallo que esta casa ya tiene apuntado dos veces: VERDE
 * EN PROCESO, ROTO AL ARRANCAR. El §2.2 del diseño lo cuenta con boardgame.io
 * —un `import` que funciona bajo `tsx` y revienta con Node— y el propio
 * repositorio tuvo el caso con las altas de juegos que se perdían según por qué
 * ruta se importara un módulo.
 *
 * Aquí eso no es teórico: `routes/arcade.ts` va montado DELANTE de `requireAuth`,
 * y comprobar eso en proceso es imposible por construcción — no hay `requireAuth`
 * en proceso. Si algún día alguien lo mueve detrás del guardián, el único sitio
 * donde se ve es una petición HTTP sin credenciales.
 *
 * ═══ QUÉ SE COMPRUEBA, Y POR QUÉ ESTÁ CADA COSA ═══
 *
 *  1. ABRIR una mesa y UNIRSE con el código. Sin taller, sin cuenta, sin
 *     contraseña de la casa: el primer jugador genera la mesa.
 *  2. ACTUAR SIN ASIENTO se rechaza. Es la puerta.
 *  3. UN `rev` RANCIO al MOVER se rechaza. Es el control de concurrencia.
 *  4. UN `rev` RANCIO al LEER **no** se rechaza y devuelve el estado completo.
 *     Es el punto 4 de «La Larga»: alguien que volvió del trabajo con la
 *     revisión de hace tres días no es un móvil manipulado.
 *  5. UN PLAZO VENCE POR LA LECTURA, sin que nadie actúe. Es el §5.4 entero.
 *  6. Y VENCE TAMBIÉN CON UNA ESPERA APARCADA, en mucho menos de los
 *     veinticinco segundos del sondeo. Eso es el sexto verbo, y sin él esta
 *     comprobación tarda veinticinco segundos en vez de tres.
 *  7. PRESENCIA ≠ PARTICIPACIÓN: a quien no está conectado le sigue tocando.
 *  8. LA MESA PERSISTE a que el proceso muera y vuelva.
 *  9. `loSecreto` DE VERDAD: ningún valor secreto aparece donde no debe.
 * 10. Y un manifiesto con `secretos: true` sin proyección o sin `loSecreto` NO
 *     DEJA ARRANCAR AL SERVIDOR.
 *
 * Y CINCO QUE ENTRARON DESPUÉS, cada una porque algo pasaba en verde mientras
 * fallaba. Están dichas aparte a propósito: son las que este comprobador NO
 * tenía, y la lista de arriba se escribió creyendo que bastaba.
 *
 * 11. EL PLAZO NO SE APAGA MANDANDO RUIDO. Las dos comprobaciones de plazo de la
 *     lista de arriba miden el vencimiento con NADIE moviendo, así que las dos
 *     pasaban mientras una petición por plazo desde cualquier asiento lo apagaba
 *     indefinidamente.
 * 12. EL PREFIJO `arcade:` ESTÁ CERRADO. Un sentado mandaba `arcade:tic` y le
 *     pasaba el turno a otro; repitiéndolo jugaba él solo la partida de cuatro.
 * 13. UN MOVIMIENTO QUE EL JUEGO IGNORA NO DEJA RASTRO: ni revisión, ni diario,
 *     ni escritura.
 * 14. UNA REVISIÓN ADELANTADA SE RESINCRONIZA. Con `desde` mayor que el de la
 *     mesa, la lectura contestaba 204 para siempre y la pantalla se quedaba
 *     muerta sin ningún error.
 * 15. UN ALMACÉN QUE NO PUEDE ESCRIBIR SE DICE, y no se contesta «hecho».
 *
 * Y UNA DECIMOSEXTA, que entró todavía después y por el mismo motivo que las
 * cinco de arriba:
 *
 * 16. LOS TRES ARCADES DE SERVIDOR, Y NO SÓLO LA RONDA. Este fichero se escribió
 *     con dos arcades instalados y se quedó igual con cuatro: Riberas —el único
 *     cuya proyección lleva dentro un TABLERO entero y calculado, que es la
 *     superficie más ancha que publica ningún juego de esta casa— no aparecía ni
 *     una vez, mientras la frase de cierre de aquí abajo se leía como si cubriera
 *     todo. Ahora se abre su mesa, se juega leyendo el tablero que baja, se le
 *     rechaza un `rev` rancio y se vigilan sus fichas por el cable. Y la línea del
 *     catálogo, que decía «los dos arcades instalados» y comprobaba dos `includes`
 *     con cuatro instalados, se contrasta contra el registro.
 *
 * ═══ LA PARTE QUE NO PUEDE IR POR HTTP, Y POR QUÉ NO ES UNA TRAMPA ═══
 *
 * `loSecreto(estado)` necesita EL ESTADO, y el estado no sale por la red: sale
 * la proyección, que es justamente lo que se está comprobando. Un servidor que
 * expusiera el estado entero para poder comprobarlo abriría el agujero que la
 * comprobación existe para cerrar.
 *
 * Así que la comprobación se hace por los dos lados, y las dos mitades son
 * distintas y hacen falta las dos:
 *
 *   · EN PROCESO, contra el estado de verdad: se juegan partidas enteras a
 *     través del MISMO árbitro que usa el servidor, y en cada revisión se llama
 *     a `loSecreto` y se comprueba el contrato. Con vacuna: una proyección
 *     envenenada tiene que ponerlo rojo.
 *   · POR LA RED, sin estado ninguno: cada asiento cuenta cuál es su mano —eso
 *     sí sale, en `miMano`, porque es suya— y se comprueba que NINGUNA de esas
 *     cartas aparece en lo que se les mandó a los otros tres ni al espectador,
 *     en NINGUNA revisión de la partida. Eso es una comprobación de lo que de
 *     verdad viajó por el cable, y no depende de creerse nada del servidor.
 *
 * ═══ LA TRAMPA QUE «LA FRENTE» DEJÓ ANOTADA, Y QUE AQUÍ SE RESPETA ═══
 *
 * El contrato de `loSecreto` dice «los valores que jamás pueden aparecer en la
 * proyección de OTRO ASIENTO», y la cabecera de `frente.ts` avisa de que un
 * comprobador escrito pensando solo en juegos de mano oculta —«el secreto no
 * puede aparecer en NINGUNA proyección salvo la de su dueño»— pondría La Frente
 * en rojo, y el rojo estaría MAL: allí el ESPECTADOR es la sala y tiene que ver
 * la palabra.
 *
 * La formulación que sirve para los dos, y la que está escrita aquí abajo, es:
 *
 *     NINGÚN VALOR SECRETO PUEDE APARECER EN LA VISTA DE MÁS DE UN ASIENTO.
 *
 * La Frente da cero apariciones —ningún asiento ve la palabra—, La Ronda da una
 * por carta —su dueño— y una proyección que sea la identidad da cuatro. Y el
 * espectador se cuenta aparte, porque no es un asiento: en La Ronda no puede ver
 * nada y en La Frente tiene que verlo.
 *
 * Y LA SEGUNDA TRAMPA, la de los valores de poca entropía: esta comprobación es
 * de APARICIÓN, así que solo es sólida para valores distinguibles. Por eso las
 * cartas de La Ronda son `'espadas-10'` y no el número 10, y por eso el azar
 * entra entero como objeto en vez de como dos números sueltos. Lo que no es
 * distinguible se defiende cerrando el juego de campos de la vista, que es lo
 * que hace la comprobación de la forma de la vista, aquí abajo.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { canonico } from '../../shared/mecanicas/canonico';
/*
 * EL AZAR DE LA PLATAFORMA, Y NUNCA `Math.random`.
 *
 * El bucle que juega a Riberas aquí abajo elige entre lo que el tablero le ofrece,
 * y elegir es sortear. Sorteando con `Math.random` este comprobador dejaría de ser
 * reejecutable: dos ejecuciones jugarían dos partidas distintas, un rojo no se
 * podría reproducir, y la comprobación de reejecución —que compara el estado final
 * contra el que sale de reejecutar el diario— estaría comparando dos partidas que
 * no son la misma. Se siembra con la semilla de la mesa, que está escrita ahí
 * abajo y no cambia.
 */
import { enteroEntre, sembrar } from '../../shared/mecanicas/azar';
import type { Azar } from '../../shared/mecanicas/azar';
import {
  arcadesInstalados,
  ESPECTADOR,
  loSecretoDe,
  opcionesDeArcade,
  reejecutarEn,
  registrarProyeccion,
  vistaDeAsiento,
  olvidarFinal,
  registrarFinal,
  hayFinal,
} from '../../shared/arcade';
import type { ArcadeId, AsientoId, ManifiestoDeArcade, QuienMira } from '../../shared/arcade';
/*
 * EL ALTA DE LOS ARCADES, ESTÁTICA Y LA PRIMERA.
 *
 * La mitad de este fichero corre EN PROCESO contra el mismo árbitro que usa el
 * servidor, y `abrirMesa` se niega a abrir una mesa de un arcade que no esté
 * instalado. Con un `await import(...)` a mitad de fichero, las primeras
 * partidas fallarían con `ArcadeNoInstalado` — y lo harían por el orden de las
 * líneas, no por nada que se esté comprobando.
 */
import {
  EMPEZAR as EMPEZAR_LA_FRENTE,
  partidaNueva as partidaNuevaDeLaFrente,
  proyectarLaRonda,
  seAcaboLaRonda,
  proyectarRiberas,
  TICS_PARA_COLOCARSE,
} from '../../shared/arcade/juegos';
import type { MesaEnCurso } from '../src/arcade/mesas';
import { abrirMesa, avanzarElReloj, jugar } from '../src/arcade/arbitro';
import type { Mesa } from '../src/arcade/arbitro';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');

/**
 * UN PUERTO QUE EL SISTEMA DICE QUE ESTÁ LIBRE, y no uno elegido al azar.
 *
 * ═══ POR QUÉ NO `6600 + random(200)`, QUE ES LO QUE HACEN LOS DEMÁS ═══
 *
 * Porque este comprobador levanta CUATRO servidores —el principal, el que
 * reemplaza al principal después de matarlo, y los tres del bloque de arranque—
 * y con puertos al azar dos de ellos chocan de vez en cuando. Cuando chocan, el
 * segundo no arranca y el comprobador se pone rojo diciendo «el servidor no
 * arrancó», que es un rojo FALSO y de la peor clase: intermitente, sin relación
 * con lo que se ha tocado, y que enseña a volver a correr la batería en vez de
 * a leerla. Pasó en la segunda ejecución de este fichero.
 *
 * Se le pide uno al sistema y se suelta enseguida. Queda una ventana mínima
 * entre soltarlo y que lo tome el servidor, y es infinitamente más estrecha que
 * la de un rango de doscientos compartido entre cuatro procesos y con las
 * ejecuciones anteriores todavía muriéndose.
 */
async function puertoLibre(): Promise<number> {
  const { createServer } = await import('node:net');
  return new Promise<number>((resolver, rechazar) => {
    const sonda = createServer();
    sonda.once('error', rechazar);
    sonda.listen(0, '127.0.0.1', () => {
      const donde = sonda.address();
      const puerto = typeof donde === 'object' && donde !== null ? donde.port : 0;
      sonda.close(() => resolver(puerto));
    });
  });
}

const PUERTO = await puertoLibre();
const BASE = `http://127.0.0.1:${PUERTO}/api`;

// ---------------------------------------------------------------------------
// El armazón
// ---------------------------------------------------------------------------

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola =
    detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 500)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

interface Respuesta {
  estado: number;
  datos: any;
  ms: number;
}

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; llave?: string | null } = {},
): Promise<Respuesta> {
  const desde = Date.now();
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.llave ? { 'x-asiento': opciones.llave } : {}),
    },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
  });
  const texto = await r.text();
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    datos = texto;
  }
  return { estado: r.status, datos, ms: Date.now() - desde };
}

/**
 * Lo último que dijo el servidor por sus salidas.
 *
 * Se guarda para poder meterlo en el mensaje si no arranca. Sin esto, un fallo
 * de arranque se ve como «el servidor no arrancó» a secas, y quien lo lea tiene
 * que reproducirlo a mano para enterarse de si era un puerto ocupado o un import
 * roto — media hora por un dato que el proceso ya había dicho en voz alta.
 */
let loQueDijoElServidor = '';

async function esperarAlServidor(): Promise<void> {
  for (let i = 0; i < 200; i++) {
    try {
      const r = await fetch(`${BASE}/salud`);
      if (r.ok) return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `el servidor no arrancó en el puerto ${PUERTO}. Dijo:\n${loQueDijoElServidor.slice(-1500)}`,
  );
}

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// PRIMERA MITAD · EN PROCESO, CONTRA EL ESTADO DE VERDAD
//
// Es donde vive la comprobación de `loSecreto`, porque necesita el estado y el
// estado no sale por la red. Se juega con el MISMO árbitro que usa el servidor,
// no con una copia de las reglas.
// ---------------------------------------------------------------------------

const RONDA = 'la-ronda';
const FRENTE = 'frente';
const RIBERAS = 'riberas';

/**
 * ═══ POR QUÉ RIBERAS ENTRÓ AQUÍ, Y POR QUÉ NO ESTABA ═══
 *
 * Este fichero se escribió en la fase 2, con dos arcades instalados, y la fase 4 lo
 * dejó tal cual —byte a byte— mientras se afirmaba que `verify:mesa` cubría los
 * tres arcades de servidor. No los cubría: `RIBERAS` no aparecía ni una vez, y la
 * frase de cierre —«la mano de cada cual no sale de su móvil, comprobado sobre lo
 * que de verdad viajó por el cable»— era cierta para La Ronda y no decía nada del
 * juego de aquella fase.
 *
 * Y no era un hueco cualquiera. Riberas es el ÚNICO arcade cuya proyección lleva
 * dentro un TABLERO ENTERO y calculado —decenas de caras, líneas y nudos, con
 * rótulos y ayudas de texto libre—, y ese objeto es justo lo que baja por el cable.
 * El tablero se compone a partir de la vista Y de `opciones()`, o sea por dos
 * caminos, y una fuga por el segundo no la delataría el juego de campos cerrado de
 * la vista. Nadie abría una mesa de Riberas por HTTP, nadie la sondeaba, nadie le
 * rechazaba un `rev` rancio y nadie ejercía su proyección por el camino del
 * registro.
 *
 * Lo que sigue lo cierra por los dos lados, igual que La Ronda: en proceso contra
 * el estado de verdad con `loSecreto`, y por la red contra lo que de verdad viajó.
 */

/** Un toque del tablero declarado: el movimiento que el mueble mandaría al pulsarlo. */
interface Toque {
  tipo: string;
  carga: unknown;
}

/**
 * TODOS LOS MOVIMIENTOS QUE ESTE TABLERO OFRECE, sacados del TABLERO DECLARADO y
 * no del juego.
 *
 * Es a propósito, y es la misma doctrina que `deQuienEsElTurno` aquí abajo: este
 * comprobador dirige la partida como la dirige un cliente, leyendo lo que le
 * mandaron. Si tuviera que importar `opcionesDeRiberas` para saber qué se puede
 * hacer, estaría comprobando la implementación; leyendo el tablero comprueba además
 * que lo que VIAJA basta para jugar, que es media promesa del mueble genérico.
 */
function toquesDelTablero(vista: unknown): Toque[] {
  const tablero = (vista as { tablero?: unknown }).tablero;
  if (typeof tablero !== 'object' || tablero === null) return [];
  const t = tablero as Record<string, unknown>;
  const toques: Toque[] = [];
  for (const lista of ['nudos', 'lineas', 'caras', 'acciones']) {
    const piezas = t[lista];
    if (!Array.isArray(piezas)) continue;
    for (const pieza of piezas) {
      const toque = (pieza as { toque?: unknown }).toque;
      if (typeof toque !== 'object' || toque === null) continue;
      const m = toque as { tipo?: unknown; carga?: unknown };
      if (typeof m.tipo !== 'string') continue;
      toques.push({ tipo: m.tipo, carga: m.carga });
    }
  }
  return toques;
}

/*
 * ═══ EL BUCLE QUE NO JUGABA, Y POR QUÉ SU VERDE NO VALÍA NADA ═══
 *
 * Hasta aquí había una sola función —`unToqueDelTablero(vista, saltar)`— que
 * devolvía EL PRIMER toque del tablero que no fuera «pasar». Es la política más
 * corta que se puede escribir y es la peor: hace lo que diga el ORDEN de la lista.
 *
 * Medido reproduciendo su forma exacta, por semilla y en sus cuarenta vueltas:
 *
 *     1 empezar · 6 fundar · 6 alzar · UN tirar · VEINTISÉIS ofrecer
 *     Tres tiradas en las tres semillas. CERO sietes. Ninguna partida terminaba.
 *
 * El motivo es de una línea: en cuanto se tira una vez, `tirado` pasa a `true` y
 * `tirar` desaparece de las opciones; la primera que queda en `acciones` es
 * `ofrecer`, que no gasta el turno ni cambia de quién es. El bucle se quedaba
 * proponiendo trueques al mismo colono hasta agotar el presupuesto de vueltas, y
 * las dos afirmaciones que había —`revisiones > 40` y `conFichas > revisiones / 2`—
 * salían VERDES exactamente igual, porque proponer trueques también sube la
 * revisión y también hay fichas repartidas mientras se propone. Un comprobador
 * atascado que se felicita a sí mismo: el cuarto caso de esta casa.
 *
 * ═══ POLÍTICA O AZAR UNIFORME: POR QUÉ POLÍTICA, Y CUÁL ═══
 *
 * Un bucle que sortease uniformemente entre los toques del tablero cubre más
 * caminos, pero en este juego no llega: en un turno cualquiera de media partida el
 * tablero ofrece del orden de doscientos toques y la inmensa mayoría son
 * `ofrecer:*` y `vereda:*`. El azar uniforme se comería el presupuesto proponiendo
 * trueques —o sea, EL MISMO ATASCO que se está arreglando, sólo que más despacio y
 * más difícil de leer—. Una política llega al final, aunque sólo por su camino.
 *
 * Así que política. Con dos condiciones, que son las que separan ésta de la que
 * falló:
 *
 *   · NO ES «EL PRIMERO DE LA LISTA». Las jugadas se agrupan por FAMILIA y las
 *     familias van ordenadas por cuánto mueven la partida — tirar antes que
 *     construir, construir antes que trocar, trocar antes que pasar—. El orden en
 *     que el juego devuelve sus opciones deja de decidir nada.
 *   · DENTRO DE LA FAMILIA SE SORTEA, con el azar sembrado de la mesa. Si no, el
 *     bucle fundaría siempre en el primer vértice del recorrido canónico y las
 *     tres partidas serían tres veces el mismo camino.
 *
 * Y hay un tope de ofertas por turno (`TOPE_DE_OFERTAS`) porque proponer un trueque
 * no gasta el turno: sin tope, la familia «ofrecer» vuelve a estar disponible en
 * cuanto se resuelve la anterior y el bucle se atasca otra vez, por una puerta
 * distinta. `pasar` es lo último y siempre está, que es lo que garantiza que el
 * turno acaba.
 */
const TOPE_DE_OFERTAS = 2;

/** Los movimientos de Riberas que este bucle nombra. Nada más que sus etiquetas. */
const R = {
  empezar: 'riberas:empezar',
  fundar: 'riberas:fundar',
  alzar: 'riberas:alzar',
  tirar: 'riberas:tirar',
  ofrecer: 'riberas:ofrecer',
  aceptar: 'riberas:aceptar',
  rechazar: 'riberas:rechazar',
  pasar: 'riberas:pasar',
  comprar: 'riberas:comprar',
  revelar: 'riberas:revelar',
} as const;

/** ¿Es este toque un `alzar` de esta pieza? La pieza va dentro de la carga. */
function alza(toque: Toque, que: string): boolean {
  return toque.tipo === R.alzar && (toque.carga as { que?: unknown } | null)?.que === que;
}

/** Las cuatro cartas que se JUEGAN. Los títulos no se juegan: se revelan. */
const CARTAS_QUE_SE_JUEGAN: readonly string[] = [
  'riberas:guardia',
  'riberas:ano-bueno',
  'riberas:acaparamiento',
  'riberas:dos-veredas',
];

/**
 * LAS FAMILIAS, de la que más mueve la partida a la que menos.
 *
 * El nombre de cada una sale en el recuento del final, y ese recuento es lo que
 * hace falsables las afirmaciones: sin él, «se juega de verdad» volvería a ser una
 * frase. `ofrecer` y `pasar` NO están aquí: van aparte porque una tiene tope y la
 * otra es la salida de emergencia.
 */
const FAMILIAS: ReadonlyArray<{ nombre: string; es: (t: Toque) => boolean }> = [
  { nombre: 'empezar', es: (t) => t.tipo === R.empezar },
  /* Tirar primero: es lo único que hace correr el reloj del juego y traer cosecha. */
  { nombre: 'tirar', es: (t) => t.tipo === R.tirar },
  { nombre: 'revelar', es: (t) => t.tipo === R.revelar },
  { nombre: 'torre', es: (t) => alza(t, 'torre') },
  { nombre: 'fundar', es: (t) => t.tipo === R.fundar },
  { nombre: 'comprar', es: (t) => t.tipo === R.comprar },
  { nombre: 'jugar-carta', es: (t) => CARTAS_QUE_SE_JUEGAN.includes(t.tipo) },
  { nombre: 'vereda', es: (t) => alza(t, 'vereda') },
];

/**
 * QUÉ JUGARÍA AQUÍ ESTE COLONO, leyendo su tablero y nada más.
 *
 * Devuelve también el azar avanzado, porque el azar de esta casa es un valor y no
 * un objeto que muta: quien no encadene el devuelto sortea siempre lo mismo.
 */
function laJugadaDelTablero(
  vista: unknown,
  azar: Azar,
  puedeOfrecer: boolean,
): { jugada: Toque | null; familia: string; azar: Azar } {
  const toques = toquesDelTablero(vista);
  for (const familia of FAMILIAS) {
    const cabe = toques.filter(familia.es);
    if (cabe.length === 0) continue;
    const tirada = enteroEntre(azar, 0, cabe.length - 1);
    return { jugada: cabe[tirada.valor] as Toque, familia: familia.nombre, azar: tirada.azar };
  }
  if (puedeOfrecer) {
    const ofertas = toques.filter((t) => t.tipo === R.ofrecer);
    if (ofertas.length > 0) {
      const tirada = enteroEntre(azar, 0, ofertas.length - 1);
      return { jugada: ofertas[tirada.valor] as Toque, familia: 'ofrecer', azar: tirada.azar };
    }
  }
  const pasar = toques.find((t) => t.tipo === R.pasar);
  if (pasar !== undefined) return { jugada: pasar, familia: 'pasar', azar };
  return { jugada: null, familia: 'nada', azar };
}

/**
 * QUÉ CONTESTA A UN TRUEQUE QUIEN NO TIENE EL TURNO.
 *
 * Está aparte del resto de la política por una razón que es la mitad del valor de
 * este bucle: contestar es LO ÚNICO que este juego le ofrece a alguien que no le
 * toca, y el bucle viejo no lo ejercía nunca porque sólo miraba el tablero de quien
 * tenía el turno. Sin esto no se acepta un solo trueque, y `contestar` —donde vive
 * el «sólo si» de verdad del §5 bis, el que valida contra el almacén del oferente,
 * que no está en mi vista— no se recorría jamás.
 *
 * Se acepta tres de cada cuatro veces y se rechaza una, sorteado: hacen falta los
 * dos caminos, y aceptar siempre dejaría `contestar(…, false)` sin recorrer.
 * Cuando no se puede aceptar —no tengo lo que se me pide, así que el juego no me
 * ofrece más que rechazar— se rechaza, que es lo único que hay.
 */
function laRespuestaAlTrueque(
  vista: unknown,
  azar: Azar,
): { jugada: Toque | null; familia: string; azar: Azar } {
  const toques = toquesDelTablero(vista);
  const acepta = toques.filter((t) => t.tipo === R.aceptar);
  const rechaza = toques.filter((t) => t.tipo === R.rechazar);
  if (acepta.length === 0 && rechaza.length === 0) return { jugada: null, familia: 'nada', azar };
  const dado = enteroEntre(azar, 0, 3);
  const lista = dado.valor === 0 || acepta.length === 0 ? rechaza : acepta;
  if (lista.length === 0) return { jugada: null, familia: 'nada', azar: dado.azar };
  const cual = enteroEntre(dado.azar, 0, lista.length - 1);
  const jugada = lista[cual.valor] as Toque;
  return {
    jugada,
    familia: jugada.tipo === R.aceptar ? 'aceptar' : 'rechazar',
    azar: cual.azar,
  };
}

/** ¿Hay algún trueque esperando respuesta? Se lee de la vista pública. */
function hayTruequeAbierto(espectador: unknown): boolean {
  const tratos = (espectador as { tratos?: unknown }).tratos;
  if (!Array.isArray(tratos)) return false;
  return tratos.some((t) => (t as { estado?: unknown }).estado === 'propuesta');
}

/** Un contador de familias, que es lo que convierte «se juega» en un número. */
function apuntar(cuenta: Map<string, number>, familia: string): void {
  cuenta.set(familia, (cuenta.get(familia) ?? 0) + 1);
}

/** Cuántas veces salió esta familia. Cero si no salió ninguna. */
function cuantas(cuenta: Map<string, number>, familia: string): number {
  return cuenta.get(familia) ?? 0;
}

/**
 * LA COMPROBACIÓN DEL CONTRATO, tal y como está escrito.
 *
 * Devuelve los reproches, vacío si todo bien. Para cada valor de `loSecreto`
 * cuenta en cuántas vistas DE ASIENTO aparece, y exige que no sea más de una.
 *
 * ═══ SE COMPARAN CADENAS CANÓNICAS, Y NO OBJETOS ═══
 *
 * Por dos razones que van juntas. La primera es que así vale para cualquier valor
 * —una cadena, un número, un objeto entero— sin escribir un comparador por forma.
 * La segunda es la que de verdad importa: lo que se busca es lo que VIAJARÍA, y lo
 * que viaja es texto. Comparando estructuras se podría dar por bueno un secreto que
 * sale dentro de otro campo con otro nombre.
 *
 * La forma canónica de una cadena lleva sus comillas, y eso arregla solo el
 * problema de los prefijos: `"oros-1"` no aparece dentro de `"oros-10"`, porque la
 * comilla de cierre no cuadra. Sin las comillas, media baraja daría falsos
 * positivos contra la otra media.
 *
 * ═══ Y CADA COSA SE CANONIZA UNA VEZ, QUE NO ES UN ADORNO ═══
 *
 * Esto se escribió con un ayudante —`aparece(secreto, vista)`— que serializaba LA
 * VISTA ENTERA una vez POR SECRETO. Con ciento cincuenta fichas repartidas, que es
 * media partida de Riberas, eso son seiscientas serializaciones de un objeto que
 * lleva el tablero dentro, en cada revisión.
 *
 * Mientras el bucle de Riberas se atascaba en cuarenta vueltas nadie lo notaba. Con
 * el bucle que juega de verdad —tres partidas enteras, más de mil revisiones— ese
 * cuadrado convierte un comprobador de veinticinco segundos en uno que nadie vuelve
 * a correr, y un comprobador que no se corre no comprueba nada. La cuenta es la
 * misma; lo único que cambió es que se saca fuera del bucle.
 *
 * `permitidoEnElEspectador` es lo que separa a La Frente de todos los demás y
 * está aquí como parámetro y no como excepción: la sala de La Frente es un
 * espectador y TIENE que ver la palabra. Un `if (arcade === 'frente')` dentro de
 * la comprobación sería la primera de las banderas que acaban convirtiendo un
 * comprobador genérico en una tabla de casos particulares.
 */
function reprochesDeSecretos(
  arcade: ArcadeId,
  estado: unknown,
  asientos: readonly AsientoId[],
  permitidoEnElEspectador: boolean,
): string[] {
  const reproches: string[] = [];
  const secretos = loSecretoDe(arcade, estado);
  if (secretos.length === 0) return reproches;

  /*
   * ═══ SE MIRA LA VISTA Y TAMBIÉN LAS OPCIONES, QUE VIAJAN AL LADO ═══
   *
   * Desde la fase 5, lo que se le manda a un asiento no es sólo su proyección:
   * `VistaDeMesa.opciones` lleva lo que el juego contesta a «qué puedes hacer», con
   * el movimiento ya montado dentro, y eso sale por la red exactamente igual. Un
   * comprobador que sólo mirara la vista dejaría media superficie sin vigilar
   * justo el día que esa superficie se estrenó.
   *
   * Por construcción no debería poder filtrar —`opciones()` recibe LA VISTA y
   * jamás el estado, así que no tiene de dónde sacar lo tapado— y por eso mismo
   * conviene medirlo: una garantía «por construcción» que nadie comprueba es una
   * garantía que deja de serlo el día que alguien cambie la firma.
   */
  const loQueSeLeManda = (quien: QuienMira): string => {
    const vista = vistaDeAsiento(arcade, estado, quien);
    return canonico({ vista, opciones: opcionesDeArcade(arcade, vista, quien) });
  };

  const vistas = new Map<QuienMira, string>();
  for (const asiento of asientos) vistas.set(asiento, loQueSeLeManda(asiento));
  const delEspectador = loQueSeLeManda(ESPECTADOR);

  for (const secreto of secretos) {
    const buscado = canonico(secreto);
    const donde: AsientoId[] = [];
    for (const asiento of asientos) {
      if ((vistas.get(asiento) as string).includes(buscado)) donde.push(asiento);
    }
    if (donde.length > 1) {
      reproches.push(
        `${buscado.slice(0, 40)} aparece en la vista de ${donde.length} asientos ` +
          `(${donde.join(', ')}) y solo puede aparecer en la de su dueño`,
      );
    }
    if (!permitidoEnElEspectador && delEspectador.includes(buscado)) {
      reproches.push(
        `${buscado.slice(0, 40)} aparece en la vista del ESPECTADOR, que no tiene asiento`,
      );
    }
  }
  return reproches;
}

/** Los cuatro asientos de las partidas en proceso. */
const CUATRO: AsientoId[] = ['a-ana', 'a-bruno', 'a-carla', 'a-diego'];

/**
 * Juega una partida entera de La Ronda en proceso y comprueba en CADA revisión.
 *
 * Devuelve cuántas revisiones se han examinado, para que el recuento de arriba
 * pueda ponerse rojo si un día esto deja de jugar nada — que es la forma en que
 * un comprobador se convierte en un fichero que felicita a todo el mundo.
 */
function partidaEnProceso(semilla: number, conVencimientos: boolean): number {
  let mesa: Mesa = abrirMesa({
    id: `proceso-${semilla}`,
    arcade: RONDA,
    semilla,
    asientos: CUATRO,
  });
  let revisiones = 0;

  const revisar = (): void => {
    revisiones++;
    const reproches = reprochesDeSecretos(RONDA, mesa.estado, CUATRO, false);
    comprobar(
      `semilla ${semilla}, rev ${mesa.rev}: ningún secreto de La Ronda se escapa`,
      reproches.length === 0,
      reproches,
    );
  };

  revisar();
  mesa = jugar(mesa, { quien: CUATRO[0] as AsientoId, movimiento: { tipo: 'ronda:empezar' }, rev: mesa.rev });
  revisar();

  let vueltas = 0;
  while (!seAcabo(mesa) && vueltas < 60) {
    vueltas++;
    /*
     * Uno de cada cuatro turnos se deja vencer en vez de jugarlo. Es la forma de
     * que el camino del tic —que es media mecánica de esta fase— pase por la
     * misma comprobación de secretos que el camino normal, en vez de quedarse
     * como el que nadie mira.
     */
    if (conVencimientos && vueltas % 4 === 0) {
      mesa = avanzarElReloj(mesa);
      revisar();
      continue;
    }
    const turno = deQuienEsElTurno(mesa);
    if (turno === null) break;
    const carta = unaCartaDe(mesa, turno);
    if (carta === null) break;
    mesa = jugar(mesa, {
      quien: turno,
      movimiento: { tipo: 'ronda:jugar', carga: { carta } },
      rev: mesa.rev,
    });
    revisar();
  }

  comprobar(`semilla ${semilla}: la partida TERMINA`, seAcabo(mesa), {
    vueltas,
    estado: mesa.estado,
  });
  return revisiones;
}

/*
 * ═══ POR QUÉ ESTE FICHERO SE ASOMA AL ESTADO CON TIPOS SUELTOS ═══
 *
 * Porque el estado es OPACO para todo lo que no sea el juego, y este comprobador
 * está del lado del servidor. Podría importar `EstadoDeLaRonda` de
 * `shared/arcade/juegos` y quedaría más bonito; se hace así a propósito, para
 * que la parte que dirige la partida se parezca a lo que hace un cliente —leer
 * de la vista— y no a lo que hace el juego. Si un día la comprobación necesitara
 * los tipos internos para funcionar, sería señal de que está comprobando la
 * implementación en vez del comportamiento.
 */
function deQuienEsElTurno(mesa: Mesa): AsientoId | null {
  const vista = vistaDeAsiento(RONDA, mesa.estado, ESPECTADOR) as { turnoDe?: unknown };
  return typeof vista.turnoDe === 'string' ? vista.turnoDe : null;
}

function unaCartaDe(mesa: Mesa, asiento: AsientoId): string | null {
  const vista = vistaDeAsiento(RONDA, mesa.estado, asiento) as { miMano?: unknown };
  const mano = Array.isArray(vista.miMano) ? vista.miMano : [];
  const primera = mano[0];
  return typeof primera === 'string' ? primera : null;
}

function seAcabo(mesa: Mesa): boolean {
  const vista = vistaDeAsiento(RONDA, mesa.estado, ESPECTADOR) as { momento?: unknown };
  return vista.momento === 'terminada';
}

// ---------------------------------------------------------------------------

console.log('\nLa mesa en línea de la Sala de Arcade\n');

paso('En proceso: `loSecreto` contra el estado de verdad, con el mismo árbitro');

let revisionesExaminadas = 0;
for (const semilla of [1, 7, 12345, 987654321, 2 ** 31]) {
  revisionesExaminadas += partidaEnProceso(semilla, semilla % 2 === 1);
}
console.log(`  ${revisionesExaminadas} revisiones examinadas en cinco partidas`);

paso('En proceso: tres partidas ENTERAS de Riberas, con su tablero dentro de la proyección');

/*
 * ═══ LA MITAD QUE FALTABA, Y QUÉ AÑADE SOBRE LA DE LA RONDA ═══
 *
 * `reprochesDeSecretos` es la misma función que acaba de dar verde a cinco partidas
 * de La Ronda, y aquí se le da un juego cuya proyección lleva un tablero de decenas
 * de figuras con rótulos y ayudas de texto libre. Es el caso que de verdad la pone
 * a prueba: en La Ronda lo que sale son campos; aquí sale además un dibujo entero
 * compuesto a partir de `opciones()`, y una ficha de otro colono que se colara en el
 * rótulo de un botón viajaría igual de lejos que si estuviera en un campo.
 *
 * Se juega LEYENDO EL TABLERO, o sea como jugaría un cliente, y en cada revisión se
 * mira. La colocación es donde más piezas cambian de mano por movimiento, así que
 * es donde una fuga tiene más sitios por los que salir.
 *
 * ═══ Y AHORA SE JUEGA HASTA EL FINAL, QUE ES LO QUE ANTES NO PASABA ═══
 *
 * Este bloque llevaba un bucle de cuarenta vueltas que se quedaba en el primer
 * turno proponiendo trueques —la cuenta exacta está en la cabecera de `FAMILIAS`,
 * arriba— y sus dos afirmaciones salían verdes igual. O sea que la superficie más
 * ancha que publica ningún juego de esta casa se vigilaba sobre trece movimientos
 * de colocación, una tirada, y veintiséis botones de trueque. Nada de lo que la
 * mitad interesante del juego mete en el tablero —las cartas de la mano, los
 * títulos revelados, los rótulos de los trueques cerrados, la cosecha de un número
 * que sale por sexta vez— llegaba a pintarse nunca.
 *
 * Ahora las tres partidas se juegan hasta que hay ganador, y lo que se afirma es
 * una cuenta por familia de jugada: se puede leer, se puede desmentir, y el atasco
 * la pone roja por cinco sitios distintos.
 */
{
  const TRES: AsientoId[] = ['a-ana', 'a-bruno', 'a-carla'];
  let revisiones = 0;
  let conFichas = 0;

  /*
   * EL PRESUPUESTO DE VUELTAS. La partida más larga de las tres semillas de aquí
   * abajo gasta 586, así que esto es holgura y no un corte disimulado: si un día
   * una partida se lo comiera entero, la afirmación «las tres partidas TERMINAN»
   * se pondría roja en vez de dejarla a medias en silencio.
   */
  const TOPE_DE_VUELTAS = 1500;

  interface Partida {
    mesa: Mesa;
    /** Cuántas veces salió cada familia de jugada. Es el recuento que se afirma. */
    cuenta: Map<string, number>;
    sietes: number;
    vueltas: number;
    /** Por qué se cortó antes de terminar, o `null` si acabó como debía. */
    corte: string | null;
  }

  /**
   * JUEGA UNA PARTIDA ENTERA DE RIBERAS, leyendo el tablero que baja.
   *
   * `trasCadaMovimiento` es lo que hace este bucle valer para dos cosas distintas
   * sin duplicarlo: la primera pasada mira los secretos en cada revisión, y la
   * segunda —la de la reejecución— no mira nada y sólo quiere el estado final.
   */
  const unaPartidaDeRiberas = (
    semilla: number,
    trasCadaMovimiento: (mesa: Mesa) => void,
  ): Partida => {
    let mesa: Mesa = abrirMesa({
      id: `riberas-${semilla}`,
      arcade: RIBERAS,
      semilla,
      asientos: TRES,
    });
    /* El azar del BUCLE, aparte del de la mesa y sembrado con la misma semilla. */
    let azar: Azar = sembrar(semilla);
    const cuenta = new Map<string, number>();
    let sietes = 0;
    let corte: string | null = null;
    let ofertasDelTurno = 0;
    let turnoContado = -1;
    /*
     * La tirada se lee en la vuelta SIGUIENTE y no justo después de tirar: la
     * proyección de Riberas lleva el tablero dentro y calcularla cuesta, así que
     * pedir una vista de más por movimiento es pedir mil de más por partida.
     */
    let faltaMirarLaTirada = false;
    let vueltas = 0;

    for (; vueltas < TOPE_DE_VUELTAS; vueltas++) {
      const espectador = vistaDeAsiento(RIBERAS, mesa.estado, ESPECTADOR) as {
        turnoDe?: unknown;
        momento?: unknown;
        turnosAbiertos?: unknown;
        ultimaTirada?: unknown;
      };
      if (espectador.momento === 'terminada') break;
      if (faltaMirarLaTirada) {
        faltaMirarLaTirada = false;
        if (espectador.ultimaTirada === 7) sietes++;
      }
      if (espectador.turnosAbiertos !== turnoContado) {
        turnoContado = espectador.turnosAbiertos as number;
        ofertasDelTurno = 0;
      }

      /*
       * PRIMERO, QUIEN NO TIENE EL TURNO. Contestar a un trueque es lo único que
       * este juego le ofrece a alguien a quien no le toca, y mirarlo antes que el
       * turno es lo que hace que los trueques se cierren en vez de acumularse hasta
       * que caduquen solos al pasar.
       */
      let quien: AsientoId | null = null;
      let jugada: Toque | null = null;
      let familia = 'nada';
      if (hayTruequeAbierto(espectador)) {
        for (const asiento of TRES) {
          if (asiento === espectador.turnoDe) continue;
          const respuesta = laRespuestaAlTrueque(
            vistaDeAsiento(RIBERAS, mesa.estado, asiento),
            azar,
          );
          azar = respuesta.azar;
          if (respuesta.jugada === null) continue;
          quien = asiento;
          jugada = respuesta.jugada;
          familia = respuesta.familia;
          break;
        }
      }

      if (jugada === null) {
        quien = (typeof espectador.turnoDe === 'string' ? espectador.turnoDe : TRES[0]) as AsientoId;
        const elegida = laJugadaDelTablero(
          vistaDeAsiento(RIBERAS, mesa.estado, quien),
          azar,
          ofertasDelTurno < TOPE_DE_OFERTAS,
        );
        azar = elegida.azar;
        jugada = elegida.jugada;
        familia = elegida.familia;
        if (familia === 'ofrecer') ofertasDelTurno++;
      }

      if (jugada === null || quien === null) {
        corte = `el tablero de ${String(espectador.turnoDe)} no ofrece nada en «${String(espectador.momento)}»`;
        break;
      }

      const antes = mesa.estado;
      const revAntes = mesa.rev;
      mesa = jugar(mesa, { quien, movimiento: jugada, rev: mesa.rev });
      /*
       * ═══ UN BOTÓN MUDO ES UN FALLO, Y AQUÍ SE CAZA. MIRANDO EL ESTADO ═══
       *
       * El movimiento salió del propio tablero: si no cambia nada, el juego está
       * ofreciendo algo que su reductor rechaza, que es el fallo que la cabecera de
       * `opcionesDeTurno` describe como «una pieza encendida que no responde».
       *
       * Y se mira EL ESTADO y no la revisión, que es lo que ponía aquí y no podía
       * funcionar nunca: `aplicarMovimiento` sube `rev` y escribe en el diario
       * SIEMPRE, también cuando el reductor rechaza. Tiene que hacerlo —el diario es
       * lo que se reejecuta—, así que la revisión no distingue nada y esta guarda
       * llevaba de adorno desde que se escribió. La forma buena la dice el propio
       * árbitro en la cabecera de `Jugado.motivo`: comparar `mesa.estado` con el de
       * antes. Un rechazo devuelve EL MISMO OBJETO, así que basta la identidad.
       */
      if (mesa.estado === antes) {
        corte = `botón mudo: ${jugada.tipo} de ${quien} no cambió nada en la revisión ${revAntes}`;
        break;
      }
      if (jugada.tipo === R.tirar) faltaMirarLaTirada = true;
      apuntar(cuenta, familia);
      trasCadaMovimiento(mesa);
    }

    return { mesa, cuenta, sietes, vueltas, corte };
  };

  const total = new Map<string, number>();
  let sietes = 0;
  let terminadas = 0;
  const cortes: string[] = [];
  /* El diario de la primera semilla, para la comprobación de reejecución de abajo. */
  let elDiarioDeLaTres = '';

  for (const semilla of [3, 77, 20260901]) {
    const revisar = (mesa: Mesa): void => {
      revisiones++;
      /*
       * Se cuenta cuántas revisiones tenían algo que esconder. Sin este recuento,
       * una partida que no llegara a repartir el delta daría cero reproches sobre
       * cero secretos y saldría verde para siempre — el verde por conjunto vacío
       * que esta casa ya tiene apuntado tres veces.
       */
      if (loSecretoDe(RIBERAS, mesa.estado).length > 0) conFichas++;
      const reproches = reprochesDeSecretos(RIBERAS, mesa.estado, TRES, false);
      comprobar(
        `Riberas, semilla ${semilla}, rev ${mesa.rev}: ninguna ficha ajena en ninguna vista`,
        reproches.length === 0,
        reproches,
      );
    };

    revisiones++;
    const reprochesAlAbrir = reprochesDeSecretos(RIBERAS, undefined, TRES, false);
    comprobar(
      `Riberas, semilla ${semilla}, rev 0: ninguna ficha ajena en ninguna vista`,
      reprochesAlAbrir.length === 0,
      reprochesAlAbrir,
    );

    const partida = unaPartidaDeRiberas(semilla, revisar);
    if (semilla === 3) elDiarioDeLaTres = canonico(partida.mesa.diario);
    for (const [familia, veces] of partida.cuenta) {
      total.set(familia, (total.get(familia) ?? 0) + veces);
    }
    sietes += partida.sietes;
    if (partida.corte !== null) cortes.push(`semilla ${semilla}: ${partida.corte}`);

    const fin = vistaDeAsiento(RIBERAS, partida.mesa.estado, ESPECTADOR) as {
      momento?: unknown;
      ganadores?: unknown;
    };
    const acabo = fin.momento === 'terminada' && Array.isArray(fin.ganadores) && fin.ganadores.length > 0;
    if (acabo) terminadas++;
    comprobar(`Riberas, semilla ${semilla}: la partida TERMINA con ganador`, acabo, {
      momento: fin.momento,
      ganadores: fin.ganadores,
      vueltas: partida.vueltas,
      corte: partida.corte,
    });

    /*
     * ═══ Y REEJECUTADA DA LO MISMO, QUE ES LA MITAD QUE SE COMPRA CON LA PUREZA ═══
     *
     * El diario y el estado inicial —aquí ninguno: la mesa se abre vacía y el juego
     * construye lo suyo en `empezar`— bastan para reconstruir la partida byte a
     * byte. Vale la pena decir qué caza esto que no cace `verify:riberas`, que ya
     * reejecuta una partida suya: aquélla nace de un estado declarado a mano y con
     * los almacenes llenos; ésta nace de una mesa vacía y pasa por CUATROCIENTAS
     * tiradas de dados, dos docenas de compras del mazo y un centenar de trueques
     * aceptados. Todo eso gasta azar, y el azar es lo primero que se desincroniza.
     */
    const otraVez = reejecutarEn(RIBERAS, undefined, partida.mesa.diario);
    comprobar(
      `Riberas, semilla ${semilla}: reejecutar el diario da exactamente el mismo estado`,
      canonico(otraVez) === canonico(partida.mesa.estado),
      { movimientos: partida.mesa.diario.length },
    );
  }

  comprobar('ninguna partida de Riberas se cortó a medias', cortes.length === 0, cortes);
  comprobar('las tres partidas de Riberas terminan', terminadas === 3, { terminadas });

  /*
   * ═══ LO QUE SE AFIRMA AHORA, Y POR QUÉ ESTAS CIFRAS Y NO OTRAS ═══
   *
   * Las dos afirmaciones que había —«más de cuarenta revisiones» y «en la mayoría
   * había fichas»— las cumplía un bucle que sólo sabía proponer trueques. Siguen
   * abajo, porque miden algo real, pero ya no son lo único: cada una de éstas
   * nombra un camino del juego que el atasco NO recorría, y todas caen si el bucle
   * se vuelve a quedar dando vueltas en una sola familia.
   *
   * Los números son aproximadamente la mitad de lo medido —218 tiradas, 31 sietes,
   * 18 compras, 12 cartas jugadas, 98 trueques aceptados, 107 piezas puestas— para
   * que un cambio en las reglas que mueva el reparto no ponga rojo esto por unos
   * pocos, y para que el atasco, que da CERO en cinco de las seis, lo ponga rojo
   * entero.
   */
  comprobar('se tiran los dados muchas veces', cuantas(total, 'tirar') >= 120, {
    tiradas: cuantas(total, 'tirar'),
  });
  comprobar('y salen SIETES, que es la tirada que no rinde a nadie', sietes >= 10, { sietes });
  comprobar('se compran cartas del mazo', cuantas(total, 'comprar') >= 8, {
    compras: cuantas(total, 'comprar'),
  });
  comprobar('y se juegan', cuantas(total, 'jugar-carta') >= 5, {
    jugadas: cuantas(total, 'jugar-carta'),
  });
  comprobar(
    'se ofrecen trueques y alguien los ACEPTA, que es lo único que se juega sin turno',
    cuantas(total, 'ofrecer') >= 60 && cuantas(total, 'aceptar') >= 30,
    { ofrecidos: cuantas(total, 'ofrecer'), aceptados: cuantas(total, 'aceptar') },
  );
  comprobar(
    'y también se rechazan, que es el otro camino de `contestar`',
    cuantas(total, 'rechazar') >= 30,
    { rechazados: cuantas(total, 'rechazar') },
  );
  comprobar(
    'se construye sobre el tablero: chozas, torres y veredas',
    cuantas(total, 'fundar') + cuantas(total, 'torre') + cuantas(total, 'vereda') >= 60,
    {
      fundadas: cuantas(total, 'fundar'),
      torres: cuantas(total, 'torre'),
      veredas: cuantas(total, 'vereda'),
    },
  );

  comprobar(
    'se han jugado bastantes revisiones de Riberas como para que el verde signifique algo',
    revisiones > 800,
    { revisiones },
  );
  comprobar(
    'y en la mayoría había fichas repartidas, o sea algo que esconder',
    conFichas > revisiones / 2,
    { conFichas, revisiones },
  );
  console.log(`  ${revisiones} revisiones de Riberas examinadas, ${conFichas} con fichas repartidas`);
  console.log(
    `  tres partidas enteras: ${[...total].sort().map(([f, n]) => `${n} ${f}`).join(' · ')} · ${sietes} sietes`,
  );

  /*
   * ═══ Y EL BUCLE MISMO ES REEJECUTABLE, QUE NO ES LO MISMO QUE LO DE ARRIBA ═══
   *
   * Arriba se comprueba que el JUEGO reejecuta su diario. Aquí se comprueba que
   * QUIEN LO DIRIGE no mete azar de fuera: se vuelve a jugar la semilla 3 desde
   * cero y tiene que salir el mismo diario y el mismo estado. Con un `Math.random`
   * o un `Date.now()` en la política, esta línea es la que se cae — y sin ella, un
   * rojo de este fichero podría no reproducirse nunca.
   */
  const otraVezLaTres = unaPartidaDeRiberas(3, () => {});
  comprobar(
    'volver a jugar la semilla 3 con el mismo bucle da la MISMA partida',
    canonico(otraVezLaTres.mesa.diario) === elDiarioDeLaTres,
    { movimientos: otraVezLaTres.mesa.diario.length },
  );

  /*
   * LA VACUNA, con la misma forma que la de La Ronda y por la misma razón: cero
   * reproches también sale de un comprobador que no mira. Se le pone la identidad
   * como proyección —o sea, se destapan los almacenes— y la misma función que acaba
   * de dar verde tiene que ponerse roja.
   */
  const sembrada: Mesa = jugar(
    abrirMesa({ id: 'riberas-vacuna', arcade: RIBERAS, semilla: 5, asientos: TRES }),
    { quien: TRES[0] as AsientoId, movimiento: { tipo: 'riberas:empezar', carga: {} }, rev: 0 },
  );
  comprobar(
    'antes de envenenar, la partida de la vacuna está limpia',
    reprochesDeSecretos(RIBERAS, sembrada.estado, TRES, false).length === 0,
  );
  registrarProyeccion(RIBERAS, (estado: unknown) => estado);
  const envenenados = reprochesDeSecretos(RIBERAS, sembrada.estado, TRES, false);
  comprobar('con la identidad como proyección de Riberas, salta', envenenados.length > 0);
  registrarProyeccion(RIBERAS, proyectarRiberas);
  comprobar(
    'y al devolver la proyección buena, vuelve a estar limpia',
    reprochesDeSecretos(RIBERAS, sembrada.estado, TRES, false).length === 0,
  );
}

paso('En proceso: «La Frente» al revés — la sala VE la palabra y ningún asiento');

/*
 * Este bloque existe por el aviso que la fase 1 dejó escrito en la cabecera de
 * `frente.ts`, y comprueba las DOS mitades:
 *
 *   · Que ningún ASIENTO ve lo secreto, que es el contrato.
 *   · Que el ESPECTADOR sí ve la palabra, que es lo que hace de este juego el
 *     caso que convierte la proyección en un concepto de plataforma y no en un
 *     ayudante para esconder cartas.
 *
 * Sin la segunda, un comprobador que se pusiera más estricto —«que no aparezca
 * en NINGUNA vista»— pasaría en verde el día que La Frente dejara de enseñar la
 * palabra a la sala, o sea el día que el juego dejara de funcionar.
 */
{
  /*
   * A La Frente hay que darle el estado inicial hecho y a La Ronda no, y esa
   * diferencia entre dos juegos del mismo motor merece la línea: es EL JUEGO
   * quien decide si construye lo suyo en el primer movimiento —lo que le
   * conviene a una mesa, porque así la semilla y los asientos del reparto quedan
   * dentro del diario— o si lo recibe hecho, que es lo natural en un juego de un
   * solo aparato donde quien abre la partida es el propio móvil. El árbitro
   * admite las dos, y ninguna es un caso especial.
   */
  let mesa: Mesa = abrirMesa({
    id: 'frente-proceso',
    arcade: FRENTE,
    semilla: 4242,
    asientos: CUATRO,
    estado: partidaNuevaDeLaFrente(),
  });
  mesa = jugar(mesa, {
    quien: CUATRO[0] as AsientoId,
    movimiento: { tipo: EMPEZAR_LA_FRENTE },
    rev: mesa.rev,
  });
  for (let i = 0; i < TICS_PARA_COLOCARSE + 1; i++) mesa = avanzarElReloj(mesa);

  const reproches = reprochesDeSecretos(FRENTE, mesa.estado, CUATRO, true);
  comprobar('ningún asiento de La Frente ve lo secreto', reproches.length === 0, reproches);

  const deLaSala = vistaDeAsiento(FRENTE, mesa.estado, ESPECTADOR) as { palabra?: unknown };
  comprobar(
    'y la SALA sí ve la palabra, que es lo que hace este juego distinto de todos',
    typeof deLaSala.palabra === 'string' && deLaSala.palabra.length > 0,
    deLaSala,
  );
  comprobar(
    'esa palabra está declarada como secreta, o sea que la comprobación de arriba tenía algo que buscar',
    loSecretoDe(FRENTE, mesa.estado).some((s) => s === deLaSala.palabra),
  );
}

paso('La vacuna: una proyección que sea la identidad tiene que ponerse ROJA');

/*
 * ═══ SIN ESTE BLOQUE, TODO LO DE ARRIBA PODRÍA NO ESTAR COMPROBANDO NADA ═══
 *
 * Es literalmente el fallo que `loSecreto` existe para cerrar, escrito en la
 * cabecera de `proyeccion.ts`: «un juego puede declarar `secretos: true`,
 * registrar la identidad como proyección y pasar todos los comprobadores en
 * verde mientras filtra el mazo entero». Así que aquí se hace eso a propósito
 * —se le pone a La Ronda la identidad como proyección— y se exige que la MISMA
 * función que acaba de dar verde a cinco partidas encuentre la filtración.
 *
 * Este repositorio tiene tres casos anotados de comprobadores que pasaban en
 * verde sin comprobar nada, y los tres se descubrieron por casualidad. Un
 * comprobador que no se prueba a sí mismo es el cuarto.
 */
{
  const mesaLimpia: Mesa = jugar(
    abrirMesa({ id: 'vacuna', arcade: RONDA, semilla: 99, asientos: CUATRO }),
    { quien: CUATRO[0] as AsientoId, movimiento: { tipo: 'ronda:empezar' }, rev: 0 },
  );
  const sanos = reprochesDeSecretos(RONDA, mesaLimpia.estado, CUATRO, false);
  comprobar('antes de envenenar, la partida está limpia', sanos.length === 0, sanos);

  registrarProyeccion(RONDA, (estado: unknown) => estado);
  const envenenados = reprochesDeSecretos(RONDA, mesaLimpia.estado, CUATRO, false);
  comprobar(
    'con la identidad como proyección, la comprobación se pone roja',
    envenenados.length > 0,
  );
  comprobar(
    'y señala que las cartas aparecen en las CUATRO vistas, no en una',
    envenenados.some((r) => r.includes('4 asientos')),
    envenenados.slice(0, 3),
  );

  /*
   * Se devuelve la de verdad. La tabla de proyecciones está anclada al ámbito
   * global con `Symbol.for`, así que no se limpia sola entre bloques: dejar la
   * envenenada puesta haría que todo lo que viene después pasara por ella.
   */
  registrarProyeccion(RONDA, proyectarLaRonda);
  const curados = reprochesDeSecretos(RONDA, mesaLimpia.estado, CUATRO, false);
  comprobar('y al devolver la proyección buena, vuelve a estar limpia', curados.length === 0);
}

// ---------------------------------------------------------------------------
// SEGUNDA MITAD · CON EL SERVIDOR LEVANTADO
// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-'));
let servidor: ChildProcess | undefined;

function entorno(): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    PORT: String(PUERTO),
    NODE_ENV: 'test',
    /*
     * El servidor arranca en una carpeta temporal, así que las dos candidatas
     * relativas de `routes/modelos.ts` —`../escenas/modelos` y `escenas/modelos`—
     * no existen desde ahí. Se le dice dónde están, como haría un despliegue que
     * arrancara desde otro sitio. Que la búsqueda relativa funciona desde
     * `server/` y desde la raíz se comprueba EN PROCESO, más abajo.
     */
    MODELOS_DIR: path.join(REPO, 'escenas', 'modelos'),
  };
}

function levantar(): ChildProcess {
  const proceso = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: dir,
    env: entorno(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  loQueDijoElServidor = '';
  const anotar = (d: Buffer): void => {
    loQueDijoElServidor += d.toString();
  };
  proceso.stdout?.on('data', anotar);
  proceso.stderr?.on('data', anotar);
  return proceso;
}

/** Espera a que un proceso muera de verdad. En Windows no es instantáneo. */
function esperarAQueMuera(proceso: ChildProcess): Promise<void> {
  return new Promise((resolver) => {
    if (proceso.exitCode !== null || proceso.signalCode !== null) {
      resolver();
      return;
    }
    proceso.once('exit', () => resolver());
  });
}

interface Sentado {
  nombre: string;
  asiento: string;
  llave: string;
}

/** Abre una mesa y sienta a los cuatro. Devuelve el código y las cuatro sillas. */
async function mesaDeCuatro(plazoSegundos: number): Promise<{ codigo: string; gente: Sentado[] }> {
  const abierta = await pedir('/arcade/mesas', {
    metodo: 'POST',
    cuerpo: { arcade: RONDA, nombre: 'Ana', plazoSegundos },
  });
  comprobar('abrir una mesa devuelve 201', abierta.estado === 201, abierta.datos);
  const codigo = String(abierta.datos.codigo ?? '');
  comprobar('y un código de cinco letras', /^[A-Z0-9]{5}$/.test(codigo), codigo);

  const gente: Sentado[] = [
    { nombre: 'Ana', asiento: abierta.datos.asiento, llave: abierta.datos.llave },
  ];
  for (const nombre of ['Bruno', 'Carla', 'Diego']) {
    const r = await pedir(`/arcade/mesas/${codigo}/asientos`, {
      metodo: 'POST',
      cuerpo: { nombre },
    });
    comprobar(`${nombre} se sienta con el código`, r.estado === 200, r.datos);
    gente.push({ nombre, asiento: r.datos.asiento, llave: r.datos.llave });
  }
  return { codigo, gente };
}

try {
  servidor = levantar();
  await esperarAlServidor();

  // ── El catálogo, y que la puerta no es la del taller ──────────────────────
  paso('La puerta: delante de `requireAuth`, sin contraseña de la casa');

  {
    const catalogo = await pedir('/arcade');
    comprobar('el catálogo de arcades se sirve sin credencial', catalogo.estado === 200);
    const ids = (catalogo.datos.arcades ?? []).map((a: ManifiestoDeArcade) => a.id);
    /*
     * ═══ TODOS LOS INSTALADOS, Y NO «LOS DOS» ═══
     *
     * Esta línea decía «y trae los dos arcades instalados» y comprobaba dos
     * `includes` mientras el registro ya instalaba cuatro. Pasaba en verde por lo
     * que NO miraba: un arcade nuevo podía no salir por el catálogo y esto seguía
     * felicitando a todo el mundo. Ahora se contrasta contra el registro, que es la
     * única lista que no envejece — el día que entre el quinto, o se cae aquí o
     * sale, y las dos cosas son correctas.
     */
    const instalados = arcadesInstalados().map((m) => m.id).sort();
    const publicados = [...ids].sort();
    comprobar(
      `y trae TODOS los arcades instalados, que hoy son ${String(instalados.length)}`,
      instalados.length > 0 && instalados.join(',') === publicados.join(','),
      { instalados, publicados },
    );
    comprobar(
      'incluidos los tres de servidor, que son los que tienen mesa',
      ids.includes(FRENTE) && ids.includes(RONDA) && ids.includes(RIBERAS),
      ids,
    );

    /*
     * La prueba de que este router está DELANTE del guardián y no detrás: una
     * ruta de las que sí van detrás contesta distinto. Sin `APP_PASSWORD` el
     * taller está abierto, así que no se puede comparar con un 401; lo que sí se
     * puede es comprobar que la ruta del arcade no exige NADA y responde igual
     * de bien sin cabeceras, que es lo que hará falta el día que haya
     * contraseña.
     */
    const sinNada = await fetch(`${BASE}/arcade`);
    comprobar('y responde sin una sola cabecera', sinNada.status === 200);
  }

  // ── Abrir, unirse, aforo ──────────────────────────────────────────────────
  paso('Abrir una mesa y unirse con el código');

  const { codigo, gente } = await mesaDeCuatro(0);

  {
    const quinto = await pedir(`/arcade/mesas/${codigo}/asientos`, {
      metodo: 'POST',
      cuerpo: { nombre: 'Eva' },
    });
    comprobar('el quinto no cabe: el aforo lo dice el manifiesto', quinto.estado === 409, quinto.datos);
    comprobar('y lo dice por su motivo', quinto.datos.motivo === 'mesa-llena', quinto.datos);

    const noExiste = await pedir('/arcade/mesas/ZZZZZ/asientos', {
      metodo: 'POST',
      cuerpo: { nombre: 'Eva' },
    });
    comprobar('un código que no existe es un 404 y no un 500', noExiste.estado === 404);

    const deOtroJuego = await pedir('/arcade/mesas', {
      metodo: 'POST',
      cuerpo: { arcade: 'el-que-no-esta', nombre: 'Ana' },
    });
    comprobar('abrir una mesa de un arcade no instalado es un 409 con la lista', deOtroJuego.estado === 409);
    comprobar('y dice qué SÍ hay instalado', Array.isArray(deOtroJuego.datos.instalados));

    /*
     * ═══ Y UN ARCADE QUE SE JUEGA EN EL APARATO NO TIENE MESA QUE ABRIR ═══
     *
     * `necesitaMesa(manifiesto)` existe en el contrato desde la fase 0 y no la
     * llamaba ni una línea de producción. Sin ella, esta misma petición —con «La
     * Frente», que el catálogo de dos líneas más arriba publica— abría la mesa,
     * la metía en la tabla, la persistía y REVENTABA con un 500 al componer la
     * vista, porque la proyección de ese juego está escrita sobre su propio
     * estado y una mesa nace con el estado sin construir.
     *
     * Lo que quedaba era una mesa envenenada: 500 al leerla, 500 al sentarse y
     * 500 al borrarla, sin credencial ninguna y durante treinta días. Así que se
     * comprueban las dos cosas: que se niega en la petición que abre, y que no
     * deja nada detrás.
     */
    const antesDeIntentarlo = (await pedir('/arcade/diagnostico')).datos.mesas as number;
    const enElAparato = await pedir('/arcade/mesas', {
      metodo: 'POST',
      cuerpo: { arcade: FRENTE, nombre: 'Ana' },
    });
    comprobar(
      'abrir una mesa de un arcade de `sede: dispositivo` es un 409, no un 500',
      enElAparato.estado === 409,
      enElAparato.datos,
    );
    comprobar(
      'y lo dice por su motivo y con el nombre del juego',
      enElAparato.datos.motivo === 'sin-mesa' && enElAparato.datos.arcade === FRENTE,
      enElAparato.datos,
    );
    const despuesDeIntentarlo = (await pedir('/arcade/diagnostico')).datos.mesas as number;
    comprobar(
      'y NO deja una mesa huérfana detrás: nadie tendría su llave para cerrarla',
      despuesDeIntentarlo === antesDeIntentarlo,
      { antes: antesDeIntentarlo, despues: despuesDeIntentarlo },
    );
  }

  // ── La partida entera, vigilando lo que viaja ─────────────────────────────
  paso('Una partida entera de La Ronda, mirando TODO lo que sale por el cable');

  /**
   * Lo que se le mandó a cada cual en cada revisión, guardado para juzgarlo al
   * final. Se guarda el texto y no el objeto: lo que se está comprobando es lo
   * que VIAJÓ.
   */
  const loQueViajo: Array<{ rev: number; quien: string; texto: string; miMano: string[] }> = [];

  async function mirarConTodos(): Promise<void> {
    for (const uno of gente) {
      const r = await pedir(`/arcade/mesas/${codigo}`, { llave: uno.llave });
      comprobar(`${uno.nombre} puede mirar la mesa`, r.estado === 200, r.datos);
      const mesa = r.datos.mesa;
      loQueViajo.push({
        rev: mesa.rev,
        quien: uno.asiento,
        texto: JSON.stringify(mesa),
        miMano: Array.isArray(mesa.vista.miMano) ? mesa.vista.miMano : [],
      });
    }
    const mirando = await pedir(`/arcade/mesas/${codigo}`);
    comprobar('y un espectador sin llave también', mirando.estado === 200);
    comprobar('sin ser nadie en concreto', mirando.datos.mesa.yo === null);
    loQueViajo.push({
      rev: mirando.datos.mesa.rev,
      quien: 'espectador',
      texto: JSON.stringify(mirando.datos.mesa),
      miMano: [],
    });
  }

  await mirarConTodos();

  {
    const antes = await pedir(`/arcade/mesas/${codigo}`, { llave: gente[0]!.llave });
    const empezar = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: gente[0]!.llave,
      cuerpo: { rev: antes.datos.mesa.rev, tipo: 'ronda:empezar' },
    });
    comprobar('cualquiera de los cuatro puede repartir: no hay anfitrión', empezar.estado === 200);
    comprobar(
      'y a partir de ahí se está jugando',
      empezar.datos.mesa.vista.momento === 'jugando',
      empezar.datos.mesa.vista,
    );
    comprobar(
      'quien repartió ve SUS cinco cartas',
      Array.isArray(empezar.datos.mesa.vista.miMano) && empezar.datos.mesa.vista.miMano.length === 5,
      empezar.datos.mesa.vista.miMano,
    );
  }

  await mirarConTodos();

  // ── Los tres rechazos ─────────────────────────────────────────────────────
  paso('Los rechazos: sin asiento, con la revisión rancia, y con la de otro');

  {
    const ahora = await pedir(`/arcade/mesas/${codigo}`, { llave: gente[0]!.llave });
    const rev = ahora.datos.mesa.rev;
    const turno = ahora.datos.mesa.vista.turnoDe as string;
    const deQuienToca = gente.find((g) => g.asiento === turno)!;
    const carta = (
      await pedir(`/arcade/mesas/${codigo}`, { llave: deQuienToca.llave })
    ).datos.mesa.vista.miMano[0] as string;

    const sinLlave = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      cuerpo: { rev, tipo: 'ronda:jugar', carga: { carta } },
    });
    comprobar('ACTUAR SIN ASIENTO se rechaza con 403', sinLlave.estado === 403, sinLlave.datos);
    comprobar('y por el motivo correcto', sinLlave.datos.motivo === 'no-estas-sentado');
    comprobar(
      'y lo que se le devuelve al rechazado NO lleva la mano de nadie',
      !JSON.stringify(sinLlave.datos).includes(carta),
    );

    const llaveInventada = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: 'UNALLAVEQUENADIEREPARTIO',
      cuerpo: { rev, tipo: 'ronda:jugar', carga: { carta } },
    });
    comprobar('una llave inventada tampoco vale', llaveInventada.estado === 403, llaveInventada.datos);

    const rancio = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: deQuienToca.llave,
      cuerpo: { rev: 0, tipo: 'ronda:jugar', carga: { carta } },
    });
    comprobar('UN `rev` RANCIO al mover se rechaza con 409', rancio.estado === 409, rancio.datos);
    comprobar('y por el motivo correcto', rancio.datos.motivo === 'revision-rancia');
    comprobar(
      'y CON EL ESTADO COMPLETO dentro, para que el reintento no cueste dos viajes',
      rancio.datos.mesa !== undefined && rancio.datos.mesa.rev === rev,
      rancio.datos.mesa,
    );

    const sinRev = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: deQuienToca.llave,
      cuerpo: { tipo: 'ronda:jugar', carga: { carta } },
    });
    comprobar(
      'y omitir `rev` no exime de la comprobación: es un 400',
      sinRev.estado === 400,
      sinRev.datos,
    );

    /*
     * A QUIEN NO LE TOCA NO PUEDE JUGAR, y esto es una regla del JUEGO y no de
     * la puerta: el árbitro acepta el movimiento —está sentado y su revisión es
     * fresca— y el reductor lo devuelve sin cambios. Se comprueba que el estado
     * no se movió, que es lo único observable desde fuera y lo correcto: un
     * movimiento imposible no es una excepción, es un estado que no cambia.
     */
    const noLeToca = gente.find((g) => g.asiento !== turno)!;
    const suCarta = (
      await pedir(`/arcade/mesas/${codigo}`, { llave: noLeToca.llave })
    ).datos.mesa.vista.miMano[0] as string;

    /**
     * La revisión de AHORA MISMO.
     *
     * Se vuelve a preguntar antes de cada movimiento en vez de reutilizar una:
     * cualquiera de estas comprobaciones podría hacer avanzar la partida, y la
     * siguiente saldría rechazada por rancia y estaría comprobando otra cosa
     * —eso ya lo comprueba el bloque de arriba— en vez de lo que dice su rótulo.
     *
     * Antes hacía falta por un motivo más fuerte, y conviene dejar escrito que
     * ya no: el árbitro sube la revisión con CADA movimiento que acepta,
     * incluidos los que el juego ignora, y la mesa se los tragaba tal cual. Ver
     * el bloque «Un movimiento que el juego ignora no deja rastro», aquí abajo.
     */
    const revDeAhora = async (): Promise<number> =>
      (await pedir(`/arcade/mesas/${codigo}`, { llave: gente[0]!.llave })).datos.mesa.rev as number;

    const fuera = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: noLeToca.llave,
      cuerpo: { rev: await revDeAhora(), tipo: 'ronda:jugar', carga: { carta: suCarta } },
    });
    comprobar('quien no tiene el turno no cambia la partida', fuera.estado === 200);
    comprobar(
      'la baza sigue como estaba y el turno también',
      fuera.datos.mesa.vista.turnoDe === turno,
      fuera.datos.mesa.vista,
    );

    /*
     * Y UNA CARTA QUE NO TIENE, tampoco. Es la comprobación que el ÁRBITRO no
     * hace y no puede hacer —el estado es opaco, no sabe qué es una carta— y que
     * BAJA AL REDUCTOR. Si algún día alguien la subiera al árbitro «para tenerla
     * en un solo sitio», esto seguiría en verde y la arquitectura estaría rota;
     * lo que esta comprobación afirma es que la regla existe, no dónde vive.
     */
    const ajena = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: deQuienToca.llave,
      cuerpo: { rev: await revDeAhora(), tipo: 'ronda:jugar', carga: { carta: suCarta } },
    });
    comprobar(
      'jugar una carta que no está en tu mano no cambia nada',
      ajena.datos.mesa.vista.turnoDe === turno,
      ajena.datos.mesa.vista,
    );

    const basura = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: deQuienToca.llave,
      cuerpo: { rev: await revDeAhora(), tipo: 'ronda:jugar', carga: { carta: 42 } },
    });
    comprobar(
      'y una carga con cualquier cosa dentro tampoco revienta nada',
      basura.estado === 200 && basura.datos.mesa.vista.turnoDe === turno,
      basura.datos,
    );
  }

  // ── El prefijo reservado ──────────────────────────────────────────────────
  paso('El tic no lo manda un dispositivo: el prefijo `arcade:` está cerrado');

  /*
   * ═══ POR QUÉ ESTA COMPROBACIÓN EXISTE, Y QUÉ PASABA SIN ELLA ═══
   *
   * `shared/arcade/movimiento.ts` declara que los tipos que empiezan por
   * `arcade:` los reserva la plataforma, y la cabecera del árbitro dice que
   * hacer pasar el tic por la puerta de los dispositivos «abriría la llave
   * maestra». Era una invariante escrita y no comprobada, y no existía.
   *
   * Lo que se conseguía mandándola: un sentado a quien NO le tocaba mandaba
   * `arcade:tic`, recibía 200, y a quien tenía el turno se le echaba su carta
   * más baja. Repitiéndolo, un solo cliente jugaba la partida entera de cuatro
   * personas y ganaba las bazas que quisiera, porque forzar la carta más baja
   * ajena decide quién se lleva la baza.
   *
   * Se comprueba con el prefijo entero y no solo con el tic: lo que se afirma es
   * que la plataforma se reserva el espacio de nombres, no que haya tapado un
   * caso.
   */
  {
    const antes = await pedir(`/arcade/mesas/${codigo}`, { llave: gente[0]!.llave });
    const revAntes = antes.datos.mesa.rev as number;
    const turnoAntes = antes.datos.mesa.vista.turnoDe as string;
    const noLeToca = gente.find((g) => g.asiento !== turnoAntes)!;

    const elTic = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: noLeToca.llave,
      cuerpo: { rev: revAntes, tipo: 'arcade:tic' },
    });
    comprobar('un sentado que manda `arcade:tic` recibe 400', elTic.estado === 400, elTic.datos);
    comprobar(
      'y por su motivo, que no es «no estás sentado»: no hay credencial que valga',
      elTic.datos.motivo === 'movimiento-reservado',
      elTic.datos,
    );

    const inventado = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: noLeToca.llave,
      cuerpo: { rev: revAntes, tipo: 'arcade:lo-que-sea' },
    });
    comprobar(
      'y cualquier otro `arcade:` tampoco entra: se reserva el prefijo, no un caso',
      inventado.estado === 400 && inventado.datos.motivo === 'movimiento-reservado',
      inventado.datos,
    );

    const despues = await pedir(`/arcade/mesas/${codigo}`, { llave: gente[0]!.llave });
    comprobar(
      'y la partida no se ha movido ni un poco: mismo turno y misma revisión',
      despues.datos.mesa.rev === revAntes && despues.datos.mesa.vista.turnoDe === turnoAntes,
      { antes: { revAntes, turnoAntes }, despues: despues.datos.mesa },
    );
  }

  // ── El movimiento que no cambia nada ──────────────────────────────────────
  paso('Un movimiento que el juego ignora no deja rastro');

  /*
   * ═══ LO QUE SE MIDIÓ SIN ESTO ═══
   *
   * `jugar` subía la revisión y anotaba en el diario aunque el reductor
   * devolviera el mismo estado, y cada uno de esos movimientos se escribía en el
   * disco. Dos mil movimientos de un tipo inexistente desde un solo cliente
   * dejaban el diario de esa mesa en 1,2 MB —y uno solo con 240 kB de carga
   * dentro se archivaba tal cual durante treinta días—, además de despertar a
   * los otros tres de su sondeo dos mil veces para repintar exactamente lo
   * mismo.
   *
   * La regla es la que `ponerAlDiaElPlazo` ya aplicaba al tic y que faltaba en
   * el camino del cliente: si el estado no cambia, para la mesa no ha pasado
   * nada.
   */
  {
    const antes = await pedir(`/arcade/mesas/${codigo}`, { llave: gente[0]!.llave });
    const revAntes = antes.datos.mesa.rev as number;

    let ultima = antes;
    for (let i = 0; i < 5; i++) {
      ultima = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
        metodo: 'POST',
        llave: gente[0]!.llave,
        cuerpo: { rev: revAntes, tipo: 'basura:no-existe', carga: { relleno: 'x'.repeat(1000) } },
      });
    }
    comprobar(
      'cinco movimientos que el juego no conoce se contestan con 200: no son un error',
      ultima.estado === 200,
      ultima.datos,
    );
    comprobar(
      'y NO suben la revisión, así que no hay a quién avisar ni diario que engordar',
      ultima.datos.mesa.rev === revAntes,
      { antes: revAntes, despues: ultima.datos.mesa.rev },
    );
    comprobar(
      'y por eso el quinto no sale rancio: la mesa sigue donde estaba',
      ultima.datos.motivo === undefined,
      ultima.datos,
    );
  }

  // ── El sobre que elige quien llama ────────────────────────────────────────
  /*
   * ═══ ESTO REPRODUCE UN ATAQUE QUE FUNCIONABA, Y POR ESO ESTÁ AQUÍ ═══
   *
   * Una auditoría lo encontró y lo ejecutó: sin cuenta, sin conocer ningún código
   * y con UNA sola petición, un desconocido dejaba un arcade entero en cuarentena
   * permanente. El camino era éste:
   *
   *   1. Abrir una mesa (la ruta va delante del guardián, y debe ir).
   *   2. Mandar un movimiento con ~240 kB de carga muy anidada.
   *   3. El portillo del §5 bis canoniza `{ tipo, carga }` para ver si
   *      `opciones()` lo había ofrecido — DENTRO del tramo que cronometra el
   *      presupuesto. Medido: 152 ms, tres veces el tope de 50.
   *   4. La cuarentena se apunta contra EL ARCADE, es por juego, es permanente y
   *      no tiene puerta para levantarla. Todas las mesas de ese juego —incluidas
   *      las de gente jugando— dejaban de aceptar movimientos hasta reiniciar.
   *
   * El presupuesto medía trabajo cuyo tamaño elegía quien llamaba, y le pasaba la
   * factura al juego. La cuarentena NO se tocó: su permanencia está razonada
   * donde se declara y es buena. Lo que se corta es el otro extremo, en la puerta.
   *
   * Se comprueba POR HTTP y no en proceso a propósito: el tope vive en la ruta, y
   * un comprobador que llamara a `mover` directamente pasaría por encima de él y
   * daría verde sin comprar nada. Es el mismo error que este repositorio ya tiene
   * apuntado en otro sitio.
   */
  paso('Una carga enorme no puede castigar al arcade: se para en la puerta');

  {
    const antes = await pedir(`/arcade/mesas/${codigo}`, { llave: gente[0]!.llave });
    const revAntes = antes.datos.mesa.rev as number;

    /* Lo que medía la auditoría: anidamiento profundo repetido, ~240 kB. */
    const hondo = (n: number): unknown => {
      let x: unknown = 'x';
      for (let i = 0; i < n; i++) x = [x];
      return x;
    };
    const enorme = Array.from({ length: 120 }, () => hondo(1000));

    const conCargaEnorme = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: gente[0]!.llave,
      cuerpo: { rev: revAntes, tipo: 'ataque', carga: enorme },
    });
    comprobar(
      'una carga desproporcionada se rechaza con 400 y no llega al reductor',
      conCargaEnorme.estado === 400,
      { estado: conCargaEnorme.estado, datos: conCargaEnorme.datos },
    );

    const tipoLargo = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: gente[0]!.llave,
      cuerpo: { rev: revAntes, tipo: 'z'.repeat(4000), carga: {} },
    });
    comprobar(
      'y un `tipo` de cuatro mil caracteres también',
      tipoLargo.estado === 400,
      { estado: tipoLargo.estado, datos: tipoLargo.datos },
    );

    /*
     * LO QUE DE VERDAD SE COMPRA: que después de los dos intentos el arcade siga
     * jugándose. Sin el tope, aquí ya estaría apartado y esta lectura daría 503.
     */
    const despues = await pedir(`/arcade/mesas/${codigo}`, { llave: gente[0]!.llave });
    comprobar(
      'y el arcade sigue vivo: la mesa se puede leer después del intento',
      despues.estado === 200,
      { estado: despues.estado, datos: despues.datos },
    );
    comprobar(
      'y la mesa no se ha movido',
      despues.datos.mesa.rev === revAntes,
      { antes: revAntes, despues: despues.datos.mesa.rev },
    );

    const presupuesto = await pedir('/arcade/presupuesto');
    const apartados = (presupuesto.datos.apartados ?? []) as Array<{ arcade: string }>;
    comprobar(
      'y NADIE ha quedado en cuarentena por un sobre que eligió quien llamaba',
      apartados.length === 0,
      apartados,
    );
    /*
     * Y los dos topes se publican, por lo mismo que los otros dos: quien escribe
     * un arcade de fuera tiene que saber contra qué se le mide.
     */
    comprobar(
      'los topes del sobre se publican en el diagnóstico',
      typeof presupuesto.datos.topeTipoCaracteres === 'number' &&
        typeof presupuesto.datos.topeCargaBytes === 'number',
      presupuesto.datos,
    );
  }

  // ── Presencia ≠ participación ─────────────────────────────────────────────
  paso('Presencia y participación NO son lo mismo');

  {
    const visto = await pedir(`/arcade/mesas/${codigo}`, { llave: gente[3]!.llave });
    const conDiego = visto.datos.mesa.asientos.find((a: any) => a.id === gente[3]!.asiento);
    comprobar('a quien acaba de mirar se le pinta conectado', conDiego.presente === true, conDiego);

    /*
     * Y AHORA LO QUE DE VERDAD IMPORTA. No se puede esperar sesenta segundos a
     * que alguien figure desconectado —esto es un comprobador, no una velada— así
     * que se comprueba la mitad que sí se puede comprobar en el acto y que es la
     * que rompe La Larga: ESTAR EN LA PARTIDA NO DEPENDE DE ESTAR MIRANDO. Los
     * cuatro asientos siguen ahí, en el mismo orden, y el turno sigue dando la
     * vuelta por todos ellos aunque tres de los cuatro no hayan vuelto a pedir la
     * vista.
     *
     * En una velada la presencia es un buen proxy de la participación porque la
     * gente está sentada a la mesa. Aquí no: quien cierra la app sigue en la
     * partida y le toca.
     */
    comprobar(
      'los cuatro siguen en la partida aunque tres no estén mirando',
      visto.datos.mesa.asientos.length === 4,
      visto.datos.mesa.asientos,
    );
  }

  // ── La partida hasta el final, por turnos ─────────────────────────────────
  paso('Se juega hasta el final, y el turno da la vuelta a la mesa');

  let vueltas = 0;
  let terminada = false;
  while (vueltas < 40) {
    vueltas++;
    const ahora = await pedir(`/arcade/mesas/${codigo}`, { llave: gente[0]!.llave });
    if (ahora.datos.mesa.vista.momento === 'terminada') {
      terminada = true;
      break;
    }
    const turno = ahora.datos.mesa.vista.turnoDe as string;
    const quien = gente.find((g) => g.asiento === turno);
    if (!quien) break;
    const suya = await pedir(`/arcade/mesas/${codigo}`, { llave: quien.llave });
    const carta = suya.datos.mesa.vista.miMano[0] as string;
    await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: quien.llave,
      cuerpo: { rev: ahora.datos.mesa.rev, tipo: 'ronda:jugar', carga: { carta } },
    });
    await mirarConTodos();
  }

  comprobar('la partida termina', terminada, { vueltas });

  {
    const final = await pedir(`/arcade/mesas/${codigo}`, { llave: gente[0]!.llave });
    comprobar(
      'y al terminar hay ganador o ganadores',
      Array.isArray(final.datos.mesa.vista.ganadores) &&
        final.datos.mesa.vista.ganadores.length > 0,
      final.datos.mesa.vista,
    );
    const bazas = final.datos.mesa.vista.jugadores.reduce(
      (a: number, j: any) => a + j.bazas,
      0,
    );
    comprobar('se han jugado las cinco bazas', bazas === 5, final.datos.mesa.vista.jugadores);
  }

  // ── LO QUE VIAJÓ, JUZGADO ────────────────────────────────────────────────
  paso('Lo que viajó por el cable: ninguna carta ajena en la vista de nadie');

  {
    /*
     * ═══ ESTA ES LA COMPROBACIÓN QUE NO DEPENDE DE CREERSE NADA ═══
     *
     * No usa `loSecreto` y no necesita el estado. Cada asiento dijo, en cada
     * revisión, cuál era su mano —`miMano`, que es suya y tiene que salir—. Lo
     * que se exige es que NINGUNA de esas cartas apareciera, en esa misma
     * revisión, en lo que se le mandó a otro. Con la proyección quitada, cada
     * carta saldría en cuatro respuestas y esto se pondría rojo cien veces.
     *
     * Se compara por revisión y no en bloque, porque una carta jugada se vuelve
     * pública: sale en `baza` y la ve todo el mundo, y con razón. Lo que no puede
     * salir es la que TODAVÍA está en la mano de otro EN ESE MOMENTO.
     */
    const porRev = new Map<number, typeof loQueViajo>();
    for (const uno of loQueViajo) {
      const lista = porRev.get(uno.rev) ?? [];
      lista.push(uno);
      porRev.set(uno.rev, lista);
    }

    let cartasVigiladas = 0;
    let escapes = 0;
    const ejemplos: string[] = [];
    for (const [rev, enEsaRev] of porRev) {
      for (const duena of enEsaRev) {
        for (const carta of duena.miMano) {
          cartasVigiladas++;
          for (const otra of enEsaRev) {
            if (otra.quien === duena.quien) continue;
            if (!otra.texto.includes(`"${carta}"`)) continue;
            escapes++;
            if (ejemplos.length < 5) {
              ejemplos.push(`rev ${rev}: «${carta}» de ${duena.quien} salió hacia ${otra.quien}`);
            }
          }
        }
      }
    }

    /*
     * LA VACUNA CONTRA EL VERDE FALSO. Cero escapes sobre cero cartas se parece
     * muchísimo a «todo bien». Si un día la vista dejara de traer `miMano`, o si
     * la partida no llegara a repartirse, esto tiene que ponerse rojo en vez de
     * felicitar a nadie para siempre.
     */
    comprobar(
      'se han vigilado bastantes cartas como para que el verde signifique algo',
      cartasVigiladas > 100,
      { cartasVigiladas, revisiones: porRev.size },
    );
    comprobar(
      'ninguna carta de una mano salió hacia otro asiento ni hacia el espectador',
      escapes === 0,
      ejemplos,
    );
    console.log(`  ${cartasVigiladas} cartas vigiladas en ${porRev.size} revisiones`);
  }

  // ── La forma de la vista ─────────────────────────────────────────────────
  paso('La forma de lo que sale: un juego de campos cerrado, y ni uno más');

  {
    /*
     * ═══ LA OTRA MITAD DE LA DEFENSA, Y LA QUE AGUANTA EL PASO DEL TIEMPO ═══
     *
     * La búsqueda de valores de arriba solo caza lo que es DISTINGUIBLE. Un campo
     * nuevo que alguien añada dentro de seis meses con la mejor intención —«el
     * número de cartas del rival», «quién repartió»— no lo cazaría si lo que mete
     * es un número pequeño.
     *
     * Esto sí: se afirma el juego exacto de campos que sale por la red, así que
     * un campo nuevo pone rojo esta línea y obliga a venir a pensar si ese campo
     * puede salir. Es lo que `frente.ts` llama «cerrar la puerta por donde
     * saldría» en vez de buscar lo que se escapa.
     */
    const r = await pedir(`/arcade/mesas/${codigo}`, { llave: gente[0]!.llave });
    const campos = Object.keys(r.datos.mesa).sort().join(',');
    /*
     * ═══ `turnoDesde` ENTRÓ AQUÍ EN LA FASE 4 BIS, Y ESTA LÍNEA HIZO SU TRABAJO ═══
     *
     * Se puso roja el día que se añadió, que es exactamente para lo que existe: un
     * campo nuevo en lo que sale por la red no puede colarse porque nadie lo mire.
     * Añadirlo aquí NO es poner verde un comprobador molesto: es la firma de que
     * alguien vino a pensar si ese campo puede salir.
     *
     * Y puede: `turnoDesde` es un instante de reloj de pared que dice desde cuándo
     * se está esperando al que tiene el turno. Es un dato de la MESA y no del juego
     * —la mesa es la autoridad y sí sabe qué hora es—, no lleva dentro nada de
     * ningún asiento, y ya sale la mitad de la misma información en `venceEn`, que
     * está aquí desde la fase 2. Lo necesita la pantalla para decir «lleva dos días
     * sin mover» en una partida de días.
     */
    /*
     * ═══ Y `motivo` ENTRÓ EN LA FASE 5, POR LA MISMA PUERTA Y CON EL MISMO TRÁMITE ═══
     *
     * Esta línea se volvió a poner roja, que es su trabajo. Lo que se vino a pensar,
     * escrito para que no haya que volver a pensarlo:
     *
     *   · QUÉ ES. El texto con el que el juego dice POR QUÉ no ha pasado nada.
     *     Con la regla del «sólo si» del §5 bis, el rechazo silencioso es el camino
     *     normal —el reductor devuelve el mismo objeto de estado— y hasta ahora la
     *     app sólo podía decir «la mesa está igual que estaba», deduciéndolo de que
     *     la revisión no había subido.
     *   · POR QUÉ PUEDE SALIR. Va SÓLO en la respuesta de mover, o sea sólo a quien
     *     movió; en esta lectura vale `null`. No se guarda, no entra en el diario y
     *     no sale en la vista de nadie más.
     *   · QUÉ TIENE QUE CUIDAR EL JUEGO, que ninguna comprobación puede imponerle:
     *     un motivo no puede contar nada que la proyección de quien mueve no
     *     contara ya. «El oferente no tiene la sal que prometía» sería una fuga por
     *     la puerta de atrás. Está escrito en la cabecera de `Rechazo`.
     *
     * La comprobación de que aquí llega `null` en una LECTURA está unas líneas más
     * abajo, y es la que impide que un motivo se quede pegado a la mesa.
     */
    /*
     * ═══ Y `opciones` ENTRÓ DESPUÉS, EN LA MISMA FASE Y CON EL MISMO TRÁMITE ═══
     *
     * Tercera vez que esta línea se pone roja, tercera vez que hace su trabajo. Lo
     * que se vino a pensar, escrito para no volver a pensarlo:
     *
     *   · QUÉ ES. Lo que el propio juego contesta a «qué puede hacer ESTE asiento
     *     ahora mismo»: una lista de opciones con el movimiento ya montado dentro.
     *     Viaja para que un mueble genérico pueda pintarle los botones a un arcade
     *     que la app NO trae en su binario — sin esto, `opciones()` era un hueco del
     *     registro que no recorría nadie en producción.
     *   · POR QUÉ PUEDE SALIR, Y ES LO ÚNICO QUE IMPORTA AQUÍ. Porque `opciones()`
     *     recibe LA VISTA y jamás el estado (§5 bis), y la vista que se le pasa es
     *     la que se acaba de proyectar PARA ESTE ASIENTO. No puede ofrecer nada
     *     construido con algo que la proyección no hubiera dejado pasar: imposible
     *     por construcción y no por disciplina. Si la firma recibiera el estado,
     *     este campo sería una segunda proyección con su propio tapado, y la fuga
     *     más ancha del servidor.
     *   · QUÉ TIENE QUE CUIDAR EL JUEGO, y ninguna comprobación puede imponérselo:
     *     que el `id` de una opción sea un SEUDÓNIMO y no un derivado del contenido
     *     oculto. `"pagar-con-b17:junco"` escondería un secreto dentro de un
     *     identificador y la búsqueda de este fichero NO lo cazaría, porque busca la
     *     forma canónica CON COMILLAS. Está escrito en `Opcion.id` y en el §5 bis.
     *   · Y LO QUE SÍ SE COMPRUEBA. `reprochesDeSecretos` mira ahora la vista Y las
     *     opciones de cada asiento —se amplió en esta misma tanda, porque sólo mirar
     *     la vista habría dejado sin vigilar la superficie nueva el día que se
     *     estrenaba—. Un juego que colara aquí la mano de otro en forma canónica
     *     se pone rojo.
     */
    /*
     * ═══ Y `empezada` ENTRÓ CON EL LOBBY 3D, CUARTA VEZ QUE ESTA LÍNEA SE PONE ROJA ═══
     *
     * Lo que se vino a pensar, escrito para no volver a pensarlo:
     *
     *   · QUÉ ES. `Mesa.empezada` del árbitro puesto en la vista: `false` mientras
     *     la mesa se reúne, `true` desde el primer movimiento de un asiento que
     *     cambió el estado. La autoridad lo tenía desde que «con la partida
     *     empezada no se sienta nadie», y los clientes no podían leerlo.
     *   · POR QUÉ PUEDE SALIR. Es un booleano de la MESA, no del juego: no lleva
     *     dentro nada de ningún asiento y no dice nada que la propia vista del
     *     juego no dejara deducir a quien supiera a qué se juega. Lo que compra es
     *     justo lo contrario: que un mueble genérico —el lobby previo a la partida—
     *     sepa si se reúne o se juega SIN abrir la vista del juego.
     *   · Y LO QUE NO ES. No es `terminada`: una mesa puede estar empezada y no
     *     terminada, y una recién abierta no está ni lo uno ni lo otro.
     */
    comprobar(
      'la mesa manda exactamente estos campos',
      campos ===
        'arcade,asientos,codigo,empezada,motivo,opciones,rev,terminada,tic,turnoDesde,venceEn,vista,yo',
      campos,
    );
    comprobar(
      'y al MIRAR la mesa el motivo viene vacío: es de un intento, no de la partida',
      r.datos.mesa.motivo === null,
      r.datos.mesa.motivo,
    );
    /*
     * ═══ ESTA LISTA SE AMPLÍA A MANO, Y ESE ES SU VALOR ═══
     *
     * Tres campos nuevos, y los tres se justifican aquí porque este comprobador es
     * la única puerta por la que se entera nadie de que la vista ha crecido. Un
     * campo que aparece sin que esta línea cambie es un campo que nadie miró.
     *
     *   · `ultimaBaza` y `ganoLaUltima` — la baza que se acaba de resolver y quién
     *     se la llevó. PÚBLICOS por construcción: son cartas que se echaron boca
     *     arriba y las vio la mesa entera, y `loSecretoDeLaRonda` sólo declara
     *     secretas las que quedan EN LAS MANOS. Existen porque `resolverLaBaza`
     *     vacía `baza` en el mismo movimiento en que entra la cuarta carta, así
     *     que sin guardarla esa carta no la ve nunca nadie.
     *   · `tablero` — el `TableroDeclarado` que pinta el mueble genérico. No trae
     *     nada que no estuviera ya en los otros campos: se COMPONE a partir de la
     *     vista ya recortada, con la misma técnica que Riberas, así que no puede
     *     enseñar lo que la proyección no dejó pasar. La búsqueda de secretos de
     *     este mismo fichero lo recorre igual que a todo lo demás, que es lo que
     *     de verdad lo compra.
     */
    const deLaVista = Object.keys(r.datos.mesa.vista).sort().join(',');
    comprobar(
      'y la vista de La Ronda exactamente estos',
      deLaVista ===
        'baza,desde,ganadores,ganoLaUltima,jugadores,mano,miMano,momento,tablero,turnoDe,ultimaBaza',
      deLaVista,
    );
    /*
     * ═══ `figura` NO ESTÁ AQUÍ, Y ES UNA DECISIÓN: SÓLO VIAJA CUANDO ESTÁ PUESTA ═══
     *
     * Esta mesa se abrió sin figuras, así que cada asiento sigue siendo
     * exactamente `id,nombre,presente`. Un asiento CON figura trae además
     * `figura`, y lo trae como clave presente; uno sin ella no trae la clave, ni
     * `null` ni `undefined`. Lo que cruza el cable es JSON y ahí una clave con
     * `undefined` no existe, así que la vista se compone sin ella también en
     * proceso, para que esta afirmación valga igual desde dentro que desde fuera.
     * Las dos formas se afirman en el bloque del lobby, más abajo.
     */
    const deUnAsiento = Object.keys(r.datos.mesa.asientos[0]).sort().join(',');
    comprobar('y cada asiento sin figura estos, y ni uno más', deUnAsiento === 'id,nombre,presente', deUnAsiento);
    comprobar(
      'LA LLAVE NO SALE EN NINGUNA VISTA, ni en la de su dueño',
      !JSON.stringify(r.datos).includes(gente[0]!.llave),
    );
  }

  // ── Riberas por el cable ─────────────────────────────────────────────────
  paso('Riberas por HTTP: se abre, se juega, y el tablero que baja no lleva fichas ajenas');

  /*
   * ═══ EL MISMO CAMINO QUE LA RONDA, PARA EL JUEGO QUE LO ESTRENA TODO ═══
   *
   * Esto no repite la comprobación de arriba con otro nombre: la ejerce sobre lo
   * único que hace distinto a este arcade. La proyección de Riberas lleva dentro un
   * TABLERO YA RESUELTO —caras, líneas, nudos, botones y paneles con rótulos y
   * ayudas de texto libre— y ese objeto es lo que baja por el cable. Es la
   * superficie más ancha que publica ningún juego de esta casa, y hasta hoy no la
   * miraba nadie desde fuera del proceso.
   *
   * Se juega la colocación entera leyendo el tablero, o sea como jugaría el móvil,
   * y en cada revisión se guarda lo que se le mandó a cada cual. Al final se exige
   * que ninguna ficha de un almacén saliera hacia otro asiento ni hacia el
   * espectador — la misma prueba que no depende de creerse nada del servidor,
   * porque no usa el estado.
   */
  {
    const abrirRiberas = await pedir('/arcade/mesas', {
      metodo: 'POST',
      cuerpo: { arcade: RIBERAS, nombre: 'Ana' },
    });
    comprobar('se abre una mesa de Riberas sin credencial', abrirRiberas.estado === 201, abrirRiberas.datos);
    const codigoR = String(abrirRiberas.datos.codigo ?? '');
    const genteR = [
      { nombre: 'Ana', asiento: abrirRiberas.datos.asiento as string, llave: abrirRiberas.datos.llave as string },
    ];
    for (const nombre of ['Beto', 'Cira']) {
      const r = await pedir(`/arcade/mesas/${codigoR}/asientos`, { metodo: 'POST', cuerpo: { nombre } });
      comprobar(`${nombre} se sienta en la mesa de Riberas`, r.estado === 200, r.datos);
      genteR.push({ nombre, asiento: r.datos.asiento as string, llave: r.datos.llave as string });
    }

    /*
     * ═══ SE VIGILAN LAS FICHAS Y LAS CARTAS POR LA MISMA LISTA ═══
     *
     * `misCartas` nació con el mazo y es la segunda cosa privada que este juego manda
     * por el cable. Meterla aquí el mismo día que se estrena es justamente lo que
     * este fichero se reprocha no haber hecho con `opciones`: una superficie nueva
     * que nadie vigila es una fuga esperando a que alguien la estrene.
     *
     * Las dos se guardan juntas porque las dos son cadenas con número de serie
     * —`b12:junco`, `c7:guardia`— y la búsqueda es la misma: con comillas, en la
     * misma revisión, en lo que se le mandó a otro.
     */
    const viajado: Array<{ rev: number; quien: string; texto: string; misFichas: string[] }> = [];
    const loPrivadoDe = (vista: { misFichas?: unknown; misCartas?: unknown }): string[] => {
      const fichas = Array.isArray(vista.misFichas) ? (vista.misFichas as string[]) : [];
      const cartas = Array.isArray(vista.misCartas)
        ? (vista.misCartas as { carta?: unknown }[]).flatMap((c) =>
            typeof c?.carta === 'string' ? [c.carta] : [],
          )
        : [];
      return [...fichas, ...cartas];
    };
    /*
     * LA ÚLTIMA VISTA DE CADA ASIENTO, tal y como bajó. Se guarda al mirar y no se
     * vuelve a pedir: el bucle de abajo necesita el tablero de quien NO tiene el
     * turno para saber si tiene un trueque que contestar, y pedirlo aparte serían
     * dos peticiones más por movimiento para leer exactamente lo mismo que se acaba
     * de leer en esta misma revisión.
     */
    const ultimaVistaR = new Map<string, unknown>();
    const mirarConTodosR = async (): Promise<void> => {
      for (const uno of genteR) {
        const r = await pedir(`/arcade/mesas/${codigoR}`, { llave: uno.llave });
        comprobar(`${uno.nombre} puede mirar la mesa de Riberas`, r.estado === 200, r.datos);
        const m = r.datos.mesa;
        ultimaVistaR.set(uno.asiento, m.vista);
        viajado.push({
          rev: m.rev,
          quien: uno.asiento,
          texto: JSON.stringify(m),
          misFichas: loPrivadoDe(m.vista),
        });
      }
      const espectador = await pedir(`/arcade/mesas/${codigoR}`);
      comprobar('y un espectador sin llave también', espectador.estado === 200);
      comprobar('sin ser nadie', espectador.datos.mesa.yo === null);
      comprobar(
        'y sin una sola ficha ni carta suya: quien mira no juega',
        loPrivadoDe(espectador.datos.mesa.vista).length === 0,
        { fichas: espectador.datos.mesa.vista.misFichas, cartas: espectador.datos.mesa.vista.misCartas },
      );
      viajado.push({
        rev: espectador.datos.mesa.rev,
        quien: 'espectador',
        texto: JSON.stringify(espectador.datos.mesa),
        misFichas: [],
      });
    };

    await mirarConTodosR();

    /*
     * EL TABLERO TIENE QUE VENIR DENTRO, y se dice con todas las letras: si un día
     * la proyección dejara de traerlo, la app se quedaría en la pantalla de «esta
     * mesa no trae tablero» y todo lo de abajo pasaría en verde sobre nada.
     */
    {
      const r = await pedir(`/arcade/mesas/${codigoR}`, { llave: genteR[0]!.llave });
      const tablero = r.datos.mesa.vista.tablero as Record<string, unknown> | undefined;
      comprobar('la vista de Riberas trae el tablero declarado dentro', tablero !== undefined, Object.keys(r.datos.mesa.vista ?? {}));
      comprobar(
        'con las cinco listas y el aviso, que es lo que el mueble sabe pintar',
        tablero !== undefined &&
          ['caras', 'lineas', 'nudos', 'acciones', 'paneles'].every((k) => Array.isArray(tablero[k])) &&
          typeof tablero.aviso === 'string',
        tablero === undefined ? null : Object.keys(tablero).sort(),
      );
    }

    // Un `rev` rancio al MOVER también se rechaza aquí: es la puerta, no el juego.
    {
      const ahora = await pedir(`/arcade/mesas/${codigoR}`, { llave: genteR[0]!.llave });
      const rancio = await pedir(`/arcade/mesas/${codigoR}/movimientos`, {
        metodo: 'POST',
        llave: genteR[0]!.llave,
        cuerpo: { rev: (ahora.datos.mesa.rev as number) - 1, tipo: 'riberas:empezar', carga: {} },
      });
      comprobar('un `rev` rancio al mover en Riberas se rechaza con 409', rancio.estado === 409, rancio.datos);
      comprobar('y con el estado completo dentro, para poder reintentar sin otro viaje', rancio.datos.mesa !== undefined);
    }

    /*
     * ═══ Y AHORA SE JUEGA DE VERDAD, leyendo el tablero que baja ═══
     *
     * Este bucle tenía el mismo defecto que el de proceso —tomaba el primer toque
     * que no fuera «pasar», o sea `ofrecer` en cuanto se había tirado una vez— y su
     * afirmación, «doce movimientos», la cumplía con la colocación y dieciséis
     * botones de trueque encadenados. Ahora usa la MISMA política que el de proceso
     * (ver `FAMILIAS`), así que aquí también se tira, se cobra, se construye, se
     * compra y se contestan trueques.
     *
     * Lo que NO se hace aquí es jugar hasta el ganador, y es a propósito: cada
     * movimiento por el cable son siete peticiones —el espectador, el que mueve, el
     * POST y las cuatro de `mirarConTodosR`— y una partida entera son dos mil
     * cuatrocientas. Lo que esta mitad compra es LO QUE VIAJÓ, y para eso hacen
     * falta bastantes revisiones con los almacenes llenos, no un ganador. El ganador
     * lo compra la mitad en proceso, que es donde sale barato.
     */
    let azarR: Azar = sembrar(20260906);
    const cuentaR = new Map<string, number>();
    let cortadoR: string | null = null;
    let ofertasDelTurnoR = 0;
    let turnoContadoR = -1;

    for (let i = 0; i < 90; i++) {
      const espectador = await pedir(`/arcade/mesas/${codigoR}`);
      const vista = espectador.datos.mesa.vista as {
        turnoDe?: unknown;
        momento?: unknown;
        turnosAbiertos?: unknown;
      };
      if (vista.momento === 'terminada') break;
      const revAhora = espectador.datos.mesa.rev as number;
      if (vista.turnosAbiertos !== turnoContadoR) {
        turnoContadoR = vista.turnosAbiertos as number;
        ofertasDelTurnoR = 0;
      }

      /* Primero quien NO tiene el turno, con la vista que ya bajó en esta revisión. */
      let quien = typeof vista.turnoDe === 'string' ? vista.turnoDe : genteR[0]!.asiento;
      let movimiento: Toque | null = null;
      let familia = 'nada';
      if (hayTruequeAbierto(vista)) {
        for (const otro of genteR) {
          if (otro.asiento === vista.turnoDe) continue;
          const suya = ultimaVistaR.get(otro.asiento);
          if (suya === undefined) continue;
          const respuesta = laRespuestaAlTrueque(suya, azarR);
          azarR = respuesta.azar;
          if (respuesta.jugada === null) continue;
          quien = otro.asiento;
          movimiento = respuesta.jugada;
          familia = respuesta.familia;
          break;
        }
      }

      const suyo = genteR.find((g) => g.asiento === quien) ?? genteR[0]!;
      let revDelQueMueve = revAhora;
      if (movimiento === null) {
        const mia = await pedir(`/arcade/mesas/${codigoR}`, { llave: suyo.llave });
        revDelQueMueve = mia.datos.mesa.rev as number;
        const elegida = laJugadaDelTablero(
          mia.datos.mesa.vista,
          azarR,
          ofertasDelTurnoR < TOPE_DE_OFERTAS,
        );
        azarR = elegida.azar;
        movimiento = elegida.jugada;
        familia = elegida.familia;
        if (familia === 'ofrecer') ofertasDelTurnoR++;
      }
      if (movimiento === null) {
        cortadoR = `el tablero de ${quien} no ofrece nada en «${String(vista.momento)}»`;
        break;
      }

      const r = await pedir(`/arcade/mesas/${codigoR}/movimientos`, {
        metodo: 'POST',
        llave: suyo.llave,
        cuerpo: { rev: revDelQueMueve, tipo: movimiento.tipo, carga: movimiento.carga },
      });
      if (r.estado !== 200) {
        cortadoR = `el servidor contestó ${r.estado} a ${movimiento.tipo}`;
        break;
      }
      /*
       * Si la revisión no sube, el juego ignoró el movimiento — y como el
       * movimiento salió del propio tablero, eso sería un botón mudo. Se corta y la
       * comprobación de abajo lo dice, en vez de girar sesenta veces en vacío.
       */
      if ((r.datos.mesa.rev as number) === revDelQueMueve) {
        cortadoR = `botón mudo: ${movimiento.tipo} no movió la revisión ${revDelQueMueve}`;
        break;
      }
      apuntar(cuentaR, familia);
      await mirarConTodosR();
    }

    const movimientosR = [...cuentaR.values()].reduce((a, b) => a + b, 0);
    comprobar('el juego de Riberas por HTTP no se cortó a medias', cortadoR === null, cortadoR);
    comprobar(
      'se juegan de verdad varios movimientos de Riberas por HTTP, sacados del tablero que bajó',
      movimientosR >= 60,
      { movimientosR },
    );
    /*
     * ═══ Y NO TODOS DE LA MISMA FAMILIA, QUE ES LO QUE ANTES PASABA ═══
     *
     * Sin estas dos líneas, «sesenta movimientos» lo cumple otra vez un bucle
     * atascado proponiendo trueques: son sesenta movimientos aceptados, con su
     * revisión y todo. Lo que hace falta afirmar es que la partida AVANZA, y las
     * tres cuentas que el atasco daba en cero o en uno son éstas.
     *
     * Los números son bajos aposta y no son los de la mitad en proceso: aquí la
     * semilla LA ELIGE EL SERVIDOR al abrir la mesa, así que cada ejecución juega
     * una partida distinta y una cifra ajustada sería un rojo intermitente — que en
     * esta casa acaba en «vuelve a correrlo» y de ahí en un comprobador apagado.
     */
    comprobar(
      'la partida por HTTP avanza: se tira los dados y se pasa el turno muchas veces',
      cuantas(cuentaR, 'tirar') >= 8 && cuantas(cuentaR, 'pasar') >= 8,
      Object.fromEntries(cuentaR),
    );
    comprobar(
      'y alguien que NO tiene el turno contesta a un trueque por el cable',
      cuantas(cuentaR, 'aceptar') + cuantas(cuentaR, 'rechazar') >= 4,
      Object.fromEntries(cuentaR),
    );
    console.log(
      `  por HTTP: ${[...cuentaR].sort().map(([f, n]) => `${n} ${f}`).join(' · ')}`,
    );

    /*
     * ═══ LO QUE VIAJÓ: NI UNA FICHA AJENA, EN NINGUNA REVISIÓN ═══
     *
     * Igual que con La Ronda: cada asiento dijo cuáles eran sus fichas —`misFichas`,
     * que es suyo y tiene que salir— y se exige que ninguna apareciera, EN ESA MISMA
     * REVISIÓN, en lo que se le mandó a otro ni al espectador. Con la proyección
     * quitada, cada ficha saldría en tres respuestas y esto se pondría rojo docenas
     * de veces.
     */
    const porRevR = new Map<number, typeof viajado>();
    for (const uno of viajado) {
      const lista = porRevR.get(uno.rev) ?? [];
      lista.push(uno);
      porRevR.set(uno.rev, lista);
    }

    let fichasVigiladas = 0;
    let escapesR = 0;
    const ejemplosR: string[] = [];
    for (const [rev, enEsaRev] of porRevR) {
      for (const duena of enEsaRev) {
        for (const ficha of duena.misFichas) {
          fichasVigiladas++;
          for (const otra of enEsaRev) {
            if (otra.quien === duena.quien) continue;
            /*
             * Con comillas, igual que `aparece`: una ficha lleva número de serie
             * —`b12:junco`— y sin las comillas `b1:junco` casaría dentro de
             * `b12:junco`. El número de serie está ahí precisamente para que dos
             * almacenes iguales no den falsos rojos, y buscarlo mal lo desharía.
             */
            if (!otra.texto.includes(`"${ficha}"`)) continue;
            escapesR++;
            if (ejemplosR.length < 5) {
              ejemplosR.push(`rev ${rev}: «${ficha}» de ${duena.quien} salió hacia ${otra.quien}`);
            }
          }
        }
      }
    }

    comprobar(
      'se han vigilado bastantes fichas de Riberas como para que el verde signifique algo',
      fichasVigiladas > 40,
      { fichasVigiladas, revisiones: porRevR.size },
    );
    comprobar(
      'ninguna ficha de un almacén salió hacia otro asiento ni hacia el espectador',
      escapesR === 0,
      ejemplosR,
    );
    console.log(`  ${fichasVigiladas} fichas vigiladas en ${porRevR.size} revisiones de Riberas`);

    /*
     * Y LA FORMA DE LA VISTA, cerrada igual que la de La Ronda y por lo mismo: un
     * campo nuevo que alguien añada con la mejor intención pone rojo esto y obliga a
     * venir a pensar si ese campo puede salir.
     */
    {
      const r = await pedir(`/arcade/mesas/${codigoR}`, { llave: genteR[0]!.llave });
      const campos = Object.keys(r.datos.mesa.vista).sort().join(',');
      /*
       * ═══ ESTA LÍNEA SE PUSO ROJA CON EL MAZO, Y ASÍ ES COMO TIENE QUE PASAR ═══
       *
       * Entraron ocho campos y el rojo obligó a venir a mirarlos uno a uno. Los que
       * hay que saber, porque son los que podrían haber sido una fuga:
       *
       *   · `misCartas` — MI mano, y sólo la mía. Es el gemelo de `misFichas` y viaja
       *     por la misma razón y con el mismo riesgo: cada carta lleva número de serie
       *     —`c7:guardia`— para que la de otro no se confunda con la mía, y la búsqueda
       *     de secretos de este fichero la vigila igual. La de otro asiento NO sale, y
       *     lo que sale de los demás es `colonos[].cartas`, un número.
       *   · `misPuntos` — mis puntos CON los títulos que no he enseñado. Es un número
       *     de una sola persona, y por eso no viaja en `colonos[].puntos`, que son los
       *     públicos. Un título sin revelar no cuenta para nadie más, y con él no se
       *     gana: hay que enseñarlo.
       *   · `mazo` — CUÁNTAS cartas quedan, nunca cuáles. Contar el mazo es información
       *     legítima del juego; su orden es la partida entera por venir, y es secreto
       *     entero en `loSecreto`.
       *   · `guardia`, `cartaJugada`, `turnosAbiertos`, `veredasGratis` — públicos los
       *     cuatro: un premio derivado que todos ven venir, y tres cosas que pasaron en
       *     voz alta sobre la mesa.
       */
      comprobar(
        'y la vista de Riberas manda exactamente estos campos',
        campos ===
          'cartaJugada,colonos,desde,faltaVereda,ganadores,guardia,islas,mazo,misCartas,misFichas,misPuntos,momento,paso,tablero,tirado,tratos,turnoDe,turnosAbiertos,ultimaChoza,ultimaTirada,vado,veredasGratis,yo',
        campos,
      );
    }
  }

  // ── Cortar y resincronizar ───────────────────────────────────────────────
  paso('Cortar y volver: un `rev` rancio de días NO es un error al leer');

  {
    const conRevDeAyer = await pedir(`/arcade/mesas/${codigo}?desde=0`, { llave: gente[0]!.llave });
    comprobar(
      'leer con la revisión 0 después de veinte movimientos contesta al instante',
      conRevDeAyer.estado === 200 && conRevDeAyer.ms < 3000,
      { estado: conRevDeAyer.estado, ms: conRevDeAyer.ms },
    );
    comprobar(
      'y devuelve el ESTADO COMPLETO, no un diff ni un error',
      conRevDeAyer.datos.mesa.vista.momento === 'terminada' &&
        conRevDeAyer.datos.mesa.vista.jugadores.length === 4,
      conRevDeAyer.datos.mesa.vista,
    );

    const negativo = await pedir(`/arcade/mesas/${codigo}?desde=-99999`, { llave: gente[0]!.llave });
    comprobar('y una revisión imposible tampoco es un error', negativo.estado === 200);

    /*
     * ═══ Y LA QUE VA POR DELANTE, QUE ES LA QUE COLGABA EL MÓVIL ═══
     *
     * Éstas dos de arriba miran hacia atrás —`desde=0` y `desde=-99999`— y por
     * eso las dos pasaban en verde mientras una revisión ADELANTADA se quedaba
     * esperando para siempre: la ruta comparaba con `>` donde tenía que comparar
     * con `!==`, así que `desde` mayor que la revisión de la mesa se aparcaba,
     * contestaba 204 a los veinticinco segundos, y otra vez lo mismo en la vuelta
     * siguiente. La pantalla se quedaba muerta sin un solo error.
     *
     * Y se llega ahí sin manipular nada: un servidor que contestó una revisión
     * que luego no pudo guardar, un almacén restaurado de una copia, o la
     * escritura diferida de `tickHz > 0`. El punto 4 de La Larga dice que un
     * `rev` que no cuadra es el caso normal y se resincroniza — en los dos
     * sentidos, no solo hacia atrás.
     */
    const adelantado = await pedir(`/arcade/mesas/${codigo}?desde=9999`, { llave: gente[0]!.llave });
    comprobar(
      'una revisión ADELANTADA se resincroniza al instante en vez de colgar la pantalla',
      adelantado.estado === 200 && adelantado.ms < 3000,
      { estado: adelantado.estado, ms: adelantado.ms },
    );
    comprobar(
      'y trae el estado completo, que es lo que el móvil necesita para volver a la realidad',
      adelantado.datos?.mesa?.vista?.momento === 'terminada',
      adelantado.datos?.mesa?.vista,
    );
  }

  // ── Cerrar ───────────────────────────────────────────────────────────────
  paso('Cerrar la mesa, y el aviso que se recupera al volver');

  {
    const cerrada = await pedir(`/arcade/mesas/${codigo}/cerrar`, {
      metodo: 'POST',
      llave: gente[0]!.llave,
    });
    comprobar('quien está sentado puede cerrar', cerrada.estado === 200, cerrada.datos);
    comprobar('y la mesa queda terminada', cerrada.datos.mesa.terminada === true);

    const conAvisos = await pedir(`/arcade/mesas/${codigo}?desde=0`, { llave: gente[0]!.llave });
    comprobar(
      'quien vuelve con una revisión vieja recupera el aviso que se perdió',
      Array.isArray(conAvisos.datos.avisos) &&
        conAvisos.datos.avisos.some((a: any) => a.clave === 'arcade:mesa-cerrada'),
      conAvisos.datos.avisos,
    );

    const despues = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: gente[0]!.llave,
      cuerpo: { rev: cerrada.datos.mesa.rev, tipo: 'ronda:jugar', carga: { carta: 'oros-1' } },
    });
    comprobar('y una mesa cerrada ya no admite movimientos', despues.estado === 409, despues.datos);
    comprobar('por su motivo', despues.datos.motivo === 'mesa-terminada');

    const deFuera = await pedir(`/arcade/mesas/${codigo}`, { metodo: 'DELETE' });
    comprobar('un desconocido no puede olvidar la mesa de otros', deFuera.estado === 403);
    const olvidada = await pedir(`/arcade/mesas/${codigo}`, {
      metodo: 'DELETE',
      llave: gente[0]!.llave,
    });
    comprobar('quien está sentado sí', olvidada.estado === 200);
    const yaNo = await pedir(`/arcade/mesas/${codigo}`, { llave: gente[0]!.llave });
    comprobar('y después ya no existe', yaNo.estado === 404);
  }

  // ── EL PLAZO QUE VENCE POR LA LECTURA ────────────────────────────────────
  paso('Un plazo vence por la LECTURA, sin que nadie actúe');

  {
    const conPrisa = await mesaDeCuatro(1);
    const arranque = await pedir(`/arcade/mesas/${conPrisa.codigo}`, {
      llave: conPrisa.gente[0]!.llave,
    });
    await pedir(`/arcade/mesas/${conPrisa.codigo}/movimientos`, {
      metodo: 'POST',
      llave: conPrisa.gente[0]!.llave,
      cuerpo: { rev: arranque.datos.mesa.rev, tipo: 'ronda:empezar' },
    });

    const antes = await pedir(`/arcade/mesas/${conPrisa.codigo}`, {
      llave: conPrisa.gente[0]!.llave,
    });
    const turnoAntes = antes.datos.mesa.vista.turnoDe as string;
    comprobar('con la partida repartida, le toca a alguien', typeof turnoAntes === 'string');
    comprobar('y el tic va a cero', antes.datos.mesa.tic === 0, antes.datos.mesa);
    comprobar('y la mesa dice cuándo vence', typeof antes.datos.mesa.venceEn === 'number');

    /*
     * NADIE ACTÚA. Se espera a que pase el plazo y se LEE, que es toda la
     * mecánica del §5.4: el reductor sigue siendo la única puerta, y lo que abre
     * la puerta es la lectura.
     */
    await dormir(1400);
    const despues = await pedir(`/arcade/mesas/${conPrisa.codigo}`, {
      llave: conPrisa.gente[0]!.llave,
    });
    comprobar(
      'el plazo ha vencido SIN que nadie mueva: el tic ha entrado por la lectura',
      despues.datos.mesa.tic === 1,
      despues.datos.mesa,
    );
    comprobar(
      'y el juego ha hecho lo suyo: al ausente se le ha echado una carta',
      despues.datos.mesa.vista.baza.length === 1 &&
        despues.datos.mesa.vista.baza[0].asiento === turnoAntes,
      despues.datos.mesa.vista.baza,
    );
    comprobar(
      'y el turno ha pasado al siguiente',
      despues.datos.mesa.vista.turnoDe !== turnoAntes,
      despues.datos.mesa.vista.turnoDe,
    );
    comprobar(
      'y queda anotado que fue por vencimiento y no por jugada',
      despues.datos.mesa.vista.jugadores.some((j: any) => j.pasadas === 1),
      despues.datos.mesa.vista.jugadores,
    );

    /*
     * Y LO QUE NO PUEDE PASAR: que cuatro lecturas cuenten cuatro plazos. El
     * vencimiento se reprograma desde AHORA y no desde donde vencía, así que
     * leer cuatro veces de golpe no salta cuatro turnos — que es lo que le
     * pasaría a una mesa de La Larga aparcada un fin de semana si esto fuera un
     * metrónomo.
     *
     * LO QUE ESTA COMPROBACIÓN **NO** AFIRMA, dicho para que nadie se lo crea:
     * que el candado cubra la lectura. Se probó quitándolo y esto sigue en
     * verde, porque hoy la evaluación del plazo es síncrona de principio a fin y
     * Node no interrumpe una función síncrona. Eso se afirma aparte, desde
     * dentro del almacén, más abajo.
     */
    const seguidas = await Promise.all([
      pedir(`/arcade/mesas/${conPrisa.codigo}`, { llave: conPrisa.gente[0]!.llave }),
      pedir(`/arcade/mesas/${conPrisa.codigo}`, { llave: conPrisa.gente[1]!.llave }),
      pedir(`/arcade/mesas/${conPrisa.codigo}`, { llave: conPrisa.gente[2]!.llave }),
      pedir(`/arcade/mesas/${conPrisa.codigo}`, { llave: conPrisa.gente[3]!.llave }),
    ]);
    comprobar(
      'cuatro lecturas a la vez NO hacen vencer cuatro plazos',
      seguidas.every((r) => r.datos.mesa.tic === 1),
      seguidas.map((r) => r.datos.mesa.tic),
    );
  }

  // ── Y EL PLAZO QUE NO SE PODÍA APAGAR ────────────────────────────────────
  paso('El plazo no se apaga mandando ruido: solo lo aplaza lo que cambia la partida');

  /*
   * ═══ LA GARANTÍA ENTERA DE ESTA FASE, MEDIDA CONTRA QUIEN LA ATACA ═══
   *
   * Las dos comprobaciones de plazo de aquí arriba miden el vencimiento con
   * NADIE moviendo, y por eso las dos pasaban en verde mientras el plazo no
   * vencía jamás en cuanto alguien mandaba algo. El vencimiento se reprogramaba
   * con cada movimiento que el ÁRBITRO aceptaba —o sea el de cualquiera de los
   * cuatro con la revisión fresca, incluidos los que el juego ignora—, así que
   * una petición por plazo desde cualquier asiento lo apagaba indefinidamente:
   * al que le tocaba no perdía el turno nunca.
   *
   * Medido antes del arreglo: plazo de tres segundos, un jugador sin turno
   * mandando un movimiento inexistente una vez por segundo, diez segundos, cero
   * tics. Con «La Larga» eso es congelarles el reloj a los otros cinco.
   *
   * Aquí se hace lo mismo en pequeño: quien NO tiene el turno teclea sin parar
   * durante más de dos plazos, y el plazo tiene que vencer igual.
   */
  {
    const conRuido = await mesaDeCuatro(1);
    const arranque = await pedir(`/arcade/mesas/${conRuido.codigo}`, {
      llave: conRuido.gente[0]!.llave,
    });
    const repartida = await pedir(`/arcade/mesas/${conRuido.codigo}/movimientos`, {
      metodo: 'POST',
      llave: conRuido.gente[0]!.llave,
      cuerpo: { rev: arranque.datos.mesa.rev, tipo: 'ronda:empezar' },
    });
    const turnoAntes = repartida.datos.mesa.vista.turnoDe as string;
    const molesto = conRuido.gente.find((g) => g.asiento !== turnoAntes)!;

    /*
     * Seis vueltas de medio segundo son tres segundos, o sea TRES plazos de uno.
     *
     * ═══ Y EL RUIDO PIDE LA REVISIÓN FRESCA ANTES DE CADA ENVÍO ═══
     *
     * Eso no es realismo decorativo: es lo único que hace que esta comprobación
     * sirva. La primera versión mandaba siempre la MISMA `rev`, y con eso pasaba
     * en verde aunque se deshiciera el arreglo — al segundo envío la revisión ya
     * era rancia y el atacante se quedaba fuera solo. Se descubrió rompiendo el
     * arreglo a propósito y viendo que no se ponía roja.
     *
     * Quien ataca de verdad lee la mesa y vuelve a mandar, que es exactamente lo
     * que se midió contra el servidor levantado. Así que el ruido va con la
     * revisión de ahora mismo, y lo que se afirma es lo que importa: por muchas
     * peticiones frescas que mande alguien a quien no le toca, el plazo del que
     * SÍ tiene el turno vence igual.
     */
    for (let i = 0; i < 6; i++) {
      const ahora = await pedir(`/arcade/mesas/${conRuido.codigo}`, { llave: molesto.llave });
      await pedir(`/arcade/mesas/${conRuido.codigo}/movimientos`, {
        metodo: 'POST',
        llave: molesto.llave,
        cuerpo: { rev: ahora.datos.mesa.rev, tipo: 'ruido:para-que-no-venza' },
      });
      await dormir(500);
    }

    const despues = await pedir(`/arcade/mesas/${conRuido.codigo}`, {
      llave: conRuido.gente[0]!.llave,
    });
    comprobar(
      'el plazo ha vencido pese al ruido: mandar movimientos que el juego ignora no aplaza nada',
      despues.datos.mesa.tic >= 1,
      { tic: despues.datos.mesa.tic, ms: 3000, plazo: '1 s' },
    );
    comprobar(
      'y a quien tenía el turno se le ha pasado de verdad',
      despues.datos.mesa.vista.jugadores.some((j: any) => j.pasadas >= 1),
      despues.datos.mesa.vista.jugadores,
    );

    /*
     * Y LA OTRA MITAD, que es la que impide arreglar esto de la forma fácil: un
     * movimiento que SÍ cambia la partida tiene que seguir aplazando el plazo.
     * Sin ella, alguien podría dejar el vencimiento fijo desde que se repartió y
     * esta comprobación seguiría en verde mientras a quien juega en el segundo
     * cuarenta y nueve se le pasa el turno por lo que tardó el anterior.
     */
    const antesDeJugar = await pedir(`/arcade/mesas/${conRuido.codigo}`, {
      llave: conRuido.gente[0]!.llave,
    });
    const aQuienToca = conRuido.gente.find(
      (g) => g.asiento === antesDeJugar.datos.mesa.vista.turnoDe,
    )!;
    const suMano = (
      await pedir(`/arcade/mesas/${conRuido.codigo}`, { llave: aQuienToca.llave })
    ).datos.mesa.vista.miMano as string[];
    const jugada = await pedir(`/arcade/mesas/${conRuido.codigo}/movimientos`, {
      metodo: 'POST',
      llave: aQuienToca.llave,
      cuerpo: {
        rev: antesDeJugar.datos.mesa.rev,
        tipo: 'ronda:jugar',
        carga: { carta: suMano[0] },
      },
    });
    comprobar(
      'y un movimiento que SÍ cambia la partida vuelve a dar el plazo entero',
      jugada.estado === 200 && (jugada.datos.mesa.venceEn as number) - Date.now() > 500,
      { venceEn: jugada.datos.mesa.venceEn, ahora: Date.now() },
    );
  }

  // ── EL SEXTO VERBO ───────────────────────────────────────────────────────
  paso('El sexto verbo: una espera aparcada se despierta por VENCIMIENTO');

  {
    /*
     * ═══ QUÉ MIDE ESTA COMPROBACIÓN, EXACTAMENTE ═══
     *
     * Una lectura con `?desde=N` y nada nuevo que contar se aparca dentro de
     * `esperarCambio`, que dura VEINTICINCO SEGUNDOS —una constante de módulo de
     * `hub.ts`, y es uno de los dos peajes que `verify:arcade-pobre` mide—.
     *
     * Aquí nadie va a mover, así que nadie va a llamar a `avisarCambio`. Lo único
     * que puede soltar esa espera antes de los veinticinco segundos es el sexto
     * verbo: el despertador por vencimiento que se pidió justo antes de aparcarse.
     *
     * O sea que el umbral no es cosmético. Si alguien quita `despertarAlVencer`
     * de la ruta, esto no falla por poco: tarda veinticinco segundos en vez de
     * dos, y se pone rojo. Y si alguien lo deja pero mal —despertando a la mesa
     * equivocada, o reprogramando siempre hacia delante— pasa exactamente lo
     * mismo.
     */
    const conPrisa = await mesaDeCuatro(2);
    const arranque = await pedir(`/arcade/mesas/${conPrisa.codigo}`, {
      llave: conPrisa.gente[0]!.llave,
    });
    const repartida = await pedir(`/arcade/mesas/${conPrisa.codigo}/movimientos`, {
      metodo: 'POST',
      llave: conPrisa.gente[0]!.llave,
      cuerpo: { rev: arranque.datos.mesa.rev, tipo: 'ronda:empezar' },
    });
    const rev = repartida.datos.mesa.rev as number;

    const aparcada = await pedir(`/arcade/mesas/${conPrisa.codigo}?desde=${rev}`, {
      llave: conPrisa.gente[0]!.llave,
    });
    comprobar(
      'la espera se suelta por el vencimiento y no por el plazo del sondeo',
      aparcada.ms < 12_000,
      { ms: aparcada.ms, umbral: 'muy por debajo de los 25 s de `hub.ts`' },
    );
    comprobar('y no se suelta antes de tiempo', aparcada.ms > 1_000, { ms: aparcada.ms });
    comprobar('contesta con contenido y no con un 204', aparcada.estado === 200, aparcada.estado);
    comprobar(
      'y lo que trae es el tic ya metido',
      aparcada.datos.mesa.tic === 1 && aparcada.datos.mesa.rev > rev,
      aparcada.datos.mesa,
    );
    console.log(`  la espera aparcada volvió en ${(aparcada.ms / 1000).toFixed(1)} s`);
  }

  // ── El presupuesto, MEDIDO ───────────────────────────────────────────────
  paso('El presupuesto por movimiento: medido con el servidor levantado, y ya exigido');

  {
    const r = await pedir('/arcade/presupuesto');
    comprobar('el presupuesto se sirve', r.estado === 200);
    const laRonda = (r.datos.medidas ?? []).find((m: any) => m.arcade === RONDA);
    comprobar('y hay medidas de La Ronda', laRonda !== undefined, r.datos);
    comprobar('se han cronometrado movimientos de verdad', laRonda.movimientos > 20, laRonda);
    comprobar('con un peor tiempo anotado', laRonda.msPeor > 0, laRonda);
    comprobar('y el movimiento que lo causó', typeof laRonda.peorMovimiento === 'string');
    comprobar('y un tamaño de estado medido', laRonda.bytesPeor > 0, laRonda);
    /*
     * ═══ ESTO DECÍA «Y NO HAY TOPE», Y LA FASE 5 LO PUSO ═══
     *
     * La frase entera era «exigir es de la fase 5, cuando entren terceros». Los
     * terceros han entrado —`ARCADES_EXTERNOS`— y con ellos hay código ajeno en
     * este mismo proceso: un reductor suyo mal escrito no estropea su partida, se
     * lleva por delante las veladas en curso. El tope existe y sale publicado, para
     * que quien escriba un arcade de fuera sepa contra qué se mide sin tener este
     * repositorio delante.
     *
     * Lo que ese tope garantiza y lo que NO —que no se puede interrumpir el primer
     * movimiento que se pase, porque Node es de un solo hilo— está en la cabecera
     * de `presupuesto.ts`, y quien lo ejercita es `verify:presupuesto`. Aquí sólo
     * se afirma que la báscula sigue midiendo con el servidor levantado y que los
     * topes viajan.
     */
    comprobar(
      'y ahora SÍ hay tope, y viaja publicado con las medidas',
      typeof r.datos.topeMs === 'number' && typeof r.datos.topeBytes === 'number',
      r.datos,
    );
    comprobar(
      'con los dos juegos de esta mesa muy por debajo de él',
      laRonda.msPeor < r.datos.topeMs && laRonda.bytesPeor < r.datos.topeBytes,
      { peorMs: laRonda.msPeor, peorBytes: laRonda.bytesPeor, topes: [r.datos.topeMs, r.datos.topeBytes] },
    );
    comprobar('y nadie está apartado', (r.datos.apartados ?? []).length === 0, r.datos.apartados);
    console.log(
      `  La Ronda · ${laRonda.movimientos} movimientos · peor ${laRonda.msPeor.toFixed(2)} ms ` +
        `(${laRonda.peorMovimiento}) · estado mayor ${laRonda.bytesPeor} caracteres`,
    );
  }

  // ── EL LOBBY: LA FIGURA DE CADA ASIENTO ──────────────────────────────────
  paso('El lobby: cada asiento elige una figura, y los demás la ven al instante');

  {
    /*
     * ═══ QUÉ SE AFIRMA AQUÍ, Y POR QUÉ ES DE LA MESA Y NO DE NINGÚN JUEGO ═══
     *
     * Un lobby 3D previo a la partida en el que cada persona elige un aventurero
     * necesita tres cosas de la autoridad, y ninguna de las tres sabe qué es un
     * aventurero: que un asiento pueda llevar una `figura` —una cadena opaca que
     * escribe y lee el cliente—, que cambiarla despierte a los demás igual que
     * los despierta sentarse, y que se pueda saber si la mesa se reúne o ya juega
     * sin abrir la vista del juego (`empezada`). Se comprueba POR EL CABLE, que
     * es donde se vería si la figura se colara con la forma equivocada, se
     * quedara sin avisar, o tardara los veinticinco segundos del sondeo en llegar.
     */
    const abierta = await pedir('/arcade/mesas', {
      metodo: 'POST',
      cuerpo: { arcade: RONDA, nombre: 'Ana', plazoSegundos: 600, figura: 'centinela' },
    });
    comprobar('abrir una mesa con figura devuelve 201', abierta.estado === 201, abierta.datos);
    const cod = String(abierta.datos.codigo ?? '');
    const ana = { asiento: abierta.datos.asiento as string, llave: abierta.datos.llave as string };
    const asientoDe = (mesa: any, id: string): any =>
      ((mesa?.asientos ?? []) as any[]).find((a) => a.id === id);
    comprobar(
      'y quien abrió ve su figura en su propio asiento',
      asientoDe(abierta.datos.mesa, ana.asiento)?.figura === 'centinela',
      abierta.datos.mesa?.asientos,
    );
    comprobar(
      '`empezada` es false mientras la mesa se reúne',
      abierta.datos.mesa?.empezada === false,
      abierta.datos.mesa?.empezada,
    );

    const bruno = await pedir(`/arcade/mesas/${cod}/asientos`, {
      metodo: 'POST',
      cuerpo: { nombre: 'Bruno', figura: 'cazadora' },
    });
    comprobar('sentarse con figura devuelve 200', bruno.estado === 200, bruno.datos);
    const elDeBruno = { asiento: bruno.datos.asiento as string, llave: bruno.datos.llave as string };
    comprobar(
      'Bruno ve la figura de Ana en la vista que recibe al sentarse',
      asientoDe(bruno.datos.mesa, ana.asiento)?.figura === 'centinela',
      bruno.datos.mesa?.asientos,
    );
    comprobar(
      'y la suya',
      asientoDe(bruno.datos.mesa, elDeBruno.asiento)?.figura === 'cazadora',
      bruno.datos.mesa?.asientos,
    );

    const carla = await pedir(`/arcade/mesas/${cod}/asientos`, {
      metodo: 'POST',
      cuerpo: { nombre: 'Carla' },
    });
    comprobar('sentarse sin figura sigue valiendo: la figura es opcional', carla.estado === 200, carla.datos);
    const elDeCarla = { asiento: carla.datos.asiento as string, llave: carla.datos.llave as string };

    const espectador = await pedir(`/arcade/mesas/${cod}`);
    comprobar(
      'un espectador sin llave ve las figuras: son públicas, como los nombres',
      asientoDe(espectador.datos.mesa, ana.asiento)?.figura === 'centinela' &&
        asientoDe(espectador.datos.mesa, elDeBruno.asiento)?.figura === 'cazadora',
      espectador.datos.mesa?.asientos,
    );
    const clavesDeCarla = Object.keys(asientoDe(espectador.datos.mesa, elDeCarla.asiento) ?? {})
      .sort()
      .join(',');
    comprobar(
      'un asiento SIN figura viaja sin la clave, no con `null`: exactamente id,nombre,presente',
      clavesDeCarla === 'id,nombre,presente',
      clavesDeCarla,
    );
    const clavesDeAna = Object.keys(asientoDe(espectador.datos.mesa, ana.asiento) ?? {})
      .sort()
      .join(',');
    comprobar(
      'y uno CON figura exactamente figura,id,nombre,presente',
      clavesDeAna === 'figura,id,nombre,presente',
      clavesDeAna,
    );
    comprobar(
      'y la llave sigue sin salir en ninguna vista',
      !JSON.stringify(espectador.datos).includes(ana.llave) &&
        !JSON.stringify(bruno.datos.mesa).includes(ana.llave),
    );

    /*
     * ═══ EL CAMBIO DESPIERTA AL QUE SONDEA, Y ÉSE ES EL UMBRAL QUE IMPORTA ═══
     *
     * Bruno se aparca con `?desde=rev` y nadie mueve. Lo único que puede soltar
     * esa espera antes de los veinticinco segundos de `hub.ts` es que la ruta de
     * vestirse avise por el canal después de subir la revisión. Si alguien quita
     * el aviso, esto no falla por poco: tarda veinticinco segundos y se pone rojo.
     */
    const antesDeVestir = await pedir(`/arcade/mesas/${cod}`, { llave: ana.llave });
    const rev = antesDeVestir.datos.mesa.rev as number;
    const aparcada = pedir(`/arcade/mesas/${cod}?desde=${String(rev)}`, { llave: elDeBruno.llave });
    await dormir(400);
    const vestida = await pedir(`/arcade/mesas/${cod}/figura`, {
      metodo: 'PUT',
      llave: ana.llave,
      cuerpo: { figura: 'druida' },
    });
    comprobar(
      'PUT /figura contesta 200 con la mesa dentro',
      vestida.estado === 200 && vestida.datos.mesa !== undefined,
      vestida.datos,
    );
    comprobar(
      'y la figura ha cambiado en la vista de quien vistió',
      asientoDe(vestida.datos.mesa, ana.asiento)?.figura === 'druida',
      vestida.datos.mesa?.asientos,
    );
    comprobar(
      'y la revisión ha subido EN UNO: los demás tienen que enterarse',
      vestida.datos.mesa?.rev === rev + 1,
      { antes: rev, despues: vestida.datos.mesa?.rev },
    );
    const despierta = await aparcada;
    comprobar(
      'la lectura aparcada del otro asiento se despertó en mucho menos de 25 s',
      despierta.ms < 5_000,
      { ms: despierta.ms, umbral: 'muy por debajo de los 25 s de `hub.ts`' },
    );
    comprobar('con un 200, y no con un 204', despierta.estado === 200, despierta.estado);
    comprobar(
      'y con la figura nueva ya dentro',
      asientoDe(despierta.datos.mesa, ana.asiento)?.figura === 'druida',
      despierta.datos.mesa?.asientos,
    );
    console.log(`  la espera aparcada volvió en ${(despierta.ms / 1000).toFixed(1)} s con la figura nueva`);

    const repetida = await pedir(`/arcade/mesas/${cod}/figura`, {
      metodo: 'PUT',
      llave: ana.llave,
      cuerpo: { figura: 'druida' },
    });
    comprobar(
      'la misma figura otra vez es 200 y NO sube la revisión: no se despierta a nadie por nada',
      repetida.estado === 200 && repetida.datos.mesa?.rev === rev + 1,
      repetida.datos.mesa?.rev,
    );

    // ── Sin llave, y con una que no es de aquí ──
    const sinLlave = await pedir(`/arcade/mesas/${cod}/figura`, {
      metodo: 'PUT',
      cuerpo: { figura: 'ermitano' },
    });
    comprobar(
      'vestirse SIN LLAVE se rechaza con 403, el mismo código que mover sin asiento',
      sinLlave.estado === 403,
      sinLlave.datos,
    );
    comprobar('y por el mismo motivo', sinLlave.datos.motivo === 'no-estas-sentado', sinLlave.datos);
    const llaveAjena = await pedir(`/arcade/mesas/${cod}/figura`, {
      metodo: 'PUT',
      llave: 'UNALLAVEQUENADIEREPARTIO',
      cuerpo: { figura: 'ermitano' },
    });
    comprobar('y una llave inventada tampoco viste a nadie', llaveAjena.estado === 403, llaveAjena.datos);

    // ── Mal escritas: 400, y NUNCA normalizadas en silencio ──
    const revTrasVestir = repetida.datos.mesa?.rev as number;
    for (const mala of [
      'Caballero',
      'a/b',
      'x'.repeat(40),
      '',
      '-druida',
      'dru--ida',
      'druida_',
      'ñu',
      'a.b',
      'a b',
    ]) {
      const r = await pedir(`/arcade/mesas/${cod}/figura`, {
        metodo: 'PUT',
        llave: ana.llave,
        cuerpo: { figura: mala },
      });
      comprobar(
        `una figura mal escrita («${mala.slice(0, 12)}») es 400 y no se normaliza`,
        r.estado === 400 && r.datos.motivo === 'figura-mal-escrita',
        r.datos,
      );
    }
    const noCadena = await pedir(`/arcade/mesas/${cod}/figura`, {
      metodo: 'PUT',
      llave: ana.llave,
      cuerpo: { figura: 7 },
    });
    comprobar(
      'y una figura que no es una cadena es 400 y lo dice',
      noCadena.estado === 400 && /cadena/.test(String(noCadena.datos.error)),
      noCadena.datos,
    );
    const sinFigura = await pedir(`/arcade/mesas/${cod}/figura`, {
      metodo: 'PUT',
      llave: ana.llave,
      cuerpo: {},
    });
    comprobar('y sin `figura` en el cuerpo, 400', sinFigura.estado === 400, sinFigura.datos);
    const intacta = await pedir(`/arcade/mesas/${cod}`, { llave: ana.llave });
    comprobar(
      'y después de todos los rechazos nada ha cambiado: ni la figura ni la revisión',
      asientoDe(intacta.datos.mesa, ana.asiento)?.figura === 'druida' &&
        intacta.datos.mesa.rev === revTrasVestir,
      { asientos: intacta.datos.mesa?.asientos, rev: intacta.datos.mesa?.rev },
    );

    const mesasAntes = (await pedir('/arcade/diagnostico')).datos.mesas as number;
    const abrirMal = await pedir('/arcade/mesas', {
      metodo: 'POST',
      cuerpo: { arcade: RONDA, nombre: 'Eva', figura: 'Caballero' },
    });
    comprobar(
      'abrir una mesa con la figura mal escrita es 400',
      abrirMal.estado === 400 && abrirMal.datos.motivo === 'figura-mal-escrita',
      abrirMal.datos,
    );
    comprobar(
      'y NO deja una mesa detrás',
      (await pedir('/arcade/diagnostico')).datos.mesas === mesasAntes,
    );
    const abrirNoCadena = await pedir('/arcade/mesas', {
      metodo: 'POST',
      cuerpo: { arcade: RONDA, nombre: 'Eva', figura: ['x'] },
    });
    comprobar(
      'y con una figura que no es cadena, 400 que lo dice',
      abrirNoCadena.estado === 400 && /cadena/.test(String(abrirNoCadena.datos.error)),
      abrirNoCadena.datos,
    );
    const sentarseMal = await pedir(`/arcade/mesas/${cod}/asientos`, {
      metodo: 'POST',
      cuerpo: { nombre: 'Diego', figura: 'a/b' },
    });
    comprobar(
      'sentarse con la figura mal escrita es 400',
      sentarseMal.estado === 400 && sentarseMal.datos.motivo === 'figura-mal-escrita',
      sentarseMal.datos,
    );
    const sinSentar = await pedir(`/arcade/mesas/${cod}`);
    comprobar(
      'y no se ha sentado: siguen siendo tres, con la misma revisión',
      sinSentar.datos.mesa.asientos.length === 3 && sinSentar.datos.mesa.rev === revTrasVestir,
      sinSentar.datos.mesa?.asientos,
    );

    // ── `empezada`: reunirse no es empezar; el primer movimiento aceptado sí ──
    const diego = await pedir(`/arcade/mesas/${cod}/asientos`, {
      metodo: 'POST',
      cuerpo: { nombre: 'Diego', figura: 'ermitano' },
    });
    comprobar('el cuarto se sienta, con figura', diego.estado === 200, diego.datos);
    comprobar(
      'y con cuatro sentados `empezada` sigue siendo false: reunirse no es empezar',
      diego.datos.mesa?.empezada === false,
      diego.datos.mesa?.empezada,
    );
    const repartida = await pedir(`/arcade/mesas/${cod}/movimientos`, {
      metodo: 'POST',
      llave: ana.llave,
      cuerpo: { rev: diego.datos.mesa.rev, tipo: 'ronda:empezar' },
    });
    comprobar('se reparte', repartida.estado === 200, repartida.datos);
    comprobar(
      'y tras el primer movimiento aceptado `empezada` es true en la respuesta',
      repartida.datos.mesa?.empezada === true,
      repartida.datos.mesa?.empezada,
    );
    const mirando = await pedir(`/arcade/mesas/${cod}`);
    comprobar(
      'y también para quien mira sin llave, sin abrir la vista del juego',
      mirando.datos.mesa?.empezada === true,
      mirando.datos.mesa?.empezada,
    );

    // ── Vestirse con la partida en marcha: no es un movimiento ──
    const antesDeLaSegunda = await pedir(`/arcade/mesas/${cod}`, { llave: elDeBruno.llave });
    const a = antesDeLaSegunda.datos.mesa;
    const enMarcha = await pedir(`/arcade/mesas/${cod}/figura`, {
      metodo: 'PUT',
      llave: elDeBruno.llave,
      cuerpo: { figura: 'barquera' },
    });
    comprobar(
      'CON LA PARTIDA EMPEZADA se sigue pudiendo cambiar de figura',
      enMarcha.estado === 200 && asientoDe(enMarcha.datos.mesa, elDeBruno.asiento)?.figura === 'barquera',
      enMarcha.datos,
    );
    const d = enMarcha.datos.mesa ?? {};
    comprobar('sube la revisión en uno', d.rev === a.rev + 1, { antes: a.rev, despues: d.rev });
    comprobar(
      'y NO toca el tic ni el plazo: vestirse no es un movimiento y no reprograma nada',
      d.tic === a.tic && d.venceEn === a.venceEn && a.venceEn !== null,
      { antes: { tic: a.tic, venceEn: a.venceEn }, despues: { tic: d.tic, venceEn: d.venceEn } },
    );
    comprobar('ni desde cuándo se espera', d.turnoDesde === a.turnoDesde, {
      antes: a.turnoDesde,
      despues: d.turnoDesde,
    });
    comprobar(
      'ni la vista del juego: la mano y el turno son los mismos',
      JSON.stringify(d.vista) === JSON.stringify(a.vista),
    );
    comprobar(
      'y la partida sigue empezada y sin terminar',
      d.empezada === true && d.terminada === false,
      { empezada: d.empezada, terminada: d.terminada },
    );
  }

  // ── LOS MODELOS 3D ───────────────────────────────────────────────────────
  paso('Los modelos 3D se sirven como bytes: el servidor no sabe qué son');

  {
    /*
     * El lobby pide el tablero y los aventureros al MISMO origen que la mesa, por
     * `/api/arcade/modelos`. Lo que se afirma es lo que un visor 3D necesita y lo
     * que un servidor mal montado rompe sin error: el tipo —servido como
     * `application/octet-stream` el navegador lo descarga en vez de cargarlo—, el
     * tamaño entero, `HEAD`, la caché, y que un nombre fuera de forma no llega al
     * sistema de ficheros. El servidor en esta prueba arranca en una carpeta
     * temporal con `MODELOS_DIR` puesta; la búsqueda relativa se comprueba en
     * proceso más abajo.
     */
    const fichero = path.join(REPO, 'escenas', 'modelos', 'tablero.glb');
    comprobar('el tablero existe en el repositorio: `escenas/modelos/tablero.glb`', fs.existsSync(fichero), fichero);
    const tamano = fs.existsSync(fichero) ? fs.statSync(fichero).size : -1;
    const url = `${BASE}/arcade/modelos/tablero.glb`;

    const r = await fetch(url);
    const bytes = new Uint8Array(await r.arrayBuffer());
    comprobar('GET /api/arcade/modelos/tablero.glb contesta 200', r.status === 200, r.status);
    const tipo = r.headers.get('content-type') ?? '';
    comprobar('con `Content-Type: model/gltf-binary`', tipo.startsWith('model/gltf-binary'), tipo);
    comprobar(
      'y anuncia y manda el tamaño del fichero real',
      Number(r.headers.get('content-length')) === tamano && bytes.length === tamano,
      { anunciado: r.headers.get('content-length'), recibido: bytes.length, real: tamano },
    );
    comprobar(
      'y lo que llega empieza por la firma «glTF»: son los bytes del fichero, no un HTML',
      bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46,
      Array.from(bytes.slice(0, 4)),
    );
    const cache = r.headers.get('cache-control') ?? '';
    comprobar(
      'con `Cache-Control: public, max-age=3600`',
      /public/.test(cache) && /max-age=3600/.test(cache),
      cache,
    );
    const etag = r.headers.get('etag');
    comprobar('y un ETag', etag !== null && etag.length > 0, etag);

    const head = await fetch(url, { method: 'HEAD' });
    const cuerpoDelHead = await head.text();
    comprobar(
      'HEAD contesta 200 con el mismo tamaño anunciado y sin cuerpo',
      head.status === 200 &&
        Number(head.headers.get('content-length')) === tamano &&
        cuerpoDelHead.length === 0,
      { estado: head.status, anunciado: head.headers.get('content-length'), cuerpo: cuerpoDelHead.length },
    );
    /*
     * ═══ CON `node:http` Y NO CON `fetch`, Y HAY QUE DECIR POR QUÉ ═══
     *
     * El `fetch` de Node (undici) sigue la especificación al pie de la letra, y
     * ésta manda que una petición a la que se le pone `If-None-Match` a mano viaje
     * además con `Cache-Control: no-cache` y `Pragma: no-cache`. `fresh` —lo que
     * `send` usa para decidir el 304— ve ese `no-cache` y contesta 200 SIEMPRE,
     * que es lo correcto: el cliente ha dicho que no quiere una respuesta de
     * caché. O sea que con `fetch` esta comprobación era roja con el servidor
     * perfectamente bien (medido: las cabeceras que llegaban al servidor llevaban
     * el `no-cache` que nadie había escrito). Un navegador no añade esa cabecera
     * a sus revalidaciones, y `node:http` manda exactamente lo que se le da.
     */
    const condicional = await new Promise<number>((resolver, rechazar) => {
      const peticion = http.request(
        url,
        { method: 'GET', headers: { 'If-None-Match': etag ?? '' } },
        (respuesta) => {
          respuesta.resume();
          respuesta.on('end', () => resolver(respuesta.statusCode ?? 0));
        },
      );
      peticion.on('error', rechazar);
      peticion.end();
    });
    comprobar(
      'y con `If-None-Match` contesta 304: el cliente no vuelve a bajar cuatro megas',
      condicional === 304,
      condicional,
    );

    /*
     * LOS DADOS, POR SU RUTA FIJA. `dados.glb` es el D6 de KayKit horneado, unos kB,
     * en un fichero aparte del tablero (ver `escenas/nombres.ts`, `MODELO.dado`). Se
     * afirma lo mismo que del tablero y además que pesa lo que un dado y no lo que un
     * tablero: si un día alguien lo compilara con la textura dentro, la ruta seguiría
     * contestando 200 y el teléfono no lo abriría.
     */
    const ficheroDeLosDados = path.join(REPO, 'escenas', 'modelos', 'dados.glb');
    comprobar('los dados existen en el repositorio: `escenas/modelos/dados.glb`', fs.existsSync(ficheroDeLosDados), ficheroDeLosDados);
    const tamanoDeLosDados = fs.existsSync(ficheroDeLosDados) ? fs.statSync(ficheroDeLosDados).size : -1;
    const dados = await fetch(`${BASE}/arcade/modelos/dados.glb`);
    const bytesDeLosDados = new Uint8Array(await dados.arrayBuffer());
    comprobar(
      'GET /api/arcade/modelos/dados.glb contesta 200 con `model/gltf-binary` y la misma caché que el tablero',
      dados.status === 200 &&
        (dados.headers.get('content-type') ?? '').startsWith('model/gltf-binary') &&
        /max-age=3600/.test(dados.headers.get('cache-control') ?? ''),
      { estado: dados.status, tipo: dados.headers.get('content-type'), cache: dados.headers.get('cache-control') },
    );
    comprobar(
      'y manda los bytes del fichero real, que empiezan por «glTF» y pesan menos de 100 kB',
      bytesDeLosDados.length === tamanoDeLosDados &&
        tamanoDeLosDados > 0 &&
        tamanoDeLosDados < 100 * 1024 &&
        bytesDeLosDados[0] === 0x67 && bytesDeLosDados[1] === 0x6c && bytesDeLosDados[2] === 0x54 && bytesDeLosDados[3] === 0x46,
      { recibido: bytesDeLosDados.length, real: tamanoDeLosDados },
    );

    for (const malo of [
      '..%2Ftablero.glb',
      '%2e%2e%2ftablero.glb',
      'Caballero.glb',
      'caballero.gltf',
      'caba.llero.glb',
      'sin-extension',
      'caballero.glb%00',
      `${'x'.repeat(70)}.glb`,
    ]) {
      const rm = await fetch(`${BASE}/arcade/modelos/aventureros/${malo}`);
      await rm.arrayBuffer();
      comprobar(
        `un aventurero con nombre fuera de forma («${malo.slice(0, 20)}») es 404`,
        rm.status === 404,
        rm.status,
      );
    }
    const bienFormadoPeroAusente = await pedir('/arcade/modelos/aventureros/no-hay-nadie-con-este-nombre.glb');
    comprobar(
      'un nombre bien formado que no existe es un 404 limpio en JSON, no un 500',
      bienFormadoPeroAusente.estado === 404 && typeof bienFormadoPeroAusente.datos?.error === 'string',
      bienFormadoPeroAusente.datos,
    );
    const otro = await pedir('/arcade/modelos/otro.glb');
    comprobar('y fuera de las dos rutas no se sirve nada', otro.estado === 404, otro.estado);
    const salud = await pedir('/salud');
    comprobar('y el servidor sigue en pie después de todo eso', salud.estado === 200, salud.estado);
  }

  // ── LA MESA PERSISTE ─────────────────────────────────────────────────────
  paso('La mesa persiste: el proceso muere y la partida sigue ahí');

  {
    const viva = await mesaDeCuatro(0);
    const arranque = await pedir(`/arcade/mesas/${viva.codigo}`, { llave: viva.gente[0]!.llave });
    await pedir(`/arcade/mesas/${viva.codigo}/movimientos`, {
      metodo: 'POST',
      llave: viva.gente[0]!.llave,
      cuerpo: { rev: arranque.datos.mesa.rev, tipo: 'ronda:empezar' },
    });
    /*
     * ═══ Y LAS FIGURAS, QUE SE GUARDAN CON LA SILLA Y SE LEEN COMO VENGAN ═══
     *
     * Tres sillas, tres casos, en el MISMO fichero que va a leer el proceso nuevo:
     *   · la de Ana lleva figura y tiene que volver;
     *   · a la de Bruno se le QUITA del fichero a mano, que es exactamente lo que
     *     trae una mesa guardada antes de que este campo existiera: una silla sin
     *     figura, no una mesa corrupta;
     *   · a la de Carla se le escribe una figura fuera de forma, que la puerta de
     *     entrada habría rechazado: al leer se quita, y no sale por el cable.
     * Se edita el fichero con el servidor vivo y se le mata sin volcar, así que lo
     * que arranca lee lo editado y no lo que el proceso tenía en memoria.
     */
    for (const [quien, figura] of [
      [0, 'centinela'],
      [1, 'cazadora'],
      [2, 'druida'],
    ] as const) {
      const v = await pedir(`/arcade/mesas/${viva.codigo}/figura`, {
        metodo: 'PUT',
        llave: viva.gente[quien]!.llave,
        cuerpo: { figura },
      });
      comprobar(`${viva.gente[quien]!.nombre} se viste de ${figura} con la partida en marcha`, v.estado === 200, v.datos);
    }
    const antes = await pedir(`/arcade/mesas/${viva.codigo}`, { llave: viva.gente[0]!.llave });
    const manoAntes = (antes.datos.mesa.vista.miMano as string[]).join(',');
    const revAntes = antes.datos.mesa.rev as number;

    const ficheroDeLaMesa = path.join(dir, 'data', 'mesas', `${viva.codigo}.json`);
    comprobar(
      'con `tickHz: 0` la escritura es SÍNCRONA, así que el fichero ya está en disco',
      fs.existsSync(ficheroDeLaMesa),
    );
    {
      const guardado = JSON.parse(fs.readFileSync(ficheroDeLaMesa, 'utf8'));
      const sillaGuardada = (id: string): any =>
        ((guardado.mesa?.sillas ?? []) as any[]).find((s) => s.id === id);
      comprobar(
        'el fichero guarda la silla ENTERA, figura incluida: no hay una lista de campos a mano',
        sillaGuardada(viva.gente[0]!.asiento)?.figura === 'centinela',
        guardado.mesa?.sillas,
      );
      comprobar(
        'y sigue escribiendo la versión 2: un campo nuevo que un lector viejo ignora no sube el número',
        guardado.version === 2,
        guardado.version,
      );
      delete sillaGuardada(viva.gente[1]!.asiento).figura;
      sillaGuardada(viva.gente[2]!.asiento).figura = 'Caballero';
      fs.writeFileSync(ficheroDeLaMesa, JSON.stringify(guardado), 'utf8');
    }

    /*
     * ═══ SE MATA A LO BRUTO, Y ESO ES LO QUE HACE LA PRUEBA FUERTE ═══
     *
     * No se manda `SIGTERM`: se mata el proceso sin darle ocasión de volcar
     * nada. Lo que se está comprobando es la ESCRITURA SÍNCRONA del §6 —cuando
     * el servidor contestó «hecho», ya estaba guardado— y no el volcado de la
     * despedida, que es una red por debajo y se comprueba aparte.
     *
     * Y hay una razón de peso para probarlo así en esta máquina: Windows no
     * entrega `SIGTERM` a un proceso hijo, lo mata. O sea que si esta
     * comprobación dependiera de la señal, aquí sería siempre verde por el
     * motivo equivocado.
     */
    servidor?.kill();
    await esperarAQueMuera(servidor!);
    servidor = levantar();
    await esperarAlServidor();

    const despues = await pedir(`/arcade/mesas/${viva.codigo}`, { llave: viva.gente[0]!.llave });
    comprobar('la mesa sigue ahí después de que el proceso muriera', despues.estado === 200, despues.datos);
    comprobar('con la misma revisión', despues.datos.mesa.rev === revAntes, {
      antes: revAntes,
      despues: despues.datos.mesa.rev,
    });
    {
      const asientoTras = (id: string): any =>
        ((despues.datos.mesa?.asientos ?? []) as any[]).find((a) => a.id === id);
      comprobar(
        'la figura guardada vuelve con la mesa',
        asientoTras(viva.gente[0]!.asiento)?.figura === 'centinela',
        despues.datos.mesa?.asientos,
      );
      const deBruno = asientoTras(viva.gente[1]!.asiento);
      comprobar(
        'una silla guardada SIN figura —una mesa de antes de este campo— es una silla sin figura, no una mesa corrupta',
        deBruno !== undefined && !('figura' in deBruno),
        deBruno,
      );
      const deCarla = asientoTras(viva.gente[2]!.asiento);
      comprobar(
        'y una figura fuera de forma escrita en el disco se quita al leer en vez de salir por el cable',
        deCarla !== undefined && !('figura' in deCarla),
        deCarla,
      );
    }
    comprobar(
      'y la misma mano en el mismo asiento: la llave sigue valiendo',
      (despues.datos.mesa.vista.miMano as string[]).join(',') === manoAntes,
      { antes: manoAntes, despues: despues.datos.mesa.vista.miMano },
    );

    const sigueJugandose = await pedir(`/arcade/mesas/${viva.codigo}/movimientos`, {
      metodo: 'POST',
      llave: viva.gente[0]!.llave,
      cuerpo: {
        rev: despues.datos.mesa.rev,
        tipo: 'ronda:jugar',
        carga: { carta: despues.datos.mesa.vista.miMano[0] },
      },
    });
    comprobar(
      'y la partida se puede seguir jugando en el proceso nuevo',
      sigueJugandose.estado === 200 && sigueJugandose.datos.mesa.vista.baza.length === 1,
      sigueJugandose.datos,
    );
  }

  // ── El diagnóstico ───────────────────────────────────────────────────────
  paso('Lo que queda vivo en memoria, que es donde se esconden las fugas');

  {
    const d = await pedir('/arcade/diagnostico');
    comprobar('el diagnóstico se sirve', d.estado === 200, d.datos);
    comprobar('hay mesas vivas', d.datos.mesas > 0, d.datos);
    comprobar(
      'y NINGÚN candado suelto: se retiran cuando nadie más espera',
      d.datos.candados === 0,
      d.datos,
    );
    console.log(
      `  ${d.datos.mesas} mesa(s) · ${d.datos.candados} candado(s) · ${d.datos.despertadores} despertador(es)`,
    );
  }
} catch (error) {
  fallos.push(`la prueba se cayó: ${error instanceof Error ? error.stack : String(error)}`);
} finally {
  if (servidor) {
    servidor.kill();
    await esperarAQueMuera(servidor);
  }
}

// ---------------------------------------------------------------------------
// TERCERA MITAD · UN SERVIDOR QUE NO TIENE QUE ARRANCAR
// ---------------------------------------------------------------------------

paso('Un arcade con `secretos: true` sin tapar NO deja arrancar el servidor');

/**
 * Instala un arcade roto ANTES de importar el servidor, y mira qué pasa.
 *
 * ═══ POR QUÉ SE HACE ASÍ Y NO CON UNA VARIABLE DE ENTORNO ═══
 *
 * La tentación era `ARCADE_ROTO=proyeccion` leída en el arranque. Eso mete en el
 * código de producción una costura que solo sirve para una prueba, y este
 * repositorio ya tiene apuntado adónde lleva eso: las costuras de prueba de OIDC
 * tienen su propia comprobación de arranque para que no puedan estar activas en
 * producción, porque con ellas cualquiera se fabrica la identidad de quien
 * quiera.
 *
 * Con un fichero envoltorio no hace falta ninguna costura: se da de alta el
 * arcade roto en el MISMO registro anclado con `Symbol.for` que usa el servidor
 * —por eso funciona aunque el módulo se cargue por dos rutas distintas— y
 * después se importa `index.ts` tal cual, sin tocarlo. Lo que se comprueba es el
 * arranque de verdad, no una imitación.
 */
async function noDebeArrancar(
  titulo: string,
  quePonerle: { proyeccion: boolean; loSecreto: boolean },
  loQueDebeDecir: string,
): Promise<void> {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'roto-'));
  const envoltorio = path.join(carpeta, 'arranque-roto.mts');
  const url = (relativa: string): string =>
    JSON.stringify(pathToFileURL(path.join(REPO, relativa)).href);

  fs.writeFileSync(
    envoltorio,
    `const arcade: any = await import(${url('shared/arcade/index.ts')});
arcade.instalarArcade({
  manifiesto: {
    id: 'el-que-filtra',
    nombre: 'El que filtra',
    gancho: 'Declara secretos y no los tapa.',
    icono: 'mando',
    jugadores: { minimo: 1, maximo: 4 },
    sede: 'servidor',
    tickHz: 0,
    mueble: 'formulario',
    secretos: true,
    marcador: { tipo: 'ninguno' },
    procedencia: { tipo: 'creacion-propia' },
  },
  avanzar: (estado: unknown) => estado ?? {},
  ${quePonerle.proyeccion ? 'proyeccion: (estado: unknown) => estado,' : ''}
  ${quePonerle.loSecreto ? 'loSecreto: () => ["algo"],' : ''}
});
await import(${url('server/src/index.ts')});
`,
    'utf8',
  );

  const puerto = await puertoLibre();
  const proceso = spawn(process.execPath, [TSX, envoltorio], {
    cwd: carpeta,
    env: { ...entorno(), PORT: String(puerto) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let dijo = '';
  proceso.stdout?.on('data', (d: Buffer) => (dijo += d.toString()));
  proceso.stderr?.on('data', (d: Buffer) => (dijo += d.toString()));

  let murio = false;
  let salida: number | null = null;
  proceso.once('exit', (codigo) => {
    murio = true;
    salida = codigo;
  });

  /*
   * ═══ SE VIGILA MIENTRAS VIVE, Y NO DESPUÉS: LA PRIMERA VERSIÓN ESTABA MAL ═══
   *
   * Preguntaba por `/api/salud` UNA vez, al terminar de esperar. Con eso, un
   * servidor que arrancara tan ricamente y no muriera nunca daba: la espera se
   * agota a los sesenta segundos, se le mata, y la pregunta de después no
   * contesta porque el proceso ya está muerto. O sea VERDE en «no llegó a
   * contestar a nadie» habiendo estado contestando un minuto entero. Se
   * descubrió rompiendo la garantía a propósito y viendo cuáles se ponían rojas:
   * dos de las tres.
   *
   * Ahora se pregunta CADA CUARTO DE SEGUNDO mientras el proceso vive. Un
   * servidor que escuche un instante ya no pasa, que es lo que hay que afirmar:
   * «no arranca» no es «se cae al rato», porque en ese rato ha estado sirviendo
   * secretos. Y de paso el caso bueno tarda dos segundos en vez de sesenta.
   */
  let respondio = false;
  const hasta = Date.now() + 40_000;
  while (!murio && Date.now() < hasta && !respondio) {
    try {
      const r = await fetch(`http://127.0.0.1:${puerto}/api/salud`);
      respondio = r.ok;
    } catch {
      /* todavía no escucha, o ya no está */
    }
    if (!respondio && !murio) await dormir(250);
  }
  /*
   * SE ANOTA SI MURIÓ SOLO **ANTES** DE MATARLO. Sin esta línea, matarlo aquí
   * abajo hace que la comprobación de más abajo vea un proceso muerto con
   * código distinto de cero —el de una señal— y la dé por buena: verde por
   * haberlo matado uno mismo, que es la definición de un comprobador que se
   * felicita a sí mismo.
   */
  const murioSolo = murio;
  if (!murio) {
    proceso.kill();
    await esperarAQueMuera(proceso);
  }

  comprobar(`${titulo}: NO llegó a contestar a nadie`, !respondio, {
    dijo: dijo.slice(-300),
  });
  comprobar(`${titulo}: el proceso termina SOLO, en vez de escuchar`, murioSolo && salida !== 0, {
    murioSolo,
    salida,
    dijo: dijo.slice(-400),
  });
  comprobar(`${titulo}: y dice por qué`, dijo.includes(loQueDebeDecir), dijo.slice(-400));

  try {
    fs.rmSync(carpeta, { recursive: true, force: true });
  } catch {
    /* en Windows el fichero sigue tomado un instante */
  }
}

await noDebeArrancar(
  'sin proyección y sin `loSecreto`',
  { proyeccion: false, loSecreto: false },
  'ArcadeSinProyeccion',
);
await noDebeArrancar(
  'con proyección y sin `loSecreto`',
  { proyeccion: true, loSecreto: false },
  'ArcadeSinLoSecreto',
);

paso('Y con las dos puestas, el mismo servidor arranca');

/*
 * La otra mitad de la vacuna. Sin esto, las dos comprobaciones de arriba
 * pasarían en verde si el servidor no arrancara por CUALQUIER otro motivo —una
 * ruta mal escrita, un puerto ocupado, un import roto—, y estarían afirmando
 * algo que no han comprobado.
 */
{
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'sano-'));
  const puerto = await puertoLibre();
  const proceso = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: carpeta,
    env: { ...entorno(), PORT: String(puerto) },
    stdio: 'ignore',
  });
  let arrancó = false;
  for (let i = 0; i < 200 && !arrancó; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${puerto}/api/salud`);
      arrancó = r.ok;
    } catch {
      await dormir(250);
    }
  }
  comprobar('un servidor con los dos arcades bien tapados SÍ arranca', arrancó);
  proceso.kill();
  await esperarAQueMuera(proceso);
  try {
    fs.rmSync(carpeta, { recursive: true, force: true });
  } catch {
    /* Windows */
  }
}

// ---------------------------------------------------------------------------
// CUARTA · EL VOLCADO DE `SIGTERM`, QUE EN WINDOWS NO SE PUEDE MANDAR
// ---------------------------------------------------------------------------

paso('El candado cubre la ruta de LECTURA, y no solo la de escritura');

/*
 * ═══ POR QUÉ ESTO NO SE PUEDE COMPROBAR POR HTTP, Y HAY QUE DECIRLO ═══
 *
 * La consecuencia número uno del §5.4 es que «el candado tiene que cubrir la
 * ruta de lectura», porque desde esta fase leer puede escribir: si el plazo ha
 * vencido, la lectura mete un tic.
 *
 * Se intentó comprobarlo desde fuera —cuatro lecturas a la vez sobre una mesa
 * con el plazo vencido, exigiendo que solo entrara UN tic— y esa comprobación
 * PASA IGUAL SIN CANDADO. Se probó quitándolo. La razón es que hoy toda la
 * evaluación del plazo es síncrona desde que empieza el manejador, y Node no
 * interrumpe una función síncrona: dos peticiones no pueden entrelazarse ahí
 * aunque no haya nada que se lo impida. O sea que la comprobación de fuera es
 * verde por un motivo que no es el candado, y creerse que lo comprueba es peor
 * que no tenerla.
 *
 * Lo que sí se puede afirmar, y es lo que importa el día que el almacén deje de
 * ser un mapa en memoria —con Mongo detrás habrá un `await` antes de tocar la
 * mesa, y entonces la carrera es real—: que la lectura PASA por el candado. Se
 * mira desde dentro del almacén, que es el único sitio al que la lectura llega
 * teniendo el candado cogido.
 */
{
  const mesas = await import('../src/arcade/mesas');
  const candadosAlEscribir: number[] = [];

  mesas.ponerAlmacenDeMesas({
    leer: () => [],
    guardar: async () => {
      candadosAlEscribir.push(mesas.candadosDeMesaVivos());
    },
    borrar: async () => {},
    guardarYa: () => {},
  });

  const abierta = await mesas.abrir({ arcade: RONDA, nombre: 'Ana', plazoSegundos: 1 });
  comprobar(
    'abrir una mesa NO coge el candado, y es correcto: todavía no había mesa que proteger',
    candadosAlEscribir.length === 1 && candadosAlEscribir[0] === 0,
    candadosAlEscribir,
  );
  candadosAlEscribir.length = 0;

  for (const nombre of ['Bruno', 'Carla', 'Diego']) {
    await mesas.sentarse(abierta.mesa.codigo, nombre);
  }
  await mesas.mover(abierta.mesa.codigo, abierta.silla.llave, abierta.mesa.mesa.rev, {
    tipo: 'ronda:empezar',
  });
  comprobar(
    'escribir pasa por el candado',
    candadosAlEscribir.length > 0 && candadosAlEscribir.every((c) => c >= 1),
    candadosAlEscribir,
  );

  const escriturasAntes = candadosAlEscribir.length;
  await dormir(1200);
  const vista = await mesas.mirar(abierta.mesa.codigo, abierta.silla.llave);
  comprobar('la lectura ha hecho vencer el plazo', vista.tic === 1, vista);
  comprobar(
    'y ha escrito, o sea que ha sido una ESCRITURA disfrazada de lectura',
    candadosAlEscribir.length > escriturasAntes,
    { antes: escriturasAntes, ahora: candadosAlEscribir.length },
  );
  comprobar(
    'LEER PASA POR EL CANDADO: al escribir desde la lectura había uno cogido',
    (candadosAlEscribir[candadosAlEscribir.length - 1] ?? 0) >= 1,
    candadosAlEscribir,
  );
}

paso('Si el almacén no puede guardar, se dice: ni un 200 ni un silencio');

/*
 * ═══ POR QUÉ ESTO ES UNA COMPROBACIÓN Y NO UN DETALLE ═══
 *
 * La escritura síncrona de `tickHz: 0` existe por una frase literal del §6:
 * «cuando el servidor contesta hecho, está guardado». La primera versión de esta
 * fase registraba el fallo de escritura en el log y contestaba 200 igual, así
 * que la frase era falsa exactamente el día que importaba.
 *
 * Y el día que importa no es raro. En la VPS, con la carpeta de mesas fuera de
 * los `ReadWritePaths` de la unidad de systemd, TODAS las escrituras fallan
 * desde el arranque: las partidas viven en memoria, nadie ve un error, y el
 * primer reinicio se las lleva. Se reprodujo dejando el fichero inaccesible: 201
 * al abrir, 200 al mover, y cinco ficheros `.tmp` sueltos.
 *
 * Se comprueban las tres cosas que lo convierten en visible: que abrir se niega,
 * que mover lo cuenta, y que el diagnóstico lo lleva.
 */
{
  const mesas = await import('../src/arcade/mesas');
  const vivasAntes = mesas.mesasVivas();

  mesas.ponerAlmacenDeMesas({
    leer: () => [],
    guardar: async () => {
      throw new Error('EPERM de mentira: la carpeta es de solo lectura');
    },
    borrar: async () => {},
    guardarYa: () => {},
  });

  let alAbrir: unknown;
  try {
    await mesas.abrir({ arcade: RONDA, nombre: 'Ana', plazoSegundos: 0 });
  } catch (error) {
    alAbrir = error;
  }
  comprobar(
    'una mesa que no se puede guardar NO se abre: el fallo sube',
    alAbrir instanceof Error && alAbrir.name === 'AlmacenNoGuarda',
    alAbrir instanceof Error ? alAbrir.name : alAbrir,
  );
  comprobar(
    'y no queda en la tabla: una mesa en memoria y no en el disco es una partida que se pierde',
    mesas.mesasVivas() === vivasAntes,
    { antes: vivasAntes, ahora: mesas.mesasVivas() },
  );

  const salud = mesas.saludDelAlmacen();
  comprobar('el diagnóstico cuenta el fallo', salud.fallos > 0, salud);
  comprobar('y de qué mesa fue', salud.ultimoFallo?.codigo !== undefined, salud);
  comprobar(
    'y dice si la carpeta está declarada, que es la pregunta que se contesta desde fuera',
    typeof salud.carpetaDeclarada === 'boolean',
    salud,
  );
  /*
   * Y LO QUE NO PUEDE SALIR. `/api/arcade/diagnostico` no lleva credencial —va
   * delante del guardián como todo este motor— así que publicar la ruta del
   * almacén, o el mensaje crudo del sistema que la lleva dentro, sería contarle
   * a cualquiera cómo está montado el disco del servidor.
   */
  const enElDiagnostico = JSON.stringify(salud);
  comprobar(
    'y NO publica la ruta del almacén: esa ruta se sirve sin credencial',
    !enElDiagnostico.includes('/') && !enElDiagnostico.includes('\\'),
    enElDiagnostico,
  );

  /*
   * Y AHORA CON UNA MESA QUE YA EXISTE: mover tiene que contar que no se ha
   * guardado, y aun así haber aplicado el movimiento. Las dos cosas son ciertas
   * a la vez y el 503 con la mesa dentro es la única respuesta que dice las dos.
   */
  let escribeBien = true;
  mesas.ponerAlmacenDeMesas({
    leer: () => [],
    guardar: async () => {
      if (!escribeBien) throw new Error('EPERM de mentira');
    },
    borrar: async () => {},
    guardarYa: () => {},
  });
  const abierta = await mesas.abrir({ arcade: RONDA, nombre: 'Ana', plazoSegundos: 0 });
  for (const nombre of ['Bruno', 'Carla', 'Diego']) {
    await mesas.sentarse(abierta.mesa.codigo, nombre);
  }
  const antesDeRomper = await mesas.mirar(abierta.mesa.codigo, abierta.silla.llave);
  escribeBien = false;

  let alMover: unknown;
  try {
    await mesas.mover(abierta.mesa.codigo, abierta.silla.llave, antesDeRomper.rev, {
      tipo: 'ronda:empezar',
    });
  } catch (error) {
    alMover = error;
  }
  comprobar(
    'mover sin poder guardar no contesta «hecho»',
    alMover instanceof Error && alMover.name === 'AlmacenNoGuarda',
    alMover instanceof Error ? alMover.name : alMover,
  );
  const despuesDeRomper = await mesas.mirar(abierta.mesa.codigo, abierta.silla.llave);
  comprobar(
    'y aun así el movimiento SÍ entró: los otros tres ya lo ven, y eso también hay que decirlo',
    despuesDeRomper.rev > antesDeRomper.rev,
    { antes: antesDeRomper.rev, despues: despuesDeRomper.rev },
  );
}

paso('El volcado al recibir la señal, ejercitado en proceso');

/*
 * ═══ POR QUÉ ESTA ESTÁ EN PROCESO Y LAS DEMÁS NO ═══
 *
 * Porque Windows no entrega `SIGTERM`: `kill('SIGTERM')` sobre un proceso hijo
 * lo mata sin que el manejador llegue a correr. Una comprobación por la vía del
 * sistema operativo sería aquí verde por el motivo equivocado —el proceso muere,
 * sí, pero sin haber volcado nada— y en Linux comprobaría otra cosa distinta que
 * la de al lado.
 *
 * Así que se ejercita lo que se puede ejercitar de verdad: que el manejador está
 * REGISTRADO y que lo que hace es una escritura SÍNCRONA, o sea que termina
 * antes de devolver. Es exactamente lo que hace falta cuando Render manda la
 * señal y mata el proceso unos segundos después: una escritura asíncrona podría
 * no llegar a ejecutarse nunca.
 *
 * Lo que esto NO comprueba, dicho para que nadie lo dé por comprobado: que Node
 * en Linux entregue la señal. Eso es responsabilidad del sistema y no del
 * código, y el código que corre es el mismo.
 */
{
  const mesas = await import('../src/arcade/mesas');
  let volcado: Array<{ codigo: string }> | null = null;
  let sincrono = false;

  /*
   * Se le pone un almacén de mentira ANTES de tocar nada. Sin esto, este bloque
   * escribiría dentro del repositorio: un comprobador que deja basura en el
   * árbol de trabajo es un comprobador que alguien acaba borrando.
   */
  mesas.ponerAlmacenDeMesas({
    leer: () => [],
    guardar: async () => {},
    borrar: async () => {},
    guardarYa: (todas) => {
      volcado = [...todas];
      sincrono = true;
    },
  });

  /*
   * ═══ Y SE LE CAMBIA LA DESPEDIDA, PORQUE LA DE VERDAD MATA ESTE PROCESO ═══
   *
   * Ésta es la parte que la primera versión de la fase no tenía y que un revisor
   * cazó leyendo la documentación de Node: instalar un oyente de `SIGTERM`
   * ELIMINA la terminación por defecto, así que un servidor con este manejador
   * puesto recibía la señal, volcaba… y seguía sirviendo hasta el `SIGKILL` de
   * la ventana de gracia. El manejador ahora vuelve a mandarse la señal a sí
   * mismo para devolver el proceso a su destino, y eso es lo que se comprueba
   * aquí: que después de volcar SE DESPIDE, y con la misma señal que llegó.
   *
   * Si no se sustituyera, este bloque se mataría a sí mismo en la línea del
   * `emit` y el comprobador terminaría a mitad — que es exactamente la clase de
   * verde por abandono que esta batería existe para no tener.
   */
  const despedidas: string[] = [];
  mesas.ponerLaDespedida((senal) => despedidas.push(senal));

  const abierta = await mesas.abrir({ arcade: RONDA, nombre: 'Ana', plazoSegundos: 0 });
  comprobar('hay una mesa que volcar', abierta.mesa.codigo.length === 5);

  comprobar(
    'el manejador de `SIGTERM` está registrado por el simple hecho de haber mesas',
    process.listenerCount('SIGTERM') > 0,
  );

  process.emit('SIGTERM', 'SIGTERM');

  comprobar('al llegar la señal se vuelca', volcado !== null, volcado);
  comprobar('y el volcado ha TERMINADO antes de devolver: es síncrono', sincrono);
  comprobar(
    'y lleva dentro la mesa que había abierta',
    (volcado as Array<{ codigo: string }> | null)?.some(
      (m) => m.codigo === abierta.mesa.codigo,
    ) === true,
  );
  comprobar(
    'y DESPUÉS de volcar se devuelve el proceso a su destino: instalar el oyente quitó la ' +
      'terminación por defecto, así que hay que volver a mandarse la señal',
    despedidas.length === 1 && despedidas[0] === 'SIGTERM',
    despedidas,
  );
}

paso('Con la partida empezada no se sienta nadie');

/*
 * ═══ EL TERCERO QUE LLEGA CON EL CÓDIGO DEL CHAT ═══
 *
 * Riberas admite de 2 a 6, así que el aforo NO es lo que cierra esta puerta: con
 * dos repartiendo, un tercero entraba y el servidor le daba silla. El reductor
 * copió los asientos AL REPARTIR, o sea que ese tercero no es colono: ve el
 * tablero, ve de quién es el turno y no tiene un solo botón, nunca. Salía en la
 * lista como si jugara y gastaba aforo sin poder levantarse.
 *
 * Y la segunda mitad es la que decide CÓMO se sabe que empezó: NO vale mirar el
 * estado ni el diario. En La Ronda basta que alguien MIRE para que el plazo venza
 * y el tic reparta solo; con esa regla, una mesa a la que aún no ha llegado nadie
 * se cerraría a sí misma. Por eso lo apunta `mover` y no el tic, y por eso aquí
 * se comprueban las dos cosas juntas: que el tarde no entra y que el tic no cierra.
 */
{
  const mesas = await import('../src/arcade/mesas');
  mesas.ponerAlmacenDeMesas({
    leer: () => [],
    guardar: async () => {},
    borrar: async () => {},
    guardarYa: () => {},
  });

  const enRiberas = await mesas.abrir({ arcade: RIBERAS, nombre: 'Ana', plazoSegundos: 600 });
  const suCodigo = enRiberas.mesa.codigo;
  await mesas.sentarse(suCodigo, 'Bea');
  const aTiempo = await mesas.sentarse(suCodigo, 'Cid');
  comprobar(
    'antes de repartir se sienta quien llega, que para eso el aforo son seis',
    typeof aTiempo.llave === 'string' && aTiempo.llave.length > 0,
    aTiempo,
  );

  /* Se lee para saber la revisión de AHORA: cada uno que se sienta la sube. */
  const antesDeRepartir = await mesas.mirar(suCodigo, enRiberas.silla.llave);
  /* Con `carga: {}`: el portillo compara tipo Y carga, y la opcion la trae vacia. */
  const repartido = await mesas.mover(suCodigo, enRiberas.silla.llave, antesDeRepartir.rev, {
    tipo: 'riberas:empezar',
    carga: {},
  });
  comprobar(
    'el delta se ha repartido de verdad, que si no lo de abajo sería verde por nada',
    repartido.rev > antesDeRepartir.rev,
    { antes: antesDeRepartir.rev, despues: repartido.rev },
  );

  let alSentarse: unknown;
  try {
    await mesas.sentarse(suCodigo, 'Dan');
  } catch (error) {
    alSentarse = error;
  }
  comprobar(
    'REPARTIDO EL DELTA, EL QUE LLEGA TARDE NO SE SIENTA',
    alSentarse instanceof mesas.MesaLlena,
    alSentarse instanceof Error ? alSentarse.name : alSentarse,
  );
  comprobar(
    'y no se le miente: no se le dice que la mesa está llena, se le dice que ya empezó',
    alSentarse instanceof mesas.MesaLlena &&
      alSentarse.motivo === 'mesa-empezada' &&
      !alSentarse.message.includes('caben'),
    alSentarse instanceof Error ? alSentarse.message : alSentarse,
  );

  /* La otra mitad: el tic reparte, y el tic NO puede cerrar la puerta. */
  const enRonda = await mesas.abrir({ arcade: RONDA, nombre: 'Uno', plazoSegundos: 1 });
  await dormir(1200);
  const conTic = await mesas.mirar(enRonda.mesa.codigo, enRonda.silla.llave);
  comprobar('el plazo ha vencido con una sola mirada', conTic.tic >= 1, conTic.tic);

  let alSentarseTrasElTic: unknown;
  try {
    for (const nombre of ['Dos', 'Tres', 'Cuatro']) {
      await mesas.sentarse(enRonda.mesa.codigo, nombre);
    }
  } catch (error) {
    alSentarseTrasElTic = error;
  }
  comprobar(
    'EL TIC NO CIERRA LA MESA: los tres que faltaban siguen entrando después de él',
    alSentarseTrasElTic === undefined,
    alSentarseTrasElTic instanceof Error ? alSentarseTrasElTic.message : alSentarseTrasElTic,
  );
}

paso('Vestirse no es un movimiento: ni diario, ni reductor, ni plazo');

/*
 * ═══ LO QUE NO SE VE POR EL CABLE, MIRADO DESDE DENTRO ═══
 *
 * Por HTTP ya está comprobado que vestirse sube la revisión y no toca ni el tic ni
 * el plazo ni la vista. Lo que el cable no enseña es el DIARIO —que no viaja— y
 * qué se le entrega exactamente al almacén. Las dos cosas son la garantía entera
 * de que una figura es presentación y no regla: si entrara en el diario, la misma
 * partida reejecutada dependería de la ropa de cada cual; y si el almacén
 * recibiera una lista de campos escrita a mano en vez de la silla entera, la
 * figura se perdería en el primer reinicio sin que nadie viera un error.
 */
{
  const mesas = await import('../src/arcade/mesas');
  const guardadas: any[] = [];
  mesas.ponerAlmacenDeMesas({
    leer: () => [],
    guardar: async (m) => {
      /* Una copia por JSON: exactamente lo que escribiría el almacén de ficheros. */
      guardadas.push(JSON.parse(JSON.stringify(m)));
    },
    borrar: async () => {},
    guardarYa: () => {},
  });

  const abierta = await mesas.abrir({ arcade: RONDA, nombre: 'Ana', plazoSegundos: 600, figura: 'centinela' });
  comprobar('la silla de quien abre lleva su figura', abierta.silla.figura === 'centinela', abierta.silla);
  const m = abierta.mesa;
  const codigo = m.codigo;
  const llave = abierta.silla.llave;
  for (const nombre of ['Bruno', 'Carla', 'Diego']) await mesas.sentarse(codigo, nombre);

  const antesDeRepartir = await mesas.mirar(codigo, llave);
  const repartida = await mesas.mover(codigo, llave, antesDeRepartir.rev, { tipo: 'ronda:empezar' });
  comprobar('la partida está empezada, y la vista lo dice', repartida.empezada === true, repartida.empezada);

  const diarioAntes = m.mesa.diario.length;
  const ticAntes = m.mesa.tic;
  const venceAntes = m.venceEn;
  const turnoDesdeAntes = m.turnoDesde;
  const estadoAntes = m.mesa.estado;
  const revAntes = m.mesa.rev;
  const guardadasAntesDeVestir = guardadas.length;

  const vestida = await mesas.vestir(codigo, llave, 'druida');
  comprobar(
    'vestirse sube la revisión en uno, en la tabla y en la vista devuelta',
    m.mesa.rev === revAntes + 1 && vestida.rev === revAntes + 1,
    { tabla: m.mesa.rev, vista: vestida.rev, antes: revAntes },
  );
  comprobar('y NO añade nada al diario', m.mesa.diario.length === diarioAntes, {
    antes: diarioAntes,
    despues: m.mesa.diario.length,
  });
  comprobar('ni toca el estado del juego: es el MISMO objeto', m.mesa.estado === estadoAntes);
  comprobar(
    'ni el tic, ni el plazo, ni desde cuándo se espera',
    m.mesa.tic === ticAntes && m.venceEn === venceAntes && m.turnoDesde === turnoDesdeAntes,
    { tic: [ticAntes, m.mesa.tic], venceEn: [venceAntes, m.venceEn], turnoDesde: [turnoDesdeAntes, m.turnoDesde] },
  );
  comprobar('pero sí se guarda: hubo una escritura', guardadas.length === guardadasAntesDeVestir + 1, {
    antes: guardadasAntesDeVestir,
    despues: guardadas.length,
  });
  const ultima = guardadas[guardadas.length - 1];
  comprobar(
    'y lo guardado lleva la silla ENTERA con la figura nueva: se serializa la silla, no una lista de campos',
    ultima?.sillas?.[0]?.figura === 'druida' && ultima?.sillas?.[0]?.id === abierta.silla.id,
    ultima?.sillas,
  );
  comprobar(
    'y las sillas sin figura se guardan sin la clave',
    ultima?.sillas?.[1] !== undefined && !('figura' in ultima.sillas[1]),
    ultima?.sillas?.[1],
  );
  comprobar(
    'y quien mira sin llave la ve igual: es pública, como el nombre',
    (await mesas.mirar(codigo, null)).asientos[0]?.figura === 'druida',
  );

  const revTrasVestir = m.mesa.rev;
  const guardadasTrasVestir = guardadas.length;
  await mesas.vestir(codigo, llave, 'druida');
  comprobar(
    'la misma figura otra vez no sube la revisión ni escribe nada',
    m.mesa.rev === revTrasVestir && guardadas.length === guardadasTrasVestir,
    { rev: [revTrasVestir, m.mesa.rev], guardadas: [guardadasTrasVestir, guardadas.length] },
  );

  let sinLlave: unknown;
  try {
    await mesas.vestir(codigo, null, 'druida');
  } catch (error) {
    sinLlave = error;
  }
  comprobar(
    'sin llave se rechaza como actuar sin asiento: el mismo error que `mover` y `cerrar`',
    sinLlave instanceof Error &&
      sinLlave.name === 'MovimientoRechazado' &&
      (sinLlave as { motivo?: string }).motivo === 'no-estas-sentado',
    sinLlave instanceof Error ? sinLlave.name : sinLlave,
  );

  for (const mala of ['Caballero', 'a/b', 'x'.repeat(40), '', '-a', 'a--b', 'a_', 'ñu']) {
    let alVestir: unknown;
    try {
      await mesas.vestir(codigo, llave, mala);
    } catch (error) {
      alVestir = error;
    }
    comprobar(
      `«${mala.slice(0, 12)}» se rechaza con FiguraMalEscrita, no se arregla`,
      alVestir instanceof mesas.FiguraMalEscrita,
      alVestir instanceof Error ? alVestir.name : alVestir,
    );
  }
  comprobar(
    'y después de los rechazos la figura que había sigue, con la misma revisión',
    m.sillas[0]?.figura === 'druida' && m.mesa.rev === revTrasVestir,
    { sillas: m.sillas.map((s) => s.figura), rev: m.mesa.rev },
  );

  const vivasAntes = mesas.mesasVivas();
  let alAbrirMal: unknown;
  try {
    await mesas.abrir({ arcade: RONDA, nombre: 'Eva', figura: 'Caballero' });
  } catch (error) {
    alAbrirMal = error;
  }
  comprobar(
    'abrir con una figura mal escrita falla en la petición que abre y no deja mesa',
    alAbrirMal instanceof mesas.FiguraMalEscrita && mesas.mesasVivas() === vivasAntes,
    { error: alAbrirMal instanceof Error ? alAbrirMal.name : alAbrirMal, vivas: [vivasAntes, mesas.mesasVivas()] },
  );
  const otra = await mesas.abrir({ arcade: RONDA, nombre: 'Uno' });
  const sillasAntes = otra.mesa.sillas.length;
  let alSentarseMal: unknown;
  try {
    await mesas.sentarse(otra.mesa.codigo, 'Dos', 'a/b');
  } catch (error) {
    alSentarseMal = error;
  }
  comprobar(
    'y sentarse con una figura mal escrita no sienta a nadie',
    alSentarseMal instanceof mesas.FiguraMalEscrita && otra.mesa.sillas.length === sillasAntes,
    { error: alSentarseMal instanceof Error ? alSentarseMal.name : alSentarseMal },
  );
  comprobar(
    'mientras que sin figura se sienta como siempre: la firma vieja sigue valiendo',
    (await mesas.sentarse(otra.mesa.codigo, 'Dos')).figura === undefined && otra.mesa.sillas.length === sillasAntes + 1,
  );
}

paso('Los modelos se buscan desde donde arranca el proceso, como el escritorio');

/*
 * El servidor de arriba arrancó en una carpeta temporal con `MODELOS_DIR` puesta,
 * así que aquello no dice nada de las DOS candidatas relativas, que son las que
 * usan los despliegues: `../escenas/modelos` desde `server/` —Render y el
 * portátil— y `escenas/modelos` desde la raíz —la VPS—. Se comprueban las dos
 * cambiando de directorio en este mismo proceso, y que desde cualquier otro sitio
 * la búsqueda conteste que no hay carpeta en vez de inventarse una.
 */
{
  const { carpetaDeLosModelos } = await import('../src/routes/modelos');
  const esperada = path.join(REPO, 'escenas', 'modelos');
  const laMisma = (a: string | undefined): boolean => a !== undefined && path.relative(a, esperada) === '';
  const cwdAntes = process.cwd();
  const modelosDirAntes = process.env.MODELOS_DIR;
  delete process.env.MODELOS_DIR;
  try {
    process.chdir(path.join(REPO, 'server'));
    comprobar(
      'desde `server/` —Render y el portátil— se encuentra `../escenas/modelos`',
      laMisma(carpetaDeLosModelos()),
      carpetaDeLosModelos(),
    );
    process.chdir(REPO);
    comprobar(
      'y desde la raíz —la VPS, con `WorkingDirectory=/opt/gamemasters`— se encuentra `escenas/modelos`',
      laMisma(carpetaDeLosModelos()),
      carpetaDeLosModelos(),
    );
    process.chdir(os.tmpdir());
    comprobar(
      'y desde cualquier otro sitio no se inventa ninguna: contesta que no hay',
      carpetaDeLosModelos() === undefined,
      carpetaDeLosModelos(),
    );
    process.env.MODELOS_DIR = esperada;
    comprobar('salvo que `MODELOS_DIR` lo diga', laMisma(carpetaDeLosModelos()), carpetaDeLosModelos());
  } finally {
    process.chdir(cwdAntes);
    if (modelosDirAntes === undefined) delete process.env.MODELOS_DIR;
    else process.env.MODELOS_DIR = modelosDirAntes;
  }
}

paso('La mesa se cierra sola cuando el juego dice que se acabó');

/*
 * ═══ UNA PARTIDA ENTERA, HASTA QUE NO QUEDA CARTA ═══
 *
 * El árbitro dice desde el primer día que «quien hospeda llama a `cerrarMesa`
 * cuando el estado del juego dice que se acabó», los DOS juegos de servidor
 * —La Ronda y Riberas; el tercero que exporta `seAcabo` es El Arcade, y ése es de
 * aparato— lo tenían escrito… y en el servidor no lo llamaba nadie: `cerrarMesa` sólo
 * salía de `POST /cerrar`, que no pulsa ningún cliente. Así que ninguna mesa se
 * cerraba nunca y una partida acabada seguía pintando su cuenta atrás.
 *
 * Se juega DE VERDAD, veinte cartas, cogiendo cada vez la primera opción que la
 * mesa le ofrece a quien tiene el turno. Una partida simulada con el estado a
 * mano comprobaría el ayudante; ésta comprueba el camino.
 */
{
  const mesas = await import('../src/arcade/mesas');
  /* Se queda con lo que de verdad pasó por el almacén: hace falta más abajo. */
  const guardadas = new Map<string, MesaEnCurso>();
  mesas.ponerAlmacenDeMesas({
    leer: () => [],
    guardar: async (m) => {
      guardadas.set(m.codigo, structuredClone(m));
    },
    borrar: async () => {},
    guardarYa: () => {},
  });

  /* Un plazo corto: la segunda mitad de esta prueba necesita que venza. */
  const partida = await mesas.abrir({ arcade: RONDA, nombre: 'Ana', plazoSegundos: 1 });
  const cod = partida.mesa.codigo;
  const llaveDe = new Map<AsientoId, string>();
  llaveDe.set(partida.silla.id, partida.silla.llave);
  for (const nombre of ['Bea', 'Cid', 'Dan']) {
    const silla = await mesas.sentarse(cod, nombre);
    llaveDe.set(silla.id, silla.llave);
  }

  const arranque = await mesas.mirar(cod, partida.silla.llave);
  await mesas.mover(cod, partida.silla.llave, arranque.rev, { tipo: 'ronda:empezar', carga: {} });

  /*
   * Se para A UNA CARTA DEL FINAL: la última la tiene que echar el TIC, y no una
   * persona. En La Ronda el reloj juega por quien no aparece, o sea que el final
   * de una partida puede llegar por el camino del tic —y si `cerrarSiSeAcabo` sólo
   * estuviera en `mover`, esa mesa se quedaría abierta para siempre.
   */
  let jugadas = 0;
  for (let vuelta = 0; vuelta < 40 && jugadas < 19; vuelta++) {
    const publica = await mesas.mirar(cod, partida.silla.llave);
    if (publica.terminada) break;
    const deQuien = (publica.vista as { turnoDe?: AsientoId } | undefined)?.turnoDe;
    const suLlave = deQuien === undefined ? undefined : llaveDe.get(deQuien);
    if (suLlave === undefined) break;
    const suya = await mesas.mirar(cod, suLlave);
    const opcion = suya.opciones?.[0];
    if (opcion === undefined) break;
    await mesas.mover(cod, suLlave, suya.rev, { tipo: opcion.tipo, carga: opcion.carga });
    jugadas++;
  }
  comprobar(
    'se han jugado a mano las diecinueve primeras cartas',
    jugadas === 19,
    { jugadas },
  );
  const aFaltaDeUna = await mesas.mirar(cod, partida.silla.llave);
  comprobar(
    'y a falta de una, la mesa SIGUE ABIERTA: no se cierra antes de tiempo',
    !aFaltaDeUna.terminada,
    { terminada: aFaltaDeUna.terminada, momento: (aFaltaDeUna.vista as { momento?: string })?.momento },
  );

  await dormir(1200);
  const trasElTic = await mesas.mirar(cod, partida.silla.llave);
  comprobar(
    'LA ÚLTIMA CARTA LA ECHA EL RELOJ Y LA MESA SE CIERRA: el tic también cierra',
    trasElTic.terminada,
    { terminada: trasElTic.terminada, momento: (trasElTic.vista as { momento?: string })?.momento },
  );
  comprobar(
    'y con la mesa cerrada ya no hay cuenta atrás que pintar',
    trasElTic.venceEn === null || trasElTic.venceEn === undefined,
    trasElTic.venceEn,
  );

  /*
   * ═══ Y AHORA POR EL OTRO CAMINO, QUE ES EL QUE SE ESCAPÓ ═══
   *
   * Lo de arriba comprueba el tic. La primera versión de esta comprobación se
   * quedó ahí, y por eso salió verde con un fallo dentro: por la puerta de
   * `mover`, el cierre apagaba el plazo y tres líneas después `if (otroTurno)` lo
   * volvía a armar, y así se guardaba. No se veía en pantalla porque los dos
   * clientes miran `terminada` antes de pintar el reloj; el dato guardado mentía.
   */
  const porMover = await mesas.abrir({ arcade: RONDA, nombre: 'Ana', plazoSegundos: 600 });
  const codPorMover = porMover.mesa.codigo;
  const llavePorMover = new Map<AsientoId, string>();
  llavePorMover.set(porMover.silla.id, porMover.silla.llave);
  for (const nombre of ['Bea', 'Cid', 'Dan']) {
    const silla = await mesas.sentarse(codPorMover, nombre);
    llavePorMover.set(silla.id, silla.llave);
  }
  const arranquePorMover = await mesas.mirar(codPorMover, porMover.silla.llave);
  await mesas.mover(codPorMover, porMover.silla.llave, arranquePorMover.rev, {
    tipo: 'ronda:empezar',
    carga: {},
  });
  let cartas = 0;
  let ultimaRespuesta: Awaited<ReturnType<typeof mesas.mover>> | null = null;
  for (let vuelta = 0; vuelta < 40; vuelta++) {
    const publica = await mesas.mirar(codPorMover, porMover.silla.llave);
    if (publica.terminada) break;
    const deQuien = (publica.vista as { turnoDe?: AsientoId } | undefined)?.turnoDe;
    const suLlave = deQuien === undefined ? undefined : llavePorMover.get(deQuien);
    if (suLlave === undefined) break;
    const suya = await mesas.mirar(codPorMover, suLlave);
    const opcion = suya.opciones?.[0];
    if (opcion === undefined) break;
    ultimaRespuesta = await mesas.mover(codPorMover, suLlave, suya.rev, {
      tipo: opcion.tipo,
      carga: opcion.carga,
    });
    cartas++;
  }
  const acabadaPorMover = await mesas.mirar(codPorMover, porMover.silla.llave);
  comprobar(
    'la partida también se acaba jugando las veinte cartas a mano',
    cartas === 20 && acabadaPorMover.terminada,
    { cartas, terminada: acabadaPorMover.terminada },
  );
  /*
   * SE MIRA LA RESPUESTA DEL PROPIO MOVIMIENTO QUE CIERRA, y no una lectura de
   * después: es el único instante en el que se ve. Con el fallo dentro —apagar el
   * plazo y rearmarlo tres líneas más abajo— esta respuesta sale con cuenta atrás
   * y una lectura posterior ya sale limpia, así que comprobarlo un momento más
   * tarde es comprobar el instante equivocado. La primera versión de esto lo
   * comprobaba tarde y salía verde teniendo el fallo delante.
   */
  comprobar(
    'Y ACABADA POR UN MOVIMIENTO, LA RESPUESTA DE ESE MOVIMIENTO NO TRAE CUENTA ATRÁS',
    ultimaRespuesta !== null &&
      ultimaRespuesta.terminada &&
      (ultimaRespuesta.venceEn === null || ultimaRespuesta.venceEn === undefined),
    ultimaRespuesta === null
      ? 'no hubo movimiento'
      : { terminada: ultimaRespuesta.terminada, venceEn: ultimaRespuesta.venceEn },
  );
  comprobar(
    'y al releerla tampoco',
    acabadaPorMover.venceEn === null || acabadaPorMover.venceEn === undefined,
    acabadaPorMover.venceEn,
  );

  /*
   * ═══ LA MESA QUE YA ESTABA ACABADA Y NADIE MARCÓ ═══
   *
   * Es toda mesa guardada por un servidor anterior a esto, y toda mesa que se
   * cerró en memoria con el almacén caído. Por `mover` y por el tic NO se alcanza
   * —los dos exigen que el estado CAMBIE, y sobre una partida acabada no cambia:
   * el reductor la rechaza y el tic devuelve el mismo estado— así que se quedaba
   * abierta para siempre y rearmando la cuenta atrás en cada mirada.
   *
   * Se coge la mesa de verdad —la que pasó por el almacén, con su estado acabado
   * dentro—, se le quita la marca, y se comprueba que al RECUPERARLA se cierra.
   */
  const laQueSeGuardo = guardadas.get(codPorMover);
  comprobar(
    'el almacén ha visto la mesa acabada, que es de donde sale la de abajo',
    laQueSeGuardo !== undefined && laQueSeGuardo.mesa.terminada,
    laQueSeGuardo === undefined ? 'no se guardó' : laQueSeGuardo.mesa.terminada,
  );
  if (laQueSeGuardo !== undefined) {
    const comoLaGuardoElServidorViejo: MesaEnCurso = {
      ...laQueSeGuardo,
      mesa: { ...laQueSeGuardo.mesa, terminada: false },
      venceEn: Date.now() + 60_000,
    };
    mesas.ponerAlmacenDeMesas({
      leer: () => [comoLaGuardoElServidorViejo],
      guardar: async () => {},
      borrar: async () => {},
      guardarYa: () => {},
    });
    const recuperada = await mesas.mirar(codPorMover, porMover.silla.llave);
    comprobar(
      'UNA MESA ACABADA QUE LLEGA SIN MARCAR SE CIERRA AL RECUPERARLA',
      recuperada.terminada,
      { terminada: recuperada.terminada },
    );
    comprobar(
      'y se le apaga la cuenta atrás que traía puesta',
      recuperada.venceEn === null || recuperada.venceEn === undefined,
      recuperada.venceEn,
    );
  }

  let alMoverEnLaAcabada: unknown;
  try {
    await mesas.mover(cod, partida.silla.llave, trasElTic.rev, { tipo: 'ronda:jugar', carga: {} });
  } catch (error) {
    alMoverEnLaAcabada = error;
  }
  /*
   * ═══ UN `seAcabo` QUE REVIENTA NO SE LLEVA LA MESA POR DELANTE ═══
   *
   * `seAcabo` es código de un arcade —y el motivo escrito para meterlo en el alta
   * es que lo declare uno de FUERA—, así que era la única puerta del motor que
   * ejecutaba código ajeno sin báscula y sin red. Medido antes de envolverlo: la
   * LECTURA se caía entera —una mesa que no se podía ni ver— y por la puerta de
   * `mover` el movimiento quedaba aplicado en memoria y sin guardar.
   *
   * Se ejercita sobre La Ronda y se le devuelve el suyo al salir.
   */
  registrarFinal(RONDA, () => {
    throw new Error('un seAcabo de fuera que revienta');
  });
  let alMirarConElFinalRoto: unknown;
  let vistaConElFinalRoto: Awaited<ReturnType<typeof mesas.mirar>> | null = null;
  try {
    vistaConElFinalRoto = await mesas.mirar(codPorMover, porMover.silla.llave);
  } catch (error) {
    alMirarConElFinalRoto = error;
  }
  comprobar(
    'CON UN `seAcabo` QUE REVIENTA, LA MESA SE SIGUE PUDIENDO VER',
    alMirarConElFinalRoto === undefined && vistaConElFinalRoto !== null,
    alMirarConElFinalRoto instanceof Error ? alMirarConElFinalRoto.message : 'bien',
  );
  olvidarFinal(RONDA);
  comprobar(
    'y quitarle el final a un arcade lo deja instalado y sin final',
    !hayFinal(RONDA),
    hayFinal(RONDA),
  );
  registrarFinal(RONDA, seAcaboLaRonda);
  comprobar('y se le devuelve el suyo', hayFinal(RONDA), hayFinal(RONDA));

  comprobar(
    'y en una mesa acabada ya no se mueve',
    alMoverEnLaAcabada instanceof Error && alMoverEnLaAcabada.name === 'MovimientoRechazado',
    alMoverEnLaAcabada instanceof Error ? alMoverEnLaAcabada.name : alMoverEnLaAcabada,
  );
}

// ---------------------------------------------------------------------------

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* en Windows a veces el fichero sigue tomado un instante */
}

/*
 * LA VACUNA FINAL. Este repositorio tiene tres casos anotados de comprobadores
 * que pasaban en verde sin comprobar nada, y en los tres el síntoma fue el
 * mismo: cero hallazgos. Cero hallazgos sobre cero comprobaciones se parece
 * muchísimo a «todo bien», así que antes de felicitar a nadie se comprueba que
 * se ha comprobado algo.
 */
console.log('');

/*
 * LOS FALLOS SE IMPRIMEN ANTES QUE EL RECUENTO, y el orden costó una ejecución
 * a ciegas: con el recuento delante, un comprobador que se cae a mitad sale por
 * el 2 —«solo se han hecho 62 comprobaciones»— sin decir NI UNO de los fallos
 * que ya había encontrado, que es justamente lo que explica por qué se cayó.
 */
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log('');
}

/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS». Era un suelo de cien («eso no es una mesa
 * probada») y con cien de ochocientas un bloque entero podía caerse sin que nadie lo
 * viera: el número va escrito, como en los demás comprobadores, y se sube al añadir
 * comprobaciones. Medido dos veces seguidas antes de escribirlo.
 */
const COMPROBACIONES_ESCRITAS = 856;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(
    `Solo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones que tiene escritas este guion. ` +
      'Eso no es una mesa probada: es un comprobador\n' +
      'que se ha caído por el camino sin decirlo, o al que le han quitado parte del cuerpo. ' +
      'Si has añadido comprobaciones nuevas, sube el número.',
  );
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(`${hechas} comprobaciones`);
  console.log(
    '\nLa mesa existe: se abre con un código, se entra sin cuenta, la revisión manda al escribir\n' +
      'y no al leer, el plazo vence porque alguien MIRA, la espera aparcada se despierta por\n' +
      'vencimiento, la partida sobrevive a que el proceso muera, y la mano de cada cual no sale\n' +
      'de su móvil — comprobado sobre lo que de verdad viajó por el cable, y en LOS DOS arcades\n' +
      'de servidor y no sólo en La Ronda: Riberas también se abre, se juega leyendo el tablero que\n' +
      'baja, y ni una ficha de un almacén sale hacia otro asiento ni hacia quien mira sin jugar.',
  );
  process.exit(0);
}

process.exit(1);
