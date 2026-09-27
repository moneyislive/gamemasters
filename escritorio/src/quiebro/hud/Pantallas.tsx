/**
 * LAS PANTALLAS DE LA MESA: el menú de la noche (la reunión y la preparación), la pausa, el amanecer (el
 * recuento y el final), la noche interrumpida y la mesa cerrada. Lo que se decide con calma, encima de la
 * ciudad.
 *
 * ═══ LO QUE SE PINTA SALE DE LA VISTA Y DE LAS OPCIONES ═══
 *
 * Cada botón que MUEVE la mesa se ofrece sólo si `opciones()` del juego lo ofrece (`puerto.opciones`),
 * y manda exactamente esa opción: la regla de la casa (`verify:escritorio`, el catálogo que no miente)
 * es que el cliente no inventa movimientos. La excepción es la elección de la pausa, que lleva dos
 * cosas a la vez —el retoque y el voto— y se monta con los ofrecidos de la vista; el reductor la valida
 * igual.
 *
 * ═══ LA PAUSA: UN MOVIMIENTO POR ASIENTO, Y SE REINTENTA SEGÚN LA VISTA ═══
 *
 * «En la pausa, cada aparato reintenta solo ante un 409» (diseño §10). El puerto junta el 409 con el
 * «no» del juego en `'rechazado'`, así que manda la vista (`queHacerConLaEleccion` en `lectura.ts`):
 * tras cada vista nueva, si sigo sin constar como elegido en la MISMA pausa y el último intento no
 * entró, se manda otra vez, hasta tres.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { NOMBRES_DEL_QUIEBRO, IDS_DE_ESTILO, nombreDelNivel } from '../../../../shared/arcade/juegos/quiebro-nombres';
import type { IdDeEstilo, IdDeRetoque, IdDeVoto } from '../../../../shared/arcade/juegos/quiebro-nombres';
import type { VistaDelQuiebro } from '../../../../shared/arcade/juegos/quiebro-vista';
import { MOVIMIENTO_DEL_QUIEBRO } from '../../../../shared/arcade/juegos/quiebro-vista';
import { lizaDeLaMesa } from '../../../../shared/arcade/juegos/lizas';
import { QUIEBRO_DEL_DESVELADO } from '../../../../shared/arcade/juegos/quiebro-reglas';
import { numeroDelAsiento } from '../../../../shared/mecanicas/liza/declaracion';
import { UNO } from '../../../../shared/mecanicas/fijo';
import type { Opcion } from '../../../../shared/arcade';
import type { PuertoDeMesa, SalidaDelMovimiento } from '../contrato';
import type { RelojDeLaBajada } from '../red/bajada';
import { COLORES_DE_ASIENTO } from '../red/partida';
import { Boton } from './Boton';
import type { EleccionPendiente } from './lectura';
import { cifra, enLaPreparacion, etiquetaDeLaFase, loQueLeQueda, miIndice, queHacerConLaEleccion, queMandarAlBajar, quienesFaltanEnLaBajada, relojEnTexto, seVotaEnLaPausa } from './lectura';

/** El id del arcade en el registro. */
export const ID_DEL_QUIEBRO = 'quiebro';

/** Lo que cada estilo invita a hacer (diseño §3). Las cifras las da el reglamento, si se puede componer. */
const PAPEL_DEL_ESTILO: Readonly<Record<IdDeEstilo, string>> = {
  gabardina: 'Equilibrado. Todo terreno.',
  ligera: 'Quiebro largo y enganche lejano. Para entrar por la espalda.',
  mole: 'Más aguante y un Cierre que pesa. El cebo de la guardia.',
};

/** Lo que hace cada retoque (diseño §6.4). */
const EFECTO_DEL_RETOQUE: Readonly<Record<IdDeRetoque, string>> = {
  'paso-largo': 'El quiebro llega más lejos y aguanta un instante más.',
  'ventana-ancha': 'La ventana del quiebro limpio se ensancha 50 ms.',
  'replica-doble': 'La Réplica golpea dos veces.',
  'puno-de-plomo': 'Los empujones llegan más lejos y el estampado duele más.',
  iman: 'Enganchas más lejos y la acometida llega más.',
  enlace: 'Rescatas antes, y los dos ganáis Foco.',
};

/** Mueve y devuelve cómo acabó. */
export type Mover = (tipo: string, carga: unknown) => Promise<SalidaDelMovimiento>;

/** La opción que ofrece la mesa de un tipo (y, si se da, con esa carga), o `null`. */
export function laOpcion(opciones: readonly Opcion[], tipo: string, carga?: (c: unknown) => boolean): Opcion | null {
  return opciones.find((o) => o.tipo === tipo && (carga === undefined || carga(o.carga))) ?? null;
}

/** El nombre con que se enseña un asiento: «Tú» o «Desvelado n». */
function nombreDelAsiento(i: number, esMio: boolean): string {
  return esMio ? 'Tú' : `${NOMBRES_DEL_QUIEBRO.gente.desvelado} ${String(i + 1)}`;
}

