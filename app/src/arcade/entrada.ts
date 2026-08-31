/**
 * LA ENTRADA A CIEGAS: deslizar abajo es acertar, deslizar arriba es pasar.
 *
 * ═══ EL PROBLEMA, QUE ES EL DEL JUEGO ENTERO ═══
 *
 * Quien lleva el móvil lo tiene en la frente, con la pantalla mirando a los demás.
 * NO VE NADA. Y aun así tiene que poder decir dos cosas: «acerté» y «paso».
 *
 * ═══ POR QUÉ NO HAY ACELERÓMETRO ═══
 *
 * `expo-sensors` está DESCARTADO para esta fase, y conviene decir qué se pierde:
 * el sensor no servía para saber cómo está puesto el móvil, servía justamente para
 * decir esas dos cosas sin ver la pantalla, inclinándolo. Queda APLAZADO y no
 * rechazado — la inclinación es mejor gesto que el deslizamiento, porque no exige
 * tocar un aparato que está apoyado en una cara— y el día que entre habrá que
 * escribir el texto de `NSMotionUsageDescription`, que es copy de producto y no
 * configuración.
 *
 * ═══ POR QUÉ UN BOTÓN NO VALE, Y ESTO SÍ ═══
 *
 * Un botón en una zona de la pantalla NO VALE: acertar una mitad concreta sin
 * mirar es adivinar, y fallar significa apuntarse un acierto que no fue o perder
 * una palabra que sí. Lo que sí funciona sin vista es la DIRECCIÓN, que es
 * propioceptiva: el pulgar sabe hacia dónde ha ido sin necesidad de ver dónde
 * empezó ni dónde acabó. No hay ninguna zona que acertar; hay un sentido.
 *
 *   · ABAJO → ACERTÉ. Es el mismo gesto que inclinar el móvil hacia abajo en el
 *     juego de toda la vida, hecho con el pulgar.
 *   · ARRIBA → PASO.
 *
 * ═══ Y POR QUÉ VIBRA ═══
 *
 * Porque es la ÚNICA confirmación que se percibe sin ver la pantalla. Sin ella,
 * quien juega no sabe si el gesto entró y repite —o peor, no repite— y la mesa
 * empieza a gritar «¿te ha pillado?», que es exactamente el ruido que este juego
 * no puede tener.
 *
 * EL GOLPE ES EL MISMO PARA LOS DOS, y se pensó lo contrario. Dos vibraciones
 * distintas serían una segunda cosa que aprender a ciegas, y la pregunta que hay
 * que contestar con el aparato en la frente no es «¿cuál ha entrado?» —eso lo
 * contesta la mesa, a gritos, en cuanto cambia la palabra— sino «¿ha entrado
 * algo?». Una sola respuesta a una sola pregunta.
 *
 * ═══ Y DOS AVISOS MÁS, QUE NO SON GESTOS: EL PRINCIPIO Y EL FINAL ═══
 *
 * La regla de arriba es sobre los dos GESTOS y sigue en pie. Estos dos no
 * contestan a «¿ha entrado algo?» sino a otra pregunta, la única que quien lleva
 * el móvil no podía contestar de ninguna manera: «¿ha empezado ya?» y «¿se ha
 * acabado?».
 *
 * El final es el que faltaba y era grave. Al vencer el plazo no pasaba
 * absolutamente nada perceptible sin ver la pantalla: no vibraba, no sonaba
 * —este juego no tiene ni una línea de audio— y encima el gesto se desactiva, así
 * que quien seguía adivinando deslizaba al vacío y ni siquiera notaba el golpe de
 * confirmación. Se enteraba cuando alguien se lo gritaba, que es exactamente el
 * ruido que la cabecera de aquí arriba dice que este juego no puede tener.
 *
 * Son patrones DISTINTOS del golpe de un gesto y distintos entre sí, y aquí la
 * distinción sí se paga sola: no hay que aprenderla —una llega cuando te acabas
 * de poner el aparato y la otra cuando llevas un minuto— y confundirlas no cuesta
 * nada, porque las dos significan «mira la pantalla».
 *
 * ═══ LO QUE ESTE FICHERO NO PUEDE ARREGLAR: EL BORDE ES DEL SISTEMA ═══
 *
 * Hay que decirlo aquí y no descubrirlo con el juego publicado. Los dos gestos a
 * ciegas son, milímetro a milímetro, los dos gestos de sistema del borde:
 * deslizar ARRIBA empezando en el borde inferior es el gesto de inicio de iOS y
 * de la navegación por gestos de Android, y deslizar ABAJO empezando en el borde
 * superior abre el panel de notificaciones. Y el pulgar de quien sujeta el móvil
 * contra la frente aterriza cerca de los bordes, porque la mano rodea el aparato.
 *
 * Cuando eso pasa, el sistema se queda el gesto ANTES de que llegue aquí: no hay
 * nada que este `Pan` pueda hacer, ni ampliándolo ni recortándolo. La app se va
 * al fondo en mitad de la ronda, el reloj sigue corriendo con el de pared y al
 * volver la ronda puede haber vencido sola.
 *
 * Lo que sí se ha hecho, y está en `frente.tsx`: la palabra DESAPARECE en cuanto
 * la app deja de estar en primer plano, para que la foto que el conmutador de
 * aplicaciones guarda de la pantalla no lleve dentro el secreto; y la pantalla de
 * antes de empezar pide deslizar por el centro.
 *
 * Lo que NO se ha hecho, y es una decisión y no un olvido: aplazar los gestos del
 * sistema —`preferredScreenEdgesDeferringSystemGestures` en iOS, modo inmersivo
 * en Android— no tiene ningún interruptor en `app.json` y pide una dependencia
 * nueva y un complemento de configuración. Esta fase entrega «sin una sola
 * dependencia nueva» por escrito, así que queda como lo que es: un límite
 * conocido, medido y escrito, para que lo decida quien lleve la fase.
 */
