/**
 * La pasarela contra Stripe DE VERDAD, en su entorno de prueba: no cobra nada.
 *
 *   npm run probar:stripe -w server
 *
 * Es el último paso de docs/GUIA-STRIPE.md antes de tocar dinero. Hace contra la
 * API de Stripe lo mismo que hará el taller y, si algo falla, dice qué falta:
 *
 *   1. que el plan de suscripción existe, es mensual, en euros y cuesta lo que se
 *      anuncia (COBRO_PRECIO_SUSCRIPCION);
 *   2. que Stripe acepta abrir los tres pagos —créditos, pase y suscripción— con
 *      las opciones con que los abre el taller: la casilla de los términos, el
 *      aviso del desistimiento y, con STRIPE_IMPUESTOS=si, el IVA automático. Las
 *      direcciones de los tres se imprimen, para pagarlas con la tarjeta de
 *      prueba 4242 4242 4242 4242;
 *   3. que el portal del cliente está guardado, abriéndolo para un cliente de
 *      prueba.
 *
 * No está en la batería porque necesita red y una cuenta de Stripe. Solo corre
 * con una clave de PRUEBA (sk_test_… o rk_test_…): con una de verdad se niega.
 * No toca ninguna base de datos: los pagos van a nombre de una cuenta que no
 * existe, y si sus avisos llegan a un servidor, este los ignora («sin cuenta»).
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

// El .env de esta carpeta y, para lo que falte, el de la carpeta principal.
// dotenv no pisa lo que ya está puesto: manda lo de aquí, y lo de la consola antes que nada.
const raiz = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
for (const candidato of [path.join(raiz, '.env'), path.resolve(raiz, '..', 'GameMasters', '.env')]) {
  if (fs.existsSync(candidato)) dotenv.config({ path: candidato });
}

const clave = process.env.STRIPE_SECRET_KEY?.trim() ?? '';
if (!clave) {
  console.error('No hay STRIPE_SECRET_KEY: ponla en el .env de esta carpeta (docs/GUIA-STRIPE.md, paso 6).');
  process.exit(2);
}
if (!/^(sk|rk)_test_/.test(clave)) {
  console.error('Esta prueba solo corre con una clave de PRUEBA (sk_test_…). La de verdad no se usa para probar.');
  process.exit(2);
}

// Después del .env: las constantes del cobro se leen del entorno al importarse.
const { configDePasarela, abrirPago, abrirPortal, comoFormulario } = await import('../src/cobro/pasarela');
const { PRECIO_DE_LA_SUSCRIPCION, PRECIO_DEL_PASE, bolsa, temporadaDe } = await import('../src/cobro/ofertas');
import type { Compra } from '../src/cobro/pasarela';

const config = configDePasarela();
if (!config) process.exit(2);

const fallos: string[] = [];
const bien = (que: string) => console.log(`  ✓ ${que}`);
const aviso = (que: string) => console.log(`  ! ${que}`);
function mal(que: string, porque: string, arreglo: string): void {
  fallos.push(que);
  console.log(`  ✗ ${que}\n      Stripe dice: ${porque}\n      Qué hacer: ${arreglo}`);
}
const mensaje = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Lo que suele querer decir cada error de Stripe, en el orden de la guía. */
function pista(texto: string): string {
  if (/terms of service|terms_of_service|consent/i.test(texto)) {
    return 'pon la dirección de los términos (https://harkania.onrender.com/terminos) en dashboard.stripe.com/settings/public — paso 2 de la guía.';
  }
  if (/tax|head office|origin address/i.test(texto)) {
    return 'Stripe Tax no está listo: completa dashboard.stripe.com/settings/tax (paso 8), o deja STRIPE_IMPUESTOS=no mientras pruebas.';
  }
  if (/no such price/i.test(texto)) {
    return 'ese price_… no existe en el entorno de PRUEBA: los de prueba y los de verdad son distintos (paso 3).';
  }
  if (/portal|configuration/i.test(texto)) {
    return 'guarda la configuración del portal en dashboard.stripe.com/settings/billing/portal (paso 4); prueba y verdad se guardan por separado.';
  }
  return 'mira la petición en el panel de Stripe (Workbench → Registros), que trae el detalle completo.';
}

async function pedir<T>(metodo: 'GET' | 'POST', ruta: string, datos?: Record<string, unknown>): Promise<T> {
  const respuesta = await fetch(`https://api.stripe.com/v1${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${clave}`,
      ...(datos ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    ...(datos ? { body: comoFormulario(datos).join('&') } : {}),
  });
  const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!respuesta.ok) throw new Error(cuerpo.error?.message ?? `HTTP ${respuesta.status}`);
  return cuerpo;
}

const euros = (centimos: number) => `${(centimos / 100).toFixed(2).replace('.', ',')} €`;
const direcciones: Array<[string, string]> = [];

console.log('\n· La clave');
try {
  await pedir('GET', '/prices?limit=1');
  bien('Stripe la acepta');
} catch (error) {
  // Con la clave mal, todo lo demás fallaría por lo mismo: no hace falta leerlo cinco veces.
  mal('Stripe la acepta', mensaje(error), 'cópiala otra vez de dashboard.stripe.com/apikeys: la «clave secreta» del entorno de PRUEBA (paso 6).');
  process.exit(1);
}

