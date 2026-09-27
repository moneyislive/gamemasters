/**
 * ¿Los esquemas que se le mandan al modelo dicen lo que creemos que dicen?
 *
 *   npm run verify:esquemas -w server
 *
 * ═══ EL FALLO QUE LO TRAJO ═══
 *
 * El 30 de agosto de 2026 se renombró «sala» a «lugar» en todo el repositorio,
 * y en `cluedo-esquema.ts` cambió la PROPIEDAD (`roomId` → `lugarId`) pero no el
 * `required`, que siguió pidiendo `roomId`. La API no se queja de un obligatorio
 * que no está definido: lo ignora. Así que `lugarId` pasó a ser OPCIONAL sin que
 * nadie lo decidiera, y en la solución fue peor: el modelo escribía `lugarId`
 * —el único definido—, la frontera del generador leía `roomId`, la sala del
 * crimen llegaba vacía y `repararRespuestas` ponía la primera sala de la lista.
 * El relato del crimen decía una sala y el sobre sellado, otra.
 *
 * Ninguna comprobación lo vio porque ninguna manda el esquema a la API: todas
 * usan el generador de demostración, que escribe `lugarId` a mano. Es el caso de
 * libro de «la suite cubre el camino que no es».
 *
 * ═══ QUÉ MIRA ═══
 *
 * En cada objeto de cada esquema, a cualquier profundidad:
 *
 *   · que todo lo que nombra `required` esté en `properties`;
 *   · que todo lo que hay en `properties` esté en `required` — las salidas
 *     estructuradas lo piden así, y una propiedad opcional es una que el modelo
 *     puede no escribir;
 *   · que lleve `additionalProperties: false`.
 *
 * Es estático y no gasta nada: no llama a la API.
 */
import { PLOT_EXTENSION_SCHEMA, PLOT_SCHEMA } from '../src/plot/cluedo-esquema';
import { MATERIAL_SCHEMA } from '../src/plot/cluedo-material';
import { MOMIA_TRAMA_SCHEMA } from '../src/plot/momia-esquema';
import { NUDO_TRAMA_SCHEMA } from '../src/plot/nudo-prompt';
import { SOMBRAS_TRAMA_SCHEMA } from '../src/plot/sombras-esquema';

const ESQUEMAS: Record<string, unknown> = {
  'CLUEDO · trama': PLOT_SCHEMA,
  'CLUEDO · ampliación': PLOT_EXTENSION_SCHEMA,
  'CLUEDO · material': MATERIAL_SCHEMA,
  'Momia · trama': MOMIA_TRAMA_SCHEMA,
  'Nudo · trama': NUDO_TRAMA_SCHEMA,
  'Sombras · trama': SOMBRAS_TRAMA_SCHEMA,
};

const fallos: string[] = [];
let objetos = 0;

function recorrer(nodo: unknown, ruta: string, esquema: string): void {
  if (!nodo || typeof nodo !== 'object') return;
  if (Array.isArray(nodo)) {
    nodo.forEach((hijo, i) => recorrer(hijo, `${ruta}[${i}]`, esquema));
    return;
  }
  const n = nodo as Record<string, unknown>;
  const props = n.properties as Record<string, unknown> | undefined;
  if (n.type === 'object' || props) {
    objetos += 1;
    const claves = Object.keys(props ?? {});
    const obligatorias = Array.isArray(n.required) ? (n.required as string[]) : [];
    for (const r of obligatorias) {
      if (!claves.includes(r)) {
        fallos.push(`${esquema} · ${ruta}: «${r}» está en required y no en properties`);
      }
    }
    for (const c of claves) {
      if (!obligatorias.includes(c)) {
        fallos.push(`${esquema} · ${ruta}: «${c}» está en properties y no en required (queda opcional)`);
      }
    }
    if (n.additionalProperties !== false) {
      fallos.push(`${esquema} · ${ruta}: le falta additionalProperties: false`);
    }
  }
  for (const [clave, hijo] of Object.entries(n)) {
    if (clave === 'required' || clave === 'enum') continue;
    recorrer(hijo, clave === 'properties' ? ruta : `${ruta}.${clave}`, esquema);
  }
}

for (const [nombre, esquema] of Object.entries(ESQUEMAS)) recorrer(esquema, '$', nombre);

if (objetos === 0) {
  // Cero objetos mirados son cero fallos, y eso se leería como vigilado.
  console.error('✘ No se ha mirado ningún objeto: los esquemas no se han cargado.');
  process.exit(1);
}

if (fallos.length > 0) {
  console.error(`✘ ${fallos.length} fallos en ${objetos} objetos de ${Object.keys(ESQUEMAS).length} esquemas:`);
  for (const f of fallos) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✔ ${objetos} objetos de ${Object.keys(ESQUEMAS).length} esquemas: cada obligatorio existe y nada queda opcional.`);
