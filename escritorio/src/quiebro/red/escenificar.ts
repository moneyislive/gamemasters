/**
 * DE LOS SUCESOS A LO QUE SE VE Y SE OYE: el puente entre la partida y los efectos y el sonido.
 *
 * ═══ POR QUÉ UN FICHERO APARTE ═══
 *
 * La partida (`partida.ts`) sabe de la Liza y no de three ni de WebAudio, y se prueba en Node. Los
 * efectos (`efectos/`) y el sonido (`sonido/`) saben pintar y sonar y no saben de la Liza. Esto es lo
 * único que conoce a los tres: toma cada novedad del cable, con lo que la partida sabe de quién es quién,
 * y la convierte en un anillo, un silbido, unas chispas, un haz sobre los tejados. Ninguna decisión del
 * juego se toma aquí: si la sala no lo dijo, aquí no pasa.
 *
 * ═══ LAS DOS REGLAS DE LOS RELOJES ═══
 *
 *   · Las SEÑALES de juego (anillo, silbido, bala) van en el reloj VERDADERO: el anillo se cierra en el
 *     `impactoMs` que tradujo la sala a mi reloj, y el silbido muere en ese mismo instante (diseño §4.4:
 *     «anillos, balas, líneas de apuntado y silbidos van SIEMPRE en el reloj verdadero»).
 *   · El Remanso se pide al llegar el VEREDICTO (`resuelve` limpio contra mí): lo arbitrado se aplica
 *     siempre; el adorno, como mucho uno cada 2 s (lo decide `reloj.remansar`).
 *
 * ═══ EL ORDEN EN EL FOTOGRAMA ═══
 *
 * Se drena ANTES de que la partida escriba los cuerpos del fotograma: un `seva` quita la entidad de la
 * sala en cuanto llega, pero su cuerpo pintado sigue siendo el del fotograma anterior hasta que la
 * partida vuelva a escribir, y es ahí donde tiene que salir el desalojo o arrancar el Trasvase.
 */
import type { Barrio } from '../../../../shared/arcade/juegos/quiebro-barrio';
import { trenEn } from '../../../../shared/arcade/juegos/quiebro-barrio';
import { UNO } from '../../../../shared/mecanicas/fijo';
import { MOTIVO_DE_IRSE, PRIMER_NUMERO_DE_ENTIDAD, RESULTADO } from '../../../../shared/mecanicas/liza/protocolo';
import type { Gesto } from '../cuerpos';
import type { SistemaDeEfectos, VeredictoDelAnillo } from '../efectos';
import type { ManejoDelAnillo, Material, Sonido, TipoDeGolpe } from '../sonido';
import { desvioDelPulso } from '../sonido';
import type { Partida } from './partida';
import type { Novedad } from './sala-vista';

/** A qué altura salen las chispas de un golpe (el pecho) y a qué altura va el pecho que recoge. */
const ALTO_DEL_GOLPE = 1.3;
const ALTO_DEL_PECHO = 1.25;
/** A compás: ±75 ms del pulso (diseño §4.5). Aquí sólo afina el sonido; lo juzga la sala. */
const A_COMPAS_MS = 75;

/** El golpe de la Tanda que suena, por el gesto de quien lo lanza. */
function golpeDelGesto(g: Gesto): TipoDeGolpe {
  switch (g) {
    case 'seguida-1':
    case 'seguida-2':
      return 'seguida';
    case 'cierre':
      return 'cierre';
    case 'empellon':
      return 'empellon';
    case 'replica':
      return 'replica';
    default:
      return 'entrada';
  }
}

/** Cuánto pesa un golpe para las chispas y el parpadeo (0 un roce, 1 un Cierre). */
function fuerzaDelGesto(g: Gesto): number {
  switch (g) {
    case 'cierre':
    case 'replica':
      return 1;
    case 'empellon':
      return 0.8;
    case 'entrada':
      return 0.6;
    case 'golpe-de-prestado':
      return 0.45;
    default:
      return 0.4;
  }
}

