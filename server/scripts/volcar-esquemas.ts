/**
 * Vuelca a un JSON todos los esquemas de salida estructurada de CLUEDO, para
 * validarlos contra la API sin generar nada (`max_tokens: 1`: la API compila la
 * gramática y rechaza con 400 la que no cabe, sin cobrar la generación).
 *
 *   npx tsx scripts/volcar-esquemas.ts <fichero.json>
 *
 * Existe porque el esquema del revisor ya se tuvo que partir en dos turnos por
 * «The compiled grammar is too large», y cada campo nuevo del personaje lo
 * engorda en los tres sitios que lo usan.
 */
import fs from 'node:fs';
import { PLOT_SCHEMA, PLOT_EXTENSION_SCHEMA } from '../src/plot/cluedo-esquema';
import { MATERIAL_SCHEMA } from '../src/plot/cluedo-material';
import { REVISION_TRAMA_SCHEMA, REVISION_MATERIAL_SCHEMA, REVISION_SOLO_MATERIAL_SCHEMA } from '../src/plot/cluedo-revisor';
import { DETECTIVE_SCHEMA } from '../src/plot/cluedo-detective';

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
};
fs.writeFileSync(destino, JSON.stringify(esquemas, null, 2), 'utf8');
console.log(`${Object.keys(esquemas).length} esquemas en ${destino}`);
