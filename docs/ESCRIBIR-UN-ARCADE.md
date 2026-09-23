# Escribir un arcade

**Todo lo que hay que tocar para que un juego de tablero nuevo entre en la Sala, se juegue en los
dos clientes, se vea en tres dimensiones y se pueda recorrer en Boots on Board — en el orden en
que se hace.**

Escrito el 23 de septiembre de 2026, y puesto al día el mismo día con la ronda de plataforma (§9).
`docs/ESCRIBIR-UN-JUEGO.md` es para las veladas, el OTRO motor; esto es para la Sala de Arcade,
cuyo contrato entero está en `docs/MOTOR-DE-ARCADE.md`. Si algo de aquí no coincide con el código,
gana el código: corre `npm run verificar` y créele a él.

> **Lo que cuesta, medido.** Las Lindes —el tercer arcade de tablero— fueron 58 ficheros y 21.000
> líneas. La mayoría es el juego mismo: reglas (3.500), escena y lobby (6.100), comprobadores
> (5.000 más el oro). La duplicación evitable era un 9 %, casi toda en los envoltorios de la app;
> tras la ronda de plataforma del 23-sep, las altas a mano de un juego nuevo pasan de unos 19
> toques a 13 (las que se podían derivar, de 8 a 2), cada pantalla de la app pierde entre 200 y
> 250 líneas de código que ahora pone la plataforma, y un robot genérico juega el juego nuevo sin
> escribir nada (§7).

---

## 0. Las tres reglas que no se negocian

1. **`shared/` son las reglas; `server/` es la autoridad.** El reductor, la proyección y el mundo
   de un juego viven en `shared/arcade/juegos/`. Si vivieran en `server/` no podrían correr en el
   móvil.
2. **El núcleo no nombra ningún juego.** `shared/arcade/*.ts`, `server/src/canal/`,
   `server/src/arcade/{mesas,arbitro}.ts`, `shared/mecanicas/{azar,canonico}.ts` están SELLADOS
   (`verify:nucleo-quieto`). Un juego nuevo no los toca: si parece que hace falta, lo que falta es
   una forma de DECLARARLO, no un `if` con tu nombre.
3. **Ningún juego es sólo para PC.** Lo que se ofrece en el escritorio se ofrece en la app el mismo
   día, o no se ofrece.

---

## 1. Las reglas — `shared/arcade/juegos/<juego>.ts`

- **El manifiesto**: once campos y dos ejes (`MOTOR-DE-ARCADE.md` §4). `sede: 'servidor'` para un
  tablero de varios aparatos; `tickHz: 0` si no hay reloj; `marcador` y `procedencia` son uniones
  cerradas y obligatorias (renunciar a verificar es una palabra que alguien tiene que escribir).
  `icono` es hoy una unión SELLADA de un solo valor, `'mando'`: un icono propio pide resellar.
- **El reductor**, puro: `avanzar(estado, movimiento, ctx)`. Nada de `Math.random`, `Date`,
  temporizadores, `for…in`, `sort()` sin comparador ni trigonometría (`verify:pureza`); el azar,
  sembrado y dentro del estado (`shared/mecanicas/azar.ts`); si hay coma fija, se multiplica con
  `por` de `shared/mecanicas/fijo.ts` y NUNCA con `>> 16` ni `Math.imul` (desbordan igual en los dos
  motores y el comprobador de determinismo lo certifica). No cierres sobre el `let` de un bucle:
  Hermes 0.12 no lo liga por iteración.
- **La proyección** (qué ve cada uno) y, con `secretos: true`, **`loSecreto`**: sin las dos el
  servidor no arranca. Un dato que aún no se puede revelar no debe existir en el objeto.
- **`opciones()`** mira la VISTA, nunca el estado. **`seAcabo`**.
- **Los movimientos `arcade:` son reservados**: sólo los mete el servidor (el tic; y en Boots on
  Board, `arcade:botin`). Ningún aparato puede mandar uno.
