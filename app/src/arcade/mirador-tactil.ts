/**
 * EL GESTO QUE MUEVE EL OJO SOBRE EL TABLERO: del dedo al `Mirador`.
 *
 * ═══ QUÉ HAY AQUÍ Y QUÉ NO ═══
 *
 * La aritmética de la cámara —cuánto gira un arrastre, hasta dónde se inclina, dónde
 * cae el ojo— vive en `escenas/camara.ts`, sin `three` y medible desde Node. Aquí
 * sólo está lo que la app pone encima y el escritorio no: el DEDO. El banco de
 * pruebas escucha `pointerdown` en la ventana; en el móvil no hay ventana, hay un
 * `Canvas` sobre `expo-gl` y un sistema de gestos, y la traducción entre los dos es
 * este fichero.
 *
 * ═══ EL PROBLEMA, Y POR QUÉ LA ACTIVACIÓN ES MANUAL ═══
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
 * dedo, y el gesto —con la activación en manual— se FALLA a sí mismo en cuanto ve
 * moverse un dedo que no es suyo. Sin activación manual, `Pan` se activaría solo a
 * los diez puntos y le robaría la carta a la escena a mitad de arrastre: en Android
 * eso llega como una cancelación del toque y la carta vuelve sola a la mano.
 *
 * ═══ POR QUÉ LAS RESPUESTAS DEL ARRASTRE SON WORKLETS Y NO PUEDEN SER JS ═══
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
 * Así que el arrastre se escribe entero como worklets —sin `runOnJS(true)`—, y lo
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
 * ═══ Y POR QUÉ TODO VA POR REFERENCIAS Y NADA POR ESTADO ═══
 *
 * Son sesenta cambios por segundo mientras se arrastra. Pasarlos por React
 * repintaría la pantalla entera —barra, turno, crónica— sesenta veces por segundo
 * para mover una cámara. La escena lee el `Mirador` en su propio bucle de dibujo,
 * que es donde se consume.
 *
 * La PINZA sí corre con `runOnJS(true)`: no tiene activación manual, no toca el
 * estado del gesto, y sólo escribe una referencia de React desde `onUpdate`. Es el
 * mismo caso que `entrada.ts`, y funcionaba; no se cambia lo que funciona.
 */
import { useCallback, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import type { ComposedGesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import {
  MINIMO_PARA_GIRAR,
  MIRADOR_DE_SALIDA,
  tirandoDelMirador,
} from '../../../escenas/camara';
import type { Mirador } from '../../../escenas/camara';

/**
 * HASTA DÓNDE SE PUEDE ACERCAR Y ALEJAR CON LA PINZA, en fracción de la distancia
 * de encuadre. Uno es «el delta entero cabe»; por debajo se entra a mirar un vértice
 * y por encima se pierde el detalle sin ganar nada, porque el encuadre ya lo enseña
 * todo. Los topes son cortos a propósito: la pinza es para ver mejor un cruce, no
 * para perderse.
 */
export const ACERCAMIENTO_MINIMO = 0.55;
export const ACERCAMIENTO_MAXIMO = 1.25;

export function acercamientoValido(a: number): number {
  return Math.min(ACERCAMIENTO_MAXIMO, Math.max(ACERCAMIENTO_MINIMO, a));
}

export interface MiradorTactil {
  /** Para envolver el lienzo con `GestureDetector`. */
  readonly gesto: ComposedGesture;
  /** Dónde está puesto el ojo. Lo lee la escena cada fotograma; nunca pasa por React. */
  readonly mirador: MutableRefObject<Mirador>;
  /** Cuánto se ha acercado con la pinza. Uno es el encuadre; menos es más cerca. */
  readonly acercamiento: MutableRefObject<number>;
  /**
   * Lo llama la pantalla en cuanto la escena se queda el dedo —una carta cogida,
   * una pieza tomada de la barra—, dentro del mismo aviso y antes de tocar el
   * estado. A partir de ahí, y hasta que el dedo se levante, la cámara no se mueve.
   */
  readonly laInterfazSeLoQueda: () => void;
}

/**
 * El gesto del tablero: arrastrar gira, la pinza acerca.
 *
 * `medida` es el tamaño del lienzo en puntos. Va por referencia y no en las
 * dependencias del `useMemo` a propósito: el gesto se crea UNA vez, y si se
 * recreara con cada medida un giro de pantalla a mitad de arrastre soltaría el
 * gesto en marcha.
 */
export function usarMiradorTactil(medida: { ancho: number; alto: number }): MiradorTactil {
  const mirador = useRef<Mirador>(MIRADOR_DE_SALIDA);
  const acercamiento = useRef(1);
  const pantalla = useRef(medida);
  pantalla.current = medida;

  /*
   * Lo que el arrastre recuerda entre toques, en valores compartidos porque lo
   * escriben worklets del hilo de interfaz (ver la cabecera): desde dónde bajó el
   * dedo, para la zona muerta; si la escena ya se lo quedó; y la última traslación
   * entregada, para pasar de acumulado a incremento.
   */
  const desde = useSharedValue<{ x: number; y: number } | null>(null);
  const deLaInterfaz = useSharedValue(false);
  const previo = useSharedValue({ x: 0, y: 0 });
  const acercamientoAlEmpezar = useRef(1);

  /*
   * El destino de `runOnJS` tiene que ser LA MISMA función siempre —el gesto se crea
   * una vez— y aun así ver la medida de ahora: por eso lee `pantalla.current` y no
   * cierra sobre `medida`. Es el mismo patrón que `avisar` en `bucle.ts`.
   */
  const mover = useCallback((dx: number, dy: number): void => {
    mirador.current = tirandoDelMirador(mirador.current, dx, dy, pantalla.current);
  }, []);

  const gesto = useMemo(() => {
    const arrastre = Gesture.Pan()
      /* Con dos dedos manda la pinza; el arrastre de un dedo se suelta solo. */
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
        /* La escena se lo quedó antes de moverse: este dedo no es de la cámara. */
        if (deLaInterfaz.value) {
          estado.fail();
          return;
        }
        /*
         * LA ZONA MUERTA es la misma que en el escritorio, y por lo mismo: un toque
         * nunca es perfectamente quieto, y sin ella cada pulsación sobre un anillo
         * dejaría el tablero un pelo girado.
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

    const pinza = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        acercamientoAlEmpezar.current = acercamiento.current;
      })
      .onUpdate((e) => {
        /* Separar los dedos (escala > 1) acerca: la fracción baja. */
        if (!(e.scale > 0)) return;
        acercamiento.current = acercamientoValido(acercamientoAlEmpezar.current / e.scale);
      });

    return Gesture.Simultaneous(arrastre, pinza);
  }, [desde, deLaInterfaz, previo, mover]);

  /*
   * Escribir un valor compartido desde JavaScript es una asignación válida desde
   * cualquier hilo; el worklet de `onTouchesMove` la ve en el siguiente toque.
   */
  const laInterfazSeLoQueda = useCallback(() => {
    deLaInterfaz.value = true;
  }, [deLaInterfaz]);

  return { gesto, mirador, acercamiento, laInterfazSeLoQueda };
}
