/**
 * LA SALA, montada: qué pantalla toca y qué se ve en cada una.
 *
 * ═══ POR QUÉ HAY DIRECCIONES Y NO PESTAÑAS ═══
 *
 * Un PC tiene barra de direcciones, botón de atrás y la costumbre de pegar
 * enlaces en un chat. La app de móvil no tiene nada de eso y por eso navega por
 * pantallas; aquí, cada arcade es una dirección (`/sala/riberas`) y el código de
 * una mesa cabe en ella (`/sala/riberas?codigo=ABCDE`). Eso convierte «te paso
 * el código» en «te paso el enlace», que es lo que hace la gente delante de un
 * teclado.
 *
 * El enrutado es de veinte líneas y a mano. No entra `react-router` —que sí usa
 * el taller— porque este cliente no es de la familia del taller: son dos
 * pantallas y una consulta, y una dependencia con su propio modelo mental sale
 * más cara que las veinte líneas.
 */
import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent as ClicDeReact } from 'react';
import { Catalogo, usarElCatalogo } from './catalogo';
import type { ElCatalogo } from './catalogo';
import { Formulario } from './formulario';
import { usarMesaDeArcade } from './mesa';
import type { LaMesa } from './mesa';
import { dondeSeJuega } from './muebles';
import type { ArcadeDelCatalogo } from './muebles';
import { opcionesSueltas, queSePinta } from './plan';
import type { Opcion } from '../../shared/arcade';
import type { MovimientoDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { cuantoQueda } from './relojes';
import { AccionesDelTablero, Paneles, Retablo } from './retablo';

/** La acera de este cliente dentro del servicio. Ver `vite.config.ts`. */
export const BASE = '/sala';

export type Donde =
  | { que: 'catalogo'; silla: string }
  | { que: 'mesa'; arcade: string; silla: string; codigo: string };

/**
 * Qué pide esta dirección. Función pura para poder probarla sin navegador.
 *
 * `silla` es lo que permite dos ventanas del mismo navegador en la misma mesa
 * sin pisarse el asiento; ver la cabecera de `bolsillo.ts`, que es donde eso
 * duele.
 */
export function loQuePide(camino: string, busqueda: string): Donde {
  const parametros = new URLSearchParams(busqueda);
  const silla = (parametros.get('silla') ?? '').trim();
  const codigo = (parametros.get('codigo') ?? '').trim().toUpperCase();

  const sinBase = camino.startsWith(BASE) ? camino.slice(BASE.length) : camino;
  const trozos = sinBase.split('/').filter((t) => t.length > 0);
  const primero = trozos[0];
  if (primero === undefined) return { que: 'catalogo', silla };
  return { que: 'mesa', arcade: decodeURIComponent(primero), silla, codigo };
}

export function Sala(): JSX.Element {
  const [donde, ponerDonde] = useState<Donde>(() =>
    loQuePide(window.location.pathname, window.location.search),
  );
  const { catalogo, reintentar } = usarElCatalogo();

  const mirarLaBarra = useCallback(() => {
    ponerDonde(loQuePide(window.location.pathname, window.location.search));
  }, []);

  useEffect(() => {
    window.addEventListener('popstate', mirarLaBarra);
    return () => {
      window.removeEventListener('popstate', mirarLaBarra);
    };
  }, [mirarLaBarra]);

  /*
   * Los enlaces internos se interceptan en la raíz en vez de sustituirse por
   * botones: así siguen siendo `<a href>` de verdad —se pueden abrir en otra
   * pestaña con el botón central, copiar con el derecho, y los lee un lector de
   * pantalla como lo que son— y aun así no recargan la página entera.
   *
   * Se respeta cualquier clic con modificador: un `Ctrl+clic` significa «ábrelo
   * en otra pestaña», y comérselo es la clase de detalle que hace que una web se
   * sienta ajena al navegador que la enseña.
   */
  const alPulsarUnEnlace = useCallback(
    (e: ClicDeReact<HTMLDivElement>) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const destino = (e.target as HTMLElement).closest('a');
      if (destino === null) return;
      const href = destino.getAttribute('href');
      if (href === null || !href.startsWith(`${BASE}/`)) return;
      e.preventDefault();
      window.history.pushState(null, '', href);
      mirarLaBarra();
    },
    [mirarLaBarra],
  );

  return (
    <div className="sala" onClick={alPulsarUnEnlace}>
      <header className="cabecera">
        <a className="vuelta" href={`${BASE}/${sufijoDeSilla(donde.silla)}`}>
          Sala de Arcade
        </a>
        {donde.silla.length > 0 ? <span className="silla">silla «{donde.silla}»</span> : null}
      </header>

      {donde.que === 'catalogo' ? (
        <main className="dentro">
          <p className="entradilla">
            Lo que hay instalado en este servidor. Aquí mismo se juegan los que la plataforma
            sabe pintar con lo que el propio juego declara; los demás salen en la lista igual, y
            cada uno dice por qué no.
          </p>
          <Catalogo
            catalogo={catalogo}
            reintentar={reintentar}
            enlaceDe={(a) => `${BASE}/${encodeURIComponent(a.id)}${sufijoDeSilla(donde.silla)}`}
          />
        </main>
      ) : (
        <ElArcade donde={donde} catalogo={catalogo} />
      )}
    </div>
  );
}

