/**
 * ¿JUEGA LA SALA DE LA LIZA LO QUE PROMETE?
 *
 *   npm run verify:liza -w server
 *
 * ═══ QUÉ AFIRMA ═══
 *
 * Que la sala pura de la Liza (`shared/mecanicas/liza/sala.ts` y sus piezas) cumple su contrato
 * (`tipos-de-la-sala.ts`, `declaracion.ts`) jugada de verdad: con aparatos simulados que tienen su propio
 * reloj, su ida y vuelta y un desfase que la E/S estima MAL a propósito, y con robots que leen lo que les
 * llega por el cable —no el estado de la sala— para decidir cuándo esquivar.
 *
 * Todo se prueba con una LIZA DE JUGUETE que no es ningún juego: una plaza de 50 unidades con un quiosco,
 * un coche, un muro y un banco; una clase de entidad (que en una variante dispara); un proyectil; un
 * portable; dos zonas de acción. Es la regla del §11 del diseño: ninguna declaración entra sin un uso que
 * no sea el juego que la pidió.
 *
 * ═══ LOS BLOQUES ═══
 *
 *   0. La liza de juguete y sus variantes se declaran sin problemas.
 *   1. Nacer y empezar la fase: los seis pasos, la semilla.
 *   2. Conexión, bienvenida y puesta al día, con los instantes reescritos en el reloj nuevo; y quien
 *      conecta mientras otro golpea recibe cada anuncio una vez, en su orden.
 *   3. Validación del sitio y corrección: presupuestos corto y largo, estructura, escuadra, límite,
 *      silencio tras corregir (que calla lo que venía de camino y no la esquiva de después), distancia
 *      extra de la esquiva, y la escuadra para el tramo de un tic del aparato también al esquivar.
 *   4. EL JUICIO DE LA ESQUIVA NO DEPENDE DEL DESFASE (condición de aprobación del diseño): el mismo
 *      veredicto con el desfase estimado con 0, +40 y −40 ms de error, con 50, 150 y 250 ms de ida y
 *      vuelta y con el aparato en nueve puntos de su tic; y las primeras, la torpe, la imparable, la
 *      ruptura, el intocable y la repetición.
 *   5. Remanso y Réplica (esquivar dentro del premio no lo acaba); acometida tras una limpia contra una
 *      bala.
 *   6. La cadena y el «al ritmo», juzgados en el reloj del aparato.
 *   7. La guardia: de frente para y responde; por la espalda no; lo que la rompe pasa.
 *   8. El empujón: choque sólo con caja, y el premio del choque.
 *   9. Las balas contra los sitios DECLARADOS, esperados hasta 250 ms; paradas por la estructura.
 *  10. Los turnos: tope por asiento, ninguno a quien está en su premio, ni al ausente, y la ráfaga que se
 *      corta si su blanco entra en su premio.
 *  11. Lo que se lleva se conserva en todo tic; la zona de uno en uno; y (11 bis) quien cae suelta lo
 *      que lleva y otro lo recoge, el rescate, y la reaparición pagando el recurso.
 *  12. Los finales del encuentro y los veredictos (ronda, reloj una vez, ausente una vez); y un asiento
 *      vacío —sin canal, o ausente— no sostiene el encuentro pasados los `veredictoTrasTics`.
 *  13. Un robot que LEE saca al menos el doble que uno que APORREA.
 *  14. Determinismo: el mismo paso con la misma semilla, el estado de entrada intacto, la sala rehecha
 *      que reanuda, y la MISMA huella tic a tic en Node y en Hermes.
 *  15. El coste: microsegundos por tic de una sala llena (6 asientos, 14 entidades, 12 balas) en Node.
 *  16. Las declaraciones de El Quiebro, si su productor ya existe; y cada una de sus clases, sola contra
 *      un asiento quieto, ataca.
 *  17. Lo que las de arriba daban por supuesto: la foto cada dos tics, los presentes, un anuncio en el
 *      reloj de cada destinatario, el alargue del comp, soltar la esquiva, la línea de vista del
 *      enganche, el intocable al aparecer, el grafo, el trasvase, la reimpresión, los avisos, el pago
 *      triangular al salir, la zona que se enciende al pagar y la que se rompe con un golpe; y que rondar
 *      es esperar turno: quien puede golpear se acerca a su alcance, y quien dispara busca la vista.
 *
 * ═══ LO QUE ESTE COMPROBADOR ENCONTRÓ MIENTRAS SE ESCRIBÍA ═══
 *
 * No son adorno: cada uno es una comprobación de aquí que se puso roja con la sala de verdad.
 *   · El ausente sólo llegaba a quien estaba libre: a quien se le cae la red en mitad de un combate, cada
 *     golpe lo dejaba tocado y el ausente no llegaba nunca (bloque 10).
 *   · Las entidades que llegaban detrás de la primera no la rodeaban: seis encima de un asiento y UNA
 *     atacando (bloque 10).
 *   · El cerebro paraba en la distancia máxima de su banda y no en la mínima: con los números de un juego
 *     de verdad (banda de 1,0 a 1,8 y golpe de 1,1) no atacaba nunca (bloque 16).
 *   · Las que salían de una zona fuera del límite de la fase no daban un paso (bloque 16).
 *   · Una esquiva pronta pero dentro de su ventana salía «fallada», porque ya había sacado al asiento del
 *     alcance (bloque 4; ver `ticDelAlcance` en `combate.ts`).
 * Y dos del juego que se dicen en el informe del frente: la réplica sin avance no llega tras una esquiva
 * de lado, y la esquiva que desplaza sirve para huir aporreando aunque salga torpe.
 *
 * ═══ LO QUE ENCONTRÓ LA REVISIÓN, Y ESTE COMPROBADOR NO VEÍA ═══
 *
 * Una revisión adversaria de la primera entrega midió seis fallos con 131 comprobaciones en verde encima.
 * Cada uno tiene ahora la suya, y cada una se vio roja con la sala que se revisó (`rojos2.py`, fase A):
 *   · Un asiento sin canal (o que cerró la pestaña) no dejaba perder: intocable, nadie lo persigue, no cae,
 *     y contaba como alguien que podía seguir (bloque 12).
 *   · El duelista de El Quiebro rondaba mil tics a 1,25 m sin atacar: su banda empieza en 1,3 y su golpe
 *     llega a 1,1; y el tirador rondaba sin línea de vista sin buscarla (bloques 16 y 17).
 *   · Esquivar dentro del Remanso lo acababa, y con él su intocable y su Réplica (bloque 5).
 *   · La esquiva que empezaba justo tras un `corrige` se callaba entera y acababa en otro, y las de junto a
 *     una esquina se corregían porque la escuadra era sólo para pasos de andar (bloque 3).
 *   · Si una esquiva a tiempo salía limpia dependía de la fase del aparato dentro del tic: el bloque 4 sólo
 *     probaba una (bloque 4).
 *   · Quien conectaba en el paso en que otro golpeaba recibía el anuncio dos veces (bloque 2).
 * Y dos de sus observaciones: la ráfaga seguía contra quien entraba en su premio (bloque 10), y la
 * repetición sin autor se anunciaba contra quien ya estaba en el suelo (bloque 4).
 *
 * ═══ VISTO EN ROJO ═══
 *
 * Cada comprobación se vio fallar rompiendo a propósito la sala en una COPIA del árbol, nunca en los
 * ficheros de verdad (otros frentes compilan contra ellos a la vez): `scratchpad/sala/rojos.py` monta el
 * espejo, aplica cada rotura, corre este guion, exige salida distinta de 0 con la comprobación esperada
 * en rojo, restaura y compara con `cmp`; `scratchpad/sala/pasada2/rojos2.py` hace lo mismo con las
 * roturas de la segunda pasada, y antes pone en el espejo la sala que se revisó. La lista de roturas y
 * qué comprobación cazó cada una está en el informe del frente.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { arnes } from './arnes';
import { UNO } from '../../shared/mecanicas/fijo';
import { DT_DEL_TIC, COSENO, SENO } from '../../shared/mecanicas/andar';
import { arenaDe, unPaso } from '../../shared/mecanicas/mundo';
import type { Arena } from '../../shared/mecanicas/mundo';
import {
  arenaDeLaLiza,
  leerCargaDeRonda,
  problemasDeLaDeclaracion,
  VERSION_DE_LA_DECLARACION,
  VEREDICTO_DE_AUSENTE,
  VEREDICTO_DE_RELOJ,
  VEREDICTO_DE_RONDA,
} from '../../shared/mecanicas/liza/declaracion';
import type {
  AccionDeclarada,
  CargaDeRonda,
  ClaseDeEntidad,
  ColumnaDeCuenta,
  EfectoDeclarado,
  FaseDeLaLiza,
  GrupoDeclarado,
  LizaDeclarada,
  PuestaDeEstado,
  ReglasDeAsiento,
} from '../../shared/mecanicas/liza/declaracion';
import { CONTADORES_DE_ASIENTO } from '../../shared/mecanicas/liza/declaracion';
import { leerMensajeDeLaSala, MOTIVO_DE_IRSE, RESULTADO, textoDeLaSala } from '../../shared/mecanicas/liza/protocolo';
import type { SucesoDelTic, TuplaDeFoto } from '../../shared/mecanicas/liza/protocolo';
import type {
  AccionRecibida,
  EntradaDeLaSala,
  EstadoDeLaSala,
  PasoDeLaSala,
} from '../../shared/mecanicas/liza/tipos-de-la-sala';
import { avanzarLaSala, huellaDeLaSala, salaNueva } from '../../shared/mecanicas/liza/sala';
import { canonico } from '../../shared/mecanicas/canonico';
import { sitioDeLaBala } from '../../shared/mecanicas/liza/proyectiles';
import { rumboHacia } from '../../shared/mecanicas/liza/geometria';

const { comprobar, paso, nota, terminar } = arnes();

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '..', '..');

/* ═══════════════════════════════════════════════════════════════════════════
 * LA LIZA DE JUGUETE
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Una longitud en Q16.16. */
const u = (x: number): number => Math.round(x * UNO);

/** Los estados del juguete. */
const E = {
  esquivando: 1,
  tocado: 2,
  premio: 3,
  derribado: 4,
  sosteniendo: 5,
  sinCuerpo: 6,
  ausente: 7,
  descolocado: 8,
  caidaEntidad: 9,
  reaparecido: 10,
  caidaAsiento: 11,
  rematando: 12,
  absorbiendo: 13,
} as const;

/** Las acciones del juguete. */
const A = {
  entrada: 1,
  seguida: 2,
  cierre: 3,
  replica: 4,
  empellon: 5,
  esquiva: 10,
  rescate: 11,
  remate: 12,
  zona: 13,
  golpe: 40,
  segundo: 41,
  respuesta: 42,
} as const;

function puesta(estado: number, tics: number, intocableTics = 0, distanciaExtra = 0, soltableDesdeTic = tics): PuestaDeEstado {
  return { estado, tics, intocableTics, distanciaExtra, soltableDesdeTic };
}

/** Los estados que bloquean acciones (para que una puesta sin soltar lleve `soltableDesdeTic` = tics). */
function efecto(dano: number, p: PuestaDeEstado | null, empuje = 0, extra: Partial<EfectoDeclarado> = {}): EfectoDeclarado {
  return {
    dano,
    danoAlRitmo: dano,
    puntos: 10,
    puntosAlRitmo: 10,
    puesta: p,
    empuje,
    alChocar: { dano: empuje > 0 ? 15 : 0, tics: empuje > 0 && p !== null ? 10 : 0 },
    rompeGuardia: false,
    ...extra,
  };
}

function accion(id: number, extra: Partial<AccionDeclarada>): AccionDeclarada {
  return {
    id,
    anuncioTics: 8,
    alcance: u(1.1),
    holgura: u(1.2),
    enganche: { radio: u(7), conoRumbos: 43, holgura: u(0.5) },
    avance: 0,
    cadena: null,
    efecto: efecto(10, puesta(E.tocado, 12)),
    imparable: false,
    recargaTics: 0,
    recuperacionTics: 0,
    soloEn: [],
    alFallar: puesta(E.descolocado, 8),
    ...extra,
  };
}

function reglas(asiento: string): ReglasDeAsiento {
  return {
    asiento,
    cuerpo: {
      radio: u(0.35),
      marchas: [u(2), u(5), u(7)],
      aceleracionTics: 3,
      presupuestoCorto: { velocidad: u(8.75), acumulaTics: 20 },
      presupuestoLargo: { distancia: u(80), enTics: 200 },
      vidaTope: 100,
      vidaAlRematar: 10,
      firmeCadaTics: 0,
      guardaTics: 3,
    },
    acciones: [
      accion(A.entrada, { avance: u(2) }),
      accion(A.seguida, {
        anuncioTics: 5,
        cadena: { tras: [A.entrada], antesMs: 100, despuesMs: 250, ritmoMs: 75, anuncioTicsAlRitmo: 4, soloSiDio: false },
        efecto: efecto(10, puesta(E.tocado, 10), 0, { danoAlRitmo: 15, puntosAlRitmo: 15 }),
      }),
      accion(A.cierre, {
        anuncioTics: 7,
        cadena: { tras: [A.seguida], antesMs: 100, despuesMs: 250, ritmoMs: 75, anuncioTicsAlRitmo: 6, soloSiDio: false },
        efecto: efecto(20, puesta(E.derribado, 30), u(3)),
      }),
      /* Con avance: tras una esquiva de lado de 3,5 m, sin él la réplica no llega (ver el informe del frente). */
      accion(A.replica, { anuncioTics: 3, avance: u(4), imparable: true, soloEn: [E.premio], alFallar: null, enganche: { radio: u(10), conoRumbos: 64, holgura: u(1) }, efecto: efecto(25, puesta(E.derribado, 30)) }),
      accion(A.empellon, { anuncioTics: 10, recargaTics: 60, efecto: efecto(8, puesta(E.tocado, 24), u(4), { rompeGuardia: true }) }),
    ],
    esquiva: {
      accion: A.esquiva,
      /* Nueve tics, golpear desde el sexto, sin intocable: lo que esquiva es la ventana. */
      puesta: puesta(E.esquivando, 9, 0, u(4), 6),
      ventanaMs: 200,
      esquivaHastaMs: 250,
      primeras: { cuantas: 0, ventanaMs: 300 },
      torpe: { cada: 3, enTics: 24 },
      alAcertar: { puesta: puesta(E.premio, 20, 20), alAutor: puesta(E.descolocado, 20) },
      contraProyectil: { distancia: u(10), tics: 8, accion: A.replica },
      ruptura: { coste: 50, desde: [E.tocado], puesta: puesta(E.esquivando, 9, 6, u(4), 6) },
    },
    rescate: { accion: A.rescate, radio: u(1.5), mantenerTics: 30, puesta: puesta(E.sosteniendo, 30), vidaAlVolver: 40, medidorAmbos: 0 },
    medidor: { tope: 100, porLimpia: 35, porRitmo: 5, porRemate: 20, porChoque: 10 },
    puntos: { factor: UNO, multiplicador: { paso: 6554, tope: 2 * UNO }, porLimpia: 50, porChoque: 30, porRemate: 100, porRescate: 75, porSalir: 150 },
    alEmpezar: { vida: 100, medidor: 0, lleva: [{ portable: 1, n: 0 }] },
  };
}

/** Una tabla por presentes de `n` asientos con `f(presentes)`. */
function porN(n: number, f: (presentes: number) => number): number[] {
  const t: number[] = [];
  for (let i = 1; i <= n; i++) t.push(f(i));
  return t;
}

function clase(extra: Partial<ClaseDeEntidad> = {}): ClaseDeEntidad {
  return {
    id: 1,
    vida: 40,
    radio: u(0.35),
    velocidad: u(4),
    acciones: [
      accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null }),
      accion(A.segundo, {
        anuncioTics: 6,
        enganche: null,
        alFallar: null,
        cadena: { tras: [A.golpe], antesMs: 0, despuesMs: 0, ritmoMs: 0, anuncioTicsAlRitmo: 6, soloSiDio: true },
      }),
      /* La respuesta sólo la lanza la guardia: con `soloEn` un estado en que la entidad no está nunca, el cerebro no abre con ella. */
      accion(A.respuesta, { anuncioTics: 6, alcance: u(1.5), enganche: null, alFallar: null, soloEn: [E.premio], efecto: efecto(15, puesta(E.tocado, 12)) }),
    ],
    proyectil: 0,
    guardia: {
      conoRumbos: 43,
      para: [A.entrada],
      salvoEn: [E.tocado, E.derribado, E.descolocado],
      alParar: puesta(E.descolocado, 8),
      respuesta: A.respuesta,
      esquivaAlAzar: { acciones: [A.empellon], probabilidad: 0 },
    },
    /* Se acerca hasta 0,9 (dentro del golpe de 1,1) y no vuelve a por él hasta que se le va a más de 1,5. */
    cerebro: { distanciaMinima: u(0.9), distanciaMaxima: u(1.5), decideCadaTics: 4, costeCuerpoACuerpo: 1, costeDisparo: 1, sigueElGrafo: true },
    aparicion: { modo: 'imprimir', tics: 10 },
    alCaer: {
      tipo: 'rematable',
      puesta: puesta(E.caidaEntidad, 60),
      remate: { accion: A.remate, radio: u(2.5), mantenerTics: 24, puesta: puesta(E.rematando, 24, 24) },
      suelta: { portable: 1, n: 3 },
      siNo: { absorbe: 1, radio: u(12), absorbiendo: puesta(E.absorbiendo, 12), vida: 20, reapareceTras: 40, claseDeZona: 1, distanciaMinima: u(10) },
    },
    ...extra,
  };
}

/** El tirador: la misma clase, que ronda entre 6 y 14 y dispara. */
function claseTiradora(extra: Partial<ClaseDeEntidad> = {}): ClaseDeEntidad {
  return clase({
    cerebro: { distanciaMinima: u(6), distanciaMaxima: u(14), decideCadaTics: 4, costeCuerpoACuerpo: 1, costeDisparo: 1, sigueElGrafo: true },
    proyectil: 1,
    ...extra,
  });
}

const CAJAS = [
  { x0: -2, z0: 4, x1: 2, z1: 8 },
  { x0: 8, z0: -1, x1: 12, z1: 1 },
  { x0: -14, z0: 10, x1: -6, z1: 11 },
  { x0: 4, z0: 14, x1: 6, z1: 15 },
];

function caja(x0: number, z0: number, x1: number, z1: number): { x0: number; z0: number; x1: number; z1: number } {
  return { x0: u(x0), z0: u(z0), x1: u(x1), z1: u(z1) };
}

const COLUMNAS: ColumnaDeCuenta[] = [
  ...CONTADORES_DE_ASIENTO.map((que) => ({ que })),
  { que: 'lleva', portable: 1 },
  { que: 'cobrado', portable: 1 },
];

interface OpcionesDelJuguete {
  asientos?: number;
  clase?: ClaseDeEntidad;
  grupos?: (n: number) => GrupoDeclarado[];
  fin?: 'vaciar' | 'salida';
  modo?: 'quieta' | 'calma' | 'encuentro';
  relojTics?: number;
  reloj?: { id: string; duraMs: number } | null;
  clave?: string;
  recurso?: number;
  presentes?: number;
  primeras?: { cuantas: number; ventanaMs: number };
  repetirTrasTics?: number;
  nace?: { x: number; z: number }[];
  zonasExtra?: { id: number; clase: number; caja: { x0: number; z0: number; x1: number; z1: number } }[];
  limite?: number;
  semilla?: number;
  aforo?: { entidades: number; balas: number; montones: number };
  capacidad?: number;
  guarda?: number;
  zonaTics?: number;
  medidor?: number;
  ruptura?: PuestaDeEstado;
  reaparicion?: { x: number; z: number };
  lleva?: number;
  danoDeBala?: number;
}

/**
 * La liza de juguete, con lo que cambie cada prueba. Una variante que la propia Liza no acepta REVIENTA
 * aquí: una prueba montada sobre una declaración rota no prueba nada (y la primera versión de este
 * guion se pasó un rato buscando por qué no salía nadie de una zona que no existía).
 */
function juguete(o: OpcionesDelJuguete = {}): LizaDeclarada {
  const d = montarJuguete(o);
  const problemas = problemasDeLaDeclaracion(d);
  if (problemas.length > 0) throw new Error(`la liza de juguete de esta prueba está mal declarada: ${problemas.slice(0, 3).join(' | ')}`);
  return d;
}

function montarJuguete(o: OpcionesDelJuguete): LizaDeclarada {
  const n = o.asientos ?? 2;
  const pisables: { x: number; y: number }[] = [];
  for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) pisables.push({ x, y });
  const nace = o.nace ?? [
    { x: -3, z: -8 },
    { x: 3, z: -8 },
    { x: -6, z: -8 },
    { x: 6, z: -8 },
    { x: -9, z: -8 },
    { x: 9, z: -8 },
  ];
  const zonaDeAccion = {
    claseDeZona: 2,
    accion: A.zona,
    radio: u(1.5),
    mantenerTics: 30,
    capacidad: o.capacidad ?? 1,
    puesta: puesta(E.sosteniendo, 30),
    rompeConDano: true,
    activaTics: o.zonaTics ?? 1000,
    alApagarse: { coste: 1, siguienteTics: 800 },
  };
  const grupos: GrupoDeclarado[] = o.grupos !== undefined ? o.grupos(n) : [
    { clase: 1, cuantos: porN(n, (p) => 2 + 2 * p), vivasALaVez: porN(n, (p) => 1 + p), claseDeZona: 1, desdeTic: 0, cadaTics: 20, eleccion: 'azar' },
  ];
  const modo = o.modo ?? 'encuentro';
  const fase: FaseDeLaLiza = {
    clave: o.clave ?? 'n1-e1',
    modo,
    limite: o.limite ?? 1,
    semilla: o.semilla ?? 12345,
    reloj: o.reloj ?? null,
    encuentro:
      modo !== 'encuentro'
        ? null
        : {
            ronda: 1,
            presentes: o.presentes ?? n,
            relojTics: o.relojTics ?? 6000,
            vivasALaVez: porN(n, (p) => Math.min(14, p + 3 + (n >= 6 ? 8 : 0))),
            grupos,
            fin: (o.fin ?? 'vaciar') === 'vaciar' ? { tipo: 'vaciar' } : { tipo: 'salida', zona: zonaDeAccion, salenComoMinimo: porN(n, (p) => Math.ceil(p / 2)) },
          },
  };
  const asientos: ReglasDeAsiento[] = [];
  for (let i = 1; i <= n; i++) {
    const r = reglas(`a${String(i)}`);
    asientos.push({
      ...r,
      cuerpo: { ...r.cuerpo, guardaTics: o.guarda ?? r.cuerpo.guardaTics },
      esquiva: { ...r.esquiva, primeras: o.primeras ?? r.esquiva.primeras, ruptura: { ...r.esquiva.ruptura, puesta: o.ruptura ?? r.esquiva.ruptura.puesta } },
      alEmpezar: { ...r.alEmpezar, medidor: o.medidor ?? r.alEmpezar.medidor, lleva: [{ portable: 1, n: o.lleva ?? 0 }] },
    });
  }
  const estado = (id: number, bloqueaPaso: boolean, bloqueaAccion: boolean, cancelaCon: number[] = [], seCortaConDano = false) => ({
    id,
    bloqueaPaso,
    bloqueaAccion,
    cancelaCon,
    seCortaConDano,
  });
  return {
    version: VERSION_DE_LA_DECLARACION,
    mundo: {
      metrosPorUnidad: UNO,
      suelo: { lado: 2, pisables, vados: [], cuerpos: CAJAS, nace: [] },
      clasesDeCaja: [1, 1, 1, 1],
      zonas: [
        { id: 1, clase: 1, caja: caja(18, 18, 20, 20) },
        { id: 2, clase: 1, caja: caja(-20, 18, -18, 20) },
        { id: 3, clase: 1, caja: caja(18, -20, 20, -18) },
        { id: 4, clase: 1, caja: caja(-20, -20, -18, -18) },
        { id: 5, clase: 2, caja: caja(-1, -21, 1, -19) },
        { id: 6, clase: 2, caja: caja(-1, 19, 1, 21) },
        ...(o.zonasExtra ?? []),
      ],
      limites: [
        { id: 1, caja: caja(-22, -22, 22, 22) },
        { id: 2, caja: caja(-10, -10, 10, 10) },
      ],
      grafo: {
        nudos: [
          { x: u(-5), z: u(2) },
          { x: u(5), z: u(2) },
          { x: u(5), z: u(10) },
          { x: u(-5), z: u(10) },
          { x: u(-16), z: u(8) },
          { x: u(-16), z: u(13) },
          { x: u(-4), z: u(13) },
        ],
        aristas: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
          [0, 4],
          [4, 5],
          [5, 6],
          [6, 3],
        ],
      },
      nace: [
        ...nace.slice(0, n).map((s) => ({ papel: 'asiento' as const, x: u(s.x), z: u(s.z), rumbo: 0 })),
        { papel: 'reaparicion' as const, x: u(o.reaparicion?.x ?? 0), z: u(o.reaparicion?.z ?? -15), rumbo: 0 },
      ],
    },
    fase,
    asientos,
    estados: [
      estado(E.esquivando, false, true),
      estado(E.tocado, true, true, [A.esquiva]),
      estado(E.premio, false, false),
      estado(E.derribado, true, true),
      estado(E.sosteniendo, true, true, [], true),
      estado(E.sinCuerpo, true, true),
      estado(E.ausente, true, true),
      estado(E.descolocado, true, true),
      estado(E.caidaEntidad, true, true),
      estado(E.reaparecido, false, false),
      estado(E.caidaAsiento, true, true),
      estado(E.rematando, true, true),
      estado(E.absorbiendo, true, true),
    ],
    clases: [o.clase ?? clase()],
    proyectiles: [{ id: 1, apuntarTics: 12, balas: 3, cadaTics: 3, velocidad: u(20), radio: u(0.2), alcance: u(30), efecto: efecto(o.danoDeBala ?? 12, puesta(E.tocado, 10)) }],
    turnos: { cuerpoACuerpo: 2, disparo: 1, anunciosALaVez: 3, excluyen: [E.premio, E.sinCuerpo, E.ausente, E.reaparecido], alargarConLaRed: true, repetirTrasTics: o.repetirTrasTics ?? 0 },
    portables: [{ id: 1, tope: 12, radioDeRecogida: u(1.2), montonTics: 400, pago: { tipo: 'triangular', porUnidad: 10 } }],
    equipo: {
      recurso: o.recurso ?? 2,
      caida: puesta(E.caidaAsiento, 240),
      reaparicion: { coste: 1, esperaTics: 160, vida: 60, puesta: puesta(E.reaparecido, 40, 40) },
    },
    sinCuerpo: { estado: E.sinCuerpo },
    presencia: { ausenteTrasTics: 40, estadoAusente: E.ausente, veredictoTrasTics: 1200 },
    avisos: {
      clases: [
        { id: 1, vidaTics: 80, objetivo: 'entidad' },
        { id: 2, vidaTics: 60, objetivo: 'asiento' },
        { id: 3, vidaTics: 60, objetivo: 'ninguno' },
      ],
      cadaTics: 20,
    },
    red: { compBaseMs: 25, compTopeMs: 150, esperaDeSitiosMs: 250 },
    veredictos: { columnas: COLUMNAS },
    aforo: o.aforo ?? { entidades: 14, balas: 12, montones: 8 },
  };
}

