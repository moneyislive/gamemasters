/**
 * ¿ES FIJO EL PASO FIJO? — LA ARITMÉTICA QUE DECIDE CUÁNTOS TICS TIENE UNA PARTIDA
 *
 *   npm run verify:bucle
 *
 * ═══ POR QUÉ ESTE COMPROBADOR NO EXISTÍA, Y POR QUÉ ESO ERA UN AGUJERO ═══
 *
 * La §9 del diseño del motor de arcade pone el paso fijo por delante de todo lo
 * demás de la fase 3: «`bucle.ts` con `useFrameCallback` y paso fijo integrando
 * por `timeSincePreviousFrame` —sin eso el juego corre al doble de velocidad en un
 * móvil de 120 Hz—». Y esa cuenta decide EL NÚMERO DE TICS DE UNA PARTIDA, que es
 * justo el número que después se sube, se contrasta con el reloj de pared y se
 * usa para expandir la repetición.
 *
 * Estaba afirmado solo en prosa. `bucle.ts` no aparecía en ningún comprobador ni
 * de `server/scripts/` ni de `app/src/comprobadores/`, porque la cuenta vivía
 * dentro de un hook con Reanimated delante y para llamarla hacía falta un aparato.
 * Lo señaló un revisor que tuvo que reimplementar el acumulador fuera del
 * repositorio para saber si salía bien.
 *
 * Se arregló moviendo la cuenta —y solo la cuenta— a `app/src/arcade/paso-fijo.ts`,
 * que no importa nada. Esto la llama con `tsx`, igual que `verify:canvaskit` llama
 * a `canvaskit.ts`, y ve los casos que importan sin emulador y en un milisegundo.
 *
 * ═══ QUÉ AFIRMA, EN CUATRO BLOQUES ═══
 *
 *  1. QUE EL REFRESCO NO CAMBIA LA PARTIDA. El mismo tiempo de reloj da los mismos
 *     pasos a 30, 60 y 120 Hz. Es la afirmación entera del fichero.
 *  2. QUE UN FOTOGRAMA ENORME NO SE CONVIERTE EN UNA AVALANCHA, y que la deuda SE
 *     PIERDE en vez de arrastrarse. Volver del segundo plano no mata al jugador.
 *  3. QUE EL TOPE TAMBIÉN VALE CUANDO EL QUE SE ATASCA ES EL HILO DE JAVASCRIPT,
 *     que es el caso que de verdad ocurre en un móvil barato y el que estuvo sin
 *     cubrir: el recorte del worklet no ve la cola de `runOnJS`.
 *  4. Y LAS VACUNAS: que las dos cuentas se ven fallar cuando se les quita el tope,
 *     porque una comprobación que solo se ejecuta con los datos buenos nunca se ha
 *     visto fallar.
 */
import {
  pasosDelFotograma,
  pasosQueCaben,
} from '../../app/src/arcade/paso-fijo';

/** Lo mismo que declara `bucle.ts`. Escrito aquí porque allí es privado. */
const MS_MAXIMOS_ACUMULADOS = 250;
/** Sesenta hercios, que es lo que declara el manifiesto de El Arcade. */
const MS_POR_PASO = 1000 / 60;
/**
 * Cuántos pasos caben en el tope, y por qué se REDONDEA en vez de truncar.
 *
 * 250 / (1000/60) es quince clavado en aritmética exacta y 14,999… en coma
 * flotante, así que un `Math.floor` diría catorce mientras que gastar el crédito
 * de uno en uno da quince. Las dos cuentas son correctas y la diferencia es un
 * paso; escribir el tope con `floor` haría que este comprobador se pusiera rojo
 * por un bit de redondeo, que es la forma más rápida de que alguien lo desactive.
 */
const PASOS_EN_EL_TOPE = Math.round(MS_MAXIMOS_ACUMULADOS / MS_POR_PASO);

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola = detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 400)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

/**
 * Cuántos pasos salen de una pantalla que refresca cada `msPorFotograma`, durante
 * `msDeReloj` de reloj de pared. Es el bucle del worklet y nada más.
 */
