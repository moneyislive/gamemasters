# La mesa de Riberas

> Si algo de aquí no coincide con el código, gana el código. Este documento recoge
> las decisiones y su porqué. Se escribió el 5 de septiembre de 2026, sobre la rama
> `lobby-catan`, a partir de lo que Miguel pidió por escrito: ver el juego en pantalla
> completa, una mesa de madera abajo con las piezas encima, un dado que vibra y se
> tira tocándolo, y poder recoger la mesa. Es la tercera versión: la primera pasó por
> una revisión adversaria que volvió a medir cada número con el código real, y la
> segunda por otra que leyó el orden de dibujo con el ordenador de `three` de verdad,
> buscó quién apagaba los dados fuera de turno y proyectó los 54 vértices con la cámara
> inclinada. Lo que encontraron está cerrado aquí, con su medida, o abierto en el §10
> con su dueño. Ningún número de aquí es una opinión: cada uno sale de un guion de
> medida corrido sobre `huecosDeLaBarra`, `huecosDeLaBaraja`, `huecosDeLasCartas`,
> `franjaDeLasCartas`, `ojoDelMirador`, `ojoYMira`, `WebGLRenderLists`, `revoltijo`,
> `fbm` y el atlas del pack, o de una línea del código citada con su fichero. Los
> guiones se listan en el §9.

## 0. Qué hay hoy, y qué se pierde al quitar los paneles

La partida en tres dimensiones vive en `escenas/delta.tsx` y la montan dos pantallas:
`escritorio/src/riberas-en-tres.tsx` y `app/src/arcade/riberas-en-tres-escena.tsx`.
Lo que hoy rodea al lienzo, y que Miguel llama «los menús en negro y violeta», es
esto, con nombre y fichero:

| Qué | Escritorio | App |
|---|---|---|
| El código de la mesa, quién está sentado, salir, tirar la mesa | `LaFicha` y los dos botones del `<aside class="rail">` de `sala.tsx` (22 rem, `tablero-y-panel`) | `BarraDeLaMesa` de `tablero-en-linea.tsx`, con `paddingTop: arriba + 14` |
| De quién es el turno | (dentro de `LaFicha`) | `LineaDelTurno` |
| La frase del juego («Te toca: tira los dados.», «Turno de Ana: está por tirar.») | `<p class="aviso-del-tablero">` ENCIMA del recuadro del lienzo, en flujo —un párrafo con margen, `riberas-en-tres.tsx` 1138 y `estilo.css` 1603, no un vidrio sobre la escena—, texto de `avisoDe` en `riberas.ts` (4174–4193) | el mismo `aviso` dentro del retablo; en la rama del delta no se pinta hoy |
| El marcador: puntos, cartas, guardias, el Vado con su largo, la Guardia, títulos, el mazo que queda | `MarcadorDeRiberas` en el raíl | `ElMarcador`, una cinta horizontal de `FichaDelColono` entre el aviso y el lienzo |
| Tirar, pasar, aceptar, rechazar, contestar, empezar | `<Formulario>` bajo el lienzo, con `opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(o)), mazo)` (línea 799) | `LasOpciones` en el `ScrollView` del pie, misma composición (línea 691) |
| La crónica | `LaCronica` en el raíl | `LaCronica` en el pie |

El lienzo del escritorio mide `62vh` con un mínimo de 420 px (`estilo.css`,
`.riberas-lienzo`); el de la app, el 58 % de la pantalla y nunca menos de 360 puntos
(`PARTE_DEL_ALTO`, `ALTO_MINIMO_DEL_LIENZO` en `riberas-en-tres-escena.tsx`). Todo lo
de la tabla se lee con lector de pantalla —`accessibilityLabel` compuesto en
`FichaDelColono`, `role="list"` en el marcador del escritorio— y **eso no se puede
perder**: un lienzo no tiene texto que leer.

Y dentro del lienzo ya hay tres cosas pegadas a la cámara que NO se rediseñan: la barra
de construir (`Barra`, aritmética en `escenas/barra.ts`), la mano de bienes a la
derecha (`escenas/baraja.ts`) y la mano del mazo a la izquierda (`escenas/cartas.ts`).
Las tres viven a dos unidades de la cámara, y `verify:escena` mide que no se pisen. La
mesa se pone debajo de la primera y tiene que convivir con las otras dos. **Ni
`baraja.ts` ni `cartas.ts` cambian una línea en este encargo**: donde la mesa o la
cinta chocan con las manos, es la mesa o la cinta la que se aparta (§2.2, §4.1).

## 1. Las decisiones que no se pueden deshacer después

1. **La mesa es la barra, no otra cosa al lado.** El grupo `Barra` de `delta.tsx` pasa a
   pintar un tablón y encima de él los mismos cuatro huecos de `huecosDeLaBarra`, con
   la misma aritmética, el mismo asa invisible y el mismo orden
   `noEsElPrimario → stopPropagation → loCogeLaInterfaz`. No se sustituye el reparto:
   hay tres bloques de `verify:escena` («la barra cabe en cualquier pantalla», «el asa
   sigue por encima de los 44 puntos», «el hueco del mazo queda libre de las cartas»)
   que miden exactamente ese reparto contra la baraja, y una función nueva los dejaría
   verdes vigilando una barra que ya no se pinta. Lo que se añade —el hueco de los
   dados, la cota de la tapa— se añade en el mismo fichero (`huecosDeLaMesa`) y se mide
   en el mismo guion.

2. **`PARTE_DEL_ALTO` sube de 0,13 a 0,14, porque en apaisado el asa cae bajo los 44
   puntos.** En un lienzo de 320 puntos de alto —el iPhone SE de primera generación
   apaisado, y cualquier Android de 320 dp de ancho girado— un hueco mide
   `0,13 · 320 = 41,6` puntos (`medir-lienzos.ts`, §1). El suelo de la casa son 44
   (escrito cinco veces como `minHeight: 44` en `tablero-en-linea.tsx` —líneas 1123,
   1145, 1234, 1365 y 1443—, y exigido por `verify:escena` para todos sus lienzos). Con
   0,14 salen 44,8. Es la única constante de `barra.ts` que se toca, y su efecto
   colateral está medido: en el lienzo de 320×360 pasa a mandar el ancho (47,5 puntos,
   sigue sobre 44) y la barra llega a `x = 0,515`, aún a la izquierda de las cartas
   quietas (0,641); la línea de `verify:escena` que afirma «tres y cuatro miden lo
   mismo en el lienzo peor» deja de ser verdad (0,2320 con tres, 0,2184 con cuatro:
   `medir-con-014.ts`) y se reescribe para exigir sólo el suelo, que es lo que
   protegía. Y deja falsos tres comentarios: la cabecera de `ANCHO_MAXIMO` en
   `barra.ts` («en el más bajo (320×360) sigue mandando el alto») y las dos menciones
   de `cartas.ts` al techo de la placa —la cabecera («el techo de la barra NUNCA pasa
   de −0,2475·alto», línea 26) y la nota de `PISO_DE_LA_FRANJA` (línea 408)—. Los de
   `cartas.ts` se reescriben DOS veces, porque miden contra lo que hay: en la fase 1 la
   placa sigue y su techo con 0,14 es `hueco.y + 0,75·lado = −0,240·alto` (el 26,0 %
   del alto desde abajo; holgura de 0,040 al piso de `−0,20`); en la fase 2 la placa se
   va y lo más alto de la mesa pasa a ser el ASA —la caja invisible de un lado, `hueco.y
   + 0,5·lado = −0,275·alto`, el 22,5 %— y, un pelo por encima, la pieza tomada en lo
   alto de su bote: `0,62·1,18/2 + 0,12 + 0,03 = 0,516` lados (`delta.tsx` 1122 y
   1128–1133), `−0,273·alto`, el 22,7 %, que asoma 0,7 puntos sobre el asa en 320 de
   alto y 2,4 en 1.080 (`medir-techos.ts`). NO el techo del naipe (0,31 lados, 19,8 %),
   que decía la segunda versión: el naipe está por debajo del asa. La holgura al piso de
   la mano del mazo queda en 0,073 del alto. Y el hueco de los dados no sube más: el dado
   en lo alto de su salto llega a `cota + 0,46 + 0,20 = hueco.y + 0,18·lado`, el 18,0 %.

3. **Los dados son DOS, con puntos, y la suma la parte el cliente de forma
   determinista, sellada por TURNO.** El servidor sólo publica `ultimaTirada`, la suma
   (`riberas.ts`, `tirarLosDados`: `uno + otro`, sin guardar los sumandos). Un solo cubo
   no puede enseñar un 7, y las cifras compiladas no tienen 7 —`CONTORNOS_DE_LA_CIFRA`
   trae del 2 al 12 saltándose el 7, porque ninguna ficha lo lleva; tampoco tiene 0 ni
   1 (`medir-triangulos.ts`, §E)—, así que «un dado que muestra la suma» exigiría o
   compilar glifos nuevos o un objeto que no es un dado. Dos dados con puntos no piden
   ningún glifo, y la frase del propio juego ya dice «tira los dados» (`avisoDe`,
   `riberas.ts` línea 4190). El reparto de la suma en dos caras es teatro —el juego
   sólo usa la suma— y por eso NO se pide al servidor.

   Lo que se sella, y por qué no es ni `rev` ni el asiento: `rev` sube con cada
   movimiento y el par cambiaría a mitad de turno; el asiento —lo que decía la primera
   versión— es peor: en una mesa de cuatro cada colono enseña SIEMPRE el mismo par para
   la misma suma. Medido: con el sello por asiento salen 3 de los 6 pares del 7 y 2 de
   los 5 del 8 en toda la partida (`medir-reparto-por-turno.ts`). Dados trucados a la
   vista. El sello es el turno en que se tiró:

   ```
   sello = turnosAbiertos − (tirado ? 0 : 1)
   par   = paresDe(suma)[revoltijo(suma, sello, (semilla ^ 41_011) | 0) % pares.length]
   ```

   `turnosAbiertos` es público y viaja en la vista (`riberas.ts` 3113 y 3203; el
   comprobador de campos públicos de `verificar-mesa.ts` 1837 lo lista con `tirado`,
   `turnoDe` y `ultimaTirada`), sólo sube, y sube al pasar el turno (línea 2620), así
   que con `tirado` falso la tirada que se enseña es la del turno anterior y lleva su
   sello. Es estable durante el turno, distinto cada turno, igual en los cuatro
   aparatos y tras recargar —la tabla de `medir-reparto-por-turno.ts` lo recorre: turno
   5 tirado → `5+2`; un movimiento más, `rev` sube → `5+2`; turno 6 sin tirar → `5+2`;
   recarga → `5+2`; turno 6 tirado, otro 7 → `3+4`—. Los tres sellos son enteros: la
   suma (2..12), el turno (contador del juego) y la semilla (FNV-1a de 32 bits de
   `shared/mecanicas/semilla.ts`, la misma que siembra el delta, mezclada con un canal
   propio para no correlar con el paisaje y llevada a entero con `| 0`, que es lo que
   `revoltijo` hace con cada argumento). Medido sobre mil turnos con la semilla de
   `QWXYZ`: los seis pares del 7 salen entre 157 y 186 veces, los cinco del 8 entre 187
   y 208, y el mismo par se repite dos turnos seguidos 153 veces de 1.000 en el 7 (lo
   esperado al azar, 167). Los campos `tirado`, `ultimaTirada` y `turnosAbiertos` se
   DECLARAN en `VistaQueSePinta` (opcionales, como `mazo`) para que `dadosEnTres` pueda
   leerlos sin `as`. Se sella en `verify:escena` que cada par suma lo que debe, que
   ninguna cara sale de 1..6, y que el sello no cambia con `rev`.

   Declarar `turnosAbiertos` va contra dos comentarios del propio
   `riberas-en-tres.ts`: la cabecera (51–53, «compararlo con `turnosAbiertos` sea una
   línea: esa línea es la regla §1.4») y la nota de `misCartas` (170–175, «mientras no
   esté escrito, nadie puede compararlo con `turnosAbiertos`»). Los dos protegen lo
   mismo —que una carta comprada no se juegue hoy— y lo protegen por el lado que sigue
   cerrado: `comprada` NO se declara, ni ahora ni en este encargo, y sin `comprada`
   escrito no hay con qué comparar `turnosAbiertos` aunque esté. `turnosAbiertos` entra
   SÓLO como sello de los dados y lo lee sólo `dadosEnTres`. La fase 1 reescribe esos
   dos comentarios para que digan eso —la salvaguarda es que `comprada` no esté, no que
   `turnosAbiertos` no esté— en vez de quedarse afirmando algo que la línea de abajo
   desmiente.

