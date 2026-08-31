/**
 * HOSPEDAR UNA PARTIDA DE ARCADE DENTRO DEL MÓVIL.
 *
 * Aquí es donde el reductor de `shared/arcade/` —el mismo fichero que importa el
 * servidor— corre en Hermes, en un teléfono, sin red. Es la mitad concreta de la
 * frase que ordena todo el árbol:
 *
 *     `shared/` son las reglas. `server/` es la autoridad.
 *
 * Con `sede: 'dispositivo'` no hay autoridad, y por eso este fichero es todo lo
 * que hace falta: no hay `rev`, ni canal, ni mesa, ni cuenta, ni nada que
 * sincronizar. El estado no sale del aparato, así que el único que podría hacer
 * trampa es quien está jugando.
 *
 * ═══ QUIÉN REPARTE LOS TICS, QUE ES LA PIEZA QUE FALTABA ═══
 *
 * Nadie, por debajo. `reloj.ts` lo dice con todas las letras: `tickHz` declara A
 * QUÉ RITMO hay que meter los tics y quien los mete es QUIEN HOSPEDA la partida.
 * En el móvil, ese alguien es este fichero.
 *
 * Y el tic entra por la misma puerta que un dedo en la pantalla: `avanzar(arcade,
 * estado, movimiento, ctx)`. No hay un camino aparte para el tiempo, y eso es lo
 * que hace que la partida se pueda reejecutar entera desde una semilla y una lista
 * de movimientos — sin eso, el reloj sería un cambio de estado que no está en el
 * diario y `oro:arcade` no significaría nada.
 *
 * ═══ EL TIC SE CUENTA CON EL RELOJ DE PARED, Y NO CON UN CONTADOR ═══
 *
 * Un `setInterval` que sume uno cada vez que dispara parece lo natural y hace que
 * el juego dure más de sesenta segundos: los temporizadores de JavaScript llegan
 * tarde, se acumulan los retrasos, y con la pantalla ocupada pintando una palabra
 * enorme se pierden unos cuantos por el camino. Un cronómetro de sesenta segundos
 * que en la práctica dura sesenta y ocho es un juego con una regla rota.
 *
 * Así que el intervalo solo despierta, y el tic que toca se calcula del reloj de
 * pared: `tics = (ahora − arranque) × hz`. El intervalo puede llegar tarde, puede
 * saltarse alguno y puede dispararse dos veces seguidas — la cuenta sigue siendo
 * la misma. El reloj de pared vive AQUÍ y no dentro del reductor, que es donde
 * estaría prohibido: allí lo caza `verify:pureza`.
 *
 * ═══ QUÉ PASA SI LA APP SE VA AL FONDO Y VUELVE ═══
 *
 * Que hay que ponerse al día. Se meten los tics que faltan de uno en uno hasta un
 * tope; pasado el tope, se SALTA al tic que toca y se mete uno solo.
 *
 * Saltar es correcto para La Frente y no lo es para todos, y conviene decir por
 * qué: sus plazos son INSTANTES ABSOLUTOS —«vence en el tic 600»— así que un tic
 * en el 4.000 cierra la ronda exactamente igual que si hubieran entrado los 3.400
 * anteriores. Un juego que CUENTE tics —el de sesenta fotogramas por segundo de la
 * fase 3— no puede permitírselo, y por eso tendrá su propio `bucle.ts` con paso
 * fijo. Este fichero es para juegos de formulario, y lo dice aquí para que nadie
 * lo estire hasta donde no llega.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { avanzar, manifiestoDeArcade, movimientoDeTic } from '../../../shared/arcade';
import type { ArcadeId, ContextoMovimiento, Movimiento, Tic } from '../../../shared/arcade';

/**
 * Cuántos tics se meten como mucho de una vez al ponerse al día.
 *
 * Cuatro mil son casi siete minutos a diez tics por segundo: de sobra para
 * cualquier vuelta al primer plano razonable, y poco para que meterlos de uno en
 * uno se note. Pasado eso —el móvil estuvo una hora en un bolsillo— se salta.
 */
