> Documento de rediseño de «El Quiebro» para una ciudad grande que se recorre entera. Nació el 24-sep-2026 de una queja de Miguel. Lo prepararon un panel con dos propuestas («distritos» y «ciudad-viva») y un juez; esta síntesis es del director. Si contradice al código, gana el código. Si contradice a `docs/EL-QUIEBRO.md`, manda éste en lo que dice cambiar, pero sólo cuando Miguel haya decidido el §7; hasta entonces vale aquél. Las medidas del director están en `…/scratchpad/diseno-ciudad/director/medir.mts` y las del juez en `…/scratchpad/diseno-ciudad/juez/`.

# El Quiebro en ciudad abierta: «La ciudad de los Fallos»

**Estado:** decidido (§7); se construye en tres entregas y una fase 2 (§6).
**En una frase:** la noche deja de ser tres oleadas en una glorieta con telón. Pasa a ser una travesía por una ciudad de 540 × 540 m que se pisa entera desde la Bajada: tres Fallos en tres distritos, emboscadas y rondas por el camino, y una Llamada con dos cabinas entre las que elegir.

---

## 0. La queja, la causa y la respuesta

**La queja**, textual: «el juego solo tiene lugar en una plaza, no se pueden recorrer las demás calles aunque se vean formadas, esto es un error, la ciudad debe ser grande y poder recorrerse de forma amplia y libre».

**La causa, en el código:**
- El barrio mide 156 m: 3 × 3 manzanas de 36 m (`LADO_DEL_BARRIO` en `quiebro-barrio.ts`).
- `limiteDeLaFase` (`quiebro-reglas.ts:754`) devuelve `glorieta48` o `glorieta60` en la Bajada, las oleadas y las pausas. El barrio sólo se abre en la Llamada, y sólo sus 156 m.
- Fuera de ±78 m está el anillo pintado de `anillo.ts`: calles formadas que acaban en una valla.

**La respuesta:**

| | Hoy | Con este documento |
|---|---|---|
| Ciudad | 156 m, 9 huecos de manzana | 540 m, 121 huecos, 5 distritos, 6 plazas |
| Qué se pisa en combate | la glorieta, de 48 o 60 m | la ciudad entera (en la Bajada, su plaza) |
| Dónde se pelea | siempre en la glorieta | donde esté el grupo: en los Fallos, en las emboscadas del camino, contra las rondas y en la carrera a la cabina |
| El objetivo de cada ronda | vaciar la oleada | llegar a un Fallo de otro distrito y cerrarlo |
| La Llamada | 1 cabina a 60-110 m | 2 cabinas a la vez, a 100-160 y 180-260 m por calles |
| Durmientes | 48 | unos 630 |
| El borde | calles formadas que acaban en valla | fachada continua; las tres salidas se deshacen en glifos (§2.5) |
| Noche | 6-10 min | 8-10 min (hasta 14 con propinas) |
| Sala llena (PC) | ≈ 5,9 ms/s | ≈ 7,9 ms/s, con los índices del §5.4 |

**La otra queja de Miguel**, la de los personajes de calidad AAA, no es de este documento: tiene su propia línea en `docs/quiebro/METAHUMAN.md`. Lo que éste hace por ella es dejarle sitio:
- la ciudad baja su cuota del 60 al **50 %** de cada tope (§5.7);
- de `personajes/` sólo se tocan dos ficheros, para leer la multitud y el rebaño de las rondas (§6.2).

---

## 1. Qué cambia y qué se conserva

### 1.1 Se conserva tal cual

- **El núcleo del combate** (§4.3-4.8 de EL-QUIEBRO): el anuncio en el reloj del aparato, el quiebro y la ventana limpia, el Remanso, la Réplica, la Acometida, la Tanda a compás, el Empellón y la guardia, el estampado, el desalojo y el Trasvase, y las balas lentas.
- Aguante, Foco, racha, monedas, rescate, Vigía y esquirlas con pago triangular.
- **Los tres planos del estado** y quién escribe qué (§10). La mesa sigue recibiendo sólo `arcade:ronda`, `arcade:reloj` y `arcade:ausente`.
- **Los ids de fase de la mesa**: `bajada`, `oleada(n, k)`, `pausa(n, k)`, `llamada`, `recuento`… Cambian los nombres que se leen (§3.1), no el reductor, así que no hay mesas que migrar.
- **La tabla §4.10** de vivos por presentes (6/8/11/11/14/14) y la composición de cada oleada. Ahora es la del Fallo de cada tramo.
- Estilos, retoques, averías, recetas, nivel de noche y Memoria del Sistema.
- **El §2.1** (los primeros 30 s): el Tramo 1 de la primera noche ES la oleada 1 de hoy, en la Glorieta del Relojero.
- **El aforo declarado**: 20 entidades, 12 balas y 16 montones, igual en todas las mesas y fases.
- `mundo.ts`, `andar.ts` y todo lo sellado, sin tocar. El lado de casilla es un dato.

### 1.2 Cambia

| Qué | Hoy | Después | Dónde |
|---|---|---|---|
| Tamaño y traza | 3 × 3 manzanas, un barrio nuevo cada noche (§6.1 de EL-QUIEBRO) | 11 × 11 en la rejilla de 48 m; la ciudad es de la mesa | §2 |
| Límite de fase | `glorieta48`/`glorieta60`, y el barrio sólo en la Llamada | la plaza en la Bajada; la ciudad en todo lo demás | §3.1 |
| Oleadas | en la glorieta | Tramos: un Fallo por tramo, el 2 y el 3 en otros distritos | §3.3 |
| Entre combates | nada | emboscadas, rondas y olvido | §3.4 |
| La Llamada | 1 cabina, 50 s, a 60-110 m | 2 cabinas, 60 s, por calles | §3.7 |
| Reaparecer | la cabina de refugio de la glorieta | el refugio más cercano al grupo | §4 |
| HUD | la brújula | además, minimapa, plano, metros por calles e hilo de rumbo | §5.9 |
| Durmientes | 48 | unos 630, escritos cuando hacen falta | §5.8 |
| Casilla del suelo | 2 m | 8 m | §2.4 |
| Coste declarado de una sala | base 100 y 250 por entidad | base 400 y 300 por entidad | §5.6 |
| Cuota de la ciudad | 60 % | 50 % | §5.7 |

### 1.3 De dónde sale cada cosa

- **De «distritos»:**
  - los Fallos como espina de la noche;
  - las rondas de guion, que sólo cuestan cuando hay alguien cerca;
  - los racimos, el rezagado y el precio de separarse;
  - la Lectura de capacidad 2 y el Custodio;
  - los índices de la Liza.
- **De «ciudad-viva»:**
  - un tamaño que el juego puede llenar;
  - la ventana de celdas del cliente, con la ciudad entera en LOD1 detrás;
  - las dos avenidas y los callejones de 6 m;
  - la Llamada con varias cabinas;
  - las arcas.
- **Del juez:**
  - la fusión de las dos;
  - el arreglo de la validación: el `indexOf` cuadrático y guardarla por identidad;
  - un mundo estable toda la noche;
  - la cuota del 50 %;
  - el reparto en entregas.
- **Lo que se tira:**
  - 828 m en la v1: pasa a la fase 2 como un anillo más, que es sólo datos;
  - el Rastreo, que es un sistema de sigilo opaco dentro de un brawler de móvil. Sólo vuelve si falla la medida de contactos (§3.12);
  - las rondas como entidades permanentes;
  - «cada corrillo su pelea»;
  - el A* con cota, que no hace falta (§5.4).
- **Lo que añade el director** (cada cosa con su porqué en su sección):
  - la rejilla estricta de 48 m, que da 540 m y no 564;
  - la casilla de 8 m y no de 4;
  - las trazas dibujadas a mano y comprobadas enteras;
  - la traza y los Fallos guardados en la vista;
  - el borde de glifos;
  - el alcance de blanco de 45 m;
  - una espera de emboscada de 20 s, contada desde el principio del tramo;
  - el chequeo tipado del mundo, donde hoy la validación usa el recorrido genérico.

---

## 2. La ciudad

### 2.1 Rejilla y medidas

- **El paso de 48 m de hoy:** solar de 36 m y calle de 12 (acera de 3 + calzada de 6 + acera de 3).
- **Solares:** centrados en 48k, con k = −5…5, lo que da 11 × 11 = 121 huecos de manzana. La Glorieta sigue en el hueco (0, 0), de −18 a 18.
- **Ejes de calle** en 24 + 48k: ±24, ±72, ±120, ±168, ±216 y ±264. Son doce por eje, con 144 cruces y 264 tramos.
- **Borde:** acera exterior hasta ±270 y cerco de ±270 a ±272, así que hay **540 m de acera a acera** (544 con el cerco).
- **Orientación:** el origen está en el centro de la Glorieta, con `x` al este y `z` al sur, como en `mundo.ts`.
- **Dos avenidas de 24 m** (acera de 4 + calzada de 7 + mediana de 2 + calzada de 7 + acera de 4). Cada una ocupa una línea de la rejilla y le quita 6 m a las manzanas que dan a ella, que quedan de 30 m en ese eje. Así ningún eje se mueve.
  - **La Avenida del Elevado**, en el eje z = −120, de canto a canto (540 m):
    - el viaducto va a 7,5 m sobre la mediana;
    - lleva un pilar de 1 × 1 m cada 12 m, fuera de los cruces. Son unos 36, y cuentan como estructura: cubren y se estampa contra ellos;
    - el tren pasa cada 60 s, con el desfase de la noche, y tarda 34 s en cruzar a 16 m/s.
  - **El Bulevar**, en el eje x = +120, del Elevado al canto sur (390 m). La mediana está arbolada, con un tronco de 0,6 m cada 8 m (unos 32) y bancos.
- **Los topes numéricos:** ±272 m cabe con holgura en los ±512 de `TOPE_DE_LA_LIZA`.
  - Ninguna diferencia pasa de 544 m, muy por debajo de 2^26.
  - Los cuadrados de `distanciaAlCuadrado` quedan por debajo de 2^53.
  - En el cable son ±27.200 cm, frente a un tope de 51.200.

**Por qué 540 m y no 564.** El juicio sumaba el ancho de las avenidas encima de la rejilla. Aquí la avenida se come 6 m de cada manzana vecina, como en «distritos», y los ejes siguen en 24 + 48k. Así:
- las celdas de 48 m del cliente (§5.7) caen justo sobre las manzanas;
- el anillo hasta 828 m de la fase 2 son tres filas más por lado, con las mismas cuentas.

### 2.2 Los cinco distritos

Un molinete en la rejilla de 3-5-3 manzanas. El Casco ocupa las 5 × 5 del centro; cada distrito de fuera, una franja de 3 × 8 que incluye su esquina. Las líneas ±120 separan unos de otros.

