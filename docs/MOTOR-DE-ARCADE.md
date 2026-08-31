# El motor de la Sala de Arcade

**La segunda categoría de juegos: los que no tienen Game Master.**

Escrito el 31 de agosto de 2026, después de auditar los tres candidatos externos
que había sobre la mesa —ir-engine, boardgame.io y una tabla de siete
repositorios de juegos— más los backends de multijugador del mercado. Si algo de
aquí no coincide con el código, gana el código: corre `npm run verificar` y
créele a él.

Este documento es el hermano de [INFORME-ARQUITECTURA.md](INFORME-ARQUITECTURA.md),
que cuenta cómo se sacó CLUEDO de las entrañas del motor de veladas. Aquel
informe es la historia de una reingeniería; este existe para no tener que
escribir el segundo.

---

## 0. La regla innegociable: independencia total

**El motor de arcade es INDEPENDIENTE del motor de Game Master. No lo extiende, no
lo hereda, no lo configura y no comparte su contrato.** Son dos motores hermanos
que conviven en el mismo repositorio y en el mismo proceso de Node, y que no se
conocen.

Esto no es una preferencia de estilo. Es la única regla de la que dependen todas
las demás, y conviene decir exactamente qué prohíbe:

- **No se amplía `ManifiestoDeJuego`.** El manifiesto de arcade se escribe desde
  cero en `shared/arcade/tipos.ts`. No hereda, no extiende, no hace
  `Omit<ManifiestoDeJuego, …>`.
