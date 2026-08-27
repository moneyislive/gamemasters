# El Misterio de la Momia — diseño del juego

> Documento maestro. Todo lo que se implemente sale de aquí. Si algo no está
> escrito en este fichero, no está decidido: pregúntalo antes de inventarlo.

## 0. Por qué este juego y no otro

Se elige a propósito un juego que **no cabe cómodamente** en lo que hoy sabe
hacer la plataforma. CLUEDO es: elegir sala, recoger pistas, acusar una tupla,
gana quien acierta antes. Si el segundo juego fuese otra variante de eso, la
plataforma parecería general sin serlo.

La Momia rompe cuatro supuestos de golpe, y cada rotura es deliberada:

| Supuesto de CLUEDO | Lo que hace la Momia |
|---|---|
| La respuesta es una tupla de ejes independientes | La respuesta es un **orden** de cinco ritos |
| Toda la información es verdadera | El saqueador puede **inyectar información falsa** |
| Guardarse lo que sabes es óptimo | Ninguna persona tiene datos suficientes: hay que **poner en común** |
| Gana una persona, la primera que acierta | Gana **un bando**: la expedición o el saqueador |

Ese es el valor del ejercicio: cada rotura señala una costura de la plataforma.

---

## 1. La ficción

1923. Una expedición ha abierto la tumba de un faraón. El sello estaba intacto
desde hacía tres mil años y ahora está roto. Desde esa noche, la maldición
avanza: el aire se enrarece, las lámparas se apagan solas, y quien pasa
demasiado tiempo en las cámaras profanadas empieza a marcarse.

Antes del amanecer hay que **volver a sellar la tumba**. El sellado es un ritual
de cinco ritos que deben ejecutarse **en un orden exacto**. Ese orden estaba
escrito en un papiro que se rompió al abrirse la cámara: cada fragmento que
aparece dice una sola cosa sobre el orden («el Rito del Aliento va después del
Rito del Agua»).

Pero el sello no se rompió solo. Alguien de la expedición lo abrió a propósito,
por encargo de un comprador. Ese **saqueador** no quiere que la tumba se selle:
quiere que amanezca con todos dentro y salir con la reliquia.

---

## 2. Cómo se juega, en una página

La partida se juega **alrededor de una mesa real**, con el móvil (o en papel).
Se organiza en **vigilias** (rondas). En cada vigilia:

1. **El presagio.** Quien dirige lee la narración de la vigilia. Se anuncia
   públicamente qué cámara está **profanada** esta noche.
2. **Explorar.** Cada persona elige, en su móvil, una cámara a la que entrar.
   - Sale con **un fragmento de papiro**: una restricción sobre el orden.
   - Si la cámara estaba profanada, sale además con **una marca**.
3. **Invocar el don.** Cada rol tiene un poder propio, una vez por vigilia.
4. **Ofrendar.** Se pueden dar amuletos a otras personas. Un amuleto quita una
   marca. **No puedes gastarlo en ti.** Esto obliga a hablar.
5. **Cierre.** Se hace público lo que se ha encontrado (parte), avanzan las
   marcas, y quien llega a tres queda **tocado**.

Cuando quien dirige lo decide, se abre **El Sellado**:

- Cada persona propone **un orden completo de los cinco ritos** y **señala a
  quien cree que es el saqueador**.
- El orden que **más votos** reúna es el que se ejecuta.
- Si es el correcto → la tumba se sella. **Gana la expedición** (todos menos el
  saqueador).
- Si es incorrecto → la maldición consume el campamento. **Gana el saqueador.**

---

## 3. Las piezas

### 3.1 Categorías de entidades

| id | singular / plural | mínimo | banderas | qué es |
|---|---|---|---|---|
| `expedicionarios` | expedicionario / expedicionarios | 4 | `sonJugadores`, `admiteFoto`, `admiteEmail` | Las personas de carne y hueso sentadas a la mesa |
| `camaras` | cámara / cámaras | 5 | `sonLugares`, `admiteFoto` | Las estancias de la tumba, repartidas por la casa real |
| `reliquias` | reliquia / reliquias | 3 | `admiteFoto` | Los objetos hallados. Uno de ellos es el que persigue el saqueador |
| `ritos` | rito / ritos | 5 | — | Los cinco ritos del sellado. **Exactamente cinco.** |

> **Nota sobre `ritos`:** son entidades como las demás (el Game Master puede
> renombrarlas y el agente se las propone), pero su número está fijado en cinco
> por diseño: con cuatro el puzle es trivial y con seis la sobremesa se hace
> larga. El manifiesto declara `minimo: 5`; la validación exige exactamente 5.

### 3.2 Los ejes de la respuesta

Un solo eje, y es deliberado:

| id | pregunta | rótulo | categoría |
|---|---|---|---|
| `saqueador` | ¿Quién rompió el sello? | Quién | `expedicionarios` |

