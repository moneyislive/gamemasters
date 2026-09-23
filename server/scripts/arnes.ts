/**
 * EL ARNÉS DE LOS COMPROBADORES: `comprobar`, el informe, el suelo y los códigos de salida.
 *
 * ═══ POR QUÉ EXISTE ═══
 *
 * Setenta y tantos guiones de `server/scripts/` llevan su propia `function comprobar(`, su propia
 * lista de fallos, su propia forma de imprimirla y —los que lo tienen— su propio suelo de
 * comprobaciones. Se parecen mucho y no son iguales: unos cuentan el suelo como una comprobación
 * más y salen con 1 si se salta un bloque; otros (`verificar-burgo.ts`, `verificar-mesa.ts`)
 * imprimen primero las rojas y salen con 2. Un comprobador que se cae a la mitad sin decirlo se
 * lee, en los primeros, exactamente igual que uno que encontró un fallo del producto.
 *
 * Éste es el que usan los comprobadores NUEVOS, y el que se usa de muestra en `verificar-botin.ts`
 * y `verificar-protocolo-de-botas.ts`. Los demás NO se migran a propósito: cada migración es un
 * riesgo sin ganancia para el producto, y esto no arregla nada que esté roto en ellos.
 *
 * ═══ LOS CÓDIGOS DE SALIDA, Y QUÉ SIGNIFICA CADA UNO ═══
 *
 *   · 0 — todo en verde, y se hicieron al menos las comprobaciones escritas.
 *   · 1 — alguna comprobación en rojo: lo que vigila el guion está mal.
 *   · 2 — SE SALTÓ UN BLOQUE: se hicieron menos comprobaciones de las escritas. No dice nada del
 *         producto; dice que el guion no llegó a mirar todo lo que promete, y un verde así sería el
 *         verde falso que esta casa tiene apuntado tantas veces.
 *   · 3 — EL GUION REVENTÓ: una excepción que nadie atrapó. Antes salía con el 1 de Node y se
 *         confundía con un rojo del producto.
 *
 * La batería (`scripts/verificar-todo.mjs`) trata cualquier cosa distinta de 0 como rojo; los
 * códigos son para quien lo corre suelto y para quien lee el final de la salida.
 *
 * ═══ EL SUELO, Y POR QUÉ CUENTA COMO UNA COMPROBACIÓN MÁS ═══
 *
 * `terminar({ escritas })` exige que se hayan hecho AL MENOS `escritas` comprobaciones, contando
 * el propio suelo, que es la última. Cuenta porque en los comprobadores que ya lo tenían escrito a
 * mano —`comprobar('se han mirado todas las muestras', hechas >= 57)`— lo era: así el número que
 * se imprime no cambia al pasarlos al arnés, y «58 comprobaciones» sigue queriendo decir 58.
 *
 * El número se escribe EXACTO, el de hoy, y no con un margen «por si acaso»: con margen, un bloque
 * pequeño que deja de correr no lo baja del suelo. Si hay más de las escritas no es un fallo —un
 * juego nuevo añade las suyas a un comprobador que recorre el registro, y eso tiene que seguir en
 * verde—, pero se dice, para que alguien suba el número.
 *
 * Y el guardia va DESPUÉS de imprimir las rojas, que es la lección de `verificar-burgo.ts`: puesto
 * antes, dispara él y se lleva por delante los nombres de lo que ya se había encontrado.
 *
 * Sólo se usa en Node: aquí hay `process`. Lo que corre en Hermes (los robots, los guiones de
 * `verify:determinismo`) no lo importa.
 */

/** Los códigos de salida. Ver la cabecera. */
export const SALIDA = {
  verde: 0,
  rojo: 1,
  bloqueSaltado: 2,
  reventado: 3,
} as const;

/** Cuánto detalle cabe en una línea de fallo antes de cortarlo. */
const LARGO_DEL_DETALLE = 900;

export interface Arnes {
  /** Apunta una comprobación. Devuelve `bien`, para poder escribir `if (!comprobar(…)) return`. */
  comprobar(que: string, bien: boolean, detalle?: unknown): boolean;
  /** Un título de bloque en la salida: `· título`. */
  paso(titulo: string): void;
  /** Una línea de informe dentro de un bloque, sangrada. No comprueba nada. */
  nota(texto: string): void;
  /** Cuántas comprobaciones van hechas. */
  hechas(): number;
  /** Los fallos apuntados hasta ahora, ya escritos. */
  fallos(): readonly string[];
  /**
   * Cierra el guion: imprime las rojas, mira el suelo y sale con su código. No vuelve.
   *
   * `escritas` es el número EXACTO de comprobaciones que el guion hace hoy, contando ésta.
   * `enVerde` es lo que se imprime si todo sale bien, debajo de «✔ N comprobaciones.».
   */
  terminar(cierre: { escritas: number; enVerde?: string }): never;
}

