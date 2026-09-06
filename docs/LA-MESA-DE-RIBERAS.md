# La mesa de Riberas

> Si algo de aquí no coincide con el código, gana el código. Este documento recoge
> las decisiones y su porqué. Se escribió el 5 de septiembre de 2026, sobre la rama
> `lobby-catan`, a partir de lo que Miguel pidió por escrito: ver el juego en pantalla
> completa, una mesa de madera abajo con las piezas encima, un dado que vibra y se
> tira tocándolo, y poder recoger la mesa. Es la novena versión. Las ocho anteriores,
> en una línea cada una: la primera pasó por una revisión adversaria que volvió a medir
> cada número con el código real; la segunda por otra que leyó el orden de dibujo con
> el ordenador de `three` de verdad, buscó quién apagaba los dados fuera de turno y
> proyectó los 54 vértices con la cámara inclinada; la tercera metió en ese ordenador
> el árbol de `delta.tsx` con sus grupos anidados tal como están; la cuarta montó
> encima lo que la fase 2 añade; la quinta recogió las siete decisiones que Miguel
> tomó la noche del 5 de septiembre (están en el §1, cada una con su porqué y sus
> consecuencias medidas); la sexta hizo salir de su guion los puntos del cajón
> (§1.11) y recogió el D6 de KayKit Board Game Bits como malla de los dados (§5.1);
> la séptima fue la primera escrita con la fase 2 aterrizada (`4287809`: la mesa de
> madera), donde se descubrió que los dos «testigos» de borrado de profundidad nunca
> corrieron y que la tapa tenía que PARAR el toque (§4.1); y la octava fue la primera
> escrita con la fase 3 aterrizada (`b216fbc`), y contó lo que la fase 3 hizo distinto
> de lo decidido y por qué.
>
> La octava se escribió CON LA FASE 3 ATERRIZADA (commit `b216fbc`: los dos dados
> del pack sobre la mesa, con su máquina y su compilador; la fase 1 lo estaba en
> `8371080` y la fase 2 en `4287809`). La regla es la misma que en la séptima: donde
> la fase 3 hizo otra cosa que la que aquí se había decidido, gana el código, y el
> documento cuenta lo que hay y por qué cambió. Lo que la fase 3 cambió respecto de la
> séptima versión, en corto: el pack Board Game Bits está en el disco y MEDIDO, y el
> D6_A lleva los puntos como geometría, así que la ruta que la séptima daba por menos
> probable (hornear a vértice) es la que se tomó, con un paso más que nadie había
> escrito: los dos colores se REMAPEAN a los de las fichas del tablero, y la cara que
> enseña cada valor se MIDE contando puntos y se escribe en un fichero generado (§5.1);
> el D6 cuesta 662 triángulos por dado, más del techo de 287 que la séptima fijaba,
> y el presupuesto se rehízo con esa cuenta (`12 · seg + 1.470`, tope 4.500; §1.10,
> §7); el quinto hueco ya NO es cuadrado, porque el par de 1,12 lados no cabía en él:
> reserva el ancho del par y crece hacia la izquierda (§4.4); el `switch` exhaustivo
> de la respuesta de `mover` vive en la escena y no en las pantallas (§5.3); rodar
> parte de la última pose real del dado y no del par recalculado con el sello nuevo
> (§5.2); el botón de apoyo del escritorio existe mientras existen los dados y se apaga
> con `aria-disabled`, nunca con `disabled` (§1.4); y el mecanismo de carga de
> `dados.glb` con el que la séptima se contradecía está escrito con los nombres del
> código (§5.1). Los siete hallazgos que la séptima revisión dejó abiertos quedaron
> cerrados en ella: los dos graves (el mecanismo de `dados.glb`, §5.1 y §8; la fase 1
> contada como pendiente cuando estaba hecha, §11) y los cinco menores (§4.2, §4.1 dos
> veces, §4.4 y el comentario de `tapaDeLaMesa`, que sigue diciendo «unos 2,3» y queda
> apuntado para la fase 4, §11). Ningún número de aquí es una opinión: cada uno sale
> de un guion de medida corrido sobre `huecosDeLaBarra`, `huecosDeLaMesa`,
> `huecosDeLaBaraja`, `huecosDeLasCartas`, `franjaDeLasCartas`, `tapaDeLaMesa`,
> `ojoDelMirador`, `ojoYMira`, `WebGLRenderLists` con la poda por frustum,
> `revoltijo`, `fbm`, el atlas del pack y el propio `D6_A.gltf`, o de un comprobador
> que se nombra, o de una línea del código citada con su fichero. Los guiones se listan
> en el §9. Las líneas que se citan son las del commit `b216fbc` (§8).
>
> Esta novena es la pasada de medida que la revisión de la octava pidió, y no cambia
> ninguna decisión: una docena larga de citas de línea seguían en las posiciones de
> `4287809` (`delta.tsx` corrido unas 31 líneas; las dos `mesa.ts` y `shared`, unas 16
> y 36) y se han vuelto a medir contra `b216fbc`, y para que no vuelva a pasar hay un
> guion que saca TODAS las citas del documento y las coteja con el código
> (`comprobar-citas-de-linea.ts`, §9); el peso de `dados.glb` es 19.812 bytes, no
> 19.476 (§5.1); no existe un `D6_C.gltf` sin color, y los cuatro `D6_C_*` se midieron
> con el horno de verdad: los cuatro se niegan, por tres ramas del compilador (§5.1); lo
> más alto que baja al recoger la mesa es el asa, no el naipe (§6); y la fase 4 lleva
> los nombres del escritorio, que no son los de la app: `cogida` y `cartaDelMazo`, y
> sin `soltarTodo` (§6, §8, §11).

## 0. Qué hay hoy, y qué se pierde al quitar los paneles

La partida en tres dimensiones vive en `escenas/delta.tsx` y la montan dos pantallas:
`escritorio/src/riberas-en-tres.tsx` y `app/src/arcade/riberas-en-tres-escena.tsx`.
Lo que hoy rodea al lienzo, y que Miguel llama «los menús en negro y violeta», es
esto, con nombre y fichero:

| Qué | Escritorio | App |
|---|---|---|
| El código de la mesa, quién está sentado, salir, tirar la mesa | `LaFicha` y los dos botones del `<aside class="rail">` de `sala.tsx` (22 rem, `tablero-y-panel`) | `BarraDeLaMesa` de `tablero-en-linea.tsx`, con `paddingTop: arriba + 14` |
| De quién es el turno | (dentro de `LaFicha`) | `LineaDelTurno` |
| La frase del juego («Te toca: tira los dados.», «Turno de Ana: está por tirar.») | `<p class="aviso-del-tablero">` ENCIMA del recuadro del lienzo, en flujo —un párrafo con margen, `riberas-en-tres.tsx` 1253 y `estilo.css` 1603, no un vidrio sobre la escena—, texto de `avisoDe` en `riberas.ts` (4174–4193) | el mismo `aviso` dentro del retablo; en la rama del delta no se pinta hoy |
| El marcador: puntos, cartas, guardias, el Vado con su largo, la Guardia, títulos, el mazo que queda | `MarcadorDeRiberas` en el raíl | `ElMarcador`, una cinta horizontal de `FichaDelColono` entre el aviso y el lienzo |
| Tirar, pasar, aceptar, rechazar, contestar, empezar | `<Formulario>` bajo el lienzo, con `opcionesFueraDeLaMesa(opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(o)), mazo), dados)` (`riberas-en-tres.tsx` 845 y 955; desde la fase 3 TIRAR se cae donde hay dados, §1.4) | `LasOpciones` en el `ScrollView` del pie, misma composición (`riberas-en-tres-escena.tsx` 752 y 779) |
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

Las diez primeras son de las cuatro vueltas anteriores. Las siete dudas que el §10 le
hacía a Miguel las cerró él la noche del 5 de septiembre de 2026: la primera (dos
dados o uno) está dentro de la decisión 3, y las otras seis son las decisiones 11 a
16, escritas con lo que cada una obliga a medir y con la medida hecha.

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
   de −0,2475·alto», hoy reescrita en 27–28 con −0,273) y la nota de `PISO_DE_LA_FRANJA`
   (líneas 411–413)—. Los de
   `cartas.ts` se reescriben DOS veces, porque miden contra lo que hay: en la fase 1 la
   placa sigue y su techo con 0,14 es `hueco.y + 0,75·lado = −0,240·alto` (el 26,0 %
   del alto desde abajo; holgura de 0,040 al piso de `−0,20`); en la fase 2 la placa se
   va y lo más alto de la mesa pasa a ser el ASA —la caja invisible de un lado, `hueco.y
   + 0,5·lado = −0,275·alto`, el 22,5 %— y, un pelo por encima, la pieza tomada en lo
   alto de su bote: `0,62·1,18/2 + 0,12 + 0,03 = 0,516` lados (el `crece` de 1,18 de
   `PiezaEnLaBarra`, `delta.tsx` 1175, y el bote de su `useFrame`), `−0,273·alto`, el 22,7 %, que asoma 0,7 puntos sobre el asa en 320 de
   alto y 2,4 en 1.080 (`medir-techos.ts`). NO el techo del naipe (0,31 lados, 19,8 %),
   que decía la segunda versión: el naipe está por debajo del asa. La holgura al piso de
   la mano del mazo queda en 0,073 del alto. Y el hueco de los dados no sube más: el dado
   —de 0,52 lados de arista desde la decisión 15— en lo alto de su salto llega a
   `cota + 0,52 + 0,20 = hueco.y + 0,24·lado`, el 24,0 %, por debajo del asa (0,5).

3. **Los dados son DOS, con puntos, y la suma la parte el cliente de forma
   determinista, sellada por TURNO.** (Era la duda 1; Miguel la cerró así: dos dados
   con puntos, y la suma del servidor repartida por turno, como está aquí.) El
   servidor sólo publica `ultimaTirada`, la suma
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
   `turnoDe` y `ultimaTirada`), sólo sube, y sube al pasar el turno (`riberas.ts` 2620), así
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
   SÓLO como sello de los dados y lo lee sólo `dadosEnTres` (`selloDeLaTirada`,
   `riberas-en-tres.ts` 1034: «es la ÚNICA lectura de `turnosAbiertos` de este fichero,
   y no se compara con nada»). La fase 1 (`8371080`) reescribió esos dos comentarios
   para que digan eso (hoy 51–57 y 177–190: la salvaguarda es que `comprada` no esté,
   no que `turnosAbiertos` no esté) en vez de dejarlos afirmando algo que la línea de
   abajo desmentía.

4. **El toque del dado manda `riberas:tirar` por la misma puerta que el botón, y el
   botón desaparece sólo donde hay dado.** Igual que `opcionesFueraDeLaBarra` quita
   COMPRAR cuando recibe un `mazo` que no es `null`, `opcionesFueraDeLaMesa` quita
   TIRAR cuando recibe unos `dados` que no son `null`. Y el ORDEN importa, y es el de
   `mazoEnLaBarra`: `dadosEnTres` recibe las opciones ENTERAS, antes de que
   `opcionesFueraDeLaMesa` las filtre; al revés, `porTirar` sería siempre falso y los
   dados no vibrarían nunca. En el retablo, en una mesa de más de cuatro, para un mirón
   y en los lienzos donde los dados no caben (§4.4) no hay dados y el botón se queda:
   es la regla de «cada movimiento se enseña exactamente una vez» (cabecera de
   `Formulario` en `riberas-en-tres.tsx`, línea 1377) aplicada sin dejar a nadie sin
   tirar. La entrada de la escena se llama `onPulsarLosDados`, no `onTirar`: en las
   dos pantallas `tirar` ya es TIRAR LA MESA (`mesa.tirar`). Y para quien juega con
   lector de pantalla, la acción sigue existiendo aunque el botón no se vea. Hecho en
   la fase 3 (`b216fbc`), y con una decisión que la séptima versión no tenía: la vista
   que envuelve el `Canvas` en la app, que ya llevaba `accessible` y su
   `accessibilityLabel` (`riberas-en-tres-escena.tsx` 1204–1205), declara
   `accessibilityActions={dados !== null ? [{ name: 'tirar', label: 'Tirar los dados' }]
   : undefined}` y un `onAccessibilityAction` que sólo manda si `dados.disponible`
   (1212–1215); y en el escritorio el recuadro `RECUADRO_DEL_LIENZO` lleva un botón
   `.riberas-solo-apoyo` «Tirar los dados» (`riberas-en-tres.tsx` 1278–1289; la regla
   de `estilo.css` lo saca de la vista con `clip-path: inset(50%)`, nunca con `display:
   none`, que los lectores saltan). Ese botón EXISTE MIENTRAS EXISTEN LOS DADOS
   (`dados !== null`), no sólo mientras se puede tirar, y se apaga con
   `aria-disabled={!dados.disponible}` y el `onClick` cortado, SIN `disabled` nativo.
   La vuelta 3b lo encontró: la primera escritura lo montaba con `dados.disponible`, y
   al pulsarlo `mover` pone `quieto`, `disponible` cae, el botón que tiene el foco se
   desmonta y el foco del lector cae al `body`. Y un `disabled` nativo es el mismo
   fallo por otra puerta: un botón `disabled` deja de ser enfocable y el navegador le
   quita el foco igual (la regla de recolocación del foco de HTML). `verify:escritorio`
   lo exige con dos comprobaciones («tirar sigue al alcance de las tecnologías de
   apoyo…» y «su existencia no depende de `disponible`: se monta con `dados !== null`,
   se apaga con `aria-disabled` y nunca lleva `disabled`»); la app no tiene el problema
   porque la acción vive en la vista del `Canvas`, que no se desmonta al tirar. Un dado
   que sólo se puede tocar con el dedo sería el primer movimiento del juego inaccesible.

5. **La animación espera al servidor, termina en SU número, y un rechazo la corta en
   el acto.** El cliente no sortea nada: al tocar, los dados ruedan sin objetivo;
   cuando la vista trae `tirado: true` con `ultimaTirada`, se asientan en el par de la
   decisión 3. Ruedan al menos 0,6 s aunque la respuesta llegue antes —la propia
   petición vuelve con la mesa entera, `mover` en `app/src/arcade/mesa.ts` 720 y en
   `escritorio/src/mesa.ts` 692, y suele tardar menos— y se asientan en 0,35 s más; si
   la vista tarda, siguen rodando hasta que llega (`medir-dado.ts`, tabla de llegadas
   a 0,2 / 0,6 / 1,4 / 3,0 s). Y los demás VEN la tirada: el suceso que arranca la
   animación no es «yo pulsé» sino «la vista cambió», así que la misma máquina corre
   en los cuatro aparatos con la vista que les trae el sondeo largo. Lo que la primera
   versión no tenía es el rechazo: un `riberas:tirar` rechazado —`rev` vieja, doble
   toque, pestaña sin el turno— vuelve como `200` con la misma mesa y el mismo `rev`, y
   las dos pantallas YA lo saben en el acto (`seIgnoro`, `escritorio/src/mesa.ts` 733,
   `app/src/arcade/mesa.ts` 797). Con sólo `tocado | vista | tic`, los dados rodarían
   6 s esperando una tirada que no va a llegar, y un doble toque es lo primero que va a
   pasar. Así que `mover` DEVUELVE lo que ya calcula —`'hecho' | 'rechazado' |
   'sin-red'`— (fase 1, `8371080`), la pantalla le devuelve esa promesa a la escena
   por `onPulsarLosDados`, y es la ESCENA quien la traduce a suceso con
   `sucesoDelResultado` (`escenas/dados.ts`: `hecho` no empuja nada; `rechazado` y
   `sin-red` empujan `rechazado`), no la pantalla, como decía la séptima (§5.3). Los
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
    tenía una cota, `TOPE_DEL_MAR` en `presupuesto-del-delta.ts`. Mesa, dados, asa,
    tapete, sombras y pila suman **2.622** triángulos con la tapa a 96 segmentos y
    **4.350** con la tapa a 240 (`verify:escena` lo construye con `three` y lo cuenta:
    «`triangulosDeLaMesa` es lo que pintan las geometrías de verdad…»): el 11,2 % y el
    18,6 % del mar. Es UN total, el mismo aquí y en la tabla del §7, y es lo que
    devuelve `triangulosDeLaMesa(segmentos) = 12 · segmentos + 1.470`, donde los dados
    entran por el MÁXIMO de sus dos cuentas (el D6 del pack, 1.324 los dos; el respaldo
    procedimental, 444; §5.1). `TOPE_DE_LA_MESA = 4_500`, y `verify:escena` lo cuenta y
    exige además que sea menos de la quinta parte del mar. Hasta la fase 3 eran
    `12 · seg + 590`, 1.742 a 3.470 y un tope de 3.600 con el respaldo: el D6 del pack
    cuesta 662 triángulos por dado, 880 más que el respaldo los dos, y el tope se rehízo
    con esa cuenta y no a ojo (4.350 a 240 segmentos, 150 de margen; la cabecera de la
    constante lo dice). Sin él, el día que alguien suba los segmentos para ver la veta
    más fina lo descubrirá en un móvil.

11. **El marcador va en el CAJÓN, no en la cinta, y el cajón está hecho para SEIS.**
    (Decisión 2 de Miguel.) La cinta se queda en una línea, y lo que se ve del marcador
    sin abrir nada son los dos datos medibles de dentro del lienzo (§2.2: el tapete del
    turno y el grosor de la pila) más UNO en la propia cinta: **mis puntos, siempre a la
    vista en la línea de estado.** El botón «≡» que abre el cajón deja de ser un
    icono y pasa a ser una ficha de 44×44 con mi raíl de color y mi cifra de `puntos`
    (los «a la vista»; el «+N» de lo oculto va dentro), con la etiqueta «Marcador: N
    puntos a la vista. Abre el marcador completo»; para un mirón sin color es «≡» a
    secas. No cuesta ni un punto de ancho a la frase: el hueco de `ancho/3 − 88` del
    §2.2 no cambia.

    El cajón mide LO QUE LA CINTA —`anchoDeLaCinta(ancho, alto)`: el tercio en apaisado,
    el 40 % de pie— y cuelga de ella hasta el canto de abajo menos el inset de abajo.
    Por eso el cajón abierto no toca el tercio de ninguna de las dos manos: su aire a
    la carta más cercana es el MISMO que el de la cinta, porque las manos se extienden
    en `x` igual arriba que abajo —138 y 155 puntos en el SE, 202 y 221 en un Android
    de 360, 219 y 240 en un iPhone 14, 15,6 y 26,5 en 390×845 de pie (`medir-cajon.ts`,
    §2, las mismas cifras que `medir-cinta-central.ts`)—. Lo que SÍ hay debajo del
    tercio central abajo es la barra: el cajón abierto se pone sobre ella (los dos
    huecos centrales enteros en todos los lienzos; los cuatro enteros en 780×360,
    844×390, 932×430 y 1920×900; de los dos extremos, el 75 % en el SE, el 76 % en el
    SE 2 y en el monitor a 1080, el 23 % en la tableta 4:3, el 35 % en el iPad y el 7 %
    en la tableta de 768×640) y no sobre los dados colgados, que quedan fuera de él en
    todos los apaisados (0 % tapados; `revisar-cajon-sobre-la-barra.ts`, vuelto a correr
    para esta versión: la sexta decía «el 75 % en el SE y en el monitor», y el monitor
    da 76). Es un cajón MODAL, y modal quiere decir esto: se abre para leer y se cierra
    para jugar; con él abierto no se construye, no se coge una carta ni se tira, y **un
    toque fuera de él SÓLO lo cierra**, sin pasar a nada de lo que haya debajo (ni a las
    cartas, ni a la barra, ni al tablero). Se cierra también tocando la ficha de mis
    puntos otra vez, y mientras está abierto es modal para el lector
    (`accessibilityViewIsModal`, como `HojaDeAQuien`).

    Dentro, en este orden, y cada renglón mide **44 puntos**: el marcador —una ficha por
    colono sentado, hasta seis, en el orden del marcador del juego, la mía con el
    fondo de `fichaMia`—; la línea de la mesa —el código en acento y «Quedan N cartas
    en el mazo»—; la línea de botones —levantarse, tirar la mesa—; y la crónica, que
    crece lo que haga falta. Lo fijo con seis colonos son **352 puntos** (264 + 44 + 44),
    y el cajón se desplaza en vertical (`ScrollView` en la app, `overflow-y: auto` en
    el escritorio) cuando no cabe. La ficha de 44 son: el raíl de 4 (el `fichaRail` de
    hoy), dos renglones de 13 px a 17 de interlineado —el nombre, y «vado L · N chozas
    · M torres», recortados con puntos suspensivos—, y a la derecha los puntos a
    17 px con el «+N» tenue en la mía; lo que se oye es la frase entera de
    `FichaDelColono` más «N chozas y M torres», palabra por palabra. Lo que hoy pinta
    `FichaDelColono` en cuatro renglones de 13 no cabe seis veces en 276 puntos, y por
    eso la ficha del cajón es esta y no aquélla; cartas, guardias y títulos se oyen y
    están en la frase, no en el renglón. Medido en cada lienzo de la lista, con el
    inset de abajo de los aparatos que lo tienen (el indicador de inicio: 21 en los
    iPhone con muesca apaisados, 20 en el iPad; `medir-cajon.ts`, §1). Ese inset de
    abajo y la muesca lateral son DOS datos y en este documento llevan dos nombres: el
    «inset de abajo» (21/21/20) resta alto al cajón y entra en el comprobador; la
    «muesca» (24 en el Android con recorte, 47 en el iPhone 14, 59 en el Pro Max;
    `medir-dados-por-lienzo.ts`) resta ancho útil a los dados colgados (§3, §4.4) y no
    entra, porque la escena no la conoce y no debe (§4.4):

    | Lienzo | Cajón (ancho × alto útil) | Lo fijo (352) | Lo que se ve al abrirlo |
    |---|---|---|---|
    | 568×320 (SE apaisado) | 189 × 276 | 76 fuera | **las seis fichas enteras** y 12 pt de la línea de la mesa |
    | 667×375 (SE 2/3) | 222 × 331 | 21 fuera | las seis, la línea de la mesa y 23 pt de los botones |
    | 780×360 (Android) | 260 × 316 | 36 fuera | las seis, la línea de la mesa y 8 pt de los botones |
    | 844×390 (iPhone 14, inset de abajo 21) | 281 × 325 | 27 fuera | las seis, la línea de la mesa y 17 pt de los botones |
    | 932×430 (Pro Max, inset de abajo 21) | 311 × 365 | cabe | todo lo fijo y 13 pt de crónica |
    | 1024×768 (tableta) | 341 × 724 | cabe | todo lo fijo y 372 pt de crónica |
    | 1180×820 (iPad, inset de abajo 20) | 393 × 756 | cabe | todo lo fijo y 404 pt de crónica |
    | 1920×1080 y 1920×900 | 640 × 1036 / 856 | cabe | todo lo fijo y 684 / 504 pt de crónica |
    | 320×360 (de pie) | 128 × 316 | 36 fuera | las seis, la línea de la mesa y 8 pt de los botones |
    | 360×490 / 390×490 | 144 / 156 × 446 | cabe | todo lo fijo y 94 pt de crónica |
    | 390×845 | 156 × 801 | cabe | todo lo fijo y 449 pt de crónica |
    | 768×640 / 768×1024 | 256 × 596 / 307 × 980 | cabe | todo lo fijo y 244 / 628 pt de crónica |

    O sea: en los apaisados de 320 y 360 de alto (y en el iPhone 14 con su inset de
    abajo, y en el SE 2) el cajón entero NO cabe y se desplaza, pero **las seis fichas
    caben enteras en todos los lienzos de la lista** —el peor es el SE, 264 de 276, con
    12 puntos de la línea siguiente asomando, que es la señal de que hay más abajo—.
    Por eso el marcador va el primero y no el código de la mesa: lo que se abre para
    mirar es el marcador; el código se dicta una vez al empezar. Con menos de seis, el
    marcador mide `N · 44` y lo demás sube.

    **Lo que cabe en cada renglón, y qué se recorta.** Lo fijo de la ficha en
    horizontal son 58 puntos (el raíl de 4, el relleno de 2×10, los puntos a la derecha
    a 17 px con su «+N», unos 26, y 8 de aire), así que a los dos renglones les quedan
    **131 puntos en el SE** (189 − 58) y **70 en el 320×360 de pie** (128 − 58): 17 y 9
    letras de nombre a 13 px, 164 en el SE 2, 202 en un Android de 360, 223 en un
    iPhone 14, 283 en la tableta (`medir-cajon.ts`, §3; el §3 anterior de ese guion
    sumaba 86 de fijo porque ponía las chozas AL LADO del nombre, y daba 103 y 42, que
    no eran los de esta ficha). El nombre no es lo que se recorta: un nombre de la Sala
    cabe en 17 letras en cualquier apaisado. Lo que se recorta es el **SEGUNDO
    renglón**: lo más largo que puede salir, «vado 12 · 5 chozas · 4 torres» (cinco
    chozas, cuatro torres y un vado de dos cifras), mide unos **170 px** a 13 px con
    los anchos medios de una sans (`medir-cajon.ts`, §4), cabe entero desde el Android
    de 360 (202) y en todos los apaisados de ahí arriba, y se corta en el SE («vado 12
    · 5 chozas ·…»), en el SE 2 («vado 12 · 5 chozas · 4 tor…») y en los teléfonos de
    pie («vado 12 ·…» en 320×360, «vado 12 · 5 cho…» en 390 de ancho; la tableta de pie,
    768×1024, tiene 249 y cabe). Por eso **el vado va el PRIMERO**, y no las chozas como
    decía la quinta versión: es el dato que cambia de mano y el único de los tres que
    el tablero no enseña sin contar veredas (las chozas
    y las torres están en el delta con el color de su colono, y la torre es la pieza
    más grande), así que donde el renglón se corta lo que se pierde es lo que ya se ve.
    Con las chozas primero, el SE enseñaba «5 chozas · 4 torres ·…» y el vado no se veía
    nunca en los dos lienzos más pequeños. Se midió también partirlo en tres renglones
    de 13 (`medir-cajon.ts`, §5: 3 · 13 = 39, 5 de aire), que en el SE enseñaría «5
    chozas · 4 torres» y «vado 12» enteros, y se descarta: es interlineado 1,0 contra
    los 17 de la casa, y en los teléfonos de pie se corta igual (70–98 puntos para
    114). De pie es la forma secundaria (§2.2) y ahí el renglón queda en «vado 12 ·…»,
    que es el dato que importa; la frase entera se oye. El ancho exacto con la fuente
    de la casa, y a qué largo se recorta cada nombre, se miden en el banco (fase 5) y
    se dejan escritos; lo
    que se decide aquí es el orden y lo que se sacrifica. Es la misma ficha en la app y
    en el escritorio: el raíl del escritorio pasa a ser este cajón, con sus tres
    secciones en este orden y `MarcadorDeRiberas` pintando la ficha de 44 en vez de sus
    renglones de hoy.