function sufijoDeSilla(silla: string): string {
  return silla.length > 0 ? `?silla=${encodeURIComponent(silla)}` : '';
}

// ---------------------------------------------------------------------------
// Un arcade concreto
// ---------------------------------------------------------------------------

function ElArcade({ donde, catalogo }: { donde: Donde; catalogo: ElCatalogo }): JSX.Element {
  const arcade = donde.que === 'mesa' ? donde.arcade : '';
  const silla = donde.silla;
  const codigoDeLaUrl = donde.que === 'mesa' ? donde.codigo : '';
  /*
   * El gancho se llama SIEMPRE, aunque todavía no se sepa si este arcade existe
   * o si se puede jugar aquí. No es un descuido: las reglas de los ganchos de
   * React prohíben llamarlos dentro de un `if`, y sacar la mesa a otro
   * componente para poder saltársela significaría montarla y desmontarla cada
   * vez que el catálogo cambia de estado — o sea perder el asiento recuperado
   * justo cuando llega la lista. Mientras no se está dentro, esta mesa no pide
   * nada al servidor salvo el intento de volver al asiento guardado, que es
   * exactamente lo que se quiere que pase cuanto antes.
   */
  const mesa = usarMesaDeArcade(arcade, silla);

  if (catalogo.estado === 'pidiendo') {
    return (
      <main className="dentro">
        <div className="tarjeta tarjeta-fantasma" aria-busy="true">
          <span className="raya raya-larga" />
          <span className="raya" />
        </div>
      </main>
    );
  }
  if (catalogo.estado === 'sin-servidor') {
    return (
      <main className="dentro">
        <div className="sin-servidor">
          <h2>No se ha podido hablar con el servidor</h2>
          <p>{catalogo.porque}</p>
        </div>
      </main>
    );
  }

  const manifiesto = catalogo.arcades.find((a) => a.id === arcade);
  if (manifiesto === undefined) {
    return (
      <main className="dentro">
        <div className="sin-servidor">
          <h2>Aquí no hay ningún arcade que se llame «{arcade}»</h2>
          <p className="letra-chica">
            Este servidor tiene instalados: {catalogo.arcades.map((a) => a.id).join(', ')}.
          </p>
        </div>
      </main>
    );
  }

  const puerta = dondeSeJuega(manifiesto);
  if (!puerta.aqui) {
    /*
     * Se llega aquí escribiendo la dirección a mano, porque la tarjeta no era un
     * enlace. Se contesta lo MISMO que decía la tarjeta: la respuesta a «¿dónde
     * se juega esto?» no puede depender de por dónde se haya preguntado.
     */
    return (
      <main className="dentro">
        <div className="sin-servidor">
          <h2>{manifiesto.nombre}</h2>
          <p>{puerta.porque}</p>
        </div>
      </main>
    );
  }

  return (
    <LaMesaPuesta
      manifiesto={manifiesto}
      mesa={mesa}
      silla={silla}
      codigoDeLaUrl={codigoDeLaUrl}
    />
  );
}

// ---------------------------------------------------------------------------
// La mesa
// ---------------------------------------------------------------------------

