/**
 * Ruta de los dosieres: sirve el documento de cada jugador (y el del Game
 * Master, con id 'gm'), en visualización, como descarga o convertido a PDF.
 *
 * Dos ejes independientes:
 *   ?variant=color|blanco   tema visual (el blanco gasta ~78 % menos tinta)
 *   ?format=html|pdf        cómo se entrega
 *
 * El PDF se genera con el navegador instalado en la máquina (ver `docs/pdf.ts`).
 * Si no hay ninguno se responde 503 con un mensaje que la interfaz convierte en
 * «imprime desde tu navegador», que siempre funciona.
 */
import { once } from 'node:events';
import { getStore } from '../db/store';
import { manifiestoDe, personasDe } from '../../../shared/juegos';
import { renderPlayerDocument } from '../docs/renderer';
import { renderPrintableDocument } from '../docs/imprimibles';
import { buscarNavegador, convertirAPdf, SinNavegador } from '../docs/pdf';
import { armarPaquete } from '../docs/paquete';
import { EscritorZip } from '../docs/zip';
import { isPrintableDocId } from '../../../shared/documents';
import type { DocumentCapabilities, DocumentVariant } from '../../../shared/types';
import { crearRouter } from '../rutas';

const router = crearRouter();

/** Nombre de fichero seguro para la descarga. */
function nombreDeFichero(
  prefijo: string,
  titulo: string,
  variante: DocumentVariant,
  extension: string,
): string {
  const limpio = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  // El sufijo evita que la versión en blanco pise a la de color en la carpeta
  // de descargas, que es lo que pasaba al bajar las dos seguidas.
  const sufijo = variante === 'blanco' ? '-blanco' : '';
  return `${prefijo}${limpio || 'gamemasters'}${sufijo}.${extension}`;
}

/** ¿Puede esta máquina convertir a PDF? La interfaz lo pregunta al arrancar. */
router.get('/documents/capabilities', (_req, res) => {
  const navegador = buscarNavegador();
  const respuesta: DocumentCapabilities = navegador
    ? { pdf: true, engine: navegador.nombre }
    : { pdf: false };
  res.json(respuesta);
});

/**
 * Paquete completo de la partida en un ZIP.
 *
 * Se escribe en streaming: con once dosieres en PDF el archivo ronda los 70 MB
 * y tardar medio minuto es normal, pero acumularlo en memoria antes de enviarlo
 * no lo es.
 */
router.get('/games/:id/documents.zip', async (req, res) => {
  const game = await getStore().getGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: 'No existe esa partida.' });
    return;
  }
  if (!game.plot) {
    res.status(409).json({ error: 'Esta partida todavía no tiene misterio: genéralo primero.' });
    return;
  }

  const variante: DocumentVariant = req.query.variant === 'blanco' ? 'blanco' : 'color';
  const formato = req.query.format === 'pdf' ? 'pdf' : 'html';

  // Se comprueba ANTES de escribir un solo byte: una vez empezado el ZIP ya no
  // hay forma de responder con un error en condiciones.
  if (formato === 'pdf' && !buscarNavegador()) {
    res.status(503).json({
      error:
        'Esta máquina no tiene Chrome ni Edge para generar los PDF. Descarga el paquete en HTML y usa «Imprimir → Guardar como PDF».',
    });
    return;
  }

  const { leeme, entradas } = armarPaquete(game);
  const nombreZip = nombreDeFichero('', game.plot.title, variante, 'zip').replace('.zip', `-${formato}.zip`);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreZip}"`);
  res.setHeader('Cache-Control', 'no-store');

  /*
   * SE ESPERA AL `drain`. `res.write()` devuelve `false` cuando su buffer está
   * lleno, y ese aviso se estaba ignorando: el ZIP se generaba entero a toda
   * velocidad y se amontonaba en memoria del proceso al ritmo de la descarga
   * más lenta.
   */
  const escribir = async (trozo: Buffer): Promise<void> => {
    if (!res.write(trozo)) await once(res, 'drain');
  };

  const zip = new EscritorZip(escribir);
  await zip.añadir('00_LEEME_PRIMERO.txt', leeme);

  for (const entrada of entradas) {
    try {
      const html = entrada.componer({ variant: variante });
      if (!html) continue;
      if (formato === 'pdf') {
        // Los PDF ya vienen comprimidos: volver a comprimirlos no baja nada.
        await zip.añadir(`${entrada.ruta}.pdf`, await convertirAPdf(html), false);
      } else {
        await zip.añadir(`${entrada.ruta}.html`, html);
      }
    } catch (error) {
      // Un documento que falla no puede tumbar el paquete entero: se deja
      // constancia dentro del propio ZIP y se sigue.
      console.error(`[documents] fallo al empaquetar ${entrada.ruta}:`, error);
      await zip.añadir(
        `${entrada.ruta}.ERROR.txt`,
        `No se pudo generar este documento.\n\n${error instanceof Error ? error.message : 'Error desconocido'}\n`,
      );
    }
  }

  await zip.cerrar();
  res.end();
});

