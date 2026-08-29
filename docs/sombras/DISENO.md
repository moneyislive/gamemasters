# El Paso de las Sombras — diseño del juego

> Documento maestro. Todo lo que se implemente sale de aquí. Si algo no está
> escrito en este fichero, no está decidido: pregúntalo antes de inventarlo.
>
> Es el gemelo de `docs/momia/DISENO.md`, y se lee mejor después de aquel: la
> Momia demostró que la plataforma aguanta un segundo juego; esto comprueba si
> aguanta un tercero **sin ampliar el contrato más allá de lo que ya está
> documentado como deuda benigna**.

---

## 0. Por qué este juego y no otro

CLUEDO pregunta *quién, con qué y dónde*: tres ejes independientes, toda la
información cierta, gana quien acierta antes. El Misterio de la Momia rompió
cuatro supuestos de golpe: la respuesta es un **orden**, hay información
**falsa**, nadie puede resolverlo **solo**, y gana un **bando**.

El Paso de las Sombras da el paso siguiente, y lo da por donde la Momia no
llegó a mirar: **el espacio físico y el cuerpo de quien juega**.

| Supuesto que sigue en pie tras la Momia | Lo que hace El Paso de las Sombras |
|---|---|
| La app se fía de que estuviste donde dices | Hay que **teclear la contraseña escrita en la puerta**: sin ir, no hay hallazgo |
| La respuesta es un orden de un conjunto conocido | La respuesta es **qué cuatro pasos y en qué orden**, sacados de todos los que hay: hay que averiguar a la vez **cuáles** y **en qué orden** |
| El coste de explorar es personal (tus marcas) | El coste es **colectivo**: el rastro delata a la columna entera |
| El peligro se anuncia en voz alta al empezar | El peligro es **secreto** y se revela **al cerrar la hora**: se sabe a toro pasado, y eso convierte cada afirmación en una promesa comprobable |
| Solo un rol puede poner información sobre la mesa | Además, **coincidir en un paso** genera testimonio cruzado: dos personas en el mismo sitio sacaron **lo mismo**, y si cuentan cosas distintas, una miente |
| Todo el mundo vale lo mismo al votar | El voto pesa lo que **pesa tu palabra**: las prendas que te han dado |

Ese es el valor del ejercicio: cada rotura señala una costura distinta, y
ninguna de ellas exige inventar mecánica de plataforma nueva. Todo lo de aquí
se apoya en piezas que la Momia ya dejó probadas — `eligeLibre`, `eligeVarias`,
`registrarProyeccion`, `registrarCierre`, `registrarInicio`, `registrarTrofeos`,
`registrarAmpliacion`, `Plot.delJuego`, `LiveSession.estado`.

**Y una regla que gobierna la entrega entera: no se añade ninguna fase a
`LivePhase`.** Es la ampliación «más cara con diferencia» según el manual —
`fases` es un `Record` exhaustivo y obliga a tocar los cinco manifiestos que
existen— y este juego demuestra que no hace falta: su consejo final vive en
`acusaciones`, que ya existe, y cuyo aviso **sí** se puede escribir desde el
manifiesto.

---

## 1. La ficción, y qué parte es verdad

**21 de junio de 1582.** Antes del amanecer, Akechi Mitsuhide rodea el templo
**Honnō-ji**, en Kioto, y **Oda Nobunaga** muere en el incendio. Es el
**Honnō-ji no Hen** (本能寺の変), y ocurrió.

Aquella mañana **Tokugawa Ieyasu** estaba en **Sakai**, de visita, con poco más
de treinta acompañantes y sin un solo soldado. Akechi era dueño del centro del
país y de los caminos. Ieyasu pensó en abrirse el vientre en el Chion'in; le
convencieron de intentar otra cosa: **volver a Mikawa cruzando de noche la
provincia de Iga**. Esa fuga se llama el **Iga-goe** (神君伊賀越え, «el paso de
Iga del señor divino») y también ocurrió.

Los datos que el juego usa y que son históricos:

