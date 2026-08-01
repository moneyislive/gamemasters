import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { ChatMessage } from '../../../../shared/types';
import { chatWithAgent } from '../../api/client';
import { emitUiCommand } from '../../lib/uiBus';
import { useAppStore } from '../../state/store';
import { obtenerConstructorVoz } from './speech';
import type { ReconocimientoVoz } from './speech';
import './agentchat.css';

interface AgentChatPanelProps {
  gameId: string;
}

/** Mensaje de bienvenida local del Mayordomo cuando la partida aún no tiene historial. */
function mensajeBienvenida(): ChatMessage {
  return {
    id: 'bienvenida-mayordomo',
    role: 'assistant',
    content:
      'Bienvenido a la mansión. Soy Edmund, su maestro de ceremonias. ' +
      'Cuénteme quiénes asistirán a la velada, qué estancias tiene la casa y qué objetos ' +
      'podrían servir de… arma. Puede escribirme o dictármelo con el micrófono; ' +
      'yo lo anotaré todo con la debida discreción.',
    createdAt: new Date().toISOString(),
  };
}

/** Retrato del Mayordomo: medallón art-decó con monóculo y bigote (SVG inline). */
function AvatarMayordomo() {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Retrato de El Mayordomo">
      <defs>
        <clipPath id="agentchat-medallon">
          <circle cx="32" cy="32" r="29" />
        </clipPath>
      </defs>
      {/* Medallón de fondo */}
      <circle cx="32" cy="32" r="30" fill="var(--felt-800)" stroke="var(--gold-500)" strokeWidth="2" />
      <circle cx="32" cy="32" r="26.5" fill="none" stroke="rgba(201, 162, 39, 0.35)" strokeWidth="1" />
      <g clipPath="url(#agentchat-medallon)">
        {/* Hombros del frac */}
        <path d="M12 62 Q32 42 52 62 L52 64 L12 64 Z" fill="var(--mahogany-800)" />
        <path d="M26 51 L32 47 L38 51 L32 55 Z" fill="var(--parchment)" />
        {/* Cara */}
        <circle cx="32" cy="30" r="13.5" fill="var(--parchment)" />
        {/* Pelo engominado con raya al medio */}
        <path
          d="M18.5 29 Q19 15 32 15 Q45 15 45.5 29 Q42 19.5 32.8 19.5 L32.8 17.4 L31.2 17.4 L31.2 19.5 Q22 19.5 18.5 29 Z"
          fill="var(--mahogany-700)"
        />
        {/* Cejas */}
        <path d="M23.4 26.6 q2.6 -1.9 5.2 -0.4" stroke="var(--mahogany-700)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M35.4 26.2 q2.6 -1.5 5.2 0.4" stroke="var(--mahogany-700)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        {/* Ojos */}
        <circle cx="26.4" cy="29.6" r="1.5" fill="var(--ink)" />
        <circle cx="38" cy="29.6" r="1.5" fill="var(--ink)" />
        {/* Monóculo con cadenilla */}
        <circle cx="38" cy="29.9" r="4.8" fill="none" stroke="var(--gold-400)" strokeWidth="1.5" />
        <path
          d="M41.9 32.8 Q45.6 37 44.2 43.5"
          fill="none"
          stroke="var(--gold-400)"
          strokeWidth="1"
          strokeDasharray="1.7 1.7"
        />
        {/* Nariz */}
        <path d="M32 30 q1.2 3 0 4.6" stroke="rgba(28, 20, 16, 0.55)" strokeWidth="1" fill="none" strokeLinecap="round" />
        {/* Bigote de manillar */}
        <path
          d="M32.2 37.8 q-3.4 -2.1 -6.6 -0.5 q-2.7 1.4 -4.3 -0.7 q0.6 3.6 4.7 3.1 q3.5 -0.4 6.2 -1.9 z"
          fill="var(--mahogany-700)"
        />
        <path
          d="M31.8 37.8 q3.4 -2.1 6.6 -0.5 q2.7 1.4 4.3 -0.7 q-0.6 3.6 -4.7 3.1 q-3.5 -0.4 -6.2 -1.9 z"
          fill="var(--mahogany-700)"
        />
        {/* Boca discreta */}
        <path d="M29.6 41.8 q2.4 1.3 4.8 0" stroke="rgba(28, 20, 16, 0.5)" strokeWidth="1" fill="none" strokeLinecap="round" />
        {/* Pajarita */}
        <path d="M32 55 l-7.5 -3.6 v7.2 z" fill="var(--burgundy-600)" />
        <path d="M32 55 l7.5 -3.6 v7.2 z" fill="var(--burgundy-600)" />
        <circle cx="32" cy="55" r="1.7" fill="var(--gold-400)" />
      </g>
    </svg>
  );
}

