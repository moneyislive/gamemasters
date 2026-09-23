/**
 * LAS ESCENAS HERMANAS DEL MUELLE: qué componente monta cada nombre de `TemaDelMuelle.escena`.
 *
 * ═══ ESTABA ESCRITA DOS VECES, Y ESO ERA UNA ALTA DE MÁS POR LOBBY ═══
 *
 * La misma línea —`{ plaza: Plaza, linde: LindeAlta, embarcadero: Embarcadero }`— vivía en
 * `app/src/arcade/muelle-escena.tsx` y en `escritorio/src/muelle.tsx`, con el mismo
 * comentario encima y el mismo respaldo al embarcadero. Un lobby nuevo tenía que acordarse
 * de las dos, y el día que se acordara de una sola, el otro cliente montaría el embarcadero
 * de Riberas en su lugar sin un solo error: el respaldo existe precisamente para no dejar
 * una pantalla en blanco, así que tapa el olvido. Aquí está una vez y la leen los dos.
 *
 * ═══ POR QUÉ EN `escenas/` Y NO EN CADA CLIENTE ═══
 *
 * Porque las tres escenas viven aquí y los dos clientes compilan `escenas/` (es la frontera
 * del `Canvas`: la escena no sabe en qué plataforma está). Qué nombre del tema monta qué
 * escena es una decisión de ESCENA, no de plataforma: ni la app ni el escritorio tienen
 * nada que añadir a ella, sólo montarla.
 *
 * ═══ Y POR QUÉ NO DENTRO DE `tema.ts`, QUE ERA EL SITIO NATURAL ═══
 *
 * Porque `tema.ts` es una tabla de cadenas SIN UN SOLO `import`, y de eso depende la
 * portada de la app: `muebles.ts` le pregunta `tieneMuelle` para decidir a dónde lleva
 * cada tarjeta, y la portada se pinta antes de que nadie toque nada. Con esta tabla dentro,
 * esa pregunta arrastraría `three`, `@react-three/fiber` y las tres escenas enteras a la
 * primera pantalla, que es justo lo que la envoltura perezosa del muelle
 * (`app/src/arcade/muelle.tsx`) existe para impedir. Hay otras dos razones, más cortas: la
 * plaza y la linde importan `colorDeAsiento` de `tema.ts`, así que con la tabla dentro el tema
 * se importaría a sí mismo a través de ellas —un ciclo, y en un ciclo una tabla `const` se
 * lee a medio hacer—; y `verify:embarcadero` lee el tema desde Node sin cargar ninguna escena.
 * Así que el tema dice el NOMBRE de la escena, y este fichero —que en la app sólo se importa
 * detrás de la carga perezosa— lo convierte en componente.
 *
 * ═══ EL TIPO ES LA FIRMA DEL EMBARCADERO, Y NO `ComponentType` DE REACT ═══
 *
 * Las tres cumplen `PropsDelEmbarcadero` letra por letra (ver `tipos.ts`) y devuelven el
 * mismo `JSX.Element`, así que el tipo de una escena hermana es, literalmente, el tipo del
 * embarcadero. Escribirlo con `ComponentType` obligaría a importar los tipos de React desde
 * aquí, y `escenas/` no resuelve la misma copia de `@types/react` que los dos clientes: con
 * la firma de la propia escena, el cliente recibe exactamente lo que ya montaba.
 *
 * Y la tabla es un `Record` sobre la unión de `TemaDelMuelle.escena`: un nombre nuevo en esa
 * unión sin fila aquí no compila, y no compila en los dos clientes a la vez.
 */
import { Embarcadero } from './Embarcadero';
import type { TemaDelMuelle } from './tema';
import { LindeAlta } from '../linde-alta/LindeAlta';
import { Plaza } from '../plaza/Plaza';

/** Una escena hermana del muelle: cualquiera que se monte como el embarcadero. */
export type EscenaDelMuelle = typeof Embarcadero;

/** El nombre que dice el tema → el componente que se monta. Una fila por escena hermana. */
export const ESCENAS_DEL_MUELLE: Readonly<Record<TemaDelMuelle['escena'], EscenaDelMuelle>> = {
  embarcadero: Embarcadero,
  plaza: Plaza,
  linde: LindeAlta,
};

/**
 * LA ESCENA QUE PIDE EL TEMA. Un `escena` que esta versión no conozca cae al embarcadero,
 * que es el que siempre estuvo: un lobby de otro sitio es raro, y una pantalla en blanco es
 * un fallo. Es el respaldo que llevaban escrito los dos clientes, dicho una vez.
 */
export function escenaDelMuelle(tema: TemaDelMuelle): EscenaDelMuelle {
  return ESCENAS_DEL_MUELLE[tema.escena] ?? Embarcadero;
}