/** El material contra el que se estampa, por el tipo de caja del barrio. */
function materialDeLaCaja(barrio: Barrio | null, caja: number): Material {
  const c = barrio?.cajas[caja - 1];
  if (c === undefined) return 'piedra';
  if (c.tipo === 'coche' || c.tipo === 'farola' || c.tipo === 'valla' || c.tipo === 'cabina') return 'chapa';
  if (c.tipo === 'quiosco' || c.tipo === 'quiosco-de-prensa') return 'cristal';
  return 'piedra';
}

export class Escenificador {
  private readonly anillos = new Map<number, { asa: number; silbido: ManejoDelAnillo | null }>();
  private readonly balas = new Map<number, number>();
  private readonly montones = new Map<number, number[]>();
  private haz: { zona: number; asa: number } | null = null;
  private trenPasando = false;
  /** Lo que el HUD enseña un momento: un golpe recibido (para el fogonazo rojo del borde). */
  ultimoGolpeRecibidoMs = Number.NEGATIVE_INFINITY;
  /** El último quiebro limpio mío (para el rótulo). */
  ultimoLimpioMs = Number.NEGATIVE_INFINITY;
  /** Una sacudida de cámara pendiente, de 0 a 1 (la lee la cámara y la gasta). */
  sacudida = 0;

  constructor(
    private readonly partida: Partida,
    private readonly sistema: SistemaDeEfectos,
    private readonly sonido: Sonido,
  ) {
    /* Los anillos y las líneas siguen a los cuerpos pintados: sus pies, en metros. */
    sistema.localizar = (quien, salida) => {
      const c = partida.pintadoDe(quien);
      if (c === null) return false;
      salida.x = c.x;
      salida.y = 0;
      salida.z = c.z;
      return true;
    };
  }

  /** Olvida lo que había en pantalla (otra noche, otro canal). */
  vaciar(): void {
    for (const a of this.anillos.values()) a.silbido?.cancelar();
    this.anillos.clear();
    this.balas.clear();
    this.montones.clear();
    this.haz = null;
    this.sistema.vaciar();
    this.sonido.cabina(null);
  }

  private sitio(numero: number): { x: number; z: number } | null {
    return this.partida.sitioDe(numero);
  }

  /** DRENA lo que dejó la partida y lo pone en escena. Una vez por fotograma, antes de `partida.fotograma`. */
  drenar(ahora: number): void {
    for (const p of this.partida.pulsacionesAtendidas.splice(0)) {
      if (p.boton === 'quiebro') this.sonido.sonar('quiebro', {});
      else {
        const gesto = this.partida.lectura?.gestoDeLaAccion(p.accion) ?? 'entrada';
        this.sonido.sonar('aire', { golpe: golpeDelGesto(gesto) });
      }
    }
    for (const n of this.partida.paraLaEscena.splice(0)) this.unaNovedad(n, ahora);
  }

  /** Lo que se hace en cada fotograma aunque no llegue nada: el Remanso que suena, el tren. */
  cadaFotograma(ahora: number, barrio: Barrio | null): void {
    this.sonido.remanso(this.sistema.reloj.intensidad(ahora));
    if (barrio !== null) {
      const tic = this.partida.ticDeLosDurmientes();
      const tren = trenEn(barrio, tic);
      if (tren !== null && !this.trenPasando) {
        const t = barrio.tren;
        const desde = t.eje === 'x' ? { x: t.sentido > 0 ? t.desde : t.hasta, y: t.alto, z: t.linea } : { x: t.linea, y: t.alto, z: t.sentido > 0 ? t.desde : t.hasta };
        const hasta = t.eje === 'x' ? { x: t.sentido > 0 ? t.hasta : t.desde, y: t.alto, z: t.linea } : { x: t.linea, y: t.alto, z: t.sentido > 0 ? t.hasta : t.desde };
        this.sonido.tren(desde, hasta, Math.abs(t.hasta - t.desde) / 14);
      }
      this.trenPasando = tren !== null;
    }
  }

