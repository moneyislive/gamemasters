/**
 * LAS HOJAS DEL BURGO EN EL ESCRITORIO: las secciones que sirve `hojaEnTres`, la tarjeta de
 * una casilla, la ficha de un jugador, el componedor de un trato, la puja libre y la crónica,
 * pintadas con `<section>` y `<button>` para que las monte quien tenga sitio.
 *
 * ═══ AQUÍ NO SE DECIDE NADA Y NO SE REDACTA NADA ═══
 *
 * Cada sección llega con su título, sus renglones YA ESCRITOS y sus opciones ENTERAS
 * desde `shared/arcade/juegos/burgo-en-tres.ts`, que es donde `verify:burgo-en-tres` las
 * ejercita con partidas de verdad desde Node. Este fichero pone widgets. Si aquí
 * apareciera un `if` sobre una casilla, un precio o un turno, habría dos traducciones
 * —la de la app y la de esta pantalla— y un día dirían cosas distintas.
 *
 * Lo que se manda es LA OPCIÓN ENTERA: `{ tipo: o.tipo, carga: o.carga }` tal cual vino.
 * Las DOS excepciones son las dos puertas del juego —la puja libre y el trato, que
 * llegan con `declaracion: true` y no son un movimiento—, y para ellas se llama a
 * `montar()`, que compone la carga con EXACTAMENTE los campos que la puerta declara y
 * devuelve `null` cuando lo pedido no cabe. Escribir aquí la forma de una carga sería un
 * segundo sitio que nadie comprueba.
 *
 * ═══ POR QUÉ SON SEIS SECCIONES Y NO OCHO ═══
 *
 * `ORDEN_DE_LA_HOJA` trae ocho y las dos primeras ya están en pantalla antes de abrir
 * nada, que es justo lo que el §6.3 pide de ellas:
 *
 *   · LA CINTA vive sobre el lienzo, con el aviso en la ÚNICA región viva
 *     (`aria-live="polite"`) de esta pantalla. Repetirla aquí dentro sería una segunda
 *     región con el mismo texto: dos anuncios por jugada, y el segundo pisando al
 *     primero. Su lista de opciones es vacía, así que no se pierde ni un movimiento.
 *   · EL MARCADOR lo pinta `MarcadorDelBurgo` en el raíl, y el raíl entero entra en el
 *     mismo cajón. Pintarlo dos veces serían dos listas de seis jugadores, una encima de
 *     la otra, con la fila del turno destacada en las dos. Sus opciones también son
 *     vacías.
 *
 * ═══ LAS SECCIONES SE PLIEGAN, Y UNA CON BOTONES NO SE PLIEGA NUNCA ═══
 *
 * Ésta es la regla que hace que plegar no rompa la partición, y va escrita porque el fallo
 * que evita es exactamente el del cajón que nace cerrado, dicho una capa más abajo: si una
 * sección con un movimiento dentro se puede plegar, ese movimiento se queda escondido
 * detrás de un triángulo que nadie tiene motivo para pulsar, la criba sigue contándolo como
 * pintado —`loQuePintaLaHoja` mira `seccion.opciones`, no el DOM— y la partida se para sin
 * un solo error en ninguna consola.
 *
 * Así que `sePliega` mira LO QUE LA SECCIÓN TRAE: sin opciones y sin fichas con opciones, se
 * puede plegar; con una sola, se queda abierta y su triángulo no se pinta. Las seis secciones
 * sueltan sus botones a medida que el lienzo les pone muebles delante —«Ahora» al carril, «El
 * trato» a la caja de los tratos—, así que en la pantalla de verdad casi todas son de leer, y
 * plegarlas es lo que hace que el cajón quepa en un lienzo de 288×317 sin rodar tres pantallas.
 *
 * ═══ LA QUE HAY QUE MIRAR AHORA SE ABRE SOLA, Y SÓLO CUANDO ME TOCA ═══
 *
 * `hoja.abre` ya lleva la prioridad escrita (la subasta si pujo, «Ahora» en mi apuro, el
 * trato si me proponen y no hay caja, «Ahora» si me toca). `usarLaSeccionAbierta` la abre
 * cuando CAMBIA el momento de la partida y me toca a mí, y no cuando le toca a otro: en una
 * mesa de seis, abrirse sola con cada jugada ajena sería la hoja saltando de sección cada
 * pocos segundos mientras se intenta leer el marcador. Es la misma función que la app tiene
 * en `app/src/arcade/hojas-del-burgo.tsx`, con la misma prioridad y el mismo cuidado.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Opcion } from '../../shared/arcade';
import type { MovimientoDeclarado } from '../../shared/mecanicas/tablero-declarado';
import {
  fichaDeCasilla,
  maravedies,
  ORDEN_DE_LA_HOJA,
} from '../../shared/arcade/juegos/burgo-en-tres';
import type {
  FichaDeCasilla,
  FichaDeJugador,
  HojaDelBurgo,
  IdDeSeccion,
  LadoQueSePinta,
  PujaComponible,
  RenglonDeLaCronica,
  SeccionDeLaHoja,
  SolarDelBarrio,
  TratoComponible,
} from '../../shared/arcade/juegos/burgo-en-tres';
/*
 * EL BOLSILLO DE ESTE CLIENTE, que es lo que hace que la sección abierta sobreviva a un F5.
 * Síncrono y envuelto en `try` allí dentro: aquí no se comprueba nada antes de llamarlo.
 */
import { guardarLaSeccion, laSeccionGuardada } from './bolsillo';

/**
 * LAS DOS QUE YA ESTÁN EN PANTALLA ANTES DE ABRIR EL CAJÓN. Ver la cabecera: la cinta es
 * la única región viva de esta pantalla y el marcador lo pinta el raíl, que entra aquí
 * dentro. Ninguna de las dos declara opciones, así que saltárselas no esconde un
 * movimiento.
 */
const YA_ESTAN_FUERA: readonly IdDeSeccion[] = ['cinta', 'marcador'];

/** El paso del campo de la puja y del dinero de un trato: de diez en diez (reglamento §7). */
const DE_DIEZ_EN_DIEZ = 10;

/**
 * LO QUE SE DIBUJA EN LUGAR DE ESCRIBIR «3 casas», y por qué son dos glifos y no un icono.
 *
 * Una tarjeta de solar tiene que decir de un vistazo cuánto hay construido, y «3 casas»
 * escrito al final de un renglón de estado no se ve: se lee, que es otra cosa y cuesta un
 * segundo por casilla. Cuatro cuadrados sí se ven. El hotel es UN glifo distinto y no cinco
 * cuadrados, porque un hotel no es «cinco casas» en ninguna cuenta del reglamento: cobra por
 * su propia fila de la tabla de rentas.
 *
 * Van `aria-hidden` y la palabra sigue estando: `ficha.estado` la escribe el juego («hotel»,
 * «2 casas», «barrio entero»), así que un lector oye la frase entera y no una fila de figuras
 * que no significan nada dichas en voz alta.
 */
