/**
 * La generación de la trama de El Misterio de la Momia.
 *
 * El orden de las cosas aquí es lo que hace que la velada no pueda salir rota:
 *
 *   1. `cimientosDeMomia` compone con CÓDIGO una partida completa y jugable:
 *      orden verdadero, restricciones ya redactadas, falsas, reparto y dones.
 *   2. Se le pide al modelo el SABOR, y entre otras cosas la redacción de cada
 *      fragmento. Nunca la lógica.
 *   3. Cada frase que devuelve se vuelve a leer con código y solo sustituye a la
 *      del paso 1 si se puede verificar que dice lo mismo.
 *
 * Léase al revés: si la llamada al modelo falla, si el JSON viene truncado, si
 * el modelo se inventa la mitad de los ids o redacta mal las ocho frases, la
 * partida SIGUE siendo jugable y el puzle sigue teniendo una sola solución. La
 * generación con IA es una capa de mejora sobre algo que ya funciona, y no un
 * eslabón del que dependa la noche.
 *
 * Es exactamente lo contrario de lo que se hace en CLUEDO, donde el modelo
 * decide quién mató a quién. Ahí puede: cualquier asignación de culpable, arma y
 * sala es una partida válida. Aquí no: la inmensa mayoría de los conjuntos de
 * restricciones que se pueden escribir sobre cinco ritos no tienen solución
 * única, y elegir bien no es cuestión de talento narrativo.
 */
import type {
  GameSession,
  GenerateStreamEvent,
  Plot,
  PlotCharacter,
  PrintMaterial,
  TimelineEvent,
} from '../../../shared/types';
import type { Entidad } from '../../../shared/juegos/entidades';
import type { TramaMomia } from '../../../shared/juegos/momia-tipos';
/*
 * Se importa del ÍNDICE de juegos y no de 'entidades' a secas, y no da igual:
 * al cargar el índice se registran los manifiestos, y con ellos se anota dónde
 * vive cada categoría ('camaras' en rooms, 'ritos' en game.entidades). Yendo
 * directo al módulo de entidades esa anotación no ha ocurrido todavía y las
 * cámaras salen vacías.
 */
import { entidadesDe } from '../../../shared/juegos';
import { DEMO_MODE } from '../config';
import { getAnthropicClient, resolveModel } from '../agent/anthropic';
import { cimientosDeMomia } from './momia-cimientos';
import type { Cimientos, EntidadesDeMomia } from './momia-cimientos';
import { MOMIA_TRAMA_SCHEMA } from './momia-esquema';
import type { RespuestaMomia } from './momia-esquema';
import { SISTEMA_MOMIA, construirPromptMomia } from './momia-prompt';
import { respuestaDeDemostracion } from './momia-demo';
import {
  lexicoDeRitos,
  nombraAlSaqueador,
  senalaAlSaqueador,
  revelaElOrden,
  revisarRedaccion,
} from './momia-validacion';
import type { Incidencia } from './momia-validacion';
import { emisorDeProgreso } from '../live/proyeccion';
import { apuntarUso, volcarGasto } from '../gasto/contador';

type Emitir = (evento: GenerateStreamEvent) => void;

// ---------------------------------------------------------------------------
// El sabor, y por qué viaja pegado a la trama
// ---------------------------------------------------------------------------

/**
 * Lo que el modelo escribe y no cabe en `Plot`.
 *
 * `Plot` sabe de personajes, pistas y cronología porque eso lo tienen todos los
 * juegos. No sabe de invocaciones de rito, de inscripciones de dintel ni de por
 * qué a alguien le tocó el don de descifrar, y no debe saberlo: en cuanto el
 * contrato general aprende qué es un rito, ha dejado de ser general.
 *
 * Por eso el sabor propio de la Momia viaja dentro de `Plot.delJuego`, pegado al
 * `TramaMomia` que ya vive ahí. Quien lo lea como `TramaMomia` —el motor— lo ve
 * igual que antes: los campos de más le sobran y los ignora. Quien necesite el
 * sabor —los imprimibles y la app— usa `saborDe()`.
 */
export interface SaborMomia {
  faraon: { nombre: string; descripcion: string };
  /** Por `suspectId`: por qué en la ficción le tocó su don. */
  elDon: Record<string, string>;
  /** Por id de rito. */
  ritos: Record<string, { invocacion: string; gesto: string }>;
  /** Por id de cámara. */
  inscripciones: Record<string, string>;
}

