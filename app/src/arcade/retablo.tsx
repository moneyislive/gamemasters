/**
 * EL RETABLO: pinta un tablero declarado y no sabe a qué se juega.
 *
 * ═══ QUÉ HACE ESTE FICHERO, DICHO POR LO QUE NO HACE ═══
 *
 * No sabe qué es un hexágono, ni una choza, ni una vereda, ni un bien, ni un
 * turno. Recibe un `TableroDeclarado` —cuatro listas de figuras con sus puntos,
 * sus colores y el movimiento que manda cada una— y lo dibuja. Si mañana entra un
 * segundo juego de tablero, entra sin tocar una línea de aquí.
 *
 * Ésa es la diferencia entre un mueble GENÉRICO y una pantalla. El §7 del diseño
 * la pone como condición: los muebles genéricos «son los únicos que un arcade de
 * FUERA puede usar», y un arcade de fuera no puede mandar código al móvil. Si el
 * dibujo se compusiera aquí a partir del estado del juego, «genérico» querría
 * decir «genérico para los juegos que ya están dentro del binario», que es
 * exactamente el error que este motor entero existe para no repetir.
 *
 * ═══ POR QUÉ SE LLAMA RETABLO ═══
 *
 * Porque `Tablero` ya está ocupado: es un valor de `MuebleDeArcade`, y un nombre
 * que significa dos cosas en el mismo árbol es la clase de deuda de vocabulario
 * que este repositorio ya pagó una vez con `reparto`. Un retablo es el mueble
 * donde se pinta la escena; el tablero es lo que se pinta en él.
 *
 * ═══ LOS TOQUES: EL MOVIMIENTO VIENE DENTRO DE LA PIEZA ═══
 *
 * Cada figura trae `toque: { tipo, carga } | null`. Si lo trae, es pulsable y lo
 * que se manda es literalmente eso. La alternativa —que esto devolviera «han
 * tocado el nudo tal» y alguien lo tradujera a un movimiento— es código por juego
 * dentro de la pantalla, o sea la pantalla de Riberas con otro nombre.
 *
 * ═══ SVG Y NO SKIA, A PROPÓSITO ═══
 *
 * `react-native-svg` ya está instalado y no cuesta megabytes a nadie. Skia son
 * unos cuatro megas en Android y seis en iOS PARA TODOS LOS USUARIOS, incluidos
 * los que sólo juegan veladas, y el §7 lo reserva para el mueble `lienzo`, que es
 * el que de verdad necesita sesenta fotogramas por segundo. Un tablero por turnos
 * se repinta cuando alguien mueve.
 *
 * ═══ EL COLOR DE ESTA PANTALLA ESTÁ REPARTIDO, Y EL REPARTO ES LA REGLA ═══
 *
 * Hay dos paletas en el mismo SVG y no se mezclan nunca:
 *
 *   · LA DEL JUEGO pinta las FIGURAS —`cara.relleno`, `cara.borde`, `linea.color`,
 *     `nudo.color`—. Llegan en el dato y salen enteras. Un arcade de fuera elige
 *     de qué color es su delta, y este fichero no tiene ninguna opinión sobre eso.
 *   · LA DE LA SALA (`SALA`, en `./muebles`) pinta el MARCO —el suelo, los
 *     paneles, los botones, los rótulos— y, dentro del dibujo, sólo el ESTADO:
 *     que una pieza se puede tocar, que una cara está destacada, que un botón no
 *     está disponible. Estado es lo único que el juego NO puede saber pintar,
 *     porque depende de a quién se le está enseñando la partida.
 *
 * De ahí sale la regla que explica cada color de abajo: `SALA.acento` aparece
 * SÓLO donde algo se puede tocar o está elegido ahora mismo. Si se usara además
 * para los títulos y los bordes —que es lo que hacía la versión anterior con su
 * `neon`— dejaría de querer decir «esto responde al dedo» y sería decoración.
 *
 * ═══ Y AQUÍ NO SE ESCRIBE UN COLOR A MANO ═══
 *
 * Había tres hexadecimales sueltos: dos blancos casi iguales para los rótulos de
 * las caras y un `#10141b` que no pertenecía a ninguna paleta de esta casa —era
 * el gris del fondo de una maqueta, copiado a un borde—. Un color escrito a mano
 * no se puede repintar: la Sala entera se cambia de violeta a ámbar tocando tres
 * valores de `SALA`, y lo que esté fuera de la tabla se queda como estaba y
 * canta.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import type {
  CaraDeTablero,
  LineaDeTablero,
  MovimientoDeclarado,
  NudoDeTablero,
  TableroDeclarado,
} from '../../../shared/mecanicas/tablero-declarado';
import { BOTON, LETRA, RADIO, SALA } from './muebles';

/**
 * ═══ EL ALTO DEL LIENZO SE CALCULA, Y ANTES ESTABA CLAVADO EN 360 ═══
 *
 * Con un alto fijo y `width="100%"`, el SVG escala con `xMidYMid meet`, o sea al
 * MENOR de los dos factores. Como el encuadre lo calcula el juego y puede ser tan
 * alto como quiera, en una pantalla ancha el tablero se comprimía SIEMPRE contra
 * los 360 y dejaba media pantalla vacía a los lados: medido, un encuadre de
 * 1012,8 × 920 sobre 1248 px de ancho salía a escala 0,39 cuando por ancho le
 * cabía 1,23. Las piezas pulsables quedaban en nueve píxeles.
 *
 * Ahora el alto sale de la proporción del propio encuadre, entre un suelo y un
 * techo. El suelo evita que un tablero muy apaisado se quede en una tira; el techo
 * evita que uno muy alto empuje los paneles fuera de la pantalla — el retablo va
 * dentro de un `ScrollView`, pero un tablero que no cabe de una vez se juega mal.
 */
const ALTO_MINIMO_DEL_RETABLO = 300;
const ALTO_MAXIMO_DEL_RETABLO = 520;

/**
 * EL OBJETIVO MÁS PEQUEÑO QUE UN DEDO ACIERTA, en píxeles.
 *
 * Apple pide 44 pt y Android 48 dp. Se toma el de Apple porque es el que además
 * sirve de mínimo razonable en web con ratón.
 *
 * Esto NO es un detalle de estilo, y por eso está aquí arriba con su porqué. El
 * área sensible de una figura de `react-native-svg` es la figura: no hay
 * `hitSlop`, así que un círculo de radio 11 en un encuadre que se dibuja a escala
 * 0,33 es un objetivo de siete píxeles, y una línea de grosor 8 son dos píxeles y
 * medio de ancho útil. Medido en pantalla antes de arreglarlo: cajas de 34×20 y
 * 0×39 px CSS para las veredas ofrecidas, y hubo que sacar las coordenadas por
 * JavaScript para poder tocar una. En la colocación inicial, trazar la vereda es
 * el SEGUNDO movimiento de la partida y el primero que hace todo el mundo.
 */
const TOQUE_MINIMO_PX = 44;

/** Lo que hace falta para leer un rótulo en un móvil, en píxeles. */
const TEXTO_MINIMO_PX = 13;

/**
 * ═══ HASTA DÓNDE SE OBEDECE LA AMPLIACIÓN DE LETRA DEL SISTEMA ═══
 *
 * El texto de dentro de un SVG no pasa por `allowFontScaling`: su `fontSize` va en
 * unidades del encuadre y no en puntos, así que quien tenga el sistema al 200 %
 * veía el número de producción exactamente igual que quien lo tiene al 100 %. Aquí
 * se aplica a mano —`ventana.fontScale` sube el suelo de 13 px— porque es la única
 * vía que hay.
 *
 * Y lleva tope, que es una concesión y por eso se dice, con el mismo argumento que
 * el de la tarjeta de la portada (`index.tsx`): el hexágono donde va escrito NO
 * crece con la letra. Su ancho lo declara el juego en su encuadre y es el mismo a
 * cualquier ampliación, así que pasado cierto punto crecer no hace que se lea más:
 * hace que el rótulo se salga de su cara o que lo recorte el tope de anchura de
 * `tamanoDeTexto`. 1,5 es el mismo número que la portada, para no tener dos.
 */
const TOPE_DE_AMPLIACION = 1.5;

