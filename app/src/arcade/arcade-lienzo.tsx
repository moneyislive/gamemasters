/**
 * EL MUEBLE `lienzo`, ESTRENADO POR «EL ARCADE»: todo lo que toca Skia.
 *
 * Sesenta pasos por segundo, un jugador, y una cifra que el servidor comprueba.
 * Aquí se junta todo lo de la fase 3: el reloj de paso fijo de `bucle.ts`, el
 * reductor puro de `shared/arcade/juegos/arcade.ts` y la subida de la partida
 * entera de `marcador.ts`.
 *
 * ═══ LOS DOS CARRILES, QUE ES LA FORMA DEL FICHERO ═══
 *
 * Un juego de sesenta hercios no puede pintarse redibujando React sesenta veces
 * por segundo, así que aquí hay dos caminos y cada cosa va por el suyo:
 *
 *   · LO QUE SE MUEVE —la nave y lo que cae— va a VALORES COMPARTIDOS de
 *     Reanimated, que Skia lee desde el hilo de interfaz. React no se entera.
 *   · LO QUE SE LEE —la cifra, el momento de la partida, los rótulos— va por
 *     `resumen`, y solo redibuja cuando cambia de verdad. Ver `ComoSeJuega.resumen`
 *     en `bucle.ts`, donde está el razonamiento entero y lo que costaba no hacerlo.
 *
 * ═══ POR QUÉ `Atlas` Y NO UN COMPONENTE POR SPRITE ═══
 *
 * Lo evidente sería `caidas.map((c) => <RoundedRect … />)`. Eso son N nodos de
 * React, N nodos en el árbol de Skia y N llamadas de dibujo, y además el número
 * de nodos CAMBIA con la partida —nace una cosa, se va otra— o sea reconciliación
 * de React a ritmo de fotograma, que es lo que se acaba de evitar.
 *
 * `Atlas` dibuja una imagen muchas veces con una sola llamada: una lista de
 * recortes y una lista de transformaciones. Las transformaciones se calculan
 * DENTRO de un worklet —`useRSXformBuffer`— así que el árbol de React no cambia
 * nunca: son siempre los mismos veinticinco huecos, y los que no se usan salen
 * con escala cero. Es la pieza por la que este mueble es Skia y no Vistas.
 *
 * ═══ Y LA IMAGEN NO ES UN FICHERO ═══
 *
 * El atlas se dibuja aquí mismo con `useTexture`: dos sprites de 64 × 64 pintados
 * con formas de Skia y horneados a una imagen fuera de pantalla. Ni un PNG, ni un
 * `require`, ni un activo que empaquetar, ni una densidad de pantalla que elegir.
 * Para dos formas geométricas es lo correcto; el día que haya dibujo de verdad,
 * esto pasa a ser una imagen y lo demás no se entera.
 *
 * ═══ Y ESTE FICHERO NO SE IMPORTA HASTA QUE SKIA ESTÁ CARGADO ═══
 *
 * Es la razón por la que existe separado de `arcade.tsx`, que es quien lo trae con
 * `React.lazy`. En web, `@shopify/react-native-skia` hace esto AL CARGARSE:
 *
 *     export const Skia = JsiSkApi(global.CanvasKit);
 *
 * O sea que importar el paquete antes de que `LoadSkiaWeb` haya terminado revienta
 * en la línea del `import`, no al pintar. Y como la Sala de Arcade la lee la
 * PORTADA —`vitrina.ts` necesita saber qué juegos se saben pintar—, un `import`
 * estático de aquí arriba se llevaría por delante la portada entera en web: una
 * pantalla en blanco antes de la primera pantalla, que es el mismo fallo mudo que
 * el `.wasm` mal pedido y por la puerta de al lado.
 *
 * Con la carga perezosa, este módulo no se toca hasta que `usarCanvasKit()` dice
 * que sí. Es lo mismo que hace `WithSkiaWeb` del propio paquete, escrito a mano
 * para no arrastrar el cargador de web dentro del binario de Android y de iOS.
 *
 * ═══ EL COLOR DE ESTA PANTALLA: TRES SITIOS, Y NINGUNO ES DECORACIÓN ═══
 *
 * La Sala no reparte su acento en veinte detalles, porque repartido se apaga.
 * Aquí sólo hay tres cosas teñidas y las tres dicen lo mismo —esto responde al
 * dedo—, que es lo que hace falta saber en medio de una partida de sesenta
 * hercios, sin leer:
 *
 *   · `SALA.acento` es LA NAVE, es el botón grande y es la pastilla de «Volver».
 *     Todo lo demás de la pantalla —campo, rótulos, cifra, avisos— es gris frío.
 *
 *     DECÍA DOS Y DEJABA FUERA A «VOLVER», que responde al dedo igual que las
 *     otras dos y se pintaba en `tenue` con un filo de blanco al 7,5 %: medido,
 *     ese filo se recorta del suelo con 1,17:1 contra el mínimo de 3:1 de un
 *     contorno que identifica un control, o sea que el rectángulo que decía «esto
 *     se pulsa» no estaba. Ahora es el botón SECUNDARIO de la casa —texto y borde
 *     en acento pleno, sin relleno—, que da 5,01 en violeta, 9,22 en ámbar, 8,69
 *     en verde y 5,40 en carmesí sobre el suelo. Ver `BOTON` en `muebles.ts`.
 *   · `SALA.alarma` es LO QUE CAE, y no se tiñe con el tema a propósito. Si la
 *     basura llevara el acento diría lo mismo que la nave, que es exactamente lo
 *     contrario de lo que hay que entender en un juego de esquivar. Está
 *     razonado en `muebles.ts`, donde vive la constante.
 *
 * Y no hay tercer color: ni el error de subida ni el «sin conexión» son rojos.
 * Lo urgente aquí es que te matan, no que el servidor no conteste.
 *
 * ═══ Y ESTA PANTALLA ES EL CASO QUE `muebles.ts` DABA POR IMPOSIBLE ═══
 *
 * `SALA.alarma` se declara allí fijo a costa de una incomodidad escrita: con el
 * tema en ÁMBAR el naranja de la alarma se le parece al acento. La constante
 * aguanta porque «los dos no coinciden nunca en la misma pantalla —la placa de
 * acento es de la Sala y la alarma es de dentro de una partida—, y el día que
 * coincidan habrá que resolverlo, no ignorarlo».
 *
 * AQUÍ COINCIDEN. La nave lleva el acento y lo que cae lleva la alarma, a medio
 * metro la una de la otra y a sesenta fotogramas por segundo.
 *
 * Y AQUÍ SE NOMBRABA SÓLO EL ÁMBAR, que era quedarse corto en los otros tres.
 * Medida la razón de contraste entre `SALA.acento` y `SALA.alarma` —#FF7A45,
 * L=0,3560— en los cuatro temas de la tabla:
 *
 *     violeta 1,53:1 · ámbar 1,20:1 · VERDE 1,14:1 · carmesí 1,42:1
 *
 * O sea que el peor no es el ámbar: es el verde, que en luminancia está pegado
 * (L=0,4108 contra 0,3560). Y el carmesí es peor de lo que dice su cifra, porque
 * #F43F5E contra #FF7A45 no es sólo luminancia parecida: es un rojo-naranja
 * contra un naranja, o sea el mismo tono. En violeta —el único que se ve hoy— hay
 * 1,53, que tampoco es distinguir por color: lo que separa la nave de lo que la
 * mata es la FORMA, cápsula ancha contra cuadrado, y por eso el sprite de abajo
 * las dibuja tan distintas.
 *
 * No se arregla desde este fichero —la salida es de la tabla: una alarma que se
 * aparte cuando el tema se le acerque, o unos acentos que no sean ésos— y por eso
 * aquí sólo queda dicho, con nombre, sitio y las cuatro cifras.
 *
 * OJO CON EL ATLAS: `useTexture` hornea la imagen UNA VEZ, al montar, con las
 * dependencias vacías. Hoy da igual porque `SALA` es una constante compilada,
 * pero el día que la Sala deje elegir tema en caliente —`TEMAS_DE_SALA` ya tiene
 * los cuatro— la nave se quedará del color viejo hasta que se vuelva a entrar, y
 * será un fallo mudo. Se arregla pasándole las dependencias, no aquí.
 *
 * Y ESO ERA VERDAD DEL DIBUJO Y MENTIRA DE LA IMAGEN. `useTexture(elemento,
 * tamaño, deps)` sólo aplica `deps` al `picture`; el HORNEADO va por dentro, en
 * `usePictureAsTexture`, cuyo efecto lleva `[picture, size, texture]`
 * (`external/reanimated/textures.js:59`). El `tamaño` se pasaba como objeto
 * escrito EN LÍNEA, o sea identidad nueva en cada renderizado de React: cada
 * cambio de `resumen` —una esquivada— montaba una superficie fuera de pantalla de
 * 128 × 64 y una instantánea nuevas, sin soltar la anterior. Es el mismo derroche
 * que la cabecera de `bucle.ts` dedica tres párrafos a quitar del bucle, metido
 * por la puerta de al lado. El tamaño vive ahora en `TAMANO_DEL_ATLAS`, aquí
 * abajo: una constante de módulo tiene la misma identidad para siempre.
 *
 * ═══ LO QUE NO SE HA COMPROBADO, DICHO AQUÍ ═══
 *
 * AQUÍ PONÍA QUE ESTE FICHERO «COMPILA Y NO SE HA VISTO CORRER», y lo desmentía el
 * propio fichero dos veces:
 *
 *   · «Medido envolviendo `drawAtlas`, 58 dibujos por segundo con la pantalla
 *     diciendo "Se acabó"» —el bloque de `activo`, aquí abajo—, que es la misma
 *     medida que `bucle.ts:595-597` da como «medido con el juego corriendo».
 *   · «Quien lo jugó por primera vez tocó, no vio moverse la nave, y dio el juego
 *     por roto» —el bloque de «MANTÉN PULSADA»—, que sólo se sabe jugando.
 *
 * O sea que esto se ha jugado por lo menos dos veces, y la cabecera mandaba a
 * quien lo levantara a creer que era la primera. Una promesa falsa de «probado en
 * un iPhone» y una renuncia falsa de «nadie lo ha abierto» son la misma mentira:
 * las dos hacen que las cifras del fichero se lean con la confianza equivocada.
 *
 * LO QUE DE VERDAD NO SE HA VISTO, y hay que leerlo antes de fiarse de un número:
 *
 *   · LOS OTROS TRES TEMAS. `TEMAS_DE_SALA` no lo lee NINGÚN fichero del
 *     repositorio —comprobado con `grep`—, así que todo el mundo ve el violeta.
 *     Cada cifra de ámbar, verde o carmesí que aparece en este fichero está
 *     calculada sobre la tabla y no vista en una pantalla: es deuda anotada, no
 *     un fallo que alguien haya mirado.
 *   · UN IPHONE FÍSICO, que es lo mismo que `muebles.ts` deja dicho de la escena.
 *
 * Lo que sí está comprobado aparte de la pantalla es el reductor, la repetición,
 * el determinismo entre motores y el marcador, y lo que vigila el mueble de lejos:
 * `verify:canvaskit`, que caza el fallo mudo de la web.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { Atlas, Canvas, Group, RoundedRect, Skia, useRSXformBuffer, useTexture } from '@shopify/react-native-skia';
import type { SkRect } from '@shopify/react-native-skia';
import {
  CAIDA_MEDIO,
  CAMPO,
  EL_ARCADE,
  EMPEZAR_EL_ARCADE,
  MANIFIESTO_EL_ARCADE,
  NAVE_MEDIO_ALTO,
  NAVE_MEDIO_ANCHO,
  NAVE_Y,
  OTRA_PARTIDA,
  partidaNuevaDelArcade,
  RUMBO,
  seAcaboElArcade,
  TOPE_DE_CAIDAS,
} from '../../../shared/arcade/juegos';
import type { EstadoDelArcade, MomentoDelArcade, Rumbo } from '../../../shared/arcade/juegos';
import { usarPartidaDeFotogramas } from './bucle';
import { usarElAparatoQuieto, usarPrimerPlano } from './local';
import { anunciarQueEmpiezo, subirLaPartida } from './marcador';
import type { ComoFue, PartidaAnunciada } from './marcador';
import { BOTON, LETRA, RADIO, SALA } from './muebles';
/*
 * LA PASTILLA DE ESTADO SE IMPORTA, no se escribe otra vez aquí. `piezas.tsx`
 * existe justamente porque el raíl de aforo llegó a estar escrito tres veces y las
 * tres se separaron; una pastilla de «sin conexión» a mano sería la cuarta.
 */
