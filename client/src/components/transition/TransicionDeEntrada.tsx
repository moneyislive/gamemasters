/**
 * La cortinilla con la que se entra en una partida, la del juego que sea.
 *
 * POR QUÉ UNA TABLA AQUÍ Y NO UN CAMPO DEL MANIFIESTO. Es la misma regla que
 * ya gobierna `shared/juegos/tipos.ts`: si un humano lo diría como una tabla es
 * dato, y si lo diría como «y entonces…» es código. Una transición son dos
 * losas que se desplazan mientras cae arena y una lámpara barre una
 * inscripción; eso no cabe en el manifiesto sin acabar inventando un lenguaje
 * de animación peor que el que ya hay. Lo que sí es dato —el nombre del juego,
 * su lema, su paleta— vive en el manifiesto, y de ahí lo sacan.
 *
 * LO QUE SÍ SE GANA con esta tabla: que ninguna página tenga que saber qué
 * cortinilla toca. El recibidor pide «la transición de este juego» y ya está;
 * un juego nuevo se añade en una línea y no toca ninguna pantalla.
 *
 * SIN ENTRADA PROPIA se usa la de CLUEDO, que es la de la casa. Es lo mismo que
 * hace el tema en `temas.css`, y por el mismo motivo: lo que se hereda al no
 * decir nada es la mansión.
 */
import type { ComponentType } from 'react';
import CluedoTransition from './CluedoTransition';
import MomiaTransition from './MomiaTransition';

export interface PropsDeTransicion {
  active: boolean;
  onComplete: () => void;
}

const TRANSICIONES: Record<string, ComponentType<PropsDeTransicion>> = {
  cluedo: CluedoTransition,
  momia: MomiaTransition,
};

export default function TransicionDeEntrada({
  juego,
  active,
  onComplete,
}: PropsDeTransicion & { juego: string | undefined }): JSX.Element {
  const Cortinilla = TRANSICIONES[juego ?? 'cluedo'] ?? CluedoTransition;
  return <Cortinilla active={active} onComplete={onComplete} />;
}
