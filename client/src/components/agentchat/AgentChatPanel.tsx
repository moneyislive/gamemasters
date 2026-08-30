import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { ChatMessage } from '../../../../shared/types';
import { manifiestoDe } from '../../../../shared/juegos';
import { palabrasDe } from '../../juegos/palabras';
import { chatWithAgent } from '../../api/client';
import { emitUiCommand } from '../../lib/uiBus';
import { useAppStore } from '../../state/store';
import { obtenerConstructorVoz } from './speech';
import type { ReconocimientoVoz } from './speech';
import './agentchat.css';

interface AgentChatPanelProps {
  gameId: string;
}

/**
 * El saludo con el que abre una partida sin conversación todavía.
 *
 * Lo escribe cada juego, y no es un adorno: es lo primero que se lee al entrar
 * en el taller y lo que dice de qué va la noche. El mayordomo trata de usted y
 * ofrece anotarlo todo con discreción; el escriba tutea y avisa de que falta
 * poco para el amanecer.
 */
function mensajeBienvenida(juego: string | undefined): ChatMessage {
  return {
    id: `bienvenida-${juego ?? 'cluedo'}`,
    role: 'assistant',
    content: palabrasDe(juego).asistente.bienvenida,
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

/**
 * Retrato de El Escriba: medallón con la cabeza de perfil, como en un muro.
 *
 * NO ES UN MAYORDOMO PINTADO DE OTRO COLOR, y ahí está la diferencia que se
 * nota sin saber decir por qué: el mayordomo mira de frente porque está a su
 * servicio, y el escriba va de perfil porque así se pintaba a la gente en
 * Egipto —hombros de frente, cara de lado— y porque está mirando su papiro, no
 * a ti. Es de la expedición, no del servicio.
 */
function AvatarEscriba() {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Retrato de El Escriba">
      <defs>
        <clipPath id="agentchat-medallon-escriba">
          <circle cx="32" cy="32" r="29" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30" fill="var(--felt-800)" stroke="var(--gold-500)" strokeWidth="2" />
      <circle cx="32" cy="32" r="26.5" fill="none" stroke="rgba(var(--acento-rgb), 0.35)" strokeWidth="1" />
      <g clipPath="url(#agentchat-medallon-escriba)">
        {/* Hombros y túnica de lino */}
        <path d="M13 62 Q32 43 51 62 L51 64 L13 64 Z" fill="var(--mahogany-800)" />
        <path d="M22 60 q10 -7 20 0" fill="none" stroke="var(--parchment)" strokeWidth="1.2" opacity="0.55" />
        {/* Cabeza de perfil, mirando a su izquierda */}
        <path
          d="M38.5 22.5 q-3.5 -7.5 -11 -6.5 q-8 1 -9.5 9 q-1 5.5 1.5 9.5 q1.5 2.4 1.2 4.6 l-0.4 3 q-0.2 1.6 1.4 1.8 l2.4 0.3 l0.2 4.4 q0.1 2.2 2.3 2.2 l7.4 0 q2 0 2 -2 l0 -7.6 q4 -3 4.2 -8.4 q0.2 -5.4 -1.7 -10.3 z"
          fill="var(--parchment)"
        />
        {/* Peluca corta, la que se lleva bajo el sol */}
        <path
          d="M17.6 26 q0.4 -11 11.4 -11.6 q7.6 -0.4 10 6.6 q-4.6 -3.4 -10.4 -3 q-7.4 0.5 -9.2 8 z"
          fill="var(--mahogany-700)"
        />
        <path
          d="M17.4 24.5 q-1.6 6.5 0.4 12.4 l-3.6 0.6 q-2.2 -7.6 0.6 -13.6 z"
          fill="var(--mahogany-700)"
        />
        {/* Ojo perfilado en kohl, el signo que hace egipcia una cara */}
        <path d="M22.4 27.6 q3.2 -2.4 6.4 -0.2" stroke="var(--ink)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <circle cx="25.4" cy="29.4" r="1.6" fill="var(--ink)" />
        <path d="M21 29.6 q3.4 3 7.6 1.2" stroke="var(--ink)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <path d="M29.2 30.6 l3.4 1.6" stroke="var(--ink)" strokeWidth="1.1" strokeLinecap="round" />
        {/* Ceja */}
        <path d="M21.8 24.6 q3.6 -2 7 0" stroke="var(--mahogany-700)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        {/* Boca */}
        <path d="M19.6 37.4 q2.6 1 4.6 -0.4" stroke="rgba(var(--tinta-rgb), 0.55)" strokeWidth="1" fill="none" strokeLinecap="round" />
        {/* Collar de cuentas de fayenza */}
        <path d="M23 49 q9 6 17 1" fill="none" stroke="var(--gold-400)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M23.5 52.5 q9 6 16 1" fill="none" stroke="rgba(var(--contra-rgb), 0.85)" strokeWidth="2" strokeLinecap="round" />
        {/* El cálamo, detrás de la oreja: es lo que le hace escriba */}
        <path d="M31.5 21 l9 -7" stroke="var(--gold-300)" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * Retrato de El Jefe de Estación: de frente, con la gorra de plato puesta.
 *
 * NI SIRVIENTE NI COMPAÑERO DE VIAJE, y la diferencia se ve antes de leer una
 * palabra suya. El mayordomo mira de frente porque está a su servicio y el
 * escriba va de perfil porque está mirando su papiro; este mira de frente
 * porque es la AUTORIDAD de la estación —el Reglamento de Circulación lo dice
 * así— y lo que lleva encima no es un uniforme de casa grande: es la gorra del
 * servicio, con su plato, su visera y su chapa. Tratará de usted toda la noche,
 * y la gorra ya lo estaba diciendo.
 *
 * La chapa de la gorra es el aspa del paso a nivel, el mismo signo que va en el
 * centro del plano y en el trofeo «El Correo pasó». A este tamaño no se lee como
 * un aspa —son cinco píxeles— pero se lee como que ahí hay una chapa, que es
 * exactamente lo que se ve en una fotografía de 1927.
 */
function AvatarNudo() {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Retrato de El Jefe de Estación">
      <defs>
        <clipPath id="agentchat-medallon-jefe">
          <circle cx="32" cy="32" r="29" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30" fill="var(--felt-800)" stroke="var(--gold-500)" strokeWidth="2" />
      <circle cx="32" cy="32" r="26.5" fill="none" stroke="rgba(var(--acento-rgb), 0.35)" strokeWidth="1" />
      <g clipPath="url(#agentchat-medallon-jefe)">
        {/*
          EL ORDEN DE ESTOS TRAZOS ES LA MITAD DEL DIBUJO, y se aprendió mirando
          el del mayordomo: entre la barbilla y el hombro hay ocho unidades de
          fondo, y cualquier cosa que se pinte ahí suelta —un pico de cuello, una
          corbata— se queda flotando en el fieltro como un recorte. Así que
          primero el cuello, que TAPA ese hueco, encima la guerrera, y solo
          después lo que va cosido a ella.
        */}
        <path d="M28.2 41 h7.6 v13 h-7.6 z" fill="var(--parchment)" />
        {/* La guerrera del servicio, abotonada hasta arriba porque hace ocho bajo cero */}
        <path d="M11 62 Q32 44 53 62 L53 64 L11 64 Z" fill="var(--mahogany-800)" />
        {/* Cuello duro, corbata negra de reglamento y los dos botones dorados */}
        <path
          d="M28.4 54.4 L32 58.8 L35.6 54.4"
          fill="none"
          stroke="var(--parchment)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M32 58 l-2.2 2 l2.2 6 l2.2 -6 z" fill="var(--ink)" />
        <circle cx="24.6" cy="56.4" r="1.3" fill="var(--gold-400)" />
        <circle cx="39.4" cy="56.4" r="1.3" fill="var(--gold-400)" />
        {/* Cara */}
        <circle cx="32" cy="32.5" r="13.5" fill="var(--parchment)" />
        {/* El plato de la gorra, más ancho que la cabeza: es lo que la hace de plato */}
        <path d="M18 23.6 L17.2 17.4 Q17 14.6 21 14.3 L43 14.3 Q47 14.6 46.8 17.4 L46 23.6 Z" fill="var(--mahogany-700)" />
        {/* La cinta, la chapa del aspa y la visera charolada */}
        <path d="M18 23.4 h28 v3.4 h-28 z" fill="var(--ink)" />
        <path d="M29.8 22.9 l4.4 2.4 M34.2 22.9 l-4.4 2.4" stroke="var(--gold-300)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M15.4 26.6 Q32 33.2 48.6 26.6 Q32 29.6 15.4 26.6 Z" fill="var(--ink)" />
        {/* Cejas y ojos: treinta años de turnos de noche, y ninguno de sorpresa */}
        <path d="M24.4 31.4 q2.8 -1 5.6 0" stroke="rgba(var(--tinta-rgb), 0.5)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <path d="M34 31.4 q2.8 -1 5.6 0" stroke="rgba(var(--tinta-rgb), 0.5)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <circle cx="27.2" cy="33.8" r="1.5" fill="var(--ink)" />
        <circle cx="36.8" cy="33.8" r="1.5" fill="var(--ink)" />
        {/* Nariz */}
        <path d="M32 34.2 q1.2 3.2 0 4.8" stroke="rgba(var(--tinta-rgb), 0.55)" strokeWidth="1" fill="none" strokeLinecap="round" />
        {/*
          BIGOTE DE CEPILLO, recto y recortado, y no el de manillar del
          mayordomo: el de manillar es de salón y este hombre se afeita a las
          cinco de la mañana en un cuarto sin espejo bueno.
        */}
        <path
          d="M27.6 39.4 q4.4 -1.3 8.8 0 q0.5 2.5 -0.6 3 q-3.8 0.8 -7.6 0 q-1.1 -0.5 -0.6 -3 z"
          fill="var(--mahogany-700)"
        />
        {/* Boca: una línea recta. Aquí no se sonríe hasta que cruza el sexto */}
        <path d="M29.6 44 h4.8" stroke="rgba(var(--tinta-rgb), 0.5)" strokeWidth="1" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * Qué cara pone el asistente de cada juego.
 *
 * Tabla y no campo del manifiesto por la misma razón que las cortinillas de
 * entrada: un retrato son cuarenta trazos de SVG, y eso es código. Lo que sí
 * dice el manifiesto es CÓMO SE LLAMA, y de ahí sale el nombre que se lee.
 */
const RETRATOS: Record<string, () => JSX.Element> = {
  cluedo: AvatarMayordomo,
  momia: AvatarEscriba,
  nudo: AvatarNudo,
};

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
 * Panel de chat con el asistente del juego que se esté preparando.
 *
 * Streaming SSE, entrada por voz y comandos de UI reenviados al bus.
 *
 * QUIÉN CONTESTA lo dice la partida: El Mayordomo en la mansión, El Escriba en
 * la expedición. El nombre sale del manifiesto (`asistente.nombre`) y no de una
 * constante, que era lo que había: un panel que llamaba «Mayordomo» a quien
 * contestara, aunque quien contestara ya no lo fuese.
 */
export default function AgentChatPanel({ gameId }: AgentChatPanelProps) {
  const game = useAppStore((s) => s.game);
  const juego = game?.settings?.juego;
  const asistente = manifiestoDe(juego).asistente;
  const palabras = palabrasDe(juego).asistente;
  const Retrato = RETRATOS[juego ?? 'cluedo'] ?? AvatarMayordomo;
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
          chatMessages: historial.length > 0 ? historial : [mensajeBienvenida(juego)],
        });
      } catch {
        // Sin historial disponible: el asistente saluda igualmente.
        if (!cancelado) useAppStore.setState({ chatMessages: [mensajeBienvenida(juego)] });
      }
    };
    void cargarHistorial();
    return () => {
      cancelado = true;
    };
  }, [gameId, juego]);

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
        /*
         * EL AVISO LO DA EL ASISTENTE, ASÍ QUE HABLA COMO ÉL. Aquí había una
         * cadena escrita a mano que decía «no he podido contactar con la
         * mansión», y sale DENTRO de la burbuja de quien te estaba hablando:
         * el Escriba, el Guía y el Jefe de Estación se referían a una casa que
         * en su juego no existe, en la única frase que se lee cuando algo va
         * mal. Ahora sale de `palabras.ts`, como el resto de lo que dicen.
         */
        appendToLastAssistant(palabras.sinLinea);
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
    <section
      className="agentchat deco-frame deco-corners"
      aria-label={`Chat con ${asistente.nombre}`}
    >
      {/* Cabecera con el retrato del agente */}
      <header className="agentchat__header">
        <div className="agentchat__avatar">
          <Retrato />
          <span className="agentchat__status-dot" title={palabras.servicio} />
        </div>
        <div className="agentchat__identity">
          <h3 className="agentchat__name">{asistente.nombre}</h3>
          <p className="agentchat__subtitle">{palabras.subtitulo}</p>
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
                    {palabras.pensando}
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
          placeholder={grabando ? 'Escuchando…' : palabras.marcador}
          aria-label={`Mensaje para ${asistente.nombre}`}
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
