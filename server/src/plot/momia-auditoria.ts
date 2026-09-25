/**
 * La auditoría de la Momia: lo que se puede contar, contado con código.
 *
 * Dos cosas pueden estropear una noche de la Momia, como en las Sombras:
 *
 *   · EL ORDEN DE LOS RITOS. Lo decide y lo garantiza el código. Lo que la prosa
 *     puede hacer es decirlo —entero o A TROZOS—, y aquí es más fácil que en las
 *     Sombras, porque el modelo que escribe SÍ conoce el orden: lo necesita para
 *     el desenlace. Una frase de una narración que dice «el Agua va antes que el
 *     Fuego» es un fragmento de papiro regalado, acierte o no. Y la cámara que
 *     se profana cada vigilia se anuncia al abrirla: una narración que adelanta
 *     la de mañana regala lo que el Mecenas paga con su don.
 *   · QUIEN ROMPIÓ EL SELLO. Lo elige el modelo y lo esconde la prosa. Aquí se
 *     cuenta lo que lo delata sin que nadie lo diga —que sea el único del que
 *     nadie habla, una presentación que no se parece, un sobre más gordo—; la
 *     pregunta de fondo la contesta la expedición ciega (`momia-lector.ts`).
 *
 * Las invocaciones y los gestos de los ritos no se miran como texto público:
 * solo salen en el papiro del sellado, que es de quien prepara, y se leen en la
 * ceremonia del final, cuando el orden ya se ha decidido.
 */
import type { GameSession, GravedadDeHallazgo, HallazgoDeRevision, Plot } from '../../../shared/types';
import { cumple, solucionesDe, type Restriccion, type TramaMomia } from '../../../shared/juegos/momia-tipos';
import { redactar } from '../juegos/momia-puzle';
import { DOSIER_MINIMO, RECAMBIO_OFICIO, RECAMBIO_PUBLICO, entidadesDeLaMomia, saborDe, tramaDe } from './momia-generacion';
import {
  comprobarRedaccion,
  lexicoDeRitos,
  nombraAlSaqueador,
  normalizar,
  revelaElOrden,
  ritosMencionados,
  senalaAlSaqueador,
  type LexicoDeRitos,
} from './momia-validacion';

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

const frasesDe = (texto: string): string[] =>
  texto
    .split(/(?<=[.;:!?])\s+|\n+/)
    .map((f) => f.trim())
    .filter(Boolean);

/** Las formas en que la prosa nombra a una persona: su nombre real y su nombre de personaje. */
export function nombresDePersona(game: GameSession, plot: Plot, id: string): string[] {
  const real = entidadesDeLaMomia(game).expedicionarios.find((e) => e.id === id)?.name ?? '';
  const personaje = plot.characters.find((c) => c.participanteId === id)?.characterName ?? '';
  return [real, personaje].filter(Boolean);
}

// ---------------------------------------------------------------------------
// El orden, dicho a trozos
// ---------------------------------------------------------------------------

export interface OrdenInsinuado {
  frase: string;
  /** La restricción que la frase afirma, leída con el mismo validador que los fragmentos. */
  dice: Restriccion;
  /** ¿Es cierta en el orden verdadero? Si sí, es una fuga; si no, una pista falsa. */
  cierta: boolean;
}

/**
 * Las restricciones que afirma un texto, frase a frase, leídas con el MISMO
 * validador que los fragmentos de papiro: si `comprobarRedaccion` aceptaría la
 * frase como el fragmento «A va antes que B», para la mesa ES ese fragmento.
 *
 * CON UN SOLO RITO SE EXIGE QUE SE HABLE DE RITOS. Los nombres de los ritos son
 * palabras corrientes —el Nombre, el Agua, el Silencio—, y «conoce a todo el
 * mundo por su nombre desde la primera campaña» se leía como «el Rito del
 * Nombre es el primero». Con dos ritos y una palabra de precedencia en medio la
 * frase es demasiado precisa para ser casual; con uno, la frase tiene que decir
 * «rito» o el nombre entero.
 */
