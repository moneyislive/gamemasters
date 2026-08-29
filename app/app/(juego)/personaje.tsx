/**
 * Tu dosier. Lo que lleva dentro NO LO DECIDE ESTA PANTALLA.
 *
 * ═══ QUÉ HACE Y QUÉ NO ═══
 *
 * Pinta tres cosas: el retrato de arriba, los bloques que el juego declare en
 * `manifiesto.dosier` —en su orden— y el código de la partida al final. Nada más.
 * Qué bloques existen está en `app/src/dosier/bloques.tsx`; cuáles van y en qué
 * orden, en el fichero de cada juego.
 *
 * ═══ POR QUÉ ═══
 *
 * Esta pantalla la comparten los tres juegos, y durante un tiempo decidió ella:
 * pintaba el papel, el secreto, la coartada, lo que sabes de los demás, los
 * giros, el caso, las doce reglas, los objetos y la lista de gente en la mesa,
 * para todos por igual. Cuando a CLUEDO se le reorganizó el dosier —la trama y
 * las reglas a la pestaña de Ronda, las pistas a la suya— resultó que la Momia y
 * El Paso de las Sombras NO tienen esas pestañas: quitarles lo mismo les borraba
 * ese material de la app entera. Se tapó con un booleano que preguntaba si el
 * juego declaraba la pestaña `cuaderno`, y eso ya eran dos juegos compartiendo
 * una rama y un tercero heredando la que le tocara.
 *
 * El reparto por lista quita el solape de raíz: la lista de CLUEDO y la de la
 * Momia son dos arrays en dos ficheros distintos, y tocar uno no puede mover el
 * otro. Un juego que no declare ningún bloque —una oca— tiene un dosier vacío, y
 * eso es una respuesta legítima, no un fallo.
 */
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { usePartida } from '../../src/estado';
import {
  Cargando,
  Cuerpo,
  Marco,
  Pantalla,
  Sello,
  Titulo,
  color,
  espacio,
} from '../../src/ui';
import { Foto } from '../../src/foto';
import { conAlfa, useTema } from '../../src/tema-juego';
import { BLOQUES } from '../../src/dosier/bloques';
import { manifiestoDe } from '../../../shared/juegos';

export default function Personaje(): JSX.Element {
  const { vista } = usePartida();
  /*
   * El tema va ANTES del `return` de abajo. Es un hook, y React los identifica
   * por su orden de llamada: dejarlo detrás haría que en el primer renderizado
   * —sin vista todavía— se llamara uno y en el siguiente dos, y React tira la
   * pantalla con «rendered more hooks than during the previous render». Y no es
   * un caso raro: ese primer renderizado sin vista es el que ve TODO el mundo al
   * abrir el dosier, porque la vista llega del servidor.
   */
  const t = useTema();
  if (!vista) return <Pantalla><Cargando /></Pantalla>;
  const { yo, sesion } = vista;
  const manifiesto = manifiestoDe(sesion.juego);

  return (
    <Pantalla>
      <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
        <Sello>Confidencial · solo para ti</Sello>
        <Foto
          url={yo.photoUrl}
          style={estilos.retrato}
          respaldo={
            <View
              style={[
                estilos.retrato,
                estilos.retratoVacio,
                // El verde fieltro estaba cosido aquí abajo, y era lo PRIMERO
                // que se veía del dosier: un disco verde de casino coronando una
                // pantalla de arena y lapislázuli.
                { backgroundColor: conAlfa(t.felt700, 0.6) },
              ]}
            >
              <Titulo style={{ fontSize: 32 }}>
                {yo.characterName.slice(0, 1).toUpperCase()}
              </Titulo>
            </View>
          }
        />
        <Titulo style={{ textAlign: 'center', fontSize: 26 }}>{yo.characterName}</Titulo>
      </Animated.View>

      {/*
        EL DOSIER DEL JUEGO QUE SE JUEGA, en su orden.

        Un juego que declare un bloque que esta versión de la app no conozca no
        puede llegar aquí: `BLOQUES` es un `Record` sobre la unión cerrada
        `BloqueDeDosier`, así que eso no compila. La guarda de abajo es para el
        caso de una partida guardada con un manifiesto más nuevo que el binario
        del móvil, que sí puede pasar: se salta el bloque en vez de reventar la
        pantalla entera.
      */}
      {manifiesto.dosier.map((id) => {
        const Bloque = BLOQUES[id];
        if (!Bloque) return null;
        return <Bloque key={id} vista={vista} manifiesto={manifiesto} />;
      })}

      {/* Un dosier vacío es una respuesta legítima —una oca no reparte papeles—
          pero si el juego declaró la pestaña conviene que diga algo. */}
      {manifiesto.dosier.length === 0 && (
        <Marco>
          <Cuerpo tenue>Este juego no reparte papeles: no hay nada que leer aquí.</Cuerpo>
        </Marco>
      )}

      {/*
        El código de la partida, que es lo que se teclea para volver a emparejar
        un móvil. No se enseña en ninguna otra pantalla de la app, así que si se
        va de aquí se va del todo: quien cierre la app a mitad de velada se queda
        fuera sin nadie a quien preguntar.
      */}
      <Cuerpo tenue style={{ fontSize: 14, marginTop: espacio.lg, textAlign: 'center' }}>
        Código de la partida: {sesion.code}
      </Cuerpo>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  retrato: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: color.oro500,
    marginVertical: espacio.lg,
  },
  retratoVacio: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
