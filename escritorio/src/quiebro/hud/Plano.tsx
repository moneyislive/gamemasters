/**
 * EL PLANO ENTERO: la ciudad con el norte arriba, translúcido y sin parar el juego
 * (`docs/quiebro/CIUDAD-ABIERTA.md` §5.9). Se abre con el botón PLANO (44 pt, bajo AVISO) o con la M.
 * Tocar un sitio manda «Aquí» sobre el nudo más cercano; tocar un Fallo o una cabina tiende el hilo de
 * rumbo, y tocarlo otra vez lo suelta. Todo en `pointerdown`: `onClick` no llega en la app.
 *
 * ═══ NO PARA NADA ═══
 *
 * La noche es de varios y no se pausa. El plano sólo coge los toques que caen en su hoja: fuera de ella
 * los mandos de debajo siguen (la palanca nace donde se apoya el pulgar, y el pulgar suele estar abajo a
 * la izquierda, fuera del plano). En el PC, al abrirse suelta el ratón bloqueado —si no, no habría
 * puntero con el que tocar— y WASD sigue andando. Esc lo cierra sin abrir además el menú.
 *
 * ═══ NÍTIDO EN CUALQUIER PANTALLA ═══
 *
 * El minimapa amplía un lienzo de 540 píxeles; el plano no: la ciudad se vuelve a pintar a la resolución
 * de su hoja (`pintarLaCiudad` son rectángulos, y un rectángulo se pinta igual de nítido a cualquier
 * escala), sólo al abrirse o al cambiar de tamaño o de noche. Las marcas van en un segundo lienzo encima,
 * que se repinta `REFRESCOS_DEL_MINIMAPA` veces por segundo, o a cada fotograma mientras se abre el aro
 * de un «Aquí» recién tocado.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { JSX, PointerEvent } from 'react';
import { BORDE_DE_LA_CIUDAD } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import type { FuenteDelMapa, OrdenesDelMapa } from '../orientacion';
import { MARCAS_DEL_MINIMAPA, PIXELES_POR_METRO, TECLA_DEL_PLANO } from '../orientacion';
import { Boton } from './Boton';
import {
  alPlanoEnPantalla,
  COLORES_DEL_MAPA,
  escalaDelPlano,
  esLaTeclaDelPlano,
  ladoDelPlano,
  MARGEN_DEL_PLANO_M,
  pintarLaCiudad,
  pintarLasSalidas,
  REFRESCO_DEL_MINIMAPA_MS,
  TEXTOS_DEL_MAPA,
  tocarElPlano,
} from './mapa';
import { DURACION_DEL_TOQUE_MS, ORDEN_DE_CLASE, pintarElPropio, pintarElToque, pintarMarca, pintarRuta } from './pintar-marcas';
import { hiloNuevo, tenderElHilo, tramoFinal } from './rumbo';

/** El ancho de la columna de al lado (título, leyenda, soltar, cerrar; `.q-plano-lado` en `hud.css`), y los huecos, en pt. */
const COLUMNA_PT = 172;
const HUECO_PT = 14;
const RELLENO_PT = 12;

function densidad(): number {
  const d = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return Math.max(1, Math.min(2, d));
}

/** EL BOTÓN PLANO: 44 pt bajo AVISO (a la izquierda con la opción zurda). En el PC lleva su tecla. */
export function BotonDelPlano({ abierto, alAlternar, zurdo = false, tactil = true }: { readonly abierto: boolean; readonly alAlternar: () => void; readonly zurdo?: boolean; readonly tactil?: boolean }): JSX.Element {
  return (
    <Boton clase={zurdo ? 'q-plano-boton zurdo' : 'q-plano-boton'} etiqueta={TEXTOS_DEL_MAPA.plano} elegido={abierto} alPulsar={() => alAlternar()}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 4v13.5M15 6.5V20" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
      </svg>
      {tactil ? <span className="rotulo">{TEXTOS_DEL_MAPA.plano}</span> : <kbd>M</kbd>}
    </Boton>
  );
}

/**
 * LA M ABRE Y CIERRA EL PLANO, mientras `activa` (en la pelea y en la Tregua). Se escucha en la ventana,
 * como el resto del teclado (`mandos/teclado.ts`, que no usa la M).
 */
export function usarLaTeclaDelPlano(alAlternar: () => void, activa: boolean): void {
  useEffect(() => {
    if (!activa) return undefined;
    const alBajar = (e: KeyboardEvent): void => {
      if (!esLaTeclaDelPlano(e, TECLA_DEL_PLANO)) return;
      e.preventDefault();
      alAlternar();
    };
    window.addEventListener('keydown', alBajar);
    return () => window.removeEventListener('keydown', alBajar);
  }, [alAlternar, activa]);
}

export interface PropsDelPlano {
  readonly fuente: FuenteDelMapa;
  readonly ordenes: OrdenesDelMapa;
  readonly abierto: boolean;
  readonly alCerrar: () => void;
}

