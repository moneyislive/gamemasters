/**
 * EL RAYO QUE SUENA (EL-RAYO.md §5): un envoltorio de `sistema.rayo` que pone el sonido y DELEGA todo lo demás en el
 * que había (CONTRATO §5.8: quien prueba `escenificar.ts` cuelga un espía antes y tiene que seguir viendo cada
 * llamada, con los mismos argumentos y en el mismo orden).
 *
 *   · LA CARGA (`carga-rayo`): una voz larga por quien carga. No empieza en `empezarCarga` sino en la primera
 *     `actualizarCarga` en que ya se sabe a qué ritmo sube (la carga es lineal en el tiempo, `cargaDe`: con `c` y lo
 *     que va desde `desdeMs` sale lo que falta para el pleno). Si la carga dura más que la voz, se vuelve a pedir ya
 *     llena. Se corta con `parar()` al soltar, al cancelar o al vaciar la noche.
 *   · EL TIC Y EL «LISTO» (CONTRATO §5.1): sólo los del propio, dentro de `actualizarCarga`: el tic cuando cambia
 *     `estado.blanco` a otro cuerpo, y el «listo» la primera vez que `estado.c` llega a 1.
 *   · EL DISPARO: el chispazo (`rayo-corto`) en el nivel 1; en los demás el `rayo`, y desde media carga el `trueno`,
 *     que sale del canal (de la boca al destino) y llega con su retraso. El propio suena en el jugador (sin sitio), el
 *     ajeno desde su boca.
 *   · Un `estalla` sin disparo oído (su `bala` no llegó a verse) suena donde estalla.
 *
 * No asigna por fotograma: el estado de cada quien se crea la primera vez que carga, y lo que se mueve cada fotograma
 * (la voz de una carga ajena) usa su propio punto.
 */
import type { DisparoDelRayo, EfectosDelRayo, EstadoDelRayo, EstallidoDelRayo, PuntoDelRayo } from '../rayo/contrato';
import type { Punto3 } from './cuentas';
import type { IdDeSonido, ManejoDeSonido, OpcionesDeSonido } from './voces';

/** Lo único del sonido que usa el rayo (un `Sonido` lo cumple; un doble de prueba que devuelva `undefined`, también). */
export interface SonidoDelRayo {
  sonar(id: IdDeSonido, opciones?: OpcionesDeSonido): ManejoDeSonido | undefined;
}

/** Desde qué carga retumba el trueno: la misma media carga que chamusca el suelo (`efectos/rayo.ts`). */
export const CARGA_QUE_TRUENA = 0.5;
/** Lo que se pide de voz de carga cada vez (ms): al acabarse, si sigue cargando, se pide otra ya llena. */
export const VOZ_DE_LA_CARGA_MS = 6000;
/** Lo que tiene que haber cargado para estimar el ritmo (ms): antes, la cuenta es ruido. */
const PARA_EL_RITMO_MS = 40;
/** Cuánto antes de acabarse la voz se pide la siguiente (ms): se funden. */
const RELEVO_MS = 150;
/** Un `estalla` a menos de esto del último disparo de quien ya sonó con el disparo (ms). */
const OIDO_HACE_MS = 1500;
/** La carga ajena suena más baja que la propia. */
const FUERZA_AJENA = 0.6;

class CargaQueSuena {
  voz: ManejoDeSonido | null = null;
  /** Cuándo empezó esta carga y cuándo se acaba la voz que suena (reloj verdadero, ms). */
  desde = Number.NaN;
  finDeLaVoz = Number.NaN;
  blanco = 0;
  lleno = false;
  cargando = false;
  ultimoDisparo = Number.NEGATIVE_INFINITY;
  readonly donde: PuntoDelRayo = { x: 0, y: 0, z: 0 };
  readonly dondeAntes: PuntoDelRayo = { x: Number.NaN, y: 0, z: 0 };
}

/**
 * EL ENVOLTORIO. `base` es el `sistema.rayo` que había (si ya era uno de éstos, el suyo: no se envuelve dos veces);
 * `esPropio` dice si un asiento es el mío; `localizar` da la boca de un asiento (o su sitio), para la voz ajena.
 */
