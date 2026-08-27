/**
 * Selector del material imprimible.
 *
 * Va aparte de la maqueta del dosier a propósito: aquello elige qué BLOQUES
 * lleva dentro el documento de cada jugador; esto elige qué DOCUMENTOS enteros
 * se generan además. Mezclarlos en un solo panel confundiría dos niveles
 * distintos, aunque la forma de interactuar sea la misma.
 */
import { useState } from 'react';
import { PRINTABLE_DOCS, printableDocsFor } from '../../../../shared/documents';
import { manifiestoDe } from '../../../../shared/juegos';
import type { PrintableDocId } from '../../../../shared/documents';
import { useAppStore } from '../../state/store';
import { copiasDe } from './copias';
import './documents.css';

export default function PrintablePicker(): JSX.Element {
  const game = useAppStore((s) => s.game);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!game) return <div />;

  const modo = game.settings.gmPlays === true ? 'blind' : 'host';
  const disponibles = PRINTABLE_DOCS.filter((doc) => doc.modes.includes(modo));
  const catalogo = manifiestoDe(game.settings?.juego).documentos;
  const activos = new Set(printableDocsFor(game.settings, catalogo).map((d) => d.id));

  const guardar = async (ids: PrintableDocId[]): Promise<void> => {
    setGuardando(true);
    setError(null);
    try {
      await useAppStore.getState().patchGame({
        settings: { ...game.settings, printableDocs: ids },
      });
    } catch {
      setError('No se pudo guardar el cambio.');
    } finally {
      setGuardando(false);
    }
  };

  const alternar = (id: PrintableDocId): void => {
    const siguiente = activos.has(id)
      ? [...activos].filter((x) => x !== id)
      : [...activos, id];
    // Se guarda en el orden canónico del catálogo, no en el de los clics.
    const ordenados = PRINTABLE_DOCS.filter((d) => siguiente.includes(d.id)).map((d) => d.id);
    void guardar(ordenados);
  };

  return (
    <section className="deco-frame docs-designer">
      <header className="docs-designer-head">
        <div>
          <h3 className="docs-designer-title">Material para la mesa</h3>
          <p className="docs-designer-sub">
            Documentos aparte de los dosieres: lo que se cuelga en las paredes y lo que se
            reparte durante la partida.
          </p>
        </div>
        <span className="docs-designer-count mono-caps">
          {activos.size} de {disponibles.length} documentos
        </span>
      </header>

      <div className="docs-maqueta">
        {disponibles.map((doc) => {
          const dentro = activos.has(doc.id);
          return (
            <button
              key={doc.id}
              type="button"
              className={`docs-bloque${dentro ? '' : ' docs-bloque--fuera'}`}
              onClick={() => alternar(doc.id)}
              disabled={guardando}
              title={dentro ? 'No generar este documento' : 'Generar este documento'}
            >
              <span className="docs-bloque-maqueta" aria-hidden="true">
                <i style={{ width: '48%' }} />
                <i style={{ width: '86%' }} />
                <i style={{ width: '70%' }} />
              </span>
              <span className="docs-bloque-texto">
                <strong>{doc.name}</strong>
                <em>{doc.summary}</em>
                <span className="docs-bloque-copias mono-caps">{copiasDe(doc, game)}</span>
              </span>
              <span className="docs-bloque-marca">{dentro ? '✓' : '—'}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="sp-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
