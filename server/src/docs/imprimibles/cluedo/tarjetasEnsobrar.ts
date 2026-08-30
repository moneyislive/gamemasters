/**
 * Tarjetas para recortar y meter en los sobres.
 *
 * Este documento SÍ lleva el contenido de las pistas, los giros y las
 * revelaciones: es el material de quien prepara. Con el Game Master a ciegas no
 * puede caer en sus manos, y por eso el propio documento lo avisa en su primera
 * página, en grande.
 */
import { codigosDeSala, pistasPorRonda } from '../../datos';
import { esc } from '../../html';
import { envolver, portada } from '../comun';
import type { VistaGm } from '../../contexto';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

function tarjeta(codigo: string, titulo: string, cuerpo: string, pie?: string): string {
  return `    <div class="caja junto" style="border-width:2px; padding:6mm 7mm;">
      <span style="display:inline-block; font-family:'Cinzel',serif; font-size:9pt; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:#f1e5c9; background:#6d1a2a; padding:2px 10px; border-radius:2px; margin-bottom:3mm;">${esc(codigo)}</span>
      <h3 style="margin:0 0 3mm; font-size:12.5pt; color:#1a3f2a;">${esc(titulo)}</h3>
      <p style="margin:0; font-size:12.5pt;">${esc(cuerpo)}</p>
      ${pie ? `<p style="margin:3mm 0 0; padding-top:2.5mm; border-top:1px solid rgba(201,162,39,0.5); font-size:10.5pt; font-style:italic; color:#6b5638;">${esc(pie)}</p>` : ''}
    </div>
    <hr style="border:0; border-top:1.2px dashed rgba(62,39,35,0.42); margin:5mm 0;">`;
}

export function tarjetasEnsobrar(
  game: GameSession,
  plot: Plot,
  vista: VistaGm,
  opciones: DocumentRenderOptions,
): string {
  const codigos = codigosDeSala(game.rooms);
  const porRonda = pistasPorRonda(plot);
  const material = plot.material;
  const nombreDe = (id: string): string => game.suspects.find((s) => s.id === id)?.name ?? id;

  let total = 0;

  // ---- Pistas, agrupadas por ronda y sala ----
  const bloquesDePistas = [...porRonda.entries()]
    .map(([ronda, pistas]) => {
      if (pistas.length === 0) return '';
      const porSala = new Map<string, typeof pistas>();
      for (const pista of pistas) {
        const clave = pista.roomId ?? 'sin-sala';
        if (!porSala.has(clave)) porSala.set(clave, []);
        porSala.get(clave)?.push(pista);
      }
      const tarjetas = [...porSala.entries()]
        .map(([roomId, delSala]) => {
          const sala = game.rooms.find((r) => r.id === roomId);
          const codigo = sala ? `R${ronda}-${codigos.get(sala.id) ?? ''}` : `R${ronda}-SIN-SALA`;
          total++;
          const cuerpo = delSala.map((p) => p.description).join('\n\n');
          return tarjeta(
            codigo,
            sala?.name ?? 'Sin sala asignada',
            cuerpo,
            'Esta tarjeta es de quien la encuentra. No se pone en común: se cuenta o se calla.',
          );
        })
        .join('\n');
      return `  <h2>Pistas · ronda ${ronda}</h2>\n${tarjetas}`;
    })
    .filter(Boolean)
    .join('\n\n');

  // ---- Revelaciones de cronología ----
  const bloquesRevelacion = (material?.timelineReveals ?? [])
    .map((r) => {
      total++;
      return tarjeta(
        `CRONOLOGÍA ${r.round}`,
        `Se destapa al cerrar la ronda ${r.round}`,
        r.fact,
        `Pégala en la línea temporal, en el hueco de ${r.time}.`,
      );
    })
    .join('\n');

  // ---- Giros personales ----
  const bloquesGiro = (material?.twists ?? [])
    .map((giro) => {
      total++;
      return tarjeta(
        `GIRO ${giro.round} · ${nombreDe(giro.suspectId).toUpperCase()}`,
        `Para ${nombreDe(giro.suspectId)}, al cerrar la ronda ${giro.round}`,
        giro.instruction,
        'Entrégasela en mano y en silencio. Nadie más debe saber que la ha recibido.',
      );
    })
    .join('\n');

  // ---- Ayudas ----
  const bloquesAyuda = (material?.hints ?? [])
    .map((ayuda) => {
      total++;
      return tarjeta(
        `AUXILIO ${ayuda.level}`,
        `Ayuda de nivel ${ayuda.level}`,
        ayuda.text,
        'Solo si el grupo se atasca. Se lee en voz alta a toda la mesa.',
      );
    })
    .join('\n');

  const sinMaterial = !material
    ? `  <div class="caja junto" style="border-style:dashed;">
    <span class="etiqueta">Faltan las tarjetas narrativas</span>
    <p style="margin:0;">
      Esta partida solo tiene tarjetas de pista. Las revelaciones de cronología, los giros
      personales y las ayudas se escriben con «Escribir el material» desde el panel de dosieres,
      y no tocan la trama.
    </p>
  </div>`
    : '';

  const contenido = `${portada(
    'Solo persona preparadora',
    'Tarjetas para ensobrar',
    plot.tagline,
    `${total} tarjetas`,
  )}

${
  vista.hayPreparador
    ? `    <div class="aviso">
      El Game Master no puede leer estas páginas<br />
      Si diriges la velada, cierra este documento ahora
    </div>`
    : `    <div class="caja caja--roja junto">
      <span class="etiqueta">Contiene el contenido de las pistas</span>
      <p style="margin:0;">Lo preparas tú, que ya conoces la solución. Que no lo vea nadie más.</p>
    </div>`
}

    <div class="caja junto">
      <span class="etiqueta">Cómo se usan</span>
      <p style="margin:0;">
        Recorta por las líneas discontinuas y mete cada tarjeta en el sobre de su código. Las de
        pista van en la sala que indican; las de giro, dentro del dosier de quien las recibe.
      </p>
    </div>

${sinMaterial}

${bloquesDePistas}

${bloquesRevelacion ? `  <h2 class="pagina">Revelaciones de cronología</h2>\n${bloquesRevelacion}` : ''}

${bloquesGiro ? `  <h2 class="pagina">Giros personales</h2>\n${bloquesGiro}` : ''}

${bloquesAyuda ? `  <h2>Ayudas</h2>\n${bloquesAyuda}` : ''}`;

  return envolver(`${plot.title} — Tarjetas para ensobrar`, contenido, opciones);
}
