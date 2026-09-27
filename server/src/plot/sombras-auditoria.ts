/**
 * La auditoría de El Paso de las Sombras: lo que se puede contar, contado con código.
 *
 * Dos cosas pueden estropear una noche de las Sombras, y son de naturaleza
 * distinta:
 *
 *   · LA SENDA. La decide el código y la garantiza el código (una sola senda,
 *     nadie la saca solo, las mentiras son mentira). Lo que la prosa puede
 *     hacer es DECIRLA —enumerarla en una narración, soltarla en una ayuda— o
 *     decir dónde esperan los cazadores, que apaga la única decisión de cada
 *     hora. Y el desenlace, que sí tiene que decirla, puede decir otra.
 *   · QUIEN COBRA DE AKECHI. Lo elige el modelo y lo esconde la prosa. Aquí se
 *     cuenta lo que delata sin que nadie lo diga: que sea el único del que nadie
 *     habla, que su presentación sea más corta o más larga que las demás, que
 *     sea el único sin nada que contar de los otros. La pregunta de fondo —¿lo
 *     señala la mesa leyendo?— la contesta el lector ciego; esto son los
 *     síntomas que se ven sin gastar nada.
 *
 * Y lo que la generación tuvo que tapar: cada texto que `ensamblarTramaSombras`
 * sustituyó por su recambio sigue ahí, y un recambio en una narración es a la
 * vez un hueco y una marca —aparece justo donde el texto nombraba al kanchō—.
 */
import type { GameSession, GravedadDeHallazgo, HallazgoDeRevision, Plot } from '../../../shared/types';
import { cumpleCondicion, sendasDe, type TramaSombras } from '../../../shared/juegos/sombras-tipos';
import { pasoBatido, tramaDe } from '../juegos/sombras-trama';
import { redactarHito } from '../juegos/sombras-senda';
import {
  DOSIER_MINIMO,
  RECAMBIO_INSCRIPCION,
  RECAMBIO_OFICIO,
  RECAMBIO_PUBLICO,
  entidadesDeLasSombras,
  saborDe,
} from './sombras-generacion';
import {
  anunciaEmboscada,
  comprobarRedaccion,
  lexicoDePasos,
  nombraAlKancho,
  normalizar,
  pasosMencionados,
  revelaLaSenda,
  revelaLosCazadores,
  senalaAlKancho,
  type LexicoDePasos,
} from './sombras-validacion';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function hallazgo(codigo: string, gravedad: GravedadDeHallazgo, texto: string, sobre?: string): HallazgoDeRevision {
  return { codigo, gravedad, origen: 'auditoria', texto, estado: 'pendiente', ...(sobre ? { sobre } : {}) };
}

const palabras = (texto: string): Set<string> => new Set(normalizar(texto).split(' ').filter((p) => p.length > 3));

function parecido(a: string, b: string): number {
  const pa = palabras(a);
  const pb = palabras(b);
  if (pa.size === 0 || pb.size === 0) return 0;
  let comunes = 0;
  for (const p of pa) if (pb.has(p)) comunes++;
  return comunes / Math.min(pa.size, pb.size);
}

const mediana = (xs: number[]): number => {
  const o = [...xs].sort((a, b) => a - b);
  return o.length ? o[Math.floor(o.length / 2)]! : 0;
};

/** Las formas en que la prosa nombra a una persona: su nombre real y su nombre de personaje. */
export function nombresDePersona(game: GameSession, plot: Plot, id: string): string[] {
  const real = entidadesDeLasSombras(game).escoltas.find((e) => e.id === id)?.name ?? '';
  const personaje = plot.characters.find((c) => c.participanteId === id)?.characterName ?? '';
  return [real, personaje].filter(Boolean);
}

/** Qué pasos de la senda nombra un texto, y si los nombra todos (en el orden que sea). */
function cuantosDeLaSenda(texto: string, lexico: LexicoDePasos, senda: string[]): number {
  const nombrados = new Set(pasosMencionados(texto, lexico));
  return senda.filter((p) => nombrados.has(p)).length;
}