/** `TramaMomia` más lo que escribe el modelo. Es lo que va en `Plot.delJuego`. */
export type TramaMomiaConSabor = TramaMomia & {
  sabor: SaborMomia;
  /**
   * Qué hubo que corregirle a lo que escribió el modelo.
   *
   * SE GUARDA, NO SE IMPRIME EN LA CONSOLA. Estaba solo en un `console.warn` del
   * servidor: quien monta la partida nunca lo veía, aunque el comentario del
   * propio fichero prometía que se pintaba en el informe del papiro. Y es
   * justamente lo que quien dirige querría saber antes de sentar a ocho
   * personas: qué frases hubo que sustituir y por qué.
   */
  revision?: { incidencias: Incidencia[]; aceptadas: number; total: number };
};

/** El sabor de una trama ya generada, o undefined si esta partida no es la Momia. */
export function saborDe(plot: Plot | undefined): SaborMomia | undefined {
  const del = plot?.delJuego as Partial<TramaMomiaConSabor> | undefined;
  return del && typeof del === 'object' && del.sabor ? del.sabor : undefined;
}

/** La trama propia de la Momia, o undefined. */
export function tramaDe(plot: Plot | undefined): TramaMomia | undefined {
  const del = plot?.delJuego as Partial<TramaMomia> | undefined;
  return del && Array.isArray(del.ordenVerdadero) ? (del as TramaMomia) : undefined;
}

// ---------------------------------------------------------------------------
// Las entidades de la partida
// ---------------------------------------------------------------------------

/** Las cuatro categorías de la Momia, resueltas por el puente de entidades. */
export function entidadesDeLaMomia(game: GameSession): EntidadesDeMomia {
  return {
    expedicionarios: entidadesDe(game, 'expedicionarios'),
    camaras: entidadesDe(game, 'camaras'),
    reliquias: entidadesDe(game, 'reliquias'),
    ritos: entidadesDe(game, 'ritos'),
  };
}

// ---------------------------------------------------------------------------
// El ensamblaje: la parte pura, la que se puede verificar sin gastar tokens
// ---------------------------------------------------------------------------

export interface TramaEnsamblada {
  plot: Plot;
  cimientos: Cimientos;
  incidencias: Incidencia[];
  /** Cuántas frases del modelo se aceptaron, de cuántas se le pidieron. */
  redaccion: { aceptadas: number; total: number };
}

/**
 * Recambio para una casilla que es un OFICIO, no un párrafo.
 *
 * Poner ahí el recambio narrativo largo convertía la sustitución en un
 * marcador: en la tabla «quiénes van», cinco personas aparecían con una frase
 * de novela en la casilla del oficio y el saqueador con «guardián de la
 * concesión» — el único con pinta normal. Un filtro que señala a quien no filtró
 * es peor que no filtrar.
 */
const RECAMBIO_OFICIO = 'miembro de la expedición';

/** Un texto de recambio cuando el modelo escribe algo que no puede salir a la mesa. */
const RECAMBIO_PUBLICO =
  'La expedición no se pone de acuerdo en lo que pasó aquella noche, y lo que se cuenta cambia según quién lo cuente.';

/**
 * Convierte la respuesta del modelo en un `Plot`, validando por el camino.
 *
 * Función PURA: no llama a nadie y no depende del reloj salvo por la marca de
 * `generatedAt`. Eso es lo que permite que `verificar-momia-trama.ts` la someta
 * a doscientas respuestas estropeadas a propósito sin tocar la red.
 */
