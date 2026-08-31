/**
 * Los mandos que solo tienen sentido dirigiendo El Misterio de la Momia.
 *
 * QUÉ NECESITA VER quien dirige esta noche, y que en CLUEDO no existe:
 *
 *   · Qué cámara está profanada en esta vigilia, porque es lo primero que se
 *     anuncia en voz alta y entrar en ella cuesta una marca.
 *   · Cómo va la maldición persona a persona, para saber quién está a UNA marca
 *     de quedarse sin voz —que es el momento en que hay que empujar la mesa a
 *     que se ofrezcan amuletos, porque nadie puede gastarlos en sí mismo—.
 *   · Cuántas propuestas de orden han llegado, que es de lo que depende decidir
 *     si ya se puede abrir El Sellado o hace falta otra vigilia.
 *
 * LA REGLA DE ORO, TAMBIÉN AQUÍ: de `EstadoMomia` se pinta lo que la mesa puede
 * saber. `ordenVerdadero` NO SE PINTA NUNCA —ni siquiera durante el sellado— y
 * `fragmentos[].falso` tampoco. Quien dirige a ciegas dirige a ciegas: su panel
 * tampoco puede decirle lo que dirige. Lo único que se enseña del desenlace es
 * lo que ya ha pasado: el orden que la mesa ejecutó y si acertó.
 *
 * POR QUÉ ESTÁ EN UN FICHERO APARTE. Porque `LivePanel` es el panel de
 * cualquier juego y esto es de uno solo. El día que haya un tercer juego con
 * mandos propios, se añade el suyo al lado y `LivePanel` no crece.
 */
import { entidadDe, MARCAS_PARA_TOCADO } from '../../../../shared/juegos';
import type { EstadoMomiaParaElPanel } from '../../../../shared/juegos';
import type { VistaGameMaster } from '../../../../shared/live';
import type { GameSession } from '../../../../shared/types';
import { llamar } from './llamar';

/**
 * Lo que el panel general le pasa a los mandos propios de un juego.
 *
 * `ejecutar` es suyo a propósito: llama, recarga la vista y enseña el error si
 * lo hay. Que cada panel propio se montara su propia gestión de errores habría
 * dado dos formas distintas de fallar en la misma pantalla.
 */
export interface PropsDeMandosPropios {
  game: GameSession;
  vista: VistaGameMaster;
  ocupado: boolean;
  ejecutar: (fn: () => Promise<unknown>) => void;
}

/**
 * El estado del juego, si ya está repartido.
 *
 * Puede no estarlo: una partida abierta antes de que el servidor supiera de la
 * Momia, o una sesión recién creada. En ese caso el panel lo DICE en vez de
 * pintar ceros, que es lo que llevaría a quien dirige a pensar que nadie ha
 * explorado nada.
 */
/*
 * LA FORMA LA DECLARA `shared`, y no es `EstadoMomia`.
 *
 * Aqui se hacia `estado as EstadoMomia`, que es el estado GUARDADO. Lo que llega
 * dirigiendo a ciegas es la proyeccion: propuestas vaciadas con `reservada`, y
 * SIN `ordenVerdadero`. O sea que el tipo prometia un campo que no llega —y que
 * jamas debe pintarse— y no declaraba el que si llega, que habia que leer con
 * otro `as` mas abajo.
 */
function estadoDe(vista: VistaGameMaster): EstadoMomiaParaElPanel | null {
  const estado = vista.sesion.estado?.momia;
  return estado ? (estado as EstadoMomiaParaElPanel) : null;
}

/** «●●○» — las marcas de una persona, de un vistazo. */
function marcasEnPuntos(marcas: number): string {
  const llenas = Math.min(marcas, MARCAS_PARA_TOCADO);
  return '●'.repeat(llenas) + '○'.repeat(Math.max(0, MARCAS_PARA_TOCADO - llenas));
}

