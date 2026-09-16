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

Desde la tanda de las proporciones (§13) las piezas se miden **puestas** —la huella del `.glb`
por la talla a la que la escena las instancia— y hay un paso propio para el peón, las casas y
el hotel. Ese paso y las diez vacunas que lo prueban están contados en §13.4.

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


## 13. La talla de las piezas de un jugador (tanda de las proporciones)

Miguel, mirando el banco: «proporción de las piezas que representan a los jugadores,
construcciones de casas y hoteles». Lo que había, medido con `@gltf-transform` sobre
`escenas/modelos/burgo.glb` y contra una casilla de 72 × 108:

| pieza | en el pack | qué era en el tablero |
|---|---|---|
| peón (`pawn_A_blue`) | 1,272 × 1,272 × 2,326 | el **1,8 %** del frente de su casilla |
| casa (`building_blue`) | 2,504 × 2,543 × 2,543 | el 12 % del fondo de la franja del barrio |
| hotel | **la misma casa, a la misma talla** | indistinguible de una casa |
| dígito del precio (referencia) | 20,25 de ancho | **dieciséis veces** la huella del peón |

Las piezas venían horneadas a la escala del MUNDO (una casa-ficha mide una persona, 2,543) y
la escena las instanciaba a talla 1 con un `auxEscala.set(1, 1, 1)` literal. Ninguna
comprobación lo veía porque todas medían la huella del `.glb` **tal cual**: un peón de 1,272
cabe en cualquier sitio.

### 13.1 Las tres tallas y de dónde sale cada número

Están en `escenas/burgo/anillo-en-3d.ts`, sección «La talla de las piezas que son de un
jugador», cada una derivada y no elegida a ojo:

- **`DIAMETRO_DEL_PEON = ANCHO_DEL_GUARISMO / 6` = 3,375** (`TALLA_DEL_PEON` = 2,653; alto
  6,17). La sexta parte del ancho de un dígito del precio, que es la única referencia medida
  en píxeles que hay. El encargo puso el suelo: «un octavo de eso es invisible» (2,53).
  Y resulta ser también el **techo**, porque tres sitios lo aprietan: el patio de la cárcel
  (12 × 12 con tres presos de frente → 3,4 con aire), el brazo de una esquina (25,5 con seis
  en fila → 4,3) y el carril del avatar (v de 23 a 29, centrado en 25,5 → 5,0). Manda el
  patio. Escala **uniforme**: a 55° de altura de cámara la huella pesa más que el alto.
  **Al día de hoy ya no se escribe como una sexta parte del dígito, sino como el número 3,375**:
  cuando el dígito bajó de 27 a 25 para que el precio dejara margen en su casilla
  (`LA-CIUDAD.md` §2), el peón habría encogido con él —y su disco de contacto, y las rejillas del
  patio— sin que nadie lo pidiera. La sexta parte era una coincidencia cómoda; la razón es la que
  dice este mismo párrafo: **manda el patio**.
- **`FONDO_DE_LA_CASA = BANDA.franja / 2` = 10,5** (`TALLA_DE_LA_CASA` = 4,129; 10,34 de
  frente). La casa llena la mitad del fondo de la franja del barrio, centrada, con un cuarto
  de banda libre a cada lado. Con el paso 12 que la rejilla ya tenía quedan **1,66** entre
  casa y casa (antes 9,50): cuatro casas **seguidas** que ocupan 46,3 de los 72 del frente.
- **`TALLA_DEL_HOTEL` → 22,34 × 14 × 14.** Frente = lo que ocupan dos casas seguidas de borde
  a borde (10,34 + el paso 12); fondo = dos tercios de la franja (frente a la mitad de una
  casa); alto = tanto como hondo. O sea 2,16 veces el frente de una casa, 1,33 su alto y 2,88
  su huella. Es la **misma malla** con una escala por eje (`matrizEstiradaDelBurgo`), estirada
  a lo largo de `u` porque su `+X` local cae ahí al mirar hacia dentro del anillo.

