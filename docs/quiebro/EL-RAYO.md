# EL RAYO: el ataque especial a distancia de El Quiebro

Especificación de obra, 26-sep-2026. Manda sobre cualquier idea de quien implemente; donde el código diga otra
cosa, se comprueba y se avisa al coordinador. Las decisiones marcadas «Miguel» son suyas y no se reabren.

---

## 0. El pedido

Miguel (26-sep), con sus palabras resumidas:

- Un ataque especial en el lado de la pantalla CONTRARIO a las acciones (golpear, empujar, quiebro): lanzar un
  **rayo**. Da al personaje capacidad de atacar a los enemigos no sólo cuerpo a cuerpo.
- Al pulsar el botón de rayo aparecen unas **marcas en pantalla que marcan al objetivo** (como la mira de un
  shooter, pero adaptada al juego: por ejemplo **tres líneas**).
- Mientras sigue pulsado, un **zoom in muy ligero** para mejorar la precisión, y un **efecto/animación de
  acumular potencia**.
- **Poco tiempo pulsado**: el rayo sale con poca potencia pero **área de daño más amplia**. **Mucho tiempo**: se ve
  la animación de carga de energía, un zoom ligero **como de francotirador pero SIN mostrar ninguna mirilla de
  arma** (inmersivo, hacia el objetivo), y al soltar sale con **mucha potencia** y un alcance **prácticamente de
  bala**.
- **El rayo tiene que verse realista**: prácticamente no se ve, **es un destello**. Si se dispara rápido, se ve
  cómo afecta en área. El potente es un **destello más grueso** que va **a máxima velocidad** a donde se apunta.
- Se pulsa con el **dedo contrario** a las acciones; el **dedo principal queda libre para apuntar** pulsando y
  arrastrando, mientras se mantiene el botón; se dispara **al soltar**.
- «Quiero que trabajes mucho este ataque para que se vea increíble, no me vale algo mediocre, tiene que ser propio
  de un ataque especial y muy realista.»
- Además: los **botones de las acciones** (golpear, empujar, quiebro…) «visualmente son demasiado básicos».

Decisiones de Miguel del 26-sep:
- **Coste: recarga por tiempo.** Siempre disponible tras esperar: **3 s** tras un disparo corto y **5 s** tras un
  pleno. Sin Foco.
- **Igual para los tres estilos** (Gabardina, Ligera, Mole).
- Se construye con varios agentes en paralelo, con revisión adversaria.

## 1. Cómo se juega

### 1.1 El gesto
1. **Pulsar RAYO** (móvil: botón a la izquierda, con el pulgar izquierdo; PC: mantener **R**). El personaje se
   **planta** (no anda: el pulgar izquierdo, que movía, ahora sujeta el botón) y empieza a **cargar**.
2. **Apuntar**: al empezar, la cámara gira suave (≈0,18 s) para poner bajo la mira al enemigo más a mano (el mismo
   criterio de enganche de hoy, pero por cercanía a la mira en PANTALLA). Aparecen las **tres marcas** alrededor del
   objetivo. El **pulgar derecho arrastrando** en cualquier sitio de la mitad derecha mueve la vista (y con ella la
   mira), con la sensibilidad escalada por el zoom y un **imán suave** (fricción al cruzar un enemigo y un tirón
   leve hacia él). En PC, el ratón bloqueado mueve la vista como hoy.
3. **Cargar**: la carga `c` va de 0 a 1 en **1,3 s**. Las tres marcas se **cierran** con la carga: su círculo en
   pantalla es el **área real** del impacto proyectada a la distancia del blanco (con un mínimo de unos pocos px);
   en el pleno se juntan en un punto.
4. **Soltar**: sale el rayo. Recarga según el nivel (§1.2). El botón enseña la recarga.
5. **Cancelar sin disparar**: si te golpean mientras cargas (cualquier daño corta la carga), si pulsas QUIEBRO
   (cancela y esquiva), si el sistema te quita el dedo (`pointercancel`, pérdida de captura, `blur`, ir al fondo,
   abrir el menú o el plano) o si la fase deja de ser de combate. Cancelar NO gasta recarga.
6. **No se puede empezar a cargar**: fuera de combate, en recarga, tocado/descolocado/derribado, en el Remanso (la
   Réplica es su ventana; no se toca), con un golpe propio anunciado sin resolver, siendo Vigía.

### 1.2 Los cuatro niveles (cifras de partida; el frente de reglas las calibra y las justifica)

