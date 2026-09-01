/**
 * LOS TRES NÚMEROS DE UNA MESA QUE DURA DÍAS, sin nada de React ni de la app.
 *
 * ═══ POR QUÉ ESTÁN AQUÍ Y NO DONDE SE USAN ═══
 *
 * Vivían sueltos: la pausa del sondeo dentro de `mesa.ts`, y los dos rótulos
 * dentro de `tablero-en-linea.tsx`. Estaban exportados —señal de que se pensaron
 * para probarse— y no las miraba NADIE: un grep por el árbol entero no encontraba
 * un solo consumidor fuera de su propio fichero, y `verify:larga` es entero de
 * servidor. O sea que las cuarenta líneas más delicadas de la fase, las que
 * deciden si la pantalla miente, no tenían ninguna red debajo.
 *
 * Y no era una posibilidad teórica: los tres defectos que esta ronda corrige
 * —la pausa que se comía la ventana de presencia del servidor, el rótulo que
 * truncaba «quedan 23 h» en una mesa de veinticuatro horas recién abierta, y el
 * salto de «2 días» a «47 h» al bajar un minuto— son exactamente lo que caza un
 * comprobador que llame a estas funciones con números.
 *
 * Así que se juntan en un fichero SIN NINGÚN `import`, por lo mismo que
 * `conexion-reglas.ts` de al lado: así se puede transpilar y ejecutar desde un
 * comprobador de Node sin montar React Native. La red es
 * `app/src/comprobadores/verificar-relojes.mjs`, y se llama de verdad — mirar el
 * texto del fichero pasaría en verde con la aritmética invertida.
 */

// ---------------------------------------------------------------------------
// La pausa del sondeo
// ---------------------------------------------------------------------------

/**
 * ═══ UNA PARTIDA DE DÍAS NO SE SONDEA CADA VEINTICINCO SEGUNDOS ═══
 *
 * El sondeo largo aparca la petición veinticinco segundos en el servidor y, si no
 * pasó nada, contesta `204`. Hasta aquí es correcto y es lo que hace que una mesa
 * de diez minutos se sienta viva: cuando otro mueve, la petición aparcada vuelve en
 * el acto.
 *
 * En una mesa de La Larga eso mismo es una petición cada veinticinco segundos
 * durante TRES DÍAS —unas diez mil— por cada móvil con la pantalla abierta, para
 * enterarse de un movimiento que llegará mañana por la mañana. No es una cuestión
 * de coste del servidor: es la radio del móvil encendida y la batería de quien
 * juega.
 *
 * Así que después de un `204` —y sólo después de un `204`, o sea sólo cuando el
 * servidor acaba de decir que no ha pasado nada en veinticinco segundos— se espera
 * un poco antes de volver a aparcarse, y ese poco DEPENDE DE LO QUE FALTE PARA QUE
 * VENZA EL PLAZO.
 *
 * ═══ LO QUE ESTO CUESTA, DICHO ANTES QUE LO QUE AHORRA ═══
 *
 * Durante la pausa no hay ninguna petición aparcada, así que un movimiento de otro
 * tarda hasta `TOPE_DE_PAUSA_MS` de más en verse. Es una ventana de ceguera real y
 * por eso está acotada por arriba con un número pequeño en vez de escalar con el
 * plazo: con la pausa proporcional sin tope, una mesa de tres días se repintaría
 * cada hora, y quien esté mirando la pantalla mientras el otro juega vería una
 * partida congelada.
 *
 * ═══ Y POR QUÉ NO SE PAUSA CUANDO EL PLAZO ESTÁ CERCA ═══
 *
 * Porque el último tramo es el que se mira: es cuando hay una cuenta atrás en
 * pantalla y cuando el vencimiento va a hacer pasar el turno. Ahí la app se
 * comporta EXACTAMENTE como antes de esta fase, y por eso una mesa de treinta
 * segundos no cambia de comportamiento ni un milisegundo: su plazo entero cabe
 * dentro del margen.
 *
 * Nada de esto afecta a la corrección. El plazo lo evalúa el servidor en la
 * LECTURA, así que una pausa no lo retrasa: lo hace vencer en la lectura siguiente,
 * y mientras tanto cualquier otro jugador que lea lo hace vencer igual. Es la misma
 * propiedad que sostiene el sondeo entero — si se pierde un aviso, la siguiente
 * petición trae el estado completo.
 */
const MARGEN_SIN_PAUSA_MS = 2 * 60_000;

