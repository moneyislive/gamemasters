# Cobrar con Stripe, paso a paso

Lo que hay que hacer **fuera del código** para que el taller cobre. El código ya
está (`server/src/cobro/`, diseño en [VELADA-DE-PAGO.md](VELADA-DE-PAGO.md)); esto
es el panel de Stripe, las variables de Render y la prueba. Se hace dos veces:
primero en el **entorno de prueba** de Stripe, donde nada se cobra, y después en
**modo activo**, cuando ya funcionó todo.

Mientras `COBRO_ACTIVO` no diga `si`, nada de esto cambia la web: se pueden poner
las claves antes, sin prisa.

> Comprobado contra la documentación de Stripe el 25-sep-2026. Los menús de
> Stripe cambian de nombre de vez en cuando; los enlaces directos
> (`dashboard.stripe.com/...`) suelen seguir llevando al mismo sitio.

---

## 0. Antes de Stripe: poder vender

Stripe pide, para cobrar de verdad, quién vende: NIF, dirección y una cuenta
bancaria donde ingresar. Para vender a particulares hace falta estar dado de alta
como autónomo o tener una sociedad, y que el IVA de lo que se vende se declare.
Eso no lo resuelve Stripe ni esta guía: **pregúntaselo a un gestor** antes del
paso 10. Lleva estas dos preguntas concretas:

- Si hay que darse de alta en la **ventanilla única de la UE** (régimen OSS) por
  vender servicios digitales a particulares de otros países. Por debajo de
  10.000 € al año en ventas a otros países de la UE se puede cobrar el IVA
  español a todos; por encima, el de cada país.
- Qué **epígrafe** corresponde a vender servicios digitales por internet.

Los precios del taller ya llevan el IVA dentro (14,99 € es lo que paga la
persona, no 14,99 € + IVA).

## 1. La cuenta

