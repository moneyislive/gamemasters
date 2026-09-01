# GameMasters — Arquitectura y contratos

Plataforma web para Game Masters: organiza juegos reales (primer juego: CLUEDO) con
ayuda de un agente de IA especializado que genera tramas procedurales adaptadas a los
jugadores, el espacio físico y los objetos aportados.

**Idioma de toda la UI y del agente: ESPAÑOL.**

## Stack

- `app/` — Expo (React Native) + expo-router. La app de los jugadores para la
  partida en vivo: iOS, Android y web con un solo código. Ver `app/README.md`.
- `client/` — React 18 + Vite + TypeScript. Zustand, react-router-dom v6, framer-motion.
- `escritorio/` — React 18 + Vite + TypeScript. La Sala de Arcade para PC: DOM y
  SVG del navegador, sin una sola línea de React Native. No lleva `react-router`
  ni Zustand aunque el taller sí los lleve — no es de su familia: son dos
  pantallas y una consulta, y cada arcade es una dirección (`/sala/riberas`,
  con el código de la mesa en `?codigo=`), que es lo que convierte «te paso el
  código» en «te paso el enlace» delante de un teclado.
- `server/` — Node 20 + Express 4 + TypeScript (ESM, ejecutado con tsx). Mongoose
  (MongoDB Atlas) con fallback a fichero JSON. `@anthropic-ai/sdk`.
- `shared/types.ts` — contrato de tipos. Importar SIEMPRE con ruta relativa
  (`../../shared/types` desde `server/src/*`, `../../../shared/types` desde
  `client/src/<dir>/*`). Solo importar TIPOS de ahí (import type).

Puertos: cliente 5173 (proxy `/api` y `/uploads` → 5174), servidor 5174,
escritorio 5175 (proxy `/api` → 5174, solo en desarrollo: en producción lo sirve
el mismo Node en `/sala`, y por eso el escritorio habla siempre con rutas
relativas y no tiene una rama de «si estoy en dev, apunta a otro sitio», que es
una rama que solo se prueba en dev).

## Reglas comunes

- TypeScript estricto; sin `any` salvo imposibilidad razonable.
- NO ejecutar `npm install`, builds ni servidores: solo escribir código.
  (Excepción registrada: la creación de `app/` exigió instalar Expo y sus
  dependencias. Fue una decisión explícita del propietario del repositorio.)
- Al probar en local, NUNCA lanzar el servidor con variables de PowerShell
  (`$env:VAR=""`): Windows descarta las vacías y el proceso acaba cargando el
  `.env` real, con la clave de Anthropic y la base de Atlas de producción. Usar
  `spawn` de Node pasando el entorno explícito (ver los bancos de prueba).
- No crear ficheros fuera de tu lista de propiedad (ownership) — otros agentes poseen el resto.
- Comentarios y textos de UI en español.
- Estética: usar las clases y variables de `client/src/styles/theme.css`
  (`.deco-frame`, `.btn`, `.btn--primary`, `.input`, `.label`, `.ornament-divider`,
  `.agent-highlight`, tokens `--gold-*`, `--felt-*`, `--parchment`, fuentes
  `var(--font-heading)` / `var(--font-body)` / `var(--font-display)`).
  Cada módulo puede añadir su propio CSS en ficheros nuevos dentro de su ownership.

## El segundo motor: la Sala de Arcade (shared/arcade/, server/src/arcade/, server/src/canal/)

Todo lo que sigue en este documento hasta el despliegue —la puerta del taller, el
modelo de datos, la API REST, el agente, la generación, los dosieres y el
estudio— es de **un solo motor**: el de las veladas, partidas que dirige un Game
Master. Hay un segundo, y su contrato entero está en
[docs/MOTOR-DE-ARCADE.md](docs/MOTOR-DE-ARCADE.md): ahí hay que ir antes de
escribir una línea de arcade, porque este apartado solo dice que existe y dónde
vive. Un arcade es un juego **sin Game Master**: nadie da de alta a los
jugadores, no hay trama generada por IA, no hay dosieres imprimibles y no hay
taller detrás.