const TOPE_AL_PONERSE_AL_DIA = 4000;

/**
 * Lo que hay que decirle para hospedar una partida.
 *
 * ═══ POR QUÉ `pintarElReloj` ES UN DATO Y NO LO ADIVINA ESTE FICHERO ═══
 *
 * Porque el estado es OPACO y este fichero no puede saber si ahí dentro hay una
 * cuenta atrás en pantalla o no. Lo sabe el mueble, que es quien pinta.
 *
 * Y hace falta saberlo. La primera versión publicaba el tic en cada tic que
 * avanzaba, pasara lo que pasara: diez repintados por segundo también en la
 * pantalla de antes de empezar y en la de «se acabó», para enseñar exactamente lo
 * mismo. Un móvil olvidado encima de la mesa al terminar una partida se repintaba
 * diez veces por segundo hasta que alguien pulsara Volver — con el brillo alto,
 * que es como se deja un juego que se lee a tres metros.
 *
 * Y de propina desmontaba el argumento del guardarraíl `sinTocar` de
 * `oro:arcade`, que congela que el reductor devuelva el MISMO objeto cuando no
 * pasa nada para que quien pinta pueda comparar por identidad: la comparación por
 * identidad estaba bien hecha ahí abajo, y el repintado ocurría igual por el otro
 * lado. Una medida en verde que no compraba lo que decía comprar.
 */
export interface ComoSeHospeda<E> {
  /** Qué arcade se juega. Lo demás sale de su manifiesto. */
  arcade: ArcadeId;
  /** De dónde parte la partida. Sin barajar y sin gastar azar. */
  partidaNueva: () => E;
  /** La semilla de esta mesa. Viaja en el contexto de cada movimiento. */
  semilla: number;
  /**
   * ¿Hay un reloj pintándose con ESTE estado?
   *
   * Cuando dice que sí, el tic sale hacia quien pinta en cada tic. Cuando dice
   * que no, los tics siguen entrando por el reductor exactamente igual —el plazo
   * tiene que poder vencer con la pantalla quieta— y el tic solo se publica
   * cuando el estado cambia de verdad.
   *
   * ES UNA FUNCIÓN Y NO UN `boolean`, y la diferencia importa: un booleano
   * llegaría por el renderizado anterior, o sea con un fotograma de retraso justo
   * en la frontera entre dos momentos, que es el único sitio donde se nota. La
   * función se pregunta en el instante, con el estado que hay.
   *
   * La escribe el mueble porque el estado es OPACO: este fichero no puede saber
   * si ahí dentro hay una cuenta atrás en pantalla. Lo sabe quien pinta.
   */
  necesitaElReloj: (estado: E) => boolean;
}

/** Una mesa de arcade viviendo dentro del móvil. */
export interface MesaLocal<E> {
  estado: E;
  /** En qué tic va la partida. Lo lleva el anfitrión, no el estado. */
  tic: Tic;
  /** Mete un movimiento del juego. El tic lo pone esta capa. */
  mover: (tipo: string, carga?: unknown) => void;
  /** Vuelve a empezar de cero, con otra semilla. */
  reiniciar: (semilla: number) => void;
}

