/**
 * LOS PERSONAJES DEL QUIEBRO, hacia fuera: el componente que pinta los cuerpos y la multitud, y lo puro
 * que el juego o un comprobador puedan querer (el reparto leído, el presupuesto por nivel).
 *
 * `Quiebro.tsx` busca aquí su pintor de cuerpos. Se exporta como `CuerposDelQuiebro` y NO como
 * `PersonajesDelQuiebro`: con ese nombre `Quiebro.tsx` lo montaría solo en cuanto existiera el fichero,
 * en mitad del trabajo de los demás frentes. El cambio a este pintor es una línea del frente «juego»
 * (ver el informe del frente «personajes»).
 */
export { CuerposDelQuiebro } from './CuerposDelQuiebro';
export type { PropsDeLosCuerpos } from './CuerposDelQuiebro';
export { DirectorDeLosPersonajes } from './director';
export type { MedidaDeLosPersonajes } from './director';
export { leerElReparto } from './reparto';
export type { Reparto } from './reparto';
export { CUOTA_DE_LOS_PERSONAJES, POLITICA, renglonDeLosPersonajes } from './presupuesto';
export type { RenglonDeLosPersonajes } from './presupuesto';
