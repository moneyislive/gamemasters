/**
 * EL CANAL DE HOY: sondeo largo, sobre el `hub.ts` que ya existe.
 *
 * ═══ LA REGLA DE ESTE FICHERO: `hub.ts` NO SE TOCA ═══
 *
 * Ni un byte. Es el bus en vivo de las veladas, lleva meses en producción, y hay
 * otra sesión trabajando en el mismo árbol. Todo lo que hace falta cabe en un
 * adaptador, y que quepa es la prueba de que los cinco verbos del canal no son
 * un invento: son lo que `hub.ts` ya expone de hecho.
 *
 * ═══ POR QUÉ SONDEO Y NO WEBSOCKET, HOY ═══
 *
 * Las razones están en la cabecera de `hub.ts` y siguen sirviendo, con un matiz
 * que conviene corregir: la primera —«React Native no trae `EventSource`
 * fiable»— envejeció a medias, porque React Native SÍ trae WebSocket nativo; lo
 * que no trae fiable es SSE.
 *
 * La que hay que conservar con las dos manos es la tercera: LA CORRECCIÓN NO
 * DEPENDE DEL REPARTO. Si se pierde un aviso, la siguiente petición trae el
 * estado completo. Eso es lo que permite que el día que llegue un canal continuo
 * se pueda degradar a esto EN CALIENTE sin que ningún juego se entere.
 *
 * Y el punto de ruptura no es la latencia: es la frecuencia. El sondeo largo
 * deja de valer alrededor de dos a cinco cambios por segundo, porque cada cambio
 * cuesta un ciclo de petición y respuesta completo. Ninguno de los juegos de las
 * fases 1 a 4 lo pide.
 */
import {
  anunciar as anunciarEnHub,
  avisarCambio as avisarCambioEnHub,
  avisosDesde as avisosDesdeElHub,
  esperarCambio as esperarCambioEnHub,
  olvidar as olvidarEnHub,
} from '../live/hub';
import type { AvisoClave } from '../../../shared/live';
import type { Canal } from './index';

/**
 * ═══ LA DECISIÓN MÁS IMPORTANTE DE ESTE FICHERO: LA LLAVE VA PREFIJADA ═══
 *
 * `hub.ts` guarda las esperas y los avisos en dos `Map` de ámbito de módulo,
 * indexados por el identificador de la partida. Son UNA sola tabla para todo el
 * proceso, y el arcade va a compartirla con las veladas.
 *
 * Si una mesa de arcade y una partida de velada llegaran a tener el mismo
 * identificador —y no hay nada que lo impida: los dos son cadenas que genera
 * quien crea la partida— pasarían tres cosas, ninguna con error:
 *
 *   · `avisarCambio` de la mesa despertaría a los móviles de la velada, que
 *     volverían a pedir la vista sin que hubiera cambiado nada.
 *   · `avisosDesde` de la velada devolvería avisos del arcade, y la app pintaría
 *     un telón con el texto de otro juego.
 *   · Y `olvidar` de una mesa de un minuto BORRARÍA LOS AVISOS de una velada de
 *     tres horas. Ese es el grave: doce personas perderían los avisos que se
 *     habían perdido por estar en segundo plano.
 *
 * El prefijo cuesta una concatenación y hace que las dos familias no puedan
 * pisarse aunque alguien elija mal un identificador. Es la misma cautela que se
 * toma al compartir cualquier espacio de nombres plano.
 */
const PREFIJO = 'arcade:';

function llave(mesa: string): string {
  return PREFIJO + mesa;
}

/**
 * El sondeo largo, hablando el idioma del canal.
 *
 * Diez líneas de verdad, que es lo que se prometió. Lo que no es de diez líneas
 * son los peajes que se pagan por reutilizar un bus escrito para otra familia, y
 * están anotados uno a uno abajo con la convención `PEAJE:` — los recoge
 * `verify:arcade-pobre`.
 */
export const canalDeSondeo: Canal = {
  esperarCambio(mesa) {
    /*
     * PEAJE: el plazo son 25 segundos y lo decide `hub.ts` con una constante de
     * módulo. Un arcade no puede pedir el suyo. Para una mesa por turnos da
     * igual; para una ronda de fiesta de treinta segundos, un plazo más corto
     * daría una reconexión más fina. No se arregla desde aquí sin tocar `hub.ts`.
     */
    return esperarCambioEnHub(llave(mesa));
  },

  avisarCambio(mesa) {
    avisarCambioEnHub(llave(mesa));
  },

  anunciar(mesa, rev, aviso, aQuien) {
    /*
     * PEAJE: `hub.anunciar` tipa la clave como `AvisoClave`, que es la unión
     * cerrada de los sucesos de una VELADA —«se abre la ronda», «se acusa»—. El
     * canal de arcade tipa la suya como cadena libre a propósito (ver
     * `index.ts`), así que aquí hay una aserción.
     *
     * No es una conversión insegura en el sentido de que pueda romper nada:
     * `hub` solo guarda la clave y la devuelve tal cual, no la interpreta ni la
     * compara con ninguna constante. Pero es una MENTIRA AL COMPILADOR, y como
     * tal se anota: el día que `hub` empiece a mirar la clave, esto deja de ser
     * inofensivo y no habrá nada que lo cante.
     */
    anunciarEnHub(llave(mesa), rev, aviso.clave as AvisoClave, aviso.texto, aQuien);
  },

  avisosDesde(mesa, desdeRev, quien) {
    /*
     * Aquí NO hace falta aserción y merece la pena decirlo: `AvisoClave` es una
     * unión de cadenas, o sea un subtipo de `string`, así que lo que devuelve el
     * hub encaja en `AvisoDeMesa` tal cual. La conversión solo hace falta en la
     * dirección contraria, que es la de arriba.
     */
    return avisosDesdeElHub(llave(mesa), desdeRev, quien);
  },

  olvidar(mesa) {
    /*
     * PEAJE: `hub.olvidar` llama de rebote a `olvidarPresencia`, que es la
     * presencia de las VELADAS. Con la llave prefijada no borra nada de nadie
     * —no hay ninguna presencia registrada bajo `arcade:…`— así que hoy es
     * inofensivo; pero la llamada ocurre, cientos de veces por minuto cuando la
     * Sala esté llena, y el arcade acaba de estrenar una dependencia con una
     * pieza de veladas que no ha pedido.
     *
     * El arreglo de verdad es el que el diseño ya apunta y aplaza: `presencia.ts`
     * es infraestructura mal archivada, y su sitio no es `live/`.
     */
    olvidarEnHub(llave(mesa));
  },
};
