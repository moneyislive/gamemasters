/**
 * La revisión adversaria de CLUEDO, de principio a fin.
 *
 *   1. La AUDITORÍA cuenta, con código, quién aparece dónde. No cuesta nada.
 *   2. El DETECTIVE, que no conoce la solución, lee la noche momento a momento.
 *   3. El REVISOR, que sí la conoce, lee todo lo anterior y reescribe.
 *   4. Se vuelve a auditar y a preguntar al detective SOBRE LO CORREGIDO: un
 *      arreglo puede abrir otra grieta, y eso solo se ve mirando otra vez.
 *   5. Si queda algo bloqueante o grave, una segunda pasada. No hay tercera: el
 *      coste de una velada tiene que tener techo, y lo que queda después de dos
 *      pasadas se le dice al Game Master en vez de seguir gastando.
 *
 * ═══ NUNCA TIRA LA TRAMA ═══
 *
 * Si algo falla a medias —el detective no contesta, el revisor devuelve algo
 * ilegible—, se entrega la mejor versión que haya y el informe dice qué no se
 * pudo hacer. Una trama sin revisar es peor que una revisada; una velada sin
 * trama es peor que las dos.
 *
 * ═══ SIN CLAVE DE API ═══
 *
 * Solo la auditoría, que no necesita modelo. El informe sale con lo que haya
 * contado y el veredicto que eso dé: es lo que ven las comprobaciones y quien
 * prueba el taller sin clave.
 */
import type { GameSession, GenerateStreamEvent, HallazgoDeRevision, InformeDeRevision, Plot } from '../../../shared/types';
import { getAnthropicClient, resolveModel } from '../agent/anthropic';
import { registrarRevisor, type AlcanceDeRevision } from '../juegos/revisores';
import { numeroDeRondas } from '../docs/datos';
import { auditarTramaCluedo, auditoriaEnTexto } from './cluedo-auditoria';
import { interrogarAlDetective, juzgarLecturas, lecturasEnTexto, type LecturaCompleta } from './cluedo-detective';
import { aplicarParches } from './cluedo-parches';
import { pedirRevision } from './cluedo-revisor';

/** Cuántas veces reescribe el revisor como mucho. Ver la cabecera. */
const PASADAS_MAXIMAS = 2;

type Emitir = (evento: GenerateStreamEvent) => void;

const clave = (h: HallazgoDeRevision) => `${h.codigo}|${h.sobre ?? ''}`;

/**
 * Lo que obliga a OTRA pasada: solo lo bloqueante.
 *
 * La primera pasada va siempre. La segunda costó 1,2 $ de los 4,09 $ de la
 * primera velada completa contra la API (25-sep-2026), y la pedían avisos
 * graves que el taller ya enseña: una mesa con un favorito, un final algo flojo.
 * Eso se le dice al Game Master; otra vuelta del revisor se paga solo si queda
 * algo que rompe la noche.
 */
function hayQueCorregir(hallazgos: HallazgoDeRevision[]): boolean {
  return hallazgos.some((h) => h.gravedad === 'bloqueante');
}

function veredictoDe(pendientes: HallazgoDeRevision[]): InformeDeRevision['veredicto'] {
  if (pendientes.some((h) => h.gravedad === 'bloqueante')) return 'no-apta';
  if (pendientes.some((h) => h.gravedad === 'grave')) return 'apta-con-avisos';
  return 'apta';
}

