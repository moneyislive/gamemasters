/**
 * EL SONIDO DEL QUIEBRO NO MIENTE SOBRE EL TIEMPO: relojes, planificador, silbido, Remanso, distancias,
 * el Bis, la partitura y las texturas, probados en Node con números.
 *
 *   npx tsx escritorio/scripts/verificar-quiebro-sonido.ts
 *
 * ═══ POR QUÉ ESTE COMPROBADOR ═══
 *
 * El sonido de este juego tiene una parte que es JUGABILIDAD (diseño §9): el silbido del anillo tiene
 * que morir en el instante exacto del impacto para que se pueda quebrar de oído, y la música marca el
 * pulso contra el que se juzga el «a compás». Esos fallos no se OYEN: un silbido que acaba 40 ms tarde
 * suena bien, y el jugador sólo nota que el juego es injusto. Tampoco se oye que el planificador
 * dispare una ráfaga de notas atrasadas al volver de segundo plano si en el banco nadie cambia de
 * pestaña, ni que la cabina no llegue a 150 m si el banco la pone a cinco.
 *
 * Todo lo que es una CUENTA vive en `src/quiebro/sonido/{cuentas,partitura,sintesis}.ts`, sin WebAudio,
 * y aquí se prueba con relojes simulados (bloques de audio de 128 y de 1024 muestras, deriva de 100
 * ppm, una suspensión de dos segundos y medio, un tirón del hilo principal), con la semántica de
 * `AudioParam` escrita aquí aparte (para no fiarse de la del propio módulo), y con las texturas
 * medidas: que la calle se apaga en su RT60, que la cuerda afina, que el timbre calla.
 *
 * ═══ CADA COMPROBACIÓN SE HA VISTO EN ROJO ═══
 *
 * Con un barrido de mutaciones (una por defecto verosímil: la conversión de relojes al revés, el
 * planificador que dispara ráfagas, la curva del silbido lineal, el Remanso interpolado en lineal, la
 * partitura con un Fa sostenido, la cuerda sin retardo fraccionario, el fundido lineal…): cada una de
 * las comprobaciones de abajo se pone roja con al menos una. Si se añade una, se rompe algo a propósito
 * antes de darla por buena.
 *
 * ═══ LO QUE ESTO NO COMPRA ═══
 *
 * Que el grafo de WebAudio haga lo que las cuentas dicen: eso sólo se puede ver en un navegador. Lo
 * mira la AUTOPRUEBA del banco (`banco-quiebro-sonido.html`, botón «Autoprueba»), que renderiza cada
 * sonido en una `OfflineAudioContext` y mide el búfer: que el silbido muere en su muestra, que un
 * sonido a la izquierda suena a la izquierda, que el Remanso se come los agudos, que la cinta del Bis
 * repite lo que grabó. Y que suene BIEN no lo compra nadie más que un oído.
 */
import { readFileSync } from 'node:fs';
import { arnes } from '../../server/scripts/arnes';
import {
  aContexto,
  ALCANCES,
  aOido,
  BIS,
  caidaDelPerfil,
  corteDelAire,
  curvaDelSilbido,
  curvaDeVolumenDelSilbido,
  desvioDelPulso,
  dopplerDelPaso,
  faseDelPulso,
  fronteraSiguiente,
  gananciaADistancia,
  instanteDelPaso,
  LATIDO,
  latidosDelSilbido,
  medirElReloj,
  mezclaDelRemanso,
  mezclaDeLaLluvia,
  olvidarElReloj,
  ordenesDeLosLatidos,
  pasoEn,
  planDelBis,
  planDelSilbido,
  planificar,
  pulsoDeLaRejilla,
  registroDelSilbido,
  rejillaNueva,
  relojNuevo,
  RELOJ,
  REMANSO,
  SILBIDO,
  tonoDelSilbido,
  unidad,
  valorDeLaPuerta,
  volumenDelSilbido,
} from '../src/quiebro/sonido/cuentas';
import type { FuenteDelReloj, OrdenDeGanancia, PlanDelBis, PuertaDelBis, RelojDelSonido } from '../src/quiebro/sonido/cuentas';
import { acordeDelPaso, CADENCIA, capasDe, notaDeAcento, notasDelPaso } from '../src/quiebro/sonido/partitura';
import type { Capas, Instrumento } from '../src/quiebro/sonido/partitura';
import {
  aleteo,
  cerrarBucle,
  chapaGolpeada,
  correlacion,
  cristalRoto,
  cuerdaPulsada,
  db,
  golpeteoEnToldo,
  gotasDeLluvia,
  periodoDelAleteo,
  pico,
  respuestaDeCalle,
  CALLE_MOJADA,
  rms,
  ruido,
  tieneNoFinitos,
  timbreDeCabina,
  tonoPorAutocorrelacion,
} from '../src/quiebro/sonido/sintesis';
import { RECETAS, IDS_DE_SONIDO, alturaDeLaEsquirla } from '../src/quiebro/sonido/voces';
import type { IdDeSonido, OpcionesDeSonido } from '../src/quiebro/sonido/voces';
import { crearSonido } from '../src/quiebro/sonido/index';
import { crepitacionesDeLaCarga, puntoDelTramoMasCercano, retrasoDelTrueno, tonoDeLaCarga, VELOCIDAD_DEL_SONIDO_MS } from '../src/quiebro/sonido/cuentas';
import { DURACION_DEL_TRUENO_S, truenoDelRayo } from '../src/quiebro/sonido/sintesis';
import { RayoQueSuena, VOZ_DE_LA_CARGA_MS } from '../src/quiebro/sonido/rayo';
import type { SonidoDelRayo } from '../src/quiebro/sonido/rayo';
import { estadoDelRayoApagado } from '../src/quiebro/rayo/contrato';
import type { EfectosDelRayo } from '../src/quiebro/rayo/contrato';

