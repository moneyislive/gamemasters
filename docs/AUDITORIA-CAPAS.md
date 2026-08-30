# EL TERCER JUEGO — MANUAL DE MONTAJE

> **AVISO DE FECHA.** Este manual se escribió el 28 de agosto de 2026, antes de que
> entrara El Paso de las Sombras y antes del trabajo de aislamiento del 29 al 30.
> Sigue siendo la mejor guía de montaje que hay, pero **cinco de sus pasos han
> cambiado** y conviene leer `AISLAMIENTO-DE-JUEGOS.md` al lado:
>
> - **Paso 7 (fases):** ya NO hay que declarar las siete. La tabla es `Partial`, así
>   que solo se nombran las fases por las que el juego pasa.
> - **Paso 9 (`ronda`):** ya es opcional. Se confirmó que no lo lee nadie.
> - **Nuevo:** `dosier` es OBLIGATORIO en el manifiesto — la lista de bloques del
>   dosier del móvil, en orden. Sin respaldo, a propósito.
> - **Paso 6 (formas de entrada):** hay una quinta, `pideNumero`, y el panel
>   genérico de la app SÍ la pinta.
> - **Etapas 3 y 5:** hay tres registros nuevos que dar de alta en `instalados.ts`
>   — `registrarGenerador` (la trama), `registrarVoz` (el asistente del taller) y
>   `registrarVeredicto` (quién gana) — y CLUEDO ya no es la rama por defecto de
>   ninguno de los tres.
>
> Además, dos cosas que este manual da por rotas están ARREGLADAS: el
> `PrintablePicker` y el despacho por registro de `refresh.ts` y `material.ts`.


Raíz del repositorio: `C:/Users/QWERTY/Documents/GameMasters`. Todas las rutas de abajo son relativas a esa raíz. El juego nuevo se llama `tercero` (id) y `TERCERO` (constante) en todos los ejemplos; sustitúyelo entero.

Regla que gobierna el orden entero: **cada vez que amplías una unión cerrada, el compilador te obliga a completar su `Record` en el mismo commit**. Por eso el manifiesto arranca con `trofeos: []`, `documentos: []` y `seccionesDeDosier: []`, y esas tres listas se rellenan en la etapa donde se escribe lo que hay detrás. Empezar declarándolas llenas te deja con el árbol sin compilar durante días.

---

## El camino

### ETAPA 1 — «Primero el juego como dato»
Todo en `shared/`. No se escribe una sola línea de lógica.
**Al terminar puedes probar:** arrancar, entrar a mano por `http://localhost:5173/tercero` (la tarjeta del catálogo todavía no existe: eso es la etapa 2), ver una pestaña del taller por cada categoría, dar de alta entidades, y crear una partida — `POST /games` con `juego: 'tercero'` ya no responde 400.

**1. El fichero del juego y su identidad.**
Crea `shared/juegos/tercero.ts` y exporta `const TERCERO: ManifiestoDeJuego` con `id: 'tercero'`, `nombre` y `lema`. Ese `id` es la cadena que se guardará en `GameSettings.juego`, `GameSummary.juego` y `LiveSession.juego`.
*Si se olvida o no coincide exactamente:* no hay error. `manifiestoDe()` (`shared/juegos/index.ts:143`) hace `INSTALADOS[id] ?? CLUEDO`. La partida se juega entera con las categorías, fases, reglas, trofeos y barra de CLUEDO.

**2. Las categorías.**
`categorias: DefinicionCategoria[]` en `shared/juegos/tercero.ts`. Obligatorios por categoría: `id`, `singular`, `plural`, `minimo`. Marca `sonJugadores: true` en la de personas y `sonLugares: true` en la de sitios. Rellena `presentacion` (título, descripción, forma, glifo, sugerencias, ejemplos) porque **es a la vez el panel del taller y la descripción de la herramienta del agente**.
*Si se olvida:* sin `sonJugadores`, `categoriaDeJugadores()` devuelve undefined, nadie puede ser señalado y `server/src/live/proyeccion.ts:179` pinta el eje con el nombre REAL de la persona en vez del de su personaje. Sin `sonLugares`, no hay pestaña de mapa. Sin `admiteFoto`/`admiteEmail`, `server/src/routes/entities.ts:217-218` descarta esos campos al guardar sin avisar. Sin `presentacion`, panel vacío y glifo `◇` (`client/src/pages/StudioPage.tsx:78`).

**3. El reparto de almacenes.** *(la decisión más cara de la etapa)*
Campo `almacen` de cada categoría: `'suspects' | 'rooms' | 'weapons'` o nada. **La categoría de PERSONAS va obligatoriamente en `suspects`; la de LUGARES, en `rooms`.** El resto, donde quepa (la Momia mete `reliquias` en `weapons` «no le pega el nombre, pero es donde cabe», `momia.ts:393`).
*Si se olvida:* el motor valida igual (`entidadesDe()` mira `game.entidades` primero), así que nada falla. Lo que se pierde: sin `suspects`, no hay emparejamiento de móviles, ni dosieres, ni correos (`proyeccion.ts:90` y `:252` leen `game.suspects` a pelo). Sin `rooms`, la lista de salas, la ocupación y el plano salen VACÍOS con las entidades existiendo (`proyeccion.ts:113, :261, :376`). Y sin `almacen`, el agente del taller no puede abrir esa pestaña: `pestanaPedida()` (`StudioPage.tsx:103`) traduce `suspects/rooms/weapons` buscando `c.almacen === objetivo`, y si no encuentra, **no pasa nada** — parece que el agente está roto.

**4. Los ejes (si el juego consiste en adivinar algo).**
`ejes: DefinicionEje[]` con `id`, `pregunta`, `rotulo`, `categoria`. Es opcional: `verificar-juego-sin-ejes.ts` demuestra con LA_OCA que un juego sin ejes funciona.
*Si se olvida:* no hay acusación, ni sobre del crimen, ni desenlace con respuestas, y el motor no lo echa de menos. *Si se declara mal:* un eje cuya `categoria` no exista deja el selector de acusación VACÍO y `shared/staleness.ts:123-131` marca la solución como rota.

**5. Turnos y repertorio de acciones.**
`turnos: 'simultaneo' | 'por-turnos'` y `acciones: DefinicionAccion[]` (`id`, `rotulo`, `fases` obligatorios; `eligeDe`, `eligeVarias`, `eligeOpcional`, `vecesPorTurno` opcionales).
*Si se olvida `vecesPorTurno`:* **sin límite**. Una acción que debe ser única (señalar, acusar) se repite indefinidamente y no salta nada. CLUEDO pone `1` en `acusar`, la Momia en `senalar` y `proponer-orden`.

**6. La forma de entrada de cada acción — decisión con consecuencia visual.**
`eligeDe` (N campos, una entidad obligatoria cada uno) es la ÚNICA forma que la app pinta sola. `eligeVarias` (lista con `cuantas` exacto y `ordenada`) y `eligeOpcional` se validan perfectamente por HTTP y **salen en el móvil como un botón SIN SELECTORES**: `server/src/live/proyeccion.ts:191` compone `campos: (a.eligeDe ?? []).map(...)` y nada más.
*Consecuencia de orden:* si eliges `eligeVarias`/`eligeOpcional`, la pantalla propia de la app deja de ser cosmética y sube a la etapa 4 como bloqueante (la Momia tuvo que escribir `app/src/momia/vigilia.tsx` y `app/src/momia/vista.ts`).
*Lo que no cabe en ninguna de las tres:* números, texto libre, booleanos, fechas, listas de longitud variable y campos que elijan de varias categorías. El motor construye `datos: Record<string,string>` y `listas: Record<string,string[]>` y **descarta en silencio** cualquier campo no declarado.

**7. La tabla de fases.**
`fases: Record<LivePhase, LivePhase[]>`, con TODAS las claves de hoy: `lobby`, `ronda-abierta`, `ronda-cerrada`, `acusaciones`, `sellado`, `intermedio`, `desenlace`. `[]` significa «este juego no pasa por ahí». **Pon `desenlace` como salida desde `ronda-cerrada` desde el primer minuto.**
*Si se olvida una clave:* no compila. *Si dejas una fase sin salida a `desenlace`:* la partida no se puede terminar y el sobre del crimen se queda sin puerta — lección escrita en `shared/juegos/cluedo.ts:246-260`.
**Evita ampliar `LivePhase`.** Si no hay más remedio, es el paso más caro del repositorio: `shared/live.ts:23` + la clave nueva en `cluedo.ts`, `momia.ts` y los tres manifiestos de `server/scripts/verificar-segundo-juego.ts`, `verificar-juego-sin-ejes.ts` y `verificar-campana.ts` + `AvisoClave` (`shared/live.ts:696`, `Record` exhaustivo en `app/src/avisos.tsx:29`) + `FASES_EN_JUEGO` (`shared/live.ts:52`) + la función de transición en `server/src/live/sesion.ts` (calcada de `abrirSellado`, línea 333) + **la ruta POST en `server/src/routes/live.ts:240`**.

**8. Las reglas del jugador.**
`reglas: ReglaDeJuego[]` (título + texto).
*Si se olvida:* fallo silencioso puro. Los tres consumidores hacen `manifiesto.reglas ?? REGLAS_JUGADOR`: `server/src/live/proyeccion.ts:228` (app), `server/src/docs/renderer.ts:313` (dosier impreso) y `server/src/live/consejero.ts:123` (boca del asistente). Tu juego enseñará «Alguien de esta casa es un asesino…» en los tres sitios.

**9. `ronda`, `barra` y `asistente`.**
`ronda: { accionSobre, cambiosPermitidos }` es obligatorio para compilar y **hoy no lo lee absolutamente nadie** (grep de `accionSobre`/`cambiosPermitidos` sobre `client/src`, `server/src`, `app/src`, `app/app`: cero usos de producción; lo dicen `server/src/juegos/momia-acciones.ts:523` y `server/scripts/verificar-momia.ts:553`). El límite real de repeticiones lo pone `vecesPorTurno`. `barra: PestanaDeBarra[]` y `asistente` sí se pintan (`app/src/barra.tsx:74` y `:169`).
*Reutiliza iconos y pantallas existentes en esta etapa.* Icono o pantalla propios amplían `IconoId` (`shared/juegos/tipos.ts:228`) y `PantallaDeApp` (`:250`), y eso arrastra `app/src/iconos.tsx:293` y `app/app/(juego)/_layout.tsx:30`: se hace en la etapa 4.

**10. Los tres huecos vacíos, a propósito.**
`trofeos: []`, `documentos: []`, `seccionesDeDosier: []` en `shared/juegos/tercero.ts`. Se rellenan en las etapas 4 y 6, junto con su unión y su `Record`.
*Si los rellenas ahora:* el árbol deja de compilar hasta que escribas las plantillas y el reparto de trofeos. *Si copias `documentos: PRINTABLE_DOCS` de CLUEDO:* compila, funciona, y tu paquete sale con los trece de CLUEDO, hoja de solución de un asesinato incluida.

