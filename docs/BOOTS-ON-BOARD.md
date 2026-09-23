# BOOTS ON BOARD

La modalidad en la que se baja al tablero: avatares en primera y tercera persona, combate y
botín. Qué se usa de IR Engine, qué se coge de terceros, qué escribimos nosotros y en qué orden.

> **Decisiones de Miguel, 20 de septiembre de 2026 — las tres cierran el diseño:**
>
> 1. **Lo robado NO SALE DE LA MESA.** Cierra el riesgo de la Ley 13/2011 (ver
>    `docs/COMBATE-Y-BOTIN.md` §0).
> 2. **Se acepta una ventaja del que asoma de 150-250 ms.** No es un *shooter*: es arena lenta.
> 3. **Es una MODALIDAD APARTE.** Al abrir mesa se elige: *normal* (lo de hoy: tablero desde
>    arriba, con zoom en las animaciones) o **Boots on Board**. Sólo se ofrece a los aparatos
>    que la soportan — y **a nadie se le echa de una partida empezada** porque le empeore la
>    conexión.

> **REVISADO EL 23 DE SEPTIEMBRE DE 2026.** El plan se revisó entero, con cuatro mapas medidos
> del árbol. Las tres decisiones de arriba se sostienen; **dos piezas del plan cambian** —el
> servidor VALIDA las posiciones en vez de resimularlas, y el canal es propio sobre WebSocket
> en vez de Colyseus— y el orden del §6 se sustituye por el del **§7**, que es el que manda.

---

## 0 · Por qué la tercera decisión es la que más simplifica

Separar la modalidad no es una concesión: **es lo que hace barato todo lo demás.**

- Los tres juegos de hoy **no pagan nada**: ni un byte, ni un tic, ni un riesgo. Siguen siendo
  lo que son.
- La compuerta de dispositivo pasa a ser **una vez, al abrir la mesa**, en vez de una decisión
  por fotograma.
- Los 150-250 ms son una propiedad **de un modo**, no una promesa del producto.
- Y el tramposo sólo tiene premio **dentro de ese modo**, donde todo el cerco está puesto.

---

## 1 · La respuesta a «¿IR, piezas de IR, o lo escribimos?»

La intuición de Miguel es que IR tiene mucho trabajo hecho en experiencias de avatar
multijugador. **Se ha medido, fichero a fichero**, sobre los cuatro paquetes que nos
interesarían (`ecs`, `spatial`, `engine`, `hyperflux`): **618 ficheros, 106.865 líneas, 69.522
de código.** No es un juguete.

Y esto es lo que hay dentro, para nuestro caso:

| lo que parecía | lo que es |
|---|---|
| **Control de avatar** | el envoltorio del controlador de Rapier son **43 líneas**. Escalones y pendientes los resuelve **Rapier**, no IR, con sus valores por defecto. Lo propio de juego son ~120 líneas (rayo al suelo, caída, salto) — y las escribieron admitiendo que están mal: *«todo - 10 is way too big, should be 1, but this makes you fall down stairs»*. **No hay agacharse, nadar, escaleras ni vaulting**: cero coincidencias en 773 ficheros. |
| **Máquina de animación** (BlendSpace, DistanceMatching) | existe, 414 líneas… y **está HUÉRFANA**: no la importa nadie salvo sus propias pruebas. Lo que de verdad corre son **45 líneas** que mezclan tres clips fijos con constantes mágicas y un comentario que dice *«for now we're hard coding…»*. No es mejor que un `AnimationMixer` de three con tres pesos. |
| **IK de cuerpo completo** | 633 líneas, y sus objetivos los alimenta **exclusivamente WebXR o una webcam**. Sin casco y sin cámara, no tiene nada que resolver. Para tercera persona es peso muerto. |
| **Retargeting de esqueletos** | 1.294 líneas, la parte más sustancial. Sólo vale si el usuario **sube rigs arbitrarios**. Con KayKit —rig fijo y conocido— vale **cero**. |
| **Presencia / netcode** | sólido pero convencional: ~1.372 líneas, serializador binario con máscaras y compresión de cuaterniones *«smallest three»*… que el propio fichero **atribuye a gafferongames.com**. Y **no hay predicción, ni reconciliación, ni extrapolación: cero**. Menos de lo que Colyseus 0.18 trae hoy de fábrica. |

