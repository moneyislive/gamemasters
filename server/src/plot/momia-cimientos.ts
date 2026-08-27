/**
 * Los cimientos de una partida de la Momia: todo lo que decide el CÓDIGO.
 *
 * Se llama antes de que el modelo escriba una sola palabra, y lo que devuelve
 * es un `TramaMomia` COMPLETO y jugable: el orden verdadero, las restricciones
 * ya redactadas por `redactar()`, las falsas, el reparto por cámaras y vigilias,
 * los dones y la reliquia codiciada.
 *
 * ESO ES LO IMPORTANTE Y CONVIENE DECIRLO DESPACIO: la partida ya se puede
 * jugar aquí. Lo que hace después el modelo es SUSTITUIR frases sosas por
 * frases bonitas, una a una, y solo cuando cada sustitución pasa la validación.
 * El modelo es una capa de mejora, no un eslabón del que dependa que la velada
 * tenga solución. Si la llamada falla, si el JSON viene roto, si el modelo se
 * inventa la mitad: la tumba se sella igual.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PROVISIONAL, Y ADREDE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * El §7 del diseño pone «el reparto de dones», «qué cámara se profana» y «el
 * reparto de fragmentos» en la columna del código, y el código del puzle vive en
 * `juegos/momia-puzle.ts`. Este fichero NO reimplementa nada de aquello: llama a
 * `generarPuzle` y a `repartirHallazgos` y se limita a las tres decisiones
 * sueltas que todavía no tienen dueño —qué cámara se profana cada noche, qué don
 * le toca a cada cual y qué reliquia persigue el saqueador—. El día que
 * `juegos/momia-trama.ts` exponga una función equivalente, `cimientosDeMomia`
 * pasa a ser una línea que la llama.
 */
import {
  generarPuzle,
  maximoQueJuntaUnaPersona,
  redactar,
  repartirHallazgos,
  verificarPuzle,
} from '../juegos/momia-puzle';
import type { Hallazgo, InformeDelPuzle, PuzleMomia } from '../juegos/momia-puzle';
import type { Entidad } from '../../../shared/juegos/entidades';
import type { DonId, RestriccionEscrita, RitoId, TramaMomia } from '../../../shared/juegos/momia-tipos';

/** Cuántas vigilias tiene una noche si nadie dice otra cosa. */
export const VIGILIAS_POR_DEFECTO = 4;

/**
 * Los dones que se reparten.
 *
 * `falsificar` NO está, y no es un olvido. El §3.3 del diseño lo dice: el don
 * del saqueador no se anuncia, «en su dosier aparece como un rol normal con un
 * don normal, y falsificar se le añade en secreto». Además, quién es el
 * saqueador lo elige el MODELO —es lo único de la solución que le corresponde—,
 * así que cuando esto se reparte todavía no se sabe a quién habría que dárselo.
 * `falsificar` se deriva de ser el saqueador, no de esta tabla.
 */
const DONES_REPARTIBLES = [
  'descifrar',
  'sanar',
  'proteger',
  'sobornar',
  'documentar',
  'excavar',
] as const satisfies readonly DonId[];

type DonRepartible = (typeof DONES_REPARTIBLES)[number];

/**
 * Qué palabras de la descripción de una persona empujan hacia qué don.
 *
 * NO es una lectura psicológica: es un empujón. La presentación de la categoría
 * en el manifiesto le promete al Game Master que «el don que le toque depende de
 * lo que cuentes aquí», y con un reparto puramente al azar esa promesa era
 * mentira. Con esto, quien discute por deporte acaba de epigrafista bastante a
 * menudo, que es lo que se le prometió. Cuando la descripción no dice nada
 * reconocible, el reparto es el de siempre y no pasa nada.
 *
 * El tipo va sobre los REPARTIBLES y no sobre `DonId`: pedirle una lista de
 * pistas a `falsificar` habría sido decir que también se reparte aquí.
 */
