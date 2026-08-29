/**
 * La generación de la trama de El Paso de las Sombras.
 *
 * El orden de las cosas aquí es lo que hace que la noche no pueda salir rota:
 *
 *   1. `cimientosDeSombras` compone con CÓDIGO una partida completa y jugable:
 *      senda, hitos ya redactados, falsos, reparto, contraseñas y disfraces.
 *   2. Se le pide al modelo el SABOR, y entre otras cosas la redacción de cada
 *      hito. Nunca la lógica.
 *   3. Cada frase que devuelve se vuelve a leer con código y solo sustituye a la
 *      del paso 1 si se puede verificar que dice lo mismo.
 *
 * Léase al revés: si la llamada al modelo falla, si el JSON viene truncado, si
 * el modelo se inventa la mitad de los ids o redacta mal las nueve frases, la
 * partida SIGUE siendo jugable y el camino sigue teniendo una sola solución. La
 * generación con IA es una capa de mejora sobre algo que ya funciona, y no un
 * eslabón del que dependa la noche.
 *
 * Es exactamente lo contrario de lo que se hace en CLUEDO, donde el modelo
 * decide quién mató a quién. Ahí puede: cualquier asignación de culpable, arma y
 * sala es una partida válida. Aquí no: la inmensa mayoría de los conjuntos de
 * condiciones que se pueden escribir sobre seis pasos no tienen solución única,
 * y elegir bien no es cuestión de talento narrativo.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTA FUNCIÓN NO SE LLAMA `generarTramaSombras`
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Porque ese nombre ya es el de la trama SIN modelo (`juegos/sombras-trama.ts`),
 * y en la Momia las dos se llaman igual en módulos distintos. Funciona y se lee
 * fatal: en `pipeline.ts` aparece un `generarTramaMomia` importado y no hay
 * forma de saber cuál de los dos es sin abrir el import. Aquí la de con modelo
 * se llama `escribirTramaSombras`, que además es lo que hace: escribir encima de
 * algo que ya está montado.
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
import type { TramaSombras } from '../../../shared/juegos/sombras-tipos';
/*
 * Se importa del ÍNDICE de juegos y no de 'entidades' a secas, y no da igual: al
 * cargar el índice se registran los manifiestos, y con ellos se anota dónde vive
 * cada categoría (`pasos` en rooms, `estandartes` en game.entidades). Yendo
 * directo al módulo de entidades esa anotación no ha ocurrido todavía y los
 * pasos salen vacíos.
 */
import { entidadesDe } from '../../../shared/juegos';
import { DEMO_MODE } from '../config';
import { getAnthropicClient, resolveModel } from '../agent/anthropic';
import { cimientosDeSombras } from './sombras-cimientos';
import type { Cimientos, EntidadesDeSombras } from './sombras-cimientos';
import { SOMBRAS_TRAMA_SCHEMA } from './sombras-esquema';
import type { RespuestaSombras } from './sombras-esquema';
import { SISTEMA_SOMBRAS, construirPromptSombras } from './sombras-prompt';
import { respuestaDeDemostracion } from './sombras-demo';
import { pasoBatido } from '../juegos/sombras-trama';
import {
  anunciaEmboscada,
  lexicoDePasos,
  nombraAlKancho,
  revelaLaSenda,
  revelaLosCazadores,
  revisarRedaccion,
  senalaAlKancho,
} from './sombras-validacion';
import type { Incidencia } from './sombras-validacion';

type Emitir = (evento: GenerateStreamEvent) => void;

// ---------------------------------------------------------------------------
// El sabor, y por qué viaja pegado a la trama
// ---------------------------------------------------------------------------

