/**
 * QUÉ SABE PINTAR ESTE CLIENTE, Y QUÉ NO — dicho antes de pintar nada.
 *
 * ═══ ESTE FICHERO ES EL ÚNICO SITIO DONDE SE DECIDE SI ALGO SE PUEDE JUGAR ═══
 *
 * El §7 del diseño reparte el trabajo de pintar en dos montones y la línea que
 * los separa no es de esfuerzo, es de quién tiene el pincel:
 *
 *   · Los muebles GENÉRICOS —`formulario` y `tablero`— los pinta LA PLATAFORMA
 *     a partir de datos que el juego declara: las `opciones()` del §5 bis y el
 *     `TableroDeclarado` que viaja dentro de la proyección. La plataforma no
 *     sabe a qué se juega, y por eso puede pintar un arcade que no existía
 *     cuando se compiló este binario. Es lo que hace que valga la pena.
 *   · Los muebles PROPIOS —`lienzo` y `escena`— los pinta el juego con sus
 *     propios píxeles: Skia sobre la GPU y tres dimensiones. Ese código vive
 *     dentro del binario de la app y cuesta publicación. Escribirlo aquí otra
 *     vez sería escribir El Arcade dos veces, y la segunda copia empezaría a
 *     divergir de la primera el mismo día.
 *
 * Así que este cliente entrega los dos genéricos y NO entrega los dos propios.
 * Lo que no se puede hacer es esconderlo. La doctrina de la portada de la app
 * —«nada de lo que se enseña es mentira»— vale aquí igual y con más motivo,
 * porque aquí el catálogo lo escribe el servidor y puede traer mañana un arcade
 * que nadie de esta casa ha visto: un arcade que no se puede jugar en el PC
 * tiene que salir en la lista DICIENDO POR QUÉ —y dónde se juega, cuando de
 * verdad se juega en otro sitio—, ni desaparecer de ella ni dar un error al
 * pulsarlo.
 *
 * ═══ Y HAY UNA SEGUNDA RAZÓN PARA NO PODER JUGAR, QUE NO ES EL MUEBLE ═══
 *
 * `sede` es el otro eje del manifiesto: dice QUIÉN ejecuta el reductor. Con
 * `sede: 'servidor'` hay mesa, código de cinco letras y `POST
 * /api/arcade/mesas`; con `sede: 'dispositivo'` el reductor corre dentro del
 * aparato y EN EL SERVIDOR NO HAY NINGUNA MESA QUE ABRIR — `abrir()` contesta
 * `ArcadeSinMesa` con un 409. O sea que ofrecer «jugar» a un arcade de
 * dispositivo sería precisamente el botón que da error al pulsarlo.
 *
 * Se podría llevar su reductor al navegador —es puro y está en `shared/`, y
 * ejecutarlo aquí no rompería nada—, pero eso es una segunda sede de ejecución
 * con su propio reloj, su propio azar y su propia partida que no se comparte
 * con nadie, y no es lo que se ha pedido. Se dice y se deja fuera.
 *
 * ═══ Y UNA TERCERA, QUE ES LA QUE COSTÓ UNA MESA MUERTA ═══
 *
 * Las dos de arriba se contestan con el manifiesto y ninguna de las dos basta.
 * Falta la pregunta que la app aprendió antes que nosotros y que dejó escrita en
 * `app/src/arcade/pintados.ts`: saber pintar el MUEBLE no es saber pintar el
 * JUEGO. Allí lo cuenta con este mismo caso —«La Ronda» declara
 * `mueble: 'formulario'`, que sí se sabe pintar, así que salía con tarjeta
 * pulsable y al tocarla no había nada— y la conclusión es que hacen falta las
 * DOS mitades: que haya pincel para el mueble Y que haya CON QUÉ.
 *
 * Este cliente reprodujo la primera mitad y se dejó la segunda, y aquí duele más
 * que allí: la app solo enseñaba una pantalla vacía, y aquí quien pulsa abre una
 * mesa DE VERDAD en el servidor, se sienta, la mesa se persiste y el código de
 * cinco letras ya está en un chat con tres personas. La mentira no se deshace
 * volviendo atrás.
 *
 * La segunda mitad se contesta distinto según el mueble, y la diferencia no es
 * un matiz:
 *
 *   · `tablero` PROMETE un dibujo resuelto dentro de la proyección, y esa
 *     proyección no existe hasta que hay mesa y partida. Aquí no se puede
 *     comprobar antes y no se puede exigir: se acepta la declaración. Si además
 *     el juego no resuelve dibujo pero sí publica opciones, `queSePinta` cae al
 *     formulario y se juega igual — que es exactamente lo que hace «El Vado».
 *   · `formulario` no promete NADA por sí solo. Ese mueble ES la lista de
 *     `opciones()`, y `opciones()` es opcional en el alta a propósito (lo razona
 *     `shared/arcade/opciones.ts`: media docena de juegos pintan su propia
 *     pantalla y no la necesitan). Un `formulario` sin `opciones()` registradas
 *     no es «todavía no»: es «nunca», porque no hay ninguna revisión de ninguna
 *     partida en la que aparezca un botón.
 *
 * Y esa segunda pregunta NO se puede contestar desde aquí: el registro de
 * arcades vive en el servidor, y con `ARCADES_EXTERNOS` puede vivir SOLO allí.
 * Por eso la contesta quien puede —`GET /api/arcade` publica `publicaOpciones`,
 * sacado del `hayOpciones()` que el contrato ya tenía— y aquí se lee. Que la
 * respuesta venga del servidor es lo mismo que ya pasa con el catálogo entero, y
 * por el mismo motivo: es el único proceso que sabe la verdad.
 *
 * ═══ POR QUÉ ESTO ES UN MÓDULO SIN REACT ═══
 *
 * Porque es lo único de todo el cliente que puede MENTIR, y una mentira sobre
 * qué se puede jugar no da error: sale bonita en pantalla. Un dato con una
 * función pura encima se puede llamar desde un comprobador de Node con los
 * manifiestos de verdad, y eso es `scripts/verificar-escritorio.tsx`.
 */
