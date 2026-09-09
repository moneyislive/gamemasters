# EL BURGO — el diseño definitivo (3 de 3: comprobadores, fases, ficheros, riesgos, fuera de alcance)

> Si algo de aquí no coincide con el código, gana el código. Parte 3 de
> [DISENO.md](DISENO.md) (§0–§4) y [DISENO-2.md](DISENO-2.md) (§5–§7).

---

## 8. Los comprobadores y la batería

Regla de la casa: un comprobador que no está en `BATERIA` de `scripts/verificar-todo.mjs`
no es una red, es un fichero. Todos los del Burgo llevan `COMPROBACIONES_ESCRITAS` real con
margen (~10), imprimen las rojas ANTES de salir por el guardia, y cada regla lleva vacuna
(un caso envenenado visto caer, también el FILTRO: cero inspeccionados es cero fallos).
`npm run verificar` desde la raíz, con Vite/Metro/pestañas 3D apagados, mirando el CÓDIGO DE
SALIDA (`npm run verificar > salida.txt 2>&1; echo $?`; `| tail` devuelve siempre 0); sin
`--rapido` (salta 13 lentos, incluidos los que arrancan el servidor); los tres rojos por
contención se miran antes de repetir.

### 8.1 La tabla que gobierna: fallo silencioso que este árbol ya sufrió → quién lo caza en el Burgo

| # | Lo que pasó | Cómo muerde al Burgo | Quién lo caza |
|---|---|---|---|
| F1 | Verde falso por lista fija: `verify:mesa`, `oro:arcade`, `determinismo`, `larga` sólo juegan Ronda/Frente/Riberas. | El Burgo entero puede estar roto con toda la batería en verde. | `verify:burgo`, `verify:burgo-en-tres`, `verify:burgo-escena`, guion `EL_BURGO` en `oro:arcade`, robot del Burgo en `guion-determinismo.ts`, `BURGO` en `reprochesDeSecretos` de `verificar-mesa.ts`. |
| F2 | Comprobador verde por filtro roto; guardias a mano. | Un `for` que no itera da verde. | `COMPROBACIONES_ESCRITAS` con margen, rojas antes del guardia, vacuna por regla y por filtro. |
| F3 | Las pruebas en proceso no ven el arranque (proyección obligatoria, `seAcabo`, `loSecreto`, `undefined`). | `secretos: true`: cuatro puertas que aguantar. | Los `lento: true` que levantan servidor (`verify:mesa`…), y `verify:burgo` llama las cuatro con `undefined` y con `sonda:mesa-vacia` ADEMÁS. |
| F4 | El bucle que dice jugar y no juega (26 de 40 vueltas ofreciendo trueques, 856 comprobaciones en verde). | Un robot que pase sin tirar «juega» sin rentas ni quiebras. | `verify:burgo` exige por partida, contado desde `sucesos`: ≥ 1 quiebra, ≥ 3 rentas, ≥ 1 almoneda ganada, ≥ 2 entradas en la Mazmorra, ≥ 1 barrio entero alzado, ≥ 1 trato aceptado, un ganador. |
| F5 | `loSecreto` con números planos da rojos falsos; un secreto en un `id` es invisible. | Azar y dos mazos; las cartas se leen en voz alta. | Series distinguibles; la carta revelada como NÚMERO; ids del vocabulario público; `reprochesDeSecretos(BURGO, …)` sobre las siete miradas Y sobre cada motivo. |
| F6 | Un no-op debe devolver EL MISMO objeto; el tic entra en cada lectura. | Tic en reunida/terminada; movimiento desconocido. | `verify:burgo`: identidad tras tic en `reuniendo`/`terminada` y tras 50 movimientos inventados; `rev` no sube. |
| F7 | El plazo se reprograma sólo cuando cambia `turnoDe`; ≤ 8 tics por lectura; con `plazoMs 0` ninguno. | Almoneda, apuro y tratos son fases dentro del turno. | `turnoDe` = a quien se espera; mesa con `plazoSegundos: 1` y todos ausentes termina en ≤ 2.500 tics; ningún tic en `jugando` devuelve el mismo objeto. |
| F8 | Un `Rechazo` no puede filtrar lo que la proyección no enseña; nadie lo caza. | Motivos que digan «la siguiente carta es…». | Motivos desde la VISTA; vacuna: un motivo con `'p07'` cae. |
| F9 | `undefined` en carga/vista revienta `canonico` al pintar; `NaN` pasa en silencio. | 40 caras, 28 títulos, rentas. | `porQueNoEsCanonico(vista) === null` en CADA revisión de 7 miradas; cargas `{}`; enteros por tabla; `Math.ceil` sólo sobre enteros y la tabla de desempeño escrita a mano. |
| F10 | Las caras del retablo no tienen capa de dedos. | El respaldo SVG. | `caras.every(c => c.toque === null)` y `nudos.every(...)`; `opcionesSueltas` devuelve exactamente las opciones sin `declaracion`. |
| F11 | Pintor elegido por `manifiesto.id === RIBERAS` en `sala.tsx`; `verify:sala` cuenta filas; `verify:escritorio` exige UN muelle. | Un segundo pintor 3D. | `PINTORES_PROPIOS` y edición a sabiendas de los tres comprobadores en el mismo commit. |
| F12 | Hermes no decodifica PNG; `GLTFLoader` sanea nombres; `_TINTE` → `_tinte`. | `burgo.glb`. | Ya: `verify:burgo-modelos` (41). Gana `MULTIPLICIDADES` importadas de `presupuesto.ts` y la lista ampliada de ficheros sin marca. |
| F13 | Dos copias de three/react: `useFrame` mudo. | Cualquier dependencia nueva. | Cero dependencias nuevas; `verify:burgo-escena` barre imports de `escenas/burgo/` (sin drei/DOM/Expo/fetch); ternas, no `Vector3`, en props. |
| F14 | El servidor de Riberas publica la SUMA y el cliente inventa el par. | Los dobles son regla. | `tirada: [n, n]` en estado y vista; vacuna: vista con un solo número → `dadosEnTres` null. |
| F15 | `COLORES_EN_3D` son cuatro; con 5-6 Riberas cae al SVG. | Aforo 6. | Seis colores propios teñidos con `_TINTE`; contraste medido (§1 decisión 13). |
| F16 | `routes/modelos.ts` sirve por nombre fijo: sin ruta, 404 en Render y 200 en el banco. | `burgo.glb`. | Ruta + `rutaDelBurgo()` + `burgo-servido` por HTTP real. |
| F17 | Presupuesto: 50 ms por movimiento/tic/opciones; 512 KiB; cuarentena permanente por arcade. | Cascada de quiebra al Concejo (hasta 28 almonedas). | Cifras con p50/p99 y peor caso en `verify:burgo`, topes propios a 1/5 (§8.6). |
| F18 | «Se ve bien» no es una comprobación; los imprimibles se miden. | La escena. | Aritmética pura en `escenas/burgo/*.ts` medida en Node; el banco sólo confirma con ojos. |
| F19 | `launch.json` caduca; `sala` apunta a OTRO worktree; PowerShell no entiende `VAR=x`. | Probar en los dos clientes con servidor. | Entradas `burgo-*` propias en el worktree del Burgo. |
| F20 | Empujar a `main` despliega solo; `.glb` no servido = 404. | `burgo.glb` de 2,8 MB. | Ya versionado; `burgo-servido` lo pide por HTTP; variables (ninguna nueva) antes del push. |

