/**
 * LA LIZA DE JUGUETE, SU BANCO Y SUS ROBOTS: una liza que no es ningún juego, una E/S simulada con
 * aparatos que tienen su propio reloj y su red, y los robots que juegan en ella.
 *
 * ═══ POR QUÉ VIVE APARTE DE `verificar-liza.ts` ═══
 *
 * Nació dentro de aquel comprobador, y allí sólo la podía usar él. Hacen falta tres más:
 *
 *   · `guion-determinismo.ts` la JUEGA en Node y en Hermes (`jugarLaLizaDeJuguete`): la sala entera,
 *     con sus entidades, sus balas, sus esquivas y sus rondas, tiene que dar el mismo paso en los dos
 *     motores, y aquello sólo lo comprobaba `verify:liza` con una grabación de 300 tics suya. Ahora
 *     entra en la batería de los dos motores con los demás juegos de servidor.
 *   · `verificar-liza.ts` la sigue usando para todo lo demás, igual que antes.
 *   · Los bancos que juegan las declaraciones de verdad de un juego (el bloque 18 de `verify:liza`)
 *     usan el mismo banco y los mismos robots, no una copia que pudiera separarse.
 *
 * ═══ CORRE EN CUALQUIER MOTOR ═══
 *
 * Este fichero entra en el paquete que ejecuta Hermes 0.12, así que: ni `node:`, ni reloj de pared
 * (el coste de `avanzarLaSala` se mide con `performance` SÓLO si existe, y no entra en nada que se
 * compare), ni `Math.random`, ni `sort` sin un orden total (dos llegadas empatadas se ordenan por su
 * número de orden, dos planes empatados por su id), ni cierres sobre el `let` de un bucle —Hermes 0.12
 * no lo liga por iteración: `for (let i…) fns.push(() => i)` da el último `i` en todas—. Las clases
 * las baja Babel al empaquetar (ver `verificar-determinismo.ts`).
 *
 * ═══ QUÉ AFIRMA LA LIZA DE JUGUETE ═══
 *
 * Nada de un juego: una plaza de 50 unidades con un quiosco, un coche, un muro y un banco; una clase de
 * entidad (que en una variante dispara); un proyectil; un portable; dos zonas de acción. Es la regla del
 * §11 del diseño que estrena la Liza: ninguna declaración entra sin un uso que no sea el juego que la
 * pidió.
 */
import { UNO } from '../../shared/mecanicas/fijo';
import { DT_DEL_TIC, COSENO, SENO } from '../../shared/mecanicas/andar';
import { unPaso } from '../../shared/mecanicas/mundo';
import type { Arena } from '../../shared/mecanicas/mundo';
import { arenaDeLaLiza, problemasDeLaDeclaracion, VERSION_DE_LA_DECLARACION, CONTADORES_DE_ASIENTO } from '../../shared/mecanicas/liza/declaracion';
import type {
  AccionDeclarada,
  ClaseDeEntidad,
  ColumnaDeCuenta,
  EfectoDeclarado,
  FaseDeLaLiza,
  GrupoDeclarado,
  LizaDeclarada,
  PuestaDeEstado,
  ReglasDeAsiento,
} from '../../shared/mecanicas/liza/declaracion';
import type { SucesoDelTic, TuplaDeFoto } from '../../shared/mecanicas/liza/protocolo';
import type { AccionRecibida, EntradaDeLaSala, EstadoDeLaSala, PasoDeLaSala } from '../../shared/mecanicas/liza/tipos-de-la-sala';
import { avanzarLaSala, huellaDeLaSala, salaNueva } from '../../shared/mecanicas/liza/sala';
import { canonico } from '../../shared/mecanicas/canonico';
import { hayLineaDeVista, rumboHacia } from '../../shared/mecanicas/liza/geometria';

/**
 * EL CRONÓMETRO DEL BANCO, si el motor tiene uno: en Node, `performance.now()` (global desde la 16); en
 * Hermes, nada (0). Sólo sirve para el coste que mide `verify:liza`, y nunca entra en lo que se compara.
 */