export function ensamblarTramaMomia(
  game: GameSession,
  entidades: EntidadesDeMomia,
  cimientos: Cimientos,
  respuesta: RespuestaMomia,
): TramaEnsamblada {
  const incidencias: Incidencia[] = [];
  const { trama } = cimientos;
  const lexico = lexicoDeRitos(entidades.ritos.map((r) => ({ id: r.id, name: r.name })));

  // ---- 1. La redacción de los fragmentos ----------------------------------
  /*
   * Verdaderos y falsos en una sola tanda, como se le pidieron. Se separan
   * después por posición, que es el único sitio donde el código sabe cuál es
   * cuál: el modelo nunca lo ha sabido.
   */
  const pedidas = [...trama.restricciones, ...trama.falsasCandidatas];
  const escritas = new Map<string, string>();
  for (const f of respuesta.fragmentos ?? []) {
    if (f && typeof f.id === 'string' && typeof f.texto === 'string') escritas.set(f.id, f.texto);
  }
  const revisadas = revisarRedaccion(pedidas, escritas, lexico, 'fragmento');
  incidencias.push(...revisadas.incidencias);

  const tramaFinal: TramaMomia = {
    ...trama,
    restricciones: revisadas.fragmentos.slice(0, trama.restricciones.length),
    falsasCandidatas: revisadas.fragmentos.slice(trama.restricciones.length),
  };

  // ---- 2. Quién rompió el sello -------------------------------------------
  const idsExpedicion = new Set(entidades.expedicionarios.map((e) => e.id));
  let saqueadorId = respuesta.saqueadorId;
  if (!saqueadorId || !idsExpedicion.has(saqueadorId)) {
    saqueadorId = entidades.expedicionarios[0]?.id ?? '';
    incidencias.push({
      donde: 'saqueadorId',
      arreglo: 'sustituida',
      motivo: `el modelo señaló a alguien que no está en la expedición; se ha asignado a «${
        entidades.expedicionarios[0]?.name ?? 'nadie'
      }»`,
    });
  }
  const saqueador = entidades.expedicionarios.find((e) => e.id === saqueadorId);

  // ---- 3. Un dosier por persona, ni más ni menos ---------------------------
  const escritos = new Map<string, RespuestaMomia['expedicionarios'][number]>();
  for (const p of respuesta.expedicionarios ?? []) {
    if (p && typeof p.suspectId === 'string' && idsExpedicion.has(p.suspectId) && !escritos.has(p.suspectId)) {
      escritos.set(p.suspectId, p);
    }
  }
  const characters: PlotCharacter[] = entidades.expedicionarios.map((persona) => {
    const escrito = escritos.get(persona.id);
    if (!escrito) {
      incidencias.push({
        donde: `dosier de ${persona.name}`,
        arreglo: 'sustituida',
        motivo: 'el modelo no escribió su papel; se ha rellenado con un dosier mínimo',
      });
      return dosierMinimo(persona);
    }
    return {
      suspectId: persona.id,
      characterName: escrito.characterName?.trim() || persona.name,
      role: escrito.role?.trim() || 'miembro de la expedición',
      publicPersona: escrito.publicPersona ?? '',
      secret: escrito.secret ?? '',
      motive: escrito.motive ?? '',
      alibi: escrito.alibi ?? '',
      knowledge: Array.isArray(escrito.knowledge) ? escrito.knowledge.filter((k) => typeof k === 'string') : [],
      personalHook: escrito.personalHook ?? '',
    };
  });

  // ---- 4. La regla de oro sobre todo lo que se lee en público --------------
  /*
   * Dos cosas no pueden salir de aquí: el orden verdadero enumerado de corrido y
   * el nombre de quien rompió el sello. La primera acaba la partida en la
   * primera vigilia; la segunda, antes de empezar. Se comprueban sobre CADA
   * texto que va a leerse en voz alta o a imprimirse en el dosier de todos.
   */
  const nombresDelSaqueador = [saqueador?.name ?? '', characters.find((c) => c.suspectId === saqueadorId)?.characterName ?? ''].filter(Boolean);

  const depurar = (
    texto: string,
    donde: string,
    tambienElNombre: boolean,
    recambio: string = RECAMBIO_PUBLICO,
  ): string => {
    const salida = texto ?? '';
    if (revelaElOrden(salida, lexico, trama.ordenVerdadero)) {
      incidencias.push({ donde, arreglo: 'sustituida', motivo: 'enumeraba los cinco ritos en el orden verdadero' });
      return recambio;
    }
    if (tambienElNombre && nombresDelSaqueador.length && nombraAlSaqueador(salida, nombresDelSaqueador)) {
      incidencias.push({ donde, arreglo: 'sustituida', motivo: 'nombraba a quien rompió el sello' });
      return recambio;
    }
    /*
     * Y EL SEÑALAMIENTO, SIEMPRE, aunque no toque el chequeo del nombre.
     *
     * Los dos no son lo mismo. `nombraAlSaqueador` prohíbe que aparezca el
     * nombre, y eso solo vale donde el saqueador no debe salir en absoluto —la
     * sinopsis, el lema, una narración—. En la presentación de alguien o en un
     * momento público los nombres salen con toda naturalidad, el suyo incluido,
     * y prohibirlos dejaría los dosieres llenos de agujeros.
     *
     * Lo que no puede salir NUNCA, ni ahí, es «todo el mundo comenta que Fabio
     * rompió el sello aquella noche»: nombre y acusación en la misma frase. Eso
     * es lo que mira `senalaAlSaqueador`, y es lo que estaba imprimiéndose en la
     * hoja de las otras cinco personas.
     */
    if (nombresDelSaqueador.length && senalaAlSaqueador(salida, nombresDelSaqueador)) {
      incidencias.push({ donde, arreglo: 'sustituida', motivo: 'señalaba a quien rompió el sello' });
      return recambio;
    }
    return salida;
  };

  /*
   * LOS DOS CAMPOS DEL DOSIER QUE LEE TODO EL MUNDO.
   *
   * `role` y `publicPersona` de cada persona se imprimen en la hoja de TODAS
   * las demás, y no pasaban por aquí: el modelo podía escribir en la
   * presentación pública de alguien los cinco ritos enumerados en el orden
   * bueno, y la partida se acababa en la portada del dosier. Lo pedía el prompt
   * y no lo comprobaba nadie, que es lo contrario de lo que hace este fichero
   * con todo lo demás.
   *
   * SOLO CONTRA EL ORDEN, y esto es lo delicado: el chequeo del nombre es una
   * coincidencia de palabras, y en la presentación de alguien su propio nombre
   * —o el de un compañero, aunque sea el saqueador— aparece con toda
   * naturalidad. Aplicarlo aquí borraría textos legítimos a puñados. Que la
   * expedición hable del saqueador no revela nada: lo que lo revelaría es que
   * un texto público enumere el orden verdadero, y eso no tiene ni un uso
   * legítimo.
   *
   * Lo privado —`secret`, `motive`, `alibi`, `personalHook`— NO se toca: el
   * dosier del saqueador tiene que poder decirle que fue él.
   */
  for (const personaje of characters) {
    personaje.role = depurar(
      personaje.role,
      `papel de ${personaje.characterName}`,
      false,
      RECAMBIO_OFICIO,
    );
    personaje.publicPersona = depurar(
      personaje.publicPersona,
      `presentación pública de ${personaje.characterName}`,
      false,
    );
  }

  const synopsis = depurar(respuesta.synopsis ?? '', 'sinopsis', true);
  const ambientacion = depurar(respuesta.ambientacion ?? '', 'ambientación', true);

  const vigilias = (respuesta.vigilias ?? [])
    .filter((v) => v && typeof v.texto === 'string')
    .map((v) => ({ ...v, ronda: Math.min(Math.max(Math.round(v.ronda) || 1, 1), trama.profanadas.length) }))
    .sort((a, b) => a.ronda - b.ronda);

  const narrations: PrintMaterial['narrations'] = [
    /*
     * La vigilia 0 no se le pide al modelo: se compone con lo que ya escribió
     * sobre la noche del sello. Es lo que quien dirige lee ANTES de empezar, y
     * pedirlo aparte solo habría añadido una entrada más al esquema para decir
     * lo mismo dos veces.
     */
    {
      round: 0,
      title: 'La noche en que se rompió el sello',
      text: depurar(respuesta.tumba?.laNocheDelSello ?? '', 'apertura', true),
      stageDirection: 'Léela con todos sentados, antes de repartir nada.',
    },
    ...vigilias.map((v) => ({
      round: v.ronda,
      title: v.titulo?.trim() || `Vigilia ${v.ronda}`,
      text: depurar(v.texto, `narración de la vigilia ${v.ronda}`, true),
      stageDirection: v.indicacion ?? '',
    })),
  ];

  // Aviso, no arreglo: la cámara profanada la anuncia la guía de todas formas,
  // así que una narración que se olvide de nombrarla afea la noche pero no la
  // rompe. Corregirlo a martillazos daría una frase pegada que suena a error.
  trama.profanadas.forEach((camaraId, i) => {
    const camara = entidades.camaras.find((c) => c.id === camaraId);
    const narracion = narrations.find((n) => n.round === i + 1);
    if (camara && narracion && !narracion.text.toLocaleLowerCase('es').includes(camara.name.toLocaleLowerCase('es'))) {
      incidencias.push({
        donde: `narración de la vigilia ${i + 1}`,
        arreglo: 'aviso',
        motivo: `no nombra «${camara.name}», que es la cámara profanada esa noche`,
      });
    }
  });

  // ---- 5. La cronología ----------------------------------------------------
  const timeline: TimelineEvent[] = (respuesta.cronologia ?? [])
    .filter((e) => e && typeof e.descripcion === 'string' && e.descripcion.trim())
    .map((e) => {
      const suspectIds = (e.expedicionarioIds ?? []).filter((id) => idsExpedicion.has(id));
      /*
       * Un momento con una sola persona NUNCA es público. Los públicos se
       * imprimen en el dosier de todo el mundo, así que «a la una bajó Fulano
       * con la lámpara» marcado como público es la partida entera resuelta en la
       * portada. Es la misma regla que en CLUEDO, y aquí se aplica con código en
       * vez de confiar en que el modelo la respete.
       */
      const publico = e.publico === true && suspectIds.length > 1;
      if (e.publico === true && !publico) {
        incidencias.push({
          donde: `cronología ${e.hora ?? ''}`,
          arreglo: 'sustituida',
          motivo: 'venía marcado como público con una sola persona implicada; pasa a secreto',
        });
      }
      /*
       * Lo público de la cronología viaja al MÓVIL DE TODOS —`live/proyeccion.ts`
       * la manda entera— y se imprime. No pasaba por el depurador, así que un
       * momento público que enumerase los cinco ritos en orden resolvía la
       * partida sin que nadie explorara nada.
       *
       * Otra vez solo contra el orden: los momentos públicos son de DOS O MÁS
       * personas por construcción, así que sus nombres salen ahí, y el del
       * saqueador entre ellos. Eso es el juego, no una filtración.
       */
      const descripcion = publico
        ? depurar(e.descripcion.trim(), `cronología ${e.hora ?? ''}`, false)
        : e.descripcion.trim();

      return {
        time: e.hora?.trim() || '00:00',
        description: descripcion,
        suspectIds,
        isPublic: publico,
      };
    });

  // ---- 6. El sabor ---------------------------------------------------------
  const sabor: SaborMomia = {
    faraon: {
      nombre: respuesta.faraon?.nombre?.trim() || 'el difunto',
      descripcion: depurar(respuesta.faraon?.descripcion ?? '', 'el faraón', false),
    },
    elDon: Object.fromEntries(
      entidades.expedicionarios.map((p) => [p.id, escritos.get(p.id)?.elDon?.trim() ?? '']),
    ),
    ritos: Object.fromEntries(
      entidades.ritos.map((rito) => {
        const escrito = (respuesta.ritos ?? []).find((r) => r?.ritoId === rito.id);
        return [rito.id, { invocacion: escrito?.invocacion ?? '', gesto: escrito?.gesto ?? '' }];
      }),
    ),
    inscripciones: Object.fromEntries(
      entidades.camaras.map((camara) => {
        const escrito = (respuesta.camaras ?? []).find((c) => c?.camaraId === camara.id);
        return [camara.id, depurar(escrito?.inscripcion ?? '', `inscripción de ${camara.name}`, false)];
      }),
    ),
  };

  // ---- 7. El Plot ----------------------------------------------------------
  const material: PrintMaterial = {
    narrations,
    /*
     * Sin giros y sin revelaciones de cronología, y no por falta de tiempo. En
     * CLUEDO los giros existen porque a mitad de velada ya se han dicho todas
     * las coartadas y la partida se estanca. Aquí no se estanca: cada vigilia
     * reparte fragmentos nuevos y el saqueador puede publicar una mentira. El
     * motor del segundo acto ya está dentro del juego.
     */
    twists: [],
    timelineReveals: [],
    hints: (respuesta.ayudas ?? [])
      .filter((a) => a && typeof a.texto === 'string' && a.texto.trim())
      .map((a) => ({ level: Math.min(Math.max(Math.round(a.nivel) || 1, 1), 3), text: depurar(a.texto, `ayuda ${a.nivel}`, true) }))
      .sort((a, b) => a.level - b.level),
    finale: {
      // Aquí SÍ se cuenta todo: es lo que se lee al abrir el papiro del sellado.
      reconstruction: respuesta.desenlace?.reconstruccion ?? '',
      confession: respuesta.desenlace?.confesion ?? '',
      epilogue: respuesta.desenlace?.epilogo ?? '',
    },
    generatedAt: new Date().toISOString(),
  };

  const delJuego: TramaMomiaConSabor = { ...tramaFinal, sabor };

  const plot: Plot = {
    title: respuesta.title?.trim() || game.name,
    /*
     * EL LEMA ES LA LÍNEA QUE MÁS SE DIFUNDE DE TODO EL JUEGO, y no pasaba por
     * ningún filtro. Va a la portada de cinco imprimibles —incluidos los
     * carteles que se pegan en las puertas, que ve la casa entera— y al móvil de
     * todo el mundo como `sesion.lema`. Es un canal peor que el dosier: aquel
     * hay que abrirlo, y este está en la pared.
     *
     * Con el chequeo del nombre puesto, como la sinopsis: aquí el saqueador no
     * pinta nada, ni nombrado ni señalado.
     */
    tagline: depurar(
      respuesta.tagline?.trim() || 'El sello está roto. Alguien de la expedición lo quiso así.',
      'lema',
      true,
    ),
    synopsis,
    // El «muerto» de esta velada es el faraón: es de quien va el caso, es quien
    // aparece en la portada de los dosieres y es a quien se le debe el sellado.
    victim: { name: sabor.faraon.nombre, description: sabor.faraon.descripcion },
    setting: ambientacion,
    solution: {
      respuestas: { saqueador: saqueadorId },
      motive: respuesta.motivoDelSaqueo ?? '',
      howItHappened: respuesta.comoOcurrio ?? '',
    },
    characters,
    timeline,
    /*
     * SIN PISTAS, Y ES DELIBERADO. Un fragmento de papiro se parece a una pista
     * —aparece en una cámara, en una vigilia— pero no lo es: es una pieza de un
     * puzle lógico, algunas son MENTIRA, y quién se lleva cuál lo decide el
     * reductor del juego. Metidas en `clues` viajarían por la proyección
     * genérica de CLUEDO, que reparte por sala y no sabe de fragmentos falsos:
     * el móvil recibiría las mentiras marcadas como pistas del caso. Viven en
     * `delJuego`, que es de quien sabe leerlas.
     */
    clues: [],
    /*
     * EL GUION TAMBIÉN PASA POR EL FILTRO, y era el único texto de la trama que
     * no lo hacía.
     *
     * Se imprime entero en la Guía de la expedición, que es la hoja que se
     * maneja toda la noche delante de la mesa y que, con el Game Master
     * jugando, lee alguien que también juega. Un paso del guion que dijera «a la
     * tercera vigilia recuérdales que el agua va antes que el nombre», o que
     * nombrara a quien rompió el sello, salía impreso sin que nadie lo mirara.
     */
    gmScript: (respuesta.guion ?? [])
      .filter((p) => typeof p === 'string' && p.trim())
      .map((paso) => depurar(paso, 'guion', true)),
    material,
    delJuego,
  };

  return {
    plot,
    cimientos,
    incidencias,
    redaccion: { aceptadas: revisadas.aceptadas, total: pedidas.length },
  };
}

