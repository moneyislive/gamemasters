/**
 * La auditoría de una trama de CLUEDO: lo que se puede CONTAR sin entender.
 *
 * ═══ POR QUÉ HAY UNA PARTE HECHA CON CÓDIGO ═══
 *
 * Los tres fallos que estropearon veladas de verdad se pueden contar:
 *
 *   · En la casa Sabrón, el resumen que se leía al empezar nombraba TRES VECES
 *     a la asesina y a los demás casi nada. La mesa la miró desde el primer
 *     minuto.
 *   · En Villa CASAS varias armas no salían nombradas en ninguna parte: eran
 *     objetos de catálogo que nadie tenía, nadie usaba y nadie vio.
 *   · Y había personajes con tan poca historia que se pasaban la noche mirando.
 *
 * Un modelo que relee la trama puede no ver nada de eso —leer no es contar—, y
 * sobre todo no lo ve con la misma vara dos veces. Aquí se cuenta con la misma
 * vara siempre, y los números se le dan al revisor como hechos: «a la culpable
 * la nombra el texto público tres veces; a los demás, una como mucho».
 *
 * ═══ «EL MISMO TRATO» ═══
 *
 * Lo que se busca no es que al culpable se le señale poco. Es que se le señale
 * COMO A LOS DEMÁS: ni más —se delata— ni menos —nadie le sospecharía nunca y la
 * noche se resuelve por descarte, o no se resuelve—. Por eso cada medida del
 * culpable se compara con la franja de los inocentes, por arriba y por abajo.
 *
 * ═══ CÓMO SE RECONOCE UN NOMBRE ═══
 *
 * Por sus palabras EXCLUSIVAS: las que tiene esa persona, sala u objeto y nadie
 * más. «Condesa Cuchi de Alcántara» se reconoce por «cuchi» y «alcantara»; la
 * palabra «condesa» no cuenta —es un título— y «alcantara» dejaría de contar si
 * la víctima se apellidara igual. Es la misma idea que `LexicoDeRitos` en
 * `momia-validacion.ts`: una palabra que no distingue no sirve para contar.
 * Una entidad sin ninguna palabra exclusiva se busca por su nombre entero.
 *
 * Es una medida aproximada a propósito. No decide sola nada fino: lo grueso lo
 * marca como hallazgo y lo fino se lo pasa al revisor, que sí lee.
 */
import type { GameSession, HallazgoDeRevision, GravedadDeHallazgo, Plot } from '../../../shared/types';
import { pistasDeLaTrama } from '../../../shared/mecanicas/pistas';
import { cronologiaPublica, numeroDeRondas } from '../docs/datos';
import { culpableDe, lugarDe, objetoDe, objetosDe, salasDe, sospechososDe, victimaDe } from '../juegos/cluedo';

// ---------------------------------------------------------------------------
// Palabras
// ---------------------------------------------------------------------------

/** Minúsculas, sin acentos, y lo que no es letra o número convertido en espacio. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();
}

/** Palabras que no nombran a nadie: artículos, preposiciones y títulos de época. */
const VACIAS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a', 'y', 'e', 'o', 'u',
  'en', 'con', 'por', 'para', 'sin', 'su', 'sus', 'mi', 'tu', 'que', 'se', 'lo', 'le',
  // Títulos y tratamientos: los comparten media mesa en una velada de los años veinte.
  'don', 'dona', 'sr', 'sra', 'senor', 'senora', 'senorita', 'lady', 'lord', 'sir', 'madame', 'mme',
  'monsieur', 'mademoiselle', 'miss', 'mister', 'mr', 'mrs', 'conde', 'condesa', 'duque', 'duquesa',
  'marques', 'marquesa', 'baron', 'baronesa', 'principe', 'princesa', 'doctor', 'doctora', 'dr', 'dra',
  'profesor', 'profesora', 'capitan', 'coronel', 'general', 'padre', 'madre', 'sor', 'hermano',
  'hermana', 'tio', 'tia', 'abuelo', 'abuela', 'viuda', 'viudo', 'joven', 'mayordomo', 'ama',
  'inspector', 'inspectora', 'agente', 'detective', 'reverendo', 'monsenor', 'fray', 'excelentisimo',
  // Lo que acompaña a un objeto o a una sala sin distinguirlo.
  'sala', 'salon', 'cuarto', 'habitacion', 'estancia', 'pequeno', 'pequena', 'gran', 'grande', 'viejo',
  'vieja', 'antiguo', 'antigua', 'nuevo', 'nueva',
]);