// ---------------------------------------------------------------------------
// Los textos, por lo que se puede decir en cada uno
// ---------------------------------------------------------------------------

/**
 * `sin-nombre`: lo que lee toda la mesa y donde el kanchō no puede ni salir
 * (la sinopsis, las narraciones, las ayudas…). `publico`: lo que lee todo el
 * mundo y donde los nombres salen con naturalidad (la presentación de cada
 * cual, la cronología pública, los carteles). `compartido`: lo que está en un
 * dosier pero se cuenta en la mesa (lo que cada cual sabe de los demás, la
 * coartada). `privado`: lo que solo lee su dueño. `desenlace`: lo que se lee
 * al abrir el pliego, donde sí se dice todo.
 */
export type ClaseDeTexto = 'sin-nombre' | 'publico' | 'compartido' | 'privado' | 'desenlace';

export interface TextoDeLaNoche {
  donde: string;
  texto: string;
  clase: ClaseDeTexto;
  sobre?: string;
  /** Para las narraciones: de qué hora es. */
  ronda?: number;
}

export function textosDeLasSombras(game: GameSession, plot: Plot): TextoDeLaNoche[] {
  const sabor = saborDe(plot);
  const pasos = entidadesDeLasSombras(game).pasos;
  const material = plot.material;
  const textos: TextoDeLaNoche[] = [
    { donde: 'el título', texto: plot.title ?? '', clase: 'sin-nombre' },
    { donde: 'el lema', texto: plot.tagline ?? '', clase: 'sin-nombre' },
    { donde: 'la sinopsis', texto: plot.synopsis ?? '', clase: 'sin-nombre' },
    { donde: 'la ambientación', texto: plot.setting ?? '', clase: 'sin-nombre' },
    { donde: 'el señor', texto: sabor?.senor.descripcion ?? '', clase: 'publico' },
    ...(material?.narrations ?? []).map((n) => ({
      donde: n.round === 0 ? 'la apertura' : `la narración de la hora ${n.round}`,
      texto: n.text ?? '',
      clase: 'sin-nombre' as const,
      sobre: `hora-${n.round}`,
      ronda: n.round,
    })),
    ...(material?.hints ?? []).map((h) => ({
      donde: `la ayuda de nivel ${h.level}`,
      texto: h.text ?? '',
      clase: 'sin-nombre' as const,
      sobre: `ayuda-${h.level}`,
    })),
    ...(plot.gmScript ?? []).map((texto, i) => ({ donde: `la línea ${i + 1} del guion`, texto, clase: 'sin-nombre' as const })),
    ...pasos.map((p) => ({
      donde: `el cartel de ${p.name}`,
      texto: sabor?.inscripciones[p.id] ?? '',
      clase: 'publico' as const,
      sobre: `cartel-${p.id}`,
    })),
    ...(plot.timeline ?? []).map((e) => ({
      donde: `la cronología de las ${e.time}`,
      texto: e.description ?? '',
      clase: e.isPublic ? ('publico' as const) : ('privado' as const),
    })),
    ...plot.characters.flatMap((c) => [
      { donde: `el puesto de ${c.characterName}`, texto: c.role ?? '', clase: 'publico' as const, sobre: c.participanteId },
      { donde: `la presentación de ${c.characterName}`, texto: c.publicPersona ?? '', clase: 'publico' as const, sobre: c.participanteId },
      { donde: `la coartada de ${c.characterName}`, texto: c.alibi ?? '', clase: 'compartido' as const, sobre: c.participanteId },
      ...(c.knowledge ?? []).map((k, i) => ({
        donde: `lo que ${c.characterName} sabe de otros (${i + 1})`,
        texto: k,
        clase: 'compartido' as const,
        sobre: c.participanteId,
      })),
      { donde: `el secreto de ${c.characterName}`, texto: c.secret ?? '', clase: 'privado' as const, sobre: c.participanteId },
      { donde: `el motivo de ${c.characterName}`, texto: c.motive ?? '', clase: 'privado' as const, sobre: c.participanteId },
      { donde: `el gancho de ${c.characterName}`, texto: c.personalHook ?? '', clase: 'privado' as const, sobre: c.participanteId },
    ]),
    { donde: 'la reconstrucción', texto: material?.finale.reconstruction ?? '', clase: 'desenlace' },
    { donde: 'la confesión', texto: material?.finale.confession ?? '', clase: 'desenlace' },
    { donde: 'el epílogo', texto: material?.finale.epilogue ?? '', clase: 'desenlace' },
  ];
  return textos.filter((t) => t.texto.trim());
}

