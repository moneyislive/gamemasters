/**
 * El panel de una categoría de entidades, sea la que sea.
 *
 * Antes había tres ficheros —sospechosos, salas y armas— de doscientas líneas
 * cada uno, y al normalizar el vocabulario se diferenciaban en poco más que el
 * texto. Eran la misma pantalla escrita tres veces: un formulario con nombre,
 * descripción y foto, y una galería al lado.
 *
 * Aquí hay uno solo. Lo que cambia entre categorías —cómo se llama, qué se
 * explica, si las fichas son redondas o cuadradas, si admite correo— lo declara
 * cada juego en su manifiesto, porque es contenido y no comportamiento. Un
 * juego nuevo con «herederos, piezas y estancias» tiene sus tres paneles sin
 * escribir un solo componente.
 */
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAppStore } from '../../state/store';
import EntityGallery, { PanelHeader } from './EntityList';
import PhotoUpload from './PhotoUpload';
import { entidadesDe } from '../../../../shared/juegos';
import type { CategoriaId, DefinicionCategoria } from '../../../../shared/juegos';
import { cuentaExactaDe, minimoDe } from '../../juegos/reglas';
import { estaCategoria, laCategoria, nuevaCategoria } from '../../juegos/palabras';
import './studio-panels.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Borrador {
  id: string | null;
  name: string;
  email: string;
  description: string;
  photoUrl: string | undefined;
}

const VACIO: Borrador = { id: null, name: '', email: '', description: '', photoUrl: undefined };

/**
 * «los cinco» y no «los 5».
 *
 * Una cifra en mitad de una frase se lee como un dato de formulario; escrita se
 * lee como una regla del juego, que es lo que es. Solo hacen falta las que
 * puede tener una categoría de cuenta exacta, y si algún día hay una de nueve,
 * la cifra sirve igual.
 */
function enLetra(n: number): string {
  const letras = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho'];
  return letras[n] ? `los ${letras[n]}` : `los ${n}`;
}

