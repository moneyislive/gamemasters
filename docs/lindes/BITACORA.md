# Bitácora de Las Lindes

**Para quien retome esto sin contexto** —incluido el temporizador de dos horas—:
esto dice dónde está el trabajo, qué queda y cuál es el siguiente paso. Se
actualiza al terminar cada capa, nunca al empezarla: una casilla marcada aquí
significa «escrito Y comprobado», y si no lo significa, esta bitácora miente y
deja de servir para lo único que sirve.

- **Árbol:** `C:\Users\QWERTY\Documents\GameMasters-lindes`
- **Rama:** `lindes`, nacida de `main` en `865135d` (la app 1.6.0, con El Burgo dentro).
- **Diseño:** `docs/lindes/DISENO.md`. Si algo de la bitácora no coincide con él, gana el diseño.
- **Batería:** `npm run verificar` desde la raíz del árbol. Nunca `| tail`: el
  código de salida es lo que manda.

## Estado

| Capa | Qué es | Estado |
|---|---|---|
| 0 | Árbol, rama, `node_modules`, CRLF normalizado, typecheck en verde | **hecho** |
| 1 | `docs/lindes/DISENO.md` — el plano | **hecho** |
| 2 | `shared/arcade/juegos/lindes-losas.ts` — las 24 losas y el reparto de 72 | **hecho** |
| 3 | `lindes-cosas.ts` y `lindes.ts` — reglas, reductor, opciones, proyección | **hecho** |
| 4 | El tablero declarado, dentro de `lindes.ts` | **hecho** |
| 5 | Alta en `shared/arcade/juegos/index.ts` | **hecho** |
| 6 | `server/scripts/verificar-lindes.ts` + entrada en la batería | **hecho** — 13.295 comprobaciones |
| 7 | `escenas/lindes/` — la losa en tres dimensiones, procedural | pendiente |
| 8 | `shared/arcade/juegos/lindes-en-tres.ts` — vista ⇄ escena | pendiente |
| 9 | `escritorio/src/lindes-en-tres.tsx` + fila en `pintores.ts` | pendiente |
| 10 | `app/src/arcade/lindes-en-tres-escena.tsx` + fila en `pintados.ts` | pendiente |
| 11 | El lobby propio + fila en `escenas/embarcadero/tema.ts` | pendiente |
| 12 | El paseo en primera y tercera persona sobre el tablero | pendiente |
| 13 | Batería entera en verde | pendiente |

## Siguiente paso

Capa 7: `escenas/lindes/` — la losa en tres dimensiones.

## Lo medido hasta aquí

- `verify:lindes`: 13.295 comprobaciones en verde. Diez partidas enteras, 709
  losas puestas, 397 labriegos plantados; se cerraron 62 villas, 66 sendas y 20
  ermitas, y 35 prados cobraron al final.
- Sin tocar el núcleo: `verify:nucleo-quieto`, `verify:pureza`, `verify:fronteras`,
  `verify:procedencia`, `verify:marcador`, `verify:mesa`, `verify:larga`,
  `verify:determinismo` y `oro:arcade` siguen en verde con el séptimo arcade dado
  de alta.

## Deudas apuntadas

- **`oro:arcade` y `verify:determinismo` todavía no juegan a Las Lindes.** Los dos
  nombran juegos uno a uno; meter éste es barato y hay que hacerlo antes de
  fusionar, o el maestro de oro no congela su comportamiento.

## Lo que NO se hace, y por qué

- **IR Engine no entra.** El §2.1 de `docs/MOTOR-DE-ARCADE.md` lo descarta por
  tres bloqueos independientes, y el primero es legal: CPAL-1.0 §15 cuenta
  servir por red como distribuir, así que desplegar en Render obligaría a
  publicar GameMasters entero. El paseo en primera y tercera persona se hace con
  la capa 3D que esta casa ya tiene (`@react-three/fiber` + `three`), que es la
  misma con la que andan los aventureros de El Muelle y de La Plaza.
- **Ni la palabra ni el arte del juego del que salen estas reglas.** Las reglas
  y el reparto de losas no son objeto de copyright; el nombre y el dibujo sí.
  Ver el §0 del diseño.