### 13.2 Lo que hubo que mover con ellas

- **`RADIO_DEL_DISCO_DEL_PEON`** pasa de 0,7 a 1,856 y se muda de `Burgo.tsx` a
  `anillo-en-3d.ts`: conserva la proporción que tenía (1,1 veces el radio del peón) para que
  la sombra siga estando debajo de la pieza, y ahora el comprobador puede medirla.
- **`REJILLA_DE_PEONES_DE_ESQUINA` y `REJILLA_DE_VISITAS` dejan de ser 3 × 2 y pasan a 6 × 1**
  (paso 4, centro 337,5). El 1,4 que separaba las dos filas era «lo justo para que dos peones
  de 1,272 no se toquen»: con un peón que se vea no cabe **ningún** paso, porque el aventurero
  se pone 1,2 hacia fuera del hueco y con dos filas se despegaría de la polilínea más de las
  dos unidades que se toleran. En fila india el aventurero se despega exactamente 1,2.
- **`REJILLA_DE_PRESOS`** pasa de 3,2/4 a **3,9/4,2**: seis presos de 3,375 en el patio de
  12 × 12 con 0,53 entre dos y 0,41 hasta la verja.
- **`BANDERA_SOBRE_LA_POSADA.alza`** deja de ser 2,45 y se deriva de `ALTO_DEL_HOTEL` (14):
  el tejado ha subido y la bandera va clavada en él, no flotando donde estaba el tejado viejo.
- `REJILLA_DE_PEONES` (paso 7) y `REJILLA_DE_CASAS` (paso 12) **no cambian de valor**: con las
  piezas puestas siguen dando 3,63 y 1,66 de aire. Lo que cambia es su comentario, que ahora
  dice el número con la pieza puesta.

### 13.3 El presupuesto no se mueve, y ésa es media decisión

Escalar no cuesta un triángulo ni una llamada: son las mismas `InstancedMesh`. Los 44
edificios de un tablero lleno (32 casas + 12 hoteles) se siguen contando como `casa`, y la
suma sigue en 207.949 en plena (tope 900.000) y 145.595 en sobria (tope 230.000) —la de aquel
día; la de hoy la imprime `verify:burgo-escena` en cada pasada y la apunta la cabecera de `presupuesto.ts`—.

Antes de estirar la casa se buscó un modelo de hotel pieza a pieza (anotado en `piezas.ts`):
Board Game Bits es el único pack con la misma pieza en cuatro colores —lo que hace falta para
derivar la máscara de tinte— y no tiene ningún edificio mayor que `building`; los
`container_*`, que serían lo más parecido, vienen en un solo color y no se pueden teñir del
color del dueño, y un hotel que no lleve el color de su dueño no dice lo único que tiene que
decir. Un edificio del City Builder es una pieza de ciudad, con su color horneado, y en la
franja del barrio no se leería como ficha.

### 13.4 Lo que vigila esto, con sus vacunas

`verify:burgo-escena` pasa de 205 a **235 comprobaciones** (`COMPROBACIONES_ESCRITAS = 235`).
El cambio de fondo es que **las piezas se miden PUESTAS**: la huella del `.glb` multiplicada
por la talla a la que la escena las instancia. Además hay un paso propio, «Las piezas de un
jugador se instancian a una talla que se lee, y un hotel no es una casa», que afirma:

- que lo escrito en `anillo-en-3d.ts` es lo que el `.glb` trae de verdad;
- que la huella del peón pasa del octavo del ancho de un dígito, y que cabe entera en el
  carril del avatar;
- que el disco de contacto conserva su proporción con la pieza;
- que la casa llena media franja y que las cuatro van seguidas (hueco < media casa);
- que el hotel es vez y media más ancho, un cuarto más alto y el doble de huella que una
  casa, que su frente es el de dos casas seguidas, y que cabe en la franja sin llegar al
  carril ni al mástil de la bandera del dueño;
