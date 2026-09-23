/**
 * LAS CUOTAS DE CONEXIÓN DEL CANAL DE BOOTS ON BOARD: quién puede abrir un canal, cuántos a la vez
 * y a qué ritmo, decidido en la capa del `upgrade` —ANTES de `handleUpgrade`— para que una subida
 * negada no llegue a costar ni un `Conexion`.
 *
 * ═══ POR QUÉ AQUÍ Y NO EN EL LIMITADOR DE EXPRESS ═══
 *
 * El limitador de `puerta/limitador.ts` es middleware, y un `upgrade` NUNCA pasa por el middleware:
 * Node lo saca del flujo normal en cuanto hay un oyente de `upgrade` (ver `enchufe.ts`). Así que el
 * canal quedaba SIN NINGÚN tope: ni por procedencia ni global. Un revisor adversario abrió 3.000
 * canales SIN saludar desde un solo cliente en 714 ms, y la latencia de `GET /api/salud` pasó de
 * ~1 ms a ~55 ms (`scratchpad/revisor-canal/probe-inundacion.ts`). Es UN solo proceso de Node en
 * Render con TODAS las mesas dentro: sin tope, un cliente tumba la plataforma entera. Que las
 * conexiones sin `hola` se cierren a los `PLAZO_DEL_HOLA_MS` no bastaba —se reponen abriendo más—.
 *
 * ═══ LA PROCEDENCIA, CON LA MISMA DESCONFIANZA QUE EL LIMITADOR HTTP ═══
 *
 * De dónde llega una subida se calcula con `procedenciaDe` (el de `puerta/limitador.ts`) y con
 * `SALTOS_DE_CONFIANZA`, exactamente como el limitador HTTP: la inyecta `index.ts`, que es el único
 * que tiene el Express con su `trust proxy` montado (ver `configurarProcedencia`). Y se hereda su
 * regla de oro: cuando NO se puede saber de dónde llega cada petición —todo colapsa en el bucle
 * local, o el proxy no manda `X-Forwarded-For`—, la procedencia es `fiable: false` y entonces NO se
 * bloquea por procedencia. Bloquear ahí dejaría fuera a la casa entera, que es hacerle el trabajo
 * al intruso. En ese modo degradado sólo mandan los topes GLOBALES —que no distinguen a nadie— y
 * cada negativa se apunta en el diagnóstico con su motivo.
 *
 * ═══ LOS CUATRO TOPES ═══
 *
 *   1. GLOBAL de canales (`TOPE_GLOBAL_DE_CANALES`): el techo del proceso. 503 al pasarlo.
 *   2. GLOBAL de canales SIN SALUDAR (`TOPE_DE_CANALES_SIN_SALUDAR`), más estricto: los que aún no
 *      han dicho `hola`. Es la inundación del revisor —todos sin saludar— y por eso su tope es el
 *      que la para. 503.
 *   3. CONCURRENTES por procedencia (`CONCURRENTES_POR_PROCEDENCIA`): cuántos canales vivos aguanta
 *      una misma procedencia a la vez. 429.
 *   4. RITMO de subidas por procedencia (`SUBIDAS_POR_SEGUNDO` de media, `SUBIDAS_DE_GOLPE` de
 *      golpe): un cubo de fichas por procedencia. 429.
 *
 * El 503 es «el servicio está lleno, vuelve luego» (un tope global, no es culpa de quien llama); el
 * 429 es «tú estás haciendo demasiado» (un tope por procedencia). Los dos cierran limpio como
 * `negar`, con `Connection: close`.
 *
 * ═══ DE DÓNDE SALEN LOS NÚMEROS (Render starter, 512 MB, UN proceso, TODAS las mesas) ═══
 *
 * Medido con `medir:botas`: un aparato andando gasta ~1,75 kB/s de bajada; una sala de cinco ocupa
 * 335-360 kB de montón (o sea ~70 kB por canal en el peor caso, andando); 100 salas / 500 aparatos
 * son el 1,7 % de un núcleo. La instancia quiere MUCHOS usuarios.
 *
 *   · `TOPE_GLOBAL_DE_CANALES = 2000`. A ~70 kB por canal son ~140 MB de montón en el peor caso
 *     —todos andando— más los ~40 MB de base y la tabla de mesas: cabe en 512 MB con holgura. Y
 *     está MUY por encima de la concurrencia real (unos cientos de mesas a la vez, ≤6 asientos cada
 *     una): es el muro que habría parado los 3.000 del revisor, no el techo de una velada.
 *   · `TOPE_DE_CANALES_SIN_SALUDAR = 200`. Un aparato de verdad saluda en cuanto abre —el `hola`
 *     sale en su `onopen`, décimas de segundo—, así que casi nunca hay canales sin saludar a la
 *     vez. 200 A LA VEZ es una inundación. Es holgado para una reconexión en masa (un despliegue
 *     que devuelve cien aparatos juntos: cada uno pasa por «sin saludar» un instante) y letal para
 *     el ataque, que mantiene miles colgados sin saludar nunca.
 *   · `CONCURRENTES_POR_PROCEDENCIA = 64`. Una casa detrás de un mismo router: varios aparatos, y
 *     cada aparato un canal por mesa más los solapes de reconexión; una mesa tiene ≤6 asientos. 64
 *     le cabe a una casa llena o a una quedada, y para en seco a quien quiere acaparar desde una IP.
 *   · `SUBIDAS_POR_SEGUNDO = 8`, `SUBIDAS_DE_GOLPE = 24`. La reconexión del aparato empieza en 500
 *     ms y se dobla; una casa entera reconectando tras un corte es una ráfaga de decenas: 24 de
 *     golpe la absorbe, 8/s la sostiene. Un atacante a miles por segundo baja a 8.
 *
 * `PLAZO_DEL_HOLA_MS` (el contrato) bajó de 5 s a 3 s a la vez que esto: cuando la subida ya está
 * hecha, el `hola` es un solo marco; 3 s siguen sobrando, y así un canal sin saludar ocupa su hueco
 * la mitad de tiempo —que es lo que libera antes el tope (2) para las reconexiones de verdad—.
 *
 * ═══ EN MEMORIA, Y QUE NO CREZCA SIN FIN ═══
 *
 * Como el limitador HTTP, esto vive en memoria (la ventana dura segundos) y por el mismo motivo. El
 * mapa de concurrentes se limpia solo —una procedencia a cero se borra—; el de cubos se barre: los
 * llenos y viejos se tiran (vuelven a nacer llenos), y si aun así sobran, los más viejos, con el
 * mismo `MAXIMO_DE_PROCEDENCIAS` de tope que evita que rotar procedencias infle el mapa sin fin.
 */
