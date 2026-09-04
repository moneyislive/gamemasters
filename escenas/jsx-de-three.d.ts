/**
 * LAS ETIQUETAS DE `three` EN JSX, DECLARADAS DONDE NO SE PUEDEN PERDER.
 *
 * ═══ EL PROBLEMA, QUE COSTÓ UN RATO Y NO DICE SU NOMBRE ═══
 *
 * `<mesh>`, `<group>` y `<meshStandardMaterial>` no son etiquetas de React: las
 * declara `@react-three/fiber` en su `three-types.d.ts`, ampliando `JSX` dentro de
 * los módulos `react`, `react/jsx-runtime` y `react/jsx-dev-runtime`.
 *
 * Una ampliación de módulo sólo existe si el módulo que la declara entra en el
 * programa. Y ahí está la trampa: `import type {} from '@react-three/fiber'` —que
 * es el gesto que uno escribe para traer tipos sin añadir dependencia en
 * ejecución— tiene la lista de nombres VACÍA, así que el compilador lo elide
 * entero y la ampliación no llega. El error que sale es «Property 'mesh' does not
 * exist on type 'JSX.IntrinsicElements'», repetido una vez por etiqueta, y no
 * menciona a r3f por ningún lado.
 *
 * Un fichero de declaración no se puede elidir: entra al programa por estar en el
 * `include`. Por eso esto vive aquí y no en una línea de `delta.tsx`.
 *
 * ═══ Y POR QUÉ ESTO NO ES DUPLICAR LO DE R3F ═══
 *
 * No se copia su tabla: se importa `ThreeElements`, que es SUYA, y se ensancha la
 * misma interfaz que él ensancha. Si mañana r3f añade una etiqueta, aparece aquí
 * sola. Lo único que este fichero aporta es GARANTIZAR QUE SE CARGA.
 */
import type { ThreeElements } from '@react-three/fiber';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare module 'react/jsx-dev-runtime' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