```
            x →   −5 −4 −3 −2 −1  0 +1 +2 +3 +4 +5
   z  −5          O  O  O  N  N  N  N  N  N  N  N       N · Las Naves
   ↓  −4          O  O  O  N  N  N  N  N  N  N  N       E · Las Torres
      −3          O  O  O  N  N  N  N  N  N  N  N       S · El Ensanche
          ═══════════════ Avenida del Elevado (z = −120) ══════════════
      −2          O  O  O  C  C  C  C  C ║ E  E  E       O · La Lonja
      −1          O  O  O  C  C  C  C  C ║ E  E  E       C · El Casco
       0          O  O  O  C  C  G  C  C ║ E  E  E       G · Glorieta del Relojero
      +1          O  O  O  C  C  C  C  C ║ E  E  E
      +2          O  O  O  C  C  C  C  C ║ E  E  E
      +3          S  S  S  S  S  S  S  S ║ E  E  E
      +4          S  S  S  S  S  S  S  S ║ E  E  E
      +5          S  S  S  S  S  S  S  S ║ E  E  E
                                 Bulevar (x = +120)
```

| Distrito | Huecos | Carácter | Plantas | Callejones | Soportales | Durmientes por manzana | Luz | Qué le pide al jugador |
|---|---|---|---|---|---|---|---|---|
| **El Casco** (C) | 25 | Piedra y revoco, calles quebradas por pasajes | 3-6 | 1 de cada 3 manzanas | 10 % de las fachadas | 7 | Sodio cálido; farolas de pared | Esquinas y pasajes: pelea corta y emboscadas por la espalda |
| **El Ensanche** (S) | 24 | Ladrillo, balcones, tiendas | 5-9 | 1 de cada 8 | 20 % | 6 | Sodio y neón magenta | Calles largas con coches para estampar |
| **La Lonja** (O) | 24 | Naves de mercado con persiana, toldos, quioscos | 3-5 | 1 de cada 4 | 25 % | 6 | Bombilla cálida | Pilares y soportales: cobertura y flanqueo |
| **Las Naves** (N) | 24 | Naves de 1-2 plantas (7-9 m), vallas de solar, contenedores | — | 1 de cada 4, anchos | — | 2 | Sodio escaso y balizas rojas | Contornos que se pierden; gente escasa, así que los Prestados se imprimen más |
| **Las Torres** (E) | 24 | Vidrio, bloques altos, plazas duras | 12-30 | — | — | 4 | LED frío y pantallas | Espacio abierto: territorio de tiradores |

- Ninguna luz de distrito va en ámbar saturado: el ámbar es del jugador (§1 de EL-QUIEBRO).
- En total hay unos **630 durmientes**:

  | Distrito | Cuenta | Durmientes |
  |---|---|---|
  | Casco | 23 × 7 | 161 |
  | Ensanche | 23 × 6 | 138 |
  | Lonja | 23 × 6 | 138 |
  | Naves | 23 × 2 | 46 |
  | Torres | 23 × 4 | 92 |
  | Plazas | 6 × 10 | 60 |

### 2.3 Las plazas y sus plantillas

Una plaza es un hueco sin edificar de 36 × 36 m más sus cuatro calles, como la glorieta de hoy.
- Hay seis por ciudad: la Glorieta del Relojero (0, 0) y la Plaza Mayor en el Casco, y una más en cada distrito de fuera.
- Cada una está a 3-4 manzanas de las demás.
- Ninguna va junto a una avenida, porque ahí el hueco sólo mide 30 m.

**Qué es una plantilla.** Son datos, en `quiebro-plantillas.ts`, y se comprueba en sus ocho giros. Lleva:
- las cajas, relativas a la plaza, con su tipo, alto y frente, y si son despejables;
- 8 zonas de impresión y 8 bocas, como la glorieta de hoy;
- la zona del Fallo;
- 6 sitios de nacer;
- su subgrafo, sólo por los ejes;
- el objeto que falla, para la Lectura (§3.3).

| Plantilla (v1) | Qué lleva | Cajas | Dónde, en la v1 |
|---|---|---|---|
| **Glorieta** (la de hoy, sacada de `levantarLaGlorieta`) | Quiosco, fuente, 2-3 coches, bancos y farolas. Pierde los pilares del tren: el tren pasa ahora por el Elevado | ≈ 24 | Glorieta del Relojero, Glorieta del Ensanche, Plaza de las Torres |
| **Porticada** | Soportal perimetral de 3 m con un pilar cada 6 m, estatua y 4 bancos | ≈ 34 | Plaza Mayor (Casco), Plaza de la Lonja |
| **Patio de carga** | 10 contenedores de 6 × 2,5 m, 2 carretillas y un muelle bajo | ≈ 18 | Patio de las Naves |

La fase 2 trae más plantillas: Ajardinada, Plazuela, Plaza dura, Mercado cubierto (con techo, y la lluvia cortada debajo) y Bajo las vías.

### 2.4 Lo pisable y lo que estorba

**Se pisa todo lo que no es caja:** calles, aceras, callejones, soportales, plazas, la acera bajo el viaducto y la mediana del Bulevar entre los troncos.

**Es caja** (AABB de clase `alta`, en cuartos de metro):
- **Edificios**: una caja por manzana maciza, y dos si la parte un callejón. Si tiene soportal, la caja va retranqueada 3 m en esa cara.
- **Pilares de soportal**, uno cada 6 m (hoy, cada 4).
- **Farolas de pie**, sólo en avenidas, en las calles mayores (los ejes ±120) y en plazas. En el resto van de pared, sin caja.
- **Mobiliario y coches**: coches aparcados, quioscos, bancos y fuentes de plaza.
- **Pilares y troncos**: los del Elevado y los del Bulevar.
- **Lo demás**: contenedores, cabinas, cortes de obra y el cerco.

**La acera por bandas de hoy se conserva entera.** Garantiza, sin sortear nada, que ninguna caja pisa a otra y que los durmientes nunca chocan.

**Callejones:** pasajes de 6 m que parten una manzana en 15 + 6 + 15. No tienen acera y llevan una línea de grafo por el centro.
- Reparto: 1 de cada 3 manzanas en el Casco (≈ 8), 1 de cada 4 en la Lonja y en las Naves (≈ 6 + 6) y 1 de cada 8 en el Ensanche (≈ 3). Unos 23 en total.
- Son de 6 m y no de 4-5 por dos razones:
  - la cámara va 3,2 m detrás y 1,7 m arriba sin atravesar paredes, y necesita el sitio;
  - con 11 NPC cuerpo a cuerpo, un pasaje de 4 m es un embudo que no se lee.

**La casilla del suelo es de 8 m:** 69 × 69 = 4.761 casillas, todas pisables.
- **Por qué basta:** todo es suelo y lo que estorba son cajas. La casilla sólo dice «aquí hay suelo»: `unPaso` y `seAndaEnRecta` no dependen de su lado, que sólo miran `arenaDe` y el validador.
- **Lo que costarían otros lados:**
  - con 2 m serían 74.529 casillas y unos 40 ms sólo para comprobarlas;
  - con 4 m, 18.769 casillas y unos 10 ms (medido: 11,4 ms con 20.449).
- **Cambio de contrato:** ARQUITECTURA §3.2 fija hoy la casilla en 2 m y hay que cambiarlo allí (§6.6).

### 2.5 El borde honrado

El error de hoy es ver calles formadas que no se pueden andar, así que el borde no puede ser eso:
- **Las calles de fuera** (los ejes ±264) se andan. Al otro lado, a ±270, hay una fila continua de fachadas. Es el cerco, que es estructura: se estampa contra él.
- **Ninguna calle perpendicular sigue hacia fuera**: todas acaban en T.
- **Sólo tres cosas cruzan el borde:** el Elevado por sus dos cantos y el Bulevar por el sur.
  - Allí la avenida sigue 20 m y se deshace en **alambre de glifos**, la misma Grafía de la Bajada.
  - Al final hay una pared que tiembla como el borde del Bis: es la ciudad que el Sistema no ha escrito.
  - La caja del cerco sigue ahí.
- **Detrás**, el anillo de hoy (las torres de 60-180 m y la ciudad lejana) se ve en la niebla, sin calles a la vista.
- **En la fase 2** esos bordes se escriben: tres filas más por lado, hasta 828 m, y las salidas pasan a ser calles.

### 2.6 Qué es de la mesa, qué del código y qué de la noche

| Capa | Qué lleva | De qué sale | Cuánto dura |
|---|---|---|---|
| **Traza** | Distritos, plazas con su plantilla, avenidas, callejones, soportales, cabinas candidatas, refugios, grafo base y red de aceras | `vista.traza` (0-31), que elige el reductor al empezar con el azar del contexto | Una por mesa: la misma ciudad las 10 noches |
| **Edificios** | Alturas, fachadas, rótulos y neones | El código, con un chorro por manzana (`CÓDIGO#m<i>`) | Una por mesa |
| **La noche** (su vestido) | Coches, quioscos, 4-6 cortes de obra, tiempo, hora, semáforos, tren, rondas y parpadeos | (código, noche), con un chorro por aspecto | Cada noche |
| **Los Fallos** | La plaza de la Bajada, los 3 Fallos y las 2 plazas de propina | El reductor, en la Bajada, con el azar del contexto, entre los tríos válidos de la traza. Van en la vista | Cada noche |
| **Estado** | Los Fallos resueltos y el punto de control | Los `arcade:ronda`, que traen su zona | Cada tramo |

**Por qué la traza es un número de la vista y no sale del código.** El reductor no conoce el código, y tanto el retablo (`tableroDelQuiebro`) como la elección de los Fallos necesitan saber qué ciudad es. Con `traza` en la vista, el reductor, el productor y el cliente la leen igual. Además, la decisión 2 de Miguel (§7) se queda en una línea: volver a sortear la traza en «Otra noche».

**Las 32 trazas.** Son 4 dibujadas a mano × las 8 simetrías del cuadrado.
- **Qué se dibuja** (son datos): qué hueco es cada plaza y con qué plantilla, dónde van los callejones y los soportales, y dónde las cabinas y los refugios.
- **Las simetrías**: la Glorieta queda en el centro con cualquiera de las ocho.
- **Por qué dibujadas y no generadas**:
  - el Casco, con sus callejones y su Plaza Mayor, se diseña como se diseña una plaza;
  - un conjunto finito se comprueba **entero**, no por muestreo (§6.4).
- **Las distancias entre plazas**: no cambian con la simetría. Por eso su tabla (6 × 6 por traza dibujada) es un dato, que el comprobador contrasta con el grafo.

**Los cortes de obra**:
- van en tramos que no dan a una plaza;
- el comprobador exige que la ciudad siga conexa y que dos Fallos de la noche no queden a más de 260 m por calles;
- las cuadrillas de durmientes cuya vuelta pasa por un corte no salen esa noche (§5.8).

### 2.7 Orientarse

- **Hitos que asoman sobre los tejados:**
  - la torre del reloj de la Glorieta: 36 m, con la esfera iluminada a la hora de la noche;
  - el Elevado, con su franja de luz;
  - las Torres, de 60 a 180 m;
  - la chimenea de las Naves: 45 m, con baliza roja;
  - la cúpula de la Lonja.
- **Por encima de los tejados:**
  - las columnas de los Fallos, en verde-cian y temblando: es el Sistema que falla;
  - el haz de la cabina, en ámbar, porque es del jugador.