| Nivel | Carga (ms del aparato) | Área (radio) | Alcance | Daño a cada uno | Efecto | Recarga |
|---|---|---|---|---|---|---|
| 1 · chispazo | 0 – 299 | 3,0 m | 16 m | 8 | descolocado 10 tics, empuje 1 m desde el centro | 3,0 s |
| 2 | 300 – 749 | 2,0 m | 24 m | 15 | tocado 10 tics, empuje 1 m | 3,6 s |
| 3 | 750 – 1.299 | 1,0 m | 32 m | 25 | tocado 12 tics, empuje 1,5 m | 4,3 s |
| 4 · pleno | ≥ 1.300 | línea (sin área) | 45 m | 40 | **derriba** 30 tics y empuja 2 m | 5,0 s |

- Referencias de hoy (`shared/arcade/juegos/quiebro-reglas.ts`): una Tanda entera hace 60 y la Réplica 25; el
  Celador tiene 90 de vida, el tirador 70 y el Prestado 20. **El pleno ayuda y no sustituye**: pleno (40) + una Tanda
  (60) tumban a un Celador. El chispazo es control de masas (descoloca a un grupo) más que daño.
- **Sin fuego amigo** (EL-QUIEBRO.md: «sin fuego amigo»). **La guardia del Celador no lo para** (es energía, no un
  golpe). Puntos por blanco alcanzado, como un golpe.
- **Velocidad**: el rayo es casi instantáneo. La sala lo resuelve como un proyectil muy rápido que recorre su alcance
  en **1-2 tics** como mucho (el frente de reglas elige la cifra); lo que se VE es un destello que llega en ≈3
  fotogramas.

### 1.3 Móvil y PC
- **Móvil**: botón RAYO de ~76 px a la izquierda, por encima de donde suele nacer la palanca, a ≥ 28 px del borde
  (lejos del gesto de «atrás» de Android y del deslizamiento de iOS/Safari). En zurdo, todo en espejo.
- Mientras se carga, los botones de la derecha se **atenúan** (toda la mitad derecha sirve para apuntar), salvo
  QUIEBRO, que sigue pulsable y cancela la carga.
- **PC**: mantener **R** carga; el ratón (bloqueado) apunta; soltar R dispara. Perder el foco, abrir el plano (M) o
  el menú (Esc) cancelan. Añadir R a la ayuda de teclas.

## 2. Las reglas (servidor y `shared/`): «el tiro cargado», genérico en la Liza

La Liza no tiene hoy ataque a distancia del jugador, ni área, ni disparo instantáneo, ni gasto fuera de la ruptura.
Se añade una declaración GENÉRICA (sin vocabulario de El Quiebro en los ficheros de la Liza: `verify:liza-protocolo`
lo vigila), con su **segundo uso nombrado** (LA-LIZA.md: ninguna declaración entra sin él): **el arco** de una liza
de juguete (tensar = cargar, soltar = disparar) y el área como el «pisotón en anillo» del Celador Mayor (EL-QUIEBRO
§ fase 2).

Forma propuesta (la fija el contrato, §9; el frente de reglas puede afinarla con motivo):

```ts
interface TiroDeclarado {                 // en ReglasDeAsiento, campo `tiro: TiroDeclarado | null` (no en `acciones`)
  apuntar: IdDeclarado;                   // la sostenida mientras carga
  soltar: IdDeclarado;                    // la pulsación que dispara
  puesta: PuestaDeEstado;                 // el estado «apuntando»: bloquea el paso, se corta con daño
  niveles: readonly NivelDelTiro[];       // desdeMs crecientes; el primero 0
  enganche: EngancheDeclarado | null;     // corrige hacia un blanco aceptado en su cono
  holgura: Longitud;                      // por pintar a los demás 150 ms atrás
  cargaMaximaMs: Milisegundos;            // tope de la carga que se cree (anti-trampa)
}
interface NivelDelTiro {
  desdeMs: Milisegundos;
  proyectil: IdDeclarado;                 // velocidad, alcance, radio contra la estructura
  ancho: Longitud;                        // radio contra los cuerpos (≠ el de la estructura)
  area: Longitud;                         // 0 = sin área
  efecto: EfectoDeclarado;                // al blanco directo
  efectoDelArea: EfectoDeclarado | null;  // a los del área
  recargaTics: Tics;
}
```

