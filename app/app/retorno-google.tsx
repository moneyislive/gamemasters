/**
 * La vuelta de Google, si el sistema operativo llega a abrirla como pantalla.
 *
 * POR QUÉ EXISTE UNA PANTALLA PARA ESTO. `openAuthSessionAsync` normalmente
 * intercepta la vuelta y la devuelve como resultado sin navegar a ningún sitio,
 * así que esto no debería verse nunca. Pero el enlace pasa por el sistema
 * operativo, la app declara ese esquema, y en algunos casos Android despacha
 * además la intención — y entonces el enrutador SÍ navega.
 *
 * Sin una pantalla aquí, esa navegación cae en «ruta no encontrada» justo al
 * terminar de iniciar sesión: lo último que ve quien acaba de identificarse es
 * un error. Con ella, se vuelve a la portada y no se nota nada.
 *
 * LA PRIMERA VERSIÓN VOLVÍA A `harkania://entrar`, y ahí estaba el fallo que
 * motivó este fichero: `entrar` ES la pantalla de los códigos de partida, y
 * encima lee un parámetro llamado `codigo` para rellenar el de la mesa. Al
 * volver de Google se abría el formulario de códigos con el código de canje
 * metido en la casilla de la partida — que es exactamente lo contrario de lo
 * que se busca, porque los códigos son el camino de quien NO tiene cuenta.
 *
 * NO CANJEA NADA AQUÍ. El canje lo hace `entrarConGoogle`, que es quien pidió
 * la sesión y quien sabe qué hacer después. Si esta pantalla también lo
 * intentara, dos manos irían a por el mismo código de un solo uso y una de las
 * dos recibiría un 409.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

export default function RetornoDeGoogle(): JSX.Element {
  useEffect(() => {
    // `replace` y no `push`: esto es un desvío, no un sitio. Con `push`, volver
    // atrás traería aquí otra vez.
    router.replace('/');
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#050d09' }} />;
}
