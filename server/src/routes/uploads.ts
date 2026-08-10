/**
 * Subida de imágenes (fotos de sospechosos, salas, armas y foto aérea).
 *   POST /uploads — multipart con campo `file` → { url: '/uploads/<nombre>' }
 *
 * Se filtra por el TIPO MIME que declara el navegador, no por la extensión del
 * nombre: hay demasiadas fotos legítimas que llegan como `.jfif`, sin extensión
 * o con mayúsculas, y rechazarlas por el nombre es una fuente constante de
 * errores 400 incomprensibles. La extensión con la que se guarda se deduce del
 * propio tipo MIME.
 */
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { env } from '../config';
import { crearRouter } from '../rutas';

const router = crearRouter();

// Configurable con UPLOADS_DIR: en producción apunta al disco persistente.
const UPLOADS_DIR = env.uploadsDir;
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/** Tipos que el navegador sabe pintar en un <img>, con la extensión a usar. */
const TIPOS_ADMITIDOS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/bmp': '.bmp',
  'image/x-ms-bmp': '.bmp',
};

/**
 * Formatos que sí son imágenes pero que los navegadores NO pintan: aceptarlos
 * dejaría fotos rotas en la web y en los dosieres, así que se rechazan con un
 * mensaje que explica cómo resolverlo.
 */
const TIPOS_NO_VISIBLES: Record<string, string> = {
  'image/heic':
    'Las fotos HEIC del iPhone no se ven en el navegador. En el móvil, entra en Ajustes → Cámara → Formatos y elige «Más compatible», o exporta la foto como JPG antes de subirla.',
  'image/heif':
    'Las fotos HEIF no se ven en el navegador. Expórtala como JPG o PNG antes de subirla.',
  'image/tiff':
    'Las imágenes TIFF no se ven en el navegador. Conviértela a JPG o PNG antes de subirla.',
  'image/svg+xml':
    'Por seguridad no se admiten imágenes SVG. Usa una captura en JPG o PNG.',
};

// Las fotos de un móvil moderno pasan de 10 MB con facilidad, y una vista aérea
// en buena resolución todavía más.
const MAX_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_SIZE_LEGIBLE = '25 MB';

/** Extensión con la que guardar: la del tipo MIME, o la del nombre si encaja. */
function extensionPara(mimetype: string, originalname: string): string {
  const porMime = TIPOS_ADMITIDOS[mimetype.toLowerCase()];
  if (porMime) return porMime;
  const delNombre = path.extname(originalname).toLowerCase();
  return delNombre.length > 1 && delNombre.length <= 6 ? delNombre : '.img';
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    cb(null, `${nanoid(12)}${extensionPara(file.mimetype, file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const tipo = (file.mimetype || '').toLowerCase();

    if (TIPOS_ADMITIDOS[tipo]) {
      cb(null, true);
      return;
    }

    const explicacion = TIPOS_NO_VISIBLES[tipo];
    if (explicacion) {
      cb(new Error(explicacion));
      return;
    }

    // Cualquier otra cosa: se dice qué llegó, que depurar a ciegas es un suplicio.
    cb(
      new Error(
        `No se admite este tipo de archivo${tipo ? ` (${tipo})` : ''}. Sube una imagen JPG, PNG, WEBP, GIF o AVIF.`,
      ),
    );
  },
});

router.post('/uploads', (req, res) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
          ? `La imagen supera el límite de ${MAX_SIZE_LEGIBLE}. Redúcela de tamaño e inténtalo de nuevo.`
          : err instanceof Error
            ? err.message
            : 'No se pudo subir el fichero.';
      // Se registra en consola: si el usuario reporta un 400, aquí queda el motivo.
      console.warn('[uploads] subida rechazada:', message);
      res.status(400).json({ error: message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No se ha recibido ningún fichero (campo "file").' });
      return;
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

export default router;