export default function PanelDeCategoria({
  categoria,
}: {
  categoria: DefinicionCategoria;
}): JSX.Element {
  const game = useAppStore((s) => s.game);
  const [borrador, setBorrador] = useState<Borrador>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Al cambiar de partida o de pestaña, el formulario se vacía: si no, se
  // arrastra media ficha de un sitio a otro.
  useEffect(() => setBorrador(VACIO), [game?.id, categoria.id]);

  if (!game) return <div className="sp-panel" />;

  const p = categoria.presentacion;
  const forma = p?.forma ?? 'square';
  const entidades = entidadesDe(game, categoria.id);
  const editando = borrador.id !== null;
  const nombresUsados = new Set(entidades.map((e) => e.name.toLowerCase()));
  const idFormulario = `cat-${categoria.id}`;
  const juego = game.settings?.juego;

  /*
   * LAS CATEGORÍAS DE CUENTA EXACTA. Hoy solo hay una —los cinco ritos del
   * sellado— y su regla no cabe en «mínimo N»: con cuatro, la mesa resuelve el
   * puzle por fuerza bruta en diez minutos; con seis, la sobremesa se hace
   * larga. Ver `shared/juegos/momia.ts`.
   *
   * El taller hace tres cosas con esto, y las tres hacen falta: lo DICE antes
   * de que se incumpla, IMPIDE pasarse —el formulario se cierra al llegar a
   * cinco— y no deja generar mientras no cuadre (eso lo comprueba `StudioPage`
   * con la misma regla). Avisar sin impedir habría dejado montar una partida
   * imposible; impedir sin avisar, un botón que no responde y nadie sabe por
   * qué.
   */
  const exacto = cuentaExactaDe(juego ?? 'cluedo', categoria.id);
  const completa = exacto !== undefined && entidades.length >= exacto;
  const sobran = exacto !== undefined && entidades.length > exacto;
  const bloqueado = completa && !editando;

  const editar = (id: string): void => {
    const e = entidades.find((x) => x.id === id);
    if (!e) return;
    setBorrador({
      id: e.id,
      name: e.name,
      email: e.email ?? '',
      description: e.description ?? '',
      photoUrl: e.photoUrl,
    });
    setError(null);
  };

  const eliminar = (id: string): void => {
    void useAppStore
      .getState()
      .removeEntidad(categoria.id, id)
      .catch(() => setError(`No se pudo eliminar ${estaCategoria(juego, categoria)}.`));
    if (borrador.id === id) setBorrador(VACIO);
  };

  const enviar = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const name = borrador.name.trim();
    if (!name) {
      setError(`Escribe el nombre: falta ${laCategoria(juego, categoria)}.`);
      return;
    }
    const email = borrador.email.trim();
    if (categoria.admiteEmail && email && !EMAIL_RE.test(email)) {
      setError('Ese correo no parece válido.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await useAppStore.getState().upsertEntidad(categoria.id, {
        ...(borrador.id ? { id: borrador.id } : {}),
        name,
        description: borrador.description.trim() || undefined,
        photoUrl: borrador.photoUrl,
        ...(categoria.admiteEmail ? { email: email || undefined } : {}),
      });
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
        title={p?.titulo ?? categoria.plural}
        subtitle={p?.descripcion ?? ''}
        count={entidades.length}
        min={minimoDe(categoria)}
        noun={categoria.plural}
        exacto={exacto}
      />

      <div className="sp-layout">
        <form className="deco-frame sp-form" onSubmit={(event) => void enviar(event)}>
          <h3 className="sp-form-title">
            {editando ? `Editar ${categoria.singular}` : nuevaCategoria(juego, categoria)}
          </h3>

          {exacto !== undefined && (
            <p className={`sp-regla${sobran ? ' sp-regla--rota' : ''}`} role="note">
              {sobran ? (
                <>
                  {entidades.length - exacto === 1 ? 'Sobra uno' : `Sobran ${entidades.length - exacto}`}
                  . Tienen que ser <strong>exactamente {exacto}</strong>: borra{' '}
                  {entidades.length - exacto === 1 ? 'el que menos te guste' : 'los que sobren'} para
                  poder generar.
                </>
              ) : completa ? (
                <>
                  Ya están {enLetra(exacto)}. Para cambiar alguno, edítalo o bórralo: no caben
                  más.
                </>
              ) : (
                <>
                  Tienen que ser <strong>exactamente {exacto}</strong>, ni uno más ni uno menos.
                  {exacto - entidades.length === 1
                    ? ' Falta uno.'
                    : ` Faltan ${exacto - entidades.length}.`}
                </>
              )}
            </p>
          )}

          <div className="sp-field">
            <label className="label" htmlFor={`${idFormulario}-nombre`}>
              Nombre
            </label>
            <input
              id={`${idFormulario}-nombre`}
              className="input"
              value={borrador.name}
              onChange={(event) => setBorrador({ ...borrador, name: event.target.value })}
              placeholder={p?.ejemploNombre ?? ''}
              autoComplete="off"
            />
          </div>

          {p?.sugerencias && p.sugerencias.length > 0 && (
            <div className="sp-chips">
              {p.sugerencias.map((sugerencia) => {
                const usada = nombresUsados.has(sugerencia.toLowerCase());
                return (
                  <button
                    key={sugerencia}
                    type="button"
                    className="sp-chip"
                    disabled={usada}
                    onClick={() => setBorrador({ ...borrador, name: sugerencia })}
                    title={usada ? 'Ya está en la lista' : `Usar «${sugerencia}»`}
                  >
                    {sugerencia}
                  </button>
                );
              })}
            </div>
          )}

          {categoria.admiteEmail && (
            <div className="sp-field">
              <label className="label" htmlFor={`${idFormulario}-email`}>
                Correo electrónico (opcional)
              </label>
              <input
                id={`${idFormulario}-email`}
                className="input"
                type="email"
                value={borrador.email}
                onChange={(event) => setBorrador({ ...borrador, email: event.target.value })}
                placeholder="marta@ejemplo.es"
                autoComplete="off"
              />
              <p className="sp-hint">Para hacerle llegar sus instrucciones de juego.</p>
            </div>
          )}

          <div className="sp-field">
            <label className="label" htmlFor={`${idFormulario}-desc`}>
              Descripción (opcional)
            </label>
            <textarea
              id={`${idFormulario}-desc`}
              className="textarea"
              rows={3}
              value={borrador.description}
              onChange={(event) => setBorrador({ ...borrador, description: event.target.value })}
              placeholder={p?.ejemploDescripcion ?? ''}
            />
            {p?.pista && <p className="sp-hint">{p.pista}</p>}
          </div>

          {categoria.admiteFoto && (
            <PhotoUpload
              value={borrador.photoUrl}
              shape={forma === 'circle' ? 'circle' : 'square'}
              label={forma === 'circle' ? 'Retrato (opcional)' : 'Fotografía (opcional)'}
              onChange={(photoUrl) => setBorrador({ ...borrador, photoUrl })}
            />
          )}

          {error && (
            <p className="sp-error" role="alert">
              {error}
            </p>
          )}

          <div className="sp-form-actions">
            <button className="btn btn--primary" type="submit" disabled={guardando || bloqueado}>
              {guardando
                ? 'Guardando…'
                : editando
                  ? 'Guardar cambios'
                  : `Añadir ${categoria.singular}`}
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
          items={entidades.map((e) => ({
            id: e.id,
            name: e.name,
            description: e.description,
            photoUrl: e.photoUrl,
          }))}
          shape={forma}
          emptySymbol={p?.vacio?.glifo ?? '◇'}
          emptyTitle={p?.vacio?.titulo ?? `Todavía no hay ${categoria.plural}`}
          emptyBody={p?.vacio?.texto ?? `Añade al menos ${categoria.minimo}.`}
          editingId={borrador.id}
          onEdit={editar}
          onDelete={eliminar}
        />
      </div>
    </div>
  );
}

/** Atajo para montar el panel de una categoría por su id. */
export function panelDeCategoria(
  categorias: DefinicionCategoria[],
  id: CategoriaId,
): JSX.Element | null {
  const cat = categorias.find((c) => c.id === id);
  return cat ? <PanelDeCategoria categoria={cat} /> : null;
}