> **La cifra final: de esas 69.522 líneas, lo suyo Y útil para nuestro caso son 1.500-2.500
> líneas, de las que originales de verdad 600-900.**

Y el precio de llevárselas: reemplazar Rapier por algo que corra en Hermes (**meses**),
reescribir el sustrato reactivo sobre React 19 (**meses**), dar un cuerpo falso de DOM a **326
dependencias** (**meses**), reconciliar un parche hecho contra el *build minificado* de three
0.176 (**semanas**) — y publicar nuestro fork y mostrar *«Powered by Infinite Reality Engine»*
en cada arranque, con su URL apuntando a un dominio que ya no resuelve.

### Entonces, ¿qué SÍ cogemos de IR?

**Su patrón.** Que es gratis, no caduca y es exactamente lo que Miguel quiere cuando dice
«arquitectura patronizada para generar juegos de forma organizada y estándar»:

1. **ECS**: entidades con componentes, y *sistemas* que corren en un orden declarado.
2. **El mundo se DECLARA**, no se programa: suelo, cuerpos, dónde se nace.
3. **El transporte es un contrato**, no una implementación (su `PeerTransport` son tres
   callbacks — por eso mediasoup es sustituible).
4. **Separación entre simulación y presentación**, que es lo que permite que la verdad sea
   determinista y el adorno no.

Y los ladrillos con los que IR implementa ese patrón —**Rapier, three-mesh-bvh, bitECS,
three**— los cogemos **directamente de sus autores**, vivos y con licencia limpia. Su
`packages/spatial` depende exactamente de esos cuatro.

> **No es «no usemos IR». Es usar de IR lo que no se ha muerto: su forma de organizar el
> trabajo.** Y la casa ya hace eso dos veces —`ManifiestoDeArcade` y `TableroDeclarado`—, así
> que no es un patrón importado: es el tercero de la serie.

---

## 2 · La arquitectura, plano a plano

| plano | quién manda | frecuencia | dónde corre | con qué |
|---|---|---|---|---|
| **la mesa** | reductor sellado | 1 por jugada | servidor | lo nuestro, sin tocar |
| **el veredicto** | servidor, por `arcade:botin` | 1 por duelo | servidor | lo nuestro |
| **la refriega** | servidor ligero | 20-30 Hz | servidor | **Colyseus 0.18** + arena Q16.16 nuestra |
| **la presencia** | nadie | 10 Hz | servidor (el mismo socket) | Colyseus |
| **el adorno** | el aparato | 60 fps | dispositivo | **react-three-fiber + three-mesh-bvh** |

### El principio que lo ordena

> **El cliente declara INTENCIÓN, nunca RESULTADO.** «Disparé desde P hacia D en el tic T» sí;
> «maté a B» jamás. Y el dispositivo no firma nunca nada que valga algo.

### Enteros para la verdad, BVH para la presentación

Medido con el propio Hermes del repositorio:

- El trazado de `three-mesh-bvh` y el controlador de cápsula son **bit a bit idénticos** entre
  V8 y Hermes (firmas `b0040bc2` y `f46fbfdd`).
- Pero las trascendentales de `Math` **divergen** (cbrt 28,4 %, atan2 16,1 %, sin 2,2 %).
  **Ninguna en el camino que decide.**
- Y una arena gruesa entera en **Q16.16** —rejilla de alturas 256×256, cajas, marcha de rayo
  entera— da **0,164 ms/tic en Hermes** con firma idéntica (`888c6f9a`): **22-45× más barata**
  que el BVH.

Así que el servidor arbitra sobre la arena entera, y el aparato pinta con el BVH. Las dos
salen de **la misma declaración**.

