/**
 * EL HUD ENTERO: qué pantalla toca en cada fase, y lo que está siempre (el menú, el marcador, BAJAR,
 * «gira el teléfono» y el aviso del silencio del iPhone).
 *
 * ═══ QUÉ SE ENSEÑA EN CADA FASE ═══
 *
 *   reunión ........ el menú de la noche: el estilo, quién se sienta, el código de la mesa y BAJAR
 *   bajada ......... el menú de la noche mientras no esté listo; luego, el rótulo y quién falta
 *   oleada, llamada  la pelea (`Combate.tsx`) y los mandos
 *   pausa .......... la pelea detrás y la elección del retoque (y el voto) delante
 *   recuento, final  el amanecer: el recuento, OTRA NOCHE y SALIR
 *   interrumpida ... Reanudar o Rendirse
 *   cerrada ........ la mesa cerrada
 *
 * ═══ EL MAPA, EN LA CIUDAD ABIERTA ═══
 *
 * Si la noche se juega en la ciudad (`red/lugar.ts`), en la pelea y en la pausa van además el minimapa
 * (`Minimapa.tsx`, arriba a la izquierda bajo el menú), el botón PLANO bajo AVISO y el plano entero
 * (`Plano.tsx`, que se abre con el botón, tocando el minimapa o con la M), leyendo el mapa VIVO de la
 * partida (`red/orientarse.ts`). En el barrio no: cabe entero en la pantalla y no hay nada que buscar.
 *
 * Antes que todo eso, UNA VEZ por montaje: BAJAR, en el menú de la noche (`MenuDeLaNoche`), que hasta el
 * 26-sep era una azotea aparte. Ese toque desbloquea el audio (diseño §2.1, §9: el navegador no deja
 * sonar hasta que la persona toca algo), y es también cuando se avisa, la primera vez en un iPhone, de
 * que el interruptor de silencio calla los golpes.
 */
import { useCallback, useEffect, useState } from 'react';
import type { JSX, MutableRefObject } from 'react';
import type { Camera } from 'three';
import { NOMBRES_DEL_QUIEBRO } from '../../../../shared/arcade/juegos/quiebro-nombres';
import type { VistaDelQuiebro } from '../../../../shared/arcade/juegos/quiebro-vista';
import { MOVIMIENTO_DEL_QUIEBRO } from '../../../../shared/arcade/juegos/quiebro-vista';
import type { PuertoDeMesa } from '../contrato';
import type { EstadoDeLosMandos } from '../mandos/estado';
import type { RelojDeLaBajada } from '../red/bajada';
import type { Escenificador } from '../red/escenificar';
import type { Partida } from '../red/partida';
import { COLORES_DE_ASIENTO } from '../red/partida';
import type { Sonido } from '../sonido';
import { Boton } from './Boton';
import { Combate } from './Combate';
import { Minimapa } from './Minimapa';
import { BotonDelPlano, Plano, usarLaTeclaDelPlano } from './Plano';
import type { FuenteDelMapa, OrdenesDelMapa } from '../orientacion';
import { cifra, enLaPreparacion, miIndice } from './lectura';
import type { Mover } from './Pantallas';
import { Cerrada, Interrumpida, laOpcion, MenuDeLaNoche, Pausa, Recuento, RotuloDeLaBajada } from './Pantallas';

