/**
 * Estado de la partida en el móvil.
 *
 * Un único bucle mantiene la vista al día: pide al servidor «avísame cuando
 * algo cambie desde la revisión N» y se queda esperando. Cuando el Game Master
 * abre una ronda, los doce móviles se enteran a la vez y sin sondear.
 *
 * El bucle se detiene al pasar la app a segundo plano y se reanuda al volver,
 * que es lo que hace la gente cada dos minutos durante una cena.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as api from './api';
import { hayQueAvisar, repartirFallo } from './conexion-reglas';
import type { AvisoClave, VistaJugador } from '../../shared/live';

export interface Aviso {
  clave: AvisoClave;
  texto: string;
  /** Para animar solo el más reciente. */
  id: number;
}

interface Estado {
  vista: VistaJugador | null;
  cargando: boolean;
  /**
   * NO LLEGAMOS AL SERVIDOR. Es de la plataforma, no de una partida.
   *
   * Se pone al fallar la petición sin llegar a haber respuesta —wifi caída,
   * servidor apagado— y se quita en cuanto el servidor vuelve a contestar
   * cualquier cosa, incluido un 204 de «no hay novedad». Un 204 no es «no sé si
   * hay red»: es el servidor hablando.
   */
  sinRed: boolean;
  /**
   * Algo pasa con ESTA partida, y no es la red.
   *
   * La sesión caducó, te sacaron, la partida se cerró. Son cosas de UNA partida
   * y por eso llevan su `gameId`: se pueden perder los hilos de una velada y
   * seguir teniendo los de las demás, así que decirlo con una franja a lo ancho
   * de la app sería mentir sobre el alcance del problema. Se cuelga de su fila
   * en el panel de partidas.
   */
  avisoDePartida: { gameId: string | null; texto: string } | null;
  /**
   * Lo que le pasa a la partida abierta, sea lo que sea.
   *
   * Derivado de los dos de arriba, y solo para las pantallas que necesitan
   * decir algo cuando NO HAY VISTA que enseñar. No lo use nadie para pintar
   * franjas: para eso están los dos campos de arriba, que distinguen.
   */
  error: string | null;
  /** Aviso pendiente de celebrar en pantalla. */
  aviso: Aviso | null;
  descartarAviso: () => void;
  refrescar: () => Promise<void>;
  aplicarVista: (v: VistaJugador) => void;
  desconectar: () => Promise<void>;
}

const Contexto = createContext<Estado | null>(null);