export function Plano({ fuente, ordenes, abierto, alCerrar }: PropsDelPlano): JSX.Element | null {
  const raiz = useRef<HTMLDivElement>(null);
  const ciudad = useRef<HTMLCanvasElement>(null);
  const marcas = useRef<HTMLCanvasElement>(null);
  const toques = useRef<{ x: number; z: number; desde: number }[]>([]);
  const repintarYa = useRef(false);
  const [lado, ponerLado] = useState(0);
  const [hayRumbo, ponerHayRumbo] = useState(false);
  const [vigia, ponerVigia] = useState(false);

  /* El tamaño: lo que quepa, con la columna al lado (tumbado) o debajo (de pie). */
  useLayoutEffect(() => {
    if (!abierto) return undefined;
    const el = raiz.current;
    if (el === null) return undefined;
    const medir = (): void => {
      const estilo = getComputedStyle(el);
      const ancho = el.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight) - 2 * RELLENO_PT;
      const alto = el.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom) - 2 * RELLENO_PT;
      ponerLado(ladoDelPlano(ancho, alto, COLUMNA_PT + HUECO_PT));
    };
    medir();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }
    const mirador = new ResizeObserver(medir);
    mirador.observe(el);
    return () => mirador.disconnect();
  }, [abierto]);

  /* Al abrirse en el PC, el ratón bloqueado se suelta: sin puntero no se toca nada. */
  useEffect(() => {
    if (!abierto || typeof document === 'undefined') return;
    if (document.pointerLockElement !== null && typeof document.exitPointerLock === 'function') document.exitPointerLock();
  }, [abierto]);

  /* Esc lo cierra, y sólo eso: se coge en la captura para que no abra también el menú. */
  useEffect(() => {
    if (!abierto) return undefined;
    const alBajar = (e: KeyboardEvent): void => {
      if (e.code !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      alCerrar();
    };
    window.addEventListener('keydown', alBajar, true);
    return () => window.removeEventListener('keydown', alBajar, true);
  }, [abierto, alCerrar]);

  /* Lo que se pinta: la ciudad al cambiar el tamaño o la noche; las marcas a 10 Hz. */
  useEffect(() => {
    if (!abierto || lado <= 0) return undefined;
    let vivo = true;
    let pedido = 0;
    let ultimo = Number.NEGATIVE_INFINITY;
    let nochePintada: object | null = null;
    const hilo = hiloNuevo();
    let conRumbo = false;
    let deVigia = false;
    const k = escalaDelPlano(lado);
    const aPantalla = (x: number, z: number): { readonly u: number; readonly v: number } => alPlanoEnPantalla(x, z, lado);

    const pintarCiudad = (c: HTMLCanvasElement): void => {
      const noche = fuente.noche();
      const ctx = c.getContext('2d');
      if (noche === null || ctx === null) return;
      const d = densidad();
      const px = Math.round(lado * d);
      c.width = px;
      c.height = px;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = COLORES_DEL_MAPA.vacio;
      ctx.fillRect(0, 0, px, px);
      const m = MARGEN_DEL_PLANO_M * PIXELES_POR_METRO;
      ctx.setTransform(k * d, 0, 0, k * d, m * k * d, m * k * d);
      pintarLaCiudad(ctx, noche);
      pintarLasSalidas(ctx, noche);
      /* El cerco: la fachada continua del borde, que es estructura. */
      ctx.strokeStyle = 'rgba(63, 242, 194, 0.35)';
      ctx.lineWidth = 2 * PIXELES_POR_METRO;
      ctx.strokeRect(-1 * PIXELES_POR_METRO, -1 * PIXELES_POR_METRO, (2 * BORDE_DE_LA_CIUDAD + 2) * PIXELES_POR_METRO, (2 * BORDE_DE_LA_CIUDAD + 2) * PIXELES_POR_METRO);
      nochePintada = noche;
    };

    const pintarMarcas = (c: HTMLCanvasElement, ahora: number): void => {
      const noche = fuente.noche();
      const ctx = c.getContext('2d');
      if (ctx === null) return;
      const d = densidad();
      const px = Math.round(lado * d);
      if (c.width !== px || c.height !== px) {
        c.width = px;
        c.height = px;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, px, px);
      if (noche === null) return;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const yo = fuente.yo();
      const rumbo = fuente.rumbo();
      if (rumbo !== null && yo !== null) {
        tenderElHilo(noche.grafo, rumbo, yo.x, yo.z, hilo, tramoFinal(noche, rumbo.objetivo));
        pintarRuta(ctx, hilo.ruta, hilo.puntos, aPantalla, 2.4, ahora / 60);
      }
      const lista = fuente.marcas().slice(0, MARCAS_DEL_MINIMAPA);
      lista.sort((a, b) => ORDEN_DE_CLASE[a.clase] - ORDEN_DE_CLASE[b.clase] || Number(a.rumbo) - Number(b.rumbo));
      for (const m of lista) {
        const p = aPantalla(m.x, m.z);
        pintarMarca(ctx, m.clase, m.color, p.u, p.v, 1.25, ahora, m.rumbo);
      }
      if (yo !== null) {
        const p = aPantalla(yo.x, yo.z);
        pintarElPropio(ctx, p.u, p.v, yo.mira, 1.15);
      }
      const vivos = toques.current;
      for (let i = vivos.length - 1; i >= 0; i--) {
        const t = vivos[i] as { x: number; z: number; desde: number };
        const edad = ahora - t.desde;
        if (edad >= DURACION_DEL_TOQUE_MS) {
          vivos.splice(i, 1);
          continue;
        }
        const p = aPantalla(t.x, t.z);
        pintarElToque(ctx, p.u, p.v, edad);
      }
      /* La escala: 100 m, abajo a la izquierda. */
      const cien = 100 * PIXELES_POR_METRO * k;
      ctx.fillStyle = 'rgba(3, 7, 9, 0.7)';
      ctx.fillRect(8, lado - 24, cien + 12, 16);
      ctx.fillStyle = 'rgba(222, 240, 232, 0.8)';
      ctx.fillRect(14, lado - 13, cien, 2);
      ctx.font = '10px "Cascadia Mono", "Roboto Mono", Consolas, monospace';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillText('100 m', 14, lado - 15.5);
      /* El norte, arriba a la izquierda. */
      ctx.fillStyle = 'rgba(63, 242, 194, 0.85)';
      ctx.font = '600 11px Bahnschrift, "Roboto Condensed", "Arial Narrow", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', 16, 18);
      ctx.beginPath();
      ctx.moveTo(16, 4);
      ctx.lineTo(20, 9);
      ctx.lineTo(12, 9);
      ctx.closePath();
      ctx.fill();

      const r = rumbo !== null;
      if (r !== conRumbo) {
        conRumbo = r;
        ponerHayRumbo(r);
      }
      const v = fuente.vigia();
      if (v !== deVigia) {
        deVigia = v;
        ponerVigia(v);
      }
    };

    const pintar = (ahora: number): void => {
      if (!vivo) return;
      pedido = requestAnimationFrame(pintar);
      const cc = ciudad.current;
      const cm = marcas.current;
      if (cc === null || cm === null) return;
      if (fuente.noche() !== nochePintada) pintarCiudad(cc);
      if (repintarYa.current || toques.current.length > 0 || ahora - ultimo >= REFRESCO_DEL_MINIMAPA_MS) {
        repintarYa.current = false;
        ultimo = ahora;
        pintarMarcas(cm, ahora);
      }
    };
    pedido = requestAnimationFrame(pintar);
    return () => {
      vivo = false;
      cancelAnimationFrame(pedido);
    };
  }, [abierto, lado, fuente]);

  if (!abierto) return null;

  const alTocar = (e: PointerEvent<HTMLCanvasElement>): void => {
    const toque = tocarElPlano(e, e.currentTarget.getBoundingClientRect(), fuente, ordenes);
    if (toque !== null && toque.tipo === 'aqui') toques.current.push({ x: toque.x, z: toque.z, desde: performance.now() });
    if (toque !== null) repintarYa.current = true;
  };

  return (
    <div ref={raiz} className="q-plano">
      <div className="q-plano-hoja q-panel" style={{ padding: RELLENO_PT, gap: HUECO_PT }}>
        <div className="q-plano-mapa" style={{ width: lado, height: lado }}>
          <canvas ref={ciudad} className="ciudad" aria-hidden="true" />
          <canvas ref={marcas} className="marcas" role="application" aria-label={TEXTOS_DEL_MAPA.ayuda} onPointerDown={alTocar} />
        </div>
        <div className="q-plano-lado">
          <div className="q-titulo">
            {TEXTOS_DEL_MAPA.plano}
            {vigia ? ` · ${TEXTOS_DEL_MAPA.vigia}` : ''}
          </div>
          <ul className="q-plano-leyenda">
            <li className="tu">
              <i />
              {TEXTOS_DEL_MAPA.tu}
            </li>
            <li className="fallo">
              <i />
              {TEXTOS_DEL_MAPA.fallo}
            </li>
            <li className="cabina">
              <i />
              {TEXTOS_DEL_MAPA.cabina}
            </li>
            <li className="companero">
              <i />
              {TEXTOS_DEL_MAPA.companero}
            </li>
            <li className="refugio">
              <i />
              {TEXTOS_DEL_MAPA.refugio}
            </li>
            <li className="aqui">
              <i />
              {TEXTOS_DEL_MAPA.aqui}
            </li>
          </ul>
          <p className="q-nota">{TEXTOS_DEL_MAPA.ayuda}</p>
          {hayRumbo ? (
            <Boton clase="q-boton secundario q-plano-soltar" alPulsar={() => ordenes.soltarElRumbo()}>
              {TEXTOS_DEL_MAPA.soltarRumbo}
            </Boton>
          ) : null}
          <Boton clase="q-boton secundario q-plano-cerrar" etiqueta={TEXTOS_DEL_MAPA.cerrar} alPulsar={alCerrar}>
            ✕
          </Boton>
        </div>
      </div>
    </div>
  );
}
