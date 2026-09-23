# COMBATE Y BOTÍN SOBRE LOS TABLEROS

Qué hace falta para que se pueda matar a otro jugador y quitarle una propiedad del Burgo, unos
recursos de Riberas o una ventaja de Las Lindes — y qué se rompe por el camino.

> **Estado: INFORME Y DISEÑO.** Sale de 18 agentes: seis midiendo (netcode, P2P, determinismo,
> trampas, nuestro reductor y el coste), tres diseñando, tres juzgando y **seis atacando**. De
> los seis ataques, **tres son mortales y ninguna arquitectura sobrevivió intacta**.
>
> Todo lo que se afirma aquí sobre nuestro código está verificado en el árbol, no citado de un
> agente.

---

## 0 · Lo que va primero, porque es previo a toda la ingeniería

**El diseño ganador es, palabra por palabra, la definición legal de juego de azar en España.**

**Ley 13/2011, art. 3.a** define juego como

> «toda actividad en la que se arriesguen cantidades de dinero u **objetos económicamente
> evaluables** en cualquier forma sobre **resultados futuros e inciertos**, dependientes **en
> alguna medida del azar**, y que permitan su **transferencia entre los participantes**»

…y se aplica **«con independencia de que predomine el grado de destreza»**.

El encargo cumple cuatro elementos, y no por descuido:

| elemento | dónde lo pone el encargo |
|---|---|
| resultado futuro e incierto | el duelo |
| depende en alguna medida del azar | el botín lo elige `estado.azar`, como `elRobo` de `riberas.ts` |
| transferencia entre participantes | **es el encargo**: robarle al otro |
| la destreza no exime | lo dice la ley |

Falta **uno**: que lo apostado sea un «objeto económicamente evaluable». **Ese elemento lo pone
la monetización** — y la palabra que se usó fue *vendible*. El precedente conocido es el mercado
de *skins* de CS:GO.

Hoy no hay riesgo: `terminos.ts` dice que no se cobra por jugar ni hay compras dentro de la
aplicación. **El riesgo nace el día que eso cambie.**

### La salida, que es gratis si se decide ahora

> **Decisión fechada y por escrito: lo robado NO SALE DE LA MESA, y lo apostable NO SE COMPRA
> NUNCA CON DINERO** —ni directa ni indirectamente— **y no existe mercado secundario.**

Con esa decisión el botín no es económicamente evaluable y la ley no entra. Sin ella, esto
necesita licencia de la DGOJ y un abogado de juego **antes** de escribir código. No soy abogado
y esto no es asesoramiento: es la razón por la que esa decisión va primero.

---

## 1 · «Sin latencia visible» no es alcanzable, y conviene saber por cuánto

Es la restricción que pidió Miguel y es la que no se sostiene. Aplicando la **fórmula de la
ventaja del que asoma** que Riot publicó para VALORANT —fotograma del enemigo + su ida +
fotograma del mundo + mi ida + interpolación— a los parámetros que proponen las tres
arquitecturas (20-30 Hz, interpolación de 100-150 ms):

| escenario | ventaja del que asoma |
|---|---|
| optimista: 30 Hz, 60 fps, 25 ms de ida, interp 100 | **200 ms** |
| central: 20 Hz, 30 fps, 35 ms, interp 120 | **273 ms** |
| noche real: 20 Hz, 30 fps, 60 ms, interp 150 | **353 ms** |
| con relevo TURN (10-35 % de los enlaces) | **413 ms** |

Las referencias de Riot con esa misma fórmula: **141 ms** es lo que consideraron tan malo que
reescribieron el netcode y montaron una red privada mundial; **101 ms** es lo que consiguieron
después; **80 ms** es lo que sus profesionales llaman «justo».

> Salimos entre **2,5 y 5 veces peor** que el número que Riot declaró un fallo — en teléfonos,
> sobre red de operadora y sin red privada.

**«Sin latencia visible» no es optimismo: es la descripción de otro producto.** Lo honrado es
sustituir la frase por un objetivo medible —«ventaja del que asoma ≤ X ms, medida»— y aceptar
que en móvil X estará **entre 150 y 250 ms**. Eso da un combate de *arena lenta*: melé, arcos,
trampas, emboscadas. No da un *shooter*.

---

## 2 · El P2P: la premisa está invertida, y además filtra la IP

