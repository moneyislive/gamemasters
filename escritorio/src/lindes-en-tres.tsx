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
 * ═══ Y LO QUE HACE IGUAL QUE LA APP, LO HACE CON LA APP ═══
 *
 * Las tres cámaras, el giro que se ajusta solo al señalar una casilla, la calidad medida,
 * el `alFallar` que manda al retablo, lo que cada toque manda y el lienzo con la escena
 * dentro estaban escritos aquí y otra vez en `app/src/arcade/lindes-en-tres-escena.tsx`,
 * casi palabra por palabra. Ahora son del controlador de Las Lindes
 * (`escenas/lindes/el-valle-en-la-mesa.ts`), que usan las dos pantallas. Lo que se queda
 * aquí es lo que hace de esto el ESCRITORIO: el raíl, las teclas 1, 2, 3 y R, el cartel de
 * cómo se anda, y el canal de Boots on Board, que cada cliente construye con su dirección.
 *
 * ═══ EL RESPALDO NO ES UNA CORTESÍA ═══
 *
 * Si los modelos no llegan, si el navegador no da contexto de dibujo o si la vista
 * no es de este juego, se cae al RETABLO —el mueble genérico, el mismo SVG con el
 * que se juega sin una línea de tres dimensiones—. Se puede jugar la partida
 * entera ahí. Esa es la decisión que hace que la escena sea un lujo y no una
 * dependencia, y está tomada desde el §6 del diseño.
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
import { Lindes } from '../../escenas/lindes/Lindes';
import type { CanalDeBotas, EstadoDelCanal } from '../../escenas/lindes/tipos';
import {
  alCrearElLienzoDelValle,
  EL_LIENZO_DEL_VALLE,
  LAS_CAMARAS_DEL_VALLE,
  usarElValleEnLaMesa,
} from '../../escenas/lindes/el-valle-en-la-mesa';
import { asientosQueAndan, esMesaDeBotas } from '../../escenas/paseo/mesa-de-botas';
import { COMO_SE_GOLPEA, SIN_MANDOS_DE_FUERA } from '../../escenas/paseo/mandos';
import type { MandosDeFuera } from '../../escenas/paseo/mandos';
import { escudosDeLaVista, LEVA } from '../../shared/arcade/juegos/lindes-escudos';
import { LosEscudos, usarElAvisoDelHallazgo } from './a-pie-en-botas';
import { LimiteDelMundo } from './lienzo-propio';
import { usarAPieApaisado } from './a-pie-apaisado';
import { COMO_SE_ANDA_CON_EL_DEDO, COMO_SE_GOLPEA_CON_EL_DEDO, MandosTactiles, usarAparatoTactil } from './mandos-tactiles';
import { PantallaCompleta } from './pantalla-completa';
import { direccionDelCanal } from './mesa';
import { traer } from './muelle';
import type { LoQueVeElPintor } from './pintores';
import { AccionesDelTablero, Retablo } from './retablo';

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
 *
 * ═══ Y EN UN TELÉFONO, LO QUE SE TOCA ═══
 *
 * Con `tactil` (`usarAparatoTactil`, `mandos-tactiles.tsx`) no hay teclado que nombrar: el cartel
 * dice la palanca, el «Correr» y, con canal, el «Golpear» que se ven en pantalla.
 */
export function ComoSeAnda({
  modo,
  canal,
  tactil = false,
}: {
  readonly modo: 'mesa' | 'hombro' | 'ojos';
  readonly canal?: string;
  readonly tactil?: boolean;
}): JSX.Element | null {
  if (modo === 'mesa') return canal === undefined ? null : <p className="lindes-como-se-anda">{canal}</p>;
  return (
    <p className="lindes-como-se-anda">
      {tactil ? COMO_SE_ANDA_CON_EL_DEDO : 'W A S D o las flechas para andar · Mayúsculas para correr'}
      {canal === undefined ? null : ` · ${tactil ? COMO_SE_GOLPEA_CON_EL_DEDO : COMO_SE_GOLPEA}`}
      {canal === undefined ? null : (
        <>
          <br />
          {canal}
        </>
      )}
    </p>
  );
}

/**
 * CUÁNDO EL RAÍL ES UNA HOJA PLEGABLE: un teléfono de pie. La MISMA consulta que la regla
 * `@media` de `estilo.css` (busca `LA HOJA PLEGABLE`): si una dijera sí y la otra no, habría asa
 * sin hoja o hoja sin asa. Sin `matchMedia` —el pintado estático de `verify:escritorio`—, no.
 */
export const CONSULTA_DE_LA_HOJA_PLEGABLE = '(max-width: 40rem) and (orientation: portrait)';

