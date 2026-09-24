/**
 * EL PRODUCTOR DE LA LIZA DE EL QUIEBRO: de la vista pública de una mesa y su código, la
 * `LizaDeclarada` que la sala del servidor arbitra y que el aparato predice.
 *
 * ═══ UNA FUNCIÓN PURA, Y LA MISMA EN LOS DOS LADOS ═══
 *
 * La sala la llama cuando sube la revisión de la mesa (`mirar(codigo, null)`, la vista del
 * espectador, que en este juego es la de todos); el aparato, con la vista que le llega por el
 * sondeo. Con lo mismo, lo mismo: la ciudad sale de (traza, código, noche, plazas de la noche) con
 * `quiebro-ciudad.ts`, los números de cada asiento de `componerReglamento`, y nada más entra. Si el aparato derivara su
 * liza de otra cosa —un estilo que cree haber elegido, un reloj propio—, predeciría pasos que la
 * sala no acepta. Por eso `lizas.ts` la registra y los dos la piden al registro.
 *
 * ═══ CADA FASE EMPIEZA DESDE EL PUNTO DE CONTROL ═══
 *
 * La sala no guarda nada entre fases: al empezar una (otra `fase.clave`) toma de aquí el
 * `alEmpezar` de cada asiento —aguante, Foco, esquirlas— y el recurso del equipo —las monedas—, que
 * son los que la mesa apuntó al cerrar la ronda anterior (`quiebro.ts`). Así un despliegue que mata
 * la sala pierde como mucho la fase en curso: la sala nueva la empieza desde el mismo sitio.
 *
 * ═══ LO QUE DECIDE ESTE FICHERO Y LO QUE NO ═══
 *
 * Decide la FORMA: qué estado pone cada golpe, qué acción abre y cuál encadena, cómo se llama cada
 * clave de fase, qué grupos salen por qué zonas. Los NÚMEROS no: vienen compuestos de
 * `quiebro-reglas.ts` y aquí sólo se pasan a las unidades de la Liza (Q16.16 con `deNumero`). Un
 * número del diseño que se afina se cambia allí y llega a la sala, al aparato y al reductor a la vez.
 *
 * ═══ LA CIUDAD ABIERTA, ENTREGA 1 (`docs/quiebro/CIUDAD-ABIERTA.md`, §5.3 y §6.1) ═══
 *
 * El mundo es la ciudad de 540 m de la mesa, la MISMA toda la noche (ver `mundoDe`): la sala lo valida y
 * hace su arena una vez por noche, y el aparato predice sobre la misma. El límite es la plaza de la
 * Bajada en la Bajada y la ciudad entera en todo lo demás (`limiteDeLaFase`): se sale de la plaza y se
 * anda la ciudad en las oleadas, en la pausa y en la Llamada. Las oleadas siguen EN la plaza de la
 * Bajada: sus grupos salen de las bocas y los huecos de impresión de esa plaza. La Llamada suena en una
 * cabina a 100-160 m por calles de ella (ver «La cabina de la Llamada»). Y lo que sale persigue al grupo
 * esté donde esté y no se olvida (L10 con alcance 0 y sin olvido, ver `OLVIDO_DE_LA_LIZA`): alejarse de la
 * plaza no aguanta una oleada. Lo que la entrega 2 trae —los Fallos fuera, emboscadas, las dos cabinas,
 * reaparecer cerca del grupo, y con ellos el olvido de la travesía— entra con las demás declaraciones
 * L1-L12 de la Liza, que aquí todavía no se usan.
 *
 * ═══ NUNCA LANZA ═══
 *
 * Una vista que no se lee, un código vacío, una base de tablas que este binario no conoce: `null`.
 * La sala no se abre y lo dice; un proceso caído por la vista de una mesa se llevaría las demás.
 */
import { UNO, deNumero } from '../../mecanicas/fijo';
import { VERSION_DE_LA_DECLARACION } from '../../mecanicas/liza/declaracion';
import type {
  AccionDeclarada,
  AforoDeLaSala,
  CadenaDeclarada,
  ClaseDeEntidad,
  EfectoDeclarado,
  EncuentroDeclarado,
  EstadoDeclarado,
  FaseDeLaLiza,
  GrupoDeclarado,
  LizaDeclarada,
  ModoDeLaFase,
  MundoDeLaLiza,
  OlvidoDeclarado,
  PuestaDeEstado,
  ReglasDeAsiento,
  SitioDeNacer,
  ZonaDelMundo,
} from '../../mecanicas/liza/declaracion';
import { semillaDelCodigo } from '../../mecanicas/semilla';
import {
  BANDA_DE_LA_CABINA_CERCANA,
  CLASE_DE_ZONA_DE_CABINA,
  ID_DEL_LIMITE_DE_LA_CIUDAD,
  campoHasta,
  ciudadDeLaMesa,
  ciudadDeLaNoche,
  claseDeZonaDePlaza,
  despejarLasPlazas,
  distanciaPorCalles,
  idDelLimiteDePlaza,
  mundoDeLaLizaDeLaCiudad,
} from './quiebro-ciudad';
import type { NocheDeLaCiudad, PlazaDeLaCiudad } from './quiebro-ciudad';
import {
  ACCION_DEL_QUIEBRO as A,
  AGUANTE,
  AVERIAS,
  AVISOS,
  AVISO_DEL_QUIEBRO,
  CABINA,
  CAIDA,
  CLASE_DEL_QUIEBRO,
  CUERPO_DEL_DESVELADO,
  ENEMIGOS,
  ESQUIRLAS,
  ESTADO_DEL_QUIEBRO as E,
  FOCO,
  GOLPES,
  OLEADA_TICS,
  PERSECUCION_DEL_SISTEMA,
  PRESENCIA,
  PROYECTIL_DEL_QUIEBRO,
  PUNTOS,
  QUIEBRO_DEL_DESVELADO,
  RED,
  TURNOS,
  componerReglamento,
  encuentroDeLaLlamada,
  encuentroDeLaOleada,
  limiteDeLaFase,
  porCiento,
  presentesDeLaMesa,
  rondaDeLaFase,
  salenParaGanar,
  ticsDeLaLlamada,
} from './quiebro-reglas';
import type { GolpeCompuesto, GrupoDeLaNoche, ReglamentoCompuesto, ReglasDelDesvelado, ZonaDeEntrada } from './quiebro-reglas';
import { COLUMNAS_DE_LA_RONDA, ESQUIRLAS_COMO_MUCHO, PLAZA_DE_LA_PRIMERA_BAJADA, PORTABLE_ESQUIRLA, bajadaDeLaNoche, leerVistaDelQuiebro } from './quiebro-vista';
import type { AsientoDelQuiebro, FaseDelQuiebro, VistaDelQuiebro } from './quiebro-vista';

