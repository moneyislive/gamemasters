/**
 * Cómo entran en una trama de CLUEDO los cambios que propone el revisor.
 *
 * ═══ EL REVISOR PROPONE; ESTO DECIDE ═══
 *
 * El revisor devuelve piezas enteras —un personaje, una pista, la cronología—
 * y aquí se decide cuáles entran. Son las mismas reglas que ya tiene el resto
 * del generador, más tres propias de reescribir sobre algo que ya existía:
 *
 *   · LA SOLUCIÓN NO SE TOCA. Ni culpable, ni arma, ni sala: el esquema ni
 *     siquiera le deja proponerlo, y aquí no hay camino para escribirlo.
 *   · NO SE EMPOBRECE. Una reescritura que deja un secreto, una sinopsis o un
 *     personaje en menos de la mitad de lo que era se rechaza. El revisor está
 *     para quitar filtraciones y atar cabos, no para resumir.
 *   · NADA SE QUEDA VACÍO. Retirar una pista que deja una sala o una ronda sin
 *     ninguna no se hace: una sala sin pistas es una sala a la que nadie va.
 *
 * Lo que no entra no rompe nada: se anota en `rechazados` y el informe lo dice.
 */
import type {
  GameSession,
  Plot,
  PlotCharacter,
  PlotHint,
  PlotNarration,
  PlotTwist,
  TimelineEvent,
  TimelineReveal,
} from '../../../shared/types';
import { type PlotClue, pistasDeLaTrama, pistasParaEscribir } from '../../../shared/mecanicas/pistas';
import { numeroDeRondas } from '../docs/datos';
import { culpableDe, salasDe, sospechososDe } from '../juegos/cluedo';

/** Lo que devuelve el revisor en `cambios`. Cadena o lista vacía = sin cambios. */
export interface CambiosDelRevisor {
  titulo: string;
  lema: string;
  sinopsis: string;
  ambientacion: string;
  victima: { name: string; description: string };
  motivo: string;
  relato: string;
  personajes: PlotCharacter[];
  pistas: PlotClue[];
  pistasRetiradas: string[];
  cronologia: TimelineEvent[];
  guion: string[];
  narraciones: PlotNarration[];
  giros: PlotTwist[];
  girosRetirados: string[];
  revelaciones: TimelineReveal[];
  ayudas: PlotHint[];
  desenlace: { reconstruction: string; confession: string; epilogue: string };
}

export interface ResultadoDeLosParches {
  plot: Plot;
  aplicados: string[];
  rechazados: string[];
}

/** Menos de esto, respecto a lo que había, es resumir y no revisar. */
const SUELO_DE_LARGO = 0.5;
/** Para un personaje entero, que tiene más donde repartir, el suelo es más alto. */
const SUELO_DE_PERSONAJE = 0.7;

function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function largoDePersonaje(c: PlotCharacter): number {
  return [c.role, c.publicPersona, c.secret, c.motive, c.alibi, ...(c.knowledge ?? []), c.personalHook]
    .filter(Boolean)
    .join(' ').length;
}

/**
 * Aplica los cambios sobre una COPIA de la trama. Con `soloMaterial`, lo que no
 * es material se ignora: es la revisión que corre al reescribir el material,
 * sobre una trama que ya pasó la suya.
 */
