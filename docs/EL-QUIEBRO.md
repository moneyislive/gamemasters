> Documento de diseño del arcade «El Quiebro». Nació de un panel de diseño el 24-sep-2026 (cuatro propuestas, tres jueces y una síntesis). El módulo hermano de Boots on Board que aquí se llama **La Liza** figuraba en el borrador como «Arenas»; se renombró porque `Arena` ya es el tipo de la arena derivada en `shared/mecanicas/mundo.ts`. La arquitectura y el reparto de ficheros están en `docs/quiebro/ARQUITECTURA.md`.

# El Quiebro: documento de diseño

**Estado:** definitivo para construir la primera versión. Puesto al día el 24-sep-2026 con lo que ya es verdad en el código (la preparación en la Bajada, el ausente momentáneo, la Acometida de 14 m, la forja propia de personajes, el alba gris): donde el diseño cambió al construirlo, este texto dice lo de hoy y, si importa, por qué.
**Base:** «El Quiebro», que ganó con los tres jueces (media 7,5). Lleva injertos de «El Desvelo» (la avaricia y la ciudad), de «La Línea» (el nivel de noche, la Memoria del Sistema, los avisos y el rol sin cuerpo) y de «La Corriente» (el reglamento publicado en la vista, la foto por equipo y la multitud determinista). Corrige todos los fallos graves que señalaron los jueces.

---

## 0. Qué se corrige y dónde

| # | Fallo grave señalado | Juez | Corrección |
|---|---|---|---|
| 1 | La plataforma grande va antes de que nadie juegue (pasaba en las cuatro propuestas) | los tres | Se invierte el orden. Primero el banco en teléfono, la lista de clips y la prueba de sensación en una plaza gris. Después, una sala de la Liza **mínima** y genérica probada con una liza de juguete. El juego va al final (§13). |
| 2 | Ni una cifra medida en un teléfono | los tres | El banco en aparato real se hace la semana 1. Los topes de N0-N3 son provisionales hasta entonces (§8, §14). |
| 3 | La Tanda puede verse flotante o de maniquí | jugador | Los clips se hacen en casa, uno por gesto, en la forja de Blender (`arte/forja/`), con los golpes medidos contra su blanco y el faldón simulado. La acometida es procedural, con parón y cortes de cámara. Hay un criterio con gente (§13, §14). |
| 4 | Variedad corta: se agota en una semana | jugador | La v1 trae avaricia de esquirlas, nivel de noche de 1 a 5, Memoria del Sistema, 6 recetas, 3 averías, 6 retoques y 3 estilos (§6). |
| 5 | La ciudad es un telón (una glorieta con muros) | jugador, espectáculo | La Llamada es una carrera de 60-110 m por las calles del barrio, con gente y tráfico. Se añaden la Bajada y el Amanecer (§5, §8). |
| 6 | El desfase de reloj vuelve aleatorio el quiebro limpio | técnica | El anuncio viaja traducido al reloj de cada destinatario. El quiebro se juzga en el reloj del propio aparato, con milisegundos (§4.3, §12). |
| 7 | Ventanas de 150 ms y ±50 ms sobre red móvil | espectáculo | La ventana limpia depende del nivel (de 200 a 120 ms) y se juzga en el reloj propio. «A compás» es una bonificación de ±75 ms, con plan B en el reglamento (§4). |
| 8 | Trajeados idénticos que poseen civiles y les reescriben la ropa en traje (la escena de los clones) | espectáculo | Los Celadores son todos distintos y **se imprimen**. El salto de cuerpo se sustituye por el **Trasvase**. Un Prestado nunca se convierte en Celador (§1, §4.8). |
| 9 | Coste por jugador en solitario sobre medio núcleo | técnica | Los NPC escalan con el número de desvelados, hay un tope de vivos por sala y la admisión se hace por coste declarado (§12). |
| 10 | GOLPE con toque y con mantener en el mismo botón | jugador | El Empellón tiene botón propio (§7). |
| 11 | Retoques elegidos con mensajes de la sala | espectáculo | Retoques, estilos y votos son movimientos de mesa. La vista publica el reglamento ya compuesto (§10). |
| 12 | Dos líneas de tiempo para la misma entidad | técnica | Fundido explícito del guion a la foto (§12). |
| 13 | Línea de vista y empuje con `seAndaEnRecta` | técnica | Prueba de losa segmento-AABB en Q16.16 (§11). |
| 14 | Anillos y balas en el reloj dilatado del Remanso | espectáculo | Las señales de juego van siempre en el reloj verdadero (§4.4). |
| 15 | Los sonidos no tienen ruta | espectáculo | Van empaquetados en el build web (§9). |

---

## 1. Nombre, gancho y fantasía

**Nombre:** El Quiebro · **id:** `quiebro` · **procedencia:** `creacion-propia`.

**Gancho (tarjeta de la Sala):** «Lee el golpe, quiébralo en el último instante y la ciudad se detiene para ti. Artes marciales bajo la lluvia, en equipo, hasta la cabina que suena.»

**Fantasía.** Eres un **desvelado**: alguien que una madrugada descubre que la ciudad es una maqueta y que puede leer su código. Todos los demás son **durmientes** y repiten su vida sin darse cuenta. El Sistema manda a los **Celadores** a devolverte al sueño y pone a trabajar a los durmientes cercanos, que pasan a ser **Prestados**. Tu ventaja es ver venir cada golpe un instante antes, como un anillo de glifos que se cierra sobre ti. Te quiebras en el último momento y la ciudad se remansa: la lluvia se queda quieta en el aire solo para ti. Contestas con una Tanda de golpes, estampas al Celador contra el quiosco y lo **desalojas** antes de que se recupere. Al final suena una cabina a dos calles y hay que llegar corriendo por el asfalto mojado. Cuanto más botín llevas encima, más duele no llegar.

Cabe en una frase: **«ser quien ve venir el golpe»**.

**Tropos genéricos que se usan, cada uno con forma propia:**
- Una ciudad simulada de madrugada: calles mojadas, farolas de sodio, niebla verdosa y la gente repitiendo su recorrido.
- Símbolos que caen y suben, con un alfabeto propio: **la Grafía**. Son 48 glifos en rejilla de 5×7 construidos a partir de signos del español (ñ, ¿, ¡, la cedilla partida, la virgulilla y las tildes). No hay katakana, ni cifras en espejo, ni monocromo verde.
- Trajeados con gafas oscuras que se llaman Celadores. **No son idénticos**: tienen cuatro siluetas (alto y enjuto, ancho, mujer, mayor con sombrero) y trajes de cuatro colores apagados (marengo, pardo, verde botella y azul noche). No llevan auricular. **No poseen a nadie**: se imprimen desde una columna de glifos.
- Gabardinas y chaquetas: el vestuario de los desvelados, en colores apagados y con el forro del color de su asiento. Los desvelados no llevan gafas oscuras.
- La cámara lenta se llama el **Remanso**.
- La salida es por una cabina rediseñada: un poste de hierro con marquesina curva y un auricular de luz ámbar **que funciona con monedas**.
- El déjà vu como fallo del sistema se llama el **Bis**: un trozo de ciudad que se repite y avisa de que llega una oleada.

**Lo que NO sale, en ningún texto, rótulo, comentario visible ni dato:** Matrix, Neo, Morpheus, Trinity, Agente Smith, el Oráculo, Zion, Nabucodonosor, centinelas, pastillas roja o azul, el logo, la tipografía de la lluvia original, citas, la expresión inglesa de la cámara lenta, la posesión de transeúntes por trajeados, la ropa que muta en traje gris, el espacio blanco infinito, el gato negro, el cuero negro largo con gafas redondas, «la línea» como salida y «el operador».

**Paleta.** Verde-cian de pantalla vieja para el código, ámbar de farola de sodio para todo lo que es del jugador (cabinas, esquirlas, avisos) y magenta de neón para los rótulos. Cada asiento tiene un color saturado de contorno, legible a 60 m.

**Voz de la casa.** Madrugada española: la «Glorieta del Relojero, 3:12», «Churros 24 h», «Lavandería La Estrella», «Pensión Oriente». El registro local aleja la estética de la franquicia mejor que cualquier lista.

**Vigilancia legal.** En `MARCAS_VETADAS` entran las formas compuestas y los nombres inequívocos, cada uno con su porqué: «The Matrix», «Matrix Reloaded», «Matrix Revolutions», «Matrix Resurrections», «Agente Smith», «Agent Smith», «Morpheus», «Nabucodonosor» y la expresión inglesa de la cámara lenta. La palabra suelta no se veta, para no tumbar ids. Antes de hacer publicidad, consulta legal.

---

## 2. Los primeros 30 segundos y el bucle

### 2.1 Los primeros 30 s (primera noche del aparato, «Jugar ya» en solitario)

| t | Qué pasa | Qué se aprende |
|---|---|---|
| 0-3 s | Una azotea bajo la lluvia, con la ciudad abajo, y un único botón: **BAJAR**. Ese toque desbloquea el audio. La carga empezó al tocar la tarjeta. | Nada todavía: solo la promesa |
| 3-9 s | **La Bajada.** Es la preparación: la cámara espera en lo alto, dando la vuelta despacio sobre la plaza, mientras el barrio se escribe en alambre de glifos y se viste, con el rótulo «Glorieta del Relojero, 3:12». Se elige estilo o se pulsa **BAJAR** («me quedo con el mío»); en cuanto están todos, la cámara cae entre fachadas hasta el hombro. Con todos listos al llegar dura 6 s, contados desde que empezó; si alguien sigue eligiendo, hasta 15 (y el resto de la tabla se corre con ella). La Bajada tapa la derivación del mundo, la carga y la conexión del canal. | El tono, y el estilo |
| 9-13 s | La palanca nace donde apoyas el pulgar: «Muévete». Dos durmientes se paran en la acera, tiemblan en glifos y echan a andar hacia ti **con su misma ropa**: son Prestados. | Moverse, y que la gente puede volverse contra ti |
| 13-19 s | Un Prestado levanta el puño y el anillo se cierra con un silbido que sube de tono: «**QUIEBRO** cuando se cierre». En los 3 primeros quiebros de este aparato, la ventana limpia es de 300 ms. Aciertas y llega el **Remanso**: la lluvia se para. | El núcleo: leer y quebrar |
| 19-25 s | «**¡GOLPE!**»: Réplica, Tanda con la música marcando el compás y un Cierre que lo **estampa** contra el cristal del quiosco. | Castigar con ritmo |
| 25-31 s | El segundo Prestado te toca a ti solo. Luego llega el **Bis**: las farolas parpadean igual dos veces y una bandada de palomas despega dos veces. «Vienen más». | La señal de oleada |

### 2.2 Bucle de 30 segundos (combate): leer, quebrar, castigar, desalojar

1. Se cierran dos anillos sobre ti: uno lento de Prestado y otro más rápido de Celador. Cada uno silba subiendo de tono hasta su impacto.
2. Quiebras al primero justo al cerrarse: **quiebro limpio**. Llega el Remanso y el Prestado queda clavado.
3. La **Réplica**, que nadie puede esquivar, lo derriba. Te giras hacia el Celador, pero su guardia para tu Entrada de frente y te contesta. Quiebras esa respuesta en limpio y llega un segundo Remanso.
4. La **Tanda a compás** (tres toques con el pulso de la música a 120 ppm) y el **Cierre** lo estampan contra un coche aparcado. El Celador cae de rodillas echando glifos, y hay 3 s para **desalojarlo**. Alguien pulsa AVISO y la gente ve «¡Desalójalo!».
5. Al desalojarlo suelta **3 esquirlas** ámbar. Recogerlas es una pequeña carrera entre compañeros.

