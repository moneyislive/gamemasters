/**
 * Los mandos que solo tienen sentido dirigiendo El Nudo de Valdehierro.
 *
 * QUÉ NECESITA VER quien dirige esta noche, y que en los otros tres juegos no
 * existe:
 *
 *   · EL RETRASO, que aquí es el antagonista entero. En la mansión, en la tumba
 *     y en el monte lo que hay enfrente es una persona; aquí es un número que
 *     sube. Va lo primero y en grande porque hay que decirlo en voz alta cada
 *     vez que se mueve: la mesa no lo ve subir, lo ve subir quien dirige.
 *   · CUÁNTOS CONVOYES HAN CRUZADO Y CUÁLES. Son seis, sale uno por franja y no
 *     se repite ninguno, así que esa cuenta es literalmente cuánta noche queda.
 *   · LAS CONFORMIDADES Y LOS PUESTOS RENDIDOS. De ahí sale la única pregunta
 *     táctica de la mesa —«¿podemos probar otra orden o hay que ir a trabajar a
 *     una habitación?»— y quien dirige la va a tener que contestar doce veces.
 *   · LA CRÓNICA DE ÓRDENES. Es el guion: cada renglón se canta —«el
 *     enclavamiento no da paso»— y las rechazadas son las que hay que cantar.
 *     Por eso la más reciente va arriba y por eso se marcan en rojo.
 *
 * LA REGLA DE ORO, TAMBIÉN AQUÍ, Y AQUÍ SALE BARATA. El cuadro verdadero no se
 * pinta nunca, y en este juego ni siquiera hay que recortar nada para
 * conseguirlo: el cuadro no vive en el estado sino en la TRAMA, y la trama no
 * llega a esta pantalla por ningún camino. Lo que hay aquí es contabilidad, y
 * la contabilidad de esta noche es pública: la mesa la ve entera en su móvil.
 * Lo único que este panel añade es tenerla junta y en una pantalla grande.
 *
 * POR QUÉ ESTÁ EN UN FICHERO APARTE. Por lo mismo que los otros dos: `LivePanel`
 * es el panel de cualquier juego y esto es de uno solo. El cuarto se añade al
 * lado y `LivePanel` no crece, que es lo que prometía el comentario de su tabla
 * `MANDOS_PROPIOS` y va cuatro juegos cumpliéndose.
 */
import {
  entidadDe,
  entidadesDe,
  fasesConPapel,
  horaDeFranja,
  manifiestoDe,
  papelDe,
  FRANJAS_DE_LA_NOCHE,
  MARGEN_POR_CONSULTA,
  MARGEN_POR_RECUPERAR,
  RETRASO_POR_FRANJA_PERDIDA,
  RETRASO_POR_ORDEN_RECHAZADA,
} from '../../../../shared/juegos';
import type { LivePhase, VistaGameMaster } from '../../../../shared/live';
import type { PropsDeMandosPropios } from './PanelDeLaMomia';
import { llamar } from './llamar';
import type { EstadoNudoParaElPanel } from '../../../../shared/juegos';

/**
 * El estado de la noche, leído a la defensiva.
 *
 * ═══ LLEGAN DOS FORMAS DISTINTAS, Y NO SE PARECEN COMO EN LOS OTROS JUEGOS ═══
 *
 * Dirigiendo de la manera normal, `sesion.estado` es el estado guardado entero y
 * lo de esta noche cuelga de la clave `nudo`, que es donde lo escribe el
 * servidor.
 *
 * A CIEGAS, `sesion.estado` se sustituye por lo que compone
 * `registrarProyeccionParaGm('nudo', …)` — y esa proyección devuelve sus campos
 * AL DESNUDO, sin envolverlos en ninguna clave. O sea que a ciegas
 * `sesion.estado.nudo` NO EXISTE y el estado está en la raíz.
 *
 * Es la diferencia con la Momia y las Sombras, cuyas proyecciones sí devuelven
 * `{ momia: … }` y `{ sombras: … }`, y es exactamente la clase de cosa que se
 * lleva una velada por delante: se prueba dirigiendo de la forma normal, se ve
 * todo bien, y la noche de la partida —que es cuando alguien marca «jugar
 * también»— el panel se encuentra un `undefined` donde esperaba el estado. Por
 * eso se leen LAS DOS FORMAS y por eso ninguna se lee con un `as` a pelo: un
 * panel roto a las dos de la mañana no tiene arreglo posible.
 *
 * Y por eso todos los campos son opcionales aquí abajo aunque en `EstadoNudo` no
 * lo sean: lo que llega es JSON de la red, y el tipo de la red es «lo que haya».
 */
