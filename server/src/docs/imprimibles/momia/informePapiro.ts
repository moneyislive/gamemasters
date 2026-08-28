/**
 * El informe del papiro: la prueba de que la noche va a funcionar.
 *
 * ES EL DOCUMENTO QUE DA CONFIANZA PARA MONTAR LA VELADA, y por eso no dice
 * «todo correcto»: enseña las cuentas. Quien va a reunir a doce personas en su
 * casa tiene derecho a saber, antes de imprimir nada, que el puzle que le han
 * generado tiene UNA sola solución y que nadie va a poder resolverlo en
 * solitario sin hablar con los demás.
 *
 * SE RECALCULA AQUÍ, no se copia de la generación. Las cuentas se hacen sobre la
 * trama que está GUARDADA en la partida, recorriendo las 120 permutaciones otra
 * vez. Si alguien tocase la partida después de generarla, o si un día un cambio
 * en el generador dejara pasar un puzle malo, este informe se enteraría; uno que
 * imprimiese el veredicto guardado en el momento de generar, no.
 *
 * NO LLEVA EL ORDEN VERDADERO. Se puede demostrar que la solución es única sin
 * decir cuál es, y así este informe se puede leer con gente delante. Lo que sí
 * lleva es el texto de los fragmentos, así que sigue siendo material de quien
 * prepara.
 */
import { esc } from '../../html';
import { envolverPapiro, portadaPapiro, sinTrama } from './comun';
import { vistaDeLaMomia } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

interface Comprobacion {
  titulo: string;
  bien: boolean;
  /** Qué se ha contado exactamente. Es lo que convierte un «✓» en una prueba. */
  cuenta: string;
  /** Por qué importa. Sin esto, una lista de ✓ no dice nada a quien no la escribió. */
  porque: string;
}

function fila(c: Comprobacion): string {
  return `        <tr>
          <td style="width:12mm; text-align:center; font-family:'Marcellus SC',serif; font-size:15pt; color:${c.bien ? '#1f3f6b' : '#9c3b1b'};">${c.bien ? '✓' : '✗'}</td>
          <td>
            <strong>${esc(c.titulo)}</strong><br />
            <span class="maquina" style="color:#7a5c34;">${esc(c.cuenta)}</span><br />
            <span style="font-size:10.5pt; color:#7a5c34;">${esc(c.porque)}</span>
          </td>
        </tr>`;
}

