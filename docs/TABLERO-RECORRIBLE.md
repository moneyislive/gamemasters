# EL TABLERO QUE SE RECORRE

Cómo se anda por un tablero de esta casa, con qué se choca, **dónde se ejecuta cada cosa** y
qué hace falta para que el siguiente juego lo tenga sin volver a escribirlo.

> **DECISIONES TOMADAS POR MIGUEL, 19 de septiembre de 2026.** Este documento se escribió
> proponiendo un motor de paseo PROPIO. Miguel ha decidido otra cosa, y manda:
>
> 1. **IR Engine entra, y es innegociable.** Los cuatro bloqueos del §2.1 del motor de arcade
>    quedan aceptados como coste a planificar, no como impedimento. Condiciones suyas: la capa
>    de IR es **sólo para los dispositivos que la soporten**, se activa **sólo cuando el usuario
>    quiere ver el avatar sobre el tablero**, y **la verdad de la partida NO vive en IR**.
> 2. **Los avatares SÍ se ven unos a otros.**
> 3. **Los objetos del tablero son DE CADA UNO**: cada jugador recoge su copia. No hay carrera,
>    así que no tocan el reductor sellado.
> 4. **En Riberas se vadea**: se anda por la arena y por el agua somera, con el avatar metido en
>    el agua; lo hondo frena, porque no hay clip de nadar.
>
> **La arquitectura de todo esto vive en `docs/CAPA-ESPACIAL.md`**, que la sustituye. Lo que
> sigue se conserva porque el análisis de coste del §2 y la partición del paseo del §4 siguen
> siendo válidos y son la base de aquélla.

> **Estado: DISEÑO, no construido.** Lo único que existe hoy es el paseo de Las Lindes, que es
> el borrador del que sale todo esto. Las decisiones marcadas **PARA MIGUEL** no las toma
> quien escriba el código.

---

## 0 · La pregunta que ordena todo el documento

Miguel, planteando la duda que hizo falta resolver antes de diseñar nada:

> «los juegos deben ser módulos de una arquitectura modular, no deben exigir la
> reimplementación del motor que estará desplegado como backend en servidores de la
> plataforma […] la idea de esto es que nos permita dar soporte a millones de usuarios sin
> gastar fortuna en servidores (dime si esto es correcto) por tanto todo lo que engrosemos el
> motor caerá del lado nuestro de los servidores de la plataforma si lo estoy entendiendo
> bien.»

**El objetivo es correcto. La premisa de la segunda mitad no lo es**, y la diferencia decide
qué se puede construir sin pagarlo. Lo que sigue está comprobado en el árbol, no razonado de
memoria.

---

## 1 · Qué corre dónde, medido

«El motor» son **dos motores distintos**, y sólo uno pisa un servidor.

### El servidor ejecuta

`server/src` y `shared/arcade`. Sus dependencias enteras son:

```
@anthropic-ai/sdk · cors · dotenv · express · mongoose · multer · nanoid
```

**No hay `three`. No hay React. No hay `escenas`.** `server/src` no importa ni una línea de
`escenas/`; las cinco menciones que aparecen al buscar son comentarios, y
`server/src/routes/modelos.ts` lo dice en el suyo: *«no importa nada de `escenas/`»*. De esa
carpeta el servidor sólo **sirve bytes** —los `.glb`— como ficheros estáticos, sin abrirlos.

### El dispositivo ejecuta

**Toda la capa `escenas/`**: la geometría, los modelos, las cámaras, la marioneta, el paseo —
y las colisiones, si se hacen. Más `*-en-tres.ts`, que traduce la vista del juego a lo que se
pinta, y que **el servidor tampoco toca**: no aparece en `server/src` ni sale por el barril de
`shared/arcade`.

Y `escenas/` **no tiene barril**: cada juego importa lo que usa. Un juego que no se recorra no
se lleva ni un byte del paseo.

### Y la casa ya tiene el interruptor que describes

No hay que inventarlo: `ManifiestoDeArcade` lleva un campo `sede`.

| juego | `sede` | quién calcula |
|---|---|---|
| La Frente, el Arcade, la Peonza | `'dispositivo'` | el reductor corre en Hermes, en el móvil |
| El Burgo, Las Lindes | `'servidor'` | el reductor corre en el servidor |

La razón de que El Burgo y Las Lindes sean `'servidor'` no es capricho: hay varios aparatos
que tienen que ver la misma partida, y el árbitro decide. La Frente no lo necesita porque es
un solo aparato.