/**
 * Lo que el modelo escribe y no cabe en `Plot`.
 *
 * `Plot` sabe de personajes, pistas y cronología porque eso lo tienen todos los
 * juegos. No sabe de inscripciones de mojón ni de por qué a alguien le tocó ir
 * de komusō, y no debe saberlo: en cuanto el contrato general aprende qué es un
 * disfraz de shinobi, ha dejado de ser general.
 *
 * Por eso el sabor propio viaja dentro de `Plot.delJuego`, pegado al
 * `TramaSombras` que ya vive ahí. Quien lo lea como `TramaSombras` —el motor— lo
 * ve igual que antes: los campos de más le sobran y los ignora. Quien necesite
 * el sabor —los imprimibles y la app— usa `saborDe()`.
 */
export interface SaborSombras {
  senor: { nombre: string; descripcion: string };
  /** Por `suspectId`: por qué en la ficción lleva su disfraz. */
  elDisfraz: Record<string, string>;
  /** Por id de paso: lo que hay tallado en su mojón de entrada. */
  inscripciones: Record<string, string>;
}

/** `TramaSombras` más lo que escribe el modelo. Es lo que va en `Plot.delJuego`. */
export type TramaSombrasConSabor = TramaSombras & {
  sabor: SaborSombras;
  /**
   * Qué hubo que corregirle a lo que escribió el modelo.
   *
   * SE GUARDA, NO SE IMPRIME EN LA CONSOLA. En la Momia esto vivió un tiempo
   * solo en un `console.warn` del servidor: quien montaba la partida nunca lo
   * veía, aunque el comentario del propio fichero prometía que se pintaba en el
   * informe. Y es justamente lo que querría saber antes de sentar a ocho
   * personas: qué frases hubo que sustituir y por qué.
   */
  revision?: { incidencias: Incidencia[]; aceptadas: number; total: number };
};

/** El sabor de una trama ya generada, o undefined si esta partida no es de este juego. */
export function saborDe(plot: Plot | undefined): SaborSombras | undefined {
  const del = plot?.delJuego as Partial<TramaSombrasConSabor> | undefined;
  return del && typeof del === 'object' && del.sabor ? del.sabor : undefined;
}

/** La revisión de lo que escribió el modelo, si la hay. */
export function revisionDe(plot: Plot | undefined): TramaSombrasConSabor['revision'] {
  const del = plot?.delJuego as Partial<TramaSombrasConSabor> | undefined;
  return del && typeof del === 'object' ? del.revision : undefined;
}

// ---------------------------------------------------------------------------
// Las entidades de la partida
// ---------------------------------------------------------------------------