- **No se reutiliza `LiveSession`, ni `VistaJugador`, ni `Plot`, ni `LivePhase`,
  ni `AvisoClave`, ni ningún tipo de `shared/live.ts` o `shared/types.ts.**
  El arcade tiene su propio contrato y su propio vocabulario.
- **No se reutiliza el reductor de veladas.** `Reductor = (ctx) => unknown` muta
  la sesión, y lo que se muta no se reejecuta. Ver §5.2.
- **No se registra un arcade en `shared/juegos`.** Registro propio, anclado con
  su propio `Symbol.for`. Si un arcade entrara en `juegosInstalados()`,
  `app/src/vitrina.ts` lo pintaría en el carrusel de **veladas** de la portada,
  y para evitarlo alguien metería un `if (esArcade)` en `veladas()` — que es la
  primera de las cien banderas que acaban deshaciendo la separación.
- **`server/src/arcade/**` no importa `server/src/live/**`, `server/src/docs/**`
  ni `server/src/agent/**`, y al revés.**
- **`shared/arcade/**` no importa `shared/juegos/**`, y al revés.**

### Lo que sí se comparte, y por dónde

Lo común **sube a `mecanicas/`**, que es la capa que este repositorio ya inventó
y documentó en `shared/mecanicas/pistas.ts` con la definición exacta que hace
falta aquí:

> «Una mecánica es código que sirve a varios juegos, que ninguno tiene la
> obligación de usar, y que no sabe quién lo usa. Apuntarse es llamar a una
> función. No hay registro, ni herencia, ni configuración.»

Hoy esa capa tiene un solo inquilino en cada lado. Un segundo es lo que la
convierte en capa y no en excepción.

### Las dos únicas excepciones, y son nominales

Se admiten **dos**, porque son piezas de plataforma mal archivadas y no piezas de
velada:

| Fichero | Qué es | Por qué no es de veladas |
|---|---|---|
| `server/src/live/token.ts` | Credencial HMAC sin estado, con `exp` y `sid` | Es identidad, no juego. Su sitio natural es `server/src/identidad/`, que ya existe |
| `server/src/live/presencia.ts` | Presencia en memoria | Es infraestructura, y su cabecera ya razona por qué no toca la base |

**No se mueven hoy.** Mover `token.ts` es un diff dentro de veladas y hay otra
sesión trabajando en el mismo árbol. Se importan tal cual, y la excepción se
escribe como **lista literal de dos rutas dentro de `verificar-fronteras.ts`**,
de modo que añadir una tercera exige editar el comprobador — un acto visible en
el diff y no un import que se cuela.

### Por qué la independencia y no la generalización

La tentación es evidente: el motor de veladas ya está muy generalizado. El
manifiesto es dato, `LivePhase` es cadena libre, la plataforma pregunta por el
**papel** de la fase en vez de por su nombre, y `verify:ajeno` demuestra con «La
Almoneda» que entra un juego sin ejes, sin lugares, sin pistas, sin víctima y
sin personajes.

Pero ese trabajo generalizó **la velada**, no el producto. El eje que sigue
clavado no es CLUEDO: es el **Game Master**. Tres piezas del núcleo lo hacen
estructural:

1. `vistaDeJugador` empieza con `if (!plot) return null`: sin trama generada por
   IA no hay pantalla.
2. La sesión nace copiando `personasDe(game)` a sillas con `joinCode`: nadie
   puede jugar si un humano no dio de alta su entidad antes.
3. Todo el ciclo de fases lo abre `server/src/routes/live.ts`, que va detrás de
   `requireAuth` del taller.

Un arcade no tiene ninguna de las tres cosas. Generalizar el motor de veladas
para que las tres sean opcionales significa convertir tres supuestos
estructurales en tres banderas, y una bandera que apaga medio motor es un motor
con dos modos: el que se probó y el que no.

---

## 1. El veredicto

**Motor propio, hermano y no heredero**, cuyo centro es un reductor puro sobre
estado opaco que vive en `shared/` y que importan **el mismo fichero** el móvil y
el servidor.

```ts
avanzar(estado: unknown, movimiento: Movimiento, ctx: Contexto): unknown
```

La regla que ordena todo el árbol cabe en una línea:

> **`shared/` son las reglas. `server/` es la autoridad.**

Y la decisión más importante es una **sustracción**, no una adición: **el motor
no tiene ninguna opinión sobre el turno.** De quién es el turno es un campo del
estado del juego. En cuanto se acepta eso, media docena de conceptos que parecían
obligatorios —jugadores activos, subfases, orden de turno, recursos, trueque,
zonas de visibilidad— *desaparecen* en vez de generalizarse.

Eso no es minimalismo estético. Nombrar esos conceptos en el núcleo sería
reconstruir el problema de CLUEDO con vocabulario de tablero, porque son
exactamente la forma del primer juego rico que se escriba.

### Los cuatro juegos-prueba

Todo lo que sigue se justifica contra estos cuatro, y ninguno es negociable:

| Nombre | Qué es | Qué rompe |
|---|---|---|
| **La Frente** | El móvil enseña un nombre, te lo pones en la frente | Un solo dispositivo, sin red, sin cuenta, sin asientos registrados, reloj de pared, entrada por acelerómetro |
| **La Ronda** | Fiesta en línea por turnos, cuatro personas, mano oculta | Mesa sin Game Master, asientos anónimos, información oculta |
| **El Arcade** | 60 fps, un jugador, con marcador | Sin turnos, bucle de fotogramas, marcador que hay que verificar |
| **Riberas** | Tablero hexagonal propio, 2–6, comercio | Identidades derivadas, negociación entre dos de los cuales uno no tiene el turno |

---

## 2. Por qué no se adopta ninguno de los candidatos

### 2.1 ir-engine — descartado

Tres bloqueos independientes, y cualquiera basta por sí solo.

**Legal.** La licencia es CPAL-1.0, y no tiene el hueco SaaS que sí tiene la GPL:
su Sección 15 («External Deployment») dice que servir el software por red cuenta
como distribuir, y obliga a publicar el código. Desplegar la Sala de Arcade en
Render obligaría a publicar GameMasters. La Sección 14 exige además mostrar
«Powered by Infinite Reality Engine» con su logotipo en cada arranque, dentro del
producto propio.

**Técnico.** Ni siquiera funciona la vía «me llevo solo el ECS»: arrastra
`@ir-engine/hyperflux`, que fija `react 18.2.0` y `react-reconciler 0.29.0` —un
reconciliador atado a las tripas de React 18— mientras la app va con React
19.2.3. Habría que forkear y mantener un reconciliador ajeno. Y su cliente es
Vite + react-dom: cero React Native, o sea que no entra en Expo, que es
justamente donde tiene que vivir esto.

**Operativo.** `mediasoup` necesita un rango de puertos UDP; Render reenvía a un
único puerto HTTP por servicio. Adoptarlo significa abandonar Render por
Kubernetes.

**Y sobre todo: resuelve otro problema.** Es un motor de mundos espaciales
sociales persistentes con avatares, voz y vídeo. Para La Frente es
infraestructura mil veces sobredimensionada; y para el extremo 3D, la app ya trae
`@react-three/fiber` 9.7 y three 0.185, más al día que el three 0.176 de
ir-engine.

> **Aviso de diligencia.** El repositorio **no** está archivado, no hay ningún
> anuncio de discontinuación y el README sigue con instrucciones de instalación
> normales. Una revisión superficial concluye «proyecto vivo». La parada solo se
> ve mirando fechas de commit —el último push de todo el org es del 17 de julio
> de 2025— y resolviendo los dominios: `docs.ir.world`, al que el propio org
> sigue apuntando, ya no existe.

### 2.2 boardgame.io — copiar el modelo, no la dependencia

La licencia es MIT limpia y el modelo conceptual es excelente. El problema es el
artefacto.

**El bloqueo duro.** `import { Server } from 'boardgame.io/server'` en un módulo
ESM con Node 20 falla con `ERR_UNSUPPORTED_DIR_IMPORT`: la 0.50.2 —única versión
publicada desde noviembre de 2022— no trae mapa `exports`, y la resolución por
directorio vía `main` es un comportamiento solo-CJS. **Y `tsx` lo tapa**: el
mismo import bajo `npx tsx` imprime «OK».

Como `server/` se ejecuta con `tsx` en desarrollo y se empaqueta con
`esbuild --packages=external` —que deja el especificador desnudo intacto—, esto
sería exactamente el patrón de fallo que este repositorio ya tiene apuntado:
**verde en proceso, roto al levantar el servidor.**

**En el móvil no va mejor.** Metro resuelve por `main`, o sea el build CJS, que
no se puede sacudir: el bundle pasa de los 57 KB anunciados a 199 KB, y a 351 KB
con multijugador, con unos 250 KB de panel de depuración escrito en Svelte
—`document.createElementNS` incluido— viajando dentro de la app. Y el punto de
entrada `boardgame.io/react-native` tiene los **tipos rotos**: su `.d.ts` apunta
a un fichero que no existe, y con el `skipLibCheck` habitual el cliente degrada a
`any` en silencio.

#### Lo que sí se le roba

El vocabulario, que es la respuesta madura al mismo problema y valida el
precedente que ya existe en `shared/juegos/tipos.ts`:

- **La dupla estado-del-juego / metadatos-de-flujo.** El estado lo posee el
  juego; el motor solo posee lo suyo. Ese reparto es lo que impide que el motor
  se contamine de un juego concreto.
- **Azar sembrado cuyo estado vive en el servidor**, inyectado en el movimiento
  en vez de `Math.random()`. Es lo que hace los movimientos puros y
  reproducibles.
- **`playerView` como proyección declarativa por jugador.** Es lo que ya hace
  `proyecciones.ts`, y confirma el diseño.
- **`stateID` como control de concurrencia optimista**: rechazar acciones de
  clientes con estado rancio. Aquí se llama `rev`.
- **Resincronización por estado completo al reconectar.** Es el mismísimo
  razonamiento de `hub.ts` («si se pierde un aviso, la siguiente petición trae el
  estado completo»), lo cual significa que el modelo **ya es compatible con el
  sondeo de hoy** y no exige WebSocket.

#### Y lo que NO se le roba, que es igual de importante

El propio boardgame.io tiene la enfermedad que aquí se quiere evitar, en tres
sitios concretos, y merece la pena tenerlos delante:

1. `PluginPlayer`, su plugin **oficial** de estado por jugador, expone
   `ctx.player.opponent`, documentado como «si es un juego de dos jugadores, el
   registro del oponente está disponible». Dos asientos cableados dentro de la
   pieza que se vende como genérica. En un juego de fiesta de ocho, «oponente» no
   significa nada.
2. En su capa de autoridad hay escrito: «solo permitir deshacer/rehacer si hay
   exactamente un jugador que pueda mover ahora mismo». Es una **regla de juego**
   cableada en el árbitro, no una política que el juego declare.
3. `PlayerView.STRIP_SECRETS` privilegia dos nombres mágicos de clave, `secret` y
   `players`: para aprovechar la primitiva hay que llamar a tus cosas como las
   llamaba el primer juego.

Y por debajo, **todo el modelo es de asientos**: que el orden de turno sea
enchufable no cambia que *haya* turnos y asientos. La Frente y El Arcade tendrían
que fingirlos — que es literalmente lo que `shared/live.ts` ya documenta como el
fallo de la unión cerrada: «el que no venía, fingía».

### 2.3 La tabla de repositorios — dos licencias mal

Se abrieron los siete, uno por uno. Existen todos y la tabla es mayoritariamente
cierta en lo técnico, pero:

| Repo | Lo que decía la tabla | Lo que es |
|---|---|---|
| `Viral-Doshi/catan` | MIT | **NOASSERTION**. El LICENSE añade un descargo de proyecto fan tras el texto estándar; el texto base sí es MIT, pero un auditor automático lo marca |
| `terraforming-mars` | GPLv3 + assets CC BY-SA dentro | GPLv3, y los assets viven en **otro repositorio**, con una estrella y sin tocarse desde 2023 |
| Flash Point | React + Redux + Firebase, MIT | Cierto, pero **sin un commit desde el 24 de agosto de 2017** y con copyright de una academia, no de sus autores |
| `itaylayzer/Monopoly` | React + TS + PeerJS, MIT | Cierto — y PeerJS es **P2P sin servidor autoritativo**, lo contrario del modelo que este proyecto ya tiene |
| `gemline` | Arquitectura impresionante, MIT | Cierto, y tiene **cero estrellas y cero forks**: es el portafolio de una persona, creado en mayo de 2026 |

El único con masa crítica real es Terraforming Mars, y su valor es como
**precedente**: su `ModuleManifest` por expansión es la prueba, a ocho años y 945
estrellas, de que la separación manifiesto-dato / registro-código escala. O sea,
el patrón que este repositorio ya usa.

De gemline sí merece la pena robar una idea concreta: *motor de reglas puro sin
E/S + diario de eventos como verdad + cliente que detecta huecos de secuencia y
se pone al día*. Es la generalización natural de `hub.ts`.

### 2.4 Alquilar el motor es hoy un riesgo demostrado

**Hathora** anunció su cierre el 4 de marzo de 2026 y apagó la plataforma el 5 de
mayo. **Unity Multiplay** cerró el 31 de marzo de 2026. Dos de los backends de
partidas más citados murieron este mismo año llevándose por delante juegos en
producción. A diferencia de las veladas, donde el servidor es nuestro, aquí un
cierre apagaría los juegos.

**Rune / Dusk** es exactamente el modelo conceptual que se busca —lógica pura y
determinista compartida por cliente y servidor, con predicción optimista— y es
jurídicamente inadoptable: su bundle lleva cabecera «All rights reserved…
proprietary», prohíbe obras derivadas, no permite auto-hospedaje, y corre dentro
de la app de Rune. **Se copia el modelo público documentado, nunca su código.**

**Colyseus** (MIT, `@colyseus/core` 0.18.10 del 28 de agosto de 2026) queda como
**opción reservada** para implementar el canal continuo: se auto-hospeda sobre el
Express que ya hay y documenta el mismo modelo. Dos condiciones previas
innegociables cuando llegue el momento: una prueba de concepto **real** sobre
Expo SDK 57 / RN 0.86 / Hermes en build de producción —su documentación actual ya
no tiene página de React Native— y **no** adoptar `@colyseus/schema` como formato
del estado, que sería un segundo sistema de tipos compitiendo con el contrato de
`shared/`.

Descartados también: **Playroom Kit** (propietario, exige `react-dom`, autoridad
en el dispositivo de un jugador), **Nakama** (Go + PostgreSQL, no cabe en el
servicio único de Render), **Croquet/Multisynq** (sin autoridad de servidor, y su
red de producción es un DePIN con token) y **PartyKit** (absorbido por
Cloudflare; Durable Objects, no Node, y no es un motor).

---

## 3. El árbol

```
shared/arcade/
  tipos.ts        El manifiesto. Escrito desde cero: NO hereda de
                  ManifiestoDeJuego, que exige asistente, dosier, documentos
                  y categorías con mínimos. Once campos. DOS ejes:
                  `sede` y `tickHz`. Nada más.
  motor.ts        avanzar(estado, movimiento, ctx) => estado. Puro.
                  No importa NADA de node:, ni Express, ni Mongoose, ni React.
  movimiento.ts   { tipo, carga?: unknown } — carga LIBRE, no formulario.
  proyeccion.ts   Firma y registro. Sin implementación por defecto, a propósito.
  reloj.ts        El tiempo como número de tic. Los plazos vencen ENTRANDO
                  por el reductor, nunca como un setTimeout del servidor.
  index.ts        Registro propio: Symbol.for('gamemasters.arcade.instalados').
                  SEPARADO del de veladas.
  juegos/         frente.ts · ronda.ts · arcade.ts · riberas.ts
                  Manifiesto + reductor + proyección de cada uno, en shared/
                  SIEMPRE, incluso los que hoy solo corren en el servidor.

shared/mecanicas/       (junto a pistas.ts, que ya está)
  azar.ts               Semilla y contador DENTRO del estado, para rebobinar.
  mazo.ts               Barajas versionadas. Llega con la SEGUNDA baraja.
  malla-hexagonal.ts    Canonicalización de vértices y aristas. No antes de su fase.

server/src/canal/       NUEVO, hermano de live/ y arcade/
  index.ts        Los CINCO verbos que hub.ts ya expone de hecho:
                  esperarCambio · avisarCambio · anunciar · avisosDesde · olvidar
  sondeo.ts       Adaptador de diez líneas sobre hub.ts, SIN TOCARLO.
  continuo.ts     Más adelante, y solo si un juego lo pide.

server/src/arcade/
  arbitro.ts      Valida QUIÉN y CUÁNDO, y luego llama a avanzar() de shared/.
                  No duplica ni una regla.
  mesas.ts        Una mesa nace de un código que genera el PRIMER JUGADOR,
                  no de personasDe(game) copiado por un Game Master.
  enchufe.ts      Calcado de juegos/enchufe.ts, con la misma advertencia: no aísla.
  marcadores.ts · repeticiones.ts · presupuesto.ts · instalados.ts

server/src/routes/arcade.ts    Montado junto a jugarRouter (index.ts:219),
                               o sea DELANTE de requireAuth (index.ts:227).

app/app/(arcade)/   Grupo hermano de (juego)/, con Record<MuebleDeArcade, true>
                    exhaustivo: si falta un mueble, no compila.
app/src/arcade/     local.ts · bucle.ts · entrada.ts · muebles.ts
app/src/vitrina.ts  minijuegos() deja de devolver [] (línea 187) y lee del registro.
```

### Por qué la carpeta del transporte se llama `canal/` y no `reparto/`

En este repositorio «reparto» ya significa **qué juegos están instalados**, y
está anclado en tres sitios: el comprobador `verify:reparto` («un servidor con
otro reparto de juegos, sin recompilar nada»), el
`Symbol.for('gamemasters.juegos.reparto')` de `shared/juegos/index.ts` y el
filtro de instalados. Un mismo término significando dos cosas incompatibles en el
mismo árbol es deuda de vocabulario en un proyecto cuya disciplina entera es que
las palabras signifiquen una cosa.

---

## 4. El manifiesto: once campos y dos ejes

```ts
id · nombre · gancho · icono          // identidad
jugadores { minimo, maximo }
sede: 'dispositivo' | 'servidor'      // EJE 1: quién ejecuta el reductor
tickHz: number                        // EJE 2: 0 = sin reloj, y es legítimo
mueble: MuebleDeArcade                // unión CERRADA
secretos: boolean                     // si es true, la proyección es obligatoria
marcador?: … 
procedencia: ProcedenciaDeArcade      // unión CERRADA, obligatoria
```

**Solo dos ejes, y el resto se deriva.** La mesa, los asientos, el transporte y la
exigencia de reejecutabilidad salen de `sede` y de la existencia de `marcador`.

> **La regla que evita el deslizamiento: lo que un programador pueda poner mal,
> se DERIVA, no se declara.** Ni un campo del manifiesto que alguien pueda poner
> a `false` para que un comprobador se ponga verde. Por eso no hay
> `deterministaExigido` y no hay `transporte`: una bandera que exime de un
> comprobador es una bandera que se pone a `false` el día que el comprobador se
> pone rojo.

---

## 5. El vocabulario: los ocho del núcleo

Ningún concepto entra porque suene general. Entra porque hay un juego-prueba que
sin él no se puede escribir, y eso queda escrito en su ficha.

### 5.1 Estado opaco

Hoy el reductor recibe `LiveSession`: un tipo con `players`, `round`, `phase`,
`turnoDe`. Forma de velada. Con estado opaco, el comercio de Riberas es un campo
del estado y tres tipos de movimiento; los recursos son un objeto; la carretera
más larga es una función del juego. **El motor no necesita nombrar ninguno de los
tres y por tanto no puede quedarse corto en ninguno.**

*Lo obligan los cuatro.*

### 5.2 Reductor puro

El contrato actual —`Reductor = (ctx: ContextoAccion) => unknown`— **muta la
sesión**. Un reductor que muta no se puede reejecutar, y sin reejecución no hay
verificación de marcador, ni reproducción de partida, ni autoridad barata de
servidor, ni predicción futura.

Que viva en `shared/` y no en `server/` no es orden: es **la condición** para que
el mismo fichero corra en Hermes y en Node.

*Lo obligan los cuatro.*

### 5.3 Movimiento con carga libre

El vocabulario de acciones de las veladas —`eligeDe`, `eligeVarias`,
`eligeOpcional`, `eligeLibre`, `pideNumero`, `vecesPorTurno`— es un vocabulario
de **formulario**: elegir de una lista dada de alta y escribir un número. No sabe
expresar una inclinación de acelerómetro, un toque en el instante *t*, ni el
identificador canónico de un vértice que ningún humano registró. Y
`vecesPorTurno` presupone que existe el turno.

Heredarlo «porque ya es agnóstico» —y lo es, para juegos de formulario— dejaría
el motor a medida de la primera familia que se implemente.

*Lo obligan El Arcade y Riberas.*

### 5.4 El tic como un movimiento más

Hoy nada avanza solo: las fases las cierra quien dirige. Un reloj de servidor por
fuera del reductor resolvería el síntoma y rompería la reproducibilidad recién
comprada. Entrando por la misma puerta que todo lo demás, el bucle de fotogramas,
la cuenta atrás y la caducidad de una oferta son el mismo mecanismo a distinta
frecuencia.

*Lo obligan La Frente (los sesenta segundos SON la regla) y El Arcade. Riberas no
lo necesita, y por eso `tickHz: 0` tiene que ser un valor legítimo y no un caso
especial.*

### 5.5 Azar sembrado

`Math.random()` dentro de un reductor rompe la pureza, impide repetir una partida
y, si vive en el cliente, es trampa pura. La semilla y el contador viajan como
parte del estado para poder rebobinar, y **desaparecen en la proyección** para
que nadie prediga la siguiente carta.

Sube a `shared/mecanicas/` y no al núcleo del arcade porque una velada con dados
lo querría igual.

*Lo obligan los cuatro.*

### 5.6 `sede`: dispositivo o servidor

Es el eje que el motor de veladas no tiene y el que de verdad estaba clavado.
Allí todo el ciclo lo abre `routes/live.ts` detrás de `requireAuth`, y
`vistaDeJugador` empieza con `if (!plot) return null`. Que la sede sea dato es lo
que permite que el mismo reductor corra en el móvil o en Render sin que el juego
se entere.

*Lo obligan La Frente y Riberas. Son los dos extremos y ninguno es negociable.*

### 5.7 Asiento ≠ participante

`ejecutarAccion` exige hoy que quien actúa esté en `sesion.players`, y la sesión
nace copiando las entidades que un humano dio de alta en el taller. En La Frente
los jugadores no están registrados, no tienen móvil propio y a veces ni se
cuentan: hay **un aparato que pasa de mano en mano**. Un asiento es un nombre
tecleado, sin cuenta, sin correo y sin obligaciones de datos personales.

*Lo obliga La Frente.*

### 5.8 Proyección obligatoria

Si el manifiesto declara `secretos: true` y no hay proyección registrada, **el
arranque falla**. Un fallo mudo —un juego que filtra el mazo y nadie ve un
error— se convierte en una negativa ruidosa a arrancar, que es lo que ya hace el
registro de veladas con las altas perdidas.

No se deriva de unas «zonas» declaradas en el manifiesto: eso obligaría al motor
a interpretar la forma del estado, y contradice la opacidad de la que cuelga todo
el diseño.

La doctrina correcta ya está escrita en `server/src/live/proyeccion.ts`: «aquí no
se oculta nada en el cliente: sencillamente no se envía».

*Lo obligan La Ronda y Riberas. Y La Frente al revés, que es lo que lo hace un
concepto de plataforma y no de tablero: quien lleva el móvil en la frente es el
único que NO puede ver la palabra.*

### Y once más, que llegan cuando llega su juego

Fin como función del estado · revisión (`rev`) y rechazo de movimientos rancios ·
opciones calculadas · repetición verificable · reejecutabilidad entre motores de
JS · presupuesto por movimiento · procedencia · mueble · entrada como concepto ·
mazo · malla hexagonal.

**Ninguno se escribe antes de su fase**, y tres de ellos los pide un solo juego —
cosa que queda dicha en su ficha, para que nadie los ascienda a genéricos por
costumbre.

---

## 6. El transporte

**El sondeo largo se queda y no se toca.** Las tres razones escritas en la
cabecera de `hub.ts` siguen sirviendo. Un matiz que conviene corregir de esa
cabecera: la razón número uno envejeció a medias — React Native **sí** trae
WebSocket nativo; lo que no trae fiable es `EventSource`, o sea SSE. **La razón
que hay que conservar con las dos manos es la tercera:** la corrección no depende
del reparto, porque si se pierde un aviso la siguiente petición trae el estado
completo.

| Clase de juego | Transporte | Autoridad | Técnica |
|---|---|---|---|
| Fiesta en un dispositivo | ninguno | el propio aparato | Reductor puro sobre estado local. Sin `rev`, sin hub, sin cuenta |
| Tablero por turnos, 2–6 | sondeo actual | servidor | Diario de acciones validadas + reductor + proyección por jugador |
| Fiesta en línea por rondas | sondeo actual | servidor | Igual, más reloj de ronda del servidor: el plazo va en el estado como instante absoluto |
| Arcade de un jugador | HTTP normal | cliente simula, servidor **verifica** | Se sube la repetición (semilla + entradas); el servidor la reejecuta |
| Tiempo real 5–15 Hz | canal continuo | servidor a tick fijo | Predicción + reconciliación, interpolación para los demás |
| Arcade competitivo 30–60 Hz | canal continuo | simulación replicada | Predicción con rebobinado |

**El punto de ruptura no es la latencia: es la frecuencia.** El sondeo largo deja
de valer alrededor de dos a cinco cambios por segundo, porque cada cambio cuesta
un ciclo petición/respuesta completo. Un arcade a 30–60 Hz es una petición cada
16–33 ms por cliente: no es un ajuste, es otra cosa. **Y ninguno de los cuatro
juegos-prueba lo pide.**

**La regla que protege la arquitectura el día que llegue el segundo canal:** un
canal rápido es un **timbre más rápido**, nunca un protocolo distinto. Sigue
viajando `rev`, sigue existiendo «dame el estado desde la revisión N». La prueba
de que no hay dos arquitecturas es que se pueda **degradar de continuo a sondeo
en caliente** sin que el juego se entere.

### Tres límites preexistentes, dichos antes de que se le eche la culpa al motor nuevo

1. Ni el sondeo de hoy ni el canal de mañana **escalan a dos instancias**:
   `esperas` y `avisos` son `Map` de ámbito de módulo, o sea memoria del proceso.
   Con dos instancias en Render, dos jugadores de la misma mesa caen en procesos
   distintos y dejan de verse. El arcade multiplicará las partidas simultáneas y
   lo hará aflorar.
2. Cada despliegue de Render cierra todas las conexiones al reemplazar la
   instancia. Con sondeo duele mucho menos, lo cual es un argumento real para
   retrasar el canal continuo.
3. Las mesas de arcade **no heredan el patrón de `mutar`** (candado + lectura y
   escritura completa por acción): correcto a ritmo de velada, seis lecturas y
   seis escrituras por segundo en una mesa de seis. Almacén en memoria con
   persistencia diferida. El repositorio ya diagnosticó esta clase de problema
   una vez en `presencia.ts`.

---

## 7. El pintado: cuatro muebles

El mueble es un **dato del manifiesto**, nunca una elección del motor: si la capa
de pintado se decide dentro del motor, el motor sale a medida del primer
minijuego.

### Genéricos — los pinta la plataforma, y son los únicos que un arcade de FUERA puede usar

- **`formulario`** — Vistas de React Native. Botones, listas, cantidades, un
  cronómetro grande. Coste cero. Aquí van La Frente y La Ronda.
- **`tablero`** — `react-native-svg` (ya instalado, 15.15.4) sobre una topología
  declarada. El tablero es dato, no reductor. Llega con Riberas.

### Propios — los pinta el juego, están en el binario y cuestan publicación

- **`lienzo`** — Empieza en Vistas + Reanimated 4.5.1, que ya demuestra en
  producción en `app/src/carrusel3d.tsx` que se anima en el hilo de interfaz. Se
  cambia a Skia el día que exista El Arcade de verdad, **dentro del mueble**: ni
  el núcleo ni ningún juego se enteran.
- **`escena`** — Tres dimensiones, única y exclusivamente a través de
  `app/src/tres/Lienzo.tsx` y `Lienzo.native.tsx`. **Ningún arcade importa
  `three` ni `@react-three/fiber` directamente.**

### La consecuencia, que es la decisión de producto más cara del encargo

**El enchufe alcanza a las reglas, no a los píxeles.** Un arcade de fuera
registra manifiesto, reductor, proyección y puntuación, y se pinta con un mueble
genérico. Si quiere sus propios píxeles, tiene que estar en el binario.

La alternativa —un lenguaje de escenas declarativo lo bastante rico para expresar
un arcade de 60 fps— es un intérprete, con peor rendimiento y peor depuración, y
saldría a medida del primer juego que lo usara: el error de CLUEDO con otro
disfraz. Y la válvula de escape ya existe sin arquitectura nueva: la app exporta
a web y Render sirve web y API en el mismo servicio, así que un juego que no cabe
en el binario **es jugable en la web sin pasar por la tienda**.

### Deudas apuntadas para no olvidarlas

- **Congelar `@react-three/fiber` en 9.7 y no subir.** La v10 ha sacado React
  Native del núcleo —ya no exporta `./native`— y el repo sucesor oficial dice por
  escrito que hay problemas de rendimiento significativos con ExpoGL y que no se
  use todavía. `react-native-webgpu` es el relevo real y está vivo, pero obliga a
  salir de Expo Go, a parchear `node_modules` a mano y no tiene implementación
  web. Se vigila cada trimestre y entra cuando exista un `@react-three/native`
  publicado en npm.
- **Skia se paga en la fase de El Arcade, no antes.** Cuesta unos 4 MB en Android
  y 6 MB en iOS **para todos los usuarios**, incluidos los que solo juegan
  veladas. Ni La Frente, ni La Ronda, ni Riberas lo necesitan.
- **Cuando entre Skia:** `app/app.json` declara `baseUrl: "/jugar"`, así que el
  `locateFile` por defecto de CanvasKit pediría `/canvaskit.wasm` y daría 404 en
  Render — con el síntoma de una pantalla en blanco sin error legible. Es el
  mismo patrón de fallo mudo que ya se parcheó en `texturas-nativas.ts`. Merece
  su propio comprobador.
- **Declarar `expo-asset` y `expo-file-system` en `app/package.json`**: son peers
  de r3f y hoy llegan de rebote.
- **Probar la escena del avatar en un iPhone físico** antes de prometer 3D en
  producción: la documentación de r3f advierte de cierres `EXC_BAD_ACCESS` en
  simulador, y el propio comentario de `escena-avatar.tsx` admite que esa prueba
  seguía pendiente.
- **Fijar por escrito el suelo de dispositivo antes de dibujar el primer
  sprite.** El abanico entre un móvil barato y uno de gama alta ronda las
  cincuenta veces en número de sprites sostenibles.

---

## 8. Lo legal

Las **reglas y mecánicas** de un juego de mesa no son objeto de copyright ni de
patente: lo dicen la Oficina de Copyright de EEUU, el art. 4.4 de la Ley 24/2015
de Patentes, el art. 52(2)(c) del Convenio de la Patente Europea, y el TJUE en
*SAS v. World Programming*. Y los tribunales lo han aplicado a juegos concretos:
en *DaVinci v. Ziko* el juzgado dijo que las habilidades especiales de los
personajes son «un subconjunto de las reglas» y no son protegibles.

Lo que **sí** está protegido es la expresión — nombre, marca, arte, textos de
cartas, personajes — y *Tetris Holding v. Xio* es la sentencia que hundió a un
clon que copió las reglas legítimamente pero también el aspecto.

> ### Riesgo ya vivo, antes de la Sala de Arcade
>
> `shared/juegos/cluedo.ts:103` declara `nombre: 'CLUEDO'`, que es marca de
> Hasbro, y el encargo del asistente dice «al estilo CLUEDO». El identificador
> interno `id: 'cluedo'` puede quedarse si no lo ve nadie, pero **el nombre
> visible debe desaparecer** de la portada, de la ficha de tienda y de los
> dosieres imprimibles. La mecánica de deducción es libre —la patente de Pratt
> caducó en los años sesenta—; el nombre no.

### Las reglas que se convierten en código

- **`procedencia` es un campo del manifiesto**, unión cerrada, obligatoria para
  arrancar: `'dominio-publico' | 'mecanica-generica' | 'creacion-propia' |
  'licenciado'`. Cuesta un campo ahora, con `minijuegos()` devolviendo `[]`;
  después es una migración con la tienda de por medio.
- **El enchufe RECHAZA, no avisa**, cualquier módulo externo con licencia GPL o
  AGPL. Se carga en el mismo proceso, y la sección 13 de la AGPL obliga a ofrecer
  el código a quien interactúe por red — o sea, en Render, publicar el motor
  entero. **Mirar código ajeno no contamina; copiarlo sí.**
- **Que un repo clon tenga licencia MIT no cambia nada.** MIT licencia «el
  Software» —el código de quien escribió el repo— y no otorga ni puede otorgar
  derechos sobre la marca CATAN, que es de Catan GmbH.
- **Las tiendas son más estrictas que la ley y no hay juicio, hay retirada.** La
  guía 4.1(c) de Apple prohíbe usar el nombre de producto de otro desarrollador
  en el icono o el nombre de la app.

### Un juego propio de colonización hexagonal SÍ se puede publicar

Es exactamente el supuesto de *DaVinci v. Ziko*. Con cuatro condiciones
innegociables: nombre propio y no evocador (nunca «Catan» ni «Settlers» en
nombre, subtítulo, icono, descripción, palabras clave ni URL), arte propio,
reglas reescritas con nuestras palabras, y **cero descargos del tipo «inspirado
en Catan»** — no protegen y colocan la marca ajena en los metadatos indexables,
que es justo lo que las tiendas sancionan.

### Y en La Frente, el riesgo no está en el motor: está en la baraja

La mecánica es charadas y es libre. Lo que no puede haber en las cartas son
personajes de Disney, Marvel, Nintendo o DC — y ahí el peligro concreto es que la
baraja **la genere la IA** y meta un «Pikachu» sin que nadie haya tomado una
decisión. Sí caben: oficios, animales, objetos, conceptos, personajes históricos
reales y personajes de dominio público.

---

## 9. El plan por fases

**El orden es la tesis, no una conveniencia.** El tablero hexagonal va el cuarto,
no el primero, precisamente porque escribirlo antes garantizaría que el motor
solo juegue a él. Y La Ronda existe entre medias porque, con solo tres
juegos-prueba, el concepto de «mesa» lo estrenaría el hexagonal y por tanto la
mesa saldría con forma de hexagonal.

### Fase 0 — El contrato y su vacuna. Ni un juego todavía

`shared/arcade/` completo con su `Symbol.for` propio, `mecanicas/azar.ts`,
`server/src/arcade/arbitro.ts`, y la extracción de `server/src/canal/` con los
cinco verbos y `sondeo.ts` como adaptador sobre `hub.ts` **sin tocarlo**. Más
cuatro comprobadores escritos **antes** que cualquier juego.

*Demuestra:* que el núcleo admite un juego que no tiene tablero, ni turnos, ni
red, ni asientos, ni puntuación — y que imprime los peajes que aún le cobra. Es
la única fase que no produce nada jugable y la única que no se puede saltar: el
orden de las cinco siguientes es lo que impide repetir lo de CLUEDO, y esta es la
que hace ese orden **comprobable** en vez de una buena intención.

### Fase 1 — El juego más pobre posible: «La Frente»

`sede: 'dispositivo'`, con reloj, mueble `formulario`, baraja compilada dentro.
Inclinación por `DeviceMotion`, `expo-keep-awake`, orientación bloqueada.
`minijuegos()` deja de devolver `[]`. Sin red, sin cuentas, sin mesa, sin Skia,
sin una sola dependencia nueva de pintado.

*Demuestra:* que un juego puede existir **sin servidor, sin cuenta, sin asientos
registrados, sin turnos, sin tablero y sin puntuación enviada a ningún sitio**, y
aun así pasar por el motor. Rompe el acoplamiento más duro del motor de veladas.
Y es el entregable más barato de terminar: la fase entrega producto, no
andamiaje.

### Fase 2 — La mesa en línea, pequeña y por turnos: «La Ronda»

`mesas.ts`, el árbitro validando quién, cuándo y `rev`,
`server/src/routes/arcade.ts` montado **delante** de `requireAuth`, proyección
obligatoria por `secretos: true`, y la medición del presupuesto por movimiento.

*Demuestra:* autoridad de servidor sin Game Master; asientos anónimos; el mismo
reductor corriendo en los dos lados; información oculta que no se filtra **porque
no se envía**; y que el sondeo de 25 segundos basta y sobra.

### Fase 3 — El tiempo real de un jugador: «El Arcade»

`bucle.ts` con `useFrameCallback` y paso fijo integrando por
`timeSincePreviousFrame` —sin eso el juego corre al doble de velocidad en un
móvil de 120 Hz—, el mueble `lienzo` cambiado a Skia, y `repeticiones.ts` con
`marcadores.ts`.

*Demuestra:* que el motor no necesita turnos, y que la pureza del reductor es
real y no declarada. El marcador verificado es la prueba dura: si el reductor no
es determinista de verdad, el comprobador se pone rojo **ahora** y no seis meses
después en forma de desincronizaciones intermitentes en un solo modelo de móvil.

### Fase 4 — El tablero propio: «Riberas»

`malla-hexagonal.ts` con la canonicalización, el mueble genérico `tablero`,
`opciones()` dentro del juego, y el sondeo existente sin modificar.

*Demuestra:* lo que el encargo pide comprobar, y **se mide con un diff**: el
comercio, los recursos, los premios derivados, el orden en serpentina y la
negociación entre dos personas de las cuales una no tiene el turno se escriben
enteros dentro del juego, con **cero cambios en `shared/arcade/motor.ts`**. Ese
diff vacío *es* la demostración de que el núcleo nació agnóstico.

### Fase 5 — Solo si alguien lo pide: terceros, canal continuo y 3D

`ARCADES_EXTERNOS`, el presupuesto exigido y no solo medido, el mueble `escena`,
y la segunda implementación de `canal/`.

*Demuestra:* que la costura del transporte funcionaba, porque añadir un timbre
más rápido no toca el reductor, ni la proyección, ni el manifiesto, ni ninguno de
los cuatro juegos ya entregados.

---

## 10. La red: once comprobadores

La lección de este repositorio no es que la reingeniería se evitara con buenas
intenciones: es que `verificar-juego-ajeno.ts` monta un juego imposible y al
terminar **imprime la lista de lo que todavía le obliga a disfrazarse**. Eso es
lo que hay que replicar.

| Comprobador | Qué caza | Fase |
|---|---|---|
| `verify:arcade-pobre` | El «La Almoneda» de esta familia, y la pieza más importante de las once. Monta un juego deliberadamente miserable —sin tablero, sin turnos, sin red, sin asientos con identidad, sin puntuación, sin azar y sin secretos—, lo juega entero y al terminar imprime los **peajes** que aún paga | 0 |
| `verify:fronteras` | Que arcade no importe de live, docs ni agent, y al revés; que `shared/arcade` no importe de `shared/juegos`; y que `shared/arcade/motor.ts` no importe **nada** de `node:` — el día que importe `node:crypto`, La Frente deja de poder existir | 0 |
| `verify:pureza` | Prohibidos `Date`, `Math.random`, `fetch`, `async` y la mutación global en el camino del reductor. Prohibido `for…in` en la lógica: el orden de las claves con forma de entero es numérico y no de inserción, así que dos clientes recorren distinto | 0 |
| `verify:nucleo` | El que **ya existe**. Sus raíces son `['shared','server/src','client/src','app/src','app/app']`, así que las carpetas nuevas cuentan desde el primer commit. Nacer en cero y quedarse en cero es gratis; empezar en cuarenta ya no | 0 |
| `verify:sin-red` | Juega una partida entera de La Frente con la capa de red sustituida por una función que **lanza**. Una sola llamada, rojo. Es más fuerte que declarar un transporte «ninguno», porque no comprueba una intención sino un hecho | 1 |
| `verify:procedencia` | Que todo manifiesto declare su procedencia, y una lista negra de marcas registradas —en fichero, revisable, con un comentario que explique por qué está cada nombre— contrastada contra el nombre visible, el lema, los rótulos y el contenido de las barajas | 1 |
| `oro:arcade` | Hermano de `oro:verificar`: un registro de movimientos grabado por arcade y el estado final byte a byte | 1 |
| `verify:mesa` | **Levantando el servidor**, no en proceso. Actuar sin asiento, mandar un `rev` rancio, comprobar que la zona oculta no aparece en la proyección de nadie, cortar y resincronizar. Y que un manifiesto con `secretos: true` sin proyección **no deje arrancar** | 2 |
| `verify:determinismo` | El mismo registro de movimientos dos veces, comparando el hash del estado; y después en Node y en Hermes, comparando entre sí | 3 |
| `verify:marcador` | Una repetición fabricada se rechaza; una real se acepta al reejecutarla; un récord enviado como cifra suelta se rechaza siempre; y la duración declarada se contrasta con el tiempo de pared | 3 |
| `verify:presupuesto` | Un reductor que tarde más del tope síncrono, o produzca un estado mayor del permitido, se rechaza **antes** de bloquear el bucle de eventos | 5 |
| `verify:arcade-de-fuera` | Calcado del de veladas: escribe un arcade entero en un fichero temporal, arranca el servidor y lo juega — incluida la ruta de Windows por `pathToFileURL` | 5 |

**No ampliar `verify:legal`.** Ese comprobador verifica otra cosa por completo:
los documentos públicos de la LSSI —aviso legal, privacidad, términos— servidos
por HTTP sin credenciales. Meterle dentro una lista negra de marcas conflaría dos
materias que no tienen nada que ver.

Y todos se dan de alta en el array `BATERIA` de `scripts/verificar-todo.mjs` con
su campo `porque`: la cabecera de ese fichero ya cuenta que dieciocho
comprobadores estuvieron fuera de la lista y dos llevaban rojos un tiempo
indeterminado. **Un comprobador que no está en la batería no es una red: es un
fichero.**

---

## 11. Lo que se descarta, y por qué el descarte importa más que la adición

- **Ampliar `ManifiestoDeJuego`.** La trampa más barata y la más cara. Ver §0.
- **Reutilizar el contrato de reductor actual «porque ya es agnóstico».** Lo es,
  y solo para juegos de formulario. Ver §5.2.
- **Que el motor tenga autoridad sobre el turno.** El descarte más importante de
  todos. Conservar los jugadores activos, las subfases y el orden de turno como
  programa obligaría al motor a saber qué es un turno; y en cuanto el motor sabe
  qué es un turno, el primer juego rico decide qué forma tiene. La preocupación
  legítima —que al que no tiene el turno ni se le pinte el botón— la cubre
  `opciones()`, que es **cliente y no autoridad**: la misma función que el mueble
  usa para pintar y el reductor usa para validar, de modo que la regla sigue
  escrita una sola vez. **Un concepto entero desaparece en vez de generalizarse.**
- **Conceptos que solo pide el hexagonal, ascendidos a mecánica común:**
  `recursos.ts` con costes declarados, `trueque.ts` con ciclo de vida,
  `turnos.ts` con serpentina, y los derivados memorizados para la carretera más
  larga. Todos son campos del estado opaco y tipos de movimiento **de un solo
  juego**. Lo único que sube a `mecanicas/` es la canonicalización hexagonal.
- **Zonas con visibilidad declarada en el manifiesto.** Buena intención,
  mecanismo equivocado. Ver §5.8.
- **Cuatro ejes en el manifiesto donde bastan dos.** Ver §4.

---

## 12. Lo que este informe no ha podido cerrar

- **Colyseus sobre Expo no está probado.** Su documentación actual ya no tiene
  página de React Native. Antes de comprometerse con él para el canal continuo
  hace falta una prueba de concepto real sobre SDK 57 / RN 0.86 / Hermes en
  **build de producción, no en Expo Go**.
- **React Native es el punto ciego de todo el ecosistema.** Colyseus ya no lo
  documenta, Playroom exige `react-dom`, Rune corre dentro de su propia app,
  PartyKit es Cloudflare. El único que lo menciona explícitamente es
  boardgame.io, que es el que lleva cuatro años sin publicar.
- **El escalado a dos instancias no está resuelto, y es preexistente.** Ver §6.
- **Física determinista compartida es un proyecto en sí mismo**, no una casilla
  que se marca. Builds distintas del mismo motor de física producen resultados de
  coma flotante distintos y divergen.

---

## 13. Procedencia de este documento

Investigación de quince agentes con 742 consultas, sometida a tres revisores
adversarios cuyo encargo era **refutar, no confirmar**. Se corrigieron treinta y
cinco afirmaciones de la investigación previa y de la primera pasada, entre ellas
dos licencias mal atribuidas y un bloqueo de importación que solo aparece al
arrancar el servidor.

Los hechos del repositorio citados aquí —`cluedo.ts:103`, `index.ts:219/227`, las
raíces de `verify:nucleo`, `baseUrl "/jugar"`, los cinco verbos de `hub.ts`,
`vitrina.ts:187` y la capa `mecanicas/`— se comprobaron uno a uno sobre el árbol
de trabajo.

Versión navegable del mismo informe:
<https://claude.ai/code/artifact/a1674903-8c12-4897-a986-00c7667e0456>