- **Iga estaba arrasada.** Un año antes, en el **Tenshō Iga no Ran** (天正伊賀の乱,
  1581), Nobunaga había pasado la provincia a cuchillo. Los guías que ahora
  tienen que salvar al aliado de Nobunaga son los supervivientes de aquello.
  Ese es el nudo moral del juego, y no lo ha inventado nadie.
- **Hattori Hanzō Masanari** (服部半蔵正成) era un samurái de Mikawa de origen
  igueño, no un ninja de leyenda: su papel fue **negociar** con los hombres de
  Iga y de Kōga. En la ficción del juego es quien reunió a la columna.
- **Chaya Shirōjirō Kiyonobu** (茶屋四郎次郎), mercader de Kioto, cabalgó por
  delante repartiendo **plata** para comprar el paso. La plata de Chaya es un
  objeto del juego y es un hecho.
- **Los ochimusha-gari** (落武者狩り): partidas de campesinos que cazaban
  samuráis en fuga por sus armas y su rescate. **Anayama Baisetsu murió así**
  durante esta misma huida, al separarse del grupo. Es el peligro del juego y
  es real.
- **Los Kōga** de **Tarao Shirōbei Mitsutoshi** (多羅尾光俊) alojaron a la
  columna en Ojikuwa. Kōga e Iga aparecen en el juego como dos procedencias
  distintas porque lo eran.
- **La playa de Shirako** (白子), en Ise, es donde la columna embarcó rumbo a
  **Ōhama**, en Mikawa. Es la meta del juego.
- **Las horas del reloj japonés** llevan nombres del zodiaco: 亥 el Jabalí
  (~21–23 h), 子 la Rata (~23–01), 丑 el Buey (~01–03), 寅 el Tigre (~03–05),
  卯 la Liebre (~05–07, el alba). Las rondas del juego son esas horas, y el
  alba es el límite.
- **El santo y seña** (合言葉, *aikotoba*) era práctica corriente en los
  ejércitos del Sengoku: una palabra y su respuesta, cambiadas cada noche. De
  ahí sale la contraseña que hay que ir a leer a la puerta.
- **Los siete disfraces** (七方出, *shichihōde*) del shinobi —komusō, shukke,
  yamabushi, akindo, hōkashi, sarugaku y *tsune no kata*, «persona corriente»—
  están recogidos en el **Bansenshūkai** (万川集海, 1676). Los seis papeles
  repartibles del juego son seis de ellos.
- **In-nin y yō-nin** (陰忍 / 陽忍): infiltrarse escondido o infiltrarse a cara
  descubierta bajo identidad falsa. El traidor del juego es un **yō-nin**, y su
  don secreto se llama por eso.

Lo que el juego inventa, y conviene tenerlo claro para no fingir erudición
donde no la hay: **el kanchō** (間諜, «espía infiltrado» — la palabra es real, la
persona no), la **senda de cuatro pasos** como rompecabezas, el **rastro** como
contador, y las **prendas** como moneda de confianza. La historia pone el
tablero; el juego pone las reglas.

---

## 2. Cómo se juega, en una página

Se juega **de pie y andando por una casa real**, con el móvil en la mano (o en
papel). La noche se divide en **horas**, con sus nombres del zodiaco. En cada
hora:

1. **Se abre la hora.** Quien dirige lee la narración. **No se anuncia dónde
   están los cazadores**: eso es lo que hay que averiguar.
2. **Reconocer un paso.** Cada persona elige un **paso** —una habitación real de
   la casa—, **va físicamente hasta allí**, lee la palabra escrita en el cartel
   de la puerta y **la teclea en la app**. Solo entonces recibe **el hito**: lo
   que dice el mojón de ese paso esta noche, que es una pieza del rompecabezas
   de la senda. Si la palabra no es la correcta, no pasa nada: no se gasta el
   turno, se vuelve a mirar.
3. **El peligro.** Uno de los pasos está **batido** por los ochimusha-gari.
   Quien entra ahí lo sabe en el acto —los ha visto— y **el rastro de la columna
   sube uno**. El rastro es público y no baja solo.
