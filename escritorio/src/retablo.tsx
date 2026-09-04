/**
 * EL MUEBLE `tablero`, pintado con SVG de verdad.
 *
 * ═══ QUÉ PINTA, Y DE DÓNDE SALE CADA COSA ═══
 *
 * De `TableroDeclarado`, que viaja DENTRO de la proyección y llega ya resuelto:
 * el juego hizo las coordenadas, eligió los colores y escribió, dentro de cada
 * pieza, el movimiento que se manda al tocarla. Aquí no se calcula ni una
 * posición ni se decide ni un color.
 *
 * Y por eso este fichero NO CONOCE NINGÚN JUEGO. No sabe qué es un hexágono, ni
 * una casilla, ni una pieza, ni un camino: sabe que hay caras (polígonos),
 * líneas (segmentos) y nudos (puntos), que algunas tienen `toque` y otras no, y
 * que se pintan en ese orden. Si aquí apareciera el nombre de algo que se juega,
 * este dejaría de ser un mueble y sería la pantalla de un juego — y el siguiente
 * arcade que llegara por `ARCADES_EXTERNOS` necesitaría que alguien de esta casa
 * le escribiera la suya.
 *
 * El aplanado y el orden de capas están en `plan.ts`, fuera de React, para que
 * se puedan contar desde un comprobador. Este fichero es el pincel.
 *
 * ═══ TRES FRASES QUE ESTABAN AQUÍ Y ERAN FALSAS ═══
 *
 * Se dicen enteras porque las tres se creyeron, y una de ellas se creyó POR
 * ESCRITO en el fichero hermano: `app/src/arcade/retablo.tsx:670-684` cita esta
 * cabecera como el estado del arte que la app tenía que alcanzar.
 *
 *   1. «Las piezas tocables son `<button>` de verdad envueltos en `<g>`». No lo
 *      eran ni lo son: dentro de un `<svg>` no hay ningún `<button>` —HTML dentro
 *      de SVG sólo entra por `<foreignObject>`, que trae su propia caja y su
 *      propio reflujo— así que lo que hay es `<g role="button" tabIndex>`, que se
 *      tabula y se dispara igual pero NO es un botón nativo. Se dice porque la
 *      diferencia se paga en atributos que hay que poner a mano: el estado
 *      apagado (`aria-disabled`) y el `preventDefault` de la barra.
 *   2. «No hay área de toque mínima de 44 px: hay un ratón, que apunta a un
 *      píxel». El ratón apunta a un píxel DE PANTALLA, y lo que encoge es la
 *      figura entera al pasar por el `viewBox`. Medido en la colocación de
 *      Riberas —encuadre 1012,82 × 920, lienzo de 449 px— una vereda ofrecida de
 *      grosor 3 salía a 1,33 px de ancho. Ahora una línea que se ofrece no baja de
 *      4 px, que es el suelo de la casa; los 24×24 px del SC 2.5.8 siguen sin
 *      alcanzarse y el motivo está abajo, en `figuraDe`.
 *   3. «El tablero manda en el alto y se le da todo el que quepa en la ventana».
 *      Con `max-height` en `vh` pasaba justo lo contrario, y quien lo arregló fue
 *      la hoja (`.lienzo-del-tablero`): el alto va en `rem` —para que crezca al
 *      ampliar la página— y las franjas vacías se quitan limitando el ANCHO a
 *      `alto × razón`. La razón la sabe el dato y la pone este fichero.
 *
 * ═══ LO QUE ESTE FICHERO LE DEBE A LA HOJA, Y AL REVÉS ═══
 *
 * Dos variables, porque las dos dependen de números que sólo se conocen aquí:
 *
 *   · `--razon-del-tablero` = `vista.ancho / vista.alto`, para el tope de ancho.
 *   · `--cuerpo-de-cara`, porque `font-size` dentro de un `viewBox` son UNIDADES
 *     DEL ENCUADRE y no píxeles: las 14 de reserva salen a 6,21 px en una ventana
 *     de 1280×600, y el suelo de esta casa son 13. Sólo quien mide el `<svg>`
 *     renderizado puede convertir una cosa en la otra.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type {
  MovimientoDeclarado,
  PuntoDeTablero,
  TableroDeclarado,
} from '../../shared/mecanicas/tablero-declarado';
import type { PiezaPintada } from './plan';
import { encuadreDe, loQueSePinta } from './plan';

export interface QueSePintaAqui {
  tablero: TableroDeclarado;
  alTocar: (movimiento: MovimientoDeclarado) => void;
  quieto: boolean;
}

/** El cuerpo de reserva de `.texto-de-cara`, en unidades del encuadre. */
const CUERPO_DE_CARA = 14;
/** El suelo de letra de esta casa: `--letra-minima` son 13 px. */
const TEXTO_MINIMO_PX = 13;
/** Ancho medio de un glifo respecto de su cuerpo, para saber si un rótulo cabe. */
const ANCHO_DE_GLIFO = 0.6;
/**
 * LOS TRAZOS, EN PÍXELES DE PANTALLA, y son los cuatro de la tabla de la app
 * (`TRAZO` en `app/src/arcade/retablo.tsx`): filo 1, acento 3, halo 1,5, ofrecida
 * 4. Escritos en unidades del encuadre no querrían decir nada —a la escala de
 * Riberas en una ventana de 1280×600, que es 0,4435, un trazo de 1 unidad sale a
 * 0,44 px y el antialias lo reparte hasta hacerlo desaparecer— así que se
 * declaran en píxeles y los convierte `enUnidades`.
 */
