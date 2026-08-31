# El motor de la Sala de Arcade

**La segunda categoría de juegos: los que no tienen Game Master.**

Escrito el 31 de agosto de 2026, después de auditar los tres candidatos externos
que había sobre la mesa —ir-engine, boardgame.io y una tabla de siete
repositorios de juegos— más los backends de multijugador del mercado. **Revisado
el mismo día**, tras una auditoría externa que encontró siete fallos de diseño y
cuatro menores; lo que cambió está en el §13. Si algo de aquí no coincide con el
código, gana el código: corre `npm run verificar` y créele a él.

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

### Lo que estaba mal colocado, y por qué NO se llama «excepción»

Había dos ficheros en `live/` que no son de veladas sino de plataforma.
`presencia.ts` **se ha movido a `server/src/mecanicas/presencia.ts`**: no era una
excepción archivada mal, era una **dependencia estructural** de la fase 2, porque
sin presencia no se detecta a quien se fue de la mesa. Y de paso deja de existir
un peaje: `olvidar` de una mesa de arcade ya no llama de rebote a algo de
veladas, llama a una mecánica compartida.

Queda uno:

| Fichero | Dónde debe acabar | Por qué no se ha movido |
|---|---|---|
| `server/src/live/token.ts` | `server/src/identidad/`, que ya existe | Es la ruta de autenticación —el sitio donde un fallo deja que un invitado lea la solución— y hay otra sesión auditando ese árbol. Se mueve cuando cierre |

Y la lista dentro de `verificar-fronteras.ts` **no se llama «excepciones»: se
llama «mal colocados»**, con la ruta de destino escrita al lado y el motivo de la
espera. La diferencia no es cosmética y es el punto entero:

> Una lista de **excepciones** es una categoría — una zona compartida entre los
> dos motores, con precedente de ampliarla. Quien llegue en tres meses lee la
> categoría, no el razonamiento que la justificaba. Una lista de **destinos
> pendientes** no invita a crecer: cada línea es una deuda con dirección, y
> añadir una es admitir que has puesto algo donde no va.

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

### Los cinco juegos-prueba

Todo lo que sigue se justifica contra estos cinco, y ninguno es negociable:

| Nombre | Qué es | Qué rompe |
|---|---|---|
| **La Frente** | El móvil enseña un nombre, te lo pones en la frente | Un solo dispositivo, sin red, sin cuenta, sin asientos registrados, reloj de pared, **entrada a ciegas** |
| **La Ronda** | Fiesta en línea por turnos, cuatro personas, mano oculta | Mesa sin Game Master, asientos anónimos, información oculta |
| **El Arcade** | 60 fps, un jugador, con marcador | Sin turnos, bucle de fotogramas, marcador que hay que verificar |
| **Riberas** | Tablero hexagonal propio, 2–6, comercio | Identidades derivadas, negociación entre dos de los cuales uno no tiene el turno |
| **La Larga** | Riberas jugado en turnos de DÍAS: se entra, se juega uno, se cierra la app | La duración |

**La Larga entró tarde y por eso está escrito que entró tarde.** Los cuatro
primeros rompen el dispositivo, la mesa, el ritmo y el tablero; ninguno rompía la
DURACIÓN, y una partida asíncrona de varios días es una forma de producto
completamente normal en una app de juegos de mesa — Riberas por turnos asíncronos
es una funcionalidad obvia, no una hipótesis. Rompe cuatro supuestos que el resto
del diseño da por sentados a la vez:

- **La mesa en memoria** deja de valer: una partida de tres días no puede vivir
  en un proceso que Render reemplaza en cada despliegue.
- **La presencia deja de ser un proxy de participación.** En una velada, quien no
  está conectado no está jugando. Aquí, quien no está conectado sigue en la
  partida y le toca.
- **Los plazos dejan de medirse en tics.** «Veinticuatro horas para mover» no es
  un número de fotogramas.
