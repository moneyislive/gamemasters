/**
 * Lo que el revisor de las Sombras puede cambiar, y cómo se aplica.
 *
 * SOLO PROSA, Y PASADA POR LOS MISMOS FILTROS QUE LA GENERACIÓN. Lo que decide
 * la noche —la senda, qué dice cada mojón, dónde esperan los cazadores, quién
 * cobra de Akechi, los disfraces, las contraseñas, la carga— no se nombra aquí
 * y no hay forma de que entre.
 *
 * Lo que sí entra se comprueba con el código de `sombras-validacion.ts`, el
 * mismo que filtró la escritura del modelo: un revisor que conoce la senda y el
 * nombre puede soltarlos sin querer igual que el modelo que escribió, y aquí no
 * hay recambio que lo tape después. Así que lo que no pase no entra, y se queda
 * lo que había.
 *
 * Las frases de los mojones, con más motivo: se aceptan solo si
 * `comprobarRedaccion` puede afirmar que dicen su condición, exactamente como al
 * generar. Una frase bonita que no se puede verificar vale menos que una sosa
 * que sí.
 *
 * Y cada texto entra solo si no empobrece el que había (la mitad de su largo
 * como mínimo). Se trabaja sobre una COPIA.
 */
import type { GameSession, Plot } from '../../../shared/types';
import type { TramaSombras } from '../../../shared/juegos/sombras-tipos';
import { pasoBatido, tramaDe } from '../juegos/sombras-trama';
import { entidadesDeLasSombras, type TramaSombrasConSabor } from './sombras-generacion';
import { PRESUPUESTO_DE_CARA, carasDelDosier, nombresDePersona } from './sombras-auditoria';
import {
  anunciaEmboscada,
  comprobarRedaccion,
  lexicoDePasos,
  nombraAlKancho,
  pasosMencionados,
  revelaLaSenda,
  revelaLosCazadores,
  senalaAlKancho,
} from './sombras-validacion';
import { textoAceptable } from './revision-comun';

export interface FichaDeLasSombras {
  participanteId: string;
  characterName: string;
  role: string;
  publicPersona: string;
  secret: string;
  motive: string;
  alibi: string;
  knowledge: string[];
  personalHook: string;
  elDisfraz: string;
}

export interface CambiosDeLasSombras {
  titulo?: string;
  lema?: string;
  sinopsis?: string;
  ambientacion?: string;
  /** La narración de antes de empezar: lo que pasó desde que ardió el Honnō-ji. */
  apertura?: string;
  /** Quién es el señor. */
  senor?: string;
  horas?: Array<{ ronda: number; titulo: string; texto: string; indicacion: string }>;
  carteles?: Array<{ pasoId: string; inscripcion: string }>;
  hitos?: Array<{ id: string; texto: string }>;
  ayudas?: Array<{ nivel: number; texto: string }>;
  reconstruccion?: string;
  confesion?: string;
  epilogo?: string;
  guion?: string[];
  // Segundo turno: los dosieres.
  fichas?: FichaDeLasSombras[];
  motivoDelKancho?: string;
  comoOcurrio?: string;
}

type Clase = 'sin-nombre' | 'publico' | 'compartido';

