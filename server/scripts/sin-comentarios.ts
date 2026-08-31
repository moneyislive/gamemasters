/**
 * Quitar los comentarios de un fichero sin comerse el código.
 *
 * ═══ POR QUÉ HACE FALTA, Y POR QUÉ NO ES UNA EXPRESIÓN REGULAR ═══
 *
 * Los dos comprobadores estáticos del arcade —`verify:fronteras` y
 * `verify:pureza`— miran el CÓDIGO y no los comentarios, y no es un detalle:
 *
 *   · Un comentario que dice «esto no puede importar `node:crypto`» es
 *     documentación buena. Penalizarla empujaría a borrar justamente lo que
 *     ayuda a quien venga detrás.
 *   · Y las cabeceras de este repositorio están llenas de código citado. Un
 *     comprobador que leyera los comentarios estaría en rojo desde el primer
 *     commit por culpa de sus propias explicaciones.
 *
 * Se recorre carácter a carácter en vez de con una expresión regular porque un
 * `//` dentro de una cadena —`'https://…'`, que sale en cada ruta de este
 * repositorio— engañaría a cualquier regex y borraría media línea de código de
 * verdad. Aquí se lleva la cuenta de si estamos dentro de una cadena, de una
 * plantilla o de un comentario, que es la única forma de no equivocarse.
 *
 * LAS CADENAS SÍ SE CONSERVAN: `import('node:fs')` es un import de verdad
 * aunque el especificador sea una cadena, e igual `Math.random` escrito dentro
 * de un `eval` — que no debería existir, y si existe hay que verlo.
 *
 * ═══ POR QUÉ ESTÁ COPIADO DE `verificar-nucleo-agnostico.ts` ═══
 *
 * Aquel fichero tiene la misma función, probada y en producción desde hace
 * tiempo, y lo suyo sería importarla de allí. No se hace porque exportarla
 * obliga a editar ese fichero, y este trabajo se está haciendo en un árbol donde
 * hay otra sesión trabajando a la vez: un diff en un comprobador que ella
 * también puede estar tocando es la clase de conflicto que cuesta más que las
 * cuarenta líneas que ahorra.
 *
 * Está anotado para que quien unifique los dos sepa que son la misma función y
 * no dos que se han parecido por casualidad.
 */

/** El fichero con los comentarios sustituidos por espacios, línea a línea. */
export function sinComentarios(fuente: string): string {
  let salida = '';
  let i = 0;
  const n = fuente.length;

  while (i < n) {
    const c = fuente[i]!;
    const siguiente = fuente[i + 1];

    // Comentario de línea.
    if (c === '/' && siguiente === '/') {
      while (i < n && fuente[i] !== '\n') {
        salida += ' ';
        i++;
      }
      continue;
    }

    /*
     * Comentario de bloque. Se conservan los saltos de línea para que el número
     * de línea de un hallazgo siga siendo el de verdad: un comprobador que dice
     * «línea 412» y no lo es hace perder más tiempo del que ahorra.
     */
    if (c === '/' && siguiente === '*') {
      while (i < n && !(fuente[i] === '*' && fuente[i + 1] === '/')) {
        salida += fuente[i] === '\n' ? '\n' : ' ';
        i++;
      }
      salida += '  ';
      i += 2;
      continue;
    }

    // Cadenas: se copian tal cual, respetando los escapes.
    if (c === '"' || c === "'" || c === '`') {
      const cierre = c;
      salida += c;
      i++;
      while (i < n) {
        if (fuente[i] === '\\') {
          salida += fuente[i]! + (fuente[i + 1] ?? '');
          i += 2;
          continue;
        }
        salida += fuente[i];
        if (fuente[i] === cierre) {
          i++;
          break;
        }
        // Una comilla sin cerrar no debe comerse el resto del fichero.
        if (cierre !== '`' && fuente[i] === '\n') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    salida += c;
    i++;
  }

  return salida;
}
