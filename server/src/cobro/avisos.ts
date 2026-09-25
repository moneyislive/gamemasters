/**
 * Lo que se hace con cada aviso de la pasarela.
 *
 * ═══ LOS AVISOS SON LA ÚNICA FUENTE DE VERDAD DEL PAGO ═══
 *
 * Que el navegador vuelva a `?pago=ok` no prueba nada: cualquiera puede escribir
 * esa URL. Lo que suma créditos es el aviso firmado de Stripe, y solo eso. Y
 * como Stripe REINTENTA un aviso hasta que se le contesta 2xx, cada uno tiene
 * que poder llegar dos veces sin sumar dos veces: por eso cada abono lleva como
 * referencia el id del objeto que lo causó.
 *
 * ═══ DOS FORMAS DE CADA OBJETO ═══
 *
 * Stripe cambió en 2025 dónde viven algunos campos (el fin del periodo pasó de
 * la suscripción a sus elementos; la suscripción de una factura, a su
 * `parent`). Se leen las dos formas, para no depender de qué versión de la API
 * tenga la cuenta.
 */
import type { Account } from '../../../shared/live';
import type { PaseDeTemporada, SuscripcionDeLaCuenta } from '../../../shared/cobro';
import { getStore } from '../db/store';
import { abonar } from './monedero';
import { CREDITOS_DE_LA_SUSCRIPCION, PASE_EN_LA_SUSCRIPCION, temporadaDe } from './ofertas';

type Objeto = Record<string, unknown>;

const texto = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
const numero = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const objeto = (v: unknown): Objeto | undefined => (v && typeof v === 'object' ? (v as Objeto) : undefined);

/** Segundos de Stripe a ISO. */
const fecha = (segundos: number | undefined): string | undefined =>
  segundos === undefined ? undefined : new Date(segundos * 1000).toISOString();

async function guardarCobro(cuenta: Account, cambiar: (c: NonNullable<Account['cobro']>) => void): Promise<void> {
  const cobro = structuredClone(cuenta.cobro ?? {});
  cambiar(cobro);
  await getStore().saveAccount({ ...cuenta, cobro });
}

/**
 * La cuenta de un objeto: por la referencia que puso el servidor al abrir el pago, o por el cliente.
 *
 * Una factura de la suscripción no trae la referencia en su propio `metadata`:
 * trae una copia del de la suscripción, en `parent.subscription_details` (o en
 * `subscription_details`, en la forma de antes de 2025). Hay que leerla ahí,
 * porque Stripe no garantiza el orden de los avisos: si la primera factura
 * pagada llega antes que el pago completado, la cuenta todavía no conoce a su
 * cliente, y por el cliente no se encontraría.
 */
async function cuentaDe(obj: Objeto): Promise<Account | null> {
  const store = getStore();
  const metadata = objeto(obj.metadata);
  const deLaSuscripcion = objeto(
    objeto(objeto(obj.parent)?.subscription_details)?.metadata ?? objeto(obj.subscription_details)?.metadata,
  );
  const porReferencia = texto(obj.client_reference_id) ?? texto(metadata?.cuentaId) ?? texto(deLaSuscripcion?.cuentaId);
  if (porReferencia) {
    const cuenta = await store.getAccount(porReferencia);
    if (cuenta) return cuenta;
  }
  const cliente = texto(obj.customer) ?? texto(objeto(obj.customer)?.id);
  return cliente ? store.getAccountPorCliente(cliente) : null;
}

/** El fin del periodo pagado de una suscripción, en cualquiera de sus dos formas. */
function finDelPeriodo(suscripcion: Objeto): string | undefined {
  const directo = numero(suscripcion.current_period_end);
  if (directo) return fecha(directo);
  const elementos = objeto(suscripcion.items)?.data;
  if (Array.isArray(elementos)) {
    const fines = elementos.map((e) => numero(objeto(e)?.current_period_end)).filter((n): n is number => n !== undefined);
    if (fines.length) return fecha(Math.max(...fines));
  }
  return undefined;
}

function estadoDe(status: string | undefined): SuscripcionDeLaCuenta['estado'] {
  if (status === 'active' || status === 'trialing') return 'activa';
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'impagada';
  return 'cancelada';
}

function anadirPase(cobro: NonNullable<Account['cobro']>, pase: PaseDeTemporada): void {
  const pases = (cobro.pases ?? []).filter((p) => p.temporada !== pase.temporada || p.via === 'compra');
  if (!pases.some((p) => p.temporada === pase.temporada)) pases.push(pase);
  cobro.pases = pases;
}

export interface ResultadoDelAviso {
  hecho: string;
}

/**
 * Atiende un aviso ya verificado. Lo que no se reconoce se contesta como
 * atendido y no se hace nada: Stripe manda muchos tipos y no todos importan.
 */
