/**
 * Piezas compartidas de los paneles del estudio:
 * - PanelHeader: cabecera con título, subtítulo y contador de mínimos.
 * - EntityGallery: galería de fichas de expediente con animaciones.
 * - Iconos discretos (lápiz, papelera, cámara) y monograma de iniciales.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

// ---------- Iconos ----------

export function IconPencil(): JSX.Element {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function IconTrash(): JSX.Element {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function IconCamera(): JSX.Element {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8h3l2-3h6l2 3h3v11H4Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

// ---------- Utilidades ----------

/** Monograma con las iniciales del nombre (para fichas sin foto). */
export function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.charAt(0) ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? '' : '';
  return (first + second).toUpperCase() || '?';
}

// ---------- Cabecera con contador ----------

export interface PanelHeaderProps {
  title: string;
  subtitle: string;
  count: number;
  min: number;
  /** Sustantivo en plural, p. ej. "sospechosos" */
  noun: string;
}

export function PanelHeader({ title, subtitle, count, min, noun }: PanelHeaderProps): JSX.Element {
  const enough = count >= min;
  return (
    <header className="sp-header">
      <div>
        <h2 className="sp-title">{title}</h2>
        <p className="sp-subtitle">{subtitle}</p>
      </div>
      <span
        className={`sp-counter${enough ? ' sp-counter--ok' : ''}`}
        title={enough ? 'Cantidad suficiente para generar la trama' : `Añade al menos ${min}`}
      >
        <strong>{count}</strong> de mínimo {min} {noun}
      </span>
    </header>
  );
}

// ---------- Galería de fichas de expediente ----------

export interface EntityCardData {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  /** Línea secundaria pequeña (p. ej. el correo del sospechoso) */
  meta?: string;
  /** Insignia numérica sobre la foto (p. ej. número de chincheta) */
  badge?: string;
}

interface EntityGalleryProps {
  items: EntityCardData[];
  shape: 'circle' | 'square';
  emptySymbol: string;
  emptyTitle: string;
  emptyBody: string;
  /** Ficha que se está editando en el formulario (resaltada en oro) */
  editingId?: string | null;
  className?: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function EntityGallery({
  items,
  shape,
  emptySymbol,
  emptyTitle,
  emptyBody,
  editingId,
  className,
  onEdit,
  onDelete,
}: EntityGalleryProps): JSX.Element {
  // Eliminación en dos pasos: primer clic pide confirmación, se desarma sola.
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmId) return;
    const timer = window.setTimeout(() => setConfirmId(null), 3200);
    return () => window.clearTimeout(timer);
  }, [confirmId]);

  if (items.length === 0) {
    return (
      <div className={`deco-frame sp-empty${className ? ` ${className}` : ''}`}>
        <span className="sp-empty-symbol" aria-hidden="true">
          {emptySymbol}
        </span>
        <p className="sp-empty-title">{emptyTitle}</p>
        <p className="sp-empty-body">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className={`sp-gallery${className ? ` ${className}` : ''}`}>
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.article
            key={item.id}
            className={`deco-frame sp-card sp-card--${shape}${
              editingId === item.id ? ' sp-card--editing' : ''
            }`}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.22 } }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: Math.min(index * 0.05, 0.35) }}
          >
            <div className="sp-card-media">
              {item.photoUrl ? (
                <img className="sp-card-photo" src={item.photoUrl} alt={`Foto de ${item.name}`} />
              ) : (
                <span className="sp-monogram" aria-hidden="true">
                  {monogram(item.name)}
                </span>
              )}
              {item.badge !== undefined && <span className="sp-card-badge">{item.badge}</span>}
            </div>

            <div className="sp-card-body">
              <h3 className="sp-card-name">{item.name}</h3>
              {item.meta && <p className="sp-card-meta">{item.meta}</p>}
              <p className={`sp-card-desc${item.description ? '' : ' sp-card-desc--empty'}`}>
                {item.description ?? 'Sin descripción todavía.'}
              </p>
            </div>

            <div className="sp-card-actions">
              <button
                type="button"
                className="sp-icon-btn"
                title="Editar"
                aria-label={`Editar ${item.name}`}
                onClick={() => onEdit(item.id)}
              >
                <IconPencil />
              </button>
              {confirmId === item.id ? (
                <button
                  type="button"
                  className="sp-icon-btn sp-icon-btn--danger sp-confirm"
                  title="Confirmar eliminación"
                  aria-label={`Confirmar la eliminación de ${item.name}`}
                  onClick={() => {
                    setConfirmId(null);
                    onDelete(item.id);
                  }}
                >
                  ¿Seguro?
                </button>
              ) : (
                <button
                  type="button"
                  className="sp-icon-btn sp-icon-btn--danger"
                  title="Eliminar"
                  aria-label={`Eliminar ${item.name}`}
                  onClick={() => setConfirmId(item.id)}
                >
                  <IconTrash />
                </button>
              )}
            </div>

            <span className="sp-card-stamp" aria-hidden="true">
              Expediente
            </span>
          </motion.article>
        ))}
      </AnimatePresence>
    </div>
  );
}