const UNA_CASA = '■';
const UN_HOTEL = '⌂';

/**
 * ═══ LA MEMORIA DE QUÉ SECCIÓN SE DEJÓ ABIERTA, AHORA EN EL BOLSILLO ═══
 *
 * ═══ EL FALLO: UNA MITAD QUE FALTABA, NO UNA ROTA ═══
 *
 * Aquí vivía un `Map` de módulo. Eso conserva la sección mientras la pestaña siga abierta —que
 * es cuando más importa, porque el pintor se desmonta y se vuelve a montar en cada ida y vuelta
 * a la Sala— y la pierde ENTERA al recargar. Y recargar en un PC no es el caso raro que es en
 * un teléfono: es F5, es un `Ctrl+W` sin querer, es el navegador que se actualiza. Cada una de
 * esas veces la hoja volvía a abrir por donde dijera quien la monta y había que ir a buscar «Lo
 * mío» otra vez, en una partida que dura días. La app ya lo guardaba de verdad; el hueco era de
 * este cliente y estaba anotado aquí mismo como pendiente. Esto es ese hueco.
 *
 * El bolsillo es SÍNCRONO (`localStorage`, no el almacén seguro de la app), así que lo guardado
 * se lee en el primer render y no hace falta un efecto que lo traiga: no hay ninguna ventana en
 * la que la hoja se pinte por la sección equivocada y salte a la buena un fotograma después.
 *
 * ═══ Y NO SE QUEDA ADEMÁS EL MAPA DE MÓDULO ═══
 *
 * Dos memorias del mismo dato son dos memorias que se separan: bastaría un `try` que falle en
 * el bolsillo —ventana privada de Safari, almacenamiento bloqueado— para que el mapa dijera una
 * sección y el bolsillo otra, y quién gana dependería del orden de lectura. Se queda UNA. Lo
 * que se pierde donde el bolsillo no puede escribir es la memoria entre montajes, y eso es
 * exactamente lo que ya se pierde entre recargas: la hoja abre por donde diga quien la monta.
 *
 * POR MESA Y POR SILLA, que es la llave que compone `bolsillo.ts`: dos mesas del mismo juego
 * están en momentos distintos, y dos ventanas del mismo navegador en la MISMA mesa comparten
 * `localStorage`. Sin la silla, abrir «Lo mío» en una le movería la sección a la otra.
 */

/**
 * QUÉ SECCIÓN ABRE LO QUE HAY GUARDADO, o `null` si no abre ninguna.
 *
 * `laSeccionGuardada` devuelve LA CADENA TAL CUAL y no valida nada —lo dice su cabecera: quien
 * conoce la lista es la hoja—, así que la lista se mira aquí. Y no vale con mirar
 * `ORDEN_DE_LA_HOJA`: la cinta y el marcador están en ese orden y esta pantalla NO los pinta
 * (ver `YA_ESTAN_FUERA`), o sea que una memoria con «cinta» dentro dejaría la hoja con todo
 * plegado y sin ninguna manera de saber por qué. Lo que se acepta es lo que esta pantalla sabe
 * abrir; cualquier otra cosa —una sección de una versión anterior, un valor a mano— es `null`,
 * que es «abre por donde digas tú».
 */
export function laSeccionQueSeAbre(guardada: string | null): IdDeSeccion | null {
  if (guardada === null) return null;
  for (const id of ORDEN_DE_LA_HOJA) {
    if (id === guardada && !YA_ESTAN_FUERA.includes(id)) return id;
  }
  return null;
}

/**
 * QUÉ SECCIÓN ESTÁ ABIERTA: la que se dejó de esta mesa, hasta que cambia el momento y me
 * toca a mí.
 *
 * `paso` es una cadena que cambia exactamente cuando cambia el momento de la partida —quien
 * llama le pasa `hoja.cinta.espera`, que `esperaA` deriva del paso, del turno y del momento—.
 * La primera vuelta NO cuenta: es cuando se monta la pantalla, y ahí manda lo que estuviera
 * guardado.
 *
 * `arcade` y `silla` son los dos tramos de la llave del bolsillo que no salen de la partida:
 * quién es este juego y qué ventana es ésta. Se reciben y no se adivinan aquí — la silla la
 * sabe la dirección, y quien la parte es la Sala.
 */
export function usarLaSeccionAbierta(
  arcade: string,
  silla: string,
  codigo: string,
  abre: IdDeSeccion | null,
  paso: string,
  meToca: boolean,
): { readonly abierta: IdDeSeccion | null; readonly alAbrir: (id: IdDeSeccion) => void } {
  const [abierta, ponerAbierta] = useState<IdDeSeccion | null>(() =>
    laSeccionQueSeAbre(laSeccionGuardada(arcade, silla, codigo)),
  );
  const pasoVisto = useRef<string | null>(null);

  useEffect(() => {
    if (pasoVisto.current === paso) return;
    const esLaPrimera = pasoVisto.current === null;
    pasoVisto.current = paso;
    if (esLaPrimera || !meToca) return;
    const cual = abre ?? 'ahora';
    guardarLaSeccion(arcade, silla, codigo, cual);
    ponerAbierta(cual);
  }, [arcade, silla, codigo, paso, meToca, abre]);

  const alAbrir = useCallback(
    (id: IdDeSeccion) => {
      ponerAbierta((antes) => {
        const cual = antes === id ? null : id;
        /*
         * PLEGARLA TAMBIÉN SE GUARDA, y con la cadena vacía: `laSeccionQueSeAbre` no la
         * encuentra en la lista y devuelve `null`, o sea «ninguna abierta». Guardar sólo cuando
         * se abre dejaría lo de antes puesto, y al recargar volvería a salir abierta la que se
         * acaba de cerrar a mano.
         */
        guardarLaSeccion(arcade, silla, codigo, cual ?? '');
        return cual;
      });
    },
    [arcade, silla, codigo],
  );

  return { abierta, alAbrir };
}