El **orden de los ritos no es un eje**. Es un mecanismo propio del juego que
vive en el estado de la partida (§5). Se explica por qué en §8.1.

Al ser `expedicionarios` la categoría de jugadores, el eje `saqueador` es el
`ejeDeJugadores` del manifiesto, y de ahí sale gratis la regla de que quien es
señalado no gana delatándose.

### 3.3 Los dones

Cada expedicionario tiene un **rol** con un **don**: un poder de una vez por
vigilia. Los reparte la generación de la trama, no se eligen.

| don | rol típico | qué hace |
|---|---|---|
| `descifrar` | Epigrafista | Recibe un fragmento adicional, en privado |
| `sanar` | Médico | Quita una marca a alguien, sin gastar amuleto |
| `proteger` | Guardián | La persona elegida no recibe marca esta vigilia |
| `sobornar` | Mecenas | Ve qué cámara estará profanada la vigilia siguiente |
| `documentar` | Fotógrafo | Hace público uno de sus fragmentos privados |
| `excavar` | Capataz | Explora una segunda cámara, a cambio de una marca extra |
| `falsificar` | **solo el saqueador** | Hace público un fragmento **falso**, fabricado |

`falsificar` es el corazón adversarial del juego: en CLUEDO todas las pistas son
verdad. Aquí no, y la mesa tiene que aprender a dudar.

> El don del saqueador **no se anuncia**. En su dosier aparece como un rol
> normal con un don normal; `falsificar` se le añade en secreto.

### 3.4 Marcas, amuletos y el estado de tocado

- Cada persona empieza con **0 marcas** y **2 amuletos**.
- Explorar una cámara profanada da **1 marca**.
- Un amuleto quita **1 marca a otra persona**. Nunca a uno mismo.
- A las **3 marcas** se queda **tocado**: su propuesta de orden ya no cuenta en
  la votación del Sellado, aunque sigue jugando y sigue pudiendo señalar.

Estar tocado no elimina a nadie de la mesa: eso es veneno en un juego de salón,
porque quien queda fuera se aburre una hora. Lo que se pierde es **voz**, no
presencia.

---

## 4. El puzle del orden: la pieza técnica seria

Los cinco ritos tienen **un único orden correcto**. Nadie lo conoce entero.
Se reparte en **restricciones**, y cada fragmento de papiro contiene una.

### 4.1 Tipos de restricción

| tipo | forma | ejemplo |
|---|---|---|
| `antes` | A va antes que B | «El Rito del Agua precede al del Aliento» |
| `inmediatamente-antes` | A va justo antes que B | «Nada se interpone entre el Nombre y la Balanza» |
| `posicion` | A ocupa el lugar N | «El Rito del Silencio se pronuncia el primero» |
| `no-posicion` | A no ocupa el lugar N | «La Balanza jamás cierra el sellado» |
| `extremos` | A es el primero o el último | «El Barquero abre o cierra, nunca en medio» |

### 4.2 La garantía que el código debe dar

El generador **no puede** limitarse a escribir restricciones bonitas. Tiene que
garantizar, por construcción y comprobándolo:

1. **Consistencia**: existe al menos un orden que las cumple todas.
2. **Unicidad**: existe **exactamente uno**. Con 5 ritos hay 120 permutaciones:
   se comprueban todas por fuerza bruta. No hay excusa para no verificarlo.
3. **Suficiencia repartida**: el conjunto completo es resoluble, pero
   **ningún jugador por separado** puede resolverlo con solo sus fragmentos.
   Se comprueba igual: para cada jugador, sus fragmentos deben admitir ≥2
   órdenes.
4. **Minimalidad razonable**: quitar cualquier restricción del conjunto debe
   hacer que aparezca más de una solución. Sin esto se generan pilas de
   restricciones redundantes y el puzle se resuelve solo.

> Estas cuatro comprobaciones son de las que se prueban rompiéndolas a
> propósito: generar un conjunto redundante y ver fallar la comprobación 4.

### 4.3 Los fragmentos falsos

El saqueador puede publicar restricciones **falsas**: sintácticamente iguales,
pero incompatibles con el orden verdadero. El generador prepara un puñado de
candidatas falsas plausibles (que contradigan el orden real pero no de forma
obvia). No se reparten: se le ofrecen al saqueador cuando invoca `falsificar`.

---

## 5. El estado de la partida

Todo lo que el motor no interpreta va en `LiveSession.estado`, que ya existe
para esto. Forma exacta, bajo la clave `momia`:

```ts
interface EstadoMomia {
  /** El orden verdadero de los ritos, por id. NUNCA se proyecta al jugador. */
  ordenVerdadero: string[];
  /** Qué cámara está profanada en cada vigilia. Índice = ronda - 1. */
  profanadas: string[];
  /** Por expedicionario. */
  gente: Record<string, {
    marcas: number;
    amuletos: number;
    tocado: boolean;
    /** Fragmentos que tiene en la mano, por id. */
    fragmentos: string[];
    /** Su don, y si ya lo usó esta vigilia. */
    don: DonId;
    donUsadoEnRonda?: number;
  }>;
  /** Todos los fragmentos generados, verdaderos y falsos. */
  fragmentos: Record<string, {
    id: string;
    restriccion: Restriccion;
    texto: string;          // la frase que se lee, ya redactada
    falso: boolean;
    publico: boolean;
    /** Quién lo publicó, si alguien lo hizo. */
    publicadoPor?: string;
  }>;
  /** Propuestas del Sellado. */
  propuestas: Record<string, { orden: string[]; at: string }>;
  /** Resultado, cuando se ha ejecutado el sellado. */
  sellado?: {
    ordenEjecutado: string[];
    correcto: boolean;
    votos: Array<{ orden: string[]; apoyos: string[] }>;
    at: string;
  };
}
```

**Regla de oro, sin excepciones:** `ordenVerdadero`, `falso` y el don
`falsificar` **no salen nunca** en la proyección al jugador. Igual que en CLUEDO
la solución no viaja al móvil hasta el desenlace. Esto se prueba con una
comprobación que busca el orden verdadero dentro del JSON que recibe el móvil.

---

## 6. Las acciones

Declaradas en el manifiesto; ejecutadas por reductores propios del juego.

| id | rótulo | fases | veces/ronda | elige |
|---|---|---|---|---|
| `explorar` | Entrar en una cámara | `ronda-abierta` | 1 | una `camaras` |
| `ofrendar` | Dar un amuleto | `ronda-abierta`, `ronda-cerrada` | — (limita el recurso) | un `expedicionarios` |
| `invocar` | Usar tu don | `ronda-abierta` | 1 | depende del don |
| `proponer-orden` | Proponer el sellado | `ronda-abierta`, `ronda-cerrada`, `sellado` | 1 | los cinco `ritos`, ordenados |
| `senalar` | Señalar al saqueador | `ronda-abierta`, `ronda-cerrada`, `sellado` | 1 | un `expedicionarios` |

`senalar` se implementa con la maquinaria de acusación que ya existe (`ejes`),
para heredar gratis: una por persona y para toda la partida, no se puede
cambiar, y no se dice si has acertado.

`proponer-orden` **no** cabe en `eligeDe` (que sabe pintar selectores de una
categoría, no ordenar una lista). Necesita pantalla propia. Ver §8.2.

### 6.1 Una fase nueva

Se añade `sellado` a `LivePhase`. Grafo de fases de la Momia:

```
lobby          → ronda-abierta
ronda-abierta  → ronda-cerrada
ronda-cerrada  → ronda-abierta, sellado, desenlace
sellado        → desenlace
desenlace      → (fin)
```

Que `ronda-cerrada` lleve también a `desenlace` es a propósito: quien dirige
tiene que poder terminar sin pasar por el sellado si la noche se ha alargado.
(Es la misma lección que costó cara en CLUEDO: retirar una fase intermedia dejó
el desenlace sin puerta.)

---

## 7. Lo que genera la IA, y lo que garantiza el código

La división es la misma que ya usa CLUEDO y hay que respetarla:

**El modelo escribe el sabor:**
- El faraón, su historia, por qué la tumba estaba sellada.
- Nombres y descripciones de cámaras, reliquias y ritos (si el GM no los puso).
- El dosier de cada expedicionario: rol, persona pública, secreto, motivo,
  coartada, gancho personal. Personalizado con lo que el GM contó de cada
  invitado real.
- Quién es el saqueador y por qué lo hizo (su motivo tiene que doler).
- La narración de cada vigilia.
- **La redacción** de cada restricción: la frase de papiro que la expresa.
- El desenlace: reconstrucción, confesión, epílogo.

**El código garantiza la lógica:**
- El orden verdadero (permutación al azar).
- El conjunto de restricciones y sus cuatro garantías (§4.2).
- El reparto de fragmentos por cámara y vigilia.
- Qué cámara se profana en cada vigilia.
- El reparto de dones.
- Las restricciones falsas candidatas.

Si el modelo devuelve una redacción que no corresponde a la restricción que se
le pidió, la partida sería **irresoluble** y nadie se enteraría hasta la noche.
Por eso la redacción se valida: se vuelve a parsear la frase y se comprueba que
menciona los ritos correctos. No se le pide al modelo que invente lógica.

---

## 8. Lo que hay que generalizar en la plataforma

Estas son las costuras que el juego destapa. **Todas las modificaciones son
aditivas: CLUEDO no puede cambiar de comportamiento.** El maestro de oro
(`npm run oro:verificar`) y todos los `verify:*` tienen que seguir en verde.