function pasosEn(msDeReloj: number, msPorFotograma: number, topeMs = MS_MAXIMOS_ACUMULADOS): number {
  let sobrante = 0;
  let pasos = 0;
  let transcurrido = 0;
  while (transcurrido + msPorFotograma <= msDeReloj + 1e-9) {
    const r = pasosDelFotograma(sobrante, msPorFotograma, MS_POR_PASO, topeMs);
    sobrante = r.sobrante;
    pasos += r.pasos;
    transcurrido += msPorFotograma;
  }
  return pasos;
}

console.log('\nEl paso fijo: que la partida no dependa de la pantalla\n');

// ---------------------------------------------------------------------------
// 1 · LA INDEPENDENCIA DEL REFRESCO, QUE ES LA AFIRMACIÓN DEL FICHERO
// ---------------------------------------------------------------------------

paso('Un segundo de reloj da sesenta pasos, refresque la pantalla como refresque');

/*
 * Las tres frecuencias reales de un móvil, más los dos valores «sucios» que un
 * aparato de verdad reporta —16,6 y 8,3 milisegundos, redondeados por el sistema—
 * porque la cuenta tiene que aguantarlos igual que a los exactos.
 */
const REFRESCOS: ReadonlyArray<{ nombre: string; ms: number }> = [
  { nombre: '30 Hz exactos', ms: 1000 / 30 },
  { nombre: '60 Hz exactos', ms: 1000 / 60 },
  { nombre: '120 Hz exactos', ms: 1000 / 120 },
  { nombre: '~60 Hz redondeado', ms: 16.6 },
  { nombre: '~120 Hz redondeado', ms: 8.3 },
];

for (const r of REFRESCOS) {
  const pasos = pasosEn(1000, r.ms);
  console.log(`  ${r.nombre.padEnd(20)} ${String(pasos).padStart(3)} pasos en un segundo`);
  /*
   * Se admite un paso de diferencia y ni uno más. La holgura no es laxitud: con
   * fotogramas de 33,33 ms el último paso del segundo cae justo en el borde y
   * exigir el número exacto sería exigir que la aritmética de coma flotante
   * redondeara a nuestro favor. Lo que este comprobador tiene que cazar es un
   * juego que corre al DOBLE —o a la mitad—, y eso son treinta pasos de
   * diferencia, no uno.
   */
  comprobar(
    `a ${r.nombre} salen sesenta pasos por segundo y no el doble ni la mitad`,
    pasos >= 59 && pasos <= 60,
    { refresco: r.nombre, pasos },
  );
}

{
  const a = pasosEn(1660, 16.6);
  const b = pasosEn(1660, 8.3);
  comprobar(
    'y 1660 ms dan EXACTAMENTE los mismos pasos con fotogramas de 16,6 y de 8,3 ms',
    a === b,
    { 'a 16,6 ms': a, 'a 8,3 ms': b },
  );
  console.log(`  1660 ms de reloj: ${a} pasos a 16,6 ms y ${b} a 8,3 ms`);
}

// ---------------------------------------------------------------------------
// 2 · EL TOPE DEL HILO DE INTERFAZ, Y LA DEUDA QUE SE PIERDE
// ---------------------------------------------------------------------------

paso('Un fotograma enorme se recorta, y lo que se recorta NO se arrastra');

{
  const largo = pasosDelFotograma(0, 500, MS_POR_PASO, MS_MAXIMOS_ACUMULADOS);
  const sinTope = Math.floor(500 / MS_POR_PASO);
  console.log(`  un fotograma de 500 ms: ${largo.pasos} pasos (sin tope serían ${sinTope})`);
  comprobar(
    'medio segundo de fotograma no mete treinta pasos de golpe',
    largo.pasos <= PASOS_EN_EL_TOPE,
    largo.pasos,
  );
  comprobar(
    'y el sobrante que queda es menos de un paso: la deuda SE PIERDE, no se acumula',
    largo.sobrante >= 0 && largo.sobrante < MS_POR_PASO,
    largo.sobrante,
  );

  /*
   * Y la consecuencia, que es lo que de verdad hay que comprobar: el fotograma
   * siguiente después del tirón es un fotograma normal, no una avalancha de
   * recuperación. Volver del segundo plano NO mata al jugador con la pantalla
   * apagada, que es lo que promete la cabecera de `bucle.ts`.
   */
  const despues = pasosDelFotograma(largo.sobrante, 1000 / 60, MS_POR_PASO, MS_MAXIMOS_ACUMULADOS);
  comprobar(
    'el fotograma siguiente al tirón vuelve a dar un paso, sin recuperar lo perdido',
    despues.pasos <= 2,
    despues.pasos,
  );

  const unMinuto = pasosDelFotograma(0, 60000, MS_POR_PASO, MS_MAXIMOS_ACUMULADOS);
  comprobar(
    'y un minuto entero al fondo tampoco: quince pasos como mucho, no tres mil seiscientos',
    unMinuto.pasos <= 15,
    unMinuto.pasos,
  );
}

