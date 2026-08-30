# Escribir un juego

**Lo que la plataforma te pide, lo que te da, y lo que ya no tienes que fingir.**

Escrito el 30 de agosto de 2026, después de sacar de la plataforma la mayor parte
de lo que era de CLUEDO. Si algo de aquí no coincide con el código, gana el
código: corre `npm run verificar` y créele a él.

---

## 1. Lo mínimo

Un juego son **dos cosas**: un manifiesto, que es un dato, y unas funciones, que
son «y entonces…». La regla que separa las dos mitades: si un humano lo diría
como una tabla, es dato; si lo diría como «y entonces pasa esto», es código.

```js
export function instalar(api) {
  api.registrarJuego(MI_MANIFIESTO);
  api.registrarAcciones('mi-juego', { … });
  api.registrarProyeccion('mi-juego', (game, sesion, quien) => ({ … }));
}
```

Eso es todo lo obligatorio. Lo demás —trofeos, imprimibles, dosieres, generador
de trama, voz del asistente— se añade cuando haga falta y se puede no tener.

**Dónde vive.** Dos sitios, y los dos funcionan:

- **Dentro del repositorio**, como CLUEDO, la Momia y las Sombras: su manifiesto
  en `shared/juegos/`, su código en `server/src/juegos/`, y una línea en
  `server/src/juegos/instalados.ts`.
- **Fuera**, como un `.mjs` o un paquete de `node_modules`, cargado con
  `JUEGOS_EXTERNOS=@lo-que-sea/mi-juego`. Recibe el mismo `api` y puede hacer
  exactamente lo mismo. Lo prueba `npm run verify:de-fuera`, que escribe un juego
  entero en un fichero temporal y lo juega.

---

## 2. El manifiesto, campo a campo

### Lo que te define

```js
id: 'mi-juego',
nombre: 'El nombre que se lee',
lema: 'Una frase que explique a qué se juega.',
```

### Tus cosas: las categorías

Sustituyen a `suspects`, `rooms` y `weapons`. Declara las que tengas, con los
nombres que quieras.

```js
categorias: [
  {
    id: 'exploradores',
    singular: 'explorador',
    plural: 'exploradores',
    minimo: 3,
    sonJugadores: true,   // ESTAS son las personas de la mesa
  },
  { id: 'cuevas', singular: 'cueva', plural: 'cuevas', minimo: 5, sonLugares: true },
  { id: 'hechizos', singular: 'hechizo', plural: 'hechizos', minimo: 0 },
],
```

- **`sonJugadores`** es la única que ata el juego al mundo real: de ella salen
  los emparejamientos de móvil, los correos y los dosieres. Como mucho una.
- **`sonLugares`** habilita el plano y las chinchetas. Un juego sin lugares
  simplemente no tiene pestaña de mapa.
- **`almacen`** es opcional y probablemente **no lo quieres**. Guardaba la
  categoría en uno de los tres campos heredados de CLUEDO; hoy solo sirve para
  que los tres juegos de casa sigan leyendo sus datos de siempre. Sin él, tus
  entidades viven en `game.entidades[tuCategoria]`, que es el sitio bueno.

### Tus fases, con tus nombres

```js
fases: {
  'antes-de-salir': ['exploracion'],
  exploracion: ['combate', 'descanso'],
  combate: ['exploracion', 'derrota'],
  descanso: ['exploracion'],
},
papelDeFase: {
  'antes-de-salir': 'espera',
  exploracion: 'turno',
  combate: 'turno',
  descanso: 'entreacto',
  derrota: 'fin',
},
```

`fases` es el grafo: qué puede seguir a qué. Una fase que no aparezca es una
fase por la que no pasas.

`papelDeFase` es lo que la plataforma necesita saber, y **es obligatorio
declararlo**: la plataforma no reconoce ningún nombre. Seis papeles:

| Papel | Qué significa | Qué hace la plataforma |
|---|---|---|
| `espera` | Aún no ha empezado | Ahí se emparejan los móviles; ahí abre la mesa |
| `turno` | El que se repite, abierto a acciones | `abrirRonda` va aquí |
| `entreacto` | El turno cerró y se habla | `cerrarRonda` va aquí |
| `decision` | Donde se decide la partida | Las acusaciones, el sellado, el consejo |
| `pausa` | Entre encuentros de una campaña | `cerrarEncuentro` va aquí |
| `fin` | Se acabó | Ahí y solo ahí se puede enseñar la respuesta |

Una fase sin papel declarado es `entreacto`, que es el que menos daño hace: no
deja entrar a nadie por error ni destapa nada.

Puedes tener **dos fases con el mismo papel** —exploración y combate son las dos
`turno`— y la plataforma prefiere la que sea alcanzable desde donde estés.