function palabrasDe(nombre: string): string[] {
  return normalizar(nombre)
    .split(' ')
    .filter((p) => p.length >= 3 && !VACIAS.has(p));
}

/** Cuántas veces aparece una palabra en un texto ya normalizado (admite plural). */
function vecesQueAparece(textoNormalizado: string, palabra: string): number {
  if (!textoNormalizado) return 0;
  let n = 0;
  for (const t of textoNormalizado.split(' ')) {
    if (t === palabra || t === `${palabra}s` || t === `${palabra}es`) n += 1;
  }
  return n;
}

/**
 * El reconocedor de nombres de una trama concreta.
 *
 * Se construye una vez por auditoría con TODAS las entidades a la vez —y la
 * víctima—, porque qué palabra es exclusiva solo se sabe mirando a las demás.
 */
export class Nombres {
  private readonly exclusivas = new Map<string, string[]>();
  private readonly enteros = new Map<string, string>();

  constructor(entidades: Array<{ id: string; nombres: string[] }>) {
    const cuantas = new Map<string, number>();
    const propias = new Map<string, Set<string>>();
    for (const e of entidades) {
      const suyas = new Set(e.nombres.flatMap(palabrasDe));
      propias.set(e.id, suyas);
      for (const p of suyas) cuantas.set(p, (cuantas.get(p) ?? 0) + 1);
    }
    for (const e of entidades) {
      const suyas = [...(propias.get(e.id) ?? [])].filter((p) => cuantas.get(p) === 1);
      this.exclusivas.set(e.id, suyas);
      this.enteros.set(e.id, normalizar(e.nombres[0] ?? ''));
    }
  }

  /**
   * Cuántas veces nombra este texto a esta entidad. Se toma la palabra suya que
   * más aparece: «Cuchi de Alcántara … Cuchi» son dos menciones, no tres.
   */
  menciones(id: string, texto: string): number {
    const plano = normalizar(texto);
    if (!plano) return 0;
    const suyas = this.exclusivas.get(id) ?? [];
    if (suyas.length > 0) return Math.max(...suyas.map((p) => vecesQueAparece(plano, p)));
    const entero = this.enteros.get(id);
    if (!entero) return 0;
    return ` ${plano} `.split(` ${entero} `).length - 1;
  }

  /** ¿Tiene al menos una palabra con la que reconocerla? Si no, se busca el nombre entero. */
  reconocible(id: string): boolean {
    return (this.exclusivas.get(id) ?? []).length > 0 || Boolean(this.enteros.get(id));
  }
}

// ---------------------------------------------------------------------------
// Lo que se mide
// ---------------------------------------------------------------------------

export interface PesoDePersona {
  participanteId: string;
  /** El nombre de la persona de verdad y el de su personaje. */
  nombre: string;
  personaje: string;
  esCulpable: boolean;
  /**
   * Menciones en lo que oye la mesa entera antes de la primera ronda: título,
   * lema, sinopsis, ambientación, víctima, cronología pública, las caras
   * públicas DE LOS DEMÁS y la narración de apertura.
   */
  alEmpezar: number;
  /** Menciones en los dosieres de los demás (secreto, motivo, coartada, lo que saben) y en sus giros. */
  enDosieresAjenos: number;
  /** Menciones en cada ronda: sus pistas (descripción y a qué apuntan), su narración y sus hechos. Índice 0 = ronda 1. */
  porRonda: number[];
  /** Momentos de la cronología en los que figura. */
  enCronologia: number;
  /** Caracteres de su propio bloque de personaje: lo que pesa su sobre. */
  largoDelDosier: number;
}

export interface PesoDeCosa {
  id: string;
  nombre: string;
  /** ¿Es el arma o la sala del crimen? */
  delCrimen: boolean;
  /** Menciones en lo que ve la mesa: texto público, pistas, material. */
  alaVista: number;
  /** En cuántos dosieres de personaje aparece: quién la tiene, la usa o la vio. */
  dosieres: number;
  /** En cuántas pistas aparece. */
  pistas: number;
}

