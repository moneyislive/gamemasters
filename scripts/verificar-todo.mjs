/**
 * La batería completa, en un solo comando.
 *
 *   npm run verificar          ← todo, incluidas las dos veladas que arrancan servidor
 *   npm run verificar -- --rapido   ← salta esas dos (unos tres minutos menos)
 *
 * ═══ POR QUÉ HACE FALTA ═══
 *
 * Hay setenta y tantos comprobadores y no había forma de correrlos todos.
 * (El número exacto lo dice la BATERIA de aquí abajo, que es la que manda: escribirlo
 * dos veces garantiza que uno de los dos mienta, y el que miente es siempre éste.)
 * Mientras cada uno vigilaba su rincón eso daba igual: quien tocaba la Momia
 * corría `verify:momia` y ya está.
 *
 * Deja de dar igual en cuanto se toca el CONTRATO. Un cambio en `VistaJugador`
 * o en `Plot` no tiene rincón: alcanza a los tres juegos, a los imprimibles, al
 * taller y al móvil a la vez. Y entonces la pregunta «¿lo he roto?» solo tiene
 * una respuesta honesta si se han corrido TODOS — porque el que falta es
 * siempre el que habría cazado el fallo.
 *
 * No es una hipótesis. Este repositorio ya tiene dos casos anotados de una
 * comprobación que pasaba en verde sin comprobar nada, y los dos se
 * descubrieron por casualidad.
 *
 * Y tiene un tercero, del día que esta lista pasó de catorce comprobadores a
 * treinta y tres: `verify:secretos-agente` llevaba cuatro comprobaciones en
 * rojo, y su cabecera dice que un fallo ahí es el producto. No lo corría nadie.
 *
 * QUÉ SE QUEDA FUERA, Y POR QUÉ. `verify:mongo` mira la base de producción;
 * `oro:capturar` es destructivo; `verify:aguante` tarda minutos y es una prueba
 * de carga. Los demás están todos aquí.
 *
 * ═══ Y AQUÍ HABÍA UN CUARTO MOTIVO QUE ERA FALSO ═══
 *
 * Este párrafo decía también que `verify:arranque`, `verify:conexion` y
 * `verify:puerta-google` «necesitan credenciales o red». Ninguno de los tres las
 * necesita, y se comprobó corriéndolos en una máquina sin nada configurado:
 * salida 0 en 1 s, 0 s y 5 s. Los dos primeros no leen ni una variable de
 * entorno ni abren una conexión; el tercero SE FABRICA su propia credencial
 * —se pone un `PLAYER_TOKEN_SECRET` de mentira y arranca un servidor con el
 * entorno que él elige—, que es justo lo contrario de necesitar una de verdad.
 *
 * Lo que compraban mientras nadie los corría: `verify:arranque` vigila que
 * ninguna pantalla de la app pregunte por la sesión antes de cargarla del disco
 * —el fallo se ve como «no tienes cuenta» teniéndola—, y `verify:puerta-google`
 * es la puerta de identidad entera. Tres comprobadores buenos, escritos, verdes
 * y sin correr, por una frase que nadie volvió a comprobar. Es el cuarto caso de
 * esta clase que apunta este fichero, y los otros tres están aquí arriba.
 *
 * ═══ EL ORDEN NO ES ALFABÉTICO ═══
 *
 * Primero lo que compila, porque si no compila lo demás no significa nada.
 * Después los maestros de oro, que son los que cazan los cambios de
 * comportamiento. Y al final las veladas largas, que tardan minutos y solo
 * merecen la pena si lo anterior está en verde.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rapido = process.argv.includes('--rapido');

/** @type {Array<{ nombre: string, donde: string, guion: string, lento?: boolean, porque: string }>} */
const BATERIA = [
  // ── Que compile ────────────────────────────────────────────────────────────
  { nombre: 'tipos · servidor', donde: 'server', guion: 'typecheck', porque: 'el contrato se respeta' },
  { nombre: 'tipos · taller', donde: 'client', guion: 'typecheck', porque: 'el taller sigue el contrato' },
  {
    nombre: 'tipos · escritorio',
    donde: 'escritorio',
    guion: 'typecheck',
    porque: 'el cliente de PC de la Sala de Arcade sigue el contrato — y compila contra el mismo `shared/arcade` que la app, así que un cambio en el contrato se ve aquí antes que en una pantalla',
  },
  /*
   * ═══ ESTE VA JUSTO ENCIMA DE `tipos · móvil`, Y EL ORDEN ES LA MITAD ═══
   *
   * `tipos · móvil` comprueba las rutas contra `app/.expo/types/router.d.ts`,
   * que `expo-router` GENERA y que `.gitignore` deja fuera del repositorio: solo
   * se rehace cuando alguien levanta la app. O sea que su veredicto no habla del
   * código, habla del código MÁS un artefacto local de antigüedad desconocida.
   *
   * El 31 de agosto de 2026 dio las tres respuestas posibles sobre el MISMO
   * código en la misma tarde: verde con la tabla tan vieja que no apretaba, rojo
   * de verdad con la tabla recién hecha, y rojo falso con la tabla de la víspera
   * rechazando cuatro rutas que sí existían. El verde es el peor de los tres.
   *
   * Puesto delante, cuando el de abajo falle, el de arriba ya habrá dicho si es
   * que hay un fallo o es que la tabla habla de otro árbol.
   */
  {
    nombre: 'rutas · móvil',
    donde: 'app',
    guion: 'verify:rutas',
    porque: 'la tabla de rutas generada conoce las pantallas que hay, así que el typecheck de abajo significa algo',
  },
  { nombre: 'tipos · móvil', donde: 'app', guion: 'typecheck', porque: 'la app sigue el contrato' },

  // ── Que se comporte igual ─────────────────────────────────────────────────
  {
    nombre: 'maestros de oro',
    donde: 'server',
    guion: 'oro:verificar',
    porque: 'los tres juegos producen exactamente lo de antes',
  },
  {
    nombre: 'reparto por servidor',
    donde: 'server',
    guion: 'verify:reparto',
    lento: true,
    porque: 'el mismo binario con otro reparto de juegos, con servidor de verdad',
  },
  {
    nombre: 'juego de fuera',
    donde: 'server',
    guion: 'verify:de-fuera',
    lento: true,
    porque: 'un juego que no esta en el binario se instala desde disco y se juega',
  },
  {
    nombre: 'núcleo agnóstico',
    donde: 'server',
    guion: 'verify:nucleo',
    porque: 'el acoplamiento con CLUEDO no ha subido',
  },

  // ── Que lo declarado exista ───────────────────────────────────────────────
  { nombre: 'juegos', donde: 'server', guion: 'verify:juegos', porque: 'lo declarado está implementado' },
  { nombre: 'juego ajeno', donde: 'server', guion: 'verify:ajeno', porque: 'un juego que no comparte nada entra' },
  { nombre: 'segundo juego', donde: 'server', guion: 'verify:segundo-juego', porque: 'un juego de dos ejes entra' },
  { nombre: 'juego sin ejes', donde: 'server', guion: 'verify:sin-ejes', porque: 'un juego sin acusación entra' },
  { nombre: 'entidades', donde: 'server', guion: 'verify:entidades', porque: 'los almacenes por categoría' },
  {
    nombre: 'el cuadro del Nudo',
    donde: 'server',
    guion: 'verify:cuadro-nudo',
    porque: 'el rompecabezas del cuarto juego tiene siempre una sola solución',
  },
  { nombre: 'partida', donde: 'server', guion: 'verify:partida', porque: 'el ciclo de una partida' },

  {
    nombre: 'el Mayordomo',
    donde: 'server',
    guion: 'verify:mayordomo',
    porque: 'el asistente no filtra la solucion en 25 tramas',
  },
  {
    nombre: 'limitador',
    donde: 'server',
    guion: 'verify:limitador',
    porque: 'que enumerar codigos cueste, y que un acierto no lo lave',
  },
  {
    nombre: 'quien llama',
    donde: 'server',
    guion: 'verify:quien-llama',
    porque: 'que detras de dos balanceadores dos personas no sean una sola',
  },
  { nombre: 'puertas', donde: 'server', guion: 'verify:puertas', lento: true, porque: 'las rutas y el ZIP del paquete' },

  // ── El móvil ──────────────────────────────────────────────────────────────
  { nombre: 'móvil', donde: 'app', guion: 'verify', porque: 'pantallas, tema y tablas de módulo' },
  /*
   * ═══ LOS RELOJES DE LA MESA LARGA, QUE SON DE LA APP Y NO LOS MIRABA NADIE ═══
   *
   * La fase 4 bis dejó tres funciones puras en la app —la pausa del sondeo y los
   * dos rótulos de tiempo— exportadas y sin un solo consumidor fuera de su
   * fichero, con `verify:larga` entero del lado del servidor. Los tres defectos
   * que se colaron estaban ahí dentro, y ninguno da error en ningún sitio: una
   * mesa entera pintada «(fuera)» con todos delante de la pantalla, una mesa de
   * veinticuatro horas que dice «quedan 23 h» nada más abrirla, y un rótulo que al
   * bajar un minuto pasa de «2 días» a «47 h».
   *
   * Va aquí y no dentro de `verify:larga` porque no necesita servidor: llama a las
   * funciones con números. Y la comprobación que más vale es la que ata el tope de
   * la pausa a `CONECTADO_MS` del servidor LEYÉNDOLO de su fichero — el invariante
   * que se rompió no vivía en ninguno de los dos ficheros, vivía entre ellos.
   */
  {
    nombre: 'relojes · móvil',
    donde: 'app',
    guion: 'verify:relojes',
    porque:
      'la pausa del sondeo cabe en la ventana de presencia del servidor —así que nadie sale «(fuera)» teniendo la app delante—, no se pausa mientras se reúne la mesa, y la cuenta atrás ni trunca ni sube',
  },
  /*
   * ═══ LOS TRES QUE ESTABAN FUERA POR UN MOTIVO QUE NO ERA CIERTO ═══
   *
   * Ver la cabecera de este fichero. Los tres corren en segundos y sin nada
   * configurado; el de la puerta de Google va marcado `lento` no por lo que
   * tarda —cinco segundos— sino porque LEVANTA SERVIDORES, que es el criterio
   * que separa las dos mitades de esta lista.
   */
  {
    nombre: 'arranque · móvil',
    donde: 'server',
    guion: 'verify:arranque',
    porque:
      'ninguna pantalla de la app pregunta por la sesión antes de haberla cargado del disco —ese fallo se ve como «no tienes cuenta» teniéndola, y no se reintenta solo—',
  },
  {
    nombre: 'conexión',
    donde: 'server',
    guion: 'verify:conexion',
    porque: 'las reglas de reconexión del cliente y del servidor dicen lo mismo',
  },
  {
    nombre: 'puerta de Google',
    donde: 'server',
    guion: 'verify:puerta-google',
    lento: true,
    porque:
      'la puerta de identidad entera, con servidor de verdad y una credencial fabricada por la propia prueba: quien entra con Google entra como quién dice ser y no como otro',
  },
  /*
   * ═══ Y ÉSTE VA DETRÁS, PORQUE LO QUE COMPRA DESCANSA SOBRE «arcade de fuera» ═══
   *
   * Que un arcade que nadie compiló se instale y salga en el catálogo del servidor
   * lo compra aquél; lo de aquí es que la PORTADA lo enseñe sin mentir sobre él y
   * sin caerse por él. Son dos cosas, y la segunda no se ve hasta que existe la
   * primera.
   *
   * Corre con `node` pelado y en segundos: no levanta Metro ni pide red. Lo que
   * ejercita de verdad es el juicio de nueve ramas, cargando el módulo puro
   * `app/src/arcade/del-servidor.ts` y llamándolo con manifiestos fabricados. Lo
   * que se rompe en silencio no es que la Sala se vea fea: es que una tarjeta
   * mienta sobre por qué no se puede jugar, o que un icono que este binario no
   * conozca deje la portada en blanco.
   */
  /*
   * ═══ LA QUE VIGILA QUE UNA CORRECCIÓN LLEGUE A LOS SEIS FICHEROS ═══
   *
   * No comprueba estética, que es lo que parece por el nombre. Comprueba cuatro
   * parejas de color y de forma que YA han fallado en esta Sala, y que fallan en
   * silencio porque ninguna prueba de este repositorio mira píxeles.
   *
   * Existe por un patrón medido: el raíl de aforo estaba escrito TRES veces, se
   * midió que sus muescas apagadas se separaban de su fondo por 1,80:1 —o sea que
   * desaparecían, y son las que dibujan el largo—, y la corrección llegó a UNA de
   * las tres. Lo mismo con apagar un botón con `opacity`: un fichero dedica ocho
   * renglones a explicar por qué no se hace y el de al lado lo hacía en dos sitios.
   *
   * Corre con `node` pelado en medio segundo y no levanta nada.
   */
  {
    nombre: 'gramática · sala',
    donde: 'app',
    guion: 'verify:gramatica',
    porque:
      'una corrección de contraste hecha en una pantalla de la Sala llega a las siete: ningún botón apagado se apaga con `opacity` —que apaga también la letra y deja una ayuda en 2,32:1—, ningún texto blanco se apoya en el acento vivo —1,98:1 en ámbar—, el raíl de aforo se pinta en un solo sitio y ningún cuerpo baja de 13',
  },

  {
    nombre: 'sala · móvil',
    donde: 'app',
    guion: 'verify:sala',
    porque:
      'la Sala de la portada enseña lo que trae el binario Y lo que instaló el servidor, y cada tarjeta apagada dice SU razón —el mueble que no conozco, los píxeles que viven en otro binario, el juego sin mesa ni reglas aquí, el que no publica nada— en vez de una frase para todas; lo que llega por el cable se valida campo a campo antes de pintarlo, porque un nombre que no sea texto lanza durante el render y esa pantalla no tiene red debajo',
  },

  // ── Las veladas largas ────────────────────────────────────────────────────
  /*
   * ═══ LA QUE NO SABE A QUÉ JUEGA ═══
   *
   * Las tres veladas de abajo conocen su juego: saben qué es una cámara, un
   * paso, una franja, y comprueban las reglas de cada uno. Esta no sabe nada:
   * lee `acciones` del manifiesto, saca las opciones de la vista del jugador y
   * juega los CUATRO hasta el desenlace con el mismo código.
   *
   * Es la única que cubre CLUEDO de punta a punta, y la única que responde a la
   * pregunta que da sentido a toda la arquitectura por capas: ¿se puede jugar a
   * esto sin saber a qué se juega? El día que haga falta un `if` por juego para
   * que avance, deja de pasar, y eso es exactamente lo que se quiere saber.
   */
  {
    nombre: 'jugar sin saber a qué',
    donde: 'server',
    guion: 'jugar:fondo',
    lento: true,
    porque: 'los cuatro juegos, hasta el desenlace, con un jugador que solo lee el manifiesto',
  },
  {
    nombre: 'velada · la Momia',
    donde: 'server',
    guion: 'verify:momia',
    lento: true,
    porque: 'una expedición entera, con servidor de verdad',
  },
  {
    nombre: 'velada · las Sombras',
    donde: 'server',
    guion: 'verify:sombras',
    lento: true,
    porque: 'una noche entera, con servidor de verdad',
  },
  {
    nombre: 'velada · el Nudo',
    donde: 'server',
    guion: 'verify:nudo',
    lento: true,
    porque: 'seis franjas, cuatro minijuegos y el parte del amanecer, con servidor de verdad',
  },
  // ── Los que estaban fuera, y por eso estuvieron rojos sin que nadie lo viera ─
  /*
   * ═══ ESTOS DIECIOCHO NO ESTABAN ═══
   *
   * La batería corría catorce de los treinta y nueve comprobadores que hay. Los
   * otros veinticinco se corrían a mano, o sea casi nunca, y dos llevaban rojos
   * un tiempo indeterminado:
   *
   *   · `verify:secretos-agente` fallaba cuatro comprobaciones porque le
   *     faltaba un import y los tres juegos caían al prompt genérico. Su propia
   *     cabecera dice «un fallo aquí significa que el asistente PUEDE chivar la
   *     solución. No es un fallo de estilo: es el producto».
   *   · `verify:entorno` decía que dos variables que lee el código no estaban
   *     documentadas en `.env.example`. Las dos las había añadido yo.
   *
   * Un comprobador que nadie corre no es una red: es un fichero. Entran aquí
   * todos los que no necesitan ni la base de producción ni media hora.
   */
  { nombre: 'secretos del agente', donde: 'server', guion: 'verify:secretos-agente', porque: 'el asistente no puede chivar la solución' },
  /*
   * EL UNICO HUECO SIN TIPAR DEL CONTRATO. `VistaJugador.estadoDelJuego` es
   * `unknown` a proposito —el nucleo no puede tipar lo que no conoce— y por eso
   * es el unico sitio donde el servidor y la app pueden dejar de hablar el
   * mismo idioma sin que el compilador diga nada. Esto le da al lector de la app
   * lo que el servidor manda de verdad, y comprueba que lo entiende.
   */
  { nombre: 'estado del juego', donde: 'server', guion: 'verify:estado', porque: 'lo que el servidor mete en `estadoDelJuego`, la app lo entiende' },
  /*
   * DOS MINUTOS DE SONDEO DE VERDAD. Seis moviles haciendo lo mismo que hace la
   * app, con la mesa quieta —que es el caso dificil, porque el sondeo tiene que
   * aguantar sus veinticinco segundos callado— mientras se vigila cada segundo
   * cuantos figuran conectados. Va con los lentos por lo que tarda.
   */
  {
    nombre: 'estabilidad de la conexión',
    donde: 'server',
    guion: 'verify:estabilidad',
    lento: true,
    porque: 'seis móviles sondeando dos minutos sin que nadie deje de figurar conectado',
  },
  { nombre: 'entorno', donde: 'server', guion: 'verify:entorno', porque: 'el despliegue y el código hablan de lo mismo' },
  { nombre: 'almacén', donde: 'server', guion: 'verify:almacen', porque: 'lo que se guarda se vuelve a leer igual' },
  { nombre: 'presencia', donde: 'server', guion: 'verify:presencia', porque: 'quién está conectado y quién no' },
  { nombre: 'tope de gasto', donde: 'server', guion: 'verify:tope', porque: 'un bucle no puede vaciar la cuenta' },
  { nombre: 'cobro', donde: 'server', guion: 'verify:cobro', porque: 'cada crédito entra una vez, sale una vez y se puede explicar' },
  { nombre: 'campaña', donde: 'server', guion: 'verify:campana', porque: 'una velada de varios encuentros' },
  { nombre: 'credenciales', donde: 'server', guion: 'verify:credenciales', porque: 'con qué se entra y con qué no' },
  { nombre: 'borrado', donde: 'server', guion: 'verify:borrado', porque: 'quien pide que le borren, queda borrado' },
  { nombre: 'cuentas', donde: 'server', guion: 'verify:cuentas', porque: 'la vitrina y la crónica de cada cual' },
  { nombre: 'dueñas', donde: 'server', guion: 'verify:duenas', porque: 'quién puede dirigir cada partida' },
  { nombre: 'testigos', donde: 'server', guion: 'verify:tokens', porque: 'un testigo ajeno no abre nada' },
  { nombre: 'invitaciones', donde: 'server', guion: 'verify:invitaciones', porque: 'los sobres llegan a quien deben' },
  { nombre: 'proveedores', donde: 'server', guion: 'verify:proveedores', porque: 'entrar con Google y con correo' },
  { nombre: 'enlaces', donde: 'server', guion: 'verify:enlaces', porque: 'los enlaces firmados valen para una cosa' },
  {
    nombre: 'revisión adversaria',
    donde: 'server',
    guion: 'verify:revision',
    porque: 'lo que estropeó veladas de verdad —el resumen que acusa, el arma sin nombre, la pista que dicta— se ve antes de cobrarla',
  },
  {
    nombre: 'esquemas de la trama',
    donde: 'server',
    guion: 'verify:esquemas',
    porque: 'un obligatorio que no existe deja la sala del crimen en blanco sin que la API se queje',
  },
  { nombre: 'trama · la Momia', donde: 'server', guion: 'verify:momia-trama', porque: 'su generación no entrega una velada rota' },
  { nombre: 'puzle · la Momia', donde: 'server', guion: 'verify:puzle-momia', porque: 'el sellado tiene solución única' },
  { nombre: 'trama · las Sombras', donde: 'server', guion: 'verify:sombras-trama', porque: 'su generación no entrega una noche rota' },
  { nombre: 'senda · las Sombras', donde: 'server', guion: 'verify:senda-sombras', porque: 'la senda se puede andar' },
  { nombre: 'aviso legal', donde: 'server', guion: 'verify:legal', porque: 'lo que se publica dice lo que hay' },

  // ── La Sala de Arcade: el segundo motor ───────────────────────────────────
  /*
   * ═══ ESTOS TRES ENTRAN AQUÍ EL MISMO DÍA QUE NACEN ═══
   *
   * Y no es una formalidad. La cabecera de este fichero cuenta que dieciocho
   * comprobadores estuvieron fuera de la lista y dos llevaban rojos un tiempo
   * indeterminado, uno de ellos el que garantiza que el asistente no chive la
   * solución. Un comprobador que no está en la batería no es una red: es un
   * fichero.
   *
   * Los tres son de la fase 0 del motor de arcade y los tres vigilan una regla
   * que no tiene rincón: la frontera entre los dos motores alcanza a `shared/`,
   * a `server/src/` y a cualquiera que importe de ellos, así que la pregunta
   * «¿lo he roto?» solo tiene respuesta honesta si se corren con todo lo demás.
   */
  {
    nombre: 'arcade pobre',
    donde: 'server',
    guion: 'verify:arcade-pobre',
    porque: 'un arcade sin tablero, sin turnos, sin red ni asientos entra — y dice qué peajes paga',
  },
  {
    nombre: 'fronteras',
    donde: 'server',
    guion: 'verify:fronteras',
    porque: 'los dos motores siguen sin conocerse, y el núcleo del arcade sin importar node:',
  },
  {
    nombre: 'pureza del reductor',
    donde: 'server',
    guion: 'verify:pureza',
    porque: 'nada de lo que hace que la misma partida dé dos resultados distintos',
  },
  /*
   * ═══ Y ESTOS TRES SON LOS DE LA FASE 1: «LA FRENTE» ═══
   *
   * Entran el mismo día que el juego, y por la misma razón que los tres de
   * arriba. Pero hay una diferencia que conviene tener presente: aquéllos vigilan
   * el CONTRATO, que se rompe con un `import` razonable, y éstos vigilan un JUEGO
   * QUE SE PUBLICA.
   *
   * Los dos primeros cazan cosas que no dan ningún error cuando ocurren. Una
   * llamada a la red en un juego que se vende como «sin conexión» funciona
   * perfectamente mientras haya cobertura, y el fallo lo descubre alguien en el
   * metro. Una marca registrada colada en una baraja no rompe nada nunca: la
   * descubre una tienda, retirando la app.
   */
  {
    nombre: 'La Frente sin red',
    donde: 'server',
    guion: 'verify:sin-red',
    porque: 'una partida entera con `fetch`, los sockets y el canal sustituidos por funciones que lanzan',
  },
  {
    nombre: 'procedencia y marcas',
    donde: 'server',
    guion: 'verify:procedencia',
    porque: 'todo arcade dice de dónde salen sus reglas, y ninguna marca vetada aparece en sus barajas',
  },
  {
    nombre: 'oro · arcade',
    donde: 'server',
    guion: 'oro:arcade',
    porque: 'un registro de movimientos grabado y el estado final byte a byte, con `canonico.ts`',
  },
  /*
   * ═══ Y ÉSTE ES EL DE LA FASE 2: LA MESA EN LÍNEA ═══
   *
   * Va marcado `lento` porque LEVANTA SERVIDORES —cuatro, contando los dos que
   * tienen que NEGARSE a arrancar— y eso no es una manía: es el patrón de fallo
   * que esta casa ya tiene apuntado dos veces, VERDE EN PROCESO Y ROTO AL
   * ARRANCAR. La mitad de lo que comprueba no se puede comprobar de otra forma:
   * que `routes/arcade.ts` esté montado DELANTE de `requireAuth` no significa
   * nada sin un servidor con su guardián puesto, y que un arcade con secretos
   * sin tapar impida arrancar solo se ve arrancando.
   *
   * Y trae la comprobación que de verdad cierra el agujero de la información
   * oculta: se juega una partida entera de cuatro y se contrasta, revisión a
   * revisión, lo que se le mandó a cada cual contra las manos de los otros tres.
   * Sin eso, una proyección que fuera la identidad pasaría en verde.
   */
  {
    nombre: 'la mesa en línea',
    donde: 'server',
    guion: 'verify:mesa',
    lento: true,
    porque:
      'una mesa de cuatro con mano oculta y servidor de verdad: el plazo vence por la lectura, el `rev` rancio se rechaza al escribir y no al leer, y ninguna carta sale hacia el móvil de otro',
  },
  /*
   * ═══ Y ESTOS CUATRO SON LOS DE LA FASE 3: «EL ARCADE» ═══
   *
   * El primero es LA PRUEBA DURA DE TODA LA ARQUITECTURA y conviene decir por qué
   * con ese nombre. Todo el motor de arcade cuelga de que el reductor sea puro: de
   * ahí salen la verificación de marcadores, la repetición de partidas y la
   * autoridad barata de servidor. Eso está declarado en cabeceras y vigilado
   * estáticamente por `pureza del reductor`, que caza las siete formas conocidas de
   * perderla — pero un barrido estático no puede DEMOSTRAR nada. Esto lo demuestra:
   * juega cuatro partidas, las reejecuta, y las corre en Node y en Hermes.
   *
   * La divergencia de coma flotante entre motores de JavaScript es el fallo que no
   * reproduce ningún test escrito a mano, y que se manifiesta seis meses después
   * como «el jugador ve una partida distinta a la del vecino», en un solo modelo de
   * móvil. Si aparece, aparece AQUÍ y no allí.
   *
   * Los otros tres vigilan cosas que tampoco dan ningún error cuando ocurren: una
   * puntuación que nadie comprueba pasa por buena para siempre, una pantalla en
   * blanco en web no escribe nada en ninguna consola, y un bucle que da sesenta
   * pasos de golpe se ve como que la nave «saltó», si es que alguien lo ve.
   *
   * Y el primero lleva un TERCER escalón que no estaba y que resultó ser el que
   * hacía falta: la partida jugada contra la misma partida expandida desde su
   * repetición. Los otros dos escalones juegan las dos veces con el mismo bucle, o
   * sea que demuestran que el reductor es reproducible —lo que `pureza del
   * reductor` ya vigila— y no tocaban `movimientosDe`, que es de lo que cuelga el
   * marcador entero. Con la expansión desfasada un paso, esta fase pasó cincuenta y
   * tres comprobaciones en verde rechazando récords honrados.
   */
  {
    nombre: 'determinismo',
    donde: 'server',
    guion: 'verify:determinismo',
    porque:
      'el mismo registro da el mismo estado dos veces, da el mismo estado en Node y en Hermes, y la partida expandida desde su repetición da el mismo estado que la jugada — comparado con `canonico.ts` y no con `JSON.stringify`',
  },
  /*
   * ═══ POR QUÉ ESTE VA JUSTO DETRÁS DEL DE ARRIBA, Y NO ES EL MISMO ═══
   *
   * `determinismo` compara Node contra Hermes y da por bueno lo que coincide. Eso deja
   * pasar una familia entera de fallos: los que son IGUALES DE MALOS en los dos motores.
   * El caso medido es la multiplicación en coma fija — `(a * b) >> 16` desborda el entero
   * de 32 bits y devuelve el paso con el signo cambiado en 17 de 32 combinaciones de
   * velocidad por frecuencia, y los dos motores devuelven exactamente la misma firma mala.
   * `determinismo` sale VERDE mientras el paseante anda hacia atrás.
   *
   * O sea que no es que `determinismo` esté mal: es que «las dos coinciden» y «las dos
   * aciertan» son afirmaciones distintas, y sólo comprobaba la primera.
   */
  {
    nombre: 'coma fija',
    donde: 'server',
    guion: 'verify:fijo',
    porque:
      'la multiplicación Q16.16 usa `×` y `÷` —que IEEE 754 fija al bit— y no un desplazamiento, que desborda y devuelve el paso NEGATIVO; y nadie en `shared/` se escribe el suyo a mano',
  },
  /*
   * ═══ Y LO QUE SE CONSTRUYE ENCIMA DE ESA ARITMÉTICA ═══
   *
   * `verify:fijo` dice que los números salen bien. Éste dice que la CAPA que los usa contesta
   * lo mismo en los dos motores: se recorre un tablero lleno de Las Lindes —72 casillas y
   * 3.024 cuerpos, el peor caso medido del juego— en Node y en Hermes, y se comparan la huella
   * del recorrido y con qué se topó.
   *
   * El suelo es la mitad del comprobador y está partido en dos a propósito: un paseante al que
   * no para nada da la misma huella en los dos motores —la de no tocar nada—, y con un solo
   * contador, apagar la capa de colisiones entera seguía dando miles de paradas porque el borde
   * del tablero para igual. Se vio: `porCuerpo` a cero y `porBorde` en 1.946, en verde.
   */
  {
    nombre: 'el mundo y su arena',
    donde: 'server',
    guion: 'verify:mundo',
    porque:
      'el mundo declarado pasa por `canonico.ts` —o sea que se puede comparar y congelar, que es lo que el primer diseño no conseguía con sus listas tipadas dentro— y la arena que se deriva de él para al paseante en los MISMOS sitios en Node y en Hermes: misma huella, mismas paradas contra cuerpo y contra borde, mismos resbalones',
  },
  {
    nombre: 'el mundo del Burgo',
    donde: 'server',
    guion: 'verify:burgo-mundo',
    porque:
      'el Burgo con el que se choca es uno solo aunque cada aparato elija su calidad: lo sólido que la escena PINTA en plena y en sobria se deduce caja a caja y es el mundo que declara `shared/` (la traza, los edificios y lo sólido de los distritos); la ciudad es bit a bit la de antes de mudar la traza, el mundo canoniza, ningún cuerpo se sale del tablero, se nace con suelo y sin cuerpo mirando a una calle, quien embiste setecientos edificios se queda en la fachada, y el mundo levantado y andado en Node y en Hermes deja la misma huella — con suelos de choques contra cuerpo y contra borde',
  },
  {
    nombre: 'el protocolo de Boots on Board',
    donde: 'server',
    guion: 'verify:protocolo-de-botas',
    porque:
      'lo que manda un aparato llega de un entorno hostil, y el lector del servidor devuelve null ante cualquier cosa que no sea exactamente un mensaje bien formado —una clave de más, un número con decimales, una coordenada fuera de la coma fija, un rumbo o una marcha fuera de rango, un texto más largo que el tope—; el del aparato, igual con lo que manda el servidor, la refriega incluida en los dos sentidos; la ruta cuelga de la mesa bajo /api y la llave NO va en ella; y los cierres tienen su número fijo —4007 la versión que no cuadra y 4008 el canal atascado, y los siete de antes sin moverse—, que es lo que distingue el aparato',
  },
  {
    nombre: 'la sala de Boots on Board',
    donde: 'server',
    guion: 'verify:sala-de-botas',
    lento: true,
    porque:
      'la sala del canal con el reloj en la mano: el `hola` en su plazo y la versión (4007), la llave, la mesa en `botas` y recorrible, un canal por asiento, el presupuesto de distancia con su tope de un segundo, la estructura con la escuadra de un tic, lo que viene de camino tras corregir, el cubo, el quieto, la gracia, una foto por sala con TODOS los sentados y un solo temporizador que se para sin salas, el mundo que cambia debajo de alguien, derivar mundos por turno con abrir delante; la refriega entera —el golpe a su manejador sin envenenar la foto, la recarga desde el último aceptado, el alcance, el cono, la espalda, el muro, el más cercano, 250 ms de rebobinado y ni uno más, caer, renacer lejos, intocable y `vidas`—; nadie inmune por no bajar; los topes del botín por pareja y por mesa; el canal atascado (4008); la vía interna con mesas de verdad de los tres juegos; una subida que revienta sin tirar el servidor, y SIGTERM con el montaje de verdad cerrando con 1001 dentro de la despedida',
  },
  {
    nombre: 'Boots on Board de punta a punta',
    donde: 'server',
    guion: 'verify:botas',
    lento: true,
    porque:
      'un servidor de verdad con mesas en `botas`: dos aparatos `ws` entran donde se puede estar, un paseo legal se acepta entero y lo ve el otro, el teletransporte, la muralla de verdad y correr de más se corrigen, los cierres llevan su código del contrato, otras rutas 404 y un origen ajeno 403, y la llave no sale nunca en lo que escribe el servidor; y la refriega en mesas de verdad del Burgo, Riberas y Las Lindes: se tumban por el cable, el botín llega a la mesa y `mirar` lo enseña una vez y no dos, y `arcade:botin` por HTTP sigue siendo un 400',
  },
  {
    nombre: 'las cuotas de Boots on Board',
    donde: 'server',
    guion: 'verify:cuotas-de-botas',
    lento: true,
    porque:
      'el canal no se puede saturar por conexiones: cuatro topes en el upgrade —global, sin saludar, concurrentes por procedencia y ritmo—, con la misma confianza en los saltos de proxy que el limitador HTTP y su modo degradado (con procedencia desconocida sólo mandan los topes globales); la inundación sin saludar se queda acotada con la salud plana, los jugadores de varias mesas desde una misma procedencia entran, y el diagnóstico dice cuántas se negaron y por qué',
  },
  {
    nombre: 'el botín de la refriega',
    donde: 'server',
    guion: 'verify:botin',
    porque:
      'el botín es el único movimiento, además del tic, que entra en una mesa en nombre de nadie, y mueve cosas de valor de un asiento a otro: su lector dice que no a todo lo que llegue con un asiento detrás, a un botín de uno a sí mismo, a un asiento que no está sentado y a una clave de más; y cada juego del registro de mundos tiene su prueba jugada de verdad —se lleva lo que dice su regla y a quien la dice, sin mover el turno, el momento ni los plazos, sin nada que llevarse devuelve el mismo estado, y en sus momentos delicados (el descarte de Riberas, la subasta y el apuro del Burgo) no deja la partida atascada—',
  },
  {
    nombre: 'el mundo de Riberas',
    donde: 'server',
    guion: 'verify:riberas-mundo',
    porque:
      'el mundo del delta cae bajo lo que pinta la escena —centros y vértices de sitios.ts a milésimas, las 2.736 teselas propias dentro de su comarca y ninguna esquina pintada en lo hondo—, el vado frena a la mitad y lo hondo para, cada choza, torre y estiaje corta el paso con su caja medida en tablero.glb, se nace en tierra mirando al centro, y el mismo mundo y el mismo paseo salen en Node y en Hermes',
  },
  {
    nombre: 'el mundo de Las Lindes',
    donde: 'server',
    guion: 'verify:lindes-mundo',
    porque:
      'el mundo de Las Lindes sale del reparto de verdad, bajado a `shared/`: canoniza; estorban la muralla, las torres, la villa, la ermita y lo que se levanta en el campo, con la huella MEDIDA de cada modelo en `tablero.glb` —se vuelve a medir y se exigen los mismos números— y ni una caja de trigal, barbecho o nada menudo, salvo las piedras, rocas y tocones que pasan de la cintura, que estorban con su radio medido sin tapar una senda, el hueco de una puerta ni un sitio de nacer, ni partir el valle; se nace en senda o prado donde se puede estar; quien va derecho contra un lienzo se queda en su lado —y sin él cruzaría— y por el hueco de una puerta se pasa —y cerrada no—; y el mismo tablero da el mismo mundo y el mismo paseo en Node y en Hermes, con suelos de choques contra cuerpo y contra borde',
  },
  {
    nombre: 'marcador',
    donde: 'server',
    guion: 'verify:marcador',
    lento: true,
    porque:
      'una repetición fabricada se rechaza, una real se acepta al reejecutarla, un récord enviado como cifra suelta se rechaza siempre, y la duración declarada se contrasta con el reloj de pared',
  },
  {
    nombre: 'CanvasKit en web',
    donde: 'server',
    guion: 'verify:canvaskit',
    porque:
      'el `.wasm` de Skia está servido y se pide donde está en las DOS disposiciones —en la raíz con Metro, bajo el `baseUrl` en producción—, y ningún fichero de la cadena de la portada, derivada siguiendo los `import`, importa Skia antes de tiempo',
  },
  {
    nombre: 'paso fijo',
    donde: 'server',
    guion: 'verify:bucle',
    porque:
      'la misma cantidad de reloj da la misma cantidad de pasos a 30, 60 y 120 Hz; un fotograma enorme se recorta y la deuda se pierde; y un atasco del hilo de JavaScript no se convierte en un salto de la nave que nadie ve',
  },

  /*
   * LOS DOS DE LA FASE 4, Y VAN EN ESTE ORDEN A PROPÓSITO.
   *
   * Primero el juego y después el núcleo, porque si Riberas está roto el segundo
   * no significa nada: un núcleo quieto es trivialmente cierto cuando no hay nada
   * rico encima que pudiera haberlo movido. Leídos de arriba abajo, los dos
   * juntos son la afirmación entera de la fase.
   */
  {
    nombre: 'Riberas',
    donde: 'server',
    guion: 'verify:riberas',
    porque:
      'el mismo vértice tiene una sola llave por los tres caminos, ninguna choza toca a otra, la serpentina va y vuelve, el Vado Largo se pierde cuando un vecino planta una choza en medio, un trueque caduca solo, y quien no tiene el turno contesta — con el reductor rechazando lo que `opciones()` no ofreció y validando igual lo que sí',
  },
  /*
   * Y LA TRADUCCIÓN A LA ESCENA, detrás de las reglas y delante del núcleo: el
   * tablero 3D no es un motor ni un juego nuevo, es el pintor propio de Riberas, y
   * lo único suyo que puede mentir en silencio es la traducción de la vista a lo
   * que la escena recibe. Se comprueba con una mesa de verdad, no con vistas
   * inventadas.
   */
  {
    nombre: 'Riberas en tres',
    donde: 'server',
    guion: 'verify:riberas-en-tres',
    porque:
      'la barra se enciende exactamente cuando las reglas ofrecen la obra, cada sitio del anillo es un vértice o una arista que `opcionesDeRiberas` ofrece y su movimiento es el de la opción sin montar nada, la mano traduce los cinco bienes y vuelve, y una vista que no es de Riberas devuelve nada en vez de un delta vacío',
  },
  /*
   * ═══ EL BURGO, PASO 1 DE 3: LA TABLA Y LAS MECÁNICAS, ANTES DEL REDUCTOR ═══
   *
   * Va detrás de Riberas y delante de La Larga porque es el sexto arcade en
   * construcción y todavía no juega: lo que hay que vigilar antes de que exista
   * el reductor es que el DATO sobre el que se va a escribir sea el del
   * reglamento (una fila movida cobra la renta de otra calle) y que las tres
   * mecánicas nuevas de `shared/mecanicas/` —el anillo, la hacienda y el mazo—
   * hagan aritmética entera sin sorpresas. `verify:burgo` (el paso 3) jugará
   * partidas encima de esto; si esto está mal, aquello no significa nada.
   */
  {
    nombre: 'Burgo · tabla y mecánicas',
    donde: 'server',
    guion: 'verify:mecanicas-burgo',
    porque:
      'las 40 casillas del Burgo están donde el reglamento dice y se leen por posición, con precios pares, rentas crecientes, 22 solares en 8 barrios de 2 o 3, y las 28 cuentas de deshipoteca escritas a mano; las 16 + 16 cartas van numeradas sin huecos y su serie secreta va y vuelve al número público; ningún texto ni comentario nuevo nombra una marca ajena; las ocho aceras se distinguen de los seis colores de asiento y dejan leer el blanco, medido; el anillo suma en módulo positivo, cruza la salida sólo hacia delante y pone las 40 casillas del cuadrado 8 × 14 en su banda; la hacienda paga todo o nada en enteros y el mazo rota al fondo sin perder una serie — y cada regla se ha visto caer con su veneno',
  },
  /*
   * ═══ EL BURGO, PASO 2 DE 3: LAS REGLAS, JUGADAS ═══
   *
   * Va detrás de la tabla —que es el dato sobre el que estas reglas cuentan— y
   * delante de la traducción a la escena, que traduce lo que estas reglas publican.
   *
   * Existe porque la memoria de esta casa tiene apuntado tres veces qué le pasa a un
   * arcade nuevo con la batería en verde: NADIE LO JUEGA. `verify:mesa` y
   * `verify:larga` lo cubren en lo genérico, `oro:arcade` y `verify:determinismo` lo
   * congelan y lo comparan entre motores, pero ninguno afirma que un hotel cobre lo
   * que dice la tabla, que el tercer intento en la Comisaría pague Y mueva, o que un
   * tic liquide al ausente en un solo tic. Eso no se cae: se juega mal, y se
   * descubre a mitad de partida.
   *
   * No es `lento`: corre en proceso contra el mismo árbitro que usa el servidor
   * (`abrirMesa`, `jugarConMotivo`, `avanzarElReloj`), y lo que viaja por el cable lo
   * mira `verify:mesa`, que allí tiene su bloque. Las tres partidas enteras que juega
   * el robot son la mitad de su tiempo y son lo que separa este comprobador de una
   * lista de afirmaciones sobre estados montados a mano.
   */
  {
    nombre: 'El Burgo',
    donde: 'server',
    guion: 'verify:burgo',
    porque:
      'las cuatro puertas aguantan `undefined` y la sonda de mesa vacía; las rentas son las de la tabla —solar suelto, barrio entero al doble, de una a cuatro casas, hotel, las cuatro estaciones contando las hipotecadas, el servicio a cuatro y a diez veces la tirada— y el hipotecado no cobra mientras el dueño preso sí; se alza y se vende parejo con las existencias del Ayuntamiento; los dobles repiten, tres dobles encierran sin mover ni cobrar, y de la Comisaría se sale por fianza, por Salvoconducto que vuelve al FONDO de su mazo, por dobles o al tercer intento pagando y moviendo igual; las 32 cartas se cumplen UNA a UNA desde estados montados y los dos mazos rotan sin perder una serie; la hipoteca y la deshipoteca salen de una tabla escrita a mano y quien recibe un hipotecado por trato paga el interés o el trato se cae; la subasta releva por asiento con mínimo y múltiplos, la puja libre entra sólo por su puerta con los campos exactos (ocho kilobytes de relleno se quedan fuera) y la cola se vacía en orden; en apuro no se pasa ni se tira, vender e hipotecar saldan solos, y la quiebra va a quien más reclama —con su interés en el acto— o al Ayuntamiento, que deshipoteca los títulos, los saca a subasta uno a uno y devuelve los Salvoconductos al fondo; los tratos se proponen por puerta al del turno o desde el turno, con tope, revalidando las dos partes al aceptar y con un motivo que no dice lo que la vista callaba, y caducan al relevar; el tic hace UNA cosa por caso, devuelve el MISMO objeto en reuniendo y en terminada, y tres mesas donde nadie mueve terminan solas en 357, 1.615 y 7.846 tics medidos; cada uno de los dieciocho tipos fuera de su momento devuelve el mismo objeto con motivo y ningún motivo lleva una serie dentro (se ve caer con «p07»); y tres partidas ENTERAS de 2, 3 y 6 jugadas por el robot quiebran, cobran rentas, ganan subastas, entran en la Comisaría, alzan barrios y cierran tratos hasta un ganador, con la forma cerrada de la vista, `porQueNoEsCanonico` y los secretos mirados en las siete miradas de CADA revisión, el diario reejecutado byte a byte, y las cifras de presupuesto medidas e impresas — con la vacuna del robot que sólo pasa, que se ve no cumplir los mínimos',
  },
  /*
   * ═══ EL BURGO EN TRES: LA TRADUCCIÓN A LA ESCENA, Y EL SERVIDOR SIRVIENDO EL BURGO ═══
   *
   * Va detrás de las reglas del Burgo por lo mismo que «Riberas en tres» va detrás
   * de Riberas: el anillo 3D no es un juego, es el pintor propio del Burgo, y lo
   * único suyo que puede mentir en silencio es `burgo-en-tres.ts`, la traducción de
   * la vista a lo que la escena recibe. Una casilla encendida sin obra, una bandera
   * del color de otro, un par de dados inventado o un botón pintado dos veces no
   * dan error en ninguna consola: se juega mal. Se mide con mesas de verdad y un
   * robot que sólo elige entre lo que `opcionesDelBurgo` ofrece.
   *
   * Es `lento` porque además levanta el servidor: la mitad de lo que un cliente
   * necesita —`burgo.glb` por HTTP con su tipo y sus bytes, el ciclo entero de una
   * mesa de seis por el sondeo, el 409 al vestir en vuelo, el motivo de un rechazo
   * que llega en la respuesta y no en la lectura— no se ve en proceso.
   */
  {
    nombre: 'El Burgo en tres',
    donde: 'server',
    guion: 'verify:burgo-en-tres',
    lento: true,
    porque:
      'en tres partidas de verdad (2, 4 y 6 asientos) y en cada lectura de cada asiento y del mirón, el tablero de la escena dice casilla a casilla lo que dice la vista, cada casilla tocable es una obra que `opcionesDelBurgo` ofrece y su movimiento es la opción sin montar nada, cada movimiento se pinta exactamente una vez entre dados, casillas, hoja y botones sueltos, la puja libre y el trato montados por su puerta entran por el portillo, los sucesos con una jugada de salto son la lista y con dos una gruesa que no pierde posiciones ni dinero, la firma del tablero es estable e inestable cuando toca, los dados traen el par y nunca lo inventan, la hoja no cuenta una carta que no ha salido, una vista de otro juego da nada — y con el servidor levantado, `burgo.glb` llega con sus bytes, seis sentados juegan treinta movimientos por el cable, un movimiento en vuelo al vestir vuelve 409 y se reintenta, y un rechazo trae su motivo en la respuesta y null en la lectura',
  },
  /*
   * ═══ LAS LINDES: EL SÉPTIMO, Y EL PRIMERO CUYO TABLERO NO EXISTE AL EMPEZAR ═══
   *
   * Va detrás del Burgo y delante del núcleo quieto, por el mismo orden que los
   * dos de la fase 4: primero el juego y después la afirmación de que el núcleo
   * no se movió, porque un núcleo quieto es trivialmente cierto si el juego que
   * había encima no funcionaba.
   *
   * Lo que sólo mira éste: que el reparto de losas sea el que dice el diseño
   * —una losa de más o de menos es coherente consigo misma y no la caza ninguna
   * otra comprobación—, que la geometría de lados y huecos cierre en los dos
   * sentidos, que los cuatro recuentos den lo que dicen las reglas sobre
   * tableros puestos A MANO, y que diez partidas enteras no pierdan una losa ni
   * un labriego. Y sobre todo: que en esas diez partidas se haya CERRADO algo de
   * cada clase, porque un cero ahí es la diferencia entre un juego que funciona y
   * uno que termina sin haber jugado.
   */
  {
    nombre: 'Las Lindes',
    donde: 'server',
    guion: 'verify:lindes',
    porque:
      'el reparto son 24 clases y 72 losas con la de salida descontada de la bolsa, girar y desgirar vuelve al mismo lado y al mismo hueco, el hueco que toca al vecino es el de la mitad que de verdad comparte raya, una senda de tres losas entre encrucijadas vale tres y una villa de tres con blasón vale ocho, una ermita rodeada vale nueve, un prado al otro lado de la senda NO toca la muralla de su losa, la mayoría cobra y el empate cobra entero, y diez partidas se juegan hasta vaciar la bolsa sin perder una losa ni un labriego, cerrando villas, sendas, ermitas y prados — con la bolsa sin asomar en la vista de nadie, ni en la del mirón',
  },
  /*
   * Y LA TRADUCCIÓN A LA ESCENA DE LAS LINDES, detrás de sus reglas y delante del
   * núcleo, por el mismo orden que Riberas y el Burgo: el valle en tres dimensiones
   * no es un motor ni un juego nuevo, es el pintor propio de Las Lindes, y lo único
   * suyo que puede mentir en silencio es la traducción de la vista a lo que la escena
   * recibe. Se comprueba con partidas de verdad, no con vistas inventadas.
   */
  {
    nombre: 'Las Lindes en tres',
    donde: 'server',
    guion: 'verify:lindes-en-tres',
    porque:
      'en cuatro partidas de verdad (2, 3, 4 y 5 asientos) y en cada revisión, la escena recibe exactamente las losas que hay con su giro y su número de serie, cada casilla que deja tocar es una colocación que `opcionesDeLasLindes` ofrece y su movimiento es la carga de la opción sin montar nada, lo que se ofrece plantar sale de las OPCIONES y no de la vista —así que a un mirón no se le pinta un botón—, cada labriego cae dentro de su losa con el color de su sitio, y una vista de otro juego devuelve nada en vez de un valle vacío',
  },
  /*
   * ═══ Y LA MISMA MESA, PERO POR EL CABLE ═══
   *
   * Las tres de arriba juegan Las Lindes EN PROCESO. Ninguna pesa lo que de verdad baja a un
   * móvil: la proyección compone el tablero declarado entero —caras, líneas, nudos, rótulos—
   * en cada lectura, y con 72 losas puestas es el objeto más gordo que publica ningún arcade
   * de la casa. `verify:mesa` tiene un tope de 96 kB sobre la vista en proceso (74,2 kB); por
   * el cable la mesa añade asientos, opciones y avisos y se va a 90,9 kB medidos. Ese
   * sobrecoste no lo vigilaba nadie: estaba escrito en un comentario.
   *
   * `lento: true` no es por lo que tarda —2,4 s— sino por el criterio de esta lista: levanta
   * un servidor, y `--rapido` salta los que levantan servidor.
   */
  {
    nombre: 'Las Lindes por el cable',
    donde: 'server',
    guion: 'jugar:lindes',
    lento: true,
    porque:
      'una mesa de tres se juega ENTERA por las rutas de verdad —abrir, sentarse, las 71 losas de la bolsa, plantar y pasar— eligiendo siempre un movimiento del TABLERO QUE EL PROPIO SERVIDOR acaba de mandar: ni un 500, ni un botón que ofrezca y luego rechace, y la lectura más gorda de la partida cabe en los 128 kB del presupuesto del cable, que es el único sitio donde se pesa lo que baja a un móvil de verdad',
  },
  /*
   * Y EL VALLE MEDIDO, que es lo único que dice que el tablero SE VE.
   *
   * Va en `escenas` y no en `server` porque lo que mide es geometría, y porque lee
   * los triángulos de verdad del `.glb` para la cuenta del presupuesto. Los tres
   * fallos que encontró el día que se escribió —bandas de villa sin chaflán, caminos
   * llegando al borde en diagonal y un tablero de diez millones de triángulos— no dan
   * error en ninguna consola: se ven, y se ven tarde.
   */
  {
    nombre: 'Las Lindes · el valle',
    donde: 'escenas',
    guion: 'verify:lindes-escena',
    porque:
      'ni un triángulo del suelo mira hacia abajo, las 24 losas por sus 4 giros casan celda a celda en la raya con todas las que las reglas dejan pegar, ningún muro parte una villa que continúa en la losa de al lado, nada se sale de su losa ni flota ni se planta en mitad de un camino, los muros cubren su tramo sin aplastarse, un tablero de nueve por nueve con el recorte por distancia puesto cabe en el presupuesto —contado con los triángulos reales del `.glb`— y en el lobby los cinco sitios están en corro, mirando a la piedra y sin nada sembrado encima',
  },
  {
    nombre: 'el paseo común',
    donde: 'escenas',
    guion: 'verify:paseo',
    porque:
      'los fotogramas dan exactamente ⌊total/tic⌋ tics y nunca más de cinco por fotograma, lo pintado va siempre entre el tic anterior y el último, las teclas y la palanca piden su rumbo y su marcha con el atrás en +128, contra un cuerpo del mundo se para sin meterse y de lado resbala, la marioneta se queda quieta contra la pared aunque se pulse y corre al correr con el clip a la velocidad del suelo, lo pedido tic a tic basta para rehacer el camino, nadie nace encerrado, y la escena de Las Lindes y la app montan justo esto',
  },
  {
    nombre: 'la compuerta de Boots on Board',
    donde: 'escenas',
    guion: 'verify:compuerta-de-botas',
    porque:
      'la elección de Boots on Board sale al abrir mesa sólo en los juegos que se recorren, encendida sólo si este aparato midió `plena` y apagada siempre con su porqué; lo que viaja en `abrir` es lo que se ve encendido; y un aparato que no llega no se sienta en una mesa `botas` —sentado sin bajar sería inmune a que le roben—, sin que a quien sí llega le cueste una petición',
  },
  {
    nombre: 'el canal del paseo',
    donde: 'escenas',
    guion: 'verify:canal-del-paseo',
    porque:
      'el hola va primero y con la llave, que no va en la URL; nada sale antes de dentro y con él se está donde dijo el servidor; un aqui por tic con los números de la costura —y con la MIRADA, no el paso: andando hacia atrás los demás no te ven darte la vuelta— y quieto dos por segundo; corrige corrige sin ping-pong; a los demás se les pinta 150 ms atrás y nunca por delante; sin vuelta con llave mala, mesa que no u otro aparato, con lo demás la espera se dobla hasta su tope y con quieto se vuelve al andar; la cámara de hombro no atraviesa; el rótulo se lee desde el hombro; y sólo una mesa botas monta el canal',
  },
  /*
   * Y LA FASE 4 BIS, QUE VA ENTRE MEDIAS Y NO AL FINAL.
   *
   * Aquí abajo, después del núcleo, se leería como «y además una cosa larga». Va
   * detrás de Riberas porque juega A RIBERAS —La Larga no es un juego nuevo, es el
   * mismo con la mesa persistida y los plazos en horas de reloj de pared— y delante
   * del núcleo por el mismo motivo por el que Riberas va delante: si La Larga está
   * rota, un núcleo quieto no significa nada.
   *
   * Es `lento` porque levanta el servidor DOS veces: la mitad de lo que afirma
   * —que una partida sobrevive a que el proceso muera— no se puede comprobar sin
   * matar un proceso de verdad.
   */
  {
    nombre: 'La Larga',
    donde: 'server',
    guion: 'verify:larga',
    lento: true,
    porque:
      'una mesa de Riberas con veinticuatro horas por turno se abre con la misma petición que una de treinta segundos, sobrevive a que el proceso muera con turnos jugados antes y después, resincroniza a quien vuelve con un `rev` de hace tres días, deja que el plazo del ausente venza por la lectura de otro, mantiene en la partida a quien cerró la app, y tras tres días sin que nadie mire ha perdido UN turno y no setenta y dos — con el reloj inyectado, no esperando',
  },
  /*
   * ═══ EL ROBOT GENÉRICO: CADA ARCADE DE MESA, JUGADO SIN SABER A QUÉ SE JUEGA ═══
   *
   * Va detrás de los de cada juego: aquéllos saben las reglas y éste ninguna. Lo que sólo mira
   * éste es lo que un juego NUEVO no trae de serie. Recorre el registro, así que un arcade que se
   * dé de alta mañana entra solo, y exige por su nombre los cuatro de hoy para que un filtro roto
   * no se lea como vigilado. No es `lento`: no levanta servidor. Unos 35 s, casi todos de Riberas.
   */
  {
    nombre: 'el robot genérico',
    donde: 'server',
    guion: 'verify:robot-generico',
    porque:
      'los arcades de mesa del registro se juegan con un robot que sólo sabe lo que la plataforma sabe —la vista, `opciones()`, `turnoDe` y `seAcabo`—, tres semillas y dos vueltas: nada revienta, toda opción ofrecida y elegida se puede hacer (ni rechazada, ni muda, ni copia sin cambio), al espectador no se le ofrece nada, ni `arcade:` ni ids repetidos, cada partida termina o sigue viva por jugadas y no por el reloj, mueven todos, todo tipo ofrecido a menudo se hace, la misma semilla da la misma partida y el diario reejecutado el mismo estado; y el bucle que elige lo primero no pasa esos suelos',
  },
  {
    nombre: 'núcleo del arcade quieto',
    donde: 'server',
    guion: 'verify:nucleo-quieto',
    /*
     * ═══ ESTA FRASE HA CAMBIADO DOS VECES, Y LAS DOS POR EL MISMO MOTIVO ═══
     *
     * Decía «sin mover un byte del contrato, del árbitro, de la mesa ni del canal».
     * La fase 4 bis le quitó «la mesa» —`mesas.ts` se movió por el campo de
     * duración— y la fase 5 le quita «el contrato» y «el árbitro».
     *
     * Dejarla como estaba sería la peor clase de mentira que cabe en este fichero:
     * el comprobador estaría verde —se volvió a sellar a sabiendas— y el renglón
     * que dice qué compra estaría contando una fase anterior.
     *
     * LO QUE ESTE COMPROBADOR SIGUE COMPRANDO, y no es poco: que el núcleo no
     * nombre a ningún juego, que no importe nada de `juegos/`, que Riberas siga
     * encima empujándolo, y que cualquier movimiento futuro sea una DECISIÓN —un
     * sello con fecha en el diff— y no un descuido de tres líneas escondido entre
     * las trescientas de un juego.
     *
     * Lo que se movió en la fase 5 y por qué, resumido: `opciones.ts` (nuevo),
     * `tipos.ts` (nombres de asiento), `proyeccion.ts` (tercer argumento),
     * `motor.ts` (rechazo con motivo), `index.ts` (el alta y los lectores) y
     * `arbitro.ts` (transportar el motivo). Los tres huecos que las cuatro fases
     * anteriores rodearon a propósito para no falsear la medida de la fase 4 — que
     * ya está tomada y publicada.
     */
    porque:
      'el núcleo sigue sin nombrar a ningún juego y sin importar de `juegos/`, con Riberas encima; y lo que la fase 5 movió del contrato está sellado a sabiendas, con el sello en el diff',
  },

  /*
   * ═══ LOS DOS DE LA FASE 5, Y VAN EN ESTE ORDEN ═══
   *
   * Primero el presupuesto y después el arcade de fuera, porque el primero es la
   * comprobación de SEGURIDAD del segundo: el enchufe mete código ajeno en este
   * mismo proceso, y lo único que hay entre un reductor mal escrito y todas las
   * veladas en curso es el tope. Leídos en este orden, el segundo se apoya en el
   * primero; al revés, parece que el enchufe entra sin red.
   *
   * El segundo va `lento` porque LEVANTA UN SERVIDOR, y no por manía: la mitad de
   * lo que afirma no se puede comprobar de otra forma. Que las garantías de
   * arranque —`exigirSecretosTapados()` y `exigirQueAguantenVacio()`— alcancen a un
   * arcade que llega por una variable de entorno sólo se ve arrancando; y la ruta
   * de Windows por `pathToFileURL` es un fallo del CARGADOR DE MÓDULOS, que no
   * aparece hasta que hay un `import()` de verdad.
   */
  {
    nombre: 'presupuesto exigido',
    donde: 'server',
    guion: 'verify:presupuesto',
    porque:
      'un reductor que se pasa del tope —de tiempo síncrono o de tamaño de estado— se rechaza sin dejar rastro en la mesa y no vuelve a entrar en el hilo: se le para ANTES de llamarle, contando las entradas; y los demás arcades siguen jugando',
  },
  {
    nombre: 'arcade de fuera',
    donde: 'server',
    guion: 'verify:arcade-de-fuera',
    lento: true,
    porque:
      'un arcade escrito en un fichero temporal fuera del repositorio se instala por `ARCADES_EXTERNOS` —con la ruta de Windows, que es donde falla el cargador—, sale en el catálogo, abre mesa, esconde la mano de cada cual, pinta con el mueble genérico desde sus propias `opciones()` y dice POR QUÉ rechaza un movimiento',
  },
  {
    nombre: 'modalidad de la mesa',
    donde: 'server',
    guion: 'verify:modalidad',
    lento: true,
    porque:
      'una mesa se abre en `normal` o en `botas` y no cambia: sin decir nada es normal, `botas` sólo para un juego que se recorre, lo mal escrito es un 400 que no deja mesa, la modalidad sobrevive a que el proceso muera y un fichero de antes se lee normal; y reconocer una llave no proyecta, no mete el tic, no marca presencia y no escribe',
  },
  {
    nombre: 'lectura barata',
    donde: 'server',
    guion: 'verify:lectura-barata',
    porque:
      'la lectura con `desde` que espera y no encuentra nada no proyecta nada —contado: antes eran dos vistas y dos listas de opciones por vuelta—, la que encuentra algo proyecta una vez y no dos, y lo demás es lo de siempre: 200, 204 y 404, avisos, presencia, el tic metido por la lectura y el despertador',
  },
  {
    nombre: 'CORS con lista blanca',
    donde: 'server',
    guion: 'verify:cors',
    lento: true,
    porque:
      'la API sólo se deja leer desde los orígenes propios, lo añadido en `ORIGENES_PERMITIDOS` y —fuera de producción— el bucle local en cualquier puerto; sin `Origin` se sirve como siempre; el preflight con `x-asiento` pasa sólo desde donde toca y con la lista cerrada de cabeceras; y el servidor de verdad lo monta en lugar del `cors()` pelado',
  },
  {
    nombre: 'mesas frías',
    donde: 'server',
    guion: 'verify:mesas-frias',
    lento: true,
    porque:
      'un proceso nuevo lee lo que se le pide y no la carpeta entera; lo frío sale de la memoria con su fichero intacto y lo que no se puede soltar —alguien esperando, un asiento visto, el candado cogido, una escritura pendiente o una que falló— se queda; al pedirlas vuelven idénticas y con su tic; `abrir` no reparte el código de una mesa dormida; y el barrido de treinta días borra del disco sin cargar nada ni tocar lo que no entiende',
  },

  /*
   * ═══ EL CLIENTE DE ESCRITORIO, Y VA DESPUÉS DEL ARCADE DE FUERA ═══
   *
   * Porque lo que compra descansa sobre lo que compran los dos de arriba: que un
   * arcade que nadie compiló se instala y publica sus `opciones()` es del
   * anterior; lo de aquí es que UNA PANTALLA no pinta nada más que eso.
   *
   * Es rápido a propósito: no levanta servidor y no abre navegador. Renderiza los
   * componentes de verdad con `react-dom/server` contra una partida de Riberas
   * jugada en el momento con el reductor de `shared/`. Lo que quedaría fuera de
   * un comprobador que levantara el navegador —que se vea bonito— no es lo que se
   * rompe en silencio; lo que se rompe en silencio es lo de aquí.
   */
  {
    nombre: 'escena y malla',
    donde: 'escenas',
    guion: 'verify:escena',
    porque:
      'la escena 3D y la malla hexagonal dicen lo mismo: cada vértice cae en la esquina exacta de su isla y no cerca, cada camino va de vértice a vértice y mide un radio, y los puntos de cada número son las formas de sacarlo con dos dados. Lo que NO prueba, y hay que decirlo, es que se vea bien: eso exige ojos y un aparato de verdad',
  },
  /*
   * ═══ LOS ICONOS COMPILADOS, Y POR QUÉ NO BASTA CON EL DE ARRIBA ═══
   *
   * `verify:escena` comprueba que cada dibujo que la escena pide EXISTE en
   * `escenas/iconos.ts` y da triángulos. Lo que no puede saber es si ese
   * fichero es lo que `compilar-iconos.ts` produce hoy: un punto movido en el
   * guion sin recompilar deja dos verdades separadas y todo en verde, y la
   * que se pinta es la vieja. Éste recompila a un temporal y compara bytes;
   * no cuenta nada a mano, así que sigue valiendo cuando el guion crezca.
   */
  {
    nombre: 'iconos compilados',
    donde: 'escenas',
    guion: 'verify:iconos',
    porque:
      '`escenas/iconos.ts` es byte a byte lo que `compilar-iconos.ts` produce: los dibujos de los bienes, las cartas y las cifras que se pintan son los que el guion dibuja hoy, y no una versión de antes de que alguien moviera un punto sin recompilar',
  },
  /*
   * ═══ EL ATLAS DEL TABLERO, COMPILADO PARA EL MÓVIL ═══
   *
   * `verify:escena` mide el agua y las celdas sobre el PNG empotrado en el `.glb`;
   * lo que no puede saber es si la TABLA que el teléfono pinta en su lugar —Hermes
   * no decodifica ese PNG, y hasta que se compiló la app jugaba en dos dimensiones—
   * sigue siendo ese PNG. Va detrás de los iconos porque es el mismo trato: un
   * fichero generado que se recompila a un temporal y se compara byte a byte; y
   * además se ensancha con el código de la app y se compara píxel a píxel con la
   * imagen, y se llama al complemento que lo monta con un analizador de mentira.
   */
  {
    nombre: 'atlas del tablero',
    donde: 'escenas',
    guion: 'verify:atlas-del-tablero',
    porque:
      '`escenas/atlas-del-tablero.ts` es byte a byte lo que `compilar-atlas-del-tablero.ts` produce desde `tablero.glb`, ensanchado es el PNG del atlas píxel a píxel, los colores medidos de la paleta salen de él, y el complemento que lo monta en el móvil lo hace con el `flipY`, el espacio sRGB y los filtros que `GLTFLoader` habría puesto; sin esto el teléfono jugaría sobre un delta con los colores de otra versión, o gris, sin que nada se pusiera rojo',
  },
  /*
   * ═══ LOS AVENTUREROS, Y POR QUÉ ÉSTE VA DETRÁS DE LA ESCENA ═══
   *
   * Porque mide contra ella: la altura de un personaje se contrasta con
   * `ALTURA_DE_UNA_PERSONA` de `escala.ts`, que es la unidad de la que cuelga
   * toda la geometría que el de arriba comprueba. Si la escala está rota, esto
   * no significa nada.
   *
   * Lo que caza no da error en ningún sitio: una textura empotrada que se cuele
   * se ve perfectamente en el PC y deja un HUECO en el móvil, porque Hermes no
   * la sabe abrir; y una pista de animación que no encuentre su hueso —el pack
   * los llama `foot.l` y `GLTFLoader` los deja en `footl`— deja al personaje
   * clavado en T, sin un solo aviso. Por eso carga los siete ficheros con el
   * `GLTFLoader` de three de verdad, en Node, y no con una copia de su regla.
   */
  {
    nombre: 'aventureros',
    donde: 'escenas',
    guion: 'verify:aventureros',
    porque:
      'los seis aventureros compilados llevan el mismo rig de veintitrés huesos, el color horneado en cada vértice y ninguna textura que Hermes no sepa abrir; miden lo que mide una persona en `escala.ts`; y cada pista de los trece clips de `animaciones.glb` encuentra su hueso en cada personaje con el nombre que GLTFLoader deja al cargar',
  },
  /*
   * ═══ LOS DADOS, Y POR QUÉ NO BASTA CON `aventureros` ═══
   *
   * Es el mismo trato que los aventureros (un `.glb` horneado que el móvil tiene que
   * abrir sin textura) sobre otro fichero, `escenas/modelos/dados.glb`, y con dos
   * cosas que sólo éste puede vigilar: que el D6 del pack se compiló con EXACTAMENTE
   * los dos colores de las fichas del tablero (un dado del blanco azulado del pack no
   * da error: es un dado de otro juego), y que `escenas/caras-del-dado.ts`, la tabla
   * generada de qué cara enseña cada número, sigue siendo lo que el fichero mide. Con
   * esa tabla desfasada el dado se asienta y enseña OTRO número, sin un solo aviso.
   */
  {
    nombre: 'dados',
    donde: 'escenas',
    guion: 'verify:dados',
    porque:
      '`dados.glb` trae un solo nodo `dado` con los 521 vértices y 662 triángulos del D6 de KayKit, la caja de 0,75 del pack, el color horneado en exactamente los dos tonos de las fichas y ninguna textura ni UV; carga con el GLTFLoader de verdad sin atributos entrelazados; y `caras-del-dado.ts` es byte a byte lo que se mide contando los puntos: 1..6, 21 en total, opuestas 7',
  },
  /*
   * EL EMBARCADERO SON DOS COMPROBADORES Y NO UNO, por la misma razón que el
   * tablero separa `verify:escena` de mirar el `.glb`: uno abre el fichero
   * compilado y el otro hace aritmética. Si se fundieran, un `.glb` que faltara
   * dejaría sin correr la comprobación de la cala y la cámara, que no lo
   * necesitan para nada. El diseño entero está en `docs/EL-MUELLE.md`.
   */
  {
    nombre: 'embarcadero · modelos',
    donde: 'escenas',
    guion: 'verify:embarcadero-modelos',
    porque:
      'el `.glb` del lobby trae exactamente las piezas que `piezas.ts` declara, todas con el color horneado y ninguna con textura, las que se tiñen llevan su máscara de tinte y ninguna es plana, y el conjunto que una escena llena pone en pantalla cabe en el presupuesto de un móvil',
  },
  {
    nombre: 'embarcadero · cala y cámara',
    donde: 'escenas',
    guion: 'verify:embarcadero',
    porque:
      'la cala que se genera con el código de la mesa es la misma para los seis aparatos, sus seis amarres caen sobre agua y no se solapan, la cámara deja al aventurero local entero y encima de la hoja del HUD en retrato, en tableta y en panorámico, la máquina de estados de los aventureros no se queda nunca en T-pose, y la paleta de colonos es la de Riberas',
  },
  /*
   * ═══ EL BURGO, Y POR QUÉ VA DETRÁS DEL EMBARCADERO ═══
   *
   * Es el mismo trato que `embarcadero · modelos` —un `.glb` horneado que el
   * móvil abre sin textura— sobre otro fichero, `escenas/modelos/burgo.glb`, con
   * dos cosas que sólo éste puede vigilar. Una: las piezas salen de SIETE packs
   * de KayKit en cuatro unidades distintas, y la escala va HORNEADA en los
   * vértices —al revés que el embarcadero, que la deja a la escena—, así que se
   * mide pieza a pieza contra `escala.ts`: una silla del tamaño de una iglesia
   * no da error, se ve. Y dos: que ningún fichero del Burgo nombra la marca de
   * quien vende la mecánica, que es de dominio público.
   */
  {
    nombre: 'burgo · modelos',
    donde: 'escenas',
    guion: 'verify:burgo-modelos',
    porque:
      '`burgo.glb` trae exactamente las piezas que `burgo/piezas.ts` declara, de siete packs, todas con el color horneado y ninguna con textura ni UV; las de asiento llevan su máscara de tinte —las fichas y el estandarte enteras, la casa grande, la posada y la bandera a medias—; la escala va horneada en los vértices y es la del mundo del Muelle, medida: la casa-ficha mide una persona, la casa grande dos, la tesela lo que la del tablero, la losa una casilla y el muro lo que la muralla, y el juez de tallas se ve caer con cajas sin escalar y con cajas escaladas dos veces; carga con el GLTFLoader de verdad sin atributos entrelazados; pesa menos del tope de la tabla; y ningún fichero del Burgo nombra una marca ajena',
  },
  /*
   * LA ESCENA DEL BURGO SON DOS COMPROBADORES, como el embarcadero: el de arriba
   * abre el `.glb` y éste hace la aritmética CONTRA ese `.glb`: las cajas y los
   * triángulos medidos entran en cada juicio. Un edificio metido en la calle, un
   * aventurero en T-pose, una vuelta al anillo de veinte segundos, un tablero
   * lleno que no cabe en un móvil o una esquina fuera del lienzo no dan error en
   * ninguna consola: se ven. Aquí se miden en Node sin abrir un contexto de dibujo.
   */
  {
    nombre: 'burgo · escena',
    donde: 'escenas',
    guion: 'verify:burgo-escena',
    porque:
      'la aritmética de `escenas/burgo/` cuadra con `burgo.glb`: ningún fichero de la escena trae drei, DOM, Expo ni fetch; el anillo mide 864 con casilla de 72 × 108 y esquina de 108, el recinto que le queda a la ciudad es 648 —nueve veces el centro del primer tablero, que es lo que se pidió— y la polilínea tiene 40 puntos donde dicen las cuatro fórmulas; cada rejilla de huecos (peones, casas, posada, bandera, presos y visitas) cabe en su banda con la huella medida y el frente de manzana de dos cuerpos no pisa el carril del avatar; las cuatro avenidas de 48 entran encaradas a las casillas 5, 15, 25 y 35 y ninguna pieza de esquina pisa la ele de la marcha; el precio de cada casilla es el del reglamento, mide 27 de alto y se lee en los mismos píxeles que cuando el tablero era más pequeño; el TABLERO lleno cabe en 900.000 triángulos en plena y 230.000 en sobria dejando sitio a la ciudad, y una tabla con la taberna como posada se ve caer; el peón anda diez mil pasos sin T-pose ni clip inexistente, sobre la polilínea, con doce casillas en 8 s; una jugada real cabe en 14 s y saltarla deja el estado final; los dados obedecen al par; las cuatro esquinas del anillo caen en el lienzo en 16:9, 3:4 y 9:19,5; y lo que la escena MONTA cuadra con lo que el presupuesto cuenta —cada bulto y cada cinta de la ciudad se dibujan con sus triángulos exactos, los dígitos y los emblemas están fundidos en una geometría y se leen del derecho, la histéresis de los niveles existe y se ve fallar sin ella, desde la pose de salida la ciudad entera se monta en L2 y no en manchas, los coches de calle van por el eje de su carril y en el código no queda ni una muralla',
  },
  /*
   * Y LA PLAZA ES EL LOBBY DEL BURGO: la escena HERMANA del embarcadero, que cumple el mismo
   * contrato (`PropsDelEmbarcadero`) y que el tema elige por `escena`. Va detrás de la escena
   * del anillo porque comparte con ella `burgo.glb` y la caché que lo trae, así que si el
   * modelo se mueve las dos se caen y conviene leerlas seguidas.
   */
  {
    nombre: 'plaza del Burgo',
    donde: 'escenas',
    guion: 'verify:plaza',
    porque:
      'la plaza donde la mesa se junta antes de empezar cabe y se ve: la composición es pura y sembrada —el mismo código da la misma plaza—, el peor presupuesto de nueve semillas con seis sentados cabe en los 110.000 triángulos, los seis puestos y el monumento entran enteros en 9:19,5, 3:4 y 16:9 con la hoja encima y sin taparse unos a otros, nadie llega atravesando su propio estandarte ni se cruza con una farola, y ningún fichero de la escena trae drei, DOM, Expo ni fetch',
  },
  /*
   * Y LA CIUDAD ES EL TERCERO DEL BURGO, porque lo que hay DENTRO del anillo ya no
   * es un patio vacío: son 2.916 celdas de calles, manzanas, edificios de varias
   * plantas con sus salas amuebladas y dieciséis distritos, generados con el código
   * de la mesa. Nada de eso da error si sale mal —una calle que no lleva a ninguna
   * parte, un sofá atravesando la puerta, un coche subido a la acera—, y además la
   * ciudad entera NO cabe en ningún aparato: existe por niveles de detalle, así que
   * lo que hay que vigilar es lo que está MONTADO a la vez y no lo que pesa.
   */
  {
    nombre: 'burgo · la ciudad',
    donde: 'escenas',
    guion: 'verify:la-ciudad',
    porque:
      'la ciudad de 648 que se genera con el código de la mesa tiene sentido con VEINTE semillas: el esqueleto es el mismo en todas —dos anillos de bulevar, cuatro avenidas de cuatro celdas que llegan enteras y encaradas a las casillas 5, 15, 25 y 35, glorieta de doce celdas con su isleta—, la red de calles es conexa y cada losa del pack encaja con sus vecinas por las caras que la tabla dice y el `.glb` confirma al rasterizarlo; toda parcela da a una calle y lo que no da a ninguna es patio de manzana; los trece distritos de reserva más el barrio de chalets y los cuatro tejidos están enteros, no se pisan y ninguno muerde una avenida; ninguno de los setecientos edificios se sale de su parcela ni se solapa con otro, todos tienen portal y sus plantas caben en la cáscara del pack; nada se sale del recinto ni se planta en mitad de la calzada; los coches aparcan sólo sobre la recta lisa y a 4,20 del eje, las doce rutas de calle no comparten ni una celda y ninguna se sale del carril, sus horarios no retroceden y ninguno para en verde; los muebles de las salas caben entre sus tabiques, no se atraviesan y dejan libre el barrido de la puerta; al partir la ciudad en grupos no se pierde ni un triángulo ni una celda y bajar de nivel siempre ahorra; y el montaje que la cámara tiene delante desde nueve poses —la glorieta, los cuatro cuadrantes, la boca de una Puerta, un rincón, la pose de salida y el confín— cabe en los 692.000 triángulos de un PC y en los 84.000 de un móvil, viéndose caer la ciudad entera en L1, que pesa millón y medio, y viéndose fallar el umbral viejo, que dejaba la pose de salida en nueve mil triángulos de manchas',
  },
  {
    nombre: 'escritorio honrado',
    donde: 'escritorio',
    guion: 'verify:escritorio',
    porque:
      'el cliente de PC enseña TODOS los arcades instalados y no miente sobre cuáles se pueden jugar en él: son pulsables los que cumplen las TRES condiciones —mueble que pinta la plataforma, mesa en el servidor, y algo declarado que pintar: su lista de `opciones()` o el mueble `tablero`—, y los demás salen igual, apagados y diciendo POR QUÉ, cada uno la suya —solo el que de verdad se juega en la app manda a la app—, ni desaparecen ni dan error al pulsarlos, y un mueble que no conozca tampoco tumba el catálogo; y sus dos muebles genéricos no pintan ni una palabra, ni una pieza ni un movimiento que no viniera dentro de la proyección',
  },
];


