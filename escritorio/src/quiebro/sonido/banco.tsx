/**
 * EL BANCO DEL SONIDO DEL QUIEBRO: un botón para cada cosa que suena, y dos pruebas que sólo puede
 * hacer una persona con auriculares.
 *
 * ═══ QUÉ SE JUZGA AQUÍ, QUE ES LO QUE NINGÚN COMPROBADOR PUEDE ═══
 *
 * `verificar-quiebro-sonido.ts` prueba las cuentas y la autoprueba de abajo prueba el grafo, pero que
 * un golpe SUENE a golpe, que la lluvia no suene a fritura y que la Llamada tenga carácter sólo lo
 * dice un oído. Y dos cosas del diseño se miden aquí con personas, porque son el hito 1 (§13):
 *
 *   · QUEBRAR DE OÍDO. El banco lanza anillos a ciegas (sin pintar el anillo, si se quiere) y mide,
 *     con el `timeStamp` del `pointerdown` o de la tecla, cuánto se adelantó o se retrasó cada quiebro
 *     respecto del impacto. Si el silbido cumple, la media cae ligeramente ANTES del impacto (la
 *     asincronía negativa, ver `SILBIDO` en `cuentas.ts`) y la tasa de limpios con 200 ms de ventana es
 *     alta. Si la conversión de relojes estuviera mal, la media se iría la latencia entera hacia tarde.
 *   · A COMPÁS. Pulsar con el pulso de la música y ver el desvío con signo: es la cifra con la que el
 *     plan B del diseño (§4.5) decide si la ventana pasa de ±75 a ±100 ms.
 *
 * ═══ POR QUÉ `onPointerDown` Y NO `onClick` ═══
 *
 * Lo pide la casa (`verify:escritorio`) y aquí además es la prueba: el diseño manda que todo actúe en
 * `pointerdown` (§7), y el tiempo del quiebro se toma del `timeStamp` de ESE evento. Un `click` llega
 * al soltar el dedo, 80-150 ms después, y la prueba de oído mediría el dedo, no el oído. Las teclas
 * (Intro, Espacio) valen igual, con su propio `timeStamp`.
 *
 * Se abre en http://localhost:5291/sala/banco-quiebro-sonido.html (o el puerto del Vite del escritorio).
 */
import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX, KeyboardEvent as EventoDeTecla, PointerEvent as EventoDePuntero, ReactNode } from 'react';
import { crearSonido, desvioDelPulso, faseDelPulso, IDS_DE_SONIDO, CATEGORIAS } from './index';
import type { CategoriaDeSonido, DiagnosticoDelSonido, EstadoDelSonido, IdDeSonido, ManejoDeSonido, ModoDeLaMusica, Punto3, TiempoDeLaNoche, TipoDeGolpe } from './index';
import { correrLaAutoprueba, CUANTAS_PRUEBAS } from './autoprueba';
import type { ResultadoDeLaAutoprueba } from './autoprueba';

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Un solo sonido para toda la página
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const sonido = crearSonido();
const ventana = window as unknown as { sonidoDelBanco?: typeof sonido; autopruebaDelSonido?: typeof correrLaAutoprueba };
ventana.sonidoDelBanco = sonido;
ventana.autopruebaDelSonido = correrLaAutoprueba;

const OYENTE: Punto3 = { x: 0, y: 1.7, z: 0 };

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Piezas de la página
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** Un botón que actúa en `pointerdown` (y con Intro o Espacio), pasando el `timeStamp` del evento. */
function Boton(props: { children: ReactNode; alPulsar: (instanteMs: number) => void; tono?: 'ambar' | 'cian' | 'magenta' | 'gris'; grande?: boolean; activo?: boolean }): JSX.Element {
  const clase = ['bq-boton', `bq-${props.tono ?? 'cian'}`, props.grande === true ? 'bq-grande' : '', props.activo === true ? 'bq-activo' : ''].join(' ');
  return (
    <button
      type="button"
      className={clase}
      onPointerDown={(e: EventoDePuntero<HTMLButtonElement>) => {
        if (e.button !== 0) return;
        props.alPulsar(e.timeStamp);
      }}
      onKeyDown={(e: EventoDeTecla<HTMLButtonElement>) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (!e.repeat) props.alPulsar(e.timeStamp);
      }}
    >
      {props.children}
    </button>
  );
}

function Seccion(props: { titulo: string; nota?: string; children: ReactNode }): JSX.Element {
  return (
    <section className="bq-seccion">
      <h2>{props.titulo}</h2>
      {props.nota !== undefined ? <p className="bq-nota">{props.nota}</p> : null}
      {props.children}
    </section>
  );
}

function Deslizador(props: { etiqueta: string; valor: number; min: number; max: number; paso: number; alCambiar: (v: number) => void; unidad?: string }): JSX.Element {
  return (
    <label className="bq-deslizador">
      <span>
        {props.etiqueta} <b>{props.valor.toFixed(props.paso < 1 ? 2 : 0)}{props.unidad ?? ''}</b>
      </span>
      <input type="range" min={props.min} max={props.max} step={props.paso} value={props.valor} onChange={(e) => props.alCambiar(Number(e.target.value))} />
    </label>
  );
}

const redondo = (x: number, d = 0): string => (Number.isFinite(x) ? x.toFixed(d) : '—');

