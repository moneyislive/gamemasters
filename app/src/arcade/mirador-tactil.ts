/**
 * EL GESTO QUE MUEVE EL OJO SOBRE EL TABLERO: del dedo al `Mirador` y a la `Cercania`.
 *
 * ═══ QUÉ HAY AQUÍ Y QUÉ NO ═══
 *
 * La aritmética de la cámara —cuánto gira un arrastre, hasta dónde se inclina, dónde
 * cae el ojo, cuánto acerca un pellizco y hasta dónde se puede apartar la mirada—
 * vive en `escenas/camara.ts` y en `escenas/acercar.ts`, sin `three` y medibles desde
 * Node. Aquí sólo está lo que la app pone encima y el escritorio no: el DEDO. El
 * banco de pruebas escucha `pointerdown` en la ventana; en el móvil no hay ventana,
 * hay un `Canvas` sobre `expo-gl` y un sistema de gestos, y la traducción entre los
 * dos es este fichero.
 *
 * ═══ AQUÍ HUBO UN NÚMERO SUELTO, Y POR ESO SÓLO SE PODÍA MIRAR EL CENTRO ═══
 *
 * El acercamiento era un `number` entre 0,55 y 1,25 con sus dos topes escritos en
 * este mismo fichero, y multiplicaba la distancia del ojo AL CENTRO DEL DELTA. O sea
 * que acercarse era siempre acercarse a lo mismo: el borde de la comarca del canto no
 * se podía mirar de cerca de ninguna manera, por muy fuerte que se pellizcara. Y los
 * topes eran cortos —«la pinza es para ver mejor un cruce, no para perderse»— porque
 * con el punto de mira clavado en el centro acercarse más sólo servía para ver un
 * hexágono gigante en medio de la pantalla.
 *
 * Ahora lo que se guarda es una `Cercania` de `escenas/acercar.ts`: CUÁNTO se acerca
 * y ADÓNDE se mira, juntos. Los topes, la acotación al tablero, el sentido del
 * arrastre y la altura mínima del ojo son suyos y están medidos por `verify:escena`.
 * Aquí no se escribe ni una cuenta: cada valor nuevo de `cercania.current` sale de
 * llamar a una función de aquel fichero, y `verify:sala` lo vigila.
 *
 * ═══ EL PROBLEMA DEL PRIMER GESTO, Y POR QUÉ LA ACTIVACIÓN ES MANUAL ═══
 *
 * Pulsar y mover es a la vez «girar el tablero» y «llevar esta carta a su área» o
 * «arrastrar el poblado hasta el anillo». En la web lo resuelve `esDeLaInterfaz`:
 * la escena marca el suceso del ratón y la cámara, que escucha después, lo respeta.
 * En el móvil los dos oyentes no ven el mismo objeto —la escena ve el toque que le
 * da el sistema de respuesta de React Native y el gesto ve el que le da
 * `react-native-gesture-handler`— así que el `WeakSet` no puede casarlos.
 *
 * Lo que sí es igual en las dos plataformas es EL ORDEN: la escena recibe el
 * `pointerdown` de una carta ANTES de que el dedo se haya movido, y el gesto no
 * decide nada hasta el primer movimiento. Así que la pantalla, que es quien recibe
 * `onCogerCarta` y `onTomarDeLaBarra`, avisa aquí de que la escena se ha quedado el
 * dedo, y el giro —con la activación en manual— se FALLA a sí mismo en cuanto ve
 * moverse un dedo que no es suyo. Sin activación manual, `Pan` se activaría solo a
 * los diez puntos y le robaría la carta a la escena a mitad de arrastre: en Android
 * eso llega como una cancelación del toque y la carta vuelve sola a la mano.
 *
 * ═══ POR QUÉ LAS RESPUESTAS DEL GIRO SON WORKLETS Y NO PUEDEN SER JS ═══
 *
 * La primera versión llevaba `.runOnJS(true)` en el `Pan`, copiado de `entrada.ts`,
 * y decidía `estado.activate()` / `estado.fail()` desde `onTouchesMove`. Y la
 * cámara NO GIRABA NUNCA en iOS ni en Android, que es la única plataforma para la
 * que existe este fichero. El motivo está escrito en las dependencias, no aquí:
 * con `runOnJS(true)` la respuesta corre en el hilo de JavaScript, y ahí el
 * `GestureStateManager` de `react-native-gesture-handler` (2.32) delega en
 * `setGestureState` de `react-native-reanimated` (4.5), que en nativo comprueba en
 * qué runtime está, avisa «You can not use setGestureState in non-worklet
 * function» y NO HACE NADA. El `Pan` se queda en `BEGAN` para siempre: ni
 * `onStart` ni `onUpdate` llegan jamás. Cambiar el estado de un gesto a mano SÓLO
 * se puede desde el hilo de interfaz, o sea desde un worklet.
 *
 * Así que el giro se escribe entero como worklets —sin `runOnJS(true)`—, y lo
 * que necesita recordar entre toques («desde dónde bajó el dedo», «¿se lo quedó la
 * escena?», «la última traslación») vive en `useSharedValue`, que es lo único que
 * los dos hilos leen y escriben. La pantalla marca `deLaInterfaz.value = true`
 * desde JavaScript en `laInterfazSeLoQueda`: asignar a un valor compartido vale
 * desde cualquier hilo, y el worklet de `onTouchesMove` lo ve en el siguiente
 * toque. El único salto de vuelta a JavaScript es `runOnJS(mover)(dx, dy)` en
 * `onUpdate`, para tocar `mirador.current`, que lee la escena en su bucle.
 *
 * `entrada.ts` sí puede llevar `runOnJS(true)`: no activa nada a mano, sólo
 * escucha `onEnd`. La diferencia es exactamente `manualActivation(true)`, y
 * `verify:sala` la vigila: ningún gesto con activación manual puede correr en JS.
 *
 * ═══ Y LOS DE DOS DEDOS SÍ CORREN EN JAVASCRIPT, POR LA MISMA REGLA ═══
 *
 * El pellizco y el paseo no tienen activación manual, no tocan el estado de ningún
 * gesto y sólo escriben referencias de React desde `onUpdate`. Es el mismo caso que
 * `entrada.ts` y que la pinza de antes, que funcionaba; no se cambia lo que
 * funciona. Y además les hace falta: el paseo necesita el RUMBO del mirador para
 * saber cuál es la derecha de quien mira, y eso vive en una referencia de React que
 * un worklet no ve.
 *
 * ═══ SON DOS GESTOS Y NO UNO, AUNQUE PARA LA MANO SEAN EL MISMO ═══
 *
 * Quien pone dos dedos en el tablero separa y arrastra a la vez sin distinguirlo, y
 * así se siente. Pero `react-native-gesture-handler` no da un gesto que entregue las
 * dos cosas: `Pinch` da la escala y ninguna traslación, y `Pan` da la traslación del
 * centroide y ninguna escala. Escribir uno de los dos a mano desde `onTouchesMove`
 * sería volver a poner aritmética de cámara en el cliente, que es justo lo que este
 * fichero acaba de dejar de hacer.
 *
 * Así que son un `Pinch` y un `Pan` con `minPointers(2)` dentro del mismo
 * `Gesture.Simultaneous`: los dos reciben el mismo par de dedos a la vez, uno mira la
 * separación y el otro el desplazamiento, y la mano no se entera de que eran dos. En
 * `Exclusive` habría que elegir, y elegir aquí significa que acercarse un poco torcido
 * deja de mover la mirada —o al revés— sin que nadie sepa por qué.
 *
 * ═══ Y POR QUÉ TODO VA POR REFERENCIAS Y NADA POR ESTADO, MENOS UNA COSA ═══
 *
 * Son sesenta cambios por segundo mientras se arrastra. Pasarlos por React
 * repintaría la pantalla entera —barra, turno, crónica— sesenta veces por segundo
 * para mover una cámara. La escena lee el `Mirador` y la `Cercania` en su propio
 * bucle de dibujo, que es donde se consumen.
 *
 * La excepción es `seHaMovido`, y tiene que serlo: el botón de volver al tablero
 * entero lo pinta React, así que React tiene que enterarse de que hace falta. Lo que
 * se hace es no contárselo sesenta veces: se guarda aparte lo último que se le dijo y
 * sólo se le avisa EN EL CAMBIO —al salir de la vista de salida y al volver a ella—,
 * que son dos repintados por viaje y no dos por fotograma.
 *
 * ═══ Y AQUÍ TAMBIÉN ESTÁ EL RATÓN, PORQUE HOY ES LA ÚNICA MANO QUE TOCA ESTO ═══
 *
 * Este fichero se escribió para el dedo, y durante un tiempo entero fue mentira que
 * sirviera: la pantalla de Riberas sólo monta el delta donde `EL_DELTA_SE_VE_AQUI` es
 * cierto, y eso es HOY la web y sólo la web —el `.glb` saldría gris en nativo—. O sea
 * que quien abría Riberas lo abría en un navegador de escritorio, con un ratón o con
 * un panel táctil, y ninguna de las dos cosas da dos punteros: el pellizco es un
 * `Pinch` y el paseo un `Pan().minPointers(2)`, los dos exigen dos dedos DE VERDAD, y
 * un panel táctil manda `wheel` con `ctrlKey` en vez de un segundo puntero. Resultado:
 * el tablero giraba y nada más. No se podía acercar, no se podía llevar la mirada a un
 * borde, y el botón «Ver el tablero entero» no aparecía JAMÁS porque nada movía la
 * cercanía. El acercamiento entero —tres piezas, su aritmética medida y su salida— no
 * llegaba a nadie.
 *
 * Así que en la web se escucha además la RUEDA y el arrastre con el botón secundario o
 * con Mayúsculas, que es exactamente lo que ya hacía el escritorio en
 * `escritorio/src/riberas-en-tres.tsx`. No hay aritmética nueva: la rueda entra por
 * `acercando` y el arrastre por `arrastrandoLaMirada`, las dos de `acercar.ts`.
 *
 * Va en un efecto sobre el NODO del lienzo y no en un `onWheel` del `View`: en React
 * Native Web esa propiedad no llega de forma fiable al elemento, y además el oyente
 * tiene que apuntarse con `{ passive: false }` para poder llamar a `preventDefault` —
 * sin eso el navegador da por hecho que una rueda encima de algo es para desplazar la
 * página, y la Sala entera se va hacia abajo mientras uno cree estar acercándose—. El
 * nodo llega por estado y no por `ref` a secas a propósito: el lienzo NO existe en el
 * primer montaje (se pinta cuando el `.glb` ha llegado), así que un efecto que sólo
 * mirara `ref.current` una vez no vería nunca el nodo que tiene que escuchar.
 *
 * ═══ EL PASEO CON RATÓN NO SE PELEA CON EL GIRO, Y ESO SON DOS CANDADOS ═══
 *
 * Un arrastre con el botón secundario es UN puntero, o sea que el `Pan` del giro
 * también lo ve y querría girar el tablero a la vez que la mirada se mueve. Se le
 * avisa con `elRatonPasea`, un valor compartido que el worklet mira antes que nada.
 *
 * Y tiene que ser un valor APARTE de `deLaInterfaz`, no el mismo: en la web
 * `GestureDetector` envuelve a su hijo en un `div` con `display: contents` y apunta
 * SUS oyentes ahí, o sea en el padre de este lienzo. El suceso sube del lienzo al
 * envoltorio, así que el gesto lo ve DESPUÉS que este efecto, y su `onTouchesDown`
 * —que limpia `deLaInterfaz` para que un dedo nuevo empiece sin marcas rezagadas—
 * borraría la marca justo después de ponerla. `elRatonPasea` no lo limpia nadie más
 * que el propio ratón al soltar.
 *
 * Y al revés: si la escena se quedó el puntero al bajar —una carta de la mano, una
 * pieza de la barra: Mayúsculas más botón primario sigue siendo el botón primario, que
 * es el único que abre las puertas de juego de `delta.tsx`— el paseo se abandona al
 * primer movimiento mirando `deLaInterfaz`. Se mira AL MOVER y no al bajar porque el
 * aviso de la escena llega dentro del mismo suceso, y el orden de los dos oyentes no
 * se puede dar por supuesto; para cuando llega el primer movimiento, ya está puesto.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Platform } from 'react-native';
import type { View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import type { ComposedGesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import {
  acercando,
  arrastrandoLaMirada,
  CERCANIA_DE_SALIDA,
  comoAlPrincipio,
  estaComoAlPrincipio,
  pellizcando,
} from '../../../escenas/acercar';
import type { Cercania } from '../../../escenas/acercar';
import {
  MINIMO_PARA_GIRAR,
  MIRADOR_DE_SALIDA,
  tirandoDelMirador,
} from '../../../escenas/camara';
import type { Mirador } from '../../../escenas/camara';

/**
 * DÓNDE CUENTA EL RATÓN. En nativo no hay ni rueda ni botón secundario, y el `window`
 * de Hermes es el objeto global de JavaScript y no una ventana: no tiene oyentes que
 * apuntar. Así que allí el efecto entero no llega a montarse.
 */