**11. El alta en el registro. El paso que ata todo lo demás.**
En `shared/juegos/index.ts`, imitando las líneas 9, 49, 99 y 101 (las de MOMIA), **las cuatro**:
```ts
import { TERCERO } from './tercero';
INSTALADOS[TERCERO.id] = TERCERO;
anotarAlmacenes(TERCERO);
export { TERCERO };
```
Reexporta **símbolo a símbolo**, nunca con `export *` (`index.ts:12-20`: con la estrella el compilador daba por buenas ocho funciones de `tipos.ts` que en ejecución no existían — «does not provide an export named 'aciertos'»).
*Si se olvida:* falla en tres sitios y de tres maneras. (a) `manifiestoDe()` cae en CLUEDO en silencio. (b) `juegosInstalados()` no lo lista: no sale en `client/src/pages/CatalogPage.tsx:271` ni en `app/src/vitrina.ts:113`, y `server/src/routes/games.ts:78` responde 400 — **este es el único de los tres que se ve**. (c) sin `anotarAlmacenes()`, `declararAlmacen()` no rellena `CAMPO_HEREDADO` y el motor **rechaza TODAS las acciones** con «Esa no es una opción válida» mientras los verificadores de CLUEDO siguen en verde, porque sus tres categorías están en el literal inicial. Ya ocurrió: `shared/juegos/entidades.ts:47-64`.

---

### ETAPA 2 — «Que el taller hable tu idioma»
Barata, puramente aditiva, y va aquí por una razón práctica: si la saltas, pasarás las cuatro etapas siguientes leyendo las palabras de CLUEDO y creyendo que son las tuyas.
**Al terminar puedes probar:** abrir el catálogo, ver tu tarjeta, entrar, y que ni un rótulo del taller diga «mansión».

**12. El bloque de tema del taller.**
`client/src/styles/temas.css`: un bloque `:root[data-juego='tercero'] { … }` repintando los tokens que `theme.css` declara en `:root` — `--acento-rgb`, `--acento-medio/claro/hondo-rgb`, `--contra-rgb`, `--contra-hondo-rgb`, `--papel-rgb`, `--papel-tenue-rgb`, los cuatro `--madera-*`, los cuatro `--suelo-*`, `--tinta-rgb`, `--peligro-rgb`, las tres `--font-*`, `--panel-bg`; y si hay plano, los seis `--tablero-*` de `board.css`. **Solo color, tipo y textura: ni una regla de disposición.** El atributo lo pone `useTemaDeJuego()` (`client/src/lib/tema.ts`) sobre `<html>`; no hay que registrar nada.
*Si se olvida:* el taller entero se pinta como la mansión (burdeos, caoba, Cinzel Decorative) mientras se escriben los nombres de tu juego. Ni error de consola ni de compilación.
*Si necesitas mover una caja:* eso no cabe en el tema, es otra pantalla (cabecera de `temas.css`).

**13. Las fuentes del taller, si el tema nombra familias nuevas.**
`FUENTES_DE_JUEGO['tercero'] = '<url de Google Fonts>'` en `client/src/lib/tema.ts`.
*Si se olvida:* `--font-display` cae al respaldo `'Cinzel'` y ni siquiera hay una petición de red fallida que lo delate.

**14. Las palabras del juego.**
`client/src/juegos/palabras.ts`: una constante `PalabrasDeJuego` y su entrada en `const PALABRAS: Record<JuegoId, PalabrasDeJuego>` — recibidor (kicker, título, estados de ficha, contadores, errores, vacíos), taller (rótulos de las cuatro pestañas de la casa, los tres textos del botón dorado y sus consejos, «extraviado»), vivo (ronda/vigilia, desenlace), asistente (subtítulo, bienvenida, marcador) y `ornamento`.
Dentro, **`articulos` con una entrada por CADA categoría** (`'el'|'la'`), y `rotulos` solo para las categorías cuya pestaña deba llamarse distinto de su plural.
*Si se olvida:* `palabrasDe()` devuelve CLUEDO como respaldo declarado. Tu recibidor se titula «Casos de CLUEDO», el botón dice «✦ GENERAR MISTERIO» y el chat te da la bienvenida como Edmund el mayordomo. Todo se ve completo y correcto; es de otro juego. Sin `articulos`, el respaldo es masculino: «Nuevo reliquia», «este cámara».

**15. La tarjeta del catálogo.**
`client/src/pages/CatalogPage.tsx`, array `GAMES`: un `Art<Tercero>()` de SVG inline (lienzo 220×220, trazo en `currentColor`), paleta de ficha (`--card-bg1`, `--card-bg2`, `--card-accent`, `--card-glow`), la frase de a qué se juega, rango de jugadores e invitación. El candado no se escribe: sale de `juegosInstalados()`.
*Si se olvida:* el juego es jugable tecleando `/tercero` y **no aparece en la portada**. Ni hueco, ni tarjeta bloqueada, ni aviso.

**16. Adornos con respaldo mudo** *(opcionales, todos con el mismo patrón de fallo)*
- Cortinilla de entrada: `client/src/components/transition/TerceroTransition.tsx` + línea en `TRANSICIONES` de `client/src/components/transition/TransicionDeEntrada.tsx`. Sin ella: dos segundos de puertas de caoba de la mansión.
- Retrato del asistente: línea en `RETRATOS` de `client/src/components/agentchat/AgentChatPanel.tsx`. Sin ella: **cara del mayordomo con el nombre de tu asistente al lado**, porque el nombre sí sale del manifiesto.
- Emblema del bloque central del plano: `EMBLEMAS['tercero']` en `client/src/components/board/BoardView.tsx`. Sin ella: la lupa de detective de CLUEDO en medio de tu plano, **y el plano se imprime**.

**17. «Exactamente N» de una categoría, si tu juego lo tiene.**
`CUENTA_EXACTA['tercero:<categoria>'] = N` en `client/src/juegos/reglas.ts`. El manifiesto solo sabe decir `minimo`.
*Si se olvida:* la categoría se comporta como «N o más», el formulario no se cierra al llegar a N y el botón de generar deja pulsar con uno de más. El puzle sale mal.
*Ojo:* la misma excepción existe cableada en el servidor (`server/src/agent/momia-herramientas.ts`, `faltanMinimos`: `if (cat.id === 'ritos' && cuantas !== 5)`). Si la necesitas ahí, es fichero compartido.

---

### ETAPA 3 — «Después las reglas»
`server/src/juegos/`. Aquí el juego dice qué SIGNIFICA cada acción.
**Al terminar puedes probar:** una velada entera por HTTP (entrar con código, abrir ronda, ejecutar cada acción por `POST /api/jugar/accion`, cerrar, desenlace), y desde el móvil con el panel genérico `PanelDeAcciones` (`app/src/acciones.tsx`), sin haber escrito una sola pantalla.

**18. El fichero de reductores.**
`server/src/juegos/tercero-acciones.ts`, uno por cada `id` de `manifiesto.acciones`:
```ts
import { registrarAcciones } from './motor';
registrarAcciones('tercero', { 'mi-accion': (ctx) => { /* muta ctx.sesion */ } });
```
**Tiene que ser un fichero aparte** del manifiesto y de cualquier módulo que importe `live/sesion`: registrar dentro de `juegos/tercero.ts` cierra el ciclo juego → sesion → store → migración → juego y el módulo queda a medio cargar (cabeceras de `cluedo-acciones.ts` y `momia-acciones.ts`).
*Si se olvida un reductor:* la acción **sí aparece** en la app —`accionesDisponibles()` la saca del manifiesto, que no sabe si hay reductor— y al pulsarla el motor responde 409 «Esta partida todavía no sabe hacer eso.» (`motor.ts:182`). No falla al arrancar ni al compilar: falla en la mesa.

**19. El estado propio, perezoso y solo en `sesion`.**
Patrón `estadoDe(game, sesion)` de `momia-acciones.ts:44-102`: `CLAVE_ESTADO = 'tercero'`, `sesion.estado = sesion.estado ?? {}`, y si la clave no existe, inicializarla **y dar de alta a quien se haya incorporado después**. **No hay gancho de inicio**: `abrirSesion` es plataforma y no llama a nada del juego.
*Si se olvida:* esperar que el estado exista al abrir la sala de espera da `undefined` y el primer reductor revienta o cuenta desde cero. *Si lo escribes en `game`:* se pierde sin error — `mutar` solo guarda la `LiveSession` y `routes/jugar.ts` carga `game` en solo lectura; la acción parece funcionar y al refrescar no ha pasado nada. *Si metes un `Map` o un `Set`:* sobrevive a `structuredClone` y se convierte en `{}` al persistir; el estado se vacía solo al reiniciar el servidor.

**20. `sesion.turnoDe`, si declaraste `turnos: 'por-turnos'`.**
Lo asignan **tus** reductores al cerrar cada turno. La plataforma no lo pone nunca: en producción `turnoDe` solo se LEE (`motor.ts:116` y `:202`) y se limpia al levantar la mesa (`sesion.ts:296`).
*Si se olvida:* fallo silencioso perfecto. La guarda es `if (manifiesto.turnos === 'por-turnos' && sesion.turnoDe && …)`, así que con `turnoDe` vacío **cualquiera actúa en cualquier momento**. El juego se declara por turnos y se juega en simultáneo.

**21. La resolución de fin de fase, partida en dos.**
Si hay un equivalente de `ejecutarSellado`: una función **pura** que calcula (para que la use la proyección) y otra que **escribe**, llamada solo desde una ruta. Modelo: `momia-sellado.ts` (`resolverSellado:97`, `selladoDe:113`, `ejecutarSellado:146`).
*Si la que muta la llama la proyección:* escribes una vez **por refresco de cada móvil** y el resultado cambia solo. *Si no montas la ruta:* pasa lo que pasa HOY con la Momia — `client/src/components/live/PanelDeLaMomia.tsx:249` llama a `POST /games/:id/live/sellado/ejecutar` y **esa ruta no existe**; el 404 solo pasa desapercibido porque `selladoDe` recalcula al vuelo.

**22. El alta al arrancar. EL fallo canónico de esta capa.**
`server/src/juegos/instalados.ts` — un import por cada módulo que contenga `registrarAcciones` / `registrarProyeccion` / `registrarTrofeos`:
```ts
import './tercero-acciones';
import './tercero-proyeccion';
import './tercero-cierre';
```
Es un fichero de solo-imports que no exporta nada a propósito, y lo carga `server/src/index.ts:15` antes que ningún router.
*Si se olvida:* los registros quedan vacíos, **el servidor arranca perfectamente, todos los verificadores siguen en verde** —porque importan los módulos a mano— y la primera partida real contesta «Esta partida todavía no sabe hacer eso» a cada acción, con la pantalla propia en blanco y sin trofeos. Estuvo a punto de ocurrir con la Momia. Blíndalo leyendo el fichero como texto en tu verificador (paso 44).

