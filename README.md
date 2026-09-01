# 🔎 GameMasters

Plataforma web para **Game Masters**: organiza juegos reales con ayuda de agentes de IA
especializados en el lore de cada juego. Primer juego disponible: **CLUEDO** — un
miniverso visual años 20 donde un agente experto te guía para crear una partida en vivo
con trama procedural adaptada a tus jugadores, tu espacio físico y tus objetos.

## Características

- 🎩 **Agente de CLUEDO** (Claude Fable 5, configurable a modelos más económicos):
  conoce las reglas oficiales, el lore y la psicología de jugadores. Puedes hablarle
  por texto **o por voz**, y puede rellenar datos por ti e invocar popups y
  resaltados en la interfaz para guiarte.
- 🕵️ **Sospechosos, salas y armas** con descripciones y fotos; las descripciones
  psicológicas de cada persona se usan para tejer una trama a su medida.
- 🗺️ **Tablero procedural** estilo Cluedo con pasadizos secretos al ratio clásico,
  o **modo foto aérea**: sube una foto del espacio real y coloca chinchetas.
- ✒️ **Estilo de la velada**: un meta-prompt opcional (formal, disparatado,
  espacial, terror gótico…) que condiciona el tono de la trama y los dosieres
  sin tocar las reglas ni la profundidad del misterio.
- 📜 **Dosieres HTML por jugador**: documentos tematizados, exportables y
  autocontenidos con su personaje, secretos, reglas, mapa y cronología. Incluye el
  dosier completo del Game Master con la solución.
- 🧪 **Modo demo** sin API key: todo el flujo funciona con generador local.

## Puesta en marcha

```bash
npm install
copy .env.example .env   # y rellena ANTHROPIC_API_KEY / MONGODB_URI si las tienes
npm run dev
```

- Cliente: http://localhost:5173
- API: http://localhost:5174

Sin `MONGODB_URI` se usa almacenamiento local en `server/data/db.json`.
Sin `ANTHROPIC_API_KEY` la plataforma entra en modo demo.

## MongoDB Atlas