export interface PropsDelHud {
  readonly vista: VistaDelQuiebro | null;
  readonly puerto: PuertoDeMesa;
  readonly partida: Partida | null;
  readonly escena: Escenificador | null;
  readonly mandos: EstadoDeLosMandos;
  readonly sonido: Sonido;
  readonly mover: Mover;
  readonly bajado: boolean;
  readonly alBajar: () => void;
  readonly primeraNoche: boolean;
  readonly rotuloDelBarrio: string | null;
  /** Un rótulo de fase que dura un momento («Vienen más», «Suena una cabina»). */
  readonly rotuloDeFase: string | null;
  readonly marcador: boolean;
  readonly alMarcador: (abierto: boolean) => void;
  readonly menu: boolean;
  readonly alMenu: (abierto: boolean) => void;
  readonly zurdo: boolean;
  readonly alZurdo: (zurdo: boolean) => void;
  readonly tactil: boolean;
  readonly alSalir: (() => void) | undefined;
  readonly alOtraMesa: () => void;
  readonly avisoDelSilencio: boolean;
  /** El reloj de la Bajada (lo que le queda, la caída). */
  readonly bajada: RelojDeLaBajada;
  /** La cámara del lienzo, para los rótulos encima de los cuerpos. */
  readonly ojo: MutableRefObject<Camera | null>;
  /** En el modo de prueba, la dirección con que otra pestaña se sienta en esta mesa. */
  readonly enlaceParaEntrar?: string;
  /** El mapa vivo de la partida (`red/orientarse.ts`), o `null` sin partida. */
  readonly mapa: (FuenteDelMapa & OrdenesDelMapa) | null;
  /** ¿Se juega en la ciudad abierta? (el minimapa y el plano sólo van en ella). */
  readonly enLaCiudad: boolean;
}