**23. Anclar cualquier registro nuevo al ámbito global.**
Si escribes una tabla de registro propia, ánclala con `Symbol.for('gamemasters.…')` como las cinco existentes (`gamemasters.juegos.instalados`, `…almacenes`, `…reductores`, `…proyecciones`, `…trofeos`).
*Si se olvida:* este árbol carga los mismos ficheros por dos rutas (`../../shared/juegos` y `./entidades`) y el cargador los trata como módulos distintos: dos tablas, altas perdidas en silencio.

---

### ETAPA 4 — «Lo que cada uno ve, y lo que se lleva»
El secreto, la pantalla propia y las medallas.
**Al terminar puedes probar:** que el JSON que recibe cada móvil no contiene el secreto; que la pantalla propia pinta; y que al cerrar la partida caen los trofeos del juego además de los seis comunes.

**24. Los tipos del juego, si hay estado o trama propios.**
`shared/juegos/tercero-tipos.ts`, espejo de `shared/juegos/momia-tipos.ts`. Solo lo que necesiten los TRES paquetes; lo que solo necesita el servidor va en `server/src/juegos/`. **`shared/juegos/tipos.ts` NO PUEDE IMPORTAR de este fichero** — esa es la prueba de que la frontera está bien puesta (`momia-tipos.ts:14`).
La frontera es temporal: `Plot.delJuego` (`shared/types.ts:257`, `unknown`) = lo que la casa decidió antes de que llegara nadie; `LiveSession.estado` (`shared/live.ts:225`, `Record` abierto) = lo que va pasando esa noche.
*Si se confunden:* lo que metas en `delJuego` no se puede mutar sin reescribir el Plot; lo que metas en `estado` no existe hasta la primera acción. Ninguno de los dos campos hay que ampliarlo.

**25. La proyección: aquí se decide qué es secreto.**
`server/src/juegos/tercero-proyeccion.ts`:
```ts
registrarProyeccion('tercero', (game, sesion, suspectId) => vistaDe(game, sesion, suspectId));
```
Recibe la persona concreta y devuelve solo lo suyo. **Los campos secretos se OMITEN con `...(condicion ? { x } : {})`, no se ponen a `undefined`**, para que ni la clave viaje; lo que solo se ve al final se abre con `sesion.phase === 'desenlace'` (`momia-proyeccion.ts:259`).
*Si no se registra:* `estadoDelJuego` sale `undefined`, la clave desaparece del JSON y la pantalla propia se queda en blanco o «cargando» para siempre, **sin error en ninguna parte**. *Si lanza:* `proyectarEstado` se traga la excepción a propósito, escribe `[proyeccion] el juego «tercero» no pudo componer su estado para <id>` en el log del servidor y devuelve `undefined` — mismo blanco. *Si proyectas el estado entero por comodidad:* la solución viaja al móvil y se gana abriendo las herramientas del navegador.

**26. La paleta de la app.**
`app/src/tema-tercero.ts` con **exactamente** las claves de `color` de `app/src/tema.ts` (feltoscuro, felt900/800/700, caoba900/800/700, oro500/400/300, laton, burdeos700/600, pergamino, pergaminoTenue, tinta, peligro), leídas como ranuras y no como colores. El tipo `Paleta` se importa de `app/src/tema-momia.ts` (vive en el fichero del segundo juego, no en el tema de la casa). Los tokens que solo tenga tu juego no caben en `Paleta`: se exportan aparte.
*Si se olvida:* nada — el fichero queda muerto en el disco hasta el paso siguiente.

**27. Enganchar la paleta, el fondo y el ornamento.**
`app/src/tema-juego.ts`: hoy `paletaDe()` es literalmente `return juego === 'momia' ? COLOR_MOMIA : color;`. Añade la rama (o conviértelo en tabla), y lo mismo con `useEsMomia()` y `useFondo()`, que gobiernan las tres capas de fondo que pinta `Pantalla` y el glifo del `Ornamento` (`app/src/ui.tsx:276-289`).
*Si se olvida `paletaDe`:* la app entera se juega en fieltro verde, caoba y oro de salón. Sin error, sin aviso, sin pantalla en blanco. *Si se olvida solo el fondo:* engaña más — marcos, botones y barra ya salen del color nuevo y el fondo sigue siendo el fieltro de CLUEDO, así que parece a medio pintar y no mal tematizada.

**28. Los iconos que pida tu `barra`.**
Componente sobre el `Lienzo` de 48×48 con trazo 3, pensado para 23 px, en `app/src/iconos.tsx`; el id, en la unión `IconoId` de `shared/juegos/tipos.ts:228`.
*Si se olvida:* **no compila**, y esa es la parte buena: `ICONOS` es `Record<IconoId, …>`. Con una cadena libre la pestaña habría salido en blanco en el móvil y nadie se enteraría hasta la noche de la partida.

**29. La pantalla propia de la app.** *(obligatoria si alguna acción usa `eligeVarias` o `eligeOpcional` — ver paso 6)*
Tres sitios: `app/app/(juego)/<nombre>.tsx`, el id en `PantallaDeApp` (`shared/juegos/tipos.ts:250`), y la clave en `PANTALLAS` de `app/app/(juego)/_layout.tsx:30`. Lee lo suyo de `vista.estadoDelJuego`. **Obliga a publicar versión nueva de la app: es un binario.**
*Si falta el id o la clave:* no compila (los dos `Record` están cerrados a propósito). *Si están las dos y el manifiesto no la mete en `barra`:* la pantalla existe en el binario y **no hay forma de llegar a ella**; ninguna pestaña la abre, nadie ve un error, y el juego se juega sin ella.

**30. Bifurcar una pantalla compartida, si reutilizas una pestaña de la casa con otra mecánica.**
En `app/app/(juego)/ronda.tsx`, al lado de `if (vista?.sesion.juego === 'momia') return <Vigilia />;`. Va **después** de los `useState` del cuerpo y antes de cualquier otro `return`: React identifica los hooks por su orden de llamada.
*Si se olvida:* el fallo silencioso más caro de las dos interfaces. La pestaña «donde se juega» pinta la ronda de CLUEDO —elegir sala, ver pistas, acusar— y **la partida se juega como CLUEDO desde el móvil** aunque el taller, la barra y los colores sean tuyos.

**31. Los mandos propios para dirigir.**
`client/src/components/live/PanelDeTercero.tsx` recibiendo `PropsDeMandosPropios` (`{game, vista, ocupado, ejecutar}`) + entrada en `MANDOS_PROPIOS` de `client/src/components/live/LivePanel.tsx`. `ejecutar(fn)` ya llama, recarga y enseña el error.
*Si se olvida:* silencioso mientras se programa, carísimo la noche de la partida: quien dirige no ve NADA del estado propio y no puede decidir cuándo abrir la fase siguiente.

**32. Los trofeos.**
Tres cosas en el mismo commit: los ids en la unión `TrofeoId` (`shared/live.ts:293`), el array `trofeos: TrofeoInfo[]` en `shared/juegos/tercero.ts`, y el reparto:
```ts
registrarTrofeos('tercero', (cierre) => misTrofeos(cierre));
```
en el fichero donde vivan los datos del cierre (la Momia lo hace al final de `momia-sellado.ts:225`). Lo llama `server/src/live/cuentas.ts:131` vía `trofeosDelJuego`.
*Si falta el reparto:* la gente termina la partida, recibe los SEIS trofeos comunes de CLUEDO y **ninguno de los propios**, aunque el manifiesto los declare y la app los pinte como casillas apagadas para siempre. Si el reparto lanza, `trofeosDelJuego` se traga el error (log `[trofeos] …`): cero trofeos, cero errores.
*Dos avisos sobre los ids:* (a) **no llevan prefijo de juego** —'sellador', 'sombra'— así que dos juegos con el mismo nombre corto COLISIONAN en `Account.trofeos: TrofeoId[]` y el trofeo de uno aparece en la vitrina del otro sin error (`shared/live.ts:300-307` propone pasar a `tercero:sellador`). (b) el `glifo` tiene que estar en el plano básico Unicode: los jeroglíficos (U+13000) se pintan en Windows y salen **cuadraditos vacíos en iOS y Android**, que es donde se mira la vitrina (`momia.ts:40-51`), y los glifos tienen que distinguirse entre sí a 30 px (`momia.ts:69-81`).

---

### ETAPA 5 — «La trama, y quien la dicta»
`server/src/plot/` y `server/src/agent/`.
**Al terminar puedes probar:** sin clave de API (modo demo), pulsar el botón dorado y obtener un `Plot` completo y coherente de tu juego.

**33. La tabla de reparto IA/código, por escrito y ANTES de nada.**
`docs/tercero/DISENO.md`, sección equivalente al «§7. Lo que genera la IA, y lo que garantiza el código» de `docs/momia/DISENO.md`. Qué decide el código porque equivocarse deja la velada irresoluble, y qué escribe el modelo porque solo es sabor.
*Si se olvida:* se acaba pidiéndole al modelo la lógica del juego «porque acierta casi siempre». En un juego con restricciones cruzadas, «casi siempre» significa una velada de cada tantas sin solución, y no se ve al generar: se ve a las dos de la mañana con doce personas en la mesa.

**34. Los cimientos: una partida ya jugable ANTES de llamar al modelo.**
`server/src/plot/tercero-cimientos.ts`, con `cimientosDeTercero(entidades, { semilla })` al estilo de `momia-cimientos.ts`. Solución lógica, piezas redactadas de forma sosa, reparto, y todo lo que tenga que cumplir una garantía verificable. Solo hace falta si tu juego tiene una parte que puede estar MAL y no solo fea (CLUEDO no la tiene: no existe `cluedo-cimientos.ts`).
*Regla de conducta:* **reventar al preparar es lo correcto cuando la alternativa es fallar de noche.** `exigirQueTodosSePuedanEncontrar` LANZA en vez de arreglar. Decide explícitamente qué es aviso (`arreglo: 'aviso'`, la velada se afea) y qué es excepción (la velada no tendría solución).
*Detalle que no es menor:* si mandas piezas verdaderas y falsas al modelo, **numéralas DESPUÉS de mezclarlas** (`p-01, p-02…`). Con «v-1 / f-1» el modelo escribe las falsas con otro tono sin querer y se delatan solas; el código las vuelve a separar por posición al recibir la respuesta.
*Si se olvida:* la generación depende de que el modelo no se equivoque ni una vez. Con cimientos, ese mismo fallo solo cuesta prosa más sosa.

**35. El esquema de salida estructurada.**
`server/src/plot/tercero-esquema.ts` con `TERCERO_TRAMA_SCHEMA` e `interface RespuestaTercero`. `additionalProperties: false` en todos los objetos, `required` completo en cada nivel, y **nada de `minLength`/`minimum`** (las longitudes se piden en las `description`, que el modelo sí lee).
*Si se reutiliza `PLOT_SCHEMA`:* nada falla visiblemente. El modelo devuelve `solution.murdererId/weaponId/roomId`, `tramaAlDia` (`server/src/juegos/migracion.ts`) los convierte a los ejes de CLUEDO, y `repararRespuestas` (`server/src/juegos/solucion.ts`) recorre TUS ejes, no encuentra ninguno y asigna a cada uno **la primera entidad de su categoría**. La partida se genera, se imprime, se juega, y la respuesta correcta es siempre la primera persona de la lista.

