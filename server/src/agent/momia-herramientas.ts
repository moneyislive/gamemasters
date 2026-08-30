/**
 * Las herramientas con las que El Escriba monta una expedición.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ NO SE REUTILIZAN LAS DE CLUEDO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Podrían: `upsert_suspect` guarda en `suspects`, que es donde el manifiesto de
 * la Momia dice que viven los expedicionarios, y lo mismo con salas y objetos.
 * Funcionaría. Y sería un error por dos motivos:
 *
 *   · Los `ritos` NO CABEN. No son personas, ni lugares, ni objetos: no hay
 *     tercera herramienta que los admita, y son cinco piezas obligatorias sin
 *     las cuales no hay puzle. La Momia se quedaría sin poder registrarlos.
 *   · La descripción de una herramienta es prompt. `upsert_weapon` dice «un
 *     objeto real que hará de arma del crimen», y con eso delante el asistente
 *     de una expedición arqueológica habla de armas del crimen. El modelo lee
 *     esas frases tanto como el system prompt.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ASÍ QUE SE GENERAN DESDE EL MANIFIESTO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Un juego declara sus categorías —con su singular, su plural, su mínimo y su
 * texto de presentación— y de ahí salen dos herramientas por categoría, ya
 * redactadas en el vocabulario de ese juego. Un tercer juego con «naves» y
 * «tripulantes» tendrá las suyas sin escribir una línea.
 *
 * CLUEDO NO PASA POR AQUÍ, y es deliberado: sus herramientas se llaman
 * `upsert_suspect` desde el primer día, están en el maestro de oro y el taller
 * las conoce por ese nombre. Renombrarlas para ganar elegancia sería tocar el
 * único juego que ya está en producción a cambio de nada. Conviven; el informe
 * de arquitectura propone cuándo retirar las viejas.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { nanoid } from 'nanoid';
import { categoria as categoriaDe, entidadesDe, listaDeCategoria, manifiestoDe } from '../../../shared/juegos';
import type { DefinicionCategoria, ManifiestoDeJuego } from '../../../shared/juegos';
import { getStore } from '../db/store';
import type { GameSession, UiCommand } from '../../../shared/types';

/** Lo que devuelve una herramienta ejecutada. Igual que en `tools.ts`. */
export interface ResultadoDeHerramienta {
  result: string;
  game?: GameSession;
  ui?: UiCommand;
}

/**
 * El sufijo con el que se nombra la herramienta de una categoría.
 *
 * Los nombres de herramienta solo admiten `[a-zA-Z0-9_-]`, y los singulares del
 * manifiesto llevan acentos («cámara»). Se normaliza aquí y no en el manifiesto
 * porque el manifiesto está escrito para leerse en la interfaz, en español y con
 * sus tildes puestas.
 */