const PISTAS_DE_DON: Record<DonRepartible, string[]> = {
  descifrar: ['discut', 'habla', 'no se calla', 'lee', 'libro', 'idioma', 'letra', 'listill', 'sabelotodo', 'curios', 'crucigram', 'erudit'],
  sanar: ['cuida', 'amable', 'enfermer', 'medic', 'atent', 'maternal', 'paternal', 'empat', 'buen coraz', 'pacient'],
  proteger: ['calla', 'timid', 'tímid', 'leal', 'fiel', 'guard', 'protec', 'reservad', 'discret', 'grandot'],
  sobornar: ['dinero', 'negoci', 'vend', 'convenc', 'jefe', 'organiz', 'lider', 'líder', 'manipul', 'labia', 'trapiche'],
  documentar: ['foto', 'movil', 'móvil', 'redes', 'artist', 'dibuj', 'observ', 'detall', 'apunta', 'graba'],
  excavar: ['fuerte', 'deporte', 'trabaj', 'manos', 'bricolaje', 'incansable', 'energ', 'inquiet', 'no para', 'monta'],
};

// ---------------------------------------------------------------------------
// Azar con semilla
// ---------------------------------------------------------------------------

/*
 * El mismo criterio que en `momia-puzle.ts`: con semilla, para que un fallo
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
// Los dones
// ---------------------------------------------------------------------------

function puntuarDon(descripcion: string, don: DonRepartible): number {
  const texto = descripcion.toLocaleLowerCase('es');
  return PISTAS_DE_DON[don].reduce((suma, pista) => (texto.includes(pista) ? suma + 1 : suma), 0);
}

/**
 * Reparte los dones intentando que a cada cual le pegue el suyo.
 *
 * Primero se sirven los que tienen una preferencia clara y en orden de fuerza:
 * si alguien encaja con `descifrar` por tres palabras distintas, se le da antes
 * que a quien encaja por una. Los demás se reparten con lo que quede. Cuando hay
 * más de seis personas los dones se repiten, que es lo correcto: seis papeles
 * distintos en una mesa de diez ya dan de sobra para que hablar valga la pena.
 */
function repartirDones(gente: Entidad[], rnd: () => number): Record<string, DonId> {
  const orden = barajar(gente, rnd);
  const candidaturas: Array<{ id: string; don: DonRepartible; fuerza: number }> = [];
  for (const persona of orden) {
    for (const don of DONES_REPARTIBLES) {
      const fuerza = puntuarDon(persona.description ?? '', don);
      if (fuerza > 0) candidaturas.push({ id: persona.id, don, fuerza });
    }
  }
  candidaturas.sort((a, b) => b.fuerza - a.fuerza);

  const dones: Record<string, DonId> = {};
  const usados = new Set<DonRepartible>();
  for (const c of candidaturas) {
    if (dones[c.id] || usados.has(c.don)) continue;
    dones[c.id] = c.don;
    usados.add(c.don);
  }

  // Los que quedan, con los dones que quedan; y si se acaban, se vuelve a
  // empezar la vuelta. `libres` se recalcula para no repetir hasta agotar.
  let libres: DonRepartible[] = DONES_REPARTIBLES.filter((d) => !usados.has(d));
  for (const persona of orden) {
    if (dones[persona.id]) continue;
    if (libres.length === 0) libres = barajar([...DONES_REPARTIBLES], rnd);
    dones[persona.id] = libres.shift()!;
  }
  return dones;
}

// ---------------------------------------------------------------------------
// El remiendo del reparto
// ---------------------------------------------------------------------------

