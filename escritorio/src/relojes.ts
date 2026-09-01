/**
 * LOS NÚMEROS DEL SONDEO, sin nada de React, para poder llamarlos desde Node.
 *
 * ═══ ESTO ESTÁ DUPLICADO A SABIENDAS, Y HAY QUE DECIR DE DÓNDE VIENE ═══
 *
 * La misma cuenta vive en `app/src/arcade/relojes.ts`. No se importa de allí, y
 * no porque no compilara —ese fichero no tiene un solo `import`, es aritmética
 * pura— sino porque un cliente de PC que importa de la carpeta de la app de
 * móvil ata las dos cosas al revés de como están pensadas: el día que alguien
 * toque el bolsillo del teléfono, el escritorio se entera.
 *
 * El sitio correcto de estas tres constantes es `shared/mecanicas/`, que es
 * justo la capa que este repositorio inventó para «código que sirve a varios
 * juegos y que no sabe quién lo usa». Mover el fichero de la app allí es un
 * cambio en `app/`, y `app/` no se toca en esta tarea. Así que se copia el
 * RAZONAMIENTO, se dice que está copiado, y se queda apuntado como la deuda que
 * es: dos copias de una fórmula divergen, siempre, y la que diverge es la que
 * nadie estaba mirando.
 *
 * Lo que sí se puede hacer hoy, y se hace: ponerle red propia a la copia. La
 * cuenta de abajo la llama `scripts/verificar-escritorio.tsx` con números, o sea
 * que si alguien la retoca aquí sin mirar la ventana de presencia, se pone rojo.
 */

/**
 * ═══ POR QUÉ SE PAUSA EL SONDEO, Y QUÉ CUESTA ═══
 *
 * El sondeo largo aparca la petición veinticinco segundos en el servidor y, si
 * no ha pasado nada, contesta `204`. Eso es lo que hace que una mesa de diez
 * minutos se sienta viva: cuando otro mueve, la petición aparcada vuelve en el
 * acto.
 *
 * En una mesa de plazo largo —«La Larga» juega con veinticuatro horas por
 * turno— eso mismo es una petición cada veinticinco segundos durante días para
 * enterarse de un movimiento que llegará mañana. Así que DESPUÉS DE UN `204`, y
 * solo después de un `204`, se espera un poco antes de volver a aparcarse.
 *
 * Lo que cuesta, dicho antes que lo que ahorra: durante la pausa no hay ninguna
 * petición aparcada, así que un movimiento ajeno tarda hasta la pausa entera en
 * verse. Es una ventana de ceguera real, y por eso está acotada por arriba con
 * un número pequeño en vez de crecer con el plazo.
 */
const MARGEN_SIN_PAUSA_MS = 2 * 60_000;

/** Lo que el servidor aparca una petición antes de contestar `204`. */
const APARCADA_MS = 25_000;

/**
 * ═══ LA VENTANA DE PRESENCIA, QUE ES LA QUE MANDA EN ESTE NÚMERO ═══
 *
 * El servidor pinta a alguien «presente» si se le ha visto hace menos de sesenta
 * segundos, y solo se le ve cuando su cliente pide. O sea que el CICLO ENTERO
 * del sondeo —lo que dura aparcada la petición MÁS la pausa— tiene que caber
 * dentro de esa ventana, o quien está mirando la pantalla sale «(fuera)» en la
 * lista de los demás.
 *
 * En la app eso ya se pagó una vez con un tope de dos minutos: el ciclo pasaba a
 * unos 141 s y `presente` caía a `false` durante un 42 % del tiempo con la
 * pestaña delante. Y no es cosmético: `GET /arcade/mesas/:codigo/turno` sirve ese
 * mismo `presente` para decidir a quién se avisa de que le toca.
 *
 * De ahí sale el tope: `60 − 25 − 5` de holgura para la red. El día que alguien
 * quiera pausar más, la palanca no es este número: es subir la ventana de
 * presencia en el servidor, y entonces esta cuenta se hace sola.
 */
const VENTANA_DE_PRESENCIA_MS = 60_000;

/** Holgura para que una respuesta lenta no cuente como ausencia. */
const HOLGURA_MS = 5_000;

export const TOPE_DE_PAUSA_MS = VENTANA_DE_PRESENCIA_MS - APARCADA_MS - HOLGURA_MS;

/** Lo que el ciclo completo tarda como mucho. Tiene que caber en la ventana. */
export const CICLO_MAXIMO_MS = APARCADA_MS + TOPE_DE_PAUSA_MS;

/** La ventana de presencia del servidor, publicada para que la red pueda mirarla. */
export const VENTANA_DE_PRESENCIA = VENTANA_DE_PRESENCIA_MS;

/** Cuánto se reparte lo que falta: la pausa es una fracción del plazo restante. */
const FRACCION_DEL_PLAZO = 40;

/**
 * Cuánto esperar antes de volver a aparcarse, mirando lo que falta para el plazo.
 *
 * `leTocaAAlguien` sale de `turnoDeLaVista(vista)`: es `false` mientras la mesa
 * se está reuniendo, mientras nadie ha repartido, y en un juego que no declara
 * turno. Ahí NO se pausa, y es el caso que más se nota: montar la mesa es el
 * único momento en que dos personas están mirando la pantalla a la vez
 * esperándose, y es justo cuando el plazo está más lejos, o sea cuando la pausa
 * sería máxima.
 */
export function pausaAntesDeVolverAPreguntar(
  venceEn: number | null,
  terminada: boolean,
  leTocaAAlguien: boolean,
  ahora: number,
): number {
  /*
   * Sin plazo no hay ningún reloj del que ahorrarse las vueltas, y en una mesa
   * terminada no va a pasar nada nunca más: pausar ahí sería quitar reactividad
   * a cambio de nada.
   */
  if (venceEn === null || terminada) return 0;
  if (!leTocaAAlguien) return 0;
  const quedan = venceEn - ahora;
  if (quedan <= MARGEN_SIN_PAUSA_MS) return 0;
  return Math.min(TOPE_DE_PAUSA_MS, (quedan - MARGEN_SIN_PAUSA_MS) / FRACCION_DEL_PLAZO);
}

/**
 * CUÁNTO FALTA, dicho como se dice en voz alta, y redondeando HACIA ARRIBA.
 *
 * Hacia arriba es el lado correcto del error en una cuenta atrás: nunca dice que
 * quede menos de lo que queda, así que nadie deja de mover por creer que ya no
 * llegaba. Y evita el rótulo que sube: truncando, a 48 h se lee «2 días» y un
 * minuto después «47 h».
 */
export function cuantoQueda(ms: number): string {
  const SEGUNDO = 1000;
  const MINUTO = 60_000;
  const HORA = 60 * MINUTO;
  const DIA = 24 * HORA;
  if (ms <= 0) return 'se acabó el tiempo';
  if (ms < MINUTO) return `quedan ${String(Math.ceil(ms / SEGUNDO))} s`;
  if (ms < HORA) return `quedan ${String(Math.ceil(ms / MINUTO))} min`;
  if (ms < 48 * HORA) return `quedan ${String(Math.ceil(ms / HORA))} h`;
  return `quedan ${String(Math.ceil(ms / DIA))} días`;
}
