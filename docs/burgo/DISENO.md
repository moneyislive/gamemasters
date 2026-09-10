# EL BURGO — el diseño definitivo (1 de 3: qué es, lo irreversible, las reglas, la vista, la traducción)

> Si algo de aquí no coincide con el código, gana el código: corre `npm run verificar`
> desde la raíz mirando el CÓDIGO DE SALIDA (nunca la última línea) y créele a él.
>
> Escrito el 9 de septiembre de 2026 sobre el worktree `GameMasters-ensanche`, rama
> `burgo` (HEAD `c723e25`, fusión de la rama del lobby; el commit `caa310b` ya trae
> `escenas/burgo/piezas.ts`, `escenas/scripts/compilar-burgo.ts`,
> `escenas/scripts/verificar-burgo-modelos.ts`, `escenas/modelos/burgo.glb` y la fila
> `burgo · modelos` de `scripts/verificar-todo.mjs`: TODO ESO ESTÁ VERSIONADO; lo que falta
> es la RUTA HTTP del `.glb`). Sale de un panel de tres propuestas juzgadas por dos revisores
> adversarios contra el árbol de verdad; parte de la propuesta «el riesgo primero», injerta
> lo rescatado de las otras dos y corrige cada contradicción con el árbol que los jueces
> señalaron, yendo al código donde hubo duda.
>
> Es el CONTRATO del que parten cinco equipos EN PARALELO: reglas (`shared/`), escena
> (`escenas/burgo/`), app (Expo), escritorio (Vite), lobby (`escenas/embarcadero/tema.ts`),
> y el sexto que escribe comprobadores. Las interfaces TypeScript de aquí son definitivas:
> quien necesite cambiar una la cambia AQUÍ primero y avisa.
>
> Las tres partes: **[1 · qué es, irreversibles, reglas, vista, traducción](DISENO.md)** ·
> [2 · escena, clientes, lobby](DISENO-2.md) · [3 · comprobadores, fases, ficheros,
> riesgos, fuera de alcance](DISENO-3.md).

---

## 0. Qué es y por qué se construye así

**El Burgo** (`id: 'burgo'`) es el sexto arcade de la Sala: un juego de comprar solares
de una ciudad de hoy —«El Burgo» es también su topónimo—, cobrar rentas a quien cae en
ellos, alzar casas y hoteles, con dos dados, la Comisaría, dos mazos de cartas (Sucesos y
el Fondo Vecinal), hipotecas, subastas, tratos y quiebra. Lo gobierna entero el reglamento
`REGLAS-EL-BURGO.md` (§0 vocabulario, §1 las cuarenta casillas, §2–§10 el juego, §11 las
treinta y dos cartas, §12 las decisiones para la mesa en línea); este diseño no repite el
reglamento: dice cómo se convierte en código.

**Nota legal, sin adornos.** El Burgo es una CREACIÓN PROPIA sobre una mecánica de dominio
público: la patente del juego del que desciende caducó en 1921, y las reglas de un juego no
son objeto de copyright ni de patente. Lo que la ley y las tiendas protegen es la
EXPRESIÓN —nombre, marca, arte, textos— y aquí la expresión es nuestra entera: el nombre
visible, las cuarenta calles, los textos de las cartas, las piezas (KayKit, CC0) y la
escena, con los cuarenta nombres de calle inventados y sin parecido con los de ninguna
edición comercial. Ninguna marca ajena se nombra en este documento, en el código ni en los textos
visibles, ni siquiera para decir que no se nombra (commit `a61c77c`); `verify:procedencia`
barre las cadenas literales de `shared/arcade/juegos/**` contra
`server/scripts/marcas-registradas.ts`, y `verify:burgo-modelos` barre con las marcas
partidas en trozos los ficheros del Burgo que aquél no ve (`escenas/burgo/`, guiones, y
—ampliado en este trabajo— los pintores de los dos clientes y esta carpeta `docs/burgo/`).
Ninguna fórmula de atribución a otro juego, en ningún texto. Los nombres de las calles no coinciden con los de ninguna edición
comercial. En el manifiesto, `procedencia: { tipo: 'dominio-publico' }`: es la etiqueta
que `shared/arcade/tipos.ts` describe como «reglas de dominio público: charadas, parchís,
la oca, el dominó», o sea un JUEGO clásico cuyas reglas son de todos, que es exactamente
esto; `mecanica-generica` está descrita como «piezas atómicas que no son un juego» y no
cuadra, y `creacion-propia` mentiría sobre las reglas. Quien lea el manifiesto verá el
porqué encima del campo, como en La Frente.

**Por qué se construye así.** «Igual de profesional que Riberas» quiere decir tres cosas
concretas en esta casa: (1) las reglas viven ENTERAS en `shared/arcade/juegos/burgo*.ts`
con el servidor como única autoridad y sin tocar un byte del núcleo sellado; (2) el juego
se juega en la app (Expo: web y nativo) y en el escritorio (Vite) con un tablero 3D
propio, y ADEMÁS se juega entero en el retablo SVG de respaldo cuando el `.glb` no llega
o el lienzo cae; (3) todo lo que se afirma aquí lo mide un comprobador que está en la
batería, con vacuna vista caer, porque en este árbol ya hubo verde falso por lista fija,
por filtro roto y por un robot que decía jugar y no jugaba. La escena reutiliza el Muelle
(seis aventureros de KayKit, cámara, gestos, tinte, carga) y los dados 3D, y añade el
anillo del burgo con las 73 piezas ya compiladas en `burgo.glb`.

**Vocabulario que se lee en pantalla** (del reglamento §0, y es el ÚNICO admitido en
rótulos, ayudas, crónica y aviso): euros («€»), el Ayuntamiento, solar, barrio, estación,
servicio, casa, hotel, hipoteca/hipotecar/deshipotecar, subasta, la Comisaría, la Salida,
el Descanso, ¡A comisaría!, el Impuesto, la Tasa, Sucesos, el Fondo Vecinal,
«barrio entero» / «la calle es tuya», el Salvoconducto, quiebra, apuro.

El juego SIGUE LLAMÁNDOSE «El Burgo»: los identificadores del código no se tocan
(`BURGO`, `MazoId: 'pregon' | 'arca'`, `presa`, `posada`, `almoneda`, `empeno`…), y lo que
cambió es sólo lo que se LEE. Un identificador viejo con un rótulo nuevo no es una deuda:
es lo que evita reescribir el diario, el oro y las mesas guardadas.

---

## 1. Las decisiones que no se pueden deshacer después

Numeradas, con su porqué. Cambiar una de éstas después del primer commit de su fase
obliga a reescribir a más de un equipo.

1. **Un fichero de reglas y su tabla, sin tocar el núcleo.** `shared/arcade/juegos/burgo.ts`
   (estado, reductor, tic, proyección, opciones, secreto, fin, tablero declarado),
   `burgo-tablero.ts` (las 40 casillas y las 32 cartas como DATO, sin una regla dentro) y
   `burgo-en-tres.ts` (traducción vista→escena, sin `three`). Alta en `juegos/index.ts`
   con `instalarArcade<EstadoDelBurgo | undefined, unknown>` y reexportación UNO A UNO
   (nunca `export *`). Diff vacío en los trece sellados de `oro-arcade/nucleo.json`; el
   literal `'burgo'` no aparece en ninguno. Las mecánicas nuevas van a
   `shared/mecanicas/{anillo,hacienda,mazo}.ts` (libres) y `tirarDosDados` NO va a
   `azar.ts` (sellado): los dados son `enteroEntre` dos veces encadenadas en `burgo.ts`.
2. **Manifiesto**: `{ id: 'burgo', nombre: 'El Burgo', gancho, icono: 'mando', jugadores:
   { minimo: 2, maximo: 6 }, sede: 'servidor', tickHz: 0, mueble: 'tablero', secretos:
   true, marcador: { tipo: 'ninguno' }, procedencia: { tipo: 'dominio-publico' } }`.
   `tablero` y nunca `escena` (`escena` apaga el escritorio y los binarios publicados);
   `secretos: true` porque el azar sembrado y el orden de los dos mazos son secretos
   aunque el dinero sea público; `ninguno` porque con `tickHz 0` no hay récords (409
   `sin-reloj`); seis porque son seis los amarres del Muelle y seis los colores.
3. **Todo entero, todo público salvo el azar y los dos mazos.** `loSecreto = [azar,
   ...pregon, ...arca]` con series distinguibles (`'p07'`, `'a12'`); la carta que sale se
   publica como NÚMERO de la tabla (`ultimaCarta.carta: 1..16`), los Indultos en mano como
   cuenta pública; ningún motivo de rechazo nombra una carta que no haya salido.
4. **La máquina de fases vive en el estado** (`momento` + `paso` + `luego`), no en un
   reloj. **`turnoDe` apunta SIEMPRE al asiento del que se espera algo** (el pujador, el
   endeudado, el del turno) y `duenoDelTurno` dice de quién es el turno de verdad. Porque
   la mesa sólo reprograma `venceEn` cuando cambia `turnoDe` en la vista del espectador
   (`mesas.ts:1677` `empiezaTurnoNuevo`, `:2508` en el camino de `mover`): si el pujador
   no fuera `turnoDe`, un tercero pujando prorrogaría el plazo del ausente sin límite.
5. **El tic juega por el ausente lo mínimo que dicta el reglamento §12**: tira y resuelve,
   no compra (abre la almoneda), en almoneda pasa, en apuro el Concejo liquida en orden
   determinista y si no llega quiebra; en `reuniendo` y `terminada` devuelve EL MISMO
   objeto. **Gasta azar sólo donde el propio jugador lo gastaría (los dados)**: se aparta
   de Riberas (`colocarPorElAusente`, `riberas.ts:4064-4069`, no gasta) a sabiendas y por
   el reglamento; es reproducible porque cada `arcade:tic` va al diario con su contexto
   (`arbitro.ts:426-453`, `reejecutarEn` en `shared/arcade/index.ts:719`). Lo que no puede
   pasar, y `verify:burgo` lo exige: que el tic deje la mesa en un estado del que sólo
   sale un humano.
6. **La almoneda es una fase con relevo por asiento** (`pujaDe` rota; el tic = pasa), nunca
   «todos a la vez»: un solo plazo por mesa. **El sorteo de salida se resuelve DENTRO de
   `EMPEZAR`** con el azar del estado (empates repetidos entre los empatados, tope de 12
   rondas), sin fase `sorteando`: una fase interactiva más es una fase más que vencer,
   animar y comprobar, y un ausente la bloquearía antes de empezar. La escena lo anima
   igual desde los sucesos `sale`.
