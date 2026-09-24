/**
 * LA LIZA, MONTADA: la mesa de verdad, el registro de lizas de verdad, la sala pura de verdad y el reloj
 * del proceso, y lo poco que el resto del servidor le pregunta.
 *
 * `canal.ts` no sabe de dónde salen las mesas, qué juegos se lidian ni qué hora es: se lo dan. Aquí se le
 * da lo de verdad —`quienEsLaLlave`, `revisionDe`, `mirar` y `meterDeLaPlataforma` de `arcade/mesas.ts`;
 * `lizaDeLaMesa` del registro `shared/arcade/juegos/lizas.ts` (el servidor es el ÚNICO que lo importa);
 * `salaNueva` y `avanzarLaSala` de `shared/mecanicas/liza/sala.ts`— y se deja a mano de `index.ts`:
 *
 *   · `montarLaLiza`, la línea de montaje: el enchufe, el diagnóstico y la despedida.
 *   · `diagnosticoDeLaLiza`, por si un día lo quiere servir `/api/arcade/diagnostico`.
 *
 * ═══ LA MESA SE CARGA AL USARLA, COMO EN EL BOTÍN DE BOTAS ═══
 *
 * `arcade/mesas.ts` lee su carpeta —`MESAS_DIR`— en cuanto se carga. Si este módulo la importara arriba,
 * cualquier guion que lo cargara antes de poner la suya dejaría sus mesas de prueba en la carpeta de
 * datos del portátil (es la razón de `botas/botin.ts`, que hace lo mismo). Así que se pide con un
 * `import()` la primera vez que hace falta: en el servidor ya está cargada —`index.ts` la importa— y el
 * `import()` devuelve el mismo módulo sin cargar nada; en un comprobador, se carga cuando ya tiene su
 * carpeta.
 *
 * ═══ ANCLADO AL ÁMBITO GLOBAL, COMO EL CANAL DE BOTAS ═══
 *
 * El canal montado es UNO por proceso. Si este módulo se cargara dos veces —`tsx` lo hace con `shared/`
 * según el camino—, con una variable de módulo cada copia vería el suyo y el diagnóstico diría «cero
 * salas» con gente lidiando. Por eso `Symbol.for`.
 *
 * ═══ LA DESPEDIDA, ENCADENADA DELANTE DE LA DE LA MESA ═══
 *
 * Con `SIGTERM` (un despliegue) los canales se cierran con 1001 —«el servidor se va»—, para que el aparato
 * vuelva a entrar en vez de creerse sin red; la sala nueva, en el proceso siguiente, rehace la fase en
 * curso desde la mesa. Botas lo hace con `ponerLaDespedida` de `mesas.ts`, que guarda UNA función y no
 * deja leer la que había: poner aquí otra borraría la de botas, y `mesas.ts` es del núcleo sellado. Así
 * que la de la Liza se engancha como oyente de la señal con `prependOnceListener`: corre DELANTE del
 * oyente de `mesas.ts` —que vuelca las mesas, deja a botas cerrar lo suyo y se vuelve a mandar la señal—,
 * y como los dos son de una vez, la segunda señal ya no encuentra a nadie y termina el proceso como
 * siempre. Encadenada sin tocar la cadena de nadie. Windows no entrega `SIGTERM` a un proceso, así que
 * `verify:sala-de-la-liza` la emite en proceso, como `verify:sala-de-botas`.
 */
import type { Server } from 'node:http';
import { performance } from 'node:perf_hooks';
import { arcadesQueSeLidian, lizaDeLaMesa, sePuedeLidiar } from '../../../shared/arcade/juegos/lizas';
import type { VeredictoDeLaLiza } from '../../../shared/mecanicas/liza/declaracion';
import { rutaDeLaLiza } from '../../../shared/mecanicas/liza/protocolo';
import { avanzarLaSala, salaNueva } from '../../../shared/mecanicas/liza/sala';
import { elCanal } from '../canal';
import type { ContextoDelCors } from '../puerta/origenes';
import { CanalDeLaLiza, cuentasVacias } from './canal';
import type {
  DiagnosticoDeLaLiza,
  LaMesaDeLaLiza,
  LasLizas,
  LoQueFueDelVeredicto,
  MotorDeLaSala,
  OpcionesDelCanal,
  RelojDeLaLiza,
  Temporizador,
} from './canal';
import { RUTA_DEL_DIAGNOSTICO, servirElDiagnostico } from './diagnostico';
import { enchufarLaLiza } from './enchufe';