/**
 * Que ningún fragmento cierto se quede sin aparecer en ninguna cámara.
 *
 * NO ES UNA PRECAUCIÓN TEÓRICA: se descubrió generando. `repartirHallazgos`
 * recorría los fragmentos con un desplazamiento fijo por vigilia, y cuando ese
 * paso resultaba múltiplo del número de fragmentos —seis fragmentos y cinco
 * cámaras, que es una partida de lo más normal— el desplazamiento efectivo era
 * cero: todas las vigilias repartían los mismos cinco y el sexto no estaba en
 * ninguna cámara ninguna noche.
 *
 * Y ese fragmento hace falta. El conjunto es MÍNIMO, así que sin él el papiro
 * que la mesa puede reunir admite más de un orden y la tumba no se sella por
 * mucho que hablen. Nadie lo notaría hasta las dos de la mañana.
 *
 * El reparto ya lo arregla en su sitio (`juegos/momia-puzle.ts`). Esto no lo
 * vuelve a arreglar: lo COMPRUEBA, que es distinto. Un remiendo silencioso aquí
 * dejaría pasar una regresión de allí sin que nadie se enterase; reventar al
 * preparar, con el taller delante, se arregla en un minuto. Fallar pronto y
 * ruidosamente es lo correcto cuando la alternativa es fallar tarde y en
 * silencio.
 *
 * @throws si algún fragmento cierto no aparece en ninguna cámara.
 */
function exigirQueTodosSePuedanEncontrar(hallazgos: Hallazgo[], fragmentos: string[]): Hallazgo[] {
  const encontrables = new Set(hallazgos.map((h) => h.fragmentoId));
  const faltan = fragmentos.filter((id) => !encontrables.has(id));
  if (faltan.length > 0) {
    throw new Error(
      `El reparto deja ${faltan.length} fragmento(s) sin aparecer en ninguna cámara (${faltan.join(', ')}): ` +
        'la mesa nunca podría reunir el papiro entero y la tumba no se podría sellar.',
    );
  }
  return hallazgos;
}

// ---------------------------------------------------------------------------
// Los cimientos
// ---------------------------------------------------------------------------

export interface EntidadesDeMomia {
  expedicionarios: Entidad[];
  camaras: Entidad[];
  reliquias: Entidad[];
  ritos: Entidad[];
}

export interface Cimientos {
  trama: TramaMomia;
  puzle: PuzleMomia;
  informe: InformeDelPuzle;
  /** Qué fragmentos son falsos, por id. Se guarda aparte porque NO viaja al modelo. */
  idsFalsos: Set<string>;
}

export interface OpcionesCimientos {
  semilla?: string;
  vigilias?: number;
}

/**
 * Compone la mitad de la partida que garantiza el código.
 *
 * @throws si el generador de puzles no consigue uno que cumpla las cuatro
 * garantías, o si faltan ritos. Reventar aquí —al preparar, con el taller
 * delante— es infinitamente mejor que entregar una velada irresoluble.
 */
