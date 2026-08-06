/**
 * Catálogo del material imprimible de una partida.
 *
 * No confundir con `DOCUMENT_SECTIONS` de `types.ts`: aquello son los bloques
 * DENTRO del dosier de un jugador; esto son documentos enteros y aparte —
 * carteles para colgar en las paredes, hojas que se reparten, etiquetas para
 * los sobres—.
 *
 * Este módulo no importa nada de `types.ts` a propósito: `types.ts` sí importa
 * de aquí `PrintableDocId`, y al revés se formaría un ciclo. Por eso
 * `resolveGmMode` recibe la forma que necesita y no `GameSettings` entero.
 */

export type PrintableDocId =
  | 'indice-paquete'
  | 'hojas-investigacion'
  | 'carteles-sala'
  | 'linea-temporal'
  | 'etiquetas-sobres'
  | 'informe-validacion';

/** Para quién es el documento. Determina en qué grupo se pinta en la interfaz. */
export type DocumentAudience = 'players' | 'gm' | 'preparer' | 'room';

/**
 * Cómo se dirige la velada.
 *
 * - `host`: el Game Master lo prepara todo y conoce la solución.
 * - `blind`: juega como un personaje más y no la conoce; hace falta una segunda
 *   persona que prepare el material.
 */
export type GmMode = 'host' | 'blind';

/** Cuántas copias hay que imprimir. El número exacto lo pone quien lo pinta. */
export type CopyRule = 'una' | 'una-por-jugador' | 'una-por-sala';

export interface PrintableDocInfo {
  id: PrintableDocId;
  name: string;
  /** Una frase: qué es y cuándo se usa en la mesa. */
  summary: string;
  audience: DocumentAudience;
  /** Modos en los que tiene sentido. */
  modes: GmMode[];
  /** ¿Se genera si el usuario no ha elegido nada? */
  defaultOn: boolean;
  copies: CopyRule;
  /**
   * Caras de impresión. Las hojas que se recortan o se reparten en momentos
   * distintos tienen que ir a una sola cara, y eso cambia el resultado físico.
   */
  sides: 'una' | 'doble';
}

export const PRINTABLE_DOCS: PrintableDocInfo[] = [
  {
    id: 'indice-paquete',
    name: 'Empieza por aquí',
    summary:
      'La hoja por la que se abre el paquete: qué imprimir, cuántas copias y, si juegas a ciegas, qué no debes abrir tú.',
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'doble',
  },
  {
    id: 'hojas-investigacion',
    name: 'Hojas de investigación y acusación',
    summary:
      'Dos caras por jugador: una para tomar notas ronda a ronda y otra, que se entrega boca abajo al final, con la única acusación.',
    audience: 'players',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una-por-jugador',
    sides: 'una',
  },
  {
    id: 'carteles-sala',
    name: 'Carteles de sala',
    summary:
      'Un cartel por página para marcar cada zona de la casa, con hueco para el sobre de la ronda y los pasadizos señalados.',
    audience: 'room',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una-por-sala',
    sides: 'una',
  },
  {
    id: 'linea-temporal',
    name: 'Línea temporal pública',
    summary:
      'Cartel con los hechos que presenciaron todos y, en el centro, el tramo sin testigos que hay que reconstruir.',
    audience: 'room',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'etiquetas-sobres',
    name: 'Etiquetas de sobres',
    summary:
      'Recortables con el código de cada sobre. Solo dicen la sala y la ronda: no revelan nada del misterio.',
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'informe-validacion',
    name: 'Informe de validación',
    summary:
      'Comprobación previa: recuento de material, salas sin pistas, rondas vacías y —si juegas a ciegas— que tu guía no lleva la solución.',
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'doble',
  },
];

const IDS = new Set<string>(PRINTABLE_DOCS.map((d) => d.id));

export function isPrintableDocId(valor: unknown): valor is PrintableDocId {
  return typeof valor === 'string' && IDS.has(valor);
}

export function printableDocInfo(id: PrintableDocId): PrintableDocInfo | undefined {
  return PRINTABLE_DOCS.find((d) => d.id === id);
}

/** Modo de dirección de la partida a partir de sus ajustes. */
export function resolveGmMode(settings: { gmPlays?: boolean } | undefined): GmMode {
  return settings?.gmPlays === true ? 'blind' : 'host';
}

/**
 * Documentos que se generan para esta partida: los del modo actual, filtrados
 * por la selección del usuario. Sin selección guardada valen los `defaultOn`,
 * igual que hace `documentSections` con las secciones del dosier.
 */
export function printableDocsFor(
  settings: { gmPlays?: boolean; printableDocs?: PrintableDocId[] } | undefined,
): PrintableDocInfo[] {
  const modo = resolveGmMode(settings);
  const elegidos = settings?.printableDocs;
  return PRINTABLE_DOCS.filter((doc) => {
    if (!doc.modes.includes(modo)) return false;
    if (!elegidos) return doc.defaultOn;
    return elegidos.includes(doc.id);
  });
}