### 8.1 Proyección del estado propio del juego

`LiveSession.estado` existe, pero **`VistaJugador` no tiene dónde ponerlo**. Hoy
un juego puede guardar lo suyo y no puede enseñárselo a quien juega.

**Propuesta:** añadir `VistaJugador.estadoDelJuego?: unknown`, que rellena una
función que registra cada juego (`registrarProyeccion(juegoId, fn)`), análoga a
`registrarAcciones`. La función recibe la sesión y el `suspectId` y devuelve
**solo lo que esa persona puede ver**. CLUEDO no registra ninguna y su vista no
cambia ni un byte.

### 8.2 Pantallas propias de un juego

`PantallaDeApp` es una unión cerrada y la app es un binario: un juego no puede
inventarse una pantalla. La Momia necesita dos que CLUEDO no tiene: **el papiro**
(los fragmentos y lo que se deduce) y **el sellado** (ordenar los ritos).

**Propuesta:** ampliar la unión con `papiro` y `sellado`, y que el fichero de
pantallas del `(juego)/_layout.tsx` las declare. Sigue siendo una unión cerrada
—que es lo correcto, porque la app se compila— pero crece con cada juego. El
informe debe proponer si a medio plazo conviene un mecanismo mejor.

### 8.3 Victoria por bandos

`winnerId` es un `string`. «Gana la expedición entera menos una persona» no cabe.

**Propuesta:** añadir `LiveSession.desenlaceDelJuego?: unknown` (o reutilizar
`estado`) y que la proyección del desenlace pueda declarar un resultado
colectivo. Mínimo aditivo; el informe propone la versión buena.

### 8.4 Tema por juego

Hoy el taller y la app tienen **un** tema (burdeos, art déco, CLUEDO). La Momia
necesita el suyo (arena, lapislázuli, oro viejo). Hay que sacar los colores a
tokens por juego sin romper el existente.

### 8.5 Acciones con forma propia

`eligeDe` sabe pintar «elige uno de esta categoría». No sabe ordenar, ni elegir
varios, ni elegir con cantidad. Es la limitación que ya avisaba el comentario de
`DefinicionDeRonda`. Para esta entrega se resuelve con pantalla propia; el
informe propone el modelo general.

---

## 9. Lo imprimible (partida en papel)

La Momia se tiene que poder jugar **sin móviles**. Documentos propios:

| documento | qué es |
|---|---|
| `guia-de-la-expedicion` | El manual de quien dirige: cómo se juega, vigilia a vigilia |
| `dosier-expedicionario` | Uno por persona: rol, don, secreto, motivo |
| `fragmentos-de-papiro` | Las cartas de restricción, para recortar y repartir |
| `carteles-de-camara` | Un cartel por cámara, para pegar en las puertas |
| `hoja-de-sellado` | Donde cada cual anota su orden propuesto |
| `tabla-de-marcas` | La cuenta de marcas y amuletos, para llevar a mano |
| `papiro-del-sellado` | La solución. **Solo para quien dirige.** |
| `informe-de-validacion` | Que el puzle es único y resoluble. Para quien dirige |

Estética: papiro, tinta sepia, jeroglíficos de adorno. **No** el burdeos de
CLUEDO.

---

## 10. Trofeos propios

| id | nombre | cuándo |
|---|---|---|
| `sellador` | El Sellador | Tu orden fue el ejecutado y era correcto |
| `ojo-de-horus` | Ojo de Horus | Señalaste al saqueador acertando |
| `incorrupto` | Incorrupto | Terminaste la partida con cero marcas |
| `mano-abierta` | Mano Abierta | Diste tus dos amuletos |
| `sombra` | La Sombra | Ganaste siendo el saqueador |

---

## 11. Lo que NO se hace en esta entrega

Para que quede escrito y nadie lo dé por olvidado:

- No hay campaña de varias sesiones (`intermedio` no se usa).
- No hay tablero generado propio: se reutiliza el plano de lugares que ya existe.
- No hay avatares 3D distintos: se reutiliza el sistema actual.
- No se toca el sistema de cuentas, invitaciones ni correo.

---

## 12. La regla que manda sobre todas

**CLUEDO no puede cambiar de comportamiento.** Ni una fase, ni un byte de su
vista, ni un texto de sus imprimibles. Cualquier cambio en código compartido se
hace aditivo y se demuestra con:

```bash
npm run oro:verificar -w server
npm run verify:partida -w server
npm run verify:segundo-juego -w server
npm run verify:sin-ejes -w server
npm run verify:campana -w server
```

Y cada regla nueva de la Momia se prueba **rompiéndola a propósito** y viendo
fallar su comprobación. Una comprobación que nunca se ha visto fallar no
demuestra nada.
