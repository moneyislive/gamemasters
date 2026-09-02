# Cómo sacar la app instalable, paso a paso

Escrito para quien no ha hecho esto nunca. Si algo ya lo sabes, sáltatelo.

---

## Antes de nada: qué es cada cosa

**Tu app está escrita en JavaScript**, pero un móvil no ejecuta JavaScript: necesita
un programa ya compilado. Compilar para Android exige normalmente instalar el SDK
de Android, Java y Gradle — varios gigas de herramientas y un buen rato de
configuración.

**Expo** es la caja de herramientas con la que está construida la app. **EAS**
(*Expo Application Services*) es su servicio en la nube: hace la compilación **en
los servidores de Expo**, así que tú no instalas nada de eso. Le mandas el
código, esperas entre diez y veinte minutos, y te devuelve un fichero.

Ese fichero es el **APK**: el instalable de Android, el equivalente a un `.exe`
de Windows. Se puede instalar directamente en un teléfono, sin pasar por Google
Play.

**El recorrido completo es este:**

```
tu código  →  EAS compila en la nube  →  te da un .apk  →  lo publicas en
GitHub  →  tus invitados lo descargan desde harkania.com/descargar
```

Nada de esto toca la App Store ni Google Play. Es más rápido y no hay revisión
de nadie. La contrapartida: **solo funciona en Android**. Apple no permite
instalar aplicaciones fuera de su tienda, punto.

---

## Lo que necesitas tener

- **Node.js** — ya lo tienes, es lo que usas para el resto del proyecto.
- **Una cuenta de Expo** — gratuita. Se crea en el paso 1.
- **Una cuenta de GitHub** — ya la tienes (`moneyislive`).

No hace falta instalar Android Studio, ni Java, ni nada parecido.

---

## Paso 1 · Crear la cuenta de Expo

Ve a **https://expo.dev/signup** y regístrate. Apunta el usuario y la contraseña:
te los va a pedir la terminal dentro de un momento.

> **Por qué importa esta cuenta.** La primera compilación genera la **clave de
> firma** de tu app, que se queda guardada ahí. Android usa esa clave para saber
> que una actualización viene de ti y no de un impostor. **No se puede cambiar
> nunca**: si algún día publicas en Google Play y pierdes esa cuenta, no podrás
> volver a actualizar la app jamás — habría que publicar otra distinta y pedirle
> a todo el mundo que la reinstale. Guarda las credenciales donde guardas las
> cosas importantes.

---

## Paso 2 · Abrir la terminal en la carpeta correcta

Abre **PowerShell** y ve a la carpeta de la app. **Tiene que ser `app`, no la
raíz del proyecto** — EAS busca ahí la configuración:

```bash
cd <la-carpeta-de-este-repositorio>\app
```

Comprueba que estás donde toca. Esto tiene que listar `eas.json`:

```bash
ls eas.json
```

Si dice que no existe, estás en la carpeta equivocada.

---

## Paso 3 · Iniciar sesión

```bash
npx eas-cli@latest login
```

`npx` descarga la herramienta y la ejecuta sin instalarla permanentemente. La
primera vez tarda un minuto y puede preguntar si quieres instalar el paquete:
di que sí.

Te pedirá el usuario y la contraseña de Expo del paso 1. **La contraseña no se
verá mientras la escribes** — ni asteriscos ni nada. Es normal: escríbela a
ciegas y pulsa Enter.

Para confirmar que ha funcionado:

```bash
npx eas-cli@latest whoami
```

Tiene que responder con tu nombre de usuario.

---

## Paso 4 · Apuntar la app a tu servidor

**Este paso es el que más gente se salta y el que más caro sale.**

La app necesita saber a qué servidor hablar, y esa dirección **se graba dentro
del APK en el momento de compilar**. No se puede cambiar después sin volver a
compilar.

Abre `app/eas.json` y busca el bloque `"apk"`:

```json
"apk": {
  "distribution": "internal",
  "android": { "buildType": "apk" },
  "env": {
    "EXPO_PUBLIC_API_URL": "https://harkania.onrender.com"
  }
}
```

Cambia esa dirección por la de tu servidor de verdad, la que te dé Render cuando
lo despliegues.

> **Qué pasa si te lo saltas.** El APK sale apuntando a `localhost`, que dentro
> de un móvil significa «este mismo teléfono». La app se instala, se abre, y al
> intentar entrar dice que no puede hablar con el servidor — exactamente el
> mismo mensaje que si no hubiera cobertura. Nadie sospecha de la compilación:
> todo el mundo culpa al wifi de la casa. Y hay que repetir el proceso entero.