export interface AuditoriaCluedo {
  rondas: number;
  personas: PesoDePersona[];
  objetos: PesoDeCosa[];
  salas: PesoDeCosa[];
  hallazgos: HallazgoDeRevision[];
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[medio]! : (orden[medio - 1]! + orden[medio]!) / 2;
}

function hallazgo(codigo: string, gravedad: GravedadDeHallazgo, texto: string, sobre?: string): HallazgoDeRevision {
  return { codigo, gravedad, origen: 'auditoria', texto, estado: 'pendiente', ...(sobre ? { sobre } : {}) };
}

/** Palabras que convierten una frase en un veredicto en vez de en un indicio. */
const VEREDICTO =
  /\b(asesin[oa]s?|culpable|homicida|mat[oó]|lo mato|la mato|autor[a]? del crimen|el crimen lo cometi[oó]|lo hizo|responsable de la muerte)\b/i;

/**
 * Cuenta y marca. No escribe nada en la trama.
 *
 * Los umbrales son deliberadamente gruesos: aquí solo sale como hallazgo lo que
 * se ve a simple vista. Lo que está en el filo se lo cuenta el revisor con los
 * números delante.
 */
export function auditarTramaCluedo(game: GameSession, plot: Plot): AuditoriaCluedo {
  const sospechosos = sospechososDe(game);
  const objetos = objetosDe(game);
  const salas = salasDe(game);
  const culpable = culpableDe(plot.solution);
  const arma = objetoDe(plot.solution);
  const salaDelCrimen = lugarDe(plot.solution);
  const rondas = numeroDeRondas(plot);
  const pistas = pistasDeLaTrama(plot);
  const material = plot.material;
  const personajeDe = (id: string) => plot.characters.find((c) => c.participanteId === id);

  const nombres = new Nombres([
    ...sospechosos.map((s) => ({ id: s.id, nombres: [s.name, personajeDe(s.id)?.characterName ?? ''] })),
    ...objetos.map((o) => ({ id: o.id, nombres: [o.name] })),
    ...salas.map((r) => ({ id: r.id, nombres: [r.name] })),
    // La víctima entra para quitarles exclusividad a los apellidos que comparta.
    { id: '__victima', nombres: [victimaDe(plot).name] },
  ]);

  // ---- Los textos, por quién los ve ----
  const alEmpezarComun = [
    plot.title,
    plot.tagline,
    plot.synopsis,
    plot.setting,
    victimaDe(plot).description,
    ...cronologiaPublica(plot).map((e) => e.description),
    ...(material?.narrations ?? []).filter((n) => n.round === 0).map((n) => n.text),
  ].join('\n');

  const textoDeRonda = (r: number): string =>
    [
      ...pistas.filter((p) => p.round === r).flatMap((p) => [p.description, p.pointsTo]),
      ...(material?.narrations ?? []).filter((n) => n.round === r).map((n) => n.text),
      ...(material?.timelineReveals ?? []).filter((t) => t.round === r).map((t) => t.fact),
    ].join('\n');
  const rondasTexto = Array.from({ length: rondas }, (_, i) => textoDeRonda(i + 1));

  const dosierDe = (id: string): string => {
    const c = personajeDe(id);
    if (!c) return '';
    return [c.secret ?? '', c.motive ?? '', c.alibi ?? '', ...(c.knowledge ?? [])].join('\n');
  };
  const girosDe = (id: string): string =>
    (material?.twists ?? []).filter((g) => g.participanteId === id).map((g) => g.instruction).join('\n');

  // ---- Personas ----
  const personas: PesoDePersona[] = sospechosos.map((s) => {
    const c = personajeDe(s.id);
    const carasAjenas = plot.characters
      .filter((otro) => otro.participanteId !== s.id)
      .map((otro) => otro.publicPersona)
      .join('\n');
    const dosieresAjenos = sospechosos
      .filter((otro) => otro.id !== s.id)
      .map((otro) => `${dosierDe(otro.id)}\n${girosDe(otro.id)}`)
      .join('\n');
    return {
      participanteId: s.id,
      nombre: s.name,
      personaje: c?.characterName ?? '',
      esCulpable: s.id === culpable,
      alEmpezar: nombres.menciones(s.id, `${alEmpezarComun}\n${carasAjenas}`),
      enDosieresAjenos: nombres.menciones(s.id, dosieresAjenos),
      porRonda: rondasTexto.map((t) => nombres.menciones(s.id, t)),
      enCronologia: plot.timeline.filter((e) => e.participanteIds.includes(s.id)).length,
      largoDelDosier: c
        ? [c.role, c.publicPersona, c.secret, c.motive, c.alibi, ...(c.knowledge ?? []), c.personalHook]
            .filter(Boolean)
            .join(' ').length
        : 0,
    };
  });

  // ---- Objetos y salas ----
  const aLaVista = [alEmpezarComun, ...rondasTexto, ...(material?.hints ?? []).map((h) => h.text)].join('\n');
  const pesoDeCosa = (e: { id: string; name: string }, delCrimen: boolean): PesoDeCosa => ({
    id: e.id,
    nombre: e.name,
    delCrimen,
    alaVista: nombres.menciones(e.id, aLaVista),
    dosieres: sospechosos.filter((s) => nombres.menciones(e.id, dosierDe(s.id)) > 0).length,
    pistas: pistas.filter((p) => nombres.menciones(e.id, `${p.description}\n${p.pointsTo}`) > 0).length,
  });
  const pesosDeObjetos = objetos.map((o) => pesoDeCosa(o, o.id === arma));
  const pesosDeSalas = salas.map((r) => {
    const peso = pesoDeCosa(r, r.id === salaDelCrimen);
    // Una pista colocada en la sala cuenta como pista de la sala, la nombre o no.
    peso.pistas = Math.max(peso.pistas, pistas.filter((p) => p.lugarId === r.id).length);
    return peso;
  });

  return {
    rondas,
    personas,
    objetos: pesosDeObjetos,
    salas: pesosDeSalas,
    hallazgos: marcar(personas, pesosDeObjetos, pesosDeSalas, plot, rondas, nombres, culpable),
  };
}