const TRAZO_FILO_PX = 1;
const TRAZO_ACENTO_PX = 3;
const TRAZO_HALO_PX = 1.5;
const TRAZO_OFRECIDA_PX = 4;

export function Retablo({ tablero, alTocar, quieto }: QueSePintaAqui): JSX.Element {
  const piezas = loQueSePinta(tablero);

  /*
   * ═══ EL ANCHO RENDERIZADO, QUE ES EL NÚMERO QUE FALTABA ═══
   *
   * Todo lo que este mueble dibuja está en unidades del encuadre que declara el
   * juego, y la escala que las convierte en píxeles —ancho del `<svg>` entre
   * `vista.ancho`— no la sabe ni el juego ni la hoja: sólo el navegador, después
   * de colocar la caja. Sin ella, «13 px de letra» y «2 px de trazo» no se pueden
   * escribir.
   *
   * Va con `ResizeObserver` sobre el propio `<svg>` y no con el tamaño de la
   * ventana, porque la columna del mueble cambia sin que la ventana cambie: entra
   * alguien en la mesa, crece el carril lateral, y el lienzo se estrecha.
   *
   * El nodo se recoge con una función de referencia guardada en estado, y no con
   * `useRef`, para que el efecto vuelva a correr cuando el `<svg>` aparece: un
   * tablero declarado y vacío no lo pinta, y en cuanto la partida reparte algo el
   * nodo es otro.
   *
   * Con cero —al pintar en el servidor, o antes de la primera medida— la escala
   * se declara desconocida y todo se queda exactamente como estaba: 14 unidades
   * de letra y trazos en unidades. Se degrada al comportamiento viejo.
   */
  const [lienzo, setLienzo] = useState<SVGSVGElement | null>(null);
  const [anchoEnPx, setAnchoEnPx] = useState(0);
  useEffect(() => {
    if (lienzo === null) return;
    const medir = (): void => {
      setAnchoEnPx(lienzo.getBoundingClientRect().width);
    };
    medir();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => {
        window.removeEventListener('resize', medir);
      };
    }
    const ojo = new ResizeObserver(medir);
    ojo.observe(lienzo);
    return () => {
      ojo.disconnect();
    };
  }, [lienzo]);

  /*
   * EL ENCUADRE TAMBIÉN LLEGA POR EL CABLE. `esTableroDeclarado` comprueba que
   * `ancho` y `alto` sean números y no mira ni `x` ni `y` ni la finitud de nada,
   * así que un `viewBox` puede salir «undefined 0 NaN 100». Un `viewBox` inválido
   * no da error: el navegador lo descarta entero y el dibujo sale en unidades
   * crudas, sin encuadre y casi siempre fuera de la caja. Se comprueba aquí y, si
   * no está sano, no se pone el atributo — que es lo mismo que hará el navegador,
   * pero dicho.
   */
  const v = tablero.vista;
  const encuadreSano =
    esMedida(v.x) &&
    esMedida(v.y) &&
    esMedida(v.ancho) &&
    esMedida(v.alto) &&
    v.ancho > 0 &&
    v.alto > 0;

  const escala = encuadreSano && anchoEnPx > 0 ? anchoEnPx / v.ancho : 0;
  const enUnidades = (px: number): number => (escala > 0 ? px / escala : px);

  /*
   * LA CRECIDA DEL TEXTO. Cuánto hay que multiplicar las 14 unidades de reserva
   * para que el rótulo salga a 13 px de pantalla. Medido con Riberas en una
   * ventana de 1280×600: el lienzo mide 449 px (el tope de ancho que impone la
   * razón 1,1009 sobre un alto de 24rem = 408 px), la escala es 0,4435, y las 14
   * unidades salen a 6,21 px. Para llegar a 13 hacen falta 29,3 unidades, o sea
   * una crecida de 2,09.
   */
  const crecida = escala > 0 ? Math.max(1, TEXTO_MINIMO_PX / (CUERPO_DE_CARA * escala)) : 1;

  /*
   * LAS DOS VARIABLES QUE LA HOJA ESPERA. Las dos tienen valor de reserva allí, así
   * que no ponerlas deja el comportamiento de siempre y no rompe nada; se ponen
   * sólo cuando se sabe algo que la hoja no puede saber.
   *
   *   · `--razon-del-tablero` quita las franjas de teja vacía a los lados: con
   *     `xMidYMid meet`, cuando el techo de alto muerde, el dibujo se centra y
   *     sobra anchura. En una ventana de 1280×600 sobraban 406 px de los 816 de la
   *     caja, o sea la mitad. Limitando el ANCHO a `alto × razón` no queda nada que
   *     recortar.
   *   · `--cuerpo-de-cara` sube el texto de las caras hasta los 13 px de la casa.
   *     Va aquí la crecida GENERAL, y cada cara la vuelve a bajar si su propia
   *     figura no da para tanto — ver `textoDeCara`. Un objeto de estilo con
   *     propiedades personalizadas no cabe en `CSSProperties`, que sólo conoce las
   *     propiedades con nombre; de ahí la conversión, que es la única de todo el
   *     fichero.
   */
  const variables: Record<string, string> = {};
  if (encuadreSano) variables['--razon-del-tablero'] = (v.ancho / v.alto).toFixed(4);
  if (crecida > 1) variables['--cuerpo-de-cara'] = `${(CUERPO_DE_CARA * crecida).toFixed(2)}px`;

  return (
    <div className="retablo">
      {/*
        EL AVISO ES UNA REGIÓN VIVA, y no un `<p>` cualquiera. Esta pantalla
        SONDEA la mesa: la frase cambia sola —le toca a otro, se tiró un ocho, ha
        ganado alguien— sin que quien mira haya tocado nada, que es la definición
        exacta de una región viva. Sin esto, con lector de pantalla hay que ir a
        buscar el párrafo con el cursor para enterarse de que el turno cambió. La
        app arregló esto mismo y dejó escrito el síntoma; aquí cuesta un atributo,
        porque hay DOM.
      */}
      {tablero.aviso.length > 0 ? (
        <p className="aviso-del-tablero" aria-live="polite">
          {tablero.aviso}
        </p>
      ) : null}

      {piezas.length === 0 ? (
        /*
         * Un tablero declarado y VACÍO no es un fallo: es una partida que aún no
         * ha repartido nada. Se dice, porque un recuadro en negro sin una
         * palabra se lee como que la página está rota.
         */
        <p className="nada-que-hacer">Este tablero todavía no tiene nada dibujado.</p>
      ) : (
        /*
         * ═══ AQUÍ PONÍA `role="img"`, Y ESO MATABA EL TABLERO ENTERO ═══
         *
         * `img` está en la lista ARIA de roles con «presentational children»: el
         * navegador PODA el subárbol de accesibilidad. Los `role="button"` con su
         * `aria-label` que hay dentro dejaban de existir para un lector, y lo
         * único que quedaba era una imagen sin nombre — mientras los `tabIndex`
         * seguían dando parada de tabulador. O sea que se podía tabular por las
         * ~126 piezas de una colocación de Riberas (54 nudos + 72 aristas) oyendo
         * silencio en todas. Con los botones de `AccionesDelTablero` fuera del
         * SVG y por tanto audibles, el resultado era exacto: se podía tirar los
         * dados y no se podía construir.
         *
         * `group` es el rol que agrupa SIN podar, y con nombre para que la parada
         * diga dónde está una.
         */
        <svg
          ref={setLienzo}
          className="lienzo-del-tablero"
          viewBox={encuadreSano ? encuadreDe(tablero) : undefined}
          role="group"
          aria-label="El tablero"
          preserveAspectRatio="xMidYMid meet"
          style={variables as CSSProperties}
        >
          {enOrdenDePintado(piezas).map((p) => {
            const figura = figuraDe(p, quieto, enUnidades);
            if (figura === null) return null;

            /*
             * Una pieza con `toque` es tocable; una sin él, no. La decisión no
             * se toma aquí: viene escrita en el dato. Y `quieto` la apaga
             * temporalmente mientras hay una petición en vuelo, para que dos
             * clics seguidos no manden dos movimientos sobre la misma revisión.
             */
            const toque = p.toque;
            if (toque === null) {
              return (
                <g key={`${p.clase}:${p.id}`} className={`pieza pieza-${p.clase}`}>
                  {figura}
                </g>
              );
            }
            return (
              <g
                key={`${p.clase}:${p.id}`}
                className={`pieza pieza-${p.clase} pieza-tocable${quieto ? ' pieza-quieta' : ''}`}
                role="button"
                tabIndex={quieto ? -1 : 0}
                /*
                 * `aria-disabled` y no sólo el `tabIndex`: una pieza quieta perdía
                 * la parada de tabulador pero seguía anunciándose como un botón
                 * normal, así que con lector se ofrecía pulsar algo que no hacía
                 * nada. Un `<button>` nativo tendría `disabled` y no haría falta;
                 * un `<g role="button">` no lo tiene.
                 */
                aria-disabled={quieto ? true : undefined}
                aria-label={nombreParaElLector(p)}
                onClick={() => {
                  if (!quieto) alTocar(toque);
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  /*
                   * El `preventDefault` va ANTES de mirar `quieto`. Estaba
                   * después, así que la barra sobre una pieza quieta no hacía el
                   * movimiento —correcto— pero sí desplazaba la página: con un
                   * movimiento en vuelo, pulsar espacio saltaba media pantalla
                   * hacia abajo y había que volver a buscar el tablero.
                   */
                  e.preventDefault();
                  if (quieto) return;
                  alTocar(toque);
                }}
              >
                {figura}
              </g>
            );
          })}

          {/*
            ═══ LOS TEXTOS, EN SU PROPIA CAPA Y LOS ÚLTIMOS ═══

            Estaban dentro del mismo `<g>` que su polígono, y `loQueSePinta` pone
            TODAS las líneas después de TODAS las caras: en una malla hexagonal
            eso significa que la primera vereda que cruza una isla pinta encima de
            su nombre y de su número. Sacarlos a una capa propia es lo que la app
            hizo y dejó razonado.

            No se pierde nada al sacarlos del grupo tocable: el nombre para el
            lector va en el `aria-label` del grupo —que lo compone con estos mismos
            rótulo y cifra— y la hoja les pone `pointer-events: none`, así que el
            clic atraviesa el texto y lo recibe el polígono de debajo igual que
            antes.
          */}
          {piezas.map((p) => (p.clase === 'cara' ? textoDeCara(p, crecida) : null))}
        </svg>
      )}
    </div>
  );
}

