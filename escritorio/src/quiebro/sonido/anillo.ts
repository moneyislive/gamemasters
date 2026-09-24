/**
 * EL SILBIDO DEL ANILLO: lo primero de la lista del sonido (diseño §9), y lo único que es jugabilidad.
 *
 * ═══ QUÉ TIENE QUE CUMPLIR ═══
 *
 * «Sube de tono hasta el instante de impacto y va espacializado. Permite quebrar de oído.» Cada
 * palabra es un requisito:
 *
 *   · HASTA EL INSTANTE DE IMPACTO. El servidor manda el impacto ya traducido al reloj del aparato, en
 *     milisegundos de `performance.now()` (diseño §4.3). Aquí se pasa al reloj del `AudioContext` con
 *     el desfase MEDIDO (`cuentas.ts`), latencia de salida incluida: el silbido muere cuando el impacto
 *     SE OYE, no cuando el contexto lo procesa. En un Android con 120 ms de latencia, programarlo en el
 *     reloj del contexto sin más lo haría acabar 120 ms tarde, y el jugador que quiebra de oído
 *     quebraría tarde, SIEMPRE, sin saber por qué.
 *   · ESPACIALIZADO. El silbido sale de quien golpea: un Celador a la espalda silba a la espalda. Es
 *     un panoramizador con el perfil `senal` (se oye entero a 4 m y casi a la mitad a 25).
 *   · QUEBRAR DE OÍDO. El tono depende del tiempo que FALTA (el final suena igual en un anuncio de 300
 *     ms que en uno de 700) y late cada 125 ms con el último latido clavado en el impacto. El porqué,
 *     con números, en `SILBIDO` de `cuentas.ts`.
 *
 * ═══ POR QUÉ NO LO TOCA EL REMANSO ═══
 *
 * Va por el camino claro, en el reloj verdadero (diseño §4.4). Si un compañero entra en Remanso
 * mientras a ti te silba un anillo, tu silbido no se apaga ni baja una octava: sigue diciendo la
 * verdad sobre cuándo llega el golpe.
 *
 * ═══ EL CIERRE ═══
 *
 * En el impacto, un chasquido de medio milisegundo y una campanita aguda: el anillo que se cierra. Es
 * la marca que el oído usa para aprender dónde estaba el final, anillo a anillo.
 */
import {
  curvaDelSilbido,
  curvaDeVolumenDelSilbido,
  ordenesDeLosLatidos,
  planDelSilbido,
  registroDelSilbido,
  SILBIDO,
  corteDelAire,
  distancia,
} from './cuentas';
import type { OrdenDeGanancia, Punto3 } from './cuentas';
import type { MotorDelSonido } from './motor';
import { colocar } from './motor';
import { envolvente, filtro, ganancia, soplo } from './piezas';

export interface ManejoDelAnillo {
  /** El instante del contexto en que muere el silbido, o `null` si no llegó a sonar. */
  readonly impactoS: number | null;
  /** El anuncio se canceló (el que golpeaba cayó, quedó tocado): el silbido calla en 10 ms. */
  cancelar(): void;
  /** El que golpea se mueve. */
  mover(posicion: Punto3): void;
}

const ANILLO_MUDO: ManejoDelAnillo = { impactoS: null, cancelar: () => undefined, mover: () => undefined };

/** Margen para programar: lo que se programa «ya» tiene que caer, como poco, en el bloque siguiente. */
const MARGEN_MS = 12;

/** Aplica las órdenes de los latidos (tiempos en ms relativos al impacto) a un parámetro. */
function aplicar(p: AudioParam, ordenes: readonly OrdenDeGanancia[], impactoS: number): void {
  for (const o of ordenes) {
    const t = impactoS + o.tMs / 1000;
    if (o.tipo === 'fijar') p.setValueAtTime(o.valor, t);
    else if (o.tipo === 'rampa') p.linearRampToValueAtTime(o.valor, t);
    else p.setTargetAtTime(o.valor, t, o.constanteMs / 1000);
  }
}

/**
 * SILBA UN ANILLO. `inicioMs` e `impactoMs` en ms de `performance.now()` (el reloj del juego), la
 * posición de quien golpea (o `null`: en la cabeza) y la fuerza (1 = Celador; 0,5 = Prestado; menos
 * para los anillos que no son tuyos, que el diseño §3 pinta «en tenue»).
 */
