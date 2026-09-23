# El Quiebro: arquitectura, contratos y reparto

**Qué es este documento.** Cómo se construye «El Quiebro» (`docs/EL-QUIEBRO.md`) sobre la plataforma
sin desalinearse de nada: qué vive dónde, qué contratos unen las piezas, qué no se toca y cómo se
verifica. Escrito el 24-sep-2026 para repartir el trabajo entre varios agentes en el worktree
`C:/Users/QWERTY/Documents/GameMasters-matrix` (rama `matrix`, nacida de `botas-servidor` d7121ab).

Si algo de aquí contradice al código de la plataforma, gana el código. Si contradice al documento de
diseño en una MECÁNICA, gana el documento de diseño; en una RUTA o un NOMBRE de fichero, gana éste.

---

## 0. Decisiones que no se reabren

1. **Módulo hermano, no Boots on Board tocado.** Lo que le falta a Boots on Board (estados, anuncios,
   entidades del servidor, proyectiles, zonas, encuentros, reglamento por juego) vive en **La Liza**,
   en ficheros NUEVOS. Se USAN sin editar: `shared/mecanicas/{mundo,andar,fijo,azar,canonico}.ts`,
   `server/src/botas/cuotas.ts` (`crearCuotas`, `procedenciaDeLaSubida`), `server/src/botas/enchufe.ts`
   (`origenAdmitido`, `codigoDeLaRuta`) y `meterDeLaPlataforma` de `server/src/arcade/mesas.ts`.
   **Prohibido editar** (los trabaja la sesión principal de Boots on Board): `shared/mecanicas/{andar,
   mundo,canal-de-botas,fijo,anillo}.ts`, todo `server/src/botas/`, todo `escenas/paseo/`,
   `escenas/compuerta-de-botas.ts`, `shared/arcade/juegos/{mundos,botin}.ts`. Y el **núcleo sellado**
   (`shared/arcade/*.ts` sin `juegos/`, `server/src/canal/`, `server/src/arcade/{arbitro,mesas}.ts`,
   `shared/mecanicas/{azar,canonico}.ts`): su diff tiene que ser VACÍO.
2. **El juego se pinta con el motor del navegador en todas partes.** Escritorio (`/sala`), app nativa
   (un `react-native-webview` apaisado que carga el documento del juego) y `/jugar` en el iPhone (un
   `iframe` al mismo documento). Por eso el cliente del juego vive ENTERO en `escritorio/src/quiebro/`
   (DOM permitido) y NO en `escenas/`: las reglas de `escenas/` (sin DOM, GLSL `mediump` sin derivadas
   ni texturas, color horneado a vértice) existen por expo-gl, y este juego no pasa por expo-gl.
   Aquí se permiten `highp`, derivadas, texturas `DataTexture`, render targets y posproceso, SIEMPRE
   sondeando la capacidad antes de usarla (crear y comprobar, nunca fiarse de `getExtension`).
3. **Reglas puras en `shared/`, autoridad en `server/`.** Nada de `Math.random`, `Date`, trigonometría,
   `for…in`, `sort()` sin comparador ni cierres sobre el `let` de un bucle en `shared/`. Coma fija
   Q16.16 con `por()`/`entre()` de `shared/mecanicas/fijo.ts`, NUNCA `>>16` ni `Math.imul` para
   productos. Ángulos con la tabla de 256 rumbos (`SENO`/`COSENO` de `andar.ts`). Azar sembrado con
   `shared/mecanicas/azar.ts`.
4. **Escala del juego: 1 u = 1 m.** Persona de 1,8 m, radio de choque 0,35 m. No se usan las
   velocidades globales de Boots on Board (12 y 26,4 u/s) ni su persona de 2,543 u.
5. **Nombres propios**, todos en `shared/arcade/juegos/quiebro-nombres.ts` (§8). Nada de la marca
   ajena en ningún texto, rótulo, comentario visible ni dato: ver `docs/EL-QUIEBRO.md` §1.
6. **Sin descargas de arte ni dependencias nuevas** salvo `react-native-webview` en `app/` (aprobada por
   Miguel). El posproceso sale de `three/examples/jsm/postprocessing` (r185) y de sombreadores propios.
   Los personajes salen de la forja de Blender (`arte/forja/`, §6.6).