Miguel pidió expresamente valorarlo para no gastar en servidores. Medido:

### No ahorra

1.000.000 de partidas/mes × 10 min = **231 sesiones simultáneas de media**, ~926 en pico con
factor 4. Eso **cabe en una caja**. El servidor autoritativo a 20-30 Hz sale entre **300 y 350
€/mes** con todo dentro (Hetzner, IVA, copias, segunda caja, Mongo y observabilidad) — **0,03
céntimos por partida**.

El P2P ahorra el egreso y **devuelve TURN**: entre el **10 % y el 35 %** de las conexiones
reales no logran travesía NAT, y en móvil con CGNAT de operadora es donde más falla. El relé
cobra el tráfico **dos veces**. Ahorro neto: unos 1.400 $/mes **a cambio de entregarle la
autoridad al cliente**. Es el peor cambio posible dado el encargo.

### Y filtra la dirección IP de los jugadores

El atacante que hizo de tramposo encontró esto, y no lo rompió por el netcode:

> Abrir una `PeerConnection` con la víctima **entrega su candidato ICE, o sea su IP real**.
> Desde fuera del juego se le inunda esa IP, deja de mandar señales y **pierde por abandono** —
> con su apuesta ya depositada.

En un producto con menores eso no es sólo una trampa: es un problema de seguridad de personas.
Se cierra con `iceTransportPolicy: 'relay'` — o sea **pagando TURN**, que era justo lo que el
P2P venía a ahorrar.

> **Conclusión: P2P sirve para presencia cosmética. Para nada que quite bienes.**

---

## 3 · Lo que sí funciona, y lo que ya tenemos

### La puerta al estado sellado YA EXISTE y ya está cerrada

`server/src/arcade/mesas.ts:2326` comprueba el **prefijo reservado `arcade:`** *antes incluso de
coger el candado de la mesa*, y lanza `MovimientoReservado`. Ningún dispositivo puede mandar un
`arcade:*` jamás. Y el comprobador nº 12 de `verificar-mesa.ts` lo ejercita — su cabecera dice
que **un sentado llegó a mandar `arcade:tic`**, o sea que la puerta se cerró porque alguien la
cruzó.

Un veredicto de combate entra por ahí: `arcade:botin`, emitido **sólo por el servidor**, y el
reductor mueve únicamente lo que ya estaba depositado.

### El determinismo es alcanzable, y está medido

Dos medidas hechas con el propio Hermes del repositorio, no leídas en documentación:

- **El trazado de rayos de `three-mesh-bvh` es BIT A BIT IDÉNTICO** entre V8 y Hermes: 200.000
  rayos sobre 51.200 triángulos, firma `b0040bc2` en los dos.
- **El controlador de cápsula también**: 600 tics, **0 de 600 distintos**, firma final
  `f46fbfdd`.

Pero las trascendentales de `Math` **sí divergen** (cbrt 28,4 %, atan2 16,1 %, sin 2,2 %, siempre
por 1 ULP). Así que la regla es: **ninguna trascendental en el camino que decide.**

Y hay algo mejor, medido: **una arena gruesa entera en punto fijo Q16.16** —rejilla de alturas
256×256, 400 cajas, marcha de rayo entera— da **0,164 ms/tic en Hermes** con firma idéntica
(`888c6f9a`), **22 a 45 veces más barata** que el BVH. Regla que sale de ahí:

> **Enteros para la verdad. BVH para la presentación.**

### El contrato que ya cumplimos sin saberlo

`Colyseus 0.18` (MIT, publicado hace días, 67 publicaciones en 2026) trae **hoy** predicción,
rollback, interpolación y *lag compensation* con rebobinado, con `rewind.lastSeenBy` «clamped to
prevent spoofing». Y su contrato de determinismo —una sola función `step` compartida, prohibido
`Math.random`, prohibido `Date.now`, prohibido iterar mapas desordenados— **es casi literalmente
el que nuestro reductor ya impone**.

Aviso: **React Native no está en su lista oficial de SDK**, y el paquete cliente cambió de
nombre en enero de 2026 (`colyseus.js` → `@colyseus/sdk`). Medir el cliente en Hermes es el paso
previo a todo lo demás.

---

## 4 · Dos defectos del producto ACTUAL, encontrados por el camino

Ninguno tiene que ver con el combate. Los dos están hoy en el árbol.

