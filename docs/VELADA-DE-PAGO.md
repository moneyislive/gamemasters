# La velada de pago

Lo que hace falta para cobrar una velada sin que nadie pague por una mala noche.
Rama `velada-de-pago` (worktree `GameMasters-cobro`), sobre `botas-servidor`.

Cuatro piezas, en el orden en que dependen unas de otras:

1. **La revisión adversaria**: la trama no se entrega sin que alguien intente romperla.
2. **El modelo de la casa**: Opus 5.5, con el esfuerzo medido paso a paso.
3. **Papel o app**: se elige y se confirma antes de generar.
4. **El cobro**: créditos, presupuesto por velada, suscripción y pase de la Sala.

Todo lo que cobra está detrás de `COBRO_ACTIVO=no`. Hasta encenderlo, la plataforma
funciona como antes, con la revisión y el modelo nuevo ya dentro.

---

## 1. La revisión adversaria

### Lo que la motivó

Tres veladas de verdad, y lo que falló en cada una:

| Velada | Qué falló | Qué lo caza ahora |
|---|---|---|
| Casa Sabrón | El resumen que se leía al empezar nombraba tres veces a la asesina | Auditoría: `apertura-senala` · Detective: `filtracion-inicial` |
| Villa CASAS | Armas genéricas que no nombraba nadie | Auditoría: `objeto-sin-nombrar`, `objeto-sin-dueno` |
| Villa CASAS | Personajes demasiado secundarios | Auditoría: `personaje-secundario`, `dosier-flaco` |
| Villa CASAS | Una pista de la última ronda acusaba directamente a Cuchi | Auditoría: `pista-que-dicta` · Detective: `pista-que-lo-dice-todo` |
| (lo que pidió Miguel) | No arreglarlo escondiendo al culpable | Auditoría: `culpable-a-salvo` · Detective: `culpable-invisible` |

Y uno que no estaba en la lista: con siete personas el material podía pedir seis giros,
uno por inocente, y **el único sin sobre era el culpable** (`giros-delatores`). Ahora caben
como mucho `personas − 2`.

### Cómo funciona

```
trama ──► material ──► auditoría ──► detective ──► revisor ──► auditoría + detective ──► (2.ª pasada)
                        (código)     (sin la        (con la      (sobre lo corregido)
                                      solución)      solución)
```

- **La auditoría** (`plot/cluedo-auditoria.ts`) cuenta con código cuántas veces se nombra a
  cada persona en lo que la mesa oye al empezar, en los dosieres de los demás y en cada
  ronda; qué objeto no nombra nadie; qué sala no tiene pistas; qué dosier pesa más. No
  decide nada fino: le da números al revisor.
- **El detective** (`plot/cluedo-detective.ts`) NO conoce la solución. Lee lo que sabe la
  mesa antes de empezar y al cerrar cada ronda —una llamada por momento, en paralelo— y
  reparte la sospecha. Si acierta demasiado pronto, la trama se delata; si falla al final,
  no tiene solución; si le basta una pista, esa pista dicta. En modo app mide el
  conocimiento como lo desbloquea el móvil, ronda a ronda; en papel, entero desde el
  principio.
- **El revisor** (`plot/cluedo-revisor.ts`) conoce la solución, lee los dos informes y
  reescribe: personajes, pistas, cronología, sinopsis y material. En dos turnos —trama y
  luego material— porque el esquema entero no cabe en la gramática de la API.
- **Los parches** (`plot/cluedo-parches.ts`) deciden qué entra: nunca la solución, nunca
  algo más pobre que lo que había, nunca una sala o una ronda sin pistas.

El informe queda en `plot.revision`, se ve en Documentos con «Revisar de nuevo», y a
ciegas solo se enseña el veredicto. `verify:revision` (51 comprobaciones) reproduce los
fallos de arriba sin salir a la red.

### Lo que falta

- **La Momia, las Sombras y el Nudo** no tienen revisor todavía: se entregan con
  `veredicto: 'sin-revisar'`, que el taller enseña tal cual. El registro
  (`juegos/revisores.ts`) está listo para darlos de alta; cada uno necesita sus
  propias preguntas (en las Sombras, por ejemplo, que el traidor no tenga el sobre
  más gordo).
- **Medir la calidad**: la revisión se ha probado contra trampas sembradas y contra la
  API real (ver §2), pero no contra una batería de tramas juzgadas por personas. Lo
  siguiente sería guardar diez tramas reales anonimizadas con sus fallos anotados y
  medir cuántos caza.

---

## 2. El modelo de la casa y lo que cuesta

Opus 5.5 es el de la casa (`claude-opus-5-5`, 4 $/20 $ por millón). Fable 5.1 y Sonnet 5
se ofrecen en las opciones avanzadas; Opus 5, Fable 5 y Haiku se quedan para leer partidas
antiguas, y uno de ellos guardado como modelo global se ignora.

### Lo que enseñaron las pruebas contra la API

Una velada de siete personas inventadas, por el mismo camino que producción
(`scripts/revisar-trama-real.ts`, cuesta dinero de verdad):

| Intento | Qué pasó | Qué se cambió |
|---|---|---|
| 1 | `api_error` a los 3,5 min, a mitad de la trama: se perdió todo | Reintento ante fallos transitorios |
| 2 | A esfuerzo `high`, la trama agotó los 64.000 tokens a los 10,7 min (1,29 $ tirados) | Trama a `medium`, revisor a `high`; techo de salida a 128.000 |
| 3 | `ECONNRESET` a los 5,7 min, no reconocido como transitorio | El reintento mira la cadena de causas |
| 4 | *(ver abajo)* | |

**La lección para el producto**: una llamada de varios minutos se cae con frecuencia. Sin
reintentos y sin reembolso automático, eso se lo come el cliente.