// ---------------------------------------------------------------------------
// Lo que hace distinto a quien cobra de Akechi
// ---------------------------------------------------------------------------

export interface RasgosDePersona {
  id: string;
  nombre: string;
  /** Caracteres del puesto y la presentación: lo que se imprime en el dosier de todos. */
  presentacion: number;
  /** Cuántas cosas cuenta de los demás. */
  cuenta: number;
  /** ¿Su coartada nombra a otra persona, como se pide? */
  coartadaCruzada: boolean;
  /** En cuántos textos ajenos que se oyen en la mesa sale su nombre. */
  laNombran: number;
}

export function rasgosDeLaColumna(game: GameSession, plot: Plot): RasgosDePersona[] {
  const ids = plot.characters.map((c) => c.participanteId);
  const nombres = new Map(ids.map((id) => [id, nombresDePersona(game, plot, id)]));
  const oidos = textosDeLasSombras(game, plot).filter((t) => t.clase === 'publico' || t.clase === 'compartido' || t.clase === 'sin-nombre');
  return plot.characters.map((c) => {
    const id = c.participanteId;
    const propios = nombres.get(id) ?? [];
    const otros = ids.filter((x) => x !== id).flatMap((x) => nombres.get(x) ?? []);
    return {
      id,
      nombre: c.characterName,
      presentacion: `${c.role ?? ''} ${c.publicPersona ?? ''}`.trim().length,
      cuenta: (c.knowledge ?? []).filter((k) => k.trim()).length,
      coartadaCruzada: otros.length > 0 && nombraAlKancho(c.alibi ?? '', otros),
      laNombran: oidos.filter((t) => t.sobre !== id && nombraAlKancho(t.texto, propios)).length,
    };
  });
}

// ---------------------------------------------------------------------------
// Lo que cabe en cada cara del dosier impreso
// ---------------------------------------------------------------------------

/**
 * Caracteres que caben en cada cara del dosier que cambia de una persona a otra.
 *
 * Medidos el 25-sep-2026 con Edge imprimiendo a PDF (`scripts/medir-paginas.ts`)
 * sobre el dosier de seis caras: con 1430 caracteres la primera cara mide 805 px
 * de los 1009 que caben; con 1690, la segunda, 837; con 900 de motivo, la cara
 * del kanchō, 877. Los presupuestos dejan margen para la letra y los saltos de
 * línea de un texto de verdad.
 *
 * Pasarse no rompe la noche: desborda esa cara a la siguiente, y ese sobre lleva
 * una hoja más que los demás. Si es el de quien cobra de Akechi, es el sobre
 * más gordo de la mesa, y eso sí la rompe.
 */
export const PRESUPUESTO_DE_CARA = {
  /** Quién eres: presentación, gancho, blasón y por qué lleva su disfraz. */
  quienEres: 1600,
  /** Secreto, lo que ganaría y lo que declaró. */
  secretos: 1800,
  /** Lo que sabe de los demás. */
  conocimiento: 1400,
  /** El motivo del kanchō, en la única cara que solo tiene él. */
  motivoDelKancho: 1100,
} as const;

export interface CarasDelDosier {
  id: string;
  nombre: string;
  quienEres: number;
  secretos: number;
  conocimiento: number;
}

