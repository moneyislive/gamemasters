# Las casillas que no se compran

Este documento es el encargo de Miguel del 16 de septiembre de 2026 convertido en plan, con la
medida de lo que el tablero aguanta delante. Lo que aquí se decide lo construye
`escenas/burgo/anillo-en-3d.ts` (dónde va cada cosa, sin `three`) y lo monta
`escenas/burgo/ciudad-en-3d.ts` (la geometría), y `verify:burgo-escena` lo mide.

La traza general del tablero está en [LA-CIUDAD.md](LA-CIUDAD.md); esto es el detalle de las
**catorce casillas que no son solar** más las cuatro esquinas.

---

## 1. El encargo, en sus palabras

> «Me gustaría que mejoráramos la apariencia de las casillas del tablero, ahora mismo las veo
> demasiado básicas y toscas.»

Y casilla por casilla: la **salida** con una flecha roja y SALIDA en grande en vez de fragmentos
de carretera; **ningún edificio** en los solares (hecho el 16 de septiembre); la **caja de la
comunidad** con un cofre o un ayuntamiento y una animación al caer; una **oficina del estado**
para el impuesto, con animación de recaudación; **cuatro estaciones distintas en 3D** unidas por
una vía que recorra **todo el perímetro** con trenes que circulen y paren; un **casino** para
suerte; una **compañía eléctrica** característica con su texto y su cantidad; una **cárcel que
parezca una cárcel** con animación de entrada; una **comisaría** en la que se vea entrar en la
celda; un **parking de verdad** con un cartel que ponga PARKING **visible desde arriba**; el
**agua** como la eléctrica; y el **impuesto de lujo**, a mi criterio.

Dos reglas transversales, que valen para todo lo de abajo:

- **Las animaciones siempre muy breves.** Ninguna pasa de 0,8 s; la del tren, que es continua,
  no espera a nadie.
- **Cada casilla con su nombre y un texto pequeño que explique de qué va.**

---

## 2. Lo que el tablero aguanta, medido hoy

| | Medido | Tope | Sobra |
| --- | --- | --- | --- |
| Triángulos, calidad plena | 181.333 | 900.000 | 718.667 |
| Triángulos, calidad sobria | 136.547 | 230.000 | 93.453 |
| Llamadas de dibujo, pose de salida | 92 | 150 | 58 |
| Llamadas de dibujo, cámara cerca | 114 | 150 | 36 |

Y de ahí sale **la decisión que gobierna todo este documento**:

> **Sobran triángulos y faltan llamadas.** Una pieza NUEVA del pack cuesta una llamada de dibujo
> para siempre —una `InstancedMesh` por pieza distinta en pantalla—; un edificio construido en
> código y FUNDIDO con los demás cuesta **cero**. Trece casillas con piezas nuevas se comerían la
> mitad del margen; trece casillas fundidas no gastan ninguna.

Por eso los edificios de estas casillas **no se traen del `.glb`: se construyen en código** y se
funden en una geometría única, del mismo modo que los precios, los emblemas y los nombres se
funden hoy en `geometriaDeLosRotulos()` y son **una sola llamada** para 88 dígitos, 12 emblemas y
55 letras. Se reusan piezas del pack sólo cuando ya están en pantalla por otra razón (coches,
farolas, semáforos, verja, torre de agua, columna, contenedor).

**Lo que se mueve no se puede fundir.** Cada pieza animada sale del fundido y se lleva su propio
grupo, como ya hace la reja de la Mazmorra (`papel: 'reja'` en las piezas de esquina, animada por
`alzadoDeLaReja` de `coreografia.ts` y movida en el bucle de `Burgo.tsx`). Cada una de ésas sí
cuesta una llamada, y por eso están contadas una a una más abajo.

### Las medidas de una casilla, que ninguna pieza puede saltarse

Casilla lateral 72 × 108; esquina 108 × 108. Bandas, de fuera adentro: **franja** `0..21` (ahí va
el nombre, `V_DEL_ROTULO = 11`), **filete** `21..30`, **superficie** `30..90` (el atrezo va en
`ATREZO = 60..90`, el precio en `V_DEL_PRECIO = 45`), **borde** `90..108`. El **carril del
avatar** es `23..29` y no lo pisa nada. Ninguna pieza puede salirse de su casilla ni entrar en la
ele engordada de la marcha.

---

## 3. El reparto, casilla por casilla

Los nombres son los del reglamento (`docs/burgo/REGLAS-EL-BURGO.md`). La escena todavía llama a
algunas por su nombre viejo —Arca, Pregón, Molino, Pozo, Diezmo, Alcabala— y esa deriva se
corrige en la fase 4.

