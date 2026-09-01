/**
 * EL MUEBLE `tablero`, pintado con SVG de verdad.
 *
 * ═══ QUÉ PINTA, Y DE DÓNDE SALE CADA COSA ═══
 *
 * De `TableroDeclarado`, que viaja DENTRO de la proyección y llega ya resuelto:
 * el juego hizo las coordenadas, eligió los colores y escribió, dentro de cada
 * pieza, el movimiento que se manda al tocarla. Aquí no se calcula ni una
 * posición ni se decide ni un color.
 *
 * Y por eso este fichero NO CONOCE NINGÚN JUEGO. No sabe qué es un hexágono, ni
 * una casilla, ni una pieza, ni un camino: sabe que hay caras (polígonos),
 * líneas (segmentos) y nudos (puntos), que algunas tienen `toque` y otras no, y
 * que se pintan en ese orden. Si aquí apareciera el nombre de algo que se juega,
 * este dejaría de ser un mueble y sería la pantalla de un juego — y el siguiente
 * arcade que llegara por `ARCADES_EXTERNOS` necesitaría que alguien de esta casa
 * le escribiera la suya.
 *
 * El aplanado y el orden de capas están en `plan.ts`, fuera de React, para que
 * se puedan contar desde un comprobador. Este fichero es el pincel.
 *
 * ═══ LO QUE CAMBIA RESPECTO AL MISMO MUEBLE EN UN TELÉFONO ═══
 *
 *   · No hay «área de toque mínima de 44 px»: hay un ratón, que apunta a un
 *     píxel. Lo que sí hay es un `hover` que dice qué es tocable ANTES de
 *     pulsar, que en una pantalla táctil no existe y aquí es la mitad de la
 *     información.
 *   · El tablero manda en el alto y se le da todo el que quepa en la ventana,
 *     porque un monitor es ancho y bajo mientras que un teléfono es estrecho y
 *     alto: encajar por anchura, que es lo correcto allí, aquí dejaría el
 *     dibujo minúsculo con media pantalla vacía.
 *   · Las piezas tocables son `<button>` de verdad envueltos en `<g>`, así que
 *     se llega a ellas con el tabulador y se disparan con la barra. Un SVG con
 *     `onClick` en un `<circle>` es invisible para un teclado.
 */
