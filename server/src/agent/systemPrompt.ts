/**
 * System prompt del agente de CLUEDO.
 *
 * Construye un prompt extenso en español que define la identidad del agente
 * (mayordomo/maestro de ceremonias años 20), su conocimiento experto de las
 * reglas oficiales de Cluedo, la adaptación a juego EN VIVO en un espacio
 * físico real, la psicología de jugadores y la política de herramientas.
 * Inyecta al final el estado ACTUAL de la partida.
 */

import type { GameSession } from '../../../shared/types';
import { entidadesDe, manifiestoDe } from '../../../shared/juegos';
import { vozDelTaller } from './voces';

/** Formatea una lista de entidades con nombre y descripción opcional. */
export function listarEntidades(
  items: Array<{ name: string; description?: string; email?: string }>,
): string {
  if (items.length === 0) return '  (ninguno todavía)';
  return items
    .map((item) => {
      const partes = [`  - ${item.name}`];
      /*
       * SE DICE QUE HAY CORREO, NO CUÁL ES.
       *
       * El agente necesita saber si ya está puesto —para no volver a pedirlo— y
       * puede escribir uno nuevo al dictado con `upsert_suspect`. Para ninguna
       * de las dos cosas hace falta que la dirección viaje hasta el modelo, y
       * mandarla era enviar el dato personal de un invitado a un tercero a
       * cambio de nada.
       */
      if (item.email) partes.push('(ya tiene correo)');
      if (item.description) partes.push(`— ${item.description}`);
      return partes.join(' ');
    })
    .join('\n');
}

/**
 * Qué se le cuenta al asistente del taller. EL DESPACHADOR.
 *
 * Cada juego registra su voz con `registrarVoz`. Aquí solo se elige, y si nadie
 * la ha registrado se construye una genérica desde el manifiesto.
 *
 * ═══ AQUÍ VIVÍA EL PROMPT DE CLUEDO ═══
 *
 * Ciento cuarenta líneas: Edmund el mayordomo, las reglas oficiales, los seis
 * sospechosos clásicos, los pasadizos, y los mínimos «3 sospechosos, 4 salas, 3
 * armas» escritos a mano. Era el respaldo de cualquier juego que no registrara
 * voz, así que quien añadiera uno y se olvidara recibía un mayordomo británico
 * explicando refutaciones en una expedición egipcia.
 *
 * Se ha ido a `cluedo-mayordomo.ts` y se registra como los demás.
 */
export function buildSystemPrompt(game: GameSession): string {
  const propia = vozDelTaller(game.settings?.juego);
  if (propia) return propia(game);
  return promptGenerico(game);
}

/**
 * El asistente de un juego que todavía no tiene voz propia.
 *
 * ═══ POR QUÉ EXISTE, Y POR QUÉ NO ES UN PARCHE ═══
 *
 * Antes, un juego sin voz recibía a Edmund: un personaje de otro juego hablando
 * de sospechosos y de salas sobre datos que no lo son. Lo obvio sería no dar
 * ninguno, pero entonces quien escribe un juego nuevo se queda sin asistente
 * hasta que escriba doscientas líneas de prompt — y el asistente es la puerta
 * por la que se prepara una partida.
 *
 * Así que se construye desde el manifiesto: sus categorías, sus mínimos, sus
 * herramientas y sus reglas. No tiene personaje, y eso está bien: es
 * evidentemente provisional en vez de parecer el de otro juego.
 */
