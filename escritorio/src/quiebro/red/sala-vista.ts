/**
 * LA SALA VISTA DESDE EL APARATO: lo que el cable cuenta, ordenado en tablas que se leen al pintar.
 *
 * ═══ QUÉ ES Y QUÉ NO ═══
 *
 * Es la memoria del aparato sobre la sala: quién vive, en qué estado, qué golpes están anunciados,
 * qué balas vuelan, qué montones hay en el suelo, qué reloj tiene la fase, qué cuenta lleva cada
 * asiento. Se escribe SÓLO con lo que llega por el cable (`aplicar`) y no decide nada: no juzga golpes,
 * no mueve entidades, no adivina. Lo que llega y hay que CONTAR —un golpe que se cierra, un Celador que
 * se imprime— se apunta además como NOVEDAD, que la partida y la escena recogen en el fotograma.
 *
 * ═══ CADA `dentro` EMPIEZA DE CERO ═══
 *
 * «El aparato, al recibir `dentro`, TIRA todo lo que sabía de la sala y se queda con lo que venga
 * detrás» (`tipos-de-la-sala.ts`, `Bienvenida`): tras un despliegue la sala que renace no tiene nada
 * que ver con la de antes, y quien entra a media fase recibe la puesta al día entera —la fase, el
 * recurso, una cuenta por asiento, un `nace` por entidad viva, un `estado` por cuerpo que esté en
 * alguno, los montones, la zona, las balas, las líneas de apuntado y los anuncios pendientes— justo
 * detrás.
 *
 * ═══ LOS INSTANTES ═══
 *
 * Los que trae el cable (`anuncio.t`, `bala.t`, `apunta.t`) están en el reloj DEL CANAL de este aparato y se guardan
 * pasados a `performance.now()`, que es el reloj con que pinta todo el cliente. Los que se cuentan
 * en tics de la sala desde que llegan (lo que le queda a un estado, a un reloj de fase, a una zona) se
 * guardan como «hasta tal instante» contado desde que llegó el mensaje: el error es media ida y vuelta,
 * y en un reloj que se pinta en segundos no se ve.
 *
 * Puro: ni DOM ni three. `verify:quiebro-juego` le pasa mensajes escritos a mano y mira las tablas.
 */
import { MS_POR_TIC } from '../../../../shared/mecanicas/liza/declaracion';
import { MOTIVO_DE_IRSE, PRIMER_NUMERO_DE_ENTIDAD, RESULTADO } from '../../../../shared/mecanicas/liza/protocolo';
import type { MensajeDeLaSala, SucesoDelTic } from '../../../../shared/mecanicas/liza/protocolo';
import { FotosDeLaSala } from './interpolacion';
import type { RelojDelCanal } from './reloj';
import { RedDelAparato } from './reloj';

/** El estado en que está un cuerpo, contado desde que llegó. */
export interface EstadoVisto {
  readonly est: number;
  readonly desdeMs: number;
  readonly hastaMs: number;
  readonly intocableHastaMs: number;
}

export interface EntidadVista {
  readonly numero: number;
  readonly clase: number;
  /** Cuándo llegó su `nace`, en ms de `performance.now()`. */
  readonly nacioMs: number;
  /** Dónde nació (metros) y hacia dónde miraba (rumbo 0-255). */
  readonly x: number;
  readonly z: number;
  readonly r: number;
  /** El tic de la sala en que llegó su `nace` (para elegir al durmiente del que sale). */
  readonly nacioEnTic: number;
}

export interface AnuncioVisto {
  readonly id: number;
  readonly de: number;
  readonly a: number;
  readonly acc: number;
  /** El impacto, en ms de `performance.now()` (ya traducido por la sala a MI reloj). */
  readonly impactoMs: number;
  /** Cuándo llegó el anuncio (lo que el anillo tarda en cerrarse es `impactoMs − llegoMs`). */
  readonly llegoMs: number;
  /** Desde dónde se lanzó, en metros. */
  readonly x: number;
  readonly z: number;
}

export interface BalaVista {
  readonly id: number;
  readonly de: number;
  readonly p: number;
  readonly x: number;
  readonly z: number;
  readonly r: number;
  /** La salida, en ms de `performance.now()`. */
  readonly salidaMs: number;
}

