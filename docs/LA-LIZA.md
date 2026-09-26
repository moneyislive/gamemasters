# LA LIZA

El módulo hermano de Boots on Board para los arcades cuyo modo principal ES la acción: qué declara,
cómo se usa, qué reutiliza sin tocar, qué ofrece que Boots on Board no tiene y cómo se absorbería en
Boots on Board sin romper a los tres juegos que hoy se andan.

> **Qué es este documento.** Una PROPUESTA para la sesión de Boots on Board, escrita el 24-sep-2026
> desde el worktree `GameMasters-matrix` (rama `matrix`, nacida de `botas-servidor` d7121ab) mientras
> se construye «El Quiebro» (`docs/EL-QUIEBRO.md`), el primer juego que la usa. No pide nada hoy:
> la Liza vive en ficheros NUEVOS, con su ruta y su versión, y el diff de lo que Boots on Board tiene
> en obras es vacío. Lo que sí propone es un camino para que, cuando Boots on Board quiera crecer
> hacia la acción, crezca adoptando estas declaraciones en vez de escribir otras.
>
> Si algo de aquí contradice al código, gana el código. Los contratos que manda son
> `shared/mecanicas/liza/{declaracion,protocolo,geometria,tipos-de-la-sala}.ts` y
> `shared/arcade/juegos/lizas.ts`; la arquitectura del juego que la estrena, `docs/quiebro/ARQUITECTURA.md`.

---

## 0 · En una pantalla

Boots on Board sabe BAJAR al tablero de una mesa: andar con choques, verse con los demás, darse un
golpe lento y robar botín. Es una capa OPCIONAL (la modalidad `botas`) sobre juegos que se juegan
desde arriba. La Liza es para el caso contrario: juegos en los que andar y pelear ES el juego, con
enemigos del servidor, golpes que se anuncian y se esquivan en una ventana, balas, encuentros por
oleadas y objetivos en el mundo.

Las dos comparten la misma columna, que es de Boots on Board y no se toca: **el aparato manda su
sitio y el servidor lo VALIDA** contra la estructura con enteros; la mesa sellada guarda lo que
perdura y la sala del canal lo que pasa y se olvida; el cliente declara intención, nunca resultado.
Lo que la Liza añade son **declaraciones**: datos llanos que un juego produce de su vista pública y
su código, y que la sala genérica interpreta sin saber a qué se juega.

| | Boots on Board | La Liza |
|---|---|---|
| Para qué | bajar a pie a un juego de tablero | juegos cuyo modo principal es la acción |
| Mesa | modalidad `botas`, elegida al abrir | modalidad `normal`: estar en `lizas.ts` es estar siempre a pie |
| Registro | `shared/arcade/juegos/mundos.ts` (productor de mundo) | `shared/arcade/juegos/lizas.ts` (productor de liza) |
| Ruta del canal | `/api/arcade/mesas/:codigo/botas`, `VERSION_DEL_CANAL = 1` | `/api/arcade/mesas/:codigo/liza`, `VERSION_DE_LA_LIZA = 1` |
| Cierres | 4000-4099 | 4100-4199 |
| Calidad del aparato | compuerta que VETA a un aparato `sobria` | degrada y nunca veta |
| Refriega | golpe con rebobinado de 250 ms, tres vidas, cono de ±45° | acciones anunciadas, esquiva juzgada en el reloj del defensor, guardia, empuje, balas |
| Quién pelea | los asientos entre sí | los asientos contra entidades del servidor (y, en fases posteriores, entre sí) |
| Qué escribe en la mesa | `arcade:botin` por pareja y minuto | `arcade:ronda`, `arcade:reloj`, `arcade:ausente`: gruesos, 1-1,5 por minuto |

---

## 1 · Qué declara

Una `LizaDeclarada` (`shared/mecanicas/liza/declaracion.ts`) es lo que un juego dice de una mesa en
un momento: su mundo, la fase en que está, el reglamento de cada asiento y el catálogo de estados,
enemigos, proyectiles y veredictos. **Todo son datos** —enteros, Q16.16, tics o milisegundos—, sin una
función dentro: pasa por `canonico.ts`, se compara entre Node y Hermes, se fija en un comprobador y se
guarda junto a un fallo para reproducirlo. Lo que depende del nivel o de lo que cada cual eligió lo
COMPONE el productor antes; a la sala llega hecho número.

Las letras son las del §11 del documento de diseño del juego que la estrena. La regla de entrada, que
es la que impide que la plataforma crezca con la forma de un solo juego: **ninguna declaración entra
sin un segundo uso nombrado y sin un comprobador que la use con una liza de juguete que no es ese
juego** (`verify:liza-protocolo` hoy; `verify:liza` con la sala).