- **Un `rev` rancio deja de ser un error y pasa a ser lo normal.** El cliente
  puede volver con una revisión de hace tres días, y eso no es un móvil
  manipulado: es alguien que volvió del trabajo.

Y una distinción hermana, que cuesta una línea ahora y es un caso especial
después: **la proyección es por ASIENTO, y un espectador no tiene asiento.**
Alguien que mira una partida sin jugarla tiene que caber en la firma desde el
principio.

---

## 1 bis. El vocabulario propio, en una página

Este documento inventa siete palabras. Son consistentes y esa consistencia es una
virtud, pero hay que aprenderlas antes de leer una línea de código — y ya hubo
que renombrar una (`reparto`) por chocar con un significado que ya existía en el
repositorio. Este glosario existe para que la segunda colisión se vea venir.

| Palabra | Qué significa AQUÍ | Con qué NO hay que confundirla |
|---|---|---|
| **sede** | Quién ejecuta el reductor: `'dispositivo'` o `'servidor'` | No es dónde está el servidor, ni cuánta gente hay delante del móvil |
| **mueble** | La superficie donde se pinta el juego: `formulario`, `tablero`, `lienzo`, `escena` | No es una pantalla de `expo-router`. Un mueble puede servir a muchos juegos |
| **canal** | Cómo viajan los avisos de que la mesa cambió: `sondeo` o `continuo` | **No es `reparto`**, que en este repositorio significa *qué juegos están instalados* (`verify:reparto`, `Symbol.for('gamemasters.juegos.reparto')`) |
| **asiento** | Un sitio en la mesa, anónimo y efímero: un nombre tecleado | No es un `participante` de plataforma, que tiene cuenta, correo y obligaciones de datos |
| **`loSecreto`** | La función que un juego exporta SOLO para pruebas: los valores que jamás pueden salir en la proyección ajena | **No es un `testigo`**, que en este repositorio es la credencial HMAC de `token.ts` (`verify:tokens` se llama «testigos» en la batería) |
| **procedencia** | De dónde salen las reglas del juego, legalmente | No es la licencia del código, que es otra cosa y va aparte |
| **enchufe** | Por dónde entra un juego que no viene dentro del binario | No aísla. Mismo proceso, mismos permisos |
| **peaje** | Algo que un juego-prueba tiene que FINGIR para entrar por el motor | No es un fallo. Es el precio que el motor todavía cobra, y es un entregable |

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
secretos: boolean                     // si es true, proyección Y `loSecreto`
marcador: MarcadorDeArcade            // unión CERRADA y OBLIGATORIA, con 'ninguno'
procedencia: ProcedenciaDeArcade      // unión CERRADA, obligatoria y discriminada
```

**Solo dos ejes, y el resto se deriva.** La mesa, los asientos, el transporte y la
exigencia de reejecutabilidad salen de `sede` y de `marcador`.

> **La regla que evita el deslizamiento: lo que un programador pueda poner mal,
> se DERIVA, no se declara.** Ni un campo del manifiesto que alguien pueda poner
> a `false` para que un comprobador se ponga verde. Por eso no hay
> `deterministaExigido` y no hay `transporte`: una bandera que exime de un
> comprobador es una bandera que se pone a `false` el día que el comprobador se
> pone rojo.

### `marcador` NO puede ser opcional, y la primera versión de este documento se equivocaba

La regla de arriba estaba escrita y aun así `marcador` salía como `marcador?:`,
con la exigencia de reejecutabilidad derivándose de **la existencia del campo**.
Eso es la misma bandera con otro disfraz, y de hecho peor: **omitir un campo
opcional es más silencioso que poner uno a `false`**. El día que
`verify:marcador` se ponga rojo, borrar tres líneas del manifiesto lo apaga, y en
el diff eso parece una limpieza.

Por eso es unión cerrada obligatoria con `'ninguno'` como valor explícito. Cuesta
exactamente lo mismo de escribir, y renunciar a la verificación pasa a ser una
palabra que alguien tuvo que teclear a propósito y que un revisor ve.

### `procedencia: 'licenciado'` sin metadatos es una etiqueta que nadie puede auditar

Los otros tres valores se sostienen solos: `'dominio-publico'`,
`'mecanica-generica'` y `'creacion-propia'` son afirmaciones comprobables leyendo
el juego. `'licenciado'` no dice nada sin **titular, referencia de la licencia y
vigencia** al lado, y el tipo tiene que obligarlo — unión discriminada, no tres
campos opcionales sueltos que alguien deja en blanco.

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

*Lo obligan los cinco.*

### 5.2 Reductor puro

El contrato actual —`Reductor = (ctx: ContextoAccion) => unknown`— **muta la
sesión**. Un reductor que muta no se puede reejecutar, y sin reejecución no hay
verificación de marcador, ni reproducción de partida, ni autoridad barata de
servidor, ni predicción futura.

Que viva en `shared/` y no en `server/` no es orden: es **la condición** para que
el mismo fichero corra en Hermes y en Node.

*Lo obligan los cinco.*

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

#### El plazo que no vencía nunca

Con `tickHz: 0` y autoridad de servidor, las dos reglas de arriba chocan: los
plazos vencen entrando por el reductor, **pero si nadie se mueve no entra nada**.
Una oferta de comercio con caducidad no caduca. Un turno con reloj no pasa.

**La salida no es un temporizador de servidor** —eso rompería la reproducibilidad
que el reductor puro acaba de comprar— sino **evaluación perezosa del plazo en la
lectura**: antes de devolver, el sondeo compara el reloj de pared con los plazos
absolutos que hay en el estado e inyecta un `tic` si toca. El reductor sigue
siendo la única puerta y sigue siendo puro.

Conviene decir por qué eso basta, porque el caso que asusta no es el que parece.
Si un jugador cierra la app, **los demás siguen sondeando**, y su lectura hace
vencer el plazo del ausente. La partida solo se queda quieta cuando **nadie**
mira — y una mesa que nadie mira, quieta, es exactamente lo correcto.

Pero convierte una lectura en una escritura, y eso tiene dos consecuencias que
hay que escribir **antes** de implementarlo, no después:

1. **El candado tiene que cubrir la ruta de lectura.** Hoy solo cubre la de
   escritura.
2. **La espera larga necesita despertarse por vencimiento**, no solo por
   `avisarCambio`: un sondeo aparcado veinticinco segundos puede tener un plazo
   que vence dentro de esa ventana. Eso es un **sexto verbo** en `canal/`, y por
   eso está anotado aquí y no descubierto en la fase 2.

### 5.5 Azar sembrado

`Math.random()` dentro de un reductor rompe la pureza, impide repetir una partida
y, si vive en el cliente, es trampa pura. La semilla y el contador viajan como
parte del estado para poder rebobinar, y **desaparecen en la proyección** para
que nadie prediga la siguiente carta.

Sube a `shared/mecanicas/` y no al núcleo del arcade porque una velada con dados
lo querría igual.

*Lo obligan los cinco.*

#### Y el azar no es el único que rompe el determinismo: `Math` también

Prohibir `Math.random` no basta, y esto es lo que revienta seis meses tarde. La
especificación de ECMAScript deja una familia entera de funciones como
**implementation-approximated**: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`,
`atan2`, `exp`, `expm1`, `log`, `log1p`, `log2`, `log10`, `pow`, `cbrt`, `hypot`
y las hiperbólicas. V8, JavaScriptCore y Hermes usan librerías matemáticas
distintas y devuelven **últimos bits distintos**.

