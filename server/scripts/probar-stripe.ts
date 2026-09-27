/**
 * La pasarela contra Stripe DE VERDAD, en su entorno de prueba: no cobra nada.
 *
 *   npm run probar:stripe -w server
 *
 * Es el último paso de docs/GUIA-STRIPE.md antes de tocar dinero. Hace contra la
 * API de Stripe lo mismo que hará el taller y, si algo falla, dice qué falta:
 *
 *   1. que el plan de suscripción existe, es mensual, en euros, cuesta lo que se
 *      anuncia (COBRO_PRECIO_SUSCRIPCION) y lleva el IVA dentro; y, si vende
 *      Stripe (STRIPE_GESTIONADO=si), que su producto tiene el código fiscal;
 *   2. que Stripe acepta abrir los tres pagos —créditos, pase y suscripción— con
 *      las opciones con que los abre el taller: la casilla de los términos, el
 *      aviso del desistimiento y el IVA del camino elegido (Managed Payments o
 *      Stripe Tax). Las direcciones de los tres se imprimen, para pagarlas con la
 *      tarjeta de prueba 4242 4242 4242 4242;
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
const { configDePasarela, abrirPago, abrirPortal, comoFormulario, CODIGO_FISCAL } = await import('../src/cobro/pasarela');
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
  if (/managed.?payments|merchant of record/i.test(texto)) {
    return 'activa Managed Payments y acepta sus condiciones en dashboard.stripe.com/settings/managed-payments (paso 8A), o deja STRIPE_GESTIONADO=no.';
  }
  if (/tax.?code/i.test(texto)) {
    return `el producto necesita un código fiscal de la lista de Managed Payments: ${CODIGO_FISCAL.veladas} (paso 3).`;
  }
  if (/tax|head office|origin address/i.test(texto)) {
    return 'Stripe Tax no está listo: completa dashboard.stripe.com/settings/tax (paso 8B), o deja STRIPE_IMPUESTOS=no mientras pruebas.';
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
const conIva = config.gestionado || config.impuestosAutomaticos;

console.log(
  `\nQuién se encarga del IVA: ${
    config.gestionado
      ? 'Stripe, que vende como comerciante registrado (Managed Payments, paso 8A).'
      : config.impuestosAutomaticos
        ? 'Stripe Tax lo calcula y lo declaras tú (paso 8B).'
        : 'nadie en Stripe: el precio se cobra tal cual (STRIPE_GESTIONADO y STRIPE_IMPUESTOS en «no»).'
  }`,
);

/**
 * Si el precio no dice si lleva el IVA dentro, manda el ajuste por defecto de
 * los impuestos de la cuenta. `null` si no se puede leer.
 */
async function ivaDentroPorDefecto(): Promise<boolean | null> {
  try {
    const ajustes = await pedir<{ defaults?: { tax_behavior?: string | null } }>('GET', '/tax/settings');
    const comportamiento = ajustes.defaults?.tax_behavior;
    // «Según la moneda» mete el IVA dentro en todo lo que no sea dólares.
    return comportamiento === 'inclusive' || comportamiento === 'inferred_by_currency';
  } catch {
    return null;
  }
}

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
      product: { tax_code?: string | null } | string | null;
    }>('GET', `/prices/${encodeURIComponent(config.precioSuscripcion)}?${encodeURIComponent('expand[]')}=product`);
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
    if (conIva) {
      const dentro =
        precio.tax_behavior === 'inclusive' ? true : precio.tax_behavior === 'exclusive' ? false : await ivaDentroPorDefecto();
      if (dentro === true) bien('el IVA va dentro del precio');
      else if (dentro === false) {
        mal(
          'el IVA va dentro del precio',
          `el precio ${precio.tax_behavior === 'exclusive' ? 'es' : 'no lo dice, y el ajuste por defecto es'} «sin impuestos incluidos»: a ${euros(PRECIO_DE_LA_SUSCRIPCION)} se le SUMARÍA el IVA`,
          'crea el precio con los impuestos incluidos (paso 3), o pon «Incluido» por defecto en dashboard.stripe.com/settings/tax (paso 8).',
        );
      } else {
        aviso('el precio no dice si lleva el IVA dentro y no se pudo leer el ajuste por defecto: compruébalo en dashboard.stripe.com/settings/tax (paso 8).');
      }
    }
    if (config.gestionado) {
      const codigo = precio.product && typeof precio.product === 'object' ? precio.product.tax_code : undefined;
      if (codigo === CODIGO_FISCAL.veladas) bien(`y su producto lleva el código fiscal de las veladas (${codigo})`);
      else {
        mal(
          'el producto de la suscripción lleva su código fiscal',
          codigo ? `lleva ${codigo}` : 'no lleva ninguno',
          `ponle ${CODIGO_FISCAL.veladas} en el catálogo de productos (paso 3): sin un código de su lista, Managed Payments no lo vende.`,
        );
      }
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
