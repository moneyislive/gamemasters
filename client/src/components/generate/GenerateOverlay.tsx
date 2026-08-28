/**
 * GenerateOverlay — la ceremonia de creación del misterio.
 *
 * Dos ceremonias comparten la misma mecánica (stream SSE + store + overlay):
 *   · `startGeneration()` escribe el misterio entero desde cero.
 *   · `startRefresh()`    pone al día una partida ya generada tras cambiar
 *                         jugadores, salas u objetos (rehace solo lo necesario).
 *
 * El overlay muestra el progreso (etapa, log en vivo y frases ambientales)
 * mientras dura, adaptando los textos a la ceremonia en curso.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GenerateStreamEvent } from '../../../../shared/types';
import { generateGame, generateMaterial, refreshGame } from '../../api/client';
import { useAppStore } from '../../state/store';
import { manifiestoDe } from '../../../../shared/juegos';
import './generate.css';

/* =====================================================================
   Modo de la ceremonia en curso
   El store no distingue entre generar y actualizar, así que lo guardamos
   aquí con un observable mínimo: el overlay se suscribe y cambia sus textos.
   ===================================================================== */

type ModoCeremonia = 'generar' | 'actualizar' | 'material';

let modoCeremonia: ModoCeremonia = 'generar';
const oyentesModo = new Set<() => void>();

function fijarModo(modo: ModoCeremonia): void {
  if (modoCeremonia === modo) return;
  modoCeremonia = modo;
  for (const oyente of oyentesModo) oyente();
}

function suscribirModo(oyente: () => void): () => void {
  oyentesModo.add(oyente);
  return () => {
    oyentesModo.delete(oyente);
  };
}

function leerModo(): ModoCeremonia {
  return modoCeremonia;
}

/* =====================================================================
   Mecánica compartida
   ===================================================================== */

interface Ceremonia {
  modo: ModoCeremonia;
  /** Abre el stream SSE (ambas rutas emiten los mismos GenerateStreamEvent). */
  abrirStream: (
    gameId: string,
    onEvent: (evento: GenerateStreamEvent) => void,
  ) => Promise<void>;
  /** Etapa que se muestra antes de que llegue el primer evento del servidor. */
  etapaInicial: string;
  exito: { title: string; body: string };
  errorTitulo: string;
  errorConexion: string;
}

/** Ejecuta una ceremonia completa: bloquea la UI, consume el stream y avisa. */
async function ejecutarCeremonia(ceremonia: Ceremonia): Promise<void> {
  const store = useAppStore.getState();
  const game = store.game;
  if (!game || store.generating) return;

  fijarModo(ceremonia.modo);
  store.setGenerating(true);
  store.resetGenerationLog();
  store.setGenerationStage(ceremonia.etapaInicial);

  const fallar = (mensaje: string): void => {
    const actual = useAppStore.getState();
    actual.setGenerating(false);
    actual.setGenerationStage(null);
    actual.pushPopup({
      kind: 'popup',
      title: ceremonia.errorTitulo,
      body: mensaje,
      tone: 'mystery',
    });
  };

  try {
    await ceremonia.abrirStream(game.id, (evento) => {
      const actual = useAppStore.getState();
      switch (evento.type) {
        case 'stage':
          actual.setGenerationStage(evento.label);
          break;
        case 'text':
          actual.appendGenerationLog(evento.delta);
          break;
        case 'done':
          actual.setGame(evento.game);
          actual.setGenerating(false);
          actual.setGenerationStage(null);
          actual.setActiveTab('documents');
          actual.pushPopup({
            kind: 'popup',
            title: ceremonia.exito.title,
            body: ceremonia.exito.body,
            tone: 'success',
          });
          break;
        case 'error':
          fallar(evento.message);
          break;
      }
    });
  } catch {
    fallar(ceremonia.errorConexion);
  } finally {
    // Salvaguarda: si el stream se cortó sin `done` ni `error`.
    if (useAppStore.getState().generating) {
      useAppStore.getState().setGenerating(false);
      useAppStore.getState().setGenerationStage(null);
    }
  }
}

