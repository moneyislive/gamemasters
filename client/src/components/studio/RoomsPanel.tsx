/**
 * Panel de salas. Dos modos de tablero:
 *  - "generated": listado clásico de salas; el tablero se dibuja solo.
 *  - "aerial": se sube una foto aérea del espacio real y se colocan chinchetas
 *    sobre ella; cada chincheta es una sala (arrastrable y editable).
 */
import { useEffect, useRef, useState } from 'react';
import type { DragEvent, FormEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { BoardMode, Room } from '../../../../shared/types';
import { uploadFile } from '../../api/client';
import { useAppStore } from '../../state/store';
import EntityGallery, { PanelHeader } from './EntityList';
import PhotoUpload from './PhotoUpload';
import './studio-panels.css';

interface Borrador {
  id: string | null;
  name: string;
  description: string;
  photoUrl: string | undefined;
}

const VACIO: Borrador = { id: null, name: '', description: '', photoUrl: undefined };

/** Posición relativa (0..1) recortada al interior de la imagen. */
function posicionRelativa(elemento: HTMLElement, clientX: number, clientY: number) {
  const caja = elemento.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (clientX - caja.left) / caja.width));
  const y = Math.min(1, Math.max(0, (clientY - caja.top) / caja.height));
  return { x, y };
}

