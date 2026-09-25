/**
 * La auditoría del Nudo: lo que se puede contar, contado con código.
 *
 * ═══ POR QUÉ AQUÍ NO HAY DETECTIVE ═══
 *
 * En el Nudo no se esconde a nadie: lo que la mesa tiene que sacar es el cuadro
 * de marchas —qué convoy sale en cada franja—, y ese cuadro lo decide el código
 * y lo garantiza el código (`verificarCuadro`: una sola solución, ninguna tira
 * de sobra, nadie que lo resuelva solo). El modelo que escribe la prosa ni
 * siquiera lo conoce. Así que lo que puede estropear una noche del Nudo no es
 * «a quién señala la mesa», sino:
 *
 *   · que el cuadro haya dejado de cumplir sus garantías —un convoy renombrado
 *     o borrado después de generar deja tiras que ya no dicen lo que decían—;
 *   · que la prosa diga lo que no debe: un orden (acierte o no, porque el
 *     modelo no lo sabe), un crimen, el suero en otro convoy, un oficio que no
 *     es el de esa persona;
 *   · que la prosa no sea prosa: la plantilla que queda cuando la llamada al
 *     modelo falla, partes repetidos, fichas de relleno.
 *
 * Todo eso se mide sin gastar nada, y es lo que lee el revisor antes de
 * reescribir. Los umbrales son gruesos a propósito: lo fino lo decide él.
 */
import type { GameSession, HallazgoDeRevision, GravedadDeHallazgo, Plot } from '../../../shared/types';
import { entidadesDe } from '../../../shared/juegos';
import {
  cuadrosDe,
  franjasDe,
  HORAS_DE_FRANJA,
  OFICIO_DE_PERSONA,
  OFICIOS,
  type OficioId,
  type TramaNudo,
} from '../../../shared/juegos/nudo-tipos';
import { generarTramaNudo, tramaDe } from '../juegos/nudo-trama';
import { redactarTelegrama, resolublePorEliminacion } from '../juegos/nudo-cuadro';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Minúsculas y sin tildes: para buscar nombres sin depender de cómo se escribieron. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const frasesDe = (texto: string): string[] =>
  texto
    .split(/(?<=[.;:!?])\s+|\n+/)
    .map((f) => f.trim())
    .filter(Boolean);

const palabras = (texto: string): Set<string> => new Set(normalizar(texto).split(/[^a-z0-9ñ]+/).filter((p) => p.length > 3));

function parecido(a: string, b: string): number {
  const pa = palabras(a);
  const pb = palabras(b);
  if (pa.size === 0 || pb.size === 0) return 0;
  let comunes = 0;
  for (const p of pa) if (pb.has(p)) comunes++;
  return comunes / Math.min(pa.size, pb.size);
}

function hallazgo(codigo: string, gravedad: GravedadDeHallazgo, texto: string, sobre?: string): HallazgoDeRevision {
  return { codigo, gravedad, origen: 'auditoria', texto, estado: 'pendiente', ...(sobre ? { sobre } : {}) };
}

/** De qué parte de la velada es un texto: no todo lo que cabe en un secreto cabe en un parte. */
export type ClaseDeTexto = 'cabecera' | 'noche' | 'parte' | 'guion' | 'ficha';