Eso pega exactamente donde está la prueba dura: `verify:determinismo` compara
Node contra Hermes. El día que un arcade use `Math.sin` para una trayectoria o
`Math.pow` para una curva de dificultad, la repetición divergirá en un bit, el
hash no coincidirá, y se estará depurando una desincronización intermitente en un
modelo concreto de móvil — que es el fallo que la fase 3 existe para cazar seis
meses antes.

**Lo que SÍ es seguro y no se prohíbe:** `+`, `−`, `×`, `÷` y `Math.sqrt`, que
están fijadas por IEEE 754. Esa frase tiene que estar en el mensaje del
comprobador: sin ella, alguien prohibirá `Math` entero o no prohibirá nada.

Los sustitutos van en `shared/mecanicas/`: tablas precalculadas o aproximaciones
propias en punto fijo. `Math.fround` sobre el resultado reduce la divergencia
—es lo que hace Rune— pero **no la demuestra**, y no debe venderse como solución.

#### Serialización canónica, o el comprobador da falsos rojos

Si `verify:determinismo` compara hashes de estado, hace falta fijar una
serialización con **claves ordenadas**. Hoy dos estados semánticamente idénticos
con distinto orden de inserción darían hashes distintos, y un comprobador que
grita cuando no pasa nada se acaba desactivando — que es peor que no tenerlo.
Vive en `shared/mecanicas/canonico.ts`, y rechaza lo no serializable en vez de
tragárselo.

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