4. **El toque del dado manda `riberas:tirar` por la misma puerta que el botón, y el
   botón desaparece sólo donde hay dado.** Igual que `opcionesFueraDeLaBarra` quita
   COMPRAR cuando recibe un `mazo` que no es `null`, `opcionesFueraDeLaMesa` quita
   TIRAR cuando recibe unos `dados` que no son `null`. Y el ORDEN importa, y es el de
   `mazoEnLaBarra`: `dadosEnTres` recibe las opciones ENTERAS, antes de que
   `opcionesFueraDeLaMesa` las filtre; al revés, `porTirar` sería siempre falso y los
   dados no vibrarían nunca. En el retablo, en una mesa de más de cuatro, para un mirón
   y en los lienzos donde los dados no caben (§4.4) no hay dados y el botón se queda:
   es la regla de «cada movimiento se enseña exactamente una vez» (cabecera de
   `Formulario` en `riberas-en-tres.tsx`, línea 1230) aplicada sin dejar a nadie sin
   tirar. La entrada de la escena se llama `onPulsarLosDados`, no `onTirar`: en las
   dos pantallas `tirar` ya es TIRAR LA MESA (`mesa.tirar`). Y para quien juega con
   lector de pantalla, la acción sigue existiendo aunque el botón no se vea: la vista
   que envuelve el `Canvas` en la app —que ya lleva `accessible` y su
   `accessibilityLabel` (línea 1099)— declara `accessibilityActions: [{ name: 'tirar'
   }]`, y en el escritorio el recuadro `RECUADRO_DEL_LIENZO` lleva un botón sólo para
   tecnologías de apoyo. Un dado que sólo se puede tocar con el dedo sería el primer
   movimiento del juego inaccesible.

5. **La animación espera al servidor, termina en SU número, y un rechazo la corta en
   el acto.** El cliente no sortea nada: al tocar, los dados ruedan sin objetivo;
   cuando la vista trae `tirado: true` con `ultimaTirada`, se asientan en el par de la
   decisión 3. Ruedan al menos 0,6 s aunque la respuesta llegue antes —la propia
   petición vuelve con la mesa entera, `mover` en `app/src/arcade/mesa.ts` 704 y en
   `escritorio/src/mesa.ts` 676, y suele tardar menos— y se asientan en 0,35 s más; si
   la vista tarda, siguen rodando hasta que llega (`medir-dado.ts`, tabla de llegadas
   a 0,2 / 0,6 / 1,4 / 3,0 s). Y los demás VEN la tirada: el suceso que arranca la
   animación no es «yo pulsé» sino «la vista cambió», así que la misma máquina corre
   en los cuatro aparatos con la vista que les trae el sondeo largo. Lo que la primera
   versión no tenía es el rechazo: un `riberas:tirar` rechazado —`rev` vieja, doble
   toque, pestaña sin el turno— vuelve como `200` con la misma mesa y el mismo `rev`, y
   las dos pantallas YA lo saben en el acto (`seIgnoro`, `escritorio/src/mesa.ts` 717,
   `app/src/arcade/mesa.ts` 781). Con sólo `tocado | vista | tic`, los dados rodarían
   6 s esperando una tirada que no va a llegar, y un doble toque es lo primero que va a
   pasar. Así que `mover` DEVUELVE lo que ya calcula —`'hecho' | 'rechazado' |
   'sin-red'`— y la pantalla se lo da a la máquina como suceso `rechazado` (§5.3). Los
   6 s quedan sólo para «la red no contestó». Nada de esto pasa por estado de React:
   la fase, el reloj y el par objetivo viven en refs y se leen en un `useFrame`, como
   el tiempo del mar en `Mar` («son sesenta escrituras por segundo»).

6. **La madera es color por vértice, no un sombreador y no un PNG.** En el móvil no se
   puede cargar un PNG (`app/src/tres/texturas-nativas.ts`), así que la textura queda
   descartada de entrada. Entre un `ShaderMaterial` y `COLOR_0` se elige el segundo por
   dos razones medibles: la primera, que un material propio no lo ilumina nadie y hay
   que rehacer la cuenta de las tres luces a mano —es «la mitad del trabajo» de
   `marea.ts`, y aquí las piezas de al lado van con `MeshStandardMaterial`, o sea que
   una tapa con otra luz se notaría como una costura—; la segunda, que la veta escrita
   en TypeScript se mide en Node (`medir-veta.ts`: valores, contraste, cuántas vetas
   por tablón) y una escrita en GLSL sólo se mira. Es exactamente lo que hace
   `embarcadero.glb` con sus piezas: color horneado a vértice, material blanco con
   `vertexColors`, en lineal (`escenas/embarcadero/tinte.ts`, «`COLOR_0` es lineal por
   definición»). Los dos colores de la madera no se eligen: se leen del atlas del pack.

7. **Los nombres y los números del marcador van FUERA del lienzo, como vidrio sobre la
   escena, y el vidrio no se pone donde hay una carta.** El lienzo no puede escribir
   «Miguel»: no hay fuente, y los contornos compilados son diez cifras. Pintar un
   marcador dentro costaría compilar el 0, el 1 y el 7, unos 60 triángulos y una
   llamada por cifra (`medir-triangulos.ts`, §E) y seguiría sin nombres ni lectura en
   voz alta. Así que la pantalla completa se hace como la hace el Muelle
   (`docs/EL-MUELLE.md` §5): el `Canvas` ocupa toda la pantalla y encima van fichas
   translúcidas —`--vidrio` en el escritorio, `conAlfa(SALA.teja, 0.88)` en la app,
   que es lo que usa `hoja-del-muelle.tsx` (línea 686)— con el `accessibilityLabel`
   que `FichaDelColono` ya compone. Pero el vidrio va DELANTE del lienzo (DOM y React
   Native se quedan el toque antes que el `Canvas`), y las dos manos llegan arriba: la
   carta de arriba del mazo queda a 20,8 puntos del canto en 568×320 y a 25,3 en
   844×390; la de bienes con catorce, a 33,3 y 40,6 (`medir-cinta-central.ts`). Una
   cinta de 44 puntos de lado a lado tapa la carta de arriba de las DOS manos en todos
   los apaisados, y son cartas que se arrastran. Por eso la cinta ocupa sólo el tercio
   central del ancho en apaisado (§2.2), donde no hay ninguna carta a menos de 138
   puntos, y el 40 % de pie, donde no la hay a menos de 15,6. Lo que SÍ
   va dentro del lienzo es lo que se puede medir sin leer: el color del turno bajo los
   dados, el grosor del mazo, y los propios dados.

8. **En la app, esta pantalla se bloquea en apaisado al entrar, vuelve a vertical al
   salir, y el porqué es distinto en cada plataforma.** `app.json` declara
   `"orientation": "portrait"`. Al montar `LaMesaEnTres` con delta:
   `lockAsync(OrientationLock.LANDSCAPE)`. Al desmontar: `lockAsync(PORTRAIT_UP)`, y no
   `unlockAsync()`, por esto:

   - **Android:** `unlockAsync` deja la actividad en «que decida el sistema»
     (`OrientationLock.DEFAULT`: «lets the system decide», `ScreenOrientation.types.d.ts`
     de `expo-screen-orientation` 57.0.2). El `portrait` del manifiesto es sólo el
     valor inicial de la actividad; una vez pedida otra orientación en caliente, no
     vuelve solo. Desbloquear dejaría girar el vestíbulo, que no está hecho para ello.
   - **iOS:** `unlockAsync` vacía la máscara y el módulo vuelve a la de `Info.plist`
     (`ScreenOrientationViewController.swift` 79–81: «the mask set via lockAsync, or
     the default from Info.plist»), que con `"orientation": "portrait"` es retrato. Ahí
     `unlockAsync` y `lockAsync(PORTRAIT_UP)` hacen lo mismo; se escribe el segundo para
     que las dos plataformas hagan lo mismo por el mismo camino.
   - **Web:** no se bloquea nada. `lockAsync` no existe en todos los navegadores y el
     `catch` lo traga, como en `local.ts`.

   El precedente, `usarElAparatoQuieto` de `local.ts` (367–372), hace `unlockAsync()`
   al desmontar: en iOS vuelve a retrato; en Android deja la app libre de girar tras un
   juego local. **Cambia igual**: los dos ganchos comparten un `volverAlRetrato()` que
   hace `lockAsync(PORTRAIT_UP).catch(() => undefined)`, y los dos se prueban en la
   fase 6 en el aparato (§11). Nunca están montados a la vez: `LOS_QUE_PINTA` de
   `pintados.ts` es una tabla `ArcadeId → componente` y la app pinta UN arcade;
   `LaFrente` y `ElArcade` usan `usarElAparatoQuieto`, `ElTableroEnTres` usará
   `usarApaisado`, y al pasar de uno a otro React ejecuta la limpieza del que se va
   antes del efecto del que llega, así que la última orden de orientación es siempre
   la de la pantalla que se ve.

9. **Recoger la mesa no toca la cámara.** `escenas/camara.ts` está congelado
   (`riberas-en-tres-escena.tsx`, cabecera de `Ojo`) y no sabe que existe la barra:
   `DESDE_EL_SUELO` sólo lo lee `barra.ts` (medido con `grep`: una sola aparición
   fuera de su definición). No hay ningún vado de cámara que quitar cuando la mesa
   baja: lo que pasa es que se ve la franja del mundo que la mesa tapaba, y eso es
   exactamente lo que se pide al recogerla.

10. **La mesa tiene tope de triángulos, escrito al lado del del mar.** El delta sólo
    tiene una cota, `TOPE_DEL_MAR` en `presupuesto-del-delta.ts`. Mesa, dados, asa,
    tapete, sombras y pila suman **1.742** triángulos con la tapa a 96 segmentos y
    **3.470** con la tapa a 240 (`medir-tapa-horizontal.ts`, con `three`): el 7,5 % y
    el 14,9 % del mar. Es UN total, el mismo aquí y en la tabla del §7, y es lo que
    devuelve `triangulosDeLaMesa(segmentos) = 12 · segmentos + 590`. Se declara
    `TOPE_DE_LA_MESA = 3_600` y `verify:escena` lo cuenta; sin él, el día que alguien
    suba los segmentos para ver la veta más fina lo descubrirá en un móvil.