- **Rótulos:** hay rótulo de calle en cada esquina, con nombres inventados en `quiebro-nombres.ts`. El de la Bajada dice «Plaza · Distrito · 3:12».
- **HUD:** minimapa, plano, brújula con metros por calles e hilo de rumbo (§5.9).

### 2.8 Los números del mundo

| Cajas | Cuántas |
|---|---|
| Edificios (una por manzana, dos con callejón) | ≈ 135 |
| Pilares de soportal (cada 6 m) | ≈ 300 |
| Farolas de pie (avenidas, calles mayores, plazas) | ≈ 180 |
| Coches aparcados | ≈ 290 |
| Quioscos | ≈ 60 |
| Plazas (3 glorietas × 24, 2 porticadas × 34, 1 patio × 18) | ≈ 160 |
| Pilares del Elevado, troncos y bancos del Bulevar | ≈ 80 |
| Cerco y bordes | ≈ 60 |
| Cabinas, refugios y postes | ≈ 30 |
| Cortes de obra de la noche | 4-6 |
| **Total** | **≈ 1.300** (hoy 235; tope del comprobador 2.400; tope de la Liza 4.096) |

- **Zonas: ≈ 150 de 255.**
  - Por plaza, 1 de Fallo, 8 de impresión y 8 bocas: 17 × 6 = 102.
  - 20 cabinas candidatas (4 por distrito) y 10 refugios (2 por distrito).
  - 16 arcas, en la entrega 3.
  - Las emboscadas, los refuerzos y los rezagados salen de NUDOS del grafo, no de zonas. Así el tope de 255 ids no se toca.
- **Límites:** `ciudad` (id 1) y `plaza-1` a `plaza-6` (ids 2 a 7). Desaparecen `glorieta48`, `glorieta60` y `barrio`.
- **Sitios de nacer:** 6 de asiento por plaza (36) y 3 de reaparición por refugio (30).
- **Grafo: ≈ 3.500 nudos y 5.000 aristas** (hoy, 404 y 688), todas por los ejes.
  - Hay una línea por el centro de cada calzada (dos en las avenidas), con un nudo cada 6 m, y otra por cada callejón. A ellas se suman el subgrafo de cada plaza y los cruces delante, como hoy.
  - Topes del comprobador: 4.500 nudos y 6.500 aristas.
- **Casillas:** 4.761, de 8 m.
- **Durmientes:** unos 630, en unas 320 cuadrillas.

---

## 3. La noche

### 3.1 Fases y nombres

| Fase en la mesa | Nombre en pantalla | Límite | Modo de la sala |
|---|---|---|---|
| `bajada(n)` | La Bajada | la plaza de la Bajada (60 × 60) | calma |
| `oleada(n, 1…3)` | Tramo 1 · 2 · 3 | la ciudad | encuentro |
| `pausa(n, k)` | Tregua | la ciudad | calma |
| `oleada(n, 4…5)` | Propina | la ciudad | encuentro |
| `llamada(n)` | La Llamada | la ciudad | encuentro |
| `recuento(n)` | Amanecer | — | quieta |

El flujo de una noche: Bajada → **Tramo 1** (el Fallo de la plaza) → Tregua → **Tramo 2** → Tregua → **Tramo 3** → Tregua con voto → hasta 2 Propinas → Bis → **La Llamada** → Amanecer y recuento.

### 3.2 La Bajada (6-15 s, la preparación de hoy)

- **La plaza:**
  - la noche 1 de cada mesa baja a la Glorieta del Relojero, así que el §2.1 sale igual para quien estrena el aparato;
  - las demás noches, a una de las seis, sorteada por el reductor y distinta de la de la noche anterior.
- **Desde lo alto**, mientras la ciudad se escribe en glifos, se ven las tres columnas de los Fallos con sus metros.
- **Límite:** la plaza, de 60 × 60 m.

### 3.3 Los Fallos: la espina de la noche

**Qué es un Fallo.** Una plaza donde el Sistema se equivoca y hay que cerrarlo: la fuente mana hacia arriba, el reloj va hacia atrás, la gente repite. Hay tres por noche:
- **F1** es la plaza de la Bajada.
- **F2 y F3** están en otros dos distritos, distintos entre sí y del de F1, a 120-220 m por calles de F1 y entre ellos.
- **El orden es libre.** Al acabar el Tramo 1 quedan marcados los dos, y el primero que se abre es el del Tramo 2. Es la primera decisión de ruta de la noche.
- **Quién los elige:** el reductor, en la Bajada, entre los tríos válidos de la traza (con la tabla de distancias del §2.6). En la vista van `noche.bajada` y `noche.fallos`.

**Tramo 1.** Es la oleada 1 de hoy, byte a byte:
- los grupos salen por tic desde el principio (tabla §4.10);
- el tramo acaba cuando el grupo se vacía, con un reloj de 150 s;
- lo único distinto es que el límite ya es la ciudad.

**Tramos 2 y 3.**
- **Se abre** cuando hay ⌈n/2⌉ desvelados con cuerpo a 30 m o menos del centro del Fallo, o 1 en solitario. `n` son los presentes al empezar el tramo.
- **Al abrirse** hay 3 s de Bis en la plaza, el del §8: la lluvia se para, la gente repite y las farolas parpadean. Después estalla la receta de la oleada k de la tabla §4.10, por las bocas y las zonas de impresión de esa plaza.
- **Formas de cierre.** En la entrega 2 se cierra cuando se vacía su grupo. Desde la entrega 3 el reductor sortea una forma para cada Fallo:
  - **Estallido:** es la de la entrega 2, vaciar.
  - **Lectura:** mantener USAR («Leer») a 1,5 m o menos del objeto que falla.
    - Hacen falta 240 tics-lector: 12 s con uno solo y 6 s si leen dos, que es la capacidad.
    - Un golpe corta la lectura, pero no borra lo leído.
    - Los Prestados siguen saliendo hasta que acaba, y lo que quede vivo se disuelve a los 3 s.
  - **Custodio:** un Celador de vida 140, con guardia y sin Trasvase.
    - Si nadie lo desaloja, se reimprime en el Fallo a los 2 s con 70.
    - Desalojarlo cierra el Fallo y suelta 6 esquirlas.
    - Lo demás se disuelve a los 3 s.
- **Al cerrarse:**
  - se manda un `arcade:ronda` «ganada» con la zona del Fallo;
  - +150 puntos a quien esté a 30 m o menos;
  - +30 de aguante, como hoy al cerrar una oleada;
  - el punto de control pasa a esa plaza.
- **Si vence el reloj:** la ronda queda «aguantada», sin bonificación. Si el Fallo llegó a abrirse, se pierde; si no, sigue pendiente para el tramo siguiente.
- **Relojes:** en la tabla del §3.9.

### 3.4 Entre Fallos

**Emboscadas.**
- **Cuándo:** el racimo principal (§4) lleva 20 s sin combate, contados desde el principio del tramo o desde su último combate, y está a más de 60 m del Fallo pendiente más cercano. En N2-N5 la espera baja a 19, 18, 17 y 16 s.
  - «Sin combate» quiere decir: ninguna entidad a 15 m y ningún golpe dado ni recibido.
  - **Por qué 20 s y no los 30 del juicio.** En la Tregua ya se anda: 15 s al trote son 75 m. Con 30 s, la mayoría de los viajes de 120-220 m llegaban al Fallo sin un solo contacto.
- **Dónde:**
  1. En un nudo a 20-35 m del centro del racimo, dentro de ±60° de su rumbo y fuera de la línea de vista de todos los desvelados. El rumbo es el de los últimos 2 s; si el racimo está quieto, hacia el Fallo más cercano por calles.
  2. Si no hay ninguno, a 35-50 m.
  3. Si tampoco, en cualquier dirección.
  Entre dos candidatos iguales gana el de índice menor.
- **Aviso:** 3 s de Bis en ese sitio antes de que salgan. Se ve venir, como un anillo.
- **Quién sale:** 2 + n Prestados.
  - Desde el Tramo 3, además ⌈n/3⌉ Celadores.
  - Desde el Tramo 3 y con n ≥ 3, además un tirador.
  - La receta de la noche decide cómo entran: en la Pinza, mitad por delante y mitad por detrás; en la Emboscada, por la espalda; en el Francotirador, el tirador en el nudo más lejano que tenga vista…
- **Tope:** 2 por tramo (3 en propina). Cuentan en los vivos del tramo.

**Rondas** (entrega 3).
- **Cuántas:** 3 + ⌈n/2⌉ por tramo desde el Tramo 2. Cada una recorre un circuito de 4-8 cruces (una o dos manzanas), sorteado por (código, noche, tramo) en los distritos que hay entre los Fallos pendientes.
- **Cómo andan:** a 1,4 m/s, cada una con su desfase. Su sitio es una función pura del tic (`sitioDeLaRonda`), como el de los durmientes: lejos no cuestan nada y todos los aparatos las pintan en el mismo sitio.
- **Quién va:**
  - en el Tramo 2, 2 Prestados (3 con n ≥ 3);
  - desde el Tramo 3, un Celador y 1-2 Prestados;
  - desde N3, una ronda de cada tres lleva un tirador en lugar de un Prestado.
- **Cuándo se vuelven entidades:** cuando un desvelado con cuerpo pasa a 60 m o menos de alguno de sus miembros, con 2 rondas así a la vez como mucho. Nacen en su sitio del guion y siguen su circuito, así que el paso no se ve.
- **Cómo detectan:** te ven a 20-24 m según el nivel, en ±60° y con línea de vista. Te oyen a 6 m, y a 12 si vas a la carrera.
- **Si te ven:** silbato, y a los 2 s llegan 2 Prestados de refuerzo desde nudos a 20-35 m sin vista. Desde ahí se pelea como siempre.
- **Si no te han visto: madrugón.**
  - El primer golpe a un miembro desprevenido hace ×2: un Prestado cae de una sola Entrada.
  - Da +40 puntos.
  - Si la ronda entera cae en 2 s desde el madrugón, no hay silbato.
- **Una ronda derrotada** no vuelve en ese tramo. Sus Celadores sueltan 1 esquirla (los de un Fallo sueltan 3): la avaricia sigue estando en los Fallos.

**Olvido.**
- Una entidad que pasa 10 s sin ningún desvelado con cuerpo a 90 m se disuelve, sin esquirlas: el Prestado vuelve a ser durmiente y el Celador se deshace en glifos.
- Ninguna entidad toma turno contra un asiento a más de 45 m: es el **alcance de blanco**.

Con las dos reglas se puede huir de verdad por un callejón, los vivos se quedan donde está la gente y nadie cruza la ciudad persiguiendo a un rezagado.

### 3.5 La Tregua (15 s)

Es la pausa de hoy: retoque, +30 de aguante, vuelven los caídos y, desde la tercera, el voto.
- No hay entidades.
- **Se anda:** el grupo puede ir ya hacia el Fallo siguiente.
- El HUD enseña los Fallos pendientes con sus metros por calles.

### 3.6 Propinas

Hasta 2, votadas como hoy. Cada una es un Fallo:
- en una de las plazas que quedan, a 100 m o más del último;
- desde la entrega 3, siempre de Custodio;
- con la receta del nivel siguiente.

