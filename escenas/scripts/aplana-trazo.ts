/**
 * APLANA UN TRAZO DE SVG A CONTORNOS DE PUNTOS. Sólo en compilación.
 *
 * ═══ POR QUÉ NO SE USA `SVGLoader`, QUE ESTÁ AHÍ AL LADO ═══
 *
 * Porque `SVGLoader.parse` empieza por `new DOMParser()`, y `DOMParser` es del navegador.
 * No existe en Node —lo que ya impediría comprobarlo— y **tampoco existe en React
 * Native**, que es lo grave: la app pinta con `expo-gl` y allí no hay DOM.
 *
 * Es exactamente la trampa por la que este árbol tiene prohibido `drei`: una biblioteca
 * que asume DOM funciona en el escritorio, se comprueba en el escritorio, y sale negra en
 * el móvil sin un error en ninguna consola. La primera versión de esto llamaba a
 * `SVGLoader` y habría llegado hasta la app antes de romperse.
 *
 * ═══ ASÍ QUE SE ANALIZA AL COMPILAR Y SE ENVÍA EL RESULTADO ═══
 *
 * Es el mismo principio que el `.glb`: lo que se puede resolver una vez en la máquina de
 * quien compila no se resuelve mil veces en la de quien juega. Aquí se recorre la
 * gramática de `d`, se muestrean las curvas a segmentos rectos y lo que viaja son listas
 * de puntos. En tiempo de ejecución no queda gramática que analizar: se enhebran los
 * puntos y ya.
 *
 * ═══ Y SE QUEJA DE LO QUE NO ENTIENDE, EN VEZ DE SALTÁRSELO ═══
 *
 * Esto entiende los comandos que usan los cinco iconos de hoy y unos cuantos más, pero no
 * la gramática entera. Un analizador parcial que ignora en silencio lo que no conoce se
 * come una curva y deja un icono con una muesca que parece una decisión de arte.
 *
 * Éste se para y dice qué comando era. El día que el arte nuevo traiga una `Q`, lo dirá
 * el compilador en vez de descubrirse mirando la carta.
 */

/** Un punto del plano del SVG: `y` crece hacia abajo. Se le da la vuelta más adelante. */
export interface Punto2 {
  x: number;
  y: number;
}

/**
 * EN CUÁNTOS TROZOS SE PARTE UNA CURVA.
 *
 * Dieciséis. Sobre un lienzo de 512 y dibujado luego a unos cien píxeles, un trozo mide
 * menos de un píxel en la peor curva de los cinco iconos: la diferencia con la curva de
 * verdad no se puede ver. Con ocho se ven facetas en el lomo de la oveja.
 *
 * El coste es lineal y ridículo: los cinco iconos juntos salen por unos pocos miles de
 * puntos, que es menos que una tesela del suelo.
 */
const TROZOS_POR_CURVA = 16;

/** Lee los números de un trazo, aceptando comas, espacios y signos pegados. */
function* numeros(texto: string): Generator<number> {
  const re = /-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) yield Number(m[0]);
}

function cubica(a: Punto2, c1: Punto2, c2: Punto2, b: Punto2, salida: Punto2[]): void {
  for (let i = 1; i <= TROZOS_POR_CURVA; i++) {
    const t = i / TROZOS_POR_CURVA;
    const u = 1 - t;
    salida.push({
      x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
      y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
    });
  }
}

function cuadratica(a: Punto2, c: Punto2, b: Punto2, salida: Punto2[]): void {
  for (let i = 1; i <= TROZOS_POR_CURVA; i++) {
    const t = i / TROZOS_POR_CURVA;
    const u = 1 - t;
    salida.push({
      x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    });
  }
}

/**
 * EL ARCO ELÍPTICO, muestreado en vez de convertido a curvas de Bézier.
 *
 * Convertir un arco a Béziers es la receta habitual y aquí sobra: como todo acaba en
 * segmentos rectos, se muestrea la elipse directamente por su ángulo. Menos código y sin
 * el error de aproximación de la conversión.
 *
 * La cuenta del centro es la del anexo F.6.5 de la especificación de SVG, que es donde
 * está escrita bien.
 */
