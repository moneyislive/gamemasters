/**
 * Maqueta de los dosieres.
 *
 * Muestra el esquema del documento que recibirá cada jugador y permite quitar
 * los bloques que no interesen (por ejemplo, las reglas si tus invitados ya son
 * veteranos). Se ve ANTES de generar, para no descubrir a toro pasado que
 * sobraba media hoja.
 *
 * Aquí vive también el interruptor del «Game Master a ciegas»: parte su dosier
 * en una guía sin solución y un sobre sellado, para que pueda jugar como uno más.
 */
import { useState } from 'react';
import type { DocumentSectionId } from '../../../../shared/types';
import { manifiestoDe } from '../../../../shared/juegos';
import { useAppStore } from '../../state/store';
import './documents.css';

export default function SectionDesigner(): JSX.Element {
  const game = useAppStore((s) => s.game);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!game) return <div />;

  /*
   * LOS BLOQUES LOS DECLARA EL JUEGO, no el contrato comun.
   *
   * Antes salian de `DOCUMENT_SECTIONS`, que es la lista de CLUEDO, y en una
   * expedicion a una tumba la maqueta ofrecia «los sospechosos», «las armas del
   * crimen» y «las reglas del Cluedo en vivo». La Momia declara los suyos —el
   * DON de cada expedicionario, las reliquias, los cinco ritos— y son once, no
   * diez.
   *
   * CLUEDO no cambia ni un bloque: su manifiesto referencia esa misma lista, no
   * una copia de ella.
   */
  const manifiesto = manifiestoDe(game.settings?.juego);
  const secciones = manifiesto.seccionesDeDosier;
  /*
   * «un sospechoso más» solo vale en CLUEDO. Sale de la categoría que el juego
   * declara como la de las personas de la mesa, que es la única que puede tener
   * un personaje: en la Momia, «un expedicionario más».
   */
  const jugadores = manifiesto.categorias.find((c) => c.sonJugadores);
  const unoMas = `un ${jugadores?.singular ?? 'sospechoso'} más`;

  const elegidas = game.settings.documentSections;
  // Sin selección guardada van todas: es el comportamiento por defecto.
  const activa = (id: DocumentSectionId): boolean =>
    !elegidas || elegidas.length === 0 || elegidas.includes(id);
  const gmJuega = game.settings.gmPlays === true;

  const guardar = async (cambios: Partial<typeof game.settings>): Promise<void> => {
    setGuardando(true);
    setError(null);
    try {
      await useAppStore.getState().patchGame({ settings: { ...game.settings, ...cambios } });
    } catch {
      setError('No se pudo guardar el cambio.');
    } finally {
      setGuardando(false);
    }
  };

  const alternar = (id: DocumentSectionId): void => {
    const info = secciones.find((s) => s.id === id);
    if (info?.required) return;
    const base = secciones.filter((s) => activa(s.id)).map((s) => s.id);
    const siguiente = activa(id) ? base.filter((x) => x !== id) : [...base, id];
    // Se guarda en el orden canónico del catálogo, no en el de los clics.
    const ordenadas = secciones.filter((s) => siguiente.includes(s.id)).map((s) => s.id);
    void guardar({ documentSections: ordenadas });
  };

  const incluidas = secciones.filter((s) => activa(s.id)).length;

  return (
    <section className="deco-frame docs-designer">
      <header className="docs-designer-head">
        <div>
          <h3 className="docs-designer-title">Maqueta del dosier</h3>
          <p className="docs-designer-sub">
            Así se compondrá el documento de cada jugador. Quita los bloques que no necesites.
          </p>
        </div>
        <span className="docs-designer-count mono-caps">
          {incluidas} de {secciones.length} bloques
        </span>
      </header>

      <div className="docs-maqueta">
        {secciones.map((seccion) => {
          const dentro = activa(seccion.id);
          return (
            <button
              key={seccion.id}
              type="button"
              className={`docs-bloque${dentro ? '' : ' docs-bloque--fuera'}${
                seccion.required ? ' docs-bloque--fijo' : ''
              }`}
              onClick={() => alternar(seccion.id)}
              disabled={guardando || seccion.required}
              title={
                seccion.required
                  ? 'Este bloque es imprescindible: no puede quitarse'
                  : dentro
                    ? 'Quitar del dosier'
                    : 'Añadir al dosier'
              }
            >
              {/* Esquema visual del bloque: barras que sugieren su contenido */}
              <span className="docs-bloque-maqueta" aria-hidden="true">
                <i style={{ width: '62%' }} />
                <i style={{ width: '92%' }} />
                <i style={{ width: '78%' }} />
              </span>
              <span className="docs-bloque-texto">
                <strong>{seccion.label}</strong>
                <em>{seccion.description}</em>
              </span>
              <span className="docs-bloque-marca">
                {seccion.required ? 'fijo' : dentro ? '✓' : '—'}
              </span>
            </button>
          );
        })}
      </div>

      <label className={`docs-gm-juega${gmJuega ? ' is-on' : ''}`}>
        <input
          type="checkbox"
          checked={gmJuega}
          disabled={guardando}
          onChange={(evento) => void guardar({ gmPlays: evento.target.checked })}
        />
        <span className="docs-gm-juega-texto">
          <strong>El Game Master también juega</strong>
          <em>
            Su dosier se parte en dos: una guía de la velada <b>sin la solución</b> —rondas, sobres
            de pistas y qué leer en voz alta— y un sobre sellado aparte que nadie abre hasta el
            final. Añádete además como {unoMas} para tener tu propio personaje.
          </em>
        </span>
      </label>

      {error && (
        <p className="sp-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