/*
 * LA FORMA LA DECLARA `shared`, no este fichero.
 *
 * Aqui habia una interfaz escrita a mano con los mismos nombres de campo que
 * manda la proyeccion del servidor, y nada comprobaba que fueran los mismos:
 * `ProyeccionParaGm` devuelve `unknown`. Renombrar alli compilaba y dejaba esta
 * tarjeta sin pintar, de noche y sin error.
 *
 * Los campos siguen siendo todos opcionales por lo que dice el comentario de
 * arriba —lo que llega es JSON de la red— pero ahora los NOMBRES estan
 * comprobados contra el tipo que firma la proyeccion.
 */
type EstadoParaElPanel = EstadoNudoParaElPanel;

/**
 * ¿Esto de la raíz es el estado de la noche o el `estado` de otra cosa?
 *
 * Se pregunta por DOS campos y no por uno: `retraso` es un número que podría
 * llamarse igual en cualquier sitio, pero un objeto que además traiga `ordenes`
 * como lista solo lo compone la proyección de este juego. Con un solo campo,
 * cualquier estado ajeno que pasara por aquí se pintaría como si fuera una noche
 * de Valdehierro, con todos los números a cero y sin un error a la vista.
 */
function pareceLaNocheEntera(raiz: Record<string, unknown>): boolean {
  return typeof raiz.retraso === 'number' && Array.isArray(raiz.ordenes);
}

function estadoDe(vista: VistaGameMaster): EstadoParaElPanel | null {
  const raiz = vista.sesion.estado as Record<string, unknown> | undefined;
  if (!raiz || typeof raiz !== 'object') return null;
  /* Dirigiendo normal: cuelga de su clave, que es donde lo guarda el servidor. */
  const propio = raiz.nudo;
  if (propio && typeof propio === 'object') return propio as EstadoParaElPanel;
  /* A ciegas: la proyección no envuelve nada y el estado ES la raíz. */
  return pareceLaNocheEntera(raiz) ? (raiz as EstadoParaElPanel) : null;
}