/**
 * ═══ LOS TRAZOS DE LA SALA VAN EN PÍXELES DE PANTALLA, COMO TODO LO SUYO ═══
 *
 * Estaban escritos en unidades del encuadre —2, 5, 6, 8— y eran la única magnitud
 * del fichero que no pasaba por la escala, justo la que dice si algo responde. A la
 * escala de un móvil (0,346 en un encuadre de 1012,8 × 920 sobre 390 px) aquellos
 * números salían a 0,69 · 1,73 · 2,08 y 2,77 píxeles: el filo de un nudo era un
 * tercio de píxel y el contorno de una cara destacada no llegaba a dos. El comentario
 * de más abajo llamaba al filo «un píxel de blanco» y al contorno «pasa de 2 a 6»
 * como si fueran píxeles; no lo eran.
 *
 * Aquí van en píxeles de pantalla y se convierten con `enUnidades`, que es la cuarta
 * conversión del fichero y hermana de las tres del final.
 */
const TRAZO = {
  /** El filo de la casa: un píxel. `muebles.ts` lo define así y aquí se cumple. */
  filo: 1,
  /** El contorno que dice «esto responde al dedo» o «esto es lo de ahora». */
  acento: 3,
  /** El halo oscuro a cada lado del acento. Ver `CONTORNO_QUE_SE_VE`. */
  halo: 1.5,
  /** Lo mínimo que mide una línea que se ofrece, para que se vea que se ofrece. */
  ofrecida: 4,
} as const;

/**
 * De píxeles de pantalla a unidades del encuadre del juego.
 *
 * Sin escala todavía —el primer fotograma de un retablo con el encuadre a cero— se
 * devuelve el número tal cual: sale un trazo fino, nunca uno ausente.
 */
function enUnidades(px: number, escala: number): number {
  return escala > 0 ? px / escala : px;
}

/**
 * ═══ EL PLATO QUE HACE LEGIBLE EL TEXTO DE UNA CARA ═══
 *
 * `SALA.suelo` al 78 %, que es exactamente el plato de `PastillaDeEstado` y por la
 * misma razón: debajo hay un color que esta pantalla NO controla.
 *
 * Medido, componiendo el alfa en sRGB sobre los seis terrenos de Riberas, el blanco
 * sobre este plato da entre 13,4:1 (vega #b09a3f, el más claro) y 15,5:1 (marisma
 * #3f6d5a). Sin él, sobre esos mismos rellenos daba entre 2,57 y 5,47, o sea que
 * cuatro de los seis no llegaban al 4,5 que pide un texto de 13 px.
 *
 * El 78 y no otro número: es el del plato de la pastilla, ya medido para que el
 * propio plato se recorte de lo que tenga debajo (3,14 en el peor de los cuatro
 * temas). Dos platos con dos alfas serían dos números esperando a divergir.
 */
const PLATO_DE_LA_CARA = 0.78;

/**
 * El cuerpo con el que el juego declara los dos textos de una cara, en unidades del
 * encuadre. Son de la Sala y no del contrato —`CaraDeTablero` no trae tamaños—, y
 * viven aquí arriba porque su PROPORCIÓN, 36/22 = 1,64, es lo que hay que conservar
 * al levantarlos: ver `crecidaDelTexto`.
 */
const CUERPO_DEL_ROTULO = 22;
const CUERPO_DE_LA_CIFRA = 36;

/**
 * Lo que este fichero le quita al ancho de la ventana antes de llegar al lienzo.
 *
 * Son los dos rellenos de más abajo —`dentro` a 16 por lado y `lienzo` a 4 por
 * lado—, sumados. Vive aquí arriba y no como número suelto porque es la única cifra
 * de todo el fichero que hay que cambiar a la vez que un estilo: si alguien toca uno
 * de esos dos rellenos y se olvida de ésta, la estimación de ancho se queda coja y
 * los objetivos salen un poco más pequeños, sin que nada se caiga.
 *
 * Los 4 del `lienzo` ya no son 4 de relleno: son 3 de relleno y 1 de filo, porque
 * la Sala separa una superficie de otra con un píxel de borde y no con un cambio de
 * material. Se ha restado del hueco en vez de sumarse encima —que era lo cómodo—
 * precisamente para que esta cuenta no se moviera: un borde que se ignora se come
 * dos píxeles del ancho útil, y de ahí salen los objetivos del dedo.
 *
 * ═══ Y VA PARTIDO EN DOS, PORQUE LAS DOS MEDIDAS NO MEDÍAN LA MISMA CAJA ═══
 *
 * `onLayout` devuelve el ancho de BORDE del `View` del lienzo, o sea CON sus 3 de
 * relleno y su 1 de filo por lado; la estimación por ventana ya los tenía restados.
 * El `Math.min` de más abajo comparaba entonces una caja exterior con una interior y
 * la medida salía 8 px larga. Cuando gana la ventana da igual, pero cuando gana la
 * medida —el retablo dentro de una columna estrecha, que es EL caso que esta cuenta
 * existe para cubrir— la escala salía sobrestimada en 8/ancho: en el cuadro de 335
 * px que cita el comentario de más abajo, un 2,4 % que dejaba el objetivo del dedo
 * en 42,9 px en vez de los 44 que este fichero razona largo.
 */
const CANTOS_DEL_LIENZO = (3 + 1) * 2;
const MARGENES_DEL_RETABLO = 16 * 2 + CANTOS_DEL_LIENZO;

/** Lo que hace falta para pintar un tablero y poder tocarlo. */
export interface QueSePinta {
  tablero: TableroDeclarado;
  /** Qué hacer cuando se toca algo. Lo manda quien sabe hablar con la mesa. */
  alTocar: (movimiento: MovimientoDeclarado) => void;
  /** Mientras hay un movimiento en vuelo no se puede tocar nada más. */
  quieto: boolean;
}

