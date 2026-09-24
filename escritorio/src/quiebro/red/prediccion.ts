/**
 * EL PASO PROPIO, PREDICHO: dónde está mi desvelado en cada tic, antes de que la sala lo sepa.
 *
 * ═══ POR QUÉ SE PREDICE Y QUÉ NO ═══
 *
 * «Tu personaje responde en el mismo fotograma» (diseño §7): el paso se simula aquí, con la MISMA arena
 * que usa la sala (`arenaDeLaLiza`, la de `mundo.ts`) y la misma `unPaso`, y la sala sólo VALIDA el sitio
 * que le cuento en cada `aqui` (presupuestos, estructura, límite de la fase). Ningún resultado se
 * adivina: ni si un golpe da, ni si un quiebro fue limpio. Sólo dónde piso.
 *
 * ═══ LO QUE LA SALA ACEPTA, Y POR QUÉ ESTO NO PIDE MÁS ═══
 *
 *   · Cada tic, a lo sumo la marcha más rápida del reglamento (`cuerpo.marchas`), que el diseño deja por
 *     debajo del presupuesto corto (7 m/s contra 8,75): la holgura es para la red, no para correr más.
 *   · Cada tramo se anda EN RECTA (la sala lo mira con `seAndaEnRecta`). `unPaso` sólo mira el sitio de
 *     llegada; con pasos más largos que el radio del cuerpo podría saltarse la esquina de una farola que
 *     la recta sí pisa, así que el paso de un tic se parte en trozos no más largos que el radio; y un
 *     trozo que resbala contra una esquina no se da si la recta del tic entero la corta.
 *   · Dentro del límite de la fase (una regla de la sala, no una pared): lo que se saldría se queda en
 *     el eje que no se sale.
 *   · Los desplazamientos de un estado (el quiebro, la acometida de la Entrada, el empujón que recibo)
 *     van por encima del paso, con la distancia extra que la puesta de ese estado admite.
 *
 * `verify:quiebro-juego` anda miles de tics por el barrio de verdad con esto y comprueba que cada tramo
 * cumple lo que la sala exige (y, si la sala ya existe, que no devuelve ni una corrección).
 *
 * ═══ LA CORRECCIÓN SUAVE ═══
 *
 * Cuando la sala dice `corrige {n, x, z}`, el sitio SIMULADO salta a `(x, z)` en el acto —de ahí salen los
 * `aqui` siguientes, y tienen que salir de un sitio bueno—, pero lo que se PINTA no salta: la diferencia
 * queda en `desvio` y se funde en ~0,1 s. Las correcciones de `aqui` que se mandaron antes de corregir
 * (`n` ≤ el último `n` enviado al corregir) ya están atendidas: se ignoran, o cada una devolvería el
 * cuerpo atrás otra vez durante una ida y vuelta entera.
 *
 * Todo en Q16.16 salvo `desvio`, que es presentación y va en metros.
 */
import { DT_DEL_TIC, RUMBOS, SENO, COSENO } from '../../../../shared/mecanicas/andar';
import { por, UNO } from '../../../../shared/mecanicas/fijo';
import { seAndaEnRecta, sePuedeEstar, unPaso } from '../../../../shared/mecanicas/mundo';
import type { Arena } from '../../../../shared/mecanicas/mundo';
import type { CajaDeLaLiza, CuerpoDeclarado } from '../../../../shared/mecanicas/liza/declaracion';
import { trayectoria } from '../../../../shared/mecanicas/liza/geometria';

/** Lo que piden los mandos en un tic. */
export interface EntradaDelPaso {
  /** Rumbo (0-255) hacia el que empuja la palanca en el mundo, o `null` si está suelta. */
  readonly rumbo: number | null;
  /** Cuánto empuja, 0..1, ya sin zona muerta. */
  readonly fuerza: number;
  /** Correr (Mayúsculas, o palanca a fondo 0,8 s sin enemigos cerca: lo decide quien la lee). */
  readonly correr: boolean;
}

