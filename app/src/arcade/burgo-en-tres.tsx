/**
 * EL BURGO EN TRES DIMENSIONES, POR FUERA: esperar a que el 3D esté y traerlo entonces.
 *
 * Todo lo que toca `three`, la escena del anillo y los modelos vive en
 * `burgo-en-tres-escena.tsx`. Aquí sólo hay la envoltura perezosa, copiada de
 * `riberas-en-tres.tsx` y de `escena.tsx` y por el mismo motivo exacto.
 *
 * ═══ POR QUÉ ENTRA CON `React.lazy` Y NO CON UN `import` NORMAL ═══
 *
 * Porque LA PORTADA lee la Sala de Arcade para saber qué tarjetas son pulsables:
 * `vitrina.ts` → `pintados.ts` → este fichero. Con un `import` estático del lienzo
 * aquí arriba, abrir la app arrastraría `three`, `@react-three/fiber`, `GLTFLoader`
 * y las tres mil líneas de `escenas/burgo/Burgo.tsx` a la primera pantalla, antes de
 * que nadie haya tocado nada. Con `lazy`, el módulo no se toca hasta que se
 * RENDERIZA, y sólo se renderiza cuando alguien está sentado a una mesa del Burgo.
 *
 * Y por eso mismo la llamada a `lazy` va en el ÁMBITO DEL MÓDULO: `lazy` guarda la
 * función y la llama la primera vez que se pinta; creada dentro del componente se
 * crearía en cada repintado y React la trataría cada vez como un componente nuevo,
 * o sea que el burgo entero se desmontaría y volvería a cargar con cada sondeo.
 *
 * ═══ ESTO ES UN PINTOR PROPIO SOBRE UN MUEBLE GENÉRICO, Y ES LEGÍTIMO ═══
 *
 * El Burgo sigue con `mueble: 'tablero'`, su vista no cambia y el `Retablo` SVG
 * sigue siendo lo que pinta un arcade de fuera con tablero — y lo que pinta esta
 * misma pantalla si el modelo no llega. Lo que cambia es la fila de
 * `LOS_QUE_PINTA`: el mismo precedente que La Frente sobre `formulario` y que
 * Riberas sobre `tablero`, que `quienPinta` protege a propósito.
 *
 * ═══ Y AQUÍ NO HAY UNA GOTA DE ACENTO ═══
 *
 * Esta envoltura pinta una espera, y una espera no está viva ni se puede tocar,
 * que es lo único que el acento de la Sala significa. Gris frío, como las otras
 * tres. El color llega con la escena: el mediodía del burgo es suyo y no de la Sala.
 */
import { lazy, Suspense } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LETRA, SALA } from './muebles';

/*
 * En el ámbito del módulo y no dentro del componente. Ver la cabecera: creado
 * dentro, cada sondeo desmontaría la escena y la volvería a bajar entera.
 */
const LaPantalla = lazy(() => import('./burgo-en-tres-escena'));

/** Lo que se enseña mientras el lienzo no está. Dice qué falta, no «cargando». */
function Esperando(): JSX.Element {
  return (
    <View style={estilos.centro}>
      <Text style={estilos.rotulo}>EL BURGO</Text>
      <Text style={estilos.texto}>Preparando el burgo…</Text>
    </View>
  );
}

export function ElBurgoEnTres(): JSX.Element {
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