export function carasDelDosier(game: GameSession, plot: Plot): CarasDelDosier[] {
  const trama = tramaDe(plot);
  const sabor = saborDe(plot);
  const estandartes = entidadesDeLasSombras(game).estandartes;
  return plot.characters.map((c) => {
    const blason = estandartes.find((e) => e.id === trama?.estandartes[c.participanteId]);
    return {
      id: c.participanteId,
      nombre: c.characterName,
      quienEres: [c.publicPersona, c.personalHook, blason?.name, blason?.description, sabor?.elDisfraz[c.participanteId]]
        .filter(Boolean)
        .join(' ').length,
      secretos: [c.secret, c.motive, c.alibi].filter(Boolean).join(' ').length,
      conocimiento: (c.knowledge ?? []).join(' ').length,
    };
  });
}

// ---------------------------------------------------------------------------
// La auditoría
// ---------------------------------------------------------------------------

/** Los avisos de la senda y su lógica: los decide el código y ningún parche de prosa los toca. */
export const AVISOS_DE_LA_SENDA = new Set(['sin-senda', 'senda-rota', 'mentira-cierta', 'sin-mentiras', 'hito-sin-sitio', 'pasos-indistinguibles']);

export interface AuditoriaSombras {
  kanchoId: string;
  rasgos: RasgosDePersona[];
  /** Hitos cuya frase es la del código: correcta y sosa. */
  delCodigo: number;
  hallazgos: HallazgoDeRevision[];
}