### 4.1 · Los topes de carga viven en la puerta, no en el motor

`TOPE_TIPO_CARACTERES = 64` y `TOPE_CARGA_BYTES = 8 kB` se declaran en
`server/src/arcade/presupuesto.ts:331-332` pero **sólo se exigen en `routes/arcade.ts:904` y
`:920`** — la ruta HTTP. `mesas.ts` y `arbitro.ts` tienen **cero referencias** (verificado).

O sea: **cualquier segunda puerta las salta**. El tic ya entra por otra, y un `arcade:botin`
también entraría sin tope.

Y el comentario de esa misma ruta dice lo que cuesta: *«Una carga de 240 kB anidada tarda 152 ms
—tres veces el tope— y la cuarentena resultante es por arcade, permanente y sin puerta para
levantarla: todas las mesas de ese juego dejaban de aceptar movimientos hasta reiniciar el
proceso»*. `levantarLaCuarentena` existe en `presupuesto.ts:393` y **ninguna ruta la llama**
(verificado).

> **Un solo movimiento gordo —ni siquiera falso— deja a un juego entero en cuarentena hasta el
> siguiente reinicio.** Los topes tienen que subir al árbitro, no a la ruta.

### 4.2 · El tablero manda la vista entera a cada jugador en cada revisión

No hay deltas. Medido sobre los maestros de oro: **89,3 kB por revisión en el Burgo** (5
observadores) y **282,2 kB en Las Lindes** (4 observadores) en estado final. Unas 203 revisiones
y **20,2 MB por partida**.

A un millón de partidas al mes son **20-26 TB/mes** — *antes de que se mueva un solo avatar*.
Ésa es hoy la línea más gorda de la factura, y es del producto que ya existe.

---

## 5 · La arquitectura, en una frase por plano

| plano | quién manda | frecuencia | dónde | se persiste |
|---|---|---|---|---|
| **la mesa** | reductor sellado | 1 por jugada | servidor | sí |
| **el veredicto** | servidor, por `arcade:` | 1 por duelo | servidor | sí |
| **la refriega** | servidor ligero, enteros Q16.16 | 20-30 Hz | servidor | no |
| **la presencia** | nadie | 10 Hz | malla o servidor | jamás |
| **el adorno** | el aparato | 60 fps | dispositivo | no |

**El principio que lo ordena todo, y que sale del ataque del tramposo:**

> **El cliente declara INTENCIÓN, nunca RESULTADO.** «Disparé desde P hacia D en el tic T» sí;
> «maté a B» jamás. Y el dispositivo no firma nunca nada que valga algo.

---

## 6 · Lo que hay que decidir antes de escribir una línea

1. **Lo robado no sale de la mesa y no se compra con dinero.** §0. Es previa a todo.
2. **El número de latencia aceptable.** Si no vale 150-250 ms en móvil, el modo no se puede
   hacer y hay que decirlo con esa frase.
3. **Qué se puede robar en cada juego sin romperlo**: recursos de Riberas, propiedades del
   Burgo, ventajas de Las Lindes — y qué NO.
   **Decidido el 23-sep-2026** (`docs/BOOTS-ON-BOARD.md` §7): el botín entra en la mesa como el
   movimiento `arcade:botin` (`shared/arcade/juegos/botin.ts`), que sólo mete el servidor, y cada
   reductor decide qué se lleva. Riberas, una ficha al azar con `elRobo`, sin tocar las que se
   deben en un descarte; El Burgo, hasta 100 € por `transferirEntre`, sin abrir apuro y nunca con
   una subasta o un apuro en la mesa, y un quebrado ni da ni recibe; Las Lindes, hasta 3 puntos.
   Sin nada que llevarse, el mismo estado; nunca mueve el turno ni el momento. Las propiedades
   del Burgo NO se roban.
4. **Si esto es una capa sobre tres juegos o un CUARTO JUEGO** con su propio reductor y una
   aduana con los otros tres. La tercera arquitectura defendía esto, y es más simple y más
   vendible.

**Y tres arreglos que convienen igual, con combate o sin él:**

- subir los topes de carga al árbitro (§4.1);
- dar salida a la cuarentena (§4.1);
- cerrar el CORS pelado y el minado de asientos (ver `docs/CAPA-ESPACIAL.md` §4).