/**
 * EL BUCLE. Un arcade de dispositivo, corriendo entero aquí dentro.
 *
 * Es genérico a propósito: no sabe qué juego lleva, no mira dentro del estado y no
 * conoce ni un tipo de movimiento. Lo único que sabe es lo que dice el manifiesto
 * —a qué ritmo van los tics— y cómo se llama la puerta.
 *
 * ═══ HASTA DÓNDE LLEGA ESA GENERALIDAD, DICHO SIN ADORNOS ═══
 *
 * Aquí ponía «el día que haya un segundo arcade de dispositivo, este fichero no
 * se toca», y no es verdad. Sirve para cualquier juego de UN APARATO Y UNA SOLA
 * PERSONA MOVIENDO: el contexto sale con `quien: null` y `asientos: []` clavados,
 * porque no hay ninguna forma de decirle otra cosa.
 *
 * El segundo arcade de dispositivo evidente es un pasa-el-móvil CON ASIENTOS —un
 * aparato, varias personas por turno—, que es literalmente el modelo que describe
 * `AsientoId` en `tipos.ts`. Su reductor recibiría `quien: null` en cada gesto y
 * no podría atribuir ni un movimiento: o rechaza todo o se lo apunta a nadie. Ese
 * día hay que venir aquí, y son dos campos.
 *
 * NO SE ESCRIBEN HOY a propósito, y es la misma disciplina que el §5 del diseño
 * aplica al núcleo: los conceptos entran cuando entra su juego. Un `quien` que
 * hoy nadie puede rellenar sería una tubería sin probar —el camino nuevo es el
 * que nadie recorre— y además habría que inventar sin un juego delante lo único
 * que de verdad cuesta: de dónde salen los asientos en un aparato compartido, qué
 * pantalla los pide y quién decide de quién es el gesto. Lo que sí se paga hoy es
 * lo que cuesta una línea: decirlo aquí en vez de prometer lo contrario.
 *
 * `E` es el tipo del estado del juego, que solo el juego conoce. El registro lo
 * guarda como `unknown` porque no puede conocer la forma de un estado que no
 * conoce; quien llama sí la sabe y la escribe aquí una vez.
 */
