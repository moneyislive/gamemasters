/**
 * EL BURGO EN TRES DIMENSIONES, EN EL ESCRITORIO: el pintor propio del sexto arcade
 * sobre el motor de la Sala, montado en un lienzo dentro de la mesa de siempre.
 *
 * ═══ QUÉ ES, Y QUÉ NO ═══
 *
 * El Burgo es un arcade de `mueble: 'tablero'`: su vista trae el `TableroDeclarado` de
 * siempre y el retablo lo sigue sabiendo pintar. Lo que cambia es QUIÉN pinta la parte
 * grande: en vez del `Retablo` genérico, aquí se monta la escena del anillo
 * (`escenas/burgo/Burgo.tsx`) con lo que la mesa manda, traducido UNA sola vez en
 * `shared/arcade/juegos/burgo-en-tres.ts`. Es el mismo precedente que Riberas, y por eso
 * el escritorio elige el pintor por TABLA (`pintores.ts`, decisión 18) en vez de por un
 * `if` con el nombre del arcade dentro.
 *
 * NO HAY NINGUNA REGLA AQUÍ. Qué se puede hacer en una casilla lo dice
 * `obraPosibleEnCasilla` leyendo las mismas `opciones()` que el reductor exige; qué se
 * manda al tocar viene ya montado dentro de cada opción; qué dice cada sección de la hoja
 * lo redacta `hojaEnTres`; qué va en el carril lo criba `carrilDelBurgo`. Este fichero
 * recoge y manda. Un `if` sobre un hotel, una renta o una hipoteca escrito aquí sería una
 * segunda traducción, y el día que las dos discreparan nadie se enteraría.
 *
 * ═══ TODO LO TOCABLE VIVE DENTRO DEL RECUADRO, Y ESO ES EL CAMBIO GRANDE ═══
 *
 * ═══ EL FALLO, CON SU SITIO EXACTO ═══
 *
 * Hasta hoy este pintor terminaba con un `<Formulario>` de botones sueltos EN FLUJO, por
 * debajo del recuadro del lienzo, y su cabecera lo defendía diciendo que «caben en flujo
 * donde la mesa genérica ya los pone». No caben, y no es cuestión de cuántos sean: desde la
 * página de pie (`.sala:has(.lienzo-propio)`) el recuadro vale la VENTANA ENTERA menos la
 * cabecera de la Sala, así que «debajo del recuadro» está debajo del canto de la pantalla.
 * Es exactamente el sitio del que Riberas sacó los suyos cuando la partida se paraba sin un
 * solo error, y el commit que lo arregló allí lo dejó escrito: «NINGÚN COMPROBADOR SE PONÍA
 * ROJO… los que había miran la LISTA DE OPCIONES y esa cuenta seguía saliendo bien. Nadie
 * miraba la PANTALLA.»
 *
 * Y había un segundo agujero por debajo del primero: lo que la criba deja fuera se iba a la
 * sección «Ahora» de la hoja, y la hoja vive dentro de un cajón que NACE CERRADO. Con la
 * mesa recién abierta eso llegaba a ser una partida que no arranca —«Empezar la partida» es
 * una opción del momento— detrás de un «≡» que nadie tiene motivo para pulsar.
 *
 * ═══ CÓMO QUEDA REPARTIDO, Y EN QUÉ ORDEN SE COMPONE ═══
 *
 * El recuadro es lo único que hay, y dentro de él, colocado con `position: absolute` encima
 * del `<canvas>`:
 *
 *   · LA CINTA (44 puntos, arriba): salir, el plazo, DE QUIÉN ES EL TURNO y el aviso, el
 *     CÓDIGO DE LA MESA —que es lo que se dicta por voz para que alguien se siente— y mi
 *     dinero con mi color, que además es la puerta del cajón.
 *   · EL CARRIL (otros 44, colgado de la cinta): lo que puedo hacer AHORA MISMO, a la vista
 *     y sin abrir nada, un cuadrado por movimiento. Lo criba `carrilDelBurgo`.
 *   · LA CAJA DE LOS TRATOS (no modal, colgada del carril): lo que me han propuesto y lo que
 *     yo propuse, legible MIENTRAS JUEGA OTRO y con el burgo girando por debajo.
 *   · EL CAJÓN (modal, del pie de la cinta al canto): la hoja entera con sus secciones
 *     plegables, el raíl de la Sala y la crónica.
 *   · EL CARTEL DEL PIE: lo que dice una casilla sin abrir nada, y se va solo.
 *   · LAS CAJAS MODALES: la tarjeta de una casilla, la ficha de un jugador, el componedor de
 *     un trato, la confirmación de un trato y la de lo irreversible.
 *
 * Y el orden de composición NO es libre; lo dice el contrato de la traducción y lo dice el
 * hecho de que la criba es la única que mira a las otras:
 *
 *     const pregon = pregonDelBurgo(...);            // 1. la caja de los tratos
 *     const carril = carrilDelBurgo(...);            // 2. el carril
 *     const hoja   = hojaEnTres(..., pregon, carril);// 3. la hoja, que suelta lo que ya pintan
 *     const fuera  = opcionesFueraDelTablero(..., tablero, dados, hoja, pregon, carril); // 4.
 *
 * ═══ Y LO QUE LA CRIBA DEJA FUERA TERMINA EL CARRIL, QUE ES LO QUE CIERRA EL AGUJERO ═══
 *
 * `opcionesFueraDelTablero` recibe LOS OBJETOS que se pintan y no interruptores, así que con
 * el cajón cerrado la hoja no cuenta y lo suyo vuelve como suelto —las pujas de una subasta,
 * y sin mundo también las obras—. Eso ya no baja al flujo: se le pone forma con
 * `glifosDelCarrilDelBurgo`, que la traducción exporta justamente para poder llamarlo con
 * CUALQUIER lista, y se pegan al final de la misma tira. Como `fuera` se compone DESPUÉS de
 * todos los demás muebles, esos cuadrados son por construcción los que no están en ninguna
 * otra parte: ni uno se repite, ni uno se pierde, y no queda nada en flujo por debajo.
 *
 * Lo IRREVERSIBLE va al final de la tira y se pregunta antes de mandarlo: declararse en
 * quiebra se lleva por delante la partida de quien lo pulsa, y un cuadrado de 44 puntos en
 * medio de una fila es demasiado fácil de rozar. Es el precedente de «Tirar la mesa» de la
 * Sala, dicho aquí dentro.
 *
 * ═══ EL RETABLO NO SE VA: ES EL RESPALDO, Y NO ES OPCIONAL ═══
 *
 * Cuatro cosas pueden faltar y ninguna puede dejar la mesa sin pintar: `burgo.glb` no
 * llega, el `Canvas` revienta al nacer —sin WebGL, sin contexto—, esto se renderiza en
 * Node sin ventana (`verificar-escritorio`), o LA MESA NO CABE EN TRES DIMENSIONES
 * (`seVeEnTres`: más jugadores que colores de peón). En los cuatro casos se pinta EL
 * RETABLO DE SIEMPRE, con sus acciones y sus opciones sueltas, y una línea en letra chica
 * de por qué. Es la regla del §5 del Muelle llevada a la partida: si el mundo no arranca,
 * se juega igual. Y en el Burgo eso importa el doble, porque el retablo del anillo son
 * cuatro tiras de diez casillas que se JUEGAN por acciones y paneles (decisión 9).
 *
 * AHÍ TAMBIÉN SE TRATA Y SE PUJA. Lo que al respaldo le faltaba no era un movimiento —los
 * tiene todos, entre las acciones del tablero y los sueltos, y eso ya estaba comprado— sino
 * las dos PUERTAS: sin ellas no se puede proponer un trato ni pujar una cifra que no sea una
 * de las tres fijas. Como una puerta no es un movimiento, montarlas no toca la partición de
 * esa pantalla: `LasPuertasDelBurgo` monta exactamente esas dos y ni un botón más. Con cinco
 * o seis sentados el respaldo no es un respaldo, es la única pantalla que hay.
 *
 * ═══ SIN CARAS NO ES LO MISMO QUE SIN MUNDO: SON DOS PREGUNTAS ═══
 *
 * El tablero declarado sin caras es la mesa REUNIDA —sólo hay «Empezar»— y ahí no hay
 * anillo que pintar ni retablo que enseñar: sale el formulario a secas. Que la mesa no
 * quepa en tres es otra cosa y tiene tablero: sale el retablo. Preguntar sólo una de las
 * dos fue lo que en Riberas puso cincuenta y cuatro botones sueltos donde tenía que haber
 * un tablero, así que aquí se preguntan las dos, y en este orden.
 *
 * ═══ LO QUE ACABA DE PASAR SE DERIVA AQUÍ Y SE ANIMA ALLÍ ═══
 *
 * La vista trae `jugada` y la lista de sucesos del ÚLTIMO cambio. La escena anima lo que
 * hay entre la jugada que vio y la que llega, y quien sabe cuál vio es esta pantalla: se
 * guarda la anterior en una `ref` y `sucesosEnTres` hace el resto —la lista tal cual si
 * saltó una, una lista GRUESA comparando las dos vistas si saltó más—. Sin la vista
 * anterior no se puede saber dónde estaba cada peón, y la nueva no lo dice.
 *
 * La CRÓNICA se acumula por el mismo camino y con la misma `ref`: la vista trae sólo el
 * último pregón, y `laCronicaConLaVista` apunta uno por jugada. Escrito en `shared/` para
 * que la app y el escritorio no cuenten dos partidas distintas.
 *
 * ═══ EL MODELO SE PIDE UNA VEZ POR PESTAÑA, Y LOS AVENTUREROS LOS TRAE EL MUELLE ═══
 *
 * `burgo.glb` pesa 2,8 MB y se pide por HTTP al servidor de juego; la promesa vive en el
 * módulo (`recordada`), así que la primera mesa lo trae y las siguientes lo encuentran.
 * Los AVENTUREROS son otra cosa: los carga la escena con la `traer` que esta pantalla le
 * pasa, y la caché de `cargadorPara` es POR IDENTIDAD DE ESA FUNCIÓN. Por eso se usa la
 * de `muelle.tsx` y no una escrita aquí: quien acaba de zarpar ya tiene los suyos
 * bajados, y una `traer` propia estrenaría caché justo en el telón de entrada.
 *
 * ═══ LA CÁMARA ES LA DEL BANCO, Y VA MONTADA ANTES QUE LA ESCENA ═══
 *
 * `<CamaraAerea>` va DELANTE de `<Burgo>` dentro del `Canvas`, y no es cosmético: los dos
 * se suscriben a `useFrame` con la misma prioridad, los suscriptores de igual prioridad
 * corren en orden de montaje, y el seguimiento al que mueve de la escena mezcla DESDE la
 * pose que el cliente acaba de dejar. Al revés, el cliente pisaría el seguimiento cada
 * fotograma y el aventurero nunca se vería de cerca.
 *
 * La aritmética no está aquí: `escenas/acercar.ts` y `escenas/burgo/camara-del-burgo.ts`
 * dan los topes, el alcance y la pose de salida, y se pueden medir desde Node. Lo único
 * que esta pantalla decide es CUÁNDO se apaga el seguimiento: cualquier gesto lo cancela,
 * y vuelve con la revisión siguiente.
 *
 * ═══ Y SIEMPRE HAY SALIDA ═══
 *
 * Un zoom sin vuelta atrás atrapa: se entra a mirar una esquina del anillo y ya no se sabe
 * volver. Por eso hay un botón sobre el lienzo, «Ver el burgo entero», que devuelve la
 * pose de salida. Sólo se enseña cuando hace falta: un botón que siempre está no informa
 * de nada.
 *
 * ═══ Y SE PUEDE BAJAR A ANDAR, COMO EN LAS LINDES ═══
 *
 * Tres botones —«La mesa», «Al hombro» y «Sus ojos»— y las teclas 1, 2 y 3, los mismos de Las
 * Lindes, bajan la cámara a la calle; a pie se anda con W, A, S, D o las flechas y Mayúsculas
 * para correr, que lee el paseo común de la escena, y un cartel lo dice mientras se anda. La
 * escena hace el resto (`escenas/burgo/Burgo.tsx`). Lo que es de aquí es que `CamaraAerea` no
 * mueva por detrás la cámara de mesa mientras se anda, y sin desmontarla: desmontada y vuelta a
 * montar se suscribiría DETRÁS de la escena, que es lo que rompe el seguimiento al que mueve. Se
 * monta con `callada={aPie}`, como en Riberas: a pie no gira, ni pasea, ni acerca, ni pone la
 * cámara —la pone la escena, la del paseo—, y al volver a la mesa se mira desde donde se dejó. Lo
 * que sigue haciendo callada es defender la página: la rueda sobre el recuadro no la desplaza (ni
 * un barrido de lado vuelve «atrás» y saca de la mesa) y el clic derecho no abre el menú del
 * navegador encima del burgo. Hasta el 23-sep `callada` apagaba también esas dos defensas, y el
 * Burgo se callaba por otro camino —un acercamiento que no hacía nada y los punteros marcados como
 * de la interfaz—; `lienzo-propio.tsx` separó las dos mitades y el rodeo sobró. Las teclas no
 * cuentan escribiendo en un campo: la puja libre lleva cifras.
 *
 * ═══ Y EN UNA MESA DE BOTAS SE ANDA CON LOS DEMÁS ═══
 *
 * Si la mesa es de la modalidad `botas` —lo dice `esMesaDeBotas`, la misma pregunta que hacen la app
 * y Las Lindes—, la escena recibe el canal: la dirección del WebSocket en la misma casa que sirvió la
 * página (`direccionDelCanal`), la llave del asiento, quién soy y los asientos con su nombre, su
 * figura y el color de su peón (`asientosQueAndanPorElBurgo`). Se empieza al hombro, y el cartel de
 * la columna de las cámaras dice también cómo va el canal. En una mesa normal no se pasa nada y la
 * escena no abre ningún socket.
 *
 * ═══ LO QUE LA REVISIÓN DE LA MESA NO TOCA ═══
 *
 * La cámara. Al cambiar `rev` se suelta lo que se tenía abierto —la tarjeta de una casilla,
 * la ficha de un jugador— y NO se recoloca la vista: quien está mirando su barrio de cerca
 * se queda donde estaba aunque juegue otro. Una cámara que salta con cada jugada ajena
 * marea, y el sondeo trae una revisión nueva cada pocos segundos.
 *
 * ═══ LO QUE ESTO NO IMPORTA ═══
 *
 * Nada de `app/` (lo vigila `verify:fronteras`), nada de `drei`, y ni un color copiado de
 * la paleta de la app: los `.burgo-*` y los `.lienzo-*` de `estilo.css` llevan los suyos
 * escritos.
 */
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import type { Cercania } from '../../escenas/acercar';
import { CERCANIA_DE_SALIDA } from '../../escenas/acercar';
import { Burgo } from '../../escenas/burgo/Burgo';
import { asientosQueAndanPorElBurgo } from '../../escenas/burgo/a-pie';
import type { ModoDelBurgo } from '../../escenas/burgo/a-pie';
import type { EstadoDelCanal } from '../../escenas/paseo/canal-de-botas';
import { esMesaDeBotas } from '../../escenas/paseo/mesa-de-botas';
import type { CanalDeBotas } from '../../escenas/paseo/mesa-de-botas';
import { COMO_SE_GOLPEA, SIN_MANDOS_DE_FUERA } from '../../escenas/paseo/mandos';
import type { MandosDeFuera } from '../../escenas/paseo/mandos';
import { usarElAvisoDelHallazgo } from './a-pie-en-botas';
import { usarAPieApaisado } from './a-pie-apaisado';
import { COMO_SE_ANDA_CON_EL_DEDO, COMO_SE_GOLPEA_CON_EL_DEDO, MandosTactiles, usarAparatoTactil } from './mandos-tactiles';
import { PantallaCompleta } from './pantalla-completa';
import { poseDeLaBandeja, RECOGER_LA_MESA, SACAR_LA_MESA } from '../../escenas/burgo/bandeja-de-los-dados';
import type { RectanguloEnPuntos, SitioDeLaBandeja } from '../../escenas/burgo/bandeja-de-los-dados';
import type { RelojDeLaMesa } from '../../escenas/reloj';
import {
  ALCANCE_DEL_BURGO,
  ALTURA_MINIMA_DEL_OJO_DEL_BURGO,
  CAMPO_DE_LA_CAMARA,
  LIMITES_DEL_BURGO,
  MIRADOR_DEL_BURGO,
  poseDeSalidaAlLadoDeLaCaja,
} from '../../escenas/burgo/camara-del-burgo';
import type { ModoDeCamara, TableroDelBurgoEn3D } from '../../escenas/burgo/tipos';
import { juzgarCalidad } from '../../escenas/embarcadero/calidad';
import type { MuestraDelHilo } from '../../escenas/embarcadero/calidad';
import type { Calidad } from '../../escenas/embarcadero/tipos';
import type { CatalogoDeModelos } from '../../escenas/modelos';
import { unirCatalogos } from '../../escenas/modelos';
import { rutaDeLosDados, rutaDelBurgo } from '../../escenas/ruta-de-modelos';
import type { Opcion } from '../../shared/arcade';
/*
 * EL TIPO DE MOVIMIENTO QUE NO TIENE VUELTA ATRÁS, importado del juego y no escrito aquí.
 * Es un NOMBRE de movimiento, no una regla: qué hace la quiebra lo decide el reductor y qué
 * se ofrece lo decide `opciones()`. Lo único que este cliente saca de él es si antes de
 * mandarlo hay que preguntar, que es una decisión de pantalla —la misma que la Sala toma con
 * «Tirar la mesa»— y no del reglamento.
 */
