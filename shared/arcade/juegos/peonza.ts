/**
 * «LA PEONZA»: el arcade de demostración del mueble `escena`.
 *
 * Se empuja con el dedo y gira. El roce la va parando sola, y quien quiera que
 * siga girando tiene que volver a empujar. No hay más.
 *
 * ═══ QUÉ ES ESTE FICHERO Y QUÉ NO ES ═══
 *
 * NO es un juego-prueba. Los cinco juegos-prueba del diseño —La Frente, La Ronda,
 * El Arcade, Riberas y La Larga— existen para EMPUJAR el motor por un eje distinto
 * cada uno, y este no empuja nada: cabe entero en el contrato desde la fase 0.
 *
 * Lo que es: LA PUERTA DEL 3D, con lo mínimo detrás para poder abrirla y ver que
 * se abre. El §7 dice que `escena` va «única y exclusivamente a través de
 * `app/src/tres/Lienzo.tsx` y `Lienzo.native.tsx`» y que «ningún arcade importa
 * `three` ni `@react-three/fiber` directamente». Una puerta sin nada detrás no se
 * puede comprobar que esté abierta: la ruta del mueble seguiría enseñando la
 * pantalla de «esto todavía no existe», y el día que alguien escriba un arcade en
 * tres dimensiones se encontraría con que la puerta nunca se probó.
 *
 * Por eso es deliberadamente pobre. Un juego de demostración rico es peor que
 * ninguno: se convierte en el modelo de cómo se escribe un arcade de escena, y
 * entonces el mueble sale con su forma — que es el error que este motor entero
 * existe para no repetir.
 *
 * ═══ POR QUÉ EL ÁNGULO ES UN ENTERO Y NO UN NÚMERO DE RADIANES ═══
 *
 * Porque `verify:pureza` prohíbe las trascendentales de `Math` —`sin`, `cos`,
 * `atan2`…— en todo `shared/arcade/`, y con razón: la especificación las deja
 * *implementation-approximated* y Hermes y V8 redondean distinto, así que la misma
 * partida daría dos resultados en dos móviles.
 *
 * Aquí el ángulo son MILÉSIMAS DE VUELTA, de 0 a 999, y todo lo que hace el
 * reductor es sumar y restar enteros. La trigonometría —pasar eso a una rotación
 * de verdad— la hace LA PANTALLA, que no está en el camino del reductor y donde
 * un redondeo distinto no desincroniza nada porque no hay nada que sincronizar.
 *
 * Es la misma frontera que el resto del motor: `shared/` son las reglas, y lo que
 * se ve es consecuencia y no dato.
 *
 * ═══ Y POR QUÉ NO PUBLICA NINGUNA CIFRA ═══
 *
 * `marcador: { tipo: 'ninguno' }`. Cuenta sus empujones dentro de su estado y no
 * se los enseña a nadie que tenga que creérselos, así que no hay nada que
 * verificar y no hace falta ninguna repetición. La palabra está escrita a
 * propósito, que es lo que el contrato exige: renunciar cuesta exactamente lo
 * mismo de teclear que no renunciar, y se ve en el diff.
 */
import type { Movimiento } from '../movimiento';
import { esTic } from '../reloj';
import type { ArcadeId, ManifiestoDeArcade } from '../tipos';

/** El identificador de este arcade. */
export const PEONZA: ArcadeId = 'peonza';

/** El movimiento único: un empujón. */
export const EMPUJAR = 'empujar';

/**
 * A qué ritmo entra el tiempo. Treinta y no sesenta, y es una decisión.
 *
 * Una peonza girando no gana nada a sesenta pasos por segundo, y la escena 3D
 * cuesta bastante más por fotograma que un sprite. Treinta es de sobra para que el
 * giro se vea continuo y deja la mitad del presupuesto de cada fotograma libre en
 * un móvil de gama baja, que es exactamente el suelo de dispositivo que el §7 pide
 * fijar antes de dibujar nada.
 */
export const TICK_HZ = 30;

/** Una vuelta entera, en las unidades del ángulo. */
export const VUELTA = 1000;

/** Lo que suma un empujón al giro, en milésimas de vuelta por tic. */
export const EMPUJON = 24;