import { necesitaMesa } from '../../shared/arcade';
import type { ManifiestoDeArcade, MuebleDeArcade } from '../../shared/arcade';
/*
 * `MUEBLES_DEL_CONTRATO` no está re-exportada por `shared/arcade/index.ts`, así
 * que se coge del fichero donde vive. Añadirla al índice habría sido tocar el
 * contrato, y el contrato no se toca por una comodidad de importación: la
 * medida de esta tarea es justamente cuánto hay que moverlo, y la respuesta
 * tiene que poder ser «nada».
 */
import { MUEBLES_DEL_CONTRATO } from '../../shared/arcade/tipos';

/** Los cuatro del §7, y quién tiene el pincel de cada uno. */
export interface Mueble {
  /**
   * `la-plataforma` significa que este cliente lo pinta a partir de datos
   * declarados; `el-juego`, que los píxeles son suyos y viven en su binario.
   */
  quienPinta: 'la-plataforma' | 'el-juego';
  /** Qué es, en una línea, para quien lee la tarjeta y no ha leído el §7. */
  loQueEs: string;
}

export const MUEBLES: Record<MuebleDeArcade, Mueble> = {
  formulario: {
    quienPinta: 'la-plataforma',
    loQueEs:
      'Botones y listas. La plataforma pregunta al juego qué se puede hacer ahora y pinta ' +
      'exactamente eso, sin saber a qué se juega.',
  },
  tablero: {
    quienPinta: 'la-plataforma',
    loQueEs:
      'Una topología declarada, pintada con SVG. Nudos, líneas y piezas, cada una con el ' +
      'movimiento escrito dentro. El tablero es dato, no reductor.',
  },
  lienzo: {
    quienPinta: 'el-juego',
    loQueEs: 'Dos dimensiones a ritmo de fotograma, dibujadas por el propio juego sobre la GPU.',
  },
  escena: {
    quienPinta: 'el-juego',
    loQueEs: 'Tres dimensiones, a través del lienzo común de la app.',
  },
};

/**
 * UN ARCADE TAL COMO LO PUBLICA EL CATÁLOGO DEL SERVIDOR.
 *
 * Es el manifiesto más lo único que el manifiesto no puede decir. Se escribe
 * aquí y no se pide al contrato porque no es contrato: es la forma de una
 * respuesta HTTP, y lo que cruza el cable lo declaran los dos extremos.
 *
 * `publicaOpciones` es OPCIONAL, y esa marca de interrogación es media
 * corrección: un empaquetado de este cliente puede estar hablando con un
 * servidor anterior al día en que se publicó el campo, y un campo que falta no
 * puede ser un fallo. `undefined` no es `false` —no es «no publica», es «este
 * servidor no lo ha dicho»— y se contesta distinto.
 */
export type ArcadeDelCatalogo = ManifiestoDeArcade & {
  /** ¿Registró este arcade `opciones()`? Lo contesta `hayOpciones()` en el servidor. */
  publicaOpciones?: boolean;
};

/**
 * DÓNDE SE JUEGA ESTE ARCADE.
 *
 * El `porque` no es un mensaje de error: es el renglón que sale EN LA TARJETA,
 * en la lista, antes de que nadie pulse nada. Por eso está escrito para quien
 * juega y no para quien programa.
 *
 * `razon` no es para la pantalla: es para que el comprobador pueda exigir que
 * cada negativa diga LA SUYA. Con un solo `porque` de texto libre, la única
 * regla que se puede comprobar es «que diga algo», y con eso pasó en verde
 * durante 118 comprobaciones una tarjeta que llevaba a una mesa muerta.
 */
export type DondeSeJuega =
  | { aqui: true }
  | {
      aqui: false;
      /**
       * Las tres negativas, y son tres cosas distintas que NO se pueden decir
       * con la misma frase:
       *
       *   · `en-la-app` — aquí no hay pincel para eso, y allí sí. Es la única de
       *     las tres que puede mandar a alguien a otro sitio con la verdad.
       *   · `no-publica-nada` — el arcade no publica nada que pintar, y por
       *     tanto tampoco se juega en la app: mandar allí a quien lo lea sería
       *     cambiar una mentira por otra.
       *   · `el-servidor-no-lo-dice` — este servidor es más viejo que este
       *     empaquetado y no contesta a la pregunta. No se sabe, y no saber se
       *     dice: prometer sobre lo que no se sabe es de donde salen las mesas
       *     muertas.
       */
      razon: 'en-la-app' | 'no-publica-nada' | 'el-servidor-no-lo-dice';
      porque: string;
    };