### 3.7 La Llamada

- **Aviso:** tras el voto, 3 s de Bis sobre el grupo.
- **Las cabinas:** suenan **dos a la vez**. La sala las elige entre las 20 candidatas por su distancia POR CALLES desde el centro del racimo principal:
  - la **cercana**, a 100-160 m, con 2 Prestados de cordón y, desde N3, el guardián Celador, como hoy;
  - la **lejana**, a 180-260 m, sin guardia y con +100 puntos para quien salga por ella.
- **Cuánto suenan:** 60 s, o 50 s en N4-N5. Al trote, la cercana son 20-32 s de carrera limpia y la lejana 36-52 s: la lejana es la apuesta del que corre.
- **Descolgar:** como hoy, 1,5 s y de uno en uno por cabina; un golpe lo corta. Con dos cabinas, cuatro jugadores se reparten de dos en dos.
- **Presión:** sale un Prestado cada 2 s, con un tope de vivos de 4/5/7/7/9/9. La mitad sale a 25-45 m por delante del racimo y la otra mitad a 15-30 m por detrás, siempre sin vista.
- **Si una calla** con gente aún fuera, se gasta una moneda y suena otra a 100-200 m durante 40 s.
- **Victoria:** salen ⌈n/2⌉, como hoy.

### 3.8 Amanecer, recuento y final

Como hoy, con la ciudad borrándose desde los bordes hacia dentro.
- El recuento añade los metros andados y los distritos pisados, y el título «El Andarín».
- Desde la entrega 3, el plano enseña la ruta de cada uno. Es adorno, sacado de las fotos que el aparato ya recibe.
- «Otra noche» trae la misma ciudad con otro vestido y otros Fallos; «Otra mesa», otra ciudad. El tope de 10 noches sigue.

### 3.9 Tabla por nivel

| | N1 Llovizna | N2 Chaparrón | N3 Aguacero | N4 Temporal | N5 Tormenta |
|---|---|---|---|---|---|
| Reloj del Tramo 1 | 150 s | 150 s | 150 s | 150 s | 150 s |
| Reloj de los Tramos 2-5 | 210 s | 210 s | 200 s | 190 s | 180 s |
| Emboscada tras calma | 20 s | 19 s | 18 s | 17 s | 16 s |
| Vista de las rondas | 20 m | 21 m | 22 m | 23 m | 24 m |
| La Llamada suena | 60 s | 60 s | 60 s | 50 s | 50 s |
| Guardián en la cabina cercana | — | — | sí | sí | sí |

Lo demás es la tabla §4.10 de hoy: ventana, anuncios, daño, monedas y Celadores de más.

**Memoria del Sistema.** «Plaza despejada» pasa a ser «Plazas despejadas»: las plazas de los Fallos de la noche salen sin sus cajas despejables. Las otras dos contramedidas no cambian.

### 3.10 Duración, mesa y un ejemplo

**Duración típica:**

| Tramo de la noche | Tiempo |
|---|---|
| Bajada | ≈ 10 s |
| Tramo 1 | ≈ 90 s |
| 2 × (Tregua de 15 s + Tramo de 120-170 s) | 270-370 s |
| Tregua con voto | 15 s |
| Bis | 3 s |
| La Llamada | ≈ 55 s |
| Recuento | 20 s |
| **Total** | **8-9,5 min** |

Con dos propinas, unos 14 min.

**Veredictos a la mesa:**
- 4 `arcade:ronda` (3 tramos y la Llamada), más 2 si hay propinas;
- los relojes de la Bajada y de las Treguas vencidas, 4 como mucho.

En total, 10 como mucho en la noche más larga: unos 0,7-0,9 por minuto, dentro de lo de hoy.

**Una noche** (entrega 2; n = 3, N2; la mesa K7M2P, noche 2):
1. **0:00 · Bajada** en el Patio de carga de las Naves. Desde lo alto se ven dos columnas verde-cian: la Plaza Mayor del Casco, a 150 m, y la Plaza de la Lonja, a 190 m. Entre ellas hay 170 m.
2. **0:10 · Tramo 1** en el Patio: la oleada 1, entre contenedores.
3. **1:35 · Tregua.** Eligen retoque y echan a andar hacia el Casco, por debajo del Elevado.
4. **1:50 · Tramo 2.** A los 20 s, bajo el viaducto, el Bis anuncia una emboscada de 5 Prestados por delante.
5. **2:45** · Dos de los tres llegan a 30 m de la Plaza Mayor y el Fallo se abre. Salen dos Celadores entre los pilares del soportal.
6. **4:10** · Fallo cerrado: +150 para los que estaban cerca, y el control pasa a la Plaza Mayor.
7. **4:25 · Tramo 3,** hacia la Lonja por un callejón del Casco, porque el camino corto tiene una obra.
8. **5:00** · Emboscada por la espalda en la calle mayor: es la receta de la noche.
9. **5:40** · Llegan a la Lonja. Hay un tirador en la boca alta.
10. **7:10 · Tregua** y voto: «Llamar ya».
11. **7:28 · Bis.** Suenan una cabina a 130 m, con 2 Prestados de cordón, y otra a 240 m, en las Torres.
12. **8:20** · Dos salen por la cercana; la tercera no llega a la lejana. Noche ganada, con 2 de 3.

### 3.11 Las arcas (entrega 3)

Son metas opcionales, para quien quiera desviarse del camino. En cada tramo desde el 2 se encienden 2 Buzones y 1 Caja, entre 16 sitios, a 30-80 m de desvío de la ruta entre Fallos. En la brújula y en el minimapa llevan una columna de glifos verde.

| | Buzón | Caja |
|---|---|---|
| Abrir (mantener USAR) | 1,0 s | 2,5 s |
| Suelta | 2 esquirlas | 5 esquirlas |
| Guardia | ninguna | un Celador de ronda a 12-20 m, que suelta 1 |

Un golpe corta la apertura. Lo que sueltan cae en un montón, con las reglas de hoy.

### 3.12 Lo que no entra: el Rastreo

El Rastreo de «ciudad-viva» (una atención del Sistema de 0 a 100 por corrillo) sólo entra en la fase 2, y sólo si falla el criterio de un contacto cada 35 s de travesía (§8) con las emboscadas y las rondas ya afinadas. Tiene diez sumas, cuatro umbrales y reglas de sombra: en un brawler de móvil es difícil de leer y de afinar.

---

## 4. Multijugador y dispersión

**El principio: separarse se puede, pero se paga.** El juego empuja a ir juntos sin atar a nadie.

- **Racimos.**
  - La sala los calcula cada 10 tics: dos asientos con cuerpo a 35 m o menos quedan unidos, en cadena, y se separan a más de 45 m (la diferencia es la histéresis).
  - Todo va en enteros y con distancias al cuadrado. Son 6 puntos, así que cuesta menos de 2 µs.
- **El racimo principal** es el que tiene más asientos con cuerpo; si empatan, el del asiento de número menor. Decide tres cosas:
  - el rumbo de las emboscadas;
  - desde dónde se miden las cabinas de la Llamada;
  - dónde se reaparece.
- **Un racimo secundario** de 2 o más tiene su propio temporizador de emboscada, con 2 racimos con temporizador como mucho. Su emboscada sale con max(3, ⌊(2 + n)·m/n⌋) Prestados, siendo `m` los miembros del racimo, y cuenta en el tope del tramo.
- **El rezagado** (sólo con n ≥ 2) es el asiento que lleva más de 10 s a más de 70 m de su compañero con cuerpo más cercano.
  - Le sale un Prestado cada 15 s desde un nudo a 18-30 m sin vista, con 2 vivos como mucho por rezagado.
  - Esos Prestados salen del tope del tramo.
- **El Fallo pide ⌈n/2⌉ a 30 m.** Uno que se adelanta no abre la pelea de todos. Siguen siendo de pareja:
  - la Lectura, con capacidad 2;
  - el rescate, a 1,5 m y en 1,5 s;
  - la guardia, que se rodea entrando por la espalda.
- **Caídos.**
  - Pasan 12 s en el suelo, como hoy. Los compañeros a 40 m o menos lo ven en la brújula con «Rescate» y sus metros.
  - Si nadie llega, se gasta una moneda y el caído reaparece a los 8 s en el refugio más cercano al centro del racimo principal (L6), con 60 de aguante y 2 s intocable.
  - Sin monedas, pasa a Vigía hasta la Tregua. El Vigía ve el plano entero y marca a los enemigos que haya a 60 m o menos de un compañero.
- **Reconectar.**
  - El asiento vuelve en el sitio de nacer más cercano al centro del racimo principal.
  - Tras un despliegue, la sala se rehace como hoy y el tramo empieza otra vez desde el punto de control: la plaza del último Fallo resuelto, o la de la Bajada. Como mucho se pierde un tramo, de 2 a 4 minutos.
- **Avisos:** «Aquí» marca un sitio (un nudo); «Voy» apunta a un Fallo o a una cabina y enseña el hilo de rumbo a todos. Siguen los de hoy.
- **La Llamada:** dos cabinas, cada una con su cola de uno en uno. Con 6 jugadores, 3 por cabina: 4,5 s.

| | n = 1 | n = 2 | n = 3 | n = 4 | n = 5 | n = 6 |
|---|---|---|---|---|---|---|
| Para abrir un Fallo (⌈n/2⌉) | 1 | 1 | 2 | 2 | 3 | 3 |
| Vivos del Fallo y de las emboscadas (§4.10) | 6 | 8 | 11 | 11 | 14 | 14 |
| Emboscada (Prestados, 2 + n) | 3 | 4 | 5 | 6 | 7 | 8 |
| Rondas por tramo desde el 2 (3 + ⌈n/2⌉) | 4 | 4 | 5 | 5 | 6 | 6 |
| Miembros por ronda | 2 | 2 | 3 | 3 | 3 | 3 |
| Rondas vivas a la vez | 2 | 2 | 2 | 2 | 2 | 2 |
| Tope de NPC (vivos + rondas vivas; aforo 20) | 10 | 12 | 17 | 17 | 20 | 20 |
| La Llamada (vivos) | 4 | 5 | 7 | 7 | 9 | 9 |
| Para ganar (⌈n/2⌉) | 1 | 1 | 2 | 2 | 3 | 3 |

Las tablas se leen con los presentes que dice la mesa, como hoy.

---

## 5. Técnica por capa

### 5.1 Traza, ciudad y barrio (`shared/arcade/juegos/`)

**Ficheros nuevos:**
- **`quiebro-trazas.ts`** (datos): las 4 trazas dibujadas y su tabla de distancias entre plazas, más `simetria(traza, s)`. Cada traza dice, hueco a hueco:
  - su distrito y su uso: edificio, plaza con su plantilla, o callejón N-S o E-O;
  - qué caras llevan soportal;
  - dónde van las cabinas candidatas (tramo, lado y posición) y los refugios.