/**
 * LOS PLAZOS QUE SE OFRECEN AL ABRIR, Y POR QUÉ EL PRIMERO NO ES UN NÚMERO.
 *
 * ═══ EL PLAZO NO ES UNA PREFERENCIA: ES QUIÉN JUEGA TU TURNO ═══
 *
 * Cuando un plazo vence, el juego no avisa ni pide permiso: el reductor coloca
 * por quien no ha llegado —`colocarPorElAusente` en Riberas es el ejemplo que se
 * puede leer— y la partida sigue como si esa jugada fuera tuya. No hay error, no
 * hay renglón en la crónica y la mesa queda mal repartida.
 *
 * Aquí eso choca de frente con el flujo entero de este cliente, que es: abro una
 * mesa, copio cinco letras, se las paso a alguien, y ese alguien tarda lo que
 * tarda una persona en mirar un chat. Esta lista ofrecía «medio minuto por
 * turno» Y LO TRAÍA PUESTO DE SERIE, o sea que para cuando llegaba el segundo
 * jugador ya habían vencido varios plazos. La app, que lleva más tiempo en manos
 * de gente, ofrece como más corto DIEZ MINUTOS. Medio minuto no es un plazo
 * corto: es una lista de números en la que alguien metió uno de probar.
 *
 * ═══ Y EL PRIMERO, QUE ES `undefined` Y NO CERO ═══
 *
 * `abrir` manda `plazoSegundos` solo si se le da uno, así que `undefined`
 * significa «no mando nada, decide el servidor». Ese es el valor de serie y es
 * el único correcto: el plazo por defecto lo decide quien hospeda, y tenerlo
 * escrito aquí sería una segunda copia que se desincroniza el día que cambie
 * allí. Este cliente era además el ÚNICO desde el que no se podía pedir —mandaba
 * siempre un número—, o sea que tenía una opción menos que la app teniendo una
 * pantalla más grande.
 *
 * `0` es cosa distinta de `undefined` y también es legítimo: está documentado en
 * la cabecera de `abrir` como «esta mesa no tiene prisa», y va el último porque
 * es el caso raro y quien lo elige sabe lo que elige.
 */
export const PLAZOS: Array<{ rotulo: string; segundos: number | undefined; ayuda: string }> = [
  { rotulo: 'Como venga', segundos: undefined, ayuda: 'El plazo por defecto de este servidor.' },
  { rotulo: 'Un rato', segundos: 10 * 60, ayuda: 'Diez minutos por turno. Para jugar del tirón.' },
  { rotulo: 'Un día', segundos: 24 * 60 * 60, ayuda: 'Veinticuatro horas por turno.' },
  { rotulo: 'Tres días', segundos: 3 * 24 * 60 * 60, ayuda: 'Para una partida de la semana entera.' },
  { rotulo: 'Sin prisa', segundos: 0, ayuda: 'Sin plazo: el turno no se pasa solo nunca.' },
];

