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
import { manifiestoDe } from '../../../../shared/juegos';
import { FASES_EN_JUEGO } from '../../../../shared/live';
import type { LivePhase, VistaGameMaster } from '../../../../shared/live';
import { palabrasDe } from '../../juegos/palabras';
import type { PalabrasDeJuego } from '../../juegos/palabras';
import PanelDeLaMomia from './PanelDeLaMomia';
import PanelDeLasSombras from './PanelDeLasSombras';
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
  sombras: PanelDeLasSombras,
};

export default function LivePanel(): JSX.Element {
  const game = useAppStore((s) => s.game);
  const [vista, setVista] = useState<VistaGameMaster | null>(null);
  /*
   * DOS AVISOS DISTINTOS, Y POR ESO SON DOS ESTADOS.
   *
   * Compartian uno solo, y el sondeo corre cada tres segundos: pulsabas un mando,
   * salia en rojo por que habia fallado, y a la siguiente vuelta `cargar` lo
   * borraba con su `setError(null)`. En la practica el mensaje aparecia y se iba
   * antes de que diera tiempo a leerlo — y quien dirige se quedaba sin saber por
   * que no habia pasado nada, en mitad de la velada.
   *
   * `errorDeMando` lo pone la accion y el sondeo NO lo toca nunca; caduca solo a
   * los nueve segundos, que da de sobra para leerlo. `avisoDeSondeo` es el otro:
   * la conexion, que si tiene que limpiarse en cuanto vuelva a haberla.
   */
  const [errorDeMando, setErrorDeMando] = useState<string | null>(null);
  const [avisoDeSondeo, setAvisoDeSondeo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [minutos, setMinutos] = useState(15);
  const intervalo = useRef<number | null>(null);
  const borrarMando = useRef<number | null>(null);

  /** Enseña un fallo de mando y lo retira solo, sin que el sondeo lo pise. */
  const avisarDelMando = useCallback((mensaje: string) => {
    setErrorDeMando(mensaje);
    if (borrarMando.current) window.clearTimeout(borrarMando.current);
    borrarMando.current = window.setTimeout(() => setErrorDeMando(null), 9000);
  }, []);

  const cargar = useCallback(async (id: string) => {
    try {
      const v = await llamar<VistaGameMaster>(`/games/${id}/live`, 'GET');
      setVista(v);
      setAvisoDeSondeo(null);
    } catch (e) {
      /*
       * UN PARPADEO DE RED NO ES «LA PARTIDA NO ESTÁ EN JUEGO».
       *
       * Cualquier fallo borraba la vista, y el sondeo corre cada tres segundos.
       * Con el wifi de una casa ajena, el panel caía en mitad de la velada al
       * estado inicial —«La partida no está en juego»— con el botón de abrir la
       * sala encendido, porque para encenderlo basta que la partida tenga
       * trama. Quien dirige lo pulsaba para recuperar su puesto de mando, que
       * es exactamente lo que parece que hay que hacer.
       *
       * `llamar` deja escapar el `TypeError` de `fetch` cuando no hay red, y
       * envuelve en un `Error` normal lo que el servidor sí contesta. Solo esto
       * segundo significa de verdad que ya no hay sesión.
       */
      if (e instanceof TypeError || e instanceof SyntaxError) {
        setAvisoDeSondeo('Sin conexión con el servidor. Se sigue intentando…');
        return;
      }
      /*
       * Y SOLO UN 404 SIGNIFICA QUE YA NO HAY SESIÓN. Un 500 o un 503 son un mal
       * momento del servidor —el guardián de acceso responde 503 cuando no puede
       * comprobar la admisión, que falla cerrado a propósito— y tratarlos como
       * «la partida no está en juego» vaciaba el puesto de mando en mitad de la
       * velada, con el botón de abrir la sala encendido.
       */
      const estado = (e as { estado?: number })?.estado;
      if (estado !== undefined && estado !== 404) {
        setAvisoDeSondeo('El servidor no responde bien ahora mismo. Se sigue intentando…');
        return;
      }
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
      // Y el temporizador del aviso de mando, que si no queda vivo tras salir.
      if (borrarMando.current) window.clearTimeout(borrarMando.current);
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
    setErrorDeMando(null);
    try {
      await fn();
      await cargar(game.id);
    } catch (e) {
      avisarDelMando(e instanceof Error ? e.message : 'No se pudo completar la acción.');
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
          {errorDeMando && <p className="sp-error">{errorDeMando}</p>}
          {avisoDeSondeo && <p className="text-dim text-italic">{avisoDeSondeo}</p>}
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
  // Gente de la partida que no tiene silla en la sesion abierta.
  const sinSilla = game.suspects.filter((s) => !sesion.players.some((p) => p.suspectId === s.id));
  const enRonda = sesion.phase === 'ronda-abierta';
  const rondaCerrada = sesion.phase === 'ronda-cerrada';
  /*
   * ¿Se ha agotado lo que la trama tenía escrito? Es un AVISO, no un tope.
   *
   * Con esto mismo se escondía el botón de abrir ronda —`!ultimaRonda &&`— y esa
   * era la única forma de acabar una partida: al llegar a la última ronda
   * prevista no quedaba más salida que empujar a la mesa a acusar, supieran o no
   * quién fue. `totalRounds` sale del reparto de pistas de la trama: dice cuántas
   * rondas tenía PREVISTAS quien la escribió, no cuántas hacen falta.
   *
   * Ahora se puede seguir abriendo rondas, y lo que dice esto es que a partir de
   * aquí ya no hay pistas nuevas que repartir: se juega para hablar y para que
   * alguien se rompa, que muchas veces es lo que faltaba.
   */
  const sinPistasNuevas = sesion.round >= sesion.totalRounds;

  return (
    <div className="live-panel">
      {errorDeMando && <p className="sp-error">{errorDeMando}</p>}
      {avisoDeSondeo && <p className="text-dim text-italic">{avisoDeSondeo}</p>}

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

      {/*
        QUIEN LLEGO TARDE, Y COMO SENTARLO SIN ECHAR A NADIE.

        La sala se abre con la gente que hubiera en ese momento. A quien se
        anade despues no le nace silla, asi que no puede entrar por mucho que
        figure en la partida, y hasta ahora la unica salida era cerrar la sala
        y volver a abrirla — lo que cambia el codigo y echa a todos los moviles
        ya emparejados. Este boton llama a `/live/sincronizar`, que alinea la
        lista conservando a quien ya estaba dentro.
      */}
      {sinSilla.length > 0 && (
        <section className="deco-frame live-cabecera">
          <div className="live-codigo">
            <span className="live-kicker mono-caps">Falta gente por sentar</span>
            <span className="text-dim">{palabras.sinSilla(sinSilla.length)}</span>
          </div>
          <button
            className="btn"
            disabled={ocupado}
            onClick={() => void accion(() => llamar(`/games/${game.id}/live/sincronizar`))}
          >
            {palabras.sentarAQuienFalte}
          </button>
        </section>
      )}

      {/* ---- Mandos ---- */}
      <section className="deco-frame live-mandos">
        <h3 className="live-titulo">Mandos</h3>
        <div className="live-botones">
          {/*
            SE LE PREGUNTA AL GRAFO DEL JUEGO, Y A NADA MÁS.

            Aquí había además una lista de fases escrita a mano —«de la sala de
            espera, de la ronda cerrada y del sellado»— y esa lista dejó fuera a
            El Paso de las Sombras. Su fase de deliberación final se llama
            `acusaciones`, que es el Consejo del alba, y su manifiesto declara
            `acusaciones: ['ronda-abierta', 'desenlace']` con el comentario
            explícito de que «del consejo se puede volver a andar: si la mesa se
            atasca, otra hora». El grafo decía que sí y la lista decía que no, así
            que el botón no se dibujaba JAMÁS: a quien dirigía solo le quedaban
            «Echar a andar» —que es irreversible y resuelve la noche— y el
            desenlace. La Momia se salvó por casualidad, porque a su fase
            equivalente la llamó `sellado` y ese nombre sí estaba en la lista.

            La lista existía para que CLUEDO no cambiara: él también declara la
            vuelta desde `acusaciones` y el botón nunca estuvo ahí. Ahora sí
            aparece, y es lo correcto por dos motivos. Uno, su manifiesto lo
            declara legal desde hace tiempo y con un comentario que dice por qué
            —«una partida que pasara por ahí se quedaba sin rondas aunque faltara
            gente por acusar»—. Y dos, es lo mismo que se acaba de arreglar al
            quitar el tope de cuatro rondas: si la mesa no lo tiene claro, quien
            dirige tiene que poder darles otra.

            Una lista blanca de nombres de fase es, además, la forma equivocada:
            el juego siguiente que llame a su fase de otra manera se vuelve a
            quedar tapiado sin que nadie vea un error.
          */}
          {puedeIrA('ronda-abierta') && (
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
              {sinPistasNuevas && sesion.round > 0 && (
                <p className="text-dim text-italic live-prorroga">
                  La trama ya ha repartido todas sus pistas. Puedes abrir otra ronda igualmente si
                  la mesa aún no lo tiene claro: no habrá material nuevo, pero sí más tiempo para
                  hablar.
                </p>
              )}
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
              CON LA PALABRA DEL JUEGO, y sale de `palabras.ts` como el resto de
              los rótulos del taller. En El Misterio de la Momia esto decía «5 de
              5 acusaciones entregadas» justo encima de «5 de 5 propuestas de
              orden entregadas», y ahí nadie acusa a nadie: se señala a quien
              rompió el sello. Dos contadores casi iguales con una palabra que no
              es la del juego se leen como el mismo dato.
            */}
            {palabras.acusacionesRecibidas(vista.acusacionesRecibidas, sesion.players.length)}
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