### 8.2 `verify:burgo` (`server/scripts/verificar-burgo.ts`, sin `lento`) — quien escribe: comprobadores, con reglas

Con `abrirMesa`/`jugarConMotivo`/`avanzarElReloj` del árbitro real (`arbitro.ts`) y el robot
`server/scripts/robot-del-burgo.ts` (elige de `opciones()` con azar propio SEMBRADO; compra
todo lo que puede, alza en cuanto tiene barrio, propone y acepta tratos razonables, puja
hasta el precio; compartido por oro y determinismo):

| Bloque | Qué afirma | Vacuna |
|---|---|---|
| La tabla | §2.2 entera, la tabla de desempeño de 28 valores, contraste de las 8 aceras con blanco ≥ 3:1 y de los 6 asientos contra cada acera y entre sí (máximo por canal ≥ 60/255, suma ≥ 100), ninguna marca en literales | una renta decreciente inyectada cae; un color a 30 de distancia cae |
| Las cuatro puertas | `avanzar/proyectar/loSecreto/seAcabo` con `undefined` y con `sonda:mesa-vacia`; la vista del espectador con `undefined` declara `turnoDe: null` (`turnoDeLaVista`) | — |
| Rentas | solar suelto, barrio entero sin casas (doble), 1–4 casas, posada; puerta ×1..4 (empeñada cuenta para el número y no cobra); oficio 4×/10× con el par; empeñado no cobra; dueño presa cobra; propio no paga | quitar el doble del barrio → cae |
| Parejo | segunda casa antes de que todos tengan una → rechazada con motivo; vender de donde hay más; posada con 4 casas y precio de una más; posada devuelve 4 casas; sin casas en el Concejo → no se ofrece; venta de posada: degrada si hay ≥ 4 casas, si no 5 × mitad | — |
| Dobles y Mazmorra | dobles repite; tres dobles → Mazmorra sin mover ni cobrar; presa: fianza / indulto / dados; dobles sale sin repetir; tercer intento paga y mueve; presa cobra, alza y trata; de visita no pasa nada | quitar el tope de 3 → cae |
| Cartas | las 32 aplicadas UNA a una desde estados montados con `mesaSobre` (cada efecto: ir con/sin cobro, puerta cercana renta doble, oficio cercano 10× con tirada nueva, retrocede 3 y resuelve —cayendo en el Arca 33—, reparaciones, cada-uno-paga con `colaDeApuros`, Indulto que sale del mazo y vuelve al fondo al usarse, el mazo rota) | el fondo del mazo no vuelve → cae |
| Empeño | mitad; desempeño +10 % por TABLA; no empeñar con edificios en el barrio; el que recibe un empeñado por trato paga el interés o el trato se rechaza | — |
| Almoneda | relevo por asiento; mínimo 10 y múltiplos; `pujar:minimo/+50/+100` distintas entre sí y ≤ mrs; puja libre sólo por la puerta con campos EXACTOS (relleno de 8 kB rechazado); ganador paga; nadie puja → Concejo; el que declinó puja; cola de quiebra | — |
| Apuro y quiebra | no se puede pasar en apuro; vender y empeñar saldan solos; varios acreedores; quiebra con jugador (todo a él, interés en el acto o apuro del acreedor); con el Concejo (títulos desempeñados y almonedas en cola; Indultos al fondo); `RENDIRSE` en y fuera de apuro | — |
| Tratos | proponer por puerta (del turno y AL del turno); campos exactos; tope 3; un lado vacío sí, los dos no; aceptar revalida las dos partes (título vendido en medio → rechazo sin decir qué); retirar; caducan al relevar; el trato con un título que cambia de mano por otro trato cae | — |
| Tic por el ausente | tabla §2.6 caso a caso; la partida con todos ausentes acaba; no-op en reuniendo/terminada por identidad; el tic no contesta tratos; ≤ 8 tics por lectura no bloquean | tic que copia el estado → cae |
| «Sólo si» | cada tipo mandado fuera de su momento → mismo objeto y motivo; cada motivo pasa `reprochesDeSecretos` | motivo con `'p07'` → cae |
| Determinismo escalón 1 | `reejecutarEn(id, undefined, diario)` == `canonico(estado)` al final de 4 partidas con `SEMILLAS` fijas y tics intercalados | — |
| Secretos | `reprochesDeSecretos(BURGO, estado, SIETE_MIRADAS, false)` en cada revisión; las 32 series no aparecen en ninguna vista ni en ningún `rotulo`/`ayuda`/`id` de opción | vista con `pregon` sin recortar → cae |
| Canónico y forma | `porQueNoEsCanonico(vista) === null` para 7 miradas en cada revisión; forma CERRADA de la vista (lista exacta de campos de §3.1); ninguna carga `undefined`; `caras`/`nudos` sin `toque`; `opcionesSueltas` sin duplicados; ids de caras/nudos únicos; `jugada` sube exactamente uno por cambio; `sucesos.length ≤ 64` conservando el final | `rotulo?:` inyectado → cae |
| Juega de verdad (F4) | partidas enteras con 2, 3 y 6 asientos hasta ganador; los mínimos de §8.1 F4 contados desde `sucesos` | robot que sólo pasa → cae |
| Migración | un estado sin `version` o con un campo menos pasa por `comoSiSiempreHubieraHabidoBurgo` y sale entero; con `version: 1` devuelve el MISMO objeto | — |
| Presupuesto (§8.6) | cifras impresas siempre | — |