- **Si el juego se recorre (§6), atiende el botín**: `esBotin(movimiento)` DELANTE de su portillo
  de opciones —como el tic: nadie lo ofrece—; si `leerElBotin` da `null`, rechaza con motivo, y
  rechaza también sin partida en juego y si alguno de los dos no juega esta partida. Lo que se
  lleva va en una constante exportada (Riberas, una ficha al azar con su propio azar; El Burgo,
  hasta 100 € por su puerta del dinero; Las Lindes, hasta 3 puntos); sin nada que llevarse
  devuelve EL MISMO estado; nunca mueve el turno, el momento ni los plazos, y no puede dejar la
  partida atascada (el descarte de Riberas y la subasta del Burgo lo enseñan). `verify:botin`
  exige una prueba por cada juego del registro de mundos (`shared/arcade/juegos/botin.ts`).
- **El alta**: `instalarArcade({ manifiesto, avanzar, proyeccion, loSecreto, opciones, seAcabo })`
  en `shared/arcade/juegos/index.ts`, más sus reexportes. El diff de `shared/arcade/` que trae un
  juego nuevo tiene que ser VACÍO: ésa es la medida de que el núcleo no creció para él.

## 2. La traducción a tres dimensiones — `shared/arcade/juegos/<juego>-en-tres.ts`

Función pura de la VISTA a lo que pinta la escena (`tableroEnTres(vista)`), sin three. La usan los
dos clientes, el comprobador, y el registro de mundos (§6).

## 3. La escena — `escenas/<juego>/`

- **Los modelos**: se compilan al pack con los guiones de `escenas/scripts/compilar-*.ts` (el
  material bruto de KayKit vive en `arte/kaykit/`, ignorado por git: se copia de un worktree que lo
  tenga). El color va HORNEADO a vértice: el Hermes de la app no decodifica PNG.
- **Cada `.glb` nuevo es UNA fila** en `MODELOS_DE_NOMBRE_FIJO` (`escenas/ruta-de-modelos.ts`): el
  servidor registra una ruta literal por fila y el cliente la pide con `rutaDelModelo('<f>.glb')`.
  Nombre `^[a-z0-9-]+\.glb$`; `verify:mesa` pide cada fila y exige que lo de fuera pase de largo
  como una ruta que no existe.
- **Lo que ya está hecho, y se reúsa**: el reloj de arena (`escenas/reloj.tsx`), los dados
  (`escenas/dados.ts`), las marionetas KayKit (`escenas/aventureros/marioneta.ts`, con trece clips
  —`caer` incluido—), la cámara de mesa (`escenas/camara.ts`, `acercar.ts`), el juez de calidad
  (`juzgarCalidad` de `escenas/embarcadero/calidad.ts`: 120 fotogramas y `'plena'` o `'sobria'`),
  y el paseo (§6).
- **Lo común de toda escena, en `escenas/comun/`**: tus props extienden `PropsDeEscenaDeTablero`
  (`tablero.ts`: código, `traer`, calidad, cámara, `mandos`, `canal` y los tres avisos; sin
  `three`, lo lee el servidor) y declaras sólo lo tuyo. El aviso de listo y la medida son
  `usarArranqueYMedida(props, { llave: traer, alVencerElTope, midiendo })` (`arranque.ts`): llamas
  a `arrancar()` cuando lo tuyo ha llegado o ha fallado. Un aventurero KayKit es `usarLaFigura` +
  `usarMarioneta` + `<Marioneta de grupo>` (`marioneta.tsx`), y el clip lo pones tú en tu
  `useFrame` con `reproduce`. El reloj de arena se trae con `relojDe(traer)` (`reloj.ts`). Tu
  presupuesto se cuenta con `renglonesDeLasPiezas` y `sumaDeLosRenglones` (`presupuesto.ts`). No
  copies ninguna de estas: cada copia que había tenía ya su deriva.
- **El presupuesto**: triángulos contados con los del `.glb` real, y lo que se recorta en
  `'sobria'`. Un techo de PC en la app es un juego que no se puede jugar en un teléfono barato.

## 4. El lobby — El Muelle