| # | Declaración | En el código | Qué dice | Segundo uso |
|---|---|---|---|---|
| A | Alta en el registro | `lizas.ts`: `[arcade, productor(vista, codigo) → LizaDeclarada \| null]` | Que el arcade se lidia. Estar aquí es: siempre a pie, calidad que degrada y nunca veta, vestíbulo sin plazos por turno | Cualquier arcade de acción |
| B | Mundo v2 | `MundoDeLaLiza` | El `MundoDeclarado` de `mundo.ts` TAL CUAL como suelo, más escala, clase de cada caja, zonas, límites, grafo y sitios de nacer por papel | Los objetivos y zonas de Boots on Board |
| C | Reglamento del cuerpo | `CuerpoDeclarado` en cada `ReglasDeAsiento` | Marchas, radio, presupuesto corto y largo, vida | Velocidades por juego en Boots on Board (hoy globales) |
| D | Estados temporizados | `EstadoDeclarado` (qué es) + `PuestaDeEstado` (cuánto dura) | Si se anda, si se actúa, qué lo corta, cuánto es intocable, cuánta distancia extra admite | La esquiva y «en el aire» |
| E | Acciones anunciadas | `AccionDeclarada`, `EngancheDeclarado`, `CadenaDeclarada`, `EfectoDeclarado` | Anuncio en tics, alcance, **avance**, enganche con radio y cono, cadena con ventana y ritmo, daño, estado, empuje, recarga. El avance lo anda el aparato al pulsar; la sala sólo le acredita lo que puede ir de camino en los `aqui` que aún no ha visto (`llegaConSuAvance`), nunca lo que no anduvo | La refriega de Boots on Board |
| F | Esquiva en ventana | `EsquivaDeclarada` | Ventana limpia en ms del aparato, qué da acertar y qué fallar | Cualquier juego con parada o esquiva |
| G | Guardia | `GuardiaDeclarada` | Cono, estados en que no para, respuesta | Un escudo |
| H | Empuje contra la estructura | `EfectoDeclarado.empuje` y `.alChocar`; `trayectoria` en `geometria.ts` | Extra de daño y de tics si el empuje choca; segmento-AABB por prueba de losa en Q16.16 | Empujones; y la misma prueba es la línea de vista |
| I | Proyectiles | `ProyectilDeclarado` | Apuntar, velocidad, radio, alcance, daño, ráfaga; juzgados contra los sitios que el blanco declaró. La línea de apuntado viaja como suceso `apunta`; y la limpia contra una bala lanza en el mismo tic, como UN golpe, la acción de `contraProyectil`, con su vuelo dentro del avance | Una lanza o un arco |
| J | Entidades del servidor | `ClaseDeEntidad`, `CerebroDeclarado`, `AlCaerDeclarado` | Vida, marchas, acciones, guardia, cerebro genérico (acechar, rondar, atacar con turno, disparar con vista, seguir el grafo), aparición y qué pasa al caer | Animales o guardianes de un tablero |
| K | Turnos de ataque | `TurnosDeclarados` | Cuántas amenazas admite cada asiento y a quién no se le asigna ninguna | Cualquier juego contra NPC |
| L | Encuentros | `EncuentroDeclarado`, `GrupoDeclarado` | Grupos por clase y zona, escalados por presentes, con tope de vivos y reloj | Hordas en cualquier liza |
| M | Zonas de acción sostenida | `ZonaDeAccionDeclarada` | Mantener N tics dentro de un radio, capacidad, qué produce, si el daño lo rompe | Puertos y talleres de un tablero |
| N | Portables | `PortableDeclarado` | Contador por asiento con tope, montón al caer, pago al salir | Generaliza `arcade:botin` |
| O | Recurso de equipo, rescate y desconexión | `EquipoDeclarado`, `RescateDeclarado` | Recurso común, rescate manteniendo, reaparición pagando | Cualquier cooperativo |
| P | Rol sin cuerpo y presencia | `SinCuerpoDeclarado`, `PresenciaDeclarada` | Quien no tiene sitio vive por `eco`, recibe la foto y manda avisos. El **ausente momentáneo**: sin un `aqui` vivo en `ausenteTrasTics`, intocable, fuera de los turnos, ignorado por las entidades, y ni anda ni pega (ver §2.3) | Espectadores de cualquier mesa; la pestaña oculta de cualquier juego a pie |
| Q | Avisos | `AvisosDeclarados` | Clases, vida, a qué apuntan y cada cuánto | Comunicación sin voz en cualquier juego |
| R | Relojes de fase | `FaseDeLaLiza.reloj` | La vista declara `{id, duraMs}` y la sala mete `arcade:reloj {id}` una vez | Cualquier arena con rondas |
| S | Veredictos | `VeredictosDeclarados` y las cargas `arcade:*` | `arcade:ronda {n, resultado, cuentas, recurso}`, `arcade:reloj`, `arcade:ausente`; qué columna es cada número. Idempotentes: un reloj que no es el de la fase en curso, o un ausente repetido, entra **sin efecto** (el mismo estado, sin motivo), no se rechaza | Todo el motor |
| T | Protocolo | `protocolo.ts` | JSON con claves exactas y lectores estrictos; la acción viaja dentro del `aqui` | — |
| U | Aforo | `AforoDeLaSala`; coste y admisión en `lizas.ts` | Lo más que vive a la vez en la sala, que es también su coste declarado | Todas las lizas |
| V | Azar sembrado | `FaseDeLaLiza.semilla` | Semilla pública de la fase: cualquier fallo se reproduce con lo que ya es público | Reproducir fallos |

