/**
 * EL CANAL DE LA LIZA DESDE EL APARATO: abrir, decir `hola`, medir con `eco`, reconectar y saber
 * cuándo NO reconectar.
 *
 * ═══ LO QUE PASA AL ABRIR, EN ESTE ORDEN ═══
 *
 *   1. Se abre el WebSocket en `rutaDeLaLiza(codigo)` del servidor de la mesa. La llave NO va en la URL
 *      (las URL acaban en registros y cabeceras); va en el primer mensaje.
 *   2. Al abrirse nace el RELOJ DEL CANAL (`reloj.ts`): su origen es el `performance.now()` de ahora, y
 *      todo instante que se mande a partir de aquí cuenta desde él.
 *   3. `hola {v, llave, c}` con `c` el reloj del canal, y JUSTO DETRÁS el primer `eco`: la sala tiene
 *      el desfase del `hola` y la ida y vuelta del ping de `ws`, y el eco lo afina enseguida (lo pide el
 *      protocolo: sin desfase, el anillo de un anuncio se cerraría en un reloj que no es el mío).
 *   4. Un `eco` cada `ECO_CADA_MS` mientras siga abierto. Es también lo que mantiene vivo a quien no
 *      tiene cuerpo: sin ningún mensaje en `SILENCIO_HASTA_CERRAR_MS`, la sala cierra.
 *
 * ═══ CUÁNDO SE VUELVE A INTENTAR, Y CUÁNDO NO ═══
 *
 * Un canal que se cae se vuelve a abrir con una espera que crece (medio segundo, uno, dos… hasta
 * `ESPERA_MAXIMA_MS`, con un poco de azar para que seis aparatos no llamen a la vez tras un despliegue:
 * el 1001 de un despliegue es precisamente el caso que más se repite). La espera vuelve a empezar en
 * cuanto la sala dice `dentro`. `llena` (la ciudad está llena) espera un minuto, que es lo que dice su
 * texto.
 *
 * NO se reintenta cuando reintentar no puede arreglar nada, y reintentar sólo gastaría el limitador:
 * `llaveMala` (esa llave no es de esta mesa), `reemplazado` (otra pestaña con mi asiento manda ahora),
 * `mesaCerrada`, `versionVieja` (hay que actualizar) y `mesaQueNo` (la mesa no existe o su juego no se
 * lidia). Esos dejan el canal en `fuera` con su motivo, y quien lo usa decide (`Partida` vuelve a abrir
 * con una vista nueva si la mesa cambió de fase).
 *
 * El enchufe se FABRICA fuera (`FabricaDeEnchufes`) y los relojes también: así esto se prueba en Node
 * con un enchufe de mentira y un reloj que avanza a mano.
 */
import {
  CIERRE_DE_LA_LIZA,
  ECO_CADA_MS,
  VERSION_DE_LA_LIZA,
  leerMensajeDeLaSala,
  rutaDeLaLiza,
  textoDelAparato,
} from '../../../../shared/mecanicas/liza/protocolo';
import type { MensajeDeLaSala, MensajeDelAparato } from '../../../../shared/mecanicas/liza/protocolo';
import { RelojDelCanal } from './reloj';

/** Lo poco del `WebSocket` del navegador que hace falta. */
export interface Enchufe {
  readonly readyState: number;
  send(texto: string): void;
  close(codigo?: number, motivo?: string): void;
  onopen: ((e: unknown) => void) | null;
  onmessage: ((e: { readonly data: unknown }) => void) | null;
  onclose: ((e: { readonly code: number; readonly reason: string }) => void) | null;
  onerror: ((e: unknown) => void) | null;
}

export type FabricaDeEnchufes = (direccion: string) => Enchufe;

/** Los relojes que usa el canal: el de `performance.now()` y los temporizadores. */
export interface Relojes {
  ahora(): number;
  despues(ms: number, hacer: () => void): unknown;
  cancelar(asa: unknown): void;
  /** 0..1, para la espera con azar. */
  azar(): number;
}