| # | Casilla | Qué se ve | Hecho de | Animación (dura) |
| --- | --- | --- | --- | --- |
| 0 | SALIDA ✅ | SALIDA por la diagonal (101 × 18,4) y la flecha roja de 28 en el pico de fuera | Sólo rótulo fundido; el cruce entero fuera | — |
| 10 | CÁRCEL / VISITA | Muro con dos torretas, patio con verja, celda abierta por arriba | Código + `verja` (ya está) | La reja baja tras el peón (0,6) |
| 20 | PARKING ✅ | La esquina entera asfaltada, sesenta plazas amarillas, catorce coches y el cartel tumbado con la `P` | Código fundido + coches del pack | pendiente: el coche del que cae aparca (0,6) |
| 30 | A LA COMISARÍA | Comisaría con puerta y celda vista desde arriba | Código + `coche-patrulla` | El peón cruza la puerta y aparece tras los barrotes (0,7) |
| 2·17·33 | FONDO VECINAL | Cofre de madera con herrajes sobre el zócalo del ayuntamiento | Código | La tapa se abre y sale una moneda (0,7) |
| 7·22·36 | SUCESOS | Casino: cuerpo con marquesina, rótulo vertical de bombillas y ruleta en el suelo | Código | La ruleta gira vuelta y media y para (0,8) |
| 12 | CENTRAL ELÉCTRICA | Dos torres de refrigeración, chimenea y un poste de alta tensión | Código | Chispazo entre los postes (0,3) |
| 28 | CANAL DE AGUAS | Depósito elevado y alberca | `torre-de-agua` (del pack) + código | Onda en la alberca (0,5) |
| 4 | IMPUESTO | Oficina del estado: frontón, cuatro columnas y escalinata | Código + `columna` | Una moneda sube la escalinata y entra (0,6) |
| 38 | TASA DE LUJO | Joya sobre pedestal bajo campana de cristal, con alfombra | Código | La joya gira y la campana baja (0,5) |
| 5·15·25·35 | LAS CUATRO ESTACIONES | Cuatro estaciones DISTINTAS con andén y marquesina | Código | El tren para 1,5 s en el andén |
| — | EL FERROCARRIL | Vía de traviesas y dos carriles por **todo el perímetro**, por fuera del borde | Código, fundido | Dos trenes dando la vuelta, continuo |

Cada casilla lleva además su **texto pequeño** debajo del nombre (alto 9 contra los 17 del
nombre): lo que hace al caer en ella, en cuatro palabras.

### El coste de todo esto, contado antes de escribirlo

Fundido en una geometría nueva (`geometriaDeLaObra`, hermana de la de los rótulos): **1 llamada**.
Piezas animadas, una llamada cada una: reja (ya existe), tapa del cofre, ruleta, moneda del
impuesto, joya, coche del parking, y los trenes (una `InstancedMesh` para los dos). Total nuevo:
**7 llamadas** de las 36 que hay de margen con la cámara cerca. Los triángulos no son problema:
trece edificios de código a ~1.500 son 20.000 de los 718.000 que sobran.

---

## 4. El orden, y por qué éste

1. **SALIDA** (fase 2) — **hecha**. Quitar piezas y escribir letras, que era lo más barato, y de
   paso resolver el sitio de los rótulos en las **esquinas**, que hasta entonces no llevaban
   ninguno: van por la diagonal del cuadro de suelo de 90, con la cuenta del rombo
   (`ancho + alto ≤ L√2`) que `verify:burgo-escena` mide letra a letra. La esquina se quedó en
   **cero piezas**, y lo que la sustituye no cuesta ninguna llamada: va fundido con los rótulos.
2. **Las tres esquinas restantes** (fase 3): cárcel, parking y comisaría. Comparten el problema de
   la esquina —108 × 108, la ele de la marcha por en medio— y conviene resolverlo una vez.
   - **El aparcamiento, hecho.** Con él entra la máquina que van a usar las once casillas que
     quedan: `burgo/obras.ts` describe volumen en código, cuadro a cuadro y sin `three`;
     `geometriaDeLasObras()` lo funde en UNA malla y UNA llamada de dibujo; el presupuesto lo
     cuenta a dos triángulos por cuadro; y la lupa cenital del comprobador mira desde arriba que
     ninguna cara esté del revés, que es el fallo que no se ve en ninguna cuenta.
   - Faltan la cárcel y la comisaría, las dos con celda y animación de entrada.
3. **Las laterales** (fase 4): fondo vecinal, sucesos, eléctrica, aguas, impuesto y tasa. Aquí
   entra también el arreglo de los nombres viejos.
4. **El ferrocarril** (fase 5): las cuatro estaciones, la vía del perímetro y los trenes. Es la
   más cara y la única que toca el mundo fuera del anillo.
5. **Las animaciones** (fase 6): una función pura por animación en `coreografia.ts` —que el
   comprobador puede medir sin `three`— y el bucle de `Burgo.tsx` moviéndolas.

Cada fase es un commit con la batería entera en verde.
