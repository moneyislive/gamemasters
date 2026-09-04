/**
 * EL CATÁLOGO: lo que hay instalado, leído del servidor y no de una lista de aquí.
 *
 * ═══ POR QUÉ SE PREGUNTA Y NO SE IMPORTA ═══
 *
 * Los cinco arcades del binario están en `shared/arcade/juegos` y se podrían
 * importar: saldría una lista sin una sola petición. Y sería un catálogo que
 * MIENTE en el único caso que le da valor a esta pantalla — el servidor puede
 * tener instalados arcades que este empaquetado no conoce, porque entraron por
 * `ARCADES_EXTERNOS` desde un fichero suelto y nadie los compiló nunca. Esa es la
 * gracia entera: en el escritorio salen sin que nadie los compile.
 *
 * Además una lista importada no sabría qué arcades ha decidido servir ESTE
 * servidor. `GET /api/arcade` contesta con `arcadesInstalados()`, que es la
 * verdad de ese proceso, y es la única fuente honrada.
 *
 * ═══ LOS TRES ESTADOS, Y NINGUNO SE PUEDE CONFUNDIR CON OTRO ═══
 *
 *   · `pidiendo` — todavía no se sabe. NO se pinta una lista vacía, porque una
 *     lista vacía dice «no hay arcades» y eso todavía no lo sabe nadie.
 *   · `sin-servidor` — la petición falló o contestó algo que no era un catálogo.
 *     Se dice, con lo que contestó, y con un botón de volver a intentarlo. Un
 *     servidor caído pintado como «no hay arcades instalados» es la peor
 *     respuesta posible: manda a quien mira a buscar el fallo donde no está.
 *   · `puesto` — el servidor contestó. Si la lista viene vacía, entonces sí se
 *     dice que no hay ninguno, porque ahora sí se sabe.
 *
 * ═══ Y LO QUE LLEGA POR EL CABLE NO SE FIRMA CON UN `as` ═══
 *
 * Aquí se comprobaba `Array.isArray(datos.arcades)` y el resto se firmaba con un
 * `as ArcadeDelCatalogo[]`: cero comprobaciones sobre un solo elemento. La cuenta
 * de lecturas a pelo que salían de ese `as` era de SEIS —`id` como clave, `nombre`,
 * `gancho`, `jugadores.minimo`, `jugadores.maximo` y `mueble` impreso crudo— y sólo
 * una estaba a la defensiva. Un manifiesto de `ARCADES_EXTERNOS` sin `jugadores`
 * lanza un `TypeError` DURANTE el render, y esta pantalla no se rompe sola: el
 * throw sube hasta `RedDeSeguridad` y sustituye la Sala ENTERA por «esta pantalla
 * se ha roto». O sea que un arcade de fuera mal escrito borraba de la pantalla los
 * otros cinco que estaban perfectos.
 *
 * Se contesta con los dos filtros que la app ya tiene, y son dos preguntas
 * distintas: `losQueSePuedenPintar` decide si una tarjeta EXISTE (lo mismo que
 * `loQueLlega` en `app/src/arcade/del-servidor.ts`), y `leerAforo` decide si un
 * ADORNO se puede dibujar. Un arcade al que le falte el aforo sale igual, sin raíl.
 *
 * Y lo que se cae SE DICE —`ilegibles`, en el renglón de estado—, porque una lista
 * que esconde en silencio lo que no supo leer es la mentira por omisión que
 * `muebles.ts` existe para no cometer.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { dondeSeJuega, MUEBLES } from './muebles';
import type { ArcadeDelCatalogo } from './muebles';

export type ElCatalogo =
  | { estado: 'pidiendo' }
  | {
      estado: 'puesto';
      arcades: ArcadeDelCatalogo[];
      /** Cuántos elementos de la lista no tenían forma de tarjeta. Nunca se callan. */
      ilegibles?: number;
    }
  | { estado: 'sin-servidor'; porque: string };

