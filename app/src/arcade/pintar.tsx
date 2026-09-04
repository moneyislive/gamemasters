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
import { manifiestoDeArcadeSiExiste } from '../../../shared/arcade';
import type { MuebleDeArcade } from '../../../shared/arcade';
/*
 * ESTA IMPORTACIÓN INSTALA. Es el mismo trato que `shared/juegos/index.ts` da a
 * las veladas: quien quiera la Sala llena importa esto y no hay una lista escrita
 * a mano en otro sitio que se quede vieja. Sin ella, entrar a un arcade por un
 * enlace directo —sin pasar antes por la portada, que es quien la importaba—
 * encontraría el registro vacío.
 */
import '../../../shared/arcade/juegos';
import { LETRA, MUEBLES, SALA } from './muebles';
import { quienPinta, quienPintaElMueble } from './pintados';

/** Pinta el arcade que pida la ruta, si este mueble es el suyo y se sabe pintar. */
export function PintarEnElMueble({ mueble }: { mueble: MuebleDeArcade }): JSX.Element {
  const { arcade } = useLocalSearchParams<{ arcade?: string }>();
  const id = typeof arcade === 'string' ? arcade : '';

  /*
   * ═══ AQUÍ HABÍA UN `arcadeInstalado(id)` QUE CERRABA LA PUERTA ANTES DE MIRAR ═══
   *
   * Y con él, todo lo que la fase 5 añadió para los arcades de fuera quedaba
   * inalcanzable. El registro de ESTA app se llena importando
   * `shared/arcade/juegos`, o sea los cinco que trae el binario: un arcade
   * instalado sólo en el servidor NUNCA está instalado aquí. Medido en pantalla,
   * con el servidor levantado con `ARCADES_EXTERNOS` y entrando por enlace directo
   * a `/tablero?arcade=el-vado`: «No hay ningún arcade llamado «el-vado» instalado
   * en esta app», y ni `LOS_MUEBLES_GENERICOS` ni `ElTableroEnLinea` llegaban a
   * ejecutarse. La tabla que la fase añadió existía y no la recorría ningún camino.
   *
   * Lo que se decide ahora es lo único que se puede decidir sin manifiesto: si el
   * mueble de ESTA RUTA es genérico. Si lo es, se pinta — un mueble genérico no
   * necesita saber a qué se juega, que es su definición. Si no lo es, se dice, y el
   * mensaje sigue diciendo exactamente qué pasa.
   *
   * La comprobación del ID VACÍO se queda porque es otra cosa: una ruta sin
   * `?arcade=` no es un arcade desconocido, es una dirección incompleta.
   */
  if (id.length === 0) {
    return <NoHayNada que="Esta dirección no dice a qué arcade quiere entrar." />;
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

  /*
   * ═══ QUIÉN PINTA: SU COMPONENTE, O EL DE SU MUEBLE SI ES GENÉRICO ═══
   *
   * Esto se resolvía con la tabla por juego a secas —una entrada por juego— y ésa era
   * la deuda que la fase 5 vino a pagar: un arcade de tablero instalado en el
   * servidor pero desconocido para este binario no se podía pintar aunque su
   * mueble fuera genérico y su proyección trajera el dibujo entero resuelto. La
   * pregunta la contesta `quienPinta` en `pintados.ts`, que es también la que
   * contesta la Sala — una sola respuesta, como manda la cabecera de aquel
   * fichero.
   */
  const Pintar =
    manifiesto === undefined ? quienPintaElMueble(mueble) : quienPinta(manifiesto);
  if (Pintar === undefined) {
    /*
     * El juego está instalado y su mueble es éste, y aun así este binario no sabe
     * pintarlo. Pasa de verdad y no es un caso teórico: es lo que le ocurre a un
     * arcade de FUERA que declare un mueble propio —`lienzo`, `escena`—, que es la
     * decisión de producto del §7 y no un fallo: el enchufe alcanza a las reglas y
     * no a los píxeles.
     *
     * Y también es lo que le pasa a un arcade que este binario no conoce por un
     * mueble que no es genérico: sin manifiesto no hay componente propio posible, y
     * sin mueble genérico no hay nada que poner en su lugar. El mensaje distingue
     * los dos casos porque el arreglo es distinto — uno se arregla publicando una
     * versión de la app, y el otro comprobando que la dirección sea la buena.
     *
     * Lo que NO puede pasar es llegar aquí DESDE LA SALA: la tarjeta de un arcade
     * que no se sabe pintar no es pulsable, y las dos decisiones salen de la misma
     * función. Ver `pintados.ts`.
     */
    const ficha = MUEBLES[mueble];
    if (manifiesto === undefined) {
      return (
        <NoHayNada
          que={`Esta app no conoce ningún arcade llamado «${id}», y el mueble «${mueble}» no se puede pintar sin conocerlo. ${ficha.cuandoLlega}`}
        />
      );
    }
    return (
      <NoHayNada
        que={`«${manifiesto.nombre}» declara el mueble «${mueble}» y esta versión de la app no trae con qué pintarlo. ${ficha.cuandoLlega}`}
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

/*
 * ═══ TRES COLORES, Y EL DE EN MEDIO DECIDE QUÉ SIGNIFICA EL ACENTO ═══
 *
 * Esta pantalla no es UNA pantalla: `/formulario`, `/tablero`, `/lienzo` y
 * `/escena` montan las cuatro este mismo componente, y por él salen los cinco
 * callejones sin salida de la Sala —dirección incompleta, mueble cambiado, arcade
 * desconocido, mueble sin píxeles—. Lo que se pinte aquí es, por tanto, la cara
 * que la Sala pone SIEMPRE que algo no se puede jugar.
 *
 * Por eso el título deja de ser el color vivo. En la Sala el acento quiere decir
 * «esto está vivo o se puede tocar»; aquí no hay nada que tocar, y encenderlo en
 * los cuatro muebles a la vez le enseñaría al ojo que el color saturado de la casa
 * aparece cuando algo está roto. El acento se gastaría en el peor sitio posible.
 * Un título es un rótulo: `palabra`.
 */
const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 16,
    /* Ocupa la pantalla entera y no es un panel dentro de nada: suelo, no teja. */
    backgroundColor: SALA.suelo,
  },
  /*
   * El peso, la caja alta y el tracking salen de `LETRA` y no escritos a mano, que
   * es lo único que hace de rótulo cuando no se declara ninguna `fontFamily`. El
   * `letterSpacing: 4` de antes era el doble largo que el de cualquier rótulo de la
   * Sala: separaba tanto las letras que el nombre de la casa no se leía como una
   * palabra.
   */
  titulo: { ...LETRA.rotulo, color: SALA.palabra, fontSize: 18 },
  /*
   * El mensaje se queda en `palabra` y no baja a `tenue`. Es texto de error, sí,
   * pero es lo ÚNICO que hay aquí y lo único que dice qué ha pasado: apagarlo
   * convertiría la pantalla en el «vaya» que la cabecera de este fichero prohíbe.
   */
  texto: {
    ...LETRA.cuerpo,
    color: SALA.palabra,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 360,
  },
});