/** Un grupo de `cuantos` de la clase 1 que salen de la zona `zona` (clase de zona) a la vez. */
function grupoFijo(n: number, cuantos: number, claseDeZona: number, vivas = cuantos, cadaTics = 0): GrupoDeclarado {
  return { clase: 1, cuantos: porN(n, () => cuantos), vivasALaVez: porN(n, () => vivas), claseDeZona, desdeTic: 0, cadaTics, eleccion: 'azar' };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * EL BANCO: UNA E/S SIMULADA CON APARATOS QUE TIENEN SU RELOJ Y SU RED
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La sala da un paso cada 50 ms de pared (el paso `k` en `k·50`). Lo que sale de un paso llega a cada
 * aparato media ida y vuelta después; cada aparato despierta una vez por tic, a su FASE dentro del tic,
 * lee lo que le ha llegado, deja decidir a su robot y manda su `aqui`, que llega a la sala media ida y
 * vuelta después y entra en el primer paso que venga. El reloj del aparato es el de pared más su
 * desfase VERDADERO `D`; la E/S cree que es `D + error`: es el número que viaja en cada entrada, y el
 * error que la sala tiene que aguantar sin que cambie ningún veredicto.
 */

interface Pulsacion {
  id: number;
  ms: number;
  blanco: number;
}

interface Llegada {
  llega: number;
  orden: number;
  suceso: SucesoDelTic | null;
  dentro: { x: number; z: number } | null;
  corrige: { x: number; z: number } | null;
  foto: readonly TuplaDeFoto[] | null;
}

type Robot = (a: Aparato, b: Banco, relojMs: number) => void;

class Aparato {
  readonly numero: number;
  readonly D: number;
  readonly error: number;
  readonly rtt: number;
  readonly fase: number;
  robot: Robot;
  x = 0;
  z = 0;
  mira = 0;
  conectado = false;
  buzon: Llegada[] = [];
  /** Lo que ha oído, en orden: `[instante de llegada (pared), suceso]`. */
  oido: { llega: number; suceso: SucesoDelTic }[] = [];
  ultimaFoto: readonly TuplaDeFoto[] = [];
  planes: Pulsacion[] = [];
  sosten: Pulsacion | null = null;
  meta: { x: number; z: number } | null = null;
  /** La esquiva que está haciendo: tics que le quedan y hacia dónde. */
  esquivaTics = 0;
  esquivaRumbo = 0;
  bloqueadoHasta = -1;
  mandadas = 0;
  /** Hasta su `dentro` no sabe dónde está, y no manda `aqui` (ver `Bienvenida`). */
  dentro = false;
  /** Si al esquivar se desplaza (lo normal) o se queda donde está (para juzgar la ventana sin el alcance). */
  desplazaAlEsquivar = true;
  /** Con el canal abierto pero sin mandar `aqui`: la pestaña oculta (ver el bloque 12). */
  mudo = false;
  /** A qué velocidad anda hacia su meta (Q16.16 por segundo): trote, salvo que la prueba pida otra. */
  velocidad = u(5);
  /** La acometida de un golpe con avance: hacia dónde y cuánto le queda (la hace el aparato; la sala la admite). */
  acomete: { x: number; z: number; queda: number } | null = null;
  constructor(numero: number, D: number, error: number, rtt: number, fase: number, robot: Robot) {
    this.numero = numero;
    this.D = D;
    this.error = error;
    this.rtt = rtt;
    this.fase = fase;
    this.robot = robot;
  }
  reloj(pared: number): number {
    return pared + this.D;
  }
  planear(id: number, ms: number, blanco: number): void {
    this.planes.push({ id, ms: Math.max(0, Math.round(ms)), blanco });
    this.planes.sort((p, q) => p.ms - q.ms);
  }
}

class Banco {
  sala: EstadoDeLaSala;
  readonly aparatos: Aparato[];
  readonly arena: Arena;
  enVuelo: { llega: number; orden: number; entrada: EntradaDeLaSala }[] = [];
  orden = 0;
  /** Todos los pasos, para leer lo que salió. */
  pasos: PasoDeLaSala[] = [];
  /** Lo que ha costado `avanzarLaSala`, en ms, y cuántas veces. */
  costeMs = 0;
  llamadas = 0;
  /** Las entradas de cada paso, para reproducirlas (Hermes, determinismo). */
  grabadas: EntradaDeLaSala[][] = [];
  guardarPasos = true;
  constructor(d: LizaDeclarada, semilla: number, aparatos: Aparato[]) {
    this.sala = salaNueva(d, semilla);
    this.aparatos = aparatos;
    this.arena = arenaDeLaLiza(d);
  }
  get k(): number {
    return this.sala.tic;
  }
  aparato(n: number): Aparato {
    return this.aparatos[n - 1] as Aparato;
  }
  meter(llega: number, entrada: EntradaDeLaSala): void {
    this.enVuelo.push({ llega, orden: this.orden++, entrada });
  }
  conectar(n: number): void {
    const a = this.aparato(n);
    a.conectado = true;
    a.dentro = false;
    a.buzon = [];
    a.planes = [];
    a.sosten = null;
    this.meter(this.k * 50 + 1, { tipo: 'conexion', asiento: n, rttMs: a.rtt, desfaseMs: a.D + a.error });
  }
  desconectar(n: number): void {
    const a = this.aparato(n);
    a.conectado = false;
    this.meter(this.k * 50 + 1, { tipo: 'desconexion', asiento: n });
  }
  /** Un paso de la sala y una vuelta de todos los aparatos. */
  tic(): PasoDeLaSala {
    const T = (this.k + 1) * 50;
    const listas: { llega: number; orden: number; entrada: EntradaDeLaSala }[] = [];
    const quedan: { llega: number; orden: number; entrada: EntradaDeLaSala }[] = [];
    for (const v of this.enVuelo) (v.llega <= T ? listas : quedan).push(v);
    listas.sort((p, q) => p.llega - q.llega || p.orden - q.orden);
    this.enVuelo = quedan;
    const entradas = listas.map((v) => v.entrada);
    this.grabadas.push(entradas);
    const antes = performance.now();
    const p = avanzarLaSala(this.sala, entradas);
    this.costeMs += performance.now() - antes;
    this.llamadas++;
    if (this.guardarPasos) this.pasos.push(p);
    this.sala = p.sala;
    for (const a of this.aparatos) {
      if (!a.conectado) continue;
      const llega = T + a.rtt / 2;
      for (const b of p.bienvenidas) if (b.asiento === a.numero) a.buzon.push({ llega, orden: this.orden++, suceso: null, dentro: { x: b.x, z: b.z }, corrige: null, foto: null });
      for (const c of p.correcciones) if (c.asiento === a.numero) a.buzon.push({ llega, orden: this.orden++, suceso: null, dentro: null, corrige: { x: c.x, z: c.z }, foto: null });
      for (const s of p.sucesos) if (s.para === 0 || s.para === a.numero) a.buzon.push({ llega, orden: this.orden++, suceso: s.suceso, dentro: null, corrige: null, foto: null });
      if (p.fotoDebida !== null) a.buzon.push({ llega, orden: this.orden++, suceso: null, dentro: null, corrige: null, foto: p.fotoDebida });
    }
    for (const a of this.aparatos) if (a.conectado) this.despertar(a, T + a.fase);
    return p;
  }
  /** El aparato lee lo que le llegó, su robot decide, y manda su `aqui`. */
  private despertar(a: Aparato, pared: number): void {
    const listo: Llegada[] = [];
    const resto: Llegada[] = [];
    for (const l of a.buzon) (l.llega <= pared ? listo : resto).push(l);
    listo.sort((p, q) => p.llega - q.llega || p.orden - q.orden);
    a.buzon = resto;
    for (const l of listo) {
      if (l.dentro !== null) {
        a.dentro = true;
        a.x = l.dentro.x;
        a.z = l.dentro.z;
        a.oido = [];
        a.esquivaTics = 0;
      }
      if (l.corrige !== null) {
        a.x = l.corrige.x;
        a.z = l.corrige.z;
        a.esquivaTics = 0;
      }
      if (l.foto !== null) a.ultimaFoto = l.foto;
      if (l.suceso !== null) {
        a.oido.push({ llega: l.llega, suceso: l.suceso });
        const s = l.suceso;
        if (s.e === 'estado' && s.a === a.numero) {
          const bloquea = s.est === E.tocado || s.est === E.derribado || s.est === E.descolocado || s.est === E.caidaAsiento || s.est === E.sosteniendo || s.est === E.rematando;
          a.bloqueadoHasta = bloquea ? a.reloj(l.llega) + s.tics * 50 : -1;
        }
      }
    }
    const reloj = a.reloj(pared);
    const yo = this.sala.asientos[a.numero - 1];
    if (yo === undefined || !yo.conCuerpo || !a.dentro || a.mudo) return;
    a.robot(a, this, reloj);
    this.andar(a, reloj);
    let accion: AccionRecibida | null = null;
    const primera = a.planes[0];
    if (primera !== undefined && primera.ms <= reloj) {
      a.planes.shift();
      accion = { id: primera.id, msDelAparato: primera.ms, blanco: primera.blanco };
      if (primera.id === (this.sala.declaracion.asientos[a.numero - 1]?.esquiva.accion ?? A.esquiva) && a.desplazaAlEsquivar) {
        a.esquivaTics = 6;
        a.esquivaRumbo = (a.mira + 64) % 256;
      }
      if (a.sosten !== null && a.sosten.id !== primera.id) a.sosten = null;
      const golpe = this.sala.declaracion.asientos[a.numero - 1]?.acciones.find((x) => x.id === primera.id);
      const blanco = a.ultimaFoto.find((t) => t[0] === primera.blanco);
      if (golpe !== undefined && golpe.avance > 0 && blanco !== undefined) a.acomete = { x: Math.round((blanco[1] * UNO) / 100), z: Math.round((blanco[2] * UNO) / 100), queda: golpe.avance };
    } else if (a.sosten !== null) accion = { id: a.sosten.id, msDelAparato: a.sosten.ms, blanco: a.sosten.blanco };
    const n = Math.floor(reloj / 50);
    a.mandadas++;
    this.meter(pared + a.rtt / 2, { tipo: 'aqui', asiento: a.numero, n, x: a.x, z: a.z, r: a.mira, m: 0, accion, desfaseMs: a.D + a.error });
  }
  /** Lo que el aparato predice de su propio paso: la esquiva desplaza; si no, anda hacia su meta. */
  private andar(a: Aparato, reloj: number): void {
    const radio = u(0.35);
    if (a.acomete !== null) {
      const dx = a.acomete.x - a.x;
      const dz = a.acomete.z - a.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      const tramo = Math.min(u(0.6), a.acomete.queda, d - u(1));
      /* Por debajo de 5 cm la acometida ha acabado: seguir con pasos de nada la dejaba colgada para siempre. */
      if (tramo < u(0.05)) a.acomete = null;
      else {
        const q = unPaso(this.arena, a, Math.round((dx * tramo) / d), Math.round((dz * tramo) / d), UNO, radio);
        a.acomete.queda -= tramo;
        a.x = q.x;
        a.z = q.z;
        return;
      }
    }
    if (a.esquivaTics > 0) {
      a.esquivaTics--;
      const v = u(3.5 / 0.3);
      const q = unPaso(this.arena, a, por(v, SENO[a.esquivaRumbo] as number), -por(v, COSENO[a.esquivaRumbo] as number), DT_DEL_TIC, radio);
      a.x = q.x;
      a.z = q.z;
      return;
    }
    if (reloj < a.bloqueadoHasta || a.meta === null) return;
    const dx = a.meta.x - a.x;
    const dz = a.meta.z - a.z;
    if (Math.abs(dx) + Math.abs(dz) < u(0.3)) return;
    const r = rumboHacia(dx, dz);
    const v = a.velocidad;
    const q = unPaso(this.arena, a, por(v, SENO[r] as number), -por(v, COSENO[r] as number), DT_DEL_TIC, radio);
    a.x = q.x;
    a.z = q.z;
    a.mira = r;
  }
  /** Los sucesos para todos que salieron en los pasos guardados, con su tic. */
  sucesos(): { k: number; s: SucesoDelTic }[] {
    const t: { k: number; s: SucesoDelTic }[] = [];
    for (const p of this.pasos) for (const s of p.sucesos) if (s.para === 0) t.push({ k: p.sala.tic, s: s.suceso });
    return t;
  }
  veredictos(): { k: number; tipo: string; carga: unknown }[] {
    const t: { k: number; tipo: string; carga: unknown }[] = [];
    for (const p of this.pasos) for (const v of p.veredictos) t.push({ k: p.sala.tic, tipo: v.tipo, carga: v.carga });
    return t;
  }
  correr(tics: number): void {
    for (let i = 0; i < tics; i++) this.tic();
  }
}

/** `por` de `fijo.ts`, sin importarlo dos veces con otro nombre. */
function por(a: number, b: number): number {
  return ((a * b) / UNO) | 0;
}

/* ─── LOS ROBOTS ─────────────────────────────────────────────────────────── */

/** No hace nada: está, y manda su `aqui` quieto. */
const quieto: Robot = () => {};

/** Los anuncios contra mí que he oído y aún no he atendido, por id. */
function anunciosContraMi(a: Aparato, desde: number): { id: number; t: number; de: number; acc: number }[] {
  const lista: { id: number; t: number; de: number; acc: number }[] = [];
  for (let i = desde; i < a.oido.length; i++) {
    const s = (a.oido[i] as { suceso: SucesoDelTic }).suceso;
    if (s.e === 'anuncio' && s.a === a.numero) lista.push({ id: s.id, t: s.t, de: s.de, acc: s.acc });
  }
  return lista;
}

/**
 * EL QUE LEE: esquiva cada anuncio contra él a `X` ms de su impacto (en SU reloj: el `t` que le llegó),
 * nunca dos esquivas a menos de 450 ms (no se deja caer en la torpe); con el premio, lanza la réplica
 * contra quien le atacó; y remata lo que cae cerca. `X` fijo es lo que usa el bloque 4.
 */
/** Los ids con que juega un robot: los del juguete, o los que diga una declaración (ver `idsDe`). */
interface IdsDelRobot {
  readonly esquiva: number;
  readonly replica: number;
  readonly remate: number;
  readonly entrada: number;
}

const IDS_DEL_JUGUETE: IdsDelRobot = { esquiva: A.esquiva, replica: A.replica, remate: A.remate, entrada: A.entrada };

/** Los ids de una declaración cualquiera: su esquiva, lo que lanza tras una limpia, su remate y la primera acción que abre con blanco. */
function idsDe(d: LizaDeclarada): IdsDelRobot {
  const r = d.asientos[0] as ReglasDeAsiento;
  let remate = 0;
  for (const c of d.clases) if (remate === 0 && c.alCaer.tipo === 'rematable') remate = c.alCaer.remate.accion;
  const entrada = r.acciones.find((x) => x.cadena === null && x.enganche !== null && x.soloEn.length === 0);
  return { esquiva: r.esquiva.accion, replica: r.esquiva.contraProyectil.accion, remate, entrada: entrada?.id ?? 0 };
}

function lector(X: number, opciones: { replica?: boolean; rematar?: boolean; esquivar?: boolean; consumir?: boolean; ids?: IdsDelRobot } = {}): Robot {
  const ids = opciones.ids ?? IDS_DEL_JUGUETE;
  const atendidos = new Set<number>();
  let leido = 0;
  let ultimaEsquiva = -1e9;
  let premioHasta = -1;
  let replicaContra = 0;
  let ultimoAtacante = 0;
  return (a, b, reloj) => {
    if (leido > a.oido.length) leido = 0;
    for (let i = leido; i < a.oido.length; i++) {
      const s = (a.oido[i] as { suceso: SucesoDelTic; llega: number }).suceso;
      const llega = (a.oido[i] as { llega: number }).llega;
      if (s.e === 'anuncio' && s.a === a.numero && !atendidos.has(s.id) && opciones.esquivar !== false) {
        atendidos.add(s.id);
        ultimoAtacante = s.de;
        const quiere = s.t - X;
        const cuando = quiere < reloj ? reloj : quiere;
        if (cuando - ultimaEsquiva >= 450) {
          a.planear(ids.esquiva, cuando, 0);
          ultimaEsquiva = cuando;
        }
      }
      if (s.e === 'estado' && s.a === a.numero && premioDe(b.sala.declaracion, a.numero) === s.est) {
        premioHasta = a.reloj(llega) + s.tics * 50;
        replicaContra = ultimoAtacante;
      }
    }
    leido = a.oido.length;
    if (opciones.consumir === true) {
      a.oido = [];
      leido = 0;
    }
    if (opciones.replica !== false && replicaContra >= 16 && reloj < premioHasta) {
      a.planear(ids.replica, reloj, replicaContra);
      replicaContra = 0;
    }
    if (opciones.rematar === true && a.planes.length === 0) {
      const sala = b.sala;
      let objetivo = 0;
      for (const e of sala.entidades) {
        if (e.cerebro.modo !== 'caida') continue;
        if (Math.abs(e.x - a.x) + Math.abs(e.z - a.z) > u(3)) continue;
        objetivo = e.numero;
      }
      if (objetivo !== 0 && (a.sosten === null || a.sosten.blanco !== objetivo)) a.sosten = { id: ids.remate, ms: reloj, blanco: objetivo };
      if (objetivo === 0 && a.sosten !== null && a.sosten.id === ids.remate) a.sosten = null;
    }
  };
}

/** El estado del premio de una limpia de este asiento, según su declaración. */
function premioDe(d: LizaDeclarada, n: number): number {
  return d.asientos[n - 1]?.esquiva.alAcertar.puesta.estado ?? -1;
}

/** EL QUE APORREA: esquiva cada tres tics y golpea (entrada al más cercano) en los otros, sin mirar nada. */
function aporreador(): Robot {
  let vuelta = 0;
  return (a, b, reloj) => {
    vuelta++;
    if (vuelta % 3 === 0) a.planear(A.esquiva, reloj, 0);
    else {
      let mejor = 0;
      let mejorD = Infinity;
      for (const t of a.ultimaFoto) {
        if (t[0] < 16) continue;
        const d = Math.abs(t[1] - a.x * 100 / UNO) + Math.abs(t[2] - a.z * 100 / UNO);
        if (d < mejorD) {
          mejorD = d;
          mejor = t[0];
        }
      }
      if (mejor !== 0) a.planear(A.entrada, reloj, mejor);
    }
    void b;
  };
}

/* ─── AYUDAS PARA LEER LO QUE SALIÓ ──────────────────────────────────────── */

function sucesosDe<T extends SucesoDelTic['e']>(b: Banco, e: T): { k: number; s: Extract<SucesoDelTic, { e: T }> }[] {
  const t: { k: number; s: Extract<SucesoDelTic, { e: T }> }[] = [];
  for (const x of b.sucesos()) if (x.s.e === e) t.push({ k: x.k, s: x.s as Extract<SucesoDelTic, { e: T }> });
  return t;
}

/** Un banco de un asiento, con el aparato dado, conectado desde el primer tic. */
function bancoDeUno(d: LizaDeclarada, aparato: Aparato, semilla = 7): Banco {
  const b = new Banco(d, semilla, [aparato]);
  b.conectar(1);
  return b;
}

const NOMBRE_DEL_RESULTADO: Record<number, string> = {
  [RESULTADO.da]: 'da',
  [RESULTADO.limpia]: 'limpia',
  [RESULTADO.esquivada]: 'esquivada',
  [RESULTADO.parada]: 'parada',
  [RESULTADO.fallada]: 'fallada',
  [RESULTADO.cortada]: 'cortada',
};

/* ═══════════════════════════════════════════════════════════════════════════
 * 0 · LA LIZA DE JUGUETE SE DECLARA BIEN
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('0 · La liza de juguete y sus variantes se declaran sin problemas');
{
  /*
   * `montarJuguete` y no `juguete`: éste revienta con una declaración rota, y entonces estas cuatro no
   * podrían salir rojas nunca (la campaña de roturas las vio así, siempre verdes). Aquí se dice CUÁL
   * está mal y por qué; las pruebas de después siguen usando `juguete`, que no las deja empezar.
   */
  const variantes: [string, LizaDeclarada][] = [
    ['la de dos asientos', montarJuguete({})],
    ['la llena (seis asientos, tirador)', montarJuguete({ asientos: 6, clase: claseTiradora() })],
    ['la de salida por zona', montarJuguete({ fin: 'salida' })],
    ['la de calma', montarJuguete({ modo: 'calma' })],
  ];
  for (const [nombre, d] of variantes) {
    const problemas = problemasDeLaDeclaracion(d);
    comprobar(`${nombre} no tiene problemas`, problemas.length === 0, problemas.slice(0, 5));
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 1 · NACER Y EMPEZAR LA FASE
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('1 · Nacer y empezar la fase');
{
  const d = juguete();
  const s0 = salaNueva(d, 99);
  comprobar(
    'la sala nace en el tic 0, sin nadie conectado, sin cuerpos y con la fase sin empezar',
    s0.tic === 0 && s0.fase.clave === '' && s0.asientos.every((a) => !a.conectado && !a.conCuerpo) && s0.entidades.length === 0,
  );
  const p1 = avanzarLaSala(s0, []);
  const fase = p1.sucesos.find((x) => x.suceso.e === 'fase');
  comprobar(
    'el primer paso EMPIEZA la fase: cuenta la fase a todos con su clave y el reloj del encuentro entero',
    fase !== undefined && fase.para === 0 && fase.suceso.e === 'fase' && fase.suceso.clave === 'n1-e1' && fase.suceso.encuentroTics === 6000,
    fase,
  );
  comprobar(
    'todos tienen cuerpo en su sitio de nacer, con su punto de control, libres y con los contadores a cero',
    p1.sala.asientos.every((a, i) => a.conCuerpo && a.x === (d.mundo.nace[i] as { x: number }).x && a.vida === 100 && a.estado === null && a.contadores.esquivas === 0),
  );
  comprobar('el recurso es el del equipo y el encuentro empieza en este tic', p1.sala.recurso === 2 && p1.sala.encuentro !== null && p1.sala.encuentro.desdeTic === 1);
  comprobar('y salen ya las primeras entidades del grupo (con su nace)', p1.sala.entidades.length >= 1 && p1.sucesos.some((x) => x.suceso.e === 'nace'));
  comprobar('el estado que entra no se toca', huellaDeLaSala(s0) === huellaDeLaSala(salaNueva(d, 99)));
  const otra = avanzarLaSala(salaNueva(d, 100), []);
  const mismas = avanzarLaSala(salaNueva(d, 99), []);
  comprobar(
    'la semilla decide: con otra, las entidades salen en otro sitio; con la misma, en el mismo',
    huellaDeLaSala(otra.sala) !== huellaDeLaSala(p1.sala) && huellaDeLaSala(mismas.sala) === huellaDeLaSala(p1.sala),
  );
  const conOtraFase = { ...d, fase: { ...d.fase, clave: 'n1-p1', modo: 'calma' as const, encuentro: null } };
  let s = p1.sala;
  for (let i = 0; i < 5; i++) s = avanzarLaSala(s, []).sala;
  const p2 = avanzarLaSala(s, [{ tipo: 'vista', declaracion: conOtraFase }]);
  const sevas = p2.sucesos.filter((x) => x.suceso.e === 'seva');
  comprobar(
    'una vista con OTRA clave empieza otra fase: se va todo lo que vivía (seva disuelta), y la fase nueva sale',
    sevas.length === s.entidades.length && sevas.every((x) => x.suceso.e === 'seva' && x.suceso.por === MOTIVO_DE_IRSE.disuelta) && p2.sala.fase.clave === 'n1-p1' && p2.sala.entidades.length === 0,
    { sevas: sevas.length, entidades: s.entidades.length },
  );
  comprobar('y en la fase nueva el azar se vuelve a sembrar con SU semilla', p2.sala.azar.semilla === conOtraFase.fase.semilla && p2.sala.azar.tiradas === 0);
  const mismaClave = { ...d, fase: { ...d.fase, semilla: 777 } };
  const p3 = avanzarLaSala(s, [{ tipo: 'vista', declaracion: mismaClave }]);
  comprobar('una vista con la MISMA clave no empieza nada: las entidades siguen', p3.sala.entidades.length === s.entidades.length && !p3.sucesos.some((x) => x.suceso.e === 'seva'));
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 2 · CONEXIÓN, BIENVENIDA Y PUESTA AL DÍA
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('2 · Conexión, bienvenida y puesta al día');
{
  const d = juguete({ asientos: 1, clase: claseTiradora(), grupos: (n) => [grupoFijo(n, 1, 8)], zonasExtra: [{ id: 8, clase: 8, caja: caja(18, -20, 20, -18) }], nace: [{ x: 14, z: -14 }] });
  const ap = new Aparato(1, 5000, 0, 100, 10, quieto);
  const b = new Banco(d, 3, [ap]);
  b.conectar(1);
  let conBala = -1;
  let conAnuncio = -1;
  for (let i = 0; i < 400 && (conBala < 0 || conAnuncio < 0); i++) {
    b.tic();
    if (conBala < 0 && b.sala.balas.length > 0) conBala = b.k;
    if (conAnuncio < 0 && b.sala.anuncios.length > 0) conAnuncio = b.k;
  }
  const primero = b.pasos[0] as PasoDeLaSala;
  const bienvenida = primero.bienvenidas[0];
  comprobar('la primera conexión da una bienvenida en el sitio de nacer', bienvenida !== undefined && bienvenida.asiento === 1 && bienvenida.x === u(14) && bienvenida.z === u(-14), bienvenida);
  comprobar('el tirador llegó a disparar a quien se queda quieto (hay bala en vuelo)', conBala > 0, conBala);
  /* Reconectar con OTRO desfase: todo lo pendiente tiene que llegar en el reloj nuevo. */
  while (b.sala.balas.length === 0 && b.k < 800) b.tic();
  const sala = b.sala;
  const bala = sala.balas[0];
  const nuevoDesfase = 777777;
  const p = avanzarLaSala(sala, [{ tipo: 'conexion', asiento: 1, rttMs: 60, desfaseMs: nuevoDesfase }]);
  const suyos = p.sucesos.filter((x) => x.para === 1).map((x) => x.suceso);
  const orden = suyos.map((s) => s.e);
  const clasesEnOrden = ['fase', 'recurso', 'cuenta', 'nace', 'bala'];
  let ultimo = -1;
  let enOrden = true;
  for (const c of clasesEnOrden) {
    const i = orden.indexOf(c as SucesoDelTic['e']);
    if (i < 0 || i < ultimo) enOrden = false;
    ultimo = i < 0 ? ultimo : i;
  }
  comprobar('quien reconecta recibe su dentro y la puesta al día EN ORDEN (fase, recurso, cuentas, nace, balas…)', p.bienvenidas.length === 1 && enOrden, orden);
  const sucesoBala = suyos.find((s) => s.e === 'bala');
  comprobar(
    'y la bala le llega con la salida en su reloj NUEVO (salida de la sala + desfase nuevo)',
    bala !== undefined && sucesoBala !== undefined && sucesoBala.e === 'bala' && sucesoBala.t === bala.salioEnTic * 50 + nuevoDesfase,
    { suceso: sucesoBala, salio: bala?.salioEnTic },
  );
  const salaTras = p.sala;
  comprobar(
    'la bala guardada en la sala se reescribió con el desfase nuevo',
    salaTras.balas.length > 0 && salaTras.balas[0]!.salidaEnSuReloj[0] === salaTras.balas[0]!.salioEnTic * 50 + nuevoDesfase,
  );
  const tras = avanzarLaSala(salaTras, [{ tipo: 'aqui', asiento: 1, n: 0, x: salaTras.asientos[0]!.x, z: salaTras.asientos[0]!.z, r: 0, m: 0, accion: null, desfaseMs: nuevoDesfase }]);
  comprobar(
    'un canal nuevo es un reloj nuevo: tras reconectar, su aqui con n = 0 se acepta (no se tira por viejo)',
    tras.sala.asientos[0]!.ultimoTicDelAparato === 0,
    tras.sala.asientos[0]!.ultimoTicDelAparato,
  );
  /* Un anuncio pendiente, reescrito para quien reconecta. */
  const dm = juguete({ asientos: 1, grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [{ id: 7, clase: 7, caja: caja(-0.2, -6.9, 0.2, -6.6) }], nace: [{ x: 0, z: -8 }] });
  const b2 = bancoDeUno(dm, new Aparato(1, 9000, 0, 100, 10, quieto));
  while (b2.sala.anuncios.length === 0 && b2.k < 300) b2.tic();
  const an = b2.sala.anuncios[0];
  const p4 = avanzarLaSala(b2.sala, [{ tipo: 'conexion', asiento: 1, rttMs: 100, desfaseMs: 4242 }]);
  const anuncioSuyo = p4.sucesos.find((x) => x.para === 1 && x.suceso.e === 'anuncio');
  comprobar(
    'un anuncio pendiente contra quien reconecta le llega con el impacto en su reloj nuevo, y así queda guardado (tBlanco)',
    an !== undefined &&
      anuncioSuyo !== undefined &&
      anuncioSuyo.suceso.e === 'anuncio' &&
      anuncioSuyo.suceso.t === an.impactoMs + 4242 &&
      p4.sala.anuncios[0]!.tBlanco === an.impactoMs + 4242,
    { an, anuncioSuyo },
  );
  comprobar('todo lo que sale por el cable lo admite el lector estricto del aparato', todoSeLee(b.pasos) && todoSeLee([p, p4]));

  /*
   * Quien conecta en el MISMO paso en que otro lanza un golpe, con su conexión delante del `aqui` del
   * golpe: lo encontró la revisión del frente. El anuncio le llegaba dos veces, y la primera antes de su
   * puesta al día (antes de saber en qué fase está).
   */
  const dd = juguete({ asientos: 2, clase: sacoQuieto(), grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-0.1, -6.6, 0.1, -6.4) }], nace: [{ x: 0, z: -8 }, { x: 6, z: -8 }] });
  /* A mano y sin `Mano` (que se declara más abajo, en el bloque 3). */
  let sd = avanzarLaSala(salaNueva(dd, 1), [{ tipo: 'conexion', asiento: 1, rttMs: 100, desfaseMs: 0 }]).sala;
  for (let i = 0; i < 20; i++) sd = avanzarLaSala(sd, [{ tipo: 'aqui', asiento: 1, n: sd.tic + 1, x: sd.asientos[0]!.x, z: sd.asientos[0]!.z, r: 0, m: 0, accion: null, desfaseMs: 0 }]).sala;
  const saco1 = sd.entidades[0]?.numero ?? 16;
  const golpe: EntradaDeLaSala = { tipo: 'aqui', asiento: 1, n: sd.tic + 1, x: sd.asientos[0]!.x, z: sd.asientos[0]!.z, r: 0, m: 0, accion: { id: A.entrada, msDelAparato: (sd.tic + 1) * 50, blanco: saco1 }, desfaseMs: 0 };
  const pd = avanzarLaSala(sd, [{ tipo: 'conexion', asiento: 2, rttMs: 100, desfaseMs: 777 }, golpe]);
  const suyosD = pd.sucesos.filter((x) => x.para === 2).map((x) => x.suceso.e);
  const anunciosD = suyosD.filter((e) => e === 'anuncio').length;
  comprobar(
    'quien conecta en el paso en que otro golpea recibe ese anuncio UNA vez, dentro de su puesta al día (detrás de su fase)',
    anunciosD === 1 && suyosD.indexOf('anuncio') > suyosD.indexOf('fase') && suyosD.indexOf('fase') >= 0,
    suyosD,
  );
  /*
   * Y lo que se lanza DESPUÉS de su puesta al día, en ese mismo paso —el golpe que una entidad decide al
   * simular—, le llega como a todos: callarle los anuncios mientras no está al día es sólo eso, mientras.
   */
  let sg = avanzarLaSala(salaNueva(dm, 1), [{ tipo: 'conexion', asiento: 1, rttMs: 100, desfaseMs: 0 }]).sala;
  let antesDelGolpe: EstadoDeLaSala | null = null;
  for (let i = 0; i < 300 && antesDelGolpe === null; i++) {
    const p = avanzarLaSala(sg, [{ tipo: 'aqui', asiento: 1, n: sg.tic + 1, x: sg.asientos[0]!.x, z: sg.asientos[0]!.z, r: 0, m: 0, accion: null, desfaseMs: 0 }]);
    if (p.sala.anuncios.some((an) => an.de >= 16 && an.lanzadoEnTic === p.sala.tic)) antesDelGolpe = sg;
    else sg = p.sala;
  }
  const pg = antesDelGolpe === null ? null : avanzarLaSala(antesDelGolpe, [{ tipo: 'conexion', asiento: 1, rttMs: 100, desfaseMs: 4242 }]);
  const nuevoG = pg === null ? undefined : pg.sala.anuncios.find((an) => an.de >= 16 && an.lanzadoEnTic === pg.sala.tic);
  const anunciosG = pg === null ? [] : pg.sucesos.filter((x) => x.para === 1 && x.suceso.e === 'anuncio').map((x) => x.suceso as { id: number; t: number });
  comprobar(
    'y el golpe que una entidad lanza en ese mismo paso, detrás de su puesta al día, le llega una vez y en su reloj nuevo',
    nuevoG !== undefined && anunciosG.length === 1 && anunciosG[0]!.id === nuevoG.id && anunciosG[0]!.t === nuevoG.impactoMs + 4242,
    { nuevoG, anunciosG },
  );
}

