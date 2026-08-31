/**
 * EL BUCLE DE SIMULACIÓN: sesenta pasos por segundo, pase lo que pase.
 *
 * ═══ EL FALLO QUE ESTE FICHERO EXISTE PARA NO TENER ═══
 *
 * Un bucle de fotogramas escrito de la forma evidente —«en cada fotograma, un
 * paso»— funciona perfectamente en el móvil de quien lo escribió y hace DOS COSAS
 * distintas en el de al lado:
 *
 *   · En una pantalla de 120 Hz, el juego corre al DOBLE de velocidad. No un poco
 *     más rápido: exactamente el doble, porque hay el doble de fotogramas.
 *   · Y en cuanto el aparato pierde un fotograma —una notificación, el recolector
 *     de basura, otra app despertando— la partida da un salto que nadie ve pero
 *     que cambia el resultado.
 *
 * Lo segundo es lo grave, y no por lo que parece. Este juego tiene marcador, o
 * sea que su partida se REEJECUTA en el servidor para verificar la cifra. Si el
 * número de pasos depende de cuántos fotogramas dio el aparato, la repetición de
 * una partida honrada no reproduce la partida que hubo, y el récord de quien jugó
 * limpio sale rechazado. Un falso negativo en el único sitio donde un falso
 * negativo destruye la confianza en la cifra.
 *
 * ═══ LA SALIDA: PASO FIJO, INTEGRANDO POR `timeSincePreviousFrame` ═══
 *
 * El fotograma no es el paso. El fotograma trae MILISEGUNDOS, y los milisegundos
 * se acumulan hasta que dan para uno o varios pasos de duración fija. Lo que
 * sobra se guarda para el fotograma siguiente.
 *
 * Con eso, treinta fotogramas por segundo y ciento veinte producen exactamente la
 * misma partida: uno mete dos pasos por fotograma y el otro uno cada dos. Y la
 * partida se puede reejecutar sabiendo solo CUÁNTOS pasos hubo, que es lo que
 * hace que la repetición quepa en unos cientos de bytes en vez de en un fichero
 * con un apunte por fotograma.
 *
 * ═══ EL BUCLE NO DECIDE NADA. SOLO LLAMA ═══
 *
 * Aquí no hay ni una regla del juego: ni colisiones, ni puntos, ni dificultad, ni
 * qué pasa al perder. El tic entra por la misma puerta que un dedo en la pantalla
 * —`avanzar(arcade, estado, movimiento, ctx)`— y lo único que este fichero sabe
 * es cuántas veces hay que llamar.
 *
 * Es la misma disciplina que `local.ts` aplica a los juegos de formulario, y por
 * la misma razón: en cuanto el anfitrión decide algo, ese algo deja de estar en
 * el registro de movimientos y la partida deja de poderse reejecutar.
 *
 * ═══ POR QUÉ EL RELOJ VA EN EL HILO DE INTERFAZ Y EL REDUCTOR NO ═══
 *
 * Y esto conviene decirlo entero, porque es la decisión que más cuesta del
 * fichero y no es la que uno esperaría de un juego de sesenta hercios.
 *
 * `useFrameCallback` de Reanimated ejecuta su cuerpo como *worklet*, o sea EN EL
 * HILO DE INTERFAZ. Eso es exactamente lo que se quiere para el reloj: los
 * milisegundos entre fotogramas se miden donde se pintan los fotogramas, sin que
 * un hilo de JavaScript ocupado los deforme.
 *
 * El REDUCTOR, en cambio, corre en el hilo de JavaScript, y es a propósito: es el
 * mismo fichero de `shared/arcade/juegos/arcade.ts` que importa el servidor para
 * verificar el récord. Convertirlo en worklet significaría marcarlo —a él y a
 * `mecanicas/azar.ts` y a media docena de funciones más— con la directiva de
 * Reanimated, o sea meter una dependencia del móvil DENTRO del núcleo de reglas
 * que tiene que correr también en Node. La frontera que sostiene los dos motores
 * se rompería por el sitio menos visible que hay.
 *
 * Así que el reparto es: EL HILO DE INTERFAZ CUENTA EL TIEMPO, EL HILO DE
 * JAVASCRIPT JUEGA. Se paga un salto de hilo por fotograma —uno, no uno por
 * paso—, y lo que se compra es que las reglas sigan siendo un fichero que corre
 * igual en un teléfono y en un servidor.
 *
 * Si algún día eso no da el rendimiento necesario, la salida NO es workletizar
 * `shared/`: es escribir una segunda implementación del mismo reductor y hacer
 * que `verify:determinismo` compare las dos. Queda anotado aquí para que nadie
 * tome el atajo pensando que es gratis.
 *
 * ═══ EL TOPE POR FOTOGRAMA, QUE NO ES UNA OPTIMIZACIÓN ═══
 *
 * Si la app se va al fondo un minuto, al volver habría sesenta segundos de
 * milisegundos acumulados: tres mil seiscientos pasos de golpe, en un solo
 * fotograma. Eso es la «espiral de la muerte» clásica —cada fotograma tarda más,
 * así que el siguiente acumula más— y aquí además mataría al jugador con la
 * pantalla apagada.
 *
 * Se acota lo que se puede acumular. La consecuencia se dice en vez de
 * disimularse: LA PARTIDA PIERDE ESE TIEMPO. Quien se vaya al fondo vuelve a una
 * partida donde no ha pasado nada, y eso es correcto para un arcade de un jugador
 * —lo contrario sería llegar muerto— y es una diferencia con `local.ts`, donde
 * los plazos son instantes absolutos y saltar es lo que hay que hacer.
 *
 * Y no rompe la verificación: lo que se graba es lo que ENTRÓ por el reductor, no
 * lo que el reloj de pared habría querido. La repetición reproduce la partida que
 * hubo. Lo que sí hace es separar la duración declarada del tiempo de pared, y
 * por eso `server/src/arcade/marcadores.ts` compara las dos con margen ancho por
 * arriba y estrecho por abajo, y explica allí por qué.
 *
 * ═══ Y EL TOPE HAY QUE PONERLO EN LOS DOS HILOS, QUE ES LO QUE FALTABA ═══
 *
 * El párrafo de arriba estuvo escrito durante toda la fase describiendo un tope
 * que solo existía en la mitad del camino. El recorte vivía en el worklet, sobre
 * el sobrante, así que protegía del caso «no llegan fotogramas» —la app al
 * fondo—. Pero el caso que de verdad ocurre en un móvil barato es el otro: el
 * hilo de interfaz sigue recibiendo fotogramas y el de JAVASCRIPT se atasca. Ahí
 * el sobrante no crece nunca, el tope no recorta nada, y lo que se amontona es la
 * COLA de `runOnJS`: un segundo de atasco son sesenta avisos que se ejecutan
 * seguidos en cuanto el hilo respira, o sea sesenta pasos en un fotograma visible
 * y la nave desplazada casi el campo entero.
 *
 * O sea, exactamente el salto que nadie ve y que cambia el resultado. El tope se
 * aplica ahora también del lado de JavaScript, contra el tiempo real que ha
 * pasado en ese hilo, y las dos cuentas viven en `paso-fijo.ts` para que
 * `verify:bucle` pueda ejecutarlas sin React, sin Reanimated y sin un aparato.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { runOnJS, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { avanzar, movimientoDeTic } from '../../../shared/arcade';
import type { ArcadeId, ContextoMovimiento, Movimiento } from '../../../shared/arcade';
import { pasosDelFotograma, pasosQueCaben } from './paso-fijo';

/**
 * Cuántos milisegundos se pueden acumular como mucho antes de tirar el resto.
 *
 * Doscientos cincuenta son quince pasos a sesenta hercios: de sobra para
 * absorber un tirón del recolector de basura o un fotograma perdido, y poco para
 * que una vuelta del fondo se convierta en una avalancha. Ver la cabecera.
 *
 * El mismo número vale para los DOS acumuladores —el del hilo de interfaz y el
 * del de JavaScript— y es una sola constante a propósito: son la misma política
 * aplicada a los dos lados de la frontera, y con dos números uno de ellos se
 * quedaría viejo el día que alguien ajustara el otro.
 */