### La regla de la que cuelgan todas las demás: independencia total

**El motor de arcade no extiende el de veladas, no lo hereda, no lo configura y
no comparte su contrato.** Son dos motores hermanos que conviven en el mismo
repositorio y en el mismo proceso de Node, y que no se conocen. Eso no es una
preferencia de estilo, y `verify:fronteras`
(`server/scripts/verificar-fronteras.ts`) lo comprueba leyendo las importaciones
de verdad, no la intención:

- `server/src/arcade/**` no importa de `server/src/live/**`, `server/src/docs/**`
  ni `server/src/agent/**`, **y al revés**. La dirección contraria es igual de
  grave: un motor de veladas que sabe qué es un arcade es un motor con dos modos,
  y el segundo es el que no se probó.
- `shared/arcade/**` no importa de `shared/juegos/**`, ni de `shared/live`,
  `shared/types`, `shared/documents` o `shared/staleness`. O sea que el
  manifiesto de arcade está escrito desde cero: no hereda, no extiende y no hace
  `Omit<ManifiestoDeJuego, …>`. Once campos y dos ejes (`sede` y `tickHz`).
- `shared/arcade/motor.ts` no importa **nada** de `node:`. Tiene que correr
  dentro de Hermes, en un móvil y sin red: el día que importe `node:crypto`
  —para una semilla, para un hash, para lo que sea— un juego de un solo
  dispositivo deja de poder existir.
- El registro es propio, anclado en
  `Symbol.for('gamemasters.arcade.instalados')` y separado del
  `gamemasters.juegos.instalados` de las veladas. Si un arcade entrara en el
  reparto de veladas, `app/src/vitrina.ts` lo pintaría en el carrusel de la
  portada, y para evitarlo alguien metería un `if (esArcade)` en `veladas()` —
  que es la primera de las cien banderas que acaban deshaciendo la separación.

**Lo único que comparten es `mecanicas/`, y es deliberado.** Una mecánica es
código que sirve a varios juegos, que ninguno tiene la obligación de usar y que
no sabe quién lo usa: apuntarse es llamar a una función, sin registro, sin
herencia y sin configuración. En `shared/mecanicas/` viven `azar.ts` (semilla y
contador dentro del estado, para poder rebobinar una partida), `canonico.ts`
(serialización con claves ordenadas, sin la cual dos estados idénticos con
distinto orden de inserción darían hashes distintos y el comprobador de
determinismo gritaría sin que pase nada), `malla-hexagonal.ts`,
`tablero-declarado.ts`, `turno-declarado.ts` y `pistas.ts`; en
`server/src/mecanicas/`, `presencia.ts` — que estaba en `live/` y se movió, no
como excepción archivada sino porque sin presencia no se detecta a quien se fue
de la mesa, y una mesa de arcade no puede pagar peaje a las veladas para
saberlo.

### El árbol, y la frase que lo ordena

**`shared/` son las reglas. `server/` es la autoridad.**

- `shared/arcade/` — `tipos.ts` (el manifiesto), `motor.ts` (el tipo `Avanzar`:
  `(estado, movimiento, ctx) => estado`, puro, sin E/S y sin mutar nada; o un
  `Rechazo` que lleva dentro el estado que sigue valiendo, que es lo que la mesa
  cuenta como movimiento que no cambió nada), `movimiento.ts` (`{tipo, carga?}`
  con carga libre, no un vocabulario de formulario), `proyeccion.ts`, `opciones.ts`,
  `reloj.ts` (el tiempo como número de tic: los plazos vencen ENTRANDO por el
  reductor, nunca como un `setTimeout` del servidor, que rompería la
  reejecutabilidad), `index.ts` (el registro) y `juegos/` con el manifiesto, el
  reductor y la proyección de cada arcade.
- `server/src/arcade/` — `arbitro.ts` valida QUIÉN y CUÁNDO y luego llama al
  mismo `avanzar()` de `shared/` que corre en el móvil: no duplica ni una regla.
  `mesas.ts` (una mesa nace de un código que genera el primer jugador, no de una
  lista de personas que copió un Game Master), `enchufe.ts`, `marcadores.ts`,
  `repeticiones.ts`, `presupuesto.ts`.