**Cable, sin cambiar el formato** (`[accion, ms, blanco]`):
- mientras carga: `aqui.a = [apuntar, msPulsar, 0]` repetido (como USAR);
- al soltar, una vez: `aqui.a = [soltar, msSoltar, blanco]`; la dirección es `aqui.r` (ya arbitrada) o, con blanco
  aceptado, `rumboHacia` el blanco.
- **La carga** = `msSoltar − msPulsar`, dos números del MISMO reloj del aparato (no depende del desfase, como la
  esquiva), acotada por lo que la sala vio (`(k − desdeTic + compTics + TICS_DEL_AQUI) × 50`) y por `cargaMaximaMs`.
  El nivel es el último con `desdeMs ≤ carga`: tabla de enteros, sin interpolar.
- **Sólo el `soltar` explícito dispara.** Todo lo demás que suelta la sostenida (daño, cambio de fase, ausencia,
  otra pulsación en el mismo `aqui`…) **cancela sin disparar**.

**En la sala**:
- `apuntar`: como empezar una sostenida (`puedeEmpezar`, sin anuncio propio pendiente, fuera de recarga, no en el
  Remanso), pone la puesta y guarda `desdeTic` con `ticDeLaPulsacion(ms)`.
- cada tic: rama propia en las sostenidas (si no, la carga se cancela cada tic).
- `soltar`: dispara con `salioEnTic = ticDeLaPulsacion(msSoltar)`; apunta la recarga del nivel.
- **el vuelo**: la bala generalizada a asientos (`sitioDeLaBala`, `paradaDeLaBalaEn`, recortada al límite de la fase
  antes de la losa), con aforo propio o reservado (el aforo lleno NO puede tragarse un rayo en silencio).
- **el juez contra entidades** (nuevo): en cada tic, el tramo de antes a ahora contra cada entidad en pie con
  `pruebaDeLosa` (radio `ancho` + radio de la clase + holgura); gana la fracción menor y, en empate, el número
  menor. Nunca asientos (sin fuego amigo), nunca caídas, absorbiendo ni deshechas.
- **el área**: en el punto de impacto (entidad o estructura), `dentroDelRadio` + `hayLineaDeVista` desde el centro,
  recorriendo las entidades por número (el azar de la esquiva al azar se gasta en orden). Empuje desde el centro:
  variante de `golpearEntidad` con rumbo.
- **sucesos**: `bala` con `de` = número del asiento, `impacta` por víctima y uno nuevo `estalla {bala, x, z}` (el
  centro del área). Los demás ven la carga por el estado de la puesta y la puntería por la `mira` de la foto.
- **determinismo y pureza**: nada de `Math.random`, trigonometría, `Date`, `>>16`, `imul`; Q16.16 con `por()`/`entre()`;
  rumbos de la tabla; órdenes totales; nada de cierres sobre el `let` de un bucle (Hermes 0.12).

**Verificación del frente de reglas**: bloque nuevo en `verify:liza` (carga en el reloj del aparato independiente del
desfase; cada nivel; área con línea de vista; sin fuego amigo; cancelaciones que NO disparan; recarga; aforo; el
robot que LEE sigue sacando más que el que APORREA), `verify:liza-protocolo` (`accionesDelCable`, el suceso nuevo:
ida y vuelta, rechazo y peso; la Liza sigue genérica), `verify:quiebro`, `verify:determinismo` con un robot que carga
y suelta y su suelo, y los seis guardianes. Toda comprobación nueva vista en ROJO en una copia.

## 3. Mandos, mira, cámara y botones (cliente)

**Mandos** (`escritorio/src/quiebro/mandos/`): `'rayo'` en `Boton`; `cargarRayo(t)`, `soltarRayo(t, blanco)`,
`cancelarRayo()` en el estado; el dedo del botón se captura como el de USAR; soltar dispara, cancelar o perder la
captura anula (y soltar deja el dedo a `null` ANTES de que llegue la pérdida de captura). `soltarTodo` cancela sin
disparar. `onContextMenu` con `preventDefault` en la capa táctil (se mantiene más de un segundo). Conservar los
textos exactos que vigila `verify:quiebro-juego` (§10 y §13 bis).

**Apuntado** (`mandos/rayo.ts`, puro): el blanco se elige por distancia en PANTALLA a la mira (no sólo por el giro
de la cámara: el hombro a 0,7 m desvía 4-8°), dentro del alcance del nivel ACTUAL de la carga y con línea de vista;
imán suave; histéresis para que no salte entre dos blancos.

