/**
 * EL MUEBLE `formulario`: vistas normales, y el arcade que toque dentro.
 *
 * La ruta recibe el juego por parámetro —`/formulario?arcade=frente`— porque el
 * mueble es una superficie y no una pantalla de un juego. Ver `_layout.tsx`.
 *
 * ═══ POR QUÉ HAY UNA TABLA DE JUEGOS AQUÍ, Y POR QUÉ ES UNA DEUDA ═══
 *
 * El diseño llama a `formulario` un mueble GENÉRICO: «los pinta la plataforma, y
 * son los únicos que un arcade de FUERA puede usar». Hoy no lo es del todo, y
 * conviene decirlo aquí y no descubrirlo en la fase 5.
 *
 * Un formulario de verdad genérico tendría que preguntarle al juego qué se puede
 * hacer ahora mismo y pintar eso —botones, listas, cantidades— sin saber a qué se
 * juega. Esa función existe en el diseño, se llama `opciones()`, y llega con
 * Riberas en la fase 4: es CLIENTE y no autoridad, la misma que el mueble usa para
 * pintar y el reductor para validar, de modo que la regla se escribe una vez.
 * Escribirla hoy, con un solo juego, la dejaría con la forma de La Frente — que es
 * exactamente el error que todo este motor existe para no repetir.
 *
 * Así que mientras tanto esto es una tabla, y es la misma solución y por el mismo
 * motivo que `PANTALLAS_DE_JUEGO` en `app/src/pantallas.ts`: una tabla se lee
 * entera de un vistazo, mientras que un `if (arcade === 'frente')` repartido por
 * tres ficheros no. La deuda tiene dirección: cuando exista `opciones()`, esta
 * tabla se queda solo para los arcades que quieran pintarse a mano.
 *
 * MIENTRAS TANTO, LA CONSECUENCIA HAY QUE DECIRLA: un arcade de fuera del binario
 * que declare `mueble: 'formulario'` llegaría a esta pantalla y no encontraría
 * entrada en la tabla. Se le dice, en vez de dejar una pantalla en blanco.
 */
import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { arcadeInstalado, manifiestoDeArcadeSiExiste } from '../../../shared/arcade';
import type { ArcadeId } from '../../../shared/arcade';
import '../../../shared/arcade/juegos';
import { LaFrente } from '../../src/arcade/frente';
import { FRENTE } from '../../../shared/arcade/juegos';
import { SALA } from '../../src/arcade/muebles';

/** Qué componente pinta cada arcade de formulario que trae el binario. */
const LOS_QUE_PINTA: Record<ArcadeId, ComponentType> = {
  [FRENTE]: LaFrente,
};

export default function Formulario(): JSX.Element {
  const { arcade } = useLocalSearchParams<{ arcade?: string }>();
  const id = typeof arcade === 'string' ? arcade : '';

  /*
   * Se comprueban las tres cosas por separado porque los tres fallos tienen
   * arreglos distintos, y una pantalla que dijera «algo ha ido mal» obligaría a
   * abrir el depurador para saber cuál de los tres fue.
   */
  if (!arcadeInstalado(id)) {
    return <NoHayNada que={`No hay ningún arcade llamado «${id}» instalado en esta app.`} />;
  }

  const manifiesto = manifiestoDeArcadeSiExiste(id);
  if (manifiesto !== undefined && manifiesto.mueble !== 'formulario') {
    return (
      <NoHayNada
        que={`«${manifiesto.nombre}» se pinta con el mueble «${manifiesto.mueble}», no con un formulario.`}
      />
    );
  }

  const Pintar = LOS_QUE_PINTA[id];
  if (Pintar === undefined) {
    return (
      <NoHayNada
        que={`«${manifiesto?.nombre ?? id}» declara el mueble «formulario» y esta app todavía no sabe pintarlo. Un formulario de verdad genérico llega con \`opciones()\`, en la fase de Riberas.`}
      />
    );
  }

  return <Pintar />;
}

/**
 * Lo que se enseña cuando no hay nada que pintar.
 *
 * Dice QUÉ pasa y no «vaya, algo ha fallado». La regla de la portada vale también
 * aquí: nada de lo que se enseña es mentira, y una pantalla que no explica lo que
 * ocurre es una forma educada de mentir.
 */
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