- `server/src/canal/` — cómo se entera un dispositivo de que la mesa ha cambiado.
  `index.ts` declara los seis verbos (`esperarCambio`, `avisarCambio`,
  `anunciar`, `avisosDesde`, `despertarAlVencer`, `olvidar`) y `sondeo.ts` es un
  adaptador sobre el `hub.ts` de las veladas **sin tocarle un byte**. Que quepa
  en un adaptador es la prueba de que los verbos no son un invento: son lo que
  `hub.ts` ya expone de hecho.

### La ruta va DELANTE del guardián, y es a propósito

`server/src/routes/arcade.ts` se monta junto a `jugarRouter` y **antes** de
`app.use('/api', requireAuth)`. No es comodidad ni descuido: todo el ciclo de una
velada lo abre `routes/live.ts` detrás de `requireAuth` porque hay alguien que
dirige y ese alguien entró por la puerta del taller. En un arcade no dirige
nadie, así que exigir la contraseña de la casa dejaría el segundo motor sin
jugadores. Lo mismo vale para el estático de `/sala` (`enlaces/escritorio-web.ts`).

### Y se pinta desde los dos clientes de jugador

Los muebles genéricos —`formulario` y `tablero`— los pinta la plataforma, y la
plataforma son **dos**: `app/app/(arcade)/` con `app/src/arcade/` (React Native y
`react-native-svg`) y `escritorio/` (DOM y SVG del navegador). El segundo no es
una comodidad: es la única medida que existe de si este contrato estaba atado a
React Native, y se escribió entero contra `shared/arcade` sin cambiarle un byte.
Los muebles propios —`lienzo` y `escena`— los pinta el juego con sus píxeles y
viven en el binario de la app; en escritorio salen apagados y con el motivo
escrito.

## La puerta del taller (server/src/auth.ts)

Se entra de dos maneras y hay que distinguirlas, porque no dan lo mismo:

- **La contraseña de la casa** (`APP_PASSWORD`) → cookie `gm_sesion`. Abre el
  taller entero. Es la puerta principal.
- **Una cuenta de proveedor** (Google/Apple) → pasaporte firmado, en la cookie
  `gm_cuenta` o en la cabecera `X-GM-Cuenta`. Abre el taller **solo si el correo
  verificado de esa cuenta está en `GM_ADMITIDOS`**.

**La regla que cuesta un incidente aprender:** el pasaporte de cuenta lo tiene
también **todo el que juega**. Se lo reparte `/cuenta/entrar` a cualquiera que
inicie sesión con su Google en la app del jugador. Un guardián que se conforme
con que la firma del pasaporte sea válida deja que un invitado pida
`/api/games/<id>` y lea el culpable, la solución y todas las pistas.

Por eso:

- `tallerAbiertoPara(req)` es **asíncrona** y comprueba la admisión contra el
  almacén en cada petición. Es el único sitio que decide si se abre. Falla
  cerrada: si no puede comprobarlo, responde 503.
- `identidadDeTaller(req)` es síncrona y dice **con qué título** entra alguien,
  para «cada uno ve sus partidas». **No sirve como guardián** — no mira la lista.
- Una cuenta no admitida **no corta**: se sigue por la puerta de la casa. Quien
  entra con la contraseña y un nombre lleva las dos cosas, y su cuenta no está
  en `GM_ADMITIDOS` ni tiene por qué.
- Comprobar `admitidoEnElTaller` (la regla) **no es** comprobar la puerta. La
  regla estuvo bien escrita desde el primer día y el taller siguió abierto.
  `verify:proveedores` y `verify:puerta-google` prueban la puerta por HTTP.

## Modelo de datos

Ver `shared/types.ts` (GameSession, Suspect, Room, Weapon, BoardLayout, Plot,
PlayerDocument, ChatMessage, UiCommand, ChatStreamEvent, GenerateStreamEvent,
AppConfig...). Es el contrato: no cambiar formas.