4. **El papel.** Cada persona tiene un disfraz de los siete y puede usarlo **una
   vez por hora**.
5. **La prenda.** Se pueden dar prendas de confianza a otras personas. Nunca a
   uno mismo. Quien recibe una prenda contrae una obligación: **responder con la
   verdad a una pregunta directa**, en voz alta y delante de todos.
6. **Se cierra la hora.** Se revela **qué paso estaba batido**, y ahí se
   comprueba quién decía la verdad.

Cuando quien dirige lo decide, se abre **el consejo del alba**:

- Cada persona propone **una senda completa: cuatro pasos, en orden**, y
  **señala** a quien cree que es el kanchō.
- El voto de cada cual pesa **1 + las prendas que le han dado**.
- Si la mayoría de los señalamientos apunta al kanchō de verdad, **su voto y las
  prendas que reunió no cuentan**: desenmascararlo no es solo un trofeo, es
  quitarle la mano del timón.
- Se anda **la senda más apoyada**, físicamente, habitación por habitación.
  - Si es la correcta **y el rastro no ha llegado a su tope** → el señor embarca
    en Shirako. **Gana la escolta entera menos el kanchō.**
  - Si no → amanece con la columna en campo abierto. **Gana el kanchō.**

---

## 3. Las piezas

### 3.1 Categorías de entidades

| id | singular / plural | mínimo | banderas | almacén | qué es |
|---|---|---|---|---|---|
| `escoltas` | escolta / escoltas | 4 | `sonJugadores`, `admiteFoto`, `admiteEmail` | `suspects` | Las personas de carne y hueso que cruzan |
| `pasos` | paso / pasos | 6 | `sonLugares`, `admiteFoto` | `rooms` | Las habitaciones reales, convertidas en tramos del camino |
| `enseres` | enser / enseres | 3 | `admiteFoto` | `weapons` | Lo que carga la columna. Tres de ellos pesan en las reglas |
| `estandartes` | estandarte / estandartes | 4 | — | *(ninguno)* | Los **mon** de las casas que cruzan. Ver §3.5 |

> **Sobre el mínimo de `pasos`.** Seis, y no cinco como las cámaras de la Momia,
> porque la senda son cuatro: con cinco pasos sobraría uno solo y averiguar
> *cuáles* dejaría de ser un problema. Con seis hay dos falsos, y con ocho o
> diez el rompecabezas gana sin que la casa se haga inmanejable.

> **Sobre `estandartes`.** Es la categoría sin almacén heredado, como los
> `ritos` de la Momia: la que comprueba que el almacén genérico funciona. Y a
> diferencia de los ritos, **no entra en la lógica del rompecabezas**: es
> identidad y ambientación (§3.5). Esa diferencia es deliberada — un juego debe
> poder tener una categoría propia sin que sea la que carga con todo.

### 3.2 Los ejes de la respuesta

Uno solo, igual que la Momia y por el mismo motivo:

| id | pregunta | rótulo | categoría |
|---|---|---|---|
| `kancho` | ¿Quién cobra de Akechi? | Quién | `escoltas` |

**La senda no es un eje.** Un eje es una entidad y se acierta o no; una senda es
una selección ordenada, y meterla aquí obligaría al contrato general a aprender
qué es una secuencia. Vive en el estado del juego y la mueve una acción propia.
Es exactamente la misma decisión que tomó la Momia con el orden de los ritos, y
se toma otra vez porque sigue siendo la correcta.

### 3.3 Los papeles (los siete disfraces)

Cada persona lleva un **disfraz** de los *shichihōde* con un poder de una vez
por hora. Los reparte la generación.

| papel | disfraz | qué hace |
|---|---|---|
| `rastrear` | Yamabushi 山伏 | Recibes **un hito más**, en privado |
| `amparar` | Komusō 虚無僧 | La persona que elijas **no suma rastro** esta hora |
| `comprar` | Akindo 商人 | **Baja el rastro en uno** (nunca por debajo de cero) |
| `adelantarse` | Hōkashi 放下師 | Ves **qué paso estará batido la hora siguiente** |
| `referir` | Tsune no kata 常の形 | **Haces público** uno de tus hitos |
| `trocar` | Sarugaku 猿楽 | **Intercambias un hito** con quien elijas |
| `falsear` | **solo el kanchō** (陰忍) | Publica un hito **falso**, como hallado en el paso donde estuviste esta hora |