/** El umbral del diseño (§4.2): por debajo del 60 % se anda, por encima se trota. */
export const UMBRAL_DEL_TROTE = 0.6;

/** Lo que se funde de la corrección por segundo: a los 0,1 s queda un 37 %, a los 0,3 s un 5 %. */
const FUNDIDO_DEL_DESVIO_S = 0.1;
/** Una corrección más grande que esto no se funde: se salta (una reaparición no se ve deslizarse). */
const DESVIO_QUE_SE_SALTA_M = 2.5;

/** Un desplazamiento en curso, de un estado: por tic, en Q16.16. */
interface Desplazamiento {
  readonly dx: number;
  readonly dz: number;
  ticsQueQuedan: number;
  /** `true`: se para contra la estructura (empujón); `false`: resbala en ella (quiebro, acometida). */
  readonly seParaContraLaPared: boolean;
}

/** Lo que devuelve un paso: el sitio nuevo y la marcha con que se manda. */
export interface PasoDado {
  readonly x: number;
  readonly z: number;
  /** 0 quieto; 1, 2, 3… la marcha del reglamento (índice + 1). */
  readonly marcha: number;
}

/** ¿Está `(x, z)` dentro de `caja` (bordes incluidos)? `null` es «no hay límite». */
export function dentroDelLimite(caja: CajaDeLaLiza | null, x: number, z: number): boolean {
  return caja === null || (x >= caja.x0 && x <= caja.x1 && z >= caja.z0 && z <= caja.z1);
}

/**
 * UN TRAMO PARTIDO EN TROZOS NO MÁS LARGOS QUE EL RADIO, cada uno con `unPaso` (que resbala). Así cada
 * trozo es una recta corta entre dos sitios donde se puede estar, que es lo que la sala mira.
 */
function andarEnTrozos(arena: Arena, x: number, z: number, dx: number, dz: number, radio: number, limite: CajaDeLaLiza | null): { x: number; z: number } {
  const largo = Math.max(Math.abs(dx), Math.abs(dz));
  if (largo === 0) return { x, z };
  const tope = Math.max(1, Math.floor((radio * 9) / 10));
  const trozos = Math.max(1, Math.ceil(largo / tope));
  let px = x;
  let pz = z;
  for (let i = 0; i < trozos; i++) {
    /* Cada trozo lleva su parte entera; el último, lo que sobre del redondeo. */
    const tx = i === trozos - 1 ? x + dx - (x + Math.trunc((dx * i) / trozos)) : Math.trunc((dx * (i + 1)) / trozos) - Math.trunc((dx * i) / trozos);
    const tz = i === trozos - 1 ? z + dz - (z + Math.trunc((dz * i) / trozos)) : Math.trunc((dz * (i + 1)) / trozos) - Math.trunc((dz * i) / trozos);
    /* `unPaso` multiplica velocidad por `dt`: con `dt = UNO` (un segundo) la «velocidad» es el trozo. */
    const siguiente = unPaso(arena, { x: px, z: pz }, tx, tz, UNO, radio);
    let nx = siguiente.x;
    let nz = siguiente.z;
    if (!dentroDelLimite(limite, nx, nz)) {
      /* El límite no es una pared que resbale: se queda el eje que no se sale, si se puede estar ahí. */
      if (dentroDelLimite(limite, nx, pz) && sePuedeEstar(arena, nx, pz, radio)) nz = pz;
      else if (dentroDelLimite(limite, px, nz) && sePuedeEstar(arena, px, nz, radio)) nx = px;
      else return { x: px, z: pz };
    }
    if (nx === px && nz === pz) return { x: px, z: pz };
    /*
     * Un trozo que resbaló contra una esquina deja un camino en L; la sala mira el tramo del tic ENTERO
     * en recta, y la recta de una L puede cortar la esquina que la L rodeó. Si pasa, el tic acaba en el
     * trozo anterior: se pierde un palmo contra la pared, no una corrección.
     */
    if (!seAndaEnRecta(arena, { x, z }, { x: nx, z: nz }, radio)) return { x: px, z: pz };
    px = nx;
    pz = nz;
  }
  return { x: px, z: pz };
}

