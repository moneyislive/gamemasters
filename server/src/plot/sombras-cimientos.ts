/**
 * Los cimientos de una noche de El Paso de las Sombras: todo lo que decide el
 * CÓDIGO.
 *
 * Se llama antes de que el modelo escriba una sola palabra, y lo que devuelve es
 * un `TramaSombras` COMPLETO y jugable: la senda verdadera, los hitos ya
 * redactados por `redactarHito`, las falsas, el reparto por pasos y horas, las
 * contraseñas de las puertas, los disfraces, los estandartes y los portes.
 *
 * ESO ES LO IMPORTANTE Y CONVIENE DECIRLO DESPACIO: la partida ya se puede jugar
 * aquí. Lo que hace después el modelo es SUSTITUIR frases sosas por frases
 * bonitas, una a una, y solo cuando cada sustitución pasa la validación. El
 * modelo es una capa de mejora, no un eslabón del que dependa que la noche tenga
 * solución. Si la llamada falla, si el JSON viene roto, si el modelo se inventa
 * la mitad: se llega a la barca igual.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ LAS TABLAS SE IMPORTAN Y NO SE COPIAN
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * El gemelo de este fichero en la Momia (`momia-cimientos.ts`) declara su propia
 * lista de dones, duplicando la de `juegos/momia-trama.ts`, y su cabecera lo
 * reconoce como provisional. Aquí no se repite el error: los disfraces, los
 * portes y las contraseñas viven en `juegos/sombras-trama.ts` —que es quien los
 * usa para jugar— y este módulo los importa. Una tabla duplicada es una tabla
 * que se queda vieja, y estas tres se leen desde la app, desde el papel y desde
 * el prompt.
 */
import {
  generarSenda,
  maximoQueJuntaUnaPersona,
  redactarHito,
  repartirHitos,
  verificarSenda,
} from '../juegos/sombras-senda';
import type { Hallazgo, InformeDeLaSenda, PuzleSombras } from '../juegos/sombras-senda';
import {
  CONTRASENAS,
  HORAS_POR_DEFECTO,
  PAPELES_REPARTIBLES,
  PORTES,
} from '../juegos/sombras-trama';
import type { PapelRepartible } from '../juegos/sombras-trama';
import type { Entidad } from '../../../shared/juegos/entidades';
import type {
  CondicionEscrita,
  PapelId,
  PasoId,
  PorteId,
  TramaSombras,
} from '../../../shared/juegos/sombras-tipos';

export { HORAS_POR_DEFECTO };

/**
 * Qué palabras de la descripción de una persona empujan hacia qué disfraz.
 *
 * NO es una lectura psicológica: es un empujón. La presentación de la categoría
 * en el manifiesto le promete a quien organiza que «el disfraz que le toque
 * depende de lo que cuentes aquí», y con un reparto puramente al azar esa
 * promesa era mentira. Con esto, quien regatea en el mercado acaba de comerciante
 * bastante a menudo, que es lo que se le prometió. Cuando la descripción no dice
 * nada reconocible, el reparto es el de siempre y no pasa nada.
 *
 * El tipo va sobre los REPARTIBLES y no sobre `PapelId`: pedirle una lista de
 * pistas a `falsear` habría sido decir que también se reparte aquí.
 */
const PISTAS_DE_PAPEL: Record<PapelRepartible, string[]> = {
  rastrear: ['monte', 'campo', 'camina', 'andar', 'orient', 'mapa', 'natur', 'excursion', 'senderis', 'silenci', 'paciente', 'observa'],
  amparar: ['calla', 'timid', 'tímid', 'discret', 'reservad', 'protec', 'cuida', 'leal', 'fiel', 'guard', 'grandot'],
  comprar: ['dinero', 'negoci', 'vend', 'regate', 'convenc', 'labia', 'comerci', 'organiz', 'jefe', 'trapiche', 'manipul', 'lider', 'líder'],
  adelantarse: ['inquiet', 'no para', 'energ', 'rapid', 'impacien', 'curios', 'cotill', 'pregunt', 'adelant', 'deporte'],
  referir: ['normal', 'corrient', 'sencill', 'modest', 'desapercib', 'tranquil', 'apunta', 'anota', 'detall', 'ordenad'],
  trocar: ['gracios', 'bromis', 'divertid', 'histrion', 'teatr', 'chiste', 'anima', 'sociable', 'simpat', 'no se calla', 'discut'],
};

// ---------------------------------------------------------------------------
// Azar con semilla
// ---------------------------------------------------------------------------