/** ¿Pasa por `leerMensajeDeLaSala` cada `tic` y cada foto que la E/S escribiría con estos pasos? */
function todoSeLee(pasos: readonly PasoDeLaSala[]): boolean {
  for (const p of pasos) {
    const k = p.sala.tic;
    for (let i = 0; i < p.sucesos.length; i += 200) {
      const ev = p.sucesos.slice(i, i + 200).map((s) => s.suceso);
      if (leerMensajeDeLaSala(textoDeLaSala({ t: 'tic', k, ev })) === null) {
        nota(`no se lee: ${JSON.stringify(ev).slice(0, 400)}`);
        return false;
      }
    }
    if (p.fotoDebida !== null && leerMensajeDeLaSala(textoDeLaSala({ t: 'foto', k, p: p.fotoDebida })) === null) return false;
    for (const c of p.correcciones) if (leerMensajeDeLaSala(textoDeLaSala({ t: 'corrige', n: c.n, x: c.x, z: c.z })) === null) return false;
    for (const w of p.bienvenidas) if (leerMensajeDeLaSala(textoDeLaSala({ t: 'dentro', yo: w.asiento, k, x: w.x, z: w.z, r: w.r, hz: 20 })) === null) return false;
  }
  return true;
}


/* ═══════════════════════════════════════════════════════════════════════════
 * 3 · VALIDACIÓN DEL SITIO Y CORRECCIÓN
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * UNA MANO que lleva a un asiento con `aqui` escritos a mano, uno por tic, con desfase 0 (su tic del
 * aparato es el de la sala). Sin red: aquí se prueba la validación, no el reloj.
 */
class Mano {
  sala: EstadoDeLaSala;
  readonly n: number;
  /** `rtt` es la ida y vuelta que la sala cree que tiene: dice cuántos `aqui` venían de camino tras un `corrige`. */
  constructor(d: LizaDeclarada, n = 1, rtt = 100) {
    this.n = n;
    this.sala = avanzarLaSala(salaNueva(d, 1), [{ tipo: 'conexion', asiento: n, rttMs: rtt, desfaseMs: 0 }]).sala;
  }
  get yo(): EstadoDeLaSala['asientos'][number] {
    return this.sala.asientos[this.n - 1] as EstadoDeLaSala['asientos'][number];
  }
  paso(entradas: EntradaDeLaSala[]): PasoDeLaSala {
    const p = avanzarLaSala(this.sala, entradas);
    this.sala = p.sala;
    return p;
  }
  ir(x: number, z: number, accion: AccionRecibida | null = null, n = this.sala.tic + 1): PasoDeLaSala {
    return this.paso([{ tipo: 'aqui', asiento: this.n, n, x, z, r: 0, m: 2, accion, desfaseMs: 0 }]);
  }
  /** Anda en línea recta hasta `(x, z)` a `paso` por tic. Devuelve cuántas correcciones hubo. */
  caminar(x: number, z: number, paso = u(0.25)): number {
    let correcciones = 0;
    for (let i = 0; i < 2000; i++) {
      const dx = x - this.yo.x;
      const dz = z - this.yo.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d <= paso) {
        correcciones += this.ir(x, z).correcciones.length;
        return correcciones;
      }
      correcciones += this.ir(this.yo.x + Math.round((dx * paso) / d), this.yo.z + Math.round((dz * paso) / d)).correcciones.length;
    }
    return correcciones;
  }
  esperar(tics: number): void {
    for (let i = 0; i < tics; i++) this.ir(this.yo.x, this.yo.z);
  }
}

paso('3 · Validación del sitio y corrección');
{
  const d = juguete({ asientos: 1, modo: 'calma', nace: [{ x: 0, z: -8 }] });
  /*
   * Con un segundo de ida y vuelta: lo que el aparato manda en los diez tics que siguen a un `corrige`
   * todavía salió desde el sitio malo (el `corrige` aún no le había llegado), y es lo que se calla.
   */
  const m = new Mano(d, 1, 1000);
  /*
   * 20 m y no 4: el presupuesto corto acumula 8,75 m (20 tics a 8,75 m/s), y con 4 m no se gastaba ni
   * la mitad aunque no se rellenara nunca (la campaña de roturas lo vio: rellenarlo a la cuarta parte
   * dejaba esto en verde). Ida y vuelta por la plaza, sin cajas en medio.
   */
  let correccionesAndando = 0;
  for (const z of [-4, -8, -4, -8, -4]) correccionesAndando += m.caminar(0, u(z));
  comprobar('andar a 5 m/s por la plaza (20 m, más de lo que acumula el presupuesto corto) no se corrige nunca', correccionesAndando === 0 && m.yo.z === u(-4), correccionesAndando);
  const antes = { x: m.yo.x, z: m.yo.z };
  const tele = m.ir(u(12), u(-4));
  comprobar(
    'saltar 12 m en un tic se corrige (presupuesto corto) y el sitio bueno no se mueve',
    tele.correcciones.length === 1 && tele.correcciones[0]!.x === antes.x && tele.correcciones[0]!.z === antes.z && m.yo.x === antes.x,
    tele.correcciones,
  );
  let callados = 0;
  for (let i = 0; i < 10; i++) callados += m.ir(u(12 + 0.25 * (i + 1)), u(-4)).correcciones.length;
  comprobar('lo que ya venía de camino desde el sitio malo se calla: ni una corrección más en el segundo siguiente', callados === 0, callados);
  let repetida = 0;
  for (let i = 0; i < 12; i++) repetida += m.ir(u(15), u(-4)).correcciones.length;
  comprobar('pasado el segundo, quien insiste desde el sitio malo se vuelve a corregir', repetida >= 1, repetida);
  const vuelta = m.ir(antes.x + u(0.2), antes.z);
  comprobar('desde el sitio corregido se sigue andando: se acepta y el silencio se acaba', vuelta.correcciones.length === 0 && m.yo.x === antes.x + u(0.2), vuelta.correcciones);

  m.caminar(0, u(3));
  m.esperar(25);
  const muro = m.ir(0, u(9));
  comprobar('cruzar el quiosco en recta se corrige (estructura) aunque el presupuesto dé para ello', muro.correcciones.length === 1 && m.yo.z === u(3), m.yo);
  m.caminar(u(2.4), u(3));
  m.caminar(u(2.4), u(3.75));
  const escuadra = m.ir(u(2.04), u(3.6));
  comprobar(
    'un paso de un tic que muerde la esquina del quiosco en recta pero no en escuadra se admite (la tolerancia de botas)',
    escuadra.correcciones.length === 0 && m.yo.x === u(2.04),
    escuadra.correcciones,
  );
  m.ir(u(2.4), u(3.75));
  /*
   * La escuadra es para el tramo de UN tic del aparato, sea del largo que sea (el de una esquiva también
   * muerde: ver abajo). Con un tic del aparato perdido por medio, y más largo que un tic de andar, ya no
   * es un paso de `unPaso`: en recta o nada.
   */
  const largoDeMas = m.ir(u(1.9), u(3.6), null, m.sala.tic + 2);
  comprobar('y el mismo mordisco más largo que un tic de andar y con un tic del aparato perdido por medio, no', largoDeMas.correcciones.length === 1, largoDeMas.correcciones);

  /*
   * Desde un sitio sin corrección pendiente (el aqui quieto la cierra): si no, el silencio tras
   * corregir se calla el viejo por su cuenta y esta comprobación saldría verde sin mirar el `n`. Lo
   * cazó verla en rojo: quitar la regla del `n` viejo no ponía nada rojo. (Con el tic del aparato que el
   * mordisco de arriba adelantó uno: si no, este `aqui` sería él mismo viejo.)
   */
  m.ir(u(2.4), u(3.75), null, m.sala.tic + 2);
  const vieja = m.ir(u(5), u(1), null, 3);
  comprobar('un aqui con un tic del aparato viejo se tira: ni corrige ni mueve', vieja.correcciones.length === 0 && m.yo.x === u(2.4) && m.yo.z === u(3.75));

  m.caminar(u(2.4), u(2));
  m.esperar(3);
  const x0 = m.yo.x;
  const juntos = m.paso([
    { tipo: 'aqui', asiento: 1, n: m.sala.tic + 1, x: x0 - u(0.4), z: m.yo.z, r: 0, m: 2, accion: null, desfaseMs: 0 },
    { tipo: 'aqui', asiento: 1, n: m.sala.tic + 2, x: x0 - u(0.8), z: m.yo.z, r: 0, m: 2, accion: null, desfaseMs: 0 },
    { tipo: 'aqui', asiento: 1, n: m.sala.tic + 3, x: x0 - u(1.2), z: m.yo.z, r: 0, m: 2, accion: null, desfaseMs: 0 },
  ]);
  comprobar('tres aqui que llegan juntos tras un tirón de red caben en el presupuesto acumulado', juntos.correcciones.length === 0 && m.yo.x === x0 - u(1.2), juntos.correcciones);

  const dl = juguete({ asientos: 1, modo: 'calma', limite: 2, nace: [{ x: 0, z: -8 }], reaparicion: { x: 0, z: -9 } });
  const ml = new Mano(dl);
  ml.caminar(u(9.8), u(-8));
  const fuera = ml.ir(u(10.3), u(-8));
  comprobar('salirse del límite de la fase se corrige, aunque haya suelo y presupuesto', fuera.correcciones.length === 1 && ml.yo.x === u(9.8), ml.yo.x);

  const dg = juguete({ asientos: 1, modo: 'calma', nace: [{ x: -18, z: -18 }] });
  const mg = new Mano(dg);
  const vuelta4 = [
    { x: 18, z: -18 },
    { x: 18, z: 18 },
    { x: -18, z: 18 },
    { x: -18, z: -18 },
  ];
  let primera = -1;
  let pasos = 0;
  for (let v = 0; v < 2 && primera < 0; v++) {
    for (const esquina of vuelta4) {
      for (let i = 0; i < 400 && primera < 0; i++) {
        const dx = u(esquina.x) - mg.yo.x;
        const dz = u(esquina.z) - mg.yo.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < u(0.425)) break;
        pasos++;
        const p = mg.ir(mg.yo.x + Math.round((dx * u(0.425)) / dist), mg.yo.z + Math.round((dz * u(0.425)) / dist));
        if (p.correcciones.length > 0) primera = pasos;
      }
      if (primera >= 0) break;
    }
  }
  comprobar(
    'correr a 8,5 m/s sin parar (dentro del presupuesto corto) se corrige al pasar de 80 m en 10 s: el presupuesto largo',
    primera >= 188 && primera <= 190,
    { primera, esperada: Math.ceil(80 / 0.425) },
  );

  const de = juguete({ asientos: 1, nace: [{ x: 0, z: -8 }], grupos: (n) => [{ ...grupoFijo(n, 1, 1), desdeTic: 5000 }] });
  for (const conEsquiva of [true, false]) {
    const me = new Mano(de);
    me.ir(u(8), u(-8));
    me.ir(u(8.1), u(-8), conEsquiva ? { id: A.esquiva, msDelAparato: me.sala.tic * 50 + 10, blanco: 0 } : null);
    const salto = me.ir(u(11.1), u(-8));
    if (conEsquiva) comprobar('con el presupuesto gastado, la distancia extra de la esquiva deja saltar 3 m en el tic siguiente', salto.correcciones.length === 0 && me.yo.x === u(11.1), salto.correcciones);
    else comprobar('y sin esquiva, el mismo salto se corrige (la extra es de la esquiva, no de la holgura)', salto.correcciones.length === 1, salto.correcciones);
  }

  /*
   * LA ESQUIVA QUE EMPIEZA JUSTO DESPUÉS DE UN CORRIGE (la encontró la revisión del frente). El aparato
   * aplica el `corrige` y esquiva de lado desde el sitio corregido: seis tics de 0,58 m, más que un paso
   * de andar. La primera versión decidía «ya venía de camino» por esa distancia: se callaba la esquiva
   * entera, y al segundo mandaba otro `corrige` que devolvía al asiento 3,5 m atrás. Ahora se callan sólo
   * los dos `aqui` que el aparato mandó antes de que el `corrige` le llegara (100 ms de ida y vuelta).
   */
  const dq = juguete({ asientos: 1, nace: [{ x: 0, z: 2 }], grupos: (n) => [{ ...grupoFijo(n, 1, 1), desdeTic: 5000 }] });
  const quiebroTrasCorregir = (conCorreccion: boolean): { aceptados: string; correcciones: number; sala: number; aparato: number } => {
    const mq = new Mano(dq);
    mq.esperar(25);
    /* Un paso que se mete en el quiosco (su caja va de z 4 a 8): se corrige. */
    let correcciones = conCorreccion ? mq.ir(mq.yo.x, u(3.9)).correcciones.length : 0;
    const z0 = mq.yo.z;
    let x = mq.yo.x;
    let aceptados = '';
    for (let t = 0; t < 30; t++) {
      if (t < 6) x += u(0.583);
      const p = mq.ir(x, z0, t === 0 ? { id: A.esquiva, msDelAparato: (mq.sala.tic + 1) * 50, blanco: 0 } : null);
      correcciones += p.correcciones.length;
      aceptados += mq.yo.x === x ? '1' : '0';
    }
    return { aceptados, correcciones, sala: mq.yo.x, aparato: x };
  };
  const sinCorrige = quiebroTrasCorregir(false);
  const conCorrige = quiebroTrasCorregir(true);
  comprobar(
    'tras un corrige, la esquiva que empieza desde el sitio corregido se admite: sólo se callan los dos aqui que venían de camino, sin otro corrige, y acaba donde el aparato',
    sinCorrige.correcciones === 0 && sinCorrige.aceptados === '1'.repeat(30) && conCorrige.correcciones === 1 && conCorrige.sala === conCorrige.aparato && conCorrige.aceptados === `00${'1'.repeat(28)}`,
    { sinCorrige, conCorrige },
  );

  /*
   * Y LAS ESQUIVAS JUNTO A UNA ESQUINA (también de la revisión): el aparato las hace con `unPaso`, que en
   * diagonal muerde la esquina como al andar, pero con pasos de 0,58 m. La escuadra era sólo para pasos
   * de un tic de andar, y de 2208 esquivas alrededor de la esquina del quiosco 13 se corregían (y el
   * silencio de después se las comía enteras). La escuadra es para el tramo de UN tic del aparato.
   */
  const arenaQ = arenaDeLaLiza(dq);
  const radioQ = u(0.35);
  const vQ = u(3.5 / 0.3);
  let esquivasQ = 0;
  let corregidasQ = 0;
  const ejemplosQ: string[] = [];
  for (let ix = 0; ix < 12; ix++) {
    for (let iz = 0; iz < 12; iz++) {
      for (let r = 0; r < 256; r += 16) {
        const sx = u(2.2) + ix * u(0.1);
        const sz = u(2.4) + iz * u(0.15);
        if (chocaAqui(arenaQ, sx, sz)) continue;
        const dEsquina = { ...dq, mundo: { ...dq.mundo, nace: [{ papel: 'asiento' as const, x: sx, z: sz, rumbo: 0 }, dq.mundo.nace[dq.mundo.nace.length - 1]!] } };
        const mx = new Mano(dEsquina);
        mx.esperar(3);
        if (mx.yo.x !== sx || mx.yo.z !== sz) continue;
        esquivasQ++;
        let q = { x: sx, z: sz };
        let corregidas = 0;
        for (let t = 0; t < 8; t++) {
          if (t < 6) q = unPaso(arenaQ, q, por(vQ, SENO[r] as number), -por(vQ, COSENO[r] as number), DT_DEL_TIC, radioQ);
          const p = mx.ir(q.x, q.z, t === 0 ? { id: A.esquiva, msDelAparato: (mx.sala.tic + 1) * 50, blanco: 0 } : null);
          corregidas += p.correcciones.length;
        }
        if (corregidas > 0) {
          corregidasQ++;
          if (ejemplosQ.length < 4) ejemplosQ.push(`(${(sx / UNO).toFixed(2)}, ${(sz / UNO).toFixed(2)}) rumbo ${String(r)}`);
        }
      }
    }
  }
  comprobar(
    `las esquivas que el aparato hace con unPaso alrededor de la esquina del quiosco (${String(esquivasQ)}) no se corrigen nunca: la escuadra vale para su tramo de un tic`,
    esquivasQ > 2000 && corregidasQ === 0,
    { esquivasQ, corregidasQ, ejemplosQ },
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 4 · EL JUICIO DE LA ESQUIVA, EN EL RELOJ DEL APARATO
 * ═══════════════════════════════════════════════════════════════════════════ */

const ZONA_DELANTE = { id: 7, clase: 7, caja: caja(-0.2, -6.9, 0.2, -6.6) };

/** La liza de un asiento en `(0, −8)` y una entidad que sale justo delante y le ataca. */
function lizaDelDuelo(o: OpcionesDelJuguete = {}): LizaDeclarada {
  return juguete({ asientos: 1, clase: clase({ guardia: null }), grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }], ...o });
}