/* ─── LO QUE ES DE LA MESA Y NO DE LA FASE ───────────────────────────────── */

/**
 * EL AFORO DE UNA SALA DE EL QUIEBRO, el mismo en TODAS las mesas y todas sus fases.
 *
 * La Liza exige que sea el mismo en todas las declaraciones de una mesa, la reunión incluida (la sala
 * se admite por su coste al nacer y no puede crecer). En la reunión todavía se puede sentar gente, así
 * que el aforo de una mesa no se sabe hasta que empieza, y tiene que cubrir la de seis: 14 vivos en
 * la oleada más llena (§4.10), uno más para el guardián de la Llamada y cinco números de sobra para
 * los Celadores caídos o deshechos, que siguen ocupando el suyo. Doce balas en vuelo como mucho
 * (§10), y un montón por cada Celador desalojado o desvelado caído que pueda seguir en el suelo.
 *
 * El precio es que una sala en solitario se admite como si fuera llena (ver el informe del frente y
 * `costeDeLaLiza` en `lizas.ts`).
 */
export const AFORO_DEL_QUIEBRO: AforoDeLaSala = { entidades: 20, balas: 12, montones: 16 };

/** Metros a Q16.16. Todas las medidas de las tablas son múltiplos de 0,05 m. */
function m(metros: number): number {
  return deNumero(metros);
}

/* ─── LOS ESTADOS (declaración D) ────────────────────────────────────────── */

function estado(id: number, bloqueaPaso: boolean, bloqueaAccion: boolean, cancelaCon: readonly number[], seCortaConDano: boolean): EstadoDeclarado {
  return { id, bloqueaPaso, bloqueaAccion, cancelaCon, seCortaConDano };
}

/**
 * EL CATÁLOGO DE ESTADOS: cómo se comporta quien está en cada uno. Cuánto dura lo dice quien lo pone.
 *
 *   · El quiebro y la ruptura no dejan andar por cuenta propia: su desplazamiento es la distancia
 *     extra de su puesta. Se puede golpear desde su tic soltable.
 *   · Tocado se corta con el quiebro (la ruptura, que cuesta Foco); rescatar y descolgar, también, y
 *     además un golpe los corta.
 *   · El Remanso y el reaparecido no bloquean nada: son intocables por su puesta.
 *   · El ausente (§5) bloquea el paso y las acciones: es intocable y los NPC lo ignoran, y a cambio ni
 *     anda ni pega. Sin eso, un aparato que se saltaba un tic de cada diez jugaba intocable (ver
 *     `AQUIS_PARA_ESTAR` en `tipos-de-la-sala.ts`); la Liza lo exige.
 */
const ESTADOS: readonly EstadoDeclarado[] = [
  estado(E.quiebro, true, true, [], false),
  estado(E.tocado, true, true, [A.quiebro], false),
  estado(E.descolocado, true, true, [], false),
  estado(E.derribado, true, true, [], false),
  estado(E.remanso, false, false, [], false),
  estado(E.desconectado, true, true, [], false),
  estado(E.reaparecido, false, false, [], false),
  estado(E.ruptura, true, true, [], false),
  estado(E.desalojando, true, true, [], false),
  estado(E.rescatando, true, true, [A.quiebro], true),
  estado(E.descolgando, true, true, [A.quiebro], true),
  estado(E.vigia, true, true, [], false),
  estado(E.ausente, true, true, [], false),
  estado(E.desalojable, true, true, [], false),
  estado(E.absorbiendo, true, true, [], false),
];

/** Los estados que no bloquean acciones: su puesta no se suelta antes (va igual a sus tics). */
const NO_BLOQUEAN: readonly number[] = ESTADOS.filter((s) => !s.bloqueaAccion).map((s) => s.id);

/** Una puesta de estado. En los que no bloquean acciones, `soltable` se ignora y va igual a `tics`. */
function puesta(estadoId: number, tics: number, intocableTics = 0, soltableDesdeTic = tics, distanciaExtra = 0): PuestaDeEstado {
  return {
    estado: estadoId,
    tics,
    intocableTics,
    soltableDesdeTic: NO_BLOQUEAN.indexOf(estadoId) >= 0 ? tics : soltableDesdeTic,
    distanciaExtra,
  };
}

/* ─── LOS GOLPES (declaración E) ─────────────────────────────────────────── */

function efecto(dano: number, danoAlRitmo: number, puntos: number, puntosAlRitmo: number, pu: PuestaDeEstado | null, empuje: number, alChocar: { dano: number; tics: number }, rompeGuardia: boolean): EfectoDeclarado {
  return { dano, danoAlRitmo, puntos, puntosAlRitmo, puesta: pu, empuje, alChocar: pu === null ? { dano: alChocar.dano, tics: 0 } : alChocar, rompeGuardia };
}

const SIN_CHOQUE = { dano: 0, tics: 0 } as const;

/** Encadenar tras `tras` en la ventana de la Tanda; con compás si `alCompas` es otro anuncio. */
function cadena(tras: number, anuncioTics: number, alCompas: number | null): CadenaDeclarada {
  const g = GOLPES.cadena;
  return {
    tras: [tras],
    antesMs: g.antesMs,
    despuesMs: g.despuesMs,
    ritmoMs: alCompas === null ? 0 : g.compasMs,
    anuncioTicsAlRitmo: alCompas === null ? anuncioTics : alCompas,
    soloSiDio: false,
  };
}

/**
 * LOS GOLPES DE UN DESVELADO (§4.4, §4.5): la Tanda (Entrada, dos Seguidas con compás y Cierre que
 * empuja), el Empellón que rompe la guardia, la Réplica imparable del Remanso y, con el retoque, su
 * segundo golpe. Fallar deja descolocado 8 tics, salvo la Réplica, que no se falla más que por
 * distancia.
 *
 * La Réplica AVANZA lo que se quebró y un metro más (`ReglasDelDesvelado.replica.avanceMetros`): quien
 * falló contra un limpio queda clavado donde lanzó, y el quiebro de lado te ha llevado a 3,5 m de él. Es la
 * acometida corta del §4.4; el aparato la hace (`partida.ts`, como la de la Entrada) y la sala cuenta con
 * ella al resolver (`AccionDeclarada.avance`).
 */
