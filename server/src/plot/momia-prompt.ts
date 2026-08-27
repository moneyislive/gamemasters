/**
 * El prompt con el que se le pide al modelo la trama de El Misterio de la Momia.
 *
 * Tres cosas que decidir aquí, y las tres se explican solas cuando se ve lo que
 * pasa si se deciden al revés:
 *
 * 1. QUÉ SABE EL MODELO DEL PUZLE. Sabe qué dice cada restricción que tiene que
 *    redactar, porque sin eso no puede escribirla. NO sabe cuáles son falsas
 *    —van revueltas con las verdaderas en una sola lista— y NO sabe el orden
 *    verdadero salvo en el bloque reservado del desenlace, que es el único
 *    sitio donde se puede contar. Lo que no sabe no lo puede filtrar.
 *
 * 2. CÓMO SE LE PIDE LA REDACCIÓN. Con una forma verificable, no con «escribe
 *    algo bonito que signifique esto». `momia-validacion.ts` vuelve a leer cada
 *    frase, y solo puede comprobar lo que aquí se ha exigido. El prompt y el
 *    validador son un contrato: si cambia uno, cambia el otro.
 *
 * 3. CUÁNTO SE PERSONALIZA. Todo lo que se pueda. La descripción que el Game
 *    Master escribió de cada invitado real es la materia prima del producto: si
 *    dijo «discute por deporte», eso tiene que acabar en su papel, en su don y
 *    en su gancho. Se le pide explícitamente y se le da el material.
 */
import type { GameSession } from '../../../shared/types';
import type { Entidad } from '../../../shared/juegos/entidades';
import type { DonId, Restriccion, RitoId, TramaMomia } from '../../../shared/juegos/momia-tipos';
import { buildStyleBlock } from './style';

/** El papel de quien escribe. Se cachea como bloque de sistema. */
export const SISTEMA_MOMIA =
  'Eres un escritor de misterio y un egiptólogo de gabinete. Escribes veladas de deducción en vivo ' +
  'ambientadas en 1923, el año de Tutankamón: expediciones reales, prensa, comisiones de antigüedades y ' +
  'gente con deudas. Tu especialidad es que cada personaje le venga como un guante a la persona real ' +
  'que va a interpretarlo. Escribes siempre en español, para ser leído en voz alta ante una mesa: ' +
  'frases cortas, sin subordinadas largas, sin adornos que se traben. ' +
  'No inventas reglas del juego ni lógica del puzle: eso viene dado y se respeta al pie de la letra. ' +
  'Devuelves exclusivamente el JSON pedido, respetando los ids proporcionados.';

/** Cómo se llama cada don por dentro y qué hace, para que el modelo lo justifique. */
const DONES: Record<DonId, string> = {
  descifrar: 'lee jeroglíficos: cada vigilia recibe un fragmento de papiro más, en privado',
  sanar: 'atiende a los enfermos: cada vigilia le quita una marca de la maldición a otra persona',
  proteger: 'monta guardia: a quien elija no le alcanza la maldición esa vigilia',
  sobornar: 'tiene tratos con los guardianes: sabe de antemano qué cámara se profanará la vigilia siguiente',
  documentar: 'fotografía lo que encuentra: puede hacer público uno de sus fragmentos',
  excavar: 'manda la cuadrilla: entra en una segunda cámara cada vigilia, a cambio de una marca',
  falsificar: 'sabe imitar la mano de un escriba muerto',
};

/** Cómo se le dicta al modelo una restricción, sin que tenga que interpretarla. */
function dictarRestriccion(r: Restriccion, nombre: (id: RitoId) => string): string {
  switch (r.tipo) {
    case 'antes':
      return `«${nombre(r.a)}» va en algún momento ANTES que «${nombre(r.b)}» (no necesariamente pegado).`;
    case 'inmediatamente-antes':
      return `«${nombre(r.a)}» va JUSTO antes que «${nombre(r.b)}», sin ningún rito en medio.`;
    case 'posicion':
      return `«${nombre(r.a)}» ocupa exactamente el lugar ${r.posicion} de los cinco.`;
    case 'no-posicion':
      return `«${nombre(r.a)}» NO ocupa el lugar ${r.posicion} (puede ocupar cualquier otro).`;
    case 'extremos':
      return `«${nombre(r.a)}» es el primero o el último, nunca uno de los tres del medio.`;
    default:
      return '';
  }
}

