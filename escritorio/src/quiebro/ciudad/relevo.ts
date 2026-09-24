/**
 * EL RELEVO DE LA CIUDAD: cómo se pasa de la ciudad que se pinta a otra (otro nivel, u otra noche) sin parar
 * el juego.
 *
 * ═══ LO QUE PASABA (revisión de rendimiento del 24-sep) ═══
 *
 * Cada cambio de nivel del gobernador y cada comienzo de noche construía la ciudad entera de golpe (55-86 ms de
 * React), soltaba la vieja ANTES de pintar la nueva (three soltaba sus programas y compilaba otra vez los mismos,
 * con el hilo principal esperando: 130-155 ms), subía la luz nueva entera en un fotograma (5-11 MB) y llenaba la
 * ventana nueva con la prisa del principio de la noche (hasta 31.000 triángulos por fotograma). Resultado: un
 * tirón de 150-400 ms en un PC de sobremesa, varias veces por noche.
 *
 * ═══ LO QUE HACE ═══
 *
 *   1. La que VIENE se prepara detrás, sin pintarse y CALLADA (no toca los uniformes compartidos: ver
 *      `abierta.ts`), mientras se sigue pintando la que hay:
 *        · otro nivel de la misma noche: sobre la MISMA base, con los topes de siempre (sin prisa: hay una
 *          partida que estropear) y, si el téxel de la luz es el mismo, sin luz propia (heredará la de la otra);
 *        · otra noche: su base A PASOS, un paso por fotograma (`construirLaBaseAPasos`), y luego con la prisa
 *          del principio, que la Bajada tapa. La que se va deja de trabajar (su ventana y su luz se quedan).
 *   2. Cuando la que viene está LISTA (ventana entera y, si su luz es suya, las cuatro losetas del centro), se
 *      COMPILA sin pintarse (`Compilacion`, de `calidad/precompilar.ts`): `compileAsync` en el pintado principal,
 *      con el estado exacto del renderizador, y el hilo principal no espera.
 *   3. Compilada, se SUBE a pasos (`SubidorDeLaCiudad`, fuera del pintado: en `actualizar`): sus geometrías y
 *      los mapas de su base, `BYTES_DE_SUBIDA_POR_FOTOGRAMA` por fotograma. three sube una geometría la primera
 *      vez que la pinta, entera: medido en el juego (24-sep, N3, otra noche), el fotograma del relevo subía
 *      69 MB de geometría y 11 de mapas y duraba 96 ms.
 *   4. Compilada y subida, en ESE pintado (antes de que three arme lo que pinta) cambia una por otra: la nueva
 *      hereda la luz si toca, habla, y la vieja deja de pintarse. La vieja se suelta en el fotograma siguiente:
 *      sus programas iguales siguen vivos en la nueva y ninguno se vuelve a compilar.
 *
 * Si la que viene tarda demasiado (`paciencia`), se releva igual: antes una ciudad sin terminar de preparar que
 * una que no llega. La primera ciudad de todas se enseña en seguida: antes no hay nada que enseñar.
 *
 * Todo sin React y sin WebGL: el comprobador lo corre en Node con un compilador y un subidor falsos.
 */
import * as THREE from 'three';
import type { BaseDeLaCiudad, CiudadAbiertaConstruida, CiudadParaPintar, FotogramaDeLaCiudadAbierta, OpcionesDeLaCiudadAbierta } from './abierta';
import { construirLaBaseAPasos, construirLaCiudadAbierta, heredaLaLuz } from './abierta';
import type { NivelDeLaCiudad } from './tipos';
import type { Compilador } from '../calidad/precompilar';
import { Compilacion } from '../calidad/precompilar';

/** Cuántos fotogramas espera la que viene a estar lista (unos 20 s a 30 fps) antes de relevar igual. */
export const PACIENCIA_DEL_RELEVO = 600;

/** Lo que se sube por fotograma de la ciudad que viene (una pieza mayor va sola en su fotograma). */
export const BYTES_DE_SUBIDA_POR_FOTOGRAMA = 12 * 1024 * 1024;

/**
 * CÓMO SUBIR A LA GPU, sin pintarlo en pantalla, lo de la ciudad que viene (lo pone quien la monta: en el
 * navegador, `CiudadAbierta`). Se llama desde `actualizar`, nunca dentro del pintado.
 */
