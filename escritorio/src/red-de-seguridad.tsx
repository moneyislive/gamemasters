/**
 * LA RED DE SEGURIDAD: que un fallo de pintado diga algo en vez de dejar blanco.
 *
 * ═══ QUÉ PASABA SIN ESTO, MEDIDO Y NO SUPUESTO ═══
 *
 * Una excepción dentro del árbol de React no deja la pantalla a medias: React
 * DESMONTA EL ÁRBOL ENTERO. Y como aquí el árbol entero es la Sala —catálogo
 * incluido—, el resultado es un `<div id="raiz">` vacío: una página en blanco,
 * sin un mensaje, sin un botón, sin un rastro fuera de la consola que nadie
 * tiene abierta. Se midió así: bastó con quitarle el campo `opciones` a la
 * respuesta de una mesa —o sea con hablar con un servidor anterior a la fase
 * 5— para que un `.length` sobre `undefined` se llevara por delante la Sala.
 *
 * Aquel fallo concreto ya no puede pasar: el campo está declarado opcional y el
 * compilador obliga a la guarda. Esto no está aquí por él, está aquí por el
 * siguiente, porque «una página en blanco sin una palabra» es exactamente el
 * fallo mudo que este cliente dice existir para no tener, y era el único sitio
 * donde lo tenía.
 *
 * ═══ POR QUÉ SOLO UNA, Y EN LA RAÍZ ═══
 *
 * La tentación es envolver la mesa aparte para que un fallo pintando el tablero
 * deje el catálogo en pie. No se hace, y el motivo es que sería mentir con más
 * detalle: después de una excepción el estado de esa rama es DESCONOCIDO —a
 * medio actualizar, con el sondeo en marcha y una llave de asiento en un `ref`—
 * y seguir enseñando el resto de la pantalla como si funcionara invita a seguir
 * pulsando. Una sola red en la raíz dice la verdad entera: esto se ha roto,
 * recarga.
 *
 * ═══ Y LO QUE ESTO NO SE PUEDE COMPRAR, DICHO AQUÍ Y NO EN EL COMPROBADOR ═══
 *
 * Que la red atrape de verdad. `verify:escritorio` renderiza los componentes con
 * `renderToStaticMarkup`, y el renderizado a texto de React NO EJECUTA los
 * límites de error: una excepción sube tal cual. Así que montar la prueba allí
 * daría una comprobación que pasa por el motivo equivocado, que es peor que no
 * tenerla.
 *
 * Lo que sí se saca fuera y sí se compra es el TEXTO: `loQueSeDiceDeUnFallo` es
 * una función pura, y lo que de verdad se rompe con el tiempo no es que el
 * `catch` exista, es que alguien acabe enseñando ahí un `[object Object]`.
 */
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

/**
 * QUÉ SE LEE CUANDO ALGO SE ROMPE, y por qué se enseña el mensaje crudo.
 *
 * Se enseña porque el destinatario de esta pantalla no es quien juega: quien
 * juega ya ha perdido la partida en ese instante y lo único que puede hacer es
 * recargar. El destinatario es quien recibe el aviso —«se me ha quedado en
 * blanco»— y necesita una línea que pegar. Un «ha ocurrido un error inesperado»
 * es exactamente esa línea sin la información.
 *
 * Y no hay secretos que se puedan escapar por aquí: lo que llega es el mensaje
 * de una excepción de pintado, y lo que se pinta ya había pasado la proyección.
 */
export function loQueSeDiceDeUnFallo(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return 'un fallo que ni siquiera ha traído mensaje';
}

interface LoQueGuarda {
  /*
   * `children` en inglés, que es la única palabra de este fichero que no está en
   * castellano: no es un nombre nuestro, es la ranura que React reserva para lo
   * que va dentro de una etiqueta, igual que `onClick` o `className`. Traducirla
   * obligaría a escribir `hijos={<Sala />}` en vez de meter la Sala dentro, y eso
   * es cambiar cómo se lee el arranque para ganar una palabra.
   */
  children: ReactNode;
  /** A dónde vuelve el enlace de socorro. Es `BASE`, y se pasa para no importarlo. */
  base: string;
}

interface SiSeRompio {
  roto: string | null;
}

export class RedDeSeguridad extends Component<LoQueGuarda, SiSeRompio> {
  public override state: SiSeRompio = { roto: null };

  public static getDerivedStateFromError(error: unknown): SiSeRompio {
    return { roto: loQueSeDiceDeUnFallo(error) };
  }

  /*
   * A la consola VA IGUAL, y con la traza entera. Esta pantalla enseña una línea
   * para poder copiarla; quien abra las herramientas del navegador tiene que
   * seguir encontrando el fallo con su pila, porque es lo único con lo que se
   * arregla.
   */
  public override componentDidCatch(error: unknown, donde: ErrorInfo): void {
    console.error('La Sala se ha roto pintando:', error, donde.componentStack);
  }

  public override render(): ReactNode {
    const roto = this.state.roto;
    if (roto === null) return this.props.children;
    return (
      <div className="sala">
        <header className="cabecera">
          <a className="vuelta" href={this.props.base}>
            Sala de Arcade
          </a>
        </header>
        <main className="dentro">
          <div className="sin-servidor">
            <h2>Esta pantalla se ha roto</h2>
            <p>
              No es que la mesa se haya perdido: es que este cliente ha fallado dibujándola. Tu
              asiento sigue guardado en este navegador, así que recargar suele bastar.
            </p>
            <p className="letra-chica">
              Lo que dijo el fallo, por si hay que contarlo: <code>{roto}</code>
            </p>
            <button
              type="button"
              className="opcion"
              onClick={() => {
                window.location.reload();
              }}
            >
              <span className="opcion-texto">
                <span className="opcion-rotulo">Recargar</span>
              </span>
            </button>
          </div>
        </main>
      </div>
    );
  }
}