### El presupuesto

`cobro/estimacion.ts` estima los tokens de cada paso y `cobro/tarifa.ts` los convierte a
dólares con la tarifa oficial. El gasto real de cada velada queda en `game.gasto.costeUsd`,
y es con lo que hay que recalibrar las constantes en cuanto haya veladas de verdad.

---

## 3. Papel o app

Antes de generar se abre una confirmación (`client/src/components/generate/ConfirmarVelada.tsx`):
cómo se va a jugar (recordando lo que se eligió), qué se va a escribir, el precio y el saldo,
y las opciones avanzadas plegadas. El botón dice el modo: «Generar para jugar en papel».

**Lo que el modo cambia y lo que no.** En CLUEDO la trama y su material los usan los dos
modos casi enteros (los dosieres en papel, el móvil en la app); lo único solo de papel es el
guion del GM, las acotaciones y la narración de apertura, y ninguno es caro. Así que el modo
no cambia lo que se escribe: cambia **lo que se usa en la partida**. Con app entra el
Mayordomo, que contesta con el modelo y hasta ahora no tenía ningún tope. Por eso:

- el precio con app lleva el Mayordomo (80 preguntas incluidas) y en papel no;
- pasar de app a papel es gratis; de papel a app se cobra la diferencia;
- el Mayordomo tiene ahora tope por velada (sin cobro, un freno de 200).

En la Momia, las Sombras y el Nudo sí hay campos solo de papel o solo de app (inscripciones,
disfraces, el guion…): ahí el modo podría recortar la generación. No está hecho.

---

## 4. El cobro

### El modelo

- **Créditos**: 100 créditos = 1 €. El saldo es la suma de un libro de movimientos
  (`cobro/monedero.ts`), idempotente por referencia de pago.
- **Velada suelta**: su presupuesto (coste × `COBRO_MARGEN`, redondeado a ,49/,99, mínimo
  3,99 €). Se cobra al generar; **se devuelve sola** si la generación falla o la revisión
  termina en `no-apta`. Trae incluidas una regeneración, tres actualizaciones, dos
  reescrituras del material, dos revisiones y sesenta turnos del asistente.
- **Suscripción de anfitrión**: 14,99 €/mes, 2.000 créditos al mes (unas tres veladas de siete
  personas en papel) y el pase de la Sala incluido. La bolsa del mes se gasta antes que lo
  comprado y caduca al renovar; lo comprado no.
- **Pase de la Sala**: 4,99 € por temporada (trimestre). Aspectos exclusivos para los
  aventureros: toda figura cuyo id empieza por `pase-` exige una cuenta con pase vigente.
  Solo estética.
- **La casa no paga**: quien entra con la contraseña, y las cuentas de `GM_ADMITIDOS`.

### Lo que hay que decidir antes de encenderlo

1. **La pasarela.** Está hecha contra Stripe (sin su SDK). La alternativa es un comerciante
   registrado (Paddle, Lemon Squeezy), que se encarga del IVA de cada país a cambio de una
   comisión más alta (≈5 % + 0,50 $ frente a ≈1,5 % + 0,25 € de Stripe). Vendiendo a
   particulares de toda la UE, con Stripe hay que darse de alta en la ventanilla única
   (OSS) y activar Stripe Tax.
2. **Los precios.** Los de arriba salen del coste medido y un margen de 2,5; se cambian
   desde el entorno sin desplegar.
3. **Los términos.** Hoy dicen que no se cobra nada. Hacen falta condiciones de compra y el
   desistimiento del contenido digital (art. 103.m TRLGDCU: pedir expresamente el
   servicio inmediato y saber que se pierde el desistimiento). La página de pago ya lo dice
   en el botón; los términos tienen que decirlo entero, y conviene que lo lea alguien que
   sepa de esto.
4. **Abrir el taller al público.** Hoy solo entran la casa y `GM_ADMITIDOS`. Abrirlo a
   cualquier cuenta tiene una trampa escrita en `taller/dueno.ts`: las partidas huérfanas
   dejan pasar a cualquiera, y con el taller abierto eso sería enseñar la solución de las
   partidas antiguas. Antes de abrirlo, las huérfanas tienen que quedar solo para la casa.

### Para encenderlo (cuando esté decidido)

1. Crear la cuenta de Stripe (en modo de prueba primero) y el plan mensual → `STRIPE_PRECIO_SUSCRIPCION`.
2. Dar de alta el punto de aviso `https://<dominio>/api/cobro/aviso` con los eventos
   `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`,
   `customer.subscription.updated` y `customer.subscription.deleted` → `STRIPE_WEBHOOK_SECRET`.
3. `STRIPE_SECRET_KEY` en Render.
4. Términos y privacidad al día (y Stripe en la lista de terceros de `verify:legal`).
5. `COBRO_ACTIVO=si`.

---

## 5. Lo que queda para el pase VIP

La regla del servidor está (`cobro/pase.ts`). Faltan:

- **El arte**: aspectos `pase-…` compilados desde los packs CC0 de KayKit (recoloreados con el
  color horneado, accesorios de las manos). `escenas/embarcadero/figuras.ts` tiene hoy una
  sola lista, y el sorteo de la primera vez elige de ella: los del pase tienen que ir en otra,
  o se le tocarían a quien no pagó.
- **Que la app mande la cuenta en el arcade**: hoy solo manda la llave del asiento. Con
  `X-GM-Cuenta` en las peticiones de figura basta.
- **El escritorio no tiene cuentas**, así que desde él no se puede demostrar el pase.
- **Qué pasa al caducar**: la figura se queda guardada en la cuenta y en las sillas; lo
  razonable es volver a la de serie la próxima vez que se siente.
