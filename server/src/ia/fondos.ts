/**
 * Los fondos de sala: imágenes generadas, no salas de primitivas.
 *
 * La escena de la portada se compone de dos capas: detrás, una ilustración
 * generada en alta resolución del salón del juego; delante, el avatar 3D. Para
 * que el montaje cuele, el fondo tiene que estar pensado PARA esa composición,
 * y eso se cocina en el prompt: cámara a la altura del pecho, punto de fuga
 * central, un claro en el centro donde posará el personaje, iluminación que
 * caiga desde arriba como la luz de retrato que lleva el avatar.
 *
 * Se genera con la API de imágenes de Gemini («nano banana»). El modelo
 * concreto es configurable porque estos nombres caducan rápido; el que haya en
 * `GEMINI_IMAGE_MODEL` manda, y sin `GEMINI_API_KEY` el servicio responde 503
 * con instrucciones, no un error críptico.
 *
 * Cada fondo se genera UNA vez y se guarda en disco. Regenerarlo es borrar el
 * fichero y volver a pedirlo: la portada no depende de que un tercero esté
 * despierto.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config';

export function fondosDisponibles(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function modelo(): string {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || 'gemini-2.5-flash-image';
}

export class FalloDeFondos extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'FalloDeFondos';
  }
}

/** Dónde viven los fondos generados. */
export function carpetaDeFondos(): string {
  return path.join(env.uploadsDir, 'fondos');
}

/**
 * El prompt de cada sala.
 *
 * Lo que comparten no es casual: formato vertical, cámara al pecho, centro
 * despejado y suelo visible en el tercio bajo — es el hueco exacto donde la
 * portada planta al avatar, y la perspectiva tiene que casar con su tamaño.
 */
const ENCUADRE =
  'Vertical 9:16 game lobby background, camera at chest height, central vanishing point, ' +
  'empty clear floor space in the center foreground where a character will stand, ' +
  'polished floor with subtle reflections in the lower third, soft key light from above center, ' +
  'cinematic depth of field with background slightly soft, no people, no characters, no text.';

const PROMPTS: Record<string, string> = {
  cluedo:
    'Moody victorian mansion drawing room at night. Deep burgundy walls with dark wood wainscoting, ' +
    'gilded portrait frames, a tall arched window with moonlight, brass candle sconces with warm ' +
    'flickering candlelight, a crystal chandelier glowing above, an ornate rug. Rich mystery-noir ' +
    'palette of deep reds, mahogany and candle gold. Stylized semi-realistic game art, painterly, ' +
    'high detail. ' + ENCUADRE,
  forja:
    'Cozy fantasy artisan workshop at night. Warm amber light, a glowing forge mouth with embers, ' +
    'wooden workbench with an anvil, blueprints and plans hanging from a beam, tools on the wall, ' +
    'floating sparks. Palette of warm ambers, aged wood and parchment. Stylized semi-realistic ' +
    'game art, painterly, high detail. ' + ENCUADRE,
};

/** El prompt de una sala, o uno digno para juegos que aún no tienen el suyo. */
function promptDe(sala: string): string {
  return (
    PROMPTS[sala] ??
    `Atmospheric game lobby room for a party game called "${sala}", elegant and mysterious, ` +
      'stylized semi-realistic game art, painterly, high detail. ' + ENCUADRE
  );
}

/**
 * Genera el fondo de una sala y lo deja en disco. Devuelve el nombre local.
 *
 * Pide 4K con relación 9:16; si el modelo configurado no admite esos mandos,
 * se reintenta sin ellos antes de rendirse — mejor un fondo a 1K que ninguno.
 */
export async function generarFondo(sala: string): Promise<string> {
  if (!fondosDisponibles()) {
    throw new FalloDeFondos('GEMINI_API_KEY no está configurada en el servidor.');
  }

  const nombre = `fondo-${sala.replace(/[^a-zA-Z0-9_-]/g, '')}.png`;
  const destino = path.join(carpetaDeFondos(), nombre);

  const pedir = async (conMandos: boolean): Promise<Buffer> => {
    const cuerpo: Record<string, unknown> = {
      contents: [{ parts: [{ text: promptDe(sala) }] }],
    };
    if (conMandos) {
      cuerpo.generationConfig = { imageConfig: { aspectRatio: '9:16', imageSize: '4K' } };
    }
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo()}:generateContent?key=${process.env.GEMINI_API_KEY?.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      },
    );
    if (!r.ok) {
      const texto = await r.text();
      throw new FalloDeFondos(`la generación respondió ${r.status}: ${texto.slice(0, 200)}`);
    }
    const respuesta = (await r.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
    };
    const parte = respuesta.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!parte?.inlineData?.data) throw new FalloDeFondos('la respuesta no trae imagen');
    return Buffer.from(parte.inlineData.data, 'base64');
  };

  let imagen: Buffer;
  try {
    imagen = await pedir(true);
  } catch {
    imagen = await pedir(false);
  }

  await fs.mkdir(carpetaDeFondos(), { recursive: true });
  await fs.writeFile(destino, imagen);
  return nombre;
}

/** Los fondos que ya existen en disco, por sala. */
export async function fondosGenerados(): Promise<Record<string, string>> {
  try {
    const ficheros = await fs.readdir(carpetaDeFondos());
    const porSala: Record<string, string> = {};
    for (const f of ficheros) {
      const casa = /^fondo-([a-zA-Z0-9_-]+)\.png$/.exec(f);
      if (casa?.[1]) porSala[casa[1]] = f;
    }
    return porSala;
  } catch {
    return {};
  }
}