7. **Puja libre y trato son familias con `declaracion: true`**, con `cabeEnLaPuerta`
   exigiendo EXACTAMENTE los campos declarados; las tres pujas fijas (`pujar:minimo`,
   `pujar:+50`, `pujar:+100`) son opciones normales para que el respaldo SVG puje con
   botones. Hasta **3 tratos abiertos por proponente**; propone el del turno O cualquiera
   al del turno (reglamento §8); caducan al relevar el turno (`enElTurno <
   turnosAbiertos`).
8. **«Lo que acaba de pasar» viaja en la vista como `jugada` + `sucesos[]`**: la lista de
   sucesos del ÚLTIMO cambio (tope 64, se cortan los primeros y se conserva el final), con
   `jugada` como sello. Es la única forma de que el retablo (no anima) y la escena (anima)
   lean la misma vista; la escena anima lo que hay entre la `jugada` que vio y la que llega,
   y si saltó más de una deriva una lista gruesa.
9. **Respaldo SVG jugable en móvil: cuatro tiras de diez casillas y NINGÚN `toque` en
   caras ni nudos.** `app/src/arcade/retablo.tsx:113, 390-409`: la capa de dedos de 44 px
   existe SÓLO para líneas y nudos; una cara responde a su tamaño dibujado (en 390 px, un
   anillo literal da casillas de 29 px y cuatro tiras de ~36 px, las dos por debajo del
   dedo), y `opcionesSueltas` (`tablero-declarado.ts:284-297`) QUITARÍA de `acciones` lo
   que ya fuera toque. Así que el retablo es MAPA y se juega por `acciones` (≥ 44 px en
   los dos retablos) + `paneles`; `verify:burgo` afirma `caras.every(c => c.toque ===
   null)`.
10. **La casilla mide 8 de ancho × 14 de fondo; la esquina 14 × 14; tres bandas.**
    `LADO_DE_CASILLA = 6` de `piezas.ts` se queda como lo que es —la losa de la Mazmorra— y
    NO se recompila el `.glb`. Con 6 × 6 no cabe nada (medido: torre-a 5,43 × 6,31; iglesia
    5,63 × 6,32; casas 2 × 2 = 5,1; carril 1,5) y la muralla de 10,94 no cierra un lado de
    54. Con 8 de ancho caben de frente 16 de 18 edificios sin escalar (≤ 7,6); las tres
    bandas, de dentro afuera: **acera** de color del barrio 5,5 (donde se alzan las casas:
    2 × 2 de 5,1 caben A ESCALA 1), **calle** 3,5 (seis peones en 3 × 2 y el aventurero) y
    **solar** 5 (el edificio, que puede desbordar hacia FUERA hasta 4 porque fuera no hay
    vecino). Ninguna pieza se escala por instancia: la cabecera de `piezas.ts:30-44` dice
    que la escala va horneada y la escena instancia a 1, y se respeta.
11. **UN aventurero en el tablero a la vez** (el que mueve); los seis asientos están SIEMPRE
    como peón teñido. Con las cifras medidas del `.glb` (exploradora 8.900) el tablero lleno
    con seis sentados y un aventurero queda en ≈ 104.300 triángulos; con dos, 113.200 > los
    110.000 de `escenas/embarcadero/presupuesto.ts:24`. El anterior se desvanece ANTES de
    que aparezca el siguiente (sin solape). El hueco de la tercera persona y del segundo
    aventurero queda: `FiguraEn3D` trae `figura` para los seis y la escena decide cuántos
    monta.
12. **La posada no es la taberna del pack.** La pieza `posada` (2.992 tri, 6,41 × 7,29) no
    cabe en la acera y doce serían 35.904 triángulos. La posada se pinta como `casa` teñida
    (escala 1, centrada) con una `bandera` teñida clavada en el tejado (176 tri): «la casa
    grande con estandarte». La taberna se queda en el `.glb` para la Plaza del lobby. La
    cabecera de `piezas.ts` gana un párrafo que lo dice.
13. **Seis colores de asiento PROPIOS, distintos de las ocho aceras, medidos.** Los barrios
    se llaman por su color en el reglamento (pardo, celeste, rosa, naranja, rojo, amarillo,
    verde, azul), así que la paleta de Riberas (rojo, azul, oro, verde, malva, naranja) NO
    sirve: tres peones se confundirían con su acera. `COLORES_DEL_BURGO` = marfil, azabache,
    violeta, turquesa, coral, lima (§2.1), y `verify:burgo` mide la distancia contra cada
    acera (máximo por canal ≥ 60/255 y suma ≥ 100) y el blanco sobre cada acera ≥ 3:1. El
    Muelle copia esta paleta (`tema.ts`) y `verify:embarcadero` la contrasta por regex.
14. **Cámara: `escenas/acercar.ts` se parametriza, no se duplica.** `MAS_CERCA`,
    `MAS_LEJOS` y `ALTURA_MINIMA_DEL_OJO` son constantes de módulo dentro de `factorValido`
    (l.77-80) y `ojoYMira` (l.196), y `verify:escena:4343-4349, 4406-4409` las clava con el
    ALCANCE del delta. Se añade un parámetro opcional con el valor de siempre por defecto
    (`factorValido(factor, limites = LIMITES_DE_SALIDA)`, `acercando(c, pasos, limites?)`,
    `pellizcando(c, alEmpezar, escala, limites?)`, `ojoYMira(c, alcance, ojo, alturaMinima
    = ALTURA_MINIMA_DEL_OJO)`); `verify:escena` sigue verde y el Burgo pasa los suyos.
15. **`escenas/embarcadero/tinte.ts` gana la referencia de azul por parámetro**
    (`tenirGeometria(g, hex, referencia = AZUL_DEL_PACK)`, `tenir`, `colorTenido`): las
    fichas de Board Game Bits tienen su azul (`AZUL_DE_LAS_FICHAS = [36,126,187]` en
    `burgo/piezas.ts`) y hoy `tinte.ts:67-72` fija el del hexagonal como constante. Valor
    de siempre por defecto: `verify:embarcadero` sigue verde.
16. **La marioneta se extrae** de `escenas/embarcadero/aventurero.tsx:118-178` (`giroCorto`,
    `Marioneta`, `montaMarioneta`, `desmontaMarioneta`, `reproduce`, hoy PRIVADAS) a
    `escenas/aventureros/marioneta.ts`, y `aventurero.tsx` lo importa. `juzgarCalidad` se
    extrae de `app/src/arcade/muelle-escena.tsx:106` a `escenas/embarcadero/calidad.ts`
    porque `escritorio/` no puede importar de `app/` (`verify:fronteras`).
17. **Dados con PAR.** `escenas/dados.ts:356-360` lee la SUMA y `repartoDeLaTirada` (l.328)
    inventa el par: para dobles no vale. `escenas/burgo/dados-del-burgo.ts` es la máquina
    hermana con `VistaDeLosDadosDelBurgo { par, tirado, sello }`; el estado y la vista
    llevan `tirada: [n, n]`.
18. **El escritorio elige el pintor por TABLA** (`escritorio/src/pintores.ts`,
    `PINTORES_PROPIOS`, espejo de `LOS_QUE_PINTA` de la app) y la pantalla completa cuelga
    de una clase genérica `.lienzo-propio`; las regex literales de
    `verificar-escritorio.tsx` se actualizan en el MISMO commit. Un tercer pintor no volverá
    a pagar esto.
19. **Lobby en dos fases**: primero el Embarcadero con voz y colores del Burgo (`TEMAS['burgo']`,
    una fila); la Plaza del Burgo como escena hermana (`tema.escena: 'plaza'`) al final y sin
    bloquear la publicación. `tema.ts` no parametriza paisaje (`Embarcadero.tsx:830, 975`
    montan cala y `embarcadero.glb` en seco).
20. **Estado con `version: 1` y `comoSiSiempreHubieraHabidoBurgo` desde el primer commit**,
    con vacuna de estado viejo: las mesas guardadas en disco sobreviven a los despliegues.

---

## 2. Las reglas → código

### 2.1 Ficheros, manifiesto y constantes

`shared/arcade/juegos/burgo.ts` importa sólo de `../../mecanicas/{azar,canonico,tablero-declarado,turno-declarado,anillo,hacienda,mazo}`,
`../motor`, `../opciones`, `../reloj`, `../movimiento`, `../tipos`, y `./burgo-tablero`.
Sin `node:`, sin React, sin `server/`, sin `shared/juegos`, sin `shared/live`. Sin
`Date`, `Math.random`, trascendentales, `**`, `for…in`, `.sort()` sin comparador,
`localeCompare`, `async` (`verify:pureza`). Sin `Array.prototype.at`, `Object.hasOwn`,
`replaceAll`, `toSorted`, `structuredClone` (Hermes 0.12 en `verify:determinismo`). Sin
`winnerId`, `rooms`, `culpable`, `tablon`… (`verify:nucleo`).

