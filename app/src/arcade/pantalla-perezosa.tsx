/**
 * UNA PANTALLA EN TRES DIMENSIONES, POR FUERA: esperar a que el 3D esté y traerlo entonces.
 *
 * ═══ ERA LA MISMA ENVOLTURA TRES VECES ═══
 *
 * `riberas-en-tres.tsx`, `burgo-en-tres.tsx` y `lindes-en-tres.tsx` eran treinta y una
 * líneas iguales salvo cuatro: qué escena se trae, qué rótulo y qué frase se leen mientras
 * llega, y cómo se llama el componente. Cada una se copió de la anterior «por el mismo
 * motivo exacto», y cada copia es un sitio más donde ese motivo se puede olvidar. Aquí está
 * una vez; cada juego se queda con su fichero de una sentencia, que es lo que importa
 * `pintados.ts`.
 *
 * ═══ POR QUÉ `React.lazy` Y NO UN `import` NORMAL ═══
 *
 * Porque LA PORTADA lee la Sala de Arcade para saber qué tarjetas son pulsables:
 * `vitrina.ts` → `pintados.ts` → la envoltura de cada juego. Con un `import` estático de la
 * escena, abrir la app arrastraría `three`, `@react-three/fiber`, `GLTFLoader` y las miles
 * de líneas de cada escena a la primera pantalla, antes de que nadie haya tocado nada. Con
 * `lazy`, el módulo de la escena no se toca hasta que se RENDERIZA, y sólo se renderiza
 * cuando alguien está sentado a una mesa de ese juego.
 *
 * ═══ EL `import()` SE QUEDA EN EL FICHERO DE CADA JUEGO, Y ES A PROPÓSITO ═══
 *
 * La fábrica recibe una FUNCIÓN que importa, no una ruta: el empaquetador sólo sabe partir
 * en trozos un `import('./…')` con la ruta escrita donde la lee, así que la ruta tiene que
 * vivir en el fichero del juego. Y por eso este fichero no importa ninguna escena, ni
 * `three`, ni r3f.
 *
 * ═══ `lazy` SE LLAMA UNA VEZ POR JUEGO, AL CARGAR SU MÓDULO ═══
 *
 * `lazy` guarda la función y la llama la primera vez que se pinta; creada DENTRO del
 * componente se crearía en cada repintado y React la trataría cada vez como un componente
 * nuevo, o sea que la escena entera se desmontaría y volvería a bajar con cada sondeo, sin
 * un error en ninguna parte. Aquí se llama en el cuerpo de la fábrica —fuera del componente
 * que devuelve— y cada envoltura llama a la fábrica en el ámbito de su módulo. `verify:sala`
 * lee las dos cosas, en las tres envolturas, y las ve caer.
 *
 * ═══ Y AQUÍ NO HAY UNA GOTA DE ACENTO ═══
 *
 * Esta envoltura pinta una espera, y una espera no está viva ni se puede tocar, que es lo
 * único que el acento de la Sala significa. Gris frío, como la del muelle y la de La
 * Peonza. El color llega con la escena: el mediodía de cada tablero es suyo y no de la Sala.
 */
import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LETRA, SALA } from './muebles';

/** Lo que se lee mientras el lienzo no está. Dice qué falta, no «cargando». */
export interface LoQueSeLeeEsperando {
  /** El nombre del juego, en mayúsculas: «RIBERAS». */
  readonly rotulo: string;
  /** La frase de la espera: «Preparando el delta en tres dimensiones…». */
  readonly texto: string;
}

/**
 * La pantalla de un juego en tres dimensiones, traída cuando se pinta por primera vez.
 *
 * `traer` es `() => import('./<juego>-en-tres-escena')`, escrito en el fichero del juego:
 * ver la cabecera. Se llama en el ámbito del módulo de cada envoltura, nunca dentro de un
 * componente.
 */
export function pantallaPerezosa(
  traer: () => Promise<{ default: ComponentType }>,
  espera: LoQueSeLeeEsperando,
): () => JSX.Element {
  const LaPantalla = lazy(traer);

  function Esperando(): JSX.Element {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.rotulo}>{espera.rotulo}</Text>
        <Text style={estilos.texto}>{espera.texto}</Text>
      </View>
    );
  }

  return function LaPantallaEnTres(): JSX.Element {
    return (
      <Suspense fallback={<Esperando />}>
        <LaPantalla />
      </Suspense>
    );
  };
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
