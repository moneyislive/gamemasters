/**
 * Lo que el revisor del Nudo puede cambiar, y cómo se aplica.
 *
 * SOLO PROSA. El título, el lema, la sinopsis, la ambientación, las fichas
 * (nombre, cara pública, secreto y gancho), los partes de cada franja y el
 * guion. Nada más: el cuadro, las tiras, el reparto, los oficios, el Correo, las
 * cargas y el tope los decide el código y los comprueba el código, y un revisor
 * «mejorándolos» rompería la única garantía que tiene esta noche —que el cuadro
 * sale, y sale uno—. Por eso aquí no se nombran: no hay forma de que entren.
 *
 * Cada texto entra solo si es utilizable y no empobrece el que había (la mitad
 * de su largo como mínimo): es lo mismo que `coser` exige al modelo que escribe.
 * Se trabaja sobre una COPIA: si un parche no entra, la trama de antes sigue
 * intacta.
 */
import type { GameSession, Plot } from '../../../shared/types';
import { tramaDe } from '../juegos/nudo-trama';
import { textoAceptable } from './revision-comun';

export interface CambiosDelNudo {
  titulo?: string;
  lema?: string;
  sinopsis?: string;
  ambientacion?: string;
  fichas?: Array<{ participanteId: string; nombre: string; caraPublica: string; secreto: string; gancho: string }>;
  partes?: Array<{ franja: number; texto: string }>;
  guion?: string[];
}

export function aplicarParchesNudo(
  _game: GameSession,
  plotEntrante: Plot,
  cambios: CambiosDelNudo,
  _soloMaterial: boolean,
): { plot: Plot; aplicados: string[]; rechazados: string[] } {
  const plot = structuredClone(plotEntrante);
  const aplicados: string[] = [];
  const rechazados: string[] = [];

  const cabecera: Array<[keyof CambiosDelNudo, 'title' | 'tagline' | 'synopsis' | 'setting', string, number]> = [
    ['titulo', 'title', 'el título', 4],
    ['lema', 'tagline', 'el lema', 12],
    ['sinopsis', 'synopsis', 'la sinopsis', 80],
    ['ambientacion', 'setting', 'la ambientación', 40],
  ];
  for (const [clave, campo, nombre, minimo] of cabecera) {
    const nuevo = cambios[clave];
    if (typeof nuevo !== 'string' || !nuevo.trim()) continue;
    const texto = textoAceptable(nuevo, plot[campo], minimo);
    if (texto) {
      plot[campo] = texto;
      aplicados.push(nombre);
    } else rechazados.push(`${nombre}: la versión nueva era demasiado corta`);
  }

  // ---- Las fichas: por id, y solo sus cuatro textos ----
  for (const ficha of cambios.fichas ?? []) {
    const i = plot.characters.findIndex((c) => c.participanteId === ficha?.participanteId);
    if (i === -1) {
      rechazados.push(`ficha de «${ficha?.participanteId}»: no es nadie de esta mesa`);
      continue;
    }
    const viejo = plot.characters[i]!;
    const nuevo = {
      ...viejo,
      characterName: textoAceptable(ficha.nombre, undefined, 3) ?? viejo.characterName,
      publicPersona: textoAceptable(ficha.caraPublica, viejo.publicPersona, 40) ?? viejo.publicPersona,
      secret: textoAceptable(ficha.secreto, viejo.secret, 20) ?? viejo.secret,
      personalHook: textoAceptable(ficha.gancho, viejo.personalHook, 20) ?? viejo.personalHook,
      // `knowledge` son sus tiras y `role` su oficio: no se tocan.
    };
    if (JSON.stringify(nuevo) === JSON.stringify(viejo)) {
      rechazados.push(`ficha de ${viejo.characterName}: nada utilizable`);
      continue;
    }
    plot.characters[i] = nuevo;
    aplicados.push(`ficha de ${nuevo.characterName}`);
  }

  // ---- Los partes: dentro de la trama del juego, sobre una copia ----
  const trama = tramaDe(plot);
  if (trama && cambios.partes?.length) {
    const partes = [...trama.partes];
    for (const parte of cambios.partes) {
      const i = Math.round(Number(parte?.franja)) - 1;
      if (!(i >= 0 && i < partes.length)) {
        rechazados.push(`parte de la franja ${parte?.franja}: esa franja no existe`);
        continue;
      }
      const texto = textoAceptable(parte.texto, partes[i], 25);
      if (!texto) {
        rechazados.push(`parte de la franja ${i + 1}: la versión nueva era demasiado corta`);
        continue;
      }
      partes[i] = texto;
      aplicados.push(`parte de la franja ${i + 1}`);
    }
    plot.delJuego = { ...trama, partes };
  }

  // ---- El guion: entero o nada ----
  if (cambios.guion?.length) {
    const lineas = cambios.guion.map((l) => String(l).trim()).filter((l) => l.length >= 25);
    const antes = (plot.gmScript ?? []).join(' ').length;
    if (lineas.length >= 3 && lineas.join(' ').length >= antes * 0.5) {
      plot.gmScript = lineas;
      aplicados.push('el guion');
    } else rechazados.push('el guion: menos de tres líneas utilizables, o mucho más corto que el que había');
  }

  return { plot, aplicados, rechazados };
}