```ts
export const BURGO: ArcadeId = 'burgo';

export const MANIFIESTO_BURGO: ManifiestoDeArcade = {
  id: BURGO,
  nombre: 'El Burgo',
  gancho: 'Compra calles, cobra rentas, alza casas y hoteles; el último que no quiebra se queda con el Burgo.',
  icono: 'mando',
  jugadores: { minimo: 2, maximo: 6 },
  sede: 'servidor',
  tickHz: 0,
  mueble: 'tablero',
  secretos: true,
  marcador: { tipo: 'ninguno' },
  procedencia: { tipo: 'dominio-publico' },   // el porqué, en un comentario encima (§0)
};

/* Movimientos: constantes con prefijo, un tipo por familia de carga; nunca un `jugar` con la clase dentro. */
export const EMPEZAR = 'burgo:empezar';
export const TIRAR = 'burgo:tirar';
export const PAGAR_FIANZA = 'burgo:pagar-fianza';
export const USAR_INDULTO = 'burgo:usar-indulto';
export const COMPRAR = 'burgo:comprar';
export const A_ALMONEDA = 'burgo:a-almoneda';
export const PUJAR = 'burgo:pujar';
export const PASAR_PUJA = 'burgo:pasar-puja';
export const ALZAR = 'burgo:alzar';
export const VENDER = 'burgo:vender';
export const EMPENAR = 'burgo:empenar';
export const DESEMPENAR = 'burgo:desempenar';
export const PROPONER = 'burgo:proponer';
export const ACEPTAR = 'burgo:aceptar';
export const RECHAZAR = 'burgo:rechazar';
export const RETIRAR = 'burgo:retirar';
export const PASAR = 'burgo:pasar';
export const RENDIRSE = 'burgo:rendirse';

/** Seis asientos, en orden de `ctx.asientos` al EMPEZAR. Medidos contra las ocho aceras (§2.1 de la parte 2). */
export const COLORES_DEL_BURGO: readonly string[] = ['#f2e8cf', '#26262e', '#7d3fd6', '#2fe0d0', '#ff8f6b', '#c5e84a'];
// marfil, azabache, violeta, turquesa, coral, lima. Esta forma EXACTA (`readonly string[] = [`) es la que
// `verify:embarcadero` extrae por regex para contrastarla con `tema.ts`.

export const TRATOS_ABIERTOS_POR_PROPONENTE = 3;
export const RONDAS_DE_SORTEO = 12;
export const TOPE_DE_SUCESOS = 64;
```

### 2.2 La tabla: `shared/arcade/juegos/burgo-tablero.ts`

Dato puro, enteros, `as const`, sin reglas. Los DOS clientes y la traducción la compilan:
la vista NO repite en cada lectura los cuarenta nombres, precios, rentas ni textos de
carta (§2.7, el cable). Las 40 filas son las del reglamento §1, tal cual; las 32 cartas las
del §11, con texto propio.

```ts
export type ClaseDeCasilla =
  | 'salida' | 'solar' | 'arca' | 'diezmo' | 'puerta' | 'pregon'
  | 'mazmorra' | 'oficio' | 'feria' | 'a-la-mazmorra' | 'alcabala';

export type BarrioId = 'pardo' | 'celeste' | 'rosa' | 'naranja' | 'rojo' | 'amarillo' | 'verde' | 'azul';
export type MazoId = 'pregon' | 'arca';

export interface CasillaDelBurgo {
  readonly indice: number;            // 0..39, sentido de la marcha
  readonly clase: ClaseDeCasilla;
  readonly nombre: string;            // 'Callejón de las Latas'
  readonly rotulo: string;            // ≤ 6 letras para la cara del retablo: 'Latas'
  readonly barrio: BarrioId | null;   // sólo 'solar'
  readonly precio: number;            // 0 si no se compra; el Impuesto y la Tasa llevan aquí lo que cobran
  readonly rentas: readonly [number, number, number, number, number, number]; // solar/1/2/3/4/hotel; [0,0,0,0,0,0] en las demás
  readonly casa: number;              // precio de la casa del barrio; 0 fuera de solares
}

export interface BarrioDelBurgo {
  readonly id: BarrioId;
  readonly nombre: string;            // 'El Poblado', 'Las Naves'… (rótulos propios, para la hoja)
  readonly color: string;             // '#rrggbb' de la acera y del relleno del retablo (§2.1 de la parte 2)
  readonly solares: readonly number[];// índices de casilla, en orden
}

export const CASILLAS: readonly CasillaDelBurgo[];   // exactamente 40
export const BARRIOS: readonly BarrioDelBurgo[];     // exactamente 8
export const CUANTAS_CASILLAS = 40;
export const PUERTA_MAYOR = 0;
export const LA_MAZMORRA = 10;
export const LA_FERIA = 20;
export const A_LA_MAZMORRA = 30;
export const PUERTAS: readonly number[] = [5, 15, 25, 35];
export const OFICIOS: readonly number[] = [12, 28];
export const TITULOS: readonly number[];             // las 28 casillas comprables, en orden de índice

export const DINERO_DE_SALIDA = 1500;
export const PAGA_DE_LA_PUERTA_MAYOR = 200;
export const FIANZA = 50;
export const INTENTOS_EN_LA_MAZMORRA = 3;
export const DOBLES_QUE_ENCIERRAN = 3;
export const CASAS_DEL_CONCEJO = 32;
export const POSADAS_DEL_CONCEJO = 12;
export const POSADA = 5;                              // `casas === 5` es un hotel
export const RENTA_DE_PUERTA: readonly number[] = [0, 25, 50, 100, 200];   // por número de estaciones del dueño
export const MULTIPLO_DE_OFICIO: readonly number[] = [0, 4, 10];           // por número de servicios del dueño
export const MULTIPLO_DE_OFICIO_POR_CARTA = 10;
export const PUJA_MINIMA = 10;
export const PASO_DE_PUJA = 10;
export const ESCALONES_DE_PUJA: readonly number[] = [50, 100];             // además del mínimo legal
export const INTERES_DEL_EMPENO = 10;                                      // por ciento

/** Hipoteca = mitad del precio (todos los precios son pares: entera). Deshipoteca = hipoteca + 10 % redondeado hacia arriba. */
export function valorDeEmpeno(precio: number): number;       // precio / 2
export function interesDelEmpeno(precio: number): number;    // Math.ceil(valorDeEmpeno(precio) / 10): 60→3, 100→5, 140→7…
export function costeDeDesempeno(precio: number): number;    // valorDeEmpeno + interesDelEmpeno

export type EfectoDeCarta =
  | { readonly que: 'ir'; readonly a: number; readonly cobraAlPasar: boolean }
  | { readonly que: 'puerta-cercana' }                  // renta doble si tiene dueño; compra si no
  | { readonly que: 'oficio-cercano' }                  // 10 × una tirada NUEVA si tiene dueño; compra si no
  | { readonly que: 'cobra'; readonly cuanto: number }
  | { readonly que: 'paga'; readonly cuanto: number }
  | { readonly que: 'indulto' }
  | { readonly que: 'retrocede'; readonly casillas: number }
  | { readonly que: 'a-la-mazmorra' }
  | { readonly que: 'reparaciones'; readonly porCasa: number; readonly porPosada: number }
  | { readonly que: 'paga-a-cada-uno'; readonly cuanto: number }
  | { readonly que: 'cobra-de-cada-uno'; readonly cuanto: number };

export interface CartaDelBurgo {
  readonly numero: number;     // 1..16 dentro de su mazo: lo que se PUBLICA al salir
  readonly mazo: MazoId;
  readonly titulo: string;     // 'Dividendo de acciones'
  readonly texto: string;      // el texto propio del reglamento §11
  readonly efecto: EfectoDeCarta;
}
export const EL_PREGON: readonly CartaDelBurgo[];   // 16
export const EL_ARCA: readonly CartaDelBurgo[];     // 16
export function carta(mazo: MazoId, numero: number): CartaDelBurgo | null;
/** La serie que viaja en el mazo (SECRETA): 'p07' / 'a12'. */
export function serieDeCarta(mazo: MazoId, numero: number): string;
export function numeroDeSerie(serie: string): number;  // 'p07' → 7; 0 si no cuadra
```

`shared/mecanicas/anillo.ts` (puro, sumas y productos, sin `shared/arcade`; lo usan el
reductor, el tablero declarado, la escena y los comprobadores):

```ts
export function casillaTras(desde: number, pasos: number, n: number): number;        // módulo positivo; pasos puede ser negativo
export function recorrido(desde: number, pasos: number, n: number): number[];          // las pisadas en sentido de la marcha, sin `desde`, con la última
export function cruzaLaSalida(desde: number, pasos: number, n: number): boolean;       // pasos > 0 y se pasa por la 0
export function distanciaAdelante(desde: number, hasta: number, n: number): number;
export function masCercana(desde: number, candidatas: readonly number[], n: number): number;  // la primera hacia delante
/** Geometría de un anillo cuadrado de 4·(porLado−1) casillas: lado, esquina, sitio y cuarto de giro hacia fuera. Todo lineal. */
export interface SitioEnElAnillo { readonly lado: 0 | 1 | 2 | 3; readonly esEsquina: boolean; readonly x: number; readonly z: number; readonly cuartos: 0 | 1 | 2 | 3; }
export function sitioDeCasilla(i: number, ancho: number, fondo: number, porLado: number): SitioEnElAnillo;  // centro de la casilla
export function medioLado(ancho: number, fondo: number, porLado: number): number;      // (9·8 + 2·14) / 2 = 50 con 8/14/11
```

`shared/mecanicas/hacienda.ts`: `transferir(saldos, de, a, cuanto): { saldos, pagado, deuda }`
en enteros, claves `Object.keys(...).sort(comparador)`; `shared/mecanicas/mazo.ts`:
`robar(mazo)` (rota al fondo), `sacar(mazo, serie)` y `devolverAlFondo(mazo, serie)` para el
Salvoconducto. Cada una con comprobador propio en `verify:mecanicas` (o bloque en `verify:burgo`).

`verify:burgo` afirma sobre la tabla: 40 filas con `indice === i`, 22 solares en 8 barrios de
2–3, estaciones en 5/15/25/35, servicios en 12/28, 3 del Fondo Vecinal (2, 17, 33) y 3 de
Sucesos (7, 22, 36), 16 + 16 cartas con `numero` 1..16 sin huecos, rentas crecientes,
precios pares, la tabla entera de deshipoteca (28 valores escritos a mano), y ningún
`nombre`/`texto`/`titulo` con una marca vetada.

### 2.3 `EstadoDelBurgo` y `MomentoDelBurgo`: todo entero, todo llano

Sin `undefined` en ningún campo (`null`, `[]`, `0` o `''`), sin `Infinity`, sin `Map`, sin
instancias. Nada derivado (rentas, patrimonio, barrio entero) se guarda: se calcula.

```ts
export type MomentoDelBurgo = 'reuniendo' | 'jugando' | 'terminada';

/** El subestado del turno. Uno solo: no hay dos relojes en la mesa. */
export type PasoDelTurno =
  | 'por-tirar'   // el del turno tiene que tirar (si está presa: elegir cómo salir)
  | 'comprar'     // cayó en un título sin dueño: comprar o mandarlo a almoneda
  | 'almoneda'    // hay una almoneda abierta; turnoDe = almoneda.pujaDe
  | 'apuro'       // alguien debe más de lo que tiene; turnoDe = apuro.quien
  | 'por-pasar';  // ya tiró y resolvió; puede obrar, tratar y pasar (o tirar otra vez si dobles)

export interface JugadorDelBurgo {
  readonly asiento: AsientoId;
  readonly color: string;                 // COLORES_DEL_BURGO[i], i = orden en ctx.asientos al EMPEZAR; nunca con módulo
  readonly casilla: number;               // 0..39 (se conserva al quebrar; el pintor lo saca por `quebrado`)
  readonly mrs: number;                   // efectivo, entero ≥ 0
  readonly presa: number;                 // -1 libre; 0, 1, 2 = intentos fallidos hechos en la Mazmorra
  readonly indultos: readonly MazoId[];   // públicos: de qué mazo es cada uno (la serie se deduce: uno por mazo)
  readonly quebrado: boolean;
  readonly vueltas: number;               // pasos por la Puerta Mayor (tope de vueltas)
}

export interface TituloDelBurgo {
  readonly casilla: number;               // 28 entradas en orden de casilla: 22 solares, 4 puertas, 2 oficios
  readonly dueno: AsientoId | null;       // null = el Concejo
  readonly casas: number;                 // 0..4; POSADA (5) = posada
  readonly empenado: boolean;
}

export interface AlmonedaDelBurgo {
  readonly casilla: number;
  readonly puja: number;                  // 0 = sin pujas
  readonly quienPuja: AsientoId | null;   // el mejor postor
  readonly pujaDe: AsientoId;             // a quién se espera: es turnoDe mientras dure
  readonly enPie: readonly AsientoId[];   // quienes NO han pasado (en orden de mesa)
  readonly abiertaPor: AsientoId;         // de quién es el turno de verdad (duenoDelTurno)
}

export type PorqueDelDinero =
  | 'renta' | 'puerta-mayor' | 'carta' | 'diezmo' | 'alcabala' | 'fianza' | 'compra' | 'almoneda'
  | 'casa' | 'posada' | 'venta' | 'empeno' | 'desempeno' | 'interes' | 'trato' | 'quiebra' | 'reparaciones' | 'sorteo';

export interface DeudaDelBurgo { readonly a: AsientoId | null; readonly cuanto: number; readonly porque: PorqueDelDinero; }

export interface ApuroDelBurgo {
  readonly quien: AsientoId;
  readonly deudas: readonly DeudaDelBurgo[];   // se saldan TODAS de golpe cuando el efectivo alcanza la suma
}

export interface LadoDelTrato { readonly mrs: number; readonly titulos: readonly number[]; readonly indultos: number; }

export interface TratoDelBurgo {
  readonly id: number;                    // contador público y estable (siguienteTrato)
  readonly de: AsientoId;
  readonly a: AsientoId;
  readonly doy: LadoDelTrato;
  readonly pido: LadoDelTrato;
  readonly enElTurno: number;             // turnosAbiertos al proponer: caduca cuando cambia
}

export interface CartaSalida {
  readonly mazo: MazoId;
  readonly carta: number;                 // 1..16: el NÚMERO, nunca la serie
  readonly quien: AsientoId;
  readonly enElTurno: number;
}

export interface EstadoDelBurgo {
  readonly version: 1;
  readonly momento: MomentoDelBurgo;
  readonly paso: PasoDelTurno;
  readonly luego: 'por-tirar' | 'por-pasar';      // a qué paso vuelve el turno al cerrar comprar/almoneda/apuro
  readonly jugadores: readonly JugadorDelBurgo[]; // orden de ctx.asientos al EMPEZAR; NO se reordena nunca
  readonly turno: number;                         // índice en jugadores; el dueño del turno aunque paso sea apuro/almoneda
  readonly dobles: number;                        // dobles seguidos en este turno, 0..2
  readonly tirada: readonly [number, number] | null;   // el PAR de la última tirada (los dobles son regla)
  readonly tiradasDelTurno: number;               // sube en cada TIRAR: sello de los dados
  readonly turnosAbiertos: number;                // relevos de turno: caduca tratos
  readonly titulos: readonly TituloDelBurgo[];    // 28
  readonly casasEnElConcejo: number;
  readonly posadasEnElConcejo: number;
  readonly pregon: readonly string[];             // series 'p01'..'p16' barajadas UNA vez; SECRETO
  readonly arca: readonly string[];               // 'a01'..'a16'; SECRETO
  readonly ultimaCarta: CartaSalida | null;
  readonly almoneda: AlmonedaDelBurgo | null;
  readonly colaDeAlmonedas: readonly number[];    // la quiebra al Concejo encola títulos, en orden de casilla
  readonly apuro: ApuroDelBurgo | null;
  readonly colaDeApuros: readonly ApuroDelBurgo[];// «cada jugador te paga 10» puede endeudar a varios
  readonly tratos: readonly TratoDelBurgo[];
  readonly siguienteTrato: number;
  readonly topeDeVueltas: number;                 // 0 = sin tope (regla de mesa)
  readonly sorteoDeSalida: readonly (readonly [number, number])[];   // la ÚLTIMA ronda, una por jugador (para animar)
  readonly jugada: number;                        // sube en cada estado nuevo; sello de `sucesos`
  readonly sucesos: readonly SucesoDelBurgo[];    // SÓLO los del último cambio (≤ TOPE_DE_SUCESOS). Nunca un histórico
  readonly azar: Azar;                            // SECRETO
  readonly ganadores: readonly AsientoId[];
}

export function partidaNueva(): EstadoDelBurgo;   // momento 'reuniendo', azar sembrar(0), listas vacías, jugada 0
/** Migración de mesas guardadas: devuelve EL MISMO objeto si `version === 1` y no falta nada. Existe desde el primer commit. */
export function comoSiSiempreHubieraHabidoBurgo(e: EstadoDelBurgo): EstadoDelBurgo;
```

Tamaño medido en `verify:burgo` con el tablero lleno (6 jugadores, 44 edificios, apuro,
almoneda, 3 tratos, 64 sucesos): `canonico(estado).length` cabe en ~8 KiB. Tope propio
24 KiB (el de producción es 512 KiB).

### 2.4 Los sucesos: lo que se destruye al resolver, guardado para verse

La proyección es pura: si el estado sólo guarda la casilla final, ningún cliente sabe si
se pasó la Puerta Mayor o se fue derecho a la Mazmorra. Cada movimiento que cambia el
estado SUSTITUYE la lista (no acumula) y sube `jugada`; una liquidación por tic puede
producir docenas de `vende`/`empena`: con más de 64 se cortan los PRIMEROS y se conservan
`quiebra`, `turno` y `fin`.

```ts
export type SucesoDelBurgo =
  | { readonly que: 'sale'; readonly quien: AsientoId; readonly dados: readonly [number, number]; readonly ronda: number }   // sorteo de salida
  | { readonly que: 'empieza'; readonly quien: AsientoId }
  | { readonly que: 'tira'; readonly quien: AsientoId; readonly dados: readonly [number, number]; readonly dobles: boolean; readonly enLaMazmorra: boolean }
  | { readonly que: 'mueve'; readonly quien: AsientoId; readonly desde: number; readonly hasta: number; readonly recorrido: readonly number[]; readonly porLaPuertaMayor: boolean; readonly como: 'anda' | 'viaja' | 'retrocede' }
  | { readonly que: 'cobra'; readonly quien: AsientoId; readonly de: AsientoId | null; readonly cuanto: number; readonly porque: PorqueDelDinero; readonly casilla: number }
  | { readonly que: 'paga'; readonly quien: AsientoId; readonly a: AsientoId | null; readonly cuanto: number; readonly porque: PorqueDelDinero; readonly casilla: number }
  | { readonly que: 'compra'; readonly quien: AsientoId; readonly casilla: number; readonly cuanto: number }
  | { readonly que: 'alza'; readonly quien: AsientoId; readonly casilla: number; readonly casas: number }       // casas tras alzar (5 = posada)
  | { readonly que: 'vende'; readonly quien: AsientoId; readonly casilla: number; readonly casas: number }
  | { readonly que: 'empena'; readonly quien: AsientoId; readonly casilla: number }
  | { readonly que: 'desempena'; readonly quien: AsientoId; readonly casilla: number }
  | { readonly que: 'carta'; readonly quien: AsientoId; readonly mazo: MazoId; readonly carta: number }
  | { readonly que: 'tirada-de-oficio'; readonly quien: AsientoId; readonly dados: readonly [number, number] }
  | { readonly que: 'a-la-mazmorra'; readonly quien: AsientoId; readonly desde: number; readonly porque: 'casilla' | 'carta' | 'tres-dobles' }
  | { readonly que: 'sale-de-la-mazmorra'; readonly quien: AsientoId; readonly como: 'fianza' | 'indulto' | 'dobles' | 'tercer-intento' }
  | { readonly que: 'sigue-presa'; readonly quien: AsientoId; readonly intento: number }
  | { readonly que: 'almoneda-abierta'; readonly casilla: number }
  | { readonly que: 'puja'; readonly quien: AsientoId; readonly casilla: number; readonly cuanto: number }
  | { readonly que: 'pasa-puja'; readonly quien: AsientoId; readonly casilla: number }
  | { readonly que: 'almoneda-cerrada'; readonly casilla: number; readonly ganador: AsientoId | null; readonly cuanto: number }
  | { readonly que: 'apuro'; readonly quien: AsientoId; readonly debe: number }
  | { readonly que: 'quiebra'; readonly quien: AsientoId; readonly acreedor: AsientoId | null }
  | { readonly que: 'cambia-de-mano'; readonly casilla: number; readonly de: AsientoId | null; readonly a: AsientoId | null }
  | { readonly que: 'trato'; readonly id: number; readonly de: AsientoId; readonly a: AsientoId; readonly fin: 'propuesto' | 'aceptado' | 'rechazado' | 'retirado' | 'caducado' }
  | { readonly que: 'turno'; readonly de: AsientoId }
  | { readonly que: 'fin'; readonly ganadores: readonly AsientoId[]; readonly porque: 'ultimo-en-pie' | 'tope-de-vueltas' };
```

La escena anima ESTA lista (parte 2 §5.7); el retablo la ignora salvo el `aviso`. El hueco
de mecánicas futuras (robar la cartera) es un miembro más de esta unión: no se construye.

### 2.5 Movimientos: quién, cuándo, con qué carga y qué portillo

Lectores defensivos de carga (`casillaDeLaCarga`, `enteroDeLaCarga`, `listaDeEnteros`):
llega sin validar. Sin carga = `{}` (NUNCA `undefined`: `canonico` revienta).

| Constante | tipo | carga | Quién | Cuándo (`paso`) y «sólo si» |
|---|---|---|---|---|
| `EMPEZAR` | `burgo:empezar` | `{ topeDeVueltas: number }` (v1 ofrece sólo `0`) | cualquier sentado | `reuniendo`; el aforo (2–6) NO está en la vista: se ofrece de más y el reductor rechaza con motivo |
| `TIRAR` | `burgo:tirar` | `{}` | `duenoDelTurno` | `por-tirar` (libre, o presa = «probar con los dados»); sin almoneda ni apuro |
| `PAGAR_FIANZA` | `burgo:pagar-fianza` | `{}` | el del turno, presa | `por-tirar`; `mrs ≥ 50` → paga, queda libre en `por-tirar` (luego tira con normalidad, con dobles repite) |
| `USAR_INDULTO` | `burgo:usar-indulto` | `{}` | el del turno, presa, con Indulto | `por-tirar`; la serie del Indulto de ese mazo vuelve al FONDO de su mazo |
| `COMPRAR` | `burgo:comprar` | `{ casilla }` | el del turno | `comprar`, `casilla === su casilla`, sin dueño, `mrs ≥ precio` |
| `A_ALMONEDA` | `burgo:a-almoneda` | `{ casilla }` | el del turno | `comprar` |
| `PUJAR` | `burgo:pujar` | `{ casilla, cuanto }` | `almoneda.pujaDe` | `almoneda`; `cuanto` entero, múltiplo de 10, `≥ max(PUJA_MINIMA, puja + PASO_DE_PUJA)`, `≤ mrs` |
| `PASAR_PUJA` | `burgo:pasar-puja` | `{ casilla }` | `almoneda.pujaDe` | `almoneda` |
| `ALZAR` | `burgo:alzar` | `{ casilla }` | `duenoDelTurno` (también presa) | `por-tirar`/`por-pasar`/`comprar`; barrio entero, nada del barrio empeñado, parejo (`casas ≤ min del barrio`), `casas < 5`, existencias (`casas < 4` → casas en el Concejo; `casas === 4` → posadas), `mrs ≥ casa` |
| `VENDER` | `burgo:vender` | `{ casilla }` | el dueño | su turno en cualquier paso salvo `almoneda`, o `apuro` si es `apuro.quien`; `casas > 0`, parejo al revés (`casas ≥ max del barrio`) |
| `EMPENAR` | `burgo:empenar` | `{ casilla }` | el dueño | ídem; propio, no empeñado, `casas === 0` y ningún solar del barrio con edificios |
| `DESEMPENAR` | `burgo:desempenar` | `{ casilla }` | el dueño | su turno; empeñado; `mrs ≥ costeDeDesempeno(precio)` |
| `PROPONER` | `burgo:proponer` | `{ a, doy: LadoDelTrato, pido: LadoDelTrato }` (declaración) | `duenoDelTurno`, o cualquiera vivo cuyo `a` sea `duenoDelTurno` | `jugando`, `paso !== 'almoneda'`; `a` vivo y `≠ quien`; `doy.titulos` míos sin edificios y con el barrio sin edificios; `pido.titulos` de `a` con la misma regla; `doy.mrs ≤ mi mrs`; `doy.indultos ≤ los míos`; un lado puede ir vacío, los dos no; `< 3` tratos abiertos míos |
| `ACEPTAR` | `burgo:aceptar` | `{ trato }` | `trato.a` | siempre en `jugando` (sin turno); revalida TODO con el estado de ahora; el receptor de cada título empeñado paga `interesDelEmpeno` al Concejo en el acto (si no le alcanza: rechazo sin mover nada) |
| `RECHAZAR` | `burgo:rechazar` | `{ trato }` | `trato.a` | ídem |
| `RETIRAR` | `burgo:retirar` | `{ trato }` | `trato.de` | ídem |
| `PASAR` | `burgo:pasar` | `{}` | `duenoDelTurno` | `por-pasar`, `dobles === 0` (con dobles hay que tirar), sin apuro ni almoneda |
| `RENDIRSE` | `burgo:rendirse` | `{}` | cualquier jugador vivo (también sin turno) | `jugando`: quiebra con el acreedor de su apuro si lo tiene, si no con el Concejo |

Ninguna opción se ofrece al espectador ni a un quebrado. Lo que se hace SIN turno
(`ACEPTAR`/`RECHAZAR`/`RETIRAR`, `VENDER`/`EMPENAR` del endeudado fuera de turno,
`PROPONER` al del turno, `RENDIRSE`) se evalúa ANTES del `if (v.turnoDe !== quien)` en
`opciones()`, como la Ronda.

**El reductor**, orden fijo:

```ts
export function avanzarElBurgo(estado: EstadoDelBurgo | undefined, movimiento: Movimiento, ctx: ContextoMovimiento): EstadoDelBurgo | Rechazo<EstadoDelBurgo> {
  const actual = comoSiSiempreHubieraHabidoBurgo(estado ?? partidaNueva());
  if (esTic(movimiento)) return venceElPlazo(actual);                          // (a) ANTES del portillo; quien === null
  const vista = loQueSeVe(actual, ctx.quien, NADIE_SENTADO);                  //     sin tablero: el tablero es un dibujo de la vista
  if (!estaOfrecido(opcionesDelBurgo(vista, ctx.quien), movimiento)) {          // (b) portillo: canonico({tipo, carga ?? null}) en try/catch;
    return rechazar(actual, motivoDeNoOfrecido(vista, movimiento));             //     puertas: primero la puerta EN LA LISTA, luego cabeEnLaPuerta (campos EXACTOS)
  }
  switch (movimiento.tipo) { /* (c) una rama por constante; cada rama vuelve a validar con TODO el estado */ }
  return actual;                                                                // (d) desconocido: EL MISMO objeto
}
```

Reglas de toda rama: quien mueve se resuelve con `indiceDelJugador(actual, ctx.quien)` (−1
→ mismo objeto); un no-op devuelve `actual` por IDENTIDAD (la mesa compara `!==`,
`mesas.ts:1913`); cada cambio pasa por `conSucesos(e, sucesos)` que sube `jugada` y
sustituye la lista; tras cualquier cambio de dinero/títulos/quebrado se llama
`puedeHaberAcabado(e)`. Los motivos se redactan DESDE LA VISTA (`motivoDe(vista, …)`) y
sólo donde `opciones()` no pudo ver la condición (aforo, trato que ya no está en pie,
interés que no alcanza); `verify:burgo` pasa cada motivo por `reprochesDeSecretos`.

**La máquina de fases** (la que un equipo puede leer sin abrir el reductor):

```
reuniendo ──EMPEZAR (2..6 sentados)──▶ jugando · por-tirar (turno = ganador del sorteo, hecho dentro)

por-tirar ──TIRAR──▶ mueve y resuelve la casilla ─┬─ título sin dueño ──▶ comprar
                                                 ├─ debe y no tiene ──▶ apuro (turnoDe = el endeudado)
                                                 ├─ dobles (y no fue a la Mazmorra) ──▶ por-tirar  (luego = 'por-tirar')
                                                 └─ si no ───────────▶ por-pasar   (luego = 'por-pasar')
por-tirar (presa) ──PAGAR_FIANZA | USAR_INDULTO──▶ libre en por-tirar (tira después, con dobles repite)
                  ──TIRAR──▶ dobles: sale y mueve SIN repetir · no dobles: presa+1, por-pasar · 3.er fallo: paga 50 (o apuro) y mueve
comprar ──COMPRAR──▶ luego            ──A_ALMONEDA──▶ almoneda (pujaDe = siguiente vivo tras el que abre)
almoneda ──PUJAR/PASAR_PUJA──▶ relevo de pujaDe entre `enPie`; cierra cuando queda uno en pie (y es quienPuja) o todos pasaron sin puja
          ──cierra──▶ colaDeAlmonedas vacía ? luego (del turno de abiertaPor) : siguiente almoneda de la cola
apuro ──VENDER/EMPENAR/ACEPTAR/RECHAZAR──▶ si mrs ≥ suma(deudas): salda todas ──▶ colaDeApuros vacía ? luego : siguiente apuro
      ──RENDIRSE, o tic sin remedio──▶ quiebra ──▶ acreedor jugador: todo a él · Concejo: cola de almonedas ──▶ sigue
por-pasar ──PASAR──▶ relevo (caducan tratos, dobles = 0, turnosAbiertos++) ──▶ por-tirar del siguiente vivo
cualquier paso propio salvo almoneda: ALZAR, VENDER, EMPENAR, DESEMPENAR, PROPONER
cualquier momento de jugando, sin turno: ACEPTAR / RECHAZAR (soy `a`), RETIRAR (soy `de`), RENDIRSE
jugando ──queda uno vivo, o tope de vueltas──▶ terminada
```

**Algoritmos que un equipo no puede adivinar**, en corto:

- **EMPEZAR** `{ topeDeVueltas }`: `2 ≤ ctx.asientos.length ≤ 6` o `rechazar('Hacen falta
  entre 2 y 6 sentados.')`; `azar = sembrar(ctx.azar)`; jugadores por `ctx.asientos` con
  `COLORES_DEL_BURGO[i]`, casilla 0, 1500 mrs; 28 títulos del Concejo; `pregon =
  barajar(azar, series)`, `arca = barajar(...)` encadenando el azar; **sorteo**:
  candidatos = todos; por ronda, dos dados por candidato en orden de asiento (suceso `sale`
  con `ronda`), candidatos = los de suma máxima; hasta uno o `RONDAS_DE_SORTEO` (entonces
  el primero en orden de asiento); `sorteoDeSalida` = la última ronda; `turno` = ganador;
  `paso 'por-tirar'`, `luego 'por-pasar'`, `turnosAbiertos 1`; sucesos `empieza`, `turno`.
  `ctx.azar` sólo se lee aquí. Vacuna: un azar que empata 30 veces termina igual.
- **TIRAR**: `d1 = enteroEntre(azar,1,6)`, `d2 = enteroEntre(d1.azar,1,6)` (nunca el mismo
  azar dos veces); `tirada = [d1, d2]`; `tiradasDelTurno++`. Presa (`presa ≥ 0`): dobles →
  `sale-de-la-mazmorra 'dobles'`, `presa = -1`, mover y resolver, `dobles` se queda en 0
  (NO repite); no dobles y `presa < 2` → `presa + 1`, `sigue-presa`, `por-pasar`; tercer
  fallo → `sale 'tercer-intento'`, `presa = -1`, mover y resolver, y después `pagar(50,
  'fianza')` (apuro si no alcanza). Libre: si `dobles === 2 && esDobles` → `aLaMazmorra
  'tres-dobles'` ANTES de mover (sin cobrar, sin resolver), `por-pasar`, `dobles 0`;
  si no `dobles = esDobles ? dobles + 1 : 0`, `luego = esDobles ? 'por-tirar' :
  'por-pasar'`, `mover(d1 + d2, cobraAlPasar: true)`, `resolverCasilla`.
- **mover(v, pasos | hasta, cobraAlPasar)**: `recorrido` de `anillo.ts`; si `cruzaLaSalida`
  y `cobraAlPasar` → `cobrar(Concejo → v, 200, 'puerta-mayor')`, `vueltas++`; suceso
  `mueve` con `como: 'anda'` (≤ 12 casillas), `'viaja'` (> 12, por carta) o `'retrocede'`.
  **Ir a la Mazmorra nunca pasa por aquí**: `aLaMazmorra(v, porque)` pone `casilla 10`,
  `presa 0`, suceso `a-la-mazmorra` con `desde`; termina el turno (`por-pasar`, `dobles 0`).
- **resolverCasilla** por `CASILLAS[casilla].clase`: solar/puerta/oficio → sin dueño:
  `paso 'comprar'`; dueño ajeno no empeñado: `pagar(v → dueño, rentaDe(...), 'renta')` (el
  Concejo cobra solo, §12; el dueño presa cobra igual); propio o empeñado: nada. Diezmo →
  `pagar(200, 'diezmo')`; Alcabala → 100. Pregón/Arca → `robar`: `serie = mazo[0]`; suceso
  `carta` con el NÚMERO; `ultimaCarta`; Indulto: `indultos += mazo`, la serie SALE del mazo;
  las demás: `mazo = [...mazo.slice(1), serie]` y efecto: `ir` → `mover(hasta, cobraAlPasar)`
  y `resolverCasilla` otra vez (una vez: ningún `ir` cae en pregón/arca); `a-la-mazmorra`;
  `retrocede 3` → `casillaTras(-3)` sin cobrar y `resolverCasilla` (puede caer en el Arca
  33 y robar otra, en el Diezmo 4, en un solar); `cobra`/`paga` con el Concejo;
  `reparaciones` = `porCasa × casas + porPosada × posadas`; `paga-a-cada-uno`: una deuda
  por jugador vivo, TODAS en un solo apuro si no alcanza; `cobra-de-cada-uno`: cada uno
  paga; quien no pueda entra en `colaDeApuros` (el primero pasa a `apuro`, `turnoDe = él`;
  el turno se reanuda con `luego` cuando la cola se vacía); `puerta-cercana` →
  `mover(masCercana(PUERTAS), cobraAlPasar true)`, dueño ajeno: renta × 2, sin dueño:
  `comprar`; `oficio-cercano` → mover, dueño ajeno: NUEVA tirada (suceso `tirada-de-oficio`)
  × 10, sin dueño: `comprar`. ¡A la Mazmorra! → `aLaMazmorra('casilla')`. Salida, Feria,
  Mazmorra de visita → nada.
- **rentaDe(t, tirada, modo)**: empeñado → 0; solar: `casas === 0` → barrio entero ? 2 ×
  rentas[0] : rentas[0]; `casas > 0` → `rentas[casas]` (5 = posada); puerta: `n` = puertas
  del dueño CONTANDO las empeñadas (§7) → `RENTA_DE_PUERTA[n] × (modo 'doble' ? 2 : 1)`;
  oficio: `n` = oficios del dueño (empeñados incluidos) → `(modo 'x10' ? 10 :
  MULTIPLO_DE_OFICIO[n]) × (d1 + d2)`.
- **pagar(de, a, cuanto, porque)**: si `mrs ≥ cuanto` → transfiere, sucesos `paga` y
  `cobra`. Si no → `apuro = { quien, deudas: [...(apuro?.deudas ?? []), {a, cuanto, porque}] }`
  (o a `colaDeApuros` si el apuro vigente es de otro), `paso 'apuro'`, suceso `apuro`.
  Nunca hay pago parcial. **Saldar** (tras VENDER/EMPENAR/ACEPTAR/RECHAZAR de alguien en
  apuro): si `mrs ≥ suma` → paga todas, `apuro = null`, siguiente de `colaDeApuros` o
  `paso = luego`.
- **PUJAR/PASAR_PUJA**: relevo de `pujaDe` al siguiente de `enPie` en orden de mesa;
  `PASAR_PUJA` quita de `enPie`. **cerrarAlmoneda** cuando `enPie.length ≤ 1` y ese es
  `quienPuja`, o `enPie` vacío: con `quienPuja` → `pagar(quienPuja → Concejo, puja,
  'almoneda')` (siempre puede: se validó al pujar), `dueno = quienPuja`, `cambia-de-mano`;
  sin puja → queda en el Concejo; suceso `almoneda-cerrada`; si `colaDeAlmonedas` no está
  vacía → abre la siguiente (`pujaDe = siguiente vivo tras abiertaPor`); si no → `almoneda
  = null`, `paso = luego` del turno de `abiertaPor`; si `abiertaPor` ya quebró → relevo.
  El cierre nunca queda pendiente de nadie.
- **ALZAR**: transfiere `casa`; `casas++`; si llega a 5: `casasEnElConcejo += 4`,
  `posadasEnElConcejo--`; si no: `casasEnElConcejo--`. **VENDER**: posada: si
  `casasEnElConcejo ≥ 4` → degrada a 4 casas cobrando `casa / 2` y `posadasEnElConcejo++`,
  `casasEnElConcejo -= 4`; si no → se vende entera por `5 × casa / 2`, `casas = 0`,
  `posadasEnElConcejo++`. Casa: `casas--`, `casasEnElConcejo++`, cobra `casa / 2`. Luego
  **saldar** si hay apuro.
- **EMPENAR**: `empenado = true`, cobra `valorDeEmpeno`. **DESEMPENAR**: paga
  `costeDeDesempeno`, `empenado = false`.
- **ACEPTAR** `{ trato }`: revalida mercancía y dinero de las DOS partes; si algo falla →
  `rechazar('Ese trato ya no está en pie.')`; interés de cada título empeñado que cambia
  de mano (`interesDelEmpeno`, al Concejo, por el receptor) o `rechazar('No te alcanza para
  el interés de los empeños.')`; transfiere mrs, títulos (`cambia-de-mano`), Indultos;
  borra ese trato y cualquier otro que incluya alguno de esos títulos (`caducado`);
  **saldar** para los dos si estaban en apuro.
- **PASAR** → **relevo**: `dobles = 0`, `turnosAbiertos++`, tratos con `enElTurno <
  turnosAbiertos` fuera (`caducado`), `turno = siguienteVivo(turno)`, `paso 'por-tirar'`,
  `luego 'por-pasar'`, suceso `turno`; tope de vueltas: si `topeDeVueltas > 0` y el que
  recibe el turno es el que empezó y `min(vueltas de los vivos) ≥ tope` → fin por
  patrimonio.
- **quebrar(v, acreedor)**: edificios → al Concejo por la mitad (`caja`); acreedor jugador:
  `mrs + caja` a él, títulos tal cual (los empeñados siguen empeñados y el acreedor paga
  `interesDelEmpeno` de cada uno EN EL ACTO; si no le alcanza, entra ÉL en apuro con el
  Concejo por ese importe: simplificación declarada del reglamento §7), Indultos a él;
  Concejo: `caja` se pierde, títulos `dueno null, empenado false, casas 0` y a
  `colaDeAlmonedas` en orden de casilla (abre la primera con `pujaDe = siguiente vivo tras
  v`), Indultos al fondo de su mazo; `quebrado true`, `mrs 0`, tratos con v fuera,
  `apuro = null`; si v tenía el turno → relevo (con cola, primero las almonedas y el relevo
  al cerrar la última); `puedeHaberAcabado`. **Varios acreedores en un apuro** (carta
  «paga a cada jugador»): el que más reclama; empate, el de asiento anterior en orden de
  mesa. Regla de la casa, dicha en la ayuda.
- **puedeHaberAcabado**: un vivo → `terminada`, `ganadores = [ese]`, `fin
  'ultimo-en-pie'`. Tope de vueltas → patrimonio = `mrs + Σ precio (no empeñados) + Σ
  precio/2 (empeñados) + Σ casa × unidades (posada = 5)`; empate → comparten (sin
  desempate inventado). `seAcabo = (e) => (e ?? partidaNueva()).momento === 'terminada'`.

### 2.6 El tic: `venceElPlazo(e)`, determinista, y el ausente

| Estado al vencer | Qué hace el tic |
|---|---|
| `reuniendo`, `terminada` | Devuelve EL MISMO objeto (identidad). |
| `almoneda` | `PASAR_PUJA` por `pujaDe`. |
| `apuro` | Liquida a `apuro.quien` en UN tic: mientras `mrs < suma(deudas)`: 1.º vende un edificio del solar con MÁS casas (empate: casilla más alta; respeta el parejo por construcción); 2.º empeña el título no empeñado de MAYOR precio (empate: casilla más alta); sin nada que vender ni empeñar → quiebra con el acreedor (§2.5). Al cubrir → saldar. |
| `comprar` | `A_ALMONEDA`. |
| `por-tirar`, libre | `TIRAR` por él (gasta azar: lo mismo que gastaría él). |
| `por-tirar`, presa | `TIRAR` (probar con los dados): dobles sale; si no, `presa + 1`; al tercero paga o apuro. |
| `por-pasar`, `dobles > 0` | `TIRAR` otra vez. |
| `por-pasar`, `dobles === 0` | `PASAR` (los tratos del proponente caducan al relevar; los tratos pendientes NO se contestan por el tic). |

Un tic hace UNA cosa; la mesa mete hasta `TICS_DE_GOLPE = 8` por lectura (`mesas.ts:1695`)
y reprograma `venceEn` en cada tic (`:1909-1913`), así que un turno entero del ausente
(tira → no compra → almoneda → pasa) son 3–4 tics y cada relevo de `turnoDe` da plazo
nuevo al siguiente. Con `plazoSegundos: 0` no entra ningún tic nunca: el Burgo no caduca
NADA por tiempo (los tratos caducan por turno), así que una mesa sin plazo es jugable. El
primer tic sobre una mesa `undefined` construye `partidaNueva()` y cuenta como cambio (rev
1): conocido; `verify:burgo` no lo toma por fallo.

Propiedad que `verify:burgo` exige: mesa real con `plazoSegundos: 1`, seis sentados, NADIE
mueve, `avanzarElReloj` en bucle → la partida termina con ganador (tope de vueltas 30 para
acotar) en ≤ 2.500 tics; cada tic en `jugando` produce un objeto distinto; `turnoDe` es
siempre un asiento vivo; `rev` sube exactamente una vez por tic.

### 2.7 Azar, proyección, `loSecreto`, opciones, rechazos

**Azar.** `sembrar(ctx.azar)` UNA vez en EMPEZAR; dados con `enteroEntre` encadenado;
mazos barajados una vez con `barajar`; la carta robada va al FONDO con la misma serie
(nunca se rebaraja: reproducible y el reglamento §4 lo dice así). El objeto `azar` entero
va en `loSecreto` y no sale en la vista. `ctx.azar` (reglas, secreto) ≠
`semillaDelCodigo(codigo)` (decorado, público): no se mezclan en ninguna dirección.

**Proyección.** `proyectarElBurgo(estado | undefined, quien: QuienMira, sentados = NADIE_SENTADO): VistaDelBurgo`
= `{ ...loQueSeVe(e, quien, sentados), tablero: tableroDelBurgo(base, quien) }`. Igual para
todos los asientos y el espectador (no hay manos): lo único que cambia con `quien` es `yo`,
`aviso` y el `tablero` (qué `acciones` enseña). Nombres con `comoSeLlama(sentados,
asiento)`; sin `sentados` degradan al id, a propósito (el reductor se proyecta con
`NADIE_SENTADO`). Recorta `azar`, `pregon`, `arca` (publica `quedan: { pregon, arca }`).

```ts
export function loSecretoDelBurgo(estado: EstadoDelBurgo | undefined): unknown[] {
  const e = comoSiSiempreHubieraHabidoBurgo(estado ?? partidaNueva());
  return [e.azar, ...e.pregon, ...e.arca];   // el objeto azar entero; series distinguibles con comillas
}
```

**Opciones** `opcionesDelBurgo(vista: unknown, quien: QuienMira): readonly Opcion[]`:
`comoVista(vista)` valida forma y NORMALIZA campos nuevos; `[]` al espectador, en
`terminada` y a un quebrado. Ids públicos y estables por observador; nunca una carta ni el
azar dentro de un id:

| id | tipo | carga | cuándo |
|---|---|---|---|
| `empezar` | EMPEZAR | `{ topeDeVueltas: 0 }` | `reuniendo` (la hoja del Muelle sólo enseña ESTE id: `opcionDeEmpezar`) |
| `tirar` | TIRAR | `{}` | `turnoDe === yo`, `por-tirar` (libre o presa) o `por-pasar` con `dobles > 0` |
| `pagar-fianza`, `usar-indulto` | … | `{}` | presa, `por-tirar`, `mrs ≥ 50` / `indultos > 0` |
| `comprar:12`, `a-almoneda:12` | COMPRAR / A_ALMONEDA | `{ casilla: 12 }` | `comprar` (comprar sólo si alcanza) |
| `pujar:minimo`, `pujar:+50`, `pujar:+100` | PUJAR | `{ casilla, cuanto }` montada (mínimo legal; puja + 50; puja + 100), sólo las que `≤ mrs` | `pujaDe === yo` |
| `pujar` | PUJAR | **declaración** `{ casilla, minimo, maximo, escalon: 10 }` | `pujaDe === yo` |
| `pasar-puja` | PASAR_PUJA | `{ casilla }` | `pujaDe === yo` |
| `alzar:16`, `vender:16`, `empenar:16`, `desempenar:16` | … | `{ casilla: 16 }` | según §2.5; todo es público, así que `opciones()` ve todas las guardas |
| `proponer` | PROPONER | **declaración** `{ a: [asientos vivos], mrsMaximo, titulos: [mis casillas sin edificios], indultos }` | turno propio, o `duenoDelTurno` entre los destinatarios; menos de 3 tratos míos |
| `aceptar:3`, `rechazar:3` | ACEPTAR / RECHAZAR | `{ trato: 3 }` | soy `a` del trato 3 |
| `retirar:3` | RETIRAR | `{ trato: 3 }` | soy `de` |
| `pasar` | PASAR | `{}` | `por-pasar`, `dobles === 0`, sin apuro |
| `rendirse` | RENDIRSE | `{}` | vivo; rótulo «Declararse en quiebra», ayuda que dice a quién va todo |

`rotulo`/`ayuda` ya redactados y sólo con lo que la vista enseña: «Comprar la Calle de la
Cera por 140 mrs», «Alzar la 2.ª casa (100 mrs)», «Empeñar por 70 mrs», «No hay casas en el
Concejo». La lista más larga (turno propio con 8 solares alzables, 3 tratos y almoneda)
ronda 30 opciones: `verify:burgo` mide ≤ 60 opciones y ≤ 12 KiB canónicos en el peor estado.

**Rechazos con motivo.** El portillo rechaza lo no ofrecido con
`motivoDeNoOfrecido(vista, movimiento)` («Eso ya no se puede hacer: le toca a Bea.»); las
ramas rechazan CON motivo sólo donde la vista no podía verlo: aforo, trato que ya no está en
pie, interés que no alcanza. Un `Rechazo` lleva EL MISMO objeto de estado; el motivo sólo
llega a quien movió (`mesa.motivo`) y en toda lectura es `null`. Ningún motivo contiene una
serie de carta ni el texto de una carta no salida (`verify:burgo` lo vacuna con un motivo
envenenado con `'p07'`).

---

## 3. La vista y el `TableroDeclarado` del respaldo

### 3.1 `VistaDelBurgo`, campo a campo (tipo CERRADO; `verify:burgo` afirma la lista exacta)

```ts
export interface JugadorVisto {
  readonly asiento: AsientoId;
  readonly nombre: string;               // comoSeLlama(sentados, asiento)
  readonly color: string;
  readonly casilla: number;
  readonly mrs: number;
  readonly presa: number;                // -1 libre; 0..2
  readonly indultos: number;             // cuántos (público)
  readonly quebrado: boolean;
  readonly vueltas: number;
  readonly titulos: readonly number[];   // sus casillas, en orden: derivado, para no recontar en el cliente
  readonly patrimonio: number;           // derivado, para el marcador y el tope de vueltas
}

export interface TituloVisto {
  readonly casilla: number;
  readonly dueno: AsientoId | null;
  readonly casas: number;                // 0..4; 5 = posada
  readonly empenado: boolean;
  readonly barrioEntero: boolean;        // derivado
  readonly rentaAhora: number;           // lo que cobraría hoy con la última tirada (0 sin dueño o empeñado); derivado
}

export interface AlmonedaVista {
  readonly casilla: number; readonly puja: number; readonly quienPuja: AsientoId | null;
  readonly pujaDe: AsientoId; readonly enPie: readonly AsientoId[]; readonly abiertaPor: AsientoId; readonly enCola: number;
}
export interface ApuroVisto { readonly quien: AsientoId; readonly deudas: readonly DeudaDelBurgo[]; readonly debe: number; readonly enCola: number; }
export interface TratoVisto extends TratoDelBurgo {}   // todo público

export interface VistaDelBurgo {
  readonly desde: 'burgo';
  readonly momento: MomentoDelBurgo;
  readonly paso: PasoDelTurno;
  readonly luego: 'por-tirar' | 'por-pasar';
  readonly turnoDe: AsientoId | null;        // a quién se ESPERA: pujaDe, apuro.quien o el del turno. null en reuniendo/terminada
  readonly duenoDelTurno: AsientoId | null;  // de quién es el turno aunque turnoDe sea otro (para la cinta: «Turno de Ana · puja Bea»)
  readonly yo: AsientoId | null;
  readonly jugadores: readonly JugadorVisto[];
  readonly titulos: readonly TituloVisto[];  // 28, público
  readonly concejo: { readonly casas: number; readonly posadas: number };
  readonly quedan: { readonly pregon: number; readonly arca: number };
  readonly tirada: readonly [number, number] | null;
  readonly tiradasDelTurno: number;
  readonly turnosAbiertos: number;
  readonly dobles: number;
  readonly ultimaCarta: CartaSalida | null;  // el número; el texto lo pone el cliente desde la tabla
  readonly almoneda: AlmonedaVista | null;
  readonly apuro: ApuroVisto | null;
  readonly tratos: readonly TratoVisto[];
  readonly topeDeVueltas: number;
  readonly sorteoDeSalida: readonly (readonly [number, number])[];
  readonly jugada: number;
  readonly sucesos: readonly SucesoDelBurgo[];
  readonly ganadores: readonly AsientoId[];
  readonly pregon: string;                   // la frase de la mesa, igual para todos: «Bea llega a la Calle de la Frutería y paga 50 € a Ana.»
  readonly aviso: string;                    // lo que ME concierne: «Debes 340 mrs: vende o empeña.»
  readonly tablero: TableroDeclarado;        // el respaldo (§3.2), ya resuelto para `quien`
}
```

`turnoDe` es UN campo, cadena no vacía o `null`, en la vista de TODOS incluido el
espectador y con estado `undefined` (`verify:larga` lo exige); cambia en cada puja, cada
apuro y cada relevo: por eso la mesa reprograma el plazo y «lleva tres días sin mover» sale
del que de verdad debe algo. En fases con cola (`colaDeApuros`) apunta al PRIMERO. `pregon`
y `aviso` se redactan en la proyección con plantillas y constantes (`cardinal`, `maravedies`),
sin i18n; `verify:burgo` afirma: ningún pregón vacío en `jugando`, ningún aviso con un id
crudo cuando hay `sentados`, ningún texto con marca.

### 3.2 El `TableroDeclarado` de respaldo: `tableroDelBurgo(vista, quien)`

Se compone de la vista y de `opcionesDelBurgo(vista, quien)`, nunca del estado. NI UN CAMPO
OPCIONAL: `''` donde no hay texto, `null` donde no hay movimiento, `carga: {}` donde no hay
carga. Colores literales `#rrggbb` (SVG nativo; nunca `var(--acento)`).

- **Geometría: cuatro tiras de diez** (una por lado, en sentido de la marcha: 0–9, 10–19,
  20–29, 30–39, de izquierda a derecha y de arriba abajo), caras de 100 × 150 en un
  `viewBox` de 1000 × 640 (`vista = encuadre(puntos, 20)` de `anillo.ts`/`malla-hexagonal`,
  nunca a mano): en 390 px salen a ~0,39 → casillas de 39 × 58 px, `cifra` legible a
  ~16 px, `rotulo` ≤ 6 letras; en el escritorio ~0,8. Es un MAPA legible; NO es un anillo
  (el retablo no sabe que lo es).
- **`caras`**: 40, `id: 'casilla:<i>'`, `relleno` = `BARRIOS[...].color` en solares y un
  gris cálido por clase en las demás (`#6e6a63` puertas, `#5a6a7a` oficios, `#7a5f4a`
  pregón/arca, `#4a4a4a` esquinas, `#8a2f2f` ¡A la Mazmorra!), `borde` = color del dueño o
  `#3a3a3a` (el relleno se oscurece un 20 % si está empeñado), `rotulo` = `CASILLAS[i].rotulo`,
  `cifra` = precio (sin dueño) / `rentaAhora` (con dueño) / `'E'` delante si empeñado /
  `'P'` si posada, `destacada` = casilla de `duenoDelTurno` y las `hasta` de los `mueve` de
  esta jugada, **`toque: null` SIEMPRE** (decisión 9).
- **`nudos`**: una ficha por jugador vivo (`'ficha:<asiento>'`, redondo, radio 14, color del
  jugador, desplazada dentro de la casilla por índice en una rejilla 3 × 2; `tenue` si
  presa), un cuadrado por casa (`'casa:<i>:<k>'`, radio 6, color del dueño, en la parte alta
  de la cara) y un cuadrado grande por posada (`'posada:<i>'`, radio 10). **`toque: null`**.
- **`lineas`**: `[]`.
- **`acciones`**: TODAS las opciones sin `declaracion`, `disponible: true`, con `rotulo` y
  `ayuda` de la opción (`comoAccion`), en este orden: lo del turno (tirar, pagar-fianza,
  usar-indulto, comprar, a-almoneda, pasar), luego alzar/vender/empeñar/desempeñar por
  casilla, luego pujas y pasar-puja, luego aceptar/rechazar/retirar, luego rendirse.
  `disponible: false` no se usa: lo que no se puede, no se ofrece.
- **`paneles`**, en orden FIJO (el retablo reconcilia por índice): «La mesa» (una línea por
  jugador: nombre · mrs · nº títulos · presa/quebrado · indultos), «Lo mío» (mis títulos con
  casas, empeño y renta), «La última carta» (título y texto de la tabla), «Última tirada»,
  y al FINAL sólo cuando existen: «La almoneda», «El apuro», «Los tratos».
- **`aviso`**: fin de partida primero; después el `aviso` propio; después el `pregon`.

Con esto los dos clientes pintan y JUEGAN el Burgo sin una línea nueva (fase 1):
`ElTableroEnLinea`/`Retablo` en la app; `Retablo` + `AccionesDelTablero` + `Formulario`
en el escritorio. Lo que el respaldo NO hace: proponer tratos ni pujar libre
(declaraciones); acepta, rechaza y puja por escalones. Se dice en la ayuda de «Lo mío».

### 3.3 El cable: cuánto pesa una lectura (cota medida en `verify:burgo`)

| Trozo | Estimación | Tope que se afirma |
|---|---|---|
| vista sin tablero (28 títulos, 6 jugadores, ≤ 64 sucesos) | ~7 KiB | ≤ 16 KiB |
| `tablero.caras` (40 × 4 puntos + rótulo + cifra) | ~9 KiB | — |
| `tablero.nudos` (6 fichas + 44 edificios) | ~5 KiB | — |
| `tablero.acciones` + paneles | ~4 KiB | — |
| **vista entera canónica** | **~25 KiB** | **≤ 40 KiB** |
| `opciones` por asiento | ≤ 60 × 150 B ≈ 9 KiB | ≤ 12 KiB |

Riberas está por debajo de 30 kB; el Burgo queda parecido. Lo que NO viaja: los 40 nombres,
precios, rentas y textos de carta (están en `burgo-tablero.ts`, que compilan los dos
clientes).

---

## 4. `burgo-en-tres.ts`: la traducción vista → escena, sin reglas

`shared/arcade/juegos/burgo-en-tres.ts`: sin `three`, sin React, sin reglas; sólo `import
type` de `escenas/burgo/tipos.ts`, `escenas/embarcadero/figuras.ts` y `escenas/dados.ts`
(mismo patrón que `riberas-en-tres.ts:95-96`). Cada función acepta `vista: unknown`, valida
POR ESTRUCTURA (`esVistaQueSePinta`: `desde === 'burgo'`, `jugadores`, `titulos`, `jugada`;
lo demás con guarda y `?? []`) y devuelve `null` cuando no hay nada que pintar. **Nunca
monta un movimiento**: devuelve LA OPCIÓN ENTERA que `opciones()` dio; el cliente manda
`{ tipo: o.tipo, carga: o.carga }`. Las dos declaraciones (puja libre, trato) se montan con
`montar()` de la propia traducción, con EXACTAMENTE los campos de la puerta. Comprobada
desde Node con mesas reales (`verify:burgo-en-tres`).

```ts
export interface VistaQueSePinta { readonly desde: 'burgo'; readonly momento: string; readonly jugadores: readonly unknown[]; readonly titulos: readonly unknown[]; readonly jugada: number; }
export function esVistaQueSePinta(v: unknown): v is VistaQueSePinta;
export function seVeEnTres(v: unknown): boolean;                       // del Burgo y ≤ 6 jugadores; NO mira colores (se tiñe)

/* El tablero y su firma */
export function tableroEnTres(v: unknown, yo: QuienMira, opciones: readonly Opcion[]): TableroDelBurgoEn3D | null;
export function firmaDelTablero(t: TableroDelBurgoEn3D): string;      // el cliente devuelve LA MISMA lista si la firma no cambió (trampa del tirón por sondeo)

/* Los sucesos que se animan */
export function sucesosEnTres(jugadaVista: number, v: unknown): readonly SucesoDelBurgo[];
  // [] si v.jugada === jugadaVista; v.sucesos si v.jugada === jugadaVista + 1; si saltó más de una: lista gruesa
  // derivada (un `mueve` con como:'viaja' por figura cuya casilla no cuadra, un `cambia-de-mano` por título): nunca vacía si cambió algo visible
export function recorridoEnTres(s: SucesoDelBurgo & { que: 'mueve' }): readonly number[];   // s.recorrido; [desde, 10] para 'viaja' a la Mazmorra no aplica (va por 'a-la-mazmorra')
export function camaraSigueA(v: unknown): AsientoId | null;            // quien mueve en los sucesos de esta jugada, si no turnoDe

/* Figuras, peones, dados */
export function figurasEnTres(v: unknown, asientos: readonly { readonly id: string; readonly figura?: string }[]): readonly FiguraEn3D[];  // aventurero = figuraQueSePinta(id, figura)
export function dadosEnTres(v: unknown, yo: QuienMira, opciones: readonly Opcion[]): DadosDelBurgoEn3D | null;
  // { par: [d1,d2] | null, tirado: paso !== 'por-tirar', sello: tiradasDelTurno + 100 · turnosAbiertos, porTirar: tirarEnTres(opciones) !== null,
  //   delanteDe: asiento delante del que ruedan en el sorteo (null en la Feria); movimiento: la opción entera }
export function tirarEnTres(opciones: readonly Opcion[]): Opcion | null;   // por TIPO ('burgo:tirar'), nunca por id

/* Lo que se toca en el lienzo y lo que va a la hoja */
export function obraPosibleEnCasilla(v: unknown, yo: QuienMira, opciones: readonly Opcion[], casilla: number): readonly Opcion[];  // comprar/a-almoneda/alzar/vender/empeñar/desempeñar de ESA casilla
export function fichaDeCasilla(v: unknown, casilla: number, yo: QuienMira, opciones: readonly Opcion[]): FichaDeCasilla;
  // nombre, barrio, precio, tabla de rentas con la fila actual, dueño (nombre y color), estado, casas, y TODAS sus opciones
export function hojaEnTres(v: unknown, yo: QuienMira, opciones: readonly Opcion[]): HojaDelBurgo;
  // secciones ORDENADAS: cinta | marcador | ahora | carta | almoneda | trato | mios | mesa — cada una con textos y sus opciones ENTERAS
export function marcadorEnTres(v: unknown, yo: QuienMira): MarcadorDelBurgo;   // por jugador: color, nombre, mrs, patrimonio, nº títulos, presa, indultos, quebrado, esSuTurno; y el Concejo
export function pujaEnTres(v: unknown, yo: QuienMira, opciones: readonly Opcion[]): PujaComponible | null;
  // { casilla, puja, minimo, maximo, escalon, fijas: Opcion[] (minimo/+50/+100), pasar: Opcion, montar(cuanto): MovimientoDeclarado | null }
export function tratoEnTres(v: unknown, yo: QuienMira, opciones: readonly Opcion[]): TratoComponible | null;
  // { abiertos: { trato: TratoVisto, aceptar?, rechazar?, retirar? }[], puerta: { a: [...], mrsMaximo, titulos, indultos } | null, montar(a, doy, pido): MovimientoDeclarado | null }
export function cartelEnTres(v: unknown): CartelDelBurgo | null;      // la última carta (título y texto de la tabla) mientras dure este turno
export function elPregonEnTres(v: unknown): { readonly texto: string; readonly aviso: string };
export function meToca(v: unknown, yo: QuienMira): boolean;
export function esperaA(v: unknown): string;                          // «Esperando a Bea…» / «Carla decide si compra…»
export function opcionesFueraDelTablero(opciones: readonly Opcion[], tablero: TableroDelBurgoEn3D | null, dados: DadosDelBurgoEn3D | null, hoja: HojaDelBurgo | null): Opcion[];
  // recibe LOS OBJETOS que se pintan (no booleanos) y se aplica DESPUÉS de componerlos: cada movimiento exactamente UNA vez, en la escena, en la hoja o como botón; las puertas nunca

/* Textos */
export function maravedies(n: number): string;   // «1.500 mrs»
export function cardinal(n: number): string;
```

Al tocar: una casilla → `obraPosibleEnCasilla` (una sola opción → se manda; varias →
hoja/`ElijeUna` «¿Qué haces en X?»; ninguna → `fichaDeCasilla`); los dados → `tirarEnTres`
(la máquina arranca en el acto; `'rechazado'`/`'sin-red'` los devuelve); el peón de un rival
→ su ficha en la hoja (y «Proponer trato» si procede). Nada más se compone en el cliente.

**`SucesoDelBurgo` es el tipo de la escena también** (`escenas/burgo/tipos.ts` lo importa con
`import type` de `burgo.ts`; se borra al compilar): un solo vocabulario de sucesos en todo
el árbol. Las coreografías, sus tiempos y el contrato de props están en la parte 2, §5.

Sigue en **[DISENO-2.md](DISENO-2.md)**: §5 la escena, §6 los clientes, §7 el lobby.