Un tema en `escenas/embarcadero/tema.ts` (`TemaDelMuelle`: colores, puestos, figura). Si el lobby
es una escena nueva, su nombre en `TemaDelMuelle.escena` y su fila en `ESCENAS_DEL_MUELLE`
(`escenas/embarcadero/escenas-del-muelle.ts`), que leen los dos clientes: sin la fila no compila;
si reutiliza una escena, no hay fila. Su banco: una fila en `LOS_LOBBIES` de
`escritorio/src/banco-lobby.tsx` y una página con `data-lobby` (copia de `plaza3d.html`). El lobby
es donde se abre la mesa y donde se elige la modalidad. Si es una escena propia con coreografía, su
cámara es `usarElBucleDelLobby` (`escenas/comun/bucle-del-lobby.ts`): le das tu pose de reposo, la
mirada a quien llega, la grúa del zarpe y lo que pintas con la luz del zarpe; el tope de un lobby
es `TOPE_DE_UN_LOBBY`.

## 5. Los dos clientes

- **La app** (`app/`):
  - `app/src/arcade/<juego>-en-tres.tsx` es UNA sentencia:
    `export const X = pantallaPerezosa(() => import('./<juego>-en-tres-escena'), { rotulo, texto })`.
  - `<juego>-en-tres-escena.tsx` hace `export default` de
    `<LaMesaDeUnPintor arcade={JUEGO} Pintor={SuPintor} />` (`app/src/arcade/pintor-propio.tsx`),
    con el pintor declarado en el módulo. La plataforma pone el vestíbulo con su plazo, el latido,
    los nombres y la barra (`{laBarra}`); el pintor mete su `Canvas` en `RedDelLienzo` (que apunta
    el fallo en el parte con el nombre del juego), usa `ElTelon` si su mundo tarda en llegar,
    `usarLaCalidadDelAparato()` si su escena mide, y cae a `ElRespaldo` o a uno propio. No escribe
    `mesa.abrir`, `PLAZOS`, `BarraDeLaMesa` ni `componentDidCatch`: lo vigila `verify:sala`, que
    lee las pantallas de la carpeta (un juego nuevo queda vigilado sin tocar el guion).
  - El alta en `app/src/arcade/pintados.ts` (`LOS_QUE_PINTA`). Sin `Platform.OS` en las pantallas
    de juego (lo prohíbe `verify:sala`), y nada de `onClick`: en la app no llega. Los estilos de la
    mesa ya existen (`ESTILOS_DE_LA_MESA`): úsalos.
- **El escritorio** (`escritorio/`): `escritorio/src/<juego>-en-tres.tsx`, el alta en
  `escritorio/src/pintores.ts` (`LoQueVeElPintor`), sus reglas en `escritorio/src/estilo.css` y su
  banco para verlo sin servidor. Lo genérico del lienzo —`CamaraAerea` (con `callada` para ir a
  pie), `ElijeUna`, `CajaEnElLienzo`, la trampa de foco y su pila, `usarLosModelos`, `recordada`,
  `traerUnGlb`, `LimiteDelMundo`, `RAIZ_DE_LA_CASA`/`raizDelNavegador`, `elEstiloDeLaCinta`— se
  importa de `escritorio/src/lienzo-propio.tsx`, NUNCA de otro pintor: `verify:escritorio`
  comprueba que de `riberas-en-tres.tsx` sólo importa `pintores.ts` y que no hay una segunda pila.
- **Lo que los dos clientes de un juego hacen igual** —sus cámaras, el giro que se ajusta solo, la
  calidad, qué hace cada toque, el montaje del lienzo— va en un controlador en `escenas/<juego>/`
  que importan los dos (el ejemplo es `escenas/lindes/el-valle-en-la-mesa.ts`). Lo de Boots on
  Board se queda en cada cliente, porque cada uno lo construye con su `mesa.ts`.

## 6. Boots on Board — que se pueda bajar al tablero

Ver `docs/BOOTS-ON-BOARD.md` §7. El juego sólo DECLARA; todo lo demás es de la plataforma.