## 2. La pantalla completa

### 2.1. Qué se va y qué se queda

**Escritorio.** Cuando `RiberasEnTres` pinta el delta, `.tablero-y-panel` pasa a una
sola columna (una clase modificadora; hoy ya lo hace sola bajo 60 rem) y
`.riberas-lienzo` mide `calc(100vh - alto de la cabecera)`. La cabecera de la Sala se
queda: es una línea y es la navegación del sitio (duda 3 del §10). El raíl no
desaparece: se pliega en un cajón que se abre desde la cinta (§2.2) por encima de la
escena, con lo que ya tiene (`LaFicha`, `LaCronica`, levantarse, tirar la mesa). No se
reescribe nada de él; se cambia dónde está. El `<Formulario>` de abajo se va del flujo
y pasa a la cinta. `aviso-del-tablero` pasa a la misma cinta.

**App.** `BarraDeLaMesa`, `LineaDelTurno`, `ElAviso`, `ElMarcador` y el `ScrollView`
del pie salen del árbol en la rama del delta; el `Canvas` llena `estilos.todo`. La
barra de estado se oculta en esta pantalla (`expo-status-bar`, ya es dependencia),
así que el inset de arriba es cero y los que quedan son los laterales y el de abajo,
leídos de `useSafeAreaInsets` como ya hace la pantalla (`bordes`). La crónica se
queda en el mismo cajón que en el escritorio. El respaldo SVG no cambia ni un
píxel: pantalla completa es sólo la rama 3D.

### 2.2. Cómo vuelve cada dato: la cinta del tercio central

Una **cinta de vidrio arriba, de 44 puntos de alto, que ocupa SÓLO el tercio central
del ancho** (`ancho / 3`, centrada; con la barra de estado oculta y la muesca a un
lado, no toca ningún inset). Por qué el tercio y no el ancho entero está medido en
`medir-cinta-central.ts`, en los catorce lienzos:

| Lienzo | Tercio central | Aire hasta la mano del mazo | Aire hasta la mano de bienes | Banda libre entre las dos manos |
|---|---|---|---|---|
| 568×320 (SE apaisado) | 189 pt | 138 pt | 155 pt | 482 pt (85 %) |
| 780×360 (Android) | 260 pt | 202 pt | 221 pt | 683 pt (88 %) |
| 844×390 (iPhone 14) | 281 pt | 219 pt | 240 pt | 739 pt (88 %) |
| 932×430 (Pro Max) | 311 pt | 241 pt | 265 pt | 817 pt (88 %) |
| 1024×768 (tableta) | 341 pt | 218 pt | 259 pt | 818 pt (80 %) |
| 1920×1080 (monitor) | 640 pt | 466 pt | 524 pt | 1.630 pt (85 %) |
| 390×845 (web de pie, el peor) | 130 pt | 29 pt | 40 pt | 198 pt (51 %) |
| 320×360 | 107 pt | 49 pt | 68 pt | 223 pt (70 %) |

El «aire» se mide contra el canto interior de la carta más cercana con la mano
ABIERTA por el imán (la mano del mazo con cinco cartas y la de bienes con catorce, que
es lo que mide `verify:escena`), y contra `franjaDeLasCartas().derecha`, lo que quede
más adentro. En ningún lienzo apaisado baja de 138 puntos; de pie, ver más abajo.

Y lo que queda debajo del tercio central, medido con los 54 vértices de verdad
(`verticesDe(mallaDeRadio(2))` y `puntoDeVertice`, como `sitios.ts`) proyectados con
la cámara real (`ojoYMira` + `ojoDelMirador`, sin acercar, recorriendo el rumbo entero;
`medir-borde-lejano.ts`). La segunda versión decía que el borde lejano «es costa»: no
lo es. `ALCANCE_DEL_DELTA` es el radio del vértice más lejano —el centro de la comarca
más lejana más un radio, cabecera de `presupuesto-del-delta.ts`—, así que el borde
lejano del delta ES la fila de vértices de fuera, donde se construye; la costa empieza
dos teselas más allá. Al mirador de salida (40,4°) el vértice más alto en pantalla cae
bajo el tercio central a **63 puntos del canto en el SE, 71 en un Android de 360, 74 en
el SE 2, 77 en un iPhone 14, 84 en un Pro Max, 195–212 en tabletas y monitores**, con o
sin relieve (dos escalones de altura lo suben 4–6 puntos). O sea: la primera línea de
44 no tapa ningún vértice en ningún lienzo al salir, y eso lo mide `verify:escena`
(fase 5). A `ALTURA_MAXIMA` (82°, `camara.ts` 55) la cosa cambia y hay que decirlo: en
los cinco teléfonos apaisados la fila lejana se sale del lienzo POR ARRIBA (−35 a −48
puntos), que es cosa de la cámara y no de la cinta; en la tableta 4:3 (1024×768) el
vértice más alto queda a 26 puntos del canto —bajo la cinta— y en el iPad a −1; en los
monitores, fuera (−100 y −120). Sacarlo de debajo de la cinta en la tableta cuesta
inclinar 5,5°, que son 47 puntos de arrastre (`(dy / alto) · π/2`, `camara.ts` 65 y
203; `medir-sacar-el-vertice.ts`). Es el único lienzo con un vértice bajo la primera
línea, y sólo en el tope de la inclinación.

Lo que cabe en la línea, de izquierda a derecha:

- **«‹»** (44×44): salir. Es lo único que tiene que estar siempre a un toque.
- **La frase del juego,** `tablero.aviso`, en una sola línea, recortada con puntos
  suspensivos si no cabe; el texto entero va en la región viva
  (`accessibilityLiveRegion="polite"` en la app, `aria-live="polite"` en el
  escritorio) y en el cajón. Ya dice de quién es el turno y en qué paso está («Te toca:
  tira los dados.», «Turno de Ana: está por tirar.», «Coloca la vereda de salida.»:
  `avisoDe`, `riberas.ts` 4174–4193). Es la ÚNICA frase de estado; `LineaDelTurno`
  decía lo mismo con menos.
- **«≡»** (44×44): abre el cajón, que es donde vive lo que no cabe en 189 puntos: el
  código de la mesa en acento (lo único que se dicta por teléfono, cabecera de
  `BarraDeLaMesa`), el marcador completo (una `FichaDelColono` por colono, con su
  raíl de color, nombre, puntos, chozas y torres como números —`c.chozas.length` y
  `c.torres.length` de `ColonoVisto`, `riberas.ts` 3053–3054: contar es proyección de lo
  público, no una regla; los puentes no se cuentan, como pidió Miguel—, «+N» en tenue en
  la mía si `puntosConLoOculto` difiere de `puntos`, y la frase que se oye es la de
  `FichaDelColono`, palabra por palabra, más «N chozas y M torres»), el mazo que queda
  con su número, la crónica, levantarse y tirar la mesa. El cajón es el `HojaDeAQuien`
  de siempre en la app y el raíl de siempre en el escritorio.

Hay DOS cosas distintas que se llaman «segunda línea», y se separan aquí con lo que
cada una suma de alto:

- **La frase plegada.** La frase NO hace crecer la cinta: si no cabe en una línea, pasa
  a dos líneas de texto DENTRO de los mismos 44 puntos (letra de 13–14 px con
  interlineado de 17: dos líneas son 34 y quedan 10 de aire), y si tampoco cabe así,
  puntos suspensivos. Suma **0**. Lo que no se puede medir en Node es el ancho de texto
  de cada frase con la fuente de la casa: a qué ancho pasa de una línea a dos, y a cuál
  a los puntos suspensivos, se fija en el banco y es una decisión abierta con dueño
  (§10). Lo que sí está medido es el hueco: `ancho/3 − 88` son 101 puntos en el SE,
  172 en un Android de 360, 193 en un iPhone 14, 223 en un Pro Max, 253 en la tableta,
  552 en el monitor.
- **Los botones sueltos.** Una línea más de 44 puntos, en el mismo tercio y sólo cuando
  hay botones tras `opcionesFueraDeLaMesa` (pasar, aceptar, rechazar, contestar,
  empezar), con el rótulo del juego tal cual, como `LasOpciones`. Suma **44**.

La suma máxima es por tanto **88 puntos** (132 si el marcador acaba en la cinta, duda 2
del §10). A 88 la cinta sigue sin tocar ninguna carta (las manos no se acercan al
centro), pero SÍ tapa el vértice más lejano al mirador de salida en los cinco
teléfonos apaisados (63–84 puntos, medidos arriba), y hay que decirlo con todas las
letras porque PASAR está durante todo el turno: mientras haya un botón, el vértice de
la fila de fuera que cae en el tercio central está debajo de él. Sacarlo cuesta
inclinar la cámara 1,5° en un Pro Max y 10,5° en el SE, que son **7, 17, 23, 26 y 37
puntos de arrastre** (Pro Max, iPhone 14, SE 2, Android, SE; `medir-sacar-el-vertice.ts`),
menos que el propio alto de la línea. En tabletas y monitores no tapa nada (195–212).
Es una molestia medida y pequeña; la alternativa —los botones a la derecha del tercio,
en el aire entre la cinta y la mano de bienes, que son 155 puntos en el SE y 240 en un
iPhone 14— se mira en el banco en la fase 5 y queda anotada en el §10.

**De pie** (`ancho < alto`: la web en un móvil sin girar, o una tableta de pie) el
tercio no da para nada: tras «‹» y «≡» quedan **42 puntos** para la frase en 390×845 y
**19** en 320×360, o sea puntos suspensivos siempre. Así que de pie la cinta ocupa el
**40 % del ancho**, y es 40 y no 50 por las manos, que de pie suben hasta arriba: al 50 %
la cinta PISA la carta de arriba de la mano del mazo abierta en 390×845 (3,9 puntos
por dentro de su canto); al 45 % le deja 5,8, que no es un margen; al 40 % deja 15,6 al
mazo y 26,5 a los bienes en 390×845, 29–38 y 55–65 en los demás teléfonos, 66 y 121 en
la tableta de pie (`medir-cinta-de-pie.ts`). La frase gana con eso 40 puntos en 320×360,
56 en 360×490, 68 en 390 de ancho y 219 en la tableta de pie: en los teléfonos sigue
recortada casi siempre, y es lo esperado —de pie es la forma secundaria: la app bloquea
el apaisado y en la web está el cartel de girar (§3)—; la frase entera está en la
región viva y en el cajón. Las dos fracciones (`1/3` apaisado, `0,40` de pie) viven en
una función pura, `anchoDeLaCinta(ancho, alto)` en `escenas/cinta.ts` (sin `three`),
que las dos pantallas llaman y `verify:escena` mide contra las dos manos abiertas en
todos los lienzos (fase 5): la cinta que se pinta es la que se mide.

**Dentro del lienzo** vuelven dos datos, medidos y no leídos:

- **De quién es el turno:** un tapete bajo los dados del color de `turnoDe` (el
  `color` de ese colono en la vista, el mismo de sus chozas), al 55 %. Dos
  triángulos, una llamada.
- **Cuánto mazo queda:** el naipe del cuarto hueco pasa a ser una pila de
  `marcador.mazo` cartas de 0,004 lados de grosor cada una: con las veinticinco
  mide 0,10 lados —5 puntos en un iPhone 14, 14 en un monitor—, y con tres casi
  nada. Es la misma idea que el grosor del sobre del dosier: se ve sin contar. El
  número exacto sigue en el cajón. Una caja, 12 triángulos, una llamada.