Cada ciclo dura 6-10 s y deja Foco, puntos, esquirlas y un plano de cine.

### 2.3 Bucle de una partida: una **noche** de 6 a 10 minutos

Bajada (la preparación, de 6 a 15 s) → **Oleada 1** (Prestados) → pausa con retoque → **Oleada 2** (primer Celador) → pausa con retoque → **Oleada 3** (con Celador tirador) → pausa con retoque y **voto: «Llamar ya» o «Aguantar»** → hasta 2 **oleadas de propina** → **Bis** → **La Llamada**, una carrera a la cabina → Amanecer y recuento.

La tensión sube por tres vías. Las oleadas escalan. La avaricia pesa: las esquirlas solo valen si sales por la cabina. Y las monedas del equipo son el colchón común: si se acaban, se pierde.

### 2.4 Bucle de sesión: varias noches en la misma mesa

«**Otra noche**» es una ronda nueva de la **misma mesa**: no hace falta lobby, código nuevo ni apertura del limitador. Trae un barrio nuevo (la semilla es el código más el número de noche), una avería (desde la segunda noche: la primera es la del aprendiz y va sin ninguna), una receta y una contramedida de la Memoria del Sistema. Además, el **nivel de noche** sube si ganasteis y baja si perdisteis.

Lo que empuja a jugar «una más»:
- la escalera de niveles, de Llovizna a Tormenta;
- la racha personal de limpios;
- la esquirla de más («con una más valía 280»);
- el Celador que te quitó la noche;
- los títulos del recuento;
- la mejor noche de la mesa, por nombre.

---

## 3. Jugadores, equipos, roles y asimetría

**Mesa:** de 1 a 6 desvelados (manifiesto: `jugadores 1-6`). Es cooperativo puro contra el Sistema, sin fuego amigo. Está pensado para 1-4, lo natural en el móvil. El Muelle y el vestíbulo asumen hasta 6 asientos.

**Entradas desde la tarjeta:**
- «**Jugar ya**»: abre una mesa de 1 asiento y la empieza en el acto. Es la puerta de entrada: nunca hace falta que haya alguien conectado.
- «**Abrir mesa**»: da código y enlace para compartir.
- «**Entrar con código**».

**Elección de rol: tres ESTILOS** por asiento. Se eligen en la **Bajada**, que es la preparación de cada noche, y entre noches (recuento y final), como movimiento de mesa; elegir estilo en la Bajada ya es decir que se está listo. En la reunión se enseñan, con sus cifras, pero no se eligen: la mesa de la plataforma se cierra a los que llegan en cuanto un asiento cambia el estado, y un estilo elegido mientras se espera a los amigos les dejaría fuera con el código en la mano. En la v1 solo cambian números; las habilidades de Foco 100 llegan en la fase 2.

| Estilo | Aguante | Quiebro | Golpes | Rasgo | Papel que invita a hacer |
|---|---|---|---|---|---|
| **Gabardina** | 100 | 3,5 m | ×1,0 | Equilibrado | Todo terreno |
| **Ligera** (chaqueta corta) | 80 | 4,5 m, 2 tics menos de recuperación | ×0,8 | Enganche a 9 m | Entrar por la espalda |
| **Mole** (abrigo grueso) | 130 | 2,5 m | ×1,0, Cierre ×1,5 | Aguanta sin quedar tocado un golpe cada 6 s | Cebo de la guardia |

**La asimetría fuerte es desvelados contra Sistema.** El Sistema tiene tres tipos de enemigo:
- el **Prestado**, carne de Tanda que llega en grupos;
- el **Celador**, un duelista con guardia frontal;
- el **Celador tirador**, que dispara balas lentas desde 8-18 m.

La presión se reparte con **turnos de ataque**, al estilo de los brawlers:
- cada desvelado admite 2 turnos de cuerpo a cuerpo (un Prestado gasta 1 y un Celador 2) y 1 de disparo;
- como mucho hay 3 anuncios a la vez contra la misma persona;
- los turnos van al desvelado con menos amenazas;
- nunca se asignan a quien está en Remanso, desconectado o recién reaparecido (2 s).

**Cómo se juega con 1 y con 2.**
- Con 1 es un duelo coreográfico: 6 NPC vivos como mucho, 1 Celador por oleada y la Llamada en solitario.
- Con 2 aparece el juego de pareja:
  - uno se come la guardia del Celador de frente y el otro entra por la espalda, donde la guardia nunca para;
  - se rescatan mutuamente;
  - se pelean de broma por las esquirlas;
  - en la cabina, uno descuelga (1,5 s) mientras el otro le cubre.

**Cómo se juega con 6.**
- La glorieta pasa de 48 a 60 m de lado útil.
- Hay hasta 14 NPC vivos, 3 Celadores por oleada y 2 tiradores.
- Los estilos se reparten el trabajo solos: la Mole hace de cebo y la Ligera flanquea.
- En la cabina se forma una cola bajo presión: 6 × 1,5 s = 9 s.
- La cámara automática solo encuadra tu blanco enganchado y a ti. Los anillos que no son tuyos se pintan en tenue.

**NPC que llenan huecos.** No hacen falta aliados del servidor. El número de enemigos escala con **n**, los desvelados presentes al empezar cada oleada. Un asiento ausente (sin canal durante 60 s, o 60 s seguidos de ausente momentáneo, §5) deja de contar en la oleada siguiente.

**Modos posteriores, que reutilizan la misma pelea:**
- **La Azotea** (fase 3): todos contra todos, de 2 a 6 jugadores.
- **El Celador** (fase 4): 1 contra N asimétrico. Un jugador es el Celador, con cuerpo oculto entre los Prestados y foto por equipo.

---

## 4. Mecánicas con números

### 4.1 Escala y reloj

- El juego declara su escala: **1 u = 1 m**. No se usan las velocidades globales de Boots on Board (12 y 26,4 u/s) ni su persona de 2,543 u.
- La persona mide **1,8 m** y su radio de choque es de **0,35 m**.
- El tic dura **50 ms** (20 Hz). Todas las ventanas van en tics enteros, más los milisegundos del aparato donde se indica.
- Las reglas usan Q16.16 con `por()` y `entre()`, nunca `>>16` ni `Math.imul`. Los ángulos salen de la tabla de 256 rumbos, y `rumboHacia(dx, dz)` busca en esa tabla sin `atan2`.

### 4.2 Moverse

| Marcha | Velocidad | Cuándo |
|---|---|---|
| Andar | 2,0 m/s | Palanca por debajo del 60 % |
| Trote | 5,0 m/s | Palanca al 60 % o más (por defecto) |
| Carrera | 7,0 m/s | Palanca a fondo más de 0,8 s sin enemigos a menos de 8 m, o Mayúsculas |

- Se acelera de 0 a 5 m/s en 3 tics. El giro es libre, con desplazamiento lateral relativo a la cámara.
- **Presupuesto corto** (el servidor valida el SITIO): 7,0 × 1,25 = **8,75 m/s**, con 1 s acumulable como mucho.
- **Presupuesto largo**: **80 m cada 10 s**. Impide ir con holgura permanente, y lo suspenden los estados que llevan distancia extra.
- **Extras por estado**: quiebro +4,0 m, Entrada +5,5 m, la Acometida contra bala su vuelo más el avance de su Réplica (14 m + 3,5 a 5,5 m) y ser empujado +5 m. En el estado *descolocado* el presupuesto es 0. El Remanso no admite distancia de más: cada desplazamiento pone la suya.
- No hay salto en la v1. Los bancos, quioscos y coches aparcados son estructura y se rodean. Saltar vallas llega en la fase 2 como estado «en el aire».

### 4.3 El Quiebro, el quiebro limpio y cómo se juzga

- **Quiebro:** dura 9 tics (450 ms).
  - Tics 0-5: 3,5 m hacia donde apunta la palanca. Sin palanca, de lado respecto a la amenaza más próxima, hacia donde la estructura deje más hueco.
  - Tics 0-4: **intocable** (250 ms).
  - Desde el tic 6 ya se puede golpear.
- **Quiebro torpe:** el tercero en menos de 1,2 s no tiene intocable. Mata el aporreo.
- **Quiebro limpio:** el impacto que iba dirigido a ti cae dentro de los primeros **V ms** de tu quiebro.

| Nivel de noche | 1 Llovizna | 2 Chaparrón | 3 Aguacero | 4 Temporal | 5 Tormenta |
|---|---|---|---|---|---|
| V (ventana limpia) | 200 ms | 175 ms | 150 ms | 135 ms | 120 ms |

  En la primera noche del aparato, los 3 primeros quiebros tienen 300 ms. El retoque «Ventana ancha» suma 50 ms.

- **Cómo se juzga, sin que el desfase de reloj importe:**
  1. El servidor manda `anuncio` con el instante de impacto **ya traducido al reloj de ese destinatario**, en milisegundos del aparato.
  2. El aparato cierra el anillo exactamente en ese instante.
  3. El quiebro viaja con su tic y sus milisegundos, tomados del `timeStamp` del evento de puntero y no del fotograma, para que un tirón de pantalla no retrase la pulsación.
  4. El servidor compara **los dos instantes en el reloj del mismo aparato**: limpio si `impacto − quiebro ∈ [0, V]`; esquivado si `∈ (V, 250]`; golpe si no.
  5. El servidor espera el quiebro hasta `k + comp`, con `comp = min(RTT/2 + 25 ms, 150 ms)`.
- En cooperativo, el anuncio de un NPC se **alarga en el `comp` del blanco**: la mala red no castiga.

### 4.4 Remanso y Réplica

Con un quiebro limpio, el **servidor arbitra** esto:
- quien quiebra pasa **20 tics (1,0 s) en REMANSO**: intocable y con la Réplica habilitada;
- el que falló queda **DESCOLOCADO 20 tics**, clavado;
- **+35 de Foco**;
- **Réplica:** anuncio de 3 tics, imparable (ni se esquiva ni se para), 25 de daño y derribado. Se pierde si no se usa dentro del Remanso;
- contra una **bala**, el limpio da **Acometida**: vuelas hasta **14 m** hacia el tirador en **10 tics** y terminas en Réplica. La sala la lanza en el mismo tic de la limpia, como un solo golpe: su anuncio sale ya (todos ven la acometida entera, y los demás aparatos la pintan volando) y su impacto cae cuando el aparato termina de volar y de golpear. El diseño decía 10 m en 8 tics, y con el avance de la Réplica (de 3,5 m la Mole a 5,5 m la Ligera) y su alcance (2,3 m) no llegaba a un tirador a más de 15,8-16,8 m; el tirador se pone hasta a 18. Con 14 m llega siempre (decisión del coordinador, 24-sep). A media Acometida, GOLPE no hace nada: con un golpe propio anunciado, la sala sólo atiende el eslabón siguiente dentro de su ventana (el segundo golpe de la Réplica doble), y el aparato tampoco lo manda ni corta el vuelo. La primera versión del cliente sí lo atendía, y quien pulsaba «limpio y luego GOLPE» contra una bala se quedaba parado a seis metros del tirador.

**Presentación en el cliente.** Es adorno de una ventaja ya arbitrada:
- El reloj con que se pintan los **cuerpos ajenos** y el adorno (lluvia, civiles, partículas) va a ×0,3 durante 0,45 s, y después a ×1,6 hasta recuperar unos 315 ms. En total, unos 1,0 s.
- **Anillos, balas, líneas de apuntado y silbidos van SIEMPRE en el reloj verdadero.**
- Durante tu Remanso nadie te asigna un turno de ataque nuevo, así que no puede empezar ningún anillo contra ti. El rival que ralentizas está clavado igualmente.
- Como mucho hay un efecto de Remanso cada 2,0 s por jugador. Lo arbitrado se aplica siempre.

