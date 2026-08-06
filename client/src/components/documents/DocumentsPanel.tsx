/**
 * DocumentsPanel — los dosieres confidenciales de cada jugador y del Game
 * Master, presentados como sobres lacrados que se pueden leer o descargar.
 *
 * COHERENCIA DE LA PARTIDA: si la trama ya no se corresponde con los jugadores,
 * salas u objetos actuales, arriba del todo aparece un aviso con el detalle de
 * lo que ha cambiado y un botón para ponerlo al día. Además, las tarjetas
 * marcan a quién le falta el dosier y qué dosieres han quedado de sobra.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { computeStaleness } from '../../../../shared/staleness';
import { documentUrl, fetchDocumentCapabilities } from '../../api/client';
import type { DocumentCapabilities } from '../../../../shared/types';
import { useAppStore } from '../../state/store';
import DownloadMenu from './DownloadMenu';
import SectionDesigner from './SectionDesigner';
import PrintablePicker from './PrintablePicker';
import { copiasDe } from './copias';
import { printableDocsFor } from '../../../../shared/documents';
import { startRefresh } from '../generate/GenerateOverlay';
import './documents.css';

interface Sobre {
  suspectId: string;
  /** Nombre de la persona real (o "Game Master") */
  personName: string;
  /** Nombre del personaje dentro de la ficción */
  characterName?: string;
  photoUrl?: string;
  email?: string;
  isGm: boolean;
  /** Juega en la partida pero todavía no tiene dosier escrito. */
  sinDosier: boolean;
  /** Dosier de alguien que ya no participa. */
  sobrante: boolean;
  /** Material para la mesa, no el documento de una persona. */
  esImprimible?: boolean;
}

/** Ids del índice que no son jugadores: el Game Master y el sobre sellado. */
const NO_JUGADORES = new Set(['gm', 'solution']);

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primera = partes[0]?.charAt(0) ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.charAt(0) ?? '') : '';
  return (primera + ultima).toUpperCase() || '?';
}