/** Todos los textos que escribió el modelo, con dónde está cada uno. */
export function textosDelNudo(plot: Plot): Array<{ donde: string; texto: string; clase: ClaseDeTexto; sobre?: string }> {
  const trama = tramaDe(plot);
  const textos: Array<{ donde: string; texto: string; clase: ClaseDeTexto; sobre?: string }> = [
    { donde: 'el título', texto: plot.title ?? '', clase: 'cabecera' },
    { donde: 'el lema', texto: plot.tagline ?? '', clase: 'cabecera' },
    { donde: 'la sinopsis', texto: plot.synopsis ?? '', clase: 'noche' },
    { donde: 'la ambientación', texto: plot.setting ?? '', clase: 'noche' },
    ...(trama?.partes ?? []).map((texto, i) => ({
      donde: `el parte de la franja ${i + 1}`,
      texto,
      clase: 'parte' as const,
      sobre: `parte-${i + 1}`,
    })),
    ...(plot.gmScript ?? []).map((texto, i) => ({ donde: `la línea ${i + 1} del guion`, texto, clase: 'guion' as const })),
    ...plot.characters.flatMap((c) => [
      { donde: `la cara pública de ${c.characterName}`, texto: c.publicPersona ?? '', clase: 'ficha' as const, sobre: c.participanteId },
      { donde: `el secreto de ${c.characterName}`, texto: c.secret ?? '', clase: 'ficha' as const, sobre: c.participanteId },
      { donde: `el gancho de ${c.characterName}`, texto: c.personalHook ?? '', clase: 'ficha' as const, sobre: c.participanteId },
    ]),
  ];
  return textos.filter((t) => t.texto.trim());
}

// ---------------------------------------------------------------------------
// Los convoyes, como los escribe la prosa
// ---------------------------------------------------------------------------

/** Palabras que solas no dicen de qué convoy se habla. */
const GENERICAS = new Set(['tren', 'convoy', 'maquina', 'composicion', 'especial', 'mercancias']);

export interface ConvoyEnLaProsa {
  id: string;
  nombre: string;
  /** Cómo puede aparecer en un texto ya normalizado. */
  claves: string[];
}

/**
 * Las formas en que la prosa nombra a cada convoy.
 *
 * Buscar el nombre entero, con su artículo, se perdía dos de cada tres: «al
 * mixto de Peñarroya» (la contracción se come el artículo) y «el mixto» a secas,
 * que es como se habla a las dos de la mañana. Así que cuenta el nombre sin
 * artículo y, si no se confunde con el de otro, su primera palabra. Y el Correo
 * es «el Correo» se llame como se llame: el código puede haber elegido de Correo
 * al carbonero, y la prosa lo llamará igual por su oficio.
 */
export function convoyesEnLaProsa(game: GameSession, correo?: string): ConvoyEnLaProsa[] {
  const convoyes = entidadesDe(game, 'convoyes').map((c) => {
    const entero = normalizar(c.name).replace(/^(el|la|los|las) /, '');
    return { id: c.id, nombre: c.name, entero, cabeza: entero.split(' ')[0] ?? '' };
  });
  return convoyes.map((c) => {
    const cabezaUnica =
      c.cabeza.length >= 4 &&
      !GENERICAS.has(c.cabeza) &&
      convoyes.filter((o) => o.cabeza === c.cabeza).length === 1 &&
      (c.cabeza !== 'correo' || c.id === correo);
    const claves = [c.entero, ...(cabezaUnica ? [c.cabeza] : []), ...(c.id === correo ? ['correo de medianoche', 'correo'] : [])];
    return { id: c.id, nombre: c.nombre, claves: [...new Set(claves)].filter((k) => k.length >= 3) };
  });
}

const esLetra = (c: string | undefined) => !!c && /[a-z0-9]/.test(c);

/** Dónde nombra un texto normalizado a un convoy, como palabra entera. */
export function dondeSeNombra(texto: string, claves: string[]): { en: number; largo: number } | undefined {
  let mejor: { en: number; largo: number } | undefined;
  for (const clave of claves) {
    for (let en = texto.indexOf(clave); en >= 0; en = texto.indexOf(clave, en + 1)) {
      if (esLetra(texto[en - 1]) || esLetra(texto[en + clave.length])) continue;
      if (!mejor || en < mejor.en) mejor = { en, largo: clave.length };
      break;
    }
  }
  return mejor;
}

/** El texto sin los nombres de los convoyes: «el Correo de Medianoche» no es una hora. */
function sinNombres(texto: string, convoyes: ConvoyEnLaProsa[]): string {
  let salida = texto;
  for (const clave of convoyes.flatMap((c) => c.claves).sort((a, b) => b.length - a.length)) {
    salida = salida.split(clave).join(' '.repeat(clave.length));
  }
  return salida;
}