**La mira** (`hud/MiraDelRayo.tsx`, fuera de React a 60 Hz: `requestAnimationFrame` y `transform`, como
`RotulosDeLaGente`): **tres marcas** a 120° que apuntan hacia dentro, blanco cálido con filo ámbar, trazo fino con
halo suave; su radio es el área proyectada (mínimo ~10 px, máximo ~90 px) y se cierra con la carga; al «fijar» un
blanco las marcas se tensan (un leve salto de escala y más brillo) y suena un tic; en el pleno, un pulso. Un arco
fino de progreso de la carga. **Nada de retícula de arma, ni cruz, ni círculo de mira telescópica.**

**Cámara** (`camara/`): `carga?: number` OPCIONAL en la situación; el campo de visión baja hasta **10°** con la carga,
suavizado (entrar ≈0,25 s, salir ≈0,12 s); **sin acercar la distancia** (salta); la cámara automática no pelea
mientras se carga; sensibilidad escalada por `tan(fov/2)/tan(base/2)`; al disparar, un golpe de retroceso de −2° que
vuelve en 150 ms y la sacudida. Los bordes se oscurecen un poco durante la carga (viñeta, vía el frente de efectos).

**Botones** (rediseño completo, `hud/` y `mandos/Tactil.tsx`): estilo de juego AAA de móvil, coherente con la paleta
(ámbar = lo del jugador, verde-cian = el código, magenta = rótulos):
- cristal oscuro con degradado, aro fino ámbar, **iconos propios en SVG** (no emoji, no marcas): GOLPE (puño y
  arco de impacto), QUIEBRO (quiebro lateral con estela), EMPELLÓN (dos palmas o chevrones de empuje), USAR (mano),
  RAYO (tres trazos que convergen, el mismo lenguaje que la mira); rótulo pequeño;
- estados: pulsado (escala 0,92, destello del aro y onda), en recarga (barrido radial con los segundos), no
  disponible (apagado), y **contexto**: QUIEBRO se ilumina en cian cuando un golpe viene hacia ti (hay un anuncio
  contra tu asiento: «ver venir el golpe»), GOLPE marca el paso de la Tanda (puntos en el aro), RAYO enseña la carga
  mientras la mantienes;
- **las recargas salen de la sala** (hoy el anillo del EMPELLÓN sale de la hora local de la pulsación y miente si la
  sala la tira);
- la palanca (joystick) con el mismo lenguaje (aro, pomo con brillo, marca de dirección);
- N0 barato (`data-nivel`: sin sombras caras ni `backdrop-filter`); tamaños ≥ los de hoy (EL-QUIEBRO §7), como mucho
  +10 %.

## 4. Cómo se ve: el listón

Referencia de realismo: una **descarga eléctrica / plasma real**. Un rayo de verdad dura décimas: un hilo blanco
sobreexpuesto casi sin grosor, con **2-3 re-descargas** en ≈100 ms (los «return strokes»), una **persistencia en la
retina** que se apaga, y **todo lo de alrededor iluminado de golpe**. No es un láser de cómic, ni un tubo de color,
ni una bala visible.

**Color**: núcleo BLANCO sobreexpuesto (HDR 6-14 en N2/N3) con **filo ámbar** (el color del jugador), la estela se
enfría de blanco a ámbar oscuro. Nunca el verde-cian del código, ni el naranja rojizo del tirador (0xff5a24), ni el
blanco violáceo de la respuesta.

**La carga** (en el personaje y en su mano, crece con `c`): núcleo blanco que crece en la palma, filamentos ámbar
cortos que trepan por el brazo y saltan a tierra, partículas que CONVERGEN hacia la mano, un aro que se contrae,
luz ámbar sobre el cuerpo (y en N2/N3 sobre lo que tiene alrededor), un leve temblor; al acercarse al pleno, chasquidos
más frecuentes. Los demás jugadores ven la carga igual (es información de juego).

**El chispazo** (poca carga): un hilo de 1 px, algo quebrado, con una rama; llega; en el impacto, un **estallido en
área**: destello, onda en el SUELO del radio real del área (el jugador ve lo que abarca), chispas, un soplo de polvo o
vapor del suelo mojado, luz breve al 30 %. Sin fogonazo de pantalla.