export default function PanelDeLaMomia({
  game,
  vista,
  ocupado,
  ejecutar,
}: PropsDeMandosPropios): JSX.Element {
  const { sesion } = vista;
  const estado = estadoDe(vista);
  /*
   * «La vigilia» es de cuando se explora. En el sellado ya no se entra en
   * ninguna cámara, así que la tarjeta que dice «anúnciala en voz alta al abrir
   * la vigilia» seguía ahí mandando hacer algo que ya no toca.
   */
  const enJuego = sesion.phase !== 'lobby' && sesion.phase !== 'desenlace';
  const enVigilia = enJuego && sesion.phase !== 'sellado';

  /** El nombre de un rito o de una cámara, por su id. */
  const nombreDe = (categoria: string, id: string): string =>
    entidadDe(game, categoria, id)?.name ?? '—';

  if (!estado) {
    return (
      <section className="deco-frame live-momia">
        <h3 className="live-titulo">La vigilia</h3>
        {/*
          NO SE ACONSEJA CERRAR Y REABRIR, y este texto costó una auditoría.
          Decía exactamente eso, y cerrar la partida BORRA la sesión en vivo y
          echa a las ocho personas de la mesa: el consejo que parecía la
          solución era el desastre. Ya casi no se llega aquí —el estado se monta
          al abrir— pero una sesión de antes de ese cambio sí, y entonces lo
          honesto es decir que se arregla solo.
        */}
        <p className="text-dim text-italic">
          Esta partida se abrió antes de que la expedición tuviera estado, así que todavía no hay
          marcas ni cámara profanada que enseñar aquí. Aparecerán en cuanto alguien haga su primera
          acción de la vigilia. <b>No cierres la partida</b>: eso echaría a todo el mundo de la
          mesa y no hace falta.
        </p>
      </section>
    );
  }

  const profanada = sesion.round > 0 ? estado.profanadas[sesion.round - 1] : undefined;
  const todos = Object.values(estado.fragmentos ?? {});
  const publicos = todos.filter((f) => f.publico);
  const totalFragmentos = todos.length;
  const propuestas = Object.entries(estado.propuestas ?? {});
  const gente = estado.gente ?? {};
  // Quien lleva tres marcas propone, pero su propuesta ya no cuenta en la
  // votacion: el boton del ritual tiene que mirar estas, no las que han llegado.
  const propuestasQueCuentan = propuestas.filter(([id]) => !gente[id]?.tocado).length;

  /*
   * El recuento, tal y como se resolverá: las propuestas iguales se agrupan y
   * las de quien está tocado NO SUMAN. Se enseña aquí porque es de lo que
   * depende la decisión de quien dirige —abrir el sellado o dar otra vigilia—,
   * y porque después de ejecutarlo ya no sirve de nada saberlo.
   */
  /*
   * A CIEGAS EL RECUENTO NO SE PINTA, porque saber qué orden ha entregado cada
   * cual —y cuál va ganando— es la mitad de la partida. Se reconoce porque las
   * propuestas llegan marcadas como reservadas: llegan sus CLAVES, para saber
   * cuántas hay y poder ejecutar el ritual, pero sin el orden dentro.
   */
  const reservadas = propuestas.some(([, p]) => p.reservada);

  const recuento = new Map<string, { orden: string[]; apoyos: string[] }>();
  for (const [participanteId, propuesta] of reservadas ? [] : propuestas) {
    if (gente[participanteId]?.tocado) continue;
    const clave = propuesta.orden.join('>');
    const previo = recuento.get(clave);
    if (previo) previo.apoyos.push(participanteId);
    else recuento.set(clave, { orden: propuesta.orden, apoyos: [participanteId] });
  }
  const masVotada = [...recuento.values()].sort((a, b) => b.apoyos.length - a.apoyos.length)[0];
  const hayEmpate =
    masVotada !== undefined &&
    [...recuento.values()].filter((v) => v.apoyos.length === masVotada.apoyos.length).length > 1;

  const nombreJugador = (participanteId: string): string =>
    sesion.players.find((p) => p.participanteId === participanteId)?.displayName ?? '—';

  return (
    <>
      {/* ---- La vigilia: qué cámara está profanada ---- */}
      {enVigilia && (
        <section className="deco-frame live-momia">
          <h3 className="live-titulo">La vigilia {sesion.round}</h3>
          {profanada ? (
            <p className="live-profanada">
              <span className="live-kicker mono-caps">Cámara profanada</span>
              <strong>{nombreDe('camaras', profanada)}</strong>
              <span className="text-dim">
                Anúnciala en voz alta al abrir la vigilia. Quien entre saldrá con un fragmento y
                con una marca.
              </span>
            </p>
          ) : (
            <p className="text-dim text-italic">
              Esta vigilia no tiene cámara profanada: se puede explorar sin coste.
            </p>
          )}
        </section>
      )}

      {/* ---- La maldición: marcas y amuletos ---- */}
      <section className="deco-frame live-momia">
        <h3 className="live-titulo">La maldición</h3>
        <p className="text-dim">
          A las {MARCAS_PARA_TOCADO} marcas se queda tocado: sigue jugando y sigue señalando, pero
          su propuesta deja de contar. Un amuleto quita una marca y nadie puede gastarlo en sí
          mismo, así que si ves a alguien al borde, es el momento de hacérselo saber a la mesa.
        </p>
        <table className="live-tabla live-maldicion">
          <thead>
            <tr>
              <th>Expedicionario</th>
              <th>Marcas</th>
              <th>Amuletos</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {sesion.players.map((p) => {
              const suyo = gente[p.participanteId];
              const marcas = suyo?.marcas ?? 0;
              const alBorde = !suyo?.tocado && marcas === MARCAS_PARA_TOCADO - 1;
              return (
                <tr
                  key={p.participanteId}
                  className={suyo?.tocado ? 'is-tocado' : alBorde ? 'is-al-borde' : undefined}
                >
                  <td>{p.displayName}</td>
                  <td className="live-marcas" title={`${marcas} de ${MARCAS_PARA_TOCADO}`}>
                    {marcasEnPuntos(marcas)}
                  </td>
                  <td className="live-amuletos">
                    {suyo && suyo.amuletos > 0 ? '☥'.repeat(suyo.amuletos) : '—'}
                  </td>
                  <td className="text-dim">
                    {suyo?.tocado ? 'tocado · sin voz' : alBorde ? 'a una marca' : 'entero'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ---- El papiro: qué hay sobre la mesa y quién ha gastado su don ---- */}
      {enJuego && (
        <section className="deco-frame live-momia">
          <h3 className="live-titulo">El papiro</h3>
          <p className="text-dim">
            Lo que está sobre la mesa a la vista de todos, y quién ha usado ya su don esta
            vigilia. Ninguna de las dos cosas es secreta —se ven en la mesa— pero hasta ahora
            había que preguntarlas en voz alta para saberlas.
          </p>
          <p className="live-propuestas">
            <strong>{publicos.length}</strong> de {totalFragmentos} fragmentos publicados
            {publicos.length > 0 && ' · el resto sigue en manos de alguien'}
          </p>
          {publicos.length > 0 && (
            <ul className="live-publicos">
              {publicos.map((f) => (
                <li key={f.id}>
                  <span className="mono-caps text-dim">{f.id}</span> {f.texto}
                </li>
              ))}
            </ul>
          )}
          <table className="live-tabla">
            <thead>
              <tr>
                <th>Expedicionario</th>
                <th>Fragmentos</th>
                <th>Su don</th>
              </tr>
            </thead>
            <tbody>
              {sesion.players.map((p) => {
                const suyo = gente[p.participanteId];
                const usado = suyo?.donUsadoEnRonda === sesion.round;
                return (
                  <tr key={p.participanteId}>
                    <td>{p.displayName}</td>
                    <td>{suyo?.fragmentos.length ?? 0}</td>
                    <td className="text-dim">
                      {usado ? 'usado esta vigilia' : 'sin usar'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/*
            QUÉ don tiene cada cual NO se enseña, y es a propósito: es secreto
            de quien lo tiene, y el saqueador tiene dos. Que se haya usado sí,
            porque en la mesa se dice en voz alta al invocarlo.
          */}
        </section>
      )}

      {/* ---- El sellado ---- */}
      <section className="deco-frame live-momia">
        <h3 className="live-titulo">El Sellado</h3>

        {estado.sellado ? (
          /*
           * Ya se ejecutó. Aquí sí se puede enseñar el orden: es el que la mesa
           * ejecutó delante de todos, no el verdadero. Si fue el correcto, son
           * el mismo, y a estas alturas ya no hay nada que proteger.
           */
          <div className={`live-desenlace${estado.sellado.correcto ? ' is-sellada' : ' is-perdida'}`}>
            <p className="live-veredicto">
              {estado.sellado.correcto
                ? 'La tumba volvió a sellarse. Gana la expedición.'
                : 'El ritual falló y la maldición consumió el campamento. Gana el saqueador.'}
            </p>
            <p className="live-orden">
              {estado.sellado.ordenEjecutado.map((rito, i) => (
                <span key={rito} className="live-rito">
                  <b>{i + 1}</b> {nombreDe('ritos', rito)}
                </span>
              ))}
            </p>
            <p className="text-dim text-italic">
              Se ejecutó el orden más votado, con {estado.sellado.votos[0]?.apoyos.length ?? 0}{' '}
              apoyos.
            </p>
          </div>
        ) : (
          <>
            <p className="live-propuestas">
              <strong>{propuestas.length}</strong> de {sesion.players.length} propuestas de orden
              entregadas
              {recuento.size > 0 && ` · ${recuento.size} órdenes distintos sobre la mesa`}
            </p>

            {masVotada && (
              <p className="text-dim">
                El más apoyado ({masVotada.apoyos.length}{' '}
                {masVotada.apoyos.length === 1 ? 'apoyo' : 'apoyos'}
                {hayEmpate ? ', empatado con otro' : ''}) lo firman{' '}
                {masVotada.apoyos.map(nombreJugador).join(' · ')}.
              </p>
            )}

            {sesion.phase === 'sellado' ? (
              <>
                <p className="text-dim text-italic">
                  El Sellado está abierto: nadie explora ya, solo se propone y se señala. Cuando la
                  mesa haya terminado de discutir, ejecuta el ritual.
                </p>
                <button
                  className="btn btn--primary"
                  /*
                    LAS QUE CUENTAN, no las que han llegado. Quien lleva tres
                    marcas sigue proponiendo, pero su propuesta ya no vota. Con
                    el boton mirando el crudo se podia lanzar el ritual con cero
                    votos validos: el servidor lo resuelve con lo que hay —nada—
                    y la tumba se sella mal. Sin vuelta atras y con la mesa
                    delante.
                  */
                  disabled={ocupado || propuestasQueCuentan === 0}
                  title={
                    propuestasQueCuentan === 0
                      ? 'Nadie con voz ha propuesto todavía: da otra vigilia o reparte amuletos'
                      : 'Ejecuta el orden más votado. No tiene vuelta atrás.'
                  }
                  onClick={() => {
                    if (
                      !window.confirm(
                        'Se ejecutará el orden más votado y se sabrá si la tumba se sella. ¿Seguro?',
                      )
                    )
                      return;
                    ejecutar(() => llamar(`/games/${game.id}/live/cierre`));
                  }}
                >
                  Ejecutar el ritual
                </button>
              </>
            ) : (
              <p className="text-dim text-italic">
                Ábrelo cuando la mesa tenga bastante papiro para discutir el orden. No hace falta
                que hayan propuesto todos: se ejecuta el orden más votado.
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
}
