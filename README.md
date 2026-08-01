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
3. Rellena las tres variables marcadas como secretas en el panel de Render:
   `ANTHROPIC_API_KEY`, `MONGODB_URI` y `APP_PASSWORD`.
4. En MongoDB Atlas, **Network Access**: añade `0.0.0.0/0` para que Render pueda
   conectar (sus IP de salida no son fijas en el plan gratuito).

### Acceso restringido

Con `APP_PASSWORD` definida, la aplicación entera queda tras una pantalla de
contraseña: la API, las fotos subidas y los dosieres. Sin esa variable la
aplicación queda **abierta**, cosa razonable en local pero no en internet, donde
cualquiera con la URL podría gastar tu clave de API.

La sesión es una cookie `httpOnly` firmada con la propia contraseña, sin estado
en el servidor: sobrevive a los reinicios y cambiar la contraseña cierra todas
las sesiones abiertas.

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