export function aplicarParchesSombras(
  game: GameSession,
  plotEntrante: Plot,
  cambios: CambiosDeLasSombras,
  _soloMaterial: boolean,
): { plot: Plot; aplicados: string[]; rechazados: string[] } {
  const plot = structuredClone(plotEntrante);
  const aplicados: string[] = [];
  const rechazados: string[] = [];
  const trama = tramaDe(plot) as (TramaSombras & Partial<TramaSombrasConSabor>) | undefined;
  if (!trama) return { plot, aplicados, rechazados: ['no hay senda en esta trama: no se toca nada'] };

  const pasos = entidadesDeLasSombras(game).pasos;
  const lexico = lexicoDePasos(pasos.map((p) => ({ id: p.id, name: p.name })));
  const senda = trama.sendaVerdadera;
  const kanchoId = String(plot.solution?.respuestas?.kancho ?? '');
  const delKancho = nombresDePersona(game, plot, kanchoId);
  const material = plot.material;
  const sabor = trama.sabor;

  /** Lo que un texto que se lee en la mesa no puede decir. Vacío si puede entrar. */
  function loQueDice(texto: string, clase: Clase, extra: { ronda?: number; cartel?: boolean } = {}): string {
    if (revelaLaSenda(texto, lexico, senda)) return 'enumera la senda';
    const nombrados = pasosMencionados(texto, lexico);
    if (nombrados.length === senda.length && senda.every((p) => nombrados.includes(p))) return 'nombra justo los pasos de la senda';
    if (delKancho.length && senalaAlKancho(texto, delKancho)) return 'señala a quien cobra de Akechi';
    if (clase === 'sin-nombre' && delKancho.length && nombraAlKancho(texto, delKancho)) return 'nombra a quien cobra de Akechi';
    if (extra.ronda && revelaLosCazadores(texto, lexico, pasoBatido(trama!.batidos, extra.ronda))) return 'dice dónde esperan los cazadores';
    if (extra.cartel && anunciaEmboscada(texto)) return 'anuncia una emboscada';
    return '';
  }

  /** Pone un texto si es utilizable, no empobrece y no dice lo que no puede. */
  function poner(
    nombre: string,
    nuevo: unknown,
    viejo: string | undefined,
    minimo: number,
    clase: Clase | 'privado',
    aplicar: (texto: string) => void,
    extra: { ronda?: number; cartel?: boolean } = {},
  ): boolean {
    if (typeof nuevo !== 'string' || !nuevo.trim()) return false;
    const texto = textoAceptable(nuevo, viejo, minimo);
    if (!texto) {
      rechazados.push(`${nombre}: la versión nueva era demasiado corta`);
      return false;
    }
    const dice = clase === 'privado' ? '' : loQueDice(texto, clase, extra);
    if (dice) {
      rechazados.push(`${nombre}: ${dice}`);
      return false;
    }
    aplicar(texto);
    aplicados.push(nombre);
    return true;
  }

  // ---- La cabecera ----
  poner('el título', cambios.titulo, plot.title, 4, 'sin-nombre', (t) => (plot.title = t));
  poner('el lema', cambios.lema, plot.tagline, 12, 'sin-nombre', (t) => (plot.tagline = t));
  poner('la sinopsis', cambios.sinopsis, plot.synopsis, 80, 'sin-nombre', (t) => (plot.synopsis = t));
  poner('la ambientación', cambios.ambientacion, plot.setting, 40, 'sin-nombre', (t) => (plot.setting = t));
  if (sabor) {
    poner('el señor', cambios.senor, sabor.senor.descripcion, 40, 'publico', (t) => {
      sabor.senor.descripcion = t;
      if (plot.victim) plot.victim.description = t;
    });
  }

  // ---- Las narraciones ----
  if (material) {
    const apertura = material.narrations.find((n) => n.round === 0);
    poner('la apertura', cambios.apertura, apertura?.text, 80, 'sin-nombre', (t) => {
      if (apertura) apertura.text = t;
      else material.narrations.unshift({ round: 0, title: 'La noche en que ardió el Honnō-ji', text: t, stageDirection: '' });
    });
    for (const h of cambios.horas ?? []) {
      const ronda = Math.round(Number(h?.ronda));
      if (!(ronda >= 1 && ronda <= trama.batidos.length)) {
        rechazados.push(`la narración de la hora ${h?.ronda}: esa hora no existe`);
        continue;
      }
      const suya = material.narrations.find((n) => n.round === ronda);
      poner(`la narración de la hora ${ronda}`, h.texto, suya?.text, 80, 'sin-nombre', (t) => {
        const titulo = typeof h.titulo === 'string' && h.titulo.trim().length >= 3 ? h.titulo.trim() : suya?.title ?? `Hora ${ronda}`;
        const indicacion = typeof h.indicacion === 'string' ? h.indicacion.trim() : suya?.stageDirection ?? '';
        if (suya) Object.assign(suya, { text: t, title: titulo, stageDirection: indicacion });
        else material.narrations.push({ round: ronda, title: titulo, text: t, stageDirection: indicacion });
      }, { ronda });
    }
    material.narrations.sort((a, b) => a.round - b.round);
  }

  // ---- Los carteles de las puertas ----
  if (sabor) {
    for (const c of cambios.carteles ?? []) {
      const paso = pasos.find((p) => p.id === c?.pasoId);
      if (!paso) {
        rechazados.push(`el cartel de «${c?.pasoId}»: ese paso no existe`);
        continue;
      }
      poner(`el cartel de ${paso.name}`, c.inscripcion, sabor.inscripciones[paso.id], 12, 'publico', (t) => (sabor.inscripciones[paso.id] = t), { cartel: true });
    }
  }

  // ---- Las frases de los mojones: solo si se puede afirmar que dicen su condición ----
  for (const h of cambios.hitos ?? []) {
    const lista = trama.condiciones.some((c) => c.id === h?.id) ? trama.condiciones : trama.falsasCandidatas;
    const i = lista.findIndex((c) => c.id === h?.id);
    if (i === -1) {
      rechazados.push(`el mojón «${h?.id}»: no existe`);
      continue;
    }
    if (!lexico.fiable) {
      rechazados.push(`el mojón «${h.id}»: los pasos no se distinguen por su nombre y ninguna frase se puede comprobar`);
      continue;
    }
    const texto = typeof h.texto === 'string' ? h.texto.trim() : '';
    const veredicto = comprobarRedaccion(lista[i]!.condicion, texto, lexico);
    if (!veredicto.bien) {
      rechazados.push(`el mojón «${h.id}»: ${veredicto.motivo ?? 'no dice su condición'}`);
      continue;
    }
    lista[i] = { ...lista[i]!, texto };
    aplicados.push(`el mojón «${h.id}»`);
  }

  // ---- Las ayudas ----
  if (material) {
    for (const a of cambios.ayudas ?? []) {
      const nivel = Math.round(Number(a?.nivel));
      if (!(nivel >= 1 && nivel <= 3)) {
        rechazados.push(`la ayuda de nivel ${a?.nivel}: no existe ese nivel`);
        continue;
      }
      const suya = material.hints.find((x) => x.level === nivel);
      const texto = typeof a.texto === 'string' ? a.texto.trim() : '';
      const nombrados = pasosMencionados(texto, lexico);
      if (nombrados.filter((p) => senda.includes(p)).length >= 3) {
        rechazados.push(`la ayuda de nivel ${nivel}: nombra tres o más pasos de la senda`);
        continue;
      }
      if (nombrados.length === 1 && lexico.fiable) {
        const paso = nombrados[0]!;
        const diceQueNo = comprobarRedaccion({ tipo: 'no-pasa-por', a: paso }, texto, lexico).bien;
        const diceQueSi = comprobarRedaccion({ tipo: 'pasa-por', a: paso }, texto, lexico).bien;
        if ((diceQueNo && senda.includes(paso)) || (diceQueSi && !senda.includes(paso))) {
          rechazados.push(`la ayuda de nivel ${nivel}: dice de ${pasos.find((p) => p.id === paso)?.name ?? paso} lo contrario de lo que es`);
          continue;
        }
      }
      poner(`la ayuda de nivel ${nivel}`, texto, suya?.text, 30, 'sin-nombre', (t) => {
        if (suya) suya.text = t;
        else material.hints.push({ level: nivel, text: t });
      });
    }
    material.hints.sort((a, b) => a.level - b.level);
  }

  // ---- El desenlace: aquí sí se dice todo, y tiene que ser verdad ----
  if (material) {
    const nueva = typeof cambios.reconstruccion === 'string' ? cambios.reconstruccion.trim() : '';
    if (nueva) {
      const nombrados = pasosMencionados(nueva, lexico).filter((p) => senda.includes(p));
      if (lexico.fiable && nombrados.join('|') !== senda.join('|')) {
        rechazados.push('la reconstrucción: no dice la senda entera y en su orden');
      } else if (delKancho.length && !nombraAlKancho(nueva, delKancho)) {
        rechazados.push('la reconstrucción: no dice quién cobraba de Akechi');
      } else {
        poner('la reconstrucción', nueva, material.finale.reconstruction, 120, 'privado', (t) => (material.finale.reconstruction = t));
      }
    }
    poner('la confesión', cambios.confesion, material.finale.confession, 120, 'privado', (t) => (material.finale.confession = t));
    poner('el epílogo', cambios.epilogo, material.finale.epilogue, 80, 'privado', (t) => (material.finale.epilogue = t));
  }

  // ---- El guion: entero o nada ----
  if (cambios.guion?.length) {
    const lineas = cambios.guion.map((l) => String(l).trim()).filter((l) => l.length >= 25);
    const antes = (plot.gmScript ?? []).join(' ').length;
    const mala = lineas.map((l) => loQueDice(l, 'sin-nombre')).find(Boolean);
    if (mala) rechazados.push(`el guion: una línea ${mala}`);
    else if (lineas.length >= 3 && lineas.join(' ').length >= antes * 0.5) {
      plot.gmScript = lineas;
      aplicados.push('el guion');
    } else rechazados.push('el guion: menos de tres líneas utilizables, o mucho más corto que el que había');
  }

  // ---- Los dosieres ----
  for (const f of cambios.fichas ?? []) {
    const i = plot.characters.findIndex((c) => c.participanteId === f?.participanteId);
    if (i === -1) {
      rechazados.push(`el dosier de «${f?.participanteId}»: no es nadie de la columna`);
      continue;
    }
    const c = plot.characters[i]!;
    const quien = c.characterName;
    const antes = JSON.stringify(c);
    const disfrazAntes = sabor?.elDisfraz[c.participanteId];
    const hechos = aplicados.length;
    const desbordabaAntes = loQueDesborda(game, plot, c.participanteId);
    poner(`el nombre de ${quien}`, f.characterName, undefined, 3, 'privado', (t) => (c.characterName = t));
    if (typeof f.role === 'string' && f.role.trim().length > 80) {
      rechazados.push(`el puesto de ${quien}: es un oficio, no un párrafo`);
    } else {
      poner(`el puesto de ${quien}`, f.role, undefined, 3, 'publico', (t) => (c.role = t));
    }
    poner(`la presentación de ${quien}`, f.publicPersona, c.publicPersona, 40, 'publico', (t) => (c.publicPersona = t));
    poner(`el secreto de ${quien}`, f.secret, c.secret, 30, 'privado', (t) => (c.secret = t));
    poner(`el motivo de ${quien}`, f.motive, c.motive, 20, 'privado', (t) => (c.motive = t));
    poner(`la coartada de ${quien}`, f.alibi, c.alibi, 20, 'compartido', (t) => (c.alibi = t));
    poner(`el gancho de ${quien}`, f.personalHook, c.personalHook, 20, 'privado', (t) => (c.personalHook = t));
    if (Array.isArray(f.knowledge) && f.knowledge.length) {
      const buenas = f.knowledge.map((k) => String(k).trim()).filter((k) => k.length >= 15 && !loQueDice(k, 'compartido'));
      const viejas = (c.knowledge ?? []).join(' ').length;
      if (buenas.length && buenas.join(' ').length >= viejas * 0.5) {
        c.knowledge = buenas;
        aplicados.push(`lo que ${quien} sabe de otros`);
      } else rechazados.push(`lo que ${quien} sabe de otros: nada utilizable, o mucho más corto que lo que había`);
    }
    if (sabor) {
      poner(`el disfraz de ${quien}`, f.elDisfraz, sabor.elDisfraz[c.participanteId], 10, 'privado', (t) => (sabor.elDisfraz[c.participanteId] = t));
    }
    /*
     * Y QUE QUEPA EN SU PAPEL. Un dosier que no cabía antes y ahora sí, o que
     * cabe igual, entra; uno que el cambio desborda, no: su sobre llevaría una
     * hoja más que los demás, y si es el del kanchō, sería el más gordo.
     */
    const desborda = loQueDesborda(game, plot, c.participanteId);
    if (desborda && !desbordabaAntes) {
      Object.assign(c, JSON.parse(antes));
      if (sabor && disfrazAntes !== undefined) sabor.elDisfraz[c.participanteId] = disfrazAntes;
      aplicados.splice(hechos);
      rechazados.push(`el dosier de ${quien}: con los cambios no cabría en sus caras (${desborda})`);
      continue;
    }
    if (JSON.stringify(c) === antes && !aplicados.some((a) => a.startsWith(`el disfraz de ${quien}`))) {
      rechazados.push(`el dosier de ${quien}: nada utilizable`);
    }
  }
  if (plot.solution) {
    const motivo = typeof cambios.motivoDelKancho === 'string' ? cambios.motivoDelKancho.trim() : '';
    if (motivo.length > PRESUPUESTO_DE_CARA.motivoDelKancho) {
      rechazados.push(`el motivo de quien cobra de Akechi: no cabría en su cara (${motivo.length} de ${PRESUPUESTO_DE_CARA.motivoDelKancho})`);
    } else {
      poner('el motivo de quien cobra de Akechi', motivo, plot.solution.motive, 40, 'privado', (t) => (plot.solution.motive = t));
    }
    poner('cómo se vendió', cambios.comoOcurrio, plot.solution.howItHappened, 40, 'privado', (t) => (plot.solution.howItHappened = t));
  }

  return { plot, aplicados, rechazados };
}

/** Qué cara del dosier de esta persona pasa de su presupuesto, en palabras; vacío si todas caben. */
function loQueDesborda(game: GameSession, plot: Plot, id: string): string {
  const d = carasDelDosier(game, plot).find((x) => x.id === id);
  if (!d) return '';
  const p = PRESUPUESTO_DE_CARA;
  if (d.quienEres > p.quienEres) return `«quién eres», ${d.quienEres} de ${p.quienEres}`;
  if (d.secretos > p.secretos) return `«secreto, motivo y coartada», ${d.secretos} de ${p.secretos}`;
  if (d.conocimiento > p.conocimiento) return `«lo que sabe de otros», ${d.conocimiento} de ${p.conocimiento}`;
  return '';
}