/** Vibración distinta según lo que haya pasado: se nota sin mirar. */
const VIBRACION: Partial<Record<AvisoClave, () => void>> = {
  'ronda-abierta': () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  'ronda-cerrada': () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  giro: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  ayuda: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  respuestas: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  desenlace: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  ganador: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

export function ProveedorPartida({ children }: { children: React.ReactNode }): JSX.Element {
  const [vista, setVista] = useState<VistaJugador | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sinRed, setSinRed] = useState(false);
  const [avisoDePartida, setAvisoDePartida] = useState<
    { gameId: string | null; texto: string } | null
  >(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const revRef = useRef<number>(-1);
  const activoRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  /*
   * Fallos SEGUIDOS de plataforma. Se lleva en una ref y no en estado porque
   * cambiarlo no tiene que repintar nada: lo unico que se pinta es el veredicto
   * de `hayQueAvisar`, y ese ya vive en `sinRed`.
   */
  const fallosSeguidos = useRef(0);
  const contadorAviso = useRef(0);
  /**
   * La credencial guardada se lee AQUÍ, no en la pantalla de entrada.
   *
   * Si solo se leyera allí, abrir la app directamente en cualquier otra
   * pantalla —al recargar, al volver de segundo plano o desde un enlace— dejaba
   * el módulo sin testigo y la partida cargando para siempre.
   */
  const [sesionLeida, setSesionLeida] = useState(false);

  useEffect(() => {
    void api
      .cargarSesionGuardada()
      /*
       * El aviso guardado se recupera aquí. Sin esto, abrir el panel de
       * partidas con la app recién arrancada no enseña nada: el problema sigue
       * ahí, pero el aviso se quedó en el árbol de React de antes.
       */
      .then(() => setAvisoDePartida(api.avisoDePartidaGuardado()))
      .finally(() => setSesionLeida(true));
  }, []);

  /*
   * El aviso se escribe SIEMPRE por aquí, nunca con `setAvisoDePartida` a pelo.
   * Memoria y disco tienen que decir lo mismo: si divergen, la pantalla enseña
   * una cosa y el panel otra, y no hay forma de saber cuál miente.
   */
  const anotarAviso = useCallback((nuevo: { gameId: string | null; texto: string } | null) => {
    setAvisoDePartida(nuevo);
    void api.fijarAvisoDePartida(nuevo);
  }, []);

  const aplicarVista = useCallback((v: VistaJugador) => {
    revRef.current = v.rev;
    setVista(v);
    // Una vista nueva demuestra las dos cosas a la vez.
    setSinRed(false);
    anotarAviso(null);
  }, [anotarAviso]);

  const encolarAvisos = useCallback((lista: Array<{ clave: string; texto: string }>) => {
    if (lista.length === 0) return;
    const ultimo = lista[lista.length - 1]!;
    contadorAviso.current += 1;
    setAviso({ clave: ultimo.clave as AvisoClave, texto: ultimo.texto, id: contadorAviso.current });
    VIBRACION[ultimo.clave as AvisoClave]?.();
  }, []);

  const refrescar = useCallback(async () => {
    try {
      const r = await api.pedirVista();
      if (r) {
        aplicarVista(r.vista);
      }
    } catch (e) {
      // Mismo reparto que en el bucle, y por el mismo sitio.
      const { sinRed: esDeLaRed, deLaPartida } = repartirFallo(
        e instanceof api.ErrorApi ? e.estado : 0,
      );
      fallosSeguidos.current = esDeLaRed ? fallosSeguidos.current + 1 : 0;
      setSinRed(esDeLaRed && hayQueAvisar(fallosSeguidos.current));
      if (deLaPartida) {
        anotarAviso({
          gameId: api.partidaActiva(),
          texto: e instanceof Error ? e.message : 'No se pudo hablar con el servidor.',
        });
      }
    } finally {
      setCargando(false);
    }
  }, [aplicarVista, anotarAviso]);

  // ---- Bucle de espera de cambios ----
  useEffect(() => {
    let cancelado = false;
    /**
     * Espera creciente entre reintentos, de 2,5 s a 20 s.
     *
     * Con una espera fija, un móvil sin cobertura se pasa la velada entera
     * pidiendo cada 2,5 segundos: gasta batería, calienta el teléfono y no
     * consigue nada. Creciendo, el que está de verdad desconectado deja de
     * insistir, y el que solo tuvo un tropiezo se recupera igual de rápido
     * porque la espera se reinicia en cuanto una petición sale bien.
     */
    let espera = 2500;
    const MAX_ESPERA = 20000;

    const bucle = async (): Promise<void> => {
      while (!cancelado) {
        if (!sesionLeida) {
          await new Promise((r) => setTimeout(r, 120));
          continue;
        }
        if (!api.haySesion()) {
          // Sin credencial no hay nada que esperar: se deja de cargar para que
          // la pantalla de entrada pueda pedir los códigos.
          setCargando(false);
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
        if (!activoRef.current) {
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
        const control = new AbortController();
        abortRef.current = control;
        try {
          const desde = revRef.current >= 0 ? revRef.current : undefined;
          const r = await api.pedirVista(desde, control.signal);
          if (cancelado) return;
          if (r) {
            aplicarVista(r.vista);
            encolarAvisos(r.avisos);
          }
          /*
           * 204 (sin novedad) o respuesta con datos: en ambos casos se repite, y
           * EN AMBOS SE RETIRAN LOS DOS AVISOS. Un 204 no es «no ha pasado nada,
           * no sé si hay red»: es el servidor contestando, o sea la prueba misma
           * de que hay conexión y de que esta partida sigue en pie.
           *
           * Antes solo lo hacía `aplicarVista`, y esa solo corre cuando llega
           * una vista NUEVA. En una partida tranquila —quien dirige aún no ha
           * abierto la ronda, nadie ha hecho nada— el sondeo contesta 204 una y
           * otra vez, así que después de un corte el aviso se quedaba puesto
           * PARA SIEMPRE con el móvil perfectamente conectado.
           */
          fallosSeguidos.current = 0;
          setSinRed(false);
          anotarAviso(null);
          setCargando(false);
          espera = 2500;
        } catch (e) {
          if (cancelado) return;

          /*
           * UNA CANCELACIÓN NUESTRA NO ES UN FALLO, y confundirla con uno era
           * medio problema de la franja pegada.
           *
           * El sondeo largo se aborta a propósito en dos sitios: al irse la app
           * a segundo plano y al desmontarse el proveedor. Los dos llegan aquí
           * como un aborto sin código HTTP, indistinguible de «no hay red» si no
           * se mira la señal. Resultado: bastaba con mirar el móvil, salir a
           * otra app y volver para que apareciera «Sin conexión» estando
           * perfectamente conectado.
           */
          if (control.signal.aborted) {
            // Con espera, no `continue` a secas: si algún día se abortara sin
            // que ninguna de las dos guardas de arriba lo pare, esto sería un
            // bucle cerrado quemando la batería.
            await new Promise((r) => setTimeout(r, 200));
            continue;
          }

          const estado = e instanceof api.ErrorApi ? e.estado : 0;

          // De quién es el problema lo decide `repartirFallo`, en un solo sitio.
          // CUANDO contarlo lo decide `hayQueAvisar`: un tropiezo suelto no es
          // una caida, y el sondeo largo los provoca solo.
          const esDeLaRed = repartirFallo(estado).sinRed;
          fallosSeguidos.current = esDeLaRed ? fallosSeguidos.current + 1 : 0;
          setSinRed(esDeLaRed && hayQueAvisar(fallosSeguidos.current));

          if (estado === 401) {
            /*
             * La credencial ya no vale: ha caducado (duran 30 días, y una
             * campaña puede tener jornadas más separadas que eso) o quien
             * dirige ha cerrado y reabierto la partida.
             *
             * Antes esto hacía `return`, y ahí estaba el fallo: el bucle vive
             * en un efecto cuyas dependencias no cambian nunca, y el proveedor
             * cuelga de la raíz y no se desmonta ni volviendo a la entrada. Al
             * salirse, la app se quedaba MUDA el resto de la velada: el jugador
             * volvía a entrar, veía su pantalla, y no se enteraba de una sola
             * ronda más. Ahora se sigue dando vueltas: sin credencial el bucle
             * cae en la espera de arriba y se reengancha solo en cuanto se
             * entra de nuevo.
             */
            anotarAviso({
              gameId: api.partidaActiva(),
              texto: 'Tu sesión ha caducado. Vuelve a entrar con tu código.',
            });
            await api.salirDeLaPartida();
            revRef.current = -1;
            setVista(null);
            setCargando(false);
            continue;
          }

          if (estado === 403 || estado === 404) {
            // La partida se cerró, o ya no participo. Puede ser definitivo,
            // pero también pasajero —el servidor responde 403 mientras se
            // regenera la trama—, así que no se corta: se espera más y se
            // vuelve a mirar.
            anotarAviso({
              gameId: api.partidaActiva(),
              texto:
                estado === 404
                  ? 'La partida ya no está en juego. Si sigue la velada, pide un código nuevo.'
                  : 'Ya no participas en esta partida.',
            });
            setCargando(false);
          } else {
            // Lo de la plataforma no lleva aviso propio: la franja de arriba lo
            // dice todo, y ya la ha puesto `repartirFallo`.
            setCargando(false);
          }

          await new Promise((r) => setTimeout(r, espera));
          espera = Math.min(espera * 2, MAX_ESPERA);
        }
      }
    };

    void bucle();
    return () => {
      cancelado = true;
      abortRef.current?.abort();
    };
  }, [anotarAviso, aplicarVista, encolarAvisos, sesionLeida]);

  // ---- Pausa en segundo plano ----
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      const activo = estado === 'active';
      activoRef.current = activo;
      if (!activo) abortRef.current?.abort();
    });
    return () => sub.remove();
  }, []);

  const desconectar = useCallback(async () => {
    await api.olvidarPartida();
    revRef.current = -1;
    setVista(null);
    setSinRed(false);
    setAvisoDePartida(null);
  }, []);

  return (
    <Contexto.Provider
      value={{
        vista,
        cargando,
        sinRed,
        avisoDePartida,
        /*
         * Derivado, y solo para pantallas que tienen que decir algo cuando no
         * hay vista. Manda el aviso de la partida: si la partida se cerro, eso
         * es mas concreto que decir que no hay red.
         */
        error: avisoDePartida?.texto ?? (sinRed ? 'Sin conexión. Reintentando…' : null),
        aviso,
        descartarAviso: () => setAviso(null),
        refrescar,
        aplicarVista,
        desconectar,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function usePartida(): Estado {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('usePartida fuera del proveedor');
  return ctx;
}

/**
 * Lo mismo, pero sin reventar si no hay proveedor encima.
 *
 * Existe por el tema: `useTema()` lo usan piezas de `ui.tsx` que se pintan
 * TAMBIEN fuera de la partida —la portada, la pantalla de entrar, un aviso de
 * error de red— donde el proveedor no esta montado. La version que lanza es la
 * correcta para una pantalla de juego, que sin partida no tiene nada que
 * ensenar; para decidir un color, no: ahi la respuesta buena es «no se a que se
 * juega, usa el tema de siempre».
 */
export function usePartidaSiLaHay(): Estado | null {
  return useContext(Contexto);
}