export interface SubidorDeLaCiudad {
  /** Sube las geometrías de esta malla (y de lo que cuelga de ella). */
  subirMalla(malla: THREE.Object3D): void;
  /** Sube esta textura. */
  subirTextura(textura: THREE.Texture): void;
}

/** Una pieza por subir: una malla o una textura, con lo que pesa. */
type PiezaPorSubir = { readonly malla: THREE.Object3D; readonly bytes: number } | { readonly textura: THREE.Texture; readonly bytes: number };

/** Lo que pesa una geometría en la GPU: sus atributos y su índice. */
function bytesDeLaGeometria(g: THREE.BufferGeometry): number {
  let n = g.index?.array.byteLength ?? 0;
  for (const nombre of Object.keys(g.attributes)) {
    const a = g.attributes[nombre] as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
    n += 'data' in a && a.data !== undefined ? a.data.array.byteLength : (a as THREE.BufferAttribute).array.byteLength;
  }
  return n;
}

/** Lo que hay que subir de una ciudad antes de enseñarla: los mapas de su base y cada malla, en su orden. */
export function piezasPorSubir(c: CiudadAbiertaConstruida): PiezaPorSubir[] {
  const piezas: PiezaPorSubir[] = [];
  for (const t of [c.base.texturaAlturas, c.base.texturaOclusion, c.base.atlas.textura]) {
    const img = t.image as { readonly data?: ArrayBufferView; readonly width?: number; readonly height?: number } | undefined;
    piezas.push({ textura: t, bytes: img?.data?.byteLength ?? (img?.width ?? 0) * (img?.height ?? 0) * 4 });
  }
  c.grupo.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!(m.isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine) || m.geometry === undefined) return;
    const instancias = (o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).instanceMatrix.array.byteLength : 0;
    piezas.push({ malla: o, bytes: bytesDeLaGeometria(m.geometry) + instancias });
  });
  return piezas;
}

export interface OpcionesDelRelevo {
  /** Cómo construir una ciudad (por omisión, `construirLaCiudadAbierta`). */
  readonly construir?: (fuente: CiudadParaPintar, nivel: NivelDeLaCiudad, opciones: OpcionesDeLaCiudadAbierta) => CiudadAbiertaConstruida;
  /** Cómo construir la base de otra noche a pasos (por omisión, `construirLaBaseAPasos`). */
  readonly baseAPasos?: (fuente: CiudadParaPintar) => Generator<void, BaseDeLaCiudad, void>;
  /** Fotogramas de espera antes de relevar igual (`PACIENCIA_DEL_RELEVO`). */
  readonly paciencia?: number;
  /** Con cada ciudad que se construye (quien la monta le pone el subidor de texturas). */
  readonly alCrear?: (ciudad: CiudadAbiertaConstruida) => void;
}

interface LaQueViene {
  readonly fuente: CiudadParaPintar;
  readonly nivel: NivelDeLaCiudad;
  /** Otro nivel de la misma noche (la misma fuente que la que se pinta al pedirla). */
  readonly mismaNoche: boolean;
  /** Heredará la luz de la que se pinta. */
  readonly hereda: boolean;
  pasos: Generator<void, BaseDeLaCiudad, void> | null;
  /** Su base, con un uso RESERVADO mientras se prepara (se devuelve al relevar o al dejarla). */
  base: BaseDeLaCiudad | null;
  ciudad: CiudadAbiertaConstruida | null;
  compilacion: Compilacion | null;
  /** Lo que queda por subir (desde que está compilada) y por dónde va. */
  subida: { readonly piezas: readonly PiezaPorSubir[]; k: number; hecha: boolean } | null;
  fotogramas: number;
}