**Lo que entra: la liza abierta (L1-L12).** Una liza grande que se recorre entera, con objetivos
repartidos por ella (el diseño de la ciudad abierta de El Quiebro, `docs/quiebro/CIUDAD-ABIERTA.md` §5.5).
Cada una de sus doce declaraciones vive con su forma fijada en `AmpliacionDeLaLiza`, con su revisión en
`problemasDeLaAmpliacion`, hasta que la sala la cumple; entonces entra en `LizaDeclarada` y su revisión
pasa a `problemasDeLaDeclaracion`. Ya ha entrado una:

| # | Declaración | En el código | Qué dice | Segundo uso |
|---|---|---|---|---|
| L10 | Alcance de blanco y olvido | `CerebroDeclarado.alcanceDeBlanco` y `EncuentroDeclarado.olvido` | Ninguna entidad toma por blanco —ni cuenta como su perseguidora, ni toma turno, ni apunta— a un asiento a más de su alcance (0 = sin tope), y suelta al que se le va. La que se queda sin nadie a su alcance pero ACOMPAÑADA (algún asiento que valdría de blanco a `olvido.distancia` o menos) anda hacia el más cercano por el camino por el que lo perseguiría, sin hacerlo su blanco; sola, se queda donde está. La que pasa `olvido.tics` sin ningún asiento PRESENTE a `olvido.distancia` (el caído cuenta; el ausente y el que espera sin cuerpo, no) se va con `seva … disuelta` y vuelve a la cola de su grupo: alejarse no gana un `vaciar`. El reloj sólo corre mientras aparece, acecha o ronda. Con olvido, cada clase persigue de 1 a su distancia. Así no queda estado sin salida: con blanco pelea, acompañada se acerca, sola se olvida | Cualquier liza abierta: la ciudad de juguete de 300 × 300 de `verify:liza` (bloques 24 y 25) |

Mientras sus productores no la escriban, L10 admite una **forma transitoria**: un cerebro sin
`alcanceDeBlanco` (`CerebroSinAlcance`) y un encuentro sin `olvido` (`EncuentroSinOlvido`), que valen y se
juegan exactamente como «sin tope, sin olvido» (`alcanceDeBlancoDe`, `olvidoDelEncuentro`; `verify:liza`
lo compara tic a tic). Es la misma forma que el `nace` sin ronda del cable: dos contratos dichos y
comprobados, no un campo que a veces está. El productor de El Quiebro ya escribe la forma entera, y en su
entrega 1 con «sin tope, sin olvido» (alcance 0 y olvido `null`: sus encuentros están anclados a la plaza de
la Bajada o a la cabina; ver `PERSECUCION_DEL_SISTEMA` en `quiebro-reglas.ts`); los 45 m de alcance y el
olvido a 90 m en 10 s del diseño vuelven con la travesía, y mientras tanto `verify:liza` (bloque 25) juega
su ciudad con ellos puestos. Las lizas de juguete de otros comprobadores todavía no la escriben. Se quita
cuando todos la escriban.

**Y una que no es de aquel §11: el tiro cargado (W de `declaracion.ts`).** El ataque a distancia de un
asiento, que pidió el rayo de El Quiebro (`docs/quiebro/EL-RAYO.md`). Entró primero con su forma —la revisión lo
rechazaba mientras la sala no lo cumplía— y hoy la sala lo cumple entero (`shared/mecanicas/liza/tiro.ts`):

| # | Declaración | En el código | Qué dice | Segundo uso |
|---|---|---|---|---|
| W | Tiro cargado | `TiroDeclarado`, `NivelDelTiro`, en `ReglasDeAsiento.tiro`; el suceso `estalla` | Se MANTIENE `apuntar` (una sostenida) y se pulsa `soltar`: la carga es `msSoltar − msPulsar`, dos instantes del reloj del mismo aparato (el desfase no la mueve), acotada por lo que la sala vio y por `cargaMaximaMs`; el nivel es el último de la tabla con `desdeMs` ≤ la carga. Sale una bala de ese nivel desde el tic de la pulsación de `soltar`, hacia la mira o hacia el blanco que acepta el enganche (cono y línea de vista), y se juzga CONTRA LAS ENTIDADES en pie en el presente de la sala —nunca contra asientos: sin fuego amigo—, tramo a tramo, fracción menor y número menor, con línea de vista hasta el cuerpo. Donde se para (el centro del cuerpo, o la estructura) sale `estalla`, y su ÁREA alcanza a las demás en pie con línea de vista desde ahí, empujadas hacia fuera; el blanco directo no la recibe dos veces. Sólo el `soltar` explícito dispara: dejar de mantener, un golpe, quebrar, otra pulsación, otra fase o quedarse ausente la dejan sin disparar y sin gastar la recarga, y el mismo dedo no la vuelve a empezar. No se carga en un estado que no bloquea (acabarlo sería quitarle lo que da), con un golpe propio anunciado, en la recuperación, en la recarga ni con la bala anterior en el aire: cada asiento tiene su PLAZA, fuera del aforo de las entidades, y el coste la cuenta. La guardia no lo para | El ARCO de la liza de juguete de `verify:liza` (flechas que vuelan de cuatro a siete tics; su robot, `arquero`, tensa y suelta), y el golpe en anillo (el área de un nivel) |

