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
 * ═══ EL COLOR DE ESTA PANTALLA: DOS SITIOS, Y NINGUNO ES DECORACIÓN ═══
 *
 * La Sala no reparte su acento en veinte detalles, porque repartido se apaga.
 * Aquí sólo hay dos cosas teñidas y las dos dicen algo que hace falta saber en
 * medio de una partida de sesenta hercios, sin leer:
 *
 *   · `SALA.acento` es LA NAVE y es el botón. Las dos son lo mismo: lo que
 *     responde al dedo. Todo lo demás de la pantalla —campo, rótulos, cifra,
 *     avisos— es gris frío.
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
 * metro la una de la otra y a sesenta fotogramas por segundo. Hoy no se nota
 * porque el tema es violeta para todo el mundo; el día que alguien encienda
 * `TEMAS_DE_SALA.ambar`, este juego pide distinguir un ámbar de un naranja en
 * marcha, que es justo lo que no se puede hacer.
 *
 * No se arregla desde este fichero —la salida es de la tabla: una alarma que se
 * aparte cuando el tema se le acerque, o un ámbar que no sea ese— y por eso aquí
 * sólo queda dicho, con nombre y sitio, para quien encienda el segundo tema.
 *
 * OJO CON EL ATLAS: `useTexture` hornea la imagen UNA VEZ, al montar, con las
 * dependencias vacías. Hoy da igual porque `SALA` es una constante compilada,
 * pero el día que la Sala deje elegir tema en caliente —`TEMAS_DE_SALA` ya tiene
 * los cuatro— la nave se quedará del color viejo hasta que se vuelva a entrar, y
 * será un fallo mudo. Se arregla pasándole las dependencias, no aquí.
 *
 * ═══ LO QUE NO SE HA PODIDO COMPROBAR, DICHO AQUÍ ═══
 *
 * Este fichero COMPILA y no se ha visto correr: en la máquina donde se escribió no
 * hay emulador, ni dispositivo, ni navegador con el que abrir la app. Lo que sí
 * está comprobado es todo lo que no depende de la pantalla —el reductor, la
 * repetición, el determinismo entre motores y el marcador— y lo que vigila el
 * mueble de lejos: `verify:canvaskit`, que caza el fallo mudo de la web.
 *
 * Se dice aquí porque un comentario que promete «probado en un iPhone» cuando
 * nadie lo abrió es exactamente la clase de mentira que este repositorio se dedica
 * a desmontar. La primera vez que alguien levante esto, que lo levante sabiendo
 * que es la primera vez.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue } from 'react-native-reanimated';
import { Atlas, Canvas, Group, RoundedRect, Skia, useRSXformBuffer, useTexture } from '@shopify/react-native-skia';
import type { SkRect } from '@shopify/react-native-skia';
import {
  CAIDA_MEDIO,
  CAMPO,
  EL_ARCADE,
  EMPEZAR_EL_ARCADE,
  MANIFIESTO_EL_ARCADE,
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
import { LETRA, RADIO, SALA } from './muebles';
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
   * El campo del juego es CUADRADO y mide 1000 × 1000 milésimas, así que aquí solo
   * se elige un lado y se multiplica. Que el campo no dependa de la pantalla es lo
   * que hace que la misma repetición dé la misma partida en un móvil y en un
   * portátil — si el campo se midiera en píxeles, el servidor no podría
   * reejecutarla.
   */
  const lado = Math.min(width - 24, height - 220);
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
        LA NAVE. La banda ocupa de 15 a 49 de los 64 de alto, que es la misma
        proporción que su caja de colisión —110 × 60 milésimas dentro de una celda
        de 110 × 110—. No es estética: un sprite más alto que su caja hace que el
        jugador vea cómo le rozan cosas que no le tocan, y uno más bajo, al revés.
        Si se cambian `NAVE_MEDIO_ANCHO` o `NAVE_MEDIO_ALTO` en las reglas, esta
        banda se cambia con ellos.
      */}
      <RoundedRect x={0} y={15} width={64} height={34} r={14} color={SALA.acento} />
      {/*
        El hueco de la nave va en BLANCO y no en el gris del texto: está encima
        de un campo de acento saturado, y ahí el gris de leer se ensucia. Es la
        misma regla que en la Sala pone `blanco` sobre la placa del nombre.
      */}
      <RoundedRect x={22} y={22} width={20} height={20} r={8} color={SALA.blanco} />
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
    { width: LADO_DEL_SPRITE * 2, height: LADO_DEL_SPRITE },
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

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.cabecera}>
        <Text style={estilos.rotulo}>
          {MANIFIESTO_EL_ARCADE.marcador.tipo === 'cifra'
            ? MANIFIESTO_EL_ARCADE.marcador.rotulo.toUpperCase()
            : 'PUNTOS'}
        </Text>
        <Text style={estilos.cifra}>{esquivadas}</Text>
      </View>

      {/*
        EL CAMPO ES UNA SUPERFICIE, Y SE DICE COMO SE DICEN AQUÍ TODAS: un
        escalón de elevación sobre el suelo y un filo de un píxel alrededor. Ni
        marco de máquina, ni bisel, ni chapa — en esta Sala no hay materia, y un
        lienzo negro sobre fondo negro no es sobriedad: es que no se ve dónde
        empieza el juego.

        Los dos píxeles de más son el borde: el hueco interior tiene que seguir
        midiendo `lado` EXACTO, porque de ahí sale `escala` y con ella la caja de
        colisión. Un píxel comido aquí mueve la nave respecto a lo que la mata.
      */}
      <View style={[estilos.campo, { width: lado + 2, height: lado + 2 }]}>
        <Canvas style={{ width: lado, height: lado }}>
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
        */}
        {momento === 'jugando' ? (
          <View style={estilos.mandos} pointerEvents="box-none">
            <Pressable
              style={estilos.mitad}
              onPressIn={() => empujar(-1)}
              onPressOut={() => empujar(0)}
              accessibilityRole="button"
              accessibilityLabel="Mover a la izquierda"
            />
            <Pressable
              style={estilos.mitad}
              onPressIn={() => empujar(1)}
              onPressOut={() => empujar(0)}
              accessibilityRole="button"
              accessibilityLabel="Mover a la derecha"
            />
          </View>
        ) : null}

        {momento !== 'jugando' ? (
          <View style={estilos.encima}>
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
                */}
                {!preparando && anuncio === null ? (
                  <Text style={estilos.pista}>
                    Sin conexión con el servidor: se puede jugar, pero esta partida no entra en la
                    tabla.
                  </Text>
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
                */}
                <Text style={estilos.pista}>
                  {subiendo
                    ? 'Mandando la partida para que la comprueben…'
                    : comoFue === null
                      ? ''
                      : comoFue.publicada
                        ? `Comprobada: ${comoFue.cifra} cuenta para la tabla.`
                        : comoFue.porque}
                </Text>
                <BotonDeArcade texto="Otra" alPulsar={otra} etiqueta="Otra partida" />
              </>
            )}
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={() => router.back()}
        style={estilos.salir}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <Text style={estilos.salirTexto}>Volver</Text>
      </Pressable>
    </View>
  );
}