1. Regístrate en [dashboard.stripe.com/register](https://dashboard.stripe.com/register).
2. Crea un **entorno de prueba** (*sandbox*) y entra en él: se elige en el
   selector de cuenta del panel. Todo lo de los pasos 2 a 9 se hace **primero
   ahí**.

Lo de un entorno de prueba y lo del modo activo **no se comparte**: claves,
precios, portal y avisos se configuran por separado en cada uno. Por eso el paso
10 repite casi todo.

## 2. Los datos públicos y los términos

En [dashboard.stripe.com/settings/public](https://dashboard.stripe.com/settings/public):

| Campo | Qué poner |
|---|---|
| Nombre público de la empresa | `GameMasters`, como en los términos (sale en la página de pago, en las facturas y en el extracto del banco) |
| Correo de asistencia | el de contacto de los términos (`LEGAL_CORREO`) |
| Sitio web | `https://harkania.onrender.com` |
| **Condiciones del servicio** | `https://harkania.onrender.com/terminos` |
| Política de privacidad | `https://harkania.onrender.com/privacidad` |

**Las condiciones del servicio son obligatorias.** El taller abre cada pago con
la casilla «acepto las condiciones» (`consent_collection`), y sin esa dirección
Stripe **se niega a abrir el pago**. La casilla es la prueba de que quien compra
aceptó los términos y, con ellos, la renuncia al desistimiento. Debajo del botón
de pagar sale además este aviso, que pone el código:

> Al pagar pides que el servicio empiece de inmediato y aceptas que, desde ese
> momento, pierdes el derecho de desistimiento.

En [dashboard.stripe.com/settings/branding](https://dashboard.stripe.com/settings/branding),
si quieres, el logo y los colores de la página de pago.

## 3. El plan de la suscripción

Lo único que se da de alta en el catálogo. Los créditos y el pase no hace falta
darlos de alta: el taller manda su nombre y su importe en cada pago.

1. **Catálogo de productos → Añadir producto**.
2. Nombre: `Suscripción de anfitrión`. Descripción:
   `2.000 créditos cada mes y el pase de la Sala de Arcade.`
3. Precio: **recurrente**, **14,99 EUR**, **cada mes**.
4. Si te pregunta por los impuestos: **incluidos en el precio**.
5. Guarda y copia el **id del precio**, que empieza por `price_…` (no el del
   producto, que empieza por `prod_…`). Va en `STRIPE_PRECIO_SUSCRIPCION`.

El importe tiene que coincidir con `COBRO_PRECIO_SUSCRIPCION=1499`: el taller
anuncia uno y Stripe cobra el otro. En Stripe un precio no se edita: si cambia,
se crea otro y se cambia el `price_…`. La prueba del paso 9 avisa si no coinciden.

## 4. El portal del cliente

Es la página de Stripe donde cada cual cancela su suscripción, cambia la tarjeta
y descarga sus facturas, sin escribirte. En
[dashboard.stripe.com/settings/billing/portal](https://dashboard.stripe.com/settings/billing/portal):

- **Facturas**: historial de facturas, activado.
- **Métodos de pago**: poder actualizarlos, activado.
- **Cancelaciones**: poder cancelar, activado, **al final del periodo de
  facturación** (no inmediata). Es lo que dicen los términos: sigue activa hasta
  el final del mes pagado y no se devuelve la parte que no se use.
- **Cambiar de plan**: desactivado. Solo hay un plan.
- Enlaces a las condiciones y a la privacidad: los mismos del paso 2.

Y **Guardar**. Sin configuración guardada, Stripe no abre el portal, y
el botón del taller falla.

## 5. Los avisos (webhooks)

Así se entera el servidor de que alguien pagó. Sin esto, la persona paga y los
créditos no le llegan.

1. **Workbench → Webhooks**
   ([dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)) →
   **Crear un destino de evento**.
2. **Tu cuenta**. Versión de la API: la que venga. El código lee las formas de
   antes y de después de 2025.
3. Tipo de datos: **instantánea** (*snapshot*), el de siempre. **No** «eventos
   ligeros» (*thin*): el servidor necesita el objeto entero dentro del aviso.
4. Estos cinco eventos, y solo estos:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Destino: **Punto de conexión de webhook**. URL:
   `https://harkania.onrender.com/api/cobro/aviso`
6. En la página del destino, **Revelar secreto**: el que empieza por `whsec_…`.
   Va en `STRIPE_WEBHOOK_SECRET`.

El servidor comprueba la firma de cada aviso con ese secreto y descarta lo que
no venga de Stripe, o lo que tenga más de cinco minutos. Contesta a Stripe
aunque no haga nada con el aviso: si Stripe no recibe respuesta, reintenta
durante tres días.

## 6. Las claves

En [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys), la
**clave secreta**: `sk_test_…` en el entorno de prueba, `sk_live_…` en modo
activo. Va en `STRIPE_SECRET_KEY`.

**La clave secreta cobra y devuelve dinero.** Va solo en las variables de Render
y en tu `.env` local. No la pegues en un chat, ni en un commit, ni en una captura.
La clave publicable (`pk_…`) no hace falta: aquí nadie escribe una tarjeta fuera
de la página de Stripe.

## 7. Las variables

| Variable | Valor |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` (luego `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` del paso 5 |
| `STRIPE_PRECIO_SUSCRIPCION` | `price_…` del paso 3 |
| `STRIPE_IMPUESTOS` | `no` hasta terminar el paso 8; luego `si` |
| `COBRO_ACTIVO` | `no` hasta el paso 10 |

Para probar en local, en un `.env` en la raíz de `GameMasters-cobro` (el mismo
que el de la carpeta principal más estas líneas). En producción, en Render:
servicio → **Environment**. Los importes y el margen (`COBRO_*`) ya tienen valor
por defecto en `render.yaml`.

## 8. El IVA: Stripe Tax

Stripe Tax calcula el IVA de cada país según dónde viva quien compra, y lo pone
en la factura. Cuesta un 0,5 % por transacción (plan básico). En
[dashboard.stripe.com/settings/tax](https://dashboard.stripe.com/settings/tax):

1. **Dirección de la sede**: la tuya (sale de los datos de la cuenta; revísala).
2. **Código fiscal por defecto**: `txcd_10000000` — *General - Electronically
   Supplied Services*. Los créditos, la suscripción y el pase son servicios
   prestados por vía electrónica.
3. **Comportamiento fiscal por defecto**: **Incluido** (o «Automático», que en
   euros es lo mismo). Así los precios del taller son precios finales.
4. **Registros** ([dashboard.stripe.com/tax/locations](https://dashboard.stripe.com/tax/locations)):
   **España**, y la **ventanilla única de la UE** si el gestor dice que te toca
   (paso 0). Sin registro, Stripe calcula 0 € de IVA en ese país.

Después, `STRIPE_IMPUESTOS=si`. Con eso el taller pide el cálculo automático y
Stripe recoge en la página de pago la dirección que necesita para calcularlo.

Stripe **calcula** el IVA, pero no lo declara ni lo ingresa en Hacienda: eso
sigue siendo cosa tuya (o del gestor). Sus informes sirven para preparar las
declaraciones.

## 9. La prueba

### 9a. Que Stripe acepte todo lo que el taller le va a pedir

Con las claves de **prueba** en el `.env` de `GameMasters-cobro`:

```bash
npm run probar:stripe -w server
```

Hace contra Stripe lo mismo que hará el taller, sin cobrar nada:

- comprueba que el plan existe, es mensual, va en euros y cuesta lo mismo que
  anuncia el taller;
- abre un pago de créditos, uno del pase y uno de la suscripción, con la casilla
  de los términos y el IVA;
- abre el portal del cliente.

Si algo falla, dice qué paso de esta guía falta. Si todo pasa, imprime las
direcciones de los tres pagos: ábrelas y paga con la tarjeta de prueba
**4242 4242 4242 4242**, cualquier fecha futura y cualquier CVC. Solo corre con
claves de prueba: con una `sk_live_…` se niega.

### 9b. Que los avisos lleguen al servidor

En local, con la [CLI de Stripe](https://docs.stripe.com/stripe-cli) instalada:

```bash
stripe login
```

```bash
stripe listen --forward-to localhost:5300/api/cobro/aviso
```

`stripe listen` imprime su propio `whsec_…`: ponlo en el `STRIPE_WEBHOOK_SECRET`
del `.env` local (no es el mismo que el del paso 5) y arranca el servidor de
`GameMasters-cobro` (entrada `cobro-servidor`, puerto 5300). Paga uno de los
enlaces del 9a: en el registro del servidor tiene que salir una línea
`[cobro] aviso checkout.session.completed (…): sin cuenta: ignorado`. «Sin
cuenta» es lo esperado, porque la prueba paga a nombre de una cuenta que no
existe. Lo que importa es que el aviso llegó y que la firma valió.

### 9c. Que una compra de verdad llegue al monedero

El 9a y el 9b prueban las piezas por separado. Con una cuenta de verdad se prueba
todo junto, y es lo primero que hay que hacer en el paso 10: compra la bolsa
pequeña (10 €) con una cuenta de Google que **no** esté en `GM_ADMITIDOS`, porque
las admitidas no pagan. Comprueba que los 1.000 créditos aparecen en el monedero
del taller y devuélvete el pago desde el panel de Stripe (**Pagos** → el pago →
**Reembolsar**). La prueba cuesta la comisión, que Stripe no devuelve. Y los
créditos se quedan en el monedero: una devolución hecha a mano en Stripe no los
quita, así que no la hagas con una cuenta que no sea tuya.

## 10. En marcha

Cuando el 9 pase entero:

1. En Stripe, sal del entorno de prueba (**modo activo**) y completa la
   activación de la cuenta: identidad, NIF, cuenta bancaria.
2. Repite en modo activo los pasos **2, 3, 4, 5 y 8**, comprobando cada uno. Lo
   configurado en el entorno de prueba no pasa solo al modo activo: el precio, el
   portal y el destino de los avisos son otros, con otros ids y otro secreto.
3. En Render, cambia las tres variables `STRIPE_*` por las de modo activo
   (`sk_live_…`, el `whsec_…` del destino en modo activo y el `price_…` en
   modo activo) y pon `STRIPE_IMPUESTOS=si`.
4. Y, por último, `COBRO_ACTIVO=si`. Con esto el taller **se abre a cualquier
   cuenta de Google**, y cada velada se cobra. La casa (contraseña) y las cuentas
   de `GM_ADMITIDOS` siguen sin pagar.
5. Haz la compra del **9c** con dinero de verdad y devuélvela.

Para apagarlo todo de golpe, basta con `COBRO_ACTIVO=no`: el taller vuelve a ser
solo para la casa y no se vende nada. El saldo de cada monedero se queda donde
estaba.

> El orden importa: Render **despliega solo** al empujar a `main`. Pon las
> variables en Render **antes** de fusionar la rama del cobro y deja
> `COBRO_ACTIVO` para el final, cuando el despliegue ya esté arriba y probado.

---

## Lo que cobra Stripe

Tarifas de Stripe para una cuenta en España, consultadas el 25-sep-2026:

| Concepto | Comisión |
|---|---|
| Tarjeta estándar del Espacio Económico Europeo | 1,5 % + 0,25 € |
| Tarjeta *premium* del EEE | 2,8 % + 0,25 € |
| Tarjeta del Reino Unido | 2,5 % + 0,25 € |
| Tarjeta internacional | 3,15 % + 0,25 € (+ 2 % si hay cambio de divisa) |
| Billing (la suscripción) | 0,7 % del importe |
| Stripe Tax (básico) | 0,5 % por transacción |
| Facturas de los pagos sueltos | 0,4 %, hasta 2 $ por factura |

La parte fija de 0,25 € pesa mucho en importes pequeños. En una suscripción de
14,99 € con tarjeta europea estándar, Stripe se queda unos 0,65 € (1,5 % + 0,7 %
+ 0,5 % + 0,25 €), un 4,4 %. En un pase de 4,99 € se queda unos 0,37 € (1,5 % +
0,4 % + 0,5 % + 0,25 €), más de un 7 %.
Por eso el precio mínimo de una velada es 3,99 € (`COBRO_PRECIO_MINIMO`) y las
bolsas empiezan en 10 €. El margen de 2,5 sobre el coste de la API
(`COBRO_MARGEN`) está calculado para cubrir el IVA, estas comisiones, el
servidor y el error de la estimación.

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| «No se pudo abrir el pago» en el taller | Falta la dirección de los términos (paso 2), o Stripe Tax a medias con `STRIPE_IMPUESTOS=si` (paso 8). `npm run probar:stripe -w server` dice cuál. |
| Pagó y no le llegaron los créditos | El aviso no llega o no se firma bien. En Workbench → Webhooks → el destino → **Entregas de eventos**: si sale error 400, el `whsec_…` de Render no es el de ese destino (cada modo tiene el suyo); si es 503, falta `STRIPE_WEBHOOK_SECRET`. Stripe reintenta durante tres días: al arreglarlo, llegan solos. |
| El botón del portal falla | El portal no está guardado en ese modo (paso 4). |
| Stripe cobra otro importe por la suscripción | El `price_…` no es de 14,99 € (paso 3). |
| Nadie ve precios en el taller | `COBRO_ACTIVO` no es `si`, o quien entra es la casa o una cuenta admitida, que no pagan. |