const aCorrer = BATERIA.filter((p) => !(rapido && p.lento));

console.log(`\nLa batería · ${aCorrer.length} comprobadores${rapido ? ' (sin las veladas largas)' : ''}\n`);

/** @type {Array<{ nombre: string, ok: boolean, ms: number, salida: string }>} */
const resultados = [];

for (const prueba of aCorrer) {
  process.stdout.write(`  ${prueba.nombre.padEnd(24)} `);
  const desde = process.hrtime.bigint();
  const r = spawnSync('npm', ['run', prueba.guion, '--silent'], {
    cwd: path.join(RAIZ, prueba.donde),
    encoding: 'utf8',
    shell: true,
  });
  const ms = Number((process.hrtime.bigint() - desde) / 1_000_000n);
  const ok = r.status === 0;
  resultados.push({ nombre: prueba.nombre, ok, ms, salida: `${r.stdout ?? ''}${r.stderr ?? ''}` });
  console.log(`${ok ? '✓' : '✗'}  ${(ms / 1000).toFixed(1)}s`);
}

const rotos = resultados.filter((r) => !r.ok);
const total = resultados.reduce((a, r) => a + r.ms, 0);

console.log(`\n${resultados.length - rotos.length} de ${resultados.length} en verde · ${(total / 1000).toFixed(0)}s\n`);

if (rotos.length === 0) {
  console.log(
    rapido
      ? 'Todo en verde. Antes de dar algo por terminado, córrela entera sin --rapido.'
      : 'Todo en verde.',
  );
  process.exit(0);
}

for (const r of rotos) {
  console.log(`${'─'.repeat(72)}\n✗ ${r.nombre}\n${'─'.repeat(72)}`);
  /*
   * Las últimas 40 líneas y no todas: un comprobador que falla suele escupir
   * cientos, y lo que dice qué ha pasado está al final. Quien quiera el resto
   * lo corre suelto — el nombre del guion está aquí arriba.
   */
  const lineas = r.salida.trimEnd().split('\n');
  console.log(lineas.slice(-40).join('\n'));
  console.log('');
}

console.log(`${rotos.length} comprobadores en rojo: ${rotos.map((r) => r.nombre).join(', ')}`);
process.exit(1);