import type { IncomingMessage } from 'node:http';
import { procedenciaDe } from '../puerta/limitador';
import type { Procedencia } from '../puerta/limitador';
import type { MotivoDeCuota } from './canal';

/* ─── LOS NÚMEROS (ver la cabecera para el porqué de cada uno) ────────────── */

/** El techo de canales vivos del proceso. Al pasarlo, 503. */
export const TOPE_GLOBAL_DE_CANALES = 2000;
/** El techo, más estricto, de canales que aún no han dicho `hola`. Al pasarlo, 503. */
export const TOPE_DE_CANALES_SIN_SALUDAR = 200;
/** Canales vivos a la vez desde una misma procedencia. Al pasarlo, 429. */
export const CONCURRENTES_POR_PROCEDENCIA = 64;
/** Subidas por segundo, de media, desde una misma procedencia. */
export const SUBIDAS_POR_SEGUNDO = 8;
/** Subidas de golpe (el tope del cubo) desde una misma procedencia. */
export const SUBIDAS_DE_GOLPE = 24;
/** Cuántas procedencias vivas se guardan como mucho, para que rotarlas no infle el mapa sin fin. */
export const MAXIMO_DE_PROCEDENCIAS = 20_000;
/** Cada cuánto se barre el mapa de cubos. Desatado del bucle de eventos (`unref`). */
const BARRIDO_MS = 60_000;

/* ─── LA PROCEDENCIA, INYECTADA POR `index.ts` ───────────────────────────── */

/**
 * De dónde llega una subida. Por defecto DESCONOCIDA —modo degradado, sólo mandan los topes
 * globales—, hasta que `index.ts` inyecta la de verdad con `configurarProcedencia`: es el único
 * que tiene el Express con su `trust proxy` montado, y sin él no se puede calcular `req.ips` como lo
 * calcula el limitador HTTP. Los comprobadores que enchufan el canal sin `index.ts` —una mesa de
 * mentira— caen en este seguro: no se bloquea a nadie por procedencia, que es lo correcto cuando no
 * se sabe de dónde llega cada quien.
 */
let calcularProcedencia: (req: IncomingMessage) => Procedencia = () => ({
  ip: 'desconocida',
  fiable: false,
  motivo: 'la capa de cuotas no tiene configurada la procedencia (falta `configurarProcedencia` en index.ts)',
});

/** Inyecta cómo se calcula la procedencia de una subida. Lo llama `index.ts` al arrancar. */
export function configurarProcedencia(fn: (req: IncomingMessage) => Procedencia): void {
  calcularProcedencia = fn;
}

/** La procedencia de una subida, con la función y la confianza que haya inyectado `index.ts`. */
export function procedenciaDeLaSubida(req: IncomingMessage): Procedencia {
  return calcularProcedencia(req);
}