/**
 * EL ORDEN DE PINTADO, que es el de `plan.ts` con una sola corrección.
 *
 * ═══ POR QUÉ LA CARA DESTACADA SE PINTA LA ÚLTIMA DE LAS CARAS ═══
 *
 * El realce de una cara es su propio contorno, y en una malla los hexágonos
 * COMPARTEN arista: un trazo se reparte mitad dentro y mitad fuera, y el relleno
 * del vecino —que se pinta después— borra la mitad de fuera. Con el realce
 * pintado en medio del bucle, lo que quedaba era un contorno a trozos.
 *
 * Se arregla moviendo la cara destacada al final de su propia capa, que es la
 * misma idea que la app resolvió con una capa aparte de contornos. Aquí se mueve
 * la cara entera y no sólo su borde porque la comprobación de
 * `verificar-escritorio` exige UN polígono por cara y ni uno más — ver
 * `figuraDe`. Las caras de un tablero teselan, así que moverla no tapa nada; y
 * si un juego declarara caras superpuestas, la que se ve encima sería justamente
 * la destacada, que es lo que se quería.
 */
function enOrdenDePintado(piezas: readonly PiezaPintada[]): PiezaPintada[] {
  const capa = (p: PiezaPintada): number =>
    p.clase === 'cara' ? (p.destacada ? 1 : 0) : p.clase === 'linea' ? 2 : 3;
  return [...piezas].sort((a, b) => capa(a) - capa(b));
}