/** Las horas de las franjas como se escriben en prosa, además de «02:40». */
const HORAS_ESCRITAS: Array<[RegExp, number]> = [
  [/\b(a )?(la )?medianoche\b/, 1],
  [/\ba las doce\b(?! y)/, 1],
  [/\b(las )?doce y cuarenta\b/, 2],
  [/\b(la )?una y veinte\b/, 3],
  [/\b(las )?dos y cuarenta\b/, 5],
  [/\ba las dos\b(?! y)|\blas dos (en punto|de la madrugada)\b/, 4],
  [/\b(las )?tres y veinte\b/, 6],
];

/** La franja a la que apunta una hora escrita en el texto, si apunta a alguna. */
export function franjaDeLaHora(texto: string): number | undefined {
  for (const m of texto.matchAll(/\b(\d{1,2})[:.](\d\d)\b/g)) {
    const i = (HORAS_DE_FRANJA as readonly string[]).indexOf(`${m[1]!.padStart(2, '0')}:${m[2]}`);
    if (i >= 0) return i + 1;
  }
  for (const [patron, franja] of HORAS_ESCRITAS) if (patron.test(texto)) return franja;
  return undefined;
}

// ---------------------------------------------------------------------------
// El cuadro
// ---------------------------------------------------------------------------

export interface MedidaDelCuadro {
  soluciones: number;
  unico: boolean;
  redundantes: string[];
  /** Tiras cuyo texto ya no es el que tocaría con los nombres de AHORA. */
  desalineadas: string[];
  /** La tira más fuerte y cuántos cuadros deja ella sola (de 720). */
  tiraMasFuerte?: { id: string; cuadros: number };
  /** Por persona: cuántas tiras, cuántos cuadros deja su mano sola, y cuántos quedan sin su mano. */
  porPersona: Array<{ id: string; nombre: string; tiras: number; cuadrosSolo: number; cuadrosSinEl: number }>;
  /** Tiras que no guarda nadie de la mesa de AHORA, y cuántos cuadros deja lo que sí se guarda. */
  sinMano: string[];
  solucionesConLaMesa: number;
  aLapiz: boolean;
}

export function medirCuadro(game: GameSession, trama: TramaNudo): MedidaDelCuadro {
  const convoyes = entidadesDe(game, 'convoyes');
  const ids = convoyes.map((c) => c.id);
  const nombre = (id: string) => convoyes.find((c) => c.id === id)?.name ?? id;
  const todos = trama.telegramas.map((t) => t.telegrama);
  const soluciones = cuadrosDe(ids, todos);
  const unico = soluciones.length === 1 && soluciones[0]!.join('|') === trama.cuadro.join('|');
  const redundantes = trama.telegramas
    .filter((t) => {
      const sinEl = todos.filter((x) => x !== t.telegrama);
      return sinEl.length > 0 && cuadrosDe(ids, sinEl).length === 1;
    })
    .map((t) => t.id);
  const desalineadas = trama.telegramas.filter((t) => t.texto !== redactarTelegrama(t.telegrama, nombre)).map((t) => t.id);

  let tiraMasFuerte: MedidaDelCuadro['tiraMasFuerte'];
  for (const t of trama.telegramas) {
    const cuadros = cuadrosDe(ids, [t.telegrama]).length;
    if (!tiraMasFuerte || cuadros < tiraMasFuerte.cuadros) tiraMasFuerte = { id: t.id, cuadros };
  }

  /*
   * Lo que la mesa tiene de verdad en la mano. Las tiras de alguien que se
   * borró después de generar siguen en la trama, y con ellas el cuadro sale en
   * el papel; en la mesa no las lee nadie.
   */
  const ferroviarios = entidadesDe(game, 'ferroviarios');
  const enMano = new Set(ferroviarios.flatMap((p) => trama.reparto[p.id] ?? []));
  const sinMano = trama.telegramas.filter((t) => !enMano.has(t.id)).map((t) => t.id);
  const solucionesConLaMesa = sinMano.length
    ? cuadrosDe(ids, trama.telegramas.filter((t) => enMano.has(t.id)).map((t) => t.telegrama)).length
    : soluciones.length;

  const porPersona = ferroviarios.map((p) => {
    const suyas = new Set(trama.reparto[p.id] ?? []);
    const mano = trama.telegramas.filter((t) => suyas.has(t.id)).map((t) => t.telegrama);
    const resto = trama.telegramas.filter((t) => !suyas.has(t.id)).map((t) => t.telegrama);
    return {
      id: p.id,
      nombre: p.name,
      tiras: mano.length,
      cuadrosSolo: cuadrosDe(ids, mano).length,
      cuadrosSinEl: cuadrosDe(ids, resto).length,
    };
  });

  return {
    soluciones: soluciones.length,
    unico,
    redundantes,
    desalineadas,
    ...(tiraMasFuerte ? { tiraMasFuerte } : {}),
    porPersona,
    sinMano,
    solucionesConLaMesa,
    aLapiz: resolublePorEliminacion(ids, todos, trama.franjas),
  };
}