function arco(
  a: Punto2,
  rx0: number,
  ry0: number,
  giroGrados: number,
  arcoGrande: boolean,
  barrido: boolean,
  b: Punto2,
  salida: Punto2[],
): void {
  if (a.x === b.x && a.y === b.y) return;
  let rx = Math.abs(rx0);
  let ry = Math.abs(ry0);
  if (rx === 0 || ry === 0) {
    salida.push({ x: b.x, y: b.y });
    return;
  }
  const fi = (giroGrados * Math.PI) / 180;
  const cos = Math.cos(fi);
  const sen = Math.sin(fi);

  const dx = (a.x - b.x) / 2;
  const dy = (a.y - b.y) / 2;
  const x1 = cos * dx + sen * dy;
  const y1 = -sen * dx + cos * dy;

  /* Si los radios no dan para llegar, se agrandan lo justo. Lo manda la especificación. */
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    const k = Math.sqrt(lambda);
    rx *= k;
    ry *= k;
  }

  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const raiz = Math.sqrt(Math.max(0, num / den)) * (arcoGrande === barrido ? -1 : 1);
  const cx1 = (raiz * rx * y1) / ry;
  const cy1 = (-raiz * ry * x1) / rx;

  const cx = cos * cx1 - sen * cy1 + (a.x + b.x) / 2;
  const cy = sen * cx1 + cos * cy1 + (a.y + b.y) / 2;

  const angulo = (ux: number, uy: number, vx: number, vy: number): number => {
    const s = Math.sign(ux * vy - uy * vx) || 1;
    const c = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
    return s * Math.acos(Math.min(1, Math.max(-1, c)));
  };
  const desde = angulo(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let barre = angulo((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!barrido && barre > 0) barre -= 2 * Math.PI;
  if (barrido && barre < 0) barre += 2 * Math.PI;

  const trozos = Math.max(2, Math.ceil((Math.abs(barre) / (Math.PI / 2)) * TROZOS_POR_CURVA));
  for (let i = 1; i <= trozos; i++) {
    const t = desde + (barre * i) / trozos;
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    salida.push({ x: cos * ex - sen * ey + cx, y: sen * ex + cos * ey + cy });
  }
}

/**
 * APLANA UN TRAZO A SUS CONTORNOS.
 *
 * Cada `M` abre un contorno. Los cierra `z` o el final del trazo. Un icono como el de la
 * oveja tiene varios: la silueta y los huecos de dentro.
 *
 * `donde` es sólo para el mensaje de error: sirve para decir «el icono del grano» en vez
 * de «un trazo».
 */
export function aplanaTrazo(d: string, donde: string): Punto2[][] {
  const contornos: Punto2[][] = [];
  let actual: Punto2[] = [];
  let pluma: Punto2 = { x: 0, y: 0 };
  let arranque: Punto2 = { x: 0, y: 0 };
  /* El último control de una cúbica, para que `s` y `S` sepan reflejarlo. */
  let ultimoControl: Punto2 | null = null;

  const cierra = (): void => {
    if (actual.length > 1) contornos.push(actual);
    actual = [];
  };

  const trozos = [...d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)];
  for (const [, mandato = '', resto = ''] of trozos) {
    const n = [...numeros(resto)];
    const rel = mandato === mandato.toLowerCase();
    const may = mandato.toUpperCase();

    switch (may) {
      case 'M': {
        for (let i = 0; i + 1 < n.length; i += 2) {
          const x = (n[i] as number) + (rel ? pluma.x : 0);
          const y = (n[i + 1] as number) + (rel ? pluma.y : 0);
          if (i === 0) {
            cierra();
            arranque = { x, y };
            actual = [{ x, y }];
          } else {
            actual.push({ x, y });
          }
          pluma = { x, y };
        }
        ultimoControl = null;
        break;
      }
      case 'L': {
        for (let i = 0; i + 1 < n.length; i += 2) {
          pluma = {
            x: (n[i] as number) + (rel ? pluma.x : 0),
            y: (n[i + 1] as number) + (rel ? pluma.y : 0),
          };
          actual.push(pluma);
        }
        ultimoControl = null;
        break;
      }
      case 'H': {
        for (const v of n) {
          pluma = { x: v + (rel ? pluma.x : 0), y: pluma.y };
          actual.push(pluma);
        }
        ultimoControl = null;
        break;
      }
      case 'V': {
        for (const v of n) {
          pluma = { x: pluma.x, y: v + (rel ? pluma.y : 0) };
          actual.push(pluma);
        }
        ultimoControl = null;
        break;
      }
      case 'C': {
        for (let i = 0; i + 5 < n.length; i += 6) {
          const bx = rel ? pluma.x : 0;
          const by = rel ? pluma.y : 0;
          const c1 = { x: (n[i] as number) + bx, y: (n[i + 1] as number) + by };
          const c2 = { x: (n[i + 2] as number) + bx, y: (n[i + 3] as number) + by };
          const fin = { x: (n[i + 4] as number) + bx, y: (n[i + 5] as number) + by };
          cubica(pluma, c1, c2, fin, actual);
          ultimoControl = c2;
          pluma = fin;
        }
        break;
      }
      case 'S': {
        for (let i = 0; i + 3 < n.length; i += 4) {
          const bx = rel ? pluma.x : 0;
          const by = rel ? pluma.y : 0;
          /* El primer control es el reflejo del último, que es lo que significa «suave». */
          const c1 =
            ultimoControl === null
              ? { x: pluma.x, y: pluma.y }
              : { x: 2 * pluma.x - ultimoControl.x, y: 2 * pluma.y - ultimoControl.y };
          const c2 = { x: (n[i] as number) + bx, y: (n[i + 1] as number) + by };
          const fin = { x: (n[i + 2] as number) + bx, y: (n[i + 3] as number) + by };
          cubica(pluma, c1, c2, fin, actual);
          ultimoControl = c2;
          pluma = fin;
        }
        break;
      }
      case 'Q': {
        for (let i = 0; i + 3 < n.length; i += 4) {
          const bx = rel ? pluma.x : 0;
          const by = rel ? pluma.y : 0;
          const c = { x: (n[i] as number) + bx, y: (n[i + 1] as number) + by };
          const fin = { x: (n[i + 2] as number) + bx, y: (n[i + 3] as number) + by };
          cuadratica(pluma, c, fin, actual);
          ultimoControl = c;
          pluma = fin;
        }
        break;
      }
      case 'A': {
        for (let i = 0; i + 6 < n.length; i += 7) {
          const bx = rel ? pluma.x : 0;
          const by = rel ? pluma.y : 0;
          const fin = { x: (n[i + 5] as number) + bx, y: (n[i + 6] as number) + by };
          arco(
            pluma,
            n[i] as number,
            n[i + 1] as number,
            n[i + 2] as number,
            (n[i + 3] as number) !== 0,
            (n[i + 4] as number) !== 0,
            fin,
            actual,
          );
          pluma = fin;
        }
        ultimoControl = null;
        break;
      }
      case 'Z': {
        if (actual.length > 1) actual.push({ x: arranque.x, y: arranque.y });
        cierra();
        pluma = { x: arranque.x, y: arranque.y };
        ultimoControl = null;
        break;
      }
      default: {
        throw new Error(
          `En ${donde} hay un comando «${mandato}» que este aplanador no entiende.\n` +
            'No se salta en silencio a propósito: saltárselo dejaría el icono con una\n' +
            'muesca que parece una decisión de arte. Añádelo a `aplana-trazo.ts`.',
        );
      }
    }
  }
  cierra();
  return contornos;
}

