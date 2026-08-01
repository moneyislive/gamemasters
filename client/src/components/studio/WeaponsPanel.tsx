/**
 * Panel de armas: los objetos reales que estarán repartidos por la casa y de
 * los que saldrá el arma del crimen.
 */
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Weapon } from '../../../../shared/types';
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

/** Los seis clásicos del Cluedo, para rellenar de un clic. */
const SUGERENCIAS = [
  'Candelabro',
  'Cuerda',
  'Tubería de plomo',
  'Revólver',
  'Puñal',
  'Llave inglesa',
];

export default function WeaponsPanel(): JSX.Element {
  const game = useAppStore((s) => s.game);
  const [borrador, setBorrador] = useState<Borrador>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => setBorrador(VACIO), [game?.id]);

  if (!game) return <div className="sp-panel" />;

  const editando = borrador.id !== null;
  const nombresUsados = new Set(game.weapons.map((arma) => arma.name.toLowerCase()));

  const editar = (id: string): void => {
    const arma = game.weapons.find((w) => w.id === id);
    if (!arma) return;
    setBorrador({
      id: arma.id,
      name: arma.name,
      description: arma.description ?? '',
      photoUrl: arma.photoUrl,
    });
    setError(null);
  };

  const eliminar = (id: string): void => {
    void useAppStore
      .getState()
      .removeWeapon(id)
      .catch(() => setError('No se pudo eliminar este objeto.'));
    if (borrador.id === id) setBorrador(VACIO);
  };

  const enviar = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const name = borrador.name.trim();
    if (!name) {
      setError('Escribe el nombre del objeto.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const datos: Partial<Weapon> = {
        name,
        description: borrador.description.trim() || undefined,
        photoUrl: borrador.photoUrl,
      };
      if (borrador.id) datos.id = borrador.id;
      await useAppStore.getState().upsertWeapon(datos);
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
        title="Armas del crimen"
        subtitle="Objetos que existan de verdad en tu casa: uno de ellos será el arma homicida, el resto, señuelos perfectos."
        count={game.weapons.length}
        min={3}
        noun="objetos"
      />

      <div className="sp-layout">
        <form className="deco-frame sp-form" onSubmit={(event) => void enviar(event)}>
          <h3 className="sp-form-title">{editando ? 'Editar objeto' : 'Nuevo objeto'}</h3>

          <div className="sp-field">
            <label className="label" htmlFor="arm-nombre">
              Nombre del objeto
            </label>
            <input
              id="arm-nombre"
              className="input"
              value={borrador.name}
              onChange={(event) => setBorrador({ ...borrador, name: event.target.value })}
              placeholder="Candelabro de plata"
              autoComplete="off"
            />
          </div>

          <div className="sp-chips">
            {SUGERENCIAS.map((sugerencia) => (
              <button
                key={sugerencia}
                type="button"
                className="sp-chip"
                disabled={nombresUsados.has(sugerencia.toLowerCase())}
                onClick={() => setBorrador({ ...borrador, name: sugerencia })}
                title={
                  nombresUsados.has(sugerencia.toLowerCase())
                    ? 'Ya está en la lista'
                    : `Usar "${sugerencia}"`
                }
              >
                {sugerencia}
              </button>
            ))}
          </div>

          <div className="sp-field">
            <label className="label" htmlFor="arm-desc">
              Descripción (opcional)
            </label>
            <textarea
              id="arm-desc"
              className="textarea"
              rows={3}
              value={borrador.description}
              onChange={(event) => setBorrador({ ...borrador, description: event.target.value })}
              placeholder="El que heredó la abuela: pesado, con una muesca en la base. Suele estar en el aparador del salón."
            />
            <p className="sp-hint">Los detalles reales hacen que la trama parezca escrita para tu casa.</p>
          </div>

          <PhotoUpload
            value={borrador.photoUrl}
            shape="square"
            label="Fotografía (opcional)"
            onChange={(photoUrl) => setBorrador({ ...borrador, photoUrl })}
          />

          {error && (
            <p className="sp-error" role="alert">
              {error}
            </p>
          )}

          <div className="sp-form-actions">
            <button className="btn btn--primary" type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Añadir objeto'}
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
          items={game.weapons.map((arma) => ({
            id: arma.id,
            name: arma.name,
            description: arma.description,
            photoUrl: arma.photoUrl,
          }))}
          shape="square"
          emptySymbol="†"
          emptyTitle="El armero está vacío"
          emptyBody="Añade al menos tres objetos cotidianos. Cuanto más reconocibles sean para tus invitados, mejor."
          editingId={borrador.id}
          onEdit={editar}
          onDelete={eliminar}
        />
      </div>
    </div>
  );
}
