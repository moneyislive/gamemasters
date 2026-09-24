/**
 * EL MINIMAPA: 112 pt redondos arriba a la izquierda, bajo el menú, con la mirada de la cámara hacia
 * arriba (`docs/quiebro/CIUDAD-ABIERTA.md` §5.9). Con la opción zurda va arriba a la derecha, bajo el
 * botín: a la izquierda está AVISO.
 *
 * ═══ CÓMO SE PINTA SIN QUE CUESTE ═══
 *
 *   · La ciudad de la noche se pinta UNA vez en un lienzo de 540 × 540 (`lienzoDeLaNoche`): unos mil
 *     quinientos rectángulos, ≈ 3-5 ms en un teléfono, cuando empieza la noche.
 *   · `REFRESCOS_DEL_MINIMAPA` veces por segundo se recorta y se gira ese lienzo con una sola
 *     `drawImage` (la transformación de `transformacionDelMinimapa`) y se ponen encima la ruta del rumbo
 *     y como mucho `MARCAS_DEL_MINIMAPA` marcas.
 *   · Entre dos refrescos la cámara sigue girando con el dedo a sesenta por segundo: el lienzo ya pintado
 *     se gira con CSS lo que falte (`rotate` en el compositor, sin repintar). El minimapa es redondo
 *     precisamente para esto: un círculo girado sigue siendo el mismo círculo. El propio y su cono de
 *     vista van aparte, fijos y mirando arriba.
 * Todo fuera de React, en su `requestAnimationFrame`, leyendo la `FuenteDelMapa`: un `setState` por
 * refresco sería un render de React diez veces por segundo para nada.
 *
 * Sin noche (la reunión) o sin sitio que centrar, no se ve. El Vigía, sin cuerpo, lo centra en su
 * último sitio.
 */
import { useEffect, useRef } from 'react';
import type { JSX, KeyboardEvent, PointerEvent } from 'react';
import type { FuenteDelMapa, MarcaDelMapa } from '../orientacion';
import { LADO_DEL_MINIMAPA_PT, MARCAS_DEL_MINIMAPA, PIXELES_POR_METRO } from '../orientacion';
import type { LienzoDelMapa } from './mapa';
import { COLORES_DEL_MAPA, giroQueFalta, lienzoDeLaNoche, pintarLasSalidas, RADIO_DEL_MINIMAPA_M, REFRESCO_DEL_MINIMAPA_MS, sitioEnElMinimapa, TEXTOS_DEL_MAPA, transformacionDelMinimapa } from './mapa';
import { COLOR_DE_CLASE, ORDEN_DE_CLASE, pintarFlecha, pintarMarca, pintarRuta, vaAlCanto } from './pintar-marcas';
import { hiloNuevo, tenderElHilo, tramoFinal } from './rumbo';
import { BORDE_DE_LA_CIUDAD } from '../../../../shared/arcade/juegos/quiebro-ciudad';

export interface PropsDelMinimapa {
  readonly fuente: FuenteDelMapa;
  /** Con la opción zurda, arriba a la derecha. */
  readonly zurdo?: boolean;
  /** Si se da, tocar el minimapa lo llama (abrir el plano). En `pointerdown`, como todo. */
  readonly alTocar?: () => void;
}

/** Los píxeles del lienzo del minimapa por pt: dos como mucho (más no se ve y cuesta). */
function densidad(): number {
  const d = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return Math.max(1, Math.min(2, d));
}

/** Un lienzo vacío del DOM para la ciudad de la noche. */
export function lienzoDelDocumento(): LienzoDelMapa | null {
  if (typeof document === 'undefined') return null;
  return document.createElement('canvas');
}