## 3. El apaisado en la app

- **Bloqueo:** un gancho `usarApaisado(activo)` hermano de `usarElAparatoQuieto`, sin
  condiciones y por delante de todos los `return` (como exige React a cualquier
  gancho), que bloquea `LANDSCAPE` cuando `activo` y llama a `volverAlRetrato()` al
  soltar; el porqué por plataforma es el del §1.8. `activo` es «se está pintando el
  delta»: en el respaldo y en el vestíbulo no se gira nada. Los dos ganchos de
  orientación nunca coinciden montados (§1.8).
- **La indicación de girar:** `lockAsync(LANDSCAPE)` gira la interfaz en el acto
  aunque el aparato siga vertical, así que la pantalla aparece de lado y la persona
  gira el teléfono sola; la indicación es un cartel de vidrio centrado —«Gira el
  teléfono»— que se enseña 3 s al montar, se quita al tocarlo, y no bloquea nada
  debajo. No se puede saber si el aparato está físicamente vertical con lo que hay
  (`getOrientationAsync` devuelve la de la interfaz, y no hay `DeviceMotion` en las
  dependencias), y no hace falta: si no gira, juega con la pantalla de lado, que es
  jugable y es lo que hacen los juegos apaisados.
- **En la web** no se bloquea nada. Si `ancho < alto` (una tableta o un móvil con el
  navegador de pie), el mismo cartel se queda mientras dure esa proporción, porque
  ahí sí se sabe. La mesa se pinta en su forma de pie y **si hay dados o no lo decide
  la regla del §4.4, no el cartel**: en 390×490 y 390×845 hay dados con un asa de
  45,8 puntos; en 320×360 y 360×490 no los hay, las piezas se quedan en 47,5 y 53,4
  puntos y TIRAR sigue en la cinta (`medir-quinto-y-suelo.ts`). El cartel no es una
  excusa para bajar de 44: la app pinta hoy el delta de pie, y lo que se pinta se
  mide.
- **Lo que el sistema cambia:** con la barra de estado oculta, los insets que quedan
  son los laterales —la muesca cae a un lado en apaisado— y el indicador de inicio
  abajo. La cinta vive en el tercio central y no los toca. Los dados están medidos
  contra la muesca: quedan a 146 puntos del borde útil en un iPhone 14 (muesca de
  47), a 154 en un Pro Max (59), a 154 en un Android con recorte de 24 y a 96 en el SE
  sin muesca (`medir-quinto-y-suelo.ts`). La cara de abajo del asa más baja queda a
  27,2–36,6 puntos del canto de abajo en los cinco teléfonos (`medir-con-014.ts`), por
  encima de la zona del gesto de inicio de iOS.
- **La pantalla encendida:** `activateKeepAwakeAsync` mientras la mesa esté montada,
  como el juego local mientras se juega. Un dado que vibra en una pantalla apagada
  no avisa a nadie. Es batería, y se dice: ver la duda 4 del §10.

## 4. La mesa de madera

### 4.1. Geometría: una tapa horizontal a la cota del zócalo

La primera versión inclinaba la tapa 22° hacia la cámara y afirmaba a la vez que «las
piezas no se mueven». No pueden ser verdad las dos: el asa mide 0,8 lados de fondo
(`boxGeometry` de `PiezaEnLaBarra`, `delta.tsx` 1167) y el zócalo es un cilindro de
0,12 lados de alto (1171–1172); un plano a 22° sube `tan 22° · 0,4 = 0,162` lados a
media profundidad del asa, más que el zócalo entero. Se elige **(a): la tapa es
horizontal, a la cota de la cara de abajo del zócalo, y ninguna pieza se mueve un
milímetro.** Con su Z, en coordenadas de la cámara (`medir-tapa-horizontal.ts`):

- **La cota:** `y = hueco.y − 0,48 · lado` (el zócalo está centrado en `−0,42` y mide
  `0,12`). Con 0,14 cae a `−0,683` en todos los apaisados —el 8,8 % del alto desde
  abajo: 28,1 puntos en el SE, 34,2 en un iPhone 14, 94,8 en un monitor a 1080— y a
  `−0,626..−0,676` en los lienzos de pie (9,2 %–12,2 %).
- **El borde trasero:** `z = −(2 + 0,6 · lado)`: un décimo de lado de madera por detrás
  del zócalo (radio 0,5). En apaisado, `z = −2,139`.
- **El borde delantero:** donde la tapa cruza el canto de abajo de la pantalla,
  `z = −(−cota / tan(campo/2))` = `−1,649` en todos los apaisados. Es lo que hace que
  la mesa no flote: su frente queda FUERA del lienzo, como una mesa que se mira desde
  la silla. **Se quita el canto de 37 puntos de la primera versión**: no hay nada que
  tapar. El fondo resultante es de 2,1 lados (0,49 unidades), y el plano cercano de la
  cámara está en 0,5.
- **El ancho:** `ancho visible · (2 + 0,6 · lado) / 2` —el borde trasero está más
  lejos y la cámara ve más ancho ahí—: factor 1,034–1,070 según el lienzo; se
  redondea a **1,08** para que las esquinas traseras nunca asomen.
- **Lo que ocupa en pantalla:** de la tapa se ve, desde el canto de abajo, hasta el
  borde trasero proyectado: 36,7 puntos en el SE, 44,7 en un iPhone 14, 123,8 en un
  monitor a 1080 —el 11,5 % del alto en todos los apaisados, 11,7 %–13,5 % de pie—. Lo
  más alto de la mesa es el asa (el 22,5 % del alto) y la pieza tomada en lo alto de
  su bote (22,7 %; §1.2); el naipe se queda en el 19,8 %. La placa de `#0d1f1a` que
  sustituye mide 1,5 lados centrada en el hueco: del 5 % al 26 % del alto. La mesa
  con las piezas encima **tapa menos tablero que la placa**.
- **Las cartas de bienes** pisan la tapa vista: sus pies quietos quedan a 33,3 puntos
  del canto en el SE, a 40,6 en un iPhone 14 y a 112,3 en un monitor, entre 3 y 12
  puntos por debajo del borde trasero de la tapa. Y aquí la segunda versión decía una
  cosa falsa —«se dibujan encima, 1010 contra 1000»— que hay que deshacer con el
  ordenador de `three` en la mano (`medir-orden-de-dibujo.ts`, que mete la escena en
  el `WebGLRenderLists` real y la ordena):

  1. `three` ordena primero por `groupOrder` y sólo después por `renderOrder`
     (`painterSortStable`, `WebGLRenderLists.js` 1–27), y un `Group` con `renderOrder`
     pone ese número como `groupOrder` a TODO lo que cuelga de él
     (`WebGLRenderer.js` 1839–1841). El grupo `Barra` lleva
     `renderOrder={ORDEN_DE_LA_BARRA}`; los grupos de `Baraja` (1875) y `ManoDelMazo`
     (2259) no llevan ninguno. Así que hoy todo lo de la barra tiene `groupOrder`
     1000 y todo lo de las manos 0, y el 1010 de cada carta sólo ordena DENTRO del 0.
  2. Y las dos manos no están en la misma pasada: `three` pinta primero todos los
     opacos, luego los transmisivos, luego los transparentes (`renderScene`,
     1959–1961). Las cartas de bienes son OPACAS —su `meshBasicMaterial` no lleva
     `transparent`, 1656–1671— y las del mazo transparentes. La placa de hoy es
     transparente (`opacity 0,42`).

  Medido, el orden de hoy es: mundo → testigo y cartas de bienes (g0) → piezas de la
  barra (g1000) → su testigo (999, DESPUÉS de sus piezas) ‖ anillo → áreas → cartas del
  mazo (g0) → placa y zócalos (g1000). O sea que la placa ya se pinta DESPUÉS de los
  pies de las cartas de bienes y los tiñe al 42 %: «es lo que ya pasaba» era verdad a
  medias. Con una TAPA OPACA en el grupo `Barra` sin tocar nada más, la tapa (opaca,
  g1000) se pinta después de las cartas (opacas, g0) y les TAPA los pies, 3–12 puntos
  en todos los apaisados. La decisión, lo más barato y sin tocar `baraja.ts` ni
  `cartas.ts`, en `delta.tsx`:

  - El `<group>` de `Baraja` lleva `renderOrder={ORDEN_DE_LAS_CARTAS}` y el de
    `ManoDelMazo` `renderOrder={ORDEN_DE_LAS_CARTAS_DEL_MAZO}`. Con eso, en las DOS
    pasadas, todo lo de la barra (1000) va antes que todo lo de los bienes (1010) y
    esto antes que todo lo del mazo (3000); dentro de cada grupo el `renderOrder` de
    cada malla sigue mandando como hoy: el testigo de la baraja (1005) antes que sus
    cartas, las áreas (2000+) después de la carta cogida, las casillas (4000+) después
    de las cartas del mazo. Medido en el guion: cero fallos.
  - El testigo de la barra pasa de `renderOrder={999}` a `{-1}`: dentro del grupo
    1000, 999 va DESPUÉS de las piezas y de la tapa (que tienen 0), así que hoy borra
    la profundidad cuando ya no sirve; con −1 va primero, que es lo que su comentario
    dice que hace.
  - La tapa lleva `raycast={() => null}` y no escribe nada que las cartas miren
    (`depthTest={false}` en ellas): no les quita ni un toque ni un píxel.
  - Lo TRANSPARENTE de la mesa —zócalos, tapete, sombras de contacto— se pinta en la
    pasada de transparentes, después de las cartas opacas, haga lo que haga el
    `groupOrder`; por eso nada transparente de la mesa puede llegar a una carta: los
    zócalos y las sombras viven dentro de los huecos y el tapete bajo los dados, y
    «el hueco del mazo queda libre de las cartas de bienes» ya lo mide `verify:escena`.
    La pila del mazo (fase 7) es opaca por lo mismo.
  - La regla del apilamiento que encabeza `ORDEN_DE_LA_BARRA` (delta.tsx 204–219) se
    completa con esto: «cada capa pegada a la cámara es un grupo con su
    `renderOrder`, y el número de la malla ordena dentro del grupo». El comentario de
    la carta (1626–1630: «el `renderOrder` de un grupo no baja a sus hijos») se
    corrige: no baja como `renderOrder`, baja como `groupOrder`, y manda más.
  - `verify:escena` no puede correr el pintor, pero ya lee `delta.tsx` como texto
    (433, 1529, 2484): en la fase 2 afirma que los tres grupos declaran su
    `renderOrder` con su constante y que el testigo de la barra va a −1.

Se quita la placa, y con ella se queda sin objeto la comprobación de `verify:escena`
«la mano del mazo no invade la zona de la barra de construir» (2045–2071), que mide
`hueco.y + hueco.lado · 0,75` —la placa— para una a seis piezas: sin placa seguiría
verde vigilando nada. En la fase 1 sigue midiendo la placa (con 0,14 da `−0,240`); en
la fase 2 se reescribe contra lo que de verdad hay: el techo de la mesa,
`hueco.y + 0,52 · lado` —el asa (0,5) más el bote de la pieza tomada (0,516),
redondeado hacia arriba—, aplicado a los huecos de las piezas Y al de los dados, que
tiene el mismo `y` y el mismo alto de un lado y cuyo dado en salto se queda en 0,18.
Es `−0,272·alto` con el alto mandando: 0,072 de holgura al piso de `−0,20`. Se queda
la `pointLight` de `[0.4, 0.6, -1.2]` con su alcance de 3: es lo que ilumina lo que
gira con la cámara, y como está por encima de la cota ilumina también la tapa
horizontal. Los zócalos hexagonales se quedan como
posavasos: llevan la información de «apagada» (opacidad 0,3) y la de «tomada»
(verde), y un posavasos sobre una mesa es una cosa normal. Ver la duda 5.

