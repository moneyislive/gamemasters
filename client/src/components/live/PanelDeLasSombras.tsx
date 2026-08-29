/**
 * Los mandos que solo tienen sentido dirigiendo El Paso de las Sombras.
 *
 * QUÉ NECESITA VER quien dirige esta noche, y que en los otros dos juegos no
 * existe:
 *
 *   · EL RASTRO de la columna, que es el reloj de la noche y es COLECTIVO. Si
 *     llega al tope, da igual lo bien que se ande la senda. Va lo primero y en
 *     grande porque hay que decirlo en voz alta cada vez que sube.
 *   · DÓNDE ESTABAN LOS CAZADORES en las horas ya cerradas — y, sobre todo, el
 *     recordatorio de que la de AHORA no se anuncia. Es lo único que este juego
 *     se guarda, y es la instrucción que más fácil se olvida cuando se viene de
 *     dirigir la Momia, donde la cámara profanada sí se canta al abrir.
 *   · LAS PRENDAS de cada cual, porque de ellas depende cuánto pesa su voto en
 *     el consejo, y eso cambia el final.
 *
 * LA REGLA DE ORO, TAMBIÉN AQUÍ: de `EstadoSombras` se pinta lo que la mesa
 * puede saber. `sendaVerdadera` NO SE PINTA NUNCA —ni en el consejo—, los pasos
 * batidos solo hasta la hora ya cerrada, y `hitos[].falso` jamás. Quien dirige a
 * ciegas dirige a ciegas: su panel tampoco puede decirle lo que dirige.
 *
 * POR QUÉ ESTÁ EN UN FICHERO APARTE. Porque `LivePanel` es el panel de cualquier
 * juego y esto es de uno solo. El tercero se añade al lado y `LivePanel` no
 * crece: es exactamente lo que prometía el comentario de su tabla `MANDOS_PROPIOS`.
 */
import { entidadDe, manifiestoDe } from '../../../../shared/juegos';
import { PRENDAS_RECIBIDAS_MAXIMO } from '../../../../shared/juegos';
import type { LivePhase, VistaGameMaster } from '../../../../shared/live';
import type { GameSession } from '../../../../shared/types';
import type { PropsDeMandosPropios } from './PanelDeLaMomia';
import { llamar } from './llamar';

/**
 * El estado del juego, leído a la defensiva.
 *
 * Llegan DOS FORMAS por la misma clave: dirigiendo de la manera normal, el
 * estado entero tal y como está guardado; a ciegas, la versión filtrada que
 * compone `registrarProyeccionParaGm`. Comparten los campos que este panel usa
 * y se diferencian en los que no usa, así que se leen igual — pero se leen campo
 * a campo y no con un `as`, porque un panel roto a media noche no tiene arreglo.
 */
interface EstadoParaElPanel {
  rastro?: number;
  rastroMaximo?: number;
  batidos?: string[];
  gente?: Record<
    string,
    {
      prendas?: number;
      prendasRecibidas?: number;
      hitos?: string[];
      enseres?: string[];
      papelUsadoEnRonda?: number;
    }
  >;
  estandartes?: Record<string, string>;
  portes?: Record<string, string>;
  hitos?: Record<string, { id: string; texto?: string; publico?: boolean }>;
  propuestas?: Record<string, { senda?: string[]; reservada?: boolean }>;
  consejo?: {
    sendaAndada?: string[];
    correcta?: boolean;
    interceptada?: boolean;
    votos?: Array<{ senda: string[]; apoyos: string[]; peso: number }>;
  };
}

function estadoDe(vista: VistaGameMaster): EstadoParaElPanel | null {
  const bruto = (vista.sesion.estado as { sombras?: unknown } | undefined)?.sombras;
  return bruto && typeof bruto === 'object' ? (bruto as EstadoParaElPanel) : null;
}

/** «▮▮▯▯▯» — el rastro de un vistazo, para leerlo desde el otro lado de la mesa. */
function rastroEnBarras(rastro: number, maximo: number): string {
  const llenas = Math.min(Math.max(rastro, 0), maximo);
  return '▮'.repeat(llenas) + '▯'.repeat(Math.max(0, maximo - llenas));
}

const PORTES: Record<string, string> = {
  farol: 'el farol',
  plata: 'la plata',
  lanza: 'la lanza',
};

