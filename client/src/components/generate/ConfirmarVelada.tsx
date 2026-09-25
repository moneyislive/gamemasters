/**
 * ConfirmarVelada — lo que se enseña ANTES de generar, y lo que hay que confirmar.
 *
 * Tres cosas, en este orden, porque es el orden en que importan:
 *
 *   1. CÓMO SE VA A JUGAR: papel o app. Si ya se eligió, se recuerda y se pide
 *      confirmarlo; si no, hay que elegirlo para seguir. Cambia lo que trae la
 *      velada —con app entra el Mayordomo— y por tanto el precio.
 *   2. LO QUE SE VA A ESCRIBIR, en claro, y cuánto tarda.
 *   3. EL PRECIO, si a quien dirige se le cobra, con su saldo al lado. Y plegadas
 *      debajo, las opciones avanzadas —modelo y esfuerzo—, que mueven precio y
 *      calidad: quien no las toca no las ve.
 *
 * El botón dice el modo con todas las letras —«Generar para jugar en papel»—
 * para que confirmar sea leerlo, no pulsar por costumbre.
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ModoDeJuego, RespuestaDelPresupuesto } from '../../../../shared/cobro';
import { comprar, ErrorDeApi, pedirPresupuesto } from '../../api/client';
import { useAppStore } from '../../state/store';
import { lugaresDe, personasDe } from '../../../../shared/juegos';
import { startGeneration } from './GenerateOverlay';
import './confirmar.css';

const ESFUERZOS: Array<{ id: string; nombre: string; nota: string }> = [
  { id: 'low', nombre: 'Bajo', nota: 'Más barato y rápido; tramas más sencillas.' },
  { id: 'medium', nombre: 'Medio', nota: 'El de la casa para escribir la trama.' },
  { id: 'high', nombre: 'Alto', nota: 'Piensa más cada pista y cada coartada. Más caro y más lento.' },
  { id: 'xhigh', nombre: 'Muy alto', nota: 'Bastante más caro y lento.' },
  { id: 'max', nombre: 'Máximo', nota: 'Todo lo que da el modelo. Mucho más caro y lento.' },
];

const MODOS: Array<{ id: ModoDeJuego; glifo: string; nombre: string; texto: string }> = [
  {
    id: 'papel',
    glifo: '📜',
    nombre: 'En papel',
    texto: 'Cada invitado recibe su dosier impreso; tú diriges con el manual, las tarjetas y los sobres.',
  },
  {
    id: 'app',
    glifo: '📱',
    nombre: 'Con la app',
    texto:
      'Cada invitado juega en su móvil y tú diriges desde el panel en vivo. Incluye al Mayordomo, que contesta preguntas durante la partida.',
  },
];

function euros(centimos: number): string {
  return `${(centimos / 100).toFixed(2).replace('.', ',')} €`;
}

export default function ConfirmarVelada(): JSX.Element | null {
  const abierta = useAppStore((s) => s.confirmacionAbierta);
  const cerrar = useAppStore((s) => s.cerrarConfirmacion);
  const game = useAppStore((s) => s.game);
  const config = useAppStore((s) => s.config);

  const [modo, setModo] = useState<ModoDeJuego | null>(null);
  const [modelo, setModelo] = useState('');
  const [esfuerzo, setEsfuerzo] = useState('');
  const [respuesta, setRespuesta] = useState<RespuestaDelPresupuesto | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comprando, setComprando] = useState(false);

  // Al abrir, lo que la partida ya tenía elegido.
  useEffect(() => {
    if (!abierta || !game) return;
    setModo(game.settings?.modo ?? null);
    setModelo(game.settings?.model ?? '');
    setEsfuerzo(game.settings?.esfuerzo ?? '');
    setRespuesta(null);
    setError(null);
  }, [abierta, game?.id]);

  // El presupuesto, cada vez que cambia algo que lo mueve.
  useEffect(() => {
    if (!abierta || !game || !modo) return;
    let vigente = true;
    setCargando(true);
    setError(null);
    pedirPresupuesto(game.id, { modo, ...(modelo ? { model: modelo } : {}), ...(esfuerzo ? { esfuerzo } : {}) })
      .then((r) => vigente && setRespuesta(r))
      .catch((e: unknown) => vigente && setError(e instanceof Error ? e.message : 'No se pudo calcular el precio.'))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [abierta, game?.id, modo, modelo, esfuerzo]);

  const tamano = useMemo(() => {
    if (!game) return null;
    const personas = personasDe(game).length;
    const lugares = lugaresDe(game).length;
    return { personas, lugares };
  }, [game]);

  if (!game) return null;

  const regenerar = Boolean(game.plot);
  const recordado = game.settings?.modo;
  const modelosDeVelada = (config?.models ?? []).filter((m) => m.paraVeladas);
  const cobra = respuesta?.cobra === true;
  const incluida = cobra && regenerar && respuesta?.pagada?.regeneracionIncluida === true;
  const falta = cobra && !incluida && respuesta ? Math.max(0, respuesta.presupuesto.creditos - (respuesta.saldo ?? 0)) : 0;
  const puedeGenerar = Boolean(modo) && Boolean(respuesta) && !cargando && falta === 0;

  const generar = (): void => {
    if (!modo || !respuesta) return;
    cerrar();
    void startGeneration({
      modo,
      ...(modelo ? { model: modelo } : {}),
      ...(esfuerzo ? { esfuerzo } : {}),
      ...(cobra && !incluida ? { creditosVistos: respuesta.presupuesto.creditos } : {}),
    }).catch(() => undefined);
  };

  const comprarLoQueFalta = async (): Promise<void> => {
    if (!respuesta) return;
    setComprando(true);
    try {
      // Se compra la velada entera: lo que sobre se queda en el monedero.
      const { url } = await comprar('velada', { creditos: respuesta.presupuesto.creditos, gameId: game.id });
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof ErrorDeApi || e instanceof Error ? e.message : 'No se pudo abrir el pago.');
      setComprando(false);
    }
  };

  return (
    <AnimatePresence>
      {abierta && (
        <motion.div
          className="confirmar-fondo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={cerrar}
        >
          <motion.div
            className="confirmar deco-frame deco-corners"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmar-titulo"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirmar-cuerpo">
            <p className="confirmar-kicker mono-caps">{regenerar ? 'Volver a escribir' : 'Antes de escribir'}</p>
            <h2 id="confirmar-titulo" className="confirmar-titulo">
              {regenerar ? 'La velada se escribirá de nuevo' : 'Vamos a escribir vuestra velada'}
            </h2>
            {regenerar && (
              <p className="confirmar-aviso">Se sustituye la trama actual, con su material y su revisión.</p>
            )}

            <h3 className="confirmar-seccion mono-caps">¿Cómo vais a jugar?</h3>
            <div className="confirmar-modos" role="radiogroup" aria-label="Cómo vais a jugar">
              {MODOS.map((m) => (
                <button
                  key={m.id}
                  role="radio"
                  aria-checked={modo === m.id}
                  className={`confirmar-modo${modo === m.id ? ' is-elegido' : ''}`}
                  onClick={() => setModo(m.id)}
                >
                  <span className="confirmar-modo-glifo" aria-hidden="true">
                    {m.glifo}
                  </span>
                  <span className="confirmar-modo-nombre">{m.nombre}</span>
                  <span className="confirmar-modo-texto">{m.texto}</span>
                  {recordado === m.id && <span className="confirmar-modo-marca mono-caps">Lo elegiste</span>}
                </button>
              ))}
            </div>
            {!modo && <p className="confirmar-nota text-italic">Elige cómo vais a jugar para ver lo que incluye y el precio.</p>}

            {modo && (
              <>
                <h3 className="confirmar-seccion mono-caps">Lo que se va a escribir</h3>
                <ul className="confirmar-lista">
                  <li>
                    Una trama a medida de {tamano?.personas ?? 0} personas y {tamano?.lugares ?? 0} lugares, con un
                    personaje hecho para cada cual.
                  </li>
                  <li>El material para leer en voz alta: narraciones, giros, hechos que se destapan y el desenlace.</li>
                  <li>
                    La revisión adversaria: un detective que no conoce la solución intenta resolverla antes de tiempo, y
                    un revisor corrige lo que encuentre antes de entregártela.
                  </li>
                  {modo === 'papel' ? (
                    <li>Los dosieres y todos los imprimibles se componen al momento, sin coste.</li>
                  ) : (
                    <li>El Mayordomo contesta las preguntas de la mesa durante la partida.</li>
                  )}
                </ul>
                <p className="confirmar-nota text-dim">
                  Tarda entre quince y veinticinco minutos: puedes seguir por aquí mientras tanto.
                  {modo === 'app'
                    ? ' Si luego jugáis en papel, los dosieres siguen disponibles sin coste.'
                    : ' Si luego queréis jugar con la app, se puede pasar pagando solo la diferencia.'}
                </p>

                <div className="confirmar-precio">
                  {cargando && <span className="text-dim text-italic">Calculando…</span>}
                  {!cargando && respuesta && !cobra && (
                    <span className="text-dim">Sin coste en esta instalación.</span>
                  )}
                  {!cargando && respuesta && cobra && incluida && (
                    <span>Incluida: esta velada ya está pagada y trae una regeneración sin coste.</span>
                  )}
                  {!cargando && respuesta && cobra && !incluida && (
                    <>
                      <span className="confirmar-precio-cifra">{euros(respuesta.presupuesto.centimos)}</span>
                      <span className="confirmar-precio-creditos mono-caps">
                        {respuesta.presupuesto.creditos} créditos · tienes {respuesta.saldo ?? 0}
                      </span>
                      {falta > 0 && (
                        <button className="btn btn--sm" disabled={comprando} onClick={() => void comprarLoQueFalta()}>
                          {comprando ? 'Abriendo el pago…' : `Pagar esta velada (${euros(respuesta.presupuesto.centimos)})`}
                        </button>
                      )}
                    </>
                  )}
                </div>

                <details className="confirmar-avanzadas">
                  <summary className="mono-caps">Opciones avanzadas</summary>
                  <p className="text-dim confirmar-nota">
                    Cambian el precio y la calidad. Si no sabes qué elegir, déjalas como vienen.
                  </p>
                  <label className="confirmar-campo">
                    <span>Modelo</span>
                    <select className="select" value={modelo} onChange={(e) => setModelo(e.target.value)}>
                      <option value="">El de la casa</option>
                      {modelosDeVelada.map((m) => (
                        <option key={m.id} value={m.id} title={m.description}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="confirmar-campo">
                    <span>Esfuerzo</span>
                    <select className="select" value={esfuerzo} onChange={(e) => setEsfuerzo(e.target.value)}>
                      <option value="">Como viene (medio al escribir, alto al revisar)</option>
                      {ESFUERZOS.map((e) => (
                        <option key={e.id} value={e.id} title={e.nota}>
                          {e.nombre} — {e.nota}
                        </option>
                      ))}
                    </select>
                  </label>
                  {respuesta && (
                    <p className="text-dim confirmar-nota">
                      Coste estimado en la API: {respuesta.presupuesto.costeUsd.toFixed(2)} $ con {respuesta.presupuesto.modelo}.
                    </p>
                  )}
                </details>
              </>
            )}

            {error && <p className="confirmar-error">{error}</p>}
            </div>

            <div className="confirmar-botones">
              <button className="btn btn--ghost" onClick={cerrar}>
                Cancelar
              </button>
              <button className="btn btn--primary" disabled={!puedeGenerar} onClick={generar}>
                {modo === 'app' ? 'Generar para jugar con la app' : modo === 'papel' ? 'Generar para jugar en papel' : 'Generar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