> **CORRECCIÓN, y toca a las tres viñetas de arriba: «firma idéntica» NO demuestra lo que este
> apartado le hace decir.**
>
> Los tres bancos que dan las firmas `b0040bc2`, `f46fbfdd` y `888c6f9a` reciben los
> incrementos **ya multiplicados**. Ninguno hace la multiplicación que un paseante hace una vez
> por tic —`velocidad × dt`—, y ésa es justo la operación que se rompe: en Q16.16 el producto
> no cabe en 32 bits, así que `(a * b) >> 16` devuelve un número equivocado **con el signo
> cambiado** en 17 de las 32 combinaciones de velocidad por frecuencia de esta casa; cae andar
> a 30 fps. `Math.imul` se rompe igual, y está en la lista de lo seguro de `verify:pureza`.
>
> Lo grave no es el desbordamiento: es que **es determinista**. Node y Hermes devuelven la
> MISMA firma mala, medido. O sea que una firma idéntica entre motores es compatible con estar
> equivocado, y `verify:determinismo` —el único comprobador que había para esto— sale verde
> encima. Un banco que no hace la operación del código de verdad certifica el determinismo de
> la operación que no es.
>
> Lo que vale es `((a * b) / 65536) | 0`: coma flotante exacta hasta 2^53, margen de 218.473
> veces sobre el mayor producto real, y un 3,7 % más caro en Hermes que la forma rota. Vive en
> `shared/mecanicas/fijo.ts` y lo vigila `npm run verify:fijo`, que ejecuta los dos motores y
> se ha visto rojo de seis maneras.

### La puerta al estado sellado, que ya existe

`server/src/arcade/mesas.ts:2326` comprueba el prefijo reservado **`arcade:` antes incluso de
coger el candado**, y ningún dispositivo puede mandar uno. El veredicto entra por ahí, lo emite
sólo el servidor, y el reductor **mueve únicamente lo que ya estaba depositado**.

---

## 3 · La modalidad, declarada

```ts
/** Cómo se juega una mesa. Se elige al abrirla y no cambia. */
export type Modalidad = 'normal' | 'botas';

/** Lo que un juego declara para poder recorrerse. Datos puros: ni three, ni red, ni IR. */
export interface MundoDeclarado {
  readonly sello: string;          // opaco: NUNCA el código de mesa
  readonly arena: ArenaEntera;     // Q16.16: alturas, cajas, ocupación
  readonly cuerpos: readonly Cuerpo[];
  readonly nace: readonly Sitio[];
  readonly modelos: readonly { readonly id: string; readonly url: string }[];
}

/** Lo que el aparato debe cumplir para que se le OFREZCA la modalidad. */
export interface LoQuePideLaModalidad {
  readonly triangulos: number;
  readonly memoria: number;
  readonly fotogramas: number;     // medidos en una prueba corta, no declarados
}
```

**La compuerta se pasa una vez**, al abrir o al sentarse. Y una vez dentro, **no se echa a
nadie**: si la conexión empeora, el jugador degrada —más interpolación, menos alcance— pero
sigue jugando. Es decisión de Miguel y es la correcta: echar a alguien a mitad de partida por
su red es peor que un combate feo.

---

## 4 · Lo que escribimos nosotros, con su talla

De la lista medida, esto es lo que **no evita ninguna decisión de arquitectura** — o sea, lo
que hay que escribir con IR o sin IR:

| pieza | talla |
|---|---|
| la arena entera Q16.16 y su generación desde el `MundoDeclarado` | semanas |
| la mezcla de locomoción de los KayKit (quieto / andar / correr / gesto) | semanas |
| el canal de transformaciones entre jugadores sobre el transporte | semanas |
| la puerta `arcade:botin` y sus invariantes en los tres juegos | semanas |
| fijar el rig KayKit y renunciar al emparejado heurístico | días |

Y de terceros, sin escribir una línea: **Rapier** (escritorio), **three-mesh-bvh** (los dos),
**Colyseus 0.18** (predicción, rollback, *lag compensation*), **bitECS** si hace falta ECS.

---

## 5 · Los arreglos previos, que convienen igual

Salieron de los ataques y **no dependen de que esto se construya**:

1. **Subir los topes de carga al árbitro.** Hoy `TOPE_CARGA_BYTES` sólo se exige en la ruta
   HTTP; `mesas.ts` y `arbitro.ts` tienen cero referencias. Cualquier segunda puerta los salta.
