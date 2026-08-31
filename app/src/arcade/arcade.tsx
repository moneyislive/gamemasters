/**
 * «EL ARCADE», POR FUERA: esperar a que Skia esté y traerlo entonces.
 *
 * Todo el juego —el lienzo, el bucle, los sprites— vive en `arcade-lienzo.tsx`.
 * Aquí solo hay dieciocho líneas, y cada una está por un motivo que cuesta caro
 * descubrir a mano.
 *
 * ═══ POR QUÉ EL JUEGO ENTRA CON `React.lazy` Y NO CON UN `import` NORMAL ═══
 *
 * Porque en web `@shopify/react-native-skia` hace esto AL CARGARSE el módulo:
 *
 *     export const Skia = JsiSkApi(global.CanvasKit);
 *
 * CanvasKit es el binario de WebAssembly, y no está hasta que `LoadSkiaWeb`
 * termina de descargarlo. O sea que importar el paquete antes de tiempo no falla
 * al pintar: falla EN LA LÍNEA DEL `import`.
 *
 * Y eso alcanzaría mucho más lejos de lo que parece. La PORTADA lee la Sala de
 * Arcade para saber qué tarjetas son pulsables —`vitrina.ts` → `pintados.ts` →
 * este fichero— así que un `import` estático de Skia aquí arriba se ejecutaría al
 * abrir la app, antes de que nadie haya tocado nada, y dejaría la portada entera
 * en blanco en web. Un fallo mudo, en la primera pantalla, por una importación
 * que parece inocente.
 *
 * Con `lazy`, el módulo del juego no se toca hasta que se RENDERIZA, y solo se
 * renderiza cuando `usarCanvasKit()` dice que sí.
 *
 * ═══ POR QUÉ NO SE USA `WithSkiaWeb`, QUE HACE ESTO MISMO ═══
 *
 * Porque vive en `@shopify/react-native-skia/lib/module/web` y trae detrás el
 * cargador de Emscripten y el `.wasm`. Importarlo aquí metería todo eso en el
 * paquete de Android y de iOS para no ejecutarlo jamás — allí Skia viaja dentro
 * del binario. El reparto por plataforma lo hace `./skia.ts` y `./skia.web.ts`,
 * que es el mismo que la app ya usa para el 3D.
 */
import { lazy, Suspense } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SALA } from './muebles';
import { usarCanvasKit } from './skia';

/**
 * El juego, traído solo cuando hace falta.
 *
 * Se crea aquí, en el ámbito del módulo, y crearlo NO importa nada: `lazy` guarda
 * la función y la llama la primera vez que el componente se renderiza. Ponerlo
 * dentro del componente lo volvería a crear en cada renderizado, y React trataría
 * cada uno como un componente distinto: el juego se desmontaría y se volvería a
 * montar sesenta veces por segundo, o sea la partida reiniciándose sola.
 */
const ElJuego = lazy(() => import('./arcade-lienzo'));

/** Lo que se enseña mientras el lienzo no está. Dice qué falta, no «cargando». */
function Esperando(): JSX.Element {
  return (
    <View style={estilos.centro}>
      <Text style={estilos.rotulo}>EL ARCADE</Text>
      <Text style={estilos.texto}>Preparando el lienzo…</Text>
    </View>
  );
}

export function ElArcade(): JSX.Element {
  const listo = usarCanvasKit();
  if (!listo) return <Esperando />;
  return (
    <Suspense fallback={<Esperando />}>
      <ElJuego />
    </Suspense>
  );
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: SALA.fondo,
  },
  rotulo: { color: SALA.neonTenue, fontSize: 13, fontWeight: '800', letterSpacing: 4 },
  texto: { color: SALA.palabra, fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