/**
 * QUITA LOS PUNTOS QUE NO SE DISTINGUEN. Douglas-Peucker.
 *
 * ═══ POR QUÉ HACE FALTA, SI YA SE MUESTREA BIEN ═══
 *
 * Porque muestrear una curva en dieciséis trozos reparte los puntos por igual a lo largo
 * del parámetro, y una curva de SVG no se dobla por igual: casi toda su longitud son
 * tramos casi rectos con la curvatura concentrada en las esquinas. Aplanar sin más daba
 * ochenta y dos kilobytes de módulo, y la mayor parte eran puntos alineados unos con
 * otros.
 *
 * Así que se muestrea denso —para no perder ninguna esquina— y luego se tira lo que
 * sobra. Es al revés que ajustar el muestreo a ojo, y sale mejor: donde la curva se
 * dobla se quedan todos, y donde va recta se queda uno.
 *
 * ═══ LA TOLERANCIA ═══
 *
 * Media unidad sobre un lienzo de 512, o sea una milésima del icono. Dibujado a cien
 * píxeles, el error máximo es la décima parte de un píxel: no hay pantalla que lo enseñe.
 */
const TOLERANCIA = 0.5;

function distanciaARecta(q: Punto2, a: Punto2, b: Punto2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo = Math.hypot(dx, dy);
  if (largo < 1e-9) return Math.hypot(q.x - a.x, q.y - a.y);
  return Math.abs(dy * q.x - dx * q.y + b.x * a.y - b.y * a.x) / largo;
}

function simplificaTramo(puntos: Punto2[], desde: number, hasta: number, dejar: boolean[]): void {
  if (hasta <= desde + 1) return;
  let peor = 0;
  let cual = -1;
  const a = puntos[desde] as Punto2;
  const b = puntos[hasta] as Punto2;
  for (let i = desde + 1; i < hasta; i++) {
    const d = distanciaARecta(puntos[i] as Punto2, a, b);
    if (d > peor) {
      peor = d;
      cual = i;
    }
  }
  if (peor <= TOLERANCIA || cual < 0) return;
  dejar[cual] = true;
  simplificaTramo(puntos, desde, cual, dejar);
  simplificaTramo(puntos, cual, hasta, dejar);
}

/**
 * Simplifica un contorno cerrado conservando sus extremos.
 *
 * Se parte en dos por el punto más lejano del primero antes de simplificar, porque
 * Douglas-Peucker necesita dos extremos fijos y en un contorno cerrado el primero y el
 * último son el mismo punto: sin partirlo, la recta de referencia tendría longitud cero
 * y se conservaría todo.
 */
export function simplificaContorno(puntos: Punto2[]): Punto2[] {
  if (puntos.length < 4) return puntos;
  const dejar = new Array<boolean>(puntos.length).fill(false);
  dejar[0] = true;
  dejar[puntos.length - 1] = true;

  const a = puntos[0] as Punto2;
  let lejano = 1;
  let peor = -1;
  for (let i = 1; i < puntos.length - 1; i++) {
    const q = puntos[i] as Punto2;
    const d = Math.hypot(q.x - a.x, q.y - a.y);
    if (d > peor) {
      peor = d;
      lejano = i;
    }
  }
  dejar[lejano] = true;
  simplificaTramo(puntos, 0, lejano, dejar);
  simplificaTramo(puntos, lejano, puntos.length - 1, dejar);

  return puntos.filter((_, i) => dejar[i] === true);
}
