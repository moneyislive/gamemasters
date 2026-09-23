/**
 * UNA MESA DE BOTAS, VISTA DESDE UN CLIENTE: si lo es, y lo que la escena necesita para enchufarle
 * el canal.
 *
 * ═══ POR QUÉ UNA FUNCIÓN PARA UNA COMPARACIÓN ═══
 *
 * Porque la comparación la hacen DOS clientes, y lo que decide es lo que pasa cuando el campo no
 * está. La modalidad la trae la vista de mesa desde que el servidor la sabe; un servidor anterior
 * no la manda, uno posterior puede mandar una tercera que este binario no conozca, y en los dos
 * casos lo único correcto es la mesa de siempre: abrir un WebSocket contra un servidor que no lo
 * sirve deja la pantalla en «Sin conexión» para nada. «Sin él, `'normal'`», y sólo `'botas'`
 * escrito así es botas. Escrito una vez, aquí, y los dos clientes lo llaman; `verify:canal-del-paseo`
 * lo mide y mira en el fuente que ninguno lo decida por su cuenta.
 *
 * ═══ Y DE DÓNDE SALE EL COLOR DE CADA UNO ═══
 *
 * La vista de mesa trae el nombre y la figura de cada asiento, pero no su color: el color es del
 * JUEGO, que lo reparte por el orden en que se sentaron (`colorDeLabriego` en Las Lindes) y lo pone
 * en su vista. Así que se lee de ahí, de la lista `labriegos` con su `asiento` y su `color`, que es
 * como lo declara Las Lindes. Un juego que no lo declare así sale en gris, que se sigue leyendo; el
 * Burgo y Riberas, cuando anden, le pasarán el suyo a `asientosQueAndan` con su propia lista.
 *
 * Sin `three` y sin React: lo importan las dos pantallas y el comprobador.
 */
import type { EstadoDelCanal } from './canal-de-botas';

/** Un asiento de la mesa, con lo que hace falta para pintarlo andando. */
export interface AsientoQueAnda {
  readonly id: string;
  /** Lo que tecleó al sentarse. */
  readonly nombre: string;
  /** La figura que eligió, si eligió: sin ella, `figuraQueSePinta` saca la de serie del asiento. */
  readonly figura?: string;
  /** `#rrggbb`. */
  readonly color: string;
}

/**
 * LO QUE LA ESCENA RECIBE PARA ANDAR CON LOS DEMÁS. Si no se le da, anda sola, como siempre.
 */
export interface CanalDeBotas {
  /** La dirección entera: `ws(s)://<servidor>` + `rutaDelCanal(codigo)`. La pone el cliente. */
  readonly url: string;
  /** La llave del asiento. Viaja en el `hola`, nunca en la dirección. */
  readonly llave: string;
  /** Mi asiento: a uno mismo no se le pinta aunque salga en la foto. */
  readonly yo: string;
  /** Los asientos de la mesa, con su nombre, su figura y su color. */
  readonly asientos: readonly AsientoQueAnda[];
  /** Cada vez que cambia lo que hay que enseñar del canal: «Conectando…», «Dentro», «Sin conexión: …». */
  readonly alCambiar?: (estado: EstadoDelCanal) => void;
}

/** El color de quien no lo tiene declarado: el mismo gris que pone Las Lindes a quien no está. */
export const COLOR_SIN_DECLARAR = '#9aa0a6';

/** ¿Es esta mesa de la modalidad `botas`? Sin el campo, o con cualquier otra cosa, no. */
export function esMesaDeBotas(mesa: { readonly modalidad?: unknown } | null | undefined): boolean {
  return mesa !== null && mesa !== undefined && mesa.modalidad === 'botas';
}

/**
 * LOS ASIENTOS DE LA MESA, CON SU COLOR.
 *
 * `asientos` es lo que trae la vista de mesa; `vista`, la del juego. El color se busca en su lista
 * `labriegos` —ver la cabecera—, y se exige que sea un `#rrggbb`: lo que llega por el cable no es
 * un color hasta que se mira.
 */
export function asientosQueAndan(
  asientos: readonly { readonly id: string; readonly nombre: string; readonly figura?: string }[],
  vista: unknown,
): AsientoQueAnda[] {
  const colores = new Map<string, string>();
  const lista = typeof vista === 'object' && vista !== null ? (vista as { labriegos?: unknown }).labriegos : undefined;
  if (Array.isArray(lista)) {
    for (const l of lista as unknown[]) {
      if (typeof l !== 'object' || l === null) continue;
      const { asiento, color } = l as { asiento?: unknown; color?: unknown };
      if (typeof asiento === 'string' && typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) {
        colores.set(asiento, color);
      }
    }
  }
  return asientos.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    ...(a.figura === undefined ? {} : { figura: a.figura }),
    color: colores.get(a.id) ?? COLOR_SIN_DECLARAR,
  }));
}