export function ordenQueInsinua(texto: string, lexico: LexicoDeRitos, orden: string[]): OrdenInsinuado[] {
  if (!lexico.fiable) return [];
  const salida: OrdenInsinuado[] = [];
  for (const frase of frasesDe(texto)) {
    const ritos = ritosMencionados(frase, lexico);
    const candidatas: Restriccion[] = [];
    const plana = ` ${normalizar(frase)} `;
    const hablaDeRitos = (id: string) => / ritos? /.test(plana) || plana.includes(` ${normalizar(lexico.nombres.get(id) ?? '')} `);
    if (ritos.length === 2) {
      const [a, b] = ritos as [string, string];
      candidatas.push({ tipo: 'inmediatamente-antes', a, b }, { tipo: 'antes', a, b });
    } else if (ritos.length === 1 && hablaDeRitos(ritos[0]!)) {
      const a = ritos[0]!;
      for (let posicion = 1; posicion <= orden.length; posicion++) candidatas.push({ tipo: 'posicion', a, posicion });
      candidatas.push({ tipo: 'extremos', a });
    }
    const dice = candidatas.find((r) => comprobarRedaccion(r, frase, lexico).bien);
    if (dice) salida.push({ frase, dice, cierta: cumple(orden, dice) });
  }
  return salida;
}

// ---------------------------------------------------------------------------
// Los textos, por lo que se puede decir en cada uno
// ---------------------------------------------------------------------------

export type ClaseDeTexto = 'sin-nombre' | 'ayuda' | 'publico' | 'compartido' | 'privado' | 'desenlace';

export interface TextoDeLaNoche {
  donde: string;
  texto: string;
  clase: ClaseDeTexto;
  sobre?: string;
  ronda?: number;
}

