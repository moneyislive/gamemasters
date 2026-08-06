/**
 * Conversión de documentos a PDF.
 *
 * Sin dependencias de npm: se apoya en el navegador que ya está instalado en la
 * máquina, invocándolo en modo headless con `--print-to-pdf`. Es el mismo motor
 * (Skia/PDF) que produjo los imprimibles de referencia, así que el resultado es
 * idéntico al que sale de un Ctrl+P, y respeta `@page`, `page-break-inside` y
 * los fondos.
 *
 * Deliberadamente NO usamos puppeteer ni un Chromium propio: son ~400 MB que en
 * el plan gratuito de Render no caben, y aquí el PDF se genera en la máquina de
 * quien dirige la partida, no en un servidor remoto.
 *
 * Si no hay navegador, `convertirAPdf` lanza `SinNavegador` y la interfaz ofrece
 * imprimir desde el propio navegador del usuario, que siempre funciona.
 */
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** No hay ningún navegador utilizable en esta máquina. */
export class SinNavegador extends Error {
  constructor() {
    super('No se encontró Chrome ni Edge en esta máquina para generar el PDF.');
    this.name = 'SinNavegador';
  }
}

interface Navegador {
  ruta: string;
  nombre: string;
}

const CANDIDATOS: Record<string, Array<[string, string]>> = {
  win32: [
    ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'Google Chrome'],
    ['C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', 'Google Chrome'],
    ['C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', 'Microsoft Edge'],
    ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'Microsoft Edge'],
  ],
  darwin: [
    ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'Google Chrome'],
    ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', 'Microsoft Edge'],
    ['/Applications/Chromium.app/Contents/MacOS/Chromium', 'Chromium'],
  ],
  linux: [
    ['/usr/bin/google-chrome', 'Google Chrome'],
    ['/usr/bin/google-chrome-stable', 'Google Chrome'],
    ['/usr/bin/chromium', 'Chromium'],
    ['/usr/bin/chromium-browser', 'Chromium'],
    ['/usr/bin/microsoft-edge', 'Microsoft Edge'],
  ],
};

let cacheado: Navegador | null | undefined;

/**
 * Localiza un navegador utilizable. El resultado se cachea, incluida la
 * ausencia, para no recorrer el disco en cada descarga.
 */
export function buscarNavegador(): Navegador | null {
  if (cacheado !== undefined) return cacheado;

  const manual = process.env.CHROME_PATH?.trim();
  if (manual && fs.existsSync(manual)) {
    cacheado = { ruta: manual, nombre: path.basename(manual) };
    return cacheado;
  }

  for (const [ruta, nombre] of CANDIDATOS[process.platform] ?? []) {
    if (fs.existsSync(ruta)) {
      cacheado = { ruta, nombre };
      return cacheado;
    }
  }

  cacheado = null;
  return null;
}

// Cada instancia de Chrome consume bastante memoria y los once dosieres de una
// partida pueden pedirse casi a la vez. Se limita a dos a la vez y el resto
// espera turno.
const MAX_SIMULTANEOS = 2;
let enCurso = 0;
const cola: Array<() => void> = [];

function tomarTurno(): Promise<void> {
  if (enCurso < MAX_SIMULTANEOS) {
    enCurso++;
    return Promise.resolve();
  }
  return new Promise((resolver) => cola.push(resolver));
}

function soltarTurno(): void {
  const siguiente = cola.shift();
  if (siguiente) siguiente();
  else enCurso--;
}

const TIEMPO_MAXIMO_MS = 60_000;

/**
 * Convierte un documento HTML autocontenido en PDF.
 *
 * @throws {SinNavegador} si no hay con qué convertirlo.
 */
export async function convertirAPdf(html: string): Promise<Buffer> {
  const navegador = buscarNavegador();
  if (!navegador) throw new SinNavegador();

  await tomarTurno();

  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'gamemasters-'));
  const entrada = path.join(carpeta, 'documento.html');
  const salida = path.join(carpeta, `${crypto.randomUUID()}.pdf`);

  try {
    fs.writeFileSync(entrada, html, 'utf8');

    await new Promise<void>((resolver, rechazar) => {
      execFile(
        navegador.ruta,
        [
          '--headless=new',
          '--disable-gpu',
          '--no-sandbox',
          '--no-first-run',
          '--disable-extensions',
          // Sin esto Chrome dispara la impresión antes de que las fuentes y las
          // imágenes en base64 hayan terminado de componerse.
          '--run-all-compositor-stages-before-draw',
          '--virtual-time-budget=12000',
          // La fecha y la ruta del fichero en los márgenes son justo lo que
          // hace que un PDF parezca una página web impresa.
          '--no-pdf-header-footer',
          `--print-to-pdf=${salida}`,
          `file://${entrada.replace(/\\/g, '/')}`,
        ],
        { timeout: TIEMPO_MAXIMO_MS, windowsHide: true },
        (error) => (error && !fs.existsSync(salida) ? rechazar(error) : resolver()),
      );
    });

    if (!fs.existsSync(salida)) {
      throw new Error('El navegador terminó sin escribir el PDF.');
    }
    return fs.readFileSync(salida);
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
    soltarTurno();
  }
}