export function usarArcadeLocal<E>({
  arcade,
  partidaNueva,
  semilla,
  necesitaElReloj,
}: ComoSeHospeda<E>): MesaLocal<E> {
  const manifiesto = manifiestoDeArcade(arcade);

  const [estado, setEstado] = useState<E>(partidaNueva);
  const [tic, setTic] = useState<Tic>(0);

  /*
   * El estado y el tic viven TAMBIÉN en sendas referencias, y no es duplicarlos
   * por gusto: el intervalo se monta una vez y su función se queda con el valor
   * que hubiera al montarla. Sin las referencias, cada tic partiría del estado del
   * primer fotograma y la partida no avanzaría nunca — un fallo que además se
   * comporta bien al principio, que es lo peor que puede pasar.
   */
  const estadoAhora = useRef<E>(estado);
  const ticAhora = useRef<Tic>(0);
  const semillaAhora = useRef<number>(semilla);
  semillaAhora.current = semilla;
  /*
   * Y lo mismo con esto, por lo mismo: el intervalo se monta una vez y tiene que
   * ver el valor de AHORA, no el que hubiera cuando se montó. Con una dependencia
   * más en el efecto, cambiar de pantalla dentro del juego rearmaría el intervalo
   * y movería el instante de arranque del reloj de pared.
   */
  const preguntarPorElReloj = useRef<(estado: E) => boolean>(necesitaElReloj);
  preguntarPorElReloj.current = necesitaElReloj;

  /** Mete un movimiento por la única puerta que hay. */
  const meter = useCallback(
    (movimiento: Movimiento, enElTic: Tic): void => {
      /*
       * `quien: null` y `asientos: []` no son un contexto a medio montar: son su
       * forma normal en un juego de un solo aparato. `null` en `quien` significa
       * «no lo manda ningún asiento», que es lo que pasa con el tic y lo que pasa
       * con un móvil que va de mano en mano sin que nadie se dé de alta en nada.
       */
      const ctx: ContextoMovimiento = {
        quien: null,
        azar: semillaAhora.current,
        tic: enElTic,
        asientos: [],
      };
      const siguiente = avanzar(arcade, estadoAhora.current, movimiento, ctx) as E;
      if (siguiente === estadoAhora.current) return;
      estadoAhora.current = siguiente;
      setEstado(siguiente);
      /*
       * El estado ha cambiado, así que el tic sale con él aunque nadie esté
       * pintando un reloj. Si no, quien pinte vería un estado nuevo con un tic de
       * hace un rato —el de la última vez que se publicó— y un cronómetro que
       * arranca en un número absurdo durante una décima. Publicar aquí no cuesta
       * un repintado de más: el estado nuevo ya lo provoca.
       */
      setTic(enElTic);
    },
    [arcade],
  );

  const mover = useCallback(
    (tipo: string, carga?: unknown): void => {
      meter(carga === undefined ? { tipo } : { tipo, carga }, ticAhora.current);
    },
    [meter],
  );

  const reiniciar = useCallback(
    (nuevaSemilla: number): void => {
      semillaAhora.current = nuevaSemilla;
      const limpio = partidaNueva();
      estadoAhora.current = limpio;
      setEstado(limpio);
    },
    [partidaNueva],
  );

  // ── El reloj ─────────────────────────────────────────────────────────────
  useEffect(() => {
    /*
     * `tickHz: 0` es legítimo y es la mitad del catálogo: un juego por turnos no
     * quiere que nadie le meta tics. Aquí eso significa sencillamente no montar
     * ningún intervalo, y no un caso especial repartido por el fichero.
     */
    const hz = manifiesto.tickHz;
    if (!(hz > 0)) return undefined;

    const msPorTic = 1000 / hz;
    const arranque = Date.now();

    const ponerseAlDia = (): void => {
      const objetivo = Math.floor((Date.now() - arranque) / msPorTic);
      const atrasado = objetivo - ticAhora.current;
      if (atrasado <= 0) return;

      if (atrasado > TOPE_AL_PONERSE_AL_DIA) {
        /*
         * Estuvo demasiado tiempo fuera. Se salta al tic que toca y se mete UNO,
         * que para un juego cuyos plazos son instantes absolutos cierra lo que
         * tuviera que cerrarse exactamente igual. Ver la cabecera.
         */
        ticAhora.current = objetivo;
        meter(movimientoDeTic(), objetivo);
      } else {
        for (let t = ticAhora.current + 1; t <= objetivo; t++) {
          ticAhora.current = t;
          meter(movimientoDeTic(), t);
        }
      }
      /*
       * Y el tic solo se publica si hay un reloj pintándose. Los tics han entrado
       * por el reductor de todas formas —eso no es negociable, es como vence un
       * plazo— y lo que se evita es el repintado: sin esta línea, la pantalla de
       * «se acabó» se rehace diez veces por segundo para siempre. Ver
       * `ComoSeHospeda.necesitaElReloj`.
       */
      if (preguntarPorElReloj.current(estadoAhora.current)) setTic(ticAhora.current);
    };

    const latido = setInterval(ponerseAlDia, msPorTic);
    return () => clearInterval(latido);
  }, [manifiesto.tickHz, meter]);

  return { estado, tic, mover, reiniciar };
}

/**
 * ¿ESTÁ LA APP DELANTE AHORA MISMO?
 *
 * ═══ PARA QUÉ SIRVE ESTO EN UN JUEGO QUE NO SE PAUSA ═══
 *
 * No es para pausar nada: es para que un secreto no se quede fotografiado.
 *
 * Cuando una app se va al fondo, el sistema le hace una FOTO de la pantalla y la
 * enseña en el conmutador de aplicaciones —y la guarda en disco—. En un juego
 * cualquiera eso da igual; en éste, esa foto puede llevar dentro la palabra que
 * la única persona que no puede verla tiene delante de la cara. Y el camino más
 * probable para irse al fondo es justamente el gesto del juego: deslizar hacia
 * arriba empezando en el borde inferior es el gesto de inicio del sistema. Ver la
 * cabecera de `entrada.ts`.
 *
 * Así que quien pinta un secreto lo tapa en cuanto esto devuelve `false`. NO ES
 * UNA GARANTÍA y conviene no venderla como tal: en iOS la foto se toma justo tras
 * dejar de estar activo, así que se está corriendo una carrera contra el propio
 * sistema, y se gana casi siempre pero no por contrato. Lo que sí es seguro es lo
 * que se enseña al volver a mirar la lista de apps abiertas un rato después.
 *
 * Vive aquí y no en el mueble porque es una capacidad del APARATO, como el
 * bloqueo de orientación o la pantalla encendida, y cualquier arcade con secretos
 * la va a querer igual.
 */
