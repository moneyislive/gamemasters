/**
 * El cobro, sin pasarela de verdad y sin gastar nada.
 *
 *   npm run verify:cobro -w server
 *
 * Lo que tiene que ser cierto SIEMPRE que haya dinero de por medio:
 *
 *   · un pago que avisa dos veces suma una (las pasarelas reintentan);
 *   · un cargo no deja el saldo en negativo, ni con dos a la vez;
 *   · un reembolso se hace una vez por cargo, se pida las veces que se pida;
 *   · la bolsa del mes se gasta antes que lo comprado y caduca al renovar, sin
 *     llevarse lo comprado;
 *   · un aviso con la firma mal, o viejo, no entra;
 *   · la página de pago pide aceptar los términos, y el IVA va como diga quien
 *     se encargue de él: nadie, Stripe Tax o Stripe vendiendo (Managed Payments);
 *   · y el presupuesto de una velada sube con la mesa y con el modelo.
 *
 * Corre sobre el almacén de fichero, en una carpeta temporal que borra al acabar.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

delete process.env.MONGODB_URI;
process.env.ANTHROPIC_API_KEY = '';
// Con el cobro ENCENDIDO: el pase solo cierra algo si hay algo que vender.
process.env.COBRO_ACTIVO = 'si';
process.env.PLAYER_TOKEN_SECRET = 'secreto-de-prueba-del-cobro-0123456789';
// Con contraseña de la casa: sin ella, fuera de producción el taller está abierto a todos
// y la puerta no se puede medir.
process.env.APP_PASSWORD = 'clave-de-la-casa-de-prueba';
delete process.env.GM_ADMITIDOS;
const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'cobro-'));
process.chdir(carpeta);

const { initStore, getStore } = await import('../src/db/store');
const { abonar, cargar, reembolsar, saldoDe, delMesDe } = await import('../src/cobro/monedero');
const { verificarAviso, comoFormulario, datosDelPago, CODIGO_FISCAL, AVISO_DE_DESISTIMIENTO } = await import('../src/cobro/pasarela');
const { atenderAviso } = await import('../src/cobro/avisos');
const { presupuestar, precioRedondo } = await import('../src/cobro/precios');
const { temporadaDe, CREDITOS_DE_LA_SUSCRIPCION } = await import('../src/cobro/ofertas');
const { puedeLlevar, esDelPase, paseVigente } = await import('../src/cobro/pase');
const { emitirSesionDeCuenta, CABECERA_CUENTA } = await import('../src/identidad/sesion');
const { tallerAbiertoPara } = await import('../src/auth');
const { veLasHuerfanas } = await import('../src/taller/dueno');
import type { Account } from '../../shared/live';
import type { Compra, ConfigDePasarela } from '../src/cobro/pasarela';

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 300)}`}`);
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

await initStore();
const store = getStore();
const cuenta: Account = {
  id: 'cuenta-prueba',
  email: 'ana@example.com',
  displayName: 'Ana',
  createdAt: new Date().toISOString(),
  partidas: [],
  trofeos: [],
};
await store.saveAccount(cuenta);
const saldo = async () => saldoDe(await store.movimientosDe(cuenta.id));

try {
  paso('Un pago que avisa dos veces suma una');
  await abonar(cuenta.id, 'compra', 1000, 'Compra', { referencia: 'pasarela:cs_1' });
  const otra = await abonar(cuenta.id, 'compra', 1000, 'Compra', { referencia: 'pasarela:cs_1' });
  comprobar('la segunda no es nueva', otra.nuevo === false);
  comprobar('el saldo es 1000', (await saldo()) === 1000, await saldo());

  paso('Un cargo no deja el saldo en negativo, ni con dos a la vez');
  const [a, b] = await Promise.all([
    cargar(cuenta.id, 700, 'Velada A', { referencia: 'velada:A:1', gameId: 'A' }),
    cargar(cuenta.id, 700, 'Velada B', { referencia: 'velada:B:1', gameId: 'B' }),
  ]);
  comprobar('uno entra y el otro no', [a.ok, b.ok].filter(Boolean).length === 1, [a, b]);
  comprobar('el saldo queda en 300', (await saldo()) === 300, await saldo());
  const repetido = await cargar(cuenta.id, 700, 'Velada A', { referencia: 'velada:A:1', gameId: 'A' });
  comprobar('el mismo cargo pedido otra vez no cobra dos veces', repetido.ok && (await saldo()) === 300);

  paso('Un reembolso por cargo');
  const cargo = a.ok ? a.movimiento : b.ok ? b.movimiento : undefined;
  if (cargo) {
    await reembolsar(cargo, 'La revisión no pudo garantizar la trama');
    await reembolsar(cargo, 'La revisión no pudo garantizar la trama');
    comprobar('devuelve los 700 una sola vez', (await saldo()) === 1000, await saldo());
  } else comprobar('había un cargo que reembolsar', false);

  paso('La bolsa del mes se gasta primero y caduca al renovar');
  await abonar(cuenta.id, 'suscripcion', 2000, 'Bolsa de octubre', { referencia: 'pasarela:in_1' });
  comprobar('saldo 3000, del mes 2000', (await saldo()) === 3000 && delMesDe(await store.movimientosDe(cuenta.id)) === 2000);
  await cargar(cuenta.id, 600, 'Velada C', { referencia: 'velada:C:1' });
  comprobar('el cargo sale de la bolsa del mes', delMesDe(await store.movimientosDe(cuenta.id)) === 1400);
  await abonar(cuenta.id, 'suscripcion', 2000, 'Bolsa de noviembre', { referencia: 'pasarela:in_2' });
  const movs = await store.movimientosDe(cuenta.id);
  comprobar('caducan los 1400 que quedaban', movs.some((m) => m.tipo === 'caducidad' && m.creditos === -1400), movs.map((m) => [m.tipo, m.creditos]));
  comprobar('y lo comprado se queda: 1000 + 2000 nuevos', (await saldo()) === 3000, await saldo());

  paso('La firma de los avisos');
  const secreto = 'whsec_prueba';
  const cuerpo = JSON.stringify({ id: 'evt_1', type: 'ping', data: { object: {} } });
  const t = Math.floor(Date.now() / 1000);
  const firma = crypto.createHmac('sha256', secreto).update(`${t}.${cuerpo}`).digest('hex');
  comprobar('una firma buena entra', verificarAviso(secreto, cuerpo, `t=${t},v1=${firma}`)?.id === 'evt_1');
  comprobar('una firma mala no', verificarAviso(secreto, cuerpo, `t=${t},v1=${'0'.repeat(64)}`) === null);
  comprobar('un cuerpo tocado no', verificarAviso(secreto, cuerpo.replace('ping', 'pong'), `t=${t},v1=${firma}`) === null);
  const vieja = t - 3600;
  const firmaVieja = crypto.createHmac('sha256', secreto).update(`${vieja}.${cuerpo}`).digest('hex');
  comprobar('un aviso de hace una hora no', verificarAviso(secreto, cuerpo, `t=${vieja},v1=${firmaVieja}`) === null);
  comprobar('sin cabecera no', verificarAviso(secreto, cuerpo, undefined) === null);

  paso('Los avisos de la pasarela');
  const nueva = await store.movimientosDe(cuenta.id);
  const antes = saldoDe(nueva);
  const compra = {
    id: 'evt_c',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_99',
        mode: 'payment',
        payment_status: 'paid',
        client_reference_id: cuenta.id,
        customer: 'cus_123',
        metadata: { cuentaId: cuenta.id, tipo: 'creditos', creditos: '599', gameId: 'G' },
      },
    },
  };
  await atenderAviso(compra);
  await atenderAviso(compra);
  comprobar('una compra suelta suma sus créditos una vez', (await saldo()) === antes + 599, (await saldo()) - antes);
  comprobar('y guarda el cliente de la pasarela', (await store.getAccount(cuenta.id))?.cobro?.clientePasarela === 'cus_123');

  await atenderAviso({
    id: 'evt_i',
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_99',
        customer: 'cus_123',
        parent: { subscription_details: { subscription: 'sub_1' } },
        lines: { data: [{ period: { end: Math.floor(Date.now() / 1000) + 30 * 86400 } }] },
      },
    },
  });
  const tras = await store.getAccount(cuenta.id);
  comprobar('una factura pagada de la suscripción trae la bolsa del mes', delMesDe(await store.movimientosDe(cuenta.id)) === CREDITOS_DE_LA_SUSCRIPCION);
  comprobar('y deja la suscripción activa', tras?.cobro?.suscripcion?.estado === 'activa' && tras.cobro.suscripcion.referencia === 'sub_1', tras?.cobro);
  comprobar('y el pase de la temporada', (tras?.cobro?.pases ?? []).some((p) => p.temporada === temporadaDe(new Date()).temporada));

  await atenderAviso({
    id: 'evt_u',
    type: 'customer.subscription.updated',
    data: { object: { id: 'sub_1', customer: 'cus_123', status: 'active', cancel_at_period_end: true, items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 86400 }] } } },
  });
  comprobar('una baja pedida deja de renovar sin cortar lo pagado', (await store.getAccount(cuenta.id))?.cobro?.suscripcion?.renueva === false);
  await atenderAviso({ id: 'evt_d', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', customer: 'cus_123', status: 'canceled' } } });
  comprobar('y al terminar queda cancelada', (await store.getAccount(cuenta.id))?.cobro?.suscripcion?.estado === 'cancelada');
  comprobar('un aviso de otra cosa no rompe nada', (await atenderAviso({ id: 'x', type: 'charge.updated', data: { object: {} } })).hecho.startsWith('sin tratamiento'));

  // Stripe no garantiza el orden: la primera factura puede llegar antes que el
  // pago completado, cuando la cuenta todavía no conoce a su cliente.
  const finDelMes = { data: [{ period: { end: Math.floor(Date.now() / 1000) + 30 * 86400 } }] };
  const nuevaCuenta = async (id: string): Promise<Account> => {
    const c: Account = { id, email: `${id}@example.com`, displayName: id, createdAt: new Date().toISOString(), partidas: [], trofeos: [] };
    await store.saveAccount(c);
    return c;
  };
  const adelantada = await nuevaCuenta('cuenta-adelantada');
  const primero = await atenderAviso({
    id: 'evt_o',
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_orden',
        customer: 'cus_456',
        parent: { subscription_details: { subscription: 'sub_2', metadata: { cuentaId: adelantada.id } } },
        lines: finDelMes,
      },
    },
  });
  comprobar(
    'la factura que llega antes que el pago encuentra su cuenta y trae la bolsa',
    delMesDe(await store.movimientosDe(adelantada.id)) === CREDITOS_DE_LA_SUSCRIPCION,
    primero,
  );
  comprobar('y le apunta el cliente de la pasarela', (await store.getAccount(adelantada.id))?.cobro?.clientePasarela === 'cus_456');
  const antigua = await nuevaCuenta('cuenta-antigua');
  await atenderAviso({
    id: 'evt_v',
    type: 'invoice.paid',
    data: {
      object: { id: 'in_vieja', customer: 'cus_789', subscription: 'sub_3', subscription_details: { metadata: { cuentaId: antigua.id } }, lines: finDelMes },
    },
  });
  comprobar('y en la forma de antes de 2025, también', delMesDe(await store.movimientosDe(antigua.id)) === CREDITOS_DE_LA_SUSCRIPCION);

  paso('El formulario de la pasarela');
  const form = comoFormulario({ line_items: [{ price_data: { currency: 'eur', unit_amount: 599 } }], metadata: { tipo: 'creditos' } });
  comprobar(
    'se aplana como pide Stripe',
    form.includes(`${encodeURIComponent('line_items[0][price_data][unit_amount]')}=599`) && form.includes(`${encodeURIComponent('metadata[tipo]')}=creditos`),
    form,
  );

  paso('La página de pago, según quién se encargue del IVA');
  const leer = (datos: Record<string, unknown>) => decodeURIComponent(comoFormulario(datos).join('&'));
  const pasarela = (cambios: Partial<ConfigDePasarela>): ConfigDePasarela => ({
    clave: 'sk_test_prueba',
    precioSuscripcion: 'price_plan',
    impuestosAutomaticos: false,
    gestionado: false,
    ...cambios,
  });
  const alPagar = { cuentaId: 'c-1', correo: 'ana@example.com', volverOk: 'https://x/?pago=ok', volverCancelado: 'https://x/?pago=cancelado' };
  const bolsaDePrueba: Compra = { tipo: 'creditos', creditos: 1000, centimos: 1000, nombre: '1000 créditos de GameMasters' };
  const paseDePrueba: Compra = { tipo: 'pase', temporada: '2026-T4', centimos: 499, nombre: 'Pase de la Sala' };

  const sinIva = leer(datosDelPago(pasarela({}), { compra: bolsaDePrueba, ...alPagar }));
  comprobar('los términos se aceptan en la propia página de pago', sinIva.includes('consent_collection[terms_of_service]=required'));
  comprobar('y el desistimiento se avisa junto al botón', sinIva.includes(`custom_text[submit][message]=${AVISO_DE_DESISTIMIENTO}`));
  comprobar('sin nadie a cargo del IVA, no se pide nada de impuestos', !/automatic_tax|managed_payments|tax_code|tax_behavior/.test(sinIva), sinIva);

  const conStripeTax = leer(datosDelPago(pasarela({ impuestosAutomaticos: true }), { compra: bolsaDePrueba, ...alPagar, cliente: 'cus_1' }));
  comprobar('con Stripe Tax se pide el IVA automático', conStripeTax.includes('automatic_tax[enabled]=true'));
  comprobar('y a quien ya compró se le guarda la dirección que escriba', conStripeTax.includes('customer_update[address]=auto'), conStripeTax);
  comprobar('el precio lleva el IVA dentro', conStripeTax.includes('line_items[0][price_data][tax_behavior]=inclusive'));
  comprobar('con el código fiscal de las veladas', conStripeTax.includes(`[product_data][tax_code]=${CODIGO_FISCAL.veladas}`));
  comprobar('y la factura del pago suelto', conStripeTax.includes('invoice_creation[enabled]=true'));

  const gestionado = pasarela({ gestionado: true, impuestosAutomaticos: true });
  const vendeStripe = leer(datosDelPago(gestionado, { compra: bolsaDePrueba, ...alPagar, cliente: 'cus_1' }));
  comprobar('con Managed Payments, vende Stripe', vendeStripe.includes('managed_payments[enabled]=true'));
  comprobar('sin lo que Stripe no deja tocar cuando vende él', !/automatic_tax|customer_update|invoice_creation/.test(vendeStripe), vendeStripe);
  comprobar(
    'el precio lleva el IVA dentro: sin decirlo, Stripe lo sumaría encima',
    vendeStripe.includes('line_items[0][price_data][tax_behavior]=inclusive'),
  );
  comprobar('los créditos, con el código de las veladas', vendeStripe.includes(`[tax_code]=${CODIGO_FISCAL.veladas}`));
  comprobar(
    'y el pase, con el suyo',
    leer(datosDelPago(gestionado, { compra: paseDePrueba, ...alPagar })).includes(`[tax_code]=${CODIGO_FISCAL.pase}`),
  );
  const suscripcionQueVendeStripe = leer(datosDelPago(gestionado, { compra: { tipo: 'suscripcion' }, ...alPagar }));
  comprobar(
    'la suscripción también, con su plan y la cuenta en el metadata',
    suscripcionQueVendeStripe.includes('managed_payments[enabled]=true') &&
      suscripcionQueVendeStripe.includes('line_items[0][price]=price_plan') &&
      suscripcionQueVendeStripe.includes('subscription_data[metadata][cuentaId]=c-1') &&
      !suscripcionQueVendeStripe.includes('automatic_tax'),
    suscripcionQueVendeStripe,
  );

  paso('El pase de la Sala');
  const peticion = (cabecera?: string) =>
    ({ headers: cabecera ? { [CABECERA_CUENTA]: cabecera } : {}, get: () => undefined }) as unknown as import('express').Request;
  const sinPase: Account = { ...cuenta, id: 'sin-pase', email: 'bea@example.com', cobro: {} };
  await store.saveAccount(sinPase);
  comprobar('una figura de serie la lleva cualquiera', (await puedeLlevar(peticion(), 'caballero')).ok);
  comprobar('las del pase se reconocen por su forma', esDelPase('pase-caballero-dorado') && !esDelPase('caballero'));
  const anonimo = await puedeLlevar(peticion(), 'pase-caballero-dorado');
  comprobar('sin cuenta, una del pase no', !anonimo.ok && anonimo.estado === 401, anonimo);
  const sinElPase = await puedeLlevar(peticion(emitirSesionDeCuenta(sinPase, 'google')), 'pase-caballero-dorado');
  comprobar('con cuenta y sin pase, tampoco', !sinElPase.ok && sinElPase.estado === 403, sinElPase);
  const conElPase = (await store.getAccount(cuenta.id))!;
  comprobar('la cuenta suscrita tiene el pase vigente', Boolean(paseVigente(conElPase)), conElPase.cobro);
  comprobar(
    'y con él la lleva',
    (await puedeLlevar(peticion(emitirSesionDeCuenta(conElPase, 'google')), 'pase-caballero-dorado')).ok,
  );
  comprobar(
    'un pase caducado no vale',
    !paseVigente({ ...conElPase, cobro: { pases: [{ temporada: '2020-T1', hasta: '2020-04-01T00:00:00.000Z', via: 'compra' }] } }),
  );

  paso('El taller abierto a cualquier cuenta, porque se cobra');
  const ahoraIso = new Date().toISOString();
  const conGoogle: Account = {
    ...cuenta,
    id: 'con-google',
    email: 'carla@example.com',
    identidades: [{ proveedor: 'google', sub: 'g-carla', correo: 'carla@example.com', correoVerificado: true, esRelay: false, vinculadaEl: ahoraIso, vistaEl: ahoraIso }],
    correos: [{ correo: 'carla@example.com', nivel: 'buzon', origen: 'google', anadidoEl: ahoraIso }],
  };
  const soloPerfil: Account = { ...cuenta, id: 'solo-perfil', email: 'dani@example.com' };
  await store.saveAccount(conGoogle);
  await store.saveAccount(soloPerfil);
  comprobar(
    'entra quien vino con Google',
    await tallerAbiertoPara(peticion(emitirSesionDeCuenta(conGoogle, 'google'))),
  );
  comprobar(
    'no entra quien solo guardó su perfil de jugador desde la app',
    !(await tallerAbiertoPara(peticion(emitirSesionDeCuenta(soloPerfil, 'google')))),
  );
  comprobar('sin nada, tampoco', !(await tallerAbiertoPara(peticion())));
  comprobar(
    'una cuenta cualquiera no ve las partidas antiguas sin dueño',
    !(await veLasHuerfanas(peticion(emitirSesionDeCuenta(conGoogle, 'google')), conGoogle.id)),
  );
  process.env.GM_ADMITIDOS = 'carla@example.com';
  comprobar(
    'la que la casa autoriza, sí',
    await veLasHuerfanas(peticion(emitirSesionDeCuenta(conGoogle, 'google')), conGoogle.id),
  );
  delete process.env.GM_ADMITIDOS;

  paso('El presupuesto');
  const pasos = ['trama', 'material', 'detective', 'revisor', 'asistente'] as const;
  const chica = presupuestar([...pasos], { personas: 4, salas: 4, objetos: 4 }, 'claude-opus-5-5', 'high');
  const grande = presupuestar([...pasos], { personas: 12, salas: 8, objetos: 6 }, 'claude-opus-5-5', 'high');
  const fable = presupuestar([...pasos], { personas: 4, salas: 4, objetos: 4 }, 'claude-fable-5-1', 'high');
  const baja = presupuestar([...pasos], { personas: 4, salas: 4, objetos: 4 }, 'claude-opus-5-5', 'low');
  comprobar('más gente cuesta más', grande.centimos > chica.centimos, [chica.centimos, grande.centimos]);
  comprobar('Fable cuesta más que el de la casa', fable.centimos > chica.centimos);
  comprobar('menos esfuerzo cuesta menos o igual', baja.costeUsd < chica.costeUsd);
  comprobar('los precios acaban en ,49 o ,99', [chica, grande, fable].every((p) => p.centimos % 100 === 49 || p.centimos % 100 === 99));
  comprobar('y los créditos son el mismo número', chica.creditos === chica.centimos);
  comprobar('el redondeo sube, nunca baja', precioRedondo(500) === 549 && precioRedondo(550) === 599 && precioRedondo(549) === 549);
  const conMayordomo = presupuestar([...pasos, 'mayordomo'], { personas: 7, salas: 5, objetos: 4 }, 'claude-opus-5-5', 'high');
  comprobar('lo que trae la velada con app incluye al Mayordomo', conMayordomo.incluye.some((i) => i.includes('Mayordomo')));
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.stack : String(e)}`);
} finally {
  await new Promise((r) => setTimeout(r, 200));
  try {
    process.chdir(os.tmpdir());
    fs.rmSync(carpeta, { recursive: true, force: true });
  } catch {
    /* carpeta temporal */
  }
}

console.log(`\n${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('Cada crédito entra una vez, sale una vez y se puede explicar.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
