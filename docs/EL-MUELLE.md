# El Muelle: el lobby en tres dimensiones de la Sala de Arcade

> Si algo de aquí no coincide con el código, gana el código. Este documento recoge
> las decisiones y su porqué, para que quien construya o revise no tenga que
> redescubrirlas. Se escribió el 4 de septiembre de 2026, sobre la rama
> `lobby-catan`, a partir de un panel de tres propuestas independientes juzgadas
> por dos revisores adversarios contra el árbol de verdad.

## 0. Qué es y por qué se construye de fuera a dentro

Riberas —el arcade de colonización hexagonal de la casa— está recibiendo un
tablero en tres dimensiones en otra línea de trabajo (`catan-3d`, en `escenas/`).
Ese trabajo va de dentro a fuera: primero el mundo, luego las interfaces, y al
final habrá que cablearlo con la app, el escritorio y con lo que hay antes de
que la partida empiece.

**El Muelle es lo que hay antes.** Es la pantalla a la que se llega al pulsar
«Riberas» en la app o en la Sala web, y donde se pasa el rato entre «abro una
mesa» y «se reparte el delta»: se elige un aventurero, se comparte el código, se
ve llegar a los demás. La referencia declarada es el lobby de un videojuego
grande —profundidad, cámara viva, tu personaje esperando y moviéndose, los otros
apareciendo en tiempo real— con la temática de Riberas y los recursos de KayKit
que ya usa el tablero, a la misma escala, para que el día que exista la vista en
tercera persona el muelle sea un sitio de ese mismo mundo y no un decorado aparte.

Se construye de fuera a dentro a propósito: **el lobby no depende del tablero
3D**. Cuando el tablero esté, la integración es nuestra y consiste en cambiar a
dónde se navega al zarpar y, más adelante, en compartir el `Canvas` para que el
amanecer sobre el muelle sea el amanecer sobre el delta.

## 1. Las decisiones que no se pueden deshacer después

1. **La figura de un asiento es una cadena opaca para la autoridad.**
   `server/src/arcade/mesas.ts` guarda `Silla.figura?: string` con forma
   `^[a-z0-9]+(?:[-_][a-z0-9]+)*$` (1 a 32) y no sabe qué es un caballero. La
   lista de aventureros vive en `escenas/embarcadero/figuras.ts`, que es quien los
   dibuja. Una figura desconocida se pinta como la de serie del asiento (misma
   regla que un icono de arcade desconocido en la portada). `mesas.ts` estaba
   sellado; se volvió a sellar a sabiendas y el porqué está en la cabecera de
   `server/scripts/verificar-nucleo-quieto.ts` (cuarto sellado).
2. **Vestirse no es un movimiento.** `vestir(codigo, llave, figura)` sube la
   revisión —los demás sondean y tienen que enterarse— pero no entra en el
   diario, no pasa por el reductor y no reprograma el plazo. Ruta:
   `PUT /api/arcade/mesas/:codigo/figura` con `x-asiento`.
3. **`empezada` sale en la vista de la mesa.** Los clientes no podían saber si la
   mesa se reúne o ya juega sin mirar dentro de la vista del juego. Con
   servidores anteriores a este campo se infiere de `opciones` (si el juego
   ofrece la opción de empezar, no ha empezado).
4. **Riberas sigue con `mueble: 'tablero'`.** El muelle es una PANTALLA PREVIA de
   la plataforma, no un mueble: en la app es la ruta `/muelle?arcade=riberas` y
   al zarpar se navega al mueble que diga el manifiesto (`rutaDeArcade`); en el
   escritorio es lo que se pinta en `/sala/riberas` mientras la mesa no ha
   empezado. Cambiar el mueble rompería el escritorio (`dondeSeJuega` apaga todo
   mueble propio) y los binarios ya publicados. Quién tiene muelle lo dice
   `escenas/embarcadero/tema.ts`, no el manifiesto (sellado).