export function sufijoDeCategoria(cat: DefinicionCategoria): string {
  return cat.singular
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * El artículo que le toca a una categoría.
 *
 * Se deduce de la terminación del singular, que en español acierta casi siempre
 * («cámara» → una, «rito» → un). Es una heurística y como tal está: la
 * alternativa era un campo `genero` en el manifiesto, y meterle gramática al
 * contrato general para redactar una frase de herramienta no compensa.
 */
function unUna(cat: DefinicionCategoria): string {
  return /a$/i.test(cat.singular) ? 'una' : 'un';
}

/** «de la cámara» / «del rito», para los mensajes de error. */
function delDeLa(cat: DefinicionCategoria): string {
  return /a$/i.test(cat.singular) ? `de la ${cat.singular}` : `del ${cat.singular}`;
}

/** Cómo se le explica al modelo qué es esta categoría. */
function descripcionDeAlta(cat: DefinicionCategoria): string {
  const partes = [
    `Crea o actualiza ${unUna(cat)} ${cat.singular}.`,
    cat.presentacion?.descripcion ?? '',
    cat.presentacion?.pista ? `Ten en cuenta: ${cat.presentacion.pista}` : '',
    `Llámala en cuanto el Game Master mencione ${unUna(cat)}, con la descripción más completa que haya dado: esa descripción alimenta la generación de la trama.`,
    'Con `id` actualiza la que ya existe; sin `id` crea una nueva.',
  ];
  return partes.filter(Boolean).join(' ');
}

/** Las dos herramientas de una categoría. */
function herramientasDe(cat: DefinicionCategoria): Anthropic.Messages.Tool[] {
  const sufijo = sufijoDeCategoria(cat);
  const propiedadesAlta: Record<string, unknown> = {
    id: { type: 'string', description: `Id de ${cat.singular} ya registrada, para actualizarla. Omitir para crear.` },
    name: {
      type: 'string',
      description: cat.presentacion?.ejemploNombre
        ? `Nombre. Por ejemplo: «${cat.presentacion.ejemploNombre}».`
        : 'Nombre.',
    },
    description: {
      type: 'string',
      description: cat.presentacion?.ejemploDescripcion
        ? `Descripción. Por ejemplo: «${cat.presentacion.ejemploDescripcion}». Cuanto más rica, mejor sale la trama.`
        : 'Descripción. Cuanto más rica, mejor sale la trama.',
    },
  };
  if (cat.admiteEmail) {
    propiedadesAlta.email = {
      type: 'string',
      description: 'Correo electrónico (opcional, para enviarle su dosier).',
    };
  }

  return [
    {
      name: `upsert_${sufijo}`,
      description: descripcionDeAlta(cat),
      input_schema: { type: 'object', properties: propiedadesAlta, required: ['name'] },
    },
    {
      name: `remove_${sufijo}`,
      description: `Elimina ${unUna(cat)} ${cat.singular} de la partida por su id.`,
      input_schema: {
        type: 'object',
        properties: { id: { type: 'string', description: `Id de ${cat.singular} a eliminar.` } },
        required: ['id'],
      },
    },
  ];
}

/** Las herramientas de alta y baja de todas las categorías de un juego. */
export function herramientasDeCategorias(manifiesto: ManifiestoDeJuego): Anthropic.Messages.Tool[] {
  return manifiesto.categorias.flatMap(herramientasDe);
}

/** Lee una propiedad de texto del input ya parseado por el SDK. */
function texto(input: Record<string, unknown>, clave: string): string | undefined {
  const valor = input[clave];
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : undefined;
}

/**
 * Ejecuta una herramienta de categoría, si el nombre es de una.
 *
 * Devuelve `null` cuando la herramienta no es de aquí, para que quien llama siga
 * con su propio `switch`. Es lo que permite que las comunes —`get_game_state`,
 * las de interfaz, `start_generation`— sigan viviendo en un solo sitio y no haya
 * dos copias que se puedan desincronizar.
 */
export async function ejecutarHerramientaDeCategoria(
  game: GameSession,
  name: string,
  input: unknown,
): Promise<ResultadoDeHerramienta | null> {
  const manifiesto = manifiestoDe(game.settings?.juego);
  const alta = name.startsWith('upsert_');
  const baja = name.startsWith('remove_');
  if (!alta && !baja) return null;

  const sufijo = name.slice(name.indexOf('_') + 1);
  const cat = manifiesto.categorias.find((c) => sufijoDeCategoria(c) === sufijo);
  if (!cat) return null;

  const datos: Record<string, unknown> =
    input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const store = getStore();
  /*
   * `listaDeCategoria` devuelve el array REAL de dentro de la partida —creándolo
   * si hace falta— porque aquí se escribe. `entidadesDe`, que es la de leer,
   * devolvería una lista que a veces no está dentro de la partida y los cambios
   * se perderían al guardar.
   */
  const lista = listaDeCategoria(game, cat.id);

  if (baja) {
    const id = texto(datos, 'id');
    if (!id) return { result: `Error: falta el id ${delDeLa(cat)} a eliminar.` };
    const indice = lista.findIndex((e) => e.id === id);
    if (indice === -1) return { result: `Error: no existe ningún «${cat.singular}» con id «${id}».` };
    const [fuera] = lista.splice(indice, 1);
    const actualizada = await store.saveGame(game);
    return {
      result: `«${fuera?.name ?? id}» eliminado de ${cat.plural}. Quedan ${lista.length}.`,
      game: actualizada,
    };
  }

  const id = texto(datos, 'id');
  const nombre = texto(datos, 'name');
  if (!nombre && !id) return { result: `Error: falta el nombre ${delDeLa(cat)}.` };

  const existente = id ? lista.find((e) => e.id === id) : undefined;
  if (id && !existente) return { result: `Error: no existe ningún «${cat.singular}» con id «${id}».` };

  if (existente) {
    if (nombre) existente.name = nombre;
    const descripcion = texto(datos, 'description');
    if (descripcion) existente.description = descripcion;
    if (cat.admiteEmail) {
      const email = texto(datos, 'email');
      if (email) existente.email = email;
    }
  } else {
    lista.push({
      id: nanoid(10),
      name: nombre as string,
      description: texto(datos, 'description'),
      ...(cat.admiteEmail ? { email: texto(datos, 'email') } : {}),
    });
  }

  const actualizada = await store.saveGame(game);
  const guardada = existente ?? lista[lista.length - 1]!;
  return {
    result: `«${guardada.name}» guardado en ${cat.plural} (id: ${guardada.id}). Total: ${lista.length}.`,
    game: actualizada,
  };
}

/**
 * ¿Están cubiertos los mínimos para generar?
 *
 * Sale del manifiesto, así que un juego que exija cinco de algo lo dice una vez
 * y lo cumplen a la vez el asistente, el taller y esta comprobación.
 *
 * LOS RITOS SON EXACTAMENTE CINCO Y NO «CINCO O MÁS». El manifiesto solo sabe
 * declarar un mínimo, y para el puzle del sellado un sexto rito no es «más de lo
 * mismo»: son 720 permutaciones en vez de 120 y una sobremesa que no acaba.
 * Mientras el contrato no sepa decir «exactamente N», la excepción vive aquí y
 * se dice en voz alta.
 */
export function faltanMinimos(game: GameSession): string[] {
  const manifiesto = manifiestoDe(game.settings?.juego);
  const faltan: string[] = [];
  for (const cat of manifiesto.categorias) {
    // `entidadesDe` y no `listaDeCategoria`: esto solo lee, y la de escribir
    // crea la lista dentro de la partida. Una simple comprobación dejaría
    // `entidades: {}` escrito en partidas de CLUEDO que no lo tenían, y el
    // maestro de oro compara la partida byte a byte.
    const cuantas = entidadesDe(game, cat.id).length;
    /*
     * Aquí decía `if (cat.id === 'ritos' && cuantas !== 5)`: una regla de El
     * Misterio de la Momia escrita en un fichero que atiende a todos los
     * juegos. Ahora lo declara la categoría, que es quien lo sabe.
     */
    if (cat.exacto !== undefined && cuantas !== cat.exacto) {
      faltan.push(`${cat.plural}: hay ${cuantas} y hacen falta exactamente ${cat.exacto}`);
      continue;
    }
    if (cuantas < cat.minimo) faltan.push(`${cat.plural}: hay ${cuantas}, mínimo ${cat.minimo}`);
  }
  return faltan;
}

/** Comprueba que la categoría existe en el juego. Para mensajes de error claros. */
export function categoriaExiste(game: GameSession, id: string): boolean {
  return Boolean(categoriaDe(manifiestoDe(game.settings?.juego), id));
}