Guardia `MINIMO` ≥ 300 con margen; el primer tic sobre mesa `undefined` cuenta como cambio
(rev 1): conocido, no es fallo.

### 8.3 `verify:burgo-en-tres` (`server/scripts/verificar-burgo-en-tres.ts`, `lento: true`) — comprobadores, con app/escritorio

Clon de `verificar-riberas-en-tres.ts`: mesas reales, `proyectar` + `opciones` en cada
paso; `tableroEnTres` casilla a casilla contra la vista; cada `tocable` es una opción que
`opcionesDelBurgo` ofrece y el movimiento es el de la opción SIN montar nada;
`opcionesFueraDelTablero` ∪ tocables ∪ dados ∪ hoja = todas las opciones sin puertas,
exactamente UNA vez; `pujaEnTres.montar(cuanto)` y `tratoEnTres.montar(...)` caben en su
puerta y el reductor los acepta; `sucesosEnTres` con `+1` devuelve la lista y con `+2`
deriva sin perder posiciones ni dinero; `firmaDelTablero` estable entre dos vistas iguales
y distinta si cambia una casa; vista de otro juego → `null`; mirón sin dados; `dadosEnTres`
trae el PAR y nunca lo inventa; la hoja no nombra una carta no robada; filtros «una vez y ni
una más». Y **`burgo-servido`**: levanta el servidor, `GET /api/arcade/modelos/burgo.glb` →
200, `model/gltf-binary`, bytes == fichero; y el ciclo HTTP entero (abrir con
`plazoSegundos: 0`, sentar seis con figura, `empezar`, 30 movimientos por el sondeo con
`x-asiento`, un 409 `revision-rancia` provocado al vestir en vuelo y reintentado, un rechazo
con `motivo` en la respuesta y `null` en la lectura, `empezada: true` tras el primer cambio).

### 8.4 `verify:burgo-escena` (`escenas/scripts/verificar-burgo-escena.ts`) — comprobadores, con escena

Aritmética pura en Node, sin Canvas: `anillo-en-3d` (los 40 sitios forman un anillo cerrado
de 100 × 100 sin solapes, esquinas en 0/10/20/30, las puertas 5/15/25/35 en los medios
encaradas con las de la muralla a ± 0,5, la muralla cierra —suma de tramos + esquinas =
lado—, el carril de la calle fuera de todo edificio, las rejillas de peones y casas caben
en sus bandas con la huella medida); `EDIFICIO_DE_LA_CASILLA` ⊂ `nombresDelBurgo()` y
ninguno pasa de 7,6 de frente ni 9 de fondo medido en el `.glb`; `presupuesto.ts` × `.glb`
real ≤ 110.000 (plena, lleno, una exploradora) y ≤ 90.000 (sobria), llamadas ≤ 70 sumando
la tabla §5.2 (vacuna: posada = taberna cae); `peon.ts` 10.000 pasos con semilla 0 y las
duraciones reales (nunca `t-pose`, nunca un clip fuera de `CLIP`, posición a ≤ 1,5 de la
polilínea, doce casillas en ≤ 8 s, tres en ≤ 6,75 s, «a la Mazmorra» sin pisar casillas);
`coreografia.ts`: ninguna cola de un movimiento real dura más de 14 s y saltarla deja el
estado final; `dados-del-burgo.ts`: las mismas 9 transiciones que `faseDeLosDados` más «el
par no se inventa»; cámara: con `proyecta`, en 16:9, 3:4 y 9:19,5 las cuatro esquinas caben
en la pose de salida y a `masCerca` una casilla ocupa ≥ 45 % del alto; `acercar.ts` con los
límites del Burgo acota y con los de siempre sigue dando lo de `verify:escena`; imports de
`escenas/burgo/` sin drei/DOM/Expo/fetch. `COMPROBACIONES_ESCRITAS` real.

### 8.5 Los que se tocan a mano (verde falso si no)

- `server/scripts/verificar-mesa.ts`: `BURGO` en el bucle de `reprochesDeSecretos`
  (constantes 291-293) y un bloque HTTP corto (abrir, sentar 3, empezar, tirar, comprar,
  vencer plazo por lectura de un espectador).
- `server/scripts/oro-arcade.ts`: `EL_BURGO: GuionDeArcade = { arcade: BURGO, semilla:
  20260909, inicial: () => undefined, miradas: [ESPECTADOR, 's1', 's2', 's3', 's4'], guion:
  () => apuntesDelRobot(...) }` (`inicial` es `() => unknown`, `oro-arcade.ts:175`; nunca
  `undefined` a secas) con `quien` y `asientos` por apunte y tics intercalados cada 7;
  `GUIONES = [LA_FRENTE, EL_BURGO]`. Captura: `npm run oro:arcade -- capturar` desde
  `server/` escribe `server/scripts/oro-arcade/burgo.json` y SALE CON 1 por Frente ya
  congelado: esperable; NUNCA `--forzar`. Se commitea el `.json`.
- `server/scripts/guion-determinismo.ts`: robot del Burgo con las cuatro `SEMILLAS`
  (escalón 2: Node contra Hermes 0.12, `hermes-engine-cli`). El comprobador dice «los
  motores no coinciden» ante sintaxis moderna: pista mala, anotada en la cabecera.
- `app/src/comprobadores/verificar-sala.mjs`, `escritorio/scripts/verificar-escritorio.tsx`,
  `escenas/scripts/verificar-embarcadero.ts`: §6 y §7 de la parte 2.
