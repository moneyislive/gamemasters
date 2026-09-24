/**
 * EL DOCUMENTO DE LA NOCHE EN EL TELÉFONO: un WebView que carga `quiebro.html` y hace de cartero.
 *
 * ═══ POR QUÉ UN WEBVIEW, Y NO LA ESCENA DE SIEMPRE ═══
 *
 * Riberas, el Burgo y Las Lindes se pintan en la app con expo-gl, y por eso sus escenas viven en
 * `escenas/` con las reglas que expo-gl impone: sin DOM, `mediump` sin derivadas ni texturas, color
 * horneado a vértice. El Quiebro necesita lo que expo-gl no da —posproceso, render targets, WebAudio,
 * Pointer Events con multitoque— y lo tiene el motor del navegador del propio teléfono. Así que el
 * juego es UNO, el del escritorio (`escritorio/src/quiebro/`), y aquí se carga su documento suelto
 * (`<servidor>/sala/quiebro.html`) en un WebView apaisado (`docs/quiebro/ARQUITECTURA.md` §0.2). En la
 * web de la app el mismo documento va en un `iframe`: es el `.web.tsx` de al lado, con la misma forma.
 *
 * Este fichero sólo pinta la superficie y pasa mensajes en crudo. Qué se manda y qué significa lo que
 * llega es de la pantalla (`quiebro-en-tres-escena.tsx`), que es la misma en las dos plataformas.
 *
 * ═══ UN APK SIN EL MÓDULO NATIVO NO SE CAE ═══
 *
 * `react-native-webview` trae código nativo, y su módulo JS lo pide con `getEnforcing` AL CARGARSE: en
 * un binario compilado antes de que entrara —un APK de desarrollo viejo con Metro nuevo delante— el
 * primer `import` lanzaría, y lanzaría fuera de cualquier red, porque un `import` estático se evalúa al
 * cargar el módulo. Por eso aquí:
 *
 *   · se pregunta al registro de módulos con `get` —el que devuelve `null` en vez de lanzar— si el
 *     visor está en este binario;
 *   · y el paquete se trae con `lazy` en el ámbito del módulo, así que no se evalúa hasta que se pinta,
 *     y sólo se pinta si el visor está.
 * Sin visor se dice (`alFallar`) y la pantalla juega sobre el plano del barrio con la nota de que hace
 * falta actualizar la app. Un APK publicado ANTES de El Quiebro ni siquiera llega aquí: no tiene su
 * fila en `pintados.ts`, así que pinta la mesa con el mueble genérico `tablero`, que es el mismo plano.
 *
 * ═══ LO QUE EL WEBVIEW PUEDE Y NO PUEDE HACER ═══
 *
 *   · SÓLO CARGA EL DOCUMENTO. `originWhitelist` es su origen y `onShouldStartLoadWithRequest` deja
 *     pasar únicamente la dirección del documento: un enlace dentro de la página que llevara a otra no
 *     abre nada. Es lo que hace de fiar a quien habla por `onMessage`: en esta vista no hay otra página
 *     que pueda hablar, y aun así se mira que el mensaje venga de la dirección del documento.
 *   · EL SONIDO SIN UN SEGUNDO TOQUE. `mediaPlaybackRequiresUserAction={false}` y
 *     `allowsInlineMediaPlayback`: el audio se desbloquea con el toque de BAJAR dentro del documento, y
 *     sin esto el WebView pediría otro gesto suyo encima (el informe del frente de sonido lo dejó dicho).
 *   · NI REBOTE, NI ZOOM, NI DESPLAZAMIENTO: es una pantalla de juego y cada gesto es del juego. El
 *     zoom con dos dedos de iOS lo apaga además el propio documento con su `viewport`.
 *   · SI EL MOTOR DEL WEBVIEW SE MUERE —Android mata el proceso del render con poca memoria; iOS termina
 *     el de contenido—, se dice y se juega sobre el plano. Recargar en silencio metería otra vez el mismo
 *     documento pesado en el mismo teléfono que acaba de quedarse sin memoria.
 *
 * ═══ CÓMO LE LLEGA AL DOCUMENTO LO QUE MANDA LA PANTALLA ═══
 *
 * Con `injectJavaScript`, llamando a la función que el documento deja para ello (`guionQueEntrega` y
 * `DONDE_ESCUCHA`, en `quiebro-puente.ts`). No por `postMessage` del WebView: ése entrega el mensaje como
 * un evento sin origen, y el documento sólo acepta lo que llega de su anfitrión (`vieneDelAnfitrion` de
 * `contrato.ts`).
 */