// ---------------------------------------------------------------------------
// Frases que insinúan un orden
// ---------------------------------------------------------------------------

const ORDINALES: Array<[RegExp, (franjas: number) => number]> = [
  [/\b(el |la )?primer[oa]?\b/, () => 1],
  [/\bsegund[oa]\b/, () => 2],
  [/\btercer[oa]?\b/, () => 3],
  [/\bquint[oa]\b/, () => 5],
  [/\bsext[oa]\b/, () => 6],
  [/\b(ultim[oa]|postrer[oa]?)\b/, (franjas) => franjas],
];
/** Verbos de salir y de orden: sin uno de ellos, «primero» casi nunca habla de franjas. */
const DE_SALIDA = /\b(sale|salen|saldra|saldran|salga|salgan|salio|salir|parte|partira|parta|cruza|cruzara|cruce|despach\w*|franja|pide via|pedira via|entra en agujas)\b/;
const RELACION_ANTES = /\b(antes)\b/;
const RELACION_DESPUES = /\b(despues|tras|detras)\b/;

export interface Insinuacion {
  donde: string;
  frase: string;
  sobre?: string;
  /** Lo que la frase da a entender, en palabras. */
  dice: string;
  /** ¿Coincide con el cuadro verdadero? Si sí, es una fuga; si no, una pista falsa. */
  coincide: boolean;
}

export function insinuacionesDeOrden(game: GameSession, plot: Plot): Insinuacion[] {
  const trama = tramaDe(plot);
  if (!trama) return [];
  const convoyes = convoyesEnLaProsa(game, trama.correo);
  const donde = franjasDe(trama.cuadro);
  const salida: Insinuacion[] = [];

  for (const { donde: lugar, texto, sobre } of textosDelNudo(plot)) {
    for (const frase of frasesDe(texto)) {
      const f = normalizar(frase);
      const citados = convoyes
        .map((c) => ({ ...c, pos: dondeSeNombra(f, c.claves) }))
        .filter((c): c is ConvoyEnLaProsa & { pos: { en: number; largo: number } } => c.pos !== undefined)
        .sort((a, b) => a.pos.en - b.pos.en);
      if (citados.length === 0) continue;

      // Un convoy y una franja: por hora, por número de franja o por ordinal con verbo de salida.
      if (citados.length === 1) {
        const c = citados[0]!;
        const resto = sinNombres(f, convoyes);
        let franja = franjaDeLaHora(resto);
        const numero = /\bfranja (\d)\b/.exec(resto);
        if (!franja && numero) franja = Number(numero[1]);
        if (!franja && DE_SALIDA.test(resto)) {
          for (const [patron, valor] of ORDINALES) {
            if (patron.test(resto)) {
              franja = valor(trama.franjas);
              break;
            }
          }
        }
        if (franja && franja >= 1 && franja <= trama.franjas) {
          salida.push({
            donde: lugar,
            frase,
            ...(sobre ? { sobre } : {}),
            dice: `${c.nombre} en la franja ${franja} (${HORAS_DE_FRANJA[franja - 1] ?? ''})`,
            coincide: donde[c.id] === franja,
          });
        }
        continue;
      }

      // Dos convoyes y una relación de orden entre ellos.
      const [a, b] = citados;
      const entre = f.slice(a!.pos.en + a!.pos.largo, b!.pos.en);
      const antes = RELACION_ANTES.test(entre);
      const despues = RELACION_DESPUES.test(entre);
      if (antes === despues) continue;
      const primeroAntes = antes;
      const verdad = (donde[a!.id] ?? 0) < (donde[b!.id] ?? 0);
      salida.push({
        donde: lugar,
        frase,
        ...(sobre ? { sobre } : {}),
        dice: `${a!.nombre} ${primeroAntes ? 'antes' : 'después'} que ${b!.nombre}`,
        coincide: primeroAntes === verdad,
      });
    }
  }
  return salida;
}

