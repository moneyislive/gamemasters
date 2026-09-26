/**
 * EL RAYO EN PC: el mismo botón que en el teléfono, pero de mirar (no se toca: se mantiene la R). Abajo a la
 * izquierda, lejos de la ayuda de teclas, con su recarga —la que apuntó la sala—, su carga mientras se mantiene
 * la R y la tecla al lado. Sin él, en PC no se sabría cuándo vuelve a estar listo.
 *
 * Fuera de React, como los botones del táctil: un `requestAnimationFrame` que lee `Partida.leerLosBotones` y
 * escribe clases y variables sólo cuando cambian.
 */
import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { DefinicionesDelAro, Icono } from '../mandos/iconos';
import { CIRCUNFERENCIA_DEL_ARO, desfaseDelAro, NOMBRE_DEL_RAYO, pintarLasMuescas, segundosDeLaRecarga } from '../mandos/Tactil';
import type { Partida } from '../red/partida';

export function RayoDePC({ partida }: { readonly partida: Partida | null }): JSX.Element {
  const boton = useRef<HTMLDivElement>(null);
  const segundos = useRef<HTMLSpanElement>(null);
  const carga = useRef<SVGCircleElement>(null);
  const niveles = useRef<SVGGElement>(null);
  useEffect(() => {
    let vivo = true;
    let pedido = 0;
    let escrito = '';
    let umbralesPintados: readonly number[] | null = null;
    const pintar = (): void => {
      if (!vivo) return;
      pedido = requestAnimationFrame(pintar);
      const el = boton.current;
      if (el === null) return;
      const r = partida?.leerLosBotones(performance.now()).rayo ?? null;
      const hay = r !== null && r.hay;
      const clave = hay ? `${String(r.cargando)}|${String(r.listo)}|${r.recarga.toFixed(3)}|${r.c.toFixed(3)}|${String(r.quedaMs > 0 ? Math.ceil(r.quedaMs / 1000) : 0)}` : 'no';
      if (clave === escrito) return;
      escrito = clave;
      el.style.display = hay ? 'grid' : 'none';
      if (!hay) return;
      el.classList.toggle('cargando', r.cargando);
      el.classList.toggle('pleno', r.cargando && r.c >= 1);
      el.classList.toggle('recarga', r.recarga > 0 && !r.cargando);
      el.classList.toggle('apagada', !r.listo && r.recarga <= 0);
      el.style.setProperty('--q-barrido', r.recarga.toFixed(3));
      if (carga.current !== null) carga.current.style.strokeDashoffset = desfaseDelAro(r.cargando ? r.c : 0);
      /* Las muescas de los niveles, como en el teléfono: en el origen del círculo (`muescaDelUmbral`), una vez por tiro. */
      if (r.umbrales !== umbralesPintados && niveles.current !== null) {
        umbralesPintados = r.umbrales;
        pintarLasMuescas(niveles.current, r.umbrales);
      }
      if (segundos.current !== null) segundos.current.textContent = r.cargando ? '' : segundosDeLaRecarga(r.quedaMs);
    };
    pedido = requestAnimationFrame(pintar);
    return () => {
      vivo = false;
      cancelAnimationFrame(pedido);
    };
  }, [partida]);
  return (
    <div ref={boton} className="q-tecla rayo q-rayo-pc" aria-label={`${NOMBRE_DEL_RAYO}: mantén R`} style={{ display: 'none' }}>
      <DefinicionesDelAro />
      <svg className="aro" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="filo" cx="50" cy="50" r="48" />
        <circle className="dentro" cx="50" cy="50" r="43.5" />
      </svg>
      <svg className="carga" viewBox="0 0 100 100" aria-hidden="true">
        <g ref={niveles} className="niveles" />
        <circle ref={carga} cx="50" cy="50" r="46" strokeDasharray={CIRCUNFERENCIA_DEL_ARO} strokeDashoffset={CIRCUNFERENCIA_DEL_ARO} />
      </svg>
      <Icono de="rayo" />
      <span className="rotulo">{NOMBRE_DEL_RAYO}</span>
      <span ref={segundos} className="segundos" />
      <kbd className="tecla-pc">R</kbd>
    </div>
  );
}
