/**
 * RIBERAS EN TRES DIMENSIONES, EN EL ESCRITORIO: el pintor propio del juego sobre el
 * motor de arcade, montado en un lienzo dentro de la mesa de siempre.
 *
 * ═══ QUÉ ES, Y QUÉ NO ═══
 *
 * Riberas sigue siendo un arcade de `mueble: 'tablero'`: su vista trae el
 * `TableroDeclarado` de siempre y `Paneles` lo sigue leyendo en el raíl. Lo que
 * cambia es QUIÉN pinta la parte grande: en vez del `Retablo` genérico, aquí se
 * monta la escena del delta (`escenas/delta.tsx`) con lo que la mesa manda,
 * traducido UNA sola vez en `shared/arcade/juegos/riberas-en-tres.ts`. Es el
 * mismo precedente que La Frente en la app: un pintor propio para un juego,
 * enchufado donde antes iba el mueble genérico, sin tocar el contrato.
 *
 * NO HAY NINGUNA REGLA AQUÍ. Dónde se puede construir lo dice `colocandoEnTres`
 * leyendo las mismas `opciones()` que el reductor exige; qué se manda al soltar
 * viene ya montado dentro de cada sitio; con quién se puede trocar lo dice
 * `truequesPosibles`. Este fichero recoge y manda. Si aquí apareciera un `if`
 * sobre una choza o una vereda, la traducción habría dejado de ser una.
 *
 * ═══ EL SVG NO SE VA: ES EL RESPALDO, Y NO ES OPCIONAL ═══
 *
 * Cuatro cosas pueden faltar y ninguna puede dejar la mesa sin pintar: el `.glb`
 * no llega, el `Canvas` revienta al nacer —sin WebGL, sin contexto—, esto se
 * renderiza en Node sin ventana (`verificar-escritorio`), o LA MESA NO CABE EN
 * TRES DIMENSIONES. En los tres primeros casos y en el último se pinta EL RETABLO
 * DE SIEMPRE, con sus acciones y sus opciones sueltas, y una línea en letra chica
 * de por qué. Es la regla del §5 del Muelle llevada a la partida: si el mundo no
 * arranca, se juega igual.
 *
 * ═══ «SIN DELTA» NO ES «SIN ISLAS»: SON DOS PREGUNTAS ═══
 *
 * `tableroEnTres` devuelve `null` por DOS motivos que no se parecen en nada: el
 * delta aún no se ha repartido —la mesa está reunida y sólo hay «Empezar»— o la
 * mesa tiene cinco o seis colonos y el atlas sólo trae cuatro colores de jugador
 * (`seVeEnTres`). La primera versión leía el `null` como «no hay islas» y pintaba
 * un formulario suelto; con cinco colonos y diecinueve islas repartidas eso eran
 * cincuenta y cuatro botones de «Fundar aquí» sin tablero, sin telón y sin el
 * aviso del turno. Y como la Sala enseña el Muelle mientras la mesa se reúne,
 * esa rama casi sólo se alcanzaba en el caso malo. Así que se pregunta al
 * TABLERO DECLARADO si hay algo que pintar (`caras.length`) y a `seVeEnTres` si
 * cabe en el lienzo; sin islas, formulario; con islas y sin colores, el retablo.
 *
 * ═══ EL MODELO SE PIDE UNA VEZ POR PESTAÑA ═══
 *
 * `tablero.glb` pesa lo que pesa y se pide por HTTP al servidor de juego. Cada
 * revisión de la mesa repinta este componente; volver a pedirlo —o volver a
 * parsearlo— en cada montaje sería un telón negro por jugada. La promesa vive en
 * el módulo: la primera mesa lo trae, las siguientes lo encuentran. Si falló, se
 * suelta la promesa para que la siguiente mesa lo vuelva a intentar.
 *
 * ═══ LA CÁMARA ES LA DEL BANCO, Y ESCUCHA EN LA VENTANA ═══
 *
 * El mirador (`escenas/camara.ts`) va por `ref` y no por estado: son sesenta
 * cambios por segundo mientras se arrastra. Se escucha en la ventana y no en el
 * lienzo por lo que cuenta la cabecera de `camara.ts`: así la cámara llega SIEMPRE
 * después de la escena y puede mirar si la barra o la mano ya se quedaron el gesto
 * (`esDeLaInterfaz`). Y soltar fuera del lienzo también termina el arrastre.
 *
 * Y el ojo se pone SEGÚN LA PROPORCIÓN DEL LIENZO, igual que en el banco: en un
 * monitor no cambia nada, pero en una tableta en retrato o en la rejilla de menos
 * de 900 px —donde el raíl baja y el lienzo se estrecha— sin ella el delta se
 * salía por los lados. Como al alejarse el ojo la niebla fija del banco quedaría
 * DELANTE del mundo y lo blanquearía, la niebla se mide desde el ojo y no desde
 * el centro: se mueve con la cámara en cada fotograma.
 *
 * ═══ Y AHORA SE ACERCA, QUE SON DOS GESTOS Y NO UNO ═══
 *
 * Ver el delta entero desde el aire está bien para decidir la jugada y no sirve
 * para MIRARLA: las casas miden cinco unidades sobre un tablero de doscientas.
 * Así que la rueda acerca hasta media comarca llenando el lienzo. Pero acercarse
 * siempre al centro deja el borde del delta sin poder verse nunca —el tablero se
 * escapa por los lados en cuanto se entra—, así que hace falta también MOVER LA
 * MIRADA. Las dos cosas van juntas: sin la segunda, la primera se queda a medias.
 *
 * El reparto de los botones, que es lo que hay que saber para usarlo:
 *
 *   · LA RUEDA acerca y aleja. El oyente va sobre EL RECUADRO —el `.riberas-lienzo`
 *     que lleva dentro el `<canvas>` y el botón de volver— y con `passive: false`,
 *     porque hay que llamar a `preventDefault`: sin eso el navegador se lleva el
 *     gesto para desplazar la página y la Sala entera baja mientras uno cree estar
 *     haciendo zoom. Es el fallo clásico, y no se ve como un fallo del zoom sino
 *     como una página que se mueve sola. Y va en el recuadro y NO en el `<canvas>`
 *     porque el botón de volver es hermano suyo y no hijo: con el oyente en el
 *     lienzo, girar la rueda encima de ese botón —que es justo donde está el ratón
 *     en cuanto el botón aparece— no pasaba por ningún `preventDefault` y la Sala
 *     se desplazaba precisamente al intentar salir del acercamiento.
 *   · EL ARRASTRE IZQUIERDO sigue girando, exactamente como antes. Es el gesto que
 *     ya conoce quien viene del banco, y sobre todo es el que la escena necesita
 *     libre: coger una pieza de la barra, soltarla en un anillo y coger una carta
 *     de la mano son todos clic izquierdo, y `esDeLaInterfaz` es lo que decide.
 *   · EL ARRASTRE CON EL BOTÓN DERECHO —o con MAYÚSCULAS apretada, para quien no
 *     tenga botón derecho a mano— mueve la mirada por el tablero. Se elige el
 *     derecho justamente porque la escena no lo usa para nada: cualquier reparto
 *     del izquierdo le robaría un gesto a la mano o a la barra. Y lleva su
 *     `contextmenu` con `preventDefault`, o al primer arrastre se abre el menú del
 *     navegador encima del delta.
 *   · DOS DEDOS pellizcan para acercar y pasean la mirada con su punto medio. En
 *     esta casa ningún juego es sólo para PC, y con el dedo no hay `wheel`, no hay
 *     botón derecho y no hay Mayúsculas: sin esto, en una tableta el delta se
 *     giraba y nada más, el botón de volver no aparecía NUNCA —porque nada llamaba
 *     a `alAcercarse`—, y el navegador tampoco podía suplirlo, que
 *     `touch-action: none` ya le había quitado su propio pellizco. El pellizco
 *     entra por `pellizcando`, que recibe una escala y no unos pasos, y el paseo
 *     por el mismo `arrastrandoLaMirada` del botón derecho. Un dedo solo sigue
 *     girando, que es lo que ya hacía y lo que la escena necesita libre.
 *
 * ═══ UN GESTO CADA VEZ, Y QUIEN LO EMPIEZA SE LO QUEDA ═══
 *
 * Los punteros apoyados se cuentan. Apretar el izquierdo en mitad de un
 * desplazamiento con el derecho cambiaba el gesto a girar a media carrera, y el
 * tablero pegaba un bandazo sin que nadie hubiera soltado nada; ahora un arrastre
 * en marcha no se lo lleva nadie hasta que se sueltan TODOS los botones.
 *
 * Y la cuenta de punteros es también lo que distingue dos dedos de dos botones: el
 * ratón manda siempre EL MISMO `pointerId` apriete lo que apriete, así que la
 * cuenta no sube y el segundo botón no abre ningún pellizco; dos dedos son dos
 * punteros, y ésos sí.
 *
 * NINGUNA DE ESAS CUENTAS SE ESCRIBE AQUÍ. `escenas/acercar.ts` da `acercando`,
 * `arrastrandoLaMirada` y `ojoYMira`, y sus topes están medidos desde Node; una
 * cuenta de cámara escrita en este fichero sólo se podría comprobar abriendo la
 * pantalla y mirando. Lo único que se traduce aquí son las unidades del suceso de
 * rueda, que no son pasos y que cada navegador cuenta a su manera.
 *
 * ═══ Y SIEMPRE HAY SALIDA ═══
 *
 * Un zoom sin vuelta atrás atrapa: se entra a mirar una esquina y ya no se sabe
 * volver al tablero. Por eso hay un botón sobre el lienzo, «Ver el tablero
 * entero», que devuelve `comoAlPrincipio()`. Sólo se enseña cuando hace falta
 * —`estaComoAlPrincipio` es falso—: un botón que siempre está no informa de nada.
 *
 * ═══ EL MAZO: DOS MANOS EN EL MISMO LIENZO, Y UNA SOLA COSA COGIDA ═══
 *
 * A la derecha va la mano de BIENES —lo que se gasta— y a la izquierda la del MAZO
 * —lo que se guarda—: son dos manos distintas y las pinta `escenas/cartas.ts`. Aquí
 * sólo se recogen las tres pulsaciones que la escena avisa (coger, jugar, revelar) y
 * se manda el movimiento que la traducción ya trae montado.
 *
 * LO QUE ESTE FICHERO TIENE QUE HACER Y LA ESCENA NO HACE, dicho porque no da error
 * ninguna de las tres veces que se olvida:
 *
 *   1. COGER UNA CARTA SUELTA EL BIEN COGIDO, Y AL REVÉS. La escena avisa de cada
 *      pulsación por su lado y no sabe que la otra mano existe. Sin esto se quedan
 *      las dos levantadas a la vez, con el área de trueque abierta y las casillas del
 *      mazo abiertas encima: dos gestos distintos ofrecidos al mismo tiempo, y el
 *      siguiente clic hace el que no era.
 *   2. COGER LA MISMA OTRA VEZ LA SUELTA. También lo dice el contrato de `<Delta>`, y
 *      también es cosa de quien monta: sin ello no hay forma de arrepentirse.
 *   3. AL CAMBIAR LA REVISIÓN SE SUELTA TODO. Ya se hacía con la barra y la mano de
 *      bienes; la carta del mazo entra en el mismo efecto y por el mismo motivo — una
 *      carta cogida mirando la mesa anterior puede haberse jugado ya.
 *
 * ═══ Y CUANDO JUGAR UNA CARTA PIDE ELEGIR, SE PREGUNTA ═══
 *
 * La Guardia pide a quién se le roba y El Año Bueno qué dos bienes se cogen: son
 * varias opciones distintas para la misma carta, y el naipe soltado en la casilla no
 * dice cuál. Se pregunta con el MISMO menú que ya preguntaba a quién se le propone un
 * trueque —el de abajo—, porque es la misma pregunta con otro título: el juego escribe
 * los rótulos y aquí no se redacta ni una palabra sobre la jugada.
 *
 * Las cuentas no están aquí: `jugadasDeLaCarta` da todas las maneras y
 * `jugadaSinPreguntar` dice si hay UNA sola. Con una se manda; con ninguna no se manda
 * nada, que es lo mismo que hace el trueque. Escribir aquí «si es guardia, pregunta a
 * quién» sería una regla en el cliente, y el día que a quien no tiene bienes dejara de
 * poder robársele, este fichero seguiría ofreciéndolo.
 *
 * ═══ LO QUE LA REVISIÓN DE LA MESA NO TOCA ═══
 *
 * La cámara. Al cambiar `rev` se suelta lo que se tenía en la mano —ver más
 * abajo— y NO se recoloca la vista: quien está mirando una esquina de cerca se
 * queda donde estaba aunque otro juegue. Una cámara que salta con cada jugada
 * ajena marea y hace imposible construir, y el sondeo trae una revisión nueva
 * cada pocos segundos. Por eso el acercamiento vive en una `ref` y no en el
 * estado, y por eso no aparece en ningún efecto que dependa de `puesta.rev`.
 *
 * ═══ LO QUE ESTO NO IMPORTA ═══
 *
 * Nada de `app/` (lo vigila `verify:fronteras`), nada de `drei`, y de
 * `escenas/embarcadero/` sólo lo que decide quién tiene tema (`tema.ts`, y ésa la
 * lee la Sala). La ruta del modelo y la semilla vienen de `escenas/ruta-de-modelos.ts`
 * y `shared/mecanicas/semilla.ts`, que no arrastran ninguna tabla: aquí hubo una copia
 * de cada una, y la de la semilla ya no pasaba a mayúsculas.
 */
import { Component, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, Fog, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Cercania } from '../../escenas/acercar';
import {
  acercando,
  arrastrandoLaMirada,
  CERCANIA_DE_SALIDA,
  comoAlPrincipio,
  estaComoAlPrincipio,
  ojoYMira,
  pellizcando,
} from '../../escenas/acercar';
import type { Mirador } from '../../escenas/camara';
import {
  esDeLaInterfaz,
  MINIMO_PARA_GIRAR,
  MIRADOR_DE_SALIDA,
  ojoDelMirador,
  tirandoDelMirador,
} from '../../escenas/camara';
/* La cinta se mide con la MISMA función que la app y que `verify:escena`: ver `escenas/cinta.ts`. */
import { altoDeLaCinta, BOTON_DE_LA_CINTA, loQueLlevaLaCinta } from '../../escenas/cinta';
import type { RelojCargado, RelojDeLaMesa } from '../../escenas/reloj';
import { Delta, encuadreDelDelta } from '../../escenas/delta';
/*
 * DE QUÉ COLOR SE VE CADA TERRENO. La MISMA tabla que pinta el tablero plano y la que
 * `verify:riberas` mide contra los seis colores de colono: el carril la usa para la barra de
 * terreno de sus cuadrados, y una segunda tabla escrita aquí sería la que se quedara atrás.
 */