### 4.2. El material: madera del pack, por vértice

No hay ni mesa ni tablón suelto en los packs: lo que hay de madera son
`fence_wood_straight`, `crate_*`, `barrel`, `building_docks_*` en el pack hexagonal y
`Wood_Plank_A/B/C`, `Wood_Planks_Stack_*`, `Wood_Log_*` en Resource Bits (contados:
404 `.gltf` en el pack hexagonal EXTRA, 221 en el FREE, 76 en Resource Bits y 31 en
Adventurers, 732 en total). Ninguna sirve de tapa: son piezas pequeñas con su propia
forma, y Resource Bits trae su propio atlas. Lo que sí sirve es el COLOR: el atlas
`hexagons_medieval.png` mide 1024×1024 y está partido en 8×4 = 32 celdas de 128×256
téxeles; las piezas de madera apuntan a dos de ellas, y se han leído por sus UV
(`medir-madera.ts`, con `pngjs` desde la app como hace `hornear.ts`):

| Pieza | Celda oscura (6,0) | Celda clara (5,0) |
|---|---|---|
| `crate_A_small` | `#94533f` (154 vértices) | `#ab694e` (40) |
| `barrel` | `#975641` (249) | `#c3805c` (30) |
| `fence_wood_straight` | `#91513d` (260) | `#b97756` (170) |
| `building_docks_blue` | `#995843` (1.085) | — |

La tapa mezcla `#955541` y `#b97756` según una veta, `vetaDelTablon(segmentos, filas,
tablon)`, función pura de `escenas/mesa.ts`:

```
x = i / segmentos ∈ [0, 1]   a lo largo del tablón (el ancho de la pantalla)
y = j / filas     ∈ [0, 1]   a lo ancho del tablón (la profundidad, hacia la cámara)
tablon = floor(j · 3 / filas) ∈ {0, 1, 2}   tres tablones de 0,7 lados de fondo
veta(x, y, tablon) = fbm(x · 3 + tablon · 17,3, y · 22 + tablon · 5,1, 7_001, 3 octavas)
color = mezcla(#955541, #b97756, veta)
```

`fbm` es el de `escenas/ruido.ts` (devuelve entre 0 y 1); el canal 7.001 es fijo y los
desfases por tablón son lo que hace que los tres no repitan la misma veta. Es
anisótropa —lenta a lo largo, rápida a lo ancho, como el grano—. Medida sobre la malla
(`medir-veta.ts`): el tablón 0 da valores en `[0,223, 0,813]` con media 0,534 y 2
cruces de la media a lo largo; el 1, `[0,137, 0,823]`, media 0,525, 5 cruces; el 2,
`[0,138, 0,845]`, media 0,500, 1 cruce; y los rangos no cambian con 64, 96 ni 240
segmentos. El contraste de luminancia entre los dos extremos es **1,60:1**: una
madera que se lee como madera sin competir con las piezas que tiene encima. La junta
entre tablones se ve como un cambio de veta, no como una ranura: los vértices de la
fila compartida toman el color del tablón de abajo, y una ranura de verdad pediría
vértices duplicados; se mira en el banco y se decide ahí. Los colores se escriben en
el atributo `color` en LINEAL —`sRGB → lineal` por canal, como `tinte.ts`— y el
material es `MeshStandardMaterial` blanco con `vertexColors`, `roughness 0,8`.

La resolución de la veta es la de los vértices: con 96 segmentos a lo largo, un
segmento mide 5,9 puntos en 568 de ancho, 8,8 en 844 y 20 en 1.920. Veinte puntos
interpolados se ven blandos en un monitor, así que los segmentos se escalan con el
ancho en puntos —uno cada 8 puntos, acotado entre 64 y 240— y el tope del §1.10
cubre el caso mayor.

### 4.3. Sombras de contacto sin mapa de sombras

El móvil no tiene sombras (`shadows={Platform.OS === 'web'}`) y la barra nunca las
recibió. Bajo cada pieza y bajo los dados va un disco de 20 segmentos, negro,
`transparent`, `depthWrite: false`, con el alfa en el vértice —0,35 en el centro, 0 en
el borde; `three` lee un atributo `color` de cuatro componentes como alfa por vértice—,
tumbado sobre la tapa horizontal a `cota + 0,002`. Los seis discos van en UNA
geometría fundida con `mergeGeometries`, como hace `embarcadero/cargar.ts`: 120
triángulos y una llamada. Es el mismo disco de contacto que llevan los aventureros del
Muelle.

### 4.4. Los huecos: `huecosDeLaMesa`, y cuándo NO hay dados

`huecosDeLaMesa(cuantos, campo, proporcion, altoEnPuntos)` devuelve `{ piezas, dados }`.
Recibe el alto del lienzo en PUNTOS porque el suelo de 44 es en puntos y el reparto
de `huecosDeLaBarra` sólo sabe de unidades; la escena lo tiene (`estado.size.height`,
que la `Barra` ya lee para la proporción) y las dos pantallas también (`medida` en la
app, línea 604; `clientWidth/clientHeight` en el escritorio, 499 y 656). `dados` es un
hueco de `1,6 lados` de ancho por `1 lado` de alto, y la regla es de tres peldaños,
en este orden:

1. **Colgado a la IZQUIERDA del reparto de cuatro,** con un paso de aire
   (`AIRE · lado`) entre su borde derecho y el primer hueco, SIEMPRE QUE QUEPA con
   medio lado de aire hasta el canto izquierdo. `piezas` es `huecosDeLaBarra(4, …)`
   tal cual. En todos los lienzos apaisados el alto manda, así que cae siempre en
   `x ∈ [−0,974, −0,603]`; medido contra el borde útil tras la muesca, sobran 96
   puntos en el SE, 113 en el SE 2/3, 146–154 en los iPhone con muesca y el Android,
   60 en una tableta 4:3, 108 en un iPad Air, 325 en un monitor a 1080 y 431 en el de
   1920×900. No despierta la mano del mazo: su techo está en `−0,456` y la franja de
   esa mano empieza en `−0,331` (`franjaDeLasCartas().piso`). La escena no conoce la
   muesca —no debe—, y no hace falta: el margen medido en los teléfonos con muesca la
   cubre de sobra.
2. **Como QUINTO hueco del reparto centrado,** el primero por la izquierda, cuando el
   colgado no cabe Y el asa de cinco sigue en o por encima de 44 puntos. `piezas` son
   los otros cuatro de `huecosDeLaBarra(5, …)`. Pasa en 390×490 y 390×845 (asa de 45,8
   puntos, las piezas bajan de 57,8 a 45,8), en la tableta de 768×640 (el colgado
   habría quedado a 8 puntos del canto; asa de 89,6, las piezas no cambian porque
   sigue mandando el alto) y en una tableta con el navegador de pie, 768×1024 (90,2).
   Las piezas se corren un poco a la izquierda, y se deja escrito por lo mismo que la
   cabecera de `huecosDeLaBarra`: una barra centrada que crece no se queda donde
   estaba.
3. **`dados = null`,** cuando ni el colgado cabe ni el quinto llega a 44. `piezas` es
   `huecosDeLaBarra(4, …)`, las piezas no encogen, y el botón TIRAR se queda en la
   cinta: cada movimiento exactamente una vez, nadie sin tirar (§1.4). Pasa en
   320×360 (el quinto daría 37,6; las piezas se quedan en 47,5) y en 360×490 (42,3;
   se quedan en 53,4). Son dos de los seis lienzos de la lista `LIENZOS` de
   `verify:escena` que hoy exigen 44 y dan 46,8 y 53,4 con 0,13: la mesa no puede
   ponerlos rojos, y no los pone.

La regla es «cabe o no cabe, y llega a 44 o no», nunca la proporción, para que un
lienzo raro no caiga en la forma equivocada. La pantalla pregunta lo mismo que la
escena —`huecosDeLaMesa(...).dados !== null`— antes de llamar a `dadosEnTres`, y como
las dos llaman a la misma función con la misma medida no pueden discrepar: si la
escena no pinta dados, la pantalla no quita el botón.

**`cuantos` es 4, y por qué siempre 4 cuando hay dados.** La escena cuenta
`piezas.length + (mazo === null ? 0 : 1)` (`delta.tsx` 1401) y la pantalla tiene que
contar EXACTAMENTE igual —`barraEnTres(...).length + (mazoEnLaBarra(...) === null ? 0 :
1)`— para pedir el mismo reparto. En `jugando`, para un colono con color, es 4 sin
excepción: `barraEnTres` devuelve las tres `PIEZAS_DE_LA_BARRA` en cuanto hay color,
dentro y fuera de turno (314–324; fuera de turno salen apagadas, no ausentes), y
`mazoEnLaBarra` no es `null` en `jugando` con color (362–371). Fuera de `jugando` el
mazo es `null` y son 3, y ahí NO hay dados: `dadosEnTres` devuelve `null` fuera de
`momento === 'jugando'`, por lo mismo que `mazoEnLaBarra` (cabecera 351–360: durante la
colocación no existe la jugada, y un hueco apagado toda una fase promete algo que no
llega). Todas las medidas del colgado usan 4 y valen; la de 3 se hizo igual
(`medir-colgado-con-tres.ts`) por si algún día se quieren dados en la colocación: con 3
el colgado cae más adentro, `x ∈ [−0,830, −0,459]`, con 124–191 puntos libres tras la
muesca en los teléfonos, cabe en la tableta de 768×640 (63) y en los lienzos de pie
pasaría a cuarto hueco con 47,5 puntos en 320×360 y 53,4 en 360×490 —donde con 4 no
hay dados—: un lienzo que tuviera dados en la colocación y los perdiera al empezar a
jugar. Otra razón para no pintarlos ahí. `verify:escena` mide las tres
formas en los seis lienzos de hoy más 768×1024 y los ocho apaisados (568×320, 667×375,
780×360, 844×390, 932×430, 1024×768, 1180×820, 1920×1080), con la misma exigencia que
el hueco del mazo: 44 puntos de asa en TODAS las piezas y en los dados cuando los hay,
libre de la mano de bienes quieta, sin despertar la mano del mazo, y que en 320×360 y
360×490 `dados` sea `null`.

## 5. Los dados

### 5.1. Forma y tamaño

Dos `BoxGeometry` de `0,46 lados` de arista con un hueco de `0,08 lados` entre ellos
—juntos llenan el lado del hueco—, color `COLOR_DEL_NUMERO` (`#efe6cd`, el crema de
los discos de las fichas del tablero) y los puntos en `COLOR_DEL_PUNTO` (`#2a2118`, el
de sus cifras): los dados y las fichas son del mismo juego. Los 21 puntos de cada dado
son `CircleGeometry(0,09, 10)` pegados a las caras y fundidos en una geometría: 12 +
210 triángulos y 2 llamadas por dado, 444 y 4 llamadas los dos
(`medir-triangulos.ts`, §C). Sin aristas redondeadas: a 3 segmentos costarían 108
triángulos cada uno y a 23 puntos no se ven. Se apoyan en la tapa: el centro del cubo
queda en `cota + 0,23 lados`.

