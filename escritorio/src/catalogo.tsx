/**
 * EL CATÁLOGO: lo que hay instalado, leído del servidor y no de una lista de aquí.
 *
 * ═══ POR QUÉ SE PREGUNTA Y NO SE IMPORTA ═══
 *
 * Los seis arcades del binario están en `shared/arcade/juegos` y se podrían
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
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { dondeSeJuega, MUEBLES } from './muebles';
import type { ArcadeDelCatalogo } from './muebles';

export type ElCatalogo =
  | { estado: 'pidiendo' }
  | { estado: 'puesto'; arcades: ArcadeDelCatalogo[] }
  | { estado: 'sin-servidor'; porque: string };

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
        if (!vivo.current) return;
        ponerCatalogo({ estado: 'puesto', arcades: datos.arcades as ArcadeDelCatalogo[] });
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

export function Catalogo({ catalogo, reintentar, enlaceDe }: LoQueSeEnsena): JSX.Element {
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
    return (
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
  }

  if (catalogo.estado === 'sin-servidor') {
    return (
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
        <button type="button" className="opcion" onClick={reintentar}>
          <span className="opcion-texto">
            <span className="opcion-rotulo">Volver a preguntar</span>
          </span>
        </button>
      </div>
    );
  }

  if (catalogo.arcades.length === 0) {
    return (
      <div className="sin-servidor">
        <h2>Este servidor no tiene ningún arcade instalado</h2>
        <p className="letra-chica">
          El servidor ha contestado, y su lista viene vacía. Se instalan en el binario o desde
          fuera, con <code>ARCADES_EXTERNOS</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="rejilla">
      {catalogo.arcades.map((a) => (
        <Tarjeta arcade={a} enlace={enlaceDe(a)} key={a.id} />
      ))}
    </div>
  );
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

  const cuerpo = (
    <>
      <h2 className="nombre-del-arcade">{arcade.nombre}</h2>
      <p className="gancho">{arcade.gancho}</p>
      <dl className="ficha">
        <div>
          <dt>Jugadores</dt>
          <dd>
            {arcade.jugadores.minimo === arcade.jugadores.maximo
              ? String(arcade.jugadores.minimo)
              : `${String(arcade.jugadores.minimo)}–${String(arcade.jugadores.maximo)}`}
          </dd>
        </div>
        <div>
          <dt>Mesa</dt>
          <dd>{arcade.sede === 'servidor' ? 'en línea' : 'en el aparato'}</dd>
        </div>
        <div>
          <dt>Mueble</dt>
          <dd>{arcade.mueble}</dd>
        </div>
      </dl>
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

  return (
    <a className="tarjeta tarjeta-jugable" href={enlace}>
      {cuerpo}
      <p className="a-jugar">Jugar aquí →</p>
    </a>
  );
}