## API REST (servidor)

Prefijo `/api`. Todas las respuestas JSON. Mutaciones de entidades devuelven la
`GameSession` completa actualizada.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/config` | `AppConfig` (modelo activo, lista de modelos, hasApiKey, storage) |
| PUT | `/api/config` | body `{model}` → `AppConfig` |
| GET | `/api/games` | `GameSummary[]` |
| POST | `/api/games` | body `{name?}` → `GameSession` nueva (status 'draft', boardMode 'generated', settings `{language:'es'}`) |
| GET | `/api/games/:id` | `GameSession` |
| PATCH | `/api/games/:id` | patch parcial `{name?, boardMode?, boardImageUrl?, settings?}` → `GameSession` |
| DELETE | `/api/games/:id` | `{ok:true}` |
| POST | `/api/games/:id/suspects` | upsert `Partial<Suspect>` (con `id` → actualiza; sin `id` → crea con nanoid) → `GameSession` |
| DELETE | `/api/games/:id/suspects/:sid` | → `GameSession` |
| POST | `/api/games/:id/rooms` | upsert `Partial<Room>` → `GameSession` |
| DELETE | `/api/games/:id/rooms/:rid` | → `GameSession` |
| POST | `/api/games/:id/weapons` | upsert `Partial<Weapon>` → `GameSession` |
| DELETE | `/api/games/:id/weapons/:wid` | → `GameSession` |
| POST | `/api/games/:id/board` | recalcula `BoardLayout` determinista → `GameSession` |
| POST | `/api/uploads` | multipart `file` → `{url:'/uploads/<nombre>'}` (multer, disco `server/uploads/`, servido estático) |
| GET | `/api/games/:id/chat/messages` | `ChatMessage[]` historial |
| POST | `/api/games/:id/chat` | SSE — ver protocolo |
| POST | `/api/games/:id/generate` | SSE — ver protocolo |
| POST | `/api/games/:id/refresh` | SSE — pone al día una partida ya generada (ver Coherencia) |
| GET | `/api/games/:id/documents/:suspectId` | HTML del dosier (Content-Type text/html; `?download=1` añade Content-Disposition attachment) |

### Protocolo SSE

Respuesta `Content-Type: text/event-stream`. Cada evento: `data: <JSON>\n\n`.
Formas exactas: `ChatStreamEvent` y `GenerateStreamEvent` de `shared/types.ts`.
El servidor hace `res.flushHeaders()` al inicio y `res.end()` tras `done`/`error`.

## Almacenamiento (server/src/db/store.ts)

Interfaz `Store` con: `listGames() → GameSummary[]`, `getGame(id)`, `createGame(name?)`,
`saveGame(game)` (reemplaza y actualiza `updatedAt`), `deleteGame(id)`,
`getMessages(gameId)`, `appendMessage(gameId, msg)`, `getConfigModel()`, `setConfigModel(m)`.

Dos implementaciones detrás de la misma interfaz, elegidas en el arranque:
- `MongoStore` si `process.env.MONGODB_URI` está definida (mongoose; colecciones
  `games`, `messages`, `config`; guardar el documento GameSession completo tal cual
  con `strict:false` o schema Mixed).
- `FileStore` en caso contrario: `server/data/db.json` (crear directorio si no existe,
  escritura atómica sencilla, carga perezosa en memoria).

## Agente de CLUEDO (server/src/agent/*)

- SDK: `@anthropic-ai/sdk`, cliente con `apiKey` de env. Modo demo si no hay key.
- Modelo: el de `settings.model` de la partida o el global de config
  (por defecto `claude-fable-5`).
- **Reglas API críticas** (ya verificadas contra la doc oficial):
  - NO enviar `temperature`/`top_p`/`top_k` nunca.
  - NO enviar el parámetro `thinking` (Fable 5 lo lleva siempre activo; en el resto
    el valor por defecto es correcto).
  - Chat: usar `client.beta.messages.stream({...})` con
    `betas: ['server-side-fallback-2026-07-01']` y `fallbacks: 'default'` SOLO cuando
    el modelo sea `claude-fable-5` o `claude-opus-5` (en sonnet/haiku, usar
    `client.messages.stream` normal sin fallbacks).
  - Comprobar `stop_reason === 'refusal'` antes de leer contenido; si ocurre,
    emitir evento de error legible.
  - `max_tokens`: 16000 en chat; 64000 en generación (siempre streaming).
  - System prompt como bloque con cache: `system: [{type:'text', text, cache_control:{type:'ephemeral'}}]`.
  - Tool inputs: parsear siempre como objeto (`block.input` ya viene parseado).
- **System prompt** (`systemPrompt.ts`): experto absoluto en CLUEDO. Debe incluir:
  reglas oficiales del juego (sospechosos, armas, salas, mecánica de sugerencia/
  refutación/acusación, sobre del crimen, movimiento, pasadizos secretos), cómo
  adaptar Cluedo a un juego EN VIVO en un espacio físico real, psicología de
  jugadores (cómo usar las descripciones de cada persona para asignar personajes
  con máximo engagement), y las instrucciones de comportamiento: hablar español,
  tono de mayordomo/maestro de ceremonias elegante años 20, respuestas breves,
  usar herramientas para registrar datos que el usuario dicte, y usar los comandos
  de UI con moderación para guiar visualmente.
- **Herramientas del agente** (`tools.ts`) — bucle manual de tool-use dentro del
  stream de chat; tras ejecutar tools se emite `{type:'entities', game}` por SSE y
  se continúa la conversación hasta `end_turn`:
  - `upsert_suspect {id?, name, email?, description?}` / `remove_suspect {id}`
  - `upsert_room {id?, name, description?}` / `remove_room {id}`
  - `upsert_weapon {id?, name, description?}` / `remove_weapon {id}`
  - `set_game_name {name}`
  - `get_game_state {}` → JSON resumido de la partida
  - `ui_popup {title, body, tone}` → SSE `{type:'ui', command:{kind:'popup',...}}`
  - `ui_highlight {target}` → SSE `{type:'ui', command:{kind:'highlight', target}}`
  - `ui_navigate {target}` → SSE navegar pestaña
  - `start_generation {}` → SSE `{kind:'start_generation'}` (el cliente lanza /generate)
- **Modo demo** (`demo.ts`): sin API key, el chat responde con un guion útil en
  español (da la bienvenida, explica los pasos, reconoce comandos sencillos tipo
  "añade a X" con regex básica llamando a las mismas funciones de mutación) para
  que toda la experiencia sea navegable sin clave.

## Pipeline de generación (server/src/plot/*, server/src/routes/generate.ts)

Etapas emitidas por SSE (`stage`): `board` → `plot` → `documents`.

1. **board**: si no hay `board` o boardMode cambió, llamar al generador determinista.
2. **plot**: llamada a la API con streaming y salida estructurada
   (`output_config: {format: {type:'json_schema', schema: PLOT_SCHEMA}}`) sobre
   `client.messages.stream` (ruta NO beta). El schema refleja `Plot` de shared/types
   (sin `minLength` ni constraints numéricos; `additionalProperties:false` en todos
   los objetos; `required` completo). El prompt incluye TODOS los datos: sospechosos
   con descripciones psicológicas, salas con descripciones, armas, y pide una trama
   elaborada, coherente, no repetitiva, adaptada al espacio y a las personas.
   Emitir `{type:'text', delta}` con fragmentos del texto conforme llega (sirve como
   indicador de progreso). Al terminar, parsear JSON, validar ids contra la partida
   (murdererId/weaponId/roomId deben existir; si no, corregir eligiendo válidos).
3. **documents**: por cada sospechoso, montar `PlayerDocument` con el renderizador
   (plantilla HTML tematizada, SIN llamada extra a la API: usa los datos del Plot).
   El dosier incluye: portada con título/tagline, su personaje (persona pública,
   secreto, coartada, motivo, gancho personal, foto si hay), la víctima y sinopsis,
   reglas del juego en vivo explicadas para novatos, lista de sospechosos (nombres
   y fotos públicas), armas (con fotos), mapa del tablero (SVG inline generado
   server-side desde BoardLayout, o la foto aérea con chinchetas en modo aerial),
   y cronología pública de la velada. NUNCA revelar la solución ni secretos ajenos;
   el documento del ASESINO sí le revela que es el asesino con instrucciones.
   Además un documento extra `suspectId: 'gm'` — "Dosier del Game Master" — con la
   solución completa, guion y todas las pistas.
4. Guardar `plot`, `documents`, `status:'ready'` y emitir `{type:'done', game}`.

**Modo demo**: generador local `demoPlot.ts` que produce un `Plot` completo y digno
(plantillas en español con variaciones aleatorias, asignación aleatoria de asesino/
arma/sala) para que el flujo entero funcione sin API key.

## Meta-prompt de estilo (server/src/plot/style.ts)

`settings.stylePrompt` (máx. `STYLE_PROMPT_MAX` = 600 caracteres) es una
indicación libre del Game Master que da un toque personal a la velada: «más
formal», «una comedia disparatada», «ambientado en una estación espacial».

`buildStyleBlock(game)` construye el bloque que se añade **al final del prompt de
usuario** (nunca al system, para no invalidar la caché) tanto en la generación
inicial como en la ampliación de `/refresh`. Ese bloque es lo que garantiza que
el estilo no degrade nada: acota su alcance a tono/ambientación/vocabulario, fija
que ante cualquier conflicto mandan los requisitos estructurales, prohíbe
expresamente recortar profundidad o extensión, y neutraliza el texto como
instrucción (es una preferencia estética, no una orden que pueda cambiar la tarea
ni el formato de salida). Sin estilo, la función devuelve cadena vacía y el
prompt queda idéntico al original.

Se puede fijar desde la pestaña «Estilo» (con presets) o dictándoselo al agente,
que dispone de la herramienta `set_game_style`. El dosier del Game Master incluye
una sección «Tono de la velada» para que conduzca la partida en ese registro.

## Coherencia de la partida (shared/staleness.ts + server/src/plot/refresh.ts)

Tras generar el misterio, el Game Master sigue tocando jugadores, salas y
objetos: la trama y los dosieres quedan desincronizados. `computeStaleness(game)`
—función pura y compartida por cliente y servidor— devuelve un `StalenessReport`
con qué está roto (sospechosos sin personaje, personajes huérfanos, solución que
apunta a entidades borradas, pistas en salas inexistentes, tablero obsoleto,
dosieres que faltan o sobran), un `summary` en español listo para pintar, y
`needsAgent`: si basta con trabajo local o hay que llamar a la IA.

`POST /api/games/:id/refresh` regenera **solo lo necesario**, por orden de coste:
1. Tablero: determinista y gratis, solo si cambiaron las salas.
2. Poda local: se eliminan personajes, pistas y referencias de cronología que
   apuntan a entidades borradas. Gratis.
3. Trama: **solo si `needsAgent`**. Una única llamada a la API con salida
   estructurada (`PLOT_EXTENSION_SCHEMA`) que escribe los personajes que faltan
   encajándolos en la trama existente y, si la solución quedó rota, reescribe
   motivo y relato del crimen. En modo demo lo cubre `generateDemoCharacters`.
4. Dosieres: se reimprimen siempre (gratis) — así se corrigen los que faltan y
   desaparecen los sobrantes.

En la interfaz, el botón principal del estudio tiene tres estados (generar /
actualizar / regenerar desde cero) y el panel de dosieres avisa con el detalle
de qué ha cambiado.

## Generador de tablero (server/src/board/generator.ts)

Determinista. Entrada: `rooms[]`. Salida: `BoardLayout` en rejilla 24×24.
- Colocar las salas alrededor del perímetro (como el Cluedo real): esquinas primero,
  luego bordes, tamaños entre 5×5 y 7×6 celdas, pasillo entre salas.
- Centro: bloque decorativo `centerLabel: 'ESCALERAS'`.
- Pasadizos secretos: ratio clásico de Cluedo (2 túneles por cada 9 salas):
  `numPassages = max(1, round(rooms.length * 2 / 9))`, conectando pares de salas
  diagonalmente opuestas (máxima distancia entre centros, sin repetir sala).

## Cliente — mapa de módulos y contratos

Código base YA ESCRITO (usar, no reescribir):
- `client/src/api/client.ts` — todas las llamadas REST y SSE (`chatWithAgent`,
  `generateGame`, `uploadFile`, `documentUrl`, ...).
- `client/src/state/store.ts` — `useAppStore` de Zustand (estado + acciones; ver fichero).
- `client/src/lib/uiBus.ts` — `onUiCommand` / `emitUiCommand`.
- `client/src/styles/theme.css` — sistema de diseño.

### Rutas (react-router)

- `/` → `CatalogPage` (catálogo de juegos disponibles: CLUEDO activo + próximamente
  D&D, El Misterio de la Momia, Harry Potter con tarjetas bloqueadas).
- `/cluedo` → lista de partidas Cluedo del usuario + crear nueva (con transición de
  entrada al miniverso).
- `/cluedo/:gameId` → `StudioPage` (el estudio de creación).

### Componentes (propiedad por agente, props exactas)

- `pages/CatalogPage.tsx` — catálogo espectacular.
- `components/transition/CluedoTransition.tsx` — props
  `{active: boolean, onComplete: () => void}`. Overlay a pantalla completa
  (framer-motion): puertas de mansión que se abren / lupa / naipes girando,
  al terminar llama `onComplete`.
- `pages/CluedoLobbyPage.tsx` — listar/crear/borrar partidas; al entrar en una,
  reproduce `CluedoTransition` y navega al estudio.
- `pages/StudioPage.tsx` — layout del estudio: cabecera con nombre editable de la
  partida y selector de modelo (de `config.models`), columna izquierda
  `AgentChatPanel`, zona principal con pestañas (`activeTab` del store):
  sospechosos/salas/armas/tablero/documentos + botón destacado GENERAR
  (`GenerateOverlay`). Suscribe `onUiCommand` para popup/highlight/navigate/
  start_generation → acciones del store (y renderiza `AgentPopups`).
- `components/agentchat/AgentChatPanel.tsx` — props `{gameId: string}`. Chat SSE con
  el agente (streaming de texto), entrada por voz con Web Speech API
  (`webkitSpeechRecognition`, `lang:'es-ES'`, botón micrófono con estado grabando),
  emite a `emitUiCommand` los eventos `ui`, actualiza el store con `entities`.
- `components/agentchat/AgentPopups.tsx` — sin props; lee `popups` del store,
  tarjetas animadas estilo "naipe de mansión" con auto-cierre.
- `components/studio/SuspectsPanel.tsx`, `components/studio/RoomsPanel.tsx`,
  `components/studio/WeaponsPanel.tsx` — sin props; leen/mutan store. Formularios
  con nombre, (email para sospechosos), descripción y subida de foto (uploadFile →
  photoUrl). RoomsPanel además: modo de tablero (`generated` | `aerial`); en aerial,
  subir foto aérea (`patchGame({boardImageUrl, boardMode:'aerial'})`) y colocar
  chinchetas clicando sobre la imagen (crea sala con `pin:{x,y}` relativo 0..1,
  chinchetas arrastrables/editables).
- `components/board/BoardView.tsx` — sin props; lee `game` del store. Modo
  `generated`: SVG grande del tablero desde `game.board` (rejilla, salas con
  nombres, pasadizos como líneas discontinuas doradas con icono, centro decorado,
  estética Cluedo). Modo `aerial`: la foto con chinchetas numeradas y leyenda.
  Botón "Recalcular tablero" → `regenerateBoard()`.
- `components/documents/DocumentsPanel.tsx` — sin props; si `game.documents` existe,
  rejilla de tarjetas por jugador (+ GM) con vista previa en `<iframe
  src={documentUrl(...)}>` en modal y botón de descarga (`documentUrl(..., true)`);
  si no, estado vacío invitando a generar.
- `components/generate/GenerateOverlay.tsx` — sin props; overlay cinematográfico a
  pantalla completa mientras `generating` (humo, lupa, texto de etapa
  `generationStage`, log en vivo `generationLog`); expone el arranque via una
  función exportada `startGeneration()` que usa `generateGame` de la api + store
  (el StudioPage y el comando `start_generation` la llaman).

### Flujo del comando de UI del agente

`AgentChatPanel` recibe SSE `{type:'ui', command}` → `emitUiCommand(command)`.
`StudioPage` hace `onUiCommand`: `popup` → `pushPopup`; `highlight` →
`setHighlight(target)` (y limpiar tras ~3.5s); `navigate` → `setActiveTab`;
`start_generation` → `startGeneration()`. Los paneles aplican la clase
`.agent-highlight` cuando `highlight === <su target>`.

## Documentos HTML (server/src/docs/renderer.ts)

Autocontenidos (CSS embebido en `<style>`, misma paleta/fuentes que la web con
`@import` de Google Fonts). Diseño digno de imprimir: portada, secciones con
ornamentos art-decó, tarjetas de sospechosos/armas con imágenes (usar URLs
absolutas `http://localhost:5174/uploads/...` NO — usar rutas relativas `/uploads/...`
y además incrustar como data URI si el fichero existe en disco para que el HTML
descargado funcione offline). El SVG del tablero se genera con una función
`renderBoardSvg(board, rooms)` compartida en el mismo fichero.