paso('Y los casos raros no dejan el bucle muerto ni lo vuelven loco');
{
  comprobar(
    'con `tickHz: 0` no hay reloj y no sale ni un paso',
    pasosDelFotograma(0, 16.6, 0, MS_MAXIMOS_ACUMULADOS).pasos === 0,
  );
  const conNaN = pasosDelFotograma(0, Number.NaN, MS_POR_PASO, MS_MAXIMOS_ACUMULADOS);
  comprobar(
    'un fotograma con `NaN` no envenena el sobrante, que es lo que dejaría el bucle muerto para siempre',
    conNaN.pasos === 0 && conNaN.sobrante === 0,
    conNaN,
  );
  comprobar(
    'y un fotograma de cero milisegundos no da pasos pero conserva el sobrante',
    pasosDelFotograma(10, 0, MS_POR_PASO, MS_MAXIMOS_ACUMULADOS).sobrante === 10,
  );
}

// ---------------------------------------------------------------------------
// 3 · EL TOPE DEL HILO DE JAVASCRIPT, QUE ES EL QUE FALTABA
// ---------------------------------------------------------------------------

paso('Un atasco del hilo de JavaScript no se convierte en un salto de la nave');

/*
 * ═══ EL CASO QUE DE VERDAD OCURRE, Y QUE EL TOPE DEL WORKLET NO VEÍA ═══
 *
 * El hilo de interfaz sigue recibiendo fotogramas y el de JavaScript se atasca un
 * segundo —recolector de basura, un sondeo largo, la navegación—. Cada fotograma
 * calcula UN paso y encola un aviso; el sobrante del worklet nunca crece, así que
 * su tope no recorta nada, y al respirar el hilo de JavaScript se come sesenta
 * avisos seguidos EN EL MISMO INSTANTE de reloj.
 *
 * Sin el tope de este lado eso son sesenta pasos en un fotograma visible: la nave
 * desplazada setecientas veinte milésimas de un campo de mil, o sea casi el campo
 * entero, de un salto que nadie ve.
 */
{
  let credito = 0;
  let ejecutados = 0;
  /* La primera tanda llega con el segundo entero de atasco encima. */
  let desde = 1000;
  for (let i = 0; i < 60; i++) {
    const r = pasosQueCaben(credito, desde, 1, MS_POR_PASO, MS_MAXIMOS_ACUMULADOS);
    credito = r.credito;
    ejecutados += r.pasos;
    /* Y las cincuenta y nueve siguientes, en el mismo milisegundo. */
    desde = 0;
  }
  console.log(`  sesenta avisos encolados de un atasco de un segundo: ${ejecutados} pasos ejecutados`);
  comprobar(
    'sesenta tandas encoladas no dan sesenta pasos de golpe',
    ejecutados <= PASOS_EN_EL_TOPE,
    ejecutados,
  );
  comprobar(
    'pero sí dan los que caben en el tope: no se para el juego, se pierde el tiempo',
    ejecutados >= 10,
    ejecutados,
  );
}