> ### ⚠ Antes de inventarte los nombres, lee esto
>
> El contrato dice que son libres y **a día de hoy lo son a medias**. Lo midió
> El Nudo de Valdehierro, que renunció a estrenarlos por esto (§11 de
> `docs/nudo/DISENO.md`):
>
> - **`live/proyeccion.ts` todavía compara por nombre en seis sitios.** Uno de
>   ellos decide si se compone `vista.desenlace`, así que con fases propias **la
>   mesa no ve nunca la solución**: la partida termina, se reparten los trofeos,
>   y en doce móviles no aparece nada. Sin error y sin aviso.
> - **`live/panel.ts`, `live/invitaciones.ts` y `routes/cuenta.ts`** hacen lo
>   mismo: la partida sale siempre «en curso» en el historial y nadie puede
>   aceptar una invitación desde la sala de espera.
> - **Cada fase se abre con una ruta POST escrita a mano** en `routes/live.ts`, y
>   solo existen las de los nombres de CLUEDO. `verify:juegos` comprueba que toda
>   fase alcanzable tenga la suya, pero **un nombre desconocido pasa sin
>   comprobarse**: el taller pinta el botón y da un 404 delante de la mesa.
>
> Mientras eso siga así, lo seguro es usar los cinco nombres de siempre
> —`lobby`, `ronda-abierta`, `ronda-cerrada`, `acusaciones`, `desenlace`— y
> **cambiarles las palabras**, que es lo que sí está resuelto: `avisos` y
> `rotulosDeAviso` mandan sobre los telones, y `client/src/juegos/palabras.ts`
> sobre los botones del taller. La Momia llama «vigilia» a su `ronda-abierta`,
> las Sombras «hora» y el Nudo «franja», y en la mesa nadie ve un nombre interno.

### Tus ejes, si hay algo que adivinar

```js
ejes: [
  { id: 'culpable', pregunta: '¿Quién lo hizo?', rotulo: 'Quién', categoria: 'exploradores' },
],
```

**Puede estar vacío.** Un juego donde no se adivina nada declara `ejes: []` y
no tiene acusación. Lo comprueba `npm run verify:sin-ejes`.

### Tus acciones

```js
acciones: [
  {
    id: 'atacar',
    rotulo: 'Atacar',
    fases: ['combate'],
    vecesPorTurno: 1,
    eligeDe: [{ campo: 'a', categoria: 'monstruos', rotulo: '¿A cuál?' }],
    pideNumero: [{ campo: 'dado', rotulo: 'Tu tirada', minimo: 1, maximo: 20, entero: true }],
  },
],
```

Cinco formas de pedir datos, y el motor las valida antes de llamarte:

| Forma | Qué pide | Llega en |
|---|---|---|
| `eligeDe` | Una entidad de una categoría | `datos.campo` |
| `eligeVarias` | Una lista, con `cuantas` y `ordenada` | `listas.campo` |
| `eligeOpcional` | Una entidad, o nada | `datos.campo` |
| `eligeLibre` | Texto **sin validar** — lo validas tú | `datos.campo` |
| `pideNumero` | Un número, con mínimo y máximo | `numeros.campo` |

`vecesPorTurno` cuenta **por ronda**, no por partida.

---

## 3. Las funciones

### `registrarAcciones` — qué hace cada cosa

```js
api.registrarAcciones('mi-juego', {
  atacar: ({ game, sesion, suspectId, datos, listas, numeros }) => {
    const estado = (sesion.estado ??= {});
    // …lo tuyo, donde quieras dentro de `sesion.estado`
    return { golpe: numeros.dado };
  },
});
```

Lo que devuelvas viaja de vuelta a quien pulsó. Si algo no se puede hacer, lanza
`AccionInvalida` con un mensaje que se lea bien: **eso lo ve alguien con el móvil
en la mano y la mesa puesta.**

### `registrarProyeccion` — qué ve cada persona

```js
api.registrarProyeccion('mi-juego', (game, sesion, suspectId) => ({
  vida: sesion.estado?.fichas?.[suspectId]?.vida ?? 10,
}));
```

**Esta función ES la defensa antitrampas.** El móvil es un entorno hostil: basta
con abrir las herramientas del navegador. Lo que devuelvas aquí lo puede leer esa
persona, así que no metas nada que no deba saber todavía.

La regla de la casa: un dato que aún no se puede revelar **no debe existir en el
objeto**, ni siquiera vacío. Los tres juegos lo hacen así y sus maestros de oro
lo congelan.

### Lo demás, cuando haga falta