### 4.5 Cuerpo a cuerpo: la Tanda

**Enganche.** El aparato elige el blanco con mejor nota a 7 m o menos y ±60° de la palanca (sin palanca, de la cámara) y manda su id. El servidor lo acepta a 7,5 m o menos y con línea de vista (prueba de losa).

| Golpe | Anuncio | Daño | Efecto |
|---|---|---|---|
| **Entrada** | 8 tics (400 ms), con acometida de hasta 5,5 m hacia el blanco | 10 | Tocado 12 tics |
| **Seguida** ×2 | 5 tics (**4 a compás**) | 10 (**15 a compás**) | Tocado 10 tics |
| **Cierre** | 7 tics | 20 | Derribado 30 tics, empuje de 3 m |

- **Impacto válido:** el blanco está a 2,3 m o menos (1,1 m de alcance más la holgura de interpolación). Un golpe con avance (la Entrada, la Réplica) lo anda el APARATO en cuanto se pulsa; la sala sólo le da por andado lo que puede ir de camino en los `aqui` que aún no ha visto (un tic por tic sin ver, como mucho `comp` más uno), nunca lo que no anduvo: quien no avanza falla más allá de unos 2,3 m.
- **Fallo:** blanco lejos, blanco que quiebra o guardia. Deja **DESCOLOCADO 8 tics**.
- **Encadenar:** se pulsa entre −100 y +250 ms respecto del impacto anterior. **A compás** es a ±75 ms. Se juzga en el reloj del aparato frente al impacto que él mismo pintó, así que no depende de la red. A compás es una **bonificación** (+5 de daño y +5 de Foco) y nunca hace falta para avanzar. **Plan B:** si en el banco la tasa a compás baja del 15 %, el reglamento lo ensancha a ±100 ms.
- La pulsación hecha durante la recuperación se guarda 3 tics.
- Una Tanda completa a compás dura unos 1,15 s y hace 60 de daño.

**Empellón** (botón propio):
- anuncio de 10 tics;
- **rompe la guardia**;
- 8 de daño, empuje de 4 m y tocado 24 tics;
- recarga de 3 s;
- un Celador que lo ve venir de frente lo esquiva el 50 % de las veces, con el azar sembrado de la sala.

**Guardia del Celador:**
- **para las Entradas de frente** (±60°) si no está tocado, descolocado ni derribado;
- entonces tú quedas descolocado 8 tics y él **responde** con un anuncio de 6 tics (300 ms);
- quebrar limpio esa respuesta es el Remanso más valioso;
- **por la espalda, la Entrada nunca se para.**

**Estampado:** si el empuje de un Cierre o de un Empellón choca con una caja de la **estructura**:
- el cuerpo se para contra ella;
- recibe **+15 de daño** y **+10 tics** de derribado;
- lo decide el servidor con una trayectoria segmento-AABB;
- la grieta en la fachada es adorno.

### 4.6 Proyectiles: balas lentas y visibles

- El **Celador tirador** dispara desde 8-18 m con la línea libre.
- **Apunta 12 tics** (600 ms) con una línea de glifos, al sitio donde estabas al terminar de apuntar.
- Dispara una **ráfaga de 3 balas** separadas 3 tics.
- Cada bala va a **20 m/s** (a 15 m tarda 750 ms), con radio de 0,2 m, **12 de daño** y alcance de 30 m. Se para contra la estructura.
- **Se juzga como en El Desvelo:**
  - el aviso `bala` trae el origen, el rumbo (0-255) y el instante de salida;
  - el aparato la pinta en su sitio **verdadero** con la misma tabla;
  - el servidor la juzga contra **los sitios que el propio blanco declaró** para esos tics, esperándolos hasta 250 ms, sin rebobinar;
  - lo que ves es lo que se juzga.
- Se esquivan con un paso de lado o con un quiebro, y un limpio da Acometida.

### 4.7 Aguante, desconexión, monedas y Foco

- **Aguante:** según el estilo (80, 100 o 130).
  - Daño recibido: Prestado 8; Tanda de Celador 10, 10 y 15; respuesta de guardia 15; bala 12. Todo se multiplica por el factor de nivel (tabla 4.10).
  - Se recupera: +10 al desalojar y +30 al cerrar una oleada.
- **Desconectado** (aguante 0): 12 s en el suelo.
  - Un compañero a 1,5 m o menos mantiene **USAR 1,5 s** y lo **rescata** con 40.
  - Si nadie llega, el equipo gasta una **moneda** y reapareces a los 8 s en la **cabina de refugio**, al borde de la glorieta, con 60 e intocable 2 s.
  - Sin monedas, esperas en **Vigía** (rol sin cuerpo, §7) hasta la siguiente pausa, y ahí vuelves con 60.
  - Si todos quedan desconectados y no hay monedas, **se pierde la noche**.
- **Monedas del equipo:** 3 en los niveles 1-3 y 2 en los niveles 4-5. Sirven para reaparecer y para hacer sonar otra cabina (§5).
- **Foco** (0-100):
  - se gana: +35 por limpio, +5 por golpe a compás, +20 por desalojo y +10 por estampado;
  - se gasta en el **Quiebro de ruptura** (50): sales de un tocado o de una Tanda enemiga con 6 tics de intocable;
  - en la fase 2, también en la habilidad del estilo (100).
- **Racha:** +10 % a todos los puntos por cada limpio seguido sin recibir daño, hasta ×2.

### 4.8 Enemigos

| | Vida | Velocidad | Ataque | Anuncio | Daño | Especial |
|---|---|---|---|---|---|---|
| **Prestado** | 20 | 4,0 m/s | Golpe | 14 tics (700 ms) | 8 | Al caer vuelve a ser durmiente y huye (adorno). Nunca se convierte en Celador |
| **Celador** | 90 | 5,5 m/s | Tanda de 3 | 11 tics, luego 6 si acertó | 10/10/15 | Guardia frontal ±60°. Desalojable. Trasvase |
| **Celador tirador** | 70 | 4,5 m/s | Pistola y Tanda de 2 | Apunta 12 tics | 12 por bala | Busca 8-18 m. Desalojable. Trasvase |

- **Aparición:**
  - Los Prestados salen de la gente. El servidor fija el punto y el tic, y cada aparato elige con la misma función pura al **durmiente de guion** más cercano a ese punto. Todos ven al mismo civil ponerse a temblar, a coste cero para el servidor.
  - Los Celadores **se imprimen**: una columna de glifos cae y se compacta en un hombre o una mujer que se ajusta los puños. Tarda 1,2 s y avisa en la brújula.
- **Desalojo:**
  - a vida 0, el Celador queda **DESALOJABLE 60 tics** (3 s), de rodillas y echando glifos;
  - **REMATE:** USAR a 2,5 m o menos durante 24 tics (1,2 s), en los que eres intocable;
  - suelta **3 esquirlas** y te da +10 de aguante.
- **Trasvase** (sustituye al salto de cuerpo):
  - si nadie lo desaloja en 3 s, el Celador **absorbe** al Prestado vivo más cercano a 12 m o menos;
  - unos hilos de glifos van del Prestado al Celador durante 0,6 s, visibles para todos;
  - el Prestado se apaga y vuelve a ser durmiente, y el Celador se levanta con 45;
  - si no hay Prestado cerca, se deshace y **se reimprime** a los 2 s en una zona de aparición a 15 m o más, con 45;
  - lección que surge sola: no dejes Prestados vivos junto a un Celador caído.

### 4.9 Botín: las esquirlas (avaricia)

- Solo las sueltan los Celadores desalojados: 3 por Celador. Se recogen **automáticamente** pasando a 1,2 m o menos. Cualquiera puede recogerlas, y ahí está la rivalidad amistosa.
- Cada desvelado lleva **12 como mucho**.
- **Solo cuentan si sales por la cabina**, y se pagan en triangular: **T(n) × 10 puntos**. 3 → 60, 6 → 210, 9 → 450, 12 → 780.
- El HUD enseña siempre «**6 → 210 · con una más, 280**».
- **Al desconectarte** se te caen todas en un montón que dura 20 s y que puede recoger cualquiera, tú incluido tras el rescate.
- Si la noche acaba sin que salgas, se pierden.

### 4.10 Escalado por número de jugadores y por nivel

`n` es el número de desvelados presentes al empezar la oleada.

| | n = 1 | n = 2 | n = 3-4 | n = 5-6 |
|---|---|---|---|---|
| Glorieta (lado útil) | 48 m | 48 m | 48 m (3) / 60 m (4) | 60 m |
| NPC vivos como mucho | 6 | 8 | 11 | 14 |
| Oleada 1: Prestados (4 + 2n, en 3 tandas) | 6 | 8 | 10-12 | 14-16 |
| Oleada 2: Celadores ⌈n/2⌉ + Prestados 3 + n | 1 + 4 | 1 + 5 | 2 + 6/7 | 3 + 8/9 |
| Oleada 3: Celadores + tiradores + Prestados 2 + n | 1 + 1 + 3 | 1 + 1 + 4 | 2 + 1 + 5/6 | 3 + 2 + 7/8 |
| Propina (4 y 5): ⌈n/2⌉ + 1 Celadores + tiradores + Prestados | 2 + 1 + 3 | 2 + 1 + 4 | 3 + 2 + 5/6 | 4 + 2 + 7/8 |
| Llamada: Prestados de 1 en 1 cada 2 s (vivos como mucho) | 4 | 5 | 7 | 9 |

| Nivel | Anuncios | Daño recibido | Monedas | Extra | Puntos |
|---|---|---|---|---|---|
| 1 Llovizna | ×1,00 | ×1,0 | 3 | — | ×1,00 |
| 2 Chaparrón | ×0,95 | ×1,0 | 3 | — | ×1,25 |
| 3 Aguacero | ×0,90 | ×1,1 | 3 | +1 Celador en las oleadas 2-5; guardián en la cabina | ×1,50 |
| 4 Temporal | ×0,85 | ×1,2 | 2 | La Llamada dura 40 s | ×1,75 |
| 5 Tormenta | ×0,80 | ×1,3 | 2 | +1 Celador más | ×2,00 |

Cada oleada tiene un **reloj de 150 s**. Si vence, los enemigos que quedan se disuelven, la oleada queda «aguantada» sin su bonificación de aguante y se sigue.

### 4.11 La Llamada: el objetivo final

- Tras el Bis suena **una de 4 cabinas candidatas**, a 60-110 m del centro de la glorieta y a 1-2 manzanas por calles reales. Un haz de glifos ámbar la marca por encima de los tejados y su timbre se oye en 3D.
- El límite de la arena se abre al barrio entero, de unos 156 m de lado.
- La cabina suena **50 s** (40 s en los niveles 4-5).
- **Descolgar:** mantener USAR **1,5 s** a 1,5 m o menos, **de uno en uno**. Un golpe corta el descuelgue.
- Quien descuelga **sale**: suma su bonificación y sus esquirlas y pasa a Vigía.
- Si la cabina calla con gente dentro, se gasta una moneda y suena **otra candidata** durante 40 s. Sin monedas, se acabó.
- **Victoria:** sale al menos la mitad del grupo, redondeando hacia arriba. En solitario, sales tú.

### 4.12 Puntos por asiento

| Acción | Puntos |
|---|---|
| Golpe | 10 (+5 a compás) |
| Quiebro limpio | 50 |
| Réplica | 25 |
| Estampado | 30 |
| Desalojo | 100 |
| Rescate | 75 |
| Salir por la cabina | 150 |
| Esquirlas al salir | T(n) × 10 |

