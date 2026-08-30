/**
 * Menú de descarga de un documento.
 *
 * Cuatro formatos son demasiados botones para una tarjeta, así que van tras un
 * único «Descargar» que despliega la lista. Cuando la máquina no tiene un
 * navegador con el que convertir a PDF, las dos entradas de PDF no se ocultan:
 * se explican y se ofrece imprimir, que es lo que el usuario acabaría haciendo.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DOCUMENT_FORMATS } from '../../../../shared/types';
import type {
  DocumentCapabilities,
  DocumentFormat,
  DocumentVariant,
} from '../../../../shared/types';
import { documentUrl } from '../../api/client';

interface Props {
  gameId: string;
  participanteId: string;
  /** `null` mientras no se sabe; evita parpadeos al abrir el menú. */
  capacidades: DocumentCapabilities | null;
  /** Estilo del botón que abre el menú. */
  compacto?: boolean;
  /** Texto del botón. Por defecto, «Descargar». */
  etiqueta?: string;
  /**
   * Construye la URL de cada formato. Se inyecta para que el mismo menú sirva
   * para un documento suelto y para el paquete completo en ZIP.
   */
  construirUrl?: (variant: DocumentVariant, format: DocumentFormat) => string;
  /** El paquete completo no se puede «imprimir»: se descarga y ya. */
  conImprimir?: boolean;
}

export default function DownloadMenu({
  gameId,
  participanteId,
  capacidades,
  compacto = true,
  etiqueta = 'Descargar',
  construirUrl,
  conImprimir = true,
}: Props): JSX.Element {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alPulsarFuera = (event: MouseEvent): void => {
      if (!contenedor.current?.contains(event.target as Node)) setAbierto(false);
    };
    const alTeclear = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', alPulsarFuera);
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      window.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  const hayPdf = capacidades?.pdf !== false;

  return (
    <div className="docs-descarga" ref={contenedor}>
      <button
        className={`btn btn--primary${compacto ? ' btn--sm' : ''}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((previo) => !previo)}
      >
        {etiqueta} ▾
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            className="deco-frame docs-descarga-menu"
            role="menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {DOCUMENT_FORMATS.map((formato) => {
              const deshabilitado = formato.format === 'pdf' && !hayPdf;
              const clave = `${formato.format}-${formato.variant}`;
              if (deshabilitado) {
                return (
                  <span className="docs-descarga-item is-off" key={clave} role="menuitem" aria-disabled>
                    <span className="docs-descarga-label">{formato.label}</span>
                    <span className="docs-descarga-hint">
                      No hay Chrome ni Edge en este equipo. Usa «Imprimir» y elige «Guardar como PDF».
                    </span>
                  </span>
                );
              }
              return (
                <a
                  className="docs-descarga-item"
                  key={clave}
                  role="menuitem"
                  href={
                    construirUrl
                      ? construirUrl(formato.variant, formato.format)
                      : documentUrl(gameId, participanteId, {
                          variant: formato.variant,
                          format: formato.format,
                          download: true,
                        })
                  }
                  download
                  onClick={() => setAbierto(false)}
                >
                  <span className="docs-descarga-label">{formato.label}</span>
                  <span className="docs-descarga-hint">{formato.hint}</span>
                </a>
              );
            })}

            {conImprimir && (
              <a
                className="docs-descarga-item docs-descarga-item--imprimir"
                role="menuitem"
                href={documentUrl(gameId, participanteId, { print: 'auto' })}
                target="_blank"
                rel="noreferrer"
                onClick={() => setAbierto(false)}
              >
                <span className="docs-descarga-label">Imprimir…</span>
                <span className="docs-descarga-hint">
                  Abre el documento y lanza el diálogo de impresión de tu navegador.
                </span>
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