- **`quiebro-plantillas.ts`** (datos): la Glorieta, sacada de `levantarLaGlorieta`, la Porticada y el Patio.
- **`quiebro-ciudad.ts`**:
  - `ciudadDeLaMesa(traza, codigo)`: la traza con su simetría, los edificios de cada manzana (un chorro por manzana), el grafo base, la red de aceras, las zonas y los sitios de nacer. Es pura y queda congelada; se guardan las 16 últimas por (traza, código).
  - `ciudadDeLaNoche(ciudad, codigo, noche, fallos)`: coches, quioscos, cortes, tiempo, hora, semáforos, tren y rondas, más el grafo de la noche, que es el base sin las aristas que cruzan un corte.
  - `mundoDeLaLizaDeLaCiudad(noche, despejadas)`: casilla de 8 m, una clase por caja, las zonas, los límites `ciudad` y `plaza-k`, el grafo en pares y los sitios de nacer.
  - `celdaDe(x, z)` y `cajasDeLaCelda(i, j)`, para el troceo del cliente.
  - `campoHasta(grafo, nudo)` y `distanciaPorCalles(grafo, campo, x, z)`: un Dijkstra con orden total. Lo usan la sala, el cliente y el comprobador, así que los metros que ven todos son los mismos.

**`quiebro-barrio.ts` se queda como el generador de manzanas y de calle.**
- **Conserva:** la acera por bandas, los soportales, los rótulos, los cuartos de metro, `despejar`, los semáforos y el tren.
- **Cambia:**
  - una sola caja por manzana maciza;
  - pilar de soportal cada 6 m;
  - farola de pie o de pared según la calle;
  - la glorieta pasa a ser una plantilla.
- **Desaparecen** `barrioDeLaNoche` y `mundoDelBarrio`, que sustituye `ciudadDeLaNoche`.
- **Compatibilidad durante la obra:** `escribirLosDurmientes` conserva su firma hasta que el cliente pase a la nueva (ola B), para no romper la multitud.

**Coste estimado.** Se escala desde lo medido hoy (0,15-0,46 ms en caliente y 1,9 ms en frío con 235 cajas):

| Pieza | Coste |
|---|---|
| Ciudad de la mesa | ≈ 3 ms |
| La noche | ≈ 2 ms |
| El mundo de la Liza | ≈ 1 ms |
| La arena | 0,4 ms (medida con 2.400 cajas) |

En el WebView de un Android N0 todo eso es del orden de 40 ms, una vez por noche, y lo tapa la Bajada.

**Riesgos:**
- **El orden de las cajas es contrato**, porque los estampados se cuentan por índice. El orden fijo es:
  1. el cerco;
  2. las manzanas, una a una en su orden;
  3. las plazas;
  4. las cabinas;
  5. los cortes.
- **El tope de 255 zonas** no se roza: lo que sale por sitios sueltos sale de nudos (§2.8).

### 5.2 Reglas, vista y retablo (`quiebro-reglas.ts`, `quiebro-vista.ts`, `quiebro.ts`, `quiebro-nombres.ts`)

- **Tablas nuevas:** `TRAMOS`, `FALLOS`, `EMBOSCADAS`, `RONDAS`, `REZAGADO`, `OLVIDO`, `RACIMOS`, `LLAMADA_EN_LA_CIUDAD` y `ARCAS`, con los números del §3 y el §4.
- **`limiteDeLaFase`:** en la Bajada, la `plaza-k` de la Bajada; en todo lo demás, `ciudad`. Deja de depender de `presentes`.
- **La vista gana unos 60 B:**
  - en la raíz, `traza`, de 0 a 31;
  - en la noche, `bajada`, `fallos` (5 plazas como mucho: 3 más 2 de propina), `formas` (desde la entrega 3), `resueltos` (cada plaza con su resultado) y `control`.
  - `noche.plantilla` ya no decide nada, porque cada plaza trae la suya. Se retira junto con su lector; lo decide el frente de reglas.
- **El reductor:**
  - elige la traza al empezar;
  - elige la Bajada y los Fallos al entrar en la Bajada, con `azar` y entre los tríos válidos;
  - lee la `zona` de cada `arcade:ronda` para marcar el Fallo resuelto y mover el control;
  - da los +30 de aguante igual que hoy.
- **El retablo** (el respaldo honrado) dibuja:
  - los 5 distritos, como caras;
  - las 6 plazas, como caras con rótulo;
  - las 2 avenidas y las calles mayores, como líneas;
  - los Fallos, destacados y con su estado;
  - el marcador, en paneles.
  Ocupa 4 kB como mucho, y el comprobador lo mide.
- **Nombres nuevos:** Tramo, Tregua, Fallo, Lectura, Custodio, Emboscada, Ronda, Madrugón, Andarín, los distritos, las plazas y las calles. Todos pasan por `verify:procedencia`.

### 5.3 El productor (`quiebro-liza.ts`)

- **El mundo:** `mundoDe(traza, codigo, noche, despejadas)`, con memoria de los 16 últimos usados (hoy guarda 4 y tira el más viejo).
  - La clave no lleva el punto de control, así que el mundo es el mismo toda la noche y la sala lo valida y hace su arena una sola vez.
  - `tomarLaVista` ya sólo rehace la arena si cambia la identidad del mundo (`sala.ts:417`).
- **La fase:** `puntoDeControl` es el centro de la plaza `noche.control` (L6).
- **Tramo 1:** `encuentroDeLaOleada` tal cual.
- **Tramos 2 a 5:**
  - un grupo por Fallo pendiente, con disparo `entrar` en su zona y del conjunto 1: el primero que se abre anula a los demás;
  - los grupos de emboscada, con disparo `calma` y elección `nudo`;
  - los del rezagado;
  - desde la entrega 3, las rondas.
  - El fin es `objetivo`, sobre el conjunto 1.
- **La Llamada:** una zona de acción con `activasALaVez` 2 y dos bandas de distancia. El guardián es un grupo con elección `zonaDeAccion` y banda 0.
- **Clases de entidad:** se añaden `custodio` (4) y el Celador y el tirador de ronda (5 y 6), que sueltan 1 esquirla. El aforo sigue en 20.

### 5.4 La Liza por dentro: índices que no cambian ni un resultado

Medido en PC con Node 20 (director: `medir.mts`; juez: `validar.mts` y `aristas.mts`), sobre una ciudad sintética de 564 m con 2.400 cajas, 3.048 nudos y 3.168 aristas:

| Qué | Hoy | Con el arreglo | ¿Da lo mismo? |
|---|---|---|---|
| `primeraLosa` con tramos de 12, 30 y 60 m | 8,0 / 8,2 / 8,5 µs (recorre todas las cajas) | 0,5 / 0,8 / 1,5 µs con celdas de 16 m, en una versión sin afinar | Sí: 0 diferencias en 300.000 tramos |
| Aristas repetidas en el validador | 5,6 ms (`indexOf`; con 4.896 aristas, 13,4 ms) | 0,46 ms (`Set`) | Sí |
| Chequeo canónico del mundo | 17,8 ms (de ellos, 11,4 ms las casillas de 4 m) | una vez por noche, y tipado | Sí |
| `problemasDeLaDeclaracion` entera | hoy, 5,6-6,9 ms (4,0 ms son el canónico del mundo); con la ciudad, 25-30 ms | ≤ 2 ms por voto; ≤ 10 ms una vez por noche | Sí |
| Distancias hasta el nudo meta | Dijkstra por todo el grafo en cada decisión | acotado a 160 m: visita 543 de 3.048 nudos | Sí, dentro de la cota |

**Qué se hace**, todo en `shared/mecanicas/liza/`:
1. **Validación.** `problemasDelMundo(mundo)` se separa y se guarda en un `WeakMap` por la identidad del mundo. El resto de la declaración se sigue validando en cada voto (hoy, ≈ 1,5 ms). Dentro del mundo:
   - un `Set` para las aristas;
   - para las tres listas grandes (casillas `{x, y}` enteras con sólo esas dos claves, cajas y nudos), un chequeo tipado en vez del recorrido genérico de `porQueNoEsCanonico`, que es lo más caro.

   Hoy se revalida entera en cada voto, fase o reanudación. Con la ciudad serían 65-75 ms síncronos en Render: más que el tic de 50 ms del temporizador único, así que cada voto de una mesa congelaría un tic de todas las salas.
2. **Índice de losas propio, en celdas de 16 m.** No se usan los cajones de `mundo.ts`: su lado es privado, y la cabecera de `primeraLosa` ya explica por qué no se ata a él.
   - Se juntan las cajas de las celdas que toca el rectángulo del tramo, sin repetir y en orden de índice, y se les pasa la misma prueba.
   - El resultado es el mismo por construcción, incluido el desempate por el índice menor.
3. **Índice de nudos, también en celdas de 16 m**, para `nudoVisibleMasCercano`. Se recorren anillos de celdas hasta que el anillo queda más lejos que el K-ésimo candidato: salen los mismos K, en el mismo orden (distancia e índice).
4. **Campos por meta.**
   - El Dijkstra de `distanciasHasta` se guarda por nudo meta, con 8 campos por sala, y se acota a 160 m.
   - Dentro de la cota, las distancias son las del Dijkstra entero, porque un camino que sale de la cota ya es más largo.
   - Fuera de la cota se usa el Dijkstra entero de hoy.
   - Así no hace falta A* ni una cota admisible, y no cambia ni un paso.
   - Un campo se rehace cuando cambia el nudo meta de un asiento, más o menos una vez por segundo al trote: unos 0,6 ms/s por sala llena.
5. **Reglas de siempre en `shared/`:**
   - todo en enteros y sin trigonometría;
   - ningún cierre sobre el `let` de un bucle, que Hermes 0.12 no liga por iteración;
   - ningún `sort()` sin comparador.

**Invariante que se comprueba:** el grafo va sólo por los ejes, sin diagonales. Ninguna plantilla puede meter una.

### 5.5 La Liza: declaraciones nuevas

Todas son genéricas. Cada una entra con un segundo uso con nombre y con su prueba en una liza de juguete abierta de 300 × 300 (en `liza-de-juguete.ts`), que no es El Quiebro.