function accionesDelDesvelado(r: ReglasDelDesvelado): AccionDeclarada[] {
  const alcance = m(GOLPES.alcanceMetros);
  const holgura = m(GOLPES.holguraMetros);
  const enganche = { radio: m(r.enganche.metros), conoRumbos: r.enganche.conoRumbos, holgura: m(r.enganche.holguraMetros) };
  const falla = puesta(E.descolocado, GOLPES.falloDescolocaTics);
  const base = { alcance, holgura, enganche, imparable: false, recargaTics: 0, recuperacionTics: 0, soloEn: [] as number[], alFallar: falla };
  const tocado = (tics: number): PuestaDeEstado => puesta(E.tocado, tics);
  const derribado = (tics: number): PuestaDeEstado => puesta(E.derribado, tics);
  const s = r.seguida;
  const acciones: AccionDeclarada[] = [
    {
      ...base,
      id: A.entrada,
      anuncioTics: r.entrada.anuncioTics,
      avance: m(r.entrada.avanceMetros),
      cadena: null,
      efecto: efecto(r.entrada.dano, r.entrada.dano, r.entrada.puntos, r.entrada.puntos, tocado(r.entrada.tocadoTics), 0, SIN_CHOQUE, false),
    },
    {
      ...base,
      id: A.seguida1,
      anuncioTics: s.anuncioTics,
      avance: m(GOLPES.seguida.avanceMetros),
      cadena: cadena(A.entrada, s.anuncioTics, s.anuncioAlCompas),
      efecto: efecto(s.dano, s.danoAlCompas, s.puntos, s.puntosAlCompas, tocado(s.tocadoTics), 0, SIN_CHOQUE, false),
    },
    {
      ...base,
      id: A.seguida2,
      anuncioTics: s.anuncioTics,
      avance: m(GOLPES.seguida.avanceMetros),
      cadena: cadena(A.seguida1, s.anuncioTics, s.anuncioAlCompas),
      efecto: efecto(s.dano, s.danoAlCompas, s.puntos, s.puntosAlCompas, tocado(s.tocadoTics), 0, SIN_CHOQUE, false),
    },
    {
      ...base,
      id: A.cierre,
      anuncioTics: r.cierre.anuncioTics,
      avance: m(GOLPES.cierre.avanceMetros),
      cadena: cadena(A.seguida2, r.cierre.anuncioTics, null),
      efecto: efecto(r.cierre.dano, r.cierre.dano, r.cierre.puntos, r.cierre.puntos, derribado(r.cierre.derribadoTics), m(r.cierre.empujeMetros), r.estampado, false),
    },
    {
      ...base,
      id: A.empellon,
      anuncioTics: r.empellon.anuncioTics,
      avance: 0,
      cadena: null,
      efecto: efecto(r.empellon.dano, r.empellon.dano, r.empellon.puntos, r.empellon.puntos, tocado(r.empellon.tocadoTics), m(r.empellon.empujeMetros), r.estampado, true),
      recargaTics: r.empellon.recargaTics,
    },
    {
      ...base,
      id: A.replica,
      anuncioTics: r.replica.anuncioTics,
      avance: m(r.replica.avanceMetros),
      cadena: null,
      efecto: efecto(r.replica.dano, r.replica.dano, r.replica.puntos, r.replica.puntos, derribado(r.replica.derribadoTics), 0, SIN_CHOQUE, false),
      imparable: true,
      soloEn: [E.remanso],
      alFallar: null,
    },
  ];
  if (r.replicaDoble !== null) {
    const d = r.replicaDoble;
    acciones.push({
      ...base,
      id: A.replicaDoble,
      anuncioTics: d.anuncioTics,
      avance: 0,
      cadena: cadena(A.replica, d.anuncioTics, null),
      efecto: efecto(d.dano, d.dano, d.puntos, d.puntos, derribado(r.replica.derribadoTics), 0, SIN_CHOQUE, false),
      imparable: true,
      soloEn: [E.remanso],
      alFallar: null,
    });
  }
  return acciones;
}

/** Acota un entero a [desde, hasta]. */
function entre(x: number, desde: number, hasta: number): number {
  return x < desde ? desde : x > hasta ? hasta : x;
}

/**
 * EL REGLAMENTO ENTERO DE UN ASIENTO: su cuerpo, sus golpes, su quiebro, su rescate, su Foco, sus
 * puntos y el punto de control con que empieza la fase.
 *
 * En la BAJADA la vida es el lleno del estilo que se lleve ahora, no el aguante del punto de control:
 * ahí se puede cambiar de estilo, y la mesa deja el aguante con el del estilo con que se bajó —es como
 * sabe la vista que ya se cambió (`quiebro.ts`, «El diario tiene tope»)— y lo llena al abrir la oleada
 * 1. En la Bajada no se pega a nadie, así que da lo mismo para el juego; pero el aparato pinta su
 * aguante con lo que declara la sala, y la Mole no tiene por qué verse a 100 de 130 al bajar.
 */