const MS_MAXIMOS_ACUMULADOS = 250;

/**
 * UN MOVIMIENTO GRABADO, tal como viaja en la repetición.
 *
 * ═══ POR QUÉ LOS TICS NO ESTÁN AQUÍ, QUE ES LA MITAD DEL FORMATO ═══
 *
 * Una partida de cuarenta segundos son dos mil cuatrocientos tics y unas cincuenta
 * decisiones del dedo. Grabar los tics sería mandar dos mil cuatrocientas líneas
 * idénticas para decir algo que ya se sabe: que a un arcade con `tickHz: 60` le
 * entran sesenta tics por segundo, uno detrás de otro, sin huecos.
 *
 * Así que la repetición lleva LO QUE NO SE PUEDE DEDUCIR —las entradas y en qué
 * tic ocurrió cada una— más el total de tics, y el servidor la expande antes de
 * reejecutarla. La regla de expansión está escrita una sola vez, en
 * `server/src/arcade/repeticiones.ts`, y es la que decide que una entrada
 * marcada en el tic T se aplica DESPUÉS del paso T.
 *
 * Eso es exactamente lo que graba `usarPartidaDeFotogramas`: `ticAhora` sube con
 * cada paso, y una entrada se apunta con el contador que hay EN ESE MOMENTO, o
 * sea con cuántos pasos se han dado ya. La primera versión de la expansión hacía
 * lo contrario —las metía antes del paso— y el desfase de un paso rechazaba
 * récords honrados una de cada quince partidas sin dar ningún error. Que las dos
 * mitades sigan diciendo lo mismo ya no se afirma en esta prosa: lo comprueba el
 * tercer escalón de `verify:determinismo`.
 */
