/**
 * EL MUEBLE `escena`, POR FUERA: esperar a que el 3D esté y traerlo entonces.
 *
 * Todo lo que toca `three` vive en `escena-peonza.tsx`. Aquí sólo hay la envoltura
 * perezosa, y está por el mismo motivo exacto que la de `arcade.tsx`, que es el
 * fichero del que está copiada.
 *
 * ═══ POR QUÉ ENTRA CON `React.lazy` Y NO CON UN `import` NORMAL ═══
 *
 * Porque LA PORTADA lee la Sala de Arcade para saber qué tarjetas son pulsables:
 * `vitrina.ts` → `pintados.ts` → este fichero. Un `import` estático del lienzo 3D
 * aquí arriba se ejecutaría al abrir la app, antes de que nadie haya tocado nada,
 * y arrastraría `three` y `@react-three/fiber` —y en nativo, `expo-gl`— a la
 * primera pantalla.
 *
 * Eso ya costó una vez con Skia: el paquete de Skia en web hace
 * `JsiSkApi(global.CanvasKit)` AL CARGARSE el módulo, o sea que importarlo antes
 * de tiempo no fallaba al pintar, fallaba en la línea del `import`, y dejaba la
 * portada entera en blanco. `verify:canvaskit` vigila esa cadena desde entonces.
 * Con el 3D el fallo no sería el mismo, pero el coste sí: unos megabytes de
 * JavaScript evaluados en el arranque para una pantalla a la que casi nadie va.
 *
 * Con `lazy`, el módulo no se toca hasta que se RENDERIZA, y sólo se renderiza
 * cuando alguien abre este mueble.
 *
 * ═══ Y POR QUÉ ESTO NO ES «UNA PANTALLA POR JUEGO» ═══
 *
 * Lo es, y a propósito. `escena` es un mueble PROPIO en el §7: el juego pinta sus
 * píxeles, está en el binario y cuesta publicación. Lo que la fase 5 abrió para
 * los arcades de FUERA son los muebles genéricos —`formulario` y `tablero`—, y la
 * frase del diseño no admite lectura amable: **el enchufe alcanza a las reglas, no
 * a los píxeles**. Un arcade de fuera que declare `escena` sale en la Sala con la
 * tarjeta apagada, y eso no es un fallo que arreglar: es lo que se decidió, y lo
 * que se ahorra es escribir un intérprete de escenas que saldría a medida del
 * primer juego que lo usara.
 *
 * ═══ Y POR QUÉ AQUÍ NO HAY UNA SOLA GOTA DE ACENTO ═══
 *
 * Esta envoltura pinta EXACTAMENTE una pantalla —la espera— y una espera no está
 * viva ni se puede tocar, que es la única cosa que el acento de la Sala significa.
 * Ponerle aquí la placa de color del nombre haría lo que el diseño prohíbe: repartir
 * el acento en sitios que no lo ganan, hasta que en la ficha deje de gritar. Todo lo
 * de este fichero es gris frío a propósito, y eso no es una pantalla a medio pintar.
 *
 * El color entra —si entra— con el juego: `escena-peonza.tsx` es quien pinta, y sus
 * píxeles son suyos.
 */
import { lazy, Suspense } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LETRA, SALA } from './muebles';

/**
 * El juego, traído sólo cuando hace falta.
 *
 * Se crea en el ámbito del módulo, y crearlo NO importa nada: `lazy` guarda la
 * función y la llama la primera vez que el componente se renderiza. Dentro del
 * componente se volvería a crear en cada renderizado, y React trataría cada uno
 * como un componente distinto: la peonza se desmontaría y se volvería a montar
 * treinta veces por segundo.
 */
const ElJuego = lazy(() => import('./escena-peonza'));

/** Lo que se enseña mientras el lienzo no está. Dice qué falta, no «cargando». */
function Esperando(): JSX.Element {
  return (
    <View style={estilos.centro}>
      <Text style={estilos.rotulo}>LA PEONZA</Text>
      <Text style={estilos.texto}>Preparando el lienzo de tres dimensiones…</Text>
    </View>
  );
}

export function LaPeonza(): JSX.Element {
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
    /*
     * El aire lateral es de legibilidad y no de gusto: sin él, la frase de espera
     * llega a tocar los dos bordes en un móvil estrecho y se parte donde le da la
     * gana. Aquí no hay ficha ni panel, así que el texto se apoya en el suelo
     * directamente y el margen lo tiene que poner la pantalla.
     */
    paddingHorizontal: 24,
    /* Es la pantalla entera, no una superficie dentro de otra: suelo, no teja. */
    backgroundColor: SALA.suelo,
  },
  /*
   * El nombre de la máquina hace aquí de rótulo pequeño y no de titular: lo que se
   * lee es la frase de abajo. Por eso va en `tenue` —el gris que acompaña— y no en
   * `palabra`, y por eso la caja alta y el tracking los pone `LETRA` en vez de
   * escribirse a mano: sin familia propia, el peso y el tracking son TODA la voz
   * del rótulo, y repartirla entre la tabla y este fichero es como se pierde.
   */
  rotulo: { color: SALA.tenue, fontSize: 13, ...LETRA.rotuloChico },
  /* La frase que sí se lee, al tamaño en que se lee de cerca. */
  texto: { color: SALA.palabra, fontSize: 16, lineHeight: 24, textAlign: 'center', ...LETRA.cuerpo },
});