function reglasDeAsiento(r: ReglasDelDesvelado, a: AsientoDelQuiebro, c: ReglamentoCompuesto, enLaBajada: boolean): ReglasDeAsiento {
  const C = CUERPO_DEL_DESVELADO;
  const Q = QUIEBRO_DEL_DESVELADO;
  const desplaza = m(r.quiebro.metros + Q.holguraMetros);
  const esquirlas = entre(a.control.esquirlas, 0, ESQUIRLAS_COMO_MUCHO);
  return {
    asiento: r.asiento,
    cuerpo: {
      radio: m(C.radioMetros),
      marchas: C.marchas.map(m),
      aceleracionTics: C.aceleracionTics,
      presupuestoCorto: { velocidad: m(C.presupuestoCorto.metrosPorSegundo), acumulaTics: C.presupuestoCorto.acumulaTics },
      presupuestoLargo: { distancia: m(C.presupuestoLargo.metros), enTics: C.presupuestoLargo.enTics },
      vidaTope: r.aguante,
      vidaAlRematar: entre(porCiento(AGUANTE.porDesalojo, vidaPorCiento(c)), 1, r.aguante),
      firmeCadaTics: r.firmeCadaTics,
      guardaTics: C.guardaTics,
    },
    acciones: accionesDelDesvelado(r),
    esquiva: {
      accion: A.quiebro,
      puesta: puesta(E.quiebro, r.quiebro.tics, 0, r.quiebro.soltableDesdeTic, desplaza),
      ventanaMs: r.quiebro.ventanaMs,
      esquivaHastaMs: r.quiebro.esquivaHastaMs,
      primeras: { cuantas: r.quiebro.aprendiz, ventanaMs: r.quiebro.aprendizMs },
      torpe: { cada: Q.torpe.cada, enTics: Q.torpe.enTics },
      alAcertar: {
        /*
         * El Remanso no admite distancia de más: no la necesita. Lo que se recorre en él lo pone quien lo
         * recorre —la Réplica su avance (`intentarGolpe`), la Acometida contra una bala su vuelo
         * (`contraProyectil`, en `proyectiles.ts`), un quiebro el suyo—, cada uno con su gracia. La primera
         * versión le daba los 11 m de la Acometida a TODO Remanso: un segundo en que el presupuesto de paso
         * admitía teletransportarse once metros sin haber esquivado ninguna bala.
         */
        puesta: puesta(E.remanso, Q.remansoTics, Q.remansoTics, Q.remansoTics, 0),
        alAutor: puesta(E.descolocado, Q.descolocaAlQueFallaTics),
      },
      contraProyectil: { distancia: m(Q.acometida.metros), tics: Q.acometida.tics, accion: A.replica },
      ruptura: { coste: Q.ruptura.coste, desde: [E.tocado], puesta: puesta(E.ruptura, r.quiebro.tics, Q.ruptura.intocableTics, r.quiebro.soltableDesdeTic, desplaza) },
    },
    rescate: {
      accion: A.rescatar,
      radio: m(r.rescate.metros),
      mantenerTics: r.rescate.tics,
      puesta: puesta(E.rescatando, r.rescate.tics),
      vidaAlVolver: entre(r.rescate.aguanteAlVolver, 1, r.aguante),
      medidorAmbos: r.rescate.focoAmbos,
    },
    medidor: { tope: FOCO.tope, porLimpia: FOCO.porLimpio, porRitmo: FOCO.porCompas, porRemate: FOCO.porDesalojo, porChoque: FOCO.porEstampado },
    puntos: {
      factor: factorDePuntos(c),
      multiplicador: { paso: Math.round((UNO * PUNTOS.racha.pasoPorCiento) / 100), tope: (UNO * PUNTOS.racha.topePorCiento) / 100 },
      porLimpia: PUNTOS.porLimpio,
      porChoque: PUNTOS.porEstampado,
      porRemate: PUNTOS.porDesalojo,
      porRescate: PUNTOS.porRescate,
      porSalir: PUNTOS.porSalir,
    },
    alEmpezar: {
      vida: enLaBajada ? r.aguante : entre(a.control.aguante, 1, r.aguante),
      medidor: entre(a.control.foco, 0, FOCO.tope),
      lleva: esquirlas > 0 ? [{ portable: PORTABLE_ESQUIRLA, n: esquirlas }] : [],
    },
  };
}

/** La vida de la avería de la noche en por ciento: media con «Cristal». */
function vidaPorCiento(c: ReglamentoCompuesto): number {
  return AVERIAS[c.averia].vidaPorCiento;
}

/**
 * EL FACTOR DE PUNTOS en Q16.16, pasado de las diezmilésimas del reglamento compuesto (que es quien lo
 * traduce: aquí sólo se cambia de unidad). Las tablas (múltiplos de 25 por 100 o 150) dan siempre un
 * número exacto: ×1,875 con Cristal en Chaparrón son 122.880, sin redondeo que se lleve medio punto.
 */
function factorDePuntos(c: ReglamentoCompuesto): number {
  return Math.round((UNO * c.puntosPorDiezMil) / 10000);
}

/* ─── EL SISTEMA (declaraciones G, I, J) ─────────────────────────────────── */

/** Un golpe del Sistema contra un desvelado: sin enganche (el blanco lo pone el turno) ni puntos. */
function golpeDelSistema(id: number, g: GolpeCompuesto, pu: PuestaDeEstado, empuje: number, cadenaTras: number | null, recuperacionTics: number): AccionDeclarada {
  return {
    id,
    anuncioTics: g.anuncioTics,
    alcance: m(GOLPES.alcanceMetros),
    holgura: m(0.6),
    enganche: null,
    avance: m(0.5),
    cadena:
      cadenaTras === null
        ? null
        : { tras: [cadenaTras], antesMs: 0, despuesMs: 0, ritmoMs: 0, anuncioTicsAlRitmo: g.anuncioTics, soloSiDio: true },
    efecto: efecto(g.dano, g.dano, 0, 0, pu, empuje, SIN_CHOQUE, false),
    imparable: false,
    recargaTics: 0,
    recuperacionTics,
    soloEn: [],
    alFallar: null,
  };
}

/**
 * LAS TRES CLASES (§4.8). Los Celadores y los tiradores caen DESALOJABLES: si nadie los desaloja en
 * 3 s, absorben al Prestado vivo más cercano (el Trasvase) o se reimprimen lejos. Los Prestados se
 * van al caer: vuelven a ser durmientes y el aparato los pinta huyendo.
 *
 * La respuesta de la guardia es una acción de la clase que no va tras nada (la Liza la exige de la
 * clase); la lanza la guardia al parar, sin turno. El cerebro abre sus ataques con la Entrada.
 */