function usarLaHojaPlegable(): boolean {
  const consulta = (): MediaQueryList | null =>
    typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia(CONSULTA_DE_LA_HOJA_PLEGABLE) : null;
  const [si, ponerSi] = useState(() => consulta()?.matches ?? false);
  useEffect(() => {
    const m = consulta();
    if (m === null) return undefined;
    const cambia = (): void => ponerSi(m.matches);
    cambia();
    m.addEventListener('change', cambia);
    return () => m.removeEventListener('change', cambia);
  }, []);
  return si;
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
  const [recuadro, ponerRecuadro] = useState<HTMLDivElement | null>(null);
  const apuntarElRecuadro = useCallback(
    (r: HTMLDivElement | null): void => {
      foco?.(r);
      ponerRecuadro(r);
    },
    [foco],
  );

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

  /*
   * ═══ EN UN TELÉFONO, LA PALANCA ═══
   *
   * La referencia que la escena lee en su bucle (`mandos`) y que escriben los mandos táctiles
   * (`mandos-tactiles.tsx`), sólo a pie y sólo si el aparato se toca. Y el aviso al recoger un
   * escudo, que la escena cuenta por `alRecoger` (`a-pie-en-botas.tsx`).
   */
  const tactil = usarAparatoTactil();
  /* A pie, el teléfono de lado: pantalla completa y bloqueo, o el aviso «Gira el teléfono». Ver `a-pie-apaisado.tsx`. */
  const avisoDeGirar = usarAPieApaisado(modo !== 'mesa');
  const mandos = useRef<MandosDeFuera>(SIN_MANDOS_DE_FUERA);
  const { alRecoger, aviso } = usarElAvisoDelHallazgo('lindes', puesta.asientos);

  /*
   * ═══ LA FRANJA DE ABAJO, MEDIDA: LO QUE LA PANTALLA PONE ENCIMA DE LOS RINCONES ═══
   *
   * La losa de la mano y el reloj van en los rincones de abajo del lienzo, y abajo es también
   * donde esta pantalla pone la cinta y, a pie en un teléfono, la palanca, «Correr» y «Golpear».
   * Sentado a una mesa de botas en un móvil (27-sep-2026, `docs/PANTALLAS.md`), LA PALANCA TAPABA
   * LA LOSA DE LA MANO —el recuadro verde de abajo a la izquierda, que parecía un minimapa— y
   * «Correr» tapaba el reloj. Se mide lo que sobresale de verdad —la cinta crece a dos renglones
   * en un teléfono estrecho, y la fila de mandos cambia de forma tumbada— y se le dice a la escena
   * (`reservaAbajo`), que apoya los rincones encima.
   */
  /*
   * ═══ EN UN TELÉFONO DE PIE, EL RAÍL ES UNA HOJA QUE SE PLIEGA ═══
   *
   * De pie el raíl colgaba bajo el lienzo y el valle se quedaba en el 60 % del alto, con la
   * página desplazándose por los paneles (27-sep-2026, `docs/PANTALLAS.md`). Ahora el valle se
   * lleva la ventana entera y el raíl es una hoja que sube desde abajo con el asa «Paneles» y se
   * cierra con «Cerrar». Lo que la jugada necesita en la mesa —«Girar», dónde plantar y las
   * acciones del turno— se queda FUERA de la hoja, en una tira sobre la cinta (`lindes-jugada`):
   * no hay que abrir nada para jugar. Tumbado y en pantallas grandes, el raíl de siempre.
   */
  const plegable = usarLaHojaPlegable();
  const [hojaAbierta, ponerHojaAbierta] = useState(false);
  useEffect(() => {
    if (!plegable) ponerHojaAbierta(false);
  }, [plegable]);

  const [reservaAbajo, ponerReservaAbajo] = useState(0);
  useEffect(() => {
    if (recuadro === null) return undefined;
    const medir = (): void => {
      const abajo = recuadro.getBoundingClientRect().bottom;
      let alto = 0;
      for (const e of recuadro.querySelectorAll('.lindes-cinta, .mandos-tactiles > *, .lindes-jugada > *, .lindes-asa')) {
        const r = e.getBoundingClientRect();
        if (r.height > 0) alto = Math.max(alto, abajo - r.top);
      }
      ponerReservaAbajo((antes) => (Math.abs(antes - alto) < 2 ? antes : Math.round(alto)));
    };
    const cuadro = requestAnimationFrame(medir);
    const mirando = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    mirando?.observe(recuadro);
    return () => {
      cancelAnimationFrame(cuadro);
      mirando?.disconnect();
    };
  }, [recuadro, modo, tactil, tablero.aviso, plegable, hojaAbierta, opciones]);

  /*
   * EL CONTROLADOR DE LAS LINDES: la escena, el giro, la calidad, los sitios y lo que manda cada
   * toque, lo mismo que la app. Ver la cabecera de `escenas/lindes/el-valle-en-la-mesa.ts`.
   */
  const valle = usarElValleEnLaMesa({ puesta, tablero, opciones, mover, quieto, modo, traer });
  const { datos, senalada, girar, girosAqui, laLosa, sitios, sinRepetir, alTocar } = valle;

  /* Las teclas: 1, 2 y 3 cambian de cámara; R gira la losa. */
  useEffect(() => {
    const oye = (e: KeyboardEvent): void => {
      if (e.key === '1') setModo('mesa');
      else if (e.key === '2') setModo('hombro');
      else if (e.key === '3') setModo('ojos');
      else if (e.key.toLowerCase() === 'r' && datos !== null && senalada !== null) girar();
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', oye);
    return () => document.removeEventListener('keydown', oye);
  }, [datos, senalada, girar]);

  /*
   * LA TIRA DE LAS ACCIONES, SIN LO QUE YA ESTÁ EN «DÓNDE PLANTAR». Sólo en el camino del LIENZO:
   * el del respaldo —abajo, cuando no hay tablero en tres dimensiones— no pinta «Dónde plantar»,
   * así que allí `acciones` tiene que seguir trayéndolos todos o no se podría plantar.
   */
  /*
   * Y LA LEVA SE ENSEÑA UNA VEZ: en una mesa de botas con asiento la pinta `LosEscudos`, con su
   * cuenta y su porqué, así que sale de las dos tiras de acciones, que la traerían otra vez a secas.
   * Es lo mismo que hace la app (`app/src/arcade/lindes-en-tres-escena.tsx`).
   */
  const conLosEscudos = esBotas && yoEnLaMesa !== null;
  const loQueNoEstaArriba = useMemo(
    () => ({ ...tablero, acciones: conLosEscudos ? sinRepetir.filter((a) => a.toque.tipo !== LEVA) : sinRepetir }),
    [tablero, sinRepetir, conLosEscudos],
  );
  const lasDelRespaldo = useMemo(
    () => (conLosEscudos ? { ...tablero, acciones: tablero.acciones.filter((a) => a.toque.tipo !== LEVA) } : tablero),
    [tablero, conLosEscudos],
  );

  /*
   * ═══ LOS PANELES DEL JUEGO, SIN LOS QUE ESTE RAÍL YA DICE MEJOR ═══
   *
   * En un teléfono el raíl es la franja de abajo y cada renglón se paga en tablero. Y decía tres
   * cosas DOS VECES (27-sep-2026, `docs/PANTALLAS.md`): «En la mano» —la ficha de arriba, con su
   * «Girar», y el panel del juego con los mismos cuatro lados—, «La mesa» —el marcador de la Sala,
   * con el color y el «(tú)», y el panel con los mismos puntos en texto— y «La bolsa», que el
   * marcador ya cuenta. Salen los repetidos y sólo cuando el otro está: sin losa en la mano el
   * panel vuelve, y sin raíl de la Sala alrededor (`elRail`, que trae el marcador) también.
   * «Cómo quedó», al final, se queda siempre: es el recuento con su porqué.
   */
  const conMarcador = elRail !== undefined && elRail !== null;
  const losPaneles = tablero.paneles.filter(
    (p) =>
      !(p.titulo === 'En la mano' && laLosa !== null) &&
      !((p.titulo === 'La mesa' || p.titulo === 'La bolsa') && conMarcador),
  );

  /* Lo que la tira de la jugada enseña fuera de la hoja: las acciones que se pueden pulsar ya. */
  const accionesDeLaJugada = loQueNoEstaArriba.acciones.filter((a) => a.disponible);
  const hayJugada = laLosa !== null || sitios.length > 0 || accionesDeLaJugada.length > 0;

  if (valle.escena === null || valle.roto !== null) {
    return (
      <div className="lindes-respaldo">
        <Retablo tablero={tablero} alTocar={alTocar} quieto={quieto} />
        <AccionesDelTablero tablero={lasDelRespaldo} alTocar={alTocar} quieto={quieto} />
        {esBotas && yoEnLaMesa !== null ? (
          <LosEscudos vista={puesta.vista} yo={yoEnLaMesa} opciones={opciones} quieto={quieto} mover={mover} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="lienzo-propio lindes-pantalla">
      <div className="lindes-lienzo" ref={apuntarElRecuadro}>
        <LimiteDelMundo alFallar={valle.alFallar}>
          <Canvas {...EL_LIENZO_DEL_VALLE} onCreated={alCrearElLienzoDelValle}>
            <Lindes {...valle.escena} canal={canal} mandos={mandos} alRecoger={alRecoger} reservaAbajo={reservaAbajo} />
          </Canvas>
        </LimiteDelMundo>

        <p className="lindes-cinta">{tablero.aviso}</p>

        {aviso}

        <MandosTactiles
          mandos={mandos}
          visibles={tactil && modo !== 'mesa'}
          conGolpe={canal !== undefined}
          clase="mandos-tactiles-sobre-la-cinta"
        />

        <ComoSeAnda modo={modo} canal={esBotas ? (estadoDelCanal?.texto ?? 'Conectando…') : undefined} tactil={tactil} />
        <PantallaCompleta flotante="izquierda" />
        {avisoDeGirar}

        <div className="lindes-camaras" role="group" aria-label="Desde dónde se mira">
          {LAS_CAMARAS_DEL_VALLE.map((c) => (
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

        {/*
          LA JUGADA, FUERA DE LA HOJA: sólo en un teléfono de pie, con la hoja cerrada y en la mesa
          —a pie abajo van la palanca y los botones, y allí se abre «Paneles»—. Lo mismo que la hoja
          trae arriba, en botones de pulgar: girar la losa, dónde plantar y las acciones del turno.
        */}
        {plegable && !hojaAbierta && modo === 'mesa' && hayJugada ? (
          <div className="lindes-jugada" role="group" aria-label="La jugada">
            {laLosa !== null ? (
              <button type="button" className="lindes-jugada-boton" disabled={girosAqui.length < 2 || quieto} onClick={girar}>
                Girar la losa{girosAqui.length < 2 ? '' : ` (${girosAqui.length})`}
              </button>
            ) : null}
            {sitios.map((s) => (
              <button
                key={`${s.clase}:${s.indice}`}
                type="button"
                className="lindes-jugada-boton"
                disabled={quieto}
                onClick={() => alTocar(s.movimiento)}
                title={s.ayuda}
              >
                {s.rotulo} · {s.cerrada ? `cierra: ${s.valdria}` : `vale ${s.valdria}`}
              </button>
            ))}
            {accionesDeLaJugada.map((a) => (
              <button
                key={a.id}
                type="button"
                className="lindes-jugada-boton"
                disabled={quieto}
                onClick={() => alTocar(a.toque)}
                title={a.ayuda}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
        ) : null}

        {plegable ? (
          <button
            type="button"
            className="lindes-asa"
            aria-expanded={hojaAbierta}
            aria-controls="lindes-hoja"
            onClick={() => ponerHojaAbierta((a) => !a)}
          >
            Paneles
          </button>
        ) : null}
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
      {/*
        A PIE, LOS ESCUDOS LO PRIMERO (`lindes-rail-a-pie`, que les da `order: -1`): andando es lo
        que se recoge y con lo que se paga la leva, y en un teléfono el raíl es una franja estrecha
        —abajo de pie, al lado tumbado— en la que lo de más abajo no se ve sin desplazarse. En la
        mesa van donde siempre, tras las acciones. Con CSS y no pintándolos en dos sitios: el
        mismo nodo, sin remontarse al bajar ni al subir.
      */}
      <aside
        id="lindes-hoja"
        className={[
          'lindes-rail',
          modo === 'mesa' ? '' : 'lindes-rail-a-pie',
          plegable ? 'lindes-rail-plegable' : '',
          plegable && hojaAbierta ? 'lindes-rail-abierta' : '',
        ]
          .filter((c) => c !== '')
          .join(' ')}
      >
        {/* La hoja abierta tapa el asa: se cierra desde su propia cabecera, que no se desplaza. */}
        {plegable ? (
          <div className="lindes-hoja-cabecera">
            <span>Paneles</span>
            <button type="button" className="lindes-hoja-cerrar" onClick={() => ponerHojaAbierta(false)}>
              Cerrar
            </button>
          </div>
        ) : null}

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
              disabled={girosAqui.length < 2 || quieto}
              onClick={girar}
            >
              Girar {girosAqui.length < 2 ? '' : `(${girosAqui.length} maneras)`}
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

        {/* Los escudos y la leva: sólo en una mesa de botas y con asiento. Ver `LosEscudos`. */}
        {esBotas && yoEnLaMesa !== null ? (
          <LosEscudos vista={puesta.vista} yo={yoEnLaMesa} opciones={opciones} quieto={quieto} mover={mover} />
        ) : null}

        {losPaneles.map((p) => (
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
  /*
   * LOS ESCUDOS, sólo si la vista los trae: el campo es opcional y aparece con el primero que se
   * recoge (`lindes-escudos.ts`). Una mesa normal no lo tiene nunca, y su marcador es el de antes.
   */
  const conEscudos = typeof (vista as { escudos?: unknown }).escudos === 'object' && (vista as { escudos?: unknown }).escudos !== null;
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
            {conEscudos ? (
              <span className="lindes-labriegos lindes-escudos">
                {escudosDeLaVista(vista, l.asiento) === 1 ? '1 escudo' : `${String(escudosDeLaVista(vista, l.asiento))} escudos`}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="lindes-bolsa">Quedan {v.quedan ?? 0} losas en la bolsa.</p>
    </section>
  );
}
