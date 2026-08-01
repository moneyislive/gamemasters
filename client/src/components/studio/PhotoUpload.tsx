/**
 * Campo de foto opcional para los formularios del estudio.
 * Sube el fichero al servidor (uploadFile) y muestra una vista previa
 * circular (retratos) o cuadrada (salas y armas).
 */
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { uploadFile } from '../../api/client';
import { IconCamera } from './EntityList';

interface PhotoUploadProps {
  /** URL actual de la foto (relativa a /uploads) o undefined si no hay */
  value: string | undefined;
  shape: 'circle' | 'square';
  label: string;
  onChange: (url: string | undefined) => void;
}

export default function PhotoUpload({ value, shape, label, onChange }: PhotoUploadProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    // Permite volver a elegir el mismo fichero más adelante
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadFile(file);
      onChange(url);
    } catch (fallo) {
      // El servidor explica el motivo exacto (formato, tamaño…): se muestra.
      setError(
        fallo instanceof Error && fallo.message
          ? fallo.message
          : 'No se pudo subir la foto. Inténtalo de nuevo.',
      );
    } finally {
      setUploading(false);
    }
  };

  const openPicker = (): void => inputRef.current?.click();

  return (
    <div className="sp-field">
      <span className="label">{label}</span>
      <div className={`sp-photo sp-photo--${shape}`}>
        {value ? (
          <img className="sp-photo-preview" src={value} alt="Vista previa de la foto" />
        ) : (
          <button
            type="button"
            className="sp-photo-add"
            onClick={openPicker}
            disabled={uploading}
            aria-label="Añadir foto"
          >
            {uploading ? <span className="sp-photo-spinner" aria-hidden="true" /> : <IconCamera />}
          </button>
        )}
        <div className="sp-photo-actions">
          <button type="button" className="sp-photo-btn" onClick={openPicker} disabled={uploading}>
            {uploading ? 'Subiendo…' : value ? 'Cambiar foto' : 'Añadir foto'}
          </button>
          {value && !uploading && (
            <button
              type="button"
              className="sp-photo-btn sp-photo-btn--danger"
              onClick={() => onChange(undefined)}
            >
              Quitar
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
      </div>
      {error && (
        <p className="sp-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