export interface EntradaGrabada {
  /** Cuántos pasos se habían dado cuando se hizo. Cero es «antes del primero». */
  tic: number;
  tipo: string;
  carga?: unknown;
}

// ---------------------------------------------------------------------------
// EL RELOJ
// ---------------------------------------------------------------------------

/** Lo que hay que decirle al reloj de paso fijo. */
export interface ComoLatir {
  /** A cuántos pasos por segundo. Sale del manifiesto del arcade. */
  hz: number;
  /** ¿Está corriendo? Con `false` no se pide ni un fotograma. */
  activo: boolean;
  /**
   * Qué hacer con los pasos que tocan. Corre en el HILO DE JAVASCRIPT.
   *
   * Recibe cuántos y no uno cada vez, para que un fotograma largo cueste un solo
   * salto de hilo en vez de quince.
   */
  pasos: (cuantos: number) => void;
}

/**
 * EL RELOJ DE PASO FIJO. Devuelve nada: lo único que hace es llamar.
 *
 * ═══ POR QUÉ TANTAS REFERENCIAS Y TANTO `useCallback` ═══
 *
 * No es manía. `useFrameCallback` vuelve a registrar su worklet cada vez que la
 * función que recibe cambia de identidad —su efecto lleva `[callback, autostart]`
 * en las dependencias— y este componente se redibuja MUCHAS VECES POR SEGUNDO,
 * porque la partida avanza. Con un worklet nuevo en cada renderizado, el bucle se
 * daría de baja y de alta sesenta veces por segundo.
 *
 * Así que el worklet se crea UNA vez y todo lo que puede cambiar entra por un
 * valor compartido o por una referencia: la frecuencia, si está activo y a quién
 * hay que avisar.
 */
