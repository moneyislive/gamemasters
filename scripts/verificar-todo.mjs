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
  { nombre: 'campaña', donde: 'server', guion: 'verify:campana', porque: 'una velada de varios encuentros' },
  { nombre: 'credenciales', donde: 'server', guion: 'verify:credenciales', porque: 'con qué se entra y con qué no' },
  { nombre: 'borrado', donde: 'server', guion: 'verify:borrado', porque: 'quien pide que le borren, queda borrado' },
  { nombre: 'cuentas', donde: 'server', guion: 'verify:cuentas', porque: 'la vitrina y la crónica de cada cual' },
  { nombre: 'dueñas', donde: 'server', guion: 'verify:duenas', porque: 'quién puede dirigir cada partida' },
  { nombre: 'testigos', donde: 'server', guion: 'verify:tokens', porque: 'un testigo ajeno no abre nada' },
  { nombre: 'invitaciones', donde: 'server', guion: 'verify:invitaciones', porque: 'los sobres llegan a quien deben' },
  { nombre: 'proveedores', donde: 'server', guion: 'verify:proveedores', porque: 'entrar con Google y con correo' },
  { nombre: 'enlaces', donde: 'server', guion: 'verify:enlaces', porque: 'los enlaces firmados valen para una cosa' },
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
      'los seis aventureros compilados llevan el mismo rig de veintitrés huesos, el color horneado en cada vértice y ninguna textura que Hermes no sepa abrir; miden lo que mide una persona en `escala.ts`; y cada pista de los doce clips de `animaciones.glb` encuentra su hueso en cada personaje con el nombre que GLTFLoader deja al cargar',
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