**Lo que la Liza no declara, a propósito.** Ningún nombre que se lea: los ids son enteros de 1 a 255
y los nombres son del juego. Ninguna altura: el mundo sigue siendo plano como el de `mundo.ts`, y «en
el aire» será un ESTADO (D) con cajas de clase `baja` (B), no una coordenada `y` (y por eso una bala, la
de una entidad o la de un tiro, se para también contra lo bajo). Ninguna foto por equipo con bits ocultos
(la W de aquel §11, que no es el tiro): llegará con el modo que la necesite, no antes.

---

## 2 · Cómo se usa

### 2.1 · Un juego que se lidia

1. **Su vista pública** lleva lo que hace falta para derivar la liza en los dos lados: la fase, el
   reloj de fase y el reglamento **por ids** (qué nivel, qué mejoras eligió cada asiento), nunca los
   números. Es la regla de `mundos.ts`: lo que el aparato no puede derivar no puede decidir nada.
2. **Su productor** (`shared/arcade/juegos/<juego>-liza.ts`) es una función pura `(vista, codigo) →
   LizaDeclarada | null`: lee la vista con su lector estricto, compone el reglamento de cada asiento,
   deriva el mundo del código y la fase, y pone los puntos de control de la mesa en `alEmpezar` y en
   `equipo.recurso`. No lanza: una vista rara es un `null`.
3. **Una fila en `FILAS_DE_LIZAS`**. Nada más: la sala, el cable, la geometría y los veredictos son de
   la plataforma.
4. **Su reductor** atiende `arcade:ronda`, `arcade:reloj` y `arcade:ausente` DELANTE de su portillo de
   opciones —como el tic y el botín—, rechaza con motivo lo malformado y acepta una ronda sólo si su
   `n` es la de la fase en curso: una ronda repetida tras rehacerse la sala no se suma dos veces. Lo
   que llega tarde pero bien formado —el `arcade:reloj` de un reloj que la mesa ya cambió, el mismo
   ausente otra vez— entra SIN EFECTO: el mismo estado y sin motivo. La sala sigue mandando, y un
   veredicto rancio no puede tumbar nada ni hacer que la sala reintente para siempre. Y si la vista
   cambia su reloj dentro de la misma fase (la preparación que se acorta cuando están todos listos),
   la sala lo vuelve a armar contando desde el principio de la fase, sin empezarla otra vez.
5. **Su comprobador** exige `problemasDeLaDeclaracion(liza) === []` en TODAS las fases que el
   productor saca, y el mismo `aforo` en todas.

### 2.2 · La sala

`avanzarLaSala(sala, entradas) → {sala, sucesos, veredictos, fotoDebida}` es PURA: el azar viaja
dentro del estado, el tiempo es el número de tic, y toda la E/S —el WebSocket, el temporizador de
50 ms, las cuotas, medir la ida y vuelta, meter los veredictos— es de `server/src/liza/`. Una sola
firma para nacer, `salaNueva(declaracion, semilla)`: empezar la fase en curso desde el punto de
control ES reanudarla, así que tras un despliegue la sala se rehace con la misma llamada y como mucho
se pierde una fase. La sala se prueba entera en Node y en Hermes, sin servidor.

Al empezar una fase, quien no tiene cuerpo, queda fuera del límite nuevo o queda DENTRO DE LA ESTRUCTURA
del mundo nuevo aparece en su sitio de nacer, con su `corrige`; y si el mundo cambia sin cambiar la fase,
quien ya no cabe donde está, también. Un mundo que cambia de una fase a otra (en la ciudad abierta de El
Quiebro, cada noche trae sus coches y sus obras) podía dejar a un asiento dentro de una caja nueva, con
cada paso corregido de vuelta al mismo sitio.

La sala LEE la mesa (la vista pública, al subir la revisión) y ESCRIBE en ella sólo veredictos
gruesos por `meterDeLaPlataforma`. Los asientos escriben en la mesa por la vía de siempre
(`POST …/movimientos`). No hay tercer camino.

### 2.3 · El aparato