console.log('\n· El plan de suscripción');
if (!config.precioSuscripcion) {
  mal('hay un plan', 'STRIPE_PRECIO_SUSCRIPCION está vacío', 'crea el precio mensual (paso 3) y copia su price_… al .env.');
} else {
  try {
    const precio = await pedir<{
      active: boolean;
      currency: string;
      unit_amount: number | null;
      recurring: { interval: string; interval_count: number } | null;
      tax_behavior: string | null;
    }>('GET', `/prices/${encodeURIComponent(config.precioSuscripcion)}`);
    if (!precio.active) mal('el plan está activo', 'el precio está archivado', 'desarchívalo o crea otro (paso 3).');
    else bien('el plan existe y está activo');
    if (precio.currency !== 'eur') mal('el plan va en euros', `va en ${precio.currency}`, 'crea el precio en EUR (paso 3).');
    if (precio.recurring?.interval !== 'month' || precio.recurring.interval_count !== 1) {
      mal('el plan es mensual', JSON.stringify(precio.recurring), 'crea un precio recurrente de cada mes (paso 3).');
    }
    if (precio.unit_amount !== PRECIO_DE_LA_SUSCRIPCION) {
      mal(
        'el plan cuesta lo que se anuncia',
        `Stripe cobra ${euros(precio.unit_amount ?? 0)} y el taller anuncia ${euros(PRECIO_DE_LA_SUSCRIPCION)}`,
        'haz que coincidan: el precio de Stripe no se puede editar, así que o creas otro o cambias COBRO_PRECIO_SUSCRIPCION.',
      );
    } else bien(`y cuesta lo que se anuncia: ${euros(PRECIO_DE_LA_SUSCRIPCION)} al mes`);
    if (config.impuestosAutomaticos && precio.tax_behavior === 'exclusive') {
      mal(
        'el IVA va dentro del precio',
        'el precio es «sin impuestos incluidos»: a 14,99 € se le sumaría el IVA',
        'crea el precio con los impuestos INCLUIDOS (paso 3).',
      );
    } else if (config.impuestosAutomaticos && precio.tax_behavior !== 'inclusive') {
      aviso('el precio no dice si lleva el IVA dentro: manda el comportamiento por defecto de Stripe Tax, que debe ser «Incluido» (paso 8).');
    }
  } catch (error) {
    mal('el plan existe', mensaje(error), pista(mensaje(error)));
  }
}

console.log('\n· Los tres pagos, como los abre el taller');
const origen = process.env.PUBLIC_ORIGIN?.trim().split(',')[0] || 'http://localhost:5301';
const comun = {
  cuentaId: 'prueba-de-la-guia-stripe',
  correo: 'prueba@example.com',
  volverOk: `${origen}/?pago=ok`,
  volverCancelado: `${origen}/?pago=cancelado`,
};
const chica = bolsa('bolsa-chica');
const temporada = temporadaDe(new Date()).temporada;
const compras: Array<[string, Compra]> = [
  ...(chica
    ? [[`${chica.creditos} créditos, ${euros(chica.centimos)}`, { tipo: 'creditos', creditos: chica.creditos, centimos: chica.centimos, nombre: `${chica.creditos} créditos de GameMasters` }] as [string, Compra]]
    : []),
  [`pase de la Sala, ${euros(PRECIO_DEL_PASE)}`, { tipo: 'pase', temporada, centimos: PRECIO_DEL_PASE, nombre: `Pase de la Sala de Arcade · ${temporada}` }],
  ...(config.precioSuscripcion ? [[`suscripción, ${euros(PRECIO_DE_LA_SUSCRIPCION)} al mes`, { tipo: 'suscripcion' }] as [string, Compra]] : []),
];
for (const [nombre, compra] of compras) {
  try {
    const { url } = await abrirPago(config, { compra, ...comun });
    bien(`Stripe abre el pago: ${nombre}`);
    direcciones.push([nombre, url]);
  } catch (error) {
    mal(`Stripe abre el pago: ${nombre}`, mensaje(error), pista(mensaje(error)));
  }
}

console.log('\n· El portal del cliente');
try {
  const cliente = await pedir<{ id: string }>('POST', '/customers', {
    email: 'prueba@example.com',
    name: 'Prueba de la guía',
    metadata: { origen: 'probar-stripe' },
  });
  const url = await abrirPortal(config, cliente.id, `${origen}/?pago=portal`);
  bien('el portal abre');
  direcciones.push(['portal del cliente', url]);
} catch (error) {
  mal('el portal abre', mensaje(error), pista(mensaje(error)));
}

console.log('\n· Los avisos');
if (!config.secretoDeAvisos) {
  aviso('no hay STRIPE_WEBHOOK_SECRET: se podrá pagar, pero el servidor no se enterará de los pagos (paso 5).');
} else if (!config.secretoDeAvisos.startsWith('whsec_')) {
  mal('el secreto de avisos tiene buena forma', 'no empieza por whsec_', 'copia el «secreto de firma» del destino de eventos (paso 5).');
} else {
  bien('hay secreto de avisos (que sea el bueno solo se sabe cuando llega uno: paso 9)');
}

if (direcciones.length) {
  console.log('\nPara pagar de prueba, abre una de estas direcciones y usa la tarjeta 4242 4242 4242 4242,');
  console.log('cualquier fecha futura y cualquier CVC. No se cobra nada:\n');
  for (const [nombre, url] of direcciones) console.log(`  ${nombre}:\n  ${url}\n`);
}
if (fallos.length) {
  console.log(`\n${fallos.length} cosa(s) por arreglar antes de cobrar de verdad.`);
  process.exit(1);
}
console.log('\nStripe acepta todo lo que el taller le va a pedir.');