5. **El lobby tiene su propio `.glb` con el color horneado.** `tablero.glb`
   lleva la textura empotrada y pinta biomas y colores moviendo las UV; en el
   móvil Hermes no decodifica ese PNG (ver `app/src/tres/texturas-nativas.ts`) y
   saldría gris. `embarcadero.glb` se compila desde el mismo pack con `COLOR_0`
   por vértice, como los aventureros, y las piezas de color de jugador entran
   UNA vez con una máscara `_TINTE` que la escena pinta del color del asiento.
   Ver `escenas/embarcadero/piezas.ts`.
6. **El color de asiento es la paleta de Riberas, por orden de llegada.** Seis
   colores (`tema.ts`), los mismos y en el mismo orden que el tablero SVG del
   juego, para que quien llegue al tablero se reconozca. El tablero 3D usa hoy
   los cuatro del pack por orden; cuando se integren, la decisión del quinto y
   el sexto se toma UNA vez y en un solo sitio. No se elige color: se deriva.
7. **`escenas/embarcadero/` es agnóstico de plataforma.** Sólo `three`, React y
   el núcleo de r3f (`useFrame`, `useThree`). Ni `drei`, ni DOM, ni Expo, ni
   `fetch`: los bytes entran por una función `traer` que inyecta cada cliente. El
   `Canvas` lo monta la app (`app/src/tres/Lienzo`) o el escritorio.
8. **Los modelos se sirven por HTTP desde el servidor de juego**, delante del
   guardián (`server/src/routes/modelos.ts`): `tablero.glb`, `embarcadero.glb` y
   `aventureros/<fichero>.glb`. Los dos clientes piden la misma ruta relativa.
9. **Una sola copia de `three`, `react` y r3f en cada cliente.** Hay varias en el
   disco (raíz, app, escritorio, escenas). Metro resuelve las de la app para todo
   lo que viene de `escenas/` y `shared/` (`app/metro.config.js`); Vite las
   dedupe desde la raíz del escritorio (`escritorio/vite.config.ts`). Sin esto el
   `useFrame` de la escena corre en otro React que el `Canvas` y no corre nunca,
   sin error.

## 2. La escena

**Un embarcadero a la hora azul.** El sol acaba de ponerse tras las montañas: el
cielo va del cénit `#0B1020` al medio `#1B2340` con una franja de brasa
`#E2603A → #F0A35A` de unos seis grados sobre el horizonte, a contraluz. Es la
paleta de la Sala (`suelo #080A0E`) con un horizonte encendido, y hace que el
amanecer sea la transición natural al tablero, que se juega a mediodía
(`banco3d.tsx`: cielo `#9EC9E2`).

**Composición en tres planos**, en unidades de mundo (`escenas/escala.ts`: una
persona mide 2,543; una tesela 6,315 de radio; una comarca 75,8):

- **Primer plano (0 a 14 u):** la cabeza de un muelle de madera que sale de la
  playa. El aventurero local, de pie, entero, con un farol al lado (poste propio
  con esfera emisiva y una `pointLight` cálida), barriles, cajas, un ancla, un
  bote amarrado golpeando el pilote.
- **Plano medio (14 a 90 u):** la cala. Un semicírculo de unas noventa teselas de
  pradera a nivel cero cerrado con `orilla-a…e`, juncos y nenúfares en los
  remansos; la playa con el varadero y dos botes; el caserío del embarque en una
  terraza (`ESCALON` 5,47) con la taberna —ventanas emisivas—, dos casas, el
  pozo, el astillero, la atalaya con fuego arriba y el molino con las aspas
  girando despacio. Arboledas y árboles sueltos alrededor.
- **Fondo (90 a 700 u):** colinas arboladas, montañas recortadas contra la brasa,
  dos barcos de nadie fondeados cabeceando con un farol de popa, nubes bajas
  deslizando, y el disco de mar hasta la niebla.

**Un amarre por asiento, seis siempre** (`MANIFIESTO_RIBERAS.jugadores` es de 2 a
6). El amarre local es la cabeza del muelle; los otros cinco se abren en abanico
hacia el agua, retrocediendo en profundidad y no en fila. Un amarre OCUPADO tiene
el barco de su color atracado, la bandera de su color en el poste y el aventurero
de pie; un amarre VACÍO es un noray a oscuras con un `bote` meciéndose. La cala
se enciende amarre a amarre según llega gente: es el raíl de aforo de la Sala
hecho paisaje.