/** Lanza la generación completa de la partida activa (desde cero). */
export async function startGeneration(): Promise<void> {
  await ejecutarCeremonia({
    modo: 'generar',
    abrirStream: (gameId, onEvent) => generateGame(gameId, onEvent),
    etapaInicial: 'Preparando el escenario…',
    exito: {
      title: 'El misterio está servido',
      body: 'Los dosieres de los jugadores están listos.',
    },
    errorTitulo: 'Algo se torció',
    errorConexion: 'No se pudo completar la generación. Revisa la conexión con el servidor.',
  });
}

/**
 * Pone al día la partida activa: rehace únicamente lo que ha quedado
 * desincronizado (tablero, personajes que faltan, dosieres).
 */
export async function startRefresh(): Promise<void> {
  await ejecutarCeremonia({
    modo: 'actualizar',
    abrirStream: (gameId, onEvent) => refreshGame(gameId, onEvent),
    etapaInicial: 'Revisando qué ha cambiado…',
    exito: {
      title: 'Misterio al día',
      body: 'La trama y los dosieres reflejan de nuevo a todos los jugadores.',
    },
    errorTitulo: 'La puesta al día se torció',
    errorConexion: 'No se pudo actualizar el misterio. Revisa la conexión con el servidor.',
  });
}

/**
 * Escribe el material de la velada sobre la trama ya existente.
 *
 * No toca el misterio: si falla, se pierde el material y nada más. Es también
 * la forma de dárselo a una partida escrita antes de que este material
 * existiera, sin regenerarla y sin perder la trama que ya te gusta.
 */
export async function startMaterial(): Promise<void> {
  await ejecutarCeremonia({
    modo: 'material',
    abrirStream: (gameId, onEvent) => generateMaterial(gameId, onEvent),
    etapaInicial: 'Levantando el telón…',
    exito: {
      title: 'El material está escrito',
      body: 'Narraciones, giros, revelaciones y desenlace listos para imprimir.',
    },
    errorTitulo: 'El material se torció',
    errorConexion: 'No se pudo escribir el material. La trama no se ha modificado.',
  });
}

/* =====================================================================
   Overlay
   ===================================================================== */

const FRASES_GENERAR = [
  'El mayordomo repasa las coartadas…',
  'Se afilan los motivos…',
  'Alguien miente, y lo hace muy bien…',
  'Se apagan las luces del pasillo…',
  'Una copa cae en la sala contigua…',
  'Los relojes de la casa se sincronizan…',
  'Se lacra el sobre del crimen…',
];

const FRASES_ACTUALIZAR = [
  'El mayordomo coteja la lista de invitados…',
  'Se corrigen las coartadas que ya no encajan…',
  'Se retiran de la mesa los nombres que ya no juegan…',
  'Los recién llegados reciben su papel…',
  'Se redibuja el plano de la mansión…',
  'Se reimprimen los dosieres afectados…',
];

const FRASES_MATERIAL = [
  'Se ensaya en voz alta la apertura de la velada…',
  'Se escriben los sobres que nadie debe abrir antes de tiempo…',
  'Alguien recibirá un recado a mitad de la noche…',
  'Se ordena la cronología minuto a minuto…',
  'Se lacra la confesión…',
];

/** Textos del overlay por ceremonia: evita encadenar ternarios por toda la vista. */
const TEXTOS: Record<ModoCeremonia, { kicker: string; etapa: string; idle: string; frases: string[] }> = {
  generar: {
    kicker: 'Creando el misterio',
    etapa: 'Preparando el escenario…',
    idle: 'El agente ordena sus notas antes de escribir…',
    frases: FRASES_GENERAR,
  },
  actualizar: {
    kicker: 'Poniendo el misterio al día',
    etapa: 'Revisando qué ha cambiado…',
    idle: 'El agente compara la trama con la partida actual…',
    frases: FRASES_ACTUALIZAR,
  },
  material: {
    kicker: 'Escribiendo el material de la velada',
    etapa: 'Levantando el telón…',
    idle: 'El agente escribe lo que se leerá en voz alta…',
    frases: FRASES_MATERIAL,
  },
};

