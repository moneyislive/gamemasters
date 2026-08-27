/**
 * El taller: donde se prepara una partida, del juego que sea.
 *
 * Cabecera con nombre editable, selector de modelo e indicadores; columna
 * izquierda con el chat del agente; zona principal con pestañas y el botón
 * dorado de acción. Suscribe el bus de comandos de UI del agente.
 *
 * LO QUE ERA DE CLUEDO Y AHORA ES DE CUALQUIERA. Las pestañas eran siete
 * escritas a mano —sospechosos, salas, armas…— y los requisitos para generar,
 * tres condiciones con sus números dentro. Ahora las pestañas de entidades
 * salen de las CATEGORÍAS del manifiesto y los requisitos, de lo que cada
 * categoría declara. El Misterio de la Momia tiene cuatro categorías en vez de
 * tres, y una de ellas —los ritos— no aparecía en ningún sitio de este fichero:
 * con la lista escrita a mano, esa pestaña sencillamente no se habría pintado.
 *
 * QUÉ SIGUE SIENDO FIJO, y es correcto que lo sea: estilo, tablero, dosieres y
 * en vivo. No son entidades de un juego: son las cuatro cosas que la plataforma
 * sabe hacer con cualquier partida. Lo único que cambia es cómo se llaman.
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
import type { ModelId } from '../../../shared/types';
import { computeStaleness } from '../../../shared/staleness';
import { entidadesDe, JUEGO_POR_DEFECTO, manifiestoDe } from '../../../shared/juegos';
import type { DefinicionCategoria, ManifiestoDeJuego } from '../../../shared/juegos';
import { setConfigModel } from '../api/client';
import { useAppStore } from '../state/store';
import { onUiCommand } from '../lib/uiBus';
import { useTemaDeJuego } from '../lib/tema';
import { palabrasDe, rotuloDeCategoria } from '../juegos/palabras';
import { loQueFalta } from '../juegos/reglas';
import AgentChatPanel from '../components/agentchat/AgentChatPanel';
import AgentPopups from '../components/agentchat/AgentPopups';
import PanelDeCategoria from '../components/studio/PanelDeCategoria';
import RoomsPanel from '../components/studio/RoomsPanel';
import StylePanel from '../components/studio/StylePanel';
import BoardView from '../components/board/BoardView';
import DocumentsPanel from '../components/documents/DocumentsPanel';
import LivePanel from '../components/live/LivePanel';
import GenerateOverlay, { startGeneration, startRefresh } from '../components/generate/GenerateOverlay';
import '../styles/studio.css';

/** Qué hace el botón principal según el estado de la partida. */
type AccionPrincipal = 'generar' | 'actualizar' | 'regenerar';

interface Pestana {
  id: string;
  label: string;
  symbol: string;
  /** La categoría que abre, si abre alguna. Las cuatro últimas no abren ninguna. */
  categoria?: DefinicionCategoria;
}

/**
 * Las pestañas del taller de un juego.
 *
 * Primero una por CATEGORÍA, en el orden en que el manifiesto las declara —que
 * es el orden en que conviene rellenarlas— y después las cuatro de la casa.
 *
 * El signo de cada categoría es el mismo que usa su lista cuando está vacía
 * (`presentacion.vacio.glifo`). Escribirlo dos veces sería tenerlo distinto
 * algún día: el peón de los sospechosos acabaría siendo un peón en un sitio y
 * una silueta en el otro, y nadie sabría cuál es el bueno.
 */
function pestanasDe(manifiesto: ManifiestoDeJuego, juego: string): Pestana[] {
  const p = palabrasDe(juego).taller;
  return [
    ...manifiesto.categorias.map((categoria) => ({
      id: categoria.id,
      label: rotuloDeCategoria(juego, categoria),
      symbol: categoria.presentacion?.vacio?.glifo ?? '◇',
      categoria,
    })),
    { id: 'style', label: p.pestanaEstilo, symbol: '✒' },
    { id: 'board', label: p.pestanaTablero, symbol: '▦' },
    { id: 'documents', label: p.pestanaDosieres, symbol: '❧' },
    { id: 'live', label: p.pestanaVivo, symbol: '◉' },
  ];
}

/**
 * Lo que pide el agente, traducido a una pestaña de ESTE juego.
 *
 * El agente habla el vocabulario de CLUEDO —`suspects`, `rooms`, `weapons`—
 * porque es el que está escrito en `HighlightTarget`, que es contrato común y
 * no puede crecer con las categorías de cada juego nuevo. Aquí se traduce al id
 * de la categoría que en este juego vive en ese mismo almacén: cuando el agente
 * dice «mira los sospechosos», en la Momia se abre `expedicionarios`.
 *
 * Sin esta traducción no saltaría un error: no pasaría NADA, que es peor. El
 * agente pediría una pestaña inexistente, la pantalla se quedaría igual, y
 * quien lo mira concluiría que el agente no funciona.
 */