import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import type { PanGesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

/**
 * Cuánto hay que deslizar para que cuente. En píxeles independientes.
 *
 * Sesenta es un gesto corto y decidido, del tamaño de un pulgar en reposo. Menos
 * convertiría cualquier temblor —y va a haber temblor: el aparato está apoyado en
 * una cara y la mano se mueve— en un acierto fantasma. Más obligaría a un
 * manotazo, que con el móvil sujeto contra la frente termina en el suelo.
 */
const RECORRIDO_MINIMO = 60;

/**
 * O que vaya deprisa, aunque recorra poco.
 *
 * Un golpecito rápido de pulgar recorre menos de sesenta puntos y es un gesto
 * perfectamente claro. Sin esta segunda puerta, quien juega deprisa —que es todo
 * el mundo a partir del segundo turno— tendría que exagerar el movimiento y el
 * juego se sentiría duro sin que nadie supiera decir por qué.
 */
const VELOCIDAD_MINIMA = 500;

/**
 * Cuánto más vertical que horizontal tiene que ser.
 *
 * A ciegas nadie desliza recto. Se exige que lo vertical mande con holgura para
 * que un gesto lateral —pasar el móvil a otra persona, recolocarlo en la frente—
 * no se cuele como una respuesta. Es la comprobación que impide que el juego
 * conteste solo mientras cambia de manos.
 */
const CUANTO_MAS_VERTICAL = 1.2;

export interface GestosACiegas {
  /** Deslizó hacia abajo: acertó. */
  alAcertar: () => void;
  /** Deslizó hacia arriba: pasa. */
  alPasar: () => void;
  /** Mientras no se está jugando, el gesto no escucha. */
  activo: boolean;
}

/**
 * El gesto, listo para envolver la pantalla entera.
 *
 * TIENE QUE COGER TODA LA PANTALLA y no un recuadro: el dedo aterriza donde
 * aterriza, y una zona sensible que hay que encontrar sin mirar es el mismo
 * problema que el botón.
 *
 * `runOnJS(true)` porque las respuestas de aquí llaman al reductor, que vive en el
 * hilo de JavaScript. Sin eso, `react-native-gesture-handler` ejecuta la respuesta
 * en el hilo de interfaz como una función de trabajo aislada, y desde allí no se
 * ve ni el estado de React ni el registro de arcades: el gesto entraría, la
 * vibración sonaría y la palabra no cambiaría nunca.
 */
export function usarGestoACiegas({ alAcertar, alPasar, activo }: GestosACiegas): PanGesture {
  return useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .enabled(activo)
        .onEnd((e) => {
          const vertical = e.translationY;
          const horizontal = Math.abs(e.translationX);
          if (Math.abs(vertical) < horizontal * CUANTO_MAS_VERTICAL) return;

          const bastante =
            Math.abs(vertical) >= RECORRIDO_MINIMO || Math.abs(e.velocityY) >= VELOCIDAD_MINIMA;
          if (!bastante) return;

          golpe();
          if (vertical > 0) alAcertar();
          else alPasar();
        }),
    [alAcertar, alPasar, activo],
  );
}

/**
 * El golpe de vibración. Uno, seco, y da igual lo que haya entrado.
 *
 * Va envuelto en `catch` porque no todos los aparatos tienen motor de vibración y
 * en web no existe: un `await` que rechaza aquí se llevaría por delante el gesto,
 * o sea que en un teléfono sin vibración el juego dejaría de responder. La
 * confirmación es un lujo; el movimiento, no.
 */
function golpe(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}

/**
 * «YA»: la ronda acaba de empezar y la palabra ya está en la pantalla.
 *
 * Llega tres segundos después de pulsar, con el aparato ya en la frente y la
 * pantalla mirando a la sala. Sin esto, quien lo lleva no tiene forma de saber si
 * la cuenta atrás ha terminado y se queda esperando a que alguien empiece a dar
 * pistas — o peor, empieza a deslizar antes de tiempo, con el gesto todavía
 * apagado.
 */
export function avisarQueEmpieza(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

/**
 * «SE ACABÓ»: venció el plazo.
 *
 * Es el aviso más necesario de los tres y el que no existía. Va envuelto en
 * `catch` por lo mismo que el golpe: en un aparato sin motor de vibración y en la
 * web esto no existe, y una promesa rechazada aquí no puede llevarse por delante
 * el final de la ronda.
 */
export function avisarQueSeAcabo(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
}