/** Últimas líneas del log, para el efecto máquina de escribir. */
function ultimasLineas(log: string, cuantas: number): string[] {
  const lineas = log.split('\n').filter((linea) => linea.trim().length > 0);
  return lineas.slice(-cuantas);
}

export default function GenerateOverlay(): JSX.Element {
  const generating = useAppStore((s) => s.generating);
  const stage = useAppStore((s) => s.generationStage);
  const log = useAppStore((s) => s.generationLog);
  const juego = useAppStore((s) => s.game?.settings?.juego);
  const modo = useSyncExternalStore(suscribirModo, leerModo, leerModo);
  const [frase, setFrase] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  /*
   * LAS FRASES SON DEL JUEGO. Son sesenta segundos a pantalla completa y es la
   * primera vez que quien organiza ve de qué va su partida: «el mayordomo
   * repasa las coartadas» salía igual montando una expedición a una tumba.
   * Lo demás del texto —el rótulo, la etapa— es de la plataforma y no cambia.
   */
  const suyas = manifiestoDe(juego).ceremonia;
  const base = TEXTOS[modo];
  const textos = {
    ...base,
    frases:
      modo === 'generar'
        ? (suyas?.generar ?? base.frases)
        : modo === 'actualizar'
          ? (suyas?.actualizar ?? base.frases)
          : base.frases,
  };
  const frases = textos.frases;

  // Rotación de frases ambientales
  useEffect(() => {
    if (!generating) return;
    setFrase(0);
    const total = textos.frases.length;
    const id = window.setInterval(() => setFrase((n) => (n + 1) % total), 4200);
    return () => window.clearInterval(id);
  }, [generating, modo]);

  // Autoscroll del log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const lineas = ultimasLineas(log, 14);

  return (
    <AnimatePresence>
      {generating && (
        <motion.div
          className="gen-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          role="status"
          aria-live="polite"
        >
          <div className="gen-smoke" aria-hidden="true">
            <span className="gen-smoke-a" />
            <span className="gen-smoke-b" />
            <span className="gen-smoke-c" />
          </div>

          <motion.div
            className="gen-content"
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
          >
            <div className="gen-lens" aria-hidden="true">
              <svg viewBox="0 0 120 120" className="gen-lens-svg">
                <g className="gen-prints">
                  <ellipse cx="34" cy="82" rx="9" ry="12" />
                  <ellipse cx="58" cy="66" rx="9" ry="12" />
                  <ellipse cx="84" cy="50" rx="9" ry="12" />
                </g>
                <g className="gen-lens-glass">
                  <circle cx="52" cy="52" r="30" />
                  <line x1="74" y1="74" x2="99" y2="99" />
                </g>
              </svg>
            </div>

            <p className="gen-kicker mono-caps">{textos.kicker}</p>
            <AnimatePresence mode="wait">
              <motion.h2
                key={stage ?? 'sin-etapa'}
                className="gen-stage"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.32 }}
              >
                {stage ?? textos.etapa}
              </motion.h2>
            </AnimatePresence>

            <div className="gen-progress" aria-hidden="true">
              <span />
            </div>

            <div className="gen-log deco-frame" ref={logRef}>
              {lineas.length === 0 ? (
                <p className="gen-log-line gen-log-line--idle">{textos.idle}</p>
              ) : (
                lineas.map((linea, indice) => (
                  <p
                    key={`${indice}-${linea.slice(0, 12)}`}
                    className={`gen-log-line${indice === lineas.length - 1 ? ' gen-log-line--last' : ''}`}
                  >
                    {linea}
                  </p>
                ))
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={`${modo}-${frase}`}
                className="gen-flavor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                {frases[frase % frases.length]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