- que dos peones de la misma casilla no se pisan **ni ellos ni sus discos**, en las 39
  casillas, en el patio de la cárcel y en la acera de las visitas.

Diez venenos, diez cazados (probado a mano envenenando `anillo-en-3d.ts` una constante cada
vez y restaurándola): peón a talla 1, peón de 5,5, rejilla de esquina de vuelta a 3 × 2 con
paso 1,4, presos de vuelta a 3,2, casa a talla 1, hotel con el frente de una casa, hotel de 26
de fondo, disco en 0,7, alza de bandera en 2,45 y huella escrita que no es la del fichero.

**Y un undécimo veneno que los diez primeros no habrían cazado, porque no estaba en las
constantes: la ESCENA.** Devolviendo a `Burgo.tsx` el `auxEscala.set(1, 1, 1)` del peón, la
casa a la escala de brotar a secas y el hotel con dos ejes cambiados de sitio, el guion seguía
dando verde con sus 232 comprobaciones: las constantes eran las buenas y nadie miraba si se
usaban, que es exactamente el fallo que esta tanda arregla. Se añadió a la revisión un juez
sobre el CÓDIGO de la escena (paso «Los dos .tsx de la escena y el tinte»): que `Burgo.tsx`
instancie el peón a `TALLA_DEL_PEON`, las **tres** casas a `TALLA_DE_LA_CASA`, el hotel con
sus tres ejes **en orden** (ancho, alto, fondo — el orden es lo único que dice que se estira a
lo largo de la casilla y no hacia el carril) y el disco con `RADIO_DEL_DISCO_DEL_PEON`; con
dos vacunas, la escena de antes de la tanda y el hotel con los ejes permutados.

### 13.5 Lo que queda abierto

El **aventurero** sigue midiendo lo que mide una persona en este mundo (2,543) y el peón que
lo sustituye mide ahora 6,17 de alto. Los seis asientos están siempre como peón y sólo uno se
levanta como aventurero (decisión 11), así que en calidad plena el que mueve se ve más pequeño
que los cinco que están quietos. Arreglarlo pide tocar `escenas/burgo/Aventurero.tsx` o
`peon.ts`, que no entraban en esta tanda: el número que haría falta es una escala de 2,43
sobre la figura, o bajar el peón, y es una decisión de tanda, no de fichero.

Y con el aventurero se quedaron dos cosas suyas que el peón grande arrastró y que **hay que
mirar en el banco antes de tocarlas**, porque son proporciones y no cuentas:

- **El disco del aventurero.** Es la misma malla que la del peón, instanciada con un 1,1 más
  encima (`Burgo.tsx`, «el disco del aventurero en pie»): pasó de 1,54 de diámetro a **4,08**,
  bajo una figura que sigue midiendo 1,8 de ancho. La sombra es hoy más del doble de ancha que
  quien la proyecta. Se arregla dándole un radio propio al disco del aventurero —el que tenía,
  0,77— en vez de heredar el del peón, o subiendo la figura junto con el peón (que es la misma
  decisión de arriba).
- **El anillo de la casilla destacada cuando marca a un PEÓN.** `Burgo.tsx` lo pinta con la
  geometría `MARCA` (2,2 a 3,0 de radio) a talla **0,55** cuando los dados ruedan por un
  asiento en el sorteo: eso es un anillo de 1,21 a 1,65, y el peón puesto tiene 1,69 de radio
  de base y 1,86 de disco de contacto. O sea que el anillo ya no RODEA al peón: cae entero
  dentro de su silueta. No desaparece —el material de la marca va con `depthTest: false` y se
  pinta encima— pero pasa de ser un halo alrededor de la ficha a ser una raya pintada sobre su
  base, que es justo lo contrario de señalarla. Ese 0,55 estaba calibrado para el peón de
  0,636 de radio, donde el anillo empezaba a 1,73 veces el radio del disco; conservando esa
  proporción con el peón de ahora, la talla sale **1,46**. No se cambió aquí porque es un
  número que se decide mirando el banco, que es lo que a esta tanda le faltó.