function LaMesaPuesta({
  manifiesto,
  mesa,
  silla,
  codigoDeLaUrl,
}: {
  manifiesto: ArcadeDelCatalogo;
  mesa: LaMesa;
  silla: string;
  codigoDeLaUrl: string;
}): JSX.Element {
  if (mesa.fase !== 'dentro' || mesa.mesa === null) {
    return (
      <main className="dentro">
        <h1 className="titulo">{manifiesto.nombre}</h1>
        <p className="entradilla">{manifiesto.gancho}</p>
        {mesa.aviso.length > 0 ? <p className="aviso">{mesa.aviso}</p> : null}
        <Vestibulo
          mesa={mesa}
          codigoDeLaUrl={codigoDeLaUrl}
          minimo={manifiesto.jugadores.minimo}
        />
      </main>
    );
  }

  const puesta = mesa.mesa;
  /*
   * ═══ `?? []`, Y ESTA GUARDA VALE LA SALA ENTERA ═══
   *
   * `opciones` es un campo que el servidor empezó a mandar en la fase 5, y este
   * empaquetado puede estar hablando con uno anterior — «exactamente la
   * situación que va a existir en cuanto haya despliegues parciales», que es lo
   * que ya razona la cabecera de `catalogo.tsx` para el mueble desconocido. Sin
   * esta guarda, `plan.ts` hacía `opciones.length` sobre `undefined`, y eso no
   * se lleva por delante la mesa: se lleva la Sala entera, catálogo incluido,
   * porque no hay ningún error boundary en este cliente. El síntoma es una
   * página EN BLANCO sin una palabra, que es justo el fallo mudo que este
   * cliente existe para no tener.
   *
   * La guarda va aquí y no dentro de `mesa.ts` a propósito: `MesaVista` describe
   * LO QUE LLEGA POR EL CABLE, y lo que llega es que el campo puede faltar.
   * Normalizarlo al recibirlo dejaría el tipo mintiendo otra vez, y la próxima
   * pantalla que lo lea heredaría la mentira sin ver esta línea.
   *
   * Y una lista vacía es la respuesta CORRECTA, no un apaño: un servidor que no
   * sabe preguntar qué se puede hacer es indistinguible de un juego que no tiene
   * nada que ofrecer ahora mismo, y `queSePinta` ya sabe decir las dos cosas.
   */
  const pintado = queSePinta(puesta.vista, puesta.opciones ?? []);

  return (
    <main className="dentro mesa-puesta">
      <div className="tablero-y-panel">
        <section className="el-mueble">
          <h1 className="titulo">{manifiesto.nombre}</h1>
          {mesa.aviso.length > 0 ? <p className="aviso">{mesa.aviso}</p> : null}

          {pintado.que === 'tablero' ? (
            <>
              <Retablo tablero={pintado.tablero} alTocar={mesa.mover} quieto={mesa.quieto} />
              <AccionesDelTablero
                tablero={pintado.tablero}
                alTocar={mesa.mover}
                quieto={mesa.quieto}
              />
              {/*
                Y debajo, lo que `opciones()` ofrece Y EL TABLERO NO ENSEÑA YA.
                No es esconder: es enseñar cada movimiento exactamente una vez.
                `opciones()` puede ofrecer cosas que no son ninguna pieza
                —aceptar un trato, pasar— y que en un dibujo no tienen dónde
                pintarse; dejarlas fuera sería esconder movimientos legales. Ver
                `opcionesSueltas` en `plan.ts`, que es donde está el razonamiento.
              */}
              <FormularioSiHayAlgo
                opciones={opcionesSueltas(pintado.tablero, pintado.opciones)}
                alElegir={mesa.mover}
                quieto={mesa.quieto}
              />
            </>
          ) : pintado.que === 'formulario' ? (
            <Formulario
              opciones={pintado.opciones}
              alElegir={mesa.mover}
              quieto={mesa.quieto}
              titulo="Lo que puedes hacer"
            />
          ) : (
            <p className="nada-que-hacer">{pintado.porque}</p>
          )}
        </section>

        <aside className="rail">
          <LaFicha mesa={puesta} silla={silla} />
          {pintado.que === 'tablero' ? <Paneles tablero={pintado.tablero} /> : null}
          <LaCronica mesa={mesa} />
          <button type="button" className="opcion opcion-sobria" onClick={mesa.salir}>
            <span className="opcion-texto">
              <span className="opcion-rotulo">Levantarse de la mesa</span>
              <span className="opcion-ayuda">Se olvida el asiento en este navegador.</span>
            </span>
          </button>
          {/*
            ═══ Y LA SALIDA DE VERDAD, QUE NO EXISTÍA ═══

            «Levantarse» sólo olvida la llave AQUÍ: el asiento sigue en la mesa
            del servidor, porque un asiento no se libera nunca. Con el plazo «Sin
            prisa» eso deja la mesa congelada para todos —se reparte contando a
            quien se fue, no hay plazo que venza, nadie puede jugar por él— y
            hasta hoy no había ninguna forma de salir de ahí.

            Se pregunta antes de hacerlo porque afecta a los demás, y por eso el
            rótulo dice «para todos»: es la diferencia entera con el de arriba.
          */}
          <button
            type="button"
            className="opcion opcion-sobria"
            onClick={() => {
              const seguro = globalThis.confirm(
                '¿Tirar la mesa? Se acaba la partida para todos los que estén sentados.',
              );
              if (seguro) mesa.tirar();
            }}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">Tirar la mesa</span>
              <span className="opcion-ayuda">
                Se acaba para todos. Para cuando alguien se ha ido y la partida no puede seguir.
              </span>
            </span>
          </button>
        </aside>
      </div>
    </main>
  );
}

/**
 * El formulario debajo de un tablero, y CALLADO cuando no sobra nada.
 *
 * `Formulario` sin opciones dice «ahora mismo no hay nada que puedas hacer», que
 * es lo correcto cuando él es el mueble entero y sería falso aquí: encima hay un
 * tablero con piezas pulsables. Y cuando tampoco las hay, quien lo explica es el
 * `aviso` del propio tablero, que sabe de qué habla.
 */
