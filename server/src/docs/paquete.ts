/**
 * Armado del paquete completo de una partida.
 *
 * Decide qué documentos entran, en qué carpeta y con qué nombre. Los nombres de
 * carpeta llevan el aviso dentro —`NO_ABRIR_GM`— porque en la carpeta de
 * descargas de alguien que juega a ciegas, un `dosier-maite.pdf` suelto es una
 * bomba: el aviso tiene que viajar con el fichero, no en una hoja aparte.
 *
 * El prefijo numérico también es parte del producto: marca por dónde se empieza.
 */
import { printableDocsFor } from '../../../shared/documents';
import { vistaGm } from './contexto';
import { renderPrintableDocument } from './imprimibles';
import { renderPlayerDocument } from './renderer';
import type { DocumentRenderOptions, GameSession } from '../../../shared/types';

export interface EntradaPaquete {
  /** Ruta dentro del ZIP, sin extensión. */
  ruta: string;
  /** Compone el HTML del documento. Se llama en el momento de escribirlo. */
  componer: (opciones: DocumentRenderOptions) => string | null;
}

/** Nombre de fichero seguro, conservando la legibilidad. */
function limpiar(texto: string): string {
  return (
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'documento'
  );
}

const dos = (n: number): string => String(n).padStart(2, '0');

export interface Paquete {
  /** Texto plano que se lee antes de descomprimir nada. */
  leeme: string;
  entradas: EntradaPaquete[];
}

export function armarPaquete(game: GameSession): Paquete {
  const vista = vistaGm(game);
  const aCiegas = vista.modo === 'blind';
  const entradas: EntradaPaquete[] = [];

  const carpetaGm = aCiegas ? '01_GAME_MASTER' : '01_PARA_TI';
  const carpetaJugadores = aCiegas ? '02_JUGADORES_NO_ABRIR_GM' : '02_JUGADORES';
  const carpetaPreparador = '03_SOLO_PREPARADOR_NO_ABRIR_GM';

  const docs = printableDocsFor(game.settings);

  // El índice va suelto en la raíz: es lo primero que se abre y, a ciegas, lo
  // que explica qué carpeta no se puede tocar.
  const indice = docs.find((d) => d.id === 'indice-paquete');
  if (indice) {
    entradas.push({
      ruta: '00_EMPIEZA_POR_AQUI',
      componer: (op) => renderPrintableDocument(game, 'indice-paquete', op)?.html ?? null,
    });
  }

  let nGm = 0;
  let nPreparador = 0;
  for (const doc of docs) {
    if (doc.id === 'indice-paquete') continue;
    // A ciegas, lo del preparador va a su propia carpeta con el aviso en el
    // nombre. En modo anfitrión no hay dos personas: todo es del mismo.
    const alPreparador = aCiegas && doc.audience === 'preparer';
    const carpeta = alPreparador ? carpetaPreparador : carpetaGm;
    const indiceCarpeta = alPreparador ? ++nPreparador : ++nGm;
    entradas.push({
      ruta: `${carpeta}/${dos(indiceCarpeta)}_${limpiar(doc.name)}`,
      componer: (op) => renderPrintableDocument(game, doc.id, op)?.html ?? null,
    });
  }

  // Dosier del Game Master: siempre suyo.
  entradas.push({
    ruta: `${carpetaGm}/${dos(++nGm)}_${aCiegas ? 'Guia_de_la_velada' : 'Dosier_del_Game_Master'}`,
    componer: (op) => renderPlayerDocument(game, 'gm', op)?.html ?? null,
  });

  // Sobre sellado: solo existe a ciegas, y es del preparador.
  if (aCiegas) {
    entradas.push({
      ruta: `${carpetaPreparador}/${dos(++nPreparador)}_El_sobre_del_crimen`,
      componer: (op) => renderPlayerDocument(game, 'solution', op)?.html ?? null,
    });
  }

  // Un dosier por jugador.
  for (const sospechoso of game.suspects) {
    entradas.push({
      ruta: `${carpetaJugadores}/dosier_${limpiar(sospechoso.name)}`,
      componer: (op) => renderPlayerDocument(game, sospechoso.id, op)?.html ?? null,
    });
  }

  const leeme = aCiegas
    ? `${game.plot?.title ?? game.name}
${'='.repeat((game.plot?.title ?? game.name).length)}

LEE ESTO ANTES DE ABRIR NADA.

Esta partida se juega con el Game Master A CIEGAS: quien dirige juega
también y no conoce la solución. Para que eso funcione hacen falta dos
personas distintas.

  ${carpetaGm}/
      Lo que puede leer quien dirige. Nada de aquí revela el caso.

  ${carpetaJugadores}/
      Un dosier por jugador. Los reparte la persona preparadora.
      Quien dirige NO los abre.

  ${carpetaPreparador}/
      La solución, las pistas y el desenlace.
      Si diriges la velada, NO ABRAS ESTA CARPETA.

Empieza por 00_EMPIEZA_POR_AQUI, que lo explica todo con detalle.

Generado con GameMasters.
`
    : `${game.plot?.title ?? game.name}
${'='.repeat((game.plot?.title ?? game.name).length)}

LEE ESTO ANTES DE ABRIR NADA.

Diriges la partida y conoces la solución, así que preparas el material
tú mismo.

  ${carpetaGm}/
      Todo tu material, incluida la solución. Que no lo vea nadie más.

  ${carpetaJugadores}/
      Un dosier por jugador. Se entregan cerrados.

Empieza por 00_EMPIEZA_POR_AQUI.

Generado con GameMasters.
`;

  return { leeme, entradas };
}