export class RayoQueSuena implements EfectosDelRayo {
  readonly base: EfectosDelRayo;
  private readonly cargas = new Map<number, CargaQueSuena>();
  private readonly punto: PuntoDelRayo = { x: 0, y: 0, z: 0 };

  constructor(
    base: EfectosDelRayo,
    private readonly sonido: SonidoDelRayo,
    private readonly esPropio: (quien: number) => boolean,
    private readonly localizar: (quien: number, salida: PuntoDelRayo) => boolean,
  ) {
    this.base = base instanceof RayoQueSuena ? base.base : base;
  }

  private sonar(id: IdDeSonido, o: OpcionesDeSonido): ManejoDeSonido | null {
    try {
      return this.sonido.sonar(id, o) ?? null;
    } catch {
      return null;
    }
  }

  private carga(quien: number): CargaQueSuena {
    let c = this.cargas.get(quien);
    if (c === undefined) {
      c = new CargaQueSuena();
      this.cargas.set(quien, c);
    }
    return c;
  }

  private callarLaCarga(c: CargaQueSuena): void {
    c.voz?.parar();
    c.voz = null;
    c.cargando = false;
    c.finDeLaVoz = Number.NaN;
  }

  /** Dónde suena lo de `quien`: nada si es el propio (suena en el jugador), su boca si es ajeno. */
  private dondeDe(quien: number, c: CargaQueSuena): Punto3 | null {
    if (this.esPropio(quien)) return null;
    if (!this.localizar(quien, this.punto)) return null;
    c.donde.x = this.punto.x;
    c.donde.y = this.punto.y;
    c.donde.z = this.punto.z;
    return c.donde;
  }

  empezarCarga(quien: number, t: number): void {
    this.base.empezarCarga(quien, t);
    if (!(quien > 0) || !Number.isFinite(t)) return;
    const c = this.carga(quien);
    this.callarLaCarga(c);
    c.cargando = true;
    c.desde = t;
    c.blanco = 0;
    c.lleno = false;
  }

  actualizarCarga(quien: number, estado: Readonly<EstadoDelRayo>, t: number): void {
    this.base.actualizarCarga(quien, estado, t);
    if (!(quien > 0) || !Number.isFinite(t)) return;
    const c = this.carga(quien);
    if (!c.cargando) {
      c.cargando = true;
      c.desde = Number.isFinite(estado.desdeMs) ? estado.desdeMs : t;
      c.blanco = 0;
      c.lleno = false;
    }
    const carga = Number.isFinite(estado.c) ? Math.min(1, Math.max(0, estado.c)) : 0;
    const propio = this.esPropio(quien);
    if (propio) {
      if (estado.blanco !== c.blanco && estado.blanco !== 0) this.sonar('rayo-fijado', {});
      if (carga >= 1 && !c.lleno) this.sonar('rayo-listo', {});
    }
    c.blanco = estado.blanco;
    if (carga >= 1) c.lleno = true;
    /* La voz: la primera, en cuanto se sabe el ritmo; las siguientes, al acabarse la anterior. */
    const desde = Number.isFinite(estado.desdeMs) ? estado.desdeMs : c.desde;
    const lleva = t - desde;
    /* Lo que falta para el pleno: la carga es lineal en el tiempo, así que es lo que lleva por lo que le falta. */
    const falta = carga >= 1 ? 0 : ((1 - carga) * lleva) / Math.max(carga, 1e-3);
    if (Number.isNaN(c.finDeLaVoz)) {
      if (carga < 1 && (lleva < PARA_EL_RITMO_MS || carga <= 0)) return;
      this.pedirLaVoz(quien, c, carga, falta, t);
    } else if (t >= c.finDeLaVoz - RELEVO_MS) {
      /* La de antes se apaga sola en sus últimos 120 ms: no se corta, se funde con la nueva. */
      this.pedirLaVoz(quien, c, carga, falta, t);
    } else if (!propio && c.voz !== null) {
      /* La carga ajena se mueve con quien carga (sólo si se ha movido: cada `mover` programa el panoramizador). */
      const p = this.dondeDe(quien, c);
      if (p !== null && (Math.abs(p.x - c.dondeAntes.x) > 0.05 || Math.abs(p.z - c.dondeAntes.z) > 0.05 || !(c.dondeAntes.x === c.dondeAntes.x))) {
        c.dondeAntes.x = p.x;
        c.dondeAntes.y = p.y;
        c.dondeAntes.z = p.z;
        c.voz.mover(p);
      }
    }
  }