Todo se multiplica por la racha (hasta ×2) y por el factor de nivel. El recuento no suma puntos de equipo: el resultado del equipo es ganar o perder la noche, y eso mueve el nivel.

---

## 5. Flujo de partida, victoria y revancha

1. **Reunión** (vestíbulo de la casa con tema propio en la v1; el Bar Desvelo en la fase 2).
   - Se ven el código y los tres estilos con sus cifras; el estilo se elige en la Bajada (§3).
   - Cualquiera pulsa EMPEZAR: con 1 asiento en «Jugar ya», con 1 o más en una mesa abierta.
   - **Al empezar, la mesa se cierra.**
2. **Bajada: la preparación** (hasta 15 s): barrio, nivel, avería y contramedida en el rótulo, y el reloj. Cada asiento elige estilo o pulsa **BAJAR** (el movimiento `listo`, «me quedo con el mío»); elegir estilo también cuenta como listo, y se cambia una vez por tramo. Se ve quién falta. Con todos listos, el reloj pasa a ser el de la caída, 6 s contados desde que empezó la Bajada (o ninguno, si ya pasaron), y la cámara cae entre fachadas en lo que quede; si la Bajada acaba antes de que haya caído, la caída sigue un par de segundos dentro de la oleada. Sin todos, a los 15 s se baja igual.
3. **Oleada** (≤150 s), luego **Pausa** (15 s):
   - cada asiento elige 1 de los **3 retoques** que le ofrece la vista;
   - desde la oleada 3, además, **vota** «Llamar ya» o «Aguantar»;
   - la pausa acaba cuando han elegido todos los presentes o cuando vence su reloj (entonces se aplica la opción por defecto: el primer retoque y «Llamar ya»);
   - en la pausa se recuperan +30 de aguante y vuelven los desconectados.
4. **Aguantar:** gana si hay mayoría estricta de votos por aguantar; el empate llama. Así se juegan hasta 2 **oleadas de propina**, con la receta del nivel siguiente y más Celadores (más esquirlas).
5. **Bis y La Llamada** (§4.11).
6. **Amanecer y Recuento** (20 s):
   - el barrio se borra desde los bordes y el cielo palidece;
   - salen los puntos, las esquirlas cobradas, los títulos («Más limpios», «Racha más larga», «Más desalojos», «Más rescates», «El Avaro») y la mejor noche de la mesa.
   - Si hay **derrota**, «la ciudad se reinicia»: se rebobinan 3 s del búfer local de fotos y hay un fundido.
7. **Final de la noche.** Hay tres salidas:
   - «**Otra noche**»: ronda nueva en la misma mesa; el nivel sube con la victoria y baja con la derrota;
   - «**Cerrar la mesa**», que da `seAcabo`;
   - «**Otra mesa**», que abre código nuevo para que entre gente nueva.
   Hay un tope de **10 noches por mesa**, para que el diario no crezca sin fin.

**Condiciones de victoria:**
- noche ganada si en la Llamada sale al menos la mitad;
- noche perdida si todos están desconectados sin monedas, si se acaban las monedas en la Llamada sin llegar a la mitad, o si el grupo se rinde.

**Desconexiones y despliegues:**
- quien se cae tiene 60 s de gracia; después es un asiento **ausente**, porque no hay verbo para levantarse, y la siguiente oleada escala a los presentes;
- **ausente momentáneo** (pestaña oculta, llamada entrante, la app en segundo plano): a los 2 s sin un `aqui` **vivo** —el que cierra diez tics seguidos del aparato; un `aqui` que pulsa algo o se mueve también cuenta— el asiento queda ausente: intocable, fuera de los turnos, ningún NPC lo persigue ni le apunta, y a cambio **ni anda ni pega** (lo que pulse no cuenta ni se guarda, y lo que había lanzado y no ha llegado se corta). Lo que venía contra él se corta sin daño. Vuelve con diez `aqui` vivos seguidos y una vuelta corta: 10 tics de intocable que corta su primera acción. El aparato, al irse al fondo, suelta todos los mandos y **deja de mandar** (la app se lo dice al documento del WebView con su `AppState`), así que la sala lo sabe también en los aparatos que no frenan sus temporizadores; el HUD lo dice con un panel al volver, y a los compañeros se les ve tenues con su rótulo encima. Para «se fue» (y no contar en la oleada siguiente) el ausente se suma entero en la fase: 60 s;
- un **despliegue** cierra el canal con 1001: la sala se rehace desde la mesa y **reanuda la oleada en curso desde su principio**, con aguante lleno y las esquirlas y monedas del último punto de control. Como mucho se pierde una oleada;
- si durante una fase de juego llegan dos tics perezosos seguidos sin ningún veredicto entre medias (sala muerta sin nadie), la noche pasa a «interrumpida», con las opciones **Reanudar** y **Rendirse**.

---

## 6. Rejugabilidad

1. **Barrio procedural por noche.**
   - La semilla es el código más el número de noche.
   - Se genera una rejilla de **3×3 manzanas de 36 m** con **calles de 12 m** (acera de 3, calzada de 6, acera de 3). La manzana central es la **plantilla de plaza**; en la v1, la **glorieta**, con quiosco, fuente, 2-3 coches aparcados, bancos y pilares del tren elevado, todo como estructura.
   - La semilla decide también las alturas, las fachadas, los neones con rótulos inventados, los coches y quioscos de las calles (que son estructura), las 4 cabinas candidatas, el tiempo (llovizna, aguacero o niebla baja), la hora y el nombre del barrio.
   - Se deriva en 3 ms o menos y es idéntico en todos los niveles.
2. **Recetas de oleada** (6 en la v1, barajadas por la semilla):
   - Enjambre: todo Prestados, en salida escalonada.
   - Pareja: dos Celadores que se cubren.
   - Pinza: entran por calles opuestas.
   - Marea: Prestados continuos contra un tope de vivos.
   - Francotirador: tirador en un borde con Prestados de escolta.
   - Emboscada: la impresión nace detrás del grupo.
3. **Averías** (una por noche desde la segunda, barajadas por mesa: la primera noche es la del aprendiz y va sin avería). La v1 trae 3 más «ninguna»:
   - **Eco:** cada ataque enemigo se repite como fantasma 1 s después en el mismo sitio. Hay que quebrar dos veces.
   - **Cristal:** todos a media vida y puntos ×1,5.
   - **Apagón:** las farolas se apagan; los enemigos pierden el contorno a más de 15 m, igual para todos los aparatos.
   La fase 2 añade Hora punta, Compás, Plomo, Resbalón y Prisa.
4. **Retoques.** Se elige 1 de 3 en cada pausa. La v1 trae 6:
   - **Paso largo:** +1,5 m sobre el quiebro de su estilo (la Gabardina llega a los 5 m; cada estilo conserva su diferencia) y 50 ms más de esquiva, que es el «+1 tic de intocable» en el reloj del aparato.
   - **Ventana ancha:** +50 ms de ventana limpia.
   - **Réplica doble:** 25 + 15.
   - **Puño de plomo:** empujes de 5 m y estampado +25.
   - **Imán:** enganche a 9 m y acometida de 7 m.
   - **Enlace:** rescate en 0,8 s, y los dos ganáis +30 de Foco.
   La fase 2 sube a 12 (Sangre fría, Tanda larga, Palma quieta, Rebote, Aguante y Eco propio).
5. **Memoria del Sistema** (de La Línea). La mesa recuerda la noche anterior y el Sistema se adapta con **una contramedida**, anunciada en la Bajada:
   - «Monedas caras»: −1 moneda si hubo 4 o más reapariciones.
   - «Tiradores»: +1 tirador en las oleadas 2 y 3 si el 60 % o más de los anuncios acabaron en limpio.
   - «Plaza despejada»: la glorieta sale con menos cajas si hubo 8 o más estampados.
   Solo se aplica la más fuerte. Obliga a adaptarse sin tocar ninguna mecánica: son números del reglamento.
6. **Nivel de noche de 1 a 5** (de Llovizna a Tormenta; tabla 4.10). Es la escalera de «una más».
7. **Avaricia.** El voto «Aguantar» y la esquirla de más hacen que cada noche tenga una decisión con riesgo.
8. **Lo que surge solo:**
   - flanquear la guardia;
   - no dejar Prestados vivos junto a un Celador caído (el Trasvase);
   - llevar a los enemigos contra los coches para estampar;
   - repartirse la cola de la cabina.
9. **Sin cuentas no hay progresión entre partidas.** La variedad vive dentro de la noche y de la mesa, y se compite por nombre tecleado.
10. **Fase 2:**
    - 6 plantillas de plaza;
    - el **Bis estructural**: en la pausa previa a la Llamada una manzana mutable se reescribe por franjas y cambia coberturas. El mundo sale de la vista con aviso de 3 s y rescate en anillos;
    - la **noche señalada** diaria, con semilla común. Pide decidir dónde se guardan los récords.

---

## 7. Mandos

### Móvil apaisado (WebView de la app y /jugar en el iPhone)

- Los mandos son HTML con **Pointer Events** y `touch-action: none` sobre el lienzo. Hay multitoque nativo del motor del navegador.
- **Todo actúa en `pointerdown`**, nunca en click. La hora de la pulsación se toma del `timeStamp` del evento.
- **Mitad izquierda (45 %): palanca flotante.**
  - Nace donde se apoya el pulgar. Base de 56 pt de radio y zona muerta del 12 %.
  - Por debajo del 60 % anda; por encima trota; a fondo más de 0,8 s corre.
- **Mitad derecha: mirar** arrastrando en la zona libre.
  - Giro de 0,35°/pt y cabeceo de −10° a +35°.
  - La cámara es **automática** por defecto: encuadra el blanco enganchado y a ti. Si la tocas, manda el dedo durante 2 s.
- **Botones** en arco abajo a la derecha, respetando las zonas seguras:

| Botón | Tamaño | Qué hace |
|---|---|---|
| **GOLPE** | 88 pt | Entrada y Tanda |
| **QUIEBRO** | 72 pt | Hacia la palanca, o de lado si está suelta |
| **EMPELLÓN** | 60 pt | Rompe la guardia; se ve su recarga |
| **USAR** | 64 pt | Solo aparece cuando sirve: *Rematar*, *Rescatar*, *Descolgar*. Se mantiene, con un anillo de progreso |
| **AVISO** | 44 pt, arriba a la derecha | Contextual: sobre un enemigo lo **marca**; junto a un caído, «**Rescate**»; con la cabina sonando, «**Voy**» |

- Arriba a la izquierda, un botón de menú y marcador. Hay opción zurda en espejo.
- El Quiebro de ruptura sale al pulsar QUIEBRO estando tocado con 50 de Foco o más.
- Vibración: `navigator.vibrate` si el motor lo permite; si no, un puente a `expo-haptics` en la fase 2.
- En vertical se muestra «Gira el teléfono»: en /jugar no se puede bloquear la orientación en el iPhone.

### PC (cliente de escritorio y navegador)

| Tecla | Acción |
|---|---|
| WASD | Moverse, relativo a la cámara |
| Ratón | Mirar, con puntero bloqueado; si falla, arrastrar con el botón derecho |
| Clic izquierdo / J | Golpe |
| Espacio / clic derecho / K | Quiebro |
| F / L | Empellón |
| E | Usar (mantener) |
| Mayúsculas | Correr |
| Q | Aviso |
| Tab | Marcador |
| Esc | Soltar el ratón |

El mando de consola (Gamepad API) llega en la fase 2.