router.get('/games/:id/documents/:documento', async (req, res) => {
  try {
    const game = await getStore().getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'No existe esa partida.' });
      return;
    }

    const id = req.params.documento;
    const esImprimible = isPrintableDocId(id, manifiestoDe(game.settings?.juego).documentos);

    // Los imprimibles NO están en el índice guardado: se calculan al vuelo desde
    // el catálogo, para que aparezcan también en partidas generadas antes de
    // que existieran, sin obligar a regenerarlas.
    if (!esImprimible) {
      const enIndice = game.documents?.some((doc) => doc.id === id);
      if (!enIndice) {
        res.status(404).json({ error: 'Ese dosier todavía no se ha generado.' });
        return;
      }
    }

    const variante: DocumentVariant = req.query.variant === 'blanco' ? 'blanco' : 'color';
    const formato = req.query.format === 'pdf' ? 'pdf' : 'html';
    // La barra de impresión solo estorba dentro del PDF y del visor incrustado.
    const barra = formato === 'html' && req.query.print ? (req.query.print === 'auto' ? 'auto' : true) : false;
    const opciones = { variant: variante, printBar: barra } as const;

    const documento = esImprimible
      ? renderPrintableDocument(game, id, opciones)
      : renderPlayerDocument(game, id, opciones);
    if (!documento?.html) {
      res.status(404).json({
        error: esImprimible
          ? 'Ese documento aún no puede componerse: genera antes el misterio.'
          : 'Ese dosier ya no puede componerse: la partida ha cambiado.',
      });
      return;
    }

    const prefijo = esImprimible ? '' : 'dosier-';
    const etiqueta = esImprimible
      ? documento.title
      : id === 'gm'
        ? 'game-master'
        : id === 'solution'
          ? 'el-sobre-del-crimen'
          : (personasDe(game).find((s) => s.id === id)?.name ?? documento.title);

    if (formato === 'pdf') {
      const pdf = await convertirAPdf(documento.html);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `${req.query.download ? 'attachment' : 'inline'}; filename="${nombreDeFichero(prefijo, etiqueta, variante, 'pdf')}"`,
      );
      res.send(pdf);
      return;
    }

    if (req.query.download) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${nombreDeFichero(prefijo, etiqueta, variante, 'html')}"`,
      );
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    /*
     * `end` Y NO `send`, y la diferencia se nota en un dosier grande.
     *
     * `res.send` de una cadena calcula ademas su ETag, y eso es recorrerla
     * entera para hacerle un hash antes de escribir un solo byte: trabajo de CPU
     * sincrono que detiene el bucle de eventos del proceso, o sea la partida de
     * todo el mundo. Un dosier con las fotos incrustadas en base64 son decenas
     * de megas, y aqui no hay nada que cachear: cada peticion se compone en el
     * momento.
     */
    res.end(documento.html);
  } catch (error) {
    if (error instanceof SinNavegador) {
      res.status(503).json({
        error:
          'Esta máquina no tiene Chrome ni Edge para generar el PDF. Abre el dosier y usa «Imprimir → Guardar como PDF».',
      });
      return;
    }
    console.error('[documents] error al servir el dosier:', error);
    res.status(500).json({ error: 'No se pudo abrir el dosier.' });
  }
});

export default router;