// ---------------------------------------------------------------------------
// La auditoría
// ---------------------------------------------------------------------------

/** La violencia no cabe en ningún texto de esta noche. */
const CRIMEN = /\b(asesin\w*|cadaver\w*|crimen(es)?|homicid\w*|envenen\w*|ha muerto|han muerto|lo mato|la mato|lo mataron|la mataron)\b/;
/**
 * Y los papeles de otro juego no caben en lo que se lee de la noche. En un
 * secreto sí: «se siente culpable del descarrilamiento del año 19» es un secreto
 * humano con peso, que es justo lo que se pide.
 */
const DE_OTRO_JUEGO = /\b(culpable\w*|victima\w*|traidor\w*|saboteador\w*|sabotaje)\b/;
const ANIO = /\b(1[89]\d\d)\b/g;

/**
 * Lo que un parte no puede dar por hecho.
 *
 * Un parte se lee al abrir su franja PASE LO QUE PASE en la mesa: a esa hora
 * pueden haber salido cuatro convoyes o ninguno, llevar dos minutos de retraso o
 * doce. Así que no puede contar cómo va la noche: lo que diga, a una mesa le
 * mentirá.
 */
const QUE_DA_POR_HECHO = new RegExp(
  [
    'ya (ha|han) (salido|cruzado|pasado|partido)',
    '(ha|han) (salido|cruzado|partido) ya',
    'ya (salio|salieron|cruzo|cruzaron|partio|partieron)',
    'sigue(n)? (esperando|parad[oa]s?|detenid[oa]s?)',
    'espera(n)? en (la via|el apartadero|via muerta)',
    '(lleva|llevan|llevamos|acumula|acumulan|acumulamos|van|vamos) (ya )?(\\w+ )?minutos de retraso',
    '(quedan?|faltan?) (\\w+ )?convoyes',
    '(\\w+ )?convoyes (fuera|despachados)',
  ]
    .map((p) => `\\b${p}\\b`)
    .join('|'),
);

export interface AuditoriaNudo {
  cuadro?: MedidaDelCuadro;
  insinuaciones: Insinuacion[];
  deLaPlantilla: string[];
  largoDeFichas: Array<{ id: string; nombre: string; largo: number }>;
  hallazgos: HallazgoDeRevision[];
}