import { lazy, Suspense, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { StyleSheet, TurboModuleRegistry, View } from 'react-native';
import type { WebView as ElVisor } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewMessageEvent } from 'react-native-webview/lib/WebViewTypes';
import { SALA } from './muebles';
import { guionQueEntrega } from './quiebro-puente';

/** Lo que la pantalla le da a la superficie del documento, en las dos plataformas. */
export interface LoQueVeElDocumento {
  /** Dónde está el documento suelto: `<origen del servidor>/sala/quiebro.html`. */
  readonly direccion: string;
  /**
   * El origen de esa dirección (`https://anfitrion[:puerto]`, en minúsculas). Lo calcula la pantalla,
   * que no monta la superficie si la dirección no tiene uno: aquí sólo se compara con él.
   */
  readonly origen: string;
  /** Lo que el documento dice, en crudo: la pantalla lo lee con su lector estricto. */
  readonly alRecibir: (dato: unknown) => void;
  /** Cómo se le habla: la superficie deja aquí su cartero al montarse y lo quita al irse. */
  readonly buzon: MutableRefObject<((texto: string) => void) | null>;
  /** La superficie no puede enseñar el documento: el motivo, para la nota del respaldo. */
  readonly alFallar: (motivo: string) => void;
}

/**
 * ¿TRAE ESTE BINARIO EL VISOR? `get` y no `getEnforcing`: el primero contesta `null` si falta, el
 * segundo lanza. Envuelto por si el registro mismo lanza en un binario raro: no saber es no tenerlo.
 */
export function hayVisorEnEsteBinario(): boolean {
  try {
    return TurboModuleRegistry.get('RNCWebViewModule') !== null;
  } catch {
    return false;
  }
}

/*
 * El paquete, traído al pintarse y no al cargar este fichero: ver la cabecera. En el ámbito del módulo,
 * como toda envoltura perezosa de esta casa, para que no sea un componente nuevo en cada repintado.
 */
const ElVisorPerezoso = lazy(() => import('react-native-webview').then((m) => ({ default: m.WebView })));

export function ElDocumentoDelQuiebro({ direccion, origen, alRecibir, buzon, alFallar }: LoQueVeElDocumento): JSX.Element {
  const visor = useRef<ElVisor | null>(null);
  const hayVisor = hayVisorEnEsteBinario();

  useEffect(() => {
    if (!hayVisor) alFallar('esta versión de la app no trae el visor de la noche; con la próxima actualización ya estará');
  }, [alFallar, hayVisor]);

  useEffect(() => {
    buzon.current = (texto: string) => {
      visor.current?.injectJavaScript(guionQueEntrega(texto));
    };
    return () => {
      buzon.current = null;
    };
  }, [buzon]);

  if (!hayVisor) return <View style={estilos.suelo} />;

  const soloElDocumento = (peticion: ShouldStartLoadRequest): boolean => peticion.url.split('#')[0] === direccion;
  const alHablar = (e: WebViewMessageEvent): void => {
    if (!e.nativeEvent.url.toLowerCase().startsWith(`${origen}/`)) return;
    alRecibir(e.nativeEvent.data);
  };

  return (
    <Suspense fallback={<View style={estilos.suelo} />}>
      <ElVisorPerezoso
        ref={visor}
        source={{ uri: direccion }}
        style={estilos.suelo}
        containerStyle={estilos.suelo}
        originWhitelist={[origen]}
        onShouldStartLoadWithRequest={soloElDocumento}
        onMessage={alHablar}
        onError={(e) => alFallar(`el documento no ha cargado: ${e.nativeEvent.description}`)}
        onHttpError={(e) => alFallar(`el servidor contestó ${String(e.nativeEvent.statusCode)} al pedir el documento`)}
        onRenderProcessGone={() => alFallar('el motor del navegador del teléfono se ha cerrado (poca memoria)')}
        onContentProcessDidTerminate={() => alFallar('el motor del navegador del teléfono se ha cerrado (poca memoria)')}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsFullscreenVideo={false}
        bounces={false}
        overScrollMode="never"
        scrollEnabled={false}
        nestedScrollEnabled={false}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        setSupportMultipleWindows={false}
        textZoom={100}
        allowsBackForwardNavigationGestures={false}
        allowsLinkPreview={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        webviewDebuggingEnabled={__DEV__}
      />
    </Suspense>
  );
}

const estilos = StyleSheet.create({
  /* La noche antes de la noche: el suelo de la Sala, nunca un blanco de navegador. */
  suelo: { flex: 1, backgroundColor: SALA.suelo },
});