export function Hud(p: PropsDelHud): JSX.Element {
  const v = p.vista;
  const [plano, ponerPlano] = useState(false);
  const alternarElPlano = useCallback(() => ponerPlano((a) => !a), []);
  const cerrarElPlano = useCallback(() => ponerPlano(false), []);
  const f0 = v?.fase.tipo ?? null;
  const conMapa = p.bajado && p.enLaCiudad && p.mapa !== null && (f0 === 'oleada' || f0 === 'llamada' || f0 === 'pausa');
  usarLaTeclaDelPlano(alternarElPlano, conMapa && !p.menu);
  /* Fuera de la pelea y de la pausa el plano se cierra: al volver a la calle no aparece abierto. */
  useEffect(() => {
    if (!conMapa) ponerPlano(false);
  }, [conMapa]);
  /* Abrir el plano (la M, su botón o el minimapa) quita la mano del juego: una carga del rayo se deja sin disparar. */
  const { mandos } = p;
  useEffect(() => {
    if (plano) mandos.cancelarRayo();
  }, [plano, mandos]);
  /*
   * EL MENÚ DE LA NOCHE va en su propio hueco, el primero, y lo demás en el segundo: así sigue montado
   * (con el estilo querido y el BAJAR pedido) al pasar la mesa de la reunión a la Bajada.
   */
  const enMenu = !p.bajado || (v !== null && enLaPreparacion(v, p.puerto.yo));
  if (!enMenu && v === null) {
    return (
      <div className="q-pantalla">
        <div className="q-hoja q-panel" style={{ maxWidth: 520 }}>
          <h1>{NOMBRES_DEL_QUIEBRO.juego.nombre}</h1>
          <p>No se entiende esta mesa: puede que la app o el servidor sean de otra versión.</p>
        </div>
      </div>
    );
  }
  const f = v?.fase.tipo ?? null;
  const enPelea = f === 'oleada' || f === 'llamada' || f === 'pausa' || f === 'bajada';
  const quedaDeLaPausa = p.partida?.sala.fase?.relojHastaMs ?? null;
  const deLaFase =
    enMenu || v === null ? null : (
      <>
        {enPelea && f !== 'bajada' ? <Combate vista={v} yo={p.puerto.yo} partida={p.partida} escena={p.escena} mandos={p.mandos} aprendiz={p.primeraNoche} tactil={p.tactil} ojo={p.ojo} /> : null}
        {f === 'bajada' ? <RotuloDeLaBajada vista={v} rotulo={p.rotuloDelBarrio} puerto={p.puerto} mover={p.mover} bajada={p.bajada} /> : null}
        {p.rotuloDeFase !== null && (f === 'oleada' || f === 'llamada') ? (
          <div key={p.rotuloDeFase} className="q-rotulo q-rotulo-neon">
            {p.rotuloDeFase}
          </div>
        ) : null}
        {f === 'pausa' ? <Pausa vista={v} puerto={p.puerto} mover={p.mover} relojHastaMs={quedaDeLaPausa} /> : null}
        {f === 'recuento' || f === 'final' ? <Recuento vista={v} puerto={p.puerto} mover={p.mover} alOtraMesa={p.alOtraMesa} /> : null}
        {f === 'interrumpida' ? <Interrumpida puerto={p.puerto} mover={p.mover} /> : null}
        {/* Con la mesa cerrada no queda nada que hacer en ella: se sale del todo, no al plano de la mesa. */}
        {f === 'cerrada' ? <Cerrada alSalir={p.alOtraMesa} /> : null}
        {conMapa && p.mapa !== null ? (
          <>
            <Minimapa fuente={p.mapa} zurdo={p.zurdo && p.tactil} alTocar={alternarElPlano} />
            <BotonDelPlano abierto={plano} alAlternar={alternarElPlano} zurdo={p.zurdo && p.tactil} tactil={p.tactil} />
            <Plano fuente={p.mapa} ordenes={p.mapa} abierto={plano} alCerrar={cerrarElPlano} />
          </>
        ) : null}
        {p.marcador && enPelea ? <Marcador vista={v} puerto={p.puerto} partida={p.partida} /> : null}
      </>
    );
  return (
    <>
      {enMenu ? (
        <MenuDeLaNoche
          vista={v}
          puerto={p.puerto}
          mover={p.mover}
          bajado={p.bajado}
          alBajar={p.alBajar}
          rotulo={p.rotuloDelBarrio}
          bajada={p.bajada}
          {...(p.enlaceParaEntrar === undefined ? {} : { enlaceParaEntrar: p.enlaceParaEntrar })}
        />
      ) : null}
      {deLaFase}
      {v !== null ? (
        <Boton clase="q-menu-boton" etiqueta={NOMBRES_DEL_QUIEBRO.botones.menu} alPulsar={() => p.alMenu(!p.menu)}>
          ≡
        </Boton>
      ) : null}
      {p.menu && v !== null ? <Menu {...p} /> : null}
      {p.avisoDelSilencio ? <div className="q-canal q-canal-arriba q-panel">{NOMBRES_DEL_QUIEBRO.pantalla.sinSonido}</div> : null}
      {/*
       * «GIRA EL TELÉFONO», SÓLO EN LA PELEA. La reunión, la preparación de la Bajada, la pausa, el recuento y
       * el final son hojas que se leen y se tocan igual de pie: taparlas obligaba a girar el teléfono para
       * pulsar EMPEZAR o elegir un retoque (medido el 27-sep en 360×640 y en una tableta de pie, donde la
       * reunión entera quedaba bajo el aviso). La pelea sí pide el teléfono tumbado: la palanca y el arco de
       * botones no caben de pie sin tapar la calle. El CSS lo limita además a los teléfonos (`hud.css`).
       */}
      {f === 'oleada' || f === 'llamada' ? (
        <div className="q-gira">
          <div className="telefono" />
          <div className="q-rotulo-neon" style={{ fontSize: 22, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {NOMBRES_DEL_QUIEBRO.pantalla.giraElTelefono}
          </div>
        </div>
      ) : null}
    </>
  );
}

/** EL MENÚ: seguir, el marcador, el volumen, zurdo, rendirse y salir. */
function Menu(p: PropsDelHud): JSX.Element {
  const [volumen, ponerVolumen] = useState(() => p.sonido.volumenDe('maestro'));
  const [mudo, ponerMudo] = useState(() => p.sonido.silenciado());
  const rendirse = laOpcion(p.puerto.opciones, MOVIMIENTO_DEL_QUIEBRO.rendirse);
  return (
    <div className="q-menu q-panel">
      <div className="q-titulo">{NOMBRES_DEL_QUIEBRO.botones.menu}</div>
      <Boton clase="q-boton" alPulsar={() => p.alMenu(false)}>
        Seguir
      </Boton>
      <Boton clase="q-boton secundario" alPulsar={() => p.alMarcador(!p.marcador)}>
        {NOMBRES_DEL_QUIEBRO.botones.marcador}
      </Boton>
      <label>
        Volumen
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volumen}
          onChange={(e) => {
            const x = Number(e.currentTarget.value);
            ponerVolumen(x);
            p.sonido.volumen('maestro', x);
          }}
        />
      </label>
      <Boton
        clase="q-boton secundario"
        elegido={mudo}
        alPulsar={() => {
          p.sonido.silenciar(!mudo);
          ponerMudo(!mudo);
        }}
      >
        {mudo ? 'Con sonido' : 'Silencio'}
      </Boton>
      {p.tactil ? (
        <Boton clase="q-boton secundario" elegido={p.zurdo} alPulsar={() => p.alZurdo(!p.zurdo)}>
          {p.zurdo ? 'Mandos de diestro' : 'Mandos de zurdo'}
        </Boton>
      ) : null}
      {rendirse !== null ? (
        <Boton
          clase="q-boton secundario"
          alPulsar={() => {
            /* El menú se cierra: si no, se quedaba abierto encima del recuento que trae la rendición. */
            p.alMenu(false);
            void p.mover(rendirse.tipo, rendirse.carga);
          }}
        >
          {NOMBRES_DEL_QUIEBRO.mesa.rendirse}
        </Boton>
      ) : null}
      {p.alSalir !== undefined ? (
        <Boton clase="q-boton secundario" alPulsar={() => p.alSalir?.()}>
          Salir
        </Boton>
      ) : null}
    </div>
  );
}

/** EL MARCADOR (Tab): cómo va cada uno esta noche. */
function Marcador({ vista, puerto, partida }: { readonly vista: VistaDelQuiebro; readonly puerto: PuertoDeMesa; readonly partida: Partida | null }): JSX.Element {
  const i = miIndice(vista, puerto.yo);
  return (
    <div className="q-marcador q-panel">
      <table className="q-tabla">
        <thead>
          <tr>
            <th />
            <th className="cifra">{NOMBRES_DEL_QUIEBRO.cuentas.puntos}</th>
            <th className="cifra">{NOMBRES_DEL_QUIEBRO.cuentas.aguante}</th>
            <th className="cifra">{NOMBRES_DEL_QUIEBRO.cuentas.esquirlas}</th>
            <th className="cifra">Limpios</th>
          </tr>
        </thead>
        <tbody>
          {vista.asientos.map((a, k) => {
            const c = partida?.sala.cuentas.get(k + 1);
            const esquirlas = partida?.sala.cargas.has(k + 1) === true ? partida.sala.lleva(k + 1, 1) : a.control.esquirlas;
            /* Ausente: el de la mesa (60 s sin canal) o el momentáneo de la sala (2 s sin contestar). */
            const ausente = a.ausente || partida?.sentidoDe(k + 1, performance.now()) === 'ausente';
            return (
              <tr key={a.asiento} className={k === i ? 'mia' : ''}>
                <td>
                  <span className="muestra" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, marginRight: 8, background: COLORES_DE_ASIENTO[k % COLORES_DE_ASIENTO.length] }} />
                  {k === i ? 'Tú' : `${NOMBRES_DEL_QUIEBRO.gente.desvelado} ${String(k + 1)}`}
                  {ausente ? <span className="q-nota"> · {NOMBRES_DEL_QUIEBRO.estados.ausente.toLowerCase()}</span> : null}
                </td>
                <td className="cifra">{cifra(a.puntos + (c?.puntos ?? 0))}</td>
                <td className="cifra">{c?.vida ?? a.control.aguante}</td>
                <td className="cifra">{esquirlas}</td>
                <td className="cifra">{a.contadores.limpios}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
