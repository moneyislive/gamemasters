# De un juego a muchos

**Informe de arquitectura de la plataforma Harkania, escrito la noche en que entró el segundo juego.**

---

## 1. El veredicto

La plataforma estaba **mejor diseñada de lo que estaba conectada**.

El contrato de juego (`ManifiestoDeJuego`) es la mejor pieza del repositorio: un juego declarado como dato, con sus categorías, ejes, acciones, fases y barra. El motor que ejecuta acciones es genuinamente agnóstico. El registro de juegos existe desde hace meses.

Y sin embargo, al empezar la noche **no se podía jugar a otra cosa que CLUEDO**, y no por una razón, sino por cuatro puertas cerradas en fila:

1. Ninguna ruta HTTP aceptaba declarar de qué juego era una partida.
2. Aunque se declarase, la sesión en vivo no copiaba el dato, así que el juego se resolvía a CLUEDO **en silencio**.
3. Aunque se copiase, una categoría nueva no tenía dónde guardarse: las rutas de alta llevaban `suspects`, `rooms` y `weapons` en la URL.
4. Y aunque se guardase, cinco campos del manifiesto —`ronda.accionSobre`, `ronda.cambiosPermitidos`, `trofeos`, `seccionesDeDosier`, `documentos`— estaban declarados **y no los leía nadie**.

El diagnóstico de una frase: **la generalización se hizo de dentro afuera y se paró antes de llegar a los bordes.** El núcleo aprendió a no saber de qué se juega; los consumidores no llegaron a preguntárselo.

Ninguno de esos cuatro fallos daba error. Todos se habrían descubierto la noche de una velada, con doce personas alrededor de una mesa. Es la peor clase de fallo que hay: el que no falla.

---

## 2. Lo que se ha arreglado esta noche

Todo aditivo, y todo demostrado con el maestro de oro (76 piezas contrastadas byte a byte) más los verificadores de CLUEDO en verde antes de cada commit.

| Commit | Qué cerraba |
|---|---|
| `2c7e727` | Los contratos del segundo juego: manifiesto, tipos, `registrarProyeccion`, la fase `sellado` |
| `dea3f11` | `Plot.delJuego`: dónde guarda un juego lo que decidió al generar la partida |
| `536e119` | **Las entidades ya no tienen que ser sospechosos, salas o armas** |
| `1176330` | El paquete imprimible sale del catálogo del juego, no del de CLUEDO |
| `30df805` | **Ya se puede crear una partida que no sea de CLUEDO** |
| `eb0f19e` | Que el asistente no reciba la solución deja de cumplirse por casualidad |
| `1b3e20d` | Las reglas que lee quien juega dejan de ser siempre las de CLUEDO |
| `b5fabce` | Los trofeos dejan de calcularse con la lógica de CLUEDO para todos |

### Tres de estos merecen leerse despacio

**Las entidades (`536e119`).** El lector genérico `entidadesDe()` ya sabía mirar en `game.entidades` antes de caer a los campos heredados. Pero **nadie escribía ahí**. El destino estaba puesto y no salía ningún tren. Ahora cada juego declara dónde vive cada categoría (`DefinicionCategoria.almacen`), y lo que se gana no es solo que funcione: el acoplamiento con los tres campos viejos pasa a estar **a la vista, en el manifiesto**, en vez de escondido en una constante. El día que se generalice del todo, lo que hay que borrar está enumerado.

**Las reglas (`1b3e20d`).** `REGLAS_JUGADOR` vivía en el servidor con nombre de verdad universal y empezaba así: *«Alguien de esta casa es un asesino»*. Esa lista viajaba a cualquier juego y no a un sitio, sino a tres: la app, el dosier impreso y el prompt del asistente de la partida. Una expedición arqueológica habría leído las reglas de un asesinato en los tres.

**El asistente (`eb0f19e`).** «El asistente nunca revela la solución» es la regla más importante del producto —si puede chivar quién fue, no hay velada— y **no estaba escrita en ningún sitio**. Se cumplía por omisión. Cualquier herramienta nueva que devolviera el `Plot` entero la rompía en silencio. Ahora hay centinelas y una prueba que canta qué campo se ha filtrado.