`falsear` es el corazón adversarial, igual que `falsificar` en la Momia, con una
vuelta de tuerca: **la mentira lleva pegado un lugar y una hora**, y la app dice
públicamente quién estuvo dónde. Mentir sobre un paso donde había alguien más es
delatarse. El kanchō tiene que ir solo, y eso se ve.

> El papel del kanchō **no se anuncia**. En su dosier aparece uno de los seis
> normales; `falsear` se le añade en secreto, y **no se guarda en ningún campo**:
> se deduce de ser la respuesta del eje. Un dato que no se guarda no se puede
> filtrar por descuido.

### 3.4 Los enseres y su porte

La generación reparte tres **portes** entre los enseres que haya dado de alta
quien organiza. El porte es **público** —sale en todos los dosieres y en la app—
y quien lo lleva también. Se pasa de mano con `entregar`, que es un acto físico:
se da el objeto de verdad.

| porte | el enser histórico | qué hace, mientras lo lleves |
|---|---|---|
| `farol` | El farol de papel (提灯) | Al abrirse la hora **sabes qué paso está batido**. Nadie más lo sabe |
| `plata` | La plata de Chaya (茶屋の銀) | El rastro de cada hora **sube uno menos** (mínimo cero) |
| `lanza` | La lanza de Hanzō (半蔵の槍) | **No sumas rastro** al entrar en el paso batido |

Los enseres restantes no tienen porte: son carga, atrezo y ficción. El desenlace
cuenta cuántos llegaron a la barca, y eso es todo.

**El farol es el objeto más peligroso del juego** y por eso existe: quien lo
lleva tiene información que nadie puede comprobar… hasta que se cierra la hora y
se revela el paso batido. Un kanchō con el farol puede mandar a media mesa a la
boca del lobo exactamente una vez.

### 3.5 Los estandartes

Cada persona lleva el **mon** (紋, blasón) de una casa. Los estandartes se
reparten entre la escolta y **no son secretos**: se imprimen en el dosier de
todo el mundo y se ven en la app.

Su trabajo es de ambientación y de identidad —una columna de treinta personas de
cuatro casas distintas cruzando una provincia enemiga— y de mesa: son el
distintivo con el que la gente se llama entre sí durante la noche. Los sugiere
el manifiesto con los reales de la fuga (Tokugawa, Hattori, Chaya, Tarao,
Anayama) y quien organiza puede cambiarlos.

**No tocan la lógica del rompecabezas, y es a propósito**: hacía falta comprobar
que una categoría propia puede existir sin ser el eje del juego.

### 3.6 El rastro y las prendas

- **El rastro** empieza en 0 y es **público**. Sube **uno** por cada persona que
  entra en el paso batido, salvo si la ampara un komusō o lleva la lanza. Baja
  con el akindo y pesa uno menos con la plata.
  **Tope:** `max(6, número de escoltas + 2)`. Si el rastro llega al tope, la
  columna está interceptada: por bien que se ande la senda, no se embarca.
- **Las prendas.** Cada cual empieza con **dos**. Se dan con `avalar` y **nunca a
  uno mismo**. **Nadie puede tener más de dos recibidas** —tope duro— para que la
  mesa no acabe con un dictador. Al consejo, tu voto pesa `1 + prendas recibidas`.

Estar sin prendas no te calla ni te elimina: te deja valiendo uno, que es lo que
vale todo el mundo al empezar. La Momia castigaba con silencio; aquí se premia
con voz, que es la misma tensión leída al derecho.

---

## 4. El rompecabezas de la senda: la pieza técnica seria

De los `n` pasos que haya dado de alta quien organiza, exactamente **cuatro**
forman la senda que lleva a Shirako, **en un orden exacto**. El espacio de
respuestas son las **variaciones** de `n` tomadas de 4 en 4: con seis pasos son
360, con ocho 1 680. Nadie conoce la senda entera.

