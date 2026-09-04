/**
 * LOS NÚMEROS DEL SONDEO Y LOS RÓTULOS DEL PLAZO, sin nada de React, para poder
 * llamarlos desde Node.
 *
 * ═══ ESTO ESTÁ DUPLICADO A SABIENDAS, Y HAY QUE DECIR DE DÓNDE VIENE ═══
 *
 * La misma cuenta vive en `app/src/arcade/relojes.ts`. No se importa de allí, y
 * no porque no compilara —ese fichero no tiene un solo `import`, es aritmética
 * pura— sino porque un cliente de PC que importa de la carpeta de la app de
 * móvil ata las dos cosas al revés de como están pensadas: el día que alguien
 * toque el bolsillo del teléfono, el escritorio se entera.
 *
 * El sitio correcto de estas constantes es `shared/mecanicas/`, que es justo la
 * capa que este repositorio inventó para «código que sirve a varios juegos y que
 * no sabe quién lo usa». Mover el fichero de la app allí es un cambio en `app/`,
 * y `app/` no se toca en esta tarea. Así que se copia el RAZONAMIENTO, se dice
 * que está copiado, y se queda apuntado como la deuda que es: dos copias de una
 * fórmula divergen, siempre, y la que diverge es la que nadie estaba mirando.
 *
 * ═══ QUÉ RED TIENE ESTA COPIA, Y QUÉ MITAD NO TIENE NINGUNA ═══
 *
 * La cabecera anterior decía «estas tres constantes» —son CINCO: el margen sin
 * pausa, lo aparcado, la ventana de presencia, la holgura y la fracción del
 * plazo— y decía que «la cuenta de abajo la llama `scripts/verificar-escritorio.tsx`
 * con números». Debajo hay DOS cuentas y sólo una está llamada:
 *
 *   · `pausaAntesDeVolverAPreguntar` → 8 comprobaciones
 *     (`escritorio/scripts/verificar-escritorio.tsx:640-676`).
 *   · `cuantoQueda`, que es la mitad que la gente LEE en pantalla → CERO.
 *
 * O sea que cambiar los `Math.ceil` de abajo por `Math.floor` —que es exactamente
 * la regresión que la app ya pagó: «quedan 23 h» en una mesa de veinticuatro
 * horas recién abierta, y «2 días» que al bajar un minuto se lee «47 h»— deja
 * `npm run verificar` entero en verde. La app cubre eso con 30 comprobaciones en
 * `app/src/comprobadores/verificar-relojes.mjs`, unas 19 sobre los rótulos, y
 * dos de ellas son barridos que no dependen de acertar la frontera.
 *
 * Y la comprobación que sí existe aquí —`CICLO_MAXIMO_MS < VENTANA_DE_PRESENCIA`—
 * es cierta por álgebra y no por medida: `CICLO = APARCADA + (VENTANA − APARCADA
 * − HOLGURA) = VENTANA − HOLGURA`, o sea 55 000 < 60 000 mientras la holgura sea
 * positiva. Caza que alguien escriba un tope a mano; NO puede cazar lo que sus
 * comentarios dicen temer, que es que el servidor mueva su ventana. Eso lo caza
 * el comparador de la app, que abre `server/src/arcade/mesas.ts` y lee de verdad
 * `CONECTADO_MS` (`verificar-relojes.mjs:246-270`). Aquí no lo lee nadie: falta
 * un paso propio de «relojes · escritorio», y ese paso va en el comprobador, que
 * no es este fichero.
 */