function Muestra({ i }: { readonly i: number }): JSX.Element {
  return <span className="muestra" style={{ background: COLORES_DE_ASIENTO[i % COLORES_DE_ASIENTO.length] }} />;
}

/* ─────────────────────────── Los estilos ─────────────────────────── */

/**
 * Las cifras de cada estilo, compuestas con el reglamento DE VERDAD: se le pregunta a la liza cómo
 * quedaría mi asiento con cada estilo. Sin productor en el registro, no se inventan: no se enseñan.
 */
function cifrasDeLosEstilos(vista: VistaDelQuiebro, codigo: string, yo: string | null): Readonly<Partial<Record<IdDeEstilo, string>>> {
  const salida: Partial<Record<IdDeEstilo, string>> = {};
  if (yo === null) return salida;
  for (const id of IDS_DE_ESTILO) {
    const probada: VistaDelQuiebro = {
      ...vista,
      reglamento: { ...vista.reglamento, asientos: vista.reglamento.asientos.map((a) => (a.asiento === yo ? { ...a, estilo: id } : a)) },
    };
    let liza = null;
    try {
      liza = lizaDeLaMesa(ID_DEL_QUIEBRO, probada, codigo);
    } catch {
      liza = null;
    }
    if (liza === null) continue;
    const r = liza.asientos[numeroDelAsiento(liza, yo) - 1];
    if (r === undefined) continue;
    /*
     * El quiebro que se JUEGA, no el presupuesto: la liza declara lo que el quiebro puede desplazar con la
     * holgura que la sala admite encima (`QUIEBRO_DEL_DESVELADO.holguraMetros`, medio metro), y con ella la
     * tarjeta de la Gabardina decía 4,0 m donde el reglamento y el diseño dicen 3,5 (y 5,5 con el Paso
     * largo, donde el diseño dice 5).
     */
    const quiebro = (r.esquiva.puesta.distanciaExtra / UNO - QUIEBRO_DEL_DESVELADO.holguraMetros).toFixed(1).replace('.', ',');
    salida[id] = `${NOMBRES_DEL_QUIEBRO.cuentas.aguante} ${String(r.cuerpo.vidaTope)} · ${NOMBRES_DEL_QUIEBRO.quiebros.quiebro} ${quiebro} m`;
  }
  return salida;
}

/** La elección del menú de la noche: qué estilo se quiere, y cuáles se pueden querer. */
export interface EleccionDelEstilo {
  readonly querido: IdDeEstilo | null;
  readonly alQuerer: (id: IdDeEstilo) => void;
  readonly admite: (id: IdDeEstilo) => boolean;
}

/**
 * LAS TARJETAS DE LOS ESTILOS. Con `eleccion` (el menú de la noche) cada una sólo MARCA el estilo
 * querido, sin mandar nada: lo manda BAJAR, en la Bajada, que es donde el reductor lo admite. Con
 * `mover`, cada una manda su `estilo` si la mesa lo ofrece. Sin ninguno de los dos sólo se enseñan.
 */