function estadistica(valores: readonly number[]): { n: number; media: number; desviacion: number } {
  const n = valores.length;
  if (n === 0) return { n, media: Number.NaN, desviacion: Number.NaN };
  const media = valores.reduce((a, b) => a + b, 0) / n;
  const desviacion = Math.sqrt(valores.reduce((a, b) => a + (b - media) ** 2, 0) / n);
  return { n, media, desviacion };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// La cabecera: estado, desbloqueo, volúmenes
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const NOMBRES_DE_ESTADO: Record<EstadoDelSonido, string> = {
  'sin-audio': 'sin WebAudio',
  bloqueado: 'bloqueado: toca BAJAR',
  corriendo: 'corriendo',
  suspendido: 'suspendido',
  interrumpido: 'interrumpido (llamada)',
  cerrado: 'cerrado',
};

const NOMBRES_DE_CATEGORIA: Record<CategoriaDeSonido, string> = { senales: 'Señales', efectos: 'Efectos', ambiente: 'Ambiente', musica: 'Música' };

function Cabecera(): JSX.Element {
  const [estado, ponerEstado] = useState<EstadoDelSonido>(sonido.estado());
  const [diagnostico, ponerDiagnostico] = useState<DiagnosticoDelSonido>(sonido.diagnostico());
  const [mudo, ponerMudo] = useState(sonido.silenciado());
  const [alta, ponerAlta] = useState(true);
  const [volumenes, ponerVolumenes] = useState<Record<CategoriaDeSonido | 'maestro', number>>(() => ({
    maestro: sonido.volumenDe('maestro'),
    senales: sonido.volumenDe('senales'),
    efectos: sonido.volumenDe('efectos'),
    ambiente: sonido.volumenDe('ambiente'),
    musica: sonido.volumenDe('musica'),
  }));
  useEffect(() => sonido.alCambiar(ponerEstado), []);
  useEffect(() => {
    const t = setInterval(() => {
      ponerEstado(sonido.estado());
      ponerDiagnostico(sonido.diagnostico());
    }, 500);
    return () => clearInterval(t);
  }, []);
  const volumen = (c: CategoriaDeSonido | 'maestro', v: number): void => {
    sonido.volumen(c, v);
    ponerVolumenes((antes) => ({ ...antes, [c]: v }));
  };
  return (
    <header className="bq-cabecera">
      <div className="bq-titulo">
        <h1>El Quiebro · banco del sonido</h1>
        <span className={`bq-estado bq-estado-${estado}`}>{NOMBRES_DE_ESTADO[estado]}</span>
      </div>
      <div className="bq-fila">
        <Boton tono="ambar" grande alPulsar={() => void sonido.desbloquear()}>
          BAJAR
        </Boton>
        <Boton
          tono="gris"
          activo={mudo}
          alPulsar={() => {
            sonido.silenciar(!mudo);
            ponerMudo(!mudo);
          }}
        >
          {mudo ? 'Silenciado' : 'Silenciar'}
        </Boton>
        <Boton
          tono="gris"
          activo={!alta}
          alPulsar={() => {
            sonido.calidad(alta ? 'baja' : 'alta');
            ponerAlta(!alta);
          }}
        >
          {alta ? 'Calidad alta (HRTF)' : 'Calidad baja (igual potencia)'}
        </Boton>
        {sonido.puedeCallarElInterruptor ? (
          <Boton tono="magenta" alPulsar={() => sonido.sesionDeReproduccion()}>
            Sonar con el interruptor de silencio puesto
          </Boton>
        ) : null}
      </div>
      {sonido.puedeCallarElInterruptor && estado === 'corriendo' ? (
        <p className="bq-aviso">¿No oyes nada? En el iPhone el interruptor de silencio calla el juego aunque el audio esté en marcha.</p>
      ) : null}
      <div className="bq-volumenes">
        <Deslizador etiqueta="Maestro" valor={volumenes.maestro} min={0} max={1.2} paso={0.05} alCambiar={(v) => volumen('maestro', v)} />
        {CATEGORIAS.map((c) => (
          <Deslizador key={c} etiqueta={NOMBRES_DE_CATEGORIA[c]} valor={volumenes[c]} min={0} max={1.2} paso={0.05} alCambiar={(v) => volumen(c, v)} />
        ))}
      </div>
      <p className="bq-diagnostico">
        {redondo(diagnostico.frecuenciaDeMuestreo)} Hz · latencia declarada {redondo(diagnostico.latenciaMs, 1)} ms · desfase medido{' '}
        {diagnostico.desfaseMs === null ? '—' : `${redondo(diagnostico.desfaseMs, 1)} ms`} ({diagnostico.fuenteDelReloj}, {diagnostico.saltosDelReloj} saltos) ·{' '}
        {diagnostico.vocesActivas} voces · {diagnostico.pasosSaltados} pasos saltados · grafo {redondo(diagnostico.latenciaDelGrafoMs.claro, 1)} ms (claro) /{' '}
        {redondo(diagnostico.latenciaDelGrafoMs.mundo, 1)} ms (mundo)
      </p>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El plano: dónde está la fuente y hacia dónde mira el oyente
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const METROS_DEL_PLANO = 30;

function Plano(props: { fuente: Punto3; alMover: (p: Punto3) => void; rumbo: number; alGirar: (grados: number) => void }): JSX.Element {
  const lienzo = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = lienzo.current;
    const g = c?.getContext('2d');
    if (c === null || g === null || g === undefined) return;
    const lado = c.width;
    const escala = lado / METROS_DEL_PLANO;
    const centro = lado / 2;
    g.fillStyle = '#081916';
    g.fillRect(0, 0, lado, lado);
    g.strokeStyle = '#1d4a42';
    for (const r of [5, 10]) {
      g.beginPath();
      g.arc(centro, centro, r * escala, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = '#5c8f86';
    g.font = '11px monospace';
    g.fillText('5 m', centro + 5 * escala + 3, centro);
    g.fillText('10 m', centro + 10 * escala + 3, centro);
    g.fillText('N (−z)', centro - 18, 12);
    // El oyente: un triángulo que mira hacia su rumbo (0° = norte, −z).
    const a = (props.rumbo * Math.PI) / 180;
    g.save();
    g.translate(centro, centro);
    g.rotate(a);
    g.fillStyle = '#5fe0c8';
    g.beginPath();
    g.moveTo(0, -12);
    g.lineTo(8, 8);
    g.lineTo(-8, 8);
    g.closePath();
    g.fill();
    g.restore();
    // La fuente.
    g.fillStyle = '#ffb347';
    g.beginPath();
    g.arc(centro + props.fuente.x * escala, centro + props.fuente.z * escala, 7, 0, Math.PI * 2);
    g.fill();
  }, [props.fuente, props.rumbo]);
  const alPulsar = (e: EventoDePuntero<HTMLCanvasElement>): void => {
    const c = lienzo.current;
    if (c === null) return;
    const caja = c.getBoundingClientRect();
    const escala = caja.width / METROS_DEL_PLANO;
    const x = (e.clientX - caja.left - caja.width / 2) / escala;
    const z = (e.clientY - caja.top - caja.height / 2) / escala;
    props.alMover({ x, y: 1.7, z });
  };
  const d = Math.hypot(props.fuente.x, props.fuente.z);
  return (
    <div className="bq-plano">
      <canvas ref={lienzo} width={300} height={300} onPointerDown={alPulsar} />
      <div>
        <p className="bq-nota">
          Toca el plano para poner la FUENTE (el punto ámbar): los sonidos con posición salen de ahí. Está a <b>{redondo(d, 1)} m</b>. El triángulo es el oyente (la cámara).
        </p>
        <Deslizador etiqueta="Rumbo del oyente" valor={props.rumbo} min={0} max={359} paso={1} unidad="°" alCambiar={props.alGirar} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El silbido y la prueba de quebrar de oído
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

interface Ronda {
  readonly inicioMs: number;
  readonly impactoMs: number;
  readonly duracionMs: number;
}

type Veredicto = 'limpio' | 'esquivado' | 'golpe' | 'sin quiebro';

interface Resultado {
  readonly desvioMs: number;
  readonly veredicto: Veredicto;
  readonly duracionMs: number;
}

/** Diseño §4.3: limpio si impacto − quiebro ∈ [0, V]; esquivado si ∈ (V, 250]; golpe si no. */
function juzgar(quiebroMs: number, impactoMs: number, ventanaMs: number): Veredicto {
  const d = impactoMs - quiebroMs;
  if (d >= 0 && d <= ventanaMs) return 'limpio';
  if (d > ventanaMs && d <= 250) return 'esquivado';
  return 'golpe';
}

function SeccionAnillo(props: { fuente: Punto3 }): JSX.Element {
  const [ventanaMs, ponerVentana] = useState(200);
  const [visible, ponerVisible] = useState(false);
  const [activa, ponerActiva] = useState(false);
  const [resultados, ponerResultados] = useState<Resultado[]>([]);
  const ronda = useRef<Ronda | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aro = useRef<HTMLDivElement | null>(null);
  const activaRef = useRef(false);
  const ventanaRef = useRef(ventanaMs);
  ventanaRef.current = ventanaMs;

  const anillo = (duracionMs: number, fuerza: number, donde: Punto3 = props.fuente): void => {
    const ahora = performance.now();
    sonido.anillo(ahora + 30, ahora + 30 + duracionMs, donde, fuerza);
  };

  const siguiente = useCallback((): void => {
    if (!activaRef.current) return;
    const retraso = 900 + Math.random() * 1400;
    const duraciones = [700, 550, 300] as const;
    const duracionMs = duraciones[Math.floor(Math.random() * duraciones.length)] ?? 700;
    const angulo = Math.random() * Math.PI * 2;
    const lejos = 2.5 + Math.random() * 3.5;
    const donde: Punto3 = { x: Math.sin(angulo) * lejos, y: 1.7, z: -Math.cos(angulo) * lejos };
    const inicioMs = performance.now() + retraso;
    const r: Ronda = { inicioMs, impactoMs: inicioMs + duracionMs, duracionMs };
    ronda.current = r;
    sonido.anillo(r.inicioMs, r.impactoMs, donde, duracionMs === 700 ? 0.55 : 1);
    espera.current = setTimeout(() => {
      if (ronda.current !== r) return;
      ronda.current = null;
      sonido.sonar('impacto', { golpe: 'entrada' });
      sonido.sonar('cuerpo', {});
      ponerResultados((antes) => [...antes, { desvioMs: Number.NaN, veredicto: 'sin quiebro', duracionMs }]);
      espera.current = setTimeout(siguiente, 700);
    }, retraso + duracionMs + 300);
  }, []);

  const quebrar = useCallback(
    (instanteMs: number): void => {
      const r = ronda.current;
      if (r === null || instanteMs < r.inicioMs - 150) {
        sonido.sonar('quiebro-torpe', {});
        return;
      }
      ronda.current = null;
      if (espera.current !== null) clearTimeout(espera.current);
      const veredicto = juzgar(instanteMs, r.impactoMs, ventanaRef.current);
      if (veredicto === 'limpio') {
        sonido.sonar('quiebro-limpio', {});
        remansar();
      } else if (veredicto === 'esquivado') {
        sonido.sonar('quiebro', {});
      } else {
        sonido.sonar('quiebro', {});
        sonido.sonar('impacto', { golpe: 'entrada', enMs: Math.max(instanteMs, r.impactoMs) });
      }
      ponerResultados((antes) => [...antes, { desvioMs: instanteMs - r.impactoMs, veredicto, duracionMs: r.duracionMs }]);
      espera.current = setTimeout(siguiente, 900);
    },
    [siguiente],
  );

  // El aro que se cierra (si se pinta), en cada fotograma, sin pasar por React.
  useEffect(() => {
    let vivo = true;
    const cuadro = (): void => {
      if (!vivo) return;
      const r = ronda.current;
      const el = aro.current;
      if (el !== null) {
        if (r === null || !visible) el.style.opacity = '0';
        else {
          const u = Math.min(1, Math.max(0, (performance.now() - r.inicioMs) / r.duracionMs));
          el.style.opacity = performance.now() < r.inicioMs ? '0' : '1';
          el.style.transform = `scale(${(1 - u) * 2.4 + 0.25})`;
        }
      }
      requestAnimationFrame(cuadro);
    };
    requestAnimationFrame(cuadro);
    return () => {
      vivo = false;
    };
  }, [visible]);

  // La barra espaciadora quiebra (con el `timeStamp` de la tecla).
  useEffect(() => {
    const tecla = (e: KeyboardEvent): void => {
      // Sobre un botón con foco, la tecla ya la atiende el propio botón: no se cuenta dos veces.
      if (e.code !== 'Space' || e.repeat || !activaRef.current || e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      quebrar(e.timeStamp);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [quebrar]);

  const conDesvio = resultados.filter((r) => Number.isFinite(r.desvioMs));
  const est = estadistica(conDesvio.map((r) => r.desvioMs));
  const limpios = resultados.filter((r) => r.veredicto === 'limpio').length;
  return (
    <Seccion titulo="1 · El silbido del anillo" nota="Sube de tono y late cada 125 ms hasta el impacto, con el último latido clavado en él. Sale de la fuente del plano.">
      <div className="bq-fila">
        <Boton tono="ambar" alPulsar={() => anillo(700, 0.55)}>Prestado · 700 ms</Boton>
        <Boton tono="ambar" alPulsar={() => anillo(550, 1)}>Celador · 550 ms</Boton>
        <Boton tono="ambar" alPulsar={() => anillo(300, 1)}>Respuesta de guardia · 300 ms</Boton>
        <Boton tono="gris" alPulsar={() => anillo(550, 0.15)}>Anillo ajeno (tenue)</Boton>
        <Boton
          tono="magenta"
          alPulsar={() => {
            const ahora = performance.now();
            sonido.anillo(ahora + 30, ahora + 730, { x: -4, y: 1.7, z: -1 }, 0.55);
            sonido.anillo(ahora + 200, ahora + 750, { x: 3, y: 1.7, z: 3 }, 1);
            sonido.anillo(ahora + 500, ahora + 1100, { x: 0, y: 1.7, z: -6 }, 1);
          }}
        >
          Tres a la vez
        </Boton>
      </div>
      <h3>Quebrar de oído</h3>
      <p className="bq-nota">
        Llegan anillos de sitios al azar. Pulsa QUIEBRO (o Espacio) justo ANTES del impacto. Se mide con el instante del toque, no del fotograma. Para probar el oído de verdad, deja el aro sin pintar.
      </p>
      <div className="bq-fila">
        <Boton
          tono={activa ? 'gris' : 'cian'}
          activo={activa}
          alPulsar={() => {
            const ahora = !activa;
            activaRef.current = ahora;
            ponerActiva(ahora);
            if (ahora) {
              ponerResultados([]);
              siguiente();
            } else {
              ronda.current = null;
              if (espera.current !== null) clearTimeout(espera.current);
            }
          }}
        >
          {activa ? 'Parar la prueba' : 'Empezar la prueba'}
        </Boton>
        <Boton tono="gris" activo={visible} alPulsar={() => ponerVisible(!visible)}>
          {visible ? 'Aro pintado' : 'Sólo oído'}
        </Boton>
        <label className="bq-selector">
          Ventana limpia
          <select value={ventanaMs} onChange={(e) => ponerVentana(Number(e.target.value))}>
            {[300, 200, 175, 150, 135, 120].map((v) => (
              <option key={v} value={v}>
                {v} ms
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="bq-quiebro">
        <div className="bq-diana">
          <div ref={aro} className="bq-aro" />
          <Boton tono="magenta" grande alPulsar={(t) => (activaRef.current ? quebrar(t) : sonido.sonar('quiebro', {}))}>
            QUIEBRO
          </Boton>
        </div>
        <div className="bq-tabla">
          <p>
            {est.n} medidos · media <b>{redondo(est.media)} ms</b> · desviación {redondo(est.desviacion)} ms · limpios {limpios}/{resultados.length} (
            {resultados.length === 0 ? '—' : redondo((100 * limpios) / resultados.length)} %)
          </p>
          <p className="bq-nota">Desvío = quiebro − impacto: negativo es antes (lo bueno), positivo es tarde.</p>
          <ol reversed>
            {resultados
              .slice(-8)
              .reverse()
              .map((r, i) => (
                <li key={`${resultados.length - i}`} className={`bq-veredicto-${r.veredicto.replace(' ', '-')}`}>
                  {r.veredicto} · {Number.isFinite(r.desvioMs) ? `${r.desvioMs > 0 ? '+' : ''}${redondo(r.desvioMs)} ms` : '—'} · anuncio de {r.duracionMs} ms
                </li>
              ))}
          </ol>
        </div>
      </div>
    </Seccion>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Golpes y el resto del recetario
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** La Tanda completa con los tiempos del diseño (§4.5): Entrada 400 ms, dos Seguidas a compás de 200 y Cierre de 350. */
function tanda(fuente: Punto3): void {
  const t0 = performance.now() + 20;
  const golpes: readonly [TipoDeGolpe, number, number, boolean][] = [
    ['entrada', 0, 400, false],
    ['seguida', 400, 600, true],
    ['seguida', 600, 800, true],
    ['cierre', 800, 1150, false],
  ];
  for (const [golpe, pulsa, impacta, aCompas] of golpes) {
    // En el juego, el aire suena en el pointerdown: aquí se programa en su instante.
    setTimeout(() => sonido.sonar('aire', { golpe }), pulsa);
    sonido.sonar('impacto', { golpe, posicion: fuente, enMs: t0 + impacta, aCompas });
    sonido.sonar(golpe === 'cierre' ? 'derribo' : 'cuerpo', { posicion: fuente, enMs: t0 + impacta });
  }
  sonido.sonar('estampado', { material: 'chapa', posicion: fuente, enMs: t0 + 1300 });
}

/** Una bala que cruza el plano de izquierda a derecha por delante, moviendo su sonido cada fotograma. */
function bala(): void {
  const duracionMs = 900;
  const desde: Punto3 = { x: -12, y: 1.5, z: -2 };
  const hasta: Punto3 = { x: 12, y: 1.5, z: -2 };
  sonido.sonar('disparo', { posicion: desde });
  const manejo: ManejoDeSonido = sonido.sonar('bala', { posicion: desde, duracionMs });
  const t0 = performance.now();
  const cuadro = (): void => {
    const u = (performance.now() - t0) / duracionMs;
    if (u >= 1) return;
    manejo.mover({ x: desde.x + (hasta.x - desde.x) * u, y: 1.5, z: desde.z });
    requestAnimationFrame(cuadro);
  };
  requestAnimationFrame(cuadro);
}

const RESTO: readonly [IdDeSonido, string][] = [
  ['guardia', 'Guardia (para la Entrada)'],
  ['cuerpo', 'Cuerpo (tocado)'],
  ['derribo', 'Derribo en mojado'],
  ['cristal', 'Cristal'],
  ['quiebro', 'Quiebro'],
  ['quiebro-limpio', 'Quiebro limpio'],
  ['quiebro-torpe', 'Quiebro torpe'],
  ['replica', 'Réplica'],
  ['disparo', 'Disparo'],
  ['apuntado', 'Apuntado del tirador'],
  ['desalojo', 'Desalojo'],
  ['impresion', 'Impresión de un Celador'],
  ['trasvase', 'Trasvase'],
  ['moneda', 'Moneda'],
  ['descolgar', 'Descolgar'],
  ['salida', 'Salida por la cabina'],
  ['aviso', 'Aviso'],
  ['palomas', 'Palomas'],
  ['farola', 'Farola que parpadea'],
  ['latido', 'Latido'],
  ['paso', 'Paso en mojado'],
];

function SeccionGolpes(props: { fuente: Punto3 }): JSX.Element {
  const [aCompas, ponerACompas] = useState(false);
  const [esquirla, ponerEsquirla] = useState(1);
  const golpes: readonly TipoDeGolpe[] = ['entrada', 'seguida', 'cierre', 'empellon', 'replica'];
  const cubiertos = new Set<IdDeSonido>(['aire', 'impacto', 'estampado', 'esquirla', 'bala', ...RESTO.map(([id]) => id)]);
  const olvidados = IDS_DE_SONIDO.filter((id) => !cubiertos.has(id));
  return (
    <Seccion titulo="2 · Golpes en tres capas, cristal y estampado" nota="Aire al pulsar, impacto con el veredicto y cuerpo del que lo recibe. Los que tienen sitio salen de la fuente del plano.">
      <h3>Aire (al pulsar)</h3>
      <div className="bq-fila">
        {golpes.map((g) => (
          <Boton key={g} alPulsar={() => sonido.sonar('aire', { golpe: g })}>
            {g}
          </Boton>
        ))}
      </div>
      <h3>Impacto (con el veredicto)</h3>
      <div className="bq-fila">
        {golpes.map((g) => (
          <Boton key={g} tono="ambar" alPulsar={() => sonido.sonar('impacto', { golpe: g, posicion: props.fuente, aCompas })}>
            {g}
          </Boton>
        ))}
        <Boton tono="gris" activo={aCompas} alPulsar={() => ponerACompas(!aCompas)}>
          {aCompas ? 'A compás (afinado)' : 'Sin compás'}
        </Boton>
      </div>
      <h3>Tanda y estampado</h3>
      <div className="bq-fila">
        <Boton tono="magenta" alPulsar={() => tanda(props.fuente)}>
          Tanda completa + estampado
        </Boton>
        {(['chapa', 'cristal', 'piedra'] as const).map((material) => (
          <Boton key={material} tono="ambar" alPulsar={() => sonido.sonar('estampado', { material, posicion: props.fuente })}>
            Estampado contra {material}
          </Boton>
        ))}
      </div>
      <h3>El resto</h3>
      <div className="bq-fila">
        {RESTO.map(([id, nombre]) => (
          <Boton key={id} tono="gris" alPulsar={() => sonido.sonar(id, { posicion: props.fuente })}>
            {nombre}
          </Boton>
        ))}
        <Boton tono="gris" alPulsar={bala}>
          Bala que cruza
        </Boton>
        <Boton
          tono="ambar"
          alPulsar={() => {
            sonido.sonar('esquirla', { cuenta: esquirla });
            ponerEsquirla((n) => (n % 12) + 1);
          }}
        >
          Esquirla {esquirla} de 12
        </Boton>
      </div>
      {olvidados.length > 0 ? <p className="bq-aviso">Sin botón: {olvidados.join(', ')}</p> : null}
    </Seccion>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El Remanso
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * La curva de la presentación del diseño (§4.4): ×0,3 durante 0,45 s y ×1,6 hasta recuperar, en total
 * ~1 s. La intensidad del Remanso sube en 60 ms, se queda 0,45 s y baja en medio segundo.
 */
function remansar(): void {
  const t0 = performance.now();
  const cuadro = (): void => {
    const t = performance.now() - t0;
    const x = t < 60 ? t / 60 : t < 510 ? 1 : t < 1010 ? 1 - (t - 510) / 500 : 0;
    sonido.remanso(x);
    if (t < 1010) requestAnimationFrame(cuadro);
  };
  requestAnimationFrame(cuadro);
}

function SeccionRemanso(): JSX.Element {
  const [manual, ponerManual] = useState(0);
  return (
    <Seccion titulo="3 · El Remanso" nota="Paso bajo a 800 Hz, el mundo una octava abajo y el latido. El silbido, las balas y la cabina NO cambian: van por el camino claro. Pon la lluvia y la música para oírlo.">
      <div className="bq-fila">
        <Boton
          tono="magenta"
          alPulsar={() => {
            sonido.sonar('quiebro-limpio', {});
            remansar();
          }}
        >
          Quiebro limpio + Remanso
        </Boton>
      </div>
      <Deslizador
        etiqueta="Remanso a mano"
        valor={manual}
        min={0}
        max={1}
        paso={0.01}
        alCambiar={(v) => {
          ponerManual(v);
          sonido.remanso(v);
        }}
      />
    </Seccion>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// La cabina y el Bis
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

function SeccionCabina(props: { fuente: Punto3 }): JSX.Element {
  const [sonando, ponerSonando] = useState(false);
  const [metros, ponerMetros] = useState(150);
  const donde = (m: number): Punto3 => {
    const d = Math.hypot(props.fuente.x, props.fuente.z);
    const dx = d < 0.1 ? 0 : props.fuente.x / d;
    const dz = d < 0.1 ? -1 : props.fuente.z / d;
    return { x: dx * m, y: 2, z: dz * m };
  };
  useEffect(() => {
    if (sonando) sonido.cabina(donde(metros));
  }, [metros, props.fuente, sonando]);
  return (
    <Seccion titulo="4 · La cabina" nota="Timbre de teléfono antiguo en la cadencia española (1,5 s sonando, 3 callando). Suena en la dirección de la fuente del plano, a la distancia que digas. Tiene que oírse a 150 m, incluso con aguacero.">
      <div className="bq-fila">
        <Boton
          tono="ambar"
          activo={sonando}
          alPulsar={() => {
            if (sonando) sonido.cabina(null);
            else sonido.cabina(donde(metros));
            ponerSonando(!sonando);
          }}
        >
          {sonando ? 'Callar la cabina' : 'Hacer sonar la cabina'}
        </Boton>
        <Boton
          tono="magenta"
          alPulsar={() => {
            sonido.cabina(null);
            ponerSonando(false);
            sonido.sonar('descolgar', {});
            setTimeout(() => sonido.sonar('salida', {}), 650);
          }}
        >
          Descolgar y salir
        </Boton>
      </div>
      <Deslizador etiqueta="Distancia" valor={metros} min={3} max={200} paso={1} unidad=" m" alCambiar={ponerMetros} />
    </Seccion>
  );
}

function SeccionBis(): JSX.Element {
  const [plan, ponerPlan] = useState<string>('');
  const farola = useRef<HTMLSpanElement | null>(null);
  return (
    <Seccion titulo="5 · El Bis" nota="Suenan las palomas y la farola, y ese segundo de ambiente se repite dos veces como una cinta que tartamudea. La bombilla parpadea en cada repetición con los tiempos que devuelve el sonido: así lo cuadrará el cliente.">
      <div className="bq-fila">
        <Boton
          tono="magenta"
          alPulsar={() => {
            const p = sonido.bis(2);
            if (p === null) {
              ponerPlan('no se pudo: el audio no corre o ya hay un Bis sonando');
              return;
            }
            const ahora = performance.now();
            ponerPlan(`graba desde ${redondo(p.capturaMs - ahora)} ms · repite en ${p.iniciosMs.map((t) => redondo(t - ahora)).join(' y ')} ms · acaba en ${redondo(p.finMs - ahora)} ms`);
            for (const t of [p.capturaMs, ...p.iniciosMs]) {
              setTimeout(() => {
                const el = farola.current;
                if (el === null) return;
                el.classList.remove('bq-parpadeo');
                void el.offsetWidth;
                el.classList.add('bq-parpadeo');
              }, Math.max(0, t - ahora + 100));
            }
          }}
        >
          Bis
        </Boton>
        <span ref={farola} className="bq-farola" aria-hidden="true" />
        <span className="bq-nota">{plan}</span>
      </div>
    </Seccion>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Lluvia y ciudad
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

function SeccionCiudad(): JSX.Element {
  const [tiempo, ponerTiempo] = useState<TiempoDeLaNoche>('seca');
  const [techo, ponerTecho] = useState(0);
  const [ciudad, ponerCiudad] = useState(0);
  const [pasos, ponerPasos] = useState<'quieto' | 'andar' | 'correr'>('quieto');
  useEffect(() => {
    sonido.ambiente({ tiempo, bajoTecho: techo, ciudad });
  }, [tiempo, techo, ciudad]);
  useEffect(() => {
    if (pasos === 'quieto') return;
    let izquierdo = true;
    const cada = pasos === 'andar' ? 540 : 330;
    const t = setInterval(() => {
      izquierdo = !izquierdo;
      sonido.sonar('paso', { fuerza: pasos === 'andar' ? 0.5 : 1, posicion: { x: izquierdo ? -0.15 : 0.15, y: 0, z: 0.1 } });
    }, cada);
    return () => clearInterval(t);
  }, [pasos]);
  return (
    <Seccion titulo="6 · Lluvia y ciudad" nota="Siseo, gotas en los charcos, rumor grave y, bajo la marquesina, el golpeteo en la lona. El rumor del barrio trae farolas de sodio y algún coche lejano sobre mojado.">
      <div className="bq-fila">
        {(['seca', 'llovizna', 'aguacero', 'niebla'] as const).map((t) => (
          <Boton key={t} tono="cian" activo={tiempo === t} alPulsar={() => ponerTiempo(t)}>
            {t}
          </Boton>
        ))}
      </div>
      <Deslizador etiqueta="Bajo la marquesina" valor={techo} min={0} max={1} paso={0.01} alCambiar={ponerTecho} />
      <Deslizador etiqueta="Rumor de la ciudad" valor={ciudad} min={0} max={1} paso={0.01} alCambiar={ponerCiudad} />
      <div className="bq-fila">
        <Boton tono="ambar" alPulsar={() => sonido.tren({ x: -90, y: 8, z: -18 }, { x: 90, y: 8, z: -18 }, 7)}>
          Pasa el tren elevado
        </Boton>
        {(['quieto', 'andar', 'correr'] as const).map((p) => (
          <Boton key={p} tono="gris" activo={pasos === p} alPulsar={() => ponerPasos(p)}>
            {p === 'quieto' ? 'Quieto' : p === 'andar' ? 'Andar' : 'Correr'}
          </Boton>
        ))}
      </div>
    </Seccion>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// La música y la prueba de «a compás»
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

function SeccionMusica(): JSX.Element {
  const [modo, ponerModo] = useState<ModoDeLaMusica>('callada');
  const [racha, ponerRacha] = useState(0);
  const [desvios, ponerDesvios] = useState<number[]>([]);
  const punto = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    sonido.musica({ modo, racha });
  }, [modo, racha]);
  useEffect(() => {
    let vivo = true;
    const cuadro = (): void => {
      if (!vivo) return;
      const f = faseDelPulso(sonido.pulso(), performance.now());
      if (punto.current !== null) punto.current.style.opacity = f < 0.14 ? '1' : '0.15';
      requestAnimationFrame(cuadro);
    };
    requestAnimationFrame(cuadro);
    return () => {
      vivo = false;
    };
  }, []);
  const est = estadistica(desvios);
  const aCompas = desvios.filter((d) => Math.abs(d) <= 75).length;
  return (
    <Seccion titulo="7 · Música a 120 ppm" nota="Base (bajo, colchón y el tic-tac del reloj), percusión que entra con la racha (1, 3 y 6 limpios) y melodía en la Llamada. Los cambios de modo entran a compás y los de racha a pulso.">
      <div className="bq-fila">
        {(['callada', 'calma', 'combate', 'llamada'] as const).map((m) => (
          <Boton key={m} tono="cian" activo={modo === m} alPulsar={() => ponerModo(m)}>
            {m}
          </Boton>
        ))}
        <span ref={punto} className="bq-pulso" aria-hidden="true" />
      </div>
      <Deslizador etiqueta="Racha" valor={racha} min={0} max={10} paso={1} alCambiar={ponerRacha} />
      <h3>A compás</h3>
      <p className="bq-nota">Pulsa con el pulso. El punto late con el pulso tal como se OYE (latencia descontada).</p>
      <div className="bq-fila">
        <Boton tono="magenta" grande alPulsar={(t) => ponerDesvios((antes) => [...antes.slice(-39), desvioDelPulso(sonido.pulso(), t)])}>
          GOLPE
        </Boton>
        <Boton tono="gris" alPulsar={() => ponerDesvios([])}>
          Borrar
        </Boton>
        <span>
          {est.n} toques · media <b>{redondo(est.media)} ms</b> · desviación {redondo(est.desviacion)} ms · a compás (±75) {aCompas}/{est.n} · último{' '}
          {desvios.length === 0 ? '—' : `${redondo(desvios[desvios.length - 1] ?? Number.NaN)} ms`}
        </span>
      </div>
    </Seccion>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// La autoprueba
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Con `?autoprueba` en la dirección, la autoprueba arranca sola al cargar y deja el resultado en
 * `<html data-autoprueba="…">` (y el detalle en `data-autoprueba-detalle`). Es para correrla desde
 * fuera sin pulsar nada, y para que una recarga a mitad (el Vite de desarrollo recarga todas las
 * pestañas cuando otro banco estrena una dependencia) sólo la vuelva a empezar.
 */
const AUTOPRUEBA_AL_CARGAR = new URLSearchParams(window.location.search).has('autoprueba');

function publicar(resultados: readonly ResultadoDeLaAutoprueba[]): void {
  const raizHtml = document.documentElement;
  const rojos = resultados.map((r, i) => (r.bien ? null : i + 1)).filter((i): i is number => i !== null);
  raizHtml.dataset['autoprueba'] = rojos.length === 0 ? `verde ${resultados.length}/${resultados.length}` : `rojo ${rojos.join(',')}`;
  raizHtml.dataset['autopruebaDetalle'] = resultados.filter((r) => !r.bien).map((r) => `${r.nombre} :: ${r.detalle}`).join(' || ');
}

function SeccionAutoprueba(): JSX.Element {
  const [resultados, ponerResultados] = useState<ResultadoDeLaAutoprueba[]>([]);
  const [corriendo, ponerCorriendo] = useState(false);
  const bien = resultados.filter((r) => r.bien).length;
  const correr = useCallback((): void => {
    ponerCorriendo(true);
    ponerResultados([]);
    delete document.documentElement.dataset['autoprueba'];
    void correrLaAutoprueba((r) => ponerResultados((antes) => [...antes, r]))
      .then(publicar)
      .finally(() => ponerCorriendo(false));
  }, []);
  useEffect(() => {
    if (AUTOPRUEBA_AL_CARGAR) correr();
  }, [correr]);
  return (
    <Seccion
      titulo="Autoprueba (sin altavoz)"
      nota="Renderiza cada escena en una OfflineAudioContext con el mismo crearSonido() del juego y mide el búfer: que el silbido muere en su muestra, que la izquierda suena a la izquierda, que el Remanso no toca las señales, que el Bis repite lo que grabó…"
    >
      <div className="bq-fila">
        <Boton
          tono="cian"
          activo={corriendo}
          alPulsar={() => {
            if (!corriendo) correr();
          }}
        >
          {corriendo ? `Corriendo… ${resultados.length}/${CUANTAS_PRUEBAS}` : 'Correr la autoprueba'}
        </Boton>
        {resultados.length > 0 && !corriendo ? (
          <b className={bien === resultados.length ? 'bq-verde' : 'bq-rojo'}>
            {bien}/{resultados.length} en verde
          </b>
        ) : null}
      </div>
      <ul className="bq-resultados">
        {resultados.map((r) => (
          <li key={r.nombre} className={r.bien ? 'bq-verde' : 'bq-rojo'}>
            {r.bien ? '✔' : '✗'} {r.nombre} <span className="bq-nota">— {r.detalle}</span>
          </li>
        ))}
      </ul>
    </Seccion>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// La página
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

function Banco(): JSX.Element {
  const [fuente, ponerFuente] = useState<Punto3>({ x: -3, y: 1.7, z: -3 });
  const [rumbo, ponerRumbo] = useState(0);
  useEffect(() => {
    const a = (rumbo * Math.PI) / 180;
    sonido.oyente(OYENTE, { x: Math.sin(a), y: 0, z: -Math.cos(a) });
  }, [rumbo]);
  return (
    <main className="bq-pagina">
      <style>{CSS}</style>
      <Cabecera />
      <Plano fuente={fuente} alMover={ponerFuente} rumbo={rumbo} alGirar={ponerRumbo} />
      <SeccionAnillo fuente={fuente} />
      <SeccionGolpes fuente={fuente} />
      <SeccionRemanso />
      <SeccionCabina fuente={fuente} />
      <SeccionBis />
      <SeccionCiudad />
      <SeccionMusica />
      <SeccionAutoprueba />
    </main>
  );
}

const CSS = `
:root { color-scheme: dark; }
body { margin: 0; background: #06110f; color: #cfe9e3; font: 15px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; }
.bq-pagina { max-width: 1100px; margin: 0 auto; padding: 16px; display: grid; gap: 14px; }
.bq-cabecera, .bq-seccion, .bq-plano { background: #0b1c19; border: 1px solid #16352f; border-radius: 10px; padding: 14px 16px; }
.bq-titulo { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
h1 { font-size: 20px; margin: 0; color: #ffb347; letter-spacing: 0.02em; }
h2 { font-size: 16px; margin: 0 0 6px; color: #5fe0c8; }
h3 { font-size: 13px; margin: 12px 0 6px; color: #8fb8b0; text-transform: uppercase; letter-spacing: 0.06em; }
.bq-nota { color: #7fa39c; font-size: 13px; margin: 4px 0 8px; }
.bq-aviso { color: #ffcf8a; font-size: 13px; }
.bq-fila { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 6px 0; }
.bq-boton { border-radius: 8px; border: 1px solid; padding: 8px 12px; font: inherit; font-size: 14px; cursor: pointer; background: transparent; touch-action: manipulation; user-select: none; }
.bq-boton:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.bq-cian { color: #5fe0c8; border-color: #2c6b60; }
.bq-ambar { color: #ffb347; border-color: #7a5424; }
.bq-magenta { color: #ff5fae; border-color: #7a2a55; }
.bq-gris { color: #b6cbc6; border-color: #33504a; }
.bq-activo { background: #16352f; }
.bq-grande { font-size: 18px; font-weight: 700; padding: 14px 22px; letter-spacing: 0.08em; }
.bq-estado { font-size: 12px; padding: 3px 9px; border-radius: 99px; border: 1px solid #33504a; }
.bq-estado-corriendo { color: #06110f; background: #5fe0c8; border-color: #5fe0c8; }
.bq-estado-bloqueado, .bq-estado-suspendido, .bq-estado-interrumpido { color: #06110f; background: #ffb347; border-color: #ffb347; }
.bq-estado-sin-audio, .bq-estado-cerrado { color: #fff; background: #7a2a55; }
.bq-volumenes { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 4px 16px; margin-top: 8px; }
.bq-deslizador { display: grid; gap: 2px; font-size: 13px; margin: 6px 0; }
.bq-deslizador input { width: 100%; accent-color: #ffb347; }
.bq-diagnostico { font: 12px ui-monospace, monospace; color: #7fa39c; margin: 8px 0 0; }
.bq-selector { display: inline-flex; gap: 6px; align-items: center; font-size: 13px; }
.bq-selector select { background: #0b1c19; color: #cfe9e3; border: 1px solid #33504a; border-radius: 6px; padding: 4px; }
.bq-plano { display: grid; grid-template-columns: minmax(0, 300px) 1fr; gap: 16px; align-items: start; }
.bq-plano canvas { width: 100%; max-width: 300px; aspect-ratio: 1; border-radius: 8px; touch-action: none; cursor: crosshair; }
.bq-quiebro { display: grid; grid-template-columns: 240px 1fr; gap: 16px; align-items: start; }
.bq-diana { position: relative; height: 220px; display: grid; place-items: center; }
.bq-aro { position: absolute; width: 90px; height: 90px; border-radius: 50%; border: 3px solid #ffb347; opacity: 0; pointer-events: none; }
.bq-tabla ol { margin: 6px 0 0; padding-left: 20px; font: 13px ui-monospace, monospace; }
.bq-veredicto-limpio { color: #5fe0c8; }
.bq-veredicto-esquivado { color: #ffcf8a; }
.bq-veredicto-golpe, .bq-veredicto-sin-quiebro { color: #ff5fae; }
.bq-pulso, .bq-farola { display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: #ffb347; box-shadow: 0 0 12px #ffb347; opacity: 0.15; }
.bq-farola { background: #ffcf6a; }
.bq-parpadeo { animation: bq-parpadeo 1s linear; }
@keyframes bq-parpadeo { 0%, 20% { opacity: 1; } 21%, 40% { opacity: 0.15; } 41%, 60% { opacity: 1; } 61%, 100% { opacity: 0.15; } }
.bq-resultados { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 4px; font-size: 14px; }
.bq-verde { color: #5fe0c8; }
.bq-rojo { color: #ff5fae; }
@media (max-width: 640px) {
  .bq-plano, .bq-quiebro { grid-template-columns: 1fr; }
  .bq-pagina { padding: 10px; }
}
`;

const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('Falta el <div id="raiz"> de banco-quiebro-sonido.html');
const arbol = createRoot(raiz);
arbol.render(<Banco />);

/*
 * En desarrollo, Vite vuelve a ejecutar este módulo cada vez que se toca un fichero del sonido. Sin
 * esto, cada vez quedaría un `AudioContext` vivo más sonando por debajo (el navegador deja pocos) y
 * React se quejaría de un segundo `createRoot` en el mismo nodo. Los tipos de `import.meta.hot` no
 * están en este paquete (no carga `vite/client`), así que se declaran aquí, estrechos.
 */
const caliente = (import.meta as ImportMeta & { hot?: { dispose(limpiar: () => void): void } }).hot;
caliente?.dispose(() => {
  arbol.unmount();
  sonido.destruir();
});