/**
 * EL CUERPO PROPIO, PREDICHO. Uno por canal: con cada `dentro` se coloca de nuevo y se olvida todo.
 */
export class PasoPropio {
  /** El sitio simulado, en Q16.16: de aquí salen los `aqui`. */
  x = 0;
  z = 0;
  /** Lo que el cuerpo va, en Q16.16 de m/s, y hacia dónde (rumbo 0-255) dio el último paso. */
  velocidad = 0;
  rumboDelPaso = 0;
  /** Lo que se pinta de más respecto a lo simulado tras una corrección, en metros. */
  desvioX = 0;
  desvioZ = 0;
  /** El último `n` enviado cuando llegó la última corrección que se atendió. */
  private corregidoHastaN = -1;
  private desplazamiento: Desplazamiento | null = null;

  constructor(
    private arena: Arena,
    private cuerpo: CuerpoDeclarado,
  ) {}

  /** Otra declaración (otra fase, otro retoque): la arena y el cuerpo nuevos, el sitio el mismo. */
  cambiarDeReglas(arena: Arena, cuerpo: CuerpoDeclarado): void {
    this.arena = arena;
    this.cuerpo = cuerpo;
  }

  get radio(): number {
    return this.cuerpo.radio;
  }

  /** Aparece aquí sin transición (`dentro`, o recupera el cuerpo): lo que había, se olvida. */
  colocar(x: number, z: number): void {
    this.x = x;
    this.z = z;
    this.velocidad = 0;
    this.desvioX = 0;
    this.desvioZ = 0;
    this.desplazamiento = null;
    this.corregidoHastaN = -1;
  }

  /**
   * La sala dice que mi tic `n` no vale y me devuelve a `(x, z)`. `ultimoEnviado` es el último `n` que
   * ya salió: las correcciones de lo enviado antes de ésta se ignoran (ver la cabecera). Devuelve si se
   * atendió.
   */
  corregir(n: number, x: number, z: number, ultimoEnviado: number): boolean {
    if (n <= this.corregidoHastaN) return false;
    this.corregidoHastaN = ultimoEnviado;
    const dx = (this.x - x) / UNO + this.desvioX;
    const dz = (this.z - z) / UNO + this.desvioZ;
    this.x = x;
    this.z = z;
    this.velocidad = 0;
    this.desplazamiento = null;
    if (Math.hypot(dx, dz) > DESVIO_QUE_SE_SALTA_M) {
      this.desvioX = 0;
      this.desvioZ = 0;
    } else {
      this.desvioX = dx;
      this.desvioZ = dz;
    }
    return true;
  }

  /** Funde el desvío de la corrección: se llama en cada fotograma con los segundos que pasaron. */
  fundir(segundos: number): void {
    if (this.desvioX === 0 && this.desvioZ === 0) return;
    const f = Math.exp(-Math.max(0, segundos) / FUNDIDO_DEL_DESVIO_S);
    this.desvioX *= f;
    this.desvioZ *= f;
    if (Math.abs(this.desvioX) < 1e-3 && Math.abs(this.desvioZ) < 1e-3) {
      this.desvioX = 0;
      this.desvioZ = 0;
    }
  }

  /**
   * Un desplazamiento de un estado: `distancia` (Q16.16) hacia el rumbo `rumbo`, repartida en `tics`.
   * `seParaContraLaPared`: el empujón se para (y eso es un estampado); el quiebro resbala.
   */
  desplazar(rumbo: number, distancia: number, tics: number, seParaContraLaPared: boolean): void {
    const n = Math.max(1, Math.floor(tics));
    const r = ((Math.floor(rumbo) % RUMBOS) + RUMBOS) % RUMBOS;
    const dx = Math.trunc(por(distancia, SENO[r] as number) / n);
    const dz = Math.trunc(-por(distancia, COSENO[r] as number) / n);
    this.desplazamiento = { dx, dz, ticsQueQuedan: n, seParaContraLaPared };
    this.velocidad = 0;
  }

