/**
 * Lo que el revisor de la Momia puede cambiar, y cómo se aplica.
 *
 * SOLO PROSA, Y PASADA POR LOS MISMOS FILTROS QUE LA GENERACIÓN, como en las
 * Sombras. Lo que decide la noche —el orden de los ritos, qué dice cada
 * fragmento, qué cámara se profana cada vigilia, quién rompió el sello, los
 * dones— no se nombra aquí y no hay forma de que entre.
 *
 * Lo que sí entra se comprueba con el código de `momia-validacion.ts`: que no
 * diga el orden, ni entero ni a trozos (un revisor que lo conoce lo puede soltar
 * sin querer), que no señale a quien rompió el sello, que una narración no
 * adelante la cámara de mañana. Las frases de los fragmentos, solo si
 * `comprobarRedaccion` puede afirmar que dicen su restricción. Y ningún dosier
 * que no quepa en su papel: el sobre más gordo se ve.
 *
 * Cada texto entra solo si no empobrece el que había (la mitad de su largo como
 * mínimo). Se trabaja sobre una COPIA.
 */
import type { GameSession, Plot } from '../../../shared/types';
import type { TramaMomia } from '../../../shared/juegos/momia-tipos';
import { entidadesDeLaMomia, tramaDe, type TramaMomiaConSabor } from './momia-generacion';
import { PRESUPUESTO_DE_CARA, carasDelDosier, nombresDePersona, ordenQueInsinua, vigiliaQueAdelanta } from './momia-auditoria';
import { comprobarRedaccion, lexicoDeRitos, nombraAlSaqueador, revelaElOrden, ritosMencionados, senalaAlSaqueador } from './momia-validacion';
import { textoAceptable } from './revision-comun';

export interface FichaDeLaMomia {
  participanteId: string;
  characterName: string;
  role: string;
  publicPersona: string;
  secret: string;
  motive: string;
  alibi: string;
  knowledge: string[];
  personalHook: string;
  elDon: string;
}

export interface CambiosDeLaMomia {
  titulo?: string;
  lema?: string;
  sinopsis?: string;
  ambientacion?: string;
  /** La narración de antes de empezar: la noche en que se rompió el sello. */
  apertura?: string;
  /** Quién fue el difunto. */
  faraon?: string;
  vigilias?: Array<{ ronda: number; titulo: string; texto: string; indicacion: string }>;
  camaras?: Array<{ camaraId: string; inscripcion: string }>;
  ritos?: Array<{ ritoId: string; invocacion: string; gesto: string }>;
  fragmentos?: Array<{ id: string; texto: string }>;
  ayudas?: Array<{ nivel: number; texto: string }>;
  reconstruccion?: string;
  confesion?: string;
  epilogo?: string;
  guion?: string[];
  // Segundo turno: los dosieres.
  fichas?: FichaDeLaMomia[];
  motivoDelSaqueo?: string;
  comoOcurrio?: string;
}

type Clase = 'sin-nombre' | 'ayuda' | 'publico' | 'compartido';