- `escenas/scripts/verificar-burgo-modelos.ts`: importa `MULTIPLICIDADES` de
  `escenas/burgo/presupuesto.ts` (no copia) y baja el techo del fichero a lo medido + 10 %;
  `FICHEROS_DEL_BURGO` (l.132-136) se amplía a `shared/arcade/juegos/burgo*.ts`,
  `app/src/arcade/*burgo*`, `escritorio/src/*burgo*`, `escenas/aventureros/marioneta.ts` y
  `docs/burgo/*.md`; la cabecera dice que la casilla es 8 × 14 y la losa la Mazmorra; guardia
  41 → real.
- `scripts/verificar-todo.mjs`: `{ nombre: 'El Burgo', donde: 'server', guion: 'verify:burgo',
  porque }` y `'El Burgo en tres'` (`lento: true`) detrás de `'Riberas en tres'` y delante
  de `'La Larga'`/`'núcleo del arcade quieto'`; `'burgo · escena'` en escenas detrás de
  `'burgo · modelos'` (l.747). Guiones en `server/package.json` (`verify:burgo`,
  `verify:burgo-en-tres`) y `escenas/package.json` (`verify:burgo-escena`).
- Los que se pasan sin tocarlos y hay que correr igual: `verify:pureza`, `verify:fronteras`,
  `verify:procedencia`, `verify:nucleo-quieto`, `verify:nucleo`, `verify:presupuesto`,
  `verify:larga`, los cuatro `typecheck`, `verify:gramatica`, `verify:app`,
  `verify:canvaskit`, `verify:rutas` (no hace falta ruta nueva; `router.d.ts` no se toca).

### 8.6 Las cifras de presupuesto que `verify:burgo` mide e imprime (con `performance.now`, permitido en guiones)

| Medida | Cómo | Tope propio (producción) |
|---|---|---|
| `avanzar` por movimiento | 4 partidas × ~400 movimientos; p50, p99 y peor | p99 < 2 ms, peor < 10 ms (50) |
| `avanzar` por tic, peor caso | apuro del ausente con 28 títulos y 44 edificios liquidado en UN tic | < 10 ms (50) |
| `opciones()` | en cada lectura de 7 miradas | peor < 3 ms (50) |
| `proyectar()` con tablero | ídem | peor < 5 ms (50) |
| estado canónico | tablero lleno, 3 tratos, 64 sucesos | < 24 KiB (512) |
| vista canónica | ídem | < 40 KiB (—) |
| opciones por lectura | peor | ≤ 60 y < 12 KiB |
| carga de movimiento | la mayor legal (trato con 28 títulos) | < 1 KiB (8) |
| cascada de quiebra al Concejo | 28 almonedas encoladas, 6 pasando | ≤ 170 movimientos y ningún estado > 24 KiB |

---

## 9. El plan por fases, con criterio de aceptación y lo que corre en paralelo

Cada fase deja `npm run verificar` ENTERO en verde y algo JUGABLE en los dos clientes.
Commits de una frase en castellano sin prefijo, cuerpo con la petición de Miguel citada,
lista por capa, «Batería: N/N en verde», vacunas vistas caer, `Co-Authored-By: Claude Fable
5.1 <noreply@anthropic.com>`. Cinco equipos: **R** reglas, **E** escena, **A** app, **D**
escritorio, **L** lobby, más **C** comprobadores repartido entre ellos.

| Fase | Qué | Criterio de aceptación medible | Paralelo |
|---|---|---|---|
| **0. El diseño** (hecho con este documento) | `docs/burgo/DISENO*.md` en su commit ANTES del código; `.claude/launch.json` con `burgo-server/-escritorio/-movil`; `router.get` de `burgo.glb` + `rutaDelBurgo()` (es lo único del `.glb` que falta). | `curl localhost:5174/api/arcade/modelos/burgo.glb` → 200 con 2.822.452 bytes; batería verde (78 entradas con `burgo · modelos`). | — |
| **1. Reglas y respaldo** (R + C; 3–4 sesiones) | `burgo-tablero.ts`, `anillo.ts`, `hacienda.ts`, `mazo.ts`, `burgo.ts` ENTERO (estado, reductor con tratos, tic, proyección, retablo en cuatro tiras, opciones, secreto, fin), alta en `index.ts`, `verify:burgo` + `robot-del-burgo.ts`, `BURGO` en `verify:mesa`, `oro:arcade` capturado, robot en determinismo, entradas en `BATERIA`. | Servidor arranca (`npm run dev -w server`, no sólo tsx); el Burgo sale en la Sala y en `GET /api/arcade`; `verify:burgo` ≥ 300 comprobaciones con las cifras de §8.6 en verde; determinismo Node = Hermes; **una partida entera de 3 entre la app (web) y el escritorio con servidor real, abriendo desde uno y sentándose desde el otro, hasta ganador, SIN pintor propio** (tirar, comprar, renta, alzar, empeñar, almoneda con escalones, Mazmorra, quiebra, fin). | Con 2, 3 y 5 desde el primer día: este documento ES el contrato (`VistaDelBurgo`, `SucesoDelBurgo`, `PropsDelBurgo`). |
| **2. La escena estática** (E; 3 sesiones) | `escenas/burgo/{tipos,anillo-en-3d,presupuesto,camara-del-burgo,tinte-del-burgo}.ts`, `Burgo.tsx` con el mundo fundido, peones, casas, banderas, marca y cámara; `acercar.ts` y `tinte.ts` parametrizados; `marioneta.ts` y `calidad.ts` extraídos; `banco-burgo.html`; `verify:burgo-escena` (geometría, presupuesto, cámara). | Banco: ≤ 110.000 triángulos y ≤ 30 llamadas con el tablero lleno y una exploradora quieta (`gl.info.render`); el anillo cabe en las tres ventanas; una casilla a `masCerca` se lee; `verify:burgo-escena` verde con vacunas; `verify:escena` y `verify:embarcadero` siguen verdes tras parametrizar y extraer. | Con 1 (estado montado a mano en el banco, sin servidor). |
| **3. La traducción** (R o A; 1–2 sesiones) | `burgo-en-tres.ts` entero, `verify:burgo-en-tres` con `burgo-servido`. | ≥ 200 comprobaciones; cada opción exactamente una vez; `sucesosEnTres` con +1 y +2; GET del glb 200 por HTTP. | Con 1 (sobre vistas montadas) y 2. |
| **4. Coreografía** (E; 2–3 sesiones, tras 2) | `peon.ts`, `coreografia.ts`, `dados-del-burgo.ts`, `Aventurero.tsx`, sucesos en `Burgo.tsx`; banco con «reproducir diario». | En el banco: el aventurero anda casilla a casilla y corre con 12 en ≤ 8 s, dobla las esquinas sin T-pose, entra en la Mazmorra con reja, las monedas vuelan, la casa brota, la bandera se clava, el naipe sube, la cámara sigue y vuelve, tocar salta la cola; `verify:burgo-escena` con `peon.ts` 10.000 pasos. | Con 3 y 5. |
| **5. Los dos clientes** (A ∥ D; 3–4 sesiones, tras 2 y 3) | App: `burgo-en-tres(.-escena).tsx`, `hojas-del-burgo.tsx`, `pintados.ts`, `verificar-sala.mjs`. Escritorio: `pintores.ts` + `sala.tsx` por tabla + `lienzo-propio.tsx` + `burgo-en-tres.tsx` + `hojas-del-burgo.tsx` + `estilo.css` (`.lienzo-propio`) + `verificar-escritorio.tsx`. | Partida de 6 en 3D entre escritorio y app web con servidor real; **en Android físico (APK de desarrollo) 30 fotogramas sostenidos en `sobria`**, aventurero animado, sin PNG; el móvil en retrato juega con la hoja sin mirar el anillo entero; el respaldo aparece al cortar el glb (404 simulado) y al reventar el Canvas; `verify:sala`, `verify:gramatica`, `verify:escritorio`, `verify:canvaskit`, los `typecheck` verdes. | App y escritorio en paralelo entre sí. |
| **6. Lobby** (L; media sesión) | `TEMAS['burgo']`, `verify:escritorio` a dos muelles, `verify:embarcadero` con la paleta. | Desde la app y el escritorio: abrir → Muelle con «A las puertas del Burgo» → seis aventureros con los colores del Burgo → «Se abre el Burgo» → tablero con las figuras elegidas. | Con 5 (puede hacerse en la fase 1 sobre el retablo). |
| **7. Publicar** (1 sesión) | `docs/burgo/` al día con «cómo se midió»; `app/app.json` + `app/package.json` (+ `package-lock.json`) a 1.6.0 en commit «La app pasa a 1.6.0: …»; `eas build` perfil `apk`; release `v1.6.0` con `harkania-1.6.0.apk`; sólo `APK_VERSION` en Render; variables (ninguna nueva prevista) ANTES del push; fusión a `main` (que despliega solo). | Producción sirve `burgo.glb` (200) y una mesa del Burgo se juega desde el APK y desde `/sala`. | — |
| **8. La Plaza** (E + L; opcional, 3–4 sesiones) | `escenas/plaza/`, `tema.escena`, `switch` en los dos muelles, `cargadorPara.burgo()`, banco, `verify:plaza`. | Tres ventanas × cinco aforos con `proyecta`; seis en la plaza ≤ 110.000; los aventureros entran por la puerta y salen corriendo al zarpar; sin `.glb` nuevo. | Después de todo. |