/** Pinta el tablero entero: el aviso, el mapa, los botones y los paneles. */
export function Retablo({ tablero, alTocar, quieto }: QueSePinta): JSX.Element {
  /*
   * El `viewBox` lo calcula el JUEGO, no la pantalla: sólo él sabe cuánto ocupa
   * su tablero. Aquí sólo se convierte a la cadena que quiere el SVG, y se
   * memoriza para no rehacer la cadena en cada repintado.
   */
  const encuadre = useMemo(
    () => `${tablero.vista.x} ${tablero.vista.y} ${tablero.vista.ancho} ${tablero.vista.alto}`,
    [tablero.vista.x, tablero.vista.y, tablero.vista.ancho, tablero.vista.alto],
  );

  /*
   * ═══ EL RETABLO SE MIDE A SÍ MISMO, Y NO ES UN LUJO ═══
   *
   * Sin saber cuántos píxeles ocupa de verdad, esta pantalla no puede saber a qué
   * escala se está dibujando el encuadre del juego, y sin la escala no puede
   * decidir cuánto hay que engordar un objetivo para que un dedo lo acierte ni
   * cuánto hay que crecer un rótulo para que se lea. De esa medida salen las tres
   * cuentas del final del fichero.
   *
   * ═══ Y SE MIDE POR DOS CAMINOS, PORQUE UNO SOLO NO LLEGA ═══
   *
   * `onLayout` da la medida EXACTA de este cuadro, sea cual sea el hueco donde lo
   * hayan metido. Pero no se puede depender de ella sola, y las dos razones están
   * comprobadas en el navegador y no supuestas:
   *
   *   · A VECES NO LLEGA NUNCA. Con el tablero pintado y el cuadro a 335 px, no
   *     disparó ni al montar. Ancho cero, sin escala, y los objetivos vuelven a su
   *     tamaño de dibujo: siete píxeles. El arreglo entero de los toques dependía
   *     en silencio de que ocurriera una devolución de llamada.
   *   · Y CUANDO LLEGA, SE QUEDA VIEJA. Midió 1225 en una ventana ancha y no volvió
   *     a dispararse al estrecharla a un móvil: el retablo siguió calculando con un
   *     ancho que ya no existía y los rótulos salieron a ocho píxeles, que es
   *     exactamente el número que había que arreglar.
   *
   * Así que se combinan las dos y SE TOMA LA MENOR. La otra es el ancho de la
   * ventana menos los márgenes que pone este mismo fichero, y tiene la propiedad que
   * le falta a `onLayout`: se actualiza siempre, porque `useWindowDimensions` está
   * suscrito al tamaño de la ventana.
   *
   * La menor de las dos es la correcta en los tres casos que hay: si el retablo va
   * dentro de una columna estrecha, gana la medida; si la medida se quedó vieja y
   * grande, gana la ventana; y si no hay medida, gana la ventana. Cuando la que
   * gana se queda corta, los objetivos salen algo más pequeños de lo ideal — nunca
   * rotos, que es la única forma de equivocarse que aquí importa.
   */
  const ventana = useWindowDimensions();
  const [medido, ponerMedido] = useState(0);
  const medir = (e: LayoutChangeEvent): void => {
    const nuevo = Math.round(e.nativeEvent.layout.width);
    if (nuevo > 0 && nuevo !== medido) ponerMedido(nuevo);
  };
  const porLaVentana = Math.max(0, ventana.width - MARGENES_DEL_RETABLO);
  /* Los dos restan ya los cantos del lienzo: ver `CANTOS_DEL_LIENZO`. */
  const porLaMedida = Math.max(0, medido - CANTOS_DEL_LIENZO);
  const ancho = porLaMedida > 0 ? Math.min(porLaMedida, porLaVentana) : porLaVentana;

  const alto = altoDelLienzo(ancho, tablero.vista);
  /*
   * La escala real del `meet` de SVG: el MENOR de los dos factores, que es lo que
   * hace el navegador y lo que hace `react-native-svg`.
   *
   * Aquí decía que hasta la primera medida no se sabía nada y que entonces valía 0.
   * Ya no: desde que existe `porLaVentana`, `ancho` vale el ancho de la ventana
   * menos los márgenes en el PRIMER pintado, y la medida sólo puede bajar ese
   * número. Vale 0 únicamente si el encuadre que declara el juego viene a cero, que
   * es un tablero roto y no un fotograma. Las cuentas del final siguen
   * defendiéndose de la escala cero porque esa defensa cuesta una línea y una
   * división por cero no avisa.
   */
  const escala = ancho > 0 ? Math.min(ancho / tablero.vista.ancho, alto / tablero.vista.alto) : 0;

  /*
   * CUÁNTO HAY QUE LEVANTAR LOS DOS TEXTOS DE UNA CARA, en un solo número para los
   * dos. Ver `crecidaDelTexto`: lo que arregla es que la jerarquía no se aplane.
   */
  const crecida = crecidaDelTexto(escala, Math.min(ventana.fontScale, TOPE_DE_AMPLIACION));

  return (
    <ScrollView style={estilos.todo} contentContainerStyle={estilos.dentro}>
      {/*
        EL AVISO ES EL PANEL DEL TURNO, y por eso lleva el único acento del marco.

        Dice de quién es el turno, qué se espera o quién ganó: es lo que está vivo
        de esta pantalla, que es la definición de dónde puede aparecer el acento.
        Va como raíl al borde y no como color del texto porque una frase entera en
        violeta se lee peor que la misma frase en blanco con un raíl al lado, y
        porque el texto lo escribe el JUEGO — teñirlo sería la Sala hablando por
        encima de sus palabras.

        Y se pinta sólo si hay frase. Antes se pintaba siempre: con `aviso` vacío
        era un `Text` invisible y daba igual, pero un panel con fondo y raíl sí se
        ve, y sería una caja de color anunciando nada.

        ═══ Y SE ANUNCIA CUANDO CAMBIA, QUE ES LO QUE LE FALTABA ═══

        Era un `Text` pelado. Con lector de pantalla, cuando movía otro y el sondeo
        de la mesa traía una frase nueva, no sonaba nada: había que ir a buscarla
        con el dedo para enterarse de que el turno había cambiado. Una región viva
        es exactamente la pieza para esto —el contenido cambia solo, sin que quien
        mira haya tocado nada—, y va aquí y no en el panel entero para que se lea la
        frase y no además el raíl.

        Las dos propiedades porque cada una sirve en un sitio, igual que la tarjeta
        de la portada con sus tres: `accessibilityLiveRegion` es de Android y
        `aria-live` es lo único que entiende `react-native-web`. iOS no tiene región
        viva declarativa —allí hace falta `AccessibilityInfo.announceForAccessibility`,
        que es una llamada y no un atributo— y eso se queda pendiente y dicho: con
        `role` y sin región, en iOS al menos se encuentra como texto.
      */}
      {tablero.aviso.length > 0 ? (
        <View style={estilos.aviso}>
          <View style={estilos.avisoRail} />
          <Text
            style={estilos.avisoTexto}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            aria-live="polite"
          >
            {tablero.aviso}
          </Text>
        </View>
      ) : null}

      {tablero.caras.length > 0 || tablero.nudos.length > 0 ? (
        <View style={estilos.lienzo} onLayout={medir}>
          <Svg width="100%" height={alto} viewBox={encuadre}>
            {/*
              EL ORDEN DE LAS CAPAS ES LA ÚNICA REGLA DE PINTADO QUE HAY AQUÍ, y no
              es estética: en SVG lo que se dibuja después tapa a lo anterior. Las
              caras son grandes y van debajo; las líneas cruzan por encima de ellas;
              los nudos son pequeños y tienen que quedar visibles sobre las dos. Al
              revés, las piezas desaparecerían debajo del terreno y la pantalla
              parecería no responder a los toques.

              Decía «LAS TRES CAPAS» y son seis, y la que se ha añadido lo es por una
              razón que no es de orden sino de corrección: EL CONTORNO DE UNA CARA
              DESTACADA VA EN SU PROPIA CAPA, después de TODAS las caras. Los
              hexágonos comparten arista, así que dibujándolo dentro del mismo bucle
              el relleno del vecino —que se pinta después— borraba la mitad del
              contorno de la cara destacada. Se veía como un resalte a trozos y
              parecía un fallo de dibujo.

              De arriba abajo: caras · contornos de las destacadas · líneas · textos
              de las caras · nudos · y las dos capas de dedos, que no se ven.
            */}
            <G>
              {tablero.caras.map((cara) => {
                const responde = cara.toque !== null && !quieto;
                return (
                  <Polygon
                    key={cara.id}
                    points={puntosDe(cara)}
                    fill={cara.relleno}
                    /*
                     * El relleno y el borde son del juego y salen enteros. El
                     * acento que decía «ésta, ahora mismo» se ha ido a la capa de
                     * arriba, donde además puede llevar su halo.
                     */
                    stroke={cara.borde}
                    strokeWidth={enUnidades(TRAZO.filo, escala)}
                    accessible={cara.toque !== null}
                    accessibilityLabel={
                      cara.toque === null
                        ? undefined
                        : nombreParaElLector(`${cara.rotulo} ${cara.cifra}`, cara.toque, cara.id)
                    }
                    onPress={responde ? () => alTocar(cara.toque as MovimientoDeclarado) : undefined}
                  />
                );
              })}
            </G>
            {/*
              La cara destacada NO pierde el acento cuando hay un movimiento en
              vuelo, y es la única del SVG que no lo pierde: «destacada» no promete
              que responda al dedo —dice cuál es la de ahora mismo, el hexágono que
              acaba de salir en los dados— y eso sigue siendo verdad mientras se
              espera al servidor. La regla de la cabecera dice acento donde algo se
              puede tocar O ESTÁ ELEGIDO AHORA MISMO; esto es lo segundo.
            */}
            <G pointerEvents="none">
              {tablero.caras.map((cara) =>
                cara.destacada ? (
                  <ContornoQueSeVe key={`destaca-${cara.id}`} cara={cara} escala={escala} />
                ) : null,
              )}
            </G>
            <G>
              {tablero.lineas.map((linea) => {
                /*
                 * DOS PREGUNTAS Y NO UNA, y ahí estaba el fallo: el TAMAÑO dice que
                 * el juego la ofrece y el COLOR dice que ahora mismo contesta.
                 * Antes las dos salían de `toque !== null`, así que durante todo el
                 * viaje de red la vereda seguía en acento prometiendo que respondía
                 * mientras el `onPress` ya era `undefined`. Y la anchura no se toca
                 * con `quieto` a propósito: si encogiera al empezar el viaje, el
                 * tablero entero daría un salto en cada movimiento.
                 */
                const ofrecida = linea.toque !== null;
                const responde = ofrecida && !quieto;
                const extremos = {
                  x1: linea.desde.x,
                  y1: linea.desde.y,
                  x2: linea.hasta.x,
                  y2: linea.hasta.y,
                  strokeLinecap: 'round' as const,
                };
                const grosor = ofrecida
                  ? Math.max(linea.grosor, enUnidades(TRAZO.ofrecida, escala))
                  : linea.grosor;
                const pintada = {
                  ...extremos,
                  stroke: responde ? SALA.acento : linea.color,
                  strokeWidth: grosor,
                  /*
                   * `strokeOpacity` y no `opacity`: una línea sólo tiene trazo, así
                   * que hoy dan el mismo píxel, pero el nodo entero también
                   * arrastraría su halo el día que una línea tenue lo lleve. Es el
                   * mismo agujero que el nudo de aquí abajo sí tenía.
                   */
                  strokeOpacity: linea.tenue && !ofrecida ? 0.45 : 1,
                  accessible: ofrecida,
                  accessibilityLabel: ofrecida
                    ? nombreParaElLector('', linea.toque, linea.id)
                    : undefined,
                  onPress: responde
                    ? () => alTocar(linea.toque as MovimientoDeclarado)
                    : undefined,
                };
                /*
                 * El grupo sólo se monta si hay halo que agrupar. En un delta de
                 * Riberas hay 72 aristas y las ofrecidas de una vez son un puñado:
                 * envolverlas todas en un `G` serían setenta vistas nativas más por
                 * repintado a cambio de nada.
                 */
                if (!responde) return <Line key={linea.id} {...pintada} />;
                return (
                  <G key={linea.id}>
                    <Line
                      {...extremos}
                      stroke={SALA.suelo}
                      strokeWidth={grosor + enUnidades(TRAZO.halo * 2, escala)}
                      pointerEvents="none"
                    />
                    <Line {...pintada} />
                  </G>
                );
              })}
            </G>
            <G>
              {tablero.caras.map((cara) => (
                <CifraDeLaCara key={`cifra-${cara.id}`} cara={cara} crecida={crecida} />
              ))}
            </G>
            {/*
              EL CONTORNO DE UN NUDO DICE SI RESPONDE, y nada más.

              Pulsable, el acento con su halo (`ContornoQueSeVe` explica por qué son
              dos colores y no uno). Quieto, el filo de la Sala. Aquí había un
              `#10141b` escrito a mano, un gris de fondo haciendo de borde; era casi
              del color del suelo, así que sobre el suelo no separaba nada y sobre
              una cara clara era una mancha oscura.

              ═══ Y LO QUE EL COMENTARIO PROMETÍA DEL FILO NO ERA CIERTO ═══

              Decía que el filo «despega la pieza de lo que tenga debajo» y que su
              alfa le permite «servir sobre las tres cosas —el suelo, el panel y el
              relleno que declare el juego— sin tener que declarar tres colores».
              Medido: blanco al 7,5 % sobre la teja del lienzo da 1,22:1 y sobre un
              nudo libre #3a3f4b da 1,25:1, contra los 3:1 que pide un elemento no
              textual. NINGÚN color fijo puede prometer 3:1 contra un relleno que
              declara un arcade de fuera; lo único que lo consigue es un contorno de
              DOS colores que contrastan entre sí, y eso cuesta un nodo por pieza.
              Se paga donde el contorno significa algo —el acento— y no en las
              decenas de nudos quietos de un tablero, que es una decisión y por eso
              está escrita: el filo de un nudo quieto separa POCO y se sabe.

              Lo que sí era un fallo y se arregla: el `opacity: 0.4` de un nudo tenue
              iba en el nodo entero y multiplicaba también el alfa del borde —0,075 ×
              0,4 = 0,03—, o sea que en las piezas donde más falta hace separar el
              filo directamente no existía. Ahora el apagado va en `fillOpacity` y
              toca sólo al relleno, que es la misma regla que los botones de abajo:
              se apaga con color, no con opacidad.
            */}
            <G>
              {tablero.nudos.map((nudo) => {
                const ofrecido = nudo.toque !== null;
                const responde = ofrecido && !quieto;
                const trazo = enUnidades(responde ? TRAZO.acento : TRAZO.filo, escala);
                const conHalo = trazo + enUnidades(TRAZO.halo * 2, escala);
                const caja = {
                  x: nudo.punto.x - nudo.radio,
                  y: nudo.punto.y - nudo.radio,
                  width: nudo.radio * 2,
                  height: nudo.radio * 2,
                };
                const disco = { cx: nudo.punto.x, cy: nudo.punto.y, r: nudo.radio };
                const pintado = {
                  fill: nudo.color,
                  fillOpacity: nudo.tenue && !ofrecido ? 0.4 : 1,
                  stroke: responde ? SALA.acento : SALA.filo,
                  strokeWidth: trazo,
                  accessible: ofrecido,
                  accessibilityLabel: ofrecido
                    ? nombreParaElLector('', nudo.toque, nudo.id)
                    : undefined,
                  onPress: responde
                    ? () => alTocar(nudo.toque as MovimientoDeclarado)
                    : undefined,
                };
                const halo = { fill: 'none', stroke: SALA.suelo, strokeWidth: conHalo } as const;
                /* Igual que las líneas: sin halo no hace falta grupo. */
                if (!responde) {
                  return nudo.forma === 'cuadrado' ? (
                    <Rect key={nudo.id} {...caja} {...pintado} />
                  ) : (
                    <Circle key={nudo.id} {...disco} {...pintado} />
                  );
                }
                return (
                  <G key={nudo.id}>
                    {nudo.forma === 'cuadrado' ? (
                      <Rect {...caja} {...halo} pointerEvents="none" />
                    ) : (
                      <Circle {...disco} {...halo} pointerEvents="none" />
                    )}
                    {nudo.forma === 'cuadrado' ? (
                      <Rect {...caja} {...pintado} />
                    ) : (
                      <Circle {...disco} {...pintado} />
                    )}
                  </G>
                );
              })}
            </G>

            {/*
              ═══ LA CAPA DE LOS DEDOS, QUE NO SE VE Y ES LA QUE SE TOCA ═══

              Va la última a propósito: en SVG lo de después tapa a lo de antes
              también para los toques, así que estas figuras —invisibles y mucho
              más grandes que las pintadas— son las que reciben el dedo.

              Las de arriba conservan su `onPress`, y aquí decía que era «red de
              seguridad para el primer fotograma, cuando todavía no se ha medido el
              ancho y no hay escala». Ese fotograma ya no existe: desde que la
              medida se estima por la ventana, la escala nunca vale cero. Sigue
              haciendo falta por otra razón, y es la buena: una figura que YA es más
              grande que el mínimo de dedo —una torre de radio 20— no necesita capa
              de dedos y aun así tiene que responder. Y son además las que llevan el
              nombre para el lector de pantalla, porque son las que se ven.

              El remedio habitual en React Native es `hitSlop`, y `react-native-svg`
              no lo tiene: el área sensible de una figura es la figura. Así que se
              dibuja una figura aparte, del tamaño del dedo y no del tamaño del
              dibujo, con opacidad casi nula —pintada, que es lo que la hace
              sensible, e invisible, que es lo que hace que no estorbe—.

              Y primero las líneas y después los nudos, por la misma regla: cuando
              las dos áreas se solapan, gana el nudo. Es lo correcto porque un nudo
              es un punto y una vereda es un trazo largo: quien apunta a un cruce
              apunta fino, y quien apunta a una orilla tiene toda su longitud.

              ═══ EL COLOR DE LO QUE NO SE VE, DICHO SIN PROMETER DE MÁS ═══

              Se pintaban de `SALA.suelo` «para que el día que alguien suba esa
              opacidad para depurar, lo que salga sea la sala y no un borrón negro
              encima del tablero». `SALA.suelo` es #080A0E, el color más oscuro de
              la tabla entera: subirle la opacidad daba exactamente el borrón negro
              que la frase decía evitar. Lo que el código sí conseguía —no escribir
              un hexadecimal a mano— vale, y se conserva; la consecuencia no. Ahora
              es `SALA.acento`, que además es el color que en esta Sala significa
              «esto responde al dedo», o sea justo lo que la capa dibuja.

              Y `accessible={false}` en las dos: la etiqueta va en la figura pintada,
              que es la que se ve. Sin esto, un lector de pantalla anunciaría cada
              vereda ofrecida dos veces, una por la que se ve y otra por su sombra.
            */}
            <G>
              {tablero.lineas.map((linea) =>
                linea.toque === null || quieto ? null : (
                  <Line
                    key={`dedo-${linea.id}`}
                    x1={linea.desde.x}
                    y1={linea.desde.y}
                    x2={linea.hasta.x}
                    y2={linea.hasta.y}
                    stroke={SALA.acento}
                    strokeOpacity={0.001}
                    strokeWidth={grosorParaElDedo(linea, escala)}
                    strokeLinecap="round"
                    accessible={false}
                    onPress={() => alTocar(linea.toque as MovimientoDeclarado)}
                  />
                ),
              )}
            </G>
            <G>
              {tablero.nudos.map((nudo) =>
                nudo.toque === null || quieto ? null : (
                  <Circle
                    key={`dedo-${nudo.id}`}
                    cx={nudo.punto.x}
                    cy={nudo.punto.y}
                    r={radioParaElDedo(nudo, tablero.nudos, escala)}
                    fill={SALA.acento}
                    fillOpacity={0.001}
                    accessible={false}
                    onPress={() => alTocar(nudo.toque as MovimientoDeclarado)}
                  />
                ),
              )}
            </G>
          </Svg>
        </View>
      ) : null}

      {tablero.acciones.length > 0 ? (
        <View style={estilos.botones}>
          {tablero.acciones.map((accion) => {
            /*
             * «Jugable» junta las dos razones por las que un botón no responde —el
             * juego dice que no toca, o hay un movimiento en vuelo— porque para el
             * dedo son la misma: no pasa nada al pulsar. Se calcula una vez y de
             * ella salen el borde, el fondo y el color del rótulo, que antes se
             * repetían tres veces la misma condición.
             */
            const jugable = accion.disponible && !quieto;
            return (
              <Pressable
                key={accion.id}
                disabled={!jugable}
                onPress={() => alTocar(accion.toque)}
                /*
                 * EL RÓTULO ES EL DEL JUEGO, que es lo único que hay: este mueble no
                 * sabe a qué se juega. En el escritorio estas mismas acciones son
                 * `<button>` de verdad —y hasta las figuras del SVG llevan `role` y
                 * `aria-label`—, o sea que sin esto se podía jugar con lector de
                 * pantalla desde el PC y no desde el móvil.
                 *
                 * Y ese mismo comentario describía bien al hermano y arreglaba la
                 * mitad: los botones estaban anunciados y las figuras del SVG no,
                 * así que con lector se podía tirar los dados y no se podía
                 * construir nada. Las figuras llevan ya su `accessible` y su
                 * `accessibilityLabel` allá arriba. Lo que no se ha podido traer del
                 * escritorio es el ROL: los tipos de `react-native-svg` sólo aceptan
                 * `accessible`, `accessibilityLabel` y `testID` en una figura —no hay
                 * `accessibilityRole`—, así que una vereda se anuncia con su nombre
                 * pero no como botón. Es la mitad que falta, y está dicha.
                 */
                accessibilityRole="button"
                accessibilityLabel={accion.rotulo}
                accessibilityHint={accion.ayuda.length > 0 ? accion.ayuda : undefined}
                accessibilityState={{ disabled: !jugable }}
                style={({ pressed }) => [
                  estilos.boton,
                  jugable ? estilos.botonVivo : estilos.botonApagado,
                  pressed && jugable && estilos.botonPulsado,
                ]}
              >
                <Text style={[estilos.botonRotulo, !jugable && estilos.botonRotuloApagado]}>
                  {accion.rotulo}
                </Text>
                {accion.ayuda.length > 0 ? (
                  <Text style={[estilos.botonAyuda, !jugable && estilos.botonAyudaApagada]}>
                    {accion.ayuda}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/*
        LA CLAVE ES EL SITIO Y NO EL TÍTULO. `PanelDeTablero` es {título, líneas} y
        nada más: no trae identificador ni el contrato obliga a que los títulos sean
        distintos. Con `key={panel.titulo}`, un arcade de fuera que mandara dos
        paneles llamados «Trueques» reconciliaría mal y avisaría por consola.
        Riberas manda hoy cuatro títulos distintos, así que no se veía. Es el mismo
        índice sobre la lista que estas mismas líneas ya usaban bien.
      */}
      {tablero.paneles.map((panel, i) => (
        <View key={`panel-${String(i)}`} style={estilos.panel}>
          <Text style={estilos.panelTitulo}>{panel.titulo}</Text>
          {panel.lineas.map((linea, j) => (
            <Text key={`panel-${String(i)}-${String(j)}`} style={estilos.panelLinea}>
              {linea}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// LAS CUENTAS QUE CONVIERTEN «UNIDADES DEL JUEGO» EN «PÍXELES DE PANTALLA»
// (una más, `enUnidades`, vive arriba pegada a la tabla de trazos a la que sirve)
// ---------------------------------------------------------------------------

/**
 * El alto que hay que darle al lienzo para que el tablero salga a su proporción.
 *
 * Con el ancho a cero se devuelve el suelo, que es lo que había antes clavado.
 * Aquí decía «con el ancho todavía sin medir»: eso describía la versión anterior,
 * la de antes de `useWindowDimensions`. Hoy el ancho se estima por la ventana desde
 * el primer pintado y esta rama sólo se toma con un encuadre roto —el juego declara
 * ancho o alto a cero—, que es lo que de verdad hay que sobrevivir sin dividir por
 * cero.
 */
function altoDelLienzo(ancho: number, vista: TableroDeclarado['vista']): number {
  if (ancho <= 0 || vista.ancho <= 0 || vista.alto <= 0) return ALTO_MINIMO_DEL_RETABLO;
  const aProporcion = (ancho * vista.alto) / vista.ancho;
  return Math.round(
    Math.min(ALTO_MAXIMO_DEL_RETABLO, Math.max(ALTO_MINIMO_DEL_RETABLO, aProporcion)),
  );
}

/**
 * CUÁNTO HAY QUE ENGORDAR UN NUDO PULSABLE, en unidades del juego.
 *
 * Dos límites y el mayor de los tamaños de partida:
 *
 *  · LO QUE HACE FALTA: el radio que a esta escala da un objetivo de 44 px.
 *  · LO QUE CABE: la mitad de la distancia al nudo pulsable MÁS CERCANO. Sin este
 *    tope, dos objetivos vecinos se solaparían y el dedo caería en el equivocado —
 *    que es peor que fallar, porque falla en silencio y mueve una pieza a un sitio
 *    que nadie eligió. Se mira sólo contra los pulsables: pisar un nudo que no se
 *    puede tocar no le quita nada a nadie.
 *
 * Es un cálculo por nudo sobre la lista entera, o sea cuadrático. Con las decenas
 * de nudos que tiene un tablero de mesa eso son unos miles de restas por
 * repintado, y un tablero por turnos se repinta cuando alguien mueve. Si algún día
 * llega un tablero de miles de nudos, aquí es donde hay que poner una rejilla.
 */
function radioParaElDedo(
  nudo: NudoDeTablero,
  todos: readonly NudoDeTablero[],
  escala: number,
): number {
  if (escala <= 0) return nudo.radio;
  const necesario = TOQUE_MINIMO_PX / 2 / escala;
  let masCerca = Infinity;
  for (const otro of todos) {
    if (otro === nudo || otro.toque === null) continue;
    const dx = otro.punto.x - nudo.punto.x;
    const dy = otro.punto.y - nudo.punto.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 0 && d < masCerca) masCerca = d;
  }
  const cabe = masCerca === Infinity ? necesario : masCerca / 2;
  return Math.max(nudo.radio, Math.min(necesario, cabe));
}

/**
 * CUÁNTO HAY QUE ENGORDAR UNA LÍNEA PULSABLE, en unidades del juego.
 *
 * Misma idea y el tope es otro: la mitad del largo de la propia línea. Una banda
 * más ancha que eso deja de parecerse a la línea y se come a las que salen de sus
 * extremos, y como los nudos van por encima, lo que se pierde en los cruces lo
 * recupera quien apunta al cruce.
 *
 * El número que esto arregla: una vereda de una malla hexagonal medía dos o tres
 * píxeles de ancho útil en un móvil, y era el segundo movimiento de la partida.
 */
function grosorParaElDedo(linea: LineaDeTablero, escala: number): number {
  if (escala <= 0) return linea.grosor;
  const necesario = TOQUE_MINIMO_PX / escala;
  const dx = linea.hasta.x - linea.desde.x;
  const dy = linea.hasta.y - linea.desde.y;
  const largo = Math.sqrt(dx * dx + dy * dy);
  const cabe = largo > 0 ? largo / 2 : necesario;
  return Math.max(linea.grosor, Math.min(necesario, cabe));
}

/**
 * ═══ CUÁNTO HAY QUE LEVANTAR LOS TEXTOS DE UNA CARA, EN UN SOLO NÚMERO ═══
 *
 * Y en uno solo a propósito: es LA CORRECCIÓN, y merece la pena decir qué se
 * rompía. Cada texto se levantaba por su cuenta hasta el suelo de 13 px, así que en
 * cuanto los dos caían por debajo, los dos aterrizaban EN EL MISMO VALOR. Medido:
 * en un móvil de 390 px, con el encuadre de 1012,8 × 920 que cita la cabecera, la
 * escala es 0,346; la cifra declarada a 36 unidades salía a 12,4 px y el rótulo a
 * 22 salía a 7,6, y los dos se subían a 37,6 unidades = 13,0 px EXACTOS. El número
 * de producción y el nombre del terreno salían iguales de cuerpo y lo único que los
 * separaba era el `bold` de la cifra. En una tableta la jerarquía volvía sola, que
 * es lo que hacía que esto no se viera probando en un navegador ancho.
 *
 * Ahora se calcula un factor único a partir del MENOR de los dos cuerpos —el que
 * manda, porque es el que toca el suelo primero— y se aplica a los dos, así que la
 * proporción que declara la Sala, 36/22 = 1,64, sobrevive al levantamiento. Con la
 * escala de arriba: rótulo 37,6 u = 13,0 px y cifra 61,5 u = 21,3 px.
 *
 * `ampliacion` es el ajuste de letra del sistema, ya con su tope. Sube el suelo, que
 * es lo que hace que el texto de dentro del SVG crezca con él: ver `TOPE_DE_AMPLIACION`.
 */
function crecidaDelTexto(escala: number, ampliacion: number): number {
  if (escala <= 0) return 1;
  const suelo = (TEXTO_MINIMO_PX * ampliacion) / escala;
  return Math.max(1, suelo / Math.min(CUERPO_DEL_ROTULO, CUERPO_DE_LA_CIFRA));
}

/**
 * EL TAMAÑO DE UN TEXTO SOBRE EL TABLERO, entre lo que se lee y lo que cabe.
 *
 * El juego declara un tamaño pensando en las unidades de su encuadre, y no puede
 * saber a cuántos píxeles va a salir: eso sólo lo sabe la pantalla. Con el rótulo
 * de un terreno a 22 unidades y una escala de 0,33, lo que se leía eran siete
 * píxeles. Así que aquí se crece hasta lo legible, con un tope: la anchura que
 * tiene la figura donde va escrito, repartida entre las letras que hay. Un rótulo
 * que se sale de su hexágono es tan inútil como uno que no se ve.
 *
 * Ese tope es el único sitio donde la proporción entre los dos textos se puede
 * volver a perder, y es correcto que se pierda ahí: es un límite físico —no cabe—
 * y no un redondeo. Un rótulo largo en un hexágono estrecho se queda corto de
 * cuerpo aunque la cifra crezca.
 *
 * El 0,6 es la anchura media de una letra en tipografía de palo seco medida en
 * «emes». No hay forma de medir texto de verdad dentro de un SVG de React Native,
 * y una aproximación con su número escrito es mejor que un número mágico.
 */
function tamanoDeTexto(
  base: number,
  crecida: number,
  anchoDeLaFigura: number,
  letras: number,
): number {
  const cabe = anchoDeLaFigura / Math.max(2, letras) / 0.6;
  return Math.max(base, Math.min(base * crecida, Math.max(base, cabe)));
}

/** Los puntos de una cara, en la cadena que quiere `Polygon`. */
function puntosDe(cara: CaraDeTablero): string {
  return cara.puntos.map((p) => `${String(p.x)},${String(p.y)}`).join(' ');
}

/**
 * ═══ CÓMO SE LLAMA UNA PIEZA PARA QUIEN NO LA VE ═══
 *
 * Fundar una choza, alzar una torre y trazar una vereda son toques sobre figuras de
 * un SVG, y sin nombre no existen para un lector de pantalla: se podía tirar los
 * dados —los botones sí estaban anunciados— y no se podía construir nada.
 *
 * El problema es que el contrato NO trae un nombre para una línea ni para un nudo.
 * `LineaDeTablero` y `NudoDeTablero` tienen `id`, y un `id` es «3,-1:n». El
 * escritorio anuncia ese identificador en crudo (`aria-label={p.id}`), que es
 * mejor que nada y poco más.
 *
 * Así que se usa, por este orden, lo mejor que hay:
 *
 *   1. LAS PALABRAS DEL JUEGO, cuando las hay. Una cara trae `rotulo` y `cifra`:
 *      «Carrizal 8» es un nombre de verdad y lo escribió el juego.
 *   2. EL TIPO DEL MOVIMIENTO, que es la única palabra que una línea o un nudo
 *      llevan encima. `riberas:fundar` se queda en «fundar»: se le quita el
 *      espacio de nombres, que es del motor y no de quien escucha.
 *   3. Y si tampoco, el identificador, como el escritorio.
 *
 * LO QUE FALTA, DICHO AQUÍ PORQUE ES DONDE SE NOTA: un campo `nombre` en
 * `LineaDeTablero` y `NudoDeTablero`, para que el juego —que es el único que sabe
 * que eso es «la orilla entre la vega y la duna»— lo escriba. Mientras no exista,
 * dos veredas ofrecidas se anuncian las dos como «fundar» y sólo se distinguen por
 * dónde están.
 */
function nombreParaElLector(
  propio: string,
  toque: MovimientoDeclarado | null,
  id: string,
): string {
  const suyo = propio.trim();
  if (suyo.length > 0) return suyo;
  if (toque !== null) {
    const sinEspacio = toque.tipo.slice(toque.tipo.lastIndexOf(':') + 1);
    const legible = sinEspacio.replace(/[-_]/g, ' ').trim();
    if (legible.length > 0) return legible;
  }
  return id;
}

/**
 * ═══ UN CONTORNO DE ACENTO SOBRE UN COLOR QUE ESTA PANTALLA NO ELIGE ═══
 *
 * El acento decía «esto está destacado» dibujado DIRECTAMENTE sobre el relleno del
 * juego, y no se recortaba de nada. Medido, componiendo luminancias WCAG contra los
 * seis terrenos de Riberas —marisma #3f6d5a, carrizal #6d8f3f, salina #8f8a6d,
 * cantil #6a6a72, vega #b09a3f, duna #8a7a5c— y contra el nudo libre #5a6070:
 * violeta 1,06-1,59 · carmesí 1,01-1,71 · verde 1,22-2,76 · ámbar 1,30-2,93. El
 * mínimo de un elemento no textual es 3:1 y NINGUNA de las 28 combinaciones llega.
 * Con el tema en carmesí, un carrizal destacado daba 1,01:1 contra su propio
 * relleno: literalmente no se veía que estuviera destacado.
 *
 * Y el comentario que lo defendía —«el contorno cae entre el relleno del juego y lo
 * que hay debajo, que es terreno de la Sala»— no era cierto: un trazo de SVG va
 * CENTRADO en el camino, mitad dentro del relleno y mitad fuera, y los hexágonos
 * comparten arista, así que al otro lado hay otro terreno y nunca el suelo.
 *
 * ═══ LA SALIDA ES UN CONTORNO DE DOS COLORES, Y ES DEMOSTRABLE ═══
 *
 * Ningún color fijo puede prometer 3:1 contra un relleno que declara un arcade de
 * fuera; el color de debajo es desconocido por definición. Lo que sí se puede
 * prometer sin saber nada del fondo es que los DOS colores del contorno contrasten
 * ENTRE SÍ: entonces, sea cual sea el relleno, uno de los dos bordes se ve. Es
 * exactamente el recurso con el que un navegador dibuja su anillo de foco.
 *
 * Aquí los dos colores son `SALA.acento` y `SALA.suelo`, que es la pareja que esta
 * casa ya tiene medida para el botón primario: 5,01 en violeta, 9,22 en ámbar, 8,69
 * en verde y 5,40 en carmesí. Y de propina, el halo oscuro sí se recorta de los
 * terrenos de Riberas —3,17 en el peor (el nudo libre) y 7,12 en la vega—, o sea que
 * en la práctica se ven los dos bordes y no uno.
 *
 * El halo va DEBAJO y más ancho, así que de él sólo asoma `TRAZO.halo` a cada lado:
 * lo que se lee sigue siendo una línea de acento, con una sombra fina.
 */
function ContornoQueSeVe({ cara, escala }: { cara: CaraDeTablero; escala: number }): JSX.Element {
  const puntos = puntosDe(cara);
  return (
    <G>
      <Polygon
        points={puntos}
        fill="none"
        stroke={SALA.suelo}
        strokeWidth={enUnidades(TRAZO.acento + TRAZO.halo * 2, escala)}
      />
      <Polygon
        points={puntos}
        fill="none"
        stroke={SALA.acento}
        strokeWidth={enUnidades(TRAZO.acento, escala)}
      />
    </G>
  );
}

/**
 * El rótulo y la cifra de una cara, en su centro.
 *
 * Va en su propio componente y en su propia capa porque el texto tiene que quedar
 * por encima de las líneas: dentro del `Polygon` no cabe, y pintado en la misma
 * capa que las caras lo taparía la primera línea que le pasara por encima.
 *
 * El centro y el ancho se calculan aquí a partir de los puntos del polígono, y no
 * los declara el juego: son geometría de la propia figura, y pedírselos al juego
 * sería un campo más que alguien puede rellenar mal.
 */
function CifraDeLaCara({
  cara,
  crecida,
}: {
  cara: TableroDeclarado['caras'][number];
  crecida: number;
}): JSX.Element | null {
  if (cara.rotulo.length === 0 && cara.cifra.length === 0) return null;
  let x = 0;
  let y = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of cara.puntos) {
    x += p.x;
    y += p.y;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
  }
  const centro = { x: x / Math.max(1, cara.puntos.length), y: y / Math.max(1, cara.puntos.length) };
  const anchoDeLaCara = maxX > minX ? maxX - minX : 0;
  const tamRotulo = tamanoDeTexto(CUERPO_DEL_ROTULO, crecida, anchoDeLaCara, cara.rotulo.length);
  const tamCifra = tamanoDeTexto(
    CUERPO_DE_LA_CIFRA,
    crecida,
    anchoDeLaCara,
    Math.max(2, cara.cifra.length),
  );
  const yRotulo = centro.y - tamRotulo * 0.4;
  const yCifra = centro.y + tamCifra * 0.8;
  /*
   * ═══ LOS DOS TEXTOS VAN EN BLANCO, Y AHORA SOBRE ALGO QUE LO SOSTIENE ═══
   *
   * Van escritos ENCIMA del relleno que declaró el juego, que puede ser cualquier
   * color. Aquí decía que era «la misma situación que la placa de la Sala, donde el
   * texto sobre el campo de color va en `blanco`», y la comparación estaba a medias:
   * aquella placa lleva un VELO debajo precisamente por esto, y su propio comentario
   * dice con todas las letras que NO ES DECORACIÓN Y NO ES OPCIONAL, y que el día
   * que debajo haya una imagen arbitraria el velo sube y el blanco vuelve a 11,20:1.
   * El relleno que declara un arcade de fuera ES ese caso, y aquí ha llegado antes
   * que la foto.
   *
   * Lo que se medía sin él: `SALA.blanco` #F4F6FA sobre los seis terrenos de Riberas
   * daba 2,57 en la vega · 3,22 en la salina · 3,44 en el carrizal · 3,87 en la duna
   * · 4,96 en el cantil · 5,47 en la marisma. El mínimo son 4,5 —no es texto grande:
   * los dos salen a 13 px en un móvil— así que CUATRO DE SEIS fallaban, y el peor es
   * el número de producción, que es el dato que se lee en cada tirada.
   *
   * El velo de la portada es un degradado a lo alto de una tarjeta y aquí no valdría:
   * lo que hay debajo es una cara concreta y teñirla entera taparía el color que el
   * juego eligió. Lo que sí vale es el PLATO de la pastilla de estado, que es la
   * misma pieza a la escala de una etiqueta: un óvalo oscuro justo detrás de cada
   * texto. Con él, el blanco da entre 13,4:1 y 15,5:1 sobre cualquiera de los seis.
   *
   * Y la cifra de una cara destacada iba en el color que brilla. Se le quitó: ese
   * color no sabe sobre qué relleno va a caer —el juego elige— y el resultado era
   * una cifra violeta sobre un terreno cualquiera. Lo destacado se ve por su
   * contorno, que ahora además se recorta de verdad (`ContornoQueSeVe`).
   */
  return (
    <G pointerEvents="none">
      {cara.rotulo.length > 0 ? (
        <>
          <PlatoDeTexto x={centro.x} base={yRotulo} tam={tamRotulo} letras={cara.rotulo.length} />
          <SvgText
            x={centro.x}
            y={yRotulo}
            fill={SALA.blanco}
            fontSize={tamRotulo}
            textAnchor="middle"
          >
            {cara.rotulo}
          </SvgText>
        </>
      ) : null}
      {cara.cifra.length > 0 ? (
        <>
          <PlatoDeTexto
            x={centro.x}
            base={yCifra}
            tam={tamCifra}
            letras={Math.max(2, cara.cifra.length)}
          />
          <SvgText
            x={centro.x}
            y={yCifra}
            fill={SALA.blanco}
            fontSize={tamCifra}
            fontWeight="bold"
            textAnchor="middle"
          >
            {cara.cifra}
          </SvgText>
        </>
      ) : null}
    </G>
  );
}

/**
 * EL PLATO DE UN TEXTO DE CARA: `SALA.suelo` al 78 % detrás de las letras.
 *
 * Uno por texto y no uno para los dos, por dos razones. La primera es que así cada
 * plato mide lo que mide SU texto —el nombre de un terreno tiene ocho letras y una
 * cifra tiene una o dos— y no queda una banda ancha atravesando el hexágono. La
 * segunda es que a la cifra le sienta bien: un número dentro de un óvalo oscuro es
 * lo que lleva encima cualquier tablero de mesa desde siempre.
 *
 * La caja se estima con el mismo 0,6 por letra que `tamanoDeTexto`, que es lo único
 * que hay: en un SVG de React Native no se puede medir texto. Si la estimación se
 * queda corta, lo que asoma es una letra fuera del plato — feo, no ilegible.
 *
 * El alto va de −0,80 a +0,30 del cuerpo respecto de la línea base, que cubre el
 * alto de mayúscula (~0,72) y la cola de una `j` (~0,21). `rx` a la mitad del alto
 * lo deja en cápsula, que es la forma del plato de la pastilla.
 *
 * Y son esos dos números y no unos más holgados por una cuenta concreta: con el
 * rótulo levantado a 37,6 unidades y la cifra a 61,5 —los valores de un móvil de
 * 390 px—, a −0,86 / +0,38 los dos platos se solapaban tres unidades y el solape
 * salía más oscuro que cada uno, o sea una costura visible entre el nombre y el
 * número. A −0,80 / +0,30 quedan 3,7 unidades de aire entre los dos.
 */
function PlatoDeTexto({
  x,
  base,
  tam,
  letras,
}: {
  x: number;
  base: number;
  tam: number;
  letras: number;
}): JSX.Element {
  const alto = tam * 1.1;
  const ancho = letras * tam * 0.6 + tam * 0.5;
  return (
    <Rect
      x={x - ancho / 2}
      y={base - tam * 0.8}
      width={ancho}
      height={alto}
      rx={alto / 2}
      fill={SALA.suelo}
      fillOpacity={PLATO_DE_LA_CARA}
    />
  );
}

const estilos = StyleSheet.create({
  todo: { flex: 1, backgroundColor: SALA.suelo },
  dentro: { padding: 16, gap: 14 },

  /*
   * El panel del turno, como en la maqueta: teja, un filo de un píxel y el raíl de
   * acento pegado al canto izquierdo. El raíl es un `View` aparte y no un
   * `borderLeftWidth` porque un borde de un solo lado junto a `borderRadius` es
   * justo lo que Android dibuja mal; dos nodos más salen más baratos que un
   * artefacto que sólo se ve en un aparato.
   */
  aviso: {
    backgroundColor: SALA.teja,
    borderWidth: 1,
    borderColor: SALA.filo,
    borderRadius: RADIO.ficha,
    overflow: 'hidden',
    paddingVertical: 13,
    paddingRight: 14,
    /* 15 = los 14 de los otros lados más los 3 del raíl, menos el filo. */
    paddingLeft: 15,
  },
  avisoRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: SALA.acento },
  /*
   * En caja normal, y es la diferencia con los rótulos de aquí abajo: el aviso es
   * una FRASE entera —«Ada levanta choza en la ribera baja»— y no una etiqueta de
   * dos palabras. Un rótulo corto en mayúsculas es un cartel; una frase larga en
   * mayúsculas se lee peor y suena a grito. Lo que hace de cartel aquí es el
   * cuerpo grande y el peso, que es de donde sale la voz según `LETRA`.
   *
   * Y el peso es 600 y no 700: el comentario decía que la voz sale de `LETRA` y
   * luego escribía un peso que `LETRA` no tiene. Los cuatro declarados son 800, 600,
   * 500 y 600 —`muebles.ts`—, así que 700 era una quinta voz inventada en un
   * fichero. 600 y no 800 porque 800 es el del RÓTULO, y esto es una frase.
   */
  avisoTexto: { ...LETRA.cuerpo, color: SALA.palabra, fontSize: 17, fontWeight: '600' },

  /* Los 4 por lado que cuenta MARGENES_DEL_RETABLO: 3 de relleno y 1 de filo. */
  lienzo: {
    backgroundColor: SALA.teja,
    borderWidth: 1,
    borderColor: SALA.filo,
    borderRadius: RADIO.ficha,
    overflow: 'hidden',
    padding: 3,
  },

  botones: { gap: 8 },
  boton: {
    /* Los 44 de dedo que este mismo fichero razona largo para las figuras. */
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: RADIO.mando,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  /*
   * ═══ DISPONIBLE Y NO DISPONIBLE SE DISTINGUEN POR COLOR, NO POR OPACIDAD ═══
   *
   * Lo apagado era `opacity: 0.4` sobre todo el botón. Eso apaga también la letra,
   * y una ayuda de 12 px al 40 % no la lee nadie: es el mismo agujero de contraste
   * que tenía el `neonTenue` de la Sala vieja, que es la flaqueza que este rediseño
   * viene a cerrar. El argumento sigue siendo el bueno; lo que ha cambiado es que ya
   * no vive sólo aquí: es la tabla `BOTON` de `muebles.ts`, escrita después de que
   * el fichero de al lado lo siguiera haciendo mal en dos sitios.
   *
   * ═══ Y ERA UN TERCER BOTÓN, QUE ES LO QUE LA TABLA EXISTE PARA IMPEDIR ═══
   *
   * Lo que había —`tejaAlta` de fondo, borde de acento y rótulo blanco— no era el
   * primario de la casa ni el secundario: era una tercera anatomía, en una pantalla
   * donde ya conviven otras dos. Ahora el que responde es `BOTON.primario` tal cual,
   * que es la única pareja sólida medida en los cuatro temas —tinta `suelo` sobre
   * relleno `acento`: 5,01 en violeta, 9,22 en ámbar, 8,69 en verde, 5,40 en
   * carmesí— y la misma que la tarjeta de la portada usa para «Echar una». El que no
   * responde es `BOTON.quieto`: teja lisa, filo apagado y rótulo en `tenue`, 5,95
   * sobre la teja.
   *
   * LA AYUDA CAMBIA DE TINTA CON EL BOTÓN, y no podía no hacerlo: sobre el relleno
   * de acento, `tenue` se hunde. Va en la misma tinta que el rótulo y la jerarquía
   * la lleva el cuerpo —15 contra 13— y el peso, que es la regla de la casa: la
   * jerarquía no se hace rebajando alfa.
   */
  botonVivo: { backgroundColor: BOTON.primario.fondo, borderColor: BOTON.primario.borde },
  botonApagado: { backgroundColor: BOTON.quieto.fondo, borderColor: BOTON.quieto.borde },
  /*
   * PULSADO: SE HUNDE, NO CAMBIA DE PLANO.
   *
   * Era `backgroundColor: SALA.halo`, o sea que el botón se iba de `tejaAlta` a un
   * acento al 20 % SOBRE EL SUELO y perdía la elevación: el halo de esta casa es
   * «el mismo color casi transparente», una capa que se pone encima y no una
   * superficie que sustituya a la de debajo. Y sobre un botón que ya es de acento
   * pleno no se vería nada.
   *
   * Así que el pulsado es el hundimiento que usa `Pulsable` en el resto de la app
   * —una escala corta—, que no toca ningún color y por tanto no puede romper
   * ninguna de las cifras de arriba.
   */
  botonPulsado: { transform: [{ scale: 0.97 }] },
  /*
   * EL RÓTULO SALE COMO LO ESCRIBIÓ EL JUEGO, sin caja alta.
   *
   * Llevaba `LETRA.rotulo`, que trae `textTransform: 'uppercase'`, y eso hacía dos
   * cosas malas a la vez. La de fondo: este mueble tiene prohibido hablar por encima
   * de las palabras del juego —está escrito en el aviso de arriba— y la caja alta de
   * esta casa se reserva a los textos de la casa. La medible: `accessibilityLabel`
   * lleva `accion.rotulo` sin transformar, así que lo que se veía y lo que se oía no
   * coincidían, que es justo lo que rompe poder decirle a alguien «pulsa PASAR».
   *
   * El peso 600 es el que `LETRA` declara para los rótulos pequeños; lo que hace de
   * rótulo aquí es el cuerpo y el color, no la caja.
   */
  botonRotulo: { ...LETRA.cuerpo, fontWeight: '600', color: BOTON.primario.tinta, fontSize: 15 },
  botonRotuloApagado: { color: BOTON.quieto.tinta },
  /*
   * 13 Y NO 12. La línea de arriba de este fichero declara `TEXTO_MINIMO_PX = 13`
   * con el comentario «lo que hace falta para leer un rótulo en un móvil», y la
   * regla se aplicaba religiosamente al texto de DENTRO del SVG y no al de la propia
   * pantalla. En Riberas esta ayuda es la que explica por qué un trueque no se puede
   * aceptar: la única frase que dice qué hacer cuando un botón no responde.
   */
  botonAyuda: { ...LETRA.cuerpo, color: BOTON.primario.tinta, fontSize: 13, marginTop: 2 },
  botonAyudaApagada: { color: BOTON.quieto.tinta },

  panel: {
    backgroundColor: SALA.teja,
    borderWidth: 1,
    borderColor: SALA.filo,
    borderRadius: RADIO.ficha,
    padding: 12,
    gap: 3,
  },
  /*
   * El título del panel es un rótulo pequeño, y va en `tenue` y no en `cifra`: son
   * 13 px, el mínimo legible que este fichero se impone, y a ese tamaño `cifra`
   * —blanco al 34 %— no llega. `tenue` da 5,95:1 con la misma jerarquía, porque lo
   * que separa al título de sus líneas es la caja alta y el tracking, no lo apagado
   * que esté.
   *
   * LA CIFRA DEL `cifra` ERA 3,4 Y SON 3,11. La decisión no cambia —sigue sin llegar
   * al 4,5 que pide un texto de 13 px— pero el número no se reproducía: componiendo
   * el alfa de blanco al 34 % sobre `SALA.teja` #12161D salen 3,11:1, y 3,03 sobre
   * el suelo. En un repositorio donde los contrastes se citan como medidos, uno que
   * no sale es el que hace dudar de los demás.
   */
  panelTitulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  /*
   * `LETRA.dato` y no `LETRA.cuerpo`: lo que hay dentro de un panel son columnas de
   * cifras —«trigo: 3», «Ana — 4 ptos, 7 bienes»— y `dato` es lo que esta casa
   * declara para eso, con `fontVariant: ['tabular-nums']`, que es lo que hace que
   * los números queden alineados de una línea a la siguiente sin monoespaciada.
   *
   * El `fontVariant` se vuelve a copiar a mano porque en `muebles.ts` la tabla es
   * `as const` y sale de sólo lectura, y `TextStyle` pide una lista mutable. Es un
   * roce de tipos y no una decisión: el valor es el mismo.
   */
  panelLinea: {
    ...LETRA.dato,
    fontVariant: [...LETRA.dato.fontVariant],
    color: SALA.palabra,
    fontSize: 13,
  },
});