> Esa prueba, además, se pilló a sí misma pasando en falso: llamaba mal a `executeTool` y devolvía «herramienta desconocida», así que la búsqueda de secretos no encontraba nada **y pasaba en verde**. Se detectó rompiendo el código a propósito y viendo que *no* fallaba. Es la trampa más común del repositorio: una comprobación que no encuentra nada pasa igual que una que comprueba de verdad.

---

## 3. La superficie común

Lo que un juego nuevo hereda gratis, por capas.

### Contratos (`shared/`)
- **`ManifiestoDeJuego`** — el juego como dato. `JuegoId` y `CategoriaId` son cadenas abiertas a propósito.
- **El registro global** — `registrarJuego`, anclado a `Symbol.for` para sobrevivir a la doble carga de módulo que ya rompió una vez.
- **`entidadesDe` / `listaDeCategoria`** — el puente entre «categoría» y «dónde se guarda».
- **`VistaJugador.ejes` y `.acciones`** — la generalización mejor terminada del sistema: el servidor las compone desde el manifiesto y la app las pinta sin saber a qué se juega.
- **`LiveSession.estado` y `Plot.delJuego`** — los dos sacos donde un juego guarda lo suyo sin que el motor mire dentro.

### Motor (`server/src/juegos/`)
- **`ejecutarAccion`** — valida fase, turno, repeticiones y que lo elegido exista de verdad en su categoría. No sabe de qué se juega.
- **Cuatro registros por juego**: acciones (`registrarAcciones`), proyección (`registrarProyeccion`), trofeos (`registrarTrofeos`) y —pendiente— generación de trama.

### Plataforma (transversal)
Cuentas, identidades, invitaciones, correo, enlaces profundos, subidas, el limitador de peticiones, la puerta del taller, el panel de partidas, el motor de PDF, la maquetación, el bus de eventos en vivo. **Nada de esto sabe de juegos y no ha habido que tocarlo.** Es aproximadamente la mitad del código.

---

## 4. La superficie propia de cada juego

Esto es, literalmente, la lista de tareas para el juego número tres. En orden de trabajo.

| # | Qué se escribe | Dónde |
|---|---|---|
| 1 | El manifiesto: categorías, ejes, acciones, fases, barra, asistente, trofeos, reglas, documentos | `shared/juegos/<juego>.ts` |
| 2 | Los tipos propios: su estado en partida y su trama | `shared/juegos/<juego>-tipos.ts` |
| 3 | Darlo de alta | `shared/juegos/index.ts` (una línea) |
| 4 | Los reductores de sus acciones | `server/src/juegos/<juego>-acciones.ts` |
| 5 | Qué ve cada persona de su estado | `server/src/juegos/<juego>-proyeccion.ts` |
| 6 | Sus trofeos | `registrarTrofeos(...)` |
| 7 | El esquema y el prompt de generación | `server/src/plot/<juego>-*.ts` |
| 8 | Una trama de demostración sin IA | para poder probar sin gastar tokens |
| 9 | Sus imprimibles | `server/src/docs/imprimibles/<juego>/` |
| 10 | Su tema | `client/src/styles/` y `app/src/tema-<juego>.ts` |
| 11 | Sus pantallas propias, si las necesita | `app/app/(juego)/` + ampliar `PantallaDeApp` |
| 12 | Un verificador que juegue una velada entera | `server/scripts/verificar-<juego>.ts` |

**Los puntos 11 y 3 son los que todavía obligan a tocar código común.** Los demás son ficheros nuevos al lado de los que ya hay.

---

## 5. Lo que sigue cableado

Ordenado por lo que impide, no por cuánto código toca. Lo pendiente es trabajo real, no cosmética.

