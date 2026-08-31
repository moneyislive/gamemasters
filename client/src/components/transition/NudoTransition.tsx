/**
 * NudoTransition — entrar en una partida de El Nudo de Valdehierro.
 *
 * QUÉ CUENTA, en 3,2 s: sobre una noche vacía se van trazando CINCO LÍNEAS
 * desde el borde izquierdo → se curvan y se juntan todas en un mismo punto →
 * ese punto prende → y lo que hay en el nudo es el rótulo de la estación, con
 * la vía saliendo por la derecha hacia lo que venga después.
 *
 * ═══ POR QUÉ SE TIRÓ EL TREN QUE HABÍA ═══
 *
 * La cortinilla anterior pasaba un convoy entero por delante de la cámara. La
 * idea era buena y el resultado no: a tamaño de pantalla, una fila de ventanas
 * iluminadas cruzando el encuadre no se lee como un tren, se lee como una
 * empalizada de bloques amarillos. Y encima duraba lo que dura un tren, o sea
 * que la empalizada era casi toda la cortinilla.
 *
 * Lo que se pierde al quitarlo es el «algo pasa por delante sin pedir permiso».
 * Lo que se gana es que la cortinilla diga POR FIN LO QUE ES EL JUEGO: esto no
 * va de un tren, va de un NUDO —cinco líneas que se cruzan en el mismo sitio a
 * la misma hora— y de rehacer a mano el orden en que pasan. Un haz de líneas
 * anudándose es literalmente el tablero de la partida.
 *
 * ═══ POR QUÉ NO SE PARECE A LAS OTRAS TRES ═══
 *
 * Dos puertas de caoba que se abren son una casa que te recibe; dos losas que
 * alguien empuja, un sitio donde no había que entrar; un farol que se apaga, que
 * a partir de ahí se anda a oscuras. Las tres son ATMÓSFERA: masas, luz, materia.
 *
 * Esta es la única que es GEOMETRÍA, y esa es su diferencia. No se abre nada, no
 * se apaga nada y no pasa nada por delante: se DIBUJA algo, con precisión de
 * plano, delante de quien mira. Es el mismo registro que la pantalla «Planta»
 * del juego y el mismo que su cuadro de marchas, así que la cortinilla ya está
 * enseñando cómo se piensa esta partida antes de que empiece.
 *
 * ═══ SON CINCO Y NO SEIS, A PROPÓSITO ═══
 *
 * Los convoyes de la noche son seis; las líneas que se anudan aquí son CINCO,
 * porque cinco es lo que dice el pie del rótulo —«cruce de cinco líneas»— y ese
 * rótulo lleva ahí desde antes que esta animación. Que el dibujo contradiga al
 * cartel que tiene debajo es la clase de descuido que no se ve y se nota.
 *
 * ═══ EL ORDEN DE LOS TIEMPOS ═══
 *
 * El nudo tiene que estar CERRADO antes de que el rótulo empiece a encenderse:
 * si el cartel aparece con líneas todavía andando, se leen como dos animaciones
 * a la vez en vez de como una consecuencia de la otra. Los números están abajo,
 * con la cuenta hecha.
 */
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import '../../styles/transicion-nudo.css';

interface NudoTransitionProps {
  active: boolean;
  onComplete: () => void;
}

/**
 * LAS CINCO LÍNEAS, EN COORDENADAS DEL PLANO (1000 × 560).
 *
 * Todas nacen fuera del encuadre por la izquierda —en `-40`, no en `0`— para
 * que ninguna empiece con un cabo suelto a la vista: una línea que arranca
 * dentro de la pantalla parece cortada, no parece que venga de lejos.
 *
 * La del centro entra recta; las otras cuatro corren rectas un trecho y luego
 * se curvan hacia el nudo con una Bézier. El tramo recto es lo que hace que se
 * lean como VÍAS y no como cables: una vía de tren no empieza a curvarse en el
 * horizonte, va derecha hasta que una aguja la desvía.
 */
const NUDO = { x: 500, y: 280 } as const;
const ALTURAS = [80, 180, 280, 380, 480] as const;

function trazadoDesde(y: number): string {
  if (y === NUDO.y) return `M -40 ${y} H ${NUDO.x}`;
  return `M -40 ${y} H 250 C 360 ${y} 400 ${NUDO.y} ${NUDO.x} ${NUDO.y}`;
}

/**
 * LOS TIEMPOS, EN UN SOLO SITIO Y EN SEGUNDOS, con la cuenta hecha.
 *
 * Las líneas arrancan escalonadas de fuera hacia dentro, así que la última en
 * salir es la que cierra el nudo: empieza en `LINEA.en + 4 × LINEA.paso` y
 * termina `LINEA.dura` después. Hoy: 0,18 + 4 × 0,085 + 0,75 = 1,27 s.
 *
 * De ahí las dos reglas que sostienen el efecto:
 *
 *   · `PRENDE.en` va JUSTO en ese 1,27: el fogonazo es lo que confirma que el
 *     nudo se ha cerrado, y adelantarlo lo convierte en un destello suelto.
 *   · `ROTULO.en` va DESPUÉS del fogonazo, nunca a la vez. Si se solapan, el
 *     ojo tiene dos cosas encendiéndose y no sabe cuál es la importante.
 *
 * La vía de salida se traza a la vez que el rótulo aparece, y eso sí se quiere
 * solapado: son la misma idea —la línea sigue, la estación es solo un punto de
 * ella— y separarlas las contaría como dos sucesos.
 */