---

## 14. Las cuatro reglas oficiales que estaban fuera de alcance (y ya no lo están)

El §12 de este documento daba por fuera de alcance cuatro divergencias con el juego oficial.
Miguel las metió en alcance —«que el monopoli sea el juego oficial jugable y que funcione todo
de verdad»— y esta tanda las cierra. Lo que sigue es lo que se decidió donde el reglamento
callaba, con el fallo que cada decisión evita. **No sustituye a lo que dice el §12: lo
continúa.** El sitio donde vive cada regla es `shared/arcade/juegos/burgo.ts`, y el juez de
cada una, con su vacuna, es el bloque 15 de `server/scripts/verificar-burgo.ts`.

### 14.1 Obrar fuera del propio turno

Alzar, vender, hipotecar y deshipotecar se hacen **en cualquier momento**, también durante el
turno de otro. Antes hacían falta `esElDelTurno` y un paso de obrar, y con seis sentados eso
era obrar una vez cada seis turnos: la mitad de la táctica del juego —alzar de golpe antes de
que el rival caiga en tu barrio— no existía.

La guarda nueva es `puedeObrarAhora`, escrita **una vez** sobre `LaMesaAhora`, una forma que el
estado y la vista comparten, y llamada por `opciones()` y por el reductor. Deja fuera **tres
momentos**, que son aquellos en los que la mesa espera una respuesta concreta con su plazo:

| Momento | Quién puede obrar | Por qué |
| --- | --- | --- |
| Subasta abierta | nadie | El dinero decide quién gana la puja, y un pago de un tercero en medio cambia el resultado sin que a ese tercero le toque nada. Ya hay una rama entera en el cierre para el único camino que queda abierto a eso (un trato aceptado durante la subasta). |
| Apuro abierto | sólo el endeudado, y sólo vender e hipotecar | Es el reglamento §9, y es lo que ya se hacía. Alzar y deshipotecar siguen fuera: gastan dinero cuando lo que falta es dinero. |
| El del turno con la casilla sin resolver (`comprar`) | sólo él | `comprar` no cabe en `luego` —no se puede reanudar una compra con el dinero cambiado— y una obra de un tercero que abriera la subasta de la última casa se llevaría la compra por delante. |

Efecto secundario que hubo que arreglar: `alzar` decidía si el pago había fallado mirando
`s.apuro !== null`, y eso deja de ser cierto en cuanto hay un apuro **de otro** abierto —con la
regla nueva, un caso corriente—. Se cambió por `pagoHecho`, que mira el saldo. Sin eso, alzar
con el apuro de otro abierto habría cobrado la casa y no la habría puesto.

### 14.2 Tratos entre dos jugadores cualesquiera

`puedeProponer` exigía que uno de los dos tuviera el turno. Ya no: cualquiera vivo le propone a
cualquiera vivo, con el tope de siempre (tres abiertos por proponente) y la prohibición de
siempre (nunca durante una subasta).

**La caducidad al relevar se conserva**, y ahora significa otra cosa: no «tus tratos mueren
cuando dejas de tener el turno» sino «una propuesta vale para la vuelta en que se hizo». Se
conserva por tres razones: un trato es una foto de un tablero que cambia —y ahora cambia más,
porque cualquiera obra en cualquier momento—; el aviso de cada asiento enseña el trato
pendiente, y un trato inmortal taparía para siempre lo que de verdad le concierne a quien mira;
y el tic no sabe contestar tratos, así que un ausente acumularía propuestas hasta el final de
la partida. Volver a proponer cuesta un gesto.

### 14.3 La subasta de la última casa (y del último hotel)

Antes, sin casas en el Ayuntamiento no se alzaba, y el primero que pulsaba se llevaba la
última. Con la regla 14.1 eso deja de ser una rareza y pasa a ser una carrera: seis pueden
pedir la misma casa en el mismo instante.