export default function PanelDelNudo({
  game,
  vista,
  ocupado,
  ejecutar,
}: PropsDeMandosPropios): JSX.Element {
  const { sesion } = vista;
  const estado = estadoDe(vista);
  /*
   * ═══ LA FASE DEL CUADRO FINAL SE PREGUNTA, NO SE ESCRIBE ═══
   *
   * Aquí se comparaba `sesion.phase` con el NOMBRE de la fase escrito a mano
   * —que es lo que hace el panel de las Sombras— y funcionaba: este juego usa
   * los nombres de siempre, así que su fase de decisión se llama como la de
   * CLUEDO aunque en la mesa nadie diga esa palabra ni una vez.
   *
   * Lo cazó `verify:nucleo`, y con razón: un nombre de fase de CLUEDO escrito en
   * un fichero de otro juego es exactamente el acoplamiento que ese trinquete
   * vigila. Lo que este panel necesita saber no es cómo se llama la fase, sino
   * QUÉ PAPEL hace —`decision`— y eso lo declara el manifiesto. La respuesta es
   * la misma y deja de depender de una palabra que este juego no usa.
   */
  const manifiesto = manifiestoDe(game.settings?.juego);
  const faseDeDecision = fasesConPapel(manifiesto, 'decision')[0];
  const enCuadroFinal = papelDe(manifiesto, sesion.phase) === 'decision';
  /*
   * LA CUENTA DE CONFORMIDADES SOLO VALE MIENTRAS HAY FRANJA, y por eso tiene su
   * propia condición en vez de la genérica «en juego» que usan los otros dos
   * paneles. Los puestos rendidos son de la franja EN CURSO y se vacían al abrir
   * la siguiente; en el cuadro final ya no se ocupa ningún puesto ni se resuelve
   * ningún instrumento, así que esa tabla se quedaría enseñando el retrato de
   * una franja que terminó, rotulado «esta franja». Se compara por nombre de
   * fase, como hacen los paneles de la Momia y de las Sombras: aquí no hay riesgo
   * de reconocer las fases del juego ajeno, porque este fichero solo se pinta
   * cuando el juego es este y su manifiesto fija esos nombres.
   */
  const enFranja = sesion.phase === 'ronda-abierta' || sesion.phase === 'ronda-cerrada';

  /**
   * El nombre de un convoy o de un puesto, por su id.
   *
   * CON EL ID DE RESPALDO Y NO CON UNA RAYA, al revés que en los otros dos
   * paneles: aquí lo que se nombra son órdenes que ya se han cursado. Si alguien
   * borró el convoy después de generar, una raya en mitad de la crónica no se
   * puede leer en voz alta y el id, por feo que sea, sí.
   */
  const nombreDe = (categoria: string, id: string): string =>
    entidadDe(game, categoria, id)?.name ?? id;
  const nombreJugador = (participanteId: string): string =>
    sesion.players.find((p) => p.participanteId === participanteId)?.displayName ?? '—';

  /** ¿Se puede pasar de la fase actual a esta otra? Lo dice el manifiesto. */
  const puedeIrA = (fase: LivePhase | undefined): boolean =>
    fase !== undefined && Boolean(manifiesto.fases[sesion.phase]?.includes(fase));

  if (!estado) {
    return (
      <section className="deco-frame live-momia live-nudo">
        <h3 className="live-titulo">La noche</h3>
        {/*
          NO SE ACONSEJA CERRAR Y REABRIR, y esa advertencia viene heredada de la
          Momia porque el error es el mismo: cerrar la partida en vivo borra la
          sesión y echa de la mesa a las diez personas que ya han emparejado el
          móvil. Aquí se llega por dos caminos y ninguno se arregla así: una
          partida abierta antes de que la estación tuviera estado, o una noche a
          ciegas cuya trama todavía no se ha generado —sin trama no hay estado
          que proyectar, y la proyección devuelve nada a propósito—.
        */}
        <p className="text-dim text-italic">
          Todavía no hay nada que contar de la estación: ni retraso, ni conformidades, ni órdenes.
          Aparecerán en cuanto se abra la primera franja y alguien ocupe un puesto.{' '}
          <b>No cierres la partida</b>: eso echaría a todo el mundo de la mesa y no hace falta.
        </p>
      </section>
    );
  }

  const retraso = estado.retraso ?? 0;
  const conformidades = estado.conformidades ?? 0;
  const salidos = estado.salidos ?? [];
  const ordenes = estado.ordenes ?? [];
  const franjasPerdidas = estado.franjasPerdidas ?? [];
  const puestosRendidos = estado.puestosRendidos ?? [];
  const gente = estado.gente ?? {};
  const amanecer = estado.amanecer;

  const convoyes = entidadesDe(game, 'convoyes');
  const puestos = entidadesDe(game, 'puestos');
  /*
   * SEIS, salvo que la partida todavía no tenga los seis dados de alta. La
   * categoría es la única de los cuatro juegos con `exacto`, así que en una
   * partida ya generada esto vale siempre `FRANJAS_DE_LA_NOCHE`; se cuenta de
   * verdad igualmente para que una a medio montar no diga «0 de 6» y parezca
   * rota cuando lo que le pasa es que aún no está lista.
   */
  const totalConvoyes = convoyes.length || FRANJAS_DE_LA_NOCHE;
  const cruzados = estado.despachados ?? salidos.length;

  /*
   * EN QUÉ FRANJA CRUZÓ CADA UNO, que no es el orden en que están en `salidos`.
   *
   * El cuadro SE CORRE: una franja que se cierra sin despachar a nadie no
   * elimina al convoy que tocaba, lo empuja a la siguiente. Así que el tercero
   * de la lista de salidos puede haber cruzado en la franja cuarta o en la
   * quinta, y numerar la lista por su posición diría una hora que no fue. La
   * verdad está en las órdenes aceptadas, que llevan la franja escrita.
   */
  const franjaDeConvoy = new Map<string, number>();
  for (const orden of ordenes) {
    if (orden.aceptada && orden.convoy && typeof orden.franja === 'number') {
      franjaDeConvoy.set(orden.convoy, orden.franja);
    }
  }

  const porSalir = convoyes.filter((c) => !salidos.includes(c.id));

  return (
    <>
      {/* ---- El retraso: el antagonista de esta noche ---- */}
      <section className="deco-frame live-momia live-nudo">
        <h3 className="live-titulo">El retraso de la estación</h3>
        <p className="live-rastro live-retraso">
          <strong>{retraso}</strong>
          <span className="live-unidad">{retraso === 1 ? 'minuto' : 'minutos'}</span>
        </p>
        {/*
          EL TOPE NO SE PUEDE ENSEÑAR, Y SE DICE EN VEZ DE INVENTARLO.

          Sale de la trama (`retrasoMaximo`) y la trama no viaja a la vista de
          quien dirige por ningún camino: `VistaGameMaster` son la sesión, la
          ocupación y poco más. Se podría recalcular con `retrasoMaximoPara`,
          y sería la manera equivocada: esa función cuenta FERROVIARIOS de la
          partida y aquí solo hay sillas ocupadas en la sesión, así que en
          cuanto alguien no aparezca a jugar el panel diría un tope que no es.
          Un tope aproximado en la pantalla desde la que se dirige es peor que
          ninguno: se lee en voz alta y decide cuándo se acelera.
        */}
        <p className="text-dim">
          De un tope que decide la partida: al pasarlo se cierra el puerto y la noche está perdida
          aunque salgan los seis. El número exacto de esta partida lo llevas impreso en la tabla del
          retraso y las conformidades; aquí no llega, y uno aproximado sería peor que ninguno.
        </p>
        <p className="text-dim">
          Cada orden que el enclavamiento rechaza cuesta {RETRASO_POR_ORDEN_RECHAZADA} minutos, y
          cada franja que se cierra sin despachar a nadie, {RETRASO_POR_FRANJA_PERDIDA}. Cántalo
          cada vez que suba: es el reloj de la noche y la mesa no lo ve.
        </p>
        {franjasPerdidas.length > 0 && (
          <p className="text-dim">
            Franjas cerradas sin que saliera nadie:{' '}
            <b>{franjasPerdidas.map((f) => `${f} (${horaDeFranja(f)})`).join(' · ')}</b>. El cuadro
            se corrió esas veces, así que nadie se ha quedado sin poder salir.
          </p>
        )}
      </section>

      {/* ---- Los convoyes ---- */}
      <section className="deco-frame live-momia live-nudo">
        <h3 className="live-titulo">Los convoyes</h3>
        <p className="live-propuestas">
          <strong>{cruzados}</strong> de {totalConvoyes} han cruzado el nudo
        </p>
        {salidos.length === 0 ? (
          <p className="text-dim text-italic">
            Todavía no ha salido ninguno. El primero es el que más cuesta: hasta que no se cursa una
            orden, la mesa no sabe si sus telegramas dicen lo que cree.
          </p>
        ) : (
          <p className="live-orden">
            {salidos.map((id, i) => {
              const franja = franjaDeConvoy.get(id);
              return (
                <span key={`${id}-${i}`} className="live-rito">
                  <b>{franja ? horaDeFranja(franja) || franja : i + 1}</b> {nombreDe('convoyes', id)}
                </span>
              );
            })}
          </p>
        )}
        {porSalir.length > 0 && (
          <p className="text-dim">
            Siguen en la vía: {porSalir.map((c) => c.name).join(' · ')}.
          </p>
        )}
      </section>

      {/* ---- Las conformidades y los puestos ---- */}
      {enFranja && (
        <section className="deco-frame live-momia live-nudo">
          <h3 className="live-titulo">Las conformidades</h3>
          <p className="live-propuestas">
            <strong>{conformidades}</strong>{' '}
            {conformidades === 1 ? 'disponible' : 'disponibles'} · cursar una orden gasta una
          </p>
          <p className="text-dim">
            La estación regala una al abrir cada franja y las demás se ganan: cada puesto da la suya
            la primera vez que alguien resuelve su instrumento en esta franja. Si están todos
            rendidos y no queda ninguna, la mesa tiene que esperar a la franja siguiente — y eso es
            una decisión tuya, no un fallo.
          </p>
          {puestos.length === 0 ? (
            <p className="text-dim text-italic">
              Esta partida no tiene puestos dados de alta, así que no hay instrumentos que rendir.
            </p>
          ) : (
            <table className="live-tabla">
              <thead>
                <tr>
                  <th>Puesto</th>
                  <th>Su instrumento, esta franja</th>
                </tr>
              </thead>
              <tbody>
                {puestos.map((p) => {
                  const rendido = puestosRendidos.includes(p.id);
                  return (
                    <tr key={p.id} className={rendido ? 'is-rendido' : undefined}>
                      <td>{p.name}</td>
                      <td className="text-dim">
                        {rendido ? 'rendido · ya dio su conformidad' : 'sin rendir'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* ---- La crónica de órdenes: el guion de la noche ---- */}
      <section className="deco-frame live-momia live-nudo">
        <h3 className="live-titulo">La crónica de órdenes</h3>
        <p className="text-dim">
          La más reciente arriba. Esto es lo que se lee en voz alta: la mesa ve en su móvil que una
          orden se ha rechazado, pero quien la canta eres tú, y en una habitación con diez personas
          hablando eso es la mitad de la tensión de la noche.
        </p>
        {ordenes.length === 0 ? (
          <p className="text-dim text-italic">
            Nadie ha cursado todavía ninguna orden.
          </p>
        ) : (
          <table className="live-tabla live-cronica">
            <thead>
              <tr>
                <th>Franja</th>
                <th>Convoy</th>
                <th>Quién la cursó</th>
                <th>El enclavamiento</th>
              </tr>
            </thead>
            <tbody>
              {/*
                COPIA ANTES DE INVERTIR. `reverse()` muta el array que recibe, y
                ese array es el estado que acaba de llegar del sondeo: invertirlo
                en sitio deja la crónica dada la vuelta también para cualquier
                otra cosa que la lea, y cada tres segundos vuelve a girar.
              */}
              {[...ordenes].reverse().map((orden, i) => {
                const rechazada = orden.aceptada !== true;
                const coste = orden.retraso ?? 0;
                return (
                  <tr
                    key={`${orden.at ?? 'sin-hora'}-${i}`}
                    className={rechazada ? 'is-rechazada' : undefined}
                  >
                    <td>
                      {orden.franja ?? '—'}
                      {orden.franja ? ` · ${horaDeFranja(orden.franja)}` : ''}
                    </td>
                    <td>
                      <strong>{orden.convoy ? nombreDe('convoyes', orden.convoy) : '—'}</strong>
                    </td>
                    <td className="text-dim">
                      {orden.quien ? nombreJugador(orden.quien) : '—'}
                    </td>
                    <td>
                      {/*
                        UNA RECHAZADA PUEDE COSTAR CERO, y hay que decirlo o
                        parece un error de la cuenta: es la maña del indulto,
                        que se declara antes y se gasta en la orden siguiente.
                        Quien dirige tiene que poder atar las dos cosas.
                      */}
                      {!rechazada
                        ? 'dio paso'
                        : coste > 0
                          ? `no dio paso · +${coste} min`
                          : 'no dio paso · indultada, sin coste'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ---- Quién lleva qué ---- */}
      <section className="deco-frame live-momia live-nudo">
        <h3 className="live-titulo">El turno de noche</h3>
        <p className="text-dim">
          El margen es de cada cual y se gana resolviendo instrumentos: preguntarle al archivo
          cuesta {MARGEN_POR_CONSULTA} y recuperar un minuto de retraso, {MARGEN_POR_RECUPERAR}. La
          maña es UNA en toda la noche y se dice en voz alta al gastarla; si ves que alguien la ha
          usado y no la ha cantado, recuérdaselo, porque la mitad de su valor es que la mesa lo
          sepa.
        </p>
        <table className="live-tabla">
          <thead>
            <tr>
              <th>Ferroviario</th>
              <th>Margen</th>
              <th>Su maña</th>
              <th>Consultas</th>
              <th>Instrumentos</th>
            </tr>
          </thead>
          <tbody>
            {sesion.players.map((p) => {
              const suyo = gente[p.participanteId];
              const margen = suyo?.margen ?? 0;
              return (
                <tr key={p.participanteId}>
                  <td>{p.displayName}</td>
                  <td className="live-margen">{margen}</td>
                  <td className="text-dim">{suyo?.manaUsada ? 'gastada' : 'sin usar'}</td>
                  <td className="text-dim">{suyo?.consultas ?? 0}</td>
                  <td className="text-dim">{suyo?.instrumentosResueltos ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ---- El cuadro final y el parte del amanecer ---- */}
      <section className="deco-frame live-momia live-nudo">
        <h3 className="live-titulo">El cuadro final</h3>

        {amanecer ? (
          /*
           * Ya amaneció. Aquí sí se puede enseñar todo: es el parte que se acaba
           * de dar delante de la mesa, no la solución. Y sigue sin haber cuadro
           * verdadero por ninguna parte — lo lee en voz alta quien preparó el
           * sobre, que es lo que dice la guía de la noche.
           */
          <div
            className={`live-desenlace${(amanecer.ganadores?.length ?? 0) > 0 ? ' is-sellada' : ' is-perdida'}`}
          >
            <p className="live-veredicto">
              {(amanecer.ganadores?.length ?? 0) > 0
                ? 'Los convoyes cruzaron. Gana el turno entero.'
                : 'Amaneció con la noche perdida.'}
            </p>
            {amanecer.anuncio && <p>{amanecer.anuncio}</p>}
            <p className="text-dim">
              Cruzaron {amanecer.cruzaron ?? 0} de {totalConvoyes} · el Correo de Medianoche{' '}
              {amanecer.correoPaso ? 'pasó' : 'se quedó en la vía'} · retraso final{' '}
              {amanecer.retrasoFinal ?? 0} minutos · el puerto{' '}
              {amanecer.puertoCerrado ? 'se cerró' : 'aguantó abierto'}.
            </p>
          </div>
        ) : enCuadroFinal ? (
          <>
            <p className="text-dim text-italic">
              El cuadro final está abierto: cada cual entrega el suyo por separado, seis convoyes en
              seis franjas y de memoria. Eso es cosa de cada uno y no del turno — se puede haber
              sacado la noche adelante y entregar un cuadro con dos franjas cambiadas.
            </p>
            <p className="text-dim">
              Si la mesa se atasca todavía puedes darles otra franja: el juego lo permite y muchas
              veces es lo que faltaba. Cuando no quede nada por decir, abre el amanecer.
            </p>
          </>
        ) : (
          <>
            <p className="text-dim text-italic">
              Ábrelo cuando los seis hayan cruzado, o cuando ya no quede noche. No hace falta que
              hayan entregado todos: se puede entregar el cuadro desde cualquier franja, así que
              media mesa lo tendrá hecho antes de llegar aquí.
            </p>
            {/*
              EL BOTÓN VIVE AQUÍ Y NO EN `LivePanel`, igual que el del consejo del
              alba de las Sombras. `LivePanel` retiró el suyo a propósito cuando
              entregar la respuesta dejó de ser una fase por la que hubiera que
              pasar en CLUEDO,
              así que un juego cuya fase de decisión SÍ es un momento de la
              velada tiene que traérselo puesto. Sin esto, «el cuadro final» está
              declarado en el manifiesto y no se puede abrir desde ninguna parte.
            */}
            {puedeIrA(faseDeDecision) && (
              <button
                className="btn btn--primary"
                disabled={ocupado}
                title="Se cierra la circulación: a partir de aquí solo se entrega el cuadro."
                onClick={() => ejecutar(() => llamar(`/games/${game.id}/live/respuestas`))}
              >
                Abrir el cuadro final
              </button>
            )}
          </>
        )}
      </section>
    </>
  );
}
