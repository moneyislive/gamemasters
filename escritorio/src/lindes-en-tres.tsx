/**
 * LAS LINDES EN EL ESCRITORIO: el valle en tres dimensiones, y el raíl que lo gobierna.
 *
 * ═══ QUÉ HACE ESTA PANTALLA, Y QUÉ NO ═══
 *
 * Monta la escena (`escenas/lindes/Lindes.tsx`), le pasa el tablero que traduce
 * `shared/arcade/juegos/lindes-en-tres.ts`, y convierte los toques en movimientos
 * que manda por `mesa.mover`. Ni una regla vive aquí: qué se puede poner y dónde
 * lo dice la lista de opciones que el juego acaba de componer, y qué significa un
 * toque lo dice la traducción de `shared/`.
 *
 * ═══ EL RESPALDO NO ES UNA CORTESÍA ═══
 *
 * Si los modelos no llegan, si el navegador no da contexto de dibujo o si la vista
 * no es de este juego, se cae al RETABLO —el mueble genérico, el mismo SVG con el
 * que se juega sin una línea de tres dimensiones—. Se puede jugar la partida
 * entera ahí. Esa es la decisión que hace que la escena sea un lujo y no una
 * dependencia, y está tomada desde el §6 del diseño.
 *
 * ═══ EL GIRO VIVE AQUÍ Y NO EN LA PARTIDA ═══
 *
 * Con qué giro se pone la losa es una decisión de PANTALLA hasta que se pulsa: no
 * es estado del juego, no viaja por el cable y no tiene que sobrevivir a nada. Va
 * en un `useState` y se manda dentro del movimiento. Si viviera en la partida,
 * girar sería un movimiento —una revisión más, un aviso a los demás aparatos y una
 * entrada en el diario— por cada vez que alguien le da vueltas a una losa antes de
 * decidirse.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { Lindes } from '../../escenas/lindes/Lindes';
import type { ModoDeCamaraDeLasLindes, TableroDeLasLindesEn3D } from '../../escenas/lindes/tipos';
import type { Calidad } from '../../escenas/embarcadero/tipos';
import {
  elSiguienteGiro,
  girosQueCaben,
  laAccionDePasar,
  movimientoDePoner,
  sitiosQueSeOfrecen,
  tableroEnTres,
} from '../../shared/arcade/juegos/lindes-en-tres';
/*
 * DEL JUEGO, NUNCA DEL ÍNDICE: `shared/arcade/juegos/index.ts` INSTALA los siete
 * arcades al cargarse, y eso es cosa del servidor. Este cliente sólo necesita el
 * catálogo de losas. Es la misma razón que `pintores.ts` ya tenía escrita para su
 * importación de `RIBERAS`.
 */