/** Sin repetidos: el mismo aviso visto por dos caminos es un aviso. */
function sinRepetir(hallazgos: HallazgoDeRevision[]): HallazgoDeRevision[] {
  const vistos = new Set<string>();
  return hallazgos.filter((h) => {
    const k = clave(h);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

/**
 * Qué momentos hay que volver a leer después de corregir: los que avisaron de
 * algo, el principio —las correcciones suelen tocar lo público— y el final, que
 * es el que dice si sigue habiendo solución.
 */
function momentosARevisar(rondas: number, hallazgos: HallazgoDeRevision[]): number[] {
  const momentos = new Set<number>([0, rondas]);
  for (const h of hallazgos) {
    const m = /^momento-(\d+)$/.exec(h.sobre ?? '');
    if (m) momentos.add(Number(m[1]));
  }
  if (rondas > 2) momentos.add(1);
  return [...momentos].sort((a, b) => a - b);
}

export async function revisarTramaCluedo(
  game: GameSession,
  plotEntrante: Plot,
  emit: Emitir,
  alcance: AlcanceDeRevision,
): Promise<{ plot: Plot; informe: InformeDeRevision }> {
  const soloMaterial = alcance === 'material';
  const rondas = numeroDeRondas(plotEntrante);
  let plot = plotEntrante;

  emit({ type: 'stage', stage: 'revision', label: 'Se cuenta quién aparece en cada rincón de la noche…' });
  let auditoria = auditarTramaCluedo(game, plot);
  const hallazgosIniciales: HallazgoDeRevision[] = [...auditoria.hallazgos];

  // Sin modelo, la auditoría es todo lo que hay.
  if (!getAnthropicClient()) {
    return {
      plot,
      informe: {
        veredicto: veredictoDe(auditoria.hallazgos),
        pasadas: 0,
        hallazgos: auditoria.hallazgos,
        cambios: [],
        revisadaEl: new Date().toISOString(),
      },
    };
  }

  const model = await resolveModel(game);
  const cambios: string[] = [];
  const delRevisor: HallazgoDeRevision[] = [];
  let pasadas = 0;
  let error: string | undefined;

  emit({ type: 'stage', stage: 'revision', label: 'Un detective que no conoce la solución intenta resolver el caso antes de tiempo…' });
  const primeraLectura = await interrogarAlDetective(game, plot, model, emit);
  hallazgosIniciales.push(...primeraLectura.hallazgos);
  const lecturasAntes = primeraLectura.lecturas;
  let lecturas: LecturaCompleta[] = primeraLectura.lecturas;
  let pendientes = sinRepetir([...auditoria.hallazgos, ...primeraLectura.hallazgos]);

  try {
    while (pasadas < PASADAS_MAXIMAS) {
      // La primera pasada va siempre: el revisor busca también lo que los
      // informes no saben ver (contradicciones, cabos sueltos). Las siguientes,
      // solo si queda algo que las merezca.
      if (pasadas > 0 && !hayQueCorregir(pendientes)) break;

      emit({
        type: 'stage',
        stage: 'revision',
        label: pasadas === 0 ? 'El revisor lee la trama con ojos de quien quiere romperla…' : 'Segunda pasada sobre lo que sigue pendiente…',
      });
      const respuesta = await pedirRevision(
        game,
        plot,
        model,
        { auditoria: auditoriaEnTexto(auditoria), lecturas: lecturasEnTexto(game, plot, lecturas), hallazgos: pendientes },
        { soloMaterial, pasada: pasadas },
        emit,
      );
      pasadas += 1;

      const { plot: corregida, aplicados, rechazados } = aplicarParches(game, plot, respuesta.cambios, soloMaterial);
      plot = corregida;
      cambios.push(...(respuesta.resumenDeCambios ?? []).map((c) => String(c).trim()).filter(Boolean));
      if (rechazados.length) {
        console.warn(`[revision] cambios rechazados en la pasada ${pasadas}:`, rechazados);
        cambios.push(...rechazados.map((r) => `No se aplicó: ${r}.`));
      }
      for (const h of respuesta.hallazgos ?? []) {
        delRevisor.push({
          codigo: String(h.codigo || 'revisor'),
          gravedad: h.gravedad,
          origen: 'revisor',
          texto: `${h.problema}${h.arreglo ? ` — ${h.arreglo}` : ''}`,
          // Lo que el revisor arregló y entró, corregido; lo que descartó como
          // no-problema, también (no queda nada pendiente de ello).
          estado: !h.arreglo || aplicados.length > 0 ? 'corregido' : 'pendiente',
          ...(h.sobre ? { sobre: h.sobre } : {}),
        });
      }
      if (aplicados.length === 0) break; // No cambió nada: otra vuelta daría lo mismo.

      // ---- Mirar otra vez, sobre lo corregido ----
      emit({ type: 'stage', stage: 'revision', label: 'Se comprueba que el caso sigue teniendo solución…' });
      auditoria = auditarTramaCluedo(game, plot);
      const releer = momentosARevisar(rondas, pendientes);
      const segunda = await interrogarAlDetective(game, plot, model, emit, releer);
      const porMomento = new Map(lecturas.map((l) => [l.momento, l]));
      for (const l of segunda.lecturas) porMomento.set(l.momento, l);
      lecturas = [...porMomento.values()].sort((a, b) => a.momento - b.momento);
      pendientes = sinRepetir([...auditoria.hallazgos, ...juzgarLecturas(game, plot, lecturas, rondas)]);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    console.error('[revision] la revisión se quedó a medias:', e);
  }

  // ---- El informe ----
  const siguen = new Map(pendientes.map((h) => [clave(h), h]));
  const hallazgos = sinRepetir([
    /*
     * Lo que sigue pendiente, con lo que dice la ÚLTIMA lectura: el mismo
     * aviso de la primera («un 70 %») contaba algo que ya no es verdad cuando
     * la corrección lo había dejado en un 40 %.
     */
    ...hallazgosIniciales.map((h) => {
      const ahora = siguen.get(clave(h));
      return ahora ? { ...ahora, estado: 'pendiente' as const } : { ...h, estado: 'corregido' as const };
    }),
    // Lo que apareció después de corregir y no estaba al principio.
    ...pendientes.filter((h) => !hallazgosIniciales.some((i) => clave(i) === clave(h))),
    ...delRevisor,
  ]);

  return {
    plot,
    informe: {
      veredicto: pasadas === 0 && error ? 'sin-revisar' : veredictoDe(pendientes),
      pasadas,
      hallazgos,
      cambios,
      lecturas: {
        antes: lecturasAntes.map(({ momento, reparto }) => ({ momento, reparto })),
        despues: lecturas.map(({ momento, reparto }) => ({ momento, reparto })),
      },
      revisadaEl: new Date().toISOString(),
      modelo: model,
      ...(error ? { error } : {}),
    },
  };
}

registrarRevisor('cluedo', revisarTramaCluedo);