2. ~~**Dar salida a la cuarentena.**~~ **ESTE PUNTO ESTABA MAL Y NO SE HACE.** Lo escribí yo
   sin leer el razonamiento que ya estaba en `presupuesto.ts`, y el código contesta mejor que
   el plan: «una puerta para desactivar el castigo desde fuera es una puerta para desactivar
   la comprobación». Además la justificación —«un movimiento gordo deja un juego parado»—
   estaba rancia: `TOPE_CARGA_BYTES` ya corta ese sobre en la ruta de movimientos, y desde el
   20-sep también en la de récords.

   Y la sospecha con la que lo escalé —«lo decide un cronómetro de reloj de pared de UNA
   muestra»— **no la sostiene la medida**: reejecutando el registro congelado del Burgo, el
   peor movimiento cuesta **1,21 ms** contra un tope de 50; doce hilos quemando CPU no lo
   empeoran (0,62 ms); y ni una recolección COMPLETA forzada dentro del cronómetro, con
   138 MB de montón, pasa de **13,78 ms**. Cuarenta veces de margen.

   Lo que SÍ se ha hecho, que es lo que quedó en pie al medir:
   - **Borrar `levantarLaCuarentena`**, porque no la llamaba nadie —ni las pruebas, que usan
     `olvidarLoMedido()`— y era exactamente la puerta que su propio comentario prohíbe: sólo
     le faltaba que alguien la importara.
   - **Poner la estadística en el motivo.** Lo único que no se puede medir desde aquí es un
     contenedor estrangulado por cuota, y eso es indistinguible de un reductor malo si sólo
     se mira la cifra de esa muestra. Con la media de los movimientos anteriores —que ya se
     guardaba y no salía— se distingue: un juego lento llega con la media alta; un pico, con
     dos mil movimientos a centésimas y un solo salto.
3. **Cerrar el CORS pelado y el minado de asientos.**
4. **Deltas en la vista.** Hoy se manda la vista entera a cada jugador en cada revisión.
   Medido reejecutando el registro congelado del Burgo —343 revisiones × 5 observadores—:
   **73,5 kB por revisión, 24,62 MB por partida, 23,48 TB/mes al millón en crudo**.

   **PERO ESA CIFRA NO ES LA FACTURA, Y LA CORRECCIÓN ES GORDA.** El mismo contenido son
   4,07 TB con gzip y 3,42 con brotli —el 82,7 % y el 85,4 % menos—, y el cable ya va
   comprimido: una petición a `harkania.onrender.com` devuelve `Content-Encoding: br`.

   Lo que yo di por supuesto es que eso lo hacía Cloudflare. **Lo hace Render**, y está
   documentado: «Render's load balancers automatically compress HTTP responses from your
   apps using Brotli and gzip compression» (`render.com/docs/render-vs-heroku-comparison`,
   página viva, y la misma prestación listada en `docs/web-services`, `docs/native-runtimes`
   y `docs/docker`). O sea que **el ahorro del 82-89 % YA SE ESTÁ HACIENDO, gratis**, y
   `app.use(compression())` no lo compra: como mucho mueve de sitio lo que la plataforma ya
   hace —y peor, porque el paquete `compression` de npm es gzip/deflate y el balanceador usa
   brotli—.

   **DÓNDE SE MIDE: NO ESTÁ DOCUMENTADO.** Barrido el corpus entero de Render
   (`docs/llms-full.txt`, 1 MB, generado el 18-sep-2026): no existe ninguna frase que ate
   compresión y ancho de banda facturado. Dicen qué se cuenta —«traffic sent from your
   workspace's services to destinations outside of Render», 0,15 $/GB— y nunca en qué salto.

   El indicio más fuerte de que el contador está en el borde, aguas ABAJO de la compresión:
   **un sitio estático factura ancho de banda y no tiene proceso ninguno**. Si el contador
   viviera en la aplicación, un sitio estático contaría cero.

   **DECISIÓN: no se escribe la línea.** Solo ganaría dinero en un escenario —que el
   contador esté en la tarjeta de red de la instancia, por delante del balanceador— que es
   el menos probable de los tres y que nada respalda. Y antes de tocar los deltas conviene
   recordar lo medido: un parche ingenuo ahorra 79,6 % en el Burgo pero sólo 23,0 % en Las
   Lindes, y en las ocho revisiones más gordas **el parche es más grande que la vista**.

   Si alguna vez hace falta la certeza, hay un experimento de 0,08 $ que la da sin tocar
   producción: un servicio testigo con tráfico cero que sirve 100 MiB en crudo y 400 MiB en
   brotli en la misma hora —la aplicación escribe 0,524 GB y el cable lleva 0,105— y mirar
   cuál de los dos números apunta Render. Son 5× de diferencia. Dos avisos: el panel da UN
   punto por hora y cada uno aparece ~60 min después, así que son 10 min de trabajo y hasta
   2 h de reloj; y `starter` en `render.yaml` es TIPO DE INSTANCIA, no plan de workspace —los
   incluidos (Hobby 5 GB / Pro 25 GB / Scale 1 TB) hay que mirarlos en el panel—.