### 4.1 Tipos de hito

Siete formas, dos más que la Momia, y las dos nuevas son las que hacen el
rompecabezas **bidimensional**: ya no basta con ordenar, hay que decidir quién
entra.

| tipo | forma | ejemplo de redacción |
|---|---|---|
| `antes` | A se cruza antes que B (los dos en la senda) | «Quien busque el Collado tiene que haber dejado atrás el Vado» |
| `seguido` | de A se sale directo a B, sin nada en medio | «Del Vado se sale derecho al Collado: no hay nada en medio» |
| `posicion` | A es el tramo número N (1..4) | «El Bosque de Tsuge es el segundo tramo» |
| `no-posicion` | A no es el tramo número N | «El Vado no abre la senda» |
| `extremo` | A abre o cierra la senda, nunca va en medio | «Kabuto abre o cierra: nunca se pisa en medio» |
| `pasa-por` | la senda pasa por A | «Sin cruzar el Kizu no se llega a la playa» |
| `no-pasa-por` | la senda **no** pasa por A | «Por Otogi no se va a Shirako» |

**Semántica exacta, porque de ella depende que la deducción sea sana:**
`antes`, `seguido`, `posicion`, `extremo` y `pasa-por` **afirman pertenencia**
(son falsos si el paso no está en la senda). `no-posicion` y `no-pasa-por` son
ciertos cuando el paso queda fuera. Todo lo comprueba `cumple()`, y todo se
verifica por fuerza bruta contra las variaciones.

### 4.2 Las cuatro garantías

Las mismas de la Momia, porque siguen siendo las que importan, y comprobadas
igual: recorriendo todas las variaciones, una a una.

1. **Consistencia**: existe al menos una senda que cumple todos los hitos. Sale
   gratis por construcción —todos se sacan de una senda concreta— y se comprueba
   igual, porque «sale gratis por construcción» es lo que se dice de los fallos
   que aparecen luego.
2. **Unicidad**: existe **exactamente una**. Con dos, media mesa defiende una y
   media la otra y no hay forma de zanjarlo.
3. **Suficiencia repartida**: el conjunto entero resuelve; los hitos de
   **cualquier persona por separado** admiten ≥2 sendas.
4. **Minimalidad**: quitar cualquier hito hace aparecer más de una senda. Sin
   esto se generan pilas de hitos redundantes y el camino se resuelve solo.

### 4.3 Los hitos falsos

El kanchō publica hitos **falsos**: sintácticamente iguales, incompatibles con la
senda verdadera. Se preparan al generar la partida —no en caliente— porque una
frase escrita después suena distinta y una pista que suena distinta se delata
sola. Se descartan las que **un solo hito cierto** desmiente: eso no engaña a
nadie y encima señala a quien la puso.

### 4.4 El reparto

Cada paso guarda **un hito distinto cada hora**. Como se entra en un paso por
hora, una persona se lleva como mucho tantos hitos distintos como horas tenga la
noche; por eso el rompecabezas se genera con **más hitos que horas**, y se
comprueba que **nadie pueda juntarlos todos** recorriendo por fuerza bruta todos
los caminos posibles. Es la lección que la Momia aprendió jugando: si una
persona puede resolverlo sola, el juego pierde su razón de ser.

Y una más, que la Momia también aprendió jugando: **toda casilla da hito**.
Entrar en un paso y salir con las manos vacías, habiendo pagado el rastro, se lee
como una avería de la app.

---

## 5. El estado de la partida

Bajo la clave `sombras` de `LiveSession.estado`:

```ts
interface EstadoSombras {
  /** La senda verdadera, por id de paso. NUNCA se proyecta al jugador. */
  sendaVerdadera: string[];
  /** Qué paso está batido en cada hora. Índice = ronda - 1. Secreto. */
  batidos: string[];
  /** El rastro de la columna, y su tope. Los dos públicos. */
  rastro: number;
  rastroMaximo: number;
  gente: Record<string, {
    prendas: number;          // las que te quedan por dar
    prendasRecibidas: number; // las que te han dado. Tope: 2
    hitos: string[];
    papel: PapelId;
    papelUsadoEnRonda?: number;
    enseres: string[];        // los que lleva ahora mismo
  }>;
  hitos: Record<string, {
    id: string;
    condicion: Condicion;
    texto: string;
    falso: boolean;           // NUNCA se proyecta hasta el desenlace
    publico: boolean;
    publicadoPor?: string;
    /** Dónde y cuándo dice haberse encontrado. Vacío si salió sin más. */
    halladoEn?: { pasoId: string; ronda: number };
  }>;
  propuestas: Record<string, { senda: string[]; at: string }>;
  consejo?: {
    sendaAndada: string[];
    correcta: boolean;
    interceptada: boolean;
    votos: Array<{ senda: string[]; apoyos: string[]; peso: number }>;
    at: string;
  };
}
```

**Regla de oro, sin excepciones:** `sendaVerdadera`, `batidos` por venir y
`falso` **no salen nunca** hacia el móvil antes del desenlace. Se comprueba con
una prueba que busca la senda verdadera dentro del JSON que recibe el móvil.

---

## 6. Las acciones

| id | rótulo | fases | veces/hora | elige |
|---|---|---|---|---|
| `avanzar` | Reconocer un paso | `ronda-abierta` | 1 | un `pasos` + la contraseña (libre) |
| `avalar` | Dar una prenda | `ronda-abierta`, `ronda-cerrada` | — (limita el recurso) | un `escoltas` |
| `entregar` | Pasar un enser | `ronda-abierta`, `ronda-cerrada` | — | un `enseres` + un `escoltas` |
| `invocar` | Usar tu papel | `ronda-abierta` | 1 | depende del papel |
| `proponer-senda` | Proponer la senda | todas las de juego | 1 | cuatro `pasos`, **ordenados** |
| `senalar` | Señalar al kanchō | todas las de juego | 1 (para toda la partida) | un `escoltas` |

**La contraseña va en `eligeLibre`**, que es el campo que la Momia abrió para
«cuál de tus dones» y «cuál de tus fragmentos»: el motor lo pasa **sin validar**
y lo valida el reductor, que es quien conoce el secreto. Aquí ese secreto es la
palabra escrita en la puerta.

**Una contraseña equivocada no consume el turno**, y eso sale gratis: el motor
apunta la acción **después** de que el reductor devuelva, así que basta con
lanzar `AccionInvalida`. Sin esa propiedad, la mecánica sería un castigo por
tener mala vista.

### 6.1 Ninguna fase nueva

`lobby → ronda-abierta ⇄ ronda-cerrada → {acusaciones, desenlace}` y
`acusaciones → {ronda-abierta, desenlace}`. Todas existen. El **consejo del
alba** es la fase `acusaciones` con otro nombre, y el nombre lo pone el
manifiesto en `avisos.acusaciones`, que es texto y viaja al móvil.

**Por qué no se usa `sellado`:** su aviso está escrito a mano en
`routes/live.ts` («Se abre El Sellado. Cinco ritos, un solo orden bueno.») y el
manifiesto no tiene dónde sustituirlo. Un juego que entrara por ahí anunciaría a
toda la mesa las reglas de otro. Queda **anotado como pendiente** (§11).

### 6.2 Quién ejecuta el final

`registrarCierre('sombras', …)`, que es el mecanismo que la Momia dejó hecho y
que la ruta `/live/cierre` sirve para cualquier juego. Lo dispara un botón del
panel propio de quien dirige: **«Echar a andar»**.

---

## 7. Lo que genera la IA, y lo que garantiza el código

La misma frontera de la Momia, y por la misma razón: un conjunto de hitos mal
formado da una partida irresoluble que nadie descubre hasta que hay doce
personas de pie en un pasillo.

**El modelo escribe el sabor:**
- El señor, la noche de Honnō-ji, por qué esta columna y no otra.
- El dosier de cada escolta: papel, cara pública, secreto, motivo, coartada y
  gancho personal, escritos a la medida de la persona real.