import { RENDIRSE } from '../../shared/arcade/juegos/burgo';
import {
  camaraSigueA,
  carrilDelBurgo,
  cartelDeCasilla,
  dadosEnTres,
  EL_CARRIL_DE_LA_MESA,
  esperaA,
  fichaDeCasilla,
  fichaDeJugador,
  finalEnTres,
  firmaDelTablero,
  glifosDelCarrilDelBurgo,
  hojaEnTres,
  laCronicaConLaVista,
  LOS_MIOS,
  LOS_TRATOS_DE_LA_MESA,
  marcadorEnTres,
  maravedies,
  obraPosibleEnCasilla,
  obrasSoloEnElAnillo,
  opcionesFueraDelTablero,
  PARA_CONTESTAR,
  pasarEnTres,
  plural,
  pregonDelBurgo,
  seVeEnTres,
  sucesosEnTres,
  tableroEnTres,
  tirarEnTres,
  tratoEnTres,
  vueltaDelReloj,
} from '../../shared/arcade/juegos/burgo-en-tres';
import type {
  DadosEnTres,
  GlifoDelCarrilDelBurgo,
  PregonDelBurgo,
  RenglonDeLaCronica,
  TiraDelTrato,
} from '../../shared/arcade/juegos/burgo-en-tres';
import type { MovimientoDeclarado, TableroDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { Formulario, hayAlgoQuePintar } from './formulario';
import {
  ElComponedorDelTrato,
  LaCronicaDelBurgo,
  LaFichaDeUnJugador,
  LasHojasDelBurgo,
  LasPuertasDelBurgo,
  LaTarjetaDeUnaCasilla,
  usarLaSeccionAbierta,
} from './hojas-del-burgo';
import {
  BAJO_EL_CARRIL,
  CajaColgadaDelLienzo,
  CajaEnElLienzo,
  CamaraAerea,
  CARTEL_DEL_LIENZO,
  CarrilDelLienzo,
  CartelAlPie,
  COLGADA_BAJO_EL_CARRIL,
  ElijeUna,
  elEstiloDeLaCinta,
  LimiteDelMundo,
  RAIZ_DE_LA_CASA,
  raizDelNavegador,
  recordada,
  RUEDAN_SOLAS,
  traerUnGlb,
  usarLaTrampaDeFoco,
  usarLosModelos,
} from './lienzo-propio';
import type { CuadradoDelCarril } from './lienzo-propio';
import { direccionDelCanal } from './mesa';
import type { LaMesa, MesaVista } from './mesa';
import { traer } from './muelle';
import type { ArcadeDelCatalogo } from './muebles';
import { opcionesSueltas } from './plan';
import { loQueSeDiceDeUnFallo } from './red-de-seguridad';
/*
 * DE QUÉ VENTANA ES ESTA PANTALLA, LEÍDO DONDE YA SE LEE. `loQuePide` es la función pura con
 * la que la Sala parte su propia dirección, y de ella sale la silla que va en la llave del
 * bolsillo. Escribir aquí un segundo `URLSearchParams(location.search).get('silla')` sería el
 * sitio donde el día que la silla cambie de nombre se quedaría la mitad vieja — y la mitad
 * vieja es justo la que decide si dos ventanas del mismo navegador comparten cajón. Ver
 * `laSillaDeEstaVentana`, aquí abajo.
 */
import { loQuePide } from './sala';
import { cuantoQuedaEnLaCinta, elPlazoAprieta, msHastaQueCambieElRotulo, cuantoQueda } from './relojes';
import { AccionesDelTablero, Retablo } from './retablo';

/**
 * De dónde se trae el anillo: la única ruta, la de `escenas/ruta-de-modelos.ts`, que es la
 * que sirve `server/src/routes/modelos.ts`. Relativa: en desarrollo la reenvía el proxy de
 * Vite y en producción es el mismo Node que sirve esta página.
 */
const RUTA_DEL_BURGO = rutaDelBurgo();
/** Y los dados, en su fichero de unos kB, por la misma puerta. */
const RUTA_DE_LOS_DADOS = rutaDeLosDados();

/** El título de este pintor sobre el lienzo. Es chrome de la Sala, no una palabra del juego. */
const TITULO_DE_LO_QUE_SE_HACE = 'Lo que puedes hacer';

/**
 * LA SALIDA DEL ACERCAMIENTO, con todas sus letras y no un icono: quien se ha perdido en
 * una esquina del anillo necesita LEER la salida, no adivinarla. «El burgo» es el nombre
 * del sitio y está en el vocabulario del reglamento (§0).
 */
const VOLVER_AL_BURGO_ENTERO = 'Ver el burgo entero';

/**
 * SUS DOS CLASES, Y LA SEGUNDA ES LA QUE SUSTITUYE A UN `CSSProperties`.
 *
 * `burgo-volver` es la de siempre. `burgo-volver-con-carril` es el sitio que ocupa cuando hay
 * tira debajo de la cinta, y hasta hoy vivía en un objeto de JavaScript de este fichero con un
 * `calc(3.75rem + 2.75rem)` dentro: los dos sumandos son de `estilo.css` —el `top` del botón y
 * el `height` del carril— y escritos aquí no se pueden atar a ellos. Ahora es una clase, la
 * hoja la escribe DESPUÉS de `.burgo-volver` (las dos pesan (0,1,0), así que decide el orden) y
 * el comprobador compara los tres números leyendo la hoja.
 */
const EL_BOTON_DE_VOLVER = 'burgo-volver';
const EL_BOTON_DE_VOLVER_CON_CARRIL = 'burgo-volver-con-carril';

/**
 * EL RECUADRO DEL MUNDO, con su nombre escrito UNA vez, y con DOS clases.
 *
 * `burgo-lienzo` es lo suyo —el alto, el fondo, el `touch-action`—, y la cámara lo BUSCA
 * por ella con `closest` para colgar de él el oyente de la rueda, que no puede ir en el
 * `<canvas>` porque los botones de encima son hermanos suyos y no hijos.
 *
 * `lienzo-propio` es la clase GENÉRICA de la que cuelga la pantalla completa (decisión
 * 18): la cadena de seis eslabones de `estilo.css` se engancha con `:has(.lienzo-propio)`
 * en vez de con el nombre de un juego, para que el tercer pintor no vuelva a pagar esto.
 * Riberas conserva la suya —su fichero no se toca en esta fase y sus regex lo atan—, así
 * que hoy la hoja lleva las dos cadenas; el día que Riberas gane la clase genérica, la
 * suya se borra y no cambia nada más.
 */
const RECUADRO_DEL_LIENZO = 'burgo-lienzo';
const LIENZO_PROPIO = 'lienzo-propio';

/**
 * EL CAJÓN, SU VELO Y EL MENÚ, con el nombre escrito UNA vez cada uno, y por el mismo
 * motivo que el recuadro: los busca la cámara.
 *
 * El oyente de la rueda cuelga del recuadro y llama a `preventDefault` SIEMPRE, que es lo
 * que impide que la Sala se desplace mientras uno cree estar acercándose. Dentro del
 * recuadro hay cajas que se desplazan por dentro —el cajón con la hoja entera, el menú de
 * una tarjeta, y las tres piezas genéricas del lienzo: la caja modal, la caja colgada y el
 * carril—, y sobre ellas ese `preventDefault` se lo comería: girar la rueda sobre «Lo mío»
 * acercaría el anillo detrás del cajón sin mover un renglón. Nombradas aquí, la rueda no
 * hace nada de nada sobre ellas.
 *
 * `RUEDAN_SOLAS` viene puesta desde `lienzo-propio.tsx` y no se copia: las clases son de las
 * PIEZAS, así que una caja colgada o un carril que se añadan mañana entran solos en la lista.
 * Lo que se suma aquí son las dos que este pintor pinta con clase propia.
 *
 * Sobre el VELO se llama a `preventDefault` y se para ahí: lo que hay abierto es modal, y
 * modal incluye la cámara.
 */
const EL_CAJON = 'burgo-cajon';
const EL_VELO = 'burgo-velo';
const EL_MENU = 'burgo-elige';
/** Las que se desplazan por dentro: la rueda es suya y no de la cámara. */
const SE_DESPLAZAN_SOLAS = [EL_CAJON, EL_MENU, ...RUEDAN_SOLAS];

const SALIR_DE_LA_MESA = 'Volver a la Sala de Arcade';
const ABRIR_EL_CAJON = 'Abre la hoja de la partida';
const CERRAR_EL_CAJON = 'Cierra la hoja de la partida';
/**
 * EL NOMBRE DEL CAJÓN, que es un `dialog` y sin nombre se anuncia «diálogo» a secas.
 *
 * Aquí ponía `EL_CARRIL_DE_LA_MESA` —la misma cadena que ahora nombra el carril—, y era un
 * nombre equivocado desde antes de que el carril existiera: lo que el cajón lleva dentro es
 * LA HOJA de la partida, no una tira de cuadrados. Con los dos muebles en pantalla a la vez,
 * dos cajas llamadas igual son dos cajas indistinguibles para quien no ve ninguna.
 */
const LA_HOJA_DE_LA_PARTIDA = 'La hoja de la partida';

/** Lo que la caja de los tratos dice cuando la tira entera es el botón. Es cromo, no una regla. */
const ABRIR_EL_TRATO = 'Ábrelo para contestar';
const ABRIR_EL_TRATO_SIN_CONTESTAR = 'Ábrelo para verlo entero';
/** Y lo que se dice antes de mandar algo que no tiene vuelta atrás. También cromo. */
const ESTO_NO_SE_DESHACE = 'Esto no se puede deshacer.';

/** Lo que el cajón puede llegar a medir de ancho, en partes de la raíz de la casa. */
const ANCHO_DEL_CAJON_EN_RAICES = 26;

/**
 * DESDE QUÉ ANCHO DE LIENZO CABE EL CÓDIGO EN LA CINTA, y de dónde sale el número.
 *
 * La cinta reparte 44 puntos de alto entre cuatro cosas que no ceden —salir, el plazo, el
 * código y mi dinero— y una que sí, la frase, que se recorta con puntos suspensivos. En los
 * dos lienzos más estrechos de los dieciocho que mide `verify:escritorio` (288 de ancho) a la
 * frase le quedan menos de cien puntos con el código puesto, o sea dos palabras: ahí el
 * código estorba más de lo que sirve, y sigue estando en el raíl, dentro del cajón. 360 es el
 * ancho del «móvil corriente» de esa misma lista, que es donde la frase vuelve a ser una
 * frase. Con el lienzo sin medir (`0`, que es lo que vale en Node y en el primer fotograma)
 * se pinta: no medir no es lo mismo que no caber.
 */
const ANCHO_DESDE_EL_QUE_CABE_EL_CODIGO = 360;

/**
 * CUÁNTO SE MIRA ANTES DE BAJAR A `sobria`, y de dónde sale.
 *
 * `juzgarCalidad` pide 120 fotogramas de muestras y `alMedir` manda una por segundo, así
 * que con guardar las últimas doce hay de sobra para decidir sin arrastrar el historial de
 * la partida entera. La decisión es de `escenas/embarcadero/calidad.ts` y no de aquí: los
 * dos clientes bajan la calidad con el mismo umbral.
 */
const MUESTRAS_QUE_SE_GUARDAN = 12;

/**
 * EL CAMPO VERTICAL, en grados: el `fov` del `Canvas` de abajo. Sale de
 * `camara-del-burgo.ts` (`CAMPO_DE_LA_CAMARA = 45`) y NO se escribe aquí un 45 suelto: la
 * escena proyecta con ese número y `verify:burgo-escena` afirma que las cuatro esquinas
 * del anillo caben con él. Dos cuarenta y cincos que se puedan separar son un encuadre que
 * miente en una de las dos pantallas.
 */
const FOV = CAMPO_DE_LA_CAMARA;

// ---------------------------------------------------------------------------
// A pie: las tres cámaras, sus teclas y el cartel de cómo se anda
// ---------------------------------------------------------------------------

/**
 * LO QUE SE VE DESDE DÓNDE, con su rótulo y su tecla: los tres de Las Lindes, con sus mismas
 * palabras y sus mismas teclas, para que quien baja a andar en un juego no tenga que aprender el
 * otro. La mesa es con la que se juega; «Al hombro» y «Sus ojos» bajan a la calle.
 */
export const LAS_CAMARAS_DEL_BURGO: readonly { readonly modo: ModoDelBurgo; readonly rotulo: string; readonly ayuda: string; readonly tecla: string }[] = [
  { modo: 'mesa', rotulo: 'La mesa', ayuda: 'Desde arriba, con el burgo entero a la vista. Tecla 1.', tecla: '1' },
  { modo: 'hombro', rotulo: 'Al hombro', ayuda: 'Detrás de tu figura, andando por las calles. Tecla 2.', tecla: '2' },
  { modo: 'ojos', rotulo: 'Sus ojos', ayuda: 'Desde su cara, andando por las calles. Tecla 3.', tecla: '3' },
];

/**
 * ¿ESTA TECLA ES PARA LA CÁMARA? Sólo si nadie está escribiendo: la puja libre lleva cifras, y un
 * «1» tecleado en ella no puede subir a nadie a la mesa. Es la misma lista de lo editable que
 * `formulario.tsx` mira para sus atajos, y por lo mismo: un oyente en el documento se lo lleva TODO.
 */
export function camaraDeLaTecla(e: { readonly key: string; readonly metaKey: boolean; readonly ctrlKey: boolean; readonly altKey: boolean; readonly repeat: boolean }, activo: unknown): ModoDelBurgo | null {
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return null;
  const escribe =
    (typeof HTMLInputElement !== 'undefined' && activo instanceof HTMLInputElement) ||
    (typeof HTMLTextAreaElement !== 'undefined' && activo instanceof HTMLTextAreaElement) ||
    (typeof HTMLSelectElement !== 'undefined' && activo instanceof HTMLSelectElement) ||
    (typeof HTMLElement !== 'undefined' && activo instanceof HTMLElement && activo.isContentEditable);
  if (escribe) return null;
  return LAS_CAMARAS_DEL_BURGO.find((c) => c.tecla === e.key)?.modo ?? null;
}

/**
 * CÓMO SE ANDA, escrito encima del burgo mientras se anda. En la mesa no sale, porque allí no se
 * anda. Es el mismo cartel de Las Lindes (`ComoSeAnda`) con la tecla de volver, y con su clase
 * y su sitio: arriba a la izquierda del lienzo de Las Lindes aquí está la cinta.
 *
 * Suelto y exportado para que `verify:escritorio` lo pinte en los tres modos: el pintor nace en la
 * mesa, y en un pintado estático no se puede bajar a andar.
 *
 * ═══ Y EN UNA MESA DE BOTAS, CÓMO VA EL CANAL ═══
 *
 * En el mismo cartel y debajo, `canal`: «Conectando…», «Dentro», «Sin conexión: …», igual que en Las
 * Lindes (`ComoSeAnda`). Desde la mesa también se enseña —allí no se anda, pero el canal sigue abierto
 * y conviene saber si al bajar se verá a los demás—, y va en la columna de las cámaras, que está en
 * los dos modos; sin canal, en la mesa no sale nada, como siempre. Con canal se golpea, y la tecla
 * va con las demás (`COMO_SE_GOLPEA`, como en Las Lindes).
 *
 * ═══ Y EN UN TELÉFONO, LO QUE SE TOCA ═══
 *
 * Con `tactil` (`usarAparatoTactil`, `mandos-tactiles.tsx`) no hay teclado que nombrar: dice la
 * palanca, el «Correr», el botón de volver y, con canal, el «Golpear».
 */
export function ComoSeAndaPorElBurgo({
  modo,
  canal,
  tactil = false,
}: {
  readonly modo: ModoDelBurgo;
  readonly canal?: string;
  readonly tactil?: boolean;
}): JSX.Element | null {
  if (modo === 'mesa') return canal === undefined ? null : <p className="burgo-como-se-anda">{canal}</p>;
  /*
   * ═══ EN UN TELÉFONO LA PISTA SE VA SOLA (27-sep-2026) ═══
   *
   * Medido con el fotógrafo en un móvil de 360 de ancho: las tres líneas del cartel —la palanca, el
   * correr, volver, golpear y el canal— se quedaban un tercio de la pantalla encima de la calle, todo
   * el rato que se anda. Con el dedo, lo que se toca YA SE VE (la palanca y los botones están ahí), así
   * que la pista (`.burgo-como-se-anda-pista`) se lee al bajar y se recoge a los pocos segundos; lo que
   * se queda es cómo va el canal, que cambia y hace falta. Con teclado no se recoge: las teclas no se
   * ven en ninguna parte.
   */
  const pista = tactil
    ? `${COMO_SE_ANDA_CON_EL_DEDO} · «La mesa» para volver`
    : 'W A S D o las flechas para andar · Mayúsculas para correr · 1 para volver a la mesa';
  const golpe = canal === undefined ? '' : ` · ${tactil ? COMO_SE_GOLPEA_CON_EL_DEDO : COMO_SE_GOLPEA}`;
  return (
    <p className={tactil ? 'burgo-como-se-anda burgo-como-se-anda-tactil' : 'burgo-como-se-anda'}>
      <span className="burgo-como-se-anda-pista">
        {pista}
        {golpe}
      </span>
      {canal === undefined ? null : <span className="burgo-como-se-anda-canal">{canal}</span>}
    </p>
  );
}

/**
 * LAS DOS CARAS DEL BOTÓN DE LA MESA, con las palabras de Riberas (`riberas-en-tres.tsx`): el nombre
 * de un botón dice lo que va a pasar al pulsarlo. Ver «LA MESA RECOGIDA» en el pintor.
 */
export { RECOGER_LA_MESA, SACAR_LA_MESA };

/**
 * LAS TRES CÁMARAS Y EL CARTEL, en una columna arriba a la izquierda del lienzo: debajo de la
 * cinta, y una tira más abajo si hay carril, con la misma cuenta que «Ver el burgo entero» usa al
 * otro lado (`.burgo-a-pie-con-carril`). La columna no coge el puntero —lo que queda entre los
 * botones sigue siendo tablero— y los botones sí.
 */
export function LasCamarasDelBurgo({
  modo,
  alElegir,
  conCarril,
  canal,
  tactil = false,
  recogida = null,
  alRecogerLaMesa,
}: {
  readonly modo: ModoDelBurgo;
  readonly alElegir: (modo: ModoDelBurgo) => void;
  readonly conCarril: boolean;
  /** Cómo va el canal, sólo en una mesa de botas: va en el cartel de debajo. Ver `ComoSeAndaPorElBurgo`. */
  readonly canal?: string;
  /** Si el aparato se toca: el cartel dice la palanca y no el teclado. */
  readonly tactil?: boolean;
  /**
   * LA MESA RECOGIDA, A PIE: `true`/`false` pinta «Sacar la mesa»/«Recoger la mesa» debajo de las
   * cámaras; `null` —en la mesa, o sin mundo— no pinta nada, que no hay caja delante que quitar.
   */
  readonly recogida?: boolean | null;
  readonly alRecogerLaMesa?: () => void;
}): JSX.Element {
  return (
    <div className={conCarril ? 'burgo-a-pie burgo-a-pie-con-carril' : 'burgo-a-pie'}>
      {/* Las cámaras y «Recoger la mesa» en una fila que se parte: tumbado caben juntas y el cartel no baja hasta la palanca. */}
      <div className="burgo-a-pie-fila">
        <div className="burgo-camaras" role="group" aria-label="Desde dónde se mira el burgo">
          {LAS_CAMARAS_DEL_BURGO.map((c) => (
            <button
              key={c.modo}
              type="button"
              className={modo === c.modo ? 'burgo-camara burgo-camara-puesta' : 'burgo-camara'}
              aria-pressed={modo === c.modo}
              title={c.ayuda}
              onClick={() => {
                alElegir(c.modo);
              }}
            >
              {c.rotulo}
            </button>
          ))}
        </div>
        {recogida === null || alRecogerLaMesa === undefined ? null : (
          <button
            type="button"
            className={recogida ? 'burgo-camara burgo-recoger burgo-recoger-recogida' : 'burgo-camara burgo-recoger'}
            title={recogida ? 'Vuelve a poner delante la caja con los dados, tu dinero y el reloj' : 'Quita de delante la caja con los dados y el reloj para ver la calle; tirar y pasar siguen en la tira de arriba'}
            onClick={alRecogerLaMesa}
          >
            <span aria-hidden="true">{recogida ? '▲ ' : '▼ '}</span>
            {recogida ? SACAR_LA_MESA : RECOGER_LA_MESA}
          </button>
        )}
      </div>
      <ComoSeAndaPorElBurgo modo={modo} canal={canal} tactil={tactil} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Los modelos: el anillo y los dados, cada uno con su red
// ---------------------------------------------------------------------------

const traerElAnillo = recordada(() => traerUnGlb(RUTA_DEL_BURGO));
const traerLosDados = recordada(() => traerUnGlb(RUTA_DE_LOS_DADOS));

/**
 * EL CATÁLOGO ENTERO: el anillo y los dados, pedidos A LA VEZ y unidos en un mapa.
 *
 * Con su propia red cada uno: un `dados.glb` que no llegue —un despliegue sin él, un 404,
 * un fichero roto— NO puede tirar el anillo, que pesa 2,8 MB y ya está aquí. El fallo de
 * los dados se convierte en «sin dado» y la escena pinta el cubo del respaldo; se avisa por
 * consola, porque un respaldo mudo es un fallo que nadie ve. Sólo el fallo del anillo
 * rechaza la promesa, y entonces se juega sobre el retablo.
 */
function traerElCatalogoDelBurgo(): Promise<CatalogoDeModelos> {
  const anillo = traerElAnillo();
  const dados = traerLosDados().catch((fallo: unknown): null => {
    console.warn(`Los dados no han llegado (${loQueSeDiceDeUnFallo(fallo)}): se pintan los del respaldo.`);
    return null;
  });
  return Promise.all([anillo, dados]).then(([delAnillo, deLosDados]) => unirCatalogos(delAnillo, deLosDados));
}

// ---------------------------------------------------------------------------
// El pintor
// ---------------------------------------------------------------------------

export interface LoQueVeElBurgo {
  manifiesto: ArcadeDelCatalogo;
  mesa: LaMesa;
  /** La mesa ya puesta: `mesa.mesa` cuando se está dentro. Se pasa aparte para no volver a comprobarlo. */
  puesta: MesaVista;
  /** El tablero declarado que trae la vista. Es lo que pinta el respaldo. */
  tablero: TableroDeclarado;
  opciones: readonly Opcion[];
  /**
   * DÓNDE HA QUEDADO EL RECUADRO DEL LIENZO, para quien tenga que llevar el foco.
   *
   * Lo llama este pintor con el recuadro al montarlo y con `null` al soltarlo, y lo escucha
   * `sala.tsx`. Hace falta avisar porque la decisión de si HAY lienzo se toma aquí dentro y
   * en mitad del render —sin `.glb`, sin WebGL o con más jugadores que colores esto cae al
   * retablo y no hay recuadro ninguno—, o sea que arriba no se puede saber. Y se avisa
   * también con `null`, que es cuando el recuadro SE VA: el modelo tarda, mientras carga ya
   * hay recuadro con su telón, el foco aterriza ahí, y si el `.glb` acaba fallando el
   * recuadro se desmonta CON EL FOCO DENTRO y el navegador lo suelta al `<body>`.
   *
   * OPCIONAL porque el comprobador monta este pintor suelto para medirlo, sin ninguna Sala
   * alrededor: exigirlo allí sería obligar a inventar un destino que nadie lee.
   */
  foco?: (recuadro: HTMLElement | null) => void;
  /**
   * EL RAÍL ENTERO, PARA METERLO EN EL CAJÓN.
   *
   * Dentro van el marcador, la ficha de la mesa con su código y su reloj, las dos salidas y
   * lo que la Sala ya monta y sabe montar, con sus estados y sus efectos. Escribir aquí una
   * segunda versión sería tener dos raíles, y el día que uno gane un dato el otro no lo
   * tendría.
   *
   * OPCIONAL por lo mismo que `foco`: el comprobador monta este pintor sin Sala alrededor.
   * La ficha de la cinta sigue abriendo el cajón —es la puerta y no depende de lo que haya
   * dentro— y sin raíl lo que se abre trae sólo la hoja y la crónica.
   */
  elRail?: ReactNode;
  /**
   * ADÓNDE VA EL «‹» DE LA CINTA: la misma dirección que el rótulo de la cabecera. No se
   * escribe aquí porque lleva dentro la silla de esta ventana (`?silla=`), que es un dato
   * del bolsillo de este navegador y lo sabe la Sala.
   */
  laSalida?: string;
}

/**
 * ═══ QUIÉN ABRE LA FICHA DE UN JUGADOR DESDE EL MARCADOR DEL RAÍL ═══
 *
 * El marcador lo monta la Sala dentro del raíl y el raíl entra en el cajón de este pintor
 * como `children`: o sea que este fichero pinta el marcador SIN poder pasarle una prop, y el
 * marcador es la única manera de llegar con el teclado a la ficha de un jugador —un peón
 * del anillo se toca con el ratón y no está en el orden del tabulador—.
 *
 * Un contexto es lo que resuelve exactamente eso: el cajón envuelve el raíl y publica el
 * gesto; el marcador lo lee si está dentro. Fuera del cajón —el raíl de la Sala junto al
 * respaldo, donde no hay ficha modal que abrir porque no hay lienzo sobre el que abrirla— el
 * valor por omisión es `null` y el marcador se pinta como siempre, con sus renglones y sin
 * un solo botón. No es un interruptor sobre el juego: es a quién se le avisa de un toque.
 */
const ElTactoDelMarcador = createContext<((asiento: string) => void) | null>(null);

/** Lo que está abierto encima del anillo. Uno cada vez: abrir uno cierra el anterior y el cajón. */
type LoAbierto =
  | { readonly que: 'casilla'; readonly casilla: number }
  | { readonly que: 'jugador'; readonly asiento: string }
  | { readonly que: 'trato'; readonly id: number }
  | { readonly que: 'componedor'; readonly a: string | null }
  | { readonly que: 'confirmar'; readonly opcion: Opcion };

/** La casilla que el cartel del pie está diciendo, con el sello que rearma su reloj. */
interface LoSenalado {
  readonly casilla: number;
  /**
   * EL SELLO, QUE ES LO QUE HACE QUE UN CARTEL REPETIDO VUELVA A APARECER.
   *
   * `CartelAlPie` cuelga su reloj del TEXTO pegado (`[texto, msQueDura]`), y eso es lo
   * correcto para no rearmarlo sesenta veces por segundo; el precio es que señalar DOS VECES
   * la misma casilla no repinta nada: el texto es idéntico, el efecto no vuelve a correr, y
   * el cartel que ya se fue no vuelve. Se ve como un cartel que deja de funcionar a la
   * segunda, que es peor que no tenerlo. Con el sello por `key`, el cartel se monta de nuevo
   * —estado limpio, reloj nuevo— y eso sí es un cartel nuevo. Sube uno por señalada, así que
   * dos señaladas seguidas de la misma casilla son dos carteles.
   */
  readonly sello: number;
}

/**
 * ═══ QUÉ RECUERDA EL CARTEL DEL PIE, Y POR QUÉ SON DOS CASILLAS Y NO UNA ═══
 *
 * Desde esta tanda el cartel sale AL POSAR EL CURSOR: la escena publica `alSenalarCasilla`
 * (`escenas/burgo/tipos.ts`) y esta pantalla lo engancha. Lo que NO cambia es el toque, porque
 * con el dedo no hay cursor que posar: el primer toque lee y el segundo abre la tarjeta entera.
 *
 * ═══ EL FALLO QUE ESTO EVITA, CON EL ORDEN EXACTO QUE PROMETE LA ESCENA ═══
 *
 * Las dos cosas juntas, enchufadas a lo bruto, se pisan. El contrato de la escena dice cuándo,
 * y con dos líneas suyas:
 *
 *   · «LEVANTAR EL DEDO (`pointerType` distinto de 'mouse') → `null`, incluso si el gesto acabó
 *     siendo un arrastre. Con RATÓN, soltar el botón NO apaga nada.»
 *   · «ORDEN cuando el dedo levanta sobre una casilla tocable: primero `alSenalarCasilla(null)`,
 *     después `alTocarCasilla(i)`.»
 *
 * O sea: con el DEDO llega un apagado justo ANTES de cada toque, y con el RATÓN no llega
 * ninguno. Y un dedo que se mueve dos puntos sobre la casilla —que es lo normal y no el caso
 * raro: `onPointerMove` sale con el primer píxel de arrastre— manda además su `posa` antes de
 * ese apagado. Con UNA sola casilla recordada hay un fallo en cada aparato, y los dos son de
 * los que no dan error:
 *
 *   · mirando lo que el POSAR dejó, con el dedo el PRIMER toque abriría la tarjeta. Son los
 *     veinte modales por turno que el cartel vino a quitar, contados en `alTocarCasilla`.
 *   · mirando lo que el cartel dice DESPUÉS del apagado, con el dedo el segundo toque no
 *     abriría NUNCA: el `null` del levantar borra lo que el primer toque señaló, y la tarjeta
 *     de una casilla sin obras se queda sin una sola forma de abrirse con el dedo.
 *
 * Por eso se recuerdan DOS cosas. `dice` es lo que el cartel está diciendo —espeja el estado,
 * así que el apagado del dedo la borra— y es la que manda con el ratón: el cursor sigue encima,
 * el cartel sigue puesto, ya se ha leído, y el clic significa «quiero más», o sea la tarjeta al
 * PRIMER clic. `porUnToque` es la casilla que un toque señaló y el apagado NO la borra, que es
 * lo que hace que el segundo toque sea el segundo.
 *
 * ═══ Y VIVE FUERA DEL COMPONENTE PARA PODERSE MEDIR DESDE NODE ═══
 *
 * Dos funciones puras sobre una memoria de dos campos: `verify:escritorio` les pasa las
 * secuencias de avisos que el contrato promete —la del ratón y las dos del dedo— y afirma qué
 * sale de cada una. Metido dentro del componente esto sólo se podría probar con un navegador y
 * punteros de verdad, que es exactamente como se rompen en silencio los filtros de este
 * contrato — lo dice `senaladoTrasElGesto` en el otro extremo, y por eso vive él también fuera.
 */
export interface LaMemoriaDelCartel {
  /** La casilla que el cartel dice AHORA MISMO, o `null`. Espeja el estado que se pinta. */
  readonly dice: number | null;
  /** La casilla que UN TOQUE señaló. El apagado del dedo no la borra: ver la cabecera. */
  readonly porUnToque: number | null;
}

/** Sin cartel y sin toques: lo de salida, y a lo que se vuelve al cambiar la revisión. */
export const EL_CARTEL_EN_BLANCO: LaMemoriaDelCartel = { dice: null, porUnToque: null };

/** Tras un aviso de señalado de la escena (o de una fila que señala). `null` apaga el cartel y nada más. */
export function trasElSenalado(memoria: LaMemoriaDelCartel, casilla: number | null): LaMemoriaDelCartel {
  return memoria.dice === casilla ? memoria : { dice: casilla, porUnToque: memoria.porUnToque };
}

/**
 * QUÉ HACE UN TOQUE EN UNA CASILLA SIN OBRAS: leerla o abrir su tarjeta.
 *
 * Abre si esa casilla YA SE ESTÁ LEYENDO —el cartel la dice, que es el caso del ratón— o si un
 * toque anterior la señaló, que es el caso del dedo. En cualquier otro caso se señala, y se
 * apunta el toque para que el siguiente sobre LA MISMA casilla sí abra.
 */
export function loQueHaceElToque(
  memoria: LaMemoriaDelCartel,
  indice: number,
): { readonly que: 'abre' | 'senala'; readonly memoria: LaMemoriaDelCartel } {
  if (memoria.dice === indice || memoria.porUnToque === indice) {
    return { que: 'abre', memoria: { dice: memoria.dice, porUnToque: null } };
  }
  return { que: 'senala', memoria: { dice: memoria.dice, porUnToque: indice } };
}

/**
 * ═══ LO QUE DICE LA LÍNEA DE ESTADO: DE QUIÉN SE ESPERA, Y QUÉ ACABA DE PASAR ═══
 *
 * Las dos cosas en el MISMO párrafo, que es la única región viva de esta pantalla. Y no se
 * pegan a ciegas, porque al final de la partida se pegaban dos veces la misma frase.
 *
 * ═══ EL FALLO, MEDIDO EN EL BANCO Y EN EL LIENZO MÁS ESTRECHO ═══
 *
 * Con la mesa terminada, la traducción dice `turno` = «Se acabó» y el tablero declarado trae
 * `aviso` = «Se acabó: Ana se queda con el Burgo…». Pegados con « · » eso es «Se acabó · Se
 * acabó: Ana…», y en los dos lienzos más estrechos de los dieciocho (288 de ancho) a la frase
 * le caben DOS PALABRAS antes de los puntos suspensivos: lo único que se leía en la línea de
 * estado del final de la partida era «Se acabó · Se ac…», o sea la misma palabra dos veces y
 * ni una letra de quién ganó. No falla nada y no lo caza ningún comprobador de partición: es
 * texto correcto pegado dos veces.
 *
 * ═══ EL REMEDIO, Y POR QUÉ ES ESTRICTO ═══
 *
 * Si el aviso YA EMPIEZA por lo que dice el turno, el turno no se repite: el aviso lo dice y
 * además sigue. Sólo el PREFIJO, y no «lo contiene»: «Turno de Ana» aparece dentro de muchos
 * avisos de esta mesa a media frase («… y le toca a Ana»), y quitar el turno por eso dejaría
 * la línea sin decir de quién se espera, que es justo lo que este párrafo vino a añadir.
 *
 * No redacta nada: las dos frases son de la traducción y del tablero declarado. Lo único que
 * decide esto es si la segunda hace falta detrás de la primera.
 *
 * ═══ Y LA FRASE ENTERA DEL TURNO, QUE LA CRÓNICA TRAE AL FINAL ═══
 *
 * El aviso del tablero declarado es el aviso del juego MÁS la crónica, y la crónica cierra
 * cada relevo con la frase del suceso `turno`: «Turno de Ana.». En una mesa de verdad la línea
 * decía «Turno de Ana · Te toca tirar. Turno de Ana.» (16-sep-2026). Esa frase se quita, pero
 * sólo ENTERA —de principio de frase a su punto— y sólo si es la misma cabeza que la cinta ya
 * pinta: «Turno de Anabel.» no es «Turno de Ana.», y «le toca a Turno de Ana» a media frase
 * sigue sin tocarse, por lo mismo que arriba.
 */
export function loQueDiceLaCinta(turno: string, aviso: string): string {
  if (turno.length === 0) return aviso;
  if (aviso.length === 0) return turno;
  /*
   * El prefijo cuenta sólo si acaba en BORDE DE PALABRA: «Turno de Anabel.» empieza por las
   * letras de «Turno de Ana» y no es su turno. Detrás del prefijo tiene que venir el final,
   * un signo o un espacio, nunca una letra ni un número.
   */
  if (aviso.startsWith(turno) && !/[\p{L}\p{N}]/u.test(aviso.charAt(turno.length))) return aviso;
  const resto = sinLaFraseDelTurno(aviso, turno);
  return resto.length === 0 ? turno : `${turno} · ${resto}`;
}

/**
 * El aviso sin la frase ENTERA «<cabeza del turno>.», donde la cabeza es lo que la cinta dice
 * antes de su primer « · » («Turno de Ana · puja Bea» → «Turno de Ana»). Devuelve el aviso tal
 * cual si no la trae.
 */
export function sinLaFraseDelTurno(aviso: string, turno: string): string {
  const corte = turno.indexOf(' · ');
  const cabeza = corte < 0 ? turno : turno.slice(0, corte);
  if (cabeza.length === 0) return aviso;
  const frase = `${cabeza}.`;
  let salida = aviso;
  let desde = 0;
  for (;;) {
    const i = salida.indexOf(frase, desde);
    if (i < 0) break;
    const fin = i + frase.length;
    const empiezaFrase = i === 0 || salida.charAt(i - 1) === ' ';
    const acabaFrase = fin === salida.length || salida.charAt(fin) === ' ';
    if (empiezaFrase && acabaFrase) {
      const antes = salida.slice(0, i).trimEnd();
      const despues = salida.slice(fin).trimStart();
      salida = antes.length === 0 ? despues : despues.length === 0 ? antes : `${antes} ${despues}`;
      desde = antes.length;
    } else {
      desde = i + 1;
    }
  }
  return salida;
}

/**
 * LA SILLA DE ESTA VENTANA, que es lo que separa dos ventanas del mismo navegador en la MISMA
 * mesa. Sale de `?silla=` y la parte `loQuePide`, que es la misma función con la que la Sala
 * decide qué pantalla es ésta; aquí no se vuelve a parsear nada.
 *
 * Sin ventana —Node, `verify:escritorio`— es la cadena vacía, que es la silla de siempre: la
 * llave del bolsillo se compone igual y sin sufijo. Un `window` supuesto aquí reventaría el
 * comprobador, que monta este pintor para contar lo que hay en el árbol.
 */
function laSillaDeEstaVentana(): string {
  if (typeof window === 'undefined') return '';
  return loQuePide(window.location.pathname, window.location.search).silla;
}

/** La jugada que trae una vista, o cero. Es el sello con el que la escena sabe qué ha visto. */
function jugadaDe(vista: unknown): number {
  const v = vista as { jugada?: unknown };
  return typeof v.jugada === 'number' ? v.jugada : 0;
}

/** ¿Son la misma pose? Es una igualdad, no una cuenta de cámara: las cuentas están en `acercar.ts`. */
function laMismaPose(a: Cercania, b: Cercania): boolean {
  return a.factor === b.factor && a.centro.x === b.centro.x && a.centro.z === b.centro.z;
}

/**
 * ¿ESTE MOVIMIENTO SE PREGUNTA ANTES DE MANDARLO?
 *
 * Sólo la quiebra, y por lo que la quiebra hace: quien la pulsa deja de jugar esta partida y
 * no hay ningún camino de vuelta. Es la misma decisión de pantalla que la Sala toma con
 * «Tirar la mesa» —se pregunta y se pinta en `.opcion-sobria`— y no una regla del juego: el
 * reductor la acepta igual se pregunte o no. Va por TIPO y nunca por rótulo, que es texto y
 * cambia.
 */
function seConfirmaAntes(o: Opcion): boolean {
  return o.tipo === RENDIRSE;
}

export function BurgoEnTres({
  manifiesto,
  mesa,
  puesta,
  tablero,
  opciones,
  foco,
  elRail,
  laSalida,
}: LoQueVeElBurgo): JSX.Element {
  const { mover, quieto } = mesa;
  const vista = puesta.vista;
  const yo = puesta.yo;
  const nombreDelCajon = useId();

  /*
   * ═══ LAS CUARENTA CASILLAS CONSERVAN SU IDENTIDAD ENTRE SONDEOS, Y ESO ES LO QUE NO TIEMBLA ═══
   *
   * Cada respuesta del servidor trae una vista NUEVA, y `tableroEnTres` fabrica de ella una
   * lista de casillas nueva aunque el anillo no haya cambiado —y no cambia en toda la
   * partida salvo por dueños y casas—. La escena reconstruye el mundo estático cuando cambia
   * la identidad de esa lista: noventa mil vértices fundidos otra vez en cada jugada de
   * cualquiera y en cada vuelta del sondeo. Se vería como un tirón por revisión. Así que se
   * firma con `firmaDelTablero` —que cambia si y sólo si cambia algo que la escena pinta— y,
   * si es la misma, se entrega EL MISMO objeto de antes.
   */
  const loVisto = useRef<{ firma: string; datos: TableroDelBurgoEn3D } | null>(null);
  const datos = useMemo(() => {
    const crudo = tableroEnTres(vista, yo, opciones, puesta.asientos.map((a) => ({ id: a.id, figura: a.figura })));
    if (crudo === null) return null;
    const firma = firmaDelTablero(crudo);
    const antes = loVisto.current;
    const datos = antes !== null && antes.firma === firma ? antes.datos : crudo;
    loVisto.current = { firma, datos };
    return datos;
  }, [vista, yo, opciones, puesta.asientos]);

  /*
   * ═══ LO QUE ACABA DE PASAR, DERIVADO CONTRA LA VISTA QUE LA ESCENA TENÍA ═══
   *
   * `sucesosEnTres` da la lista tal cual si saltó exactamente una jugada, y una lista GRUESA
   * —comparando la vista anterior con ésta— si saltó más de una, que es lo que pasa cuando el
   * sondeo se pierde una revisión. Sin la vista anterior no hay con qué comparar: no se puede
   * saber dónde estaba cada peón, y la nueva no lo dice.
   *
   * La anterior vive en una `ref` y se escribe DENTRO del `useMemo` a propósito: es un apunte
   * de lo que ya se entregó a la escena, no algo que pinte nada, y un estado aquí sería un
   * render de más por vuelta del sondeo.
   */
  const loQueViolaEscena = useRef<{ jugada: number; vista: unknown } | null>(null);
  const sucesos = useMemo(() => {
    const antes = loQueViolaEscena.current;
    const jugada = jugadaDe(vista);
    const lista = sucesosEnTres(antes === null ? jugada - 1 : antes.jugada, vista, antes?.vista);
    loQueViolaEscena.current = { jugada, vista };
    return { jugada, lista };
  }, [vista]);

  /*
   * ═══ LA CRÓNICA, ACUMULADA POR EL MISMO CAMINO Y POR EL MISMO MOTIVO ═══
   *
   * La vista trae SÓLO el último pregón —el estado del juego no puede llevar histórico—, así
   * que el relato lo acumula quien mira. Lo hace `laCronicaConLaVista`, escrito en `shared/`
   * para que la app y esta pantalla no cuenten dos partidas distintas, y devuelve LA MISMA
   * lista por identidad cuando no hay nada nuevo: sin eso, cada vuelta del sondeo repintaría
   * la crónica entera.
   *
   * En una `ref` y no en el estado por lo mismo que la vista anterior: es un apunte, no un
   * estado que decida qué se monta, y guardarlo en un `useState` con un efecto sería un render
   * de más por sondeo — y encima no funcionaría en Node, donde los efectos no corren y donde
   * `verify:escritorio` cuenta lo que hay en el árbol.
   */
  const loApuntado = useRef<readonly RenglonDeLaCronica[]>([]);
  const cronica = useMemo(() => {
    const ahora = laCronicaConLaVista(loApuntado.current, vista);
    loApuntado.current = ahora;
    return ahora;
  }, [vista]);

  // -------------------------------------------------------------------------
  // Lo que se tiene en la mano
  // -------------------------------------------------------------------------

  /**
   * LO QUE ESTÁ ABIERTO ENCIMA DEL ANILLO: la tarjeta de una casilla, la ficha de un
   * jugador, la hoja de un trato, el componedor o una confirmación. Vive aquí y no en la
   * vista porque es DÓNDE ESTÁ MIRANDO LA PERSONA, no estado del juego. UNO CADA VEZ: abrir
   * cualquiera cierra el anterior y cierra el cajón, para que nunca haya dos trampas de foco
   * encima del tablero ni dos componedores en el mismo árbol.
   */
  const [abierto, ponerAbierto] = useState<LoAbierto | null>(null);
  /**
   * EL CAJÓN, EN TRES ESTADOS Y NO EN DOS.
   *
   * `null` es «no lo he tocado, decide el juego»; `true` y `false` son lo que la persona
   * pidió. La diferencia importa por la subasta: cuando me toca pujar, las pujas viven en la
   * sección «La subasta» de la hoja y la hoja vive aquí dentro, así que un cajón que nace
   * cerrado deja lo que hay que contestar detrás de un «≡». Con `null` el cajón se abre solo
   * exactamente entonces, y quien lo cierre a mano manda: sus pujas terminan el carril, que
   * es la red que hay debajo de todo esto.
   *
   * Y se vuelve a `null` cuando la petición del juego CAMBIA (el efecto de más abajo), que es
   * lo que hace que abrirse solo sea una vez por subasta y no una vez por sondeo.
   */
  const [aMano, ponerAMano] = useState<boolean | null>(null);
  /** La casilla que dice el cartel del pie, con su sello. Ver `LoSenalado`. */
  const [senalado, ponerSenalado] = useState<LoSenalado | null>(null);
  const sellos = useRef(0);
  /**
   * LO QUE EL CARTEL RECUERDA, EN UNA `ref` Y NO EN EL ESTADO, y no es una optimización: el
   * apagado del dedo y el toque llegan EN EL MISMO gesto y en este orden —`alSenalarCasilla(null)`
   * y después `alTocarCasilla(i)`—, así que el manejador del toque tiene que leer lo que el
   * apagado acaba de dejar. Un estado se lee por el render que ya se hizo, o sea el de antes del
   * apagado, y con eso el primer toque del dedo abriría la tarjeta. Ver `LaMemoriaDelCartel`.
   */
  const memoriaDelCartel = useRef<LaMemoriaDelCartel>(EL_CARTEL_EN_BLANCO);

  const elRecuadro = useRef<HTMLDivElement | null>(null);

  /*
   * ═══ EL FINAL, DICHO Y NO ADIVINADO ═══
   *
   * Al terminar la partida, esta pantalla se quedaba en la vista del anillo con la cinta
   * diciendo «Se acabó: …» —dos palabras en el lienzo más estrecho— y la clasificación detrás
   * del «≡». Ahora sale sola la tarjeta del final, con quién se queda con el Burgo, por qué
   * acabó, lo que me toca y los puestos; «Ver el tablero» la deja ir, y lo mismo sigue en el
   * marcador del cajón. NO se abre si hay otra caja encima: dos trampas de foco a la vez se
   * cerrarían las dos con un solo `Escape`. Lo redacta `finalEnTres`; aquí no se ordena nada.
   */
  const elFinal = useMemo(() => finalEnTres(vista, yo), [vista, yo]);
  const [finalDejado, ponerFinalDejado] = useState(false);
  const dejarElFinal = useCallback(() => {
    ponerFinalDejado(true);
    elRecuadro.current?.focus();
  }, []);
  const laFichaDeLaCinta = useRef<HTMLButtonElement | null>(null);

  const senalar = useCallback((casilla: number | null) => {
    memoriaDelCartel.current = trasElSenalado(memoriaDelCartel.current, casilla);
    if (casilla === null) {
      ponerSenalado(null);
      return;
    }
    sellos.current += 1;
    ponerSenalado({ casilla, sello: sellos.current });
  }, []);

  /**
   * SOLTARLO TODO: lo que estuviera abierto y el cartel del pie.
   *
   * El cajón NO entra, y no es un olvido: no es algo que se tenga en la mano, es una caja que
   * alguien abrió para leer el marcador y la crónica. Cerrarlo porque otro ha jugado sería
   * arrancarle la página de las manos a quien está mirando cuánto dinero le queda a Bea.
   */
  const soltarTodo = useCallback(() => {
    ponerAbierto(null);
    ponerSenalado(null);
    /* Y la memoria del cartel con él: lo que se leía era de la mesa anterior, toque incluido. */
    memoriaDelCartel.current = EL_CARTEL_EN_BLANCO;
  }, []);

  /*
   * AL CAMBIAR LA REVISIÓN SE SUELTA TODO. Lo que estaba abierto se abrió mirando la mesa
   * anterior: las obras de esa casilla pueden haber dejado de ser legales, y el trato que se
   * estaba leyendo puede haberse aceptado ya.
   */
  useEffect(() => {
    soltarTodo();
  }, [puesta.rev, soltarTodo]);

  const cerrarLoAbierto = useCallback(() => {
    ponerAbierto(null);
    elRecuadro.current?.focus();
  }, []);
  /** Abrir una caja sobre el lienzo: cierra la anterior Y el cajón, para que el tablero se vea. */
  const abrir = useCallback((que: LoAbierto) => {
    ponerAMano(false);
    ponerSenalado(null);
    /* El cartel se apaga y la memoria lo espeja: si no, diría que se lee lo que ya no se ve. */
    memoriaDelCartel.current = trasElSenalado(memoriaDelCartel.current, null);
    ponerAbierto(que);
  }, []);
  const cerrarElCajon = useCallback(() => {
    ponerAMano(false);
    laFichaDeLaCinta.current?.focus();
  }, []);
  const elCajon = useRef<HTMLDivElement | null>(null);

  // -------------------------------------------------------------------------
  // El recuadro: se mide, y de paso se avisa de dónde ha quedado
  // -------------------------------------------------------------------------

  const [lienzo, ponerLienzo] = useState({ ancho: 0, alto: 0 });
  /*
   * EL CARTEL DEL PIE SE PARA ANTES DE LA CAJA DEL BURGO: su canto derecho queda 12 puntos a la
   * izquierda de lo que ocupa la caja con los dados en el aire y el reloj, medido con la misma cuenta
   * con la que la escena la posa. Sin lienzo medido —en Node, o antes del primer `ResizeObserver`— va
   * como iba.
   *
   * Y SI AL LADO NO CABE UN CARTEL QUE SE LEA, va a lo ancho como iba, por encima de la caja. Pasa en
   * los lienzos de menos de 600 puntos, donde la caja compacta ocupa casi todo el pie: apretado en lo
   * que queda, el cartel salía de una palabra por renglón. Tapar la caja mientras se lee una casilla
   * cuesta poco —el cartel se va solo y no coge el toque, así que los dados se siguen tirando—.
   */
  const sitioDelCartel = useMemo((): CSSProperties => {
    if (lienzo.ancho <= 0 || lienzo.alto <= 0) return EL_SITIO_DEL_CARTEL;
    const caja = poseDeLaBandeja(lienzo.ancho, lienzo.alto, FOV, SITIO_DE_LA_BANDEJA).rectangulo;
    const derecha = Math.ceil(lienzo.ancho - caja.x0 + SITIO_DE_LA_BANDEJA.margen);
    if (lienzo.ancho - derecha - SITIO_DE_LA_BANDEJA.margen < ANCHO_MINIMO_DEL_CARTEL_AL_LADO) return EL_SITIO_DEL_CARTEL;
    /*
     * EN UNA PANTALLA BAJA Y APAISADA las cámaras bajan al pie de la izquierda (ver la hoja, 27-sep-2026):
     * el cartel sube por encima de ellas —su tira de 2,75rem y medio rem de aire— para no taparlas.
     */
    const abajo = lienzo.alto < ALTO_DE_LA_PANTALLA_BAJA && lienzo.ancho > lienzo.alto ? { bottom: 'calc(0.75rem + 2.75rem + 0.5rem)' } : null;
    return { ...EL_SITIO_DEL_CARTEL, right: `${String(derecha)}px`, ...abajo };
  }, [lienzo.ancho, lienzo.alto]);
  const [raizDeLaLetra, ponerRaizDeLaLetra] = useState(RAIZ_DE_LA_CASA);
  const observadorDelRecuadro = useRef<ResizeObserver | null>(null);
  const medirElRecuadro = useCallback(
    (recuadro: HTMLDivElement | null) => {
      elRecuadro.current = recuadro;
      /*
       * PRIMERO SE AVISA DEL DESTINO DEL FOCO, Y ANTES DE LA GUARDA DE `ResizeObserver`.
       * Detrás de ella el aviso se perdería exactamente donde más falta hace —un navegador
       * viejo, una prueba en Node— y el foco volvería a caer al `body` al sentarse sin que
       * nada fallara.
       */
      foco?.(recuadro);
      if (recuadro === null || typeof ResizeObserver === 'undefined') return;
      const mide = (): void => {
        ponerLienzo((antes) => {
          const ancho = recuadro.clientWidth;
          const alto = recuadro.clientHeight;
          return antes.ancho === ancho && antes.alto === alto ? antes : { ancho, alto };
        });
        ponerRaizDeLaLetra((antes) => {
          const ahora = raizDelNavegador();
          return antes === ahora ? antes : ahora;
        });
      };
      mide();
      const observador = new ResizeObserver(mide);
      observador.observe(recuadro);
      if (typeof document !== 'undefined') observador.observe(document.documentElement);
      /* Los `ref` de función no tienen limpieza: se suelta en el efecto de abajo. */
      observadorDelRecuadro.current = observador;
    },
    [foco],
  );
  useEffect(() => () => observadorDelRecuadro.current?.disconnect(), []);

  // -------------------------------------------------------------------------
  // Los modelos, la calidad y el fallo
  // -------------------------------------------------------------------------

  const cabeEnTres = seVeEnTres(vista);
  const { modelos, fallo: falloDelModelo } = usarLosModelos(cabeEnTres, traerElCatalogoDelBurgo);
  const [falloDelLienzo, ponerFalloDelLienzo] = useState<string | null>(null);
  const alFallarElLienzo = useCallback((motivo: string) => {
    ponerFalloDelLienzo(motivo);
  }, []);
  const fallo = falloDelModelo ?? falloDelLienzo;

  /*
   * LA CALIDAD LA JUZGA `escenas/embarcadero/calidad.ts` CON LAS MUESTRAS DE LA ESCENA, y no
   * un `if` sobre el aparato: los dos clientes bajan a `sobria` con el mismo umbral y con la
   * misma cuenta. Las muestras van en una `ref` porque llegan una por segundo y no pintan
   * nada; lo único que es estado es la calidad, que sí cambia lo que se monta.
   */
  const muestras = useRef<MuestraDelHilo[]>([]);
  const [calidad, ponerCalidad] = useState<Calidad>('plena');
  const alMedir = useCallback((m: { triangulos: number; llamadas: number; ms: number; fotogramas: number }) => {
    const lista = [...muestras.current, { ms: m.ms, fotogramas: m.fotogramas }].slice(-MUESTRAS_QUE_SE_GUARDAN);
    muestras.current = lista;
    const juicio = juzgarCalidad(lista);
    if (juicio !== null) ponerCalidad((antes) => (antes === juicio ? antes : juicio));
  }, []);

  // -------------------------------------------------------------------------
  // La cámara: dónde se está mirando y cómo se vuelve
  // -------------------------------------------------------------------------

  /*
   * VA EN UNA `ref` Y NO EN EL ESTADO: mover la mirada son sesenta cambios por segundo
   * mientras se arrastra, y pasarlos por React repintaría el mueble entero sesenta veces por
   * segundo para mover una cámara. Lo único que SÍ es estado es si se está en la pose de
   * salida, porque eso es lo que enciende y apaga un botón.
   */
  const cercania = useRef<Cercania>(CERCANIA_DE_SALIDA);
  const laPoseDeSalida = useRef<Cercania>(CERCANIA_DE_SALIDA);
  const [alPrincipio, ponerAlPrincipio] = useState(true);
  const eraAlPrincipio = useRef(true);
  /*
   * SEGUIR AL QUE MUEVE: se apaga con cualquier gesto y vuelve con la revisión siguiente
   * (§5.6). El apunte en `ref` es el que lee el manejador de la cámara sesenta veces por
   * segundo; el estado es lo que le llega a la escena por props.
   */
  const [siguiendo, ponerSiguiendo] = useState(true);
  const seguiaAntes = useRef(true);
  const alAcercarse = useCallback((nueva: Cercania): void => {
    cercania.current = nueva;
    if (seguiaAntes.current) {
      seguiaAntes.current = false;
      ponerSiguiendo(false);
    }
    const ahora = laMismaPose(nueva, laPoseDeSalida.current);
    if (ahora === eraAlPrincipio.current) return;
    eraAlPrincipio.current = ahora;
    ponerAlPrincipio(ahora);
  }, []);
  useEffect(() => {
    seguiaAntes.current = true;
    ponerSiguiendo(true);
  }, [puesta.rev]);
  /*
   * LA POSE DE SALIDA DEPENDE DE LA FORMA DEL LIENZO —`poseDeSalida` retira el ojo en
   * apaisado para que las cuatro esquinas del anillo quepan—, así que se recalcula al medir.
   * Y sólo se recoloca la cámara de quien NO ha tocado nada: a quien está mirando su barrio
   * de cerca, estirar la ventana no debería moverle la vista.
   *
   * Y NO SE ESCONDE DETRÁS DE LA CAJA DEL BURGO: desde que la caja es grande, la de siempre dejaba
   * la esquina de SALIDA detrás de ella, que es donde empiezan todos los peones. La mirada se corre
   * lo justo (`poseDeSalidaAlLadoDeLaCaja`), medido con la misma pose con la que la escena la posa.
   */
  /*
   * ═══ Y TAMPOCO DETRÁS DE LA CINTA NI DE LAS CÁMARAS (27-sep-2026) ═══
   *
   * Medido con el fotógrafo (`docs/PANTALLAS.md`): en un móvil tumbado y en un portátil la esquina de
   * arriba del anillo quedaba debajo de la cinta, y su canto izquierdo debajo de «La mesa · Al hombro ·
   * Sus ojos». Así que se miden en la página —con el mundo ya puesto, que es cuando hay cámaras— y van
   * de `estorbos` (`lugaresQueTapanElAnillo`).
   */
  const hayMundo = modelos !== null;
  useEffect(() => {
    const estorbos = lienzo.ancho > 0 && lienzo.alto > 0 ? lugaresQueTapanElAnillo(elRecuadro.current, raizDeLaLetra) : [];
    const nueva =
      lienzo.ancho > 0 && lienzo.alto > 0
        ? poseDeSalidaAlLadoDeLaCaja({ ancho: lienzo.ancho, alto: lienzo.alto, franjaInferior: 0 }, poseDeLaBandeja(lienzo.ancho, lienzo.alto, FOV, SITIO_DE_LA_BANDEJA).rectangulo, estorbos)
        : CERCANIA_DE_SALIDA;
    laPoseDeSalida.current = nueva;
    if (eraAlPrincipio.current) cercania.current = nueva;
  }, [lienzo.ancho, lienzo.alto, hayMundo, raizDeLaLetra]);
  const volverAlBurgoEntero = useCallback((): void => {
    alAcercarse(laPoseDeSalida.current);
    /* Y el seguimiento se apaga hasta el turno siguiente: quien pide ver el burgo entero lo quiere quieto. */
    seguiaAntes.current = false;
    ponerSiguiendo(false);
  }, [alAcercarse]);

  /*
   * ═══ A PIE: DESDE DÓNDE SE MIRA, Y LA CÁMARA DE MESA QUIETA MIENTRAS TANTO ═══
   *
   * `modo` es de la pantalla y no viaja: bajar a andar no es una jugada. A pie, `CamaraAerea` sigue
   * montada —y delante de la escena, que es lo que hace que el seguimiento vaya al día— pero
   * CALLADA (`callada={aPie}`): no mueve la cámara de mesa por detrás, y al subir a la mesa está
   * exactamente donde se dejó. Callada sigue defendiendo la página: ver la cabecera.
   */
  const [modo, ponerModo] = useState<ModoDelBurgo>('mesa');
  const aPie = modo !== 'mesa';
  /*
   * ═══ LA MESA RECOGIDA: LA CAJA Y EL RELOJ FUERA DE LA VISTA, A PIE ═══
   *
   * Miguel, andando por el Burgo (27-sep-2026): «no hay botón para esconder la mesa con los dados y el
   * reloj». La caja va pegada a la cámara, y a ras de calle es media pantalla de nogal delante. El botón
   * es el de Riberas con sus mismas palabras (`RECOGER_LA_MESA`, `SACAR_LA_MESA`), y sale A PIE, que es
   * donde estorba: en la mesa la caja es parte del tablero. Recogida, lo imprescindible sigue a mano:
   * TIRAR vuelve al carril (la criba recibe `null` en vez de los dados, como el naipe del mazo de
   * Riberas), pasar ya vive en el carril y el dinero en la ficha de la cinta. Volver a la mesa la saca.
   * Es de la pantalla y no viaja, como `modo`.
   */
  const [mesaRecogida, ponerMesaRecogida] = useState(false);
  const recogida = aPie && mesaRecogida;
  useEffect(() => {
    if (!aPie) ponerMesaRecogida(false);
  }, [aPie]);
  const camara = useMemo((): ModoDeCamara => (modo === 'mesa' ? { modo: 'mesa' } : { modo, asiento: yo ?? '' }), [modo, yo]);

  /*
   * ═══ EL CANAL, SÓLO EN UNA MESA DE BOTAS ═══
   *
   * Lo mismo que en Las Lindes. Sin llave, sin asiento o sin dirección (sin `location`, que es como
   * se pinta en `verify:escritorio`) no hay canal: no hay con qué decir `hola`. Los asientos llegan en
   * cada vuelta del sondeo, pero la escena sólo reabre el socket si cambian la dirección, la llave o
   * el asiento. Y el color de cada uno es el de su peón, el que la traducción ya puso en las figuras.
   */
  const esBotas = esMesaDeBotas(puesta);
  const [estadoDelCanal, ponerEstadoDelCanal] = useState<EstadoDelCanal | null>(null);
  const llaveDelAsiento = mesa.llave ?? null;
  const figurasDeLaMesa = datos?.figuras;
  const canal = useMemo<CanalDeBotas | undefined>(() => {
    const url = esBotas ? direccionDelCanal(puesta.codigo) : null;
    if (url === null || llaveDelAsiento === null || yo === null) return undefined;
    return {
      url,
      llave: llaveDelAsiento,
      yo,
      asientos: asientosQueAndanPorElBurgo(puesta.asientos, figurasDeLaMesa ?? []),
      alCambiar: ponerEstadoDelCanal,
    };
  }, [esBotas, figurasDeLaMesa, llaveDelAsiento, puesta.asientos, puesta.codigo, yo]);
  /* Una mesa de botas se empieza al hombro: es a lo que se viene. Una vez por mesa; luego mandan los botones y las teclas. */
  useEffect(() => {
    if (esBotas) ponerModo('hombro');
  }, [esBotas, puesta.codigo]);

  /*
   * ═══ EN UN TELÉFONO, LA PALANCA ═══
   *
   * La referencia que la escena lee en su bucle (`mandos`) y que escriben los mandos táctiles
   * (`mandos-tactiles.tsx`), sólo a pie y sólo si el aparato se toca. Y el aviso al recoger dinero
   * por la calle, que la escena cuenta por `alRecoger` (`a-pie-en-botas.tsx`).
   */
  const tactil = usarAparatoTactil();
  /* A pie, el teléfono de lado: pantalla completa y bloqueo, o el aviso «Gira el teléfono». Ver `a-pie-apaisado.tsx`. */
  const avisoDeGirar = usarAPieApaisado(aPie);
  const mandos = useRef<MandosDeFuera>(SIN_MANDOS_DE_FUERA);
  const { alRecoger, aviso: avisoDelHallazgo } = usarElAvisoDelHallazgo('burgo', puesta.asientos);
  /* A pie y con el dedo, la caja se aparta de la palanca y de los botones: ver `sitioDeLaBandejaAPie`. */
  const conLosMandos = tactil && aPie;
  const sitioDeLaBandeja = useMemo(
    (): SitioDeLaBandeja =>
      conLosMandos && lienzo.ancho > 0 && lienzo.alto > 0 ? sitioDeLaBandejaAPie(lienzo.ancho, lienzo.alto, raizDeLaLetra) : SITIO_DE_LA_BANDEJA,
    [conLosMandos, lienzo.ancho, lienzo.alto, raizDeLaLetra],
  );

  // -------------------------------------------------------------------------
  // Las cribas: qué enseña la escena, qué la caja, qué el carril, qué la hoja
  // -------------------------------------------------------------------------

  /*
   * ═══ CON MUNDO O SIN MUNDO, Y ES LO QUE DECIDE LAS CRIBAS ═══
   *
   * `opcionesFueraDelTablero` recibe LOS OBJETOS que se pintan y no interruptores: quita
   * TIRAR cuando hay asa de dados, quita una obra cuando su casilla está encendida en el
   * anillo, y quita lo que la hoja, la caja de los tratos y el carril ya enseñan. Y el
   * reparto no es el mismo con mundo que sin él, así que se le pasa lo que de verdad hay en
   * pantalla:
   *
   *   · EL ANILLO Y LOS DADOS sólo existen con mundo. Pasárselos sin mirarlo —en Node,
   *     mientras el `.glb` viaja, o en un navegador sin WebGL— quitaría TIRAR y las obras de
   *     los botones sin que hubiera un dado ni una casilla que tocar.
   *   · LA HOJA se pinta cuando el CAJÓN ESTÁ ABIERTO, y sólo entonces.
   *   · LA CAJA DE LOS TRATOS y EL CARRIL se pintan siempre que no estén vacíos, con mundo y
   *     sin él: son marcado, no `<canvas>`, así que están ahí también bajo el telón.
   */
  const conMundo = typeof window !== 'undefined' && modelos !== null;
  /* Las teclas 1, 2 y 3 cambian de cámara, como en Las Lindes; sólo con mundo, que sin él no hay adónde bajar. */
  useEffect(() => {
    if (!conMundo) return undefined;
    const oye = (e: KeyboardEvent): void => {
      const cual = camaraDeLaTecla(e, document.activeElement);
      if (cual === null) return;
      e.preventDefault();
      ponerModo(cual);
    };
    document.addEventListener('keydown', oye);
    return () => {
      document.removeEventListener('keydown', oye);
    };
  }, [conMundo]);
  const dados = useMemo((): DadosEnTres<Opcion> | null => dadosEnTres(vista, yo, opciones), [vista, yo, opciones]);
  /* 1. La caja de los tratos. No depende de nadie. */
  const pregon = useMemo(() => pregonDelBurgo(vista, yo, opciones), [vista, yo, opciones]);
  /* 2. El carril de lo que puedo hacer ahora mismo. Tampoco. */
  const delMomento = useMemo(() => carrilDelBurgo(vista, yo, opciones), [vista, yo, opciones]);
  const hayCarrilDelMomento = delMomento.length > 0;
  /* 3. La hoja, que suelta los botones de las secciones que los dos de arriba ya pintan. */
  const hoja = useMemo(
    () => hojaEnTres(vista, yo, opciones, pregon, hayCarrilDelMomento ? delMomento : null),
    [vista, yo, opciones, pregon, delMomento, hayCarrilDelMomento],
  );

  /*
   * EL CAJÓN SE ABRE SOLO CUANDO EL JUEGO ESPERA UNA RESPUESTA QUE SÓLO VIVE AQUÍ DENTRO.
   *
   * Hoy eso es exactamente la subasta: las pujas fijas y el pasar son de la sección «La
   * subasta», y la puja libre es una PUERTA que sólo se compone con su campo. Se decide EN EL
   * RENDER y no en un efecto, y eso no es estilo: la criba de más abajo mira `cajonAbierto`,
   * así que si la apertura llegara un fotograma tarde habría un render con las pujas sin sitio
   * — y en Node, donde los efectos no corren y donde `verify:escritorio` cuenta lo que hay en
   * el árbol, no llegaría nunca.
   */
  const elJuegoPideLaHoja = hoja.puja !== null && hoja.puja.meToca;
  const cajonAbierto = aMano === null ? elJuegoPideLaHoja : aMano;
  useEffect(() => {
    /* Al cambiar lo que el juego pide, se vuelve a «decide el juego»: una vez por subasta, no una por sondeo. */
    ponerAMano(null);
  }, [elJuegoPideLaHoja]);

  /* 4. Y la criba, que es la única que mira a las otras y por eso va la última. */
  const fuera = useMemo(
    () =>
      opcionesFueraDelTablero(
        opciones,
        conMundo ? datos : null,
        conMundo && !recogida ? dados : null,
        cajonAbierto ? hoja : null,
        pregon,
        hayCarrilDelMomento ? delMomento : null,
      ),
    [opciones, conMundo, datos, dados, recogida, hoja, cajonAbierto, pregon, delMomento, hayCarrilDelMomento],
  );

  /*
   * ═══ LO QUE LA CRIBA DEJA FUERA TERMINA EL CARRIL, Y ASÍ NO QUEDA NADA EN FLUJO ═══
   *
   * `glifosDelCarrilDelBurgo` le pone forma a CUALQUIER lista —la traducción lo exporta
   * justamente para eso— sin decidir qué entra: misma longitud, mismo orden, y la opción por
   * identidad. Como `fuera` se compone DESPUÉS de la escena, de la caja, del carril y de la
   * hoja, estos cuadrados son por construcción los que no tienen sitio en ninguna otra parte.
   *
   * Y LO IRREVERSIBLE VA AL FINAL. La quiebra llega entre lo del momento, o sea en medio de
   * la fila, y un cuadrado de 44 puntos entre otros es demasiado fácil de rozar cuando lo que
   * hay al lado es «pasar el turno». Al final se roza mucho menos, el sitio es estable (no se
   * mueve según cuántas opciones haya) y además se pregunta antes de mandarlo.
   */
  const cuadrados = useMemo((): readonly GlifoDelCarrilDelBurgo<Opcion>[] => {
    const todos = [...delMomento, ...glifosDelCarrilDelBurgo(vista, yo, fuera)];
    const corrientes = todos.filter((g) => !seConfirmaAntes(g.opcion));
    const alFinal = todos.filter((g) => seConfirmaAntes(g.opcion));
    return [...corrientes, ...alFinal];
  }, [delMomento, vista, yo, fuera]);

  /*
   * ═══ LAS OBRAS QUE SÓLO TIENE EL ANILLO, PARA QUIEN NO PUEDE HACER EL GESTO ═══
   *
   * Con el mundo montado, la criba quita toda obra cuya casilla esté encendida —la marca del
   * acento ya la ofrece— y la hoja recoge las de MIS títulos en sus fichas. Pero COMPRAR y
   * SACAR A SUBASTA no son de un título mío todavía, así que no tienen ficha: se les quitaba
   * el botón y no se les daba ninguno. O sea que comprar —el movimiento que decide la partida
   * entera— sólo se podía hacer con el ratón sobre el anillo; con teclado, con lector o con
   * el `.glb` a medio cargar, no había forma, y no fallaba nada.
   *
   * Desde el 16-sep-2026 la compra vive además en «Ahora» y en el carril (la sube la
   * traducción, `loDelMomento`), así que con los cuadrados puestos esto ya no la devuelve y
   * no se pinta gemelo para ella: su botón está a la vista. El gemelo queda para lo que
   * ningún mueble recoja.
   *
   * `obrasSoloEnElAnillo` devuelve exactamente ésas, mirando lo que la hoja Y EL CARRIL
   * pintan de verdad (el cuarto parámetro: sin él pediría gemelos para las obras del apuro,
   * que ya tienen su cuadrado). Se les pinta un botón fuera de la vista con `clip-path`, como
   * el de TIRAR: no es un segundo botón, es el mismo dicho para quien no puede hacer el gesto.
   */
  const soloEnElAnillo = useMemo(
    () => obrasSoloEnElAnillo(opciones, conMundo ? datos : null, cajonAbierto ? hoja : null, cuadrados),
    [opciones, conMundo, datos, hoja, cajonAbierto, cuadrados],
  );

  /*
   * ═══ LA SEMILLA DEL DECORADO NO SE CALCULA AQUÍ: SE LE PASA EL CÓDIGO ═══
   *
   * El §6.2 dice `semillaDelCodigo(puesta.codigo)` y el contrato de la escena pide el CÓDIGO
   * (`PropsDelBurgo.codigo`), que es quien la siembra por dentro (`Burgo.tsx`, con la misma
   * función). Calcularla también aquí sería un segundo sitio del que sale el mismo entero, y
   * el día que uno de los dos cambiara de función el campo y las nubes saldrían distintos en
   * cada cliente sin que nada fallara. Se le da el código y ya está. Es el mismo entero que
   * la cala del Muelle, así que quien viene de zarpar ve el mismo mundo.
   */
  const aQuienSigue = useMemo(() => camaraSigueA(vista), [vista]);

  /*
   * QUÉ SECCIÓN DE LA HOJA ESTÁ ABIERTA, con memoria en el bolsillo: por MESA (el código) y por
   * VENTANA (la silla), que son los dos tramos que la llave necesita y que no salen de la
   * partida. El arcade es el del MANIFIESTO y no una cadena escrita aquí: este pintor se elige
   * por tabla, así que el día que sirva a otro juego la llave se muda sola con él.
   */
  const { abierta, alAbrir } = usarLaSeccionAbierta(
    manifiesto.id,
    laSillaDeEstaVentana(),
    puesta.codigo,
    hoja.abre,
    hoja.cinta.espera,
    hoja.cinta.meToca,
  );

  // -------------------------------------------------------------------------
  // Lo que se manda
  // -------------------------------------------------------------------------

  const alElegir = useCallback(
    (movimiento: MovimientoDeclarado) => {
      if (quieto) return;
      void mover(movimiento);
    },
    [mover, quieto],
  );

  /** Mandar una opción entera, preguntando antes si no tiene vuelta atrás. */
  const alPulsarUnaOpcion = useCallback(
    (o: Opcion) => {
      if (seConfirmaAntes(o)) {
        abrir({ que: 'confirmar', opcion: o });
        return;
      }
      alElegir({ tipo: o.tipo, carga: o.carga });
    },
    [abrir, alElegir],
  );

  /*
   * AL TOCAR UNA CASILLA, Y SON TRES CAMINOS Y NO DOS.
   *
   * Con UNA obra se manda, que es el atajo de siempre. Con VARIAS se abre la tarjeta entera
   * con sus botones, porque hay que decidir. Y con NINGUNA —que es la mayoría de los toques—
   * NO se abre nada: se SEÑALA, y el cartel del pie dice el nombre, el barrio, el precio, el
   * estado y la renta de hoy, y se va solo.
   *
   * ═══ POR QUÉ ESE TERCER CAMINO, CON EL NÚMERO DE MIGUEL ═══
   *
   * «Hoy para leer eso hay que TOCAR la casilla y abrir un modal, y eso se hace veinte veces
   * por turno.» Veinte modales por turno son veinte velos, veinte trampas de foco y veinte
   * cierres para leer dos renglones. Lo que hace falta es un cartel, y un cartel de verdad
   * aparece AL POSAR el cursor.
   *
   * ═══ Y AHORA EL POSAR ESTÁ ENCHUFADO, ASÍ QUE ESTE TOQUE ES SÓLO PARA EL DEDO ═══
   *
   * Cuando esto se escribió, la escena no publicaba ningún aviso de señalado y el cartel se
   * resolvía con lo único que había: el primer toque señalaba y el segundo abría. O sea que con
   * ratón las veinte lecturas por turno seguían siendo veinte CLICS, que es el encargo sin
   * cumplir. Hoy `PropsDelBurgo.alSenalarCasilla` existe y este pintor se lo pasa a `<Burgo>`,
   * así que con ratón se lee POSÁNDOSE y sin pulsar nada, y un clic sobre lo que ya se está
   * leyendo abre la tarjeta a la primera.
   *
   * Con el dedo no hay cursor que posar, y ahí el camino de los dos toques se queda tal cual:
   * el primero lee y el segundo abre. Cuál de los dos aparatos es no se pregunta con un `if`
   * sobre el puntero —esta pantalla no ve el suceso— sino con lo que la escena manda y en qué
   * orden, que es el contrato entero de `LaMemoriaDelCartel`: ahí está el porqué, con los dos
   * fallos que cada mitad evita.
   */
  const alTocarCasilla = useCallback(
    (indice: number) => {
      const obras = obraPosibleEnCasilla(vista, yo, opciones, indice);
      if (obras.length === 1 && !quieto) {
        const sola = obras[0] as Opcion;
        void mover({ tipo: sola.tipo, carga: sola.carga });
        return;
      }
      if (obras.length === 0) {
        const paso = loQueHaceElToque(memoriaDelCartel.current, indice);
        memoriaDelCartel.current = paso.memoria;
        if (paso.que === 'senala') {
          senalar(indice);
          return;
        }
      }
      abrir({ que: 'casilla', casilla: indice });
    },
    [vista, yo, opciones, quieto, mover, senalar, abrir],
  );

  const alTocarFigura = useCallback(
    (asiento: string) => {
      abrir({ que: 'jugador', asiento });
    },
    [abrir],
  );

  const alTocarLosDados = useCallback((): Promise<'hecho' | 'rechazado' | 'sin-red'> => {
    if (quieto) return Promise.resolve('rechazado');
    const tirar = tirarEnTres(opciones);
    if (tirar === null) return Promise.resolve('rechazado');
    return mover({ tipo: tirar.tipo, carga: tirar.carga });
  }, [quieto, opciones, mover]);
  /* Tocar el reloj de arena de la caja del Burgo: la opción de pasar, la misma que el botón del carril. */
  const alPasarElTurno = useCallback((): Promise<'hecho' | 'rechazado' | 'sin-red'> => {
    if (quieto) return Promise.resolve('rechazado');
    const pasar = pasarEnTres(opciones);
    if (pasar === null) return Promise.resolve('rechazado');
    return mover({ tipo: pasar.tipo, carga: pasar.carga });
  }, [quieto, opciones, mover]);

  // -------------------------------------------------------------------------
  // El reloj de la cinta
  // -------------------------------------------------------------------------

  /*
   * LA CUENTA ATRÁS DEL PLAZO, en la línea de estado y no sólo dentro del cajón. Es el plazo
   * de LA MESA —`venceEn` y `terminada`, que ya viajaban por el cable— y no del juego: el
   * Burgo no sabe nada de él. Late por CAMBIO DE RÓTULO y no una vez por segundo, que es lo
   * que `msHastaQueCambieElRotulo` decide.
   */
  const venceEn = puesta.terminada ? null : puesta.venceEn;
  /*
   * EL LATIDO ES TAMBIÉN LA DEPENDENCIA, y ésa es la mitad que se olvida: con un
   * `setTimeout` en vez de un `setInterval` hay que volver a programar la siguiente espera
   * DESPUÉS de cada repintado. Sin `latido` en la lista, el efecto se dispararía una sola vez
   * y el reloj se quedaría clavado en el primer tramo, que se ve como un reloj parado y no
   * como un fallo del temporizador.
   */
  const [latido, latir] = useState(0);
  useEffect(() => {
    if (venceEn === null) return undefined;
    const espera = msHastaQueCambieElRotulo(venceEn - Date.now());
    if (!Number.isFinite(espera)) return undefined;
    const t = setTimeout(() => {
      latir((n) => n + 1);
    }, espera);
    return () => {
      clearTimeout(t);
    };
  }, [venceEn, latido]);
  const elReloj =
    venceEn === null
      ? null
      : {
          corto: cuantoQuedaEnLaCinta(venceEn - Date.now()),
          entero: cuantoQueda(venceEn - Date.now()),
          aprieta: elPlazoAprieta(venceEn - Date.now()),
        };

  /*
   * EL RELOJ DE ARENA DE LA CAJA DEL BURGO, el de Riberas: lo que queda de turno, y tocarlo lo pasa. Lleva
   * los dos instantes de la MESA —los mismos de la cuenta atrás de la cinta— y la escena saca la
   * fracción en su `useFrame`; la vuelta es `turnosAbiertos`, que lo voltea a la vez en todas las
   * pantallas. El botón de pasar del carril se queda: el reloj es otra forma de llegar a lo mismo.
   */
  const relojDeArena = useMemo(
    (): RelojDeLaMesa => ({
      desde: puesta.turnoDesde,
      venceEn,
      disponible: !quieto && pasarEnTres(opciones) !== null,
      vuelta: vueltaDelReloj(vista),
    }),
    [puesta.turnoDesde, venceEn, quieto, opciones, vista],
  );

  const anchoDelCajon = useMemo(
    () => ({ ancho: Math.min(lienzo.ancho, Math.round(ANCHO_DEL_CAJON_EN_RAICES * raizDeLaLetra)) }),
    [lienzo.ancho, raizDeLaLetra],
  );

  /* La trampa del cajón se arma sólo cuando el cajón es lo de encima: si hay una caja abierta, no lo es. */
  usarLaTrampaDeFoco(cajonAbierto && abierto === null, elCajon, cerrarElCajon);

  // -------------------------------------------------------------------------
  // Las salidas
  // -------------------------------------------------------------------------

  /*
   * SIN CARAS NO HAY ANILLO QUE PINTAR: sólo lo que se puede hacer. Es la mesa reunida, donde
   * lo único que ofrece el juego es «Empezar». Se pregunta al TABLERO DECLARADO y no a
   * `datos`: ver la cabecera, «sin caras» no es «sin mundo».
   */
  if (tablero.caras.length === 0) {
    return <Formulario opciones={opciones} alElegir={mover} quieto={quieto} titulo={TITULO_DE_LO_QUE_SE_HACE} />;
  }

  /*
   * EL RESPALDO. Si la mesa no cabe en los colores del anillo, si el modelo no llegó o si el
   * lienzo reventó, se pinta el retablo de siempre, entero, y se dice por qué en letra chica.
   * No es una pantalla de error: es la mesa jugable de siempre, y con el retablo del Burgo
   * —cuatro tiras de diez casillas que son MAPA— se juega por acciones y paneles.
   */
  const porQueElRetablo = !cabeEnTres
    ? 'Sois más de los que el burgo en tres dimensiones sabe pintar: se juega sobre el tablero dibujado.'
    : fallo !== null
      ? `El burgo en tres dimensiones no ha arrancado: ${fallo}. Se juega sobre el tablero dibujado.`
      : datos === null
        ? 'La mesa trae tablero pero no un burgo que pintar: se juega sobre el tablero dibujado.'
        : null;
  if (porQueElRetablo !== null || datos === null) {
    const sueltas = opcionesSueltas(tablero, opciones);
    return (
      <>
        <p className="letra-chica burgo-sin-mundo">{porQueElRetablo}</p>
        <Retablo tablero={tablero} alTocar={mover} quieto={quieto} />
        <AccionesDelTablero tablero={tablero} alTocar={mover} quieto={quieto} />
        {/* Lo que decide es lo PINTABLE y no lo que llega: ver `hayAlgoQuePintar`. */}
        {hayAlgoQuePintar(sueltas) ? (
          <Formulario opciones={sueltas} alElegir={mover} quieto={quieto} titulo="Y además puedes" atajos={false} />
        ) : null}
        {/*
          LAS DOS PUERTAS, que es lo único que aquí faltaba: proponer un trato y pujar una
          cifra libre. No pintan ni un movimiento —una puerta mandada tal cual no juega—, así
          que la partición de esta pantalla, que ya estaba comprada, no se toca.
        */}
        <LasPuertasDelBurgo
          hoja={hojaEnTres(vista, yo, opciones)}
          vista={vista}
          yo={yo}
          quieto={quieto}
          alElegir={alElegir}
        />
        <LaCronicaDelBurgo cronica={cronica} />
      </>
    );
  }

  /* Lo que dice la línea de estado, compuesto una sola vez. Ver `loQueDiceLaCinta`. */
  const laFraseDeLaCinta = loQueDiceLaCinta(hoja.cinta.turno, tablero.aviso);

  /* La ficha del jugador que se esté mirando, y el componedor atado a él si el juego lo ofrece. */
  const elJugadorAbierto = abierto?.que === 'jugador' ? fichaDeJugador(vista, abierto.asiento, yo, opciones) : null;
  const elTratoAbierto: TiraDelTrato<Opcion> | null =
    abierto?.que === 'trato' && pregon !== null
      ? ([...pregon.paraContestar, ...pregon.mios].find((t) => t.id === abierto.id) ?? null)
      : null;
  const elComponedor = abierto?.que === 'componedor' ? tratoEnTres(vista, yo, opciones) : null;
  const laCasillaAbierta = abierto?.que === 'casilla' ? fichaDeCasilla(vista, abierto.casilla, yo, opciones) : null;
  const elCartel = senalado === null ? [] : cartelDeCasilla(vista, senalado.casilla).frases;

  return (
    /*
      A PIE, UNA CLASE MÁS: en la mesa y en una pantalla baja las cámaras bajan al pie de la izquierda
      (ver `.burgo-en-tres:not(.burgo-andando)` en la hoja); a pie ahí va la palanca, y se quedan arriba.
    */
    <div className={aPie ? 'burgo-en-tres burgo-andando' : 'burgo-en-tres'}>
      {/*
        ═══ EL RECUADRO, QUE ES DONDE ATERRIZA EL FOCO AL SENTARSE Y DONDE VIVE TODO ═══

        Con la página de pie el `<h1>` de la mesa sale del flujo, así que el destino del
        efecto de `sala.tsx` se muda aquí. `tabIndex={-1}` no lo mete en el orden del
        tabulador: sólo lo hace capaz de recibir un foco que se le lleva. Y con `aria-label`,
        porque un `<div>` enfocado y sin nombre se anuncia como nada; el nombre lo pone el
        MANIFIESTO y no una cadena escrita aquí, para que el día que este pintor sirva a otro
        arcade no siga nombrando al Burgo.
      */}
      <div
        className={
          quieto
            ? `${RECUADRO_DEL_LIENZO} ${LIENZO_PROPIO} burgo-lienzo-quieto`
            : `${RECUADRO_DEL_LIENZO} ${LIENZO_PROPIO}`
        }
        ref={medirElRecuadro}
        tabIndex={-1}
        role="group"
        aria-label={`${manifiesto.nombre}: la mesa en tres dimensiones`}
      >
        {/*
          ═══ LA CINTA (§6.3, sección 1) ═══

          Salir, el reloj del plazo, DE QUIÉN ES EL TURNO con el aviso del juego, el código de
          la mesa y mi dinero con mi color, en una tira sobre el lienzo y no en flujo por
          encima de él: así no le quita un punto de alto al anillo. Va FUERA de `conMundo` a
          propósito —mientras el modelo se descarga ya hay aviso que leer y ya hay hoja que
          abrir, y el telón tapa el tablero, no la partida—, y de paso esto se puede
          RENDERIZAR en Node, que es lo que permite que `verify:escritorio` la cuente contra
          una partida de verdad.
        */}
        <div className="burgo-cinta">
          {laSalida === undefined ? null : (
            <a className="burgo-cinta-salir" href={laSalida} aria-label={SALIR_DE_LA_MESA} title={SALIR_DE_LA_MESA}>
              <span aria-hidden="true">‹</span>
            </a>
          )}
          <PantallaCompleta />
          {/*
            EL RELOJ NO ES UNA SEGUNDA REGIÓN VIVA, que sería peor que no ponerlo: la frase de
            al lado ya es `aria-live="polite"`, y un reloj vivo a su lado anunciaría la cuenta
            atrás EN VOZ ALTA cada segundo del último minuto, encima del aviso del juego.
            `role="timer"` es exactamente esto: una región de tiempo que un lector encuentra y
            lee CUANDO QUIERE, y que no se anuncia sola.
          */}
          {elReloj === null ? null : (
            <span
              className={elReloj.aprieta ? 'burgo-cinta-reloj burgo-cinta-reloj-aprieta' : 'burgo-cinta-reloj'}
              role="timer"
              aria-label={elReloj.entero}
              title={elReloj.entero}
            >
              <span aria-hidden="true">{elReloj.corto}</span>
            </span>
          )}
          {/*
            LA FRASE, RECORTADA EN PANTALLA Y ENTERA EN EL ÁRBOL, y es LA ÚNICA región viva de
            esta pantalla: dos con el mismo texto se anuncian dos veces. Está SIEMPRE en el
            árbol, vacía cuando no hay nada que decir, porque una región viva que se monta a la
            vez que su texto no se anuncia en la mayoría de los lectores.

            ═══ Y AHORA DICE DE QUIÉN ES EL TURNO, QUE ESTABA CALCULADO Y NO SE PINTABA ═══

            `hoja.cinta.turno` («Turno de Ana · puja Bea») lo redacta la traducción, distingue
            el dueño del turno de quien tiene que contestar —que en el Burgo se separan a
            menudo (decisión 4)— y no salía en ninguna parte de esta pantalla: el aviso solo
            dice lo que acaba de pasar, no de quién se está esperando. Van los dos en el MISMO
            párrafo y no en dos, porque dos regiones vivas con el mismo cambio se anuncian dos
            veces, y porque la cinta es la línea de sus botones: lo que no cabe se recorta con
            puntos suspensivos y sigue entero en el `title` y en el árbol.

            Y SE COMPONE UNA VEZ, en `loQueDiceLaCinta`: escrita dos veces —una para el texto y
            otra para el `title`— era la clase de pareja en la que el día que una gane una
            palabra la otra no la tiene, y encima el aviso se lee entero al posarse.
          */}
          <p className="burgo-cinta-frase" aria-live="polite" title={laFraseDeLaCinta}>
            {laFraseDeLaCinta}
          </p>
          {/*
            EL CÓDIGO DE LA MESA, que es lo que se dicta por voz para que alguien se siente.
            Estaba sólo dentro del raíl, o sea detrás del «≡»: para decírselo a alguien por
            teléfono había que abrir un cajón modal encima del tablero.

            El nombre accesible lo deletrea con espacios y el `title` lo dice entero: un lector
            que lea «QWXYZ» de corrido dice una palabra que no se puede repetir al otro lado
            del teléfono. `letra-chica` es la clase de la casa para el color y el cuerpo, y
            `burgo-cinta-codigo` trae el hueco: ESTABA EN LÍNEA y ahora está en la hoja, porque
            un estilo en línea pesa (1,0,0,0) y era el único hueco de esta cinta que ninguna
            regla podía corregir sin `!important` —ni comparar su `flex` con el de sus cuatro
            vecinos, que es de lo que depende que un código dictado por teléfono no se recorte—.
          */}
          {lienzo.ancho > 0 && lienzo.ancho < ANCHO_DESDE_EL_QUE_CABE_EL_CODIGO ? null : (
            <span
              className="letra-chica burgo-cinta-codigo"
              aria-label={`Código de la mesa: ${puesta.codigo.split('').join(' ')}`}
              title={`Código de la mesa: ${puesta.codigo}`}
            >
              <span aria-hidden="true">{puesta.codigo}</span>
            </span>
          )}
          {/*
            LA FICHA DE MI DINERO: mi color y mis euros a la vista sin abrir nada, y la
            PUERTA del cajón. Para un mirón que no está sentado no hay color ni cifra, y
            entonces es «≡» a secas: no se inventa un cero que no es de nadie.
          */}
          <button
            type="button"
            ref={laFichaDeLaCinta}
            className="burgo-cinta-ficha"
            aria-expanded={cajonAbierto}
            aria-controls={nombreDelCajon}
            aria-label={
              hoja.cinta.miDinero.length === 0
                ? cajonAbierto
                  ? CERRAR_EL_CAJON
                  : ABRIR_EL_CAJON
                : `Tienes ${hoja.cinta.miDinero}. ${cajonAbierto ? CERRAR_EL_CAJON : ABRIR_EL_CAJON}`
            }
            onClick={() => {
              if (cajonAbierto) cerrarElCajon();
              else {
                ponerAbierto(null);
                ponerAMano(true);
              }
            }}
          >
            {hoja.cinta.miDinero.length === 0 ? (
              <span aria-hidden="true">≡</span>
            ) : (
              <>
                <span className="burgo-cinta-rail" style={{ background: hoja.cinta.miColor }} aria-hidden="true" />
                <span className="burgo-cinta-dinero" aria-hidden="true">
                  {hoja.cinta.miDinero}
                </span>
              </>
            )}
          </button>
        </div>

        {/*
          ═══ EL CARRIL: LO QUE PUEDO HACER AHORA MISMO, SIN ABRIR NADA ═══

          Una tira de cuadrados del suelo de toque colgada del pie de la cinta. Dentro va lo
          que criba `carrilDelBurgo` —los botones del momento y, en mi apuro, vender e
          hipotecar título a título— y detrás lo que la criba dejó fuera, que con el cajón
          cerrado son las pujas de una subasta. Vacío NO SE PINTA: una tira de vidrio sin nada
          dentro es una caja fantasma atravesada sobre el tablero, y por eso la pieza devuelve
          `null` sola.

          LO QUE SE MANDA ES LA OPCIÓN ENTERA, tal como vino: `{tipo, carga}` y nada montado
          aquí. Lo único que este cliente decide es si antes hay que preguntar.
        */}
        <CarrilDelLienzo
          nombre={EL_CARRIL_DE_LA_MESA}
          cuadrados={cuadrados.map((g) => elCuadradoQueSePinta(g, quieto))}
          alTocar={(c) => {
            const suyo = cuadrados.find((g) => g.opcion.id === c.clave);
            if (suyo === undefined) return;
            alPulsarUnaOpcion(suyo.opcion);
          }}
        />

        {/*
          ═══ LA CAJA DE LOS TRATOS: SE LEE MIENTRAS JUEGA OTRO ═══

          Un trato del Burgo CADUCA al cambiar el turno, así que una oferta que sólo se ve
          abriendo un cajón es una oferta que casi nadie contesta: llega mientras juega otro,
          no interrumpe nada, y muere sin respuesta. Ésta es la caja NO MODAL colgada del pie
          de la cinta —o del carril, si hay—: se ve sin abrir nada, no roba el foco, y por
          debajo se sigue girando el burgo.

          Y LA TIRA NO LLEVA BOTÓN DE ACEPTAR. Un trato se acepta por equivocación y es
          irreversible; la garantía no es un diálogo detrás del botón, es que en la tira NO HAY
          botón: la tira entera abre una hoja donde «Aceptar» y «Rechazar» viven cada uno con
          su renglón. Es lo mismo que hace el pregón de Riberas y por lo mismo.
        */}
        {pregon === null ? null : (
          <CajaColgadaDelLienzo
            nombre={LOS_TRATOS_DE_LA_MESA}
            clase={cuadrados.length > 0 ? COLGADA_BAJO_EL_CARRIL : undefined}
            estilo={elEstiloDeLaCinta(anchoDelCajon)}
          >
            <LaCajaDeLosTratos pregon={pregon} abierta={elTratoAbierto?.id ?? null} alAbrir={(id) => { abrir({ que: 'trato', id }); }} />
          </CajaColgadaDelLienzo>
        )}

        {/*
          ═══ EL CAJÓN: LA HOJA ENTERA, EL RAÍL Y LA CRÓNICA, COLGANDO DE LA CINTA ═══

          Dentro van las seis secciones de la hoja que no están ya en pantalla —«Ahora», la
          carta, la subasta con su puja libre, los tratos, «Lo mío» con la ficha de cada
          título y la mesa entera—, el raíl que monta la Sala y el relato de la partida.

          EL VELO ES LA MITAD QUE SE OLVIDA: sin él, un clic fuera del cajón llega al anillo,
          se cierra el cajón Y se toca una casilla donde estaba el dedo. Va `aria-hidden`
          porque para un lector el cajón ya es modal y un `<div>` sin texto en medio sólo sería
          ruido.

          Con carril arranca una tira más abajo, y esa línea de geometría NO se escribe aquí:
          `BAJO_EL_CARRIL` la publica `lienzo-propio.tsx` con sus dos números en `rem`, para que
          crezcan con la preferencia de letra del navegador y no haya dos altos que cuadrar.
        */}
        {cajonAbierto ? (
          <>
            <div className={EL_VELO} onClick={cerrarElCajon} aria-hidden="true" />
            <div
              id={nombreDelCajon}
              ref={elCajon}
              className={cuadrados.length > 0 ? `${EL_CAJON} ${BAJO_EL_CARRIL}` : EL_CAJON}
              role="dialog"
              aria-modal="true"
              aria-label={LA_HOJA_DE_LA_PARTIDA}
              tabIndex={-1}
              style={elEstiloDeLaCinta(anchoDelCajon)}
            >
              <LasHojasDelBurgo
                hoja={hoja}
                vista={vista}
                yo={yo}
                quieto={quieto}
                alElegir={alElegir}
                abierta={abierta}
                alAbrir={alAbrir}
                alTocarJugador={(asiento) => { abrir({ que: 'jugador', asiento }); }}
                alSenalarCasilla={senalar}
                alComponerElTrato={() => { abrir({ que: 'componedor', a: null }); }}
              />
              {/*
                EL RAÍL, ENVUELTO EN EL AVISO DEL MARCADOR: dentro de él, cada fila de jugador
                es un botón que abre su ficha. Fuera —el raíl que la Sala pinta al lado del
                respaldo— el contexto vale `null` y el marcador se pinta como siempre.
              */}
              <ElTactoDelMarcador.Provider value={alTocarFigura}>{elRail}</ElTactoDelMarcador.Provider>
              <LaCronicaDelBurgo cronica={cronica} />
            </div>
          </>
        ) : null}

        {conMundo ? (
          <>
            {/*
              TIRAR PARA QUIEN NO VE EL LIENZO. Donde hay dados el botón de tirar se ha ido de
              la lista del cajón, y un dado que sólo se puede tocar con el ratón sería el
              primer movimiento del juego inaccesible. Este botón sólo existe para las
              tecnologías de apoyo —fuera de la vista con `clip-path` y NUNCA con
              `display: none`, que los lectores saltan— y manda por la misma puerta que el asa.

              EXISTE MIENTRAS EXISTEN LOS DADOS, no sólo mientras se puede tirar: al pulsarlo
              `mover` pone `quieto`, y si el botón se desmontara con el foco dentro el foco
              caería al `body` y el lector perdería el sitio. Se apaga con `aria-disabled` y NO
              con `disabled`, que le quitaría el foco igual.
            */}
            {dados !== null && !recogida ? (
              <button
                type="button"
                className="burgo-solo-apoyo"
                aria-disabled={!dados.porTirar || quieto}
                onClick={() => {
                  if (dados.porTirar && !quieto) void alTocarLosDados();
                }}
              >
                Tirar los dados
              </button>
            ) : null}
            {/*
              Y LAS OBRAS QUE SÓLO TIENE EL ANILLO, por el mismo camino y por el mismo motivo:
              comprar y sacar a subasta no cuelgan de ninguna ficha, así que sin esto sólo se
              pueden hacer con el ratón encima del `<canvas>`. El rótulo es el del juego.
            */}
            {soloEnElAnillo.map((o) => (
              <button
                key={o.id}
                type="button"
                className="burgo-solo-apoyo"
                aria-disabled={quieto}
                title={o.ayuda}
                onClick={() => {
                  if (quieto) return;
                  alPulsarUnaOpcion(o);
                }}
              >
                {o.rotulo}
              </button>
            ))}
            {/* Y a quién se espera, que en el lienzo lo dice una marca de color y nada más. */}
            <p className="burgo-solo-apoyo">{esperaA(vista)}</p>
            <LimiteDelMundo alFallar={alFallarElLienzo}>
              <Canvas
                shadows={false}
                dpr={[1, 2]}
                gl={{ antialias: true }}
                camera={{ fov: FOV, near: 0.5, far: ALCANCE_DEL_BURGO * 8 }}
                onCreated={({ gl }) => {
                  gl.toneMapping = ACESFilmicToneMapping;
                  gl.toneMappingExposure = 1.05;
                }}
              >
                {/* La cámara ANTES que la escena: el seguimiento al que mueve corre después de ella. */}
                <CamaraAerea
                  alcance={ALCANCE_DEL_BURGO}
                  cercania={cercania}
                  alAcercarse={alAcercarse}
                  recuadro={RECUADRO_DEL_LIENZO}
                  seDesplazanSolas={SE_DESPLAZAN_SOLAS}
                  velo={EL_VELO}
                  mirador={MIRADOR_DEL_BURGO}
                  limites={LIMITES_DEL_BURGO}
                  alturaMinima={ALTURA_MINIMA_DEL_OJO_DEL_BURGO}
                  /* La escena trae su propia niebla de mediodía, fija: moverla con el ojo sería pisársela. */
                  niebla={null}
                  /* A pie, la cámara es la del paseo de la escena: ésta se calla sin desmontarse. */
                  callada={aPie}
                />
                <Burgo
                  tablero={datos}
                  dados={dados}
                  sucesos={sucesos}
                  codigo={puesta.codigo}
                  ventana={{ ancho: lienzo.ancho, alto: lienzo.alto, franjaInferior: 0 }}
                  traer={traer}
                  calidad={calidad}
                  camara={camara}
                  bandejaDeLosDados={sitioDeLaBandeja}
                  bandejaRecogida={recogida}
                  reloj={relojDeArena}
                  alPasarElTurno={alPasarElTurno}
                  seguirAlQueMueve={siguiendo && aQuienSigue !== null}
                  quieto={quieto}
                  alTocarCasilla={alTocarCasilla}
                  /*
                    EL SEÑALADO, QUE ES EL CARTEL AL POSAR EL CURSOR. Es el MISMO `senalar` que
                    usan las filas de la tarjeta, de la ficha de un jugador y del componedor: un
                    cartel es uno, y dos caminos hasta él serían dos sellos y dos relojes. La
                    escena avisa sólo cuando la casilla CAMBIA y nunca de un índice que no sea
                    una de las cuarenta (`senaladoTrasElGesto`), así que aquí no se compara nada.
                  */
                  alSenalarCasilla={senalar}
                  alTocarLosDados={alTocarLosDados}
                  alTocarFigura={alTocarFigura}
                  alFallar={alFallarElLienzo}
                  alMedir={alMedir}
                  canal={canal}
                  mandos={mandos}
                  alRecoger={alRecoger}
                />
              </Canvas>
            </LimiteDelMundo>
            {avisoDelHallazgo}
            {/* En un teléfono y a pie, la palanca: ver `mandos-tactiles.tsx`. */}
            <MandosTactiles mandos={mandos} visibles={tactil && aPie} conGolpe={canal !== undefined} />
            {avisoDeGirar}
            {/*
              A PIE: las tres cámaras y, mientras se anda, cómo se anda; y en una mesa de botas, en los
              dos modos, cómo va el canal. Ver `LasCamarasDelBurgo`.
            */}
            <LasCamarasDelBurgo
              modo={modo}
              alElegir={ponerModo}
              conCarril={cuadrados.length > 0}
              canal={esBotas ? (estadoDelCanal?.texto ?? 'Conectando…') : undefined}
              tactil={tactil}
              recogida={aPie && conMundo ? mesaRecogida : null}
              alRecogerLaMesa={() => ponerMesaRecogida((r) => !r)}
            />
            {/*
              LA SALIDA, y sólo cuando hace falta. Está FUERA del `Canvas`: es un botón de la
              Sala con su foco y su filo, no un objeto del mundo. Y no le roba el gesto a la
              cámara sin tener que pedirlo: la cámara sólo atiende lo que empieza sobre el
              propio `<canvas>`. A pie no sale: andando no hay acercamiento del que volver, y a
              la mesa se sube con «La mesa» o con el 1.
            */}
            {alPrincipio || aPie ? null : (
              <button
                type="button"
                /*
                  CON CARRIL BAJA UNA TIRA, Y EL NÚMERO NO SE ESCRIBE AQUÍ. Era un
                  `CSSProperties` con un `calc` dentro de este fichero, y ese `calc` suma el alto
                  del carril: escrito en JavaScript no hay manera de atarlo al `height` de
                  `.lienzo-carril`, y el día que las dos cifras se separen el botón vuelve a caer
                  ENCIMA del único cuadrado de la tira —medido en el banco con el momento del
                  trato y el lienzo de 288×317: el botón en y=293,9 y la quiebra de y=276,9 a
                  y=323,7—. En la hoja, `verify:escritorio` lee los tres números y los compara.
                */
                className={
                  cuadrados.length > 0 ? `${EL_BOTON_DE_VOLVER} ${EL_BOTON_DE_VOLVER_CON_CARRIL}` : EL_BOTON_DE_VOLVER
                }
                onClick={volverAlBurgoEntero}
              >
                {VOLVER_AL_BURGO_ENTERO}
              </button>
            )}
          </>
        ) : (
          /* El telón: `--suelo` con el nombre del juego hasta que el modelo llega. */
          <div className="burgo-telon" aria-busy="true">
            <p className="burgo-nombre">{manifiesto.nombre}</p>
            <p className="letra-chica">Se abren las puertas.</p>
          </div>
        )}

        {/*
          ═══ EL CARTEL DEL PIE: LO QUE DICE UNA CASILLA SIN QUE SE ABRA NADA ═══

          Nombre, barrio, precio, estado y renta de HOY, redactados por la traducción —la
          MISMA frase que lleva dentro la tarjeta, para que los dos muebles no puedan
          discrepar—. No se pulsa (`pointer-events: none` en la hoja), así que no tapa el toque
          de la casilla que cubre, y se va solo.

          `vivo={false}` porque la región viva de esta pantalla es el aviso de la cinta, y dos
          con el mismo cambio se anuncian dos veces. Y `key` con el sello: ver `LoSenalado`.
        */}
        <CartelAlPie key={senalado?.sello ?? 0} frases={elCartel} vivo={false} estilo={sitioDelCartel} />

        {/*
          ═══ LAS CAJAS QUE SE ABREN ENCIMA DEL ANILLO ═══

          Todas dentro del recuadro y ninguna en flujo: con la página de pie el recuadro vale
          la ventana entera menos nada, así que «debajo» está fuera de la pantalla. Y UNA CADA
          VEZ: `abrir` cierra la anterior y cierra el cajón, para que nunca haya dos trampas de
          foco encima del tablero.
        */}
        {laCasillaAbierta === null ? null : (
          /*
            ═══ LA TARJETA DE UNA CASILLA, EN LA MISMA CAJA QUE LAS OTRAS DOS ═══

            En la caja genérica y no en `ElijeUna`, y la razón se vio en el banco: `ElijeUna`
            pinta SIEMPRE un `<h2>` con el título que se le da, y el título de esta pregunta es
            el nombre de la casilla, que es también lo primero que pinta la tarjeta —con la
            mota de la acera de su barrio al lado, que es información y no adorno—. Medido con
            «El Descanso»: salía el nombre tres veces seguidas, dos de ellas sin decir nada.
            Aquí el nombre lo pone la tarjeta, una vez y con su color, y la caja se queda con
            el nombre ACCESIBLE, que es lo que un `dialog` necesita para no anunciarse
            «diálogo» a secas.

            Y los botones son los de la ficha, en su propia lista: son LOS MISMOS objetos que
            la casilla del anillo manda —la traducción los devuelve por identidad—, así que la
            obra tiene un botón y un atajo, y la partición los cuenta como uno.
          */
          <CajaEnElLienzo nombre={laCasillaAbierta.nombre} estilo={EL_SITIO_DE_UNA_CAJA_CON_CARTEL} alCerrar={cerrarLoAbierto}>
            <LaTarjetaDeUnaCasilla ficha={laCasillaAbierta} alSenalarCasilla={senalar}>
              {laCasillaAbierta.opciones.length === 0 ? null : (
                <ul className="opciones">
                  {laCasillaAbierta.opciones.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        className={quieto ? 'opcion opcion-quieta' : 'opcion opcion-secundaria'}
                        aria-disabled={quieto}
                        title={o.ayuda}
                        onClick={() => {
                          if (quieto) return;
                          cerrarLoAbierto();
                          alPulsarUnaOpcion(o);
                        }}
                      >
                        <span className="opcion-texto">
                          <span className="opcion-rotulo">{o.rotulo}</span>
                          {o.ayuda.length > 0 ? <span className="opcion-ayuda">{o.ayuda}</span> : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </LaTarjetaDeUnaCasilla>
            <button type="button" className="opcion opcion-sobria" onClick={cerrarLoAbierto}>
              <span className="opcion-texto">
                <span className="opcion-rotulo">Dejarlo</span>
              </span>
            </button>
          </CajaEnElLienzo>
        )}

        {elJugadorAbierto === null ? null : (
          <CajaEnElLienzo nombre={elJugadorAbierto.nombre} estilo={EL_SITIO_DE_UNA_CAJA_CON_CARTEL} alCerrar={cerrarLoAbierto}>
            <h2 className="rotulo-de-panel">{elJugadorAbierto.nombre}</h2>
            <LaFichaDeUnJugador
              ficha={elJugadorAbierto}
              alSenalarCasilla={senalar}
              alProponerle={
                elJugadorAbierto.trato === null
                  ? null
                  : () => { abrir({ que: 'componedor', a: elJugadorAbierto.asiento }); }
              }
            />
            <button type="button" className="opcion opcion-sobria" onClick={cerrarLoAbierto}>
              <span className="opcion-texto">
                <span className="opcion-rotulo">Dejarlo</span>
              </span>
            </button>
          </CajaEnElLienzo>
        )}

        {/*
          ═══ EL COMPONEDOR SOBRE EL LIENZO Y NO DENTRO DEL CAJÓN ═══

          Para proponer un trato hay que mirar qué tiene el otro y DÓNDE están sus solares, y
          el cajón cuelga de la cinta hasta el canto: con él abierto el tablero no se ve. La
          caja modal genérica nace centrada y sólo tan alta como su contenido, así que el
          anillo se sigue viendo alrededor; y cada título del componedor SEÑALA su casilla en
          el cartel del pie, que es cómo se sabe dónde cae sin cerrar nada.
        */}
        {elComponedor === null || abierto?.que !== 'componedor' ? null : (
          <CajaEnElLienzo
            nombre={elComponedor.puerta?.rotulo ?? LOS_TRATOS_DE_LA_MESA}
            estilo={EL_SITIO_DE_UNA_CAJA_CON_CARTEL}
            alCerrar={cerrarLoAbierto}
          >
            <ElComponedorDelTrato
              trato={elComponedor}
              vista={vista}
              yo={yo}
              quieto={quieto}
              aQuienDeSalida={abierto.a}
              alSenalarCasilla={senalar}
              alElegir={(m) => {
                cerrarLoAbierto();
                alElegir(m);
              }}
            />
            <button type="button" className="opcion opcion-sobria" onClick={cerrarLoAbierto}>
              <span className="opcion-texto">
                <span className="opcion-rotulo">Dejarlo</span>
              </span>
            </button>
          </CajaEnElLienzo>
        )}

        {/*
          LA HOJA DE UN TRATO: lo que la tira abre. «Aceptar» y «Rechazar» viven aquí, cada uno
          con su renglón, y no en la tira: un trato aceptado por equivocación no se deshace.
        */}
        {elTratoAbierto === null ? null : (
          <ElijeUna
            titulo={elTratoAbierto.frase}
            nota={elTratoAbierto.comoAnda}
            opciones={[elTratoAbierto.aceptar, elTratoAbierto.rechazar, elTratoAbierto.retirar].filter(
              (o): o is Opcion => o !== null,
            )}
            quieto={quieto}
            velo={EL_VELO}
            menu={EL_MENU}
            alElegir={(o) => {
              cerrarLoAbierto();
              alPulsarUnaOpcion(o);
            }}
            alDejarlo={cerrarLoAbierto}
          />
        )}

        {/*
          LO IRREVERSIBLE SE PREGUNTA. La quiebra se lleva por delante la partida de quien la
          pulsa, y el cuadrado del carril está a un roce de distancia. Se pinta en
          `.opcion-sobria` —el precedente de «Tirar la mesa» de la Sala— y la salida es lo
          primero que encuentra el tabulador después del rótulo.
        */}
        {abierto?.que !== 'confirmar' ? null : (
          <CajaEnElLienzo nombre={abierto.opcion.rotulo} alCerrar={cerrarLoAbierto}>
            <h2 className="rotulo-de-panel">{abierto.opcion.rotulo}</h2>
            {abierto.opcion.ayuda.length === 0 ? null : <p className="letra-chica">{abierto.opcion.ayuda}</p>}
            <p className="letra-chica">{ESTO_NO_SE_DESHACE}</p>
            <ul className="opciones">
              <li>
                <button type="button" className="opcion opcion-secundaria" onClick={cerrarLoAbierto}>
                  <span className="opcion-texto">
                    <span className="opcion-rotulo">Dejarlo</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={quieto ? 'opcion opcion-quieta' : 'opcion opcion-sobria'}
                  aria-disabled={quieto}
                  onClick={() => {
                    if (quieto) return;
                    const o = abierto.opcion;
                    cerrarLoAbierto();
                    alElegir({ tipo: o.tipo, carga: o.carga });
                  }}
                >
                  <span className="opcion-texto">
                    <span className="opcion-rotulo">{abierto.opcion.rotulo}</span>
                  </span>
                </button>
              </li>
            </ul>
          </CajaEnElLienzo>
        )}

        {/*
          LA TARJETA DEL FINAL. Sale sola al acabar la partida y se va con «Ver el tablero»;
          no se pinta si hay otra caja encima (dos trampas de foco a la vez se cerrarían las
          dos con un `Escape`) ni cuando ya se dejó ir. Lo que dice lo redacta `finalEnTres`:
          aquí no se ordena, no se cuenta y no se conjuga nada.
        */}
        {elFinal === null || finalDejado || abierto !== null ? null : (
          <CajaEnElLienzo nombre={elFinal.titulo} clase="burgo-final" alCerrar={dejarElFinal}>
            <h2 className="rotulo-de-panel">{elFinal.titulo}</h2>
            <p className="burgo-final-frase">{elFinal.frase}</p>
            {elFinal.paraMi.length === 0 ? null : <p className="letra-chica">{elFinal.paraMi}</p>}
            <ol className="burgo-final-puestos">
              {elFinal.puestos.map((p) => (
                <li
                  key={p.asiento}
                  className={p.quebrado ? 'burgo-final-puesto burgo-final-quebrado' : 'burgo-final-puesto'}
                  aria-current={p.soyYo ? 'true' : undefined}
                >
                  <span className="mota-de-color" style={{ background: p.color }} aria-hidden="true" />
                  <span>{p.linea}</span>
                </li>
              ))}
            </ol>
            <p className="letra-chica">{elFinal.porque}</p>
            <ul className="opciones">
              <li>
                <button type="button" className="opcion opcion-secundaria" onClick={dejarElFinal}>
                  <span className="opcion-texto">
                    <span className="opcion-rotulo">Ver el tablero</span>
                  </span>
                </button>
              </li>
              {laSalida === undefined ? null : (
                <li>
                  <a className="opcion burgo-final-salir" href={laSalida}>
                    <span className="opcion-texto">
                      <span className="opcion-rotulo">{SALIR_DE_LA_MESA}</span>
                    </span>
                  </a>
                </li>
              )}
            </ul>
          </CajaEnElLienzo>
        )}
      </div>
    </div>
  );
}

/**
 * DÓNDE SE POSA EL CARTEL DEL PIE, y por qué va en línea y no en la hoja.
 *
 * `.lienzo-cartel` trae lo que no depende del juego —el fondo, el filo, los tres números del
 * presupuesto de renglones y el `pointer-events: none`— y deja el SITIO a quien lo monta,
 * porque cuánto cabe y dónde estorba depende del reparto de cada pantalla. Aquí va al pie y a
 * todo lo ancho menos el inset del cromo de este cliente (`0.75rem` por lado, el mismo con el
 * que se colocan el cajón y la caja de los tratos): a los lados del anillo no hay nada que
 * tapar, y el pie es donde menos casillas se pierden — las de abajo son justo las que se
 * tocan primero, y por eso el cartel no se pulsa.
 */
const EL_SITIO_DEL_CARTEL: CSSProperties = { right: '0.75rem', bottom: '0.75rem', left: '0.75rem' };
/** Lo menos que tiene que medir de ancho el cartel del pie para ir al lado de la caja del Burgo, en puntos. */
const ANCHO_MINIMO_DEL_CARTEL_AL_LADO = 220;
/** Por debajo de este alto (los 30rem de la hoja, con la letra de la casa) las cámaras de la mesa van abajo a la izquierda. */
const ALTO_DE_LA_PANTALLA_BAJA = 480;

/**
 * LA CAJA DEL BURGO, ABAJO A LA DERECHA DEL LIENZO: los dados, el dinero, el reloj de arena, los mazos
 * y las casas del Concejo (`escenas/burgo/bandeja-de-los-dados.ts`). Arriba están la cinta, el carril y
 * «Ver el burgo entero», y el pie sólo lo usa el cartel, que se acorta para dejarle su hueco
 * (`sitioDelCartel`). Los 12 puntos son el mismo `0.75rem` de los demás cromos con la letra de la casa.
 */
const SITIO_DE_LA_BANDEJA: SitioDeLaBandeja = { esquina: 'abajo-derecha', margen: 12 };

/**
 * ═══ A PIE EN UN TELÉFONO, LA CAJA SE APARTA DE LOS MANDOS (27-sep-2026) ═══
 *
 * Medido con el fotógrafo (`docs/PANTALLAS.md`): a pie en un móvil tumbado, «Golpear» y «Correr» caían
 * encima de los dados y la palanca encima del dinero; de pie, la palanca tapaba media caja. Los mandos
 * (`mandos-tactiles.tsx`, `.mandos-tactiles` en la hoja) son la palanca de 8rem abajo a la izquierda y
 * los dos botones abajo a la derecha: apilados (4,75rem + 0,5 + 3rem de alto, 7rem de ancho) o, en una
 * pantalla de menos de 30rem de alto, en fila (4,75rem de alto, 4,75 + 0,5 + 7rem de ancho).
 *
 * Si entre la palanca y los botones cabe una caja que se lea (`ANCHO_MINIMO_DE_LA_CAJA_ENTRE_LOS_MANDOS`),
 * va AHÍ, entre los dos pulgares; si no —un teléfono de pie—, va ENCIMA de ellos, a lo ancho. En la mesa,
 * o con ratón, la de siempre.
 */
const ANCHO_MINIMO_DE_LA_CAJA_ENTRE_LOS_MANDOS = 300;
function sitioDeLaBandejaAPie(ancho: number, alto: number, raiz: number): SitioDeLaBandeja {
  const margen = SITIO_DE_LA_BANDEJA.margen;
  const hueco = 0.75 * raiz;
  const enFila = alto < 30 * raiz;
  const palanca = 8 * raiz;
  const botonesAncho = (enFila ? 4.75 + 0.5 + 7 : 7) * raiz;
  const botonesAlto = (enFila ? 4.75 : 4.75 + 0.5 + 3) * raiz;
  const entre = ancho - 2 * hueco - palanca - botonesAncho - 2 * margen;
  if (entre >= ANCHO_MINIMO_DE_LA_CAJA_ENTRE_LOS_MANDOS) {
    return { ...SITIO_DE_LA_BANDEJA, apartadoDerecho: hueco + botonesAncho, anchoMaximo: entre };
  }
  return { ...SITIO_DE_LA_BANDEJA, apartadoVertical: hueco + Math.max(palanca, botonesAlto) };
}

/**
 * LO QUE TAPA EL ANILLO DESDE ARRIBA, en puntos del recuadro: la cinta, las cámaras y el hueco del
 * carril. Se mide en la página y no se calcula aquí, porque su ancho depende de la letra y del
 * navegador. Las cámaras bajan una tira cuando aparece el carril (`.burgo-a-pie-con-carril`), y la pose
 * de salida no puede saltar cada vez que aparece o se va un cuadrado: por eso se cuentan en las DOS
 * alturas, y el carril, centrado, con el ancho de tres cuadrados aunque ahora no haya ninguno.
 */
function lugaresQueTapanElAnillo(recuadro: HTMLElement | null, raiz: number): RectanguloEnPuntos[] {
  if (recuadro === null || typeof recuadro.getBoundingClientRect !== 'function') return [];
  const origen = recuadro.getBoundingClientRect();
  const relativo = (e: Element | null): RectanguloEnPuntos | null => {
    if (e === null) return null;
    const r = e.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return null;
    return { x0: r.left - origen.left, y0: r.top - origen.top, x1: r.right - origen.left, y1: r.bottom - origen.top };
  };
  const lugares: RectanguloEnPuntos[] = [];
  const cinta = relativo(recuadro.querySelector('.burgo-cinta'));
  if (cinta !== null) lugares.push(cinta);
  const tira = 2.75 * raiz;
  const camaras = relativo(recuadro.querySelector('.burgo-camaras'));
  if (camaras !== null) {
    const arriba = camaras.y0 < origen.height / 2;
    const hayCarril = recuadro.querySelector('.lienzo-carril') !== null;
    lugares.push(
      arriba
        ? { ...camaras, y0: camaras.y0 - (hayCarril ? tira : 0), y1: camaras.y1 + (hayCarril ? 0 : tira) }
        : camaras,
    );
  }
  if (cinta !== null) {
    const medio = origen.width / 2;
    const ancho = 3 * tira + 1.5 * raiz;
    lugares.push({ x0: medio - ancho / 2, y0: cinta.y1, x1: medio + ancho / 2, y1: cinta.y1 + tira });
  }
  return lugares;
}

/**
 * LAS TRES CAJAS QUE SEÑALAN DEJAN EL PIE LIBRE, Y ESO TAMBIÉN SE MIDIÓ EN EL BANCO.
 *
 * La tarjeta de una casilla, la ficha de un jugador y el componedor tienen todos filas que
 * SEÑALAN una casilla, y lo que esa señal pinta es el cartel del pie: es cómo se sabe dónde
 * cae un solar sin cerrar lo que se está mirando. `.lienzo-caja` nace centrada y crece hasta
 * `calc(100% - 1.5rem)`, así que con contenido largo llega al canto de abajo Y TAPA EL CARTEL:
 * medido en el banco con el componedor y el lienzo de 768×640, la caja iba del canto de arriba
 * al de abajo del recuadro y el cartel quedaba debajo. La señal seguía funcionando y no se veía
 * nada, que es la peor de las dos formas de fallar.
 *
 * Los 5rem de abajo son el cartel de DOS renglones, que es el tamaño para el que está medida
 * la caja del cartel: doce puntos de relleno por lado más dos renglones de `0.82rem × 1.35`
 * dan 61,7 puntos, más el inset de `0.75rem` del cromo, 74,5 — o sea 4,4rem con la raíz de esta
 * casa, redondeados a 5 para que un cartel con la letra del navegador en grande siga cabiendo.
 * Y el centro sube la mitad de eso, para que la caja no se pegue al canto de arriba al encoger.
 */
const EL_SITIO_DE_UNA_CAJA_CON_CARTEL: CSSProperties = {
  top: 'calc(50% - 2.5rem)',
  maxHeight: 'calc(100% - 1.5rem - 5rem)',
};

/**
 * DE UN GLIFO DEL JUEGO A UN CUADRADO DE LA PIEZA, y ni una palabra inventada por el camino.
 *
 * `nombre` es el rótulo ENTERO que escribió el juego («Comprar Calle Mayor por 350 €»): es lo
 * que se oye y lo que sale al posar el ratón, que es donde de verdad se lee qué hace cada
 * cuadrado. `glifo` es la o las dos letras que caben dentro, y `marca` el color de la acera
 * del barrio o el del peón del otro en un trato — el mismo `#rrggbb` con el que se pinta esa
 * acera y ese peón, no un código nuevo.
 *
 * ═══ Y EL RÓTULO CORTO, QUE ES LO QUE AQUÍ FALTABA Y YA TIENE DÓNDE IR ═══
 *
 * `GlifoDelCarrilDelBurgo` trae además un `rotulo` corto —el nombre de seis letras que lleva
 * pintada la cara de la casilla («Mayor»), la cifra de una puja, el nombre del otro en un
 * trato—, y hasta hoy se quedaba fuera porque `CuadradoDelCarril` pintaba el glifo y nada más.
 * Lo que eso costaba está medido: en el apuro del Burgo salen SEIS «Hi» seguidos —hipotecar,
 * uno por título— que a la vista sólo se distinguen por la barra del color de la acera, y dos
 * solares del mismo barrio la tienen IGUAL; en una subasta con el cajón cerrado salen TRES «Pu»
 * idénticos, las tres cifras fijas, sin ni siquiera esa barra. Con lector y con ratón se
 * distinguían perfectamente —el rótulo entero está en `aria-label` y en `title`—; A LA VISTA
 * no, y con el dedo no hay `title` que se pose, que es justo el aparato para el que esta tira
 * existe.
 *
 * SE LE PASA TAL CUAL Y NO SE RECORTA AQUÍ: la pieza decide con él si el cuadrado se ensancha
 * (`lienzo-carril-hueco-ancho`), y lo que no quepa lo recorta la hoja con puntos suspensivos.
 * Se le pasa a TODOS y no sólo a los gemelos, y eso hay que decirlo porque cuesta: el cuadrado
 * ancho mide de 3,5 a 6,5rem, o sea que en el lienzo de 288 caben cuatro en vez de cinco. Una
 * tira con unos anchos y otros no se lee como dos tiras pegadas, y CUÁL es cada cuadrado se
 * necesita en los catorce del apuro, no sólo en los seis que repiten verbo.
 *
 * La CLAVE es el `id` de la opción, que es estable entre revisiones y es lo que el manejador
 * usa para volver de un cuadrado a su opción entera.
 */
function elCuadradoQueSePinta(g: GlifoDelCarrilDelBurgo<Opcion>, quieto: boolean): CuadradoDelCarril {
  return {
    clave: g.opcion.id,
    glifo: g.glifo,
    rotulo: g.rotulo,
    nombre: g.ayuda,
    /*
     * Y NO SE LE PONE `ayuda`. Aquí iba el rótulo corto cuando no cabía en ninguna otra parte:
     * la pieza pega `nombre` y `ayuda` en el `title`, así que «Fijo» y «10 %» del Impuesto —los
     * únicos que no están dentro del rótulo largo— se colaban por ahí para poder distinguirlos
     * al posarse. Ahora el rótulo se PINTA, o sea que pegarlo además al `title` sería decir dos
     * veces lo mismo a un palmo de distancia, y el `title` se queda con el rótulo entero del
     * juego, que es lo único que dice algo que no esté ya en el cuadrado.
     */
    marca: g.color,
    quieto,
  };
}

// ---------------------------------------------------------------------------
// La caja de los tratos
// ---------------------------------------------------------------------------

/**
 * LOS DOS BLOQUES DE LA CAJA, y por qué son dos y no uno.
 *
 * En Riberas sólo propone quien tiene el turno, así que «para contestar» y «tuyos» no se daban
 * a la vez nunca. Aquí SÍ: el juego deja proponer sin turno al dueño del turno, o sea que tres
 * jugadores pueden tener a la vez una propuesta viva hacia el mismo y él tener las tres para
 * contestar mientras las suyas esperan. Un bloque vacío no se pinta: un rótulo con nada debajo
 * es cromo encima del tablero.
 *
 * Los tratos entre OTROS DOS no salen aquí —no hay nada que yo pueda hacer con ellos— y siguen
 * enteros en los renglones de la sección «El trato», que es donde se leen las cosas que sólo se
 * miran. Eso lo decide `pregonDelBurgo`, no este mueble.
 */
function LaCajaDeLosTratos({
  pregon,
  abierta,
  alAbrir,
}: {
  pregon: PregonDelBurgo<Opcion>;
  abierta: number | null;
  alAbrir: (id: number) => void;
}): JSX.Element {
  return (
    <>
      {pregon.paraContestar.length === 0 ? null : (
        <UnBloqueDeTratos rotulo={PARA_CONTESTAR} tiras={pregon.paraContestar} abierta={abierta} alAbrir={alAbrir} />
      )}
      {pregon.mios.length === 0 ? null : (
        <UnBloqueDeTratos rotulo={LOS_MIOS} tiras={pregon.mios} abierta={abierta} alAbrir={alAbrir} />
      )}
      <p className="letra-chica burgo-renglon" style={EL_HUECO_DE_LA_CAJA}>
        {pregon.caduca}
      </p>
    </>
  );
}

/** El hueco a los lados de la caja colgada: la pieza no lleva relleno horizontal, y aquí dentro hace falta. */
const EL_HUECO_DE_LA_CAJA: CSSProperties = { padding: '0 0.5rem' };

function UnBloqueDeTratos({
  rotulo,
  tiras,
  abierta,
  alAbrir,
}: {
  rotulo: string;
  tiras: readonly TiraDelTrato<Opcion>[];
  abierta: number | null;
  alAbrir: (id: number) => void;
}): JSX.Element {
  return (
    <>
      <h3 className="letra-chica burgo-barrio-rotulo" style={EL_HUECO_DE_LA_CAJA}>
        {rotulo}
      </h3>
      <ul className="opciones" style={EL_HUECO_DE_LA_CAJA}>
        {tiras.map((t) => {
          /*
           * EL NOMBRE ACCESIBLE ES LA FRASE ENTERA Y NO LO QUE SE PINTA: quién, qué, en qué
           * dirección y qué hace un toque. `frase` está escrita DESDE DONDE MIRA quien la lee
           * —«Ana te ofrece…» a quien contesta, «Le ofreces a Ana…» a quien la propuso—, que es
           * justo lo que una lista de resúmenes en tercera persona no decía.
           */
          const seContesta = t.aceptar !== null || t.rechazar !== null;
          const seOye = `${t.frase}. ${t.comoAnda}. ${seContesta ? ABRIR_EL_TRATO : ABRIR_EL_TRATO_SIN_CONTESTAR}`;
          return (
            <li key={t.id}>
              <button
                type="button"
                className="opcion"
                aria-haspopup="dialog"
                aria-expanded={abierta === t.id}
                aria-label={seOye}
                title={seOye}
                onClick={() => {
                  alAbrir(t.id);
                }}
              >
                <span className="opcion-texto">
                  <span className="opcion-rotulo">
                    <span className="mota-de-color" style={{ background: t.color }} aria-hidden="true" />
                    {`${t.da} → ${t.pide}`}
                  </span>
                  <span className="opcion-ayuda">{t.comoAndaSinNombre}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------------------
// El marcador, en el raíl
// ---------------------------------------------------------------------------

/**
 * EL MARCADOR DEL BURGO, en el raíl y por tanto también dentro del cajón.
 *
 * Se decide por QUIÉN es y no por si hay tablero en tres dimensiones: el marcador se mira
 * igual cuando la mesa cae al retablo, y ahí es donde más falta hace, porque el respaldo no
 * dice de nadie cuánto dinero lleva. Devuelve `null` si la vista no es del Burgo.
 *
 * Lo que añade sobre el renglón de texto que ya redacta `shared/` es lo que un renglón no
 * puede: el color de cada jugador, quién eres tú, y el marco del acento en el dueño del
 * turno con un punto en quien tiene que contestar —el pujador, el que está en apuro—, que
 * son dos cosas distintas y en el Burgo se separan a menudo (decisión 4).
 *
 * Va con `aria-hidden` en las cajas de arriba y la frase entera en la lista de apoyo, y no
 * al revés, para que no se oiga dos veces lo mismo.
 *
 * ═══ Y CADA FILA ES UN BOTÓN CUANDO HAY DÓNDE ABRIR SU FICHA ═══
 *
 * Era una `<ul>` sin un solo botón, y eso dejaba la ficha de un jugador —y con ella el
 * componedor de un trato— detrás de un gesto que no todo el mundo puede hacer: tocar su peón
 * en el `<canvas>`, que no está en el orden del tabulador. Quién recoge el toque no llega por
 * props —la Sala monta este marcador dentro del raíl y el raíl entra en el cajón como
 * `children`— sino por el contexto que el cajón publica. Fuera del cajón vale `null` y las
 * filas se pintan como siempre: no hay ficha modal que abrir donde no hay lienzo.
 */
export function MarcadorDelBurgo({ vista, yo }: { vista: unknown; yo: string | null }): JSX.Element | null {
  const alTocar = useContext(ElTactoDelMarcador);
  const marcador = marcadorEnTres(vista, yo);
  if (marcador.jugadores.length === 0) return null;
  return (
    <section className="panel burgo-marcador">
      <h2 className="rotulo-de-panel">El marcador</h2>
      <ul className="renglones" role="list">
        {marcador.jugadores.map((j) => {
          const clases = [
            'burgo-del-marcador',
            j.soyYo ? 'soy-yo' : '',
            j.esSuTurno ? 'burgo-le-toca' : '',
            j.quebrado ? 'burgo-quebrado' : '',
          ]
            .filter((c) => c.length > 0)
            .join(' ');
          const dentro = (
            <>
              <span className="mota-de-color" style={{ background: j.color }} aria-hidden="true" />
              <span className="burgo-ficha-del-jugador" aria-hidden="true">
                <span className="burgo-nombre-del-jugador">
                  {j.nombre}
                  {j.soyYo ? ' (tú)' : ''}
                  {j.seLeEspera && !j.esSuTurno ? ' ·' : ''}
                </span>
                {/*
                  LA CONCORDANCIA LA HACE `plural`, DE LA TRADUCCIÓN, y no un ternario escrito
                  aquí. Aquí había dos —los títulos y los Salvoconductos—, y no estaban mal:
                  estaban en el sitio donde el siguiente se escribe a mano otra vez, que es
                  exactamente lo que la cabecera de `plural` cuenta que costó en «La mesa
                  entera» («guarda 1 casas y 1 hoteles»). Un plural a mano se lee igual de bien
                  y dice otra cosa, así que no hay comprobador que lo cace: lo único que lo
                  evita es que la concordancia tenga UN solo sitio en toda la casa.
                */}
                <span className="letra-chica burgo-lo-del-jugador">
                  {`${String(j.titulos)} ${plural(j.titulos, 'título', 'títulos')}${j.presa ? ' · en la Comisaría' : ''}${
                    j.indultos > 0 ? ` · ${String(j.indultos)} ${plural(j.indultos, 'Salvoconducto', 'Salvoconductos')}` : ''
                  }`}
                </span>
              </span>
              <span className="burgo-dinero-del-jugador" aria-hidden="true">
                {maravedies(j.mrs)}
              </span>
              <span className="burgo-solo-apoyo">{j.linea}</span>
            </>
          );
          return alTocar === null ? (
            <li key={j.asiento} className={clases}>
              {dentro}
            </li>
          ) : (
            <li key={j.asiento}>
              {/*
                LA REJILLA DE TRES COLUMNAS SE MUDA AL BOTÓN, y con ella el filo del turno: la
                fila entera es lo que se pulsa, no una esquina de 44 puntos dentro de ella.
                `.opcion` pone lo que un botón de esta casa tiene —el filo, el redondeo, el
                suelo de toque y el `:hover`— y `.burgo-del-marcador`, que va después en la
                hoja, se queda con la rejilla y el relleno.
              */}
              <button
                type="button"
                className={`opcion ${clases}`}
                aria-label={`Ficha de ${j.nombre}. ${j.linea}`}
                onClick={() => {
                  alTocar(j.asiento);
                }}
              >
                {dentro}
              </button>
            </li>
          );
        })}
      </ul>
      {/*
        LO QUE LE QUEDA AL AYUNTAMIENTO, que es información pública del juego y parte de lo que se
        juega: una mesa que sabe que quedan dos hoteles sabe que no puede alzar el tercero.

        ═══ Y LA FRASE VIENE HECHA, PORQUE AQUÍ SE REDACTABA MAL ═══

        Este renglón se escribía aquí a mano, con los cuatro números del marcador, y la
        concordancia la hacía con UN SOLO mazo: con 1 carta en Suerte y 9 en la Caja de Comunidad
        decía «Queda 1 carta en Suerte y 9 en la Caja de Comunidad», cuando el sujeto es coordinado
        y pide «Quedan». Es LITERALMENTE el fallo que la traducción ya tenía anotado y arreglado
        para la sección «La mesa entera», repetido en la copia; y sale justo al final de la
        partida, que es cuando esos cuatro números son lo que se mira.

        Ahora la frase la da `marcadorEnTres` hecha, como la `linea` de cada jugador: un sitio
        que redacta y todos los demás que pintan. Ver `frasesDelConcejo` en la traducción.
      */}
      <p className="letra-chica burgo-lo-del-concejo">{marcador.loDelConcejo.join(' ')}</p>
    </section>
  );
}