- Abre `/api/arcade/mesas/:codigo/liza` y dice `hola {v, llave, c}`: la llave en el primer mensaje,
  nunca en la URL; `c` es su reloj, en ms desde que abrió ESTE canal (un canal nuevo es un reloj
  nuevo, y la sala lo sabe).
- Manda `aqui {n, x, z, r, m, a}` cada tic en combate: su sitio ya predicho con `unPaso` sobre la
  MISMA arena (`arenaDeLaLiza`) y, en `a`, la acción del tic con el `timeStamp` de su pulsación —no
  el del fotograma—. Las acciones viajan dentro del `aqui` para no vaciar el cubo de 25 mensajes.
- Recibe `dentro`, `foto` (una cadena por sala), `tic` con los sucesos agrupados —el `anuncio` con el
  instante del impacto YA en su reloj; el `apunta` con el de la primera bala, o `a` 0 si la entidad lo
  deja—, `eco`, `corrige` (que puede traer `n` 0) y `fuera`.
- Pinta a los demás 150 ms atrás y lo ajeno por guion desde el suceso; predice sólo lo propio. Un golpe
  ajeno con avance se pinta con su avance, y el que lleva el vuelo de una limpia contra bala (su anuncio
  tarda más que el suyo) se pinta volando entero hasta su blanco.
- **Lo que el aparato no pide.** Con un golpe propio anunciado y sin resolver, la sala sólo atiende el
  eslabón siguiente de su cadena dentro de su ventana (`intentarGolpe`); el aparato hace lo mismo antes de
  mandar, y una pulsación que la sala tiraría ni sale, ni mueve el cuerpo, ni cambia el gesto. Si no, el
  aparato anda un avance que la sala nunca lanzó y el golpe que sí lanzó se juzga con el cuerpo en otra
  parte (en El Quiebro, GOLPE a media Acometida la dejaba a seis metros del tirador).
- **La presencia.** Un `aqui` es VIVO si cierra `AQUIS_PARA_ESTAR` (10) tics seguidos del aparato; uno
  que pulsa algo o se mueve también cuenta. Tras un parón el aparato manda como mucho
  `TOPE_DE_AQUIS_DE_GOLPE` (8) de golpe, así que la ráfaga de una pestaña frenada no basta para seguir
  presente: a los `ausenteTrasTics` sin uno vivo el asiento queda **ausente**. Ausente, lo que pulsa no
  cuenta ni se guarda, lo que había lanzado y no ha llegado se corta, lo que venía contra él se corta sin
  daño y sus esquivas se olvidan. Vuelve con una serie viva y una vuelta corta (`TICS_DE_LA_VUELTA`, 10,
  de intocable) que se acaba con su primera acción. Para «se fue» cuenta el ausente sumado en la fase,
  no el último tramo: esconderse y asomarse en bucle no hace aguantar una ronda. El aparato de El
  Quiebro, además, se CALLA al irse al fondo (la pestaña oculta, la página que se va, la app en segundo
  plano): suelta los mandos y deja de mandar, y la sala lo da por ausente aunque el motor no frene sus
  temporizadores.

### 2.4 · Cómo se juzga una esquiva sin que el desfase importe

Es la pieza que Boots on Board no tiene y la que más cuesta explicar, así que va entera: la sala
calcula el instante del impacto en el reloj DEL BLANCO una vez (`tBlanco = I + desfase`), lo guarda en
el anuncio y se lo manda; el aparato cierra el anillo en ese instante de su reloj y la persona pulsa
con el anillo; la sala compara `tBlanco − ms` —dos números del mismo reloj— con la ventana. El error de
la estimación del desfase desplaza el anillo en tiempo de pared, pero no la resta. El detalle, con el
orden de ventana e intocable, está en la cabecera de `tipos-de-la-sala.ts`.

---

## 3 · Qué reutiliza sin tocar

La Liza USA estas piezas y no las edita. Su diff con la rama de Boots on Board en ellas es VACÍO, y
`verify:nucleo-quieto` lo vigila para lo sellado.