const EL_RATON_CUENTA_AQUI = Platform.OS === 'web';

/**
 * DE LAS UNIDADES DE LA RUEDA A LOS PASOS DE `acercar.ts`.
 *
 * Es lo único que este fichero calcula, y no es una cuenta de cámara —el tamaño de un
 * paso lo decide `PASO_DE_ACERCAMIENTO` allí, no esto—: es traducir un suceso del
 * navegador, que no llega en ninguna unidad. Un ratón de muesca suelta cien píxeles de
 * golpe; un panel táctil suelta cuatro sesenta veces por segundo; y Firefox manda TRES
 * LÍNEAS con `deltaMode` en 1, que sin traducir serían tres píxeles y el zoom no se
 * movería. Sin igualar los tres modos, el mismo gesto acerca un dedo en un aparato y
 * cruza el tablero entero en otro, y eso no se lee como una conversión mal hecha sino
 * como un zoom roto.
 *
 * El tope de golpe es por el panel táctil con inercia: un empujón de dos dedos manda
 * una ráfaga larguísima y sin tope salta del aire al suelo de una vez.
 *
 * ═══ Y LOS CUATRO NÚMEROS SON LOS DEL ESCRITORIO, A PROPÓSITO ═══
 *
 * Están escritos igual en `escritorio/src/riberas-en-tres.tsx`. Es una copia y se dice:
 * el sitio donde no estarían copiados es `escenas/acercar.ts`, que está congelado, y la
 * alternativa —ponerlos distintos aquí— es peor de lo que parece, porque son los dos
 * clientes de LA MISMA partida en LA MISMA máquina: la rueda acercaría a dos velocidades
 * según la ventana que se mirase. Si un día se tocan, se tocan en los dos sitios.
 */
