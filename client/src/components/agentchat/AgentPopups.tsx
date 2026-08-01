import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../state/store';
import type { AgentPopup } from '../../state/store';
import './agentchat.css';

/** Duración del auto-cierre (debe coincidir con la animación de la barra en agentchat.css). */
const AUTO_CIERRE_MS = 7000;

type TonoPopup = AgentPopup['tone'];

/** Sello de cera lacrada según el tono del aviso. */
function SelloDeCera({ tone }: { tone: TonoPopup }) {
  return (
    <svg viewBox="0 0 44 44" className="agentpopup__sello" aria-hidden="true">
      {/* Mancha de lacre irregular */}
      <path
        d="M22 3.5 C30 2 37.5 8 39.5 16 C41.5 25 36 34.5 27 37.5 C17.5 40.6 7.5 35 5.2 25.5 C3 16.5 10 5.5 22 3.5 Z"
        fill="currentColor"
      />
      {/* Relieve del sello */}
      <circle cx="22" cy="21" r="13.5" fill="none" stroke="rgba(0, 0, 0, 0.25)" strokeWidth="1.2" />
      <circle cx="22" cy="21" r="15.5" fill="none" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="0.8" />
      {tone === 'mystery' && (
        <g stroke="var(--parchment)" strokeWidth="2.2" fill="none" strokeLinecap="round">
          {/* Lupa del misterio */}
          <circle cx="19.5" cy="18.5" r="6" />
          <path d="M24 23 L30 29" strokeWidth="2.8" />
        </g>
      )}
      {tone === 'success' && (
        <path
          d="M14.5 21.5 l5.5 5.5 l10 -11"
          stroke="var(--parchment)"
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {tone === 'info' && (
        <g fill="var(--parchment)">
          <circle cx="22" cy="14" r="2.2" />
          <rect x="20" y="18.5" width="4" height="11" rx="2" />
        </g>
      )}
    </svg>
  );
}

/** Tarjeta individual: telegrama de la mansión con auto-cierre. */
function TarjetaPopup({ popup }: { popup: AgentPopup }) {
  const dismissPopup = useAppStore((s) => s.dismissPopup);

  useEffect(() => {
    const temporizador = window.setTimeout(() => dismissPopup(popup.id), AUTO_CIERRE_MS);
    return () => window.clearTimeout(temporizador);
  }, [popup.id, dismissPopup]);

  return (
    <motion.article
      layout
      className={`agentpopup agentpopup--${popup.tone}`}
      initial={{ opacity: 0, y: -70, rotate: -10, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      exit={{ opacity: 0, x: 70, rotate: 6, transition: { duration: 0.25, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      role="status"
    >
      <SelloDeCera tone={popup.tone} />
      <div className="agentpopup__contenido">
        <h4 className="agentpopup__titulo">{popup.title}</h4>
        <p className="agentpopup__cuerpo">{popup.body}</p>
      </div>
      <button
        type="button"
        className="agentpopup__cerrar"
        onClick={() => dismissPopup(popup.id)}
        aria-label="Cerrar aviso"
        title="Cerrar aviso"
      >
        ×
      </button>
      <span className="agentpopup__tiempo" aria-hidden="true" />
    </motion.article>
  );
}

/**
 * Pila de avisos del agente en la esquina superior derecha.
 * Tarjetas estilo naipe/telegrama años 20 que entran girando como un naipe.
 */
export default function AgentPopups() {
  const popups = useAppStore((s) => s.popups);

  return (
    <div className="agentpopups" aria-live="polite">
      <AnimatePresence>
        {popups.map((popup) => (
          <TarjetaPopup key={popup.id} popup={popup} />
        ))}
      </AnimatePresence>
    </div>
  );
}