export default function PanelDeLasSombras({
  game,
  vista,
  ocupado,
  ejecutar,
}: PropsDeMandosPropios): JSX.Element {
  const { sesion } = vista;
  const estado = estadoDe(vista);
  const enJuego = sesion.phase !== 'lobby' && sesion.phase !== 'desenlace';
  const enConsejo = sesion.phase === 'acusaciones';

  const nombreDe = (categoria: string, id: string): string =>
    entidadDe(game as GameSession, categoria, id)?.name ?? '—';
  const nombreJugador = (suspectId: string): string =>
    sesion.players.find((p) => p.suspectId === suspectId)?.displayName ?? '—';

  /** ¿Se puede pasar de la fase actual a esta otra? Lo dice el manifiesto. */
  const puedeIrA = (fase: LivePhase): boolean =>
    Boolean(manifiestoDe(game.settings?.juego).fases[sesion.phase]?.includes(fase));

  if (!estado) {
    return (
      <section className="deco-frame live-momia">
        <h3 className="live-titulo">La noche</h3>
        <p className="text-dim text-italic">
          Esta partida se abrió antes de que la columna tuviera estado, así que todavía no hay
          rastro ni prendas que enseñar aquí. Aparecerán en cuanto alguien reconozca su primer
          paso. <b>No cierres la partida</b>: eso echaría a todo el mundo de la mesa y no hace
          falta.
        </p>
      </section>
    );
  }

  const rastro = estado.rastro ?? 0;
  const rastroMaximo = estado.rastroMaximo ?? Math.max(6, sesion.players.length + 2);
  const interceptada = rastro >= rastroMaximo;
  const queda = Math.max(0, rastroMaximo - rastro);
  const gente = estado.gente ?? {};
  const hitos = Object.values(estado.hitos ?? {});
  const publicos = hitos.filter((h) => h.publico);
  const propuestas = Object.entries(estado.propuestas ?? {});
  const reservadas = propuestas.some(([, p]) => p.reservada);

  /*
   * HASTA DÓNDE SE PUEDE CONTAR. Dirigiendo de la manera normal llega la lista
   * entera de pasos batidos —está en el estado guardado— y pintarla sería
   * regalar la noche: con ella delante, quien dirige sabe dónde no meterse y,
   * si además juega, tiene el trofeo «Sin rastro» de balde. Se recorta con la
   * MISMA regla que usa la vista de quien juega: hasta la hora anterior si la
   * hora está abierta, y hasta esta si ya se cerró.
   *
   * A ciegas la lista llega ya recortada por el servidor, así que este corte no
   * quita nada más: las dos mitades coinciden a propósito.
   */
  const hasta =
    sesion.round <= 0 ? 0 : sesion.phase === 'ronda-abierta' ? sesion.round - 1 : sesion.round;
  const batidos = (estado.batidos ?? []).slice(0, hasta);

  /*
   * El recuento del consejo, tal y como se resolverá: las sendas iguales se
   * agrupan y cada voto pesa 1 más por cada prenda recibida. Se enseña porque de
   * eso depende la decisión de quien dirige —abrir el consejo o dar otra hora— y
   * porque después de echar a andar ya no sirve de nada saberlo.
   *
   * A CIEGAS NO SE PINTA: saber qué senda ha entregado cada cual y cuál va
   * ganando es la mitad de la partida. Se reconoce porque las propuestas llegan
   * marcadas como reservadas —llegan sus CLAVES, para saber cuántas hay y poder
   * echar a andar, pero sin la senda dentro—.
   */
  const recuento = new Map<string, { senda: string[]; apoyos: string[]; peso: number }>();
  for (const [suspectId, propuesta] of reservadas ? [] : propuestas) {
    const senda = propuesta.senda ?? [];
    if (senda.length === 0) continue;
    const clave = senda.join('>');
    const peso = 1 + (gente[suspectId]?.prendasRecibidas ?? 0);
    const previo = recuento.get(clave);
    if (previo) {
      previo.apoyos.push(suspectId);
      previo.peso += peso;
    } else {
      recuento.set(clave, { senda, apoyos: [suspectId], peso });
    }
  }
  const masPesada = [...recuento.values()].sort((a, b) => b.peso - a.peso)[0];
  const hayEmpate =
    masPesada !== undefined &&
    [...recuento.values()].filter((v) => v.peso === masPesada.peso).length > 1;

  return (
    <>
      {/* ---- El rastro: el reloj de la noche ---- */}
      <section className="deco-frame live-momia live-sombras">
        <h3 className="live-titulo">El rastro de la columna</h3>
        <p className={`live-rastro${interceptada ? ' is-interceptada' : queda <= 2 ? ' is-apremia' : ''}`}>
          <span className="live-rastro-barra">{rastroEnBarras(rastro, rastroMaximo)}</span>
          <strong>
            {rastro} / {rastroMaximo}
          </strong>
        </p>
        <p className="text-dim">
          {interceptada
            ? 'La columna está interceptada. Por bien que se ande la senda, no se embarca: díselo cuando echen a andar, no antes.'
            : queda <= 2
              ? `Quedan ${queda}. Una o dos pisadas más y los cogen.`
              : `Sube uno por cada persona que entra en el paso batido. Dilo en voz alta cada vez: es el reloj de la noche.`}
        </p>
      </section>

      {/* ---- Los cazadores ---- */}
      {enJuego && (
        <section className="deco-frame live-momia live-sombras">
          <h3 className="live-titulo">Dónde estaban los cazadores</h3>
          {/*
            LA INSTRUCCIÓN QUE MÁS SE OLVIDA, y por eso va arriba y en rojo. Quien
            venga de dirigir la Momia tiene el reflejo de cantar la cámara
            profanada al abrir la vigilia; aquí eso apaga el juego entero.
          */}
          <p className="live-aviso-sombras">
            No lo anuncies al abrir la hora. Se dice al CERRARLA.
          </p>
          {batidos.length === 0 ? (
            <p className="text-dim text-italic">
              Todavía no se ha cerrado ninguna hora, así que no hay nada que contar. Cuando cierres
              la primera, di dónde estaban: ahí es donde la mesa comprueba quién decía la verdad.
            </p>
          ) : (
            <table className="live-tabla">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Los cazadores</th>
                  <th>Quién pisó allí</th>
                </tr>
              </thead>
              <tbody>
                {batidos.map((pasoId, i) => {
                  const ronda = i + 1;
                  const pisaron = sesion.players
                    .filter((p) =>
                      p.elecciones.some((e) => e.round === ronda && e.roomId === pasoId),
                    )
                    .map((p) => p.displayName);
                  return (
                    <tr key={ronda}>
                      <td>{ronda}</td>
                      <td>
                        <strong>{nombreDe('pasos', pasoId)}</strong>
                      </td>
                      <td className="text-dim">{pisaron.join(' · ') || 'nadie'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* ---- Las prendas y la carga ---- */}
      <section className="deco-frame live-momia live-sombras">
        <h3 className="live-titulo">La palabra y la carga</h3>
        <p className="text-dim">
          Una prenda solo se da a otra persona, nunca a uno mismo, y nadie puede tener más de{' '}
          {PRENDAS_RECIBIDAS_MAXIMO} recibidas. En el consejo cada voto pesa uno más por cada
          prenda recibida. Y recuerda cobrarlas: quien recibe una debe una respuesta sincera a una
          pregunta directa, en voz alta.
        </p>
        <table className="live-tabla">
          <thead>
            <tr>
              <th>Quién</th>
              <th>Por dar</th>
              <th>Recibidas</th>
              <th>Lleva</th>
              <th>Disfraz</th>
            </tr>
          </thead>
          <tbody>
            {sesion.players.map((p) => {
              const suyo = gente[p.suspectId];
              const usado = suyo?.papelUsadoEnRonda === sesion.round;
              const recibidas = suyo?.prendasRecibidas ?? 0;
              const carga = (suyo?.enseres ?? []).map((id) => {
                const porte = estado.portes?.[id];
                return porte ? PORTES[porte] ?? nombreDe('enseres', id) : nombreDe('enseres', id);
              });
              return (
                <tr key={p.suspectId} className={recibidas >= PRENDAS_RECIBIDAS_MAXIMO ? 'is-al-borde' : undefined}>
                  <td>
                    {p.displayName}
                    {estado.estandartes?.[p.suspectId] && (
                      <span className="live-reclamada text-dim">
                        {nombreDe('estandartes', estado.estandartes[p.suspectId]!)}
                      </span>
                    )}
                  </td>
                  <td className="live-amuletos">
                    {suyo && (suyo.prendas ?? 0) > 0 ? '◆'.repeat(suyo.prendas ?? 0) : '—'}
                  </td>
                  <td className="live-amuletos">{recibidas > 0 ? '◆'.repeat(recibidas) : '—'}</td>
                  <td className="text-dim">{carga.join(' · ') || '—'}</td>
                  <td className="text-dim">{usado ? 'usado esta hora' : 'sin usar'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/*
          QUÉ disfraz tiene cada cual NO se enseña, y es a propósito: es secreto
          de quien lo tiene, y el kanchō tiene dos. Que se haya usado sí, porque
          en la mesa se dice en voz alta al usarlo.
        */}
      </section>

      {/* ---- El camino ---- */}
      {enJuego && (
        <section className="deco-frame live-momia live-sombras">
          <h3 className="live-titulo">Lo que hay sobre la mesa</h3>
          <p className="live-propuestas">
            <strong>{publicos.length}</strong> de {hitos.length} mojones publicados
            {publicos.length > 0 && ' · el resto sigue en la mano de alguien'}
          </p>
          {publicos.length > 0 && (
            <ul className="live-publicos">
              {publicos.map((h) => (
                <li key={h.id}>
                  <span className="mono-caps text-dim">{h.id}</span> {h.texto}
                </li>
              ))}
            </ul>
          )}
          <table className="live-tabla">
            <thead>
              <tr>
                <th>Quién</th>
                <th>Mojones en la mano</th>
              </tr>
            </thead>
            <tbody>
              {sesion.players.map((p) => (
                <tr key={p.suspectId}>
                  <td>{p.displayName}</td>
                  <td>{gente[p.suspectId]?.hitos?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ---- El consejo del alba ---- */}
      <section className="deco-frame live-momia live-sombras">
        <h3 className="live-titulo">El consejo del alba</h3>

        {estado.consejo ? (
          /*
           * Ya se anduvo. Aquí sí se puede enseñar la senda: es la que la mesa
           * anduvo delante de todos, no la verdadera. Si fue la buena, son la
           * misma, y a estas alturas ya no hay nada que proteger.
           */
          <div className={`live-desenlace${estado.consejo.correcta && !estado.consejo.interceptada ? ' is-sellada' : ' is-perdida'}`}>
            <p className="live-veredicto">
              {estado.consejo.interceptada
                ? 'Los alcanzaron antes de llegar. Gana quien cobraba de Akechi.'
                : estado.consejo.correcta
                  ? 'El señor embarcó en Shirako. Gana la columna.'
                  : 'Amaneció con la columna en el monte. Gana quien cobraba de Akechi.'}
            </p>
            <p className="live-orden">
              {(estado.consejo.sendaAndada ?? []).map((pasoId, i) => (
                <span key={`${pasoId}-${i}`} className="live-rito">
                  <b>{i + 1}</b> {nombreDe('pasos', pasoId)}
                </span>
              ))}
            </p>
            <p className="text-dim text-italic">
              Se anduvo la senda más apoyada, con un peso de{' '}
              {estado.consejo.votos?.[0]?.peso ?? 0}.
            </p>
          </div>
        ) : (
          <>
            <p className="live-propuestas">
              <strong>{propuestas.length}</strong> de {sesion.players.length} sendas entregadas
              {recuento.size > 0 && ` · ${recuento.size} caminos distintos sobre la mesa`}
            </p>

            {masPesada && (
              <p className="text-dim">
                El más apoyado pesa {masPesada.peso}
                {hayEmpate ? ', empatado con otro' : ''} y lo firman{' '}
                {masPesada.apoyos.map(nombreJugador).join(' · ')}.
              </p>
            )}

            {enConsejo ? (
              <>
                <p className="text-dim text-italic">
                  El consejo está abierto: nadie reconoce ya ningún paso, solo se propone y se
                  señala. Cuando la mesa haya terminado de discutir, echad a andar — y andadlo de
                  verdad, habitación por habitación y con todo el mundo detrás.
                </p>
                <button
                  className="btn btn--primary"
                  disabled={ocupado || propuestas.length === 0}
                  title={
                    propuestas.length === 0
                      ? 'Nadie ha propuesto todavía una senda'
                      : 'Se anda la senda más apoyada. No tiene vuelta atrás.'
                  }
                  onClick={() => {
                    if (
                      !window.confirm(
                        'Se andará la senda más apoyada y quedará decidido si el señor embarca. ¿Seguro?',
                      )
                    )
                      return;
                    ejecutar(() => llamar(`/games/${game.id}/live/cierre`));
                  }}
                >
                  Echar a andar
                </button>
              </>
            ) : (
              <>
                <p className="text-dim text-italic">
                  Ábrelo cuando la mesa tenga bastantes mojones para discutir el camino. No hace
                  falta que hayan propuesto todos: se anda la senda más apoyada.
                </p>
                {puedeIrA('acusaciones') && (
                  <button
                    className="btn btn--primary"
                    disabled={ocupado}
                    title="Se cierra el camino: a partir de aquí solo se propone la senda y se señala."
                    onClick={() => ejecutar(() => llamar(`/games/${game.id}/live/acusaciones`))}
                  >
                    Abrir el consejo del alba
                  </button>
                )}
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}