export function auditarTramaSombras(game: GameSession, plot: Plot): AuditoriaSombras {
  const trama = tramaDe(plot) as TramaSombras | undefined;
  const kanchoId = String(plot.solution?.respuestas?.kancho ?? '');
  const salida: HallazgoDeRevision[] = [];
  if (!trama) {
    return {
      kanchoId,
      rasgos: [],
      delCodigo: 0,
      hallazgos: [hallazgo('sin-senda', 'bloqueante', 'La trama no trae la senda: no hay noche que jugar.')],
    };
  }

  const entidades = entidadesDeLasSombras(game);
  const pasos = entidades.pasos;
  const lexico = lexicoDePasos(pasos.map((p) => ({ id: p.id, name: p.name })));
  const nombrePaso = (id: string) => pasos.find((p) => p.id === id)?.name ?? id;
  const senda = trama.sendaVerdadera;
  const nombresDelKancho = nombresDePersona(game, plot, kanchoId);

  // ---- La senda y sus hitos ----
  const soluciones = sendasDe(pasos.map((p) => p.id), trama.condiciones.map((c) => c.condicion));
  if (soluciones.length !== 1 || soluciones[0]!.join('|') !== senda.join('|')) {
    salida.push(
      hallazgo(
        'senda-rota',
        'bloqueante',
        `Con los hitos de ahora salen ${soluciones.length} sendas y no la guardada: la noche no se puede resolver. ` +
          'Suele pasar al quitar o cambiar un paso después de generar.',
      ),
    );
  }
  if (!trama.falsasCandidatas.length) {
    salida.push(hallazgo('sin-mentiras', 'grave', 'No hay mojones falsos preparados: quien cobra de Akechi no tiene con qué mentir.'));
  }
  for (const f of trama.falsasCandidatas) {
    if (cumpleCondicion(senda, f.condicion)) {
      salida.push(hallazgo('mentira-cierta', 'grave', `El mojón falso «${f.id}» es cierto: la mentira del kanchō ayudaría a la mesa.`, f.id));
    }
  }
  const hallados = new Set(trama.hallazgos.map((h) => h.hitoId));
  for (const c of trama.condiciones) {
    if (!hallados.has(c.id)) {
      salida.push(hallazgo('hito-sin-sitio', 'bloqueante', `El hito «${c.id}» no aparece en ningún paso a ninguna hora: nadie lo leerá.`, c.id));
    }
  }
  if (!lexico.fiable) {
    salida.push(
      hallazgo(
        'pasos-indistinguibles',
        'grave',
        `Los pasos «${lexico.ambiguos.map(nombrePaso).join('», «')}» no se distinguen por su nombre: ninguna frase de mojón se ` +
          'puede comprobar, y todas se quedan con la redacción del código. Cambia sus nombres y vuelve a generar.',
      ),
    );
  }
  let delCodigo = 0;
  for (const h of [...trama.condiciones, ...trama.falsasCandidatas]) {
    if (h.texto === redactarHito(h.condicion, nombrePaso)) delCodigo++;
    else if (lexico.fiable && !comprobarRedaccion(h.condicion, h.texto, lexico).bien) {
      const cierto = trama.condiciones.some((c) => c.id === h.id);
      salida.push(
        hallazgo(
          'hito-desalineado',
          cierto ? 'bloqueante' : 'grave',
          `La frase del mojón «${h.id}» ya no dice su condición con los nombres de ahora: un paso cambió de nombre después de generar.`,
          h.id,
        ),
      );
    }
  }
  const pedidos = trama.condiciones.length + trama.falsasCandidatas.length;
  if (delCodigo > 0 && lexico.fiable) {
    salida.push(
      hallazgo(
        'hitos-del-codigo',
        delCodigo * 2 > pedidos ? 'grave' : 'menor',
        `${delCodigo} de ${pedidos} mojones llevan la frase del código: correcta y sin voz. Se leen como un reglamento al lado de los demás.`,
      ),
    );
  }

  // ---- Lo que se lee en la mesa ----
  const textos = textosDeLasSombras(game, plot);
  for (const t of textos) {
    const esRecambio =
      t.texto === RECAMBIO_PUBLICO ||
      (t.donde.startsWith('el puesto de') && t.texto === RECAMBIO_OFICIO) ||
      (t.donde.startsWith('el cartel de') && t.texto === RECAMBIO_INSCRIPCION) ||
      (t.donde.startsWith('la presentación de') && t.texto === DOSIER_MINIMO.publicPersona);
    if (esRecambio) {
      salida.push(
        hallazgo(
          'texto-de-recambio',
          'grave',
          `${t.donde[0]!.toUpperCase()}${t.donde.slice(1)} es el texto de recambio: lo que el modelo escribió no podía salir a la mesa ` +
            'y se tapó. Un recambio es un hueco y a la vez una marca: sale justo donde algo delataba.',
          t.sobre,
        ),
      );
      continue;
    }
    if (t.clase === 'privado' || t.clase === 'desenlace') continue;

    if (revelaLaSenda(t.texto, lexico, senda)) {
      salida.push(hallazgo('senda-en-texto', 'bloqueante', `${t.donde} enumera la senda entera y en su orden: la noche se acaba al leerlo.`, t.sobre));
    } else if (cuantosDeLaSenda(t.texto, lexico, senda) === senda.length && pasosMencionados(t.texto, lexico).length === senda.length) {
      salida.push(hallazgo('senda-en-texto', 'grave', `${t.donde} nombra justo los ${senda.length} pasos de la senda y ninguno más: dice cuáles son.`, t.sobre));
    }
    if (nombresDelKancho.length && senalaAlKancho(t.texto, nombresDelKancho)) {
      salida.push(hallazgo('senala-al-kancho', 'bloqueante', `${t.donde} nombra a quien cobra de Akechi y le acusa en la misma frase.`, t.sobre));
    } else if (t.clase === 'sin-nombre' && nombresDelKancho.length && nombraAlKancho(t.texto, nombresDelKancho)) {
      salida.push(
        hallazgo(
          'nombra-al-kancho',
          'grave',
          `${t.donde} nombra a quien cobra de Akechi, y ahí no sale nadie más: basta para que la mesa lo mire.`,
          t.sobre,
        ),
      );
    }
    if (t.ronda !== undefined && t.ronda > 0 && revelaLosCazadores(t.texto, lexico, pasoBatido(trama.batidos, t.ronda))) {
      salida.push(hallazgo('cazadores-en-texto', 'bloqueante', `${t.donde} dice dónde esperan los cazadores esa hora.`, t.sobre));
    }
    if (t.donde.startsWith('el cartel de') && anunciaEmboscada(t.texto)) {
      salida.push(hallazgo('cazadores-en-texto', 'bloqueante', `${t.donde} anuncia una emboscada: el sitio lo pone la puerta.`, t.sobre));
    }
  }

  // ---- Una narración por hora, y distintas ----
  const narraciones = plot.material?.narrations ?? [];
  if (!narraciones.some((n) => n.round === 0)) {
    salida.push(hallazgo('sin-apertura', 'grave', 'Falta la apertura: lo que se lee antes de empezar, con todos sentados.'));
  }
  for (let h = 1; h <= trama.batidos.length; h++) {
    const deLaHora = narraciones.filter((n) => n.round === h);
    if (deLaHora.length === 0) salida.push(hallazgo('hora-sin-narrar', 'grave', `La hora ${h} no tiene narración: quien dirige abre la hora en silencio.`, `hora-${h}`));
    if (deLaHora.length > 1) salida.push(hallazgo('hora-repetida', 'grave', `La hora ${h} tiene ${deLaHora.length} narraciones: se leerán dos o se saltará una.`, `hora-${h}`));
  }
  const conTexto = narraciones.filter((n) => n.round > 0 && n.text !== RECAMBIO_PUBLICO);
  for (let i = 0; i < conTexto.length; i++) {
    for (let j = i + 1; j < conTexto.length; j++) {
      if (parecido(conTexto[i]!.text, conTexto[j]!.text) >= 0.8) {
        salida.push(
          hallazgo('horas-repetidas', 'grave', `Las narraciones de las horas ${conTexto[i]!.round} y ${conTexto[j]!.round} dicen casi lo mismo.`, `hora-${conTexto[j]!.round}`),
        );
      }
    }
  }

  // ---- Las ayudas ----
  const ayudas = plot.material?.hints ?? [];
  if (new Set(ayudas.map((a) => a.level)).size < 3) {
    salida.push(hallazgo('ayudas-incompletas', 'menor', 'No están las tres ayudas graduadas: si la mesa se atasca, quien dirige no tiene escalones.'));
  }
  for (const a of ayudas) {
    const nombrados = pasosMencionados(a.text, lexico);
    if (nombrados.length !== 1 || !lexico.fiable) continue;
    const paso = nombrados[0]!;
    const diceQueNo = comprobarRedaccion({ tipo: 'no-pasa-por', a: paso }, a.text, lexico).bien;
    const diceQueSi = comprobarRedaccion({ tipo: 'pasa-por', a: paso }, a.text, lexico).bien;
    if ((diceQueNo && senda.includes(paso)) || (diceQueSi && !senda.includes(paso))) {
      salida.push(
        hallazgo(
          'ayuda-falsa',
          'grave',
          `La ayuda de nivel ${a.level} dice que la senda ${diceQueNo ? 'no pasa' : 'pasa'} por ${nombrePaso(paso)}, y es al revés: ` +
            'manda a la mesa atascada por el camino malo.',
          `ayuda-${a.level}`,
        ),
      );
    }
  }

  // ---- El desenlace ----
  const reconstruccion = plot.material?.finale.reconstruction ?? '';
  if (reconstruccion.trim()) {
    const nombrados = pasosMencionados(reconstruccion, lexico).filter((p) => senda.includes(p));
    const enOrden = senda.filter((p) => nombrados.includes(p));
    if (lexico.fiable && enOrden.length < senda.length) {
      salida.push(
        hallazgo(
          'desenlace-sin-senda',
          'grave',
          `La reconstrucción no dice la senda: nombra ${enOrden.length} de sus ${senda.length} pasos. Es lo que se lee al abrir el pliego.`,
        ),
      );
    } else if (lexico.fiable && nombrados.join('|') !== senda.join('|')) {
      salida.push(hallazgo('desenlace-senda-equivocada', 'grave', 'La reconstrucción nombra los pasos de la senda en otro orden: el final contaría otra noche.'));
    }
    if (nombresDelKancho.length && !nombraAlKancho(reconstruccion, nombresDelKancho)) {
      salida.push(hallazgo('desenlace-sin-kancho', 'grave', 'La reconstrucción no dice quién cobraba de Akechi.'));
    }
    for (const c of plot.characters.filter((x) => x.participanteId !== kanchoId)) {
      if (senalaAlKancho(reconstruccion, nombresDePersona(game, plot, c.participanteId))) {
        salida.push(hallazgo('desenlace-otro-kancho', 'grave', `La reconstrucción acusa a ${c.characterName}, que no cobraba de Akechi.`, c.participanteId));
      }
    }
  } else {
    salida.push(hallazgo('desenlace-sin-senda', 'grave', 'No hay reconstrucción: el pliego del final está vacío.'));
  }

  // ---- Quien cobra de Akechi, entre los demás ----
  const rasgos = rasgosDeLaColumna(game, plot);
  const suyo = rasgos.find((r) => r.id === kanchoId);
  const demas = rasgos.filter((r) => r.id !== kanchoId);
  if (suyo && demas.length >= 2) {
    const nombre = suyo.nombre;
    if (suyo.laNombran === 0 && demas.filter((r) => r.laNombran > 0).length * 2 >= demas.length) {
      salida.push(
        hallazgo(
          'kancho-intocable',
          'grave',
          `De ${nombre} no habla nadie: sale en lo que se cuenta de los demás la mayoría de la columna, y él en nada. ` +
            'Una persona de la que nadie dice nada es la primera a la que se mira.',
          kanchoId,
        ),
      );
    }
    const pres = mediana(demas.map((r) => r.presentacion));
    if (pres > 0 && (suyo.presentacion < pres * 0.6 || suyo.presentacion > pres * 1.6)) {
      salida.push(
        hallazgo(
          'kancho-distinto',
          'grave',
          `La presentación de ${nombre} ocupa ${suyo.presentacion} caracteres y la de los demás ${pres}: se imprime en el dosier de todos, ` +
            'y la que no se parece a las demás se ve.',
          kanchoId,
        ),
      );
    }
    const cuentan = mediana(demas.map((r) => r.cuenta));
    if (cuentan >= 2 && suyo.cuenta === 0) {
      salida.push(hallazgo('kancho-distinto', 'grave', `${nombre} es el único que no sabe nada de los demás: su hoja lo dice en blanco.`, kanchoId));
    }
    if (demas.every((r) => r.coartadaCruzada) && !suyo.coartadaCruzada) {
      salida.push(hallazgo('kancho-distinto', 'grave', `Todas las coartadas nombran a otra persona menos la de ${nombre}.`, kanchoId));
    }
  }
  for (const c of plot.characters.filter((x) => x.participanteId !== kanchoId)) {
    const t = normalizar(`${c.secret ?? ''} ${c.motive ?? ''}`);
    if (/\b(cobras de akechi|trabajas para akechi|a sueldo de akechi|eres el kancho|eres la kancho)\b/.test(t)) {
      salida.push(
        hallazgo('otro-kancho', 'grave', `El secreto de ${c.characterName} le dice que cobra de Akechi, y no es quien cobra: habría dos.`, c.participanteId),
      );
    }
  }

  // ---- Fichas flacas y la cronología ----
  const largos = plot.characters.map((c) => ({
    c,
    largo: [c.secret, c.motive, c.alibi, c.personalHook, ...(c.knowledge ?? [])].filter(Boolean).join(' ').length,
  }));
  const med = mediana(largos.map((l) => l.largo));
  for (const { c, largo } of largos) {
    if (med > 0 && largo < med * 0.5) {
      salida.push(hallazgo('ficha-flaca', 'menor', `El dosier de ${c.characterName} ocupa ${largo} caracteres y la mediana ${med}: le toca menos papel que a nadie.`, c.participanteId));
    }
  }
  // ---- Lo que cabe en el papel: un sobre con una hoja de más se ve ----
  const caras: Array<['quienEres' | 'secretos' | 'conocimiento', string]> = [
    ['quienEres', 'la cara de quién es'],
    ['secretos', 'la cara de su secreto'],
    ['conocimiento', 'la cara de lo que sabe de los demás'],
  ];
  for (const d of carasDelDosier(game, plot)) {
    for (const [cara, nombre] of caras) {
      const tope = PRESUPUESTO_DE_CARA[cara];
      if (d[cara] <= tope) continue;
      const esEl = d.id === kanchoId;
      salida.push(
        hallazgo(
          'dosier-que-desborda',
          esEl ? 'bloqueante' : 'grave',
          `En el dosier de ${d.nombre}, ${nombre} lleva ${d[cara]} caracteres y caben ${tope}: se desborda a otra cara y su ` +
            `sobre lleva una hoja más que los demás.${esEl ? ' Y es el de quien cobra de Akechi: su sobre sería el más gordo de la mesa.' : ''}`,
          d.id,
        ),
      );
    }
  }
  const motivoDelKancho = (plot.solution?.motive ?? '').length;
  if (motivoDelKancho > PRESUPUESTO_DE_CARA.motivoDelKancho) {
    salida.push(
      hallazgo(
        'dosier-que-desborda',
        'bloqueante',
        `El motivo de quien cobra de Akechi lleva ${motivoDelKancho} caracteres y en su cara caben ${PRESUPUESTO_DE_CARA.motivoDelKancho}. ` +
          'Esa cara solo la tiene su dosier: se desbordaría a otra hoja y su sobre sería el más gordo de la mesa.',
        kanchoId,
      ),
    );
  }

  if (!(plot.timeline ?? []).some((e) => e.isPublic)) {
    salida.push(hallazgo('cronologia-sin-publico', 'menor', 'La cronología no tiene ningún momento público: nadie sabe por qué está cruzando un monte de noche.'));
  }

  return { kanchoId, rasgos, delCodigo, hallazgos: salida };
}