| # | Declaración | Qué dice | Segundo uso | Entrega |
|---|---|---|---|---|
| L1 | `GrupoDeclarado.eleccion` `nudo` | {desde, hasta, sesgo `delante` \| `detras` \| `cualquiera`, sinVista}: emboscadas, refuerzos, rezagados y los Prestados de la Llamada | Hordas en cualquier liza abierta; guardias del Burgo | 2 |
| L2 | `GrupoDeclarado.disparo` | `tic` (el de hoy) \| `entrar` {zona, radio, mínimo por presentes, conjunto} \| `calma` {tics, lejosDeZonas} \| `rezagado` {metros, tics, cadaTics, vivas} | Un objetivo que se activa al llegar, en cualquier liza | 2 |
| L3 | `RondaDeclarada` y `rondas.ts` (nuevo) | {miembros, ruta en nudos, paso, desfaseTics, materializa, olvida, vista {radio, cono}, oído, oído a la carrera, refuerzo}, con `sitioDeLaRonda(ronda, grafo, tic)` puro y el modo `patrullar` del cerebro | Guardias del Burgo; animales de Las Lindes | 3 |
| L4 | `FinDelEncuentro` `objetivo` | {conjunto, como: `vaciar` \| `rematar` {clase} \| `leer` {radio, tics, capacidad, rompeConDano}} | Puertos y talleres de Boots on Board | 2 (vaciar); 3 (rematar y leer) |
| L5 | `ZonaDeAccionDeclarada.activasALaVez` y `bandas` | 1 a 3 zonas activas a la vez; cada banda {desde, hasta, puntos}, medida por calles desde el centro del racimo principal. `GrupoDeclarado.eleccion` `zonaDeAccion` con banda | Varios puertos a la vez | 2 |
| L6 | `FaseDeLaLiza.puntoDeControl` y `reaparicion.donde` | {x, z}, y `orden` \| `cercaDelGrupo`: quien nace (al empezar o al reconectar) y quien reaparece lo hace en el sitio de su papel más cercano al punto de control o al racimo principal | Cualquier cooperativo | 2 |
| L7 | `CargaDeRonda.zona` | 0 si no hay ninguna: con qué zona se cerró la ronda | Un objetivo cumplido en Boots on Board | 2 |
| L8 | `ClaseDeAviso.objetivo` `nudo` | El `objetivo` del cable es el índice de un nudo más 1. Cabe en el tope de 65.535, así que el cable no cambia de forma | Marcar un sitio en cualquier juego | 2 |
| L9 | `ClaseDeEntidad.desprevenida` | {factor, puntos} | El sigilo de cualquier liza | 3 |
| L10 | `CerebroDeclarado.alcanceDeBlanco` y `EncuentroDeclarado.olvido` | {metros} y {metros, tics} | Cualquier liza abierta | 1 |
| L11 | `EncuentroDeclarado.racimos` | {une, separa} | Cooperativos que se dispersan | 2 |
| L12 | `ZonaDeAccionDeclarada.efecto` `soltar` | {portable, cuantos}: las arcas | Cofres y talleres | 3 |

**El protocolo:**
- `nace` gana `ro`: el número de la ronda más 1, o 0 si no viene de una ronda.
- Dos sucesos nuevos:
  - `disparo {g, ro, x, z}`: salta un grupo. Es el Bis del Fallo, el de la emboscada o el silbato;
  - `progreso {zona, tics}`: la Lectura, a 2 Hz.
- La bienvenida añade los grupos ya disparados y las rondas consumidas.
- **La versión del protocolo:** mientras `matrix` no esté en main no hay nada desplegado, así que se ajustan los lectores sin subir `VERSION_DE_LA_LIZA`. Si `matrix` entra en main antes, sube a 2. No hace falta un APK nuevo: el WebView carga el paquete web del servidor.

### 5.6 El servidor (`server/src/liza/`)

**Coste por sala** (µs de PC; en Render, ×2,5):

| Concepto | Cálculo | Llena (6 asientos, 20 entidades) | Solitaria (1, 10) |
|---|---|---|---|
| Validar los `aqui` | 120/s × 3 µs | 0,36 ms/s | 0,06 |
| Entidades: paso y cerebro | 20 × 20 × 10 µs | 4,0 | 2,0 |
| Caminos: campos por meta | ≈ 8/s × 100 µs | 0,8 | 0,2 |
| Línea de vista, con índice | ≈ 350/s × 1,5 µs | 0,5 | 0,2 |
| Balas, con índice | 12 × 20 × 1,5 µs | 0,4 | 0,05 |
| Racimos, disparos y rondas | | 0,1 | 0,05 |
| Juicios y anuncios | | 0,2 | 0,05 |
| Foto | 10 × 50 µs | 0,5 | 0,15 |
| Envíos | ≈ 160/s × 6 µs | 1,0 | 0,15 |
| **Total en PC** | | **≈ 7,9 ms/s** | **≈ 2,9 ms/s** |
| **En Render** | | **≈ 20 ms/s (4 %)** | **≈ 7 ms/s (1,4 %)** |

- **Sin los índices**, una sala llena pasa de 25 ms/s en PC: la losa recorre todas las cajas (≈ 8 µs por prueba) y cada decisión lanza un Dijkstra entero. Los índices son condición, no mejora.
- **Coste declarado** en `lizas.ts`: base 400, porAsiento 250, porEntidad 300 y porBala 40.
  - Una sala llena declara 8.380 µs/s: caben 9 por proceso (hoy, 11).
  - Una solitaria, con el aforo fijo de 20, declara 7.130: caben 11 (hoy, 13).
  - Hay una palanca de plataforma, no de este juego: declarar el aforo por asientos al empezar. Una solitaria con aforo 10 declararía 4.130 y cabrían 19.
- **Memoria:**
  - ciudad de la mesa, ≈ 0,5 MB;
  - mundo de una noche, ≈ 1 MB; con los 16 guardados, ≈ 16 MB;
  - estado de una sala, ≈ 150 kB.
  Con 11 salas, unos 25 MB (hoy, unos 10).
- **Diagnóstico:** `sacarLaLiza` ya cronometra la validación y se la carga a su sala. El diagnóstico gana `validacionesDelMundo`, que se CUENTAN, no se cronometran: tiene que salir una por mesa y noche.
- **Temporizador:** uno solo, como hoy.
- **`medir:liza`:** gana el escenario «ciudad», con 6 robots dispersos y 20 entidades.

### 5.7 El cliente: ventana de celdas, LOD y niveles (`escritorio/src/quiebro/ciudad/`)

- **Nada nuevo viaja por el cable:** todo sale de la vista y del código.
- **Celdas de 48 m**, alineadas con las manzanas: una celda es un hueco más la mitad de sus calles.
- **Ventana cercana**, con todo el detalle de hoy:

  | Nivel | Ventana |
  |---|---|
  | N0 | 3 × 3 celdas |
  | N1 | 3 × 3, con relieve hasta 40 m |
  | N2 | 4 × 4 |
  | N3 | 5 × 5 |

  En N0-N1 mide lo mismo que el barrio de hoy, así que cuesta lo mismo.
- **Cómo se rehace:**
  - La ventana se recentra cuando el jugador se aleja 24 m de su centro.
  - Cada celda se construye una sola vez (2-4 ms) y se guarda, con 36 en memoria.
  - Se monta una malla por familia (fachadas, mobiliario, voladizos, emisivo, cristal, rótulos y suelo), con doble búfer.
  - El trabajo va en trozos de 3 ms como mucho por fotograma. Se mide CONTANDO los triángulos escritos (en N0, 12.000 por fotograma como mucho), no cronometrando.
  - A 7 m/s, cruzar media celda son 3,4 s, y rehacer 3-5 celdas son 5-10 fotogramas.
- **Detrás, la ciudad entera en LOD1:**
  - volúmenes sin relieve, con las ventanas del sombreador, en una llamada y unos 12.000 triángulos;
  - fundido con tramado desde el borde de la ventana;
  - el suelo entero en 2 llamadas;
  - fuera, `anillo.ts` anclado en ±272, con el borde de glifos (§2.5), que es de dirección de arte.
- **Luz horneada:** en losetas de 64 m, con una ventana de 256 m (512² en N0-N1 y 1024² en N2-N3). Se recentra cada 64 m y se hornea por losetas, en trozos.
- **Choques:** la arena es la ciudad entera (0,4 ms, 4.761 casillas), así que la predicción del paso no depende de la ventana.
- **Presupuesto**, con la cuota del 50 %. La columna de hoy es lo medido de lo que no son personajes, en el peor fotograma (§8 de EL-QUIEBRO):

| Nivel | Tope del juego | Cuota de la ciudad (50 %) | Estimado con la ventana | Hoy, medido |
|---|---|---|---|---|
| N0 | 150.000 tri / 60 llamadas | 75.000 / 30 | ≈ 55.000 / 27 | 38.000 / 25 |
| N1 | 250.000 / 90 | 125.000 / 45 | ≈ 110.000 / 28 | 91.000 / 23 |
| N2 | 600.000 / 150 | 300.000 / 75 | ≈ 230.000 / 30, más 12 de sombra | 176.000 / 23 |
| N3 | 1.500.000 / 250 | 750.000 / 125 | ≈ 400.000 / 32, más cascadas | 125.000 / 18 |

  Las llamadas no crecen con la ciudad: la ventana tiene el tamaño del barrio de hoy, y la LOD1, el suelo y el borde suman 4 llamadas.

- **Riesgos:**
  - **N0 va justo:** 27 llamadas de 30. Si no cabe, se funden más familias o la ventana baja a 2 × 2 en N0.
  - **Tirón al subir un búfer grande** en un Android modesto. La palanca es partir esa familia en dos, a costa de una llamada más.
  - **La cámara en los callejones:** ya no atraviesa paredes, y se comprueba en los 23 (§6.4).

### 5.8 Durmientes (`quiebro-durmientes.ts`)

- **Cuántos:** unos 630, en unas 320 cuadrillas, con la densidad de cada distrito (§2.2).
  - Cada cuadrilla da vuelta a SU manzana, o a dos cruzando por la cebra, así que la caja de su ruta se sabe sin escribir el guion.
  - `DURMIENTES = 48` deja de ser una constante: pasa a `durmientesDeLaCiudad(ciudad)`.
- **Guion perezoso por cuadrilla:** se escribe cuando hace falta (≈ 0,1 ms en frío) y se guarda. Da lo mismo quién lo pida y en qué orden: el comprobador los pide en orden aleatorio y compara con el orden natural.
- **`durmienteMasCercano(ciudad, tic, x, z, radio = 60 m)`:**
  - candidatas: las cuadrillas cuya caja de ruta queda a 60 m o menos del punto, buscadas en celdas de 48 m;
  - de ellas gana el durmiente más cercano, con desempate por el índice global;
  - sale igual en todos los aparatos;
  - si no hay nadie (las Naves de madrugada), el Prestado se imprime.
- **Obras:** las cuadrillas cuya vuelta pasa por un corte no salen esa noche.
- **Semáforos:** `MARGEN_DEL_VERDE` sube en las avenidas, que son 24 m que cruzar al paso más lento.
- **Qué se pinta:**
  - los 64 durmientes más cercanos a 90 m o menos (hoy se pintan 48);
  - siempre, todos los que están a 40 m o menos de un jugador, que son los candidatos a Prestado;
  - el rebaño de las rondas que aún no son entidades, por el mismo camino que los Prestados lejanos.

### 5.9 HUD (`escritorio/src/quiebro/hud/`)

- **Minimapa:** 112 pt, arriba a la izquierda bajo el menú, con el rumbo hacia arriba.
  - Es un lienzo 2D de 540² (1 px/m), dibujado una vez por noche (≈ 3-5 ms).
  - Se recorta y se gira a 10 Hz (≈ 0,2 ms), con 20 marcas como mucho.
- **Plano entero:**
  - se abre con el botón PLANO, de 44 pt, bajo AVISO, o con la tecla M;
  - es translúcido y no detiene el juego;
  - tocar un sitio manda «Aquí» (L8, el nudo más cercano); tocar un Fallo tiende el hilo de rumbo;
  - todo va en `pointerdown`, nunca en `onClick`, que en la app no llega.