Orden crítico: 1 → 3 → 5; 2 → 4 → 5; 6 en cualquier momento tras 1; 7 tras 5 y 6; 8 al
final. Las fases 1, 2 y 6 arrancan el mismo día.

---

## 10. Los ficheros: ruta → qué va dentro → quién lo escribe

Quién: **reglas** | **escena** | **app** | **escritorio** | **lobby** | **comprobadores**.

| Ruta | Crear/Tocar | Qué va dentro | Quién |
|---|---|---|---|
| `docs/burgo/DISENO.md`, `DISENO-2.md`, `DISENO-3.md` | CREAR | este diseño; primer commit | (hecho) |
| `shared/mecanicas/anillo.ts` | CREAR | `casillaTras`, `recorrido`, `cruzaLaSalida`, `distanciaAdelante`, `masCercana`, `sitioDeCasilla`, `medioLado`, `encuadre`; sin trigonometría | reglas |
| `shared/mecanicas/hacienda.ts` | CREAR | `transferir(saldos, de, a, cuanto): { saldos, pagado, deuda }`; enteros; claves con comparador | reglas |
| `shared/mecanicas/mazo.ts` | CREAR | `robar` (rota al fondo), `sacar`, `devolverAlFondo`; puro | reglas |
| `shared/arcade/juegos/burgo-tablero.ts` | CREAR | las 40 casillas, 8 barrios con color, 32 cartas, constantes, tablas de empeño (§2.2) | reglas |
| `shared/arcade/juegos/burgo.ts` | CREAR | manifiesto, constantes de movimiento, `COLORES_DEL_BURGO`, estado, `partidaNueva`, migración, reductor, tic, proyección, tablero declarado, opciones, `loSecreto`, `seAcabo`, pregón y aviso | reglas |
| `shared/arcade/juegos/burgo-en-tres.ts` | CREAR | la traducción vista → escena (§4) | reglas (con app) |
| `shared/arcade/juegos/index.ts` | TOCAR | `instalarArcade` del Burgo y reexportaciones UNA a UNA con alias (`seAcabo as seAcaboElBurgo`, `EMPEZAR as EMPEZAR_BURGO`, `partidaNueva as partidaNuevaDelBurgo`) y `export type { … }` | reglas |
| `server/scripts/robot-del-burgo.ts` | CREAR | robot determinista sobre `opciones()`; apuntes para oro y determinismo | comprobadores |
| `server/scripts/verificar-burgo.ts` | CREAR | §8.2 | comprobadores |
| `server/scripts/verificar-burgo-en-tres.ts` | CREAR | §8.3 (con `burgo-servido`) | comprobadores |
| `server/scripts/oro-arcade/burgo.json` | CREAR (capturar) | el maestro de oro | comprobadores |
| `server/scripts/oro-arcade.ts`, `guion-determinismo.ts`, `verificar-mesa.ts` | TOCAR | `EL_BURGO` en `GUIONES`; robot del Burgo; `BURGO` en secretos + bloque HTTP | comprobadores |
| `server/src/routes/modelos.ts` | TOCAR | `router.get('/arcade/modelos/burgo.glb', …)` detrás de `dados.glb` | escena (fase 0) |
| `server/package.json` | TOCAR | `verify:burgo`, `verify:burgo-en-tres` | comprobadores |
| `escenas/ruta-de-modelos.ts` | TOCAR | `rutaDelBurgo()` | escena (fase 0) |
| `escenas/acercar.ts` | TOCAR | límites y altura mínima por parámetro con el valor de siempre por defecto | escena |
| `escenas/embarcadero/tinte.ts` | TOCAR | referencia de azul por parámetro (`AZUL_DEL_PACK` por defecto) | escena |
| `escenas/aventureros/marioneta.ts` | CREAR | `giroCorto`, `Marioneta`, `montaMarioneta`, `desmontaMarioneta`, `reproduce` extraídos; `aventurero.tsx` los importa | escena |
| `escenas/embarcadero/calidad.ts` | CREAR | `juzgarCalidad`, `MuestraDelHilo` extraídos de `app/src/arcade/muelle-escena.tsx:106`; la app lo importa de aquí | escena |
| `escenas/burgo/tipos.ts` | CREAR | §5.9 | escena |
| `escenas/burgo/anillo-en-3d.ts` | CREAR | geometría en unidades de mundo, `EDIFICIO_DE_LA_CASILLA`, huecos, polilínea, muralla, plaza, esquinas | escena |
| `escenas/burgo/presupuesto.ts` | CREAR | `MULTIPLICIDADES` plena/sobria y topes (§5.2) | escena |
| `escenas/burgo/coreografia.ts` | CREAR | duraciones, curvas, cola como máquina pura (§5.7) | escena |
| `escenas/burgo/peon.ts` | CREAR | la máquina pura del aventurero (§5.3) | escena |
| `escenas/burgo/dados-del-burgo.ts` | CREAR | `faseDeLosDadosConPar` (§5.4) | escena |
| `escenas/burgo/camara-del-burgo.ts` | CREAR | alcance, mirador, límites, seguimiento, poses (§5.6) | escena |
| `escenas/burgo/tinte-del-burgo.ts` | CREAR | geometrías teñidas por color y gris de luminancia para `instanceColor` | escena |
| `escenas/burgo/Burgo.tsx`, `Aventurero.tsx` | CREAR | la escena (three + React + núcleo r3f) | escena |
| `escenas/burgo/piezas.ts` | TOCAR | cabecera: casilla 8 × 14, losa = Mazmorra, posada pintada como casa + bandera; nada más | escena |
| `escenas/scripts/verificar-burgo-escena.ts` | CREAR | §8.4 | comprobadores |
| `escenas/scripts/verificar-burgo-modelos.ts` | TOCAR | `MULTIPLICIDADES` importadas, techo del fichero, `FICHEROS_DEL_BURGO` ampliado, guardia | comprobadores |
| `escenas/scripts/verificar-embarcadero.ts` | TOCAR | paleta del Burgo contra `burgo.ts`; guardia 72 → real | lobby |
| `escenas/embarcadero/tema.ts` | TOCAR | fila `burgo` en `TEMAS` (§7) | lobby |
| `escenas/package.json` | TOCAR | `verify:burgo-escena` | comprobadores |
| `app/src/arcade/burgo-en-tres.tsx` | CREAR | envoltura `lazy` + `Suspense` | app |
| `app/src/arcade/burgo-en-tres-escena.tsx` | CREAR | la pantalla: vestíbulo, catálogo, Canvas, mirador, hoja, respaldo | app |
| `app/src/arcade/hojas-del-burgo.tsx` | CREAR | las ocho secciones con widgets de RN | app |
| `app/src/arcade/pintados.ts` | TOCAR | `[BURGO]: ElBurgoEnTres` | app |
| `app/src/arcade/muelle-escena.tsx` | TOCAR | importa `juzgarCalidad` de `escenas/embarcadero/calidad.ts` | app |
| `app/src/comprobadores/verificar-sala.mjs` | TOCAR | `BINARIO.juegos`, bucle de constantes, guardia | app |
| `app/app.json`, `app/package.json`, `package-lock.json` | TOCAR (fase 7) | 1.6.0 | app |
| `escritorio/src/pintores.ts` | CREAR | `PINTORES_PROPIOS` (§6.2) | escritorio |
| `escritorio/src/lienzo-propio.tsx` | CREAR | lo genérico copiado de `riberas-en-tres.tsx` | escritorio |
| `escritorio/src/burgo-en-tres.tsx` | CREAR | el pintor + `MarcadorDelBurgo` | escritorio |
| `escritorio/src/hojas-del-burgo.tsx` | CREAR | el cajón/raíl: las ocho secciones con DOM | escritorio |
| `escritorio/src/sala.tsx` | TOCAR | los cinco puntos por tabla | escritorio |
| `escritorio/src/estilo.css` | TOCAR | `.burgo-*`, `.lienzo-propio`, la cadena de pantalla completa | escritorio |
| `escritorio/src/muelle.tsx` | TOCAR | exporta `traer` | escritorio |
| `escritorio/banco-burgo.html`, `escritorio/src/banco-burgo.tsx` | CREAR | el banco | escena |
| `escritorio/scripts/verificar-escritorio.tsx` | TOCAR | regex de la tabla, `laPaginaDePie`, dos muelles, bloque `burgoEnTres()`, guardia 719 → real | escritorio (+ lobby) |
| `scripts/verificar-todo.mjs` | TOCAR | `El Burgo`, `El Burgo en tres`, `burgo · escena` | comprobadores |
| `.claude/launch.json` | TOCAR | `burgo-server`, `burgo-escritorio`, `burgo-movil` | (fase 0) |
| `arte/README.md` | TOCAR | filas de los cuatro packs nuevos (dungeon, furniture, restaurant, halloween) si no están | escena |

