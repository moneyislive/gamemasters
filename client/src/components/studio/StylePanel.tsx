/**
 * Panel de estilo: el meta-prompt del juego.
 *
 * Una indicación libre que da un toque personal a la velada condicionando el
 * tono, la ambientación y el vocabulario de la trama y de los dosieres. No
 * altera las reglas del Cluedo ni la profundidad del misterio: es una capa
 * sobre el mismo motor.
 */
import { useEffect, useState } from 'react';
import { STYLE_PROMPT_MAX } from '../../../../shared/types';
import { useAppStore } from '../../state/store';
import { palabrasDe } from '../../juegos/palabras';
import './studio-panels.css';

interface Preset {
  glyph: string;
  name: string;
  /** Texto que se vuelca en el campo al elegirlo. */
  text: string;
}

const PRESETS: Preset[] = [
  {
    glyph: '⚜',
    name: 'Clásico elegante',
    text: 'Una velada de alta sociedad en los años 20: elegancia contenida, ironía fina y secretos susurrados entre copas de champán.',
  },
  {
    glyph: '☈',
    name: 'Comedia disparatada',
    text: 'Una comedia absurda y muy exagerada: personajes histriónicos, coincidencias imposibles, motivos ridículos tomados muy en serio y algún gag recurrente. Que dé risa sin dejar de ser un buen misterio.',
  },
  {
    glyph: '☾',
    name: 'Terror gótico',
    text: 'Atmósfera de terror gótico: tormenta fuera, retratos que parecen mirar, secretos de familia enterrados y la sensación constante de que la casa observa. Inquietante, nunca sangriento.',
  },
  {
    glyph: '✧',
    name: 'Espacial',
    text: 'Ciencia ficción: la partida transcurre en una estación orbital aislada. Cada estancia es un módulo, los objetos son herramientas de ingeniería y nadie puede salir hasta que atraque la próxima nave.',
  },
  {
    glyph: '☂',
    name: 'Noir duro',
    text: 'Novela negra dura: narración seca, diálogos cortantes, cinismo y lluvia. Todo el mundo tiene un precio y la verdad duele más que la mentira.',
  },
  {
    glyph: '⚙',
    name: 'Muy profesional',
    text: 'Registro sobrio y profesional, como un informe de investigación real: preciso, sin florituras literarias, con datos, horas exactas y declaraciones textuales.',
  },
  {
    glyph: '⚓',
    name: 'Aventura de época',
    text: 'Aventura de exploradores: una expedición varada, mapas, diarios de campo y rivalidades académicas. Tono de folletín de aventuras, con emoción y algo de humor.',
  },
  {
    glyph: '♛',
    name: 'Intriga palaciega',
    text: 'Intriga cortesana: alianzas, herencias, títulos en juego y una etiqueta férrea que todos usan como arma. Cuanto más educada la frase, más veneno lleva dentro.',
  },
];

export default function StylePanel(): JSX.Element {
  const game = useAppStore((s) => s.game);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const actual = game?.settings.stylePrompt ?? '';

  // Sincroniza con la partida (incluye los cambios que haga el Mayordomo).
  useEffect(() => {
    setTexto(actual);
    setGuardado(false);
  }, [actual, game?.id]);

  if (!game) return <div className="sp-panel" />;

  const limpio = texto.trim();
  const haCambiado = limpio !== actual.trim();

  const guardar = async (valor: string): Promise<void> => {
    setGuardando(true);
    setError(null);
    try {
      await useAppStore.getState().patchGame({
        settings: { ...game.settings, stylePrompt: valor.trim() },
      });
      setGuardado(true);
      window.setTimeout(() => setGuardado(false), 2600);
    } catch {
      setError('No se pudo guardar el estilo. Revisa la conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  const aplicarPreset = (preset: Preset): void => {
    setTexto(preset.text);
    void guardar(preset.text);
  };

  const tramaGenerada = Boolean(game.plot);

  return (
    <div className="sp-panel">
      <header className="sp-header">
        <div>
          <h2 className="sp-title">Estilo de la velada</h2>
          <p className="sp-subtitle">
            Un toque personal: describe el ambiente que quieres y condicionará el tono de la trama
            y de los dosieres. No cambia las reglas del juego ni la profundidad del misterio.
          </p>
        </div>
        <span className={`sp-counter${actual ? ' sp-counter--ok' : ''}`}>
          {actual ? 'estilo definido' : 'clásico años 20'}
        </span>
      </header>

      <div className="sp-style-presets">
        {PRESETS.map((preset) => {
          const activo = actual.trim() === preset.text;
          return (
            <button
              key={preset.name}
              type="button"
              className={`sp-style-preset${activo ? ' sp-style-preset--activo' : ''}`}
              onClick={() => aplicarPreset(preset)}
              disabled={guardando}
              title={preset.text}
            >
              <span className="sp-style-glyph" aria-hidden="true">
                {preset.glyph}
              </span>
              <span className="sp-style-name">{preset.name}</span>
            </button>
          );
        })}
      </div>

      <div className="deco-frame sp-style-editor">
        <label className="label" htmlFor="estilo-texto">
          Tu indicación de estilo
        </label>
        <textarea
          id="estilo-texto"
          className="textarea sp-style-textarea"
          rows={4}
          maxLength={STYLE_PROMPT_MAX}
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          placeholder={palabrasDe(game.settings?.juego).taller.ejemploDeEstilo}
        />

        <div className="sp-style-footer">
          <span className="sp-style-count">
            {texto.length} / {STYLE_PROMPT_MAX}
          </span>
          <div className="sp-form-actions">
            {actual && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setTexto('');
                  void guardar('');
                }}
                disabled={guardando}
              >
                Quitar estilo
              </button>
            )}
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void guardar(texto)}
              disabled={guardando || !haCambiado}
            >
              {guardando ? 'Guardando…' : guardado && !haCambiado ? 'Guardado ✓' : 'Guardar estilo'}
            </button>
          </div>
        </div>

        {error && (
          <p className="sp-error" role="alert">
            {error}
          </p>
        )}

        <p className="sp-hint sp-style-nota">
          También puedes dictárselo al Mayordomo: «que sea una comedia disparatada» y lo anotará él.
          {tramaGenerada && (
            <>
              {' '}
              <strong className="text-gold">
                La trama ya está escrita: el estilo se aplicará a lo que se genere a partir de ahora.
              </strong>{' '}
              Para reescribirla entera con este tono, usa «Regenerar desde cero».
            </>
          )}
        </p>
      </div>
    </div>
  );
}