---

## 2 · Entonces, ¿qué cuesta servidores de verdad?

Cuatro cosas, y ninguna es la geometría:

1. **Una conexión retenida por jugador sentado.** La lectura es de *espera larga*: el cliente
   pide `?desde=<revisión>` y el servidor **retiene la respuesta** hasta que algo cambia
   (`esperarCambio`). Es el modelo barato —no hay sondeo en vacío—, pero es una conexión viva
   por jugador mientras la mesa está abierta. **Éste es el número que multiplica por millones.**
2. **Una ejecución del reductor por movimiento**, sólo en los juegos `sede: 'servidor'`.
3. **Una revisión persistida por movimiento.**
4. **Los bytes estáticos de los modelos**, que son cacheables y podrían ir a un CDN sin tocar
   el servidor.

### El corolario que invierte la pregunta

**Las colisiones cuestan exactamente cero servidores.** Corren en el dispositivo, dentro de un
bucle de dibujo que ya está corriendo, y no añaden ni un byte al cable ni una fila a la base.

**Y de tus tres encargos, el único con factura de servidor es el tercero**: un inventario
global es estado de cuenta —se escribe por jugador, se persiste para siempre y se lee en cada
sesión—. Las colisiones son gratis; el inventario es el caro. Está en el §6.

### Y el punto más afilado, que conviene no perder

**Hoy el paseo es gratis porque es PRIVADO.** `paseante` no aparece ni en `shared/` ni en
`server/src`: dónde estás andando no sale de tu aparato. Nadie más te ve.

Así que la pregunta cara no es «¿colisionamos?», es **«¿se ven los avatares entre sí?»**. Eso
sí es un flujo de posiciones por jugador y por fotograma, y eso sí se paga:

| | coste por jugador |
|---|---|
| andar y chocar con el escenario | **cero servidor** |
| verse unos a otros andando | un flujo de posiciones, ~10 a 30 mensajes/segundo |

**PARA MIGUEL:** ¿los avatares se ven unos a otros recorriendo el tablero, o cada uno lo
recorre solo? Es la decisión con más consecuencia económica de todo este documento, y no
depende de las colisiones: depende de si el paseo es una experiencia compartida o privada.

---

## 3 · Lo que hay hoy

**Sólo Las Lindes se recorre.** Un único fichero en toda la casa lee las teclas de andar:
`escenas/lindes/Lindes.tsx`. Las apariciones de `unPaso` en El Burgo, en el arcade de la
basura y en `verify:escena` son homónimas —el peón del Burgo avanza por `puntoEnLaVia`, un eje
diseñado de casi seiscientos puntos: recorre un raíl, no camina.

**Y no choca con nada**: `unPaso` sólo pregunta si hay losa. El borde frena; casas, murallas,
árboles y almiares se atraviesan.

Lo que ya funciona y hay que conservar, porque cada pieza salió de un fallo real:

| pieza | qué resolvió |
|---|---|
| `Paseante`, `Mandos`, `unPaso` | el paso, el rumbo y el frenado en el borde sin engancharse |
| `camaraDeHombro`, `camaraDeOjos` | las dos cámaras de a pie |
| `giroDeLaMarioneta` | que el avatar no ande de espaldas al este y al oeste |
| `QuienAnda` | montar la marioneta y elegir clip por la DERIVADA de lo andado |
| `nacerEnLaLosa` | no nacer dentro de una casa |
| `cajaDelModelo` | medir una pieza por su caja y no a ojo |

---

## 4 · La arquitectura: el juego DECLARA, el motor CONSUME

Aquí está la respuesta a tu objeción, y no es «poner código común en una carpeta»: es usar el
patrón que esta casa **ya tiene en dos sitios**.

- Un juego de arcade no implementa un motor: **declara** un `ManifiestoDeArcade` y el motor lo
  consume.
- Un tablero 2D no se dibuja a sí mismo: **declara** un `TableroDeclarado` —caras, líneas,
  nudos, acciones— y la Sala lo pinta.

El tablero recorrible es el tercer caso, y por tanto:

> **Un juego declara un MUNDO. El motor de paseo lo consume. Ningún juego implementa
> colisiones, y el motor no sabe el nombre de ningún juego.**

Eso es lo que hace que el cuarto juego no tenga que volver a corregir nada: lo único que
escribe es su declaración.

### El motor no colisiona JUEGOS: colisiona CUERPOS