Lo que NO se toca: los 13 sellados (`shared/arcade/{index,motor,movimiento,opciones,proyeccion,reloj,tipos}.ts`,
`server/src/canal/*`, `shared/mecanicas/{azar,canonico}.ts`, `server/src/arcade/{arbitro,mesas}.ts`),
`app/app/(arcade)/_layout.tsx`, `app/src/arcade/muebles.ts`, `hoja-del-muelle.tsx`,
`escritorio/src/riberas-en-tres.tsx` (salvo nada), `metro.config.js`, `vite.config.ts`,
`escenas/modelos/burgo.glb` (no se recompila en esta ronda), `escenas/dados.ts`,
`caras-del-dado.ts` (generado).

---

## 11. Riesgos y trampas, con mitigación

Además de la tabla §8.1 (que ya asigna comprobador), lo que hay que tener delante mientras
se escribe:

| Riesgo o trampa | Mitigación |
|---|---|
| **Hermes 0.12 en determinismo** lee sintaxis y API modernas como «los motores no coinciden». | `burgo.ts` en ES2015 llano; `.sort` siempre con comparador; `Object.keys(...).sort` nunca `for…in`; `Math.ceil`/`floor` sólo sobre enteros; sin `at`, `hasOwn`, `replaceAll`, `toSorted`, `structuredClone`, `**`. |
| **Skinning en `expo-gl`** (huesos en `DataTexture` flotante) sin iPhone físico y sin medida Android en el tablero. | UN aventurero; en `sobria` ninguno (el peón se desliza); fase 5 acepta sólo con Android real; si el skinning falla en un aparato la escena sigue con el peón y `alFallar` lo anota. |
| **Worklets**: `Gesture.Pan().manualActivation(true)` con `.runOnJS(true)` compila y la cámara no gira en nativo. | Se reutiliza `usarMiradorTactil` sin tocarlo; `verify:sala` barre. |
| **La rev sube al sentarse y al vestir**: un movimiento en vuelo vuelve 409 `revision-rancia`. | `mesa.ts` de los dos clientes ya reintenta; `burgo-servido` lo provoca a propósito. |
| **`plazoSegundos: 0`**: ningún tic jamás. | El Burgo no caduca nada por tiempo; los tratos caducan por turno. |
| **Almoneda y turno**: `turnoDe` salta entre pujadores y el plazo se reprograma en cada puja; seis ausentes son cinco tics. | Es lo diseñado; `verify:burgo` afirma que `turnoDe` cambia en cada tic que resuelve algo. |
| **La cascada de quiebra al Concejo** (hasta 28 almonedas, ~150 tics con todos ausentes, ≤ 8 por lectura: 19 lecturas). | Medido en §8.6. Alternativa si molesta en mesa (decisión abierta con dueño: Miguel): «los títulos del quebrado vuelven al Concejo sin almoneda», regla de casa. |
| **Sondeo largo**: cada respuesta es una vista NUEVA; derivar por identidad reconstruye el mundo cada pocos segundos. | `firmaDelTablero` devuelve la misma lista; el mundo estático se funde UNA vez y no depende de la vista; las animaciones arrancan por `jugada`, no por el OK HTTP. |
| **`Movimiento.carga` en `undefined`**, `rotulo?:` en la vista, `NaN` en una renta. | `carga: {}` siempre; forma cerrada afirmada; enteros por tabla; `porQueNoEsCanonico` en cada revisión. |
| **`verify:procedencia` sólo ve literales de `shared/arcade/juegos/`**: la marca puede colarse en un comentario de la app, en `escenas/burgo/` o en este documento. | `verify:burgo-modelos` barre con las marcas partidas `escenas/burgo/`, los guiones y —ampliado— `burgo*.ts`, los pintores y `docs/burgo/`; antes de cada commit se lee a mano contra `marcas-registradas.ts`. Vocabulario del reglamento §0 en rótulos («barrio entero», nunca la palabra vetada). |
| **Un secreto dentro de un id o rótulo** es invisible para `verify:mesa`. | Ids son casillas y series de trato; la carta se publica por NÚMERO; `verify:burgo` busca cada serie del mazo en TODA la vista canónica y en rótulos/ayudas/ids. |
| **`verify:escritorio` con `renderToStaticMarkup`**: sin `window`, un `throw` en render sube tal cual. | Canvas tras `typeof window`; modelo sólo en `useEffect`; `foco?.(recuadro)` ANTES de la guarda de `ResizeObserver`; telón con el nombre; aviso presente; un botón por opción «fuera». |
| **Regex literales de `verificar-escritorio.tsx`** sobre `sala.tsx`, `riberas-en-tres.tsx` y `estilo.css` (CRLF e indentación exacta). | Se cambian en el MISMO commit que el refactor; `riberas-en-tres.tsx` no se toca; reformatear rompe verdes. |
| **`tema.ts` y un segundo muelle**: `verify:escritorio:1223` exige uno; `verify:sala` ata `/muelle` por regex; el botón de zarpar depende de `opcionDeEmpezar`. | Comprobador editado a sabiendas; la opción se llama `'empezar'`; nada de `rutaDeArcade` se toca. |
| **`cargadorPara` cachea por identidad de `traer`**: otra `traer` = otra caché y 1,7 MB más. | Una `traer` de módulo por cliente; el escritorio la exporta desde `muelle.tsx`. |
| **`piezas.ts` dice que la escena instancia a 1**; escalar una pieza por instancia contradice la razón escrita. | No se escala ninguna: casilla 8 × 14 y posada = casa + bandera. Si algún día se escala, se dice en la cabecera. |
| **`muelle` con base a −5,47** puesto sobre una acera. | Va en el SOLAR 9 (fuera del anillo) a `y = 0` tal cual: cubierta a +2,43 y pilotaje bajo el suelo. |
| **`acercar.ts` y `verify:escena`** clavan `ALCANCE × MAS_CERCA` en (25, 40) con el ALCANCE del delta. | Parametrización con valores por defecto; el Burgo pasa los suyos; `verify:burgo-escena` afirma que con los de siempre sigue dando lo mismo. |
| **`instanceColor` sobre una pieza de máscara parcial** tiñe el mástil. | Sólo `casa` y `peon` (enteras) van por `instanceColor`; `bandera` por `tenir()` y una `InstancedMesh` por color. |
| **Velocidades de andar**: a 6 u/s el aventurero patina (`PASO_POR_SEGUNDO = 4`). | Andar 4, correr 8, `timeScale` hasta 1,5; una sola cota de 8 s. |
| **Dos copias de three/react/r3f** en el disco: `useFrame` mudo o «Cannot assign to read-only property 'position'». | Nada nuevo en `UNICOS`/`dedupe`; ternas en props; nada de drei en `escenas/`; r3f congelado en 9.7; no `npm install` con servidores levantados; worktree nuevo con `robocopy` de `node_modules` (el 1 no es fallo). |
| **Node 20.17 frente a `react-native 0.86` (`engines ^20.19.4`)**: Metro puede no arrancar. | Se comprueba en la fase 5 antes de nada; si falla, subir Node en la máquina (Render ya está en 20.x reciente). |
| **`verify:rutas`** compara con `.expo/types/router.d.ts` no versionado; con OTRO Metro vivo se llena de basura. | No hay ruta nueva; regenerar sólo con Metro parado. |
| **La pestaña 3D del panel del navegador** pierde el contexto WebGL tras recargas; en emulación móvil los clics se cuelgan. | Cerrar y abrir antes de sospechar del código; punteros sintéticos y lupa con `readPixels` para probar. |
| **Rojos por contención**: `verify:burgo-en-tres` levanta servidor. | Correrlo suelto con todo apagado antes de creerse un rojo; los tres rojos conocidos se miran en el diff. |
| **El estado en disco sobrevive a los despliegues**. | `version: 1` + migración desde el primer commit; cambiar el SIGNIFICADO de un campo obliga a subir `version` y a un caso con estado viejo. |
| **Dos instancias del servidor**: la tabla de mesas vive en memoria. | Nada nuevo; el Burgo hereda que no escala a dos réplicas. |
| **La hoja del Muelle sólo enseña la opción `empezar`**: una variante con tope de vueltas no se vería en la app. | v1 ofrece sólo `empezar` con `topeDeVueltas: 0`; el fin por patrimonio está escrito y comprobado. |
| **Hermes no decodifica PNG**: un atrezo nuevo con textura lo rompería entero. | `verify:burgo-modelos` ya exige cero imágenes; no se añaden piezas sin recompilar y volver a pasar el horno. |
| **Presupuesto de 50 ms** por `opciones()` en cada lectura de cada asiento y cuarentena permanente. | Todo es O(28)/O(40); medido en §8.6 con topes a 1/5. |
| **`GLTFLoader` sanea nombres** (`casa:roja` → `casaroja`, `undefined` para siempre sin error). | Todos los de `PIEZA` pasan `NOMBRE_QUE_SOBREVIVE` al cargar el módulo; `_TINTE` se busca como `ATRIBUTO_DE_TINTE_CARGADO`. |

