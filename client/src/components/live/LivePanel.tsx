/**
 * Puesto de mando de la partida en vivo.
 *
 * Es lo que el Game Master tiene abierto durante la velada: abrir y cerrar
 * rondas, ver quién está conectado y en qué sala, entregar giros y abrir el
 * sobre del crimen. Los códigos de invitación se reparten desde aquí.
 *
 * Nada de esta pantalla muestra la solución: con el Game Master a ciegas, su
 * propio panel tampoco puede decirle lo que dirige.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { useAppStore } from '../../state/store';
import { manifiestoDe, accionDeAcusacion } from '../../../../shared/juegos';
import { FASES_EN_JUEGO } from '../../../../shared/live';
import type { LivePhase, VistaGameMaster } from '../../../../shared/live';
import { palabrasDe } from '../../juegos/palabras';
import type { PalabrasDeJuego } from '../../juegos/palabras';
import PanelDeLaMomia from './PanelDeLaMomia';
import type { PropsDeMandosPropios } from './PanelDeLaMomia';
import { llamar } from './llamar';
import './live.css';

/**
 * Los mandos que cada juego añade a los de la casa.
 *
 * Tabla, y no un campo del manifiesto, por la misma razón que las cortinillas
 * de entrada y los retratos del asistente: esto es una pantalla, y una pantalla
 * es código. Lo que el manifiesto declara son las FASES, y de ellas salen los
 * botones que abren y cierran cada una.
 */
const MANDOS_PROPIOS: Record<string, ComponentType<PropsDeMandosPropios>> = {
  momia: PanelDeLaMomia,
};

