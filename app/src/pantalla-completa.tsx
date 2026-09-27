/**
 * LA PANTALLA COMPLETA MIENTRAS SE JUEGA, EN EL TELÉFONO: sin barra de estado y sin la de
 * navegación de Android, y las dos de vuelta al salir de la partida.
 *
 * ═══ POR QUÉ ESTO EXISTE ═══
 *
 * Encargo del 27-sep (`docs/PANTALLAS.md` §5): al jugar en el móvil «no se veían las cosas bien».
 * En un teléfono tumbado de 390 de alto, la barra de estado se queda 24 y la de navegación de
 * Android otros 48: casi una quinta parte de la pantalla, y justo la parte donde el tablero ya no
 * cabía. Mientras se juega se esconden las dos; se ven otra vez deslizando desde el borde.
 *
 * ═══ UNA LÍNEA EN CADA PANTALLA DE JUEGO, Y NADA MÁS ═══
 *
 * La monta el pintor de cada juego —`usarPantallaCompleta();` al principio de su componente—, que
 * sólo se pinta con la mesa ya sentada (`LaMesaDeUnPintor` no lo monta en el vestíbulo). Así el
 * vestíbulo, la Sala y la portada conservan sus barras, que es donde se escribe un nombre y se lee
 * la hora, y la partida no. `verify:sala` vigila que las cuatro pantallas la llamen.
 *
 * ═══ CUÁNTAS PANTALLAS LA PIDEN, Y NO SI LA PIDE UNA ═══
 *
 * El grupo `(arcade)` cambia de pantalla con un `fade`: la que entra se monta ANTES de que la que
 * sale se desmonte. Con un «esconder al montar, enseñar al desmontar» a secas, pasar de El Burgo a
 * Riberas dejaría las barras a la vista en mitad de la partida nueva. Se cuenta cuántas la tienen
 * pedida y se devuelven las barras cuando la cuenta vuelve a cero.
 *
 * ═══ LA BARRA DE ESTADO ENTRA EN LA PILA, NO SE PISA ═══
 *
 * `StatusBar.pushStackEntry` es la misma pila que usan los `<StatusBar>` de la app —el de la raíz,
 * `style="light"`, y el `hidden` de la noche de El Quiebro—. Con `setHidden` a pelo, el primer
 * `<StatusBar>` que se montara o cambiara después volvería a enseñarla en plena partida, y el de la
 * noche de El Quiebro la enseñaría al desmontarse aunque siguiéramos en la mesa.
 *
 * ═══ ANDROID: MODO INMERSIVO CON DESLIZAMIENTO ═══
 *
 * `expo-navigation-bar` esconde la barra con `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`: deslizar
 * desde abajo la enseña un momento, por encima del juego, y se vuelve a esconder sola. Al volver de
 * otra app el sistema puede devolverla, así que se vuelve a pedir cada vez que la app se activa.
 * La app es de borde a borde (Android 15+): lo que el sistema ocupa lo cuentan las zonas seguras
 * (`useSafeAreaInsets`), que siguen midiendo la muesca con las barras escondidas.
 *
 * AÑADIR `expo-navigation-bar` PIDE UN APK NUEVO: es un módulo nativo. En un binario viejo el
 * `import` no encuentra el módulo y todo esto calla —la barra de estado sí se esconde, que es de
 * React Native—.
 *
 * En la web lo hace `pantalla-completa.web.tsx`, con la Fullscreen API; Metro elige el fichero.
 */
import { useEffect } from 'react';
import { AppState, Platform, StatusBar } from 'react-native';
import type { StatusBarProps } from 'react-native';

/** El módulo de la barra de navegación, o `null` si este binario no lo trae (un APK anterior). */
type BarraDeNavegacion = { setVisibilityAsync: (v: 'visible' | 'hidden') => Promise<void> };
let navegacion: BarraDeNavegacion | null | undefined;
function barraDeNavegacion(): BarraDeNavegacion | null {
  if (navegacion !== undefined) return navegacion;
  navegacion = null;
  if (Platform.OS !== 'android') return navegacion;
  try {
    navegacion = require('expo-navigation-bar') as BarraDeNavegacion;
  } catch {
    /* Un APK compilado antes de instalarla: sin el módulo nativo, la barra se queda. */
    navegacion = null;
  }
  return navegacion;
}

function navegacionA(v: 'visible' | 'hidden'): void {
  const barra = barraDeNavegacion();
  if (barra === null) return;
  void barra.setVisibilityAsync(v).catch(() => undefined);
}

/** Cuántas pantallas de juego montadas la tienen pedida ahora mismo. */
let pedidas = 0;
/** La entrada de la pila de la barra de estado, mientras haya alguna pedida. */
let entrada: StatusBarProps | null = null;
/** Quién vuelve a esconder la de navegación al volver a la app. */
let alVolver: { remove: () => void } | null = null;

function entrarEnLaPartida(): void {
  pedidas += 1;
  if (pedidas > 1) return;
  entrada = StatusBar.pushStackEntry({ hidden: true, animated: true, showHideTransition: 'fade' });
  navegacionA('hidden');
  alVolver = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') navegacionA('hidden');
  });
}

function salirDeLaPartida(): void {
  pedidas = Math.max(0, pedidas - 1);
  if (pedidas > 0) return;
  if (entrada !== null) StatusBar.popStackEntry(entrada);
  entrada = null;
  alVolver?.remove();
  alVolver = null;
  navegacionA('visible');
}

/**
 * Esconde las barras del sistema mientras la pantalla que lo llama esté montada, y las devuelve al
 * desmontarse. Una línea al principio del pintor de cada juego.
 */
export function usarPantallaCompleta(): void {
  useEffect(() => {
    entrarEnLaPartida();
    return salirDeLaPartida;
  }, []);
}

/**
 * El botón de pantalla completa de la barra de la mesa. En el teléfono no hace falta —la partida ya
 * la tiene— y no se pinta: existe para que la barra lo monte igual en las dos plataformas.
 */
export function BotonDePantallaCompleta(): JSX.Element | null {
  return null;
}
