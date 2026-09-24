/**
 * EL PRODUCTOR DE LA LIZA DE EL QUIEBRO: de la vista pública de una mesa y su código, la
 * `LizaDeclarada` que la sala del servidor arbitra y que el aparato predice.
 *
 * ═══ UNA FUNCIÓN PURA, Y LA MISMA EN LOS DOS LADOS ═══
 *
 * La sala la llama cuando sube la revisión de la mesa (`mirar(codigo, null)`, la vista del
 * espectador, que en este juego es la de todos); el aparato, con la vista que le llega por el
 * sondeo. Con lo mismo, lo mismo: el barrio sale de (código, noche) con `barrioDeLaNoche`, los
 * números de cada asiento de `componerReglamento`, y nada más entra. Si el aparato derivara su
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
  PuestaDeEstado,
  ReglasDeAsiento,
} from '../../mecanicas/liza/declaracion';
import { semillaDelCodigo } from '../../mecanicas/semilla';
import { CLASE_DE_ZONA_EN_LA_LIZA, ID_DE_LIMITE_EN_LA_LIZA, barrioDeLaNoche, despejarLaPlaza, mundoDeLaLizaDelBarrio } from './quiebro-barrio';
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
import type { GolpeCompuesto, GrupoDeLaNoche, ReglamentoCompuesto, ReglasDelDesvelado } from './quiebro-reglas';
import { COLUMNAS_DE_LA_RONDA, ESQUIRLAS_COMO_MUCHO, PORTABLE_ESQUIRLA, leerVistaDelQuiebro } from './quiebro-vista';
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
function clasesDelSistema(c: ReglamentoCompuesto): ClaseDeEntidad[] {
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
      claseDeZona: CLASE_DE_ZONA_EN_LA_LIZA.aparicion,
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

function grupoDeLaLiza(g: GrupoDeLaNoche): GrupoDeclarado {
  return {
    clase: CLASE_DEL_QUIEBRO[g.clase],
    cuantos: g.cuantos,
    vivasALaVez: g.vivas,
    claseDeZona: CLASE_DE_ZONA_EN_LA_LIZA[g.zona],
    desdeTic: g.desdeTic,
    cadaTics: g.cadaTics,
    eleccion: g.eleccion,
  };
}

/**
 * EL ENCUENTRO DE UNA FASE DE COMBATE, o `null`. La oleada acaba al vaciarse (con su reloj de 150 s,
 * que la deja aguantada); la Llamada, por la cabina que suena: se gana si sale al menos la mitad de
 * los presentes, redondeando hacia arriba (§4.11).
 */
function encuentroDe(v: VistaDelQuiebro, c: ReglamentoCompuesto, presentes: number): EncuentroDeclarado | null {
  const numero = v.noche === null ? 0 : v.noche.numero;
  const ronda = rondaDeLaFase(numero, v.fase);
  if (ronda === null || v.noche === null) return null;
  const asientos = v.asientos.length;
  if (v.fase.tipo === 'oleada') {
    const o = encuentroDeLaOleada(v.fase.oleada, v.noche.receta, c.nivelDelSistema, c.contramedida, asientos);
    return { ronda, presentes, relojTics: OLEADA_TICS, vivasALaVez: o.vivas, grupos: o.grupos.map(grupoDeLaLiza), fin: { tipo: 'vaciar' } };
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
    grupos: l.grupos.map(grupoDeLaLiza),
    fin: {
      tipo: 'salida',
      zona: {
        claseDeZona: CLASE_DE_ZONA_EN_LA_LIZA.cabina,
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
  };
}

function faseDe(v: VistaDelQuiebro, c: ReglamentoCompuesto, codigo: string): FaseDeLaLiza {
  const presentes = entre(presentesDeLaMesa(v.asientos), 1, v.asientos.length);
  const clave = claveDeLaFase(v);
  return {
    clave,
    modo: modoDeLaFase(v.fase),
    limite: ID_DE_LIMITE_EN_LA_LIZA[limiteDeLaFase(v.fase, presentes)],
    semilla: semillaDelCodigo(`${codigo}#${clave}`) >>> 0,
    reloj: v.reloj === null ? null : { id: v.reloj.id, duraMs: v.reloj.duraMs },
    encuentro: modoDeLaFase(v.fase) === 'encuentro' ? encuentroDe(v, c, presentes) : null,
  };
}

/* ─── EL MUNDO, CON SU MEMORIA PEQUEÑA ───────────────────────────────────── */

/**
 * Los últimos mundos derivados. Derivar un barrio cuesta unos 3 ms y la vista de una mesa cambia con
 * cada voto de la pausa sin cambiar de noche: la sala y el aparato piden el mismo mundo muchas veces
 * seguidas. El resultado es el mismo con o sin esto (se guarda por lo único de lo que depende).
 */
const MUNDOS = new Map<string, MundoDeLaLiza>();
const MUNDOS_QUE_SE_RECUERDAN = 4;

function mundoDe(codigo: string, noche: number, despejada: boolean): MundoDeLaLiza {
  const llave = `${codigo.toUpperCase()}#${String(noche)}#${despejada ? 'd' : 'p'}`;
  const hecho = MUNDOS.get(llave);
  if (hecho !== undefined) return hecho;
  const barrio = barrioDeLaNoche(codigo, noche);
  const mundo = mundoDeLaLizaDelBarrio(despejada ? despejarLaPlaza(barrio) : barrio);
  if (MUNDOS.size >= MUNDOS_QUE_SE_RECUERDAN) {
    const primera = MUNDOS.keys().next();
    if (primera.done !== true) MUNDOS.delete(primera.value);
  }
  MUNDOS.set(llave, mundo);
  return mundo;
}

/* ─── EL PRODUCTOR ───────────────────────────────────────────────────────── */

/**
 * LA LIZA DE UNA MESA DE EL QUIEBRO. `null` si la vista no es de este juego o no se lee, si el código
 * no es un código, o si la vista nombra unas tablas que este binario no conoce. Nunca lanza.
 *
 * En la reunión no hay noche: el mundo es el de la noche 1, que es la que se va a jugar. En la mesa
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
    const noche = v.noche === null ? 1 : v.noche.numero;
    const menor = asientos.reduce((x, a) => (a.cuerpo.vidaTope < x ? a.cuerpo.vidaTope : x), Number.MAX_SAFE_INTEGER);
    return {
      version: VERSION_DE_LA_DECLARACION,
      mundo: mundoDe(codigo, noche, c.plazaDespejada),
      fase: faseDe(v, c, codigo),
      asientos,
      estados: ESTADOS,
      clases: clasesDelSistema(c),
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