**36. El prompt.**
`server/src/plot/tercero-prompt.ts` con `SISTEMA_TERCERO` y `construirPromptTercero(game, trama, entidades)`. **Termina SIEMPRE con `buildStyleBlock(game)`** (`server/src/plot/style.ts`).
*Si se olvida `buildStyleBlock`:* el estilo que escribe el anfitrión se guarda, se enseña en el taller, se le recuerda al GM en su dosier vía `styleNoteForGm`, **y el modelo no lo ve nunca**. El GM pide «una comedia disparatada» y le sale la trama de siempre. El bloque hace además tres cosas que no se pueden perder: acota el alcance del texto del usuario a tono y ambientación, fija que ante conflicto mandan los requisitos, y lo neutraliza como instrucción.

**37. El validador.**
`server/src/plot/tercero-validacion.ts`, al estilo de `momia-validacion.ts`: volver a leer con código cada frase que el modelo redactó sobre una pieza que el código decidió, y **sustituirla por la redacción de máquina cuando no se pueda AFIRMAR que dice lo mismo**. Comprobación de FORMA, no de semántica; la forma se le exige al modelo en el prompt.
*La asimetría es deliberada:* rechazar una frase buena cuesta una frase sosa; aceptar una mala cuesta la noche entera.
*Aviso:* el prompt y el validador son un contrato regla a regla (R3 ↔ `POSTERIORIDAD_DURA`, R4 ↔ `INMEDIATEZ`). Desincronizarlos no rompe nada visible: solo sube la tasa de sustituciones. La única señal es la línea de consola `[tercero] redacción del modelo aceptada en N de M`.
*Segundo aviso:* decide qué hacer en el caso ambiguo. Si dos entidades del puzle se llaman demasiado parecido, `lexicoDeRitos` marca `fiable: false` y la validación **se rinde entera**, sustituyendo todas las frases y desactivando la defensa contra filtrar el orden.

**38. El ensamblador, la llamada y la demo.**
`server/src/plot/tercero-generacion.ts`: `ensamblarTerceroTrama(game, entidades, cimientos, respuesta)` **pura**, y `generarTramaTercero(game, emit): Promise<Plot>` asíncrona. La pureza es lo que permite someterla a doscientas respuestas estropeadas sin tocar la red.
**Copia los dos bloques de `stop_reason`** (`refusal` y `max_tokens`): no se heredan, están escritos tres veces ya (`pipeline.ts`, `momia-generacion.ts`, `material.ts`). Sin ellos, un `max_tokens` entrega JSON truncado, `JSON.parse` da un error genérico y el GM reintenta en vez de reducir datos.
Y `server/src/plot/tercero-demo.ts` con `respuestaDeDemostracion(nombrePartida, entidades, trama)`: forma exacta de `RespuestaTercero`, coherente con los cimientos, **y correcta según tu propio validador al 100%** — si no pasa, el validador está rechazando su propio patrón, y eso es un fallo suyo que ninguna otra prueba enseñaría.
*Si se olvida la demo:* quien clone el repositorio sin clave de API no puede ver ni una partida de tu juego.
*Importa siempre de `shared/juegos` (el índice), nunca de `shared/juegos/entidades` directamente:* por el módulo suelto, `anotarAlmacenes` todavía no ha ocurrido y `entidadesDe(game, 'camaras')` devuelve lista vacía sin ningún error.

**39. La rama de generación. EL fallo silencioso de esta capa.**
`server/src/plot/pipeline.ts`, dentro de `runGeneration`, «Etapa 2: trama». Hoy es un `if` explícito (`const esMomia = game.settings?.juego === MOMIA.id;`), no un registro.
*Si se olvida:* no hay error, no hay aviso, **la generación termina en verde**. La partida se genera con `SYSTEM_TRAMA`, `PLOT_SCHEMA` y `construirPrompt` de CLUEDO: sale una trama de asesinato en los años veinte, con mansión y pasadizos, poblada con tus entidades, y `repararRespuestas` deja la solución apuntando a la primera entidad de cada eje. Literalmente: la velada se juega como CLUEDO con los nombres de tu juego.

**40. El escriba del taller y su rama.**
`server/src/agent/tercero-escriba.ts` con `buildSystemPromptTercero(game)` —identidad, reglas, adaptación a una casa real, cómo describir a las personas, estado actual, política de herramientas— **más la rama** en `server/src/agent/systemPrompt.ts` (hoy línea 52). Cada juego trae su prompt ENTERO, no un parche.
*Si se escribe el fichero y no la rama:* tu asistente es Edmund el mayordomo británico explicando refutaciones de Cluedo y los seis sospechosos clásicos — **pero con las herramientas correctas**, porque `herramientasDe` sí es genérico. Registra bien lo que le dictan, así que parece que funciona; solo el tono y los consejos son de otro juego.
**No escribas herramientas del agente:** se generan solas desde `manifiesto.categorias` (dos por categoría, `upsert_<singular>` y `remove_<singular>`, en el vocabulario del juego). Lo que se escribe bien es `presentacion` — **es** el prompt de la herramienta.

**41. Dónde se compone el material impreso.**
O dentro de `ensamblarTerceroTrama` (una sola llamada, como la Momia, porque sus piezas falsas tienen que sonar igual que las verdaderas) o en la segunda llamada de `POST /games/:id/material` (como CLUEDO, porque la principal roza su límite de tokens).
*El peligro concreto:* `server/src/routes/material.ts` **no comprueba de qué juego es la partida**, solo que haya trama. Disparada sobre una partida que ya trae su material compuesto, `generarMaterialImpreso` usa `culpableDe`/`objetoDe`/`lugarDe` de CLUEDO —que devuelven cadena vacía— y **sobrescribe** `plot.material` con narraciones escritas sobre un asesino, un arma y una sala vacíos.

---

### ETAPA 6 — «El papel»
`server/src/docs/imprimibles/`.
**Al terminar puedes probar:** descargar el ZIP de la partida y mirar las tres carpetas, y `?format=pdf` de cada documento.

**42. El catálogo y su unión, en un solo commit.**
Los ids en `PrintableDocId` (`shared/documents.ts:14-38`, en un bloque comentado propio como el de la Momia) **y** el array `IMPRIMIBLES_TERCERO: PrintableDocInfo[]` en `shared/juegos/tercero.ts` (id, name, summary, audience, modes, defaultOn, copies, sides — los ocho obligatorios), colgado del manifiesto.
*`audience` no es decoración:* decide en qué carpeta del ZIP cae en la partida a ciegas y es lo único que impide que quien dirige lea la solución. `paquete.ts:70`: **solo `'preparer'`** va a `03_SOLO_PREPARADOR_NO_ABRIR_GM`; todo lo demás cae en la carpeta de quien dirige. Fue el fallo real de `'papiro-sellado'`, corregido en `momia.ts:203-215`.
*`modes` mal puesto* borra el documento del paquete sin dejar traza: `renderPrintableDocument` devuelve `null` y `paquete.ts` no escribe nada, ni un `.ERROR.txt`.
*Y las tres funciones de `shared/documents.ts` (`printableDocsFor`, `printableDocInfo`, `isPrintableDocId`) reciben el catálogo POR PARÁMETRO con defecto `PRINTABLE_DOCS`.* Cualquier llamada nueva que se olvide de pasar `manifiestoDe(game.settings?.juego).documentos` compila y se comporta como CLUEDO.