1. **Su mundo, en `shared/arcade/juegos/<juego>-mundo.ts`**: un `MundoDeclarado`
   (`shared/mecanicas/mundo.ts`) de la ESTRUCTURA, sacado de la vista pública y del código de mesa
   —nunca del estado opaco, que el aparato no tiene—:
   - `pisables` (se pisa), `vados` (se pisa a la mitad; `[]` si no hay agua); casillas centradas en
     `k · lado`, con la `y` creciendo hacia la `z` negativa.
   - `cuerpos`: cajas alineadas con los ejes de lo que estorba de verdad (murallas, edificios,
     poblados, y en Las Lindes las piedras que pasan de la cintura), con la huella MEDIDA en el
     modelo y no a ojo; a cuartos de vuelta, exactas.
   - `nace`: sitios donde se puede estar, con `rumbo` (0 es el norte, `−z`).
   - Sin trigonometría y sin nada que dependa de la calidad del aparato: lo que depende de ella es
     ADORNO, se queda en la escena y no se declara (el aparato puede chocar con él por su cuenta).
   - Si derivarlo es caro (Las Lindes monta su reparto losa a losa), que recuerde lo derivado POR
     MESA con un tope medido: el servidor tiene muchas mesas a la vez y el aparato una
     (`lindes-mundo.ts` lo enseña, y `verify:lindes-mundo` lo vigila contando).
2. **Una línea en `shared/arcade/juegos/mundos.ts`**: con eso el juego «se recorre», el servidor
   admite mesas `botas` de él y los clientes ofrecen la modalidad.
3. **En la escena**: `usarElPaseo` de `escenas/paseo/` con su mundo, los tres modos de cámara
   (mesa, hombro, ojos), `alturaEn` para pintar (el relieve: no decide nada), y la prop del canal
   (`usarElCanal` + `LosDemas`, `caido` al paseo y el cliente a `QuienAnda`) igual que la montan
   `escenas/lindes/Lindes.tsx`, `escenas/burgo/Burgo.tsx` y `escenas/andar-por-el-delta.tsx`.
4. **En los clientes**: en la app, `app/src/arcade/mandos-del-paseo.tsx` (la palanca, correr y el
   botón «Golpear») y el mirador táctil apagado a pie con `usarMiradorTactil(…, { apagado: aPie })` —ni gemelos ni quitarle el nodo al lienzo—; en el escritorio, sus teclas de cámara, la G
   para golpear y el rótulo de cómo se anda y se golpea.
5. **La refriega no se escribe**: el golpe, las vidas, caer y renacer los arbitra el servidor y los
   pinta el paseo común (clips `lanzar`, `golpe`, `caer`, `aparecer`, y los corazones sobre el
   nombre). El juego sólo atiende el botín (§1).
6. **Su comprobador de mundo**: `server/scripts/verificar-<juego>-mundo.ts`, con un paseo en un
   módulo SIN EFECTOS que se empaqueta y se corre en Node y en Hermes (copia el patrón de
   `verificar-mundo.ts` + `paseo-del-banco.ts`), con suelos de choques.

## 7. Los comprobadores

- Las reglas (`server/scripts/verificar-<juego>.ts`), la traducción (`-en-tres`), la escena
  (`escenas/scripts/verificar-<juego>-escena.ts`) y el mundo (§6).
- **Lo que te da gratis el robot genérico** (`server/scripts/robot-generico.ts`,
  `npm run verify:robot-generico -w server`): en cuanto el juego se da de alta con mesa,
  `opciones()` y `seAcabo`, se juega con tres semillas y dos vueltas sin escribir nada. Avisa, con
  la semilla, el paso y el movimiento, si una opción ofrecida se rechaza, no cambia nada o devuelve
  una copia; si algo revienta; si se ofrece algo al espectador, se usa `arcade:` o se repite un id;
  si la partida se corta o se atasca (el reloj no cuenta como avance); si un tipo ofrecido a menudo
  no se hace nunca; y si la misma semilla o el diario reejecutado no dan lo mismo. Un juego de mesa
  que no registre `opciones()` sale en rojo con su nombre.
- **Lo que NO te da**: jugar bien, las declaraciones (`declaracion: true`) ni tus reglas. Para el
  **oro** (`server/scripts/oro-arcade.ts`, lista `GUIONES`) y para comparar **Node y Hermes**
  (`server/scripts/guion-determinismo.ts`, `Tanda`) sigue haciendo falta tu robot puro
  (`server/scripts/robot-de-<juego>.ts`, sin red ni `node:`).
- **Los comprobadores nuevos, con el arnés** (`server/scripts/arnes.ts`):
  `const { comprobar, paso, nota, terminar } = arnes();` y al final `terminar({ escritas: N })`
  con el número exacto de hoy. Salidas: 0 verde, 1 rojo, 2 se saltó un bloque, 3 el guion
  reventó. Los guiones viejos no se migran por migrar.