const LINEA = { en: 0.18, dura: 0.75, paso: 0.085 } as const;
const PRENDE = { en: 1.27, dura: 0.55 } as const;
const SALIDA = { en: 1.5, dura: 0.6 } as const;
const ROTULO = { en: 1.62, dura: 0.7 } as const;
/** El pie, ya con el plano entero dibujado y quieto. */
const LEMA = { en: 2.15, dura: 0.7 } as const;

/**
 * Duración total de la secuencia en milisegundos.
 *
 * El lema acaba de entrar en 2,85 s, así que el plano se queda solo y quieto
 * un tercio de segundo antes de que el velo se vaya. Ese reposo es lo que de
 * verdad se disfruta, y es la misma cuenta que hacen las otras tres.
 */
const TOTAL_MS = 3200;

export default function NudoTransition({ active, onComplete }: NudoTransitionProps): JSX.Element {
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(onComplete, TOTAL_MS);
    return () => window.clearTimeout(t);
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="tn-velo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          aria-hidden="true"
        >
          {/*
            EL PLANO. Va en un SVG y no en divs porque lo que se anima es el
            TRAZO —`pathLength`, que framer sabe animar solo— y eso no existe
            fuera de un `path`. Dibujarlo con bordes de caja habría obligado a
            fingir las curvas con rotaciones, que es como se acaba con seis
            elementos donde cabía una línea.

            `slice` y no `meet`: el plano tiene que llegar a los cuatro bordes
            en cualquier proporción de pantalla. Con `meet` aparecerían franjas
            vacías arriba y abajo en una ventana ancha, y el haz dejaría de
            venir «de fuera» para venir de un rectángulo dibujado en medio.
          */}
          <svg
            className="tn-plano"
            viewBox="0 0 1000 560"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            {ALTURAS.map((y, i) => (
              /*
               * Dos trazos por línea, el mismo camino: uno ancho y casi
               * transparente que hace de resplandor, y encima el hilo nítido.
               * Es más barato y más limpio que un `filter: blur`, que en una
               * pantalla grande obliga al navegador a rasterizar el SVG entero.
               */
              <g key={y}>
                <motion.path
                  d={trazadoDesde(y)}
                  className="tn-linea tn-linea--halo"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: LINEA.dura,
                    delay: LINEA.en + i * LINEA.paso,
                    ease: 'easeInOut',
                  }}
                />
                <motion.path
                  d={trazadoDesde(y)}
                  className="tn-linea"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: LINEA.dura,
                    delay: LINEA.en + i * LINEA.paso,
                    ease: 'easeInOut',
                  }}
                />
              </g>
            ))}

            {/* La vía que sale del nudo hacia la derecha: la noche continúa. */}
            <motion.path
              d={`M ${NUDO.x} ${NUDO.y} H 1040`}
              className="tn-linea tn-linea--salida"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: SALIDA.dura, delay: SALIDA.en, ease: 'easeOut' }}
            />

            {/* El fogonazo del nudo al cerrarse. */}
            <motion.circle
              cx={NUDO.x}
              cy={NUDO.y}
              r={9}
              className="tn-chispa"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 0], scale: [0.4, 3.4, 4.6] }}
              transition={{ duration: PRENDE.dura, delay: PRENDE.en, ease: 'easeOut' }}
              style={{ transformOrigin: `${NUDO.x}px ${NUDO.y}px` }}
            />
          </svg>

          {/*
            El rótulo esmaltado, en el nudo. Texto de hierro sobre ámbar, que es
            como se rotulaba una estación: lo que se lee de noche desde la
            ventanilla de un tren en marcha es oscuro sobre amarillo.
          */}
          <motion.div
            className="tn-rotulo"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: ROTULO.dura, delay: ROTULO.en, ease: 'easeOut' }}
          >
            <span className="tn-rotulo-nombre">VALDEHIERRO</span>
            <span className="tn-rotulo-linea" />
            <span className="tn-rotulo-pie">CRUCE DE CINCO LÍNEAS · ALT. 1.148 M</span>
          </motion.div>

          {/*
            Dos capas de nieve por delante de todo, a velocidades distintas: sin
            la diferencia de ritmo las dos se leen como una sola cortina plana.
            No se repiten en bucle porque no les da tiempo: en 3,2 s no llegan a
            completar ni un ciclo, y así no hay salto al reiniciarse.
          */}
          <motion.div
            className="tn-nieve tn-nieve--cerca"
            initial={{ x: '0%', y: '-8%' }}
            animate={{ x: '-5%', y: '12%' }}
            transition={{ duration: 3.2, ease: 'linear' }}
          />
          <motion.div
            className="tn-nieve tn-nieve--lejos"
            initial={{ x: '0%', y: '-5%' }}
            animate={{ x: '-2%', y: '6%' }}
            transition={{ duration: 3.2, ease: 'linear' }}
          />

          {/* El pie, abajo del todo: la fecha y la hora a la que empieza esto. */}
          <motion.p
            className="tn-lema"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: LEMA.dura, delay: LEMA.en }}
          >
            Turno de noche · 14 de enero de 1927
          </motion.p>

          <div className="tn-vineta" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