/** Las cuatro categorías, resueltas por el puente de entidades. */
export function entidadesDeLasSombras(game: GameSession): EntidadesDeSombras {
  return {
    escoltas: entidadesDe(game, 'escoltas'),
    pasos: entidadesDe(game, 'pasos'),
    enseres: entidadesDe(game, 'enseres'),
    estandartes: entidadesDe(game, 'estandartes'),
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
 * Poner ahí el recambio narrativo largo convertiría la sustitución en un
 * marcador: en la tabla «quiénes cruzan», cinco personas aparecerían con una
 * frase de novela en la casilla del puesto y el kanchō con «lancero de Mikawa»
 * — el único con pinta normal. Un filtro que señala a quien no filtró es peor
 * que no filtrar. La lección es de la Momia y aquí nace aprendida.
 */
const RECAMBIO_OFICIO = 'miembro de la columna';

/** Un texto de recambio cuando el modelo escribe algo que no puede salir a la mesa. */
const RECAMBIO_PUBLICO =
  'De aquella noche se cuentan versiones distintas según quién la cuente, y ninguna acaba de encajar con las demás.';

/**
 * Convierte la respuesta del modelo en un `Plot`, validando por el camino.
 *
 * Función PURA: no llama a nadie y no depende del reloj salvo por la marca de
 * `generatedAt`. Eso es lo que permite que `verify:sombras-trama` la someta a
 * respuestas estropeadas a propósito sin tocar la red.
 */
export function ensamblarTramaSombras(
  game: GameSession,
  entidades: EntidadesDeSombras,
  cimientos: Cimientos,
  respuesta: RespuestaSombras,
): TramaEnsamblada {
  const incidencias: Incidencia[] = [];
  const { trama } = cimientos;
  const lexico = lexicoDePasos(entidades.pasos.map((p) => ({ id: p.id, name: p.name })));

  // ---- 1. La redacción de los hitos ---------------------------------------
  /*
   * Verdaderos y falsos en una sola tanda, como se le pidieron. Se separan
   * después por posición, que es el único sitio donde el código sabe cuál es
   * cuál: el modelo nunca lo ha sabido.
   */
  const pedidas = [...trama.condiciones, ...trama.falsasCandidatas];
  const escritas = new Map<string, string>();
  for (const h of respuesta.hitos ?? []) {
    if (h && typeof h.id === 'string' && typeof h.texto === 'string') escritas.set(h.id, h.texto);
  }
  const revisadas = revisarRedaccion(pedidas, escritas, lexico, 'hito');
  incidencias.push(...revisadas.incidencias);

  const tramaFinal: TramaSombras = {
    ...trama,
    condiciones: revisadas.hitos.slice(0, trama.condiciones.length),
    falsasCandidatas: revisadas.hitos.slice(trama.condiciones.length),
  };

  // ---- 2. Quién cobra de Akechi -------------------------------------------
  const idsColumna = new Set(entidades.escoltas.map((e) => e.id));
  let kanchoId = respuesta.kanchoId;
  if (!kanchoId || !idsColumna.has(kanchoId)) {
    kanchoId = entidades.escoltas[0]?.id ?? '';
    incidencias.push({
      donde: 'kanchoId',
      arreglo: 'sustituida',
      motivo: `el modelo señaló a alguien que no cruza; se ha asignado a «${
        entidades.escoltas[0]?.name ?? 'nadie'
      }»`,
    });
  }
  const kancho = entidades.escoltas.find((e) => e.id === kanchoId);

  // ---- 3. Un dosier por persona, ni más ni menos ---------------------------
  const escritos = new Map<string, RespuestaSombras['escoltas'][number]>();
  for (const p of respuesta.escoltas ?? []) {
    if (p && typeof p.suspectId === 'string' && idsColumna.has(p.suspectId) && !escritos.has(p.suspectId)) {
      escritos.set(p.suspectId, p);
    }
  }
  const characters: PlotCharacter[] = entidades.escoltas.map((persona) => {
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
      role: escrito.role?.trim() || RECAMBIO_OFICIO,
      publicPersona: escrito.publicPersona ?? '',
      secret: escrito.secret ?? '',
      motive: escrito.motive ?? '',
      alibi: escrito.alibi ?? '',
      knowledge: Array.isArray(escrito.knowledge)
        ? escrito.knowledge.filter((k) => typeof k === 'string')
        : [],
      personalHook: escrito.personalHook ?? '',
    };
  });

  // ---- 4. La regla de oro sobre todo lo que se lee en público --------------
  /*
   * Tres cosas no pueden salir de aquí: la senda enumerada de corrido, el nombre
   * de quien cobra de Akechi, y dónde esperan los cazadores. La primera acaba la
   * partida en la primera hora; la segunda, antes de empezar; la tercera apaga
   * la única decisión que tiene el juego.
   */
  const nombresDelKancho = [
    kancho?.name ?? '',
    characters.find((c) => c.suspectId === kanchoId)?.characterName ?? '',
  ].filter(Boolean);

  const depurar = (
    texto: string,
    donde: string,
    tambienElNombre: boolean,
    recambio: string = RECAMBIO_PUBLICO,
  ): string => {
    const salida = texto ?? '';
    if (revelaLaSenda(salida, lexico, trama.sendaVerdadera)) {
      incidencias.push({
        donde,
        arreglo: 'sustituida',
        motivo: 'enumeraba los cuatro pasos de la senda en el orden verdadero',
      });
      return recambio;
    }
    if (tambienElNombre && nombresDelKancho.length && nombraAlKancho(salida, nombresDelKancho)) {
      incidencias.push({ donde, arreglo: 'sustituida', motivo: 'nombraba a quien cobra de Akechi' });
      return recambio;
    }
    /*
     * Y EL SEÑALAMIENTO, SIEMPRE, aunque no toque el chequeo del nombre.
     *
     * Los dos no son lo mismo. `nombraAlKancho` prohíbe que aparezca el nombre, y
     * eso solo vale donde el infiltrado no debe salir en absoluto —la sinopsis,
     * el lema, una narración—. En la presentación de alguien o en un momento
     * público los nombres salen con toda naturalidad, el suyo incluido, y
     * prohibirlos dejaría los dosieres llenos de agujeros.
     *
     * Lo que no puede salir NUNCA, ni ahí, es «todo el mundo dice que Bruno cobra
     * de Akechi»: nombre y acusación en la misma frase.
     */
    if (nombresDelKancho.length && senalaAlKancho(salida, nombresDelKancho)) {
      incidencias.push({ donde, arreglo: 'sustituida', motivo: 'señalaba a quien cobra de Akechi' });
      return recambio;
    }
    return salida;
  };

  /*
   * LOS DOS CAMPOS DEL DOSIER QUE LEE TODO EL MUNDO.
   *
   * `role` y `publicPersona` de cada persona se imprimen en la hoja de TODAS las
   * demás. SOLO se comprueban contra la senda: el chequeo del nombre es una
   * coincidencia de palabras, y en la presentación de alguien su propio nombre
   * —o el de un compañero, aunque sea el kanchō— aparece con toda naturalidad.
   * Que la columna hable de alguien no revela nada; lo que lo revelaría es que un
   * texto público enumere la senda, y eso no tiene ni un uso legítimo.
   *
   * Lo privado —`secret`, `motive`, `alibi`, `personalHook`— NO se toca: el
   * dosier del kanchō tiene que poder decirle que es él.
   */
  for (const personaje of characters) {
    personaje.role = depurar(personaje.role, `puesto de ${personaje.characterName}`, false, RECAMBIO_OFICIO);
    personaje.publicPersona = depurar(
      personaje.publicPersona,
      `presentación pública de ${personaje.characterName}`,
      false,
    );
  }

  const synopsis = depurar(respuesta.synopsis ?? '', 'sinopsis', true);
  const ambientacion = depurar(respuesta.ambientacion ?? '', 'ambientación', true);

  const horasEscritas = (respuesta.horas ?? [])
    .filter((h) => h && typeof h.texto === 'string')
    .map((h) => ({ ...h, ronda: Math.min(Math.max(Math.round(h.ronda) || 1, 1), trama.batidos.length) }))
    .sort((a, b) => a.ronda - b.ronda);

  const narrations: PrintMaterial['narrations'] = [
    /*
     * La hora 0 no se le pide aparte: se compone con lo que ya escribió sobre la
     * noche de Honnō-ji. Es lo que quien dirige lee ANTES de empezar, y pedirlo
     * por separado solo habría añadido una entrada más al esquema —que tiene
     * techo— para decir lo mismo dos veces.
     */
    {
      round: 0,
      title: 'La noche en que ardió el Honnō-ji',
      text: depurar(respuesta.laNocheDeHonnoji ?? '', 'apertura', true),
      stageDirection: 'Léela con todos sentados, antes de repartir nada.',
    },
    ...horasEscritas.map((h) => {
      let texto = depurar(h.texto, `narración de la hora ${h.ronda}`, true);
      /*
       * Y LA COMPROBACIÓN QUE LA MOMIA NO NECESITABA: que la narración no diga
       * dónde esperan los cazadores. Allí la cámara profanada se anunciaba en voz
       * alta al abrir la vigilia, así que nombrarla no revelaba nada. Aquí es
       * secreta hasta que se cierra la hora, y una narración que la delate apaga
       * la única decisión del juego y deja sin sentido dos de los seis disfraces.
       */
      const batido = pasoBatido(trama.batidos, h.ronda);
      if (revelaLosCazadores(texto, lexico, batido)) {
        incidencias.push({
          donde: `narración de la hora ${h.ronda}`,
          arreglo: 'sustituida',
          motivo: 'decía dónde esperaban los cazadores esa noche',
        });
        texto = RECAMBIO_PUBLICO;
      }
      return {
        round: h.ronda,
        title: h.titulo?.trim() || `Hora ${h.ronda}`,
        text: texto,
        stageDirection: h.indicacion ?? '',
      };
    }),
  ];

  // ---- 5. La cronología ----------------------------------------------------
  const timeline: TimelineEvent[] = (respuesta.cronologia ?? [])
    .filter((e) => e && typeof e.descripcion === 'string' && e.descripcion.trim())
    .map((e) => {
      const suspectIds = (e.escoltaIds ?? []).filter((id) => idsColumna.has(id));
      /*
       * Un momento con UNA sola persona nunca es público. Los públicos se
       * imprimen en el dosier de todo el mundo, así que «a las seis y media
       * Fulano se apartó a hablar con alguien» marcado como público es la partida
       * entera resuelta en la portada. Es la misma regla que en CLUEDO.
       *
       * PERO CON CERO PERSONAS SÍ LO ES, y ahí este juego se separa de la Momia
       * a propósito. La cronología de esta noche empieza con hechos del mundo
       * —«las tropas de Akechi rodean el Honnō-ji», «la noticia llega a Sakai»—
       * en los que no participa nadie de la mesa. Con la regla copiada tal cual,
       * esos hechos se degradaban a secretos y la cronología pública salía vacía:
       * quien juega no se enteraba de por qué está cruzando un monte de noche.
       *
       * Y no abre ninguna brecha: un momento sin gente implicada no puede
       * delatar a nadie, que es exactamente lo que la regla protege.
       */
      const publico = e.publico === true && suspectIds.length !== 1;
      if (e.publico === true && !publico) {
        incidencias.push({
          donde: `cronología ${e.hora ?? ''}`,
          arreglo: 'sustituida',
          motivo: 'venía marcado como público con una sola persona implicada; pasa a secreto',
        });
      }
      /*
       * Lo público de la cronología viaja al MÓVIL DE TODOS y se imprime. Otra
       * vez solo contra la senda: los momentos públicos son de DOS O MÁS personas
       * por construcción, así que sus nombres salen ahí, y el del kanchō entre
       * ellos. Eso es el juego, no una filtración.
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
  const sabor: SaborSombras = {
    senor: {
      nombre: respuesta.senor?.nombre?.trim() || 'el señor',
      descripcion: depurar(respuesta.senor?.descripcion ?? '', 'el señor', false),
    },
    elDisfraz: Object.fromEntries(
      entidades.escoltas.map((p) => [p.id, escritos.get(p.id)?.elDisfraz?.trim() ?? '']),
    ),
    inscripciones: Object.fromEntries(
      entidades.pasos.map((paso) => {
        const escrito = (respuesta.pasos ?? []).find((p) => p?.pasoId === paso.id);
        /*
         * LA INSCRIPCIÓN VA AL CARTEL DE LA PUERTA, que es lo que ve la casa
         * entera. Se depura contra la senda Y contra los cazadores de TODAS las
         * horas: un cartel que diga «aquí esperan» estropea la noche entera de
         * una vez, no solo una hora.
         */
        let texto = depurar(escrito?.inscripcion ?? '', `inscripción de ${paso.name}`, false);
        /*
         * CON LA COMPROBACIÓN SIN LUGAR, y no con la de las narraciones. En un
         * cartel el sitio es implícito —está clavado en esa puerta— así que el
         * texto no nombra el paso y `revelaLosCazadores` no dispararía nunca.
         * «Aquí acechan los campesinos con lanzas» apaga la decisión de esa hora
         * sin nombrar nada, y estaba pasando el filtro.
         */
        const delata = anunciaEmboscada(texto);
        if (delata) {
          incidencias.push({
            donde: `inscripción de ${paso.name}`,
            arreglo: 'sustituida',
            motivo: 'anunciaba una emboscada en un paso batido',
          });
          texto = 'Quien pase de noche, que pase en silencio.';
        }
        return [paso.id, texto];
      }),
    ),
  };

  // ---- 7. El Plot ----------------------------------------------------------
  const material: PrintMaterial = {
    narrations,
    /*
     * Sin giros y sin revelaciones de cronología, y no por falta de tiempo. En
     * CLUEDO los giros existen porque a mitad de velada ya se han dicho todas las
     * coartadas y la partida se estanca. Aquí no se estanca: cada hora reparte
     * hitos nuevos, se revela dónde estaban los cazadores y el kanchō puede dejar
     * una mentira. El motor del segundo acto ya está dentro del juego.
     */
    twists: [],
    timelineReveals: [],
    hints: (respuesta.ayudas ?? [])
      .filter((a) => a && typeof a.texto === 'string' && a.texto.trim())
      .map((a) => ({
        level: Math.min(Math.max(Math.round(a.nivel) || 1, 1), 3),
        text: depurar(a.texto, `ayuda ${a.nivel}`, true),
      }))
      .sort((a, b) => a.level - b.level),
    finale: {
      // Aquí SÍ se cuenta todo: es lo que se lee al abrir el pliego.
      reconstruction: respuesta.desenlace?.reconstruccion ?? '',
      confession: respuesta.desenlace?.confesion ?? '',
      epilogue: respuesta.desenlace?.epilogo ?? '',
    },
    generatedAt: new Date().toISOString(),
  };

  const delJuego: TramaSombrasConSabor = { ...tramaFinal, sabor };

  const plot: Plot = {
    title: respuesta.title?.trim() || game.name,
    /*
     * EL LEMA ES LA LÍNEA QUE MÁS SE DIFUNDE DE TODO EL JUEGO. Va a la portada de
     * cinco imprimibles —incluidos los carteles que se cuelgan en las puertas,
     * que ve la casa entera— y al móvil de todo el mundo como `sesion.lema`. Es
     * un canal peor que el dosier: aquel hay que abrirlo, y este está en la
     * pared. Con el chequeo del nombre puesto, como la sinopsis.
     */
    tagline: depurar(
      respuesta.tagline?.trim() ||
        'Honnō-ji arde. Antes del alba hay que cruzar Iga, y uno de los que guían cobra de Akechi.',
      'lema',
      true,
    ),
    synopsis,
    /*
     * El «muerto» de esta velada es EL SEÑOR, y conviene explicarlo porque
     * chirría: `Plot.victim` es el hueco de CLUEDO para la persona de la que va
     * el caso. Aquí no ha muerto —de eso se trata— pero es de quien va la noche,
     * es quien aparece en la portada de los dosieres y es a quien se le debe el
     * viaje. Meterlo aquí es lo que hace que las plantillas comunes lo pinten sin
     * saber nada de este juego.
     */
    victim: { name: sabor.senor.nombre, description: sabor.senor.descripcion },
    setting: ambientacion,
    solution: {
      respuestas: { kancho: kanchoId },
      motive: respuesta.motivoDelKancho ?? '',
      howItHappened: respuesta.comoOcurrio ?? '',
    },
    characters,
    timeline,
    /*
     * SIN PISTAS, Y ES DELIBERADO. Un hito se parece a una pista —aparece en un
     * paso, en una hora— pero no lo es: es una pieza de un rompecabezas lógico,
     * algunas son MENTIRA, y quién se lleva cuál lo decide el reductor del juego.
     * Metidas en `clues` viajarían por la proyección genérica de CLUEDO, que
     * reparte por sala y no sabe de hitos falsos: el móvil recibiría las mentiras
     * marcadas como pistas del caso.
     */
    clues: [],
    /*
     * EL GUION TAMBIÉN PASA POR EL FILTRO. Se imprime entero en la Guía del paso,
     * que es la hoja que se maneja toda la noche delante de la mesa y que, con
     * quien dirige jugando, lee alguien que también juega.
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
    role: RECAMBIO_OFICIO,
    publicPersona: 'Salió de Sakai con los demás y no ha dado un paso en falso desde entonces.',
    secret: 'Callas algo de lo que viste aquel día que todavía no has sabido cómo contar.',
    motive: 'Llegar a la playa antes del alba, y llegar con todos.',
    alibi: 'Dices que estabas en el patio cuando llegó la noticia. Como todo el mundo.',
    knowledge: [],
    personalHook: 'Su papel se ha quedado sin escribir: improvisa con lo que sepas de la persona.',
  };
}

// ---------------------------------------------------------------------------
// La llamada
// ---------------------------------------------------------------------------

/** Pide la trama al modelo y la ensambla. En modo demo, sin salir a la red. */
export async function escribirTramaSombras(game: GameSession, emit: Emitir): Promise<Plot> {
  const entidades = entidadesDeLasSombras(game);
  const cimientos = cimientosDeSombras(entidades, { semilla: game.id });

  const respuesta = DEMO_MODE
    ? await respuestaDemo(game, entidades, cimientos, emit)
    : await respuestaConApi(game, entidades, cimientos, emit);

  const ensamblada = ensamblarTramaSombras(game, entidades, cimientos, respuesta);

  /*
   * Las incidencias se cuentan por consola y se pintan en el «informe de la
   * senda». No abortan: cada una tiene su arreglo aplicado, y lo que queda es una
   * partida jugable con alguna frase menos brillante.
   */
  if (ensamblada.incidencias.length > 0) {
    console.warn(
      `[sombras] ${ensamblada.incidencias.length} incidencias al validar la trama:`,
      ensamblada.incidencias.map((i) => `${i.donde}: ${i.motivo}`).join(' · '),
    );
  }
  console.log(
    `[sombras] redacción del modelo aceptada en ${ensamblada.redaccion.aceptadas} de ${ensamblada.redaccion.total} hitos`,
  );

  const conRevision = ensamblada.plot.delJuego as TramaSombrasConSabor | undefined;
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
 * Esto no es la validación: de eso se encarga `ensamblarTramaSombras`, que sabe
 * arreglar lo que llega mal y tiene un recambio para cada hueco. La pregunta aquí
 * es otra —¿merece la pena pagar una segunda llamada?— y por eso solo mira lo
 * gordo. A una respuesta le pueden faltar tres frases y ensamblarse
 * perfectamente; lo que no se puede dar por bueno es que falte la columna entera.
 *
 * Y pasa: midiéndolo contra la API de verdad en el juego anterior, de cuatro
 * generaciones dos salieron impecables, una devolvió los dosieres con ids que no
 * casaban con ninguna persona real y otra cerró el JSON con casi todos los arrays
 * vacíos. Las dos veces la partida se guardaba como lista y el fallo solo se veía
 * al imprimir.
 */
export function loQueFalta(
  respuesta: RespuestaSombras,
  entidades: EntidadesDeSombras,
  cimientos: Cimientos,
): string[] {
  const faltan: string[] = [];

  const ids = new Set(entidades.escoltas.map((e) => e.id));
  const dosieres = (respuesta.escoltas ?? []).filter(
    (p) => p && typeof p.suspectId === 'string' && ids.has(p.suspectId),
  ).length;
  // La mitad, y no «alguno»: que se deje a una persona lo arregla el dosier
  // mínimo sin que se note; que se deje a la mesa entera, no.
  if (dosieres * 2 < ids.size) faltan.push(`los dosieres (${dosieres} de ${ids.size})`);

  const pedidos = new Set(
    [...cimientos.trama.condiciones, ...cimientos.trama.falsasCandidatas].map((h) => h.id),
  );
  const redactados = (respuesta.hitos ?? []).filter(
    (h) => h && typeof h.id === 'string' && pedidos.has(h.id) && (h.texto ?? '').trim(),
  ).length;
  if (redactados * 2 < pedidos.size) faltan.push(`los hitos (${redactados} de ${pedidos.size})`);

  if ((respuesta.horas ?? []).length === 0) faltan.push('las horas');
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
  entidades: EntidadesDeSombras,
  cimientos: Cimientos,
  emit: Emitir,
): Promise<RespuestaSombras> {
  const stream = client.messages.stream({
    model,
    max_tokens: 64000,
    system: [{ type: 'text', text: SISTEMA_SOMBRAS, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: SOMBRAS_TRAMA_SCHEMA } },
    messages: [{ role: 'user', content: construirPromptSombras(game, cimientos.trama, entidades) }],
  });

  stream.on('text', (delta) => emit({ type: 'text', delta }));
  const mensaje = await stream.finalMessage();

  if (mensaje.stop_reason === 'refusal') {
    throw new Error(
      'El modelo declinó escribir esta noche. Revisa las descripciones introducidas e inténtalo de nuevo.',
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
    return JSON.parse(texto) as RespuestaSombras;
  } catch {
    throw new Error('La respuesta del modelo no es un JSON válido. Vuelve a intentar la generación.');
  }
}

/**
 * Le pide la trama al modelo, y se la vuelve a pedir UNA vez si viene coja.
 *
 * Una sola repetición, y solo cuando falta algo grande: la segunda llamada cuesta
 * lo mismo que la primera y tarda otros cuatro o cinco minutos, así que no se
 * paga por unas frases sueltas. Si las dos vienen cojas se ensambla la que menos
 * cojea —dos tramas a medias no se pueden coser en una, y quedarse con la segunda
 * por ser la última sería tirar la mejor.
 */
async function respuestaConApi(
  game: GameSession,
  entidades: EntidadesDeSombras,
  cimientos: Cimientos,
  emit: Emitir,
): Promise<RespuestaSombras> {
  const client = getAnthropicClient();
  if (!client) return respuestaDemo(game, entidades, cimientos, emit);

  const model = await resolveModel(game);

  const primera = await unaTirada(client, model, game, entidades, cimientos, emit);
  const faltan = loQueFalta(primera, entidades, cimientos);
  if (faltan.length === 0) return primera;

  console.warn(`[sombras] la primera escritura vino sin ${faltan.join(', ')}; se pide otra`);
  emit({
    type: 'text',
    delta: `

[La primera escritura vino sin ${faltan.join(', ')}. Pidiendo otra…]

`,
  });

  /*
   * Y SI LA SEGUNDA REVIENTA, NOS QUEDAMOS CON LA PRIMERA. Una trama coja se
   * ensambla —para eso están los recambios— y una excepción deja la partida en
   * `draft` sin nada. El reintento está para ganar, no para poder perder.
   */
  let segunda: RespuestaSombras;
  try {
    segunda = await unaTirada(client, model, game, entidades, cimientos, emit);
  } catch (error) {
    console.warn('[sombras] la segunda escritura falló; se ensambla la primera:', error);
    return primera;
  }

  const faltanTambien = loQueFalta(segunda, entidades, cimientos);
  if (faltanTambien.length === 0) return segunda;

  console.warn(`[sombras] la segunda escritura vino sin ${faltanTambien.join(', ')}`);
  return faltanTambien.length < faltan.length ? segunda : primera;
}

async function respuestaDemo(
  game: GameSession,
  entidades: EntidadesDeSombras,
  cimientos: Cimientos,
  emit: Emitir,
): Promise<RespuestaSombras> {
  for (const paso of [
    'Se cuenta lo que ha pasado en Kioto…',
    'Cuatro pasos de todos los que hay buscan su orden…',
    'Se reparten los siete disfraces sin que nadie mire…',
    'Se talla lo que dice cada mojón del camino…',
  ]) {
    emit({ type: 'text', delta: `${paso}\n` });
    await new Promise((r) => setTimeout(r, 160));
  }
  return respuestaDeDemostracion(game.name, entidades, cimientos.trama);
}