---

## 1. Mapa de la obra

```
shared/
  mecanicas/liza/                 ← LA LIZA, genérica: no nombra ningún juego
    protocolo.ts                  mensajes v2, topes, cierres, lectores estrictos, escritores
    declaracion.ts                tipos de lo que un juego DECLARA (reglamento, estados, acciones…)
    geometria.ts                  rumboHacia por tabla, prueba de losa segmento-AABB, conos con por()
    sala.ts                       el paso PURO de la sala: avanzarLaSala(estado, entradas) → estado + sucesos
    cuerpo.ts | combate.ts | proyectiles.ts | cerebro.ts | encuentros.ts   (piezas de sala.ts)
  arcade/juegos/
    lizas.ts                      registro: [arcade, productor(vista, codigo) → LizaDeclarada | null]
    quiebro.ts                    manifiesto, reductor, proyección, opciones, seAcabo, tablero declarado
    quiebro-reglas.ts             tablas: estilos, retoques, averías, recetas, contramedidas, niveles
    quiebro-barrio.ts             el barrio procedural de la noche (puro, sin trigonometría)
    quiebro-durmientes.ts         los 48 durmientes de guion: sitio = f(barrio, tic), puro
    quiebro-liza.ts               el productor: vista pública + código → LizaDeclarada del Quiebro
    quiebro-nombres.ts            TODOS los nombres propios visibles, en un solo sitio
server/
  src/liza/                       la sala de verdad: enchufe (upgrade), canal, salas, reloj, diagnóstico
  scripts/verificar-*.ts          comprobadores (§7)
escritorio/
  quiebro.html                    el documento suelto del juego (lo cargan el WebView y el iframe)
  src/quiebro/                    EL CLIENTE DEL JUEGO (DOM permitido)
    Quiebro.tsx                   raíz: recibe un PuertoDeMesa (§3.4) y monta lienzo + HUD + mandos
    documento.tsx                 entrada del documento suelto: puente postMessage → PuertoDeMesa
    contrato.ts                   PuertoDeMesa y mensajes del puente (tipos, sin React)
    red/                          cliente de la Liza: hola, aqui por tic, eco, predicción, interpolación
    ciudad/                       el barrio en tres dimensiones: fachadas, calles mojadas, glorieta, cabinas
    atmosfera/                    cielo, niebla de altura, lluvia, vapor, reflejos
    posproceso/                   compositor, brillo, gradación, viñeta, grano, Remanso, AA
    calidad/                      sondeo de capacidades, niveles N0-N3, gobernador
    personajes/                   carga de GLB, esqueletos, clips, máquina de animación, multitud VAT
    efectos/                      la Grafía (glifos), anillos, impacto, Remanso, Bis, impresión, salida
    mandos/                       teclado y ratón; táctil (palanca flotante, botones en pointerdown)
    camara/                       cámara al hombro que no atraviesa, cámara automática, Vigía
    hud/                          aguante, Foco, esquirlas, monedas, reloj, brújula, avisos, recuento
    sonido/                       WebAudio: síntesis propia (silbido del anillo, golpes, lluvia, música)
    recursos/                     .glb y datos compilados que empaqueta Vite
  src/pintores.ts                 + la fila de QUIEBRO (el pintor del escritorio monta <Quiebro>)
app/
  src/arcade/quiebro-en-tres.tsx          pantallaPerezosa
  src/arcade/quiebro-en-tres-escena.tsx   LaMesaDeUnPintor + WebView apaisado + puente
  src/arcade/pintados.ts                  + la fila de QUIEBRO
arte/forja/                       guiones de Blender que fabrican los personajes (fuente de recursos/)
docs/EL-QUIEBRO.md, docs/quiebro/ARQUITECTURA.md, docs/LA-LIZA.md
```

---

## 2. Los tres planos del estado (resumen de `docs/EL-QUIEBRO.md` §10)

