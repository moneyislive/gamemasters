# COSTE Y ESCALA DEL SERVIDOR

**Cuánto cuesta en servidor cada cosa que hace la Sala de Arcade —mesas por turnos y Boots on
Board—, cuánta gente cabe hoy en una instancia, y qué hay que hacer, y cuándo, para que quepa
más.** Escrito el 23 de septiembre de 2026 con lo MEDIDO ese día por los frentes de Boots on Board
y de la plataforma; lo que es estimación se dice. Si una cifra de aquí no coincide con
`npm run medir:botas -w server` o con los comprobadores, gana la medida.

---

## 0 · El resumen, para decidir

- **Hoy todo corre en UNA instancia `starter` de Render** (medio núcleo, 512 MB) con un disco de
  1 GB compartido con las subidas. Las mesas y las salas de Boots on Board viven en la memoria de
  ese proceso: **no se puede poner una segunda instancia detrás del balanceador** (los jugadores
  de una misma mesa quedarían repartidos). Crecer es, primero, una instancia más grande; después,
  repartir mesas por código entre procesos (§4).
- **Lo caro no es la CPU.** Un movimiento de un juego por turnos cuesta ~1 ms; la lógica de 100
  salas de Boots on Board con 500 aparatos andando es el 1,7 % de un núcleo, y el 4,3 % si además
  pelean. Lo que pone el techo es la **memoria** (lo que se retiene) y el **disco** (30 días de
  partidas).
- **Con lo de hoy, una `starter` aguanta del orden de 100 mesas de Boots on Board a la vez (unos
  500 aparatos andando) más el tráfico por turnos** (estimación con las cifras de §2; hay que
  confirmarla en producción con el diagnóstico, §5).
- **El techo real de hoy es el disco:** con partidas de 50-100 kB guardadas 30 días, 1 GB son unas
  13.000 mesas al mes, **unas 450 al día**. Subir el disco a 10 GB cuesta del orden de 2,5 $/mes y
  multiplica ese techo por diez. Es la primera palanca, y es de Miguel (§3).

## 1 · Lo que ya se ha arreglado (23-sep-2026)

| qué | antes | después | dónde |
|---|---|---|---|
| mesas en memoria | TODAS, terminadas o no, 30 días en un `Map` con su diario | se leen del disco cuando se piden; las terminadas salen a la hora, las demás a las 12 h; 200 mesas ≈ 3,3 MB | `server/src/arcade/mesas.ts` (núcleo, resellado) |
| una espera que no cambia nada | 2 proyecciones + 2 opciones por jugador cada 25 s | 0 | la lectura barata (`revisionDe`) |
| topes de carga | sólo en la ruta HTTP | también en `mover()`, que es LA puerta | `exigirLosTopesDelSobre` |
| conexiones al canal de botas | sin tope: un cliente abrió 3.000 sin saludar en 0,7 s y la latencia pasó de 1 a 55 ms | global 2.000, sin saludar 200, 64 por procedencia, 8/s (ráfaga 24): la misma inundación se queda en 200 | `server/src/botas/cuotas.ts` |
| derivar el mundo de Las Lindes con muchas mesas | con más de 7 mesas llenas, cada jugada remontaba el tablero en frío (243 ms) | memoria POR MESA con tope: 4,6 ms con 100 mesas en rueda, y 36,5 MB de cachés en vez de 77 | `shared/arcade/juegos/lindes-mundo.ts` |
| derivar mundos en el servidor | una espiral con 50 salas llenas: la API dejaba de contestar | por turno, ≤20 % del hilo, abrir sala delante | `server/src/botas/canal.ts` |

## 2 · Lo que cuesta cada cosa, medido

**Boots on Board** (`npm run medir:botas -w server`, Las Lindes llena, 5 aparatos a 20 Hz):

- Una foto de 5 personas pesa **180 B**; a 10 fotos/s son **8,8 kB/s por sala** (1,75 por
  aparato), unos **5,3 MB por sala cada 10 minutos**, antes de TLS/TCP. La MISMA cadena va a todos:
  se serializa una vez por sala.