import { losaPorId } from '../../shared/arcade/juegos/lindes-losas';
import type { Giro } from '../../shared/arcade/juegos/lindes-losas';
import type { MovimientoDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { LimiteDelMundo } from './lienzo-propio';
import { traer } from './muelle';
import type { LoQueVeElPintor } from './pintores';
import { AccionesDelTablero, Retablo } from './retablo';

/** El campo vertical de la cámara. El mismo que usa `camaraDeMesa` para encuadrar. */
const CAMPO = 45;

/**
 * LO QUE SE VE DESDE DÓNDE, con su rótulo.
 *
 * Tres, y las tres hacen falta: la de mesa es con la que se juega, la de hombro es
 * con la que se recorre, y la de ojos es la que hace que el tablero deje de ser
 * una maqueta y pase a ser un sitio. Se cambia con un botón y con las teclas 1, 2
 * y 3, que es lo que se busca a ciegas mientras se anda.
 */
const LAS_CAMARAS: readonly { modo: 'mesa' | 'hombro' | 'ojos'; rotulo: string; ayuda: string }[] = [
  { modo: 'mesa', rotulo: 'La mesa', ayuda: 'Desde arriba, con el tablero entero a la vista.' },
  { modo: 'hombro', rotulo: 'Al hombro', ayuda: 'Detrás de tu figura. Se anda con W, A, S, D.' },
  { modo: 'ojos', rotulo: 'Sus ojos', ayuda: 'Desde su cara, andando por encima de las losas.' },
];

export function LindesEnTres({ mesa, puesta, tablero, opciones, elRail }: LoQueVeElPintor): JSX.Element {
  const { mover, quieto } = mesa;
  const vista = puesta.vista;

  const datos = useMemo(() => tableroEnTres(vista), [vista]);
  const [rotoElLienzo, setRotoElLienzo] = useState(false);
  const [calidad] = useState<Calidad>('plena');
  const [giro, setGiro] = useState<Giro>(0);
  const [senalada, setSenalada] = useState<{ x: number; y: number } | null>(null);
  const [modo, setModo] = useState<'mesa' | 'hombro' | 'ojos'>('mesa');

  const alFallar = useCallback((motivo: string) => {
    console.warn(`El valle no se ha podido pintar (${motivo}): se juega sobre el retablo.`);
    setRotoElLienzo(true);
  }, []);

  /* Las teclas: 1, 2 y 3 cambian de cámara; R gira la losa. */
  useEffect(() => {
    const oye = (e: KeyboardEvent): void => {
      if (e.key === '1') setModo('mesa');
      else if (e.key === '2') setModo('hombro');
      else if (e.key === '3') setModo('ojos');
      else if (e.key.toLowerCase() === 'r' && datos !== null && senalada !== null) {
        setGiro((g) => elSiguienteGiro(girosQueCaben(datos, senalada.x, senalada.y), g));
      } else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', oye);
    return () => document.removeEventListener('keydown', oye);
  }, [datos, senalada]);

  const alTocarHueco = useCallback(
    (x: number, y: number, conGiro: Giro) => {
      void mover(movimientoDePoner(x, y, conGiro));
    },
    [mover],
  );

  const alSenalarHueco = useCallback((x: number, y: number) => {
    setSenalada({ x, y });
  }, []);

  /*
   * EL RELOJ DE ARENA DE LA ESCENA ES TAMBIÉN EL BOTÓN DE PASAR, y lo que manda
   * es LA MISMA acción que manda el botón de la tira: se la pregunta a
   * `shared/`, que es quien sabe cuál de las acciones del tablero es la de no
   * plantar. Dos caminos al mismo gesto que mandaran cosas distintas serían dos
   * gestos, y uno de los dos acabaría roto sin que nadie lo notara.
   */
  const laDePasar = useMemo(() => laAccionDePasar(tablero), [tablero]);

  const alTocar = useCallback(
    (movimiento: MovimientoDeclarado) => {
      void mover(movimiento);
    },
    [mover],
  );

  const sitios = useMemo(() => sitiosQueSeOfrecen(vista, opciones), [vista, opciones]);
  const enMano = datos === null ? '' : datos.enMano;
  const laLosa = enMano === '' ? null : losaPorId(enMano);
  const girosAquí = useMemo(
    () => (datos === null || senalada === null ? [] : girosQueCaben(datos, senalada.x, senalada.y)),
    [datos, senalada],
  );

  /*
   * EL GIRO SE AJUSTA SOLO AL SEÑALAR UNA CASILLA. Si el que llevas elegido no
   * cabe ahí, pasa al primero que sí: lo contrario es un fantasma que no aparece y
   * un toque que pone la losa de otra manera. Enseñar lo que va a pasar antes de
   * que pase es toda la gracia del fantasma.
   */
  useEffect(() => {
    if (girosAquí.length === 0) return;
    if (girosAquí.indexOf(giro) >= 0) return;
    setGiro(girosAquí[0] as Giro);
  }, [girosAquí, giro]);

  const camara: ModoDeCamaraDeLasLindes =
    modo === 'mesa' ? { modo: 'mesa' } : { modo, asiento: puesta.yo ?? '' };

  if (datos === null || rotoElLienzo) {
    return (
      <div className="lindes-respaldo">
        <Retablo tablero={tablero} alTocar={alTocar} quieto={quieto} />
        <AccionesDelTablero tablero={tablero} alTocar={alTocar} quieto={quieto} />
      </div>
    );
  }

  return (
    <div className="lienzo-propio lindes-pantalla">
      <div className="lindes-lienzo">
        <LimiteDelMundo alFallar={alFallar}>
          <Canvas
            shadows={false}
            dpr={[1, 2]}
            gl={{ antialias: true }}
            camera={{ fov: CAMPO, near: 1, far: 6000 }}
            onCreated={({ gl }) => {
              gl.toneMapping = ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.02;
            }}
          >
            <Lindes
              tablero={datos}
              codigo={puesta.codigo}
              traer={traer}
              calidad={calidad}
              camara={camara}
              giroEnMano={giro}
              quieto={quieto}
              sePuedePasar={laDePasar !== null && !quieto}
              alPasar={laDePasar === null ? undefined : () => alTocar(laDePasar.toque)}
              alTocarHueco={alTocarHueco}
              alSenalarHueco={alSenalarHueco}
              alFallar={alFallar}
            />
          </Canvas>
        </LimiteDelMundo>

        <p className="lindes-cinta">{tablero.aviso}</p>

        <div className="lindes-camaras" role="group" aria-label="Desde dónde se mira">
          {LAS_CAMARAS.map((c) => (
            <button
              key={c.modo}
              type="button"
              className={modo === c.modo ? 'lindes-camara lindes-camara-puesta' : 'lindes-camara'}
              aria-pressed={modo === c.modo}
              title={c.ayuda}
              onClick={() => setModo(c.modo)}
            >
              {c.rotulo}
            </button>
          ))}
        </div>
      </div>

      <aside className="lindes-rail">
        {elRail}

        {laLosa !== null ? (
          <section className="lindes-mano">
            <h3>En la mano</h3>
            <p className="lindes-mano-nombre">{laLosa.nombre}</p>
            <p className="lindes-mano-lados">
              N: {laLosa.lados[0]} · E: {laLosa.lados[1]} · S: {laLosa.lados[2]} · O: {laLosa.lados[3]}
              {laLosa.ermita ? ' · con ermita' : ''}
            </p>
            <button
              type="button"
              className="lindes-girar"
              disabled={girosAquí.length < 2 || quieto}
              onClick={() => setGiro((g) => elSiguienteGiro(girosAquí, g))}
            >
              Girar {girosAquí.length < 2 ? '' : `(${girosAquí.length} maneras)`}
            </button>
            <p className="lindes-pista">
              {senalada === null
                ? 'Señala una casilla clara para ver cómo quedaría.'
                : `En ${senalada.x}, ${senalada.y}. La R también gira.`}
            </p>
          </section>
        ) : null}

        {sitios.length > 0 ? (
          <section className="lindes-plantar">
            <h3>Dónde plantar</h3>
            <ul className="opciones" role="list">
              {sitios.map((s) => (
                <li key={`${s.clase}:${s.indice}`}>
                  <button type="button" disabled={quieto} onClick={() => alTocar(s.movimiento)} title={s.ayuda}>
                    {s.rotulo}
                    <span className="lindes-vale">
                      {s.cerrada ? `cierra: ${s.valdria}` : s.valdria > 0 ? `vale ${s.valdria}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <AccionesDelTablero tablero={tablero} alTocar={alTocar} quieto={quieto} />

        {tablero.paneles.map((p) => (
          <section key={p.titulo} className="lindes-panel">
            <h3>{p.titulo}</h3>
            <ul role="list">
              {p.lineas.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </section>
        ))}
      </aside>
    </div>
  );
}

/**
 * EL MARCADOR DEL RAÍL: quién va ganando y cuántos labriegos le quedan.
 *
 * Va aparte del pintor porque la Sala lo pinta DELANTE de los paneles del juego
 * —es la fila de `pintores.ts`— y porque un mirón que no tiene pintor propio
 * también lo ve. Lee la vista y nada más: si no es de este juego, no pinta.
 */
export function MarcadorDeLasLindes({ vista, yo }: { vista: unknown; yo: string | null }): JSX.Element | null {
  const v = vista as
    | {
        labriegos?: readonly { asiento: string; nombre: string; color: string; puntos: number; sinPlantar: number }[];
        turnoDe?: string | null;
        quedan?: number;
      }
    | null;
  if (v === null || typeof v !== 'object' || !Array.isArray(v.labriegos) || v.labriegos.length === 0) {
    return null;
  }
  return (
    <section className="lindes-marcador">
      <h3>La mesa</h3>
      <ul role="list">
        {v.labriegos.map((l) => (
          <li key={l.asiento} className={l.asiento === v.turnoDe ? 'lindes-le-toca' : undefined}>
            <span className="lindes-color" style={{ background: l.color }} aria-hidden="true" />
            <span className="lindes-nombre">
              {l.nombre}
              {l.asiento === yo ? ' (tú)' : ''}
            </span>
            <span className="lindes-puntos">{l.puntos}</span>
            <span className="lindes-labriegos">{l.sinPlantar} labriegos</span>
          </li>
        ))}
      </ul>
      <p className="lindes-bolsa">Quedan {v.quedan ?? 0} losas en la bolsa.</p>
    </section>
  );
}