/** El tope, para que no gire tan rápido que se vea al revés. */
export const GIRO_MAXIMO = 96;

/** Lo que le quita el roce en cada tic. Con esto para sola en unos segundos. */
export const ROCE = 1;

/** Cómo está la peonza. Todo enteros: ver la cabecera. */
export interface EstadoDeLaPeonza {
  /** Dónde mira, en milésimas de vuelta, de 0 a 999. */
  angulo: number;
  /** Cuánto avanza el ángulo en cada tic. Cero es «parada». */
  giro: number;
  /** Cuántas veces se ha empujado. Es suyo y no se publica en ninguna parte. */
  empujones: number;
  /** Cuántos tics lleva GIRANDO —los de la peonza parada no cuentan—. Para que la pantalla pueda decir algo si quiere. */
  tics: number;
}

/** Una peonza quieta. */
export function partidaNueva(): EstadoDeLaPeonza {
  return { angulo: 0, giro: 0, empujones: 0, tics: 0 };
}

/**
 * LAS REGLAS. Sumas y restas, y nada más.
 *
 * ═══ LA TERCERA REGLA, QUE AQUÍ SE VE MUY BIEN ═══
 *
 * Cuando la peonza está parada, un tic devuelve EL MISMO OBJETO. No es una
 * optimización: quien pinta compara por identidad para saber si hace falta
 * repintar, y devolver un objeto nuevo idéntico treinta veces por segundo con la
 * peonza quieta sería repintar una escena 3D treinta veces por segundo para no
 * enseñar nada distinto — en un móvil, eso es la batería.
 */
export function avanzarLaPeonza(
  estado: EstadoDeLaPeonza | undefined,
  movimiento: Movimiento,
): EstadoDeLaPeonza {
  const actual = estado ?? partidaNueva();

  if (esTic(movimiento)) {
    /* Parada y sin empujar: no pasa nada, y se dice devolviendo lo mismo. */
    if (actual.giro === 0) return actual;
    const giro = actual.giro - ROCE > 0 ? actual.giro - ROCE : 0;
    return {
      angulo: (actual.angulo + giro) % VUELTA,
      giro,
      empujones: actual.empujones,
      tics: actual.tics + 1,
    };
  }

  if (movimiento.tipo === EMPUJAR) {
    const giro = actual.giro + EMPUJON > GIRO_MAXIMO ? GIRO_MAXIMO : actual.giro + EMPUJON;
    return { ...actual, giro, empujones: actual.empujones + 1 };
  }

  /*
   * Un movimiento que este juego no conoce se ignora devolviendo el estado. La
   * plataforma puede meter movimientos suyos que este juego no reconozca, y un
   * juego no se puede caer por no conocerlos.
   */
  return actual;
}

/** ¿Está girando? Lo pregunta la pantalla para saber si le hace falta el reloj. */
export function estaGirando(estado: EstadoDeLaPeonza | undefined): boolean {
  return (estado ?? partidaNueva()).giro > 0;
}

/**
 * EL MANIFIESTO.
 *
 * `sede: 'dispositivo'` porque no hay nada que sincronizar ni nadie a quien
 * engañar: el único que podría hacer trampa es quien está mirando una peonza girar.
 * Y con eso, ni mesa, ni `rev`, ni canal, ni cuenta.
 */
export const MANIFIESTO_PEONZA: ManifiestoDeArcade = {
  id: PEONZA,
  nombre: 'La Peonza',
  gancho: 'Empújala y mírala girar hasta que el roce la pare.',
  icono: 'mando',
  jugadores: { minimo: 1, maximo: 1 },
  sede: 'dispositivo',
  tickHz: TICK_HZ,
  mueble: 'escena',
  secretos: false,
  marcador: { tipo: 'ninguno' },
  /*
   * Una peonza es un juguete de dominio público desde hace unos cuantos siglos, y
   * lo que hay aquí escrito —el roce, el tope de giro, el empujón— es de esta
   * casa. `creacion-propia` es la afirmación exacta: el código, el nombre y todos
   * los textos se han escrito aquí.
   */
  procedencia: { tipo: 'creacion-propia' },
};