---

## 6 · El orden

1. Los cuatro arreglos del §5.
2. **Medir el cliente de Colyseus en Hermes.** Es el único bloqueo real que queda, y es una
   tarde. Si no corre, cambia el transporte, no la arquitectura.
3. `MundoDeclarado` + arena Q16.16 + el mirador ligero con colisiones. **Esto ya entrega el
   paseo con choques en los tres juegos**, en modalidad normal, sin combate.
4. La modalidad `botas` y su compuerta.
5. La refriega y el veredicto.
6. El botín, un juego cada vez.

### 6.1 · Lo que hay que decidir antes de escribir el paso 3

El diseño del paso 3 se escribió, se atacó por tres lados y volvió **agujereado por los tres**.
La aritmética ya está arreglada (arriba, §2). Lo que queda son decisiones, no tecleo, y cinco de
ellas cambian la forma del contrato:

- **El contrato de niveles no pasa por `canonico.ts`.** Un `Int16Array` dentro de
  `MundoDeclarado` da `NoCanonizable: no es un objeto llano`. Pasado a listas llanas sí canoniza
  y pesa **324 kB por revisión**, que son **4,4 veces la vista más cara de la casa** (73,5 kB,
  medidos en §5.4). O el mundo no viaja por el cable —y entonces «el servidor arbitra sobre la
  misma declaración» hay que reescribirlo—, o viaja de otra forma.
- **`escenas/` está fuera de la compilación del servidor.** `server/tsconfig.json` incluye
  `src/`, `scripts/` y `../shared/`. Con el productor del mundo en `escenas/`, la declaración es
  del cliente y sólo del cliente. Y de los tres juegos **sólo Las Lindes tiene su mundo en el
  estado sellado**: el Burgo y Riberas declaran *decorado*, que el servidor no sabe que existe.
- **El mundo del Burgo depende del APARATO, no de la mesa.** `ciudadDelCodigo(código, recinto,
  calidad)`, y `calidad` la decide en ejecución el tiempo de los primeros 120 fotogramas. Medido:
  en calidad sobria hay **2.808 obstáculos menos**. Dos personas en la misma mesa andarían dos
  Burgos distintos, y como cada uno es coherente consigo mismo, el comprobador pasa en los dos.
- **El umbral de subida está mal por un 46 %.** El diseño dice que el mayor desnivel entre
  clases de Las Lindes es 1,203 u y que el umbral de 1,27 lo admite «por poco». El real es
  **1,8594 u** (senda contra villa, verificado con `ESCALA_DEL_PACK`): es la puerta del pueblo,
  está en el mazo hoy, y se ve como pararse en seco delante de ella.
- **El borde del mundo desaparece.** `hayLosaEn` no era un obstáculo más: era el límite del
  tablero, y `paseo.ts` le dedica un apartado entero a explicar por qué. Cambiarlo por «¿choca
  con algún cuerpo?» deja andar por el vacío, donde no hay cuerpo con el que chocar.

Y una que es de orden, no de diseño: **el único paseante que existe vive en la rama `lindes`,
sin fusionar**. Lo malo de escribir el paso 3 antes no es el conflicto: es que **no hay
conflicto**. `shared/mecanicas/andar.ts` y `escenas/lindes/paseo.ts` son ficheros distintos y
git los fusiona tan contento — quedan dos `unPaso`, y `Lindes.tsx` sigue llamando al viejo. Paso
3 entregado, comprobadores en verde, y el único juego que se puede andar sigue atravesando
murallas.

---

## 7 · REVISIÓN DEL 23 DE SEPTIEMBRE: lo que se sostiene, lo que no, y el plan que manda