| Plano | Dónde | Qué | Frecuencia |
|---|---|---|---|
| **Mesa** | reductor `quiebro.ts`, persistido | fase, noche, nivel, avería, receta, contramedida, estilos, retoques, votos, puntos de control (esquirlas, aguante, monedas), historial | movimientos de asiento raros + veredictos `arcade:*` 1-1,5/min |
| **Sala** | `shared/mecanicas/liza/sala.ts` (puro) servido por `server/src/liza/` | sitios validados, estados del cuerpo, NPC, balas, anuncios, encuentro, esquirlas que se llevan | 20 tics/s, nunca persistido |
| **Adorno** | `escritorio/src/quiebro/` | fachadas, lluvia, durmientes, gente de fondo, Remanso visual, sonido | por fotograma |

**La mesa y la sala hablan así**, y de ninguna otra forma:
- La sala LEE la vista pública de la mesa (`mirar(codigo, null)`) cuando sube su revisión, y compone
  su `LizaDeclarada` con el productor del registro (`lizas.ts`). Con eso sabe la fase, el reglamento
  compuesto y los puntos de control.
- La sala ESCRIBE en la mesa sólo veredictos gruesos por `meterDeLaPlataforma(codigo, movimiento)`:
  `arcade:ronda {n, resultado, cuentas}`, `arcade:reloj {id}`, `arcade:ausente {a}`. El reductor los
  atiende DELANTE de su portillo de opciones (como el tic y el botín) y rechaza con motivo lo malformado.
- Los asientos escriben en la mesa por la vía normal (`POST …/movimientos` con `x-asiento`):
  `estilo`, `empezar`, `elegir`, `rendirse`, `reanudar`, `otra-noche`, `cerrar`.

---

## 3. Contratos

### 3.1 La mesa (`shared/arcade/juegos/quiebro.ts`)

- Manifiesto: `{ id: 'quiebro', nombre: 'El Quiebro', gancho, icono: 'mando', jugadores: {minimo: 1,
  maximo: 6}, sede: 'servidor', tickHz: 0, mueble: 'tablero', secretos: false, marcador: {tipo:
  'ninguno'}, procedencia: {tipo: 'creacion-propia'} }`.
- Alta en `shared/arcade/juegos/index.ts` con `instalarArcade({ manifiesto, avanzar, proyeccion,
  opciones, seAcabo })`, más sus reexportes con apellido donde choquen (patrón de Las Lindes).
- **La vista** (`VistaDelQuiebro`) es pública e idéntica para todos (`secretos: false`), y lleva:
  `fase` (unión discriminada del §5 del diseño), `reloj: {id, duraMs} | null` (el reloj de fase que la
  sala hace vencer), `noche` (número, nivel, avería, receta, contramedida, plantilla), `asientos`
  (estilo, retoques, ofrecidos, voto, ausente, puntos, punto de control, contadores), `monedas`,
  `historial`, `mejorNoche`, `reglamento` (SOLO ids: base, nivel, avería, contramedida, estilo y
  retoques por asiento) y `tablero: TableroDeclarado` (el plano del barrio con el marcador en paneles:
  el respaldo honrado del escritorio y de cualquier cliente que no pinte la escena).
- `componerReglamento(vista)` (en `quiebro-reglas.ts`) es la ÚNICA función que traduce esos ids a
  números. La usan la sala (vía el productor) y el cliente (para el HUD y la predicción).

### 3.2 El barrio (`shared/arcade/juegos/quiebro-barrio.ts`)

`barrioDeLaNoche(codigo: string, noche: number): Barrio`, puro, en ≤ 3 ms, idéntico en todos los
aparatos y niveles. Rejilla de 3×3 manzanas de 36 m con calles de 12 m (acera 3 + calzada 6 + acera 3);
origen en el centro, `x` al este, `z` al sur (el norte es `−z`, como en `mundo.ts`). Lleva:
- `manzanas` (con sus edificios: huella AABB, alturas por tramos, estilo de fachada, rótulos) y la
  **glorieta** central (quiosco, fuente, coches aparcados, bancos, pilares del tren elevado, farolas);
- `cajas`: TODA la estructura con la que se choca (AABB con clase `alta`), en metros;
- `cabinas`: 4 candidatas a 60-110 m del centro más la de refugio; `zonas` (cabinas, apariciones,
  impresiones); `limites` (`glorieta48`, `glorieta60`, `barrio`); `nace` por papel;