const PIXELES_POR_MUESCA = 100;
const PIXELES_POR_LINEA = 16;
const PIXELES_POR_PAGINA = 400;
const MUESCAS_DE_GOLPE = 4;

function pasosDeLaRueda(e: WheelEvent): number {
  const enPixeles =
    e.deltaMode === 1
      ? e.deltaY * PIXELES_POR_LINEA
      : e.deltaMode === 2
        ? e.deltaY * PIXELES_POR_PAGINA
        : e.deltaY;
  const muescas = enPixeles / PIXELES_POR_MUESCA;
  /* Rueda hacia arriba, más cerca: es lo que hace cualquier mapa, y de ahí el signo. */
  return -Math.min(MUESCAS_DE_GOLPE, Math.max(-MUESCAS_DE_GOLPE, muescas));
}

export interface MiradorTactil {
  /** Para envolver el lienzo con `GestureDetector`. */
  readonly gesto: ComposedGesture;
  /**
   * EL `ref` DEL LIENZO, que en la web es por donde entran la rueda y el ratón.
   *
   * Es un `ref` de función y no un `RefObject` porque lo que hay detrás es estado: el
   * lienzo aparece cuando el modelo llega, o sea después del primer montaje, y el
   * efecto que apunta los oyentes tiene que volver a correr entonces. En nativo se
   * guarda el nodo y no se hace nada más con él.
   */
  readonly apuntarElLienzo: (nodo: View | null) => void;
  /** Dónde está puesto el ojo. Lo lee la escena cada fotograma; nunca pasa por React. */
  readonly mirador: MutableRefObject<Mirador>;
  /** Cuánto se acerca y adónde se mira. Igual: la escena la lee, React no la ve cambiar. */
  readonly cercania: MutableRefObject<Cercania>;
  /**
   * ¿Se ha movido de la vista de salida? Lo único que sí es estado, porque lo
   * único que pinta React: el botón de volver. Cambia dos veces por viaje, no
   * sesenta por segundo.
   */
  readonly seHaMovido: boolean;
  /**
   * LA SALIDA. Devuelve la cercanía a `comoAlPrincipio()` —el delta entero, mirando
   * a su centro— y deja el mirador donde esté: quien había girado el tablero para
   * ver el fondo no quiere además perder el ángulo. Un acercamiento sin una forma
   * visible de deshacerlo es una trampa, no una función.
   */
  readonly verElTableroEntero: () => void;
  /**
   * Lo llama la pantalla en cuanto la escena se queda el dedo —una carta cogida,
   * una pieza tomada de la barra—, dentro del mismo aviso y antes de tocar el
   * estado. A partir de ahí, y hasta que el dedo se levante, la cámara no se mueve.
   */
  readonly laInterfazSeLoQueda: () => void;
}