const LLAVE = Symbol.for('gamemasters.liza.canal');
const global_ = globalThis as unknown as Record<symbol, CanalDeLaLiza | undefined>;

/* ─── EL RELOJ DEL PROCESO ───────────────────────────────────────────────── */

/**
 * UN METRÓNOMO: `hacer` cada `ms`, contado desde que empezó y no desde la vuelta anterior.
 *
 * `setInterval` se rearma al acabar cada vuelta, así que se va quedando atrás lo que tarde el bucle en
 * atenderlo —un milisegundo aquí y allá—, y una sala que da sus pasos por el ancla (ver `canal.ts`)
 * acabaría con la vuelta pegada al borde de su ventana, dando dos pasos unas veces y ninguno otras. Así
 * cada vuelta apunta a su hora exacta: el retraso de una no se suma al de la siguiente. Si se queda atrás
 * más de una vuelta entera —el proceso estuvo parado—, no recupera las perdidas a ráfagas: la sala ya da
 * los pasos que le tocan, y un temporizador que se disparara cinco veces seguidas no añadiría nada.
 *
 * Desatado del bucle de eventos (`unref`), como el de botas: al proceso lo retiene el servidor HTTP, no
 * un temporizador. Y lo que lance una vuelta se dice y no para el metrónomo: fuera del `try`, llegaría a
 * `uncaughtException`, que en `index.ts` termina el proceso.
 */
function metronomo(ms: number, hacer: () => void): Temporizador {
  const origen = performance.now();
  let vuelta = 0;
  let parado = false;
  let pendiente: NodeJS.Timeout | null = null;
  const armar = (): void => {
    const ahora = performance.now();
    vuelta++;
    if (origen + vuelta * ms < ahora - ms) vuelta = Math.floor((ahora - origen) / ms) + 1;
    pendiente = setTimeout(latir, Math.max(0, origen + vuelta * ms - ahora));
    pendiente.unref();
  };
  const latir = (): void => {
    if (parado) return;
    try {
      hacer();
    } catch (error) {
      console.error('[liza] una vuelta del reloj ha fallado:', error instanceof Error ? error.message : String(error));
    }
    if (!parado) armar();
  };
  armar();
  return {
    parar: () => {
      parado = true;
      if (pendiente !== null) clearTimeout(pendiente);
    },
  };
}

/** El reloj de la Liza: monótono, en milisegundos con decimales. Ver `RelojDeLaLiza`. */
export const RELOJ_DE_LA_LIZA: RelojDeLaLiza = {
  ahora: () => performance.now(),
  cada: metronomo,
  dentroDe: (ms, hacer) => {
    const t = setTimeout(hacer, ms);
    t.unref();
    return { parar: () => clearTimeout(t) };
  },
};

/* ─── LA MESA DE VERDAD ──────────────────────────────────────────────────── */

/** La mesa de verdad, cargada la primera vez que hace falta: ver la cabecera. */
function laMesa(): Promise<typeof import('../arcade/mesas')> {
  return import('../arcade/mesas');
}

/** «No existe» es `null`; cualquier otro fallo sube. */
async function oNulo<T>(hacer: () => Promise<T>): Promise<T | null> {
  const { MesaDesconocida } = await laMesa();
  try {
    return await hacer();
  } catch (error) {
    if (error instanceof MesaDesconocida) return null;
    throw error;
  }
}

/**
 * UN VEREDICTO DE LA SALA, EN LA MESA DE VERDAD: por la vía interna (`meterDeLaPlataforma`, en nombre de
 * nadie y por la puerta de la plataforma), y avisando a los que sondean si la revisión subió, como hace
 * la ruta después de `mover` y el botín de botas (`botas/botin.ts`). Avisar es transporte y la mesa no
 * importa el canal de sondeo a propósito: por eso va aquí.
 */