export function silbarElAnillo(m: MotorDelSonido, inicioMs: number, impactoMs: number, posicion: Punto3 | null, fuerza = 1): ManejoDelAnillo {
  m.medir();
  const inicioS = m.aContexto(inicioMs, 'claro');
  const impactoS = m.aContexto(impactoMs, 'claro');
  if (inicioS === null || impactoS === null) return ANILLO_MUDO;
  const plan = planDelSilbido(inicioS * 1000, impactoS * 1000, m.ahora() * 1000, MARGEN_MS);
  if (plan === null) return ANILLO_MUDO;
  const f = Math.max(0, Math.min(1, Number.isFinite(fuerza) ? fuerza : 1));
  const t0 = plan.arrancaMs / 1000;
  const dur = plan.faltanMs / 1000;
  const ctx = m.ctx;
  const v = m.voz({ categoria: 'senales', camino: 'claro', posicion, alcance: 'senal', reverberacion: 0.1, t: t0, ganancia: 0.4 + 0.6 * f });

  // latidos ─▶ entrada; cuerpo ─▶ latidos. El cuerpo lleva el volumen de fondo; los latidos, el pulso.
  const latidos = ganancia(m, v, v.entrada, 0);
  const cuerpo = ganancia(m, v, latidos, 0);
  cuerpo.gain.setValueCurveAtTime(curvaDeVolumenDelSilbido(plan.faltanMs), t0, dur);
  aplicar(latidos.gain, ordenesDeLosLatidos(plan.faltanMs), impactoS);

  const curva = curvaDelSilbido(plan.faltanMs, f);
  const fin = impactoS + 0.012;
  // El silbido: un seno, su octava (brillo, más con la fuerza) y aire con el mismo tono.
  const principal = ctx.createOscillator();
  principal.type = 'sine';
  principal.frequency.setValueCurveAtTime(curva, t0, dur);
  principal.connect(cuerpo);
  const octava = ctx.createOscillator();
  octava.type = 'sine';
  octava.frequency.setValueCurveAtTime(curva.map((hz) => hz * 2), t0, dur);
  octava.connect(ganancia(m, v, cuerpo, 0.06 + 0.1 * f));
  const aire = ctx.createBufferSource();
  aire.buffer = m.ruido('blanco');
  aire.loop = true;
  const soplido = filtro(m, v, 'bandpass', curva[0] ?? SILBIDO.graveHz, 14, ganancia(m, v, cuerpo, 0.9));
  soplido.frequency.setValueCurveAtTime(curva, t0, dur);
  aire.connect(soplido);
  for (const fuente of [principal, octava, aire]) {
    fuente.start(t0);
    fuente.stop(fin);
    v.nodos.push(fuente);
  }

  // El cierre: el anillo que se cierra, clavado en el impacto.
  const cierre = ganancia(m, v, v.entrada, 1);
  soplo(m, v, impactoS, 'highpass', 3000, 0.7, 0.0005, 0.5, 0.004, cierre);
  const campanita = ganancia(m, v, cierre, 0);
  const finCampanita = envolvente(campanita.gain, impactoS, 0.001, 0.2 * (0.5 + 0.5 * f), 0.05);
  const nota = ctx.createOscillator();
  nota.frequency.value = SILBIDO.agudoHz * registroDelSilbido(f) * 2;
  nota.connect(campanita);
  nota.start(impactoS);
  nota.stop(finCampanita + 0.01);
  v.nodos.push(nota);

  m.agachar(t0, impactoS + 0.05);
  v.terminar(finCampanita + 0.05);

  let cancelado = false;
  let donde = posicion;
  const soltar = v.aire !== null ? m.seguir(() => donde, v.aire, fin) : null;
  return {
    impactoS,
    cancelar(): void {
      if (cancelado) return;
      cancelado = true;
      const ahora = ctx.currentTime;
      for (const g of [latidos.gain, cierre.gain]) {
        g.cancelScheduledValues(ahora);
        g.setTargetAtTime(0, ahora, 0.004);
      }
      soltar?.();
    },
    mover(p: Punto3): void {
      if (v.panoramizador === null || cancelado) return;
      donde = p;
      const ahora = ctx.currentTime;
      colocar(v.panoramizador, p, ahora, 0.02);
      v.aire?.frequency.setTargetAtTime(corteDelAire(distancia(p, m.oyente())), ahora, 0.05);
    },
  };
}