import { colorDeTerreno } from '../../escenas/paleta';
import { catalogoDeModelos, unirCatalogos } from '../../escenas/modelos';
import type { CatalogoDeModelos } from '../../escenas/modelos';
import { rutaDeLosDados, rutaDelReloj, rutaDelTablero } from '../../escenas/ruta-de-modelos';
import type { Opcion } from '../../shared/arcade';
import {
  barraEnTres,
  bienesQueSeCambianPor,
  colocandoEnTres,
  comprarEnTres,
  dadosEnTres,
  ABRIR_LA_HOJA,
  ABRIR_LA_HOJA_SIN_CONTESTAR,
  accionesFueraDelPregon,
  EL_COMPONEDOR,
  elComponedor,
  EL_PREGON_DE_LA_MESA,
  elPregonEnTres,
  LAS_MIAS,
  LO_QUE_DOY,
  LO_QUE_PIDO,
  LOS_CERRADOS,
  elPregonSePliega,
  elResumenDelPregon,
  estiajeEnTres,
  glifosDelCarril,
  jugadasDeLaCarta,
  laManoDeLaIzquierda,
  jugadaSinPreguntar,
  laBolsaDelDescarte,
  loQueSeOyeDelVado,
  manoEnTres,
  marcadorEnTres,
  mazoEnLaBarra,
  meToca,
  opcionesFueraDeLaBarra,
  opcionesFueraDeLaBolsa,
  opcionesFueraDeLaMano,
  opcionesFueraDeLasIslas,
  opcionesFueraDeLaMesa,
  NADA_COMPUESTO,
  opcionesFueraDelPregon,
  PARA_CONTESTAR,
  PROPONER,
  opcionesFueraDelTablero,
  renglonDelVado,
  revelarDe,
  seVeEnTres,
  tableroEnTres,
  pasarEnTres,
  tirarEnTres,
  tirarLaFichaEnTres,
  truequesPosibles,
  turnoEnTres,
} from '../../shared/arcade/juegos/riberas-en-tres';
import type {
  CartaDelMazoEnTres,
  ClaseDeJugada,
  ColonoEnElMarcador,
  DadosEnTres,
  ExplicacionDeLaCarta,
  GlifoDelCarril,
  IdDeLaBarra,
  ElComponedor,
  LoQueSeCompone,
  MarcadorEnTres,
  PregonEnTres,
  TableroEnTres,
  TiraDelPregon,
} from '../../shared/arcade/juegos/riberas-en-tres';
/* El sitio de los dados se decide con la misma función que la escena: ver `haySitioParaLosDados`. */
import { ASA_DEL_HUECO, huecosDeLaMesa, loQueSeVe } from '../../escenas/barra';
/* Y el del cartel, con las manos de verdad y no con números copiados: ver `elCartelQueCabe`. */
import { franjaDeLasCartas, loQueSeVeEnLasCartas } from '../../escenas/cartas';
import { huecosDeLaBaraja, loQueSeVeEnLaBaraja } from '../../escenas/baraja';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import type { MovimientoDeclarado, TableroDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { CON_ATAJO, Formulario, hayAlgoQuePintar, loQueSePuedePintar, usarLosAtajos } from './formulario';
import type { LaMesa, MesaVista, ResultadoDelMovimiento } from './mesa';
import type { ArcadeDelCatalogo } from './muebles';
import { opcionesSueltas } from './plan';
import { loQueSeDiceDeUnFallo } from './red-de-seguridad';
import {
  cuantoQueda,
  cuantoQuedaEnLaCinta,
  elPlazoAprieta,
  LETRAS_DEL_RELOJ_DE_LA_CINTA,
  msHastaQueCambieElRotulo,
} from './relojes';
import { AccionesDelTablero, Retablo } from './retablo';

/**
 * De dónde se trae el tablero: la única ruta, la de `escenas/ruta-de-modelos.ts`, que
 * es la que sirve `server/src/routes/modelos.ts`. Relativa: en desarrollo la reenvía el
 * proxy de Vite y en producción es el mismo Node que sirve esta página.
 */
const RUTA_DEL_TABLERO = rutaDelTablero();
/** Y los dados, en su fichero de unos kB, por la misma puerta. Ver `rutaDeLosDados`. */
const RUTA_DE_LOS_DADOS = rutaDeLosDados();
const RUTA_DEL_RELOJ = rutaDelReloj();

/** El azul del cielo de mediodía, que es también el color al que se funde la niebla. */
const COLOR_DEL_CIELO = '#9ec9e2';

/** El título de este pintor sobre el lienzo. Es chrome de la Sala, no una palabra del juego. */
const TITULO_DE_LO_QUE_SE_HACE = 'Lo que puedes hacer';

/**
 * LA SALIDA DEL ACERCAMIENTO, con todas sus letras y no un icono.
 *
 * Es chrome de la Sala igual que el título de arriba: no nombra nada del juego, así
 * que puede escribirse aquí. Y es un rótulo y no una lupa tachada porque quien se ha
 * perdido en una esquina del delta necesita leer la salida, no adivinarla.
 */
const VOLVER_AL_TABLERO_ENTERO = 'Ver el tablero entero';

/**
 * LAS DOS CARAS DEL BOTÓN DE LA MESA, con todas sus letras aunque en pantalla se vea una
 * flecha: es lo que oye quien no ve el lienzo, y lo que se lee al posar el ratón.
 *
 * Chrome de la Sala como los dos de arriba: no nombran nada del juego —«la mesa» es el
 * mueble de la pantalla, no una regla de Riberas—, así que pueden escribirse aquí. Y son
 * dos frases y no una con un «alternar»: el nombre de un botón dice lo que va a pasar al
 * pulsarlo, no lo que el botón es.
 */
const RECOGER_LA_MESA = 'Recoger la mesa';
const SACAR_LA_MESA = 'Sacar la mesa';

/**
 * EL RECUADRO DEL MUNDO, con su nombre escrito UNA vez.
 *
 * Es la caja que lleva dentro el `<canvas>` y el botón de volver, y hacen falta las dos
 * cosas a la vez: el JSX la pinta y la cámara la BUSCA —`closest`— para colgar de ella el
 * oyente de la rueda, que no puede ir en el lienzo porque el botón es hermano suyo. Con
 * el nombre escrito dos veces, renombrar la clase en la hoja de estilo dejaría la rueda
 * colgada del lienzo otra vez y sin un solo error: la Sala volvería a desplazarse sola.
 */
const RECUADRO_DEL_LIENZO = 'riberas-lienzo';

/**
 * EL CAJÓN Y SU VELO, con el nombre escrito UNA vez cada uno, Y POR EL MISMO MOTIVO QUE EL
 * RECUADRO: los busca la cámara.
 *
 * El oyente de la rueda cuelga del recuadro y llama a `preventDefault` SIEMPRE, que es lo
 * que impide que la Sala se desplace mientras uno cree estar acercándose. Desde que dentro
 * del recuadro hay un cajón que se desplaza por dentro, ese `preventDefault` se lo comía:
 * girar la rueda sobre la crónica acercaba el delta detrás del cajón y la crónica no se
 * movía un renglón. Así que la rueda mira DE QUIÉN es el suceso:
 *
 *   · dentro de una caja que se desplaza por dentro —el cajón, el CARRIL de la cinta y el
 *     MENÚ de elegir—, no hace nada de nada —ni `preventDefault` ni acercamiento—, para
 *     que el navegador la desplace como desplaza cualquier caja (`overscroll-behavior:
 *     contain` en la hoja impide que al llegar al final la rueda se la lleve la mesa);
 *   · sobre el velo, `preventDefault` y NADA MÁS: las dos cajas modales de este recuadro
 *     son modales, y modal quiere decir que con ellas abiertas no se toca lo de debajo,
 *     tampoco la cámara;
 *   · en cualquier otro sitio del recuadro —el lienzo, el botón de volver, el de recoger,
 *     la cinta— se acerca, que es lo que hacía antes.
 *
 * LAS CINCO SE NOMBRAN JUNTAS Y NO UNA A UNA, y eso es lo que evita el fallo de la fase: el
 * carril nació con dieciocho botones y `overflow-x: auto`, y con la rueda mirándole sólo al
 * cajón, girarla encima del carril acercaba el delta y el carril no se movía —que es
 * exactamente lo que le pasó a la crónica cuando el cajón era el que faltaba—. El PREGÓN es
 * la cuarta y es la que más lo necesita: no es modal, así que se lee con el tablero vivo
 * debajo, y sin nombrarla aquí girar la rueda sobre una propuesta acercaría el delta.
 *
 * Y LA QUINTA ES EL COMPONEDOR DEL LIENZO, que es la que más alto tiene de todas: ocho
 * renglones del suelo de toque son 374 puntos con la raíz de esta casa, y en el lienzo más
 * bajo de la lista (288×317, menos la cabecera de la Sala) no caben ni cinco. O sea que ahí
 * SIEMPRE hay que rodar por dentro, y sin nombrarla aquí girar la rueda sobre los cinco
 * renglones acercaría el delta detrás del velo sin mover un renglón — que es exactamente lo
 * que le pasó a la crónica y luego al carril.
 */
const EL_CAJON = 'riberas-cajon';
const EL_VELO = 'riberas-velo';
const EL_CARRIL = 'riberas-carril';
const EL_MENU = 'riberas-elige';
const EL_PREGON = 'riberas-pregon';
/**
 * LA CAJA DEL COMPONEDOR EN EL LIENZO, que no es la misma clase que la sección del retablo
 * (`.riberas-componedor`): allí es un panel en flujo dentro de una página que rueda, y aquí
 * es una caja modal colocada sobre el recuadro y a todo su ancho. Lo que sí es lo mismo son
 * las TRIPAS, y por eso las pinta un solo componente en los dos sitios.
 */
const EL_COMPONEDOR_EN_EL_LIENZO = 'riberas-componedor-hoja';
/** Las que se desplazan por dentro: la rueda es suya y no de la cámara. */
const SE_DESPLAZAN_SOLAS = [EL_CAJON, EL_CARRIL, EL_MENU, EL_PREGON, EL_COMPONEDOR_EN_EL_LIENZO];

/**
 * EL CAMPO VERTICAL DE LA CÁMARA, en radianes: los 45° del `fov` del `Canvas` de abajo. La
 * escena lo lee de la cámara de verdad; esta pantalla lo necesita ANTES de montarla para
 * preguntar a `huecosDeLaMesa` si caben los dados, y tiene que ser el mismo número.
 */
const CAMPO_DE_LA_CAMARA = (45 * Math.PI) / 180;

// ---------------------------------------------------------------------------
// El cartel que explica el naipe: dónde cabe y cuánto cabe
// ---------------------------------------------------------------------------

/**
 * ═══ LA RAÍZ DE ESTA CASA VALE 17 PUNTOS, Y ESE DATO YA SE ESCRIBIÓ MAL UNA VEZ ═══
 *
 * `estilo.css` abre con `html { font-size: 106.25%; }` y su propia cabecera dice por qué:
 * «los 17 px de siempre cuando el navegador viene con sus 16», y va en porcentaje para no
 * anular la preferencia de tamaño de letra del navegador. El diseño de este cartel
 * (`docs/LAS-CARTAS-SE-EXPLICAN.md`) escribió «0,82 rem sobre 16, o sea 13 puntos» y sobre
 * esos 13 levantó sus dos tablas de letra: con el rem malo salían 27 letras por renglón
 * donde hay 25 y renglones de 18 donde son de 19, o sea que el sitio quedaba SOBRESTIMADO
 * por los dos lados y una frase de tres renglones pasaba por una de dos.
 *
 * Se escribe aquí, una vez, y de aquí sale todo lo demás. Si alguien toca la raíz de la
 * hoja sin tocar esto, `verify:escritorio` lo dice: afirma que las dos cifras coinciden.
 */
export const RAIZ_DE_LA_CASA = 17;
/**
 * ═══ Y ESOS 17 SON EL SUELO, NO LA MEDIDA: LA DE VERDAD SE LE PIDE AL NAVEGADOR ═══
 *
 * `106.25 %` va en porcentaje justamente para que la preferencia de tamaño de letra del
 * navegador siga mandando (lo dice el punto 2 de la cabecera de `estilo.css`). O sea que
 * quien la tenga en «muy grande» pinta el cartel con una letra bastante mayor que 13,94
 * puntos, mientras el alto máximo que esta pantalla calcula seguía saliendo de un 17
 * clavado, y con `overflow: hidden` el último renglón se corta SIN NINGUNA SEÑAL, que es
 * lo único que la cabecera de `elCartelQueCabe` promete no hacer nunca.
 *
 * Así que la raíz se mide donde se mide el lienzo, y el 17 se queda como lo que es: el
 * valor con el que se compone la hoja y el que vale en Node, donde no hay `document` y
 * donde los dos comprobadores miden. `verify:escritorio` sigue afirmando que ese número y
 * el `106.25 %` de la hoja dicen lo mismo.
 */
function raizDelNavegador(): number {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return RAIZ_DE_LA_CASA;
  const medida = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(medida) && medida > 0 ? medida : RAIZ_DE_LA_CASA;
}
/** El cuerpo de `.opcion-ayuda`, que es la letra con la que se pinta el cartel: `0.82rem`. */
const CUERPO_SOBRE_LA_RAIZ = 0.82;
/**
 * EL ANCHO DE UNA LETRA, en partes del cuerpo. El 0,6, que es el único ancho de letra que
 * esta casa tiene escrito (`tamanoDeTexto`, `app/src/arcade/retablo.tsx`). No es la
 * medida de una fuente concreta y no pretende serlo: es la regla con la que se decide
 * cuántas frases ENTERAS caben, y para eso lo que hace falta es que las dos pantallas y
 * los dos comprobadores usen el mismo número.
 */
const ANCHO_SOBRE_EL_CUERPO = 0.6;
/** El renglón: `ceil(cuerpo · 1,35)`, el mismo interlineado con el que se pinta. */
const RENGLON_SOBRE_EL_CUERPO = 1.35;
/** Doce puntos de margen por lado, dentro de la caja. Los mismos arriba, abajo y a los lados. */
const MARGEN_DEL_CARTEL = 12;
/** Y ocho puntos de aire entre el pie del cartel y el techo del asa de la barra. */
const AIRE_SOBRE_EL_ASA = 8;

/**
 * ═══ OCHO LETRAS: EL SUELO DE LA FRASE DE LA CINTA, Y DE DÓNDE SALE ESE OCHO ═══
 *
 * La frase de la cinta es `tablero.aviso`, la única línea de estado de esta pantalla: dice
 * de quién es el turno y en qué paso está («Te toca: tira los dados.», «Turno de Ana: está
 * por tirar.»). Recortada con puntos suspensivos sigue sirviendo —el texto entero va en la
 * región viva y se lee al posar el ratón—, pero por debajo de un puñado de letras deja de
 * ser una frase recortada y pasa a ser una raya: con tres letras no se distingue «Te…» de
 * «Tu…».
 *
 * Ocho es lo que hace falta para que se vea la primera PALABRA de las que el juego escribe
 * ahí, que es la que distingue las ramas de `avisoDe`: «Te toca», «Turno de», «Coloca»,
 * «Gana», «El delta». No es una medida de tipografía: es el suelo por debajo del cual esta
 * pantalla prefiere dejar el «‹» fuera de la cinta antes que quedarse sin línea de estado.
 * `loQueLlevaLaCinta` lo recibe en PUNTOS —ver su cabecera: en `escenas/` no hay letras— y
 * este cliente se lo calcula con la raíz de VERDAD del navegador, la misma con la que se
 * mide el cartel, para que la preferencia de tamaño de letra entre también en esta cuenta.
 */
const LETRAS_MINIMAS_DE_LA_FRASE = 8;

/** Los puntos que ocupan esas ocho letras con la letra con la que la cinta las pinta. */
export function huecoMinimoDeLaFrase(raiz: number): number {
  return LETRAS_MINIMAS_DE_LA_FRASE * CUERPO_SOBRE_LA_RAIZ * raiz * ANCHO_SOBRE_EL_CUERPO;
}

/**
 * ═══ Y EL LADO DE LOS BOTONES DE LA CINTA, QUE TAMPOCO SON 44 EN ESTA CASA ═══
 *
 * `BOTON_DE_LA_CINTA` vale 44, que es el suelo de toque en puntos y lo que mide en un
 * cliente que pinte puntos. Esta casa no pinta puntos: escribe `2.75rem`, que es como
 * escribe los 44 —`enRem(puntos) = puntos/16`, la misma cuenta con la que se escriben el
 * lado y el margen de `MANDO_DE_RECOGER`—, y con la raíz de esta casa (`106.25 %`, o sea 17)
 * eso son 46,75.
 *
 * MEDIDO en el navegador antes de escribir esto, en un lienzo de 522,6×130,2:
 * `loQueLlevaLaCinta` decía que a la frase le quedaban 86,2 puntos y la caja pintada medía
 * 80,5. No es un decimal: es que la cuenta hacía crecer la letra con la preferencia del
 * navegador y NO hacía crecer los botones, así que el error se abre justo para quien tiene
 * la letra grande, que es el que peor lo lleva. El reparto se le da ya en la unidad en que
 * se pinta, y así los tres trozos de la cinta miden lo que la cuenta dice.
 */
const RAIZ_DE_UN_NAVEGADOR_DE_SERIE = 16;
export function ladoDelBotonDeLaCinta(raiz: number): number {
  return (BOTON_DE_LA_CINTA * raiz) / RAIZ_DE_UN_NAVEGADOR_DE_SERIE;
}

/**
 * ═══ Y LO QUE SE LLEVA EL RELOJ, QUE ES EL CUARTO INQUILINO DE LA CINTA ═══
 *
 * Sale de la misma regla que las ocho letras de la frase —letras por cuerpo por ancho de
 * letra— y con la misma raíz de verdad del navegador, porque es el mismo problema: si esta
 * cuenta no crece con la preferencia de tamaño de letra, el reparto de la cinta miente justo
 * para quien tiene la letra grande.
 *
 * Las letras no se escriben aquí: las dice `LETRAS_DEL_RELOJ_DE_LA_CINTA`, que vive al lado
 * de la función que escribe el rótulo y que `verify:escritorio` barre por todo el eje del
 * tiempo en vez de creérselas. Escribir un seis aquí sería tener dos números para lo mismo,
 * y el que se quedaría atrás es éste.
 *
 * Y lleva su propio aire a la izquierda, que la hoja pinta: la cinta no tiene `gap` a
 * propósito —todo lo que la regla añada sale del trozo de la frase sin que la cuenta se
 * entere— así que el hueco entre el reloj y la frase se descuenta AQUÍ y no allí.
 */
const AIRE_TRAS_EL_RELOJ_EN_LETRAS = 0.75;
export function huecoDelRelojDeLaCinta(raiz: number): number {
  return (
    (LETRAS_DEL_RELOJ_DE_LA_CINTA + AIRE_TRAS_EL_RELOJ_EN_LETRAS) *
    CUERPO_SOBRE_LA_RAIZ *
    raiz *
    ANCHO_SOBRE_EL_CUERPO
  );
}

/** Lo que la cinta pinta del plazo: el rótulo corto, la frase entera y si ya aprieta. */
export interface ElRelojDeLaCinta {
  readonly corto: string;
  readonly entero: string;
  readonly aprieta: boolean;
}

/**
 * ═══ EL RELOJ DE LA CINTA, Y POR QUÉ NO LATE UNA VEZ POR SEGUNDO ═══
 *
 * `LaFicha` —el reloj del cajón, el único que había— se repinta con un `setInterval` de
 * 1000 ms mientras hay plazo. Para una ficha dentro de un cajón cerrado eso ya era caro; en
 * la CINTA es otra cosa: este componente pinta el delta entero, así que un latido por
 * segundo es un render del tablero por segundo durante toda la partida, con la pestaña
 * delante y sin que el rótulo cambie —en una mesa de «La Larga» el texto sólo tiene
 * granularidad de horas—.
 *
 * `msHastaQueCambieElRotulo` existe en `relojes.ts` exactamente para esto, con el ejemplo
 * escrito en su cabecera, y hasta hoy NO LO LLAMABA NADIE. Se llama aquí: una espera por
 * cambio de texto en vez de una por segundo, `Infinity` cuando ya no va a cambiar nunca
 * —plazo vencido o dato roto— y entonces no se programa nada. En el último minuto sigue
 * dando 1000 ms o menos, así que la cuenta al segundo no se pierde donde importa.
 *
 * Devuelve `null` cuando NO HAY NADA QUE CONTAR, que son tres casos distintos y ninguno es
 * un error: la mesa no tiene plazo (`venceEn === null`), la partida ya terminó, o el dato no
 * llegó. Los dos primeros son mesas normales; el tercero se distingue del vencido en el
 * rótulo, no aquí. Con `null` la cinta no pinta reloj y no le descuenta ni un punto a la
 * frase, que es exactamente la cinta de antes.
 */
function usarElRelojDeLaCinta(venceEn: number | null, terminada: boolean): ElRelojDeLaCinta | null {
  const hayReloj = venceEn !== null && !terminada;
  /*
   * EL LATIDO ES TAMBIÉN LA DEPENDENCIA, y esa es la mitad que se olvida: con un
   * `setTimeout` en vez de un `setInterval` hay que volver a programar la siguiente espera
   * DESPUÉS de cada repintado. Sin `latido` en la lista, el efecto se dispararía una sola
   * vez y el reloj se quedaría clavado en el primer tramo — que se ve como un reloj parado,
   * no como un fallo del temporizador.
   */
  const [latido, latir] = useState(0);
  useEffect(() => {
    if (!hayReloj || venceEn === null) return;
    const espera = msHastaQueCambieElRotulo(venceEn - Date.now());
    if (!Number.isFinite(espera)) return;
    const t = setTimeout(() => {
      latir((n) => n + 1);
    }, espera);
    return () => {
      clearTimeout(t);
    };
  }, [hayReloj, venceEn, latido]);

  if (!hayReloj || venceEn === null) return null;
  const quedan = venceEn - Date.now();
  return {
    corto: cuantoQuedaEnLaCinta(quedan),
    entero: cuantoQueda(quedan),
    aprieta: elPlazoAprieta(quedan),
  };
}

/**
 * LOS RÓTULOS DE LA CINTA, con todas sus letras aunque en pantalla se vean dos glifos.
 *
 * Chrome de la Sala como los de arriba, y por lo mismo: «la mesa» y «el marcador» son
 * muebles de la pantalla, no reglas de Riberas. El «‹» y el «≡» no se leen en voz alta —el
 * nombre va en `aria-label`—, y el de la ficha lleva DENTRO mis puntos porque un lector no
 * ve el número que hay pintado al lado del raíl de color.
 */
const SALIR_DE_LA_MESA = 'Volver a la Sala de Arcade';
const ABRIR_EL_CAJON = 'Abre el marcador completo';
const CERRAR_EL_CAJON = 'Cierra el marcador completo';
/** El nombre del cajón, que es un `dialog` y sin nombre se anuncia «diálogo» a secas. */
const EL_CARRIL_DE_LA_MESA = 'El carril de la mesa';

/** Dónde va el cartel y qué frases caben dentro, todo en puntos de pantalla. */
export interface CartelAlPie {
  /** Desde el canto izquierdo del lienzo hasta el suyo. */
  izquierda: number;
  /** Desde el canto derecho del lienzo hasta el suyo, que es lo que pide `right` en CSS. */
  derecha: number;
  /** Desde el canto de abajo del lienzo, que es lo que pide `bottom`. */
  abajo: number;
  /** Lo más alto que puede llegar a ser sin comerse el tablero: la mitad del alto libre. */
  caja: number;
  /** Las frases ENTERAS que caben, en su orden. Nunca una a medias. */
  frases: readonly string[];
}

/** Envolver con avaricia, que es como envuelve un párrafo: cuántos renglones ocupa. */
function renglonesDeLaFrase(frase: string, letrasPorLinea: number): number {
  if (letrasPorLinea <= 0) return Number.POSITIVE_INFINITY;
  let lineas = 1;
  let usado = 0;
  for (const palabra of frase.split(' ')) {
    if (palabra.length > letrasPorLinea) return Number.POSITIVE_INFINITY;
    if (usado === 0) usado = palabra.length;
    else if (usado + 1 + palabra.length <= letrasPorLinea) usado += 1 + palabra.length;
    else {
      lineas++;
      usado = palabra.length;
    }
  }
  return lineas;
}

/**
 * A CUÁNTOS PUNTOS DEL CANTO DE ARRIBA ESTÁ EL TECHO DEL ASA DE LA BARRA.
 *
 * ═══ POR QUÉ ES UNA FUNCIÓN SUYA Y NO SEIS LÍNEAS DENTRO DEL CARTEL ═══
 *
 * Porque desde el pregón son DOS las cajas que se apoyan en esa raya: el cartel de un naipe
 * crece hacia arriba desde ella, y el pregón cuelga de la cinta hasta ella. Copiada, la
 * segunda copia se queda con el reparto viejo el día que la barra cambie de sitio, y lo que
 * se ve entonces no es un error: es un pregón por encima de las piezas de construir.
 *
 * El asa vive DENTRO del lienzo y por encima del inset de abajo, así que aquí no se resta
 * ningún inset —es el error que `docs/EL-TRUEQUE-DE-RIBERAS.md` §4.1 corrigió en tres
 * lienzos—. Y se le pregunta a `huecosDeLaMesa` con los huecos de VERDAD, no con un cuatro
 * escrito a mano: el asa sube cuando hay menos piezas. Sin barra ninguna, el canto de abajo.
 */
export function techoDelAsaEnPuntos(
  lienzo: { ancho: number; alto: number },
  cuantosHuecos: number,
): number {
  if (lienzo.ancho <= 0 || lienzo.alto <= 0) return 0;
  const proporcion = lienzo.ancho / lienzo.alto;
  const { piezas } = huecosDeLaMesa(cuantosHuecos, CAMPO_DE_LA_CAMARA, proporcion, lienzo.alto);
  const hueco = piezas[0];
  if (hueco === undefined) return lienzo.alto;
  const vistoEnLaBarra = loQueSeVe(CAMPO_DE_LA_CAMARA, proporcion);
  return (
    ((vistoEnLaBarra.alto / 2 - (hueco.y + (hueco.lado / 2) * ASA_DEL_HUECO.alto)) / vistoEnLaBarra.alto) *
    lienzo.alto
  );
}

/**
 * DÓNDE CABE EL CARTEL DE UN NAIPE, Y CUÁNTAS DE SUS TRES FRASES ENTRAN HOY.
 *
 * ═══ LA BANDA NO SE DIBUJA A OJO: SE LE PREGUNTA A LAS TRES MANOS ═══
 *
 * El cartel va pegado al canto de abajo, entre el canto derecho de la franja de las cartas
 * y el canto izquierdo de la mano de bienes, y por encima del asa de la barra. Los tres
 * cantos salen de las MISMAS funciones que la escena usa para repartir —`franjaDeLasCartas`,
 * `huecosDeLaBaraja` y `huecosDeLaMesa`—, exactamente como `haySitioParaLosDados` le
 * pregunta a `huecosDeLaMesa` si caben los dados. Copiar aquí un porcentaje sería tener dos
 * repartos: el día que la franja se ensanche, el cartel se quedaría encima de la mano.
 *
 * ═══ Y EL PRESUPUESTO SE CUENTA EN RENGLONES, NO EN CARACTERES ═══
 *
 * Con la banda sale el ancho de renglón (letras por línea), con el alto sale cuántos
 * renglones hay, y con las dos cosas se envuelve cada frase y se van metiendo ENTERAS
 * mientras quepan. No se corta ninguna por la mitad ni se ponen puntos suspensivos: media
 * frase de ayuda es peor que ninguna. Con dos frases se leen «qué hace» y «qué consigues»;
 * con una, «qué hace», que es la que Miguel nombró primero. Las que no se pintan se oyen
 * igual: están las tres, siempre, en la lista `.riberas-solo-apoyo`.
 *
 * Medido con las manos de verdad en los dieciocho lienzos de `LIENZOS` (`verify:escritorio`).
 *
 * ═══ Y CUÁL ES EL LIENZO MÁS APRETADO DE ESTE CLIENTE: YA NO HAY SUELO DE ALTO ═══
 *
 * La lista se comparte con el móvil y por eso empieza por 320×360, donde caben DOS frases:
 * el renglón da 25 letras, cada frase ocupa dos y hay cinco renglones para seis. Ese lienzo
 * aquí NO SE PODÍA DAR mientras `.riberas-lienzo` llevó un suelo de alto: ese número, y no
 * la ventana, decidía lo bajo que podía llegar a ser el recuadro.
 *
 * Ese suelo ya no está. Con la página de pie (la sección «La página de pie» de `estilo.css`)
 * el recuadro vale la ventana entera menos la cabecera de la Sala, así que una ventana baja
 * da un lienzo bajo DE VERDAD, y los dos que este cliente da en el extremo son 288×355 —con
 * la cabecera en un renglón— y 288×317 —con la cabecera partida en dos—. Los 288 de ancho
 * salen de sumas y no de una corazonada: WCAG 1.4.10 pone el suelo del documento en 320
 * puntos (lo dice el punto 1 de la cabecera de `estilo.css`, que ya arregló la rejilla por
 * eso), `.dentro` se lleva `clamp(1rem, 4vw, 2.5rem)` por lado, a 320 manda el mínimo de 17
 * puntos, y el recuadro es el 100 % de lo que queda, o sea 286; se mide con 288 por dejar el
 * margen del lado seguro. Ahí el renglón cabe 20 letras contra las 25 del móvil.
 *
 * Y EL ALTO DEL LIENZO NO MANDA TANTO COMO PARECE, que es lo que sorprende al leer la tabla:
 * 288×355 y 288×317 dan LO MISMO —una frase— aunque se lleven 38 puntos, y el que da dos es
 * 288×420. No es un error de medida. La banda del cartel no la marca el alto del lienzo: la
 * marca el techo del asa de la barra, y el asa la reparte `huecosDeLaMesa` con el alto EN
 * PUNTOS —los dados caben o no caben según ese número—, así que un lienzo más bajo puede
 * dejar tanta banda libre como uno más alto. Antes de que la cinta existiera esos dos ni
 * siquiera empataban: 317 daba DOS y 355 daba UNA, o sea que el más bajo daba más. Quien
 * toque el reparto de la barra tiene que volver a mirar estas cifras.
 *
 * Con la cinta sola —un turno corriente, sin nada que el tablero no pinte— en 14 de los 18
 * lienzos de la lista caben las tres frases. En los otros cuatro no: una en 288×355, una en
 * 288×317, dos en 288×420 y dos en el 320×360 del móvil. Con el CARRIL puesto —el estiaje por
 * mover, o el descarte— son 13 de los 18. Esos números NO se escriben a mano:
 * `verify:escritorio` los saca de `LIENZOS` midiéndolos con las manos de la escena y exige que
 * esta cabecera los diga. Ya se desfasaron una vez, y una cuenta escrita para que el siguiente
 * no tenga que medir es justo la que no puede estar mal.
 *
 * ═══ Y QUÉ PASA EN EL EXTREMO DE LA PREFERENCIA DE LETRA: EL CARTEL DESAPARECE ═══
 *
 * La raíz se le pide al navegador (`raizDelNavegador`), así que quien tenga la letra en «muy
 * grande» mide con bastante más de 17. Medido con las ONCE frases de verdad, y no con frases
 * cortas de mentira, que es lo que este comprobador hacía y por lo que el extremo no se veía:
 *
 *   · en 288×420, con raíz 20 se pintan DOS en todos los naipes, con 24 UNA, y a partir de
 *     unos 27 empiezan a salir naipes SIN CARTEL; con 34 no se pinta ninguno;
 *   · en 320×360 el corte llega antes: con 20 ya hay naipes de UNA frase, y con 34, ninguno.
 *
 * O sea que el usuario para el que se hizo el respeto a la preferencia es el que se queda sin
 * cartel. Y eso está bien, y es lo que esta función promete: antes ninguno que uno cortado a
 * la mitad sin avisar. Lo que lo hace aceptable es que EL TEXTO NO SE PIERDE: la lista
 * `.riberas-solo-apoyo` se pinta desde `cartasDelMazo` y no mira `cartel` ni una vez, así que
 * las tres frases de los once naipes siguen ahí, con o sin cartel, y siguen siendo lo que oye
 * quien no puede pasar el cursor por un lienzo. Las dos mitades las compra `verify:escritorio`.
 *
 * ═══ LO QUE LE COME LA BANDA POR ARRIBA: UNA COSA QUE YA ESTÁ Y OTRA QUE NO ═══
 *
 *   · LA CINTA DEL TERCIO CENTRAL (§2.2) YA ESTÁ, y son 44 puntos pegados al canto de
 *     ARRIBA del recuadro que se restan al alto libre ANTES de partirlo por la mitad (ver
 *     `altoLibre`, aquí abajo). Aquí estuvo escrito lo que iba a costar, y la predicción
 *     era ésta: «en 320×360 se queda en UNA frase y en el SE apaisado en dos; los otros
 *     trece no pierden nada». MEDIDO, no fue eso: 320×360 se queda en DOS, el SE apaisado
 *     no pierde ninguna, y el único de los dieciocho que baja un escalón es 288×317, de dos
 *     a una. Queda escrito el fallo y no sólo la cifra buena, porque una cuenta hecha a ojo
 *     que nadie vuelve a medir es la que después se cita como si fuera una medida.
 *
 *   · Y LA SEGUNDA TIRA, EL CARRIL DE LOS BOTONES SUELTOS, YA ESTÁ TAMBIÉN. Aquí ponía que
 *     seguía «sin existir» y que quien se la llevara a la cinta tendría que sumar esos 44 y
 *     volver a medir los dieciocho lienzos. Es lo que se ha hecho: el alto lo da
 *     `altoDeLaCinta(conCarril)` en `escenas/cinta.ts` —44 sin carril, 88 con él— y entra por
 *     la puerta de esta función, porque el carril SÓLO existe cuando el juego ofrece algo
 *     que el tablero no pinta. Con el estiaje por mover son dieciocho botones y el carril
 *     está; en un turno corriente `fuera` trae uno o ninguno.
 *
 *     LO QUE CUESTA, MEDIDO EN LOS DIECIOCHO LIENZOS Y NO PREDICHO: con la cinta sola caben
 *     las tres frases en 14 de los 18; con el carril puesto, en 13 de los 18. Ese «uno»
 *     de diferencia esconde más movimiento del que parece, y se escribe entero —uno se leería
 *     como «casi no cuesta»—: de los cinco que se quedan cortos con el carril, CUATRO bajan
 *     un escalón. El SE apaisado (568×320) pierde su primera frase y pasa de tres a dos, que
 *     es justo el lienzo que con la cinta sola no perdía ninguna; 320×360 y 288×420 pasan de
 *     dos a una; 288×355 se queda en la que ya tenía.
 *
 *     Y EL QUINTO SE QUEDA SIN CARTEL: en 288×317 —el lienzo más apretado de este cliente,
 *     con la cabecera de la Sala partida en dos renglones— no cabe ni una frase entera y
 *     esta función devuelve `null`. Eso NO es un fallo: es lo que promete su cabecera, antes
 *     ninguno que uno cortado a la mitad sin avisar, y el texto no se pierde —las tres
 *     frases de los once naipes siguen en la lista `.riberas-solo-apoyo`, que se pinta desde
 *     `cartasDelMazo` y no mira `cartel` ni una vez—. Y sólo pasa MIENTRAS hay botones
 *     sueltos: en cuanto el estiaje se mueve, el carril se va y el cartel vuelve.
 *
 *     Los dos números —catorce y trece— los saca `verify:escritorio` de medir `LIENZOS` con
 *     las manos de la escena y exige que esta cabecera los diga: no están escritos a mano.
 *   · Y EL PREGÓN DEL TRUEQUE (`docs/EL-TRUEQUE-DE-RIBERAS.md` §4.1) YA ESTÁ, y con él la
 *     regla que aquel diseño y éste comparten, que es de EXCLUSIÓN y no de reparto: CON EL
 *     PREGÓN PINTADO ESTA FUNCIÓN DEVUELVE `null`. Aquí ponía que no estaba escrita porque
 *     el pregón no existía; ahora entra por la puerta como el carril, y lo que la hace
 *     obligatoria en vez de opcional está medido: con la cinta a 88 y el cartel puesto, al
 *     pregón le quedan 32 puntos en el SE apaisado —CERO tiras—, 48 en 320×360 y 74,8 en
 *     288×420, o sea UNA en los dos mejores. Sin cartel son 3, 4 y 5. No es que las dos
 *     cosas quepan apretadas: es que con el cartel no hay pregón, y el pregón es una
 *     jugada que caduca al acabar el turno de quien la propuso.
 *
 *     Y NO COMPITEN DE VERDAD POR LA ATENCIÓN, que es lo que hace que la exclusión no
 *     duela: el cartel se pide señalando un naipe PROPIO —un gesto de mi turno— y el pregón
 *     existe justo cuando juega otro. Y desde la hoja de una propuesta el cartel vuelve a
 *     caber entero, porque la hoja es modal y el pregón deja de estar pintado debajo.
 *
 * ═══ LO QUE SE MIDE QUIETO, Y CUÁNTO COSTARÍA NO HACERLO ═══
 *
 * La mano de bienes se mide QUIETA —`apunta` a `null`, sin áreas de trueque—, que es lo
 * que dice el diseño: mientras hay cartel hay un naipe cogido, y coger un naipe suelta el
 * bien y cierra las áreas (`alCogerCartaDelMazo`). Medido lo que eso cuesta en el peor
 * caso: con el cursor sobre la mano de bienes sus cartas asoman 17,5 puntos más hacia
 * dentro en 320×360 (15,6 en el SE apaisado), o sea que el cartel taparía esa uña de
 * naipe. No come el toque —no recibe punteros— y sólo pasa mientras el cursor está en la
 * mano contraria a la que se está leyendo.
 *
 * Y con cuántos huecos de barra: con los de VERDAD (`cuantosHuecos`), no con un cuatro
 * escrito aquí, por lo mismo que `huecosDeLaMesa` lo pide — el asa sube cuando hay menos
 * piezas, y un cartel medido contra cuatro se metería dentro del asa de una barra de tres.
 *
 * Devuelve `null` cuando no hay ni un renglón: entonces no se pinta nada, que es mejor que
 * pintar una caja vacía encima del tablero.
 */
export function elCartelQueCabe(
  lienzo: { ancho: number; alto: number },
  cuantosHuecos: number,
  explicacion: ExplicacionDeLaCarta,
  raiz: number = RAIZ_DE_LA_CASA,
  /*
   * SI LA CINTA LLEVA HOY SU SEGUNDA TIRA. No es una preferencia: el carril existe cuando
   * `fuera` trae algo, y entonces la caja opaca de arriba mide 88 puntos en vez de 44. Entra
   * por la puerta y no se pregunta aquí dentro, porque quién tiene botones sueltos lo sabe el
   * pintor y no esta cuenta.
   */
  conCarril = false,
  /*
   * Y SI EL PREGÓN DEL TRUEQUE ESTÁ PINTADO. Entra por la puerta como el carril y por lo
   * mismo: quién tiene propuestas vivas lo sabe el pintor, no esta cuenta. Ver la cabecera:
   * con el cartel puesto no queda banda para una sola tira en el peor lienzo.
   */
  conPregon = false,
): CartelAlPie | null {
  if (conPregon) return null;
  if (lienzo.ancho <= 0 || lienzo.alto <= 0) return null;
  const proporcion = lienzo.ancho / lienzo.alto;
  /* La letra con la que esto se va a pintar de verdad: ver `raizDelNavegador`. */
  const cuerpo = CUERPO_SOBRE_LA_RAIZ * raiz;
  const anchoPorLetra = cuerpo * ANCHO_SOBRE_EL_CUERPO;
  const renglonDelCartel = Math.ceil(cuerpo * RENGLON_SOBRE_EL_CUERPO);

  /* A la izquierda, el canto derecho de la franja de las cartas, en puntos. */
  const vistoEnLasCartas = loQueSeVeEnLasCartas(CAMPO_DE_LA_CAMARA, proporcion);
  const franja = franjaDeLasCartas(CAMPO_DE_LA_CAMARA, proporcion);
  const izquierda = ((franja.derecha + vistoEnLasCartas.ancho / 2) / vistoEnLasCartas.ancho) * lienzo.ancho;

  /*
   * A la derecha, el canto izquierdo de la mano de bienes quieta. Da igual cuántos bienes
   * haya —está medido: el canto es el mismo con uno que con treinta, porque las cartas se
   * apilan a lo alto y no a lo ancho—, así que se pide con una sola y no con una mano de
   * mentira de catorce que habría que explicar.
   */
  const vistoEnLaBaraja = loQueSeVeEnLaBaraja(CAMPO_DE_LA_CAMARA, proporcion);
  const bienes = huecosDeLaBaraja([{ id: 'medida', bien: 'limo' }], CAMPO_DE_LA_CAMARA, proporcion, null);
  const primero = bienes[0];
  if (primero === undefined) return null;
  const cantoDeLosBienes = primero.hueco.x - primero.hueco.ancho / 2;
  const derechaEnPuntos =
    ((cantoDeLosBienes + vistoEnLaBaraja.ancho / 2) / vistoEnLaBaraja.ancho) * lienzo.ancho;
  const derecha = lienzo.ancho - derechaEnPuntos;

  /* Y abajo, el techo del asa de la barra menos el aire. Sin barra, el canto del lienzo. */
  const techoDelAsa = techoDelAsaEnPuntos(lienzo, cuantosHuecos);

  const banda = derechaEnPuntos - izquierda;
  const letrasPorLinea = Math.floor((banda - 2 * MARGEN_DEL_CARTEL) / anchoPorLetra);
  /*
   * EL ALTO LIBRE va del PIE DE LA CINTA al techo del asa menos el aire, y LA CAJA es su
   * mitad: un cartel que se comiera toda la banda taparía media pantalla de tablero justo
   * en el lienzo donde menos tablero hay.
   *
   * LA CINTA SE RESTA ANTES DE PARTIR, y esto estuvo escrito como pendiente en esta misma
   * cabecera antes de que la cinta existiera: son 44 puntos pegados al canto de ARRIBA del
   * recuadro, dentro del mismo lienzo y encima del mismo tablero. Sin restarlos, el techo
   * del cartel se metía debajo de la cinta en los lienzos bajos —el cartel se pinta con
   * `bottom` y `max-height`, así que crecer hacia arriba es lo único que sabe hacer— y lo
   * que se leía era media frase con una cinta de vidrio encima. Restado, lo que pasa está
   * medido y escrito arriba: los estrechos bajan una frase y los demás no pierden ninguna.
   *
   * Y SON 44 O SON 88, según lleve carril o no: lo dice `altoDeLaCinta` y no un `* 2` escrito
   * aquí, para que el día que la cinta cambie de alto haya un solo sitio que tocar y para que
   * `verify:escena` pueda medir esa cuenta desde Node, donde no hay lienzo que mirar.
   */
  const altoLibre = techoDelAsa - AIRE_SOBRE_EL_ASA - altoDeLaCinta(conCarril);
  const caja = altoLibre / 2;
  const renglones = Math.floor((caja - 2 * MARGEN_DEL_CARTEL) / renglonDelCartel);
  if (renglones <= 0 || letrasPorLinea <= 0) return null;

  const frases: string[] = [];
  let usados = 0;
  for (const frase of [explicacion.hace, explicacion.consigues, explicacion.usas]) {
    const pide = renglonesDeLaFrase(frase, letrasPorLinea);
    if (usados + pide > renglones) break;
    usados += pide;
    frases.push(frase);
  }
  if (frases.length === 0) return null;

  return {
    izquierda,
    derecha,
    abajo: lienzo.alto - (techoDelAsa - AIRE_SOBRE_EL_ASA),
    caja,
    frases,
  };
}

/**
 * LAS CUATRO MEDIDAS, TRADUCIDAS A LAS CUATRO PROPIEDADES QUE EL NAVEGADOR ENTIENDE.
 *
 * ═══ POR QUÉ ESTO ES UNA FUNCIÓN Y NO CUATRO LÍNEAS DENTRO DEL JSX ═══
 *
 * Porque ahí no las vigilaba nadie. `elCartelQueCabe` mide `izquierda`, `derecha`, `abajo`
 * y `caja` con muchísimo cuidado y `verify:escritorio` las contrasta contra las tres manos
 * de la escena en cada lienzo; lo que NADA ataba era cuál de las cuatro acababa en `left`
 * y cuál en `right`. Intercambiadas, la batería seguía en 439 y en verde con el cartel
 * puesto encima de la mano que estaba explicando: la aritmética medida y el estilo
 * pintado eran dos cosas que nunca se encontraban.
 *
 * Sacada aquí, es una función pura que se puede LLAMAR desde Node con cuatro números
 * distintos y mirar qué sale, que es lo que hace la vacuna. Cambiar dos de sitio se pone
 * rojo en la comprobación, no en la pantalla de alguien.
 *
 * Con `null` devuelve `undefined`, no un objeto vacío, para que el `<p>` no lleve un
 * `style` que no dice nada: sin cartel manda entera la regla de la hoja, que es la que le
 * quita fondo, filo y relleno cuando está vacío.
 */
export function elEstiloDelCartel(cartel: CartelAlPie | null): CSSProperties | undefined {
  if (cartel === null) return undefined;
  return {
    left: `${String(Math.round(cartel.izquierda))}px`,
    right: `${String(Math.round(cartel.derecha))}px`,
    bottom: `${String(Math.round(cartel.abajo))}px`,
    maxHeight: `${String(Math.round(cartel.caja))}px`,
  };
}

/**
 * EL ANCHO DE LA CINTA Y EL DEL CAJÓN, TRADUCIDOS A LO QUE EL NAVEGADOR ENTIENDE.
 *
 * ═══ POR QUÉ SON DOS FUNCIONES Y NO DOS LÍNEAS DENTRO DEL JSX ═══
 *
 * Por lo mismo que `elEstiloDelCartel`, que nació del mismo fallo: `loQueLlevaLaCinta` mide
 * con muchísimo cuidado y `verify:escena` lo contrasta contra las dos manos, y lo que NADA
 * ataba era que ese número acabara de verdad en el `width` de la caja que se pinta. Sacadas
 * aquí son dos funciones puras que se pueden llamar desde Node y mirar qué sale.
 *
 * Y SON DOS Y NO UNA aunque hoy digan lo mismo: son dos cajas distintas, y el día que una
 * deje de medir lo que la otra —el pregón del trueque cuelga de esta misma cinta— quien lo
 * escriba tiene dónde hacerlo sin tocar la del vecino.
 *
 * ═══ LO QUE AQUÍ YA NO ESTÁ: DÓNDE EMPIEZA EL CAJÓN ═══
 *
 * El cajón cuelga DEL PIE DE LA CINTA y no del canto de arriba del recuadro —con `top: 0`
 * se metía debajo de la cinta, que es de vidrio, y el primer renglón del marcador se leía a
 * través de la frase del turno—. Ese `top` estuvo aquí escrito como `ALTO_DE_LA_CINTA`
 * píxeles, y estaba mal por 2,75 puntos: la cinta se pinta con el suelo de toque de la casa
 * en `rem` (`2.75rem`, como cualquier botón de la Sala) y con la raíz de esta casa eso son
 * 46,75 y no 44. O sea que el cajón se metía por debajo de la cinta justo lo que la
 * preferencia de tamaño de letra del navegador la hiciera crecer, y con la letra en «muy
 * grande» eso deja de ser un pelo. Vive en la hoja, en `rem`, pegado al alto de la cinta y
 * en la misma unidad: así los dos crecen juntos y no hay dos números que cuadrar.
 *
 * Con el recuadro sin medir todavía (cero por cero, el primer render y también Node, donde
 * no hay `ResizeObserver`) devuelven `undefined` y manda la hoja: un ancho de cero puntos no
 * se ve como un error, se ve como que no hay cinta.
 */
export function elEstiloDeLaCinta(cinta: { ancho: number }): CSSProperties | undefined {
  if (cinta.ancho <= 0) return undefined;
  return { width: `${String(Math.round(cinta.ancho))}px` };
}

export function elEstiloDelCajon(cinta: { ancho: number }): CSSProperties | undefined {
  if (cinta.ancho <= 0) return undefined;
  return { width: `${String(Math.round(cinta.ancho))}px` };
}

/**
 * ═══ EL PREGÓN: HASTA DÓNDE PUEDE COLGAR, Y POR QUÉ NO HASTA EL CANTO ═══
 *
 * El cajón cuelga hasta el canto de abajo porque es MODAL: con él abierto hay un velo por
 * delante, la barra no recibe punteros y no hay nada debajo que pueda hacer falta. El
 * pregón NO es modal —se lee mientras otro juega y por debajo se sigue girando el tablero,
 * que es todo el motivo de que exista (§1.10 del trueque)—, así que si colgara hasta el
 * canto taparía la barra de piezas y el naipe del mazo: cromo opaco encima de las cuatro
 * cosas que se pulsan para jugar, y ni un error en ninguna parte.
 *
 * Se para donde se para el cartel de los naipes: en el techo del asa menos el mismo aire.
 * Es la misma raya y la misma función (`techoDelAsaEnPuntos`), que es justo por lo que esa
 * cuenta se sacó a un sitio con nombre.
 *
 * ═══ Y LA CINTA SE RESTA CON EL ALTO QUE SE PINTA, NO CON EL QUE SE MIDE EN NODE ═══
 *
 * `altoDeLaCinta` da 44 u 88, que son el suelo de toque en PUNTOS y lo que `elCartelQueCabe`
 * resta. Aquí NO vale, y la diferencia importa: la hoja arranca el pregón en `2.75rem` o
 * `5.5rem` —lo mismo que el cajón—, que con la raíz de esta casa son 46,75 y 93,5. Restando
 * 44 el `max-height` sobraría 2,75 puntos por tira y el pregón acabaría metiéndose dentro
 * del asa, y con la preferencia de letra del navegador en grande eso deja de ser un pelo. Se
 * resta lo que la hoja pone, que es `ladoDelBotonDeLaCinta(raíz)` por tira.
 *
 * ═══ LO QUE SALE, MEDIDO EN LOS DIECIOCHO LIENZOS Y NO PREDICHO ═══
 *
 * Con la cinta sola caben CUATRO tiras en los dieciocho, y con el carril puesto TRES. Los
 * peores son los mismos de siempre —288×355, 288×317, 320×360, 568×320 y 780×360—, y el
 * mejor da dieciséis. Los dos números los saca `verify:escritorio` midiendo `LIENZOS` con las
 * manos de la escena y exige que esta cabecera los diga: no están escritos a mano.
 *
 * Y HAY UNA TIRA DE DIFERENCIA CON LA TABLA DEL §4.1 DEL TRUEQUE, que da cinco donde aquí
 * salen cuatro en 320×360. No es un error de ninguno de los dos: aquel modelo cuenta con
 * tiras de 44 y resta una cinta de 44, y este cliente pinta las dos cosas en `rem`, o sea a
 * 46,75 con la raíz de esta casa. Son 5,5 puntos de más por cada tira, y en un lienzo donde
 * caben cuatro justas eso es exactamente una.
 */
export function elAltoDelPregon(
  lienzo: { ancho: number; alto: number },
  cuantosHuecos: number,
  conCarril: boolean,
  raiz: number = RAIZ_DE_LA_CASA,
): number {
  const techo = techoDelAsaEnPuntos(lienzo, cuantosHuecos);
  if (techo <= 0) return 0;
  const cinta = ladoDelBotonDeLaCinta(raiz) * (conCarril ? 2 : 1);
  return Math.max(0, techo - AIRE_SOBRE_EL_ASA - cinta);
}

/**
 * EL AIRE DE LA HOJA POR ARRIBA Y POR ABAJO (`padding: 0.5rem 0` en `.riberas-pregon`), en
 * partes de la raíz. Escrito aquí para poder medir en Node lo que el pregón plegado ocupa.
 */
const AIRE_DEL_PREGON = 0.5;

/**
 * ═══ LO QUE OCUPA EL PREGÓN PLEGADO: SU AIRE Y UNA TIRA, Y NADA MÁS ═══
 *
 * Ésta es la cifra que arregla el agujero. `elAltoDelPregon` dice hasta dónde PUEDE colgar
 * —el techo del asa— y en mi turno el pregón llegaba justo ahí: medido jugando, de y=159 a
 * y≈540 de un recuadro de 857, o sea el 44 % de arriba del tablero, con los anillos de fundar
 * debajo. Plegado son 63,75 puntos con la raíz de esta casa (8,5 de aire arriba, 8,5 abajo y
 * los 46,75 de una tira), y eso en el mismo recuadro es el 7,4 %.
 *
 * NO es un `max-height` nuevo ni un segundo tope: el de `elAltoDelPregon` sigue siendo el
 * único, y sigue mandando cuando el pregón está desplegado. Esto es lo que la caja MIDE
 * cuando dentro sólo va la tira que resume, y existe para que `verify:escritorio` pueda
 * comparar las dos alturas en los dieciocho lienzos en vez de creerse esta cabecera.
 */
export function altoDelPregonPlegado(raiz: number = RAIZ_DE_LA_CASA): number {
  return 2 * AIRE_DEL_PREGON * raiz + ladoDelBotonDeLaCinta(raiz);
}

/**
 * CUÁNTAS TIRAS SE VEN SIN DESPLAZAR EL PREGÓN. No decide nada —el pregón rueda por dentro
 * y caben todas—: es la cifra con la que los comprobadores dicen en qué lienzos el pregón se
 * lee de un vistazo y en cuáles hay que desplazarlo, que es el número que el diseño del
 * trueque midió y que aquí se vuelve a medir con las manos de esta escena.
 */
export function cuantasTirasSeVen(altoDelPregon: number, raiz: number = RAIZ_DE_LA_CASA): number {
  const tira = ladoDelBotonDeLaCinta(raiz);
  if (!(altoDelPregon > 0) || !(tira > 0)) return 0;
  return Math.floor(altoDelPregon / tira);
}

/**
 * EL ANCHO Y EL TOPE DE ALTO DEL PREGÓN, traducidos a lo que el navegador entiende. Por lo
 * mismo que `elEstiloDelCartel` y `elEstiloDeLaCinta`: lo que nada ataba era que el número
 * medido acabara de verdad en la caja que se pinta. Sin lienzo medido, `undefined` y manda
 * la hoja.
 */
export function elEstiloDelPregon(cinta: { ancho: number }, alto: number): CSSProperties | undefined {
  if (cinta.ancho <= 0) return undefined;
  const ancho = { width: `${String(Math.round(cinta.ancho))}px` };
  return alto > 0 ? { ...ancho, maxHeight: `${String(Math.round(alto))}px` } : ancho;
}

/**
 * EL MARGEN DE UNA TIRA, a cada lado. Son los mismos doce puntos con los que se rellena el
 * cartel de un naipe (`MARGEN_DEL_CARTEL`), y se escribe aparte a propósito: son dos cajas
 * distintas y compartir la constante ataría el día que una de las dos cambie de relleno.
 */
const MARGEN_DE_LA_TIRA = 12;
/** El raíl de color de quien propone, y el aire entre él y las letras. */
const RAIL_DE_LA_TIRA = 4;
const HUECO_TRAS_EL_RAIL = 6;

/**
 * LOS PUNTOS QUE LE QUEDAN AL TEXTO DE UNA TIRA, ya quitados los márgenes y el raíl.
 *
 * De aquí sale la decisión de si en el renglón de estado cabe el nombre, y por eso es una
 * función y no una resta escrita en el JSX: se puede llamar desde Node con el ancho de cada
 * lienzo y mirar qué sale, que es lo que compra la regla del recorte.
 *
 * ═══ Y LO QUE NO CABE EN LOS ESTRECHOS ES LA OFERTA, QUE HAY QUE DECIRLO ═══
 *
 * MEDIDO en los dieciocho lienzos: la oferta entera —«1 junco → 1 limo», dieciséis letras—
 * cabe en ONCE, y en los SIETE de pie más estrechos se recorta con puntos suspensivos. El
 * diseño del trueque (§3.1) pinta la oferta con FICHAS de bien y ahí caben cuatro en el peor
 * lienzo; el DOM la escribe con palabras, que ocupan bastante más, así que este cliente se
 * queda corto antes que aquel modelo. No se arregla quitando la cifra —«junco → limo» son
 * doce letras y sigue sin entrar en los 81,2 puntos de un lienzo de 288— y quitarla sería
 * además perder el dato el día que la multiplicidad entre.
 *
 * Lo que lo hace aceptable es que la frase entera está en el árbol —`aria-label` y `title` de
 * la tira— y se lee completa en la hoja, que es a un toque. Es la misma degradación que la
 * frase de la cinta y la del cartel de un naipe, y por el mismo motivo: de pie es la forma
 * secundaria de esta pantalla.
 */
export function huecoDeLaTira(anchoDeLaCinta: number): number {
  return Math.max(0, anchoDeLaCinta - 2 * MARGEN_DE_LA_TIRA - RAIL_DE_LA_TIRA - HUECO_TRAS_EL_RAIL);
}

/** El triángulo del pliegue, al canto de la tira que resume, y el aire que se le deja. */
const PLIEGUE_DE_LA_TIRA = 12;

/**
 * Y EL HUECO DE LA TIRA QUE RESUME, que es el de una tira menos el triángulo del pliegue.
 *
 * Se escribe aparte y no se le resta al otro: las tiras de trato NO llevan triángulo, y
 * medirlas todas como si lo llevaran haría que el nombre de quien contestó se cayera antes de
 * lo que se cae de verdad. Son dieciocho puntos, que en el lienzo de 288 son dos letras de
 * las nueve y media que hay.
 */
export function huecoDeLaTiraQueResume(anchoDeLaCinta: number): number {
  return Math.max(0, huecoDeLaTira(anchoDeLaCinta) - PLIEGUE_DE_LA_TIRA - HUECO_TRAS_EL_RAIL);
}

/**
 * EL RENGLÓN DE ESTADO QUE CABE, CON NOMBRE O SIN ÉL, Y LA REGLA ES «SE RECORTA EL NOMBRE».
 *
 * ═══ POR QUÉ NO ES UN UMBRAL DE ANCHO ═══
 *
 * Por lo mismo que el «‹» de la cinta no se va por un umbral: lo que decide no es el ancho
 * del lienzo sino si la FRASE cabe con la letra que este cliente pinta de verdad, que
 * depende de la preferencia de tamaño del navegador. Un umbral en puntos deja fuera lienzos
 * que sí pueden y deja dentro lienzos que no, y con la letra en grande se equivoca siempre.
 *
 * Y cuando no cabe se va EL NOMBRE y nunca el estado —«aceptada» antes que «la aceptó A…»—:
 * saber que te la aceptaron importa más que saber quién, y el quién sigue entero en la frase
 * que se oye y en la hoja. Es la regla escrita en `docs/EL-TRUEQUE-DE-RIBERAS.md` §3.2, y
 * ahí sale de medir el peor lienzo: en 320×360 «la aceptó Ana» son trece letras y no entra.
 *
 * MEDIDO AQUÍ, con la letra de esta casa: el nombre cabe en CATORCE de los dieciocho lienzos,
 * y se cae en los cuatro más estrechos —288×355, 288×317, 288×420 y 320×360—. Y se decide
 * FRASE A FRASE y no lienzo a lienzo, que es lo que la regla pide: en el SE apaisado «la
 * aceptó Ana» entra y «caducó sin respuesta», que son siete letras más, no.
 *
 * Y HAY UN SUELO POR DEBAJO DEL CUAL NI LA VERSIÓN CORTA CABE: en un lienzo de 288 el hueco
 * son 81,2 puntos, o sea nueve letras y media, y «no puedes pagarlo» son diecisiete. Ahí se
 * recorta con puntos suspensivos y no hay nada más que soltar, igual que la frase de la cinta
 * en ese mismo lienzo. La frase entera sigue en el árbol y en la hoja.
 */
export function elEstadoQueCabe(
  tira: { comoAnda: string; comoAndaSinNombre: string },
  hueco: number,
  raiz: number = RAIZ_DE_LA_CASA,
): string {
  const anchoPorLetra = CUERPO_SOBRE_LA_RAIZ * raiz * ANCHO_SOBRE_EL_CUERPO;
  if (anchoPorLetra <= 0) return tira.comoAndaSinNombre;
  return tira.comoAnda.length * anchoPorLetra <= hueco ? tira.comoAnda : tira.comoAndaSinNombre;
}

/**
 * LA TRAMPA DE FOCO DE UN MODAL DEL LIENZO: `Escape` cierra y el tabulador da la vuelta.
 *
 * ═══ POR QUÉ ESTO ES UN GANCHO Y NO EL CUERPO DEL CAJÓN ═══
 *
 * Porque dentro del recuadro hay DOS cajas modales y no una: el cajón del marcador y el menú
 * de elegir —«a quién se lo propones», «a quién le robas», «qué dos bienes coges»—. Las dos se
 * pintan encima de un tablero donde un toque funda una choza, así que las dos necesitan lo
 * mismo, y escribirlo dos veces es tener dos trampas que se separan el día que alguien
 * arregle una: la que se queda rota es la que nadie estaba mirando. Escrito una vez, `Escape`
 * y el tabulador valen igual en las dos, y `verify:escritorio` compra que las dos lo usan.
 *
 * LO QUE HACE, y las tres son cosas que un navegador NO hace solo con un `<div>`:
 *
 *   · al abrirse, el foco se va DENTRO de la caja. Sin esto, quien abre con teclado se queda
 *     tabulando por detrás de un modal opaco;
 *   · `Tab` sobre el último enfocable vuelve al primero y `Mayúsculas+Tab` sobre el primero
 *     va al último. `aria-modal` se lo cuenta al lector de pantalla y no le quita el
 *     tabulador a nadie: sin la vuelta, el foco se va a la cabecera de la Sala;
 *   · `Escape` cierra, que es la salida que quien abrió con teclado espera encontrar.
 *
 * DEVOLVER EL FOCO AL CERRAR NO ES COSA DE AQUÍ, y no por descuido: la caja se DESMONTA al
 * cerrarse y adónde vuelve el foco depende de quién la abrió —la ficha de mis puntos en un
 * caso, el recuadro del lienzo en el otro, porque al menú lo abre un naipe del `<canvas>` y
 * un `<canvas>` no recibe foco—. Lo hace cada `cerrar`, que es el que lo sabe.
 *
 * ═══ Y SE ROMPÍA SOLA EN CUANTO SE USABA. EL FALLO, JUGANDO Y NO LEYENDO ═══
 *
 * El oyente vivía EN LA CAJA (`suya.addEventListener('keydown', …)`), y un `keydown` sólo
 * llega ahí si el foco está DENTRO. Basta pulsar una opción de «Lo que puedes hacer» para que
 * deje de estarlo: la lista de opciones cambia con la jugada, el botón pulsado desaparece, y
 * un elemento que se desmonta con el foco puesto lo suelta al `<body>`. Desde el `<body>` ni
 * el tabulador da la vuelta ni `Escape` cierra: la trampa existía hasta el primer toque.
 *
 * Por eso ahora el oyente vive en `document` mientras la caja está abierta y `tecla` mira
 * `caja.current` EN EL MOMENTO de la tecla, no el nodo que se capturó al armarla. Y hay
 * RESCATE: un vigía mira los cambios de dentro de la caja y, si el foco se ha caído fuera,
 * lo devuelve a la caja. Es el mismo patrón que el rescate del recuadro de `sala.tsx` —mirar
 * quién tiene el foco justo cuando se lo llevan por delante—, aquí en pequeño.
 *
 * ═══ Y MANDA LA DE ARRIBA, QUE ES LO QUE UN OYENTE EN `document` SE LLEVA POR DELANTE ═══
 *
 * Con el oyente en la caja, la burbuja repartía sola: con el cajón abierto y el menú de
 * elegir encima, un `Escape` sólo llegaba a la caja que tenía el foco dentro. En `document`
 * llegan LAS DOS, y `Escape` cerraría el menú Y el cajón de un golpe. De ahí la pila:
 * `armarUnaTrampa` apunta cada caja en el orden en que se abre y sólo actúa la de arriba.
 */
/**
 * LAS TRAMPAS ARMADAS, en el orden en que se abrieron. Ver el porqué arriba.
 *
 * Es un array de módulo y no un estado de React a propósito: no decide qué se pinta, y las
 * dos cajas que lo comparten no tienen un antepasado común al que colgárselo sin inventar un
 * contexto para cuatro líneas. Se apunta con `armarUnaTrampa`, que devuelve cómo desarmarse.
 */
const LAS_TRAMPAS_ARMADAS: unknown[] = [];

/**
 * APUNTA UNA TRAMPA Y DEVUELVE CÓMO BORRARLA. Desarmar dos veces no hace nada, que es lo que
 * pide un efecto de React en modo estricto (monta, desmonta y vuelve a montar).
 */
export function armarUnaTrampa(quien: unknown): () => void {
  LAS_TRAMPAS_ARMADAS.push(quien);
  let desarmada = false;
  return () => {
    if (desarmada) return;
    desarmada = true;
    const suPuesto = LAS_TRAMPAS_ARMADAS.lastIndexOf(quien);
    if (suPuesto >= 0) LAS_TRAMPAS_ARMADAS.splice(suPuesto, 1);
  };
}

/** ¿Manda ésta? Sólo la última que se armó, que es la que está encima. */
export function mandaEstaTrampa(quien: unknown): boolean {
  return LAS_TRAMPAS_ARMADAS.length > 0 && LAS_TRAMPAS_ARMADAS[LAS_TRAMPAS_ARMADAS.length - 1] === quien;
}

/**
 * DÓNDE ESTÁ EL FOCO CUANDO LLEGA LA TECLA, visto desde la caja modal.
 *
 * `fuera` es el caso que costó tres turnos de partida: el navegador lo ha soltado al
 * `<body>` porque el botón que lo tenía se desmontó. No es un caso raro ni un caso de
 * teclado: pasa con el ratón, en la primera jugada, y hasta hoy dejaba la caja sin `Escape`.
 */
export type ElFocoDeLaTrampa = 'fuera' | 'la-caja' | 'el-unico' | 'el-primero' | 'el-ultimo' | 'dentro';

/** Lo que la trampa hace con una tecla. `nada` quiere decir «déjasela al navegador». */
export type LoQueHaceLaTrampa = 'nada' | 'cerrar' | 'al-primero' | 'al-ultimo' | 'a-la-caja';

/**
 * LA DECISIÓN DE LA TRAMPA, SIN NAVEGADOR, para que se pueda comprar llamándola.
 *
 * La comprobación de antes leía el CUERPO del oyente y buscaba dentro las palabras `Tab`,
 * `shiftKey` y `Escape`. Pasaba en verde con la trampa rota delante, porque las palabras
 * estaban escritas y el fallo era DÓNDE se enganchaba el oyente y qué pasaba con el foco
 * caído: dos cosas que aquel texto no miraba. Partido así, el reparto se llama con una tabla
 * —incluida la fila `fuera`, que es la del fallo— y el enganche se lee aparte.
 *
 * `Escape` cierra MIRE DONDE MIRE EL FOCO, y eso es la mitad del arreglo: es justo la tecla
 * que se pulsa cuando uno ya no sabe dónde está.
 */
export function loQueHaceLaTrampa(
  tecla: { key: string; shiftKey: boolean },
  foco: ElFocoDeLaTrampa,
  cuantosEnfocables: number,
): LoQueHaceLaTrampa {
  if (tecla.key === 'Escape') return 'cerrar';
  if (tecla.key !== 'Tab') return 'nada';
  /* Una caja sin nada que enfocar dentro se queda el tabulador ella misma. */
  if (cuantosEnfocables === 0) return 'a-la-caja';
  /* El foco caído al `body`: el tabulador entra en la caja en vez de irse a la Sala. */
  if (foco === 'fuera') return tecla.shiftKey ? 'al-ultimo' : 'al-primero';
  if (!tecla.shiftKey && (foco === 'el-ultimo' || foco === 'el-unico')) return 'al-primero';
  if (tecla.shiftKey && (foco === 'el-primero' || foco === 'el-unico' || foco === 'la-caja')) return 'al-ultimo';
  return 'nada';
}

function usarLaTrampaDeFoco(
  abierto: boolean,
  caja: RefObject<HTMLElement | null>,
  cerrar: () => void,
): void {
  useEffect(() => {
    if (!abierto) return;
    const alArmar = caja.current;
    if (alArmar === null) return;
    alArmar.focus();
    const desarmar = armarUnaTrampa(caja);
    const enfocables = (dentro: HTMLElement): HTMLElement[] =>
      [...dentro.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')].filter(
        (e) => !e.hasAttribute('disabled') && e.tabIndex >= 0,
      );
    const dondeEstaElFoco = (dentro: HTMLElement, lista: HTMLElement[]): ElFocoDeLaTrampa => {
      const activo = document.activeElement;
      if (activo === dentro) return 'la-caja';
      if (activo === null || !dentro.contains(activo)) return 'fuera';
      if (lista.length === 1 && activo === lista[0]) return 'el-unico';
      if (activo === lista[0]) return 'el-primero';
      if (activo === lista[lista.length - 1]) return 'el-ultimo';
      return 'dentro';
    };
    const tecla = (e: KeyboardEvent): void => {
      const dentro = caja.current;
      if (dentro === null || !mandaEstaTrampa(caja)) return;
      const lista = enfocables(dentro);
      const hace = loQueHaceLaTrampa(e, dondeEstaElFoco(dentro, lista), lista.length);
      if (hace === 'nada') return;
      e.preventDefault();
      if (hace === 'cerrar') cerrar();
      else if (hace === 'a-la-caja') dentro.focus();
      else (hace === 'al-primero' ? lista[0] : lista[lista.length - 1])?.focus();
    };
    /*
     * EN `document` Y NO EN LA CAJA: ver la cabecera. Un oyente en la caja sólo oye lo que
     * pasa con el foco dentro, y el foco se sale solo en cuanto una jugada cambia la lista de
     * opciones. Con la pila, seguir aquí no le quita el `Escape` al menú que hay encima.
     */
    document.addEventListener('keydown', tecla);
    /*
     * EL RESCATE. Que el botón que tenía el foco se desmonte no avisa a nadie —el navegador
     * no dispara `blur` al quitar de la página al que lo tenía—, así que se mira la caja por
     * dentro: cada vez que cambia, si el foco se ha caído fuera, vuelve a la caja. Desde ahí
     * el tabulador entra otra vez en el cajón, que es lo que se perdía.
     */
    const rescatar = (): void => {
      const dentro = caja.current;
      if (dentro === null || !mandaEstaTrampa(caja)) return;
      if (dondeEstaElFoco(dentro, enfocables(dentro)) === 'fuera') dentro.focus();
    };
    const vigia = new MutationObserver(rescatar);
    vigia.observe(alArmar, { childList: true, subtree: true });
    return () => {
      document.removeEventListener('keydown', tecla);
      vigia.disconnect();
      desarmar();
    };
  }, [abierto, caja, cerrar]);
}

/**
 * LOS TÍTULOS DEL MENÚ, uno por pregunta, y ni una palabra más de cosecha propia.
 *
 * Lo que va DENTRO de cada botón lo escribió el juego —`opcion.rotulo` y `opcion.ayuda`,
 * que ya nombran al colono o los dos bienes—; esto es sólo el encabezado, y es chrome de
 * la Sala igual que «Lo que puedes hacer». Se elige por la CLASE de la jugada, que la
 * traducción garantiza igual a la familia con que se pinta el naipe, y no por el tipo del
 * movimiento: el tipo es del contrato del juego y colgar de él un texto de pantalla es lo
 * que ata una hoja de estilo a un reductor.
 *
 * `dosveredas` está en la tabla porque el tipo la exige entera, y no porque se espere ver
 * su menú: esa carta ofrece una sola jugada y se manda sin preguntar. Si algún día
 * ofreciera dos, saldría un menú con título en vez de un hueco.
 *
 * Y DESDE LA FASE 3 DEL ESTIAJE, `guardia` está aquí por lo mismo que `dosveredas`. Esa
 * carta ya no elige víctima: mueve el estiaje, ofrece una sola jugada y se manda sin
 * preguntar; a quién se le roba lo decide después la isla, sobre el tablero. Su renglón
 * decía «A quién le quitas un bien», que era el título de un menú que ya no se abre y que,
 * si se abriera, preguntaría otra cosa. Se corrige en vez de borrarse, porque el tipo exige
 * las cuatro y un título mentiroso que nadie ve es de los que sobreviven a tres fases.
 */
const LO_QUE_SE_PREGUNTA: Readonly<Record<ClaseDeJugada, string>> = {
  guardia: 'Cómo la juegas',
  anobueno: 'Qué dos bienes coges',
  acaparamiento: 'Qué bien pides',
  dosveredas: 'Cómo la juegas',
};

/** El título del menú de siempre: a quién se le propone un trueque. */
const A_QUIEN_SE_LO_PROPONES = 'A quién se lo propones';
const A_QUIEN_LE_ROBAS = 'A quién le robas';

/**
 * EL TÍTULO DEL MENÚ DE COMPRAR. Encabezado de la Sala, como los otros dos: lo que CUESTA
 * y cuántas quedan no se escribe aquí —llega en el rótulo y en la ayuda de la opción, que
 * las redacta el juego—, y por eso esta línea no nombra ni un bien.
 */
const COMPRAR_UNA_CARTA = 'Comprar una carta';

/** El rótulo del panel del marcador en el raíl. Chrome de la Sala, no una palabra del juego. */
const TITULO_DEL_MARCADOR = 'El marcador';

/**
 * LOS RÓTULOS DEL PREGÓN. Chrome de la Sala: el juego no escribe ninguno, y por eso están
 * aquí y no en `shared/` —lo que sí está allí son las frases de cada trato, que hablan de la
 * partida—. Los tres bloques son las dos mitades de la decisión 17 y la mitad de en medio
 * que el que propone no veía: lo vivo que me toca, lo vivo que ofrecí, y lo que ya se cerró.
 */
/**
 * LO QUE HACE UNA TIRA AL PULSARLA, y va en su nombre accesible porque LA TIRA NO LLEVA
 * BOTONES: es lo que Miguel pidió —«la aceptación debe tener que confirmarse para que no se
 * acepte por equivocación»— y además lo que hace que la oferta quepa. Medido en el diseño:
 * con los dos botones de 44 al lado, a la oferta le quedan 77 puntos en el SE apaisado y 16
 * en 320×360, o sea CERO fichas.
 */
/*
 * LAS PALABRAS DEL COMPONEDOR, y las cinco son de la PANTALLA y no del juego: son rótulos
 * de mueble —qué lado se toca, a quién, y el botón de mandar—. Todo lo que habla del
 * TRUEQUE —«Proponer un trueque», el tope, el porqué de un botón apagado— lo redacta
 * Riberas en la puerta y llega dentro de `elComponedor`: aquí no se reescribe ni una.
 */
const QUE_LADO_SE_TOCA = 'Qué lado estás montando';

// ---------------------------------------------------------------------------
// El catálogo de modelos, una vez por pestaña
// ---------------------------------------------------------------------------

/**
 * UNA PROMESA POR FICHERO Y POR PESTAÑA, que se suelta si falla para que el siguiente
 * montaje lo intente otra vez. Ver la cabecera. Es una por fichero y no una para los
 * dos porque el tablero y los dados fallan por separado: un tablero que llegó no se
 * vuelve a bajar porque los dados no llegaran, y unos dados que fallaron se pueden
 * reintentar solos en el siguiente montaje.
 */
function recordada<T>(traer: () => Promise<T>): () => Promise<T> {
  let enCamino: Promise<T> | null = null;
  return () => {
    if (enCamino !== null) return enCamino;
    const promesa = traer();
    enCamino = promesa;
    promesa.catch(() => {
      if (enCamino === promesa) enCamino = null;
    });
    return promesa;
  };
}

/**
 * Trae y parsea un `.glb` y devuelve su catálogo.
 *
 * `GLTFLoader.parseAsync` sobre los bytes de un `fetch` relativo, y no `.load(url)`:
 * así el error de red se lee como lo que es —«contestó 404»— y no como un `ProgressEvent`
 * sin texto, que es lo que devuelve el cargador cuando la petición falla.
 */
async function traerUnGlb(ruta: string): Promise<CatalogoDeModelos> {
  const r = await fetch(ruta);
  if (!r.ok) throw new Error(`${ruta} contestó ${String(r.status)}`);
  const bytes = await r.arrayBuffer();
  const gltf = await new GLTFLoader().parseAsync(bytes, '');
  return catalogoDeModelos(gltf.scene);
}

/**
 * EL RELOJ DE ARENA, aparte de los otros dos y CON SUS CLIPS.
 *
 * No pasa por `traerUnGlb` porque aquél devuelve un catálogo —un mapa de nombre a nodo— y ahí los
 * clips se pierden, que es justamente lo que este modelo trae y los otros no. Y va con su propia
 * red por lo mismo que los dados: un `reloj.glb` que no llegue no puede tirar el tablero, y su
 * fallo se convierte en «sin modelo», con lo que la escena pinta el reloj de conos del respaldo.
 */
async function traerElRelojConSuClip(): Promise<RelojCargado> {
  const r = await fetch(RUTA_DEL_RELOJ);
  if (!r.ok) throw new Error(`${RUTA_DEL_RELOJ} contestó ${String(r.status)}`);
  const gltf = await new GLTFLoader().parseAsync(await r.arrayBuffer(), '');
  return { escena: gltf.scene, clips: gltf.animations };
}

const traerElReloj = recordada(traerElRelojConSuClip);

const traerElTablero = recordada(() => traerUnGlb(RUTA_DEL_TABLERO));
const traerLosDados = recordada(() => traerUnGlb(RUTA_DE_LOS_DADOS));

/**
 * EL CATÁLOGO ENTERO: el tablero y los dados, pedidos A LA VEZ y unidos en un mapa.
 *
 * Con su propia red cada uno, y no un `Promise.all` a secas sobre los dos ficheros: un
 * `dados.glb` que no llegue (un despliegue sin él, un 404, un fichero roto) NO puede
 * tirar el tablero, que pesa cuatro megas y ya está aquí. El fallo de los dados se
 * convierte en «sin dado» (`null`), el catálogo sale sin `MODELO.dado` y `Dados` pinta
 * el respaldo procedimental; se avisa por consola, porque un respaldo mudo es un fallo
 * que nadie ve. Sólo el fallo del tablero rechaza la promesa.
 */
function traerElCatalogo(): Promise<CatalogoDeModelos> {
  const tablero = traerElTablero();
  const dados = traerLosDados().catch((fallo: unknown): null => {
    console.warn(`Los dados no han llegado (${loQueSeDiceDeUnFallo(fallo)}): se pintan los del respaldo.`);
    return null;
  });
  return Promise.all([tablero, dados]).then(([delTablero, deLosDados]) => unirCatalogos(delTablero, deLosDados));
}

/**
 * El catálogo desde un componente: `null` mientras llega, y el motivo si no llegó.
 *
 * `cancelado` por lo mismo que en el banco: si la mesa se desmonta mientras el
 * fichero viaja, escribir el estado después es un aviso de React y una referencia
 * viva a una escena que ya no se dibuja. Y sólo se pide cuando HACE FALTA: en Node
 * no corren los efectos, y con una mesa que va a caer al retablo —más colonos que
 * colores— descargar dos megas para no montar el lienzo sería tirarlos. El gancho
 * se llama siempre (reglas de los ganchos); lo que se condiciona es la petición.
 */
function usarElCatalogo(hazFalta: boolean): { modelos: CatalogoDeModelos | null; fallo: string | null } {
  const [modelos, ponerModelos] = useState<CatalogoDeModelos | null>(null);
  const [fallo, ponerFallo] = useState<string | null>(null);

  useEffect(() => {
    if (!hazFalta) return undefined;
    let cancelado = false;
    traerElCatalogo().then(
      (catalogo) => {
        if (!cancelado) ponerModelos(catalogo);
      },
      (error: unknown) => {
        if (!cancelado) ponerFallo(loQueSeDiceDeUnFallo(error));
      },
    );
    return () => {
      cancelado = true;
    };
  }, [hazFalta]);

  return { modelos, fallo };
}

// ---------------------------------------------------------------------------
// La cámara aérea
// ---------------------------------------------------------------------------

/**
 * LA NIEBLA, MEDIDA DESDE EL OJO. El banco la pone a 2,6 y 7,5 alcances del centro
 * con la cámara quieta a `LEJANIA` (1,77) alcances; medidos desde esa cámara son
 * 0,85 y 5,7 alcances por delante del ojo. Aquí el ojo se aleja cuando el lienzo
 * es estrecho, y una niebla clavada al centro se quedaría delante del delta y lo
 * dejaría blanqueado. Así que se lleva con la cámara: mismo aspecto en el
 * monitor, y el mismo aspecto desde más lejos.
 */
const NIEBLA_EMPIEZA_A = 0.85;
const NIEBLA_TERMINA_A = 5.7;

/**
 * DE LAS UNIDADES DE LA RUEDA A LOS PASOS DE `acercar.ts`.
 *
 * Es lo ÚNICO que este fichero calcula, y no es una cuenta de cámara: es traducir un
 * suceso del navegador. `acercando` cuenta en PASOS —un paso es «un poco más cerca»,
 * y lo que vale un paso lo decide `PASO_DE_ACERCAMIENTO`, no esto—, mientras que el
 * navegador manda un `deltaY` que no es ninguna unidad: un ratón de muesca suelta cien
 * píxeles de golpe, un panel táctil suelta cuatro sesenta veces por segundo, y un
 * Firefox con la rueda en modo línea manda TRES LÍNEAS. Sin traducir los tres modos a
 * lo mismo, el mismo gesto acerca un dedo en un aparato y cruza el tablero entero en
 * otro, y eso no se ve como un fallo de conversión sino como un zoom roto.
 *
 * ═══ Y EL MODO LÍNEA SE CUENTA EN LÍNEAS, NO EN PÍXELES ═══
 *
 * Esto pasaba por el modo línea convirtiendo cada línea a dieciséis píxeles: las tres
 * líneas de una muesca de Firefox daban cuarenta y ocho, o sea MEDIA muesca. El zoom
 * iba exactamente a la mitad de velocidad que en cualquier otro navegador, y eso nadie
 * lo mide: se nota como que «en Firefox cuesta más acercarse», que es de las cosas que
 * se achacan al ordenador. Un modo cuyas unidades son líneas no necesita pasar por
 * píxeles: tres líneas son una muesca, y de ahí sale el paso directamente.
 *
 * El tope de golpe es por el panel táctil con inercia: un gesto de dos dedos manda una
 * ráfaga larguísima, y sin tope un solo empujón salta del aire al suelo.
 */
const PIXELES_POR_MUESCA = 100;
const LINEAS_POR_MUESCA = 3;
const MUESCAS_POR_PAGINA = 4;
const MUESCAS_DE_GOLPE = 4;

function pasosDeLaRueda(e: WheelEvent): number {
  const muescas =
    e.deltaMode === 1
      ? e.deltaY / LINEAS_POR_MUESCA
      : e.deltaMode === 2
        ? e.deltaY * MUESCAS_POR_PAGINA
        : e.deltaY / PIXELES_POR_MUESCA;
  /* Rueda hacia arriba, más cerca: es lo que hace cualquier mapa, y de ahí el signo. */
  return -Math.min(MUESCAS_DE_GOLPE, Math.max(-MUESCAS_DE_GOLPE, muescas));
}

/**
 * UN SOLO `Vector3` PARA TODA LA PESTAÑA. La niebla se mide sesenta veces por segundo
 * y pedir memoria sesenta veces por segundo para tres números es lo que llena el
 * recolector de basura de fantasmas y deja un tirón cada pocos segundos.
 */
const PUNTO_DE_MIRA = new Vector3();

/**
 * El mirador del banco, sin la vista de suelo: aquí se juega desde el aire — y ahora
 * también de cerca.
 *
 * La aritmética está en `escenas/camara.ts` y en `escenas/acercar.ts`, donde se puede
 * medir desde Node; esto sólo escucha el ratón y coloca la cámara en cada fotograma.
 * Sólo cuentan los gestos que empiezan SOBRE ESTE lienzo —`e.target === lienzo`—, así
 * que arrastrar por el raíl o por el formulario no mueve nada.
 *
 * Quién manda en cada botón está en la cabecera del fichero. Lo que importa aquí es
 * que `esDeLaInterfaz` se pregunta ANTES de quedarse con el gesto, igual que antes: si
 * la barra o la mano ya se quedaron el `pointerdown`, la cámara no lo toca.
 *
 * La proporción del lienzo entra en cada fotograma y no una vez: el raíl baja o
 * sube al cruzar los 900 px, la ventana se estira, la tableta se gira, y el
 * `<canvas>` cambia de forma sin que se remonte nada. Leer `clientWidth` por
 * fotograma cuesta menos que un observador de tamaño y no se queda nunca atrás.
 *
 * El acercamiento NO se guarda aquí sino en quien monta este componente, y por una
 * razón de pantalla: el botón de volver vive fuera del `Canvas` y tiene que saber si
 * hay algo a lo que volver. La `ref` entra por la puerta y se LEE aquí; escribirla es
 * cosa de `alAcercarse`, que es quien de paso enciende y apaga el botón.
 */
function CamaraAerea({
  alcance,
  cercania,
  alAcercarse,
}: {
  alcance: number;
  cercania: RefObject<Cercania>;
  alAcercarse: (nueva: Cercania) => void;
}): null {
  const { camera, gl, scene } = useThree();
  const mirador = useRef<Mirador>(MIRADOR_DE_SALIDA);

  useEffect(() => {
    const lienzo = gl.domElement;
    /*
     * EL RECUADRO NO ES EL LIENZO. Es el `.riberas-lienzo` que lleva dentro el `<canvas>`
     * Y el botón de volver, y es de él —no del lienzo— de quien cuelga la rueda: ver la
     * cabecera. Se busca por la misma clase que pinta el JSX, y si un día no estuviera se
     * cae al lienzo, que es lo que había antes: peor, pero no roto.
     */
    const recuadro: HTMLElement = lienzo.closest<HTMLElement>(`.${RECUADRO_DEL_LIENZO}`) ?? lienzo;

    let desde: { x: number; y: number } | null = null;
    let gira = false;
    /* De quién es ESTE arrastre: del rumbo (izquierdo) o de la mirada (derecho o Mayúsculas). */
    let mueveLaMirada = false;
    /*
     * QUIÉN ESTÁ APOYADO AHORA MISMO, por `pointerId`. Con el ratón esto vale siempre uno
     * —los botones comparten puntero—, así que sólo llega a dos con dos dedos. Ver la
     * cabecera: es la misma cuenta la que abre el pellizco y la que impide que un segundo
     * botón le robe el gesto a un arrastre en marcha.
     */
    const apoyados = new Map<number, { x: number; y: number }>();
    /* El pellizco en curso: con qué acercamiento y con qué separación empezó, y dónde va su centro. */
    let pellizco: { alEmpezar: number; separacion: number; centro: { x: number; y: number } } | null = null;

    const pantalla = (): { ancho: number; alto: number } => ({
      ancho: lienzo.clientWidth,
      alto: lienzo.clientHeight,
    });

    /*
     * La separación y el punto medio de los dos dedos, en píxeles de pantalla. No es una
     * cuenta de cámara —de eso no hay ninguna aquí—: son las mismas coordenadas del suceso
     * que ya se restan para el arrastre, y lo que sale de aquí entra crudo en
     * `pellizcando` y en `arrastrandoLaMirada`, que son quienes hacen la aritmética.
     */
    const dosDedos = (): { separacion: number; centro: { x: number; y: number } } | null => {
      const [a, b] = [...apoyados.values()];
      if (a === undefined || b === undefined) return null;
      return {
        separacion: Math.hypot(a.x - b.x, a.y - b.y),
        centro: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    };

    const baja = (e: PointerEvent): void => {
      if (e.target !== lienzo) return;
      if (esDeLaInterfaz(e)) return;
      apoyados.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const dos = dosDedos();
      if (apoyados.size >= 2 && dos !== null) {
        /*
         * DOS DEDOS. Se guardan el acercamiento y la separación DE PARTIDA, y a partir de
         * ahí `pellizcando` trabaja con la razón entre la separación de ahora y aquélla.
         * Guardar el punto de partida en vez de ir acumulando es lo que hace que separar
         * los dedos y volver a juntarlos deje el tablero exactamente donde estaba.
         *
         * El suelo de un píxel es para el caso degenerado de dos dedos en el mismo punto:
         * sin él la razón sería infinita y el pellizco no haría nada en todo el gesto.
         */
        pellizco = {
          alEmpezar: cercania.current.factor,
          separacion: Math.max(1, dos.separacion),
          centro: dos.centro,
        };
        /* Y el arrastre de un dedo se cancela: lo que había empezado a girar ya no gira. */
        desde = null;
        gira = false;
        mueveLaMirada = false;
        return;
      }

      /*
       * QUIEN EMPEZÓ EL ARRASTRE SE LO QUEDA. Apretar el izquierdo en mitad de un
       * desplazamiento con el botón derecho cambiaba el gesto a girar a media carrera.
       */
      if (desde !== null) return;

      desde = { x: e.clientX, y: e.clientY };
      gira = false;
      /*
       * Se decide AL EMPEZAR y no en cada movimiento: soltar la tecla a mitad de
       * gesto cambiaría de girar a desplazar sin que nadie lo haya pedido, y el
       * tablero pegaría un bandazo en medio del arrastre.
       */
      mueveLaMirada = e.button === 2 || e.shiftKey;
    };
    const mueve = (e: PointerEvent): void => {
      if (apoyados.has(e.pointerId)) apoyados.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pellizco !== null) {
        const dos = dosDedos();
        if (dos === null) return;
        /*
         * Las dos mitades del gesto, en este orden: primero el paseo del punto medio —por
         * el mismo camino que el botón derecho, para que mover con dos dedos y mover con
         * el derecho sean el mismo movimiento— y encima el acercamiento, que conserva ese
         * centro porque `pellizcando` sólo toca el factor.
         */
        const paseada = arrastrandoLaMirada(
          cercania.current,
          dos.centro.x - pellizco.centro.x,
          dos.centro.y - pellizco.centro.y,
          mirador.current.rumbo,
          alcance,
          pantalla(),
        );
        pellizco.centro = dos.centro;
        alAcercarse(pellizcando(paseada, pellizco.alEmpezar, dos.separacion / pellizco.separacion));
        return;
      }
      if (desde === null) return;
      if (!gira) {
        if (Math.hypot(e.clientX - desde.x, e.clientY - desde.y) < MINIMO_PARA_GIRAR) return;
        gira = true;
      }
      const dx = e.clientX - desde.x;
      const dy = e.clientY - desde.y;
      if (mueveLaMirada) {
        /*
         * El rumbo entra porque la mirada se mueve en los ejes de QUIEN MIRA y no en
         * los del mundo: con el tablero girado, arrastrar a un lado movería el mapa
         * en diagonal. Lo cuenta `arrastrandoLaMirada`, que es quien hace la cuenta.
         */
        alAcercarse(
          arrastrandoLaMirada(cercania.current, dx, dy, mirador.current.rumbo, alcance, pantalla()),
        );
      } else {
        mirador.current = tirandoDelMirador(mirador.current, dx, dy, pantalla());
      }
      desde = { x: e.clientX, y: e.clientY };
    };
    const suelta = (e: PointerEvent): void => {
      apoyados.delete(e.pointerId);
      /*
       * Con un dedo menos ya no hay pellizco. El que queda apoyado NO sigue arrastrando:
       * levantar un dedo de un pellizco y que el mundo se pusiera a girar de golpe con el
       * otro es un bandazo, y para volver a girar basta con volver a apoyar.
       */
      if (apoyados.size < 2) pellizco = null;
      /*
       * Y NO SE SUELTA MIENTRAS QUEDE UN BOTÓN APRETADO. Soltar el izquierdo en mitad de
       * un desplazamiento con el derecho terminaba un gesto que seguía en marcha, y el
       * tablero se quedaba clavado con el botón todavía apretado.
       */
      if (e.buttons !== 0) return;
      desde = null;
      gira = false;
      mueveLaMirada = false;
    };
    /*
     * `passive: false` y `preventDefault`, o la Sala entera se desplaza mientras uno
     * cree estar acercándose. El navegador supone que una rueda sobre un elemento es
     * para desplazar la página y sólo deja quitárselo a un oyente que lo diga al
     * apuntarse: `addEventListener('wheel', …)` es pasivo por omisión.
     */
    const rueda = (e: WheelEvent): void => {
      /*
       * DE QUIÉN ES ESTA RUEDA, que dentro del recuadro ya no es siempre de la cámara. Ver la
       * cabecera de `EL_CAJON`: dentro de una caja que se desplaza sola —el cajón, el carril
       * de la cinta o el menú de elegir— no se toca nada, ni siquiera se llama a
       * `preventDefault`, para que el navegador la desplace como desplaza cualquier caja; y
       * sobre el velo se llama a `preventDefault` y se para ahí, porque lo que hay abierto es
       * modal y modal incluye la cámara. Sin la primera mitad, girar la rueda sobre la
       * crónica acercaba el delta detrás del cajón y la crónica no se movía un renglón.
       */
      const donde = e.target instanceof Element ? e.target : null;
      if (SE_DESPLAZAN_SOLAS.some((clase) => donde?.closest(`.${clase}`) != null)) return;
      e.preventDefault();
      if (donde?.closest(`.${EL_VELO}`) != null) return;
      alAcercarse(acercando(cercania.current, pasosDeLaRueda(e)));
    };
    /* Sin esto, el primer arrastre con el botón derecho abre el menú del navegador encima del delta. */
    const menuDelSistema = (e: MouseEvent): void => {
      e.preventDefault();
    };

    window.addEventListener('pointerdown', baja);
    window.addEventListener('pointermove', mueve);
    window.addEventListener('pointerup', suelta);
    window.addEventListener('pointercancel', suelta);
    recuadro.addEventListener('wheel', rueda, { passive: false });
    lienzo.addEventListener('contextmenu', menuDelSistema);
    return () => {
      window.removeEventListener('pointerdown', baja);
      window.removeEventListener('pointermove', mueve);
      window.removeEventListener('pointerup', suelta);
      window.removeEventListener('pointercancel', suelta);
      recuadro.removeEventListener('wheel', rueda);
      lienzo.removeEventListener('contextmenu', menuDelSistema);
    };
  }, [gl, alcance, cercania, alAcercarse]);

  useFrame(() => {
    const lienzo = gl.domElement;
    const proporcion = lienzo.clientHeight > 0 ? lienzo.clientWidth / lienzo.clientHeight : undefined;
    /*
     * Así se junta todo, y es la única forma que hay de juntarlo: el mirador dice la
     * DIRECCIÓN, el acercamiento dice a qué distancia y adónde se mira, y `ojoYMira`
     * los suma —incluida la altura mínima sobre el agua, sin la cual el ojo se mete
     * dentro de una colina al acercarse—.
     */
    const { ojo, mira } = ojoYMira(cercania.current, alcance, (distancia) =>
      ojoDelMirador(mirador.current, distancia, proporcion),
    );
    camera.position.set(...ojo);
    camera.lookAt(...mira);
    if (scene.fog instanceof Fog) {
      /*
       * LA NIEBLA SE MIDE DEL OJO AL PUNTO DE MIRA, no de la altura del ojo al suelo.
       * Antes bastaba con lo lejos que estaba el ojo del origen porque siempre se
       * miraba al origen; desde que la mirada se puede llevar a un borde del delta,
       * esa cuenta se queda corta —el ojo está lejos del centro pero cerca de lo que
       * mira— y el mundo saldría con niebla encima justo al acercarse a mirarlo.
       */
      const distancia = camera.position.distanceTo(PUNTO_DE_MIRA.set(...mira));
      scene.fog.near = distancia + alcance * NIEBLA_EMPIEZA_A;
      scene.fog.far = distancia + alcance * NIEBLA_TERMINA_A;
    }
  });
  return null;
}

// ---------------------------------------------------------------------------
// El límite del mundo
// ---------------------------------------------------------------------------

/**
 * Si el `Canvas` revienta al nacer, aquí se para y se avisa. Es la misma clase que
 * el `LimiteDelMundo` del muelle —no se exporta de allí a propósito: cada pantalla
 * decide qué hace con el fallo, y ésta cae al SVG—. No pinta nada porque lo que
 * hay que pintar en su lugar lo decide quien la monta.
 */
class LimiteDelMundo extends Component<
  { alFallar: (motivo: string) => void; children: ReactNode },
  { roto: boolean }
> {
  public override state = { roto: false };

  public static getDerivedStateFromError(): { roto: boolean } {
    return { roto: true };
  }

  public override componentDidCatch(error: unknown): void {
    this.props.alFallar(loQueSeDiceDeUnFallo(error));
  }

  public override render(): ReactNode {
    return this.state.roto ? null : this.props.children;
  }
}

// ---------------------------------------------------------------------------
// El pintor
// ---------------------------------------------------------------------------

export interface LoQueVeRiberas {
  manifiesto: ArcadeDelCatalogo;
  mesa: LaMesa;
  /** La mesa ya puesta: `mesa.mesa` cuando se está dentro. Se pasa aparte para no volver a comprobarlo. */
  puesta: MesaVista;
  /** El tablero declarado que trae la vista. Es lo que pinta el respaldo SVG. */
  tablero: TableroDeclarado;
  opciones: readonly Opcion[];
  /**
   * DÓNDE HA QUEDADO EL RECUADRO DEL LIENZO, para quien tenga que llevar el foco.
   *
   * Lo llama este pintor con el recuadro al montarlo y con `null` al soltarlo, y lo escucha
   * `sala.tsx`. Hace falta avisar porque la decisión de si HAY lienzo se toma aquí dentro y
   * en mitad del render —sin `.glb`, sin WebGL o con más colonos que colores esto cae al
   * retablo SVG y no hay recuadro ninguno—, o sea que arriba no se puede saber.
   *
   * ═══ Y ES UN AVISO Y NO UN `ref` PELADO, POR UN CAMINO QUE SE MIDIÓ ═══
   *
   * El modelo tarda: mientras carga YA HAY recuadro —con su telón—, el foco aterriza ahí, y
   * si el `.glb` acaba fallando el recuadro se desmonta CON EL FOCO DENTRO. Con un `ref`
   * pelado eso termina con el foco en el `<body>` —medido en el banco, con la ruta del modelo
   * rota a propósito— y quien juega con teclado tiene que volver a tabular desde la cabecera,
   * que es exactamente el fallo que el efecto de la Sala existe para no tener. Avisando, la
   * Sala se entera de que el recuadro se va y devuelve el foco al título, que en ese camino
   * vuelve a verse.
   *
   * OPCIONAL porque el comprobador monta este pintor suelto para medirlo, sin ninguna Sala
   * alrededor: exigirlo allí sería obligar a inventar un destino que nadie lee.
   */
  foco?: (recuadro: HTMLElement | null) => void;
  /**
   * EL RAÍL ENTERO, PARA METERLO EN EL CAJÓN.
   *
   * ═══ POR QUÉ VIENE MONTADO DE ARRIBA Y NO SE REESCRIBE AQUÍ ═══
   *
   * El cajón del §1.11 es «el raíl de siempre en el escritorio», y eso hay que tomárselo al
   * pie de la letra: dentro van el marcador, la ficha de la mesa con su código y su reloj,
   * los seis paneles que declara el juego, las dos salidas y la crónica — todo lo que la
   * Sala ya monta y sabe montar, con sus estados y sus efectos. Escribir aquí una segunda
   * versión de esas cinco cosas sería tener dos raíles: el que se ve con delta y el que se
   * ve sin él, y el día que uno gane un dato el otro no lo tendría.
   *
   * Así que la Sala lo monta UNA vez y decide dónde vive: dentro del cajón mientras haya
   * lienzo, y en su `<aside>` de siempre cuando este pintor cae al retablo. Quien le dice
   * cuál de las dos cosas está pasando es el aviso de `foco` de aquí arriba, que ya existía.
   *
   * OPCIONAL por lo mismo que `foco`: el comprobador monta este pintor sin Sala alrededor
   * en los bloques que miden otra cosa. La ficha de mis puntos sigue abriendo el cajón —es
   * la puerta y no depende de lo que haya dentro—, y sin raíl lo que se abre está vacío;
   * lo que NO puede pasar es que el cajón se pinte con un raíl a medias, porque la Sala lo
   * monta entero o no lo monta.
   */
  elRail?: ReactNode;
  /**
   * ADÓNDE VA EL «‹» DE LA CINTA: la misma dirección que el rótulo de la cabecera.
   *
   * No se escribe aquí porque lleva dentro la silla de esta ventana (`?silla=`), que es un
   * dato del bolsillo de este navegador y lo sabe la Sala. Sin él no se pinta el «‹», que
   * es lo que pasa cuando este pintor se monta suelto para medirlo.
   */
  laSalida?: string;
}

/**
 * LO QUE SE PREGUNTA CUANDO UN GESTO ADMITE VARIAS RESPUESTAS.
 *
 * Nació para el trueque —a quién se le propone— y ahora lo comparten las cartas: a quién
 * le roba La Guardia, qué dos bienes coge El Año Bueno, qué bien pide El Acaparamiento.
 * Es UN tipo y no cuatro porque la pregunta es siempre la misma: aquí están las opciones
 * que el juego ofrece, elige una. Guardar en vez de la opción entera el destinatario o el
 * par de bienes obligaría a volver a montar el movimiento al elegir, y la forma del
 * movimiento estaría escrita en un sitio que nadie comprueba.
 */
interface Preguntando {
  titulo: string;
  opciones: readonly Opcion[];
}

export function RiberasEnTres({
  manifiesto,
  mesa,
  puesta,
  tablero,
  opciones,
  foco,
  elRail,
  laSalida,
}: LoQueVeRiberas): JSX.Element {
  const { mover, quieto } = mesa;
  const vista = puesta.vista;
  const yo = puesta.yo;

  /*
   * ═══ LAS ISLAS CONSERVAN SU IDENTIDAD ENTRE SONDEOS, Y ESO ES LO QUE NO TIEMBLA ═══
   *
   * Cada respuesta del servidor trae una vista NUEVA, y `tableroEnTres` fabrica de
   * ella una lista de islas nueva aunque el delta no haya cambiado —y no cambia en
   * toda la partida—. La escena reconstruye el relieve y el plan entero del mundo
   * cuando cambia la identidad de `datos.islas` (`escenas/delta.tsx`, `relieve`):
   * miles de copias reescritas en cada jugada de cualquiera y en cada vuelta del
   * sondeo. Se vería como un tirón por revisión. Así que se firma el contenido de
   * las islas y, si es el mismo, se entrega LA MISMA lista de antes. Piezas y
   * caminos sí van frescos: son lo que cambia.
   */
  const islasVistas = useRef<{ firma: string; islas: TableroEnTres['islas'] } | null>(null);
  const datos = useMemo(() => {
    const crudo = tableroEnTres(vista);
    if (crudo === null) return null;
    const firma = crudo.islas
      .map((i) => `${String(i.hex.q)},${String(i.hex.r)}:${i.terreno}:${String(i.cifra)}`)
      .join('|');
    const antes = islasVistas.current;
    const islas = antes !== null && antes.firma === firma ? antes.islas : crudo.islas;
    islasVistas.current = { firma, islas };
    return { ...crudo, islas };
  }, [vista]);
  const mano = useMemo(() => manoEnTres(vista), [vista]);
  /*
   * LA BOLSA DEL ESTIAJE: lo que me queda por tirar de un siete, o nada.
   *
   * Va aquí arriba, antes que los botones, porque los botones dependen de ella: mientras la
   * bolsa está en la mano, los de tirar fichas NO salen en el carril. Ver la criba de abajo.
   *
   * Y NO la apaga `quieto`, al revés que el mazo. Con una petición en vuelo la mano entera se
   * apaga —eso ya lo hace la escena— pero la bolsa tiene que SEGUIR AHÍ: si desapareciera,
   * los botones del carril volverían durante ese parpadeo y la misma pantalla ofrecería lo
   * mismo dos veces, justo en el momento en que se está mandando una de las dos.
   */
  const bolsa = useMemo(() => laBolsaDelDescarte(vista, yo), [vista, yo]);
  /*
   * ADÓNDE PUEDE IR EL ESTIAJE: dieciocho señales negras sobre el tablero, o nada.
   *
   * Va aquí arriba por lo mismo que la bolsa: los botones dependen de ello. Mientras el
   * tablero pinte las señales, los dieciocho destinos NO salen en el carril; y como la bolsa,
   * no lo apaga `quieto`, o los botones volverían durante el parpadeo de una petición.
   */
  const destinosDelEstiaje = useMemo(() => estiajeEnTres(vista, yo), [vista, yo]);
  /*
   * EL CUARTO HUECO DE LA BARRA: el mazo. `quieto` lo apaga como a las tres piezas y por
   * lo mismo —con una petición en vuelo, el movimiento que se mandara ahora saldría con la
   * revisión vieja—. Apagado y NO quitado: la barra reparte centrado, y un hueco que va y
   * viene corre las otras tres piezas de sitio en cada jugada.
   *
   * Va antes que los botones porque los botones ya dependen de él: ver justo debajo.
   */
  const mazo = useMemo(() => {
    const suyo = mazoEnLaBarra(vista, yo, opciones);
    return suyo === null || !quieto ? suyo : { disponible: false };
  }, [vista, yo, opciones, quieto]);

  /*
   * ═══ LA MESA RECOGIDA (§6 del diseño) ═══
   *
   * Vive en la pantalla como lo cogido, y por lo mismo: es dónde está mirando la persona,
   * no estado del juego. NO SE GUARDA —partida nueva, mesa puesta—, así que es un
   * `useState` a secas y no algo que viaje en la vista ni en el almacén.
   *
   * Va aquí arriba, antes que los botones, porque los botones dependen de ella: con la mesa
   * recogida vuelven al pie TIRAR y COMPRAR. Ver justo debajo.
   */
  const [mesaRecogida, ponerMesaRecogida] = useState(false);
  /*
   * LOS BOTONES SON LOS QUE NO ENSEÑA NI EL TABLERO NI NINGUNA DE LAS DOS MANOS.
   *
   * Las dos criban se componen, y en este orden da igual porque las dos son filtros.
   * `opcionesFueraDeLaMano` hace falta desde que esta pantalla pinta el mazo: sin ella,
   * jugar una guardia saldría a la vez como naipe y como botón, y con catorce guardias en
   * el mazo eso es una lista de botones tan larga como la mano.
   *
   * Y LA TERCERA CRIBA ES NUEVA: comprar tampoco es un botón desde que la barra tiene el
   * cuarto hueco. `opcionesFueraDeLaBarra` lo quita, pero SÓLO cuando el hueco existe de
   * verdad —por eso recibe `mazo` y no un `true`—: en el respaldo, en la vista de un mirón
   * y en una mesa de más de cuatro colonos no hay barra, y allí el botón es la única
   * manera de comprar una carta en toda la partida.
   *
   * ═══ Y CON LA MESA RECOGIDA EL BOTÓN VUELVE, QUE ES EL MISMO FALLO OTRA VEZ ═══
   *
   * El naipe del mazo baja con la mesa: con ella recogida no hay naipe que pulsar. Si el
   * botón siguiera fuera porque «el hueco existe», comprar se quedaría sin ninguna puerta,
   * que es exactamente el fallo silencioso del respaldo, sólo que aquí la barra no falta:
   * está bajo el canto. Por eso se le pasa `null` mientras está recogida. La regla de la
   * casa se sigue cumpliendo —cada movimiento exactamente una vez— porque el botón sólo
   * vuelve cuando el naipe se ha ido.
   *
   * A `<Delta>` se le sigue pasando `mazo` ENTERO: es la llave del cuarto hueco del
   * reparto, y con `null` las piezas se repartirían de tres, o sea que se moverían al
   * recoger y otra vez al sacar. Lo que se recoge tiene que volver igual.
   *
   * FUNDAR, ALZAR y OFRECER no vuelven, y no es un olvido: `opcionesFueraDelTablero` los
   * quita sin mirar nada porque los pinta el TABLERO, así que no hay botón suyo que
   * devolver. Con la mesa recogida no se puede coger una pieza, cierto, pero eso sólo pasa
   * en mi propio turno —la mesa sale sola cuando pasa a tocarme— y sacarla es un clic en el
   * mismo botón que la recogió. Tirar y comprar son distintos porque son justo los dos que
   * podrían pillarme con la mesa recogida por mi propia mano.
   */
  /*
   * ═══ Y LA CUARTA CRIBA: TIRAR FICHAS TAMPOCO ES UN BOTÓN ═══
   *
   * Desde que la mano enseña la bolsa, cada ficha se tira arrastrándola encima. Si además
   * siguieran los botones del carril —una fila de nombres de bien detrás de una pestaña que
   * hay que abrir— la misma pantalla ofrecería lo mismo dos veces. Y como las otras tres,
   * recibe EL DATO y no un interruptor: los botones se van exactamente cuando la casilla
   * está, porque son el mismo `bolsa`.
   *
   * La bolsa NO baja con la mesa recogida, al revés que el mazo: no está sobre el tablero,
   * está en la mano, y la mano se queda. Por eso aquí no hay `mesaRecogida ? null : ...`.
   */
  /*
   * ═══ Y LA QUINTA: MOVER EL ESTIAJE TAMPOCO ES UN BOTÓN ═══
   *
   * Desde que el tablero pinta una señal negra por isla, la pieza se suelta encima como un
   * poblado. Los dieciocho botones del carril —«Mover el estiaje al cantil 10», dos de ellos
   * iguales— se van por la misma puerta que los demás: la criba recibe EL DATO que se le pasa
   * a `<Delta>`, y donde no hay señales (el retablo, la app) los botones se quedan.
   */
  const fueraDeLaBarra = useMemo(
    () =>
      opcionesFueraDeLasIslas(
        opcionesFueraDeLaBolsa(
          opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones)), mesaRecogida ? null : mazo),
          bolsa,
        ),
        destinosDelEstiaje,
      ),
    [opciones, mazo, mesaRecogida, bolsa, destinosDelEstiaje],
  );
  /*
   * LA MANO DE LA IZQUIERDA: mis premios y mis cartas del mazo, apagada entera mientras
   * haya una petición en vuelo.
   *
   * Es el mismo trato que recibe la barra dos bloques más abajo y por el mismo motivo:
   * con `quieto` puesto el movimiento que se mandara ahora saldría con la revisión vieja.
   * Las cartas NO desaparecen —eso es una regla del juego, ver `apagada` en
   * `escenas/cartas.ts`—: se apagan, que es lo que la escena sabe pintar.
   *
   * Y EL APAGÓN NO TOCA A LOS PREMIOS. Apagar es «ahora no, espera a que conteste el
   * servidor», y un premio no espera a nada: no hay movimiento en vuelo que pueda
   * cambiarlo desde esta pantalla. Apagarlo con lo demás lo haría parpadear en cada
   * jugada, que es la manera de que se lea como un naipe roto. `esPremio` viaja intacto,
   * así que la escena lo sigue pintando encendido aunque las dos banderas estén en `false`.
   */
  const cartasDelMazo = useMemo(() => {
    const mano = laManoDeLaIzquierda(vista, opciones, yo);
    if (!quieto) return mano;
    return mano.map((c) =>
      c.esPremio === true ? c : { ...c, sePuedeJugar: false, sePuedeRevelar: false },
    );
  }, [vista, opciones, yo, quieto]);

  // -------------------------------------------------------------------------
  // Lo que se tiene en la mano
  // -------------------------------------------------------------------------

  const [tomada, ponerTomada] = useState<IdDeLaBarra | null>(null);
  const [cogida, ponerCogida] = useState<string | null>(null);
  /** El naipe del mazo levantado, por su seudónimo. Nunca la carta entera: es secreta. */
  const [cartaDelMazo, ponerCartaDelMazo] = useState<string | null>(null);
  /**
   * EL NAIPE QUE EL CURSOR SEÑALA, que NO es el que está cogido.
   *
   * Sale de la escena por `onSenalarCartaDelMazo`, que cuelga de los `onPointerOver` y
   * `onPointerOut` que cada naipe ya tenía. No entra en `soltarTodo` y no debe entrar: no
   * es algo que se tenga en la mano, es dónde está el ratón, y una jugada ajena no mueve
   * el cursor de sitio. Con dedo esto vale `null` siempre y no falta: allí el cartel
   * cuelga de `cartaDelMazo`, que es un estado que ya existía.
   */
  const [naipeSenalado, ponerNaipeSenalado] = useState<string | null>(null);
  const [preguntando, ponerPreguntando] = useState<Preguntando | null>(null);

  /*
   * EL RECUADRO, GUARDADO, Y NO PARA MEDIRLO: PARA DEVOLVERLE EL FOCO.
   *
   * El menú de elegir lo abre un naipe del `<canvas>`, y un `<canvas>` no recibe foco: al
   * cerrar el menú no hay «el botón que lo abrió» al que volver, como sí lo hay en el cajón.
   * El destino es el recuadro, que para eso lleva `tabIndex={-1}`, `role="group"` y nombre —es
   * el mismo sitio donde aterriza el foco al sentarse—. Sin esto, cerrar el menú suelta el
   * foco al `<body>` y hay que tabular desde la cabecera de la Sala en cada carta que se juega.
   */
  const elRecuadro = useRef<HTMLDivElement | null>(null);

  /**
   * SOLTARLO TODO: la pieza, el bien, el naipe y la pregunta abierta.
   *
   * ═══ POR QUÉ EXISTE, Y POR QUÉ ESTAS CUATRO Y NO OTRAS ═══
   *
   * Esta pantalla no lo tenía y la de la app sí (`soltarTodo`, siete estados). Con dos
   * sitios que tienen que soltar lo mismo —el cambio de revisión y recoger la mesa— y sin
   * un nombre para «lo mismo», las dos listas se separan el día que llegue un quinto
   * estado que se pueda tener en la mano: una lo soltaría y la otra no, y el fallo sería
   * una carta pegada al cursor sin nada debajo.
   *
   * `preguntando` ENTRA, y no por simetría con la app sino por lo que es: el menú pequeño
   * que se abre al soltar una carta sobre un bien, al soltar un naipe en jugar o al pulsar
   * el naipe del mazo. Es una pregunta SOBRE algo que se tenía cogido; soltar lo cogido y
   * dejar la pregunta abierta deja un menú preguntando a quién le propongo un trueque que
   * ya no está en mi mano. Es lo mismo que hacen en la app las tres hojas —`aQuien`,
   * `comoJugarla` y `comprando`—, que están dentro de su `soltarTodo`.
   *
   * Los otros `ponerCogida(null)` sueltos que quedan en el fichero NO se recogen aquí a
   * propósito: son los tres manejadores de COGER, y cada uno suelta sólo a sus hermanos
   * incompatibles (coger un naipe suelta el bien y la pieza) mientras deja en pie lo que el
   * gesto no toca. Llamar a éste desde ellos cerraría un menú que nadie pidió cerrar.
   */
  const soltarTodo = useCallback(() => {
    ponerTomada(null);
    ponerCogida(null);
    ponerCartaDelMazo(null);
    ponerPreguntando(null);
  }, []);

  /*
   * ═══ CERRAR EL MENÚ A MANO, QUE NO ES LO MISMO QUE SOLTARLO TODO ═══
   *
   * `soltarTodo` cierra la pregunta porque la mesa cambió debajo; esto la cierra porque quien
   * jugaba la ha cerrado —eligiendo, con «Dejarlo» o con `Escape`— y por eso ADEMÁS devuelve
   * el foco. El menú es modal desde que vive dentro del recuadro, y una caja modal que se
   * desmonta con el foco dentro lo suelta al `<body>`: quien juega con teclado tendría que
   * tabular desde la cabecera de la Sala cada vez que juega un naipe. Vuelve al RECUADRO y no
   * a un botón, porque al menú lo abre un naipe del `<canvas>` y un `<canvas>` no recibe foco.
   *
   * No entra en `soltarTodo`: allí el menú se cierra sin que nadie lo haya pedido —una jugada
   * ajena, la mesa recogida—, y mover el foco por algo que pasó en otra pantalla es robárselo
   * a quien estaba escribiendo en otro sitio.
   */
  const cerrarElMenu = useCallback(() => {
    ponerPreguntando(null);
    elRecuadro.current?.focus();
  }, []);

  /*
   * AL CAMBIAR LA REVISIÓN SE SUELTA TODO. Lo que se tenía agarrado se agarró
   * mirando la mesa anterior: los sitios legales de esa pieza pueden haber dejado
   * de serlo, y la carta cogida puede haberse gastado. Seguir con ello en la mano
   * sería ofrecer soltarlo donde la mesa nueva ya no lo admite.
   */
  useEffect(() => {
    soltarTodo();
  }, [puesta.rev, soltarTodo]);

  /*
   * RECOGER SUELTA LO COGIDO, y sacar no suelta nada. Una pieza en la mano con la barra
   * fuera de la pantalla no tiene a dónde volver, y un menú abierto sobre un naipe que
   * acaba de irse bajo el canto pregunta por algo que ya no se ve. Al subir no se pierde
   * nada, así que no hay nada que soltar.
   */
  const alRecogerLaMesa = useCallback(() => {
    if (!mesaRecogida) soltarTodo();
    ponerMesaRecogida(!mesaRecogida);
  }, [mesaRecogida, soltarTodo]);

  /*
   * ═══ LA MESA SALE SOLA AL PASAR A TOCARME, Y ESPERA SI HAY ALGO EN LA MANO ═══
   *
   * Decisión 16 del §1, cerrada por Miguel: recoger es para MIRAR, y cuando hay que actuar
   * la mesa vuelve. Es el FLANCO —`meToca` de falso a verdadero— y no el valor: con el
   * valor, recoger la mesa en mi propio turno la sacaría en el render siguiente y no habría
   * manera de mirar el tablero mientras me toca.
   *
   * Y NO SALE CON UNA CARTA EN LA MANO. Una mesa que sube por debajo de un arrastre cambia
   * lo que hay bajo el cursor a mitad de gesto: la carta que se llevaba a un área acabaría
   * soltada sobre una pieza de la barra que no estaba ahí cuando el botón bajó. El flanco
   * se APUNTA y la salida espera a que la mano quede vacía. Una pieza de la barra no puede
   * estarlo: con la mesa recogida no hay de dónde cogerla.
   *
   * Los dos apuntes van en REFS y no en estados porque no pintan nada y un estado de más
   * aquí es un render de más por vuelta del sondeo. El efecto se despierta igual: `cogida`
   * y `cartaDelMazo` sí son estados y están en sus dependencias. Y como la pantalla suelta
   * todo al cambiar `rev`, la espera dura lo que dure el gesto.
   */
  const meTocaAhora = meToca(vista);
  const meTocabaAntes = useRef(false);
  const laSalidaEspera = useRef(false);
  useEffect(() => {
    if (meTocaAhora && !meTocabaAntes.current) laSalidaEspera.current = true;
    meTocabaAntes.current = meTocaAhora;
    if (!laSalidaEspera.current) return;
    if (cogida !== null || cartaDelMazo !== null) return;
    laSalidaEspera.current = false;
    ponerMesaRecogida(false);
  }, [meTocaAhora, cogida, cartaDelMazo]);

  /*
   * La barra y lo que se está colocando se DERIVAN de la vista en cada render, no se
   * guardan: así, si la vista cambia sin que cambie `rev` —no debería, pero un
   * sondeo trae la mesa entera—, los anillos son siempre los de lo que hay delante.
   * `quieto` apaga la barra entera: con una petición en vuelo no se coge nada.
   */
  const barra = useMemo(
    () => barraEnTres(vista, yo).map((p) => (quieto ? { ...p, disponible: false } : p)),
    [vista, yo, quieto],
  );
  /*
   * EL TAPETE DEL TURNO: el color de quien juega, leído de la vista por `shared/`. Sin
   * esto la mesa salía sin tapete en la partida —la entrada de `<Delta>` es opcional y no
   * se caía nada— y con él sólo en el banco.
   */
  const turnoDe = useMemo(() => turnoEnTres(vista), [vista]);

  /*
   * ═══ LOS DADOS: SÓLO DONDE CABEN, Y EL BOTÓN DE TIRAR SE VA DONDE ESTÁN ═══
   *
   * La escena decide con `huecosDeLaMesa` si hay sitio para los dados (colgados a la
   * izquierda o como quinto hueco) y lo decide con el ALTO DEL LIENZO EN PUNTOS, porque el
   * suelo de toque son 44 puntos. Esta pantalla hace LA MISMA pregunta con la misma medida
   * antes de quitar el botón: si la escena no pinta dados, el botón se queda (320×360 y
   * 360×490 de pie, §4.4 del diseño). Como las dos llaman a la misma función con la misma
   * medida no pueden discrepar. El lienzo se mide con un `ResizeObserver` sobre el
   * recuadro, que es lo que la cámara también toma por lienzo.
   *
   * Y el ORDEN es el del mazo: `dadosEnTres` recibe las opciones ENTERAS y
   * `opcionesFueraDeLaMesa` filtra DESPUÉS; al revés `porTirar` sería siempre falso y los
   * dados no vibrarían nunca. `quieto` los apaga como a la barra: con una petición en
   * vuelo no se tira.
   */
  const [lienzo, ponerLienzo] = useState({ ancho: 0, alto: 0 });
  /*
   * Y LA RAÍZ DE LA LETRA SE MIDE AQUÍ MISMO, en el mismo latido que el lienzo.
   *
   * No es un tercer observador: el cartel se pinta en `rem` y el alto máximo que le
   * calculamos va en puntos, así que las dos medidas tienen que venir del mismo momento o
   * el último renglón se corta en silencio (ver `raizDelNavegador`). Se observa además la
   * RAÍZ DEL DOCUMENTO, porque cambiar la preferencia de tamaño de letra del navegador no
   * cambia el tamaño de este recuadro (es `100 %` de ancho y `62vh` de alto) y sin eso la
   * medida nueva no llegaría hasta el siguiente redimensionado de la ventana. Los dos
   * `useState` se plantan solos si el número no cambió, así que un observador de más no
   * cuesta ni un repintado.
   */
  const [raizDeLaLetra, ponerRaizDeLaLetra] = useState(RAIZ_DE_LA_CASA);
  const medirElRecuadro = useCallback((recuadro: HTMLDivElement | null) => {
    elRecuadro.current = recuadro;
    /*
     * PRIMERO SE AVISA DEL DESTINO DEL FOCO, Y ANTES DE LA GUARDA DE `ResizeObserver`.
     * Detrás de ella el aviso se perdería exactamente donde más falta hace —un navegador
     * viejo, una prueba en Node— y el foco volvería a caer al `body` al sentarse sin que nada
     * fallara. Y se avisa también con `null`, que es cuando el recuadro SE VA: la Sala tiene
     * que poder rescatar el foco si se lo lleva puesto, y no quedarse con el recuadro de una
     * mesa de la que uno acaba de levantarse.
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
  }, [foco]);
  const observadorDelRecuadro = useRef<ResizeObserver | null>(null);
  useEffect(() => () => observadorDelRecuadro.current?.disconnect(), []);
  const haySitioParaLosDados = useMemo(() => {
    if (lienzo.alto <= 0 || lienzo.ancho <= 0) return false;
    const cuantos = barra.length + (mazo === null ? 0 : 1);
    return huecosDeLaMesa(cuantos, CAMPO_DE_LA_CAMARA, lienzo.ancho / lienzo.alto, lienzo.alto).dados !== null;
  }, [lienzo, barra.length, mazo]);
  const dados = useMemo((): DadosEnTres | null => {
    if (!haySitioParaLosDados) return null;
    const suyos = dadosEnTres(vista, yo, opciones);
    return suyos === null || !quieto ? suyos : { ...suyos, disponible: false };
  }, [haySitioParaLosDados, vista, yo, opciones, quieto]);

  /*
   * TIRAR VUELVE AL PIE MIENTRAS LA MESA ESTÁ RECOGIDA, y es el agujero gordo del §6.
   *
   * Con la mesa abajo NO HAY DADOS QUE TOCAR —se desmontan al llegar—, pero
   * `opcionesFueraDeLaMesa` quita TIRAR de la lista en cuanto `dados` no es `null`. El §6
   * deja recoger la mesa EN MI PROPIO TURNO y la deja recogida hasta que yo diga: sin esto,
   * quien la recoja antes de tirar se queda sin poder tirar y sin nada que explique por
   * qué, o sea la partida parada. Así que se compone con `null` mientras está recogida,
   * igual que con el mazo de arriba.
   *
   * A `<Delta>` se le sigue pasando `dados` ENTERO: `dados !== null` es la llave del QUINTO
   * hueco (§4.4) y con `null` las piezas se correrían al recoger y volverían al sacar.
   */
  /*
   * ═══ EL PREGÓN, Y RECIBE LAS OPCIONES ENTERAS, ANTES DE NINGÚN FILTRO ═══
   *
   * El mismo orden que `mazoEnLaBarra` con el mazo y `dadosEnTres` con los dados: primero
   * esto, con la lista completa, y después `opcionesFueraDelPregon` quita ACEPTAR y RECHAZAR
   * de lo que va a los botones. Al revés el pregón se quedaría sin los dos botones que cuelga
   * de cada tira, que son justo lo que hay que pulsar.
   *
   * Y sale de `opciones` y no de `fueraDeLaBarra` por lo mismo: aquellas ya han pasado por
   * tres cribas y una de ellas podría llevárselos mañana.
   */
  const pregon = useMemo(() => elPregonEnTres(vista, yo, opciones), [vista, yo, opciones]);
  /*
   * ═══ LO QUE SE LLEVA MONTADO EN EL COMPONEDOR, Y ES LO ÚNICO QUE ESTA PANTALLA GUARDA ═══
   *
   * Ni el tope, ni cuántas fichas tengo, ni si el «+» se puede pulsar: eso lo deriva
   * `elComponedor` de esto más la vista, en `shared/`, que es donde lo lee también la app.
   * Aquí sólo vive dónde está mirando quien juega, como el cajón y como la mesa recogida.
   *
   * Y SE SUELTA SOLO CUANDO LA PUERTA SE VA. Al pasar el turno el juego deja de declarar
   * qué trueque admite, así que no hay componedor que pintar; sin esto, dos sales montadas
   * seguirían ahí tres turnos después, encima de una mano que ya no las tiene.
   */
  const [loQueSeCompone, ponerLoQueSeCompone] = useState<LoQueSeCompone>(NADA_COMPUESTO);
  const [componedorAbierto, ponerComponedorAbierto] = useState(false);
  /*
   * ═══ EL CUADRADO DE LA CINTA QUE LO ABRE, Y ADONDE VUELVE EL FOCO AL CERRARLO ═══
   *
   * Una caja modal que se desmonta con el foco dentro lo suelta al `<body>`, y desde el
   * `<body>` no hay manera de volver al lienzo sin tabular la cabecera entera de la Sala.
   * El cajón vuelve a la ficha de los puntos y la hoja de una propuesta vuelve a su tira;
   * esto vuelve al cuadrado del carril, que es lo que lo abrió y que sigue estando ahí
   * también después de proponer —apagado, si con ésa se llegó a las cuatro vivas, y un
   * botón `aria-disabled` sigue pudiendo tener el foco, que es justo por lo que se apaga
   * así y no con `disabled`—.
   */
  const laPuertaDelTrueque = useRef<HTMLButtonElement | null>(null);
  const componedor = useMemo(
    () => elComponedor(vista, yo, opciones, loQueSeCompone),
    [vista, yo, opciones, loQueSeCompone],
  );
  const hayPuerta = componedor !== null;
  /*
   * ═══ Y SI LA PUERTA SE VA CON EL COMPONEDOR ABIERTO, EL FOCO VUELVE AL RECUADRO ═══
   *
   * No es un caso raro: la puerta se va en cuanto pasa mi turno, o sea cada pocos segundos
   * por el sondeo, y una caja modal que se desmonta con el foco dentro lo suelta al
   * `<body>`. Desde ahí hay que tabular la cabecera entera de la Sala para volver al
   * tablero. Es el mismo rescate que la hoja de una propuesta, escrito por el mismo motivo.
   *
   * Y EL FOCO SÓLO SE MUEVE SI ESTABA ABIERTO, que es la mitad que no se ve: esta condición
   * es cierta en todos los turnos ajenos, así que llamar a `focus()` sin mirar le robaría el
   * foco a quien estuviera leyendo la crónica del cajón cada vez que juega otro. Por eso
   * `componedorAbierto` entra en la lista de dependencias en vez de leerse de una clausura
   * vieja: la vuelta siguiente ya vale `false` y esto no hace nada.
   */
  useEffect(() => {
    if (hayPuerta) return;
    ponerLoQueSeCompone(NADA_COMPUESTO);
    if (!componedorAbierto) return;
    ponerComponedorAbierto(false);
    elRecuadro.current?.focus();
  }, [hayPuerta, componedorAbierto]);
  /* Se manda lo que el componedor montó y se vacía: lo montado ya está en la mesa. */
  const proponerElTrueque = useCallback(
    (movimiento: { tipo: string; carga: unknown }) => {
      ponerLoQueSeCompone(NADA_COMPUESTO);
      ponerComponedorAbierto(false);
      /*
       * Y EL FOCO VUELVE AL CUADRADO, que es lo mismo que hace `cerrarElComponedor` y por
       * el mismo motivo: proponer desmonta la caja con el foco puesto en «Proponer». En el
       * retablo esto no hace falta —allí la sección se pliega y el botón que la abre sigue
       * en el flujo, dos renglones más arriba—; en el lienzo no hay flujo al que volver.
       */
      laPuertaDelTrueque.current?.focus();
      void mover(movimiento);
    },
    [mover],
  );
  const cerrarElComponedor = useCallback(() => {
    ponerComponedorAbierto(false);
    laPuertaDelTrueque.current?.focus();
  }, []);
  const fuera = useMemo(
    () => opcionesFueraDelPregon(opcionesFueraDeLaMesa(fueraDeLaBarra, mesaRecogida ? null : dados), pregon),
    [fueraDeLaBarra, dados, mesaRecogida, pregon],
  );
  /*
   * ═══ QUÉ DICE CADA CUADRADO DEL CARRIL, Y POR QUÉ SE PREGUNTA SOBRE `fuera` ═══
   *
   * Sobre la lista YA CRIBADA y no sobre `opciones`, aunque la tabla sea por `id` y sobrar
   * entradas no rompa nada: preguntarlo sobre la lista entera obligaría a recorrer las
   * treinta y siete opciones de un turno cargado para pintar dos cuadrados, en cada render
   * del delta. Lo que se pinta es lo que se pregunta.
   *
   * La traducción vive en `shared/arcade/juegos/riberas-en-tres.ts` y no aquí, como todo lo
   * demás que este pintor lee de la vista: aquí no se sabe qué es un estiaje ni qué es una
   * isla, y el día que la app pinte esta misma tira leerá la misma tabla.
   */
  const glifos = useMemo(() => glifosDelCarril(vista, fuera), [vista, fuera]);
  /*
   * ═══ Y SI HAY CARRIL, QUE ES LO QUE LA CINTA MIDE DISTINTO ═══
   *
   * El carril de la cinta —la segunda tira de 44 puntos con un botón cuadrado por opción
   * suelta— existe cuando `fuera` trae algo O cuando el juego declara la puerta del trueque,
   * porque el cuadrado que abre el componedor vive ahí. No es un ajuste: es lo que decide si
   * la caja opaca de arriba mide 44 o 88, y de ahí sale la banda que le queda al cartel de los
   * naipes. Se lee una vez y lo miran los dos sitios —la cuenta del cartel y el marcado—, para
   * que no haya dos condiciones que puedan separarse.
   *
   * ═══ Y EL SEGUNDO SUMANDO CASI NUNCA CAMBIA NADA, QUE ES LO QUE HAY QUE DECIR ═══
   *
   * La puerta sólo sale en MI turno y con la tirada hecha, y en ese turno `fuera` ya trae
   * «Pasar el turno», así que el carril ya existía. Está escrito de todas formas porque lo
   * que no se puede es pintar una segunda tira sin que la cuenta del cartel se entere: el
   * día que pasar deje de ser una opción suelta —o que el pregón se lleve la última—, el
   * cuadrado se pintaría encima de una cinta medida como si midiera 44, y el cartel de un
   * naipe se metería 46,75 puntos por debajo de él.
   */
  const hayCarril = fuera.length > 0 || componedor !== null;

  /*
   * ═══ QUÉ NAIPE SE ESTÁ EXPLICANDO, Y LA PRECEDENCIA EN UNA LÍNEA ═══
   *
   * Si hay carta COGIDA, el cartel es el suyo, aunque el cursor pase por otra. Al revés el
   * cartel cambiaría bajo el dedo que está a punto de soltar el naipe en la casilla, que es
   * el momento en que más importa que diga la verdad.
   *
   * Y se busca por seudónimo en la mano de VERDAD en vez de guardarse la carta entera. No
   * es un rodeo: un naipe se juega y desaparece sin que llegue ningún `onPointerOut` —el
   * componente se desmonta y ya está—, así que el seudónimo señalado puede quedarse
   * apuntando a una carta que ya no está en la mano. Buscándolo, esa carta no tiene cartel
   * y el cartel se va solo; guardándola, se quedaría en pantalla explicando un naipe que ya
   * no existe.
   */
  const naipeExplicado = useMemo((): CartaDelMazoEnTres | null => {
    const cual = cartaDelMazo ?? naipeSenalado;
    if (cual === null) return null;
    return cartasDelMazo.find((c) => c.id === cual) ?? null;
  }, [cartaDelMazo, naipeSenalado, cartasDelMazo]);
  /*
   * Y DÓNDE CABE, con las manos de verdad y con los huecos de barra de verdad: los mismos
   * `cuantos` que deciden si hay dados dos bloques más arriba. Ver `elCartelQueCabe`, que
   * es donde vive la aritmética y donde `verify:escritorio` la mide lienzo a lienzo.
   *
   * CON LA MESA RECOGIDA SON CERO HUECOS, y no los de la barra que no está en pantalla. El
   * pie del cartel se apoya en el techo del ASA, y con la mesa abajo no hay asa: medido
   * contra cuatro huecos, el cartel se quedaba flotando el alto de una barra por encima del
   * canto justo cuando la mesa se ha recogido para ver MÁS tablero. No tapaba nada —de ahí
   * que se pasara— pero dejaba un hueco raro y desperdiciaba media banda: con cero, el
   * cartel baja al canto y le caben las tres frases en sitios donde antes cabían dos.
   */
  const cuantosHuecosDeBarra = mesaRecogida ? 0 : barra.length + (mazo === null ? 0 : 1);
  const cartel = useMemo((): CartelAlPie | null => {
    if (naipeExplicado === null) return null;
    return elCartelQueCabe(
      lienzo,
      cuantosHuecosDeBarra,
      naipeExplicado.explicacion,
      raizDeLaLetra,
      hayCarril,
      /*
       * Y CON EL PREGÓN PINTADO NO HAY CARTEL. La regla de exclusión del §4.1 del trueque,
       * en la única línea donde se puede escribir: medido, con la cinta a 88 y el cartel
       * puesto al pregón le quedan 32 puntos en el SE apaisado, o sea CERO tiras. Las dos
       * cosas no compiten de verdad por la atención —el cartel se pide señalando un naipe
       * PROPIO, que es un gesto de mi turno, y el pregón existe justo cuando juega otro—.
       *
       * AQUÍ SE APARTA UN PELO DE LO QUE DICE EL §4.1, y es a propósito: allí se dice que
       * con la HOJA de una propuesta abierta el cartel vuelve a caber, porque el pregón deja
       * de estar pintado debajo. En este cliente la hoja lleva su VELO, que se come los
       * punteros, así que con ella abierta no se puede señalar un naipe y no hay cartel que
       * pedir. Devolverlo entonces sería pintar una caja que nadie ha pedido encima del
       * tablero. El pregón se queda debajo del velo y el cartel, apagado.
       */
      pregon !== null,
    );
  }, [naipeExplicado, lienzo, cuantosHuecosDeBarra, raizDeLaLetra, hayCarril, pregon]);

  // -------------------------------------------------------------------------
  // La cinta de arriba y el cajón que cuelga de ella
  // -------------------------------------------------------------------------

  /*
   * ═══ EL RELOJ, ANTES QUE LA CINTA PORQUE LA CINTA LO DESCUENTA ═══
   *
   * Es lo que faltaba y lo que hizo perder tres turnos: la línea de estado no decía NUNCA
   * cuánto quedaba de turno, y la cuenta atrás vivía sólo dentro del cajón. Sale del plazo de
   * la MESA —`venceEn` y `terminada`, que ya viajaban por el cable y que este pintor ya
   * recibía en `puesta`— y no del juego: el plazo es de la mesa, y Riberas no sabe nada de
   * él. Ver `usarElRelojDeLaCinta`.
   */
  const elReloj = usarElRelojDeLaCinta(puesta.venceEn, puesta.terminada);
  /*
   * DE LO QUE EL REPARTO DEPENDE ES DE SI HAY RELOJ, NO DE LA HORA QUE ES.
   *
   * `elReloj` es un objeto nuevo en cada latido —cada segundo en el último minuto—, así que
   * meterlo tal cual en la lista de abajo dejaría el `useMemo` sin memo: `laCinta` cambiaría de
   * identidad una vez por segundo y arrastraría con ella el estilo de la cinta, el del carril,
   * el del cajón y el del pregón, que la reciben por la puerta. El ancho de la cinta no depende
   * de lo que el reloj DIGA, sólo de si lo hay.
   */
  const conReloj = elReloj !== null;

  /*
   * CUÁNTO ANCHO SE LLEVA LA CINTA Y QUÉ LE CABE, con la MISMA función que va a llamar la
   * app y que `verify:escena` mide contra las dos manos: `escenas/cinta.ts`. Aquí no hay
   * ninguna fracción escrita; lo único que este cliente pone son las TRES cosas que dependen
   * de cómo pinta él y que `escenas/` no puede saber: cuánto ocupan ocho letras, cuánto mide
   * un botón y cuánto se lleva el reloj, las tres con la raíz de VERDAD del navegador.
   */
  const laCinta = useMemo(
    () =>
      loQueLlevaLaCinta(
        lienzo.ancho,
        lienzo.alto,
        huecoMinimoDeLaFrase(raizDeLaLetra),
        ladoDelBotonDeLaCinta(raizDeLaLetra),
        conReloj ? huecoDelRelojDeLaCinta(raizDeLaLetra) : 0,
      ),
    [lienzo, raizDeLaLetra, conReloj],
  );
  /*
   * EL MARCADOR, PARA LA FICHA DE MIS PUNTOS DE LA CINTA. Es la misma traducción que pinta
   * el marcador del cajón, leída una vez: los puntos «a la vista» y mi color de las piezas
   * del tablero. `null` con una vista que no es de Riberas, y entonces la ficha se queda en
   * el «≡» pelado en vez de inventar un cero.
   */
  const marcador = useMemo(() => marcadorEnTres(vista), [vista]);
  const yoEnElMarcador = useMemo(() => marcador?.colonos.find((c) => c.soyYo) ?? null, [marcador]);
  /*
   * LO QUE SÓLO CUENTO YO, y `null` cuando no hay nada que contar. Se saca aquí y no en el
   * JSX porque lo miran DOS sitios de la misma ficha —el «+N» pintado y la frase que oye un
   * lector— y dos condiciones escritas aparte se separan el día que alguien toque una: el
   * caso malo es la que se queda diciendo «y 5 contándote lo oculto» cuando en pantalla ya no
   * hay ningún «+N», o al revés.
   *
   * La cifra es la DIFERENCIA y no el total, igual que en el marcador del cajón: el total lo
   * dice la frase que se oye entera, y el «+N» de la pantalla es lo que hay que sumarle al
   * número público, que es el que ve la mesa.
   */
  const loOcultoDeLaFicha = useMemo(() => {
    const con = yoEnElMarcador?.puntosConLoOculto;
    if (yoEnElMarcador == null || con == null || con === yoEnElMarcador.puntos) return null;
    return con - yoEnElMarcador.puntos;
  }, [yoEnElMarcador]);

  /*
   * ═══ EL CAJÓN ES MODAL, Y ESO SON TRES COSAS Y NO UNA ═══
   *
   * Modal quiere decir, por orden de lo que cuesta olvidarlo: que un toque fuera SÓLO lo
   * cierra y no pasa a nada de lo que hay debajo —ni al tablero, ni a las cartas, ni a la
   * barra: quien cierra el cajón no quiere construir donde tenía el dedo—; que el foco no
   * se sale de él mientras está abierto; y que al cerrarlo el foco vuelve a la ficha que lo
   * abrió, no al `<body>`.
   *
   * Vive en un `useState` a secas y no viaja a ninguna parte: es dónde está mirando la
   * persona, como la mesa recogida. Y NO se cierra al cambiar la revisión —no entra en
   * `soltarTodo`—: el sondeo trae una mesa nueva cada pocos segundos, y un cajón que se
   * cierra solo mientras se lee la crónica es peor que no tenerlo.
   */
  const [cajonAbierto, ponerCajonAbierto] = useState(false);
  const laFichaDeMisPuntos = useRef<HTMLButtonElement | null>(null);
  const elCajon = useRef<HTMLDivElement | null>(null);
  const nombreDelCajon = useId();
  const cerrarElCajon = useCallback(() => {
    ponerCajonAbierto(false);
    laFichaDeMisPuntos.current?.focus();
  }, []);
  /*
   * AL ABRIRLO, EL FOCO SE VA DENTRO; y mientras está abierto, no sale. Lo hace la misma
   * trampa que usa el menú de elegir, y por eso está escrita una sola vez: ver
   * `usarLaTrampaDeFoco`. Sin ella, tabular desde la crónica se iba a la cabecera de la Sala
   * con un cajón opaco puesto encima, o sea el foco en un sitio que no se ve.
   */
  usarLaTrampaDeFoco(cajonAbierto, elCajon, cerrarElCajon);

  // -------------------------------------------------------------------------
  // El pregón del trueque, y la hoja donde se confirma
  // -------------------------------------------------------------------------

  /*
   * HASTA DÓNDE PUEDE COLGAR, y se para en la misma raya que el cartel: el techo del asa de
   * la barra. El pregón NO es modal —por debajo se sigue girando el tablero, que es todo el
   * motivo de que exista—, así que colgando hasta el canto taparía la barra de piezas y el
   * naipe del mazo. Los huecos son los de VERDAD, los mismos que deciden si caben los dados.
   */
  const altoDelPregon = useMemo(
    () => elAltoDelPregon(lienzo, cuantosHuecosDeBarra, hayCarril, raizDeLaLetra),
    [lienzo, cuantosHuecosDeBarra, hayCarril, raizDeLaLetra],
  );

  /*
   * ═══ QUÉ PROPUESTA TIENE LA HOJA ABIERTA, Y SE GUARDA EL SEUDÓNIMO Y NO LA TIRA ═══
   *
   * Es la misma razón por la que el cartel de un naipe busca la carta en la mano de verdad en
   * vez de guardársela: la tira que se abrió puede dejar de ser la que era. Una propuesta
   * viva se acepta, se aparta o caduca al pasar el turno, y `v.tratos` sólo recuerda las ocho
   * últimas; guardando el objeto, la hoja se quedaría abierta ofreciendo «Aceptar» sobre un
   * trato que el juego ya no ofrece, y ese botón viajaría con una opción que la mesa
   * rechazaría sin decir por qué. Buscándolo por seudónimo, la hoja se convierte sola en
   * lectura cuando el trato se cierra, y se cierra sola cuando el trato desaparece.
   *
   * Y NO ENTRA EN `soltarTodo`. Allí se suelta lo que se tiene EN LA MANO porque la mesa
   * cambió debajo; una propuesta no se tiene en la mano, y el sondeo trae una revisión nueva
   * cada vez que cualquiera juega: una hoja que se cerrara con cada jugada ajena sería
   * imposible de leer justo en el turno de otro, que es cuando existe.
   */
  /*
   * ═══ SI EL PREGÓN SE PLIEGA, Y SI ALGUIEN LO HA DESPLEGADO ═══
   *
   * `sePliega` no es de esta pantalla: lo dice `elPregonSePliega` con la vista, y quiere decir
   * «aquí no hay nada que contestar» —que hoy es «es mi turno», por lo que está escrito en
   * `shared/`—. `desplegado` sí lo es, y sólo lo es: es dónde está mirando quien juega, como
   * el cajón y como la mesa recogida, y no viaja a ninguna parte.
   *
   * Y SE VUELVE A PLEGAR CUANDO DEJA DE PODER PLEGARSE, no con cada jugada. Quien lo abre en
   * su turno lo tiene abierto ese turno entero —cerrárselo debajo en cada revisión del sondeo
   * sería el cajón que se cierra solo, que ya está apuntado aquí como peor que no tenerlo—; y
   * al llegar algo que contestar el pregón se pinta ENTERO por su cuenta y esto se apaga, para
   * que el turno siguiente empiece plegado y no con media pantalla de tablero tapada.
   */
  const pregonSePliega = elPregonSePliega(pregon);
  const [pregonDesplegado, ponerPregonDesplegado] = useState(false);
  useEffect(() => {
    if (!pregonSePliega) ponerPregonDesplegado(false);
  }, [pregonSePliega]);
  const [tratoAbierto, ponerTratoAbierto] = useState<string | null>(null);
  const elPregonEnLaPantalla = useRef<HTMLDivElement | null>(null);
  const laTiraAbierta = useMemo((): TiraDelPregon<Opcion> | null => {
    if (tratoAbierto === null || pregon === null) return null;
    return (
      [...pregon.paraContestar, ...pregon.mias, ...pregon.cerrados].find((t) => t.id === tratoAbierto) ?? null
    );
  }, [tratoAbierto, pregon]);

  /*
   * AL CERRARLA, EL FOCO VUELVE A SU TIRA, y si la tira ya no está, al recuadro.
   *
   * Una caja modal que se desmonta con el foco dentro lo suelta al `<body>`, y desde ahí hay
   * que tabular la cabecera entera de la Sala. El cajón vuelve a la ficha que lo abrió y el
   * menú de elegir vuelve al recuadro —a él lo abre un naipe del `<canvas>`, que no recibe
   * foco—; aquí SÍ hay botón al que volver, pero no es uno fijo: son tantos como propuestas.
   * Se busca por el seudónimo dentro del pregón, que para eso cada tira lo lleva escrito.
   *
   * Y la tira puede haberse ido mientras la hoja estaba abierta —aceptarla la muda del bloque
   * de contestar al de ya trocado, y ahí sigue estando; pero un noveno trato la echa de la
   * lista—, así que el recuadro es el respaldo. Sin respaldo, el caso raro es el que suelta
   * el foco al `body`.
   */
  const cerrarLaHoja = useCallback(() => {
    const cual = tratoAbierto;
    ponerTratoAbierto(null);
    const suya =
      cual === null
        ? null
        : elPregonEnLaPantalla.current?.querySelector<HTMLButtonElement>(`[data-trato="${cual}"]`);
    if (suya != null) suya.focus();
    else elRecuadro.current?.focus();
  }, [tratoAbierto]);

  /*
   * Y SI EL TRATO DESAPARECE CON LA HOJA ABIERTA, la hoja se cierra sola. No es un caso
   * inventado: el pregón entero se va en cuanto no queda una propuesta viva, o sea en cuanto
   * pasa el turno de quien la hizo, y eso pasa cada pocos segundos por el sondeo. Sin esto la
   * hoja se desmontaría con el foco dentro y lo soltaría al `<body>`.
   */
  useEffect(() => {
    if (tratoAbierto === null || laTiraAbierta !== null) return;
    ponerTratoAbierto(null);
    elRecuadro.current?.focus();
  }, [tratoAbierto, laTiraAbierta]);

  /*
   * AL PULSAR EL ASA DE LOS DADOS: se manda TIRAR por la misma puerta que el botón y se le
   * devuelve a la escena cómo acabó, que es lo que corta el rodar en el acto si la mesa no
   * cambió (§5.3). La escena sólo llama si `disponible`; aquí se vuelve a mirar `quieto` por
   * la carrera entre el toque y la respuesta que acaba de llegar. Suelta lo mismo que el
   * cambio de revisión, así que suelta POR EL MISMO SITIO: eran las cuatro llamadas de
   * `soltarTodo` escritas otra vez.
   */
  const alPulsarLosDados = useCallback((): Promise<ResultadoDelMovimiento> => {
    if (quieto) return Promise.resolve('rechazado');
    const tirar = tirarEnTres(opciones);
    if (tirar === null) return Promise.resolve('rechazado');
    soltarTodo();
    return mover({ tipo: tirar.tipo, carga: tirar.carga });
  }, [quieto, opciones, mover, soltarTodo]);

  /*
   * ═══ EL RELOJ DE ARENA: PASAR EL TURNO SIN ABRIR EL CAJÓN ═══
   *
   * Gemelo de `alPulsarLosDados` y por la misma puerta: `pasarEnTres` busca la opción en la lista
   * que el juego ofrece, así que si el juego no deja pasar —porque falta colocar, porque hay que
   * mover el estiaje, porque hay un descarte a medias— el reloj no manda nada y el portillo no
   * tiene que rechazar nada.
   */
  const alPasarElTurno = useCallback((): void => {
    if (quieto) return;
    const pasar = pasarEnTres(opciones);
    if (pasar === null) return;
    soltarTodo();
    void mover({ tipo: pasar.tipo, carga: pasar.carga });
  }, [quieto, opciones, mover, soltarTodo]);

  /*
   * LO QUE EL RELOJ NECESITA SABER. No lleva «cuánto queda» calculado: lleva los dos instantes y
   * la escena saca la fracción en su `useFrame`, que es donde ya se mira el tiempo. Con la
   * fracción como prop, el delta entero se repintaría sesenta veces por segundo.
   *
   * `vuelta` es `turnosAbiertos` de la vista: sólo crece, es el mismo número en todos los
   * aparatos, y por eso el reloj se voltea a la vez en las dos pantallas sin mandar nada.
   */
  const vueltaDelReloj =
    typeof (vista as { turnosAbiertos?: unknown }).turnosAbiertos === 'number'
      ? ((vista as { turnosAbiertos: number }).turnosAbiertos)
      : 0;
  const reloj = useMemo(
    (): RelojDeLaMesa => ({
      desde: puesta.turnoDesde,
      venceEn: puesta.terminada ? null : puesta.venceEn,
      disponible: !quieto && pasarEnTres(opciones) !== null,
      vuelta: vueltaDelReloj,
    }),
    [puesta.turnoDesde, puesta.venceEn, puesta.terminada, quieto, opciones, vueltaDelReloj],
  );

  /*
   * EL MODELO DEL RELOJ, con su propia red y degradando a `null`.
   *
   * `null` mientras viaja y `null` para siempre si no llega, y en los dos casos la escena pinta
   * el reloj de conos del respaldo: el botón de pasar el turno no puede depender de que un
   * fichero de arte de 717 kB haya llegado. Se avisa por consola porque un respaldo mudo es un
   * fallo que nadie ve — el mismo trato que los dados.
   */
  const [modeloDelReloj, ponerModeloDelReloj] = useState<RelojCargado | null>(null);
  useEffect(() => {
    let cancelado = false;
    traerElReloj().then(
      (cargado) => {
        if (!cancelado) ponerModeloDelReloj(cargado);
      },
      (fallo: unknown) => {
        console.warn(
          `El reloj de arena no ha llegado (${loQueSeDiceDeUnFallo(fallo)}): se pinta el del respaldo.`,
        );
      },
    );
    return () => {
      cancelado = true;
    };
  }, []);

  const colocando = useMemo(
    () => (tomada === null ? null : colocandoEnTres(vista, yo, tomada)),
    [vista, yo, tomada],
  );

  const cartaCogida = useMemo(() => mano.find((c) => c.id === cogida) ?? null, [mano, cogida]);
  const seCambianPor = useMemo(() => {
    if (cartaCogida === null || quieto) return [];
    return bienesQueSeCambianPor(vista, opciones, cartaCogida.bien);
  }, [cartaCogida, quieto, vista, opciones]);

  const alTomarDeLaBarra = useCallback(
    (id: string) => {
      if (quieto) return;
      ponerCogida(null);
      ponerCartaDelMazo(null);
      ponerTomada((antes) => (antes === id ? null : (id as IdDeLaBarra)));
    },
    [quieto],
  );

  const alElegirSitio = useCallback(
    (sitio: { llave: string }) => {
      if (quieto || colocando === null) return;
      /* El movimiento viene montado por las reglas. Aquí no se monta nada. */
      const movimiento = colocando.movimientos.get(sitio.llave);
      ponerTomada(null);
      if (movimiento !== undefined) mover(movimiento);
    },
    [quieto, colocando, mover],
  );

  const alCogerCarta = useCallback(
    (carta: { id: string }) => {
      if (quieto) return;
      ponerTomada(null);
      ponerCartaDelMazo(null);
      ponerPreguntando(null);
      ponerCogida((antes) => (antes === carta.id ? null : carta.id));
    },
    [quieto],
  );

  /*
   * AL SOLTAR LA CARTA SOBRE UN BIEN: uno solo a quien proponérselo, se manda; varios,
   * se pregunta, y este cliente no elige por nadie.
   *
   * Aquí ponía «Riberas exige destinatario» y dejó de ser verdad: `Trato.para` admite
   * `null` y una propuesta se puede decir A LA MESA. Lo que sigue necesitando asiento es
   * la LISTA DE UNO POR UNO, que es de donde salen estas opciones: cada una es un
   * movimiento ya montado y dirigido, así que cuando el gesto de la mano cae sobre varias
   * hay que preguntar cuál se manda. Decirlo a la mesa se hace en el COMPONEDOR, que tiene
   * su propio renglón de destino y arranca justo ahí (`NADA_COMPUESTO` lleva `para: null`).
   *
   * Los nombres de la escena se traducen de vuelta a los de Riberas antes de preguntar
   * a las reglas, porque la carga habla en el idioma del juego.
   */
  const alProponerTrueque = useCallback(
    (bienEnLaEscena: string) => {
      if (quieto || cartaCogida === null) return;
      const doy = cartaCogida.bien;
      const quiero = bienEnLaEscena;
      const posibles = truequesPosibles(vista, opciones, doy, quiero);
      ponerCogida(null);
      const unico = posibles[0];
      if (unico !== undefined && posibles.length === 1) {
        mover({ tipo: unico.opcion.tipo, carga: unico.opcion.carga });
        return;
      }
      if (posibles.length > 1) {
        ponerPreguntando({ titulo: A_QUIEN_SE_LO_PROPONES, opciones: posibles.map((t) => t.opcion) });
      }
    },
    [quieto, cartaCogida, vista, opciones, mover],
  );

  /*
   * AL SOLTAR LA FICHA SOBRE LA BOLSA: se tira, y no se pregunta nada.
   *
   * No hay a quién elegir —al otro lado está el estiaje— así que esto es el gesto más corto
   * de la mano: una opción, se manda. El movimiento sale ENTERO de la lista que el juego
   * ofrece (`tirarLaFichaEnTres`) y no se monta aquí: el portillo lo exige en forma canónica
   * (§5 bis), y un `{ tipo, carga }` parecido montado en el cliente es un movimiento distinto.
   *
   * Se suelta la carta cogida SIEMPRE, se haya podido tirar o no: la que se acaba de tirar ya
   * no existe, y dejarla «cogida» por su identificador dejaría la mano señalando un hueco.
   */
  const alTirarFicha = useCallback(
    (bienEnLaEscena: string) => {
      ponerCogida(null);
      if (quieto || bolsa === null) return;
      const opcion = tirarLaFichaEnTres(opciones, bienEnLaEscena);
      if (opcion !== null) mover({ tipo: opcion.tipo, carga: opcion.carga });
    },
    [quieto, bolsa, opciones, mover],
  );

  /*
   * AL SOLTAR EL ESTIAJE SOBRE UNA ISLA: una víctima o ninguna, se manda; dos, se pregunta.
   *
   * Es el mismo reparto que el trueque: el juego emite una opción POR VÍCTIMA cuando hay dos
   * colonos con fichas alrededor de la isla, y las dos sólo se distinguen por a quién se le
   * roba. Este cliente no elige por nadie: abre `ElijeUna` con las opciones de ESA isla, que
   * llevan en la ayuda el nombre de cada uno, escrito por el juego. Con una sola —lo normal—
   * se manda sin preguntar, que es lo que hace que mover cueste un toque.
   */
  const alMoverElEstiaje = useCallback(
    (sitio: { llave: string }) => {
      if (quieto || destinosDelEstiaje === null) return;
      const suyas = destinosDelEstiaje.porIsla.get(sitio.llave) ?? [];
      const unica = suyas[0];
      if (unica !== undefined && suyas.length === 1) {
        mover({ tipo: unica.tipo, carga: unica.carga });
        return;
      }
      if (suyas.length > 1) ponerPreguntando({ titulo: A_QUIEN_LE_ROBAS, opciones: suyas });
    },
    [quieto, destinosDelEstiaje, mover],
  );

  // -------------------------------------------------------------------------
  // El mazo: coger, jugar y revelar
  // -------------------------------------------------------------------------

  /*
   * COGER UN NAIPE SUELTA TODO LO DEMÁS, y cogerlo dos veces lo suelta a él.
   *
   * Las tres cosas las hace quien monta el cliente y no la escena: `<Delta>` avisa de la
   * pulsación y nada más. Sin la primera línea se quedan levantados a la vez un bien y
   * una carta, con el área de trueque abierta y las casillas del mazo abiertas encima.
   */
  const alCogerCartaDelMazo = useCallback(
    (carta: { id: string }) => {
      if (quieto) return;
      ponerTomada(null);
      ponerCogida(null);
      ponerPreguntando(null);
      ponerCartaDelMazo((antes) => (antes === carta.id ? null : carta.id));
    },
    [quieto],
  );

  /*
   * SEÑALAR NO ES COGER, Y POR ESO ESTE MANEJADOR NO HACE NADA MÁS.
   *
   * No suelta el bien, no cierra el menú, no mira `quieto` y no manda nada: pasar el ratón
   * por encima de un naipe no es una jugada, y el día que empiece a soltar cosas será una.
   * Con `quieto` puesto el cartel se sigue leyendo, que es justo cuando hace falta: la mano
   * está apagada y la explicación de la carta apagada es la mitad del encargo.
   */
  const alSenalarCartaDelMazo = useCallback((carta: { id: string } | null) => {
    ponerNaipeSenalado(carta === null ? null : carta.id);
  }, []);

  /*
   * AL SOLTAR UN NAIPE EN LA CASILLA DE JUGAR: una sola manera, se manda; varias, se
   * pregunta. Es exactamente el mismo trato que el trueque, y sale de la misma cuenta —
   * `jugadaSinPreguntar`, que devuelve `null` tanto con cero como con dos, porque en los
   * dos casos esta pantalla NO manda nada por su cuenta.
   *
   * El título del menú se elige por la clase de la jugada y no por la familia del naipe:
   * son la misma palabra —lo exige el comprobador de la traducción— y la clase es la que
   * viene con las opciones que se van a enseñar.
   */
  const alJugarCarta = useCallback(
    (carta: { id: string }) => {
      if (quieto) return;
      ponerCartaDelMazo(null);
      const unica = jugadaSinPreguntar(vista, opciones, carta.id);
      if (unica !== null) {
        mover({ tipo: unica.opcion.tipo, carga: unica.opcion.carga });
        return;
      }
      const todas = jugadasDeLaCarta(vista, opciones, carta.id);
      const primera = todas[0];
      if (primera === undefined) return;
      ponerPreguntando({
        titulo: LO_QUE_SE_PREGUNTA[primera.clase],
        opciones: todas.map((j) => j.opcion),
      });
    },
    [quieto, vista, opciones, mover],
  );

  /**
   * SE HA PULSADO EL NAIPE DEL MAZO: se pregunta, SIEMPRE.
   *
   * ═══ OJO, ESTO SE APARTA A PROPÓSITO DE LA REGLA DE LA CASA ═══
   *
   * `jugadaSinPreguntar` y `truequesPosibles` llevan escrito lo contrario: si sale una
   * sola manera, se manda sin preguntar. Comprar ofrece siempre exactamente una, así que
   * por esa regla iría derecha al servidor sin un solo diálogo. Y NO ES LO QUE SE QUIERE.
   *
   * Aquellas dos se disparan al SOLTAR algo encima de una casilla —un gesto largo, con
   * puntería, del que nadie sale por descuido—; ésta se dispara al TOCAR un naipe que vive
   * pegado a las tres piezas de construir, en la franja de abajo donde el pulgar ya está.
   * Un roce gastaría sal, piedra y grano, y comprar no se deshace.
   *
   * Así que aquí se confirma aunque la opción sea única. Quien lea esto y lo vea como una
   * incoherencia que «arreglar»: no lo es, y el día que se «arregle» el fallo será una
   * compra que nadie pidió.
   *
   * El menú lleva la opción del juego tal cual —su rótulo dice lo que cuesta y su ayuda
   * cuántas quedan— y el «Dejarlo» que `ElijeUna` pone siempre. Aquí no se redacta nada.
   */
  const alPulsarElMazo = useCallback(() => {
    if (quieto) return;
    const comprar = comprarEnTres(opciones);
    if (comprar === null) return;
    ponerTomada(null);
    ponerCogida(null);
    ponerCartaDelMazo(null);
    ponerPreguntando({ titulo: COMPRAR_UNA_CARTA, opciones: [comprar] });
  }, [quieto, opciones]);

  /*
   * AL SOLTAR UN TÍTULO EN LA CASILLA DE REVELAR. Revelar no pide destinatario ni bienes,
   * así que la opción entera ES la respuesta y no hay nada que preguntar. Y no se
   * comprueba aquí que la carta sea un título: no lo ofrece el juego para nada más, y la
   * escena no abre esa casilla a quien no es de la familia de los títulos.
   */
  const alRevelarCarta = useCallback(
    (carta: { id: string }) => {
      if (quieto) return;
      ponerCartaDelMazo(null);
      const revelar = revelarDe(opciones, carta.id);
      if (revelar !== null) mover({ tipo: revelar.tipo, carga: revelar.carga });
    },
    [quieto, opciones, mover],
  );

  // -------------------------------------------------------------------------
  // El mundo
  // -------------------------------------------------------------------------

  /* El modelo sólo se pide si el lienzo se va a montar: con delta y con colores. */
  const { modelos, fallo: falloDelModelo } = usarElCatalogo(tablero.caras.length > 0 && seVeEnTres(vista));
  const [falloDelLienzo, ponerFalloDelLienzo] = useState<string | null>(null);
  const alFallarElLienzo = useCallback((motivo: string) => {
    ponerFalloDelLienzo(motivo);
  }, []);
  const fallo = falloDelModelo ?? falloDelLienzo;

  /*
   * ═══ DÓNDE SE ESTÁ MIRANDO, Y POR QUÉ VIVE AQUÍ Y NO DENTRO DE LA CÁMARA ═══
   *
   * Porque el botón de volver está FUERA del `Canvas` —es un botón de la Sala, no un
   * objeto del mundo— y tiene que saber si hay algo a lo que volver. Con el
   * acercamiento encerrado en la cámara habría que sacarlo por un puerto de todas
   * formas; así entra por la puerta y sale por la misma.
   *
   * VA EN UNA `ref` Y NO EN EL ESTADO, y eso no es una optimización suelta: mover la
   * mirada son sesenta cambios por segundo mientras se arrastra, y pasarlos por React
   * repintaría el mueble entero —barra, mano, formulario— sesenta veces por segundo
   * para mover una cámara.
   *
   * Lo único que SÍ es estado es si se está como al principio, porque eso es lo que
   * enciende y apaga un botón, y `alPrincipio` sólo cambia cuando cruza esa frontera
   * —de ahí el segundo apunte—: sin él, cada píxel de arrastre sería un `setState` que
   * React tendría que descartar.
   *
   * Y NADIE LO TOCA AL CAMBIAR LA REVISIÓN. El efecto de arriba suelta lo que se tiene
   * en la mano cuando entra una jugada ajena; la cámara no aparece ahí a propósito.
   */
  const cercania = useRef<Cercania>(CERCANIA_DE_SALIDA);
  const [alPrincipio, ponerAlPrincipio] = useState(true);
  const eraAlPrincipio = useRef(true);
  const alAcercarse = useCallback((nueva: Cercania): void => {
    cercania.current = nueva;
    const ahora = estaComoAlPrincipio(nueva);
    if (ahora === eraAlPrincipio.current) return;
    eraAlPrincipio.current = ahora;
    ponerAlPrincipio(ahora);
  }, []);
  /* La salida. Pasa por el mismo sitio que la rueda, así que el botón se apaga solo. */
  const volverAlTableroEntero = useCallback((): void => {
    alAcercarse(comoAlPrincipio());
  }, [alAcercarse]);

  const semilla = useMemo(() => semillaDelCodigo(puesta.codigo), [puesta.codigo]);
  const encuadre = useMemo(
    () => (datos === null ? null : encuadreDelDelta(datos.islas.map((i) => i.hex))),
    [datos],
  );

  /*
   * SIN ISLAS NO HAY DELTA QUE PINTAR: sólo lo que se puede hacer. Es lo mismo que
   * hace la mesa de siempre sin tablero, y todas las opciones van al formulario,
   * porque no hay barra ni mano que enseñe ninguna. Se pregunta al TABLERO
   * DECLARADO y no a `datos`: ver la cabecera, «sin delta» no es «sin islas».
   */
  if (tablero.caras.length === 0) {
    return (
      <Formulario
        opciones={opciones}
        alElegir={mover}
        quieto={quieto}
        titulo={TITULO_DE_LO_QUE_SE_HACE}
      />
    );
  }

  /*
   * EL RESPALDO. Si la mesa no cabe en los colores del lienzo, si el modelo no
   * llegó o si el lienzo reventó, se pinta lo que se pintaba antes de que existiera
   * este fichero, entero, y se dice por qué en letra chica. No es una pantalla de
   * error: es la mesa jugable de siempre. El tercer motivo —hay tablero declarado
   * pero la traducción no dio delta— no debería darse nunca; se dice por su nombre
   * para que, si un día se da, no se confunda con los otros dos.
   */
  const porQueElRetablo =
    !seVeEnTres(vista)
      ? 'Sois más de cuatro y el tablero en tres dimensiones sólo sabe pintar cuatro colores todavía: se juega sobre el tablero de siempre.'
      : fallo !== null
        ? `El delta en tres dimensiones no ha arrancado: ${fallo}. Se juega sobre el tablero dibujado.`
        : datos === null || encuadre === null
          ? 'La mesa trae tablero pero no un delta que pintar: se juega sobre el tablero dibujado.'
          : null;
  if (porQueElRetablo !== null || datos === null || encuadre === null) {
    /*
     * ═══ AQUÍ SE JUEGAN LAS MESAS DE CINCO Y DE SEIS, Y POR ESO EL TRUEQUE VIVE TAMBIÉN AQUÍ ═══
     *
     * `MANIFIESTO_RIBERAS.jugadores` admite hasta seis y el atlas del delta trae CUATRO
     * colores, así que con el quinto sentado ésta no es una pantalla de respaldo: es la
     * ÚNICA que hay, la partida entera. Hasta hoy, en esas mesas, contestar un trueque era
     * un botón suelto de `AccionesDelTablero` que se disparaba de un toque —o sea que la
     * mesa de cinco se quedaba sin la confirmación que Miguel pidió— y no había ninguna
     * manera de montar una oferta de varios bienes.
     *
     * LAS TRES PIEZAS Y EL ORDEN EN QUE VAN, que es una medida y no un gusto:
     *
     *   · EL PREGÓN va ARRIBA, entre la letra chica y el `<Retablo>`. Debajo del tablero no
     *     se ve: en cuatro de los quince lienzos de la casa el SVG ya pasa del pliegue él
     *     solo, y sólo seis dejan debajo los 233,75 puntos que miden el rótulo y cuatro
     *     tiras. Ver `ElPregonDelRetablo`.
     *   · CONTESTAR SE VA DE LOS BOTONES, por los dos caminos por los que llega: de las
     *     acciones del tablero (`accionesFueraDelPregon`) y de las opciones sueltas
     *     (`opcionesFueraDelPregon`). Los dos filtros reciben EL PREGÓN y no un interruptor,
     *     así que donde no hay pregón —un mirón— los botones se quedan y la propuesta se
     *     puede contestar igual. Y el pregón se compone ANTES, con las opciones enteras.
     *   · EL COMPONEDOR va DEBAJO del tablero, y ahí sí, porque no es urgente: se abre en mi
     *     turno, cuando ya he mirado el tablero, y sólo entonces crece.
     *
     * Y LA HOJA ES `ElijeUna`, la misma de las otras cuatro preguntas, en su forma FIJA:
     * aquí la página rueda y una caja colocada sobre el flujo se quedaría en mitad de un
     * documento largo, que es donde no se ve. Ver `fijo` allí.
     */
    const sueltas = opcionesFueraDelPregon(opcionesSueltas(tablero, opciones), pregon);
    const sinContestar = accionesFueraDelPregon(tablero, pregon);
    return (
      <>
        <p className="letra-chica riberas-sin-mundo">{porQueElRetablo}</p>
        {pregon === null ? null : (
          <ElPregonDelRetablo
            pregon={pregon}
            suya={elPregonEnLaPantalla}
            abierta={tratoAbierto}
            alAbrir={ponerTratoAbierto}
          />
        )}
        <Retablo tablero={sinContestar} alTocar={mover} quieto={quieto} />
        <AccionesDelTablero tablero={sinContestar} alTocar={mover} quieto={quieto} />
        {componedor === null ? null : (
          <ElComponedorDelRetablo
            componedor={componedor}
            ponerPuesto={ponerLoQueSeCompone}
            quieto={quieto}
            abierto={componedorAbierto}
            alAbrir={ponerComponedorAbierto}
            alProponer={proponerElTrueque}
          />
        )}
        {/* Lo que decide es lo PINTABLE y no lo que llega: ver `hayAlgoQuePintar`. */}
        {hayAlgoQuePintar(sueltas) ? (
          <Formulario opciones={sueltas} alElegir={mover} quieto={quieto} titulo="Y además puedes" />
        ) : null}
        {laTiraAbierta === null ? null : (
          <ElijeUna
            fijo
            titulo={laTiraAbierta.frase}
            nota={laTiraAbierta.comoAnda}
            opciones={[laTiraAbierta.aceptar, laTiraAbierta.rechazar].filter((o): o is Opcion => o !== null)}
            quieto={quieto}
            alElegir={(o) => {
              cerrarLaHoja();
              void mover({ tipo: o.tipo, carga: o.carga });
            }}
            alDejarlo={cerrarLaHoja}
          />
        )}
      </>
    );
  }

  const conMundo = typeof window !== 'undefined' && modelos !== null;
  const alcance = encuadre.alcance;

  return (
    <div className="riberas-en-tres">
      {/*
        ═══ AQUÍ IBA EL AVISO DEL TABLERO, Y NO SE HA PERDIDO: SE HA MUDADO ═══

        El aviso del tablero es del JUEGO —«Te toca: tira los dados.», «Turno de Ana:
        está por tirar.»— y viaja en el tablero declarado. Estaba aquí, en un
        `<p class="aviso-del-tablero">` EN FLUJO por encima del recuadro, y eso son 29
        puntos de alto más su hueco que se le restaban al tablero en todas las ventanas,
        también en las que ya iban justas.

        Ahora lo pinta la CINTA, dentro del recuadro y sin quitarle un punto de alto, con
        la misma región viva (`aria-live="polite"`) que tenía el del retablo. No se pinta
        en los dos sitios a propósito: dos regiones vivas con el mismo texto se anuncian
        DOS VECES, y el aviso ya se anuncia solo cada vez que otro juega. En el camino del
        respaldo el `<p>` sigue existiendo, porque allí lo pinta `Retablo` y allí no hay
        cinta ninguna.
      */}
      {/* La clase sale de la constante porque la cámara BUSCA este recuadro por ella: ver `RECUADRO_DEL_LIENZO`. */}
      {/*
        ═══ AQUÍ ATERRIZA EL FOCO AL SENTARSE, Y POR ESO LLEVA NOMBRE ═══

        Con la página de pie el `<h1>` de la mesa sale del flujo, así que el destino del
        efecto de `sala.tsx` se muda a este recuadro. `tabIndex={-1}` no lo mete en el orden
        del tabulador: sólo lo hace capaz de recibir un foco que se le lleva.

        Y con `aria-label`, porque un `<div>` enfocado y sin nombre se anuncia como nada:
        quien acaba de sentarse oiría silencio en el único momento de esta pantalla que hay
        que anunciar. El nombre lo pone el manifiesto —el mismo que decía el título— y no una
        cadena escrita aquí, para que el día que un arcade se llame de otra manera esto no
        siga nombrando a Riberas.
      */}
      <div
        className={quieto ? `${RECUADRO_DEL_LIENZO} riberas-lienzo-quieto` : RECUADRO_DEL_LIENZO}
        ref={medirElRecuadro}
        tabIndex={-1}
        role="group"
        aria-label={`${manifiesto.nombre}: la mesa en tres dimensiones`}
      >
        {/*
          ═══ LA CINTA DEL TERCIO CENTRAL (§2.2) ═══

          Tres cosas en 44 puntos de alto: salir, la frase de estado y la puerta del cajón.
          Va DENTRO del recuadro y encima del lienzo —no en flujo por encima de él—, que es
          lo que hace que no le quite un punto de alto al tablero, y ocupa sólo el tercio
          central del ancho porque a los lados están las dos manos y son cartas que se
          arrastran (los números, en `escenas/cinta.ts`).

          ═══ Y VA FUERA DE `conMundo`, A PROPÓSITO ═══

          Como la lista de las explicaciones de abajo, y por lo mismo: no necesita mundo
          ninguno. Mientras el modelo se descarga ya hay aviso que leer y ya hay marcador
          que abrir —el telón tapa el tablero, no la partida—, y de paso esto se puede
          RENDERIZAR en Node, que es lo que permite que `verify:escritorio` cuente la cinta
          y el cajón contra una partida de verdad en vez de creerse el fuente.

          ═══ EL «‹» NO SIEMPRE ESTÁ, Y ESA ES LA RAMA QUE EL DISEÑO NO TENÍA ═══

          El §2.2 lo pone siempre porque su lienzo más estrecho es un teléfono de 320. Este
          cliente da lienzos de 288 desde que la página se puso de pie, y ahí la cinta son
          115,2 puntos: quitados los dos botones de 44 quedan 27,2, o sea TRES LETRAS de
          frase. Ensancharla no lo arregla —el techo son 122,8 puntos, más allá se come los
          15 de aire a la mano del mazo, y eso da cuatro—, así que se va uno de los tres, y
          `loQueLlevaLaCinta` dice cuándo: cuando la frase no conserva sus ocho letras.

          El que se va es el «‹», y en el escritorio no se muda a ninguna esquina: se queda
          en la cabecera de la Sala, que en esta pantalla NO desaparece (§2.1, es la
          navegación del sitio) y cuyo «Sala de Arcade» va exactamente al mismo sitio que
          este botón. De los tres, se va el único que ya existe fuera del lienzo.

          Y NO SE MUDA A UNA ESQUINA PORQUE NO HAY ESQUINA LIBRE, que es lo que se midió
          antes de decidirlo: arriba a la izquierda, la carta de arriba de la mano del mazo
          abierta llega a 49,7 puntos del canto en 288×317 y a 55,7 en 288×355, o sea por
          encima de los 56 que pide un botón de 44 con sus 12 de margen —sería la esquina
          del asa de la choza que `.riberas-recoger` ya se comió una vez—; arriba a la
          derecha están «Ver el tablero entero» y «Recoger la mesa»; y abajo es de la barra.
          `verify:escritorio` compra esa medida, para que el día que las manos se aparten
          esto se vuelva a mirar en vez de quedarse escrito.
        */}
        <div
          className={hayCarril ? 'riberas-cinta riberas-cinta-con-carril' : 'riberas-cinta'}
          style={elEstiloDeLaCinta(laCinta)}
        >
          {laCinta.salidaDentro && laSalida !== undefined ? (
            <a className="riberas-cinta-salir" href={laSalida} aria-label={SALIR_DE_LA_MESA} title={SALIR_DE_LA_MESA}>
              <span aria-hidden="true">‹</span>
            </a>
          ) : null}
          {/*
            ═══ EL RELOJ, PEGADO AL CANTO Y DELANTE DE LA FRASE ═══

            Lo que arregla está contado con números en `escenas/cinta.ts` y en
            `usarElRelojDeLaCinta`: la cinta no decía NUNCA cuánto quedaba de turno, y con el
            plazo de serie de 120 s la mesa jugó sola tres turnos.

            VA DELANTE Y NO SE ENCOGE (`flex: 0 0 auto` en la hoja) porque de los cuatro
            trozos de la cinta es el único que no se puede recortar: la frase cortada sigue
            diciendo algo y sigue entera en el árbol, «12 mi…» no es un plazo más corto sino
            otro número.

            ═══ Y NO ES UNA SEGUNDA REGIÓN VIVA, QUE SERÍA PEOR QUE NO PONERLO ═══

            La frase de al lado ya es `aria-live="polite"`. Un reloj vivo al lado suyo
            anunciaría la cuenta atrás EN VOZ ALTA cada segundo durante el último minuto,
            encima del aviso del juego y pisándolo. `role="timer"` es exactamente esto: una
            región de tiempo que un lector encuentra y lee CUANDO QUIERE y que no se anuncia
            sola (su `aria-live` implícito es `off`). El nombre lleva la frase entera —«quedan
            47 s»—, que es la misma que pinta el cajón, para que lo que se oye no sea el
            rótulo abreviado que sólo existe por falta de sitio.
          */}
          {elReloj === null ? null : (
            <span
              className={
                elReloj.aprieta ? 'riberas-cinta-reloj riberas-cinta-reloj-aprieta' : 'riberas-cinta-reloj'
              }
              role="timer"
              aria-label={elReloj.entero}
              title={elReloj.entero}
            >
              <span aria-hidden="true">{elReloj.corto}</span>
            </span>
          )}
          {/*
            LA FRASE, RECORTADA EN PANTALLA Y ENTERA EN EL ÁRBOL. El recorte lo hace la hoja
            con `text-overflow: ellipsis`; el texto completo sigue en el DOM, así que un
            lector lo lee entero y el ratón lo ve al posarse (`title`). Está SIEMPRE en el
            árbol, vacía cuando no hay nada que decir, por lo mismo que el cartel de los
            naipes: una región viva que se monta a la vez que su texto no se anuncia.
          */}
          <p className="riberas-cinta-frase" aria-live="polite" title={tablero.aviso}>
            {tablero.aviso}
          </p>
          {/*
            ═══ LA FICHA DE MIS PUNTOS: el «≡» del §2.2, y la puerta del cajón ═══

            Mi raíl de color, mi cifra pública y el «+N» de lo que sólo cuento yo, los tres a
            la vista sin abrir nada (decisión 11). Es el único dato del marcador que se lee
            sin abrir el cajón, y es la puerta del cajón: por eso es lo último que se iría de
            la cinta y no se va nunca.

            EL «+N» VA AQUÍ Y NO SÓLO DENTRO, y cabe por poco: la ficha mide el suelo de
            toque y ni un punto más, porque su ancho sale del trozo que `loQueLlevaLaCinta`
            le da a la frase. Con la letra de la casa, lo peor que puede escribirse ahí
            —«12+5», dos dígitos públicos y uno oculto— ocupa 44,3 de los 46,75 que mide la
            caja. La cuenta está en la hoja, al lado de las dos letras que la deciden, y
            `verify:escritorio` la afirma: por eso la cifra pública se pinta un punto más
            pequeña que el resto de la cinta. Si algún día no cupiera, `overflow: hidden` es
            la red — antes recortar la cifra que descuadrar el reparto de la frase.

            Y SON DOS NÚMEROS Y NO SU SUMA, como en el marcador del cajón y por lo mismo: el
            público lo ve la mesa entera y el otro sólo yo, y sumarlos haría que el mismo
            renglón dijera una cosa distinta en cada pantalla.

            Para un mirón que no está sentado no hay color ni cifra, y entonces es «≡» a
            secas, que es lo que dice el diseño: no se inventa un cero que no es de nadie.
          */}
          <button
            type="button"
            ref={laFichaDeMisPuntos}
            className="riberas-cinta-ficha"
            aria-expanded={cajonAbierto}
            aria-controls={nombreDelCajon}
            aria-label={
              yoEnElMarcador === null
                ? cajonAbierto
                  ? CERRAR_EL_CAJON
                  : ABRIR_EL_CAJON
                : `Marcador: ${String(yoEnElMarcador.puntos)} ${yoEnElMarcador.puntos === 1 ? 'punto' : 'puntos'} a la vista${loOcultoDeLaFicha === null ? '' : `, y ${String(yoEnElMarcador.puntosConLoOculto ?? yoEnElMarcador.puntos)} contándote lo oculto`}. ${cajonAbierto ? CERRAR_EL_CAJON : ABRIR_EL_CAJON}`
            }
            onClick={() => {
              if (cajonAbierto) cerrarElCajon();
              else ponerCajonAbierto(true);
            }}
          >
            {yoEnElMarcador === null ? (
              <span aria-hidden="true">≡</span>
            ) : (
              <>
                <span
                  className="riberas-cinta-rail"
                  style={{ background: yoEnElMarcador.color }}
                  aria-hidden="true"
                />
                <span className="riberas-cinta-puntos" aria-hidden="true">
                  {yoEnElMarcador.puntos}
                  {loOcultoDeLaFicha === null ? null : (
                    <span className="riberas-cinta-ocultos">+{loOcultoDeLaFicha}</span>
                  )}
                </span>
              </>
            )}
          </button>
        </div>

        {/*
          ═══ Y LA SEGUNDA TIRA: EL CARRIL DE LO QUE EL TABLERO NO ENSEÑA ═══

          SÓLO CUANDO HAY ALGO QUE OFRECER. Una tira vacía de 44 puntos sería cromo pegado
          encima del tablero en todos los turnos ajenos, y además le restaría banda al cartel
          de los naipes sin que hubiera nada que leer en ella. `hayCarril` es la MISMA
          condición que entra en `elCartelQueCabe`, leída una sola vez, para que el alto que
          se pinta y el alto que se resta no puedan separarse.

          LO QUE AQUÍ YA NO ESTÁ: el `<Formulario>` en flujo por debajo del lienzo. Ver la
          cabecera de `ElCarril`, con los 4.284 puntos de botones que el estiaje ponía ahí.
        */}
        {hayCarril ? (
          <ElCarril
            opciones={fuera}
            alElegir={mover}
            quieto={quieto}
            ancho={laCinta}
            glifos={glifos}
            /*
              EL CUADRADO QUE ABRE EL COMPONEDOR, y no es una opción de la lista: la puerta es
              una DECLARACIÓN y mandarla tal cual no hace nada. El rótulo y la ayuda los
              escribe el juego —esta pantalla no redacta una palabra de la regla—, y el
              apagado sale de `componedor.noCabenMas`, que cuenta las vivas en `shared/` para
              que el móvil apague el suyo con la misma aritmética.
            */
            puerta={
              componedor === null
                ? null
                : {
                    rotulo: componedor.rotulo,
                    ayuda: componedor.ayuda,
                    apagado: componedor.noCabenMas || quieto,
                    abierto: componedorAbierto,
                    suyo: laPuertaDelTrueque,
                    alPulsar: () => {
                      if (componedorAbierto) cerrarElComponedor();
                      else ponerComponedorAbierto(true);
                    },
                  }
            }
          />
        ) : null}

        {/*
          ═══ Y COLGANDO DE LA CINTA, EL PREGÓN: LAS PROPUESTAS DE TRUEQUE ═══

          Es el requisito de Miguel —«se tiene que mostrar en la pantalla las propuestas de
          trueque por cada jugador con capacidad de aceptar o rechazar»— y NO es modal a
          propósito: lo lee quien NO tiene el turno, mientras otro juega, así que tiene que
          verse sin abrir nada y por debajo se sigue girando el tablero. Ver `ElPregon`.

          Sólo existe cuando hay algo VIVO: con la lista de tratos llena de cerrados no se
          pinta, y lo cerrado se lee entonces en el panel «Trueques» del cajón. El porqué —y
          lo que costaría lo contrario: el cartel de los naipes apagado para siempre— está
          entero en `elPregonEnTres`.
        */}
        {pregon === null ? null : (
          <ElPregon
            pregon={pregon}
            suya={elPregonEnLaPantalla}
            ancho={laCinta}
            alto={altoDelPregon}
            raiz={raizDeLaLetra}
            conCarril={hayCarril}
            abierta={tratoAbierto}
            alAbrir={ponerTratoAbierto}
            sePliega={pregonSePliega}
            desplegado={pregonDesplegado}
            alPlegar={ponerPregonDesplegado}
          />
        )}

        {/*
          ═══ EL COMPONEDOR: DONDE SE MONTA UN TRUEQUE DE VARIOS BIENES CON EL DEDO ═══

          Es lo último que le faltaba a esta pantalla para que lo que Miguel pidió se pueda
          HACER en ella. El motor admite un tres por dos desde la fase 1, el pregón lo lee
          desde la fase 2 y el retablo lo monta desde la fase 3; aquí, en la pantalla de las
          mesas de dos a cuatro —que es donde Miguel juega—, un trueque gordo sólo se podía
          proponer desde la lista de uno por uno, o sea que no se podía.

          MODAL, y el pregón que cuelga del mismo sitio no lo es: mientras se compone no se
          puede tocar el tablero, porque un toque perdido funda una choza. Y a TODO EL ANCHO
          del recuadro, que es lo único de este encargo que no se mide con `anchoDeLaCinta`:
          el renglón de un bien mide 162 puntos y el tercio central se queda corto en los
          lienzos de pie. Puede hacerlo porque es modal — con el velo puesto no hay carta que
          arrastrar a los lados. Ver `ElComponedorEnElLienzo`.

          Y NO PUEDE ESTAR ABIERTO A LA VEZ QUE EL CAJÓN, sin una línea que lo impida: al
          cajón lo abre la ficha de los puntos y a esto el cuadrado del carril, y los dos
          quedan debajo del velo del otro; con el teclado tampoco, porque la trampa de foco no
          deja salir de la caja que está encima. Queda dicho para que nadie añada la línea que
          no hace falta.
        */}
        {componedor === null || !componedorAbierto ? null : (
          <ElComponedorEnElLienzo
            componedor={componedor}
            ponerPuesto={ponerLoQueSeCompone}
            quieto={quieto}
            alProponer={proponerElTrueque}
            alDejarlo={cerrarElComponedor}
          />
        )}
        {/*
          ═══ EL CAJÓN: EL RAÍL ENTERO, DEL ANCHO DE LA CINTA Y COLGADO DE ELLA (§1.11) ═══

          Dentro va lo que la Sala monta —el marcador, la ficha de la mesa con su código y
          su reloj, los seis paneles que declara el juego con «Lo mío» el primero, las dos
          salidas y la crónica—, sin reescribir una línea de su lógica: sólo cambia dónde
          está. Ver `elRail`.

          Mide LO QUE LA CINTA y cuelga hasta el canto de abajo, así que su aire a la carta
          más cercana de cada mano es el MISMO que el de la cinta —las manos se extienden a
          lo ancho igual arriba que abajo—. Lo que sí hay debajo de él es la barra, y por
          eso es modal: con el cajón abierto no se construye.

          EL VELO ES LA MITAD QUE SE OLVIDA. Sin él, un clic fuera del cajón llega al
          tablero: se cierra el cajón Y se funda una choza donde estaba el dedo. El velo
          está para que ese clic no sea nada más que cerrar. Va `aria-hidden` porque para un
          lector el cajón ya es modal (`aria-modal`) y un `<div>` sin texto en medio sólo
          sería ruido.

          Y ARRANCA MÁS ABAJO CUANDO HAY CARRIL, que es lo único que la segunda tira le cambia:
          cuelga del PIE de la cinta, y con carril la cinta mide dos tiras. La clase la pone
          este marcado y el `top` sigue viviendo en la hoja, en `rem`, por lo mismo que la
          primera vez: la cinta se pinta con el suelo de toque de la casa y con la preferencia
          de letra del navegador eso deja de ser 44 puntos. Escritos los dos en `rem`, crecen
          juntos y no hay dos números que cuadrar.
        */}
        {cajonAbierto ? (
          <>
            <div className={EL_VELO} onClick={cerrarElCajon} aria-hidden="true" />
            <div
              id={nombreDelCajon}
              ref={elCajon}
              className={hayCarril ? `${EL_CAJON} ${EL_CAJON}-bajo-el-carril` : EL_CAJON}
              role="dialog"
              aria-modal="true"
              aria-label={EL_CARRIL_DE_LA_MESA}
              tabIndex={-1}
              style={elEstiloDelCajon(laCinta)}
            >
              {/*
                ═══ LA LISTA LARGA, CON RÓTULO Y AYUDA, Y AQUÍ ES DONDE HAY ANCHO ═══

                El carril de la cinta ofrece las mismas opciones en cuadrados de 44 puntos, que
                es lo que cabe ahí arriba y lo que hace que un siete no pare la mesa. Pero un
                cuadrado con un número dentro no dice a qué isla va el estiaje, y esa frase
                tiene que poder LEERSE en algún sitio: es aquí, en un cajón que mide 16rem de
                suelo y rueda por dentro. Cada opción se alcanza por los dos sitios, en el
                mismo orden y con el mismo número de tecla.

                VA LA PRIMERA, delante del marcador: el cajón se abre y se cierra, y el primer
                renglón es el único que se lee sin desplazar. Con el estiaje por mover, lo que
                hay que hacer es más urgente que cuántos puntos lleva cada cual.

                Y `atajos={false}`: las teclas 1-9 las escucha el carril, que está montado
                también con el cajón abierto. Con las dos copias escuchándolas, el «3» mandaría
                el mismo movimiento dos veces y el segundo viajaría con la revisión vieja. Ver
                `usarLosAtajos`.

                LA CONDICIÓN ES LA QUE TENÍA EL FORMULARIO EN FLUJO, palabra por palabra: se
                calla sólo si el tablero está enseñando algo y aquí no queda nada —con una
                barra encendida, «no hay nada que puedas hacer» sería mentira—, y si el juego
                no ofrece nada de nada sí se dice, porque entonces es verdad y es lo único que
                explica por qué la barra está apagada.
              */}
              {hayCarril || opciones.length === 0 ? (
                <Formulario
                  opciones={fuera}
                  alElegir={mover}
                  quieto={quieto}
                  titulo={TITULO_DE_LO_QUE_SE_HACE}
                  atajos={false}
                />
              ) : null}
              {elRail}
            </div>
          </>
        ) : null}

        {conMundo ? (
          <>
            {/*
              TIRAR PARA QUIEN NO VE EL LIENZO. Donde hay dados el botón de tirar se ha ido
              de la lista de abajo, y un dado que sólo se puede tocar con el ratón sería el
              primer movimiento del juego inaccesible. Este botón sólo existe para las
              tecnologías de apoyo (fuera de la vista, dentro del recuadro) y manda por la
              misma puerta que el asa.

              EXISTE MIENTRAS EXISTEN LOS DADOS, no sólo mientras se puede tirar: al
              pulsarlo `mover` pone `quieto`, `disponible` cae a falso, y si el botón se
              desmontara con el foco dentro el foco caería al body y el lector perdería el
              sitio. Se apaga con `aria-disabled` y NO con `disabled`: un botón `disabled`
              deja de ser enfocable y el navegador le quita el foco igual (la regla de
              recolocación del foco de HTML), que es justo lo que se quería evitar. Pulsado
              apagado no manda nada: `alPulsarLosDados` ya devuelve `rechazado` con `quieto`
              o sin TIRAR entre las opciones, y aquí se corta antes.
            */}
            {dados !== null ? (
              <button
                type="button"
                className="riberas-solo-apoyo"
                aria-disabled={!dados.disponible}
                onClick={() => {
                  if (dados.disponible) void alPulsarLosDados();
                }}
              >
                Tirar los dados
              </button>
            ) : null}
            <LimiteDelMundo alFallar={alFallarElLienzo}>
              <Canvas
                shadows
                dpr={[1, 2]}
                gl={{ antialias: true }}
                camera={{ position: encuadre.posicion, fov: 45, near: 0.5, far: alcance * 8 }}
                onCreated={({ gl }) => {
                  gl.toneMapping = ACESFilmicToneMapping;
                  gl.toneMappingExposure = 1.05;
                }}
              >
                {/* La niebla empieza detrás del mundo, y del color del cielo: ver `banco3d.tsx`. */}
                <color attach="background" args={[COLOR_DEL_CIELO]} />
                <fog attach="fog" args={[COLOR_DEL_CIELO, alcance * 2.6, alcance * 7.5]} />
                <CamaraAerea alcance={alcance} cercania={cercania} alAcercarse={alAcercarse} />
                <Delta
                  datos={datos}
                  modelos={modelos}
                  semilla={semilla}
                  colocando={colocando}
                  onElegirSitio={alElegirSitio}
                  barra={barra}
                  tomada={tomada}
                  onTomarDeLaBarra={alTomarDeLaBarra}
                  mazo={mazo}
                  onPulsarElMazo={alPulsarElMazo}
                  turnoDe={turnoDe}
                  dados={dados}
                  onPulsarLosDados={alPulsarLosDados}
                  reloj={reloj}
                  modeloDelReloj={modeloDelReloj}
                  onPasarElTurno={alPasarElTurno}
                  mesaRecogida={mesaRecogida}
                  mano={mano}
                  cogida={cogida}
                  onCogerCarta={alCogerCarta}
                  seCambianPor={seCambianPor}
                  onProponerTrueque={alProponerTrueque}
                  cuantasALaBolsa={bolsa?.faltan ?? 0}
                  onTirarFicha={alTirarFicha}
                  destinosDelEstiaje={destinosDelEstiaje}
                  onMoverElEstiaje={alMoverElEstiaje}
                  cartasDelMazo={cartasDelMazo}
                  cartaDelMazoCogida={cartaDelMazo}
                  onCogerCartaDelMazo={alCogerCartaDelMazo}
                  onJugarCarta={alJugarCarta}
                  onRevelarCarta={alRevelarCarta}
                  onSenalarCartaDelMazo={alSenalarCartaDelMazo}
                />
              </Canvas>
            </LimiteDelMundo>
            {/*
              LA SALIDA, y sólo cuando hace falta. Un zoom del que no se sabe volver
              atrapa: se entra a mirar una esquina del delta y ya no se encuentra el
              tablero. Va sobre el lienzo —que es donde uno está mirando cuando se
              pierde— y no en el raíl, y desaparece en cuanto se ha vuelto, porque un
              botón que siempre está encendido no dice nada. Está FUERA del `Canvas`: es
              un botón de la Sala con su foco y su filo, no un objeto del mundo.

              Y no le roba el gesto a la cámara sin tener que pedirlo: la cámara sólo
              atiende lo que empieza sobre el propio `<canvas>` (`e.target === lienzo`).
            */}
            {alPrincipio ? null : (
              <button type="button" className="riberas-volver" onClick={volverAlTableroEntero}>
                {VOLVER_AL_TABLERO_ENTERO}
              </button>
            )}
            {/*
              RECOGER LA MESA (§6). 44×44 arriba a la derecha, DEBAJO del botón de volver y
              con su mismo cromo: es un botón de la Sala con su foco y su filo, no un objeto
              del mundo. Un objeto del mundo tendría que quedarse FUERA del grupo que baja
              para poder seguir pulsándolo, y entonces ya no sería «de la mesa». Y como
              aquél, no le roba el gesto a la cámara: la cámara sólo atiende lo que empieza
              sobre el propio `<canvas>`.

              Estuvo abajo a la izquierda y se comía una esquina del asa de la choza en
              320×360: el sitio se había medido con el asa como un rectángulo plano y el asa
              es una caja girada que se proyecta más ancha. Abajo no cabe en ninguna de las
              dos esquinas —la barra está centrada y deja 41 puntos a cada lado—, así que
              sube y se apila. El porqué entero, con los números, en `.riberas-recoger`.

              Sólo donde hay mesa que recoger: la misma condición con la que `<Delta>` monta
              la barra. Un botón que promete recoger una mesa que no existe no hace nada.

              EL RÓTULO ES UNA FLECHA Y EL NOMBRE VA EN `aria-label`: en 44 píxeles no cabe
              «Recoger la mesa», y esos 44 son cuadrado de tablero que deja de pulsarse. La
              flecha dice hacia dónde va la mesa; la etiqueta, qué se hace.
            */}
            {barra.length > 0 || mazo !== null ? (
              <button
                type="button"
                className="riberas-recoger"
                onClick={alRecogerLaMesa}
                aria-label={mesaRecogida ? SACAR_LA_MESA : RECOGER_LA_MESA}
                title={mesaRecogida ? SACAR_LA_MESA : RECOGER_LA_MESA}
              >
                {mesaRecogida ? '▲' : '▼'}
              </button>
            ) : null}
            {/*
              EL CARTEL QUE EXPLICA EL NAIPE (`docs/LAS-CARTAS-SE-EXPLICAN.md`, fase 3).

              Es INTERFAZ POR ENCIMA DEL LIENZO y no un objeto de la escena, y eso está
              medido: dentro de la escena no hay una sola letra —sólo contornos compilados
              de cifras y dibujos— y escribir la frase más larga con ellos costaría 8.520
              triángulos contra un tope de mesa de 4.500. O sea que no es una preferencia:
              es que no cabe. Aquí es un `<p>` hermano del `<canvas>`, igual que el botón
              de volver y el de recoger.

              NO RECIBE UN SOLO PUNTERO, y sin excepción: `pointer-events: none` en su
              regla de la hoja, ni `onClick` ni `tabIndex` aquí. Vive al pie, encima del
              delta, y un rectángulo que se tragara los toques del tablero sería un cartel
              que impide construir donde tapa. Se cierra soltando la carta —el segundo
              toque, que es lo que ya hace `alCogerCartaDelMazo`— o apartando el cursor.

              ESTÁ SIEMPRE EN EL ÁRBOL, vacío cuando no hay nada que decir, y eso es lo que
              hace que se OIGA: una región `aria-live` que se monta a la vez que su texto no
              se anuncia en la mayoría de los lectores, porque el lector no vigila lo que
              todavía no existía. Vacío no se ve —`:empty` en la hoja le quita fondo, filo y
              relleno— y no ocupa nada.

              CADA FRASE EN SU RENGLÓN, y por eso son `<span>` en bloque y no un párrafo
              corrido: el presupuesto de `elCartelQueCabe` cuenta los renglones de cada
              frase por separado, y un párrafo corrido pintaría otra cosa que la que se
              midió. Las que no caben no se recortan: no se pintan, y se oyen enteras en la
              lista de apoyo de abajo.
            */}
            <p
              className="riberas-cartel"
              aria-live="polite"
              style={elEstiloDelCartel(cartel)}
            >
              {cartel === null
                ? null
                : cartel.frases.map((frase) => (
                    <span key={frase} className="riberas-cartel-frase">
                      {frase}
                    </span>
                  ))}
            </p>
          </>
        ) : (
          /* El telón: `--suelo` con el nombre del juego hasta que el modelo llega. */
          <div className="riberas-telon" aria-busy="true">
            <p className="riberas-nombre">{manifiesto.nombre}</p>
            <p className="letra-chica">Se levanta el delta.</p>
          </div>
        )}
        {/*
          LAS EXPLICACIONES DE MI MANO, ENTERAS, PARA QUIEN NO PUEDE SEÑALAR.

          Aquí ponía «LAS ONCE», y once son las CLASES de naipe que el juego sabe explicar
          (las nueve del mazo y los dos premios), no las filas que esta lista pinta. Lo que
          se pinta es MI MANO: de cero naipes a los que tenga, con los títulos repetidos si
          tengo dos y sin una sola línea de las clases que no me han tocado. Que sea así
          está bien, porque una lista de todas las clases sería el manual del juego leído en
          voz alta cada vez y además publicaría qué cartas existen antes de que salgan; lo
          que estaba mal era el rótulo, que prometía un número fijo. `verify:escritorio`
          cuenta las filas contra la mano de una partida de verdad, no contra el once.

          No se puede pasar el cursor por un naipe de un lienzo, así que quien navega con
          lector de pantalla necesita otra puerta: es la misma que la fase de los dados
          inventó para tirar, una lista dentro del recuadro que `estilo.css` saca de la
          vista con `clip-path` y NUNCA con `display: none`, que los lectores saltan.

          Aquí van LAS TRES frases de cada naipe, siempre, caiga lo que caiga en el cartel:
          lo que se oye no depende de cuánto sitio quede en la banda. Y va el nombre, que
          en el lienzo no se ve nunca —dentro de la escena no hay letras— y es lo único que
          distingue a un título de otro.

          Y ESTÁ FUERA DEL `conMundo`, a propósito y no por descuido: no necesita mundo
          ninguno. Mientras el modelo se descarga, la mano ya existe en la vista y sus
          explicaciones ya son verdad; y de paso esto se puede RENDERIZAR en Node, que es
          lo que permite que `verify:escritorio` cuente las filas contra la mano de una
          partida de verdad en vez de creerse el fuente.
        */}
        {cartasDelMazo.length > 0 ? (
          <ul className="riberas-solo-apoyo">
            {cartasDelMazo.map((c) => (
              <li key={`explica:${c.id}`}>
                {`${c.nombre}. ${c.explicacion.hace} ${c.explicacion.consigues} ${c.explicacion.usas}`}
              </li>
            ))}
          </ul>
        ) : null}
        {/*
          ═══ EL MENÚ DE ELEGIR, MODAL Y DENTRO DEL RECUADRO ═══

          Estaba EN FLUJO por debajo del lienzo, y con la página de pie eso deja de ser un
          sitio: el recuadro vale la ventana entera menos la cabecera, así que «debajo» está
          fuera de la pantalla. El menú de «a quién le robas» —o el de los quince pares del año
          bueno— aparecía donde no se ve, y como mover el estiaje es obligatorio, la partida se
          quedaba parada sin un error en ninguna parte. En la app su hermano (`HojaDeAQuien`) ya
          era modal desde su primera versión.

          Va DENTRO del recuadro, encima del lienzo y con el mismo velo y la misma trampa de
          foco que el cajón (`usarLaTrampaDeFoco`). Y por eso mismo se pinta AQUÍ, hermano del
          cajón y no del recuadro: los dos son cajas modales del mismo lienzo.
        */}
        {preguntando !== null ? (
          <ElijeUna
            titulo={preguntando.titulo}
            opciones={preguntando.opciones}
            quieto={quieto}
            alElegir={(o) => {
              cerrarElMenu();
              mover({ tipo: o.tipo, carga: o.carga });
            }}
            alDejarlo={cerrarElMenu}
          />
        ) : null}
        {/*
          ═══ LA HOJA DE UNA PROPUESTA: DONDE SE CONFIRMA, Y ES `ElijeUna` ═══

          Miguel: «la aceptación debe tener que confirmarse para que no se acepte por
          equivocación». La forma de garantizarlo NO es un diálogo detrás del botón: es que en
          la tira no haya botón. La tira entera abre esto, y aquí están «Aceptar» y
          «Rechazar», cada uno con su renglón y su rótulo escrito. Dos toques, y el primero no
          está encima del segundo.

          Y ES `ElijeUna` Y NO UN QUINTO MODAL CASI IGUAL. Lo que la hoja necesita es
          exactamente lo que ese componente ya hace: velo, `role="dialog"` con nombre, trampa
          de foco escrita UNA vez, `Escape`, `Dejarlo` que nunca se apaga, y las opciones con
          el rótulo y la ayuda que redactó el JUEGO —«Le das 1 limo y te da 1 junco»— sin
          inventar aquí una palabra sobre la jugada. Escribir una hoja aparte habría sido la
          quinta copia de la misma caja, y la que se rompe es la que nadie mira.

          El TÍTULO es la frase entera del trato y la NOTA es su estado: los dos los redacta
          `elPregonEnTres` en `shared/`, que es donde los va a leer también la app.

          CON LA TIRA CERRADA —o con una mía— la lista de opciones sale VACÍA y la hoja es de
          lectura: qué se ofreció, a quién y en qué acabó, con «Dejarlo» de única salida. Es
          la misma hoja y no un componente nuevo, que es lo que dice el §3.2 del trueque.
        */}
        {laTiraAbierta === null ? null : (
          <ElijeUna
            titulo={laTiraAbierta.frase}
            nota={laTiraAbierta.comoAnda}
            opciones={[laTiraAbierta.aceptar, laTiraAbierta.rechazar].filter((o): o is Opcion => o !== null)}
            quieto={quieto}
            alElegir={(o) => {
              cerrarLaHoja();
              mover({ tipo: o.tipo, carga: o.carga });
            }}
            alDejarlo={cerrarLaHoja}
          />
        )}
      </div>
    </div>
  );
}

/**
 * ═══ EL CARRIL DE LA CINTA: UN CUADRADO POR OPCIÓN, Y LA MESA NO SE PARA ═══
 *
 * Debajo del lienzo iba un `<Formulario>` EN FLUJO con lo que el tablero no enseña —tirar,
 * pasar, aceptar, rechazar, empezar, tirar fichas, mover el estiaje—, y en la pantalla
 * completa eso era el agujero que dejaba la mesa parada. LOS NÚMEROS, medidos y no supuestos:
 *
 *   · un `.opcion` de este cliente mide 238 puntos de ancho (`min-width: 14rem`) y 46,75 de
 *     alto, porque lleva rótulo Y ayuda;
 *   · un turno corriente trae UNA opción suelta —«Pasar el turno»— y el descarte trae CINCO,
 *     una por clase de bien que quede en la mano;
 *   · pero CON EL ESTIAJE POR MOVER el juego emite DIECIOCHO destinos siempre, y hasta
 *     veintitrés cuando las islas tienen dos víctimas. Dieciocho botones de 238 son 4.284
 *     puntos de lista debajo de un lienzo que se come la ventana entera. No es una lista
 *     larga: es que mover la pieza es obligatorio y al botón no se llega.
 *
 * Y NINGÚN COMPROBADOR SE PONÍA ROJO, que es la mitad que hay que arreglar aparte: los que
 * había miran la LISTA DE OPCIONES —que ninguna se pierda entre la barra, las manos y los
 * botones— y esa cuenta seguía saliendo bien. Nadie miraba la PANTALLA. La comprobación que
 * la mira está en `verify:escritorio`, y es hermana del bloque del mazo.
 *
 * ═══ EL GLIFO ERA EL NÚMERO DE ORDEN, Y ESA DECISIÓN QUEDA REVOCADA ═══
 *
 * Aquí ponía que el número de orden era «lo ÚNICO que distingue a los dieciocho» y que no
 * decir a qué isla va era «una renuncia y no un descuido», porque el carril es la puerta
 * rápida y el cajón es donde se lee. Jugando una partida entera contra el servidor, esa
 * renuncia salió como esto: con un siete de verdad en una mesa de tres, el juego emitió
 * VEINTE opciones y el carril las pintó como veinte cuadrados con «1», «2», … «20» dentro.
 * Rodar funcionaba (`.riberas-carril` 313 × 46,8, `scrollWidth` 935); lo que no existía era
 * QUÉ hace cada uno. Y los cuadrados 5 y 6 decían los dos «Mover el estiaje a la marisma …»
 * y sólo se distinguían por la víctima, o sea que ni el cajón resolvía el empate de un
 * vistazo.
 *
 * Y la premisa era falsa: lo que distingue a los dieciocho no es su orden en la lista, es
 * SU ISLA — y la isla tiene un número que YA ESTÁ PINTADO en el tablero, en el disco del
 * centro de cada comarca. `glifosDelCarril` lo saca de la vista (`shared/arcade/juegos/
 * riberas-en-tres.ts`, con el porqué entero y lo que se descartó), y este mueble lo pinta:
 *
 *   · EL NÚMERO DE LA ISLA dentro del cuadrado, que es lo que hay que buscar en el delta.
 *   · SU TERRENO como una barra de color al pie, porque el reparto lleva DOS de cada cifra
 *     y en el carril puede haber dos onces — igual que en el tablero, donde lo que los
 *     separa es de qué son. El color sale de `colorDeTerreno`, la misma tabla que pinta el
 *     tablero plano y la que `verify:riberas` mide.
 *   · LA VÍCTIMA como filo izquierdo, del color con el que esa persona se pinta en el
 *     marcador. Es lo que separa los dos cuadrados gemelos de una isla con dos víctimas sin
 *     escribir una letra más.
 *
 * LO QUE SE PIERDE, dicho: el número de orden ya no está a la vista, y ése era el atajo de
 * teclado de las nueve primeras. Sigue anunciado en `aria-keyshortcuts` y sigue funcionando;
 * lo que ya no hace es ocupar el único hueco que había para decir adónde va la pieza. En las
 * listas cortas —tirar, pasar, aceptar, rechazar, descartar— no hay isla que nombrar, no hay
 * glifo, y el ordinal se queda exactamente donde estaba.
 *
 * Y el rótulo y la ayuda siguen ENTEROS en el árbol —`aria-labelledby`, `aria-describedby` y
 * `title`—: lo que se pinta es un resumen, no un recorte del nombre accesible.
 *
 * ═══ Y RUEDA A LO ANCHO, QUE ES LO QUE HACE QUE QUEPAN ═══
 *
 * El carril mide LO QUE LA CINTA —el mismo `anchoDeLaCinta`, porque a los lados siguen las
 * dos manos y siguen siendo cartas que se arrastran— y lo que no cabe se rueda. En un lienzo
 * de 288 se ven dos botones de los dieciocho y en un monitor trece (`cuantosSeVenEnElCarril`).
 * `touch-action: auto` en la hoja NO es adorno: el recuadro lo tiene en `none` por el gesto
 * del delta, y sin devolvérselo el carril no se puede rodar CON EL DEDO, que es tanto como no
 * tenerlo.
 */
function ElCarril({
  opciones,
  alElegir,
  quieto,
  ancho,
  glifos,
  puerta,
}: {
  opciones: readonly Opcion[];
  alElegir: (movimiento: MovimientoDeclarado) => void;
  quieto: boolean;
  ancho: { ancho: number };
  /**
   * ═══ LA PUERTA DEL TRUEQUE, QUE NO ES UNA OPCIÓN Y POR ESO ENTRA POR OTRO SITIO ═══
   *
   * Los demás cuadrados de esta tira mandan `o.movimiento` tal cual. Éste no manda nada:
   * abre el componedor, porque lo que el juego declara ahí es la FORMA que admite y no un
   * movimiento montado —mandada tal cual contesta «Eso no es un trueque»—. Por eso llega
   * como un trato aparte y no dentro de `opciones`: meterla en la lista sería exactamente
   * el botón muerto que la marca `declaracion` existe para matar.
   *
   * Y VA AQUÍ Y NO EN LA PRIMERA TIRA DE LA CINTA porque ahí no cabe: medido, en un lienzo
   * de 288 la cinta son 115,2 puntos y ya se le cae uno de los tres trozos que lleva. Aquí
   * mide el suelo de toque como los demás cuadrados, y se queda PEGADA al canto izquierdo
   * (`position: sticky` en la hoja) mientras los otros ruedan por debajo: es lo que el §3.2
   * del diseño pide del botón de la cinta —«el renglón puede quedar fuera del recorte del
   * pregón; el botón no»— aplicado al eje en el que esta tira se recorta, que es el ancho.
   *
   * Y NO ES QUE HOY RUEDE NADA POR DEBAJO: medido sobre el árbitro en ocho partidas, la
   * puerta y los veinte destinos del estiaje NO COEXISTEN NUNCA —`opcionesDeTurno` sale por
   * su `return` temprano con `estiajePorMover` y no emite la puerta—, y las sueltas que la
   * acompañan fueron siempre `["pasar"]`. El porqué entero, con las cifras, está en la
   * cabecera de `.riberas-carril-puerta` en `estilo.css`.
   */
  puerta: {
    readonly rotulo: string;
    readonly ayuda: string;
    /** Con las cuatro propuestas vivas puestas no hay nada que montar: se apaga y lo dice. */
    readonly apagado: boolean;
    readonly abierto: boolean;
    readonly suyo: RefObject<HTMLButtonElement | null>;
    readonly alPulsar: () => void;
  } | null;
  /**
   * QUÉ DICE CADA CUADRADO, por `id` de opción. Viene montado de fuera y no se calcula aquí
   * por lo mismo que la barra y las dos manos: la lectura de la vista vive en un solo sitio
   * (`glifosDelCarril`) y este mueble sólo recoge. Una tabla vacía es «ninguna opción tiene
   * glifo», que es lo que pasa en un turno corriente, y entonces se pinta el número de orden
   * de siempre.
   */
  glifos: ReadonlyMap<string, GlifoDelCarril>;
}): JSX.Element {
  /*
   * POR LA MISMA PUERTA QUE EL FORMULARIO, y no por un `map` escrito aquí:
   * `loQueSePuedePintar` es la guarda que convierte lo que llegó POR EL CABLE en algo
   * pintable —una opción sin `ayuda` es un `TypeError` al pintar, dos ids iguales
   * desincronizan la lista de React, y un rótulo que falta deja un botón sin nombre
   * accesible—. Copiarla aquí sería tener dos guardas, y la que se quedaría atrás es la de
   * la pantalla que nadie mira.
   */
  const base = useId();
  const pintables = useMemo(() => loQueSePuedePintar(opciones), [opciones]);
  /*
   * Y LAS TECLAS 1-9 SON DE ESTE MUEBLE. El carril está montado siempre que haya opciones
   * sueltas —también con el cajón abierto, detrás de su velo—, así que el número que dispara
   * una tecla es el mismo aquí y en la copia del cajón, que ofrece esta misma lista en este
   * mismo orden y por eso declara `atajos={false}`. Ver `usarLosAtajos`.
   */
  usarLosAtajos(pintables, alElegir, quieto);

  return (
    <div
      className="riberas-carril"
      style={elEstiloDeLaCinta(ancho)}
      role="group"
      aria-label={TITULO_DE_LO_QUE_SE_HACE}
    >
      {puerta === null ? null : (
        /*
         * `aria-disabled` y nunca `disabled`, por lo mismo que los demás cuadrados de esta
         * tira: se apaga en cuanto entra la cuarta propuesta viva, y eso puede pasar con el
         * foco puesto encima. Con `disabled` el foco se caería al `<body>` en mitad de un
         * turno y volver cuesta tabular la cabecera entera de la Sala.
         *
         * El glifo es la flecha de doble punta, que es lo que el cuadrado tiene sitio para
         * decir; QUÉ hace y con qué regla está entero en el nombre accesible y en el
         * `title`, escritos por el juego y no aquí.
         */
        <button
          type="button"
          ref={puerta.suyo}
          className={
            puerta.apagado
              ? 'riberas-carril-opcion riberas-carril-puerta riberas-carril-quieta'
              : 'riberas-carril-opcion riberas-carril-puerta'
          }
          aria-disabled={puerta.apagado}
          aria-expanded={puerta.abierto}
          aria-label={puerta.rotulo}
          title={`${puerta.rotulo}. ${puerta.ayuda}`}
          onClick={() => {
            if (puerta.apagado) return;
            puerta.alPulsar();
          }}
        >
          <span className="riberas-carril-glifo" aria-hidden="true">
            ⇄
          </span>
        </button>
      )}
      {pintables.map((o, i) => {
        const conAtajo = i < CON_ATAJO;
        const idRotulo = `${base}-rotulo-${String(i)}`;
        const idAyuda = `${base}-ayuda-${String(i)}`;
        /*
         * `o.clave` ES el `id` de la opción siempre que el cable trajera uno y no estuviera
         * repetido (`loQueSePuedePintar`), que es por donde `glifosDelCarril` indexa. Cuando
         * no lo hay, la clave es un `sin-clave-N` que la tabla no contiene: no hay glifo y se
         * cae al número de orden, que es lo que se pinta en las listas cortas.
         */
        const suGlifo = glifos.get(o.clave) ?? null;
        return (
          /*
           * `aria-disabled` Y NO `disabled`, por lo mismo que en el formulario: un `<button>`
           * al que se le pone `disabled` TENIENDO EL FOCO lo pierde, y el foco cae al `<body>`.
           * Aquí eso es peor que allí, porque el carril está dentro del recuadro y volver
           * cuesta tabular la cabecera entera de la Sala.
           */
          <button
            key={o.clave}
            type="button"
            className={quieto ? 'riberas-carril-opcion riberas-carril-quieta' : 'riberas-carril-opcion'}
            aria-disabled={quieto}
            aria-labelledby={idRotulo}
            aria-describedby={o.ayuda.length > 0 ? idAyuda : undefined}
            aria-keyshortcuts={conAtajo && !quieto ? String(i + 1) : undefined}
            title={o.ayuda.length > 0 ? `${o.rotulo}. ${o.ayuda}` : o.rotulo}
            onClick={() => {
              if (quieto) return;
              alElegir(o.movimiento);
            }}
          >
            {/*
              EL FILO IZQUIERDO, DEL COLOR DE LA VÍCTIMA. Sólo cuando se le roba a alguien: es
              lo único que separa los dos cuadrados de una isla con dos víctimas. Va
              `aria-hidden` porque el nombre de quien pierde la ficha está en el rótulo entero
              de aquí abajo, que es lo que se oye: un color no se lee en voz alta.
            */}
            {suGlifo?.rail == null ? null : (
              <span
                className="riberas-carril-rail"
                style={{ background: suGlifo.rail }}
                aria-hidden="true"
              />
            )}
            <span className="riberas-carril-glifo" aria-hidden="true">
              {suGlifo === null ? i + 1 : suGlifo.glifo}
            </span>
            {/*
              LA BARRA DEL TERRENO AL PIE. El número de la isla no es único —el reparto lleva
              dos de cada cifra— así que esto es lo que separa dos «11» distintos, con el mismo
              color con el que esas dos islas se ven distintas en el tablero. `colorDeTerreno`
              es la MISMA tabla que pinta el tablero plano, y la que `verify:riberas` mide
              contra los seis colores de colono para que ninguna se coma una pieza.
            */}
            {suGlifo === null ? null : (
              <span
                className="riberas-carril-terreno"
                style={{ background: colorDeTerreno(suGlifo.terreno) }}
                aria-hidden="true"
              />
            )}
            {/*
              EL RÓTULO Y LA AYUDA, ENTEROS Y FUERA DE LA VISTA. Es la misma técnica que la
              lista de las explicaciones de los naipes —`clip-path`, nunca `display: none`,
              que los lectores saltan—: en 44 puntos no cabe «Mover el estiaje al cantil 10»,
              pero un botón sin nombre accesible no se puede pulsar con lector de pantalla, y
              dieciocho botones llamados «1»…«18» no son dieciocho movimientos distintos.
            */}
            <span className="riberas-carril-dicho" id={idRotulo}>
              {o.rotulo}
            </span>
            {o.ayuda.length > 0 ? (
              <span className="riberas-carril-dicho" id={idAyuda}>
                {o.ayuda}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// El pregón: las propuestas de trueque, colgando de la cinta
// ---------------------------------------------------------------------------

/**
 * ═══ EL PREGÓN, QUE ES LO QUE MIGUEL PIDIÓ Y LO QUE NO HABÍA ═══
 *
 * «Se tiene que mostrar en la pantalla las propuestas de trueque por cada jugador con
 * capacidad de aceptar o rechazar, la aceptación debe tener que confirmarse para que no se
 * acepte por equivocación.» Lo que había era un panel de TEXTO dentro del cajón —«t3: Ana da
 * junco por limo a Bruno — propuesta»— sin nada que pulsar y detrás de un botón que hay que
 * abrir, y unos botones sueltos llamados «Aceptar el trueque t3» que salían con los demás.
 * Una propuesta caduca al acabar el turno de quien la hizo, así que una oferta que sólo se ve
 * abriendo un cajón es una oferta que casi nadie contesta.
 *
 * ═══ NO ES MODAL, Y ÉSA ES LA DIFERENCIA CON EL CAJÓN ═══
 *
 * El cajón lo abre quien quiere mirar; el pregón lo lee quien NO tiene el turno mientras otro
 * juega, así que tiene que estar a la vista SIN abrir nada y el tablero tiene que seguir
 * girando por debajo. De ahí las tres cosas que no lleva: ni velo, ni trampa de foco, ni
 * `role="dialog"`. Es una región con nombre, y las tiras están en el orden del tabulador
 * como cualquier botón de la pantalla.
 *
 * ═══ LA TIRA NO LLEVA BOTÓN DE ACEPTAR, Y ESO ES LAS DOS MITADES DEL ENCARGO ═══
 *
 * La tira entera es un botón y lo único que hace es ABRIR la hoja; «Aceptar» y «Rechazar»
 * están dentro. Es lo que Miguel pide —dos toques, y el primero no está encima del segundo—
 * y además es lo que hace que la oferta quepa: medido en el diseño, con los dos botones de 44
 * al lado a la oferta le quedan 77 puntos en el SE apaisado y 16 en 320×360, o sea CERO
 * fichas, contra los 165 y 104 que quedan sin ellos.
 *
 * ═══ TRES BLOQUES, Y EL DE EN MEDIO ES EL QUE NADIE VEÍA ═══
 *
 *   · «Para contestar»: lo vivo que va dirigido a mí.
 *   · «Tuyas»: lo vivo que YO ofrecí. Hoy el que propone no ve NADA de lo que propuso —ni si
 *     sigue en pie, ni quién se lo apartó—, y ése era el segundo agujero.
 *   · «Ya trocado»: lo cerrado, que es la otra mitad de la decisión 17. Quien vuelve al
 *     tablero dos turnos después tiene que poder saber quién le dio qué a quién.
 *
 * Un bloque vacío NO se pinta: un rótulo de 44 puntos con nada debajo es cromo encima del
 * tablero, y con el trueque de hoy uno de los dos primeros está vacío SIEMPRE —sólo propone
 * quien tiene el turno—. Ver `elPregonEnTres`, que lo mide.
 *
 * ═══ Y RUEDA POR DENTRO, HASTA EL TECHO DEL ASA ═══
 *
 * Cuelga del pie de la cinta —una tira o dos, según haya carril— y se para donde se para el
 * cartel de un naipe: en el techo del asa de la barra menos el mismo aire (`elAltoDelPregon`).
 * Hasta el canto taparía las piezas de construir y el naipe del mazo, que es justo lo que un
 * mueble NO modal no puede hacer. Lo que no cabe se rueda, y `touch-action: auto` en la hoja
 * no es adorno: el recuadro lo tiene en `none` por el gesto del delta.
 *
 * ═══ Y SE PLIEGA CUANDO NO HAY NADA QUE CONTESTAR, QUE ES LO QUE SALIÓ JUGANDO ═══
 *
 * Es una caja OPACA, y en el turno de uno crece con las propuestas PROPIAS: medido en una
 * partida de verdad, con ocho abiertas iba de y=159 a y≈540 de un recuadro de 857, o sea el
 * 44 % de arriba del tablero, justo donde viven los anillos de fundar. No crece sin fin —el
 * techo del asa lo para—, pero ese tope ya es media pantalla tapada mientras se decide dónde
 * construir, y lo que tapa es lo que NO hay que contestar.
 *
 * Así que cuando `elPregonSePliega` —no queda nada dirigido a mí— el pregón se pinta como UNA
 * tira que dice cuántas hay, y un toque lo despliega. Plegado ocupa `altoDelPregonPlegado`,
 * 63,75 puntos, que en aquel recuadro son el 7,4 % en vez del 44 %. Con algo que contestar no
 * se pliega NUNCA, porque entonces taparlo es su trabajo.
 *
 * La tira que resume es la MISMA tira de siempre —`.riberas-pregon-tira`, el suelo de toque,
 * el raíl de color, los dos renglones y `elEstadoQueCabe` para el recorte— con un triángulo al
 * canto, y no un mueble nuevo: dos formas de tira serían dos sitios donde se recorta distinto.
 */
/**
 * UNA TIRA DEL PREGÓN, ESCRITA UNA VEZ PARA LAS DOS PANTALLAS QUE LA PINTAN.
 *
 * La pinta el pregón colgado de la cinta (`ElPregon`) y la pinta el pregón del retablo
 * (`ElPregonDelRetablo`), que son dos cajas distintas —una encima del lienzo y a lo que mide
 * la cinta, la otra un panel en flujo del ancho de la columna— con LA MISMA tira dentro. Dos
 * copias serían dos sitios donde se recorta distinto, y el que se quedaría atrás es el del
 * retablo, que es la pantalla que sólo se abre cuando hay cinco sentados.
 *
 * Lo único que cambia entre las dos es el HUECO, que en una sale del ancho de la cinta y en
 * la otra del de la columna medida: por eso entra por parámetro y no se calcula aquí.
 */
function UnaTira({
  t,
  hueco,
  raiz,
  abierta,
  alAbrir,
}: {
  t: TiraDelPregon<Opcion>;
  hueco: number;
  raiz: number;
  abierta: string | null;
  alAbrir: (id: string) => void;
}): JSX.Element {
  const seContesta = t.aceptar !== null || t.rechazar !== null;
  /*
   * EL NOMBRE ACCESIBLE ES LA FRASE ENTERA Y NO LO QUE SE PINTA. En la tira
   * caben «1 junco → 1 limo» y cuatro palabras de estado; lo que se oye es
   * quién, qué, en qué dirección y qué hace un toque. Las dos cajas que se
   * pintan van `aria-hidden` para que nada se diga dos veces, que es lo mismo
   * que hace la ficha de un colono en el marcador del cajón.
   */
  const seOye = `${t.frase}. ${t.comoAnda}. ${seContesta ? ABRIR_LA_HOJA : ABRIR_LA_HOJA_SIN_CONTESTAR}`;
  return (
    <button
      type="button"
      className="riberas-pregon-tira"
      /* El seudónimo, para que al cerrar la hoja el foco encuentre su tira. */
      data-trato={t.id}
      aria-haspopup="dialog"
      aria-expanded={abierta === t.id}
      aria-label={seOye}
      title={seOye}
      onClick={() => {
        alAbrir(t.id);
      }}
    >
      <span className="riberas-pregon-rail" style={{ background: t.color }} aria-hidden="true" />
      <span className="riberas-pregon-dicho" aria-hidden="true">
        <span className="riberas-pregon-oferta">
          {t.da} → {t.pide}
        </span>
        <span className="riberas-pregon-estado">{elEstadoQueCabe(t, hueco, raiz)}</span>
      </span>
    </button>
  );
}

/**
 * ═══ EL PREGÓN DEL RETABLO, Y VA ANTES QUE EL TABLERO ═══
 *
 * En una mesa de CINCO o de SEIS el retablo no es un respaldo: es la única pantalla que hay.
 * `MANIFIESTO_RIBERAS.jugadores` admite hasta seis y el atlas del delta trae CUATRO colores,
 * así que `bastanColores` manda aquí en cuanto se sienta el quinto, y con él se va la cinta
 * de la que cuelga el pregón del 3D. Hasta hoy, en esas mesas, contestar un trueque era un
 * botón suelto de `AccionesDelTablero` que se disparaba de un toque — o sea que la mesa de
 * cinco se quedaba sin la confirmación que Miguel pidió.
 *
 * ═══ POR QUÉ ARRIBA, Y ESTO ES UNA MEDIDA Y NO UN GUSTO ═══
 *
 * Debajo del `<Retablo>` no se ve. El alto pintado del SVG es
 * `min(max(408, 62 % del alto), ancho útil de la columna / 1,101)`, y con eso, medido en los
 * quince lienzos de la casa, en CUATRO —568×320, 780×360, 667×375 y 844×390— el tablero ya
 * pasa del pliegue él solo, y en un quinto (932×430) deja menos de medio renglón. Cinco
 * renglones de 46,75 —el rótulo y cuatro tiras— son 233,75 puntos, y sólo SEIS de los quince
 * dejan tanto sitio debajo. Un botón de aceptar al que hay que desplazarse después de pasar
 * el tablero entero es un botón que en una partida real no se pulsa.
 *
 * Arriba, entre la letra chica del porqué y el tablero, se ve sin desplazar en los quince. Y
 * aquí la página SÍ rueda, así que no hay recorte que decidir ni alto que calcular: lo que se
 * decide es el ORDEN, y el orden es que el pregón va antes que el tablero.
 *
 * ═══ Y ES UN `<section class="panel">` Y NO LA CAJA DEL 3D ═══
 *
 * Aquella cuelga de la cinta con `position: absolute`, mide lo que la cinta y se para en el
 * techo del asa de la barra; aquí no hay cinta, ni barra, ni lienzo, y la página rueda. Lo
 * que SÍ se comparte es la tira, que es donde vive el recorte: ver `UnaTira`.
 *
 * ═══ LA LISTA SE MIDE, POR LO MISMO QUE LA DEL MARCADOR ═══
 *
 * De la anchura sale si en el renglón de estado cabe el nombre —«la aceptó Ana»— o sólo el
 * estado —«aceptada»—, y la anchura aquí no la pone este mueble: la pone la rejilla de la
 * Sala, que en 320×360 deja 286 puntos de columna y en un monitor 1.071. Un umbral escrito
 * aquí se equivocaría en cuanto cambie la preferencia de tamaño de letra del navegador. Sin
 * medida —el primer render, y Node— se pinta el renglón ENTERO, que es lo que había.
 */
function ElPregonDelRetablo({
  pregon,
  suya,
  abierta,
  alAbrir,
}: {
  pregon: PregonEnTres<Opcion>;
  suya: RefObject<HTMLDivElement | null>;
  abierta: string | null;
  alAbrir: (id: string) => void;
}): JSX.Element {
  const [anchoDeLaLista, ponerAnchoDeLaLista] = useState(0);
  const [raizDeLaLetra, ponerRaizDeLaLetra] = useState(RAIZ_DE_LA_CASA);
  const elOjo = useRef<ResizeObserver | null>(null);
  const medirLaLista = useCallback((lista: HTMLDivElement | null) => {
    elOjo.current?.disconnect();
    elOjo.current = null;
    if (lista === null || typeof ResizeObserver === 'undefined') return;
    const mide = (): void => {
      ponerAnchoDeLaLista((antes) => (antes === lista.clientWidth ? antes : lista.clientWidth));
      ponerRaizDeLaLetra((antes) => {
        const ahora = raizDelNavegador();
        return antes === ahora ? antes : ahora;
      });
    };
    mide();
    const ojo = new ResizeObserver(mide);
    ojo.observe(lista);
    if (typeof document !== 'undefined') ojo.observe(document.documentElement);
    elOjo.current = ojo;
  }, []);
  useEffect(() => () => elOjo.current?.disconnect(), []);
  /* Sin medir, el hueco es infinito y cabe el renglón entero: `elEstadoQueCabe` lo decide. */
  const hueco = anchoDeLaLista === 0 ? Number.POSITIVE_INFINITY : huecoDeLaTira(anchoDeLaLista);
  const bloques: { rotulo: string; tiras: readonly TiraDelPregon<Opcion>[] }[] = [
    { rotulo: PARA_CONTESTAR, tiras: pregon.paraContestar },
    { rotulo: LAS_MIAS, tiras: pregon.mias },
    { rotulo: LOS_CERRADOS, tiras: pregon.cerrados },
  ];
  return (
    <section className="panel riberas-pregon-en-el-retablo" aria-label={EL_PREGON_DE_LA_MESA}>
      <h2 className="rotulo-de-panel">{EL_PREGON_DE_LA_MESA}</h2>
      <div ref={suya}>
        {bloques.map((bloque) =>
          bloque.tiras.length === 0 ? null : (
            <div key={bloque.rotulo} className="riberas-pregon-bloque" ref={medirLaLista}>
              <h3 className="rotulo-de-panel">{bloque.rotulo}</h3>
              {bloque.tiras.map((t) => (
                <UnaTira key={t.id} t={t} hueco={hueco} raiz={raizDeLaLetra} abierta={abierta} alAbrir={alAbrir} />
              ))}
            </div>
          ),
        )}
      </div>
    </section>
  );
}

/**
 * ═══ EL COMPONEDOR: DONDE SE MONTA UNA OFERTA DE VARIOS BIENES CON EL DEDO ═══
 *
 * Es lo único que faltaba para que lo que Miguel pidió se pueda HACER. El motor admite un
 * tres por dos desde la fase 1 y el pregón lo lee desde la fase 2, pero la lista de botones
 * del juego sigue siendo de uno por uno a propósito: la combinatoria completa son 5.000
 * opciones y 1.141,9 kB en CADA lectura de una mesa de seis, así que el juego no la enumera,
 * declara la PUERTA. Esto es lo que la lee y compone la carga.
 *
 * ═══ Y SU BOTÓN SALE DE `puertaDelTrueque` Y NO DE `acciones` ═══
 *
 * La declaración NO llega a `AccionesDelTablero`: `tableroDeRiberas` la deja fuera con el
 * mismo `continue` que ya salta FUNDAR, porque un botón que manda la declaración tal cual
 * recibe «Eso no es un trueque» y no hace nada más. O sea que ahí no hay botón que pulsar, y
 * el que abre esto lo pinta esta sección, que es de Riberas y sabe leer una declaración. Y se
 * puede hacer porque el retablo de este juego NO es la rama genérica de la Sala: `sala.tsx`
 * manda a Riberas a `RiberasEnTres` siempre, y es `RiberasEnTres` quien decide caer aquí.
 *
 * ═══ AQUÍ NO SE DECIDE NINGUNA REGLA, Y ESO ES LA MITAD DEL MUEBLE ═══
 *
 * Ni el tope por lado, ni cuántas fichas tengo, ni qué bien no puede estar en los dos lados,
 * ni cuándo se apaga «Proponer»: todo eso lo dice `elComponedor` en `shared/`, que es donde lo
 * lee también la app. Lo que un «+» hace al pulsarse es guardar el estado que ya viene dentro
 * (`renglon.mas`), y va apagado exactamente cuando ese estado es `null`. Con dos clientes
 * sumando el uno por su cuenta serían dos aritméticas del tope, y la que se rompe es la del
 * aparato que nadie abre para mirar.
 *
 * ═══ `aria-disabled` Y NUNCA `disabled` NATIVO ═══
 *
 * Por lo mismo que el botón de tirar los dados y que la lista de `ElijeUna`: un `<button>` al
 * que se le pone `disabled` TENIENDO EL FOCO lo pierde, y el foco cae al `<body>`. Aquí pasa
 * en cada toque —se sube la tercera sal y el «+» de los cinco renglones se apaga de golpe—,
 * así que con `disabled` el dedo funcionaría y el teclado se quedaría sin sitio donde estar.
 *
 * ═══ Y LAS TRIPAS SE PINTAN EN LAS DOS PANTALLAS DE ESTE CLIENTE, ASÍ QUE SON UN MUEBLE ═══
 *
 * En el retablo son una sección que se pliega dentro de una página que rueda; en el lienzo
 * son una caja modal a todo el ancho colgada de la cinta. La CAJA es distinta y el contenido
 * es el mismo: los cinco renglones, el conmutador, los destinos, el resumen vivo y
 * «Proponer». Escritos dos veces serían dos sitios donde el día que el «+» cambie sólo
 * cambiará uno, y el que se queda atrás es el que se mira menos.
 */
function LasTripasDelComponedor({
  componedor,
  ponerPuesto,
  quieto,
  alCerrar,
  alProponer,
}: {
  componedor: ElComponedor;
  ponerPuesto: (lo: LoQueSeCompone) => void;
  quieto: boolean;
  /** Cerrar la caja que lo lleva: en el retablo es plegar la sección, en el lienzo es irse. */
  alCerrar: () => void;
  alProponer: (movimiento: { tipo: string; carga: unknown }) => void;
}): JSX.Element {
  const noSePuede = quieto || componedor.movimiento === null;
  return (
    <div className="riberas-componedor-dentro">
      {/*
        EL CONMUTADOR, Y POR QUÉ HAY UNO. Con dos contadores por fila —lo que doy y lo
        que pido en el mismo renglón— la fila mide 296 puntos y no cabe en el ancho de
        ningún teléfono. Con el conmutador cada fila mide 162 y cabe en los quince.
      */}
      <div className="riberas-componedor-lados" role="group" aria-label={QUE_LADO_SE_TOCA}>
        {([
          ['doy', LO_QUE_DOY, componedor.verLoQueDoy],
          ['pido', LO_QUE_PIDO, componedor.verLoQuePido],
        ] as const).map(([cual, rotulo, estado]) => (
          <button
            key={cual}
            type="button"
            className={componedor.lado === cual ? 'opcion riberas-elegida' : 'opcion'}
            aria-pressed={componedor.lado === cual}
            onClick={() => {
              ponerPuesto(estado);
            }}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">{rotulo}</span>
            </span>
          </button>
        ))}
      </div>
      <ul className="renglones" role="list">
        {componedor.renglones.map((r) => (
          <li key={r.bien} className="riberas-componedor-renglon">
            <span className="riberas-componedor-bien" aria-hidden="true">
              {r.bien}
            </span>
            <button
              type="button"
              className={r.menos === null ? 'opcion opcion-quieta riberas-componedor-mando' : 'opcion riberas-componedor-mando'}
              aria-disabled={r.menos === null || quieto}
              aria-label={r.seOyeMenos}
              title={r.seOyeMenos}
              onClick={() => {
                if (r.menos === null || quieto) return;
                ponerPuesto(r.menos);
              }}
            >
              <span className="opcion-texto">
                <span className="opcion-rotulo">−</span>
              </span>
            </button>
            {/*
              LA CIFRA ES LO QUE SE OYE DEL RENGLÓN ENTERO —«3 sales, y tienes 3»—, y la
              redacta `shared/` para que la app diga exactamente lo mismo. Lo que se
              PINTA es el número a secas, que es lo que cabe entre los dos mandos.
            */}
            <span className="riberas-componedor-cifra" aria-label={r.seOye}>
              {r.cuantas}
            </span>
            <button
              type="button"
              className={r.mas === null ? 'opcion opcion-quieta riberas-componedor-mando' : 'opcion riberas-componedor-mando'}
              aria-disabled={r.mas === null || quieto}
              aria-label={r.seOyeMas}
              title={r.seOyeMas}
              onClick={() => {
                if (r.mas === null || quieto) return;
                ponerPuesto(r.mas);
              }}
            >
              <span className="opcion-texto">
                <span className="opcion-rotulo">+</span>
              </span>
            </button>
            <span className="riberas-componedor-tengo" aria-hidden="true">
              {`tienes ${String(r.tengo)}`}
            </span>
          </li>
        ))}
      </ul>
      {/* A QUIÉN: «a la mesa» primero, que es el que siempre cabe, y luego los que tienen bienes. */}
      <div className="riberas-componedor-lados" role="group" aria-label={A_QUIEN_SE_LO_PROPONES}>
        {componedor.destinos.map((d) => (
          <button
            key={d.para ?? 'la-mesa'}
            type="button"
            className={d.elegido ? 'opcion riberas-elegida' : 'opcion'}
            aria-pressed={d.elegido}
            onClick={() => {
              ponerPuesto(d.elegir);
            }}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">{d.nombre}</span>
            </span>
          </button>
        ))}
      </div>
      {/*
        LO QUE SE VA A MANDAR, ESCRITO ANTES DE PULSAR. Es región viva porque cambia con
        cada «+» y con cada «−», y quien juega con lector de pantalla no tiene otra
        manera de saber qué lleva montado sin recorrer los cinco renglones otra vez.
      */}
      <p className="riberas-componedor-resumen" aria-live="polite">
        {componedor.resumen}
      </p>
      <button
        type="button"
        className={noSePuede ? 'opcion opcion-quieta' : 'opcion opcion-primaria'}
        aria-disabled={noSePuede}
        title={componedor.porQueNo}
        onClick={() => {
          const movimiento = componedor.movimiento;
          if (quieto || movimiento === null) return;
          alCerrar();
          alProponer(movimiento);
        }}
      >
        <span className="opcion-texto">
          <span className="opcion-rotulo">{PROPONER}</span>
          {componedor.porQueNo.length > 0 ? (
            <span className="opcion-ayuda">{componedor.porQueNo}</span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

/**
 * ═══ EL COMPONEDOR DEL RETABLO: UNA SECCIÓN QUE SE PLIEGA, EN UNA PÁGINA QUE RUEDA ═══
 *
 * En la mesa de cinco o de seis no hay lienzo del que colgar nada, así que esto es un
 * `.panel` en flujo con su rótulo, su botón de abrir y las tripas debajo. Va DEBAJO del
 * tablero y no arriba, al revés que el pregón, y por lo contrario: el pregón es de quien NO
 * tiene el turno y hay que verlo sin buscarlo; esto es de quien SÍ lo tiene, que ya ha
 * mirado el tablero.
 *
 * ═══ Y EL BOTÓN QUE ABRE SE APAGA CON LAS CUATRO VIVAS, IGUAL QUE EL DE LA CINTA ═══
 *
 * Es el §4.2 del diseño a la letra —«el mismo botón, con la misma ayuda y el mismo apagado
 * por las cuatro vivas, que el §3.2 pone en la cinta del 3D»— y hasta esta fase estaba a
 * medias: el botón se abría, dentro «Proponer» salía apagado con su porqué, y para leer el
 * porqué había que abrir una caja de ocho renglones. Ahora lo dice el propio botón, con la
 * ayuda que escribe el juego (`componedor.ayuda` ya cambia de texto con el tope puesto), y
 * lo dice sin abrir nada.
 *
 * `aria-disabled` y nunca `disabled` nativo, por lo mismo que los dos mandos de dentro.
 */
/*
 * SE EXPORTA PARA PODER PINTARLO ABIERTO DESDE NODE. Abrirlo es pulsar, y en un guion no
 * hay quien pulse: sin esto, de los ocho renglones no se mediría ni uno, y lo único que
 * `verify:escritorio` podría comprobar del componedor sería que existe el botón que lo abre.
 */
export function ElComponedorDelRetablo({
  componedor,
  ponerPuesto,
  quieto,
  abierto,
  alAbrir,
  alProponer,
}: {
  componedor: ElComponedor;
  ponerPuesto: (lo: LoQueSeCompone) => void;
  quieto: boolean;
  abierto: boolean;
  alAbrir: (abierto: boolean) => void;
  alProponer: (movimiento: { tipo: string; carga: unknown }) => void;
}): JSX.Element {
  return (
    <section className="panel riberas-componedor">
      <h2 className="rotulo-de-panel">{EL_COMPONEDOR}</h2>
      {/*
        EL BOTÓN QUE LO ABRE, con el rótulo y la ayuda que escribió EL JUEGO en la puerta.
        Esta pantalla no redacta ni una palabra sobre el trueque: lo que dice de la regla
        —«Hasta 3 fichas por lado, y pueden repetirse de la misma clase»— sale de ahí, y lo
        que dice cuando ya no caben más —«Ya tienes 4 propuestas en la mesa»— también.
      */}
      <button
        type="button"
        className={componedor.noCabenMas ? 'opcion opcion-quieta' : 'opcion'}
        aria-expanded={abierto}
        aria-disabled={componedor.noCabenMas}
        title={componedor.ayuda}
        onClick={() => {
          if (componedor.noCabenMas) return;
          alAbrir(!abierto);
        }}
      >
        <span className="opcion-texto">
          <span className="opcion-rotulo">{componedor.rotulo}</span>
          <span className="opcion-ayuda">{componedor.ayuda}</span>
        </span>
      </button>
      {!abierto ? null : (
        <LasTripasDelComponedor
          componedor={componedor}
          ponerPuesto={ponerPuesto}
          quieto={quieto}
          alCerrar={() => {
            alAbrir(false);
          }}
          alProponer={alProponer}
        />
      )}
    </section>
  );
}

/**
 * ═══ EL COMPONEDOR EN EL LIENZO: MODAL, A TODO EL ANCHO, Y RODANDO POR DENTRO ═══
 *
 * Las tripas son las MISMAS que en el retablo —el mismo mueble, no una copia—, y lo único
 * que cambia es la caja. Tres decisiones, y ninguna es de gusto:
 *
 *   · ES MODAL, y el pregón que cuelga del mismo sitio no lo es. La diferencia es quién lo
 *     usa y cuándo: el pregón lo lee quien NO tiene el turno y por debajo se sigue girando
 *     el tablero; esto lo usa quien SÍ lo tiene, y mientras compone no puede tocar el
 *     tablero, porque un toque perdido funda una choza donde estaba el dedo. Es el mismo
 *     razonamiento del cajón del marcador, y por eso lleva sus mismas cuatro mitades: velo,
 *     `role="dialog"` con nombre, la trampa de foco escrita UNA vez (`usarLaTrampaDeFoco`) y
 *     el foco de vuelta al cuadrado que lo abrió.
 *   · VA A TODO EL ANCHO DEL RECUADRO Y NO A LO QUE MIDE LA CINTA, que es lo único de este
 *     encargo que no se mide con `anchoDeLaCinta`. El renglón de un bien es la ficha (44),
 *     el «−» (44), la cifra (30) y el «+» (44), o sea 162 puntos, y el tercio central de la
 *     cinta se queda corto en los lienzos de pie de esta casa. Puede hacerlo justamente
 *     porque es modal: con el velo puesto no hay carta que arrastrar a los lados.
 *   · RUEDA POR DENTRO. Ocho renglones del suelo de toque son 374 puntos con la raíz de esta
 *     casa, y en los lienzos bajos de la lista no caben. Por eso está en
 *     `SE_DESPLAZAN_SOLAS`: sin nombrarla ahí, la rueda del ratón sobre los cinco renglones
 *     acercaría el delta detrás del velo sin mover un renglón.
 *
 * Y NO SE ESCRIBE UN QUINTO MODAL: lo que hace de caja es lo mismo que hace `ElijeUna` con
 * su `fijo`, sólo que aquí el contenido no es una lista de opciones sino un mueble entero.
 * Lo que sí se comparte de verdad —velo, diálogo, trampa— está escrito una sola vez.
 */
export function ElComponedorEnElLienzo({
  componedor,
  ponerPuesto,
  quieto,
  alProponer,
  alDejarlo,
}: {
  componedor: ElComponedor;
  ponerPuesto: (lo: LoQueSeCompone) => void;
  quieto: boolean;
  alProponer: (movimiento: { tipo: string; carga: unknown }) => void;
  alDejarlo: () => void;
}): JSX.Element {
  const caja = useRef<HTMLDivElement | null>(null);
  usarLaTrampaDeFoco(true, caja, alDejarlo);
  return (
    <>
      <div className={EL_VELO} onClick={alDejarlo} aria-hidden="true" />
      <div
        ref={caja}
        className={EL_COMPONEDOR_EN_EL_LIENZO}
        role="dialog"
        aria-modal="true"
        aria-label={EL_COMPONEDOR}
        tabIndex={-1}
      >
        <h2 className="rotulo-de-panel">{EL_COMPONEDOR}</h2>
        {/*
          LA REGLA DEL JUEGO, ARRIBA Y EN TENUE. En el retablo va dentro del botón que abre
          la sección; aquí ese botón está en la cinta y mide 44 puntos, así que la frase
          —«Hasta 3 fichas por lado, y pueden repetirse de la misma clase»— no cabe dentro y
          se escribe aquí. Sigue siendo la que redacta el juego, palabra por palabra.
        */}
        <p className="riberas-elige-nota">{componedor.ayuda}</p>
        <LasTripasDelComponedor
          componedor={componedor}
          ponerPuesto={ponerPuesto}
          quieto={quieto}
          alCerrar={alDejarlo}
          alProponer={alProponer}
        />
        {/*
          «DEJARLO», COMO EN LAS OTRAS CUATRO HOJAS. El velo y el `Escape` cierran igual, pero
          los dos son puertas que hay que saberse: con el dedo, en un lienzo tapado por el
          velo, un botón escrito es la única salida que se ve.
        */}
        <button
          type="button"
          className="opcion opcion-sobria"
          onClick={alDejarlo}
        >
          <span className="opcion-texto">
            <span className="opcion-rotulo">Dejarlo</span>
          </span>
        </button>
      </div>
    </>
  );
}

function ElPregon({
  pregon,
  suya,
  ancho,
  alto,
  raiz,
  conCarril,
  abierta,
  alAbrir,
  sePliega,
  desplegado,
  alPlegar,
}: {
  pregon: PregonEnTres<Opcion>;
  suya: RefObject<HTMLDivElement | null>;
  ancho: { ancho: number };
  alto: number;
  raiz: number;
  conCarril: boolean;
  abierta: string | null;
  alAbrir: (id: string) => void;
  sePliega: boolean;
  desplegado: boolean;
  alPlegar: (desplegado: boolean) => void;
}): JSX.Element {
  /*
   * EL HUECO DE LETRAS DE UNA TIRA, medido con el ancho que la cinta tiene HOY y con la raíz
   * de VERDAD del navegador. De aquí sale si en el renglón de estado cabe el nombre de quien
   * contestó: en un lienzo de 288 no cabe, y entonces se recorta EL NOMBRE y nunca el estado.
   */
  const hueco = huecoDeLaTira(ancho.ancho);
  const bloques: { rotulo: string; tiras: readonly TiraDelPregon<Opcion>[] }[] = [
    { rotulo: PARA_CONTESTAR, tiras: pregon.paraContestar },
    { rotulo: LAS_MIAS, tiras: pregon.mias },
    { rotulo: LOS_CERRADOS, tiras: pregon.cerrados },
  ];
  const resumen = sePliega ? elResumenDelPregon(pregon) : null;
  /* Y el de la tira que resume, que es el mismo menos el triángulo del pliegue. */
  const huecoDelResumen = huecoDeLaTiraQueResume(ancho.ancho);
  return (
    <div
      ref={suya}
      className={conCarril ? `${EL_PREGON} ${EL_PREGON}-bajo-el-carril` : EL_PREGON}
      style={elEstiloDelPregon(ancho, alto)}
      role="region"
      aria-label={EL_PREGON_DE_LA_MESA}
    >
      {/*
        LA TIRA QUE RESUME, cuando no hay nada que contestar. Está puesta también con el
        pregón desplegado —con el triángulo al revés y `aria-expanded` en cierto—: es la
        única puerta de vuelta, y un mueble que sólo se sabe abrir es un mueble que tapa el
        tablero hasta que cambia el turno.

        `aria-expanded` y no un rótulo que diga «abrir» o «cerrar»: es un botón que despliega
        una región, y ésa es la palabra que un lector de pantalla ya sabe leer. Lo que se OYE
        es la frase entera de `elResumenDelPregon`, que dice las dos cifras y qué hace el toque.
      */}
      {resumen === null ? null : (
        <button
          type="button"
          className="riberas-pregon-tira riberas-pregon-resume"
          aria-expanded={desplegado}
          aria-label={resumen.seOye}
          title={resumen.seOye}
          onClick={() => {
            alPlegar(!desplegado);
          }}
        >
          <span
            className="riberas-pregon-rail"
            style={{ background: pregon.mias[0]?.color ?? 'transparent' }}
            aria-hidden="true"
          />
          <span className="riberas-pregon-dicho" aria-hidden="true">
            <span className="riberas-pregon-oferta">
              {elEstadoQueCabe(
                { comoAnda: resumen.dicho, comoAndaSinNombre: resumen.dichoCorto },
                huecoDelResumen,
                raiz,
              )}
            </span>
            <span className="riberas-pregon-estado">
              {elEstadoQueCabe(resumen, huecoDelResumen, raiz)}
            </span>
          </span>
          <span className="riberas-pregon-pliegue" aria-hidden="true">
            {desplegado ? '▴' : '▾'}
          </span>
        </button>
      )}
      {sePliega && !desplegado
        ? null
        : bloques.map((bloque) =>
            bloque.tiras.length === 0 ? null : (
              <div key={bloque.rotulo} className="riberas-pregon-bloque">
                <h2 className="rotulo-de-panel">{bloque.rotulo}</h2>
                {bloque.tiras.map((t) => (
                  <UnaTira key={t.id} t={t} hueco={hueco} raiz={raiz} abierta={abierta} alAbrir={alAbrir} />
                ))}
              </div>
            ),
          )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// El menú de elegir: a quién, o cuál
// ---------------------------------------------------------------------------

/**
 * EL MENÚ PEQUEÑO DE UNA PREGUNTA. Rótulo y ayuda son los que escribió el juego en cada
 * opción —ya nombran a quién se le propone el trato, a quién le roba la guardia o qué
 * dos bienes coge el año bueno—, así que aquí no se inventa ni una palabra sobre la
 * jugada: sólo el título, que llega de fuera, y la salida.
 *
 * Es UN componente para las cuatro preguntas y no cuatro casi iguales. La primera
 * versión sólo sabía de trueques y llevaba el título escrito dentro; con las cartas
 * habría hecho falta copiarlo tres veces, y tres copias de un menú son tres sitios donde
 * el día que el botón de «Dejarlo» cambie sólo cambiará uno.
 *
 * `Dejarlo` NO va deshabilitado con `quieto`: cerrar el menú no manda nada, y dejar sin
 * salida a quien lo abrió mientras una petición viaja es encerrarlo delante de una lista
 * de botones apagados.
 *
 * ═══ Y DESDE LA PANTALLA COMPLETA ES MODAL, PORQUE «DEBAJO» DEJÓ DE SER UN SITIO ═══
 *
 * Esto vivía EN FLUJO por debajo del lienzo, y funcionaba mientras el lienzo medía `62vh` y
 * la página rodaba. Con la página de pie el recuadro vale la VENTANA ENTERA menos la
 * cabecera: debajo no hay nada, porque debajo está fuera de la pantalla. O sea que el menú
 * de «a quién le robas» —y el de los quince pares del año bueno, y el de comprar— se pintaba
 * donde no se ve. Y como el estiaje es obligatorio, eso no es una molestia: es la partida
 * parada, sin un error en ninguna consola. En la app su hermano `HojaDeAQuien` ya era modal.
 *
 * Ahora se pinta DENTRO del recuadro con las mismas cuatro mitades que el cajón, y ninguna
 * sobra: el VELO, sin el cual un clic fuera cierra el menú Y funda una choza donde estaba el
 * dedo; `role="dialog"` con `aria-modal` y NOMBRE —que es el título de la pregunta—, sin el
 * cual un lector sigue leyendo el tablero de debajo; la TRAMPA DE FOCO, que es
 * `usarLaTrampaDeFoco`, la misma del cajón y no una copia; y el foco DE VUELTA al cerrar,
 * que lo hace `cerrarElMenu` porque adonde vuelve depende de quién abrió.
 *
 * ═══ Y EN EL RETABLO NO HAY RECUADRO, ASÍ QUE HAY UNA SEGUNDA COLOCACIÓN ═══
 *
 * Todo lo de arriba vale para el lienzo, donde el recuadro es la ventana entera. En la mesa
 * de cinco o de seis no hay lienzo y LA PÁGINA RUEDA: colocada sobre el flujo, la hoja de una
 * propuesta se quedaría centrada en un documento de mil puntos, o sea fuera de la pantalla en
 * cuanto alguien haya bajado a mirar el tablero. Eso es lo que hace `fijo`, que está contado
 * entero en su propio comentario unas líneas más abajo; lo que NO cambia con él es nada de lo
 * de arriba: el mismo velo, el mismo diálogo con nombre, la misma trampa y el mismo `Escape`.
 *
 * `alDejarlo` hace de cerrar en los tres caminos —el botón, el velo y `Escape`—, y eso es a
 * propósito: son la misma decisión dicha de tres maneras, y con tres funciones distintas la
 * que se olvidaría de devolver el foco sería la que menos se prueba.
 */
function ElijeUna({
  titulo,
  nota,
  opciones,
  quieto,
  fijo = false,
  alElegir,
  alDejarlo,
}: {
  titulo: string;
  /**
   * UN RENGLÓN EN TENUE BAJO EL TÍTULO, y hoy lo usa una sola pregunta: la hoja de una
   * propuesta de trueque, donde dice en qué anda —«la aceptó Ana», «no tienes 1 limo»—.
   *
   * Va aquí y no en el título porque el título es además el NOMBRE del diálogo, y meterle
   * el estado dentro haría que un lector anunciara «Ana te da 1 junco por 1 limo, la aceptó
   * Ana, diálogo» al abrirlo. Y va opcional porque las otras tres preguntas —a quién le
   * robas, qué dos bienes, comprar— no tienen estado ninguno que contar: un renglón vacío
   * ahí sería una caja de más en un modal que ya va justo de alto.
   */
  nota?: string;
  opciones: readonly Opcion[];
  quieto: boolean;
  /**
   * SOBRE LA VENTANA Y NO SOBRE EL RECUADRO, y hace falta porque hay DOS pantallas.
   *
   * En el lienzo, este menú se coloca dentro del recuadro (`position: absolute`) porque el
   * recuadro vale la ventana entera y debajo de él no hay nada. En el RETABLO no hay
   * recuadro y la página RUEDA: colocado sobre el flujo, la hoja de una propuesta se
   * quedaría centrada en un documento de mil puntos, o sea fuera de la pantalla en cuanto
   * alguien haya bajado a mirar el tablero. Con esto se coloca sobre la VENTANA, que es
   * donde está mirando quien acaba de tocar la tira.
   *
   * Y es un parámetro y no un componente aparte por lo mismo que la nota: lo que cambia es
   * DÓNDE se pinta, no qué es. Un quinto modal casi igual sería el sitio donde la trampa de
   * foco y el `Escape` se quedan a medias.
   */
  fijo?: boolean;
  alElegir: (o: Opcion) => void;
  alDejarlo: () => void;
}): JSX.Element {
  const caja = useRef<HTMLDivElement | null>(null);
  usarLaTrampaDeFoco(true, caja, alDejarlo);
  return (
    <>
      <div className={fijo ? `${EL_VELO} ${EL_VELO}-fijo` : EL_VELO} onClick={alDejarlo} aria-hidden="true" />
      <div
        ref={caja}
        className={fijo ? `formulario ${EL_MENU} ${EL_MENU}-fijo` : `formulario ${EL_MENU}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
      >
        <h2 className="rotulo-de-panel">{titulo}</h2>
        {nota === undefined ? null : <p className="riberas-elige-nota">{nota}</p>}
        <ul className="opciones">
          {opciones.map((o) => (
            <li key={o.id}>
              {/*
                ═══ `aria-disabled` Y NO `disabled`, Y DESDE QUE ESTO ES MODAL IMPORTA MÁS ═══

                Un `<button>` al que se le pone `disabled` TENIENDO EL FOCO lo pierde, y el foco
                cae al `<body>`. En una lista en flujo eso era molesto; dentro de un modal es
                escaparse de la trampa: el foco sale de la caja, tabular desde ahí lleva a la
                cabecera de la Sala y encima hay un diálogo opaco que ya no se puede cerrar con
                el teclado. Es el mismo razonamiento que `formulario.tsx` escribió para su lista,
                y aquí vale doble.

                `aria-disabled` lo cuenta igual de bien a un lector de pantalla, conserva el foco
                donde estaba, y quien ignora el clic es este `onClick`. La pinta de apagado la
                pone `.opcion-quieta`, que existe para apagar SIN `disabled`.
              */}
              <button
                type="button"
                className={quieto ? 'opcion opcion-quieta' : 'opcion'}
                aria-disabled={quieto}
                title={o.ayuda}
                onClick={() => {
                  if (quieto) return;
                  alElegir(o);
                }}
              >
                <span className="opcion-texto">
                  <span className="opcion-rotulo">{o.rotulo}</span>
                  {o.ayuda.length > 0 ? <span className="opcion-ayuda">{o.ayuda}</span> : null}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="opcion opcion-sobria" onClick={alDejarlo}>
              <span className="opcion-texto">
                <span className="opcion-rotulo">Dejarlo</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// El marcador, en el raíl
// ---------------------------------------------------------------------------

/**
 * EL MARCADOR DE LA MESA, y por qué es un panel del raíl y no una esquina del lienzo.
 *
 * Porque se mira CONSTANTEMENTE y sin dejar de jugar: cuántos puntos lleva cada cual, de
 * quién son los dos premios y cuántas cartas quedan por comprar son las cuatro cosas que
 * deciden si esta jugada vale la pena. Encima del lienzo taparía tablero justo mientras
 * se decide dónde construir; en el raíl vive al lado de los paneles que el juego ya
 * declara, con su misma forma —`.panel` y `.rotulo-de-panel`— y su mismo sitio.
 *
 * ═══ LO OCULTO SE DISTINGUE, Y ESO ES MEDIO JUEGO ═══
 *
 * Los títulos suman en secreto para su dueño (§1.6 del diseño). La vista te dice TUS
 * puntos con lo oculto dentro y a los demás sólo los públicos, así que en tu renglón hay
 * DOS números y en el de los demás uno. Se escriben aparte —«y N contándote lo oculto»— y
 * no sumados en el mismo sitio: con un solo número, el mismo renglón diría una cifra
 * distinta en cada pantalla y nadie podría hablar del marcador en voz alta. Es la misma
 * decisión que ya toma `panelesDe` en las reglas, y se toma igual aquí a propósito.
 *
 * Y sólo aparece el segundo número CUANDO ES DISTINTO: «3 ptos y 3 contándote lo oculto»
 * no informa de nada y se lee como si hubiera algo escondido.
 *
 * ═══ Y DESDE EL 5-SEP-2026, CUÁNTO MIDE LA CADENA DE CADA UNO ═══
 *
 * El renglón decía «El Vado Largo» a quien ya lo tenía y NADA a los demás, y ése era medio
 * fallo de Miguel: encadenó veredas, se quedó sin premio, y la pantalla no tenía una cifra
 * que le dijera por qué. Se lee «vado 3 de 5» —o «El Vado Largo, 6 veredas» cuando ya es
 * suyo—, y el 5 no está escrito aquí: viene en `vadoMinimo`, que es `VADO_MINIMO`.
 *
 * Sale para TODOS y no sólo para mí, aunque sea una cifra más por renglón, porque el juego
 * de este premio es la carrera: saber que el de al lado va por cuatro es lo que hace que
 * trazar la quinta corra prisa. Y es público — la vista se lo manda a todo el mundo.
 *
 * ═══ AQUÍ NO SE CUENTA NADA ═══
 *
 * Ni los puntos, ni quién tiene el Vado Largo, ni quién La Mayor Guardia, ni cuánto mide
 * ninguna cadena. Todo sale de `marcadorEnTres`, que lo lee de la vista. `null` cuando la
 * vista no es de Riberas, y entonces el raíl no pinta nada — que es lo correcto: un
 * marcador vacío se lee como «vais todos a cero».
 */
/** La mota del color del colono y el aire de la rejilla, en partes de la raíz (`estilo.css`). */
const MOTA_DEL_COLONO = 0.7;
const HUECO_DE_LA_REJILLA = 0.5;
/** El cuerpo de `.letra-chica`, que es con lo que se pinta el renglón de debajo de la ficha. */
const CUERPO_DE_LA_LETRA_CHICA = 0.9;

/**
 * LO QUE LE QUEDA AL RENGLÓN DE DEBAJO DE UNA FICHA, ya quitado el cromo de su renglón.
 *
 * La ficha vive en una rejilla de tres columnas —mota, ficha, puntos— y la del medio se lleva
 * lo que sobra, así que el hueco es el ancho de la lista menos la mota, los dos huecos de la
 * rejilla y la columna de los puntos. Los puntos se miden por sus CIFRAS y no por un ancho
 * fijo: «12+3» es el doble de ancho que «4», y en una mesa de seis eso son varias letras.
 *
 * Con la lista sin medir —el primer render, y Node, donde no hay `ResizeObserver`— devuelve
 * cero, y el renglón se pinta entero: es lo que había, y un hueco de cero puntos no puede
 * leerse como «no cabe nada».
 */
export function huecoDelRenglonDelColono(
  anchoDeLaLista: number,
  cifrasDeLosPuntos: number,
  raiz: number = RAIZ_DE_LA_CASA,
): number {
  if (anchoDeLaLista <= 0) return 0;
  const cromo = (MOTA_DEL_COLONO + 2 * HUECO_DE_LA_REJILLA) * raiz + cifrasDeLosPuntos * raiz * ANCHO_SOBRE_EL_CUERPO;
  return Math.max(0, anchoDeLaLista - cromo);
}

/** Las cifras que ocupa la columna de puntos de un colono, con el «+N» de lo oculto si lo hay. */
export function cifrasDeLosPuntos(c: ColonoEnElMarcador): number {
  const oculto = c.puntosConLoOculto !== null && c.puntosConLoOculto !== c.puntos;
  return String(c.puntos).length + (oculto ? 1 + String(c.puntosConLoOculto - c.puntos).length : 0);
}

/** Lo construido, que es lo que el §1.11 subió al contrato: las chozas y las torres. */
function loConstruido(c: ColonoEnElMarcador): string {
  return `${String(c.chozas)} ${c.chozas === 1 ? 'choza' : 'chozas'} · ${String(c.torres)} ${c.torres === 1 ? 'torre' : 'torres'}`;
}

/**
 * ═══ EL RENGLÓN DE DEBAJO, Y LO QUE SE SUELTA CUANDO NO CABE ES EL VADO ═══
 *
 * MEDIDO jugando, con la ventana en 852×922 y el cajón en 313 puntos: el renglón salía «vado 1
 * de 5 · 2 chozas · 0…» y lo que se perdía era SIEMPRE la cifra del final, o sea las TORRES —
 * justo el dato que la fase 0 subió al contrato del marcador—. Los puntos suspensivos de la
 * hoja recortan por donde el texto acaba, y el texto acaba en las torres.
 *
 * Así que cuando no cabe entero se suelta el trozo del VADO y se quedan las chozas y las
 * torres, y no al revés. No es una preferencia: el vado está ADEMÁS en su propio panel del
 * cajón —el que declara el juego— y en la frase que se oye, mientras que las torres, con el
 * marcador en el cajón, no están en ningún otro sitio de la pantalla.
 *
 * Y NO SE PARTE EN DOS LÍNEAS, que era la otra salida: la ficha vale `2.75rem` porque el §1.11
 * pide que SEIS quepan en el cajón, y un tercer renglón la sube a más de sesenta puntos. Seis
 * fichas de sesenta no caben, y entonces lo que se pierde no es una cifra: es un colono.
 */
export function elRenglonDelColonoQueCabe(
  c: ColonoEnElMarcador,
  marcador: MarcadorEnTres,
  hueco: number,
  raiz: number = RAIZ_DE_LA_CASA,
): string {
  const construido = loConstruido(c);
  const entero = `${renglonDelVado(c, marcador)} · ${construido}`;
  const anchoPorLetra = CUERPO_DE_LA_LETRA_CHICA * raiz * ANCHO_SOBRE_EL_CUERPO;
  if (hueco <= 0 || anchoPorLetra <= 0) return entero;
  return entero.length * anchoPorLetra <= hueco ? entero : construido;
}

/**
 * LA FICHA DE UN COLONO, DICHA ENTERA, para quien no la ve.
 *
 * ═══ POR QUÉ HACE FALTA UNA FRASE Y NO VALE EL RENGLÓN QUE SE PINTA ═══
 *
 * Desde que el marcador vive en el cajón, cada colono cabe en 44 puntos: dos renglones y
 * una cifra. Ahí no caben las cartas, las guardias, los dos premios ni los títulos —seis
 * fichas de cuatro renglones no entran en un cajón, y ése es el motivo del §1.11 para que
 * la ficha del cajón no sea la de antes—. Pero «no cabe en el renglón» no puede ser «no
 * está en la partida»: quien navega con lector no tiene otra puerta a esos cuatro datos.
 *
 * Así que se dice todo aquí, en una frase con verbos, y las cajas que se pintan van con
 * `aria-hidden` para que nada se oiga dos veces. El trozo del Vado Largo no se escribe:
 * lo escribe `loQueSeOyeDelVado`, en `shared/`, que es la MISMA frase que lee la app —tres
 * ramas, incluida la de llegar al mínimo y que el premio siga siendo de otro—.
 */
function loQueSeOyeDelColono(c: ColonoEnElMarcador, marcador: MarcadorEnTres): string {
  const oculto =
    c.puntosConLoOculto !== null && c.puntosConLoOculto !== c.puntos
      ? `, y ${String(c.puntosConLoOculto)} contándote lo oculto`
      : '';
  const trozos = [
    `${c.nombre}${c.soyYo ? ', tú' : ''}: ${String(c.puntos)} ${c.puntos === 1 ? 'pto' : 'ptos'} a la vista${oculto}.`,
    `${String(c.chozas)} ${c.chozas === 1 ? 'choza' : 'chozas'} y ${String(c.torres)} ${c.torres === 1 ? 'torre' : 'torres'}.`,
    `${String(c.cartas)} ${c.cartas === 1 ? 'carta' : 'cartas'} y ${String(c.guardias)} ${c.guardias === 1 ? 'guardia' : 'guardias'} ${c.guardias === 1 ? 'jugada' : 'jugadas'}.`,
    `${loQueSeOyeDelVado(c, marcador)}.`,
  ];
  if (c.tieneLaMayorGuardia) trozos.push('La Mayor Guardia es suya.');
  if (c.titulos.length > 0) trozos.push(`Títulos revelados: ${c.titulos.join(', ')}.`);
  return trozos.join(' ');
}

export function MarcadorDeRiberas({ vista }: { vista: unknown }): JSX.Element | null {
  /*
   * ═══ LA LISTA SE MIDE, Y ES LA ÚNICA MANERA DE SABER SI EL RENGLÓN CABE ═══
   *
   * El marcador no sabe cuánto mide el cajón: lo monta la Sala y llega al lienzo dentro de
   * `elRail`, ya compuesto. Y desde el §1.11 ese cajón vale lo que la cinta, que depende de la
   * ventana: con 852×922 vale 313 puntos, y ahí el renglón de debajo de la ficha no cabe. Así
   * que se mide LA LISTA, que es la caja de la que cuelgan las tres columnas, con el mismo
   * `ResizeObserver` con el que este cliente mide el recuadro y por el mismo motivo: un umbral
   * en puntos se equivoca en cuanto cambia la preferencia de tamaño de letra del navegador.
   *
   * Sin medida —el primer render, y Node— se pinta el renglón ENTERO, que es lo que había.
   */
  const [anchoDeLaLista, ponerAnchoDeLaLista] = useState(0);
  const [raizDeLaLetra, ponerRaizDeLaLetra] = useState(RAIZ_DE_LA_CASA);
  const elOjo = useRef<ResizeObserver | null>(null);
  const medirLaLista = useCallback((lista: HTMLUListElement | null) => {
    elOjo.current?.disconnect();
    elOjo.current = null;
    if (lista === null || typeof ResizeObserver === 'undefined') return;
    const mide = (): void => {
      ponerAnchoDeLaLista((antes) => (antes === lista.clientWidth ? antes : lista.clientWidth));
      ponerRaizDeLaLetra((antes) => {
        const ahora = raizDelNavegador();
        return antes === ahora ? antes : ahora;
      });
    };
    mide();
    const ojo = new ResizeObserver(mide);
    ojo.observe(lista);
    if (typeof document !== 'undefined') ojo.observe(document.documentElement);
    elOjo.current = ojo;
  }, []);
  useEffect(() => () => elOjo.current?.disconnect(), []);
  const marcador = marcadorEnTres(vista);
  if (marcador === null) return null;
  return (
    <section className="panel riberas-marcador">
      <h2 className="rotulo-de-panel">{TITULO_DEL_MARCADOR}</h2>
      <ul className="renglones" role="list" ref={medirLaLista}>
        {marcador.colonos.map((c) => {
          const oculto = c.puntosConLoOculto !== null && c.puntosConLoOculto !== c.puntos;
          return (
            <li key={c.asiento} className={c.soyYo ? 'colono-del-marcador soy-yo' : 'colono-del-marcador'}>
              <span className="mota-de-color" style={{ background: c.color }} aria-hidden="true" />
              <span className="ficha-del-colono" aria-hidden="true">
                <span className="nombre-del-colono">
                  {c.nombre}
                  {c.soyYo ? ' (tú)' : ''}
                </span>
                {/*
                  EL SEGUNDO RENGLÓN DE LA FICHA: cuánto mide su cadena y cuánto ha
                  construido, en ese orden y recortado con puntos suspensivos si no cabe
                  (§1.11: lo que se recorta es este renglón, nunca el nombre).

                  CUÁNTO MIDE LA CADENA VA SIEMPRE, y no sólo cuando ya ganó el premio. Es
                  la línea que le habría contestado a Miguel: encadenó cinco veredas, no le
                  salió el premio, y en toda la pantalla no había un número que dijera
                  cuánto contaba el JUEGO —que no era lo que él contaba en el tablero,
                  porque el vecino le cortaba el paso—. LA FRASE NO SE ESCRIBE AQUÍ: la
                  escribe `renglonDelVado`, en `shared/`, y tiene TRES ramas y no dos.

                  Y LAS CHOZAS Y LAS TORRES SON LAS DEL CONTRATO, contadas en
                  `marcadorEnTres` desde las listas de vértices de la vista. Los puentes no
                  se cuentan, como pidió Miguel.

                  Y CUANDO NO CABE ENTERO SE SUELTA EL VADO Y NO LAS TORRES, que es lo que
                  los puntos suspensivos se llevaban por delante con el cajón por debajo de
                  350 puntos: ver `elRenglonDelColonoQueCabe`, que lo mide con la letra de
                  verdad de este navegador.
                */}
                <span className="letra-chica lo-del-colono">
                  {elRenglonDelColonoQueCabe(
                    c,
                    marcador,
                    huecoDelRenglonDelColono(anchoDeLaLista, cifrasDeLosPuntos(c), raizDeLaLetra),
                    raizDeLaLetra,
                  )}
                </span>
              </span>
              {/*
                LOS PUNTOS A LA DERECHA, y el «+N» de lo oculto SÓLO EN EL MÍO y sólo cuando
                es distinto. Es la cifra pública en grande y lo que sólo yo cuento en tenue
                al lado: sumarlos en un número haría que el mismo renglón dijera una cosa
                distinta en cada pantalla y nadie podría hablar del marcador en voz alta.
                La frase entera —«y N contándote lo oculto»— va en lo que se oye.
              */}
              <span className="puntos-del-colono" aria-hidden="true">
                {c.puntos}
                {oculto ? (
                  <span className="puntos-ocultos">+{(c.puntosConLoOculto ?? c.puntos) - c.puntos}</span>
                ) : null}
              </span>
              {/*
                ═══ Y LO QUE SE OYE ES LA FICHA ENTERA, NO EL RENGLÓN RECORTADO ═══

                Un lector de pantalla no ve un renglón corto al lado de un nombre: lee una
                fila detrás de otra, y «vado 5 · 3 chozas · 1 torre» son cinco datos sin un
                solo verbo. La ficha de 44 puntos deja fuera de la VISTA las cartas, las
                guardias, los dos premios y los títulos —no caben seis veces en un cajón—,
                pero no los deja fuera de la partida: van todos aquí, en la misma frase que
                lee la app, más las chozas y las torres (§1.11).

                Va con `aria-hidden` en las tres cajas de arriba y el texto entero aquí, y
                no al revés, para que no se oiga dos veces lo mismo.
              */}
              <span className="riberas-solo-apoyo">{loQueSeOyeDelColono(c, marcador)}</span>
            </li>
          );
        })}
      </ul>
      {/*
        CUÁNTAS QUEDAN, que es información pública del juego y parte de lo que se juega:
        un mazo que se puede contar deja saber que ya no puede salir un título (§1.3).
      */}
      <p className="letra-chica queda-mazo">
        {marcador.mazo === 0
          ? 'No queda ninguna carta en el mazo.'
          : `Quedan ${marcador.mazo} ${marcador.mazo === 1 ? 'carta' : 'cartas'} en el mazo.`}
      </p>
    </section>
  );
}