export default function DocumentsPanel(): JSX.Element {
  const game = useAppStore((s) => s.game);
  const generating = useAppStore((s) => s.generating);
  const [abierto, setAbierto] = useState<Sobre | null>(null);
  // Se consulta una vez: saber si hay navegador para el PDF cambia el menú de
  // descarga, y preguntarlo al abrirlo produciría un parpadeo.
  const [capacidades, setCapacidades] = useState<DocumentCapabilities | null>(null);

  useEffect(() => {
    let vigente = true;
    fetchDocumentCapabilities()
      .then((datos) => {
        if (vigente) setCapacidades(datos);
      })
      .catch(() => {
        // Sin respuesta se asume que sí hay PDF: si falla, el propio intento de
        // descarga explica el motivo con el mensaje del servidor.
        if (vigente) setCapacidades({ pdf: true });
      });
    return () => {
      vigente = false;
    };
  }, []);

  // Cerrar el visor con Escape
  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setAbierto(null);
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [abierto]);

  if (!game) return <div className="docs-panel" />;

  const documentos = game.documents ?? [];
  const informe = computeStaleness(game);

  const ponerAlDia = (): void => {
    // startRefresh ya avisa con un popup si algo sale mal.
    void startRefresh().catch(() => undefined);
  };

  /** Aviso de desincronización, común al estado vacío y al normal. */
  const aviso = informe.isStale ? (
    <section className="deco-frame docs-stale" role="status" aria-live="polite">
      <span className="docs-stale-glyph" aria-hidden="true">
        ⚠
      </span>
      <div className="docs-stale-body">
        <p className="docs-stale-kicker mono-caps">Coherencia de la partida</p>
        <h3 className="docs-stale-title">Este misterio ya no coincide con la partida</h3>
        <ul className="docs-stale-list">
          {informe.summary.map((linea, indice) => (
            <li key={`${indice}-${linea.slice(0, 24)}`}>{linea}</li>
          ))}
        </ul>
        <p className="docs-stale-note text-italic">
          {informe.needsAgent
            ? 'Hace falta al Mayordomo para escribir los personajes que faltan.'
            : 'Puede arreglarse al instante, sin consumir IA.'}
        </p>
      </div>
      <div className="docs-stale-action">
        <button className="btn btn--primary" disabled={generating} onClick={ponerAlDia}>
          Actualizar ahora
        </button>
      </div>
    </section>
  ) : null;

  if (documentos.length === 0) {
    return (
      <div className="docs-panel">
        {aviso}
        {/* La maqueta se ve ANTES de generar: es cuando sirve para decidir. */}
        <SectionDesigner />
        <PrintablePicker />
        <div className="docs-empty">
          <span className="docs-empty-glyph" aria-hidden="true">
            ✒
          </span>
          <h3>Los dosieres aún no se han escrito</h3>
          <p className="text-dim text-italic">
            Cuando generes el misterio, cada jugador recibirá aquí su documento confidencial: su
            personaje, sus secretos, las reglas, el mapa y la cronología de la velada.
          </p>
        </div>
      </div>
    );
  }

  // El material imprimible no está en game.documents: sale del catálogo.
  const imprimibles = game.plot ? printableDocsFor(game.settings) : [];

  const personajePorId = new Map((game.plot?.characters ?? []).map((c) => [c.suspectId, c]));
  const idsConDocumento = new Set(documentos.map((doc) => doc.suspectId));
  const idsSospechosos = new Set(game.suspects.map((s) => s.id));

  // Un sobre por jugador actual: los que aún no tienen dosier también aparecen.
  const sobres: Sobre[] = game.suspects.map((sospechoso) => ({
    suspectId: sospechoso.id,
    personName: sospechoso.name,
    characterName: personajePorId.get(sospechoso.id)?.characterName,
    photoUrl: sospechoso.photoUrl,
    email: sospechoso.email,
    isGm: false,
    sinDosier: !idsConDocumento.has(sospechoso.id),
    sobrante: false,
  }));

  // Dosieres que sobran: se escribieron para alguien que ya no participa.
  // 'gm' y 'solution' no corresponden a ningún sospechoso y nunca sobran; sin
  // excluir el segundo, el sobre del crimen se pintaba dos veces.
  for (const documento of documentos) {
    if (NO_JUGADORES.has(documento.suspectId) || idsSospechosos.has(documento.suspectId)) continue;
    sobres.push({
      suspectId: documento.suspectId,
      personName: personajePorId.get(documento.suspectId)?.characterName ?? documento.title,
      isGm: false,
      sinDosier: false,
      sobrante: true,
    });
  }

  if (idsConDocumento.has('gm')) {
    sobres.push({
      suspectId: 'gm',
      personName: game.settings.gmPlays ? 'Guía de la velada' : 'Game Master',
      isGm: true,
      sinDosier: false,
      sobrante: false,
    });
  }

  // Sobre sellado: solo existe cuando el Game Master juega a ciegas.
  if (idsConDocumento.has('solution')) {
    sobres.push({
      suspectId: 'solution',
      personName: 'El sobre del crimen',
      isGm: true,
      sinDosier: false,
      sobrante: false,
    });
  }

  return (
    <div className="docs-panel">
      {aviso}

      <SectionDesigner />
      <PrintablePicker />

      <header className="docs-header">
        <div>
          <h2 className="docs-title">Dosieres</h2>
          <p className="docs-subtitle">
            Un documento por jugador, listo para leer, imprimir o enviar por correo. Cada uno guarda
            secretos distintos.
          </p>
        </div>
        <span className="docs-count">
          {/* Con la partida desincronizada hay más tarjetas que documentos:
              se dice de cuántas están escritas para que el número no confunda. */}
          {sobres.length > documentos.length ? (
            <>
              <strong>{documentos.length}</strong> de {sobres.length} documentos
            </>
          ) : (
            <>
              <strong>{documentos.length}</strong> documentos
            </>
          )}
        </span>
      </header>

      <div className="docs-grid">
        {sobres.map((sobre, indice) => (
          <motion.article
            key={sobre.suspectId}
            className={[
              'deco-frame',
              'docs-card',
              sobre.isGm ? 'docs-card--gm' : '',
              sobre.sinDosier ? 'docs-card--pendiente' : '',
              sobre.sobrante ? 'docs-card--sobrante' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: Math.min(indice * 0.05, 0.35) }}
          >
            <span
              className={[
                'docs-wax',
                sobre.sinDosier ? 'docs-wax--pendiente' : '',
                sobre.sobrante ? 'docs-wax--sobrante' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden="true"
            >
              {sobre.sinDosier
                ? 'Sin dosier'
                : sobre.sobrante
                  ? 'Ya no juega'
                  : sobre.isGm
                    ? 'Confidencial'
                    : 'Sellado'}
            </span>

            <div className="docs-card-media">
              {sobre.photoUrl ? (
                <img src={sobre.photoUrl} alt={`Retrato de ${sobre.personName}`} />
              ) : (
                <span className="docs-monogram" aria-hidden="true">
                  {sobre.isGm ? '★' : iniciales(sobre.personName)}
                </span>
              )}
            </div>

            <h3 className="docs-card-name">
              {sobre.isGm ? sobre.personName : (sobre.characterName ?? sobre.personName)}
            </h3>
            <p className="docs-card-sub">
              {sobre.suspectId === 'solution'
                ? 'No lo abras hasta el final'
                : sobre.isGm
                  ? game.settings.gmPlays
                    ? 'Rondas y pistas, sin la solución'
                    : 'Solución, guion y todas las pistas'
                  : sobre.sinDosier
                  ? 'Aún no tiene personaje ni documento'
                  : sobre.sobrante
                    ? 'Ya no figura entre los sospechosos'
                    : sobre.characterName && sobre.characterName !== sobre.personName
                      ? `interpretado por ${sobre.personName}`
                      : 'Dosier confidencial'}
            </p>

            {sobre.email && !sobre.sinDosier && (
              <p className="docs-card-mail" title="Envíale su dosier descargado">
                ✉ {sobre.email}
              </p>
            )}

            {sobre.sinDosier ? (
              <p className="docs-card-pending text-italic">
                Se escribirá al actualizar el misterio.
              </p>
            ) : (
              <div className="docs-card-actions">
                <button className="btn btn--sm" onClick={() => setAbierto(sobre)}>
                  Leer
                </button>
                <DownloadMenu
                  gameId={game.id}
                  suspectId={sobre.suspectId}
                  capacidades={capacidades}
                />
              </div>
            )}
          </motion.article>
        ))}
      </div>

      {/* Material que no es de nadie en concreto: se cuelga o se reparte. No
          vive en game.documents, se calcula del catálogo, así que aparece
          también en partidas generadas antes de que existiera. */}
      {imprimibles.length > 0 && (
        <section className="docs-imprimibles">
          <header className="docs-header">
            <div>
              <h2 className="docs-title">Material para la mesa</h2>
              <p className="docs-subtitle">
                Lo que se cuelga en las paredes y lo que se reparte durante la partida. No
                contiene secretos de nadie.
              </p>
            </div>
            <span className="docs-count">
              <strong>{imprimibles.length}</strong> documentos
            </span>
          </header>

          <div className="docs-grid">
            {imprimibles.map((doc, indice) => (
              <motion.article
                key={doc.id}
                className="deco-frame docs-card docs-card--imprimible"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: Math.min(indice * 0.05, 0.2) }}
              >
                <span className="docs-wax docs-wax--imprimible" aria-hidden="true">
                  Imprimible
                </span>

                <div className="docs-card-media">
                  <span className="docs-monogram" aria-hidden="true">
                    {doc.audience === 'room' ? '⌂' : '✎'}
                  </span>
                </div>

                <h3 className="docs-card-name">{doc.name}</h3>
                <p className="docs-card-sub">{copiasDe(doc, game)}</p>
                <p className="docs-card-pending text-italic">{doc.summary}</p>

                <div className="docs-card-actions">
                  <button
                    className="btn btn--sm"
                    onClick={() =>
                      setAbierto({
                        suspectId: doc.id,
                        personName: doc.name,
                        isGm: false,
                        sinDosier: false,
                        sobrante: false,
                        esImprimible: true,
                      })
                    }
                  >
                    Leer
                  </button>
                  <DownloadMenu gameId={game.id} suspectId={doc.id} capacidades={capacidades} />
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {abierto && (
          <motion.div
            className="docs-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAbierto(null)}
          >
            <motion.div
              className="deco-frame docs-viewer-box"
              initial={{ scale: 0.96, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <header className="docs-viewer-head">
                <h3>
                  {abierto.isGm || abierto.esImprimible
                    ? abierto.personName
                    : `Dosier de ${abierto.personName}`}
                </h3>
                <div className="docs-viewer-actions">
                  <DownloadMenu
                    gameId={game.id}
                    suspectId={abierto.suspectId}
                    capacidades={capacidades}
                  />
                  <button className="btn btn--sm btn--ghost" onClick={() => setAbierto(null)}>
                    Cerrar ✕
                  </button>
                </div>
              </header>
              <iframe
                className="docs-viewer-frame"
                src={documentUrl(game.id, abierto.suspectId)}
                title={`Dosier de ${abierto.personName}`}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
