/**
 * Llegada por enlace con código de partida: `https://harkania.com/e/<código>`.
 *
 * Quien no tiene cuenta juega con códigos, y ese camino se conserva entero: lo
 * único que hace el enlace es ahorrarle teclear el de la partida. El personal
 * sigue pidiéndose, porque es lo que distingue una silla de otra.
 *
 * NO COMPRUEBA EL CÓDIGO AQUÍ. Podría preguntarle al servidor si existe antes de
 * seguir, y sería peor: convertiría la pantalla en un oráculo para adivinar
 * códigos probando, sin pasar por el contador de intentos del servidor de juego.
 * Que lo diga quien lleva la cuenta.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function LlegadaPorCodigo(): JSX.Element {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();

  useEffect(() => {
    /*
     * `replace` y no `push`: esta pantalla es un desvío, no un sitio. Con
     * `push`, el gesto de volver atrás traería aquí otra vez y volvería a
     * desviar — un bucle del que no se sale.
     */
    router.replace({
      pathname: '/entrar',
      params: codigo ? { codigo: String(codigo).toUpperCase() } : {},
    });
  }, [codigo]);

  // Un fondo del color de la app mientras dura el desvío: un parpadeo en blanco
  // en mitad de la llegada parece un fallo.
  return <View style={{ flex: 1, backgroundColor: '#0b1710' }} />;
}