| Pieza | De dónde | Para qué la usa la Liza |
|---|---|---|
| `TICS_POR_SEGUNDO`, `SENO`/`COSENO` (256 rumbos) | `shared/mecanicas/andar.ts` | El tic de 50 ms; `rumboHacia` busca en la misma tabla sin `atan2` |
| `MundoDeclarado`, `arenaDe`, `sePuedeEstar`, `unPaso`, `seAndaEnRecta` | `shared/mecanicas/mundo.ts` | El suelo de la liza ES un `MundoDeclarado`; predecir y validar el paso con la misma arena |
| `por()`, `entre()`, `UNO` | `shared/mecanicas/fijo.ts` | Todo producto Q16.16, nunca `>>16` ni `Math.imul` |
| `Azar` sembrado | `shared/mecanicas/azar.ts` (sellado) | El azar de la sala, dentro de su estado |
| `canonico` | `shared/mecanicas/canonico.ts` (sellado) | Que una declaración se pueda comparar, fijar y guardar |
| `crearCuotas`, `procedenciaDeLaSubida` | `server/src/botas/cuotas.ts` | Los topes del `upgrade`: globales, sin saludar, por procedencia y ritmo |
| `origenAdmitido`, `codigoDeLaRuta` | `server/src/botas/enchufe.ts` | El origen contra la lista blanca; y saber si una ruta que no es suya es de botas (deja pasar) o de nadie (404) |
| `meterDeLaPlataforma` | `server/src/arcade/mesas.ts` (sellado) | La única puerta de los veredictos `arcade:*` a la mesa |
| `TableroDeclarado` | `shared/mecanicas/tablero-declarado.ts` | El respaldo honrado: la vista de un juego de la Liza lleva su plano con el marcador en paneles, y cualquier cliente que no pinte la escena la juega sobre el retablo |

Y hereda, sin copiarlas en código, las decisiones que allí costaron: la llave en el primer mensaje,
JSON de texto con claves exactas y lectores que devuelven `null` ante cualquier forma inesperada,
256 B de subida y 25 mensajes por segundo con ráfaga de 40, una foto serializada una vez por sala, un
solo temporizador por proceso parado si no hay salas, cierres con código propio y desalojo por
contenido.

---

## 4 · Qué ofrece que Boots on Board no tiene

Cada fila dice el SEGUNDO USO en Boots on Board: lo que la declaración le compraría a los tres juegos
que hoy se andan, no sólo al juego que la estrena.

| Lo que ofrece | Por qué Boots on Board no lo tiene hoy | Segundo uso en Boots on Board |
|---|---|---|
| **Reglamento del cuerpo por juego** (C) | Velocidades (12 y 26,4 u/s), radio (0,4 u) y presupuesto son constantes globales de `andar.ts` y del canal | Riberas, el Burgo y Las Lindes podrían andar a su escala; hoy los tres comparten la de un tablero de 864 u |
| **Estados temporizados** (D) | El canal conoce tres estados fijos (de pie, caído, intocable) con duraciones globales | Caer, renacer e intocable serían tres `PuestaDeEstado`; una esquiva o «en el aire» se añaden sin subir el protocolo |
| **Acciones anunciadas con su instante** (E) | El golpe se juzga por rebobinado sobre el rastro del que golpea | La refriega declarada: alcance, cono y recarga por juego en vez de `ALCANCE_DEL_GOLPE` global |
| **Esquiva juzgada en el reloj del defensor** (F) | No hay esquiva; el rebobinado favorece al que golpea (150-250 ms de ventaja del que asoma, aceptados por Miguel el 20-sep) | Un duelo lento con parada, que Boots on Board no puede ofrecer justo sin él |
| **Guardia y empuje contra la estructura** (G, H) | No hay | Un escudo; empujar a alguien contra un edificio del Burgo |
| **Prueba de losa segmento-AABB en Q16.16** (H) | La línea de vista se hace con `seAndaEnRecta`, que exige suelo: no se ve por encima del agua de Riberas | Línea de vista y trayectorias sobre vados y huecos |
| **Proyectiles** (I) | La foto sólo lleva asientos | Una lanza en Riberas sin inventar otro mensaje |
| **Entidades del servidor con cerebro genérico** (J, K, L) | La sala no tiene entidades; `server/src/botas` no sabe de juegos | Animales en Las Lindes, guardias en el Burgo, declarados como datos |
| **Zonas de acción sostenida** (M) | No hay disparadores en el mundo | Descargar en un puerto, trabajar en un taller: un veredicto grueso por `meterDeLaPlataforma` |
| **Portables con montón** (N) | El botín mueve bienes de la mesa de un asiento a otro, una vez por pareja y minuto | Lo que se recoge en el mundo y vale al volver, sin escribir un movimiento por recogida |
| **Recurso de equipo, rescate, rol sin cuerpo, avisos** (O, P, Q) | Quien no baja está de pie en su sitio de nacer y se le puede golpear (a propósito: nadie es inmune por no bajar) | Espectadores que miran sin ser blanco; marcar a alguien sin voz |
| **Veredictos por ronda con cuentas declaradas** (S) | Sólo `arcade:botin` | Un objetivo cumplido o una ronda cerrada, con sus columnas declaradas y un solo lector |
| **Aforo por coste declarado** (U) | Cuotas por conexión, no por coste de sala | Admitir salas por lo que cuestan, no por cuántos sockets abren |
| **Calidad que degrada y no veta** | La compuerta veta a un aparato `sobria` (la razón: que nadie sea inmune por no bajar) | Un juego donde todos están siempre abajo no tiene esa razón; queda como política por registro |

---

## 5 · Cómo se absorbería en Boots on Board sin romper a los tres juegos

