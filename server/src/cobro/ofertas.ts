/**
 * Lo que se vende, a qué precio, y a quién no se le cobra.
 *
 * Todo con valores por defecto razonables y todo cambiable desde el entorno,
 * porque los precios se ajustan mirando cuánto se usa de verdad cada cosa, y
 * eso no puede exigir un despliegue:
 *
 *   COBRO_ACTIVO                  «si» para cobrar. Sin esto nada se cobra y el taller no enseña precios.
 *   COBRO_CREDITOS_SUSCRIPCION    bolsa del mes de la suscripción            (2000 = 20 € de veladas)
 *   COBRO_PRECIO_SUSCRIPCION      céntimos al mes, lo que se ANUNCIA         (1499); el cobro lo hace el plan de Stripe
 *   COBRO_PRECIO_PASE             céntimos por temporada del pase de la Sala  (499)
 *   COBRO_PASE_EN_SUSCRIPCION     «no» para que la suscripción no traiga el pase (lo trae)
 *
 * ═══ POR QUÉ LA SUSCRIPCIÓN TRAE MÁS DE LO QUE CUESTA ═══
 *
 * 14,99 € al mes traen 2.000 créditos —20 € al precio suelto—: unas tres
 * veladas de siete personas en papel. Es el descuento que hace que suscribirse
 * tenga sentido para quien organiza a menudo, y el margen aguanta porque el
 * precio suelto ya lleva el suyo (ver `precios.ts`): gastada entera, la bolsa
 * cuesta unos 8 € de API contra 12,4 € netos de IVA.
 */
import type { OfertaDeCobro } from '../../../shared/cobro';
import { CREDITOS_POR_EURO } from '../../../shared/cobro';

function numeroDelEntorno(crudo: string | undefined, porDefecto: number): number {
  const n = Number(crudo?.trim());
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : porDefecto;
}

export const COBRO_ACTIVO = process.env.COBRO_ACTIVO?.trim().toLowerCase() === 'si';
export const CREDITOS_DE_LA_SUSCRIPCION = numeroDelEntorno(process.env.COBRO_CREDITOS_SUSCRIPCION, 2000);
export const PRECIO_DE_LA_SUSCRIPCION = numeroDelEntorno(process.env.COBRO_PRECIO_SUSCRIPCION, 1499);
export const PRECIO_DEL_PASE = numeroDelEntorno(process.env.COBRO_PRECIO_PASE, 499);
export const PASE_EN_LA_SUSCRIPCION = process.env.COBRO_PASE_EN_SUSCRIPCION?.trim().toLowerCase() !== 'no';

/** Las bolsas sueltas: la grande con un 10 % de regalo. */
const BOLSAS: Array<{ id: 'bolsa-chica' | 'bolsa-grande'; creditos: number; centimos: number }> = [
  { id: 'bolsa-chica', creditos: 1000, centimos: 1000 },
  { id: 'bolsa-grande', creditos: 2750, centimos: 2500 },
];

/** La temporada del pase: un trimestre natural. `2026-T4` va de octubre a diciembre. */
export function temporadaDe(fecha: Date): { temporada: string; hasta: string } {
  const trimestre = Math.floor(fecha.getUTCMonth() / 3) + 1;
  const fin = new Date(Date.UTC(fecha.getUTCFullYear(), trimestre * 3, 1));
  return { temporada: `${fecha.getUTCFullYear()}-T${trimestre}`, hasta: fin.toISOString() };
}

const euros = (centimos: number) => `${(centimos / 100).toFixed(2).replace('.', ',')} €`;

export function ofertas(): OfertaDeCobro[] {
  return [
    ...BOLSAS.map((b) => ({
      id: b.id,
      nombre: `${b.creditos.toLocaleString('es-ES')} créditos`,
      descripcion:
        b.creditos > b.centimos
          ? `${euros(b.centimos)}: ${euros((b.creditos / CREDITOS_POR_EURO) * 100)} en veladas. No caducan.`
          : `${euros(b.centimos)}. No caducan.`,
      precioCentimos: b.centimos,
      creditos: b.creditos,
    })),
    {
      id: 'suscripcion',
      nombre: 'Suscripción de anfitrión',
      descripcion:
        `${CREDITOS_DE_LA_SUSCRIPCION.toLocaleString('es-ES')} créditos cada mes (unas tres veladas)` +
        (PASE_EN_LA_SUSCRIPCION ? ', y el pase de la Sala de Arcade incluido' : '') +
        '. Se cancela cuando quieras.',
      precioCentimos: PRECIO_DE_LA_SUSCRIPCION,
      creditos: CREDITOS_DE_LA_SUSCRIPCION,
      periodo: 'mes',
    },
    {
      id: 'pase',
      nombre: `Pase de la Sala · temporada ${temporadaDe(new Date()).temporada}`,
      descripcion: 'Aspectos exclusivos para tus aventureros durante la temporada. Solo estética: no da ventaja en ningún juego.',
      precioCentimos: PRECIO_DEL_PASE,
      periodo: 'temporada',
    },
  ];
}

/** La bolsa de una oferta, para abrir su pago. */
export function bolsa(id: string): { creditos: number; centimos: number } | undefined {
  return BOLSAS.find((b) => b.id === id);
}