/**
 * Juega hasta que se resuelvan `cuantos` anuncios contra el asiento 1 y devuelve cómo se resolvieron, en
 * orden. El id de cada anuncio contra él lo saca de LO QUE LE LLEGÓ (su `anuncio`), no del estado.
 */
function veredictosContraUno(d: LizaDeclarada, robot: Robot, error: number, rtt: number, desplaza: boolean, cuantos: number, semilla = 7, fase = 17): string[] {
  const ap = new Aparato(1, 123457, error, rtt, fase, robot);
  ap.desplazaAlEsquivar = desplaza;
  const b = bancoDeUno(d, ap, semilla);
  const contraMi = new Set<number>();
  const salen: string[] = [];
  for (let i = 0; i < 600 && salen.length < cuantos; i++) {
    const p = b.tic();
    for (const s of p.sucesos) {
      if (s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.a === 1) contraMi.add(s.suceso.id);
      if (s.para === 0 && s.suceso.e === 'resuelve' && contraMi.has(s.suceso.id)) salen.push(NOMBRE_DEL_RESULTADO[s.suceso.r] ?? '?');
    }
  }
  return salen;
}

/** Esquiva el primer anuncio contra él a cada uno de estos ms antes del impacto (en su reloj), y nada más. */
function esquivasPlaneadas(antes: number[]): Robot {
  let hecho = false;
  return (a, _b, reloj) => {
    if (hecho) return;
    for (const x of a.oido) {
      const s = x.suceso;
      if (s.e !== 'anuncio' || s.a !== a.numero) continue;
      hecho = true;
      for (const ms of antes) a.planear(A.esquiva, s.t - ms < reloj ? reloj : s.t - ms, 0);
      return;
    }
  };
}

/**
 * Las fases del aparato dentro del tic de la sala (ms tras el paso en que despierta y manda su `aqui`).
 * La primera versión de este bloque sólo probaba la 17, y la revisión del frente vio que el veredicto de
 * una esquiva pulsada a tiempo cambiaba con ella: con la fase también, o el «no depende de la red» no
 * se ha probado.
 */
const FASES_DEL_APARATO = [0, 5, 10, 17, 25, 33, 40, 45, 49];

paso('4 · El juicio de la esquiva no depende del desfase ni de la red (condición de aprobación)');
{
  const d = lizaDelDuelo();
  const casos: [string, number | null, string][] = [
    ['a 20 ms del impacto', 20, 'limpia'],
    ['a 60 ms', 60, 'limpia'],
    ['a 100 ms', 100, 'limpia'],
    ['a 180 ms', 180, 'limpia'],
    ['a 225 ms (fuera de la limpia, dentro de la esquiva)', 225, 'esquivada'],
    ['sin esquivar', null, 'da'],
    ['a 400 ms (demasiado pronto: la esquiva ya lo sacó del alcance)', 400, 'fallada'],
  ];
  const errores = [0, 40, -40];
  const rtts = [50, 150, 250];
  const juiciosCon = (X: number | null): string[] => {
    const vistos: string[] = [];
    for (const error of errores) {
      for (const rtt of rtts) {
        for (const fase of FASES_DEL_APARATO) {
          const r = veredictosContraUno(d, X === null ? quieto : lector(X, { replica: false }), error, rtt, true, 1, 7, fase)[0] ?? 'nada';
          vistos.push(`${r}@${String(error)}/${String(rtt)}/f${String(fase)}`);
        }
      }
    }
    return vistos;
  };
  for (const [nombre, X, espera] of casos) {
    const vistos = juiciosCon(X);
    const otros = vistos.filter((v) => !v.startsWith(`${espera}@`));
    comprobar(
      `esquivar ${nombre} da «${espera}» con el desfase estimado con 0, +40 y −40 ms de error, con 50, 150 y 250 ms de ida y vuelta y con el aparato en cualquier punto de su tic (${String(vistos.length)} combinaciones)`,
      otros.length === 0,
      otros.slice(0, 12),
    );
  }
  let menorX = -1;
  for (const X of [5, 10, 15, 20]) if (menorX < 0 && juiciosCon(X).every((v) => v.startsWith('limpia@'))) menorX = X;
  nota(`la esquiva más tardía que sale limpia en las ${String(errores.length * rtts.length * FASES_DEL_APARATO.length)} combinaciones: ${menorX < 0 ? 'más de 20' : String(menorX)} ms antes del impacto (el error del desfase que el comp no cubre, sin el tic en que sale el aqui: ver TICS_DEL_AQUI)`);

  const dp = lizaDelDuelo({ primeras: { cuantas: 1, ventanaMs: 300 } });
  const primeras = veredictosContraUno(dp, lector(240, { replica: false }), 40, 150, false, 2);
  comprobar('las primeras de la fase usan su ventana: a 240 ms la primera sale limpia y la segunda sólo esquivada', primeras.join(',') === 'limpia,esquivada', primeras);
  const dLargo = lizaDelDuelo({ clase: clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 30, enganche: null, alFallar: null })] }) });
  const tresSeguidas = veredictosContraUno(dLargo, esquivasPlaneadas([700, 400, 100]), 0, 100, false, 1);
  const dosSeguidas = veredictosContraUno(dLargo, esquivasPlaneadas([700, 100]), 0, 100, false, 1);
  comprobar('la tercera esquiva en menos de 24 tics sale TORPE: pulsada a tiempo, no esquiva (da)', tresSeguidas[0] === 'da', tresSeguidas);
  comprobar('y con sólo dos, la segunda a tiempo sí sale limpia', dosSeguidas[0] === 'limpia', dosSeguidas);
  const di = lizaDelDuelo({ clase: clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, imparable: true })] }) });
  const imparable = veredictosContraUno(di, lector(100, { replica: false }), 0, 100, false, 1);
  comprobar('un golpe imparable no mira la ventana: la esquiva perfecta no lo esquiva', imparable[0] === 'da', imparable);
  const dr = lizaDelDuelo({ medidor: 100, ruptura: puesta(E.esquivando, 14, 12, u(4), 6) });
  let rupturaHecha = false;
  const ruptura: Robot = (a, _b, reloj) => {
    if (rupturaHecha) return;
    for (const x of a.oido) {
      if (x.suceso.e === 'estado' && x.suceso.a === a.numero && x.suceso.est === E.tocado) {
        rupturaHecha = true;
        a.planear(A.esquiva, reloj, 0);
        return;
      }
    }
  };
  const apR = new Aparato(1, 5000, 0, 100, 17, ruptura);
  apR.desplazaAlEsquivar = false;
  const bR = bancoDeUno(dr, apR);
  const contraR: number[] = [];
  const idsR = new Set<number>();
  for (let i = 0; i < 400 && contraR.length < 2; i++) {
    const p = bR.tic();
    for (const s of p.sucesos) {
      if (s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.a === 1) idsR.add(s.suceso.id);
      if (s.para === 0 && s.suceso.e === 'resuelve' && idsR.has(s.suceso.id)) contraR.push(s.suceso.r);
    }
  }
  comprobar(
    'la esquiva de RUPTURA saca del tocado con su intocable: el segundo golpe de la cadena sale esquivado y el medidor baja su coste',
    contraR[0] === RESULTADO.da && contraR[1] === RESULTADO.esquivada && bR.sala.asientos[0]!.medidor === 50,
    { contraR, medidor: bR.sala.asientos[0]!.medidor },
  );
  const dEco = lizaDelDuelo({ repetirTrasTics: 4 });
  const eco = veredictosContraUno(dEco, lector(100, { replica: false }), 0, 100, false, 2);
  comprobar('la repetición sin autor cae a los 4 tics, dentro del premio intocable de la limpia: esquivada', eco.join(',') === 'limpia,esquivada', eco);
  /*
   * Contra quien el golpe dejó sin vida, la repetición no sale: sería un anillo contra un caído (lo vio la
   * revisión). A los 30 tics, cuando el primero ya se resolvió (a los 4 sale antes de que el primero lo
   * tumbe, y ése sí es de alguien en pie). Con recurso para volver, para que el encuentro siga mientras
   * está en el suelo: sin él se pierde en ese tic, se disuelve todo y la repetición no saldría de ningún
   * modo.
   */
  const dEcoCaido = lizaDelDuelo({ repetirTrasTics: 30, clase: clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(100, puesta(E.tocado, 12)) })] }) });
  const bEco = bancoDeUno(dEcoCaido, new Aparato(1, 5000, 0, 100, 17, quieto));
  bEco.correr(120);
  const golpesAlCaido = bEco.pasos.flatMap((p) => p.sucesos.filter((s) => s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.a === 1).map((s) => (s.suceso as { de: number }).de));
  comprobar(
    'y contra quien el golpe dejó sin vida la repetición no se anuncia: un anuncio (el que lo tumbó) y ninguno sin autor',
    bEco.sala.asientos[0]!.vida === 0 && golpesAlCaido.length === 1 && golpesAlCaido[0]! >= 16,
    golpesAlCaido,
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 5 · REMANSO, RÉPLICA Y ACOMETIDA
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('5 · El premio de la limpia, la réplica y la acometida tras una bala');
{
  const d = lizaDelDuelo();
  /*
   * Sin desplazarse al esquivar: la esquiva de lado deja al asiento a 3,6 m del autor, más allá del
   * alcance de una réplica sin avance (ver el informe del frente: la réplica de un juego necesita
   * `avance` si su esquiva desplaza). Aquí se prueba la réplica, no esa cuenta.
   */
  const ap = new Aparato(1, 8000, 0, 100, 17, lector(100, { replica: true }));
  ap.desplazaAlEsquivar = false;
  const b = bancoDeUno(d, ap);
  b.correr(300);
  const resueltos = sucesosDe(b, 'resuelve');
  const replicas = b.pasos.flatMap((p) => p.sucesos.filter((s) => s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.de === 1 && s.suceso.acc === A.replica).map((s) => ({ k: p.sala.tic, s: s.suceso })));
  const premio = b.pasos.find((p) => p.sucesos.some((s) => s.suceso.e === 'estado' && s.suceso.a === 1 && s.suceso.est === E.premio));
  comprobar('tras la limpia el asiento entra en su premio (el estado que declara `alAcertar`)', premio !== undefined);
  /*
   * Lo que PAGA la limpia, mirado en el tic en que se resuelve y no en el total de la ronda: el que lee
   * sigue sacando más del doble que el que aporrea aunque la limpia no pagara nada (le basta el
   * multiplicador que sube con ella), así que el bloque 12 no vigila esto. Visto: quitar la suma de
   * puntos de `premiarLimpia` dejaba las demás en verde.
   */
  const iLimpia = b.pasos.findIndex((p) => p.sucesos.some((s) => s.suceso.e === 'resuelve' && s.suceso.r === RESULTADO.limpia));
  const antesDeLaLimpia = iLimpia > 0 ? b.pasos[iLimpia - 1]!.sala.asientos[0] : undefined;
  const trasLaLimpia = iLimpia > 0 ? b.pasos[iLimpia]!.sala.asientos[0] : undefined;
  const pago =
    antesDeLaLimpia !== undefined && trasLaLimpia !== undefined
      ? {
          puntos: trasLaLimpia.puntos - antesDeLaLimpia.puntos,
          multiplicador: [antesDeLaLimpia.multiplicador, trasLaLimpia.multiplicador],
          medidor: trasLaLimpia.medidor - antesDeLaLimpia.medidor,
        }
      : null;
  comprobar(
    'la limpia paga en su tic: 50 puntos por el multiplicador de antes (1), 35 de medidor, y el multiplicador sube un paso',
    pago !== null && pago.puntos === 50 && pago.medidor === 35 && pago.multiplicador[0] === UNO && pago.multiplicador[1] === UNO + 6554,
    pago,
  );
  const primeraReplica = replicas[0];
  const idReplica = primeraReplica !== undefined && primeraReplica.s.e === 'anuncio' ? primeraReplica.s.id : -1;
  const resuelta = resueltos.find((x) => x.s.id === idReplica);
  comprobar(
    'la réplica pulsada en el premio sale (anuncio corto) y, imparable, da contra el autor descolocado: 25',
    resuelta !== undefined && resuelta.s.r === RESULTADO.da && resuelta.s.dano === 25,
    { replicas: replicas.length, resuelta },
  );
  const enPremio = (k: number): boolean => {
    const p = b.pasos[k - 1];
    const e = p === undefined ? null : p.sala.asientos[0]!.estado;
    return e !== null && e.estado === E.premio && k >= e.desdeTic && k < e.hastaTic;
  };
  const fueraDelPremio = replicas.filter((x) => x.s.e === 'anuncio' && !enPremio(b.pasos[x.k - 1]!.sala.anuncios.find((an) => an.id === (x.s as { id: number }).id)?.lanzadoEnTic ?? x.k));
  comprobar('todas las réplicas que salieron se lanzaron dentro de un premio', replicas.length >= 1 && fueraDelPremio.length === 0, { replicas: replicas.length, fuera: fueraDelPremio.length });
  const mr = new Mano(d);
  while (mr.sala.entidades.length === 0 && mr.sala.tic < 50) mr.esperar(1);
  mr.esperar(12);
  const blancoR = mr.sala.entidades[0]?.numero ?? 16;
  const sinPremio = mr.ir(mr.yo.x, mr.yo.z, { id: A.replica, msDelAparato: mr.sala.tic * 50, blanco: blancoR });
  comprobar('y pulsada sin estar en el premio no sale (su `soloEn`)', !sinPremio.sucesos.some((s) => s.suceso.e === 'anuncio' && s.suceso.de === 1) && !mr.sala.anuncios.some((an) => an.de === 1), sinPremio.sucesos.map((s) => s.suceso.e));

  /*
   * ESQUIVAR DENTRO DEL PREMIO NO LO ACABA (lo encontró la revisión del frente). El premio no bloquea
   * acciones, y un estado así no se termina por empezar una (`EstadoDeclarado.bloqueaAccion`): la
   * esquiva tampoco. La primera versión ponía encima el estado de la esquiva, y quien quebraba 100 ms
   * después de entrar en su Remanso perdía el intocable y la Réplica.
   */
  const quiebraEnElPremio = (quiebra: boolean): { replica: boolean; esquivandoEnElPremio: boolean; premioHasta: number } => {
    let fase = 0;
    let premioLlega = -1;
    let atacante = 0;
    const robot: Robot = (a, _b, reloj) => {
      for (const x of a.oido) {
        const s = x.suceso;
        if (fase === 0 && s.e === 'anuncio' && s.a === a.numero) {
          fase = 1;
          atacante = s.de;
          a.planear(A.esquiva, Math.max(reloj, s.t - 100), 0);
        }
        if (fase === 1 && s.e === 'estado' && s.a === a.numero && s.est === E.premio) {
          fase = 2;
          premioLlega = reloj;
        }
      }
      a.oido = [];
      if (fase === 2 && reloj >= premioLlega + 100) {
        fase = 3;
        if (quiebra) a.planear(A.esquiva, reloj, 0);
      }
      if (fase === 3 && reloj >= premioLlega + 300) {
        fase = 4;
        a.planear(A.replica, reloj, atacante);
      }
    };
    const apQ = new Aparato(1, 5000, 0, 100, 17, robot);
    apQ.desplazaAlEsquivar = false;
    const bQ = bancoDeUno(d, apQ);
    let replica = false;
    let enPremioDesde = -1;
    let premioHasta = -1;
    let esquivandoEnElPremio = false;
    for (let i = 0; i < 200; i++) {
      const p = bQ.tic();
      for (const s of p.sucesos) {
        if (s.para === 0 && s.suceso.e === 'estado' && s.suceso.a === 1) {
          if (s.suceso.est === E.premio && enPremioDesde < 0) {
            enPremioDesde = p.sala.tic;
            premioHasta = p.sala.tic + s.suceso.tics;
          } else if (s.suceso.est === E.esquivando && enPremioDesde >= 0 && p.sala.tic < premioHasta) esquivandoEnElPremio = true;
        }
        if (s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.de === 1 && s.suceso.acc === A.replica) replica = true;
      }
    }
    return { replica, esquivandoEnElPremio, premioHasta };
  };
  const sinQuebrar = quiebraEnElPremio(false);
  const quebrando = quiebraEnElPremio(true);
  comprobar(
    'esquivar dentro del premio no lo acaba: se sigue en él (ningún estado de esquiva encima) y la réplica sale igual que sin esquivar',
    sinQuebrar.replica && quebrando.replica && !quebrando.esquivandoEnElPremio && quebrando.premioHasta > 0,
    { sinQuebrar, quebrando },
  );

  const dt = juguete({ asientos: 1, clase: claseTiradora({ guardia: null }), grupos: (n) => [grupoFijo(n, 1, 8)], zonasExtra: [{ id: 8, clase: 8, caja: caja(-0.2, 1.8, 0.2, 2.2) }], nace: [{ x: 0, z: -8 }] });
  let yaEsquivo = false;
  const alaBala: Robot = (a, _b, reloj) => {
    for (const x of a.oido) {
      const s = x.suceso;
      if (s.e !== 'bala' || yaEsquivo) continue;
      yaEsquivo = true;
      a.oido = a.oido.filter((y) => y !== x);
      const bx = Math.round((s.x * UNO) / 100);
      const bz = Math.round((s.z * UNO) / 100);
      for (let t = 1; t < 60; t++) {
        const q = sitioDeLaBala(bx, bz, s.r, u(20), t, u(30));
        if (Math.abs(q.x - a.x) < u(0.55) && Math.abs(q.z - a.z) < u(0.55)) {
          a.planear(A.esquiva, Math.max(reloj, s.t + t * 50 - 60), 0);
          break;
        }
      }
      return;
    }
  };
  const apT = new Aparato(1, 3000, 0, 100, 17, alaBala);
  apT.desplazaAlEsquivar = false;
  const bT = bancoDeUno(dt, apT);
  bT.correr(260);
  const impactos = sucesosDe(bT, 'impacta');
  const limpia = impactos.find((x) => x.s.r === RESULTADO.limpia);
  const acometida = bT.pasos.flatMap((p) => p.sucesos.filter((s) => s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.de === 1 && s.suceso.acc === A.replica).map((s) => ({ k: p.sala.tic, s: s.suceso })));
  comprobar('una esquiva limpia contra una bala sale `impacta` limpia (la bala sigue su camino)', limpia !== undefined, impactos.map((x) => x.s.r));
  comprobar(
    'y a los `contraProyectil.tics` la sala lanza sola la réplica contra el tirador',
    limpia !== undefined && acometida.length >= 1 && acometida[0]!.k === limpia.k + 8 && acometida[0]!.s.e === 'anuncio' && acometida[0]!.s.a >= 16,
    { limpia: limpia?.k, acometida: acometida.map((x) => x.k) },
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 6 · LA CADENA Y EL «AL RITMO», EN EL RELOJ DEL APARATO
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Una entidad que no ataca ni guarda: un saco. */
function saco(vida = 200): ClaseDeEntidad {
  return clase({ vida, acciones: [], guardia: null, alCaer: { tipo: 'irse' } });
}

/**
 * GOLPEA Y ENCADENA: cuando la entidad que salió lleva `espera` tics fuera, entrada contra ella; y la
 * seguida a `delta` ms del impacto de la entrada EN SU RELOJ (el `t` de su propio anuncio).
 */
function encadenador(delta: number, espera = 15): Robot {
  let blanco = 0;
  let naceEn = -1;
  let entrada = false;
  let seguida = false;
  return (a, _b, reloj) => {
    for (const x of a.oido) {
      const s = x.suceso;
      if (s.e === 'nace' && blanco === 0) {
        blanco = s.id;
        naceEn = a.reloj(x.llega);
      }
      if (s.e === 'anuncio' && s.de === a.numero && s.acc === A.entrada && !seguida) {
        seguida = true;
        a.planear(A.seguida, s.t + delta, blanco);
      }
    }
    if (!entrada && blanco !== 0 && reloj >= naceEn + espera * 50) {
      entrada = true;
      a.planear(A.entrada, reloj, blanco);
    }
  };
}

paso('6 · La cadena y el «al ritmo», juzgados en el reloj del aparato');
{
  const d = lizaDelDuelo({ clase: saco() });
  const seguidaCon = (delta: number, error: number): { anuncio: number; dano: number; lanzadoTrasImpacto: boolean } | null => {
    const b = bancoDeUno(d, new Aparato(1, 7777, error, 120, 17, encadenador(delta)));
    b.correr(200);
    let impactoEntrada = -1;
    for (const p of b.pasos) for (const s of p.sucesos) if (s.para === 0 && s.suceso.e === 'resuelve' && impactoEntrada < 0) impactoEntrada = p.sala.tic;
    for (const p of b.pasos) {
      for (const s of p.sucesos) {
        if (s.para !== 1 || s.suceso.e !== 'anuncio' || s.suceso.acc !== A.seguida) continue;
        const id = s.suceso.id;
        const impacto = (s.suceso.t - (7777 + error)) / 50;
        const lanzado = p.sala.anuncios.find((an) => an.id === id)?.lanzadoEnTic ?? -1;
        const res = sucesosDe(b, 'resuelve').find((x) => x.s.id === id);
        return { anuncio: impacto - lanzado, dano: res?.s.dano ?? -1, lanzadoTrasImpacto: lanzado >= impactoEntrada };
      }
    }
    return null;
  };
  for (const error of [0, 40, -40]) {
    const alRitmo = seguidaCon(0, error);
    const tarde = seguidaCon(200, error);
    const fuera = seguidaCon(320, error);
    const antes = seguidaCon(-80, error);
    comprobar(
      `con ${String(error)} ms de error: la seguida AL RITMO (0 ms) sale con su anuncio corto y su daño al ritmo`,
      alRitmo !== null && alRitmo.anuncio === 4 && alRitmo.dano === 15,
      alRitmo,
    );
    comprobar(`con ${String(error)} ms: a +200 ms se encadena sin ritmo; a +320 ms ya no`, tarde !== null && tarde.anuncio === 5 && tarde.dano === 10 && fuera === null, { tarde, fuera });
    comprobar(
      `con ${String(error)} ms: pulsada 80 ms ANTES del impacto se guarda y sale al resolverse la entrada, nunca solapada`,
      antes !== null && antes.lanzadoTrasImpacto && antes.dano === 10,
      antes,
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 7 · LA GUARDIA
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('7 · La guardia: de frente para y contesta; por la espalda no; lo que la rompe pasa');
{
  const guardian = (probabilidad: number): ClaseDeEntidad =>
    clase({
      vida: 200,
      acciones: [accion(A.respuesta, { anuncioTics: 6, alcance: u(1.5), enganche: null, alFallar: null, soloEn: [E.premio], efecto: efecto(15, puesta(E.tocado, 12)) })],
      guardia: {
        conoRumbos: 43,
        /* El empellón también está en su lista: que pase de frente tiene que ser por romperla, no por no estar. */
        para: [A.entrada, A.empellon],
        salvoEn: [E.tocado, E.derribado, E.descolocado],
        alParar: puesta(E.descolocado, 8),
        respuesta: A.respuesta,
        esquivaAlAzar: { acciones: [A.empellon], probabilidad },
      },
      alCaer: { tipo: 'irse' },
    });
  /** Dos asientos: el 2 justo delante de la entidad (su blanco), el 1 a su espalda. Golpea `quien` con `golpe`. */
  const lance = (quien: number, golpe: number, probabilidad: number): { r: string; respuesta: boolean; descolocado: boolean } => {
    const d = juguete({ asientos: 2, clase: guardian(probabilidad), grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }, { x: 0, z: -5.9 }] });
    let blanco = 0;
    let hecho = false;
    const robot: Robot = (a, _b, reloj) => {
      for (const x of a.oido) if (x.suceso.e === 'nace' && blanco === 0) blanco = x.suceso.id;
      if (!hecho && blanco !== 0 && a.mandadas > 20) {
        hecho = true;
        a.planear(golpe, reloj, blanco);
      }
    };
    const b = new Banco(d, 5, [new Aparato(1, 1000, 0, 100, 13, quien === 1 ? robot : quieto), new Aparato(2, 2000, 0, 100, 29, quien === 2 ? robot : quieto)]);
    b.conectar(1);
    b.conectar(2);
    b.correr(90);
    let r = 'nada';
    let respuesta = false;
    let descolocado = false;
    const suyos = new Set<number>();
    for (const p of b.pasos) {
      for (const s of p.sucesos) {
        if (s.para === quien && s.suceso.e === 'anuncio' && s.suceso.de === quien) suyos.add(s.suceso.id);
        if (s.para === 0 && s.suceso.e === 'resuelve' && suyos.has(s.suceso.id)) r = NOMBRE_DEL_RESULTADO[s.suceso.r] ?? '?';
        if (s.para === quien && s.suceso.e === 'anuncio' && s.suceso.acc === A.respuesta && s.suceso.a === quien) respuesta = true;
        if (s.para === 0 && s.suceso.e === 'estado' && s.suceso.a === quien && s.suceso.est === E.descolocado) descolocado = true;
      }
    }
    return { r, respuesta, descolocado };
  };
  const frente = lance(2, A.entrada, 0);
  comprobar('una entrada DE FRENTE contra la guardia sale parada, descoloca al que golpea y la entidad contesta', frente.r === 'parada' && frente.descolocado && frente.respuesta, frente);
  const espalda = lance(1, A.entrada, 0);
  comprobar('la misma entrada POR LA ESPALDA da, sin respuesta', espalda.r === 'da' && !espalda.respuesta, espalda);
  const rompe = lance(2, A.empellon, 0);
  comprobar('lo que rompe la guardia (el empellón) da de frente', rompe.r === 'da', rompe);
  const azarFrente = lance(2, A.empellon, UNO);
  const azarEspalda = lance(1, A.empellon, UNO);
  comprobar('con la esquiva al azar al cien por cien, el empellón de frente sale esquivado y por la espalda da', azarFrente.r === 'esquivada' && azarEspalda.r === 'da', { azarFrente, azarEspalda });
}


/* ═══════════════════════════════════════════════════════════════════════════
 * 8 · EL EMPUJÓN Y EL CHOQUE CONTRA LA ESTRUCTURA
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Un saco que no se mueve de donde sale: velocidad 0. */
function sacoQuieto(vida = 200): ClaseDeEntidad {
  return clase({ vida, velocidad: 0, acciones: [], guardia: null, alCaer: { tipo: 'irse' } });
}

/** Golpea una vez con `golpe`, cuando la entidad lleva 15 tics fuera. */
function golpeaUnaVez(golpe: number): Robot {
  let blanco = 0;
  let naceEn = -1;
  let hecho = false;
  return (a, _b, reloj) => {
    for (const x of a.oido) {
      if (x.suceso.e === 'nace' && blanco === 0) {
        blanco = x.suceso.id;
        naceEn = a.reloj(x.llega);
      }
    }
    if (!hecho && blanco !== 0 && reloj >= naceEn + 750) {
      hecho = true;
      a.planear(golpe, reloj, blanco);
    }
  };
}

paso('8 · El empujón: choque sólo con caja, y su premio');
{
  const lanceDeEmpujon = (zona: { x0: number; z0: number; x1: number; z1: number }, nace: { x: number; z: number }) => {
    const d = juguete({ asientos: 1, clase: sacoQuieto(), grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(zona.x0, zona.z0, zona.x1, zona.z1) }], nace: [nace] });
    const b = bancoDeUno(d, new Aparato(1, 4000, 0, 100, 17, golpeaUnaVez(A.empellon)));
    b.correr(80);
    const empuja = sucesosDe(b, 'empuja')[0];
    const resuelve = sucesosDe(b, 'resuelve').find((x) => x.s.r === RESULTADO.da);
    const e = b.sala.entidades[0];
    const yo = b.sala.asientos[0]!;
    return { empuja: empuja?.s, dano: resuelve?.s.dano ?? -1, x: e?.x ?? 0, z: e?.z ?? 0, choques: yo.contadores.choques, puntos: yo.puntos, medidor: yo.medidor };
  };
  const contraElCoche = lanceDeEmpujon({ x0: 6.9, z0: -0.1, x1: 7.1, z1: 0.1 }, { x: 5.2, z: 0 });
  comprobar(
    'un empellón que lleva a la entidad contra el coche CHOCA: `empuja` nombra la caja (índice + 1), y el daño suma el del choque',
    contraElCoche.empuja !== undefined && contraElCoche.empuja.e === 'empuja' && contraElCoche.empuja.caja === 2 && contraElCoche.dano === 8 + 15,
    contraElCoche,
  );
  const arena = arenaDe(juguete().mundo.suelo);
  comprobar(
    'la entidad se para ANTES de la caja, en un sitio donde se puede estar',
    contraElCoche.x <= u(8) - u(0.35) && contraElCoche.x > u(7) && !chocaAqui(arena, contraElCoche.x, contraElCoche.z),
    contraElCoche,
  );
  comprobar('y el autor se lleva el premio del choque: un choque, medidor y puntos (10 del golpe y 30 del choque)', contraElCoche.choques === 1 && contraElCoche.puntos === 40 && contraElCoche.medidor === 10, contraElCoche);
  const alAire = lanceDeEmpujon({ x0: -0.1, z0: -4.1, x1: 0.1, z1: -3.9 }, { x: -1.8, z: -4 });
  comprobar(
    'el mismo empellón en campo abierto no choca: caja 0, el daño del golpe y cuatro unidades de recorrido',
    alAire.empuja !== undefined && alAire.empuja.e === 'empuja' && alAire.empuja.caja === 0 && alAire.dano === 8 && alAire.choques === 0 && Math.abs(alAire.x - u(4)) < u(0.1),
    alAire,
  );
  const empujadora = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(10, puesta(E.tocado, 12), u(3)) })] });
  const dq = juguete({ asientos: 1, clase: empujadora, grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-0.1, 2.1, 0.1, 2.3) }], nace: [{ x: 0, z: 3.3 }] });
  const bq = bancoDeUno(dq, new Aparato(1, 4000, 0, 100, 17, quieto));
  bq.correr(80);
  const aLaPared = sucesosDe(bq, 'empuja').find((x) => x.s.a === 1);
  const golpeAMi = sucesosDe(bq, 'resuelve').find((x) => x.s.r === RESULTADO.da);
  comprobar(
    'un asiento empujado contra el quiosco también choca: caja 1 y el daño del choque sumado (lo empuja su aparato; la sala se lo admite)',
    aLaPared !== undefined && aLaPared.s.caja === 1 && golpeAMi !== undefined && golpeAMi.s.dano === 25,
    { aLaPared, golpeAMi },
  );
}