import { PastillaDeEstado } from './piezas';
/*
 * `conAlfa` se IMPORTA y no se copia. Es la única transparencia de este fichero
 * y cabría en una línea, que es justamente por lo que alguien la duplicó una vez
 * en otro sitio: dos copias de la misma función terminan siendo dos funciones
 * distintas el día que una se arregla.
 */
import { conAlfa } from '../tema';

/** El lado de cada sprite dentro del atlas, en píxeles de la imagen horneada. */
const LADO_DEL_SPRITE = 64;
/** Cuántos huecos tiene el atlas: la nave y todo lo que puede caer a la vez. */
const HUECOS = 1 + TOPE_DE_CAIDAS;

/**
 * EL TAMAÑO DE LA HOJA, Y VIVE FUERA DEL COMPONENTE A PROPÓSITO.
 *
 * Escrito en línea dentro de la llamada era un objeto nuevo por renderizado, y el
 * efecto de `usePictureAsTexture` lleva `size` en sus dependencias: cada esquivada
 * rehorneaba la textura en la GPU. El razonamiento entero y las líneas de la
 * librería están en el aviso del atlas de la cabecera.
 */
const TAMANO_DEL_ATLAS = { width: LADO_DEL_SPRITE * 2, height: LADO_DEL_SPRITE };

/**
 * LA BANDA DE LA NAVE DENTRO DE SU CELDA, DERIVADA DE LA CAJA DE COLISIÓN.
 *
 * El comentario del sprite prometía que «si se cambian `NAVE_MEDIO_ANCHO` o
 * `NAVE_MEDIO_ALTO` en las reglas, esta banda se cambia con ellos» y no lo
 * garantizaba nada: la banda estaba escrita a mano —de 15 a 49— y
 * `NAVE_MEDIO_ALTO` ni siquiera se importaba en este fichero. De paso los números
 * a mano no eran los buenos: 34/64 = 0,531 contra 60/110 = 0,545, o sea medio
 * píxel de sprite. Lo invisible no era el error; era la promesa, que se cumple
 * cuando el número SALE de la constante y no cuando alguien se acuerda.
 */