export async function atenderAviso(evento: { id: string; type: string; data: { object: Objeto } }): Promise<ResultadoDelAviso> {
  const obj = evento.data.object;

  switch (evento.type) {
    case 'checkout.session.completed': {
      const cuenta = await cuentaDe(obj);
      if (!cuenta) return { hecho: 'sin cuenta: ignorado' };
      const cliente = texto(obj.customer);
      if (cliente && cuenta.cobro?.clientePasarela !== cliente) {
        await guardarCobro(cuenta, (c) => (c.clientePasarela = cliente));
      }
      // Una sesión puede completarse sin cobrar todavía (pagos diferidos): se espera al aviso de pago.
      if (texto(obj.payment_status) !== 'paid' && texto(obj.mode) === 'payment') return { hecho: 'pago pendiente' };

      const metadata = objeto(obj.metadata) ?? {};
      if (metadata.tipo === 'creditos') {
        const creditos = Number(metadata.creditos);
        if (!Number.isInteger(creditos) || creditos <= 0) return { hecho: 'créditos ilegibles: ignorado' };
        const { nuevo } = await abonar(cuenta.id, 'compra', creditos, `Compra de ${creditos} créditos`, {
          referencia: `pasarela:${texto(obj.id)}`,
          ...(texto(metadata.gameId) ? { gameId: texto(metadata.gameId) } : {}),
        });
        return { hecho: nuevo ? `abonados ${creditos} créditos` : 'ya estaba abonado' };
      }
      if (metadata.tipo === 'pase') {
        const temporada = texto(metadata.temporada) ?? temporadaDe(new Date()).temporada;
        const fresca = (await getStore().getAccount(cuenta.id)) ?? cuenta;
        await guardarCobro(fresca, (c) => anadirPase(c, { temporada, hasta: temporadaDe(new Date()).hasta, via: 'compra' }));
        return { hecho: `pase ${temporada}` };
      }
      // Suscripción: los créditos llegan con la factura pagada, que es su propio aviso.
      return { hecho: 'sesión completada' };
    }

    case 'invoice.paid': {
      const cuenta = await cuentaDe(obj);
      if (!cuenta) return { hecho: 'sin cuenta: ignorado' };
      const suscripcionId =
        texto(obj.subscription) ??
        texto(objeto(objeto(obj.parent)?.subscription_details)?.subscription);
      if (!suscripcionId) return { hecho: 'factura sin suscripción: ignorada' };

      const lineas = objeto(obj.lines)?.data;
      const fin = Array.isArray(lineas)
        ? fecha(Math.max(0, ...lineas.map((l) => numero(objeto(objeto(l)?.period)?.end) ?? 0)))
        : undefined;
      const { nuevo } = await abonar(cuenta.id, 'suscripcion', CREDITOS_DE_LA_SUSCRIPCION, 'Bolsa del mes de la suscripción', {
        referencia: `pasarela:${texto(obj.id)}`,
      });
      const fresca = (await getStore().getAccount(cuenta.id)) ?? cuenta;
      const cliente = texto(obj.customer);
      await guardarCobro(fresca, (c) => {
        // Si la factura llegó antes que el pago completado, el cliente se apunta aquí.
        if (cliente && !c.clientePasarela) c.clientePasarela = cliente;
        c.suscripcion = {
          estado: 'activa',
          hasta: fin ?? c.suscripcion?.hasta ?? new Date().toISOString(),
          renueva: c.suscripcion?.renueva ?? true,
          referencia: suscripcionId,
        };
        if (PASE_EN_LA_SUSCRIPCION) {
          const t = temporadaDe(new Date());
          anadirPase(c, { temporada: t.temporada, hasta: t.hasta, via: 'suscripcion' });
        }
      });
      return { hecho: nuevo ? `bolsa del mes: ${CREDITOS_DE_LA_SUSCRIPCION} créditos` : 'ya estaba abonada' };
    }

    case 'invoice.payment_failed': {
      const cuenta = await cuentaDe(obj);
      if (!cuenta?.cobro?.suscripcion) return { hecho: 'sin suscripción: ignorado' };
      await guardarCobro(cuenta, (c) => {
        if (c.suscripcion) c.suscripcion.estado = 'impagada';
      });
      return { hecho: 'suscripción impagada' };
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const cuenta = await cuentaDe(obj);
      if (!cuenta) return { hecho: 'sin cuenta: ignorado' };
      const borrada = evento.type === 'customer.subscription.deleted';
      await guardarCobro(cuenta, (c) => {
        c.suscripcion = {
          estado: borrada ? 'cancelada' : estadoDe(texto(obj.status)),
          hasta: finDelPeriodo(obj) ?? c.suscripcion?.hasta ?? new Date().toISOString(),
          renueva: !borrada && obj.cancel_at_period_end !== true,
          referencia: texto(obj.id) ?? c.suscripcion?.referencia,
        };
      });
      return { hecho: borrada ? 'suscripción cancelada' : 'suscripción al día' };
    }

    default:
      return { hecho: `sin tratamiento: ${evento.type}` };
  }
}