Miguel pidió revisar el plan entero, criticarlo y retomarlo con criterio propio, pensando en
escalar el número de arcades deprisa y en lo que cuestan los servidores con muchos usuarios. Lo
que sigue sale de cuatro mapas del árbol hechos en paralelo —coste de un juego nuevo, techo del
servidor, paseo y 3D en los dos clientes, y la batería— y de leer la sesión anterior entera.

### 7.1 · Lo que se sostiene, y no se toca

- **Las tres decisiones de Miguel.** La modalidad aparte es, además, la que abarata todo lo demás.
- **No adoptar el código de IR Engine.** El análisis del §1 es correcto y está medido: IR está
  parado desde julio de 2025, su pegamento suelda React 18.2 y su física es Rapier en WASM, que
  el Hermes de la app no ejecuta. Lo que se coge de IR es su patrón —el mundo se declara, el
  transporte es un contrato, simulación separada de presentación—, y la casa ya lo hacía.
- **El cliente declara intención, nunca resultado**, y la puerta `arcade:` del núcleo ya está
  cerrada para los aparatos.
- **Enteros para lo que decide.** `fijo.ts` y la arena Q16.16 se quedan.

### 7.2 · Lo que no se sostiene

1. **El ritmo.** Cinco días y varias decenas de agentes después, la modalidad no existía: ningún
   tablero se andaba con choques, nadie veía a nadie y no había mesa `botas`. Se midió a fondo lo
   que no cambiaba ninguna decisión —dónde factura Render el ancho de banda, para acabar
   decidiendo no escribir una línea— y no se miró lo que sí la cambiaba: **en el móvil no se
   puede andar en ningún juego**, porque no hay mandos táctiles y las teclas se leen de
   `document`. Con el plan tal cual, Boots on Board no se habría podido ofrecer en la app, y por
   la regla de que ningún juego es sólo para PC, tampoco en el escritorio.
2. **Dos arreglos del §5 que se dieron por cerrados no lo estaban.** Los topes de carga seguían
   exigiéndose sólo en la ruta HTTP (`mesas.ts` y `arbitro.ts`: cero referencias), y el CORS
   pelado seguía en `index.ts:105`. Lo que se cerró fue otra cosa: la cadena de proxy, la puerta
   de récords, la cuarentena y la decisión sobre los deltas.
3. **El plan no miraba el techo del servidor, y es lo que más pesa en la factura.** Medido: toda
   mesa —terminada o no— vive 30 días en un `Map` en RAM con su diario entero, `cargar()` lee
   todos los ficheros de golpe al arrancar, y cada lectura de espera larga hace DOS proyecciones
   completas sólo para comparar un número de revisión. El techo real hoy son unos pocos miles de
   mesas al mes, en una sola instancia. Eso decide el «millón de usuarios» más que todo Boots on
   Board junto.
4. **Resimular cada paso en el servidor, al bit, era más caro de lo que compra.** Obligaba a
   bajar a `shared/` —puro y sin trigonometría— el paisaje fino de los tres juegos: las 1.300
   líneas del reparto de Las Lindes, la ciudad del Burgo (que además cambia con la calidad del
   aparato) y el relieve y el agua de Riberas, llenos de senos. Para una arena lenta con un botín
   que no sale de la mesa, lo que hay que impedir es atravesar muros y edificios, correr de más y
   teletransportarse; atravesar un barril no le da ventaja a nadie.
5. **Colyseus sobraba.** Su SDK compila en Hermes, pero pide un polirrelleno de
   `FinalizationRegistry`, un alias de `ws` en Metro y unos 635 kB de bytecode entre SDK y
   `schema`; trae su propio modelo de estado, que duplica la mesa; y lo que venía a dar
   —predicción y reconciliación— sale gratis de un paso entero compartido.
6. **`mundo.ts` tenía un agujero y le faltaban dos cosas.** Sólo miraba el cajón del centro del
   paseante: junto a una raya se entraba hasta un radio dentro de una caja (visto rojo, 2 de 30).
   Le faltaban los vados que Miguel decidió para Riberas y el rumbo al nacer. Y su banco medía el
   determinismo de ocho rumbos escritos a mano, que no es el paso que se da.
7. **Hecho juego a juego, Boots on Board no escala.** Un cuarto arcade 3D cuesta hoy unas 21.000
   líneas en 58 ficheros; la duplicación evitable es sólo un 9 %, concentrada en los envoltorios
   de la app. Lo que sí escala es que el paseo, los mandos, las cámaras, la marioneta, la
   presencia y la validación sean de la plataforma, y que un juego nuevo sólo DECLARE su mundo.