// ---------------------------------------------------------------------------
// La pausa del sondeo — lo que NO se ve
// ---------------------------------------------------------------------------

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
 * dentro de esa ventana, o quien está mirando la pantalla sale «— fuera» en la
 * lista de los demás (`sala.tsx:614`).
 *
 * En la app eso ya se pagó una vez con un tope de dos minutos: el ciclo pasaba a
 * unos 141 s y `presente` caía a `false` durante un 42 % del tiempo con la
 * pestaña delante. Y no es cosmético: `GET /arcade/mesas/:codigo/turno` sirve ese
 * mismo `presente` para decidir a quién se avisa de que le toca.
 *
 * De ahí sale el tope: `60 − 25 − 5` de holgura para la red.
 *
 * ═══ ESTA CUENTA NO SE HACE SOLA, Y ANTES AQUÍ PONÍA QUE SÍ ═══
 *
 * El comentario anterior decía que el día que subiera la ventana de presencia en
 * el servidor «esta cuenta se hace sola». No se hace sola: lo de abajo es un
 * literal escrito a mano, no una lectura de nada. Hay TRES copias del mismo
 * número —`server/src/arcade/mesas.ts:978` (`const CONECTADO_MS = 60_000`), la
 * de la app en `verificar-relojes.mjs`, y ésta— y sólo una de las tres está atada
 * a su origen por un comprobador que lo lea.
 *
 * O sea que quien suba `CONECTADO_MS` en el servidor confiando en ese comentario
 * se queda con la pausa clavada en 30 s para siempre, sin un solo rojo que se lo
 * diga. Y quien lo BAJE —de 60 s a 45 s— vuelve a ver gente pintada «— fuera»
 * con el monitor delante, también en verde, porque la comprobación de al lado
 * compara el ciclo contra esta copia del 60 y no contra el 60 de verdad.
 * Mientras eso siga así, este número SE EDITA A MANO cuando cambie allí.
 */
export const VENTANA_DE_PRESENCIA_MS = 60_000;

/** Holgura para que una respuesta lenta no cuente como ausencia. */
const HOLGURA_MS = 5_000;

export const TOPE_DE_PAUSA_MS = VENTANA_DE_PRESENCIA_MS - APARCADA_MS - HOLGURA_MS;

/** Lo que el ciclo completo tarda como mucho. Tiene que caber en la ventana. */
export const CICLO_MAXIMO_MS = APARCADA_MS + TOPE_DE_PAUSA_MS;

/**
 * La ventana de presencia, publicada para que la red pueda mirarla.
 *
 * Es un ALIAS del de arriba y se queda por un motivo de fontanería, no de
 * diseño: `verificar-escritorio.tsx:66` importa este nombre, ese fichero no se
 * toca en esta tarea, y renombrarlo aquí a secas lo rompería. El nombre bueno es
 * `VENTANA_DE_PRESENCIA_MS` —con sufijo de unidad, como TOPE_DE_PAUSA_MS y
 * CICLO_MAXIMO_MS, y como TODO lo que en `app/src/arcade/relojes.ts` mide
 * milisegundos—, así que lo nuevo que se escriba usa ése y este alias se borra
 * el día que el comprobador cambie de línea.
 */
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
 *
 * DEVUELVE SIEMPRE UN NÚMERO FINITO Y >= 0, y esa promesa hay que sostenerla
 * aquí: `venceEn` llega por el cable dentro de un `as` pelado
 * (`mesa.ts:374`, sin validar campo a campo), así que un `venceEn` que no sea
 * número —una fecha ISO, por ejemplo— atravesaba las tres comparaciones (`NaN <=
 * x` es `false`) y salía por el `Math.min` como `NaN`. Hoy el consumidor lo tapa
 * de casualidad, porque `mesa.ts:344` pregunta `if (pausa > 0)` y `NaN > 0` es
 * `false`; el día que alguien escriba `setTimeout(…, pausa)` sin ese `if`, `NaN`
 * se convierte en 0 en silencio. Con basura se devuelve 0, que es no pausar: el
 * lado conservador del error, el comportamiento de siempre y el más reactivo.
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
  if (!Number.isFinite(venceEn) || !Number.isFinite(ahora)) return 0;
  const quedan = venceEn - ahora;
  if (quedan <= MARGEN_SIN_PAUSA_MS) return 0;
  return Math.min(TOPE_DE_PAUSA_MS, (quedan - MARGEN_SIN_PAUSA_MS) / FRACCION_DEL_PLAZO);
}

// ---------------------------------------------------------------------------
// Los rótulos — lo que SÍ se ve
// ---------------------------------------------------------------------------

/*
 * Las unidades viven en el módulo y no dentro de una función, como en
 * `app/src/arcade/relojes.ts:179-182`. Estaban declaradas dentro de
 * `cuantoQueda`, o sea que se reconstruían en cada llamada —una por segundo, por
 * el latido de `sala.tsx:560`— y, sobre todo, eran invisibles para cualquier
 * otra función del fichero: parte de por qué `cuantoLleva` no se había podido
 * copiar tal cual.
 */
const UN_SEGUNDO = 1000;
const UN_MINUTO = 60_000;
const UNA_HORA = 60 * UN_MINUTO;
const UN_DIA = 24 * UNA_HORA;

