/**
 * LAS LINDES EN TRES DIMENSIONES, POR FUERA: esperar a que el 3D esté y traerlo entonces.
 *
 * Todo lo que toca `three`, la escena del valle y los modelos vive en
 * `lindes-en-tres-escena.tsx`. Aquí sólo hay la envoltura perezosa, copiada de
 * `burgo-en-tres.tsx` y de `riberas-en-tres.tsx` y por el mismo motivo exacto.
 *
 * ═══ POR QUÉ ENTRA CON `React.lazy` Y NO CON UN `import` NORMAL ═══
 *
 * Porque LA PORTADA lee la Sala de Arcade para saber qué tarjetas son pulsables:
 * `vitrina.ts` → `pintados.ts` → este fichero. Con un `import` estático del lienzo
 * aquí arriba, abrir la app arrastraría `three`, `@react-three/fiber`, `GLTFLoader`
 * y la escena entera a la primera pantalla, antes de que nadie haya tocado nada.
 * Con `lazy`, el módulo no se toca hasta que se RENDERIZA, y sólo se renderiza
 * cuando alguien está sentado a una mesa de Las Lindes.
 *
 * Y por eso mismo la llamada a `lazy` va en el ÁMBITO DEL MÓDULO: `lazy` guarda la
 * función y la llama la primera vez que se pinta; creada dentro del componente se
 * crearía en cada repintado y React la trataría cada vez como un componente nuevo,
 * o sea que el valle entero se desmontaría y volvería a cargar con cada sondeo.
 */
import { lazy, Suspense } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LETRA, SALA } from './muebles';

/* En el ámbito del módulo y no dentro del componente. Ver la cabecera. */
const LaPantalla = lazy(() => import('./lindes-en-tres-escena'));

/** Lo que se enseña mientras el lienzo no está. Dice qué falta, no «cargando». */
function Esperando(): JSX.Element {
  return (
    <View style={estilos.centro}>
      <Text style={estilos.rotulo}>LAS LINDES</Text>
      <Text style={estilos.texto}>Preparando el valle…</Text>
    </View>
  );
}

export function LasLindesEnTres(): JSX.Element {
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
