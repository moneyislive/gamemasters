# Cada juego, el suyo

**Qué se aisló la noche del 29 al 30 de agosto de 2026, qué se generalizó, y qué peajes siguen cobrándose.**

---

## 1. El problema, en una frase

La plataforma tenía tres juegos y **CLUEDO era el respaldo de todos ellos**. No por diseño: por acumulación. El patrón dominante del manifiesto era «si el juego no lo declara, se usa lo de CLUEDO», y ese respaldo silencioso es exactamente la forma de que un juego nuevo se estrene enseñando el material de otro sin que nadie lo note.

Se veía en las dos direcciones a la vez. La Momia leía «Comienza la ronda» encima de un cuerpo que decía «Vigilia 3 de 5»; y la tabla de rótulos de CLUEDO llevaba dentro «Se abre El Sellado», que es el nombre de una fase de la Momia.

---

## 2. Lo que ahora declara cada juego, y ya no hereda

| Qué | Dónde se declara | Qué pasaba si no |
|---|---|---|
| **El dosier del móvil** | `manifiesto.dosier` — obligatorio, sin respaldo | Una pantalla común decidía por los tres; reorganizarla para CLUEDO borraba material de los otros |
| **Los trofeos por reglas** | `registrarTrofeos` | «Crimen perfecto» se le daba al saqueador de la Momia **las noches en que perdía** |
| **Quién gana** | `registrarVeredicto` | El historial anotaba «no ganó nadie» en una noche con diez ganadores |
| **Quién escribe la trama** | `registrarGenerador` | Un ternario con CLUEDO por defecto: al juego nuevo le generaban un asesinato |
| **La voz del asistente** | `registrarVoz` | Edmund el mayordomo explicando pasadizos en una expedición egipcia |
| **Los rótulos de los telones** | `manifiesto.rotulosDeAviso` | Título de un juego sobre el cuerpo de otro, a pantalla completa |
| **Los colores del plano** | `TABLEROS` en `tema-juego.ts` | La Tumba dibujada sobre el fieltro verde de una mesa de casino |
| **Qué pantalla sustituye** | `src/pantallas.ts` | Cuatro `if (juego === 'momia')` repartidos por dos ficheros |

La regla de fondo: **lo que es DATO va al manifiesto; lo que es «y entonces…» va a un registro** anclado con `Symbol.for`. Hay siete registros y todos se dan de alta en `juegos/instalados.ts`.

---

## 3. Los peajes que un juego ajeno todavía paga

`npm run verify:ajeno` monta **La Almoneda**, una subasta sin ejes, sin lugares, sin pistas, sin víctima y sin personajes. Funciona: 30 comprobaciones. Y al terminar imprime lo que ha tenido que fingir. Quedan **cinco**:

1. **`Plot` exige `victim`, `synopsis`, `setting` y `solution`.** `vistaDeJugador` empieza con `if (!plot) return null`, así que un juego sin crimen se inventa una víctima llamada «—».
2. **`PlotCharacter` exige `secret`, `motive`, `alibi` y `personalHook`** por persona, aunque nadie interprete a nadie.
3. **Los NOMBRES de las fases son los de CLUEDO.** Ya no hay que declararlas todas —la tabla es parcial— pero una subasta sigue llamando `ronda-abierta` a «se canta un lote». Abrir `LivePhase` a cadena libre es el paso siguiente y toca la máquina de estados y los rótulos de la app.
4. **La categoría de personas TIENE que ir a `suspects`.** El emparejamiento de los móviles, los dosieres y los correos leen ese campo a pelo.
5. **`VistaJugador` obliga a mandar salas, objetos, pistas y cronología vacías.** Cuesta poco —un array vacío— pero está.

Se pagaron dos esa noche (las fases exhaustivas y el `ronda` obligatorio) y uno más que era una capacidad de verdad: **una acción ya puede pedir un número** (`pideNumero`), con el motor validándolo y el móvil pintándolo.

---

## 4. La red que ahora existe

- **`npm run verify:juegos`** (147) — recorre `juegosInstalados()`, así que un juego nuevo entra solo. Comprueba que lo declarado esté implementado: acciones con reductor, fases con ruta, generador y voz dados de alta, dosier coherente, medallas que no se cruzan, y que **el material de cada juego se renderice y no use el vocabulario de otro**.
- **`npm run verify:ajeno`** (30) — el juego que no comparte nada, y la lista de peajes.
- **`verificar-tema.mjs`** — reescrito: **no leía ni un fichero del proyecto**, así que no podía fallar nunca. Ahora ejecuta `tema.ts` de verdad y exige que las cuatro tablas por juego cubran los mismos juegos.
- **`verificar-app.mjs`** (82) — guarda nueva contra tablas de módulo escritas antes de lo que nombran (`Cannot access X before initialization` al importar, o sea la app en blanco).

Cada regla nueva se probó **rompiéndola** y viendo fallar su comprobación. Dos veces la rotura salió verde y estuvo bien que saliera: una porque la había metido en una rama de respaldo que no se ejecuta, y otra porque el gancho de trofeos se traga las excepciones y devolvía lista vacía. Las dos veces el arreglo fue de la prueba, no del código.

---

## 5. Lo que sigue pendiente

- **Abrir `LivePhase`** a cadena libre (peaje 3). Es el bloqueo de fondo §6.1 del informe de arquitectura.
- **`manifiestoDe` cae a CLUEDO en silencio** para cualquier id desconocido, y lo llaman unos cuarenta sitios.
- **El catálogo del taller es una lista escrita a mano**: un juego registrado que no esté en `GAMES` no tiene tarjeta y no se puede abrir.
- **`palabras.ts`** (taller) sigue siendo una tabla cerrada con CLUEDO de respaldo.
- **La selección de secciones del dosier impreso no la lee nadie** en la Momia ni en las Sombras: los interruptores del taller no hacen nada allí.
- **El bloque `desenlace` de la vista** anuncia un `ganador` singular calculado con `winnerId`. No se ve en la mesa —los dos juegos tienen pantalla propia de final— pero el dato viaja mal.