/** ¿Choca un cuerpo de radio 0,35 con la estructura en `(x, z)`? Cuatro comparaciones por caja. */
function chocaAqui(arena: Arena, x: number, z: number): boolean {
  const r = u(0.35);
  const c = arena.cuerpos;
  for (let i = 0; i < c.length; i += 4) {
    if (x + r > (c[i] as number) && x - r < (c[i + 2] as number) && z + r > (c[i + 1] as number) && z - r < (c[i + 3] as number)) return true;
  }
  return false;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 9 · LAS BALAS, CONTRA LOS SITIOS QUE DECLARÓ EL BLANCO
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('9 · Las balas se juzgan contra los sitios que el blanco declaró, esperándolos');
{
  const dt = juguete({ asientos: 1, clase: claseTiradora({ guardia: null }), grupos: (n) => [grupoFijo(n, 1, 8)], zonasExtra: [{ id: 8, clase: 8, caja: caja(-0.2, 1.8, 0.2, 2.2) }], nace: [{ x: 0, z: -8 }] });
  const bQuieto = bancoDeUno(dt, new Aparato(1, 3000, 0, 100, 17, quieto));
  bQuieto.correr(120);
  const da = sucesosDe(bQuieto, 'impacta').find((x) => x.s.a === 1);
  comprobar('quien se queda en la línea recibe la bala: `impacta` da, 12 de daño', da !== undefined && da.s.r === RESULTADO.da && da.s.dano === 12 && da.s.vida === 88, da);

  /*
   * A 7 m la bala tarda 350 ms. Con 300 ms de ida y vuelta, el aparato oye la bala a los ~150 ms, se
   * aparta en dos tics (a 8 m/s) y ya no está en la línea cuando llega; pero la sala no lo sabe hasta
   * 150 ms después de que la bala haya pasado. Juzgarla con lo que la sala sabía al pasar sería un golpe.
   */
  const dL = juguete({ asientos: 1, clase: claseTiradora({ guardia: null }), grupos: (n) => [grupoFijo(n, 1, 8)], zonasExtra: [{ id: 8, clase: 8, caja: caja(-0.2, -1.2, 0.2, -0.8) }], nace: [{ x: 0, z: -8 }] });
  let aparta = false;
  const apartarse: Robot = (a) => {
    if (aparta) return;
    for (const x of a.oido) {
      if (x.suceso.e === 'bala') {
        aparta = true;
        a.meta = { x: a.x + u(2), z: a.z };
        return;
      }
    }
  };
  const apL = new Aparato(1, 3000, 0, 300, 17, apartarse);
  apL.velocidad = u(8);
  const bL = bancoDeUno(dL, apL);
  bL.correr(120);
  const rafaga = new Set<number>();
  let b0: { x: number; z: number; rumbo: number; salioEnTic: number } | null = null;
  for (const p of bL.pasos) {
    for (const bala of p.sala.balas) {
      if (rafaga.size < 3 && !rafaga.has(bala.numero)) rafaga.add(bala.numero);
      if (b0 === null) b0 = bala;
    }
  }
  let pasaPorElSitio = -1;
  if (b0 !== null) {
    for (let t = 1; t < 40 && pasaPorElSitio < 0; t++) {
      const q = sitioDeLaBala(b0.x, b0.z, b0.rumbo, u(20), t, u(30));
      if (q.z <= u(-8) + u(0.55)) pasaPorElSitio = b0.salioEnTic + t;
    }
  }
  const vistaEntonces = pasaPorElSitio > 0 ? bL.pasos[pasaPorElSitio - 1]?.sala.asientos[0]!.x : undefined;
  const impactaronL = sucesosDe(bL, 'impacta').filter((x) => x.s.a === 1 && rafaga.has(x.s.bala));
  comprobar(
    'quien se aparta a tiempo con 300 ms de ida y vuelta no recibe la primera ráfaga: sus sitios declarados ya estaban fuera',
    rafaga.size === 3 && impactaronL.length === 0,
    { rafaga: [...rafaga], impactos: impactaronL.map((x) => x.s) },
  );
  comprobar(
    'aunque cuando la bala pasó por su sitio la sala todavía lo tenía EN la línea (sus aqui llegaban 150 ms tarde): se esperaron',
    vistaEntonces !== undefined && Math.abs(vistaEntonces) < u(0.55),
    { pasaPorElSitio, vistaEntonces },
  );

  const tras: Robot = (a, _b, reloj) => {
    if (a.meta === null && reloj > a.D + 700) a.meta = { x: 0, z: u(2) };
  };
  const dk = juguete({ asientos: 1, clase: claseTiradora({ guardia: null }), grupos: (n) => [grupoFijo(n, 1, 8)], zonasExtra: [{ id: 8, clase: 8, caja: caja(-0.2, 14.8, 0.2, 15.2) }], nace: [{ x: 4, z: 2 }] });
  const apK = new Aparato(1, 1000, 0, 100, 17, tras);
  apK.velocidad = u(8);
  const bK = bancoDeUno(dk, apK);
  bK.correr(160);
  const chocadas = sucesosDe(bK, 'seva').filter((x) => x.s.por === MOTIVO_DE_IRSE.choca);
  const tocadas = sucesosDe(bK, 'impacta').filter((x) => x.s.a === 1);
  comprobar('quien se esconde tras el quiosco mientras le apuntan: las balas se paran contra la estructura (`seva` choca) y ninguna le toca', chocadas.length >= 1 && tocadas.length === 0, { chocadas: chocadas.length, tocadas: tocadas.length });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 10 · LOS TURNOS DE ATAQUE
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('10 · Los turnos: tope por asiento, ninguno a quien está en su premio, ni al ausente');
{
  const floja = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(1, puesta(E.tocado, 12)) })] });
  const zonaCerca = { id: 9, clase: 9, caja: caja(-1.5, -7, 1.5, -6.5) };
  const dT = juguete({ asientos: 1, clase: floja, grupos: (n) => [grupoFijo(n, 6, 9, 6)], zonasExtra: [zonaCerca], nace: [{ x: 0, z: -8 }] });
  const bT = bancoDeUno(dT, new Aparato(1, 2000, 0, 100, 17, quieto));
  let peorTurnos = 0;
  let peorAnuncios = 0;
  for (let i = 0; i < 400; i++) {
    bT.tic();
    let turnos = 0;
    for (const e of bT.sala.entidades) if (e.turno === 'cuerpoACuerpo' && e.blanco === 1) turnos++;
    let anuncios = 0;
    for (const an of bT.sala.anuncios) if (an.a === 1 && an.lanzadoEnTic <= bT.k) anuncios++;
    if (turnos > peorTurnos) peorTurnos = turnos;
    if (anuncios > peorAnuncios) peorAnuncios = anuncios;
  }
  comprobar(
    'con cuatro entidades encima (las vivas que admite el encuentro) nunca atacan a la vez más de las que caben en sus turnos (2) ni hay más de 3 anuncios contra él',
    peorTurnos === 2 && peorAnuncios <= 3 && bT.sala.entidades.length === 4,
    { peorTurnos, peorAnuncios, entidades: bT.sala.entidades.length },
  );

  const dP = juguete({ asientos: 1, clase: clase({ guardia: null }), grupos: (n) => [grupoFijo(n, 4, 9, 4)], zonasExtra: [zonaCerca], nace: [{ x: 0, z: -8 }] });
  const apP = new Aparato(1, 2000, 0, 100, 17, lector(100, { replica: false }));
  apP.desplazaAlEsquivar = false;
  const bP = bancoDeUno(dP, apP);
  bP.correr(600);
  const premios: { desde: number; hasta: number }[] = [];
  const lanzados: { k: number; de: number }[] = [];
  const vistos = new Set<number>();
  for (const p of bP.pasos) {
    const e = p.sala.asientos[0]!.estado;
    if (e !== null && e.estado === E.premio && premios.every((x) => x.desde !== e.desdeTic)) premios.push({ desde: e.desdeTic, hasta: e.hastaTic });
    for (const an of p.sala.anuncios) {
      if (an.a !== 1 || an.de < 16 || vistos.has(an.id)) continue;
      vistos.add(an.id);
      lanzados.push({ k: an.lanzadoEnTic, de: an.de });
    }
  }
  const enPremio = lanzados.filter((l) => premios.some((x) => l.k >= x.desde && l.k < x.hasta));
  comprobar(
    'NINGÚN golpe de entidad se lanza contra quien está en su premio (el estado de una limpia): los turnos lo excluyen',
    premios.length >= 2 && lanzados.length >= 8 && enPremio.length === 0,
    { premios: premios.length, lanzados: lanzados.length, enPremio },
  );

  /*
   * Con un tocado de 40 tics y dos que pegan, no está nunca libre: si el ausente esperara a que lo
   * estuviera, no llegaría a su tic (la segunda pasada lo vio: con el tocado de 12 había huecos, y la
   * rotura que sólo lo daba a quien estaba libre pasaba en verde).
   */
  const pegajosa = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(1, puesta(E.tocado, 40)) })] });
  const dAus = juguete({ asientos: 1, clase: pegajosa, grupos: (n) => [grupoFijo(n, 2, 9, 2)], zonasExtra: [zonaCerca], nace: [{ x: 0, z: -8 }] });
  const bA = bancoDeUno(dAus, new Aparato(1, 2000, 0, 100, 17, quieto));
  bA.correr(40);
  bA.desconectar(1);
  let ausenteDesde = -1;
  let tocadoAlIrse = false;
  for (let i = 0; i < 200; i++) {
    const antes = bA.sala.asientos[0]!.estado;
    bA.tic();
    const e = bA.sala.asientos[0]!.estado;
    if (ausenteDesde < 0 && e !== null && e.estado === E.ausente) {
      ausenteDesde = e.desdeTic;
      tocadoAlIrse = antes !== null && antes.estado === E.tocado && antes.hastaTic > ausenteDesde;
    }
  }
  const ultimoAqui = bA.sala.asientos[0]!.ultimoAquiEnTic;
  const trasAusente = bA.pasos.flatMap((p) => p.sala.anuncios.filter((an) => an.a === 1 && an.de >= 16 && ausenteDesde >= 0 && an.lanzadoEnTic >= ausenteDesde));
  const antesDeIrse = bA.pasos.slice(0, 40).some((p) => p.sala.anuncios.some((an) => an.a === 1));
  comprobar(
    'quien deja de mandar aqui pasa a ausente a los 40 tics justos de su último aqui AUNQUE le estén pegando (pisa el tocado), y ya nadie le lanza nada',
    ausenteDesde === ultimoAqui + 40 && tocadoAlIrse && trasAusente.length === 0 && antesDeIrse && bA.sala.asientos[0]!.vida > 0,
    { ausenteDesde, ultimoAqui, tocadoAlIrse, trasAusente: trasAusente.length, antesDeIrse },
  );

  /*
   * LA RÁFAGA SE CORTA si su blanco entra en su premio a medias (lo vio la revisión del frente: tres
   * balas de veintiuna contra quien ya estaba en su Remanso). El turno se le dio antes, pero «ningún
   * turno a quien está en su premio» es también no seguir disparándole, como no sigue la cadena.
   */
  const bB = bancoLleno(lizaLlena(), 33);
  const excluyenB = new Set<number>(bB.sala.declaracion.turnos.excluyen);
  let balasB = 0;
  const contraExcluidoB: string[] = [];
  for (let i = 0; i < 2000; i++) {
    const p = bB.tic();
    for (const bala of p.sala.balas) {
      if (bala.salioEnTic !== p.sala.tic) continue;
      balasB++;
      const tirador = p.sala.entidades.find((e) => e.numero === bala.de);
      const blanco = tirador === undefined ? undefined : p.sala.asientos[tirador.blanco - 1];
      const est = blanco === undefined ? null : blanco.estado;
      if (blanco !== undefined && est !== null && p.sala.tic >= est.desdeTic && p.sala.tic < est.hastaTic && excluyenB.has(est.estado)) {
        contraExcluidoB.push(`k${String(p.sala.tic)} bala ${String(bala.numero)} contra ${String(blanco.numero)} en ${String(est.estado)}`);
      }
    }
  }
  comprobar(
    'ninguna bala sale contra quien está en un estado que le quita los turnos (su premio, sobre todo): la ráfaga a medias se corta',
    balasB >= 100 && contraExcluidoB.length === 0,
    { balasB, contraExcluidoB: contraExcluidoB.slice(0, 6) },
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 11 · LO QUE SE LLEVA SE CONSERVA; LA ZONA, DE UNO EN UNO
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * LA CUENTA DE LO QUE SE LLEVA, tic a tic: lo que soltaron las rematadas tiene que ser lo que llevan
 * los asientos, más lo que hay en los montones, más lo cobrado, más lo perdido (montones que se fueron
 * sin vaciarse). Devuelve la primera discrepancia, o `null`.
 */
function vigilarLoQueSeLleva(b: Banco, suelta: number, inicial = 0): { creado: number; enAsientos: number; enMontones: number; cobrado: number; perdido: number; recogidas: number; rematadas: number; k: number } | null {
  let creado = inicial;
  let perdido = 0;
  let recogidas = 0;
  let rematadas = 0;
  let antes = new Map<number, number>();
  for (const p of b.pasos) {
    const vaciados = new Set<number>();
    for (const s of p.sucesos) {
      if (s.para !== 0) continue;
      if (s.suceso.e === 'seva' && s.suceso.por === MOTIVO_DE_IRSE.rematada) {
        creado += suelta;
        rematadas++;
      }
      if (s.suceso.e === 'recoge') {
        recogidas++;
        if (s.suceso.queda === 0) vaciados.add(s.suceso.id);
      }
    }
    const ahora = new Map<number, number>();
    for (const m of p.sala.montones) ahora.set(m.numero, m.n);
    for (const [id, n] of antes) if (!ahora.has(id) && !vaciados.has(id)) perdido += n;
    antes = ahora;
    let enAsientos = 0;
    let cobrado = 0;
    for (const a of p.sala.asientos) {
      for (const c of a.lleva) enAsientos += c.n;
      for (const c of a.contadores.cobrado) cobrado += c.n;
    }
    let enMontones = 0;
    for (const n of ahora.values()) enMontones += n;
    if (creado !== enAsientos + enMontones + cobrado + perdido) return { creado, enAsientos, enMontones, cobrado, perdido, recogidas, rematadas, k: p.sala.tic };
  }
  return null;
}

/**
 * EL RECOLECTOR: golpea a la entidad en pie más cercana que tenga a tiro, remata la que cae, se come el
 * montón que suelta, y cuando lleva algo va a la zona de acción encendida y la usa.
 */
function recolector(): Robot {
  let ultimoGolpe = -1e9;
  let zona = 0;
  let lleva = 0;
  return (a, b, reloj) => {
    for (const x of a.oido) {
      if (x.suceso.e === 'zona') zona = x.suceso.tics > 0 ? x.suceso.id : 0;
      if (x.suceso.e === 'carga' && x.suceso.a === a.numero) lleva = x.suceso.n;
    }
    a.oido = [];
    const sala = b.sala;
    let caida: { x: number; z: number; numero: number } | null = null;
    let enPie: { x: number; z: number; numero: number } | null = null;
    let dCaida = Infinity;
    let dPie = Infinity;
    for (const e of sala.entidades) {
      const d = Math.abs(e.x - a.x) + Math.abs(e.z - a.z);
      if (e.cerebro.modo === 'caida' && d < dCaida) {
        caida = e;
        dCaida = d;
      } else if (e.vida > 0 && e.cerebro.modo !== 'aparecer' && e.cerebro.modo !== 'deshecha' && d < dPie) {
        enPie = e;
        dPie = d;
      }
    }
    let monton: { x: number; z: number } | null = null;
    for (const m of sala.montones) if (monton === null) monton = m;
    if (caida !== null) {
      a.meta = { x: caida.x, z: caida.z - u(1.2) };
      if (dCaida < u(2.4)) {
        if (a.sosten === null || a.sosten.blanco !== caida.numero) a.sosten = { id: A.remate, ms: reloj, blanco: caida.numero };
      }
      return;
    }
    if (a.sosten !== null && a.sosten.id === A.remate) a.sosten = null;
    if (monton !== null) {
      a.meta = { x: monton.x, z: monton.z };
      return;
    }
    const zonaDeclarada = sala.declaracion.mundo.zonas.find((z) => z.id === zona);
    if (lleva > 0 && zonaDeclarada !== undefined) {
      const cx = Math.floor((zonaDeclarada.caja.x0 + zonaDeclarada.caja.x1) / 2);
      const cz = Math.floor((zonaDeclarada.caja.z0 + zonaDeclarada.caja.z1) / 2);
      a.meta = { x: cx, z: cz };
      if (Math.abs(cx - a.x) + Math.abs(cz - a.z) < u(1)) {
        if (a.sosten === null) a.sosten = { id: A.zona, ms: reloj, blanco: 0 };
      }
      return;
    }
    if (enPie !== null) {
      if (dPie > u(1.8)) a.meta = { x: enPie.x, z: enPie.z };
      else if (reloj - ultimoGolpe > 600) {
        ultimoGolpe = reloj;
        a.meta = null;
        a.planear(A.entrada, reloj, enPie.numero);
      }
    }
  };
}

paso('11 · Lo que se lleva se conserva en cada tic; la zona se usa de uno en uno');
{
  const blando = clase({ vida: 20, acciones: [], guardia: null });
  const dR = juguete({ asientos: 2, clase: blando, fin: 'salida', grupos: (n) => [grupoFijo(n, 3, 9, 3)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-1, -12, 1, -11) }], nace: [{ x: -2, z: -9 }, { x: 2, z: -9 }] });
  const bR = new Banco(dR, 11, [new Aparato(1, 1500, 0, 100, 13, recolector()), new Aparato(2, 2500, 20, 150, 31, recolector())]);
  bR.conectar(1);
  bR.conectar(2);
  bR.correr(2400);
  const cuenta = vigilarLoQueSeLleva(bR, 3);
  let rematadas = 0;
  let recogidas = 0;
  let cobrado = 0;
  for (const s of bR.sucesos()) {
    if (s.s.e === 'seva' && s.s.por === MOTIVO_DE_IRSE.rematada) rematadas++;
    if (s.s.e === 'recoge') recogidas++;
  }
  for (const a of bR.sala.asientos) for (const c of a.contadores.cobrado) cobrado += c.n;
  comprobar('en cada tic, lo soltado es lo que llevan los asientos más lo de los montones, lo cobrado y lo perdido', cuenta === null, cuenta);
  comprobar('y no por vacío: hubo remates, recogidas y cobro al salir', rematadas >= 2 && recogidas >= 2 && cobrado >= 3, { rematadas, recogidas, cobrado });

  const aLaZona: Robot = (a, b, reloj) => {
    let zona = 0;
    for (const x of a.oido) if (x.suceso.e === 'zona') zona = x.suceso.tics > 0 ? x.suceso.id : 0;
    const z = b.sala.declaracion.mundo.zonas.find((q) => q.id === zona);
    if (z === undefined) return;
    const cx = Math.floor((z.caja.x0 + z.caja.x1) / 2);
    const cz = Math.floor((z.caja.z0 + z.caja.z1) / 2);
    a.meta = { x: cx + (a.numero === 1 ? u(-0.5) : u(0.5)), z: cz };
    if (Math.abs(cx - a.x) + Math.abs(cz - a.z) < u(1.2) && a.sosten === null) a.sosten = { id: A.zona, ms: reloj, blanco: 0 };
  };
  const dZ = juguete({ asientos: 2, fin: 'salida', grupos: () => [], nace: [{ x: -1, z: -17 }, { x: 1, z: -17 }] });
  const dZ5 = { ...dZ, mundo: { ...dZ.mundo, zonas: dZ.mundo.zonas.filter((z) => z.id !== 6) } };
  const bZ = new Banco(dZ5, 3, [new Aparato(1, 1500, 0, 100, 13, aLaZona), new Aparato(2, 2500, 0, 100, 31, aLaZona)]);
  bZ.conectar(1);
  bZ.conectar(2);
  let dosALaVez = false;
  let esperando = false;
  for (let i = 0; i < 300; i++) {
    bZ.tic();
    const zona = bZ.sala.encuentro?.zona ?? null;
    if (zona !== null && zona.usando.length > 1) dosALaVez = true;
    if (zona !== null && zona.usando.length === 1 && bZ.sala.asientos.every((a) => a.sostenida !== null)) esperando = true;
  }
  const salen = sucesosDe(bZ, 'sale');
  comprobar(
    'la zona de capacidad uno: nunca la usan dos a la vez, uno espera sosteniendo, y salen los dos con 30 tics o más de diferencia',
    !dosALaVez && esperando && salen.length === 2 && salen[1]!.k - salen[0]!.k >= 30,
    { dosALaVez, esperando, salen: salen.map((x) => x.k) },
  );
  const ronda = bZ.veredictos().find((v) => v.tipo === VEREDICTO_DE_RONDA);
  const carga = ronda === undefined ? null : leerCargaDeRonda(ronda.carga, null, COLUMNAS.length, 2);
  comprobar('y con los dos fuera ya no puede salir nadie más: el encuentro se cierra ganado', carga !== null && carga.resultado === 'ganada', ronda);
}