/** El estado del canal, para quien lo pinta. */
export type EstadoDelCanal =
  /** Aún no se ha pedido abrir, o se cerró a propósito. */
  | { readonly tipo: 'cerrado' }
  /** Abriendo, o abierto y esperando el `dentro`. */
  | { readonly tipo: 'abriendo'; readonly intento: number }
  | { readonly tipo: 'dentro' }
  /** Se cayó y vuelve a intentarlo en `enMs` (ms de `performance.now()`). */
  | { readonly tipo: 'esperando'; readonly enMs: number; readonly intento: number; readonly porque: number }
  /** Cerrado por la sala con un motivo que no se arregla reintentando. */
  | { readonly tipo: 'fuera'; readonly codigo: number; readonly motivo: string };

/** Espera tras el primer fallo, y la mayor. */
export const PRIMERA_ESPERA_MS = 500;
export const ESPERA_MAXIMA_MS = 15000;
/** `llena`: «prueba en un minuto». */
export const ESPERA_SI_LLENA_MS = 60000;

/** Los cierres tras los que NO se vuelve a intentar solo. */
export const CIERRES_SIN_VUELTA: readonly number[] = [
  CIERRE_DE_LA_LIZA.llaveMala,
  CIERRE_DE_LA_LIZA.reemplazado,
  CIERRE_DE_LA_LIZA.mesaCerrada,
  CIERRE_DE_LA_LIZA.versionVieja,
  CIERRE_DE_LA_LIZA.mesaQueNo,
];

/** La espera antes del intento número `intento` (1 el primero tras caer), sin azar. */
export function esperaDelIntento(intento: number, codigo: number): number {
  if (codigo === CIERRE_DE_LA_LIZA.llena) return ESPERA_SI_LLENA_MS;
  const n = Math.max(1, Math.floor(intento));
  return Math.min(ESPERA_MAXIMA_MS, PRIMERA_ESPERA_MS * 2 ** (n - 1));
}

/**
 * La dirección del canal: `servidor` es el origen de la API (`https://…`) o `''` si es el del documento;
 * `origenDelDocumento` es `location.origin` (se pasa para que esto no lea `location`).
 */
export function direccionDeLaLiza(servidor: string, origenDelDocumento: string, codigo: string): string {
  const base = servidor === '' ? origenDelDocumento : servidor;
  return base.replace(/^http/, 'ws') + rutaDeLaLiza(codigo);
}

export interface OpcionesDelCanal {
  readonly direccion: string;
  readonly llave: string;
  readonly fabrica: FabricaDeEnchufes;
  readonly relojes: Relojes;
  /** Cada mensaje bien leído de la sala, con el reloj del canal en que llegó. */
  readonly alMensaje: (m: MensajeDeLaSala, reloj: RelojDelCanal) => void;
  /** Cada cambio de estado. */
  readonly alCambiar?: (e: EstadoDelCanal) => void;
  /** Un canal nuevo acaba de abrirse (un reloj nuevo): quien lo usa tira lo que dependía del viejo. */
  readonly alAbrir?: (reloj: RelojDelCanal) => void;
}

const ABIERTO = 1;

export class CanalDeLaLiza {
  private enchufe: Enchufe | null = null;
  private relojActual: RelojDelCanal | null = null;
  private estadoActual: EstadoDelCanal = { tipo: 'cerrado' };
  private intento = 0;
  private asaDelEco: unknown = null;
  private asaDelReintento: unknown = null;
  /** Lo que se ha tirado por mal formado (para el diagnóstico: una sala que habla otro idioma). */
  descartados = 0;

  constructor(private readonly o: OpcionesDelCanal) {}

  estado(): EstadoDelCanal {
    return this.estadoActual;
  }

  /** El reloj del canal abierto, o `null`. */
  reloj(): RelojDelCanal | null {
    return this.relojActual;
  }

  /** ¿Se puede mandar ahora? (abierto y con `dentro`). */
  dentro(): boolean {
    return this.estadoActual.tipo === 'dentro' && this.enchufe !== null && this.enchufe.readyState === ABIERTO;
  }

  /** Abre si no está abierto ni esperando. Tras un `fuera`, abre otra vez (quien llama sabe por qué). */
  abrir(): void {
    const t = this.estadoActual.tipo;
    if (t === 'abriendo' || t === 'dentro' || t === 'esperando') return;
    this.intento = 0;
    this.conectar();
  }