/** Una entidad que apunta (`apunta`): a quién, desde dónde y cuándo se fija la línea y sale la ráfaga. */
export interface ApuntadoVisto {
  readonly de: number;
  readonly a: number;
  /** El proyectil que va a salir (su velocidad y su alcance, en la declaración). */
  readonly p: number;
  /** Desde dónde apunta, en metros. */
  readonly x: number;
  readonly z: number;
  /** Cuándo se fija, en ms de `performance.now()`. */
  readonly finMs: number;
  readonly llegoMs: number;
}

export interface MontonVisto {
  readonly id: number;
  readonly p: number;
  readonly n: number;
  readonly x: number;
  readonly z: number;
}

export interface CuentaVista {
  readonly vida: number;
  readonly medidor: number;
  readonly puntos: number;
  readonly mult: number;
}

export interface FaseVista {
  readonly clave: string;
  readonly modo: number;
  readonly limite: number;
  /** Cuándo vence el reloj de fase (ms de `performance.now()`), o `null` si no hay. */
  readonly relojHastaMs: number | null;
  readonly encuentroHastaMs: number | null;
  readonly llegoMs: number;
}

export interface AvisoVisto {
  readonly de: number;
  readonly clase: number;
  readonly obj: number;
  readonly llegoMs: number;
}

export interface ZonaVista {
  readonly id: number;
  readonly hastaMs: number;
}

/** Algo que hay que contar: un suceso con lo que se sabía de lo que nombra justo antes de aplicarlo. */
export type Novedad =
  | { readonly tipo: 'dentro'; readonly yo: number; readonly x: number; readonly z: number; readonly r: number }
  | { readonly tipo: 'corrige'; readonly n: number; readonly x: number; readonly z: number }
  | { readonly tipo: 'fuera'; readonly motivo: string }
  | {
      readonly tipo: 'suceso';
      readonly k: number;
      readonly llegoMs: number;
      readonly suceso: SucesoDelTic;
      /** El anuncio de un `anuncio`, o el que resuelve un `resuelve`. */
      readonly anuncio: AnuncioVisto | null;
      /** La bala de un `impacta`, de un `estalla` (la de un tiro: quién y de qué nivel) o de un `seva` de bala. */
      readonly bala: BalaVista | null;
      /** La entidad de un `seva` de entidad. */
      readonly entidad: EntidadVista | null;
      /** El montón de un `recoge` o de un `seva` de montón. */
      readonly monton: MontonVisto | null;
      /** La línea de un `apunta` (la nueva, o la que se quita con `a` 0) o la de quien se va (`seva`). */
      readonly apuntado: ApuntadoVisto | null;
    };

/** Cuántos avisos se recuerdan (para la brújula y el rótulo). */
const AVISOS_RECORDADOS = 12;

export class SalaVista {
  yo = 0;
  readonly fotos = new FotosDeLaSala();
  red = new RedDelAparato();
  fase: FaseVista | null = null;
  recurso: number | null = null;
  readonly cuentas = new Map<number, CuentaVista>();
  /** Lo que lleva cada asiento, por portable: `asiento → (portable → n)`. */
  readonly cargas = new Map<number, Map<number, number>>();
  readonly entidades = new Map<number, EntidadVista>();
  readonly estados = new Map<number, EstadoVisto>();
  readonly anuncios = new Map<number, AnuncioVisto>();
  readonly balas = new Map<number, BalaVista>();
  /** Las líneas de apuntado, por la entidad que apunta. */
  readonly apuntados = new Map<number, ApuntadoVisto>();
  readonly montones = new Map<number, MontonVisto>();
  readonly salidos = new Set<number>();
  zona: ZonaVista | null = null;
  readonly avisos: AvisoVisto[] = [];
  /** Lo que hay que contar, en orden. Lo vacía quien lo lee. */
  readonly novedades: Novedad[] = [];
  /** El `k` del último `tic` o `foto` aplicado. */
  ultimoK = -1;