**La cala se siembra con el código de la mesa.** Cinco letras dan un entero, y
de él salen la posición de rocas, juncos, árboles sueltos y botes de fondo. Los
seis aparatos ven exactamente la misma orilla y dos mesas se distinguen a
primera vista. Sin mesa (en la orilla, eligiendo figura) se usa una semilla fija.

**Luz y atmósfera** (todo `three` núcleo, sin postprocesado): `hemisphereLight`
azul/tierra, una `directionalLight` de contraluz `#FF9A4D` casi rasante que
filetea hombros y aspas, dos `pointLight` en móvil (farol local, taberna) y tres
en PC, `fog` del color del cielo a la altura del horizonte, tone mapping ACES a
0,95. Agua propia: malla plana con dos senos de desplazamiento en el vértice,
fresnel entre hondo `#0D1A33` y reflejo de cielo `#2A2F55`, y una franja de
brillo de la brasa; bajo cada farol encendido, un plano vertical aditivo que hace
de reflejo. Cuatrocientas motas (`Points`, aditivas, con parpadeo por vértice) en
el volumen del muelle, humo de la taberna, brumas a ras del agua. **Nada está
quieto nunca**: agua, barcos, botes, banderas, aspas, nubes, faroles con ruido,
motas, y los aventureros.

**Presupuesto** con seis sentados: ≤ 110 000 triángulos y ≤ 70 llamadas de dibujo
en la calidad plena; la calidad sobria quita motas, brumas, reflejos y una luz.
Sombras sólo en PC (una caja alrededor de los muelles). En móvil, discos de
contacto bajo cada aventurero. Se mide en Node sumando piezas y se mira en el
banco.

## 3. La cámara

Una sola cámara viva, gobernada por `escenas/embarcadero/camara.ts` (aritmética
pura y comprobable) y aplicada con `useFrame`. Toda pose es un OBJETIVO al que se
llega por interpolación amortiguada; nunca se asigna en seco salvo el primer
fotograma.

- **Reposo:** dos poses —retrato (ojos a 2,15 u, a 7,5 u del local, FOV 55°) y
  panorámico (a 9 u, FOV 38°, el local en el tercio izquierdo)— mezcladas por
  relación de aspecto, para que una tableta caiga en medio y girarla no salte.
  Encima, respiración: órbita de ±3° con periodo 23 s, altura ±0,08 u con 11 s,
  travelling de 7,5 a 7,9 u con 40 s; el objetivo sigue con 0,25 s de retraso,
  que es lo que da parallax entre el muelle, el caserío y las montañas.
- **La hoja del HUD manda.** `Ventana.franjaInferior` sube el objetivo para que
  el aventurero local quede ENTERO por encima de la hoja: nunca baja del 22 % del
  alto útil ni sale del encuadre. Se comprueba para 9:19,5, 3:4 y 16:9.
- **Al llegar alguien:** su barco emerge de la niebla, atraca en su amarre, el
  aventurero salta a las tablas; la cámara abre 1,5 u y gira 6° hacia allí
  durante 0,8 s y vuelve. Si hay un campo de texto con el foco, no se mueve.
- **Entrada del jugador:** arrastre horizontal ±25° con muelle en móvil; ±2° con
  el ratón en PC.
- **Al zarpar** (cuando llega `empezada: true` EN LA VISTA, nunca al pulsar):
  los aventureros saludan escalonados, corren al barco y saltan; la cámara sube
  en grúa (easeInOutQuart) hacia una pose aérea mientras el cielo y la niebla
  interpolan hacia el `#9EC9E2` del tablero; a los 3,2 s se funde AL COLOR DEL
  CIELO DEL TABLERO —no a negro— y el cliente cambia de pantalla. Se puede
  saltar tocando.

## 4. Los aventureros