function ahoraMs(): number {
  const g = globalThis as unknown as { performance?: { now?: () => number } };
  return g.performance !== undefined && typeof g.performance.now === 'function' ? g.performance.now() : 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LA LIZA DE JUGUETE
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Una longitud en Q16.16. */
export const u = (x: number): number => Math.round(x * UNO);

/** Los estados del juguete. */
export const E = {
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
export const A = {
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

export function puesta(estado: number, tics: number, intocableTics = 0, distanciaExtra = 0, soltableDesdeTic = tics): PuestaDeEstado {
  return { estado, tics, intocableTics, distanciaExtra, soltableDesdeTic };
}

/** Los estados que bloquean acciones (para que una puesta sin soltar lleve `soltableDesdeTic` = tics). */
export function efecto(dano: number, p: PuestaDeEstado | null, empuje = 0, extra: Partial<EfectoDeclarado> = {}): EfectoDeclarado {
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

export function accion(id: number, extra: Partial<AccionDeclarada>): AccionDeclarada {
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

export function reglas(asiento: string): ReglasDeAsiento {
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
export function porN(n: number, f: (presentes: number) => number): number[] {
  const t: number[] = [];
  for (let i = 1; i <= n; i++) t.push(f(i));
  return t;
}

export function clase(extra: Partial<ClaseDeEntidad> = {}): ClaseDeEntidad {
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
export function claseTiradora(extra: Partial<ClaseDeEntidad> = {}): ClaseDeEntidad {
  return clase({
    cerebro: { distanciaMinima: u(6), distanciaMaxima: u(14), decideCadaTics: 4, costeCuerpoACuerpo: 1, costeDisparo: 1, sigueElGrafo: true },
    proyectil: 1,
    ...extra,
  });
}

export const CAJAS = [
  { x0: -2, z0: 4, x1: 2, z1: 8 },
  { x0: 8, z0: -1, x1: 12, z1: 1 },
  { x0: -14, z0: 10, x1: -6, z1: 11 },
  { x0: 4, z0: 14, x1: 6, z1: 15 },
];

export function caja(x0: number, z0: number, x1: number, z1: number): { x0: number; z0: number; x1: number; z1: number } {
  return { x0: u(x0), z0: u(z0), x1: u(x1), z1: u(z1) };
}

export const COLUMNAS: ColumnaDeCuenta[] = [
  ...CONTADORES_DE_ASIENTO.map((que) => ({ que })),
  { que: 'lleva', portable: 1 },
  { que: 'cobrado', portable: 1 },
];

export interface OpcionesDelJuguete {
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
export function juguete(o: OpcionesDelJuguete = {}): LizaDeclarada {
  const d = montarJuguete(o);
  const problemas = problemasDeLaDeclaracion(d);
  if (problemas.length > 0) throw new Error(`la liza de juguete de esta prueba está mal declarada: ${problemas.slice(0, 3).join(' | ')}`);
  return d;
}

export function montarJuguete(o: OpcionesDelJuguete): LizaDeclarada {
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
export function grupoFijo(n: number, cuantos: number, claseDeZona: number, vivas = cuantos, cadaTics = 0): GrupoDeclarado {
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

export interface Pulsacion {
  id: number;
  ms: number;
  blanco: number;
  /** En qué orden se planeó: dos planes del mismo instante salen en ese orden, en cualquier motor. */
  orden?: number;
}

export interface Llegada {
  llega: number;
  orden: number;
  suceso: SucesoDelTic | null;
  dentro: { x: number; z: number } | null;
  corrige: { x: number; z: number } | null;
  foto: readonly TuplaDeFoto[] | null;
}

export type Robot = (a: Aparato, b: Banco, relojMs: number) => void;

export class Aparato {
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
  /** Cuántos planes lleva: el orden de desempate de `planes`. */
  planeados = 0;
  /** Hasta su `dentro` no sabe dónde está, y no manda `aqui` (ver `Bienvenida`). */
  dentro = false;
  /** Si al esquivar se desplaza (lo normal) o se queda donde está (para juzgar la ventana sin el alcance). */
  desplazaAlEsquivar = true;
  /** Con el canal abierto pero sin mandar `aqui`: la pestaña oculta (ver el bloque 12). */
  mudo = false;
  /**
   * La pestaña oculta que el navegador FRENA en vez de parar (Chrome baja los temporizadores a uno por
   * segundo): despierta sólo en los tics de la sala múltiplos de `cada` y manda de golpe sus `deGolpe`
   * últimos tics, seguidos y desde el mismo sitio, sin acción —es lo que hace `alcanzar` en
   * `escritorio/src/quiebro/red/partida.ts` tras una parada, con su `TICS_DE_GOLPE`—. `null`: despierta
   * en cada tic, como un aparato a la vista.
   */
  dormido: { readonly cada: number; readonly deGolpe: number } | null = null;
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
    this.planes.push({ id, ms: Math.max(0, Math.round(ms)), blanco, orden: this.planeados++ });
    /* Un orden total: el estable de V8 y el de Hermes no tienen por qué coincidir en los empates. */
    this.planes.sort((p, q) => p.ms - q.ms || (p.orden ?? 0) - (q.orden ?? 0));
  }
}

export class Banco {
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
    const antes = ahoraMs();
    const p = avanzarLaSala(this.sala, entradas);
    this.costeMs += ahoraMs() - antes;
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
    if (a.dormido !== null) {
      if (this.k % a.dormido.cada !== 0) return;
      const ahora = Math.floor(reloj / 50);
      for (let j = a.dormido.deGolpe - 1; j >= 0; j--) {
        a.mandadas++;
        this.meter(pared + a.rtt / 2, { tipo: 'aqui', asiento: a.numero, n: ahora - j, x: a.x, z: a.z, r: a.mira, m: 0, accion: null, desfaseMs: a.D + a.error });
      }
      return;
    }
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
export function por(a: number, b: number): number {
  return ((a * b) / UNO) | 0;
}

/* ─── LOS ROBOTS ─────────────────────────────────────────────────────────── */

/** No hace nada: está, y manda su `aqui` quieto. */
export const quieto: Robot = () => {};

/** Los anuncios contra mí que he oído y aún no he atendido, por id. */
export function anunciosContraMi(a: Aparato, desde: number): { id: number; t: number; de: number; acc: number }[] {
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
export interface IdsDelRobot {
  readonly esquiva: number;
  readonly replica: number;
  readonly remate: number;
  readonly entrada: number;
}

export const IDS_DEL_JUGUETE: IdsDelRobot = { esquiva: A.esquiva, replica: A.replica, remate: A.remate, entrada: A.entrada };

/** Los ids de una declaración cualquiera: su esquiva, lo que lanza tras una limpia, su remate y la primera acción que abre con blanco. */
export function idsDe(d: LizaDeclarada): IdsDelRobot {
  const r = d.asientos[0] as ReglasDeAsiento;
  let remate = 0;
  for (const c of d.clases) if (remate === 0 && c.alCaer.tipo === 'rematable') remate = c.alCaer.remate.accion;
  const entrada = r.acciones.find((x) => x.cadena === null && x.enganche !== null && x.soloEn.length === 0);
  return { esquiva: r.esquiva.accion, replica: r.esquiva.contraProyectil.accion, remate, entrada: entrada?.id ?? 0 };
}

export function lector(X: number, opciones: { replica?: boolean; rematar?: boolean; esquivar?: boolean; consumir?: boolean; ids?: IdsDelRobot } = {}): Robot {
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
export function premioDe(d: LizaDeclarada, n: number): number {
  return d.asientos[n - 1]?.esquiva.alAcertar.puesta.estado ?? -1;
}

/** EL QUE APORREA: esquiva cada tres tics y golpea (entrada al más cercano) en los otros, sin mirar nada. */
export function aporreador(): Robot {
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

/**
 * EL GUERRERO: lee (esquiva cada anuncio a `X` ms de su impacto y replica en su premio), remata lo que
 * cae, va a por la entidad en pie más cercana y la golpea con la entrada cuando la tiene a tiro. Es el
 * jugador de los robots: el que llena la sala en los bloques de determinismo y de coste.
 */
export function guerrero(X: number, ids: IdsDelRobot = IDS_DEL_JUGUETE): Robot {
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

/** FNV-1a de 32 bits, en hexadecimal: una huella corta de un texto largo. */
export function fnv(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

export function salidasDe(p: PasoDeLaSala): string {
  return canonico({ sucesos: p.sucesos, veredictos: p.veredictos, foto: p.fotoDebida, correcciones: p.correcciones, bienvenidas: p.bienvenidas });
}

/**
 * La sala llena: seis asientos con guerreros, y entidades que disparan hasta catorce a la vez. Con poco
 * daño y recurso de sobra: la primera versión mataba a los seis en un minuto, el encuentro se perdía y el
 * «coste de la sala llena» se medía con la sala vacía.
 */
export function lizaLlena(o: OpcionesDelJuguete = {}): LizaDeclarada {
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

export function bancoLleno(d: LizaDeclarada, semilla: number): Banco {
  const aparatos: Aparato[] = [];
  const rtts = [50, 90, 130, 170, 210, 250];
  const errores = [0, 40, -40, 17, -23, 35];
  for (let i = 1; i <= 6; i++) aparatos.push(new Aparato(i, 1000 * i + 37 * i * i, errores[i - 1] as number, rtts[i - 1] as number, (13 * i) % 50, guerrero(80 + 20 * i)));
  const b = new Banco(d, semilla, aparatos);
  for (let i = 1; i <= 6; i++) b.conectar(i);
  b.guardarPasos = false;
  return b;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * UNA LIZA DE JUGUETE JUGADA ENTERA (para `verify:determinismo`)
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Lo que sale de jugar la liza de juguete: las cuentas para los suelos, y el hilo y el estado para comparar. */
export interface JugadaDeLaLiza {
  semilla: number;
  tics: number;
  /** Anuncios, balas y líneas de apuntado que le llegaron al asiento 1 (a cada asiento le llegan los suyos). */
  anuncios: number;
  balas: number;
  lineas: number;
  /** Anuncios resueltos, entidades nacidas, veces que alguien quedó ausente y fases por las que pasó. */
  resueltos: number;
  nacidas: number;
  ausentes: number;
  fases: number;
  /** El hilo de todo lo que salió de la sala, tic a tic (FNV sobre la forma canónica), y el estado final. */
  salidas: string;
  huella: string;
}

/**
 * LA LIZA DE JUGUETE JUGADA `tics` TICS, en cualquier motor. La sala llena de `lizaLlena` —seis asientos
 * con guerreros que golpean, esquivan y leen; hasta catorce entidades que golpean y disparan— con lo más
 * raro que la sala hace metido por medio: al cuarto de la partida el asiento 6 se calla tres segundos
 * (queda ausente y vuelve con su intocable); a la mitad, una vista con OTRA fase en calma (todo se
 * disuelve y quien está fuera del límite se recoloca); y a los dos tercios, otra de encuentro con otra
 * semilla.
 *
 * ═══ POR QUÉ JUGADA Y NO REPRODUCIDA ═══
 *
 * `verify:liza` (bloque 14) ya compara Node contra Hermes REPRODUCIENDO entradas grabadas: los dos motores
 * reciben lo mismo y sólo se compara la sala. Aquí los robots deciden con lo que la sala les cuenta, así
 * que un bit distinto en el tic cien cambia lo que hacen después y las dos partidas se separan del todo.
 * Y el banco —los aparatos, su red, sus robots— entra también en el paquete: lo que cambie de motor a
 * motor en él se ve igual.
 */
export function jugarLaLizaDeJuguete(semilla: number, tics: number): JugadaDeLaLiza {
  const d = lizaLlena();
  const b = bancoLleno(d, semilla);
  const calma: LizaDeclarada = { ...d, fase: { ...d.fase, clave: 'juguete-calma', modo: 'calma', encuentro: null } };
  const otra: LizaDeclarada = { ...d, fase: { ...d.fase, clave: 'juguete-otra', semilla: (semilla ^ 0x5bd1e995) >>> 0 } };
  const callaEn = Math.floor(tics / 4);
  const vuelveEn = callaEn + 60;
  const calmaEn = Math.floor(tics / 2);
  const otraEn = Math.floor((2 * tics) / 3);
  const sexto = b.aparato(6);
  const claves: string[] = [];
  let anuncios = 0;
  let balas = 0;
  let lineas = 0;
  let resueltos = 0;
  let nacidas = 0;
  let ausentes = 0;
  let salidas = '';
  for (let i = 0; i < tics; i++) {
    if (i === callaEn) sexto.mudo = true;
    if (i === vuelveEn) sexto.mudo = false;
    if (i === calmaEn) b.meter(b.k * 50 + 1, { tipo: 'vista', declaracion: calma });
    if (i === otraEn) b.meter(b.k * 50 + 1, { tipo: 'vista', declaracion: otra });
    const p = b.tic();
    salidas = fnv(salidas + salidasDe(p));
    for (const x of p.sucesos) {
      const e = x.suceso;
      if (x.para === 1 && e.e === 'anuncio') anuncios++;
      else if (x.para === 1 && e.e === 'bala') balas++;
      else if (x.para === 1 && e.e === 'apunta' && e.a !== 0) lineas++;
      else if (x.para === 0 && e.e === 'resuelve') resueltos++;
      else if (x.para === 0 && e.e === 'nace') nacidas++;
      else if (x.para === 0 && e.e === 'estado' && e.est === E.ausente) ausentes++;
      else if ((x.para === 0 || x.para === 1) && e.e === 'fase' && claves.indexOf(e.clave) < 0) claves.push(e.clave);
    }
  }
  return { semilla, tics, anuncios, balas, lineas, resueltos, nacidas, ausentes, fases: claves.length, salidas, huella: fnv(huellaDeLaSala(b.sala)) };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SIN NADIE A QUIEN PERSEGUIR, DETRÁS DE UN MURO (bloque 22 de `verify:liza` y `verify:determinismo`)
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * LA LIZA SIN BLANCO: un asiento que se calla desde el primer tic (ausente a los dos segundos: nadie lo
 * persigue), el límite de 20 × 20 y una zona de salida FUERA de él, justo detrás del muro que lo bordea.
 * Las cuatro que nacen —todas después de que el asiento quede ausente— tienen que entrar rodeando el muro
 * por el grafo: es lo único que recorre `entrarPorElGrafo` (`cerebro.ts`), que en El Quiebro sólo corre si
 * una boca de calle queda tapada, y por eso la juega también la tanda de dos motores.
 */
export function lizaSinBlanco(): LizaDeclarada {
  return juguete({
    asientos: 1,
    limite: 2,
    relojTics: 4000,
    reaparicion: { x: 0, z: -9 },
    zonasExtra: [{ id: 9, clase: 9, caja: caja(-10.2, 11.8, -9.8, 12.2) }],
    grupos: (n) => [{ clase: 1, cuantos: porN(n, () => 4), vivasALaVez: porN(n, () => 4), claseDeZona: 9, desdeTic: 60, cadaTics: 20, eleccion: 'azar' }],
  });
}

/** Lo que sale de jugarla: cuántas nacieron y cuántas entraron, y el hilo y el estado para comparar. */
export interface JugadaSinBlanco {
  tics: number;
  nacidas: number;
  entraron: number;
  salidas: string;
  huella: string;
}

/** La liza sin blanco jugada `tics` tics, en cualquier motor (ver `lizaSinBlanco`). */
export function jugarLaLizaSinBlanco(tics: number): JugadaSinBlanco {
  const d = lizaSinBlanco();
  const ap = new Aparato(1, 4000, 0, 100, 17, quieto);
  ap.mudo = true;
  const b = new Banco(d, 7, [ap]);
  b.guardarPasos = false;
  b.conectar(1);
  let caja0 = { x0: 0, z0: 0, x1: 0, z1: 0 };
  for (const l of d.mundo.limites) if (l.id === d.fase.limite) caja0 = l.caja;
  const dentro = new Map<number, boolean>();
  let nacidas = 0;
  let entraron = 0;
  let salidas = '';
  for (let t = 0; t < tics; t++) {
    const p = b.tic();
    salidas = fnv(salidas + salidasDe(p));
    for (const x of p.sucesos) if (x.para === 0 && x.suceso.e === 'nace') nacidas++;
    for (const e of p.sala.entidades) {
      const ahora = e.x >= caja0.x0 && e.x <= caja0.x1 && e.z >= caja0.z0 && e.z <= caja0.z1;
      if (dentro.get(e.numero) === false && ahora) entraron++;
      dentro.set(e.numero, ahora);
    }
  }
  return { tics: b.k, nacidas, entraron, salidas, huella: fnv(huellaDeLaSala(b.sala)) };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * EL PASEANTE Y LA VIGILANCIA DE LOS NPC (bloque 18 de `verify:liza`)
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * EL PASEANTE: va a un sitio al azar de la plaza cada tres segundos y esquiva lo que le anuncian. Es el
 * jugador que no se deja rodear: las entidades tienen que perseguirlo, no esperarlo. Su azar es un
 * congruencial con su semilla, en enteros sin signo: el mismo recorrido en cualquier motor.
 */
export function paseante(semilla: number, ids: IdsDelRobot, lado = 20): Robot {
  const leer = lector(110, { replica: true, ids });
  let s = semilla >>> 0;
  let proximo = 0;
  return (a, b, reloj) => {
    leer(a, b, reloj);
    if (reloj < proximo) return;
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const x = ((s >>> 8) % (2 * lado)) - lado;
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const z = ((s >>> 8) % (2 * lado)) - lado;
    a.meta = { x: u(x), z: u(z) };
    proximo = reloj + 3000;
  };
}

/** Lo que se vigila de las entidades en un banco (ver `vigilarLosNpc`). */
export interface VigilanciaDeNpc {
  mirar(s: EstadoDeLaSala): void;
  resumen(): { nacidas: number; quietas: string[]; fuera: string[]; peorQuieta: number; peorFuera: number };
}

/** Tics seguidos con turno, cerca y sin ir a ninguna parte que hacen a una entidad «quieta»: tres segundos. */
export const TICS_QUIETA = 60;
/** Tics desde que nace que tiene una entidad para entrar en el límite de la fase: cinco segundos. */
export const TICS_PARA_ENTRAR = 100;

/**
 * LA VIGILANCIA DEL PUNTO 4, mirada desde FUERA de la sala: sólo su estado, sin ninguna cuenta interna del
 * cerebro. Por cada entidad y cada tic:
 *
 *   · QUIETA CON TURNO: en pie y libre (sin un estado que la bloquee, sin estar apareciendo, sin
 *     recuperarse de un golpe), con su blanco un asiento válido a 3 m o menos —o dentro de su banda de
 *     tiro y a la vista, si dispara—, con el turno de su clase POSIBLE contra él (contado como lo cuenta
 *     el cerebro: lo que ya tienen las demás y los anuncios que vuelan), SIN anunciar ni apuntar, y sin
 *     haber ido a ninguna parte —menos de una unidad— en el último segundo. Lo último separa estar quieta
 *     de perseguir a quien anda casi tan deprisa como ella. Más de `TICS_QUIETA` seguidos así es una
 *     entidad quieta junto al jugador.
 *   · FUERA DEL LÍMITE: viva, más de `TICS_PARA_ENTRAR` desde que nació sin haber tenido nunca el centro
 *     dentro del límite de la fase.
 */
export function vigilarLosNpc(d0: LizaDeclarada): VigilanciaDeNpc {
  const racha = new Map<number, number>();
  const peorRacha = new Map<number, number>();
  const nacio = new Map<number, number>();
  const entro = new Set<number>();
  const fuera = new Map<number, string>();
  const quietas = new Map<number, string>();
  const historia = new Map<number, { x: number; z: number }[]>();
  let arena = arenaDeLaLiza(d0);
  let mundo = d0.mundo;
  let peorFuera = 0;
  return {
    mirar(s) {
      const d = s.declaracion;
      if (d.mundo !== mundo) {
        mundo = d.mundo;
        arena = arenaDeLaLiza(d);
      }
      const k = s.tic;
      let limite: { x0: number; z0: number; x1: number; z1: number } | null = null;
      for (const l of d.mundo.limites) if (l.id === d.fase.limite) limite = l.caja;
      const activo = (e: { estado: { estado: number; desdeTic: number; hastaTic: number } | null }): number =>
        e.estado !== null && k >= e.estado.desdeTic && k < e.estado.hastaTic ? e.estado.estado : 0;
      const bloquea = (id: number): boolean => {
        for (const x of d.estados) if (x.id === id) return x.bloqueaAccion || x.bloqueaPaso;
        return false;
      };
      const claseDe = (id: number): ClaseDeEntidad | null => {
        for (const c of d.clases) if (c.id === id) return c;
        return null;
      };
      const valido = (n: number): EstadoDeLaSala['asientos'][number] | null => {
        const a = s.asientos[n - 1];
        if (a === undefined || !a.conCuerpo || a.vida <= 0) return null;
        const est = activo(a);
        if (est === d.presencia.estadoAusente || est === d.sinCuerpo.estado) return null;
        return a;
      };
      const posible = (e: EstadoDeLaSala['entidades'][number], c: ClaseDeEntidad, b: EstadoDeLaSala['asientos'][number], tipo: 'cuerpoACuerpo' | 'disparo'): boolean => {
        if (e.turno === tipo && e.blanco === b.numero) return true;
        if (d.turnos.excluyen.indexOf(activo(b)) >= 0) return false;
        let usado = 0;
        for (const o of s.entidades) {
          if (o === e || o.blanco !== b.numero || o.turno !== tipo) continue;
          const co = claseDe(o.clase);
          if (co !== null) usado += tipo === 'cuerpoACuerpo' ? co.cerebro.costeCuerpoACuerpo : co.cerebro.costeDisparo;
        }
        if (tipo === 'disparo') return usado + c.cerebro.costeDisparo <= d.turnos.disparo;
        if (usado + c.cerebro.costeCuerpoACuerpo > d.turnos.cuerpoACuerpo) return false;
        let anuncios = 0;
        for (const an of s.anuncios) if (an.a === b.numero && an.lanzadoEnTic <= k) anuncios++;
        return anuncios < d.turnos.anunciosALaVez;
      };
      const dentro = (r: number, dx: number, dz: number): boolean => dx * dx + dz * dz <= r * r;
      for (const e of s.entidades) {
        const c = claseDe(e.clase);
        if (c === null) continue;
        const modo = e.cerebro.modo;
        if (!nacio.has(e.numero)) nacio.set(e.numero, k);
        const viva = e.vida > 0 && modo !== 'caida' && modo !== 'absorber' && modo !== 'deshecha';
        if (limite !== null && viva) {
          if (e.x >= limite.x0 && e.x <= limite.x1 && e.z >= limite.z0 && e.z <= limite.z1) entro.add(e.numero);
          else if (!entro.has(e.numero)) {
            const lleva = k - (nacio.get(e.numero) as number);
            if (lleva > peorFuera) peorFuera = lleva;
            if (lleva > TICS_PARA_ENTRAR && !fuera.has(e.numero)) {
              fuera.set(e.numero, `#${String(e.numero)} (clase ${String(e.clase)}) fuera en (${(e.x / UNO).toFixed(1)}, ${(e.z / UNO).toFixed(1)}) a los ${String(lleva)} tics de nacer`);
            }
          }
        }
        let quieta = false;
        const b = e.blanco > 0 ? valido(e.blanco) : null;
        const est = activo(e);
        const recupera = (e as unknown as { recuperaHastaTic?: number }).recuperaHastaTic ?? 0;
        let anuncia = false;
        for (const an of s.anuncios) if (an.de === e.numero && !an.esRepeticion) anuncia = true;
        if (viva && modo !== 'aparecer' && b !== null && !(est !== 0 && bloquea(est)) && k >= recupera && !anuncia && modo !== 'apuntar' && modo !== 'disparar') {
          const dx = b.x - e.x;
          const dz = b.z - e.z;
          if (c.proyectil !== 0) {
            const cerca = Math.floor((c.cerebro.distanciaMinima * 3) / 4);
            quieta = dentro(c.cerebro.distanciaMaxima, dx, dz) && !dentro(cerca, dx, dz) && hayLineaDeVista(arena.cuerpos, e.x, e.z, b.x, b.z) && posible(e, c, b, 'disparo');
          } else {
            let abre = false;
            for (const x of c.acciones) if (x.cadena === null) abre = true;
            quieta = abre && dentro(3 * UNO, dx, dz) && posible(e, c, b, 'cuerpoACuerpo');
          }
        }
        const h = historia.get(e.numero) ?? [];
        h.push({ x: e.x, z: e.z });
        if (h.length > 21) h.shift();
        historia.set(e.numero, h);
        const hace = h[0] as { x: number; z: number };
        if (quieta && h.length === 21 && (e.x - hace.x) * (e.x - hace.x) + (e.z - hace.z) * (e.z - hace.z) >= UNO * UNO) quieta = false;
        const r = quieta ? (racha.get(e.numero) ?? 0) + 1 : 0;
        racha.set(e.numero, r);
        if (r > (peorRacha.get(e.numero) ?? 0)) peorRacha.set(e.numero, r);
        if (r > TICS_QUIETA && !quietas.has(e.numero) && b !== null) {
          const dist = Math.sqrt((b.x - e.x) * (b.x - e.x) + (b.z - e.z) * (b.z - e.z)) / UNO;
          quietas.set(e.numero, `#${String(e.numero)} (clase ${String(e.clase)}) quieta a ${dist.toFixed(2)} de su blanco ${String(e.blanco)} en el tic ${String(k)}`);
        }
      }
    },
    resumen() {
      let peorQuieta = 0;
      for (const v of peorRacha.values()) if (v > peorQuieta) peorQuieta = v;
      return { nacidas: nacio.size, quietas: [...quietas.values()], fuera: [...fuera.values()], peorQuieta, peorFuera };
    },
  };
}

/* ─── LA VIGÍA DE LAS LÍNEAS DE APUNTADO ─────────────────────────────────── */

/** Lo que vio `vigilarLasLineas`: líneas abiertas, ráfagas, líneas dejadas y lo que no cumplió. */
export interface ResumenDeLasLineas {
  readonly lineas: number;
  readonly rafagas: number;
  readonly dejadas: number;
  readonly malas: readonly string[];
}

export interface VigiaDeLasLineas {
  mirar(p: PasoDeLaSala): void;
  resumen(): ResumenDeLasLineas;
}

/**
 * LA VIGÍA DE LAS LÍNEAS DE APUNTADO. Lleva, por destinatario y por entidad, la línea abierta (`apunta`
 * con blanco) y mira lo que `SucesoApunta` promete:
 *   · cada ráfaga —la primera `bala` de una entidad con su línea abierta— sale con el MISMO `t` que su
 *     línea, y `apuntarTics` después de abrirla (salvo la línea que llegó en una puesta al día, que se
 *     abrió a medias);
 *   · ninguna bala sale sin su línea, salvo las siguientes de la misma ráfaga y las que repite una puesta
 *     al día (las que ya volaban);
 *   · ninguna línea se queda colgada: pasado su tic de fijarse, o salió la bala, o se dejó (`a` 0), o se
 *     fue quien apuntaba (`seva`).
 */
export function vigilarLasLineas(d: LizaDeclarada): VigiaDeLasLineas {
  const apuntarTics = new Map<number, number>();
  const rafagaTics = new Map<number, number>();
  for (const pr of d.proyectiles) {
    apuntarTics.set(pr.id, pr.apuntarTics);
    rafagaTics.set(pr.id, (pr.balas - 1) * pr.cadaTics);
  }
  const abiertas = new Map<string, { k: number; t: number; p: number; de: number; aMedias: boolean }>();
  const rafagas = new Map<string, number>();
  let lineas = 0;
  let nRafagas = 0;
  let dejadas = 0;
  const malas: string[] = [];
  const clave = (para: number, de: number): string => `${String(para)}:${String(de)}`;
  const cerrarDe = (de: number): void => {
    for (const [c, ab] of [...abiertas]) if (ab.de === de) abiertas.delete(c);
  };
  return {
    mirar(p) {
      const k = p.sala.tic;
      const bienvenidos = new Set<number>();
      for (const w of p.bienvenidas) bienvenidos.add(w.asiento);
      for (const x of p.sucesos) {
        const s = x.suceso;
        if (s.e === 'apunta') {
          if (s.a === 0) {
            dejadas++;
            cerrarDe(s.de);
          } else {
            lineas++;
            abiertas.set(clave(x.para, s.de), { k, t: s.t, p: s.p, de: s.de, aMedias: bienvenidos.has(x.para) });
          }
        } else if (s.e === 'bala') {
          const c = clave(x.para, s.de);
          const ab = abiertas.get(c);
          if (ab !== undefined) {
            abiertas.delete(c);
            nRafagas++;
            rafagas.set(c, k);
            const tics = apuntarTics.get(s.p) ?? -1;
            if (s.t !== ab.t || (!ab.aMedias && k - ab.k !== tics)) {
              malas.push(`tic ${String(k)}: la ráfaga de ${String(s.de)} para ${String(x.para)} sale en ${String(s.t)} y su línea (abierta en el tic ${String(ab.k)}) decía ${String(ab.t)}`);
            }
          } else if (!bienvenidos.has(x.para)) {
            const r = rafagas.get(c);
            if (r === undefined || k - r > (rafagaTics.get(s.p) ?? 0)) malas.push(`tic ${String(k)}: la bala ${String(s.id)} de ${String(s.de)} para ${String(x.para)} sale sin su línea`);
          }
        } else if (s.e === 'seva') cerrarDe(s.id);
      }
      for (const [c, ab] of [...abiertas]) {
        if (k <= ab.k + (apuntarTics.get(ab.p) ?? 0)) continue;
        malas.push(`tic ${String(k)}: la línea ${c}, abierta en el tic ${String(ab.k)}, se quedó colgada (ni bala, ni «lo deja», ni se fue)`);
        abiertas.delete(c);
      }
    },
    resumen: () => ({ lineas, rafagas: nRafagas, dejadas, malas }),
  };
}