/*
 * El mismo criterio que en `sombras-senda.ts`: con semilla, para que un fallo
 * encontrado de noche se pueda reproducir por la mañana. La semilla natural es
 * el id de la partida, así que regenerar la misma partida da la misma noche
 * salvo que se pida otra cosa.
 */
function azarCon(semilla: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) {
    h ^= semilla.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let estado = h >>> 0 || 1;
  return () => {
    estado ^= estado << 13;
    estado ^= estado >>> 17;
    estado ^= estado << 5;
    estado >>>= 0;
    return estado / 4294967296;
  };
}

function barajar<T>(items: T[], rnd: () => number): T[] {
  const copia = [...items];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}

// ---------------------------------------------------------------------------
// Los disfraces
// ---------------------------------------------------------------------------

function puntuarPapel(descripcion: string, papel: PapelRepartible): number {
  const texto = descripcion.toLocaleLowerCase('es');
  return PISTAS_DE_PAPEL[papel].reduce((suma, pista) => (texto.includes(pista) ? suma + 1 : suma), 0);
}

/**
 * Reparte los disfraces intentando que a cada cual le pegue el suyo.
 *
 * Primero se sirven los que tienen una preferencia clara y en orden de fuerza:
 * si alguien encaja con `comprar` por tres palabras distintas, se le da antes que
 * a quien encaja por una. Los demás se reparten con lo que quede. Cuando hay más
 * de seis personas los disfraces se repiten, que es lo correcto: seis papeles
 * distintos en una mesa de diez ya dan de sobra para que hablar valga la pena.
 *
 * BARAJADOS TAMBIÉN EN LA PRIMERA VUELTA. Sin eso, en una mesa donde nadie tenga
 * una descripción que dispare una preferencia salen siempre los cuatro primeros
 * de la lista y los dos últimos no se reparten nunca: dos de los seis papeles del
 * juego no existirían para esa mesa, y ninguna semilla lo cambiaría. Es un fallo
 * que la Momia tuvo y que se arregló allí; aquí nace arreglado.
 */
function repartirPapeles(gente: Entidad[], rnd: () => number): Record<string, PapelId> {
  const repartibles = PAPELES_REPARTIBLES.map((p) => p.papel);
  const orden = barajar(gente, rnd);
  const candidaturas: Array<{ id: string; papel: PapelRepartible; fuerza: number }> = [];
  for (const persona of orden) {
    for (const papel of repartibles) {
      const fuerza = puntuarPapel(persona.description ?? '', papel);
      if (fuerza > 0) candidaturas.push({ id: persona.id, papel, fuerza });
    }
  }
  candidaturas.sort((a, b) => b.fuerza - a.fuerza);

  const papeles: Record<string, PapelId> = {};
  const usados = new Set<PapelRepartible>();
  for (const c of candidaturas) {
    if (papeles[c.id] || usados.has(c.papel)) continue;
    papeles[c.id] = c.papel;
    usados.add(c.papel);
  }

  let libres: PapelRepartible[] = barajar(repartibles.filter((p) => !usados.has(p)), rnd);
  for (const persona of orden) {
    if (papeles[persona.id]) continue;
    if (libres.length === 0) libres = barajar([...repartibles], rnd);
    papeles[persona.id] = libres.shift()!;
  }
  return papeles;
}

// ---------------------------------------------------------------------------
// El remiendo del reparto
// ---------------------------------------------------------------------------

/**
 * Que ningún hito cierto se quede sin aparecer en ningún paso.
 *
 * NO ES UNA PRECAUCIÓN TEÓRICA: la Momia lo descubrió generando. El reparto
 * recorre los hitos con un desplazamiento fijo por hora, y cuando ese paso
 * resulta múltiplo del número de hitos —seis hitos y seis pasos, que es una
 * partida de lo más normal— el desplazamiento efectivo es cero: todas las horas
 * reparten los mismos y el sexto no está en ningún sitio ninguna noche.
 *
 * Y ese hito hace falta. El conjunto es MÍNIMO, así que sin él lo que la mesa
 * puede reunir admite más de una senda y no se llega a la barca por mucho que
 * hablen. Nadie lo notaría hasta las dos de la mañana.
 *
 * El reparto ya lo arregla en su sitio (`juegos/sombras-senda.ts`). Esto no lo
 * vuelve a arreglar: lo COMPRUEBA, que es distinto. Un remiendo silencioso aquí
 * dejaría pasar una regresión de allí sin que nadie se enterase; reventar al
 * preparar, con el taller delante, se arregla en un minuto.
 *
 * @throws si algún hito cierto no aparece en ningún paso.
 */