function marcar(
  personas: PesoDePersona[],
  objetos: PesoDeCosa[],
  salas: PesoDeCosa[],
  plot: Plot,
  rondas: number,
  nombres: Nombres,
  culpableId: string,
): HallazgoDeRevision[] {
  const salida: HallazgoDeRevision[] = [];
  const culpable = personas.find((p) => p.esCulpable);
  const inocentes = personas.filter((p) => !p.esCulpable);
  const quien = (p: PesoDePersona) => `${p.personaje || p.nombre} (${p.nombre})`;

  if (culpable && inocentes.length > 0) {
    // ---- Lo que oye la mesa al empezar ----
    const maxInocente = Math.max(...inocentes.map((p) => p.alEmpezar));
    if (culpable.alEmpezar >= 2 && culpable.alEmpezar > maxInocente) {
      const muyMarcado = culpable.alEmpezar >= 3 && culpable.alEmpezar >= 2 * Math.max(1, maxInocente);
      salida.push(
        hallazgo(
          'apertura-senala',
          muyMarcado ? 'bloqueante' : 'grave',
          `Lo que la mesa oye antes de la primera ronda nombra ${culpable.alEmpezar} veces a ${quien(culpable)} ` +
            `y como mucho ${maxInocente} a cualquier otro: la sospecha empieza donde está la solución.`,
          culpable.participanteId,
        ),
      );
    }

    // ---- Las dos primeras rondas ----
    const temprano = (p: PesoDePersona) => (p.porRonda[0] ?? 0) + (p.porRonda[1] ?? 0);
    const maxTemprano = Math.max(...inocentes.map(temprano));
    if (temprano(culpable) >= 2 && temprano(culpable) > maxTemprano) {
      salida.push(
        hallazgo(
          'foco-temprano',
          'grave',
          `En las rondas 1 y 2 el material nombra ${temprano(culpable)} veces a ${quien(culpable)} y como mucho ` +
            `${maxTemprano} a los demás.`,
          culpable.participanteId,
        ),
      );
    }

    // ---- Y por abajo: que no se le deje fuera ----
    const sospechaHastaElFinal = (p: PesoDePersona) =>
      p.enDosieresAjenos + p.porRonda.slice(0, Math.max(1, rondas - 1)).reduce((a, b) => a + b, 0);
    const medianaInocentes = mediana(inocentes.map(sospechaHastaElFinal));
    if (medianaInocentes >= 2 && sospechaHastaElFinal(culpable) < medianaInocentes / 2) {
      salida.push(
        hallazgo(
          'culpable-a-salvo',
          'grave',
          `Hasta la última ronda, a ${quien(culpable)} se le nombra ${sospechaHastaElFinal(culpable)} veces en ` +
            `dosieres ajenos y pistas; a un inocente típico, ${medianaInocentes}. Nadie le va a sospechar y la ` +
            `noche se resuelve por descarte.`,
          culpable.participanteId,
        ),
      );
    }

    // ---- El sobre más gordo ----
    const medianaLargo = mediana(inocentes.map((p) => p.largoDelDosier));
    if (medianaLargo > 0 && culpable.largoDelDosier > medianaLargo * 1.35) {
      salida.push(
        hallazgo(
          'dosier-del-culpable',
          'grave',
          `El personaje de ${quien(culpable)} ocupa ${culpable.largoDelDosier} caracteres y el de un inocente ` +
            `típico ${Math.round(medianaLargo)}: en papel, su sobre es el más gordo de la mesa.`,
          culpable.participanteId,
        ),
      );
    }
  }

  // ---- Personas sin historia ----
  const peso = (p: PesoDePersona) =>
    p.alEmpezar + p.enDosieresAjenos + p.porRonda.reduce((a, b) => a + b, 0) + p.enCronologia;
  const medianaPeso = mediana(personas.map(peso));
  const medianaLargoTodos = mediana(personas.map((p) => p.largoDelDosier));
  for (const p of personas) {
    if (medianaPeso >= 4 && peso(p) < medianaPeso * 0.45) {
      salida.push(
        hallazgo(
          'personaje-secundario',
          'grave',
          `${quien(p)} apenas aparece en la noche: ${peso(p)} menciones y momentos frente a ${medianaPeso} de ` +
            `una persona típica de esta mesa. Quien lo juegue se pasará la velada mirando.`,
          p.participanteId,
        ),
      );
    } else if (medianaLargoTodos > 0 && p.largoDelDosier < medianaLargoTodos * 0.6) {
      salida.push(
        hallazgo(
          'dosier-flaco',
          'grave',
          `El personaje de ${quien(p)} tiene ${p.largoDelDosier} caracteres frente a ${Math.round(medianaLargoTodos)} ` +
            `de la mediana: tiene menos que contar y menos que ocultar que los demás.`,
          p.participanteId,
        ),
      );
    }
  }

  // ---- Objetos ----
  for (const o of objetos) {
    if (o.alaVista + o.pistas === 0) {
      salida.push(
        hallazgo(
          'objeto-sin-nombrar',
          o.delCrimen ? 'bloqueante' : 'grave',
          `«${o.nombre}» no aparece en nada de lo que ve la mesa${o.delCrimen ? ', y ES EL ARMA' : ''}: ` +
            `es un objeto de atrezo que nadie va a considerar.`,
          o.id,
        ),
      );
    } else if (o.dosieres === 0) {
      salida.push(
        hallazgo(
          'objeto-sin-dueno',
          'grave',
          `«${o.nombre}» no está en el dosier de nadie: ningún personaje lo tiene, lo usa o lo vio. Un arma que no ` +
            `es de nadie no entra en la historia.`,
          o.id,
        ),
      );
    }
  }
  const armaPeso = objetos.find((o) => o.delCrimen);
  if (armaPeso && armaPeso.pistas === 0 && armaPeso.alaVista + armaPeso.pistas > 0) {
    salida.push(hallazgo('arma-sin-pistas', 'grave', `Ninguna pista habla de «${armaPeso.nombre}», que es el arma.`, armaPeso.id));
  }

  // ---- Salas ----
  for (const r of salas) {
    if (r.pistas === 0) {
      salida.push(
        hallazgo(
          'sala-sin-pistas',
          r.delCrimen ? 'bloqueante' : 'grave',
          `En «${r.nombre}» no hay ninguna pista${r.delCrimen ? ', y ES DONDE OCURRIÓ' : ''}: quien entre no encontrará nada.`,
          r.id,
        ),
      );
    }
  }

  // ---- Frases que dictan en vez de indicar ----
  for (const pista of pistasDeLaTrama(plot)) {
    const texto = `${pista.description}\n${pista.pointsTo}`;
    const nombrados = personas.filter((p) => nombres.menciones(p.participanteId, texto) > 0);
    if (nombrados.length === 1 && nombrados[0]!.participanteId === culpableId && VEREDICTO.test(normalizar(texto))) {
      salida.push(
        hallazgo(
          'pista-que-dicta',
          pista.round <= 2 ? 'bloqueante' : 'grave',
          `La pista «${pista.id}» (ronda ${pista.round}) nombra solo a la persona culpable y habla en términos de ` +
            `veredicto. Tiene que dejar deducir, no decirlo.`,
          pista.id,
        ),
      );
    } else if (nombrados.length > 0 && VEREDICTO.test(normalizar(pista.pointsTo))) {
      salida.push(
        hallazgo(
          'destino-veredicto',
          'menor',
          `El «a qué apunta» de la pista «${pista.id}» habla de asesino o culpable. Quien la encuentra lo lee al ` +
            `cerrar la ronda: tiene que sonar a indicio, no a sentencia.`,
          pista.id,
        ),
      );
    }
  }

  // ---- El material ----
  const material = plot.material;
  if (material) {
    const conGiro = new Set(material.twists.map((g) => g.participanteId));
    const inocentesSinGiro = personas.filter((p) => !p.esCulpable && !conGiro.has(p.participanteId));
    if (conGiro.size > 0 && inocentesSinGiro.length === 0) {
      salida.push(
        hallazgo(
          'giros-delatores',
          'bloqueante',
          'Todos los inocentes reciben un giro y la persona culpable no: el único sobre que no llega señala la solución.',
          'giros',
        ),
      );
    }
    for (const ayuda of material.hints) {
      const nombrados = personas.filter((p) => nombres.menciones(p.participanteId, ayuda.text) > 0);
      if (nombrados.some((p) => p.esCulpable)) {
        salida.push(
          hallazgo(
            'ayuda-que-nombra',
            'grave',
            `La ayuda de nivel ${ayuda.level} nombra a la persona culpable. Puede señalar la sala o el objeto, nunca a la persona.`,
            `ayuda-${ayuda.level}`,
          ),
        );
      }
    }
  }

  return salida;
}

