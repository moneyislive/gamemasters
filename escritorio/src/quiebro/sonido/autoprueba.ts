/**
 * LA AUTOPRUEBA DEL SONIDO: lo que Node no puede mirar, mirado en el navegador sin altavoz.
 *
 * ═══ POR QUÉ HACE FALTA, ADEMÁS DE `verificar-quiebro-sonido.ts` ═══
 *
 * El comprobador de Node prueba las CUENTAS (que el desfase cancela la latencia, que la curva del
 * silbido acaba donde debe, que la partitura no desafina). Lo que no puede probar es que el GRAFO de
 * WebAudio haga lo que las cuentas dicen: que el silbido, enchufado a su panoramizador, a su bus y al
 * compresor, muera de verdad en su muestra; que un golpe a la izquierda salga por el canal izquierdo;
 * que el Remanso se coma los agudos del mundo y NO los del silbido; que la cinta del Bis repita lo que
 * grabó. Node no tiene WebAudio, y aquí no se instala nada.
 *
 * Así que esto renderiza cada escena en una `OfflineAudioContext` —el mismo motor de audio del
 * navegador, más rápido que el tiempo real y sin altavoz— con el MISMO `crearSonido()` que usa el
 * juego, y mide el búfer que sale. Fuera de línea el «oído» es el reloj del contexto en milisegundos
 * (ver `motor.ts`), así que un anillo con impacto en 800 ms se busca en la muestra de los 800 ms.
 *
 * Se lanza desde el banco (`banco-quiebro-sonido.html`, «Autoprueba») y queda en
 * `window.autopruebaDelSonido()` para correrla desde las herramientas del navegador. Usa el
 * panoramizador de igual potencia (calidad baja) para que las medidas de izquierda y derecha no
 * dependan de la base de datos HRTF de cada navegador.
 */
import { crearSonido } from './index';
import type { Sonido } from './index';
import { tonoDelSilbido } from './cuentas';
import { db, rms, tieneNoFinitos, tonoPorAutocorrelacion } from './sintesis';
import { IDS_DE_SONIDO } from './voces';

export interface ResultadoDeLaAutoprueba {
  readonly nombre: string;
  readonly bien: boolean;
  readonly detalle: string;
}

const SR = 48000;
const OYENTE = { x: 0, y: 1.7, z: 0 };
const DELANTE = { x: 0, y: 0, z: -1 };

/** Una escena: se monta con un sonido fuera de línea y se renderiza `segundos`. */
async function renderizar(segundos: number, montar: (s: Sonido) => void): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: Math.round(segundos * SR), sampleRate: SR });
  const s = crearSonido({ contexto: ctx, calidad: 'baja', escuchar: null, semilla: 99 });
  // Primero la medida de la latencia del grafo: sin ella, todo se oiría el retraso del compresor tarde.
  await s.listo();
  s.oyente(OYENTE, DELANTE);
  montar(s);
  s.avanzar(segundos);
  return ctx.startRendering();
}

const canal = (b: AudioBuffer, i: number): Float32Array => b.getChannelData(Math.min(i, b.numberOfChannels - 1));
const mono = (b: AudioBuffer): Float32Array => {
  const i = canal(b, 0);
  const d = canal(b, 1);
  return Float32Array.from(i, (v, k) => 0.5 * (v + (d[k] ?? 0)));
};
const ms = (x: number): number => Math.round((x / 1000) * SR);

/** Energía de los agudos: la derivada, que es un paso alto de un cero. */
function agudos(m: Float32Array, desde: number, hasta: number): number {
  let s = 0;
  const a = Math.max(1, desde);
  const b = Math.min(m.length, hasta);
  for (let i = a; i < b; i++) s += ((m[i] ?? 0) - (m[i - 1] ?? 0)) ** 2;
  return Math.sqrt(s / Math.max(1, b - a));
}

/** Envolvente RMS en ventanas de `ventanaMs`. */
function envolvente(m: Float32Array, desdeMs: number, hastaMs: number, ventanaMs: number): number[] {
  const salen: number[] = [];
  for (let t = desdeMs; t < hastaMs; t += ventanaMs) salen.push(rms(m, ms(t), ms(t + ventanaMs)));
  return salen;
}

function correlacionDeEnvolventes(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  const ma = a.slice(0, n).reduce((x, y) => x + y, 0) / n;
  const mb = b.slice(0, n).reduce((x, y) => x + y, 0) / n;
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < n; i++) {
    const x = (a[i] ?? 0) - ma;
    const y = (b[i] ?? 0) - mb;
    ab += x * y;
    aa += x * x;
    bb += y * y;
  }
  return aa * bb === 0 ? 0 : ab / Math.sqrt(aa * bb);
}