  private unaNovedad(n: Novedad, ahora: number): void {
    if (n.tipo === 'dentro') {
      this.vaciar();
      return;
    }
    if (n.tipo !== 'suceso') return;
    const p = this.partida;
    const l = p.lectura;
    const yo = p.sala.yo;
    const s = n.suceso;
    switch (s.e) {
      case 'anuncio': {
        const a = n.anuncio;
        if (a === null || l === null) return;
        /* El anillo sólo se cierra sobre desvelados: los golpes de los desvelados no se esquivan en un anillo. */
        if (s.a < 1 || s.a >= PRIMER_NUMERO_DE_ENTIDAD) return;
        const propio = s.a === yo;
        const amenaza = l.amenazaDeLaAccion(s.acc);
        const asa = this.sistema.anillos.anunciar({ inicio: a.llegoMs, impacto: a.impactoMs, amenaza, propio, sobre: s.a });
        let silbido: ManejoDelAnillo | null = null;
        const autor = s.de === 0 ? { x: a.x, z: a.z } : (this.sitio(s.de) ?? { x: a.x, z: a.z });
        const fuerza = amenaza === 'prestado' ? 0.5 : 1;
        silbido = this.sonido.anillo(a.llegoMs, a.impactoMs, { x: autor.x, y: 1.4, z: autor.z }, propio ? fuerza : fuerza * 0.25);
        this.anillos.set(s.id, { asa, silbido });
        return;
      }
      case 'resuelve': {
        const a = n.anuncio;
        const anillo = this.anillos.get(s.id);
        this.anillos.delete(s.id);
        if (anillo !== undefined) {
          const veredicto: VeredictoDelAnillo | null =
            s.r === RESULTADO.limpia ? 'limpio' : s.r === RESULTADO.esquivada ? 'esquivado' : s.r === RESULTADO.da ? 'golpe' : s.r === RESULTADO.parada ? 'parado' : null;
          if (veredicto === null) {
            this.sistema.anillos.retirar(anillo.asa);
            anillo.silbido?.cancelar();
          } else this.sistema.anillos.resolver(anillo.asa, veredicto, ahora);
        }
        if (a === null || l === null) return;
        const gesto = a.de === 0 ? 'golpe-de-prestado' : l.gestoDeLaAccion(a.acc);
        const blanco = a.a > 0 ? this.sitio(a.a) : null;
        if (s.r === RESULTADO.limpia && a.a === yo) {
          this.sistema.reloj.remansar(ahora);
          this.ultimoLimpioMs = ahora;
          this.sonido.sonar('quiebro-limpio', {});
          return;
        }
        if (blanco === null) return;
        const posicion = { x: blanco.x, y: ALTO_DEL_GOLPE, z: blanco.z };
        if (s.r === RESULTADO.da) {
          const fuerza = fuerzaDelGesto(gesto);
          const dx = blanco.x - a.x;
          const dz = blanco.z - a.z;
          const largo = Math.hypot(dx, dz) || 1;
          this.sistema.impacto({ x: blanco.x, y: ALTO_DEL_GOLPE, z: blanco.z, fuerza, dx: dx / largo, dy: 0.2, dz: dz / largo }, ahora);
          const aCompas = a.de === yo && Math.abs(desvioDelPulso(this.sonido.pulso(), a.impactoMs)) <= A_COMPAS_MS;
          this.sonido.sonar('impacto', { golpe: golpeDelGesto(gesto), posicion, aCompas });
          this.sonido.sonar(fuerza >= 1 ? 'derribo' : 'cuerpo', { posicion, fuerza });
          if (a.a === yo) {
            this.ultimoGolpeRecibidoMs = ahora;
            this.sacudida = Math.max(this.sacudida, 0.6 + 0.4 * fuerza);
          } else if (a.de === yo) {
            /* El parón del impacto: se nota en la cámara (diseño §7, 60-100 ms). */
            this.sacudida = Math.max(this.sacudida, 0.35 + 0.4 * fuerza);
          }
        } else if (s.r === RESULTADO.parada) {
          this.sonido.sonar('guardia', { golpe: golpeDelGesto(gesto), posicion });
          this.sistema.impacto({ x: blanco.x, y: ALTO_DEL_GOLPE, z: blanco.z, fuerza: 0.3, color: 0xdcc2ff }, ahora);
        }
        return;
      }
      case 'impacta': {
        const asa = this.balas.get(s.bala);
        if (s.r === RESULTADO.da && asa !== undefined) {
          this.sistema.balas.acabar(asa, ahora);
          this.balas.delete(s.bala);
        }
        const blanco = this.sitio(s.a);
        if (s.r === RESULTADO.limpia && s.a === yo) {
          this.sistema.reloj.remansar(ahora);
          this.ultimoLimpioMs = ahora;
          this.sonido.sonar('quiebro-limpio', {});
        } else if (s.r === RESULTADO.da && blanco !== null) {
          this.sistema.impacto({ x: blanco.x, y: ALTO_DEL_GOLPE, z: blanco.z, fuerza: 0.5, color: 0xff5a24 }, ahora);
          this.sonido.sonar('cuerpo', { posicion: { x: blanco.x, y: ALTO_DEL_GOLPE, z: blanco.z }, fuerza: 0.6 });
          if (s.a === yo) {
            this.ultimoGolpeRecibidoMs = ahora;
            this.sacudida = Math.max(this.sacudida, 0.6);
          }
        }
        return;
      }
      case 'bala': {
        const b = n.bala;
        if (b === null) return;
        const asa = this.sistema.balas.disparar({ salida: b.salidaMs, x: b.x, y: 1.35, z: b.z, rumbo: b.r, fin: null });
        this.balas.set(b.id, asa);
        this.sonido.sonar('disparo', { posicion: { x: b.x, y: 1.35, z: b.z }, enMs: b.salidaMs });
        return;
      }
      case 'nace': {
        if (l === null) return;
        const clase = l.clase(s.clase);
        if (clase === null || clase.aparicion.modo !== 'imprimir') return;
        this.sistema.imprimir({ x: s.x / 100, y: 0, z: s.z / 100, silueta: s.id % 4 }, ahora);
        this.sonido.sonar('impresion', { posicion: { x: s.x / 100, y: 1, z: s.z / 100 } });
        return;
      }
      case 'seva': {
        const asaDeBala = this.balas.get(s.id);
        if (asaDeBala !== undefined) {
          this.sistema.balas.acabar(asaDeBala, ahora);
          this.balas.delete(s.id);
          return;
        }
        const asas = this.montones.get(s.id);
        if (asas !== undefined) {
          for (const asa of asas) this.sistema.esquirlas.quitar(asa);
          this.montones.delete(s.id);
          return;
        }
        const donde = this.sitio(s.id) ?? (n.entidad === null ? null : { x: n.entidad.x, z: n.entidad.z });
        if (donde === null) return;
        if (s.por === MOTIVO_DE_IRSE.rematada) {
          this.sistema.desalojar({ x: donde.x, y: 0, z: donde.z, silueta: s.id % 4 }, ahora);
          this.sonido.sonar('desalojo', { posicion: { x: donde.x, y: 1, z: donde.z } });
        } else if (s.por === MOTIVO_DE_IRSE.absorbida && s.quien !== 0) {
          this.sistema.trasvasar({ x: donde.x, y: 1.1, z: donde.z }, s.quien, ahora, s.id);
          this.sonido.sonar('trasvase', { posicion: { x: donde.x, y: 1, z: donde.z } });
        }
        return;
      }
      case 'monton': {
        const asas = this.sistema.soltarEsquirlas({ x: s.x / 100, y: 0, z: s.z / 100, cuantas: s.n, semilla: s.id }, ahora);
        this.montones.set(s.id, asas);
        return;
      }
      case 'recoge': {
        const asas = this.montones.get(s.id);
        const quien = this.sitio(s.a);
        if (asas !== undefined && quien !== null) {
          for (let i = 0; i < s.n && asas.length > 0; i++) {
            const asa = asas.pop() as number;
            this.sistema.recogerEsquirla(asa, { x: quien.x, y: ALTO_DEL_PECHO, z: quien.z }, ahora);
          }
          if (s.queda <= 0) this.montones.delete(s.id);
        }
        if (s.a === yo) this.sonido.sonar('esquirla', { cuenta: p.sala.lleva(yo, 1) });
        return;
      }
      case 'sale': {
        const quien = this.sitio(s.a);
        const cabina = this.cabinaDeLaZona(s.zona);
        if (quien !== null) {
          const auricular = cabina === null ? { x: quien.x, y: 1.5, z: quien.z } : { x: cabina.x, y: 1.5, z: cabina.z };
          const cable = [1, 2, 3, 4, 5, 6].map((k) => ({ x: auricular.x, y: auricular.y + k * 3, z: auricular.z }));
          this.sistema.salir({ x: quien.x, y: 0, z: quien.z, silueta: 4, auricular, cable }, ahora);
        }
        this.sonido.sonar('salida', quien === null ? {} : { posicion: { x: quien.x, y: 1.2, z: quien.z } });
        return;
      }
      case 'zona': {
        if (this.haz !== null) {
          this.sistema.apagarHaz(this.haz.asa, ahora);
          this.haz = null;
        }
        if (s.tics <= 0) {
          this.sonido.cabina(null);
          return;
        }
        const cabina = this.cabinaDeLaZona(s.id);
        if (cabina === null) return;
        this.haz = { zona: s.id, asa: this.sistema.encenderHaz(cabina.x, cabina.z, ahora) };
        this.sonido.cabina({ x: cabina.x, y: 2.2, z: cabina.z });
        return;
      }
      case 'aviso':
        this.sonido.sonar('aviso', {});
        return;
      case 'empuja': {
        if (s.caja === 0) return;
        const quien = this.sitio(s.a);
        if (quien === null) return;
        const rumbo = (s.r / 256) * Math.PI * 2;
        const metros = s.d / 100;
        const x = quien.x + Math.sin(rumbo) * metros;
        const z = quien.z - Math.cos(rumbo) * metros;
        this.sistema.impacto({ x, y: 1.1, z, fuerza: 1, dx: -Math.sin(rumbo), dy: 0.3, dz: Math.cos(rumbo) }, ahora + 200);
        this.sonido.sonar('estampado', { material: materialDeLaCaja(p.barrio, s.caja), posicion: { x, y: 1.1, z }, enMs: ahora + 200 });
        this.sacudida = Math.max(this.sacudida, 0.8);
        return;
      }
      default:
        return;
    }
  }

  /** El sitio de la cabina de la zona `id` de la Liza (el poste), en metros. */
  private cabinaDeLaZona(id: number): { x: number; z: number } | null {
    const l = this.partida.lectura;
    const barrio = this.partida.barrio;
    const z = l?.zona(id) ?? null;
    if (z === null) return null;
    const cx = (z.caja.x0 + z.caja.x1) / 2 / UNO;
    const cz = (z.caja.z0 + z.caja.z1) / 2 / UNO;
    if (barrio !== null) {
      let mejor: { x: number; z: number } | null = null;
      let lejos = Number.POSITIVE_INFINITY;
      for (const c of [...barrio.cabinas, barrio.refugio]) {
        const d = Math.hypot(c.poste.x - cx, c.poste.z - cz);
        if (d < lejos) {
          lejos = d;
          mejor = { x: c.poste.x, z: c.poste.z };
        }
      }
      if (mejor !== null && lejos < 6) return mejor;
    }
    return { x: cx, z: cz };
  }
}