/**
 * Los números, en texto, para el revisor. Una tabla por lo que se mide, con la
 * fila del culpable marcada: el revisor tiene que ver la franja de los demás.
 */
export function auditoriaEnTexto(a: AuditoriaCluedo): string {
  const personas = a.personas
    .map(
      (p) =>
        `- ${p.esCulpable ? '[CULPABLE] ' : ''}${p.personaje || p.nombre} (${p.participanteId}): ` +
        `al empezar ${p.alEmpezar} · en dosieres ajenos ${p.enDosieresAjenos} · por ronda ${p.porRonda.join('/')} · ` +
        `en la cronología ${p.enCronologia} · su bloque ${p.largoDelDosier} caracteres`,
    )
    .join('\n');
  const cosas = (lista: PesoDeCosa[], del: string) =>
    lista
      .map(
        (c) =>
          `- ${c.delCrimen ? `[${del}] ` : ''}«${c.nombre}» (${c.id}): a la vista ${c.alaVista} · en ${c.dosieres} ` +
          `dosieres · en ${c.pistas} pistas`,
      )
      .join('\n');
  return `MENCIONES POR PERSONA (contadas con código; «al empezar» = lo que la mesa oye antes de la ronda 1):
${personas}

OBJETOS:
${cosas(a.objetos, 'ARMA')}

SALAS:
${cosas(a.salas, 'SALA DEL CRIMEN')}`;
}