/** El dosier que se escribe cuando el modelo se deja a alguien. Feo, pero jugable. */
function dosierMinimo(persona: Entidad): PlotCharacter {
  return {
    suspectId: persona.id,
    characterName: persona.name,
    role: 'miembro de la expedición',
    publicPersona: 'Llegó con la misión y ha estado en todas las cámaras que se han abierto.',
    secret: 'Callas algo de aquella noche que todavía no has sabido cómo contar.',
    motive: 'Si la tumba no se sella, la concesión sigue viva otra temporada.',
    alibi: 'Dices que estabas en el corredor cuando se apagó la lámpara.',
    knowledge: [],
    personalHook: 'Su papel se ha quedado sin escribir: improvisa con lo que sepas de la persona.',
  };
}

// ---------------------------------------------------------------------------
// La llamada
// ---------------------------------------------------------------------------

/** Pide la trama al modelo y la ensambla. En modo demo, sin salir a la red. */
export async function generarTramaMomia(game: GameSession, emit: Emitir): Promise<Plot> {
  const entidades = entidadesDeLaMomia(game);
  const cimientos = cimientosDeMomia(entidades, { semilla: game.id });

  const respuesta = DEMO_MODE
    ? await respuestaDemo(game, entidades, cimientos, emit)
    : await respuestaConApi(game, entidades, cimientos, emit);

  const ensamblada = ensamblarTramaMomia(game, entidades, cimientos, respuesta);

  /*
   * Las incidencias se cuentan por consola y se pintan en el «informe del
   * papiro». No abortan: cada una tiene su arreglo aplicado, y lo que queda es
   * una partida jugable con alguna frase menos brillante.
   */
  if (ensamblada.incidencias.length > 0) {
    console.warn(
      `[momia] ${ensamblada.incidencias.length} incidencias al validar la trama:`,
      ensamblada.incidencias.map((i) => `${i.donde}: ${i.motivo}`).join(' · '),
    );
  }
  console.log(
    `[momia] redacción del modelo aceptada en ${ensamblada.redaccion.aceptadas} de ${ensamblada.redaccion.total} fragmentos`,
  );

  /*
   * Y SE GUARDA CON LA TRAMA, que es lo que el comentario de arriba llevaba
   * prometiendo desde el principio: «se pintan en el informe del papiro». No se
   * pintaban en ninguna parte — morían en la consola del servidor, donde no
   * mira nadie. Quien monta la partida querría saber, antes de sentar a ocho
   * personas, qué frases hubo que sustituirle al modelo y por qué.
   */
  const conRevision = ensamblada.plot.delJuego as TramaMomiaConSabor | undefined;
  if (conRevision) {
    conRevision.revision = {
      incidencias: ensamblada.incidencias,
      aceptadas: ensamblada.redaccion.aceptadas,
      total: ensamblada.redaccion.total,
    };
  }

  return ensamblada.plot;
}

