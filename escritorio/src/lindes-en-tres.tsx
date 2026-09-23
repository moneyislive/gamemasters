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
 *
 * ═══ Y EN UNA MESA DE BOTAS SE ANDA CON LOS DEMÁS ═══
 *
 * Si la mesa es de la modalidad `botas` —lo dice `esMesaDeBotas`, la misma pregunta que
 * hace la app—, la escena recibe el canal: la dirección del WebSocket en la misma casa que
 * sirvió la página (`direccionDelCanal`), la llave del asiento, quién soy y los asientos
 * con su nombre, su figura y su color. Se empieza al hombro, y el cartel de cómo se anda
 * dice también cómo va el canal. En una mesa normal no se pasa nada y la escena no abre
 * ningún socket.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { Lindes } from '../../escenas/lindes/Lindes';
import type {
  CanalDeBotas,
  EstadoDelCanal,
  ModoDeCamaraDeLasLindes,
  TableroDeLasLindesEn3D,
} from '../../escenas/lindes/tipos';
import type { Calidad } from '../../escenas/embarcadero/tipos';
import type { MuestraDelHilo } from '../../escenas/embarcadero/calidad';
import { calidadDelValle, conLaMuestra } from '../../escenas/lindes/detalle';
import { asientosQueAndan, esMesaDeBotas } from '../../escenas/paseo/mesa-de-botas';
import { COMO_SE_GOLPEA } from '../../escenas/paseo/mandos';
import {
  elSiguienteGiro,
  girosQueCaben,
  accionesFueraDeLosSitios,
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
import { direccionDelCanal } from './mesa';
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

/**
 * CÓMO SE ANDA, ESCRITO ENCIMA DEL VALLE MIENTRAS SE ANDA.
 *
 * Estaba sólo en el `title` del botón «Al hombro», que sale si el ratón se para encima y no sale
 * nunca con el teclado ni en «Sus ojos». Quien bajaba al valle veía la figura quieta y ninguna
 * pista de que las teclas eran W, A, S, D y Mayúsculas para correr: el paseo existía y no se
 * sabía usar. Va arriba a la izquierda —la derecha es de las cámaras y abajo está la cinta— y no
 * coge el puntero: es un cartel, no un control. En la mesa no sale, porque allí no se anda.
 *
 * Suelto y exportado para que `verify:escritorio` lo pinte en los tres modos: el pintor entero
 * nace en la mesa y en un pintado estático no se puede bajar a andar.
 *
 * ═══ Y EN UNA MESA DE BOTAS, CÓMO VA EL CANAL ═══
 *
 * En el mismo cartel y debajo, `canal`: «Conectando…», «Dentro», «Sin conexión: …». Es el sitio
 * donde se mira mientras se anda, y no hace falta otro. Desde la mesa también se enseña —allí no se
 * anda, pero el canal sigue abierto y conviene saber si al bajar se verá a los demás—; sin canal,
 * en la mesa no sale nada, como siempre. Y con canal se golpea: la tecla va con las de andar
 * (`COMO_SE_GOLPEA`, que sale de la misma tecla que lee el paseo), y los corazones propios los
 * trae el texto del canal.
 */
export function ComoSeAnda({
  modo,
  canal,
}: {
  readonly modo: 'mesa' | 'hombro' | 'ojos';
  readonly canal?: string;
}): JSX.Element | null {
  if (modo === 'mesa') return canal === undefined ? null : <p className="lindes-como-se-anda">{canal}</p>;
  return (
    <p className="lindes-como-se-anda">
      W A S D o las flechas para andar · Mayúsculas para correr
      {canal === undefined ? null : ` · ${COMO_SE_GOLPEA}`}
      {canal === undefined ? null : (
        <>
          <br />
          {canal}
        </>
      )}
    </p>
  );
}

export function LindesEnTres({
  mesa,
  puesta,
  tablero,
  opciones,
  elRail,
  foco,
}: LoQueVeElPintor): JSX.Element {
  const { mover, quieto } = mesa;

  /*
   * ═══ AVISAR DE QUE HAY LIENZO, QUE ES DE LO QUE CUELGA MEDIA PANTALLA ═══
   *
   * `sala.tsx` pinta el raíl en dos sitios distintos según haya lienzo o no: con lienzo va
   * DENTRO, en el cajón; sin lienzo va en un `<aside>` a un lado. Y quién lo sabe es este
   * pintor, en mitad de su render —puede caer al respaldo—, así que hay que decirlo.
   *
   * Sin decirlo pasaban las DOS cosas a la vez, y las dos sólo se ven sentándose a una
   * mesa de verdad —el banco de pruebas se pinta con `position: fixed` y allí nunca falta
   * alto, y la batería estaba en 86 de 86—:
   *
   *   · EL TABLERO EN NUEVE PÍXELES. El grid de la pantalla declara UNA fila; el `<aside>`
   *     de más caía en una fila implícita y se llevaba el alto entero. Medido:
   *     `grid-template-rows: 34px 888px`, con el mueble en los 34.
   *   · Y EL RAÍL DOS VECES EN EL ÁRBOL: una aquí dentro y otra en ese `<aside>`. Dos
   *     regiones vivas diciendo lo mismo, el código de la mesa repetido y DOS botones de
   *     «Tirar la mesa» — que es exactamente lo que `sala.tsx` tiene escrito que no puede
   *     pasar.
   *
   * Se avisa al montar el recuadro y con `null` al soltarlo, igual que el Burgo: si el
   * recuadro se va con el foco dentro, el navegador lo suelta al `<body>` y quien mira con
   * teclado se queda sin sitio.
   *
   * `foco` es OPCIONAL porque `verify:escritorio` monta este pintor suelto para medirlo,
   * sin ninguna Sala alrededor.
   */
  const apuntarElRecuadro = useCallback(
    (recuadro: HTMLDivElement | null): void => {
      foco?.(recuadro);
    },
    [foco],
  );
  const vista = puesta.vista;

  const datos = useMemo(() => tableroEnTres(vista), [vista]);
  const [rotoElLienzo, setRotoElLienzo] = useState(false);
  /*
   * ═══ LA CALIDAD SE MIDE, NO SE ESCRIBE ═══
   *
   * Era `useState('plena')` sin quien la cambiara: una constante con forma de estado. Ahora la
   * escena manda por `alMedir` lo que le cuesta cada segundo y `calidadDelValle`
   * (`escenas/lindes/detalle.ts`) decide con el juez de la casa, sobre las últimas doce muestras
   * y sin volver a subir: el tablero crece de una losa a setenta y dos, y juzgar sólo al montar
   * sería juzgar siempre el de una. La misma cuenta que hace la app.
   */
  const [calidad, setCalidad] = useState<Calidad>('plena');
  const muestras = useRef<MuestraDelHilo[]>([]);
  const alMedir = useCallback((m: { triangulos: number; llamadas: number; ms: number; fotogramas: number }) => {
    muestras.current = conLaMuestra(muestras.current, { ms: m.ms, fotogramas: m.fotogramas });
    setCalidad((antes) => calidadDelValle(antes, muestras.current));
  }, []);
  const [giro, setGiro] = useState<Giro>(0);
  const [senalada, setSenalada] = useState<{ x: number; y: number } | null>(null);

  /*
   * ═══ EL CANAL, SÓLO EN UNA MESA DE BOTAS ═══
   *
   * Se nace al hombro en una mesa de botas —es a lo que se viene—, y el modo inicial se saca de la
   * mesa al montar para que un pintado estático también lo diga. Sin llave, sin asiento o sin
   * dirección (sin `location`) no hay canal: no hay con qué decir `hola`. Los asientos llegan en
   * cada vuelta del sondeo, pero la escena sólo reabre el socket si cambian la dirección, la llave o
   * el asiento.
   */
  const esBotas = esMesaDeBotas(puesta);
  const [modo, setModo] = useState<'mesa' | 'hombro' | 'ojos'>(() => (esBotas ? 'hombro' : 'mesa'));
  const [estadoDelCanal, setEstadoDelCanal] = useState<EstadoDelCanal | null>(null);
  const llaveDelAsiento = mesa.llave ?? null;
  const yoEnLaMesa = puesta.yo;
  const canal = useMemo<CanalDeBotas | undefined>(() => {
    const url = esBotas ? direccionDelCanal(puesta.codigo) : null;
    if (url === null || llaveDelAsiento === null || yoEnLaMesa === null) return undefined;
    return {
      url,
      llave: llaveDelAsiento,
      yo: yoEnLaMesa,
      asientos: asientosQueAndan(puesta.asientos, puesta.vista),
      alCambiar: setEstadoDelCanal,
    };
  }, [esBotas, llaveDelAsiento, puesta.asientos, puesta.codigo, puesta.vista, yoEnLaMesa]);
  /* Si la mesa resulta ser de botas después de montar, también se baja; luego manda el botón. */
  useEffect(() => {
    if (esBotas) setModo('hombro');
  }, [esBotas, puesta.codigo]);

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

  const alSenalarHueco = useCallback((x: number | null, y: number | null) => {
    setSenalada(x === null || y === null ? null : { x, y });
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
  /*
   * ═══ LO QUE VA EN LA SEGUNDA LISTA: LO QUE LA PRIMERA NO PINTA YA ═══
   *
   * `acciones` trae TODO lo que no sea poner una losa, así que traía también los
   * plantados — y éstos ya salen arriba, en «Dónde plantar», con lo que valdría cada uno.
   * Cada sitio aparecía DOS veces: una con su valor y otra sin nada.
   *
   * Sólo se filtra en el camino del LIENZO. El del respaldo —arriba, cuando no hay
   * tablero en tres dimensiones— no pinta «Dónde plantar», así que allí `acciones` tiene
   * que seguir trayéndolos todos o no se podría plantar.
   */
  const sinRepetir = useMemo(() => accionesFueraDeLosSitios(tablero, sitios), [tablero, sitios]);
  const loQueNoEstaArriba = useMemo(() => ({ ...tablero, acciones: sinRepetir }), [tablero, sinRepetir]);
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
      <div className="lindes-lienzo" ref={apuntarElRecuadro}>
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
              /*
               * LA FIGURA DE QUIEN PASEA, sacada del asiento de la mesa. Si no eligió
               * ninguna, `figuraQueSePinta` saca una del identificador: nunca se queda
               * sin nadie a quien seguir por no haber pasado un dato.
               */
              figura={puesta.asientos.find((a) => a.id === puesta.yo)?.figura}
              quieto={quieto}
              sePuedePasar={laDePasar !== null && !quieto}
              alPasar={laDePasar === null ? undefined : () => alTocar(laDePasar.toque)}
              alTocarHueco={alTocarHueco}
              alSenalarHueco={alSenalarHueco}
              alFallar={alFallar}
              alMedir={alMedir}
              canal={canal}
            />
          </Canvas>
        </LimiteDelMundo>

        <p className="lindes-cinta">{tablero.aviso}</p>

        <ComoSeAnda modo={modo} canal={esBotas ? (estadoDelCanal?.texto ?? 'Conectando…') : undefined} />

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

      {/*
        ═══ PRIMERO LO QUE HAY QUE HACER; LA CHAPA DE LA MESA, DEBAJO ═══

        El raíl es una columna que se desplaza, y este orden estaba al revés: `elRail` —el
        marcador, el código, el enlace, la nota de las dos ventanas, los sentados, el reloj,
        «Levantarse» y «Tirar la mesa»— ocupa 790 píxeles, así que «Dónde plantar» empezaba
        a 911 y «No plantar» a 1.104. Medido en la pantalla con la partida en marcha: en una
        ventana de 1.080 la acción del turno asoma por el borde de abajo, y en cualquier
        ventana más baja hay que desplazarse casi mil píxeles —pasando por encima de «Tirar
        la mesa», que acaba la partida de todos— para llegar a lo único que el juego está
        esperando que hagas.

        El Burgo ya lo tiene bien: su hoja va antes y `elRail` después (`burgo-en-tres.tsx`).
        Así que aquí igual, y en el orden en que se necesita: lo que se hace ahora, luego lo
        que hace falta para decidirlo —los paneles que declara el propio juego— y al final
        la chapa de la mesa, que se mira una vez al empezar y casi nunca más.
      */}
      <aside className="lindes-rail">
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
                    {/*
                      SIEMPRE DICE UN NÚMERO, aunque sea el cero. Una losa puede ofrecer DOS
                      prados, y entonces los dos rótulos son la misma frase palabra por
                      palabra: si el de cero se queda sin nota, en la lista salen dos
                      renglones idénticos y no hay manera de saber cuál es cuál. Visto
                      jugando: «Labriego en el prado · vale 3» y «Labriego en el prado ·».
                    */}
                    <span className="lindes-vale">
                      {s.cerrada ? `cierra: ${s.valdria}` : `vale ${s.valdria}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <AccionesDelTablero tablero={loQueNoEstaArriba} alTocar={alTocar} quieto={quieto} />

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

        {elRail}
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