| Registro | Para qué | ¿Obligatorio? |
|---|---|---|
| `registrarInicio` | Montar tu estado al abrir la mesa | Si tienes estado |
| `registrarCierre` | El acto con el que quien dirige lo resuelve | Si tienes uno |
| `registrarVeredicto` | Quién gana | Si se gana |
| `registrarTrofeos` | Qué medallas reparte | Si tienes |
| `registrarGenerador` | Cómo se escribe tu trama | Si tienes trama |
| `registrarAmpliacion` | Cómo la pones al día si se queda vieja | **Si tienes generador** |
| `registrarMaterial` | Tu material impreso de la velada | Si tienes |
| `registrarVoz` | Cómo habla tu asistente en el taller | Si tienes asistente |
| `registrarImprimibles` | Tus plantillas de documento | Si declaras documentos |
| `registrarDosieres` | El dosier de cada persona | Si repartes dosieres |

**«Si tienes generador» no es una recomendación.** `verify:juegos` lo comprueba:
un juego que sabe escribir una trama y no sabe ponerla al día deja la partida
marcada `ready` con los personajes que faltan sin escribir, sin dar ningún error.

---

## 4. Lo que ya NO tienes que fingir

De los siete peajes que la plataforma cobraba a un juego que no fuera un
misterio, **quedan dos**. Esto es lo que ha dejado de hacer falta:

- **Una víctima.** `Plot.victim` es opcional. Sin ella, la app se salta el bloque
  entero en vez de pintar «La víctima · —».
- **Un secreto, un motivo y una coartada por persona.** Los cuatro campos de
  `PlotCharacter` son opcionales.
- **Los nombres de fase de CLUEDO.** Ya los pones tú *en el manifiesto* — pero
  lee el aviso del §2 antes de estrenarlos: la plataforma todavía compara por
  nombre en ocho sitios.
- **Que tu gente viva en `suspects`.** Ya vive donde digas.
- **Un motivo y un relato del crimen** en la solución.

Lo que **sí** queda, dicho sin adornos:

- `Plot` sigue exigiendo `title`, `tagline`, `synopsis`, `setting` y un objeto
  `solution` aunque no haya nada que adivinar. Los dos primeros y `synopsis` y
  `setting` no son de CLUEDO —de qué va esto y dónde ocurre lo tiene cualquier
  juego— así que probablemente los quieras igual.
- `VistaJugador` sigue teniendo huecos con forma de misterio: `salas`,
  `objetos`, `misPistas`, `cronologia`. Los mandas vacíos y ya está. El arreglo
  de verdad es que esos bloques bajen al juego, como bajaron los dosieres y los
  imprimibles, y toca las pantallas del móvil.
- **`eligeVarias`, `eligeOpcional` y `eligeLibre` no llegan al móvil.**
  `live/proyeccion.ts` solo aplana `eligeDe` y `pideNumero` en
  `VistaJugador.acciones`, así que una acción declarada con cualquiera de las
  tres se pinta como un botón sin campos. **Si tu juego las usa, necesitas
  pantalla propia** — y con ella, una entrada en `PantallaDeApp` y publicar una
  versión nueva de la app. Lo pagaron las Sombras con sus contraseñas y el Nudo
  con sus minijuegos.
- **`turnos: 'por-turnos'` no lo escribe nadie.** El motor lo comprueba, pero el
  guardia es `sesion.turnoDe && …` y en todo el repositorio la única escritura de
  ese campo es ponerlo a `undefined`. Un juego por turnos se comporta como uno
  simultáneo **hasta que él mismo lo escriba y lo rote** desde su
  `registrarInicio` y sus reductores. Ningún juego lo hace todavía.

---

## 5. Cómo saber que va bien

```bash
npm run verificar
```

Veinte comprobadores. Los que más te importan:

- **`verify:juegos`** recorre `juegosInstalados()`, así que **tu juego entra solo**
  y comprueba que lo que declaras existe: acciones con reductor, fases con ruta,
  documentos con plantilla, medallas que no se cruzan con las de otro, y que tu
  material no use el vocabulario de otro juego.
- **`oro:verificar`** congela la salida completa de los juegos de casa. Si
  tocas algo común, aquí sale.
- **`verify:nucleo`** cuenta el vocabulario de CLUEDO en el tronco y falla si
  sube. Si tu juego necesita que el núcleo aprenda una palabra suya, algo va mal
  en el diseño — no en tu juego.

Y ponle el suyo. Un juego sin comprobador propio se rompe el día que alguien
toque el contrato, y nadie se entera hasta la velada.

---

## 6. La regla que gobierna todo esto

> **El núcleo no puede nombrar ningún concepto de ningún juego.**

Si escribiendo tu juego te encuentras queriendo añadir un campo al contrato
común, o un `if (juego === 'el-mio')` en un fichero de la plataforma, **para**.
Eso es exactamente cómo la plataforma acabó siendo CLUEDO con excepciones
colgando, y volver de ahí ha costado catorce commits.

Lo que necesites que la plataforma sepa de ti, **decláralo**. Si no hay forma de
declararlo, la que falta es una forma de declararlo — no un hueco con tu nombre.