function clasesDelSistema(c: ReglamentoCompuesto, bajada: number): ClaseDeEntidad[] {
  const en = c.enemigos;
  const EN = ENEMIGOS;
  const radio = m(EN.radioMetros);
  const tocado = (g: GolpeCompuesto): PuestaDeEstado => puesta(E.tocado, g.tics);
  const alCaer = (vidaTrasElTrasvase: number): ClaseDeEntidad['alCaer'] => ({
    tipo: 'rematable',
    puesta: puesta(E.desalojable, EN.desalojo.tics),
    remate: { accion: A.desalojar, radio: m(EN.desalojo.metros), mantenerTics: EN.desalojo.remateTics, puesta: puesta(E.desalojando, EN.desalojo.remateTics, EN.desalojo.remateTics) },
    suelta: { portable: PORTABLE_ESQUIRLA, n: ESQUIRLAS.porCelador },
    siNo: {
      absorbe: CLASE_DEL_QUIEBRO.prestado,
      radio: m(EN.trasvase.metros),
      absorbiendo: puesta(E.absorbiendo, EN.trasvase.tics, EN.trasvase.tics),
      vida: vidaTrasElTrasvase,
      reapareceTras: EN.trasvase.reimprimeTics,
      claseDeZona: claseDeZonaDeEntrada('aparicion', bajada),
      distanciaMinima: m(EN.trasvase.reimprimeMetros),
    },
  });
  const guardia = {
    conoRumbos: EN.celador.guardia.conoRumbos,
    para: [A.entrada],
    salvoEn: [E.tocado, E.descolocado, E.derribado],
    alParar: puesta(E.descolocado, GOLPES.falloDescolocaTics),
    respuesta: A.respuestaDeCelador,
    esquivaAlAzar: { acciones: [A.empellon], probabilidad: Math.round((UNO * EN.celador.guardia.esquivaElEmpellonPorCiento) / 100) },
  };
  const cierre = en.celador.cierre;
  return [
    {
      id: CLASE_DEL_QUIEBRO.prestado,
      vida: en.prestado.vida,
      radio,
      velocidad: m(EN.prestado.velocidad),
      acciones: [golpeDelSistema(A.golpeDePrestado, en.prestado.golpe, tocado(en.prestado.golpe), 0, null, 10)],
      proyectil: 0,
      guardia: null,
      cerebro: {
        distanciaMinima: m(EN.prestado.cerebro.minimaMetros),
        distanciaMaxima: m(EN.prestado.cerebro.maximaMetros),
        decideCadaTics: EN.prestado.cerebro.decideCadaTics,
        costeCuerpoACuerpo: EN.prestado.cerebro.turnos,
        costeDisparo: 0,
        sigueElGrafo: true,
        alcanceDeBlanco: ALCANCE_DE_LA_LIZA,
      },
      aparicion: { modo: 'desdePunto', tics: EN.prestado.apareceTics },
      alCaer: { tipo: 'irse' },
    },
    {
      id: CLASE_DEL_QUIEBRO.celador,
      vida: en.celador.vida,
      radio,
      velocidad: m(EN.celador.velocidad),
      acciones: [
        golpeDelSistema(A.entradaDeCelador, en.celador.entrada, tocado(en.celador.entrada), 0, null, 6),
        golpeDelSistema(A.seguidaDeCelador, en.celador.seguida, tocado(en.celador.seguida), 0, A.entradaDeCelador, 6),
        /* El Cierre derriba y empuja: el derribado admite los 5 m de «ser empujado» (§4.2). */
        golpeDelSistema(A.cierreDeCelador, cierre, puesta(E.derribado, cierre.tics, 0, cierre.tics, m(5)), m(EN.celador.cierre.empujeMetros), A.seguidaDeCelador, 10),
        golpeDelSistema(A.respuestaDeCelador, en.celador.respuesta, tocado(en.celador.respuesta), 0, null, 6),
      ],
      proyectil: 0,
      guardia,
      cerebro: {
        distanciaMinima: m(EN.celador.cerebro.minimaMetros),
        distanciaMaxima: m(EN.celador.cerebro.maximaMetros),
        decideCadaTics: EN.celador.cerebro.decideCadaTics,
        costeCuerpoACuerpo: EN.celador.cerebro.turnos,
        costeDisparo: 0,
        sigueElGrafo: true,
        alcanceDeBlanco: ALCANCE_DE_LA_LIZA,
      },
      aparicion: { modo: 'imprimir', tics: EN.celador.imprimeTics },
      alCaer: alCaer(en.vidaTrasElTrasvase),
    },
    {
      id: CLASE_DEL_QUIEBRO.tirador,
      vida: en.tirador.vida,
      radio,
      velocidad: m(EN.tirador.velocidad),
      acciones: [
        golpeDelSistema(A.entradaDeTirador, en.tirador.entrada, tocado(en.tirador.entrada), 0, null, 6),
        golpeDelSistema(A.seguidaDeTirador, en.tirador.seguida, tocado(en.tirador.seguida), 0, A.entradaDeTirador, 6),
      ],
      proyectil: PROYECTIL_DEL_QUIEBRO.bala,
      guardia: null,
      cerebro: {
        distanciaMinima: m(EN.tirador.cerebro.minimaMetros),
        distanciaMaxima: m(EN.tirador.cerebro.maximaMetros),
        decideCadaTics: EN.tirador.cerebro.decideCadaTics,
        costeCuerpoACuerpo: EN.tirador.cerebro.turnos,
        costeDisparo: EN.tirador.cerebro.disparos,
        sigueElGrafo: true,
        alcanceDeBlanco: ALCANCE_DE_LA_LIZA,
      },
      aparicion: { modo: 'imprimir', tics: EN.tirador.imprimeTics },
      alCaer: alCaer(en.vidaTrasElTrasvaseDelTirador),
    },
  ];
}

/* ─── LA FASE (declaraciones L, M, R, V) ─────────────────────────────────── */

/**
 * LA CLAVE DE UNA FASE: cambia si y sólo si cambia la fase de la mesa. Lleva el número de noche, así
 * que la oleada 2 de la noche 3 no se confunde con la de la noche 4; y la noche interrumpida tiene la
 * suya, así que reanudar vuelve a EMPEZAR la fase (dos cambios de clave seguidos).
 */
export function claveDeLaFase(v: Pick<VistaDelQuiebro, 'fase' | 'noche'>): string {
  const n = `n${String(v.noche === null ? 0 : v.noche.numero)}`;
  const f = v.fase;
  switch (f.tipo) {
    case 'reunion':
      return 'reunion';
    case 'bajada':
      return `${n}.b`;
    case 'oleada':
      return `${n}.o${String(f.oleada)}`;
    case 'pausa':
      return `${n}.p${String(f.oleada)}`;
    case 'llamada':
      return `${n}.ll`;
    case 'recuento':
      return `${n}.re`;
    case 'interrumpida':
      return `${n}.i`;
    case 'final':
      return `${n}.f`;
    default:
      return 'cerrada';
  }
}

/** Qué hace la sala en cada fase: combate en las oleadas y la Llamada, andar en la Bajada y la pausa. */
function modoDeLaFase(f: FaseDelQuiebro): ModoDeLaFase {
  if (f.tipo === 'oleada' || f.tipo === 'llamada') return 'encuentro';
  if (f.tipo === 'bajada' || f.tipo === 'pausa') return 'calma';
  return 'quieta';
}

/**
 * LA CLASE DE ZONA DE LA CIUDAD de cada papel (`ZonaDeEntrada`), con las oleadas en la plaza de la Bajada:
 * sus bocas y sus huecos de impresión (la numeración es la de `quiebro-ciudad.ts`), y la cabina que suena.
 */
function claseDeZonaDeEntrada(zona: ZonaDeEntrada, bajada: number): number {
  if (zona === 'cabina') return CLASE_DE_LA_CABINA_QUE_SUENA;
  return claseDeZonaDePlaza(bajada, zona === 'impresion' ? 'impresion' : 'boca');
}

function grupoDeLaLiza(g: GrupoDeLaNoche, bajada: number): GrupoDeclarado {
  return {
    clase: CLASE_DEL_QUIEBRO[g.clase],
    cuantos: g.cuantos,
    vivasALaVez: g.vivas,
    claseDeZona: claseDeZonaDeEntrada(g.zona, bajada),
    desdeTic: g.desdeTic,
    cadaTics: g.cadaTics,
    eleccion: g.eleccion,
  };
}

