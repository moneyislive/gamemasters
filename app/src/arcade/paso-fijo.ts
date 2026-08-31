/**
 * LA ARITMÉTICA DEL PASO FIJO, SOLA Y SIN NADA ALREDEDOR.
 *
 * ═══ POR QUÉ ESTAS DOS FUNCIONES VIVEN FUERA DE `bucle.ts` ═══
 *
 * Porque son lo único de aquel fichero que DECIDE algo —cuántos pasos tiene una
 * partida, o sea el número que después se contrasta con el reloj de pared— y
 * estaban encerradas dentro de un hook con `useFrameCallback`, `useSharedValue` y
 * `runOnJS` delante. Para llamarlas hacía falta React, Reanimated y un aparato.
 *
 * El resultado fue el previsible y lo dijo un revisor: NINGÚN COMPROBADOR DE LA
 * BATERÍA TOCABA EL ACUMULADOR. El paso fijo —la pieza que la §9 del diseño pone
 * por delante de todo lo demás de la fase 3, «sin eso el juego corre al doble de
 * velocidad en un móvil de 120 Hz»— estaba afirmado solo en prosa, y para saber
 * si la cuenta salía había que reimplementarla fuera del repositorio.
 *
 * Aquí dentro no hay ni una importación. Entra un número de milisegundos y sale
 * un entero de pasos, así que `verify:bucle` lo llama desde Node con `tsx` y ve
 * los casos que importan —30 Hz, 60 Hz, 120 Hz, un fotograma de medio segundo, un
 * hilo de JavaScript atascado— en un milisegundo y sin emulador.
 *
 * ═══ POR QUÉ SON DOS Y NO UNA, QUE ES LA PARTE QUE COSTÓ ═══
 *
 * Porque el bucle cruza una frontera de hilos y hay DOS sitios donde se puede
 * acumular trabajo, no uno:
 *
 *   · En el HILO DE INTERFAZ, donde se miden los fotogramas. Si no llegan
 *     fotogramas —la app al fondo— los milisegundos se amontonan ahí, y de eso
 *     protege `pasosDelFotograma` recortando el acumulado.
 *   · Y en la COLA DEL HILO DE JAVASCRIPT, que es el caso que de verdad ocurre en
 *     un móvil barato. Si el hilo de interfaz sigue recibiendo fotogramas y el de
 *     JavaScript se atasca —el recolector de basura, un sondeo largo, la
 *     navegación, el `JSON.stringify` de la subida de la partida—, cada fotograma
 *     calcula UN paso y encola un aviso más. El acumulado del worklet no crece,
 *     así que el recorte de arriba no recorta nada, y al respirar el hilo de
 *     JavaScript se come sesenta avisos seguidos: sesenta pasos en un solo
 *     fotograma visible, la nave desplazada setecientas veinte milésimas de un
 *     campo de mil. Un salto que nadie ve y que cambia el resultado, que es
 *     exactamente lo que este bucle existe para no tener.
 *
 * De eso protege `pasosQueCaben`, que es el mismo tope aplicado del otro lado de
 * la frontera: los pasos que se ejecutan no pueden pasarse del tiempo REAL que ha
 * pasado en este hilo, más la misma holgura. Lo que sobra se pierde, que es la
 * política que la cabecera de `bucle.ts` ya declaraba —«LA PARTIDA PIERDE ESE
 * TIEMPO»— y que hasta ahora solo se cumplía en la mitad de los casos.
 */

/** Lo que sale de repartir un fotograma en pasos. */
export interface PasosDeUnFotograma {
  /** Cuántos pasos tocan ahora. Entero, y puede ser cero. */
  pasos: number;
  /** Lo que sobra y se guarda para el fotograma siguiente. */
  sobrante: number;
}

/**
 * CUÁNTOS PASOS CABEN EN LO QUE HA DURADO ESTE FOTOGRAMA.
 *
 * ═══ LLEVA LA DIRECTIVA `'worklet'` Y NO ES DECORACIÓN ═══
 *
 * La llama el cuerpo de `useFrameCallback`, que corre EN EL HILO DE INTERFAZ.
 * Una función normal invocada desde ahí no existe en ese hilo: Reanimated no la
 * habría copiado, y el fallo no es un error de compilación sino un reventón en
 * ejecución al abrir la pantalla. Con la directiva, el complemento de Babel la
 * prepara para los dos hilos — y sigue siendo una función corriente vista desde
 * Node, que es lo que permite comprobarla.
 *
 * El recorte del acumulado es el que evita la «espiral de la muerte» clásica y
 * está razonado entero en la cabecera de `bucle.ts`: volver del segundo plano
 * después de un minuto NO mete tres mil seiscientos pasos de golpe. La partida
 * pierde ese tiempo, y eso es lo correcto en un arcade de un jugador — lo
 * contrario sería llegar muerto con la pantalla apagada.
 */