export function Minimapa({ fuente, zurdo = false, alTocar }: PropsDelMinimapa): JSX.Element {
  const raiz = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const pie = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    let pedido = 0;
    let ultimo = Number.NEGATIVE_INFINITY;
    let giroPintado = 0;
    let pintado = false;
    /* El último sitio conocido del propio (el Vigía, sin cuerpo, mira desde ahí): se reescribe, no se crea. */
    const sitio = { x: 0, z: 0 };
    let haySitio = false;
    const hilo = hiloNuevo();
    const orden: MarcaDelMapa[] = [];

    const refrescar = (c: HTMLCanvasElement, ahora: number, yo: { readonly x: number; readonly z: number }, giro: number): void => {
      const noche = fuente.noche();
      const ctx = c.getContext('2d');
      if (noche === null || ctx === null) return;
      const lado = LADO_DEL_MINIMAPA_PT;
      const d = densidad();
      const px = Math.round(lado * d);
      if (c.width !== px || c.height !== px) {
        c.width = px;
        c.height = px;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, px, px);
      ctx.save();
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.beginPath();
      ctx.arc(lado / 2, lado / 2, lado / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = COLORES_DEL_MAPA.vacio;
      ctx.fillRect(0, 0, lado, lado);

      /* La ciudad, girada: una sola `drawImage`, y encima las salidas de glifos y la ruta. */
      const m = transformacionDelMinimapa(yo, giro, lado, RADIO_DEL_MINIMAPA_M);
      ctx.setTransform(m[0] * d, m[1] * d, m[2] * d, m[3] * d, m[4] * d, m[5] * d);
      const ciudad = lienzoDeLaNoche(noche, lienzoDelDocumento);
      if (ciudad !== null) ctx.drawImage(ciudad as HTMLCanvasElement, 0, 0);
      pintarLasSalidas(ctx, noche);
      const rumbo = fuente.rumbo();
      const k = lado / 2 / (RADIO_DEL_MINIMAPA_M * PIXELES_POR_METRO);
      if (rumbo !== null) {
        tenderElHilo(noche.grafo, rumbo, yo.x, yo.z, hilo, tramoFinal(noche, rumbo.objetivo));
        pintarRuta(ctx, hilo.ruta, hilo.puntos, (x, z) => ({ u: (x + BORDE_DE_LA_CIUDAD) * PIXELES_POR_METRO, v: (z + BORDE_DE_LA_CIUDAD) * PIXELES_POR_METRO }), 2.2 / k, ahora / 90 / k);
      } else {
        hilo.puntos = 0;
        hilo.metros = -1;
      }

      /* Las marcas, derechas: su sitio sale de `alMinimapa`, la misma cuenta que la matriz. */
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const norte = sitioEnElMinimapa(yo.x, yo.z - 10_000, yo, giro, lado, RADIO_DEL_MINIMAPA_M, 9);
      ctx.fillStyle = 'rgba(3, 7, 9, 0.75)';
      ctx.beginPath();
      ctx.arc(norte.u, norte.v, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(63, 242, 194, 0.85)';
      ctx.font = '600 9px Bahnschrift, "Roboto Condensed", "Arial Narrow", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', norte.u, norte.v + 0.5);

      orden.length = 0;
      const marcas = fuente.marcas();
      for (let i = 0; i < marcas.length && orden.length < MARCAS_DEL_MINIMAPA; i++) orden.push(marcas[i] as MarcaDelMapa);
      orden.sort((a, b) => ORDEN_DE_CLASE[a.clase] - ORDEN_DE_CLASE[b.clase] || Number(a.rumbo) - Number(b.rumbo));
      for (const marca of orden) {
        const s = sitioEnElMinimapa(marca.x, marca.z, yo, giro, lado, RADIO_DEL_MINIMAPA_M);
        if (s.enElBorde) {
          if (vaAlCanto(marca.clase) || marca.rumbo) pintarFlecha(ctx, marca.clase, marca.color, s.u, s.v, s.angulo, marca.rumbo);
        } else {
          pintarMarca(ctx, marca.clase, marca.color, s.u, s.v, 1, ahora, marca.rumbo);
        }
      }
      ctx.restore();

      /* El pie: a qué va el rumbo y sus metros por calles, los de la sala. */
      const p = pie.current;
      if (p !== null) {
        const objetivo = rumbo === null ? null : orden.find((o) => o.rumbo) ?? null;
        const texto = rumbo === null || hilo.metros < 0 ? '' : `${String(hilo.metros)} m`;
        if (p.textContent !== texto) p.textContent = texto;
        p.style.color = objetivo === null ? '' : (objetivo.color ?? COLOR_DE_CLASE[objetivo.clase]);
      }
    };

    const pintar = (ahora: number): void => {
      if (!vivo) return;
      pedido = requestAnimationFrame(pintar);
      const caja = raiz.current;
      const c = lienzo.current;
      if (caja === null || c === null) return;
      const noche = fuente.noche();
      const propio = fuente.yo();
      if (propio !== null) {
        sitio.x = propio.x;
        sitio.z = propio.z;
        haySitio = true;
      }
      if (noche === null || !haySitio) {
        if (caja.style.visibility !== 'hidden') caja.style.visibility = 'hidden';
        pintado = false;
        return;
      }
      if (caja.style.visibility !== 'visible') caja.style.visibility = 'visible';
      const giro = fuente.giroDeLaCamara();
      if (!pintado || ahora - ultimo >= REFRESCO_DEL_MINIMAPA_MS) {
        ultimo = ahora;
        giroPintado = giro;
        pintado = true;
        refrescar(c, ahora, sitio, giro);
      }
      /* Lo que la cámara ha girado desde el último refresco, en el compositor. */
      const resto = giroQueFalta(giroPintado, giro);
      const giroCss = Math.abs(resto) < 1e-4 ? '' : `rotate(${resto.toFixed(4)}rad)`;
      if (c.style.transform !== giroCss) c.style.transform = giroCss;
    };
    pedido = requestAnimationFrame(pintar);
    return () => {
      vivo = false;
      cancelAnimationFrame(pedido);
    };
  }, [fuente]);

  const alBajar = (e: PointerEvent<HTMLDivElement>): void => {
    if (alTocar === undefined) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    alTocar();
  };
  const alTecla = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (alTocar === undefined || (e.key !== 'Enter' && e.key !== ' ') || e.repeat) return;
    e.preventDefault();
    alTocar();
  };
  const tocable = alTocar !== undefined;
  const medio = LADO_DEL_MINIMAPA_PT / 2;
  return (
    <div ref={raiz} className={zurdo ? 'q-mapa-mini zurdo' : 'q-mapa-mini'} style={{ visibility: 'hidden' }}>
      <div
        className="q-minimapa"
        role={tocable ? 'button' : 'img'}
        aria-label={TEXTOS_DEL_MAPA.minimapa}
        tabIndex={tocable ? 0 : undefined}
        onPointerDown={tocable ? alBajar : undefined}
        onKeyDown={tocable ? alTecla : undefined}
      >
        <canvas ref={lienzo} className="lienzo" width={LADO_DEL_MINIMAPA_PT} height={LADO_DEL_MINIMAPA_PT} />
        <svg className="yo" viewBox={`0 0 ${String(LADO_DEL_MINIMAPA_PT)} ${String(LADO_DEL_MINIMAPA_PT)}`} aria-hidden="true">
          <defs>
            <radialGradient id="q-minimapa-cono" cx={medio} cy={medio} r={medio * 0.62} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ffd28a" stopOpacity="0.34" />
              <stop offset="1" stopColor="#ffd28a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d={`M${String(medio)},${String(medio)} L${String(medio - 20)},${String(medio - 29)} A35,35 0 0 1 ${String(medio + 20)},${String(medio - 29)} Z`} fill="url(#q-minimapa-cono)" />
          <path
            d={`M${String(medio)},${String(medio - 7)} L${String(medio + 5.5)},${String(medio + 6)} L${String(medio)},${String(medio + 3)} L${String(medio - 5.5)},${String(medio + 6)} Z`}
            fill="#ffd28a"
            stroke="#1a0c02"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div ref={pie} className="pie" aria-live="off" />
    </div>
  );
}