#### `loSecreto`: por qué exigir la proyección no basta

Exigir que la proyección exista no comprueba que haga algo. **Un juego puede
declarar `secretos: true`, registrar la identidad como proyección y pasar todos
los comprobadores en verde mientras filtra el mazo entero.** Y un comprobador
genérico sobre estado opaco no puede cazarlo, porque no sabe qué es la zona
oculta — no puede saberlo, y ese es el precio de la opacidad.

Se cierra sin romperla: un juego con `secretos: true` registra, junto a la
proyección y **solo para pruebas**, una función

```ts
loSecreto(estado: unknown): unknown[]
```

que devuelve los valores que jamás pueden aparecer en la proyección de otro
asiento. **El motor no la llama nunca en ejecución**, así que sigue sin
interpretar el estado; la llama `verify:mesa`, y entonces la comprobación es
real. Y si un juego declara `secretos: true` sin registrarla, el arranque falla —
el mismo patrón que ya se usa para la proyección ausente.

> **Se llama `loSecreto` y no «testigo» a propósito.** «Testigo» ya significa
> otra cosa en este repositorio: es la credencial HMAC de `token.ts`, y el
> comprobador `verify:tokens` se llama «testigos» en la batería. Reutilizar la
> palabra sería repetir exactamente el error que obligó a renombrar `reparto`
> antes de escribir una línea. Ver el glosario en §1 bis.

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
16–33 ms por cliente: no es un ajuste, es otra cosa. **Y ninguno de los cinco
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
   seis escrituras por segundo en una mesa de seis. El repositorio ya diagnosticó
   esta clase de problema una vez en `presencia.ts`.

### Y un cuarto que no es del transporte sino del almacenamiento, y no es futuro

«Almacén en memoria con persistencia diferida» más «cada despliegue de Render
reemplaza la instancia» da una consecuencia que **pasa el día uno de la fase 2**:
cada `git push` mata todas las partidas en curso. En veladas duele poco porque el
estado vive en Mongo; aquí, no.

La persistencia diferida está bien razonada para las seis escrituras por segundo
de un arcade en tiempo real, y es **innecesaria** para una mesa por turnos, donde
hay un movimiento cada varios segundos. Así que se parte **por frecuencia y no
por familia**:

- `tickHz === 0` → **escritura síncrona**. Riberas, La Ronda y La Larga.
- `tickHz > 0` → **escritura diferida**. El Arcade y lo que venga detrás.