/**
 * El detalle de un fallo, legible. `String(objeto)` da «[object Object]», que es justo la cifra
 * que hacía falta para saber por qué se cayó; y `JSON.stringify` revienta con un ciclo o con un
 * `BigInt`, y un comprobador no puede caerse por culpa de su propio mensaje de error.
 */
export function comoSeLee(detalle: unknown): string {
  let texto: string;
  if (typeof detalle === 'string') texto = detalle;
  else {
    try {
      texto = JSON.stringify(detalle) ?? String(detalle);
    } catch {
      texto = String(detalle);
    }
  }
  return texto.length > LARGO_DEL_DETALLE ? `${texto.slice(0, LARGO_DEL_DETALLE)}…` : texto;
}

/**
 * UN ARNÉS NUEVO. Se crea uno por guion, al principio, y a partir de ahí se escribe como siempre:
 *
 *     const { comprobar, paso, nota, terminar } = arnes();
 *     comprobar('lo que se afirma', condicion, detalle);
 *     terminar({ escritas: 58, enVerde: 'Lo que queda demostrado.' });
 *
 * Las funciones no dependen de `this`, así que se pueden sacar sueltas: los guiones que se pasan
 * al arnés no tienen que cambiar ni una de sus llamadas a `comprobar`.
 *
 * Al crearlo engancha el proceso para que una excepción que nadie atrape salga con el código 3 y
 * con las rojas que ya se hubieran encontrado, en vez de con el 1 genérico de Node.
 */
export function arnes(): Arnes {
  let hechas = 0;
  const fallos: string[] = [];

  const imprimirLasRojas = (): void => {
    if (fallos.length === 0) return;
    console.log(`\n${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
    for (const f of fallos) console.log(`  ✗ ${f}`);
  };

  const reventado = (error: unknown): void => {
    imprimirLasRojas();
    console.error(
      `\nEL GUION HA REVENTADO después de ${hechas} comprobaciones: una excepción que nadie atrapó. ` +
        'Lo de arriba es lo que alcanzó a mirar, y NO es un veredicto sobre el producto.\n',
    );
    console.error(error);
    process.exit(SALIDA.reventado);
  };
  process.on('uncaughtException', reventado);
  process.on('unhandledRejection', reventado);

  return {
    comprobar(que: string, bien: boolean, detalle?: unknown): boolean {
      hechas++;
      if (!bien) fallos.push(detalle === undefined ? que : `${que} — ${comoSeLee(detalle)}`);
      return bien;
    },
    paso(titulo: string): void {
      console.log(`\n· ${titulo}`);
    },
    nota(texto: string): void {
      console.log(`  ${texto}`);
    },
    hechas(): number {
      return hechas;
    },
    fallos(): readonly string[] {
      return fallos;
    },
    terminar(cierre: { escritas: number; enVerde?: string }): never {
      /* El suelo es la última comprobación: ver la cabecera. */
      hechas++;
      const saltado = hechas < cierre.escritas;
      imprimirLasRojas();
      if (saltado) {
        console.error(
          `\nSólo se han hecho ${hechas} de las ${cierre.escritas} comprobaciones que tiene escritas este guion: ` +
            'SE HA SALTADO UN BLOQUE sin decirlo. Eso no es un verde ni un rojo del producto: es un comprobador ' +
            'que no ha llegado a mirar todo lo que promete. Si has quitado comprobaciones a propósito, baja el número.',
        );
        process.exit(SALIDA.bloqueSaltado);
      }
      if (fallos.length > 0) process.exit(SALIDA.rojo);
      console.log(`\n✔ ${hechas} comprobaciones.${cierre.enVerde === undefined ? '' : ` ${cierre.enVerde}`}`);
      if (hechas > cierre.escritas) {
        console.log(
          `  (El suelo dice ${cierre.escritas} y se han hecho ${hechas}: si has añadido comprobaciones, sube \`escritas\`.)`,
        );
      }
      process.exit(SALIDA.verde);
    },
  };
}