  private pedirLaVoz(quien: number, c: CargaQueSuena, carga: number, subidaMs: number, t: number): void {
    const donde = this.dondeDe(quien, c);
    if (donde !== null) {
      c.dondeAntes.x = donde.x;
      c.dondeAntes.y = donde.y;
      c.dondeAntes.z = donde.z;
    }
    c.voz = this.sonar('carga-rayo', {
      posicion: donde === null ? null : { x: donde.x, y: donde.y, z: donde.z },
      fuerza: this.esPropio(quien) ? 1 : FUERZA_AJENA,
      carga,
      subidaMs: Math.min(30000, Math.max(0, subidaMs)),
      duracionMs: VOZ_DE_LA_CARGA_MS,
    });
    c.finDeLaVoz = t + VOZ_DE_LA_CARGA_MS;
  }

  cancelarCarga(quien: number, t: number): void {
    this.base.cancelarCarga(quien, t);
    const c = this.cargas.get(quien);
    if (c !== undefined) this.callarLaCarga(c);
  }

  soltar(d: DisparoDelRayo): void {
    this.base.soltar(d);
    if (!Number.isFinite(d.t) || !Number.isFinite(d.origen.x) || !Number.isFinite(d.destino.x)) return;
    const c = this.carga(d.quien);
    this.callarLaCarga(c);
    c.ultimoDisparo = d.t;
    const propio = this.esPropio(d.quien);
    const carga = Number.isFinite(d.c) ? Math.min(1, Math.max(0, d.c)) : 0;
    const boca = propio ? null : { x: d.origen.x, y: d.origen.y, z: d.origen.z };
    this.sonarElDisparo(d.nivel, carga, boca, d.origen, d.destino, propio ? undefined : d.t);
  }

  estallar(e: EstallidoDelRayo): void {
    this.base.estallar(e);
    if (!Number.isFinite(e.x) || !Number.isFinite(e.z) || !Number.isFinite(e.t)) return;
    const c = this.cargas.get(e.quien);
    if (c !== undefined && e.t - c.ultimoDisparo < OIDO_HACE_MS) return;
    /* Un estallido sin disparo oído: suena donde estalla, con el trueno si es de los que retumban. */
    const donde = { x: e.x, y: e.y, z: e.z };
    const carga = e.nivel >= 3 ? CARGA_QUE_TRUENA + 0.1 * (e.nivel - 3) : 0.2;
    this.sonarElDisparo(e.nivel, Math.min(1, carga), donde, donde, donde, e.t);
  }

  private sonarElDisparo(nivel: number, carga: number, boca: Punto3 | null, origen: Readonly<PuntoDelRayo>, destino: Readonly<PuntoDelRayo>, enMs: number | undefined): void {
    const cuando = enMs === undefined ? {} : { enMs };
    if (nivel <= 1) {
      this.sonar('rayo-corto', { posicion: boca, fuerza: 0.75 + 0.25 * carga, ...cuando });
      return;
    }
    this.sonar('rayo', { posicion: boca, fuerza: 0.55 + 0.45 * carga, ...cuando });
    if (carga >= CARGA_QUE_TRUENA) {
      this.sonar('trueno', {
        posicion: { x: origen.x, y: origen.y, z: origen.z },
        hasta: { x: destino.x, y: destino.y, z: destino.z },
        fuerza: 0.45 + 0.55 * carga,
        ...cuando,
      });
    }
  }

  /** Calla todas las cargas (otra noche, otro canal). */
  callar(): void {
    for (const c of this.cargas.values()) this.callarLaCarga(c);
  }
}

/** Envuelve `base` con el sonido (sin envolver dos veces: si `base` ya suena, se envuelve lo que había debajo). */
export function conElSonidoDelRayo(
  base: EfectosDelRayo,
  sonido: SonidoDelRayo,
  esPropio: (quien: number) => boolean,
  localizar: (quien: number, salida: PuntoDelRayo) => boolean,
): RayoQueSuena {
  return new RayoQueSuena(base, sonido, esPropio, localizar);
}