### 7.3 · Las dos decisiones nuevas

**A · Estructura y adorno, y el servidor VALIDA.** El mundo con el que se choca tiene dos capas:

| capa | qué es | dónde vive | quién la usa |
|---|---|---|---|
| **estructura** | lo que saben las reglas o no depende del aparato: el suelo, el agua, murallas, edificios, poblados | `shared/`, pura | el aparato para andar y el servidor para validar |
| **adorno** | lo que depende de la calidad o sólo se ve: árboles, barriles, coches, la forma fina de la orilla | `escenas/` | sólo el aparato |

En Boots on Board cada aparato anda con su mundo entero y manda por cada tic dónde está; el
servidor lo VALIDA contra la estructura —un presupuesto de distancia por tiempo de pared, que
haya piso, que no esté dentro de un cuerpo— y si no cuadra lo devuelve al último sitio bueno.
**El combate y el botín los decide siempre el servidor**, sobre las posiciones que aceptó. Es lo
que ya decía el §2 —«disparé desde P» lleva la P del cliente—, dicho entero.

Las Lindes sí baja su reparto a `shared/`, porque allí las casas y las murallas SON estructura y
salen del sorteo del paisaje. De lo menudo, sólo son estructura las piedras, las rocas y los
tocones que, puestos, pasan de la cintura de quien anda (media persona, 1,27 u), con el cuadrado
de su radio medido (`comoEstorbaLaPuesta`); `verify:lindes-mundo` vigila que ninguna tape una
senda, el hueco de una puerta o un sitio de nacer, ni parta el valle. Y como el servidor tiene
muchas mesas a la vez y el aparato una, el mundo de Las Lindes se recuerda POR MESA con un tope
medido: con 100 mesas en rueda, una jugada cuesta lo que en una mesa caliente. El Burgo declara sus edificios (que no dependen de la calidad) y
Riberas su tierra, su vado y sus poblados desde la vista pública; su paisaje fino se queda donde
está.

**B · El canal es propio.** Un WebSocket por asiento en `/api/arcade/mesas/:codigo/botas`, sólo
para mesas `botas`: `ws` en el servidor, el nativo en navegador y React Native. La llave de
asiento viaja en el primer mensaje, nunca en la URL. El aparato manda cada tic su sitio y su
rumbo; el servidor manda a todos una foto por tic, serializada UNA vez por mesa. Desalojo por
CONTENIDO: sesenta segundos sin moverse cierran el socket. Coste estimado: 5 a 9 MB por mesa de
diez minutos. Es la sala de la mesa y vive con ella: el día que las mesas se repartan por código
entre procesos, su canal viaja con ellas.

Medido (23-sep): una foto de cinco personas pesa 180 B, 1,75 kB/s por aparato; 100 salas con 500
aparatos son el 1,7 % de un núcleo, y el 4,3 % peleando. Y con CUOTAS en el `upgrade`
(`server/src/botas/cuotas.ts`): global 2.000 canales, 200 sin saludar, 64 por procedencia y 8 por
segundo, con la misma confianza en los saltos de proxy que el limitador HTTP. Sin ellas, un
revisor adversario abrió 3.000 canales sin saludar en 0,7 s desde un solo cliente.

**C · La refriega, arbitrada por el servidor.** El aparato sólo dice «golpeo» (`golpe`, con su
tic y su mirada). El servidor busca a quién da entre los que están de pie, vistos donde los veía
quien golpeó —rebobinando hasta 250 ms: los 150 con que el aparato pinta a los demás y 100 de
ida y vuelta—, a 2,5 u o menos, dentro de un cono de 45° a cada lado de la mirada y sin muro en
medio, y le da al más cercano. Tres golpes y se cae: cinco segundos en el suelo sin andar ni
golpear, y se renace en el sitio libre MÁS CERCANO a donde se cayó de entre los que están a 52,8 u
o más de quien te tumbó (lo que éste corre en los dos segundos de intocable). Nadie es inmune por
no bajar: todo sentado está en la sala —de pie en su sitio de nacer si nunca abrió su canal, o
donde se quedó si lo cerró—, y se le puede golpear y robar. Quien cae le da BOTÍN a quien lo
tumbó: el movimiento `arcade:botin` entra en la mesa por una vía interna del núcleo (sin ruta
HTTP) y cada juego decide qué se lleva; una vez por minuto y pareja, y como mucho 6 por mesa y
minuto. Las reglas enteras están en `docs/COMBATE-Y-BOTIN.md` §7.