- `grafo` de calles (16 cruces y sus aristas) para que los NPC naveguen;
- el ADORNO que tiene que salir igual en todos los aparatos: tiempo (`llovizna|aguacero|niebla`),
  hora, nombre del barrio, neones con sus rótulos inventados.
- `mundoDelBarrio(barrio): MundoDeclarado` (el contrato de `mundo.ts`, en metros: `lado` de casilla 2 m,
  todo el barrio pisable, `cuerpos` = las cajas) para usar `arenaDe`, `sePuedeEstar`, `unPaso` y
  `seAndaEnRecta` SIN tocarlos.

### 3.3 La Liza (`shared/mecanicas/liza/`)

**Genérica.** Ningún fichero de `shared/mecanicas/liza/` ni de `server/src/liza/` nombra un juego ni
importa de `shared/arcade/juegos/` salvo el registro `lizas.ts` (y ése sólo desde el servidor).

- `declaracion.ts`: `LizaDeclarada` = las declaraciones A-V del §11 del diseño (mundo v2 con escala,
  cajas con clase, zonas, límites, grafo y `nace` por papel; reglamento del cuerpo; estados
  temporizados; acciones anunciadas; esquiva en ventana; guardia; empuje contra la estructura;
  proyectiles; clases de entidad con cerebro; turnos de ataque; encuentros; zonas de acción sostenida;
  portables; recurso de equipo, rescate y desconexión; rol sin cuerpo; avisos; relojes de fase;
  veredictos; coste). Todo son datos JSON (enteros, Q16.16 o milisegundos/tics), sin funciones.
- `protocolo.ts`: el protocolo v2 del §11 del diseño. JSON de texto, claves EXACTAS, `0` = «sin
  acción», lectores estrictos que devuelven `null` ante cualquier forma inesperada (patrón de
  `leerMensajeDelAparato` en `canal-de-botas.ts`), topes de 256 B de subida y 25 mensajes/s con ráfaga
  de 40. Ruta: `/api/arcade/mesas/:codigo/liza`. `VERSION_DE_LA_LIZA = 1` (es su propio protocolo).
- `sala.ts`: `avanzarLaSala(sala: EstadoDeLaSala, entradas: readonly EntradaDeLaSala[]):
  PasoDeLaSala` con `PasoDeLaSala = { sala, sucesos, veredictos, fotoDebida }`. PURO: todo el azar
  sale del `Azar` sembrado dentro del estado; el tiempo, del número de tic. Las entradas llevan los
  milisegundos del aparato y el desfase que la capa de E/S usó para ese asiento, de modo que el juicio
  del quiebro se hace en el reloj del propio aparato (diseño §4.3) y el desfase se cancela.
  `salaNueva(declaracion, asientos, semilla)` y `rehacerLaSala(declaracion, vista)` (reanudar tras un
  despliegue desde los puntos de control). Así la sala se prueba entera en Node y en Hermes.
- `server/src/liza/`: TODA la E/S. Un `upgrade` propio en la ruta de la Liza que, si la ruta no es
  suya, deja pasar (hay otro oyente, el de Boots on Board) salvo que tampoco sea de botas (entonces
  404: se sabe con `codigoDeLaRuta` de `botas/enchufe.ts`). Cuotas con `crearCuotas`. Un solo
  temporizador de 50 ms para todas las salas, parado si no hay ninguna. Mide la ida y vuelta con `eco`
  y con el ping de `ws`. Mete los veredictos con `meterDeLaPlataforma` y avisa a los que sondean cuando
  `subio`. Aforo por coste declarado. Diagnóstico en el bloque `liza` de `/api/arcade/diagnostico`
  si se puede sin tocar ficheros ajenos (si no, una ruta propia `/api/arcade/liza/diagnostico`).
  Montaje: UNA línea en `server/src/index.ts` junto a `montarElCanalDeBotas`.
- La mesa de un juego de la Liza se abre en modalidad `normal`: la Liza no mira la modalidad ni pasa
  por la compuerta de Boots on Board. Estar en `lizas.ts` significa «siempre a pie, degradando la
  calidad y nunca vetando».

