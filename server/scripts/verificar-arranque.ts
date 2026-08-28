/**
 * Nadie pregunta por la sesión antes de haberla leído.
 *
 * EL FALLO QUE VIGILA. La credencial y el pasaporte viven en el disco del móvil
 * y se leen de forma asíncrona al arrancar. Cuatro pantallas preguntaban
 * `hayCuenta()` —o pedían directamente datos de la cuenta— sin esperar a esa
 * lectura, así que en el arranque, y abriendo la app en cualquier pantalla desde
 * un enlace, la respuesta era «no hay cuenta» siendo falso. El panel decía que
 * no te habían sentado en ninguna mesa teniendo mesa, la portada se quedaba sin
 * tus sobres y el perfil decía que no se pudo consultar. Y como pasa en el
 * arranque, no se reintenta solo: hay que salir y volver a entrar.
 *
 * QUÉ COMPRUEBA EXACTAMENTE, Y QUÉ NO. Comprueba, sobre el TEXTO de cada
 * pantalla, que la lectura de la sesión aparece antes que la primera pregunta.
 * Eso basta para cazar la regresión real —alguien añade una pantalla nueva y se
 * le olvida esperar— y para que quitar la espera de cualquiera de las cuatro
 * ponga esto en rojo. Lo que NO puede ver es si la espera está en otra rama del
 * código que no se ejecuta: para eso hay que mirar la app.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const PANTALLAS = path.join(RAIZ, 'app', 'app');

/** Lo que no se puede hacer sin haber leído antes el disco. */
const PREGUNTAS = ['hayCuenta(', 'pedirPortada(', 'pedirPartidas(', 'pedirPerfil('];
const LECTURA = 'cargarSesionGuardada';

function pantallas(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...pantallas(completo));
    else if (entrada.name.endsWith('.tsx')) salida.push(completo);
  }
  return salida;
}

let hechas = 0;
let vigiladas = 0;
const rotas: string[] = [];

for (const fichero of pantallas(PANTALLAS)) {
  const texto = fs.readFileSync(fichero, 'utf8');
  const nombre = path.relative(RAIZ, fichero).split(path.sep).join('/');

  const primeraPregunta = PREGUNTAS.map((p) => texto.indexOf(p))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];
  if (primeraPregunta === undefined) continue;

  vigiladas += 1;
  hechas += 1;
  const lectura = texto.indexOf(LECTURA);
  if (lectura < 0) {
    rotas.push(`${nombre} pregunta por la sesión y no la lee nunca`);
    continue;
  }
  hechas += 1;
  if (lectura > primeraPregunta) {
    rotas.push(`${nombre} pregunta por la sesión ANTES de leerla`);
  }
}

if (vigiladas === 0) {
  console.error('✘ no se ha encontrado ninguna pantalla que pregunte: la comprobación no vigila nada');
  process.exit(1);
}

if (rotas.length > 0) {
  for (const r of rotas) console.error(`✘ ${r}`);
  process.exit(1);
}

console.log(`\n${hechas} comprobaciones sobre ${vigiladas} pantallas`);
console.log('Ninguna pantalla da por hecho que no tienes cuenta antes de haber mirado.');
