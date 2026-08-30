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

/**
 * El identificador de un documento imprimible. CADENA LIBRE, y esto es
 * importante.
 *
 * ═══ ERA UNA UNIÓN CERRADA DE VEINTINUEVE ═══
 *
 * Trece de CLUEDO, ocho de la Momia y ocho de las Sombras, todos escritos aquí,
 * en un fichero del núcleo que se compila para todos. Y no era solo la lista:
 * enfrente había un `Record<PrintableDocId, Plantilla>` EXHAUSTIVO en
 * `docs/imprimibles/index.ts`, así que el compilador exigía que cada documento
 * de cada juego estuviera enchufado ahí.
 *
 * O sea que añadir un juego con imprimibles obligaba a tocar dos ficheros del
 * tronco, y un juego con treinta documentos —una campaña de rol tiene fichas,
 * mapas, cartas de encuentro, tablas de botín— habría metido treinta renglones
 * en el contrato común. Eso no escala: es exactamente el cuello de botella que
 * hace que el núcleo crezca cada vez que un juego crece.
 *
 * ═══ QUÉ LA SUSTITUYE ═══
 *
 * Cada juego declara sus documentos en su manifiesto (`manifiesto.documentos`)
 * y registra sus plantillas con `registrarImprimibles`. Quien compone un
 * documento pregunta al catálogo DEL JUEGO que se juega, que es lo que ya hacía
 * `fichaDelDocumento`. La unión cerrada no aportaba seguridad real —el catálogo
 * ya era el que mandaba— y sí imponía el peaje.
 *
 * Lo que se pierde: el compilador ya no avisa si un juego declara un documento
 * y se olvida de registrar su plantilla. Lo cubre `npm run verify:juegos`, que
 * recorre los juegos instalados y comprueba justo eso.
 */