/** La auditoría en texto, para el revisor. */
export function auditoriaSombrasEnTexto(game: GameSession, plot: Plot, a: AuditoriaSombras): string {
  const lineas: string[] = [];
  lineas.push(
    'LA COLUMNA (caracteres de la presentación · cuántas cosas cuenta de otros · ¿su coartada nombra a alguien? · en cuántos textos ajenos sale):\n' +
      a.rasgos
        .map((r) => `- ${r.nombre}${r.id === a.kanchoId ? ' [COBRA DE AKECHI]' : ''}: ${r.presentacion} · ${r.cuenta} · ${r.coartadaCruzada ? 'sí' : 'no'} · ${r.laNombran}`)
        .join('\n'),
  );
  lineas.push(`MOJONES CON LA FRASE DEL CÓDIGO: ${a.delCodigo}.`);
  const p = PRESUPUESTO_DE_CARA;
  lineas.push(
    `LO QUE OCUPA CADA DOSIER IMPRESO (caracteres; caben ${p.quienEres} en «quién eres», ${p.secretos} en «secreto, motivo y ` +
      `coartada», ${p.conocimiento} en «lo que sabe de otros», y ${p.motivoDelKancho} en el motivo de quien cobra):\n` +
      carasDelDosier(game, plot)
        .map((d) => `- ${d.nombre}${d.id === a.kanchoId ? ' [COBRA DE AKECHI]' : ''}: ${d.quienEres} · ${d.secretos} · ${d.conocimiento}`)
        .join('\n') +
      `\n- motivo de quien cobra: ${(plot.solution?.motive ?? '').length}`,
  );
  return lineas.join('\n\n');
}