export function informePapiro(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLaMomia(game, plot);
  if (!vista.hay || !vista.trama || !vista.informe) return sinTrama('Informe del papiro', opciones);

  const { trama, informe } = vista;
  /*
   * Lo que hubo que corregirle al modelo. Se guarda con la trama desde que dejó
   * de morir en la consola del servidor; una partida generada antes no lo trae,
   * y entonces esta sección simplemente no sale.
   */
  const revision = (trama as { revision?: { incidencias: Array<{ donde: string; motivo: string }>; aceptadas: number; total: number } }).revision;
  const permutaciones = factorial(vista.ritos.length);

  const comprobaciones: Comprobacion[] = [
    {
      titulo: 'El puzle tiene solución',
      bien: informe.soluciones >= 1,
      cuenta: `${informe.soluciones} de ${permutaciones} órdenes posibles ${informe.soluciones === 1 ? 'cumple' : 'cumplen'} los ${trama.restricciones.length} fragmentos.`,
      porque: 'Sin ninguna, la tumba no se podría sellar hiciera lo que hiciera nadie.',
    },
    {
      titulo: 'Y tiene UNA sola',
      bien: informe.unico,
      cuenta:
        informe.soluciones === 1
          ? 'Exactamente un orden los cumple todos, y es el que guarda la partida.'
          : `Hay ${informe.soluciones} órdenes válidos. Eso es un empate sin forma de zanjarlo.`,
      porque: 'Con dos, media mesa defendería uno y media el otro y no habría manera de decidir.',
    },
    {
      titulo: 'Nadie puede resolverlo en solitario',
      bien: informe.solucionesConEsaMano >= 2,
      cuenta: `La mano más gorda que puede juntar una persona sola es de ${informe.maximoEnUnaMano} de ${trama.restricciones.length} fragmentos, y con ella le quedarían ${informe.solucionesConEsaMano} órdenes posibles.`,
      porque:
        'Es la regla de la que vive el juego: si alguien pudiera sellar la tumba sin hablar con nadie, se callaría y ganaría en silencio.',
    },
    {
      titulo: 'No sobra ningún fragmento',
      bien: informe.redundantes.length === 0,
      cuenta:
        informe.redundantes.length === 0
          ? 'Quitando cualquiera de ellos, aparecería más de una solución.'
          : `Sobran ${informe.redundantes.length}: ${informe.redundantes.map((r) => r.id).join(', ')}.`,
      porque:
        'Los fragmentos de más se resuelven solos: la mesa acierta antes de haber hablado y la noche se queda corta.',
    },
    {
      titulo: 'Las falsificaciones son falsas de verdad',
      bien: informe.falsasQueNoEnganan.length === 0,
      cuenta:
        informe.falsasQueNoEnganan.length === 0
          ? `Las ${trama.falsasCandidatas.length} contradicen el orden correcto.`
          : `${informe.falsasQueNoEnganan.length} de ellas encajan con el orden correcto: publicarlas AYUDARÍA a la mesa.`,
      porque: 'Una mentira que resulta ser verdad convierte al saqueador en cómplice sin querer.',
    },
    {
      titulo: 'Y no se pillan a la primera',
      bien: informe.refutabilidadMinima >= 2,
      cuenta:
        informe.refutabilidadMinima === Infinity
          ? 'Esta trama no trae falsificaciones preparadas.'
          : `Hacen falta al menos ${informe.refutabilidadMinima} fragmentos ciertos, combinados, para desmentir la más floja.`,
      porque:
        'Si con uno bastara, alguien pondría su carta al lado y se acabaría en dos segundos. A partir de dos hay que combinar, y combinar es hablar.',
    },
  ];

  const fallos = comprobaciones.filter((c) => !c.bien).length;

  const repartoPorVigilia = Array.from({ length: vista.vigilias }, (_, i) => {
    const ronda = i + 1;
    const deEsta = vista.hallazgos.filter((h) => h.ronda === ronda);
    const camaras = [...new Set(deEsta.map((h) => h.camara?.name ?? '—'))];
    return `        <tr>
          <td style="width:20mm;">${ronda}</td>
          <td>${esc(vista.profanadas[i]?.name ?? '—')}</td>
          <td>${esc(camaras.join(' · ')) || '<em>ninguna</em>'}</td>
          <td style="width:20mm;">${deEsta.length}</td>
        </tr>`;
  }).join('\n');

  const fragmentos = trama.restricciones
    .map(
      (r) => `        <tr>
          <td style="width:20mm;" class="maquina">${esc(r.id)}</td>
          <td>${esc(r.texto)}</td>
        </tr>`,
    )
    .join('\n');

  const veredicto = informe.ok
    ? `    <div class="caja caja--lapis junto" style="text-align:center;">
      <p style="margin:0; font-family:'Marcellus SC',serif; font-size:14pt; color:#1f3f6b;">
        El papiro está bien roto. La tumba se puede sellar, y hará falta la mesa entera.
      </p>
    </div>`
    : `    <div class="aviso">
      ${fallos === 1 ? 'Hay 1 problema' : `Hay ${fallos} problemas`} más abajo<br />
      Vuelve al taller y genera otra vez antes de imprimir nada
    </div>`;

  const contenido = `${portadaPapiro(
    'Comprobación previa',
    'Informe del papiro',
    plot.tagline,
    'Léelo antes de gastar papel',
  )}

${veredicto}

    <div class="caja junto">
      <span class="etiqueta">Qué es esto</span>
      <p style="margin:0;">
        Las cuentas de abajo se han hecho ahora, sobre la partida que tienes guardada, probando
        <strong>los ${permutaciones} órdenes posibles</strong> de los ${vista.ritos.length} ritos uno a uno. No es una
        promesa del generador: es el resultado de volver a contarlo. <strong>Este informe no dice
        cuál es el orden correcto</strong>, así que lo puedes leer con gente delante.
      </p>
    </div>

    <h2>Las comprobaciones</h2>
    <table>
      <tbody>
${comprobaciones.map(fila).join('\n')}
      </tbody>
    </table>

    ${
      revision
        ? `<h2>Lo que hubo que corregirle a quien escribió</h2>
    <p>
      El modelo escribió ${revision.total} fragmentos y se aceptaron ${revision.aceptadas} tal cual.
      ${
        revision.incidencias.length === 0
          ? 'No hubo que sustituir nada más.'
          : `Se sustituyeron ${revision.incidencias.length} textos porque decían algo que no puede leerse en la mesa:`
      }
    </p>
    ${
      revision.incidencias.length > 0
        ? `<table>
      <tbody>
${revision.incidencias.map((i) => `        <tr><td style="width:52mm;">${esc(i.donde)}</td><td>${esc(i.motivo)}</td></tr>`).join(String.fromCharCode(10))}
      </tbody>
    </table>`
        : ''
    }`
        : ''
    }

    <h2>Cómo queda repartida la noche</h2>
    <table>
      <thead><tr><th>Vigilia</th><th>Cámara profanada</th><th>Dónde aparecen fragmentos</th><th>Cuántos</th></tr></thead>
      <tbody>
${repartoPorVigilia}
      </tbody>
    </table>
    <p style="font-size:10.5pt; color:#7a5c34;">
      Una persona entra en <em>una</em> cámara por vigilia, así que como mucho se lleva lo que haya
      en la más cargada de cada noche. Esa es la cuenta de la tercera comprobación.
    </p>

    <h2>Los ${trama.restricciones.length} fragmentos ciertos</h2>
    <p style="font-size:10.5pt; color:#7a5c34;">
      Se listan con su texto para que puedas comprobar de un vistazo que se entienden. Nada de lo
      que dicen revela el orden por sí solo: hace falta cruzarlos.
    </p>
    <table>
      <tbody>
${fragmentos}
      </tbody>
    </table>

    <h2>Recuento del paquete</h2>
    <table>
      <thead><tr><th>Material</th><th style="width:26mm;">Cantidad</th></tr></thead>
      <tbody>
        <tr><td>Expedicionarios</td><td>${vista.expedicionarios.length}</td></tr>
        <tr><td>Cámaras</td><td>${vista.camaras.length}</td></tr>
        <tr><td>Reliquias</td><td>${vista.reliquias.length}</td></tr>
        <tr><td>Ritos</td><td>${vista.ritos.length}</td></tr>
        <tr><td>Vigilias</td><td>${vista.vigilias}</td></tr>
        <tr><td>Tiras que hay que recortar</td><td>${trama.restricciones.length + trama.falsasCandidatas.length}</td></tr>
        <tr><td>Sobres con nombre</td><td>${vista.expedicionarios.length}</td></tr>
      </tbody>
    </table>`;

  return envolverPapiro(`${plot.title} — Informe del papiro`, contenido, opciones);
}

/** Cuántos órdenes posibles hay. Con cinco ritos, 120. */
function factorial(n: number): number {
  let total = 1;
  for (let i = 2; i <= n; i++) total *= i;
  return total;
}