Y en los dos casos, **volcado al recibir `SIGTERM`**, que es lo que Render manda
antes de reemplazar la instancia. Con La Larga en la lista de juegos-prueba esto
deja de ser una optimización y pasa a ser un requisito: una partida de tres días
no puede vivir en un proceso.

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
  <br>Pero **esa comprobación es orientativa y su cabecera tiene que decirlo**:
  el campo `license` del `package.json` es autodeclarado, y el §2.3 de este mismo
  documento recoge dos casos donde no coincidía con la realidad. Rechaza lo que
  se declara mal; no demuestra nada sobre lo que se declara bien. Confundirla con
  una garantía es peor que no tenerla.
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
`expo-keep-awake` y `expo-screen-orientation`. **Sin sensores.**
`minijuegos()` deja de devolver `[]`. Sin red, sin cuentas, sin mesa, sin Skia,
sin una sola dependencia nueva de pintado.

#### La entrada a ciegas, y por qué no hay acelerómetro

`expo-sensors` queda **descartado para esta fase**, y conviene decir qué se
pierde: el sensor no servía para saber cómo está puesto el móvil, servía para
**decir «acerté» y «paso» sin ver la pantalla**. Quien lleva el aparato en la
frente lo tiene mirando hacia los demás y no ve nada.

Así que la entrada tiene que ser un gesto que se pueda hacer a ciegas, y no todos
lo son: **un botón en una zona de la pantalla no vale**, porque acertar una mitad
concreta sin mirar es adivinar. Lo que sí funciona sin vista es la **dirección**,
que es propioceptiva:

- **Deslizar hacia abajo → acerté.** Es el mismo gesto que inclinar el móvil
  hacia abajo en el juego de siempre, hecho con el pulgar.
- **Deslizar hacia arriba → paso.**
- **Un golpe de vibración** confirma que el gesto entró, porque es la única
  confirmación que se percibe sin ver la pantalla.

Las tres piezas ya están instaladas —`react-native-gesture-handler` y
`expo-haptics` vienen con la app—, así que esta fase sigue sin añadir una sola
dependencia de interacción.

Y queda anotado que **el sensor no está rechazado, está aplazado**: la
inclinación es mejor gesto que el deslizamiento porque no exige tocar un aparato
que está apoyado en una cara. Si La Frente funciona y la gente lo pide, entra
después — y entonces habrá que escribir el texto de `NSMotionUsageDescription`,
que es copy de producto y no configuración.

*Demuestra:* que un juego puede existir **sin servidor, sin cuenta, sin asientos
registrados, sin turnos, sin tablero y sin puntuación enviada a ningún sitio**, y
aun así pasar por el motor. Rompe el acoplamiento más duro del motor de veladas.
Y es el entregable más barato de terminar: la fase entrega producto, no
andamiaje.

### Fase 2 — La mesa en línea, pequeña y por turnos: «La Ronda»

`mesas.ts`, el árbitro validando quién, cuándo y `rev`,
`server/src/routes/arcade.ts` montado **delante** de `requireAuth`, proyección
obligatoria por `secretos: true`, y la medición del presupuesto por movimiento.

Y cuatro cosas que esta fase tiene que traer YA, porque escribirlas después
significa reescribir `mesas.ts`:

1. **El sexto verbo de `canal/`** y la evaluación perezosa de plazos en la
   lectura (§5.4). Con él, el candado pasa a cubrir la ruta de lectura.
2. **La persistencia partida por frecuencia** y el volcado en `SIGTERM` (§6).
   Sin eso, cada despliegue mata las partidas en curso desde el día uno.
3. **Presencia y participación dejan de ser lo mismo.** En una velada, quien no
   está conectado no está jugando; en una mesa asíncrona, sigue en la partida y
   le toca.
4. **Un `rev` rancio de días no es un error.** Es alguien que volvió del trabajo,
   y la resincronización tiene que tratarlo como el caso normal.

Las cuatro las obliga **La Larga**, que se estrena después de Riberas pero cuyos
requisitos se pagan aquí. Escribir `mesas.ts` pensando solo en La Ronda —cuatro
personas, diez minutos, todas mirando— es cómo la mesa saldría con forma de
partida corta.

*Demuestra:* autoridad de servidor sin Game Master; asientos anónimos; el mismo
reductor corriendo en los dos lados; información oculta que no se filtra **porque
no se envía** y que `loSecreto` demuestra que no se filtra; y que el sondeo de 25
segundos basta y sobra.

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