En pantalla cada dado mide 20,6 puntos en el SE apaisado, 23,2 en un Android de 360,
25,1 en un iPhone 14, 27,7 en un Pro Max, 49,5 en una tableta y 69,6 en un monitor a
1080, con puntos de 3,7 a 12,5 (`medir-quinto-y-suelo.ts`); como quinto hueco de pie,
21,1 en 390 de ancho. El asa es UNA para los dos —una caja invisible por
`colorWrite`, nunca por `visible`— de `1,6 lados × 1 lado`: 87×55 puntos en un iPhone
14, 72×45 en el SE. Es el mismo alto de asa que un hueco de la barra, y por eso la
misma comprobación de 44 lo cubre. Ver la duda 6.

### 5.2. Qué dice cada estado

`dadosEnTres(vista, quien, opciones)` en `shared/arcade/juegos/riberas-en-tres.ts`,
sin `three` y sin importar valores de `escenas/` (hoy sólo importa tipos de ahí, y
sigue así), devuelve `null` si esta pantalla no pinta dados —mirón, más de cuatro,
respaldo, y `momento !== 'jugando'` (§4.4)— y si no:

```
DadosEnTres = { porTirar: meToca(vista) && yo === quien && hay TIRAR en `opciones`,
                disponible: porTirar,
                sello: selloDeLaTirada(turnosAbiertos, tirado),   // §1.3
                ultimaTirada, tirado }
```

(Es la forma que ya tiene el código de la fase 1, `riberas-en-tres.ts` 1033–1077, y
gana: el sello viaja ya calculado, y `de`/`colorDelTurno` NO van aquí; el tapete lee
`turnoDe` y su color de la vista, como el marcador.) La pantalla lo compone así, y el
orden es la decisión 4:

```
const sitio  = huecosDeLaMesa(cuantos, CAMPO, ancho / alto, alto).dados !== null;
const dados  = sitio ? dadosEnTres(vista, yo, opciones) : null;   // opciones ENTERAS
const cinta  = opcionesFueraDeLaMesa(opcionesFueraDeLaBarra(...), dados);
const hueco  = dados && { ...dados, disponible: dados.disponible && !mesa.quieto };
```

`porTirar` sale de la lista de opciones, no de rehacer la regla: es lo mismo que hace
`mazoEnLaBarra` con COMPRAR. Y **`disponible` es la ÚNICA bandera que la escena mira
para dejar tocar y para vibrar**, como `MazoDeLaBarra.disponible`: `dadosEnTres` la
pone a `porTirar`, la pantalla la apaga con `quieto` mientras una petición vuela, y la
escena no sabe por qué está apagada. La segunda versión no
la tenía y dejaba un agujero: un colono FUERA de turno tiene dados (`dadosEnTres` no
es `null` para él: los demás ven la tirada) con `porTirar = false`; tocaba el asa, la
escena empujaba `tocado`, la máquina pasaba a `rodando` sin objetivo, no había TIRAR
que mandar —o el servidor lo rechazaba— y sin `rechazado` rodaban 6 s. Con
`disponible` falso el asa NO empuja `tocado` ni llama a `onPulsarLosDados`: el toque
llega al asa (sigue `stopPropagation`, para que no gire el tablero por debajo, como una
pieza apagada de la barra) y ahí se acaba.

- **Reposo, apagado** (`disponible` falso: no me toca, ya tiré, o `quieto`): los dos
  dados quietos enseñando el último par, a todo color —la tirada es de todos y se lee
  desde todos los asientos, así que no se atenúan como una pieza apagada—, sobre el
  tapete del color de `turnoDe`, sin vibrar y sin responder al toque. El hueco de los
  dados no lleva zócalo: no hay nada que «encender». Con `ultimaTirada = 0` (antes de
  la primera tirada) enseñan 1 y 1 sin tapete.
- **Me toca y falta tirar** (`disponible`): VIBRAN. Patrón de 1,6 s:
  sacudida de 0,36 s a 8 Hz con envolvente senoidal, y el resto quietos; se mueven
  el 21 % del tiempo, diez avisos en dieciséis segundos (`medir-dado.ts`). Amplitud:
  3 % del lado en traslación —1,35 puntos en el SE, 1,6 en un iPhone 14, 4,5 en un
  monitor a 1080 (`medir-con-014.ts`)— y 4° de giro. Es un temblor que se ve en el
  rabillo del ojo y no un bote: la barra ya enseñó que «cuatro cosas moviéndose en el
  borde del ojo mientras se mira el tablero» molestan (`GIRO_DE_LA_VITRINA`). A nadie
  más le vibra nada: `disponible` es falso para los demás, y la vibración lee esa
  misma bandera y ninguna otra.
- **Rodando:** giro sobre dos ejes con velocidad decreciente y un salto de `0,2 lados`
  que cae; mínimo 0,6 s.
- **Asentando:** interpolación amortiguada del cuaternión al que enseña la cara
  objetivo, 0,35 s, con el rebote del `Asentamiento` (un seno al final).

### 5.3. El toque y la máquina

Tocar el asa —primario, `stopPropagation`, `loCogeLaInterfaz`, y en la app
`laInterfazSeLoQueda()` como hace `alTomarDeLaBarra`— y SÓLO si `disponible` (§5.2)
llama a `onPulsarLosDados` y empuja `tocado`, y la pantalla manda la opción TIRAR por
`mesa.mover`, la misma puerta que el botón. La escena no sabe que eso es tirar: es «el
hueco que se pulsa», como el naipe del mazo.

`mover` cambia de firma en las dos `mesa.ts`: hoy es `(movimiento) => void` con un
`void (async () => {...})()` dentro; pasa a devolver esa misma promesa, resuelta a
`'hecho' | 'rechazado' | 'sin-red'` con lo que el cuerpo ya sabe. La tabla entera, sin
dejarse ninguna salida del cuerpo:

| Salida de `mover` (`app/src/arcade/mesa.ts` 704–799, `escritorio/src/mesa.ts` 676–741) | Resuelve |
|---|---|
| El `return` temprano —`if (donde === null \|\| rev === undefined) return;` (707–709 / 679–681)—: sin código de mesa o sin `rev`, no se manda nada | `'rechazado'` (la mesa está igual que estaba; nada rodó por el cable) |
| `r.ok` y `rev` subió | `'hecho'` |
| `seIgnoro` (`r.ok` con el mismo `rev`) o `!r.ok` | `'rechazado'` |
| El `catch` | `'sin-red'` |

Nadie más la lee: los demás sitios siguen llamándola sin `await`. La pantalla
comprueba los tres valores EXHAUSTIVAMENTE —un `switch` sin `default` sobre el tipo
de unión, de modo que un cuarto valor el día de mañana no compile—: `'hecho'` no
empuja nada (la vista traerá la tirada); `'rechazado'` y `'sin-red'` empujan
`rechazado` a la cola de la máquina, porque en los dos casos la mesa no cambió y no
va a llegar ninguna tirada mía. El `useFrame` de los dados vacía esa cola en su
primer `tic`. Los 6 s de la máquina (más abajo) quedan para la única salida que no
está en la tabla: una petición que no vuelve nunca, ni bien ni mal ni con error.

La máquina vive en `escenas/dados.ts`, pura, con el reloj inyectado, como `gestos.ts`
del Muelle, y se comprueba en Node:

```
faseDeLosDados(estado, suceso, ahora) → estado
sucesos: { que: 'tocado' } | { que: 'vista', vista: { tirado, ultimaTirada, sello } }
       | { que: 'rechazado' } | { que: 'tic' }
estados: quieta(par) | rodando(desde, objetivo | null, anterior) | asentando(desde, par)
```

(La forma es la del código de la fase 1, `escenas/dados.ts` 91–143: la máquina no lee
`turnosAbiertos` a secas, recibe el `sello` ya calculado por `dadosEnTres`, y `rodando`
guarda el par `anterior` al que vuelve si la tirada no llega.)

- `tocado` en `quieta` → `rodando(ahora, null)`. En cualquier otro estado, nada: el
  segundo toque de un doble toque no arranca nada, y como la pantalla pone `quieto`
  mientras la petición vuela, `disponible` cae y el asa tampoco lo manda. Y `tocado`
  sólo lo empuja un asa `disponible`: fuera de turno no llega nunca a la máquina.
- `rechazado` en `rodando` sin objetivo → `quieta(par anterior)` en el acto. En
  cualquier otro estado, nada (si ya hay objetivo es que la vista trajo la tirada,
  que es de otro o de mi otra pestaña, y se asienta en ella). Lo que falló lo dice
  `mesa.aviso` («Ese movimiento no se ha podido hacer ahora mismo…», que ya existe);
  los dados no inventan un error.
- Llega una vista con una TIRADA NUEVA → en `rodando`, se fija el objetivo y se pasa
  a `asentando` en `max(desde + 0,6, ahora)`; en `quieta` (la tirada es de otro, o
  la mía llegó sin que yo tocara —dos pestañas—), se pasa a `rodando(ahora,
  objetivo)`.
- Tirada nueva es: `tirado` pasa de falso a verdadero; o `tirado` es verdadero y
  cambia el `sello` o `ultimaTirada` respecto de la última vista (dos movimientos
  entre dos vueltas del sondeo). Si el `sello` cambia con `tirado` falso, la tirada
  del turno anterior se perdió entre sondeos: se enseña el par nuevo en reposo, sin
  animar, porque ya es noticia vieja.
- El par lo da `repartoDeLaTirada(suma, sello, semilla)` con el sello de la decisión
  3. No hay ningún caso en que un aparato vea otro par que sus vecinos: el sello sale
  de tres números que viajan en la vista o se derivan del código de la mesa.
- `rodando` sin objetivo más de 6 s → `quieta(par anterior)`. Ya sólo pasa cuando la
  petición no ha vuelto ni bien, ni mal, ni con error: `'sin-red'` también empuja
  `rechazado` (tabla del §5.3), así que un fallo de red que se sabe corta en el acto.
- Cada `tic` es un `useFrame`: escribe posición y cuaternión de las dos mallas. Nada
  cruza el estado de React.

La máquina es la misma con un dado o con dos (duda 1): lo que cambia es cuántas
mallas escribe el `tic` y qué devuelve `repartoDeLaTirada`.

## 6. Recoger la mesa

- **El control** está FUERA del `Canvas`, abajo a la izquierda, 44×44 puntos, en el
  mismo sitio y con el mismo cromo que «Tablero entero» (`estilos.volver` en la app,
  `.riberas-volver` en el escritorio): un botón de la Sala con su foco, su filo y su
  etiqueta («Recoger la mesa» / «Sacar la mesa»), no un objeto del mundo. Un objeto
  del mundo tendría que quedarse fuera del grupo que baja para seguir visible, y ya no
  sería «de la mesa». Ocupa un rincón donde no hay nada: la mano del mazo empieza en
  `y = −0,331` y los dados colgados empiezan a 96 puntos del borde útil en el SE y a
  146 en un iPhone 14, y el botón acaba a 44.
- **Qué baja:** el grupo `Barra` entero —tapa, zócalos, piezas, naipe o pila, dados,
  tapete, sombras—, `alto/2 + hueco.y + 0,5 lados` hacia abajo: 0,37 unidades, 88
  puntos en un iPhone 14, hasta que el punto más alto (el naipe) queda bajo el canto.
  Objetivo más interpolación amortiguada en el `useFrame` del grupo, 0,28 s; al
  llegar, `visible = false`, que además saca sus asas de los sucesos de r3f.