export function auditarTramaNudo(game: GameSession, plot: Plot): AuditoriaNudo {
  const trama = tramaDe(plot);
  const salida: HallazgoDeRevision[] = [];
  if (!trama) {
    return {
      insinuaciones: [],
      deLaPlantilla: [],
      largoDeFichas: [],
      hallazgos: [hallazgo('sin-cuadro', 'bloqueante', 'La trama no trae el cuadro de marchas: no hay noche que jugar.')],
    };
  }

  // ---- El cuadro ----
  const cuadro = medirCuadro(game, trama);
  if (!cuadro.unico) {
    salida.push(
      hallazgo(
        'cuadro-roto',
        'bloqueante',
        `Con las tiras de ahora el cuadro tiene ${cuadro.soluciones} ${cuadro.soluciones === 1 ? 'solución' : 'soluciones'} ` +
          `y no la que se guardó: la noche no se puede resolver. Suele pasar al borrar o cambiar un convoy después de generar.`,
      ),
    );
  }
  for (const id of cuadro.desalineadas) {
    salida.push(
      hallazgo(
        'tira-desalineada',
        'bloqueante',
        `La tira «${id}» ya no dice lo que dice su condición con los nombres de ahora: un convoy cambió de nombre ` +
          `después de generar, y la mesa leerá un nombre que no está en el tablero.`,
        id,
      ),
    );
  }
  if (cuadro.unico && cuadro.sinMano.length && cuadro.solucionesConLaMesa !== 1) {
    salida.push(
      hallazgo(
        'tira-sin-mano',
        'bloqueante',
        `Las tiras ${cuadro.sinMano.join(', ')} no las guarda nadie de la mesa, y con las que sí se guardan el cuadro tiene ` +
          `${cuadro.solucionesConLaMesa} soluciones: la noche no se puede resolver. Suele pasar al quitar a alguien después de generar.`,
      ),
    );
  }
  if (cuadro.redundantes.length) {
    salida.push(
      hallazgo('tira-sobrante', 'grave', `Sobran tiras (${cuadro.redundantes.join(', ')}): sin ellas el cuadro sigue saliendo único.`),
    );
  }
  for (const p of cuadro.porPersona) {
    if (p.tiras === 0) {
      salida.push(hallazgo('ferroviario-sin-tiras', 'grave', `${p.nombre} no lleva ninguna tira: no tiene nada que aportar al cuadro.`, p.id));
    } else if (p.cuadrosSolo <= 1) {
      salida.push(
        hallazgo(
          'mano-que-lo-resuelve',
          'bloqueante',
          `Con sus tiras, ${p.nombre} saca el cuadro sin nadie más: la noche es suya y los demás miran.`,
          p.id,
        ),
      );
    } else if (p.cuadrosSinEl === 1) {
      salida.push(
        hallazgo(
          'ferroviario-sin-peso',
          'grave',
          `Sin las tiras de ${p.nombre} el cuadro sale igual: lo que lleva no hace falta para nada.`,
          p.id,
        ),
      );
    }
  }
  if (!cuadro.aLapiz) {
    salida.push(
      hallazgo(
        'cuadro-sin-lapiz',
        'grave',
        'El cuadro no sale tachando casillas a lápiz: hace falta probar y deshacer, que en una mesa se hace eterno.',
      ),
    );
  }

  // ---- La prosa de plantilla ----
  const plantilla = generarTramaNudo(game, { semilla: `${game.id}:${entidadesDe(game, 'ferroviarios').length}` });
  const tramaPlantilla = tramaDe(plantilla);
  const iguales: string[] = [];
  if (plot.synopsis === plantilla.synopsis) iguales.push('la sinopsis');
  if (plot.setting === plantilla.setting) iguales.push('la ambientación');
  const partesIguales = trama.partes.filter((p, i) => p === tramaPlantilla?.partes[i]).length;
  if (partesIguales) iguales.push(`${partesIguales} de ${trama.partes.length} partes`);
  const fichasIguales = plot.characters.filter((c) => {
    const suya = plantilla.characters.find((x) => x.participanteId === c.participanteId);
    return suya && suya.publicPersona === c.publicPersona && suya.secret === c.secret;
  }).length;
  if (fichasIguales) iguales.push(`${fichasIguales} de ${plot.characters.length} fichas`);
  if (JSON.stringify(plot.gmScript) === JSON.stringify(plantilla.gmScript)) iguales.push('el guion');

  const todoPlantilla =
    plot.synopsis === plantilla.synopsis &&
    plot.setting === plantilla.setting &&
    partesIguales === trama.partes.length &&
    fichasIguales === plot.characters.length;
  if (todoPlantilla) {
    salida.push(
      hallazgo(
        'prosa-de-plantilla',
        'bloqueante',
        'Toda la prosa es la de plantilla: la llamada al modelo no llegó a escribir la noche. Se juega, pero no es ' +
          'la velada que se ha pagado.',
      ),
    );
  } else if (iguales.length) {
    salida.push(hallazgo('prosa-a-medias', 'grave', `Sigue con texto de plantilla: ${iguales.join(', ')}.`));
  }

  // ---- Partes repetidos ----
  for (let i = 0; i < trama.partes.length; i++) {
    for (let j = i + 1; j < trama.partes.length; j++) {
      if (parecido(trama.partes[i]!, trama.partes[j]!) >= 0.8) {
        salida.push(
          hallazgo('partes-repetidos', 'grave', `Los partes de las franjas ${i + 1} y ${j + 1} dicen casi lo mismo.`, `parte-${j + 1}`),
        );
      }
    }
  }

  // ---- Frases que insinúan un orden ----
  const insinuaciones = insinuacionesDeOrden(game, plot);
  for (const i of insinuaciones) {
    salida.push(
      hallazgo(
        'insinua-orden',
        'grave',
        `En ${i.donde}: «${i.frase}» da a entender ${i.dice}. ${
          i.coincide ? 'COINCIDE con el cuadro verdadero: es una fuga.' : 'No coincide con el cuadro: es una pista falsa.'
        }`,
        i.sobre,
      ),
    );
  }

  // ---- Los partes: se leen al abrir su franja, pase lo que pase en la mesa ----
  const enLaProsa = convoyesEnLaProsa(game, trama.correo);
  trama.partes.forEach((parte, i) => {
    const sobre = `parte-${i + 1}`;
    const t = normalizar(parte);
    const yaVisto = insinuaciones.some((x) => x.sobre === sobre);
    const nombrados = enLaProsa.filter((c) => dondeSeNombra(t, c.claves));
    if (!yaVisto && nombrados.length) {
      const franjaDe = franjasDe(trama.cuadro);
      const coinciden = nombrados.filter((c) => franjaDe[c.id] === i + 1);
      salida.push(
        hallazgo(
          'parte-nombra-convoy',
          'grave',
          `El parte de la franja ${i + 1} nombra ${nombrados.map((c) => c.nombre).join(' y ')}: se lee al abrir esa franja y ` +
            `suena a «este es el de ahora».${
              coinciden.length ? ` Y ${coinciden.map((c) => c.nombre).join(' y ')} ES el de esa franja: es una fuga.` : ''
            }`,
          sobre,
        ),
      );
    }
    const dice = QUE_DA_POR_HECHO.exec(t);
    if (dice) {
      salida.push(
        hallazgo(
          'parte-da-por-hecho',
          'grave',
          `El parte de la franja ${i + 1} da por hecho cómo va la noche («…${dice[0]}…»), y se lee igual si no ha salido ` +
            `nadie que si han salido cuatro: a alguna mesa le mentirá.`,
          sobre,
        ),
      );
    }
  });

  // ---- Lo que no es de este juego, y los hechos que no se pueden cambiar ----
  const correo = enLaProsa.find((c) => c.id === trama.correo);
  for (const { donde, texto, clase, sobre } of textosDelNudo(plot)) {
    const t = normalizar(texto);
    if (CRIMEN.test(t) || (clase !== 'ficha' && DE_OTRO_JUEGO.test(t))) {
      salida.push(
        hallazgo(
          'hay-crimen',
          'grave',
          `En ${donde} hay un crimen, un muerto o un papel de otro juego (culpable, víctima, traidor): aquí no los hay, es otra noche.`,
          sobre,
        ),
      );
    }
    for (const frase of frasesDe(texto)) {
      const f = normalizar(frase);
      if (!f.includes('suero')) continue;
      const otro = enLaProsa.find((c) => c.id !== trama.correo && dondeSeNombra(f, c.claves));
      if (otro && !(correo && dondeSeNombra(f, correo.claves))) {
        salida.push(
          hallazgo(
            'suero-en-otro-convoy',
            'grave',
            `En ${donde}, «${frase}» pone el suero en ${otro.nombre}, y lo lleva ${correo?.nombre ?? 'el Correo'}.`,
            sobre,
          ),
        );
      }
    }
    // Los años, solo en lo que cuenta la noche: en una ficha, «entró en la casa en 1911» es legítimo.
    const esDeLaNoche = clase === 'noche' || clase === 'parte';
    for (const anio of esDeLaNoche ? texto.matchAll(ANIO) : []) {
      if (anio[1] !== '1927') {
        salida.push(hallazgo('fecha-cambiada', 'menor', `En ${donde} se habla de ${anio[1]}: la noche es la del 14 de enero de 1927.`, sobre));
      }
    }
  }

  // ---- Oficios cruzados ----
  for (const c of plot.characters) {
    const suyo = trama.oficioDePersona[c.participanteId] as OficioId | undefined;
    if (!suyo) continue;
    const t = normalizar(`${c.publicPersona ?? ''} ${c.personalHook ?? ''}`);
    const nombraSuyo = t.includes(normalizar(OFICIO_DE_PERSONA[suyo]));
    const otro = OFICIOS.find((o) => o !== suyo && t.includes(normalizar(OFICIO_DE_PERSONA[o])));
    if (otro && !nombraSuyo) {
      salida.push(
        hallazgo(
          'oficio-cruzado',
          'grave',
          `La ficha de ${c.characterName} le hace ${OFICIO_DE_PERSONA[otro]}, y esta noche es ${OFICIO_DE_PERSONA[suyo]}.`,
          c.participanteId,
        ),
      );
    }
  }

  // ---- Fichas de extensión desigual ----
  const largoDeFichas = plot.characters.map((c) => ({
    id: c.participanteId,
    nombre: c.characterName,
    largo: [c.publicPersona, c.secret, c.personalHook].filter(Boolean).join(' ').length,
  }));
  const orden = [...largoDeFichas].map((f) => f.largo).sort((a, b) => a - b);
  const mediana = orden.length ? orden[Math.floor(orden.length / 2)]! : 0;
  for (const f of largoDeFichas) {
    if (mediana > 0 && f.largo < mediana * 0.5) {
      salida.push(
        hallazgo('ficha-flaca', 'menor', `La ficha de ${f.nombre} ocupa ${f.largo} caracteres y la mediana ${mediana}: le toca menos papel que a nadie.`, f.id),
      );
    }
  }

  return { cuadro, insinuaciones, deLaPlantilla: iguales, largoDeFichas, hallazgos: salida };
}