- Quién es el kanchō y por qué lo hizo (su motivo tiene que doler: Iga fue
  arrasada, y eso da motivos de sobra que la mesa casi perdonará).
- La inscripción del cartel de cada paso.
- La narración de cada hora.
- **La redacción** de cada hito.
- El desenlace.

**El código garantiza la lógica:**
- La senda verdadera (una variación al azar, con semilla).
- El conjunto de hitos y sus cuatro garantías.
- El reparto de hitos por paso y hora, y que nadie los junte todos.
- Qué paso está batido cada hora.
- El reparto de papeles, de portes y de estandartes.
- **Las contraseñas de cada paso**, sacadas de una tabla de palabras reales del
  santo y seña japonés. Nunca las escribe el modelo: tienen que poder teclearse
  en un móvil a oscuras.
- Los hitos falsos candidatos.

Si el modelo redacta un hito que no corresponde a su condición, la partida sería
irresoluble. Por eso **se vuelve a leer cada frase y se comprueba que menciona
los pasos correctos**; si no, se conserva la redacción del código, que es sosa y
es cierta.

---

## 8. Lo que NO se toca de la plataforma

Esta entrega es **estrictamente aditiva**, y esa es su tesis. Lo único común que
se amplía es lo que el manual de `docs/manual-juego-nuevo.html` ya enumera como
deuda benigna —uniones cerradas que el compilador vigila— y el alta en los
cuatro registros:

| Qué se amplía | Dónde | Cuánto |
|---|---|---|
| `TrofeoId` | `shared/live.ts` | 5 ids nuevos, sin colisión con los de nadie |
| `PrintableDocId` | `shared/documents.ts` | 8 ids nuevos |
| `DocumentSectionId` | `shared/types.ts` | 4 ids nuevos |
| `IconoId` | `shared/juegos/tipos.ts` | 2 (`torii`, `abanico`) |
| `PantallaDeApp` | `shared/juegos/tipos.ts` | 2 (`camino`, `consejo`) |
| El registro de juegos | `shared/juegos/index.ts` | 3 líneas |
| El alta al arrancar | `server/src/juegos/instalados.ts` | 5 imports |
| El registro de plantillas | `docs/imprimibles/index.ts` | 8 líneas |
| La rama de generación | `plot/pipeline.ts` | 1 rama |
| La paleta de la app | `app/src/tema-juego.ts` | 1 línea |

**CLUEDO y la Momia no pueden cambiar de comportamiento.** Se comprueba con el
maestro de oro y con los verificadores de los dos juegos antes de cada commit.

---

## 9. Lo imprimible

Se tiene que poder jugar **sin móviles**, y aquí hay una salvedad honesta que
conviene escribir antes de que la descubra nadie en la mesa: **la contraseña de
la puerta no se puede comprobar en papel.** En la partida de papel, el cartel de
cada paso lleva la palabra y quien dirige la usa como prueba oral («¿qué pone en
la puerta del Vado?»). La mecánica sobrevive; lo que se pierde es el árbitro
automático.

| documento | qué es |
|---|---|
| `indice-paquete-sombras` | La hoja por la que se abre el paquete |
| `guia-del-paso` | El manual de quien dirige, hora por hora |
| `dosier-escolta` | Uno por persona: papel, disfraz, secreto, estandarte |
| `hitos-del-camino` | Los hitos recortables, agrupados por paso y hora |
| `carteles-paso` | Un cartel por habitación, con su nombre, su mon y **su contraseña** |
| `hoja-del-consejo` | Donde cada cual escribe su senda y a quién señala |
| `tabla-del-rastro` | La cuenta del rastro y de las prendas |
| `senda-verdadera` | La solución. **De quien prepara, nunca sobre la mesa** |

Estética: papel *washi*, tinta *sumi*, sello bermellón (*shuiniku*). **Ni el
burdeos de CLUEDO ni el oro de la tumba.**

### El dosier son cuatro caras, y las cuatro están medidas

