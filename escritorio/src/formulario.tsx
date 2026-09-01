/**
 * EL MUEBLE `formulario`, pintado con DOM de verdad.
 *
 * ═══ TODO LO QUE SABE ESTE COMPONENTE ═══
 *
 * Que le llega una lista de `Opcion` y que cada una tiene rótulo, ayuda y un
 * movimiento dentro. Nada más. No sabe a qué se juega, ni cuántos son, ni si hay
 * cartas, ni si le toca a alguien: eso ya lo pensó `opciones(vista, quien)` en el
 * servidor, que recibió LA VISTA de este observador y devolvió lo que se puede
 * hacer AHORA con lo que ESTE observador sabe.
 *
 * Que sea así de tonto es la propiedad, no la limitación: es lo que hace que un
 * arcade que entró por `ARCADES_EXTERNOS` —que nadie de esta casa compiló y cuyas
 * reglas nadie de aquí ha leído— salga jugable en un PC sin tocar una línea.
 *
 * ═══ Y LO QUE NO HACE, QUE TAMBIÉN ESTÁ DECIDIDO ═══
 *
 * No ordena las opciones, no las agrupa, no esconde las que le parezcan raras y
 * no inventa ninguna. Un botón por opción, en el orden en que vinieron. Ordenar
 * sería una regla de juego escrita en el sitio equivocado, y esconder sería la
 * clase de mentira que este cliente existe para no contar.
 *
 * ═══ EL TECLADO, QUE ES LO QUE LO HACE DE ESCRITORIO ═══
 *
 * Las nueve primeras opciones responden a las teclas 1-9, y el número sale
 * escrito en el botón. En un móvil eso no existe y no se echa de menos; delante
 * de un teclado, tener que llevar el ratón a un botón que está a la vista es
 * exactamente lo que hace que una app de móvil estirada se sienta como una app
 * de móvil estirada.
 *
 * El atajo se pinta SOLO en los que lo tienen: un «10» junto a un botón que no
 * responde a ninguna tecla sería el mismo tipo de mentira, más pequeña.
 */
import { useEffect } from 'react';
import type { Opcion } from '../../shared/arcade';
import type { MovimientoDeclarado } from '../../shared/mecanicas/tablero-declarado';

export interface LoQueSeOfrece {
  opciones: readonly Opcion[];
  alElegir: (movimiento: MovimientoDeclarado) => void;
  /** Hay una petición en vuelo: los botones no aceptan un segundo empujón. */
  quieto: boolean;
  /** Si esto es el mueble entero o el panel de acciones de un tablero. */
  titulo?: string;
}

/** Hasta dónde llegan los atajos. Después del 9 no hay tecla que valga. */
const CON_ATAJO = 9;

export function Formulario({ opciones, alElegir, quieto, titulo }: LoQueSeOfrece): JSX.Element {
  /*
   * El atajo se registra en la ventana y no en un contenedor con `tabIndex`,
   * porque quien juega no tiene por qué haber hecho clic en ningún sitio antes
   * de que el teclado funcione. Y se ignora si el foco está en un campo de
   * texto: si no, teclear un nombre de jugador dispararía movimientos.
   */
  useEffect(() => {
    if (quieto) return;
    const alPulsar = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const activo = document.activeElement;
      if (activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > CON_ATAJO) return;
      const elegida = opciones[n - 1];
      if (elegida === undefined) return;
      e.preventDefault();
      alElegir({ tipo: elegida.tipo, carga: elegida.carga });
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, [opciones, alElegir, quieto]);

  if (opciones.length === 0) {
    /*
     * CERO OPCIONES SE DICE, no se rellena. Es el caso normal cuando le toca a
     * otro, y también el caso raro de un arcade que declara mueble genérico y no
     * publica `opciones()`. Inventar aquí un botón de «empezar» —que es la
     * tentación evidente— sería este cliente ofreciendo un movimiento que el
     * juego no ofreció, y el reductor lo rechazaría en silencio.
     */
    return (
      <div className="formulario">
        {titulo === undefined ? null : <h2 className="rotulo-de-panel">{titulo}</h2>}
        <p className="nada-que-hacer">Ahora mismo no hay nada que puedas hacer en esta mesa.</p>
      </div>
    );
  }

  return (
    <div className="formulario">
      {titulo === undefined ? null : <h2 className="rotulo-de-panel">{titulo}</h2>}
      <ul className="opciones">
        {opciones.map((o, i) => (
          <li key={o.id}>
            <button
              type="button"
              className="opcion"
              disabled={quieto}
              title={o.ayuda}
              onClick={() => {
                alElegir({ tipo: o.tipo, carga: o.carga });
              }}
            >
              {i < CON_ATAJO ? <kbd className="atajo">{i + 1}</kbd> : null}
              <span className="opcion-texto">
                <span className="opcion-rotulo">{o.rotulo}</span>
                {o.ayuda.length > 0 ? <span className="opcion-ayuda">{o.ayuda}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