function exigirQueTodosSePuedanEncontrar(hallazgos: Hallazgo[], hitos: string[]): Hallazgo[] {
  const encontrables = new Set(hallazgos.map((h) => h.hitoId));
  const faltan = hitos.filter((id) => !encontrables.has(id));
  if (faltan.length > 0) {
    throw new Error(
      `El reparto deja ${faltan.length} hito(s) sin aparecer en ningún paso (${faltan.join(', ')}): ` +
        'la mesa nunca podría reunir el camino entero y no se llegaría a la barca.',
    );
  }
  return hallazgos;
}

// ---------------------------------------------------------------------------
// Los cimientos
// ---------------------------------------------------------------------------

export interface EntidadesDeSombras {
  escoltas: Entidad[];
  pasos: Entidad[];
  enseres: Entidad[];
  estandartes: Entidad[];
}

export interface Cimientos {
  trama: TramaSombras;
  puzle: PuzleSombras;
  informe: InformeDeLaSenda;
  /** Qué hitos son falsos, por id. Se guarda aparte porque NO viaja al modelo. */
  idsFalsos: Set<string>;
}

export interface OpcionesCimientos {
  semilla?: string;
  horas?: number;
}

/**
 * Compone la mitad de la partida que garantiza el código.
 *
 * @throws si el generador no consigue una senda que cumpla las cuatro garantías,
 * o si faltan pasos. Reventar aquí —al preparar, con el taller delante— es
 * infinitamente mejor que entregar una noche irresoluble.
 */