Tu frase —«el código para que un avatar o cualquier objeto colisione correctamente con
cualquier otro de cualquier juego no debería ser distinto en cada juego»— es exactamente el
criterio de diseño, y tiene una consecuencia concreta: **la unidad del motor no puede ser un
concepto de juego**. No existen «losas» ni «chozas» ni «casillas» dentro del motor. Existen
cuerpos.

```ts
/** Cualquier cosa que ocupa sitio. El motor no sabe de qué juego es. */
export interface Cuerpo {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  /** Visto desde arriba es un círculo. Por qué, más abajo. */
  readonly radio: number;
  readonly alto: number;
  readonly que:
    | 'firme'      // no se mueve y no se pasa: una casa, una roca, una muralla
    | 'suelto'     // se mueve y no se pasa: un avatar, un carro, un animal
    | 'al paso';   // no frena, avisa cuando se toca: lo que se recoge, un disparador
}
```

Un avatar es un cuerpo `suelto`. Una casa es `firme`. Un objeto que se recoge es `al paso`. El
motor resuelve **cuerpo contra cuerpo** y no ha oído hablar de Carcassonne ni del delta.

### Lo que declara un juego

```ts
export interface MundoQueSeRecorre {
  /** ¿Se puede estar de pie aquí? Fuera del tablero, el agua, el vacío: no. */
  sePisa(x: number, z: number): boolean;
  /** Los cuerpos del escenario. Se pide cuando el tablero cambia, no cada fotograma. */
  losCuerpos(): readonly Cuerpo[];
  /** Dónde nace quien llega, y mirando a dónde. */
  dondeSeNace(): Paseante;
}
```

Tres preguntas. Nada más. Y las tres son sobre la FORMA de su tablero, que es lo único que un
motor no puede adivinar: en Las Lindes «hay losa puesta»; en Riberas «es tierra y no agua»; en
El Burgo «el anillo y la plaza».

### Por qué círculos y no cajas

Porque el que se mueve también es un círculo, la prueba es una resta y una raíz, y **no hay
que rotar nada**: una caja girada obliga a proyectar sobre ejes y a mantener el giro de cada
pieza. Con este pack —rocas, casas, almiares, carros— un círculo se equivoca en las esquinas y
no se nota andando. Una pared larga se declara como varios círculos en fila, que es lo que la
muralla ya hace con sus tramos.

**Y el radio sale de la caja del propio modelo**, que ya se mide en `cajaDelModelo`: la mitad
del mayor de sus lados horizontales. Es la lección que acaban de dar las piedras del desierto
—una tabla de medidas escrita a mano se queda vieja en silencio el día que alguien recompile
el pack— y aquí vale igual.

### Dónde vive cada cosa

```
escenas/paseo/          ← MOTOR, sólo dispositivo, sin barril, sin saber de juegos
  paseante.ts             el que anda: sitio, rumbo, mandos, el paso
  camaras.ts              hombro y ojos, y el giro de la marioneta
  cuerpos.ts              Cuerpo, la rejilla y la resolución del choque
  quien-anda.tsx          la marioneta que se ve
  mundo.ts                el contrato `MundoQueSeRecorre`

escenas/lindes/         ← MÓDULO del juego
  mundo.ts                su declaración: sePisa, losCuerpos, dondeSeNace
  ...                     su paisaje, su cámara de mesa, sus rincones
```

Un juego que no se recorra —Riberas hoy, o el cuarto que venga— **no importa nada de
`escenas/paseo/`** y no paga ni un byte, porque no hay barril que lo arrastre. Esa propiedad
es parte del diseño y hay que comprobarla, no confiar en ella.

---

## 5 · Las colisiones

### El algoritmo

`unPaso` ya hace lo correcto con el borde: prueba el paso entero y, si no cabe, prueba sólo en
`x` y sólo en `z`, quedándose con lo que quepa. **Eso es lo que hace que andar pegado a una
pared resbale en vez de engancharse.** Las colisiones no cambian esa forma: añaden una
condición a «¿cabe aquí?».

```
cabe(x, z)  =  mundo.sePisa(x, z)
            y  ningún cuerpo 'firme' ni 'suelto' de la rejilla alrededor de (x, z)
               está a menos de (miRadio + suRadio)
```

El deslizamiento contra las casas sale gratis de ahí, y es la mitad de que andar se sienta
bien.

### La rejilla

