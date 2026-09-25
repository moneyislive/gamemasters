/**
 * De lo que cuesta a lo que se cobra.
 *
 * ═══ LA CUENTA ═══
 *
 *   coste en la API (dólares, ver `estimacion.ts`)
 *   × euros por dólar
 *   × MARGEN                      ← cubre IVA (21 %), la pasarela, el servidor y el error de la estimación
 *   → redondeado hacia arriba a ,49 o ,99
 *   → nunca por debajo del PRECIO_MINIMO
 *
 * Con los números de septiembre de 2026 —siete personas, cinco salas, cuatro
 * objetos, Opus 5.5— el coste ronda los 2,40 $ en papel y los 2,95 $ con la
 * app, y el precio sale en 5,99 € y 6,99 €. Del precio, el 21 % es IVA y
 * alrededor de un 2 % más 25 céntimos se lo queda la pasarela.
 *
 * Todo se cambia sin tocar código, en las variables del servicio:
 *
 *   COBRO_MARGEN            multiplicador sobre el coste       (2,5)
 *   COBRO_PRECIO_MINIMO     céntimos, IVA incluido             (399)
 *   COBRO_EUROS_POR_DOLAR   cambio aplicado al coste           (0,92)
 */
import type { Esfuerzo, ModelId } from '../../../shared/types';
import type { PresupuestoDeVelada } from '../../../shared/cobro';
import { CREDITOS_POR_EURO } from '../../../shared/cobro';
import { estimarPasos, type PasoDeVelada, type TamanoDeLaVelada } from './estimacion';

function leerNumero(crudo: string | undefined, porDefecto: number, minimo: number): number {
  const n = Number(crudo?.trim().replace(',', '.'));
  return Number.isFinite(n) && n >= minimo ? n : porDefecto;
}

export const MARGEN = leerNumero(process.env.COBRO_MARGEN, 2.5, 1);
export const PRECIO_MINIMO_CENTIMOS = Math.round(leerNumero(process.env.COBRO_PRECIO_MINIMO, 399, 0));
export const EUROS_POR_DOLAR = leerNumero(process.env.COBRO_EUROS_POR_DOLAR, 0.92, 0.1);

/** Redondea hacia arriba al ,49 o ,99 más cercano. En céntimos. */
export function precioRedondo(centimos: number): number {
  const euros = Math.floor(centimos / 100);
  const resto = centimos - euros * 100;
  if (resto <= 49) return euros * 100 + 49;
  return euros * 100 + 99;
}

/** Lo que se cobra por un coste de API dado. En céntimos, IVA incluido. */
export function precioDeUnCoste(costeUsd: number): number {
  const bruto = Math.ceil(costeUsd * EUROS_POR_DOLAR * MARGEN * 100);
  return Math.max(PRECIO_MINIMO_CENTIMOS, precioRedondo(bruto));
}

/**
 * Lo que trae una velada pagada sin volver a pagar.
 *
 * Existe para que pagar una velada no sea pagar cada botón: quien la prepara
 * charla con el asistente, actualiza el reparto si alguien se cae, reescribe el
 * material si no le convence y pide otra revisión. Todo eso está en el precio,
 * con un techo para que un bucle no convierta una velada en una factura.
 */
export const INCLUIDO_EN_LA_VELADA = {
  /** Reescribir la trama entera si no convence: una vez. La garantía de satisfacción. */
  regeneraciones: 1,
  /** Poner al día el reparto (alguien entra o se cae). */
  actualizaciones: 3,
  /** Reescribir el material. */
  reescriturasDeMaterial: 2,
  /** Pedir otra revisión adversaria. */
  revisiones: 2,
  /** Turnos del chat del taller. */
  turnosDeAsistente: 60,
  /** Preguntas al Mayordomo durante la partida, si se juega con la app. */
  preguntasAlMayordomo: 80,
} as const;

export function incluidoEnTexto(conMayordomo: boolean): string[] {
  const i = INCLUIDO_EN_LA_VELADA;
  return [
    'Trama completa a medida, con su material para leer en voz alta',
    'Revisión adversaria: un detective que no sabe la solución intenta resolverla antes de tiempo',
    `${i.regeneraciones} regeneración entera si no te convence`,
    `${i.actualizaciones} actualizaciones del reparto`,
    `${i.reescriturasDeMaterial} reescrituras del material y ${i.revisiones} revisiones más`,
    `${i.turnosDeAsistente} turnos con el asistente del taller`,
    ...(conMayordomo ? [`${i.preguntasAlMayordomo} preguntas al Mayordomo durante la partida`] : []),
  ];
}

/** El presupuesto de una velada con estos pasos, este tamaño y este modelo. */
export function presupuestar(
  pasos: PasoDeVelada[],
  tamano: TamanoDeLaVelada,
  modelo: ModelId,
  esfuerzo: Esfuerzo,
): PresupuestoDeVelada {
  const desglose = estimarPasos(pasos, tamano, modelo, esfuerzo);
  const costeUsd = desglose.reduce((suma, p) => suma + p.costeUsd, 0);
  const centimos = precioDeUnCoste(costeUsd);
  return {
    creditos: Math.round((centimos / 100) * CREDITOS_POR_EURO),
    centimos,
    modelo,
    esfuerzo,
    desglose,
    costeUsd: Math.round(costeUsd * 10_000) / 10_000,
    incluye: incluidoEnTexto(pasos.includes('mayordomo')),
  };
}