/**
 * Las piezas GRANDES que tienen que venir escritas, y cuáles no han venido.
 *
 * Esto no es la validación: de eso se encarga `ensamblarTramaMomia`, que sabe
 * arreglar lo que llega mal y tiene un recambio para cada hueco. La pregunta
 * aquí es otra —¿merece la pena pagar una segunda llamada?— y por eso solo mira
 * lo gordo. A una respuesta le pueden faltar tres frases y ensamblarse
 * perfectamente; lo que no se puede dar por bueno es que falte la expedición
 * entera.
 *
 * Y pasa. Midiéndolo contra la API de verdad, de cuatro generaciones dos
 * salieron impecables, una devolvió los seis dosieres con `suspectId` que no
 * casaban con ninguna persona real —o sea, seis dosieres mínimos y una velada
 * sin papeles— y otra cerró el JSON con casi todos los arrays vacíos. Las dos
 * veces la partida se guardaba como lista y el fallo solo se veía al imprimir.
 */
export function loQueFalta(
  respuesta: RespuestaMomia,
  entidades: EntidadesDeMomia,
  cimientos: Cimientos,
): string[] {
  const faltan: string[] = [];

  const ids = new Set(entidades.expedicionarios.map((e) => e.id));
  const dosieres = (respuesta.expedicionarios ?? []).filter(
    (p) => p && typeof p.suspectId === 'string' && ids.has(p.suspectId),
  ).length;
  // La mitad, y no «alguno»: que se deje a una persona lo arregla el dosier
  // mínimo sin que se note; que se deje a la mesa entera, no.
  if (dosieres * 2 < ids.size) faltan.push(`los dosieres (${dosieres} de ${ids.size})`);

  const pedidos = new Set(
    [...cimientos.trama.restricciones, ...cimientos.trama.falsasCandidatas].map((f) => f.id),
  );
  const redactados = (respuesta.fragmentos ?? []).filter(
    (f) => f && typeof f.id === 'string' && pedidos.has(f.id) && (f.texto ?? '').trim(),
  ).length;
  if (redactados * 2 < pedidos.size) faltan.push(`los fragmentos (${redactados} de ${pedidos.size})`);

  if ((respuesta.vigilias ?? []).length === 0) faltan.push('las vigilias');
  if ((respuesta.cronologia ?? []).length === 0) faltan.push('la cronología');
  if ((respuesta.ayudas ?? []).length === 0) faltan.push('las ayudas');
  if ((respuesta.guion ?? []).length === 0) faltan.push('el guion');

  return faltan;
}

