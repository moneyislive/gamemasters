/**
 * EL PARTE DE FALLOS: que un error de JavaScript se LEA en vez de cerrar la app.
 *
 * ═══ EL FALLO QUE ESTO CIERRA, Y CÓMO SE VIO ═══
 *
 * Miguel instaló la 1.3.0, abrió Riberas y la app se cerró. Sin más: ni mensaje, ni
 * pantalla en blanco, nada que contar. En una compilación de producción de React Native
 * un `throw` durante el render que nadie recoge es FATAL, y como esta app no tenía ningún
 * `ErrorBoundary` —lo lamentan cuatro cabeceras distintas del propio código— el proceso
 * moría y el motivo se quedaba en un registro del sistema al que nadie llega sin un cable
 * y `adb`. Desde aquí se pudo comprobar que toda la lógica compartida que esa pantalla
 * ejecuta al montar corría limpia en Node con la vista real de la mesa; lo que fallaba
 * era algo del teléfono, y el teléfono no lo decía.
 *
 * Esto hace dos cosas, y las dos son para que el teléfono lo diga:
 *
 *   1. `CazaFallos` envuelve las pantallas: si un render revienta, en vez de morir la app
 *      pinta el mensaje y la pila, con un botón para copiarlo y otro para volver.
 *   2. `armarElParteDeFallos` engancha el manejador GLOBAL de errores de React Native y
 *      GUARDA el último fatal en el aparato antes de dejar que siga su curso. Al arrancar
 *      la próxima vez, `UltimoFallo` lo enseña: aunque la app se cerrara, el motivo
 *      sobrevive al cierre. Es la diferencia entre «se cierra» y «se cierra porque X».
 *
 * ═══ POR QUÉ SE GUARDA ADEMÁS DE ENSEÑARSE ═══
 *
 * Porque no todo lo recoge un `ErrorBoundary`: los fallos fuera del render —un `useEffect`,
 * una promesa, un manejador de gesto en el hilo de la interfaz— llegan al manejador global
 * y ahí la app SÍ se cierra. Guardarlo es lo único que funciona en los dos casos.
 *
 * Se guarda donde guarda todo lo demás la app —`SecureStore` en el aparato, `localStorage`
 * en la web—, con la misma caída que `api.ts`. No se manda al servidor: un parte de fallos
 * que sale del aparato es una decisión de privacidad que no se toma en una víspera.
 */
import { Component, useEffect, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CLAVE = 'harkania.ultimo-fallo';

/** Lo que se guarda de un fallo: lo justo para saber qué y dónde. */
export interface Fallo {
  cuando: string;
  mensaje: string;
  pila: string;
  /** `render` si lo cazó el envoltorio; `global` si llegó al manejador de React Native. */
  donde: 'render' | 'global';
  fatal: boolean;
}

/* El mismo almacén de dos caras que usa `api.ts`: SecureStore no existe en la web. */
const almacen = {
  async leer(): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(CLAVE) ?? null;
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(CLAVE);
    } catch {
      return null;
    }
  },
  async escribir(valor: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(CLAVE, valor);
      } catch {
        /* modo privado */
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(CLAVE, valor);
    } catch {
      /* si el almacén falla, al menos que no falle el parte */
    }
  },
  async borrar(): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(CLAVE);
      } catch {
        /* nada */
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(CLAVE);
    } catch {
      /* nada */
    }
  },
};

function comoFallo(error: unknown, donde: Fallo['donde'], fatal: boolean): Fallo {
  const e = error instanceof Error ? error : new Error(String(error));
  return {
    cuando: new Date().toISOString(),
    mensaje: e.message || String(error),
    pila: (e.stack ?? '').split('\n').slice(0, 14).join('\n'),
    donde,
    fatal,
  };
}

/** Guarda el fallo. No espera: si la app se está muriendo, lo que se pueda. */
export function apuntarFallo(error: unknown, donde: Fallo['donde'], fatal: boolean): void {
  void almacen.escribir(JSON.stringify(comoFallo(error, donde, fatal)));
}

/**
 * ENGANCHA EL MANEJADOR GLOBAL. Se llama UNA vez, al cargar la raíz. Guarda y luego deja
 * pasar el fallo al manejador de antes, que en producción cierra la app: no se intenta
 * seguir con una app rota, sólo que la próxima vez se sepa por qué.
 */
export function armarElParteDeFallos(): void {
  const utils = (globalThis as { ErrorUtils?: { getGlobalHandler(): (e: unknown, fatal?: boolean) => void; setGlobalHandler(h: (e: unknown, fatal?: boolean) => void): void } }).ErrorUtils;
  if (utils === undefined) return;
  const deAntes = utils.getGlobalHandler();
  utils.setGlobalHandler((error, fatal) => {
    apuntarFallo(error, 'global', fatal === true);
    deAntes(error, fatal);
  });
}