export function pasosDelFotograma(
  sobranteMs: number,
  msDelFotograma: number,
  msPorPaso: number,
  topeMs: number,
): PasosDeUnFotograma {
  'worklet';
  /*
   * Con `tickHz: 0` no hay reloj y no hay nada que repartir. Se comprueba con
   * `!(x > 0)` y no con `x <= 0` para que un `NaN` —que en las comparaciones
   * siempre da falso— caiga por aquí en vez de colarse hasta el acumulador y
   * dejar el bucle muerto para siempre sin un solo error por ninguna parte.
   */
  if (!(msPorPaso > 0)) return { pasos: 0, sobrante: 0 };
  if (!(msDelFotograma > 0)) return { pasos: 0, sobrante: sobranteMs > 0 ? sobranteMs : 0 };

  let acumulado = sobranteMs + msDelFotograma;
  if (acumulado > topeMs) acumulado = topeMs;

  const pasos = Math.floor(acumulado / msPorPaso);
  return { pasos, sobrante: acumulado - pasos * msPorPaso };
}

/** Lo que sale de decidir cuántos de los pasos pedidos se ejecutan de verdad. */
export interface PasosDeUnaTanda {
  /** Cuántos se ejecutan. Nunca más de los que se piden. */
  pasos: number;
  /** El crédito de milisegundos que queda para la tanda siguiente. */
  credito: number;
}

/**
 * CUÁNTOS DE LOS PASOS PEDIDOS CABEN EN EL TIEMPO QUE HA PASADO DE VERDAD.
 *
 * ═══ EL TOPE, PERO EN EL HILO DONDE SE EJECUTAN LOS PASOS ═══
 *
 * Cada tanda que llega SUMA al crédito el tiempo de reloj transcurrido desde la
 * anterior, y el crédito se recorta al mismo tope que el acumulado del worklet.
 * Después se gastan tantos pasos como quepan, y nunca más de los que se piden.
 *
 * Con eso, los tres casos salen como tienen que salir:
 *
 *   · A ritmo normal —una tanda por fotograma, un paso por tanda— entra tanto
 *     crédito como se gasta y no se pierde nada. La independencia del refresco no
 *     se toca: a 30 Hz llegan tandas de dos pasos cada 33 ms y a 120 Hz tandas de
 *     un paso cada dos fotogramas, y las dos cuentas cuadran.
 *   · Volviendo del segundo plano, el worklet ya acotó la tanda a lo que cabe en
 *     el tope, y aquí el crédito acumulado es como mínimo ése: se ejecuta entera.
 *   · Y con el hilo de JavaScript atascado un segundo, las sesenta tandas
 *     encoladas llegan juntas: la primera trae todo el crédito del atasco, ya
 *     recortado al tope, y las cincuenta y nueve siguientes no traen tiempo
 *     ninguno. Se ejecutan los quince pasos que caben en el tope y se tiran las
 *     otras cuarenta y cinco. La partida pierde ese tiempo, en vez de dar un
 *     salto de setecientas veinte milésimas.
 */
export function pasosQueCaben(
  creditoMs: number,
  msDesdeLaUltimaTanda: number,
  pide: number,
  msPorPaso: number,
  topeMs: number,
): PasosDeUnaTanda {
  if (!(msPorPaso > 0) || !(pide > 0)) return { pasos: 0, credito: creditoMs };

  let credito = creditoMs + (msDesdeLaUltimaTanda > 0 ? msDesdeLaUltimaTanda : 0);
  if (credito > topeMs) credito = topeMs;

  let pasos = Math.floor(credito / msPorPaso);
  if (pasos > pide) pasos = pide;
  if (pasos <= 0) return { pasos: 0, credito };
  return { pasos, credito: credito - pasos * msPorPaso };
}