export interface LoQueVeLaHoja {
  hoja: HojaDelBurgo<Opcion>;
  /** La vista entera: hace falta para poner nombre a una casilla ajena en el componedor. */
  vista: unknown;
  yo: string | null;
  quieto: boolean;
  alElegir: (movimiento: MovimientoDeclarado) => void;
  /**
   * QUÉ SECCIÓN ESTÁ ABIERTA, o `undefined` para que no se pliegue ninguna.
   *
   * `undefined` no es «ninguna abierta»: es «esta pantalla no pliega», que es lo que quiere
   * quien monta la hoja en una columna con sitio de sobra —y lo que hace que el comprobador
   * pueda contar los botones de las seis secciones en un solo render—. `null` sí es «todas
   * plegadas menos las que traen botones».
   */
  abierta?: IdDeSeccion | null;
  alAbrir?: (id: IdDeSeccion) => void;
  /** Abrir la ficha de un jugador. Sin ella, «La mesa entera» no pinta la fila tocable. */
  alTocarJugador?: (asiento: string) => void;
  /** Señalar una casilla para el cartel del pie. Sin ella, las tarjetas no señalan nada. */
  alSenalarCasilla?: (casilla: number | null) => void;
  /**
   * DÓNDE SE COMPONE UN TRATO. Con ella, la sección «El trato» pinta un botón que lleva al
   * componedor de la pantalla —que se abre SOBRE el lienzo, porque para proponer hay que ver
   * el tablero— y no monta el suyo. Sin ella monta el componedor aquí dentro, que es lo que
   * hace falta en el respaldo, donde no hay lienzo sobre el que abrir nada.
   *
   * Las dos formas pintan CERO movimientos —proponer es una puerta—, así que esto no entra en
   * la partición por ningún lado; lo que decide es dónde cabe, no qué se enseña.
   */
  alComponerElTrato?: () => void;
}

/** Lo que se manda al pulsar una opción: la opción ENTERA, sin tocarle nada. */
function comoSeManda(o: Opcion): MovimientoDeclarado {
  return { tipo: o.tipo, carga: o.carga };
}

/**
 * UN BOTÓN DE OPCIÓN, con el rótulo y la ayuda que escribió el juego.
 *
 * Apagado con `aria-disabled` y NUNCA con `disabled`: un `<button>` al que se le pone
 * `disabled` teniendo el foco lo pierde, y aquí dentro —una caja modal con su trampa de
 * foco— eso es escaparse de la trampa. Quien ignora el clic es este `onClick`.
 */
export function BotonDeOpcion({
  opcion,
  quieto,
  alElegir,
}: {
  opcion: Opcion;
  quieto: boolean;
  alElegir: (movimiento: MovimientoDeclarado) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className={quieto ? 'opcion opcion-quieta' : 'opcion opcion-secundaria'}
      aria-disabled={quieto}
      title={opcion.ayuda}
      onClick={() => {
        if (quieto) return;
        alElegir(comoSeManda(opcion));
      }}
    >
      <span className="opcion-texto">
        <span className="opcion-rotulo">{opcion.rotulo}</span>
        {opcion.ayuda.length > 0 ? <span className="opcion-ayuda">{opcion.ayuda}</span> : null}
      </span>
    </button>
  );
}

/** ¿Esta sección trae algún botón? Es lo que decide si se puede plegar. Ver la cabecera. */
function traeBotones(seccion: SeccionDeLaHoja<Opcion>, hoja: HojaDelBurgo<Opcion>): boolean {
  if (seccion.opciones.length > 0) return true;
  if (seccion.id !== 'mios') return false;
  for (const b of hoja.mios) for (const f of b.fichas) if (f.opciones.length > 0) return true;
  return false;
}

/**
 * EL ARMAZÓN DE UNA SECCIÓN: rótulo, renglones y lo que le cuelgue, con su triángulo.
 *
 * El rótulo es un `<button>` DENTRO del `<h2>` y no al revés, que es la única forma que un
 * lector anuncia como encabezado Y como mando: un `<h2>` con `onClick` no se puede pulsar con
 * el teclado y un `<button>` con el rótulo dentro pierde el nivel del encabezado, o sea la
 * navegación por encabezados, que es como se recorre una hoja larga sin ver.
 *
 * Plegada, el contenido NO se pinta —y no se esconde con `hidden`—: lo que hay dentro de un
 * `hidden` sigue en el árbol, y un comprobador que cuente rótulos lo daría por pintado. Como
 * una sección con botones no se pliega nunca (ver la cabecera), esto no puede esconder un
 * movimiento.
 */
function UnaSeccion({
  seccion,
  esLaQueAbre,
  abierta,
  alAbrir,
  quieto,
  alElegir,
  renglones = true,
  children,
}: {
  seccion: SeccionDeLaHoja<Opcion>;
  esLaQueAbre: boolean;
  /** `null` = esta pantalla no pliega: se pinta entera y sin triángulo. */
  abierta: boolean | null;
  alAbrir: (() => void) | null;
  quieto: boolean;
  alElegir: (movimiento: MovimientoDeclarado) => void;
  /**
   * ¿SE PINTAN LOS RENGLONES DE LA SECCIÓN? Sí en todas menos en «Lo mío» con títulos, donde
   * lo que cuelga YA ES el mismo texto: la traducción escribe «Calle X (Los Paseos): 2 casas ·
   * renta 60 €» para quien no pinta fichas —lo explica la cabecera de `lineasDeLoMio`—, y aquí
   * se pintan las dos cosas, así que cada título se decía dos veces y el barrio otras dos (el
   * paréntesis del renglón y el `<h3>` del barrio). La ficha dice todo eso y más.
   */
  renglones?: boolean;
  children?: ReactNode;
}): JSX.Element {
  const dentro = useId();
  const sePinta = abierta === null || abierta;
  return (
    <section
      className={esLaQueAbre ? 'panel burgo-seccion burgo-seccion-toca' : 'panel burgo-seccion'}
      aria-current={esLaQueAbre ? 'step' : undefined}
    >
      <h2 className="rotulo-de-panel">
        {abierta === null || alAbrir === null ? (
          seccion.titulo
        ) : (
          <button
            type="button"
            className="opcion opcion-sobria"
            aria-expanded={abierta}
            aria-controls={dentro}
            onClick={alAbrir}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">{seccion.titulo}</span>
            </span>
            <span aria-hidden="true">{abierta ? '▾' : '▸'}</span>
          </button>
        )}
      </h2>
      <div id={dentro}>
        {sePinta ? (
          <>
            {renglones
              ? seccion.lineas.map((linea, i) => (
                  <p className="letra-chica burgo-renglon" key={`${seccion.id}:${String(i)}`}>
                    {linea}
                  </p>
                ))
              : null}
            {seccion.opciones.length > 0 ? (
              <ul className="opciones">
                {seccion.opciones.map((o) => (
                  <li key={o.id}>
                    <BotonDeOpcion opcion={o} quieto={quieto} alElegir={alElegir} />
                  </li>
                ))}
              </ul>
            ) : null}
            {children}
          </>
        ) : null}
      </div>
    </section>
  );
}