export default function LivePanel(): JSX.Element {
  const game = useAppStore((s) => s.game);
  const [vista, setVista] = useState<VistaGameMaster | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [minutos, setMinutos] = useState(15);
  const intervalo = useRef<number | null>(null);

  const cargar = useCallback(async (id: string) => {
    try {
      const v = await llamar<VistaGameMaster>(`/games/${id}/live`, 'GET');
      setVista(v);
      setError(null);
    } catch {
      setVista(null);
    }
  }, []);

  useEffect(() => {
    if (!game) return;
    void cargar(game.id);
    // Sondeo suave: el panel del Game Master no necesita ser instantáneo, y así
    // se ve entrar a la gente sin abrir un segundo canal.
    intervalo.current = window.setInterval(() => void cargar(game.id), 3000);
    return () => {
      if (intervalo.current) window.clearInterval(intervalo.current);
    };
  }, [game, cargar]);

  if (!game) return <div />;

  const manifiesto = manifiestoDe(game.settings?.juego);
  const palabras = palabrasDe(game.settings?.juego).vivo;

  /*
   * ¿A dónde se puede ir desde donde estamos? Lo dice el grafo de fases del
   * manifiesto, no una comprobación a mano contra CLUEDO.
   *
   * De aquí salen los botones de fase, y por eso importa: es la lección que
   * costó cara en CLUEDO. Al retirar un botón intermedio, el desenlace se quedó
   * SIN PUERTA y una partida no se podía terminar. Preguntando al grafo, un
   * botón existe exactamente cuando existe la transición, y las dos cosas ya no
   * se pueden separar.
   */
  const puedeIrA = (fase: LivePhase): boolean =>
    Boolean(vista && manifiesto.fases[vista.sesion.phase]?.includes(fase));

  // ¿Puede este juego levantar la mesa sin terminar la partida?
  const admiteIntermedio = manifiesto.fases['ronda-cerrada']?.includes('intermedio');

  const accion = async (fn: () => Promise<unknown>): Promise<void> => {
    setOcupado(true);
    setError(null);
    try {
      await fn();
      await cargar(game.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
    } finally {
      setOcupado(false);
    }
  };

  // ---- Sin partida en vivo todavía ----
  if (!vista) {
    return (
      <div className="live-panel">
        <section className="deco-frame live-vacio">
          <span className="live-glifo" aria-hidden="true">
            ◉
          </span>
          <h3>La partida no está en juego</h3>
          <p className="text-dim text-italic">
            Al abrirla se genera un código para la mesa y uno personal para cada jugador. Con esos
            dos códigos entran en la app del móvil: no hace falta instalar nada ni registrarse.
          </p>
          {!game.plot && <p className="sp-error">{palabras.sinTrama}</p>}
          {error && <p className="sp-error">{error}</p>}
          <button
            className="btn btn--primary"
            disabled={ocupado || !game.plot}
            onClick={() => void accion(() => llamar(`/games/${game.id}/live/abrir`))}
          >
            {palabras.abrirSala}
          </button>
        </section>
      </div>
    );
  }

  const { sesion } = vista;
  const enRonda = sesion.phase === 'ronda-abierta';
  const rondaCerrada = sesion.phase === 'ronda-cerrada';
  const ultimaRonda = sesion.round >= sesion.totalRounds;

  return (
    <div className="live-panel">
      {error && <p className="sp-error">{error}</p>}

      {/* ---- Estado y código ---- */}
      <section className="deco-frame live-cabecera">
        <div className="live-codigo">
          <span className="live-kicker mono-caps">Código de la partida</span>
          <strong>{sesion.code}</strong>
          <span className="text-dim">Se dicta en voz alta a toda la mesa</span>
        </div>
        <div className="live-estado">
          <span className="live-kicker mono-caps">Estado</span>
          <strong>
            {etiquetaFase(palabras, sesion.phase, sesion.round, sesion.totalRounds)}
          </strong>
          <span className="text-dim">
            {vista.conectados} de {sesion.players.length} con el móvil conectado
          </span>
        </div>
      </section>

      {/* ---- Mandos ---- */}
      <section className="deco-frame live-mandos">
        <h3 className="live-titulo">Mandos</h3>
        <div className="live-botones">
          {/*
            De la sala de espera y de la vigilia cerrada, como siempre; y
            también del sellado, porque el manifiesto de la Momia lo permite a
            propósito: si la mesa se atasca discutiendo el orden, quien dirige
            puede darles otra vigilia en vez de obligarles a ejecutar un ritual
            a medio cocinar. No se pregunta solo al grafo porque en CLUEDO
            también se puede volver a jugar desde `acusaciones` y ahí este botón
            no ha estado nunca; eso se queda exactamente como estaba.
          */}
          {(sesion.phase === 'lobby' || rondaCerrada || sesion.phase === 'sellado') &&
            puedeIrA('ronda-abierta') &&
            !ultimaRonda && (
            <>
              <label className="live-minutos">
                <span className="mono-caps">Minutos</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={90}
                  value={minutos}
                  onChange={(e) => setMinutos(Number(e.target.value))}
                />
              </label>
              <button
                className="btn btn--primary"
                disabled={ocupado}
                onClick={() =>
                  void accion(() =>
                    llamar(`/games/${game.id}/live/ronda/abrir`, 'POST', { minutos }),
                  )
                }
              >
                {palabras.abrirRonda(sesion.round + 1)}
              </button>
            </>
          )}

          {enRonda && (
            <button
              className="btn btn--primary"
              disabled={ocupado}
              onClick={() => void accion(() => llamar(`/games/${game.id}/live/ronda/cerrar`))}
            >
              {palabras.cerrarRonda}
            </button>
          )}

          {/*
            YA NO HAY BOTÓN DE «PASAR A LAS ACUSACIONES», y es deliberado.
            Acusar es una carrera —gana quien acierta antes— así que tener que
            esperar a que alguien abra la puerta la convertía en una cola.
            Ahora quien juega acusa cuando quiere desde su móvil, una sola vez y
            para toda la partida, y las rondas siguen su curso.

            La fase `acusaciones` sigue existiendo en el servidor para las
            partidas que ya estén en ella: lo que se retira es la obligación de
            pasar por ahí, no la fase.
          */}

          {/* Solo aparece si el juego admite levantar la mesa sin terminar la
              partida. Un CLUEDO no lo admite y el botón ni se dibuja. */}
          {rondaCerrada && admiteIntermedio && (
            <button
              className="btn"
              disabled={ocupado}
              onClick={() => {
                const titulo = window.prompt('¿Cómo se llama esta jornada?', `Encuentro ${sesion.encuentro ?? 1}`);
                if (titulo === null) return;
                const resumen = window.prompt('¿Qué ha pasado hoy? Se lo leerán al retomar.') ?? '';
                void accion(() =>
                  llamar(`/games/${game.id}/live/encuentro/cerrar`, 'POST', { titulo, resumen }),
                );
              }}
            >
              Cerrar la jornada
            </button>
          )}

          {sesion.phase === 'intermedio' && (
            <button
              className="btn btn--primary"
              disabled={ocupado}
              onClick={() => void accion(() => llamar(`/games/${game.id}/live/encuentro/abrir`))}
            >
              Retomar la partida
            </button>
          )}

          {/*
            Con la ronda cerrada, y tambien en `acusaciones` para las partidas
            que estuvieran en esa fase cuando se desplego el cambio. Mientras la
            ronda esta ABIERTA no aparece a proposito: quien juega sigue
            moviendose, y revelar en mitad de un movimiento se lee como un
            fallo, no como un final.
          */}
          {/*
            EL SELLADO. Solo existe si el juego declara la transición, así que
            en CLUEDO este botón no se dibuja jamás: su grafo tiene `sellado: []`.
          */}
          {puedeIrA('sellado') && (
            <button
              className="btn btn--primary"
              disabled={ocupado}
              title="Se cierra la exploración: a partir de aquí solo se propone el orden y se señala."
              onClick={() => void accion(() => llamar(`/games/${game.id}/live/sellado`))}
            >
              Abrir El Sellado
            </button>
          )}

          {/*
            El desenlace, preguntando al grafo en vez de enumerar fases a mano.
            En CLUEDO sale exactamente donde salía —de la ronda cerrada y de
            `acusaciones`, que son sus dos fases con salida al desenlace— y en la
            Momia sale además desde el sellado, que es donde termina su noche.
          */}
          {puedeIrA('desenlace') && (
            <button
              className="btn btn--primary"
              disabled={ocupado}
              onClick={() => void accion(() => llamar(`/games/${game.id}/live/desenlace`))}
            >
              {palabras.desenlace}
            </button>
          )}

          {game.plot?.material?.hints.map((h) => (
            <button
              key={h.level}
              className="btn btn--sm"
              disabled={ocupado || sesion.phase === 'lobby'}
              onClick={() =>
                void accion(() => llamar(`/games/${game.id}/live/ayuda`, 'POST', { nivel: h.level }))
              }
            >
              Lanzar ayuda {h.level}
            </button>
          ))}
        </div>

        {/* Durante TODO el juego, no solo en la fase que ya no se abre. Ahora se
            acusa en mitad de las rondas, asi que este contador es lo unico que
            dice cuanta gente queda por acusar —y es de lo que depende decidir
            cuando abrir el sobre. Atado a `acusaciones` se habria quedado a
            cero para siempre. */}
        {FASES_EN_JUEGO.includes(sesion.phase) && (
          <p className="text-dim text-italic">
            {/*
              CON LA PALABRA DEL JUEGO. En El Misterio de la Momia esto salía
              como «5 de 5 acusaciones entregadas» justo encima de «5 de 5
              propuestas de orden entregadas», y ahí nadie acusa a nadie: se
              señala a quien rompió el sello. Dos contadores casi iguales con
              una palabra que no es la del juego se leen como el mismo dato.
            */}
            {vista.acusacionesRecibidas} de {sesion.players.length}{' '}
            {`${(accionDeAcusacion(manifiesto)?.rotulo ?? 'Acusar').toLowerCase()}: entregadas.`}
          </p>
        )}

        {/* Quién ha avisado desde el móvil de que ya está en la mesa. Ahorra
            preguntarlo en voz alta doce veces mientras la gente va llegando. */}
        {sesion.phase === 'lobby' && (
          <div className="live-listos">
            <span className="live-kicker mono-caps">
              {vista.listos.length} de {sesion.players.length} dicen estar listos
            </span>
            {vista.listos.length > 0 && (
              <p className="text-dim">{vista.listos.map((l) => l.displayName).join(' · ')}</p>
            )}
            {vista.listos.length === sesion.players.length && sesion.players.length > 0 && (
              <p className="live-todos">Está todo el mundo. Puedes abrir la primera ronda.</p>
            )}
          </div>
        )}
      </section>

      {/*
        ---- Los mandos propios del juego ----
        Se buscan en una tabla y no con un `if`: el día del tercer juego, quien
        lo añada pone su panel aquí y no toca nada de esta pantalla. CLUEDO no
        tiene ninguno y no se pinta nada, que es lo que tiene que pasar.
      */}
      {(() => {
        const Propio = MANDOS_PROPIOS[game.settings?.juego ?? ''];
        return Propio ? (
          <Propio game={game} vista={vista} ocupado={ocupado} ejecutar={(fn) => void accion(fn)} />
        ) : null;
      })()}

      {/* ---- Giros pendientes ---- */}
      {vista.girosPendientes.length > 0 && (
        <section className="deco-frame live-giros">
          <h3 className="live-titulo">Giros de esta ronda</h3>
          <p className="text-dim">
            Entrégalos al cerrar la ronda. Le llegan solo a esa persona, y nadie más se entera.
          </p>
          <div className="live-botones">
            {vista.girosPendientes.map((g) => (
              <button
                key={g.id}
                className="btn btn--sm"
                disabled={ocupado}
                onClick={() =>
                  void accion(() => llamar(`/games/${game.id}/live/giro`, 'POST', { twistId: g.id }))
                }
              >
                Entregar a {g.displayName}
              </button>
            ))}
          </div>
        </section>
      )}

      {/*
        ---- Denuncias al Mayordomo ----
        Existe el botón en la app porque Google Play lo exige a toda app que
        genere contenido con IA. Pero un botón cuyo resultado no lee nadie es un
        adorno: las denuncias tienen que llegar a quien está en la habitación,
        que es quien puede hacer algo esta misma noche.
      */}
      {(sesion.denuncias?.length ?? 0) > 0 && (
        <section className="deco-frame">
          <h3 className="live-titulo">Respuestas denunciadas de {manifiesto.asistente.nombre}</h3>
          <p className="text-dim">
            Alguien de la mesa ha marcado estas respuestas como impropias. Échales un ojo:{' '}
            {manifiesto.asistente.nombre} escribe con un modelo de lenguaje y no siempre acierta el
            tono.
          </p>
          {[...(sesion.denuncias ?? [])].reverse().map((d, i) => (
            <div key={`${d.at}-${i}`} className="deco-frame" style={{ marginTop: '0.75rem' }}>
              <p className="text-dim" style={{ fontSize: '0.85em' }}>
                {d.displayName} · {new Date(d.at).toLocaleString('es-ES')}
              </p>
              {d.pregunta && (
                <p style={{ fontStyle: 'italic' }}>Preguntó: «{d.pregunta}»</p>
              )}
              <p>{d.respuesta}</p>
            </div>
          ))}
        </section>
      )}

      {/* ---- Jugadores ---- */}
      <section className="deco-frame">
        <h3 className="live-titulo">Jugadores y códigos</h3>
        <p className="text-dim">
          Cada persona necesita el código de la partida y el suyo. Dáselos en privado.
        </p>
        <table className="live-tabla">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Su código</th>
              <th>Estado</th>
              <th>Dónde está</th>
            </tr>
          </thead>
          <tbody>
            {sesion.players.map((p) => {
              const donde = vista.ocupacion.find((o) => o.suspectIds.includes(p.suspectId));
              const vivo =
                p.lastSeenAt && Date.now() - new Date(p.lastSeenAt).getTime() < 60_000;
              return (
                <tr key={p.suspectId}>
                  <td>{p.displayName}</td>
                  <td>
                    <code className="live-code">{p.joinCode}</code>
                  </td>
                  <td>
                    <span className={`live-punto${vivo ? ' is-vivo' : ''}`} />
                    {p.joined ? (vivo ? 'conectado' : 'ausente') : 'sin entrar'}
                    {/*
                      Quien entró SIN teclear código deja huella, y aquí es
                      donde se ve. Es la contrapartida de abrir esa puerta: el
                      correo verificado demuestra que la dirección es suya, pero
                      no que no te equivocaras al escribirla. Si este nombre no
                      te cuadra, cierra la partida en vivo y vuelve a abrirla —
                      eso rota todos los códigos y echa a todo el mundo.
                    */}
                    {p.reclamadaPor && (
                      <span
                        className="live-reclamada text-dim"
                        title={`Entró desde una invitación a ${p.reclamadaPor.correo}`}
                      >
                        · por invitación ({p.reclamadaPor.correo})
                      </span>
                    )}
                  </td>
                  <td className="text-dim">{donde?.roomName ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="deco-frame">
        <h3 className="live-titulo">Terminar</h3>
        <p className="text-dim">
          Cierra la partida en vivo y anula todos los códigos. Los dosieres y el material impreso
          no se tocan.
        </p>
        <button
          className="btn"
          disabled={ocupado}
          onClick={() => {
            if (!window.confirm('¿Cerrar la partida en vivo? Los códigos dejarán de valer.')) return;
            void accion(async () => {
              await llamar(`/games/${game.id}/live`, 'DELETE');
              setVista(null);
            });
          }}
        >
          Cerrar la partida en vivo
        </button>
      </section>
    </div>
  );
}

/**
 * En qué punto de la noche está la partida, con las palabras del juego.
 *
 * Una «ronda» de CLUEDO es una «vigilia» de la Momia, y no es un sinónimo por
 * capricho: son las horas que quedan hasta el amanecer, y quien dirige lo va a
 * decir en voz alta doce veces esta noche.
 */
function etiquetaFase(
  palabras: PalabrasDeJuego['vivo'],
  fase: string,
  ronda: number,
  total: number,
): string {
  switch (fase) {
    case 'lobby':
      return 'Sala de espera';
    case 'ronda-abierta':
      return palabras.rondaEnCurso(ronda, total);
    case 'ronda-cerrada':
      return palabras.rondaCerrada(ronda);
    case 'sellado':
      return 'El Sellado · la mesa vota el orden';
    case 'acusaciones':
      return 'Recogiendo acusaciones';
    case 'intermedio':
      return 'Jornada cerrada · la partida continúa';
    case 'desenlace':
      return 'Desenlace revelado';
    default:
      return fase;
  }
}