**El pleno** (carga llena): un destello más grueso y más recto, con 2-3 re-descargas en 90 ms, **estela ionizada** que
se ensancha y se enfría en 300-450 ms, fogonazo en la boca que ilumina al personaje, **luz en el impacto** que ilumina
fachadas y suelo mojado un instante (en N3 se refleja en los charcos), chispas, una **marca chamuscada** que brilla y
se apaga en unos segundos, **sacudida de cámara**, fogonazo de pantalla y aberración breves, y el **trueno**.

**Por nivel de calidad** (medido por el explorador de efectos; N0 sólo admite UNA pieza nueva de efectos, N0/N1 no
tienen HDR ni luces reales y sus sombreadores de ciudad no admiten ni una instrucción más):

| Capa | N0 | N1 | N2 | N3 |
|---|---|---|---|---|
| núcleo + halo | halo pintado ancho | halo ×0,85 + brillo 8 bits | HDR + bloom | igual + reflejo en pantalla |
| ramas / re-descargas | 0 / 1 | 1 / 2 | 2 / 2-3 | 3 / 3 |
| estela | 150 ms | 250 ms | 350 ms | 450 ms + deriva |
| impacto (chispas) | 10 | 16 | 24 | 32 |
| luz | tarjeta/halo dinámicos + disco en el suelo | igual | foco reservado | foco reservado |
| fogonazo de pantalla | cuadro aditivo o DOM | uber | uber HDR | uber HDR |

- Reglas del sistema de efectos: piezas instanciadas, sin asignar por fotograma, relojes verdadero/presentado (lo de
  juego en el verdadero; la estela en el presentado, que el Remanso frena), sin `#include <fog_vertex>`, sembrado
  determinista (el mismo rayo en todos los aparatos), presupuesto por nivel (`efectos/presupuesto.ts`).
- Luz: NUNCA cambiar el número de luces (recompila todo): en N2/N3 un foco reservado con intensidad 0 que se enciende;
  en N0/N1, tarjeta y halo dinámicos en las mallas de la ciudad (API nueva) y un término de destello por uniforme en
  la luz de los cuerpos.
- Fotosensibilidad: las re-descargas cuentan como un solo destello de < 150 ms; el fogonazo de pantalla acotado.
- **Banco del rayo** (`escritorio/banco-quiebro-rayo.html`): una página determinista con parámetros (`carga`, `t` en
  ms desde el disparo o `fase=carga&c=`, `nivel`, `luz`, `pos`, `blanco`) para fotografiar CADA FOTOGRAMA del efecto con
  `foto.sh` (Edge sin ventana) y montar **hojas de contactos** (t = −800, −400, −100, 0, 16, 33, 50, 83, 133, 200,
  300, 500, 800 ms) en N1 y N3, de madrugada y al alba, de cerca (2-5 m) y lejos (25 m). El juicio es a ojo sobre
  esas hojas: si no parece un destello real, no está hecho.

## 5. Sonido

- `carga-rayo` (voz larga, `parar()` al soltar o cancelar): zumbido que sube de tono con la carga (sierras
  desafinadas por un paso bajo resonante que se abre, un seno grave, temblor que acelera, crepitaciones cada vez más
  seguidas); al llegar al pleno, un «listo» sutil.
- `rayo`: chasquido seco (< 1 ms de ataque) + zap que cae de ~3 kHz a ~150 Hz + estampido saturado de 90 a 28 Hz +
  **trueno** en búfer estéreo sembrado (crepitación + ruido marrón con modulación lenta) con la reverberación de calle;
  el retumbo puede llegar con retraso d/343 s, el chasquido nunca; perfil de alcance `trueno` (~120 m).
- `rayo-corto` (chispazo): «fsst-pak» seco con chisporroteo, sin trueno.
- En el Remanso, por el camino del mundo (baja de tono, que queda de cine).

## 6. Animación

- La librería de captura CC0 que ya está en el disco (`arte/ual/ual1`, Quaternius UAL) trae **Spell_Simple_Enter,
  Spell_Simple_Idle_Loop, Spell_Simple_Shoot y Spell_Simple_Exit**: entrar en carga, bucle de carga, disparo y
  salida. Se retargetean con la forja (`arte/forja/captura.py`) a los desvelados, como se hizo con la locomoción.
- Gestos nuevos en la unión cerrada `Gesto` (`cuerpos.ts`) con su fila en `INFO_DE_GESTOS`, horneados también para
  los cuerpos lejanos: `cargar-rayo` (entrada + bucle, con un temblor procedural que crece con la carga) y
  `lanzar-rayo` (disparo, con el impacto en su fotograma) y la salida.