/**
 * LA FIGURA DE UNA PIEZA, con todas las guardias sobre lo que llegó por el cable.
 *
 * ═══ POR QUÉ HAY QUE MIRAR AQUÍ, SI YA HAY UN `esTableroDeclarado` ═══
 *
 * Porque comprueba lo que dice comprobar y ni una cosa más: que las cuatro listas
 * sean listas. Su propio comentario lo dice —«no comprueba cada punto de cada
 * polígono»— y este fichero leía después el interior campo a campo. Cinco de esas
 * lecturas no pintaban a medias: reventaban. `p.puntos.map` sobre una cara sin
 * puntos es `Cannot read properties of undefined`, y lo que sale por ahí no es un
 * `<svg>` roto: es `RedDeSeguridad` y la Sala entera abajo, catálogo incluido, por
 * culpa de una mesa. Y el caso no es de laboratorio: este mueble existe
 * exactamente para servir a un arcade que nadie de esta casa compiló.
 *
 * Una pieza que llegó rota no se dibuja, y la de al lado se dibuja igual.
 *
 * ═══ Y AQUÍ ENTRA EL ACENTO, QUE ES LO QUE NO ENTRABA ═══
 *
 * Lo tocable se decía SÓLO con el cursor y con un `brightness(1.35)` al pasar el
 * ratón por encima. La cabecera lo defendía —hay ratón, y el `hover` es
 * información que en un móvil no existe— y es verdad a medias: sin ratón no
 * quedaba ninguna marca permanente que distinguiera una pieza que responde de una
 * que no. Ni con teclado, ni con lector, ni en un portátil táctil. En esta Sala el
 * acento significa exactamente una cosa —«esto se puede tocar»— y en el único
 * sitio donde de verdad se toca algo no aparecía.
 *
 * Se trae lo que la app ya hace, pieza por pieza: contorno de acento en lo que
 * responde, filo apagado en lo que no, y una línea ofrecida que nunca baja de
 * TRAZO_OFRECIDA_PX.
 *
 * ═══ LO QUE SIGUE SIN ARREGLARSE, Y POR QUÉ ═══
 *
 * El ÁREA SENSIBLE sigue siendo la figura pintada. Con las líneas ofrecidas a 4 px
 * se pasa de 1,33 px de ancho útil a 4, que es tres veces más y sigue siendo la
 * tercera parte de los 24×24 px CSS que pide el SC 2.5.8 (un criterio de puntero,
 * no de dedo: también aplica con ratón). La única forma de llegar sin deformar el
 * dibujo es la de la app: una segunda figura invisible y más gorda encima de la de
 * verdad. No entra porque `verificar-escritorio.tsx` cuenta UNA `<line>` por línea
 * declarada, UN `<polygon>` por cara y UNA figura por nudo, y esas tres
 * comprobaciones se pondrían rojas — y ese fichero no es de quien escribe esto. Es
 * un arreglo de dos ficheros, no de uno.
 */