- **Brújula:** además de lo de hoy, lleva:
  - los Fallos pendientes (verde-cian) y las cabinas (ámbar), con sus METROS POR CALLES;
  - los compañeros, con su color y sus metros.
  Los metros salen de un campo por objetivo (`campoHasta`, un Dijkstra entero de ≈ 0,3 ms), calculado una vez por tramo. Leerlo en cada fotograma es una suma, y da el mismo número que la sala: el comprobador los compara.
- **Hilo de rumbo:** glifos por el suelo, 60 m por delante siguiendo el campo, en una llamada instanciada de 400 triángulos como mucho. Con «Voy», lo ven los compañeros.
- **Vigía:** ve el plano entero y marca enemigos a 60 m o menos de un compañero.

### 5.10 Red

- **Subida:** igual que hoy.
- **Bajada por aparato, con la sala llena:**
  - foto: 26 tuplas × ≈ 22 B × 10 por segundo ≈ 5,7 kB/s;
  - sucesos: ≈ 1,2 kB/s.
  En total ≈ 7 kB/s (hoy, 5,4), unos 3,8 MB en una noche de 9 min.
- **Salida por sala:** ≈ 42 kB/s.
- **Mesa:** 10 veredictos por noche como mucho (§3.10).

### 5.11 Riesgos y cómo se miden

| # | Riesgo | Cómo se ve | Palanca |
|---|---|---|---|
| 1 | Perderse | Menos de 8 de cada 10 llegan al Fallo 2 sin preguntar | Hitos y columnas; el hilo de rumbo encendido solo en la primera noche del aparato |
| 2 | Travesía vacía | Más de 35 s de travesía sin un contacto | Bajar la espera de la emboscada; más rondas |
| 3 | La plaza vuelve: quedarse quieto | Menos de 700 m por jugador y noche, en robots y en gente | Los Fallos sólo se cierran allí; el reloj de tramo |
| 4 | CPU de la sala | `medir:liza` por encima de 9 ms/s en PC | Rondas vivas a 1; aforo de 16 |
| 5 | La validación en cada voto | El diagnóstico cuenta más de una validación del mundo por mesa y noche | Guardarla por identidad: es condición |
| 6 | Tirones del troceo en N0 | En el banco, un fotograma de más de 50 ms | Trozos más pequeños; ventana de 2 × 2 en N0 |
| 7 | Memoria del servidor | El diagnóstico | Guardar 8 mundos en vez de 16 |
| 8 | Noche larga | Mediana por encima de 10 min | Relojes de tramo; F2 y F3 a 120-180 m |
| 9 | Esquirlas infladas | Robots: más de 25 por noche con 3 jugadores | Rondas y emboscadas que sueltan menos |
| 10 | Chocar con la línea de los personajes | Conflictos en `personajes/`, `Quiebro.tsx` o `calidad/` | Worktree propio; de `personajes/`, sólo `multitud.ts` y `director.ts` |
| 11 | `tsx` carga dos veces los módulos de `shared/` | Un contador de memoria leído de la otra copia da cero, y parece un verde | Los comprobadores que cuentan memorias corren con `node` |
| 12 | Desbordar el Q16.16 | — | Las rutas van por los ejes, con enteros; las distancias, con `distanciaAlCuadrado`; los productos, con `por()` |

---

## 6. Plan de obra

### 6.0 Dónde se construye

- **Worktree propio.** La obra va en su propio worktree: rama `ciudad`, nacida de `matrix` en cuanto `matrix` guarde su estado de hoy en un commit. La casa ya no comparte directorio entre líneas, y en `matrix` trabaja ahora la línea de los personajes.
- **Al crearlo:**
  - `node_modules` se copia con robocopy, cuyo código 1 no es un fallo;
  - `core.autocrlf=false`, y se normaliza, porque el worktree sale con CRLF;
  - se le da su entrada en `.claude/launch.json`;
  - lleva sus propios puertos, por ejemplo 5294 para el servidor y 5295 para el escritorio. Un comprobador con puerto por defecto mide otro árbol, y hay que revisarlos.
- **Las reglas de ARQUITECTURA §8:**
  - ni stash, ni checkout, ni commits de los agentes;
  - cada frente toca sólo sus ficheros;
  - apuntes en la carpeta propia del scratchpad;
  - LF en todo;
  - `npm run verificar -- --rapido` durante el trabajo, y la batería entera sólo el coordinador, juzgada por el código de salida.
- **En todo encargo que toque `shared/`** van los seis guardianes: `verify:pureza`, `verify:fijo`, `verify:nucleo-quieto`, `verify:fronteras`, `verify:determinismo` y `verify:procedencia`.

### 6.1 Entregas

| Entrega | Qué trae | Qué contesta |
|---|---|---|
| **1 · La ciudad se pisa** | La Liza por dentro (§5.4), la ciudad de 540 m, el límite `ciudad` en todas las fases, el olvido y el alcance de blanco (L10), la ventana de celdas con la LOD1 y el borde, el minimapa y el plano. Las oleadas siguen en la plaza de la Bajada | La queja tal cual: toda la ciudad se recorre desde la Bajada |
| **2 · La noche viaja** | Los Fallos 2 y 3 fuera de la plaza, las emboscadas, la Tregua andando, la Llamada con 2 cabinas, los metros por calles, el hilo de rumbo, «Aquí» y «Voy», y robots que andan el grafo | Que recorrerla tenga sentido |
| **3 · La ciudad vive** | Las rondas y el madrugón, la Lectura y el Custodio, las arcas, la piel de los 5 distritos, las plantillas Porticada y Patio con su mobiliario, y el recuento con las rutas | Carácter y variedad |
| **Fase 2** | El anillo hasta 828 m (Estación, Parque, Mercado cubierto), más plantillas y el Bis estructural. El Rastreo, sólo si falla la medida de contactos | «Grande», si 540 m se queda corto |

### 6.2 Frentes y sus ficheros

Cada frente es dueño exclusivo de sus ficheros. Lo que necesite de fuera lo pide en su informe, y lo integra el coordinador.

| Frente | Ficheros (sólo éstos) | Tamaño |
|---|---|---|
| **Liza** (de «reglas y sala») | `shared/mecanicas/liza/{declaracion,protocolo,tipos-de-la-sala,geometria,paso-en-curso,cerebro,encuentros,cuerpo,sala,portables}.ts` y `rondas.ts` (nuevo); `server/scripts/{liza-de-juguete,verificar-liza,verificar-liza-protocolo,guion-determinismo,verificar-determinismo}.ts`; `docs/LA-LIZA.md` | Grande |
| **Traza** (nuevo; hoy nadie es dueño de estos ficheros) | `shared/arcade/juegos/{quiebro-ciudad,quiebro-trazas,quiebro-plantillas}.ts` (nuevos), `quiebro-barrio.ts`, `quiebro-durmientes.ts`; `server/scripts/verificar-quiebro-barrio.ts` | Grande |
| **Reglas del Quiebro** (de «reglas y sala») | `shared/arcade/juegos/{quiebro,quiebro-reglas,quiebro-vista,quiebro-liza,quiebro-nombres,lizas}.ts`; `server/scripts/{verificar-quiebro,robot-de-quiebro,verificar-robot-generico}.ts` | Mediano |
| **Servidor** (de «reglas y sala») | `server/src/liza/*`; `server/scripts/{verificar-sala-de-la-liza,medir-liza}.ts` | Pequeño |
| **Dirección de arte** | `escritorio/src/quiebro/{ciudad,atmosfera,efectos,calidad}/*` (con `ciudad/{celdas,ventana,lejos,borde}.ts` nuevos); `escritorio/scripts/verificar-quiebro-{ciudad,calidad,efectos}.ts` | Grande |
| **Cliente** | `escritorio/src/quiebro/{Quiebro.tsx,documento.tsx}`, `red/*`, `hud/*` (con `Minimapa.tsx`, `Plano.tsx` y `rumbo.ts` nuevos), `mandos/*`, `camara/Camara.tsx`, y de `personajes/` sólo `multitud.ts` y `director.ts`; `escritorio/scripts/verificar-quiebro-{juego,personajes}.ts` | Mediano |
| **Sonido** | `escritorio/src/quiebro/sonido/*`, `verificar-quiebro-sonido.ts` | Pequeño |
| **Integración** | `server/package.json`, `escritorio/package.json`, `scripts/verificar-todo.mjs` | Pequeño |
| **Coordinador** | La columna de la ola 0 (con Liza y Traza), `escritorio/src/quiebro/{contrato,cuerpos}.ts`, los documentos (`EL-QUIEBRO.md`, `ARQUITECTURA.md` y éste) y los commits | — |

### 6.3 El orden: qué va a la vez sin pisarse

**Ola 0 · Medir y fijar la columna (2 días).**
- **El coordinador, en el scratchpad:** un prototipo de traza con sólo cajas, grafo y zonas. Con él se mide:
  - la derivación, en Node y en el Chrome de un Android;
  - la validación;
  - `medir:liza` con una ciudad sintética;
  - la ventana de celdas en un N0.
- **La columna** son los contratos que los demás usan sin poder preguntarse:
  - en `quiebro-ciudad.ts`, los TIPOS (`CiudadDeLaMesa`, `NocheDeLaCiudad`, `PlazaDeLaCiudad`, `CeldaDeLaCiudad`) y las firmas, con un cuerpo que lanza;
  - en `declaracion.ts`, los tipos de L1-L12, todavía sin la sala;
  - en `protocolo.ts`, los sucesos nuevos con sus lectores.
  Se comprueba con `verify:liza-protocolo`, viendo rojas las formas rotas.
- **PUERTA** (no se sigue sin ella):
  - traza, noche y mundo en 8 ms o menos en Node caliente, y en 50 ms o menos en un Android N0;
  - validación del mundo en 10 ms o menos una vez por noche, y en 2 ms o menos por voto;
  - sala llena en 9 ms/s o menos en PC;
  - en N0, ningún fotograma de más de 50 ms cruzando la ciudad en diagonal a la carrera, y las llamadas constantes.

**Ola A · A la vez** (sobre la columna):

| Frente | Qué |
|---|---|
| Liza | Por dentro (§5.4): validación guardada y tipada, índices de losas y de nudos, campos por meta. Ficheros: `declaracion.ts` (sólo el validador), `geometria.ts`, `paso-en-curso.ts`, `cerebro.ts` |
| Traza | Las 4 trazas, las 3 plantillas, `quiebro-ciudad.ts`, el generador de manzanas, los durmientes, y el comprobador |
| Dirección de arte | La ventana de celdas, la LOD1, la luz por losetas, la cuota del 50 % y el borde, sobre un plano sintético con la forma de la columna |
| Cliente | El esqueleto del minimapa, el plano y el rumbo, sobre la columna |

**Ola B · Entrega 1:**