- **Qué NO baja:** las dos manos. No están sobre la mesa —una mano de cartas se
  sostiene— y en apaisado viven en los costados, que no es lo que se quiere despejar.
  Recoger la mesa suelta lo cogido (`soltarTodo`, `riberas-en-tres-escena.tsx` 591):
  una pieza en la mano con la barra fuera de la pantalla no tiene a dónde volver. La
  bajada medida: 72 puntos en el SE, 88 en un iPhone 14, 243 en un monitor a 1080
  (`medir-tapa-horizontal.ts`).
- **Las áreas de toque:** se van con el grupo; un rayo desde un puntero dentro del
  lienzo no cruza geometría que está por debajo del canto, y con `visible = false`
  r3f ni las mira.
- **El estado** vive en la pantalla (`useState` en `LaMesaEnTres` / `RiberasEnTres`),
  no se guarda: una partida nueva empieza con la mesa puesta. Y se saca sola cuando
  pasa a tocarme (`meToca` pasa de falso a verdadero): recoger es para mirar, y cuando
  hay que actuar la mesa vuelve. Si la recojo en mi propio turno, se queda recogida
  hasta que yo diga. **Con algo cogido no sale sola:** si en ese instante hay una
  carta en la mano (`cogida` o `cogidaDelMazo`; una pieza de la barra no puede
  estarlo, la mesa recogida no tiene de dónde cogerla), la salida espera a que se
  suelte o se coloque. Una mesa que sube debajo de un arrastre cambiaría lo que hay
  bajo el dedo a mitad de gesto. Como la pantalla ya suelta todo al cambiar `rev`
  (línea 601), la espera dura lo que dure el gesto.
- **La cámara** no cambia (§1.9).

## 7. El presupuesto

Medido con `three` en Node (`medir-tapa-horizontal.ts` y `medir-triangulos.ts`), y
comparado con lo único que hoy tiene cota:

| Qué | Triángulos | Llamadas |
|---|---|---|
| La barra hoy: poblado 1.011 + ciudad 5.659 + puente 604 (leídos del `.glb`), 4 zócalos × 24, 4 asas × 12, placa 2, naipe (filo, cuerpo, icono de 16) | ≈ 7.450 | ≈ 16 |
| Tapa horizontal 96×6 (679 vértices), sin canto | 1.152 | 1 |
| Tapa a 240×6 (monitor) | 2.880 | 1 |
| Dos dados (12 + 210 cada uno, puntos fundidos) | 444 | 4 |
| Asa de los dados | 12 | 1 |
| Tapete del turno | 2 | 1 |
| Seis sombras de contacto fundidas | 120 | 1 |
| Pila del mazo (una caja escalada) | 12 | 1 |
| **Nuevo, total (= `triangulosDeLaMesa(seg)` = 12 · seg + 590)** | **1.742 – 3.470** | **+9, −1 de la placa** |
| El mar (`TRIANGULOS_DEL_MAR`) | 23.328 | 1 |

La mesa entera cuesta entre el 7,5 % y el 14,9 % del mar en triángulos (el 5,8 % con
64 segmentos, el mínimo); en llamadas, la barra pasa de unas 16 a unas 24. La
`pointLight` no es una llamada pero sí coste por fragmento en todo material
iluminado; sigue habiendo dos (barra y baraja), ninguna nueva. `TOPE_DE_LA_MESA =
3_600` en `presupuesto-del-delta.ts`, con `triangulosDeLaMesa(segmentos)` al lado
para que el número salga de la misma cuenta en la escena y en el comprobador.

**Texto en el lienzo:** una cifra compilada cuesta de 8 (el «4») a 160 (el «8»)
triángulos, 60 de media, y una llamada. Un marcador de cuatro colonos con dos cifras
cada uno más el mazo serían 540 triángulos y 9 llamadas —barato— pero no hay 0, 1 ni
7, no hay letras, y no se oye. Por eso el §1.7: los números van fuera. Dentro no se
compila ninguna cifra nueva.

## 8. Dónde vive cada cosa

| Fichero | Qué |
|---|---|
| `escenas/barra.ts` | `PARTE_DEL_ALTO` 0,14; `SUELO_DEL_TOQUE = 44` exportado (el mismo número en la escena y en el comprobador); `huecosDeLaMesa(cuantos, campo, proporcion, altoEnPuntos)` con los tres peldaños; la cota de la tapa como función del hueco; la cabecera de `ANCHO_MAXIMO` reescrita |
| `escenas/mesa.ts` (NUEVO, sin `three`) | `vetaDelTablon`, los dos colores medidos del atlas, la conversión a lineal, el número de segmentos por ancho en puntos, la Z de los bordes |
| `escenas/dados.ts` (NUEVO, sin `three`) | `paresDeLaSuma`, `repartoDeLaTirada(suma, sello, semilla)`, `sacudida(t)`, `faseDeLosDados` con `rechazado`, `RODAR_MINIMO`, `ASENTAR`, `TOPE_SIN_RESPUESTA`. `selloDeLaTirada` NO está aquí: vive en `shared/…/riberas-en-tres.ts` al lado de `dadosEnTres`, que es quien lo calcula, y el sello ya viaja hecho en `DadosEnTres` (§5.2) |
| `escenas/presupuesto-del-delta.ts` | `SEGMENTOS_DE_LA_MESA` (mín, máx, puntos por segmento), `triangulosDeLaMesa`, `TOPE_DE_LA_MESA` |
| `escenas/cartas.ts` | SÓLO las dos frases que citan el techo de la placa (26 y 408), dos veces: en la fase 1 la placa con 0,14 (`−0,240·alto`), en la fase 2 el asa y el bote (`−0,273·alto`, §1.2); ninguna constante |
| `escenas/baraja.ts` | Nada |
| `escenas/cinta.ts` (NUEVO, sin `three`) | `anchoDeLaCinta(ancho, alto)`: el tercio en apaisado, el 40 % de pie (§2.2) |
| `escenas/delta.tsx` | `Barra` → tapa horizontal, sombras, tapete, pila; `Dados` hermano de `PiezaEnLaBarra`, que sólo empuja `tocado` si `disponible`; entradas `dados`, `onPulsarLosDados`, `mesaRecogida` de `<Delta>`, opcionales como las otras; `renderOrder` en los `<group>` de `Baraja` y `ManoDelMazo` y el testigo de la barra a −1 (§4.1); la cabecera de `ORDEN_DE_LA_BARRA` y el comentario de la carta (1626–1630) reescritos |
| `escenas/scripts/verificar-escena.ts` | Los lienzos apaisados y 768×1024; los tres peldaños de los dados; la mesa contra las manos; el reparto por sello; la veta; el tope; la línea de «tres y cuatro» reescrita; «la mano del mazo no invade la zona de la barra» contra `0,52·lado` en la fase 2; los tres grupos con su `renderOrder` (texto); el vértice más alto bajo la cinta al salir; la cinta apaisada y de pie contra las manos |
| `shared/arcade/juegos/riberas-en-tres.ts` | `tirado`, `ultimaTirada`, `turnosAbiertos` en `VistaQueSePinta` (y los dos comentarios de `comprada`, 51–53 y 170–175, reescritos: §1.3); `dadosEnTres` (`null` fuera de `jugando`), `opcionesFueraDeLaMesa`, `chozas`/`torres` en `ColonoEnElMarcador` |
| `server/scripts/verificar-riberas-en-tres.ts` | Que TIRAR se cae del formulario sólo con dados; que `porTirar` sigue a las opciones enteras; que `dadosEnTres` es `null` fuera de `jugando`; que las cuentas de chozas y torres cuadran con la vista |
| `app/src/arcade/mesa.ts`, `escritorio/src/mesa.ts` | `mover` devuelve `'hecho' \| 'rechazado' \| 'sin-red'`, con el `return` temprano resuelto a `'rechazado'` (tabla del §5.3) |
| `app/src/arcade/local.ts` | `volverAlRetrato()`; `usarElAparatoQuieto` lo usa al desmontar; `usarApaisado` al lado |
| `app/src/arcade/riberas-en-tres-escena.tsx`, `app/src/arcade/hud-de-la-mesa.tsx` (NUEVO) | La rama del delta a pantalla completa; la cinta del tercio central y el cajón; barra de estado oculta; cartel de girar; la acción accesible `tirar` |
| `escritorio/src/riberas-en-tres.tsx`, `escritorio/src/sala.tsx`, `escritorio/src/estilo.css` | La misma cinta en DOM; el raíl como cajón; `.riberas-lienzo` a toda la altura; el botón de tirar para tecnologías de apoyo |

## 9. Cómo se midió

Diecisiete guiones en el scratchpad de la sesión, que importan el código real. De la
primera pasada: `medir-lienzos.ts` (huecos, manos y franjas en catorce lienzos con el
0,13 de hoy), `medir-dados-hueco.ts` (el hueco de los dados colgado y como quinto),
`medir-con-014.ts` (las mismas cuentas con `PARTE_DEL_ALTO` a 0,14: reproduce la
fórmula de `huecosDeLaBarra` porque `barra.ts` no se toca en un encargo de diseño, y
es la única copia de esa fórmula que existe; muere con la sesión),
`medir-triangulos.ts` (primitivas del `.glb`, geometrías con `three`, cifras
compiladas), `medir-dado.ts` (la cadencia de la vibración y las llegadas de la vista;
su reparto sellaba por `rev` y queda sustituido) y `medir-madera.ts` (UV de las piezas
de madera del pack sobre el atlas con `pngjs`). De la segunda, tras la revisión:
`medir-tapa-horizontal.ts` (la cota, las dos Z, lo que la tapa ocupa en pantalla, la
bajada, el total de triángulos con `three`), `medir-quinto-y-suelo.ts` (los tres
peldaños de los dados en quince lienzos), `medir-cinta-central.ts` (el tercio central
contra las dos manos abiertas y contra el borde lejano del delta proyectado con la
cámara), `medir-reparto-por-turno.ts` (el sello por turno, mil turnos, la recarga, y
el fallo del sello por asiento reproducido) y `medir-veta.ts` (dominio, tablones,
rangos y contraste). De la tercera, tras la segunda revisión:
`medir-orden-de-dibujo.ts` (la escena de las capas pegadas a la cámara metida en el
`WebGLRenderLists` de `three` 0.185.1 y ordenada con su `sort`, hoy y con los grupos
numerados), `medir-techos.ts` (placa, naipe, asa, pieza señalada y tomada, dado en
salto, con 0,13 y 0,14 y en los lienzos de pie), `medir-colgado-con-tres.ts` (los tres
peldaños con `cuantos` 3 y 4), `medir-cinta-de-pie.ts` (la cinta al tercio, 40, 45 y
50 % contra las manos abiertas en los lienzos de pie), `medir-borde-lejano.ts` (los 54
vértices y el borde del delta proyectados con `ojoYMira` al salir y a 82°, en todos
los rumbos) y `medir-sacar-el-vertice.ts` (cuántos grados y cuántos puntos de
arrastre sacan el vértice de debajo de 44 y de 88). Donde un número de aquí viene del
0,13 se dice; los del 0,14 son los que valen. Lo que se afirma en este documento se convierte en comprobaciones de
`verify:escena` en la fase 1: el guion de la sesión se tira, el comprobador se queda.