/**
 * LOS CINCO CAMPOS QUE ESTA PANTALLA PINTA O INDEXA, MIRADOS UNO A UNO.
 *
 * Son los mismos cinco de `loQueLlega`, y por el mismo motivo: `nombre` o `mueble`
 * llegando como objeto no dan un dato feo, dan «Objects are not valid as a React
 * child» durante el render. `id` se mira porque es la CLAVE de la rejilla y además
 * el enlace de la tarjeta, y `sede` porque la ficha AFIRMA con todas las letras
 * dónde corre la partida: la comparación `sede === 'servidor' ? … : …` no revienta
 * con un valor raro, imprime «EN EL APARATO» y miente en silencio.
 *
 * `jugadores`, `tickHz` y `marcador` NO se miran aquí: son adornos, y un adorno que
 * falta es una tarjeta con un hueco, no una tarjeta que no existe. Los mira quien
 * los dibuja.
 */
function losQueSePuedenPintar(lista: readonly unknown[]): {
  buenos: ArcadeDelCatalogo[];
  ilegibles: number;
} {
  const buenos: ArcadeDelCatalogo[] = [];
  let ilegibles = 0;
  for (const suelto of lista) {
    if (typeof suelto !== 'object' || suelto === null) {
      ilegibles++;
      continue;
    }
    const m = suelto as Partial<ArcadeDelCatalogo>;
    const bien =
      typeof m.id === 'string' &&
      m.id.length > 0 &&
      typeof m.nombre === 'string' &&
      m.nombre.length > 0 &&
      typeof m.gancho === 'string' &&
      typeof m.mueble === 'string' &&
      (m.sede === 'dispositivo' || m.sede === 'servidor');
    if (!bien) {
      ilegibles++;
      continue;
    }
    buenos.push(m as ArcadeDelCatalogo);
  }
  return { buenos, ilegibles };
}

