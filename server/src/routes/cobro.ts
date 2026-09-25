/**
 * Las rutas del cobro.
 *
 *   GET  /api/cobro/estado     el monedero de quien llama: saldo, suscripción, pase y ofertas
 *   POST /api/cobro/comprar    abre un pago en la pasarela y devuelve su URL
 *   POST /api/cobro/portal     abre el portal del cliente (suscripción, facturas, tarjeta)
 *   POST /api/cobro/aviso      los avisos de la pasarela (va montado aparte: ver `avisoRouter`)
 *
 * El presupuesto de una velada cuelga de la partida —`/games/:id/presupuesto`—,
 * así que vive con las rutas de la partida y pasa por su guardián de dueños.
 */
import express from 'express';
import type { EstadoDelMonedero } from '../../../shared/cobro';
import { CREDITOS_POR_EURO } from '../../../shared/cobro';
import { crearRouter } from '../rutas';
import { env } from '../config';
import { getStore } from '../db/store';
import { pagadorDe } from '../cobro/quien-paga';
import { delMesDe, saldoDe } from '../cobro/monedero';
import { bolsa, COBRO_ACTIVO, ofertas, PRECIO_DEL_PASE, temporadaDe } from '../cobro/ofertas';
import { abrirPago, abrirPortal, configDePasarela, verificarAviso, type Compra } from '../cobro/pasarela';
import { atenderAviso } from '../cobro/avisos';

const router = crearRouter();

/** A dónde vuelve la persona después de pagar. Del origen público, nunca de la cabecera `Host`. */
function vuelta(req: express.Request, estado: 'ok' | 'cancelado'): string {
  const origen = env.publicOrigin ?? `${req.protocol}://${req.get('host')}`;
  return `${origen}/?pago=${estado}`;
}

router.get('/cobro/estado', async (req, res) => {
  const pagador = await pagadorDe(req);
  if (!pagador || pagador.tipo === 'exento') {
    const estado: EstadoDelMonedero = {
      cobroActivo: COBRO_ACTIVO && pagador?.tipo !== 'exento',
      saldo: 0,
      delMes: 0,
      ofertas: [],
      movimientos: [],
    };
    res.json(estado);
    return;
  }
  const movimientos = await getStore().movimientosDe(pagador.cuenta.id);
  const cobro = pagador.cuenta.cobro;
  const ahora = new Date().toISOString();
  const pase = (cobro?.pases ?? []).find((p) => p.hasta > ahora);
  const estado: EstadoDelMonedero = {
    cobroActivo: true,
    saldo: saldoDe(movimientos),
    delMes: delMesDe(movimientos),
    ...(cobro?.suscripcion ? { suscripcion: cobro.suscripcion } : {}),
    ...(pase ? { pase } : {}),
    ofertas: configDePasarela() ? ofertas() : [],
    // Los más recientes primero, y no toda la vida: el historial entero está en el portal.
    movimientos: movimientos.slice(-30).reverse(),
  };
  res.json(estado);
});