export function Estilos({
  vista,
  codigo,
  yo,
  opciones,
  mover,
  eleccion,
}: {
  vista: VistaDelQuiebro;
  codigo: string;
  yo: string | null;
  opciones: readonly Opcion[];
  mover: Mover | null;
  eleccion?: EleccionDelEstilo;
}): JSX.Element {
  const i = miIndice(vista, yo);
  const actual = i >= 0 ? vista.reglamento.asientos[i]?.estilo : undefined;
  const cifras = useMemo(() => cifrasDeLosEstilos(vista, codigo, yo), [vista, codigo, yo]);
  const sePuede = mover !== null && laOpcion(opciones, MOVIMIENTO_DEL_QUIEBRO.estilo) !== null;
  if (eleccion !== undefined) {
    const querido = eleccion.querido ?? actual;
    return (
      <div className="q-fila">
        {IDS_DE_ESTILO.map((id) => (
          <Boton key={id} clase="q-tarjeta" elegido={querido === id} desactivado={i < 0 || !eleccion.admite(id)} alPulsar={() => eleccion.alQuerer(id)}>
            <span className="nombre">{NOMBRES_DEL_QUIEBRO.estilos[id]}</span>
            <span className="detalle">{PAPEL_DEL_ESTILO[id]}</span>
            {cifras[id] !== undefined ? <span className="cifras">{cifras[id]}</span> : null}
          </Boton>
        ))}
      </div>
    );
  }
  if (mover === null) {
    return (
      <div className="q-fila">
        {IDS_DE_ESTILO.map((id) => (
          <div key={id} className={actual === id ? 'q-tarjeta elegida' : 'q-tarjeta'} aria-disabled="true">
            <span className="nombre">{NOMBRES_DEL_QUIEBRO.estilos[id]}</span>
            <span className="detalle">{PAPEL_DEL_ESTILO[id]}</span>
            {cifras[id] !== undefined ? <span className="cifras">{cifras[id]}</span> : null}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="q-fila">
      {IDS_DE_ESTILO.map((id) => (
        <Boton
          key={id}
          clase="q-tarjeta"
          elegido={actual === id}
          desactivado={!sePuede || i < 0}
          alPulsar={() => {
            if (actual !== id && sePuede) void mover(MOVIMIENTO_DEL_QUIEBRO.estilo, { id });
          }}
        >
          <span className="nombre">{NOMBRES_DEL_QUIEBRO.estilos[id]}</span>
          <span className="detalle">{PAPEL_DEL_ESTILO[id]}</span>
          {cifras[id] !== undefined ? <span className="cifras">{cifras[id]}</span> : null}
        </Boton>
      ))}
    </div>
  );
}

/* ─────────────────────────── El menú de la noche ─────────────────────────── */

export interface PropsDelMenuDeLaNoche {
  readonly vista: VistaDelQuiebro | null;
  readonly puerto: PuertoDeMesa;
  readonly mover: Mover;
  /** ¿Ya se tocó BAJAR en este aparato? (el toque que desbloquea el sonido, diseño §2.1 y §9). */
  readonly bajado: boolean;
  readonly alBajar: () => void;
  /** El nombre del sitio de la noche (la plaza o el barrio), o `null` si aún no se sabe. */
  readonly rotulo: string | null;
  readonly bajada: RelojDeLaBajada;
  /** En el modo de prueba, la dirección con que otra pestaña se sienta en ESTA mesa. */
  readonly enlaceParaEntrar?: string;
}

/**
 * EL MENÚ DE LA NOCHE: la azotea, la reunión y la preparación en UNA pantalla (26-sep, lo pidió
 * Miguel: eran tres seguidas, y la del medio enseñaba estilos que no se podían elegir).
 *
 * Se elige el estilo aquí mismo y un solo BAJAR hace lo que hacían los tres botones: desbloquea el
 * sonido, EMPIEZA la noche si la mesa aún se reúne (y la cierra: nadie más se sienta), y, al llegar la
 * Bajada, manda el estilo querido o LISTO (`queMandarAlBajar` en `lectura.ts`). Las fases de la mesa no
 * cambian: el aparato encadena los movimientos por su cuenta, y cada uno es una opción que la mesa
 * ofrece, tal cual.
 *
 * EL ENCADENADO SE MIRA CON CADA VISTA. Tras pulsar BAJAR, cada vista nueva (otra `rev`) vuelve a
 * preguntar qué toca mandar; si un movimiento no entró (un 409 porque el aprendiz de la primera noche se
 * mandó a la vez), se reintenta con la vista siguiente y no antes, así que no hay bucle. Cuando la mesa
 * me da por listo, este menú deja paso al rótulo de la Bajada, que espera a los demás.
 *
 * A quien llega con la noche ya en marcha (o a una mesa acabada) no se le ofrece estilo: BAJAR sólo
 * desbloquea el sonido y le deja en la calle.
 */
export function MenuDeLaNoche({ vista, puerto, mover, bajado, alBajar, rotulo, bajada, enlaceParaEntrar }: PropsDelMenuDeLaNoche): JSX.Element {
  /* El reloj de la Bajada se repinta solo: la vista no cambia mientras corre. */
  const [, repintar] = useState(0);
  useEffect(() => {
    const id = setInterval(() => repintar((n) => (n + 1) % 1_000_000), 250);
    return () => clearInterval(id);
  }, []);
  const [querido, ponerQuerido] = useState<IdDeEstilo | null>(null);
  const [pedido, ponerPedido] = useState(false);
  const [copiado, ponerCopiado] = useState(false);
  /* Cada respuesta de la mesa vuelve a mirar qué toca: una vista que llega mientras se manda no se pierde. */
  const [vuelta, ponerVuelta] = useState(0);
  const enviando = useRef(false);
  const revDelUltimo = useRef<number | null>(null);

  const f = vista?.fase.tipo ?? null;
  const preparando = vista !== null && (f === 'reunion' || (f === 'bajada' && enLaPreparacion(vista, puerto.yo)));
  const i = vista === null ? -1 : miIndice(vista, puerto.yo);
  const actual = vista !== null && i >= 0 ? (vista.reglamento.asientos[i]?.estilo ?? null) : null;
  const estilo = querido ?? actual;

  const intentar = (): void => {
    if (vista === null || enviando.current) return;
    const op = queMandarAlBajar(vista, puerto.yo, puerto.opciones, estilo);
    if (op === null) return;
    enviando.current = true;
    revDelUltimo.current = puerto.rev;
    void mover(op.tipo, op.carga).finally(() => {
      enviando.current = false;
      ponerVuelta((n) => (n + 1) % 1_000_000);
    });
  };
  useEffect(() => {
    if (!pedido || revDelUltimo.current === puerto.rev) return;
    intentar();
    // `intentar` lee lo de este mismo repintado; lo que cambia la decisión va en las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido, vista, puerto.rev, vuelta]);

  const alPulsarBajar = (): void => {
    if (!bajado) alBajar();
    if (!preparando) return;
    ponerPedido(true);
    intentar();
  };

  /*
   * En la Bajada, un estilo que no es el mío sólo se puede querer si la mesa lo ofrece (uno por tramo,
   * `puedeCambiarDeEstilo`): una tarjeta que se deja marcar y luego baja con otro estilo mentiría. En la
   * reunión todos: el primer cambio de la noche siempre se admite.
   */
  const eleccion: EleccionDelEstilo = {
    querido: estilo,
    alQuerer: (id) => {
      if (!pedido) ponerQuerido(id);
    },
    admite: (id) =>
      !pedido &&
      (f !== 'bajada' || id === actual || laOpcion(puerto.opciones, MOVIMIENTO_DEL_QUIEBRO.estilo, (c) => (c as { readonly id?: unknown } | null)?.id === id) !== null),
  };

  const quedaMs = f === 'bajada' ? bajada.quedaMs(performance.now()) : null;
  const faltan = vista === null ? [] : quienesFaltanEnLaBajada(vista);
  const r = vista?.reglamento ?? null;
  const detalle =
    f === 'bajada' && r !== null
      ? [
          rotulo,
          `${NOMBRES_DEL_QUIEBRO.cuentas.nivel} ${nombreDelNivel(r.nivel)}`,
          r.averia === 'ninguna' ? null : NOMBRES_DEL_QUIEBRO.averias[r.averia],
          r.contramedida === 'ninguna' ? null : `${NOMBRES_DEL_QUIEBRO.cuentas.memoria}: ${NOMBRES_DEL_QUIEBRO.contramedidas[r.contramedida]}`,
        ].filter((x): x is string => x !== null)
      : [];
  const nota = !preparando
    ? vista === null
      ? null
      : 'La noche de esta mesa ya está en marcha: bajas directamente a la calle.'
    : f === 'reunion'
      ? 'Al bajar empieza la noche, y la mesa se cierra: nadie más se sienta hasta la siguiente.'
      : faltan.length > 1 || (faltan.length === 1 && faltan[0] !== i)
        ? `Esperando a: ${faltan
            .filter((k) => k !== i)
            .map((k) => nombreDelAsiento(k, false))
            .join(', ')}. Si no, a la calle cuando se acabe el reloj.`
        : null;

  return (
    <div className="q-pantalla q-menu-noche">
      <div className="q-hoja q-panel">
        <div className="cabeza">
          <div className="nombre-del-juego q-rotulo-neon">{NOMBRES_DEL_QUIEBRO.juego.nombre}</div>
          <div className="frase">{NOMBRES_DEL_QUIEBRO.juego.cabeFrase}</div>
        </div>
        {f === 'bajada' ? (
          <div className="lugar">
            <span className="q-titulo">{detalle.join(' · ')}</span>
            {quedaMs !== null ? <span className={quedaMs < 5000 ? 'reloj aprieta' : 'reloj'}>{relojEnTexto(quedaMs)}</span> : null}
          </div>
        ) : null}
        {vista !== null && preparando && i >= 0 ? (
          <>
            <h2>Tu estilo</h2>
            <Estilos vista={vista} codigo={puerto.codigo} yo={puerto.yo} opciones={puerto.opciones} mover={null} eleccion={eleccion} />
          </>
        ) : null}
        {vista !== null && vista.asientos.length > 0 ? (
          <div className="q-fila" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="q-asientos">
              {vista.asientos.map((a, k) => (
                <div key={a.asiento} className={f === 'bajada' && a.haElegido ? 'q-asiento listo' : a.ausente ? 'q-asiento ausente' : 'q-asiento'}>
                  <Muestra i={k} />
                  {nombreDelAsiento(k, k === i)} · {NOMBRES_DEL_QUIEBRO.estilos[k === i && estilo !== null ? estilo : (vista.reglamento.asientos[k]?.estilo ?? 'gabardina')]}
                  {f === 'bajada' ? ` · ${a.haElegido ? 'listo' : a.ausente ? NOMBRES_DEL_QUIEBRO.estados.ausente.toLowerCase() : 'eligiendo…'}` : ''}
                </div>
              ))}
            </div>
            {f === 'reunion' ? (
              <div>
                <div className="q-titulo">Mesa</div>
                <div className="q-codigo-mesa">{puerto.codigo}</div>
              </div>
            ) : null}
          </div>
        ) : null}
        {f === 'reunion' && enlaceParaEntrar !== undefined ? (
          <div className="q-enlace">
            <span className="q-nota">Para jugar a dos en este navegador, abre esto en otra pestaña: se sienta en esta mesa.</span>
            <code>{enlaceParaEntrar}</code>
            <Boton
              clase="q-boton secundario"
              alPulsar={() => {
                void navigator.clipboard?.writeText(enlaceParaEntrar).then(
                  () => ponerCopiado(true),
                  () => ponerCopiado(false),
                );
              }}
            >
              {copiado ? 'Copiado' : 'Copiar'}
            </Boton>
          </div>
        ) : null}
        <div className="q-fila derecha" style={{ alignItems: 'center' }}>
          {nota !== null ? <span className="q-nota">{nota}</span> : null}
          <Boton clase="q-boton principal" desactivado={bajado && (!preparando || pedido)} alPulsar={alPulsarBajar}>
            {pedido ? 'Bajando…' : NOMBRES_DEL_QUIEBRO.mesa.bajar}
          </Boton>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── La pausa ─────────────────────────── */

export interface PropsDeLaPausa {
  readonly vista: VistaDelQuiebro;
  readonly puerto: PuertoDeMesa;
  readonly mover: Mover;
  /** Cuándo vence el reloj de la pausa (ms de `performance.now()`), o `null`. */
  readonly relojHastaMs: number | null;
}

export function Pausa({ vista, puerto, mover, relojHastaMs }: PropsDeLaPausa): JSX.Element {
  /* El reloj de la pausa se repinta solo, cuatro veces por segundo: la vista no cambia mientras corre. */
  const [, repintar] = useState(0);
  useEffect(() => {
    const id = setInterval(() => repintar((n) => (n + 1) % 1_000_000), 250);
    return () => clearInterval(id);
  }, []);
  const quedaMs = loQueLeQueda(relojHastaMs, performance.now());
  const i = miIndice(vista, puerto.yo);
  const mio = i >= 0 ? vista.asientos[i] : undefined;
  const oleada = vista.fase.tipo === 'pausa' ? vista.fase.oleada : 0;
  const vota = seVotaEnLaPausa(vista);
  const [retoque, ponerRetoque] = useState<IdDeRetoque | null>(null);
  const [voto, ponerVoto] = useState<IdDeVoto | null>(null);
  const [pendiente, ponerPendiente] = useState<EleccionPendiente | null>(null);
  const enviando = useRef(false);

  /* Otra pausa: lo elegido en la anterior no vale aquí. */
  useEffect(() => {
    ponerRetoque(null);
    ponerVoto(null);
    ponerPendiente(null);
  }, [oleada]);

  const mandar = (p: EleccionPendiente): void => {
    if (enviando.current) return;
    enviando.current = true;
    void mover(MOVIMIENTO_DEL_QUIEBRO.elegir, { retoque: p.retoque, voto: p.voto }).then((salida) => {
      enviando.current = false;
      ponerPendiente((antes) => (antes === null || antes.oleada !== p.oleada ? antes : { ...antes, intentos: p.intentos, ultimo: salida }));
    });
  };

  /* Con cada vista nueva se decide si la elección entró o hay que reintentarla. */
  useEffect(() => {
    if (pendiente === null) return;
    const que = queHacerConLaEleccion(vista, puerto.rev, puerto.yo, pendiente);
    if (que === 'reintentar') {
      const otra = { ...pendiente, intentos: pendiente.intentos + 1, rev: puerto.rev, ultimo: null };
      ponerPendiente(otra);
      mandar(otra);
    } else if (que === 'abandonar' || que === 'hecho') ponerPendiente(null);
    // `mandar` sólo usa lo que ya está en las dependencias o en referencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, pendiente?.ultimo]);

  const listo = retoque !== null && (!vota || voto !== null);
  const confirmar = (): void => {
    if (!listo || retoque === null || mio === undefined || mio.haElegido) return;
    const p: EleccionPendiente = { oleada, retoque, voto: vota ? voto : null, intentos: 1, rev: puerto.rev, ultimo: null };
    ponerPendiente(p);
    mandar(p);
  };

  const elegidos = vista.asientos.filter((a) => a.haElegido).length;
  return (
    <div className="q-pantalla clara">
      <div className="q-hoja q-panel">
        <div className="q-fila" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <h2>{etiquetaDeLaFase(vista)}</h2>
            <h1>{NOMBRES_DEL_QUIEBRO.mesa.elegirRetoque}</h1>
          </div>
          {quedaMs !== null ? <div className="q-codigo-mesa">{relojEnTexto(quedaMs)}</div> : null}
        </div>
        {mio === undefined ? (
          <p>Miras esta mesa sin asiento.</p>
        ) : mio.haElegido ? (
          <p>
            Hecho. Esperando a los demás ({String(elegidos)} de {String(vista.asientos.length)}).
          </p>
        ) : (
          <>
            <div className="q-fila">
              {mio.ofrecidos.map((id) => (
                <Boton key={id} clase="q-tarjeta" elegido={retoque === id} alPulsar={() => ponerRetoque(id)}>
                  <span className="nombre">{NOMBRES_DEL_QUIEBRO.retoques[id]}</span>
                  <span className="detalle">{EFECTO_DEL_RETOQUE[id]}</span>
                </Boton>
              ))}
            </div>
            {vota ? (
              <>
                <h2>¿La cabina ya, o una oleada más?</h2>
                <div className="q-fila">
                  <Boton clase="q-tarjeta" elegido={voto === 'llamar'} alPulsar={() => ponerVoto('llamar')}>
                    <span className="nombre">{NOMBRES_DEL_QUIEBRO.votos.llamar}</span>
                    <span className="detalle">La Llamada suena ahora. Las esquirlas sólo valen si salís.</span>
                  </Boton>
                  <Boton clase="q-tarjeta" elegido={voto === 'aguantar'} alPulsar={() => ponerVoto('aguantar')}>
                    <span className="nombre">{NOMBRES_DEL_QUIEBRO.votos.aguantar}</span>
                    <span className="detalle">Una oleada de propina: más Celadores, más esquirlas, más riesgo.</span>
                  </Boton>
                </div>
              </>
            ) : null}
            <div className="q-fila derecha" style={{ alignItems: 'center' }}>
              {pendiente !== null && pendiente.intentos > 1 ? <span className="q-nota aviso">Reintentando ({String(pendiente.intentos)})…</span> : null}
              <Boton clase="q-boton principal" desactivado={!listo || pendiente !== null} alPulsar={confirmar}>
                Confirmar
              </Boton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── El amanecer: el recuento y el final ─────────────────────────── */

export interface PropsDelRecuento {
  readonly vista: VistaDelQuiebro;
  readonly puerto: PuertoDeMesa;
  readonly mover: Mover;
  /** Dejar la mesa: en la Sala, levantarse y volver al vestíbulo; en la app, volver a ella. */
  readonly alOtraMesa: () => void;
}

/**
 * EL AMANECER (26-sep, rehecho porque «la experiencia no es muy buena»): antes el final ofrecía de
 * golpe los estilos, «Otra mesa», «Cerrar la mesa» y «Otra noche», y cerrar llevaba a una pantalla de
 * mesa cerrada y de ahí a la mesa de la Sala, con su «Tirar la mesa». Ahora son DOS salidas, y las dos
 * se quedan en el juego o salen del todo:
 *
 *   · OTRA NOCHE (la principal): la misma mesa, a la Bajada de la noche siguiente, que abre otra vez el
 *     menú de la noche con los estilos. Se ofrece ya en el recuento: los 20 s del amanecer son para
 *     mirar, pero quien quiera seguir no espera (`opcionesDeLaMesa`).
 *   · SALIR: deja la mesa (`alOtraMesa`), sin pasar por la mesa cerrada ni por el plano.
 *
 * El estilo ya no se elige aquí: se elige en el menú de la noche, que es donde se elige siempre.
 */
export function Recuento({ vista, puerto, mover, alOtraMesa }: PropsDelRecuento): JSX.Element {
  const [yendo, ponerYendo] = useState(false);
  const i = miIndice(vista, puerto.yo);
  const f = vista.fase;
  const ultima = vista.historial[vista.historial.length - 1];
  const resultado = f.tipo === 'recuento' ? f.resultado : (ultima?.resultado ?? null);
  const gana = resultado === 'ganada';
  const otraNoche = laOpcion(puerto.opciones, MOVIMIENTO_DEL_QUIEBRO.otraNoche);
  const titulos = ultima !== undefined && vista.noche !== null && ultima.noche === vista.noche.numero ? ultima.titulos : [];
  const pedirOtraNoche = async (): Promise<void> => {
    if (otraNoche === null || yendo) return;
    ponerYendo(true);
    try {
      await mover(otraNoche.tipo, otraNoche.carga);
    } finally {
      ponerYendo(false);
    }
  };
  return (
    <div className="q-pantalla q-amanecer">
      <div className="q-hoja q-panel">
        <div className="cabeza">
          <h2>
            {NOMBRES_DEL_QUIEBRO.fases.amanecer} · {NOMBRES_DEL_QUIEBRO.cuentas.noche} {String(vista.noche?.numero ?? '')}
          </h2>
          {resultado !== null ? <div className={gana ? 'q-resultado gana' : 'q-resultado pierde'}>{NOMBRES_DEL_QUIEBRO.resultados[resultado]}</div> : null}
          {resultado !== null && !gana ? <p>{NOMBRES_DEL_QUIEBRO.pantalla.ciudadSeReinicia}.</p> : null}
        </div>
        <table className="q-tabla">
          <thead>
            <tr>
              <th />
              <th className="cifra">{NOMBRES_DEL_QUIEBRO.cuentas.puntos}</th>
              <th className="cifra">Limpios</th>
              <th className="cifra">Desalojos</th>
              <th className="cifra">Rescates</th>
              <th className="cifra">{NOMBRES_DEL_QUIEBRO.cuentas.esquirlas}</th>
            </tr>
          </thead>
          <tbody>
            {vista.asientos.map((a, k) => (
              <tr key={a.asiento} className={k === i ? 'mia' : ''}>
                <td>
                  <Muestra i={k} /> {nombreDelAsiento(k, k === i)}
                </td>
                <td className="cifra">{cifra(a.puntos)}</td>
                <td className="cifra">{a.contadores.limpios}</td>
                <td className="cifra">{a.contadores.desalojos}</td>
                <td className="cifra">{a.contadores.rescates}</td>
                <td className="cifra">{a.contadores.esquirlasCobradas}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {titulos.length > 0 ? (
          <div className="q-titulos">
            {titulos.map((t) => {
              const k = vista.asientos.findIndex((a) => a.asiento === t.asiento);
              return (
                <div key={t.titulo} className="titulo">
                  <b>{NOMBRES_DEL_QUIEBRO.titulos[t.titulo]}</b>
                  {nombreDelAsiento(k, k === i)}
                </div>
              );
            })}
          </div>
        ) : null}
        {vista.mejorNoche !== null ? (
          <p>
            {NOMBRES_DEL_QUIEBRO.cuentas.mejorNoche}: {nombreDelAsiento(vista.asientos.findIndex((a) => a.asiento === vista.mejorNoche?.asiento), vista.mejorNoche.asiento === puerto.yo)},{' '}
            {cifra(vista.mejorNoche.puntos)} ({NOMBRES_DEL_QUIEBRO.cuentas.noche.toLowerCase()} {String(vista.mejorNoche.noche)})
          </p>
        ) : null}
        <div className="q-fila derecha" style={{ alignItems: 'center' }}>
          {otraNoche === null && f.tipo === 'final' && i >= 0 ? <span className="q-nota">Esta mesa ya ha jugado todas sus noches.</span> : null}
          <Boton clase="q-boton secundario" alPulsar={alOtraMesa}>
            Salir
          </Boton>
          {otraNoche !== null ? (
            <Boton clase="q-boton principal" desactivado={yendo} alPulsar={() => void pedirOtraNoche()}>
              {NOMBRES_DEL_QUIEBRO.mesa.otraNoche}
            </Boton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── La noche interrumpida y la mesa cerrada ─────────────────────────── */

export function Interrumpida({ puerto, mover }: { readonly puerto: PuertoDeMesa; readonly mover: Mover }): JSX.Element {
  const reanudar = laOpcion(puerto.opciones, MOVIMIENTO_DEL_QUIEBRO.reanudar);
  const rendirse = laOpcion(puerto.opciones, MOVIMIENTO_DEL_QUIEBRO.rendirse);
  return (
    <div className="q-pantalla">
      <div className="q-hoja q-panel" style={{ maxWidth: 560 }}>
        <h2>{NOMBRES_DEL_QUIEBRO.fases.interrumpida}</h2>
        <h1>La calle se ha quedado quieta</h1>
        <p>Nadie jugaba y el Sistema paró la noche. Se reanuda desde el principio de la oleada, con lo que llevabais al empezarla.</p>
        <div className="q-fila derecha">
          <Boton clase="q-boton secundario" desactivado={rendirse === null} alPulsar={() => rendirse !== null && void mover(rendirse.tipo, rendirse.carga)}>
            {NOMBRES_DEL_QUIEBRO.mesa.rendirse}
          </Boton>
          <Boton clase="q-boton principal" desactivado={reanudar === null} alPulsar={() => reanudar !== null && void mover(reanudar.tipo, reanudar.carga)}>
            {NOMBRES_DEL_QUIEBRO.mesa.reanudar}
          </Boton>
        </div>
      </div>
    </div>
  );
}

export function Cerrada({ alSalir }: { readonly alSalir: (() => void) | undefined }): JSX.Element {
  return (
    <div className="q-pantalla">
      <div className="q-hoja q-panel" style={{ maxWidth: 480 }}>
        <h1>{NOMBRES_DEL_QUIEBRO.fases.cerrada}</h1>
        <p>La noche ha terminado para esta mesa.</p>
        {alSalir !== undefined ? (
          <div className="q-fila derecha">
            <Boton clase="q-boton" alPulsar={() => alSalir()}>
              Salir
            </Boton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ─────────────────────────── La Bajada: la preparación ─────────────────────────── */

export interface PropsDeLaBajada {
  readonly vista: VistaDelQuiebro;
  readonly rotulo: string | null;
  readonly puerto: PuertoDeMesa;
  readonly mover: Mover;
  readonly bajada: RelojDeLaBajada;
}

/**
 * LA BAJADA ES LA PREPARACIÓN (`quiebro.ts`): hasta 15 s para elegir estilo o decir BAJAR, que es el
 * movimiento `listo` («me quedo con el mío»); elegir estilo también cuenta como listo. Con todos listos,
 * la mesa acorta el reloj al de la caída y la cámara cae (`red/bajada.ts`).
 *
 * Aquí se enseña lo que hace falta para decidir en esos segundos: el reloj de verdad (el de la vista,
 * no seis segundos supuestos), los estilos y BAJAR mientras la mesa los ofrezca a este asiento, y quién
 * falta. Tras decir que está listo, la mesa ya no le ofrece nada: se dice «listo» y con qué estilo baja,
 * y se espera a los demás con el reloj delante.
 */
export function RotuloDeLaBajada({ vista, rotulo, puerto, mover, bajada }: PropsDeLaBajada): JSX.Element {
  /* El reloj se repinta solo: la vista no cambia mientras corre. */
  const [, repintar] = useState(0);
  useEffect(() => {
    const id = setInterval(() => repintar((n) => (n + 1) % 1_000_000), 250);
    return () => clearInterval(id);
  }, []);
  const [yendo, ponerYendo] = useState(false);
  const r = vista.reglamento;
  const detalle = [
    `${NOMBRES_DEL_QUIEBRO.cuentas.nivel} ${nombreDelNivel(r.nivel)}`,
    r.averia === 'ninguna' ? null : NOMBRES_DEL_QUIEBRO.averias[r.averia],
    r.contramedida === 'ninguna' ? null : `${NOMBRES_DEL_QUIEBRO.cuentas.memoria}: ${NOMBRES_DEL_QUIEBRO.contramedidas[r.contramedida]}`,
  ].filter((x): x is string => x !== null);
  const quedaMs = bajada.quedaMs(performance.now());
  const i = miIndice(vista, puerto.yo);
  const mio = i >= 0 ? vista.asientos[i] : undefined;
  const miEstilo = i >= 0 ? (r.asientos[i]?.estilo ?? null) : null;
  const listo = laOpcion(puerto.opciones, MOVIMIENTO_DEL_QUIEBRO.listo);
  const faltan = quienesFaltanEnLaBajada(vista);
  const todos = faltan.length === 0;
  const decirListo = async (): Promise<void> => {
    if (listo === null || yendo) return;
    ponerYendo(true);
    try {
      await mover(listo.tipo, listo.carga);
    } finally {
      ponerYendo(false);
    }
  };
  return (
    <div className="q-bajada">
      <div className="barrio q-rotulo-neon">{rotulo ?? NOMBRES_DEL_QUIEBRO.fases.bajada}</div>
      <div className="detalle">{detalle.join(' · ')}</div>
      <div className="q-preparacion q-panel">
        <div className="cabeza">
          <span className="q-titulo">{todos ? 'Todos listos: a la calle' : 'Preparación'}</span>
          {quedaMs !== null ? <span className={quedaMs < 5000 ? 'reloj aprieta' : 'reloj'}>{relojEnTexto(quedaMs)}</span> : null}
        </div>
        {mio === undefined ? (
          <p className="q-nota">Miras esta mesa sin asiento.</p>
        ) : mio.haElegido ? (
          <p className="listo">
            Listo: bajas con la <b>{miEstilo === null ? '' : NOMBRES_DEL_QUIEBRO.estilos[miEstilo]}</b>.
          </p>
        ) : (
          <>
            {laOpcion(puerto.opciones, MOVIMIENTO_DEL_QUIEBRO.estilo) !== null ? (
              <div className="q-bajada-estilos">
                <Estilos vista={vista} codigo={puerto.codigo} yo={puerto.yo} opciones={puerto.opciones} mover={mover} />
              </div>
            ) : null}
            <div className="q-fila derecha" style={{ alignItems: 'center' }}>
              <span className="q-nota">
                Elegir otro estilo ya es estar listo. O baja con la {miEstilo === null ? 'tuya' : NOMBRES_DEL_QUIEBRO.estilos[miEstilo]}:
              </span>
              <Boton clase="q-boton principal" desactivado={listo === null || yendo} alPulsar={() => void decirListo()}>
                {NOMBRES_DEL_QUIEBRO.mesa.bajar}
              </Boton>
            </div>
          </>
        )}
        <div className="q-asientos">
          {vista.asientos.map((a, k) => (
            <div key={a.asiento} className={a.haElegido ? 'q-asiento listo' : a.ausente ? 'q-asiento ausente' : 'q-asiento'}>
              <Muestra i={k} />
              {nombreDelAsiento(k, k === i)} · {NOMBRES_DEL_QUIEBRO.estilos[r.asientos[k]?.estilo ?? 'gabardina']} ·{' '}
              {a.haElegido ? 'listo' : a.ausente ? NOMBRES_DEL_QUIEBRO.estados.ausente.toLowerCase() : 'eligiendo…'}
            </div>
          ))}
        </div>
        {!todos ? (
          <p className="q-nota">
            {faltan.length > 1 ? 'Faltan' : 'Falta'}: {faltan.map((k) => nombreDelAsiento(k, k === i)).join(', ')}. Si no, a la calle cuando se acabe el reloj.
          </p>
        ) : null}
      </div>
    </div>
  );
}