/**
 * La procedencia de verdad, atada a un Express con su `trust proxy` puesto. La construye `index.ts`
 * y se la pasa a `configurarProcedencia`. Vive aquí, y no en `index.ts`, para que el «cómo se
 * calcula» esté junto a quien lo usa: `index.ts` sólo aporta el `app` con la confianza montada.
 *
 * ═══ POR QUÉ UN DELEGADO Y NO REHACER LA CUENTA ═══
 *
 * `procedenciaDe` lee `req.ips` y `req.ip`, que son propiedades que Express DERIVA de
 * `X-Forwarded-For` con la función de `trust proxy`. Un `upgrade` llega como `IncomingMessage`
 * crudo, sin esas propiedades. Rehacer la cuenta a mano —contar saltos, elegir el cliente— es
 * justo la clase de duplicado que en esta casa acaba divergiendo del original. Así que en vez de
 * copiarla se DELEGA: se crea un objeto cuyo prototipo es `app.request` (donde viven los getters de
 * Express) con las cabeceras y el `socket` de la subida, y `req.ips`/`req.ip` salen idénticos a los
 * de una petición normal, con la MISMA función de confianza. Medido: dos clientes tras el mismo
 * borde de Cloudflare salen con su propia dirección, y sin `X-Forwarded-For` sale `fiable: false`.
 */
export function delegandoEnExpress(app: { request: object }): (req: IncomingMessage) => Procedencia {
  return (req: IncomingMessage): Procedencia => {
    const espejo = Object.create(app.request) as {
      app: unknown;
      headers: IncomingMessage['headers'];
      socket: IncomingMessage['socket'];
    };
    espejo.app = app;
    espejo.headers = req.headers;
    espejo.socket = req.socket;
    return procedenciaDe(espejo as unknown as Parameters<typeof procedenciaDe>[0]);
  };
}

/* ─── EL VEREDICTO Y EL REGISTRO DE UN CANAL VIVO ────────────────────────── */

/** Una subida negada: con qué estado se cierra, el texto de la línea HTTP, y el motivo que se cuenta. */
export interface Veredicto {
  readonly estado: number;
  readonly texto: string;
  readonly motivo: MotivoDeCuota;
}

/**
 * Lo que se le devuelve a `enchufe.ts` por cada canal ADMITIDO: hay que decir cuándo saluda (para
 * soltar su hueco del tope de «sin saludar») y cuándo se va (para soltar el resto). Los dos son
 * idempotentes: `sale` puede llegar por el `close` del `ws` aunque ya hubiera saludado.
 */
export interface RegistroDeSubida {
  /** El canal ha dicho `hola`: deja de contar como «sin saludar». Una vez. */
  saludo(): void;
  /** El canal se ha ido: suelta su cuenta global, la de «sin saludar» si no llegó a saludar, y la de su procedencia. */
  sale(): void;
}

interface Cubo {
  fichas: number;
  en: number;
}

/**
 * EL GUARDIÁN DE LAS SUBIDAS. Uno por canal (lo crea `enchufe.ts`). Lleva la cuenta de canales
 * vivos —global, sin saludar y por procedencia— y el ritmo por procedencia, y decide en `admite`.
 */
export class CuotasDeSubida {
  private readonly topeGlobal: number;
  private readonly topeSinSaludar: number;
  private readonly concurrentes: number;
  private readonly porSegundo: number;
  private readonly deGolpe: number;
  private vivos = 0;
  private sinSaludar = 0;
  private readonly porProcedencia = new Map<string, number>();
  private readonly cubos = new Map<string, Cubo>();

  constructor(
    opciones: {
      topeGlobal?: number;
      topeSinSaludar?: number;
      concurrentes?: number;
      porSegundo?: number;
      deGolpe?: number;
    } = {},
  ) {
    this.topeGlobal = opciones.topeGlobal ?? TOPE_GLOBAL_DE_CANALES;
    this.topeSinSaludar = opciones.topeSinSaludar ?? TOPE_DE_CANALES_SIN_SALUDAR;
    this.concurrentes = opciones.concurrentes ?? CONCURRENTES_POR_PROCEDENCIA;
    this.porSegundo = opciones.porSegundo ?? SUBIDAS_POR_SEGUNDO;
    this.deGolpe = opciones.deGolpe ?? SUBIDAS_DE_GOLPE;
    // El barrido va desatado del bucle de eventos: una cuota no puede ser el motivo de que el
    // proceso no termine nunca. Igual que el limitador HTTP.
    setInterval(() => this.barrer(Date.now()), BARRIDO_MS).unref?.();
  }