La propuesta es que Boots on Board **adopte las declaraciones, no el juego**: la Liza no tiene ni una
palabra de El Quiebro dentro (en sus contratos lo comprueba `verify:liza-protocolo`, comentarios
incluidos), así que lo que se absorbe es plataforma. El orden importa más que el destino, y cada paso tiene su condición de salida: **la
batería de los tres juegos en verde SIN CAMBIAR UN SOLO COMPROBADOR suyo** (`verify:botas`,
`verify:sala-de-botas`, `verify:protocolo-de-botas`, `verify:cuotas-de-botas`, `verify:botin`,
`verify:mundo` y los tres `*-mundo`). Un paso que obligue a tocar uno de ésos no es una absorción: es
un cambio de comportamiento, y va aparte y con decisión de Miguel.

### Paso 0 · Hoy: convivir

Dos registros, dos rutas, dos versiones y dos rangos de cierre. Un aparato viejo de botas nunca llama a
`/liza` y uno de la Liza nunca a `/botas`. El `upgrade` de la Liza deja pasar las rutas que no son
suyas —hay otro oyente— y sólo contesta 404 a lo que no es de ninguno (`codigoDeLaRuta`). Nada que
coordinar salvo el diff vacío de §3.

### Paso 1 · Los tres mundos, envueltos en una liza de paseo

Una función de plataforma, `lizaDePaseo(mundo, reglamento)`, envuelve el `MundoDeclarado` que ya produce
cada juego de `mundos.ts` en una `LizaDeclarada` de fase `calma` (se anda y se valida; ni entidades ni
golpes): el suelo es el mundo TAL CUAL —la Liza no lo reescribe, lo contiene—, las cajas de clase
`alta`, un límite que es el mundo entero, sin zonas ni grafo, los sitios de nacer con papel `asiento`, y
un reglamento del cuerpo cuyas marchas, radio y presupuesto son EXACTAMENTE las constantes de hoy
(12 y 26,4 u/s, 0,4 u, ×1,25 con un segundo de tope). Con eso la sala de la Liza, en modo `calma`,
tiene que aceptar y corregir los mismos sitios que la sala de botas. Se prueba con un comprobador que
juega el mismo guion de `aqui` contra las dos salas y exige las mismas correcciones en los tres
mundos. Todavía no cambia ningún aparato.

### Paso 2 · La refriega, declarada

El golpe de Boots on Board se escribe como declaración: una `AccionDeclarada` de anuncio 0 con alcance
2,5 u y cono de ±45°, tres de vida en el `CuerpoDeclarado`, y caer (5 s) e intocable (2 s) como
`PuestaDeEstado`. Lo que NO se declara igual es el juicio: Boots on Board rebobina hasta 250 ms a los
demás, sobre su rastro de sitios aceptados, para verlos donde los veía quien golpea; la Liza anuncia el
golpe y juzga la esquiva en el reloj del defensor. No son dos implementaciones de lo
mismo, son dos políticas, y las dos caben: la propuesta es un campo en la acción que diga cuál manda
(`rebobinado` o `anunciada`), con el rebobinado de hoy como el de los tres juegos. Condición de
salida: el mismo guion de golpes tumba a los mismos en las dos salas, y `arcade:botin` sale igual.

`arcade:botin` se queda como es: mueve bienes DE LA MESA entre dos asientos y su tope por pareja y
minuto es una decisión legal (lo robado no sale de la mesa). Entra en la lista de veredictos de la
plataforma como el cuarto `arcade:*`, no como un portable.

### Paso 3 · Un canal, dos versiones

Cuando el paso 2 esté en verde, `/botas` puede hablar el protocolo de la Liza como su versión 2 **sin
dejar fuera a los APK viejos**: el servidor mira la versión del `hola` y atiende la 1 con el lector de
hoy y la 2 con el de la Liza, sobre la misma sala. Los aparatos nuevos hablan la 2; los viejos siguen
con la 1 hasta que se jubile, y la jubilación es una fecha que decide Miguel mirando cuántos APK viejos
quedan, no un comprobador. `VERSION_DEL_CANAL` no se sube en el sitio: se AÑADE la 2.

### Paso 4 · Lo que se estrena en los tres juegos, de uno en uno

Con la plataforma común, cada juego gana lo que quiera declarar —su escala en el paso 1, animales o
guardias con J, un puerto con M— con su propio comprobador y sin tocar a los otros dos. Es exactamente
la promesa de `pintores.ts` y `mundos.ts`: el juego siguiente escribe su fila y su declaración, no una
sala.

### Lo que la absorción no decide sola

- **La compuerta.** Boots on Board veta a un aparato `sobria` para que nadie sea inmune por no bajar;
  la Liza degrada porque allí todos están siempre abajo. Las dos razones son buenas y dependen del
  modo, así que la propuesta es que sea una propiedad del registro, no un `if` por juego. Se decide.