router.post('/cobro/comprar', async (req, res) => {
  const pagador = await pagadorDe(req);
  if (!pagador) {
    res.status(401).json({ error: 'Para comprar hace falta entrar con tu cuenta.' });
    return;
  }
  if (pagador.tipo === 'exento') {
    res.status(409).json({ error: 'En esta instalación no se cobra: no hace falta comprar nada.' });
    return;
  }
  const config = configDePasarela();
  if (!config) {
    res.status(503).json({ error: 'Los pagos no están disponibles ahora mismo.' });
    return;
  }

  const cuerpo = (req.body ?? {}) as { oferta?: unknown; creditos?: unknown; gameId?: unknown };
  let compra: Compra;
  if (cuerpo.oferta === 'suscripcion') {
    if (pagador.cuenta.cobro?.suscripcion?.estado === 'activa') {
      res.status(409).json({ error: 'Ya tienes la suscripción activa. Puedes gestionarla desde tu portal.' });
      return;
    }
    compra = { tipo: 'suscripcion' };
  } else if (cuerpo.oferta === 'pase') {
    const t = temporadaDe(new Date());
    compra = { tipo: 'pase', temporada: t.temporada, centimos: PRECIO_DEL_PASE, nombre: `Pase de la Sala de Arcade · ${t.temporada}` };
  } else if (cuerpo.oferta === 'velada') {
    /*
     * Justo lo de una velada: los créditos que cuesta, al precio suelto. El
     * número llega del navegador, pero se acota y se cobra a su precio: pedir
     * más créditos solo significa pagar más.
     */
    const creditos = Math.round(Number(cuerpo.creditos));
    if (!Number.isInteger(creditos) || creditos < 100 || creditos > 10_000) {
      res.status(400).json({ error: 'Cantidad de créditos no válida.' });
      return;
    }
    compra = {
      tipo: 'creditos',
      creditos,
      centimos: Math.round((creditos / CREDITOS_POR_EURO) * 100),
      nombre: `Velada: ${creditos} créditos`,
      ...(typeof cuerpo.gameId === 'string' ? { gameId: cuerpo.gameId } : {}),
    };
  } else {
    const b = typeof cuerpo.oferta === 'string' ? bolsa(cuerpo.oferta) : undefined;
    if (!b) {
      res.status(400).json({ error: 'Esa oferta no existe.' });
      return;
    }
    compra = { tipo: 'creditos', creditos: b.creditos, centimos: b.centimos, nombre: `${b.creditos} créditos de GameMasters` };
  }

  try {
    const { url } = await abrirPago(config, {
      compra,
      cuentaId: pagador.cuenta.id,
      correo: (pagador.cuenta.correos ?? []).find((c) => c.nivel === 'buzon')?.correo,
      cliente: pagador.cuenta.cobro?.clientePasarela,
      volverOk: vuelta(req, 'ok'),
      volverCancelado: vuelta(req, 'cancelado'),
    });
    res.json({ url });
  } catch (error) {
    console.error('[cobro] no se pudo abrir el pago:', error);
    res.status(502).json({ error: 'No se pudo abrir el pago. Inténtalo de nuevo en un momento.' });
  }
});

router.post('/cobro/portal', async (req, res) => {
  const pagador = await pagadorDe(req);
  const cliente = pagador?.tipo === 'cuenta' ? pagador.cuenta.cobro?.clientePasarela : undefined;
  const config = configDePasarela();
  if (!config || !cliente) {
    res.status(409).json({ error: 'Todavía no hay pagos con esta cuenta.' });
    return;
  }
  try {
    res.json({ url: await abrirPortal(config, cliente, vuelta(req, 'ok')) });
  } catch (error) {
    console.error('[cobro] no se pudo abrir el portal:', error);
    res.status(502).json({ error: 'No se pudo abrir el portal de pagos.' });
  }
});

export default router;

/**
 * El aviso de la pasarela, en su propio router y con el cuerpo CRUDO.
 *
 * Va montado en `index.ts` ANTES del lector de JSON y fuera de la puerta del
 * taller: Stripe no trae contraseña, trae firma, y la firma se calcula sobre los
 * bytes exactos que llegaron. Un JSON parseado y vuelto a escribir ya no es lo
 * que se firmó.
 *
 * Contesta 2xx a todo lo que tenga firma buena, se haga algo o no: un 5xx hace
 * que Stripe reintente durante días. Solo un fallo de verdad al guardar devuelve
 * 500, para que el reintento lo arregle.
 */
export const avisoRouter = crearRouter();

avisoRouter.post('/cobro/aviso', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
  const config = configDePasarela();
  if (!config?.secretoDeAvisos) {
    res.status(503).json({ error: 'Sin secreto de avisos configurado.' });
    return;
  }
  const evento = verificarAviso(config.secretoDeAvisos, req.body as Buffer, req.get('stripe-signature'));
  if (!evento) {
    res.status(400).json({ error: 'Firma no válida.' });
    return;
  }
  try {
    const { hecho } = await atenderAviso(evento);
    console.log(`[cobro] aviso ${evento.type} (${evento.id}): ${hecho}`);
    res.json({ recibido: true });
  } catch (error) {
    console.error(`[cobro] el aviso ${evento.type} (${evento.id}) falló:`, error);
    res.status(500).json({ error: 'No se pudo guardar; que se reintente.' });
  }
});
