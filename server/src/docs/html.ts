/** Utilidades mínimas de composición de HTML, comunes a todos los documentos. */

/** Escapa texto para insertarlo con seguridad en el HTML. */
export function esc(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