/** Donde el rótulo deja de contar horas y empieza a contar días. */
const DOS_DIAS = 48 * UNA_HORA;

/**
 * EL ÚNICO RÓTULO DEL PRODUCTO QUE DICE QUE EL PLAZO VENCIÓ, sacado a constante
 * para que quien lo pinta pueda reconocerlo sin volver a escribir la cadena.
 *
 * Hoy se lee exactamente igual que «Revisión 7», que está a su lado en la misma
 * línea (`sala.tsx:620-627`): los dos en `--tenue` sobre `--teja`, 5,95:1, que
 * pasa AA y es el color de lo secundario. La hoja tiene un color reservado para
 * esto —`--alarma` (`estilo.css:122`), 7,01:1 sobre `--teja`, y `estilo.css:687`
 * lo reserva literalmente para «lo que de verdad se acaba»—, y este texto no lo
 * usa. Desde aquí no se puede pintar nada; lo que sí se puede es dejar de
 * obligar a `sala.tsx` a comparar contra una cadena copiada a mano.
 */
export const SE_ACABO_EL_TIEMPO = 'se acabó el tiempo';

/**
 * Lo que se dice cuando el plazo que llegó por el cable no es un número.
 *
 * No es «se acabó el tiempo» a propósito: eso sería afirmar que el plazo venció,
 * que es lo contrario de lo que se sabe. Se dice que no se sabe.
 */
export const PLAZO_DESCONOCIDO = 'plazo desconocido';

/**
 * CUÁNTO FALTA, dicho como se dice en voz alta, y redondeando HACIA ARRIBA.
 *
 * Hacia arriba es el lado correcto del error en una cuenta atrás: nunca dice que
 * quede menos de lo que queda, así que nadie deja de mover por creer que ya no
 * llegaba. Y evita el rótulo que sube: truncando, a 48 h se lee «2 días» y un
 * minuto después «47 h».
 *
 * ═══ LA GUARDIA DE ARRIBA ES CONTRA LO QUE LLEGA POR EL CABLE ═══
 *
 * Este número sale de `mesa.venceEn - Date.now()` (`sala.tsx:626`) y `venceEn`
 * viene de un `as` pelado sin validar (`mesa.ts:374`). Medido con la aritmética
 * de abajo: `NaN` salía por la última rama como «quedan NaN días», e `Infinity`
 * como «quedan Infinity días» —porque `NaN <= 0` es `false` y los tres `NaN <
 * …` también—, sin error, sin traza, y repintado cada segundo por el latido de
 * `sala.tsx:560`. Con `venceEn` como cadena ISO,
 * `'2026-01-01T00:00:00Z' - Date.now()` da exactamente ese `NaN`.
 *
 * (Es un defecto COMPARTIDO, no una divergencia: `app/src/arcade/relojes.ts:210`
 * tiene el agujero idéntico. Aquí se tapa; allí sigue abierto y es `app/`.)
 */
export function cuantoQueda(ms: number): string {
  if (!Number.isFinite(ms)) return PLAZO_DESCONOCIDO;
  if (ms <= 0) return SE_ACABO_EL_TIEMPO;
  if (ms < UN_MINUTO) return `quedan ${String(Math.ceil(ms / UN_SEGUNDO))} s`;
  if (ms < UNA_HORA) return `quedan ${String(Math.ceil(ms / UN_MINUTO))} min`;
  if (ms < DOS_DIAS) return `quedan ${String(Math.ceil(ms / UNA_HORA))} h`;
  return `quedan ${String(Math.ceil(ms / UN_DIA))} días`;
}

/**
 * LO MISMO AL REVÉS: cuánto lleva esperándose. Para «lleva dos días sin mover».
 *
 * Aquí SÍ se trunca, y no es una incoherencia con la de arriba: un tiempo
 * transcurrido se dice por lo que ya ha pasado —quien lleva dos horas y media
 * esperando lleva dos horas— mientras que una cuenta atrás se dice por lo que
 * todavía cabe. Redondear esto hacia arriba diría «lleva 1 h» de alguien que
 * acaba de mover hace un minuto.
 *
 * ═══ POR QUÉ APARECE AHORA EN EL ESCRITORIO ═══
 *
 * Faltaba, y el dato para llenarla ya viaja por el cable: `turnoDesde: number`
 * está declarado en `mesa.ts:61` y un grep por todo `escritorio/` no encuentra
 * NI UNA lectura — la declaración es su única aparición. Mientras tanto,
 * `sala.tsx:624` resuelve una mesa sin plazo con la cadena `' · sin plazo'`, que
 * no dice nada de cuánto lleva parada. La app llena ese mismo hueco con esta
 * función (`tablero-en-linea.tsx:948-952`).
 *
 * El `Math.max(0, …)` va DENTRO y no en quien llama: el reloj del navegador
 * puede ir por detrás del del servidor, y un `ms` negativo caía por «lleva NaN
 * días» abajo del todo. Con relojes desfasados se dice «acaba de empezar», que
 * es lo que pasa.
 */