/**
 * Lo que el servidor aparca una petición antes de contestar `204`.
 *
 * No se lee de ningún sitio porque el móvil no lo sabe: es una constante del
 * `canal/`, y aquí sólo hace falta para hacer la cuenta de abajo. Si allí
 * cambiara, esta cuenta se queda conservadora, que es el lado bueno del error.
 */
const APARCADA_MS = 25_000;

/**
 * La ventana de presencia del servidor: `CONECTADO_MS` de `server/src/arcade/mesas.ts`.
 *
 * ═══ LA CUENTA QUE FALTABA, Y LO QUE COSTABA NO HABERLA HECHO ═══
 *
 * El servidor pinta a alguien «presente» si se le ha visto hace menos de SESENTA
 * SEGUNDOS, y sólo se le ve cuando su móvil pide. O sea que el ciclo entero del
 * sondeo —lo que dura aparcada la petición MÁS la pausa— tiene que caber dentro de
 * esa ventana, o el jugador desaparece de la lista de presentes estando delante de
 * la pantalla.
 *
 * El tope de la primera versión eran dos minutos, así que el ciclo pasaba de 25 s a
 * unos 141 s: medido con dos jugadores en una mesa de veinticuatro horas, `presente`
 * caía a `false` durante unos 60 s de cada ciclo, o sea un 42 % del tiempo, con la
 * pestaña delante. En pantalla se leía «Ana · Bruno (fuera)» con Bruno mirando su
 * monitor. Y no es cosmético: `GET /arcade/mesas/:codigo/turno` sirve ese mismo
 * `presente` documentado como «la mitad de la decisión de avisar», así que el aviso
 * que esta fase existe para hacer posible saldría hacia quien tiene la partida
 * abierta delante.
 *
 * De ahí sale el tope de ahora: `60 − 25 − 5` de holgura para la red. El ahorro baja
 * de unas seis veces menos peticiones a unas dos, y ese es el precio verdadero de la
 * pausa — el otro era mentira, porque se pagaba con el rótulo de presencia.
 *
 * El día que alguien quiera recuperar el ahorro, la palanca no es este número: es
 * subir `CONECTADO_MS` en el servidor, y entonces esta cuenta se hace sola.
 */
const VENTANA_DE_PRESENCIA_MS = 60_000;

/** Holgura para que una respuesta lenta no cuente como ausencia. */
const HOLGURA_MS = 5_000;

/** Lo más que se pausa, atado a la ventana de presencia. Ver arriba. */
export const TOPE_DE_PAUSA_MS = VENTANA_DE_PRESENCIA_MS - APARCADA_MS - HOLGURA_MS;

/** Cuánto se reparte lo que falta: la pausa es una fracción del plazo restante. */
const FRACCION_DEL_PLAZO = 40;

/**
 * Cuánto esperar antes de volver a aparcarse, mirando lo que falta para el plazo.
 *
 * Se saca aparte y sin nada de React porque es la única decisión de esta pantalla
 * que se puede razonar sola, y porque un número que sale de una fórmula metida en
 * mitad de un bucle es un número que nadie vuelve a mirar.
 *
 * `leTocaAAlguien` sale de `turnoDeLaVista(vista)`: es `false` mientras la partida
 * se está reuniendo, mientras nadie ha repartido, y en un juego que no declara
 * turno.
 */
export function pausaAntesDeVolverAPreguntar(
  venceEn: number | null,
  terminada: boolean,
  leTocaAAlguien: boolean,
  ahora: number,
): number {
  /*
   * SIN PLAZO NO SE PAUSA. Una mesa sin plazo —`plazoSegundos: 0`, legítimo— no
   * tiene ningún vencimiento que mirar, y lo único que puede pasar en ella es que
   * alguien mueva. Pausar ahí sería quitarle reactividad a cambio de nada, porque
   * no hay ningún reloj corriendo del que ahorrarse las vueltas.
   *
   * Y una mesa TERMINADA tampoco: ahí no va a pasar nada nunca más, y la pantalla
   * está enseñando un resultado. La pausa no la mejoraría y el sondeo lo para el
   * propio efecto al salir.
   */
  if (venceEn === null || terminada) return 0;
  /*
   * ═══ Y MIENTRAS SE REÚNE LA MESA, TAMPOCO ═══
   *
   * La pausa se calculaba sólo con `venceEn` y `terminada`, o sea sin mirar si la
   * partida había empezado, y ahí caía donde peor sienta. Medido: Ana abre una mesa
   * de «Un día», Bruno entra con el código y reparte, y la pantalla de Ana tardó
   * unos dos minutos y cinco segundos en enterarse de que Bruno se había sentado
   * —las dos pestañas abiertas, la suya en primer plano—, diciendo mientras tanto
   * «El delta está sin repartir».
   *
   * Montar la mesa es el ÚNICO momento en que dos personas están mirando la
   * pantalla a la vez esperándose, y es justo cuando el plazo de veinticuatro horas
   * está más lejos, o sea cuando la pausa era máxima. Y encima ese plazo, mientras
   * se reúne, es ficticio: si vence, el tic no cambia el estado y se reprograma en
   * silencio. Pausar por un reloj que no significa nada, en el momento en que más
   * se mira, era el peor reparto posible.
   *
   * Se pregunta por el TURNO y no por el número de sentados porque es el juego
   * quien sabe cuándo ha empezado de verdad, y lo declara en su vista.
   */
  if (!leTocaAAlguien) return 0;
  const quedan = venceEn - ahora;
  if (quedan <= MARGEN_SIN_PAUSA_MS) return 0;
  return Math.min(TOPE_DE_PAUSA_MS, (quedan - MARGEN_SIN_PAUSA_MS) / FRACCION_DEL_PLAZO);
}