export function dondeSeJuega(arcade: ArcadeDelCatalogo): DondeSeJuega {
  const manifiesto = arcade;
  const mueble = MUEBLES[manifiesto.mueble] as Mueble | undefined;

  /*
   * UN MUEBLE QUE ESTE CLIENTE NO CONOCE. Hoy no puede pasar —el alta rechaza
   * un manifiesto con un mueble que no esté en el contrato— pero el catálogo lo
   * escribe el servidor, y un servidor más nuevo que este empaquetado es
   * exactamente la situación que va a existir en cuanto haya despliegues
   * parciales. La respuesta honrada es decir que aquí no se sabe pintar, no
   * romper la lista entera ni fingir que sí.
   */
  if (mueble === undefined) {
    return {
      aqui: false,
      razon: 'en-la-app',
      porque:
        `Se juega en la app: este cliente de escritorio no conoce el mueble «${String(manifiesto.mueble)}».`,
    };
  }

  if (mueble.quienPinta === 'el-juego') {
    return {
      aqui: false,
      razon: 'en-la-app',
      porque: 'Se juega en la app: sus píxeles los dibuja el propio juego y viven en su binario.',
    };
  }

  if (!necesitaMesa(manifiesto)) {
    return {
      aqui: false,
      razon: 'en-la-app',
      porque:
        'Se juega en la app: la partida corre dentro del aparato, así que en el servidor no hay ' +
        'ninguna mesa a la que sentarse.',
    };
  }

  /*
   * ═══ Y LA TERCERA PREGUNTA: ¿HAY CON QUÉ? ═══
   *
   * Hasta aquí se ha comprobado que hay PINCEL. Falta que haya PINTURA, y para
   * un mueble genérico la pintura es dato declarado por el juego. Está razonado
   * entero en la cabecera; en corto:
   *
   *   · `tablero` declara que resuelve un dibujo dentro de su proyección, y esa
   *     proyección no existe hasta que hay partida. No se puede comprobar antes,
   *     así que se le cree — y si además no lo resuelve pero publica opciones,
   *     `queSePinta` cae al formulario y se juega igual («El Vado»).
   *   · cualquier otro mueble genérico —hoy `formulario`— no promete nada por sí
   *     solo: es la lista de `opciones()` y punto. Sin `opciones()` registradas
   *     no hay ninguna partida, en ninguna revisión, en la que salga un botón.
   *
   * La comprobación va DESPUÉS de las tres de arriba a propósito: a un arcade de
   * dispositivo la pregunta ni siquiera se le hace, porque su respuesta ya está
   * dada y es otra. El orden de las negativas es el orden en que dejan de ser
   * ciertas las promesas, y decir la última cuando vale la primera desorienta.
   */
  if (manifiesto.mueble !== 'tablero') {
    if (arcade.publicaOpciones === false) {
      return {
        aqui: false,
        razon: 'no-publica-nada',
        porque:
          'Hoy no se puede jugar en ningún sitio: este arcade usa un mueble que se pinta con la ' +
          'lista de lo que se puede hacer, y no publica ninguna. No es que falte esta pantalla, ' +
          'es que no hay nada que enseñar hasta que el juego la publique.',
      };
    }
    if (arcade.publicaOpciones === undefined) {
      return {
        aqui: false,
        razon: 'el-servidor-no-lo-dice',
        /*
         * Y NO SE DICE «se juega en la app». Es la salida cómoda y sería otra
         * mentira: desde aquí no se sabe si la app lleva dentro la pantalla de
         * este juego —de hecho hay uno de los de casa que tampoco, y es el que
         * destapó todo esto—. Lo único que se sabe es lo que dice esta frase.
         */
        porque:
          'No se puede ofrecer aquí: este servidor no dice si este arcade publica la lista de lo ' +
          'que se puede hacer, y sin ella su mesa se abriría vacía. Si lo tienes en la app, ' +
          'pruébalo allí.',
      };
    }
  }

  return { aqui: true };
}

/**
 * ¿ESTÁN LOS CUATRO MUEBLES DEL CONTRATO EN LA TABLA DE ARRIBA?
 *
 * Existe para que el día que el contrato estrene un quinto mueble esto se ponga
 * ROJO en vez de que el arcade que lo estrene desaparezca del catálogo sin que
 * nadie se entere. Un hueco en un `Record` no da error de tipos en tiempo de
 * ejecución: da `undefined`, y `undefined` en una lista es una tarjeta que no
 * sale.
 *
 * Devuelve los que faltan para que el comprobador pueda decir cuáles.
 */
export function mueblesSinDeclarar(): string[] {
  return MUEBLES_DEL_CONTRATO.filter((m) => MUEBLES[m] === undefined);
}