export function aplicarParchesMomia(
  game: GameSession,
  plotEntrante: Plot,
  cambios: CambiosDeLaMomia,
  _soloMaterial: boolean,
): { plot: Plot; aplicados: string[]; rechazados: string[] } {
  const plot = structuredClone(plotEntrante);
  const aplicados: string[] = [];
  const rechazados: string[] = [];
  const trama = tramaDe(plot) as (TramaMomia & Partial<TramaMomiaConSabor>) | undefined;
  if (!trama) return { plot, aplicados, rechazados: ['no hay orden en esta trama: no se toca nada'] };

  const entidades = entidadesDeLaMomia(game);
  const lexico = lexicoDeRitos(entidades.ritos.map((r) => ({ id: r.id, name: r.name })));
  const nombreCamara = (id: string) => entidades.camaras.find((c) => c.id === id)?.name ?? id;
  const orden = trama.ordenVerdadero;
  const saqueadorId = String(plot.solution?.respuestas?.saqueador ?? '');
  const delSaqueador = nombresDePersona(game, plot, saqueadorId);
  const material = plot.material;
  const sabor = trama.sabor;

  /** Lo que un texto que se lee en la mesa no puede decir. Vacío si puede entrar. */
  function loQueDice(texto: string, clase: Clase, ronda?: number): string {
    if (revelaElOrden(texto, lexico, orden)) return 'enumera el orden de los ritos';
    const trozos = ordenQueInsinua(texto, lexico, orden);
    if (clase === 'ayuda' ? trozos.some((o) => !o.cierta) : trozos.length > 0) {
      return clase === 'ayuda' ? 'dice del orden algo que no es verdad' : 'dice un trozo del orden, como un fragmento regalado';
    }
    if (delSaqueador.length && senalaAlSaqueador(texto, delSaqueador)) return 'señala a quien rompió el sello';
    if ((clase === 'sin-nombre' || clase === 'ayuda') && delSaqueador.length && nombraAlSaqueador(texto, delSaqueador)) {
      return 'nombra a quien rompió el sello';
    }
    if (ronda !== undefined && vigiliaQueAdelanta(texto, ronda, trama!.profanadas, nombreCamara)) return 'adelanta la cámara de otra vigilia';
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
    ronda?: number,
  ): boolean {
    if (typeof nuevo !== 'string' || !nuevo.trim()) return false;
    const texto = textoAceptable(nuevo, viejo, minimo);
    if (!texto) {
      rechazados.push(`${nombre}: la versión nueva era demasiado corta`);
      return false;
    }
    const dice = clase === 'privado' ? '' : loQueDice(texto, clase, ronda);
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
    poner('el faraón', cambios.faraon, sabor.faraon.descripcion, 40, 'publico', (t) => {
      sabor.faraon.descripcion = t;
      if (plot.victim) plot.victim.description = t;
    });
  }

  // ---- Las narraciones ----
  if (material) {
    const apertura = material.narrations.find((n) => n.round === 0);
    poner('la apertura', cambios.apertura, apertura?.text, 80, 'sin-nombre', (t) => {
      if (apertura) apertura.text = t;
      else material.narrations.unshift({ round: 0, title: 'La noche en que se rompió el sello', text: t, stageDirection: '' });
    }, 0);
    for (const v of cambios.vigilias ?? []) {
      const ronda = Math.round(Number(v?.ronda));
      if (!(ronda >= 1 && ronda <= trama.profanadas.length)) {
        rechazados.push(`la narración de la vigilia ${v?.ronda}: esa vigilia no existe`);
        continue;
      }
      const suya = material.narrations.find((n) => n.round === ronda);
      poner(`la narración de la vigilia ${ronda}`, v.texto, suya?.text, 80, 'sin-nombre', (t) => {
        const titulo = typeof v.titulo === 'string' && v.titulo.trim().length >= 3 ? v.titulo.trim() : suya?.title ?? `Vigilia ${ronda}`;
        const indicacion = typeof v.indicacion === 'string' ? v.indicacion.trim() : suya?.stageDirection ?? '';
        if (suya) Object.assign(suya, { text: t, title: titulo, stageDirection: indicacion });
        else material.narrations.push({ round: ronda, title: titulo, text: t, stageDirection: indicacion });
      }, ronda);
    }
    material.narrations.sort((a, b) => a.round - b.round);
  }

  // ---- Los carteles de las cámaras y las invocaciones del sellado ----
  if (sabor) {
    for (const c of cambios.camaras ?? []) {
      const camara = entidades.camaras.find((x) => x.id === c?.camaraId);
      if (!camara) {
        rechazados.push(`el cartel de «${c?.camaraId}»: esa cámara no existe`);
        continue;
      }
      poner(`el cartel de ${camara.name}`, c.inscripcion, sabor.inscripciones[camara.id], 12, 'publico', (t) => (sabor.inscripciones[camara.id] = t));
    }
    // Se leen en la ceremonia del final, cuando el orden ya está decidido: solo se pide que no empobrezcan.
    for (const r of cambios.ritos ?? []) {
      const rito = entidades.ritos.find((x) => x.id === r?.ritoId);
      if (!rito) {
        rechazados.push(`el rito «${r?.ritoId}»: no existe`);
        continue;
      }
      const suyo = sabor.ritos[rito.id] ?? { invocacion: '', gesto: '' };
      poner(`la invocación de ${rito.name}`, r.invocacion, suyo.invocacion, 12, 'privado', (t) => (sabor.ritos[rito.id] = { ...suyo, invocacion: t }));
      poner(`el gesto de ${rito.name}`, r.gesto, sabor.ritos[rito.id]?.gesto, 8, 'privado', (t) => (sabor.ritos[rito.id] = { ...sabor.ritos[rito.id]!, gesto: t }));
    }
  }

  // ---- Las frases de los fragmentos: solo si se puede afirmar que dicen su restricción ----
  for (const f of cambios.fragmentos ?? []) {
    const lista = trama.restricciones.some((r) => r.id === f?.id) ? trama.restricciones : trama.falsasCandidatas;
    const i = lista.findIndex((r) => r.id === f?.id);
    if (i === -1) {
      rechazados.push(`el fragmento «${f?.id}»: no existe`);
      continue;
    }
    if (!lexico.fiable) {
      rechazados.push(`el fragmento «${f.id}»: los ritos no se distinguen por su nombre y ninguna frase se puede comprobar`);
      continue;
    }
    const texto = typeof f.texto === 'string' ? f.texto.trim() : '';
    const veredicto = comprobarRedaccion(lista[i]!.restriccion, texto, lexico);
    if (!veredicto.bien) {
      rechazados.push(`el fragmento «${f.id}»: ${veredicto.motivo ?? 'no dice su restricción'}`);
      continue;
    }
    lista[i] = { ...lista[i]!, texto };
    aplicados.push(`el fragmento «${f.id}»`);
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
      poner(`la ayuda de nivel ${nivel}`, a.texto, suya?.text, 30, 'ayuda', (t) => {
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
      const nombrados = ritosMencionados(nueva, lexico);
      if (lexico.fiable && nombrados.join('|') !== orden.join('|')) {
        rechazados.push('la reconstrucción: no dice los cinco ritos en su orden');
      } else if (delSaqueador.length && !nombraAlSaqueador(nueva, delSaqueador)) {
        rechazados.push('la reconstrucción: no dice quién rompió el sello');
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
      rechazados.push(`el dosier de «${f?.participanteId}»: no es nadie de la expedición`);
      continue;
    }
    const c = plot.characters[i]!;
    const quien = c.characterName;
    const antes = JSON.stringify(c);
    const donAntes = sabor?.elDon[c.participanteId];
    const hechos = aplicados.length;
    const desbordabaAntes = loQueDesborda(plot, c.participanteId);
    poner(`el nombre de ${quien}`, f.characterName, undefined, 3, 'privado', (t) => (c.characterName = t));
    if (typeof f.role === 'string' && f.role.trim().length > 80) {
      rechazados.push(`el oficio de ${quien}: es un oficio, no un párrafo`);
    } else {
      poner(`el oficio de ${quien}`, f.role, undefined, 3, 'publico', (t) => (c.role = t));
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
      poner(`el don de ${quien}`, f.elDon, sabor.elDon[c.participanteId], 10, 'privado', (t) => (sabor.elDon[c.participanteId] = t));
    }
    // Y QUE QUEPA EN SU PAPEL: un dosier que el cambio desborda no entra.
    const desborda = loQueDesborda(plot, c.participanteId);
    if (desborda && !desbordabaAntes) {
      Object.assign(c, JSON.parse(antes));
      if (sabor && donAntes !== undefined) sabor.elDon[c.participanteId] = donAntes;
      aplicados.splice(hechos);
      rechazados.push(`el dosier de ${quien}: con los cambios no cabría en sus caras (${desborda})`);
      continue;
    }
    if (JSON.stringify(c) === antes && !aplicados.some((a) => a.startsWith(`el don de ${quien}`))) {
      rechazados.push(`el dosier de ${quien}: nada utilizable`);
    }
  }
  if (plot.solution) {
    const motivo = typeof cambios.motivoDelSaqueo === 'string' ? cambios.motivoDelSaqueo.trim() : '';
    if (motivo.length > PRESUPUESTO_DE_CARA.motivoDelSaqueador) {
      rechazados.push(`el motivo de quien rompió el sello: no cabría en su cara (${motivo.length} de ${PRESUPUESTO_DE_CARA.motivoDelSaqueador})`);
    } else {
      poner('el motivo de quien rompió el sello', motivo, plot.solution.motive, 40, 'privado', (t) => (plot.solution.motive = t));
    }
    poner('cómo lo hizo', cambios.comoOcurrio, plot.solution.howItHappened, 40, 'privado', (t) => (plot.solution.howItHappened = t));
  }

  return { plot, aplicados, rechazados };
}

/** Qué cara del dosier de esta persona pasa de su presupuesto, en palabras; vacío si todas caben. */
function loQueDesborda(plot: Plot, id: string): string {
  const d = carasDelDosier(plot).find((x) => x.id === id);
  if (!d) return '';
  const p = PRESUPUESTO_DE_CARA;
  if (d.quienEres > p.quienEres) return `«quién eres», ${d.quienEres} de ${p.quienEres}`;
  if (d.secretos > p.secretos) return `«secreto, motivo y coartada», ${d.secretos} de ${p.secretos}`;
  if (d.conocimiento > p.conocimiento) return `«lo que sabe de otros», ${d.conocimiento} de ${p.conocimiento}`;
  return '';
}
