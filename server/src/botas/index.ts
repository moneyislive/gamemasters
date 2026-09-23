/**
 * EL CANAL DE BOOTS ON BOARD, MONTADO: la mesa de verdad, los mundos de verdad y el reloj de
 * pared, y lo poco que el resto del servidor le pregunta.
 *
 * `canal.ts` no sabe de dónde salen las mesas ni qué hora es: se lo dan. Aquí se le da lo de
 * verdad —`quienEsLaLlave`, `revisionDe` y `mirar` de `arcade/mesas.ts`, los tres SIN LLAVE, como
 * quien mira sin asiento, y `mundoDeLaMesa` de `shared/arcade/juegos/mundos.ts`— y se deja a mano
 * de `index.ts` y de las rutas:
 *
 *   · `darDeAltaLosQueSeRecorren`, que registra en `admiteBotas` los arcades con mundo declarado.
 *   · `montarElCanalDeBotas`, que lo enchufa al servidor HTTP y a la despedida.
 *   · `cerrarLaMesaDeBotas`, para los dos ganchos de la mesa (cerrada, olvidada).
 *   · `diagnosticoDeBotas`, para `/api/arcade/diagnostico`.
 *
 * ═══ ANCLADO AL ÁMBITO GLOBAL, COMO LAS OTRAS TABLAS DEL PROCESO ═══
 *
 * El canal montado es UNO por proceso y lo leen dos sitios —las rutas, para el diagnóstico, y
 * `index.ts`, que lo monta—. Si este módulo se cargara dos veces, con una variable de módulo cada
 * copia vería su canal: el diagnóstico diría «cero salas» con gente andando. Es la misma razón de
 * `Symbol.for` en `arcade/modalidades.ts` y en `shared/arcade/index.ts`.
 */
import type { Server } from 'node:http';
import { arcadesInstalados } from '../../../shared/arcade';
import { mundoDeLaMesa, sePuedeRecorrer } from '../../../shared/arcade/juegos/mundos';
import { MesaDesconocida, mirar, ponerLaDespedida, quienEsLaLlave, revisionDe } from '../arcade/mesas';
import { admiteBotas, admitirBotas } from '../arcade/modalidades';
import type { ContextoDelCors } from '../puerta/origenes';
import { meterElBotinDeVerdad } from './botin';
import { CanalDeBotas, cuentasVacias } from './canal';
import type { DiagnosticoDeBotas, LaMesa, LosMundos, Reloj } from './canal';
import { enchufarElCanal } from './enchufe';

const LLAVE = Symbol.for('gamemasters.botas.canal');
const global_ = globalThis as unknown as Record<symbol, CanalDeBotas | undefined>;

/** El reloj de pared. Los temporizadores no retienen el proceso: lo retiene el servidor HTTP. */
export const RELOJ_DE_PARED: Reloj = {
  ahora: () => Date.now(),
  cada: (ms, hacer) => {
    const t = setInterval(hacer, ms);
    t.unref();
    return { parar: () => clearInterval(t) };
  },
  dentroDe: (ms, hacer) => {
    const t = setTimeout(hacer, ms);
    t.unref();
    return { parar: () => clearTimeout(t) };
  },
};

/** «No existe» es `null`; cualquier otro fallo sube. */
async function oNulo<T>(hacer: () => Promise<T>): Promise<T | null> {
  try {
    return await hacer();
  } catch (error) {
    if (error instanceof MesaDesconocida) return null;
    throw error;
  }
}

/** La mesa de verdad, leída como la lee un espectador: sin llave, sin presencia, sin escribir de más. */
export const LA_MESA_DE_VERDAD: LaMesa = {
  quienEsLaLlave: async (codigo, llave) => {
    const a = await quienEsLaLlave(codigo, llave);
    return a === null ? null : { id: a.id, modalidad: a.modalidad };
  },
  revision: (codigo) => oNulo(() => revisionDe(codigo, null)),
  vista: (codigo) =>
    oNulo(async () => {
      const v = await mirar(codigo, null);
      return {
        arcade: v.arcade,
        rev: v.rev,
        terminada: v.terminada,
        asientos: v.asientos.map((a) => a.id),
        vista: v.vista,
      };
    }),
  /* La única que escribe: el botín de la refriega, por la vía interna de la mesa (`botin.ts`). */
  botin: meterElBotinDeVerdad,
};