/** Icono de micrófono para la entrada por voz. */
function IconoMicrofono() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
      <path d="M5.5 11.5 a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18 v3" />
      <path d="M8.5 21 h7" />
    </svg>
  );
}

/**
 * Panel de chat con el agente de CLUEDO ("El Mayordomo").
 * Streaming SSE, entrada por voz y comandos de UI reenviados al bus.
 */
export default function AgentChatPanel({ gameId }: AgentChatPanelProps) {
  const chatMessages = useAppStore((s) => s.chatMessages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const appendToLastAssistant = useAppStore((s) => s.appendToLastAssistant);
  const setGame = useAppStore((s) => s.setGame);

  const [texto, setTexto] = useState('');
  /** Hay una respuesta del agente en curso (envío deshabilitado). */
  const [ocupado, setOcupado] = useState(false);
  /** Aún no ha llegado el primer delta de texto de la respuesta. */
  const [pensando, setPensando] = useState(false);
  const [grabando, setGrabando] = useState(false);

  const listaRef = useRef<HTMLDivElement | null>(null);
  const pegadoAbajoRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const reconocimientoRef = useRef<ReconocimientoVoz | null>(null);
  const textoBaseRef = useRef('');
  const idSeqRef = useRef(0);

  const vozDisponible = useMemo(() => obtenerConstructorVoz() !== null, []);

  // ---- Historial: cargar al montar (fetch directo al endpoint del contrato) ----
  useEffect(() => {
    let cancelado = false;
    const cargarHistorial = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/chat/messages`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const historial = (await res.json()) as ChatMessage[];
        if (cancelado) return;
        useAppStore.setState({
          chatMessages: historial.length > 0 ? historial : [mensajeBienvenida()],
        });
      } catch {
        // Sin historial disponible: el Mayordomo saluda igualmente.
        if (!cancelado) useAppStore.setState({ chatMessages: [mensajeBienvenida()] });
      }
    };
    void cargarHistorial();
    return () => {
      cancelado = true;
    };
  }, [gameId]);

  // ---- Auto-scroll inteligente: solo si el usuario estaba abajo ----
  const manejarScroll = () => {
    const el = listaRef.current;
    if (!el) return;
    pegadoAbajoRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  useEffect(() => {
    const el = listaRef.current;
    if (el && pegadoAbajoRef.current) el.scrollTop = el.scrollHeight;
  }, [chatMessages, pensando]);

  // ---- Limpieza al desmontar ----
  useEffect(
    () => () => {
      abortRef.current?.abort();
      try {
        reconocimientoRef.current?.abort();
      } catch {
        // El reconocimiento puede haber terminado ya.
      }
    },
    [],
  );

  // ---- Entrada por voz (Web Speech API) ----
  const alternarGrabacion = () => {
    if (grabando) {
      // Segundo click: se detiene y el texto queda listo para enviar.
      reconocimientoRef.current?.stop();
      return;
    }
    const Ctor = obtenerConstructorVoz();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'es-ES';
    rec.interimResults = true;
    rec.continuous = false;
    textoBaseRef.current = texto;
    rec.onresult = (evento) => {
      let dictado = '';
      for (let i = 0; i < evento.results.length; i += 1) {
        dictado += evento.results[i][0].transcript;
      }
      const base = textoBaseRef.current;
      const separador = base.length > 0 && !base.endsWith(' ') ? ' ' : '';
      setTexto(base + separador + dictado);
    };
    rec.onerror = () => {
      setGrabando(false);
      reconocimientoRef.current = null;
    };
    rec.onend = () => {
      setGrabando(false);
      reconocimientoRef.current = null;
    };
    reconocimientoRef.current = rec;
    setGrabando(true);
    rec.start();
  };

  // ---- Envío y flujo SSE ----
  const enviarMensaje = async () => {
    const contenido = texto.trim();
    if (!contenido || ocupado) return;
    if (grabando) reconocimientoRef.current?.stop();

    setTexto('');
    setOcupado(true);
    setPensando(true);
    pegadoAbajoRef.current = true;

    const ahora = new Date().toISOString();
    const seq = idSeqRef.current;
    idSeqRef.current += 2;
    addChatMessage({ id: `local-user-${seq}-${Date.now()}`, role: 'user', content: contenido, createdAt: ahora });
    addChatMessage({ id: `local-assistant-${seq + 1}-${Date.now()}`, role: 'assistant', content: '', createdAt: ahora });

    const controlador = new AbortController();
    abortRef.current = controlador;
    try {
      await chatWithAgent(
        gameId,
        contenido,
        (evento) => {
          switch (evento.type) {
            case 'text':
              setPensando(false);
              appendToLastAssistant(evento.delta);
              break;
            case 'ui':
              emitUiCommand(evento.command);
              break;
            case 'entities':
              setGame(evento.game);
              break;
            case 'error':
              setPensando(false);
              appendToLastAssistant('⚠ ' + evento.message);
              break;
            case 'done':
              setPensando(false);
              break;
          }
        },
        controlador.signal,
      );
    } catch {
      if (!controlador.signal.aborted) {
        appendToLastAssistant('⚠ No he podido contactar con la mansión. Inténtelo de nuevo, se lo ruego.');
      }
    } finally {
      abortRef.current = null;
      setOcupado(false);
      setPensando(false);
    }
  };

  const manejarEnvio = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    void enviarMensaje();
  };

  return (
    <section className="agentchat deco-frame deco-corners" aria-label="Chat con El Mayordomo">
      {/* Cabecera con el retrato del agente */}
      <header className="agentchat__header">
        <div className="agentchat__avatar">
          <AvatarMayordomo />
          <span className="agentchat__status-dot" title="El Mayordomo está de servicio" />
        </div>
        <div className="agentchat__identity">
          <h3 className="agentchat__name">El Mayordomo</h3>
          <p className="agentchat__subtitle">Agente experto en CLUEDO</p>
        </div>
      </header>

      {/* Conversación */}
      <div className="agentchat__messages" ref={listaRef} onScroll={manejarScroll}>
        {chatMessages.map((mensaje, indice) => {
          const esUltimo = indice === chatMessages.length - 1;
          const enCurso = esUltimo && mensaje.role === 'assistant' && ocupado;
          const mostrarPensando = enCurso && pensando && mensaje.content === '';
          return (
            <div key={mensaje.id} className={`agentchat__fila agentchat__fila--${mensaje.role}`}>
              <div className={`agentchat__burbuja agentchat__burbuja--${mensaje.role}`}>
                {mostrarPensando ? (
                  <span className="agentchat__pensando">
                    El Mayordomo está pensando…
                    <span className="agentchat__puntos" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </span>
                ) : (
                  <>
                    {mensaje.content}
                    {enCurso && !pensando && <span className="agentchat__cursor" aria-hidden="true" />}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Redacción y envío */}
      <form className="agentchat__composer" onSubmit={manejarEnvio}>
        {vozDisponible && (
          <button
            type="button"
            className={`agentchat__mic${grabando ? ' agentchat__mic--grabando' : ''}`}
            onClick={alternarGrabacion}
            aria-label={grabando ? 'Detener dictado' : 'Dictar por voz'}
            title={grabando ? 'Detener dictado' : 'Dictar por voz'}
          >
            <IconoMicrofono />
          </button>
        )}
        <input
          className="input agentchat__input"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder={grabando ? 'Escuchando…' : 'Hable con El Mayordomo…'}
          aria-label="Mensaje para El Mayordomo"
          autoComplete="off"
        />
        <button
          type="submit"
          className="btn btn--primary agentchat__send"
          disabled={ocupado || texto.trim() === ''}
        >
          Enviar
        </button>
      </form>
    </section>
  );
}
