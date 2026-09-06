/**
 * QUÉ CARA DEL DADO ENSEÑA CADA VALOR. GENERADO por `escenas/scripts/compilar-dados.ts`:
 * NO EDITAR A MANO.
 *
 * Medido sobre el D6 de KayKit Board Game Bits al compilar `escenas/modelos/dados.glb`:
 * cada punto es un grupo conexo de vértices del color del punto, y la cara con N grupos
 * es la que enseña el N (`escenas/scripts/caras-del-d6.ts` cuenta cómo y por qué). La
 * escena lo lee para orientar el dado al asentarse: la normal de la cara del valor que
 * salió tiene que acabar mirando hacia arriba. `verify:dados` vuelve a medir el `.glb`
 * y exige que este fichero sea, byte a byte, lo que la medida produce.
 *
 * Caras: +x=2 -x=5 +y=6 -y=1 +z=3 -z=4. Suman 21; las opuestas, 7.
 */

/** Una cara del modelo, por el eje hacia el que mira en el espacio del modelo. */
export type CaraDelDado = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

/** Un valor de una cara. */
export type ValorDelDado = 1 | 2 | 3 | 4 | 5 | 6;

/** La cara del modelo `MODELO.dado` que enseña cada valor. */
export const CARA_DEL_VALOR: Readonly<Record<ValorDelDado, CaraDelDado>> = {
  1: '-y',
  2: '+x',
  3: '+z',
  4: '-z',
  5: '-x',
  6: '+y',
};

/** La normal unitaria, en el espacio del modelo, de la cara que enseña cada valor. */
export const NORMAL_DEL_VALOR: Readonly<Record<ValorDelDado, readonly [number, number, number]>> = {
  1: [0, -1, 0],
  2: [1, 0, 0],
  3: [0, 0, 1],
  4: [0, 0, -1],
  5: [-1, 0, 0],
  6: [0, 1, 0],
};

/** La normal de la cara de un valor, o `null` si el número no es de un dado. */
export function normalDelValor(valor: number): readonly [number, number, number] | null {
  return valor >= 1 && valor <= 6 && Number.isInteger(valor) ? NORMAL_DEL_VALOR[valor as ValorDelDado] : null;
}