| Estado | Dónde | Qué |
|---|---|---|
| ⬤ pendiente | `shared/live.ts:23` | **`LivePhase` es una unión cerrada** con los nombres del ritmo de CLUEDO. Cada juego está obligado a declarar las seis fases aunque no las use, y `DefinicionAccion.fases` solo admite esos valores. Esta noche se amplió con `sellado` — que es exactamente el síntoma: **ampliar el contrato común para añadir contenido de un solo juego** |
| ⬤ pendiente | `shared/live.ts:46` | **`EleccionDeSala` es el único registro de lo que alguien hace en una ronda**: un `roomId` y nada más. Un juego con dos acciones distintas por ronda pisa la primera con la segunda. El propio contrato lo confiesa |
| ⬤ pendiente | 169 accesos | **`game.suspects` / `rooms` / `weapons` leídos a mano** por todo el sistema, frente a un puñado que usan `entidadesDe`. Hoy no muerde porque los dos juegos mapean sus categorías a los campos viejos; el tercero que no lo haga genera documentos vacíos sin dar error |
| ⬤ pendiente | `server/src/live/sesion.ts:366` | **La victoria se decide en la plataforma**: «una acusación por persona, gana quien acierta antes». Un juego con victoria por bandos —la Momia— no cabe en `winnerId: string` |
| ⬤ pendiente | `server/src/plot/schema.ts` | **Un solo esquema de generación**, con `murdererId`/`weaponId`/`roomId` obligatorios. Falta `registrarGenerador(juegoId, …)` |
| ⬤ pendiente | `server/src/agent/tools.ts:35` | **`MINIMOS` escrito a mano** pese a que el manifiesto declara `minimo` por categoría; y seis herramientas que son la misma operación repetida tres veces con la categoría en el nombre |
| ⬤ pendiente | `client/src/pages/StudioPage.tsx` | **Las pestañas del taller son una constante** y un `switch` cerrado. No importa `manifiestoDe` en ningún sitio |
| ⬤ pendiente | `server/src/board/generator.ts:68` | El generador de plano **planta un bloque rotulado «ESCALERAS»** y usa el ratio de pasadizos del tablero clásico |
| ⬤ pendiente | `server/src/docs/imprimibles/informeValidacion.ts:36` | Comprueba la ceguera del Game Master **buscando literales en castellano** en el HTML. Con otro juego pasaría siempre en verde sin comprobar nada: una garantía falsa es peor que ninguna |
| ⬤ pendiente | `shared/staleness.ts:93` | Lee los tres campos a mano. `idsArmas` es código muerto |
| ⬤ pendiente | `server/src/routes/games.ts:207` | Al borrar una partida, el barrido de fotos huérfanas no mira `game.entidades`: **fuga real de ficheros en disco** |
| ✔ arreglado | `server/src/routes/games.ts:56` | No se podía declarar el juego de una partida |
| ✔ arreglado | `server/src/live/sesion.ts:133` | La sesión en vivo no heredaba el juego |
| ✔ arreglado | `server/src/routes/entities.ts` | Una categoría nueva no tenía dónde guardarse |
| ✔ arreglado | `shared/documents.ts:237` | El paquete imprimible salía del catálogo de CLUEDO |
| ✔ arreglado | `server/src/docs/datos.ts:199` | Las reglas del jugador eran las de CLUEDO en tres sitios |
| ✔ arreglado | `server/src/live/cuentas.ts:83` | `eraCulpable` era siempre falso fuera de CLUEDO |
| ✔ arreglado | `server/src/live/consejero.ts:95` | El asistente anunciaba «SALAS DE LA CASA» en cualquier juego |
| ✔ arreglado | (no existía) | El asistente podía filtrar la solución sin que nada lo detectara |

---

## 6. Los cinco bloqueos de fondo

Lo anterior son síntomas. Esto es la enfermedad.

### 6.1 El ritmo de la partida es el de CLUEDO
`LivePhase` enumera seis fases con nombres de un misterio de salón. Un juego con otro ritmo —turnos de exploración, fases de mercado, encuentros por capítulos— no puede declararlo.

**Propuesta:** abrir `LivePhase` a `string`, reservando `lobby` y `desenlace`. `fases` pasa a `Record<string, string[]>` con rótulo y banderas (`enJuego`, `admiteResolver`), y `FASES_EN_JUEGO` se calcula del manifiesto en vez de ser una constante. `puedePasarA` ya devuelve `false` por defecto, así que una tabla no exhaustiva no rompe nada.
**Coste:** 1–2 días. **Riesgo para CLUEDO:** bajo; es el mismo peaje que ya se aceptó para `JuegoId`.