/**
 * LA PUJA LIBRE: un campo numérico entre el mínimo y lo que tengo, de escalón en
 * escalón.
 *
 * Los TRES botones fijos —el mínimo, «+50» y «+100»— ya salen arriba, con las opciones de
 * la sección, porque son opciones normales del juego y así el respaldo puede pujar sin
 * campo ninguno. Esto es la PUERTA: lo que el juego declara y no manda, y lo que permite
 * subir a una cifra que no es ninguna de las tres.
 *
 * `montar` devuelve `null` fuera de los límites o fuera del escalón, y entonces el botón
 * se apaga: la comprobación no está escrita aquí, se le pregunta a la puerta. Con el
 * campo vacío tampoco hay nada que mandar.
 */
export function LaPujaLibre({
  puja,
  quieto,
  alElegir,
}: {
  puja: PujaComponible<Opcion>;
  quieto: boolean;
  alElegir: (movimiento: MovimientoDeclarado) => void;
}): JSX.Element | null {
  const campo = useId();
  const [escrito, ponerEscrito] = useState('');
  if (puja.puerta === null) return null;
  const cuanto = Number.parseInt(escrito, 10);
  const montado = Number.isInteger(cuanto) ? puja.montar(cuanto) : null;
  return (
    <div className="burgo-puja-libre">
      <label className="letra-chica" htmlFor={campo}>
        {`Pujar otra cifra (de ${String(puja.escalon)} en ${String(puja.escalon)}, hasta ${maravedies(puja.maximo)})`}
      </label>
      <input
        id={campo}
        className="campo burgo-campo"
        type="text"
        inputMode="numeric"
        value={escrito}
        placeholder={String(puja.minimo)}
        onChange={(e) => {
          ponerEscrito(e.target.value.replace(/[^0-9]/g, ''));
        }}
      />
      <button
        type="button"
        className={quieto || montado === null ? 'opcion opcion-quieta' : 'opcion opcion-secundaria'}
        aria-disabled={quieto || montado === null}
        onClick={() => {
          if (quieto || montado === null) return;
          ponerEscrito('');
          alElegir(montado);
        }}
      >
        <span className="opcion-texto">
          <span className="opcion-rotulo">Pujar</span>
        </span>
      </button>
    </div>
  );
}

/** Un lado del componedor, vacío. Se parte de aquí y se le va añadiendo. */
const LADO_VACIO: LadoQueSePinta = { mrs: 0, titulos: [], indultos: 0 };

function conTitulo(lado: LadoQueSePinta, casilla: number): LadoQueSePinta {
  const dentro = lado.titulos.indexOf(casilla) >= 0;
  return {
    ...lado,
    titulos: dentro ? lado.titulos.filter((c) => c !== casilla) : [...lado.titulos, casilla],
  };
}

/**
 * EL COMPONEDOR DE UN TRATO: con quién, lo que doy y lo que pido.
 *
 * Lo que se puede poner en cada lado lo declara LA PUERTA —mis títulos sin edificios, mi
 * tope de dinero, mis Salvoconductos; y de él, lo que la vista dice que tiene—, y `montar`
 * devuelve `null` en cuanto algo no cabe. El reductor lo vuelve a validar entero: aquí no
 * se comprueba una regla, se compone una carga con los campos exactos.
 *
 * El dinero va de diez en diez, como la puja, y el tope es el que la puerta declara. Un
 * trato sin nada por ninguno de los dos lados no se monta, y el botón se apaga solo
 * porque `montar` devuelve `null`.
 *
 * ═══ `aQuienDeSalida` NO ES UNA REGLA, ES DE DÓNDE SE VIENE ═══
 *
 * Se abre por dos caminos: desde la sección de la hoja, sin destinatario —hay que elegirlo—,
 * y desde la ficha de un jugador, donde el destinatario ES la persona cuya ficha se estaba
 * mirando. Sin esto, quien viene del segundo camino tiene que volver a buscar en una lista al
 * que acaba de tocar, y la lista de destinos sigue siendo LA DE LA PUERTA: si el que se pasa
 * no está en ella, no se selecciona nadie y el componedor se comporta como si se hubiera
 * abierto por el primer camino.
 */
