# Escribir un arcade

**Todo lo que hay que tocar para que un juego de tablero nuevo entre en la Sala, se juegue en los
dos clientes, se vea en tres dimensiones y se pueda recorrer en Boots on Board — en el orden en
que se hace.**

Escrito el 23 de septiembre de 2026. `docs/ESCRIBIR-UN-JUEGO.md` es para las veladas, el OTRO
motor; esto es para la Sala de Arcade, cuyo contrato entero está en `docs/MOTOR-DE-ARCADE.md`. Si
algo de aquí no coincide con el código, gana el código: corre `npm run verificar` y créele a él.

> **Lo que cuesta, medido.** Las Lindes —el tercer arcade de tablero— fueron 58 ficheros y 21.000
> líneas. La mayoría es el juego mismo: reglas (3.500), escena y lobby (6.100), comprobadores
> (5.000 más el oro). La duplicación evitable es un 9 %, casi toda en los envoltorios de la app
> (§9). Lo que es de la plataforma está aquí, y cada punto dice su fichero.

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
- **El alta**: `instalarArcade({ manifiesto, avanzar, proyeccion, loSecreto, opciones, seAcabo })`
  en `shared/arcade/juegos/index.ts`, más sus reexportes. El diff de `shared/arcade/` que trae un
  juego nuevo tiene que ser VACÍO: ésa es la medida de que el núcleo no creció para él.

## 2. La traducción a tres dimensiones — `shared/arcade/juegos/<juego>-en-tres.ts`

Función pura de la VISTA a lo que pinta la escena (`tableroEnTres(vista)`), sin three. La usan los
dos clientes, el comprobador, y el registro de mundos (§6).

## 3. La escena — `escenas/<juego>/`

- **Los modelos**: se compilan al pack con los guiones de `escenas/scripts/compilar-*.ts` (el
  material bruto de KayKit vive en `arte/kaykit/`, ignorado por git: se copia de un worktree que lo
  tenga). El color va HORNEADO a vértice: el Hermes de la app no decodifica PNG. Cada `.glb` nuevo
  se da de alta en `escenas/ruta-de-modelos.ts` y en `server/src/routes/modelos.ts`.
- **Lo que ya está hecho, y se reúsa**: el reloj de arena (`escenas/reloj.tsx`), los dados
  (`escenas/dados.ts`), las marionetas KayKit (`escenas/aventureros/marioneta.ts`), la cámara de
  mesa (`escenas/camara.ts`, `acercar.ts`), el juez de calidad (`juzgarCalidad` de
  `escenas/embarcadero/calidad.ts`: 120 fotogramas y `'plena'` o `'sobria'`), y el paseo (§6).
- **El presupuesto**: triángulos contados con los del `.glb` real, y lo que se recorta en
  `'sobria'`. Un techo de PC en la app es un juego que no se puede jugar en un teléfono barato.

## 4. El lobby — El Muelle

Un tema en `escenas/embarcadero/tema.ts` (`TemaDelMuelle`: colores, puestos, figura) y su fila en
la tabla `ESCENAS`, que hoy está escrita DOS veces (`app/src/arcade/muelle-escena.tsx` y
`escritorio/src/muelle.tsx`). El lobby es donde se abre la mesa y donde se elige la modalidad.

## 5. Los dos clientes

- **La app** (`app/`): `app/src/arcade/<juego>-en-tres.tsx` (carga perezosa) y
  `<juego>-en-tres-escena.tsx`, y el alta en `app/src/arcade/pintados.ts` (`LOS_QUE_PINTA`). Sin
  `Platform.OS` en las pantallas de juego (lo prohíbe `verify:sala`), y nada de `onClick`: en la app
  no llega. Los estilos de la mesa ya existen (`ESTILOS_DE_LA_MESA`): úsalos.
- **El escritorio** (`escritorio/`): `escritorio/src/<juego>-en-tres.tsx`, el alta en
  `escritorio/src/pintores.ts` (`LoQueVeElPintor`), sus reglas en `escritorio/src/estilo.css` y su
  banco (`escritorio/banco-<juego>.html`) para verlo sin servidor.

## 6. Boots on Board — que se pueda bajar al tablero

Ver `docs/BOOTS-ON-BOARD.md` §7. El juego sólo DECLARA; todo lo demás es de la plataforma.

1. **Su mundo, en `shared/arcade/juegos/<juego>-mundo.ts`**: un `MundoDeclarado`
   (`shared/mecanicas/mundo.ts`) de la ESTRUCTURA, sacado de la vista pública y del código de mesa
   —nunca del estado opaco, que el aparato no tiene—:
   - `pisables` (se pisa), `vados` (se pisa a la mitad; `[]` si no hay agua); casillas centradas en
     `k · lado`, con la `y` creciendo hacia la `z` negativa.
   - `cuerpos`: cajas alineadas con los ejes de lo que estorba de verdad (murallas, edificios,
     poblados), con la huella MEDIDA en el modelo y no a ojo; a cuartos de vuelta, exactas.
   - `nace`: sitios donde se puede estar, con `rumbo` (0 es el norte, `−z`).
   - Sin trigonometría y sin nada que dependa de la calidad del aparato: lo que depende de ella es
     ADORNO, se queda en la escena y no se declara (el aparato puede chocar con él por su cuenta).
