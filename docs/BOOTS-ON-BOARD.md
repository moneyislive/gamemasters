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
4. **Deltas en la vista.** Hoy se manda la vista entera a cada jugador en cada revisión: 20 MB
   por partida, 20-26 TB/mes al millón. Es la línea más gorda de la factura y es del producto
   que ya existe.

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