### Fase 4 bis — La duración: «La Larga»

El mismo Riberas, jugado en turnos de días. No es un juego nuevo: es el **mismo
manifiesto y el mismo reductor** con la mesa persistida, los plazos en horas de
reloj de pared en vez de en tics, y avisos al que le toca.

*Demuestra:* que la duración no es una propiedad del motor. Si La Larga necesita
tocar `shared/arcade/`, es que la fase 2 se escribió pensando en partidas de diez
minutos y hay que volver. Si solo necesita configuración y un aviso, el eje
estaba bien elegido. **Es la más barata de todas las fases si las anteriores se
hicieron bien, y la más cara si no** — que es exactamente para lo que sirve un
juego-prueba.

### Fase 5 — Solo si alguien lo pide: terceros, canal continuo y 3D

`ARCADES_EXTERNOS`, el presupuesto exigido y no solo medido, el mueble `escena`,
y la segunda implementación de `canal/`.

*Demuestra:* que la costura del transporte funcionaba, porque añadir un timbre
más rápido no toca el reductor, ni la proyección, ni el manifiesto, ni ninguno de
los cinco juegos ya entregados.

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
| `verify:pureza` | Prohibidos `Date`, `Math.random`, `fetch`, `async`, `setTimeout` y la mutación global en el camino del reductor. Prohibido `for…in` en la lógica: el orden de las claves con forma de entero es numérico y no de inserción, así que dos clientes recorren distinto. **Y prohibidas las trascendentales de `Math`** —`sin`, `cos`, `pow`, `exp`, `log`, `atan2`, `hypot`, `cbrt`…—, que la espec deja *implementation-approximated* y que Hermes y V8 redondean distinto; `+ − × ÷` y `Math.sqrt` sí son seguras y el mensaje tiene que decirlo | 0 |
| `verify:nucleo` | El que **ya existe**. Sus raíces son `['shared','server/src','client/src','app/src','app/app']`, así que las carpetas nuevas cuentan desde el primer commit. Nacer en cero y quedarse en cero es gratis; empezar en cuarenta ya no | 0 |
| `verify:sin-red` | Juega una partida entera de La Frente con la capa de red sustituida por una función que **lanza**. Una sola llamada, rojo. Es más fuerte que declarar un transporte «ninguno», porque no comprueba una intención sino un hecho | 1 |
| `verify:procedencia` | Que todo manifiesto declare su procedencia, y una lista negra de marcas registradas —en fichero, revisable, con un comentario que explique por qué está cada nombre— contrastada contra el nombre visible, el lema, los rótulos y el contenido de las barajas | 1 |
| `oro:arcade` | Hermano de `oro:verificar`: un registro de movimientos grabado por arcade y el estado final byte a byte | 1 |
| `verify:mesa` | **Levantando el servidor**, no en proceso. Actuar sin asiento, mandar un `rev` rancio, cortar y resincronizar. Y lo que de verdad cierra el agujero: llamar a `loSecreto(estado)` del juego y comprobar que **ninguno** de esos valores aparece en la proyección de otro asiento — sin eso, una proyección que sea la identidad pasa en verde. Más que un manifiesto con `secretos: true` sin proyección o sin `loSecreto` **no deje arrancar** | 2 |
| `verify:determinismo` | El mismo registro de movimientos dos veces, comparando el hash del estado **serializado con `canonico.ts`**, y después en Node y en Hermes, comparando entre sí. Sin la serialización canónica, dos estados idénticos con distinto orden de inserción darían hashes distintos y el comprobador gritaría sin que pase nada | 3 |
| `verify:marcador` | Una repetición fabricada se rechaza; una real se acepta al reejecutarla; un récord enviado como cifra suelta se rechaza siempre; y la duración declarada se contrasta con el tiempo de pared | 3 |
| `verify:presupuesto` | Un reductor que tarde más del tope síncrono, o produzca un estado mayor del permitido, se rechaza **antes** de bloquear el bucle de eventos | 5 |
| `verify:arcade-de-fuera` | Calcado del de veladas: escribe un arcade entero en un fichero temporal, arranca el servidor y lo juega — incluida la ruta de Windows por `pathToFileURL` | 5 |

