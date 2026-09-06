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
import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Delta, encuadreDelDelta } from '../../escenas/delta';
import { catalogoDeModelos, unirCatalogos } from '../../escenas/modelos';
import type { CatalogoDeModelos } from '../../escenas/modelos';
import { rutaDeLosDados, rutaDelTablero } from '../../escenas/ruta-de-modelos';
import type { Opcion } from '../../shared/arcade';
import {
  barraEnTres,
  bienesQueSeCambianPor,
  colocandoEnTres,
  comprarEnTres,
  dadosEnTres,
  jugadasDeLaCarta,
  laManoDeLaIzquierda,
  jugadaSinPreguntar,
  manoEnTres,
  marcadorEnTres,
  mazoEnLaBarra,
  meToca,
  opcionesFueraDeLaBarra,
  opcionesFueraDeLaMano,
  opcionesFueraDeLaMesa,
  opcionesFueraDelTablero,
  renglonDelVado,
  revelarDe,
  seVeEnTres,
  tableroEnTres,
  tirarEnTres,
  truequesPosibles,
  turnoEnTres,
} from '../../shared/arcade/juegos/riberas-en-tres';
import type {
  CartaDelMazoEnTres,
  ClaseDeJugada,
  DadosEnTres,
  ExplicacionDeLaCarta,
  IdDeLaBarra,
  TableroEnTres,
} from '../../shared/arcade/juegos/riberas-en-tres';
/* El sitio de los dados se decide con la misma función que la escena: ver `haySitioParaLosDados`. */
import { ASA_DEL_HUECO, huecosDeLaMesa, loQueSeVe } from '../../escenas/barra';
/* Y el del cartel, con las manos de verdad y no con números copiados: ver `elCartelQueCabe`. */
import { franjaDeLasCartas, loQueSeVeEnLasCartas } from '../../escenas/cartas';
import { huecosDeLaBaraja, loQueSeVeEnLaBaraja } from '../../escenas/baraja';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import type { TableroDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { Formulario } from './formulario';
import type { LaMesa, MesaVista, ResultadoDelMovimiento } from './mesa';
import type { ArcadeDelCatalogo } from './muebles';
import { opcionesSueltas } from './plan';
import { loQueSeDiceDeUnFallo } from './red-de-seguridad';
import { AccionesDelTablero, Retablo } from './retablo';

/**
 * De dónde se trae el tablero: la única ruta, la de `escenas/ruta-de-modelos.ts`, que
 * es la que sirve `server/src/routes/modelos.ts`. Relativa: en desarrollo la reenvía el
 * proxy de Vite y en producción es el mismo Node que sirve esta página.
 */
const RUTA_DEL_TABLERO = rutaDelTablero();
/** Y los dados, en su fichero de unos kB, por la misma puerta. Ver `rutaDeLosDados`. */
const RUTA_DE_LOS_DADOS = rutaDeLosDados();

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
const RAIZ_DE_LA_CASA = 17;
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
 * Medido con las manos de verdad en los dieciséis lienzos de `LIENZOS` (`verify:escritorio`).
 *
 * ═══ Y CUÁL ES EL PEOR LIENZO DE ESTE CLIENTE, QUE NO ES EL PEOR DE LA LISTA ═══
 *
 * La lista se comparte con el móvil y por eso empieza por 320×360, donde caben DOS frases:
 * el renglón da 25 letras, cada frase ocupa dos y hay cinco renglones para seis. PERO ESE
 * LIENZO AQUÍ NO SE PUEDE DAR. `.riberas-lienzo` lleva `min-height: 420px`, así que los
 * cinco lienzos bajos de la lista (320×360 y los cuatro apaisados de menos de 420 de alto,
 * entre ellos el 844×390, que se había colado en la cuenta anterior) no existen en el
 * escritorio. La forma que sí se da y que la lista no tenía es la contraria: ESTRECHA Y ALTA.
 *
 * El peor de este cliente es 288×420, y sale de sumas y no de una corazonada: WCAG 1.4.10
 * pone el suelo del documento en 320 puntos (lo dice el punto 1 de la cabecera de
 * `estilo.css`, que ya arregló la rejilla por eso), `.dentro` se lleva `clamp(1rem, 4vw,
 * 2.5rem)` por lado, a 320 manda el mínimo de 17 puntos, y el recuadro es el 100 % de lo que
 * queda, o sea 286; se mide con 288 por dejar el margen del lado seguro. De alto, los 420
 * del `min-height`, que es el suelo. Ahí el renglón cabe 20 letras y hay 7 renglones, así
 * que las frases de dos renglones pasan a tres y se pintan DOS. En los otros diez que este
 * cliente sí puede dar caben las tres.
 *
 * Esos dos números —cinco bajos y diez con las tres— NO se escriben a mano: `verify:escritorio`
 * los saca de `LIENZOS` y del `min-height` de la hoja y exige que esta cabecera los diga con
 * esas mismas palabras. Ya se desfasaron una vez, y una cuenta escrita para que el siguiente
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
 * ═══ DOS COSAS QUE TODAVÍA NO EXISTEN Y QUE LE COMEN LA BANDA POR ARRIBA ═══
 *
 * Quien las escriba tiene que hacerlas convivir con esto, y por eso quedan dichas aquí con
 * su número y no en un documento:
 *
 *   · LA CINTA DEL TERCIO CENTRAL (fase 5 de `docs/LA-MESA-DE-RIBERAS.md`, §2.2): el
 *     renglón del aviso son 44 puntos y la línea de botones otros 44, «la suma máxima es
 *     por tanto 88». Hoy no hay ninguna dentro del recuadro —el aviso del tablero se pinta
 *     ENCIMA de él, no dentro—, así que el alto libre llega hasta el techo del lienzo. El
 *     día que la cinta baje, se le resta al alto libre ANTES de partirlo por la mitad, y lo
 *     que pasa está medido: en 320×360 se queda en UNA frase y en el SE apaisado en dos.
 *     Los otros trece no pierden nada.
 *   · EL PREGÓN DEL TRUEQUE (`docs/EL-TRUEQUE-DE-RIBERAS.md`), que cuelga de esa misma
 *     cinta hasta cuatro tiras de 44. La regla que aquel diseño y éste comparten es de
 *     EXCLUSIÓN y no de reparto: con el pregón abierto el cartel NO se pinta. **No está
 *     escrita, y es a propósito**: el pregón no existe todavía en este árbol, y una
 *     condición sobre un estado que nadie crea es una condición que ningún comprobador
 *     puede poner roja —se quedaría de adorno hasta que alguien la borrara por muerta—.
 *     Los números para quien la escriba: con la cinta a 88 y las cuatro propuestas
 *     colgando, al cartel le quedan −24 puntos de banda en el SE apaisado y 8 en 320×360,
 *     y necesita 43 de caja para existir. No es que quepa apretado: no queda banda.
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
): CartelAlPie | null {
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
  const { piezas } = huecosDeLaMesa(cuantosHuecos, CAMPO_DE_LA_CAMARA, proporcion, lienzo.alto);
  const hueco = piezas[0];
  const vistoEnLaBarra = loQueSeVe(CAMPO_DE_LA_CAMARA, proporcion);
  const techoDelAsa =
    hueco === undefined
      ? lienzo.alto
      : ((vistoEnLaBarra.alto / 2 - (hueco.y + (hueco.lado / 2) * ASA_DEL_HUECO.alto)) / vistoEnLaBarra.alto) *
        lienzo.alto;

  const banda = derechaEnPuntos - izquierda;
  const letrasPorLinea = Math.floor((banda - 2 * MARGEN_DEL_CARTEL) / anchoPorLetra);
  /*
   * EL ALTO LIBRE va del techo del recuadro al techo del asa menos el aire, y LA CAJA es su
   * mitad: un cartel que se comiera toda la banda taparía media pantalla de tablero justo
   * en el lienzo donde menos tablero hay.
   */
  const altoLibre = techoDelAsa - AIRE_SOBRE_EL_ASA;
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
 */
const LO_QUE_SE_PREGUNTA: Readonly<Record<ClaseDeJugada, string>> = {
  guardia: 'A quién le quitas un bien',
  anobueno: 'Qué dos bienes coges',
  acaparamiento: 'Qué bien pides',
  dosveredas: 'Cómo la juegas',
};

/** El título del menú de siempre: a quién se le propone un trueque. */
const A_QUIEN_SE_LO_PROPONES = 'A quién se lo propones';

/**
 * EL TÍTULO DEL MENÚ DE COMPRAR. Encabezado de la Sala, como los otros dos: lo que CUESTA
 * y cuántas quedan no se escribe aquí —llega en el rótulo y en la ayuda de la opción, que
 * las redacta el juego—, y por eso esta línea no nombra ni un bien.
 */
const COMPRAR_UNA_CARTA = 'Comprar una carta';

/** El rótulo del panel del marcador en el raíl. Chrome de la Sala, no una palabra del juego. */
const TITULO_DEL_MARCADOR = 'El marcador';

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
function recordada(traer: () => Promise<CatalogoDeModelos>): () => Promise<CatalogoDeModelos> {
  let enCamino: Promise<CatalogoDeModelos> | null = null;
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
      e.preventDefault();
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

export function RiberasEnTres({ manifiesto, mesa, puesta, tablero, opciones }: LoQueVeRiberas): JSX.Element {
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
  const fueraDeLaBarra = useMemo(
    () => opcionesFueraDeLaBarra(opcionesFueraDeLaMano(opcionesFueraDelTablero(opciones)), mesaRecogida ? null : mazo),
    [opciones, mazo, mesaRecogida],
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
  }, []);
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
  const cartel = useMemo((): CartelAlPie | null => {
    if (naipeExplicado === null) return null;
    const cuantos = mesaRecogida ? 0 : barra.length + (mazo === null ? 0 : 1);
    return elCartelQueCabe(lienzo, cuantos, naipeExplicado.explicacion, raizDeLaLetra);
  }, [naipeExplicado, lienzo, barra.length, mazo, mesaRecogida, raizDeLaLetra]);
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
  const fuera = useMemo(
    () => opcionesFueraDeLaMesa(fueraDeLaBarra, mesaRecogida ? null : dados),
    [fueraDeLaBarra, dados, mesaRecogida],
  );
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
   * se pregunta. Riberas exige destinatario y este cliente no lo elige por nadie.
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
    const sueltas = opcionesSueltas(tablero, opciones);
    return (
      <>
        <p className="letra-chica riberas-sin-mundo">{porQueElRetablo}</p>
        <Retablo tablero={tablero} alTocar={mover} quieto={quieto} />
        <AccionesDelTablero tablero={tablero} alTocar={mover} quieto={quieto} />
        {sueltas.length > 0 ? (
          <Formulario opciones={sueltas} alElegir={mover} quieto={quieto} titulo="Y además puedes" />
        ) : null}
      </>
    );
  }

  const conMundo = typeof window !== 'undefined' && modelos !== null;
  const alcance = encuadre.alcance;

  return (
    <div className="riberas-en-tres">
      {/*
        El aviso del tablero es del JUEGO —«te toca fundar», «espera a que tire
        otro»— y viaja en el tablero declarado igual que antes. En el retablo lo
        pinta el propio retablo; aquí, que no hay retablo, se pinta encima del
        lienzo en el mismo sitio y con la misma letra. Perderlo sería perder la
        única frase que dice en qué momento está la partida.
      */}
      {tablero.aviso.length > 0 ? <p className="aviso-del-tablero">{tablero.aviso}</p> : null}

      {/* La clase sale de la constante porque la cámara BUSCA este recuadro por ella: ver `RECUADRO_DEL_LIENZO`. */}
      <div
        className={quieto ? `${RECUADRO_DEL_LIENZO} riberas-lienzo-quieto` : RECUADRO_DEL_LIENZO}
        ref={medirElRecuadro}
      >
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
                  mesaRecogida={mesaRecogida}
                  mano={mano}
                  cogida={cogida}
                  onCogerCarta={alCogerCarta}
                  seCambianPor={seCambianPor}
                  onProponerTrueque={alProponerTrueque}
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
      </div>

      {preguntando !== null ? (
        <ElijeUna
          titulo={preguntando.titulo}
          opciones={preguntando.opciones}
          quieto={quieto}
          alElegir={(o) => {
            ponerPreguntando(null);
            mover({ tipo: o.tipo, carga: o.carga });
          }}
          alDejarlo={() => {
            ponerPreguntando(null);
          }}
        />
      ) : null}

      {/*
        Y debajo, lo que el tablero NO enseña ya: tirar, pasar, aceptar, rechazar,
        empezar. Fundar y alzar los ofrece la barra con sus anillos; ofrecer un
        trueque lo ofrece la mano; COMPRAR lo ofrece el cuarto hueco de la barra.
        Cada movimiento se enseña exactamente una vez.

        Se calla SÓLO si el tablero está enseñando algo y aquí no queda nada: con
        una barra encendida, «no hay nada que puedas hacer» sería mentira. Y si el
        juego no ofrece nada de nada —le toca a otro— sí se dice, porque entonces es
        verdad y es lo único que explica por qué la barra está apagada.
      */}
      {fuera.length > 0 || opciones.length === 0 ? (
        <Formulario opciones={fuera} alElegir={mover} quieto={quieto} titulo={TITULO_DE_LO_QUE_SE_HACE} />
      ) : null}
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
 */
function ElijeUna({
  titulo,
  opciones,
  quieto,
  alElegir,
  alDejarlo,
}: {
  titulo: string;
  opciones: readonly Opcion[];
  quieto: boolean;
  alElegir: (o: Opcion) => void;
  alDejarlo: () => void;
}): JSX.Element {
  return (
    <div className="formulario riberas-elige">
      <h2 className="rotulo-de-panel">{titulo}</h2>
      <ul className="opciones">
        {opciones.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              className="opcion"
              disabled={quieto}
              title={o.ayuda}
              onClick={() => {
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
export function MarcadorDeRiberas({ vista }: { vista: unknown }): JSX.Element | null {
  const marcador = marcadorEnTres(vista);
  if (marcador === null) return null;
  return (
    <section className="panel riberas-marcador">
      <h2 className="rotulo-de-panel">{TITULO_DEL_MARCADOR}</h2>
      <ul className="renglones" role="list">
        {marcador.colonos.map((c) => {
          const oculto = c.puntosConLoOculto !== null && c.puntosConLoOculto !== c.puntos;
          return (
            <li key={c.asiento} className={c.soyYo ? 'colono-del-marcador soy-yo' : 'colono-del-marcador'}>
              <span className="mota-de-color" style={{ background: c.color }} aria-hidden="true" />
              <span className="nombre-del-colono">
                {c.nombre}
                {c.soyYo ? ' (tú)' : ''}
              </span>
              <span className="puntos-del-colono">
                {c.puntos} {c.puntos === 1 ? 'pto' : 'ptos'}
                {oculto ? (
                  <span className="puntos-ocultos">
                    {' '}
                    y {c.puntosConLoOculto} contándote lo oculto
                  </span>
                ) : null}
              </span>
              <span className="letra-chica lo-del-colono">
                {c.cartas} {c.cartas === 1 ? 'carta' : 'cartas'} · {c.guardias}{' '}
                {c.guardias === 1 ? 'guardia' : 'guardias'}
                {/*
                  CUÁNTO MIDE SU CADENA, SIEMPRE, Y NO SÓLO CUANDO YA GANÓ EL PREMIO.
                  Es la línea que le habría contestado a Miguel: encadenó cinco veredas,
                  no le salió el premio, y en toda la pantalla no había un número que
                  dijera cuánto contaba el JUEGO —que no era lo que él contaba en el
                  tablero, porque el vecino le cortaba el paso—.

                  LA FRASE NO SE ESCRIBE AQUÍ: la escribe `renglonDelVado`, en `shared/`,
                  y tiene TRES ramas y no dos. La primera versión de este renglón decía
                  «vado cinco de cinco» al segundo que llegaba a cinco —cadena de cinco, cero
                  puntos de premio, porque el premio sólo se mueve a quien SUPERA— y eso
                  se lee como «ya está». La app pinta y lee en voz alta la misma frase, y
                  el cinco sigue siendo `vadoMinimo`: es `VADO_MINIMO`, la regla.
                */}
                {' · '}
                {renglonDelVado(c, marcador)}
                {c.tieneLaMayorGuardia ? ' · La Mayor Guardia' : ''}
                {c.titulos.length > 0 ? ` · ${c.titulos.join(', ')}` : ''}
              </span>
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