paso('11 bis · Caer: soltar lo que se lleva, que te rescaten, o pagar y volver');
{
  const brutal = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(100, puesta(E.tocado, 12)) })] });
  const dC = juguete({ asientos: 2, clase: brutal, lleva: 5, grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }, { x: 8, z: -8 }] });
  let fue = false;
  const recoge: Robot = (a, b) => {
    const m = b.sala.montones[0];
    if (m !== undefined) {
      fue = true;
      a.meta = { x: m.x, z: m.z };
    } else if (fue) a.meta = { x: u(8), z: u(-8) };
  };
  const bC = new Banco(dC, 4, [new Aparato(1, 1000, 0, 100, 13, quieto), new Aparato(2, 2000, 0, 100, 31, recoge)]);
  bC.conectar(1);
  bC.conectar(2);
  bC.correr(200);
  const suelto = sucesosDe(bC, 'monton')[0];
  const cogido = sucesosDe(bC, 'recoge').find((x) => x.s.a === 2);
  const cuenta = vigilarLoQueSeLleva(bC, 3, 10);
  comprobar(
    'el asiento que cae suelta sus 5 en un montón donde cayó, el otro pasa y se los lleva, y la cuenta cuadra en cada tic',
    suelto !== undefined && suelto.s.n === 5 && cogido !== undefined && cogido.s.n === 5 && cuenta === null,
    { suelto, cogido, cuenta },
  );

  /* EL RESCATE: el 2 mata a la entidad que tumbó al 1 y luego lo levanta manteniendo su acción al lado. */
  const fragil = clase({ vida: 10, guardia: null, alCaer: { tipo: 'irse' }, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(100, puesta(E.tocado, 12)) })] });
  /* Dos que salen de una en una y con 400 tics entre ellas: matar a la primera no vacía el encuentro (que se ganaría y acabaría el combate). */
  const dRes = juguete({ asientos: 2, clase: fragil, grupos: (n) => [grupoFijo(n, 2, 7, 1, 400)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }, { x: 6, z: -8 }] });
  let ultimo = -1e9;
  const socorrista: Robot = (a, b, reloj) => {
    const e = b.sala.entidades.find((x) => x.vida > 0 && x.cerebro.modo !== 'aparecer');
    const caido = b.sala.asientos[0]!;
    if (e !== undefined && caido.vida <= 0) {
      const d = Math.abs(e.x - a.x) + Math.abs(e.z - a.z);
      if (d > u(2)) a.meta = { x: e.x + u(1.5), z: e.z };
      else if (reloj - ultimo > 500) {
        ultimo = reloj;
        a.meta = null;
        a.planear(A.entrada, reloj, e.numero);
      }
      return;
    }
    if (caido.conCuerpo && caido.vida <= 0) {
      a.meta = { x: caido.x + u(1), z: caido.z };
      if (Math.abs(caido.x + u(1) - a.x) + Math.abs(caido.z - a.z) < u(0.4) && a.sosten === null) a.sosten = { id: A.rescate, ms: reloj, blanco: 1 };
    } else a.sosten = null;
  };
  const bRes = new Banco(dRes, 4, [new Aparato(1, 1000, 0, 100, 13, quieto), new Aparato(2, 2000, 0, 100, 31, socorrista)]);
  bRes.conectar(1);
  bRes.conectar(2);
  let tumbado = false;
  let levantado = -1;
  for (let i = 0; i < 400 && levantado < 0; i++) {
    bRes.tic();
    const uno = bRes.sala.asientos[0]!;
    if (uno.vida <= 0) tumbado = true;
    if (tumbado && uno.vida > 0) levantado = bRes.k;
  }
  const rescatador = bRes.sala.asientos[1]!;
  comprobar(
    'el rescate: sostener la acción junto al caído los tics que pide lo levanta con su vida, y cuenta el rescate y sus puntos',
    tumbado && levantado > 0 && bRes.sala.asientos[0]!.vida === 40 && rescatador.contadores.rescates === 1 && rescatador.puntos >= 75,
    { tumbado, levantado, vida: bRes.sala.asientos[0]!.vida, rescates: rescatador.contadores.rescates, puntos: rescatador.puntos },
  );

  /* LA REAPARICIÓN: sin nadie que rescate, al acabar la caída se paga el recurso, se espera y se vuelve. */
  const dRe = juguete({ asientos: 1, clase: fragil, recurso: 1, grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }] });
  const bRe = bancoDeUno(dRe, new Aparato(1, 1000, 0, 100, 13, quieto));
  let vuelve = -1;
  let cayo = -1;
  for (let i = 0; i < 600 && vuelve < 0; i++) {
    const p = bRe.tic();
    const yo = bRe.sala.asientos[0]!;
    if (cayo < 0 && yo.vida <= 0) cayo = bRe.k;
    if (cayo > 0 && yo.conCuerpo && yo.vida > 0) {
      vuelve = bRe.k;
      const corrige = p.correcciones.find((c) => c.asiento === 1);
      comprobar(
        'la reaparición: acabada la caída sin rescate se paga el recurso, se espera sin cuerpo y se vuelve a su sitio con su vida, intocable, y el aparato recibe el corrige',
        vuelve - cayo === 240 + 160 && yo.vida === 60 && yo.x === 0 && yo.z === u(-15) && yo.estado !== null && yo.estado.estado === E.reaparecido && yo.contadores.reapariciones === 1 && bRe.sala.recurso === 0 && corrige !== undefined && corrige.z === u(-15),
        { cayo, vuelve, vida: yo.vida, estado: yo.estado, recurso: bRe.sala.recurso, corrige },
      );
    }
  }
  if (vuelve < 0) comprobar('la reaparición: acabada la caída sin rescate se paga el recurso, se espera sin cuerpo y se vuelve a su sitio con su vida, intocable, y el aparato recibe el corrige', false, { cayo });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 12 · LOS FINALES Y LOS VEREDICTOS
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Cuántos veredictos de un tipo salieron, y la carga del primero. */
function veredictosDe(b: Banco, tipo: string): { cuantos: number; primero: unknown; k: number } {
  const v = b.veredictos().filter((x) => x.tipo === tipo);
  return { cuantos: v.length, primero: v[0]?.carga, k: v[0]?.k ?? -1 };
}

/** Tras cerrar, ¿sale algo de entidades? (No debería salir nada: la sala espera la fase siguiente.) */
function algoTrasCerrar(b: Banco, cerradoEn: number): number {
  let n = 0;
  for (const x of b.sucesos()) if (x.k > cerradoEn && (x.s.e === 'nace' || x.s.e === 'anuncio' || x.s.e === 'bala')) n++;
  return n;
}

paso('12 · Los finales del encuentro y los veredictos de la mesa');
{
  const blanda = clase({ vida: 10, acciones: [], guardia: null, alCaer: { tipo: 'irse' } });
  const dV = juguete({ asientos: 1, clase: blanda, grupos: (n) => [grupoFijo(n, 2, 9, 2)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-1, -7, 1, -6.5) }], nace: [{ x: 0, z: -8 }] });
  const bV = bancoDeUno(dV, new Aparato(1, 1000, 0, 100, 17, recolector()));
  bV.correr(400);
  const rV = veredictosDe(bV, VEREDICTO_DE_RONDA);
  const cV = leerCargaDeRonda(rV.primero, null, COLUMNAS.length, 1);
  comprobar('vaciar: al irse la última entidad sale UNA ronda ganada, con la ronda declarada y cuentas que la mesa lee', rV.cuantos === 1 && cV !== null && cV.resultado === 'ganada' && cV.n === 1, rV);
  const faseCero = sucesosDe(bV, 'fase').find((x) => x.k === rV.k);
  comprobar('y al cerrar sale la fase con el reloj del encuentro a cero, y nada más de entidades', faseCero !== undefined && faseCero.s.encuentroTics === 0 && algoTrasCerrar(bV, rV.k) === 0, faseCero);

  const dA = juguete({ asientos: 1, clase: saco(), relojTics: 100, grupos: (n) => [grupoFijo(n, 1, 9, 1)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-1, -3, 1, -2) }], nace: [{ x: 0, z: -8 }] });
  const bA = bancoDeUno(dA, new Aparato(1, 1000, 0, 100, 17, quieto));
  bA.correr(140);
  const rA = veredictosDe(bA, VEREDICTO_DE_RONDA);
  const cA = leerCargaDeRonda(rA.primero, null, COLUMNAS.length, 1);
  const disueltas = sucesosDe(bA, 'seva').filter((x) => x.s.por === MOTIVO_DE_IRSE.disuelta && x.k === rA.k);
  comprobar('vaciar con el reloj vencido y entidades vivas: aguantada en el tic 101, y lo que queda se disuelve', rA.cuantos === 1 && cA !== null && cA.resultado === 'aguantada' && rA.k === 101 && disueltas.length === 1, { rA, disueltas: disueltas.length });

  const brutal = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(100, puesta(E.tocado, 12)) })] });
  const dP = juguete({ asientos: 1, clase: brutal, recurso: 0, grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }] });
  const bP = bancoDeUno(dP, new Aparato(1, 1000, 0, 100, 17, quieto));
  bP.correr(200);
  const rP = veredictosDe(bP, VEREDICTO_DE_RONDA);
  const cP = leerCargaDeRonda(rP.primero, null, COLUMNAS.length, 1);
  const fila = cP?.cuentas[0] ?? [];
  const col = (que: string): number => fila[1 + COLUMNAS.findIndex((c) => c.que === que)] ?? -1;
  comprobar(
    'todos sin vida y sin recurso para volver: perdida, y la fila dice vida 0 y una caída',
    rP.cuantos === 1 && cP !== null && cP.resultado === 'perdida' && col('vida') === 0 && col('caidas') === 1 && cP.recurso === 0,
    { rP, fila },
  );

  const dS = juguete({ asientos: 1, fin: 'salida', grupos: () => [], nace: [{ x: 0, z: -17 }] });
  const dS5 = { ...dS, mundo: { ...dS.mundo, zonas: dS.mundo.zonas.filter((z) => z.id !== 6) } };
  const aLaCinco: Robot = (a, _b, reloj) => {
    a.meta = { x: 0, z: u(-20) };
    if (Math.abs(a.z - u(-20)) < u(1) && a.sosten === null) a.sosten = { id: A.zona, ms: reloj, blanco: 0 };
  };
  const bS = bancoDeUno(dS5, new Aparato(1, 1000, 0, 100, 17, aLaCinco));
  bS.correr(200);
  const rS = veredictosDe(bS, VEREDICTO_DE_RONDA);
  const cS = leerCargaDeRonda(rS.primero, null, COLUMNAS.length, 1);
  const filaS = cS?.cuentas[0] ?? [];
  const colS = (que: string): number => filaS[1 + COLUMNAS.findIndex((c) => c.que === que)] ?? -1;
  comprobar(
    'salida: quien sale cuenta `salio` y sus puntos de salir, y con él fuera el encuentro se gana',
    rS.cuantos === 1 && cS !== null && cS.resultado === 'ganada' && colS('salio') === 1 && colS('puntos') === 150,
    { rS, filaS },
  );

  const dN = juguete({ asientos: 1, fin: 'salida', recurso: 0, zonaTics: 60, grupos: () => [], nace: [{ x: 0, z: -8 }] });
  const bN = bancoDeUno(dN, new Aparato(1, 1000, 0, 100, 17, quieto));
  bN.correr(100);
  const rN = veredictosDe(bN, VEREDICTO_DE_RONDA);
  const cN = leerCargaDeRonda(rN.primero, null, COLUMNAS.length, 1);
  comprobar('salida: la zona se apaga sin recurso para encender otra y nadie salió: perdida', rN.cuantos === 1 && cN !== null && cN.resultado === 'perdida' && rN.k === 61, rN);

  const dR = juguete({ asientos: 1, modo: 'calma', reloj: { id: 'pausa-1', duraMs: 1000 }, nace: [{ x: 0, z: -8 }] });
  const bRe = bancoDeUno(dR, new Aparato(1, 1000, 0, 100, 17, quieto));
  bRe.correr(120);
  const rR = veredictosDe(bRe, VEREDICTO_DE_RELOJ);
  comprobar('el reloj de fase vence UNA vez, en el tic en que pasan sus ms desde que empezó la fase', rR.cuantos === 1 && rR.k === 21 && (rR.primero as { id: string }).id === 'pausa-1', rR);

  const dAu = juguete({ asientos: 2, clase: saco(), grupos: (n) => [grupoFijo(n, 1, 1, 1)], nace: [{ x: 0, z: -8 }, { x: 2, z: -8 }] });
  const bAu = new Banco(dAu, 3, [new Aparato(1, 1000, 0, 100, 17, quieto), new Aparato(2, 1000, 0, 100, 17, quieto)]);
  bAu.conectar(1);
  bAu.guardarPasos = false;
  const ausentes: { k: number; a: unknown }[] = [];
  for (let i = 0; i < 1300; i++) {
    const p = bAu.tic();
    for (const v of p.veredictos) if (v.tipo === VEREDICTO_DE_AUSENTE) ausentes.push({ k: p.sala.tic, a: v.carga });
  }
  comprobar(
    'quien nunca abre canal sale ausente UNA vez, a los `veredictoTrasTics` de nacer la sala; quien sí lo abrió, no',
    ausentes.length === 1 && ausentes[0]!.k === 1200 && (ausentes[0]!.a as { a: string }).a === 'a2',
    ausentes,
  );

  /*
   * UN ASIENTO VACÍO NO SOSTIENE EL ENCUENTRO (lo encontró la revisión del frente). Al empezar la fase
   * todos tienen cuerpo; el que no juega pasa al ausente, es intocable, nadie lo persigue y no cae nunca.
   * Contado como alguien que puede seguir, el encuentro no se perdía nunca: con uno solo se pierde en
   * cuanto cae, y con otro asiento vacío salía «aguantada» al vencer el reloj. Ahora quien se fue deja de
   * contar a los `veredictoTrasTics` (1200 en el juguete): ni antes —una recarga no puede perder un
   * encuentro— ni nunca.
   */
  const dF = juguete({ asientos: 2, clase: brutal, recurso: 0, relojTics: 3000, grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }, { x: 9, z: -8 }] });
  const fantasma = (como: 'nunca' | 'cierra' | 'mudo'): { cae: number; ronda: string } => {
    const ap2 = new Aparato(2, 2000, 0, 100, 31, quieto);
    ap2.mudo = como === 'mudo';
    const bF = new Banco(dF, 4, [new Aparato(1, 1000, 0, 100, 13, quieto), ap2]);
    bF.guardarPasos = false;
    bF.conectar(1);
    if (como !== 'nunca') bF.conectar(2);
    let cae = -1;
    let ronda = 'ninguna';
    for (let i = 0; i < 3100 && ronda === 'ninguna'; i++) {
      if (como === 'cierra' && bF.k === 5) bF.desconectar(2);
      const p = bF.tic();
      if (cae < 0 && p.sala.asientos[0]!.vida <= 0) cae = p.sala.tic;
      for (const v of p.veredictos) if (v.tipo === VEREDICTO_DE_RONDA) ronda = `${(v.carga as CargaDeRonda).resultado}@${String(p.sala.tic)}`;
    }
    return { cae, ronda };
  };
  const nunca = fantasma('nunca');
  const cierra = fantasma('cierra');
  const mudo = fantasma('mudo');
  comprobar(
    'con el otro asiento sin canal desde que nació la sala, el que juega cae y la ronda sale PERDIDA a los 1200 tics, no aguantada al vencer el reloj',
    nunca.cae > 0 && nunca.cae < 100 && nunca.ronda === 'perdida@1200',
    nunca,
  );
  /* Cierra con la sala en el tic 5: la desconexión entra en el paso siguiente, el 6, y de ahí cuentan los 1200. */
  comprobar(
    'con el otro que cierra la pestaña en el tic 5 (y ya ausente cuando le llegan), perdida a los 1200 tics de perder el canal: ni antes, ni nunca',
    cierra.cae > 0 && cierra.ronda === 'perdida@1206',
    cierra,
  );
  comprobar(
    'y con el canal abierto pero sin mandar aqui (la pestaña oculta que no vuelve), perdida a los 1200 tics de estar ausente',
    mudo.cae > 0 && mudo.ronda === `perdida@${String(1 + 40 + 1200)}`,
    mudo,
  );

  /*
   * Y con salida: la zona se paga por quien aún está en su gracia, no por quien se fue, y la ronda sale
   * cuando ya no puede salir nadie más. Dos zonas: una que se apaga a los 1000 tics (dentro de la gracia
   * del otro: se paga y se enciende otra) y otra que se apaga justo en el 1200, el tic en que el otro deja
   * de contar (no se paga: ya no queda nadie que pueda salir por ella).
   */
  const salidaConUnoVacio = (zonaTics: number): { k: number; resultado: string; recurso: number } | null => {
    const dSal = juguete({ asientos: 2, fin: 'salida', recurso: 2, presentes: 1, relojTics: 20000, zonaTics, grupos: () => [], nace: [{ x: -1, z: -17 }, { x: 1, z: -17 }] });
    const dSal5 = { ...dSal, mundo: { ...dSal.mundo, zonas: dSal.mundo.zonas.filter((z) => z.id !== 6) } };
    const bSal = new Banco(dSal5, 3, [new Aparato(1, 1500, 0, 100, 13, aLaCinco), new Aparato(2, 2500, 0, 100, 31, aLaCinco)]);
    bSal.conectar(1);
    bSal.guardarPasos = false;
    for (let i = 0; i < 3000; i++) {
      const p = bSal.tic();
      for (const v of p.veredictos) if (v.tipo === VEREDICTO_DE_RONDA) return { k: p.sala.tic, resultado: (v.carga as CargaDeRonda).resultado, recurso: (v.carga as CargaDeRonda).recurso };
    }
    return null;
  };
  const conPago = salidaConUnoVacio(1000);
  const sinPago = salidaConUnoVacio(1199);
  comprobar(
    'salida con el otro sin canal: la zona que se apaga en su gracia se paga, la que se apaga cuando deja de contar no, y a los 1200 tics la ronda sale ganada con el recurso que queda',
    conPago !== null && conPago.k === 1200 && conPago.resultado === 'ganada' && conPago.recurso === 1 && sinPago !== null && sinPago.k === 1200 && sinPago.resultado === 'ganada' && sinPago.recurso === 2,
    { conPago, sinPago },
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
 * 13 · EL QUE LEE CONTRA EL QUE APORREA
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * EL GUERRERO: lee (esquiva cada anuncio a `X` ms de su impacto y replica en su premio), remata lo que
 * cae, va a por la entidad en pie más cercana y la golpea con la entrada cuando la tiene a tiro. Es el
 * jugador de los robots: el que llena la sala en los bloques de determinismo y de coste.
 */
function guerrero(X: number, ids: IdsDelRobot = IDS_DEL_JUGUETE): Robot {
  const leer = lector(X, { replica: true, consumir: true, ids });
  let ultimoGolpe = -1e9;
  return (a, b, reloj) => {
    leer(a, b, reloj);
    let caida: { x: number; z: number; numero: number } | null = null;
    let enPie: { x: number; z: number; numero: number } | null = null;
    let dCaida = Infinity;
    let dPie = Infinity;
    for (const e of b.sala.entidades) {
      const d = Math.abs(e.x - a.x) + Math.abs(e.z - a.z);
      if (e.cerebro.modo === 'caida') {
        if (d < dCaida) {
          caida = e;
          dCaida = d;
        }
      } else if (e.vida > 0 && e.cerebro.modo !== 'deshecha' && e.cerebro.modo !== 'aparecer' && d < dPie) {
        enPie = e;
        dPie = d;
      }
    }
    if (caida !== null && dCaida < u(2.4)) {
      a.meta = null;
      if (a.sosten === null || a.sosten.blanco !== caida.numero) a.sosten = { id: ids.remate, ms: reloj, blanco: caida.numero };
      return;
    }
    if (a.sosten !== null && a.sosten.id === ids.remate) a.sosten = null;
    const ir = caida !== null && dCaida < u(10) ? caida : enPie;
    if (ir === null) return;
    const dx = ir.x - a.x;
    const dz = ir.z - a.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > u(1.6)) {
      a.meta = { x: ir.x - Math.round((dx * u(1.2)) / d), z: ir.z - Math.round((dz * u(1.2)) / d) };
      return;
    }
    a.meta = null;
    a.mira = rumboHacia(dx === 0 && dz === 0 ? 1 : dx, dz);
    if (ir === enPie && a.planes.length === 0 && reloj - ultimoGolpe > 500 && ids.entrada !== 0) {
      ultimoGolpe = reloj;
      a.planear(ids.entrada, reloj, ir.numero);
    }
  };
}

