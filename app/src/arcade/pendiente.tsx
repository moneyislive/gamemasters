/**
 * LA PANTALLA DE UN MUEBLE QUE TODAVÍA NO SE PINTA.
 *
 * De los cuatro muebles del contrato, la fase 1 entrega uno: `formulario`. Los
 * otros tres tienen ruta —el `Record<MuebleDeArcade, true>` de
 * `app/app/(arcade)/_layout.tsx` no compila si falta alguna— y esa ruta enseña
 * esto.
 *
 * ═══ POR QUÉ ESTO NO ES UN CATÁLOGO FINGIDO ═══
 *
 * Porque HOY NO SE PUEDE LLEGAR AQUÍ. La ruta de un arcade se calcula desde su
 * manifiesto —`rutaDeArcade`— y no hay ningún arcade instalado que declare
 * `tablero`, `lienzo` ni `escena`. Nadie va a ver esta pantalla mientras la Sala
 * tenga un solo juego.
 *
 * Existe para que el compilador pueda hacer su trabajo: el día que llegue Riberas
 * con `mueble: 'tablero'`, la ruta ya está y lo que hay que escribir es lo que la
 * ruta pinta. Y si alguien instalara ese juego antes de escribirlo, se encontraría
 * con una pantalla que dice exactamente qué falta, en vez de con una en blanco —
 * que es el fallo mudo de siempre, y el que más caro sale.
 *
 * La regla de la portada vale también aquí: nada de lo que se enseña es mentira.
 * Esto dice la verdad, y la verdad es que ese mueble todavía no existe.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { MuebleDeArcade } from '../../../shared/arcade';
import { MUEBLES, SALA } from './muebles';

export function MueblePendiente({ mueble }: { mueble: MuebleDeArcade }): JSX.Element {
  const ficha = MUEBLES[mueble];
  return (
    <View style={estilos.centro}>
      <Text style={estilos.titulo}>EL MUEBLE «{mueble.toUpperCase()}»</Text>
      <Text style={estilos.texto}>{ficha.loQueEs}</Text>
      <Text style={estilos.cuando}>{ficha.cuandoLlega}</Text>
      <Pressable
        onPress={() => router.back()}
        style={estilos.salir}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <Text style={estilos.salirTexto}>Volver</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 14,
    backgroundColor: SALA.fondo,
  },
  titulo: { color: SALA.neon, fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  texto: { color: SALA.palabra, fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 360 },
  cuando: { color: SALA.neonTenue, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 360 },
  salir: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 16 },
  salirTexto: { color: SALA.neonTenue, fontSize: 15 },
});
