/**
 * La Sala de Arcade: navegación de la SEGUNDA familia de juegos.
 *
 * Grupo hermano de `(juego)/`, y hermano de verdad: no comparten ni una línea. Las
 * veladas viven detrás de una partida, una invitación y un Game Master, y su
 * navegación es una barra de pestañas que el manifiesto del juego configura. Un
 * arcade no tiene nada de eso —se abre y se juega— así que aquí hay una pila y no
 * una barra, y no hay `useTema()`, que devuelve el color de la velada que se esté
 * jugando y pintaría este grupo de verde fieltro o de color arena según lo que
 * hubiera abierto antes.
 *
 * ═══ UNA RUTA POR MUEBLE, Y NO UNA POR JUEGO ═══
 *
 * Es la decisión de este fichero. Un mueble es la SUPERFICIE donde se pinta un
 * juego —`formulario`, `tablero`, `lienzo`, `escena`— y sirve a muchos juegos: la
 * ruta `/formulario` la abre La Frente hoy y cualquier otro arcade de formulario
 * mañana, con el identificador del juego como parámetro.
 *
 * Con una ruta por juego, cada arcade nuevo obligaría a publicar una versión de la
 * app en dos tiendas. Eso es exactamente lo que el enchufe de la fase 5 existe para
 * evitar, y la decisión de producto más cara del diseño está escrita al lado: el
 * enchufe alcanza a las reglas, no a los píxeles. Un arcade de fuera registra
 * manifiesto, reductor y proyección, y se pinta con un mueble genérico.
 */
import { Stack } from 'expo-router';
import type { MuebleDeArcade } from '../../../shared/arcade';
import { SALA } from '../../src/arcade/muebles';

/**
 * Los cuatro muebles del contrato, uno por ruta.
 *
 * ═══ ES UN `Record` SOBRE LA UNIÓN CERRADA, Y ESA ES LA GRACIA ═══
 *
 * Igual que `PANTALLAS` en `app/app/(juego)/_layout.tsx`: si alguien añade un
 * mueble al contrato y olvida declararlo aquí, ESTO NO COMPILA. Con una lista, el
 * mueble existiría en el contrato, un arcade podría declararlo, y en el móvil no
 * saldría nada —sin error y sin aviso— hasta que alguien abriera la Sala. Se paga
 * una línea y a cambio el compilador no deja estrenarse a medias.
 *
 * LOS CUATRO SE PINTAN YA, y aquí ponía que tres no. Lo escribía cuando la fase 1
 * entregaba `formulario` y las otras tres rutas montaban una pantalla de «todavía
 * no»: `tablero` lo estrenó Riberas, `escena` La Peonza, `lienzo` El Arcade, y la
 * pantalla de «pendiente» ya no existe. Las cuatro rutas son hoy la misma línea
 * sobre `PintarEnElMueble`.
 *
 * Lo que compra el `Record` completo sigue siendo lo mismo y por eso se queda: el
 * día que el contrato estrene un quinto mueble, esto no compila hasta que tenga
 * su ruta —que es el equivalente de `papiro` y `sellado` en el otro motor—.
 */
const MUEBLES: Record<MuebleDeArcade, true> = {
  formulario: true,
  tablero: true,
  lienzo: true,
  escena: true,
};

export default function DisposicionDeLaSala(): JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: SALA.fondo },
        animation: 'fade',
      }}
    >
      {(Object.keys(MUEBLES) as MuebleDeArcade[]).map((mueble) => (
        <Stack.Screen key={mueble} name={mueble} />
      ))}
    </Stack>
  );
}