export async function meterElVeredictoDeVerdad(codigo: string, veredicto: VeredictoDeLaLiza): Promise<LoQueFueDelVeredicto> {
  const { meterDeLaPlataforma } = await laMesa();
  const fue = await meterDeLaPlataforma(codigo, { tipo: veredicto.tipo, carga: veredicto.carga });
  if (fue.salida !== 'sinMesa' && fue.subio) {
    /* Envuelto: un aviso que falla no deshace un veredicto que ya entró y se guardó. */
    try {
      elCanal().avisarCambio(codigo);
    } catch (error) {
      console.error(`[liza] el veredicto ${veredicto.tipo} de la mesa ${codigo} entró y no se ha podido avisar a quien la mira:`, error);
    }
  }
  return fue.salida === 'rechazado' ? { salida: fue.salida, motivo: fue.motivo } : { salida: fue.salida };
}

/** La mesa de verdad, leída como la lee un espectador: sin llave, sin presencia. */
export const LA_MESA_DE_LA_LIZA: LaMesaDeLaLiza = {
  quienEsLaLlave: async (codigo, llave) => {
    const { quienEsLaLlave } = await laMesa();
    const a = await quienEsLaLlave(codigo, llave);
    return a === null ? null : a.id;
  },
  revision: (codigo) =>
    oNulo(async () => {
      const { revisionDe } = await laMesa();
      const r = await revisionDe(codigo, null);
      return { rev: r.rev, terminada: r.terminada };
    }),
  vista: (codigo) =>
    oNulo(async () => {
      const { mirar } = await laMesa();
      const v = await mirar(codigo, null);
      return { arcade: v.arcade, rev: v.rev, terminada: v.terminada, vista: v.vista };
    }),
  meter: meterElVeredictoDeVerdad,
};

/** Las lizas de verdad: las del registro de `shared/arcade/juegos/lizas.ts`. */
export const LAS_LIZAS_DE_VERDAD: LasLizas = { sePuedeLidiar, lizaDeLaMesa };

/** La sala pura de verdad. */
export const EL_MOTOR_DE_VERDAD: MotorDeLaSala = { salaNueva, avanzarLaSala };

/* ─── EL MONTAJE ─────────────────────────────────────────────────────────── */

/**
 * MONTA LA LIZA: el canal con lo de verdad, su enchufe en el `upgrade` del servidor HTTP, su diagnóstico
 * y su despedida. Es la línea de `index.ts`, junto a `montarElCanalDeBotas`.
 *
 * `cambiar` es para los comprobadores —otra sala, otro reloj—; `index.ts` no la pasa.
 */
export function montarLaLiza(servidor: Server, contexto: ContextoDelCors, cambiar: Partial<OpcionesDelCanal> = {}): CanalDeLaLiza {
  const canal = new CanalDeLaLiza({
    reloj: RELOJ_DE_LA_LIZA,
    mesa: LA_MESA_DE_LA_LIZA,
    lizas: LAS_LIZAS_DE_VERDAD,
    motor: EL_MOTOR_DE_VERDAD,
    ...cambiar,
  });
  enchufarLaLiza(servidor, canal, contexto);
  servirElDiagnostico(servidor, diagnosticoDeLaLiza);
  global_[LLAVE] = canal;
  const despedirse = (): void => {
    try {
      canal.apagar();
    } catch (error) {
      console.error('[liza] no se han podido cerrar los canales al despedirse:', error instanceof Error ? error.message : String(error));
    }
  };
  process.prependOnceListener('SIGTERM', despedirse);
  process.prependOnceListener('SIGINT', despedirse);
  const lidian = arcadesQueSeLidian();
  console.log(
    `[liza] canal en ${rutaDeLaLiza('CODIGO').replace('CODIGO', ':codigo')} y diagnóstico en ${RUTA_DEL_DIAGNOSTICO}; ` +
      (lidian.length > 0 ? `se lidia: ${lidian.join(', ')}` : 'ningún juego se lidia todavía'),
  );
  return canal;
}

/** El canal montado en este proceso, si lo hay. */
export function elCanalDeLaLiza(): CanalDeLaLiza | undefined {
  return global_[LLAVE];
}

/**
 * Lo que dice el diagnóstico. Sin canal montado, ceros y `montado: false`, con la MISMA forma: quien lo
 * lea no tiene que distinguir dos respuestas.
 */
export function diagnosticoDeLaLiza(): DiagnosticoDeLaLiza & { montado: boolean } {
  const canal = elCanalDeLaLiza();
  return canal === undefined ? { montado: false, ...cuentasVacias() } : { montado: true, ...canal.diagnostico() };
}