function FormularioSiHayAlgo({
  opciones,
  alElegir,
  quieto,
}: {
  opciones: readonly Opcion[];
  alElegir: (movimiento: MovimientoDeclarado) => void;
  quieto: boolean;
}): JSX.Element | null {
  if (opciones.length === 0) return null;
  return (
    <Formulario
      opciones={opciones}
      alElegir={alElegir}
      quieto={quieto}
      titulo="Y además puedes"
    />
  );
}

/** Antes de sentarse: abrir una mesa nueva o entrar con un código. */
function Vestibulo({
  mesa,
  codigoDeLaUrl,
  minimo,
}: {
  mesa: LaMesa;
  codigoDeLaUrl: string;
  minimo: number;
}): JSX.Element {
  const [nombre, ponerNombre] = useState('');
  const [codigo, ponerCodigo] = useState(codigoDeLaUrl);
  /*
   * Se guarda EL ÍNDICE y no los segundos, y no es un capricho: los dos valores
   * de los extremos de la lista son `undefined` —«manda el servidor»— y `0`
   * —«sin plazo»—, que son cosas distintas y que un `<select>` no sabe
   * distinguir, porque el valor de una opción es siempre una cadena. Con el
   * índice, el que va de serie es `PLAZOS[0]` y se lee de un vistazo cuál es.
   */
  const [cualPlazo, ponerCualPlazo] = useState(0);
  const plazo = PLAZOS[cualPlazo];

  return (
    <div className="vestibulo">
      <section className="panel">
        <h2 className="rotulo-de-panel">Cómo te llamas</h2>
        <p className="letra-chica">
          Es lo que ven los demás en la mesa. No es una cuenta: no hay correo ni contraseña, y
          muere con la partida.
        </p>
        <input
          className="campo"
          value={nombre}
          maxLength={24}
          placeholder="Tu nombre"
          onChange={(e) => {
            ponerNombre(e.target.value);
          }}
        />
      </section>

      <div className="dos-columnas">
        <section className="panel">
          <h2 className="rotulo-de-panel">Abrir una mesa</h2>
          <p className="letra-chica">
            {minimo > 1
              ? `Hacen falta ${String(minimo)} para empezar: al abrir sale un código que se pasa a los demás.`
              : 'Sale un código por si quieres que se siente alguien más.'}
          </p>
          <select
            className="campo"
            value={cualPlazo}
            aria-label="Plazo por turno"
            onChange={(e) => {
              ponerCualPlazo(Number(e.target.value));
            }}
          >
            {PLAZOS.map((p, i) => (
              <option value={i} key={p.rotulo}>
                {p.rotulo}
              </option>
            ))}
          </select>
          {/*
            La ayuda del plazo elegido se pinta debajo, y no es adorno: lo que
            está en juego es que al vencer un plazo el juego coloca por quien no
            ha llegado. «Un día» y «Sin prisa» no se distinguen por el rótulo.
          */}
          {plazo === undefined ? null : <p className="letra-chica">{plazo.ayuda}</p>}
          <button
            type="button"
            className="opcion"
            disabled={mesa.quieto}
            onClick={() => {
              mesa.abrir(nombre.trim(), plazo?.segundos);
            }}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">Abrir mesa</span>
            </span>
          </button>
        </section>

        <section className="panel">
          <h2 className="rotulo-de-panel">Entrar con un código</h2>
          <p className="letra-chica">Cinco letras. Da igual mayúsculas o minúsculas.</p>
          <input
            className="campo campo-codigo"
            value={codigo}
            maxLength={8}
            placeholder="ABCDE"
            onChange={(e) => {
              ponerCodigo(e.target.value.toUpperCase());
            }}
            onKeyDown={(e) => {
              /* En un teclado, un código se termina con Enter. */
              if (e.key === 'Enter' && codigo.trim().length > 0) mesa.entrar(codigo, nombre.trim());
            }}
          />
          <button
            type="button"
            className="opcion"
            disabled={mesa.quieto || codigo.trim().length === 0}
            onClick={() => {
              mesa.entrar(codigo, nombre.trim());
            }}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">Sentarse</span>
            </span>
          </button>
        </section>
      </div>
    </div>
  );
}