### Cámara y HUD

- **Cámara:** al hombro, a 3,2 m detrás y 1,7 m de alto. Campo de visión de 75° en el móvil y 70° en PC. Se abre a 4 m con enemigos a menos de 5 m. No atraviesa paredes (segmento-AABB contra estructura) y no se balancea al correr.
- **HUD:**
  - en la Bajada, la preparación: el reloj de verdad, los estilos que se pueden elegir, BAJAR y quién falta;
  - el ausente: un panel en el centro mientras la sala te tiene por ausente, «De vuelta» al volver, y el rótulo sobre el compañero ausente;
  - barra de aguante y anillo de Foco;
  - esquirlas «n → valor» y monedas;
  - el reloj de la oleada o de la Llamada;
  - una **brújula en franja** con una marca para **todo lo que suena**: la cabina, los tiradores que apuntan fuera de pantalla, los compañeros caídos y los montones de esquirlas. Así se juega igual en silencio.

### Rol sin cuerpo: Vigía

Lo ocupan quien está desconectado esperando y quien ya salió por la cabina.
- La cámara sube a una vista cenital a 25 m sobre la misma escena.
- Tocar un enemigo lo **marca** para los compañeros durante 4 s.
- Nadie mira una pantalla gris.

### Cómo se siente el combate

- **Tu personaje responde en el mismo fotograma**: el paso se simula en local y la animación de ataque arranca al pulsar.
- La **anticipación es elástica**: cuando vuelve tu anuncio con su instante de impacto, el cliente estira o encoge la preparación para que el puño llegue justo en ese instante.
- El contacto trae un **parón de impacto** de 60-100 ms, chispas, sacudida y tres capas de sonido. El parón esconde la espera del veredicto.
- Las acciones de los demás (acometidas, quiebros, empujes) se pintan **por guion** desde el evento, en el presente del servidor. Solo el paseo libre va 150 ms atrás.
- Se juega a 120 ppm: se pulsa con ritmo, no aporreando.

---

## 8. Dirección de arte, momentos de espectáculo y niveles

**La ciudad**, con GLSL propio y un `ShaderMaterial` por familia:
- **Asfalto mojado:**
  - albedo ×0,3, charcos por ruido del mundo con F0 de 0,02 y mucho brillo;
  - **tarjetas de reflejo**: planos aditivos instanciados que estiran bajo el suelo cada farola, ventana, neón y faro;
  - ondas de gota desde N1.
- **Fachadas procedurales:** la rejilla de ventanas sale de las UV y cada ventana se enciende según un hash de celda y la semilla. **Interiores falsos analíticos** a menos de 60 m desde N1, sin atlas de fotos. Neones con rótulos inventados en castellano.
- **Niebla de altura** verde-cian inyectada en el trozo de niebla de todos los materiales. Vapor que sale de las alcantarillas.
- **Tren elevado** cada unos 40 s, con su guion sembrado, su temblor y su franja de luz. Sus pilares son estructura.
- **Gente** (adorno determinista):
  - **48 durmientes de guion** por barrio, en rutas cíclicas por aceras y pasos de cebra, en tramos alineados con los ejes, con semáforos de 30 s y grupos;
  - su sitio es una **función pura en `shared/`** (Q16.16, sin trigonometría), idéntica en todos los aparatos y en **todos los niveles**: los Prestados salen de ellos;
  - se pintan con **animación horneada en textura (VAT)**, en 1-3 llamadas de dibujo;
  - los jugadores y los NPC los atraviesan, y ellos se apartan medio metro en local;
  - fuera del límite jugable (balcones, calles cortadas, tras las vallas) hay **gente de fondo** cuya densidad sí depende del nivel.
- **Tráfico:** coches en marcha solo en las avenidas exteriores y en las calles cortadas. Dentro del área jugable solo hay coches **aparcados**, que son estructura.
- **Cielo:** tras la niebla, columnas tenues de la Grafía que suben.
- **La luz del barrio** sale de la hora de la noche (la misma en todos los aparatos): de la 1:00 a las 2:59, **madrugada** de sodio; de las 3:00 a las 4:59, **alba gris**, un cielo cubierto verde-gris sin sol, luz difusa, niebla en capas que se come los bajos y las torres lejanas en silueta, con las farolas aún encendidas y pocas ventanas con luz; cuanto más tarde, más clara.

**Personajes: la forja propia** (`arte/forja/`, creación propia; nada descargado). El borrador contaba con Quaternius, MakeHuman y los paquetes de animación UAL; al construirlo se hicieron en casa, por código, con Blender 4.2 sin ventana (campos de distancia, *surface nets*, pesos, animación y exportación):
- **Seis desvelados**: hombre y mujer con Gabardina, Ligera y Mole, con el forro del color del asiento. LOD0 de unos 8.000 triángulos, LOD1 de 4.000 y LOD2 de 1.000.
- **Cuatro Celadores** (alto y enjuto, ancho, mujer y mayor con sombrero; el tirador es el mismo con la pistola en la mano), con gafas de cinco monturas, ninguna redonda, y el traje de una de cuatro telas.
- **Durmientes**: 2 cuerpos × 4 ropas de calle, con paraguas; y un LOD3, el maniquí de unos 400 triángulos de la multitud.
- **Los clips**, uno por gesto del juego (46, con sus variantes por dirección y por clase): locomoción, la Tanda, esquivas, reacciones, caídas, pistola, «usar»; los golpes medidos contra su blanco y el faldón simulado.
- En el cliente, **una llamada por cuerpo** (las zonas de material fundidas en una geometría con su paleta, y el contorno en el mismo sombreador). Los cuerpos lejanos sin esqueleto y la multitud van en **rebaños** con los huesos horneados en textura: los desvelados lejanos, en el maniquí del primer estilo de su cuerpo teñido con el color de SU estilo y el de su asiento (dos llamadas y no seis); los Prestados, en el de los durmientes. Sólo los cercanos llevan esqueleto.
- El reparto entero comprimido (meshopt) pesa unos 5,5 MB y la primera noche en N0 unos 3,1. El tope de descarga para la primera noche en N0 sigue en **8 MB**, con 20 MB en total como mucho.

**Momentos de espectáculo (lo que tiene que lucir):**
1. **La Bajada.** Caída entre fachadas mientras el barrio se escribe en alambre de glifos y se viste.
2. **El Remanso.**
   - La lluvia se queda quieta; sale gratis, porque es el tiempo del sombreador a ×0,3.
   - Desaturación del 70 % salvo los enemigos, perfilados en glifos.
   - Anillos de aire tras las balas, la cámara que orbita 20° y el campo de visión que se cierra 8°.
   - En el pico, durante 0,3 s, **las fachadas se transparentan en su rejilla de glifos**: se ve el código de la ciudad.
3. **La Tanda y el Estampado.**
   - Parón, chispas y una onda en el Cierre.
   - La fachada estampada se agrieta con glifos que brillan **y la grieta dura toda la noche**.
   - Rompibles como adorno disparado por sucesos del servidor: cristal del quiosco, buzones de periódicos con hojas volando y sillas de terraza.
4. **El Desalojo.** Cámara cerca durante 1,2 s. Del Celador suben columnas de glifos: se va. No hay sangre.
5. **La Impresión.** Cada Celador cae como columna de glifos y se compacta con su silueta propia.
6. **El Trasvase.** Hilos ámbar-verdes del Prestado al Celador caído; el civil se apaga.
7. **El Bis.** En un radio de 20 m la lluvia se para. La gente repite el mismo gesto de 1 s, las farolas parpadean dos veces igual y las palomas despegan dos veces. El borde es una pared de glifos que tiembla.
8. **La Llamada.** Todas las cabinas callan y una suena. El haz ámbar asoma sobre los tejados y hay una carrera por la calle mojada entre la gente.
9. **La salida.** Te deshaces en glifos ámbar que suben por el cable, y el auricular queda balanceándose.
10. **El Amanecer.** El barrio se borra desde los bordes. En la derrota, «la ciudad se reinicia» con un rebobinado de 3 s.

**Niveles automáticos.** Solo cambian el adorno. **La estructura, los anillos, las líneas de apuntado, las balas, los 48 durmientes de guion y las siluetas con contorno hasta 60 m son idénticos en todos los niveles.** Los topes de la tabla son provisionales hasta el banco.

| | N0 (Android modesto) | N1 (gama media) | N2 (gama alta, PC integrada) | N3 (PC con gráfica dedicada) |
|---|---|---|---|---|
| Resolución | DPR 0,75 | DPR 1,0 | DPR 1,25-1,5 | hasta DPR 2 |
| Posproceso | Ninguno (tono en el material) | Pase «uber» de 8 bits: brillo a ¼, viñeta y LUT | Compositor HalfFloat (si el sondeo lo CREA): brillo, SMAA y LUT | Además, SSR solo en la máscara de charcos, AO a media resolución y DOF en el Remanso |
| Charcos | Tarjetas, sin ondas | Ondas | Ondas y salpicaduras | Más SSR |
| Fachadas | Ventanas emisivas planas | Interiores falsos a menos de 60 m | Más 4 farolas reales cerca | Haces de luz en la niebla |
| Sombras | No | No | Luz principal hasta 40 m | 3 cascadas |
| Lluvia | 1.000 rayas | 3.000 | 6.000 con salpicaduras | 10.000 |
| Durmientes de guion (48) | Maniquí VAT de 400 triángulos | VAT de 1.500 | VAT, y esqueleto en los 8 más cercanos | Esqueleto en los 16 más cercanos |
| Gente de fondo y coches en marcha | 0 / 4 | 24 / 8 | 60 / 16 | 120 / 30 |
| Esqueletos de NPC | Los cercanos, animación lejana a 7 Hz | Hasta 12 | Hasta 20 | Hasta 20 |
| Topes provisionales | 150.000 triángulos, 60 llamadas | 250.000, 90 | 600.000, 150 | 1.500.000, 250 |

**El presupuesto se juzga con el juego entero delante.** Cada pieza declara su renglón (los personajes, un cuarto de cada tope), pero lo que manda es el tope del juego entero. Medido en el juego real el 24-sep (`/sala/quiebro.html?prueba=1`, una noche en solitario con enemigos en pantalla, cada nivel forzado, `renderer.info` de la escena), lo que no son personajes gasta en el peor fotograma 25 llamadas en N0, 23 en N1, 23 en N2 y 18 en N3 (y 38.000, 91.000, 176.000 y 125.000 triángulos); con el peor caso de los personajes (15, 19, 31 y 39 llamadas) queda muy por debajo de 60, 90, 150 y 250. Los seis estilos de la forja, cada uno en su rebaño, pasaban a los personajes de su cuarto en N0 y N1; se juntaron los rebaños de los desvelados en vez de subir la cuota. Las cifras y cómo se tomaron están en `escritorio/src/quiebro/personajes/presupuesto.ts`.

**Gobernador propio** (`escritorio/src/quiebro/calidad/niveles.ts`):
- arranca en N1, o en lo que diga un sondeo que **crea de verdad** un render target HalfFloat (no se fía de `getExtension`);
- baja un nivel en cuanto la media pasa de 22 ms en 60 fotogramas;
- sube a prueba tras 20 s con holgura y **no vuelve a un nivel que ya falló**;
- ignora las muestras con la pestaña oculta;
- mide contando llamadas y triángulos (`gl.info.render`), no cronometrando;
- hacia fuera informa `sobria` en N0 y `plena` en N1-N3.

---

## 9. Sonido (la primera vez en la plataforma)