### 6.2 Una ronda admite una acción, y con forma de sala
De `LivePlayer.elecciones` salen `miSala`, la ocupación que ve quien dirige y el tablón común. Toda la mecánica de reparto de información de la plataforma pasa por ahí.

**Propuesta:** ampliar el `LiveSession.acciones[]` que ya existe a `{suspectId, accion, datos, round, at}` y añadir `LivePlayer.estado?: Record<string, unknown>`, hermano del `estado` de sesión. `elecciones` se queda como campo heredado de CLUEDO y `miSala` pasa a derivarse.
**Coste:** 2–3 días. **Riesgo:** medio; toca la proyección, que es lo que ve el móvil.

### 6.3 La victoria vive en la plataforma
`acusar()` decide quién gana dentro de `server/src/live/`, con las reglas de CLUEDO, aunque el comentario del juego afirme que «el motor no sabe que existe un ganador».

**Propuesta:** mover `elegirSala`, `salaDe`, `acusar` y el volcado del tablón a `server/src/juegos/cluedo-mecanica.ts`. `live/sesion.ts` se queda con la máquina de estados, la presencia y el guardado. Añadir `registrarGanchos(juegoId, {alCerrarRonda, alTerminar})`.
**Coste:** 2 días. **Riesgo:** medio-alto, y por eso hay maestro de oro.

### 6.4 Las acciones solo saben «elige uno de esta categoría»
`eligeDe` pinta un selector por entrada. No sabe ordenar, ni elegir varios, ni pedir una cantidad. Por eso el sellado de la Momia necesita pantalla propia.

**Propuesta:** tipar la entrada (`una | varias | orden | cantidad | ninguna`) y que la app tenga un pintor por tipo. Una acción marcada `tienePantallaPropia` se excluye del panel genérico en vez de filtrarse por id literal, como hoy.
**Coste:** 2 días. **Riesgo:** bajo, es aditivo.

### 6.5 La app es un binario con pantallas y tema cerrados
`PantallaDeApp` es una unión cerrada —correctamente, porque la app se compila— pero eso significa que cada juego nuevo obliga a publicar versión. Y hay **un único objeto `color`** importado por 27 ficheros, más unos 46 literales de oro escritos a mano.

**Propuesta:** el tema, con un `ProveedorDeTema` en la raíz y `tema?: Partial<Tema>` en el manifiesto; el barrido de literales a tokens es mecánico y no cambia ni un valor. Las pantallas seguirán exigiendo versión nueva, y está bien que sea así: lo que hay que asegurar es que el compilador lo cante, y ya lo canta.
**Coste:** 2–3 días el tema. **Riesgo:** bajo.

---

## 7. Plan por fases

**Fase 1 — lo que ya está hecho.** Las cuatro puertas cerradas (§1) y las tres fugas hacia el jugador. Es lo que convierte «la plataforma podría albergar más juegos» en «hay dos juegos».

**Fase 2 — lo que conviene antes del tercer juego.** En este orden:
1. Girar los 169 accesos a `entidadesDe`. Es mecánico y el maestro de oro lo verifica.
2. `registrarGenerador` para la trama.
3. Las herramientas del agente por categoría, en vez de seis con el nombre dentro.
4. El taller construyendo sus pestañas desde el manifiesto.
5. El informe de validación comprobando sobre secciones emitidas, no sobre literales en castellano.

**Fase 3 — la visión.** Abrir `LivePhase`, sacar la mecánica de CLUEDO de `live/`, tipar las entradas de las acciones, y el tema por juego. Al final de esto, **un juego nuevo es una carpeta y una línea en el registro**, y ninguna de las dos toca el núcleo.

---

## 8. La regla que ha gobernado la noche

**CLUEDO no puede cambiar de comportamiento.** Ni una fase, ni un byte de su vista, ni una coma de sus impresos.

Se ha comprobado antes de cada commit con el maestro de oro y los verificadores. Y cada regla nueva se ha probado **rompiéndola a propósito** y viendo fallar su comprobación: una comprobación que nunca se ha visto fallar no demuestra nada, y esta noche ha habido dos que pasaban en verde sin mirar nada hasta que se rompió el código para comprobarlo.