export function cimientosDeSombras(
  entidades: EntidadesDeSombras,
  opciones: OpcionesCimientos = {},
): Cimientos {
  const { escoltas, pasos, enseres, estandartes } = entidades;
  if (pasos.length < 6) {
    throw new Error(`El camino necesita al menos seis pasos y hay ${pasos.length}.`);
  }
  if (escoltas.length < 2) throw new Error('Hacen falta al menos dos personas en la columna.');

  const semilla = opciones.semilla ?? 'sombras';
  const rnd = azarCon(`${semilla}·cimientos`);
  const horas = Math.max(1, opciones.horas ?? HORAS_POR_DEFECTO);

  const idsDePaso = pasos.map((p) => p.id as PasoId);
  const puzle = generarSenda({
    pasos: idsDePaso,
    jugadores: escoltas.length,
    semilla: `${semilla}·senda`,
    /*
     * UN HITO MÁS QUE HORAS, y no es una preferencia de diseño: sin esto la mesa
     * mínima no se puede generar. Se entra en un paso por hora y cada paso da un
     * hito, así que quien reconozca las cuatro noches se lleva cuatro hitos. Si
     * el camino se resolviera con cuatro, una sola persona lo sacaría en
     * solitario y el chequeo de más abajo —que exige justamente que nadie pueda
     * juntarlos todos— reventaría la generación.
     */
    minimoCondiciones: horas + 1,
  });

  const informe = verificarSenda(idsDePaso, puzle);
  if (!informe.ok) {
    /*
     * `generarSenda` ya comprueba lo suyo antes de devolver, así que llegar aquí
     * significa que las dos comprobaciones discrepan. Pasar de largo sería
     * entregar una partida que una de las dos considera rota.
     */
    throw new Error(
      `La senda generada no pasa su propia verificación (única: ${informe.unico}, repartida: ${informe.repartida}, mínima: ${informe.minimo}, falsas sanas: ${informe.falsasSanas}).`,
    );
  }

  const nombreDePaso = (id: PasoId): string => pasos.find((p) => p.id === id)?.name ?? id;

  /*
   * LOS IDS SE REPARTEN DESPUÉS DE MEZCLAR, Y ESO NO ES UN DETALLE.
   *
   * Los ids de los hitos viajan al modelo dentro del prompt. Si los verdaderos
   * fueran «v-1, v-2…» y los falsos «f-1, f-2…» —o simplemente si los verdaderos
   * se numeraran primero— el modelo sabría cuáles son mentira con solo mirar la
   * lista, y podría escribirlos con otro tono sin querer. Una pista que suena
   * distinta a las demás se delata sola, y ahí se acaba el juego adversarial. Se
   * mezclan primero y se numeran después: el id no dice nada.
   */
  const mezclados = barajar(
    [
      ...puzle.condiciones.map((condicion) => ({ condicion, falso: false })),
      ...puzle.falsas.map((f) => ({ condicion: f.condicion, falso: true })),
    ],
    rnd,
  ).map((item, i) => ({ ...item, id: `m-${String(i + 1).padStart(2, '0')}` }));

  const escribir = (item: { id: string; condicion: (typeof mezclados)[number]['condicion'] }): CondicionEscrita => ({
    id: item.id,
    condicion: item.condicion,
    // La redacción del código. El modelo la sustituirá si la suya se puede
    // verificar; mientras tanto, la partida ya es jugable con esta.
    texto: redactarHito(item.condicion, nombreDePaso),
  });

  const condiciones = mezclados.filter((m) => !m.falso).map(escribir);
  const falsasCandidatas = mezclados.filter((m) => m.falso).map(escribir);

  const hallazgos = exigirQueTodosSePuedanEncontrar(
    repartirHitos({
      hitos: condiciones.map((c) => c.id),
      pasos: idsDePaso,
      rondas: horas,
      semilla: `${semilla}·hitos`,
    }),
    condiciones.map((c) => c.id),
  );

  /*
   * Después de tocar el reparto hay que volver a mirar lo único que no se puede
   * perder: que nadie junte el camino entero por su cuenta. Si el remiendo de
   * arriba hubiera puesto un hito donde no debía, esto lo caza AQUÍ, con el
   * taller delante, y no de noche.
   */
  if (maximoQueJuntaUnaPersona(hallazgos) >= condiciones.length) {
    throw new Error(
      'El reparto de hitos deja que una sola persona los junte todos: podría trazar la senda sin hablar con nadie.',
    );
  }

  /*
   * Dónde esperan los cazadores cada hora. Nunca dos horas seguidas el mismo
   * paso: con repetición, la mesa aprende a evitar una sola habitación y el
   * peligro deja de dar miedo.
   */
  const batidos: string[] = [];
  const baraja = barajar(idsDePaso, rnd);
  for (let i = 0; i < horas; i++) {
    const candidato = baraja[i % baraja.length]!;
    batidos.push(
      candidato === batidos[batidos.length - 1] && baraja.length > 1
        ? baraja[(i + 1) % baraja.length]!
        : candidato,
    );
  }

  /*
   * LAS CONTRASEÑAS, y son ÚNICAS POR PASO. Repetir una sería regalar la puerta
   * de una habitación a quien abrió otra, que es exactamente lo que la mecánica
   * viene a impedir. Como hay dieciséis palabras y el generador no admite más de
   * dieciséis pasos, la baraja alcanza siempre; el `%` es una red por si alguien
   * sube el tope y se olvida de ampliar la tabla.
   */
  const palabras = barajar(CONTRASENAS, rnd);
  const contrasenas: Record<string, string> = {};
  pasos.forEach((paso, i) => {
    contrasenas[paso.id] = palabras[i % palabras.length]!.palabra;
  });

  /* Los tres portes, a tres enseres distintos. Si hay menos de tres, los que quepan. */
  const cargables = barajar(enseres, rnd);
  const portes: Record<string, PorteId> = {};
  PORTES.forEach((p, i) => {
    const enser = cargables[i];
    if (enser) portes[enser.id] = p.porte;
  });

  /*
   * Y quién carga cada cosa al empezar. En rueda sobre la gente barajada, para
   * que el farol no caiga siempre en la misma silla.
   */
  const portadores = barajar(escoltas, rnd);
  const cargaInicial: Record<string, string> = {};
  cargables.forEach((enser, i) => {
    cargaInicial[enser.id] = portadores[i % portadores.length]!.id;
  });

  /* Los estandartes, uno por persona. Se repiten si hay menos casas que gente. */
  const banderas = barajar(estandartes, rnd);
  const porCasa: Record<string, string> = {};
  if (banderas.length > 0) {
    escoltas.forEach((e, i) => {
      porCasa[e.id] = banderas[i % banderas.length]!.id;
    });
  }

  const trama: TramaSombras = {
    sendaVerdadera: puzle.sendaVerdadera,
    condiciones,
    falsasCandidatas,
    batidos,
    hallazgos,
    contrasenas,
    papeles: repartirPapeles(escoltas, rnd),
    estandartes: porCasa,
    portes,
    cargaInicial,
    enserComprometido: cargables.length ? cargables[cargables.length - 1]!.id : '',
  };

  return {
    trama,
    puzle,
    informe,
    idsFalsos: new Set(falsasCandidatas.map((f) => f.id)),
  };
}
