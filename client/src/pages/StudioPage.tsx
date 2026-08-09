/**
 * StudioPage — el estudio de creación de un caso de CLUEDO.
 * Cabecera con nombre editable, selector de modelo e indicadores; columna
 * izquierda con el chat del agente; zona principal con pestañas
 * (sospechosos / salas / armas / tablero / dosieres) y el botón dorado
 * de acción. Suscribe el bus de comandos de UI del agente.
 *
 * COHERENCIA DE LA PARTIDA: `computeStaleness` (compartida con el servidor)
 * dice si la trama y los dosieres siguen correspondiéndose con los jugadores,
 * salas y objetos actuales. De ahí salen la insignia de la cabecera y los tres
 * estados del botón principal: generar, actualizar o regenerar desde cero.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { HighlightTarget, ModelId } from '../../../shared/types';
import { computeStaleness } from '../../../shared/staleness';
import { setConfigModel } from '../api/client';
import { useAppStore } from '../state/store';
import { onUiCommand } from '../lib/uiBus';
import AgentChatPanel from '../components/agentchat/AgentChatPanel';
import AgentPopups from '../components/agentchat/AgentPopups';
import SuspectsPanel from '../components/studio/SuspectsPanel';
import RoomsPanel from '../components/studio/RoomsPanel';
import WeaponsPanel from '../components/studio/WeaponsPanel';
import StylePanel from '../components/studio/StylePanel';
import BoardView from '../components/board/BoardView';
import DocumentsPanel from '../components/documents/DocumentsPanel';
import LivePanel from '../components/live/LivePanel';
import GenerateOverlay, { startGeneration, startRefresh } from '../components/generate/GenerateOverlay';
import '../styles/studio.css';

type StudioTab = Extract<
  HighlightTarget,
  'suspects' | 'rooms' | 'weapons' | 'style' | 'board' | 'documents' | 'live'
>;

/** Qué hace el botón principal según el estado de la partida. */
type AccionPrincipal = 'generar' | 'actualizar' | 'regenerar';

const TABS: ReadonlyArray<{ id: StudioTab; label: string; symbol: string }> = [
  { id: 'suspects', label: 'Sospechosos', symbol: '♟' },
  { id: 'rooms', label: 'Salas', symbol: '⌂' },
  { id: 'weapons', label: 'Armas', symbol: '†' },
  { id: 'style', label: 'Estilo', symbol: '✒' },
  { id: 'board', label: 'Tablero', symbol: '▦' },
  { id: 'documents', label: 'Dosieres', symbol: '❧' },
  { id: 'live', label: 'En vivo', symbol: '◉' },
];

const DEMO_TIP =
  'Sin clave de API de Anthropic: el mayordomo responde con un guion local. ' +
  'Añada ANTHROPIC_API_KEY al servidor para el agente completo.';

/** Milisegundos que la confirmación de "regenerar" permanece armada. */
const CONFIRMACION_MS = 4000;