const ALTO_DE_LA_BANDA = (NAVE_MEDIO_ALTO / NAVE_MEDIO_ANCHO) * LADO_DEL_SPRITE;
const Y_DE_LA_BANDA = (LADO_DEL_SPRITE - ALTO_DE_LA_BANDA) / 2;

/**
 * EL RÓTULO DEL MARCADOR, LEÍDO UNA VEZ DEL MANIFIESTO.
 *
 * El `?:` es un ESTRECHAMIENTO DE TIPO y no una alternativa: `marcador` es una
 * unión en `ManifiestoDeArcade` —puede ser `{ tipo: 'ninguno' }`— y sin la
 * comprobación no compila. Pero El Arcade lo declara `cifra` en un objeto
 * constante (`shared/arcade/juegos/arcade.ts:551`), así que la otra rama no se
 * pinta jamás. Decía `'PUNTOS'`, que hacía creer que esta pantalla sabe pintar un
 * arcade sin cifra: no lo sabe y no lo pinta nunca — este componente es El Arcade
 * y nada más. La rama muerta repite la misma palabra en vez de inventar otra.
 */
const ROTULO_DEL_MARCADOR =
  MANIFIESTO_EL_ARCADE.marcador.tipo === 'cifra'
    ? MANIFIESTO_EL_ARCADE.marcador.rotulo.toUpperCase()
    : 'ESQUIVADAS';

/**
 * LO QUE UN LECTOR DE PANTALLA DICE DEL CAMPO.
 *
 * Un dibujo de Skia no tiene texto dentro que nadie pueda leer, así que si no se
 * escribe aquí no existe. Lleva la instrucción de MANTENER PULSADO porque durante
 * la partida el velo con esa frase no está en pantalla, y es lo que quien no ve
 * el campo necesita saber para que el juego responda.
 */
const ETIQUETA_DEL_CAMPO =
  'El campo de El Arcade: la nave abajo y lo que cae desde arriba. ' +
  'Mantén pulsada la mitad izquierda o la derecha para moverte.';

/**
 * EL LADO MÍNIMO DEL CAMPO, QUE ES LO QUE FALTABA PARA QUE NO SALIERA NEGATIVO.
 *
 * `lado` era `min(width - 24, height - 220)`: en una ventana de menos de 220 de
 * alto sale NEGATIVO, y entonces el `Canvas` se monta con lado -20 y `escala` vale
 * -0,02, que invierte todas las transformaciones del `useRSXformBuffer` —el juego
 * se dibuja del revés o no se dibuja— sin un solo error. En nativo no pasa porque
 * la orientación está bloqueada en vertical (`local.ts`); en web pasa
 * redimensionando la ventana, que es un gesto de todos los días.
 *
 * Con el tope, una ventana muy baja enseña el campo cortado por abajo, que es
 * feo y es legible; lo otro era mudo y estaba al revés.
 */
const LADO_MINIMO = 160;

/** Lo poco del estado que obliga a redibujar React. Ver `bucle.ts`. */
interface LoQueSeLee {
  momento: MomentoDelArcade;
  esquivadas: number;
}

/** Dónde está cada cosa, tal como lo lee el hilo de interfaz. */
interface Pintable {
  x: number;
  y: number;
}