const cifra = (x: number, d = 1): string => (Number.isFinite(x) ? x.toFixed(d) : String(x));

type Prueba = () => Promise<ResultadoDeLaAutoprueba>;

const PRUEBAS: readonly Prueba[] = [
  async () => {
    const b = await renderizar(1.2, (s) => {
      s.anillo(100, 800, { x: 0, y: 1.7, z: -3 }, 1);
    });
    const m = mono(b);
    const antes = rms(m, 0, ms(95));
    const env = envolvente(m, 600, 860, 2);
    let pico = 0;
    env.forEach((v, i) => {
      if (v > (env[pico] ?? 0)) pico = i;
    });
    const picoMs = 600 + pico * 2;
    const despues = rms(m, ms(840), ms(900));
    const enPico = env[pico] ?? 0;
    const bien = db(antes) < -80 && picoMs >= 794 && picoMs <= 806 && db(despues) - db(enPico) < -12;
    return {
      nombre: 'el silbido calla antes de su inicio, su cresta cae en el impacto (800 ms) y muere después',
      bien,
      detalle: `antes ${cifra(db(antes))} dB · cresta en ${picoMs} ms · 40 ms después ${cifra(db(despues) - db(enPico))} dB`,
    };
  },
  async () => {
    const b = await renderizar(1.2, (s) => {
      s.anillo(100, 800, { x: 0, y: 1.7, z: -3 }, 1);
    });
    const m = mono(b);
    const pronto = tonoPorAutocorrelacion(m, SR, ms(250), ms(330), 250, 2400);
    const tarde = tonoPorAutocorrelacion(m, SR, ms(720), ms(780), 250, 2400);
    const esperadoTarde = tonoDelSilbido(50, 1);
    const bien = tarde > pronto * 1.4 && Math.abs(tarde / esperadoTarde - 1) < 0.08;
    return {
      nombre: 'el silbido sube de tono hacia el impacto (medido en el búfer)',
      bien,
      detalle: `a 300 ms ${cifra(pronto, 0)} Hz · a 750 ms ${cifra(tarde, 0)} Hz (la cuenta dice ~${cifra(esperadoTarde, 0)})`,
    };
  },
  async () => {
    const [limpio, conRemanso] = await Promise.all([
      renderizar(1.2, (s) => {
        s.anillo(100, 800, { x: 0, y: 1.7, z: -3 }, 1);
      }),
      renderizar(1.2, (s) => {
        s.remanso(1);
        s.anillo(100, 800, { x: 0, y: 1.7, z: -3 }, 1);
      }),
    ]);
    const a = tonoPorAutocorrelacion(mono(limpio), SR, ms(720), ms(780), 250, 2400);
    const r = tonoPorAutocorrelacion(mono(conRemanso), SR, ms(720), ms(780), 250, 2400);
    const nivel = db(rms(mono(conRemanso), ms(600), ms(790))) - db(rms(mono(limpio), ms(600), ms(790)));
    return {
      nombre: 'el Remanso NO toca el silbido: mismo tono y mismo nivel (va por el camino claro)',
      // El camino claro no pasa por nada que el Remanso toque: tiene que salir IGUAL, no «parecido».
      bien: Math.abs(r / a - 1) < 0.005 && Math.abs(nivel) < 0.3,
      detalle: `tono ${cifra(a, 0)} → ${cifra(r, 0)} Hz · nivel ${cifra(nivel)} dB`,
    };
  },
  async () => {
    const [sin, con] = await Promise.all([
      renderizar(1, (s) => {
        s.sonar('aire', { golpe: 'cierre', enMs: 300 });
      }),
      renderizar(1, (s) => {
        s.remanso(1);
        s.sonar('aire', { golpe: 'cierre', enMs: 300 });
      }),
    ]);
    const caida = db(agudos(mono(con), ms(300), ms(600))) - db(agudos(mono(sin), ms(300), ms(600)));
    return {
      nombre: 'el Remanso SÍ se come los agudos del mundo (un golpe al aire)',
      bien: caida < -12,
      detalle: `agudos ${cifra(caida)} dB`,
    };
  },
  async () => {
    // El acento «a compás» de un impacto es un La 5 (880 Hz) que dura medio segundo: una nota limpia.
    const [sin, con] = await Promise.all([
      renderizar(1.2, (s) => {
        s.sonar('impacto', { aCompas: true, enMs: 200 });
      }),
      renderizar(1.2, (s) => {
        s.remanso(1);
        s.sonar('impacto', { aCompas: true, enMs: 200 });
      }),
    ]);
    const a = tonoPorAutocorrelacion(mono(sin), SR, ms(320), ms(620), 250, 1500);
    const r = tonoPorAutocorrelacion(mono(con), SR, ms(320), ms(620), 250, 1500);
    return {
      nombre: 'el Remanso baja el mundo una octava (el acento afinado de un impacto, de 880 a 440 Hz)',
      bien: Math.abs(a / 880 - 1) < 0.03 && Math.abs(r / 440 - 1) < 0.03,
      detalle: `${cifra(a)} Hz → ${cifra(r)} Hz`,
    };
  },
  async () => {
    const [izq, der] = await Promise.all([
      renderizar(0.8, (s) => {
        s.sonar('impacto', { posicion: { x: -4, y: 1.7, z: 0 }, enMs: 100 });
      }),
      renderizar(0.8, (s) => {
        s.sonar('impacto', { posicion: { x: 4, y: 1.7, z: 0 }, enMs: 100 });
      }),
    ]);
    const balance = (b: AudioBuffer): number => db(rms(canal(b, 0), ms(100), ms(400))) - db(rms(canal(b, 1), ms(100), ms(400)));
    const bi = balance(izq);
    const bd = balance(der);
    return {
      nombre: 'un golpe a la izquierda suena por la izquierda y uno a la derecha por la derecha',
      bien: bi > 6 && bd < -6,
      detalle: `izquierda ${cifra(bi)} dB · derecha ${cifra(bd)} dB (izq − der)`,
    };
  },
  async () => {
    /*
     * A 150 m y A LA IZQUIERDA: si lo que llega es sobre todo la cola de la calle (que viene de todas
     * partes), se oye en el centro y la brújula no sirve. Tiene que oírse a la izquierda.
     */
    const [cerca, lejos] = await Promise.all([
      renderizar(1.6, (s) => {
        s.cabina({ x: -5, y: 1.7, z: 0 });
      }),
      renderizar(1.6, (s) => {
        s.cabina({ x: -150, y: 1.7, z: 0 });
      }),
    ]);
    const nc = db(rms(mono(cerca), ms(100), ms(1400)));
    const nl = db(rms(mono(lejos), ms(100), ms(1400)));
    const lado = db(rms(canal(lejos, 0), ms(100), ms(1400))) - db(rms(canal(lejos, 1), ms(100), ms(1400)));
    return {
      nombre: 'la cabina a 150 m se oye lejana pero se oye, y DÓNDE está (a la izquierda): es la brújula de la carrera',
      bien: nc - nl > 12 && nc - nl < 32 && nl > -50 && lado > 4,
      detalle: `a 5 m ${cifra(nc)} dBFS · a 150 m ${cifra(nl)} dBFS · a 150 m, izquierda − derecha ${cifra(lado)} dB`,
    };
  },
  async () => {
    const b = await renderizar(3.6, (s) => {
      s.ambiente({ tiempo: 'seca', ciudad: 0 });
      s.sonar('paso', { fuerza: 1, enMs: 500 });
      s.bis(2);
    });
    const m = mono(b);
    // La cinta repite con un segundo EXACTO de retraso: las tres ventanas, desplazadas 1 y 2 s.
    const grabado = envolvente(m, 40, 1000, 10);
    const primera = envolvente(m, 1040, 2000, 10);
    const segunda = envolvente(m, 2040, 3000, 10);
    const c1 = correlacionDeEnvolventes(grabado, primera);
    const c2 = correlacionDeEnvolventes(grabado, segunda);
    const despues = db(rms(m, ms(3300), ms(3600))) - db(rms(m, ms(20), ms(1000)));
    return {
      nombre: 'el Bis repite dos veces el segundo que grabó (palomas, farola y un paso), y después se calla',
      bien: c1 > 0.6 && c2 > 0.5 && despues < -15,
      detalle: `parecido 1.ª ${cifra(c1, 2)} · 2.ª ${cifra(c2, 2)} · después ${cifra(despues)} dB`,
    };
  },
  async () => {
    const b = await renderizar(4.2, (s) => {
      s.musica({ modo: 'calma' });
    });
    const m = mono(b);
    const p = 500;
    let buenos = 0;
    const razones: string[] = [];
    for (let pulso = 1; pulso <= 7; pulso++) {
      const t = pulso * p;
      const golpe = agudos(m, ms(t - 3), ms(t + 12));
      const entre = agudos(m, ms(t + 150), ms(t + 350));
      razones.push(cifra(golpe / Math.max(1e-9, entre), 1));
      if (golpe > 3 * entre) buenos++;
    }
    return {
      nombre: 'la música en calma marca el pulso: el tic-tac cae en cada pulso de la rejilla (cada 500 ms)',
      bien: buenos >= 6,
      detalle: `pulsos con golpe: ${buenos}/7 · razones ${razones.join(' ')}`,
    };
  },
  async () => {
    const [raso, techo] = await Promise.all([
      renderizar(1.6, (s) => s.ambiente({ tiempo: 'aguacero', bajoTecho: 0 })),
      renderizar(1.6, (s) => s.ambiente({ tiempo: 'aguacero', bajoTecho: 1 })),
    ]);
    const hf = db(agudos(mono(techo), ms(800), ms(1600))) - db(agudos(mono(raso), ms(800), ms(1600)));
    return {
      nombre: 'bajo la marquesina la lluvia pierde agudos (más de 6 dB)',
      bien: hf < -6,
      detalle: `agudos ${cifra(hf)} dB`,
    };
  },
  async () => {
    const b = await renderizar(6.2, (s) => {
      s.tren({ x: -60, y: 8, z: -15 }, { x: 60, y: 8, z: -15 }, 6);
    });
    const balance = (desde: number, hasta: number): number => db(rms(canal(b, 0), ms(desde), ms(hasta))) - db(rms(canal(b, 1), ms(desde), ms(hasta)));
    const entra = balance(300, 2000);
    const sale = balance(4000, 5700);
    return {
      nombre: 'el tren pasa de izquierda a derecha',
      bien: entra > 3 && sale < -3,
      detalle: `al llegar ${cifra(entra)} dB · al irse ${cifra(sale)} dB (izq − der)`,
    };
  },
  async () => {
    const mudos: string[] = [];
    const rotos: string[] = [];
    for (const id of IDS_DE_SONIDO) {
      const b = await renderizar(1.7, (s) => {
        s.sonar(id, { posicion: { x: 1, y: 1.7, z: -3 }, enMs: 50, golpe: 'cierre', material: 'piedra', cuenta: 4, aCompas: true });
      });
      const m = mono(b);
      if (tieneNoFinitos(canal(b, 0)) || tieneNoFinitos(canal(b, 1))) rotos.push(id);
      else if (db(rms(m)) < -60) mudos.push(`${id} (${cifra(db(rms(m)))} dB)`);
    }
    return {
      nombre: `los ${IDS_DE_SONIDO.length} sonidos del recetario suenan y ninguno da NaN`,
      bien: mudos.length === 0 && rotos.length === 0,
      detalle: mudos.length + rotos.length === 0 ? 'todos suenan' : `mudos: ${mudos.join(', ')} · rotos: ${rotos.join(', ')}`,
    };
  },
  async () => {
    const b = await renderizar(6, (s) => {
      s.ambiente({ tiempo: 'aguacero', ciudad: 1 });
      s.musica({ modo: 'llamada', racha: 8 });
      s.cabina({ x: 10, y: 1.7, z: -20 });
      s.tren({ x: -40, y: 8, z: -10 }, { x: 40, y: 8, z: -10 }, 5);
      IDS_DE_SONIDO.forEach((id, i) => {
        s.sonar(id, { posicion: { x: (i % 5) - 2, y: 1.7, z: -2 - (i % 3) }, enMs: 200 + i * 180, golpe: 'cierre', aCompas: true, cuenta: 1 + (i % 12) });
      });
      for (let k = 0; k < 4; k++) s.anillo(900 + k * 1100, 1600 + k * 1100, { x: k - 2, y: 1.7, z: -4 }, 1);
    });
    const i = canal(b, 0);
    const d = canal(b, 1);
    let picoAbs = 0;
    for (let k = 0; k < i.length; k++) picoAbs = Math.max(picoAbs, Math.abs(i[k] ?? 0), Math.abs(d[k] ?? 0));
    const nivel = db(rms(mono(b)));
    return {
      nombre: 'la noche entera a la vez (aguacero, ciudad, Llamada, cabina, tren, todos los sonidos y cuatro anillos) ni satura ni da NaN',
      bien: !tieneNoFinitos(i) && !tieneNoFinitos(d) && picoAbs <= 1.001 && nivel > -40,
      detalle: `pico ${cifra(picoAbs, 3)} · nivel ${cifra(nivel)} dBFS`,
    };
  },
];

/** CORRE LA AUTOPRUEBA entera. `alAvanzar` recibe cada resultado según sale. */
export async function correrLaAutoprueba(alAvanzar?: (r: ResultadoDeLaAutoprueba, hechas: number, total: number) => void): Promise<ResultadoDeLaAutoprueba[]> {
  const salen: ResultadoDeLaAutoprueba[] = [];
  for (const prueba of PRUEBAS) {
    let r: ResultadoDeLaAutoprueba;
    try {
      r = await prueba();
    } catch (e) {
      r = { nombre: 'una prueba reventó', bien: false, detalle: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
    }
    salen.push(r);
    alAvanzar?.(r, salen.length, PRUEBAS.length);
  }
  return salen;
}

export const CUANTAS_PRUEBAS = PRUEBAS.length;