export function usarPasoFijo({ hz, activo, pasos }: ComoLatir): void {
  /*
   * El sobrante vive en un valor compartido y no en una variable normal porque lo
   * lee y lo escribe el HILO DE INTERFAZ. Una variable de módulo o una referencia
   * de React no cruzan esa frontera: el worklet vería una copia congelada del
   * primer renderizado y el sobrante no se acumularía nunca.
   */
  const sobrante = useSharedValue(0);
  const msPorPaso = useSharedValue(hz > 0 ? 1000 / hz : 0);
  useEffect(() => {
    msPorPaso.value = hz > 0 ? 1000 / hz : 0;
  }, [hz, msPorPaso]);

  /*
   * ═══ Y EL SEGUNDO ACUMULADOR, EL DEL HILO DE JAVASCRIPT ═══
   *
   * El recorte del worklet protege del caso «no llegan fotogramas», y ése no es el
   * que ocurre en un móvil barato. El que ocurre es el contrario: el hilo de
   * interfaz sigue midiendo fotogramas y el de JavaScript se atasca —recolector de
   * basura, un sondeo largo, la navegación, el `JSON.stringify` de la subida—.
   * Entonces cada fotograma calcula UN paso y encola un `runOnJS` más; el sobrante
   * nunca crece, así que el tope de arriba no recorta nada, y al respirar el hilo
   * de JavaScript se ejecutan sesenta avisos seguidos de un paso cada uno.
   *
   * Sesenta pasos en un fotograma visible son setecientas veinte milésimas de nave
   * en un campo de mil: casi el campo entero, de un salto, sin que nadie lo vea. Es
   * literalmente el fallo que la cabecera de este fichero promete que no pasará, y
   * el tope estaba en el hilo equivocado para el caso que de verdad ocurre.
   *
   * Estas dos referencias son el mismo tope aplicado aquí: el crédito de tiempo
   * REAL de este hilo. La cuenta vive en `paso-fijo.ts`, sin React ni Reanimated
   * delante, para que `verify:bucle` pueda mirarla.
   *
   * `Date.now()` aquí es perfectamente legítimo y conviene decirlo, porque el
   * reductor lo tiene prohibido: esto es el ANFITRIÓN, no las reglas. Lo que se
   * graba y se reejecuta es cuántos pasos entraron, no cuándo entraron.
   */
  const creditoMs = useRef(0);
  const cuandoFueLaUltima = useRef(0);
  const msPorPasoAqui = useRef(hz > 0 ? 1000 / hz : 0);
  msPorPasoAqui.current = hz > 0 ? 1000 / hz : 0;

  /*
   * El destino de `runOnJS` tiene que ser la MISMA función siempre, y la que llega
   * por parámetro cambia en cada renderizado porque cierra sobre el estado. La
   * referencia de en medio resuelve las dos cosas a la vez: identidad estable
   * hacia el worklet, valor de ahora hacia el juego.
   */
  const ultimoDestino = useRef(pasos);
  ultimoDestino.current = pasos;
  const avisar = useCallback((cuantos: number): void => {
    const porPaso = msPorPasoAqui.current;
    const ahora = Date.now();
    const anterior = cuandoFueLaUltima.current;
    cuandoFueLaUltima.current = ahora;
    /*
     * La PRIMERA tanda después de arrancar se cree entera: no hay un «antes» con
     * el que medir, y el worklet ya la acotó al tope. Sin este caso, el primer
     * aviso de cada partida se tiraría siempre y el juego empezaría con un paso
     * de menos — pequeño, invisible, y suficiente para que la repetición cuente
     * una partida distinta de la que se vio.
     */
    const ganado = anterior === 0 ? cuantos * porPaso : ahora - anterior;
    const tanda = pasosQueCaben(
      creditoMs.current,
      ganado,
      cuantos,
      porPaso,
      MS_MAXIMOS_ACUMULADOS,
    );
    creditoMs.current = tanda.credito;
    if (tanda.pasos > 0) ultimoDestino.current(tanda.pasos);
  }, []);

  const enCadaFotograma = useCallback(
    (info: { timeSincePreviousFrame: number | null }): void => {
      'worklet';
      const ms = info.timeSincePreviousFrame;
      /*
       * El PRIMER fotograma no tiene anterior, así que no trae milisegundos. Sin
       * este corte, el `null` se sumaría como cero en unas versiones y como `NaN`
       * en otras, y un `NaN` en el acumulador deja el bucle muerto para siempre
       * sin un solo error por ninguna parte.
       */
      if (ms === null) return;

      const reparto = pasosDelFotograma(
        sobrante.value,
        ms,
        msPorPaso.value,
        MS_MAXIMOS_ACUMULADOS,
      );
      sobrante.value = reparto.sobrante;
      if (reparto.pasos > 0) runOnJS(avisar)(reparto.pasos);
    },
    [avisar, msPorPaso, sobrante],
  );

  const latido = useFrameCallback(enCadaFotograma, false);

  useEffect(() => {
    latido.setActive(activo);
    if (!activo) {
      /*
       * Al parar se tiran los DOS acumuladores. Si no, una pausa de diez minutos
       * volvería con un resto de hace diez minutos y el primer fotograma tras
       * reanudar metería un paso que no tocaba — pequeño, invisible, y suficiente
       * para que dos aparatos con la misma semilla vieran partidas distintas.
       *
       * `cuandoFueLaUltima` vuelve a cero y no a `Date.now()` a propósito: es lo
       * que hace que la primera tanda tras reanudar se crea entera en vez de
       * medirse contra un instante que no significa nada.
       */
      sobrante.value = 0;
      creditoMs.current = 0;
      cuandoFueLaUltima.current = 0;
    }
  }, [activo, latido, sobrante]);
}