export default function ArcadeConLienzo(): JSX.Element {
  const { width, height } = useWindowDimensions();

  /*
   * ═══ EL ÁREA SEGURA, QUE ESTA PANTALLA NO CONTABA ═══
   *
   * El grupo `(arcade)` monta con `headerShown: false`, así que el contenido
   * empieza en y=0: en un iPhone con isla el rótulo «ESQUIVADAS» y parte de la
   * cifra caen debajo del reloj del sistema —de 47 a 59 puntos— y por abajo el
   * indicador de inicio se come otros 34. No había un solo `useSafeAreaInsets` en
   * `app/src/arcade/`, mientras que el resto de la app sí lo usa (`marco.tsx`,
   * `barra.tsx`, y desde hace poco `tablero-en-linea.tsx`). El proveedor ya está
   * montado en `app/app/_layout.tsx`: esto no añade dependencia, sólo lee.
   *
   * Y ENTRA TAMBIÉN EN EL LADO DEL CAMPO, que es la mitad que se olvida: apartar
   * la cabecera sin quitarle esos píxeles al campo deja el mismo alto de contenido
   * en menos hueco, o sea que lo que antes cabía justo se sale por abajo.
   */
  const bordes = useSafeAreaInsets();

  /*
   * El campo del juego es CUADRADO y mide 1000 × 1000 milésimas, así que aquí solo
   * se elige un lado y se multiplica. Que el campo no dependa de la pantalla es lo
   * que hace que la misma repetición dé la misma partida en un móvil y en un
   * portátil — si el campo se midiera en píxeles, el servidor no podría
   * reejecutarla.
   *
   * Los 220 son lo que ocupa todo lo demás —cabecera, huecos y «Volver»— y el
   * `Math.max` es lo que impide que el lado salga negativo; ver `LADO_MINIMO`.
   */
  const lado = Math.max(
    LADO_MINIMO,
    Math.min(width - 24, height - 220 - bordes.top - bordes.bottom),
  );
  const escala = lado / CAMPO;

  const enPrimerPlano = usarPrimerPlano();

  // ── La semilla, que la reparte el servidor ───────────────────────────────
  const [anuncio, setAnuncio] = useState<PartidaAnunciada | null>(null);
  const [preparando, setPreparando] = useState(true);
  /*
   * La semilla de repuesto para jugar sin conexión. `Date.now()` aquí es
   * perfectamente legítimo —esto no es el reductor, es el anfitrión— y lo único
   * que hace es que dos partidas sin red no sean idénticas.
   */
  const [semillaDeCasa] = useState(() => Date.now() >>> 0);
  const semilla = anuncio?.semilla ?? semillaDeCasa;

  const [comoFue, setComoFue] = useState<ComoFue | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  // ── Lo que se mueve, por el carril de Skia ───────────────────────────────
  const naveX = useSharedValue(CAMPO / 2);
  const cayendo = useSharedValue<Pintable[]>([]);

  /*
   * EN QUÉ MOMENTO VA LA PARTIDA, LEÍBLE ANTES DE MONTAR EL BUCLE.
   *
   * `partida.resumen` trae el momento, pero sale del hook que hay debajo y aquí
   * hace falta ANTES: es lo que decide si el reloj de sesenta hercios se enciende.
   * Una referencia que `alAvanzar` mantiene al día rompe la circularidad sin
   * inventar un segundo `useState` que dijera lo mismo que `resumen`.
   *
   * El desfase de un renderizado es inofensivo y es el que daría cualquier otra
   * solución de React: cuando el momento cambia, `resumen` cambia con él y obliga
   * a redibujar, así que el renderizado siguiente ya lee el valor nuevo.
   */
  const momentoAhora = useRef<MomentoDelArcade>('antes');

  const alAvanzar = useCallback(
    (estado: EstadoDelArcade): void => {
      momentoAhora.current = estado.momento;
      naveX.value = estado.nave;
      /*
       * Se manda una lista nueva y no se muta la que hay: un valor compartido solo
       * avisa al hilo de interfaz cuando se le ASIGNA. Mutando el array por dentro,
       * el mapper de `useRSXformBuffer` no se enteraría y la pantalla se quedaría
       * congelada mientras la partida sigue — el peor fallo posible aquí, porque no
       * da ningún error y parece que el juego se ha colgado.
       */
      cayendo.value = estado.caidas.map((c) => ({ x: c.x, y: c.y }));
    },
    [cayendo, naveX],
  );

  const partida = usarPartidaDeFotogramas<EstadoDelArcade, LoQueSeLee>({
    arcade: EL_ARCADE,
    partidaNueva: partidaNuevaDelArcade,
    semilla,
    seAcabo: seAcaboElArcade,
    /*
     * ═══ EL RELOJ CORRE MIENTRAS SE JUEGA **Y** LA APP ESTÁ DELANTE ═══
     *
     * Lo de la app al fondo no es cortesía: sin fotogramas el bucle no avanzaría
     * de todas formas, y pararlo explícitamente es lo que hace que al volver no
     * haya un sobrante de hace diez minutos esperando. Ver `bucle.ts`.
     *
     * Y lo del momento es lo que faltaba, que era lo caro. Con solo
     * `enPrimerPlano`, el bucle seguía dando sesenta vueltas por segundo con la
     * partida terminada o sin empezar: salto de hilo, llamada al reductor, lista
     * de caídas nueva y REDIBUJADO del atlas. Medido envolviendo `drawAtlas`, 58
     * dibujos por segundo con la pantalla diciendo «Se acabó» — y con
     * `usarElAparatoQuieto` ya apagado, o sea quemando batería y GPU mientras
     * quien juega lee un rótulo quieto.
     *
     * ═══ Y LA CONSECUENCIA, QUE SE DICE EN VEZ DE DISIMULARSE ═══
     *
     * Antes, los tics seguían entrando mientras la pantalla enseñaba «Empezar», así
     * que la duración declarada incluía el rato que quien juega tardó en pulsar. Eso
     * cuadraba con el reloj de pared por casualidad —los dos corrían a la vez— y era
     * mentira: la partida no había empezado. Además le regalaba al servidor miles de
     * tics vacíos que reejecutar, y con media hora de espera habría llegado a
     * `duracion-imposible`.
     *
     * Ahora la duración declarada es SOLO lo jugado, que es lo honrado, y el precio
     * está en el otro lado: el reloj de pared se cuenta desde el aviso de inicio, o
     * sea desde que se abre la pantalla. Quien abra el arcade, lo deje quieto tres
     * minutos y después juegue una partida corta puede caerse por
     * `mas-lento-que-el-reloj` — el margen de arriba son tres veces lo declarado más
     * dos minutos, y está razonado en `marcadores.ts`.
     *
     * Se deja así a sabiendas y no se toca el margen: aflojar una regla para que
     * quepa un caso raro es cómo las reglas dejan de servir. La salida limpia sería
     * pedir el aviso al pulsar «Empezar» en vez de al abrir la pantalla, y eso es
     * una petición en medio de un botón: se decide arriba, no aquí.
     *
     * Además contradecía a la cabecera de `bucle.ts`, que argumenta largo que el
     * bucle no debe hacer trabajo que no se ve. La otra mitad de aquel derroche
     * —publicar aunque no se diera ni un paso— está arreglada allí.
     */
    activo: enPrimerPlano && momentoAhora.current === 'jugando',
    hz: MANIFIESTO_EL_ARCADE.tickHz,
    resumen: (e) => ({ momento: e.momento, esquivadas: e.esquivadas }),
    iguales: (a, b) => a.momento === b.momento && a.esquivadas === b.esquivadas,
    alAvanzar,
  });

  const { momento, esquivadas } = partida.resumen;

  /* La pantalla se queda encendida mientras se juega, y solo mientras se juega. */
  usarElAparatoQuieto(momento === 'jugando');

  // ── Pedir partida al servidor ────────────────────────────────────────────
  const pedirPartida = useCallback((): void => {
    setPreparando(true);
    setComoFue(null);
    void anunciarQueEmpiezo(EL_ARCADE).then((r) => {
      setAnuncio(r);
      setPreparando(false);
    });
  }, []);

  useEffect(() => {
    pedirPartida();
  }, [pedirPartida]);

  // ── Subir la partida cuando se acaba ─────────────────────────────────────
  const yaSubida = useRef(false);
  useEffect(() => {
    if (momento !== 'perdida' || yaSubida.current) return;
    yaSubida.current = true;
    const suyo = anuncio;
    if (suyo === null) {
      setComoFue({ publicada: false, porque: 'Se ha jugado sin conexión, así que no cuenta.' });
      return;
    }
    setSubiendo(true);
    void subirLaPartida({
      arcade: EL_ARCADE,
      partida: suyo.partida,
      tics: partida.leerTics(),
      entradas: partida.leerRegistro(),
      cifra: esquivadas,
    }).then((r) => {
      setComoFue(r);
      setSubiendo(false);
    });
  }, [anuncio, esquivadas, momento, partida]);

  // ── La entrada: dos mitades ──────────────────────────────────────────────
  /*
   * El rumbo solo se manda CUANDO CAMBIA. `bucle.ts` graba todo lo que se le
   * mete, a propósito —lo que la repetición reproduce es lo que entró—, así que
   * repetir «izquierda» sesenta veces por segundo llenaría la repetición de miles
   * de líneas que no dicen nada y la haría enorme para nada.
   */
  const rumboAhora = useRef<Rumbo>(0);
  const empujar = useCallback(
    (r: Rumbo): void => {
      if (rumboAhora.current === r) return;
      rumboAhora.current = r;
      partida.mover(RUMBO, r);
    },
    [partida],
  );

  const empezar = useCallback((): void => {
    rumboAhora.current = 0;
    yaSubida.current = false;
    partida.mover(EMPEZAR_EL_ARCADE);
  }, [partida]);

  const otra = useCallback((): void => {
    partida.mover(OTRA_PARTIDA);
    partida.reiniciar(semilla);
    rumboAhora.current = 0;
    yaSubida.current = false;
    pedirPartida();
  }, [partida, pedirPartida, semilla]);

  // ── El atlas ─────────────────────────────────────────────────────────────

  /**
   * La hoja de sprites, dibujada aquí y horneada a una imagen.
   *
   * Dos de 64 × 64, uno al lado del otro: la nave y lo que cae. Los colores son
   * los de la Sala, que es lo que separa esta familia de la de las veladas.
   *
   * NO están horneados en ninguna imagen: son formas de Skia pintadas con la
   * tabla, así que cambiar `SALA` los cambia. Lo que sí se hornea es el
   * resultado, y sólo al montar — ver el aviso del atlas en la cabecera.
   */
  const textura = useTexture(
    <Group>
      {/*
        LA NAVE. La banda ocupa la misma proporción que su caja de colisión —110 ×
        60 milésimas dentro de una celda de 110 × 110—. No es estética: un sprite
        más alto que su caja hace que el jugador vea cómo le rozan cosas que no le
        tocan, y uno más bajo, al revés. Ahora la proporción SALE de las dos
        constantes de las reglas, así que cambiarlas cambia el dibujo de verdad;
        ver `ALTO_DE_LA_BANDA`, que es donde estaba escrita la promesa sin cumplir.
      */}
      <RoundedRect
        x={0}
        y={Y_DE_LA_BANDA}
        width={LADO_DEL_SPRITE}
        height={ALTO_DE_LA_BANDA}
        r={14}
        color={SALA.acento}
      />
      {/*
        EL HUECO DE LA NAVE IBA EN BLANCO Y AHORA VA CON EL SUELO, que es la
        misma tinta que la casa pone sobre cualquier campo de acento.

        El comentario que había lo defendía con «la misma regla que en la Sala pone
        `blanco` sobre la placa del nombre», y esa regla se estrechó al medirla:
        allí el blanco pasa porque debajo lleva el VELO de la portada, y aquí no
        hay velo ninguno. Medido, `SALA.blanco` sobre el acento pelado da 3,66:1 en
        violeta, 1,98 en ámbar, 2,11 en verde y 3,39 en carmesí, contra el 3:1 que
        pide un elemento no textual: en dos de los cuatro temas la nave perdía su
        marca y se quedaba en una barra lisa. Con el suelo son 5,01 / 9,22 / 8,69 /
        5,40, y además el hueco de la nave y el de lo que cae pasan a ser el mismo
        negro, que es lo que deja que las dos cosas se distingan por la FORMA —ver
        el aviso de los cuatro temas en la cabecera—.
      */}
      <RoundedRect x={22} y={22} width={20} height={20} r={8} color={SALA.suelo} />
      {/*
        Y LO QUE CAE, que sí es cuadrado y coincide exacto con su caja. En
        `alarma`, que es el único color de la tabla que significa «esto te mata»
        y el único que no se tiñe con el tema — con el aviso de la cabecera sobre
        lo que pasa aquí el día que el tema sea ámbar.
      */}
      <Group transform={[{ translateX: LADO_DEL_SPRITE }]}>
        <RoundedRect x={0} y={0} width={64} height={64} r={12} color={SALA.alarma} />
        {/*
          El agujero se pinta con el SUELO y no con el campo que hay detrás: así
          se lee como vacío y no como una pieza más, y sigue leyéndose igual el
          día que la superficie del campo cambie de escalón.
        */}
        <RoundedRect x={16} y={16} width={32} height={32} r={6} color={SALA.suelo} />
      </Group>
    </Group>,
    TAMANO_DEL_ATLAS,
  );

  /**
   * De qué trozo de la hoja sale cada hueco. El 0 es la nave; los demás, basura.
   *
   * Es una lista fija: los recortes no cambian nunca, y por eso se calculan una
   * vez y no en cada fotograma.
   */
  const recortes = useMemo<SkRect[]>(() => {
    const nave = Skia.XYWHRect(0, 0, LADO_DEL_SPRITE, LADO_DEL_SPRITE);
    const caida = Skia.XYWHRect(LADO_DEL_SPRITE, 0, LADO_DEL_SPRITE, LADO_DEL_SPRITE);
    const lista: SkRect[] = [nave];
    for (let i = 0; i < TOPE_DE_CAIDAS; i++) lista.push(caida);
    return lista;
  }, []);

  /*
   * El LADO de cada celda en píxeles de pantalla. Las celdas son cuadradas porque
   * `RSXform` escala igual en las dos direcciones —es escala, rotación y
   * traslación, no una matriz cualquiera— y por eso la proporción de la nave la
   * pone el DIBUJO dentro de su celda y no la transformación. Ver la textura.
   */
  const celdaNave = NAVE_MEDIO_ANCHO * 2 * escala;
  const celdaCaida = CAIDA_MEDIO * 2 * escala;
  const escalaNave = celdaNave / LADO_DEL_SPRITE;
  const escalaCaida = celdaCaida / LADO_DEL_SPRITE;

  /**
   * DÓNDE VA CADA HUECO. Esto corre en el hilo de interfaz, no aquí.
   *
   * `RSXform` es escala + rotación + traslación en cuatro números: `scos` es
   * `escala × cos(ángulo)` y `ssin` es `escala × sen(ángulo)`. Como aquí nada
   * gira, `ssin` es cero y `scos` es la escala pelada — que es también la razón
   * por la que este fichero no necesita ni un seno ni un coseno.
   *
   * Un hueco sin nada se manda con escala CERO, que no dibuja. Es lo que permite
   * que el número de sprites sea siempre el mismo y que el árbol de React no
   * cambie nunca: sin eso habría que redimensionar el buffer cada vez que nace o
   * muere algo, o sea reconciliar a ritmo de fotograma.
   */
  const transformaciones = useRSXformBuffer(HUECOS, (val, i) => {
    'worklet';
    if (i === 0) {
      val.set(
        escalaNave,
        0,
        naveX.value * escala - celdaNave / 2,
        NAVE_Y * escala - celdaNave / 2,
      );
      return;
    }
    const c = cayendo.value[i - 1];
    if (c === undefined) {
      val.set(0, 0, 0, 0);
      return;
    }
    val.set(escalaCaida, 0, c.x * escala - celdaCaida / 2, c.y * escala - celdaCaida / 2);
  });

  /**
   * QUÉ SE DICE DEL VIAJE DE LA PARTIDA AL SERVIDOR, O NADA.
   *
   * `null` de verdad y no cadena vacía. Estaba escrito como un `?:` dentro del
   * `Text`, así que mientras no había respuesta se renderizaba un `<Text>` VACÍO
   * entre «Se acabó» y «Otra»: un hueco de 12 —el `gap` del velo— que aparece y
   * desaparece según conteste el servidor, y en web además una parada del lector
   * de pantalla sin nada que leer.
   */
  const mensajeDeLaSubida: string | null = subiendo
    ? 'Mandando la partida para que la comprueben…'
    : comoFue === null
      ? null
      : comoFue.publicada
        ? `Comprobada: ${comoFue.cifra} cuenta para la tabla.`
        : comoFue.porque;

  return (
    <View
      style={[estilos.pantalla, { paddingTop: bordes.top, paddingBottom: bordes.bottom }]}
    >
      <View style={estilos.cabecera}>
        {/*
          ═══ EL TOPE DE AMPLIACIÓN DE LETRA VA AQUÍ Y NO EN EL VELO ═══

          La regla de la casa dice que una caja de alto fijo con texto dentro o
          topa la ampliación o se puede desplazar, y que lo segundo es mejor. El
          velo de aquí abajo ELIGE LO SEGUNDO —es un `ScrollView`— y por eso sus
          textos no llevan tope: quien pida el 200 % lo ve al 200 % y desplaza.

          Estos dos no pueden: viven fuera del velo, en una pantalla que no se
          desplaza, y encima de un campo cuyo lado ya está calculado contra el alto
          de la ventana. Sin tope, la cifra a 40 × 2 empuja el campo hacia abajo y
          «Volver» se sale. 1,5 es el mismo tope que la tarjeta de la portada.
        */}
        <Text style={estilos.rotulo} maxFontSizeMultiplier={1.5}>
          {ROTULO_DEL_MARCADOR}
        </Text>
        {/*
          LA CIFRA SE ANUNCIA AL SUBIR, que es lo que le faltaba a esta pantalla:
          no había ni una región viva en el fichero, así que con lector de pantalla
          la partida era un hueco mudo. `polite` y no `assertive` a propósito —una
          cifra que sube no interrumpe— y con etiqueta, porque «12» a secas no dice
          de qué. Las dos propiedades porque son dos plataformas:
          `accessibilityLiveRegion` es la de Android y `aria-live` la que entiende
          react-native-web; iOS no tiene región viva y se queda con la etiqueta.
        */}
        <Text
          style={estilos.cifra}
          maxFontSizeMultiplier={1.5}
          accessibilityLiveRegion="polite"
          aria-live="polite"
          accessibilityLabel={`${esquivadas} ${ROTULO_DEL_MARCADOR.toLowerCase()}`}
        >
          {esquivadas}
        </Text>
      </View>

      {/*
        EL CAMPO ES UNA SUPERFICIE, Y SE DICE COMO SE DICEN AQUÍ TODAS: un
        escalón de elevación sobre el suelo y un filo de un píxel alrededor. Ni
        marco de máquina, ni bisel, ni chapa — en esta Sala no hay materia, y un
        lienzo negro sobre fondo negro no es sobriedad: es que no se ve dónde
        empieza el juego.

        Y ESO ES EXACTAMENTE LO QUE PASABA, aunque el párrafo de arriba prometiera
        lo contrario. Medido: el escalón de elevación son cuatro puntos de RGB por
        canal —`pared` #0C0F14 contra `suelo` #080A0E— o sea 1,03:1, y el filo de
        un píxel en blanco al 7,5 % compuesto sobre la pared llegaba a 1,23:1,
        contra el 3:1 que pide un elemento no textual que delimita algo. El campo
        no se separaba del fondo: no se veía dónde empezaba el juego hasta que caía
        la primera basura. Son colores neutros, así que era igual en los cuatro
        temas.

        EL FILO SUBE A BLANCO AL 40 %, y no al acento. Con blanco al 40 % el borde
        se recorta con 3,73:1 del suelo de fuera y 3,61:1 de la pared de dentro,
        que es lo que hace falta por los dos lados. Con el acento al 42 % —que es
        lo que la tarjeta viva de la portada usa para decir «esto está vivo»— se
        queda en 1,83 sobre este par, que es la misma cifra por la que `muebles.ts`
        lo descartó para el borde de un botón (allí midió 1,77 sobre la teja); y
        con el acento PLENO, que sí llegaría, el campo entero pasaría a ser una
        cuarta cosa teñida a un dedo de la nave, que es justo lo que la doctrina
        del color de este fichero no quiere. Un límite es geometría, no estado.

        Los dos píxeles de más son el borde: el hueco interior tiene que seguir
        midiendo `lado` EXACTO, porque de ahí sale `escala` y con ella la caja de
        colisión. Un píxel comido aquí mueve la nave respecto a lo que la mata.
      */}
      <View style={[estilos.campo, { width: lado + 2, height: lado + 2 }]}>
        {/*
          EL JUEGO SE PRESENTA, que es lo mínimo con un lector de pantalla: el
          `Canvas` no tenía ni rol ni nombre, así que la mitad de la pantalla era
          un hueco sin anunciar. Es el mismo patrón que el raíl de aforo de
          `piezas.tsx` y la tarjeta de la portada: `image` más una etiqueta que
          dice lo que se ve — ver `ETIQUETA_DEL_CAMPO`.
        */}
        <Canvas
          style={{ width: lado, height: lado }}
          accessibilityRole="image"
          accessibilityLabel={ETIQUETA_DEL_CAMPO}
        >
          {/*
            UNA SOLA LLAMADA DE DIBUJO, sean dos sprites o veinticinco. Es la razón
            por la que este mueble es Skia y no Vistas, y es lo que hace que el
            árbol de React no cambie ni una vez durante la partida.
          */}
          <Atlas image={textura} sprites={recortes} transforms={transformaciones} />
        </Canvas>

        {/*
          LAS DOS MITADES. Se pintan encima del lienzo y no dentro: Skia dibuja,
          no recibe toques, y meter la entrada dentro del árbol de dibujo ataría el
          control a la capa de pintado — el día que este juego se pinte con otra
          cosa habría que reescribir también cómo se juega.

          ═══ Y NO SE ANUNCIAN COMO BOTONES, PORQUE NO LO SON ═══

          Iban con `accessibilityRole="button"` y «Mover a la izquierda» / «Mover a
          la derecha», y eso era una promesa que la entrada no puede cumplir: el
          rumbo sólo vive entre `onPressIn` y `onPressOut`, y el toque sintético de
          TalkBack o de VoiceOver los encadena sin espera. Cero fotogramas de
          movimiento — contra los DOCE que el bloque de «MANTÉN PULSADA» de aquí
          abajo cuenta que ya se leyeron una vez como «el juego está roto». Dos
          botones que se anuncian, se activan y no hacen nada son peor que ningún
          botón: mandan a quien los usa a repetir el gesto que no funciona.

          Así que la capa de accesibilidad deja de mentir —las tres propiedades,
          porque cada plataforma entiende la suya, igual que en `index.tsx`— y la
          etiqueta se la queda el campo de aquí arriba, que además dice que hay que
          MANTENER PULSADO. Lo que arreglaría de verdad esto es un empujón
          por activación —un rumbo que dure unos fotogramas y se suelte solo—, y
          eso es una manera nueva de jugar y una entrada nueva en la repetición:
          se decide arriba, no en una corrección de presentación.
        */}
        {momento === 'jugando' ? (
          <View
            style={estilos.mandos}
            pointerEvents="box-none"
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            aria-hidden
          >
            <Pressable
              style={estilos.mitad}
              onPressIn={() => empujar(-1)}
              onPressOut={() => empujar(0)}
            />
            <Pressable
              style={estilos.mitad}
              onPressIn={() => empujar(1)}
              onPressOut={() => empujar(0)}
            />
          </View>
        ) : null}

        {/*
          ═══ EL VELO SE DESPLAZA, Y ESO ES LO QUE DEVUELVE EL BOTÓN «OTRA» ═══

          Era un `View` centrado dentro de un campo con `overflow: 'hidden'`, o sea
          que lo que no cupiera no se reajustaba: se cortaba, y por los dos
          extremos a la vez por culpa del `justifyContent: 'center'`. Medido en el
          peor caso realista —un móvil de 360 × 640, o sea 288 píxeles útiles
          dentro del campo, con la ampliación de letra del sistema al 200 % y un
          motivo de rechazo del servidor de los 300 caracteres que permite
          `marcador.ts`—: el contenido mide 794 contra 288. Sobran 506 repartidos
          arriba y abajo, unos 253 por lado, y ahí dentro está el botón «Otra». Es
          decir: se pierde una partida, el servidor contesta largo, y la pantalla
          se queda sin manera de repetir. Sólo sobrevivía «Volver», que vive fuera
          del campo.

          LA RECETA ES LA DE `Pantalla` DE `piezas.tsx` —`flexGrow: 1` más
          `justifyContent: 'center'` en el contenedor de CONTENIDO— y no la pieza
          entera: `Pantalla` es `flex: 1` con el fondo opaco de la casa, y esto
          tiene que ser un velo del suelo al 82 % pegado a los cuatro lados del
          campo. Lo que se copia es lo que resuelve el problema: mientras el
          contenido quepa se queda centrado igual que antes, y cuando no quepa se
          desplaza.

          Y NO ENVUELVE A LA PANTALLA ENTERA a propósito, aunque la casa lo pida en
          las otras cuatro: un `ScrollView` por encima del campo se queda con el
          arrastre que gobierna la nave —basta que el contenido crezca un píxel de
          más para que arrastrar el pulgar desplace en vez de mover— y aquí eso no
          es un defecto de presentación, es el juego. El velo sólo existe cuando
          NO se está jugando, así que ahí no hay nada que robar. El alto de la
          pantalla lo resuelve `lado`, que se calcula contra la ventana.
        */}
        {momento !== 'jugando' ? (
          <ScrollView
            style={estilos.encima}
            contentContainerStyle={estilos.encimaDentro}
            showsVerticalScrollIndicator={false}
            /*
              LA PANTALLA CAMBIA ENTERA Y EL FOCO NO SE MUEVE: sin esto, quien juega
              con lector de pantalla no se entera de que la partida ha terminado.
              `polite` para que espere su turno detrás de la cifra.
            */
            accessibilityLiveRegion="polite"
            aria-live="polite"
          >
            {momento === 'antes' ? (
              <>
                <Text style={estilos.texto}>{MANIFIESTO_EL_ARCADE.gancho}</Text>
                {/*
                 * «MANTÉN PULSADA» y no «toca», y la diferencia no es de estilo.
                 *
                 * La entrada son `onPressIn`/`onPressOut`: se empuja mientras el
                 * dedo está abajo y se suelta al levantarlo. Un toque de los de
                 * verdad —dos décimas de segundo— mueve la nave doce fotogramas,
                 * que a simple vista es no moverla.
                 *
                 * Aquí decía «toca». Quien lo jugó por primera vez tocó, no vio
                 * moverse la nave, y dio el juego por roto —el bucle estaba
                 * perfecto: mentía la instrucción—. Es el único fallo de esta
                 * pantalla que no puede cazar ningún comprobador, porque no está
                 * en el código: está en lo que el jugador cree que tiene que
                 * hacer. Solo sale jugando.
                 */}
                <Text style={estilos.pista}>
                  Mantén pulsada la mitad izquierda o la derecha para moverte.
                </Text>
                <BotonDeArcade
                  texto={preparando ? 'Preparando…' : 'Empezar'}
                  alPulsar={empezar}
                  apagado={preparando}
                />
                {/*
                  Sin conexión NO es una alarma: se puede jugar igual, sólo que
                  la partida no cuenta. El naranja está reservado para lo que se
                  acaba y lo que mata, y gastarlo aquí sería enseñárselo a quien
                  juega antes de que signifique algo.

                  PERO TAMPOCO ES UNA FRASE GRIS MÁS. Iba en `pista` —`tenue`, 14,
                  centrada— o sea del mismo color, del mismo cuerpo y del mismo
                  ancho que la instrucción de encima: dos renglones seguidos que se
                  leen como un párrafo, con un ESTADO escondido dentro. La casa
                  tiene una pieza para decir estados y es la pastilla con piloto de
                  `piezas.tsx`, la misma que la tarjeta de la portada: rótulo en
                  mayúsculas, blanco, y un aro frío que dice que esto no está
                  encendido. La consecuencia —que la partida no entra en la tabla—
                  se queda debajo, que es donde va una explicación.
                */}
                {!preparando && anuncio === null ? (
                  <>
                    <PastillaDeEstado texto="Sin conexión" encendido={false} />
                    <Text style={estilos.pista}>
                      Se puede jugar, pero esta partida no entra en la tabla.
                    </Text>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Text style={estilos.texto}>Se acabó. {esquivadas} esquivadas.</Text>
                {/*
                  LAS TRES FRASES VAN DEL MISMO COLOR, y antes la de fallo iba en
                  naranja. Que la partida no se haya podido publicar no es una
                  emergencia: es una noticia, y la da la frase. El color de aviso
                  de esta Sala significa una cosa sola —que te matan— y si además
                  significara «el servidor dijo que no», dejaría de avisar de la
                  primera, que es la que hay que ver de reojo y en un segundo.

                  Y CUANDO NO HAY NADA QUE DECIR NO SE PINTA NADA: ver
                  `mensajeDeLaSubida`, que es `null` y no cadena vacía.
                */}
                {mensajeDeLaSubida !== null ? (
                  <Text style={estilos.pista}>{mensajeDeLaSubida}</Text>
                ) : null}
                <BotonDeArcade texto="Otra" alPulsar={otra} etiqueta="Otra partida" />
              </>
            )}
          </ScrollView>
        ) : null}
      </View>

      <Pressable
        onPress={() => router.back()}
        style={estilos.salir}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <Text style={estilos.salirTexto} maxFontSizeMultiplier={1.5}>
          Volver
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * EL BOTÓN GRANDE, QUE ES EL CAMPO DE COLOR DE ESTA PANTALLA.
 *
 * Existe como pieza y no como dos `Pressable` calcados porque el acento es una
 * decisión de la Sala, no de esta pantalla: si mañana el campo de color se pinta
 * de otra manera, se cambia aquí y las dos pantallas —«Empezar» y «Otra»— dicen
 * lo mismo. Dos copias es cómo se acaba teniendo un botón que brilla y otro que
 * no sin que nadie lo haya decidido.
 *
 * APAGADO NO ES EL MISMO BOTÓN MÁS PÁLIDO: pierde el campo de acento entero y se
 * queda en teja con filo, porque en esta Sala el acento significa «esto responde
 * al dedo». Mientras se pide la partida al servidor, no responde. Eso ya estaba
 * bien —ni un `opacity` en el fichero, que es lo que apagaría también la letra y
 * dejaría la etiqueta en 2,32:1— y ahora además sale de la tabla `BOTON`.
 *
 * ═══ Y EL ENCENDIDO ERA UN DEGRADADO CON TEXTO BLANCO, QUE NO PASABA ═══
 *
 * Llevaba `LinearGradient` de `acento` a `acentoHondo` con el texto en
 * `SALA.blanco`. Medido: con `start` (0,0) y `end` (0,4;1) el parámetro del
 * degradado es t=(0,4x+y)/1,16, o sea t=0,603 en el centro del rótulo y t=0,474
 * en el alto de las mayúsculas. El blanco #F4F6FA contra el degradado en esa
 * banda da 5,21 y 4,83 en violeta, 5,24 y 4,86 en carmesí, y 3,24 y 2,91 en
 * ÁMBAR y 3,33 y 2,99 en VERDE, contra el mínimo de 4,5 —15 píxeles en peso 800
 * no es texto grande: para eso harían falta 18,66—. Y en el borde de arriba,
 * sobre el acento vivo, 1,98 en ámbar y 2,11 en verde. O sea que en dos de los
 * cuatro temas el rótulo del único botón de la pantalla se desdibujaba sobre su
 * propio fondo.
 *
 * AHORA ES `BOTON.primario` DE `muebles.ts`: relleno de acento PLANO con tinta
 * `SALA.suelo`, que es la única pareja sólida que pasa a la vez el 4,5:1 del
 * texto y el 3:1 del recorte en los cuatro temas —5,01 / 9,22 / 8,69 / 5,40—. Es
 * la misma corrección que ya se hizo en el botón de la tarjeta de la portada.
 *
 * Con el relleno plano se van solas las otras dos deudas del degradado: no hay
 * que cortarlo en el 40 % ni ponerlo vertical para que el texto caiga donde el
 * color es hondo, y no hace falta ni luz de esquina ni velo. Esas tres cosas son
 * de una PORTADA —un campo de color grande con texto encima— y un botón de 48 de
 * alto no lo es. La casa pinta el suyo igual de plano (`app/app/index.tsx`).
 *
 * El cuerpo se queda en 15 y no baja a los 14 de la tarjeta: aquél vive dentro de
 * una tarjeta de 252 de ancho y éste es el único botón de una pantalla entera. El
 * mínimo de la casa son 13 y ninguno de los dos lo roza.
 */
function BotonDeArcade({
  texto,
  alPulsar,
  apagado = false,
  etiqueta,
}: {
  texto: string;
  alPulsar: () => void;
  apagado?: boolean;
  etiqueta?: string;
}): JSX.Element {
  return (
    <Pressable
      style={[estilos.boton, apagado ? estilos.botonApagado : null]}
      onPress={alPulsar}
      disabled={apagado}
      accessibilityRole="button"
      accessibilityState={{ disabled: apagado }}
      accessibilityLabel={etiqueta ?? texto}
    >
      <Text style={[estilos.botonTexto, apagado ? estilos.botonTextoApagado : null]}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: SALA.suelo, gap: 12 },
  cabecera: { alignItems: 'center', gap: 4 },
  /*
   * El rótulo del marcador iba con cuatro de tracking y a un gris que se quedaba
   * en 3,1 a 1 contra el fondo, o sea ilegible con el móvil en la mano y la
   * pantalla inclinada. `tenue` es el gris de leer de la tabla y pasa de 6 a 1;
   * el tracking baja al de los rótulos pequeños de la Sala, que ya está medido.
   */
  rotulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  /*
   * La cifra es lo único grande de la pantalla y va en `blanco`, que es lo que
   * la tabla reserva para las cifras grandes: no es un acento, es EL DATO. Y con
   * `tabular-nums` porque sube mientras se juega — sin ellas el número entero se
   * ensancha y se estrecha a cada esquivada, y lo que se ve es un temblor.
   */
  cifra: {
    ...LETRA.rotulo,
    color: SALA.blanco,
    fontSize: 40,
    lineHeight: 44,
    fontVariant: ['tabular-nums'],
  },
  campo: {
    backgroundColor: SALA.pared,
    borderRadius: RADIO.ficha,
    borderWidth: 1,
    /*
     * BLANCO AL 40 % Y NO `SALA.filo`, QUE ES BLANCO AL 7,5 %.
     *
     * El filo de la casa sirve para separar dos superficies que ya se distinguen
     * por la elevación; aquí no hay elevación que valga —`pared` contra `suelo`
     * son 1,03:1— así que todo el trabajo lo hace el borde, y el borde se quedaba
     * en 1,23:1 contra el 3:1 que pide un límite. Al 40 % da 3,73 contra el suelo
     * de fuera y 3,61 contra la pared de dentro. El porqué de este alfa y no del
     * acento está en el comentario del campo, donde se ve.
     */
    borderColor: conAlfa(SALA.blanco, 0.4),
    /* Para que lo que cae no se salga por la esquina redondeada. */
    overflow: 'hidden',
  },
  mandos: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  mitad: { flex: 1 },
  encima: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    /*
     * Era un `rgba(6,17,15,0.82)` a mano, y ese verde-negro no era de ninguna
     * paleta: venía de la Sala anterior. Ahora es el suelo de la casa con su
     * alfa, así que el velo sigue al fondo si el fondo cambia.
     */
    backgroundColor: conAlfa(SALA.suelo, 0.82),
  },
  /*
   * EL CONTENIDO DEL VELO, Y `flexGrow` NO ES `flex`. Es la receta de `Pantalla`
   * en `piezas.tsx`: con `flexGrow: 1` el contenido se centra mientras quepa y se
   * desplaza cuando no; con `flex: 1` o con el centrado puesto en el estilo del
   * propio `ScrollView` —que es el error fácil— vuelve a recortarse por los dos
   * extremos.
   */
  encimaDentro: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  texto: { ...LETRA.cuerpo, color: SALA.palabra, fontSize: 18, lineHeight: 26, textAlign: 'center', maxWidth: 340 },
  pista: { ...LETRA.cuerpo, color: SALA.tenue, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 340 },
  boton: {
    marginTop: 6,
    /* 48 de alto y no 44 justos: es el botón principal y se pulsa de pie. */
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    /* 28 de hueco menos el píxel del filo, que también ocupa. */
    paddingHorizontal: 27,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    /*
     * LOS TRES ESTADOS SALEN DE LA TABLA `BOTON` Y NO DE AQUÍ. Había un relleno de
     * `acentoHondo` con filo `filoVivo` porque debajo iba un degradado; sin él, lo
     * que manda es la pareja medida: relleno de acento pleno, borde del mismo
     * color —para que el recorte no dependa del filo— y tinta de suelo.
     */
    borderColor: BOTON.primario.borde,
    backgroundColor: BOTON.primario.fondo,
  },
  botonApagado: { backgroundColor: BOTON.quieto.fondo, borderColor: BOTON.quieto.borde },
  botonTexto: { ...LETRA.rotulo, color: BOTON.primario.tinta, fontSize: 15 },
  botonTextoApagado: { color: BOTON.quieto.tinta },
  /*
   * «Volver» era texto suelto de 34 de alto: por debajo del mínimo de dedo, y en
   * la esquina de una pantalla que se juega con los pulgares. Se metió en una
   * pastilla con filo, y el área táctil —`minHeight: 44`— sí quedó bien.
   *
   * LO QUE NO QUEDÓ BIEN ES QUE SE VIERA. El comentario decía que el filo «le da
   * forma de cosa pulsable sin gastar ni una gota de acento», y medido `SALA.filo`
   * —blanco al 7,5 %— sobre el suelo da 1,17:1 contra el 3:1 que pide un contorno
   * que identifica un control: el rectángulo no existía, y lo único que se veía
   * era el texto en `tenue` a 6,50:1. O sea que seguía siendo texto suelto en una
   * esquina, sólo que con más sitio para el dedo.
   *
   * Es el botón SECUNDARIO de la casa: sin relleno, texto y borde en acento
   * pleno. Sobre el suelo son 5,01 en violeta, 9,22 en ámbar, 8,69 en verde y 5,40
   * en carmesí, para el texto y para el borde a la vez. Y gasta acento a
   * conciencia: la doctrina de color de este fichero dice que el acento es lo que
   * responde al dedo, y «Volver» responde al dedo.
   */
  salir: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: BOTON.secundario.borde,
    backgroundColor: BOTON.secundario.fondo,
  },
  salirTexto: { ...LETRA.rotuloChico, color: BOTON.secundario.tinta, fontSize: 13 },
});