Va con **WebAudio**, empaquetado en el build web (Vite) y servido con el resto del paquete: **no hace falta ruta nueva ni módulo nativo**, porque la app lo pinta en un WebView. Se desbloquea con el toque de **BAJAR**. Pesa 1,5 MB como mucho, en AAC o MP3 mono a 96 kbps, más síntesis propia.

Lo mínimo que cambia la experiencia, por orden de importancia:
1. **El silbido del anillo** (síntesis). Sube de tono hasta el instante de impacto y va espacializado. **Permite quebrar de oído**. Es jugabilidad, no adorno.
2. **Golpes en 3 capas** (aire al pulsar, impacto con el veredicto y cuerpo), cristales y estampado (CC0).
3. **El Remanso:** paso bajo a 800 Hz, tono a la mitad y latido.
4. **La cabina:** timbre 3D audible a 150 m. Es la brújula sonora de la carrera.
5. **El Bis:** 1 s de ambiente que se repite dos veces, como una cinta que tartamudea.
6. **Lluvia y ciudad:** bucle que se amortigua bajo las marquesinas, pasos en mojado y el tren.
7. **Música a 120 ppm en 3 capas:** base; percusión que entra con la racha; melodía en la Llamada. El pulso es el que marca «a compás».

**Accesibilidad.** Todo lo que suena tiene su marca en la brújula o su anillo. En el iPhone, WebAudio enmudece con el interruptor de silencio, y se avisa en pantalla la primera vez.

---

## 10. Reparto del estado

### MESA: lo grueso, persistido

Reductor puro en `shared/arcade/juegos/quiebro.ts`.

**Manifiesto:** `{ id:'quiebro', nombre:'El Quiebro', icono:'mando', jugadores:{minimo:1, maximo:6}, sede:'servidor', tickHz:0, mueble:'tablero', secretos:false, marcador:{tipo:'ninguno'}, procedencia:{tipo:'creacion-propia'} }`.
- La proyección es la identidad.
- `seAcabo` se cumple en la fase `cerrada`.
- `opciones()` cubre todas las fases, así que el robot genérico llega al final sin sala: empezar → rendirse → cerrar.
- La mesa se abre con un **plazo de 300 s** como vigilancia, no por turnos.

**Lo que guarda:**
- **fase:** `reunion` · `bajada(n)` · `oleada(n, k)` · `pausa(n, k)` · `llamada(n)` · `recuento(n)` · `interrumpida` · `final` · `cerrada`;
- el **reloj de fase** declarado en la vista: `{fase, duraMs}`;
- **por noche:** número (siembra el barrio junto con el código), nivel 1-5, avería, receta, contramedida y plantilla;
- **por asiento:**
  - estilo;
  - retoques elegidos;
  - los 3 retoques ofrecidos (sacados del `azar` del contexto);
  - voto;
  - ausente;
  - puntos de la noche;
  - **esquirlas y aguante del último punto de control**;
  - contadores del resumen (limpios, desalojos, estampados, rescates, caídas);
- **monedas** del equipo en el último punto de control;
- **historial** de las últimas 10 noches (resultado, nivel, puntos y títulos) y la mejor noche de la mesa;
- el **reglamento publicado**: solo ids (base, nivel, avería, contramedida, y estilo y retoques por asiento). La sala y los aparatos lo componen con la misma función pura `componerReglamento(vista)`;
- el **TableroDeclarado**, de unos 3 kB: el plano del barrio con el marcador en paneles. Es el respaldo honrado del escritorio.

**Movimientos que recibe:**

| Origen | Tipo | Cuándo | Frecuencia |
|---|---|---|---|
| Asiento | `empezar` | Reunión | 1 |
| Asiento | `estilo {id}` | Bajada (y deja listo) y entre noches; una vez por tramo | Rara |
| Asiento | `listo` (BAJAR) | Bajada, a quien aún no lo está | ≤ 1 por noche |
| Asiento | `elegir {retoque, voto}` | Pausa (una por asiento) | ≤ 6 × 5 por noche |
| Asiento | `rendirse` / `reanudar` / `otra-noche` / `cerrar` | Según la fase | Rara |
| Sala (`meterDeLaPlataforma`) | `arcade:ronda {n, resultado, cuentas}` | Al cerrar cada oleada y la Llamada | 4-6 por noche |
| Sala | `arcade:reloj {id}` | Pausa o Bajada vencidas sin todos. Uno que no es el de la fase en curso (llegó tarde) entra **sin efecto**: el mismo estado, sin motivo | ≤ 5 por noche |
| Sala | `arcade:ausente {a}` | 60 s sin canal en una fase de juego | Rara |

- `cuentas` es una fila de enteros por asiento: `[asiento, puntos, esquirlas, aguante, limpios, desalojos, estampados, rescates, caidas, salio]`, más las monedas. Su significado lo declara el juego y el reductor lo valida.
- **Veredictos:** 5-10 por noche de 6-10 min, unos **1-1,5 por minuto**, lejos del tope orientativo de 6.
- **Diario:** 40 entradas por noche como mucho, y 400 por mesa con el tope de 10 noches.
- Durante una oleada nadie escribe en la mesa, así que no hay 409 en caliente. En la pausa, cada aparato reintenta solo ante un 409: cada asiento tiene un único movimiento.

### SALA del canal: lo fino, arbitrado y nunca persistido

- **Por asiento:**
  - sitio validado y rastro de 64 sitios;
  - estado del cuerpo con su tic de fin (quiebro, tocado, derribado, descolocado, remanso, desconectado, rematando, descolgando, sin cuerpo, ausente);
  - su presencia: el último `aqui` vivo, el ausente que lleva sumado en la fase y su vuelta;
  - aguante, Foco y paso de la Tanda;
  - recargas y racha;
  - **esquirlas que lleva**;
  - RTT, `comp` y el desfase entre el tic del aparato y el del servidor.
- **Por NPC** (14 vivos como mucho): clase, sitio, rumbo, vida, estado, turno de ataque, blanco y cerebro.
- **Balas** (12 como mucho): origen, rumbo, velocidad y tic de salida.
- **Anuncios pendientes**, con el instante de impacto traducido para cada destinatario.
- **Encuentro:** receta, cola de apariciones, reloj de oleada, montones de esquirlas, cabina que suena y cola de descuelgue.
- **Azar de la sala**, sembrado con código + noche + oleada, para poder reproducir cualquier fallo.
- Al cerrar una oleada o la Llamada, la sala entrega los contadores a la mesa. Si el proceso se reinicia, se rehace desde la vista.

### ADORNO determinista del cliente: nunca decide nada

- Fachadas, alturas, interiores, neones y rótulos.
- Lluvia, niebla, vapor, charcos y reflejos.
- Tren, tráfico exterior y gente de fondo.
- Los **48 durmientes de guion**. Su función vive en `shared/` porque tiene que salir igual en todos los aparatos, pero el servidor nunca la llama.
- La elección del durmiente del que «sale» cada Prestado, la huida del Prestado derribado y el gesto del Bis.
- Rompibles, esquirlas visuales y grietas, deterministas a partir del id del suceso.
- El Remanso (dilatación de la presentación), la cámara, el sonido, la música, los números de daño y el rebobinado de la derrota.
- Los **guiones** de las acciones ajenas y el nivel de calidad.

---

## 11. Declaraciones que el módulo hermano ofrece (genéricas)

Todo va en **ficheros nuevos**, como hermano de Boots on Board:
- `shared/mecanicas/liza/*` para el contrato, los lectores estrictos, los juicios y las trayectorias;
- `server/src/liza/*` para la sala;
- `escritorio/src/quiebro/red/*` para el cliente del canal;
- el registro en `shared/arcade/juegos/lizas.ts`, fuera del sello.

Tiene **ruta propia**: `/api/arcade/mesas/:codigo/liza`. No toca el canal v1, ni `VERSION_DEL_CANAL`, ni `andar.ts`, `mundo.ts` o `canal-de-botas.ts`, que se **usan** pero no se editan. La base es la rama `botas-servidor`, la que trae `meterDeLaPlataforma`, y **el diff de lo sellado es vacío**. El juego no entra en `mundos.ts`, así que no pasa por la compuerta de Boots on Board.

**Regla:** ninguna declaración entra sin un **segundo uso** y sin un comprobador que la use con una **liza de juguete** que no es este juego.

| # | Declaración | Contenido | Segundo uso | Entra en |
|---|---|---|---|---|
| A | **Alta en el registro de lizas** | `{id, mundo, reglamentoBase, faseDeLaVista, componer, veredictos}`. Estar en el registro significa: siempre a pie, compuerta que **degrada y nunca veta**, vestíbulo sin plazos por turno | Cualquier arcade de acción | Hito 2 |
| B | **Mundo v2** | El `MundoDeclarado` más `escala`, `cajas` con clase (`alta`; `baja` en la fase 2), `zonas {id, clase, caja}`, `limites {id, caja}`, `grafo {nudos, aristas}` y `nace` por papel. Sale de la vista pública y el código en 5 ms o menos | Objetivos de Boots on Board | Hito 2 |
| C | **Reglamento del cuerpo** | Marchas en m/s, radio, holgura, presupuesto corto y **largo**, aguante y regeneración | Velocidades por juego en Boots on Board | Hito 2 |
| D | **Estados temporizados** | `{id, tics, extraMetros, intocable:[a,b], bloqueaPaso, bloqueaAccion, cancelaCon[]}`. Aquí entrará «en el aire» | Esquiva en Boots on Board | Hito 2 |
| E | **Acciones anunciadas** | `{id, autor: asiento o clase, anuncioTics, alcance, holgura, acometida, enganche {radio, cono}, cadena {tras, ventanaMs, ritmo}, efecto {daño, estado, empuje}, imparable, recarga, coste}`. El impacto se anuncia con su instante, traducido para cada destinatario | La refriega de Boots on Board | Hito 3 |
| F | **Esquiva en ventana** | `{estadoDefensivo, ventanaMs, alFallar, alAcertar {estado, habilita, medidor}}`, juzgada en el reloj del aparato | Cualquier juego con parada o esquiva | Hito 3 |
| G | **Guardia** | `{cono, salvoEstados[], respuesta}` | Un escudo en Boots on Board | Hito 3 |
| H | **Empuje contra la estructura** | `{extraDaño, extraTics}` con trayectoria **segmento-AABB por prueba de losa** en Q16.16 (también sirve de línea de vista) | Empujones en Boots on Board | Hito 3 |
| I | **Proyectiles** | `{apuntarTics, velocidad, radio, alcance, daño, estado, rafaga, apuntaA}`, juzgados contra los sitios que declaró el blanco | La lanza de Boots on Board | Hito 4 |
| J | **Entidades del servidor** | Clases `{vida, marchas, acciones, proyectiles, guardia?, cerebro {distanciaPreferida, cadencia, costeDeTurno}, aparicion 'imprimir'|'desdePunto', alCaer {rematable, siNo: 'absorber'|'reimprimir'}}`. Cerebro genérico (acechar, rondar, atacar con turno, disparar con vista, seguir el grafo), `rumboHacia` por tabla y conos con `por()` acotado. Topes de vivos y balas por sala | Animales o guardianes en Boots on Board | Hito 3 |
| K | **Turnos de ataque** | `{cuerpoACuerpo, disparo, anunciosMax, excluyeEstados[]}` | Cualquier juego contra NPC | Hito 3 |
| L | **Encuentros** | `oleadas [{grupos [{clase, cuantos {base, porAsiento}, zona}], relojTics, fin}]`, escaladas por presentes, con tope de vivos y receta barajada por el azar de la sala | Hordas en cualquier liza | Hito 3 |
| M | **Zonas de acción sostenida** | `{clase, radio, mantenerTics, capacidad, requisito, efecto: 'salir'|'veredicto', rompeConDaño}` | Puertos y talleres en Boots on Board | Hito 4 |
| N | **Portables** | Contador por asiento `{tope, alCaer: 'monton' {radio, vidaTics}, alSalir: 'contar'}`, que sueltan las entidades | Generaliza `arcade:botin` | Hito 4 |
| O | **Recurso de equipo, rescate y desconexión** | `{inicial, usos}`, `rescate {radio, mantenerTics, aguanteAlVolver}` y `desconexion {tics, reaparece en zona}` | Cualquier cooperativo | Hito 4 |
| P | **Rol sin cuerpo** | Un asiento sin sitio vive por eco, no se le desaloja por estar quieto, recibe la foto y manda avisos | Espectadores de cualquier mesa | Hito 2 |
| Q | **Avisos** | `{clases, vidaTics, tope por asiento}`, que la sala reenvía | Comunicación sin voz en cualquier juego | Hito 4 |
| R | **Relojes de fase** | La vista declara `{fase, duraMs}` y la sala emite `arcade:reloj` una sola vez | Cualquier arena con rondas | Hito 2 |
| S | **Veredictos genéricos** | `arcade:ronda {n, resultado, cuentas}`, `arcade:reloj {id}`, `arcade:ausente {a}` (y `arcade:zona` en reserva). Gruesos, nunca uno por golpe | Todo el motor | Hito 2 |
| T | **Protocolo v2** | JSON con lectores estrictos (abajo). Tope de subida: los mismos 25 mensajes/s y 256 B | — | Hito 2 |
| U | **Aforo por proceso** | Cada sala declara su coste máximo (asientos, NPC y balas) y el registro rechaza abrir por encima del presupuesto: «la ciudad está llena, prueba en un minuto» | Todas las lizas | Hito 2 |
| V | **Azar de sala sembrado** | Semilla pública de la fase | Reproducir fallos | Hito 2 |
| W | **Foto por equipo** | Una cadena por equipo y **cero bits del oculto**, con su comprobador que busca el sitio del oculto en la cadena ajena | La Azotea y El Celador (fases 3-4) | Fase 4 |