### Los peajes que se pueden derivar, se derivan

La primera implementación de `verify:arcade-pobre` declaraba sus doce peajes con
un `peajes.push(texto)`. Lo señaló quien la escribió, y tiene razón: **borrar una
línea sin arreglar la causa no pone nada en rojo**, o sea que el entregable más
valioso de la fase es el único que se puede maquillar en silencio — y este
repositorio ya tiene tres casos anotados de comprobadores que pasaban en verde
sin comprobar nada.

Los peajes que son HECHOS se derivan leyendo el fichero que los causa: el
`PLAZO_MS` fijo de `hub.ts`, la aserción a `AvisoClave` en `canal/sondeo.ts`. Si
la causa desaparece, el peaje desaparece solo; y si alguien borra la línea con la
causa viva, el comprobador lo caza. Los que son JUICIOS —«`gancho` obliga a
escribir una frase de venta»— pueden seguir declarados, pero la cabecera tiene
que separar las dos mitades para que nadie las confunda.

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
- **Los avisos de La Larga están fuera de alcance hoy.** Que a alguien le llegue
  al móvil «te toca» tres días después es una capacidad de plataforma
  —notificaciones push, con sus credenciales y sus dos tiendas— que este
  documento no diseña. La Larga se puede jugar sin ellos abriendo la app; con
  ellos es un producto. Queda dicho para que no aparezca como sorpresa en la fase
  4 bis.
- **El sexto verbo está nombrado, no diseñado.** Se sabe qué tiene que hacer
  —despertar una espera larga por vencimiento de plazo y no solo por
  `avisarCambio`— y no cómo evita despertar a todo el mundo cada vez. Se diseña
  en la fase 2, con el candado delante.

---

## 13. Procedencia de este documento

Los hechos del repositorio citados aquí —`cluedo.ts:103`, `index.ts:219/227`, las
raíces de `verify:nucleo`, `baseUrl "/jugar"`, los cinco verbos de `hub.ts`,
`vitrina.ts:187` y la capa `mecanicas/`— se comprobaron uno a uno sobre el árbol
de trabajo. Cada afirmación sobre un proyecto ajeno se tomó de su fuente, y
después alguien intentó **refutarla, no confirmarla**; así se cazaron dos
licencias mal atribuidas y un bloqueo de importación que solo aparece al arrancar
el servidor.

Eso es todo lo que hay que decir sobre la procedencia. **Una versión anterior de
esta sección presumía de cuántos agentes y cuántas consultas costó el informe**,
y eso era exactamente el error que el resto del documento se dedica a desmontar:
las estrellas de un repositorio, un README bonito y un recuento de esfuerzo son
señales indirectas, y ninguna sustituye a haber abierto la fuente. La frase que
abre el documento —«si algo de aquí no coincide con el código, gana el código»—
ya hace todo el trabajo.

Este documento se ha corregido una vez, tras una auditoría externa que encontró
siete fallos de diseño y cuatro menores. De ahí salieron: las trascendentales de
`Math`, la serialización canónica, el plazo que no vencía nunca, `loSecreto`,
`marcador` como unión obligatoria, la persistencia partida por frecuencia, «La
Larga» como quinto juego-prueba, los espectadores, el traslado de `presencia.ts`,
la advertencia sobre la detección de licencias, los metadatos de `'licenciado'` y
el glosario del §1 bis. Queda escrito aquí porque un documento que no dice en qué
se equivocó invita a creerle más de lo que merece.

Versión navegable del mismo informe:
<https://claude.ai/code/artifact/a1674903-8c12-4897-a986-00c7667e0456>