Preguntar por todos los cuerpos cada fotograma es lo que hay que evitar: Las Lindes pone unas
cincuenta piezas por losa y setenta y dos losas son **tres mil seiscientas**. Una rejilla
uniforme de casilla pequeña —un octavo de losa, veintidós unidades— deja cada consulta mirando
nueve cubos con una o dos piezas. Se construye cuando el tablero cambia, no cada fotograma, y
es del motor.

### Lo que hay que medir antes de darlo por bueno

- **Cuántos cuerpos se consultan por fotograma**, contados y no cronometrados: un cronómetro
  de fotograma miente cuando la máquina está ocupada. Ya pasó.
- **Que no se cruce una pared en diagonal contra su esquina**, que es el fallo clásico de
  resolver por ejes.
- **Que nadie se quede encerrado**: nacer siempre donde se pueda salir.
- **Que un juego que no se recorre no importe el motor**, comprobado sobre el fuente.

---

## 6 · Lo que se recoge, y la decisión que no es mía

**`docs/MOTOR-DE-ARCADE.md`, línea 183:**

> **asiento** · Un sitio en la mesa, **anónimo y efímero**: un nombre tecleado · *No es un
> `participante` de plataforma, que tiene cuenta, correo y obligaciones de datos.*

El arcade se construyó **a propósito sin cuentas**, y el vestíbulo se lo dice al jugador a la
cara. Un inventario global necesita justamente una cuenta. No es un obstáculo técnico: es una
decisión de producto con consecuencias de datos personales que el propio motor nombra — y,
como dice el §2, es el único de los tres encargos con factura de servidor.

| | qué es | precio |
|---|---|---|
| **A · el arcade gana cuentas** | el asiento pasa a ser un `participante` | cruza la frontera fundacional; correo, RGPD, y el vestíbulo deja de poder decir lo que dice |
| **B · la cuenta es la de veladas** | el asiento sigue anónimo; si además hay sesión, el inventario es de esa cuenta | hay que atar asiento a participante **sin** que eso entre en el estado del juego |
| **C · una bolsa del aparato** | se guarda en el dispositivo | sin obligaciones de datos, pero no es global: se pierde al cambiar de móvil |

**B respeta lo construido** y es la que yo propondría, con una condición innegociable:

> **El inventario NO puede entrar en el estado del juego.** El reductor es puro, sellado,
> determinista y su estado opaco: meterle cuentas rompe a la vez el maestro de oro, la
> comprobación de determinismo y el presupuesto de cable (`TOPE_DE_LA_VISTA`, 96 kB). Recoger
> es un efecto de la capa de mesa, no un movimiento del juego.

**PARA MIGUEL:** ¿los objetos del tablero son **de cada uno** —cada jugador ve y recoge su
copia, como el paisaje— o hay **carrera** y se lo lleva quien llega primero?

- **De cada uno**: sale del paisaje, es determinista desde la semilla, no toca el reductor ni
  el cable, y se puede hacer ya.
- **Carrera**: es estado compartido de la partida. Va al núcleo sellado, lo ve el maestro de
  oro, pesa en el cable y obliga a que cada juego declare esos objetos en sus reglas.

No es un matiz: la primera se construye en el dispositivo y la segunda en el servidor.

---

## 7 · Lo que hace falta en cada juego

| | dónde se pisa | qué estorba | trabajo |
|---|---|---|---|
| **Las Lindes** | ya está | las piezas, con su caja ya medida | declarar su mundo |
| **El Burgo** | el anillo y la plaza, bien definidos | los edificios del anillo | declarar su mundo |
| **Riberas** | tierra sí, agua no | chozas, ciudades, bosque | declarar su mundo |

**PARA MIGUEL:** en Riberas, ¿se anda sobre el agua? Lo natural es que no, y entonces el delta
se recorre por islas: puede ser bonito o un incordio, y es decisión de producto.

---

## 8 · Orden de trabajo

1. **Subir el paseo a `escenas/paseo/`** con el contrato del §4, dejando Las Lindes igual. Es
   una mudanza: se mide en que la batería sigue verde y el juego se ve idéntico.
2. **Las colisiones sobre cuerpos**, y Las Lindes declarando los suyos, con sus comprobaciones.
3. **El Burgo**, el más fácil de los que faltan.
4. **Riberas**, cuando esté decidido lo del agua.
5. **Los objetos**, cuando estén decididas las dos preguntas del §6.

**Y esto no se hace en la rama `lindes`.** Toca dos juegos en producción y la capa compartida:
pide su propio worktree y su propia rama.