**Protocolo v2.** Siempre están todas las claves; `0` significa «sin acción».

- Del aparato al servidor:
  - `hola {v:2, llave}`;
  - `aqui {n, x, z, r, m, a}`, donde `a` es `0` o `[accion, ms, blanco]`. **Las acciones viajan dentro de `aqui`**, que en combate se manda en cada tic, para no gastar el cubo de mensajes;
  - `eco {c}` cada 2 s;
  - `aviso {clase, objetivo}` como mucho uno por segundo.
- Del servidor al aparato:
  - `dentro {yo, k, x, z, r, hz}`;
  - `foto {k, p}`, con tuplas `[id, x_cm, z_cm, mira, marcha, estado]`: los asientos son 1-6 y las entidades empiezan en 16;
  - `tic {k, ev:[…]}`, que agrupa los sucesos del mismo tic: `anuncio {de, a, acc, t}` (con `t` en el reloj del destinatario), `resuelve`, `estado`, `nace`, `seva`, `apunta {de, a, p, x, z, t}` (la línea de apuntado: sale al empezar a apuntar, con `t` el instante de la primera bala; `a` 0 es «lo deja»), `bala`, `carga`, `monton`, `recoge`, `sale`, `aviso` y `fase`;
  - `eco {c, k, ms}`, `corrige` y `fuera`.
- **Medir la ida y vuelta:** el `eco` de aplicación da la mediana de las 5 últimas en el aparato, porque la API WebSocket del navegador no expone los ping de protocolo. El servidor mide además con el ping de `ws`, que los navegadores contestan solos.

**Qué pone a prueba este juego:**
- del **motor**: una mesa gruesa con veredictos de plataforma, puntos de control y reanudación;
- del **diseño del estado**: el reglamento publicado en la vista, compuesto a los dos lados;
- de la **capa de Boots on Board**: su modelo de «el aparato manda el sitio y el servidor valida», extendido con estados, anuncios, entidades y proyectiles, sin tocar su canal.

---

## 12. Red y coste por sala

**Por qué funciona a 20/10 Hz sin predecir impactos:**
- **Solo se predice lo propio:** el paso, que valida el servidor, y el inicio de tu animación. Ningún resultado se adivina.
- **Todo golpe se anuncia** en un suceso inmediato, que llega a media ida y vuelta y no 150 ms tarde. El impacto se resuelve exactamente en su instante, y el defensor se juzga en su propio reloj (§4.3).
- Los NPC alargan el anuncio en el `comp` del blanco. Con RTT de 150 ms quedan unos 325 ms reales para reaccionar a un anuncio de 400 ms.
- Las balas se juzgan contra los sitios declarados por el blanco (§4.6).
- **Fundido entre líneas de tiempo:** al acabar una acción pintada por guion (en el presente), el cuerpo **se queda en su pose final** hasta que la posición interpolada (150 ms atrás) está a menos de 0,3 m, y entonces funde en 150 ms. Nunca retrocede.
- La **validación** del sitio se hace con los presupuestos corto y largo, los extras por estado y la estructura (§4.2). Los límites de fase (arena o barrio) son una regla de la sala, no una caja: el cambio llega por `fase` en el canal, antes que por el sondeo de la mesa.
- **Trampas que quedan:** un aparato tocado puede quebrar solo al recibir el anuncio. En un cooperativo solo se engaña a sí mismo. La Azotea (fase 3) exigirá más.

**Tráfico:**

| | Sala llena (6 desvelados, 14 NPC) | Sala en solitario (1, 6 NPC) |
|---|---|---|
| Subida por aparato | 20 `aqui`/s × ~55 B ≈ 1,1 kB/s | 1,1 kB/s |
| Foto | ~440 B × 10/s = 4,4 kB/s por aparato | ~170 B × 10/s = 1,7 kB/s |
| Sucesos agrupados | ~1,0 kB/s por aparato | ~0,5 kB/s |
| Bajada por aparato | **≈ 5,4 kB/s** (43 kbit/s), unos 2,6 MB por noche de 8 min | ≈ 2,2 kB/s |
| Salida por sala | ≈ 32 kB/s, unos 115 MB/h | ≈ 2,2 kB/s |

**CPU por sala** (estimada a partir de lo medido en Boots on Board en un PC de desarrollo):

| Concepto | Cálculo | Sala llena | Solitario |
|---|---|---|---|
| Validar `aqui` | 120/s × 3 µs | 0,36 ms/s | 0,06 |
| NPC: paso y cerebro | 14 × 20 × 10 µs | 2,8 | 1,2 |
| Línea de vista (losa) | 14 × 5 Hz × ~3 cajas × 2 µs | 0,4 | 0,2 |
| Balas | 12 × 20 × 3 µs | 0,7 | 0,1 |
| Juicios y anuncios | ~40/s × 5 µs | 0,2 | 0,05 |
| Foto (una serialización) | 10 × 40 µs | 0,4 | 0,1 |
| Envíos | ~160/s × 6 µs | 1,0 | 0,15 |
| **Total en PC** | | **≈ 5,9 ms/s** | **≈ 1,9 ms/s** |
| **En Render** (×2,5, medio núcleo = 500 ms/s) | | **≈ 15 ms/s, un 3 %** | **≈ 5 ms/s, un 1 %** |

**Aforo:**
- presupuesto inicial del juego: el **40 %** de la instancia (unos 200 ms/s), es decir, unas **13 salas llenas o 40 solitarias**, o su mezcla;
- la admisión se hace por coste declarado (U). El Quiebro declara el **mismo aforo en todas sus mesas y fases** (20 entidades, 12 balas y 16 montones: la oleada más llena de seis, el guardián de la Llamada y los Celadores caídos que siguen ocupando su número), porque la sala se admite al nacer y no puede crecer, y en la reunión aún no se sabe cuántos se sientan. El precio: una sala en solitario se admite como si fuera llena;
- los coeficientes se afinan con `medir:liza` en el propio plan starter;
- si el juego triunfa, la palanca es subir de plan, no recortar la simulación.

**Memoria:** unos 250 kB por sala (mundo de unas 60 cajas con su índice, el grafo del barrio —los 16 cruces delante y una rejilla detrás, 404 nudos, por el que los NPC navegan con Dijkstra ponderado—, rastros y NPC con arrays preasignados, sin asignaciones por tic). Con 40 salas, unos 10 MB.

**Otros costes:**
- **Derivar el barrio** cuesta 3 ms o menos en frío, una vez por noche, con el turno de derivación.
- **Mesa:** 1-1,5 veredictos por minuto, con persistencia síncrona (tickHz 0).
- **Temporizador:** uno solo para todas las salas de la Liza, parado si no hay ninguna.

**Sin medir:** todo lo anterior en la instancia real, la cuota de salida de datos del plan y si Render comprime `model/gltf-binary` (hay que comprobarlo con un curl).

---

## 13. Primera versión (vertical slice) y fases

### Orden de trabajo: la sensación y el aparato primero

**Hito 0. Medir (semana 1).**
- **Banco en aparato real:**
  - un Android de gama media con el WebView;
  - un iPhone por /jugar;
  - contenido: 20 personajes de la forja con esqueleto a 8.000/4.000 triángulos, 48 durmientes en rebaño, la glorieta de cajas, lluvia y un pase de brillo;
  - se cuentan llamadas, triángulos y subidas de textura de huesos, y se comprueba si se crea un render target HalfFloat.
  - De aquí salen los topes N0-N3.
- **Los clips de la forja** (`arte/forja/clips.py`), uno por gesto, con su batería (pies que no patinan, golpes que llegan, el faldón que no atraviesa las piernas). Ya no hace falta comprar nada.
- Probar el **WebView en el APK**: `react-native-webview` y apaisado con `expo-screen-orientation`.

**Hito 1. Prueba de sensación.** Un desvelado contra Prestados en una plaza gris, con servidor local y latencia inyectada de 50, 150 y 250 ms, más jitter de 30-60 ms y un desfase de reloj de ±40 ms. Se afinan los anuncios, la ventana limpia, el parón, la anticipación elástica y el Remanso. **No se sigue** hasta que:
- un jugador nuevo consigue un limpio en menos de 60 s en 8 de cada 10 pruebas;
- con 150 ms, la tasa de limpios queda a menos de 10 puntos de la de red local, y con 250 ms a menos de 20; si no, se ensancha la ventana en el reglamento;
- la tasa de limpios **no cambia con el desfase inyectado**;
- un robot que lee saca al menos el doble de puntos que un robot que aporrea.

**Hito 2. Sala de la Liza mínima y genérica** (A, B, C, D, P, R, S, T, U, V, más eco y reanudación), probada con una **liza de juguete** y robots WebSocket sin pantalla.

**Hito 3. Combate** (E, F, G, H, J, K, L) y la noche en la glorieta.

**Hito 4. Objetivos** (I, M, N, O, Q): esquirlas, monedas, la Llamada por la ciudad y avisos.

**Hito 5. Arte, luz y sonido.** Después, **pruebas con gente**.

### Qué entra en «El Quiebro 1»

- **Jugadores:** 1-6 en cooperativo, con «Jugar ya», «Abrir mesa» y «Entrar con código».
- **La noche completa:** Bajada, 3 oleadas, hasta 2 propinas con voto, pausas con retoque, Bis, la Llamada por el barrio, Amanecer y recuento. Otra noche, Cerrar y Otra mesa.
- **Barrio procedural** de 3×3 con **una** plantilla (la glorieta) y 4 cabinas candidatas.
- **Combate completo:**
  - Tanda con a compás;
  - Empellón, guardia y estampado;
  - quiebro, quiebro torpe y quiebro de ruptura;
  - quiebro limpio con Remanso, Réplica y Acometida;
  - balas lentas;
  - aguante, Foco, racha, monedas, rescate y Vigía.