  /** Olvida la sala (canal nuevo sin `dentro` todavía, o `dentro`). */
  olvidar(): void {
    this.yo = 0;
    this.fotos.vaciar();
    this.fase = null;
    this.recurso = null;
    this.cuentas.clear();
    this.cargas.clear();
    this.entidades.clear();
    this.estados.clear();
    this.anuncios.clear();
    this.balas.clear();
    this.apuntados.clear();
    this.montones.clear();
    this.salidos.clear();
    this.zona = null;
    this.avisos.length = 0;
    this.ultimoK = -1;
  }

  /** Un canal nuevo es un reloj nuevo: la red medida con el viejo no vale. */
  nuevoCanal(): void {
    this.olvidar();
    this.red = new RedDelAparato();
  }

  /** Cuántos de un portable lleva el asiento `a`. */
  lleva(a: number, portable: number): number {
    return this.cargas.get(a)?.get(portable) ?? 0;
  }

  /** El estado de un cuerpo en `ahora`, o 0 (libre) si no hay o ya acabó. */
  estadoEn(numero: number, ahora: number): number {
    const e = this.estados.get(numero);
    return e !== undefined && ahora < e.hastaMs ? e.est : 0;
  }

  /** APLICA UN MENSAJE DE LA SALA, llegado en `ahora` (ms de `performance.now()`). */
  aplicar(m: MensajeDeLaSala, ahora: number, reloj: RelojDelCanal): void {
    const msCanal = reloj.ms(ahora);
    switch (m.t) {
      case 'dentro':
        this.olvidar();
        this.yo = m.yo;
        this.ultimoK = m.k;
        this.red.alEntrar(m.k, msCanal);
        this.novedades.push({ tipo: 'dentro', yo: m.yo, x: m.x, z: m.z, r: m.r });
        return;
      case 'foto':
        this.fotos.guardar(m);
        this.red.alFotografiar(m.k, msCanal);
        if (m.k > this.ultimoK) this.ultimoK = m.k;
        return;
      case 'eco':
        this.red.alEco(m.c, m.ms, msCanal);
        return;
      case 'corrige':
        this.novedades.push({ tipo: 'corrige', n: m.n, x: m.x, z: m.z });
        return;
      case 'fuera':
        this.novedades.push({ tipo: 'fuera', motivo: m.motivo });
        return;
      case 'tic':
        if (m.k > this.ultimoK) this.ultimoK = m.k;
        for (const s of m.ev) this.aplicarSuceso(s, m.k, ahora, reloj);
        return;
    }
  }