  /** ¿Hay un desplazamiento en curso? */
  desplazandose(): boolean {
    return this.desplazamiento !== null;
  }

  /** Corta el desplazamiento (el estado que lo llevaba acabó antes, o llegó un `dentro`). */
  pararElDesplazamiento(): void {
    this.desplazamiento = null;
  }

  /** La marcha (índice en `cuerpo.marchas`) que pide la entrada, o −1 quieto. */
  private marchaPedida(entrada: EntradaDelPaso): number {
    const marchas = this.cuerpo.marchas.length;
    if (entrada.rumbo === null || entrada.fuerza <= 0 || marchas === 0) return -1;
    if (entrada.correr && marchas >= 3) return 2;
    if (entrada.fuerza >= UMBRAL_DEL_TROTE && marchas >= 2) return 1;
    return 0;
  }

  /**
   * UN TIC. `bloqueado`: el estado en curso no deja andar (`bloqueaPaso`), así que sólo cuenta el
   * desplazamiento, si lo hay. `limite`: el de la fase, o `null`.
   */
  paso(entrada: EntradaDelPaso, bloqueado: boolean, limite: CajaDeLaLiza | null): PasoDado {
    const radio = this.cuerpo.radio;
    const d = this.desplazamiento;
    if (d !== null) {
      if (d.seParaContraLaPared) {
        const t = trayectoria(this.arena.cuerpos, this.x, this.z, d.dx, d.dz, radio);
        const dentro = dentroDelLimite(limite, t.x, t.z);
        if (dentro) {
          this.x = t.x;
          this.z = t.z;
        }
        d.ticsQueQuedan = t.caja !== null || !dentro ? 0 : d.ticsQueQuedan - 1;
      } else {
        const p = andarEnTrozos(this.arena, this.x, this.z, d.dx, d.dz, radio, limite);
        this.x = p.x;
        this.z = p.z;
        d.ticsQueQuedan -= 1;
      }
      if (d.ticsQueQuedan <= 0) this.desplazamiento = null;
      return { x: this.x, z: this.z, marcha: 0 };
    }

    const marcha = bloqueado ? -1 : this.marchaPedida(entrada);
    const objetivo = marcha < 0 ? 0 : (this.cuerpo.marchas[marcha] as number);
    /*
     * LA ACELERACIÓN: de quieto al trote en `aceleracionTics` (diseño §4.2, «de 0 a 5 m/s en 3 tics»).
     * El reglamento dice «hasta la marcha 1»; se toma la del trote si la hay porque es la que el diseño
     * cuenta, y la sala no la mira: sólo es cómo se siente arrancar. Frenar va al doble.
     */
    const referencia = (this.cuerpo.marchas[Math.min(1, this.cuerpo.marchas.length - 1)] as number | undefined) ?? objetivo;
    const acelera = Math.max(1, Math.floor(referencia / Math.max(1, this.cuerpo.aceleracionTics)));
    if (this.velocidad < objetivo) this.velocidad = Math.min(objetivo, this.velocidad + acelera);
    else if (this.velocidad > objetivo) this.velocidad = Math.max(objetivo, this.velocidad - 2 * acelera);
    if (entrada.rumbo !== null && marcha >= 0) this.rumboDelPaso = ((Math.floor(entrada.rumbo) % RUMBOS) + RUMBOS) % RUMBOS;
    if (this.velocidad === 0) return { x: this.x, z: this.z, marcha: 0 };

    const r = this.rumboDelPaso;
    const dx = por(por(this.velocidad, SENO[r] as number), DT_DEL_TIC);
    const dz = -por(por(this.velocidad, COSENO[r] as number), DT_DEL_TIC);
    const p = andarEnTrozos(this.arena, this.x, this.z, dx, dz, radio, limite);
    if (p.x === this.x && p.z === this.z) this.velocidad = 0;
    this.x = p.x;
    this.z = p.z;
    return { x: this.x, z: this.z, marcha: marcha < 0 ? 0 : marcha + 1 };
  }
}