/** Una tirada: se le pide la trama al modelo y se devuelve tal cual la escribió. */
async function unaTirada(
  client: NonNullable<ReturnType<typeof getAnthropicClient>>,
  model: Awaited<ReturnType<typeof resolveModel>>,
  game: GameSession,
  entidades: EntidadesDeMomia,
  cimientos: Cimientos,
  emit: Emitir,
): Promise<RespuestaMomia> {
  const stream = client.messages.stream({
    model,
    max_tokens: 64000,
    system: [{ type: 'text', text: SISTEMA_MOMIA, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: MOMIA_TRAMA_SCHEMA } },
    messages: [{ role: 'user', content: construirPromptMomia(game, cimientos.trama, entidades) }],
  });

  stream.on('text', emisorDeProgreso(game, emit));
  const mensaje = await stream.finalMessage();
  // Lo que ha costado esta llamada. No puede tumbar la generacion.
  apuntarUso({ concepto: 'trama', model, usage: mensaje.usage, gameId: game.id });

  if (mensaje.stop_reason === 'refusal') {
    throw new Error(
      'El modelo declinó escribir esta expedición. Revisa las descripciones introducidas e inténtalo de nuevo.',
    );
  }
  if (mensaje.stop_reason === 'max_tokens') {
    throw new Error(
      'La trama superó el límite de tokens y quedó incompleta. Reduce la cantidad de datos e inténtalo de nuevo.',
    );
  }

  let texto = '';
  for (const bloque of mensaje.content) {
    if (bloque.type === 'text') texto += bloque.text;
  }
  try {
    return JSON.parse(texto) as RespuestaMomia;
  } catch {
    throw new Error('La respuesta del modelo no es un JSON válido. Vuelve a intentar la generación.');
  }
}

