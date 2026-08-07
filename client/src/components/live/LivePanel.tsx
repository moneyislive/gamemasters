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
import { useAppStore } from '../../state/store';
import type { VistaGameMaster } from '../../../../shared/live';
import './live.css';

const BASE = '/api';

async function llamar<T>(ruta: string, metodo = 'POST', cuerpo?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await res.text();
  const datos = texto ? JSON.parse(texto) : {};
  if (!res.ok) throw new Error(datos.error ?? `Error ${res.status}`);
  return datos as T;
}

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
          {!game.plot && (
            <p className="sp-error">Genera antes el misterio: sin trama no hay nada que jugar.</p>
          )}
          {error && <p className="sp-error">{error}</p>}
          <button
            className="btn btn--primary"
            disabled={ocupado || !game.plot}
            onClick={() => void accion(() => llamar(`/games/${game.id}/live/abrir`))}
          >
            Abrir la sala de espera
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
          <strong>{etiquetaFase(sesion.phase, sesion.round, sesion.totalRounds)}</strong>
          <span className="text-dim">
            {vista.conectados} de {sesion.players.length} con el móvil conectado
          </span>
        </div>
      </section>

      {/* ---- Mandos ---- */}
      <section className="deco-frame live-mandos">
        <h3 className="live-titulo">Mandos</h3>
        <div className="live-botones">
          {(sesion.phase === 'lobby' || rondaCerrada) && !ultimaRonda && (
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
                Abrir ronda {sesion.round + 1}
              </button>
            </>
          )}

          {enRonda && (
            <button
              className="btn btn--primary"
              disabled={ocupado}
              onClick={() => void accion(() => llamar(`/games/${game.id}/live/ronda/cerrar`))}
            >
              Cerrar la ronda
            </button>
          )}

          {rondaCerrada && (
            <button
              className="btn"
              disabled={ocupado}
              onClick={() => void accion(() => llamar(`/games/${game.id}/live/acusaciones`))}
            >
              Pasar a las acusaciones
            </button>
          )}

          {sesion.phase === 'acusaciones' && (
            <button
              className="btn btn--primary"
              disabled={ocupado}
              onClick={() => void accion(() => llamar(`/games/${game.id}/live/desenlace`))}
            >
              Abrir el sobre del crimen
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

        {sesion.phase === 'acusaciones' && (
          <p className="text-dim text-italic">
            {vista.acusacionesRecibidas} de {sesion.players.length} acusaciones entregadas.
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

function etiquetaFase(fase: string, ronda: number, total: number): string {
  switch (fase) {
    case 'lobby':
      return 'Sala de espera';
    case 'ronda-abierta':
      return `Ronda ${ronda} de ${total} · en curso`;
    case 'ronda-cerrada':
      return `Ronda ${ronda} cerrada`;
    case 'acusaciones':
      return 'Recogiendo acusaciones';
    case 'desenlace':
      return 'Desenlace revelado';
    default:
      return fase;
  }
}
