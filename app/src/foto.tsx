/**
 * Una foto de la partida, con plan B.
 *
 * Las fotos las sube quien organiza y llegan de un servidor que puede estar en
 * el portátil del salón: se cae la wifi, se borra un fichero, cambia la
 * dirección del servidor. Un `<Image>` a secas, cuando falla, no dice nada —deja
 * un rectángulo vacío— y quien juega se queda mirando un hueco negro sin saber
 * si es que su personaje no tiene retrato o es que algo va mal.
 *
 * Aquí, si la foto no carga, se pinta lo mismo que cuando no hay foto: la
 * inicial del personaje, el símbolo de la sala. La pantalla sigue teniendo
 * sentido.
 *
 * La dirección se compone con el servidor actual porque lo que manda la API es
 * una ruta (`/api/jugar/foto/…`), no una URL completa: el mismo binario juega
 * contra un portátil en la red local y contra el servidor público.
 */
import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import * as api from './api';
import type { ImageStyle, StyleProp } from 'react-native';

export function Foto({
  url,
  style,
  respaldo,
}: {
  url?: string;
  style?: StyleProp<ImageStyle>;
  respaldo: JSX.Element;
}): JSX.Element {
  const [fallo, setFallo] = useState(false);

  // Si cambia la foto —otra sala, otro personaje— se le da otra oportunidad.
  useEffect(() => setFallo(false), [url]);

  if (!url || fallo) return respaldo;
  return (
    <Image
      source={{ uri: `${api.servidorActual()}${url}` }}
      style={style}
      onError={() => setFallo(true)}
    />
  );
}