- Las altas: el guion en `server/package.json` o `escenas/package.json`, y su entrada en
  `scripts/verificar-todo.mjs` con su `porque`. Las listas de juegos de los comprobadores de los
  clientes ya se DERIVAN de los registros (con un suelo con los de hoy): un juego nuevo no las toca.
- **Si tocas `shared/`, corre los seis guardianes**: `verify:pureza`, `verify:fijo`,
  `verify:nucleo-quieto`, `verify:fronteras`, `verify:determinismo`, `verify:procedencia`.
- **Cada comprobación nueva se ve ROJA a propósito** antes de darla por buena: rompe en una copia,
  corre, restaura. Un comprobador que no se ha visto fallar no se sabe qué vigila.
- **Los comprobadores corren con `tsx`, que no mira tipos**: el tipado lo dicen los `typecheck` de
  la batería. Y `tsx` puede cargar DOS copias de un módulo de `shared/` según por dónde se importe:
  un contador o una memoria leídos de la copia equivocada dan cero y un verde falso.
- **La batería entera** (`npm run verificar`) antes de fusionar a `main`, y nunca dos a la vez
  (usa puertos fijos).

## 8. Antes de desplegar

- `git push origin main` DESPLIEGA solo (Render): las variables que el arranque exige van ANTES.
- La app nueva sale por EAS (`app/COMPILAR.md`): se sube la versión en `app/app.json` y
  `app/package.json` a la vez.

## 9. Lo que se repetía, y cómo quedó

Medido el 23-sep-2026 (duplicación evitable ≈ 950 líneas por juego, casi todo en envoltorios), y
atacado el mismo día:

| qué | estado |
|---|---|
| un contrato de pintor en la app como `LoQueVeElPintor` del escritorio | HECHO: `pintor-propio.tsx`; Riberas −242 líneas de código, El Burgo −234, Las Lindes −206 (+298 del contrato), y Las Lindes recuperan el plazo, el parte de fallos y el aviso |
| un controlador por juego compartido por los dos clientes | HECHO para Las Lindes (`escenas/lindes/el-valle-en-la-mesa.ts`); el Burgo y Riberas, cuando se toquen |
| Riberas del escritorio sobre `lienzo-propio.tsx` en vez de sus copias | HECHO: −786 líneas, y ningún pintor importa ya de otro |
| altas derivadas: la tabla de escenas del muelle una vez, los modelos por lista, las listas de los comprobadores | HECHO: de 8 toques a 2 (a 1 si el lobby reutiliza una escena) |
| un arnés de comprobación y un robot genérico | HECHO: `arnes.ts` (lo usan tres comprobadores) y `robot-generico.ts` con `verify:robot-generico`; los 73 guiones viejos se quedan como están, a propósito |
| `escenas/comun/`: la marioneta, el arranque y la medida, `relojDe`, el presupuesto, las props de tablero y el bucle del lobby | HECHO: −550 líneas de código en las escenas, +369 en `comun/`; las copias que ya divergían se unificaron una a una |
| `tablero-en-linea.tsx` con su propio vestíbulo | HECHO: `LaMesaDeUnPintor` vive en el mueble genérico y el contrato la presta (al revés habría un ciclo de imports); el mueble es un pintor más |
| el mirador táctil de la app, que se apaga distinto en Riberas (un gemelo) que en el Burgo (`.enabled`) | HECHO: `usarMiradorTactil(…, { apagado })` apaga sus mismos gestos y el ratón; el gemelo de Riberas se desincronizaba de verdad (tras bajar a andar y volver, no se podía girar) |
| `callada` de `CamaraAerea` apagaba también las defensas de la página | HECHO: calla lo que mueve la cámara y deja la rueda y el menú del botón derecho defendidos; el Burgo del escritorio se calla con ella |
| la biblioteca de `escenas/embarcadero/` (`cargar`, `figuras`, `gestos`, `tipos`, `calidad`, `piezas`, `tinte`, `tema`), que usan todos | PENDIENTE: moverla a `escenas/comun/` son cientos de imports y reglas; no se hizo a propósito |

Ninguna tocó código sellado.
