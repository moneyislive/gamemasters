/**
 * CÓMO SE VE CADA MARCA en el minimapa y en el plano, la ruta del rumbo y el propio. Lo comparten los dos
 * para que un Fallo sea el mismo dibujo en los dos sitios. Recibe el pincel de un lienzo 2D ya colocado en
 * pt CSS; no toca el DOM ni lee relojes (el instante llega de fuera).
 *
 * ═══ FORMA ADEMÁS DE COLOR ═══
 *
 * Como en la brújula (`Combate.tsx`): cada clase tiene su forma para quien no distingue el rojo del verde.
 *   · Fallo: un cuadrado verde-cian con el centro vacío, que tiembla (es el Sistema que falla).
 *   · Cabina: un rombo ámbar, el de la brújula.
 *   · Compañero: un punto de su color con filo oscuro. Caído: un aro de su color que late.
 *   · Refugio: un cuadrado hueco, tenue. Arca: una columna verde.
 *   · Enemigo (el Vigía): un punto rojo anaranjado, pequeño.
 *   · Aviso («Aquí»): un aro magenta que se abre, con el punto del color de quien lo dio.
 *   · El objetivo del rumbo lleva además un aro ámbar claro.
 * Lo que no cabe en el minimapa va al canto como una flecha de su color, hacia fuera.
 */
import type { ClaseDeMarca } from '../orientacion';

/** El color de cada clase cuando la marca no trae el suyo (los del HUD: `hud.css`). */
export const COLOR_DE_CLASE: Readonly<Record<ClaseDeMarca, string>> = {
  companero: '#eef7f3',
  caido: '#ff4d6d',
  fallo: '#3ff2c2',
  cabina: '#ffab40',
  refugio: 'rgba(222, 240, 232, 0.8)',
  arca: '#8dff6a',
  enemigo: '#ff5a24',
  aviso: '#ff3fa4',
};

/** El ámbar claro del jugador: el propio, su rumbo y su hilo. */
export const COLOR_DEL_PROPIO = '#ffd28a';
const SOMBRA = 'rgba(2, 6, 7, 0.92)';

/** En qué orden se pintan: lo que más importa, encima. */
export const ORDEN_DE_CLASE: Readonly<Record<ClaseDeMarca, number>> = { refugio: 0, enemigo: 1, arca: 2, aviso: 3, companero: 4, caido: 5, cabina: 6, fallo: 7 };

/** ¿Va al canto si no cabe? Los enemigos y los refugios, no: fuera del minimapa no dicen nada. */
export function vaAlCanto(clase: ClaseDeMarca): boolean {
  return clase !== 'enemigo' && clase !== 'refugio';
}