- **El que asoma.** Miguel aceptó el 20-sep 150-250 ms de ventaja del que asoma para una arena lenta. La
  esquiva juzgada en el reloj del defensor quita esa ventaja en lo que se anuncia. El tiro cargado (W) es
  casi instantáneo, pero sólo se juzga contra ENTIDADES, cuyos sitios decide la sala: contra un asiento no
  existe, así que no hay disparo instantáneo que compensar entre jugadores. Un modo contra jugadores (La
  Azotea de El Quiebro, su fase 3) tendrá que decidir si alarga los anuncios y qué hace con el tiro, con
  pruebas en redes móviles.
- **La altura.** Ninguna de las dos la tiene. La propuesta es la misma para las dos: «en el aire» como
  estado temporizado con cajas `baja`, no una `y`; lo que obligue a subir de verdad va en su propia
  decisión, porque toca `mundo.ts`, `andar.ts` y la foto de los dos canales.
- **El coste.** El modelo de `lizas.ts` sale de la tabla del diseño del juego: con la ciudad abierta
  (`docs/quiebro/CIUDAD-ABIERTA.md` §5.6), base 400, 250 por asiento, 300 por entidad y 40 por bala —y
  una bala más por cada asiento con tiro, su plaza—, y una sala llena de El Quiebro declara 8.620 µs/s con
  el rayo (8.380 sin él; caben 9 por proceso; antes, con el barrio, ≈ 5,9 ms/s y 13). Se afina con
  `medir:liza` en el plan donde corre. Si Boots on Board adopta el aforo, sus coeficientes salen de
  `medir:botas`, no de éstos.

---

## 6 · Estado a 26-sep-2026 (con el tiro cargado)

| Pieza | Fichero | Estado |
|---|---|---|
| Contratos (declaración, cable, geometría, tipos de la sala) | `shared/mecanicas/liza/*` | escritos, con `verify:liza-protocolo` y dos lizas de juguete; `apunta`, la presencia y el avance ya en el contrato |
| Registro, coste y admisión | `shared/arcade/juegos/lizas.ts` | escrito, con El Quiebro en la tabla (su aforo, el mismo en todas sus mesas y fases) |
| La sala pura | `shared/mecanicas/liza/sala.ts` y piezas | escrita, con `verify:liza` y la tanda Node/Hermes de `verify:determinismo` jugando la sala de El Quiebro |
| La E/S del servidor | `server/src/liza/` | escrita, con `verify:sala-de-la-liza` (robots WebSocket) y `medir:liza` fuera de la batería |
| El primer juego | El Quiebro (`docs/EL-QUIEBRO.md`) | se juega entero en el navegador, en solitario y a varias pestañas (`/sala/quiebro.html?prueba=1&codigo=…`); falta el aparato real (`docs/quiebro/ARQUITECTURA.md` §6) |
| La liza abierta (L1-L12) | `AmpliacionDeLaLiza` en `declaracion.ts`; los índices por dentro en `geometria.ts` y `cerebro.ts` | los índices (losas y nudos por celdas, campos por meta, la validación del mundo una vez) escritos y comprobados contra la fuerza bruta; **L10 cumplido por la sala** (`cerebro.ts`: `blancoAlAlcance` y `acercarseSinBlanco`; `encuentros.ts`: `olvidarLasEntidades`), con los bloques 24 y 25 de `verify:liza` (el 25, con la ciudad de El Quiebro y el L10 del diseño mientras su productor no lo declara: persecuciones que rodean una manzana y combates con todos huyendo por las calles) y su partida en Node y en Hermes en `verify:determinismo`, que se acerca sin blanco en los dos motores; las otras once, con su forma y su revisión, esperando a la sala. Y el cerebro ya no se clava donde no llega en recta a ninguno de sus nudos cercanos —el bolsillo de la cabina de la Llamada, entre su poste, un coche y la fachada—: busca uno más lejos (`nudoParaSalir`), y el bloque 18 vigila que nada pase 10 s acechando lejos de su blanco sin moverse |
| El tiro cargado (W) | `shared/mecanicas/liza/tiro.ts` (cargar, soltar, el vuelo, el juicio contra las entidades y el área); la revisión en `declaracion.ts`; el suceso `estalla` | **cumplido por la sala** (26-sep), con el arco de la liza de juguete y el rayo de El Quiebro declarados; el bloque 26 de `verify:liza` (la carga en el reloj del aparato, cada nivel, el juicio, el área con línea de vista, sin fuego amigo, las cancelaciones, la recarga, la plaza, y el que lee que sigue sacando el doble que el que aporrea, también con el tiro), sus roturas en `verify:liza-protocolo`, su declaración en `verify:quiebro`, y una sala con el rayo en la tanda Node/Hermes de `verify:determinismo` |

Nada se ha empujado. Cualquier cambio que esta propuesta pida en un fichero de Boots on Board se pide
por escrito a su sesión, no se hace desde aquí (`docs/EL-QUIEBRO.md` §14, riesgo 9).
