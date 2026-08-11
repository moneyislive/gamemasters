/**
 * El estudio de generación: avatares 3D desde una imagen, y fondos de sala.
 *
 * QUIÉN PUEDE PEDIR GENERACIONES, y por qué así. Generar cuesta dinero de
 * verdad —cada modelo y cada fondo se paga al proveedor— así que la puerta no
 * puede estar abierta a cualquiera que encuentre la dirección. Pero tampoco se
 * puede exigir la contraseña de la casa: quien genera su avatar es un JUGADOR,
 * desde su móvil. El término medio: vale cualquier identidad de la plataforma
 * —credencial de jugador, pasaporte de cuenta o sesión del taller— y encima un
 * tope diario por identidad, porque una credencial legítima en un bucle
 * infinito arruina igual.
 *
 * LOS FICHEROS GENERADOS SE SIRVEN FIRMADOS, igual que las fotos: el enlace
 * concede UN fichero concreto y nada más. Sin firma no se puede ni enumerar.
 */
import path from 'node:path';
import { env } from '../config';
import { identidadDeTaller } from '../auth';
import { credencialDePeticion } from '../live/token';
import { sesionDeCuentaDePeticion } from '../identidad/sesion';
import { firmarConSecreto, igualSeguro } from '../secreto';
import { crearRouter } from '../rutas';
import {
  FalloDeTripo,
  carpetaDeModelos,
  crearTareaDeAvatar,
  sondearTarea,
  tripoDisponible,
} from '../ia/tripo';
import {
  FalloDeFondos,
  carpetaDeFondos,
  fondosDisponibles,
  fondosGenerados,
  generarFondo,
} from '../ia/fondos';
import type { Request, Response } from 'express';

const router = crearRouter();

// ---------------------------------------------------------------------------
// La puerta y el tope
// ---------------------------------------------------------------------------

/** Quién pide, o null. Cualquier identidad de la plataforma vale. */
function identidadDe(req: Request): string | null {
  const jugador = credencialDePeticion(req.headers.authorization);
  if (jugador) return `jugador:${jugador.gameId}:${jugador.suspectId}`;
  const cuenta = sesionDeCuentaDePeticion(req);
  if (cuenta) return `cuenta:${cuenta.cuentaId}`;
  const taller = identidadDeTaller(req);
  if (taller?.tipo === 'casa') return 'casa';
  if (taller?.tipo === 'abierto') return 'abierto';
  if (taller?.tipo === 'cuenta') return `cuenta:${taller.cuentaId}`;
  return null;
}

/**
 * Tope diario en memoria. Se pierde al reiniciar, y no importa: su trabajo es
 * parar un bucle descontrolado, no llevar contabilidad.
 */
const GASTO_DIARIO_MAX = 8;
const gasto = new Map<string, { dia: string; usos: number }>();

function dentroDelTope(quien: string): boolean {
  const hoy = new Date().toISOString().slice(0, 10);
  const registro = gasto.get(quien);
  if (!registro || registro.dia !== hoy) {
    gasto.set(quien, { dia: hoy, usos: 1 });
    return true;
  }
  if (registro.usos >= GASTO_DIARIO_MAX) return false;
  registro.usos++;
  return true;
}

function conPuerta(req: Request, res: Response): string | null {
  const quien = identidadDe(req);
  if (!quien) {
    res.status(401).json({ error: 'Entra en una partida o inicia sesión para generar.' });
    return null;
  }
  return quien;
}

// ---------------------------------------------------------------------------
// Qué hay configurado
// ---------------------------------------------------------------------------

/** La app pregunta esto para decidir qué enseñar, sin adivinar por errores. */
router.get('/generacion/disponible', (_req, res) => {
  res.json({ avatares: tripoDisponible(), fondos: fondosDisponibles() });
});

// ---------------------------------------------------------------------------
// Avatares: imagen → tarea → sondeo → GLB local
// ---------------------------------------------------------------------------

const TIPOS_DE_IMAGEN: Record<string, 'jpg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