Ahora, cuando **queda una** y **hay al menos otro que podría alzarla**, `ALZAR` no alza: abre
una subasta por ese edificio.

- Quien la pidió **abre la puja al precio de lista de su barrio**, así que si los demás pasan
  se la lleva por lo que le habría costado: la regla nueva no le quita nada a nadie.
- En pie van sólo los que **podrían alzar ese mismo tipo de edificio ahora mismo** (barrio
  entero, parejo, sin hipotecas y con dinero para el precio de lista). Es lo más cerca que se
  puede estar del «los que quieran comprarla» del reglamento sin preguntárselo a cada uno, que
  costaría una fase entera y un plazo por cabeza.
- Cada uno puja **por su propio solar** —la almoneda apunta al del mejor postor— y nadie puede
  pujar por debajo del precio de casa de su propio barrio: el Ayuntamiento no vende una casa de
  200 por 60 porque el barrio del otro sea barato.
- **Un solar por pujador**, el que toca por parejo (menos casas, y a igualdad casilla menor).
  No es una lista porque el portillo busca UNA puerta por tipo de movimiento: con una por solar,
  `estaOfrecido` se quedaría con la primera y las demás no se podrían mandar. Con el parejo
  obligatorio casi nunca hay más de un solar donde se pueda alzar.
- Sin rival que la quiera **no se abre nada**: una subasta de uno solo son seis pases de trámite.

La subasta del edificio reusa `AlmonedaDelBurgo` con un campo más, `edificio`, que se lee
siempre con `esAlmonedaDeObra` (`=== true`, no `!== false`): una mesa guardada de antes de esta
regla no lo trae, y `undefined` tiene que leerse como la subasta del título de siempre.

**Lo que no se hizo, a sabiendas:** no hay un miembro nuevo en `SucesoDelBurgo` para la subasta
de edificio. La coreografía de la escena (`escenas/burgo/coreografia.ts`) y su comprobador no
son de esta tanda. La crónica distingue las dos subastas con lo que sí está en el estado —la
almoneda abierta dice si es de obra, y una cerrada dejó un `alza` en el mismo cambio y en la
misma casilla— y por eso dice «el edificio» donde hay que decirlo.

### 14.4 La elección del 10 % en el Impuesto

Caer en el Impuesto ya no cobra: enciende `impuestoSinPagar` —una marca del turno, como
`dobles`— y ofrece los dos pagos, la cantidad fija de la casilla o el 10 % del patrimonio.
Quien **tira o pasa sin elegir paga la fija**, que es la que la casilla anuncia y la que el
reglamento pone por defecto; el 10 % hay que pedirlo. El tic, que juega **por** el ausente,
paga lo más barato de los dos, y es lo único que hace ese tic.

**Una marca y no un paso nuevo, y esto está medido.** El primer intento añadió `'impuesto'` a
`PasoDelTurno`. `shared/arcade/juegos/burgo-en-tres.ts` —que no es de esta tanda— normaliza a
`por-tirar` cualquier paso que no conozca, así que los dados de la escena habrían dicho que no
se ha tirado cuando ya se tiró; y el robot de `verificar-burgo-en-tres.ts` sólo sabe contestar
a los pasos que ya existían, así que la mesa por el cable se quedaba parada: **11 movimientos
de los 30** que su comprobador exige. Reusar `comprar` (el segundo intento) dejaba la misma
mesa parada por la misma razón. Con la marca, `TIRAR` y `PASAR` se siguen ofreciendo y son
ellos los que cobran, y ni la escena ni su robot notan la regla nueva.

La cuenta del 10 % vive en `burgo-tablero.ts` (`decimaDelPatrimonio`) por la misma razón que la
hipoteca: la miran los dos lados —el rótulo del botón dice cuánto y el reductor cobra cuánto— y
si cada uno la escribiera por su cuenta, el botón prometería una cifra y el cobro sería otra.
Redondea **hacia abajo**, al revés que el interés de la hipoteca: el interés lo cobra el
Ayuntamiento sobre un préstamo suyo, y el 10 % es una alternativa que se le ofrece a quien
paga; redondeando hacia arriba, la «décima» podría costar más que una décima.

