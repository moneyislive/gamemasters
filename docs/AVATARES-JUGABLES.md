# AVATARES JUGABLES: qué se hace a pie en cada tablero

Encargo de Miguel del 26-sep-2026, después de probar El Burgo, Riberas y Las Lindes con las vistas
«Al hombro» y «Sus ojos»:

> en el móvil no tengo los controles de móvil, sólo me aparece moverse con WASD […] me gustaría
> que los acabáramos para que se pueda jugar de verdad y que tenga sentido bajar a esos modos:
> conseguir dinero por la ciudad en monopoly e interactuar con los otros avatares, pelear con los
> otros avatares en Riberas para robarles recursos al matarlos, las armas se craftean con
> combinaciones de recursos que no existen aún, por eso creo que tenemos que hacerlo solo en el
> modo de boots on board, para que el juego de Riberas normal se mantenga como el original. Y en
> Carcassonne prefiero que te lo inventes tú.

Worktree `GameMasters-avatares`, rama `avatares`, nacida de `origin/main` en `0a63cb9`.

## 0 · Lo que había y lo que faltaba

**Había** (todo en `main` desde el 26-sep): el paseo en los tres juegos, el canal de Boots on
Board, la refriega arbitrada por el servidor (tres golpes y se cae, `docs/COMBATE-Y-BOTIN.md` §7)
y el botín por la puerta interna de la plataforma (`arcade:botin`): 100 € en el Burgo, una ficha
en Riberas, 3 puntos en Las Lindes. En la app hay palanca, «Correr» y «Golpear».

**Faltaba:**

1. **Mandos táctiles en la Sala web.** El cliente de escritorio (`escritorio/`, `/sala`) se abre
   también desde el navegador de un teléfono, y allí sólo se andaba con teclado: nadie escribía
   los `MandosDeFuera` de la escena, y el cartel decía «WASD». Es lo que vio Miguel.
2. **Algo que hacer a pie aparte de pegarse.** Bajar al tablero no daba nada que no diera la mesa.

## 1 · La regla que ordena todo: a pie es Boots on Board

Todo lo nuevo vive en mesas de la modalidad `botas`. Una mesa `normal` de cualquiera de los tres
juegos es, byte a byte, la de antes: el oro (`oro:arcade`) no se recaptura. Se consigue igual que
se consiguió con el botín: **los campos nuevos del estado son OPCIONALES y aparecen con su primer
uso**, y los movimientos nuevos sólo los mete el servidor de la sala de botas, que sólo existe en
mesas `botas`. En una mesa normal nadie puede ni recoger ni forjar, porque no tiene con qué.

## 2 · Los hallazgos: una pieza de la plataforma, no de cada juego

Lo que se encuentra por el tablero —dinero en el Burgo, materiales en Riberas, escudos en Las
Lindes— es la MISMA mecánica con tres tablas distintas.

- **Carrera, no «cada uno el suyo».** `TABLERO-RECORRIBLE.md` §6 dejaba la pregunta abierta. Se
  decide carrera: es lo que da sentido a encontrarse con los demás —llegar antes, pelearse por
  ello— y lo que pide Miguel con «interactuar con los otros avatares». El coste que el §6 temía
  (estado compartido en el núcleo sellado) no aplica: los brotes viven en la SALA del servidor,
  como las vidas, y al juego sólo llega el veredicto.
- **Dónde brotan:** `shared/mecanicas/hallazgos.ts` saca los sitios posibles de la ARENA del mundo
  de la mesa (una rejilla de puntos donde se puede estar), igual en los dos lados.
- **Quién los reparte:** la sala (`server/src/botas/`), con su propio azar —no el de la mesa: esto
  no entra en el diario—. Hay `broteDeLaMesa(n)` a la vez; uno recogido vuelve a brotar en otro
  sitio a los `REBROTE_MS`.
- **Recoger:** no hay mensaje del aparato. El servidor mira cada sitio que ACEPTA: si quien anda
  está de pie a `RADIO_DE_RECOGER` o menos de un brote, es suyo. Lo quita, lo dice a toda la sala
  (`recoge`) y mete en la mesa `arcade:hallazgo {para, clase}` por `meterDeLaPlataforma`.
- **Topes** (del servidor): `HALLAZGOS_POR_ASIENTO_Y_MINUTO` y `HALLAZGOS_POR_MESA_Y_MINUTO`. Un
  brote que no puede entrar por el tope se queda donde está.
- **Canal:** dos mensajes nuevos del servidor, `brotes` (la lista entera, al entrar y en cada
  cambio) y `recoge`. Un aparato viejo los tira sin más (`leerMensajeDelServidor` da `null`), así
  que `VERSION_DEL_CANAL` sigue en 1 y la app 1.7.0 no se queda fuera.
- **El juego decide qué vale** (`shared/arcade/juegos/hallazgo.ts`, `leerElHallazgo`): como el
  botín, el reductor lo atiende antes de su portillo, exige `quien === null` y comprueba la clase
  contra su tabla.

## 3 · El Burgo: ganarse la vida por la calle

| clase | qué es | euros | peso |
|---|---|---|---|
| `propina` | unas monedas en la acera | 10 | 6 |
| `cartera` | una cartera perdida | 25 | 3 |
| `maletin` | un maletín | 60 | 1 |