/** El fuente sin comentarios: una regla que se cazara a sí misma en su comentario no valdría. */
function sinComentariosDe(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const { comprobar, paso, nota, terminar } = arnes();
const SR = 48000;

/** Un generador sembrado para las simulaciones (no el del módulo: si ése se rompe, esto no se entera). */
function sembrado(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
paso('Los dos relojes: el desfase medido cancela la latencia, los bloques, la deriva y los saltos');
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * UN APARATO SIMULADO. El reloj del audio corre a `1 + ppm·1e-6` del de `performance.now()`, se oye
 * `latenciaMs` después de procesarse, y `currentTime` avanza a saltos de `bloque` muestras. Cada medida
 * se toma en un instante `perf` al azar; la «marca de salida» da la pareja exacta (con ±1 ms de ruido,
 * que es lo que se ve en Chrome) y el «reloj del contexto», `currentTime` y la latencia declarada.
 */
interface Aparato {
  /** El desfase VERDADERO en `perf`: oído − contexto·1000. */
  verdad(perf: number): number;
  muestra(perf: number, fuente: FuenteDelReloj): { contextoS: number; oidoMs: number };
}

function aparato(opciones: { origenMs: number; latenciaMs: number; bloque: number; ppm: number; azar: () => number }): Aparato {
  const k = 1 + opciones.ppm * 1e-6;
  const contextoEn = (perf: number): number => ((perf - opciones.origenMs) * k) / 1000; // segundos exactos
  return {
    verdad(perf: number): number {
      // Lo que se procesa en contexto c se oye en perf(c) + latencia; perf(c) = origen + c·1000/k.
      const c = contextoEn(perf);
      return opciones.origenMs + (c * 1000) / k + opciones.latenciaMs - c * 1000;
    },
    muestra(perf: number, fuente: FuenteDelReloj) {
      const c = contextoEn(perf);
      if (fuente === 'marca-de-salida') {
        // La muestra que está SALIENDO ahora se procesó hace `latencia`; su instante de contexto y cuándo se oye.
        const cSale = contextoEn(perf - opciones.latenciaMs);
        return { contextoS: cSale, oidoMs: perf + (opciones.azar() * 2 - 1) };
      }
      const paso = opciones.bloque / SR;
      const cuantizado = Math.floor(c / paso) * paso;
      return { contextoS: cuantizado, oidoMs: perf + opciones.latenciaMs };
    },
  };
}

function medirMuchas(reloj: RelojDelSonido, a: Aparato, fuente: FuenteDelReloj, desde: number, cuantas: number, cada: number, azar: () => number): { reloj: RelojDelSonido; peorError: number } {
  let r = reloj;
  let peor = 0;
  for (let i = 0; i < cuantas; i++) {
    const perf = desde + i * cada + azar() * cada * 0.5;
    r = medirElReloj(r, a.muestra(perf, fuente));
    if (i >= 5 && r.desfaseMs !== null) peor = Math.max(peor, Math.abs(r.desfaseMs - a.verdad(perf)));
  }
  return { reloj: r, peorError: peor };
}

{
  const azar = sembrado(7);
  const pc = aparato({ origenMs: 1234.5, latenciaMs: 12, bloque: 128, ppm: 0, azar });
  const conMarca = medirMuchas(relojNuevo('marca-de-salida'), pc, 'marca-de-salida', 5000, 40, 100, azar);
  comprobar('con `getOutputTimestamp` la estimación queda a menos de 1,5 ms del desfase verdadero', conMarca.peorError < 1.5, conMarca.peorError);
  nota(`marca de salida: peor error ${conMarca.peorError.toFixed(2)} ms`);

  for (const bloque of [128, 1024]) {
    const a = aparato({ origenMs: 800, latenciaMs: 95, bloque, ppm: 0, azar });
    const r = medirMuchas(relojNuevo('reloj-del-contexto'), a, 'reloj-del-contexto', 3000, 60, 100, azar);
    const tolerancia = ((bloque / SR) * 1000) / 2 + 1.5;
    comprobar(
      `sin marca, con bloques de ${bloque} muestras, el cuartil bajo deja el error por debajo de medio bloque (${tolerancia.toFixed(1)} ms)`,
      r.peorError <= tolerancia,
      r.peorError,
    );
    nota(`reloj del contexto, bloque ${bloque}: peor error ${r.peorError.toFixed(2)} ms`);
  }

  const derivando = aparato({ origenMs: 0, latenciaMs: 40, bloque: 256, ppm: 100, azar });
  const deriva = medirMuchas(relojNuevo('marca-de-salida'), derivando, 'marca-de-salida', 1000, 600, 100, azar);
  comprobar('con 100 ppm de deriva durante un minuto, la ventana corta la sigue: nunca más de 2 ms de error', deriva.peorError < 2, deriva.peorError);

  const quieto = medirMuchas(relojNuevo('marca-de-salida'), pc, 'marca-de-salida', 5000, 20, 100, azar).reloj;
  const antes = quieto.desfaseMs ?? Number.NaN;
  const tiron = medirElReloj(quieto, { contextoS: 7.0, oidoMs: 7.0 * 1000 + antes + 80 });
  comprobar(
    'una medida rara suelta (un tirón de 80 ms del hilo principal) no mueve la estimación',
    tiron.desfaseMs === antes && tiron.raros.length === 1 && tiron.saltos === 0,
    { antes, despues: tiron.desfaseMs, raros: tiron.raros },
  );

  // La suspensión: el reloj del audio se para 2,5 s y el desfase salta 2500 ms.
  let saltado = quieto;
  for (let i = 0; i < RELOJ.rarosParaSaltar; i++) saltado = medirElReloj(saltado, { contextoS: 7 + i * 0.1, oidoMs: (7 + i * 0.1) * 1000 + antes + 2500 + i * 0.3 });
  comprobar(
    'tras una suspensión, tres medidas coherentes con el desfase nuevo lo adoptan y cuentan un salto',
    saltado.desfaseMs !== null && Math.abs(saltado.desfaseMs - (antes + 2500)) < 1 && saltado.saltos === 1,
    { desfase: saltado.desfaseMs, esperado: antes + 2500, saltos: saltado.saltos },
  );
  let disperso = quieto;
  for (const extra of [120, 400, 900]) disperso = medirElReloj(disperso, { contextoS: 8, oidoMs: 8000 + antes + extra });
  comprobar('tres medidas raras que no casan entre sí NO se toman por un salto', disperso.desfaseMs === antes && disperso.saltos === 0, disperso);

  const olvidado = olvidarElReloj(saltado);
  const primera = medirElReloj(olvidado, { contextoS: 1, oidoMs: 4321 });
  comprobar(
    'olvidar el reloj (al volver a correr) lo deja sin medida, conserva los saltos, y la primera medida se adopta ya',
    olvidado.desfaseMs === null && olvidado.saltos === 1 && primera.desfaseMs === 4321 - 1000,
    { olvidado, primera: primera.desfaseMs },
  );

  const vacio = relojNuevo('marca-de-salida');
  let idaYVuelta = true;
  for (const ms of [0, 1234.567, 98765.4321, -50]) {
    const s = aContexto(quieto, ms);
    idaYVuelta = idaYVuelta && s !== null && Math.abs((aOido(quieto, s) ?? Number.NaN) - ms) < 1e-6;
  }
  comprobar('aContexto y aOido son inversas, y sin medidas no inventan nada (null)', idaYVuelta && aContexto(vacio, 100) === null && aOido(vacio, 1) === null);

  /*
   * LA QUE IMPORTA: en un Android con 120 ms de latencia, un impacto pedido para `impactoMs` y
   * programado en `aContexto(impactoMs)` se OYE en `impactoMs`. Si la conversión ignorara la latencia
   * (restar sólo los orígenes de los relojes), se oiría 120 ms tarde.
   */
  const android = aparato({ origenMs: 3000, latenciaMs: 120, bloque: 256, ppm: 30, azar });
  const medido = medirMuchas(relojNuevo('marca-de-salida'), android, 'marca-de-salida', 10000, 30, 100, azar).reloj;
  const impactoMs = 13500;
  const programado = aContexto(medido, impactoMs) ?? Number.NaN;
  const seOye = programado * 1000 + android.verdad(impactoMs);
  comprobar('con 120 ms de latencia de salida, lo programado para un instante SE OYE en ese instante (±1,5 ms)', Math.abs(seOye - impactoMs) < 1.5, {
    impactoMs,
    seOye,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
paso('El planificador: cada paso una vez, a tiempo, y sin ráfaga después de un parón');
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
{
  const r = rejillaNueva(0.5);
  const azar = sembrado(11);
  const vistos = new Map<number, number>();
  let siguiente = 0;
  let ahora = 0.3;
  let peorTarde = 0;
  let peorPronto = 0;
  while (ahora < 10.5) {
    const plan = planificar(r, siguiente, ahora, 0.15);
    for (const p of plan.pasos) {
      vistos.set(p.paso, (vistos.get(p.paso) ?? 0) + 1);
      peorTarde = Math.max(peorTarde, ahora - p.t);
      peorPronto = Math.max(peorPronto, p.t - ahora);
    }
    siguiente = plan.siguiente;
    ahora += 0.025 + azar() * 0.015;
  }
  const esperados = pasoEn(r, 10.5 - 0.2);
  let huecos = 0;
  let dobles = 0;
  for (let n = 0; n <= esperados; n++) {
    const v = vistos.get(n) ?? 0;
    if (v === 0) huecos++;
    if (v > 1) dobles++;
  }
  comprobar(`diez segundos de tics con temblor: los ${esperados + 1} pasos, cada uno exactamente una vez`, huecos === 0 && dobles === 0 && esperados > 70, { huecos, dobles });
  comprobar('y nada se programa en el pasado ni más allá de la anticipación', peorTarde <= 0 && peorPronto < 0.15 + 1e-9, { peorTarde, peorPronto });

  // El parón: tres segundos sin tics (una pestaña que vuelve).
  const antes = planificar(r, 0, 1, 0.15);
  const despues = planificar(r, antes.siguiente, 4, 0.15);
  const enVentana = Math.ceil((0.15 + 0.03) / r.pasoS) + 1;
  comprobar(
    `después de un parón de tres segundos NO hay ráfaga: se programan ${despues.pasos.length} pasos (como mucho ${enVentana}) y se saltan ${despues.saltados}`,
    despues.pasos.length <= enVentana && despues.saltados >= 20 && despues.pasos.every((p) => p.t >= 4 - 0.03 - 1e-9),
    { pasos: despues.pasos.length, saltados: despues.saltados },
  );

  const modo = fronteraSiguiente(r, 3.07, 16);
  const pulso = fronteraSiguiente(r, 3.07, 4);
  comprobar(
    'un cambio de modo entra en el compás siguiente y uno de racha en el pulso siguiente, sin saltarse ninguno',
    modo % 16 === 0 &&
      pulso % 4 === 0 &&
      instanteDelPaso(r, modo) >= 3.07 &&
      instanteDelPaso(r, modo - 16) < 3.07 &&
      instanteDelPaso(r, pulso) >= 3.07 &&
      instanteDelPaso(r, pulso - 4) < 3.07 &&
      fronteraSiguiente(r, instanteDelPaso(r, 32), 16) === 32,
    { modo, pulso },
  );
  let coherente = true;
  for (let n = -5; n < 200; n++) coherente = coherente && pasoEn(r, instanteDelPaso(r, n)) === n && pasoEn(r, instanteDelPaso(r, n) + r.pasoS * 0.999) === n;
  comprobar('pasoEn e instanteDelPaso son coherentes (también antes del origen)', coherente);
  comprobar('120 ppm en semicorcheas: un paso son 125 ms', Math.abs(r.pasoS - 0.125) < 1e-12, r.pasoS);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
paso('El pulso: fase y desvío con signo, en el reloj del juego');
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
{
  const p = { bpm: 120, periodoMs: 500, origenMs: 1000 };
  const casos: [number, number][] = [
    [1000, 0],
    [1470, -30],
    [1530, 30],
    [3000, 0],
    [960, -40],
    [-1030, -30],
    [1249.9, 249.9],
    [1250, -250],
  ];
  const mal = casos.filter(([t, esperado]) => Math.abs(desvioDelPulso(p, t) - esperado) > 1e-9);
  comprobar('el desvío es 0 en el pulso, negativo si se adelanta y positivo si se retrasa, en [−250, 250)', mal.length === 0, mal.map(([t]) => [t, desvioDelPulso(p, t)]));
  const fases = [0, 250, 499.999, -1, -250, 1e7].map((t) => faseDelPulso(p, t));
  comprobar('la fase está siempre en [0, 1), también antes del origen', fases.every((f) => f >= 0 && f < 1) && Math.abs(faseDelPulso(p, 1250) - 0.5) < 1e-12, fases);
  const reloj = medirElReloj(relojNuevo('marca-de-salida'), { contextoS: 2, oidoMs: 5000 });
  const r = rejillaNueva(2.5);
  const deLaRejilla = pulsoDeLaRejilla(r, reloj);
  comprobar(
    'el pulso de la rejilla se da en el reloj del OÍDO: su origen es cuándo se oye el paso 0, y su periodo 500 ms',
    deLaRejilla !== null && Math.abs(deLaRejilla.origenMs - 5500) < 1e-9 && Math.abs(deLaRejilla.periodoMs - 500) < 1e-9 && pulsoDeLaRejilla(r, relojNuevo('marca-de-salida')) === null,
    deLaRejilla,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
paso('El silbido del anillo: sube hasta el impacto, late clavado a él y muere en él');
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * La semántica de `AudioParam` para las órdenes del silbido, escrita AQUÍ y no importada: `fijar` es
 * `setValueAtTime`, `rampa` es `linearRampToValueAtTime` (desde el evento anterior) y `hacia` es
 * `setTargetAtTime` (exponencial desde el valor en su arranque).
 */
function simular(ordenes: readonly OrdenDeGanancia[], tMs: number, inicial: number): number {
  let valor = inicial;
  let tEvento = -Infinity;
  let objetivo: { desde: number; valor0: number; destino: number; constante: number } | null = null;
  const valorEn = (t: number): number => (objetivo === null ? valor : objetivo.destino + (objetivo.valor0 - objetivo.destino) * Math.exp(-(t - objetivo.desde) / objetivo.constante));
  for (const o of ordenes) {
    if (o.tMs > tMs) {
      if (o.tipo === 'rampa' && Number.isFinite(tEvento)) {
        const v0 = valorEn(tEvento);
        return v0 + (o.valor - v0) * ((tMs - tEvento) / (o.tMs - tEvento));
      }
      return valorEn(tMs);
    }
    if (o.tipo === 'hacia') {
      objetivo = { desde: o.tMs, valor0: valorEn(o.tMs), destino: o.valor, constante: o.constanteMs };
    } else {
      objetivo = null;
      valor = o.valor;
    }
    tEvento = o.tMs;
  }
  return valorEn(tMs);
}

{
  const tonos = [1200, 900, 700, 500, 300, 150, 60, 20, 0].map((f) => tonoDelSilbido(f, 1));
  const sube = tonos.every((v, i) => i === 0 || v > (tonos[i - 1] ?? Infinity) || (i === 1 && v === tonos[0]));
  comprobar(
    'el tono sube sin parar al acercarse el impacto, parte del grave más allá del horizonte y acaba EXACTAMENTE en el agudo',
    sube && tonos[0] === SILBIDO.graveHz && tonos[1] === SILBIDO.graveHz && Math.abs((tonos[8] ?? 0) - SILBIDO.agudoHz) < 1e-9,
    tonos.map((v) => v.toFixed(1)),
  );
  const pendienteFinal = tonoDelSilbido(0) - tonoDelSilbido(100);
  const pendienteInicial = tonoDelSilbido(600) - tonoDelSilbido(700);
  // Una curva exponencial pura (exponente 1) da una razón de 2,5; la del silbido, más de 10.
  comprobar('y se empina al final: sube más de cuatro veces más en los últimos 100 ms que entre 700 y 600', pendienteFinal > 4 * pendienteInicial, { pendienteFinal, pendienteInicial });
  comprobar(
    'la fuerza sube el registro sin cambiar la forma (un Prestado silba más grave que un Celador)',
    tonoDelSilbido(0, 0.5) < tonoDelSilbido(0, 1) && Math.abs(tonoDelSilbido(200, 0.5) / tonoDelSilbido(200, 1) - registroDelSilbido(0.5)) < 1e-12,
  );
  let curvasBien = true;
  for (const faltan of [700, 550, 300, 62]) {
    const c = curvaDelSilbido(faltan, 1, 40);
    for (let i = 0; i < c.length; i++) {
      const esperado = tonoDelSilbido(faltan * (1 - i / (c.length - 1)), 1);
      if (Math.abs((c[i] ?? 0) - esperado) > 1e-3) curvasBien = false;
    }
    if (Math.abs((c[c.length - 1] ?? 0) - SILBIDO.agudoHz) > 1e-3) curvasBien = false;
  }
  comprobar('la curva que recibe `setValueCurveAtTime` va del tono del arranque al del impacto, punto a punto', curvasBien);
  const vol = [900, 600, 300, 100, 0].map(volumenDelSilbido);
  comprobar(
    'el volumen de fondo crece hacia el impacto y acaba entero',
    vol.every((v, i) => i === 0 || v > (vol[i - 1] ?? Infinity)) && vol[4] === 1 && (curvaDeVolumenDelSilbido(500, 10)[9] ?? 0) === 1,
    vol,
  );

  const latidos = latidosDelSilbido(700);
  comprobar(
    'los latidos son isócronos cada 125 ms, caben en el anuncio, y el ÚLTIMO cae en el impacto',
    latidos.length === 6 && latidos[latidos.length - 1] === 0 && latidos.every((l, i) => i === 0 || (latidos[i - 1] ?? 0) - l === SILBIDO.periodoMs) && (latidos[0] ?? 0) <= 700,
    latidos,
  );
  let ordenadas = true;
  let enElImpacto = true;
  let muere = true;
  let valles = true;
  for (const faltan of [700, 550, 300, 250, 125, 61]) {
    const o = ordenesDeLosLatidos(faltan);
    for (let i = 1; i < o.length; i++) if ((o[i]?.tMs ?? 0) < (o[i - 1]?.tMs ?? 0)) ordenadas = false;
    if ((o[0]?.tMs ?? 0) < -faltan - 1e-9) ordenadas = false;
    if (Math.abs(simular(o, 0, 0) - LATIDO.final) > 1e-9 || !(LATIDO.final > LATIDO.cresta)) enElImpacto = false;
    // Y ningún otro instante del silbido llega tan alto: el impacto es el acento.
    for (let t = -faltan; t < -0.5; t += 0.5) if (simular(o, t, 0) >= LATIDO.final - 1e-9) enElImpacto = false;
    if (simular(o, LATIDO.cierreMs, 0) !== 0 || simular(o, 50, 0) !== 0) muere = false;
    // Entre latidos nunca calla: es un aviso continuo.
    for (let t = -faltan + 1; t < -5; t += 3) if (simular(o, t, 0) < LATIDO.valle - 1e-6) valles = false;
  }
  comprobar('las órdenes de ganancia van en orden y no empiezan antes del anuncio', ordenadas);
  comprobar('según la semántica de `AudioParam`, el instante del impacto es el más fuerte de todo el silbido (su acento)', enElImpacto);
  comprobar('y a los 6 ms del impacto está a CERO: el silbido muere en el impacto, no después', muere);
  comprobar('entre latidos el silbido nunca baja del valle: no hay silencios que se lean como «ya pasó»', valles);

  const tarde = planDelSilbido(1000, 1700, 1400, 12);
  comprobar(
    'si el anuncio llega tarde, el silbido arranca ahora y el impacto NO se mueve',
    tarde !== null && tarde.arrancaMs === 1412 && tarde.arrancaMs + tarde.faltanMs === 1700,
    tarde,
  );
  comprobar(
    'con menos del mínimo por delante, o con tiempos no finitos, no hay silbido',
    planDelSilbido(1000, 1700, 1660, 12) === null && planDelSilbido(Number.NaN, 1700, 0) === null && planDelSilbido(0, Number.POSITIVE_INFINITY, 0) === null,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
paso('El Remanso: 800 Hz, una octava abajo y el latido');
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
{
  const pleno = mezclaDelRemanso(1);
  const nada = mezclaDelRemanso(0);
  comprobar(
    'pleno: paso bajo a 800 Hz, tono a la mitad (−1200 cents) y latido; sin Remanso, abierto, sin desafinar y sin latido',
    Math.abs(pleno.corteHz - 800) < 1e-6 && pleno.detuneCents === -1200 && pleno.latido && nada.corteHz === REMANSO.abiertoHz && nada.detuneCents === 0 && !nada.latido,
    { pleno, nada },
  );
  const medio = mezclaDelRemanso(0.5);
  comprobar(
    'el corte se interpola en escala logarítmica: a medio Remanso es la media geométrica, no la aritmética',
    Math.abs(medio.corteHz - Math.sqrt(REMANSO.abiertoHz * REMANSO.corteHz)) < 1e-6,
    medio.corteHz,
  );
  const raros = [Number.NaN, -3, 7, Number.POSITIVE_INFINITY].map(mezclaDelRemanso);
  comprobar(
    'una intensidad rara (NaN, negativa, mayor que 1) se acota y nunca llega un NaN a un `AudioParam`',
    raros.every((m) => Number.isFinite(m.corteHz) && Number.isFinite(m.detuneCents) && m.corteHz >= 800 - 1e-9 && m.corteHz <= REMANSO.abiertoHz),
    raros,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
paso('Las distancias: la cabina a 150 m, el aire que apaga y los vectores nulos');
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
{
  const cabina = gananciaADistancia(ALCANCES.cabina, 150);
  const porDefecto = ALCANCES.cabina.refM / (ALCANCES.cabina.refM + 1 * (150 - ALCANCES.cabina.refM));
  comprobar(
    `la cabina se oye a 150 m a ${db(cabina).toFixed(1)} dB (con la caída por defecto de WebAudio serían ${db(porDefecto).toFixed(1)})`,
    db(cabina) > -19 && db(porDefecto) < -25,
    { cabina, porDefecto },
  );
  let igualQueWebAudio = true;
  let baja = true;
  for (const perfil of Object.values(ALCANCES)) {
    let anterior = Infinity;
    for (const d of [0, 1, perfil.refM, 3, 10, 25, 60, 150, 400]) {
      const g = gananciaADistancia(perfil, d);
      const webAudio = perfil.refM / (perfil.refM + caidaDelPerfil(perfil) * (Math.max(d, perfil.refM) - perfil.refM));
      if (Math.abs(g - webAudio) > 1e-12) igualQueWebAudio = false;
      if (g > anterior + 1e-12 || (d <= perfil.refM && g !== 1)) baja = false;
      anterior = g;
    }
    if (Math.abs(gananciaADistancia(perfil, perfil.alcanceM) - perfil.gananciaEnAlcance) > 1e-9) igualQueWebAudio = false;
  }
  comprobar('cada perfil cumple su alcance con la misma cuenta que hace `PannerNode` (modelo inverse)', igualQueWebAudio);
  comprobar('la ganancia nunca sube con la distancia y es 1 dentro de la distancia de referencia', baja);
  const cortes = [0, 10, 50, 100, 150, 500].map(corteDelAire);
  comprobar(
    'el aire apaga con la distancia hasta 1,2 kHz, y a 150 m el timbre (1180-1410 Hz) sigue pasando',
    cortes[0] === 18000 && cortes.every((c, i) => i === 0 || c <= (cortes[i - 1] ?? Infinity)) && (cortes[4] ?? 0) >= 1200 && corteDelAire(Number.NaN) === 18000,
    cortes,
  );
  comprobar(
    'un vector nulo o no finito no llega al oyente (`unidad` da null) y uno normal sale de largo 1',
    unidad({ x: 0, y: 0, z: 0 }) === null && unidad({ x: Number.NaN, y: 1, z: 0 }) === null && Math.abs(Math.hypot(...Object.values(unidad({ x: 3, y: 0, z: -4 }) ?? { x: 0, y: 0, z: 0 })) - 1) < 1e-12,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
paso('El tren: el Doppler que `PannerNode` ya no hace');
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
{
  const oyente = { x: 0, y: 1.7, z: 0 };
  const curva = dopplerDelPaso({ x: -100, y: 8, z: -20 }, { x: 100, y: 8, z: -20 }, oyente, 7, 64);
  const mitad = Math.floor(curva.length / 2);
  const velocidad = 200 / 7;
  const maximo = 1200 * Math.log2(343 / (343 - velocidad));
  comprobar(
    'mientras se acerca suena más agudo, al alejarse más grave, y cambia de signo al pasar por delante',
    (curva[2] ?? 0) > 0 && (curva[curva.length - 3] ?? 0) < 0 && (curva[mitad - 3] ?? 0) > 0 && (curva[mitad + 3] ?? 0) < 0,
    Array.from(curva).filter((_, i) => i % 8 === 0),
  );
  comprobar(
    `y nunca pasa del máximo teórico a ${velocidad.toFixed(1)} m/s (${maximo.toFixed(0)} cents)`,
    Array.from(curva).every((c) => Math.abs(c) <= maximo + 1e-6 && Number.isFinite(c)),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
paso('El Bis: la cinta graba, da vueltas con su tartamudeo y devuelve el ambiente');
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** La semántica de `AudioParam` para las puertas del Bis, escrita aquí aparte (ver `simular`). */
function puertaEn(plan: PlanDelBis, puerta: PuertaDelBis, t: number, inicial: number): number {
  const ordenes: OrdenDeGanancia[] = plan.ordenes
    .filter((o) => o.puerta === puerta)
    .map((o) => ({ tipo: o.modo, tMs: o.t * 1000, valor: o.valor }));
  return simular(ordenes, t * 1000, inicial);
}

{
  const t0 = 10;
  const plan = planDelBis(t0, BIS.tramoS, 2);
  const iniciales: Record<PuertaDelBis, number> = { entrada: 1, lazo: 0, repeticion: 0, vivo: 1 };
  let dentroBien = true;
  for (let t = t0 + 0.04; t < plan.fin - 0.02; t += 0.01) {
    const cerca = plan.inicios.some((i) => Math.abs(t - i) < BIS.bacheS);
    const e = puertaEn(plan, 'entrada', t, 1);
    const l = puertaEn(plan, 'lazo', t, 0);
    const r = puertaEn(plan, 'repeticion', t, 0);
    const v = puertaEn(plan, 'vivo', t, 1);
    if (e !== 0 || Math.abs(l - BIS.lazo) > 1e-9 || (!cerca && r !== 1) || Math.abs(v - BIS.vivoHundido) > 1e-9) dentroBien = false;
  }
  comprobar('durante las vueltas: la grabación cerrada, el lazo abierto, la repetición sonando y el vivo hundido', dentroBien);
  let fueraBien = true;
  for (const t of [0, t0 - 0.2, t0 - BIS.cruceS - 0.001, plan.fin + BIS.subidaDelVivoS + 0.01, plan.fin + 5]) {
    for (const puerta of ['entrada', 'lazo', 'repeticion', 'vivo'] as const) {
      if (Math.abs(puertaEn(plan, puerta, t, iniciales[puerta]) - iniciales[puerta]) > 1e-9) fueraBien = false;
    }
  }
  comprobar('antes y después, todo como estaba: el ambiente se graba y suena en vivo', fueraBien);
  const costura = plan.inicios[1] ?? Number.NaN;
  comprobar(
    'dos repeticiones de un segundo, y en la costura entre ellas un bache (el tartamudeo que tapa el empalme)',
    plan.inicios.length === 2 &&
      Math.abs(costura - (t0 + 1)) < 1e-9 &&
      Math.abs(plan.fin - (t0 + 2)) < 1e-9 &&
      puertaEn(plan, 'repeticion', costura - 0.002, 0) <= BIS.bacheHondo + 1e-9,
    plan.inicios,
  );
  let ordenado = true;
  for (const puerta of ['entrada', 'lazo', 'repeticion', 'vivo'] as const) {
    const propias = plan.ordenes.filter((o) => o.puerta === puerta);
    for (let i = 1; i < propias.length; i++) if ((propias[i]?.t ?? 0) < (propias[i - 1]?.t ?? 0)) ordenado = false;
  }
  comprobar('las órdenes de cada puerta van en orden de tiempo (un `AudioParam` no admite otra cosa)', ordenado);
  let mismaCuenta = true;
  for (let t = t0 - 0.1; t < plan.fin + 0.4; t += 0.0037) {
    for (const puerta of ['entrada', 'lazo', 'repeticion', 'vivo'] as const) {
      if (Math.abs(valorDeLaPuerta(plan, puerta, t, iniciales[puerta]) - puertaEn(plan, puerta, t, iniciales[puerta])) > 1e-9) mismaCuenta = false;
    }
  }
  comprobar('`valorDeLaPuerta` (la que usa la autoprueba) da lo mismo que la semántica escrita aquí', mismaCuenta);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
paso('La lluvia y la marquesina');
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
{
  const raso = mezclaDeLaLluvia('aguacero', 0);
  const techo = mezclaDeLaLluvia('aguacero', 1);
  comprobar(
    'bajo la marquesina el siseo y las gotas bajan, el corte cae a 2,5 kHz y APARECE el golpeteo sobre la lona',
    techo.siseo < raso.siseo && techo.gotas < raso.gotas && raso.toldo === 0 && techo.toldo > 0.3 && Math.abs(techo.corteHz - 2500) < 1e-6 && raso.corteHz === 16000,
    { raso, techo },
  );
  const seca = mezclaDeLaLluvia('seca', 1);
  const llovizna = mezclaDeLaLluvia('llovizna', 0);
  comprobar(
    'sin lluvia no suena nada (ni el toldo), y un aguacero suena más que una llovizna en todas las capas',
    seca.siseo === 0 && seca.gotas === 0 && seca.grave === 0 && seca.toldo === 0 && raso.siseo > llovizna.siseo && raso.gotas > llovizna.gotas && raso.grave > llovizna.grave,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
paso('La partitura: el pulso se oye siempre, la percusión entra con la racha y la melodía no desafina');
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
{
  const PASOS = 16 * 8 * 2; // dos vueltas de ocho compases
  const suena = (capas: Capas, instrumento: Instrumento, paso: number): boolean => notasDelPaso(paso, capas).some((n) => n.instrumento === instrumento);
  const tiempos = (capas: Capas, instrumento: Instrumento): number[] => {
    const salen: number[] = [];
    for (let p = 0; p < 16; p++) if (suena(capas, instrumento, p)) salen.push(p);
    return salen;
  };
  let pulsoSiempre = true;
  for (const capas of [capasDe('calma', 0), capasDe('combate', 0), capasDe('combate', 9), capasDe('llamada', 0)]) {
    for (let p = 0; p < PASOS; p += 4) if (!suena(capas, 'tic', p) && !suena(capas, 'tac', p)) pulsoSiempre = false;
  }
  comprobar('con la base encendida, TODOS los pulsos llevan su tic-tac, haya percusión o no', pulsoSiempre);
  let callada = true;
  for (let p = 0; p < PASOS; p++) if (notasDelPaso(p, capasDe('callada', 20)).length > 0) callada = false;
  comprobar('callada no toca nada, ni con racha', callada && notasDelPaso(-4, capasDe('combate', 9)).length === 0);

  const c0 = capasDe('combate', 0);
  const c1 = capasDe('combate', 1);
  const c3 = capasDe('combate', 3);
  const c6 = capasDe('combate', 6);
  const sinPercusion = [-1, 0, Number.NaN].map((r) => capasDe('combate', r)).every((c) => c.percusion === 0) && tiempos(c0, 'bombo').length === 0;
  comprobar(
    'la percusión entra con la racha: sin racha nada; con 1, bombo en 1 y 3; con 3, bombo a negras y palmada en 2 y 4; con 6, palmas',
    sinPercusion &&
      JSON.stringify(tiempos(c1, 'bombo')) === '[0,8]' &&
      tiempos(c1, 'palmada').length === 0 &&
      JSON.stringify(tiempos(capasDe('combate', 2), 'bombo')) === '[0,8]' &&
      JSON.stringify(tiempos(c3, 'bombo')) === '[0,4,8,12]' &&
      JSON.stringify(tiempos(c3, 'palmada')) === '[4,12]' &&
      tiempos(c3, 'palmas').length === 0 &&
      JSON.stringify(tiempos(capasDe('combate', 5), 'palmas')) === '[]' &&
      JSON.stringify(tiempos(c6, 'palmas')) === '[0,3,6,9,12]',
    { c1: tiempos(c1, 'bombo'), c3: tiempos(c3, 'bombo'), palmas: tiempos(c6, 'palmas') },
  );
  const llamada = capasDe('llamada', 0);
  comprobar(
    'la Llamada lleva melodía y al menos la percusión del nivel 2 aunque no haya racha; el combate nunca lleva melodía',
    llamada.melodia && llamada.percusion >= 2 && !capasDe('combate', 30).melodia && !capasDe('calma', 30).melodia,
    llamada,
  );
  let enEscala = true;
  let bajoEnSuSitio = true;
  let rango = true;
  const fuera: unknown[] = [];
  for (let p = 0; p < PASOS; p++) {
    const acorde = acordeDelPaso(p);
    for (const n of notasDelPaso(p, capasDe('llamada', 9))) {
      for (const a of n.alturas) {
        if (a < 28 || a > 96 || !Number.isInteger(a)) rango = false;
        const clase = ((a % 12) + 12) % 12;
        if ((n.instrumento === 'voz' || n.instrumento === 'cuerda') && !acorde.escala.includes(clase)) {
          enEscala = false;
          fuera.push({ p, a, instrumento: n.instrumento });
        }
        if (n.instrumento === 'bajo' && clase !== acorde.fundamental % 12) bajoEnSuSitio = false;
        if (n.instrumento === 'colchon' && !acorde.notas.includes(a)) bajoEnSuSitio = false;
      }
    }
  }
  comprobar('la voz y la cuerda de la Llamada no se salen de la escala de su acorde (con el Sol♯ en el de Mi)', enEscala, fuera.slice(0, 6));
  comprobar('el bajo toca la fundamental de su acorde y el colchón sus tres notas', bajoEnSuSitio);
  comprobar('todas las alturas son enteras y caben entre el Mi 1 y el Do 7', rango);
  comprobar(
    'la cadencia es la andaluza: La menor, Sol, Fa y Mi MAYOR (con Sol♯), un acorde por compás',
    CADENCIA.map((a) => a.fundamental % 12).join(',') === '9,7,5,4' && (CADENCIA[3]?.notas ?? []).some((a) => a % 12 === 8) && acordeDelPaso(16 * 5 + 3).nombre === 'Sol mayor',
  );
  const voz = (vuelta: number): string =>
    Array.from({ length: 64 }, (_, i) => notasDelPaso(vuelta * 64 + i, llamada).filter((n) => n.instrumento === 'voz').map((n) => n.alturas.join('+')).join('|')).join(',');
  const a = voz(0).split(',');
  const b = voz(1).split(',');
  comprobar(
    'las dos vueltas de la voz son iguales salvo el último compás: variación sin azar',
    a.slice(0, 48).join() === b.slice(0, 48).join() && a.slice(48).join() !== b.slice(48).join() && voz(2) === voz(0),
  );
  const acentos = [0, 16, 32, 48].map(notaDeAcento);
  comprobar(
    'el acento «a compás» es la fundamental de cada acorde, y aguda (se oye en un teléfono)',
    acentos.every((n, i) => n % 12 === (CADENCIA[i]?.fundamental ?? 0) % 12 && n >= 69),
    acentos,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
paso('Las texturas: la calle, el timbre, la cuerda, los ruidos, el cristal');
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** La energía de un tono en un tramo (Goertzel). */
function goertzel(m: Float32Array, desde: number, hasta: number, hz: number): number {
  const w = (2 * Math.PI * hz) / SR;
  const c = 2 * Math.cos(w);
  let s1 = 0;
  let s2 = 0;
  for (let i = desde; i < hasta; i++) {
    const s = (m[i] ?? 0) + c * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return (s1 * s1 + s2 * s2 - c * s1 * s2) / (hasta - desde);
}

{
  const [izq, der] = respuestaDeCalle(SR);
  const pronto = rms(izq, 0.05 * SR, 0.15 * SR);
  const tarde = rms(izq, (CALLE_MOJADA.rt60S - 0.05) * SR, (CALLE_MOJADA.rt60S + 0.05) * SR);
  comprobar(
    `la calle mojada cae ${(db(pronto) - db(tarde)).toFixed(1)} dB en su RT60 (≥ 45: la cola se apaga de verdad)`,
    db(pronto) - db(tarde) >= 45,
  );
  comprobar(
    'empieza tras su predemora (silencio en los primeros 5 ms) y los dos canales NO son el mismo (la cola rodea, no está en la cabeza)',
    rms(izq, 0, 0.005 * SR) === 0 && Math.abs(correlacion(izq, der)) < 0.3,
    correlacion(izq, der),
  );
  // El aleteo: el primer y el segundo viaje de ida y vuelta destacan sobre lo que tienen justo antes.
  const periodo = periodoDelAleteo(CALLE_MOJADA.anchoM);
  let aletea = true;
  const razones: number[] = [];
  for (const viaje of [1, 2]) {
    const t = 0.006 + 0.012 + viaje * periodo;
    const golpe = Math.max(rms(izq, t * SR, (t + 0.003) * SR), rms(der, t * SR, (t + 0.003) * SR));
    const antes = Math.max(rms(izq, (t - 0.012) * SR, (t - 0.004) * SR), rms(der, (t - 0.012) * SR, (t - 0.004) * SR));
    razones.push(golpe / antes);
    if (golpe < antes * 1.3) aletea = false;
  }
  comprobar(`se oye el eco aleteante entre fachadas cada ${(periodo * 1000).toFixed(0)} ms (el que dice CALLE y no sala)`, aletea, razones);
  nota(`aleteo: los dos primeros viajes destacan ${razones.map((r) => `×${r.toFixed(2)}`).join(' y ')} sobre lo que tienen delante`);

  const timbre = timbreDeCabina(SR);
  const sonando = rms(timbre, 0.05 * SR, 1.45 * SR);
  const callando = rms(timbre, 2.5 * SR, 4.4 * SR);
  comprobar(
    `el timbre dura un ciclo de la cadencia española (4,5 s): suena 1,5 s y calla (${(db(sonando) - db(callando)).toFixed(0)} dB menos)`,
    Math.abs(timbre.length - 4.5 * SR) <= 1 && db(sonando) - db(callando) > 60,
  );
  const enCazoletas = goertzel(timbre, 0, 1.5 * SR, 1180) + goertzel(timbre, 0, 1.5 * SR, 1410);
  const fuera = goertzel(timbre, 0, 1.5 * SR, 700) + goertzel(timbre, 0, 1.5 * SR, 5000);
  comprobar('y lo que suena son sus dos cazoletas (1180 y 1410 Hz), no ruido', enCazoletas > 20 * fuera, { enCazoletas, fuera });

  let afinada = true;
  let decae = true;
  const errores: string[] = [];
  for (const hz of [110, 146.83, 220, 329.63, 440]) {
    const c = cuerdaPulsada(SR, hz, 1.5, 3);
    const medido = tonoPorAutocorrelacion(c, SR, 0.1 * SR, 0.35 * SR, 50, 1200);
    errores.push(`${hz}→${medido.toFixed(2)}`);
    if (Math.abs(medido / hz - 1) > 0.005) afinada = false;
    if (db(rms(c, 1.3 * SR, 1.5 * SR)) - db(rms(c, 0, 0.2 * SR)) > -30) decae = false;
  }
  comprobar('la cuerda pulsada afina a menos del 0,5 % en cinco notas (el retardo es fraccionario)', afinada, errores);
  comprobar('y se apaga: 30 dB menos al final de su búfer que al principio', decae);

  const blanco = ruido('blanco', SR * 2, 5);
  const rosa = ruido('rosa', SR * 2, 5);
  const marron = ruido('marron', SR * 2, 5);
  /** Cuánto pesa lo agudo: energía de la derivada frente a la energía. Más alto = más agudo. */
  const agudeza = (m: Float32Array): number => {
    let d = 0;
    let e = 0;
    for (let i = 1; i < m.length; i++) {
      d += ((m[i] ?? 0) - (m[i - 1] ?? 0)) ** 2;
      e += (m[i] ?? 0) ** 2;
    }
    return d / e;
  };
  comprobar('el ruido rosa es más grave que el blanco, y el marrón más que el rosa', agudeza(marron) < agudeza(rosa) && agudeza(rosa) < agudeza(blanco), [
    agudeza(blanco),
    agudeza(rosa),
    agudeza(marron),
  ]);
  /*
   * El cierre de los bucles, probado sobre el ayudante y no sobre un ruido concreto (un ruido de color
   * medido en 10 ms varía varios decibelios por sí solo, y la prueba acabaría dependiendo de la semilla).
   * Con una RAMPA se ve la costura: tras la última muestra (999) tiene que venir casi exactamente la que
   * la seguía en el original (1000), sea cual sea la señal. Con RUIDO BLANCO (veinte semillas) se ve el
   * bache: la potencia en mitad del cruce tiene que ser la del resto; un fundido lineal la deja a la
   * mitad (−3 dB).
   */
  const rampa = Float32Array.from({ length: 1100 }, (_, i) => i);
  const cerradaRampa = cerrarBucle(rampa, 100);
  const continua = cerradaRampa.length === 1000 && cerradaRampa[999] === 999 && Math.abs((cerradaRampa[0] ?? 0) - 1000) < 10;
  let razon = 0;
  for (let semilla = 1; semilla <= 20; semilla++) {
    const azar = sembrado(semilla);
    const largo = Float32Array.from({ length: 4096 + 2048 }, () => azar() * 2 - 1);
    const cerrada = cerrarBucle(largo, 2048);
    razon += (rms(cerrada, 1024 - 256, 1024 + 256) / rms(cerrada, 2048, 4096)) ** 2 / 20;
  }
  comprobar(
    'los bucles se cierran sin costura (tras la última muestra viene la que la seguía) y sin bache en el cruce (igual potencia, ±0,5 dB)',
    continua && Math.abs(db(Math.sqrt(razon))) < 0.5,
    { primera: cerradaRampa[0], ultima: cerradaRampa[999], cruceDb: db(Math.sqrt(razon)) },
  );

  const [gotaI, gotaD] = gotasDeLluvia(SR, 3.3, 110, 17);
  const cristal = cristalRoto(SR, 101);
  const palomas = aleteo(SR, 307);
  const chapa = chapaGolpeada(SR, 211);
  const toldo = golpeteoEnToldo(SR, 2.9, 42, 29);
  const todos: [string, Float32Array][] = [
    ['calle', izq],
    ['timbre', timbre],
    ['gotas', gotaI],
    ['gotas der', gotaD],
    ['toldo', toldo],
    ['cristal', cristal[0]],
    ['palomas', palomas[0]],
    ['chapa', chapa],
    ['ruido rosa', rosa],
  ];
  const malos = todos.filter(([, m]) => tieneNoFinitos(m) || pico(m) > 0.9 + 1e-6 || pico(m) < 0.1).map(([n, m]) => [n, pico(m)]);
  comprobar('ningún búfer lleva NaN, ninguno pasa de 0,9 y ninguno está mudo', malos.length === 0, malos);
  const colas = ([['cristal', cristal[0]], ['palomas', palomas[0]], ['chapa', chapa]] as const).map(([n, m]) => [n, db(rms(m, m.length - 0.05 * SR) / pico(m))] as const);
  comprobar('el cristal, las palomas y la chapa acaban en silencio (su último trozo, a −45 dB o menos del pico)', colas.every(([, d]) => d <= -45), colas);
  comprobar(
    'la misma semilla fabrica el mismo búfer, y otra semilla otro (dos aparatos oyen la misma calle)',
    cristalRoto(SR, 101)[0].every((v, i) => v === cristal[0][i]) &&
      !cristalRoto(SR, 102)[0].every((v, i) => v === cristal[0][i]) &&
      ruido('rosa', 4096, 5).every((v, i) => v === ruido('rosa', 4096, 5)[i]),
  );
  nota(`gotas: correlación entre canales ${correlacion(gotaI, gotaD).toFixed(2)} (cada gota tiene su lado)`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
paso('El recetario y la puerta: las señales van claras, y sin WebAudio nada lanza');
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
{
  const senalesTurbias = IDS_DE_SONIDO.filter((id) => RECETAS[id].categoria === 'senales' && RECETAS[id].camino !== 'claro');
  comprobar('toda receta de la categoría de señales va por el camino claro (el Remanso no la toca: diseño §4.4)', senalesTurbias.length === 0, senalesTurbias);
  const claros = (['quiebro-limpio', 'esquirla', 'latido', 'bala', 'apuntado', 'aviso'] as const).filter((id) => RECETAS[id].camino !== 'claro');
  comprobar('el quiebro limpio, la esquirla, el latido, la bala, el apuntado y el aviso van claros', claros.length === 0, claros);
  comprobar(
    'los pasos, las palomas y la farola son ambiente (los graba la cinta del Bis) y cada receta tiene tope',
    (['paso', 'palomas', 'farola'] as const).every((id) => RECETAS[id].categoria === 'ambiente') && IDS_DE_SONIDO.every((id) => RECETAS[id].tope >= 1),
  );
  const esquirlas = Array.from({ length: 12 }, (_, i) => alturaDeLaEsquirla(i + 1));
  comprobar(
    'cada esquirla recogida suena un escalón más arriba (pentatónica de La), de la 1 a la 12',
    esquirlas.every((a, i) => i === 0 || a > (esquirlas[i - 1] ?? Infinity)) && esquirlas.every((a) => [9, 0, 2, 4, 7].includes(a % 12)),
    esquirlas,
  );

  /*
   * Lo que el silbido del anillo NO puede hacer: pasar por el mundo o enchufarse al tono del mundo. Se
   * lee el fuente sin comentarios: una regla que se cazara a sí misma en su propio comentario no
   * valdría (lo tiene apuntado la casa).
   */
  const sinComentarios = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const anillo = sinComentarios(readFileSync(new URL('../src/quiebro/sonido/anillo.ts', import.meta.url), 'utf8'));
  const voces = anillo.match(/m\.voz\(\{[^}]*\}/g) ?? [];
  comprobar(
    'el silbido abre UNA voz, de señales y por el camino claro, y no se enchufa al tono del mundo',
    voces.length === 1 && /categoria: 'senales'/.test(voces[0] ?? '') && /camino: 'claro'/.test(voces[0] ?? '') && !/afinar\(|tonoDelMundo/.test(anillo),
    voces,
  );

  const mudo = crearSonido();
  const metodos = Object.entries(mudo).filter(([, v]) => typeof v === 'function');
  let nadaLanza = true;
  const lanzan: string[] = [];
  const argumentos: Record<string, unknown[]> = {
    sonar: ['impacto', { golpe: 'cierre', aCompas: true }],
    anillo: [0, 700, { x: 1, y: 1, z: 1 }, 1],
    oyente: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }],
    musica: [{ modo: 'llamada', racha: 6 }],
    ambiente: [{ tiempo: 'aguacero', bajoTecho: 1, ciudad: 1 }],
    cabina: [{ x: 0, y: 0, z: -150 }],
    tren: [{ x: -100, y: 8, z: 0 }, { x: 100, y: 8, z: 0 }, 7],
    volumen: ['musica', 0.5],
    volumenDe: ['musica'],
    silenciar: [true],
    remanso: [1],
    calidad: ['baja'],
    avanzar: [3],
  };
  for (const [nombre, f] of metodos) {
    try {
      (f as (...a: unknown[]) => unknown)(...(argumentos[nombre] ?? []));
    } catch (e) {
      nadaLanza = false;
      lanzan.push(`${nombre}: ${String(e)}`);
    }
  }
  const p = mudo.pulso();
  comprobar(
    'sin WebAudio (Node), `crearSonido()` da un sonido MUDO que no lanza en ninguno de sus métodos y sigue dando el pulso',
    !mudo.disponible && mudo.estado() === 'sin-audio' && nadaLanza && metodos.length >= 20 && p.periodoMs === 500 && p.bpm === 120,
    { lanzan, metodos: metodos.length },
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
paso('El rayo: el trueno que llega tarde, la carga que sube, y quien los toca (EL-RAYO.md §5)');
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
{
  /* EL TRUENO, en búfer: estéreo, sembrado, que retumba en grave y acaba en silencio. */
  const truenos = [401, 402, 403].map((s) => truenoDelRayo(SR, s));
  const malos: string[] = [];
  for (const [i, [izq, der]] of truenos.entries()) {
    const n = `trueno ${String(i)}`;
    if (izq.length !== Math.round(DURACION_DEL_TRUENO_S * SR) || der.length !== izq.length) malos.push(`${n}: dura ${String(izq.length)}`);
    if (tieneNoFinitos(izq) || tieneNoFinitos(der)) malos.push(`${n}: NaN`);
    const p = Math.max(pico(izq), pico(der));
    if (p > 0.9 + 1e-6 || p < 0.5) malos.push(`${n}: pico ${p.toFixed(3)}`);
    const cola = db(Math.max(rms(izq, izq.length - 0.05 * SR), rms(der, der.length - 0.05 * SR)) / p);
    if (cola > -45) malos.push(`${n}: acaba a ${cola.toFixed(1)} dB`);
    const r = correlacion(izq, der);
    if (r > 0.9) malos.push(`${n}: los dos canales son casi el mismo (${r.toFixed(2)})`);
  }
  comprobar('los tres truenos: 3,4 s en estéreo de verdad, sin NaN, pico entre 0,5 y 0,9 y acaban en silencio (−45 dB)', truenos.length === 3 && malos.length === 0, malos);
  const [izq] = truenos[0] as readonly [Float32Array, Float32Array];
  const otroIgual = truenoDelRayo(SR, 401)[0];
  comprobar(
    'el trueno se siembra: la misma semilla da el mismo búfer (todos los aparatos oyen el mismo) y otra da otro',
    otroIgual.every((v, i) => v === izq[i]) && !(truenos[1] as readonly [Float32Array, Float32Array])[0].every((v, i) => v === izq[i]),
  );
  /* Retumba: después del desgarro sigue sonando, y en grave (un paso bajo de un polo a 250 Hz). */
  const desgarro = rms(izq, 0, 0.3 * SR);
  const retumbo = rms(izq, 0.35 * SR, 2 * SR);
  const grave = new Float32Array(izq.length);
  const k = 1 - Math.exp((-2 * Math.PI * 250) / SR);
  let y = 0;
  for (let i = 0; i < izq.length; i++) {
    y += k * ((izq[i] ?? 0) - y);
    grave[i] = y;
  }
  const parteGrave = rms(grave, 0.35 * SR, 2 * SR) / Math.max(1e-9, retumbo);
  comprobar(
    'el trueno no es un golpe: después del desgarro retumba (a menos de 14 dB de él) y el retumbo es grave (más de un tercio bajo 250 Hz)',
    db(retumbo / desgarro) > -14 && parteGrave > 0.35,
    { retumboSobreDesgarro: db(retumbo / desgarro), parteGrave },
  );

  /* LAS CUENTAS: el retraso, el tono de la carga, las crepitaciones, el punto del canal. */
  const retrasos = [0, 10, 68.6, 120, 343].map(retrasoDelTrueno);
  comprobar(
    'el trueno llega d/343 s tarde (a 68,6 m, 200 ms), acotado a su alcance, y nunca antes (ni con distancias locas)',
    retrasos[0] === 0 &&
      Math.abs((retrasos[2] as number) - 0.2) < 1e-9 &&
      retrasos.every((r, i) => i === 0 || r >= (retrasos[i - 1] as number)) &&
      retrasos[4] === ALCANCES.trueno.alcanceM / VELOCIDAD_DEL_SONIDO_MS &&
      retrasoDelTrueno(Number.NaN) === 0 &&
      retrasoDelTrueno(-5) === 0,
    retrasos,
  );
  const tonos = Array.from({ length: 101 }, (_, i) => tonoDeLaCarga(i / 100));
  const pasos = tonos.slice(1).map((t, i) => Math.log2(t / (tonos[i] as number)));
  comprobar(
    'la carga sube de tono octava y media, sin bajar nunca y más deprisa al final (el oído lee «ya casi»), y no se sale de ahí',
    tonos[0] === 82 &&
      Math.abs((tonos[100] as number) - 82 * 2 ** 1.5) < 1e-9 &&
      pasos.every((p, i) => p > 0 && (i === 0 || p >= (pasos[i - 1] as number) - 1e-12)) &&
      tonoDeLaCarga(-1) === 82 &&
      tonoDeLaCarga(2) === tonos[100] &&
      tonoDeLaCarga(Number.NaN) === 82,
  );
  const crepitas = crepitacionesDeLaCarga(0, 1.3, 4, 77);
  const huecos = crepitas.slice(1).map((t, i) => t - (crepitas[i] as number));
  const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const alPrincipio = media(huecos.filter((_, i) => (crepitas[i] as number) < 0.3));
  const lleno = media(huecos.filter((_, i) => (crepitas[i] as number) > 1.4));
  comprobar(
    'las crepitaciones de la carga van cada vez más seguidas (al llenarse, a menos de la mitad del hueco del principio), en orden, dentro de la voz y sembradas',
    crepitas.length > 20 &&
      crepitas.length <= 400 &&
      crepitas.every((t) => t >= 0 && t < 4) &&
      huecos.every((h) => h >= 0.045 * 0.75 - 1e-9 && h <= 0.19 * 1.25 + 1e-9) &&
      lleno < alPrincipio / 2 &&
      crepitacionesDeLaCarga(0, 1.3, 4, 77).every((t, i) => t === crepitas[i]) &&
      !crepitacionesDeLaCarga(0, 1.3, 4, 78).every((t, i) => t === crepitas[i]),
    { cuantas: crepitas.length, alPrincipio, lleno },
  );
  const pc = puntoDelTramoMasCercano({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -40 }, { x: 5, y: 1, z: -10 });
  const antesDelTramo = puntoDelTramoMasCercano({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -40 }, { x: 1, y: 0, z: 9 });
  const nulo = puntoDelTramoMasCercano({ x: 3, y: 1, z: 2 }, { x: 3, y: 1, z: 2 }, { x: 0, y: 0, z: 0 });
  comprobar(
    'el trueno de un canal largo sale de su punto más cercano al oyente (el pie de la perpendicular, o la punta), y un canal nulo es su punto',
    pc.x === 0 && pc.y === 0 && pc.z === -10 && antesDelTramo.z === 0 && nulo.x === 3 && nulo.y === 1 && nulo.z === 2,
    { pc, antesDelTramo, nulo },
  );

  /* LAS RECETAS del rayo. */
  const delRayo = ['carga-rayo', 'rayo', 'rayo-corto', 'trueno', 'rayo-fijado', 'rayo-listo'] as const;
  const delMundo = (['carga-rayo', 'rayo', 'rayo-corto', 'trueno'] as const).filter((id) => RECETAS[id].camino !== 'mundo');
  const avisos = (['rayo-fijado', 'rayo-listo'] as const).filter((id) => RECETAS[id].camino !== 'claro' || RECETAS[id].categoria === 'senales');
  const base: Parameters<(typeof RECETAS)['trueno']['duracion']>[0] = {
    t: 0,
    fuerza: 1,
    golpe: 'entrada',
    material: 'chapa',
    cuenta: 1,
    duracionS: 1,
    acento: null,
    c0: 0,
    subidaS: 1,
    distanciaM: 100,
  };
  comprobar(
    'el rayo tiene sus seis sonidos: la carga, el rayo, el chispazo y el trueno por el mundo (en el Remanso bajan de tono), el tic y el «listo» claros sin agachar el mundo, el rayo y el trueno con alcance de ~120 m, topes de 1 a 4, y el trueno cuenta su retraso en lo que dura',
    delRayo.every((id) => (IDS_DE_SONIDO as readonly string[]).includes(id) && RECETAS[id].tope >= 1 && RECETAS[id].tope <= 4) &&
      delMundo.length === 0 &&
      avisos.length === 0 &&
      RECETAS.rayo.alcance === 'trueno' &&
      RECETAS.trueno.alcance === 'trueno' &&
      ALCANCES.trueno.alcanceM >= 100 &&
      ALCANCES.trueno.alcanceM <= 150 &&
      RECETAS.trueno.duracion(base) >= 100 / VELOCIDAD_DEL_SONIDO_MS + DURACION_DEL_TRUENO_S,
    { delMundo, avisos },
  );
  const fuente = (f: string): string => sinComentariosDe(readFileSync(new URL(`../src/quiebro/sonido/${f}`, import.meta.url), 'utf8'));
  comprobar(
    'el trueno que se precalienta y el que suena son los mismos búferes (las mismas semillas en `index.ts` y en `voces.ts`)',
    /truenoDelRayo\(sr, 401 \+ k\)/.test(fuente('index.ts')) && /truenoDelRayo\(sr, 401 \+ variante\)/.test(fuente('voces.ts')) && /trueno-\$\{k\}/.test(fuente('index.ts')),
  );

  /* QUIEN LOS TOCA: el envoltorio de `sistema.rayo` (sonido/rayo.ts), con un espía debajo y un sonido de mentira. */
  const llamadas: string[] = [];
  const espia: EfectosDelRayo = {
    empezarCarga: (q, t) => void llamadas.push(`empezar ${String(q)} ${String(t)}`),
    actualizarCarga: (q, e, t) => void llamadas.push(`actualizar ${String(q)} ${String(e.c)} ${String(t)}`),
    cancelarCarga: (q, t) => void llamadas.push(`cancelar ${String(q)} ${String(t)}`),
    soltar: (d) => void llamadas.push(`soltar ${String(d.quien)} ${String(d.bala)}`),
    estallar: (e) => void llamadas.push(`estallar ${String(e.quien)} ${String(e.bala)}`),
  };
  interface Sonado {
    id: IdDeSonido;
    o: OpcionesDeSonido;
    parado: number;
  }
  const sonados: Sonado[] = [];
  let devolverNada = false;
  const sonido: SonidoDelRayo = {
    sonar(id, o = {}) {
      const s: Sonado = { id, o, parado: 0 };
      sonados.push(s);
      if (devolverNada) return undefined;
      return { parar: () => void s.parado++, mover: () => undefined };
    },
  };
  const donde = (q: number, salida: { x: number; y: number; z: number }): boolean => {
    salida.x = q * 10;
    salida.y = 1.35;
    salida.z = 0;
    return true;
  };
  const r = new RayoQueSuena(espia, sonido, (q) => q === 1, donde);
  const doble = new RayoQueSuena(r, sonido, (q) => q === 1, donde);
  const estado = estadoDelRayoApagado();
  estado.activo = true;
  estado.desdeMs = 1000;
  const actualizar = (q: number, t: number, blanco = 0): void => {
    estado.c = Math.min(1, (t - 1000) / 1300);
    estado.blanco = blanco;
    r.actualizarCarga(q, estado, t);
  };
  r.empezarCarga(1, 1000);
  actualizar(1, 1020);
  const antesDelRitmo = sonados.length;
  actualizar(1, 1100);
  const voz = sonados[sonados.length - 1];
  for (let t = 1116; t < 6940; t += 16) actualizar(1, t);
  const unaVoz = sonados.filter((s) => s.id === 'carga-rayo').length;
  actualizar(1, 6960);
  const relevo = sonados.filter((s) => s.id === 'carga-rayo')[1];
  comprobar(
    'la voz de la carga empieza cuando ya se sabe su ritmo (con lo que le falta para el pleno), no se repite cada fotograma y se releva, llena, antes de acabarse',
    antesDelRitmo === 0 &&
      voz?.id === 'carga-rayo' &&
      Math.abs((voz.o.carga ?? -1) - 100 / 1300) < 1e-9 &&
      Math.abs((voz.o.subidaMs ?? -1) - 1200) < 1e-6 &&
      voz.o.posicion === null &&
      voz.o.duracionMs === VOZ_DE_LA_CARGA_MS &&
      unaVoz === 1 &&
      relevo?.o.carga === 1 &&
      relevo.o.subidaMs === 0,
    { antesDelRitmo, voz: voz?.o, unaVoz, relevo: relevo?.o },
  );
  sonados.length = 0;
  llamadas.length = 0;
  r.empezarCarga(1, 1000);
  for (const [t, blanco] of [
    [1100, 0],
    [1200, 20],
    [1300, 20],
    [1400, 21],
    [1500, 0],
    [2300, 21],
    [2400, 21],
    [2500, 21],
  ] as const)
    actualizar(1, t, blanco);
  r.empezarCarga(2, 1000);
  for (const [t, blanco] of [
    [1100, 0],
    [1200, 20],
    [2300, 21],
    [2500, 21],
  ] as const)
    actualizar(2, t, blanco);
  const tics = sonados.filter((s) => s.id === 'rayo-fijado').length;
  const listos = sonados.filter((s) => s.id === 'rayo-listo').length;
  const vozAjena = sonados.find((s) => s.id === 'carga-rayo' && s.o.posicion !== null);
  comprobar(
    'el tic suena al fijar OTRO blanco (no al repetirlo ni al soltarlo) y el «listo» UNA vez al llegar al pleno; los dos sólo en mi carga, y la carga de otro suena desde su boca, más baja',
    tics === 3 && listos === 1 && vozAjena !== undefined && vozAjena.o.posicion?.x === 20 && (vozAjena.o.fuerza ?? 1) < 1,
    { tics, listos, vozAjena: vozAjena?.o },
  );
  const cargaPropia = sonados.find((s) => s.id === 'carga-rayo' && s.o.posicion === null);
  sonados.length = 0;
  const disparo = (quien: number, nivel: number, c: number): Parameters<RayoQueSuena['soltar']>[0] => ({
    quien,
    bala: quien === 1 ? 0 : 70 + nivel,
    origen: { x: 1, y: 1.35, z: 0 },
    destino: { x: 1, y: 1.35, z: -30 },
    nivel,
    c,
    area: 0,
    dio: null,
    semilla: 5,
    t: 3000,
  });
  r.soltar(disparo(1, 4, 1));
  const pleno = sonados.map((s) => s.id).join(',');
  const truenoDelPleno = sonados.find((s) => s.id === 'trueno');
  const rayoPropio = sonados.find((s) => s.id === 'rayo');
  sonados.length = 0;
  r.soltar(disparo(2, 1, 0));
  const chispazo = sonados.map((s) => s.id).join(',');
  sonados.length = 0;
  r.soltar(disparo(3, 2, 0.23));
  const segundo = sonados.map((s) => s.id).join(',');
  const rayoAjeno = sonados[0];
  comprobar(
    'al soltar se calla la carga; el pleno suena con el rayo (en el jugador) y el trueno (del canal, de la boca al destino); el chispazo, corto y sin trueno; el nivel 2, sin trueno; el de otro, desde su boca y en su instante',
    (cargaPropia?.parado ?? 0) >= 1 &&
      pleno === 'rayo,trueno' &&
      rayoPropio?.o.posicion === null &&
      truenoDelPleno?.o.posicion?.x === 1 &&
      truenoDelPleno.o.hasta?.z === -30 &&
      chispazo === 'rayo-corto' &&
      segundo === 'rayo' &&
      rayoAjeno?.o.posicion?.x === 1 &&
      rayoAjeno.o.enMs === 3000,
    { cargaParada: cargaPropia?.parado, pleno, chispazo, segundo },
  );
  sonados.length = 0;
  r.estallar({ quien: 1, bala: 99, x: 1, y: 1.35, z: -30, nivel: 4, area: 0, t: 3040 });
  const yaOido = sonados.length;
  r.estallar({ quien: 5, bala: 120, x: 8, y: 1.35, z: 8, nivel: 4, area: 0, t: 3050 });
  const sinDisparo = sonados.map((s) => s.id).join(',');
  r.empezarCarga(4, 5000);
  estado.desdeMs = 5000;
  estado.c = 0.3;
  r.actualizarCarga(4, estado, 5100);
  const vozDel4 = sonados[sonados.length - 1];
  r.cancelarCarga(4, 5200);
  devolverNada = true;
  let lanza = false;
  try {
    r.empezarCarga(6, 6000);
    r.actualizarCarga(6, estado, 6100);
    r.actualizarCarga(6, estado, 6116);
    r.soltar(disparo(6, 4, 1));
    r.cancelarCarga(6, 6200);
    r.estallar({ quien: 7, bala: 130, x: 0, y: 0, z: 0, nivel: 1, area: 3, t: 6300 });
    r.callar();
  } catch {
    lanza = true;
  }
  const pedidasSinManejo = sonados.filter((s) => s.id === 'carga-rayo' && s.o.carga === 0.3 && s.parado === 0).length;
  comprobar(
    'un `estalla` ya oído con su disparo no suena otra vez, uno sin disparo suena donde estalla; cancelar calla la carga; y con un sonido que no devuelve manejo nada lanza ni se pide la voz cada fotograma',
    yaOido === 0 && sinDisparo === 'rayo,trueno' && vozDel4?.id === 'carga-rayo' && vozDel4.parado === 1 && !lanza && pedidasSinManejo === 1,
    { yaOido, sinDisparo, vozDel4: vozDel4?.parado, lanza, pedidasSinManejo },
  );
  /* Y DELEGA: lo de debajo recibe cada llamada, una vez, en su orden (también envuelto dos veces). */
  llamadas.length = 0;
  doble.empezarCarga(9, 100);
  doble.actualizarCarga(9, estado, 116);
  doble.cancelarCarga(9, 132);
  doble.soltar(disparo(9, 3, 0.6));
  doble.estallar({ quien: 9, bala: 73, x: 0, y: 0, z: 0, nivel: 3, area: 1, t: 150 });
  comprobar(
    'el envoltorio del sonido DELEGA en el `sistema.rayo` que había cada llamada, una vez y en su orden, y no se envuelve dos veces (CONTRATO §5.8)',
    doble.base === espia &&
      llamadas.join(' | ') === `empezar 9 100 | actualizar 9 0.3 116 | cancelar 9 132 | soltar 9 73 | estallar 9 73`,
    llamadas,
  );
  nota(`trueno: retumbo ${db(retumbo / desgarro).toFixed(1)} dB bajo el desgarro, ${(parteGrave * 100).toFixed(0)} % grave; crepitaciones de ${(alPrincipio * 1000).toFixed(0)} a ${(lleno * 1000).toFixed(0)} ms`);
}

terminar({ escritas: 91, enVerde: 'El sonido del Quiebro dice la verdad sobre el tiempo.' });