---

## Paso 5 · Compilar

```bash
npx eas-cli@latest build --platform android --profile apk
```

La primera vez te hará tres preguntas:

1. **«Would you like to create a project?»** → **Sí**. Crea el proyecto
   `harkania` en tu cuenta.
2. **«Generate a new Android Keystore?»** → **Sí**. Es la clave de firma del
   paso 1. Que la genere Expo es lo correcto; la guarda él.
3. Puede preguntar por el `package name` → ya está puesto
   (`com.harkania.jugar`), acéptalo.

Y a esperar. La compilación ocurre en los servidores de Expo, así que **puedes
cerrar la terminal**: el trabajo sigue. Entre diez y veinte minutos, más lo que
tarde en llegarle el turno — el plan gratuito tiene cola y un número limitado de
compilaciones al mes.

Puedes seguirlo en **https://expo.dev** → tu proyecto → *Builds*.

> **`--profile apk` no es opcional.** Sin esa parte, EAS usa el perfil de tienda
> y produce un fichero `.aab` (*app bundle*), que es lo que pide Google Play y lo
> que **no se puede instalar** en un teléfono: lo descargas, lo tocas, y no pasa
> absolutamente nada.

---

## Paso 6 · Descargar el fichero

Cuando termine, la terminal (y la página de Expo) te dan un enlace. Ábrelo y
descarga el `.apk`.

**Esa dirección no te sirve para publicarla**, aunque funcione hoy: los enlaces
de Expo caducan. Por eso el fichero hay que ponerlo en un sitio permanente, que
es el paso siguiente.

Si quieres probarlo ya en tu propio móvil, mándate el fichero por Telegram o por
correo y ábrelo desde el teléfono.

---

## Paso 7 · Publicarlo en GitHub

GitHub sirve archivos grandes gratis, con las cabeceras correctas y con una
dirección que no caduca. Es el sitio.

**Antes de subir nada, renombra el fichero.** EAS te lo da con un nombre suyo,
largo y con un identificador dentro. Ponle exactamente este, con el guion y con
**la versión que dice `app/app.json`** —hoy `1.1.1`—:

```
harkania-1.1.1.apk
```

> **El número de aquí sale de `app/app.json`, no de este documento.** Esta guía
> llegó a decir `1.0.0` en los cinco sitios en los que aparece un número, y para
> entonces la app iba por la `1.1.0`: quien la siguiera al pie de la letra
> publicaba `harkania-1.0.0.apk` para una versión que no era —y el botón de
> `/descargar` sale igual y da 404—. Mira `app/app.json` antes de teclear nada.

1. Ve a **https://github.com/moneyislive/gamemasters/releases/new**
2. En *Choose a tag*, escribe `v1.1.1` —la misma versión, con `v` delante— y pulsa **Create new tag**.
3. En *Release title*, pon `v1.1.1`.
4. **Arrastra el fichero ya renombrado** a la caja de abajo («Attach
   binaries…») y espera a que suba del todo. GitHub bautiza el adjunto con el
   nombre que traiga el fichero, así que si se te olvidó renombrarlo, esta es
   la última oportunidad.
5. Pulsa **Publish release**.

Para comprobar que ha quedado bien, en la página de la release **haz clic
derecho sobre el nombre del `.apk` → Copiar dirección del enlace**. Tiene que
salir exactamente esta:

```
https://github.com/moneyislive/gamemasters/releases/download/v1.1.1/harkania-1.1.1.apk
```

> **De dónde sale ese nombre, para no tener que deducirlo otra vez.** No es una
> costumbre ni un capricho: esa dirección la construye el servidor, en la
> función `apk()` de `server/src/enlaces/descarga.ts`, pegando
> `https://github.com/{APK_REPO}/releases/download/v{APK_VERSION}/harkania-{APK_VERSION}.apk`
> — donde `APK_REPO` vale `moneyislive/gamemasters` si no la defines. El
> servidor **no pregunta a GitHub cómo se llama tu fichero**: lo da por
> supuesto. El que tiene que cumplir el patrón eres tú, al subirlo.
>
> **Aquí el ejemplo decía `harkania.apk`, sin la versión, y hoy es falso.**
> Cuando se escribió esta guía lo era: la dirección se ponía entera a mano en
> `APK_URL`, y entonces el fichero podía llamarse como quisieras. Al día
> siguiente se cambió el servidor para deducirla de la versión —por lo que
> cuenta el paso 8— y se actualizó el paso 8, pero este ejemplo se quedó como
> estaba. Quien lo copiara publicaba la release con el nombre corto, y el
> resultado no es un error visible: el botón de `/descargar` **sale igual**,
> porque solo depende de que `APK_VERSION` esté puesta, y da 404 al pulsarlo.
> Justo el fallo que el servidor se rediseñó para hacer imposible, colándose
> otra vez por la puerta de atrás: la documentación.