/** Pinta una marca centrada en `(u, v)` pt, a `escala` (1 en el minimapa). `ahora` en ms, para lo que late. */
export function pintarMarca(ctx: CanvasRenderingContext2D, clase: ClaseDeMarca, color: string | null, u: number, v: number, escala: number, ahora: number, esDelRumbo: boolean): void {
  const c = color ?? COLOR_DE_CLASE[clase];
  const s = escala;
  ctx.save();
  ctx.translate(u, v);
  if (esDelRumbo) {
    ctx.beginPath();
    ctx.arc(0, 0, 8.5 * s, 0, Math.PI * 2);
    ctx.lineWidth = 1.6 * s;
    ctx.strokeStyle = COLOR_DEL_PROPIO;
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(ahora / 180);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  switch (clase) {
    case 'fallo': {
      const t = Math.sin(ahora / 70) > 0.6 ? 0.8 * s : 0;
      ctx.shadowColor = c;
      ctx.shadowBlur = 8 * s;
      ctx.fillStyle = c;
      ctx.fillRect(-4.5 * s + t, -4.5 * s, 9 * s, 9 * s);
      ctx.shadowBlur = 0;
      ctx.fillStyle = SOMBRA;
      ctx.fillRect(-1.8 * s + t, -1.8 * s, 3.6 * s, 3.6 * s);
      break;
    }
    case 'cabina':
      ctx.rotate(Math.PI / 4);
      ctx.shadowColor = c;
      ctx.shadowBlur = 8 * s;
      ctx.fillStyle = c;
      ctx.fillRect(-3.6 * s, -3.6 * s, 7.2 * s, 7.2 * s);
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1 * s;
      ctx.strokeStyle = SOMBRA;
      ctx.strokeRect(-3.6 * s, -3.6 * s, 7.2 * s, 7.2 * s);
      break;
    case 'companero':
      ctx.beginPath();
      ctx.arc(0, 0, 4 * s, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
      ctx.lineWidth = 1.5 * s;
      ctx.strokeStyle = SOMBRA;
      ctx.stroke();
      break;
    case 'caido':
      ctx.beginPath();
      ctx.arc(0, 0, 5.5 * s, 0, Math.PI * 2);
      ctx.lineWidth = 2.2 * s;
      ctx.strokeStyle = c;
      ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(ahora / 260));
      ctx.stroke();
      break;
    case 'refugio':
      ctx.lineWidth = 1.4 * s;
      ctx.strokeStyle = c;
      ctx.strokeRect(-3.2 * s, -3.2 * s, 6.4 * s, 6.4 * s);
      break;
    case 'arca':
      ctx.shadowColor = c;
      ctx.shadowBlur = 6 * s;
      ctx.fillStyle = c;
      ctx.fillRect(-1.6 * s, -5 * s, 3.2 * s, 10 * s);
      break;
    case 'enemigo':
      ctx.beginPath();
      ctx.arc(0, 0, 3 * s, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
      break;
    case 'aviso': {
      const f = (ahora % 1200) / 1200;
      ctx.beginPath();
      ctx.arc(0, 0, (3 + 7 * f) * s, 0, Math.PI * 2);
      ctx.lineWidth = 1.6 * s;
      ctx.strokeStyle = COLOR_DE_CLASE.aviso;
      ctx.globalAlpha = 1 - f;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 2.6 * s, 0, Math.PI * 2);
      ctx.fillStyle = color ?? COLOR_DE_CLASE.aviso;
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/** La flecha del canto: un triángulo en `(u, v)` que apunta hacia fuera, en la dirección `angulo` (desde arriba, hacia la derecha). */
export function pintarFlecha(ctx: CanvasRenderingContext2D, clase: ClaseDeMarca, color: string | null, u: number, v: number, angulo: number, esDelRumbo: boolean): void {
  const c = color ?? COLOR_DE_CLASE[clase];
  ctx.save();
  ctx.translate(u, v);
  ctx.rotate(angulo);
  const t = esDelRumbo ? 6.5 : 5;
  ctx.beginPath();
  ctx.moveTo(0, -t);
  ctx.lineTo(t * 0.85, t * 0.7);
  ctx.lineTo(-t * 0.85, t * 0.7);
  ctx.closePath();
  ctx.fillStyle = c;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = esDelRumbo ? COLOR_DEL_PROPIO : SOMBRA;
  ctx.stroke();
  ctx.restore();
}

/**
 * La ruta del rumbo: `puntos` pares `[x, z]` de `ruta`, llevados a pantalla por `aPantalla`. Una línea
 * oscura debajo y el ámbar claro a trazos encima, para que se lea sobre la calle y sobre el tejado.
 */
export function pintarRuta(
  ctx: CanvasRenderingContext2D,
  ruta: Float32Array,
  puntos: number,
  aPantalla: (x: number, z: number) => { readonly u: number; readonly v: number },
  grosor: number,
  desfase: number,
): void {
  if (puntos < 2) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < puntos; i++) {
    const p = aPantalla(ruta[i * 2] as number, ruta[i * 2 + 1] as number);
    if (i === 0) ctx.moveTo(p.u, p.v);
    else ctx.lineTo(p.u, p.v);
  }
  ctx.lineWidth = grosor + 2.5;
  ctx.strokeStyle = SOMBRA;
  ctx.stroke();
  ctx.setLineDash([grosor * 2.2, grosor * 1.6]);
  ctx.lineDashOffset = -desfase;
  ctx.lineWidth = grosor;
  ctx.strokeStyle = COLOR_DEL_PROPIO;
  ctx.stroke();
  ctx.restore();
}

/** El propio en el plano: una flecha ámbar que mira a `mira` (radianes, 0 al norte, hacia el este). */
export function pintarElPropio(ctx: CanvasRenderingContext2D, u: number, v: number, mira: number, escala: number): void {
  ctx.save();
  ctx.translate(u, v);
  ctx.rotate(mira);
  const s = escala;
  ctx.beginPath();
  ctx.moveTo(0, -8 * s);
  ctx.lineTo(6 * s, 6 * s);
  ctx.lineTo(0, 3 * s);
  ctx.lineTo(-6 * s, 6 * s);
  ctx.closePath();
  ctx.shadowColor = 'rgba(255, 171, 64, 0.8)';
  ctx.shadowBlur = 8 * s;
  ctx.fillStyle = COLOR_DEL_PROPIO;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.4 * s;
  ctx.strokeStyle = '#1a0c02';
  ctx.stroke();
  ctx.restore();
}

/** Un «Aquí» recién tocado en el plano: un aro que se abre y se apaga en `DURACION_DEL_TOQUE_MS`. */
export const DURACION_DEL_TOQUE_MS = 1200;
export function pintarElToque(ctx: CanvasRenderingContext2D, u: number, v: number, edadMs: number): void {
  const f = Math.max(0, Math.min(1, edadMs / DURACION_DEL_TOQUE_MS));
  ctx.save();
  ctx.beginPath();
  ctx.arc(u, v, 4 + 18 * f, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLOR_DE_CLASE.aviso;
  ctx.globalAlpha = 1 - f;
  ctx.stroke();
  ctx.restore();
}
