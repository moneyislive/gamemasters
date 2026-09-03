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
  LineaDeTablero,
  MovimientoDeclarado,
  NudoDeTablero,
  TableroDeclarado,
} from '../../../shared/mecanicas/tablero-declarado';
import { LETRA, RADIO, SALA } from './muebles';

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
 */
const MARGENES_DEL_RETABLO = 16 * 2 + (3 + 1) * 2;

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
  const ancho = medido > 0 ? Math.min(medido, porLaVentana) : porLaVentana;

  const alto = altoDelLienzo(ancho, tablero.vista);
  /*
   * La escala real del `meet` de SVG: el MENOR de los dos factores, que es lo que
   * hace el navegador y lo que hace `react-native-svg`. Hasta la primera medida no
   * se sabe nada, y entonces vale 0: los objetivos salen sin engordar en ese
   * primer fotograma y crecen en el siguiente, que es un repintado y no un salto.
   */
  const escala = ancho > 0 ? Math.min(ancho / tablero.vista.ancho, alto / tablero.vista.alto) : 0;

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
      */}
      {tablero.aviso.length > 0 ? (
        <View style={estilos.aviso}>
          <View style={estilos.avisoRail} />
          <Text style={estilos.avisoTexto}>{tablero.aviso}</Text>
        </View>
      ) : null}

      {tablero.caras.length > 0 || tablero.nudos.length > 0 ? (
        <View style={estilos.lienzo} onLayout={medir}>
          <Svg width="100%" height={alto} viewBox={encuadre}>
            {/*
              EL ORDEN DE LAS TRES CAPAS ES LA ÚNICA REGLA DE PINTADO QUE HAY AQUÍ,
              y no es estética: en SVG lo que se dibuja después tapa a lo anterior.
              Las caras son grandes y van debajo; las líneas cruzan por encima de
              ellas; los nudos son pequeños y tienen que quedar visibles sobre las
              dos. Al revés, las piezas desaparecerían debajo del terreno y la
              pantalla parecería no responder a los toques.
            */}
            <G>
              {tablero.caras.map((cara) => (
                <Polygon
                  key={cara.id}
                  points={cara.puntos.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill={cara.relleno}
                  /*
                   * El relleno y el borde son del juego; el borde se le quita
                   * SÓLO cuando hay que decir «ésta, ahora mismo», que es estado
                   * y no color. El acento va en el contorno y no en la cara: el
                   * contorno cae entre el relleno del juego y lo que hay debajo,
                   * que es terreno de la Sala, y el relleno no.
                   */
                  stroke={cara.destacada ? SALA.acento : cara.borde}
                  strokeWidth={cara.destacada ? 6 : 2}
                  onPress={cara.toque === null || quieto ? undefined : () => alTocar(cara.toque as MovimientoDeclarado)}
                />
              ))}
            </G>
            <G>
              {tablero.lineas.map((linea) => (
                <Line
                  key={linea.id}
                  x1={linea.desde.x}
                  y1={linea.desde.y}
                  x2={linea.hasta.x}
                  y2={linea.hasta.y}
                  /* Acento = se puede tocar. Si no, el color que declaró el juego. */
                  stroke={linea.toque !== null ? SALA.acento : linea.color}
                  strokeWidth={linea.toque !== null ? Math.max(linea.grosor, 8) : linea.grosor}
                  strokeLinecap="round"
                  opacity={linea.tenue && linea.toque === null ? 0.45 : 1}
                  onPress={linea.toque === null || quieto ? undefined : () => alTocar(linea.toque as MovimientoDeclarado)}
                />
              ))}
            </G>
            <G>
              {tablero.caras.map((cara) => (
                <CifraDeLaCara key={`cifra-${cara.id}`} cara={cara} escala={escala} />
              ))}
            </G>
            {/*
              EL CONTORNO DE UN NUDO DICE SI RESPONDE, y nada más.

              Pulsable, el acento. Quieto, el filo de la Sala: un píxel de blanco
              muy bajo que despega la pieza de lo que tenga debajo. Aquí había un
              `#10141b` escrito a mano, un gris de fondo haciendo de borde; era casi
              del color del suelo, así que sobre el suelo no separaba nada y sobre
              una cara clara era una mancha oscura. El filo va con alfa justamente
              para servir sobre las tres cosas —el suelo, el panel y el relleno que
              declare el juego— sin tener que declarar tres colores.
            */}
            <G>
              {tablero.nudos.map((nudo) =>
                nudo.forma === 'cuadrado' ? (
                  <Rect
                    key={nudo.id}
                    x={nudo.punto.x - nudo.radio}
                    y={nudo.punto.y - nudo.radio}
                    width={nudo.radio * 2}
                    height={nudo.radio * 2}
                    fill={nudo.color}
                    stroke={nudo.toque !== null ? SALA.acento : SALA.filo}
                    strokeWidth={nudo.toque !== null ? 5 : 2}
                    onPress={nudo.toque === null || quieto ? undefined : () => alTocar(nudo.toque as MovimientoDeclarado)}
                  />
                ) : (
                  <Circle
                    key={nudo.id}
                    cx={nudo.punto.x}
                    cy={nudo.punto.y}
                    r={nudo.radio}
                    fill={nudo.color}
                    stroke={nudo.toque !== null ? SALA.acento : SALA.filo}
                    strokeWidth={nudo.toque !== null ? 5 : 2}
                    opacity={nudo.tenue && nudo.toque === null ? 0.4 : 1}
                    onPress={nudo.toque === null || quieto ? undefined : () => alTocar(nudo.toque as MovimientoDeclarado)}
                  />
                ),
              )}
            </G>

            {/*
              ═══ LA CAPA DE LOS DEDOS, QUE NO SE VE Y ES LA QUE SE TOCA ═══

              Va la última a propósito: en SVG lo de después tapa a lo de antes
              también para los toques, así que estas figuras —invisibles y mucho
              más grandes que las pintadas— son las que reciben el dedo. Las de
              arriba conservan su `onPress` como red de seguridad para el primer
              fotograma, cuando todavía no se ha medido el ancho y no hay escala.

              El remedio habitual en React Native es `hitSlop`, y `react-native-svg`
              no lo tiene: el área sensible de una figura es la figura. Así que se
              dibuja una figura aparte, del tamaño del dedo y no del tamaño del
              dibujo, con opacidad casi nula —pintada, que es lo que la hace
              sensible, e invisible, que es lo que hace que no estorbe—.

              Y primero las líneas y después los nudos, por la misma regla: cuando
              las dos áreas se solapan, gana el nudo. Es lo correcto porque un nudo
              es un punto y una vereda es un trazo largo: quien apunta a un cruce
              apunta fino, y quien apunta a una orilla tiene toda su longitud.

              Estas dos figuras se pintan del color del suelo, y no porque se vea:
              a opacidad 0,001 no se ve ninguno. Es para el día en que alguien suba
              esa opacidad para depurar —hay que hacerlo para creerse dónde está el
              área— y para que lo que salga entonces sea la sala y no un borrón
              negro encima del tablero.
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
                    stroke={SALA.suelo}
                    strokeOpacity={0.001}
                    strokeWidth={grosorParaElDedo(linea, escala)}
                    strokeLinecap="round"
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
                    fill={SALA.suelo}
                    fillOpacity={0.001}
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
                {accion.ayuda.length > 0 ? <Text style={estilos.botonAyuda}>{accion.ayuda}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {tablero.paneles.map((panel) => (
        <View key={panel.titulo} style={estilos.panel}>
          <Text style={estilos.panelTitulo}>{panel.titulo}</Text>
          {panel.lineas.map((linea, i) => (
            <Text key={`${panel.titulo}-${String(i)}`} style={estilos.panelLinea}>
              {linea}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// LAS TRES CUENTAS QUE CONVIERTEN «UNIDADES DEL JUEGO» EN «PÍXELES DE UN DEDO»
// ---------------------------------------------------------------------------

/**
 * El alto que hay que darle al lienzo para que el tablero salga a su proporción.
 *
 * Con el ancho todavía sin medir se devuelve el suelo, que es lo que había antes
 * clavado: la primera pintura sale como salía y la segunda —un repintado, no un
 * salto— ya sale a proporción.
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
 * EL TAMAÑO DE UN TEXTO SOBRE EL TABLERO, entre lo que se lee y lo que cabe.
 *
 * El juego declara un tamaño pensando en las unidades de su encuadre, y no puede
 * saber a cuántos píxeles va a salir: eso sólo lo sabe la pantalla. Con el rótulo
 * de un terreno a 22 unidades y una escala de 0,33, lo que se leía eran siete
 * píxeles. Así que aquí se crece hasta lo legible, con un tope: la anchura que
 * tiene la figura donde va escrito, repartida entre las letras que hay. Un rótulo
 * que se sale de su hexágono es tan inútil como uno que no se ve.
 *
 * El 0,6 es la anchura media de una letra en tipografía de palo seco medida en
 * «emes». No hay forma de medir texto de verdad dentro de un SVG de React Native,
 * y una aproximación con su número escrito es mejor que un número mágico.
 */
function tamanoDeTexto(base: number, escala: number, anchoDeLaFigura: number, letras: number): number {
  if (escala <= 0) return base;
  const necesario = TEXTO_MINIMO_PX / escala;
  const cabe = anchoDeLaFigura / Math.max(2, letras) / 0.6;
  return Math.max(base, Math.min(necesario, Math.max(base, cabe)));
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
  escala,
}: {
  cara: TableroDeclarado['caras'][number];
  escala: number;
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
  const tamRotulo = tamanoDeTexto(22, escala, anchoDeLaCara, cara.rotulo.length);
  const tamCifra = tamanoDeTexto(36, escala, anchoDeLaCara, Math.max(2, cara.cifra.length));
  /*
   * ═══ LOS DOS TEXTOS VAN EN BLANCO SIEMPRE, TAMBIÉN EL DE UNA CARA DESTACADA ═══
   *
   * Van escritos ENCIMA del relleno que declaró el juego, que puede ser cualquier
   * color: es la misma situación que la placa de la Sala, donde el texto sobre el
   * campo de color va en `blanco` y no en `palabra`.
   *
   * Y la cifra de una cara destacada iba en el color que brilla. Se le quita, que
   * es lo único de aquí que cambia de aspecto y no sólo de nombre: ese color no
   * sabe sobre qué relleno va a caer —el juego elige— y el resultado era una cifra
   * violeta sobre un terreno cualquiera, sin contraste que nadie pudiera prometer.
   * Lo destacado se sigue viendo, y mejor: el contorno del polígono pasa de 2 a 6
   * en acento, y ése sí cae en terreno de la Sala.
   */
  return (
    <G>
      {cara.rotulo.length > 0 ? (
        <SvgText
          x={centro.x}
          y={centro.y - tamRotulo * 0.4}
          fill={SALA.blanco}
          fontSize={tamRotulo}
          textAnchor="middle"
        >
          {cara.rotulo}
        </SvgText>
      ) : null}
      {cara.cifra.length > 0 ? (
        <SvgText
          x={centro.x}
          y={centro.y + tamCifra * 0.8}
          fill={SALA.blanco}
          fontSize={tamCifra}
          fontWeight="bold"
          textAnchor="middle"
        >
          {cara.cifra}
        </SvgText>
      ) : null}
    </G>
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
   */
  avisoTexto: { ...LETRA.cuerpo, color: SALA.palabra, fontSize: 17, fontWeight: '700' },

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
   * viene a cerrar. Ahora el que responde se levanta un escalón —`tejaAlta`— y se
   * ciñe con el acento, que aquí quiere decir exactamente «esto se puede tocar»; el
   * que no responde se queda en la teja con su filo, y su rótulo baja a `tenue`,
   * que sobre la teja sigue estando muy por encima del mínimo legible.
   */
  botonVivo: { backgroundColor: SALA.tejaAlta, borderColor: SALA.acento },
  botonApagado: { backgroundColor: SALA.teja, borderColor: SALA.filo },
  /* Pulsado: el halo es el acento casi transparente, o sea el botón encendido. */
  botonPulsado: { backgroundColor: SALA.halo },
  botonRotulo: { ...LETRA.rotulo, color: SALA.blanco, fontSize: 15 },
  botonRotuloApagado: { color: SALA.tenue },
  botonAyuda: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 12, marginTop: 2 },

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
   * —blanco al 34 %— se queda en 3,4:1 sobre la teja. `tenue` da casi 6:1 con la
   * misma jerarquía, porque lo que separa al título de sus líneas es la caja alta
   * y el tracking, no lo apagado que esté.
   */
  panelTitulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  panelLinea: { ...LETRA.cuerpo, color: SALA.palabra, fontSize: 13 },
});
