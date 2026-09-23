/**
 * EL BOTÍN DE VERDAD: lo que hace el canal de Boots on Board cuando alguien cae y la sala decide que
 * hay botín —ver `pedirElBotin` en `canal.ts`—.
 *
 * Tres cosas, y ninguna es de aquí: el MOVIMIENTO lo construye el juego (`movimientoDelBotin` de
 * `shared/arcade/juegos/botin.ts`: sólo quién lo pierde y quién se lo lleva; cuánto y qué lo decide
 * cada reductor); lo METE la mesa por su vía interna (`meterDeLaPlataforma` de `arcade/mesas.ts`,
 * sin ruta HTTP, en nombre de nadie y por la puerta de la plataforma del árbitro), que lo guarda como
 * cualquier movimiento si entra; y se AVISA a los que sondean la mesa (`avisarCambio` del canal de
 * sondeo) cuando su revisión sube, como hace la ruta después de `mover`. Avisar es transporte, y la
 * mesa no importa el canal a propósito: por eso va aquí y no allí.
 *
 * ═══ POR QUÉ LA MESA SE CARGA CON UN `import()` Y NO ARRIBA ═══
 *
 * Porque esto lo carga `canal.ts`, que no puede cargar la mesa de verdad al cargarse: `mesas.ts` lee
 * su carpeta —`MESAS_DIR`— en cuanto se carga, y los comprobadores en proceso (`verify:sala-de-botas`,
 * `medir:botas`) cargan el canal ANTES de poner la suya; con la mesa cargada arriba, sus mesas de
 * prueba acabarían en la carpeta de datos del portátil. En el servidor la mesa ya está cargada
 * —`index.ts` la importa—, así que el `import()` devuelve el mismo módulo y no carga nada.
 *
 * Y es el respaldo del canal y no su costura: `LaMesa.botin` se inyecta, y las pruebas lo hacen. La
 * mesa de verdad de `index.ts` no lo trae porque se escribió antes de la refriega; el día que lo
 * traiga, esto se usa desde allí y el respaldo sobra.
 */
import { movimientoDelBotin } from '../../../shared/arcade/juegos/botin';
import { elCanal } from '../canal';
import type { LoQueFueDelBotin } from './canal';

/** Mete el botín de `pierde` para `gana` en la mesa de verdad, y avisa si ha cambiado. */
export async function meterElBotinDeVerdad(codigo: string, pierde: string, gana: string): Promise<LoQueFueDelBotin> {
  const { meterDeLaPlataforma } = await import('../arcade/mesas');
  const fue = await meterDeLaPlataforma(codigo, movimientoDelBotin(pierde, gana));
  if (fue.salida !== 'sinMesa' && fue.subio) {
    /*
     * Envuelto: un aviso que falla no deshace un botín que ya entró y ya se guardó. Los que sondean
     * lo verán en su siguiente vuelta, como mucho veinticinco segundos después.
     */
    try {
      elCanal().avisarCambio(codigo);
    } catch (error) {
      console.error(`[botas] el botín de la mesa ${codigo} entró y no se ha podido avisar a quien la mira:`, error);
    }
  }
  return fue.salida === 'rechazado' ? { salida: fue.salida, motivo: fue.motivo } : { salida: fue.salida };
}
