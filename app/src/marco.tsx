/**
 * El marco del teléfono: la barra de estado, la muesca y la barra de gestos.
 *
 * EL PROBLEMA QUE RESUELVE. `SafeAreaProvider` estaba montado en `_layout.tsx`
 * desde el principio, pero **ninguna pantalla preguntaba por los márgenes**, así
 * que el contenido se dibujaba debajo de la hora, la batería y la cobertura de
 * Android. En un móvil con muesca, el título de la portada quedaba partido por
 * el recorte. Tener el proveedor puesto y no usarlo es la forma más silenciosa
 * de que esto pase: no falla nada, simplemente se pinta encima.
 *
 * POR QUÉ NO `SafeAreaView` A SECAS. Ese componente mete relleno por los cuatro
 * lados, y aquí no vale: la portada tiene un mundo 3D que DEBE llegar al borde
 * —si se le mete margen aparece una franja negra que rompe la ilusión de
 * profundidad— mientras que sus botones sí tienen que respetar la barra de
 * estado. Son decisiones distintas para el fondo y para lo de encima, y por eso
 * lo que se expone son los números y no una caja que decide por ti.
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface Marco {
  /** Lo que ocupan la barra de estado y la muesca, arriba. */
  arriba: number;
  /** La barra de gestos de Android o la raya del iPhone, abajo. */
  abajo: number;
}

/**
 * Cuánto hay que apartarse de los bordes en este teléfono concreto.
 *
 * Se le suma un mínimo: en los móviles sin muesca el sistema informa de cero
 * arriba, y pegar el contenido literalmente al borde de la pantalla se ve
 * apretado aunque técnicamente no tape nada.
 */
export function usarMarco(minimoArriba = 12, minimoAbajo = 8): Marco {
  const bordes = useSafeAreaInsets();
  return {
    arriba: Math.max(bordes.top, minimoArriba),
    abajo: Math.max(bordes.bottom, minimoAbajo),
  };
}