---

## 12. Fuera de alcance, a sabiendas (y el hueco que se deja)

- **La vista en tercera persona**: el hueco es `PropsDelBurgo.camara: ModoDeCamara` con el
  miembro `'tercera-persona'` RESERVADO (la escena lo ignora y lo dice en cabecera), y
  `peon.ts` que ya devuelve `{ x, z, rumbo }` del aventurero por fotograma, que es todo lo que
  una tercera persona necesita. Ni una línea más.
- **Robar la cartera** (mecánica nueva): el hueco es un miembro más de `SucesoDelBurgo`, el
  `mrs` por jugador ya público, `alTocarFigura` en las props y la ficha del jugador en la
  hoja. No se construye.
- **El segundo aventurero en pie** (el anterior en reposo mientras mueve el siguiente): el
  presupuesto medido no lo permite con seis sentados (113.158 > 110.000); `FiguraEn3D` trae
  la figura de los seis para cuando se abarate el anillo.
- **Tope de vueltas desde la mesa**: el reductor lo admite en la carga de `EMPEZAR` y el fin
  por patrimonio está escrito y comprobado, pero v1 sólo ofrece `empezar` sin tope, porque
  la hoja del Muelle enseña una única opción de arranque y «ningún juego sólo para PC»
  impide ofrecer la variante sólo en el raíl. Dueño: quien toque `hoja-del-muelle.tsx`.
