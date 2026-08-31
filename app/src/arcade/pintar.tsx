/**
 * PINTAR EL ARCADE QUE PIDE LA RUTA, o decir con todas las letras por qué no.
 *
 * ═══ POR QUÉ ESTO ES UN FICHERO Y NO ESTÁ DENTRO DE CADA RUTA ═══
 *
 * Las rutas del grupo `(arcade)` son una por MUEBLE —`/formulario`, `/lienzo`,
 * `/tablero`, `/escena`— y todas hacen exactamente lo mismo: leer qué juego pide
 * el parámetro, comprobar tres cosas y pintarlo. Escrito dentro de cada una, ese
 * «comprobar tres cosas» se copia, y a la tercera copia una de ellas se queda
 * atrás.
 *
 * Y no es una hipótesis: la fase 3 empezó arreglando exactamente ese fallo, con
 * `vitrina.ts` y `formulario.tsx` contestando por separado a la pregunta de si un
 * arcade se puede jugar. Ver `pintados.ts`, donde vive ahora la única respuesta.
 *
 * ═══ LAS TRES COMPROBACIONES SON TRES Y NO UNA ═══
 *
 * Porque los tres fallos tienen arreglos distintos, y una pantalla que dijera
 * «algo ha ido mal» obligaría a abrir el depurador para saber cuál de los tres
 * fue. La regla de la portada vale también aquí: nada de lo que se enseña es
 * mentira, y una pantalla que no explica lo que ocurre es una forma educada de
 * mentir.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { arcadeInstalado, manifiestoDeArcadeSiExiste } from '../../../shared/arcade';
import type { MuebleDeArcade } from '../../../shared/arcade';
/*
 * ESTA IMPORTACIÓN INSTALA. Es el mismo trato que `shared/juegos/index.ts` da a
 * las veladas: quien quiera la Sala llena importa esto y no hay una lista escrita
 * a mano en otro sitio que se quede vieja. Sin ella, entrar a un arcade por un
 * enlace directo —sin pasar antes por la portada, que es quien la importaba—
 * encontraría el registro vacío.
 */
import '../../../shared/arcade/juegos';
import { MUEBLES, SALA } from './muebles';
import { LOS_QUE_PINTA } from './pintados';

/** Pinta el arcade que pida la ruta, si este mueble es el suyo y se sabe pintar. */
export function PintarEnElMueble({ mueble }: { mueble: MuebleDeArcade }): JSX.Element {
  const { arcade } = useLocalSearchParams<{ arcade?: string }>();
  const id = typeof arcade === 'string' ? arcade : '';

  if (!arcadeInstalado(id)) {
    return <NoHayNada que={`No hay ningún arcade llamado «${id}» instalado en esta app.`} />;
  }

  const manifiesto = manifiestoDeArcadeSiExiste(id);
  if (manifiesto !== undefined && manifiesto.mueble !== mueble) {
    /*
     * Llegar aquí significa que alguien ha escrito la dirección a mano: la ruta de
     * un arcade se calcula desde SU manifiesto (`rutaDeArcade`), así que por el
     * camino normal el mueble siempre coincide. Se dice igual, porque un enlace
     * compartido con el mueble equivocado es una pantalla en blanco si no.
     */
    return (
      <NoHayNada
        que={`«${manifiesto.nombre}» se pinta con el mueble «${manifiesto.mueble}», y ésta es la pantalla de «${mueble}».`}
      />
    );
  }

  const Pintar = LOS_QUE_PINTA[id];
  if (Pintar === undefined) {
    /*
     * El juego está instalado y su mueble es éste, y aun así este binario no sabe
     * pintarlo. Pasa de verdad y no es un caso teórico: el registro es de
     * EJECUCIÓN —un arcade se instala llamando a una función— y la app es un
     * binario compilado. Es exactamente lo que le ocurriría a un arcade de fuera
     * que declarase un mueble genérico, y por eso se le dice qué falta.
     *
     * Lo que NO puede pasar es llegar aquí DESDE LA SALA: la tarjeta de un arcade
     * que no se sabe pintar no es pulsable, y las dos decisiones salen de la misma
     * tabla. Ver `pintados.ts`.
     */
    const ficha = MUEBLES[mueble];
    return (
      <NoHayNada
        que={`«${manifiesto?.nombre ?? id}» declara el mueble «${mueble}» y esta versión de la app no trae con qué pintarlo. ${ficha.cuandoLlega}`}
      />
    );
  }

  return <Pintar />;
}

/** Lo que se enseña cuando no hay nada que pintar. Dice QUÉ pasa, no «vaya». */
function NoHayNada({ que }: { que: string }): JSX.Element {
  return (
    <View style={estilos.centro}>
      <Text style={estilos.titulo}>LA SALA DE ARCADE</Text>
      <Text style={estilos.texto}>{que}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 16,
    backgroundColor: SALA.fondo,
  },
  titulo: { color: SALA.neon, fontSize: 18, fontWeight: '800', letterSpacing: 4 },
  texto: { color: SALA.palabra, fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 360 },
});