// ---------------------------------------------------------------------------
// LA PARTIDA
// ---------------------------------------------------------------------------

/**
 * Lo que hay que decir para hospedar una partida a ritmo de fotograma.
 *
 * `E` es el estado del juego y `V` es lo poco de él que obliga a redibujar
 * React. Ver `resumen`, que es la decisión de diseño del fichero.
 */
export interface ComoSeJuega<E, V> {
  arcade: ArcadeId;
  /** De dónde parte, sin gastar azar. */
  partidaNueva: () => E;
  /**
   * La semilla de ESTA partida.
   *
   * La reparte el servidor al anunciar el inicio: si la eligiera el aparato,
   * quien juega podría probar semillas hasta encontrar la que le da la partida
   * fácil, y la cifra dejaría de significar nada. Ver `marcador.ts`.
   */
  semilla: number;
  /** ¿Se acabó? Lo sabe el juego; este fichero no mira dentro del estado. */
  seAcabo: (estado: E) => boolean;
  /**
   * ¿Corre el reloj ahora mismo? Con la app al fondo, no.
   *
   * Y con la pantalla enseñando un rótulo en vez de una partida, tampoco: quien
   * hospeda es el único que sabe eso. Lo que este hook añade por su cuenta es
   * apagarlo cuando `seAcabo` dice que sí, que es lo que puede saber solo.
   */
  activo: boolean;
  /** A cuántos pasos por segundo. Del manifiesto. */
  hz: number;

  /**
   * QUÉ PARTE DEL ESTADO OBLIGA A REDIBUJAR REACT.
   *
   * ═══ Y ÉSTE ES EL CAMPO QUE JUSTIFICA MEDIO FICHERO ═══
   *
   * La versión evidente de este hook guardaba el estado en un `useState` y lo
   * publicaba en cada tanda de pasos: sesenta renderizados por segundo. Funciona,
   * y tiene dos consecuencias que no se ven hasta que se lee el código de Skia:
   *
   *   · `useRSXformBuffer` —la pieza que hace que todos los sprites se dibujen de
   *     una sola llamada— arranca su `startMapper` EN CADA RENDERIZADO y para el
   *     anterior en el efecto de limpieza. Con sesenta renderizados por segundo
   *     son sesenta altas y sesenta bajas por segundo de una tubería entre hilos,
   *     para pintar exactamente lo mismo.
   *   · Y el árbol de React se reconcilia entero sesenta veces por segundo para
   *     cambiar un número que casi nunca cambia.
   *
   * Con `resumen`, React solo se entera de lo que se lee con los ojos —el momento
   * de la partida y la cifra— y el pintado a ritmo de fotograma va por el otro
   * carril: `alAvanzar` escribe en valores compartidos y Skia los lee desde el
   * hilo de interfaz sin pasar por aquí.
   *
   * Se le pide al juego y no se adivina porque EL ESTADO ES OPACO: este fichero
   * no puede saber qué de ahí dentro se ve y qué no. Es la misma razón por la que
   * `local.ts` pide `necesitaElReloj` en vez de deducirlo.
   */
  resumen: (estado: E) => V;
  /**
   * ¿Son el mismo resumen? Si lo son, no se redibuja.
   *
   * Se pide en vez de comparar con `===` porque un resumen útil es un objeto
   * —`{ momento, esquivadas }`— y dos objetos con el mismo contenido nunca son
   * idénticos. Sin esta función, `resumen` no ahorraría ni un renderizado y el
   * campo sería decorativo.
   */
  iguales: (uno: V, otro: V) => boolean;
  /**
   * Se llama con el estado nuevo después de cada tanda de pasos y de cada
   * movimiento. Corre en el hilo de JavaScript.
   *
   * Aquí es donde quien pinta copia lo suyo a valores compartidos. Que sea una
   * función y no un valor devuelto es lo que permite que eso ocurra SIN un
   * renderizado de React de por medio.
   */
  alAvanzar?: (estado: E) => void;
}

