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
  acusaciones: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  desenlace: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  ganador: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

export function ProveedorPartida({ children }: { children: React.ReactNode }): JSX.Element {
  const [vista, setVista] = useState<VistaJugador | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const revRef = useRef<number>(-1);
  const activoRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
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
    void api.cargarSesionGuardada().finally(() => setSesionLeida(true));
  }, []);

  const aplicarVista = useCallback((v: VistaJugador) => {
    revRef.current = v.rev;
    setVista(v);
    setError(null);
  }, []);

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
      setError(e instanceof Error ? e.message : 'No se pudo hablar con el servidor.');
    } finally {
      setCargando(false);
    }
  }, [aplicarVista]);

  // ---- Bucle de espera de cambios ----
  useEffect(() => {
    let cancelado = false;

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
          // 204 (sin novedad) o respuesta con datos: en ambos casos se repite.
          setCargando(false);
        } catch (e) {
          if (cancelado) return;
          if (e instanceof api.ErrorApi && e.estado === 401) {
            setError('Tu sesión ha caducado. Vuelve a entrar con tu código.');
            await api.salir();
            setVista(null);
            setCargando(false);
            return;
          }
          // Wifi doméstico: se reintenta con calma en vez de gritar.
          setError('Sin conexión con la partida. Reintentando…');
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
    };

    void bucle();
    return () => {
      cancelado = true;
      abortRef.current?.abort();
    };
  }, [aplicarVista, encolarAvisos, sesionLeida]);

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
    await api.salir();
    revRef.current = -1;
    setVista(null);
  }, []);

  return (
    <Contexto.Provider
      value={{
        vista,
        cargando,
        error,
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
