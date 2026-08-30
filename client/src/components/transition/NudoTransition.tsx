/**
 * NudoTransition — entrar en una partida de El Nudo de Valdehierro.
 *
 * QUÉ CUENTA, en 3,2 s: está nevando sobre un andén a oscuras → por la
 * izquierda llega el faro de una máquina → PASA UN TREN ENTERO de izquierda a
 * derecha, con las ventanas encendidas, y mientras pasa no se ve nada más → y
 * cuando la cola sale por la derecha, lo que había detrás todo el rato es el
 * rótulo de la estación.
 *
 * POR QUÉ EXISTE, TENIENDO YA TRES. Porque las tres cuentan otra cosa. Dos
 * puertas de caoba que se abren hacia dentro son una casa que te recibe; dos
 * losas que alguien empuja son un sitio donde no había que entrar; un farol que
 * se apaga es que a partir de ahí se anda a oscuras. Aquí no se abre nada y no
 * se apaga nada: aquí PASA ALGO POR DELANTE, sin pedir permiso y sin que se le
 * pueda parar, que es exactamente lo que hacen los seis convoyes de esta noche.
 * Reutilizar cualquiera de las tres y pintarla de ámbar habría dado justo lo
 * que hay que evitar: el mismo juego de otro color.
 *
 * EL TREN VA A VELOCIDAD CONSTANTE, y es la única de las cuatro cortinillas sin
 * una sola curva de suavizado en su movimiento principal. No es un descuido: un
 * `easeOut` lo habría hecho frenar al salir, y un tren que frena al pasar por
 * una estación es un tren que para. Este no para —no puede: viene rodando y
 * nadie le ha podido avisar—, así que su transición es `linear` y se va del
 * encuadre a la misma velocidad a la que entró.
 *
 * EL RÓTULO NO ENTRA: YA ESTABA. Se enciende debajo del tren, mientras el tren
 * lo tapa entero, y para cuando la cola destapa el centro de la pantalla ya
 * lleva rato a plena opacidad. Es la diferencia entre «aparece un cartel» y
 * «detrás había una estación», y es todo el efecto. Los números que lo
 * sostienen están en `TREN` y `ROTULO`, con la cuenta hecha ahí abajo.
 *
 * LA NIEVE VA DELANTE DEL TREN, no detrás. Cuesta una capa más y es lo que
 * mete la cámara en la intemperie: si la nieve estuviera al fondo, esto sería
 * un tren pasando por una foto; con la nieve por encima, quien mira está de pie
 * en el andén y se está mojando.
 */
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import '../../styles/transicion-nudo.css';

interface NudoTransitionProps {
  active: boolean;
  onComplete: () => void;
}

/**
 * LOS TIEMPOS, EN UN SOLO SITIO Y EN SEGUNDOS.
 *
 * Y una cuenta que hay que rehacer entera si se toca cualquiera de estos
 * números, porque de ella depende que el efecto funcione:
 *
 * El tren mide 180 vw y recorre 280 vw (de `-180vw` a `100vw`), o sea que en
 * cada segundo avanza 280/`TREN.dura` vw. Con eso salen los tres instantes que
 * importan, contados desde que arranca (`TREN.en`):
 *
 *   · Tapa la pantalla entera cuando ha andado 100 vw → 0,63 s.
 *   · La cola destapa el CENTRO cuando ha andado 230 vw → 1,44 s.
 *   · Sale del todo cuando ha andado los 280 vw → 1,75 s.
 *
 * De ahí las dos reglas: `ROTULO.en` tiene que caer DESPUÉS del primero (si no,
 * se ve encenderse el cartel en pantalla vacía y se acabó la sorpresa), y
 * `ROTULO.en + ROTULO.dura` tiene que caer ANTES del segundo (si no, la cola
 * destapa un cartel a medio encender, que es peor que las dos cosas). Hoy son
 * 1,15 y 1,85 contra 1,08 y 1,89: entra por los pelos por los dos lados, y esa
 * estrechez es la que hace que se lea como una sola cosa.
 */
const TREN = { en: 0.45, dura: 1.75 } as const;
const ROTULO = { en: 1.15, dura: 0.7 } as const;
/** El pie, ya con el tren fuera del encuadre. Va abajo, donde nada lo tapaba. */
const LEMA = { en: 2.05, dura: 0.7 } as const;

/**
 * Duración total de la secuencia en milisegundos.
 *
 * El lema acaba de entrar en 2,75 s y el tren se fue en 2,2, así que la estación
 * se queda sola casi medio segundo antes de que el velo empiece a irse. Ese
 * reposo es lo que de verdad se disfruta, y es la misma cuenta que hace la
 * cortinilla de las Sombras (3400) por la misma razón. Se queda en 3200 porque
 * aquí no hay relevo entre dos escenas: hay una que tapa y otra que queda.
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
          {/* El andén nevado y la bombilla que lo alumbra desde arriba. */}
          <div className="tn-anden" />

          {/*
            El rótulo esmaltado. Va DEBAJO del tren en el orden de capas (z 2
            contra z 3) y se enciende mientras el tren lo tapa: ver la cuenta de
            `ROTULO` ahí arriba. Texto de hierro sobre ámbar, que es como se
            rotulaba una estación y de paso lo único legible de la pantalla.
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
            El tren. Una sola pieza que se traslada: el faro le sale por delante
            y las ventanas y el derrame de luz van dentro, así que todo el
            convoy es UN `transform` y ni un solo recálculo de disposición.
          */}
          <motion.div
            className="tn-tren"
            initial={{ x: '-180vw' }}
            animate={{ x: '100vw' }}
            transition={{ duration: TREN.dura, delay: TREN.en, ease: 'linear' }}
          >
            {/* El faro de la máquina, que asoma antes que el hierro. */}
            <div className="tn-faro" />
            {/* La fila de ventanas: de un tren de noche no se ve otra cosa. */}
            <div className="tn-ventanas" />
            {/* La luz que las ventanas echan sobre la nieve del andén. */}
            <div className="tn-derrame" />
            {/* Los testeros: el corte oscuro entre coche y coche, cada 800 px. */}
            <div className="tn-testeros" />
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