export function usarPrimerPlano(): boolean {
  const [delante, setDelante] = useState<boolean>(() => AppState.currentState === 'active');
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (ahora) => {
      setDelante(ahora === 'active');
    });
    return () => suscripcion.remove();
  }, []);
  return delante;
}

/**
 * EL APARATO QUIETO: la pantalla encendida y la orientación bloqueada.
 *
 * ═══ ESTO NO ES ESTÉTICA: SON DOS REGLAS DEL JUEGO ═══
 *
 * La pantalla apagándose sola con el móvil apoyado en una frente no es un detalle
 * de acabado: es la partida cortada a los treinta segundos porque nadie ha tocado
 * el cristal —y en este juego NADIE VA A TOCARLO, que es la mecánica entera—. El
 * plazo de apagado por defecto de un teléfono es de medio minuto y la ronda dura
 * sesenta segundos, así que sin esto el juego se rompe SIEMPRE, no a veces.
 *
 * Y la orientación: el aparato se sujeta contra la frente, se ladea, se gira y se
 * pasa de mano en mano. Sin bloquearla, la palabra rota mientras la mesa la está
 * leyendo. Se bloquea en vertical porque es como se agarra un teléfono con una
 * mano cuando la otra está gesticulando.
 *
 * ═══ POR QUÉ TODO VA ENVUELTO EN `catch` ═══
 *
 * Porque esta app también se exporta a web —Render sirve la web y la API en el
 * mismo servicio— y ahí `lockAsync` no existe en todos los navegadores y el
 * bloqueo de orientación exige pantalla completa. Un fallo al pedir algo que no se
 * puede tener no puede llevarse por delante la partida: sin esto, abrir el juego
 * en un portátil sería una pantalla en blanco con una excepción que nadie ve.
 *
 * Y se SUELTAN LAS DOS al salir. Dejar la pantalla clavada encendida y el teléfono
 * en vertical después de cerrar el minijuego es de las cosas que se descubren
 * cuando a alguien se le acaba la batería.
 *
 * ═══ LAS DOS NO DURAN LO MISMO, Y ANTES SÍ ═══
 *
 * La orientación se bloquea mientras la pantalla del juego esté abierta: la
 * pantalla de resultados también se lee de lejos y también se pasa de mano en
 * mano, así que ahí el bloqueo sigue haciendo falta.
 *
 * La pantalla encendida a la fuerza, no. Eso vale mientras se JUEGA —nadie va a
 * tocar el cristal, que es la mecánica entera— y deja de valer en cuanto la ronda
 * termina: un móvil olvidado boca arriba encima de la mesa, con el brillo alto y
 * la pantalla clavada, no se apaga nunca. Se pide con un dato y no por la vida de
 * la pantalla, y quien lo pinta dice cuándo hace falta.
 */
export function usarElAparatoQuieto(mientrasHagaFalta: boolean): void {
  /* La orientación, mientras la pantalla exista. */
  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(
      () => undefined,
    );
    return () => {
      void ScreenOrientation.unlockAsync().catch(() => undefined);
    };
  }, []);

  /* Y la pantalla encendida, solo mientras haga falta. */
  useEffect(() => {
    if (!mientrasHagaFalta) return undefined;
    void activateKeepAwakeAsync().catch(() => undefined);
    return () => {
      try {
        deactivateKeepAwake();
      } catch {
        /* No se pudo soltar: el sistema lo suelta al cerrar la app de todas formas. */
      }
    };
  }, [mientrasHagaFalta]);
}