/**
 * EL BOTÓN GRANDE, QUE ES DONDE VIVE EL COLOR CUANDO NO SE ESTÁ JUGANDO.
 *
 * Existe como pieza y no como dos `Pressable` calcados porque el acento es una
 * decisión de la Sala, no de esta pantalla: si mañana el campo de color se pinta
 * de otra manera, se cambia aquí y las dos pantallas —«Empezar» y «Otra»— dicen
 * lo mismo. Dos copias es cómo se acaba teniendo un botón que brilla y otro que
 * no sin que nadie lo haya decidido.
 *
 * APAGADO NO ES EL MISMO BOTÓN MÁS PÁLIDO: pierde el campo de acento entero y se
 * queda en teja con filo, porque en esta Sala el acento significa «esto responde
 * al dedo». Mientras se pide la partida al servidor, no responde.
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
      {/*
        El degradado va DETRÁS del texto y no como fondo del `Pressable` porque
        en React Native un fondo es un color plano y esto son dos. Los dos puntos
        salen de la maqueta —cae hacia abajo y algo a la derecha—, y el borde
        queda fuera del relleno absoluto, así que el filo se sigue viendo.
      */}
      {apagado ? null : (
        <LinearGradient
          colors={[SALA.acento, SALA.acentoHondo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
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
    borderColor: SALA.filo,
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    /*
     * Era un `rgba(6,17,15,0.82)` a mano, y ese verde-negro no era de ninguna
     * paleta: venía de la Sala anterior. Ahora es el suelo de la casa con su
     * alfa, así que el velo sigue al fondo si el fondo cambia.
     */
    backgroundColor: conAlfa(SALA.suelo, 0.82),
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
    borderColor: SALA.filoVivo,
    /*
     * El color de abajo del degradado, plano, debajo de él. No es adorno: el
     * `LinearGradient` es un hijo que se monta, y sin esto el primer fotograma
     * enseñaría un botón transparente con el texto blanco al aire.
     */
    backgroundColor: SALA.acentoHondo,
    overflow: 'hidden',
  },
  botonApagado: { backgroundColor: SALA.teja, borderColor: SALA.filo },
  botonTexto: { ...LETRA.rotulo, color: SALA.blanco, fontSize: 15 },
  botonTextoApagado: { color: SALA.tenue },
  /*
   * «Volver» era texto suelto de 34 de alto: por debajo del mínimo de dedo, y en
   * la esquina de una pantalla que se juega con los pulgares. Se queda en la
   * pastilla con filo de la maqueta, que además le da forma de cosa pulsable sin
   * gastar ni una gota de acento.
   */
  salir: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: SALA.filo,
  },
  salirTexto: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
});