El dinero sale del Ayuntamiento (la banca) por el mismo camino que el sueldo de la Salida, con el
motivo `'calle'`, y lo cuenta el pregón: «Ana se encuentra una cartera: 25 €.» Con el dinero en
vilo (subasta o apuro abiertos o en cola) se aplica igual que el botín: nada, mismo estado. A quien
ha quebrado no se le da nada. Con los topes del servidor, lo más que se saca andando es del orden
de un sueldo de la Salida cada pocos minutos: cuenta, pero no sustituye a la mesa.

**Interactuar con los otros:** los brotes son de quien llega primero, y se ven desde lejos (el
maletín brilla): se corre a por ellos, se ve correr a los demás y se pelea por el sitio. El golpe
y el botín (100 € de quien cae a quien lo tumbó) ya existían. Lo que se pierde por el camino NO
crea dinero: el botín pasa euros de uno a otro, y sólo la calle los saca de la banca.

## 4 · Riberas a pie: materiales, forja y armas (sólo `botas`)

Cuatro materiales que Riberas normal no tiene: **hierro**, **pedernal**, **cuero** y **junco**.
Sólo se consiguen a pie (hallazgos, pesos 3/3/3/3) y sólo sirven para forjar. Van en las
`alforjas` de cada colono (campo opcional del estado; públicas: en la refriega se ve quién va
cargado).

| arma | receta | daño | alcance | cono (medio) |
|---|---|---|---|---|
| (puños) | — | 1 | 2,5 | 45° |
| **honda** | 2 cuero + 1 pedernal | 1 | 6 | 20° |
| **lanza** | 2 junco + 1 hierro | 1 | 4 | 30° |
| **hacha** | 2 hierro + 1 cuero | 2 | 2,5 | 45° |
| **maza** | 2 pedernal + 1 junco | 2 | 2 | 60° |

`riberas:forjar {arma}` lo manda el colono, cuando quiera mientras la partida se juega (no hace
falta que sea su turno: la refriega no espera a los turnos). Se lleva UN arma; forjar otra
sustituye a la que llevaba. Contrato y tabla en `shared/arcade/juegos/riberas-armas.ts`.

**El botín** de Riberas en `botas` pasa a ser: la ficha de siempre + un material al azar de las
alforjas de quien cae, y **el arma de quien cae se rompe**. Todo en el reductor, con su azar.

**El servidor** lee el arma de quien golpea de la vista pública de la mesa
(`armaEnLaRefriega` del registro de mundos) y usa su daño, su alcance y su cono. La vida sigue
siendo 3.

## 5 · Las Lindes a pie: escudos y leva (invención)

En Carcassonne las ciudades llevan escudos que valen puntos. Aquí los escudos andan sueltos por el
valle y se recogen a pie (una sola clase, `escudo`). Cada uno se puede gastar de dos maneras, y
esa elección es el juego:

- **Leva**: tres escudos alistan un labriego más (`lindes:leva`, +1 `sinPlantar`), como mucho
  `LEVAS_POR_JUGADOR` = 2 por partida. En Carcassonne los labriegos son lo que más escasea.
- **Guardarlos**: cada escudo sin gastar vale **1 punto en el recuento final**.

La leva se pide cuando se quiera mientras la partida se juega. **El botín** de Las Lindes en
`botas` añade un escudo a los 3 puntos de siempre.

## 6 · Los clientes

- **Sala web en un teléfono:** palanca, «Correr» y «Golpear» en DOM, sobre el lienzo, sólo CON EL
  DEDO; el cartel de cómo se anda dice «arrastra la palanca» en vez de «WASD». Escriben los mismos
  `MandosDeFuera` que la app.
- **Dedo o ratón, una sola fuente (27-sep-2026):** `escenas/paseo/aparato.ts`. Al abrir, dedo sólo
  si `(hover: none) and (pointer: coarse)` Y el sistema no es de ordenador (un Windows con ratón da
  `maxTouchPoints` 10 y hasta `coarse`: Miguel veía la palanca en su ordenador); luego manda el uso
  (un toque pasa a dedo; mover el ratón o pulsar W A S D / Mayúsculas / G, a teclado). Lo leen los
  tres pintores de la Sala, la pantalla completa, `/jugar` (`aparato-tactil.web.ts`) y la hoja por
  `:root[data-mando='dedo']`, que sustituye a todo `@media (pointer: coarse)`.
- **A pie, de lado:** en la app, `usarAPieApaisado` (`app/src/arcade/a-pie-apaisado.tsx`) bloquea en
  horizontal al bajar a andar en los tres juegos y devuelve la orientación en «La mesa». En la web
  (Sala y `/jugar`), con el dedo en un teléfono de pie, pantalla completa + `screen.orientation.lock`
  si se deja, y si no el aviso «Gira el teléfono», que se quita con «Seguir de pie».
- **El Burgo, «Recoger la mesa»:** a pie, en los dos clientes, quita la caja de los dados y el reloj
  (`bandejaRecogida`); TIRAR vuelve al carril y el dinero sigue en la cinta. Volver a la mesa la saca.
- **Los brotes se ven** en los tres juegos y los dos clientes (`escenas/paseo/`), con un aviso al
  recoger.
- **Forja** (Riberas) y **leva** (Las Lindes): paneles en los dos clientes, con las alforjas y los
  escudos de cada uno.

## 7 · Lo que sigue siendo de Miguel

El empuje a `main` y el APK. Nada de lo de aquí toca cuentas ni inventario global: los
materiales, las armas y los escudos son de la mesa y mueren con ella.