/**
 * A QUIÉN PERSIGUE EL SISTEMA Y SI OLVIDA (L10), en las unidades de la Liza: el alcance de blanco del cerebro
 * de cada clase y el olvido de cada encuentro. Los números son de las reglas (`PERSECUCION_DEL_SISTEMA`), y en
 * la entrega 1 son «sin tope» y «sin olvido»: todos sus encuentros están anclados a la plaza de la Bajada o a
 * la cabina, y con el olvido de la travesía alejarse del ancla aguantaba una oleada sin pelear (ver allí por
 * qué, y cuándo vuelven los 90 m y los 45). Se escribe la forma entera de L10 —el alcance y el olvido, aunque
 * sean 0 y `null`—, no la transitoria que la Liza admite a quien todavía no los declara.
 */
const ALCANCE_DE_LA_LIZA = m(PERSECUCION_DEL_SISTEMA.alcanceMetros);
const OLVIDO_DE_LA_LIZA: OlvidoDeclarado | null =
  PERSECUCION_DEL_SISTEMA.olvido === null ? null : Object.freeze({ distancia: m(PERSECUCION_DEL_SISTEMA.olvido.metros), tics: PERSECUCION_DEL_SISTEMA.olvido.tics });

/**
 * EL ENCUENTRO DE UNA FASE DE COMBATE, o `null`. La oleada acaba al vaciarse (con su reloj de 150 s,
 * que la deja aguantada); la Llamada, por la cabina que suena: se gana si sale al menos la mitad de
 * los presentes, redondeando hacia arriba (§4.11). Los dos, con el olvido de `OLVIDO_DE_LA_LIZA`.
 */
function encuentroDe(v: VistaDelQuiebro, c: ReglamentoCompuesto, presentes: number, bajada: number): EncuentroDeclarado | null {
  const numero = v.noche === null ? 0 : v.noche.numero;
  const ronda = rondaDeLaFase(numero, v.fase);
  if (ronda === null || v.noche === null) return null;
  const asientos = v.asientos.length;
  if (v.fase.tipo === 'oleada') {
    const o = encuentroDeLaOleada(v.fase.oleada, v.noche.receta, c.nivelDelSistema, c.contramedida, asientos);
    return { ronda, presentes, relojTics: OLEADA_TICS, vivasALaVez: o.vivas, grupos: o.grupos.map((g) => grupoDeLaLiza(g, bajada)), fin: { tipo: 'vaciar' }, olvido: OLVIDO_DE_LA_LIZA };
  }
  const l = encuentroDeLaLlamada(c.nivelDelSistema, v.monedas, asientos);
  const salen: number[] = [];
  for (let n = 1; n <= asientos; n++) salen.push(salenParaGanar(n));
  const cabinaTics = c.filaDelSistema.cabinaTics;
  return {
    ronda,
    presentes,
    relojTics: ticsDeLaLlamada(cabinaTics, v.monedas) + 1,
    vivasALaVez: l.vivas,
    grupos: l.grupos.map((g) => grupoDeLaLiza(g, bajada)),
    fin: {
      tipo: 'salida',
      zona: {
        claseDeZona: CLASE_DE_LA_CABINA_QUE_SUENA,
        accion: A.descolgar,
        /* Medido desde el centro de la zona, que es el sitio de descolgar, a un metro del poste. */
        radio: m(CABINA.metros),
        mantenerTics: CABINA.descolgarTics,
        capacidad: 1,
        puesta: puesta(E.descolgando, CABINA.descolgarTics),
        rompeConDano: true,
        activaTics: cabinaTics,
        alApagarse: { coste: 1, siguienteTics: CABINA.otraTics },
      },
      salenComoMinimo: salen,
    },
    olvido: OLVIDO_DE_LA_LIZA,
  };
}

/** El id en la Liza del límite de la fase (ver `limiteDeLaFase`): la plaza de la Bajada o la ciudad. */
function idDelLimite(v: VistaDelQuiebro, bajada: number): number {
  const l = limiteDeLaFase(v.fase, bajada);
  return l.tipo === 'plaza' ? idDelLimiteDePlaza(l.plaza) : ID_DEL_LIMITE_DE_LA_CIUDAD;
}

function faseDe(v: VistaDelQuiebro, c: ReglamentoCompuesto, codigo: string, bajada: number): FaseDeLaLiza {
  const presentes = entre(presentesDeLaMesa(v.asientos), 1, v.asientos.length);
  const clave = claveDeLaFase(v);
  return {
    clave,
    modo: modoDeLaFase(v.fase),
    limite: idDelLimite(v, bajada),
    semilla: semillaDelCodigo(`${codigo}#${clave}`) >>> 0,
    reloj: v.reloj === null ? null : { id: v.reloj.id, duraMs: v.reloj.duraMs },
    encuentro: modoDeLaFase(v.fase) === 'encuentro' ? encuentroDe(v, c, presentes, bajada) : null,
  };
}

/* ─── EL MUNDO: LA CIUDAD DE LA NOCHE, CON SU MEMORIA ───────────────────── */

/**
 * LA CLASE DE ZONA DE LA CABINA QUE SUENA en la Llamada de la entrega 1 (ver «La cabina de la Llamada»).
 * No es de la numeración de `quiebro-ciudad.ts` (plazas 11-63, cabinas 100, refugios 101, arcas
 * 110-125): la pone este productor en su mundo, y `verify:quiebro` mira que no pise ninguna de aquéllas.
 */
export const CLASE_DE_LA_CABINA_QUE_SUENA = 102;

/**
 * LA CABINA DE LA LLAMADA, EN LA ENTREGA 1. La sala enciende una zona de la clase de la salida, sorteada
 * entre TODAS las de esa clase (`encenderLaZona`), y la ciudad tiene veinte cabinas candidatas de la
 * misma clase repartidas por 540 m: una a 400 m por calles no se alcanza en 60 s. La entrega 2 las mide
 * por bandas desde el grupo (L5); hasta entonces, las candidatas de la noche son las que quedan a
 * `BANDA_DE_LA_CABINA_CERCANA` (100-160 m) por calles de la plaza de la Bajada, con las obras de la noche,
 * y el productor les da en su mundo la clase `CLASE_DE_LA_CABINA_QUE_SUENA`. La traza asegura que desde el
 * nudo de cada plaza haya alguna en esa banda, también con obras (lo mira `verify:quiebro-barrio`); si
 * por lo que fuera no la hubiera, la que menos se sale de la banda, para que la Llamada suene siempre.
 * Los metros son los de `distanciaPorCalles`: los que ve el HUD.
 *
 * LO QUE ESTO NO PUEDE HACER: medir desde donde está el grupo. El productor sólo ve la vista de la mesa, y la
 * mesa no sabe dónde está nadie (§10 del diseño: sólo recibe rondas, relojes y ausentes); y el mundo es uno
 * por noche, validado una vez, así que tampoco puede cambiar de cabinas en la Llamada. Quien sabe dónde está
 * el grupo es la sala: medir la banda desde él es L5 (`ZonaDeAccionAmpliada.bandas`, ya declarada, sin
 * cumplir aún en `encenderLaZona`). Hasta entonces, el grupo que se aleja de la plaza en la última pausa
 * puede oír una cabina a 250-300 m (la revisión de jugar oyó una a 313 m); el reloj de 60 s de la ciudad
 * (`CABINA`) es lo que las reglas ponen de su parte.
 */
