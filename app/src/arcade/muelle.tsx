/**
 * EL MUELLE, POR FUERA: esperar a que el 3D esté y traerlo entonces.
 *
 * Todo lo que toca `three` y la escena del embarcadero vive en
 * `muelle-escena.tsx`. Aquí sólo hay la envoltura perezosa, copiada de
 * `escena.tsx` y por el mismo motivo exacto.
 *
 * ═══ POR QUÉ ENTRA CON `React.lazy` Y NO CON UN `import` NORMAL ═══
 *
 * Porque `rutaDeArcade` —que ahora sabe del Muelle— la importa `vitrina.ts`, y a
 * `vitrina.ts` la lee LA PORTADA para saber qué tarjetas son pulsables. Con un
 * `import` estático de la escena aquí arriba, abrir la app arrastraría `three`,
 * `@react-three/fiber`, `GLTFLoader` y `SkeletonUtils` a la primera pantalla,
 * antes de que nadie haya tocado nada. Con `lazy`, el módulo no se toca hasta que
 * se RENDERIZA, y sólo se renderiza cuando alguien llega a `/muelle`.
 *
 * `muebles.ts` importa `tema.ts` de `escenas/embarcadero/`, y eso NO contradice
 * lo de arriba: `tema.ts` es una tabla de cadenas sin un solo `import`. Lo caro
 * es la escena, y la escena está detrás de esta puerta.
 *
 * ═══ Y AQUÍ NO HAY UNA GOTA DE ACENTO ═══
 *
 * Esta envoltura pinta una espera, y una espera no está viva ni se puede tocar,
 * que es lo único que el acento de la Sala significa. Gris frío, como la de La
 * Peonza. El color llega con la escena: el horizonte de brasa del embarcadero es
 * suyo y no de la Sala.
 */
import { lazy, Suspense } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LETRA, SALA } from './muebles';

/*
 * En el ámbito del módulo y no dentro del componente: `lazy` guarda la función y
 * la llama la primera vez que se renderiza; creado dentro se crearía en cada
 * repintado y React lo trataría cada vez como un componente nuevo, o sea que el
 * embarcadero entero se desmontaría y volvería a cargar con cada sondeo.
 */
const LaEscena = lazy(() => import('./muelle-escena'));

/** Lo que se enseña mientras el lienzo no está. Dice qué falta, no «cargando». */
function Esperando(): JSX.Element {
  return (
    <View style={estilos.centro}>
      <Text style={estilos.rotulo}>EL MUELLE</Text>
      <Text style={estilos.texto}>Preparando el embarcadero…</Text>
    </View>
  );
}

export function ElMuelle(): JSX.Element {
  return (
    <Suspense fallback={<Esperando />}>
      <LaEscena />
    </Suspense>
  );
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
    /* Es la pantalla entera, no una superficie dentro de otra: suelo, no teja. */
    backgroundColor: SALA.suelo,
  },
  rotulo: { color: SALA.tenue, fontSize: 13, ...LETRA.rotuloChico },
  texto: { color: SALA.palabra, fontSize: 16, lineHeight: 24, textAlign: 'center', ...LETRA.cuerpo },
});