## 10. Lo que NO entra, las decisiones abiertas con dueño, y las dudas para Miguel

**No entra:** texto de ninguna clase dentro del lienzo; sombras proyectadas (el móvil
no las tiene y la barra nunca las tuvo); sonido; física de verdad en los dados (la
caída es una curva, no una simulación: todos los aparatos tienen que terminar en el
mismo par en el mismo instante); una mesa distinta por tema o por colono; guardar el
estado de recogida; tocar `camara.ts`, `baraja.ts` ni las constantes de `cartas.ts`;
el respaldo SVG; la pantalla del vestíbulo; y ninguna regla nueva —qué se puede tirar
y cuándo lo sigue diciendo la lista de opciones—.

**Decisiones abiertas con dueño** (no son de Miguel: las cierra quien haga la fase, con
lo que aquí se dice):

| Qué | Lo que hay decidido | Quién la cierra |
|---|---|---|
| La Z del borde delantero de la tapa | `−(−cota / tan(campo/2))`: donde cruza el canto de abajo (−1,649 en apaisado). Si en el banco la madera se ve corta por delante, se alarga hacia la cámara, nunca hacia atrás | Fase 2, en `banco3d.html` |
| Dados en los lienzos de pie | Regla de los tres peldaños del §4.4: 390 de ancho sí, 360 y 320 no. Si la app un día pinta el delta de pie en 360 de ancho, no hay dados y TIRAR está en la cinta | Fase 3, medido por `verify:escena` |
| Una carta cogida cuando la mesa sale sola | No sale: espera a que se suelte (§6). La alternativa —soltar y sacar— rompe el gesto | Fase 4 |
| Cuándo la frase pasa a dos líneas dentro de los 44 y cuándo a puntos suspensivos | La frase no hace crecer la cinta (§2.2): dos líneas de 17 caben en 44. El hueco está medido (`ancho/3 − 88`: 101–552 puntos apaisado; 40–219 de pie al 40 %); el ancho del texto con la fuente de la casa no se mide en Node | Fase 5, en el banco, y se dejan escritos la letra, el interlineado y el número |
| La línea de botones sobre el vértice lejano | Bajo la primera línea, en el tercio central; tapa el vértice más lejano en los teléfonos apaisados al salir (63–84 puntos) y se saca con 7–37 puntos de arrastre (§2.2). La alternativa medida es a la derecha del tercio, en los 155 (SE) – 240 (iPhone 14) puntos de aire hasta la mano de bienes | Fase 5, en el banco; si se mueve, se vuelve a medir contra la mano de bienes abierta |
| La coexistencia de los dos bloqueos de orientación | No coexisten (`LOS_QUE_PINTA` pinta un arcade), los dos vuelven por `volverAlRetrato()`, y se prueba entrando y saliendo en el aparato | Fase 6 |

**Dudas que sólo puede resolver él.** Cada una con sus dos opciones y lo que cuesta cada
una; el resto del documento vale con cualquiera de las dos donde se ha podido:

1. **Dos dados o uno.** (a) Dos dados con puntos que suman la tirada: sin glifos
   nuevos, 444 triángulos, y la máquina del §5.3 tal cual. (b) Un dado con la cifra
   grande: hay que compilar el 0, el 1 y el 7 (unos 60 triángulos y una llamada cada
   uno), el objeto ya no es un dado, y `repartoDeLaTirada` devuelve la suma. La máquina
   es la misma.
2. **El marcador.** (a) En el cajón, a un toque, con el turno y el mazo visibles dentro
   del lienzo (tapete y pila): la cinta se queda en una línea. (b) Fichas de 44 puntos
   —raíl de color y puntos, sin nombre— en una línea más de la cinta: cinco fichas
   piden 244 puntos, que caben en el tercio central de un iPhone 14 (281), de un
   Android de 360 (260) y de un Pro Max (311), y NO en el SE (189); y con botones
   sueltos son tres líneas, 132 puntos, que tapan el borde del delta en todos los
   teléfonos apaisados (61–82).
3. **La cabecera de la Sala en la web.** (a) Se queda: una línea, es la navegación del
   sitio, el lienzo mide `100vh` menos eso. (b) Pantalla completa de navegador con su
   botón: el lienzo gana la línea y se pierde la navegación hasta salir.
4. **La pantalla encendida en la app durante toda la partida.** (a) Sí: un dado que
   vibra en una pantalla apagada no avisa; es batería. (b) No: la pantalla se apaga
   con el plazo del sistema y el aviso del turno lo da el sondeo al despertar.
5. **Los posavasos hexagonales.** (a) Se quedan sobre la madera: llevan el «apagada»
   (opacidad 0,3) y el «tomada» (verde). (b) Sólo la sombra de contacto: 96 triángulos
   menos y hay que llevar «apagada» a otro sitio (el modelo atenuado).
6. **El tamaño de los dados en su teléfono.** (a) Los dos en un hueco: 23–25 puntos
   cada uno en un iPhone corriente, 20,6 en el SE. (b) Un hueco por dado, seis huecos:
   0,62 lados, 34 puntos por dado en un iPhone 14 y 28 en el SE; de pie, seis huecos
   no llegan al suelo de 44 en ningún lienzo de móvil y ahí no habría dados. Se decide
   viéndolos.
7. **La mesa se saca sola cuando pasa a tocarle.** (a) Sí, salvo con una carta en la
   mano (§6). (b) Se queda como la dejó, y el aviso de la cinta es lo que dice que le
   toca.

## 11. El orden, en fases que se empujan una a una

Miguel juega mañana con lo que hay. Cada fase deja el juego entero y verde; ninguna
depende de la siguiente.

1. **La aritmética.** `PARTE_DEL_ALTO` a 0,14; `huecosDeLaMesa` con sus tres peldaños;
   `selloDeLaTirada`, `repartoDeLaTirada` y `faseDeLosDados` con `rechazado`;
   `vetaDelTablon`; los lienzos apaisados y 768×1024 y las comprobaciones nuevas en
   `verify:escena`; la línea de «tres y cuatro miden lo mismo» reescrita para exigir
   sólo el suelo. Y los comentarios que el 0,14 y los dados dejan falsos, reescritos
   con lo que hay EN ESTA FASE: la cabecera de `ANCHO_MAXIMO` en `barra.ts` («en el
   más bajo (320×360) sigue mandando el alto»: ya no); en `cartas.ts` la cabecera
   (línea 26, «el techo de la barra NUNCA pasa de −0,2475·alto») y la nota de
   `PISO_DE_LA_FRANJA` (línea 408), que en esta fase siguen midiendo la PLACA, que
   sigue ahí, y pasan a decir `−0,240·alto` (el 26,0 %, holgura 0,040; §1.2) —del
   asa y del naipe no se habla hasta que la placa se vaya, en la fase 2—; y en
   `riberas-en-tres.ts` los dos comentarios de `comprada` (51–53 y 170–175), que
   dejan de decir que `turnosAbiertos` no está escrito y pasan a decir que la
   salvaguarda es que `comprada` no lo esté (§1.3). La comprobación «la mano del mazo
   no invade la zona de la barra» se queda como está en esta fase: la placa sigue.
   Lo visible: el hueco un 8 % mayor y, en 320×360, la barra un poco más ancha.
2. **La mesa de madera.** El tablón horizontal sustituye a la placa; sombras de
   contacto; tapete del turno; tope de triángulos. Y el orden de dibujo del §4.1, en
   el mismo empujón que la tapa, porque sin él la tapa opaca esconde los pies de las
   cartas de bienes: `renderOrder` en los `<group>` de `Baraja` y `ManoDelMazo`, el
   testigo de la barra a −1, la cabecera de `ORDEN_DE_LA_BARRA` y el comentario de la
   carta reescritos, y en `verify:escena` el texto que afirma los tres grupos. Con la
   placa fuera, «la mano del mazo no invade la zona de la barra» pasa a medir
   `hueco.y + 0,52·lado` en los huecos de las piezas y en el de los dados, y las dos
   frases de `cartas.ts` pasan a hablar del asa y del bote (`−0,273·alto`, §1.2). Sin
   dados: se sigue tirando con el botón. Se mira en el banco `escritorio/banco3d.html`
   (entrada `escritorio3d` de `launch.json`) antes de empujar: la Z del borde
   delantero, la junta entre tablones, el contraste 1,60:1 y que los pies de las
   cartas de bienes se vean sobre la madera son decisiones que un comprobador no
   puede juzgar.
3. **Los dados.** `Dados` en la escena, con `disponible` como única llave del toque y
   de la vibración; `dadosEnTres` (`null` fuera de `jugando`) y
   `opcionesFueraDeLaMesa` en `shared/`; `mover` devolviendo su resultado en las dos
   `mesa.ts` con el `return` temprano resuelto a `'rechazado'` y el `switch`
   exhaustivo en la pantalla (§5.3); la acción accesible; y el botón TIRAR se cae de la
   cinta donde hay dados. Primero en el escritorio, que es donde el delta se ve hoy.
4. **Recoger la mesa.** El botón, la bajada, `soltarTodo`, la vuelta sola al tocarme
   con la espera si hay una carta cogida.
5. **Pantalla completa en el escritorio.** La cinta del tercio central (y del 40 % de
   pie) con `anchoDeLaCinta` en `escenas/cinta.ts`, el cajón con el marcador (chozas y
   torres), el lienzo a toda la altura, la letra y el interlineado con que la frase
   cabe a dos líneas en 44 y el ancho al que se recorta, medidos en el banco y
   escritos; y dónde va la línea de botones (§10). En `verify:escena`, dos
   comprobaciones nuevas: que al mirador de salida ningún vértice de los 54 cae bajo
   la cinta (a menos de 44 puntos del canto de arriba dentro de la banda de la cinta)
   en ninguno de los lienzos, con la cámara de verdad (`ojoYMira` sobre
   `ojoDelMirador`, sin acercar) y recorriendo el rumbo entero —hoy el peor es el SE,
   63—; y que la cinta, con el ancho que devuelve `anchoDeLaCinta`, deja al menos 15
   puntos hasta la carta de arriba de cada mano abierta en todos los lienzos (hoy
   15,6 en 390×845). El caso de 82° se deja escrito en el comprobador como dato, no
   como exigencia: la tableta 4:3 a 26 puntos es la cámara en su tope, y se sale con
   47 de arrastre.
6. **Apaisado y pantalla completa en la app.** `usarApaisado` y `volverAlRetrato()` en
   los dos ganchos, la barra de estado, el cartel, la cinta en React Native, la
   pantalla encendida. Esta fase espera a que el atlas nativo del tablero entre en
   `main` y el delta se vea en un teléfono real (`EL_DELTA_SE_VE_AQUI` ya no existe:
   el otro encargo lo ha borrado, y con él la decisión por plataforma); hasta
   entonces no hay nada que girar. Y se prueba EN EL APARATO, en las dos plataformas,
   antes de empujar: entrar (la pantalla gira a apaisado y `lockAsync(LANDSCAPE)` no
   lanza `UnsupportedOrientationLockException`), girar el teléfono en las dos manos
   (la escena no vuelve a retrato), salir (el vestíbulo está en retrato y NO gira al
   ladear el aparato), y lo mismo con un juego local de `usarElAparatoQuieto`
   (entrar, salir, ladear: el vestíbulo quieto).
7. **La pila del mazo.** El naipe del cuarto hueco con su grosor. Es un adorno medido y
   va el último por eso.