  private aplicarSuceso(s: SucesoDelTic, k: number, ahora: number, reloj: RelojDelCanal): void {
    let anuncio: AnuncioVisto | null = null;
    let bala: BalaVista | null = null;
    let entidad: EntidadVista | null = null;
    let monton: MontonVisto | null = null;
    let apuntado: ApuntadoVisto | null = null;
    switch (s.e) {
      case 'anuncio':
        anuncio = {
          id: s.id,
          de: s.de,
          a: s.a,
          acc: s.acc,
          impactoMs: reloj.aPerformance(s.t),
          llegoMs: ahora,
          x: s.x / 100,
          z: s.z / 100,
        };
        this.anuncios.set(s.id, anuncio);
        break;
      case 'resuelve':
        anuncio = this.anuncios.get(s.id) ?? null;
        this.anuncios.delete(s.id);
        break;
      case 'impacta':
        bala = this.balas.get(s.bala) ?? null;
        /* Si dio, la bala se acaba ahí; si la esquivó, sigue su vuelo hasta la pared o su alcance. */
        if (s.r === RESULTADO.da) this.balas.delete(s.bala);
        break;
      case 'estalla':
        /* La bala de un tiro se para (llega ANTES que sus `impacta`): la novedad lleva quién la tiró y su proyectil. */
        bala = this.balas.get(s.bala) ?? null;
        break;
      case 'estado':
        if (s.est === 0) this.estados.delete(s.a);
        else {
          this.estados.set(s.a, {
            est: s.est,
            desdeMs: ahora,
            hastaMs: ahora + s.tics * MS_POR_TIC,
            intocableHastaMs: ahora + s.into * MS_POR_TIC,
          });
        }
        break;
      case 'empuja':
        break;
      case 'nace':
        /* Con el mismo número otra vez (se deshizo y vuelve): es la misma entidad, recién aparecida. */
        entidad = {
          numero: s.id,
          clase: s.clase,
          nacioMs: ahora,
          x: s.x / 100,
          z: s.z / 100,
          r: s.r,
          nacioEnTic: k,
        };
        this.entidades.set(s.id, entidad);
        this.estados.delete(s.id);
        break;
      case 'seva':
        entidad = this.entidades.get(s.id) ?? null;
        bala = this.balas.get(s.id) ?? null;
        monton = this.montones.get(s.id) ?? null;
        apuntado = this.apuntados.get(s.id) ?? null;
        this.entidades.delete(s.id);
        this.balas.delete(s.id);
        this.montones.delete(s.id);
        this.apuntados.delete(s.id);
        /*
         * Una entidad que SE DESHACE vuelve con el mismo número: se quita de las tablas, pero sus
         * anuncios pendientes los resuelve la sala con su `resuelve`; aquí no se tocan.
         */
        if (s.por !== MOTIVO_DE_IRSE.seDeshace) this.estados.delete(s.id);
        break;
      case 'bala':
        bala = {
          id: s.id,
          de: s.de,
          p: s.p,
          x: s.x / 100,
          z: s.z / 100,
          r: s.r,
          salidaMs: reloj.aPerformance(s.t),
        };
        this.balas.set(s.id, bala);
        break;
      case 'apunta':
        if (s.a === 0) {
          apuntado = this.apuntados.get(s.de) ?? null;
          this.apuntados.delete(s.de);
        } else {
          apuntado = { de: s.de, a: s.a, p: s.p, x: s.x / 100, z: s.z / 100, finMs: reloj.aPerformance(s.t), llegoMs: ahora };
          this.apuntados.set(s.de, apuntado);
        }
        break;
      case 'carga': {
        let porPortable = this.cargas.get(s.a);
        if (porPortable === undefined) {
          porPortable = new Map<number, number>();
          this.cargas.set(s.a, porPortable);
        }
        porPortable.set(s.p, s.n);
        break;
      }
      case 'monton':
        monton = { id: s.id, p: s.p, n: s.n, x: s.x / 100, z: s.z / 100 };
        this.montones.set(s.id, monton);
        break;
      case 'recoge': {
        monton = this.montones.get(s.id) ?? null;
        if (s.queda <= 0) this.montones.delete(s.id);
        else if (monton !== null) this.montones.set(s.id, { ...monton, n: s.queda });
        break;
      }
      case 'sale':
        this.salidos.add(s.a);
        break;
      case 'aviso':
        this.avisos.push({ de: s.de, clase: s.clase, obj: s.obj, llegoMs: ahora });
        while (this.avisos.length > AVISOS_RECORDADOS) this.avisos.shift();
        break;
      case 'fase':
        /* Una fase nueva: quien había salido vuelve a tener cuerpo (paso 3 del inicio de fase). */
        if (this.fase === null || this.fase.clave !== s.clave) this.salidos.clear();
        this.fase = {
          clave: s.clave,
          modo: s.modo,
          limite: s.limite,
          relojHastaMs: s.relojMs > 0 ? ahora + s.relojMs : null,
          encuentroHastaMs: s.encuentroTics > 0 ? ahora + s.encuentroTics * MS_POR_TIC : null,
          llegoMs: ahora,
        };
        break;
      case 'zona':
        this.zona = s.tics > 0 ? { id: s.id, hastaMs: ahora + s.tics * MS_POR_TIC } : null;
        break;
      case 'cuenta':
        this.cuentas.set(s.a, { vida: s.vida, medidor: s.medidor, puntos: s.puntos, mult: s.mult });
        break;
      case 'recurso':
        this.recurso = s.n;
        break;
    }
    this.novedades.push({ tipo: 'suceso', k, llegoMs: ahora, suceso: s, anuncio, bala, entidad, monton, apuntado });
  }

  /** ¿Es el número `n` de una entidad (o bala o montón)? Los asientos van del 1 al 15. */
  static esEntidad(n: number): boolean {
    return n >= PRIMER_NUMERO_DE_ENTIDAD;
  }
}