Seis figuras compiladas en `escenas/modelos/aventureros/` (caballero, bárbaro,
maga, exploradora, pícaro, encapuchado; rig de 23 huesos; `COLOR_0`; sin
textura) y `animaciones.glb` con doce clips en castellano
(`escenas/embarcadero/figuras.ts`: `CLIP`). Se cargan con `GLTFLoader.parse`
sobre los bytes que trae el cliente, se clonan con `SkeletonUtils` y cada uno
lleva su `AnimationMixer`.

**Máquina de estados pura** (`gestos.ts`, reloj y semilla inyectados) con los
clips que existen: `aparecer` al sentarme yo; `salto` + `andar` al llegar en
barco; `reposo-a` con gestos sorteados por asiento cada 6 a 14 s (`reposo-b` 60 %,
`saludar` 25 %, `recoger` 15 %); `saludar` a quien llega; ausente (presencia
falsa, que el servidor marca a los 60 s) = giro hacia el mar y bandera a media
asta; vestirse = `lanzar` cortado + humo + `aparecer` con la figura nueva;
zarpar = `recoger` → `correr` → `salto`. Nunca T-pose: si un clip falta, `reposo-a`.

**Énfasis del local sin acento:** posición (cabeza del muelle), farol y contraluz.
El color de asiento sólo va en el barco, la bandera y el chip del HUD; ningún
violeta en el mundo.

**Sin cuenta**, la figura se sortea una vez por aparato y se guarda como el
bolsillo (`app/src/arcade/figura.ts`; `localStorage` en el escritorio). **Con
cuenta**, además se guarda en la cuenta (`PUT /api/cuenta/figura`) y se lee al
entrar (`GET /api/cuenta/yo`), así que sigue a la persona de un aparato a otro.

## 5. El HUD

Identidad de la Sala (`app/src/arcade/muebles.ts`: `SALA`, `LETRA`, `RADIO`,
`CUENTA_DE_AFORO`; `escritorio/src/estilo.css`): vidrio `teja` con filo de un
píxel sobre la escena; **el acento sólo** en el botón que trae `opciones` («Se
reparte el delta», con su `ayuda` tal cual la escribe el juego), el piloto de
presencia, la figura elegida y «copiado». Todo lo demás, grises fríos.

- **Móvil (retrato):** barra superior con «‹ Sala», el nombre del arcade y el
  raíl de aforo; escena limpia entre el 12 % y el 62 % del alto; **hoja inferior
  del 36 %** con tres estados: *en la orilla* (nombre, figura, plazo, abrir,
  entrar con código), *en el muelle* (código grande con tracking que copia y
  comparte, lista de sentados con presencia y figura, la llamada a zarpar cuando
  el juego la ofrece, salir, tirar) y *figuras* (los seis, con la vista previa en
  la propia escena). Las cinco letras del código se rellenan al pegar. La hoja
  publica su alto a la cámara.
- **PC:** raíl de 22 rem a la derecha sobre la rejilla `tablero-y-panel` que ya
  existe, con el vestíbulo actual dentro y la escena ya viva detrás; teclas 1 a 6
  para figuras; enlace `/sala/riberas?codigo=ABCDE` para pegar en un chat.
- **El HUD nunca depende del `Canvas`.** Si el mundo no arranca, se abre, se
  entra y se reparte sobre `SALA.suelo`, y se dice qué faltó.

## 6. El flujo

1. Portada → «Riberas» → `/muelle?arcade=riberas` (app) o `/sala/riberas` (PC).
   Se pinta la orilla con MI figura (la guardada, o la de serie) y el HUD en
   *en la orilla*. Con cuenta, se pide `/cuenta/yo` y si trae figura manda.
2. Abrir mesa → `POST /arcade/mesas {arcade, nombre, plazoSegundos?, figura}` →
   *en el muelle* con el código. Entrar con código → `POST …/asientos {nombre,
   arcade, figura}`. La llave va al bolsillo como hasta ahora.
3. Cambiar de figura en el muelle → `PUT …/figura`; se guarda en el aparato y en
   la cuenta si la hay; los demás la ven en su siguiente vuelta de sondeo.