export function aplicarParches(
  game: GameSession,
  original: Plot,
  cambios: Partial<CambiosDelRevisor>,
  soloMaterial = false,
): ResultadoDeLosParches {
  const plot = structuredClone(original);
  const aplicados: string[] = [];
  const rechazados: string[] = [];
  const idsPersonas = new Set(sospechososDe(game).map((s) => s.id));
  const idsSalas = new Set(salasDe(game).map((s) => s.id));
  const culpable = culpableDe(plot.solution);
  const rondas = numeroDeRondas(plot);

  /** Sustituye un texto si el nuevo no es un resumen del viejo. */
  const sustituir = (nombre: string, viejo: string, nuevo: unknown, poner: (v: string) => void): void => {
    const limpio = texto(nuevo);
    if (!limpio || limpio === viejo.trim()) return;
    if (viejo.trim().length > 0 && limpio.length < viejo.trim().length * SUELO_DE_LARGO) {
      rechazados.push(`${nombre}: la versión nueva era menos de la mitad de larga`);
      return;
    }
    poner(limpio);
    aplicados.push(nombre);
  };

  if (!soloMaterial) {
    sustituir('título', plot.title, cambios.titulo, (v) => (plot.title = v));
    sustituir('lema', plot.tagline, cambios.lema, (v) => (plot.tagline = v));
    sustituir('sinopsis', plot.synopsis, cambios.sinopsis, (v) => (plot.synopsis = v));
    sustituir('ambientación', plot.setting, cambios.ambientacion, (v) => (plot.setting = v));
    if (plot.victim) {
      const victima = plot.victim;
      sustituir('nombre de la víctima', victima.name, cambios.victima?.name, (v) => (victima.name = v));
      sustituir('descripción de la víctima', victima.description, cambios.victima?.description, (v) => (victima.description = v));
    }
    sustituir('motivo real', plot.solution.motive ?? '', cambios.motivo, (v) => (plot.solution.motive = v));
    sustituir('relato del crimen', plot.solution.howItHappened ?? '', cambios.relato, (v) => (plot.solution.howItHappened = v));

    // ---- Personajes: enteros, uno por persona que exista ----
    for (const nuevo of cambios.personajes ?? []) {
      const id = texto(nuevo?.participanteId);
      const indice = plot.characters.findIndex((c) => c.participanteId === id);
      if (!idsPersonas.has(id) || indice === -1) {
        rechazados.push(`personaje de «${id}»: no es nadie de esta mesa`);
        continue;
      }
      const viejo = plot.characters[indice]!;
      const limpio: PlotCharacter = {
        participanteId: id,
        characterName: texto(nuevo.characterName) || viejo.characterName,
        role: texto(nuevo.role) || viejo.role,
        publicPersona: texto(nuevo.publicPersona) || viejo.publicPersona,
        secret: texto(nuevo.secret) || viejo.secret,
        motive: texto(nuevo.motive) || viejo.motive,
        alibi: texto(nuevo.alibi) || viejo.alibi,
        knowledge: Array.isArray(nuevo.knowledge)
          ? nuevo.knowledge.map(texto).filter(Boolean)
          : viejo.knowledge,
        personalHook: texto(nuevo.personalHook) || viejo.personalHook,
      };
      if (largoDePersonaje(limpio) < largoDePersonaje(viejo) * SUELO_DE_PERSONAJE) {
        rechazados.push(`personaje de ${viejo.characterName}: la versión nueva lo dejaba más pobre`);
        continue;
      }
      plot.characters[indice] = limpio;
      aplicados.push(`personaje de ${limpio.characterName}`);
    }

    // ---- Pistas: las que cambian por id, las nuevas con id propio ----
    const pistas = pistasParaEscribir(plot);
    const idsUsados = new Set(pistas.map((p) => p.id));
    for (const nueva of cambios.pistas ?? []) {
      const lugarId = texto(nueva?.lugarId);
      const descripcion = texto(nueva?.description);
      if (!idsSalas.has(lugarId) || !descripcion) {
        rechazados.push(`pista «${texto(nueva?.id)}»: sin sala válida o sin texto`);
        continue;
      }
      const ronda = Math.min(Math.max(Math.round(Number(nueva.round)) || 1, 1), rondas);
      const id = texto(nueva.id);
      const indice = pistas.findIndex((p) => p.id === id);
      if (indice >= 0) {
        const vieja = pistas[indice]!;
        if (descripcion.length < vieja.description.length * SUELO_DE_LARGO) {
          rechazados.push(`pista «${id}»: la versión nueva era menos de la mitad de larga`);
          continue;
        }
        pistas[indice] = { id, lugarId, description: descripcion, pointsTo: texto(nueva.pointsTo), round: ronda };
        aplicados.push(`pista «${id}»`);
      } else {
        let libre = id && !idsUsados.has(id) ? id : '';
        for (let n = 1; !libre; n++) if (!idsUsados.has(`pista-extra-${n}`)) libre = `pista-extra-${n}`;
        idsUsados.add(libre);
        pistas.push({ id: libre, lugarId, description: descripcion, pointsTo: texto(nueva.pointsTo), round: ronda });
        aplicados.push(`pista nueva «${libre}» (ronda ${ronda})`);
      }
    }
    for (const retirada of cambios.pistasRetiradas ?? []) {
      const indice = pistas.findIndex((p) => p.id === retirada);
      if (indice === -1) continue;
      const pista = pistas[indice]!;
      const otrasEnSuSala = pistas.filter((p) => p !== pista && p.lugarId === pista.lugarId).length;
      const otrasEnSuRonda = pistas.filter((p) => p !== pista && p.round === pista.round).length;
      if (otrasEnSuSala === 0 || otrasEnSuRonda === 0) {
        rechazados.push(`retirar «${retirada}»: dejaría su sala o su ronda sin pistas`);
        continue;
      }
      pistas.splice(indice, 1);
      aplicados.push(`pista retirada «${retirada}»`);
    }

    // ---- Cronología: entera o nada ----
    const cronologia = (cambios.cronologia ?? [])
      .filter((e) => e && texto(e.time) && texto(e.description))
      .map((e) => {
        const participanteIds = (Array.isArray(e.participanteIds) ? e.participanteIds : []).filter((id) =>
          idsPersonas.has(id),
        );
        // Lo que hizo una sola persona no lo vio nadie más: nunca es público.
        return {
          time: texto(e.time),
          description: texto(e.description),
          participanteIds,
          isPublic: e.isPublic === true && participanteIds.length !== 1,
        };
      });
    if (cronologia.length > 0) {
      if (cronologia.length < Math.min(6, plot.timeline.length)) {
        rechazados.push(`cronología: la nueva tenía ${cronologia.length} momentos y la de antes ${plot.timeline.length}`);
      } else {
        plot.timeline = cronologia;
        aplicados.push('cronología');
      }
    }

    const guion = (cambios.guion ?? []).map(texto).filter(Boolean);
    if (guion.length > 0) {
      if (guion.length < Math.min(4, plot.gmScript.length)) {
        rechazados.push('guion del Game Master: el nuevo tenía demasiados pocos pasos');
      } else {
        plot.gmScript = guion;
        aplicados.push('guion del Game Master');
      }
    }
  }

  // ---- Material ----
  const material = plot.material;
  if (material) {
    for (const n of cambios.narraciones ?? []) {
      const ronda = Math.round(Number(n?.round));
      const textoNuevo = texto(n?.text);
      if (!Number.isInteger(ronda) || ronda < 0 || ronda > rondas || !textoNuevo) continue;
      const indice = material.narrations.findIndex((x) => x.round === ronda);
      const limpia: PlotNarration = {
        round: ronda,
        title: texto(n.title) || material.narrations[indice]?.title || `Ronda ${ronda}`,
        text: textoNuevo,
        stageDirection: texto(n.stageDirection),
      };
      if (indice >= 0) {
        if (textoNuevo.length < material.narrations[indice]!.text.length * SUELO_DE_LARGO) {
          rechazados.push(`narración de la ronda ${ronda}: la nueva era menos de la mitad de larga`);
          continue;
        }
        material.narrations[indice] = limpia;
      } else {
        material.narrations.push(limpia);
        material.narrations.sort((a, b) => a.round - b.round);
      }
      aplicados.push(ronda === 0 ? 'narración de apertura' : `narración de la ronda ${ronda}`);
    }

    for (const g of cambios.giros ?? []) {
      const quien = texto(g?.participanteId);
      const instruccion = texto(g?.instruction);
      if (!idsPersonas.has(quien) || !instruccion) continue;
      if (quien === culpable) {
        rechazados.push('un giro para la persona culpable: se delataría sola');
        continue;
      }
      const ronda = Math.min(Math.max(Math.round(Number(g.round)) || 2, 1), rondas);
      const indice = material.twists.findIndex((x) => x.id === texto(g.id));
      if (indice >= 0) {
        material.twists[indice] = { id: material.twists[indice]!.id, participanteId: quien, round: ronda, instruction: instruccion };
        aplicados.push(`giro «${material.twists[indice]!.id}»`);
      } else if (material.twists.some((x) => x.participanteId === quien)) {
        rechazados.push(`giro nuevo para ${quien}: ya tenía uno`);
      } else {
        const usados = new Set(material.twists.map((x) => x.id));
        let id = texto(g.id);
        for (let n = 1; !id || usados.has(id); n++) id = `giro-extra-${n}`;
        material.twists.push({ id, participanteId: quien, round: ronda, instruction: instruccion });
        aplicados.push(`giro nuevo «${id}»`);
      }
    }
    for (const retirado of cambios.girosRetirados ?? []) {
      const antes = material.twists.length;
      material.twists = material.twists.filter((x) => x.id !== retirado);
      if (material.twists.length < antes) aplicados.push(`giro retirado «${retirado}»`);
    }
    // Al menos un inocente sin giro: si no, el único sin sobre es quien lo hizo.
    const inocentes = sospechososDe(game).filter((s) => s.id !== culpable);
    while (
      material.twists.length > 0 &&
      inocentes.every((s) => material.twists.some((g) => g.participanteId === s.id))
    ) {
      const quitado = material.twists.pop()!;
      rechazados.push(`giro «${quitado.id}»: con él todos los inocentes tenían sobre y la persona culpable no`);
    }

    for (const r of cambios.revelaciones ?? []) {
      const ronda = Math.round(Number(r?.round));
      const hecho = texto(r?.fact);
      if (!Number.isInteger(ronda) || ronda < 1 || ronda > rondas || !hecho) continue;
      const indice = material.timelineReveals.findIndex((x) => x.round === ronda);
      const limpia: TimelineReveal = { round: ronda, time: texto(r.time) || material.timelineReveals[indice]?.time || '', fact: hecho };
      if (indice >= 0) material.timelineReveals[indice] = limpia;
      else {
        material.timelineReveals.push(limpia);
        material.timelineReveals.sort((a, b) => a.round - b.round);
      }
      aplicados.push(`hecho establecido de la ronda ${ronda}`);
    }

    for (const a of cambios.ayudas ?? []) {
      const nivel = Math.round(Number(a?.level));
      const t = texto(a?.text);
      if (![1, 2, 3].includes(nivel) || !t) continue;
      const indice = material.hints.findIndex((x) => x.level === nivel);
      if (indice >= 0) material.hints[indice] = { level: nivel, text: t };
      else material.hints.push({ level: nivel, text: t });
      aplicados.push(`ayuda de nivel ${nivel}`);
    }

    const desenlace = cambios.desenlace;
    if (desenlace) {
      sustituir('reconstrucción final', material.finale.reconstruction, desenlace.reconstruction, (v) => (material.finale.reconstruction = v));
      sustituir('confesión', material.finale.confession, desenlace.confession, (v) => (material.finale.confession = v));
      sustituir('epílogo', material.finale.epilogue, desenlace.epilogue, (v) => (material.finale.epilogue = v));
    }
  }

  return { plot, aplicados, rechazados };
}

/** Cuántas pistas hay en cada sala y en cada ronda: para comprobar que nada se queda vacío. */
export function repartoDePistas(plot: Plot): { porSala: Map<string, number>; porRonda: Map<number, number> } {
  const porSala = new Map<string, number>();
  const porRonda = new Map<number, number>();
  for (const p of pistasDeLaTrama(plot)) {
    if (p.lugarId) porSala.set(p.lugarId, (porSala.get(p.lugarId) ?? 0) + 1);
    porRonda.set(p.round, (porRonda.get(p.round) ?? 0) + 1);
  }
  return { porSala, porRonda };
}