function figuraDe(
  p: PiezaPintada,
  quieto: boolean,
  enUnidades: (px: number) => number,
): JSX.Element | null {
  if (p.clase === 'cara') {
    const puntos = puntosSanos(p.puntos);
    if (puntos === null) return null;
    /*
     * ═══ EL REALCE, DE DOS COLORES Y NO DE UNO ═══
     *
     * Era `stroke={p.borde}` a tres unidades en vez de una: el MISMO color, un
     * poco más gordo. Con el borde que declara Riberas (#1d1f26) eso son 0,44 px
     * contra 1,33 px de una raya que además se recorta de sus propios rellenos
     * por 2,78 (marisma), 3,07 (cantil) y 3,93 (duna) — tres de los seis
     * terrenos por debajo del 3:1. Se tiraba un ocho y el hexágono que producía
     * lo decía con eso.
     *
     * Ahora es acento, que es lo único que en esta Sala significa «mira aquí», y
     * con un halo de `--suelo` debajo. Dos colores porque NINGÚN color fijo puede
     * prometer contraste contra un relleno que declara un juego que no
     * conocemos: el acento contra los seis terrenos da entre 1,01 (carmesí sobre
     * carrizal: literalmente el mismo color) y 2,76. El halo sí: `--suelo` se
     * recorta de los seis por 3,35 a 7,11, y el acento se recorta del halo por
     * 5,01 / 9,22 / 8,69 / 5,40 en los cuatro temas. Se ve el borde por dentro o
     * por fuera, pero se ve.
     *
     * Va en `style` y no en el atributo `stroke` porque `var()` no se sustituye
     * dentro de un atributo de presentación; en una declaración CSS, sí.
     *
     * El halo es un `drop-shadow` y no un segundo polígono por lo dicho arriba:
     * aquí sólo cabe una figura por cara. Un desenfoque reparte su color a lo
     * largo del radio que se le da, así que se apilan dos del mismo halo para que
     * lo que asoma pegado al acento sea `--suelo` y no un gris a medias.
     */
    const halo = enUnidades(TRAZO_HALO_PX * 2).toFixed(2);
    return (
      <polygon
        points={puntos.map((q) => `${String(q.x)},${String(q.y)}`).join(' ')}
        fill={pintura(p.relleno)}
        stroke={p.destacada ? undefined : pintura(p.borde)}
        strokeWidth={enUnidades(p.destacada ? TRAZO_ACENTO_PX : TRAZO_FILO_PX)}
        style={
          p.destacada
            ? {
                stroke: 'var(--acento)',
                filter: `drop-shadow(0 0 ${halo}px var(--suelo)) drop-shadow(0 0 ${halo}px var(--suelo))`,
              }
            : undefined
        }
      />
    );
  }

  if (p.clase === 'linea') {
    if (!esPunto(p.desde) || !esPunto(p.hasta)) return null;
    /*
     * UNA LÍNEA QUE SE OFRECE NO BAJA DE CUATRO PÍXELES, y no se apaga aunque
     * venga `tenue`. En Riberas la vereda que hay que trazar es exactamente la que
     * el juego marca como tenue —tenue quiere decir «de nadie todavía»— así que lo
     * único que hay que pulsar era también lo más pálido y lo más fino del dibujo:
     * grosor 3, o sea 1,33 px de ancho, al 35 % de alfa. Ahora sale a 4 px opaca y
     * con el acento encima. Sigue por debajo de la vereda de un dueño, que va a 10
     * unidades = 4,44 px, así que la jerarquía del juego se conserva.
     */
    const ofrecida = p.toque !== null;
    const responde = ofrecida && !quieto;
    const grosor = esMedida(p.grosor) && p.grosor > 0 ? p.grosor : enUnidades(TRAZO_FILO_PX);
    return (
      <line
        x1={p.desde.x}
        y1={p.desde.y}
        x2={p.hasta.x}
        y2={p.hasta.y}
        stroke={pintura(p.color)}
        strokeWidth={ofrecida ? Math.max(grosor, enUnidades(TRAZO_OFRECIDA_PX)) : grosor}
        strokeLinecap="round"
        strokeOpacity={p.tenue && !ofrecida ? ALFA_TENUE : 1}
        style={responde ? { stroke: 'var(--acento)' } : undefined}
      />
    );
  }

  if (!esPunto(p.punto) || !esMedida(p.radio) || p.radio <= 0) return null;
  /*
   * EL FILO DE UN NUDO, que aquí no existía: los nudos eran `fill` y nada más.
   * El que responde lleva `--acento` y el que no, `--filo`, que separa POCO y se
   * sabe: blanco al 7,5 % da 1,22:1 sobre la teja del lienzo, y ningún color fijo
   * puede prometer 3:1 contra un relleno que declara un arcade de fuera. Se paga
   * el contorno de verdad donde significa algo —el acento— y no en las decenas de
   * cruces quietos de un tablero. Es la misma decisión de la app, con sus mismos
   * números.
   */
  const ofrecido = p.toque !== null;
  const responde = ofrecido && !quieto;
  const filo: CSSProperties = { stroke: responde ? 'var(--acento)' : 'var(--filo)' };
  const grosorDelFilo = enUnidades(responde ? TRAZO_ACENTO_PX : TRAZO_FILO_PX);
  const tinta = {
    fill: pintura(p.color),
    fillOpacity: p.tenue && !ofrecido ? ALFA_TENUE : 1,
    strokeWidth: grosorDelFilo,
    style: filo,
  };
  if (p.forma === 'cuadrado') {
    return (
      <rect
        x={p.punto.x - p.radio}
        y={p.punto.y - p.radio}
        width={p.radio * 2}
        height={p.radio * 2}
        {...tinta}
      />
    );
  }
  return <circle cx={p.punto.x} cy={p.punto.y} r={p.radio} {...tinta} />;
}

