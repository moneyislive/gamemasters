# GameMasters · la app de los jugadores

App móvil para jugar la partida sin papel. Un jugador entra con dos códigos, ve
su personaje, elige sala en cada ronda, lee lo que encuentra, toma notas,
pregunta al consejero y acusa. Gana quien acierte primero.

## Stack y por qué

**Expo (React Native) + Expo Router.** Un solo código TypeScript para iOS,
Android y web, compartiendo `shared/types.ts` y `shared/live.ts` con el
servidor. Se descartó Flutter porque partiría el repositorio en dos lenguajes y
perdería ese contrato común; y Electron porque doce invitados a una cena llevan
móvil, no portátil.

## Probarla ahora mismo

```bash
cd app
npx expo start
```

Escanea el QR con la app **Expo Go** (iOS o Android). Para verla en el
navegador, `npx expo start --web`.

La app necesita saber dónde está el servidor. Por defecto usa
`http://localhost:5174`; para otra dirección:

```bash
EXPO_PUBLIC_API_URL=https://tu-servidor npx expo start
```

o cámbiala desde la propia pantalla de entrada, en «Cambiar de servidor».

## Cómo se entra

No hay registro ni contraseñas. El Game Master abre la partida en su taller
(pestaña **En vivo**) y reparte dos códigos:

- El **código de la partida**, que dicta en voz alta a toda la mesa.
- Un **código personal** por jugador, que entrega solo a esa persona.

La cuenta es el correo que el Game Master escribió al montar la partida: ahí se
guardan el historial y los trofeos. Quien no tenga correo juega igual, pero esa
velada no se le apunta.

## Antitrampas

El móvil **nunca recibe la trama**. El servidor proyecta por jugador y por
ronda (`server/src/live/proyeccion.ts`), de modo que abrir las herramientas de
desarrollo no sirve de nada: la solución sencillamente no ha viajado.

Concretamente, nunca salen del servidor: la solución hasta el desenlace, los
secretos y coartadas de los demás, las pistas de salas donde no has entrado, lo
que señala una pista antes de que la ronda cierre, y los giros de otros.

El consejero de IA recibe **exactamente esa misma proyección**, así que tampoco
puede destriparlo por mucho que se le insista: no lo sabe.

## Estructura

```
app/
  app/                 rutas (expo-router)
    index.tsx          entrada con los dos códigos
    (juego)/           las cinco pestañas del juego
    acusar.tsx         la acusación, en tres pasos
    consejero.tsx      el mayordomo al que preguntar
    desenlace.tsx      el cierre, revelado por partes
  src/
    tema.ts            tokens visuales, calcados de client/src/styles/theme.css
    ui.tsx             marco art-decó, botones, sellos, ornamentos
    api.ts             cliente HTTP y credencial guardada en el dispositivo
    estado.tsx         el bucle que mantiene la partida al día
    avisos.tsx         el telón que celebra cada momento
    reloj.tsx          cuenta atrás sincronizada con el servidor
```

## Tiempo real

No hay WebSocket ni SSE: **long-polling con número de revisión**. El móvil
pregunta «avísame cuando algo cambie desde la revisión N» y el servidor deja la
petición abierta hasta que ocurre. Se eligió así porque React Native no trae un
`EventSource` fiable, porque atraviesa cualquier proxy sin configuración, y
porque la corrección nunca depende del reparto: si un aviso se pierde, la
siguiente petición trae el estado completo igual.

## Publicar en las tiendas

Cuando llegue el momento, `eas build`. Hasta entonces Expo Go basta para jugar,
y el build web funciona en cualquier móvil sin instalar nada.