export default function RoomsPanel(): JSX.Element {
  const game = useAppStore((s) => s.game);

  // Formulario clásico
  const [borrador, setBorrador] = useState<Borrador>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Modo aéreo
  const escenarioRef = useRef<HTMLDivElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [sobreZona, setSobreZona] = useState(false);
  const [cambiandoModo, setCambiandoModo] = useState(false);
  const [nuevaChincheta, setNuevaChincheta] = useState<{ x: number; y: number } | null>(null);
  const [nombreChincheta, setNombreChincheta] = useState('');
  const [descChincheta, setDescChincheta] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editandoPin, setEditandoPin] = useState<string | null>(null);
  const [arrastre, setArrastre] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    setBorrador(VACIO);
    setNuevaChincheta(null);
    setMenuId(null);
    setEditandoPin(null);
  }, [game?.id]);

  if (!game) return <div className="sp-panel" />;

  const modo: BoardMode = game.boardMode;
  const editando = borrador.id !== null;
  const conChincheta = game.rooms.filter((sala) => sala.pin);

  /* ---------- Acciones comunes ---------- */

  const cambiarModo = async (nuevo: BoardMode): Promise<void> => {
    if (nuevo === modo || cambiandoModo) return;
    setCambiandoModo(true);
    setError(null);
    try {
      await useAppStore.getState().patchGame({ boardMode: nuevo });
    } catch {
      setError('No se pudo cambiar el modo de tablero.');
    } finally {
      setCambiandoModo(false);
    }
  };

  const eliminar = (id: string): void => {
    void useAppStore
      .getState()
      .removeRoom(id)
      .catch(() => setError('No se pudo eliminar la sala.'));
    if (borrador.id === id) setBorrador(VACIO);
    if (menuId === id) setMenuId(null);
    if (editandoPin === id) setEditandoPin(null);
  };

  /* ---------- Formulario clásico ---------- */

  const editar = (id: string): void => {
    const sala = game.rooms.find((r) => r.id === id);
    if (!sala) return;
    if (modo === 'aerial' && sala.pin) {
      setEditandoPin(id);
      setMenuId(null);
      setNombreChincheta(sala.name);
      setDescChincheta(sala.description ?? '');
      return;
    }
    setBorrador({
      id: sala.id,
      name: sala.name,
      description: sala.description ?? '',
      photoUrl: sala.photoUrl,
    });
    setError(null);
  };

  const enviar = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const name = borrador.name.trim();
    if (!name) {
      setError('Escribe el nombre de la sala.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const datos: Partial<Room> = {
        name,
        description: borrador.description.trim() || undefined,
        photoUrl: borrador.photoUrl,
      };
      if (borrador.id) datos.id = borrador.id;
      await useAppStore.getState().upsertRoom(datos);
      setBorrador(VACIO);
    } catch {
      setError('No se pudo guardar. Revisa la conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Foto aérea ---------- */

  const subirFoto = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen.');
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      const { url } = await uploadFile(file);
      await useAppStore.getState().patchGame({ boardImageUrl: url, boardMode: 'aerial' });
    } catch (fallo) {
      // El servidor explica el motivo exacto (formato, tamaño…): se muestra.
      setError(
        fallo instanceof Error && fallo.message
          ? fallo.message
          : 'No se pudo subir la fotografía aérea.',
      );
    } finally {
      setSubiendo(false);
      setSobreZona(false);
    }
  };

  const abrirSelector = (): void => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => void subirFoto(input.files?.[0]);
    input.click();
  };

  const soltarFichero = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    void subirFoto(event.dataTransfer.files?.[0]);
  };

  const clicEnEscenario = (event: ReactPointerEvent<HTMLDivElement>): void => {
    // Un menú o formulario abierto se cierra con el primer clic.
    if (menuId || editandoPin || nuevaChincheta) {
      setMenuId(null);
      setEditandoPin(null);
      setNuevaChincheta(null);
      return;
    }
    if (!escenarioRef.current) return;
    const posicion = posicionRelativa(escenarioRef.current, event.clientX, event.clientY);
    setNombreChincheta('');
    setDescChincheta('');
    setNuevaChincheta(posicion);
  };

  const crearChincheta = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!nuevaChincheta) return;
    const name = nombreChincheta.trim();
    if (!name) return;
    try {
      await useAppStore.getState().upsertRoom({
        name,
        description: descChincheta.trim() || undefined,
        pin: nuevaChincheta,
      });
      setNuevaChincheta(null);
      setNombreChincheta('');
      setDescChincheta('');
    } catch {
      setError('No se pudo crear la sala.');
    }
  };

  const guardarEdicionPin = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!editandoPin) return;
    const sala = game.rooms.find((r) => r.id === editandoPin);
    const name = nombreChincheta.trim();
    if (!sala || !name) return;
    try {
      await useAppStore.getState().upsertRoom({
        id: sala.id,
        name,
        description: descChincheta.trim() || undefined,
        pin: sala.pin,
      });
      setEditandoPin(null);
    } catch {
      setError('No se pudo guardar la sala.');
    }
  };

  /* ---------- Arrastre de chinchetas ---------- */

  const iniciarArrastre = (event: ReactPointerEvent<HTMLButtonElement>, sala: Room): void => {
    event.stopPropagation();
    if (!sala.pin) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setArrastre({ id: sala.id, x: sala.pin.x, y: sala.pin.y });
  };

  const moverArrastre = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (!arrastre || !escenarioRef.current) return;
    event.stopPropagation();
    const posicion = posicionRelativa(escenarioRef.current, event.clientX, event.clientY);
    setArrastre({ id: arrastre.id, ...posicion });
  };

  const soltarArrastre = (event: ReactPointerEvent<HTMLButtonElement>, sala: Room): void => {
    event.stopPropagation();
    if (!arrastre || arrastre.id !== sala.id) return;
    const movido =
      Math.abs(arrastre.x - (sala.pin?.x ?? 0)) > 0.004 ||
      Math.abs(arrastre.y - (sala.pin?.y ?? 0)) > 0.004;
    const destino = { x: arrastre.x, y: arrastre.y };
    setArrastre(null);

    if (movido) {
      void useAppStore
        .getState()
        .upsertRoom({ id: sala.id, name: sala.name, pin: destino })
        .catch(() => setError('No se pudo mover la chincheta.'));
      return;
    }
    // Clic limpio: abre el menú de la chincheta.
    setNuevaChincheta(null);
    setEditandoPin(null);
    setMenuId((actual) => (actual === sala.id ? null : sala.id));
  };

  /* ---------- Render ---------- */

  const selectorDeModo = (
    <div className="sp-modes">
      <button
        type="button"
        className={`sp-mode${modo === 'generated' ? ' sp-mode--active' : ''}`}
        onClick={() => void cambiarModo('generated')}
        disabled={cambiandoModo}
      >
        {modo === 'generated' && <span className="sp-mode-check">Activo</span>}
        <span className="sp-mode-glyph" aria-hidden="true">
          ▦
        </span>
        <span className="sp-mode-name">Tablero clásico generado</span>
        <span className="sp-mode-desc">
          Escribe las salas y la plataforma dibuja un tablero de Cluedo con pasadizos secretos.
        </span>
      </button>

      <button
        type="button"
        className={`sp-mode${modo === 'aerial' ? ' sp-mode--active' : ''}`}
        onClick={() => void cambiarModo('aerial')}
        disabled={cambiandoModo}
      >
        {modo === 'aerial' && <span className="sp-mode-check">Activo</span>}
        <span className="sp-mode-glyph" aria-hidden="true">
          ⌖
        </span>
        <span className="sp-mode-name">Foto aérea del espacio real</span>
        <span className="sp-mode-desc">
          Sube una vista aérea de tu casa y clava chinchetas: el tablero será tu espacio de verdad.
        </span>
      </button>
    </div>
  );

  const posicionAncla = (x: number, y: number): { left: string; top: string; translate: string } => ({
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    // La tarjeta se aparta hacia el lado con más sitio para no salirse de la foto.
    translate: `${x > 0.6 ? '-100%' : x < 0.4 ? '0' : '-50%'} ${y > 0.55 ? '-115%' : '18px'}`,
  });

  return (
    <div className="sp-panel">
      <PanelHeader
        title="Salas"
        subtitle="Los espacios donde transcurrirá la velada. Descríbelos: la trama se ambientará en tu casa concreta."
        count={game.rooms.length}
        min={4}
        noun="salas"
      />

      {selectorDeModo}

      {error && (
        <p className="sp-error" role="alert">
          {error}
        </p>
      )}

      {modo === 'generated' ? (
        <div className="sp-layout">
          <form className="deco-frame sp-form" onSubmit={(event) => void enviar(event)}>
            <h3 className="sp-form-title">{editando ? 'Editar sala' : 'Nueva sala'}</h3>

            <div className="sp-field">
              <label className="label" htmlFor="sala-nombre">
                Nombre de la sala
              </label>
              <input
                id="sala-nombre"
                className="input"
                value={borrador.name}
                onChange={(event) => setBorrador({ ...borrador, name: event.target.value })}
                placeholder="Biblioteca"
                autoComplete="off"
              />
            </div>

            <div className="sp-field">
              <label className="label" htmlFor="sala-desc">
                Descripción (opcional)
              </label>
              <textarea
                id="sala-desc"
                className="textarea"
                rows={4}
                value={borrador.description}
                onChange={(event) => setBorrador({ ...borrador, description: event.target.value })}
                placeholder="El salón con la chimenea que nunca tira bien y el sofá donde siempre acaba durmiendo el gato."
              />
              <p className="sp-hint">Los detalles reales convierten tu casa en la mansión del crimen.</p>
            </div>

            <PhotoUpload
              value={borrador.photoUrl}
              shape="square"
              label="Fotografía (opcional)"
              onChange={(photoUrl) => setBorrador({ ...borrador, photoUrl })}
            />

            <div className="sp-form-actions">
              <button className="btn btn--primary" type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Añadir sala'}
              </button>
              {editando && (
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => {
                    setBorrador(VACIO);
                    setError(null);
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <EntityGallery
            items={game.rooms.map((sala) => ({
              id: sala.id,
              name: sala.name,
              description: sala.description,
              photoUrl: sala.photoUrl,
            }))}
            shape="square"
            emptySymbol="⌂"
            emptyTitle="La mansión está vacía"
            emptyBody="Añade al menos cuatro estancias. Con seis o nueve, el tablero recuerda al Cluedo original."
            editingId={borrador.id}
            onEdit={editar}
            onDelete={eliminar}
          />
        </div>
      ) : !game.boardImageUrl ? (
        <div
          className={`sp-upload-zone${sobreZona ? ' sp-upload-zone--over' : ''}`}
          role="button"
          tabIndex={0}
          onClick={abrirSelector}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') abrirSelector();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setSobreZona(true);
          }}
          onDragLeave={() => setSobreZona(false)}
          onDrop={soltarFichero}
        >
          <span className="sp-upload-glyph" aria-hidden="true">
            ✧
          </span>
          <p className="sp-upload-title">{subiendo ? 'Subiendo la fotografía…' : 'Sube la vista aérea'}</p>
          <p className="sp-upload-hint">
            Un plano, una captura del satélite o una foto desde arriba del espacio donde jugaréis.
            Después bastará con clavar una chincheta en cada estancia.
          </p>
        </div>
      ) : (
        <div className="sp-aerial-layout">
          <div className="sp-aerial-main">
            <div
              ref={escenarioRef}
              className="sp-stage"
              onPointerDown={clicEnEscenario}
              role="presentation"
            >
              <img src={game.boardImageUrl} alt="Vista aérea del espacio de juego" draggable={false} />

              {conChincheta.map((sala, indice) => {
                const arrastrando = arrastre?.id === sala.id;
                const x = arrastrando ? arrastre.x : (sala.pin?.x ?? 0);
                const y = arrastrando ? arrastre.y : (sala.pin?.y ?? 0);
                return (
                  <button
                    key={sala.id}
                    type="button"
                    className={`sp-pin${arrastrando ? ' sp-pin--dragging' : ''}`}
                    style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                    onPointerDown={(event) => iniciarArrastre(event, sala)}
                    onPointerMove={moverArrastre}
                    onPointerUp={(event) => soltarArrastre(event, sala)}
                    title={sala.name}
                    aria-label={`Chincheta de ${sala.name}`}
                  >
                    <span className="sp-pin-tip">{sala.name}</span>
                    <span className="sp-pin-head">{indice + 1}</span>
                    <span className="sp-pin-tail" />
                  </button>
                );
              })}

              {conChincheta.length === 0 && !nuevaChincheta && (
                <span className="sp-stage-hint">Haz clic sobre una estancia para clavar su chincheta</span>
              )}

              {/* Menú de una chincheta existente */}
              {menuId &&
                (() => {
                  const sala = game.rooms.find((r) => r.id === menuId);
                  if (!sala?.pin) return null;
                  return (
                    <div
                      className="deco-frame sp-pin-menu"
                      style={posicionAncla(sala.pin.x, sala.pin.y)}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <p className="sp-pin-menu-name">{sala.name}</p>
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => {
                          setMenuId(null);
                          setNombreChincheta(sala.name);
                          setDescChincheta(sala.description ?? '');
                          setEditandoPin(sala.id);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--danger"
                        onClick={() => eliminar(sala.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  );
                })()}

              {/* Formulario de nueva chincheta */}
              {nuevaChincheta && (
                <form
                  className="deco-frame sp-pin-form"
                  style={posicionAncla(nuevaChincheta.x, nuevaChincheta.y)}
                  onPointerDown={(event) => event.stopPropagation()}
                  onSubmit={(event) => void crearChincheta(event)}
                >
                  <p className="sp-pin-menu-name">Nueva sala aquí</p>
                  <input
                    className="input"
                    value={nombreChincheta}
                    onChange={(event) => setNombreChincheta(event.target.value)}
                    placeholder="Nombre de la estancia"
                    autoFocus
                  />
                  <textarea
                    className="textarea"
                    rows={2}
                    value={descChincheta}
                    onChange={(event) => setDescChincheta(event.target.value)}
                    placeholder="Descripción (opcional)"
                  />
                  <div className="sp-form-actions">
                    <button className="btn btn--primary btn--sm" type="submit">
                      Clavar
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      type="button"
                      onClick={() => setNuevaChincheta(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {/* Formulario de edición de una chincheta */}
              {editandoPin &&
                (() => {
                  const sala = game.rooms.find((r) => r.id === editandoPin);
                  if (!sala?.pin) return null;
                  return (
                    <form
                      className="deco-frame sp-pin-form"
                      style={posicionAncla(sala.pin.x, sala.pin.y)}
                      onPointerDown={(event) => event.stopPropagation()}
                      onSubmit={(event) => void guardarEdicionPin(event)}
                    >
                      <p className="sp-pin-menu-name">Editar sala</p>
                      <input
                        className="input"
                        value={nombreChincheta}
                        onChange={(event) => setNombreChincheta(event.target.value)}
                        placeholder="Nombre de la estancia"
                        autoFocus
                      />
                      <textarea
                        className="textarea"
                        rows={2}
                        value={descChincheta}
                        onChange={(event) => setDescChincheta(event.target.value)}
                        placeholder="Descripción (opcional)"
                      />
                      <div className="sp-form-actions">
                        <button className="btn btn--primary btn--sm" type="submit">
                          Guardar
                        </button>
                        <button
                          className="btn btn--ghost btn--sm"
                          type="button"
                          onClick={() => setEditandoPin(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  );
                })()}
            </div>

            <p className="sp-side-note">
              Clic sobre la foto para clavar una sala · arrastra una chincheta para recolocarla ·
              clic en la chincheta para editarla.
            </p>
          </div>

          <aside className="sp-aerial-side">
            <div className="deco-frame sp-side-card">
              <p className="sp-side-note">
                {conChincheta.length} {conChincheta.length === 1 ? 'sala clavada' : 'salas clavadas'} sobre
                el plano.
              </p>
              <button type="button" className="btn btn--sm" onClick={abrirSelector} disabled={subiendo}>
                {subiendo ? 'Subiendo…' : 'Cambiar fotografía'}
              </button>
            </div>

            <EntityGallery
              items={conChincheta.map((sala, indice) => ({
                id: sala.id,
                name: sala.name,
                description: sala.description,
                photoUrl: sala.photoUrl,
                badge: String(indice + 1),
              }))}
              shape="square"
              className="sp-side-list"
              emptySymbol="⌖"
              emptyTitle="Ninguna chincheta todavía"
              emptyBody="Haz clic sobre la fotografía para marcar la primera estancia."
              editingId={editandoPin}
              onEdit={editar}
              onDelete={eliminar}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
