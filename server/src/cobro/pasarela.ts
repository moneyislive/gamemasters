/**
 * La pasarela de pago: Stripe, hablándole por HTTP y sin su SDK.
 *
 * ═══ POR QUÉ SIN SDK ═══
 *
 * Por lo mismo que `identidad/oidc.ts` verifica los tokens de Google a mano: lo
 * que se usa son tres llamadas y una firma, y cada dependencia es una cosa más
 * que actualizar en seis árboles de trabajo. Las tres llamadas son formularios
 * `application/x-www-form-urlencoded` contra `api.stripe.com`, y la firma de los
 * avisos es un HMAC-SHA256 documentado.
 *
 * ═══ LO QUE HACE Y LO QUE NO ═══
 *
 *   · Abre una sesión de pago (Checkout) para comprar créditos sueltos, el pase
 *     de temporada o suscribirse, y devuelve la URL a la que mandar a la persona.
 *   · Abre el portal del cliente, donde cada cual gestiona su suscripción,
 *     sus facturas y su tarjeta sin que esto tenga que saber de tarjetas.
 *   · Comprueba la firma de los avisos que manda Stripe (webhooks).
 *
 * Aquí NUNCA pasa un número de tarjeta: la persona los escribe en la página de
 * Stripe. Esto solo ve identificadores.
 *
 * ═══ CONFIGURACIÓN ═══
 *
 *   STRIPE_SECRET_KEY            sk_test_… en pruebas, sk_live_… en producción
 *   STRIPE_WEBHOOK_SECRET        whsec_…, el del punto de aviso dado de alta
 *   STRIPE_PRECIO_SUSCRIPCION    price_… del plan mensual (se crea en el panel de Stripe)
 *   STRIPE_IMPUESTOS             «si» para que Stripe Tax calcule el IVA de cada país
 */
import crypto from 'node:crypto';

const API = 'https://api.stripe.com/v1';

export interface ConfigDePasarela {
  clave: string;
  secretoDeAvisos?: string;
  precioSuscripcion?: string;
  impuestosAutomaticos: boolean;
}

/** La configuración, o `null` si no hay pasarela: entonces no se vende nada. */
export function configDePasarela(): ConfigDePasarela | null {
  const clave = process.env.STRIPE_SECRET_KEY?.trim();
  if (!clave) return null;
  return {
    clave,
    secretoDeAvisos: process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined,
    precioSuscripcion: process.env.STRIPE_PRECIO_SUSCRIPCION?.trim() || undefined,
    impuestosAutomaticos: process.env.STRIPE_IMPUESTOS?.trim().toLowerCase() === 'si',
  };
}

/**
 * Aplana un objeto al formato de formulario de Stripe:
 * `{ line_items: [{ price: 'x' }] }` → `line_items[0][price]=x`.
 */
export function comoFormulario(datos: Record<string, unknown>, prefijo = ''): string[] {
  const partes: string[] = [];
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor === undefined || valor === null) continue;
    const nombre = prefijo ? `${prefijo}[${clave}]` : clave;
    if (Array.isArray(valor)) {
      valor.forEach((v, i) => {
        if (v !== null && typeof v === 'object') partes.push(...comoFormulario(v as Record<string, unknown>, `${nombre}[${i}]`));
        else partes.push(`${encodeURIComponent(`${nombre}[${i}]`)}=${encodeURIComponent(String(v))}`);
      });
    } else if (typeof valor === 'object') {
      partes.push(...comoFormulario(valor as Record<string, unknown>, nombre));
    } else {
      partes.push(`${encodeURIComponent(nombre)}=${encodeURIComponent(String(valor))}`);
    }
  }
  return partes;
}