### 7.4 · La decisión que la sesión anterior dejó abierta (el reparto de Las Lindes)

**Camino 1: se baja el reparto entero y se acepta el repaisaje.** Las Lindes no se ha desplegado
nunca, así que nadie ha visto el paisaje que cambia; el seno de la plaza se sustituye por una
tabla literal de direcciones que consume UNA tirada, como hoy; y la ventana se cierra: en cuanto
un almiar decide si se pasa, moverlo deja de ser gratis.

### 7.5 · El plan que manda, por frentes en paralelo

Estado al cierre del 23-sep-2026. Todo está en la rama `botas-servidor` (worktree
`GameMasters-botas-servidor`), con la batería entera; nada se ha empujado.

| ronda | frente | estado |
|---|---|---|
| 0 | contrato común: el agujero del cajón, vados, rumbo al nacer, `andar.ts` (tics y 256 rumbos literales) | hecho (`f1ec033`) |
| 1 | Las Lindes: el reparto a `shared/` y su mundo de verdad (murallas, remates, villa, ermita) | hecho (`263c97a`, `a92d091`) |
| 1 | el paseo común en `escenas/paseo/`, por tics e interpolado; mandos táctiles en la app | hecho (`3a77490`) |
| 1 | el mundo del Burgo, igual en todas las calidades; el de Riberas desde la vista pública | hecho (`a4e4046`, `4204cac`) |
| 1 | el núcleo del servidor: modalidad, topes en la mesa, lectura barata, CORS con lista blanca, memoria perezosa; y los hallazgos del revisor adversario | hecho (`botas-nucleo`, fusionado) |
| 2 | el contrato del canal y el registro de mundos | hecho (`dbfd726`, `9848404`) |
| 2 | el canal en el aparato, en los tres juegos y los dos clientes | hecho (`5857bbc`, `f81d9d1`) |
| 2 | el canal en el servidor: sala por mesa, validación, fotos, desalojo, derivar por turno | hecho (`fbb80a3`…`0e34866`) |
| 2 | cuotas de conexión en el `upgrade` (tras un revisor adversario) | hecho (`cuotas`, fusionado) |
| 2 | la modalidad y su compuerta; el Burgo y Riberas a pie; Las Lindes en la app con su atlas y su juez | hecho (`c49bc24`, `13b5f78`, `d5eea02`, `6b6ba15`) |
| 2 | las piedras grandes de Las Lindes estorban; su mundo se recuerda por mesa | hecho (`botas-rocas`, `cache-lindes`, fusionados) |
| 3 | los contratos de la refriega y del botín | hecho (`b9f7674`, `db88dff`) |
| 3 | el botín en los tres reductores | hecho (`botas-botin`, fusionado) |
| 3 | la refriega y el botín en el servidor: golpe con rebobinado, caer y renacer cerca y a salvo, nadie inmune por no bajar, la vía interna de la mesa, topes, 4007/4008 | hecho (`c63d15f`…`36987c5`) |
| 3 | la refriega en el aparato: la G y el botón «Golpear», los clips (`caer` nuevo), los corazones | hecho (`5043dec`, `ebc3d1b`, `37cd0e2`) |
| 4 | la plataforma para escribir juegos deprisa (`docs/ESCRIBIR-UN-ARCADE.md` §9) | hecho: altas derivadas, robot genérico y arnés, contrato de pintor en la app, lienzo propio en el escritorio, `escenas/comun/` |

**Lo que sigue siendo de Miguel:** el inventario global y las cuentas (`docs/TABLERO-RECORRIBLE.md`
§6), las armas y el crafteo, medir `SALTOS_DE_CONFIANZA` en producción antes de desplegar —y
ahora no sólo lo pide el limitador HTTP: las cuotas por procedencia del canal también dependen de
él—, el disco de Render (`docs/COSTE-Y-ESCALA.md` §3), y el empuje a `main` y el APK.