export type PrintableDocId = string;

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
  /**
   * ¿Este documento es UN BLOQUE POR PERSONA?
   *
   * Los dosieres de un juego propio se componen en un solo fichero —se imprime
   * una vez y se recorta— pero el taller los reparte de uno en uno: abre el de
   * Ana, lo manda por correo, lo descarga en PDF. Con esto declarado, quien
   * sirve un dosier suelto sabe qué documento tiene que componer y a nombre de
   * quién, en vez de caer en el genérico de CLUEDO.
   *
   * SIN ESTO SE MANDABA EL DOCUMENTO EQUIVOCADO. El taller entregaba un dosier
   * que hablaba de la víctima, de los sospechosos y de los pasadizos secretos,
   * sobre datos de una expedición, y sin el don — que este juego declara como
   * sección obligatoria.
   */
  porPersona?: boolean;
  /**
   * ¿Necesita al menos un LUGAR para tener sentido?
   *
   * Estaba en un `Set` dentro de `docs/imprimibles/index.ts` con los tres ids
   * que lo cumplen, uno por juego. O sea: el núcleo sabía que los carteles de
   * cámara son de la Momia y los de paso, de las Sombras. Es un dato sobre un
   * documento, así que va con el documento.
   *
   * Y no es cosmético en un caso: sin pasos no hay carteles, sin carteles no hay
   * contraseñas que leer, y El Paso de las Sombras no se puede jugar. Que el
   * documento no salga es mejor que un folio con una portada y nada más.
   */
  necesitaLugares?: boolean;
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
    id: 'manual-gm',
    name: 'Manual del Game Master',
    summary:
      'El documento que tienes en la mano toda la noche: reglas que leer, estructura de cada ronda, salas activas, sobres y listas de control.',
    audience: 'gm',
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
    necesitaLugares: true,
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
    id: 'carta-imprevistos',
    name: 'Imprevistos',
    summary:
      'Una hoja suelta para tener al lado: respuestas que sirven siempre y qué hacer cuando alguien llega tarde, se va o el grupo se atasca.',
    audience: 'gm',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'tarjetas-ensobrar',
    name: 'Tarjetas para ensobrar',
    summary:
      'El contenido de cada sobre, recortable: pistas por sala y ronda, revelaciones de cronología, giros personales y ayudas.',
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'guia-preparador',
    name: 'Guía del preparador',
    summary:
      'Solo con el Game Master a ciegas: qué personaje darle, a quién va cada giro y en qué orden se abre todo. Contiene la solución.',
    audience: 'preparer',
    modes: ['blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'doble',
  },
  {
    id: 'hoja-solucion',
    name: 'Hoja de solución',
    summary:
      'Tu chuleta en una hoja: la combinación, el mapa de pistas, quién guarda qué secreto y la cronología completa. Solo si diriges conociendo el caso.',
    audience: 'gm',
    modes: ['host'],
    defaultOn: true,
    copies: 'una',
    sides: 'doble',
  },
  {
    id: 'matriz-conocimiento',
    name: 'Quién sabe qué',
    summary:
      'Lo que cada jugador puede contar de los demás, cruzado. Sirve para desatascar la partida empujando encuentros en vez de dar pistas.',
    audience: 'gm',
    modes: ['host'],
    defaultOn: false,
    copies: 'una',
    sides: 'doble',
  },
  {
    id: 'desenlace',
    name: 'El desenlace',
    summary:
      'La combinación, la reconstrucción, la confesión y el epílogo. Va en sobre opaco y no se abre hasta recoger todas las acusaciones.',
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'doble',
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

export function isPrintableDocId(
  valor: unknown,
  /*
   * EL CATALOGO DEL JUEGO, por la misma razon y con la misma forma que en
   * `printableDocsFor`: `IDS` son los trece ids de CLUEDO, asi que un documento
   * de otro juego no pasaba por aqui y la ruta contestaba «ese dosier todavia no
   * se ha generado» — un mensaje que manda a mirar la generacion cuando el
   * problema era que el id ni siquiera se reconocia.
   *
   * No se puede leer el manifiesto desde este fichero sin cerrar un ciclo de
   * imports; quien llama ya lo tiene delante.
   */
  catalogo?: PrintableDocInfo[],
): valor is PrintableDocId {
  if (typeof valor !== 'string') return false;
  if (catalogo) return catalogo.some((d) => d.id === valor);
  return IDS.has(valor);
}

export function printableDocInfo(
  id: PrintableDocId,
  /*
   * La tercera de la misma familia, y por la misma razon que las otras dos:
   * `PRINTABLE_DOCS` son los trece de CLUEDO, asi que la ficha de un documento
   * de otro juego no se encontraba y el paquete salia sin su nombre ni su
   * numero de copias. Sin catalogo se comporta como antes.
   */
  catalogo?: PrintableDocInfo[],
): PrintableDocInfo | undefined {
  return (catalogo ?? PRINTABLE_DOCS).find((d) => d.id === id);
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
  /*
   * EL CATALOGO DEL JUEGO, y por parametro en vez de por import.
   *
   * Esta funcion filtraba `PRINTABLE_DOCS`, que es el catalogo de CLUEDO. Con
   * un segundo juego eso significa que sus diez documentos no aparecen y que
   * los trece de CLUEDO si, aunque no existan para el: el paquete imprimible
   * de una partida de la Momia saldria con la hoja de solucion de un asesinato.
   *
   * Lo natural seria leer aqui `manifiestoDe(juego).documentos`, y no se puede:
   * el manifiesto de CLUEDO importa `PrintableDocId` de este fichero, asi que
   * importar el registro de juegos desde aqui cierra un ciclo —lo avisa la
   * cabecera del fichero—. Con el catalogo por parametro no hay ciclo: lo pasa
   * quien ya tiene el manifiesto delante.
   *
   * El valor por defecto es el de CLUEDO, asi que las llamadas que no lo pasen
   * se comportan exactamente igual que antes.
   */
  catalogo: PrintableDocInfo[] = PRINTABLE_DOCS,
): PrintableDocInfo[] {
  const modo = resolveGmMode(settings);
  const elegidos = settings?.printableDocs;
  return catalogo.filter((doc) => {
    if (!doc.modes.includes(modo)) return false;
    if (!elegidos) return doc.defaultOn;
    return elegidos.includes(doc.id);
  });
}