12. **En la web SE QUEDA la cabecera de la Sala.** (Decisión 3.) Es una línea y es la
    navegación del sitio; nada de pantalla completa de navegador por ahora, ni botón
    para pedirla. Y el alto de la cabecera NO se escribe en ningún sitio, porque hoy
    no lo tiene: `.cabecera` (`estilo.css` 458–466) es un `flex` con `flex-wrap: wrap`,
    `gap: 1rem` y `padding: 1rem clamp(1rem, 4vw, 2.5rem)`, sin `height`, sin
    `min-height` y sin variable; lo que mide depende de la letra y de si el título y
    los enlaces caben en una fila o se parten en dos. La quinta versión decía
    «`calc(100vh − alto de la cabecera)` leído de una variable», y esa variable no
    existe: habría que fijarle un alto (y con él romper el `flex-wrap`, o dejar un
    hueco cuando se parte) y escribir el número dos veces. Se elige lo otro: **la página
    con el delta es una COLUMNA FLEX, y la cadena hasta el recuadro tiene CUATRO
    eslabones, no dos.** La sexta versión nombraba `.tablero-y-panel` y `.riberas-lienzo`
    y se dejaba uno en medio: `.riberas-lienzo` no cuelga de `.tablero-y-panel`, cuelga
    del `<div class="riberas-en-tres">` que `RiberasEnTres` pinta (`riberas-en-tres.tsx`
    1245), y ese `div` es hoy un `flex` en columna con `gap: 1rem` y `margin-bottom:
    1.5rem` (`estilo.css` 2101–2106); y `.tablero-y-panel` no es una columna flex sino
    un `grid` con `align-items: start` (1380–1385; una sola columna bajo 60 rem,
    1388–1392), y un `start` no estira a nadie. La cadena entera, con lo que cada
    eslabón lleva: `.sala` (ya mide `min-height: 100vh`, `estilo.css` 445, y envuelve la
    cabecera, `sala.tsx` 111–112) pasa con la clase modificadora del §2.1 a `display:
    flex; flex-direction: column` → `.tablero-y-panel` lleva `flex: 1; min-height: 0` y,
    como rejilla, `grid-template-rows: 1fr` para que su única fila mida lo que él (o
    deja de ser rejilla bajo esa clase) → `.riberas-en-tres` lleva `flex: 1;
    min-height: 0` y pierde el `margin-bottom` → `.riberas-lienzo` lleva `flex: 1;
    min-height: 0`. Un eslabón sin `min-height: 0` es un eslabón que crece con su
    contenido, y el lienzo empujaría la página. Y el `<p class="aviso-del-tablero">`
    que hoy va ENCIMA del recuadro, en flujo (`riberas-en-tres.tsx` 1253; `estilo.css`
    1603, con su margen), se va a la cinta (§2.2), para no restarle alto al lienzo. Los
    `62vh` y el `min-height: 420px` de hoy (`estilo.css` 2108–2112, y los `52vh` bajo 900
    px, 2351–2355) se van con la clase. `clientWidth/clientHeight` del recuadro
    (`riberas-en-tres.tsx` 545–546 y 702) siguen dando el lienzo real, que es lo que
    `huecosDeLaMesa` recibe. Consecuencia para las medidas: **los lienzos de la lista
    son lienzos, no ventanas**; una ventana de 1920×1080 con una cabecera que midiera
    48 px sería un lienzo de 1920×1032 (asa de 144,5 puntos, colgado, y todo lo demás
    igual). Ese 48 es ILUSTRATIVO, no medido: la cabecera se mide en el banco en la fase
    5, con la fuente de la casa y en una fila y en dos, y el comprobador mide lienzos,
    no ventanas.

13. **La pantalla se queda ENCENDIDA toda la partida en la app.** (Decisión 4.)
    `activateKeepAwakeAsync` al montar la rama del delta y `deactivateKeepAwake` al
    desmontarla, exactamente como hace el juego local (`local.ts` 378–381;
    `expo-keep-awake` ya es dependencia, `app/package.json` 35), en un gancho hermano
    de `usarApaisado` y con la misma condición: «se está pintando el delta». Un dado que
    vibra en una pantalla apagada no avisa a nadie. Es batería, y se acepta. En la web
    no se pide nada.

14. **Los POSAVASOS hexagonales se quedan sobre la madera, con su «apagada» y su
    «cogida», y de madera más oscura para que no parezcan pegatinas.** (Decisión 5.)
    La geometría no cambia: el cilindro de seis lados de `0,12 · lado` de alto (24
    triángulos), que desde la fase 2 se pinta con los tres números de `ZOCALO` de
    `barra.ts` (centro 0,42, alto 0,12, radio 0,5; `delta.tsx` 1222–1224 y 1352–1354) y
    no con números sueltos, porque la cota de la tapa sale de esos mismos tres
    (`cotaDeLaTapa`); la opacidad 0,3 apagada y 0,92 disponible, y el verde de
    `COLOR_DE_LA_SENAL` cuando está tomada. Lo que cambia es el color de reposo: era
    paja clara, `#c8b48a` (y `#f0e3c2` bajo el puntero), que sobre la placa oscura
    servía y sobre una tapa de `#94533f`–`#b97756` se lee como una pegatina. Es
    **`#683a2c`**, la celda oscura del atlas al 70 %: **1,60:1** contra la veta más oscura
    de la tapa y **2,62:1** contra la más clara (la misma cuenta de luminancia relativa
    que `medir-veta.ts`; `rev3-colores-y-ojo.ts`, sección c), del orden del contraste
    entre los dos colores de la madera (1,64:1 entre las dos celdas; 1,60:1 entre los
    extremos que la veta alcanza en la malla, §4.2): un trozo más oscuro de la misma
    madera, no otro material. Bajo el puntero, un paso más claro del mismo palo,
    **`#7e4736`** (al 85 %). La sexta versión decía `#683b2e` y `#7f4837` porque los
    calculaba desde `#955541`, y la celda oscura leída del atlas es `#94533f`: gana el
    atlas. Por eso los dos no son hexadecimales en `delta.tsx`: salen de
    `coloresDelPosavasos()` en `mesa.ts` (`POSAVASOS_SOBRE_LA_MADERA_OSCURA = { reposo:
    0,7, encima: 0,85 }` sobre la celda oscura, canal a canal), de modo que si el pack
    cambiara su atlas el posavasos cambiaría con la tapa, y `verify:escena` mide el
    contraste con el mismo número que se pinta: más oscuro que la veta más oscura, al
    menos 1,5:1 contra ella, y el «encima» entre el reposo y la veta. El hueco de los
    dados no lleva posavasos (§5.2). Hecho en la fase 2 (`4287809`); si en el banco se
    quisiera otro tono, se cambia el factor, no el color.

15. **SIN MODELO DE TELÉFONO CONCRETO: «vale en cualquier teléfono moderno», o sea que
    el suelo de 44 puntos y el tamaño mínimo legible de los dados se EXIGEN en todos
    los lienzos de la lista, y donde no quepan decide la regla de los tres peldaños.**
    (Decisión 6.) El suelo del toque ya estaba (44, §1.2). El mínimo legible del dado
    hay que escribirlo, y se escribe con una medida de la casa: **el punto del dado no
    baja de 4 puntos** —el grosor del raíl de color de `FichaDelColono` (`fichaRail:
    { width: 4 }`, `riberas-en-tres-escena.tsx` 2022), la marca más fina que la Sala
    pide leer a distancia de brazo— y como el punto mide el 18 % de la arista, **la
    arista no baja de 22 puntos**. Con la arista de 0,46 lados de la cuarta vuelta el SE
    daba 20,6 puntos de dado y 3,7 de punto: bajo el mínimo con el asa en regla. El asa
    tiene aire de sobra —1,6 lados para un par que ocupaba 1,0—, así que **la arista
    pasa a 0,52 lados**: el par mide `2 · 0,52 + 0,08 = 1,12` lados y deja 0,24 lados a
    cada lado del asa, exactamente `AIRE`. Con eso las dos exigencias caen en el mismo
    sitio: al asa mínima de 44 puntos el dado mide 22,9 y el punto 4,1. Lo que sale en
    cada lienzo de la lista (`medir-dados-por-lienzo.ts`):

    | Lienzo | Peldaño | Asa | Dado (arista) | Punto |
    |---|---|---|---|---|
    | 568×320 (SE apaisado, el peor apaisado) | colgado | 44,8 | **23,3** | **4,2** |
    | 667×375 (SE 2/3) | colgado | 52,5 | 27,3 | 4,9 |
    | 780×360 (Android) | colgado | 50,4 | 26,2 | 4,7 |
    | 844×390 (iPhone 14) | colgado | 54,6 | 28,4 | 5,1 |
    | 932×430 (Pro Max) | colgado | 60,2 | 31,3 | 5,6 |
    | 1024×768 (tableta 4:3) | colgado (60 pt de margen al canto) | 107,5 | 55,9 | 10,1 |
    | 1180×820 (iPad) | colgado | 114,8 | 59,7 | 10,7 |
    | 1920×1080 / 1920×900 | colgado | 151,2 / 126,0 | 78,6 / 65,5 | 14,2 / 11,8 |
    | 768×640 / 768×1024 | quinto | 89,6 / 90,2 | 46,6 / 46,9 | 8,4 |
    | 390×490 / 390×845 (de pie) | quinto | 45,8 | 23,8 | 4,3 |
    | 360×490 (de pie) | **sin dados** (el quinto daría 42,3) | — | (22,0) | (4,0) |
    | 320×360 (de pie) | **sin dados** (el quinto daría 37,6) | — | (19,5) | (3,5) |

    Y dónde cambia el peldaño, que la regla del §4.4 decide caso a caso pero que aquí se
    puede decir en números: con el alto mandando, el colgado cabe cuando
    `ancho/alto ≥ 1,316` —el 4:3 de la tableta (1,333) es el más justo de la lista, y el
    768×640 (1,200) es el primero que pasa al quinto—; el asa colgada llega a 44 desde
    **315 puntos de alto** (557×314 da 43,96, aún bajo 44, y el guion lo marca «BAJO
    44»; 561×316 da 44,2; `medir-dados-por-lienzo.ts`, §4), así que cualquier teléfono
    apaisado de 320 o más va colgado y en regla; y de pie el quinto llega a 44 desde
    **375 puntos de ancho** (375×845 da 44,0), así que por debajo de eso —los 320 y 360
    de la lista— no hay dados y TIRAR está en la cinta. En ningún lienzo de la lista con
    dados baja el dado de 22 ni el punto de 4; `verify:escena` lo exige desde la fase 3
    con las mismas constantes que pintan (`ARISTA_DEL_DADO = 0,52`, `PUNTO_DEL_DADO =
    0,18`, `DADO_MINIMO = 22`, `PUNTO_MINIMO = 4`, todas en `escenas/dados.ts`; la
    comprobación «en ningún lienzo con sitio el dado baja de 22 puntos ni el punto de 4»
    exige además las cifras del SE y del 390 de pie y exactamente dos lienzos «sin
    dados», y otra afirma los umbrales 561×316 / 557×314 / 375×845 / 374×845). La
    columna «Asa» de la tabla es el ALTO del asa (el lado del reparto); su ancho es 1,6
    lados colgada y, desde la vuelta 3b de la fase 3, `ANCHO_DEL_PAR_DE_DADOS = 1,12`
    lados como quinto (51,3 pt en 390), porque con la arista de 0,52 el par ya no cabía
    en un quinto de un lado (§4.4). `ANCHO_DEL_PAR_DE_DADOS` vive en `escenas/dados.ts`
    junto a la arista y lo importa `barra.ts`. Lo que el 0,52 mueve en el resto del
    documento está movido: el techo del salto (§1.2, 0,24 lados), el centro del cubo
    (§5.1, `cota + 0,26`), los tamaños del §5.1, el ancho del quinto (§4.4) y los
    triángulos del respaldo, que no cambian (los puntos son los mismos 21 por dado; los
    del D6 del pack son 662 por dado, medidos, §5.1).

16. **La mesa recogida SALE SOLA cuando pasa a tocarme, salvo con una carta cogida.**
    (Decisión 7.) Como dice el §6: recoger es para mirar, y cuando hay que actuar la
    mesa vuelve; si la recojo en mi propio turno se queda hasta que yo diga; y si en el
    instante de salir hay una carta en la mano (`cogida` o `cogidaDelMazo` en la app;
    `cogida` o `cartaDelMazo` en el escritorio), la salida
    espera a que se suelte o se coloque, porque una mesa que sube debajo de un arrastre
    cambia lo que hay bajo el dedo a mitad de gesto. Deja de ser una decisión abierta de
    la fase 4: es ésta.

## 2. La pantalla completa

### 2.1. Qué se va y qué se queda

**Escritorio.** Cuando `RiberasEnTres` pinta el delta, `.tablero-y-panel` pasa a una
sola columna (una clase modificadora; hoy ya lo hace sola bajo 60 rem) y la página es
una columna flex en la que `.riberas-lienzo` se queda con lo que la cabecera deja, por
la cadena de CUATRO eslabones de la decisión 12: `.sala` (columna flex) →
`.tablero-y-panel` (`flex: 1; min-height: 0`, y una sola fila de `1fr`) →
`.riberas-en-tres` (`flex: 1; min-height: 0`, sin su `margin-bottom`) →
`.riberas-lienzo` (`flex: 1; min-height: 0`); la cabecera no tiene alto que restar. La
cabecera de la Sala se queda: es una línea y es la navegación del sitio. El raíl no
desaparece: se pliega en un cajón que se abre desde la cinta (§2.2) por encima de la
escena, con lo que ya tiene (`LaFicha`, `LaCronica`, levantarse, tirar la mesa) y con
el marcador el primero, en fichas de 44 hechas para seis (decisión 11). No se
reescribe su lógica; se cambia dónde está, el orden de sus tres secciones y el
renglón con que `MarcadorDeRiberas` pinta cada colono. El `<Formulario>` de abajo se va del flujo
y pasa a la cinta. El `<p class="aviso-del-tablero">` que va encima del recuadro
(`riberas-en-tres.tsx` 1253) pasa a la misma cinta: en flujo le resta alto al lienzo.

**App.** `BarraDeLaMesa`, `LineaDelTurno`, `ElAviso`, `ElMarcador` y el `ScrollView`
del pie salen del árbol en la rama del delta; el `Canvas` llena `estilos.todo`. La
barra de estado se oculta en esta pantalla (`expo-status-bar`, ya es dependencia),
así que el inset de arriba es cero y los que quedan son la MUESCA (los insets
laterales, que en apaisado caen a un lado) y el INSET DE ABAJO (el indicador de
inicio), leídos de `useSafeAreaInsets` como ya hace la pantalla (`bordes`); son los
dos datos con dos nombres del §1.11. La crónica se queda en el mismo cajón que en el
escritorio. El respaldo SVG no cambia ni un píxel: pantalla completa es sólo la rama
3D.

### 2.2. Cómo vuelve cada dato: la cinta del tercio central

Una **cinta de vidrio arriba, de 44 puntos de alto, que ocupa SÓLO el tercio central
del ancho** (`ancho / 3`, centrada; con la barra de estado oculta no toca ni la muesca,
que cae a un lado, ni el inset de abajo, que está en el otro canto). Por qué el tercio
y no el ancho entero está medido en
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
- **«≡»** (44×44), que desde la decisión 11 es **la ficha de mis puntos** —mi raíl de
  color y mi cifra, «≡» a secas para un mirón—: abre el cajón, que es donde vive lo que
  no cabe en 189 puntos, en el orden del §1.11 y con sus renglones de 44: primero el
  marcador, la ficha de 44 de cada colono (el raíl de color, el nombre, «vado L · N
  chozas · M torres», y los puntos a la derecha con el «+N» en tenue en la mía si
  `puntosConLoOculto` difiere de `puntos`); después la línea de la mesa, con el código
  en acento (lo único que se dicta por teléfono, cabecera de `BarraDeLaMesa`) y el
  mazo que queda con su número; después los botones, levantarse y tirar la mesa; y al
  final la crónica. Chozas y torres son números —`c.chozas.length` y
  `c.torres.length` de `ColonoVisto`, `riberas.ts` 3053–3054: contar es proyección de lo
  público, no una regla; los puentes no se cuentan, como pidió Miguel—. La ficha del
  cajón NO es `FichaDelColono` (sus cuatro renglones no caben seis veces, §1.11); lo
  que se hereda de `FichaDelColono` es la frase que se oye, palabra por palabra, más
  «N chozas y M torres». El cajón es el `HojaDeAQuien` de siempre en la app y el raíl
  de siempre en el escritorio.

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