---

## Paso 8 · Decírselo al servidor

En el panel de Render, en *Environment*, **una sola variable**:

| Variable | Valor |
| --- | --- |
| `APK_VERSION` | `1.1.1` |

Guarda. Render reinicia el servicio solo.

> **No pongas `APK_URL`.** La dirección se deduce de la versión: el servidor
> compone `releases/download/v{versión}/harkania-{versión}.apk` él solo.
>
> Aquí decía que pusieras las dos, y eso es una trampa: si `APK_URL` está
> definida **manda ella y la versión se ignora**. Así que el día que subas
> `APK_VERSION` a la siguiente y te olvides de la otra, la página anunciará la
> nueva y descargará la vieja. Ya pasó una vez con la 1.0.2 —el botón daba 404 y
> la página se veía perfecta— y es lo que motivó que la dirección se dedujera.
>
> `APK_URL` existe solo para cuando el fichero no esté en GitHub o no siga ese
> patrón. Si no es tu caso, déjala vacía.

Entra en `https://tu-servidor/descargar` y comprueba que sale el botón. Si dice
«Todavía no hay descarga», es que `APK_VERSION` no se guardó. Y si el botón sale
pero da 404, es que la release de GitHub no se llama exactamente
`v{versión}` o el fichero no es `harkania-{versión}.apk`: el servidor lo avisa en
su registro al arrancar.

**Y ya está.** Esa dirección es la que le pasas a tus invitados.

---

## Cuando quieras sacar una versión nueva

1. Abre `app/app.json` y sube `"version"` — el número que ve la gente.

   No busques `versionCode`: ya no está, y es a propósito. Android usa ese
   segundo número para decidir si una instalación es más nueva que la anterior,
   y si no sube **el teléfono se niega a instalar encima sin explicar por qué**.
   Como es fácil olvidarlo, lo lleva EAS: `eas.json` tiene `autoIncrement` en el
   perfil `apk`, así que cada compilación recibe el suyo automáticamente.
2. Repite los pasos 5, 6 y 7 (con la etiqueta nueva: si subes a `1.1.1`, `v1.1.1`).
3. Actualiza **solo `APK_VERSION`** en Render.

   El nombre de la etiqueta y el del fichero tienen que cuadrar con ese número:
   etiqueta `v1.1.1` y fichero `harkania-1.1.1.apk`. Si no, el botón sale y da
   404.

Ten en cuenta que **quien ya tenga la app instalada no se entera**: fuera de la
tienda no hay actualización automática. Por eso la página de descarga muestra el
número de versión — para que puedan comparar y volver a descargarla.

---

## Más adelante: los enlaces que abren la app

Cuando quieras que pulsar `https://harkania.com/i/…` abra la app en vez del
navegador, hace falta darle al servidor la huella de tu clave de firma:

```bash
npx eas-cli@latest credentials --platform android
```

Elige el perfil de producción y copia la huella **SHA-256** (una tira larga de
pares separados por dos puntos) a la variable `ANDROID_CERT_SHA256` del
servidor.

Cuidado con cuál copias: si pones la del certificado de *desarrollo*, los
enlaces funcionan en tu móvil y en ningún otro. Es de las cosas más difíciles de
diagnosticar que hay, porque para ti todo va bien.

---

## Si algo falla

| Lo que ves | Qué pasa |
| --- | --- |
| `eas: command not found` | Te falta el `npx eas-cli@latest` delante del comando. |
| `Not logged in` | Repite el paso 3. |
| No encuentra `eas.json` | Estás en la carpeta equivocada: tienes que estar en `app`. |
| El APK se descarga pero al tocarlo no pasa nada | Es un `.aab`, no un `.apk`. Te faltó `--profile apk`. |
| La app se instala pero no conecta | Te saltaste el paso 4. Hay que recompilar. |
| Android dice que bloqueó la instalación | Normal fuera de la tienda. La página `/descargar` explica los dos toques necesarios. |