/**
 * El gesto del tablero: un dedo gira, dos dedos acercan y pasean la mirada.
 *
 * `medida` es el tamaño del lienzo en puntos y `alcance` el radio del delta en
 * unidades de mundo. Los dos van por referencia y NO en las dependencias del
 * `useMemo`: el gesto se crea UNA vez, y si se recreara con cada medida —o con cada
 * partida que reparte un delta de otro tamaño— un giro de pantalla a mitad de
 * arrastre soltaría el gesto en marcha.
 */
export function usarMiradorTactil(
  medida: { ancho: number; alto: number },
  alcance: number,
): MiradorTactil {
  const mirador = useRef<Mirador>(MIRADOR_DE_SALIDA);
  const cercania = useRef<Cercania>(CERCANIA_DE_SALIDA);
  const pantalla = useRef(medida);
  pantalla.current = medida;
  const cuantoMundo = useRef(alcance);
  cuantoMundo.current = alcance;

  /*
   * Lo que el giro recuerda entre toques, en valores compartidos porque lo
   * escriben worklets del hilo de interfaz (ver la cabecera): desde dónde bajó el
   * dedo, para la zona muerta; si la escena ya se lo quedó; y la última traslación
   * entregada, para pasar de acumulado a incremento.
   */
  const desde = useSharedValue<{ x: number; y: number } | null>(null);
  const deLaInterfaz = useSharedValue(false);
  const previo = useSharedValue({ x: 0, y: 0 });

  /*
   * Y el candado del ratón: mientras un botón secundario (o unas Mayúsculas) están
   * paseando la mirada, el giro de un puntero se falla a sí mismo. Aparte de
   * `deLaInterfaz` por lo que dice la cabecera: aquél se limpia en cada `onTouchesDown`
   * y éste no puede depender de quién apuntó antes al nodo. En nativo no se toca nunca.
   */
  const elRatonPasea = useSharedValue(false);

  /* El nodo del lienzo, por estado: llega tarde —cuando el modelo ha bajado— y hay que enterarse. */
  const [elLienzo, apuntarElLienzo] = useState<View | null>(null);

  /*
   * Y lo que recuerdan los de dos dedos, que corren en JavaScript y por eso les
   * bastan referencias normales: el factor con el que empezó el pellizco —el
   * `scale` que da el sistema es acumulado desde que bajaron los dedos— y la última
   * traslación del paseo, por lo mismo que en el giro.
   */
  const factorAlEmpezar = useRef(CERCANIA_DE_SALIDA.factor);
  const previoDeDos = useRef({ x: 0, y: 0 });

  /*
   * EL AVISO A REACT, UNA VEZ POR CAMBIO Y NO UNA POR FOTOGRAMA.
   *
   * `useState` con el mismo valor se salta el repintado de los hijos, pero puede
   * volver a pintar ESTE componente antes de rendirse, y este componente es la mesa
   * entera. Con el pellizco en marcha eso son sesenta repintados por segundo de la
   * barra, el turno y la crónica para no cambiar nada. Así que lo último que se le
   * dijo se guarda aquí al lado y sólo se le habla cuando de verdad cambia.
   */
  const [seHaMovido, ponerSeHaMovido] = useState(false);
  const seLeDijo = useRef(false);
  const avisarSiCambia = useCallback(() => {
    const ahora = !estaComoAlPrincipio(cercania.current);
    if (ahora === seLeDijo.current) return;
    seLeDijo.current = ahora;
    ponerSeHaMovido(ahora);
  }, []);

  /*
   * El destino de `runOnJS` tiene que ser LA MISMA función siempre —el gesto se crea
   * una vez— y aun así ver la medida de ahora: por eso lee `pantalla.current` y no
   * cierra sobre `medida`. Es el mismo patrón que `avisar` en `bucle.ts`.
   */
  const mover = useCallback((dx: number, dy: number): void => {
    mirador.current = tirandoDelMirador(mirador.current, dx, dy, pantalla.current);
  }, []);

  const gesto = useMemo(() => {
    const giro = Gesture.Pan()
      /* Con dos dedos mandan el pellizco y el paseo; el giro de un dedo se suelta solo. */
      .maxPointers(1)
      .manualActivation(true)
      .onTouchesDown((e) => {
        'worklet';
        const t = e.allTouches[0];
        if (t === undefined) return;
        desde.value = { x: t.x, y: t.y };
        /*
         * Un dedo nuevo empieza limpio. La escena marca lo suyo desde JavaScript, y
         * un toque sin movimiento puede acabar en el hilo de interfaz ANTES de que
         * esa marca llegue: si sólo se limpiara al terminar, la marca rezagada
         * dejaría fallado el siguiente arrastre, que sí era de la cámara.
         */
        deLaInterfaz.value = false;
      })
      .onTouchesMove((e, estado) => {
        'worklet';
        const t = e.allTouches[0];
        const d = desde.value;
        if (t === undefined || d === null) return;
        /*
         * La escena se lo quedó antes de moverse, o el ratón está paseando la mirada
         * con el botón secundario: en los dos casos este puntero no es de la cámara.
         */
        if (deLaInterfaz.value || elRatonPasea.value) {
          estado.fail();
          return;
        }
        /*
         * LA ZONA MUERTA es la misma que en el escritorio, y por lo mismo: un toque
         * nunca es perfectamente quieto, y sin ella cada pulsación sobre un anillo
         * dejaría el tablero un pelo girado. Se mide en píxeles de pantalla con el
         * mínimo que declara `camara.ts`; no es una cuenta de cámara, es el tamaño
         * del temblor de un dedo.
         */
        if (Math.hypot(t.x - d.x, t.y - d.y) < MINIMO_PARA_GIRAR) return;
        estado.activate();
      })
      .onStart((e) => {
        'worklet';
        previo.value = { x: e.translationX, y: e.translationY };
      })
      .onUpdate((e) => {
        'worklet';
        const dx = e.translationX - previo.value.x;
        const dy = e.translationY - previo.value.y;
        previo.value = { x: e.translationX, y: e.translationY };
        runOnJS(mover)(dx, dy);
      })
      .onFinalize(() => {
        'worklet';
        desde.value = null;
        deLaInterfaz.value = false;
      });

    const pellizco = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        factorAlEmpezar.current = cercania.current.factor;
      })
      .onUpdate((e) => {
        /* Separar los dedos (escala > 1) acerca. Los topes y el reparto son de `acercar.ts`. */
        cercania.current = pellizcando(cercania.current, factorAlEmpezar.current, e.scale);
        avisarSiCambia();
      });

    /*
     * EL PASEO: dos dedos que se mueven juntos llevan la MIRADA por el tablero, que
     * es la otra mitad de acercarse. Sin esto, acercarse es acercarse siempre al
     * centro del delta y la comarca del canto no se puede ver de cerca jamás.
     *
     * Va con `minPointers(2)` para no pelearse con el giro, que es de un dedo: no
     * hay ningún par de dedos que pueda significar «gira» ni ningún dedo suelto que
     * pueda significar «pasea», así que los dos gestos no se solapan nunca aunque
     * corran a la vez.
     */
    const paseo = Gesture.Pan()
      .runOnJS(true)
      .minPointers(2)
      .onStart((e) => {
        previoDeDos.current = { x: e.translationX, y: e.translationY };
      })
      .onUpdate((e) => {
        const dx = e.translationX - previoDeDos.current.x;
        const dy = e.translationY - previoDeDos.current.y;
        previoDeDos.current = { x: e.translationX, y: e.translationY };
        /*
         * El rumbo hace falta porque «hacia la derecha» es la derecha DE QUIEN MIRA
         * y el tablero se gira; el alcance y el tamaño del lienzo, porque lo que se
         * recorre se mide en pantallas de mundo y no en píxeles. Las tres cosas
         * entran en `arrastrandoLaMirada` y ninguna se toca aquí.
         */
        cercania.current = arrastrandoLaMirada(
          cercania.current,
          dx,
          dy,
          mirador.current.rumbo,
          cuantoMundo.current,
          pantalla.current,
        );
        avisarSiCambia();
      });

    return Gesture.Simultaneous(giro, pellizco, paseo);
  }, [desde, deLaInterfaz, elRatonPasea, previo, mover, avisarSiCambia]);

  /*
   * ═══ LA RUEDA Y EL ARRASTRE DEL RATÓN, EN LA WEB ═══
   *
   * Los mismos dos movimientos que el pellizco y el paseo, con el aparato que de verdad
   * hay delante de esta pantalla hoy. Ver la cabecera: sin esto, en la única plataforma
   * donde el delta se monta no se puede ni acercar ni mirar un borde.
   *
   * La rueda se apunta EN EL LIENZO y con `{ passive: false }`, que es lo que deja
   * pararla; el arrastre se sigue en la ventana para que salirse del lienzo a mitad de
   * gesto no lo deje colgado, y empieza sólo si el puntero bajó sobre el lienzo. Todo
   * se descuelga al desmontar y también cuando el lienzo cambia de nodo —el respaldo
   * SVG entra y sale—, que es lo que hace el retorno del efecto.
   */
  useEffect(() => {
    if (!EL_RATON_CUENTA_AQUI || elLienzo === null) return undefined;
    /*
     * En React Native Web el `ref` de un `View` ES el elemento del documento. El paso
     * por `unknown` es el precio de que los tipos de React Native no lo digan; no hay
     * ninguna otra forma de llegar al nodo, y en nativo esta línea no se ejecuta.
     */
    const raiz = elLienzo as unknown as HTMLElement;
    let desdeElRaton: { x: number; y: number } | null = null;

    const baja = (e: PointerEvent): void => {
      /*
       * Se decide AL EMPEZAR, como en el escritorio: soltar la tecla a mitad de gesto
       * cambiaría de girar a desplazar sin que nadie lo haya pedido. Un primario a
       * secas no es un paseo, y además así el candado se cura solo en el clic
       * siguiente si alguna vez se perdiera un `pointerup`.
       */
      const pasea = e.button === 2 || e.shiftKey;
      elRatonPasea.value = pasea;
      desdeElRaton = pasea ? { x: e.clientX, y: e.clientY } : null;
    };
    const mueve = (e: PointerEvent): void => {
      if (desdeElRaton === null) return;
      const dx = e.clientX - desdeElRaton.x;
      const dy = e.clientY - desdeElRaton.y;
      desdeElRaton = { x: e.clientX, y: e.clientY };
      /* La escena se quedó el puntero (una carta, una pieza): esto no era un paseo. */
      if (deLaInterfaz.value) return;
      cercania.current = arrastrandoLaMirada(
        cercania.current,
        dx,
        dy,
        mirador.current.rumbo,
        cuantoMundo.current,
        pantalla.current,
      );
      avisarSiCambia();
    };
    const suelta = (): void => {
      desdeElRaton = null;
      elRatonPasea.value = false;
    };
    const rueda = (e: WheelEvent): void => {
      e.preventDefault();
      cercania.current = acercando(cercania.current, pasosDeLaRueda(e));
      avisarSiCambia();
    };
    /* Sin esto, el primer arrastre con el botón derecho abre el menú del navegador encima del delta. */
    const menuDelSistema = (e: Event): void => {
      e.preventDefault();
    };

    raiz.addEventListener('pointerdown', baja);
    raiz.addEventListener('wheel', rueda, { passive: false });
    raiz.addEventListener('contextmenu', menuDelSistema);
    window.addEventListener('pointermove', mueve);
    window.addEventListener('pointerup', suelta);
    window.addEventListener('pointercancel', suelta);
    return () => {
      raiz.removeEventListener('pointerdown', baja);
      raiz.removeEventListener('wheel', rueda);
      raiz.removeEventListener('contextmenu', menuDelSistema);
      window.removeEventListener('pointermove', mueve);
      window.removeEventListener('pointerup', suelta);
      window.removeEventListener('pointercancel', suelta);
      suelta();
    };
  }, [elLienzo, deLaInterfaz, elRatonPasea, avisarSiCambia]);

  const verElTableroEntero = useCallback(() => {
    cercania.current = comoAlPrincipio();
    avisarSiCambia();
  }, [avisarSiCambia]);

  /*
   * Escribir un valor compartido desde JavaScript es una asignación válida desde
   * cualquier hilo; el worklet de `onTouchesMove` la ve en el siguiente toque.
   */
  const laInterfazSeLoQueda = useCallback(() => {
    deLaInterfaz.value = true;
  }, [deLaInterfaz]);

  return {
    gesto,
    apuntarElLienzo,
    mirador,
    cercania,
    seHaMovido,
    verElTableroEntero,
    laInterfazSeLoQueda,
  };
}
