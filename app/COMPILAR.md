# Compilar la app con EAS

`eas.json` no admite comentarios, así que lo que hay que saber está aquí.

## Las dos trampas del perfil

**1. El perfil por defecto NO sirve para instalar a mano.** El perfil
`production` produce un *app bundle* (`.aab`), que es lo que pide Google Play y
lo que **no se puede instalar** en un teléfono: al descargarlo no pasa nada. Por
eso existe el perfil `apk`, que es el que hay que usar mientras se reparta desde
`harkania.com/descargar`.

**2. `EXPO_PUBLIC_API_URL` se congela al compilar.** La app decide con qué
servidor habla a partir de esa variable, y se resuelve **en el momento de la
compilación**, no al arrancar. Un APK compilado sin ella apunta a
`http://localhost:5174` — que en un móvil es el propio móvil — y no funciona en
ningún teléfono que no sea el de quien programa. No da un error claro: dice que
no puede hablar con el servidor, exactamente igual que si no hubiera cobertura,
y todo el mundo culpa al wifi de la casa.

Por eso cada perfil de `eas.json` lleva la suya escrita. **Comprueba que la del
perfil `apk` es la dirección real de tu servidor antes de compilar**, o
repartirás una app que no habla con nadie.

## El comando

```bash
npx eas-cli@latest build --platform android --profile apk
```

La primera vez pedirá iniciar sesión, creará el proyecto y generará el almacén
de claves de Android. **Ese almacén se queda en tu cuenta de Expo y no se puede
cambiar una vez publicada la app en Google Play**: si se pierde, la aplicación
publicada no se puede volver a actualizar nunca y hay que subir otra distinta.
Guarda una copia con `eas credentials`.

Al terminar da una URL de descarga alojada por Expo. Sirve para probar, pero
**caduca**, así que no es la que se pone en `APK_URL`: descarga el fichero,
publícalo como archivo adjunto de una *release* en GitHub y usa esa dirección,
que no caduca y sirve el fichero con las cabeceras que Android necesita.

## La huella para los enlaces profundos

Cuando quieras que `https://harkania.com/i/…` abra la app en vez del navegador:

```bash
npx eas-cli@latest credentials --platform android
```

Copia la huella **SHA-256** del certificado de *producción* —no el de
desarrollo— a la variable `ANDROID_CERT_SHA256` del servidor. Con la de
desarrollo los enlaces funcionan en tu móvil y en ningún otro, que es de las
cosas más difíciles de diagnosticar que hay.

## Subir una versión nueva

1. Sube `versionCode` en `app.json` (Android no instala encima una versión igual
   o menor, y falla sin decir por qué).
2. Compila con el perfil `apk`.
3. Publica el fichero en una *release* nueva de GitHub.
4. Cambia `APK_URL` y `APK_VERSION` en el panel del servidor.

Quien ya tenga la app instalada **no se entera**: fuera de la tienda no hay
actualización automática. Por eso la página de descarga muestra el número de
versión.