/**
 * Le pide la trama al modelo, y se la vuelve a pedir UNA vez si viene coja.
 *
 * Una sola repetición, y solo cuando falta algo grande: la segunda llamada
 * cuesta lo mismo que la primera y tarda otros cuatro o cinco minutos, así que
 * no se paga por unas frases sueltas. Si las dos vienen cojas se ensambla la
 * que menos cojea —dos tramas a medias no se pueden coser en una, y quedarse
 * con la segunda por ser la última sería tirar la mejor.
 */
async function respuestaConApi(
  game: GameSession,
  entidades: EntidadesDeMomia,
  cimientos: Cimientos,
  emit: Emitir,
): Promise<RespuestaMomia> {
  const client = getAnthropicClient();
  if (!client) return respuestaDemo(game, entidades, cimientos, emit);

  const model = await resolveModel(game);

  const primera = await unaTirada(client, model, game, entidades, cimientos, emit);
  const faltan = loQueFalta(primera, entidades, cimientos);
  if (faltan.length === 0) return primera;

  console.warn(`[momia] la primera escritura vino sin ${faltan.join(', ')}; se pide otra`);
  emit({
    type: 'text',
    delta: `

[La primera escritura vino sin ${faltan.join(', ')}. Pidiendo otra…]

`,
  });

  /*
   * Y SI LA SEGUNDA REVIENTA, NOS QUEDAMOS CON LA PRIMERA.
   *
   * Una trama coja se ensambla —para eso están los recambios— y una excepción
   * deja la partida en `draft` sin nada. Sería absurdo tirar lo que ya tenemos
   * porque el intento de mejorarlo se topó con un rechazo o con un corte de
   * red: el reintento está para ganar, no para poder perder.
   */
  let segunda: RespuestaMomia;
  try {
    segunda = await unaTirada(client, model, game, entidades, cimientos, emit);
  } catch (error) {
    console.warn('[momia] la segunda escritura falló; se ensambla la primera:', error);
    return primera;
  }

  const faltanTambien = loQueFalta(segunda, entidades, cimientos);
  if (faltanTambien.length === 0) return segunda;

  console.warn(`[momia] la segunda escritura vino sin ${faltanTambien.join(', ')}`);
  return faltanTambien.length < faltan.length ? segunda : primera;
}

async function respuestaDemo(
  game: GameSession,
  entidades: EntidadesDeMomia,
  cimientos: Cimientos,
  emit: Emitir,
): Promise<RespuestaMomia> {
  for (const paso of [
    'Descifrando el sello de la cámara…',
    'Repartiendo dones entre la expedición…',
    'Recomponiendo los fragmentos del papiro…',
    'Anotando lo que nadie confesará esta noche…',
  ]) {
    emit({ type: 'text', delta: `${paso}\n` });
    await new Promise((r) => setTimeout(r, 160));
  }
  return respuestaDeDemostracion(game.name, entidades, cimientos.trama);
}