/**
 * EL ENVOLTORIO. Un `ErrorBoundary` de los de siempre; tiene que ser una clase porque
 * React no da otra forma de recoger un `throw` de render. Pinta el fallo entero —mensaje y
 * pila— porque el objetivo es LEERLO y contarlo, no disimularlo.
 */
export class CazaFallos extends Component<{ children: ReactNode }, { fallo: Fallo | null }> {
  override state: { fallo: Fallo | null } = { fallo: null };

  static getDerivedStateFromError(error: unknown): { fallo: Fallo } {
    return { fallo: comoFallo(error, 'render', true) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    const conComponentes = error instanceof Error ? error : new Error(String(error));
    conComponentes.stack = `${conComponentes.stack ?? ''}\n— en —${info.componentStack ?? ''}`;
    apuntarFallo(conComponentes, 'render', true);
  }

  override render(): ReactNode {
    if (this.state.fallo === null) return this.props.children;
    return (
      <PantallaDelFallo
        fallo={this.state.fallo}
        titulo="Esta pantalla ha fallado"
        alCerrar={() => this.setState({ fallo: null })}
        rotuloDeCerrar="Intentar otra vez"
      />
    );
  }
}

/**
 * EL ÚLTIMO FALLO GUARDADO, al arrancar. Si hay uno, se enseña encima de todo hasta que
 * se pulse «Olvidar»: es lo que hace que un cierre en seco de la vez anterior se pueda
 * contar hoy. Si no hay ninguno, no pinta nada y no cuesta nada.
 */
export function UltimoFallo(): JSX.Element | null {
  const [fallo, ponerFallo] = useState<Fallo | null>(null);
  useEffect(() => {
    let vivo = true;
    void almacen.leer().then((crudo) => {
      if (!vivo || crudo === null) return;
      try {
        ponerFallo(JSON.parse(crudo) as Fallo);
      } catch {
        void almacen.borrar();
      }
    });
    return () => {
      vivo = false;
    };
  }, []);
  if (fallo === null) return null;
  return (
    <View style={estilos.telon} pointerEvents="box-none">
      <PantallaDelFallo
        fallo={fallo}
        titulo="La última vez la app se cerró por esto"
        alCerrar={() => {
          void almacen.borrar();
          ponerFallo(null);
        }}
        rotuloDeCerrar="Olvidar"
      />
    </View>
  );
}

function PantallaDelFallo({
  fallo,
  titulo,
  alCerrar,
  rotuloDeCerrar,
}: {
  fallo: Fallo;
  titulo: string;
  alCerrar: () => void;
  rotuloDeCerrar: string;
}): JSX.Element {
  const texto = `${fallo.cuando} · ${fallo.donde}${fallo.fatal ? ' · fatal' : ''}\n${fallo.mensaje}\n\n${fallo.pila}`;
  return (
    <View style={estilos.caja} accessibilityViewIsModal>
      <Text style={estilos.titulo}>{titulo}</Text>
      <Text style={estilos.mensaje} selectable>
        {fallo.mensaje}
      </Text>
      <ScrollView style={estilos.pilaCaja}>
        <Text style={estilos.pila} selectable>
          {`${fallo.cuando} · ${fallo.donde}${fallo.fatal ? ' · fatal' : ''}\n${fallo.pila}`}
        </Text>
      </ScrollView>
      <View style={estilos.botones}>
        {/* Se COMPARTE en vez de copiarse: `Share` viene con React Native y no mete un
            módulo nativo nuevo la víspera de una partida; el portapapeles lo metería. */}
        <Pressable
          style={estilos.boton}
          accessibilityRole="button"
          onPress={() => {
            Share.share({ message: texto }).catch(() => {
              /* en la web puede no haber con qué compartir: el texto sigue seleccionable */
            });
          }}
        >
          <Text style={estilos.botonRotulo}>Compartir</Text>
        </Pressable>
        <Pressable style={estilos.boton} accessibilityRole="button" onPress={alCerrar}>
          <Text style={estilos.botonRotulo}>{rotuloDeCerrar}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  telon: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  caja: {
    backgroundColor: '#1a1216',
    borderColor: '#b23a3a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    maxHeight: '85%',
    gap: 10,
  },
  titulo: { color: '#f4d9d9', fontSize: 18, fontWeight: '700' },
  mensaje: { color: '#ffffff', fontSize: 15, lineHeight: 21 },
  pilaCaja: { maxHeight: 260, backgroundColor: '#0e0a0c', borderRadius: 8, padding: 8 },
  pila: { color: '#d9c7c7', fontSize: 11, lineHeight: 15, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  botones: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  boton: { backgroundColor: '#b23a3a', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minHeight: 44, justifyContent: 'center' },
  botonRotulo: { color: '#ffffff', fontWeight: '700' },
});