paso('Y a ritmo normal no se pierde ni un paso, que es la otra mitad');
{
  /*
   * Si el tope del lado de JavaScript se pasara de estrecho, el juego iría a
   * cámara lenta y nadie sabría por qué. Sesenta tandas de un paso, una por
   * fotograma, con el tiempo que de verdad pasa entre fotogramas.
   */
  let credito = 0;
  let ejecutados = 0;
  /*
   * La PRIMERA tanda se cuenta como si trajera su propio tiempo, que es lo que
   * hace `avisar` en `bucle.ts`: no hay un «antes» con el que medirla y el worklet
   * ya la acotó. Sin ese caso, el primer aviso de cada partida se tiraría siempre.
   */
  let desde = MS_POR_PASO;
  for (let i = 0; i < 600; i++) {
    const r = pasosQueCaben(credito, desde, 1, MS_POR_PASO, MS_MAXIMOS_ACUMULADOS);
    credito = r.credito;
    ejecutados += r.pasos;
    desde = 1000 / 60;
  }
  console.log(`  600 tandas a ritmo de fotograma: ${ejecutados} pasos ejecutados`);
  comprobar(
    'a ritmo de fotograma se ejecutan TODOS los pasos que pide el reloj',
    ejecutados === 600,
    ejecutados,
  );

  /* Y una pantalla de 30 Hz, que pide dos pasos cada 33 ms, tampoco pierde nada. */
  let credito30 = 0;
  let ejecutados30 = 0;
  let desde30 = 2 * MS_POR_PASO;
  for (let i = 0; i < 300; i++) {
    const r = pasosQueCaben(credito30, desde30, 2, MS_POR_PASO, MS_MAXIMOS_ACUMULADOS);
    credito30 = r.credito;
    ejecutados30 += r.pasos;
    desde30 = 1000 / 30;
  }
  comprobar(
    'y una pantalla de 30 Hz, que pide dos pasos por tanda, tampoco pierde ninguno',
    ejecutados30 === 600,
    ejecutados30,
  );

  /*
   * La vuelta del segundo plano: el worklet manda una tanda ya recortada al tope y
   * aquí tiene que pasar ENTERA. Si este lado la recortara otra vez, el tope se
   * aplicaría dos veces y volver del fondo costaría pasos que sí tocaban.
   */
  const delFondo = pasosQueCaben(0, 60000, 15, MS_POR_PASO, MS_MAXIMOS_ACUMULADOS);
  comprobar(
    'la tanda que llega al volver del fondo pasa entera: el tope no se aplica dos veces',
    delFondo.pasos >= PASOS_EN_EL_TOPE - 1,
    delFondo,
  );
}

// ---------------------------------------------------------------------------
// 4 · LAS VACUNAS
// ---------------------------------------------------------------------------

paso('Las vacunas: sin tope, las dos cuentas se ven fallar');

/*
 * Una comprobación que solo se ejecuta con los datos buenos nunca se ha visto
 * fallar, y este repositorio tiene tres casos anotados de exactamente eso. Aquí se
 * le quita el tope a las dos cuentas —poniéndolo altísimo— y se comprueba que
 * entonces SÍ pasa lo que arriba se afirma que no pasa.
 */
{
  const sinTope = pasosDelFotograma(0, 60000, MS_POR_PASO, Number.MAX_SAFE_INTEGER);
  comprobar(
    'sin el tope del worklet, un minuto al fondo SÍ daría miles de pasos de golpe',
    sinTope.pasos > 3000,
    sinTope.pasos,
  );

  let credito = 0;
  let ejecutados = 0;
  let desde = 1000;
  for (let i = 0; i < 60; i++) {
    const r = pasosQueCaben(credito, desde, 1, MS_POR_PASO, Number.MAX_SAFE_INTEGER);
    credito = r.credito;
    ejecutados += r.pasos;
    desde = 0;
  }
  comprobar(
    'y sin el tope del hilo de JavaScript, las sesenta tandas encoladas SÍ darían sesenta pasos',
    ejecutados === 60,
    ejecutados,
  );
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length === 0) {
  console.log(
    `✔ ${hechas} comprobaciones. La misma cantidad de reloj da la misma cantidad de pasos a 30,\n` +
      '  60 y 120 Hz; un fotograma enorme se recorta y la deuda se pierde; y un atasco del hilo de\n' +
      '  JavaScript ya no se convierte en un salto de la nave que nadie ve.',
  );
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
console.log(
  '\nEsta cuenta decide CUÁNTOS TICS TIENE UNA PARTIDA, y ese número se sube, se contrasta con el\n' +
    'reloj de pared y se usa para expandir la repetición. Si sale mal, el juego corre a otra\n' +
    'velocidad en cada pantalla y el récord de quien jugó limpio se rechaza.',
);
process.exit(1);