/** La auditoría en texto, para el revisor. */
export function auditoriaNudoEnTexto(a: AuditoriaNudo): string {
  const c = a.cuadro;
  const lineas: string[] = [];
  if (c) {
    lineas.push(
      `EL CUADRO: ${c.soluciones} ${c.soluciones === 1 ? 'solución' : 'soluciones'}${c.unico ? ', la guardada' : ', NO la guardada'}; ` +
        `${c.redundantes.length} tiras de sobra; ${c.desalineadas.length} tiras desalineadas; ` +
        `${c.sinMano.length ? `${c.sinMano.length} tiras que no guarda nadie (con las de la mesa, ${c.solucionesConLaMesa} soluciones); ` : ''}` +
        `${c.aLapiz ? 'sale a lápiz' : 'NO sale a lápiz'}.`,
    );
    if (c.tiraMasFuerte) lineas.push(`La tira más fuerte, «${c.tiraMasFuerte.id}», deja ella sola ${c.tiraMasFuerte.cuadros} de 720 cuadros.`);
    lineas.push(
      'Por persona (tiras · cuadros que deja su mano sola · cuadros sin su mano):\n' +
        c.porPersona.map((p) => `- ${p.nombre}: ${p.tiras} · ${p.cuadrosSolo} · ${p.cuadrosSinEl}`).join('\n'),
    );
  }
  if (a.deLaPlantilla.length) lineas.push(`TEXTO DE PLANTILLA: ${a.deLaPlantilla.join(', ')}.`);
  lineas.push(
    'EXTENSIÓN DE LAS FICHAS (cara pública + secreto + gancho):\n' + a.largoDeFichas.map((f) => `- ${f.nombre}: ${f.largo}`).join('\n'),
  );
  return lineas.join('\n\n');
}
