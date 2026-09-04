/**
 * RIBERAS EN TRES DIMENSIONES, POR FUERA: esperar a que el 3D esté y traerlo entonces.
 *
 * Todo lo que toca `three`, la escena del delta y el cargador de modelos vive en
 * `riberas-en-tres-escena.tsx`. Aquí sólo hay la envoltura perezosa, copiada de
 * `escena.tsx` y de `muelle.tsx` y por el mismo motivo exacto.
 *
 * ═══ POR QUÉ ENTRA CON `React.lazy` Y NO CON UN `import` NORMAL ═══
 *
 * Porque LA PORTADA lee la Sala de Arcade para saber qué tarjetas son pulsables:
 * `vitrina.ts` → `pintados.ts` → este fichero. Con un `import` estático del lienzo
 * aquí arriba, abrir la app arrastraría `three`, `@react-three/fiber`, `GLTFLoader`
 * y las dos mil líneas de `escenas/delta.tsx` a la primera pantalla, antes de que
 * nadie haya tocado nada. Con `lazy`, el módulo no se toca hasta que se RENDERIZA,
 * y sólo se renderiza cuando alguien está sentado a una mesa de Riberas.
 *
 * ═══ ESTO ES UN PINTOR PROPIO SOBRE UN MUEBLE GENÉRICO, Y ES LEGÍTIMO ═══
 *
 * Riberas sigue con `mueble: 'tablero'` (cuarta decisión de `docs/EL-MUELLE.md`),
 * su vista no cambia y el `Retablo` SVG sigue siendo lo que pinta un arcade de
 * fuera con tablero — y lo que pinta esta misma pantalla si el modelo no llega.
 * Lo que cambia es la fila de `LOS_QUE_PINTA`: el mismo precedente que La Frente
 * sobre `formulario`, que `quienPinta` protege a propósito.
 *
 * ═══ Y AQUÍ NO HAY UNA GOTA DE ACENTO ═══
 *
 * Esta envoltura pinta una espera, y una espera no está viva ni se puede tocar,
 * que es lo único que el acento de la Sala significa. Gris frío, como las otras
 * dos. El color llega con la escena: el mediodía del delta es suyo y no de la Sala.
 */
import { lazy, Suspense } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LETRA, SALA } from './muebles';

/*
 * En el ámbito del módulo y no dentro del componente: `lazy` guarda la función y
 * la llama la primera vez que se renderiza; creado dentro se crearía en cada
 * repintado y React lo trataría cada vez como un componente nuevo, o sea que el
 * delta entero se desmontaría y volvería a cargar con cada sondeo.
 */
const LaPantalla = lazy(() => import('./riberas-en-tres-escena'));

/** Lo que se enseña mientras el lienzo no está. Dice qué falta, no «cargando». */
function Esperando(): JSX.Element {
  return (
    <View style={estilos.centro}>
      <Text style={estilos.rotulo}>RIBERAS</Text>
      <Text style={estilos.texto}>Preparando el delta en tres dimensiones…</Text>
    </View>
  );
}

export function ElTableroEnTres(): JSX.Element {
  return (
    <Suspense fallback={<Esperando />}>
      <LaPantalla />
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