/**
 * LO TENUE SE APAGA CON EL ALFA DE LA TINTA, NO CON EL DEL NODO.
 *
 * `opacity` sobre el nodo entero multiplica también el alfa del borde, así que
 * ahora que un nudo tiene filo apagaría las dos cosas a la vez y dos veces. La app
 * pasó a `fillOpacity`/`strokeOpacity` por esto mismo y lo dejó escrito.
 *
 * Y el número sube de 0,35 al 0,45 de la app —que en sus nudos usa 0,40; aquí es
 * uno solo y es el más alto de los dos, porque de lo que se trata es de restar
 * menos—. Medido sobre la teja del lienzo: la vereda libre de Riberas (#3a3f4b)
 * pasa de 1,17 a 1,23 y el cruce libre (#5a6070) de 1,37 a 1,53; los seis colores
 * de colono, de 1,56–2,23 a 1,86–2,88. Ninguno llega al 3:1 de un gráfico y NO
 * puede llegar desde aquí: opacos dan 1,72 y 2,89, o sea que el techo lo pone la
 * paleta que declaró el juego y bajarle el alfa sólo empeora lo que ya no llegaba.
 *
 * LO QUE SÍ ARREGLA EL 3:1 es no apagar lo que se ofrece, que es lo que se hace
 * arriba: en Riberas «tenue» quiere decir «de nadie todavía», o sea que la vereda
 * que hay que trazar venía marcada tenue y era lo más pálido del tablero.
 */
const ALFA_TENUE = 0.45;

/**
 * EL RÓTULO Y LA CIFRA DE UNA CARA, colgados de su centro.
 *
 * ═══ EL CUERPO SE TOPA POR EL ANCHO DE LA FIGURA ═══
 *
 * `--cuerpo-de-cara` sube el texto hasta los 13 px de la casa, y eso puede no
 * caber: en una isla de Riberas —173,2 unidades de ancho— «Carrizal» a 36,1
 * unidades ya toca los bordes. Así que la crecida se aplica hasta donde el rótulo
 * quepa dentro de su propia cara y ni una unidad más, que es lo que la app llama
 * `tamanoDeTexto`. Medido: por debajo de 365 px de lienzo el tope manda y el
 * mínimo de 13 px deja de alcanzarse — pero el rótulo sigue dentro del hexágono,
 * que es la otra mitad de ser legible.
 *
 * ═══ Y LAS DOS ALTURAS SALEN DEL CUERPO, NO DE UN 16 ═══
 *
 * La cifra estaba a `centro.y + 16`: dieciséis unidades fijas, que no se movían
 * cuando el texto crecía. Y sin `dominant-baseline`, la `y` es la LÍNEA BASE, así
 * que el rótulo se apoyaba en el centro del polígono en vez de centrarse en él.
 * Ahora las dos se centran (`central`) y el hueco es 0,6 cuerpos a cada lado, así
 * que la pareja se descuadra igual a cualquier tamaño.
 *
 * `centroDe` se llamaba CUATRO veces por cara —una por coordenada de cada texto—
 * recorriendo los vértices cada vez. Ahora, una.
 *
 * ═══ Y NO SE OYE DOS VECES ═══
 *
 * Estas palabras son las mismas que compone el `aria-label` de la pieza, así que
 * en una cara TOCABLE se anunciarían dos veces: una como nombre del botón y otra
 * como texto suelto, ahora que el texto ya no está dentro del grupo con
 * `role="button"` —que las podaba, porque `button` también tiene hijos
 * presentacionales—. Se esconde ahí y sólo ahí. En una cara que no se toca, este
 * texto es lo ÚNICO que un lector tiene del terreno: las diecinueve islas de
 * Riberas no llevan `toque`, así que esconderlo siempre habría dejado el mapa
 * mudo.
 */
function textoDeCara(
  p: Extract<PiezaPintada, { clase: 'cara' }>,
  crecida: number,
): JSX.Element | null {
  const rotulo = cadena(p.rotulo);
  const cifra = cadena(p.cifra);
  if (rotulo.length === 0 && cifra.length === 0) return null;
  const puntos = puntosSanos(p.puntos);
  if (puntos === null) return null;

  const centro = centroDe(puntos);
  let minX = Infinity;
  let maxX = -Infinity;
  for (const q of puntos) {
    if (q.x < minX) minX = q.x;
    if (q.x > maxX) maxX = q.x;
  }
  const letras = Math.max(2, rotulo.length, cifra.length);
  const cabe = (maxX - minX) / letras / ANCHO_DE_GLIFO;
  const cuerpo = Math.max(
    CUERPO_DE_CARA,
    Math.min(CUERPO_DE_CARA * crecida, Math.max(CUERPO_DE_CARA, cabe)),
  );
  const hueco = cuerpo * 0.6;
  const dos = rotulo.length > 0 && cifra.length > 0;

  return (
    <g
      key={`texto:${p.id}`}
      aria-hidden={p.toque !== null ? true : undefined}
      style={{ '--cuerpo-de-cara': `${cuerpo.toFixed(2)}px` } as CSSProperties}
    >
      {rotulo.length > 0 ? (
        <text
          x={centro.x}
          y={dos ? centro.y - hueco : centro.y}
          className="texto-de-cara"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {rotulo}
        </text>
      ) : null}
      {cifra.length > 0 ? (
        <text
          x={centro.x}
          y={dos ? centro.y + hueco : centro.y}
          className="cifra-de-cara"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {cifra}
        </text>
      ) : null}
    </g>
  );
}

