# EL TABLERO QUE SE RECORRE

Cómo se anda por un tablero de esta casa, con quién se choca, y qué hace falta para que el
siguiente juego lo tenga sin volver a escribirlo.

> **Estado: DISEÑO, no construido.** Lo único que existe hoy es el paseo de Las Lindes, que
> es el borrador del que sale todo esto. Las decisiones marcadas **PARA MIGUEL** no las toma
> quien escriba el código.

---

## 0 · Qué se pide, y por qué no vale arreglarlo en un juego

Miguel, el 18 de septiembre de 2026:

> «aunque los otros dos no tengan aún esta capacidad deberían tenerla […] no quiero que
> hagamos desarrollos locales que solo corrijan uno de los tres juegos […] el engine de
> tablero debería permitir poder generar más juegos de tablero en el futuro sin tener que
> volver a corregir las colisiones e integrarse con todas las cosas globales del avatar.»

Son tres encargos y conviene no mezclarlos, porque tienen precios muy distintos:

1. **Recorrer el tablero con avatar**, en los tres juegos.
2. **Colisiones de verdad**, para que el avatar no atraviese las cosas.
3. **Objetos en el tablero que el avatar se lleva a SU CUENTA**, globales entre juegos.

Los dos primeros son trabajo de la capa de escenas y no tocan ninguna regla. **El tercero
choca de frente con una decisión fundacional del motor de arcade**, y está en el §6.

---

## 1 · Lo que hay hoy, medido y no supuesto

**Sólo Las Lindes se recorre.** Un único fichero en toda la casa lee las teclas de andar:
`escenas/lindes/Lindes.tsx`. Las apariciones de `unPaso` en El Burgo, en el arcade de la
basura y en `verify:escena` son homónimas y no tienen nada que ver —el peón del Burgo avanza
por `puntoEnLaVia`, o sea por un eje diseñado de casi seiscientos puntos, y no camina.

**Y no hay colisión con nada.** `unPaso` sólo pregunta `hayLosaEn`: el borde del tablero
frena, y las casas, murallas, árboles y almiares se atraviesan. Comprobado metiéndose dentro
de un almiar.

**Lo que ya está bien y hay que conservar**, porque salió de arreglar fallos reales y cada
pieza tiene su cicatriz:

| pieza | dónde vive hoy | qué resolvió |
|---|---|---|
| `Paseante`, `Mandos`, `unPaso` | `lindes/paseo.ts` | el paso, el rumbo y el frenado en el borde sin engancharse |
| `camaraDeHombro`, `camaraDeOjos` | `lindes/paseo.ts` | las dos cámaras de a pie |
| `giroDeLaMarioneta` | `lindes/paseo.ts` | que el avatar no ande de espaldas al este y al oeste |
| `QuienAnda` | `lindes/quien-anda.tsx` | montar la marioneta, elegir clip por la DERIVADA de lo andado, girar por el camino corto |
| `nacerEnLaLosa` | `lindes/paseo.ts` | no nacer dentro de una casa |
| `loQueSeEstira`, `cajaDelModelo` | `lindes/desierto.ts`, `lindes/Lindes.tsx` | medir una pieza por su caja y no a ojo |

---

## 2 · La frontera: qué es del motor y qué es de cada juego

La regla es la misma que usa el resto de la casa: **el motor no sabe de ningún juego; el
juego contesta preguntas.** Lo que decide de qué lado cae cada cosa es si depende de la
FORMA del tablero.

### Del motor — `escenas/paseo/`

- El **paseante**: dónde está, hacia dónde mira, cuánto lleva andando.
- Los **mandos** y la integración del paso, con el frenado que ya funciona.
- Las **cámaras de a pie** (hombro y ojos) y el giro de la marioneta.
- El **avatar**: montar la figura, los clips, el giro corto. Hoy `QuienAnda`.
- **Las colisiones**: el algoritmo. §4.
- **La rejilla** que evita preguntar por todas las piezas en cada fotograma. §4.
- Más adelante, **las cosas que se recogen**: dónde están y cuándo se tocan. §6.

### De cada juego

- **Dónde se pisa.** En Las Lindes, «hay losa puesta»; en Riberas, «es tierra y no agua»; en
  El Burgo, «estás en el anillo o en la plaza». Ningún motor puede adivinarlo.
