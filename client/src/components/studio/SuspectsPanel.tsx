/**
 * Panel de sospechosos: alta y edición de las personas que jugarán, con
 * descripción psicológica (la trama se teje a su medida) y retrato opcional.
 */
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Suspect } from '../../../../shared/types';
import { useAppStore } from '../../state/store';
import EntityGallery, { PanelHeader } from './EntityList';
import PhotoUpload from './PhotoUpload';
import './studio-panels.css';

interface Borrador {
  id: string | null;
  name: string;
  email: string;
  description: string;
  photoUrl: string | undefined;
}

const VACIO: Borrador = { id: null, name: '', email: '', description: '', photoUrl: undefined };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SuspectsPanel(): JSX.Element {
  const game = useAppStore((s) => s.game);
  const [borrador, setBorrador] = useState<Borrador>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Si la partida cambia, se descarta cualquier edición en curso.
  useEffect(() => setBorrador(VACIO), [game?.id]);

  if (!game) return <div className="sp-panel" />;

  const editando = borrador.id !== null;

  const editar = (id: string): void => {
    const sospechoso = game.suspects.find((s) => s.id === id);
    if (!sospechoso) return;
    setBorrador({
      id: sospechoso.id,
      name: sospechoso.name,
      email: sospechoso.email ?? '',
      description: sospechoso.description ?? '',
      photoUrl: sospechoso.photoUrl,
    });
    setError(null);
  };

  const eliminar = (id: string): void => {
    void useAppStore
      .getState()
      .removeSuspect(id)
      .catch(() => setError('No se pudo eliminar a esta persona.'));
    if (borrador.id === id) setBorrador(VACIO);
  };

  const enviar = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const name = borrador.name.trim();
    if (!name) {
      setError('Escribe al menos el nombre de pila.');
      return;
    }
    const email = borrador.email.trim();
    if (email && !EMAIL_RE.test(email)) {
      setError('Ese correo electrónico no parece válido.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const datos: Partial<Suspect> = {
        name,
        email: email || undefined,
        description: borrador.description.trim() || undefined,
        photoUrl: borrador.photoUrl,
      };
      if (borrador.id) datos.id = borrador.id;
      await useAppStore.getState().upsertSuspect(datos);
      setBorrador(VACIO);
    } catch {
      setError('No se pudo guardar. Revisa la conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="sp-panel">
      <PanelHeader
        title="Sospechosos"
        subtitle="Las personas de carne y hueso que se sentarán a la mesa. Cuanto mejor las describas, más a medida será su personaje."
        count={game.suspects.length}
        min={3}
        noun="sospechosos"
      />

      <div className="sp-layout">
        <form className="deco-frame sp-form" onSubmit={(event) => void enviar(event)}>
          <h3 className="sp-form-title">{editando ? 'Editar sospechoso' : 'Nuevo sospechoso'}</h3>

          <div className="sp-field">
            <label className="label" htmlFor="sus-nombre">
              Nombre de pila
            </label>
            <input
              id="sus-nombre"
              className="input"
              value={borrador.name}
              onChange={(event) => setBorrador({ ...borrador, name: event.target.value })}
              placeholder="Marta"
              autoComplete="off"
            />
          </div>

          <div className="sp-field">
            <label className="label" htmlFor="sus-email">
              Correo electrónico (opcional)
            </label>
            <input
              id="sus-email"
              className="input"
              type="email"
              value={borrador.email}
              onChange={(event) => setBorrador({ ...borrador, email: event.target.value })}
              placeholder="marta@ejemplo.com"
              autoComplete="off"
            />
            <p className="sp-hint">Para hacerle llegar sus instrucciones de juego.</p>
          </div>

          <div className="sp-field">
            <label className="label" htmlFor="sus-desc">
              Descripción de la persona (opcional)
            </label>
            <textarea
              id="sus-desc"
              className="textarea"
              rows={4}
              value={borrador.description}
              onChange={(event) => setBorrador({ ...borrador, description: event.target.value })}
              placeholder="Describe su personalidad real: la trama se tejerá a su medida… ¿Es tímida y observadora? ¿Le encanta ser el centro de atención? ¿Tiene una manía célebre entre sus amigos?"
            />
            <p className="sp-hint">
              El agente usa esto para asignarle un papel que la haga disfrutar.
            </p>
          </div>

          <PhotoUpload
            value={borrador.photoUrl}
            shape="circle"
            label="Retrato (opcional)"
            onChange={(photoUrl) => setBorrador({ ...borrador, photoUrl })}
          />

          {error && (
            <p className="sp-error" role="alert">
              {error}
            </p>
          )}

          <div className="sp-form-actions">
            <button className="btn btn--primary" type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Añadir sospechoso'}
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
          items={game.suspects.map((sospechoso) => ({
            id: sospechoso.id,
            name: sospechoso.name,
            description: sospechoso.description,
            photoUrl: sospechoso.photoUrl,
            meta: sospechoso.email,
          }))}
          shape="circle"
          emptySymbol="♟"
          emptyTitle="Aún no hay invitados"
          emptyBody="Añade a las personas que jugarán. Con tres ya puede empezar el misterio; entre cinco y ocho es el número ideal."
          editingId={borrador.id}
          onEdit={editar}
          onDelete={eliminar}
        />
      </div>
    </div>
  );
}