La suma máxima es por tanto **88 puntos** (el marcador NO añade línea: va en el cajón,
decisión 11). A 88 la cinta sigue sin tocar ninguna carta (las manos no se acercan al
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

- **De quién es el turno:** un tapete bajo los dados del color de `turnoDe`, al 55 %
  (`OPACIDAD_DEL_TAPETE`). Dos triángulos, una llamada (`geometriaDelTapete`,
  `tablon.ts`). Hecho en la fase 2, con dos cosas que la sexta versión no decía: el
  color no es el `color` de la vista sino la celda del jugador del atlas, la misma que
  tiñe sus chozas (`colorDelColono`, `mesa.ts`: azul `#257ebc`, rojo `#d22227`, amarillo
  `#f9aa4e`, verde `#008454`; un color desconocido sale azul), y `turnoDe` llega a
  `<Delta>` desde `turnoEnTres(vista)` en `shared/`, compuesto una vez para las dos
  pantallas (§8). Hasta la fase 2 ninguna pantalla pasaba `turnoDe`, y el tapete sólo
  se veía en el banco. Desde la fase 3, con dados y `ultimaTirada = 0` (antes de la
  primera tirada) se apaga (§5.2); sin dados se pinta en cuanto hay color, porque sin
  dados la escena no sabe si se ha tirado.
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
  45,8 puntos de alto (y 51,3 de ancho, el par entero: §4.4); en 320×360 y 360×490 no
  los hay, las piezas se quedan en 47,5 y 53,4 puntos y TIRAR sigue en la cinta
  (`medir-quinto-y-suelo.ts`; `rev5-quinto-y-dado.ts` para la octava). El cartel no es una
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
  no avisa a nadie. Es batería, y Miguel lo aceptó: decisión 13 del §1.

## 4. La mesa de madera

### 4.1. Geometría: una tapa horizontal a la cota del zócalo

La primera versión inclinaba la tapa 22° hacia la cámara y afirmaba a la vez que «las
piezas no se mueven». No pueden ser verdad las dos: el asa mide 0,8 lados de fondo
(el `boxGeometry` de `PiezaEnLaBarra` y de `MazoEnLaBarra`, `delta.tsx` 1218 y 1348) y
el zócalo es un cilindro de 0,12 lados de alto (`ZOCALO.alto`, `barra.ts`); un plano a
22° sube `tan 22° · 0,4 = 0,162` lados a media profundidad del asa, más que el zócalo
entero. Se elige **(a): la tapa es horizontal, a la cota de la cara de abajo del
zócalo, y ninguna pieza se mueve un milímetro.** Está hecha en la fase 2 (`4287809`):
`tapaDeLaMesa(hueco, campo, proporcion)` en `mesa.ts` devuelve la cota, las dos Z, el
centro, el fondo y el ancho, y `Barra` la pinta con eso y con nada escrito a mano. Con
su Z, en coordenadas de la cámara (`medir-tapa-horizontal.ts` y, con la holgura de la
fase 2, `rev4-tapa-holgura.ts`):

- **La cota:** `cotaDeLaTapa(hueco) = hueco.y − (ZOCALO.centro + ZOCALO.alto / 2) · lado
  = hueco.y − 0,48 · lado` (`barra.ts`; el zócalo está centrado en `−0,42` y mide
  `0,12`, y los tres números viven ahí para que quien pinta el zócalo y quien calcula
  la cota lean los mismos). Con 0,14 cae a `−0,683` en todos los apaisados (el 8,8 % del
  alto desde abajo: 28,1 puntos en el SE, 34,2 en un iPhone 14, 94,8 en un monitor a
  1080) y a `−0,626..−0,676` en los lienzos de pie (9,2 %–12,2 %).
- **El borde trasero:** `z = −(2 + TRAS_EL_ZOCALO · lado)`, con `TRAS_EL_ZOCALO = 0,6`
  (`mesa.ts`): un décimo de lado de madera por detrás del zócalo (radio 0,5). En
  apaisado, `z = −2,139`.
- **El borde delantero:** donde la tapa cruza el canto de abajo de la pantalla,
  `cota / tan(campo/2) = −1,649` en todos los apaisados, MÁS
  `HOLGURA_DELANTERA_DE_LA_TAPA = 0,1` hacia la cámara: **`z = −1,549`**. La holgura es
  la decisión que el §10 dejaba abierta para el banco («si se ve corta por delante se
  alarga hacia la cámara, nunca hacia atrás») y la fase 2 la cerró con un décimo de
  unidad: el frente queda a 1,5 de la cámara (el plano cercano está en 0,5) y ni un
  redondeo del campo deja una línea de mundo bajo la madera en la última fila de
  píxeles. `verify:escena` afirma las dos cosas: que el frente SIN la holgura proyecta
  exactamente en `y = −1` y que CON ella proyecta por debajo. Es lo que hace que la
  mesa no flote: su frente queda FUERA del lienzo, como una mesa que se mira desde la
  silla, y por eso **no lleva canto** (la primera versión pintaba uno de 37 puntos). El
  fondo resultante es de **2,55 lados (0,59 unidades)** en los apaisados, no los 2,1 de
  la sexta versión ni los «unos 2,3» que dice el comentario de `tapaDeLaMesa`
  (`rev4-tapa-holgura.ts`; de pie llega a 5,8 lados en 390×845, porque ahí el lado es
  la mitad).
- **El ancho:** `ancho visible · (2 + 0,6 · lado) / 2`, porque el borde trasero está más
  lejos y la cámara ve más ancho ahí: factor 1,034–1,070 según el lienzo; se redondea a
  **1,08** (`ANCHO_DE_MAS_DE_LA_TAPA`) para que las esquinas traseras nunca asomen.
- **Lo que ocupa en pantalla:** de la tapa se ve, desde el canto de abajo, hasta el
  borde trasero proyectado: 36,7 puntos en el SE, 44,7 en un iPhone 14, 123,8 en un
  monitor a 1080 (el 11,5 % del alto en todos los apaisados, 11,7 %–13,5 % de pie; en
  el lienzo normalizado el borde trasero está en `y = −0,771` apaisado y en `−0,731` en
  390×845). Lo más alto de la mesa es el asa (el 22,5 % del alto) y la pieza tomada en
  lo alto de su bote (22,7 %; §1.2); el naipe se queda en el 19,8 %. La placa de
  `#0d1f1a` que sustituía medía 1,5 lados centrada en el hueco: del 5 % al 26 % del
  alto.
- **Lo que esconde del tablero, contado y ACEPTADO.** La sexta versión decía que «la
  mesa con las piezas encima tapa menos tablero que la placa» y no había contado
  sitios. Están contados con la cámara del mirador de salida (`ojoDelMirador`, sin
  acercar) sobre los 54 vértices, las 72 aristas y las 19 comarcas
  (`rev2-vertices-bajo-la-tapa-2.ts`): bajo el borde trasero de la tapa quedan **3
  vértices (2 con su anillo entero) y 5 aristas en los cinco teléfonos apaisados y en
  los dos monitores; 2 vértices y 3 aristas en la tableta 4:3 y en el iPad (2 y 1 en la
  tableta de 768×640); 0 de pie; y ninguna comarca en ningún lienzo.** A
  `ALTURA_MAXIMA` (82°), que es dato y no exigencia: hasta 4 vértices, 6 aristas y 2
  comarcas en los apaisados (4/5/2 en el SE; 4/6/2 en los demás teléfonos y en los
  monitores; 4/4/1 en la tableta 4:3 y 4/5/1 en el iPad; 2/3/0 en la tableta de
  768×640; 0 de pie; `rev2-vertices-bajo-la-tapa-2.ts`, vuelto a correr para la
  octava). Se aceptan por dos razones: se sacan arrastrando la cámara (la tapa
  no marca el suceso para la cámara, ver más abajo), y con la tapa parando el toque no
  se pulsan a ciegas. `verify:escena` los cuenta contra esas cifras escritas
  (`ACEPTADOS`), y si alguna sube es que la tapa creció hacia atrás (`TRAS_EL_ZOCALO`,
  `ANCHO_DE_MAS_DE_LA_TAPA`) o el mirador de salida bajó, y eso se decide, no se hereda.
  Es una decisión con dueño (§10): Miguel puede cambiarla viéndolo en el banco (subir
  el encuadre de salida), y entonces se cambian los números escritos, con su porqué.
- **Las cartas de bienes** pisan la tapa vista: sus pies quietos quedan a 33,3 puntos
  del canto en el SE, a 40,6 en un iPhone 14 y a 112,3 en un monitor, entre 3 y 12
  puntos por debajo del borde trasero de la tapa (`verify:escena` lo exige en los diez
  apaisados). Y aquí la segunda Y la tercera versión decían cosas falsas («se dibujan
  encima, 1010 contra 1000», y después «con el `renderOrder` en los grupos de las dos
  manos, cero fallos») que hubo que deshacer con el ordenador de `three` en la mano y
  con el ÁRBOL DE VERDAD de `delta.tsx`; y la cuarta, la quinta y la sexta decían otra,
  más honda, que sólo la fase 2 descubrió al medir con la PODA POR FRUSTUM puesta. Los
  hechos, por orden:

  1. `three` ordena primero por `groupOrder` y sólo después por `renderOrder`
     (`painterSortStable`, `WebGLRenderLists.js` 1–27; la de transparentes, 31–57, igual
     en esos dos primeros escalones). Y **el `groupOrder` de una malla es el
     `renderOrder` del `Group` MÁS CERCANO que tiene encima**, no el del más exterior:
     `projectObject` hace `if (object.isGroup) groupOrder = object.renderOrder` en CADA
     grupo que atraviesa (`WebGLRenderer.js` 1839–1841), así que un grupo anidado sin
     número devuelve a 0 todo lo que cuelga de él. En `delta.tsx` cada pieza, naipe,
     carta, área y casilla vive en un `<group>` PROPIO (`PiezaEnLaBarra`, y dentro otro
     con el modelo; `MazoEnLaBarra`, igual; `Carta`, `AreaDeTrueque`,
     `CartaDelMazoEnLaMano`, `Casilla`), y hasta la fase 2 ninguno llevaba número. Un
     número puesto en el grupo exterior no le llega a ninguna carta ni a ninguna pieza.
  2. Las dos manos no están en la misma pasada: `three` pinta primero todos los
     opacos, luego los transmisivos, luego los transparentes (`renderScene`,
     `WebGLRenderer.js` 1959–1961). Las cartas de bienes son OPACAS (su
     `meshBasicMaterial` no lleva `transparent`) y las del mazo transparentes. La placa de
     antes era transparente (`opacity 0,42`), los zócalos y el naipe del mazo lo son, y
     los modelos de las piezas y la tapa son opacos.
  3. **`projectObject` PODA por frustum antes de meter nada en la lista, y a lo que no
     está en la lista no se le llama `onBeforeRender`.** Los dos «testigos» de borrado
     de profundidad que este documento razonó durante cuatro versiones (un plano de
     0,001 con `onBeforeRender → gl.clearDepth()`, uno en `Barra` a 999 y luego a −1,
     otro en `Baraja` a 1005) colgaban del ORIGEN de un grupo que copia la posición de
     la cámara en cada fotograma: estaban EN EL OJO, detrás del plano cercano (0,5), y
     `frustum.intersectsObject` los rechazaba con el plano cercano a 0,5, a 0,1 y a 0,01
     (`rev2-testigo-culled.ts`). Metidos en el `WebGLRenderLists` real con la poda del
     `projectObject` real, salen en la lista de PODADOS y no en la de dibujo
     (`rev2-orden-real.ts`: «PODADOS POR FRUSTUM: barra:TESTIGO clearDepth»). O sea:
     **ningún `clearDepth` corrió jamás, ni a 999 ni a −1**, y los píxeles nunca lo
     delataron porque a dos unidades de la cámara la tapa gana la profundidad sola. Las
     tablas de casos de la cuarta vuelta y de la cuarta revisión se midieron SIN poda
     (`medir-orden-con-el-arbol-real.ts`, `medir-orden-cuarta-revision.ts`), y todo lo
     que en ellas dependía del borrado (los casos C, E y F, «piezas → borrado → tapa»,
     «el −1 y los cuatro números van juntos», el testigo de la `Baraja` borrando entre
     la tapa y las sombras) describía un mundo que no existía. Lo que en esas tablas SÍ
     era verdad, y sigue siéndolo con la poda, es lo del `groupOrder`: con la constante
     sólo en los exteriores la tapa opaca se pinta después de las cartas de bienes y les
     tapa los pies, y las piezas se pintan con el mundo.

  La decisión, hecha en la fase 2, sin tocar `baraja.ts` ni `cartas.ts`:

  - **La regla entera:** cada capa pegada a la cámara tiene su constante
    (`ORDEN_DE_LA_BARRA` 1000, `ORDEN_DE_LAS_CARTAS` 1010, `ORDEN_DE_LAS_AREAS` 2000,
    `ORDEN_DE_LAS_CARTAS_DEL_MAZO` 3000, `ORDEN_DE_LAS_CASILLAS` 4000), que desde la
    fase 2 viven en **`escenas/capas.ts`** (sin `three` y sin React, para que el modelo
    del árbol y `verify:escena` importen EL MISMO número que pinta `delta.tsx`), y
    **TODO `<group>` que tenga mallas debajo lleva la constante de su capa como
    `renderOrder`**, porque el grupo que cuenta es el más cercano a la malla; el
    `renderOrder` de cada malla sigue ordenando DENTRO de su capa. Los grupos que la
    llevan (la línea de `escenas/delta.tsx` en `b216fbc` donde está escrito el
    `renderOrder` de cada uno):

    | Grupo | `escenas/delta.tsx` | `renderOrder` | Qué cuelga directamente de él |
    |---|---|---|---|
    | `Barra` | 1677 | `ORDEN_DE_LA_BARRA` | la luz, la tapa, las sombras, el tapete |
    | `PiezaEnLaBarra`, exterior | 1188 | `ORDEN_DE_LA_BARRA` | asa, zócalo |
    | `PiezaEnLaBarra`, interior (`ref={grupo}`) | 1234 | `ORDEN_DE_LA_BARRA` | las mallas del modelo |
    | `MazoEnLaBarra`, exterior | 1333 | `ORDEN_DE_LA_BARRA` | asa, zócalo |
    | `MazoEnLaBarra`, interior (`ref={grupo}`) | 1363 | `ORDEN_DE_LA_BARRA` | filo, cuerpo e icono del naipe |
    | `Dados`, el grupo del sitio (fase 3) | 1955 | `ORDEN_DE_LA_BARRA` | el asa única invisible |
    | `Dados`, el grupo de cada cubo (`ref` a `cubos`; fase 3) | 1972 | `ORDEN_DE_LA_BARRA` | la malla del D6 del pack, o el cuerpo y los puntos del respaldo |
    | `Baraja` | 2417 | `ORDEN_DE_LAS_CARTAS` | sólo su luz: el testigo que colgaba de él se QUITÓ (nunca corrió); se numera para que el grupo de cada mano diga su capa |
    | `Carta` | 2185 | `ORDEN_DE_LAS_CARTAS` | borde, cuerpo, icono |
    | `AreaDeTrueque` | 2281 | `ORDEN_DE_LAS_AREAS` | cuerpo, borde, icono |
    | `ManoDelMazo` | 2817 | `ORDEN_DE_LAS_CARTAS_DEL_MAZO` | nada: se pone para que el grupo de cada mano diga su capa y una malla que mañana cuelgue directa caiga en ella |
    | `CartaDelMazoEnLaMano` | 2531 | `ORDEN_DE_LAS_CARTAS_DEL_MAZO` | borde, cuerpo, icono |
    | `Casilla` | 2656 | `ORDEN_DE_LAS_CASILLAS` | cuerpo, borde, icono |

    Los `Dados` nacieron con la regla en la fase 3 (los dos grupos de la tabla; el de
    cada cubo lo lleva porque es el más cercano a la malla, y la vacuna E12 de la fase 3
    lo vio caer en `verify:escena` al quitárselo), y la pila de la mesa (fase 7) nacerá
    igual: todo `<group>` suyo lleva `ORDEN_DE_LA_BARRA`. Con esto, en las DOS pasadas, todo lo de la barra
    (1000) va antes que todo lo de los bienes (1010), esto antes que las áreas (2000),
    por el grupo y no por la cuenta de la malla (con once o más cartas en la mano, una
    carta cogida con el imán a tope pasa de 2002: 1010 + 100 + 300 + 600 = 2010; con el
    número en el grupo, el área entera va después de la carta en las dos pasadas), y
    todo eso antes que la mano del mazo (3000) y sus casillas (4000). Medido con el
    árbol modelo y la poda en los quince lienzos (`rev3-orden-y-toque.ts`, sección a):
    sin fallos y nada podado; en el iPhone 14, opacos `g0` (el suelo y el asa de una
    señal) → `g1000` (tapa, piezas, asas) → `g1010` (cartas) → `g2000` → `g4000`, y
    transparentes `g0` (el anillo de la señal) → `g1000` (naipe, zócalos, tapete,
    sombras) → `g2000` → `g3000` → `g4000` (`rev2-orden-real.ts` imprime la lista
    entera). Desde la fase 3 el asa de los dados y los dos cubos van OPACOS en `g1000`,
    detrás de la tapa y antes de las asas y las piezas de la barra, en los trece lienzos
    con sitio, y nada podado (`verify:escena`: «los dos dados se pintan OPACOS y antes
    que las cartas de bienes en el iPhone 14, y también están (sin podar) en el quinto
    hueco de un móvil de pie de 390»; `npx tsx escenas/scripts/arbol-de-la-mesa.ts`
    imprime la lista con `barra:DADO 0` y `barra:DADO 1`).
  - **No hay borrado de profundidad, y no se sustituye.** Se quitan los dos testigos;
    no queda ningún `clearDepth(` en `escenas/`, y `verify:escena` lo afirma sobre el
    código (no sobre los comentarios, que cuentan el fallo con su nombre) y afirma
    además que ningún `onBeforeRender` de `delta.tsx` toca el `renderer` que recibe: un
    borrado escondido ahí no se ve fallar, sólo se ve no hacer nada. La mesa se apoya
    en la profundidad del mundo, y el orden lo garantiza SOLO el `groupOrder` de los
    grupos de la tabla. Si algún día hiciera falta borrar profundidad para la mesa, es
    una segunda pasada de render (`createPortal` + `gl.render` con `autoClear` a mano),
    no un testigo. La vacuna del comprobador cambia con eso: un grupo sin número ya no
    significa «la tapa pisa a la pieza» (eso lo hacía el borrado, que no existía), sino
    **«fuera de su capa, se pinta con el mundo»**: la pieza conserva su profundidad y
    se ve, pero en la capa 0, antes que la tapa, y el juez del modelo la marca así
    (`rev3-orden-y-toque.ts`, VACUNA: «fuera de su capa, se pinta con el mundo: OPACO
    barra:PIEZA modelo 0 [g0 r0]»). Lo que se compra con la constante es la regla, no
    un píxel.
  - **El límite conocido de apoyarse en la profundidad del mundo.** El ojo va a 12
    unidades o más SOBRE EL AGUA (`ALTURA_MINIMA_DEL_OJO`), no sobre el terreno, y la
    cámara no baja de 12° (`ALTURA_MINIMA`, `camara.ts` 54). Con el terreno sintético
    de dos escalones (10,9 unidades) el mundo no llega nunca a las 2 unidades donde vive
    la mesa: 0 de 864 posturas a 12° (3 acercamientos × 72 rumbos × 4 centros;
    `rev3-colores-y-ojo.ts`, sección d). Pero en una montaña de cinco a ocho escalones
    (27–44 unidades de techo) y acercado al máximo, el ojo puede meterse en la roca y
    la mesa se entierra con él: **de 3 a 35 de 1.080 posturas a 12° según la semilla**
    (29, 11, 35, 6, 11 y 3 para las semillas 0, 1, 2, 3, 7 y 11, cuyas montañas tienen
    7, 8, 7, 5, 8 y 5 escalones: 38,3, 43,8, 38,3, 27,3, 43,8 y 27,3 unidades de techo;
    `rev3-ojo-montana.ts`, sección e; la séptima decía «siete u ocho» y dos de las seis
    semillas son de cinco), y **nunca al mirador de salida**, donde el ojo va a 389. Es
    el precio aceptado de no hacer la segunda pasada, y está escrito en la cabecera de
    `capas.ts` y en la de `Barra` (las dos dicen todavía «siete u ocho escalones»: es un
    retoque de comentario para la fase 4, §11).
  - **La madera PARA el toque, a todo.** La sexta versión daba a la tapa un
    `raycast={() => null}` «para no quitar ni un toque a las cartas», y no hacía nada:
    en fiber 9.7 sólo se lanzan rayos contra los objetos QUE TIENEN manejadores
    (`state.internal.interaction`), así que una tapa sin manejador, con o sin `raycast`
    nulo, es transparente al dedo, y el asa de un vértice escondido bajo la madera
    recibía el toque: se fundaba una choza tocando madera. La tapa lleva por eso
    `onPointerDown`, `onPointerUp`, `onPointerMove` y `onPointerOver` con `paraElToque`,
    cuyo cuerpo es SÓLO `e.stopPropagation()`, y `onPointerOut` con una función vacía:
    es el impacto más cercano de todo lo que hay detrás, fiber reparte de cerca a lejos,
    y la parada alcanza al asa del vértice. Hubo una excepción («salvo si detrás hay
    interfaz de mano», por los pies de las cartas de bienes y la columna de áreas) y se
    QUITÓ al medirla: con cuatro áreas (las máximas: cinco bienes menos el que se da) el
    fondo de la columna queda en `y = −0,698` del lienzo, por ENCIMA del borde trasero
    de la tapa (`−0,771`) en los quince lienzos (`rev4-areas-cuatro.ts`; con dos áreas,
    `rev3-ojo-montana.ts`, sección f); y de los pies de las cartas quietas, aunque
    proyectan bajo el borde trasero (`y = −0,800`), la carta va DELANTE de la madera en
    todos los apaisados, y sólo en los lienzos de pie hay uno o dos puntos de filo donde
    la madera es el primer impacto (`rev3-orden-y-toque.ts`, sección b: catorce cartas
    cogidas por el pie y por el centro sin que la tapa pare ninguna en el iPhone 14, el
    monitor y la tableta; en 390×845, un pie de catorce donde la tapa llega antes y la
    carta que la solapa recibe). Una excepción que protegía dos puntos y que ninguna
    comprobación medía era la misma clase de cosa que el testigo. Lo que un asa de la
    barra pierde por abajo con la tapa delante: 1,1 puntos de 54,6 en el iPhone 14, 3,0
    de 151,2 en el monitor (misma sección). `onPointerOver`/`onPointerOut` van porque
    sólo con ellos la tapa entra en la lista de «hovered» de fiber, y sólo entonces su
    parada manda `pointerout` a lo que había crecido detrás: un anillo de señal que
    quedó grande no se queda grande bajo la madera. Y `paraElToque` NO marca el suceso
    para la cámara (`loCogeLaInterfaz` / `laInterfazSeLoQueda`): la cámara del
    escritorio escucha en `window` y la de la app en `gesture-handler`, fuera de fiber,
    así que arrastrar desde la madera sigue girando el tablero, que es justo como se
    sacan los sitios escondidos. Probado en el banco antes de empujar: nueve toques
    sobre la madera con la choza cogida no fundan nada, y arrastrar desde la madera
    gira. `verify:escena` exige los cinco manejadores, que el cuerpo de `paraElToque`
    sea exactamente la parada, que no haya `raycast` en la etiqueta de la tapa y que la
    excepción (`hayInterfazDetras`) no exista.
  - Lo TRANSPARENTE de la mesa (zócalos, tapete, sombras de contacto) se pinta en la
    pasada de transparentes, después de las cartas opacas, haga lo que haga el
    `groupOrder`; por eso nada transparente de la mesa puede llegar a una carta: los
    zócalos y las sombras viven dentro de los huecos y el tapete bajo los dados, y «el
    hueco del mazo queda libre de las cartas de bienes» ya lo mide `verify:escena`. La
    pila del mazo (fase 7) es opaca por lo mismo. Esos transparentes llegan a su pasada
    CON la profundidad de la tapa y de las piezas intacta porque no hay ningún borrado
    entre medias (nunca lo hubo), y el juez del modelo exige que las sombras y el
    tapete vayan en esa pasada.
  - Los comentarios reescritos con la regla: la cabecera de las capas (ahora la de
    `capas.ts`: «cada capa es un número, y lo lleva TODO grupo con mallas debajo, porque
    el pintor mira el grupo más cercano», y «el orden es lo único que separa la mesa del
    mundo: no hay borrado de profundidad»); el de la carta (`delta.tsx`
    2153–2172, y la frase en 2168–2172: lo que baja de un grupo es el `groupOrder`, manda
    más, y sólo baja desde el grupo más cercano); la cabecera de `Barra` (1396–1505), que
    cuenta la tapa, el orden, el límite conocido y la madera para el toque; y la de
    `ManoDelMazo` (2718–2754), que
    dice por qué no lleva ni luz ni testigo.
  - `verify:escena` no puede correr el pintor de verdad, pero hace dos cosas. La
    primera, leer `delta.tsx` como texto: afirma que el PRIMER `<group` que sigue a cada
    una de estas seis firmas (`function PiezaEnLaBarra(`, `function MazoEnLaBarra(`,
    `function Carta(`, `function AreaDeTrueque(`, `function CartaDelMazoEnLaMano(`,
    `function Casilla(`), y en las dos primeras también el segundo, el del
    `ref={grupo}`, lleva `renderOrder={` con la constante de su capa (ocho grupos hasta
    la fase 2; DIEZ desde la fase 3, con `function Dados(` y sus dos grupos), y que los
    tres exteriores (`Baraja`, `ManoDelMazo`, `Barra`) también. La regla de
    lectura: **la primera línea que EMPIEZA (tras espacios) por `<group` después de la
    firma, y de ahí hasta el `>` que CIERRA la etiqueta, saltando lo que va entre llaves
    y entre comillas** (una etiqueta puede ocupar varias líneas y llevar una función
    flecha con su `=>`, que cortaría la lectura a medias y dejaría fuera un
    `renderOrder` que sí está); un comentario que cite la constante no cuenta porque no
    empieza por `<group`, y el comentario de la carta no escribe `<group` literal al
    principio de una línea. Mirar sólo los grupos exteriores es afirmar el caso medido
    roto: se cuentan los diez de dentro o no se cuenta nada. La segunda cosa es medir:
    **`escenas/scripts/arbol-de-la-mesa.ts`** monta un MODELO del árbol (no React: los
    grupos y las mallas con los mismos materiales, opacos o transparentes, con o sin
    prueba de profundidad, con o sin escritura de color) con las constantes IMPORTADAS
    de `capas.ts` y las posiciones reales de `huecosDeLaBarra`, `tapaDeLaMesa`,
    `huecosDeLaMesa`, `huecosDeLaBaraja`, `areasDeTrueque`, `huecosDeLasCartas` y
    `casillasDeLaMano`, con la cámara de `ojoDelMirador`, y lo ordena con el
    `WebGLRenderLists` de `three` 0.185.1 reproduciendo el `projectObject` real, poda
    incluida; su juez (`fallosDelOrden`) exige la tapa y las piezas antes que las cartas
    de bienes, nada de la mesa después de nada de las manos en cada pasada, sombras y
    tapete entre los transparentes, todo lo de la mesa en `g1000` y NADA de la mesa
    podado; `verify:escena` lo corre en los quince lienzos. Suelto (`npx tsx
    escenas/scripts/arbol-de-la-mesa.ts`) imprime la lista ordenada del iPhone 14, que
    es lo que se mira cuando algo del orden se discute. El texto compra la FORMA del
    árbol; el modelo, que con esa forma el pintor haga lo que se quiere. Desde la fase 3
    la lectura por texto cubre `function Dados(` (el primer `<group` tras la firma, el
    del sitio, y el segundo, el del `ref` a `cubos`) con `ORDEN_DE_LA_BARRA`, y
    `arbol-de-la-mesa.ts` monta la rama CON dados de `Barra` (`huecosDeLaMesa(4, …)`:
    sus `.piezas`, y donde hay sitio el tapete, las seis sombras y el grupo `Dados` con
    su asa invisible y un grupo por cubo con `barra:DADO 0/1` opacos); en la fase 7 se
    extenderá a la pila del mazo si trae grupo propio.

  Lo que queda de las nueve formas que midieron la cuarta vuelta y la cuarta revisión
  sin poda, dicho con la poda puesta (`rev2-orden-real.ts`, `rev3-orden-y-toque.ts`):

  | Qué lleva número | Con el pintor de verdad |
  |---|---|
  | Sólo `Barra` (era el caso A, con la placa; y el B, con la tapa) | ✗ la tapa opaca se pinta DESPUÉS de las cartas de bienes y les tapa los pies; las piezas, los zócalos y el naipe se pintan con el mundo (`g0`) |
  | Los exteriores (`Barra`, `Baraja`, `ManoDelMazo`), o sólo las manos (los casos C y F) | ✗ lo mismo: un número en el exterior no le llega a ninguna malla; las piezas quedan «fuera de su capa» |
  | Los diez (los trece desde la fase 3), con o sin `ManoDelMazo` (los casos D, G, I) | **sin fallos**, en los quince lienzos, y nada podado. Del exterior del mazo no cuelga ninguna malla; se numera por regla |
  | Los trece con el grupo de un cubo de los `Dados` sin número (la vacuna E12 de la fase 3) | ✗ los cubos «fuera de su capa, se pintan con el mundo»: la vacuna que el juez ve, y `verify:escena` la caza antes por texto («los DIEZ grupos de dentro llevan la constante de su capa…») |
  | Cualquiera de los anteriores con un testigo (los casos E y H, y la columna «Testigo» entera de las tablas anteriores) | el testigo sale en PODADOS y no cambia nada: esa columna era ficción |

  Nota que la sexta versión dejó al margen y que era FALSA: decía que «cualquier
  `clearDepth` en la pasada de opacos después del mundo deja la pasada de
  transparentes sin la profundidad del mundo, así que el anillo de una señal nunca
  queda escondido por una montaña que tenga delante». No había tal borrado, así que el
  anillo SÍ conserva la profundidad del mundo: se pinta el primero de los transparentes
  (`g0 r2`, antes que la mesa) contra la profundidad que dejaron los opacos del mundo, y
  una montaña delante lo esconde, que es exactamente lo que el comentario de `Senal`
  (`delta.tsx` 1011) quiere al apagar sólo el `depthWrite` «para que tampoco tape lo que
  tiene detrás» (`rev3-orden-y-toque.ts`: «el anillo de la señal (mundo, g0) va ANTES
  que la mesa en la pasada de transparentes: conserva la profundidad del mundo»).

Se quitó la placa, y con ella se quedó sin objeto la comprobación de `verify:escena`
«la mano del mazo no invade la zona de la barra de construir», que medía `hueco.y +
hueco.lado · 0,75`, la placa, para una a seis piezas: sin placa habría seguido verde
vigilando nada. En la fase 2 se reescribió contra lo que de verdad hay: el techo de la
mesa, `hueco.y + 0,52 · lado` (el asa, 0,5, más el bote de la pieza tomada, 0,516,
redondeado hacia arriba), aplicado a los huecos de las piezas Y al de los dados, que
tiene el mismo `y` y el mismo alto de un lado y cuyo dado en salto se queda en 0,24
lados (su comentario ya lo dice así). Y recorre la lista `LIENZOS` con el ALTO REAL de
cada lienzo, no dos proporciones con un alto de 900 escrito a mano: `huecosDeLaMesa`
decide con el alto en puntos si hay dados, y con 900 puntos un móvil de 490 de alto
«tenía» dados que en el aparato no tiene; entre los quince hay lienzos con dados y sin
ellos, y el comprobador exige que los haya de las dos clases. Es `−0,272·alto` con el
alto mandando: 0,072 de holgura al piso de `−0,20`. Se queda la `pointLight` de `[0.4,
0.6, -1.2]` con su alcance de 3: es lo que ilumina lo que gira con la cámara, y como
está por encima de la cota ilumina también la tapa horizontal. Los zócalos hexagonales
se quedan como posavasos: llevan la información de «apagada» (opacidad 0,3) y la de
«tomada» (verde), y un posavasos sobre una mesa es una cosa normal; de madera más
oscura que la tapa (`#683a2c`, 1,60:1 contra la veta más oscura, leído del atlas en
`mesa.ts`), no de paja clara, para que no parezcan pegatinas: decisión 14 del §1.

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

La tapa mezcla `#94533f` y `#b97756` según una veta, `vetaDelTablon(segmentos, filas,
tablon)`, función pura de `escenas/mesa.ts`. Los dos colores no están escritos en el
código: se LEEN de la tabla compilada del atlas con `coloresDeLaMadera()`, por las
celdas `MADERA_OSCURA_EN_EL_ATLAS` (columna 6, fila 151: `#94533f` exacto) y
`MADERA_CLARA_EN_EL_ATLAS` (columna 5, fila 93: `#b97756` exacto), y `verify:escena`
afirma que siguen siendo los medidos sobre las piezas de madera («los dos colores de la
madera se leen del atlas del pack y siguen siendo los medidos…: #94533f y #b97756»). La
sexta y la séptima versión escribían `#955541` en esta frase y en el pseudocódigo de
abajo: era el color medio de la tabla de arriba, no el de la celda, y gana la celda:

```
x = i / segmentos ∈ [0, 1]   a lo largo del tablón (el ancho de la pantalla)
y = j / filas     ∈ [0, 1]   a lo ancho del tablón (la profundidad, hacia la cámara)
tablon = floor(j · 3 / filas) ∈ {0, 1, 2}   tres tablones de 0,7 lados de fondo
veta(x, y, tablon) = fbm(x · 3 + tablon · 17,3, y · 22 + tablon · 5,1, 7_001, 3 octavas)
color = mezcla(#94533f, #b97756, veta)      los dos leídos del atlas, no escritos
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
recibió. Bajo cada hueco va un disco de 20 segmentos (`SEGMENTOS_DE_LA_SOMBRA`),
negro, `transparent`, `depthWrite: false`, con el alfa en el vértice (0,35 en el
centro, `ALFA_DE_LA_SOMBRA`, y 0 en el borde; `three` lee un atributo `color` de
cuatro componentes como color más alfa por vértice, `USE_COLOR_ALPHA`), de radio
`0,62 · lado` (`RADIO_DE_LA_SOMBRA`: doce centésimas más que el zócalo, que es lo que
asoma y se ve), tumbado sobre la tapa a `cota + 0,002` (`SOBRE_LA_TAPA`). Todos los
discos van en UNA geometría, `geometriaDeLasSombras(centros)` en **`escenas/tablon.ts`**,
y se funden A MANO (abanicos indexados: un centro más veinte vértices de borde por
disco, `segmentos` triángulos cada uno) y no con `mergeGeometries`, como decía la sexta
versión: eso vive en `three/examples`, que la app no ha cargado nunca, y la fusión a
mano son diez líneas. Los centros son los huecos de la barra (cuatro en la partida) y,
desde la fase 3, los dos dados AÑADIDOS a la misma lista, cada uno bajo su centro
(`sitio.x + centroDelDado(i) · lado`) y con su propio radio,
`RADIO_DE_LA_SOMBRA_DEL_DADO = 0,32` lados de `escenas/dados.ts`, no el 0,62 de los
huecos: algo más que la media arista (0,26) para que asome por los cuatro lados del
cubo, y algo más que la media distancia entre los dos centros (0,30) para que las dos
sombras apenas se toquen. Seis discos, 120 triángulos, una geometría y una llamada, que
es lo que `verify:escena` construye y cuenta, y sobre el texto de `delta.tsx` afirma
que hay UNA llamada a `geometriaDeLasSombras(` y que los centros de los dados entran en
ella con ese radio («las sombras de los dos dados se AÑADEN a la lista de centros…»).
Es el mismo disco de contacto que llevan los aventureros del Muelle.

### 4.4. Los huecos: `huecosDeLaMesa`, y cuándo NO hay dados

`huecosDeLaMesa(cuantos, campo, proporcion, altoEnPuntos)` devuelve `{ piezas, dados }`.
Recibe el alto del lienzo en PUNTOS porque el suelo de 44 es en puntos y el reparto
de `huecosDeLaBarra` sólo sabe de unidades; la escena lo tiene (`estado.size.height`,
que la `Barra` ya lee para la proporción) y las dos pantallas también (`medida` del
`onLayout` en la app, `riberas-en-tres-escena.tsx` 659–660; el `ResizeObserver` de
`medirElRecuadro` en el escritorio, `riberas-en-tres.tsx` 927–944). `dados` es un hueco
de `1 lado` de alto y de un ancho que depende del peldaño: `1,6 lados` colgado y, como
quinto, `max(lado, ANCHO_DEL_PAR_DE_DADOS · lado) = 1,12 lados` (desde la vuelta 3b de la
fase 3; hasta entonces era un lado, y el par no cabía). La regla es de tres peldaños, en este orden:

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
   los otros cuatro de `huecosDeLaBarra(5, …)` (`.slice(1)`). Pasa en 390×490 y 390×845
   (asa de 45,8 puntos de alto, las piezas bajan de 57,8 a 45,8), en la tableta de
   768×640 (el colgado habría quedado a 8 puntos del canto; asa de 89,6, las piezas no
   cambian porque sigue mandando el alto) y en una tableta con el navegador de pie,
   768×1024 (90,2). Las piezas se corren un poco a la izquierda, y se deja escrito por
   lo mismo que la cabecera de `huecosDeLaBarra`: una barra centrada que crece no se
   queda donde estaba.

   **El quinto NO es cuadrado, y por qué.** Hasta la sexta versión el par medía 1,00
   lados (arista de 0,46) y cabía en un quinto de un lado; con la arista de 0,52 de la
   decisión 15 el par mide 1,12 y la séptima no volvió a mirar el quinto. La revisión
   de la fase 3 lo midió: en un asa y un tapete de un lado cada dado asomaba 0,06 lados
   por fuera (2,7 puntos en 390×490 y 390×845, 5,4 en las tabletas), esos bordes no
   recibían el toque (los cubos llevan `raycast` nulo: sólo el asa se pulsa) y el dado
   derecho quedaba a 0,180 lados del zócalo de la primera pieza en vez del `AIRE` de
   0,24. Encoger los dados rompía el §1.15 en 390 (`0,46 · 45,8 = 21` puntos). Así que
   la vuelta 3b decidió, y `huecosDeLaMesa` lo hace: el quinto reserva para el asa y el
   tapete `max(lado, ANCHO_DEL_PAR_DE_DADOS · lado)` y **crece hacia la IZQUIERDA**: su
   borde derecho se queda donde estaba el del hueco de un lado (`quinto.x + lado / 2`,
   a `AIRE` = 0,24 lados del zócalo de la primera pieza, el mismo aire que hay entre dos
   huecos y el mismo que el colgado deja hasta la primera), y los 0,12 lados que faltan
   salen del margen izquierdo. Los dados no encogen (23,8 puntos en 390 de pie), las
   piezas siguen siendo `huecosDeLaBarra(5).slice(1)` sin moverse un milímetro respecto
   de la fase 3, y el alto sigue en un lado. Medido con `huecosDeLaMesa(4, …)` en los
   cuatro lienzos de quinto (`rev5-quinto-y-dado.ts`; la vuelta 3b midió lo mismo):

   | Lienzo | Asa y tapete | Piezas | Dado derecho → primer zócalo | Canto → asa |
   |---|---|---|---|---|
   | 390×490 | 1,12 × 1 lados = 51,3 × 45,8 pt | 45,8 pt | 0,240 lados (11,0 pt) | 1,157 lados (53,0 pt) |
   | 390×845 | 51,3 × 45,8 pt | 45,8 pt | 0,240 lados (11,0 pt) | 1,157 lados (53,0 pt) |
   | 768×640 | 100,4 × 89,6 pt | 89,6 pt | 0,240 lados (21,5 pt) | 1,186 lados (106,2 pt) |
   | 768×1024 | 101,0 × 90,2 pt | 90,2 pt | 0,240 lados (21,6 pt) | 1,157 lados (104,4 pt) |

   El canto queda a más de un lado en los cuatro (el colgado exige medio). El colgado no
   cambia: asa de 1,6 lados con 0,24 de aire dentro a cada lado del par y 0,48 lados
   del dado derecho al primer zócalo. `verify:escena` lo afirma con una comprobación
   nueva («el par cabe en el asa y en el tapete en los DOS peldaños, con su aire»: los
   bordes del par dentro del asa en los trece lienzos con dados, aire ≥ 0,24 hasta la
   primera pieza, y en el quinto que el ancho es el par y el borde derecho el del hueco
   de un lado de `huecosDeLaBarra(5)`, con la cifra de 390 escrita: 1,157), y la
   comprobación de los peldaños mide ahora el borde del DADO derecho (`dados.x +
   centroDelDado(1) · lado + ARISTA_DEL_DADO · lado / 2`) y no el del asa, que era por
   lo que no veía el desborde. Y como con quinto lo que se pinta es la barra de cinco,
   que donde manda el alto es más ancha que la de cuatro (su borde derecho cae a 0,691
   en 768×640 frente a 0,547), otra comprobación mide el mazo del reparto de cinco
   contra las cartas de bienes quietas (30,2 pt de margen en 390×490, 9,7 en 390×845,
   80,0 en 768×640, 56,1 en 768×1024) y contra la mano abierta por el imán allí donde
   con cuatro no la pisaba. Un preexistente que se anota y no se exige: en 390×845 la
   mano de bienes ABIERTA por el imán cruza el mazo de la barra 32 puntos, con tres,
   cuatro y cinco huecos por igual (donde manda el ancho el borde derecho de la barra es
   siempre 0,2676 del ancho visible), así que no lo estrena el quinto y el ancho de la
   barra no lo arregla; sigue siendo un sitio donde un ratón que pase por encima roba el
   rayo al naipe. La cabecera de `HuecoDeLosDados` en `barra.ts` cuenta el porqué
   entero.
3. **`dados = null`,** cuando ni el colgado cabe ni el quinto llega a 44. `piezas` es
   `huecosDeLaBarra(4, …)`, las piezas no encogen, y el botón TIRAR se queda en la
   cinta: cada movimiento exactamente una vez, nadie sin tirar (§1.4). Pasa en
   320×360 (el quinto daría 37,6; las piezas se quedan en 47,5) y en 360×490 (42,3;
   se quedan en 53,4). Son dos de los quince lienzos de `LIENZOS`; con 0,14 dan 47,5 y
   53,4, por encima de los 44 que exige `verify:escena`: la mesa no puede ponerlos
   rojos, y no los pone («en los dos lienzos sin dados las piezas no encogen: se quedan
   en los 47,5 y 53,4 puntos de siempre»).

La regla es «cabe o no cabe, y llega a 44 o no», nunca la proporción, para que un
lienzo raro no caiga en la forma equivocada. La pantalla pregunta lo mismo que la
escena —`huecosDeLaMesa(...).dados !== null`— antes de llamar a `dadosEnTres`, y como
las dos llaman a la misma función con la misma medida no pueden discrepar: si la
escena no pinta dados, la pantalla no quita el botón.

**Y la escena sólo pide `huecosDeLaMesa` cuando hay algo que poner en su sitio de los
dados: la llave es `dados !== null`.** Hecho en la fase 3 (`delta.tsx`, `Barra`,
1584–1630): `const conDados = dados !== null`; con dados, `mesa = huecosDeLaMesa(cuantos,
forma.campo, forma.proporcion, forma.alto)`, `huecos = mesa.piezas` y el sitio de los
dados es `mesa.dados`, colgado o quinto; sin dados (la colocación, un mirón, un lienzo
del tercer peldaño, o una pantalla que no pasa la entrada) `huecos =
huecosDeLaBarra(cuantos, forma.campo, forma.proporcion)`, como en `4287809`, y el
tapete sólo se pinta bajo el sitio COLGADO de `huecosDeLaMesa` (`sitio.forma ===
'colgado' ? sitio : null`), porque el colgado es el único sitio de dados que existe sin
tocar a las piezas. Hasta la fase 3 la llave era `tapete !== null`. No es un atajo:
`huecosDeLaMesa` decide con el alto en puntos si hay sitio para un cuarto o un quinto
hueco, y donde cae el quinto (390×490, 390×845, las tabletas) las piezas se corren y
encogen para hacerle sitio; pedírselo con `dados === null` reservaría en la colocación
de pie un hueco para unos dados que no existen, y las piezas se moverían otra vez al
empezar a jugar. `cuantos` se cuenta igual en las dos ramas, y lo que cambia con la
vista de los dados (la suma, el sello) no rehace el reparto: sólo importa si los hay.
`verify:escena` lo afirma sobre el texto de `delta.tsx` con dos comprobaciones que
sustituyen a la de la fase 2: «la llave del reparto es `dados !== null`: con dados
`huecosDeLaMesa(cuantos, campo, proporcion, alto)` y sus `.piezas` y `.dados`; sin
dados sigue `huecosDeLaBarra` y el tapete sólo bajo el sitio COLGADO» y «el tapete se
apaga con `ultimaTirada = 0` (antes de la primera tirada) y sólo con dados: `hayTapete`
lleva la llave y el `<mesh>` del tapete la pregunta». La vacuna E16 (volver a `tapete
!== null`) la vio caer.

**`cuantos` es 4, y por qué siempre 4 cuando hay dados.** La escena cuenta
`piezas.length + (mazo === null ? 0 : 1)` (`delta.tsx` 1578) y la pantalla tiene que
contar EXACTAMENTE igual —`barraEnTres(...).length + (mazoEnLaBarra(...) === null ? 0 :
1)`— para pedir el mismo reparto. En `jugando`, para un colono con color, es 4 sin
excepción: `barraEnTres` devuelve las tres `PIEZAS_DE_LA_BARRA` en cuanto hay color,
dentro y fuera de turno (`riberas-en-tres.ts` 350–360; fuera de turno salen apagadas, no
ausentes), y
`mazoEnLaBarra` no es `null` en `jugando` con color (398–410; el `momento !==
'jugando'` en 404). Fuera de `jugando` el
mazo es `null` y son 3, y ahí NO hay dados: `dadosEnTres` devuelve `null` fuera de
`momento === 'jugando'` (`riberas-en-tres.ts` 1092), por lo mismo que `mazoEnLaBarra`
(cabecera 372–397: durante la colocación no existe la jugada, y un hueco apagado toda
una fase promete algo que no llega). Con tres huecos los cuatro móviles caerían en
quinto con el canto a 0,891 lados (la revisión de la vuelta 3b lo midió), y no se
pinta: la pantalla no pasa dados. Todas las medidas del colgado usan 4 y valen; la de 3 se hizo igual
(`medir-colgado-con-tres.ts`) por si algún día se quieren dados en la colocación: con 3
el colgado cae más adentro, `x ∈ [−0,830, −0,459]`, con 124–191 puntos libres tras la
muesca en los teléfonos, cabe en la tableta de 768×640 (63) y en los lienzos de pie
pasaría a cuarto hueco con 47,5 puntos en 320×360 y 53,4 en 360×490 —donde con 4 no
hay dados—: un lienzo que tuviera dados en la colocación y los perdiera al empezar a
jugar. Otra razón para no pintarlos ahí. `verify:escena` mide las tres
formas en los seis lienzos de hoy más 768×1024 y los ocho apaisados (568×320, 667×375,
780×360, 844×390, 932×430, 1024×768, 1180×820, 1920×1080), con la misma exigencia que
el hueco del mazo: 44 puntos de asa en TODAS las piezas y en los dados cuando los hay,
libre de la mano de bienes quieta, sin despertar la mano del mazo, que en 320×360 y
360×490 `dados` sea `null`, y desde la vuelta 3b que el par quepa en el asa en los dos
peldaños y que el mazo del reparto de cinco quede libre (arriba).

## 5. Los dados

### 5.1. Forma y tamaño

**La malla es el `D6_A` de KayKit Board Game Bits, medido, horneado y con los colores
de las fichas; todo lo demás se queda.** Miguel señaló que el pack [Board Game
Bits](https://kaylousberg.itch.io/board-game-bits) de la misma casa que los otros
cuatro (CC0, versión gratuita, «75+ modelos» en OBJ, FBX y GLTF) trae dados modelados:
D4, D6, D8 y D20. Su página decía «la mayoría de las piezas usan un único atlas de
gradiente de 1024×1024» PERO «las cartas y los dados llevan texturas individuales», y
la séptima versión, sin el pack en el disco, tenía por más probable que los puntos
estuvieran pintados. El pack está en
`arte/kaykit/board-game-bits/KayKit_BoardGameBits_1.0_FREE/` desde la fase 3 y se midió
con el fichero delante (`medir-d6-del-pack.ts` sobre los `.gltf` de `Assets/gltf`, y
después el propio `compilar-dados.ts`; §9):

| Fichero | Vértices / triángulos | Textura | Los puntos o los números |
|---|---|---|---|
| **`D6_A.gltf`** | 521 / 662, UNA primitiva, un material («boardgame»), con UV y sin `COLOR_0` | el ATLAS compartido del pack, `boardgame_bits_texture.png` (1024², 35 kB) | GEOMETRÍA: 21 puntos de 9 vértices cada uno (189 vértices de punto, 332 de cuerpo), cada punto en una celda oscura del atlas; bajo los vértices dos colores dominantes, el cuerpo `228,232,234` y el punto `68,68,68`, más un degradado (37 tonos en total) |
| `D6_B.gltf` | 501 / 740 | el mismo atlas | geometría, cuerpo OSCURO con hoyuelos: 84 vértices de punto con la normal mirando a otra cara que la de su posición |
| `D6_C_blue`, `D6_C_green`, `D6_C_red` y `D6_C_yellow.gltf` (no hay un `D6_C.gltf` sin color) | 120 / 188 | textura individual `dice_*.png` de 1024² y 150 a 175 kB | NÚMEROS PINTADOS, sin punto de geometría. Horneados con el horno de verdad (`rev6-medir-d6-con-el-horno.ts`, §9), el compilador niega los cuatro, y a cada uno por una rama: el azul no tiene ningún vértice oscuro (el más oscuro, 0,276: «gana el respaldo; no se compila»); el rojo los tiene TODOS oscuros (los 120 bajo 0,25, el más claro en 0,207: «no hay cuerpo que pintar»); el verde tiene 48 oscuros con el más claro en 0,226, que no deja el factor 2 al umbral; el amarillo ninguno oscuro (0,521) |
| `D4`, `D8`, `D20` | | textura individual | números pintados |

Caja del `D6_A`: `0,7500 × 0,7500 × 0,7500`, centrada (centro en `0,0003, 0, 0`), y las
caras en reposo, contadas: `−z = 4, −x = 5, +y = 6, −y = 1, +x = 2, +z = 3`. Entre el A
y el B gana el A porque los dados de esta mesa son claros con puntos oscuros, como las
fichas; el C y los demás se descartan por la ruta (b) de abajo, que ya estaba escrita.

Se queda como estaba: **dos** dados (decisión 3), la arista de **`0,52 lados`**
(`ARISTA_DEL_DADO`; era 0,46 hasta la decisión 15) con un hueco de `0,08 lados` entre
ellos (`HUECO_ENTRE_DADOS`; el par mide `ANCHO_DEL_PAR_DE_DADOS = 1,12` lados y deja
`AIRE` (0,24) a cada lado del asa colgada de 1,6, y llena el asa del quinto, §4.4), el
punto del **18 % de la arista** (`PUNTO_DEL_DADO`) y el mínimo legible de 22 y 4
puntos (decisión 15), el asa ÚNICA e invisible, la cota (el centro del cubo en
`cota + 0,26 lados`: `CENTRO_DEL_DADO_SOBRE_LA_TAPA`, media arista), el salto de 0,2
(`SALTO_DEL_DADO`; en lo alto el dado llega a `hueco.y + 0,24 · lado`, bajo el asa,
§1.2), la máquina del §5.3 y el tapete del §2.2. Todo eso vive en `escenas/dados.ts`,
sin `three`. Lo que cambió es de dónde sale la geometría del cubo con sus puntos, y de
qué color.

**La escala.** Los packs de KayKit no vienen a la escala del tablero (la casa del
pack hexagonal mide 0,93 y la escena la sube con `ESCALA_DEL_PACK`, `escala.ts` 113;
el caballero de Adventurers mide 2,543 y ésa es la unidad de las personas), y los dos
compiladores de la casa NO escalan al compilar: `compilar-embarcadero.ts` lo dice en
su cabecera («no se escala nada; es la escena la que aplica `ESCALA_DEL_PACK`») y
`compilar-aventureros.ts` MIDE la caja envolvente sobre las posiciones (`getMin` /
`getMax` de `POSITION`, 200–220) y se niega si el caballero se aparta más del 5 % de
`ALTURA_DE_UNA_PERSONA` (458–473). El dado sigue ese camino: `compilar-dados.ts`
(`exigeElCubo`) mide la caja envolvente del D6 en los tres ejes, exige que sea un cubo
centrado en el origen (los tres lados y el centro al 1 %) y la contrasta con
**`ARISTA_DEL_D6_EN_EL_PACK = 0,75`**, la constante de `escenas/dados.ts` escrita con
el número medido (como `ALTURA_DE_LA_CASA_EN_EL_PACK` en `escala.ts`); `verify:dados`
la vuelve a medir dos veces, con `@gltf-transform` y con el `Box3` de `three` sobre la
escena cargada; y la escena escala el modelo con `ARISTA_DEL_DADO · lado /
ARISTA_DEL_D6_EN_EL_PACK` (`escalaDelPack` en `Dados`, 0,6933 por lado), para que mida
exactamente los 0,52 lados que `verify:escena` exige en puntos (§1.15; la vacuna E20,
con el 0,75 escrito a mano en la escena, se vio caer). El fichero se queda a la unidad
del pack, y el día que un dado y una tesela compartan `Canvas` no habrá dos escalas del
mismo autor.

**La pega del color, que decidía la ruta de compilación, la resolvió el `.gltf`: los
puntos del `D6_A` son geometría, y se fue por (a) con un paso más.** Hay dos caminos
en la casa para que una textura de KayKit llegue al teléfono, donde `GLTFLoader` no
puede abrir un PNG empotrado (`app/src/tres/texturas-nativas.ts`, cabecera), y el D6
iba por uno u otro según dónde estuvieran sus puntos:

- **(a) Los puntos son GEOMETRÍA.** Es lo que hay, y es lo que hace
  `compilar-dados.ts` (`npm run compilar:dados -w escenas`): se hornea a `COLOR_0` con
  `horneaLaPrimitiva` de `escenas/scripts/hornear.ts`, exactamente como los
  aventureros y el embarcadero (muestreo bilineal, sRGB a lineal, un VEC4 de bytes por
  vértice; peor desvío sRGB 1,6), y DESPUÉS se **remapea**, que la séptima no tenía:
  el atlas pinta el dado de blanco azulado con un degradado (37 tonos bajo los 521
  vértices), y los dados de esta mesa son del mismo juego que las fichas de número, así
  que cada vértice se decide por su luminancia lineal (Rec. 709) contra
  `UMBRAL_DE_LUMINANCIA = 0,25` y se pinta o del crema de los discos de las fichas,
  `COLOR_DEL_NUMERO = #efe6cd` (bytes lineales `220,202,156`), o del color de sus
  cifras, `COLOR_DEL_PUNTO = #2a2118` (`6,4,2`); los dos viven ahora en
  `escenas/dados.ts` y `delta.tsx` los importa de ahí para las fichas y para el
  respaldo. Medido: los puntos caen entre 0,02 y 0,059 de luminancia y el cuerpo entre
  0,584 y 0,94, sin nada en medio; el compilador exige un factor 2 de hueco a cada
  lado del umbral (`HOLGURA_DEL_UMBRAL`) y se NIEGA si no lo hay, si ningún vértice es
  oscuro (puntos pintados: «gana el respaldo procedimental; no se compila», que es lo
  que dice con el `D6_C_blue`, el de la vacuna V7) o si todos lo son; los cuatro
  `D6_C_*` caen, cada uno por una rama (la fila del `D6_C` de la tabla de arriba). El
  degradado se aplana a propósito: una cara, un color, y el sombreado lo pone la luz de
  la escena, como en las fichas. Sin textura y sin UV (`desnudaElMaterial`, `dedup` y
  `prune`), material blanco con
  `vertexColors` y metal 0, un solo búfer, y el nodo, la malla y el material renombrados
  a `MODELO.dado`. Y **sin `weld`**, al revés que los otros dos compiladores: tras
  aplanar el color, doce vértices que sólo se distinguían por el tono del degradado
  quedan idénticos y `weld` los fundiría (521 → 509, medido); se ahorrarían 336 bytes y
  la cuenta del fichero dejaría de ser la del pack que se midió, que es la que
  `verify:dados` exige para que una recompilación con otro D6 se vea en el número. Sale
  `escenas/modelos/dados.glb`, **19,3 kB** (19.812 bytes). Cuesta 4 bytes por vértice y
  quita 8 de UV (`medir-textura-del-dado.ts`, §3), y funciona en el teléfono sin
  ningún complemento: la app lo abre con un `GLTFLoader` pelado, sin
  `texturasDelTablero`, porque no hay textura que sustituir.

  Y el segundo paso que nadie había escrito: **qué cara enseña cada valor se MIDE, no
  se supone.** El pack no lo dice en ningún sitio, y suponer «el 1 mira a +y» es el
  fallo sin error: el dado se asienta y enseña otro número. `caras-del-d6.ts`
  (módulo compartido por el compilador y el comprobador, para que la comparación entre
  los dos sea el fichero contra la realidad y no dos maneras de contar) agrupa los
  vértices del color del punto por conexión (unión-hallazgo por aristas de triángulo:
  ningún triángulo del `D6_A` mezcla los dos colores, porque los vértices de la costura
  están duplicados en otra celda del atlas), asigna cada vértice a la cara del eje en
  que su posición tiene mayor valor absoluto, exige que la NORMAL de cada vértice de
  punto mire a esa misma cara (con el `D6_B` saltan 84: sus hoyuelos), cuenta los
  grupos por cara y exige que sea un dado (`problemasDeUnDado`: seis caras con 1..6,
  una vez cada valor, 21 en total, opuestas 7). Con eso escribe
  **`escenas/caras-del-dado.ts`**, GENERADO y sin importaciones (`CARA_DEL_VALOR`
  `{1: '-y', 2: '+x', 3: '+z', 4: '-z', 5: '-x', 6: '+y'}`, `NORMAL_DEL_VALOR` y
  `normalDelValor()`), que la escena lee para orientar el dado al asentarse
  (`cuaternionDelValor`, §5.2). La regla de las 21 islas de la sexta versión está
  dentro (21 grupos en total), y es más exigente: la cuenta por cara es la que da la
  tabla.

  **`verify:dados`** (`npm run verify:dados -w escenas`; en `npm run verificar` como
  «dados», detrás de «aventureros») vuelve a abrir el fichero DESDE FUERA y hace 27
  comprobaciones con su guardia a 27: existe y pesa menos de 100 kB; un único nodo raíz
  `MODELO.dado` que sobrevive a `GLTFLoader`, y ese nombre en `EN_DADOS_GLB` y fuera de
  `nombresEnElGlb()`; una malla y una primitiva de triángulos indexados; `COLOR_0` como
  VEC4 de bytes normalizados; sin UV, sin textura ni imagen; un material blanco sin
  textura y sin metal; 521 vértices y 662 triángulos; la caja de 0,75 al 1 % centrada;
  el color son EXACTAMENTE dos tonos (no «al menos dos», como decía la séptima: un
  dado del blanco azulado del pack no daría error, y es un dado de otro juego), que
  son los bytes lineales de `COLOR_DEL_NUMERO` y `COLOR_DEL_PUNTO` convertidos con la
  curva sRGB escrita APARTE de `hornear.ts` (para no comprobar el horno contra sí
  mismo), con el alfa a 255; 189 vértices de punto (21 × 9) y 332 de cuerpo; las
  normales de punto en su cara; los invariantes de dado; `caras-del-dado.ts` BYTE A
  BYTE igual a lo regenerado contando el fichero, y sus exportaciones coherentes valor
  a valor; y lo que hace `three` al cargar: sin error, un solo hijo con su nombre antes
  y después del saneado, `vertexColors` encendido y sin mapa, ningún atributo
  entrelazado, los mismos 521/662, y la caja de 0,75 con `Box3`. Las vacunas de la fase
  3 lo vieron caer con la tabla editada a mano, con otro `.glb` en su sitio, con un
  color cambiado sin recompilar, con un tercer color en un vértice, con las UV
  devueltas, con dos nodos, entrelazado, con `weld`, sin remapear, con el `D6_C_blue`, con el
  `D6_B` y con la arista escrita a 0,8 (`vacunas-fase3.py`, §9).
- **(b) Los puntos están PINTADOS en la textura individual del dado**, que es el camino
  que NO se tomó y que sigue escrito para los cuatro `D6_C_*` y los D4, D8 y D20 (el cuerpo es
  una caja de 24 vértices, 8 esquinas por 3 caras, y cada cara entera cae en una
  región de la textura con el punto dibujado dentro): el horneado por vértice los
  BORRA, porque una cara son cuatro vértices y cuatro vértices son un color plano. El
  otro camino es el del atlas del tablero: `compilar-atlas-del-tablero.ts` compila el
  PNG a una tabla RGB en base64 dentro de un `.ts` (`escenas/atlas-del-tablero.ts`) y
  `texturasDelTablero` la levanta como `DataTexture` al arrancar con el `flipY`, el
  espacio sRGB y los filtros que el cargador no pone; `verificar-atlas-del-tablero.ts`
  recompila a un temporal y compara byte a byte, ensancha la tabla con el código de la
  app y la compara con el PNG píxel a píxel, y llama al complemento en Node con un
  analizador de mentira. Pero ese compilador guarda UN color por fila y columna porque
  el atlas es plano por columnas (8 × 1.024 × RGB = 24 kB, 32 kB en base64), y se NIEGA
  a compilar una imagen que no lo sea; una textura con puntos redondos no lo es, así que
  habría que ampliarlo a resolución completa, y eso pesa (`medir-textura-del-dado.ts`,
  §1): **una textura de 256² RGB son 192 kB crudos y 256 kB en base64, ocho veces la
  tabla del atlas; una de 512², 768 kB y 1 MB**. Los dos dados procedimentales del
  respaldo ocupan **16 kB en memoria** (posición, normal e índice, contados con `three`,
  §2 del mismo guion) y **0 en disco**, porque son código. La regla que pidió Miguel
  era «si pesa más que el propio modelo procedimental con sus 21 puntos, gana el
  respaldo», y la cuenta está hecha antes de abrir el fichero: la tabla más pequeña
  pesa dieciséis veces los dos dados. **Por (b) gana el respaldo** (y por eso los `D6_C_*` y
  los demás se descartan), y no se escribe ni el compilador ni el complemento para ese
  caso. Habría un tercer camino a medias
  (hornear el cuerpo del pack a un color y ponerle encima nuestros 21 puntos), y se
  descarta escrito: es el respaldo con otra caja, y dos geometrías del mismo dado son
  dos cuentas de triángulos.

Así que lo ÚNICO que el fichero decidía era si los puntos eran geometría, y lo eran.
La sexta versión lo resolvía con «más de 24 vértices y al menos dos colores tras
hornear», y no bastaba: un D6 con las aristas biseladas y los biseles en una celda
oscura pasa esa regla sin un solo punto. La regla que vale cuenta PUNTOS por cara
(arriba: `caras-del-d6.ts`), y un bisel oscuro es una tira que recorre la arista y no
da 21 islas ni 1..6 por cara. La séptima tenía la expectativa por defecto en el
respaldo, por la textura individual que la página anuncia, y la buena noticia se
comprobó en vez de planearse: el `D6_A` va con el atlas y sus puntos son 21 islas de
nueve vértices. Lo que el comprobador no juzga sigue igual: que 21 islas pasen
`verify:dados` no dice que se lean a 23 puntos, y eso es de ojos (§10).

**El respaldo, que se quedó escrito y vivo, en `escenas/cubo-del-dado.ts`.** Con
`three` y sin React, suelto como las geometrías de `tablon.ts`, porque lo que se pinta
tiene que poder CONTARSE (la séptima lo situaba dentro de `Dados`): una caja de
`ARISTA_DEL_DADO` (`geometriaDelCuerpoDelDado`) en `COLOR_DEL_NUMERO` y los 21 puntos
en `COLOR_DEL_PUNTO` (`geometriaDeLosPuntosDelDado`: discos de `SEGMENTOS_DEL_PUNTO =
10` lados con diámetro `PUNTO_DEL_DADO · arista`, a `PASO_DE_LOS_PUNTOS = 0,27` aristas
del centro de la cara y `PUNTO_SOBRE_LA_CARA = 0,004` aristas por fuera de ella,
fundidos a mano en una geometría): 12 + 210 triángulos y 2 llamadas por dado, 444 y 4
llamadas los dos (`verify:escena` los construye y los cuenta: «12 del cuerpo y 210 de
los puntos por dado, 444 los dos, con el diámetro del punto al 18 % de la arista», y
«el primer punto del respaldo mide de verdad 0,18 aristas de diámetro»). Sin aristas
redondeadas: a 3 segmentos costarían 108 triángulos cada uno y a 23 puntos no se ven. Y
con una regla que no es adorno: **cada valor va en la cara que dice `CARA_DEL_VALOR`,
la del pack**, así que el cuaternión objetivo de un valor es EL MISMO para el modelo y
para el respaldo y quien pinta no tiene dos tablas de caras que puedan discrepar
(`verify:escena`: «el respaldo pone N puntos en la cara que enseña el N según
caras-del-dado.ts»; la vacuna E6, con una tabla propia, cayó). Es lo que `Dados` pinta
cuando el catálogo no trae `dado` (`aplanados.get(MODELO.dado) === undefined`:
`dados.glb` no llegó, o un despliegue sin él), de modo que no es código muerto. **Los
444 triángulos son el presupuesto del RESPALDO y tienen nombre propio**,
`TRIANGULOS_DEL_RESPALDO_DE_LOS_DADOS` en `presupuesto-del-delta.ts`; el del modelo es
`TRIANGULOS_DE_LOS_DADOS_DEL_PACK = 2 · 662 = 1.324`, medido al compilar; y
`TRIANGULOS_DE_LOS_DADOS` es el MÁXIMO de los dos, que es lo que suma
`triangulosDeLaMesa`. No una u otra: la comprobación «`triangulosDeLaMesa` es lo que
pintan las geometrías de verdad» construye el respaldo con `three` Y cuenta el `.glb`
con `NodeIO` (una primitiva de 662 por dado), exige cada uno contra su constante y el
máximo contra la fórmula; si sumara sólo el modelo, el respaldo construido la pondría
roja sin que nada estuviera mal, y si sumara sólo el respaldo el tope dejaría de
vigilar lo que se pinta cuando el pack está (las vacunas E9 y E10 lo vieron caer por
los dos lados). El D6 del pack cuesta tres veces el respaldo y 880 más que él los dos,
más del techo de 574 (287 por dado) que la séptima dejaba bajo el tope de 3.600: como
estaba escrito para ese caso, **`TOPE_DE_LA_MESA` se rehízo con la cuenta y no a ojo**,
4.500 (`12 · 240 + 1.470 = 4.350`, 150 de margen; §1.10, §7).

**Dónde vive, y cómo llega a las dos pantallas.** El pack está descomprimido en
`arte/kaykit/board-game-bits/KayKit_BoardGameBits_1.0_FREE/`, la convención del
`arte/README.md` (una carpeta por pack con el zip tal cual dentro; el README lleva su
fila y de qué sale el dado), fuera de git por `arte/kaykit/` en `.gitignore`. El
compilado es **`escenas/modelos/dados.glb`** (19,3 kB, versionado), un fichero APARTE
de `tablero.glb`: el tablero pesa 4,3 MB y se cachea por promesa en las dos pantallas;
un dado de unos kB no debe obligar a recargar ni a recompilar el tablero, ni a pasar
por `compilar-modelos.ts`, que exige que lo que entra sea exactamente lo que
`nombresEnElGlb()` pide. Dentro va UN nodo, `dado`, con un nombre que pasa
`NOMBRE_QUE_SOBREVIVE` (`nombres.ts`: minúsculas, sin punto ni dos puntos, porque
`GLTFLoader` los borra al cargar); `MODELO.dado` lo nombra desde `nombres.ts` como a
las demás piezas, y **`EN_DADOS_GLB`** (el conjunto de los nombres de `MODELO` que
viven en `dados.glb`) lo saca de `nombresEnElGlb()` y lo deja en `todosLosNombres()`:
sin esa lista, meter el dado en `MODELO` habría hecho que `compilar-modelos.ts` se
negara a compilar el tablero («el código pide `dado` y aquí no se compila») y que
`verify:escena` marcara en rojo un `tablero.glb` correcto. La ruta que sigue es la del
tablero, leída en el código: los `.glb` NO pasan por Metro (en `app/metro.config.js` no
hay ningún `assetExts` ni resolutor para `.glb`; lo que hay es `watchFolders` para
`escenas/` y la copia única de `three` y `react`), sino por HTTP desde el servidor,
`RUTA_DE_MODELOS = '/api/arcade/modelos'` (`escenas/ruta-de-modelos.ts`), que
`server/src/routes/modelos.ts` sirve fichero a fichero con una ruta FIJA por modelo y
no un comodín sobre la carpeta. `dados.glb` tiene la suya,
**`/arcade/modelos/dados.glb`**, gemela de la de `embarcadero.glb` (misma caché de una
hora, mismo `model/gltf-binary`), y `ruta-de-modelos.ts` tiene `rutaDeLosDados()`;
`verify:mesa` la cubre con tres comprobaciones sobre el servidor de verdad (existe en el
repositorio; 200 con su tipo y su caché; los bytes del fichero real, que empiezan por
«glTF» y pesan menos de 100 kB), y su guardia pasó de un suelo de 100 a
`COMPROBACIONES_ESCRITAS = 856`.

**El mecanismo con que se pide: dos escalones, con sus nombres.** Lo que hay que
cumplir es esto: un 404 de `dados.glb` no puede tirar el tablero (con un `Promise.all` a
secas la app caería al respaldo SVG y el escritorio se quedaría sin delta por un fichero
de unos kB), no puede soltar la caché del tablero (las promesas cacheadas se SUELTAN
cuando fallan, a propósito, para que un túnel de treinta segundos no condene la partida
entera al respaldo: con los dos ficheros en la misma promesa, el fallo del dado
obligaría a volver a bajar los 4,3 MB en el siguiente montaje), y el dado tiene que
poder reintentarse solo. La séptima versión lo pedía en dos escalones y se contradecía
al contarlo; el código de la fase 3 hace los dos escalones, en las dos pantallas y en
el banco, y es esto:

1. **Una promesa recordada POR FICHERO, que se suelta sólo si falla ESE fichero.** En el
   escritorio, `recordada(traer)` (`riberas-en-tres.tsx` 340–351) devuelve una función
   que guarda la promesa en `enCamino` y le cuelga un `catch` que la pone a `null` si
   es la que falló; con ella se construyen `traerElTablero = recordada(() =>
   traerUnGlb(RUTA_DEL_TABLERO))` y `traerLosDados = recordada(() =>
   traerUnGlb(RUTA_DE_LOS_DADOS))` (368–369; `traerUnGlb` es `fetch` relativo más
   `GLTFLoader.parseAsync`, para que un 404 se lea como «contestó 404» y no como un
   `ProgressEvent` mudo). En la app, la misma `recordada` (`riberas-en-tres-escena.tsx`
   279–291) construye
   `tableroPrometido` (301–316, con el registro de `texturasDelTablero` cuando
   `!decodificaImagenes()`, que `verify:sala` exige literal) y `dadosPrometidos`
   (323–326, con un `GLTFLoader` pelado: el D6 va horneado y no hay textura que
   sustituir).
2. **La unión, con el fallo del dado tragado ANTES de juntar.** `traerElCatalogo()` en
   el escritorio (`riberas-en-tres.tsx` 381–388) y `catalogoDelTablero()` en la app
   (`riberas-en-tres-escena.tsx` 337–344) hacen lo mismo:
   `Promise.all([tablero, dados])` donde `dados` es `traerLosDados().catch(() => null)`
   (con un `console.warn`: «Los dados no han llegado (…): se pintan los del respaldo»,
   porque un respaldo mudo es un fallo que nadie ve), y `.then(([delTablero,
   deLosDados]) => unirCatalogos(delTablero, deLosDados))`. `unirCatalogos`
   (`escenas/modelos.ts`) ignora los `null` y funde los mapas; si dos ficheros trajeran
   el mismo nombre ganaría el último, y por eso `verify:dados` exige que el suyo traiga
   un solo nodo con un nombre que el tablero no usa.

Con eso el `Promise.all` sólo puede rechazar por el tablero, que es el único fallo que
la pantalla enseña; la promesa del tablero no se suelta por un 404 del dado (la
recordada de cada fichero sólo mira el suyo); y el dado se reintenta solo en el
siguiente montaje, porque su promesa CRUDA sí rechaza y `recordada` la suelta, aunque
la unión la haya tragado. El banco (`banco3d.tsx`, `useCatalogo`) carga los dos con
`loadAsync` y el mismo `catch` a `null` antes del `Promise.all`, para enseñar
exactamente lo que verá quien juegue si `dados.glb` no llega. `verify:escritorio` lo
exige por texto («cada fichero tiene su promesa recordada por separado…», «el fallo de
los dados no tira el tablero: su promesa lleva `.catch` a `null` antes del
`Promise.all`, y los catálogos se unen», y que la ruta sale de `rutaDeLosDados()`) y
`verify:sala` igual («con `Promise.all` a secas, un 404 de `dados.glb` deja al teléfono
sin delta»); las vacunas con el `.catch` quitado cayeron en los dos. El catálogo que
recibe `<Delta>` (`modelos: CatalogoDeModelos`, un `ReadonlyMap` que
`catalogoDeModelos` construye con los hijos directos de la escena) es esa UNIÓN, con
`dado` dentro si llegó, y `aplanados` de `Delta` recorre el catálogo entero, así que el
dado entra sin lista aparte; si no llegó, `Dados` pinta el respaldo y la partida no se
entera. Y como los demás modelos, se escala al instanciar, no al compilar.

En pantalla cada dado mide **23,3 puntos en el SE apaisado**, 26,2 en un Android de
360, 28,4 en un iPhone 14, 31,3 en un Pro Max, 55,9 en una tableta y 78,6 en un
monitor a 1080, con puntos de 4,2 a 14,2; como quinto hueco de pie, 23,8 en 390 de
ancho (`medir-dados-por-lienzo.ts`; la tabla entera y los umbrales, en la decisión 15).
El asa es UNA para los dos —una caja invisible por `colorWrite`, nunca por `visible`,
porque r3f descarta de sus sucesos los objetos invisibles— de `1,6 lados × 1 lado`
colgada (87×55 puntos en un iPhone 14, 72×45 en el SE) y de `1,12 × 1` como quinto
(51,3×45,8 en 390; §4.4); los cubos no reciben rayos (`raycast` nulo), para que el
hueco entre los dos no deje pasar el dedo al tablero. Es el mismo alto de asa que un
hueco de la barra, y por eso la misma comprobación de 44 lo cubre; la de legibilidad
(dado de 22 y punto de 4) va al lado desde la fase 3.

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

(Es la forma del código desde la fase 1, `riberas-en-tres.ts` 1034–1103: el sello viaja
ya calculado, y `de`/`colorDelTurno` NO van aquí; el tapete lee `turnoDe` y su color de
la vista, como el marcador. Desde la fase 3 `DadosEnTres` EXTIENDE `DadosDeLaMesa`, el
contrato que `<Delta>` recibe, definido en `escenas/dados.ts` (`VistaDeLosDados` más
`disponible`): la escena no importa nada de `shared/arcade`, `shared` ya importaba
tipos de `escenas/`, y así un campo que la escena pida mañana no se puede olvidar en
esta traducción sin que deje de compilar; `porTirar` es lo único de más y lo lee
`opcionesFueraDeLaMesa`, no la escena.) La pantalla lo compone así, y el orden es la
decisión 4 (`riberas-en-tres.tsx` 927–971; `riberas-en-tres-escena.tsx` 769–779 y
945–952, con los nombres reales):

```
haySitioParaLosDados = huecosDeLaMesa(cuantos, CAMPO_DE_LA_CAMARA, ancho / alto, alto).dados !== null
dados = haySitioParaLosDados ? dadosEnTres(vista, yo, opciones) : null      // opciones ENTERAS
        (y con `quieto`, { ...suyos, disponible: false })
fuera = opcionesFueraDeLaMesa(fueraDeLaBarra, dados)                        // TIRAR se cae con dados
```

`cuantos` es `barra.length + (mazo === null ? 0 : 1)`, como en la escena;
`CAMPO_DE_LA_CAMARA = 45°` está escrito en cada pantalla junto al `fov` del `Canvas` y
los comprobadores lo exigen; y la medida del lienzo en puntos es un `ResizeObserver`
sobre el recuadro (`medirElRecuadro`, estado `lienzo`) en el escritorio, que no tenía
ninguna a nivel de pantalla, y `medida` del `onLayout` en la app. Sin medida (`lienzo`
a 0) no hay dados y el botón se queda: degradación segura. `porTirar` sale de la lista
de opciones, no de rehacer la regla: es lo mismo que hace `mazoEnLaBarra` con COMPRAR.
Y **`disponible` es la ÚNICA bandera que la escena mira
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
  la primera tirada) enseñan 1 y 1 (`repartoDeLaTirada` devuelve `[1, 1]` para una suma
  que no se saca con dos dados) sin tapete: `tapeteApagado = dados !== null &&
  dados.ultimaTirada === 0` en `Barra` (hecho en la fase 3; la vacuna E17 lo vio caer).
  Sin dados el tapete se pinta en cuanto `turnoDe` tiene color, porque sin dados la
  escena no sabe si se ha tirado. El giro libre alrededor de la vertical con el que
  reposa cada dado es determinista: `giroDelDadoAsentado(indice, sello)`, el ángulo
  áureo por sello y algo más de un cuarto de vuelta para el segundo dado, para que los
  dos no salgan clavados iguales ni cada turno como el anterior, e igual en los cuatro
  aparatos.
- **Me toca y falta tirar** (`disponible`): VIBRAN. Patrón de 1,6 s:
  sacudida de 0,36 s a 8 Hz con envolvente senoidal, y el resto quietos; se mueven
  el 21 % del tiempo, diez avisos en dieciséis segundos (`medir-dado.ts`). Amplitud:
  3 % del lado en traslación —1,35 puntos en el SE, 1,6 en un iPhone 14, 4,5 en un
  monitor a 1080 (`medir-con-014.ts`)— y 4° de giro. Es un temblor que se ve en el
  rabillo del ojo y no un bote: la barra ya enseñó que «cuatro cosas moviéndose en el
  borde del ojo mientras se mira el tablero» molestan (`GIRO_DE_LA_VITRINA`). A nadie
  más le vibra nada: `disponible` es falso para los demás, y la vibración lee esa
  misma bandera y ninguna otra.
- **Rodando:** giro sobre dos ejes con velocidad decreciente (`anguloRodado`: arranca a
  dos vueltas por segundo, `VELOCIDAD_DE_GIRO = 4π`, y frena como `1 / (1 + t /
  FRENO_DEL_GIRO)` con el freno a 0,5, así que el ángulo crece como un logaritmo y no se
  clava esperando al servidor: 4,95 rad a los 0,6 s, 16,1 rad a los 6 s del tope) y un
  salto de `0,2 lados` (`saltoDelDado`: un arco que sube a mitad del rodar mínimo y
  vuelve al suelo al cumplirse; si la respuesta tarda, el dado sigue girando en el
  suelo sin volver a saltar); mínimo 0,6 s. **Rodar parte de la última pose real del
  dado fuera de rodar** (el ref `enReposo` de `Dados`, copiado en cada fotograma de
  «quieta» ANTES del temblor, y al final de cada fotograma de «asentando» por si otra
  tirada llega a mitad del asentado), no del par anterior recalculado con el sello
  visto: eso daba un cuarto o media vuelta seca sobre la vertical en el primer
  fotograma, porque cuando la tirada de otro colono cambia la fase y el sello en el
  mismo tic, el sello visto ya es el nuevo (la vuelta 3b lo encontró y lo arregló; la
  copia en «asentando» la pidió su revisión). `verify:escena` lo afirma por texto
  («rodar parte de la última pose real fuera de rodar (enReposo…) y no recalcula el
  par anterior con el sello visto»).
- **Asentando:** `slerp` desde el giro con el que el dado dejó de rodar (el ref
  `alDejarDeRodar`, escrito en cada fotograma de «rodando») al cuaternión del valor,
  con `avanceDelAsentado` (`1 − (1 − t)³` en 0,35 s, la misma curva que las piezas: sale
  rápido y frena al llegar), y el rebote es de POSICIÓN, no del cuaternión:
  `reboteDelDado`, un salto chico de `REBOTE_DEL_DADO = 0,04` lados con un seno en el
  último tercio que acaba en el suelo. La séptima decía «con el rebote del
  `Asentamiento`»; extrapolar un `slerp` más allá de 1 gira el dado hacia una cara que
  no es y se ve como un dado que se lo piensa. El cuaternión del valor lo da
  `cuaternionDelValor(valor, giro)` (`cubo-del-dado.ts`): lleva `NORMAL_DEL_VALOR` de la
  cara del valor a +Y del mundo y gira `giro` alrededor de esa vertical; vale para el
  modelo y para el respaldo porque los dos ponen cada valor en la misma cara, y
  `valorQueMiraArriba` lo lee de vuelta (`verify:escena`: los seis valores y cuatro
  giros, ida y vuelta; la revisión de la fase 3 giró además los 521 vértices del `.glb`
  con esos cuaterniones y contó las islas oscuras que quedaban arriba: siempre `v`
  arriba y `7 − v` abajo, 42 de 42).

### 5.3. El toque y la máquina

Tocar el asa (`alTocar` en `Dados`, `delta.tsx` 1942–1952: `noEsElPrimario` →
`stopPropagation` → `loCogeLaInterfaz` → si `!dados.disponible` se acaba → `tocado` a la
cola → `onPulsar()`) y la pantalla manda la opción TIRAR por `mesa.mover`, la misma
puerta que el botón: `alPulsarLosDados` en las dos pantallas (`riberas-en-tres.tsx`
962–971; `riberas-en-tres-escena.tsx` 945–952, donde `laInterfazSeLoQueda()` va LA
PRIMERA, como en `alTomarDeLaBarra`, y va ANTES de `alPulsarElMazo` porque `verify:sala`
lee que entre ese manejador y su cierre no se manda ningún movimiento) busca la opción
con `tirarEnTres(opciones)` (`shared`, como `comprarEnTres`: la opción entera que dio el
juego, con su `tipo` y su `carga`, y no un movimiento montado a mano; la vacuna S6 con
`{ tipo: 'riberas:tirar', carga: {} }` escrito cayó), suelta lo cogido, y con `quieto` o
sin TIRAR contesta `'rechazado'` sin mandar nada. La escena no sabe que eso es tirar:
es «el hueco que se pulsa», como el naipe del mazo.

`mover` devuelve su promesa desde la fase 1 (`8371080`): era `(movimiento) => void`
con un `void (async () => {...})()` dentro; devuelve esa misma promesa, resuelta a
`ResultadoDelMovimiento = 'hecho' | 'rechazado' | 'sin-red'` con lo que el cuerpo ya
sabe. La tabla entera, sin dejarse ninguna salida del cuerpo:

| Salida de `mover` (`app/src/arcade/mesa.ts` desde 720, `escritorio/src/mesa.ts` desde 692) | Resuelve |
|---|---|
| El `return` temprano —`if (donde === null \|\| rev === undefined) return 'rechazado';` (725 / 697)—: sin código de mesa o sin `rev`, no se manda nada | `'rechazado'` (la mesa está igual que estaba; nada rodó por el cable) |
| `r.ok`, `rev` subió y el juego no dijo nada | `'hecho'` |
| `!r.ok`; o `seIgnoro` (`r.ok` con el mismo `rev`); o **el juego devolvió un motivo** —`r.ok` con `datos.mesa.motivo`, `loQueDijoElJuego.length > 0`: un rechazo con palabras, que la mesa ya enseña como aviso— | `'rechazado'`. Es una sola línea: `return !r.ok \|\| seIgnoro \|\| loQueDijoElJuego.length > 0 ? 'rechazado' : 'hecho'` (812 / 754) |
| El `catch` (815 / 757) | `'sin-red'` |

Nadie más la lee: los demás sitios siguen llamándola sin `await`. **Quien traduce los
tres valores a suceso es la ESCENA, no la pantalla**, y es un cambio respecto de la
séptima: la pantalla sólo DEVUELVE la promesa de `mover` por `onPulsarLosDados`
(`() => Promise<ResultadoDelToque>`, con `ResultadoDelToque` escrito otra vez en
`escenas/dados.ts` con los mismos tres valores, porque la escena no puede importar de
un cliente: si `mover` gana un cuarto valor, la pantalla deja de compilar al pasárselo),
y `Dados` la traduce con `sucesoDelResultado` (`escenas/dados.ts`), que es el `switch`
sin `default` sobre la unión, de modo que un cuarto valor no compile: `'hecho'` no
empuja nada (la vista traerá la tirada); `'rechazado'` y `'sin-red'` empujan
`rechazado` a la cola de la máquina, porque en los dos casos la mesa no cambió y no va
a llegar ninguna tirada mía (`verify:escena`: «la respuesta de mover se traduce a la
máquina exhaustivamente…»; la vacuna E5, con `sin-red` sin empujar nada, cayó). El
`useFrame` de los dados vacía esa cola, en orden y con el reloj de la escena, antes de
cada `tic`. Los 6 s de la máquina (más abajo) quedan para la única salida que no está
en la tabla: una petición que no vuelve nunca, ni bien ni mal ni con error.

La máquina vive en `escenas/dados.ts`, pura, con el reloj inyectado, como `gestos.ts`
del Muelle, y se comprueba en Node:

```
faseDeLosDados(estado, suceso, ahora) → estado
sucesos: { que: 'tocado' } | { que: 'vista', vista: { tirado, ultimaTirada, sello } }
       | { que: 'rechazado' } | { que: 'tic' }
estados: quieta(par) | rodando(desde, objetivo | null, anterior) | asentando(desde, par)
```

(La forma es la del código desde la fase 1, `escenas/dados.ts` 334–342 y 413–457: la
máquina no lee `turnosAbiertos` a secas, recibe el `sello` ya calculado por
`dadosEnTres`, y `rodando` guarda el par `anterior` al que vuelve si la tirada no llega,
y con objetivo guarda `llegoEn`, el instante en que llegó.)

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
  a `asentando` en `max(desde + 0,6, ahora)` (si ese instante ya llegó, a `asentando`
  en el acto); en `quieta` Y en `asentando` —la tirada es de otro, o la mía llegó sin
  que yo tocara (dos pestañas), o son dos tiradas seguidas en menos de 0,35 s y la
  segunda entra con la primera aún asentándose— se pasa a `rodando(ahora, objetivo)`
  con `anterior` = el par que se estaba enseñando (`parQueSeEnsena(fase)`: en
  `asentando`, el par al que iba). Es lo que hace `escenas/dados.ts` (426–443), y
  gana.
- Tirada nueva es: `tirado` pasa de falso a verdadero; o `tirado` es verdadero y
  cambia el `sello` o `ultimaTirada` respecto de la última vista (dos movimientos
  entre dos vueltas del sondeo). La PRIMERA vista nunca lo es: al montar o al
  recargar, lo que hay en la mesa es noticia vieja y se enseña en reposo
  (`traeTiradaNueva`, 391–394). Si el `sello` cambia con `tirado` falso, la tirada
  del turno anterior se perdió entre sondeos: se enseña el par nuevo en reposo, sin
  animar, porque ya es noticia vieja.
- El par lo da `repartoDeLaTirada(suma, sello, semilla)` con el sello de la decisión
  3. No hay ningún caso en que un aparato vea otro par que sus vecinos: el sello sale
  de tres números que viajan en la vista o se derivan del código de la mesa.
- `rodando` sin objetivo más de 6 s → `quieta(par anterior)`. Ya sólo pasa cuando la
  petición no ha vuelto ni bien, ni mal, ni con error: `'sin-red'` también empuja
  `rechazado` (tabla del §5.3), así que un fallo de red que se sabe corta en el acto.
- Cada `tic` es un `useFrame`: primero vacía la cola (`tocado`, `rechazado`, `vista`)
  en orden con el mismo reloj, después el `tic`, y escribe posición y cuaternión de los
  dos grupos de cubo. Nada cruza el estado de React: la máquina, la cola y los
  cuaterniones viven en refs de `Dados`; la vista entra en la cola desde un `useEffect`
  sobre `(tirado, ultimaTirada, sello)`, y otra semilla (otra mesa) vuelve la máquina al
  reposo y la vista de ahora la coloca.

La máquina no sabe cuántos dados hay: con los dos de la decisión 3 el `tic` escribe dos
grupos y `repartoDeLaTirada` devuelve un par. `verify:escena` la recorre en Node
(«tocar en reposo arranca a rodar SIN objetivo», «la vista que llega a 0,2 / 0,6 / 1,4
/ 3,0 s asienta desde 0,6 / 0,6 / 1,4 / 3,0…», «un rechazo mientras rueda sin objetivo
devuelve los dados al par anterior EN EL ACTO», «sin respuesta ninguna, los dados se
rinden a los seis segundos y no antes», y las demás del paso «Los dados se reparten por
turno, ruedan hasta que el servidor contesta…»). Lo que se miró en el banco está en el
§11 (fase 3).

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
  puntos en un iPhone 14, hasta que el punto más alto (el asa, a 0,5 lados sobre el
  centro del hueco, §1.2; la pieza tomada en lo alto de su bote, 0,516, no cuenta,
  porque recoger suelta lo cogido; el naipe se queda en 0,31) queda bajo el canto.
  Objetivo más interpolación amortiguada en el `useFrame` del grupo, 0,28 s; al
  llegar, `visible = false`, que además saca sus asas de los sucesos de r3f. Lo que la
  fase 3 le deja a ésta: `Dados` vive DENTRO de `Barra` (hermano de `PiezaEnLaBarra` y
  `MazoEnLaBarra`, colocado en el sitio de los dados) y su máquina y su cola viven en
  refs del componente. Si la fase 4 mueve el grupo y lo apaga con `visible`, la máquina
  sigue viva y una tirada que llegue con la mesa recogida se asienta a ciegas; si la
  desmonta, la máquina vuelve al reposo (`dadosEnReposo`) y esa tirada se enseña en
  reposo al subir, sin animar, que es lo que `traeTiradaNueva` hace con la primera
  vista. Las dos cosas son aceptables; lo que no vale es no elegir: si se quiere que
  una tirada recibida con la mesa recogida se anime al subir, hay que mantener `Dados`
  montado. La entrada `mesaRecogida` de `<Delta>` no existe todavía.
- **Qué NO baja:** las dos manos. No están sobre la mesa —una mano de cartas se
  sostiene— y en apaisado viven en los costados, que no es lo que se quiere despejar.
  Recoger la mesa suelta lo cogido (en la app, `soltarTodo`, `riberas-en-tres-escena.tsx`
  646: pone a `null` la tomada, lo que se coloca, `cogida`, `cogidaDelMazo`, `aQuien`,
  `comoJugarla` y `comprando`, siete estados): una pieza en la mano con la barra fuera de la pantalla no tiene a
  dónde volver. En el escritorio NO hay `soltarTodo`: `ponerCogida(null)` está escrito
  seis veces (`riberas-en-tres.tsx` 889, 967, 987, 1028, 1056 y 1119) y el naipe del
  mazo tiene su propio estado, `cartaDelMazo` (878; `cartaDelMazoCogida={cartaDelMazo}`
  en 1325); lo más parecido es el efecto de `rev` (887–892), que pone a `null` la
  tomada, `cogida`, `cartaDelMazo` y `preguntando` (cuatro llamadas: soltar por ahí
  suelta también la pregunta abierta). La fase 4 elige: o le escribe un `soltarTodo` que
  recoja esas seis llamadas, o la bajada suelta con las cuatro llamadas que ya hace ese
  efecto. La bajada medida: 72 puntos en el SE, 88 en un iPhone 14, 243 en un monitor a 1080
  (`medir-tapa-horizontal.ts`).
- **Las áreas de toque:** se van con el grupo; un rayo desde un puntero dentro del
  lienzo no cruza geometría que está por debajo del canto, y con `visible = false`
  r3f ni las mira.
- **El estado** vive en la pantalla (`useState` en `LaMesaEnTres` / `RiberasEnTres`),
  no se guarda: una partida nueva empieza con la mesa puesta. Y se saca sola cuando
  pasa a tocarme (`meToca` pasa de falso a verdadero; decisión 16 del §1, cerrada por
  Miguel): recoger es para mirar, y cuando
  hay que actuar la mesa vuelve. Si la recojo en mi propio turno, se queda recogida
  hasta que yo diga. **Con algo cogido no sale sola:** si en ese instante hay una
  carta en la mano (en la app `cogida` o `cogidaDelMazo`, `riberas-en-tres-escena.tsx`
  640–641; en el escritorio `cogida` o `cartaDelMazo`, `riberas-en-tres.tsx` 876 y 878;
  una pieza de la barra no puede estarlo, la mesa recogida no tiene de dónde cogerla), la
  salida espera a que se suelte o se coloque. Una mesa que sube debajo de un arrastre
  cambiaría lo que hay bajo el dedo a mitad de gesto. Como la pantalla ya suelta todo al
  cambiar `rev` (`riberas-en-tres-escena.tsx` 656; en el escritorio, `riberas-en-tres.tsx`
  887–892), la espera dura lo que dure el gesto.
- **La cámara** no cambia (§1.9).

## 7. El presupuesto

Medido con `three` en Node (`medir-tapa-horizontal.ts` y `medir-triangulos.ts`; desde la
fase 2, `verify:escena` construye las geometrías de `tablon.ts` con el `three` de
verdad y cuenta sus índices contra la fórmula), y comparado con lo único que antes
tenía cota:

| Qué | Triángulos | Llamadas |
|---|---|---|
| La barra de antes: poblado 1.011 + ciudad 5.659 + puente 604 (leídos del `.glb`), 4 zócalos × 24, 4 asas × 12, placa 2, naipe (filo, cuerpo, icono de 16) | ≈ 7.450 | ≈ 16 |
| Tapa horizontal 96×6 (679 vértices), sin canto | 1.152 | 1 |
| Tapa a 240×6 (monitor) | 2.880 | 1 |
| Dos dados, el D6 del pack (`dados.glb`, §5.1): `TRIANGULOS_DE_LOS_DADOS_DEL_PACK` | 1.324 (662 por dado, una primitiva cada uno, contados con `NodeIO` por `verify:escena` y exigidos exactos por `verify:dados`) | 2 (una por dado) |
| Dos dados, el respaldo procedimental de `cubo-del-dado.ts` (12 + 210 cada uno, puntos fundidos): `TRIANGULOS_DEL_RESPALDO_DE_LOS_DADOS` | 444 | 4 |
| Lo que entra en la cuenta: `TRIANGULOS_DE_LOS_DADOS = max(1.324, 444)` | 1.324 | |
| Asa de los dados (una caja invisible por `colorWrite`) | 12 | 1 |
| Tapete del turno | 2 | 1 |
| Seis sombras de contacto fundidas (cuatro huecos más dos dados, desde la fase 3) | 120 | 1 |
| Pila del mazo (una caja escalada; fase 7, ya contada) | 12 | 1 |
| **Nuevo, total (= `triangulosDeLaMesa(seg)` = 12 · seg + 1.470)** | **2.622 – 4.350** | **+7 con el pack (+9 con el respaldo), −1 de la placa** |
| El mar (`TRIANGULOS_DEL_MAR`) | 23.328 | 1 |

La mesa entera cuesta entre el 11,2 % y el 18,6 % del mar en triángulos (el 9,6 % con
64 segmentos, el mínimo: 2.238); en llamadas, la barra pasa de unas 16 a unas 22 con el
pack (24 con el respaldo). La `pointLight` no es una llamada pero sí coste por
fragmento en todo material iluminado; sigue habiendo dos (barra y baraja), ninguna
nueva. `TOPE_DE_LA_MESA = 4_500` en `presupuesto-del-delta.ts`, con
`triangulosDeLaMesa(segmentos)` al lado para que el número salga de la misma cuenta en
la escena y en el comprobador, y 150 de margen a 240 segmentos; hasta la fase 3 era
3.600 con la cuenta del respaldo (`12 · seg + 590`, 1.742 a 3.470), y se rehízo con la
del pack (§1.10). La comprobación «`triangulosDeLaMesa` es lo que pintan las geometrías
de verdad: tapa + seis sombras + tapete + el máximo de los dos dados (respaldo
construido, pack contado del glb) + asa + pila, con 64, 96, 106 y 240 segmentos» lo
afirma construyéndolas (las de la mesa, de `tablon.ts`; las del respaldo, de
`cubo-del-dado.ts`; el `.glb`, contado), otra afirma «los dos dados cuestan el MÁXIMO
del respaldo (444) y del D6 del pack (1.324)», otra que el tope es menos de la quinta
parte del mar (era la sexta parte: 4.500 supera 23.328 / 6 = 3.888, y el tope lo fijó
la cuenta), y otra afirma sobre el texto de `delta.tsx` que `Barra` llama a ESAS
funciones con `segmentosDeLaMesa(forma.ancho)` y `FILAS_DE_LA_MESA`. La escena pinta el
pack o el respaldo, nunca los dos: en el banco, 2.000.500 triángulos y 1.279 llamadas
en reposo con el tablero entero, 2.000.502 y 1.280 tras la primera tirada (el tapete).
`verify:escena` hace hoy 335 comprobaciones, con el guardia de «no se han hecho todas»
puesto a ese número (307 tras la fase 2, 332 tras la fase 3 y 335 tras la vuelta 3b).

**Texto en el lienzo:** una cifra compilada cuesta de 8 (el «4») a 160 (el «8»)
triángulos, 60 de media, y una llamada. Un marcador de cuatro colonos con dos cifras
cada uno más el mazo serían 540 triángulos y 9 llamadas —barato— pero no hay 0, 1 ni
7, no hay letras, y no se oye. Por eso el §1.7: los números van fuera. Dentro no se
compila ninguna cifra nueva.

## 8. Dónde vive cada cosa

Las líneas que cita este documento (de `delta.tsx`, de las dos pantallas, de `shared`
y de las dos `mesa.ts`) son las del commit `b216fbc` (la fase 3 aterrizada); las de la
séptima versión eran de `4287809` y las de la sexta de `c9faef3`, y ya no valen; la
octava dejó una docena larga en las de `4287809` sin verlo, y desde la novena se cotejan
TODAS con `comprobar-citas-de-linea.ts` (§9) antes de cerrar una pasada. Donde se puede
se cita por NOMBRE de función o de constante, y los comprobadores se citan por
el nombre de sus comprobaciones y nunca por línea. Cada fila dice qué está HECHO y en
qué fase (`8371080` la 1, `4287809` la 2, `b216fbc` la 3) y qué queda pendiente y de
qué fase; nada de lo que ya existe se manda escribir.

| Fichero | Qué |
|---|---|
| `escenas/barra.ts` | HECHO (fase 1): `PARTE_DEL_ALTO` 0,14; `SUELO_DEL_TOQUE = 44` exportado; `huecosDeLaMesa(cuantos, campo, proporcion, altoEnPuntos)` con los tres peldaños; la cabecera de `ANCHO_MAXIMO` reescrita. HECHO (fase 2): `ZOCALO` (`centro` 0,42, `alto` 0,12, `radio` 0,5) y `cotaDeLaTapa(hueco)`, la cara de abajo del zócalo, aquí y no en `delta.tsx` para que quien pinta el zócalo y quien calcula la cota lean los mismos tres números. HECHO (fase 3, vuelta 3b): importa `ANCHO_DEL_PAR_DE_DADOS` de `dados.ts` (sin ciclo: `dados.ts` sólo importa `revoltijo`); el quinto reserva `max(lado, ANCHO_DEL_PAR_DE_DADOS · lado)` y crece hacia la izquierda desde el borde derecho del hueco de un lado (§4.4); `HuecoDeLosDados` con `ancho`, `alto`, `lado` y `forma`, y su cabecera contando el porqué; `ANCHO_DEL_ASA_DE_LOS_DADOS = 1,6`. Pendiente: nada |
| `escenas/mesa.ts` (sin `three`) | HECHO (fase 2): `vetaDelTablon`, `coloresDeLaMadera` (los dos colores leídos del atlas), `aLineal`, `mezcla`; `tapaDeLaMesa(hueco, campo, proporcion)` con `TRAS_EL_ZOCALO` 0,6, `ANCHO_DE_MAS_DE_LA_TAPA` 1,08 y `HOLGURA_DELANTERA_DE_LA_TAPA` 0,1; `coloresDelPosavasos()` con `POSAVASOS_SOBRE_LA_MADERA_OSCURA = { reposo: 0,7, encima: 0,85 }` y `oscurecido`; `colorDelColono(color)`, leído de la celda del jugador del atlas; `hexDe` |
| `escenas/tablon.ts` (CON `three`, sin React) | HECHO (fase 2): `geometriaDeLaTapa(segmentos, filas, ancho, fondo, madera)` (un `PlaneGeometry` tumbado con la veta en el atributo `color`), `geometriaDeLasSombras(centros)` (los discos fundidos a mano, alfa en el vértice), `geometriaDelTapete(ancho, fondo)`, `triangulosDe(geometria)`, `maderaEnLineal`, y `SEGMENTOS_DE_LA_SOMBRA` 20, `ALFA_DE_LA_SOMBRA` 0,35, `RADIO_DE_LA_SOMBRA` 0,62, `SOBRE_LA_TAPA` 0,002, `RUGOSIDAD_DE_LA_MADERA` 0,8, `FONDO_DEL_TAPETE` 0,8, `OPACIDAD_DEL_TAPETE` 0,55. Sueltas para que `verify:escena` las construya y cuente |
| `escenas/capas.ts` (sin `three`, sin React) | HECHO (fase 2): las cinco constantes de capa, `ORDEN_DE_LA_BARRA` 1000, `ORDEN_DE_LAS_CARTAS` 1010, `ORDEN_DE_LAS_AREAS` 2000, `ORDEN_DE_LAS_CARTAS_DEL_MAZO` 3000, `ORDEN_DE_LAS_CASILLAS` 4000, que ya NO viven en `delta.tsx`; su cabecera cuenta la regla del grupo más cercano, que no hay borrado de profundidad, el límite conocido y por qué los testigos nunca corrieron |
| `escenas/scripts/arbol-de-la-mesa.ts` | HECHO (fase 2): el modelo del árbol de `delta.tsx` con las constantes de `capas.ts` y las posiciones importadas (`arbolDeLaMesa`), el pintor (`ordenDeDibujo`: el `projectObject` de `three` 0.185.1 con la poda por frustum y el `WebGLRenderLists` real) y el juez (`fallosDelOrden`); suelto imprime la lista del iPhone 14. HECHO (fase 3): la rama CON dados de `Barra` (`huecosDeLaMesa(4, …)`), el grupo `Dados` con su asa invisible y un grupo por cubo con `barra:DADO 0/1` opacos, las seis sombras con el radio del dado, y el tapete donde hay sitio (colgado o quinto) |
| `escenas/dados.ts` (sin `three`) | HECHO (fase 1): `CANAL_DEL_REPARTO`, `paresDeLaSuma`, `repartoDeLaTirada(suma, sello, semilla)`, `VistaDeLosDados`, `FaseDeLosDados`, `EstadoDeLosDados`, `SucesoDeLosDados`, `dadosEnReposo`, `parQueSeEnsena`, `traeTiradaNueva`, `faseDeLosDados` con `rechazado`, `RODAR_MINIMO` 0,6, `ASENTAR` 0,35, `TOPE_SIN_RESPUESTA` 6. HECHO (fase 3): `ARISTA_DEL_D6_EN_EL_PACK = 0,75`; `COLOR_DEL_NUMERO` `#efe6cd` y `COLOR_DEL_PUNTO` `#2a2118` (antes en `delta.tsx`, que ahora los importa); `ARISTA_DEL_DADO` 0,52, `HUECO_ENTRE_DADOS` 0,08, `ANCHO_DEL_PAR_DE_DADOS` 1,12, `PUNTO_DEL_DADO` 0,18, `DADO_MINIMO` 22, `PUNTO_MINIMO` 4, `CENTRO_DEL_DADO_SOBRE_LA_TAPA` (media arista), `SALTO_DEL_DADO` 0,2, `RADIO_DE_LA_SOMBRA_DEL_DADO` 0,32, `centroDelDado(i)`; el contrato `DadosDeLaMesa` (lo que recibe `<Delta>`; `DadosEnTres` de `shared` lo extiende), `ResultadoDelToque` y `sucesoDelResultado` (el `switch` exhaustivo del §5.3); las curvas puras `SACUDIDA` y `sacudida(t)`, `saltoDelDado`, `anguloRodado` (`VELOCIDAD_DE_GIRO` 4π, `FRENO_DEL_GIRO` 0,5), `avanceDelAsentado`, `REBOTE_DEL_DADO` 0,04 y `reboteDelDado`, `giroDelDadoAsentado(indice, sello)`. `selloDeLaTirada` NO está aquí: vive en `shared/…/riberas-en-tres.ts` al lado de `dadosEnTres`, que es quien lo calcula (§5.2). Pendiente: nada |
| `escenas/cubo-del-dado.ts` (CON `three`, sin React) | HECHO (fase 3): el respaldo procedimental suelto para poder construirse y contarse: `geometriaDelCuerpoDelDado(arista)`, `geometriaDeLosPuntosDelDado(arista)` con `SEGMENTOS_DEL_PUNTO` 10, `PASO_DE_LOS_PUNTOS` 0,27, `PUNTO_SOBRE_LA_CARA` 0,004, `PUNTOS_DEL_VALOR` y cada valor en la cara de `CARA_DEL_VALOR`; `cuaternionDelValor(valor, giro)` y `valorQueMiraArriba(cuaternion)` (§5.1, §5.2) |
| `escenas/caras-del-dado.ts` (GENERADO por `compilar-dados.ts`, sin importaciones) | HECHO (fase 3): `CARA_DEL_VALOR` `{1: '-y', 2: '+x', 3: '+z', 4: '-z', 5: '-x', 6: '+y'}`, `NORMAL_DEL_VALOR`, `normalDelValor()`, y los tipos `CaraDelDado` y `ValorDelDado`. No se edita a mano: `verify:dados` lo regenera desde el `.glb` y lo compara byte a byte |
| `escenas/scripts/caras-del-d6.ts` | HECHO (fase 3): la medida compartida por el compilador y el comprobador: `cuentaLosPuntos(prim, esPunto)` (unión-hallazgo por aristas de triángulo, cara por el eje de mayor valor absoluto, y cuántos vértices de punto tienen la normal en otra cara), `problemasDeUnDado` (1..6 una vez, 21, opuestas 7), `caraDeCadaValor`, `normalDeLaCara`, `textoDeCarasDelDado` (determinista; lanza si la cuenta no es un dado) |
| `escenas/presupuesto-del-delta.ts` | HECHO (fase 2): `SEGMENTOS_DE_LA_MESA` (mín 64, máx 240, 8 puntos por segmento), `FILAS_DE_LA_MESA` 6, `segmentosDeLaMesa(anchoEnPuntos)`, `triangulosDeLaMesa`. HECHO (fase 3): `TRIANGULOS_DEL_RESPALDO_DE_LOS_DADOS` 444 exportada, `TRIANGULOS_DE_LOS_DADOS_DEL_PACK` 1.324, `TRIANGULOS_DE_LOS_DADOS` el máximo, `TRIANGULOS_FIJOS_DE_LA_MESA` 1.470, `triangulosDeLaMesa = 12 · seg + 1.470`, `TOPE_DE_LA_MESA` 4.500 con la cuenta en su cabecera (§1.10, §7) |
| `escenas/nombres.ts` | HECHO (fase 3): `MODELO.dado = 'dado'`, que pasa `NOMBRE_QUE_SOBREVIVE`; `EN_DADOS_GLB`, los nombres de `MODELO` que viven en `dados.glb`; `nombresEnElGlb()` los excluye y `todosLosNombres()` los incluye (§5.1) |
| `escenas/modelos.ts` | HECHO (fase 3): `unirCatalogos(...catalogos | null)`, la unión de los dos ficheros en un `CatalogoDeModelos`, con los `null` ignorados |
| `escenas/ruta-de-modelos.ts` | HECHO (fase 3): `rutaDeLosDados()` al lado de `rutaDelTablero()`: `${RUTA_DE_MODELOS}/dados.glb` |
| `escenas/scripts/compilar-dados.ts` y `escenas/scripts/verificar-dados.ts`, `compilar:dados` y `verify:dados` en `escenas/package.json`; `escenas/scripts/hornear.ts` | HECHO (fase 3). El compilador lee `D6_A.gltf` con el `NodeIO` de `escritorDeGlb()` (atributos separados), exige un solo nodo, malla, primitiva y material con `POSITION`, `NORMAL` y `TEXCOORD_0`, mide la caja y la contrasta con `ARISTA_DEL_D6_EN_EL_PACK` al 1 % (`exigeElCubo`), hornea con `horneaLaPrimitiva`, remapea por luminancia (`remapea`: umbral 0,25, factor 2 de hueco, o se niega), cuenta los puntos por cara con `caras-del-d6.ts` y exige un dado, renombra nodo, malla y material a `MODELO.dado`, `desnudaElMaterial`, `dedup` y `prune` SIN `weld`, un solo búfer, y escribe `dados.glb` y `caras-del-dado.ts` (§5.1). El comprobador: 27 comprobaciones con su guardia a 27 (la lista, en el §5.1). `hornear.ts` exporta `byteLinealDeSrgb` (misma curva y redondeo que el horno) para que el compilador escriba el crema y el oscuro en el mismo espacio que lo horneado; `verify:dados` NO la usa: escribe su propia curva |
| `escenas/modelos/dados.glb` (versionado como `tablero.glb`) | HECHO (fase 3): el `D6_A` horneado y remapeado, un nodo `dado`, 521 vértices, 662 triángulos, a la unidad del pack, 19,3 kB |
| `server/src/routes/modelos.ts` | HECHO (fase 3): la ruta fija `/arcade/modelos/dados.glb`, gemela de la de `embarcadero.glb`: nombre fijo, sin comodín, misma caché |
| `server/scripts/verificar-mesa.ts` | HECHO (fase 3): tres comprobaciones de `dados.glb` sobre el servidor de verdad (existe en el repositorio; 200 con `model/gltf-binary` y `max-age=3600`; los bytes del fichero real, firma «glTF», menos de 100 kB), y el guardia de un suelo de 100 a `COMPROBACIONES_ESCRITAS = 856` |
| `scripts/verificar-todo.mjs` | HECHO (fase 3): la entrada «dados» (`verify:dados` en `escenas`) detrás de «aventureros», con su porqué |
| `arte/README.md` | HECHO (fase 3): la fila del pack Board Game Bits en la tabla, la carpeta `arte/kaykit/board-game-bits/`, de qué salen los dados y por qué el compilador se niega si los puntos no son geometría; la frase del atlas y las texturas corregida (el pack MEZCLA un atlas de gradiente con texturas individuales, y los aventureros van cada uno con la suya y sin atlas). La octava añade qué D6 entra y cuáles se descartan |
| `escenas/cartas.ts` | HECHO (fases 1 y 2): sólo las dos frases que citan el techo de la barra, que hablan ya del asa y del bote (`−0,273·alto`, §1.2); ninguna constante |
| `escenas/baraja.ts` | Nada |
| `escenas/cinta.ts` (NUEVO, sin `three`) | Pendiente (fase 5): `anchoDeLaCinta(ancho, alto)`: el tercio en apaisado, el 40 % de pie (§2.2) |
| `escenas/delta.tsx` | HECHO (fase 2, `4287809`): `Barra` (firma en 1506, cabecera 1396–1505) pinta la tapa con `tapaDeLaMesa` del primer hueco y `geometriaDeLaTapa(segmentos, FILAS_DE_LA_MESA, tapa.ancho, tapa.fondo, madera)`, las sombras con `geometriaDeLasSombras`, el tapete con `geometriaDelTapete`, y la `pointLight` de siempre; la tapa lleva `onPointerDown/Up/Move/Over` con `paraElToque` (sólo `e.stopPropagation()`) y `onPointerOut` con `nadaAlSalir`; los DOS testigos QUITADOS y ningún `clearDepth`; los zócalos con `ZOCALO` (1222–1224, 1352–1354) y con `coloresDelPosavasos()` (278); la entrada `turnoDe` de `<Delta>` (2920), que `Barra` recibe como `tapete` (3544); la placa fuera; las cabeceras de `Barra`, de la carta y de `ManoDelMazo` reescritas. HECHO (fase 3, `b216fbc`): la constante de su capa en los TRECE `<group>` de la tabla del §4.1 (los diez de dentro y los tres exteriores; líneas en la tabla); las entradas `dados?: DadosDeLaMesa | null` y `onPulsarLosDados?: () => Promise<ResultadoDelToque>` de `<Delta>`, opcionales, y `Barra` recibe `dados`, `semilla` y `onPulsarLosDados` (3545–3550: sin quien conteste, `Promise.resolve('rechazado')`); la llave del reparto en `dados !== null` (1584–1630, §4.4); `tapeteApagado` con `ultimaTirada === 0`; las sombras de los dados añadidas a la lista de centros (1636–1648); `function Dados(` (1803–1998): grupo del sitio y un grupo por cubo con `ORDEN_DE_LA_BARRA`, asa única invisible por `colorWrite`, `alTocar` con el orden del §5.3, la máquina, la cola y los cuaterniones en refs, `enReposo` y `alDejarDeRodar`, el D6 del pack (`aplanados.get(MODELO.dado)`, escalado con `escalaDelPack`) o el respaldo de `cubo-del-dado.ts`, con `raycast` nulo en los cubos; `COLOR_DEL_NUMERO` y `COLOR_DEL_PUNTO` importados de `dados.ts`. Pendiente (fase 4): la entrada `mesaRecogida` y la bajada del grupo (§6) |
| `escenas/scripts/verificar-escena.ts` | HECHO (fases 1 y 2): UNA lista `LIENZOS` (quince: los seis de siempre, 768×1024 y los ocho apaisados; `Array<[string, number, number]>` en la cabecera del guion) para todos los bloques; el reparto por turno y la máquina recorridos en Node; «la mano del mazo no invade la zona de la barra» contra `0,52·lado` con el alto real de cada lienzo; el paso «La tapa de la mesa…»: la geometría contada con `three`, la cota y las Z en los quince lienzos, los pies de las cartas de 3 a 12 puntos bajo el borde trasero, los colores del tapete, los grupos leídos por texto hasta el `>` que cierra la etiqueta, ningún `clearDepth(` en `escenas/` y ningún `onBeforeRender` que toque `gl`, el orden medido con `arbol-de-la-mesa.ts` en los quince lienzos, la tapa parando el toque, los sitios bajo la tapa contra `ACEPTADOS`, los posavasos leídos del atlas, y que `Barra` pinta lo contado (307). HECHO (fase 3 y vuelta 3b, 335 con el guardia a 335): el presupuesto con el máximo y `12 · seg + 1.470`, el tope 4.500 bajo la quinta parte del mar, el `.glb` contado con `NodeIO` y el respaldo construido; las medidas del par, del salto y de la sombra del dado; las curvas (sacudida, salto, giro, asentado, rebote, giro libre) y `sucesoDelResultado`; `cuaternionDelValor` ida y vuelta y el respaldo con los puntos en las caras del pack; el mínimo legible en los quince lienzos y los cuatro umbrales; los DIEZ grupos de dentro con `function Dados(`; el modelo del árbol con `DADO 0/1` y el asa, nada podado, los dados opacos antes que las cartas y presentes en el quinto de 390; la llave `dados !== null`, el tapete apagado, `disponible` como única llave del toque y la sacudida, el asa por `colorWrite`, `MODELO.dado` más respaldo y `faseDeLosDados` única, las sombras añadidas, `enReposo`; «el par cabe en el asa y en el tapete en los DOS peldaños», la 3c por el borde del DADO, y el mazo del reparto de cinco. Pendiente (fases 4 y 5): los grupos de la pila; el vértice más alto bajo la cinta al salir; la cinta apaisada y de pie contra las manos; que seis fichas de 44 caben bajo la cinta con el inset de abajo, para lo que `LIENZOS` gana una CUARTA columna (0 salvo 844×390 → 21, 932×430 → 21 y 1180×820 → 20; `medir-cajon.ts`, §1; la muesca lateral es OTRO dato y no entra, porque la escena no la conoce) |
| `shared/arcade/juegos/riberas-en-tres.ts` | HECHO (fase 1): `tirado`, `ultimaTirada`, `turnosAbiertos` en `VistaQueSePinta` (y los dos comentarios de `comprada` reescritos: §1.3); `selloDeLaTirada`, `dadosEnTres` (`null` fuera de `jugando`), `opcionesFueraDeLaMesa`, `chozas`/`torres` en `ColonoEnElMarcador`. HECHO (fase 2): `turnoEnTres(vista)`, el color del colono al que le toca. HECHO (fase 3): `DadosEnTres extends DadosDeLaMesa` (sólo el tipo, de `escenas/dados.ts`) y `tirarEnTres(opciones)`, la opción TIRAR entera o `null` (§5.2, §5.3). Pendiente: nada |
| `server/scripts/verificar-riberas-en-tres.ts` | HECHO (fases 1 a 3): que TIRAR se cae del formulario sólo con dados; que `porTirar` sigue a las opciones enteras y al revés sale falso; que `dadosEnTres` es `null` fuera de `jugando`; que las cuentas de chozas y torres cuadran con la vista; que `turnoEnTres` devuelve el color del asiento de `turnoDe`; que `tirarEnTres` devuelve la opción entera y `null` con la tirada hecha. 295 comprobaciones, `MINIMO` 293 |
| `app/src/arcade/mesa.ts`, `escritorio/src/mesa.ts` | HECHO (fase 1): `mover` devuelve `ResultadoDelMovimiento = 'hecho' \| 'rechazado' \| 'sin-red'`, con el `return` temprano resuelto a `'rechazado'` (tabla del §5.3) |
| `app/src/arcade/local.ts` | Pendiente (fase 6): `volverAlRetrato()`; `usarElAparatoQuieto` lo usa al desmontar; `usarApaisado` al lado, y `usarLaPantallaEncendida` con `activateKeepAwakeAsync` / `deactivateKeepAwake` como el juego local (378–381; §1.13) |
| `app/src/arcade/riberas-en-tres-escena.tsx`, `app/src/arcade/hud-de-la-mesa.tsx` (NUEVO, fase 6) | HECHO (fase 2): `turnoDe = useMemo(() => turnoEnTres(laVista), [laVista])` y `<Delta turnoDe={turnoDe}>`. HECHO (fase 3): `recordada`, `tableroPrometido` y `dadosPrometidos`, `catalogoDelTablero()` con el `catch` a `null` antes del `Promise.all` y `unirCatalogos` (§5.1); `CAMPO_DE_LA_CAMARA` 45°; `haySitioParaLosDados` con `huecosDeLaMesa` y `medida` del `onLayout`; `dados` de `dadosEnTres` con las opciones enteras y `mesa.quieto` apagándolos; `fueraDelTablero = opcionesFueraDeLaMesa(fueraDeLaBarra, dados)`; `alPulsarLosDados` con `laInterfazSeLoQueda()` la primera y `tirarEnTres`; `<Delta dados onPulsarLosDados>`; `accessibilityActions` `tirar` con `onAccessibilityAction` en la vista del `Canvas` (§1.4). `verify:sala` lo exige (152 comprobaciones, guardia 152). Pendiente (fase 4): el botón «Recoger la mesa» y su estado, la vuelta sola al tocarme con la espera mirando `cogida` y `cogidaDelMazo` (`riberas-en-tres-escena.tsx` 640–641), y `soltarTodo` (`riberas-en-tres-escena.tsx` 646) al recoger (§6). Pendiente (fase 6): la rama del delta a pantalla completa; la cinta del tercio central con la ficha de mis puntos en el sitio del «≡»; el cajón del ancho de la cinta con el marcador de seis en fichas de 44 («vado L · N chozas · M torres» en el segundo renglón), la línea de la mesa, los botones y la crónica, desplazable (§1.11); barra de estado oculta; cartel de girar |
| `escritorio/src/riberas-en-tres.tsx`, `escritorio/src/sala.tsx`, `escritorio/src/estilo.css` | HECHO (fase 2): `turnoDe = useMemo(() => turnoEnTres(vista), [vista])` y `<Delta turnoDe={turnoDe}>`. HECHO (fase 3): `recordada`, `traerUnGlb`, `traerElTablero` y `traerLosDados`, `traerElCatalogo()` con el `catch` a `null` antes del `Promise.all` y `unirCatalogos` (§5.1); `CAMPO_DE_LA_CAMARA` 45°; el `ResizeObserver` de `medirElRecuadro` sobre el recuadro y el estado `lienzo`; `haySitioParaLosDados`, `dados`, `fuera = opcionesFueraDeLaMesa(fueraDeLaBarra, dados)`, `alPulsarLosDados` con `tirarEnTres`; `<Delta dados onPulsarLosDados>`; el botón `.riberas-solo-apoyo` «Tirar los dados» montado con `dados !== null`, `aria-disabled`, sin `disabled` (§1.4), y su regla en `estilo.css`. `verify:escritorio` lo exige (400 comprobaciones, guardia 400). Pendiente (fase 4): el botón «Sacar la mesa» y su estado; la espera de la vuelta sola mira `cogida` (`riberas-en-tres.tsx` 876) y `cartaDelMazo` (878), que aquí NO se llaman como en la app; y no hay `soltarTodo`: o se escribe uno que recoja los seis `ponerCogida(null)` (889, 967, 987, 1028, 1056 y 1119) o la bajada suelta con lo que ya hace el efecto de `rev` (887–892, cuatro llamadas; §6). Pendiente (fase 5): la misma cinta en DOM con la ficha de mis puntos; el raíl como cajón del ancho de la cinta, con el marcador el primero y `MarcadorDeRiberas` pintando la ficha de 44; la página como columna flex con la cadena de cuatro eslabones (`.sala` → `.tablero-y-panel` → `.riberas-en-tres` → `.riberas-lienzo`, cada uno con `flex: 1; min-height: 0`; §1.12), el aviso en la cinta y la cabecera de la Sala en su sitio, sin variable de alto |
| `escritorio/src/banco3d.tsx` | HECHO (fase 3): `useCatalogo` carga los dos ficheros con `loadAsync` y el mismo `catch` a `null` antes de unir; los dados de mentira (`dadosDelBanco`, `simularLaTirada`): «Me toca tirar» enciende `disponible`, «Tirar» hace de servidor (a los 400 ms llega otra suma y otro sello), «Rechazar: sí/no» hace que la próxima pulsación vuelva `rechazado`, y el rótulo «suma · sello»; `<Delta dados onPulsarLosDados>` con el mismo simulador |

## 9. Cómo se midió

Treinta y tres guiones en el scratchpad de la sesión, que importan el código real. De la
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
numerados; ponía las mallas sueltas en tres grupos, y por eso daba cero fallos donde
el árbol real da dos: lo sustituye el de la cuarta), `medir-techos.ts` (placa, naipe,
asa, pieza señalada y tomada, dado en
salto, con 0,13 y 0,14 y en los lienzos de pie), `medir-colgado-con-tres.ts` (los tres
peldaños con `cuantos` 3 y 4), `medir-cinta-de-pie.ts` (la cinta al tercio, 40, 45 y
50 % contra las manos abiertas en los lienzos de pie), `medir-borde-lejano.ts` (los 54
vértices y el borde del delta proyectados con `ojoYMira` al salir y a 82°, en todos
los rumbos) y `medir-sacar-el-vertice.ts` (cuántos grados y cuántos puntos de
arrastre sacan el vértice de debajo de 44 y de 88). De la cuarta, tras la tercera
revisión: `medir-orden-con-el-arbol-real.ts` (el árbol de `delta.tsx` con sus grupos
anidados tal como están en el fichero, metido en el `WebGLRenderLists` de `three`
0.185.1: las ocho formas de la tabla que el §4.1 tuvo hasta la sexta versión, y el juez
que las calificaba; SIN poda por frustum, y por eso creía que los testigos corrían). De
la cuarta revisión: `medir-orden-cuarta-revision.ts` (el mismo árbol y el mismo
`WebGLRenderLists`, con la decisión D y encima las sombras, el tapete y los `Dados` de
las fases 2 y 3, una pieza del pack con material transparente, el caso sin la mano de
bienes, el caso sin el testigo de la `Baraja` y el caso con el grupo interior de los
dados sin número; también sin poda). De la quinta, para las decisiones de Miguel:
`medir-dados-por-lienzo.ts` (el dado y el punto en cada lienzo con la arista a 0,46 y a
0,52, el peldaño de cada uno, y los tres umbrales: la proporción del colgado, el alto
en que el asa colgada llega a 44 y el ancho en que llega el quinto) y `medir-cajon.ts`
(el cajón del ancho de la cinta con seis fichas de 44 en cada lienzo, con el inset de
abajo, qué asoma al abrirlo, y su aire a las dos manos). De la sexta, tras la quinta
revisión: `revisar-cajon-sobre-la-barra.ts` (cuánto de cada hueco de la barra y del
asa de los dados colgados queda bajo el cajón abierto, en los quince lienzos; es lo que
puso la frase de la barra en el §1.11, y se volvió a correr para la séptima), los §3 a
§5 de `medir-cajon.ts` REESCRITOS con la ficha del §1.11 (dos renglones y 58 de fijo, no
86: lo que queda para cada renglón, lo que se ve del segundo en cada lienzo con el
vado primero, con las chozas primero y partido en tres, y el alto de dos renglones a
17 frente a tres a 13; el §3 anterior imprimía 103 y 42 y el documento decía 131 y 70
sin guion detrás) y `medir-textura-del-dado.ts` (lo que pesa una textura del dado
compilada a tabla en base64 a 256², 512² y 1024² frente a los 8×1024 del atlas, lo que
pesan en memoria los dos dados procedimentales con `three`, y lo que añade `COLOR_0` a
un D6 horneado por vértice: es lo que decide la ruta (b) del §5.1 antes de tener el
fichero). De la séptima, con la fase 2 aterrizada (`4287809`): `rev2-testigo-culled.ts`
(un plano en el origen de un grupo pegado a la cámara contra `frustum.intersectsObject`
con el plano cercano a 0,5, a 0,1 y a 0,01: fuera siempre; la tapa, dentro),
`rev2-orden-real.ts` (el árbol modelo en el `WebGLRenderLists` de `three` con el
`projectObject` real y su poda: la lista ordenada del iPhone 14, el testigo en PODADOS,
y la lista con `frustumCulled={false}` para ver dónde habría caído),
`rev2-vertices-bajo-la-tapa-2.ts` (los 54 vértices, sus anillos, las 72 aristas y las 19
comarcas proyectados con `ojoDelMirador` al salir y a 82°, contra el borde trasero de
la tapa, en los quince lienzos: los sitios aceptados del §4.1),
`rev3-orden-y-toque.ts` (el orden con la poda en los quince lienzos con el juez y sus
dos vacunas, el grupo interior sin número y la malla en el ojo; y el toque: el
`Raycaster` de `three` con el reparto de fiber 9.7 reproducido sobre la tapa, las asas
de señal, los pies de las catorce cartas, las áreas y las asas de la barra, en cuatro
lienzos), `rev3-colores-y-ojo.ts` (los posavasos leídos del atlas con su contraste y
dos vacunas, la paja clara y el 97 %; y el ojo contra un terreno de dos escalones en
864 posturas a 12°), `rev3-ojo-montana.ts` (el ojo contra montañas de cinco a ocho
escalones en 1.080 posturas por semilla, seis semillas; y el fondo de la columna de
dos áreas contra el borde trasero de la tapa), y dos escritos para esta versión:
`rev4-tapa-holgura.ts` (las dos Z, el fondo en unidades y en lados y el ancho de
`tapaDeLaMesa` con `HOLGURA_DELANTERA_DE_LA_TAPA`, en siete lienzos) y
`rev4-areas-cuatro.ts` (el fondo de la columna de CUATRO áreas y el pie de las cartas
quietas contra el borde trasero de la tapa, en los quince lienzos). De la fase 3, con
el pack en el disco: `medir-d6-del-pack.ts` (los D4, D6, D8 y D20 del pack en `.gltf`
con `NodeIO` y `pngjs`: vértices, triángulos, primitivas, materiales, texturas y su
tamaño, caja envolvente, si hay UV y `COLOR_0`, y cuántos colores distintos hay bajo
las UV de cada uno: es lo que separó el `D6_A` y el `D6_B`, con el atlas y dos colores
dominantes bajo los vértices, de los cuatro `D6_C_*` y los demás, con su textura
individual de números pintados; la tabla del §5.1), y un guion temporal dentro de
`escenas/scripts/` (borrado al acabar) que horneó el `D6_A` con el `hornear.ts` de
verdad y midió lo que el compilador escribe en sus cabeceras: las dos nubes de
luminancia (0,02..0,059 y 0,584..0,94), los 37 tonos, cero triángulos mixtos, nueve
vértices por punto con la normal de su cara, las caras `+x=2 −x=5 +y=6 −y=1 +z=3 −z=4`
y los doce vértices que `weld` fundiría tras remapear. La fase 3 se midió además con
sus propios comprobadores (las curvas, el mínimo legible, los umbrales, el orden con
los dados: todo eso es `verify:escena`) y con `vacunas-fase3.py` en el scratchpad: 38
roturas en la etapa 2 (E1 a E24 en `verify:escena`, D1 a D7 en `verify:escritorio`, S1
a S6 en `verify:sala`, R1 en `verify:riberas-en-tres`) más las de la etapa 1 sobre
`verify:dados` y el compilador, cada una con copia de seguridad, sustitución en el
fichero real, el comprobador corrido, el código de salida y las líneas caídas
apuntados, y la restauración byte a byte por md5 (`vacunas-fase3.txt` y los
`vac-f3-*.log` guardan el resultado); `sin-rayas-fase3.py` quitó las rayas largas que
la fase escribió. Para la octava, `rev5-quinto-y-dado.ts` (el quinto hueco tal como
aterrizó: asa, piezas, dado y punto en puntos, el aire del dado derecho al primer zócalo
y el canto al asa en los quince lienzos; la tabla del §4.4) y `rev2-vertices-bajo-la-tapa-2.ts`
vuelto a correr para el dato a 82° del §4.1. Para la novena, dos más:
`rev6-medir-d6-con-el-horno.ts` (los cuatro `D6_C_*` del pack horneados con el
`hornear.ts` de verdad y clasificados con el umbral de 0,25 y el factor 2 del
compilador: vértices oscuros, punto más claro, cuerpo más oscuro y el más oscuro de
todos, por color; la fila del `D6_C` de la tabla del §5.1, donde los cuatro se niegan
por tres ramas: azul y amarillo sin ningún vértice oscuro, el rojo con todos oscuros, el
verde por el factor 2 del umbral) y `comprobar-citas-de-linea.ts` (el metro de las citas de línea de ESTE
documento: saca todas las que tienen la forma de un nombre de fichero seguido de un
número o de un rango, la palabra «línea» o «líneas» seguida de números, o un paréntesis
con números apoyado en el último fichero nombrado en el mismo párrafo o en la misma
fila de tabla; resuelve el nombre contra el árbol de `b216fbc` con `git ls-tree`,
imprime la línea citada con `git show`, y marca DUDOSA la cita cuya línea o rango no
contiene ninguna palabra de la frase que la rodea, ni identificador entre acentos
graves ni palabra de cinco letras o más). En la novena sacó 405 citas: 138 con alguna
palabra de la frase en su línea, 75 DUDOSAS, 27 que apuntan más allá del final del
fichero, 34 números entre paréntesis sin fichero cerca y 131 a guiones del scratchpad
o a ficheros de `three`, que no viven en el commit y no se comprueban. Las DUDOSAS y las
que apuntan más allá del final se repasaron una a una: son números que no son líneas
(lienzos, capas, umbrales, cuentas de comprobaciones, píxeles, códigos HTTP) o citas
buenas cuya frase no repite ninguna palabra de su línea, y las que estaban corridas son
las que esta pasada corrigió. El guion no escribe nada, se corre con
`node_modules/.bin/tsx` desde el worktree, y es un metro, no un comprobador: una DUDOSA
puede ser buena y una buena puede haber acertado por una palabra genérica, así que la
salida se lee ENTERA; cada pasada que toque una línea del código o una cita del
documento lo corre antes de cerrar. Donde un número de aquí viene del 0,13 se
dice; los del 0,14 son los que valen. Lo que se afirma en este documento se convierte
en comprobaciones de `verify:escena` en la fase que lo hace: el guion de la sesión se
tira, el comprobador se queda (los `rev2-*` y `rev3-*` ya lo son: el orden con la poda,
los sitios bajo la tapa, la tapa parando el toque y los posavasos viven en el paso de
la tapa de `verify:escena`; y lo que la fase 3 midió con guiones temporales vive en
`verify:dados` y en el paso de los dados de `verify:escena`).

**Lo que se midió con el pack Board Game Bits delante**, que la séptima dejaba como
lista: la arista de la caja envolvente del `D6_A` en los tres ejes, `0,7500` los tres,
centrada, que es `ARISTA_DEL_D6_EN_EL_PACK`; 521 vértices y 662 triángulos en UNA
primitiva con UN material (una llamada por dado, §7); los puntos son GEOMETRÍA (21
islas de nueve vértices; 37 colores bajo las UV que se aplanan a dos); su textura es el
atlas compartido, `boardgame_bits_texture.png` de 1024² y 35 kB (los D6 con números
llevan `dice_*.png` de 1024² y 150 a 175 kB; ninguna es plana por columnas, y da
igual, porque no hizo falta la tabla); el `.glb` compilado pesa 19,3 kB y el techo de
`verify:dados` es 100 kB; y los triángulos por dos son 1.324, más que los 444 del
respaldo y que los 574 del margen del tope de entonces, así que el tope se rehízo
(§5.1, §7).

## 10. Lo que NO entra, y las decisiones abiertas con dueño

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
| Los sitios del tablero que quedan bajo la mesa al mirador de salida | 3 vértices (2 con su anillo) y 5 aristas en los apaisados y el monitor, 2 y 3 en las tabletas 4:3, 0 de pie, 0 comarcas (§4.1); aceptados porque se sacan arrastrando y la tapa para el toque, y `verify:escena` los cuenta contra `ACEPTADOS`. Si se quieren menos, se sube el encuadre de salida (`MIRADOR_DE_SALIDA`), no se encoge la tapa hacia atrás | **Miguel**, viéndolo en el banco; entonces se cambian los números escritos, con su porqué |
| Cuándo la frase pasa a dos líneas dentro de los 44 y cuándo a puntos suspensivos; y a qué ancho exacto se recorta el segundo renglón de la ficha de 44 del cajón | La frase no hace crecer la cinta (§2.2): dos líneas de 17 caben en 44. El hueco está medido (`ancho/3 − 88`: 101–552 puntos apaisado; 40–219 de pie al 40 %), y el de la ficha también (131 puntos para cada renglón en el SE, 164 en el SE 2, 70 en 320×360; `medir-cajon.ts`, §3). Lo que se recorta en el SE, en el SE 2 y en los teléfonos de pie es el SEGUNDO renglón, no el nombre, y el orden ya está decidido (el vado primero, §1.11); el ancho del texto con la fuente de la casa no se mide en Node | Fase 5, en el banco, y se dejan escritos la letra, el interlineado y el número |
| La línea de botones sobre el vértice lejano | Bajo la primera línea, en el tercio central; tapa el vértice más lejano en los teléfonos apaisados al salir (63–84 puntos) y se saca con 7–37 puntos de arrastre (§2.2). La alternativa medida es a la derecha del tercio, en los 155 (SE) – 240 (iPhone 14) puntos de aire hasta la mano de bienes | Fase 5, en el banco; si se mueve, se vuelve a medir contra la mano de bienes abierta |
| La coexistencia de los dos bloqueos de orientación | No coexisten (`LOS_QUE_PINTA` pinta un arcade), los dos vuelven por `volverAlRetrato()`, y se prueba entrando y saliendo en el aparato | Fase 6 |
| El D6 del pack, a ojo: si los puntos se leen a 23 puntos en el SE, si el crema y el oscuro casan con las fichas sobre la madera, y si la sacudida de «me toca» molesta | Lo que un comprobador no juzga. Quien hizo la fase 3 lo miró en el banco en un panel de 800×369 (los dos D6 ruedan, se asientan en el par de la suma y el tapete aparece); a 23 puntos no lo ha mirado nadie. Si no se lee, lo que se toca es `PUNTO_DEL_DADO` (el 18 % del pack no se puede cambiar: los puntos son geometría) o el tono, no la arista, que la fija el §1.15; si molesta la sacudida, `SACUDIDA` (0,36 s a 8 Hz cada 1,6 s, 3 % y 4°) | **Miguel**, en el banco (`escritorio/banco3d.html`, «Me toca tirar» y tocar los dados) o en el aparato |

Cinco filas que había aquí se han ido porque ya están decididas. Dos las cerró la
fase 2 en `4287809`: la Z del borde delantero de la tapa (`HOLGURA_DELANTERA_DE_LA_TAPA
= 0,1` hacia la cámara, `−1,549` en apaisado, §4.1) y el tono del posavasos (leído del
atlas al 70 % y al 85 %, `#683a2c` y `#7e4736`, medido y vigilado por `verify:escena`,
§1.14). Las otras tres: el testigo de la `Baraja` (ya no es que se quite: es que nunca
corrió, y se han quitado los dos, §4.1), la carta cogida cuando la mesa sale sola
(Miguel la cerró: decisión 16) y los dados en los lienzos de pie (decisión 15 y §4.4,
quinto desde 375 puntos de ancho, sin dados en 320 y 360; la fase 3 lo mide en
`verify:escena`). La fase 3 cerró además tres cosas que estaban abiertas fuera de esta
tabla: la ruta del D6 (§5.1: geometría, ruta (a) con remapeo), si `turnoDe` viaja
dentro de `DadosEnTres` o aparte (aparte, como entrada de `<Delta>`: el tapete es
información que vale también en los lienzos sin dados, y `DadosEnTres` extiende
`DadosDeLaMesa` sin él) y el ancho del quinto hueco (§4.4). Y las siete **dudas para
Miguel** que cerraban este apartado las resolvió él la noche del 5 de septiembre de
2026; están en el §1 (la primera dentro de la decisión 3, las demás en las decisiones
11 a 16) con lo que cada una obliga a medir ya medido. Lo que este documento le deja
hoy son la primera fila de la tabla, que es una cifra aceptada que puede cambiar si la
ve y no le gusta, y la última, que es mirar.

## 11. El orden, en fases que se empujan una a una

Miguel juega mañana con lo que hay. Cada fase deja el juego entero y verde; ninguna
depende de la siguiente.

1. **La aritmética. HECHA en `8371080`.** Lo que trajo, con la misma forma que hoy
   tiene el código: `PARTE_DEL_ALTO` a 0,14 y `SUELO_DEL_TOQUE` exportado;
   `huecosDeLaMesa` con sus tres peldaños; en `escenas/dados.ts`, `paresDeLaSuma`,
   `repartoDeLaTirada`, la máquina `faseDeLosDados` con `rechazado`, `dadosEnReposo`,
   `parQueSeEnsena`, `traeTiradaNueva`, `RODAR_MINIMO`, `ASENTAR` y
   `TOPE_SIN_RESPUESTA`; en `shared/…/riberas-en-tres.ts`, `tirado`, `ultimaTirada` y
   `turnosAbiertos` en `VistaQueSePinta`, `selloDeLaTirada`, `dadosEnTres`,
   `opcionesFueraDeLaMesa` y `chozas`/`torres` en `ColonoEnElMarcador`; `mover`
   devolviendo `ResultadoDelMovimiento` en las dos `mesa.ts`; `vetaDelTablon`; los
   lienzos apaisados y 768×1024 y las comprobaciones nuevas en `verify:escena` (el
   reparto por turno, la máquina recorrida en Node, los peldaños); la línea de «tres y
   cuatro miden lo mismo» reescrita para exigir sólo el suelo; `verify:riberas-en-tres`
   probando que TIRAR se cae sólo con dados, que `porTirar` sigue a las opciones enteras
   y que `dadosEnTres` es `null` fuera de `jugando`. Y los comentarios que el 0,14 y los
   dados dejaban falsos, reescritos: la cabecera de `ANCHO_MAXIMO` en `barra.ts`; en
   `cartas.ts` la cabecera y la nota de `PISO_DE_LA_FRANJA`, que en esa fase seguían
   midiendo la PLACA y pasaron a `−0,240·alto` (la fase 2 los volvió a reescribir con
   el asa y el bote, §1.2); y en `riberas-en-tres.ts` los dos comentarios de
   `comprada`, que dejaron de decir que `turnosAbiertos` no está escrito y pasaron a
   decir que la salvaguarda es que `comprada` no lo esté (§1.3). Lo visible: el hueco
   un 8 % mayor y, en 320×360, la barra un poco más ancha. La séptima versión la contaba
   como pendiente con su lista de encargos, y era un error del documento: estaba hecha
   antes que la 2.
2. **La mesa de madera. HECHA en `4287809`.** Lo que trajo: el tablón horizontal de
   `tablon.ts` en el sitio de la placa, con la veta por vértice y los dos colores del
   atlas; las sombras de contacto fundidas a mano; el tapete del turno bajo el sitio
   colgado de los dados, con `turnoDe` llegando desde `turnoEnTres` en las dos
   pantallas (y sus comprobaciones en `verify:escritorio`, `verify:sala` y
   `verify:riberas-en-tres`); el tope de triángulos contado sobre las geometrías de
   verdad; la constante de su capa, movida a `capas.ts`, en los diez grupos de la tabla
   del §4.1 (los ocho de dentro más `Baraja` y `ManoDelMazo`; `Barra` ya la llevaba);
   los DOS testigos de borrado QUITADOS, y no uno a −1 y el otro fuera como decía la
   sexta versión, porque al montar el árbol modelo con la poda por frustum se vio que
   ninguno había corrido nunca (§4.1); la tapa parando el toque con sus cinco
   manejadores, en vez del `raycast` nulo que no hacía nada; los sitios bajo la tapa
   contados y aceptados; `ZOCALO` y `cotaDeLaTapa` en `barra.ts`, `tapaDeLaMesa` con la
   holgura de 0,1 y los posavasos leídos del atlas en `mesa.ts`; `arbol-de-la-mesa.ts`
   y el paso nuevo de `verify:escena` (307 comprobaciones), con la lectura de los grupos
   hasta el `>` que cierra la etiqueta; «la mano del mazo no invade la zona de la barra»
   contra `0,52·lado` con el alto real de la lista `LIENZOS`, única, y su comentario ya
   con el 0,24 del salto del dado; las dos frases de `cartas.ts` hablando del asa y del
   bote (`−0,273·alto`). Sin dados: se sigue tirando con el botón. Lo que se miró en el
   banco `escritorio/banco3d.html` (entrada `escritorio3d` de `launch.json`) antes de
   empujar: la junta entre tablones, el contraste, el tono del posavasos sobre la veta,
   los pies de las cartas de bienes sobre la madera, nueve toques sobre la madera con
   la choza cogida sin fundar nada, y arrastrar desde la madera girando el tablero. Lo
   que quedó para su dueño: los sitios bajo la mesa al salir (§10, Miguel). Y lo que el
   documento dejó atrás al aterrizar: el comentario de `tapaDeLaMesa` dice «unos 2,3
   lados» de fondo y son 2,55 (`rev4-tapa-holgura.ts`); la fase 3 no lo tocó
   (`mesa.ts` 96 sigue diciendo «unos 2,3») y queda para la fase 4.
3. **Los dados. HECHA en `b216fbc`** (con una vuelta 3b dentro, tras su revisión). Lo
   que trajo, en el orden en que se hizo. El pack Board Game Bits en
   `arte/kaykit/board-game-bits/`, medido (§5.1, §9): el `D6_A` con los puntos como
   geometría, así que la ruta fue (a) y no el respaldo que la séptima esperaba;
   `compilar-dados.ts` (hornea, REMAPEA a los dos colores de las fichas, mide la cara
   de cada valor y escribe `caras-del-dado.ts`; sin `weld`), `caras-del-d6.ts`,
   `verificar-dados.ts` (27) en la batería como «dados», `escenas/modelos/dados.glb`
   (19,3 kB), `MODELO.dado` con `EN_DADOS_GLB`, `unirCatalogos`, `rutaDeLosDados()`, la
   ruta fija del servidor con sus tres comprobaciones en `verify:mesa` (856), y la carga
   en dos escalones en las dos pantallas y en el banco (§5.1). Después la escena:
   `escenas/dados.ts` con las medidas, el contrato `DadosDeLaMesa`, `sucesoDelResultado`
   y las curvas; `cubo-del-dado.ts` con el respaldo (cada valor en la cara del pack) y
   `cuaternionDelValor`; el presupuesto con el máximo de las dos cuentas y el tope a
   4.500; `Dados` en `delta.tsx` con la llave `dados !== null`, el tapete apagado con
   `ultimaTirada = 0`, las sombras añadidas, todo `<group>` suyo con `ORDEN_DE_LA_BARRA`,
   `disponible` como única llave del toque y de la vibración, y la máquina en refs;
   `arbol-de-la-mesa.ts` con los dados; `DadosEnTres extends DadosDeLaMesa` y
   `tirarEnTres` en `shared`; las dos pantallas midiendo el lienzo, pasando `dados` y
   `onPulsarLosDados`, quitando TIRAR donde hay dados y con la acción accesible; el
   banco con «Me toca tirar», «Tirar» y «Rechazar». `turnoDe` se quedó aparte, como
   entrada de `<Delta>` (§10). La vuelta 3b, tras la revisión de la fase: el quinto del
   ancho del par que crece a la izquierda (§4.4), rodar desde `enReposo` y no desde el
   par recalculado con el sello visto (§5.2), la comprobación del mazo del reparto de
   cinco, y el botón de apoyo montado con `dados !== null` y apagado con `aria-disabled`
   (§1.4); y de su revisión, la copia de `enReposo` también al final de «asentando» y
   la cifra del canto en la cabecera de `HuecoDeLosDados` (1,16 lados, no 1,22).
   Comprobadores al aterrizar: `verify:escena` 335, `verify:escritorio` 400,
   `verify:sala` 152, `verify:riberas-en-tres` 295 (`MINIMO` 293), `verify:dados` 27,
   `verify:mesa` 856; batería 76 de 76 en verde. Lo que se miró en el banco
   (`escritorio/banco3d.html`): los dos D6 del pack a la izquierda de las piezas, con el
   crema y el oscuro de las fichas, y con suma 0 sin tapete; con «Me toca tirar»,
   tocarlos manda la tirada, llega «suma 2 · sello 1», ruedan y se asientan en 1 y 1 con
   el tapete rojo; «Tirar» sin turno (la tirada de otro) con suma 6 asienta en 2 y 4, y
   con suma 11 en 5 y 6; `dados.glb` carga 200. Lo que NO se ha mirado con ojos: el
   corte del rechazo (está en la máquina y en `verify:escena`, y el mando «Rechazar» del
   banco existe para verlo), el respaldo en pantalla (se construye y se cuenta, pero
   nadie ha quitado `dados.glb` y mirado), y los puntos a 23 puntos en un SE de verdad
   (§10, Miguel). Y lo que esta fase le deja a la 4, abajo.
4. **Recoger la mesa. La siguiente.** El botón, la bajada, soltar lo cogido (`soltarTodo`
   en la app; en el escritorio no existe: o se escribe uno recogiendo los seis
   `ponerCogida(null)` o la bajada suelta con lo que ya hace el efecto de `rev`), la
   vuelta sola al tocarme con la espera si hay una carta cogida (`cogida` o
   `cogidaDelMazo` en la app, `cogida` o `cartaDelMazo` en el escritorio), tal como está
   escrito en el §6. Más
   lo que las fases 2 y 3 le dejan: `Dados` vive dentro de `Barra` con su máquina en
   refs, así que hay que ELEGIR si al recoger se desmonta (la máquina vuelve a reposo y
   una tirada que llegue recogida se enseña en reposo al subir, sin animar) o se mueve
   y se apaga con `visible` (la máquina sigue y la tirada se asienta a ciegas), y
   escribirlo (§6); la entrada `mesaRecogida` de `<Delta>` no existe todavía; y tres
   retoques de comentario que el código arrastra: el de `tapaDeLaMesa` en `mesa.ts`
   («unos 2,3 lados» → 2,55, `rev4-tapa-holgura.ts`) y los de la cabecera de `capas.ts`
   y de la de `Barra` («siete u ocho escalones» → de cinco a ocho, §4.1).
5. **Pantalla completa en el escritorio.** La cinta del tercio central (y del 40 % de
   pie) con `anchoDeLaCinta` en `escenas/cinta.ts` y la ficha de mis puntos en el sitio
   del «≡»; el cajón del ancho de la cinta con el marcador de SEIS el primero, en fichas
   de 44 («vado L · N chozas · M torres» en el segundo renglón), la línea de la mesa,
   los botones y la crónica, desplazable y modal (§1.11: un toque fuera sólo lo
   cierra); la página como columna flex con la cadena de CUATRO eslabones del §1.12
   (`.sala` → `.tablero-y-panel` → `.riberas-en-tres` → `.riberas-lienzo`, cada uno con
   `flex: 1; min-height: 0`, la rejilla con una fila de `1fr` y el `margin-bottom` de
   `.riberas-en-tres` fuera), el `aviso-del-tablero` en la cinta y la cabecera de la
   Sala en su sitio con su alto natural (no hay variable de alto que restar, y en el
   banco se mide lo que la cabecera mide en una fila y en dos para dejar de llamar
   ilustrativo al 48); la letra y el interlineado con que la frase cabe a dos líneas en
   44, el ancho al que se recorta, y el ancho exacto al que se recorta el segundo
   renglón de la ficha (el orden ya está decidido, §1.11), medidos en el banco y
   escritos; y dónde va la línea de botones (§10). En `verify:escena`, tres
   comprobaciones nuevas: que seis fichas de 44 caben bajo la cinta en todos los
   lienzos de la lista con su inset de abajo (`264 ≤ alto − 44 − insetDeAbajo`; el SE
   deja 12), para lo que la lista `LIENZOS` (UNA desde la fase 2, en la cabecera del
   guion y común a todos los bloques, hoy `Array<[string, number, number]>`) gana una
   cuarta columna con ese inset (0 salvo 844×390 → 21, 932×430 → 21, 1180×820 → 20; la
   muesca lateral de los dados es otro dato que no entra, §1.11); que al mirador de
   salida ningún vértice de los 54 cae bajo la cinta (a menos de 44 puntos del canto
   de arriba dentro de la banda de la cinta) en ninguno de los lienzos, con la cámara
   de verdad (`ojoYMira` sobre `ojoDelMirador`, sin acercar) y recorriendo el rumbo
   entero (hoy el peor es el SE, 63); y que la cinta, con el ancho que devuelve
   `anchoDeLaCinta`, deja al menos 15 puntos hasta la carta de arriba de cada mano
   abierta en todos los lienzos (hoy 15,6 en 390×845). El caso de 82° se deja escrito
   en el comprobador como dato, no como exigencia: la tableta 4:3 a 26 puntos es la
   cámara en su tope, y se sale con 47 de arrastre.
6. **Apaisado y pantalla completa en la app.** `usarApaisado` y `volverAlRetrato()` en
   los dos ganchos, la barra de estado, el cartel, la cinta y el cajón de seis en React
   Native, y la pantalla encendida con `usarLaPantallaEncendida` (§1.13). Esta fase espera a que el atlas nativo del tablero entre en
   `main` y el delta se vea en un teléfono real (`EL_DELTA_SE_VE_AQUI` ya no existe:
   el otro encargo lo ha borrado, y con él la decisión por plataforma); hasta
   entonces no hay nada que girar. Y se prueba EN EL APARATO, en las dos plataformas,
   antes de empujar: entrar (la pantalla gira a apaisado y `lockAsync(LANDSCAPE)` no
   lanza `UnsupportedOrientationLockException`), girar el teléfono en las dos manos
   (la escena no vuelve a retrato), salir (el vestíbulo está en retrato y NO gira al
   ladear el aparato), y lo mismo con un juego local de `usarElAparatoQuieto`
   (entrar, salir, ladear: el vestíbulo quieto).
7. **La pila del mazo.** El naipe del cuarto hueco con su grosor; si trae grupo propio,
   con `ORDEN_DE_LA_BARRA` y la misma lectura por texto de `verify:escena` (§4.1). El
   presupuesto ya cuenta sus 12 triángulos (§7). Es un adorno medido y va el último por
   eso.