export class RelevoDeLaCiudad {
  /** Lo que se cuelga en la escena: dentro, sólo la ciudad que se pinta. */
  readonly grupo = new THREE.Group();
  private ahora: CiudadAbiertaConstruida | null = null;
  private viene: LaQueViene | null = null;
  private readonly porSoltar: CiudadAbiertaConstruida[] = [];
  private nueva = false;
  private readonly construir: NonNullable<OpcionesDelRelevo['construir']>;
  private readonly baseAPasos: NonNullable<OpcionesDelRelevo['baseAPasos']>;
  private readonly paciencia: number;
  private readonly alCrear: OpcionesDelRelevo['alCrear'];
  /** Cuentas para el comprobador y el banco. */
  relevos = 0;
  /** Relevos hechos sin que la que venía estuviera compilada (se le acabó la paciencia). */
  forzados = 0;
  /** Pasos de base dados (uno por fotograma). */
  pasosDeBase = 0;
  /** Ciudades que se prepararon y se dejaron sin enseñar (otra petición llegó antes). */
  dejadas = 0;
  /** Bytes subidos antes de enseñar (para el comprobador), y el fotograma que más subió. */
  subidos = 0;
  mayorSubida = 0;
  private subidor: SubidorDeLaCiudad | null = null;

  constructor(o: OpcionesDelRelevo = {}) {
    this.construir = o.construir ?? construirLaCiudadAbierta;
    this.baseAPasos = o.baseAPasos ?? construirLaBaseAPasos;
    this.paciencia = o.paciencia ?? PACIENCIA_DEL_RELEVO;
    this.alCrear = o.alCrear;
    this.grupo.name = 'quiebro-relevo-de-la-ciudad';
  }

  /** La ciudad que se pinta. */
  get actual(): CiudadAbiertaConstruida | null {
    return this.ahora;
  }

  /** La que se prepara detrás (o `null`). */
  get preparando(): CiudadAbiertaConstruida | null {
    return this.viene?.ciudad ?? null;
  }

  /** Cómo subir lo de la que viene antes de enseñarla (sin subidor, three lo sube al pintarla). */
  ponerElSubidor(s: SubidorDeLaCiudad | null): void {
    this.subidor = s;
  }

  /** ¿Hay una preparándose (aunque aún esté haciendo su base)? */
  get ocupado(): boolean {
    return this.viene !== null;
  }

  /**
   * PIDE la ciudad de `fuente` a `nivel`. La primera se construye y se enseña ya; las demás se preparan detrás
   * (ver la cabecera). Pedir lo que ya se pinta deja lo que se preparaba; pedir otra vez lo mismo no hace nada.
   */
  pedir(fuente: CiudadParaPintar, nivel: NivelDeLaCiudad): void {
    const a = this.ahora;
    if (a === null) {
      const c = this.construir(fuente, nivel, {});
      this.alCrear?.(c);
      this.mostrar(c);
      return;
    }
    const v = this.viene;
    if (v !== null && v.fuente === fuente && v.nivel === nivel) return;
    if (a.fuente === fuente && a.nivel === nivel) {
      this.dejar();
      return;
    }
    /* La base: la de la que se pinta (otro nivel), la que ya se hacía para esta noche, o una nueva a pasos. */
    let base: BaseDeLaCiudad | null = null;
    let pasos: Generator<void, BaseDeLaCiudad, void> | null = null;
    if (a.fuente === fuente) base = a.base;
    else if (v !== null && v.fuente === fuente) {
      base = v.base;
      pasos = v.pasos;
      v.pasos = null;
    }
    if (base !== null) base.usos++;
    this.dejar();
    if (base === null && pasos === null) pasos = this.baseAPasos(fuente);
    const mismaNoche = a.fuente === fuente;
    this.viene = { fuente, nivel, mismaNoche, hereda: mismaNoche && heredaLaLuz(a.nivel, nivel), pasos, base, ciudad: null, compilacion: null, subida: null, fotogramas: 0 };
  }