1. Crea una cuenta en [Atlas](https://www.mongodb.com/cloud/atlas) y un clúster
   gratuito **M0**.
2. **Database Access** → *Add New Database User*: usuario y contraseña. Si la
   contraseña lleva `@ : / ? # &`, tendrás que escribirla codificada en la URI
   (por ejemplo `@` → `%40`); lo más cómodo es generar una sin esos caracteres.
3. **Network Access** → *Add IP Address* → «Add Current IP Address». Sin esto la
   conexión caduca por tiempo de espera sin decir por qué.
4. **Database** → *Connect* → *Drivers* → copia la cadena y pégala en `.env`:

   ```
   MONGODB_URI=mongodb+srv://usuario:contrasena@cluster0.ab1cd.mongodb.net/?retryWrites=true&w=majority
   ```

   La cadena que da Atlas **no incluye nombre de base de datos**; en ese caso la
   plataforma usa `gamemasters`. Puedes forzar otra con `MONGODB_DB=` o
   escribiéndola en la propia URI antes del `?`.
5. Comprueba la conexión antes de arrancar:

   ```bash
   npm run verify:mongo -w server
   ```

   Hace un ciclo completo de escritura, lectura y borrado, limpia lo que crea y,
   si algo falla, indica la causa probable (credenciales, filtro de IP o DNS).

Al arrancar, el servidor indica qué almacenamiento está usando, y `/api/config`
lo expone como `storage: "mongo" | "file"`. Si la conexión falla, la plataforma
no se cae: avisa por consola y sigue con el fichero JSON.

## Publicar en internet (Render)

La aplicación **no** es una web estática: necesita un proceso Node vivo. GitHub
Pages no sirve, y Vercel/Netlify tampoco encajan como servidor, porque sus
funciones cortan a los 10–60 segundos (generar la trama tarda minutos) y su
disco es efímero (las fotos subidas se perderían). La opción natural es un
servicio persistente: **Render**, Railway o Fly.io.

En producción **un único servicio sirve la web y la API**, así que no hay CORS ni
URLs que configurar: el cliente ya pide `/api` en ruta relativa.

1. Sube el repositorio a GitHub:

   ```bash
   git remote add origin https://github.com/TU-USUARIO/gamemasters.git
   git push -u origin main
   ```

2. En [Render](https://render.com) → **New** → **Blueprint** → elige el
   repositorio. Detectará el [`render.yaml`](render.yaml) incluido, que ya define
   el build, el arranque, el disco persistente para las fotos y el healthcheck.
3. Rellena las variables secretas en el panel de Render (**Environment**). No
   todas pesan lo mismo, y la única distinción que importa aquí es si el
   servicio llega a levantar.

   **Sin estas, el servidor se niega a arrancar en producción.** Lo comprueba
   `comprobarArranque()` en `server/src/index.ts`, antes de escuchar, y es
   deliberado: negarse a arrancar se arregla en cinco minutos con el motivo
   delante, y arrancar mal no se arregla nunca porque nadie se entera.

   - `PLAYER_TOKEN_SECRET` — firma la cookie del taller, los pasaportes de
     cuenta y las credenciales de los jugadores. Mínimo 32 caracteres, y se
     elige **una vez**: cambiarlo invalida todas las sesiones a la vez.
     Genéralo con
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   - `APP_PASSWORD` — la contraseña de la casa. Qué cierra exactamente, más
     abajo.
   - `MONGODB_URI` — la base de datos. Sin ella el servidor **no daría ningún
     error**: `initStore()` se salta la rama de Mongo y cae al fichero JSON
     local, que en un contenedor es el sistema de ficheros efímero. La salud
     contesta que sí, Render da el despliegue por bueno y la gente monta
     veladas y juega con normalidad… hasta que el siguiente `git push` se lleva
     el disco y con él semanas de partidas, días después y sin que nada
     relacione una cosa con la otra. La guarda mira **la variable, no la
     conexión**: atar el arranque a que Atlas conteste en ese instante dejaría
     el servicio sin levantar por un parpadeo de red que se arregla solo.
   - `PUBLIC_ORIGIN` — no hay que teclearla, `render.yaml` ya la trae con valor.
     Está en esta lista porque el día que apuntes un dominio propio la vas a
     tocar, y también se niega a arrancar si queda **mal escrita**: `harkania.com`
     sin el `https://` no se lee como dirección. De ella cuelgan la dirección de
     vuelta que se le da a Google y el flag `secure` de las cookies.

   Y una que impide arrancar **por estar puesta**: cualquier `OIDC_ISS_*` u
   `OIDC_JWKS_*`. Son costuras para probar la verificación de identidad contra
   claves propias, y activas en producción dejan que cualquiera con un servidor
   de claves se fabrique la identidad de quien quiera.

   **Opcionales**: el servicio levanta sin ellas, con menos cosas dentro.

   - `ANTHROPIC_API_KEY` — sin ella la plataforma arranca en **modo demo**, con
     el generador local: se navega todo el flujo, pero no hay tramas de verdad.
   - `GOOGLE_CLIENT_IDS`, `APPLE_CLIENT_IDS`, `GM_ADMITIDOS` — entrar con cuenta
     de proveedor. Sin tu correo en `GM_ADMITIDOS`, tu propia cuenta de Google
     no abre el taller.
   - `TRIPO_API_KEY`, `GEMINI_API_KEY` — avatares 3D y fondos generados.
   - `APK_VERSION`, `APK_REPO`, `APK_URL` — la descarga del APK mientras no haya
     tienda. Sin ellas, `/descargar` lo dice en vez de enseñar un botón muerto.
   - `LEGAL_NIF`, `LEGAL_DIRECCION` — los datos del responsable en el aviso legal.

   Aquí ponía «rellena las tres variables marcadas como secretas:
   `ANTHROPIC_API_KEY`, `MONGODB_URI` y `APP_PASSWORD`», y esa lista fallaba por
   los dos lados. Marcadas con `sync: false` hay catorce, no tres. Y de las tres
   nombradas, la única que **no** impide arrancar es precisamente
   `ANTHROPIC_API_KEY`, mientras que faltaba `PLAYER_TOKEN_SECRET`, que sí:
   quien siguiera la instrucción al pie de la letra ponía las tres, daba el
   despliegue por hecho, y se encontraba un servicio que no levanta con el
   motivo únicamente en el registro del despliegue.

4. En MongoDB Atlas, **Network Access**: añade `0.0.0.0/0` para que Render pueda
   conectar (sus IP de salida no son fijas en el plan gratuito).

### Acceso restringido

`APP_PASSWORD` cierra **el taller** —crear, generar y dirigir veladas—, no la
aplicación entera. Aquí decía que con ella «la aplicación entera queda tras una
pantalla de contraseña: la API, las fotos subidas y los dosieres», y es falso:
hay cinco routers montados bajo `/api` **por delante** del guardián, además de
todo lo que vive fuera de ese prefijo. No es un descuido pendiente de arreglar, es el
reparto que sostiene los dos motores de la plataforma: **quien juega no conoce
la contraseña de la casa, ni tiene por qué conocerla.** Quien despliega necesita
saber dónde cae esa línea.

El guardián es una sola línea de `server/src/index.ts`: `app.use('/api',
requireAuth)`. Lo que se monta **después** queda detrás; lo que se monta antes,
delante. Y antes hay cinco, cada uno con su motivo:

- `/api/auth/*` (`authRouter`) — la puerta misma. Detrás de sí misma no habría
  forma de iniciar sesión.
- `/api/jugar/*` (`jugarRouter`) — la app del jugador. Su credencial es el
  testigo firmado que recibe al emparejar el móvil con el código de invitación,
  y lo comprueba un guardián propio montado por delante de todas sus rutas —en
  un único punto, no repetido ruta por ruta, que es donde se olvida.
- `/api/arcade/*` (`arcadeRouter`) — la Sala de Arcade. Un arcade **no tiene
  Game Master**: cuatro personas abren una mesa con un código de cinco letras y
  juegan, sin taller, sin cuenta y sin correo. Su puerta es la llave de asiento
  que el servidor reparte al sentarse, en la cabecera `x-asiento`; sin ella se
  puede mirar una mesa como espectador y no se mueve ni una carta. Montarlo
  detrás del guardián sería exigir la contraseña del estudio de misterios para
  echar una partida de cartas de cinco minutos, que es justo el acoplamiento
  con el taller que el segundo motor existe para no tener.
- `/api/cuenta/*` (`cuentaRouter`) — entrar con Google o Apple desde la app. Va
  con los anteriores por lo mismo, y autoriza con el pasaporte de cuenta, que
  viaja en su propia cabecera.
- `/api/generacion/*` (`generacionRouter`) — avatares y fondos, que los pide
  quien juega desde su móvil. Su puerta la pone él: cualquier identidad de la
  plataforma más el tope diario de gasto.

Fuera de `/api` no hay guardián en absoluto, porque `requireAuth` se monta sobre
ese prefijo y no sobre la aplicación. También es deliberado, y cada caso tiene
su razón: las páginas legales (`/privacidad`, `/aviso-legal`, `/terminos`), que
las tiendas exigen legibles sin instalar nada; los ficheros de `/.well-known/`,
que Apple y Google piden sin credencial ninguna; el aterrizaje de las
invitaciones (`/i/:sobre`, `/e/:codigo`), donde cae quien pulsa el enlace sin la
app puesta —y que se monta sin prefijo, así que su `POST /api/invitacion/abrir`
también queda delante: dice a qué velada te han llamado, que es navegación y no
autorización; la credencial de jugador sigue saliendo de un único sitio—;
`/descargar`, `/jugar` (la app en el navegador, para todo iPhone) y
`/sala` (la Sala de Arcade para PC), por el mismo motivo que sus routers de API;
`/api/salud`, que es la sonda de Render y por eso no cuenta nada de cómo está
montada la casa; y el cliente compilado, que se sirve a cualquiera — lo que
enseña sin contraseña es la pantalla que la pide.

**Detrás** quedan el taller y sus datos, que es donde está el misterio: las
partidas (`/api/games`, con la solución del caso dentro), las entidades, el chat
con el agente, la generación y ampliación de trama, la sesión en vivo, el correo
y los dosieres (`/api/documents`). También los ficheros de `/uploads`: las fotos
de los invitados son parte del misterio y además son personas reales. De ahí
sale una consecuencia que conviene conocer al depurar: las fotos que necesita la
app del jugador **no** se sirven por `/uploads` —la app no tiene la contraseña y
en producción todas saldrían rotas—, sino por `/api/jugar/foto/:gameId/:archivo`,
con una firma que ata cada foto a su partida.

Sin `APP_PASSWORD` el servidor **no arranca en producción** (es una de las
comprobaciones del paso 3). Fuera de producción sí arranca, y entonces el taller
queda abierto: razonable en el portátil de casa, no en internet, donde
cualquiera con la dirección leería la solución del caso, descargaría los
dosieres y gastaría tu clave de API.

La sesión del taller es una cookie `httpOnly` sin estado en el servidor:
sobrevive a los reinicios y a varios contenedores a la vez, y cambiar la
contraseña sigue cerrando todas las sesiones abiertas. Lo que ha cambiado es con
qué se firma. Aquí ponía «firmada con la propia contraseña», y era verdad y era
el agujero: una contraseña que elige una persona no es una clave criptográfica,
y las credenciales que se reparten a los invitados llevaban esa misma clave, así
que cada uno tenía un par (texto conocido, firma) con el que probar candidatas
sin conexión —SHA-256 sin endurecer, minutos desde un móvil—. Hoy se firma con
`PLAYER_TOKEN_SECRET` y la contraseña viaja **dentro del mensaje**, que es
exactamente lo que conserva el cierre de sesiones al cambiarla.

### Aviso sobre el plan gratuito

El plan gratuito de Render duerme el servicio tras 15 minutos sin visitas, y
despertarlo tarda unos 30 segundos. Para una velada de verdad, entra un rato
antes o usa el plan de pago.

## Estructura

```
client/   React + Vite (miniverso CLUEDO, estudio de creación, tablero SVG, dosieres)
server/   Express + Mongoose/JSON + agente Anthropic (chat SSE, tools de UI, pipeline de trama)
shared/   Tipos compartidos (contrato central)
```

Detalles de diseño y contratos: [ARCHITECTURE.md](ARCHITECTURE.md).
