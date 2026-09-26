/**
 * EL HALLAZGO DE VERDAD: lo que hace el canal de Boots on Board cuando alguien recoge un brote a pie
 * —ver `recoger` en `canal.ts`—. Es el gemelo de `botin.ts`, y por las mismas razones:
 *
 *   · el MOVIMIENTO lo construye el juego (`movimientoDelHallazgo` de
 *     `shared/arcade/juegos/hallazgo.ts`: sólo quién lo recoge y qué clase es; cuánto vale lo decide
 *     cada reductor);
 *   · lo METE la mesa por su vía interna (`meterDeLaPlataforma` de `arcade/mesas.ts`), en nombre de
 *     nadie, y lo guarda en el diario como cualquier movimiento si entra;
 *   · y se AVISA a los que sondean la mesa cuando su revisión sube.
 *
 * La mesa se carga con un `import()` y no arriba por lo mismo que en `botin.ts`: los comprobadores en
 * proceso cargan el canal antes de poner su carpeta de mesas. Y es el respaldo, no la costura:
 * `LaMesa.hallazgo` se inyecta, y las pruebas lo hacen.
 */
import { movimientoDelHallazgo } from '../../../shared/arcade/juegos/hallazgo';
import { elCanal } from '../canal';
import type { LoQueFueDelBotin } from './canal';

/** Mete el hallazgo de clase `clase` para `para` en la mesa de verdad, y avisa si ha cambiado. */
export async function meterElHallazgoDeVerdad(codigo: string, para: string, clase: string): Promise<LoQueFueDelBotin> {
  const { meterDeLaPlataforma } = await import('../arcade/mesas');
  const fue = await meterDeLaPlataforma(codigo, movimientoDelHallazgo(para, clase));
  if (fue.salida !== 'sinMesa' && fue.subio) {
    /* Envuelto, como el botín: un aviso que falla no deshace un hallazgo que ya entró. */
    try {
      elCanal().avisarCambio(codigo);
    } catch (error) {
      console.error(`[botas] el hallazgo de la mesa ${codigo} entró y no se ha podido avisar a quien la mira:`, error);
    }
  }
  return fue.salida === 'rechazado' ? { salida: fue.salida, motivo: fue.motivo } : { salida: fue.salida };
}