Se maquetó a ojo y salió mal: el dosier ocupaba **tres caras y media**, y como el
catálogo lo declara a doble cara, la cara sobrante de una persona caía en la hoja
de la siguiente. Con secretos dentro. Peor todavía: el bloque del kanchō sumaba
casi una cara más que el de los demás, así que **el sobre más gordo de la mesa
era el del traidor** y la velada se acababa al repartir.

Ahora son **cuatro caras —dos hojas— iguales para todo el mundo**:

| cara | qué lleva | alto medido |
|---|---|---|
| 1 | Quién eres, disfraz, secreto, motivo, coartada | 1057 px |
| 2 | Los pasos, y **el cuaderno de la noche** — o lo del kanchō | 917 px |
| 3 | Lo que sabes de los demás, quién cruza, la carga | 1017 px |
| 4 | Tus prendas y las trece reglas, a dos columnas | 1018 px |

Un A4 con estos márgenes da **1009 px**. La segunda cara existe en todos los
dosieres y cambia de contenido, no de tamaño: es donde el kanchō lee lo suyo y
donde los demás encuentran el cuaderno para anotar quién estuvo dónde a cada
hora. Quien toque este documento tiene que volver a repartir las cuatro caras y
medirlas; el navegador, si le dejas, parte por donde quiera.

---

## 10. Trofeos

Ids largos y propios, porque los ids de trofeo no llevan prefijo de juego y dos
juegos pueden chocar sin que nada avise.

| id | nombre | cuándo |
|---|---|---|
| `paso-abierto` | El que abrió el paso | Tu senda fue la que se anduvo y era la buena |
| `ojo-de-hanzo` | El ojo de Hanzō | Señalaste al kanchō y acertaste |
| `sin-rastro` | Sin rastro | No pisaste ni una vez un paso batido |
| `palabra-dada` | Palabra dada | Diste tus dos prendas. Ninguna fue para ti |
| `sombra-de-akechi` | La sombra de Akechi | Eras el kanchō y amaneció sin barca |

---

## 11. Lo que queda pendiente, y no se implementa aquí

Escrito para que nadie lo dé por olvidado. **Ninguna de estas cosas se toca en
esta entrega**: son cambios en código común que afectan a juegos que ya están en
producción, y esa decisión no es de quien escribe el tercer juego.

1. **El aviso de la fase `sellado` está escrito a mano** en `routes/live.ts`.
   Debería salir de `manifiesto.avisos`, con una clave más. Mientras no lo esté,
   ningún juego nuevo puede usar esa fase sin anunciar las reglas de la Momia.
2. **El rótulo del botón «Abrir El Sellado»** está escrito a mano en
   `LivePanel.tsx`, con el mismo problema y la misma solución (`palabras.vivo`).
3. **`DefinicionCategoria` no sabe decir «exactamente N».** Los ritos de la
   Momia y la senda de este juego lo necesitan y hoy vive en
   `client/src/juegos/reglas.ts` como una tabla aparte. Falta `maximo`.
4. **`ronda.accionSobre` y `ronda.cambiosPermitidos` siguen sin leerlos nadie.**
   Este juego los declara y hace cumplir la regla en su reductor, como la Momia.
5. **La vista de quien dirige manda la sesión entera.** Se cubre con
   `registrarProyeccionParaGm`, igual que la Momia, pero el mecanismo sigue
   siendo un filtro sobre un objeto que ya viajaba entero.
6. **`AvisoClave` no tiene una clave por juego.** Los avisos propios de este
   juego se anuncian reutilizando las claves existentes.
7. **La contraseña de la puerta no tiene equivalente en la partida de papel.**
   Está descrito en §9 y asumido.

---

## 12. La regla que manda sobre todas

**Ni CLUEDO ni El Misterio de la Momia pueden cambiar de comportamiento.** Ni
una fase, ni un byte de su vista, ni un texto de sus imprimibles.

Y cada regla nueva se prueba **rompiéndola a propósito** y viendo fallar su
comprobación. Una comprobación que nunca se ha visto fallar no demuestra nada:
en este repositorio han aparecido ocho que pasaban en verde con su regla rota.