- **Qué estorba.** Cada juego sabe cuáles de sus piezas son obstáculos: una casa sí, un camino
  no, un trigal probablemente tampoco.
- **Dónde se nace**, que en Las Lindes ya sabe no meterte en una casa.
- **La cámara de mesa**, que encuadra la forma del tablero y no es la misma en un rectángulo
  de losas, en un delta y en un anillo.
- El paisaje, el atrezo y los rincones de la pantalla.

### Lo que NO se mueve

`escenas/lindes/paseo.ts` tiene hoy las dos mitades juntas. Al subir la general hay que
dejar abajo `nacerEn`, `nacerEnLaLosa`, `hayLosaEn`, `loQueAbarca` y `camaraDeMesa`, que
hablan de losas. **La partición es limpia**: no hay ninguna función que sea mitad y mitad.

---

## 3 · El contrato

Lo que un juego tiene que contestar para que su tablero se pueda recorrer. Nada más:

```ts
/** Un obstáculo, visto desde arriba: un círculo con su alto. */
export interface Estorbo {
  readonly x: number;
  readonly z: number;
  readonly radio: number;
  /** Lo alto que es. Un bordillo no frena; una casa sí. */
  readonly alto: number;
}

export interface SueloQueSeRecorre {
  /** ¿Se puede estar de pie aquí? Fuera del tablero, el agua o el vacío: no. */
  sePisa(x: number, z: number): boolean;
  /** Lo que estorba cerca de un punto. El motor no lo recorre entero: pregunta por zona. */
  loQueEstorba(x: number, z: number, alcance: number): readonly Estorbo[];
  /** Dónde nace quien llega, y mirando a dónde. */
  dondeSeNace(): Paseante;
}
```

**Por qué círculos y no cajas.** Porque el paseante también es un círculo, la prueba es una
resta y una raíz, y **no hay que rotar nada**: una caja girada obliga a proyectar sobre ejes
y a mantener el giro de cada pieza. Con las piezas de este pack —rocas, casas, almiares,
carros— un círculo se equivoca en las esquinas y no se nota andando. El día que haga falta
una pared larga, se pone como varios círculos en fila, que es lo que ya hace la muralla con
sus tramos.

**De dónde sale el radio, que es lo que evita una tabla a mano.** De la caja del propio
modelo, que ya se mide en `cajaDelModelo`: la mitad del mayor de sus dos lados
horizontales. Es la misma lección que las piedras del desierto —**una tabla de medidas
escrita a mano se queda vieja en silencio el día que alguien recompile el pack**— y aquí
vale igual.

---

## 4 · Las colisiones

### El algoritmo

`unPaso` ya hace lo correcto para el borde: prueba el paso entero, y si no cabe prueba sólo
en `x` y sólo en `z`, quedándose con lo que quepa. **Eso es exactamente lo que hace que andar
pegado a una pared resbale en vez de engancharse.** Las colisiones no cambian esa forma: sólo
añaden una condición a «¿cabe aquí?».

```
cabe(x, z)  =  suelo.sePisa(x, z)
            y  ninguno de suelo.loQueEstorba(x, z, RADIO + mayorRadio)
               está a menos de (RADIO + su radio) del punto
```

Con eso sale gratis el deslizamiento contra las casas, que es la mitad de que andar se sienta
bien.

### La rejilla

Preguntar por todas las piezas en cada fotograma es lo que hay que evitar: Las Lindes pone
unas cincuenta piezas por losa y setenta y dos losas son **tres mil seiscientas**. Una
rejilla uniforme de casilla pequeña —un octavo de losa, veintidós unidades— deja a cada
consulta mirando nueve cubos con una o dos piezas cada uno. Se construye una vez cuando el
tablero cambia y es del motor, no del juego.

### Lo que hay que medir antes de darlo por bueno

- **Cuántas piezas se consultan por fotograma**, contadas y no cronometradas — ver
  `color-leido-de-texto-en-cada-fotograma`: un cronómetro de fotograma miente cuando la
  máquina está ocupada.
- **Que no se pueda cruzar una pared andando en diagonal contra su esquina**, que es el fallo
  clásico de resolver por ejes.
- **Que no se quede nadie encerrado**: nacer siempre en un sitio del que se pueda salir.

---

## 5 · Lo que hace falta en cada juego

