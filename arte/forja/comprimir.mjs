// COMPRIMIR: el último paso del empaquetado. Lee los GLB que `empaquetar.py` deja en
// arte/forja/obra/empaquetado/ y escribe en escritorio/src/quiebro/recursos/ los que baja el juego.
//
//   node arte/forja/comprimir.mjs        (empaquetar.py lo llama solo)
//
// ═══ POR QUÉ MESHOPT, Y EL PRECIO ═══
//
// El reparto entero (18 figuras en tres niveles de detalle y 36 clips por esqueleto) pesaba 11,5 MB
// cuantizado a mano, y el tope de la primera noche en N0 es de 8 MB PARA TODO EL JUEGO. Con
// EXT_meshopt_compression la geometría baja a menos de la mitad y cabe con holgura. El precio: el
// cliente TIENE que registrar el descodificador antes de cargar —
//     import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
//     cargador.setMeshoptDecoder(MeshoptDecoder);
// — y sin él la carga falla entera (lo aprendió el avatar de la app: `app/src/escena-avatar.tsx`).
// El descodificador es WebAssembly: vale en el navegador y en el WebView, NO en Hermes (este juego no
// pasa por Hermes: ver docs/quiebro/ARQUITECTURA.md §0.2).
//
// Las posiciones se quedan en float: el frente de personajes funde cada figura en una geometría en el
// espacio de enlace (posición × bindMatrix) y mide con ellas; cuantizarlas con la corrección en las
// matrices de enlace (lo que hace gltf-transform con las mallas con piel) le rompería esas cuentas sin
// un error. Se cuantizan la normal (octaédrico de 8 bits) y el color (12 bits: en 8 bits lineales los
// oscuros de la ropa salen en escalones).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Logger, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { reorder, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ENTRA = path.join(AQUI, 'obra', 'empaquetado');
const SALE = process.env.REPARTO_SALIDA || path.resolve(AQUI, '..', '..', 'escritorio', 'src', 'quiebro', 'recursos');

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

fs.mkdirSync(SALE, { recursive: true });
const avisos = [];
const l0 = console.log;
const w0 = console.warn;
console.log = (...a) => avisos.push(a.join(' '));
console.warn = (...a) => avisos.push(a.join(' '));
let antes = 0;
let despues = 0;
const filas = [];
for (const f of fs.readdirSync(ENTRA).filter((x) => x.endsWith('.glb')).sort()) {
  const bruto = fs.readFileSync(path.join(ENTRA, f));
  const doc = await io.readBinary(bruto);
  doc.setLogger(new Logger(Logger.Verbosity.WARN));
  if (doc.getRoot().listMeshes().length > 0) {
    await doc.transform(
      reorder({ encoder: MeshoptEncoder, target: 'size' }),
      quantize({ pattern: /^(NORMAL|COLOR_0)$/, quantizeNormal: 8, quantizeColor: 12 }),
    );
  }
  doc.createExtension(EXTMeshoptCompression).setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  const listo = await io.writeBinary(doc);
  fs.writeFileSync(path.join(SALE, f), listo);
  antes += bruto.length;
  despues += listo.length;
  filas.push(`  ${f.padEnd(28)} ${String(bruto.length).padStart(9)} -> ${String(listo.length).padStart(9)}`);
}
console.log = l0;
console.warn = w0;
for (const x of filas) console.log(x);
console.log(`  comprimido: ${antes} -> ${despues} bytes (${(despues / Math.max(antes, 1)).toFixed(2)})`);
const raros = avisos.filter((a) => !/prune: Removed|reorder:|No qualifying/.test(a));
if (raros.length) console.log('  avisos de gltf-transform:\n    ' + [...new Set(raros)].slice(0, 8).join('\n    '));