  /**
   * UN FOTOGRAMA: suelta lo relevado en el anterior, trabaja la que se pinta (quieta si la que viene es de otra
   * noche) y da un paso a la que viene (un paso de base, construirla, o su trabajo de cada fotograma y, ya
   * compilada, subir un trozo).
   */
  actualizar(camara: THREE.Camera, tiempo: number, tic: number): FotogramaDeLaCiudadAbierta | null {
    while (this.porSoltar.length > 0) this.porSoltar.shift()?.liberar();
    const v = this.viene;
    const f = this.ahora?.actualizar(camara, tiempo, tic, v === null || v.mismaNoche) ?? null;
    if (v === null) return f;
    v.fotogramas++;
    if (v.base === null) {
      const pasos = v.pasos;
      if (pasos === null) return f;
      const r = pasos.next();
      this.pasosDeBase++;
      if (r.done === true) {
        v.base = r.value;
        v.base.usos++;
        v.pasos = null;
      }
      return f;
    }
    if (v.ciudad === null) {
      v.ciudad = this.construir(v.fuente, v.nivel, { base: v.base, callada: true, prisa: !v.mismaNoche, luz: v.hereda ? 'despues' : 'propia' });
      this.alCrear?.(v.ciudad);
      return f;
    }
    v.ciudad.actualizar(camara, tiempo, tic);
    const s = v.subida;
    const subidor = this.subidor;
    if (s !== null && !s.hecha && subidor !== null) {
      let bytes = 0;
      while (s.k < s.piezas.length) {
        const p = s.piezas[s.k] as PiezaPorSubir;
        if (bytes > 0 && bytes + p.bytes > BYTES_DE_SUBIDA_POR_FOTOGRAMA) break;
        if ('malla' in p) subidor.subirMalla(p.malla);
        else subidor.subirTextura(p.textura);
        bytes += p.bytes;
        s.k++;
      }
      if (s.k >= s.piezas.length) s.hecha = true;
      this.subidos += bytes;
      if (bytes > this.mayorSubida) this.mayorSubida = bytes;
    }
    return f;
  }

  /**
   * EN EL PINTADO PRINCIPAL (ver `calidad/precompilar.ts`): compila la que viene cuando está lista y, cuando
   * está compilada para este pintado, la cambia por la que se pinta antes de que three arme lo que pinta.
   */
  enElPintado(gl: Compilador, escena: THREE.Scene, camara: THREE.Camera): void {
    const v = this.viene;
    if (v === null || v.ciudad === null) return;
    if (!v.ciudad.lista && v.fotogramas <= this.paciencia) return;
    v.compilacion ??= new Compilacion(v.ciudad.grupo);
    const compilada = v.compilacion.enElPintado(gl, escena, camara);
    if (!compilada && v.fotogramas <= 2 * this.paciencia) return;
    /* Compilada: se sube a trozos en los fotogramas siguientes (en `actualizar`, fuera del pintado), y luego se releva. */
    if (compilada && this.subidor !== null && v.subida?.hecha !== true && v.fotogramas <= 2 * this.paciencia) {
      v.subida ??= { piezas: piezasPorSubir(v.ciudad), k: 0, hecha: false };
      return;
    }
    if (!compilada) this.forzados++;
    this.relevar(v);
  }

  /** ¿Se enseñó otra ciudad desde la última vez que se preguntó? Devuelve la que se pinta, una vez. */
  tomarLaNueva(): CiudadAbiertaConstruida | null {
    if (!this.nueva) return null;
    this.nueva = false;
    return this.ahora;
  }

  liberar(): void {
    this.dejar();
    while (this.porSoltar.length > 0) this.porSoltar.shift()?.liberar();
    const a = this.ahora;
    if (a !== null) {
      this.grupo.remove(a.grupo);
      a.liberar();
    }
    this.ahora = null;
  }

  private mostrar(c: CiudadAbiertaConstruida): void {
    this.grupo.add(c.grupo);
    c.grupo.updateMatrixWorld(true);
    this.ahora = c;
    this.nueva = true;
  }

  private relevar(v: LaQueViene): void {
    const vieja = this.ahora;
    const nueva = v.ciudad;
    if (vieja === null || nueva === null) return;
    if (!nueva.conLuz) nueva.recibirLaLuz(vieja.soltarLaLuz());
    this.grupo.remove(vieja.grupo);
    nueva.hablar();
    this.mostrar(nueva);
    this.viene = null;
    /* El uso reservado de su base: desde aquí la usa la ciudad, que tiene el suyo. */
    const b = v.base;
    if (b !== null) b.usos--;
    this.porSoltar.push(vieja);
    this.relevos++;
  }

  /** Deja la que se preparaba: su ciudad (cuando acabe de compilarse, si se compilaba) y el uso de su base. */
  private dejar(): void {
    const v = this.viene;
    if (v === null) return;
    this.viene = null;
    if (v.ciudad !== null || v.base !== null) this.dejadas++;
    const soltar = (): void => {
      v.ciudad?.liberar();
      const b = v.base;
      if (b !== null) {
        b.usos--;
        if (b.usos <= 0) b.liberar();
      }
    };
    if (v.compilacion !== null) v.compilacion.soltarCuandoSePueda(soltar);
    else soltar();
  }
}