/**
 * Las reglas de redacción. Son el contrato con `momia-validacion.ts`.
 *
 * Cada regla existe porque el validador la comprueba, y el validador la
 * comprueba porque sin ella la frase se puede leer de dos maneras. La más
 * importante es la del orden de mención: en español «A precede a B» y «B no
 * llega hasta que A haya pasado» significan lo mismo, y ninguna máquina barata
 * puede distinguirlas. Fijando que el rito que va antes se nombre antes, la
 * frase solo admite una lectura.
 */
const REGLAS_DE_REDACCION = `REGLAS DE REDACCIÓN DE LOS FRAGMENTOS (se comprueban una a una con código; una frase
que no las cumpla se tira y se sustituye por otra sosa escrita a máquina):

  R1. La frase nombra los ritos implicados por su NOMBRE tal y como aparece en la
      lista de ritos, y NO nombra ningún otro rito. Ni de pasada, ni comparando.
  R2. En las restricciones de orden («antes» y «justo antes»), el rito que va
      ANTES se nombra ANTES dentro de la frase.
  R3. En esas mismas, usa una de estas palabras: precede, antes, delante,
      anterior, previo. Y NO uses ninguna de estas otras, que invierten el
      sentido: después, tras, posterior, luego, detrás, sigue.
  R4. En «justo antes» añade además una marca de inmediatez: inmediatamente,
      justo, nada se interpone, sin nada en medio. En un «antes» normal NO la
      pongas: convertiría una restricción floja en una fuerte que no es cierta.
  R5. En las de lugar («ocupa el lugar N»), di el ordinal (el primero, el
      segundo, el tercero, el cuarto, el quinto o el último) y NO uses ninguna
      negación. Nombra un solo lugar.
  R6. En las de lugar negadas («NO ocupa el lugar N»), di el ordinal Y niégalo
      claramente: no, nunca, jamás.
  R7. En las de extremos, deja claro que es el primero O el último: o nombras
      los dos extremos («abre o cierra»), o niegas el medio («jamás en medio»).
  R8. De 8 a 25 palabras. Tono de papiro roto: sentencioso, seco, sin explicar.
      Nada de «esto significa que…».`;

/** Lista de entidades para el prompt, con sus ids exactos. */
function listar(items: Entidad[], vacio: string): string {
  if (items.length === 0) return `- (${vacio})`;
  return items
    .map((e) => `- id: "${e.id}" · nombre: "${e.name}"${e.description?.trim() ? ` · ${e.description.trim()}` : ''}`)
    .join('\n');
}

export interface EntidadesMomia {
  expedicionarios: Entidad[];
  camaras: Entidad[];
  reliquias: Entidad[];
  ritos: Entidad[];
}

/**
 * El prompt de usuario.
 *
 * Recibe la trama ya generada por el código: el orden verdadero, las
 * restricciones, los dones y las cámaras profanadas ya están decididos antes de
 * que el modelo escriba una palabra. Eso invierte la relación habitual —aquí el
 * modelo ilustra un puzle que ya existe, no lo inventa— y es lo que hace que la
 * partida no pueda salir irresoluble.
 */