function pestanaPedida(manifiesto: ManifiestoDeJuego, objetivo: string): string {
  if (objetivo !== 'suspects' && objetivo !== 'rooms' && objetivo !== 'weapons') return objetivo;
  return manifiesto.categorias.find((c) => c.almacen === objetivo)?.id ?? objetivo;
}

const demoTip = (asistente: string) =>
  `Sin clave de API de Anthropic: ${asistente} responde con un guion local. ` +
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

  /*
   * A QUÉ SE JUEGA. Lo dice la PARTIDA, no la ruta.
   *
   * Importa porque las dos pueden discrepar: un enlace viejo, o el recibidor,
   * que hoy lista las partidas de todos los juegos porque `GameSummary` no dice
   * de cuál es cada una. Si mandara la ruta, una expedición abierta desde
   * `/cluedo` se prepararía con las pestañas y los rótulos del juego
   * equivocado. La ruta solo vale mientras la partida no ha llegado.
   */
  const juegoActual =
    (game && game.id === gameId ? game.settings?.juego : undefined) ?? juego ?? JUEGO_POR_DEFECTO;
  const manifiesto = manifiestoDe(juegoActual);
  const palabras = palabrasDe(juegoActual);
  const pestanas = useMemo(
    () => pestanasDe(manifiesto, juegoActual),
    [manifiesto, juegoActual],
  );

  // El taller entero se viste del juego que se está preparando.
  useTemaDeJuego(juegoActual);

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
  const flashHighlight = useCallback((target: string) => {
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

  /*
   * La ruta dice un juego y la partida dice otro: se corrige la barra de
   * direcciones, sin dejar rastro en el historial.
   *
   * No es cosmético. La dirección de esta pantalla es lo que la gente copia y
   * pega para volver, y una que miente lleva a un taller con los rótulos del
   * juego equivocado. Se hace con `replace` para que el botón de atrás siga
   * llevando al recibidor y no a la dirección mala.
   */
  useEffect(() => {
    if (!game || game.id !== gameId) return;
    const suyo = game.settings?.juego ?? JUEGO_POR_DEFECTO;
    if (suyo !== juego) navigate(`/${suyo}/${game.id}`, { replace: true });
  }, [game, gameId, juego, navigate]);

  /* Suscripción al bus de comandos de UI del agente */
  useEffect(() => {
    const unsubscribe = onUiCommand((command) => {
      const store = useAppStore.getState();
      switch (command.kind) {
        case 'popup':
          store.pushPopup(command);
          break;
        case 'highlight':
          flashHighlight(pestanaPedida(manifiesto, command.target));
          break;
        case 'navigate':
          // 'generate' no es una pestaña: lo interpretamos como resaltar el botón.
          if (command.target === 'generate') flashHighlight('generate');
          else store.setActiveTab(pestanaPedida(manifiesto, command.target));
          break;
        case 'start_generation':
          void startGeneration().catch(() =>
            showToast('No se pudo iniciar la generación del misterio.'),
          );
          break;
      }
    });
    return unsubscribe;
  }, [flashHighlight, showToast, manifiesto]);

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

  /*
   * Lo que falta para poder generar, según lo que declare cada categoría del
   * juego. Antes eran tres condiciones con los números de CLUEDO escritos
   * dentro, y con ellas la Momia se habría podido generar sin un solo rito.
   */
  const missing = game
    ? loQueFalta(manifiesto, game, (c) => rotuloDeCategoria(juegoActual, c).toLowerCase())
    : [];

  const generateDisabled = generating || !ready || missing.length > 0;

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
    accionTip = palabras.taller.tipTrabajando;
  } else if (accion === 'generar') {
    accionTip =
      missing.length > 0 ? `Faltan ingredientes: ${missing.join(', ')}.` : palabras.taller.tipGenerar;
  } else if (accion === 'actualizar') {
    accionTip = `${primeraCausa} Se rehará solo lo necesario y se conservará la trama${
      informe?.needsAgent ? palabras.taller.tipConAyuda : ', sin consumir IA'
    }.`;
  } else if (confirmandoRegenerar) {
    accionTip = palabras.taller.tipConfirmar;
  } else {
    accionTip =
      missing.length > 0
        ? `Faltan ingredientes: ${missing.join(', ')}.`
        : palabras.taller.tipRegenerar;
  }

  const insigniaStaleTip =
    accion === 'actualizar'
      ? `${primeraCausa} Vaya a los dosieres para ponerlo al día.`
      : '';

  /* ---------- Contenido de pestaña ---------- */

  /*
   * QUÉ PESTAÑA ESTÁ ABIERTA DE VERDAD.
   *
   * El almacén guarda una pestaña sola, común a todas las partidas, y su valor
   * inicial es `suspects`, que en la Momia no existe. En vez de reescribirlo al
   * cargar —lo que daría un parpadeo y una carrera con el propio agente—, si lo
   * guardado no es una pestaña de este juego se abre la primera, que siempre es
   * la primera categoría del manifiesto. Pulsar cualquiera lo deja ya correcto.
   */
  const pestanaActiva = pestanas.some((p) => p.id === activeTab)
    ? activeTab
    : (pestanas[0]?.id ?? 'style');

  const tabCount = (pestana: Pestana): number | null => {
    if (!game) return null;
    if (pestana.categoria) return entidadesDe(game, pestana.categoria.id).length;
    return pestana.id === 'documents' ? (game.documents?.length ?? null) : null;
  };

  const renderTab = () => {
    const pestana = pestanas.find((p) => p.id === pestanaActiva);
    /*
     * Las categorías de LUGAR van al panel de salas y no al genérico, porque
     * ahí es donde vive lo que solo tiene sentido en un sitio del espacio real:
     * la foto aérea de la casa y las chinchetas encima. Lo demás —una persona,
     * un objeto, un rito— es la misma pantalla con distinto texto.
     */
    if (pestana?.categoria) {
      return pestana.categoria.sonLugares ? (
        <RoomsPanel categoria={pestana.categoria} />
      ) : (
        <PanelDeCategoria categoria={pestana.categoria} />
      );
    }
    switch (pestanaActiva) {
      case 'style':
        return <StylePanel />;
      case 'board':
        return <BoardView />;
      case 'documents':
        return <DocumentsPanel />;
      case 'live':
        return <LivePanel />;
      default:
        return <StylePanel />;
    }
  };

  /* ---------- Estados de carga / error ---------- */

  if (loadError) {
    return (
      <div className="studio-fallback">
        <div className="deco-frame deco-corners studio-fallback-card">
          <h2>{palabras.taller.extraviadoTitulo}</h2>
          <p className="text-dim text-italic">{palabras.taller.extraviadoTexto}</p>
          <button className="btn" onClick={() => navigate(`/${juego ?? ''}`)}>
            {palabras.taller.extraviadoVolver}
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="studio-fallback">
        <p className="text-italic studio-loading-text">
          {loadingGame ? palabras.taller.abriendo : palabras.taller.buscando}
        </p>
      </div>
    );
  }

  return (
    <div className="studio">
      <header className="studio-header deco-frame">
        <button className="btn btn--ghost btn--sm studio-back" onClick={() => navigate(`/${juego ?? ''}`)}>
          {palabras.taller.volver}
        </button>

        <div className="studio-name-wrap">
          <span className="studio-kicker mono-caps">{palabras.taller.kicker}</span>
          <input
            className="studio-name"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={() => void commitName()}
            onKeyDown={onNameKey}
            aria-label={palabras.taller.nombreAria}
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
                {palabras.taller.desactualizado}
              </button>
            ) : (
              <button
                className="studio-ready mono-caps"
                onClick={() => useAppStore.getState().setActiveTab('documents')}
              >
                {palabras.taller.listo}
              </button>
            ))}

          {config && !config.hasApiKey && (
            <span
              className="studio-demo mono-caps has-tip"
              data-tip={demoTip(manifiesto.asistente.nombre)}
            >
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
              {pestanas.map((tab) => {
                const count = tabCount(tab);
                return (
                  <button
                    key={tab.id}
                    className={[
                      'studio-tab',
                      pestanaActiva === tab.id ? 'is-active' : '',
                      highlight === tab.id && pestanaActiva !== tab.id ? 'agent-highlight' : '',
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
                    {pestanaActiva === tab.id && (
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
                  {palabras.taller.generar}
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
                  {palabras.taller.actualizar}
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
                  {confirmandoRegenerar
                    ? palabras.taller.confirmarRegenerar
                    : palabras.taller.regenerar}
                </button>
              )}
            </div>
          </div>

          <section
            className={`studio-tabpanel deco-frame ${
              highlight === pestanaActiva ? 'agent-highlight' : ''
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