function cabinasDeLaLlamada(n: NocheDeLaCiudad, bajada: number): readonly number[] {
  const plaza = n.ciudad.plazas[bajada - 1] as PlazaDeLaCiudad;
  const campo = campoHasta(n.grafo, plaza.nudo);
  const [desde, hasta] = BANDA_DE_LA_CABINA_CERCANA;
  const enBanda: number[] = [];
  let mejor = -1;
  let mejorFuera = Number.POSITIVE_INFINITY;
  for (const c of n.ciudad.cabinas) {
    const metros = distanciaPorCalles(n.grafo, campo, c.sitio.x, c.sitio.z);
    if (metros < 0) continue;
    if (metros >= desde && metros <= hasta) enBanda.push(c.zona);
    const fuera = metros < desde ? desde - metros : metros > hasta ? metros - hasta : 0;
    if (fuera < mejorFuera) {
      mejor = c.zona;
      mejorFuera = fuera;
    }
  }
  return enBanda.length > 0 ? enBanda : mejor >= 0 ? [mejor] : [];
}

/**
 * LOS SITIOS DE NACER DE LA NOCHE: los seis de asiento de la plaza de la Bajada, y los mismos seis de
 * reaparición. La Liza exige que TODO sitio de nacer quede dentro del límite de la fase (la sala no
 * aceptaría ni su primer paso), y en la Bajada el límite es su plaza: los de las otras plazas y los de
 * los refugios que `mundoDeLaLizaDeLaCiudad` pone detrás harían inválido el mundo en la Bajada. Con un
 * mundo solo para la Bajada serían dos mundos por noche, y dos validaciones (§5.6 pide una). Así que en la
 * entrega 1 —las oleadas en la plaza de la Bajada, sin L6— se nace y se reaparece en la plaza, como en
 * la glorieta de antes. Cuando la Liza mire sólo los sitios que la fase puede usar, o llegue L6 con su
 * reaparición cerca del grupo, vuelven los refugios de la traza, ya ordenados por su distancia a la
 * plaza. Son los seis primeros del mundo de la ciudad: lo dice su contrato, y `verify:quiebro` lo mira.
 */
function sitiosDeLaPlaza(nace: readonly SitioDeNacer[]): readonly SitioDeNacer[] {
  const asiento = nace.slice(0, 6);
  return Object.freeze([...asiento, ...asiento.map((s) => Object.freeze({ papel: 'reaparicion' as const, x: s.x, z: s.z, rumbo: s.rumbo }))]);
}

/**
 * LOS ÚLTIMOS MUNDOS DERIVADOS, por (traza, código, noche, plazas de la noche, despejadas), y el más viejo
 * fuera: 16 (§5.3). La clave no lleva la fase ni el punto de control, así que el mundo es el MISMO objeto
 * toda la noche —del mismo suelo y el mismo grafo, que son los de la ciudad—: la sala lo valida una vez
 * (la Liza guarda la validación por la identidad del mundo) y hace su arena una vez, y el aparato igual.
 * Derivar una traza nueva cuesta unos 6-10 ms en Node, una mesa nueva con la traza hecha 1,5, y otra noche
 * de la misma mesa menos de uno: sin esta memoria se pagaría en cada voto de la pausa. El resultado es el
 * mismo con o sin ella: sale sólo de lo que va en la clave.
 */
const MUNDOS = new Map<string, MundoDeLaLiza>();
const MUNDOS_QUE_SE_RECUERDAN = 16;

/**
 * EL MUNDO DE LA REUNIÓN. Todavía no hay traza (se sortea al empezar) ni noche, y la Liza pide un mundo en
 * toda fase con el mismo aforo. Uno fijo para todas las mesas —la traza 0 del código `REUNION`, bajando a la
 * Glorieta—: se deriva una vez por proceso y se valida una vez por proceso, y en la reunión (`quieta`) no se
 * anda. Lo que no se hace es derivar la ciudad de cada mesa en la reunión para tirarla al empezar.
 */
const REUNION = { traza: 0, codigo: 'REUNION' } as const;
const DE_LA_REUNION: { mundo: MundoDeLaLiza | null } = { mundo: null };

/** Deriva el mundo (sin memoria): la ciudad de la mesa, su noche, despejada o no, y lo que pone el productor. */
function derivarElMundo(traza: number, codigo: string, noche: number, fallos: readonly number[], despejadas: boolean): MundoDeLaLiza {
  const n = ciudadDeLaNoche(ciudadDeLaMesa(traza, codigo), codigo, noche, fallos);
  const deLaCiudad = mundoDeLaLizaDeLaCiudad(n, despejadas);
  const suenan = cabinasDeLaLlamada(despejadas ? despejarLasPlazas(n) : n, fallos[0] ?? PLAZA_DE_LA_PRIMERA_BAJADA);
  const zonas: ZonaDelMundo[] = deLaCiudad.zonas.map((z) => (z.clase === CLASE_DE_ZONA_DE_CABINA && suenan.indexOf(z.id) >= 0 ? Object.freeze({ id: z.id, clase: CLASE_DE_LA_CABINA_QUE_SUENA, caja: z.caja }) : z));
  return Object.freeze({ ...deLaCiudad, zonas: Object.freeze(zonas), nace: sitiosDeLaPlaza(deLaCiudad.nace) });
}

/**
 * EL MUNDO DE LA NOCHE: el de la ciudad de la traza y el código, vestida para la noche y sus plazas, con
 * sus plazas despejadas si toca (Memoria del Sistema), y lo que la entrega 1 pone encima: la cabina de la
 * Llamada y los sitios de nacer en la plaza de la Bajada (ver arriba). Con memoria (ver `MUNDOS`).
 */