export function construirPromptMomia(
  game: GameSession,
  trama: TramaMomia,
  entidades: EntidadesMomia,
): string {
  const nombreRito = (id: RitoId): string =>
    entidades.ritos.find((r) => r.id === id)?.name ?? id;
  const nombreCamara = (id: string): string =>
    entidades.camaras.find((c) => c.id === id)?.name ?? id;
  const nombrePersona = (id: string): string =>
    entidades.expedicionarios.find((e) => e.id === id)?.name ?? id;

  /*
   * LA LISTA REVUELTA. Verdaderas y falsas en una sola tanda, ordenadas por id
   * y sin ninguna marca. El modelo no puede escribir las falsas con otro tono
   * porque no sabe cuáles son, y ese es exactamente el mecanismo que hace que
   * un fragmento falso no se delate en la mesa. El código sí sabe cuál es cuál
   * y las vuelve a separar al recibir la respuesta.
   */
  const aRedactar = [...trama.restricciones, ...trama.falsasCandidatas]
    .map((r) => ({ id: r.id, restriccion: r.restriccion }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const fragmentos = aRedactar
    .map((r) => `- id: "${r.id}" → ${dictarRestriccion(r.restriccion, nombreRito)}`)
    .join('\n');

  const dones = entidades.expedicionarios
    .map((e) => {
      const don = trama.dones[e.id];
      return `- "${e.id}" (${e.name}): ${don ? DONES[don] : 'sin don asignado'}`;
    })
    .join('\n');

  const vigilias = trama.profanadas
    .map((camaraId, i) => `- Vigilia ${i + 1}: se profana «${nombreCamara(camaraId)}»`)
    .join('\n');

  const reliquia = entidades.reliquias.find((r) => r.id === trama.reliquiaCodiciada);

  return `Escribe la trama completa de una velada de misterio en vivo llamada "${game.name}", del juego
EL MISTERIO DE LA MOMIA. Es 1923. Una expedición ha abierto una tumba sellada durante tres mil
años, alguien de dentro rompió el sello a propósito, y antes del amanecer hay que volver a
sellarla ejecutando cinco ritos en un orden exacto.

LA EXPEDICIÓN (personas REALES que se sentarán a la mesa; usa sus ids EXACTOS):
${listar(entidades.expedicionarios, 'sin expedicionarios registrados')}

LAS CÁMARAS (habitaciones REALES de la casa donde se juega; usa sus ids EXACTOS):
${listar(entidades.camaras, 'sin cámaras registradas')}

LAS RELIQUIAS (objetos que han salido de la tumba; usa sus ids EXACTOS):
${listar(entidades.reliquias, 'sin reliquias registradas')}

LOS CINCO RITOS DEL SELLADO (usa sus ids EXACTOS; su ORDEN no lo decides tú):
${listar(entidades.ritos, 'sin ritos registrados')}

═══════════════════════════════════════════════════════════════════════════
LO QUE YA ESTÁ DECIDIDO Y NO PUEDES CAMBIAR
═══════════════════════════════════════════════════════════════════════════

El don de cada expedicionario (escribe en "elDon" por qué en la ficción le toca
precisamente ese, en segunda persona; NO cambies el don ni se lo des a otro):
${dones}

Qué cámara se profana en cada vigilia (la narración de cada una tiene que nombrarla):
${vigilias}

La reliquia que el saqueador tiene vendida de antemano: ${reliquia ? `"${reliquia.name}" (id ${reliquia.id})` : '(ninguna registrada)'}

═══════════════════════════════════════════════════════════════════════════
LOS FRAGMENTOS DE PAPIRO
═══════════════════════════════════════════════════════════════════════════

Cada fragmento dice UNA cosa sobre el orden de los cinco ritos. Tú no decides
qué dicen: te doy exactamente lo que dice cada uno y tú escribes la frase que se
lee en el papiro. Devuelve uno por cada id, con ese id EXACTO, ni uno más ni uno
menos.

${fragmentos}

${REGLAS_DE_REDACCION}

═══════════════════════════════════════════════════════════════════════════
LO QUE TIENES QUE ESCRIBIR
═══════════════════════════════════════════════════════════════════════════

1. EL FARAÓN Y SU TUMBA. Quién fue, por qué su tumba se selló como se selló, qué
   advertía el sello, qué se abrió y qué pasó la noche en que se rompió. La
   ambientación tiene que reconocerse como la CASA REAL descrita en las cámaras:
   si una cámara es «el pasillo largo con la lámpara que parpadea», eso aparece.

2. UN DOSIER POR PERSONA, exactamente uno por cada id de la expedición, hecho a
   la medida de esa persona real. Esto es lo que vende la velada:
   - Lee su descripción psicológica y ÚSALA. Si el Game Master escribió «discute
     por deporte», su papel tiene que ser uno donde discutir sea su herramienta,
     y "personalHook" tiene que citar ese rasgo y decir cómo se aprovecha.
   - Si de alguien no se dijo nada, dale un papel de los que tiran de la mesa
     —quien reparte, quien acusa primero— y dilo así en "personalHook".
   - Secretos incómodos pero SEGUROS: nada que se parezca demasiado a la vida
     real de esa persona. Contrabando de antigüedades, una tesis robada, una
     deuda de juego en El Cairo: escándalos de ficción.
   - Coartadas CRUZADAS: cada una nombra a otro expedicionario concreto, y las
     dos versiones tienen que decir lo mismo.
   - "knowledge": de dos a cuatro cosas que sabe de OTROS y puede soltar en la
     mesa. Es lo que da conversación a quien es tímido.

3. QUIÉN ROMPIÓ EL SELLO Y POR QUÉ. Elige a UNO de la expedición (su id exacto en
   "saqueadorId"). Su motivo tiene que DOLER: no «lo hizo por dinero», sino algo
   que la mesa entienda y casi perdone —una hermana en un sanatorio, el nombre de
   un padre borrado de la historia por quien firma los hallazgos, un pacto hecho
   cuando no había otra salida—. Que al descubrirse, a alguien le dé pena.
   El saqueador NO se anuncia en ninguna parte pública: ni en la sinopsis, ni en
   las vigilias, ni en el dosier de nadie más.

4. LA NARRACIÓN DE CADA VIGILIA (${trama.profanadas.length} en total, en orden), para leerse en voz
   alta. Cada una nombra la cámara que se profana esa noche y sube la presión:
   la maldición avanza, el aire se enrarece, quedan menos horas. Ninguna dice el
   orden de los ritos ni insinúa quién rompió el sello.

5. LOS RITOS, LAS CÁMARAS Y LAS RELIQUIAS. Una invocación y un gesto físico por
   rito —algo que se pueda hacer de verdad en un salón—, una inscripción de
   dintel por cámara, y un relato por reliquia.

6. LA CRONOLOGÍA de la noche en que se rompió el sello, de 6 a 10 momentos.
   "publico" en true SOLO para lo que vio la expedición entera a la vez; un
   momento con una sola persona nunca es público, porque los públicos se
   imprimen en el dosier de TODOS.

7. EL DESENLACE. La reconstrucción de aquella noche, la confesión del saqueador
   en primera persona —la lee quien lo interpretó— y el epílogo.

8. EL GUION de quien dirige: al menos 8 pasos, de abrir la primera vigilia a
   ejecutar el sellado y leer el desenlace.

═══════════════════════════════════════════════════════════════════════════
RESERVADO — SOLO PARA QUE EL DESENLACE ENCAJE
═══════════════════════════════════════════════════════════════════════════

El orden verdadero de los cinco ritos es:
${trama.ordenVerdadero.map((id, i) => `  ${i + 1}. ${nombreRito(id)}`).join('\n')}

Este orden aparece ÚNICAMENTE en "desenlace.reconstruccion". No lo enumeres en la
sinopsis, ni en las vigilias, ni en las inscripciones de las cámaras, ni en los
dosieres, ni en las ayudas. Si aparece fuera de ahí, la velada se acaba en la
primera media hora.

Los expedicionarios, por si necesitas nombrarlos en el desenlace: ${entidades.expedicionarios.map((e) => `${e.name} (${e.id})`).join(', ')}.
Son personas de carne y hueso que van a leer esto en voz alta: el personaje se
escribe para la persona, nunca al revés.

TODO en español.${buildStyleBlock(game)}`;
}