export function textosDeLaMomia(game: GameSession, plot: Plot): TextoDeLaNoche[] {
  const sabor = saborDe(plot);
  const camaras = entidadesDeLaMomia(game).camaras;
  const material = plot.material;
  const textos: TextoDeLaNoche[] = [
    { donde: 'el título', texto: plot.title ?? '', clase: 'sin-nombre' },
    { donde: 'el lema', texto: plot.tagline ?? '', clase: 'sin-nombre' },
    { donde: 'la sinopsis', texto: plot.synopsis ?? '', clase: 'sin-nombre' },
    { donde: 'la ambientación', texto: plot.setting ?? '', clase: 'sin-nombre' },
    { donde: 'el faraón', texto: sabor?.faraon.descripcion ?? '', clase: 'publico' },
    ...(material?.narrations ?? []).map((n) => ({
      donde: n.round === 0 ? 'la apertura' : `la narración de la vigilia ${n.round}`,
      texto: n.text ?? '',
      clase: 'sin-nombre' as const,
      sobre: `vigilia-${n.round}`,
      ronda: n.round,
    })),
    ...(material?.hints ?? []).map((h) => ({ donde: `la ayuda de nivel ${h.level}`, texto: h.text ?? '', clase: 'ayuda' as const, sobre: `ayuda-${h.level}` })),
    ...(plot.gmScript ?? []).map((texto, i) => ({ donde: `la línea ${i + 1} del guion`, texto, clase: 'sin-nombre' as const })),
    ...camaras.map((c) => ({ donde: `el cartel de ${c.name}`, texto: sabor?.inscripciones[c.id] ?? '', clase: 'publico' as const, sobre: `cartel-${c.id}` })),
    ...(plot.timeline ?? []).map((e) => ({
      donde: `la cronología de las ${e.time}`,
      texto: e.description ?? '',
      clase: e.isPublic ? ('publico' as const) : ('privado' as const),
    })),
    ...plot.characters.flatMap((c) => [
      { donde: `el oficio de ${c.characterName}`, texto: c.role ?? '', clase: 'publico' as const, sobre: c.participanteId },
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
// Lo que hace distinto a quien rompió el sello
// ---------------------------------------------------------------------------

export interface RasgosDePersona {
  id: string;
  nombre: string;
  presentacion: number;
  cuenta: number;
  coartadaCruzada: boolean;
  laNombran: number;
}

export function rasgosDeLaExpedicion(game: GameSession, plot: Plot): RasgosDePersona[] {
  const ids = plot.characters.map((c) => c.participanteId);
  const nombres = new Map(ids.map((id) => [id, nombresDePersona(game, plot, id)]));
  const oidos = textosDeLaMomia(game, plot).filter((t) => t.clase === 'publico' || t.clase === 'compartido' || t.clase === 'sin-nombre');
  return plot.characters.map((c) => {
    const id = c.participanteId;
    const propios = nombres.get(id) ?? [];
    const otros = ids.filter((x) => x !== id).flatMap((x) => nombres.get(x) ?? []);
    return {
      id,
      nombre: c.characterName,
      presentacion: `${c.role ?? ''} ${c.publicPersona ?? ''}`.trim().length,
      cuenta: (c.knowledge ?? []).filter((k) => k.trim()).length,
      coartadaCruzada: otros.length > 0 && nombraAlSaqueador(c.alibi ?? '', otros),
      laNombran: oidos.filter((t) => t.sobre !== id && nombraAlSaqueador(t.texto, propios)).length,
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
 * sobre el dosier de seis caras, con ocho personas y el saqueador con los textos
 * más largos: hasta 1,6 veces lo que pide el esquema, todas las caras cabían y
 * todos los sobres salían iguales. Los presupuestos quedan por debajo.
 *
 * Pasarse desborda esa cara a la siguiente, y ese sobre lleva una hoja más que
 * los demás. Si es el de quien rompió el sello, es el sobre más gordo de la mesa.
 */
export const PRESUPUESTO_DE_CARA = {
  /** Quién eres: presentación, gancho y por qué le tocó su don. */
  quienEres: 1600,
  /** Secreto, lo que ganaría y lo que declaró. */
  secretos: 1800,
  /** Lo que sabe de los demás. */
  conocimiento: 1400,
  /** El motivo del saqueador, en la única cara que solo tiene él. */
  motivoDelSaqueador: 1100,
} as const;

export interface CarasDelDosier {
  id: string;
  nombre: string;
  quienEres: number;
  secretos: number;
  conocimiento: number;
}

export function carasDelDosier(plot: Plot): CarasDelDosier[] {
  const sabor = saborDe(plot);
  return plot.characters.map((c) => ({
    id: c.participanteId,
    nombre: c.characterName,
    quienEres: [c.publicPersona, c.personalHook, sabor?.elDon[c.participanteId]].filter(Boolean).join(' ').length,
    secretos: [c.secret, c.motive, c.alibi].filter(Boolean).join(' ').length,
    conocimiento: (c.knowledge ?? []).join(' ').length,
  }));
}

// ---------------------------------------------------------------------------
// La auditoría
// ---------------------------------------------------------------------------

/** Los avisos del orden y su lógica: los decide el código y ningún parche de prosa los toca. */
export const AVISOS_DEL_ORDEN = new Set(['sin-orden', 'orden-roto', 'mentira-cierta', 'sin-mentiras', 'fragmento-sin-sitio', 'ritos-indistinguibles']);

/** Palabras de la maldición: con una cámara al lado, dicen que ahí toca. */
const MALDICION = /\b(maldicion|maldit\w*|profan\w*|marca|marcas|condena\w*)\b/;

/**
 * La vigilia futura cuya cámara profanada adelanta un texto leído en la vigilia
 * `ronda` (0 = la apertura), o 0 si no adelanta ninguna. La de esta noche se
 * anuncia al abrirla, así que nombrarla no adelanta nada.
 */
export function vigiliaQueAdelanta(texto: string, ronda: number, profanadas: string[], nombreCamara: (id: string) => string): number {
  const hoy = profanadas[ronda - 1];
  for (const [i, camara] of profanadas.entries()) {
    if (i + 1 <= ronda || camara === hoy) continue;
    const nombre = normalizar(nombreCamara(camara));
    const adelanta = frasesDe(texto).some((f) => {
      const n = normalizar(f);
      return nombre.length >= 3 && n.includes(nombre) && MALDICION.test(n);
    });
    if (adelanta) return i + 1;
  }
  return 0;
}

export interface AuditoriaMomia {
  saqueadorId: string;
  rasgos: RasgosDePersona[];
  delCodigo: number;
  hallazgos: HallazgoDeRevision[];
}

export function auditarTramaMomia(game: GameSession, plot: Plot): AuditoriaMomia {
  const trama = tramaDe(plot) as TramaMomia | undefined;
  const saqueadorId = String(plot.solution?.respuestas?.saqueador ?? '');
  const salida: HallazgoDeRevision[] = [];
  if (!trama) {
    return {
      saqueadorId,
      rasgos: [],
      delCodigo: 0,
      hallazgos: [hallazgo('sin-orden', 'bloqueante', 'La trama no trae el orden de los ritos: no hay tumba que sellar.')],
    };
  }

  const entidades = entidadesDeLaMomia(game);
  const lexico = lexicoDeRitos(entidades.ritos.map((r) => ({ id: r.id, name: r.name })));
  const nombreRito = (id: string) => entidades.ritos.find((r) => r.id === id)?.name ?? id;
  const nombreCamara = (id: string) => entidades.camaras.find((c) => c.id === id)?.name ?? id;
  const orden = trama.ordenVerdadero;
  const delSaqueador = nombresDePersona(game, plot, saqueadorId);

  // ---- El orden y sus fragmentos ----
  const soluciones = solucionesDe(entidades.ritos.map((r) => r.id), trama.restricciones.map((r) => r.restriccion));
  if (soluciones.length !== 1 || soluciones[0]!.join('|') !== orden.join('|')) {
    salida.push(
      hallazgo(
        'orden-roto',
        'bloqueante',
        `Con los fragmentos de ahora salen ${soluciones.length} órdenes y no el guardado: la tumba no se puede sellar. ` +
          'Suele pasar al quitar o cambiar un rito después de generar.',
      ),
    );
  }
  if (!trama.falsasCandidatas.length) {
    salida.push(hallazgo('sin-mentiras', 'grave', 'No hay fragmentos falsos preparados: quien rompió el sello no tiene con qué mentir.'));
  }
  for (const f of trama.falsasCandidatas) {
    if (cumple(orden, f.restriccion)) {
      salida.push(hallazgo('mentira-cierta', 'grave', `El fragmento falso «${f.id}» es cierto: la mentira del saqueador ayudaría a la mesa.`, f.id));
    }
  }
  const hallados = new Set(trama.hallazgos.map((h) => h.fragmentoId));
  for (const r of trama.restricciones) {
    if (!hallados.has(r.id)) {
      salida.push(hallazgo('fragmento-sin-sitio', 'bloqueante', `El fragmento «${r.id}» no aparece en ninguna cámara: nadie lo leerá.`, r.id));
    }
  }
  if (!lexico.fiable) {
    salida.push(
      hallazgo(
        'ritos-indistinguibles',
        'grave',
        `Los ritos «${lexico.ambiguos.map(nombreRito).join('», «')}» no se distinguen por su nombre: ninguna frase de papiro se puede ` +
          'comprobar, y todas se quedan con la redacción del código. Cambia sus nombres y vuelve a generar.',
      ),
    );
  }
  let delCodigo = 0;
  for (const r of [...trama.restricciones, ...trama.falsasCandidatas]) {
    if (r.texto === redactar(r.restriccion, nombreRito)) delCodigo++;
    else if (lexico.fiable && !comprobarRedaccion(r.restriccion, r.texto, lexico).bien) {
      const cierto = trama.restricciones.some((x) => x.id === r.id);
      salida.push(
        hallazgo(
          'fragmento-desalineado',
          cierto ? 'bloqueante' : 'grave',
          `La frase del fragmento «${r.id}» ya no dice su restricción con los nombres de ahora: un rito cambió de nombre después de generar.`,
          r.id,
        ),
      );
    }
  }
  const pedidos = trama.restricciones.length + trama.falsasCandidatas.length;
  if (delCodigo > 0 && lexico.fiable) {
    salida.push(
      hallazgo(
        'fragmentos-del-codigo',
        delCodigo * 2 > pedidos ? 'grave' : 'menor',
        `${delCodigo} de ${pedidos} fragmentos llevan la frase del código: correcta y sin voz. Se leen como un reglamento al lado de los demás.`,
      ),
    );
  }

  // ---- Lo que se lee en la mesa ----
  const textos = textosDeLaMomia(game, plot);
  for (const t of textos) {
    const esRecambio =
      t.texto === RECAMBIO_PUBLICO ||
      (t.donde.startsWith('el oficio de') && t.texto === RECAMBIO_OFICIO) ||
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

    if (revelaElOrden(t.texto, lexico, orden)) {
      salida.push(hallazgo('orden-en-texto', 'bloqueante', `${t.donde} enumera los cinco ritos en su orden: la tumba se sella al leerlo.`, t.sobre));
    } else {
      for (const o of ordenQueInsinua(t.texto, lexico, orden)) {
        // En una ayuda, lo cierto es la ayuda; lo falso manda a la mesa por mal camino.
        if (t.clase === 'ayuda' && o.cierta) continue;
        salida.push(
          hallazgo(
            t.clase === 'ayuda' ? 'ayuda-falsa' : 'insinua-orden',
            'grave',
            `En ${t.donde}: «${o.frase}» se lee como un fragmento de papiro. ${
              o.cierta ? 'Y es CIERTO: es un fragmento regalado.' : 'Y es falso: manda a la mesa por mal camino.'
            }`,
            t.sobre,
          ),
        );
      }
    }
    if (delSaqueador.length && senalaAlSaqueador(t.texto, delSaqueador)) {
      salida.push(hallazgo('senala-al-saqueador', 'bloqueante', `${t.donde} nombra a quien rompió el sello y le acusa en la misma frase.`, t.sobre));
    } else if (t.clase === 'sin-nombre' && delSaqueador.length && nombraAlSaqueador(t.texto, delSaqueador)) {
      salida.push(
        hallazgo('nombra-al-saqueador', 'grave', `${t.donde} nombra a quien rompió el sello, y ahí no sale nadie más: basta para que la mesa lo mire.`, t.sobre),
      );
    }
    // La cámara de mañana, dicha hoy.
    const adelantada = t.ronda !== undefined ? vigiliaQueAdelanta(t.texto, t.ronda, trama.profanadas, nombreCamara) : 0;
    if (adelantada) {
      salida.push(
        hallazgo(
          'profanada-adelantada',
          'grave',
          `${t.donde} dice que ${nombreCamara(trama.profanadas[adelantada - 1]!)} está maldita, y esa se profana en la vigilia ` +
            `${adelantada}: adelanta lo que el Mecenas paga por saber.`,
          t.sobre,
        ),
      );
    }
  }

  // ---- Una narración por vigilia, y distintas ----
  const narraciones = plot.material?.narrations ?? [];
  if (!narraciones.some((n) => n.round === 0)) {
    salida.push(hallazgo('sin-apertura', 'grave', 'Falta la apertura: lo que se lee antes de empezar, con todos sentados.'));
  }
  for (let v = 1; v <= trama.profanadas.length; v++) {
    const deLaVigilia = narraciones.filter((n) => n.round === v);
    if (deLaVigilia.length === 0) salida.push(hallazgo('vigilia-sin-narrar', 'grave', `La vigilia ${v} no tiene narración: quien dirige la abre en silencio.`, `vigilia-${v}`));
    if (deLaVigilia.length > 1) salida.push(hallazgo('vigilia-repetida', 'grave', `La vigilia ${v} tiene ${deLaVigilia.length} narraciones.`, `vigilia-${v}`));
  }
  const conTexto = narraciones.filter((n) => n.round > 0 && n.text !== RECAMBIO_PUBLICO);
  for (let i = 0; i < conTexto.length; i++) {
    for (let j = i + 1; j < conTexto.length; j++) {
      if (parecido(conTexto[i]!.text, conTexto[j]!.text) >= 0.8) {
        salida.push(
          hallazgo('vigilias-repetidas', 'grave', `Las narraciones de las vigilias ${conTexto[i]!.round} y ${conTexto[j]!.round} dicen casi lo mismo.`, `vigilia-${conTexto[j]!.round}`),
        );
      }
    }
  }
  const carteles = entidades.camaras.map((c) => ({ c, texto: saborDe(plot)?.inscripciones[c.id] ?? '' })).filter((x) => x.texto.trim());
  for (let i = 0; i < carteles.length; i++) {
    for (let j = i + 1; j < carteles.length; j++) {
      if (parecido(carteles[i]!.texto, carteles[j]!.texto) >= 0.8) {
        salida.push(hallazgo('carteles-repetidos', 'menor', `Los carteles de ${carteles[i]!.c.name} y ${carteles[j]!.c.name} dicen casi lo mismo.`, `cartel-${carteles[j]!.c.id}`));
      }
    }
  }

  // ---- Las ayudas ----
  if (new Set((plot.material?.hints ?? []).map((a) => a.level)).size < 3) {
    salida.push(hallazgo('ayudas-incompletas', 'menor', 'No están las tres ayudas graduadas: si la mesa se atasca, quien dirige no tiene escalones.'));
  }

  // ---- El desenlace ----
  const reconstruccion = plot.material?.finale.reconstruction ?? '';
  if (reconstruccion.trim()) {
    const nombrados = ritosMencionados(reconstruccion, lexico);
    if (lexico.fiable && orden.some((r) => !nombrados.includes(r))) {
      salida.push(
        hallazgo(
          'desenlace-sin-orden',
          'grave',
          `La reconstrucción no dice el orden: nombra ${orden.filter((r) => nombrados.includes(r)).length} de los ${orden.length} ritos. Es lo que se lee al abrir el papiro.`,
        ),
      );
    } else if (lexico.fiable && nombrados.join('|') !== orden.join('|')) {
      salida.push(hallazgo('desenlace-orden-equivocado', 'grave', 'La reconstrucción nombra los ritos en otro orden: el final contaría otro sellado.'));
    }
    if (delSaqueador.length && !nombraAlSaqueador(reconstruccion, delSaqueador)) {
      salida.push(hallazgo('desenlace-sin-saqueador', 'grave', 'La reconstrucción no dice quién rompió el sello.'));
    }
    for (const c of plot.characters.filter((x) => x.participanteId !== saqueadorId)) {
      if (senalaAlSaqueador(reconstruccion, nombresDePersona(game, plot, c.participanteId))) {
        salida.push(hallazgo('desenlace-otro-saqueador', 'grave', `La reconstrucción acusa a ${c.characterName}, que no rompió el sello.`, c.participanteId));
      }
    }
  } else {
    salida.push(hallazgo('desenlace-sin-orden', 'grave', 'No hay reconstrucción: el papiro del final está vacío.'));
  }

  // ---- Quien rompió el sello, entre los demás ----
  const rasgos = rasgosDeLaExpedicion(game, plot);
  const suyo = rasgos.find((r) => r.id === saqueadorId);
  const demas = rasgos.filter((r) => r.id !== saqueadorId);
  if (suyo && demas.length >= 2) {
    const nombre = suyo.nombre;
    if (suyo.laNombran === 0 && demas.filter((r) => r.laNombran > 0).length * 2 >= demas.length) {
      salida.push(
        hallazgo(
          'saqueador-intocable',
          'grave',
          `De ${nombre} no habla nadie: la mayoría de la expedición sale en lo que se cuenta de los demás, y él en nada. ` +
            'Una persona de la que nadie dice nada es la primera a la que se mira.',
          saqueadorId,
        ),
      );
    }
    const pres = mediana(demas.map((r) => r.presentacion));
    if (pres > 0 && (suyo.presentacion < pres * 0.6 || suyo.presentacion > pres * 1.6)) {
      salida.push(
        hallazgo(
          'saqueador-distinto',
          'grave',
          `La presentación de ${nombre} ocupa ${suyo.presentacion} caracteres y la de los demás ${pres}: se imprime en el dosier de todos, ` +
            'y la que no se parece a las demás se ve.',
          saqueadorId,
        ),
      );
    }
    if (mediana(demas.map((r) => r.cuenta)) >= 2 && suyo.cuenta === 0) {
      salida.push(hallazgo('saqueador-distinto', 'grave', `${nombre} es el único que no sabe nada de los demás: su hoja lo dice en blanco.`, saqueadorId));
    }
    if (demas.every((r) => r.coartadaCruzada) && !suyo.coartadaCruzada) {
      salida.push(hallazgo('saqueador-distinto', 'grave', `Todas las coartadas nombran a otra persona menos la de ${nombre}.`, saqueadorId));
    }
  }
  for (const c of plot.characters.filter((x) => x.participanteId !== saqueadorId)) {
    const t = normalizar(`${c.secret ?? ''} ${c.motive ?? ''}`);
    if (/\b(rompiste el sello|fuiste tu quien|eres el saqueador|eres la saqueadora|tu rompiste)\b/.test(t)) {
      salida.push(
        hallazgo('otro-saqueador', 'grave', `El secreto de ${c.characterName} le dice que rompió el sello, y no fue quien lo rompió: habría dos.`, c.participanteId),
      );
    }
  }

  // ---- Fichas flacas, lo que cabe en el papel y la cronología ----
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
  const caras: Array<['quienEres' | 'secretos' | 'conocimiento', string]> = [
    ['quienEres', 'la cara de quién es'],
    ['secretos', 'la cara de su secreto'],
    ['conocimiento', 'la cara de lo que sabe de los demás'],
  ];
  for (const d of carasDelDosier(plot)) {
    for (const [cara, nombre] of caras) {
      const tope = PRESUPUESTO_DE_CARA[cara];
      if (d[cara] <= tope) continue;
      const esEl = d.id === saqueadorId;
      salida.push(
        hallazgo(
          'dosier-que-desborda',
          esEl ? 'bloqueante' : 'grave',
          `En el dosier de ${d.nombre}, ${nombre} lleva ${d[cara]} caracteres y caben ${tope}: se desborda a otra cara y su ` +
            `sobre lleva una hoja más que los demás.${esEl ? ' Y es el de quien rompió el sello: su sobre sería el más gordo de la mesa.' : ''}`,
          d.id,
        ),
      );
    }
  }
  const motivo = (plot.solution?.motive ?? '').length;
  if (motivo > PRESUPUESTO_DE_CARA.motivoDelSaqueador) {
    salida.push(
      hallazgo(
        'dosier-que-desborda',
        'bloqueante',
        `El motivo de quien rompió el sello lleva ${motivo} caracteres y en su cara caben ${PRESUPUESTO_DE_CARA.motivoDelSaqueador}. ` +
          'Esa cara solo la tiene su dosier: se desbordaría a otra hoja y su sobre sería el más gordo de la mesa.',
        saqueadorId,
      ),
    );
  }
  if (!(plot.timeline ?? []).some((e) => e.isPublic)) {
    salida.push(hallazgo('cronologia-sin-publico', 'menor', 'La cronología no tiene ningún momento público: nadie sabe qué pasó aquella noche.'));
  }

  return { saqueadorId, rasgos, delCodigo, hallazgos: salida };
}

/** La auditoría en texto, para el revisor. */
export function auditoriaMomiaEnTexto(plot: Plot, a: AuditoriaMomia): string {
  const p = PRESUPUESTO_DE_CARA;
  return [
    'LA EXPEDICIÓN (caracteres de la presentación · cuántas cosas cuenta de otros · ¿su coartada nombra a alguien? · en cuántos textos ajenos sale):\n' +
      a.rasgos
        .map((r) => `- ${r.nombre}${r.id === a.saqueadorId ? ' [ROMPIÓ EL SELLO]' : ''}: ${r.presentacion} · ${r.cuenta} · ${r.coartadaCruzada ? 'sí' : 'no'} · ${r.laNombran}`)
        .join('\n'),
    `FRAGMENTOS CON LA FRASE DEL CÓDIGO: ${a.delCodigo}.`,
    `LO QUE OCUPA CADA DOSIER IMPRESO (caracteres; caben ${p.quienEres} en «quién eres», ${p.secretos} en «secreto, motivo y ` +
      `coartada», ${p.conocimiento} en «lo que sabe de otros», y ${p.motivoDelSaqueador} en el motivo de quien rompió el sello):\n` +
      carasDelDosier(plot)
        .map((d) => `- ${d.nombre}${d.id === a.saqueadorId ? ' [ROMPIÓ EL SELLO]' : ''}: ${d.quienEres} · ${d.secretos} · ${d.conocimiento}`)
        .join('\n') +
      `\n- motivo de quien rompió el sello: ${(plot.solution?.motive ?? '').length}`,
  ].join('\n\n');
}