export function ElComponedorDelTrato({
  trato,
  vista,
  yo,
  quieto,
  alElegir,
  aQuienDeSalida = null,
  alSenalarCasilla,
}: {
  trato: TratoComponible<Opcion>;
  vista: unknown;
  yo: string | null;
  quieto: boolean;
  alElegir: (movimiento: MovimientoDeclarado) => void;
  aQuienDeSalida?: string | null;
  alSenalarCasilla?: (casilla: number | null) => void;
}): JSX.Element | null {
  const campoDoy = useId();
  const campoPido = useId();
  const [aQuien, ponerAQuien] = useState<string | null>(aQuienDeSalida);
  const [doy, ponerDoy] = useState<LadoQueSePinta>(LADO_VACIO);
  const [pido, ponerPido] = useState<LadoQueSePinta>(LADO_VACIO);
  const puerta = trato.puerta;
  if (puerta === null || puerta.a.length === 0) return null;
  const destino = puerta.a.find((d) => d.asiento === aQuien) ?? null;
  const montado = destino === null ? null : trato.montar(destino.asiento, doy, pido);
  const nombreDe = (casilla: number): string => fichaDeCasilla(vista, casilla, yo, []).nombre;
  /* Señalar al posar y al enfocar: el cartel del pie es la única manera de ver DÓNDE está ese solar sin cerrar esto. */
  const senala = (casilla: number | null): { onMouseEnter: () => void; onMouseLeave: () => void; onFocus: () => void; onBlur: () => void } => ({
    onMouseEnter: () => alSenalarCasilla?.(casilla),
    onMouseLeave: () => alSenalarCasilla?.(null),
    onFocus: () => alSenalarCasilla?.(casilla),
    onBlur: () => alSenalarCasilla?.(null),
  });
  return (
    <div className="burgo-componedor">
      <h3 className="letra-chica burgo-componedor-rotulo">{puerta.rotulo}</h3>
      <p className="letra-chica">{puerta.ayuda}</p>
      <ul className="opciones burgo-con-quien">
        {puerta.a.map((d) => (
          <li key={d.asiento}>
            <button
              type="button"
              className={d.asiento === aQuien ? 'opcion opcion-secundaria burgo-elegido' : 'opcion'}
              aria-pressed={d.asiento === aQuien}
              onClick={() => {
                ponerAQuien(d.asiento === aQuien ? null : d.asiento);
                ponerPido(LADO_VACIO);
              }}
            >
              <span className="opcion-texto">
                <span className="mota-de-color" style={{ background: d.color }} aria-hidden="true" />
                <span className="opcion-rotulo">{d.nombre}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="burgo-lado">
        <label className="letra-chica" htmlFor={campoDoy}>
          {`Doy en euros (hasta ${maravedies(puerta.mrsMaximo)})`}
        </label>
        <input
          id={campoDoy}
          className="campo burgo-campo"
          type="text"
          inputMode="numeric"
          value={doy.mrs === 0 ? '' : String(doy.mrs)}
          placeholder="0"
          onChange={(e) => {
            const n = Number.parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
            ponerDoy((antes) => ({ ...antes, mrs: Number.isInteger(n) ? n : 0 }));
          }}
        />
        {puerta.indultos > 0 ? (
          <button
            type="button"
            className={doy.indultos > 0 ? 'opcion opcion-secundaria burgo-elegido' : 'opcion'}
            aria-pressed={doy.indultos > 0}
            onClick={() => {
              ponerDoy((antes) => ({ ...antes, indultos: antes.indultos > 0 ? 0 : 1 }));
            }}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">Doy un Salvoconducto</span>
            </span>
          </button>
        ) : null}
        <ul className="opciones">
          {puerta.titulos.map((c) => (
            <li key={`doy:${String(c)}`}>
              <button
                type="button"
                className={doy.titulos.indexOf(c) >= 0 ? 'opcion opcion-secundaria burgo-elegido' : 'opcion'}
                aria-pressed={doy.titulos.indexOf(c) >= 0}
                {...senala(c)}
                onClick={() => {
                  ponerDoy((antes) => conTitulo(antes, c));
                }}
              >
                <span className="opcion-texto">
                  <span className="opcion-rotulo">{nombreDe(c)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="burgo-lado">
        <label className="letra-chica" htmlFor={campoPido}>
          Pido en euros
        </label>
        <input
          id={campoPido}
          className="campo burgo-campo"
          type="text"
          inputMode="numeric"
          value={pido.mrs === 0 ? '' : String(pido.mrs)}
          placeholder="0"
          onChange={(e) => {
            const n = Number.parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
            ponerPido((antes) => ({ ...antes, mrs: Number.isInteger(n) ? n : 0 }));
          }}
        />
        {destino !== null && destino.indultos > 0 ? (
          <button
            type="button"
            className={pido.indultos > 0 ? 'opcion opcion-secundaria burgo-elegido' : 'opcion'}
            aria-pressed={pido.indultos > 0}
            onClick={() => {
              ponerPido((antes) => ({ ...antes, indultos: antes.indultos > 0 ? 0 : 1 }));
            }}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">Pido un Salvoconducto</span>
            </span>
          </button>
        ) : null}
        <ul className="opciones">
          {(destino?.titulos ?? []).map((c) => (
            <li key={`pido:${String(c)}`}>
              <button
                type="button"
                className={pido.titulos.indexOf(c) >= 0 ? 'opcion opcion-secundaria burgo-elegido' : 'opcion'}
                aria-pressed={pido.titulos.indexOf(c) >= 0}
                {...senala(c)}
                onClick={() => {
                  ponerPido((antes) => conTitulo(antes, c));
                }}
              >
                <span className="opcion-texto">
                  <span className="opcion-rotulo">{nombreDe(c)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="letra-chica burgo-renglon">
        {`El dinero va de ${String(DE_DIEZ_EN_DIEZ)} en ${String(DE_DIEZ_EN_DIEZ)}; un trato vacío por los dos lados no se propone.`}
      </p>
      <button
        type="button"
        className={quieto || montado === null ? 'opcion opcion-quieta' : 'opcion opcion-secundaria'}
        aria-disabled={quieto || montado === null}
        onClick={() => {
          if (quieto || montado === null) return;
          ponerDoy(LADO_VACIO);
          ponerPido(LADO_VACIO);
          alElegir(montado);
        }}
      >
        <span className="opcion-texto">
          <span className="opcion-rotulo">Proponer</span>
        </span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// La tarjeta de una casilla: la misma para la mía y para la de cualquiera
// ---------------------------------------------------------------------------

/**
 * ═══ LA TARJETA DE UNA CASILLA, ENTERA, Y SIRVE PARA CUALQUIERA ═══
 *
 * ═══ EL FALLO ═══
 *
 * Había dos maneras de leer una casilla y las dos estaban mal por el mismo motivo. En «Lo
 * mío» se pintaba una tarjeta con nombre, renglones y tabla de rentas, pero SÓLO para mis
 * títulos. Y al tocar una casilla del anillo salía un menú cuya nota era
 * `ficha.lineas.join(' · ')`: las seis líneas de la ficha —barrio, quién tiene qué en ese
 * barrio, precio, precio de la casa, estado, renta de hoy, hipoteca— aplastadas en UN renglón
 * gris de `letra-chica`, sin tabla de rentas, sin el color de la acera y sin el color del
 * dueño. O sea que la decisión que decide la partida —¿compro esto?— se tomaba leyendo una
 * frase de ciento y pico caracteres cortada por la mitad.
 *
 * La traducción ya daba todo lo que falta, y lo daba para CUALQUIER casilla: `barrio` con su
 * color, `dueno` con el suyo, `rentas` fila a fila con `actual` en la de hoy, `casa`,
 * `casas`, `esPosada`, `empenado`, `solaresDelBarrio` —cuánto le falta a alguien para el
 * barrio entero, que es lo único que se mira antes de comprar— y `cartel`. Lo que faltaba era
 * un mueble que lo pintara.
 *
 * ═══ LOS BOTONES NO SON DE LA TARJETA, Y ESO NO ES PEREZA ═══
 *
 * `children` es donde van, y quien la monta decide: en «Lo mío» son la lista de la ficha; en
 * el menú de una casilla del anillo son la lista del propio `ElijeUna`, que ya sabe pintarlas
 * con su rótulo y su ayuda y ya tiene la trampa de foco alrededor. Si la tarjeta los pintara
 * ella, el menú tendría DOS listas con los mismos objetos —la suya y la de la tarjeta— y eso
 * es un movimiento enseñado dos veces en la misma caja.
 */
export function LaTarjetaDeUnaCasilla({
  ficha,
  alSenalarCasilla,
  children,
}: {
  ficha: FichaDeCasilla<Opcion>;
  alSenalarCasilla?: (casilla: number | null) => void;
  children?: ReactNode;
}): JSX.Element {
  const construido = ficha.esPosada ? UN_HOTEL : UNA_CASA.repeat(Math.max(0, ficha.casas));
  return (
    <article className="burgo-ficha">
      <h4 className="burgo-ficha-nombre">
        {ficha.barrio === null ? null : (
          <span className="mota-de-color" style={{ background: ficha.barrio.color }} aria-hidden="true" />
        )}
        {ficha.nombre}
      </h4>
      {/*
        EL DUEÑO CON SU COLOR, que es el mismo del peón en el anillo y el mismo de su fila del
        marcador. Escrito sólo con el nombre —«De Ana»— hay que ir al marcador a saber cuál de
        los peones es Ana; con la mota, la casilla y el peón se emparejan sin leer nada.
      */}
      {ficha.dueno === null ? null : (
        <p className="letra-chica burgo-renglon">
          <span className="mota-de-color" style={{ background: ficha.dueno.color }} aria-hidden="true" />
          {ficha.esMio ? `${ficha.dueno.nombre} (tú)` : ficha.dueno.nombre}
        </p>
      )}
      {/*
        LO CONSTRUIDO, DIBUJADO. Va `aria-hidden` y la palabra la dice `ficha.estado`, que
        entra por `lineas`: un lector que dictara cuatro cuadrados no diría nada.
      */}
      {construido.length === 0 ? null : (
        <p className="burgo-renglon" aria-hidden="true">
          {construido}
        </p>
      )}
      {ficha.lineas.map((linea, i) => (
        <p className="letra-chica burgo-renglon" key={`${String(ficha.casilla)}:${String(i)}`}>
          {linea}
        </p>
      ))}
      {ficha.rentas.length > 0 ? (
        <ul className="burgo-rentas" role="list">
          {ficha.rentas.map((r) => (
            <li key={`${String(ficha.casilla)}:${r.rotulo}`} className={r.actual ? 'burgo-renta-hoy' : undefined}>
              <span className="burgo-renta-rotulo">{r.rotulo}</span>
              <span className="burgo-renta-cifra">{maravedies(r.cuanto)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {ficha.solaresDelBarrio.length > 0 ? (
        <LosSolaresDelBarrio solares={ficha.solaresDelBarrio} alSenalarCasilla={alSenalarCasilla} />
      ) : null}
      {children}
    </article>
  );
}

/**
 * LOS SOLARES DEL BARRIO, con quién tiene cada uno.
 *
 * Es lo que de verdad se mira antes de comprar —a quién le falta uno para cobrar doble— y es
 * lo que un renglón de texto («Los Paseos: 3 solares · Ana 2 · el Ayuntamiento 1», que la
 * traducción ya escribe y que sigue estando en `lineas`) no dice: CUÁL le falta. Cada solar
 * es un botón que señala esa casilla en el cartel del pie, así que desde aquí se recorre el
 * barrio entero sin cerrar la tarjeta.
 *
 * El de la casilla que se está mirando va marcado con `aria-current`, no con el color: en un
 * barrio de tres solares del mismo color, otro color más no distingue nada.
 */
function LosSolaresDelBarrio({
  solares,
  alSenalarCasilla,
}: {
  solares: readonly SolarDelBarrio[];
  alSenalarCasilla?: (casilla: number | null) => void;
}): JSX.Element {
  return (
    <ul className="renglones burgo-solares-del-barrio" role="list">
      {solares.map((s) => {
        /*
         * LO QUE DICE CADA RENGLÓN ES DE QUIÉN ES, Y NADA MÁS. Lo construido no entra aquí a
         * propósito: `SolarDelBarrio` trae `casas` pero no si son un hotel —eso lo separa
         * `esPosada`, que es de la ficha entera—, y escribir «5 casas» donde hay un hotel sería
         * este cliente contando una regla por su cuenta. Lo que se mira en esta lista es a quién
         * le falta un solar para el barrio entero, que es exactamente el dueño; lo construido
         * está en la tarjeta de esa casilla, a un toque de aquí.
         */
        const dicho = `${s.nombre}: ${s.dueno === null ? 'del Ayuntamiento' : `de ${s.dueno.nombre}`}${s.empenado ? ', hipotecado' : ''}`;
        return (
          <li key={s.casilla}>
            <button
              type="button"
              className="opcion opcion-sobria"
              aria-current={s.esEsta ? 'true' : undefined}
              aria-label={dicho}
              title={dicho}
              onMouseEnter={() => alSenalarCasilla?.(s.casilla)}
              onMouseLeave={() => alSenalarCasilla?.(null)}
              onFocus={() => alSenalarCasilla?.(s.casilla)}
              onBlur={() => alSenalarCasilla?.(null)}
              onClick={() => alSenalarCasilla?.(s.casilla)}
            >
              <span className="opcion-texto">
                <span className="mota-de-color" style={{ background: s.dueno === null ? 'transparent' : s.dueno.color }} aria-hidden="true" />
                <span className="opcion-rotulo">{s.rotulo}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * LA FICHA DE UN TÍTULO MÍO: la tarjeta de siempre con sus obras debajo.
 *
 * Son LOS MISMOS objetos que la casilla tocable del anillo abre al tocarla —la traducción
 * los devuelve por identidad—, así que la obra tiene UN botón, el de esta ficha, y un
 * atajo, la casilla. La partición los cuenta como uno.
 */
function LaFichaDeUnTitulo({
  ficha,
  quieto,
  alElegir,
  alSenalarCasilla,
}: {
  ficha: FichaDeCasilla<Opcion>;
  quieto: boolean;
  alElegir: (movimiento: MovimientoDeclarado) => void;
  alSenalarCasilla?: (casilla: number | null) => void;
}): JSX.Element {
  return (
    <LaTarjetaDeUnaCasilla ficha={ficha} alSenalarCasilla={alSenalarCasilla}>
      {ficha.opciones.length > 0 ? (
        <ul className="opciones">
          {ficha.opciones.map((o) => (
            <li key={o.id}>
              <BotonDeOpcion opcion={o} quieto={quieto} alElegir={alElegir} />
            </li>
          ))}
        </ul>
      ) : null}
    </LaTarjetaDeUnaCasilla>
  );
}

// ---------------------------------------------------------------------------
// La ficha de un jugador
// ---------------------------------------------------------------------------

/**
 * ═══ LA FICHA DE UN JUGADOR: LO QUE SE PERDÍA AL TOCAR UN PEÓN ═══
 *
 * Tocar un peón daba UNA línea —«Ana · 1.500 € · 3 títulos»— dentro de un menú sin ninguna
 * opción: el renglón del marcador otra vez, en una caja modal. Lo que se quiere saber mirando
 * a otro es lo que esa línea no dice: si le falta un solar para el barrio entero, si está en
 * la Comisaría, cuánto vale todo lo suyo, y —lo único que se puede HACER con eso— si le puedo
 * proponer un trato y con qué. `fichaDeJugador` lo junta todo; aquí se pinta.
 *
 * NO PINTA NI UN MOVIMIENTO, y por eso no entra en la partición por ningún lado: aceptar,
 * rechazar y retirar tienen su sitio en la caja de los tratos, y proponer es una PUERTA, que
 * no se pinta nunca. «Proponer trato» es cromo: abre el componedor y no manda nada.
 */
export function LaFichaDeUnJugador({
  ficha,
  alProponerle,
  alSenalarCasilla,
}: {
  ficha: FichaDeJugador;
  /** Abrir el componedor con él como destinatario, o `null` si el juego no me abre la puerta. */
  alProponerle: (() => void) | null;
  alSenalarCasilla?: (casilla: number | null) => void;
}): JSX.Element {
  return (
    <div className="burgo-ficha-de-jugador">
      <p className="burgo-renglon">
        <span className="mota-de-color" style={{ background: ficha.color }} aria-hidden="true" />
        {ficha.soyYo ? `${ficha.nombre} (tú)` : ficha.nombre}
      </p>
      {ficha.lineas.map((linea, i) => (
        <p className="letra-chica burgo-renglon" key={`${ficha.asiento}:${String(i)}`}>
          {linea}
        </p>
      ))}
      {ficha.barrios.map((b) => (
        <div className="burgo-barrio" key={b.id}>
          <h3 className="letra-chica burgo-barrio-rotulo">
            <span className="mota-de-color" style={{ background: b.color }} aria-hidden="true" />
            {b.entero ? `${b.nombre} · barrio entero` : b.nombre}
          </h3>
          <ul className="renglones" role="list">
            {b.titulos.map((t) => (
              <li key={t.casilla}>
                <button
                  type="button"
                  className="opcion opcion-sobria"
                  aria-label={`${t.nombre}: ${t.estado}`}
                  title={`${t.nombre}: ${t.estado}`}
                  onMouseEnter={() => alSenalarCasilla?.(t.casilla)}
                  onMouseLeave={() => alSenalarCasilla?.(null)}
                  onFocus={() => alSenalarCasilla?.(t.casilla)}
                  onBlur={() => alSenalarCasilla?.(null)}
                  onClick={() => alSenalarCasilla?.(t.casilla)}
                >
                  <span className="opcion-texto">
                    <span className="opcion-rotulo">{t.nombre}</span>
                    <span className="opcion-ayuda">{t.estado}</span>
                  </span>
                  <span aria-hidden="true">{t.esPosada ? UN_HOTEL : UNA_CASA.repeat(Math.max(0, t.casas))}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {ficha.sueltos.length > 0 ? (
        <ul className="renglones" role="list">
          {ficha.sueltos.map((t) => (
            <li key={t.casilla}>
              <button
                type="button"
                className="opcion opcion-sobria"
                aria-label={`${t.nombre}: ${t.estado}`}
                title={`${t.nombre}: ${t.estado}`}
                onMouseEnter={() => alSenalarCasilla?.(t.casilla)}
                onMouseLeave={() => alSenalarCasilla?.(null)}
                onFocus={() => alSenalarCasilla?.(t.casilla)}
                onBlur={() => alSenalarCasilla?.(null)}
                onClick={() => alSenalarCasilla?.(t.casilla)}
              >
                <span className="opcion-texto">
                  <span className="opcion-rotulo">{t.nombre}</span>
                  <span className="opcion-ayuda">{t.estado}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {alProponerle === null ? null : (
        <button type="button" className="opcion opcion-secundaria" onClick={alProponerle}>
          <span className="opcion-texto">
            <span className="opcion-rotulo">{`Proponer trato a ${ficha.nombre}`}</span>
          </span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// La crónica
// ---------------------------------------------------------------------------

/**
 * EL RELATO DE LA PARTIDA, acumulado por jugada.
 *
 * La vista trae SÓLO EL ÚLTIMO pregón —«Bea cayó en Calle Mayor y pagó 350 € a Ana»— porque
 * el estado del juego no puede llevar histórico, así que quien quiera el relato tiene que
 * acumularlo. Lo hace `laCronicaConLaVista` en `shared/`, escrito una vez para los dos
 * clientes; aquí sólo se pinta lo que trae, y en el orden en que viene (lo último arriba).
 *
 * NO es una región viva: la única de esta pantalla es el aviso de la cinta, y una crónica
 * `aria-live` anunciaría la partida entera renglón a renglón encima de él.
 */
export function LaCronicaDelBurgo({ cronica }: { cronica: readonly RenglonDeLaCronica[] }): JSX.Element | null {
  if (cronica.length === 0) return null;
  return (
    <section className="panel burgo-seccion">
      <h2 className="rotulo-de-panel">La crónica</h2>
      <ul className="renglones" role="list">
        {cronica.map((r) => (
          <li key={r.jugada} className="letra-chica">
            {r.texto}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Las dos puertas, sueltas: lo que el respaldo no tenía
// ---------------------------------------------------------------------------

/**
 * ═══ LAS DOS PUERTAS, PARA UNA PANTALLA QUE NO MONTA LA HOJA ENTERA ═══
 *
 * El respaldo del Burgo —sin WebGL, sin `.glb`, en Node o con más jugadores que colores de
 * peón— se juega con el retablo, sus acciones y los botones que ninguna acción recoge. Ahí
 * TODO movimiento tiene su sitio, y por eso la partición de esa pantalla ya estaba comprada.
 * Lo que no tenía sitio eran las dos PUERTAS, que no son movimientos y por eso nadie las echó
 * de menos contando botones: sin ellas, en el respaldo no se puede pujar una cifra libre ni
 * proponer un trato. Con una mesa de cinco o de seis —donde el respaldo no es respaldo, es la
 * única pantalla— eso es media mitad del juego apagada.
 *
 * Esto monta EXACTAMENTE esas dos y nada más, y por eso no toca la partición del retablo: no
 * pinta ni un movimiento. La hoja entera no cabe ahí —sus secciones repetirían las acciones
 * del tablero y los botones sueltos, y eso sí sería un movimiento dos veces—, así que se monta
 * lo que falta y no lo que ya está.
 */
export function LasPuertasDelBurgo({
  hoja,
  vista,
  yo,
  quieto,
  alElegir,
}: {
  hoja: HojaDelBurgo<Opcion>;
  vista: unknown;
  yo: string | null;
  quieto: boolean;
  alElegir: (movimiento: MovimientoDeclarado) => void;
}): JSX.Element | null {
  const hayPuja = hoja.puja !== null && hoja.puja.puerta !== null;
  const hayTrato = hoja.trato !== null && hoja.trato.puerta !== null && hoja.trato.puerta.a.length > 0;
  if (!hayPuja && !hayTrato) return null;
  return (
    <div className="burgo-hoja">
      {hoja.puja !== null && hayPuja ? (
        <section className="panel burgo-seccion">
          <h2 className="rotulo-de-panel">La subasta</h2>
          <LaPujaLibre puja={hoja.puja} quieto={quieto} alElegir={alElegir} />
        </section>
      ) : null}
      {hoja.trato !== null && hayTrato ? (
        <section className="panel burgo-seccion">
          <h2 className="rotulo-de-panel">El trato</h2>
          <ElComponedorDelTrato trato={hoja.trato} vista={vista} yo={yo} quieto={quieto} alElegir={alElegir} />
        </section>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// La hoja entera
// ---------------------------------------------------------------------------

/** Las seis secciones de la hoja que no están ya en pantalla, en el orden del §6.3. */
export function LasHojasDelBurgo({
  hoja,
  vista,
  yo,
  quieto,
  alElegir,
  abierta,
  alAbrir,
  alTocarJugador,
  alSenalarCasilla,
  alComponerElTrato,
}: LoQueVeLaHoja): JSX.Element {
  const porId = new Map<IdDeSeccion, SeccionDeLaHoja<Opcion>>();
  for (const s of hoja.secciones) porId.set(s.id, s);
  /* `undefined` = esta pantalla no pliega. Ver `LoQueVeLaHoja.abierta`. */
  const pliega = abierta !== undefined && alAbrir !== undefined;
  return (
    <div className="burgo-hoja">
      {ORDEN_DE_LA_HOJA.filter((id) => YA_ESTAN_FUERA.indexOf(id) < 0).map((id) => {
        const seccion = porId.get(id);
        if (seccion === undefined || !seccion.hayAlgo) return null;
        const esLaQueAbre = hoja.abre === id;
        /*
         * UNA SECCIÓN CON BOTONES NO SE PLIEGA NUNCA: plegar un movimiento es esconderlo, y la
         * criba lo seguiría contando como pintado. Ver la cabecera de este fichero.
         */
        const seDeja = pliega && !traeBotones(seccion, hoja);
        const estaAbierta = seDeja ? abierta === id : null;
        const abrir = seDeja && alAbrir !== undefined ? () => { alAbrir(id); } : null;
        if (id === 'almoneda' && hoja.puja !== null) {
          return (
            <UnaSeccion key={id} seccion={seccion} esLaQueAbre={esLaQueAbre} abierta={estaAbierta} alAbrir={abrir} quieto={quieto} alElegir={alElegir}>
              <LaPujaLibre puja={hoja.puja} quieto={quieto} alElegir={alElegir} />
            </UnaSeccion>
          );
        }
        if (id === 'trato' && hoja.trato !== null) {
          return (
            <UnaSeccion key={id} seccion={seccion} esLaQueAbre={esLaQueAbre} abierta={estaAbierta} alAbrir={abrir} quieto={quieto} alElegir={alElegir}>
              {alComponerElTrato === undefined ? (
                <ElComponedorDelTrato
                  trato={hoja.trato}
                  vista={vista}
                  yo={yo}
                  quieto={quieto}
                  alElegir={alElegir}
                  alSenalarCasilla={alSenalarCasilla}
                />
              ) : hoja.trato.puerta === null || hoja.trato.puerta.a.length === 0 ? null : (
                <button type="button" className="opcion opcion-secundaria" onClick={alComponerElTrato}>
                  <span className="opcion-texto">
                    <span className="opcion-rotulo">{hoja.trato.puerta.rotulo}</span>
                    <span className="opcion-ayuda">Se compone sobre el tablero, para ver dónde están sus solares.</span>
                  </span>
                </button>
              )}
            </UnaSeccion>
          );
        }
        if (id === 'mios') {
          /*
           * SIN RENGLONES: AQUÍ LAS FICHAS SON LOS RENGLONES. Lo que cuelga debajo son los
           * mismos títulos que la traducción manda como renglones de la sección —los manda para
           * quien NO pinta fichas, y lo explica la cabecera de `lineasDeLoMio`—, así que
           * pintando las dos cosas cada título se decía dos veces, y el barrio otras dos: en el
           * paréntesis del renglón y en el `<h3>` del barrio.
           *
           * Y NO HAY QUE GUARDARSE DEL CASO VACÍO, aunque lo parezca: la traducción manda
           * «Todavía no tienes ningún título.» como único renglón cuando no tienes ninguno, pero
           * esa sección NO LLEGA hasta aquí —arriba se devuelve `null` en cuanto `!hayAlgo`, y
           * para «Lo mío» `hayAlgo` es `mios.length > 0`—. Esa frase no se pinta en este cliente
           * ni antes ni ahora; quien la enseña es la app, que no filtra por `hayAlgo`.
           */
          return (
            <UnaSeccion key={id} seccion={seccion} esLaQueAbre={esLaQueAbre} abierta={estaAbierta} alAbrir={abrir} quieto={quieto} alElegir={alElegir} renglones={false}>
              {hoja.mios.map((barrio) => (
                <div className="burgo-barrio" key={barrio.id}>
                  <h3 className="letra-chica burgo-barrio-rotulo">
                    <span className="mota-de-color" style={{ background: barrio.color }} aria-hidden="true" />
                    {barrio.nombre}
                  </h3>
                  {barrio.fichas.map((ficha) => (
                    <LaFichaDeUnTitulo
                      key={ficha.casilla}
                      ficha={ficha}
                      quieto={quieto}
                      alElegir={alElegir}
                      alSenalarCasilla={alSenalarCasilla}
                    />
                  ))}
                </div>
              ))}
            </UnaSeccion>
          );
        }
        if (id === 'mesa' && alTocarJugador !== undefined) {
          /*
           * LA FILA TOCABLE DE CADA JUGADOR, que es como se llega a su ficha CON EL TECLADO: un
           * peón del anillo se toca con el ratón y no está en el orden del tabulador, así que
           * sin esto la ficha de un jugador —y con ella el componedor de un trato— es una
           * pantalla a la que sólo se llega con puntero.
           *
           * Son cromo y no movimientos: abren una ficha de LECTURA, así que no entran en la
           * partición ni le pueden robar un botón a nadie.
           */
          return (
            <UnaSeccion key={id} seccion={seccion} esLaQueAbre={esLaQueAbre} abierta={estaAbierta} alAbrir={abrir} quieto={quieto} alElegir={alElegir}>
              <ul className="opciones">
                {hoja.marcador.jugadores.map((j) => (
                  <li key={j.asiento}>
                    <button
                      type="button"
                      className="opcion opcion-sobria"
                      aria-label={`Ficha de ${j.nombre}. ${j.linea}`}
                      title={j.linea}
                      onClick={() => {
                        alTocarJugador(j.asiento);
                      }}
                    >
                      <span className="opcion-texto">
                        <span className="mota-de-color" style={{ background: j.color }} aria-hidden="true" />
                        <span className="opcion-rotulo">{j.nombre}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </UnaSeccion>
          );
        }
        return (
          <UnaSeccion key={id} seccion={seccion} esLaQueAbre={esLaQueAbre} abierta={estaAbierta} alAbrir={abrir} quieto={quieto} alElegir={alElegir} />
        );
      })}
    </div>
  );
}