// ---------------------------------------------------------------------------
// Los dos rótulos
// ---------------------------------------------------------------------------

const UN_SEGUNDO = 1000;
const UN_MINUTO = 60_000;
const UNA_HORA = 60 * UN_MINUTO;
const UN_DIA = 24 * UNA_HORA;

/**
 * CUÁNTO FALTA, DICHO COMO SE DICE EN VOZ ALTA.
 *
 * Días y horas cuando quedan días, minutos cuando quedan minutos, y segundos sólo
 * en el último minuto. Un «quedan 86 340 segundos» es exacto y no dice nada; y una
 * cuenta atrás al segundo en una partida de tres días obligaría a repintar la
 * pantalla sesenta veces por minuto para enseñar un número que no cambia de
 * significado en todo el día.
 *
 * ═══ HACIA ARRIBA, Y NO HACIA ABAJO, QUE ES LA CORRECCIÓN DE ESTA RONDA ═══
 *
 * Estaba con `Math.floor` en los tres tramos, y truncar una cuenta atrás miente en
 * el sitio donde más se nota: una mesa de «Veinticuatro horas por turno» recién
 * abierta contestaba «quedan 23 h». Lo primero que ve quien acaba de elegir el
 * plazo es un número que no es el que eligió.
 *
 * Y en el tramo de días el truncamiento llegaba a leerse como que el tiempo SUBE:
 * a 48 h decía «quedan 2 días» y a 47 h 59 min decía «quedan 47 h», o sea que al
 * bajar un minuto el rótulo pasaba de 2 a 47. Redondeando hacia arriba, 48 h dice
 * «2 días» y el minuto siguiente dice «48 h», que es el mismo tiempo escrito de
 * dos maneras — no un salto.
 *
 * Redondear hacia arriba es además el lado correcto del error para una cuenta
 * atrás: nunca dice que quede menos de lo que queda, así que nadie deja de mover
 * por creer que ya no llegaba.
 */
export function cuantoQueda(ms: number): string {
  if (ms <= 0) return 'se acabó el tiempo';
  if (ms < UN_MINUTO) return `quedan ${String(Math.ceil(ms / UN_SEGUNDO))} s`;
  if (ms < UNA_HORA) return `quedan ${String(Math.ceil(ms / UN_MINUTO))} min`;
  if (ms < 48 * UNA_HORA) return `quedan ${String(Math.ceil(ms / UNA_HORA))} h`;
  return `quedan ${String(Math.ceil(ms / UN_DIA))} días`;
}

/**
 * Lo mismo al revés: cuánto lleva esperándose. Para «lleva dos días sin mover».
 *
 * Aquí SÍ se trunca, y no es una incoherencia con la de arriba: un tiempo
 * transcurrido se dice por lo que ya ha pasado —quien lleva dos horas y media
 * esperando lleva dos horas— mientras que una cuenta atrás se dice por lo que
 * todavía cabe. Redondear esto hacia arriba diría «lleva 1 h» de alguien que
 * acaba de mover hace un minuto.
 */
export function cuantoLleva(ms: number): string {
  const minutos = Math.floor(ms / UN_MINUTO);
  if (minutos < 1) return 'acaba de empezar';
  if (minutos < 60) return `lleva ${String(minutos)} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 48) return `lleva ${String(horas)} h`;
  return `lleva ${String(Math.floor(horas / 24))} días`;
}