export default function StudioPage() {
  const { gameId, juego } = useParams<{ gameId: string; juego: string }>();
  const navigate = useNavigate();

  const game = useAppStore((s) => s.game);
  const config = useAppStore((s) => s.config);
  const loadingGame = useAppStore((s) => s.loadingGame);
  const activeTab = useAppStore((s) => s.activeTab);
  const highlight = useAppStore((s) => s.highlight);
  const generating = useAppStore((s) => s.generating);

  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [changingModel, setChangingModel] = useState(false);
  /** Primer clic dado en "Regenerar desde cero": esperando confirmación. */
  const [confirmandoRegenerar, setConfirmandoRegenerar] = useState(false);

  const highlightTimer = useRef<number | undefined>(undefined);
  const toastTimer = useRef<number | undefined>(undefined);
  const confirmTimer = useRef<number | undefined>(undefined);

  /** Informe de coherencia: qué ha quedado desincronizado desde la generación. */
  const informe = useMemo(() => (game ? computeStaleness(game) : null), [game]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  /** Enciende el resaltado dorado y lo apaga solo a los ~3,5 s. */
  const flashHighlight = useCallback((target: HighlightTarget) => {
    useAppStore.getState().setHighlight(target);
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => {
      useAppStore.getState().setHighlight(null);
    }, 3500);
  }, []);

  /* Carga de la partida y de la configuración */
  useEffect(() => {
    if (!gameId) return;
    setLoadError(false);
    useAppStore
      .getState()
      .loadGame(gameId)
      .catch(() => setLoadError(true));
    useAppStore
      .getState()
      .fetchConfig()
      .catch(() => {
        /* la configuración no es crítica para pintar el estudio */
      });
  }, [gameId]);

  /* Suscripción al bus de comandos de UI del agente */
  useEffect(() => {
    const unsubscribe = onUiCommand((command) => {
      const store = useAppStore.getState();
      switch (command.kind) {
        case 'popup':
          store.pushPopup(command);
          break;
        case 'highlight':
          flashHighlight(command.target);
          break;
        case 'navigate':
          // 'generate' no es una pestaña: lo interpretamos como resaltar el botón.
          if (command.target === 'generate') flashHighlight('generate');
          else store.setActiveTab(command.target);
          break;
        case 'start_generation':
          void startGeneration().catch(() =>
            showToast('No se pudo iniciar la generación del misterio.'),
          );
          break;
      }
    });
    return unsubscribe;
  }, [flashHighlight, showToast]);

  /* Limpieza al desmontar el estudio */
  useEffect(
    () => () => {
      window.clearTimeout(highlightTimer.current);
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(confirmTimer.current);
      useAppStore.getState().setHighlight(null);
    },
    [],
  );

  /* Sincroniza el borrador del nombre con la partida cargada */
  useEffect(() => {
    setNameDraft(game?.name ?? '');
  }, [game?.id, game?.name]);

  if (!gameId) return <Navigate to={`/${juego ?? ''}`} replace />;

  const ready = game !== null && game.id === gameId;

  /* ---------- Acciones de cabecera ---------- */

  const commitName = async () => {
    if (!ready) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === game.name) {
      setNameDraft(game.name);
      return;
    }
    try {
      await useAppStore.getState().patchGame({ name: trimmed });
    } catch {
      setNameDraft(game.name);
      showToast('No se pudo renombrar el caso.');
    }
  };

  const onNameKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      setNameDraft(game?.name ?? '');
      event.currentTarget.blur();
    }
  };

  const handleModelChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const model = event.target.value as ModelId;
    setChangingModel(true);
    try {
      await setConfigModel(model);
      await useAppStore.getState().fetchConfig();
    } catch {
      showToast('No se pudo cambiar el modelo.');
    } finally {
      setChangingModel(false);
    }
  };

  /* ---------- Requisitos de generación ---------- */

  const suspectCount = game?.suspects.length ?? 0;
  const roomCount = game?.rooms.length ?? 0;
  const weaponCount = game?.weapons.length ?? 0;

  const missing: string[] = [];
  if (suspectCount < 3) missing.push(`sospechosos (${suspectCount}/3)`);
  if (roomCount < 4) missing.push(`salas (${roomCount}/4)`);
  if (weaponCount < 3) missing.push(`armas (${weaponCount}/3)`);

  const generateDisabled = generating || missing.length > 0;

  const handleGenerate = () => {
    void startGeneration().catch(() =>
      showToast('No se pudo iniciar la generación del misterio.'),
    );
  };

  const handleRefresh = () => {
    void startRefresh().catch(() => showToast('No se pudo actualizar el misterio.'));
  };

  /** Regenerar descarta la trama actual: se pide confirmación en dos pasos. */
  const handleRegenerate = () => {
    if (!confirmandoRegenerar) {
      setConfirmandoRegenerar(true);
      window.clearTimeout(confirmTimer.current);
      // La confirmación se desarma sola para no dejar el botón "cargado".
      confirmTimer.current = window.setTimeout(
        () => setConfirmandoRegenerar(false),
        CONFIRMACION_MS,
      );
      return;
    }
    window.clearTimeout(confirmTimer.current);
    setConfirmandoRegenerar(false);
    handleGenerate();
  };

  /* ---------- Estado del botón principal ---------- */

  const accion: AccionPrincipal =
    informe && informe.hasPlot ? (informe.isStale ? 'actualizar' : 'regenerar') : 'generar';

  const primeraCausa = informe?.summary[0] ?? '';

  let accionTip: string;
  if (generating) {
    accionTip = 'El mayordomo ya está trabajando…';
  } else if (accion === 'generar') {
    accionTip =
      missing.length > 0
        ? `Faltan ingredientes: ${missing.join(', ')}.`
        : 'Genera la trama, el tablero y los dosieres de los jugadores.';
  } else if (accion === 'actualizar') {
    accionTip = `${primeraCausa} Se rehará solo lo necesario y se conservará la trama${
      informe?.needsAgent ? ', con ayuda del mayordomo para lo que falte' : ', sin consumir IA'
    }.`;
  } else if (confirmandoRegenerar) {
    accionTip = 'Pulse otra vez para descartar el misterio actual y escribir uno nuevo.';
  } else {
    accionTip =
      missing.length > 0
        ? `Faltan ingredientes: ${missing.join(', ')}.`
        : 'Descarta la trama y los dosieres actuales y escribe un misterio completamente nuevo.';
  }

  const insigniaStaleTip =
    accion === 'actualizar'
      ? `${primeraCausa} Vaya a los dosieres para ponerlo al día.`
      : '';

  /* ---------- Contenido de pestaña ---------- */

  const tabCount = (id: StudioTab): number | null => {
    if (!game) return null;
    switch (id) {
      case 'suspects':
        return game.suspects.length;
      case 'rooms':
        return game.rooms.length;
      case 'weapons':
        return game.weapons.length;
      case 'documents':
        return game.documents?.length ?? null;
      default:
        return null;
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'rooms':
        return <RoomsPanel />;
      case 'weapons':
        return <WeaponsPanel />;
      case 'style':
        return <StylePanel />;
      case 'board':
        return <BoardView />;
      case 'documents':
        return <DocumentsPanel />;
      case 'live':
        return <LivePanel />;
      case 'suspects':
      default:
        return <SuspectsPanel />;
    }
  };

  /* ---------- Estados de carga / error ---------- */

  if (loadError) {
    return (
      <div className="studio-fallback">
        <div className="deco-frame deco-corners studio-fallback-card">
          <h2>El expediente se ha extraviado</h2>
          <p className="text-dim text-italic">
            No se pudo abrir este caso. Quizá fue borrado o el servidor no responde.
          </p>
          <button className="btn" onClick={() => navigate(`/${juego ?? ''}`)}>
            ← Volver al recibidor
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="studio-fallback">
        <p className="text-italic studio-loading-text">
          {loadingGame ? 'Abriendo el expediente…' : 'Buscando el expediente…'}
        </p>
      </div>
    );
  }

  return (
    <div className="studio">
      <header className="studio-header deco-frame">
        <button className="btn btn--ghost btn--sm studio-back" onClick={() => navigate(`/${juego ?? ''}`)}>
          ← Recibidor
        </button>

        <div className="studio-name-wrap">
          <span className="studio-kicker mono-caps">Expediente</span>
          <input
            className="studio-name"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={() => void commitName()}
            onKeyDown={onNameKey}
            aria-label="Nombre del caso"
            spellCheck={false}
          />
        </div>

        <div className="studio-header-right">
          {/* Insignia de estado del misterio: al día o desactualizado, nunca ambas. */}
          {informe?.hasPlot &&
            (informe.isStale ? (
              <button
                className="studio-stale mono-caps has-tip"
                data-tip={insigniaStaleTip}
                onClick={() => useAppStore.getState().setActiveTab('documents')}
              >
                ⚠ Misterio desactualizado
              </button>
            ) : (
              <button
                className="studio-ready mono-caps"
                onClick={() => useAppStore.getState().setActiveTab('documents')}
              >
                ✦ Misterio listo · Ver dosieres
              </button>
            ))}

          {config && !config.hasApiKey && (
            <span className="studio-demo mono-caps has-tip" data-tip={DEMO_TIP}>
              Modo demo
            </span>
          )}

          {config && (
            <label className="studio-model">
              <span className="studio-model-label mono-caps">Modelo</span>
              <select
                className="select studio-model-select"
                value={config.model}
                onChange={(event) => void handleModelChange(event)}
                disabled={changingModel}
                aria-label="Modelo de IA"
              >
                {config.models.map((option) => (
                  <option key={option.id} value={option.id} title={option.description}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </header>

      <div className="studio-body">
        <aside className="studio-chat deco-frame">
          <AgentChatPanel gameId={gameId} />
        </aside>

        <main className="studio-main">
          <div className="studio-actionbar">
            <nav className="studio-tabs" aria-label="Secciones del caso">
              {TABS.map((tab) => {
                const count = tabCount(tab.id);
                return (
                  <button
                    key={tab.id}
                    className={[
                      'studio-tab',
                      activeTab === tab.id ? 'is-active' : '',
                      highlight === tab.id && activeTab !== tab.id ? 'agent-highlight' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => useAppStore.getState().setActiveTab(tab.id)}
                  >
                    <span className="studio-tab-symbol" aria-hidden="true">
                      {tab.symbol}
                    </span>
                    {tab.label}
                    {count !== null && <span className="studio-tab-count">{count}</span>}
                    {activeTab === tab.id && (
                      <motion.span layoutId="studio-tab-underline" className="studio-tab-underline" />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="studio-generate-wrap has-tip" data-tip={accionTip}>
              {accion === 'generar' && (
                <button
                  className={`btn btn--primary studio-generate ${
                    highlight === 'generate' ? 'agent-highlight' : ''
                  }`}
                  disabled={generateDisabled}
                  onClick={handleGenerate}
                >
                  ✦ GENERAR MISTERIO
                </button>
              )}

              {accion === 'actualizar' && (
                <button
                  className={`btn btn--primary studio-generate studio-generate--refresh ${
                    highlight === 'generate' ? 'agent-highlight' : ''
                  }`}
                  disabled={generating}
                  onClick={handleRefresh}
                >
                  ✦ ACTUALIZAR MISTERIO
                </button>
              )}

              {accion === 'regenerar' && (
                <button
                  className={`btn studio-generate studio-generate--redo ${
                    confirmandoRegenerar ? 'is-confirming' : ''
                  } ${highlight === 'generate' ? 'agent-highlight' : ''}`}
                  disabled={generateDisabled}
                  onClick={handleRegenerate}
                >
                  {confirmandoRegenerar ? '¿Seguro? Pulse otra vez' : '↻ Regenerar desde cero'}
                </button>
              )}
            </div>
          </div>

          <section
            className={`studio-tabpanel deco-frame ${
              highlight === activeTab ? 'agent-highlight' : ''
            }`}
          >
            {renderTab()}
          </section>
        </main>
      </div>

      {/* Siempre montados: tarjetas del agente y overlay de generación */}
      <AgentPopups />
      <GenerateOverlay />

      {toast && <div className="studio-toast">{toast}</div>}
    </div>
  );
}