function mundoDe(traza: number, codigo: string, noche: number, fallos: readonly number[], despejadas: boolean): MundoDeLaLiza {
  const mayusculas = codigo.toUpperCase();
  const llave = `${String(traza)}#${mayusculas}#${String(noche)}#${fallos.join('.')}#${despejadas ? 'd' : 'p'}`;
  const hecho = MUNDOS.get(llave);
  if (hecho !== undefined) {
    MUNDOS.delete(llave);
    MUNDOS.set(llave, hecho);
    return hecho;
  }
  const mundo = derivarElMundo(traza, mayusculas, noche, fallos, despejadas);
  MUNDOS.set(llave, mundo);
  for (const vieja of MUNDOS.keys()) {
    if (MUNDOS.size <= MUNDOS_QUE_SE_RECUERDAN) break;
    MUNDOS.delete(vieja);
  }
  return mundo;
}

/** El mundo de una vista: el de su noche, o el de la reunión (ver arriba). */
function mundoDeLaVista(v: VistaDelQuiebro, codigo: string, despejadas: boolean): MundoDeLaLiza {
  if (v.noche === null || v.traza === null) {
    if (DE_LA_REUNION.mundo === null) DE_LA_REUNION.mundo = derivarElMundo(REUNION.traza, REUNION.codigo, 1, [PLAZA_DE_LA_PRIMERA_BAJADA], false);
    return DE_LA_REUNION.mundo;
  }
  return mundoDe(v.traza, codigo, v.noche.numero, v.noche.fallos, despejadas);
}

/* ─── EL PRODUCTOR ───────────────────────────────────────────────────────── */

/**
 * LA LIZA DE UNA MESA DE EL QUIEBRO. `null` si la vista no es de este juego o no se lee, si el código
 * no es un código, o si la vista nombra unas tablas que este binario no conoce. Nunca lanza.
 *
 * En la reunión no hay noche ni traza: el mundo es el de la reunión (ver `mundoDeLaVista`). En la mesa
 * cerrada, el de la última noche.
 */
export function lizaDelQuiebro(vista: unknown, codigo: string): LizaDeclarada | null {
  try {
    if (typeof codigo !== 'string' || !/^[A-Za-z0-9]{1,16}$/.test(codigo)) return null;
    const v = leerVistaDelQuiebro(vista);
    if (v === null) return null;
    const c = componerReglamento(v);
    if (c === null) return null;
    const asientos: ReglasDeAsiento[] = [];
    const enLaBajada = v.fase.tipo === 'bajada';
    for (let i = 0; i < v.asientos.length; i++) {
      asientos.push(reglasDeAsiento(c.asientos[i] as ReglasDelDesvelado, v.asientos[i] as AsientoDelQuiebro, c, enLaBajada));
    }
    const bajada = v.noche === null ? PLAZA_DE_LA_PRIMERA_BAJADA : bajadaDeLaNoche(v.noche);
    const menor = asientos.reduce((x, a) => (a.cuerpo.vidaTope < x ? a.cuerpo.vidaTope : x), Number.MAX_SAFE_INTEGER);
    return {
      version: VERSION_DE_LA_DECLARACION,
      mundo: mundoDeLaVista(v, codigo, c.plazaDespejada),
      fase: faseDe(v, c, codigo, bajada),
      asientos,
      estados: ESTADOS,
      clases: clasesDelSistema(c, bajada),
      proyectiles: [
        {
          id: PROYECTIL_DEL_QUIEBRO.bala,
          apuntarTics: c.enemigos.tirador.apuntarTics,
          balas: ENEMIGOS.tirador.bala.balas,
          cadaTics: ENEMIGOS.tirador.bala.cadaTics,
          velocidad: m(ENEMIGOS.tirador.bala.metrosPorSegundo),
          radio: m(ENEMIGOS.tirador.bala.radioMetros),
          alcance: m(ENEMIGOS.tirador.bala.alcanceMetros),
          efecto: efecto(c.enemigos.tirador.balaDano, c.enemigos.tirador.balaDano, 0, 0, puesta(E.tocado, ENEMIGOS.tirador.bala.tocadoTics), 0, SIN_CHOQUE, false),
        },
      ],
      turnos: {
        cuerpoACuerpo: TURNOS.cuerpoACuerpo,
        disparo: TURNOS.disparo,
        anunciosALaVez: TURNOS.anunciosALaVez,
        excluyen: [E.remanso, E.desconectado, E.reaparecido, E.vigia, E.ausente],
        alargarConLaRed: true,
        repetirTrasTics: c.repetirTrasTics,
      },
      portables: [
        {
          id: PORTABLE_ESQUIRLA,
          tope: ESQUIRLAS.tope,
          radioDeRecogida: m(ESQUIRLAS.recogidaMetros),
          montonTics: ESQUIRLAS.montonTics,
          pago: { tipo: 'triangular', porUnidad: PUNTOS.porEsquirla },
        },
      ],
      equipo: {
        recurso: v.monedas,
        caida: puesta(E.desconectado, CAIDA.desconectadoTics, CAIDA.desconectadoTics),
        reaparicion: {
          coste: 1,
          esperaTics: CAIDA.reaparece.esperaTics,
          vida: entre(c.aguanteAlReaparecer, 1, menor),
          puesta: puesta(E.reaparecido, CAIDA.reaparece.intocableTics, CAIDA.reaparece.intocableTics),
        },
      },
      sinCuerpo: { estado: E.vigia },
      presencia: { ausenteTrasTics: PRESENCIA.ausenteTrasTics, estadoAusente: E.ausente, veredictoTrasTics: PRESENCIA.veredictoTrasTics },
      avisos: {
        clases: [
          { id: AVISO_DEL_QUIEBRO.marcar, vidaTics: AVISOS.marcarTics, objetivo: 'entidad' },
          { id: AVISO_DEL_QUIEBRO.rescate, vidaTics: AVISOS.rescateTics, objetivo: 'asiento' },
          { id: AVISO_DEL_QUIEBRO.voy, vidaTics: AVISOS.voyTics, objetivo: 'ninguno' },
          { id: AVISO_DEL_QUIEBRO.desalojalo, vidaTics: AVISOS.desalojaloTics, objetivo: 'entidad' },
        ],
        cadaTics: AVISOS.cadaTics,
      },
      red: { compBaseMs: RED.compBaseMs, compTopeMs: RED.compTopeMs, esperaDeSitiosMs: RED.esperaDeSitiosMs },
      veredictos: { columnas: COLUMNAS_DE_LA_RONDA },
      aforo: AFORO_DEL_QUIEBRO,
    };
  } catch {
    return null;
  }
}