async function llamar<T>(config: ConfigDePasarela, ruta: string, datos: Record<string, unknown>): Promise<T> {
  const respuesta = await fetch(`${API}${ruta}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.clave}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: comoFormulario(datos).join('&'),
  });
  const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!respuesta.ok) {
    throw new Error(`La pasarela contestó ${respuesta.status}: ${cuerpo.error?.message ?? 'sin detalle'}`);
  }
  return cuerpo;
}

/** Lo que se vende en una sesión de pago. */
export type Compra =
  | { tipo: 'creditos'; creditos: number; centimos: number; nombre: string; gameId?: string }
  | { tipo: 'pase'; temporada: string; centimos: number; nombre: string }
  | { tipo: 'suscripcion' };

/**
 * Abre una sesión de pago y devuelve la URL de Stripe.
 *
 * `metadata` lleva lo que el aviso necesita para apuntar la compra sin tener
 * que fiarse de nada que venga del navegador: quién compra y qué compra. El
 * precio también lo pone el servidor: el navegador solo elige qué quiere.
 */
export async function abrirPago(
  config: ConfigDePasarela,
  opciones: {
    compra: Compra;
    cuentaId: string;
    correo?: string;
    cliente?: string;
    volverOk: string;
    volverCancelado: string;
  },
): Promise<{ url: string; id: string }> {
  const { compra } = opciones;
  const comun: Record<string, unknown> = {
    success_url: opciones.volverOk,
    cancel_url: opciones.volverCancelado,
    client_reference_id: opciones.cuentaId,
    locale: 'es',
    ...(opciones.cliente ? { customer: opciones.cliente } : opciones.correo ? { customer_email: opciones.correo } : {}),
    ...(config.impuestosAutomaticos ? { automatic_tax: { enabled: 'true' } } : {}),
  };

  if (compra.tipo === 'suscripcion') {
    if (!config.precioSuscripcion) throw new Error('No hay plan de suscripción configurado (STRIPE_PRECIO_SUSCRIPCION).');
    const sesion = await llamar<{ url: string; id: string }>(config, '/checkout/sessions', {
      ...comun,
      mode: 'subscription',
      line_items: [{ price: config.precioSuscripcion, quantity: 1 }],
      metadata: { cuentaId: opciones.cuentaId, tipo: 'suscripcion' },
      subscription_data: { metadata: { cuentaId: opciones.cuentaId } },
    });
    return { url: sesion.url, id: sesion.id };
  }

  /*
   * Un pago suelto se factura con su nombre y su importe exacto: el importe de
   * una velada sale del presupuesto de ESA velada, así que no puede ser un
   * precio fijo dado de alta en el panel.
   */
  const sesion = await llamar<{ url: string; id: string }>(config, '/checkout/sessions', {
    ...comun,
    mode: 'payment',
    ...(opciones.cliente ? {} : { customer_creation: 'always' }),
    invoice_creation: { enabled: 'true' },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: compra.centimos,
          // El IVA va dentro del precio que se anuncia, como exige la ley para
          // quien vende a particulares.
          ...(config.impuestosAutomaticos ? { tax_behavior: 'inclusive' } : {}),
          product_data: { name: compra.nombre },
        },
      },
    ],
    metadata: {
      cuentaId: opciones.cuentaId,
      tipo: compra.tipo,
      ...(compra.tipo === 'creditos' ? { creditos: String(compra.creditos), ...(compra.gameId ? { gameId: compra.gameId } : {}) } : {}),
      ...(compra.tipo === 'pase' ? { temporada: compra.temporada } : {}),
    },
    /*
     * El contenido digital se entrega al momento, y la ley de consumidores
     * (art. 103.m TRLGDCU) exige que quien compra lo pida expresamente y sepa
     * que así pierde el desistimiento. Se le dice en el botón de pagar; el
     * texto legal completo está en los términos.
     */
    custom_text: {
      submit: {
        message:
          'Al pagar pides que el servicio empiece ya y aceptas que, una vez generada la velada, no hay derecho de desistimiento.',
      },
    },
  });
  return { url: sesion.url, id: sesion.id };
}

/** El portal donde cada cual gestiona su suscripción, sus facturas y su tarjeta. */
export async function abrirPortal(config: ConfigDePasarela, cliente: string, volver: string): Promise<string> {
  const sesion = await llamar<{ url: string }>(config, '/billing_portal/sessions', { customer: cliente, return_url: volver });
  return sesion.url;
}

/**
 * Comprueba la firma de un aviso de Stripe y devuelve el evento, o `null` si no
 * es de Stripe.
 *
 * La cabecera es `Stripe-Signature: t=<segundos>,v1=<hex>[,v1=<hex>…]` y lo
 * firmado es `<t>.<cuerpo tal cual llegó>`. Por eso esta ruta necesita el cuerpo
 * CRUDO: si Express lo parsea antes, el JSON reescrito ya no es lo que se firmó.
 * Se rechaza lo que tenga más de cinco minutos, contra la repetición de avisos
 * robados.
 */
export function verificarAviso(
  secreto: string,
  cuerpo: Buffer | string,
  cabecera: string | undefined,
  ahora = Date.now(),
): { id: string; type: string; data: { object: Record<string, unknown> } } | null {
  if (!cabecera) return null;
  const partes = cabecera.split(',').map((p) => p.trim().split('='));
  const t = partes.find(([k]) => k === 't')?.[1];
  const firmas = partes.filter(([k]) => k === 'v1').map(([, v]) => v ?? '');
  if (!t || firmas.length === 0) return null;
  const segundos = Number(t);
  if (!Number.isFinite(segundos) || Math.abs(ahora / 1000 - segundos) > 300) return null;

  const texto = typeof cuerpo === 'string' ? cuerpo : cuerpo.toString('utf8');
  const esperada = crypto.createHmac('sha256', secreto).update(`${t}.${texto}`).digest('hex');
  const buena = firmas.some(
    (f) => f.length === esperada.length && crypto.timingSafeEqual(Buffer.from(f), Buffer.from(esperada)),
  );
  if (!buena) return null;
  try {
    return JSON.parse(texto) as { id: string; type: string; data: { object: Record<string, unknown> } };
  } catch {
    return null;
  }
}