/**
 * CÓMO SE LLAMA UNA PIEZA PARA QUIEN NO LA VE.
 *
 * Aquí ponía `aria-label={p.id}`, que en Riberas se oye «3,-1:n». La app escribió
 * la escalera entera para esto y citó literalmente este fichero como lo que había
 * que superar; el arreglo no se había traído. Por orden, lo mejor que hay:
 *
 *   1. LAS PALABRAS DEL JUEGO. Una cara trae `rotulo` y `cifra`: «Carrizal 8» es
 *      un nombre de verdad y lo escribió quien sabe a qué se juega.
 *   2. EL TIPO DEL MOVIMIENTO, que es la única palabra que una línea o un nudo
 *      llevan encima. `riberas:fundar` se queda en «fundar»: el espacio de
 *      nombres es del motor y no de quien escucha.
 *   3. Y si no hay ninguna de las dos, el identificador.
 *
 * LO QUE FALTA, y es del contrato y no de este fichero: `LineaDeTablero` y
 * `NudoDeTablero` no tienen un campo `nombre`, así que dos veredas ofrecidas se
 * anuncian las dos «fundar» y sólo se distinguen por dónde están.
 */
function nombreParaElLector(p: PiezaPintada): string {
  if (p.clase === 'cara') {
    const suyo = `${cadena(p.rotulo)} ${cadena(p.cifra)}`.trim();
    if (suyo.length > 0) return suyo;
  }
  if (p.toque !== null && typeof p.toque.tipo === 'string') {
    const sinEspacio = p.toque.tipo.slice(p.toque.tipo.lastIndexOf(':') + 1);
    const legible = sinEspacio.replace(/[-_]/g, ' ').trim();
    if (legible.length > 0) return legible;
  }
  return p.id;
}

/**
 * El centro de un polígono, para colgar de él su rótulo.
 *
 * Es la media de los vértices y no el centro del rectángulo que lo contiene:
 * para las figuras regulares que declara un tablero —hexágonos, cuadrados— las
 * dos cosas coinciden, y para una irregular la media queda dentro de la figura
 * mientras que el centro del rectángulo puede caer fuera.
 *
 * Esta es la ÚNICA cuenta geométrica de todo el mueble, y hace falta porque el
 * contrato del tablero declara dónde está la cara pero no dónde poner su letra.
 */
function centroDe(puntos: readonly PuntoDeTablero[]): PuntoDeTablero {
  if (puntos.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const p of puntos) {
    x += p.x;
    y += p.y;
  }
  return { x: x / puntos.length, y: y / puntos.length };
}

// ---------------------------------------------------------------------------
// LAS GUARDIAS: lo que llega por el cable no es lo que dice el tipo
// ---------------------------------------------------------------------------