- **La regla oficial de escasez de casas con puja** entre varios interesados: «no hay
  casas», dicho en la ayuda.
- **Pedir la renta**: se cobra sola (reglamento §12).
- **Relojes propios de almoneda**: no caben en la mesa (un plazo); la almoneda se cierra por
  pases.
- **Tratos con más de dos partes, préstamos, regalos fuera de trato**: no; un trato con un
  lado vacío sí.
- **Rebarajar el descarte**: nunca; la carta vuelve al fondo (reglamento §4).
- **Marcador y récords**: `marcador: 'ninguno'` (`tickHz 0` no los admite).
- **Texto dentro del lienzo**: no hay fuente; nombres, precios y cartas van fuera. Si un día
  se compilan contornos nuevos, van por `iconos.ts`.
- **Sombras** en cualquier cliente; **sonido**.
- **Mesa local sin servidor** (`sede: 'dispositivo'`): el Burgo es de servidor como Riberas.
- **La Plaza del Burgo** como lobby propio (fase 8): las piezas ya están en el `.glb`.
- **Recompilar `burgo.glb`** en esta ronda: el fichero vale tal cual; las piezas en espera
  (castillo, cuartel, campo de tiro, astillero, taller, caja de panes) siguen en espera.
- **Migrar Riberas a la tabla de pintores por dentro de `riberas-en-tres.tsx`**: sólo la
  elección del pintor pasa por la tabla; su fichero no se toca.
- **Prueba en iPhone físico**: no hay aparato; se anota como riesgo abierto, igual que en el
  Muelle.
- **Levantarse de la mesa** antes de empezar: no existe en la autoridad (una silla gasta
  aforo para siempre); no se inventa.

### Para Miguel

Cuatro decisiones que son tuyas y que este diseño toma provisionalmente (cambiarlas cuesta
poco si es antes de la fase 1): (1) la cascada de almonedas tras una quiebra con el Concejo
(fiel al reglamento, ~150 tics con todos ausentes) frente a «los títulos vuelven al Concejo
sin almoneda»; (2) los nombres de los ocho barrios (`BARRIOS[].nombre`: El Arrabal, Las
Tenerías…) que hoy sólo salen en la hoja; (3) las tres frases del Muelle («A las puertas del
Burgo», «Las puertas se abren cuando estéis todos.», «Se abre el Burgo»); (4) el `gancho`
de la tienda.