| Frente | Qué |
|---|---|
| Liza | L10 (alcance de blanco y olvido) |
| Reglas del Quiebro | El límite `ciudad`; el mundo de la ciudad en el productor, con sus 16 guardados; `traza` en la vista; el retablo nuevo; el coste en `lizas.ts` |
| Servidor | El diagnóstico (`validacionesDelMundo`) y el escenario «ciudad» de `medir:liza` |
| Dirección de arte | La ciudad montada en el juego |
| Cliente | `Quiebro.tsx`, `red/partida.ts` con el límite `ciudad`, `personajes/multitud.ts` con los durmientes cercanos, y el minimapa y el plano vivos |
| Integración | Cablear lo nuevo en la batería |

**Ola C · Entrega 2:**

| Frente | Qué |
|---|---|
| Liza | L1, L2, L4 (`vaciar`), L5, L6, L7, L8 y L11, y los sucesos `disparo` y `nace.ro` |
| Reglas del Quiebro | Tramos, Fallos (elegidos por el reductor, en la vista, cerrados por su zona), emboscadas, rezagado, la Llamada de 2 cabinas, los nombres, y `robot-de-quiebro` con robots que andan el grafo |
| Cliente | Los Fallos, las cabinas y los compañeros con metros por calles; el hilo de rumbo; «Aquí» y «Voy» |
| Dirección de arte | Las columnas de los Fallos y el Bis de la emboscada (`efectos/`) |
| Sonido | El timbre de la cabina audible a 260 m y el zumbido del Fallo |

**Ola D · Entrega 3:**

| Frente | Qué |
|---|---|
| Liza | L3, L9, L4 (`rematar` y `leer`), L12 y `progreso` |
| Reglas del Quiebro | Rondas, Lectura, Custodio y arcas |
| Dirección de arte | La piel de los 5 distritos, y la Porticada y el Patio con su mobiliario |
| Cliente | El rebaño de las rondas, el Custodio y el recuento con las rutas |
| Sonido | El silbato y un fondo por distrito |

**Lo que se sabe que se cruza:**
- Dentro del frente de la Liza, `cerebro.ts` y `declaracion.ts` cambian en varias olas, siempre en orden y nunca a la vez.
- Traza y Cliente se cruzan en los durmientes. `escribirLosDurmientes` conserva su firma hasta que `multitud.ts` pase a la nueva, en la ola B.
- El orden de fusión con la línea de los personajes lo decide el coordinador. Después de cada fusión se pasan los `typecheck`: una fusión limpia puede no compilar.

### 6.4 Los comprobadores, vistos en rojo

Cada comprobación nueva se ve en ROJO a propósito antes de darla por buena: se rompe en una copia, se corre y se restaura, comprobando con `cmp` que todo queda como estaba.

| Comprobador | Qué comprueba de nuevo | Qué se rompe para verlo rojo |
|---|---|---|
| `verify:liza-protocolo` | L1-L12 y los sucesos nuevos: las formas buenas pasan, las rotas no, y todo cabe en sus tamaños máximos | Quitar una clave de `disparo`; un `ro` fuera de rango |
| `verify:liza` | Índice contra fuerza bruta: 100.000 tramos × 20 mundos (índice de caja incluido), los K nudos en 10.000 puntos y la huella de pasos tic a tic. La validación con y sin memoria. Cada declaración nueva, en su liza de juguete | Un índice que pierde una celda; un campo acotado a 100 m sin la reserva; un disparo `entrar` que no mira el mínimo |
| `verify:quiebro-barrio` (pasa a comprobar la ciudad; se queda el nombre para no tocar la batería) | Las 32 trazas enteras, 10 noches cada una: · cajas: 2.400 o menos, ninguna pisa a otra, en cuartos de metro y dentro de ±272; · zonas: libres para una persona, con 255 ids como mucho; · grafo: sólo por los ejes, conexo, y cada arista andable con radio 0,35; · con los cortes, toda casilla libre se alcanza desde la Glorieta (rejilla de 1 m, sin bolsas); · tríos de Fallos dentro de su banda; · desde cada nudo, al menos una cabina en cada banda, con campos desde las cabinas y no desde los nudos; · durmientes: nunca dentro de una caja en 20.000 tics, y su densidad junto a las aceras; · guion en orden aleatorio igual al del orden natural; · la misma huella en Node y en Hermes; · los tiempos de la puerta | Una farola en la acera libre; un callejón cerrado; una diagonal en una plantilla; una plaza movida fuera de su banda; quitar cabinas candidatas |
| `verify:quiebro` | El reductor: · la traza; · Fallos elegidos entre los válidos; · resueltos y control por su `zona`; · +30 de aguante; · carga de 8 kB como mucho y retablo de 4 kB como mucho; · el mismo aforo en todas las fases; · `problemasDeLaDeclaracion = []` en todas | Un `arcade:ronda` con la zona de otro Fallo; un retablo con las 24 calles gruesas |
| `robot-de-quiebro` | Robots que ANDAN el grafo, 20 noches con 1, 3 y 6 jugadores: · cierran 3 Fallos y ganan la Llamada; · 700 m o más por jugador y noche; · un contacto cada 35 s o menos de travesía | Un robot que no anda y «gana»: tiene que salir rojo, para no repetir el bucle que dice jugar y no juega |
| `verify:determinismo` | La sala con la ciudad, en Node y en Hermes, rehecha y reanudando | Un cierre sobre el `let` de un bucle |
| `verify:sala-de-la-liza` | Robots WebSocket en la ciudad: · quien reconecta nace cerca del grupo; · una sola validación del mundo por noche, contada en el diagnóstico | Quitar la memoria de la validación |
| `verify:quiebro-ciudad` | 32 trazas × 25 cámaras × 4 niveles: · la ventana cabe en la cuota; · lo pintado que estorba coincide celda a celda con las cajas; · ningún trozo pasa de su tope de triángulos; · las llamadas no cambian al cruzar la ciudad | Una familia que no se funde: las llamadas crecen |
| `verify:quiebro-juego` | · El minimapa y el plano funcionan con punteros; · los metros por calles del cliente son los de la sala; · el límite es `ciudad` | Un `onClick` en el plano |
| `verify:quiebro-personajes` | El peor caso, con 20 NPC, 64 durmientes y 2 rondas en rebaño, cabe en su cuota. Además, **cablearlo**: en el árbol de trabajo del 24-sep no está en `escritorio/package.json` ni en la batería | — |
| Los seis guardianes de `shared/` | Pureza, coma fija, núcleo quieto, fronteras, determinismo y procedencia (con los nombres nuevos) | — |
| `medir:liza` (fuera de la batería) | 9 salas llenas o 11 solitarias en 200 ms/s de Render | — |

### 6.5 Jugar de verdad

Antes de dar por buena cada entrega:
- **Una mesa real:** robots por HTTP y un asiento en pantalla, con 1, 3 y 6 jugadores, jugando la noche entera.
- **En teléfono:** punteros sintéticos, porque `onClick` no llega en la app.
- **En el panel del navegador:** con la pestaña delante, porque el panel oculto congela las animaciones.
- **La lupa:** desde el rayo del ojo, no cenital, porque mirar desde arriba no es verse.
- **Banco:** en un Android N0 y en el iPhone.

### 6.6 Documentos que cambian (el coordinador, al integrar)

- **`docs/EL-QUIEBRO.md`:**

  | Sección | Qué cambia |
  |---|---|
  | §2.3 y §2.4 | La noche y la ciudad de la mesa |
  | §3 | «Cómo se juega con 6» ya no agranda la glorieta |
  | §4.10 | Sin la fila de la glorieta |
  | §4.11 | La Llamada |
  | §5 | Las fases con sus nombres |
  | §6.1 y §6.5 | La ciudad y «Plazas despejadas» |
  | §7 | El HUD |
  | §8 | Los durmientes y la cuota |
  | §10 | La vista |
  | §11 | L1-L12 |
  | §12 | Coste, memoria y derivación |
  | §13 | Fases de obra |
  | §15 | El glosario |

- **`docs/quiebro/ARQUITECTURA.md`:**
  - §1, el mapa con los ficheros nuevos;
  - §3.2, que pasa del barrio a la ciudad y a la casilla de 8 m;
  - §6, con el frente Traza.
- **`docs/LA-LIZA.md`:** §1, con las declaraciones nuevas, y §6, el estado.

---

## 7. Decisiones de Miguel

> **Decidido el 24-sep-2026.** Miguel eligió **540 m en la v1, con el anillo hasta 828 m en la fase 2**. Las demás las tomó el coordinador con el criterio que Miguel le delegó: la **misma ciudad** en las noches de una mesa, noches de **8-10 min** (hasta 14 con propinas), los **nombres** propuestos y el **borde de glifos**. El aforo por asientos es una palanca de la plataforma y queda fuera de esta obra.

1. **Tamaño.** 540 m en la v1, con el anillo hasta 828 m en la fase 2 (recomendado), o 828 m ya.
   - Con 828 m se anda más: de esquina a esquina son 1,6 km por calles.
   - Habría que dar arte propio a 9 distritos.
   - Y competiría por el mismo presupuesto con los personajes AAA.
2. **Misma ciudad en las 10 noches de una mesa** (recomendado: se aprende), o una ciudad nueva cada noche, que es lo que dice hoy EL-QUIEBRO. Cambiarlo es una línea: volver a sortear `traza` en «Otra noche».
3. **Duración de la noche:** 8-10 min (hoy 6-10), y hasta 14 con propinas.
4. **Aforo por asientos al empezar.** Es una palanca de la plataforma, no de este juego: dejaría caber 19 salas en solitario en vez de 11.
5. **Los nombres que se leen:** Tramo, Tregua, Fallo, Emboscada, Ronda, Madrugón, Lectura, Custodio, Andarín, y los cinco distritos (el Casco, el Ensanche, la Lonja, las Naves y las Torres).
6. **El borde:** el de glifos (§2.5), que es de la ficción y no enseña calles que no se pueden andar, o uno físico, como una ronda con tráfico.

**Decisiones técnicas que toma este documento** (y que pasan a ARQUITECTURA):
- la casilla de 8 m;
- la rejilla estricta de 48 m;
- las trazas dibujadas y comprobadas enteras;
- la traza y los Fallos guardados en la vista;
- la validación del mundo guardada por identidad y tipada;
- los índices propios de la Liza;
- campos acotados con el Dijkstra de hoy como reserva, en vez de A*.

---

## 8. Criterios para darlo por bueno

- **Orientarse:** 8 de cada 10 llegan al Fallo 2 sin preguntar.
- **Contacto:** uno cada 35 s o menos de travesía, medido con robots y con gente.
- **Ruta:** al menos una decisión por noche (el orden de los Fallos, una obra, una ronda evitada), con gente.
- **La Llamada:** se gana el 55-75 % de las veces en N1-N2.
- **Robots:** cierran los 3 Fallos con 1, 3 y 6 jugadores y andan 700 m o más por jugador y noche.
- **Rendimiento del aparato:** N0 a 30 fps, sin ningún fotograma de más de 50 ms cruzando la ciudad.
- **Validación:** 2 ms o menos por voto y 10 ms o menos por noche en PC, con una sola validación del mundo por mesa y noche.
- **Servidor:** una sala llena en 9 ms/s o menos en PC, con `medir:liza`.
- **La prueba de verdad:** una mesa de tres amigos pulsa «Otra noche» sin que nadie lo proponga.