export function cimientosDeMomia(
  entidades: EntidadesDeMomia,
  opciones: OpcionesCimientos = {},
): Cimientos {
  const { expedicionarios, camaras, reliquias, ritos } = entidades;
  if (ritos.length < 3) {
    throw new Error(`El sellado necesita al menos tres ritos y hay ${ritos.length}.`);
  }
  if (camaras.length === 0) throw new Error('No hay cámaras donde esconder los fragmentos.');
  if (expedicionarios.length < 2) throw new Error('Hacen falta al menos dos expedicionarios.');

  const semilla = opciones.semilla ?? 'momia';
  const rnd = azarCon(`${semilla}·cimientos`);
  const vigilias = Math.max(1, opciones.vigilias ?? VIGILIAS_POR_DEFECTO);

  const idsDeRito = ritos.map((r) => r.id as RitoId);
  const puzle = generarPuzle({
    ritos: idsDeRito,
    jugadores: expedicionarios.length,
    semilla: `${semilla}·puzle`,
  });

  const informe = verificarPuzle(idsDeRito, puzle);
  if (!informe.ok) {
    /*
     * `generarPuzle` ya comprueba lo suyo antes de devolver, así que llegar aquí
     * significa que las dos comprobaciones discrepan. Pasar de largo sería
     * entregar una partida que una de las dos considera rota.
     */
    throw new Error(
      `El puzle generado no pasa su propia verificación (único: ${informe.unico}, repartido: ${informe.repartida}, mínimo: ${informe.minimo}, falsas sanas: ${informe.falsasSanas}).`,
    );
  }

  const nombreDeRito = (id: RitoId): string => ritos.find((r) => r.id === id)?.name ?? id;

  /*
   * LOS IDS SE REPARTEN DESPUÉS DE MEZCLAR, Y ESO NO ES UN DETALLE.
   *
   * Los ids de los fragmentos viajan al modelo dentro del prompt. Si las
   * verdaderas fueran «v-1, v-2…» y las falsas «f-1, f-2…» —o simplemente si
   * las verdaderas se numeraran primero— el modelo sabría cuáles son mentira
   * con solo mirar la lista, y podría escribirlas con otro tono sin querer. Una
   * pista que suena distinta a las demás se delata sola, y ahí se acaba el juego
   * adversarial. Se mezclan primero y se numeran después: el id no dice nada.
   */
  const mezclados = barajar(
    [
      ...puzle.restricciones.map((restriccion) => ({ restriccion, falso: false })),
      ...puzle.falsas.map((f) => ({ restriccion: f.restriccion, falso: true })),
    ],
    rnd,
  ).map((item, i) => ({
    ...item,
    id: `p-${String(i + 1).padStart(2, '0')}`,
  }));

  const escribir = (item: { id: string; restriccion: (typeof mezclados)[number]['restriccion'] }): RestriccionEscrita => ({
    id: item.id,
    restriccion: item.restriccion,
    // La redacción del código. El modelo la sustituirá si la suya se puede
    // verificar; mientras tanto, la partida ya es jugable con esta.
    texto: redactar(item.restriccion, nombreDeRito),
  });

  const restricciones = mezclados.filter((m) => !m.falso).map(escribir);
  const falsasCandidatas = mezclados.filter((m) => m.falso).map(escribir);

  const hallazgos = exigirQueTodosSePuedanEncontrar(
    repartirHallazgos({
      fragmentos: restricciones.map((r) => r.id),
      camaras: camaras.map((c) => c.id),
      rondas: vigilias,
      semilla: `${semilla}·hallazgos`,
    }),
    restricciones.map((r) => r.id),
  );

  /*
   * Después de tocar el reparto hay que volver a mirar lo único que no se puede
   * perder: que nadie junte el puzle entero por su cuenta. Si el remiendo de
   * arriba hubiera puesto un fragmento donde no debía, esto lo caza AQUÍ, con el
   * taller delante, y no de noche.
   */
  if (maximoQueJuntaUnaPersona(hallazgos) >= restricciones.length) {
    throw new Error(
      'El reparto de fragmentos deja que una sola persona los junte todos: podría sellar la tumba sin hablar con nadie.',
    );
  }

  /*
   * Qué cámara se profana cada noche. Nunca dos noches seguidas la misma: con
   * repetición, la mesa aprende a evitar una sola habitación y la maldición deja
   * de dar miedo.
   */
  const profanadas: string[] = [];
  const baraja = barajar(camaras.map((c) => c.id), rnd);
  for (let i = 0; i < vigilias; i++) {
    const candidata = baraja[i % baraja.length]!;
    profanadas.push(
      candidata === profanadas[profanadas.length - 1] && baraja.length > 1
        ? baraja[(i + 1) % baraja.length]!
        : candidata,
    );
  }

  const trama: TramaMomia = {
    ordenVerdadero: puzle.ordenVerdadero,
    restricciones,
    falsasCandidatas,
    profanadas,
    hallazgos,
    dones: repartirDones(expedicionarios, rnd),
    reliquiaCodiciada: reliquias.length ? barajar(reliquias, rnd)[0]!.id : '',
  };

  return {
    trama,
    puzle,
    informe,
    idsFalsos: new Set(falsasCandidatas.map((f) => f.id)),
  };
}