- Exponer la posición de la **mano** (la «boca» del rayo) para efectos y luz (`postura.ts`, `huesosDelBrazoDerecho`).

## 7. Presupuestos (duros)

- Efectos: N0 ≤ 12 llamadas (hoy 11): como mucho UNA pieza nueva, o el rayo dentro de una pieza existente (`hilos`).
- Nada de luces reales nuevas en N0/N1; en N2/N3 un foco reservado (medido con `verify:quiebro-gl`).
- 0 lecturas extra en el posproceso (el fogonazo y el golpe son uniformes en el uber; `UNIFORMES_DEL_UBER` exacto).
- Topes de fxc de la ciudad y del mobiliario (`verify:quiebro-gl`): no se tocan en N0/N1.
- Sonido: el trueno precalculado a búfer; tope de voces.

## 8. Verificación de conjunto

- La batería entera con `PUERTO` (`npm run verificar`), cada frente con sus comprobadores y los guardianes.
- **Jugar de verdad** (memoria «jugar una mesa de verdad»): servidor + escritorio, robots por HTTP y un asiento en
  pantalla; cargar y soltar contra un Celador y un grupo de Prestados; ver en el servidor el daño, en la pantalla del
  que dispara el destello y en la de otro jugador el mismo rayo.
- Hojas de contactos del rayo (§4) antes y después de cada ajuste.

## 9. El contrato entre frentes (lo escribe la fase 0 y NO se cambia sin el coordinador)

- **Reglas** (`shared/`): los tipos de §2 en `declaracion.ts` con su revisión; los ids de `apuntar`/`soltar` y la tabla
  de niveles del Quiebro en `quiebro-reglas.ts`/`quiebro-liza.ts` (con stubs de lógica que no rompen la sala); el
  suceso `estalla` en el protocolo.
- **Cliente** (`escritorio/src/quiebro/rayo/contrato.ts`, nuevo y sin three/React): el estado de la carga que leen HUD,
  cámara y efectos (`EstadoDelRayo`: activo, desdeMs, c 0-1, nivel, blanco, punto apuntado, área en metros); el evento
  de disparo (`DisparoDelRayo`: quién, origen, destino, nivel, c, área, si dio, semilla, instante); la API de efectos
  (`EfectosDelRayo`: `empezarCarga`, `actualizarCarga`, `cancelarCarga`, `soltar`, `estallar`); la API de la mano
  (`bocaDe(id)`), los gestos (`cargar-rayo`, `lanzar-rayo`), los uniformes del destello en cuerpos y ciudad
  (`UNIFORMES_DEL_DESTELLO`), y cómo el diccionario del cliente lee la declaración del tiro (sin números duplicados).
- **Reparto de ficheros**:
  - REGLAS: `shared/mecanicas/liza/**`, `shared/arcade/juegos/quiebro-*.ts`, `shared/arcade/juegos/lizas.ts`,
    `server/src/liza/**`, `server/scripts/{verificar-liza*, verificar-quiebro*, liza-de-juguete, guion-determinismo,
    verificar-determinismo, robot-de-quiebro}.ts`, `docs/LA-LIZA.md`.
  - MANDOS: `escritorio/src/quiebro/mandos/**`, `red/partida.ts`, `red/prediccion.ts`, `red/diccionario.ts`, `hud/**`,
    `camara/**`, `Quiebro.tsx`, `escritorio/scripts/verificar-quiebro-juego.ts`.
  - EFECTOS: `escritorio/src/quiebro/efectos/**`, `posproceso/**`, `sonido/**`, `atmosfera/luz.ts`,
    `atmosfera/Atmosfera.tsx`, `ciudad/reflejos.ts`, `ciudad/halos.ts`, `red/escenificar.ts`, `rayo/banco*`,
    `escritorio/banco-quiebro-rayo.html`, `escritorio/scripts/verificar-quiebro-{efectos,sonido,calidad,gl}.ts`.
  - ANIMACIÓN: `arte/forja/**`, `escritorio/src/quiebro/personajes/**`, `escritorio/src/quiebro/cuerpos.ts`,
    `escritorio/recursos/**` (reparto), `escritorio/scripts/verificar-quiebro-personajes.ts`.
  - `rayo/contrato.ts`, `escritorio/package.json`, `scripts/verificar-todo.mjs`: sólo la fase 0 y el coordinador.
