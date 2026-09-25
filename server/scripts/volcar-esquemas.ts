/**
 * Vuelca a un JSON todos los esquemas de salida estructurada, para validarlos
 * contra la API sin generar nada (`max_tokens: 1`: la API compila la gramática
 * y rechaza con 400 la que no cabe, sin cobrar la generación).
 *
 *   npx tsx scripts/volcar-esquemas.ts <fichero.json>
 *
 * Existe porque el esquema del revisor ya se tuvo que partir en dos turnos por
 * «The compiled grammar is too large», y cada campo nuevo del personaje lo
 * engorda en los tres sitios que lo usan. Los revisores de los otros juegos
 * reutilizan partes del esquema de su trama, así que crecen con ella.
 */
import fs from 'node:fs';
import { PLOT_SCHEMA, PLOT_EXTENSION_SCHEMA } from '../src/plot/cluedo-esquema';
import { MATERIAL_SCHEMA } from '../src/plot/cluedo-material';
import { REVISION_TRAMA_SCHEMA, REVISION_MATERIAL_SCHEMA, REVISION_SOLO_MATERIAL_SCHEMA } from '../src/plot/cluedo-revisor';
import { DETECTIVE_SCHEMA } from '../src/plot/cluedo-detective';
import { NUDO_TRAMA_SCHEMA } from '../src/plot/nudo-prompt';
import { NUDO_REVISION_SCHEMA } from '../src/plot/nudo-revisor';
import { SOMBRAS_REVISION_DOSIERES_SCHEMA, SOMBRAS_REVISION_SCHEMA } from '../src/plot/sombras-revisor';
import { LECTOR_SOMBRAS_SCHEMA } from '../src/plot/sombras-lector';
import { MOMIA_REVISION_DOSIERES_SCHEMA, MOMIA_REVISION_SCHEMA } from '../src/plot/momia-revisor';
import { LECTOR_MOMIA_SCHEMA } from '../src/plot/momia-lector';

const destino = process.argv[2];
if (!destino) {
  console.error('Dime dónde escribirlo: npx tsx scripts/volcar-esquemas.ts <fichero.json>');
  process.exit(2);
}
const esquemas = {
  trama: PLOT_SCHEMA,
  ampliacion: PLOT_EXTENSION_SCHEMA,
  material: MATERIAL_SCHEMA,
  revisionTrama: REVISION_TRAMA_SCHEMA,
  revisionMaterial: REVISION_MATERIAL_SCHEMA,
  revisionSoloMaterial: REVISION_SOLO_MATERIAL_SCHEMA,
  detective: DETECTIVE_SCHEMA,
  nudoTrama: NUDO_TRAMA_SCHEMA,
  nudoRevision: NUDO_REVISION_SCHEMA,
  sombrasRevision: SOMBRAS_REVISION_SCHEMA,
  sombrasRevisionDosieres: SOMBRAS_REVISION_DOSIERES_SCHEMA,
  sombrasColumnaCiega: LECTOR_SOMBRAS_SCHEMA,
  momiaRevision: MOMIA_REVISION_SCHEMA,
  momiaRevisionDosieres: MOMIA_REVISION_DOSIERES_SCHEMA,
  momiaExpedicionCiega: LECTOR_MOMIA_SCHEMA,
};
fs.writeFileSync(destino, JSON.stringify(esquemas, null, 2), 'utf8');
console.log(`${Object.keys(esquemas).length} esquemas en ${destino}`);