/** Una partida de arcade viviendo dentro del móvil, a ritmo de fotograma. */
export interface PartidaEnCurso<E, V> {
  /** Lo poco que se lee con los ojos. Cambia cuando `iguales` dice que cambió. */
  resumen: V;
  /** Mete un movimiento del juego. El tic lo pone esta capa. */
  mover: (tipo: string, carga?: unknown) => void;
  /** Otra partida desde cero, con otra semilla. Borra el registro. */
  reiniciar: (semilla: number) => void;

  /*
   * LAS TRES LECTURAS SON FUNCIONES Y NO VALORES, Y ESO NO ES UN DESCUIDO.
   *
   * Devolverlas como valores obligaría a tenerlas en `useState` —o se quedarían
   * congeladas en las del primer renderizado—, y eso es exactamente el
   * renderizado por fotograma que este hook existe para no hacer.
   *
   * Se leen cuando hacen falta, que es al terminar la partida, para subirla. No
   * sirven para pintar, y por eso no son reactivas.
   */
  /** El estado de ahora mismo. */
  leerEstado: () => E;
  /** Cuántos tics han entrado por el reductor. Es la duración de la partida. */
  leerTics: () => number;
  /** Todo lo hecho, listo para subir. Sin los tics: ver `EntradaGrabada`. */
  leerRegistro: () => readonly EntradaGrabada[];
}

/**
 * HOSPEDAR UN ARCADE DE SESENTA HERCIOS, y grabar lo que pase.
 *
 * ═══ POR QUÉ NO SE REUTILIZA `usarArcadeLocal` DE `local.ts` ═══
 *
 * Porque hacen dos cosas distintas, y su propia cabecera lo dice: aquél reparte
 * tics con un `setInterval` y, cuando el móvil vuelve del fondo, SALTA al tic que
 * toca metiendo uno solo. Eso es correcto para La Frente, cuyos plazos son
 * instantes absolutos —«vence en el tic 600»— y da igual llegar de golpe.
 *
 * Aquí no. Este juego CUENTA tics: cada paso mueve la nave doce milésimas y baja
 * la basura las suyas. Saltar trescientos de una vez lo teletransportaría todo, y
 * la partida dejaría de ser la que el servidor va a reejecutar.
 *
 * Y hay una segunda diferencia que no se ve: aquél no graba nada, porque un juego
 * sin marcador no tiene nada que demostrarle a nadie.
 *
 * ═══ EL ESTADO VIVE EN UNA REFERENCIA ═══
 *
 * Y no en `useState`, por lo que cuenta `ComoSeJuega.resumen`. La referencia es
 * además obligatoria por otro motivo que `local.ts` ya documenta: el bucle mete
 * pasos desde una función creada UNA vez, y sin ella cada paso partiría del
 * estado del primer renderizado y la partida no avanzaría jamás.
 */