/** Un número que se puede pintar: `NaN` e `Infinity` no lo son. */
function esMedida(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

/** Un punto con sus dos coordenadas pintables. */
function esPunto(x: unknown): x is PuntoDeTablero {
  if (typeof x !== 'object' || x === null) return false;
  const p = x as Partial<PuntoDeTablero>;
  return esMedida(p.x) && esMedida(p.y);
}

/**
 * Los vértices de un polígono, o nada.
 *
 * Menos de tres no es un polígono: `<polygon>` con dos puntos dibuja un segmento
 * sin relleno, que sobre un tablero se lee como una pieza más y no como el dato
 * roto que es.
 */
function puntosSanos(x: unknown): PuntoDeTablero[] | null {
  if (!Array.isArray(x) || x.length < 3) return null;
  const salida: PuntoDeTablero[] = [];
  for (const p of x) {
    if (!esPunto(p)) return null;
    salida.push({ x: p.x, y: p.y });
  }
  return salida;
}

/** Una cadena del cable, o la vacía. Nunca `undefined.length`. */
function cadena(x: unknown): string {
  return typeof x === 'string' ? x : '';
}

/**
 * Un color del juego, o la tinta de la página.
 *
 * `currentColor` y no un color inventado: un relleno que no llegó se pinta con la
 * letra de la Sala, que se ve sobre el lienzo y no se parece a nada de la paleta
 * del juego, así que el hueco se nota en vez de disimularse.
 */
function pintura(x: unknown): string {
  return typeof x === 'string' && x.length > 0 ? x : 'currentColor';
}

/** El movimiento de una acción, sólo si de verdad hay uno que mandar. */
function movimientoSano(x: unknown): MovimientoDeclarado | null {
  if (typeof x !== 'object' || x === null) return null;
  const m = x as Partial<MovimientoDeclarado>;
  return typeof m.tipo === 'string' && m.tipo.length > 0 ? { tipo: m.tipo, carga: m.carga } : null;
}

/**
 * Los paneles que el juego mandó, tal cual: un título y unos renglones.
 *
 * Es el sitio donde un tablero cuenta lo que no cabe dibujado —quién va ganando,
 * qué tiene cada cual, qué llevas tú— y por eso es texto libre del juego y no
 * una tabla con columnas que este lado tuviera que entender.
 *
 * ═══ LA CLAVE ES EL SITIO Y NO EL TÍTULO ═══
 *
 * `PanelDeTablero` es {título, líneas} y nada más: no trae identificador, y el
 * contrato no obliga a que los títulos sean distintos. Con `key={panel.titulo}`,
 * un arcade de fuera que mandara dos paneles llamados «Trueques» reconciliaría mal
 * y avisaría por consola. Riberas manda hoy cuatro títulos distintos, así que no
 * se veía. Es el mismo fallo que la app acaba de corregir.
 *
 * Y `role="list"`, porque `list-style: none` le quita a Safari + VoiceOver la
 * semántica de lista y aquí el número de renglones es el dato.
 */
export function Paneles({ tablero }: { tablero: TableroDeclarado }): JSX.Element | null {
  if (tablero.paneles.length === 0) return null;
  return (
    <>
      {tablero.paneles.map((panel, i) => {
        const titulo = cadena(panel.titulo);
        /*
         * `panel.lineas.map` era la quinta lectura sin guardia de este fichero, y
         * un panel sin `lineas` tiraba la Sala entera. Un panel a medias se pinta
         * a medias: se queda su título, que ya dice algo.
         */
        const lineas: string[] = Array.isArray(panel.lineas) ? panel.lineas.map(cadena) : [];
        return (
          <section className="panel" key={`panel-${String(i)}`}>
            {titulo.length > 0 ? <h2 className="rotulo-de-panel">{titulo}</h2> : null}
            <ul className="renglones" role="list">
              {lineas.map((linea, j) => (
                <li key={`panel-${String(i)}-${String(j)}`}>{linea}</li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

/**
 * Las acciones del tablero: lo que se hace sin tocar ninguna pieza.
 *
 * Vienen con `disponible` puesto por el juego, y una acción no disponible se
 * pinta APAGADA en vez de desaparecer: que exista un «pasar» que ahora mismo no
 * se puede pulsar es información, y quitarlo de la pantalla hace que la mesa
 * parezca tener menos salidas de las que tiene.
 *
 * ═══ Y AHORA SE VE CUÁL SE PUEDE PULSAR ═══
 *
 * Estaban todas en `.opcion` a secas, que desde que la hoja tiene los tres
 * estados de la casa es el QUIETO: teja lisa y tinta `--tenue`. O sea que las que
 * se podían pulsar se pintaban igual que las apagadas. Ahora las jugables son
 * `.opcion-secundaria` —texto y borde de acento, 4,58 / 8,44 / 7,96 / 4,94 sobre
 * la teja— y las apagadas no llevan clase de estado: `:disabled` ya las apaga con
 * COLOR y no con `opacity`, que es la regla 3 de esta casa y la corrección con la
 * que la hoja recuperó la ayuda de 2,05:1 a 5,94:1.
 *
 * Secundario y no primario a propósito: son varias a la vez y ninguna es «la» que
 * se espera que pulses. En esta pantalla el primario es el tablero.
 */
export function AccionesDelTablero({
  tablero,
  alTocar,
  quieto,
}: QueSePintaAqui): JSX.Element | null {
  if (tablero.acciones.length === 0) return null;
  return (
    <div className="formulario">
      <ul className="opciones" role="list">
        {tablero.acciones.map((a, i) => {
          const rotulo = cadena(a.rotulo);
          const ayuda = cadena(a.ayuda);
          /*
           * `alTocar(a.toque)` no comprobaba que hubiera `toque`: una acción sin
           * movimiento mandaba `undefined` por el cable y el servidor contestaba
           * lo que quisiera. Sin movimiento no hay nada que pulsar, así que el
           * botón se queda apagado y se sigue viendo, que es lo que este mueble
           * hace con todo lo que no se puede hacer ahora.
           */
          const toque = movimientoSano(a.toque);
          const jugable = a.disponible === true && !quieto && toque !== null;
          if (rotulo.length === 0) return null;
          return (
            <li key={`accion-${String(i)}`}>
              <button
                type="button"
                className={jugable ? 'opcion opcion-secundaria' : 'opcion'}
                disabled={!jugable}
                /*
                 * SIN `title`. Repetía palabra por palabra la ayuda que se pinta
                 * dos renglones más abajo, y en el único caso donde habría hecho
                 * falta —un botón apagado, que es cuando se quiere saber POR QUÉ
                 * no se puede— los navegadores no enseñan el globo de un
                 * `<button disabled>`. Con `ayuda` vacía dejaba además un
                 * `title=""`.
                 */
                onClick={() => {
                  if (toque !== null) alTocar(toque);
                }}
              >
                <span className="opcion-texto">
                  <span className="opcion-rotulo">{rotulo}</span>
                  {ayuda.length > 0 ? <span className="opcion-ayuda">{ayuda}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