2. **Una línea en `shared/arcade/juegos/mundos.ts`**: con eso el juego «se recorre», el servidor
   admite mesas `botas` de él y los clientes ofrecen la modalidad.
3. **En la escena**: `usarElPaseo` de `escenas/paseo/` con su mundo, los tres modos de cámara
   (mesa, hombro, ojos), `alturaEn` para pintar (el relieve: no decide nada), y la prop del canal
   (`usarElCanal` + `LosDemas`) igual que la monta `escenas/lindes/Lindes.tsx`.
4. **En los clientes**: en la app, `app/src/arcade/mandos-del-paseo.tsx` y el mirador táctil
   apagado a pie; en el escritorio, las teclas 1/2/3 y el rótulo de cómo se anda.
5. **Su comprobador de mundo**: `server/scripts/verificar-<juego>-mundo.ts`, con un paseo en un
   módulo SIN EFECTOS que se empaqueta y se corre en Node y en Hermes (copia el patrón de
   `verificar-mundo.ts` + `paseo-del-banco.ts`), con suelos de choques.

## 7. Los comprobadores

- Las reglas (`server/scripts/verificar-<juego>.ts`), la traducción (`-en-tres`), la escena
  (`escenas/scripts/verificar-<juego>-escena.ts`) y el mundo (§6).
- Un **robot** puro (`server/scripts/robot-de-<juego>.ts`, sin red ni `node:`) que juegue una
  partida entera: con él se congela el **oro** (`server/scripts/oro-arcade.ts`, lista `GUIONES`) y
  se compara el juego entre **Node y Hermes** (`server/scripts/guion-determinismo.ts`, `Tanda`).
- Las altas: el guion en `server/package.json` o `escenas/package.json`, y su entrada en
  `scripts/verificar-todo.mjs` con su `porque`. Y las listas literales que todavía hay en
  comprobadores de clientes (`app/src/comprobadores/verificar-sala.mjs`, `CON_MUELLE` en
  `escritorio/scripts/verificar-escritorio.tsx`).
- **Si tocas `shared/`, corre los seis guardianes**: `verify:pureza`, `verify:fijo`,
  `verify:nucleo-quieto`, `verify:fronteras`, `verify:determinismo`, `verify:procedencia`.
- **Cada comprobación nueva se ve ROJA a propósito** antes de darla por buena: rompe en una copia,
  corre, restaura. Un comprobador que no se ha visto fallar no se sabe qué vigila.
- **Los comprobadores de escena corren con `tsx`, que no mira tipos**: el tipado lo dicen los
  `typecheck` de la batería.
- **La batería entera** (`npm run verificar`) antes de fusionar a `main`, y nunca dos a la vez
  (usa puertos fijos).

## 8. Antes de desplegar

- `git push origin main` DESPLIEGA solo (Render): las variables que el arranque exige van ANTES.
- La app nueva sale por EAS (`app/COMPILAR.md`): se sube la versión en `app/app.json` y
  `app/package.json` a la vez.

## 9. Lo que todavía se repite, y dónde se ataca

Medido el 23-sep-2026 (duplicación evitable ≈ 950 líneas por juego, casi todo en envoltorios):

| qué | dónde | ahorro por juego |
|---|---|---|
| un contrato de pintor en la app como `LoQueVeElPintor` del escritorio: vestíbulo, latido, barra, respaldo al retablo y calidad pasan a la plataforma | los tres `app/src/arcade/*-en-tres-escena.tsx` | ≈ 230 líneas, y se acaba la deriva (la app de Las Lindes ya había perdido el selector de plazo y el aviso de fallo) |
| `escenas/comun/`: la marioneta envuelta, el gancho de arranque y medida, un único `relojDe` | cinco envoltorios de marioneta y cinco bucles de arranque | ≈ 135 |
| un controlador por juego compartido por los dos clientes | p. ej. los botones de cámara de Las Lindes, escritos dos veces | ≈ 70 |
| altas derivadas: `ESCENAS` dentro de `tema.ts`, `/modelos/:fichero` con lista permitida, listas de los comprobadores derivadas | ocho sitios a mano | de 8 toques a 4 |
| un arnés de comprobación y un robot genérico sobre `opcionesDeArcade` | 73 guiones con su propio `comprobar` | ≈ 135 |

Ninguna toca código sellado.