**43. La imprenta, el envoltorio y los datos.**
- `server/src/docs/imprimibles/tercero/estilo.ts` exportando `hojaDeTercero(opciones)`, **copiando a conciencia la geometría de CLUEDO**: `@page { size: A4; margin: 15mm 14mm; }`, `print-color-adjust: exact`, `.hoja { max-width: 190mm }`, `page-break-inside: avoid`, el `@media print` y el bloque `[data-tema="blanco"]`. Importa `CSS_BARRA` de `../../estilos`, no lo copies.
  *Si se olvida:* sale con la imprenta de CLUEDO (burdeos #6d1a2a, Cinzel Decorative, pergamino #f1e5c9) y tu juego se ve como un Cluedo. *Si se olvida `print-color-adjust: exact`:* se ve bien en pantalla y **el navegador tira los fondos al imprimir**; los carteles salen en blanco.
  *El modo blanco no es «quitar el color»:* es vaciar superficies sin tocar la forma. Las piezas físicas del puzle **conservan su fondo**, o el papel se lee a contraluz.
- `server/src/docs/imprimibles/tercero/comun.ts`: `envolverTercero(titulo, contenido, opciones)`, `portadaTercero(...)`, `sinTrama(titulo, opciones)` y `ORNAMENTO`.
  *Si reutilizas `envolver` de `imprimibles/comun.ts`:* esa función inyecta `hojaDeImprenta()` a pelo, sin condicional, y **tu CSS no entra nunca**: documento con tus clases y sin las reglas que las definen. Fallo mudo, maqueta rota, cero errores. *Si te olvidas de `sinTrama`:* una partida sin `plot.delJuego` produce un folio en blanco o un `.ERROR.txt` en el ZIP en vez de decir qué falta.
- `server/src/docs/imprimibles/tercero/datos.ts` con `vistaDeTercero(game, plot)` y un `hay`. Cada plantilla arranca con `if (!vista.hay) return sinTrama(...)`.
  *Si se olvida:* nada peta y **los documentos se contradicen entre sí sobre el papel** (que la guía anuncie una cámara profanada y la tabla de marcas otra). Nadie lo ve hasta la noche.
- Si usas Unicode exótico: carga la fuente de Google Fonts **y que ningún dato viaje solo dentro de un glifo**. Son adorno; si no cargan, el documento se lee igual.

**44. Las plantillas y su registro.**
Una por documento en `server/src/docs/imprimibles/tercero/<documento>.ts`. Dos firmas válidas: `(game, plot, opciones)` y `(game, plot, vistaDelGm: VistaGm, opciones)` cuando el contenido cambia con el modo de dirección. Registro en `PLANTILLAS` de `server/src/docs/imprimibles/index.ts:48-79`, con lambda adaptadora si no toma vista. Y si tienes carteles de puerta, añade su id a `NECESITAN_SALAS` (`index.ts:82`).
*Si falta una plantilla de un id de la unión:* no compila (`Record<PrintableDocId, Plantilla>`). Eso es virtud: el paso 42 y este van forzosamente en el mismo commit. *Si tomas `vistaDelGm` y no lo usas:* fallo silencioso puro — el documento sale idéntico en modo anfitrión y a ciegas, y una hoja que diga «para quien dirige» acaba en la partida a ciegas exactamente en las manos que no pueden leerla. *Si te apoyas en la red runtime (`if (!plantilla) return null`):* el documento aparece en el índice y en el panel del taller, el ZIP lo omite en silencio y la ruta HTTP contesta 404 «Ese documento aún no puede componerse: genera antes el misterio», que manda a mirar la generación.
*Si no marcas `NECESITAN_SALAS`:* en una partida sin salas sale una hoja con portada y nada debajo, y quien imprime cree que le falta algo.

**45. Las secciones del dosier.**
Ids en `DocumentSectionId` (`shared/types.ts:283-298`) y catálogo `SECCIONES_TERCERO` en `shared/juegos/tercero.ts`, con `required: true` en las que no se pueden quitar.
*Si heredas `DOCUMENT_SECTIONS` de CLUEDO:* `incluye()` (`server/src/docs/renderer.ts:387`) busca la sección en el manifiesto, no la encuentra, `info?.required` sale `false`, y si el GM guardó alguna vez una selección, **la sección obligatoria de tu juego desaparece del dosier sin aviso** (`renderer.ts:376`: «el dosier de un expedicionario podía salir sin su don»).
*Sabe esto antes de invertir aquí:* `renderer.ts:501-506` solo tiene ramas para `rules`, `suspects`, `weapons`, `board` y `timeline`. **Las secciones propias no las pinta nadie**: aparecen en el diseñador del taller, se encienden y se apagan, y el dosier sigue siendo el de CLUEDO. Si tu juego necesita un dosier con forma propia, **escríbelo como IMPRIMIBLE**, como hizo la Momia con `'dosier-expedicionario'`.

**46. Arreglar el selector de imprimibles del taller.** *(deuda viva, hay que tocarla sí o sí)*
`client/src/components/documents/PrintablePicker.tsx`, líneas **25** y **47**: usan `PRINTABLE_DOCS` mientras la línea 26 ya tiene `const catalogo = manifiestoDe(game.settings?.juego).documentos` y solo la usa para `activos`.
*Si se deja como está:* el panel «Material para la mesa» enseña los TRECE de CLUEDO en tu partida, con los tuyos invisibles; y **al primer clic** `alternar` guarda ids de CLUEDO, `server/src/routes/games.ts:193` los filtra contra tu catálogo y guarda `[]`, y `printableDocsFor` distingue lista vacía («ninguno») de campo ausente («los de por defecto»). A partir de ese clic el ZIP sale con los dosieres de los jugadores y **CERO imprimibles**, sin un solo error.

---

### ETAPA 7 — «La red»
`server/scripts/`. No hay framework de tests ni runner agregado: son scripts sueltos y hay que ejecutarlos uno a uno.
**Al terminar puedes probar:** `npm run verify:tercero`, `verify:puzle-tercero`, `verify:tercero-trama`, `verify:secretos-agente` y `npm run oro:verificar -w server`, todos en verde.

**47. El armazón de aislamiento.**
`server/scripts/verificar-tercero.ts`: carpeta temporal con `fs.mkdtempSync(path.join(os.tmpdir(), 'gm-tercero-'))`, siembra de `data/db.json` dentro (`{games, messages, config, live, accounts}`), **puerto al azar** (`5X00 + Math.floor(Math.random()*400)`), `spawn(process.execPath, [TSX, SERVIDOR], { cwd: dir, env: { PATH, SystemRoot, TEMP, TMP, PORT, NODE_ENV: 'test' } })` con el entorno **enumerado a mano**, `esperarServidor()`, y un `finally` que mata el servidor y borra la carpeta.
*Si el cwd es el repo:* dotenv encuentra el `.env` de la casa y la prueba habla con el Atlas de **producción** y con la clave real de Anthropic. *Si intentas la variante de vaciar variables en PowerShell:* en Windows vaciar una variable la BORRA y dotenv carga el fichero igual (`ARCHITECTURE.md:29`). *Con puerto fijo:* falla una de cada cinco veces porque Windows tarda en soltar el puerto, y un verificador intermitente se acaba ignorando.

**48. El alta en `scripts`.**
`server/package.json`: `"verify:tercero": "tsx scripts/verificar-tercero.ts"` y uno por verificador extra.
*Si se olvida:* el fichero existe, compila y **nadie lo ejecuta jamás**. El `package.json` raíz no encadena nada.

**49. ACTO I — la velada entera por el cable.**
Un cliente `pedir(ruta, {metodo, cuerpo, testigo})` contra `http://127.0.0.1:${PUERTO}/api`: entrar con código personal, leer la vista, abrir ronda, ejecutar cada acción por `/api/jugar/accion`, cerrar, fase final, desenlace, comprobando código HTTP y contenido.
*Si se olvida:* la frontera cliente-servidor es `unknown` para TypeScript. Ahí vivió el fallo de `api.acusar`, que mandaba `{murdererId, weaponId, roomId}` cuando el servidor ya esperaba `{respuestas}`: **los tres paquetes compilaban** y la acusación se habría perdido en silencio.

**50. La comprobación de `instalados.ts` LEYENDO EL FICHERO COMO TEXTO.**
`comprobar('juegos/instalados.ts da de alta \`tercero-acciones\`', instalados.includes('tercero-acciones'))`, antes de arrancar nada.
*Si se olvida:* dos fallos, y el segundo es el grave. (a) Sin la línea, el verificador dirá «esta partida todavía no sabe hacer eso» treinta veces y nadie sabrá que falta un import. (b) **Peor: que el verificador importe a mano los módulos del juego.** Ya pasó con la Momia: el verificador pasaba en verde importando lo que producción no importaba.

**51. El barrido de la regla de oro sobre la vista de CADA jugador.**
Dos detectores, no uno: claves prohibidas a cualquier profundidad, **y la secuencia del secreto tanto serializada como reconstruida desde listas de objetos** (`comoIds`). Podar por RUTA solo las ramas legítimas (`LEGITIMAS = ['estadoDelJuego.yo.miPropuesta']`) antes de mirar, y comprobar aparte que la rama podada es pequeña y es la que crees.
Añade la **guarda de que hay material que barrer** (`papiroEnLaMesa >= 2`): en la sala de espera nadie tiene nada, así que un secreto que viajara no tendría dónde aparecer. Se descubrió rompiéndolo a propósito: **el primer barrido seguía en verde con la regla rota**.
Y prueba la **propiedad**, no un proxy de la forma: corre el resolutor de verdad sobre lo que cada persona ve y exige que le queden varias soluciones posibles. Prohibir que viaje una palabra no esconde nada si la prosa dice lo mismo, y cuesta una pantalla entera de la app.

**52. ACTO II — las reglas propias llamando a las funciones.**
Para lo que el cable no admite (acciones con `eligeVarias`/`eligeOpcional`, fases sin ruta genérica) y para las guardias que el motor intercepta antes del reductor. **Usa `rechazaPorque(que, fn, motivo)` — que exige el MENSAJE — y nunca `rechaza(que, fn)`.**
*Si se olvida:* reglas propias que no se ejercen nunca. Documentado: por el cable, el segundo `explorar` lo para el `vecesPorTurno` del motor antes de llegar al reductor, «se rompió a propósito y la velada seguía en verde». Y `rechaza` a secas dio verde dos veces con la regla quitada, porque saltaba otra regla distinta.
*Y prueba «una vez por partida» en la ronda 2*, no reintentando en la misma ronda: ahí el rechazo lo da el contador del motor.

**53. El verificador del generador, si el juego genera lógica.**
`server/scripts/verificar-puzle-tercero.ts`: **cientos** de instancias con semillas distintas y jugadores variando, **y su segunda mitad** — fabricar instancias rotas a propósito, una por garantía, y comprobar que el verificador las caza.
*Sin el granel:* «un generador que falla una vez de cada trescientas pasaría en verde trescientas veces y reventaría en casa de alguien, de noche, con la mesa puesta». *Sin las roturas:* la mitad de arriba «lo haría igual de bien una función que devolviera `ok: true` sin mirar».
*Dos trampas de método:* comprobar una regla estadística sobre UNA semilla da verde con la regla quitada (se arregló pasando a 40 tramas); y pedir pocos elementos a un generador que los ORDENA por calidad esconde el filtro que descarta a los malos (se arregló pidiendo doscientas).

**54. El verificador de la costura código↔modelo.**
`server/scripts/verificar-tercero-trama.ts`: coger la respuesta de demostración —correcta— y **estropearla a propósito**, una avería por vez, con las averías que un modelo comete de verdad (invertir un «antes», colar una pieza ajena, señalar a alguien que no está en la mesa, enumerar el orden verdadero dentro de una narración que se lee en voz alta). **Cada avería afirma DOS cosas: que se detecta y que el resultado queda sano.** Importa `ensamblarTerceroTrama` y no toca la red.
*Si solo compruebas la detección:* pasa en verde aunque el arreglo no se aplique nunca.

**55. Los centinelas del asistente.**
`server/scripts/verificar-secretos-del-agente.ts`: una cadena inventada por cada secreto propio en `CENTINELAS` (:94-112), una partida de tu juego sembrada con ellos, y **las dos** comprobaciones sobre `buildSystemPrompt(game)` y `executeTool(game, 'get_game_state', {})` — son otra rama por juego, lo que garantiza una no garantiza nada sobre la otra. Las entidades sembradas tienen que ir por TUS categorías, incluidas las que no tienen almacén.
*Si se olvida:* la regla se cumple hoy **por omisión**, no por diseño. El día que alguien añada «un resumen de la trama para que el asistente ayude mejor», se rompe en silencio y se descubre cuando un jugador le pregunta al asistente quién fue y se lo dice.

**56. Los trofeos por el gancho, no por la función propia.**
`trofeosDelJuego('tercero', {game, sesion, plot, jugador, eraSenalado, gano, acerto})`.
*Si solo compruebas `trofeosDe(...)`:* pasa en verde con el registro sin dar de alta, porque `trofeosDelJuego` se traga los errores a propósito y devuelve **lista vacía**.

**57. Los huecos de la plataforma, como pendientes y no como regla.**
Cuando una costura todavía no admite algo tuyo, ramifica por lo que el manifiesto DECLARE (`const porElCable = Boolean(definicion?.eligeVarias?.length)`), comprueba las dos ramas de verdad, y apila el aviso en un array `pendientes[]` que se imprime aparte del recuento de fallos.
*Si se congela el estado actual como regla:* la prueba se pone roja el día que alguien ARREGLA el hueco, sin que nada esté mal, y entonces se relaja o se borra. Pasó literalmente.

**58. La batería de regresión, antes de dar el juego por instalado.**
`npm run oro:verificar -w server`, `verify:partida`, `verify:segundo-juego`, `verify:sin-ejes`, `verify:campana`, `verify:entidades`, `verify:secretos-agente`. Lista canónica en `docs/momia/DISENO.md:398-406` y §12.
**Nunca ejecutes `npm run oro:capturar` para «arreglar» un diff:** reescribe `server/scripts/oro/instantanea.json` con lo que el código hace hoy y convierte cualquier regresión de CLUEDO en verde permanente.
Añade también, si tocaste `app/src`, los renglones de cualquier `rgba(...)` que hayas sacado de un `StyleSheet.create` a la lista `ESPERADO` de `app/src/comprobadores/verificar-tema.mjs`.

---

## Lo que se hereda gratis

**El motor y la ruta.** `ejecutarAccion()` (`server/src/juegos/motor.ts:91`) comprueba que la acción exista, que la fase la admita, que quien la pide participe, que sea su turno, que no repita más de `vecesPorTurno` y que **cada id elegido sea una entidad real de su categoría** — `eligeDe`, `eligeVarias` (número exacto, sin repetidos, orden conservado) y `eligeOpcional`. Todos los rechazos salen como `AccionInvalida` con texto en castellano listo para el móvil. La ruta `POST /api/jugar/accion` (`server/src/routes/jugar.ts:219`) ya sanea el cuerpo conservando arrays, exige credencial, ejecuta dentro de `mutar` y devuelve `{resultado, vista}` o 409. **Un juego nuevo no escribe ninguna ruta para sus acciones.** `ejecutarAccion` además apunta `{suspectId, accion, round, at}` en `sesion.acciones`.

**Concurrencia y persistencia.** `mutar` (`server/src/live/sesion.ts`) serializa por partida con candado, sube `rev`, guarda con `store.saveLive` y despierta a los móviles por `avisarCambio`.

**La máquina de fases entera.** `puedePasarA`, `TransicionInvalida`, `abrirRonda`, `cerrarRonda` (con volcado al tablón), `abrirAcusaciones`, `abrirSellado`, `revelarDesenlace`, y `cerrarEncuentro`/`abrirEncuentro` con su crónica para campañas. La tabla de transiciones **es** el juego: no hay código de fases que escribir.

**La acusación completa.** `acusar` (una por persona y para toda la partida, hora del servidor, el señalado no gana acusándose, `winnerId` al primero que acierta), `respuestaCompleta()`, `aciertos()`, `ejeDeJugadores()`, `esElSenalado()` — funcionan con dos ejes, con cinco o con ninguno. La pantalla de acusación de la app recorre `vista.ejes`, compuesto del manifiesto.

**La vista del jugador.** Dosier propio, conocimiento desbloqueado por rondas, giros personales, pistas de tu sala, tablón, cronología, crónica, narración, fotos firmadas, ejes con nombres de personaje, reglas del manifiesto, desenlace resuelto a nombres — con todas las defensas antitrampas de plataforma puestas. Más el hueco `estadoDelJuego` (`shared/live.ts:619`) rellenado solo por `proyectarEstado`.

**El panel de acciones genérico** (`app/src/acciones.tsx`): pinta cualquier acción del repertorio con los selectores ya resueltos a nombres por el servidor. **Es lo que hace que un juego nuevo sea jugable el primer día sin escribir una pantalla propia.**

**El cierre y los seis trofeos comunes** (`primera-partida`, `ganador`, `sabueso`, `culpable-impune`, `superviviente`, `escribano`) para cualquier juego, más la llamada al gancho propio. Y los trofeos propios en el perfil del móvil, calculados **por diferencia** con los comunes.

**El panel de quien dirige.** `vistaDeGameMaster` con ocupación, giros pendientes, listos y conectados; código de mesa, tabla de jugadores con códigos y presencia, denuncias, contador de acusaciones, y **los botones de fase, que existen exactamente cuando el grafo `manifiesto.fases` declara la transición**.

**El taller entero.** Una pestaña por categoría en el orden del manifiesto, con glifo y contador; el panel de alta completo (título, descripción, formulario, foto si `admiteFoto`, correo si `admiteEmail`, chips de sugerencias, galería redonda o cuadrada, tarjeta de vacío); el panel de plano con foto cenital y chinchetas para cualquier categoría `sonLugares`; las cuatro pestañas de la casa; los requisitos y el «Faltan ingredientes: …» deducidos de `minimo`; los tres estados del botón dorado con su confirmación en dos pasos; y la insignia de coherencia desde `computeStaleness`.

**La ruta y el catálogo.** `client/src/App.tsx` enruta `/:juego` y `/:juego/:gameId` con `SoloSiEstaInstalado`; `juegosInstalados()` alimenta la portada de la app (`app/src/vitrina.ts:113`) y el catálogo del taller, y valida la creación de partidas. Y la corrección de la barra de direcciones cuando la ruta dice un juego y la partida dice otro.

**El almacén por categoría.** `entidadesDe()`, `entidadDe()`, `nombreDeEntidad()`, `listaDeCategoria()`, `entidadesDelEje()` resuelven dónde vive cada cosa, con o sin campo heredado. Y `server/src/routes/entities.ts:214-219` deduce de `admiteFoto`/`admiteEmail` qué campos admite la API.

**Todo el chat del taller.** Streaming, `MAX_HISTORIAL=30`, `MAX_ITERACIONES=12`, ruta beta con fallbacks para `claude-fable-5` y `claude-opus-5`, bloques `tool_result`, eventos `ui` y `entities`, guardado del mensaje. Las herramientas comunes ya escritas (`get_game_state`, `set_game_name`, `set_game_style`, `ui_popup`, `ui_highlight`, `ui_navigate`, `start_generation`) y **las de alta y baja de todas tus categorías generadas desde el manifiesto**, con nombres, artículos y descripciones redactadas desde `presentacion`, `nanoid(10)`, guardado y devolución. `start_generation` saca los mínimos del manifiesto vía `faltanMinimos`.

**El SSE de generación entero** (`server/src/routes/generate.ts`, con `no-transform` y `X-Accel-Buffering: no`), las etapas 1 y 3 de `runGeneration` (`generateBoardLayout` con `rotuloCentralDelPlano`, `renderDocumentIndex`), `repararRespuestas` sobre tus ejes, el guardado, el `done`, y la vuelta a `'draft'` para reintentar. Más `getAnthropicClient()`, `resolveModel(game)` con su cascada, el paso automático a demo sin clave, y `buildStyleBlock`/`normalizeStylePrompt`/`getStylePrompt`/`styleNoteForGm`.

**Los imprimibles.** El ZIP entero (`armarPaquete` reparte por `audience`/`modes` en `01_PARA_TI`/`01_GAME_MASTER`, `02_JUGADORES(_NO_ABRIR_GM)`, `03_SOLO_PREPARADOR_NO_ABRIR_GM`), el LÉEME de la raíz, los prefijos numéricos, el motor de PDF sin puppeteer (`--print-to-pdf` sobre el Chrome o Edge instalados, con `SinNavegador` como salida digna), la ruta `GET /games/:id/documents/:docId` con `?variant`/`?format`/`?print`/`?download` **ya validando contra TU catálogo**, la tolerancia a fallos (`<ruta>.ERROR.txt` sin tirar el ZIP), `vistaGm(game)` ya calculado, `CSS_BARRA`/`barraDeImpresion`, `esc()`, el fontanero de `variant`, el filtrado por modo y selección, el panel del taller con glifo por `audience` y recuento por `copiasDe`, y la omisión automática de carteles si te apuntas a `NECESITAN_SALAS`. **Los imprimibles no se guardan en `game.documents`: se componen al vuelo, así que aparecen en partidas generadas antes de que el documento existiera, sin regenerar ni gastar tokens.**

**El asistente de la partida** (`server/src/live/consejero.ts`) ya habla el idioma del juego: saca las reglas de `manifiesto.reglas` y los rótulos de `sonLugares`/`sonJugadores`.

**La app.** Las pestañas de abajo —cuáles, en qué orden, rótulo e icono— desde `manifiesto.barra`, y el botón central desde `manifiesto.asistente`; `barra.tsx` no tiene ni una pestaña escrita a mano. La forma de la barra (muesca, saliente, filete, filo dorado, reparto) y el encogido automático del rótulo a partir de siete caracteres. Marco, Botón, Sello, Ornamento, Error, Pantalla, PieDePagina, reloj y telón de avisos, todos leyendo `useTema()`. Y el transporte de `vista.estadoDelJuego` hasta el móvil sin tocar la forma de la vista.

**Sitio para lo propio sin ampliar ningún contrato:** `LiveSession.estado` (Record abierto) y `Plot.delJuego` (`unknown`), transportados y persistidos sin que nadie mire dentro. `JuegoId` es `string`: no hay unión que ampliar para instalar un juego.

**El registro global anclado** con `Symbol.for('gamemasters.juegos.instalados')` y `…almacenes`: da igual por qué ruta se importe el módulo.

**La red de CLUEDO, que te protege de romper lo anterior:** el maestro de oro (52 imprimibles + 16 dosieres + velada de 16 pasos × 8 jugadores), `verificar-partida.ts`, `verificar-segundo-juego.ts` (dos ejes), `verificar-juego-sin-ejes.ts` (LA_OCA, por turnos, sin ejes, con acción propia y estado propio), `verificar-campana.ts`, `verificar-entidades.ts` (almacén genérico, alta/baja por `/games/:id/entidades/:categoria`, `POST /games` con `juego`, rechazo 400 del juego inexistente, herencia de `juego` en la sesión, `isPrintableDocId` con catálogo propio), y toda la verificación transversal (cuentas, tokens, invitaciones, proveedores, Google, borrado, credenciales, entorno, enlaces, legal, aguante). Más el armazón de comprobación (`comprobar`, `paso`, `fallos`, `process.exit`) y el patrón de aislamiento ya resueltos en cuatro ficheros: **no hay framework que instalar**.

---

## Lo que obliga a tocar código común

La deuda, de un vistazo. «Rompe» = no compila hasta que lo hagas. «Mudo» = compila y falla en silencio.

| # | Fichero | Qué se toca | Obligatorio | Cómo avisa |
|---|---|---|---|---|
| 1 | `shared/juegos/index.ts:9,49,99,101` | import + `INSTALADOS[…]` + `anotarAlmacenes()` + `export` uno a uno | Sí | **Mudo** (cae en CLUEDO / rechaza todas las acciones) |
| 2 | `shared/live.ts:293` | unión `TrofeoId` | Si hay trofeos | Rompe |
| 3 | `shared/types.ts:283` | unión `DocumentSectionId` | Si hay secciones | Rompe |
| 4 | `shared/documents.ts:14` | unión `PrintableDocId` | Si hay imprimibles | Rompe |
| 5 | `shared/juegos/tipos.ts:228` | unión `IconoId` | Si hay icono nuevo | Rompe |
| 6 | `shared/juegos/tipos.ts:250` | unión `PantallaDeApp` | Si hay pantalla nueva | Rompe |
| 7 | `shared/live.ts:23` + `:52` + `:696` + `cluedo.ts` + `momia.ts` + los 3 manifiestos de verificador | `LivePhase`, `FASES_EN_JUEGO`, `AvisoClave`, `fases` en CINCO manifiestos | Solo si fase nueva | Rompe (menos `FASES_EN_JUEGO`, que es **mudo**) |
| 8 | `server/src/juegos/instalados.ts` | un import por módulo con registro | Sí | **Mudo** (arranca verde, muere en la primera partida) |
| 9 | `server/src/plot/pipeline.ts` (`runGeneration`, Etapa 2) | rama `esTercero ? generarTramaTercero(…)` | Sí | **Mudo** (genera la trama de CLUEDO) |
| 10 | `server/src/agent/systemPrompt.ts:52` | rama `buildSystemPromptTercero` | Sí | **Mudo** (Edmund el mayordomo con tus herramientas) |
| 11 | `server/src/docs/imprimibles/index.ts:48-79` | imports + entradas en `PLANTILLAS` | Si hay imprimibles | Rompe |
| 12 | `server/src/docs/imprimibles/index.ts:82` | `NECESITAN_SALAS` | Si hay carteles de puerta | **Mudo** (hoja con portada y nada) |
| 13 | `server/src/live/sesion.ts` + `server/src/routes/live.ts:240` | función de transición + ruta POST | Si hay fase nueva o resolución propia | **Mudo** (404 delante de la mesa) |
| 14 | `server/src/agent/momia-herramientas.ts` (`faltanMinimos`) | excepción de «exactamente N» | Si tu juego lo pide | **Mudo** (se acepta uno de más) |
| 15 | `server/package.json` (`scripts`) | `verify:tercero`, `verify:puzle-tercero`, `verify:tercero-trama` | Sí | **Mudo** (nadie lo ejecuta nunca) |
| 16 | `server/scripts/verificar-secretos-del-agente.ts` | `CENTINELAS` + partida sembrada + 2 comprobaciones | Sí | **Mudo** (regla de oro sin vigilar) |
| 17 | `server/scripts/verificar-entidades.ts` | caso del juego nuevo | Opcional | **Mudo** |
| 18 | `client/src/styles/temas.css` | bloque `:root[data-juego='tercero']` | Sí | **Mudo** (taller color mansión) |
| 19 | `client/src/lib/tema.ts` (`FUENTES_DE_JUEGO`) | url de Google Fonts | Si hay fuente propia | **Mudo** (ni petición fallida) |
| 20 | `client/src/juegos/palabras.ts` | objeto `PalabrasDeJuego` + `articulos` + `rotulos` | Sí | **Mudo** (todo el taller habla de CLUEDO) |
| 21 | `client/src/juegos/reglas.ts` (`CUENTA_EXACTA`) | `'tercero:<categoria>': N` | Si hay «exactamente N» | **Mudo** |
| 22 | `client/src/pages/CatalogPage.tsx` (`GAMES`) | tarjeta + arte SVG | Sí | **Mudo** (juego invisible en la portada) |
| 23 | `client/src/components/transition/TransicionDeEntrada.tsx` (`TRANSICIONES`) | una línea | Opcional | **Mudo** (puertas de caoba) |
| 24 | `client/src/components/agentchat/AgentChatPanel.tsx` (`RETRATOS`) | una línea | Opcional | **Mudo** (cara del mayordomo, tu nombre) |
| 25 | `client/src/components/board/BoardView.tsx` (`EMBLEMAS`) | `(cx,cy) => JSX` | Opcional | **Mudo** (lupa de CLUEDO, y se imprime) |
| 26 | `client/src/components/live/LivePanel.tsx` (`MANDOS_PROPIOS`) | una línea | Si hay estado propio | **Mudo** (dirigir a ciegas) |
| 27 | `client/src/components/documents/PrintablePicker.tsx:25,47` | **arreglar** `PRINTABLE_DOCS` → `catalogo` | Sí | **Mudo, y roto HOY** (un clic deja el ZIP sin imprimibles) |
| 28 | `app/src/iconos.tsx:293` (`ICONOS`) | componente por icono | Si hay icono nuevo | Rompe |
| 29 | `app/app/(juego)/_layout.tsx:30` (`PANTALLAS`) | una clave | Si hay pantalla nueva | Rompe |
| 30 | `app/src/tema-juego.ts` (`paletaDe`, `useEsMomia`, `useFondo`) | rama del juego nuevo (hoy es un ternario contra `'momia'`) | Sí | **Mudo** (app entera en verde CLUEDO) |
| 31 | `app/app/(juego)/ronda.tsx` | línea de bifurcación | Si reutilizas la pestaña | **Mudo** (la partida se juega como CLUEDO desde el móvil) |
| 32 | `app/src/comprobadores/verificar-tema.mjs` (`ESPERADO`) | un renglón por `rgba` sacado de un `StyleSheet.create` | Opcional | **Mudo** (por definición) |

Dependencia rara que conviene saber: el tipo `Paleta` de la app **vive en `app/src/tema-momia.ts`**, el fichero del segundo juego. El tercero importa su contrato de ahí.

---

## Las trampas
Ordenadas por lo que cuesta caer en ellas. Las cinco primeras familias son todas de fallo silencioso.

### Nivel 1 — La partida se juega entera como otro juego
1. **`manifiestoDe()` nunca devuelve undefined.** `shared/juegos/index.ts:143`: `INSTALADOS[id ?? JUEGO_POR_DEFECTO] ?? CLUEDO`. Es deliberado (las partidas viejas no llevan `juego`) y es la trampa madre de la que cuelgan casi todas las demás. Por eso `server/src/routes/games.ts:70-81` valida el id al crear. Variante del mismo fallo: si la partida se crea sin `settings.juego` o la sesión se abrió antes de fijarlo, `sesion.juego` queda vacío y se juega CLUEDO **sin un solo error**. El propio código lo llama «de los peores que hay: el que no falla».
2. **Olvidar el alta en `shared/juegos/index.ts`.** Tres fallos de tres formas; solo uno de ellos (el 400 al crear partida) se ve.
3. **Olvidar el import en `server/src/juegos/instalados.ts`.** El servidor arranca perfecto, **todos los verificadores siguen en verde porque importan los módulos a mano**, y la primera partida real contesta «Esta partida todavía no sabe hacer eso» a cada acción, pantalla en blanco y sin trofeos.
4. **Olvidar la rama de `server/src/plot/pipeline.ts`.** La generación termina en verde con `SYSTEM_TRAMA`, `PLOT_SCHEMA` y `construirPrompt` de CLUEDO: trama de asesinato en los años veinte poblada con tus entidades, y `repararRespuestas` deja la solución en la primera entidad de cada eje.
5. **Olvidar la bifurcación de `app/app/(juego)/ronda.tsx`.** La pestaña donde se juega pinta la ronda de CLUEDO. Todo lo demás se ve correcto.
6. **Reutilizar `PLOT_SCHEMA` en vez de escribir el tuyo.** Mismo destino que el 4, por otra puerta: `tramaAlDia` convierte a los ejes de CLUEDO y la respuesta correcta acaba siendo siempre la primera de la lista.

### Nivel 2 — El secreto se filtra
7. **Proyectar el estado entero por comodidad.** La solución viaja al móvil; se gana abriendo las herramientas del navegador.
8. **La vista del GM manda la `LiveSession` ENTERA, `estado` incluido.** No hay proyección por juego para quien dirige (`proyeccion.ts:372` devuelve `{sesion, …, revelaSolucion}`). Es correcto mientras quien dirige no juegue, pero `gmPlays` existe y **`revelaSolucion` solo tapa `plot.solution`, no `sesion.estado`**.
9. **La regla de oro del asistente se cumple por OMISIÓN, no por diseño.** Ni `buildSystemPrompt` ni `get_game_state` leen `game.plot` salvo el título. La primera herramienta que devuelva el `Plot` entero la rompe sin que nada falle. Y los secretos de un juego nuevo viven en `plot.delJuego`, que es `unknown`: exactamente el sitio por el que se filtra algo sin que nadie lo note.
10. **Un barrido de fugas escrito a medias da verde con la regla rota.** Tres formas probadas: barrer en la sala de espera, cuando nadie tiene material («se rompió mandando el dato siempre y el primer barrido seguía limpio»); buscar solo la secuencia serializada y no verla servida como lista de objetos («la secuencia estaba ahí, troceada por los `nombre` de en medio»); y podar `LEGITIMAS` sin la contra-comprobación de que la rama podada es la que crees.
11. **Numerar las piezas verdaderas antes de mezclarlas con las falsas.** Le regala al modelo cuáles son mentira; las escribe con otro tono sin querer y una pista que suena distinta se delata sola.
12. **Meter las piezas propias en `plot.clues` porque «se parecen a pistas».** La proyección genérica reparte por sala y no sabe de piezas falsas: el móvil recibiría las mentiras marcadas como pistas del caso.

### Nivel 3 — La noche se rompe o la velada es irresoluble
13. **Fase sin salida hacia `desenlace`.** La partida no se puede terminar. Ya se pagó en CLUEDO.
14. **Fase declarada en el manifiesto sin ruta POST en `server/src/routes/live.ts`.** El taller pinta el botón porque el manifiesto declara la transición, y el botón llama a una ruta que no existe: **404 delante de la mesa**. Ocurrió con El Sellado.
15. **Acción del manifiesto sin reductor.** Aparece en la app y responde 409 al pulsarla. No falla al arrancar ni al compilar.
16. **`turnos: 'por-turnos'` sin que nadie escriba `sesion.turnoDe`.** `motor.ts:116` es `if (sesion.turnoDe && …)`: con el campo vacío la condición ni se evalúa y **cualquiera actúa en cualquier momento**.
17. **Categoría de personas o de lugares sin `almacen`.** El motor valida bien y media plataforma se queda vacía: sin dosieres, sin correos, sin emparejamiento de móviles, sin lista de salas, sin ocupación, sin plano — con las entidades existiendo.
18. **Categoría con `almacen` pero sin `anotarAlmacenes()`.** El motor rechaza TODAS las acciones con «Esa no es una opción válida», y los verificadores de CLUEDO siguen en verde porque sus tres categorías van en el literal inicial de `CAMPO_HEREDADO`.
19. **Un módulo compartido cargado por dos caminos son dos módulos, y una tabla de módulo se duplica.** Pasó con `shared/juegos/entidades.ts`. Ancla todo registro con `Symbol.for`.
20. **Escribir el estado propio en `game` en vez de en `sesion`.** Se pierde sin error: la acción parece funcionar y al refrescar no ha pasado nada. **Y un `Map` o un `Set` sobrevive a `structuredClone` y se convierte en `{}` al persistir**: el estado se vacía solo al reiniciar el servidor.
21. **Llamar desde la proyección a una función que muta.** Escribes una vez por refresco de cada móvil y el resultado cambia solo.
22. **Sin validador de la redacción del modelo.** «El Aliento precede al Agua» escrito donde la restricción decía lo contrario no rompe nada visible; a las dos de la mañana no hay ningún orden que cumpla los papiros. Y si dos entidades se llaman demasiado parecido, la validación se rinde ENTERA en silencio y además deja de aplicar la defensa contra filtrar el orden.
23. **`refresh.ts` no se ramifica por juego y nunca toca `plot.delJuego`.** Añadir una persona después de generar dispara `ampliarTrama` con `PLOT_EXTENSION_SCHEMA` y un sistema que dice «Eres un novelista de misterio experto en CLUEDO»: dosier de novela negra, sin entrada en lo propio del juego, y sin recalcular el reparto. Nadie ve un error.
24. **`POST /games/:id/material` no comprueba de qué juego es la partida.** Disparada sobre un juego que ya trae su material compuesto, sobrescribe `plot.material` con narraciones escritas sobre un asesino, un arma y una sala vacíos.
25. **`winnerId` significa «el primero que acertó la acusación», y eso solo es ganar en CLUEDO.** Un juego de bandos lleva sus ganadores por su cuenta, y la plataforma seguirá anunciando y premiando al de `winnerId`, trofeo común `ganador` incluido.
26. **Los `stop_reason` no se heredan.** Sin los bloques `refusal` y `max_tokens`, un truncado llega a `JSON.parse` como «la respuesta del modelo no es un JSON válido» y el GM reintenta en vez de reducir datos.
27. **Importar de `shared/juegos/entidades` en vez del índice `shared/juegos`.** Las categorías salen vacías sin ningún error, porque `anotarAlmacenes` todavía no ha ocurrido.

### Nivel 4 — El material equivocado llega a la mesa
28. **El selector del taller, `client/src/components/documents/PrintablePicker.tsx:25,47`. Está roto HOY.** Enseña los trece de CLUEDO, y al primer clic guarda ids de CLUEDO → el servidor los filtra contra tu catálogo y guarda `[]` → `printableDocsFor` distingue lista vacía de campo ausente → **el ZIP sale sin ningún imprimible, para siempre, sin un error**.
29. **El catálogo de imprimibles va por parámetro con defecto CLUEDO** (`shared/documents.ts:280`). Cualquier llamada nueva que se olvide de pasarlo mezcla los documentos del juego equivocado, e `isPrintableDocId` contesta «ese dosier todavía no se ha generado» sobre un documento que sí existe.
30. **`audience` mal puesto.** Solo `'preparer'` va a `03_SOLO_PREPARADOR_NO_ABRIR_GM`; todo lo demás cae en manos de quien dirige. Fue el fallo de `'papiro-sellado'`: la partida a ciegas se quedaba sin árbitro.
31. **`modes` mal puesto.** El documento desaparece del paquete sin dejar traza, ni siquiera un `.ERROR.txt`.
32. **Sin `reglas` propias.** Los tres consumidores hacen `manifiesto.reglas ?? REGLAS_JUGADOR`: tu juego enseña las de CLUEDO en la app, en el dosier impreso y en la boca del asistente.
33. **Heredar `DOCUMENT_SECTIONS` de CLUEDO.** `info?.required` sale `false` y la sección obligatoria de tu juego desaparece del dosier del jugador sin aviso.
34. **Y aunque las declares, las secciones propias no las pinta nadie.** `renderer.ts:501-506` solo tiene ramas para `rules`, `suspects`, `weapons`, `board`, `timeline`. Un dosier con forma propia se escribe como IMPRIMIBLE.
35. **Reutilizar plantillas de CLUEDO tiene precio.** `'indice-paquete'` ya lista TUS documentos pero con la maqueta, la tipografía y los textos de CLUEDO («Cuelga los carteles de sala…», «El sobre del crimen») en la hoja por la que se abre el paquete. `'etiquetas-sobres'` es peor: su contenido se calcula con la lógica de rondas y pistas por sala de CLUEDO — la Momia lo declara con `defaultOn: false`.
36. **`envolver` de `imprimibles/comun.ts` inyecta `hojaDeImprenta()` a pelo.** Tus clases sin sus reglas: maqueta rota, cero errores.
37. **Olvidar `print-color-adjust: exact`.** Se ve bien en pantalla y los carteles salen en blanco al imprimir.
38. **Copiar el `TEMA_BLANCO` de CLUEDO tal cual.** El modo blanco es vaciar superficies sin tocar la forma: las piezas físicas del puzle conservan su fondo o el papel se lee a contraluz.
39. **Sin módulo de datos único, los documentos se contradicen entre sí sobre el papel.** Nadie lo ve hasta la noche.

### Nivel 5 — Funciona, y dice CLUEDO
40. **`palabrasDe()` devuelve CLUEDO como respaldo declarado.** Todo el taller funciona y todo habla de la mansión: «Casos de CLUEDO», «✦ GENERAR MISTERIO», Edmund el mayordomo.
41. **`paletaDe()` es un ternario contra `'momia'`, no una tabla.** La app entera en fieltro verde. Y el fondo va aparte (`useFondo`/`useEsMomia`), así que se puede quedar a medias, que engaña más.
42. **`app/src/ui.tsx:452` reexporta la constante estática `color`,** y diez pantallas la importan de ahí: `cuaderno.tsx`, `mapa.tsx`, `perfil.tsx`, `personaje.tsx`, `ronda.tsx`, `tablon.tsx`, `acusar.tsx`, `consejero.tsx`, `desenlace.tsx`, `entrar.tsx`. Marco del color nuevo, texto del de CLUEDO. **Ya pasa hoy con la Momia** (`tablon.tsx:55`).
43. **En la app NO existe equivalente de `palabras.ts`.** Del manifiesto solo sale el rótulo de la pestaña; los títulos de dentro están a mano en el castellano de CLUEDO: «Tablón común», «Tu cuaderno», «Las estancias», «La casa». Hoy la barra de la Momia dice «Tumba» y la pantalla se titula «Las estancias».
44. **El asistente tiene dos nombres a la vez en la app.** La barra usa `manifiesto.asistente.nombre`; `app/app/consejero.tsx:117,129,137` está firmado «El Mayordomo» a mano.
45. **`RETRATOS[juego] ?? AvatarMayordomo`.** Cara de uno y firma de otro en la misma cabecera, porque el nombre sí sale del manifiesto.
46. **`EMBLEMAS[juego] ?? EMBLEMAS.cluedo`.** La lupa de detective en el centro de tu plano — **y el plano se imprime**.
47. **El chat en modo demo no se ramifica.** Sin clave de API, el asistente de cualquier juego es Edmund con los mínimos de CLUEDO (`server/src/agent/demo.ts` no consulta `game.settings?.juego` en ninguna parte). Las mutaciones sí son reales, así que parece que funciona.
48. **El asistente de la partida no ve NADA de `vista.estadoDelJuego`.** Pregúntale por tus marcas o tus fragmentos y contesta a ciegas.
49. **El recibidor listará también las partidas de los otros dos juegos.** `GameSummary` no lleva `juego`; el filtro de `CluedoLobbyPage.tsx` ya está escrito para funcionar el día que se añada el campo.

### Nivel 6 — Falsa sensación de haberlo configurado
50. **`ManifiestoDeJuego.ronda` es obligatorio y no lo lee absolutamente nadie.** Poner una categoría inexistente o un número equivocado no rompe nada. El límite real de repeticiones lo pone `vecesPorTurno`, y el «un solo cambio por ronda» de CLUEDO está cableado dentro de `elegirSala`.
51. **`eligeVarias` y `eligeOpcional` no se pintan en el panel genérico.** Se validan bien por HTTP y el jugador no tiene con qué mandarlos: botón sin campos, y «Falta elegir: …» al pulsarlo.
52. **`ordenada` no lo comprueba el motor**: es una nota para el reductor y para la pantalla.
53. **Un campo no declarado se descarta en silencio.** El motor construye `datos`/`listas` solo con lo declarado: un dato suelto no llega al reductor y no da error, simplemente no está.
54. **`export *` en `shared/juegos/index.ts` compila y revienta al arrancar** con «does not provide an export named 'aciertos'».
55. **Los ids de `TrofeoId` no llevan prefijo de juego.** Dos juegos que elijan el mismo nombre corto colisionan en `Account.trofeos` y el trofeo de uno aparece en la vitrina del otro sin error.
56. **Glifos fuera del plano básico Unicode.** Se pintan en Windows y salen cuadraditos en iOS y Android, que es donde se mira la vitrina. Y tienen que distinguirse entre sí a 30 px.
57. **`temas.css` solo puede repintar tokens.** Mover una caja no es un tema, es otra pantalla. Y el tema cuelga de `<html>` a propósito: envolverlo en un `<div>` está probado y **falla a medias**, que es peor — los alias de `theme.css` se resuelven en `:root` y los overlays cuelgan de `<body>`.
58. **«Exactamente N» no cabe en el manifiesto:** hoy es una excepción a mano dentro de `faltanMinimos` (`if (cat.id === 'ritos' && cuantas !== 5)`).
59. **Al comprobar mínimos, lee con `entidadesDe` y nunca con `listaDeCategoria`:** la de escribir deja `entidades: {}` en partidas de CLUEDO que no lo tenían, y el maestro de oro compara byte a byte.
60. **Las herramientas del turno del chat se calculan UNA vez**, con la partida tal como estaba al empezar el turno; `systemText` también.
61. **El prompt y el validador son un contrato.** Desincronizarlos no rompe nada: sube la tasa de sustituciones y las frases salen sosas. Única señal: una línea de consola.
62. **El maestro de oro NO protege tu juego.** Está cableado a CLUEDO en cuatro sitios (`oro.ts:40, :53-63, :169, :271`) y su verde no dice nada de ti: puedes filtrar la solución en un cartel de puerta y `npm run oro:verificar` sigue verde. Y **`npm run oro:capturar` es destructivo**: ejecutarlo para «arreglar» un diff convierte una regresión de CLUEDO en verde permanente.
63. **`rechaza(que, fn)` da verde con la regla quitada**, porque la excepción la lanza otra regla. Ocurrió dos veces en el mismo fichero. Usa `rechazaPorque` y prepara el estado para que la otra regla no muerda.
64. **`vecesPorTurno` tapa tus reglas propias con el mismo 409.** «Una vez por partida» se prueba en la ronda 2, no reintentando en la misma.
65. **Una regla estadística sobre una sola semilla, un generador que ordena por calidad al que le pides pocos elementos, y un empate con la ganadora primera en la lista:** las tres pasan en verde con la regla quitada.
66. **`trofeosDelJuego` se traga los errores a propósito:** un alta que falte no da error, da lista vacía.
67. **Un verificador intermitente es peor que no tenerlo.** Tres fuentes ya identificadas: puerto fijo en Windows, reparto de culpa al azar, y roturas construidas «cogiendo la primera y dándole la vuelta».
68. **Congelar una costura incompleta como si fuera la regla.** La prueba se pone roja el día que alguien la arregla, y entonces se relaja o se borra. Usa `pendientes[]`.
69. **No hay ningún runner que encadene los `verify:*`,** y la lista canónica de lo que tiene que seguir en verde vive en `docs/momia/DISENO.md:398-406`, no en el código.