export function cuantoLleva(ms: number): string {
  if (!Number.isFinite(ms)) return 'sin saber desde cuándo';
  const minutos = Math.floor(Math.max(0, ms) / UN_MINUTO);
  if (minutos < 1) return 'acaba de empezar';
  if (minutos < 60) return `lleva ${String(minutos)} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 48) return `lleva ${String(horas)} h`;
  return `lleva ${String(Math.floor(horas / 24))} días`;
}

/**
 * CUÁNTO FALTA PARA QUE `cuantoQueda(ms)` DIGA OTRA COSA.
 *
 * ═══ EL PROBLEMA QUE RESUELVE, CON LA CUENTA DELANTE ═══
 *
 * `sala.tsx:556-566` repinta con un `setInterval` de 1000 ms mientras hay plazo,
 * porque este fichero no ofrecía ninguna forma de preguntar cuándo cambia el
 * texto. Pero por encima del minuto el rótulo sólo tiene granularidad de
 * minutos, horas y días: en una mesa de «La Larga» de tres días son 259 200
 * latidos para 72 cambios de texto, o sea 1 útil de cada 3 600, y `LaFicha`
 * rerenderizada 86 400 veces al día. Con la pestaña en segundo plano el
 * navegador lo estrangula a uno por minuto, así que además ni siquiera hace lo
 * que se le pide; en primer plano es una pestaña que no deja bajar la CPU.
 *
 * Con esto, esos mismos tres días son 72 esperas. En el último minuto sigue
 * dando 1000 ms o menos, o sea que la cuenta al segundo no se pierde.
 *
 * Devuelve `Infinity` cuando el rótulo YA NO VA A CAMBIAR —plazo vencido, o dato
 * roto—, que es la señal para no programar nada:
 *
 *     const espera = msHastaQueCambieElRotulo(mesa.venceEn - Date.now());
 *     if (!Number.isFinite(espera)) return;      // no hay nada más que contar
 *     const t = setTimeout(() => { latir((n) => n + 1); }, espera);
 *     return () => { clearTimeout(t); };
 *
 * El valor finito nunca pasa de un día, así que jamás desborda el techo de
 * `setTimeout` (2^31−1 ms ≈ 24,8 días), que es por donde se rompen las esperas
 * largas escritas a ojo.
 */
export function msHastaQueCambieElRotulo(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return Number.POSITIVE_INFINITY;
  /*
   * Dos cosas pueden mover el rótulo, y hay que mirar las DOS. Con `Math.ceil`,
   * el texto cambia cuando `ms` baja al múltiplo inferior de su unidad —a 90 000
   * dice «2 min» hasta llegar a 60 000— y cambia también al cruzar hacia abajo la
   * frontera del tramo, que es donde el bucket solo se equivoca: a 3 600 000
   * exactos dice «quedan 1 h», y un milisegundo más abajo ya dice «quedan 60
   * min». Contar sólo el bucket ahí dejaría el rótulo congelado una hora entera.
   */
  const unidad = ms < UN_MINUTO ? UN_SEGUNDO : ms < UNA_HORA ? UN_MINUTO : ms < DOS_DIAS ? UNA_HORA : UN_DIA;
  const sueloDelTramo = ms < UN_MINUTO ? 0 : ms < UNA_HORA ? UN_MINUTO : ms < DOS_DIAS ? UNA_HORA : DOS_DIAS;
  const sobra = ms % unidad;
  const porElBucket = sobra === 0 ? unidad : sobra;
  const porElTramo = ms - sueloDelTramo;
  const cuanto = Math.min(porElBucket, porElTramo);
  /* Justo encima de una frontera el cambio es inmediato; 1 ms, no 0, para no girar en vacío. */
  return cuanto > 0 ? cuanto : 1;
}
