/**
 * La contabilidad de lo que se le pide al modelo.
 *
 * NO HABÍA NINGUNA. Los siete puntos que llaman a la API recogían el mensaje
 * final y tiraban `usage`, así que del gasto de una velada no quedaba ni rastro:
 * ni para poner precio, ni para detectar un abuso, ni para responderle a quien
 * reclame una factura. Es lo primero que hay que tener antes de cobrar por uso,
 * porque cobrar sin contabilidad es inventarse el recibo.
 *
 * DOS DESTINOS, Y CADA UNO SIRVE PARA UNA COSA:
 *
 *   · UNA LÍNEA POR LLAMADA en el registro del servidor, siempre, tenga o no
 *     partida detrás. Es lo que permite auditar desde el primer día sin montar
 *     nada: se lee con `grep [gasto]` y sale el modelo, el concepto y los
 *     tokens. El chat del taller y el Mayordomo pasan por aquí muchas veces por
 *     velada, y ahí el detalle importa más que el total.
 *
 *   · EL ACUMULADO EN LA PARTIDA, cuando la hay. Es la unidad que se va a
 *     cobrar —la velada— y donde se puede mirar sin herramientas.
 *
 * SE APUNTA DURANTE Y SE VUELCA AL FINAL. Ver `pendientes` más abajo: contar
 * dentro de una operación que todavía va a escribir la partida es contar en una
 * hoja que alguien va a tirar, y así se perdió el primer apunte de la trama.
 *
 * Y NUNCA REVIENTA. Un fallo contando no puede tumbar una generación que ha
 * costado siete minutos y medio euro: si el almacén falla, se anota en el
 * registro y se sigue.
 */
import { getStore } from '../db/store';
import type { GastoDeLaPartida } from '../../../shared/types';

/** Los conceptos que se cobran. Uno por punto de llamada. */
export type ConceptoDeGasto = 'trama' | 'material' | 'refresco' | 'asistente' | 'consejero';

/** Lo que interesa del `usage` de la API, sea cual sea la forma que traiga. */
interface Uso {
  entrada: number;
  salida: number;
  cacheEscrita: number;
  cacheLeida: number;
}

function leerUso(usage: unknown): Uso {
  const u = (usage ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    entrada: num(u.input_tokens),
    salida: num(u.output_tokens),
    cacheEscrita: num(u.cache_creation_input_tokens),
    cacheLeida: num(u.cache_read_input_tokens),
  };
}

function vacio(): GastoDeLaPartida {
  return {
    llamadas: 0,
    entrada: 0,
    salida: 0,
    cacheEscrita: 0,
    cacheLeida: 0,
    porConcepto: {},
    modelos: [],
    actualizadoEl: new Date().toISOString(),
  };
}

/**
 * Lo apuntado y todavía sin volcar, por partida.
 *
 * SE APUNTA EN MEMORIA Y SE VUELCA AL FINAL, y esto no es una optimización: es
 * lo único que funciona. La primera versión releía la partida y la guardaba en
 * cada llamada, y el apunte de la trama desapareció — porque quien genera guarda
 * DESPUÉS su propia copia de la partida, sin el gasto, y la pisa. Contar dentro
 * de una operación que va a escribir después es contar en una hoja que alguien
 * va a tirar.
 *
 * Se pierde lo apuntado si el proceso muere a mitad, y es aceptable: la línea
 * del registro ya salió, que es la que sirve para auditar.
 */
const pendientes = new Map<string, Array<{ concepto: ConceptoDeGasto; model: string; uso: Uso }>>();

/**
 * Apunta lo que ha costado una llamada. No toca el almacén.
 *
 * `gameId` es opcional a propósito: el asistente del taller puede estar montando
 * una partida que todavía no existe, y ese gasto también cuenta — para eso está
 * la línea del registro, que sale siempre.
 */
export function apuntarUso(opciones: {
  concepto: ConceptoDeGasto;
  model: string;
  usage: unknown;
  gameId?: string;
}): void {
  const { concepto, model, gameId } = opciones;
  const uso = leerUso(opciones.usage);

  // Siempre, y en una línea estable para poder sumarla desde fuera con `grep`.
  console.log(
    `[gasto] ${JSON.stringify({
      concepto,
      model,
      gameId: gameId ?? null,
      ...uso,
      el: new Date().toISOString(),
    })}`,
  );

  if (!gameId) return;
  const cola = pendientes.get(gameId) ?? [];
  cola.push({ concepto, model, uso });
  pendientes.set(gameId, cola);
}

/**
 * Suma en la partida todo lo apuntado y lo olvida.
 *
 * Se llama al FINAL de cada operación, cuando ya no queda nada por guardar. Y
 * relee antes de sumar: guardar el objeto que tenía quien llama pisaría lo que
 * se hubiera escrito entretanto.
 */
export async function volcarGasto(gameId: string): Promise<void> {
  const cola = pendientes.get(gameId);
  if (!cola || cola.length === 0) return;
  pendientes.delete(gameId);

  try {
    const store = getStore();
    const game = await store.getGame(gameId);
    if (!game) return;

    let acumulado = game.gasto ?? vacio();
    for (const { concepto, model, uso } of cola) {
      const suConcepto = acumulado.porConcepto[concepto] ?? { llamadas: 0, entrada: 0, salida: 0 };
      acumulado = {
        llamadas: acumulado.llamadas + 1,
        entrada: acumulado.entrada + uso.entrada,
        salida: acumulado.salida + uso.salida,
        cacheEscrita: acumulado.cacheEscrita + uso.cacheEscrita,
        cacheLeida: acumulado.cacheLeida + uso.cacheLeida,
        porConcepto: {
          ...acumulado.porConcepto,
          [concepto]: {
            llamadas: suConcepto.llamadas + 1,
            entrada: suConcepto.entrada + uso.entrada,
            salida: suConcepto.salida + uso.salida,
          },
        },
        modelos: acumulado.modelos.includes(model) ? acumulado.modelos : [...acumulado.modelos, model],
        actualizadoEl: new Date().toISOString(),
      };
    }

    game.gasto = acumulado;
    await store.saveGame(game);
  } catch (error) {
    // Contar no puede tumbar una generación que ya está pagada.
    console.error('[gasto] no se pudo acumular en la partida:', error);
  }
}