## Notas de calidad

- La experiencia debe sentirse premium: transiciones suaves (framer-motion),
  microinteracciones, jerarquía tipográfica clara, nada de "AI slop" genérico.
- Responsive razonable (≥1024px prioritario; usable en tablet).
- Manejar estados vacíos con elegancia (ilustraciones tipográficas, invitaciones).
- Errores de API → mensajes discretos en español (toast simple o texto en panel).

## Despliegue y dominio (despliegue/, harkania.com)

Un solo origen sirve todo: taller, API, documentos legales y páginas de
aterrizaje. **No hay `api.harkania.com`** y es deliberado — las cookies se emiten
sin atributo `Domain`, así que son host-only y no cruzarían al subdominio.

Reglas que cuestan un incidente aprender:

- **`PUBLIC_ORIGIN` es obligatoria en producción** y el servidor se niega a
  arrancar sin ella. Con ella se fabrica la `redirect_uri` de Google (que exige
  coincidencia carácter por carácter) y de ella cuelga el flag `secure` de las
  cookies. Sacarla de la cabecera `Host` la pone en manos de quien llama.
- **`NODE_ENV=production` va en la unidad de systemd**, no solo en el fichero de
  entorno. De ella cuelgan seis comportamientos, entre ellos que el puerto no
  quede expuesto y que el servidor no caiga al JSON local si Atlas parpadea.
- **En producción se escucha solo en `127.0.0.1`.** Con `trust proxy` a 1, quien
  alcance el puerto directamente es el primer salto y dicta `X-Forwarded-*`.
- **Dos ficheros de nginx, no uno.** El definitivo apunta a un certificado que
  aún no existe; certbot necesita un nginx en pie. Ver `despliegue/LEEME.md`.
- **`/.well-known/*` son rutas de Express, no ficheros estáticos.** El comodín
  del taller devolvía `index.html` con estado 200 para cualquier ruta
  desconocida: Apple y Google daban la verificación por buena y luego no
  funcionaba nada. El comodín ahora responde 404 para `/api/` y `/.well-known/`.
- **El fichero de Apple se escribe por INCLUSIÓN.** Por exclusión, iOS reclama
  el dominio entero para la app, incluido el taller.
- **La app no habla con Google.** Google no admite esquemas propios
  (`harkania://`) en la dirección de vuelta de ningún tipo de cliente. La app
  abre `/api/cuenta/entrar/google?destino=app` y recibe un código de un solo uso.