  /**
   * ¿SE ADMITE UNA SUBIDA DE ESTA PROCEDENCIA? `null` si sí; el veredicto si no.
   *
   * El orden importa: primero los topes GLOBALES —valen para todos, incluida la procedencia
   * desconocida—, y sólo si la procedencia es fiable, los suyos. Consumir una ficha del ritmo es lo
   * ÚLTIMO y sólo si todo lo anterior pasó: una subida que se niega por concurrencia no debe gastar
   * también su ritmo.
   */
  admite(procedencia: Procedencia, ahora: number = Date.now()): Veredicto | null {
    if (this.vivos >= this.topeGlobal) {
      return { estado: 503, texto: 'Service Unavailable', motivo: 'global' };
    }
    if (this.sinSaludar >= this.topeSinSaludar) {
      return { estado: 503, texto: 'Service Unavailable', motivo: 'sinSaludar' };
    }
    /*
     * MODO DEGRADADO: si no se sabe de dónde llega, NO se bloquea por procedencia. Bloquear aquí
     * dejaría fuera a la casa entera cuando todo colapsa en una dirección (ver la cabecera y
     * `procedenciaDe`). Los topes globales de arriba siguen valiendo, y ya han decidido.
     */
    if (!procedencia.fiable) return null;
    if ((this.porProcedencia.get(procedencia.ip) ?? 0) >= this.concurrentes) {
      return { estado: 429, texto: 'Too Many Requests', motivo: 'concurrencia' };
    }
    if (!this.consumirFicha(procedencia.ip, ahora)) {
      return { estado: 429, texto: 'Too Many Requests', motivo: 'ritmo' };
    }
    return null;
  }

  /**
   * APUNTA UN CANAL ADMITIDO y devuelve con qué soltarlo. Cuenta como vivo y como «sin saludar»
   * hasta que salude o se vaya; y como uno más de su procedencia si es fiable.
   */
  entra(procedencia: Procedencia): RegistroDeSubida {
    this.vivos++;
    this.sinSaludar++;
    const ip = procedencia.fiable ? procedencia.ip : null;
    if (ip !== null) this.porProcedencia.set(ip, (this.porProcedencia.get(ip) ?? 0) + 1);
    let saludado = false;
    let salido = false;
    return {
      saludo: () => {
        if (saludado || salido) return;
        saludado = true;
        this.sinSaludar = Math.max(0, this.sinSaludar - 1);
      },
      sale: () => {
        if (salido) return;
        salido = true;
        this.vivos = Math.max(0, this.vivos - 1);
        if (!saludado) this.sinSaludar = Math.max(0, this.sinSaludar - 1);
        if (ip !== null) {
          const quedan = (this.porProcedencia.get(ip) ?? 0) - 1;
          if (quedan <= 0) this.porProcedencia.delete(ip);
          else this.porProcedencia.set(ip, quedan);
        }
      },
    };
  }

  /** Una ficha del cubo de esta procedencia, rellenado por el tiempo pasado. `false` si no había. */
  private consumirFicha(ip: string, ahora: number): boolean {
    const cubo = this.cubos.get(ip);
    if (cubo === undefined) {
      // Nace lleno y gasta una: la primera subida de una procedencia nunca se frena por ritmo.
      this.cubos.set(ip, { fichas: this.deGolpe - 1, en: ahora });
      if (this.cubos.size > MAXIMO_DE_PROCEDENCIAS) this.barrer(ahora, true);
      return true;
    }
    cubo.fichas = Math.min(this.deGolpe, cubo.fichas + ((ahora - cubo.en) * this.porSegundo) / 1000);
    cubo.en = ahora;
    if (cubo.fichas < 1) return false;
    cubo.fichas -= 1;
    return true;
  }

  /** Tira los cubos llenos (que vuelven a nacer llenos); si aun así sobran, los más viejos. */
  private barrer(ahora: number, forzado = false): void {
    for (const [ip, cubo] of this.cubos) {
      const lleno = Math.min(this.deGolpe, cubo.fichas + ((ahora - cubo.en) * this.porSegundo) / 1000) >= this.deGolpe;
      if (lleno) this.cubos.delete(ip);
    }
    if (!forzado || this.cubos.size <= MAXIMO_DE_PROCEDENCIAS) return;
    const porEdad = [...this.cubos.entries()].sort((a, b) => a[1].en - b[1].en);
    for (const [ip] of porEdad.slice(0, this.cubos.size - MAXIMO_DE_PROCEDENCIAS)) this.cubos.delete(ip);
  }

  /** Sólo para los comprobadores y el diagnóstico: cuántos vivos, sin saludar y procedencias vivas. */
  gauges(): { vivos: number; sinSaludar: number; procedencias: number } {
    return { vivos: this.vivos, sinSaludar: this.sinSaludar, procedencias: this.porProcedencia.size };
  }
}

/** Un guardián nuevo con los topes de producción (o los que se le pasen, para los comprobadores). */
export function crearCuotas(opciones?: ConstructorParameters<typeof CuotasDeSubida>[0]): CuotasDeSubida {
  return new CuotasDeSubida(opciones);
}