function promptGenerico(game: GameSession): string {
  const manifiesto = manifiestoDe(game.settings?.juego);
  const cats = manifiesto.categorias;

  const inventario = cats
    .map((c) => {
      const lista = entidadesDe(game, c.id);
      return `## ${capitalizar(c.plural)} (${lista.length})\n${listarEntidades(lista)}`;
    })
    .join('\n\n');

  const faltantes = cats
    .filter((c) => entidadesDe(game, c.id).length < c.minimo)
    .map((c) => `${c.plural} (hay ${entidadesDe(game, c.id).length}, mínimo ${c.minimo})`);

  const herramientas = cats
    .map((c) => `\`upsert_${sufijo(c.singular)}\``)
    .join(', ');

  return `# IDENTIDAD

Eres el asistente de la plataforma GameMasters para preparar partidas de **${manifiesto.nombre}**. Hablas SIEMPRE en español. ${manifiesto.lema}

Este juego todavía no tiene una voz propia escrita, así que hablas con naturalidad y sin personaje: tu trabajo es que quien prepara la velada tenga todo lo que hace falta antes de generar.

# LAS REGLAS DE ESTE JUEGO

${(manifiesto.reglas ?? []).map((r) => `- **${r.titulo}.** ${r.texto}`).join('\n') || '(sin reglas declaradas)'}

# ESTADO ACTUAL DE LA PARTIDA

Nombre: «${game.name}»
Trama: ${game.plot ? 'ya generada' : 'todavía sin generar'}

${inventario}

${faltantes.length > 0 ? `Para poder generar la trama FALTAN: ${faltantes.join(', ')}.` : 'La partida cumple los mínimos: puede generarse la trama cuando quien organiza lo confirme.'}

# POLÍTICA DE HERRAMIENTAS

1. **Registra TODO dato que se dicte, en el momento**, con ${herramientas}. Lo que no se guarda con herramienta, no existe. Para corregir, vuelve a llamar con el \`id\`. Para eliminar, \`remove_*\`. Para renombrar la partida, \`set_game_name\`.
2. **Consulta antes de suponer.** Si dudas del estado, usa \`get_game_state\`.
3. **\`start_generation\` SOLO con confirmación explícita**, y solo si se cumplen los mínimos.
4. **Tras usar herramientas, remata en una frase** y sugiere el siguiente paso.

# REGLA DE ORO

No inventes datos de la partida. Si no lo ha dicho quien organiza y no está en el estado de arriba, no existe.`;
}

function capitalizar(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** El mismo sufijo que usan las herramientas por categoría. */
function sufijo(singular: string): string {
  return singular
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const DONDE_CAMBIA = '# ESTADO ACTUAL DE LA PARTIDA';

/**
 * El prompt partido en dos: lo que se puede cachear y lo que no.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * EL PROBLEMA
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Todo el prompt iba en UN bloque marcado como cacheable. Y la cache marca un
 * PREFIJO: si algo cambia dentro de él, no se aprovecha nada, ni siquiera lo
 * que venía antes del cambio. Como el inventario de la partida está metido en
 * mitad del prompt, bastaba dar de alta un sospechoso para invalidar los tres
 * mil y pico tokens enteros — y dar de alta cosas es LO QUE SE HACE en el
 * taller. La cache acertaba solo en los turnos en los que no se registraba
 * nada, o sea, en los menos.
 *
 * Sale caro por partida doble: el bucle del asistente da hasta doce vueltas por
 * turno y cada una reenvía el prompt entero.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * EL CORTE, Y POR QUÉ AQUÍ Y NO DONDE SERÍA IDEAL
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Lo óptimo sería llevarse el inventario AL FINAL del prompt y cachear todo lo
 * demás: subiría de un 63 % a un 82 % en CLUEDO. No se hace, y a propósito.
 * Mover el bloque cambia el orden en que el modelo lee las cosas, y con eso el
 * comportamiento del mayordomo de un juego que ya está en producción y con su
 * maestro de oro. La mitad de la mejora no vale ese riesgo.
 *
 * Cortando donde empieza el inventario, en cambio, el modelo recibe EXACTAMENTE
 * los mismos caracteres en el mismo orden: la API concatena los bloques. Solo
 * cambia dónde está la marca de la cache. Nada que pueda alterar una respuesta.
 *
 * Lo que se gana, medido: 2156 tokens de 3418 en CLUEDO (63 %), 2033 de 3110 en
 * la Momia (65 %), 2709 de 3754 en las Sombras (72 %). Y con las herramientas,
 * que van delante del sistema y entran en el mismo prefijo.
 *
 * Si el titular no aparece —alguien lo renombró— se devuelve todo en un bloque,
 * que es exactamente lo que había antes: se pierde la mejora, no la corrección.
 */
export function bloquesDeSistema(game: GameSession): { estable: string; volatil: string } {
  const entero = buildSystemPrompt(game);
  const corte = entero.indexOf(DONDE_CAMBIA);
  if (corte <= 0) return { estable: entero, volatil: '' };
  return { estable: entero.slice(0, corte), volatil: entero.slice(corte) };
}