/** Los mundos de verdad: los del registro de `shared/arcade/juegos/mundos.ts`. */
export const LOS_MUNDOS_DE_VERDAD: LosMundos = { sePuedeRecorrer, mundoDeLaMesa };

/**
 * DA DE ALTA EN `admiteBotas` CADA ARCADE INSTALADO QUE SE PUEDE RECORRER, y devuelve cuáles.
 *
 * Se llama al arrancar, antes de escuchar. Un arcade se recorre si y sólo si alguien escribió el
 * productor de su mundo (`mundos.ts`), así que abrir una mesa `botas` de uno sin mundo sigue
 * siendo un 400: la mesa se abriría y nadie podría bajar a ella.
 */
export function darDeAltaLosQueSeRecorren(): string[] {
  const dados: string[] = [];
  for (const m of arcadesInstalados()) {
    if (!sePuedeRecorrer(m.id)) continue;
    admitirBotas(m.id);
    dados.push(m.id);
  }
  return dados;
}

/**
 * ¿SE PUEDE BAJAR AL TABLERO DE ESTE ARCADE, EN ESTE SERVIDOR? Lo que publica el catálogo.
 *
 * Las dos cosas a la vez: que la mesa admita la modalidad (`admiteBotas`, que es lo que mira
 * `abrir`) y que haya mundo que recorrer (`sePuedeRecorrer`, que es lo que mira el canal al
 * entrar). Con el alta del arranque son lo mismo; si un día dejaran de serlo, el catálogo no
 * ofrecería una mesa en la que luego no se puede entrar.
 */
export function seRecorreAqui(arcade: string): boolean {
  return admiteBotas(arcade) && sePuedeRecorrer(arcade);
}

/**
 * MONTA EL CANAL: lo crea con lo de verdad, lo enchufa al servidor HTTP y a la despedida.
 *
 * La despedida es la que ya había en `arcade/mesas.ts` (volcar las mesas al recibir `SIGTERM` y
 * volver a mandarse la señal): se le añade, antes de mandarse la señal, cerrar todos los canales
 * con 1001 —«el servidor se va»—, para que el aparato sepa que tiene que volver a entrar y no lo
 * confunda con una red que se ha caído. Va aquí y no en `index.ts` para que montar el canal y su
 * despedida sean una sola cosa: un canal montado sin despedida es la red que alguien se olvida de
 * encender.
 *
 * `terminar` es lo que se hace DESPUÉS de cerrar los canales, y por defecto es lo mismo que hacía
 * la despedida de `mesas.ts`: volver a mandarse la señal. Es una costura de prueba con la misma
 * razón que `ponerLaDespedida` —la de verdad mata el proceso, y Windows no entrega `SIGTERM`, así
 * que la única forma de ejercitarla aquí es en proceso (`verify:sala-de-botas`)—; `index.ts` no la
 * pasa, y no hay variable de entorno que la toque.
 */
export function montarElCanalDeBotas(
  servidor: Server,
  contexto: ContextoDelCors,
  terminar: (senal: NodeJS.Signals) => void = (senal) => {
    process.kill(process.pid, senal);
  },
): CanalDeBotas {
  const canal = new CanalDeBotas({ reloj: RELOJ_DE_PARED, mesa: LA_MESA_DE_VERDAD, mundos: LOS_MUNDOS_DE_VERDAD });
  enchufarElCanal(servidor, canal, contexto);
  global_[LLAVE] = canal;
  ponerLaDespedida((senal) => {
    try {
      canal.apagar();
    } finally {
      terminar(senal);
    }
  });
  return canal;
}

/** El canal montado en este proceso, si lo hay. */
export function elCanalDeBotas(): CanalDeBotas | undefined {
  return global_[LLAVE];
}

/** La mesa se ha cerrado o se ha olvidado: fuera todos los que andan por ella. */
export function cerrarLaMesaDeBotas(codigo: string, motivo: string): void {
  elCanalDeBotas()?.cerrarLaMesa(codigo, motivo);
}

/**
 * Lo que sale en `/api/arcade/diagnostico`. Sin canal montado —las pruebas que montan las rutas
 * sin arrancar el servidor—, ceros, el temporizador parado y `montado: false`, con la MISMA forma:
 * quien lo lea no tiene que distinguir dos respuestas.
 */
export function diagnosticoDeBotas(): DiagnosticoDeBotas & { montado: boolean } {
  const canal = elCanalDeBotas();
  return canal === undefined ? { montado: false, ...cuentasVacias() } : { montado: true, ...canal.diagnostico() };
}