4. Llega gente → su amarre se enciende. Se va (presencia) → bandera a media asta.
5. Alguien pulsa la opción de empezar del juego → `POST …/movimientos` como
   siempre → en la siguiente lectura llega `empezada: true` → coreografía de
   zarpar → la app navega al mueble del manifiesto (`router.replace`), el
   escritorio pinta el tablero en la misma pantalla. La pantalla de juego
   recupera el asiento del bolsillo, como hoy.
6. Volver con la mesa YA empezada (bolsillo) → no se monta el muelle: se va
   directo al juego.
7. Recargar en medio → se vuelve al muelle con todos ya sentados, naciendo
   escalonados sin coreografía de llegada.

## 7. Los ficheros y quién los escribe

| Paquete | Ficheros | Qué |
|---|---|---|
| `escenas/embarcadero/` | `piezas.ts`, `figuras.ts`, `tema.ts`, `tipos.ts` | Los contratos (ya escritos) |
| | `cala.ts`, `camara.ts`, `gestos.ts` | Aritmética pura y comprobable: la cala sembrada, las poses y restricciones de cámara, la máquina de estados |
| | `cargar.ts`, `tinte.ts`, `agua.ts`, `cielo.ts`, `aventurero.tsx`, `Embarcadero.tsx` | La escena |
| `escenas/scripts/` | `hornear.ts`, `compilar-embarcadero.ts`, `verificar-embarcadero-modelos.ts`, `verificar-embarcadero.ts` | Compilación y comprobadores |
| `escenas/modelos/` | `embarcadero.glb` | El compilado, versionado |
| `escritorio/` | `lobby3d.html`, `src/banco-lobby.tsx`, `src/banco-lobby.css` | El banco de pruebas con asientos simulados |
| | `src/muelle.tsx`, `src/sala.tsx`, `src/mesa.ts`, `src/estilo.css` | El lobby en la Sala web |
| `app/` | `app/(arcade)/muelle.tsx`, `app/(arcade)/_layout.tsx`, `src/arcade/muelle.tsx`, `src/arcade/muelle-escena.tsx`, `src/arcade/figura.ts`, `src/arcade/mesa.ts`, `src/arcade/muebles.ts` | El lobby en la app |
| `server/` | hecho: `mesas.ts`, `routes/arcade.ts`, `routes/modelos.ts`, `routes/cuenta.ts` | El contrato |

## 8. Cómo se mira y cómo se comprueba

- `npm run verificar` corre todo. Lo nuevo: `verify:aventureros`,
  `verify:embarcadero-modelos`, `verify:embarcadero` (en `escenas/`), más los de
  la mesa (`verify:mesa`, con el lobby por HTTP), la app y el escritorio.
- El banco `escritorio/lobby3d.html` enseña el muelle con asientos simulados y un
  contador de triángulos y llamadas, sin servidor. Es donde se juzga si se ve bien,
  que ningún comprobador puede decir.
- La prueba de verdad es abrir mesa desde los DOS clientes y ver la del otro
  llegar, cambiar de figura y zarpar. Ningún juego es sólo para PC.

## 9. Fuera de alcance, a sabiendas

`Canvas` único con el amanecer sobre el delta real (fase 2, con el tablero 3D);
vista en tercera persona; accesorios (armas, escudos, jarras del pack);
sonido; enlace corto `/r/CODIGO` con `intentFilter` propio; elegir color; notificar
al móvil de que la mesa se ha llenado.

## 10. Riesgos

1. **Skinning en `expo-gl`.** `three` 0.185 pone los huesos en una `DataTexture`
   flotante siempre; si un aparato no la soporta, el aventurero no se pinta. Se
   mide en un Android real antes de prometer nada, y la degradación es la pose
   horneada de reposo sin mezclador.
2. **Dos copias de `react`/`three`.** Cubierto en Metro y Vite; el síntoma si se
   rompe es un `useFrame` mudo. El banco lo delata al primer fotograma.
3. **Rendimiento en gama media.** Presupuesto medido en Node y calidad sobria
   elegida en los primeros 120 fotogramas si la media baja de 45 fps.