router.post('/generacion/avatar', async (req, res) => {
  const quien = conPuerta(req, res);
  if (!quien) return;
  if (!tripoDisponible()) {
    res.status(503).json({
      error:
        'La generación de avatares no está conectada. Falta TRIPO_API_KEY en el servidor ' +
        '(se consigue en tripo3d.ai → API).',
    });
    return;
  }
  if (!dentroDelTope(quien)) {
    res.status(429).json({ error: 'Se acabaron las generaciones por hoy. Mañana más.' });
    return;
  }

  const imagenB64 = typeof req.body?.imagen === 'string' ? req.body.imagen : '';
  const tipoMime = String(req.body?.tipo ?? 'image/jpeg');
  const tipo = TIPOS_DE_IMAGEN[tipoMime];
  if (!imagenB64 || !tipo) {
    res.status(400).json({ error: 'Hace falta una imagen JPG, PNG o WebP.' });
    return;
  }

  try {
    const imagen = Buffer.from(imagenB64, 'base64');
    // 15 MB de imagen es de sobra para un retrato; más suele ser un error.
    if (imagen.length > 15 * 1024 * 1024) {
      res.status(400).json({ error: 'La imagen es demasiado grande (máximo 15 MB).' });
      return;
    }
    const tarea = await crearTareaDeAvatar(imagen, tipo);
    res.json({ tarea });
  } catch (error) {
    const detalle = error instanceof FalloDeTripo ? error.message : 'No se pudo empezar.';
    res.status(502).json({ error: `El taller de esculpido no responde: ${detalle}` });
  }
});

router.get('/generacion/avatar/:tarea', async (req, res) => {
  if (!conPuerta(req, res)) return;
  try {
    const estado = await sondearTarea(req.params.tarea, carpetaDeModelos());
    res.json({
      ...estado,
      // La ruta firmada la compone el servidor: el móvil no fabrica enlaces.
      ...(estado.modelo ? { modeloUrl: rutaFirmada('modelos', estado.modelo) } : {}),
    });
  } catch (error) {
    const detalle = error instanceof FalloDeTripo ? error.message : 'No se pudo consultar.';
    res.status(502).json({ error: detalle });
  }
});

// ---------------------------------------------------------------------------
// Fondos de sala
// ---------------------------------------------------------------------------

router.get('/generacion/fondos', async (_req, res) => {
  const porSala = await fondosGenerados();
  res.json({
    disponible: fondosDisponibles(),
    fondos: Object.fromEntries(
      Object.entries(porSala).map(([sala, fichero]) => [sala, rutaFirmada('fondos', fichero)]),
    ),
  });
});

router.post('/generacion/fondo', async (req, res) => {
  const quien = conPuerta(req, res);
  if (!quien) return;
  if (!fondosDisponibles()) {
    res.status(503).json({
      error:
        'La generación de fondos no está conectada. Falta GEMINI_API_KEY en el servidor ' +
        '(se consigue en aistudio.google.com).',
    });
    return;
  }
  if (!dentroDelTope(quien)) {
    res.status(429).json({ error: 'Se acabaron las generaciones por hoy. Mañana más.' });
    return;
  }
  const sala = String(req.body?.sala ?? '').trim();
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(sala)) {
    res.status(400).json({ error: 'Sala no válida.' });
    return;
  }
  try {
    const fichero = await generarFondo(sala);
    res.json({ sala, url: rutaFirmada('fondos', fichero) });
  } catch (error) {
    const detalle = error instanceof FalloDeFondos ? error.message : 'No se pudo generar.';
    res.status(502).json({ error: `El pintor de fondos no responde: ${detalle}` });
  }
});

// ---------------------------------------------------------------------------
// Servir lo generado, firmado
// ---------------------------------------------------------------------------

const NOMBRE_VALIDO = /^[A-Za-z0-9_-]{1,64}\.[A-Za-z0-9]{1,8}$/;

function rutaFirmada(ambito: 'modelos' | 'fondos', archivo: string): string {
  const firma = firmarConSecreto(`generado:v1:${ambito}:${archivo}`);
  return `/api/generacion/archivo/${ambito}/${archivo}?f=${firma}`;
}

router.get('/generacion/archivo/:ambito/:archivo', (req, res) => {
  const { ambito, archivo } = req.params;
  const firma = String(req.query.f ?? '');
  if (
    (ambito !== 'modelos' && ambito !== 'fondos') ||
    !NOMBRE_VALIDO.test(archivo) ||
    path.basename(archivo) !== archivo ||
    !igualSeguro(firma, firmarConSecreto(`generado:v1:${ambito}:${archivo}`))
  ) {
    res.status(404).end();
    return;
  }
  const carpeta = path.resolve(ambito === 'modelos' ? carpetaDeModelos() : carpetaDeFondos());
  const completa = path.resolve(carpeta, archivo);
  if (completa !== path.join(carpeta, archivo)) {
    res.status(404).end();
    return;
  }
  res.sendFile(
    completa,
    {
      headers: {
        // Un generado no cambia: mismo nombre, mismo contenido. Cachear fuerte
        // es lo que evita bajar un GLB de varios megas en cada arranque.
        'Cache-Control': 'private, max-age=2592000',
        ...(archivo.endsWith('.glb') ? { 'Content-Type': 'model/gltf-binary' } : {}),
      },
    },
    (error) => {
      if (error && !res.headersSent) res.status(404).end();
    },
  );
});

export default router;