export function usarPartidaDeFotogramas<E, V>({
  arcade,
  partidaNueva,
  semilla,
  seAcabo,
  activo,
  hz,
  resumen,
  iguales,
  alAvanzar,
}: ComoSeJuega<E, V>): PartidaEnCurso<E, V> {
  /*
   * El estado inicial se construye una sola vez, en el primer renderizado. Se
   * hace con una referencia y un centinela y no con `useState(partidaNueva)`
   * porque el estado NO es un valor de React: si lo fuera, cambiarlo redibujaría,
   * que es justo lo que se está evitando.
   */
  const estadoAhora = useRef<{ valor: E } | null>(null);
  if (estadoAhora.current === null) estadoAhora.current = { valor: partidaNueva() };
  const caja = estadoAhora.current;

  const [visto, setVisto] = useState<V>(() => resumen(caja.valor));

  const ticAhora = useRef(0);
  const grabado = useRef<EntradaGrabada[]>([]);

  /*
   * Todo lo que puede cambiar entre renderizados entra por una referencia. No es
   * ceremonia: las funciones de abajo se crean UNA vez —si cambiaran de
   * identidad, `usarPasoFijo` volvería a registrar su worklet en cada
   * renderizado— y sin estas referencias verían para siempre los valores del
   * primer renderizado.
   */
  const semillaAhora = useRef(semilla);
  semillaAhora.current = semilla;
  const partidaNuevaAhora = useRef(partidaNueva);
  partidaNuevaAhora.current = partidaNueva;
  const seAcaboAhora = useRef(seAcabo);
  seAcaboAhora.current = seAcabo;
  const resumenAhora = useRef(resumen);
  resumenAhora.current = resumen;
  const igualesAhora = useRef(iguales);
  igualesAhora.current = iguales;
  const alAvanzarAhora = useRef(alAvanzar);
  alAvanzarAhora.current = alAvanzar;
  const vistoAhora = useRef<V>(visto);

  /**
   * Publica hacia fuera lo que haya cambiado: primero el pintado, después React.
   *
   * El orden importa y es el que se lee: `alAvanzar` va antes porque es lo que se
   * ve moverse, y hacerlo esperar a un renderizado de React lo ataría al ritmo
   * más lento de los dos.
   */
  const publicar = useCallback(
    (estado: E): void => {
      alAvanzarAhora.current?.(estado);
      const ahora = resumenAhora.current(estado);
      if (igualesAhora.current(vistoAhora.current, ahora)) return;
      vistoAhora.current = ahora;
      setVisto(ahora);
    },
    [],
  );

  /**
   * La única puerta. Un movimiento, un contexto, un estado nuevo.
   *
   * El contexto sale con `quien: null` y `asientos: []` porque ésa es su forma
   * normal en un juego de un aparato y una persona: nadie se ha dado de alta en
   * nada, y `null` significa «no lo manda ningún asiento», que es lo mismo que
   * significa en el tic.
   */
  const meter = useCallback(
    (movimiento: Movimiento, enElTic: number): E => {
      const ctx: ContextoMovimiento = {
        quien: null,
        azar: semillaAhora.current,
        tic: enElTic,
        asientos: [],
      };
      const siguiente = avanzar(arcade, caja.valor, movimiento, ctx) as E;
      caja.valor = siguiente;
      return siguiente;
    },
    [arcade, caja],
  );

  const mover = useCallback(
    (tipo: string, carga?: unknown): void => {
      /*
       * Se graba SIEMPRE que se llama, aunque el reductor decida no hacer nada con
       * ello. Lo que la repetición tiene que reproducir es lo que ENTRÓ, no lo que
       * surtió efecto: si aquí se filtrara por «ha cambiado el estado», dos
       * movimientos que el juego ignora hoy y acepta mañana harían que las
       * repeticiones antiguas dejaran de cuadrar.
       *
       * Quitar los repetidos es cosa de quien llama, y tiene que serlo: es una
       * decisión sobre la ENTRADA —«el dedo sigue donde estaba»— y no sobre el
       * registro. Ver `arcade.tsx`, que solo manda el rumbo cuando cambia.
       */
      const entrada: EntradaGrabada =
        carga === undefined
          ? { tic: ticAhora.current, tipo }
          : { tic: ticAhora.current, tipo, carga };
      grabado.current.push(entrada);
      publicar(meter(carga === undefined ? { tipo } : { tipo, carga }, ticAhora.current));
    },
    [meter, publicar],
  );

  /** Los pasos que el reloj ha decidido que tocan. Uno a uno, sin saltos. */
  const darPasos = useCallback(
    (cuantos: number): void => {
      /*
       * De dónde se sale, para saber al final si ha pasado algo. Ver el `publicar`
       * condicional de abajo: publicar sin que el estado haya cambiado no es
       * gratis, y este bucle puede terminar sin dar un solo paso.
       */
      const alEmpezar = caja.valor;
      let ultimo = caja.valor;
      for (let i = 0; i < cuantos; i++) {
        /*
         * Se para en cuanto el juego dice que se acabó. Seguir metiendo tics
         * después del final no cambiaría el estado —el reductor devuelve el mismo
         * objeto— pero SÍ subiría el contador de tics, y ese contador es la
         * duración que el servidor contrasta con el reloj de pared. Una partida de
         * diez segundos declarando cuarenta es un récord rechazado por culpa del
         * anfitrión.
         */
        if (seAcaboAhora.current(ultimo)) break;
        ticAhora.current = ticAhora.current + 1;
        ultimo = meter(movimientoDeTic(), ticAhora.current);
      }
      /*
       * ═══ SOLO SE PUBLICA SI DE VERDAD HA CAMBIADO ALGO ═══
       *
       * El reductor devuelve EL MISMO OBJETO cuando un movimiento no le hace nada
       * —es la tercera regla de su contrato—, así que comparar por identidad basta
       * y no hace falta mirar dentro de un estado que es opaco.
       *
       * Sin esta condición, `publicar` se llamaba siempre, incluso cuando el `for`
       * se cortaba en la primera vuelta porque la partida ya estaba perdida. Y
       * `publicar` llama a `alAvanzar`, que en el mueble de lienzo asigna una LISTA
       * NUEVA a un valor compartido: eso despierta al mapper de `useRSXformBuffer`
       * y repinta el atlas. Medido con el juego corriendo, salían 58 dibujos por
       * segundo con la pantalla diciendo «Se acabó» — la GPU al máximo para pintar
       * dos veces lo mismo, con el bloqueo de pantalla ya soltado.
       *
       * La otra mitad de aquel derroche era que el reloj seguía activo fuera de la
       * partida, y se arregla donde toca: quien hospeda pasa `activo` con el
       * momento dentro. Las dos contribuían y ninguna tapaba a la otra.
       */
      if (ultimo !== alEmpezar) publicar(ultimo);
    },
    [caja, meter, publicar],
  );

  /*
   * ═══ EL RELOJ SE APAGA SOLO CUANDO EL JUEGO DICE QUE SE ACABÓ ═══
   *
   * `darPasos` ya se corta ahí dentro, pero cortarse no es apagarse: el worklet
   * seguía pidiendo fotogramas, saltando de hilo y llamando a este bucle sesenta
   * veces por segundo para no dar un solo paso.
   *
   * Quien hospeda puede apagar el reloj por su cuenta —y debe, porque solo él sabe
   * si su pantalla está enseñando un rótulo—, pero esto no depende de que se
   * acuerde: un arcade con marcador que siguiera latiendo después de perder es
   * batería quemada para no simular nada, y el sitio donde eso se sabe sin
   * preguntarle a nadie es aquí.
   *
   * Se evalúa en el renderizado y no en un efecto porque `visto` cambia justo
   * cuando cambia el momento de la partida: el renderizado que trae el final es el
   * mismo que apaga el reloj.
   */
  const enMarcha = activo && !seAcabo(caja.valor);
  usarPasoFijo({ hz, activo: enMarcha, pasos: darPasos });

  const reiniciar = useCallback(
    (nuevaSemilla: number): void => {
      semillaAhora.current = nuevaSemilla;
      ticAhora.current = 0;
      grabado.current = [];
      caja.valor = partidaNuevaAhora.current();
      publicar(caja.valor);
    },
    [caja, publicar],
  );

  const leerEstado = useCallback((): E => caja.valor, [caja]);
  const leerTics = useCallback((): number => ticAhora.current, []);
  const leerRegistro = useCallback((): readonly EntradaGrabada[] => grabado.current, []);

  return { resumen: visto, mover, reiniciar, leerEstado, leerTics, leerRegistro };
}
