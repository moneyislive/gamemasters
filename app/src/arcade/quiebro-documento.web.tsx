/**
 * EL DOCUMENTO DE LA NOCHE EN `/jugar`: un `iframe` al mismo `quiebro.html`, con `postMessage`.
 *
 * ═══ POR QUÉ UN FICHERO `.web` Y NO UNA RAMA ═══
 *
 * En la web de la app `react-native-webview` no existe, y lo que hace sus veces es el propio navegador:
 * un `iframe` al documento suelto. Metro elige este fichero en la web y `quiebro-documento.tsx` en el
 * teléfono, con la misma forma exportada (`LoQueVeElDocumento`), así que la pantalla de la noche es UNA
 * y no pregunta en qué plataforma está —`verify:sala` no admite un `Platform.OS` en una pantalla de
 * juego, y con razón: una rama por plataforma es la que acaba mandando el teléfono al retablo—.
 *
 * ═══ DE QUIÉN SE ACEPTA UN MENSAJE, Y A QUIÉN SE LE MANDA ═══
 *
 * La ventana de `/jugar` recibe `message` de cualquiera que tenga una referencia a ella. Se acepta sólo
 * lo que llega del `iframe` del documento —`event.source` es SU ventana— y desde el ORIGEN del documento:
 * una página que enmarcara `/jugar` o que abriera otra pestaña no puede mover en nombre de nadie. Y se
 * manda con ese mismo origen como destino: si el `iframe` hubiera navegado a otra parte, el navegador
 * tira el mensaje en vez de entregárselo a quien esté ahí —con la llave del asiento dentro—.
 *
 * En producción `/jugar`, `/sala` y la API son el mismo servicio y el mismo origen (ver
 * `server/src/enlaces/escritorio-web.ts`), que es lo que el documento comprueba de su lado
 * (`vieneDelAnfitrion` de `escritorio/src/quiebro/contrato.ts`). En desarrollo la app web vive en otro
 * puerto que el servidor, y el documento sólo la acepta si ese origen se le fijó al compilar.
 *
 * ═══ LO QUE UN `iframe` NO DICE, Y QUIÉN LO VIGILA ═══
 *
 * Un `iframe` no avisa de un 404 ni de un documento que revienta al arrancar: `onError` no salta por el
 * código HTTP de otra página. Lo que sí se sabe es si el documento se ha puesto en marcha —dice `listo`—,
 * y esa espera la lleva la pantalla, igual para las dos plataformas. Aquí sólo se pinta y se reparte.
 *
 * `allow` delega en el documento lo que un juego necesita y un `iframe` no tiene por defecto: sonar sin
 * pedir otro toque, la pantalla completa y el mando de consola.
 */
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LoQueVeElDocumento } from './quiebro-documento';
import { SALA } from './muebles';

export function ElDocumentoDelQuiebro({ direccion, origen, alRecibir, buzon }: LoQueVeElDocumento): JSX.Element {
  const marco = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const oir = (e: MessageEvent): void => {
      const suVentana = marco.current?.contentWindow ?? null;
      if (suVentana === null || e.source !== suVentana || e.origin.toLowerCase() !== origen) return;
      alRecibir(e.data);
    };
    window.addEventListener('message', oir);
    buzon.current = (texto: string) => {
      marco.current?.contentWindow?.postMessage(texto, origen);
    };
    return () => {
      window.removeEventListener('message', oir);
      buzon.current = null;
    };
  }, [alRecibir, buzon, origen]);

  return (
    <View style={estilos.suelo}>
      <iframe
        ref={marco}
        src={direccion}
        title="El Quiebro"
        allow="autoplay; fullscreen; gamepad"
        style={{ border: 0, width: '100%', height: '100%', display: 'block', background: SALA.suelo }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  /* La noche antes de la noche: el suelo de la Sala, nunca un blanco de navegador. */
  suelo: { flex: 1, backgroundColor: SALA.suelo },
});