| | dónde se pisa | qué estorba | cámara de mesa | trabajo |
|---|---|---|---|---|
| **Las Lindes** | ya está (`hayLosaEn`) | ya están las piezas con su caja | ya está | declarar los estorbos |
| **Riberas** | tierra sí, agua no | chozas, ciudades, bosque | la suya, ya existe | el suelo y los estorbos |
| **El Burgo** | el anillo y la plaza | los edificios del anillo | la suya, ya existe | el suelo y los estorbos |

En Riberas hay además una pregunta de diseño que no es técnica: **si se anda por el delta,
¿se puede andar sobre el agua?** Lo natural es que no, y entonces el delta se recorre por
islas — lo que puede ser bonito o un incordio. Es de Miguel.

---

## 6 · Los objetos que se recogen, y la decisión que no es mía

Aquí está el choque, y conviene verlo entero antes de escribir una línea.

**`docs/MOTOR-DE-ARCADE.md`, línea 183:**

> **asiento** · Un sitio en la mesa, **anónimo y efímero**: un nombre tecleado · *No es un
> `participante` de plataforma, que tiene cuenta, correo y obligaciones de datos.*

Y en el vestíbulo, a la cara del jugador: «No es una cuenta: no hay correo ni contraseña, y
muere con la partida.»

O sea que **el arcade se construyó a propósito sin cuentas**, y un inventario global necesita
justamente una cuenta. No es un obstáculo técnico: es una decisión de producto con
consecuencias de datos personales que el propio motor nombra.

### Los tres caminos, con su precio

| | qué es | precio |
|---|---|---|
| **A · El arcade gana cuentas** | el asiento pasa a ser un `participante` | cruza la frontera fundacional; correo, RGPD, y el vestíbulo deja de poder decir lo que dice |
| **B · La cuenta es la de veladas, y el arcade se engancha si estás dentro** | el asiento sigue siendo anónimo; si además hay sesión, el inventario es de esa cuenta | hay que poder atar un asiento a un participante SIN que eso entre en el estado del juego |
| **C · Una bolsa del aparato** | se guarda en el dispositivo, sin cuenta | sin obligaciones de datos, pero no es global: se pierde al cambiar de móvil |

**B es la que respeta lo construido**, y es la que yo propondría. Pero tiene una condición
técnica que no se puede negociar:

> **El inventario NO puede entrar en el estado del juego.** El reductor del arcade es puro,
> sellado, determinista y su estado es opaco: meterle cuentas rompe el maestro de oro, la
> comprobación de determinismo y el presupuesto de cable a la vez. Recoger un objeto es un
> efecto de la capa de mesa, no un movimiento del juego.

### Y de ahí sale una pregunta de diseño que cambia el trabajo entero

**PARA MIGUEL:** ¿los objetos del tablero son **de cada uno** —cada jugador ve y recoge su
copia, como el paisaje— o hay **carrera** por ellos, y el que llega primero se lo lleva?

- **De cada uno**: sale del paisaje, es determinista desde la semilla, no toca el reductor y
  se puede hacer ya. Barato y limpio.
- **Carrera**: es estado compartido de la partida, tiene que ir en el reductor, lo ve el
  maestro de oro, pesa en el cable y **obliga a que cada juego declare esos objetos en sus
  reglas**. Es otro trabajo, bastante mayor.

No es una pregunta de matiz: la primera respuesta se construye en la capa de escenas y la
segunda en el núcleo sellado.

---

## 7 · Orden de trabajo propuesto

1. **Subir el paseo a `escenas/paseo/`** con el contrato del §3, dejando Las Lindes
   funcionando exactamente igual. Sin colisiones todavía: es una mudanza, y se mide en que
   la batería sigue verde y el juego se ve igual.
2. **Las colisiones en el motor**, y Las Lindes declarando sus estorbos. Con sus
   comprobaciones: la diagonal contra la esquina, el conteo de consultas, y que no se
   encierre a nadie.
3. **El Burgo**, que es el más fácil de los dos que faltan: el anillo es un eje y su suelo
   está bien definido.
4. **Riberas**, cuando esté decidido lo del agua.
5. **Los objetos**, cuando esté decidido lo del §6.

**Y esto no se hace en la rama `lindes`.** Toca dos juegos en producción y la capa
compartida: pide su propio worktree y su propia rama, como manda la casa.