Con el Impuesto sin pagar **sí se obra**, que es lo contrario de lo que parecería: vender casas
a mitad de precio para bajar la décima pierde 100 por ahorrar 20, e hipotecar no mueve el
patrimonio ni un euro (quita medio precio en título y pone medio precio en efectivo). No hay
nada que ganar, así que no había nada que cerrar.

### 14.5 El tope de vueltas

Sigue como lo dejó el §12: el reductor lo admite en la carga de `EMPEZAR` (entero entre 0 y
`TOPE_DE_VUELTAS_MAXIMO`, comprobado por el portillo), el fin por patrimonio está escrito y
comprobado, y la hoja del Muelle sigue ofreciendo sólo `empezar` con `topeDeVueltas: 0`. **No se
tocó nada de las reglas**: el camino ya estaba abierto, y ofrecer la variante es de quien toque
`hoja-del-muelle.tsx`, porque «ningún juego sólo para PC» impide ofrecerla sólo en el raíl.

Lo que sí se hizo es **verlo andar entero**, que no estaba: el relevo que alcanza el tope
termina la partida con `fin: 'tope-de-vueltas'`, gana el mayor patrimonio aunque no sea quien
pasó el turno, dos patrimonios iguales comparten el Burgo sin desempate inventado, un quebrado
no gana por rico, y con `topeDeVueltas: 0` —lo que ofrece el Muelle hoy— noventa y nueve
vueltas no acaban nada. La vacuna es una vuelta por debajo del tope: la partida sigue.

### 14.6 Lo que estas cuatro reglas movieron fuera de sus ficheros

- **`server/scripts/oro-arcade/burgo.json` se volvió a capturar.** Es lo que manda hacer la
  cabecera de `oro-arcade.ts` cuando el cambio es a propósito, y aquí lo es: con la regla 14.1
  la vista de quien no tiene el turno lleva botones nuevos, y con la 14.4 el robot juega otra
  partida. Tras recapturar, los 346 movimientos reejecutan byte a byte y los tres movimientos
  que devuelven el mismo objeto siguen siendo tres (los tics de después del final).
- **La semilla de la partida de seis de `verify:burgo` pasó de 13 a 19.** Con la política nueva
  del robot, la 13 sólo mandaba a un jugador a la Comisaría de los dos que exige el mínimo de
  §8.1 F4. Se probaron veinte semillas: diecisiete cumplen los seis mínimos.
- **Lo que la escena todavía no sabe decir**, y es de otra tanda: `burgo-en-tres.ts` no conoce
  la marca del Impuesto, así que su hoja no lo nombra (los dos botones sí bajan, como «botones
  del momento»); y la subasta del último edificio se pinta con el nombre del solar al que
  iría, que es lo que `almoneda.casilla` lleva. Ninguna de las dos cosas rompe nada
  —`verify:burgo-en-tres` pasa entero— pero las dos se leerían mejor con dos líneas allí.

## 15. Lo que se vio jugando una mesa de verdad (16-sep-2026)

Hasta aquí todo se había medido con comprobadores y bancos. El 16 de septiembre se jugó por
primera vez una mesa ENTERA con servidor real: la Sala web del escritorio sentada en un asiento
y tres robots por HTTP en los otros (`server/scripts/robot-del-burgo.ts` conducido desde fuera),
desde el Muelle hasta que quedó uno en pie. Cuatro jugadores, 636 revisiones, cero movimientos
rechazados. Salieron cinco cosas que ninguna de las 82 entradas de la batería veía, y las cinco
son de las que sólo aparecen jugando:

| # | Lo que se vio | Por qué ningún comprobador lo veía | Qué se hizo |
|---|---|---|---|
| H1 | La crónica decía «paga 120 € por la subasta **a el** Ayuntamiento». | Los comprobadores de texto buscan secretos, marcas e ids crudos; nadie leía la gramática del pregón. | `aQuienRecibe` en `burgo.ts`; `verify:burgo` busca «a el»/«de el» en TODO texto de cada revisión de las siete miradas, con vacuna. |
| H2 | La cinta del escritorio: «Turno de Ana · Te toca tirar. **Turno de Ana.**» | El aviso del tablero lleva la crónica detrás, y la crónica cierra cada relevo con esa frase; la regla del prefijo sólo miraba el principio. | `sinLaFraseDelTurno` quita la frase ENTERA; el prefijo exige ahora borde de palabra («Turno de Anabel» no es «Turno de Ana»). |
| H3 | **Al caer en una calle libre no había un solo botón de comprar a la vista.** El carril enseñaba «Quiebra» como único cuadrado; comprar vivía sólo en la casilla del anillo, de unos veinte píxeles desde la pose de salida. | La partición seguía cerrando: la compra tenía «su sitio». Pero su sitio era un gesto sobre una casilla diminuta. | La compra sube a «Ahora» y al carril, en cabeza («Co · 60 €», «Su · Subasta»); la casilla pasa a ser su ATAJO. `verify:burgo-en-tres` exige que la compra esté a la vista y en cabeza, y su vacuna es el carril de antes sobre una mirada real. |
| H7 | Al terminar, la línea de estado decía «Se acabó: Ana se queda con el Burgo» dos veces. | La cabeza del aviso y la frase del suceso `fin` son letra a letra la misma; nadie contaba repeticiones. | `avisoDe` quita de la crónica la frase entera de la cabeza, y en la reunión no repite el aviso; `verify:burgo` lo cuenta al final de cada partida entera, con vacuna. |
| H5 | Tras «Empezar la partida», UNA vez, la pestaña hizo una recarga completa a `/sala/`. | — | No se reprodujo con la pestaña instrumentada (navegación, clics y `pushState` vigilados): la transición salió limpia. El enlace «‹» se intercepta y no recarga. Queda anotado sin tocar código. |

**La decisión de H3 revoca a sabiendas la de la ronda 2** («comprar y sacar a subasta sólo en
la casilla, con un gemelo de sólo apoyo»). Aquella se tomó cuando la cuenta de la partición
sumaba la casilla encendida como un botón más; desde que la cuenta separa botones de atajos (la
misma que ya permitía vender e hipotecar en «Ahora» durante el apuro), el argumento de «dos
sitios donde comprar» dejó de existir y lo que quedaba era el fallo.

**El maestro de oro se recapturó** (`server/scripts/oro-arcade/burgo.json`) y se comprobó campo a
campo contra el anterior: registro, estado inicial, estado final, secreto y las 344 huellas de
estado son idénticos; en las vistas finales sólo cambian `pregon` y `tablero.aviso`, y sólo en
«a el» → «al» y en la frase de «Se acabó» repetida.

**Y LA SEXTA, que se vio en la misma partida y se cerró después:** al quedar uno en pie, las dos
pantallas se quedaban en la vista del anillo con la cinta recortada y nada más; la clasificación,
el patrimonio y quién había quebrado vivían detrás del «≡». Ahora la compone `finalEnTres` en la
traducción —título, frase de quien se queda con el Burgo, por qué acabó, lo que me toca, y los
puestos: el ganador primero y en el puesto 1, los vivos por patrimonio, quien quebró al final sin
puesto— y la pintan los dos clientes: el escritorio como caja sobre el lienzo, con «Ver el
tablero» y la salida a la Sala, y la app como una cuarta hoja que entra en la trampa de foco.
La juzgan `verify:burgo-en-tres` (en cada mirada de las tres partidas enteras, con dos vacunas),
`verify:escritorio` (pintada en el momento «fin» del banco, y ausente en «mi turno») y
`verify:sala` (cuatro hojas y `elFinal` dentro de `hayHojaAbierta`).