- CPU del tic de fotos: 1,4-5,5 µs por sala (17 µs con el `send` de `ws` de verdad); atender un
  paso (`aqui`), 1,9-3,2 µs. **100 salas con 500 aparatos: 1,7 % de un núcleo** de lógica; con los
  clientes WebSocket en el mismo proceso, 18,9 % como cota por arriba.
- Memoria: ~335-360 kB por sala llena, y ~70 kB por canal abierto.
- Derivar el mundo de una sala en frío: Las Lindes 226 ms (una vez al abrirla; después, lo que
  cambia), El Burgo 3,9 ms.
- Pasos legales corregidos por error: 1 de cada 80.000.
- La refriega: arbitrar un golpe en el peor sitio (tres delante y 200 cajas) cuesta 5,9 µs de
  mediana (9,7 el p95); en un paseo normal, de 3 a 26 µs. El rastro que se rebobina son 6 sitios y
  unos 220 bytes por asiento (108 kB con 500 asientos). Con 100 salas peleando, **4,3 % de un
  núcleo** en total.
- El botín entra en la mesa como un movimiento más, con tope: una vez por minuto y pareja, y como
  mucho 6 por mesa y minuto (360 entradas de diario por hora de pelea).

**Mesas por turnos** (análisis del 23-sep; parte estimado):

- El reductor es barato (el peor movimiento medido, 1,21 ms). Un movimiento con P jugadores
  sondeando cuesta unas 2P+4 proyecciones y una escritura síncrona de la mesa ENTERA con su
  diario, que crece con la partida.
- En disco, 50-100 kB por mesa (estimado); el estado, menos de 30 kB.
- Tráfico de salida: una partida del Burgo mueve ~24,6 MB en crudo (Render comprime; el factor
  depende del contenido).

## 3 · Lo que tiene que hacer Miguel (sin código)

1. **Medir `SALTOS_DE_CONFIANZA` en producción** antes de desplegar. De él dependen el limitador
   HTTP y, desde ahora, las cuotas por procedencia del canal de botas: mal puesto, o caen en modo
   degradado (sólo topes globales) o meten a media plataforma en el mismo cubo.
2. **Subir el disco de Render de 1 GB a 10 GB** (del orden de 2,5 $/mes): el techo de ~450 mesas
   al día pasa a ~4.500.
3. **Vigilar el diagnóstico** (`/api/arcade/diagnostico`, bloque `botas`: salas, canales,
   correcciones, `cuotasNegadas`, `msDerivando`) las primeras semanas: es lo que confirma o
   desmiente las estimaciones de §0.
4. **Cuando la memoria apriete** (el diagnóstico y el panel de Render lo dirán), pasar de
   `starter` (512 MB) a `standard` (2 GB): el diseño de un solo proceso aprovecha la memoria
   directamente, sin tocar código.

## 4 · Lo que habrá que programar, y cuándo

En este orden, y sólo cuando lo pida la medida:

1. **Archivar las partidas terminadas** (decisión de producto): comprimir o sacar el diario de las
   terminadas a un almacén frío en vez de guardarlas enteras 30 días. `mesas.ts` ya tiene la
   costura (`ponerAlmacenDeMesas`, `cuandoSeCierreUnaMesa`) sin tocar lo sellado.
2. **Fragmentos por código dentro de una máquina** (varios procesos Node, uno por núcleo, cada
   mesa entera en uno): cuando una instancia grande ya no dé abasto con un hilo. No toca nada
   sellado; el primario enruta por el código de la mesa, y el canal de botas va en la ruta con el
   código (`/api/arcade/mesas/:codigo/botas`), así que se enruta igual.
3. **Fragmentos en varios servicios** con un enrutador delante: cuando ya no quepa en una máquina.
4. **Un bus compartido** (cualquier instancia sirve cualquier mesa): la más cara y la más
   arriesgada; sólo si las anteriores no bastan.

## 5 · Cómo se comprueba

- `npm run medir:botas -w server`: el banco del canal (fotos, CPU, memoria, derivaciones).
- `npm run verify:cuotas-de-botas -w server`: la inundación se queda en el tope.
- `npm run verify:lindes-mundo -w server`: cuenta lo que cuesta una jugada con muchas mesas.
- `npm run verify:lectura-barata -w server` y `verify:mesas-frias`: la memoria y las lecturas.
