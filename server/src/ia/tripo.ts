/**
 * Tripo: de una imagen a un modelo 3D con texturas.
 *
 * POR QUÉ TRIPO Y NO HUNYUAN3D. Los dos convierten imagen en malla con calidad
 * comparable; Tripo trae además auto-rigging y una biblioteca de animaciones en
 * la MISMA API, que es exactamente la fase siguiente («que el avatar se mueva»)
 * sin cambiar de proveedor ni de formato. Y su alta es una clave de API sin
 * trámites de nube china.
 *
 * EL FLUJO, que es el estándar de estos servicios:
 *
 *   1. Subir la imagen  → un testigo de fichero.
 *   2. Crear la tarea   → un identificador.
 *   3. Sondear la tarea → estados y porcentaje, hasta `success`.
 *   4. Descargar el GLB → se guarda en NUESTRO disco y se sirve firmado.
 *
 * El paso 4 importa más de lo que parece: las URLs que devuelve Tripo caducan.
 * Si el móvil las usara directamente, el avatar funcionaría hoy y desaparecería
 * dentro de unos días sin que nadie hubiera tocado nada.
 *
 * SIN CLAVE NO HAY SERVICIO, Y SE DICE. `TRIPO_API_KEY` en el entorno. Si
 * falta, `disponible()` es falso y las rutas responden 503 con un mensaje que
 * explica qué configurar — nunca un error críptico.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config';

const BASE = 'https://api.tripo3d.ai/v2/openapi';

export function tripoDisponible(): boolean {
  return Boolean(process.env.TRIPO_API_KEY?.trim());
}

function cabeceras(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.TRIPO_API_KEY?.trim() ?? ''}` };
}

export class FalloDeTripo extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'FalloDeTripo';
  }
}

/** Lo que el sondeo cuenta al móvil. Los nombres, en el idioma de la casa. */
export interface EstadoDeTarea {
  estado: 'en-cola' | 'esculpiendo' | 'listo' | 'fallo';
  /** 0..100, tal como lo da el proveedor. */
  progreso: number;
  /** Ruta LOCAL firmable del modelo, cuando está listo. */
  modelo?: string;
  /** Imagen de vista previa renderizada por el proveedor, si la dio. */
  vistaPrevia?: string;
  detalle?: string;
}

/** Sube la imagen y devuelve el testigo de fichero de Tripo. */
async function subirImagen(imagen: Buffer, tipo: 'jpg' | 'png' | 'webp'): Promise<string> {
  const forma = new FormData();
  forma.append('file', new Blob([new Uint8Array(imagen)]), `avatar.${tipo}`);

  const r = await fetch(`${BASE}/upload/sts`, {
    method: 'POST',
    headers: cabeceras(),
    body: forma,
  });
  if (!r.ok) throw new FalloDeTripo(`la subida respondió ${r.status}`);
  const cuerpo = (await r.json()) as { code?: number; data?: { image_token?: string } };
  const testigo = cuerpo.data?.image_token;
  if (!testigo) throw new FalloDeTripo('la subida no devolvió testigo de imagen');
  return testigo;
}

/**
 * Crea la tarea de imagen→modelo. Devuelve el identificador para sondear.
 *
 * Se pide con textura y PBR: un modelo sin texturas es un maniquí gris, que es
 * justo de lo que se huye.
 */
export async function crearTareaDeAvatar(
  imagen: Buffer,
  tipo: 'jpg' | 'png' | 'webp',
): Promise<string> {
  if (!tripoDisponible()) {
    throw new FalloDeTripo('TRIPO_API_KEY no está configurada en el servidor.');
  }
  const testigo = await subirImagen(imagen, tipo);

  const r = await fetch(`${BASE}/task`, {
    method: 'POST',
    headers: { ...cabeceras(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'image_to_model',
      file: { type: tipo, file_token: testigo },
      texture: true,
      pbr: true,
    }),
  });
  if (!r.ok) {
    const texto = await r.text();
    throw new FalloDeTripo(`crear la tarea respondió ${r.status}: ${texto.slice(0, 200)}`);
  }
  const cuerpo = (await r.json()) as { code?: number; data?: { task_id?: string } };
  const tarea = cuerpo.data?.task_id;
  if (!tarea) throw new FalloDeTripo('crear la tarea no devolvió identificador');
  return tarea;
}

/** El estado bruto de Tripo, traducido a los nombres de la casa. */
function traducirEstado(bruto: string): EstadoDeTarea['estado'] {
  if (bruto === 'success') return 'listo';
  if (bruto === 'failed' || bruto === 'cancelled' || bruto === 'banned') return 'fallo';
  if (bruto === 'queued') return 'en-cola';
  return 'esculpiendo';
}

/**
 * Sondea una tarea y, si terminó, DESCARGA el modelo a `carpetaDestino`.
 *
 * Devuelve el nombre del fichero local, nunca la URL del proveedor: esa caduca.
 */
export async function sondearTarea(
  tarea: string,
  carpetaDestino: string,
): Promise<EstadoDeTarea> {
  const r = await fetch(`${BASE}/task/${encodeURIComponent(tarea)}`, { headers: cabeceras() });
  if (!r.ok) throw new FalloDeTripo(`el sondeo respondió ${r.status}`);
  const cuerpo = (await r.json()) as {
    data?: {
      status?: string;
      progress?: number;
      output?: {
        pbr_model?: string;
        model?: string;
        base_model?: string;
        rendered_image?: string;
      };
    };
  };
  const datos = cuerpo.data ?? {};
  const estado = traducirEstado(String(datos.status ?? 'unknown'));
  const progreso = typeof datos.progress === 'number' ? datos.progress : 0;

  if (estado !== 'listo') {
    return { estado, progreso, detalle: String(datos.status ?? '') };
  }

  // El campo del modelo ha cambiado de nombre entre versiones del servicio:
  // se prueban en orden de preferencia en vez de apostar por uno.
  const urlModelo = datos.output?.pbr_model ?? datos.output?.model ?? datos.output?.base_model;
  if (!urlModelo) throw new FalloDeTripo('la tarea terminó pero no trae modelo');

  const nombre = `avatar-${tarea.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)}.glb`;
  const destino = path.join(carpetaDestino, nombre);

  // Idempotente: si el sondeo llega dos veces, no se descarga dos veces.
  try {
    await fs.access(destino);
  } catch {
    const descarga = await fetch(urlModelo);
    if (!descarga.ok) throw new FalloDeTripo(`descargar el modelo respondió ${descarga.status}`);
    await fs.mkdir(carpetaDestino, { recursive: true });
    await fs.writeFile(destino, Buffer.from(await descarga.arrayBuffer()));
  }

  return {
    estado: 'listo',
    progreso: 100,
    modelo: nombre,
    vistaPrevia: datos.output?.rendered_image,
  };
}

/** Dónde viven los modelos generados: junto a las fotos, en disco persistente. */
export function carpetaDeModelos(): string {
  return path.join(env.uploadsDir, 'modelos');
}