### 3.4 El cliente y sus anfitriones (`escritorio/src/quiebro/contrato.ts`)

```ts
/** Lo que el juego necesita de la mesa, venga de donde venga. */
interface PuertoDeMesa {
  codigo: string; yo: string | null; llave: string | null;
  servidor: string;                 // origen de la API ('' = mismo origen)
  vista: unknown;                   // la vista pública de la mesa (VistaDelQuiebro), la última
  opciones: readonly Opcion[];
  rev: number;
  mover(movimiento: { tipo: string; carga?: unknown }): Promise<void>;
  suscribir(avisar: () => void): () => void;   // cambios de vista/opciones
}
```
Tres anfitriones: el pintor del escritorio (adapta `LaMesa` de `escritorio/src/mesa.ts`), el
documento suelto (`documento.tsx`, que recibe el puerto por el puente) y, en pruebas, un puerto que
abre su propia mesa contra el servidor. **El puente** (app y `/jugar` ↔ documento) es `postMessage` con
mensajes tipados y versión: el anfitrión manda `{t:'mesa', v:1, codigo, yo, llave, servidor, vista,
opciones, rev}` en cada cambio, y el documento contesta `{t:'mover', v:1, id, movimiento}` y
`{t:'listo'|'salir'|'medida', …}`. La llave NUNCA viaja en la URL. El documento comprueba el origen
de cada mensaje (en el WebView llega por `window.ReactNativeWebView`, en el iframe por `event.origin`
igual al del servidor).

---

## 4. Cómo se siente y cómo se pinta (lo que manda en el cliente)

- **Predicción sólo de lo propio**: el paso se simula en local con `unPaso` sobre la misma `Arena`
  (mismo `mundoDelBarrio`) y el mismo reglamento; el servidor valida el sitio. Los demás, 150 ms
  atrás entre fotos; las acciones ajenas, por GUION desde el suceso, en el presente (diseño §12).
- **Anuncios**: el anillo se cierra en el instante que dice el servidor, ya traducido al reloj del
  aparato (`performance.now()`). La pulsación viaja con `event.timeStamp`.
- **Niveles N0-N3** (diseño §8): la estructura, los anillos, las balas, los 48 durmientes y las
  siluetas con contorno son IDÉNTICOS en todos los niveles. El gobernador arranca en N1 (o en lo que
  diga el sondeo), baja deprisa (media > 22 ms en 60 fotogramas), sube despacio (20 s con holgura) y no
  vuelve a un nivel que ya falló; ignora la pestaña oculta; cuenta llamadas y triángulos.
- **Presupuestos provisionales**: N0 150k tri / 60 llamadas · N1 250k / 90 · N2 600k / 150 ·
  N3 1,5M / 250. Cada pieza declara su renglón y un comprobador suma.

---

## 5. Convenciones de la casa que hay que respetar

- Comentarios en español, con la densidad y el tono de la casa: cabeceras que cuentan el PORQUÉ y los
  fallos que se evitan (`═══ TÍTULO ═══`). Nada de comentarios de relleno.
- TypeScript estricto; `tsx` no mira tipos: el tipado lo dicen los `typecheck` de cada paquete.
- En la app: sin `Platform.OS` en pantallas de juego, sin `onClick` (pointer/touch start), el 3D no
  pasa por `Lienzo` aquí porque es un WebView.
- Escritorio: `escritorio/scripts/verificar-escritorio.tsx` barre `src/` (no subcarpetas en varias
  reglas) y pide `onPointerDown`/`onPointerUp` en vez de `onClick` en los `.tsx`.
- `verify:procedencia` barre TODAS las cadenas de `shared/arcade/juegos/`: nada de la marca ajena.
- Fin de línea LF en todo fichero (el worktree tiene `core.autocrlf=false`).

---

## 6. Reparto por frentes (quién es dueño de qué)

Cada frente es dueño EXCLUSIVO de sus ficheros. Tocar un fichero de otro frente está prohibido; si hace
falta un cambio fuera, se dice en el informe final y lo integra el coordinador.