paso('13 · Un robot que LEE saca al menos el doble que uno que APORREA');
{
  const zonaAlrededor = { id: 9, clase: 9, caja: caja(-4, -4, 4, -3) };
  const d = juguete({
    asientos: 1,
    relojTics: 1200,
    grupos: (n) => [{ clase: 1, cuantos: porN(n, () => 40), vivasALaVez: porN(n, () => 3), claseDeZona: 9, desdeTic: 0, cadaTics: 20, eleccion: 'azar' }],
    zonasExtra: [zonaAlrededor],
    nace: [{ x: 0, z: -8 }],
  });
  const puntosDe = (robot: () => Robot, semilla: number): { puntos: number; limpias: number; rematadas: number } => {
    const b = bancoDeUno(d, new Aparato(1, 6000, 25, 150, 17, robot()), semilla);
    b.guardarPasos = false;
    for (let i = 0; i < 1201 && (b.sala.encuentro === null || b.sala.encuentro.resultado === null); i++) b.tic();
    const yo = b.sala.asientos[0]!;
    return { puntos: yo.puntos, limpias: yo.contadores.limpias, rematadas: yo.contadores.rematadas };
  };
  let lee = 0;
  let aporrea = 0;
  const detalle: unknown[] = [];
  for (const semilla of [21, 22]) {
    const l = puntosDe(() => guerrero(120), semilla);
    const p = puntosDe(aporreador, semilla);
    lee += l.puntos;
    aporrea += p.puntos;
    detalle.push({ semilla, lee: l, aporrea: p });
  }
  nota(`en dos minutos de encuentro, el que lee: ${String(lee)} puntos; el que aporrea: ${String(aporrea)}`);
  comprobar('el que lee saca al menos el doble de puntos que el que aporrea (condición del diseño)', lee > 0 && lee >= 2 * aporrea, detalle);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 14 · DETERMINISMO, SALA REHECHA Y NODE CONTRA HERMES
 * ═══════════════════════════════════════════════════════════════════════════ */

/** FNV-1a de 32 bits, en hexadecimal: una huella corta de un texto largo. */
function fnv(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function salidasDe(p: PasoDeLaSala): string {
  return canonico({ sucesos: p.sucesos, veredictos: p.veredictos, foto: p.fotoDebida, correcciones: p.correcciones, bienvenidas: p.bienvenidas });
}

/**
 * La sala llena: seis asientos con guerreros, y entidades que disparan hasta catorce a la vez. Con poco
 * daño y recurso de sobra: la primera versión mataba a los seis en un minuto, el encuentro se perdía y el
 * «coste de la sala llena» se medía con la sala vacía.
 */
function lizaLlena(o: OpcionesDelJuguete = {}): LizaDeclarada {
  return juguete({
    asientos: 6,
    clase: claseTiradora({ acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(1, puesta(E.tocado, 12)) })], guardia: null }),
    danoDeBala: 1,
    recurso: 50,
    relojTics: 20000,
    grupos: (n) => [{ clase: 1, cuantos: porN(n, () => 400), vivasALaVez: porN(n, () => 14), claseDeZona: 1, desdeTic: 0, cadaTics: 4, eleccion: 'azar' }],
    ...o,
  });
}

function bancoLleno(d: LizaDeclarada, semilla: number): Banco {
  const aparatos: Aparato[] = [];
  const rtts = [50, 90, 130, 170, 210, 250];
  const errores = [0, 40, -40, 17, -23, 35];
  for (let i = 1; i <= 6; i++) aparatos.push(new Aparato(i, 1000 * i + 37 * i * i, errores[i - 1] as number, rtts[i - 1] as number, (13 * i) % 50, guerrero(80 + 20 * i)));
  const b = new Banco(d, semilla, aparatos);
  for (let i = 1; i <= 6; i++) b.conectar(i);
  b.guardarPasos = false;
  return b;
}

paso('14 · Determinismo: el mismo paso con la misma semilla, el estado intacto, la sala rehecha y Node contra Hermes');
const GRABACION = { tics: 300, entradas: [] as EntradaDeLaSala[][], huellas: [] as string[], salidas: [] as string[] };
{
  const d = lizaLlena();
  const b = bancoLleno(d, 77);
  for (let i = 0; i < GRABACION.tics; i++) {
    const p = b.tic();
    GRABACION.huellas.push(fnv(huellaDeLaSala(p.sala)));
    GRABACION.salidas.push(fnv(salidasDe(p)));
  }
  GRABACION.entradas = b.grabadas.slice(0, GRABACION.tics);
  const repetir = (semilla: number, vigilar: boolean): { difiere: number; intacto: boolean } => {
    let s = salaNueva(d, semilla);
    let difiere = -1;
    let intacto = true;
    for (let i = 0; i < GRABACION.tics; i++) {
      const antes = vigilar && i % 30 === 0 ? huellaDeLaSala(s) : '';
      const p = avanzarLaSala(s, GRABACION.entradas[i] as EntradaDeLaSala[]);
      if (vigilar && i % 30 === 0 && huellaDeLaSala(s) !== antes) intacto = false;
      if (difiere < 0 && (fnv(huellaDeLaSala(p.sala)) !== GRABACION.huellas[i] || fnv(salidasDe(p)) !== GRABACION.salidas[i])) difiere = i;
      s = p.sala;
    }
    return { difiere, intacto };
  };
  const otraVez = repetir(77, true);
  const yOtra = repetir(77, false);
  const otraSemilla = repetir(78, false);
  const entidades = b.sala.entidades.length;
  comprobar(
    `la misma declaración, semilla y entradas dan EL MISMO paso en cada uno de ${String(GRABACION.tics)} tics (estado y todo lo que sale, en forma canónica), dos veces`,
    otraVez.difiere === -1 && yOtra.difiere === -1 && entidades >= 10,
    { otraVez, yOtra, entidades },
  );
  comprobar('avanzarLaSala no toca el estado que recibe', otraVez.intacto);
  comprobar('y con otra semilla se separa (la semilla pesa de verdad)', otraSemilla.difiere >= 0, otraSemilla);

  /* LA SALA REHECHA: el proceso muere a media oleada y la sala renace con la misma llamada. */
  const dR = lizaLlena({ relojTics: 900, grupos: (n) => [{ clase: 1, cuantos: porN(n, () => 10), vivasALaVez: porN(n, () => 6), claseDeZona: 1, desdeTic: 0, cadaTics: 10, eleccion: 'azar' }] });
  const bR = bancoLleno(dR, 5);
  bR.guardarPasos = true;
  bR.correr(300);
  const mediaOleada = bR.sala.encuentro !== null && bR.sala.encuentro.resultado === null && bR.sala.encuentro.grupos[0]!.salidas > 0;
  const rondasAntes = bR.veredictos().filter((v) => v.tipo === VEREDICTO_DE_RONDA).length;
  bR.sala = salaNueva(dR, dR.fase.semilla);
  bR.enVuelo = [];
  bR.pasos = [];
  for (const a of bR.aparatos) {
    a.oido = [];
    a.planes = [];
    a.sosten = null;
    bR.conectar(a.numero);
  }
  const renace = bR.tic();
  const fase = renace.sucesos.find((s) => s.para === 0 && s.suceso.e === 'fase');
  comprobar(
    'la sala rehecha EMPIEZA la fase en curso desde su principio: la fase a todos con el reloj entero, y el encuentro vuelve a salir desde cero',
    mediaOleada && rondasAntes === 0 && fase !== undefined && fase.suceso.e === 'fase' && fase.suceso.encuentroTics === 900 && renace.sala.encuentro !== null && renace.sala.encuentro.grupos[0]!.salidas <= 1,
    { mediaOleada, rondasAntes, fase },
  );
  comprobar(
    'cada asiento que vuelve recibe su bienvenida y empieza desde su punto de control (vida entera, puntos a cero)',
    renace.bienvenidas.length === 6 && renace.sala.asientos.every((a) => a.vida === 100 && a.puntos === 0 && a.conCuerpo),
    renace.bienvenidas.length,
  );
  bR.correr(1000);
  const rondas = bR.veredictos().filter((v) => v.tipo === VEREDICTO_DE_RONDA);
  comprobar('y la reanudada acaba con UNA ronda, la misma que la mesa esperaba (n = 1)', rondas.length === 1 && (rondas[0]!.carga as CargaDeRonda).n === 1, rondas.map((r) => r.carga));
}