export function usarElCatalogo(): { catalogo: ElCatalogo; reintentar: () => void } {
  const [catalogo, ponerCatalogo] = useState<ElCatalogo>({ estado: 'pidiendo' });
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const pedir = useCallback(() => {
    void (async () => {
      try {
        const r = await fetch('/api/arcade');
        if (!r.ok) throw new Error(`el servidor contestó ${String(r.status)}`);
        const datos = (await r.json()) as { arcades?: unknown };
        /*
         * Se comprueba que lo que llegó ES una lista antes de creérselo. Un
         * `index.html` devuelto por un comodín mal ordenado —el fallo clásico de
         * montar esto detrás de otra ruta— produce un `200` con un cuerpo que no
         * es JSON, o un JSON sin `arcades`. Sin esta línea, eso se pintaría como
         * un catálogo vacío, que es otra vez decir «no hay arcades» cuando lo
         * que pasa es que no se ha hablado con la API.
         */
        if (!Array.isArray(datos.arcades)) {
          throw new Error('la respuesta no traía ninguna lista de arcades');
        }
        const leido = losQueSePuedenPintar(datos.arcades);
        if (!vivo.current) return;
        ponerCatalogo({ estado: 'puesto', arcades: leido.buenos, ilegibles: leido.ilegibles });
      } catch (error) {
        if (!vivo.current) return;
        ponerCatalogo({
          estado: 'sin-servidor',
          porque: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, []);

  useEffect(() => {
    pedir();
  }, [pedir]);

  const reintentar = useCallback(() => {
    /*
     * Volver a `pidiendo` al reintentar es correcto AQUÍ y solo aquí: se
     * reintenta desde el estado de fallo, donde no hay ninguna lista en pantalla
     * que quitar. Si esto se usara para refrescar un catálogo ya pintado, este
     * `ponerCatalogo` sería el parpadeo que la pantalla existe para no tener.
     */
    ponerCatalogo({ estado: 'pidiendo' });
    pedir();
  }, [pedir]);

  return { catalogo, reintentar };
}

// ---------------------------------------------------------------------------
// Lo que se ve
// ---------------------------------------------------------------------------

export interface LoQueSeEnsena {
  catalogo: ElCatalogo;
  reintentar: () => void;
  /** A dónde lleva una tarjeta que se puede jugar aquí. */
  enlaceDe: (arcade: ArcadeDelCatalogo) => string;
}

/**
 * EL RENGLÓN QUE DICE EN QUÉ ESTADO ESTÁ LA PANTALLA, Y POR QUÉ ES TEXTO.
 *
 * Mientras se pedía, esta pantalla no decía NADA que un lector de pantalla pudiera
 * oír: los seis fantasmas van con `aria-hidden="true"`, el único `aria-busy` está
 * en un contenedor vacío y el `<h2>` que se repinta al fallar otra vez es el mismo
 * texto de antes. O sea que quien no mira pulsaba «Volver a preguntar» y se quedaba
 * en silencio, sin saber si estaba pidiendo, si había vuelto a fallar o si había
 * llegado la lista.
 *
 * Va en `role="status"` —cortés, no interrumpe— y está SIEMPRE montado, en el mismo
 * sitio del árbol: una región viva que aparece y desaparece no anuncia nada, porque
 * lo que se anuncia es el cambio de su contenido. Por eso los cuatro estados tienen
 * frase, incluido el bueno.
 *
 * Y NO DICE «no hay arcades» mientras pide, que es la regla entera de este fichero:
 * dice que se está preguntando, que es lo único que se sabe.
 */
function loQuePasa(catalogo: ElCatalogo): string {
  if (catalogo.estado === 'pidiendo') return 'Preguntando al servidor qué hay instalado…';
  if (catalogo.estado === 'sin-servidor') {
    return 'El servidor no ha contestado, así que aquí no se enseña ninguna máquina.';
  }
  const cuantas = catalogo.arcades.length;
  const ilegibles = catalogo.ilegibles ?? 0;
  const maquinas =
    cuantas === 1 ? '1 máquina instalada' : `${String(cuantas)} máquinas instaladas`;
  if (ilegibles === 0) return `${maquinas}.`;
  const caidas =
    ilegibles === 1 ? 'una ficha que' : `${String(ilegibles)} fichas que`;
  return `${maquinas}, y ${caidas} este cliente no ha sabido leer.`;
}

export function Catalogo({ catalogo, reintentar, enlaceDe }: LoQueSeEnsena): JSX.Element {
  /*
   * ═══ EL FOCO NO SE PIERDE AL REINTENTAR ═══
   *
   * «Volver a preguntar» se desmonta al volver a `pidiendo` —es el único elemento
   * enfocable de esa pantalla— así que `document.activeElement` volvía a `<body>`:
   * con teclado había que recorrer la cabecera entera otra vez para poder pulsarlo
   * una segunda vez.
   *
   * Se devuelve donde de verdad sirve: al propio botón si la petición ha vuelto a
   * fallar (y otro Intro reintenta), y al renglón de estado si ha ido bien, que
   * queda justo encima de la rejilla y deja la primera tarjeta a un tabulador.
   * Sólo se mueve cuando lo pidió una PULSACIÓN: robar el foco en la primera carga,
   * que es la que nadie ha pedido, sería el fallo contrario.
   */
  const rotulo = useRef<HTMLParagraphElement | null>(null);
  const boton = useRef<HTMLButtonElement | null>(null);
  const sePidioAMano = useRef(false);

  useEffect(() => {
    if (!sePidioAMano.current) return;
    if (catalogo.estado === 'pidiendo') return;
    sePidioAMano.current = false;
    (boton.current ?? rotulo.current)?.focus();
  }, [catalogo]);

  const volverAPreguntar = useCallback(() => {
    sePidioAMano.current = true;
    reintentar();
  }, [reintentar]);

  let cuerpo: JSX.Element;

  if (catalogo.estado === 'pidiendo') {
    /*
     * ═══ EL ESTADO QUE NO PUEDE PARPADEAR ═══
     *
     * Se pintan tarjetas fantasma DEL MISMO TAMAÑO que las de verdad. No es
     * decoración: lo que se siente como parpadeo no es que aparezca texto, es
     * que la página salte. Con un hueco de altura cero, la llegada del catálogo
     * empuja hacia abajo todo lo que había y el ojo lo lee como un tirón.
     *
     * Y no hay ninguna palabra que diga «no hay arcades»: mientras se pide, eso
     * no se sabe.
     */
    cuerpo = (
      <div className="rejilla" aria-busy="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div className="tarjeta tarjeta-fantasma" key={i} aria-hidden="true">
            <span className="raya raya-larga" />
            <span className="raya" />
            <span className="raya raya-corta" />
          </div>
        ))}
      </div>
    );
  } else if (catalogo.estado === 'sin-servidor') {
    cuerpo = (
      <div className="sin-servidor">
        <h2>No se ha podido hablar con el servidor</h2>
        <p>
          El catálogo de la Sala lo publica el servidor en <code>/api/arcade</code>, y esa petición
          no ha salido: <strong>{catalogo.porque}</strong>.
        </p>
        <p className="letra-chica">
          Esto no quiere decir que no haya arcades instalados: quiere decir que no se sabe cuáles
          hay. Mientras tanto, aquí no se enseña ninguno.
        </p>
        {/*
         * PRIMARIA, y es la única acción de esta pantalla. Llevaba `.opcion` a
         * secas, que desde el rediseño de la hoja es el estado QUIETO de la casa
         * —teja, `--tenue` y filo apagado—: la única cosa que se puede hacer aquí
         * se pintaba como la que no se puede hacer. El primario es relleno de
         * `--acento` con tinta `--suelo`, medido en los cuatro temas (5,01 violeta
         * / 9,22 ámbar / 8,69 verde / 5,40 carmesí) y con el relleno recortándose
         * de la teja por 4,58.
         */}
        <button
          type="button"
          className="opcion opcion-primaria"
          onClick={volverAPreguntar}
          ref={boton}
        >
          <span className="opcion-texto">
            <span className="opcion-rotulo">Volver a preguntar</span>
          </span>
        </button>
      </div>
    );
  } else if (catalogo.arcades.length === 0) {
    /*
     * VACÍO NO ES LO MISMO QUE ILEGIBLE, y decir «no hay ninguno» cuando lo que
     * pasa es que no se ha sabido leer ninguno es la misma mentira que este
     * fichero evita con el estado `sin-servidor`: manda a buscar el fallo donde
     * no está.
     */
    const ilegibles = catalogo.ilegibles ?? 0;
    cuerpo =
      ilegibles === 0 ? (
        <div className="sin-servidor">
          <h2>Este servidor no tiene ningún arcade instalado</h2>
          <p className="letra-chica">
            El servidor ha contestado, y su lista viene vacía. Se instalan en el binario o desde
            fuera, con <code>ARCADES_EXTERNOS</code>.
          </p>
        </div>
      ) : (
        <div className="sin-servidor">
          <h2>Aquí no se ha sabido leer ninguna de las fichas que hay</h2>
          <p className="letra-chica">
            El servidor ha contestado con {String(ilegibles)}{' '}
            {ilegibles === 1 ? 'ficha' : 'fichas'}, y a ninguna se le ha encontrado lo mínimo para
            pintar una tarjeta: nombre, gancho, mueble y dónde corre la partida. Suele querer decir
            que este empaquetado es más viejo que el servidor con el que habla.
          </p>
        </div>
      );
  } else {
    cuerpo = (
      <div className="rejilla">
        {catalogo.arcades.map((a) => (
          <Tarjeta arcade={a} enlace={enlaceDe(a)} key={a.id} />
        ))}
      </div>
    );
  }

  return (
    <>
      <p className="letra-chica" role="status" tabIndex={-1} ref={rotulo}>
        {loQuePasa(catalogo)}
      </p>
      {cuerpo}
    </>
  );
}

/**
 * CUARENTA MUESCAS DEJAN DE SER UNA CUENTA Y PASAN A SER UNA TEXTURA.
 *
 * Es el mismo tope que `MAS_MUESCAS_DE_LAS_QUE_SE_CUENTAN` en la app. Por encima
 * de ahí el raíl no informa menos: informa MAL, porque nadie cuenta cuarenta rayas
 * de un vistazo y lo que se ve es una trama. Cuando pasa, no se pinta y el aforo lo
 * sigue diciendo su dato de la ficha.
 */
const MAS_MUESCAS_DE_LAS_QUE_SE_CUENTAN = 40;

/**
 * EL AFORO, LEÍDO COMO LO QUE DE VERDAD ES: `unknown`.
 *
 * Son las siete comprobaciones de `leerAforo` (`app/app/index.tsx`), copiadas
 * porque el fallo es el mismo y aquí es peor: allí un `jugadores` que falta deja
 * una ficha sin raíl, y aquí `arcade.jugadores.minimo` a pelo sobre un objeto que
 * sólo pasó por `Array.isArray` lanza durante el render y `RedDeSeguridad` se lleva
 * por delante las otras cinco tarjetas.
 *
 * Devuelve `null` cuando el dato no sirve, y entonces no se dibuja nada: una
 * tarjeta sin raíl es un juego que sale.
 */
function leerAforo(arcade: ArcadeDelCatalogo): { minimo: number; maximo: number } | null {
  const a: unknown = arcade.jugadores;
  if (typeof a !== 'object' || a === null) return null;
  const min: unknown = (a as { minimo?: unknown }).minimo;
  const max: unknown = (a as { maximo?: unknown }).maximo;
  if (typeof min !== 'number' || typeof max !== 'number') return null;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const minimo = Math.round(min);
  const maximo = Math.round(max);
  if (maximo < 1 || minimo < 0 || minimo > maximo) return null;
  return { minimo, maximo };
}

/**
 * ═══ EL RAÍL DE AFORO, QUE ES LA FIRMA DE LA SALA Y AQUÍ NO SE PINTABA ═══
 *
 * `.aforo`, `.muesca` y `.muesca-viva` llevaban escritas y MEDIDAS en la hoja desde
 * el rediseño y ningún `.tsx` las montaba: la cabecera de `estilo.css` vende el
 * raíl como uno de los tres pilares de la identidad del cliente y media Sala estaba
 * sin él. Mientras tanto la cuenta de la muesca se desincronizó con la de la app
 * —hueco 19 contra 13, alto 16 contra 15— sin que nada lo notara, porque un
 * ornamento que no se pinta no lo mira nadie.
 *
 * Hay una muesca por persona que admite la máquina y están encendidas las que hacen
 * falta para empezar: el LARGO dice el aforo antes de leer una palabra, y por eso
 * las apagadas importan tanto como las encendidas.
 *
 * ═══ Y LO QUE SE OYE NO ES LA FÓRMULA GENÉRICA ═══
 *
 * Con `minimo === maximo` se dice «Aforo: 1 persona» y no «de uno a uno jugadores»,
 * que es lo que un lector de pantalla leía en las dos máquinas de un solo jugador
 * —El Arcade y La Peonza—, dos de las cinco. El `role="img"` con etiqueta es lo que
 * hace que se oiga la frase entera en vez de doce elementos vacíos seguidos.
 */
function RailDeAforo({
  aforo,
}: {
  aforo: { minimo: number; maximo: number } | null;
}): JSX.Element | null {
  if (aforo === null || aforo.maximo > MAS_MUESCAS_DE_LAS_QUE_SE_CUENTAN) return null;
  const encendidas = Math.min(aforo.minimo, aforo.maximo);
  return (
    <span
      className="aforo"
      role="img"
      aria-label={
        aforo.minimo === aforo.maximo
          ? `Aforo: ${String(aforo.maximo)} ${aforo.maximo === 1 ? 'persona' : 'personas'}`
          : `Aforo: de ${String(aforo.minimo)} a ${String(aforo.maximo)} personas`
      }
    >
      {Array.from({ length: aforo.maximo }, (_, i) => (
        <i className={i < encendidas ? 'muesca muesca-viva' : 'muesca'} key={i} />
      ))}
    </span>
  );
}

/**
 * DÓNDE CORRE LA PARTIDA, DICHO SÓLO CUANDO SE SABE.
 *
 * Estaba escrito `sede === 'servidor' ? 'en línea' : 'en el aparato'`, y esa
 * comparación no revienta con un valor raro: cualquier cosa que no sea exactamente
 * la cadena `servidor` —`undefined`, `'server'`, un objeto, la cadena vacía— caía en
 * el `else` e imprimía «EN EL APARATO» como si fuera un dato del juego. Y es el dato
 * que decide si hace falta red: mandar a alguien a jugar sin cobertura porque una
 * tarjeta afirmó lo que no sabía es la clase de mentira que `muebles.ts` dice que
 * este cliente existe para no tener.
 */
function laMesa(sede: unknown): string {
  if (sede === 'servidor') return 'en línea';
  if (sede === 'dispositivo') return 'en el aparato';
  return 'sin decir';
}

/**
 * Lo que llega por el cable puede no ser texto. Un objeto aquí no es un dato feo:
 * es «Objects are not valid as a React child» y la Sala entera abajo.
 */
function comoTexto(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * UNA TARJETA, Y LA REGLA QUE LA GOBIERNA.
 *
 * Un arcade que no se puede jugar aquí SALE IGUAL, con su nombre y su gancho, y
 * dice dónde se juega. No desaparece —quien lo tiene en el móvil vería una Sala
 * que no coincide con la suya y pensaría que falta algo— y no se puede pulsar
 * —un enlace que lleva a una pantalla que no sabe pintarse es peor que no
 * tenerlo—. Las dos cosas a la vez, que es la parte difícil.
 */
export function Tarjeta({
  arcade,
  enlace,
}: {
  arcade: ArcadeDelCatalogo;
  enlace: string;
}): JSX.Element {
  const donde = dondeSeJuega(arcade);
  const mueble = MUEBLES[arcade.mueble] as { loQueEs: string } | undefined;
  const aforo = leerAforo(arcade);
  const nombre = comoTexto(arcade.nombre);
  const gancho = comoTexto(arcade.gancho);

  /*
   * ═══ LAS DOS FRASES, COMPUESTAS CON GUARDIA ═══
   *
   * `leerAforo` ya trae las siete comprobaciones de la casa. El ritmo y los
   * secretos van con la suya aquí mismo y por el mismo motivo: llegan por el
   * cable dentro de un manifiesto que este empaquetado puede no haber compilado
   * nunca, y `losQueSePuedenPintar` sólo exige los cinco campos sin los cuales no
   * hay tarjeta. Un adorno que no vino no se inventa: se calla.
   *
   * `tickHz` a 0 NO es «sin dato»: es un juego por turnos, y son cosas distintas.
   */
  const datos: string[] = [];
  datos.push(
    aforo === null
      ? 'Aforo sin declarar'
      : aforo.minimo === aforo.maximo
        ? `${String(aforo.maximo)} ${aforo.maximo === 1 ? 'persona' : 'personas'}`
        : `${String(aforo.minimo)} a ${String(aforo.maximo)} personas`,
  );
  const hz: unknown = arcade.tickHz;
  if (typeof hz === 'number' && Number.isFinite(hz) && hz >= 0) {
    datos.push(hz === 0 ? 'Por turnos' : `${String(hz)} por segundo`);
  }

  const menudos: string[] = [laMesa(arcade.sede)];
  const secretos: unknown = arcade.secretos;
  if (typeof secretos === 'boolean') menudos.push(secretos ? 'con secretos' : 'sin secretos');

  const cuerpo = (
    <>
      {/* El raíl va ANTES del nombre y dentro de la tarjeta: es lo primero que se ve. */}
      <RailDeAforo aforo={aforo} />
      <h2 className="nombre-del-arcade">{nombre}</h2>
      <p className="gancho">{gancho}</p>
      {/*
        LOS DATOS EN DOS RENGLONES Y NO EN TRES COLUMNAS. El porqué está en la
        hoja, donde vivía la tabla: se rompía a 89,4 px de columna y se veía
        —«FORMULARI / O»—. Los mismos datos, en el orden de la casa.
      */}
      <p className="datos-de-la-ficha">{datos.join('  ·  ')}</p>
      {menudos.length > 0 && <p className="menudos-de-la-ficha">{menudos.join(' · ')}</p>}
      {mueble === undefined ? null : <p className="letra-chica">{mueble.loQueEs}</p>}
    </>
  );

  if (!donde.aqui) {
    return (
      <div className="tarjeta tarjeta-en-la-app">
        {cuerpo}
        <p className="en-la-app">{donde.porque}</p>
      </div>
    );
  }

  /*
   * EL NOMBRE DEL ENLACE SE DECLARA, PORQUE SI NO ES TODO SU TEXTO. Sin
   * `aria-label`, el nombre accesible de esta tarjeta es la concatenación de las
   * cinco franjas: para Riberas salían ~305 caracteres —«Riberas Levanta chozas en
   * el delta… Jugadores 2 a 6 Mesa en línea Mueble tablero Una topología
   * declarada… Jugar aquí →»— cada vez que el foco pasa por encima. La casa compone
   * uno corto: qué se hace, con qué máquina y a qué se juega.
   */
  return (
    <a
      className="tarjeta tarjeta-jugable"
      href={enlace}
      aria-label={`Jugar a ${nombre}. ${gancho}`}
    >
      {cuerpo}
      <p className="a-jugar">Jugar aquí →</p>
    </a>
  );
}