| Frente | Ficheros |
|---|---|
| **columna** | `shared/mecanicas/liza/{protocolo,declaracion,geometria}.ts`, `shared/arcade/juegos/lizas.ts`, `shared/arcade/juegos/quiebro-nombres.ts`, `escritorio/src/quiebro/contrato.ts`, `server/scripts/verificar-liza-protocolo.ts` |
| **barrio** | `shared/arcade/juegos/quiebro-barrio.ts`, `quiebro-durmientes.ts`, `server/scripts/verificar-quiebro-barrio.ts` |
| **reglas** | `shared/arcade/juegos/quiebro.ts`, `quiebro-reglas.ts`, `quiebro-liza.ts`, el alta en `shared/arcade/juegos/index.ts`, `server/scripts/verificar-quiebro.ts`, `server/scripts/robot-de-quiebro.ts` |
| **sala** | `shared/mecanicas/liza/{sala,cuerpo,combate,proyectiles,cerebro,encuentros}.ts`, `server/scripts/verificar-liza.ts` (con una liza de juguete) |
| **servidor** | `server/src/liza/*`, la línea de montaje en `server/src/index.ts`, `server/scripts/verificar-sala-de-la-liza.ts` (robots WebSocket), `server/scripts/medir-liza.ts` |
| **ciudad** | `escritorio/src/quiebro/ciudad/*`, `escritorio/src/quiebro/atmosfera/*` |
| **imagen** | `escritorio/src/quiebro/posproceso/*`, `escritorio/src/quiebro/calidad/*`, `escritorio/src/quiebro/efectos/*` |
| **personajes** | `escritorio/src/quiebro/personajes/*`, `escritorio/src/quiebro/recursos/*`, `arte/forja/*` |
| **juego** | `escritorio/src/quiebro/{Quiebro.tsx,documento.tsx,red,mandos,camara,hud}/*`, `escritorio/quiebro.html` |
| **sonido** | `escritorio/src/quiebro/sonido/*` |
| **integración** | `escritorio/src/pintores.ts`, `escritorio/vite.config.ts`, `app/src/arcade/quiebro-*.tsx`, `app/src/arcade/pintados.ts`, `app/app.json`, `app/package.json`, `scripts/verificar-todo.mjs`, `server/package.json`, `server/scripts/marcas-registradas.ts`, `docs/LA-LIZA.md` |

---

## 7. Verificación

- Comprobadores nuevos con el arnés (`server/scripts/arnes.ts`: `arnes()` y `terminar({ escritas })`),
  cada comprobación **vista en ROJO a propósito** (romper en una copia, correr, restaurar con `cmp`).
- Si se crea o toca algo bajo `shared/`: los seis guardianes con `-w server`: `verify:pureza`,
  `verify:fijo`, `verify:nucleo-quieto`, `verify:fronteras`, `verify:determinismo`,
  `verify:procedencia`.
- Tipos: `npm run typecheck -w server`, `npm run typecheck -w escritorio`, y en `app/` su propio
  `npx tsc --noEmit`. Un error en un fichero de otro frente NO se arregla: se informa.
- Batería: `npm run verificar -- --rapido` durante el trabajo; la entera (`npm run verificar`) sólo el
  coordinador y comprobando antes con `netstat -ano | grep LISTENING` que no hay otra corriendo.
- Servidores de desarrollo: SÓLO los puertos de este árbol: servidor **5290** (`PORT=5290`),
  escritorio **5291** (`GM_API_URL=http://localhost:5290`, `--port 5291 --strictPort`), app web 8131.
  Quien levante uno, lo para al terminar (y comprueba con `Get-CimInstance Win32_Process` que no queda
  un `node` huérfano).

## 8. Reglas para los agentes

- Prohibido `git stash`, `git checkout`/`restore` de ficheros, `git reset`, `git commit`, `git merge`.
- Sólo se escriben los ficheros del propio frente. Apuntes y copias de respaldo sólo en
  `…/scratchpad/<frente>/` (cada frente la suya).
- Nada de descargas ni `npm install` (salvo el frente de integración con `react-native-webview`).
- Al terminar: fin de línea LF en todo lo escrito, servidores parados, y un informe con lo hecho, lo
  verificado (con la orden y su salida), lo que falta y lo que haría falta tocar fuera del frente.