import type { MovimientoDeclarado, TableroDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { encuadreDe, loQueSePinta } from './plan';

export interface QueSePintaAqui {
  tablero: TableroDeclarado;
  alTocar: (movimiento: MovimientoDeclarado) => void;
  quieto: boolean;
}

export function Retablo({ tablero, alTocar, quieto }: QueSePintaAqui): JSX.Element {
  const piezas = loQueSePinta(tablero);

  return (
    <div className="retablo">
      {tablero.aviso.length > 0 ? <p className="aviso-del-tablero">{tablero.aviso}</p> : null}

      {piezas.length === 0 ? (
        /*
         * Un tablero declarado y VACÍO no es un fallo: es una partida que aún no
         * ha repartido nada. Se dice, porque un recuadro en negro sin una
         * palabra se lee como que la página está rota.
         */
        <p className="nada-que-hacer">Este tablero todavía no tiene nada dibujado.</p>
      ) : (
        <svg
          className="lienzo-del-tablero"
          viewBox={encuadreDe(tablero)}
          role="img"
          preserveAspectRatio="xMidYMid meet"
        >
          {piezas.map((p) => {
            /*
             * Una pieza con `toque` es tocable; una sin él, no. La decisión no
             * se toma aquí: viene escrita en el dato. Y `quieto` la apaga
             * temporalmente mientras hay una petición en vuelo, para que dos
             * clics seguidos no manden dos movimientos sobre la misma revisión.
             */
            const toque = p.toque;
            const dentro =
              p.clase === 'cara' ? (
                <>
                  <polygon
                    points={p.puntos.map((q) => `${String(q.x)},${String(q.y)}`).join(' ')}
                    fill={p.relleno}
                    stroke={p.borde}
                    strokeWidth={p.destacada ? 3 : 1}
                  />
                  {p.rotulo.length > 0 ? (
                    <text
                      x={centroDe(p.puntos).x}
                      y={centroDe(p.puntos).y}
                      className="texto-de-cara"
                      textAnchor="middle"
                    >
                      {p.rotulo}
                    </text>
                  ) : null}
                  {p.cifra.length > 0 ? (
                    <text
                      x={centroDe(p.puntos).x}
                      y={centroDe(p.puntos).y + 16}
                      className="cifra-de-cara"
                      textAnchor="middle"
                    >
                      {p.cifra}
                    </text>
                  ) : null}
                </>
              ) : p.clase === 'linea' ? (
                <line
                  x1={p.desde.x}
                  y1={p.desde.y}
                  x2={p.hasta.x}
                  y2={p.hasta.y}
                  stroke={p.color}
                  strokeWidth={p.grosor}
                  strokeLinecap="round"
                  opacity={p.tenue ? 0.35 : 1}
                />
              ) : p.forma === 'cuadrado' ? (
                <rect
                  x={p.punto.x - p.radio}
                  y={p.punto.y - p.radio}
                  width={p.radio * 2}
                  height={p.radio * 2}
                  fill={p.color}
                  opacity={p.tenue ? 0.35 : 1}
                />
              ) : (
                <circle
                  cx={p.punto.x}
                  cy={p.punto.y}
                  r={p.radio}
                  fill={p.color}
                  opacity={p.tenue ? 0.35 : 1}
                />
              );

            if (toque === null) {
              return (
                <g key={`${p.clase}:${p.id}`} className={`pieza pieza-${p.clase}`}>
                  {dentro}
                </g>
              );
            }
            return (
              <g
                key={`${p.clase}:${p.id}`}
                className={`pieza pieza-${p.clase} pieza-tocable${quieto ? ' pieza-quieta' : ''}`}
                role="button"
                tabIndex={quieto ? -1 : 0}
                aria-label={p.id}
                onClick={() => {
                  if (!quieto) alTocar(toque);
                }}
                onKeyDown={(e) => {
                  if (quieto) return;
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  alTocar(toque);
                }}
              >
                {dentro}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/**
 * El centro de un polígono, para colgar de él su rótulo.
 *
 * Es la media de los vértices y no el centro del rectángulo que lo contiene:
 * para las figuras regulares que declara un tablero —hexágonos, cuadrados— las
 * dos cosas coinciden, y para una irregular la media queda dentro de la figura
 * mientras que el centro del rectángulo puede caer fuera.
 *
 * Esta es la ÚNICA cuenta geométrica de todo el mueble, y hace falta porque el
 * contrato del tablero declara dónde está la cara pero no dónde poner su letra.
 */
function centroDe(puntos: readonly { x: number; y: number }[]): { x: number; y: number } {
  if (puntos.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const p of puntos) {
    x += p.x;
    y += p.y;
  }
  return { x: x / puntos.length, y: y / puntos.length };
}

/**
 * Los paneles que el juego mandó, tal cual: un título y unos renglones.
 *
 * Es el sitio donde un tablero cuenta lo que no cabe dibujado —quién va ganando,
 * qué tiene cada cual, qué llevas tú— y por eso es texto libre del juego y no
 * una tabla con columnas que este lado tuviera que entender.
 */
export function Paneles({ tablero }: { tablero: TableroDeclarado }): JSX.Element | null {
  if (tablero.paneles.length === 0) return null;
  return (
    <>
      {tablero.paneles.map((panel) => (
        <section className="panel" key={panel.titulo}>
          <h2 className="rotulo-de-panel">{panel.titulo}</h2>
          <ul className="renglones">
            {panel.lineas.map((linea, i) => (
              <li key={`${String(i)}:${linea}`}>{linea}</li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/**
 * Las acciones del tablero: lo que se hace sin tocar ninguna pieza.
 *
 * Vienen con `disponible` puesto por el juego, y una acción no disponible se
 * pinta APAGADA en vez de desaparecer: que exista un «pasar» que ahora mismo no
 * se puede pulsar es información, y quitarlo de la pantalla hace que la mesa
 * parezca tener menos salidas de las que tiene.
 */
export function AccionesDelTablero({
  tablero,
  alTocar,
  quieto,
}: QueSePintaAqui): JSX.Element | null {
  if (tablero.acciones.length === 0) return null;
  return (
    <div className="formulario">
      <ul className="opciones">
        {tablero.acciones.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              className="opcion"
              disabled={quieto || !a.disponible}
              title={a.ayuda}
              onClick={() => {
                alTocar(a.toque);
              }}
            >
              <span className="opcion-texto">
                <span className="opcion-rotulo">{a.rotulo}</span>
                {a.ayuda.length > 0 ? <span className="opcion-ayuda">{a.ayuda}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