- **Enemigos:** Prestado, Celador y Celador tirador, con impresión, desalojo y Trasvase.
- **Esquirlas** con pago triangular.
- **Variedad:** 3 estilos numéricos, 6 retoques, 3 averías, 6 recetas, 3 contramedidas de la Memoria del Sistema y nivel de noche de 1 a 5.
- **Tutorial** en la primera noche del aparato (§2.1).
- **Mandos** de móvil y PC. **Niveles** N0-N2 automáticos (N3 = N2 con más densidad). **Sonido** base (§9).
- **Clientes, el mismo día:**
  - app: un WebView apaisado que carga el paquete web y recibe código, llave y servidor **por postMessage, nunca en la URL**. **Mientras carga, una barra y ningún plazo** (27-sep, tras caer al plano a los 25 s en un teléfono con datos): el documento dice `listo` desde un guion dentro de `quiebro.html` que guarda la mesa en una cola hasta que el juego monta, cuenta su carga (`carga`: página, código byte a byte, mesa, ciudad, personajes, gráficos) y avisa con `jugable`; la app pinta la barra encima hasta entonces y, a los 3 minutos, dice que tarda más de lo normal con la razón probable (seguir esperando, reintentar o jugar sobre el plano). Un error de JavaScript al arrancar llega como `fallo` y se enseña. Al plano sin preguntar sólo se cae por fallos de verdad (la página no carga, un error HTTP, el motor del navegador cerrado o un puente de otra versión);
  - /jugar en el iPhone;
  - escritorio con mueble `tablero`, pintor propio y el plano como respaldo.
- **Lobby:** el vestíbulo común con tema propio.
- **Comprobadores**, cada uno visto en rojo antes de darlo por bueno y metido en `npm run verificar`:
  - reductor y robot genérico;
  - mundo idéntico en todas las calidades;
  - determinismo de los durmientes, el mundo y las trayectorias (los seis guardianes de `shared/`);
  - juicio independiente del desfase;
  - reanudación tras matar la sala a mitad de oleada;
  - liza de juguete;
  - procedencia con las marcas nuevas.
  - `medir:liza` queda fuera de la batería.

**Fuera de la v1, a propósito:** otras plantillas y la travesía entre plazas, el Celador Mayor, las habilidades de estilo, el salto de vallas, el Bis estructural, el lobby 3D propio, la vibración, el mando de consola, las repeticiones, la noche señalada, los récords persistentes, N3 completo y los modos contra jugadores.

**Cómo se sabe que ya es divertido:**
- una mesa de 3 amigos pulsa «Otra noche» sin que nadie lo proponga;
- la mediana es de 3 noches o más por mesa;
- en el 40 % de las noches o más hay al menos un voto «Aguantar»;
- cada jugador hace 3 limpios o más por noche;
- técnicamente: N0 estable a 30 fps en el Android de gama media, 60 fps en N2 en PC, y una sala llena con robots cuesta lo calculado en el starter.

### Fase 2: «La ciudad entera»

- Noches de 3 tramos: plaza, carrera de 20-30 s con tiradores en puestos altos, y otra plaza.
- 6 plantillas de plaza y el **Bis estructural**.
- El **Celador Mayor**, jefe de la Llamada, con pisotón en anillo y ecos del Bis.
- Las habilidades de estilo (Foco 100), 12 retoques y 8 averías.
- El salto de vallas y capós: estado «en el aire» de 12 tics y cajas `baja`.
- Lobby **El Bar Desvelo**: una churrería de madrugada con 6 taburetes y un teléfono de pared que suena al empezar.
- Vibración, mando de consola, música por capas más rica y «Mejores quiebros» (los 3 mejores Remansos del búfer local).
- La noche señalada, si Miguel decide cómo persistir récords.

### Fase 3: «La Azotea» (todos contra todos, de 2 a 6)

- Azoteas de 30×30 m y rondas de 90 s; gana el primero que llega a 3.
- A los 45 s el borde se borra.
- El mismo juicio en el reloj del defensor, **sin** alargar el anuncio.
- Se añade el amago (15 de Foco).
- Antes de abrirlo, pruebas en redes móviles reales.

### Fase 4: «El Celador» (asimétrico, 1 contra N)

- Un jugador es el Celador y se esconde entre los Prestados con cambio de cuerpo limitado.
- Foto por equipo con cero bits del oculto (W). El papel rota en cada noche.

---

## 14. Riesgos y cómo se miden pronto

| # | Riesgo | Cómo se mide | Cuándo | Palanca si falla |
|---|---|---|---|---|
| 1 | La sensación se hunde con red móvil mala | Prueba de sensación con latencia, jitter y desfase inyectados (criterios en el hito 1) | Hito 1 | Ensanchar la ventana; alargar anuncios; «a compás» a ±100 ms |
| 2 | Rendimiento en el WebView | Banco en aparato: llamadas, triángulos y subidas de huesos | Semana 1 | Más VAT y menos esqueletos; maniquí de 200 triángulos; menos lluvia. **Los 48 durmientes y la estructura no bajan** |
| 3 | La Tanda se ve de maniquí | Los clips de la forja; 5 personas puntúan «se ve como una peli» frente a «maniquí» | Semana 1 y hito 3 | Rehacer los clips en la forja; acometida procedural; cortes de cámara; parón |
| 4 | Aporrear rinde tanto como leer | Robot que lee frente a robot que aporrea | Hito 1 | Quiebro torpe más estricto; más castigo al fallo |
| 5 | La variedad se agota | Noches por mesa y vuelta al día siguiente | Pruebas con gente | Adelantar plantillas y averías de la fase 2 |
| 6 | CPU y salida de datos en el starter | `medir:liza`: 13 salas llenas y 40 solitarias con robots; `/api/arcade/diagnostico` y la RAM | Hito 2 | Bajar el tope de NPC vivos; subir de plan |
| 7 | Desfase de reloj | Comprobador: tasa de limpios igual con desfase de 0 y de ±40 ms | Hito 1 | — (es condición de aprobación) |
| 8 | Despliegues que cortan la noche | Comprobador que mata la sala a mitad de oleada y reanuda | Hito 2 | No desplegar en horas de juego; avisar antes del push |
| 9 | Coordinación con la sesión de Boots on Board | Diff vacío de lo sellado y de `andar.ts`, `mundo.ts` y `canal-de-botas.ts` | Siempre | Pedir por escrito cualquier cambio en ficheros compartidos |
| 10 | El WebView obliga a un APK nuevo | Build de prueba | Semana 1 | El APK viejo muestra «actualiza la app»; /jugar sigue sirviendo |
| 11 | iPhone por /jugar | Prueba en aparato: orientación, toques robados, interruptor de silencio | Semana 1 | `touch-action: none`; «gira el teléfono»; avisos visuales |
| 12 | Propiedad intelectual por acumulación | Revisión de la lista del §1 y comprobador de procedencia | Antes de publicar | Consulta legal |
| 13 | Legibilidad con 6 jugadores y 14 NPC | Pruebas con 6 en móvil | Pruebas con gente | Plaza de 60 m; como mucho 3 anuncios por persona; menos partículas |
| 14 | «Jugar ya» gasta el limitador (30 aperturas por IP y juego cada 10 min) | Contar aperturas en pruebas de aula o bar | Pruebas | «Otra noche» en la misma mesa; pedir un ajuste del limitador |
| 15 | La plataforma crece con la forma de este juego | Cada declaración con segundo uso y liza de juguete | Hitos 2-4 | Recortar la declaración o dejarla en el juego |

**Pendiente de decisión de Miguel:**
- aprobar el APK con `react-native-webview` y el apaisado (lo compila Miguel);
- récords persistentes por nombre (hoy viven en memoria y se pierden en cada despliegue);
- consulta legal antes de la publicidad;
- disciplina de despliegue en horas de juego.

---

## 15. Glosario de nombres propios

| Nombre | Qué es |
|---|---|
| **El Quiebro** | El juego (id `quiebro`) |
| **Desvelado** | El jugador |
| **Durmiente** | Un civil de la ciudad. Los 48 «de guion» son deterministas |
| **Prestado** | Un durmiente que el Sistema pone a pelear. Conserva su ropa |
| **Celador** | Enemigo duelista. Cada uno es distinto y se imprime |
| **Celador tirador** | Celador con pistola de balas lentas |
| **Celador Mayor** | Jefe de la fase 2 |
| **El Sistema** | La ciudad que se defiende |
| **La Grafía** | El alfabeto propio de 48 glifos |
| **Quiebro** | La esquiva |
| **Quiebro limpio** | Quiebro dentro de la ventana |
| **Quiebro torpe** | El tercero en menos de 1,2 s, sin intocable |
| **Quiebro de ruptura** | Quiebro que cuesta 50 de Foco y saca de un tocado |
| **Remanso** | La cámara lenta ganada |
| **Réplica** | El golpe imparable del Remanso |
| **Acometida** | Vuelo hacia el blanco |
| **Tanda** | El combo: Entrada, Seguida, Cierre |
| **A compás** | Golpe en el pulso de la música |
| **Empellón** | Golpe que rompe la guardia |
| **Estampado** | Empujón contra la estructura |
| **Desalojo** | Remate de un Celador caído |
| **Trasvase** | El Celador no desalojado absorbe a un Prestado |
| **Impresión** | Llegada de un Celador en una columna de glifos |
| **Bis** | El fallo que se repite y anuncia oleada |
| **Noche** | Una partida |
| **Oleada** / **Propina** | Ronda de combate / ronda extra votada |
| **Pausa** | Entre oleadas: retoque y voto |
| **La Llamada** | La carrera final a la cabina |
| **Cabina** | Poste de hierro con marquesina y auricular ámbar que funciona con monedas |
| **Cabina de refugio** | Donde se reaparece |
| **Descolgar** | Salir por la cabina |
| **Monedas** | El recurso común del equipo |
| **Esquirlas** | El botín: vale T(n)×10 al salir |
| **Aguante** / **Foco** / **Racha** | Vida / medidor de habilidad / multiplicador |
| **Estilos: Gabardina, Ligera, Mole** | La elección de rol |
| **Retoques** | Mejoras que se eligen en la pausa |
| **Averías** | Mutadores de la noche: Eco, Cristal, Apagón (y en la fase 2, Hora punta, Compás, Plomo, Resbalón y Prisa) |
| **Recetas** | Composiciones de oleada: Enjambre, Pareja, Pinza, Marea, Francotirador, Emboscada |
| **Memoria del Sistema** | Contramedida por noche: Monedas caras, Tiradores, Plaza despejada |
| **Niveles de noche** | Llovizna, Chaparrón, Aguacero, Temporal, Tormenta |
| **Bajada** / **Amanecer** / **Recuento** | Entrada, fin y resumen de la noche |
| **Vigía** | El rol sin cuerpo: cenital y marcar |
| **Avisos** | Marcar, «Rescate», «Voy», «¡Desalójalo!» |
| **Glorieta** | La plantilla de plaza de la v1 |
| **Barrio** | La ciudad procedural de 3×3 manzanas, nombrada con hora («Glorieta del Relojero, 3:12») |
| **El Bar Desvelo** | Lobby de la fase 2 |
| **La Azotea** / **El Celador** | Modos de las fases 3 y 4 |
| **La Liza** | El módulo hermano de la plataforma: registro, sala y canal `/liza` |