/* Node contra Hermes: la misma grabación, empaquetada, corrida en los dos motores y en este proceso. */
{
  const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'verificar-liza-'));
  const barra = (p: string): string => p.replace(/\\/g, '/');
  const SALA = barra(path.join(REPO, 'shared', 'mecanicas', 'liza', 'sala'));
  const CANONICO = barra(path.join(REPO, 'shared', 'mecanicas', 'canonico'));
  fs.writeFileSync(path.join(DIR, 'datos.json'), JSON.stringify({ liza: lizaLlena(), semilla: 77, entradas: GRABACION.entradas }), 'utf8');
  fs.writeFileSync(
    path.join(DIR, 'tanda.ts'),
    `import { canonico } from '${CANONICO}';\n` +
      `import { avanzarLaSala, huellaDeLaSala, salaNueva } from '${SALA}';\n` +
      "import datos from './datos.json';\n" +
      'function fnv(texto: string): string { let h = 0x811c9dc5; for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }\n' +
      'export function tanda(): { motor: string; tics: number; salidas: string; huellas: string; final: string } {\n' +
      '  const d = datos as unknown as { liza: Parameters<typeof salaNueva>[0]; semilla: number; entradas: Parameters<typeof avanzarLaSala>[1][] };\n' +
      '  let s = salaNueva(d.liza, d.semilla);\n' +
      "  let salidas = '';\n" +
      "  let huellas = '';\n" +
      '  for (let i = 0; i < d.entradas.length; i++) {\n' +
      '    const p = avanzarLaSala(s, d.entradas[i] as Parameters<typeof avanzarLaSala>[1]);\n' +
      '    s = p.sala;\n' +
      '    salidas = fnv(salidas + canonico({ sucesos: p.sucesos, veredictos: p.veredictos, foto: p.fotoDebida, correcciones: p.correcciones, bienvenidas: p.bienvenidas }));\n' +
      '    if (i % 25 === 0) huellas = fnv(huellas + huellaDeLaSala(s));\n' +
      '  }\n' +
      "  const motor = (globalThis as unknown as { HermesInternal?: unknown }).HermesInternal === undefined ? 'node' : 'hermes';\n" +
      '  return { motor, tics: d.entradas.length, salidas, huellas, final: fnv(huellaDeLaSala(s)) };\n' +
      '}\n',
    'utf8',
  );
  fs.writeFileSync(path.join(DIR, 'entrada.ts'), "import { tanda } from './tanda';\nconst linea = JSON.stringify(tanda());\n// @ts-ignore\nif (typeof print === 'function') print(linea); else console.log(linea);\n", 'utf8');
  interface Tanda {
    motor: string;
    tics: number;
    salidas: string;
    huellas: string;
    final: string;
  }
  let enProceso: Tanda | null = null;
  try {
    const m = (await import(pathToFileURL(path.join(DIR, 'tanda.ts')).href)) as { tanda: () => Tanda };
    enProceso = m.tanda();
  } catch (e) {
    comprobar('la tanda corre en este proceso', false, e instanceof Error ? e.message : String(e));
  }
  const paquete = path.join(DIR, 'tanda.js');
  const ESBUILD = path.join(REPO, 'node_modules', 'esbuild', 'bin', 'esbuild');
  const hecho = spawnSync(process.execPath, [ESBUILD, path.join(DIR, 'entrada.ts'), '--bundle', '--format=iife', '--target=es2015', '--platform=neutral', `--outfile=${paquete}`, '--log-level=error'], { encoding: 'utf8' });
  let listo = hecho.status === 0;
  comprobar('la sala se empaqueta para los dos motores', listo, `${hecho.stderr}`.slice(0, 500));
  if (listo) {
    /* `class` se baja a funciones: Hermes 0.12 no la entiende, y `fijo.ts`, `canonico.ts` y `geometria.ts` declaran una cada uno. */
    const NOMBRE_DEL_COMPLEMENTO = '@babel/plugin-transform-classes';
    const bajarClases = (await import(NOMBRE_DEL_COMPLEMENTO)) as { default: unknown };
    const babel = await import('@babel/core');
    const transformado = babel.transformFileSync(paquete, { babelrc: false, configFile: false, compact: false, plugins: [bajarClases.default as babel.PluginItem] });
    const codigo = transformado?.code ?? '';
    listo = codigo.length > 0;
    if (listo) fs.writeFileSync(paquete, codigo, 'utf8');
  }
  const carpeta = path.join(REPO, 'node_modules', 'hermes-engine-cli');
  const hermes = process.platform === 'win32' ? path.join(carpeta, 'win64-bin', 'hermes.exe') : process.platform === 'darwin' ? path.join(carpeta, 'osx-bin', 'hermes') : path.join(carpeta, 'linux64-bin', 'hermes');
  comprobar('el intérprete de Hermes está instalado (sin él esto no compara dos motores y se pone rojo, no se salta)', fs.existsSync(hermes), hermes);
  if (listo && fs.existsSync(hermes)) {
    const leer = (s: string): Tanda | null => {
      try {
        return JSON.parse(s.trim().split('\n').pop() ?? '') as Tanda;
      } catch {
        return null;
      }
    };
    const enNode = spawnSync(process.execPath, [paquete], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const enHermes = spawnSync(hermes, [paquete], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const n = leer(enNode.stdout);
    const h = leer(enHermes.stdout);
    comprobar('Node y Hermes corren la sala empaquetada sin caerse, y son dos motores distintos', n !== null && h !== null && n.motor === 'node' && h.motor === 'hermes', { node: enNode.stderr.slice(0, 300), hermes: enHermes.stderr.slice(0, 300) });
    if (n !== null && h !== null && enProceso !== null) {
      nota(`Node: salidas ${n.salidas} · huellas ${n.huellas} · final ${n.final}; Hermes: salidas ${h.salidas} · huellas ${h.huellas} · final ${h.final}`);
      comprobar(
        `los ${String(GRABACION.tics)} tics de la sala llena dan LA MISMA cadena de salidas y de estados en Node, en Hermes y en este proceso`,
        n.tics === GRABACION.tics && n.salidas === h.salidas && n.huellas === h.huellas && n.final === h.final && n.final === enProceso.final && n.salidas === enProceso.salidas,
        { n, h, enProceso },
      );
    }
  }
  fs.rmSync(DIR, { recursive: true, force: true });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 15 · EL COSTE DE UNA SALA LLENA
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * El tope de lo que puede costar un tic de una sala llena, en µs, en un PC de desarrollo. Es la parte de
 * simulación del §12 del diseño (validar, NPC, línea de vista, balas y juicios: unos 4,5 ms por segundo,
 * 225 µs por tic) con un poco de holgura; los envíos y la foto serializada son de la E/S y no entran aquí.
 */
const TOPE_DEL_TIC_US = 250;

paso('15 · El coste: microsegundos por tic de una sala llena (6 asientos, 14 entidades, 12 balas) en Node');
{
  const b = bancoLleno(lizaLlena(), 91);
  b.correr(300);
  const tomas: number[] = [];
  let entidades = 0;
  let balas = 0;
  let masBalas = 0;
  let sucesos = 0;
  for (let t = 0; t < 5; t++) {
    b.costeMs = 0;
    b.llamadas = 0;
    for (let i = 0; i < 400; i++) {
      const p = b.tic();
      entidades += p.sala.entidades.length;
      balas += p.sala.balas.length;
      sucesos += p.sucesos.length;
      if (p.sala.balas.length > masBalas) masBalas = p.sala.balas.length;
    }
    tomas.push((b.costeMs * 1000) / b.llamadas);
  }
  const mejor = Math.min(...tomas);
  const mediana = tomas.slice().sort((x, y) => x - y)[2] as number;
  nota(
    `por tic: mejor ${mejor.toFixed(1)} µs, mediana ${mediana.toFixed(1)} µs (cinco tomas de 400 tics); ` +
      `de media ${(entidades / 2000).toFixed(1)} entidades, ${(balas / 2000).toFixed(1)} balas (${String(masBalas)} a la vez como mucho) y ${(sucesos / 2000).toFixed(1)} sucesos por tic; ` +
      `${((mediana * 20) / 1000).toFixed(2)} ms de CPU por segundo de sala`,
  );
  comprobar('la sala está llena de verdad: 14 entidades casi siempre y el aforo de balas alcanzado', entidades / 2000 >= 13 && masBalas === 12 && b.sala.encuentro !== null && b.sala.encuentro.resultado === null, { entidades: entidades / 2000, masBalas });
  comprobar(`un tic de la sala llena cuesta ${String(TOPE_DEL_TIC_US)} µs o menos (la mejor de cinco tomas: la máquina puede estar ocupada con otros frentes)`, mejor <= TOPE_DEL_TIC_US, tomas);
  const b2 = bancoLleno(lizaLlena(), 92);
  const todas: PasoDeLaSala[] = [];
  b2.guardarPasos = false;
  for (let i = 0; i < 300; i++) todas.push(b2.tic());
  comprobar('y todo lo que sale de la sala llena lo admite el lector estricto del aparato', todoSeLee(todas));
  const cuenta = (() => {
    b2.pasos = todas;
    return vigilarLoQueSeLleva(b2, 3);
  })();
  comprobar('en la sala llena (con asientos que caen y sueltan lo que llevan), lo que se lleva también se conserva en cada tic', cuenta === null, cuenta);
}


/* ═══════════════════════════════════════════════════════════════════════════
 * 16 · LAS DECLARACIONES DE EL QUIEBRO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Si el productor del juego ya existe (lo escribe otro frente), la sala se juega también con sus
 * declaraciones de verdad, sacadas de las vistas que da el robot de su mesa: todas se aceptan, la sala
 * las juega fase a fase sin caerse y con todo lo que sale legible, y el juicio de la esquiva da lo
 * mismo con cualquier desfase y red también con sus números. Se importa en caliente y por ruta: este
 * comprobador es de la Liza, y la Liza no depende de ningún juego para compilar.
 */

paso('16 · Las declaraciones de El Quiebro, si su productor ya existe');
const RUTA_DEL_PRODUCTOR = path.join(REPO, 'shared', 'arcade', 'juegos', 'quiebro-liza.ts');
const RUTA_DEL_ROBOT = path.join(REPO, 'server', 'scripts', 'robot-de-quiebro.ts');
const HAY_QUIEBRO = fs.existsSync(RUTA_DEL_PRODUCTOR) && fs.existsSync(RUTA_DEL_ROBOT);
/** Las comprobaciones de este bloque cuando hay productor: el suelo las suma sólo entonces. */
const DEL_QUIEBRO = 7;
if (!HAY_QUIEBRO) nota('todavía no existe el productor de El Quiebro: este bloque no mira nada, y el suelo no cuenta con él');
else {
  await import(pathToFileURL(path.join(REPO, 'shared', 'arcade', 'juegos', 'index.ts')).href);
  const productor = (await import(pathToFileURL(RUTA_DEL_PRODUCTOR).href)) as { lizaDelQuiebro: (vista: unknown, codigo: string) => LizaDeclarada | null };
  const robotDeLaMesa = (await import(pathToFileURL(RUTA_DEL_ROBOT).href)) as {
    jugarAlQuiebro: (o: { asientos: number; semilla: number; noches: number; politica: 'gana' | 'pierde' | 'mezcla'; travesuras: boolean }) => { vistas: readonly unknown[] };
  };
  const CODIGO = 'K7M2P';
  const fases: LizaDeclarada[] = [];
  const claves = new Set<string>();
  const problemas: string[] = [];
  const aforos = new Set<string>();
  for (const asientos of [1, 3]) {
    const partida = robotDeLaMesa.jugarAlQuiebro({ asientos, semilla: 7, noches: 1, politica: 'gana', travesuras: false });
    for (const v of partida.vistas) {
      const l = productor.lizaDelQuiebro(v, CODIGO);
      if (l === null) continue;
      const llave = `${String(asientos)}:${l.fase.clave}`;
      if (claves.has(llave)) continue;
      claves.add(llave);
      fases.push(l);
      aforos.add(JSON.stringify(l.aforo));
      for (const x of problemasDeLaDeclaracion(l)) problemas.push(`${l.fase.clave}: ${x}`);
    }
  }
  const combates = fases.filter((l) => l.fase.modo === 'encuentro');
  nota(`${String(fases.length)} fases de El Quiebro (con 1 y con 3 asientos), ${String(combates.length)} de combate: ${fases.map((l) => l.fase.clave).join(' ')}`);
  comprobar('el productor da declaraciones para fases de combate, y la Liza las acepta todas', combates.length >= 2 && problemas.length === 0, problemas.slice(0, 5));

  let reventadas = 0;
  const legibles: boolean[] = [];
  for (const l of fases) {
    const aparatos: Aparato[] = [];
    for (let i = 1; i <= l.asientos.length; i++) aparatos.push(new Aparato(i, 3000 * i, 20 * i, 60 + 40 * i, (17 * i) % 50, guerrero(110, idsDe(l))));
    try {
      const b = new Banco(l, l.fase.semilla, aparatos);
      for (let i = 1; i <= l.asientos.length; i++) b.conectar(i);
      b.correr(160);
      legibles.push(todoSeLee(b.pasos));
    } catch (e) {
      reventadas++;
      nota(`${l.fase.clave} revienta: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  comprobar('la sala juega cada fase de El Quiebro con robots (160 tics) sin caerse', reventadas === 0, reventadas);
  comprobar('y todo lo que sale de sus fases lo admite el lector del aparato', legibles.length === fases.length && legibles.every((x) => x));

  /*
   * CADA CLASE ATACA. Jugar 160 tics sin caerse no dice si las entidades pelean: la revisión del frente
   * vio al duelista de este juego rondar mil tics a 1,25 m de un asiento quieto sin lanzar nada (su banda
   * empieza en 1,3 y su golpe llega a 1,1). Cada clase de cada combate de un asiento, SOLA —una entidad,
   * sin nadie que le quite el turno— contra un asiento que no se mueve: la que golpea tiene que lanzar su
   * anuncio, y la que dispara, su bala.
   */
  const atacan: string[] = [];
  const noAtacan: string[] = [];
  for (const l of combates) {
    const en = l.fase.encuentro;
    if (en === null || l.asientos.length !== 1) continue;
    const vistas = new Set<number>();
    for (const g of en.grupos) {
      const c = l.clases.find((x) => x.id === g.clase);
      if (c === undefined || vistas.has(g.clase)) continue;
      vistas.add(g.clase);
      const golpea = c.acciones.some((x) => x.cadena === null && x.soloEn.length === 0);
      const dispara = c.proyectil !== 0;
      if (!golpea && !dispara) continue;
      const sola: LizaDeclarada = { ...l, fase: { ...l.fase, encuentro: { ...en, grupos: [{ ...g, cuantos: g.cuantos.map(() => 1), vivasALaVez: g.vivasALaVez.map(() => 1), desdeTic: 0, cadaTics: 0 }] } } };
      const bs = bancoDeUno(sola, new Aparato(1, 3000, 0, 100, 17, quieto), sola.fase.semilla);
      bs.guardarPasos = false;
      let anuncios = 0;
      let balas = 0;
      for (let i = 0; i < 600 && (dispara ? balas === 0 : anuncios === 0); i++) {
        const p = bs.tic();
        for (const s of p.sucesos) {
          if (s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.a === 1 && s.suceso.de >= 16) anuncios++;
          if (s.para === 1 && s.suceso.e === 'bala') balas++;
        }
      }
      const linea = `${l.fase.clave}/clase ${String(g.clase)}${dispara ? ' (dispara)' : ''}: ${String(anuncios)} anuncios, ${String(balas)} balas en ${String(bs.k)} tics`;
      if (dispara ? balas > 0 : anuncios > 0) atacan.push(linea);
      else noAtacan.push(linea);
    }
  }
  nota(`solas contra un asiento quieto: ${atacan.join(' · ')}`);
  comprobar('cada clase de El Quiebro, sola contra un asiento quieto, ataca: la que golpea lanza su anuncio, y la que dispara, su bala', atacan.length >= 3 && noAtacan.length === 0, noAtacan);

  const oleada = combates.find((l) => l.asientos.length === 1);
  const veredicto = (X: number | null, error: number, rtt: number): string => {
    if (oleada === undefined) return 'sin oleada';
    const ids = idsDe(oleada);
    const robot = X === null ? quieto : lector(X, { replica: false, ids });
    return veredictosContraUno(oleada, robot, error, rtt, true, 1, oleada.fase.semilla)[0] ?? 'nada';
  };
  for (const [X, espera] of [
    [100, 'limpia'],
    [null, 'da'],
  ] as const) {
    const vistos: string[] = [];
    for (const error of [0, 40, -40]) for (const rtt of [50, 150, 250]) vistos.push(`${veredicto(X, error, rtt)}@${String(error)}/${String(rtt)}`);
    comprobar(
      `con los números de El Quiebro, ${X === null ? 'no quebrar' : `quebrar a ${String(X)} ms del impacto`} da «${espera}» con 0, ±40 ms de error y 50/150/250 ms de red`,
      oleada !== undefined && vistos.every((v) => v.startsWith(`${espera}@`)),
      vistos,
    );
  }
  comprobar('y el aforo es el mismo en todas sus fases (la sala se admite por él al nacer)', aforos.size === 1, [...aforos]);
}

/*
 * El suelo: 139 comprobaciones de la Liza sola, y las de El Quiebro si su productor está (el bloque 16
 * lo dice en su nota cuando no). Escrito exacto: un bloque que deja de correr lo baja del suelo.
 */

/* ═══════════════════════════════════════════════════════════════════════════
 * 17 · LO QUE LAS PRUEBAS DE ARRIBA DABAN POR SUPUESTO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cada una de éstas prueba una cosa que las de arriba USAN sin mirarla: si se rompiera, alguna de
 * arriba seguiría en verde por otro camino.
 */

paso('17 · La foto, los presentes, los relojes de cada destinatario y el alargue del comp');
{
  const d = juguete({ presentes: 1 });
  const b = new Banco(d, 3, [new Aparato(1, 1000, 0, 100, 13, quieto), new Aparato(2, 777777, 0, 250, 31, quieto)]);
  b.conectar(1);
  b.conectar(2);
  let fotosBien = true;
  for (let i = 0; i < 40; i++) {
    const p = b.tic();
    const tocaFoto = p.sala.tic % 2 === 0;
    if (tocaFoto !== (p.fotoDebida !== null)) fotosBien = false;
    if (p.fotoDebida !== null) {
      const vivas = p.sala.entidades.filter((e) => e.cerebro.modo !== 'deshecha').length;
      if (p.fotoDebida.length !== 2 + vivas) fotosBien = false;
    }
  }
  comprobar('la foto sale en los tics pares y sólo en ellos, con todos los asientos y todas las entidades que están', fotosBien);
  comprobar(
    'el encuentro se escala con los PRESENTES que declara (1), no con los canales abiertos (2)',
    b.sala.encuentro !== null && b.sala.encuentro.presentes === 1 && b.sala.encuentro.grupos[0]!.total === 4,
    b.sala.encuentro?.grupos,
  );
  let dosRelojes: { t1: number; t2: number; impactoMs: number } | null = null;
  for (let i = 0; i < 300 && dosRelojes === null; i++) {
    const p = b.tic();
    for (const s of p.sucesos) {
      if (s.suceso.e !== 'anuncio' || s.para !== 1) continue;
      const id = s.suceso.id;
      const otro = p.sucesos.find((x) => x.para === 2 && x.suceso.e === 'anuncio' && x.suceso.id === id);
      const an = p.sala.anuncios.find((x) => x.id === id);
      if (otro !== undefined && otro.suceso.e === 'anuncio' && an !== undefined) dosRelojes = { t1: s.suceso.t, t2: otro.suceso.t, impactoMs: an.impactoMs };
    }
  }
  comprobar(
    'el MISMO anuncio sale una vez por destinatario, cada uno con el impacto en su propio reloj',
    dosRelojes !== null && dosRelojes.t1 === dosRelojes.impactoMs + 1000 && dosRelojes.t2 === dosRelojes.impactoMs + 777777,
    dosRelojes,
  );
  const alargue = (rtt: number): number => {
    const bb = bancoDeUno(lizaDelDuelo(), new Aparato(1, 5000, 0, rtt, 17, quieto));
    for (let i = 0; i < 200; i++) {
      bb.tic();
      const an = bb.sala.anuncios.find((x) => x.a === 1 && x.de >= 16);
      if (an !== undefined) return an.impactoEnTic - an.lanzadoEnTic;
    }
    return -1;
  };
  const corto = alargue(50);
  const largo = alargue(250);
  comprobar('el golpe de una entidad se alarga en el comp de su blanco: 11 tics y 1 con 50 ms de red, 11 y 3 con 250', corto === 12 && largo === 14, { corto, largo });
}

paso('17 · Soltar la esquiva para golpear, la línea de vista del enganche y el intocable de quien aparece');
{
  const d = lizaDelDuelo({ clase: saco() });
  const golpeTrasEsquiva = (despues: number): { lanzada: boolean; libre: boolean } => {
    const m = new Mano(d);
    while (m.sala.entidades.length === 0 || m.sala.entidades[0]!.cerebro.modo === 'aparecer') m.esperar(1);
    const blanco = m.sala.entidades[0]!.numero;
    const t = m.sala.tic + 1;
    m.ir(m.yo.x, m.yo.z, { id: A.esquiva, msDelAparato: t * 50, blanco: 0 });
    for (let i = 1; i < despues; i++) m.ir(m.yo.x, m.yo.z);
    const tp = m.sala.tic + 1;
    m.ir(m.yo.x, m.yo.z, { id: A.entrada, msDelAparato: tp * 50, blanco });
    let lanzada = false;
    let libre = false;
    for (let i = 0; i < 8; i++) {
      const p = m.ir(m.yo.x, m.yo.z);
      if (m.sala.anuncios.some((an) => an.de === 1)) lanzada = true;
      if (p.sucesos.some((s) => s.suceso.e === 'estado' && s.suceso.a === 1 && s.suceso.est === 0)) libre = true;
    }
    if (m.sala.anuncios.some((an) => an.de === 1)) lanzada = true;
    return { lanzada, libre };
  };
  const pronto = golpeTrasEsquiva(2);
  const guardado = golpeTrasEsquiva(4);
  comprobar(
    'dentro de la esquiva no se golpea hasta su tic soltable: pulsada 2 tics dentro se pierde; 4 tics dentro se guarda y sale en el 6, y la esquiva se suelta',
    !pronto.lanzada && guardado.lanzada && guardado.libre,
    { pronto, guardado },
  );

  const tapado = (x: number): number => {
    const dd = juguete({ asientos: 1, clase: sacoQuieto(), grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(x - 0.1, 9.4, x + 0.1, 9.6) }], nace: [{ x, z: 2.5 }] });
    const m = new Mano(dd);
    m.esperar(15);
    const e = m.sala.entidades[0];
    if (e === undefined) return -1;
    const p = m.ir(m.yo.x, m.yo.z, { id: A.entrada, msDelAparato: (m.sala.tic + 1) * 50, blanco: e.numero });
    const an = p.sucesos.find((s) => s.suceso.e === 'anuncio' && s.suceso.de === 1);
    return an !== undefined && an.suceso.e === 'anuncio' ? an.suceso.a : -1;
  };
  const conQuiosco = tapado(0);
  const sinQuiosco = tapado(4);
  comprobar('el enganche a 7 m se acepta con línea de vista y se rechaza con el quiosco en medio (el golpe sale al aire)', sinQuiosco >= 16 && conQuiosco === 0, { conQuiosco, sinQuiosco });

  const m = new Mano(d);
  while (m.sala.entidades.length === 0) m.esperar(1);
  const recienNacida = m.sala.entidades[0]!.numero;
  m.ir(m.yo.x, m.yo.z, { id: A.entrada, msDelAparato: (m.sala.tic + 1) * 50, blanco: recienNacida });
  let r = -1;
  for (let i = 0; i < 12 && r < 0; i++) {
    const p = m.ir(m.yo.x, m.yo.z);
    const res = p.sucesos.find((s) => s.suceso.e === 'resuelve');
    if (res !== undefined && res.suceso.e === 'resuelve') r = res.suceso.r;
  }
  comprobar('lo que acaba de aparecer es intocable mientras se imprime: el golpe sale esquivado', r === RESULTADO.esquivada, NOMBRE_DEL_RESULTADO[r] ?? r);
}

paso('17 · El grafo, el trasvase y la reimpresión');
{
  const perseguidora = (grafo: boolean): { llega: number; nudos: number } => {
    const c = clase({ acciones: [], guardia: null, alCaer: { tipo: 'irse' }, cerebro: { distanciaMinima: u(0.9), distanciaMaxima: u(1.5), decideCadaTics: 4, costeCuerpoACuerpo: 1, costeDisparo: 1, sigueElGrafo: grafo } });
    const dd = juguete({ asientos: 1, clase: c, grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-10.1, 6.9, -9.9, 7.1) }], nace: [{ x: -10, z: 13 }] });
    const bb = bancoDeUno(dd, new Aparato(1, 5000, 0, 100, 17, quieto));
    let nudos = 0;
    for (let i = 0; i < 300; i++) {
      bb.tic();
      const e = bb.sala.entidades[0];
      if (e !== undefined && e.cerebro.nudo >= 0) nudos++;
      if (e !== undefined && Math.abs(e.x - u(-10)) + Math.abs(e.z - u(13)) < u(2)) return { llega: bb.k, nudos };
    }
    return { llega: -1, nudos };
  };
  const conGrafo = perseguidora(true);
  const sinGrafo = perseguidora(false);
  comprobar(
    'con el muro en medio y sin línea de vista, la que sigue el grafo va por sus nudos y llega; la que no, nunca pisa un nudo (resbala contra el muro)',
    conGrafo.llega > 0 && conGrafo.nudos > 0 && sinGrafo.nudos === 0,
    { conGrafo, sinGrafo },
  );

  /*
   * RONDAR ES ESPERAR TURNO, NO QUEDARSE QUIETO (lo encontró la revisión del frente con las declaraciones
   * de un juego de verdad). Una que ronda entre 1,3 y 2,2 m con un golpe de 1,1 se quedaba a 1,25 m de un
   * asiento quieto sin atacar nunca; y un tirador que se paraba en su banda detrás de una caja no volvía a
   * buscar la línea de vista. Las dos, contra un asiento que no se mueve.
   */
  const primerAtaque = (c: ClaseDeEntidad, zona: { x0: number; z0: number; x1: number; z1: number }, nace: { x: number; z: number }): { anuncio: number; bala: number } => {
    const dd = juguete({ asientos: 1, clase: c, grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(zona.x0, zona.z0, zona.x1, zona.z1) }], nace: [nace] });
    const bb = bancoDeUno(dd, new Aparato(1, 5000, 0, 100, 17, quieto));
    bb.guardarPasos = false;
    let anuncio = -1;
    let bala = -1;
    for (let i = 0; i < 400 && anuncio < 0 && bala < 0; i++) {
      const p = bb.tic();
      for (const s of p.sucesos) {
        if (s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.a === 1 && anuncio < 0) anuncio = p.sala.tic;
        if (s.para === 1 && s.suceso.e === 'bala' && bala < 0) bala = p.sala.tic;
      }
    }
    return { anuncio, bala };
  };
  const bandaAncha = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(1, null) })], cerebro: { distanciaMinima: u(1.3), distanciaMaxima: u(2.2), decideCadaTics: 4, costeCuerpoACuerpo: 1, costeDisparo: 1, sigueElGrafo: true } });
  const deBanda = primerAtaque(bandaAncha, { x0: -0.1, z0: -3.1, x1: 0.1, z1: -2.9 }, { x: 0, z: -8 });
  comprobar('una entidad que ronda entre 1,3 y 2,2 m con un golpe de 1,1 se acerca a su alcance cuando tiene turno, y ataca a quien no se mueve', deBanda.anuncio > 0, deBanda);
  /* El asiento justo detrás del quiosco; el tirador sale delante, dentro de su banda y sin verlo. */
  const tras = primerAtaque(claseTiradora({ guardia: null, acciones: [] }), { x0: -0.1, z0: 1.9, x1: 0.1, z1: 2.1 }, { x: 0, z: 9.5 });
  comprobar('un tirador que se queda en su banda sin línea de vista (el quiosco en medio) se mueve hasta ver a su blanco, y dispara', tras.bala > 0, tras);

  const base = clase();
  const alCaerDebil = base.alCaer.tipo === 'rematable' ? { ...base.alCaer, siNo: { ...base.alCaer.siNo, vida: 10 } } : base.alCaer;
  const debil = clase({ vida: 10, acciones: [], guardia: null, alCaer: alCaerDebil });
  const dos = juguete({ asientos: 1, clase: debil, grupos: (n) => [grupoFijo(n, 2, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-1, -7, 1, -6.6) }], nace: [{ x: 0, z: -8 }] });
  let caida = 0;
  let hecho = false;
  const tumbaUna: Robot = (a, b, reloj) => {
    if (hecho) return;
    const e = b.sala.entidades.find((x) => x.cerebro.modo !== 'aparecer' && x.vida > 0);
    if (e !== undefined && a.mandadas > 15) {
      hecho = true;
      caida = e.numero;
      a.planear(A.entrada, reloj, e.numero);
    }
  };
  const bt = bancoDeUno(dos, new Aparato(1, 5000, 0, 100, 17, tumbaUna));
  bt.correr(150);
  const absorbida = sucesosDe(bt, 'seva').find((x) => x.s.por === MOTIVO_DE_IRSE.absorbida);
  const levantada = bt.sala.entidades.find((x) => x.numero === caida);
  comprobar(
    'el trasvase: la caída que nadie remata absorbe a la otra que tiene cerca (`seva` absorbida, con quien absorbe) y se levanta con su vida',
    absorbida !== undefined && absorbida.s.quien === caida && levantada !== undefined && levantada.vida === 10 && levantada.cerebro.modo !== 'caida',
    { absorbida, levantada: levantada === undefined ? null : { vida: levantada.vida, modo: levantada.cerebro.modo } },
  );

  const una = juguete({ asientos: 1, clase: debil, grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-1, -7, 1, -6.6) }], nace: [{ x: 0, z: -8 }] });
  caida = 0;
  hecho = false;
  const br = bancoDeUno(una, new Aparato(1, 5000, 0, 100, 17, tumbaUna));
  br.correr(200);
  const deshecha = sucesosDe(br, 'seva').find((x) => x.s.por === MOTIVO_DE_IRSE.seDeshace);
  const vuelve = sucesosDe(br, 'nace').filter((x) => x.s.id === caida);
  const yo = br.sala.asientos[0]!;
  const lejos = vuelve.length === 2 && Math.hypot(vuelve[1]!.s.x - (yo.x * 100) / UNO, vuelve[1]!.s.z - (yo.z * 100) / UNO) >= 1000;
  comprobar(
    'la reimpresión: sin nadie a quien absorber se deshace y vuelve a los `reapareceTras` tics con su MISMO número, lejos de los asientos',
    deshecha !== undefined && deshecha.s.id === caida && vuelve.length === 2 && vuelve[1]!.k - deshecha.k === 40 && lejos,
    { deshecha, vuelve },
  );
}

paso('17 · Los avisos, el pago de lo que se lleva, la zona que se enciende y la que se rompe');
{
  const d = juguete({ asientos: 2, clase: sacoQuieto(), grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-0.1, -4.1, 0.1, -3.9) }], nace: [{ x: 0, z: -8 }, { x: 2, z: -8 }] });
  const m = new Mano(d);
  m.esperar(3);
  const e = m.sala.entidades[0]!.numero;
  const aviso = (clase: number, objetivo: number): number => m.paso([{ tipo: 'aviso', asiento: 1, clase, objetivo }]).sucesos.filter((s) => s.suceso.e === 'aviso').length;
  const primero = aviso(1, e);
  const seguido = aviso(1, e);
  m.esperar(20);
  const malo = aviso(1, 999);
  const deAsiento = aviso(2, 2);
  comprobar(
    'los avisos se reenvían a todos, uno por asiento cada `cadaTics` como mucho, y sólo si apuntan a lo que su clase dice',
    primero === 1 && seguido === 0 && malo === 0 && deAsiento === 1,
    { primero, seguido, malo, deAsiento },
  );

  const dS = juguete({ asientos: 1, fin: 'salida', lleva: 3, grupos: () => [], nace: [{ x: 0, z: -17 }] });
  const dS5 = { ...dS, mundo: { ...dS.mundo, zonas: dS.mundo.zonas.filter((z) => z.id !== 6) } };
  const aLaCinco: Robot = (a, _b, reloj) => {
    a.meta = { x: 0, z: u(-20) };
    if (Math.abs(a.z - u(-20)) < u(1) && a.sosten === null) a.sosten = { id: A.zona, ms: reloj, blanco: 0 };
  };
  const bS = bancoDeUno(dS5, new Aparato(1, 1000, 0, 100, 17, aLaCinco));
  bS.correr(200);
  const yo = bS.sala.asientos[0]!;
  const cobrado = yo.contadores.cobrado.find((c) => c.portable === 1)?.n ?? 0;
  comprobar('al salir se cobra lo que se lleva en triangular: 3 valen 60, más los 150 de salir; y se queda sin ellos', yo.puntos === 210 && cobrado === 3 && (yo.lleva[0]?.n ?? -1) === 0, { puntos: yo.puntos, cobrado, lleva: yo.lleva });

  const dZ = juguete({ asientos: 1, fin: 'salida', zonaTics: 60, grupos: () => [], nace: [{ x: 0, z: -8 }] });
  const bZ = bancoDeUno(dZ, new Aparato(1, 1000, 0, 100, 17, quieto));
  bZ.correr(80);
  const zonas = sucesosDe(bZ, 'zona');
  comprobar(
    'la zona que se apaga con alguien dentro gasta el recurso y enciende OTRA de su clase, con sus tics',
    zonas.length === 3 && zonas[1]!.s.tics === 0 && zonas[2]!.s.id !== zonas[0]!.s.id && zonas[2]!.s.tics === 800 && bZ.sala.recurso === 1 && bZ.sala.encuentro?.resultado === null,
    zonas.map((x) => ({ k: x.k, ...x.s })),
  );

  const floja = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(1, null) })] });
  /* El guardián sale en la zona de acción encendida (`zonaDeAccion`): el que la usa está a su alcance. */
  const dR = juguete({ asientos: 1, fin: 'salida', clase: floja, grupos: (n) => [{ ...grupoFijo(n, 1, 2), eleccion: 'zonaDeAccion' }], nace: [{ x: 0, z: -18 }] });
  const dR5 = { ...dR, mundo: { ...dR.mundo, zonas: dR.mundo.zonas.filter((z) => z.id !== 6) } };
  const bR = bancoDeUno(dR5, new Aparato(1, 1000, 0, 100, 17, aLaCinco));
  let usandoAntes = false;
  let rota = false;
  for (let i = 0; i < 200 && !rota; i++) {
    const p = bR.tic();
    const usando = (bR.sala.encuentro?.zona?.usando.length ?? 0) > 0;
    const golpe = p.sucesos.some((s) => s.suceso.e === 'resuelve' && s.suceso.r === RESULTADO.da);
    if (golpe && usandoAntes && !usando) rota = true;
    usandoAntes = usando;
  }
  comprobar('un golpe corta el uso de una zona que se rompe con daño: sale de la zona y tiene que volver a empezar', rota);
}

terminar({
  escritas: 139 + (HAY_QUIEBRO ? DEL_QUIEBRO : 0),
  enVerde:
    'La sala de la Liza nace y empieza cada fase como dice su contrato, valida el sitio y corrige lo que no cuadra,\n' +
    'juzga la esquiva en el reloj del aparato con el mismo veredicto con cualquier desfase y red, reparte los turnos,\n' +
    'juzga las balas contra los sitios declarados, conserva lo que se lleva, acaba sus encuentros con una ronda, da el\n' +
    'mismo paso en Node y en Hermes, renace reanudando la fase, y una sala llena cuesta menos de lo que el diseño estimó.',
});