  /** Cierra a propósito y no vuelve a intentar. */
  cerrar(): void {
    this.pararTemporizadores();
    const e = this.enchufe;
    this.enchufe = null;
    this.relojActual = null;
    if (e !== null) {
      e.onopen = null;
      e.onmessage = null;
      e.onclose = null;
      e.onerror = null;
      try {
        e.close(1000, 'adios');
      } catch {
        /* Un enchufe que ya no se puede cerrar ya está cerrado. */
      }
    }
    this.cambiar({ tipo: 'cerrado' });
  }

  /** Manda un mensaje si se puede. Devuelve si salió. */
  enviar(m: MensajeDelAparato): boolean {
    const e = this.enchufe;
    if (e === null || e.readyState !== ABIERTO) return false;
    if (m.t !== 'hola' && m.t !== 'eco' && this.estadoActual.tipo !== 'dentro') return false;
    try {
      e.send(textoDelAparato(m));
      return true;
    } catch {
      return false;
    }
  }

  private cambiar(e: EstadoDelCanal): void {
    this.estadoActual = e;
    this.o.alCambiar?.(e);
  }

  private pararTemporizadores(): void {
    if (this.asaDelEco !== null) this.o.relojes.cancelar(this.asaDelEco);
    if (this.asaDelReintento !== null) this.o.relojes.cancelar(this.asaDelReintento);
    this.asaDelEco = null;
    this.asaDelReintento = null;
  }

  private conectar(): void {
    this.pararTemporizadores();
    this.intento += 1;
    this.cambiar({ tipo: 'abriendo', intento: this.intento });
    let e: Enchufe;
    try {
      e = this.o.fabrica(this.o.direccion);
    } catch {
      this.alCaer(1006);
      return;
    }
    this.enchufe = e;
    e.onopen = () => {
      if (this.enchufe !== e) return;
      const reloj = new RelojDelCanal(this.o.relojes.ahora());
      this.relojActual = reloj;
      this.o.alAbrir?.(reloj);
      const c = reloj.ms(this.o.relojes.ahora());
      this.enviar({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: this.o.llave, c: Math.max(0, c) });
      this.mandarEco();
    };
    e.onmessage = (ev) => {
      if (this.enchufe !== e || this.relojActual === null) return;
      if (typeof ev.data !== 'string') {
        this.descartados += 1;
        return;
      }
      const m = leerMensajeDeLaSala(ev.data);
      if (m === null) {
        this.descartados += 1;
        return;
      }
      if (m.t === 'dentro') {
        this.intento = 0;
        this.cambiar({ tipo: 'dentro' });
      }
      this.o.alMensaje(m, this.relojActual);
    };
    e.onclose = (ev) => {
      if (this.enchufe !== e) return;
      this.alCaer(ev.code, ev.reason);
    };
    e.onerror = () => {
      /* El `close` viene detrás, con su código: ahí se decide. */
    };
  }

  private mandarEco(): void {
    const reloj = this.relojActual;
    if (reloj === null) return;
    this.enviar({ t: 'eco', c: Math.max(0, reloj.ms(this.o.relojes.ahora())) });
    this.asaDelEco = this.o.relojes.despues(ECO_CADA_MS, () => {
      this.asaDelEco = null;
      this.mandarEco();
    });
  }

  private alCaer(codigo: number, motivo = ''): void {
    this.pararTemporizadores();
    const e = this.enchufe;
    this.enchufe = null;
    this.relojActual = null;
    if (e !== null) {
      e.onopen = null;
      e.onmessage = null;
      e.onclose = null;
      e.onerror = null;
    }
    if (CIERRES_SIN_VUELTA.indexOf(codigo) >= 0) {
      this.cambiar({ tipo: 'fuera', codigo, motivo });
      return;
    }
    /* `intento` es cuántos se han hecho desde el último `dentro` (0 si se cayó uno que estaba dentro). */
    const espera = esperaDelIntento(this.intento + 1, codigo);
    /* Hasta un cuarto más o menos, para que los aparatos de una mesa no llamen todos a la vez. */
    const conAzar = Math.round(espera * (0.75 + 0.5 * this.o.relojes.azar()));
    const enMs = this.o.relojes.ahora() + conAzar;
    this.cambiar({ tipo: 'esperando', enMs, intento: this.intento, porque: codigo });
    this.asaDelReintento = this.o.relojes.despues(conAzar, () => {
      this.asaDelReintento = null;
      this.conectar();
    });
  }
}