/** El código, quién está y cuánto falta. Lo que se mira de reojo. */
function LaFicha({
  mesa,
  silla,
}: {
  mesa: NonNullable<LaMesa['mesa']>;
  silla: string;
}): JSX.Element {
  /*
   * La cuenta atrás se repinta sola cada segundo, y solo mientras hay algo que
   * contar: sin plazo o con la mesa terminada no hay reloj, y un `setInterval`
   * eterno en una mesa acabada es una pestaña que no deja dormir al portátil.
   */
  const [, latir] = useState(0);
  const hayReloj = mesa.venceEn !== null && !mesa.terminada;
  useEffect(() => {
    if (!hayReloj) return;
    const t = setInterval(() => {
      latir((n) => n + 1);
    }, 1000);
    return () => {
      clearInterval(t);
    };
  }, [hayReloj]);

  /*
   * El enlace que se le pasa a quien falta lleva el código y NO lleva la silla:
   * la silla es de este navegador —el cajón del bolsillo donde vive esta llave—
   * y mandársela a otra persona sería mandarle el nombre de un cajón suyo, que
   * es lo único de todo esto que no significa nada fuera de aquí.
   */
  const enlaceParaLosDemas = `${window.location.origin}${BASE}/${encodeURIComponent(mesa.arcade)}?codigo=${mesa.codigo}`;
  /* La silla propia se enseña aparte, para saber en qué ventana se está. */
  const enQueSilla = silla.length > 0 ? `silla «${silla}»` : '';
  /*
   * ═══ Y AQUÍ SE ENSEÑA QUE `?silla=` EXISTE ═══
   *
   * El cajón por ventana estaba escrito, probado y funcionando, y no lo sabía
   * nadie: no aparecía en ninguna pantalla ni en ningún documento, así que la
   * única forma de usarlo era leer el código de `bolsillo.ts`. Una función que hay
   * que descubrir leyendo el fuente no está entregada.
   *
   * Y el caso que resuelve es el primero que hace cualquiera: probar la mesa
   * consigo mismo. Dos ventanas del mismo navegador comparten `localStorage`, o
   * sea que sin esto la segunda pisa la llave de la primera y quien recargue
   * vuelve sentado en la silla de otro. La siguiente letra basta —son cajones,
   * no asientos: el asiento lo da el servidor—.
   */
  const siguienteSilla = silla.length === 0 ? 'b' : String.fromCharCode(silla.charCodeAt(0) + 1);
  const otraVentana = `${enlaceParaLosDemas}&silla=${encodeURIComponent(siguienteSilla)}`;

  return (
    <section className="panel">
      <h2 className="rotulo-de-panel">La mesa</h2>
      <p className="codigo-grande">{mesa.codigo}</p>
      <p className="letra-chica">
        Pásale esto a quien falte, o el enlace entero:{' '}
        <a href={enlaceParaLosDemas}>{enlaceParaLosDemas}</a>
      </p>
      <p className="letra-chica">
        ¿Pruebas tú solo desde este mismo navegador?{' '}
        <a href={otraVentana} target="_blank" rel="noreferrer">
          Abre otra ventana en la silla «{siguienteSilla}»
        </a>{' '}
        — dos pestañas comparten el bolsillo, y sin esto la segunda te quita el
        asiento de la primera.
      </p>
      <ul className="renglones">
        {mesa.asientos.map((a) => (
          <li key={a.id} className={a.id === mesa.yo ? 'yo' : undefined}>
            {a.nombre.length > 0 ? a.nombre : a.id}
            {a.id === mesa.yo ? ' (tú)' : ''}
            {a.presente ? '' : ' — fuera'}
          </li>
        ))}
      </ul>
      <p className="letra-chica">
        {enQueSilla.length > 0 ? `${enQueSilla} · ` : ''}
        Revisión {mesa.rev}
        {mesa.terminada
          ? ' · partida terminada'
          : mesa.venceEn === null
            ? ' · sin plazo'
            : ` · ${cuantoQueda(mesa.venceEn - Date.now())}`}
      </p>
    </section>
  );
}

/** Lo que ha ido pasando, de lo más nuevo a lo más viejo. */
function LaCronica({ mesa }: { mesa: LaMesa }): JSX.Element | null {
  if (mesa.cronica.length === 0) return null;
  return (
    <section className="panel">
      <h2 className="rotulo-de-panel">Lo que ha pasado</h2>
      <ul className="renglones cronica">
        {mesa.cronica.map((a, i) => (
          <li key={`${String(i)}:${a.clave}`}>{a.texto}</li>
        ))}
      </ul>
    </section>
  );
}
