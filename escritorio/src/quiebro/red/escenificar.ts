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
 *   · Las SEÑALES de juego (anillo, silbido, línea de apuntado, bala) van en el reloj VERDADERO: el anillo
 *     se cierra en el `impactoMs` que tradujo la sala a mi reloj, y el silbido muere en ese mismo instante;
 *     la línea se fija en el `finMs` de su `apunta` (diseño §4.4: «anillos, balas, líneas de apuntado y
 *     silbidos van SIEMPRE en el reloj verdadero»).
 *   · La bala vuela con la velocidad y el alcance de SU proyectil en la declaración (`lectura.proyectil`):
 *     son los números con que la sala la juzga. Los de `efectos/cuentas.ts` quedan para el banco.
 *   · El Remanso se pide al llegar el VEREDICTO (`resuelve` limpio contra mí): lo arbitrado se aplica
 *     siempre; el adorno, como mucho uno cada 2 s (lo decide `reloj.remansar`).
 *
 * ═══ EL ORDEN EN EL FOTOGRAMA ═══
 *
 * Se drena ANTES de que la partida escriba los cuerpos del fotograma: un `seva` quita la entidad de la
 * sala en cuanto llega, pero su cuerpo pintado sigue siendo el del fotograma anterior hasta que la
 * partida vuelva a escribir, y es ahí donde tiene que salir el desalojo o arrancar el Trasvase.
 */
import { cajasDelLugar, posteDeLaZona, trenDelLugar, trenEnElLugar, velocidadDelTren } from './lugar';
import type { LugarDeLaNoche } from './lugar';
import { UNO } from '../../../../shared/mecanicas/fijo';
import { MOTIVO_DE_IRSE, PRIMER_NUMERO_DE_ENTIDAD, RESULTADO } from '../../../../shared/mecanicas/liza/protocolo';
import { paradaDeLaBalaEn } from '../../../../shared/mecanicas/liza/proyectiles';
import type { CuerpoPintado, Gesto } from '../cuerpos';
import type { SistemaDeEfectos, VeredictoDelAnillo } from '../efectos';
import { ALTO_DE_LA_BOCA_SIN_MANO, cargaDe, cargaDelNivel, estadoDelRayoApagado, nivelDeLaCarga, nivelDelProyectil, semillaDelRayo } from '../rayo/contrato';
import type { EstadoDelRayo, NivelLeido, PuntoDelRayo, TiroLeido } from '../rayo/contrato';
import type { BalaVista, EstadoVisto } from './sala-vista';
import type { ManejoDelAnillo, Material, Sonido, TipoDeGolpe } from '../sonido';
import { desvioDelPulso } from '../sonido';
import { RayoQueSuena } from '../sonido/rayo';
import type { Partida } from './partida';
import type { Novedad } from './sala-vista';

/** A qué altura salen las chispas de un golpe (el pecho) y a qué altura va el pecho que recoge. */
const ALTO_DEL_GOLPE = 1.3;
const ALTO_DEL_PECHO = 1.25;
/** A compás: ±75 ms del pulso (diseño §4.5). Aquí sólo afina el sonido; lo juzga la sala. */
const A_COMPAS_MS = 75;
/**
 * LA CARGA AJENA que deja de verse sin que llegue su `bala` se cancela pasado este margen (ms): el `estado` que la
 * acaba y la `bala` que la suelta pueden llegar en tics distintos, y cancelar antes apagaría un rayo que sí sale.
 */
const GRACIA_DE_LA_CARGA_AJENA_MS = 250;
/** Un pleno ajeno que estalla a menos de esto de mí sacude la cámara (m). */
const SACUDE_EL_RAYO_AJENO_M = 12;
/**
 * El corro de un cuerpo para predecir dónde lo para el rayo de otro (m): el del cuerpo y algo del ancho del rayo.
 * Aproximado a propósito (lo exacto es de la sala, y llega con su `estalla`).
 */
const CORRO_DEL_CUERPO_M = 0.5;

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

/**
 * El material contra el que se estampa, por el tipo de la caja (la del barrio o la de la ciudad: el índice
 * del `empuja` es el de las cajas del mundo más uno, y las del lugar van en ese orden).
 */
function materialDeLaCaja(lugar: LugarDeLaNoche | null, caja: number): Material {
  const c = cajasDelLugar(lugar)[caja - 1];
  if (c === undefined) return 'piedra';
  switch (c.tipo) {
    case 'coche':
    case 'farola':
    case 'valla':
    case 'cabina':
    case 'contenedor':
    case 'carretilla':
    case 'corte':
    case 'refugio':
      return 'chapa';
    case 'quiosco':
    case 'quiosco-de-prensa':
      return 'cristal';
    default:
      return 'piedra';
  }
}

export class Escenificador {
  private readonly anillos = new Map<number, { asa: number; silbido: ManejoDelAnillo | null }>();
  private readonly balas = new Map<number, number>();
  /** La línea de apuntado de cada entidad que apunta: su asa en `sistema.apuntados`. */
  private readonly apuntados = new Map<number, number>();
  private readonly montones = new Map<number, number[]>();
  private haz: { zona: number; asa: number } | null = null;
  private trenPasando = false;
  /** Lo que el HUD enseña un momento: un golpe recibido (para el fogonazo rojo del borde). */
  ultimoGolpeRecibidoMs = Number.NEGATIVE_INFINITY;
  /** El último quiebro limpio mío (para el rótulo). */
  ultimoLimpioMs = Number.NEGATIVE_INFINITY;
  /** Una sacudida de cámara pendiente, de 0 a 1 (la lee la cámara y la gasta). */
  sacudida = 0;
  /** El rayo con su sonido: envuelve el `sistema.rayo` que había y delega en él (CONTRATO §5.8). */
  private readonly rayoQueSuena: RayoQueSuena;
  /**
   * LAS CARGAS AJENAS, por asiento: desde cuándo carga (la llegada de su `estado` de cargar; `NaN` si no carga), cuándo
   * dejó de verse cargando (`NaN` mientras carga), si este fotograma se ha visto cargando, y el estado que se le pasa a
   * `actualizarCarga` (uno por asiento, hecho la primera vez).
   */
  private readonly cargaAjenaDesde = new Float64Array(PRIMER_NUMERO_DE_ENTIDAD).fill(Number.NaN);
  private readonly cargaAjenaDejo = new Float64Array(PRIMER_NUMERO_DE_ENTIDAD).fill(Number.NaN);
  /** La carga que ya salió (su `desdeMs`): si su estado de cargar sigue un momento en la sala, no vuelve a empezar. */
  private readonly cargaAjenaSoltada = new Float64Array(PRIMER_NUMERO_DE_ENTIDAD).fill(Number.NaN);
  private readonly cargaAjenaVista = new Uint8Array(PRIMER_NUMERO_DE_ENTIDAD);
  private readonly estadoAjeno: (EstadoDelRayo | undefined)[] = [];
  private ahoraDelFotograma = 0;

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
    /*
     * EL RAYO SUENA: el envoltorio delega TODO en el `sistema.rayo` que había (el de los efectos, o el espía de quien
     * prueba), y si ya era uno de éstos (otra partida con el mismo sistema), en el de debajo: no se envuelve dos veces.
     */
    this.rayoQueSuena = new RayoQueSuena(
      sistema.rayo,
      sonido,
      (quien) => quien === partida.sala.yo,
      (quien, salida) => {
        if (sistema.boca !== null && sistema.boca(quien, salida)) return true;
        if (sistema.localizar === null || !sistema.localizar(quien, salida)) return false;
        salida.y = ALTO_DE_LA_BOCA_SIN_MANO;
        return true;
      },
    );
    sistema.rayo = this.rayoQueSuena;
  }

  /** Olvida lo que había en pantalla (otra noche, otro canal). */
  vaciar(): void {
    for (const a of this.anillos.values()) a.silbido?.cancelar();
    this.anillos.clear();
    this.balas.clear();
    this.apuntados.clear();
    this.montones.clear();
    this.haz = null;
    this.sistema.vaciar();
    this.sonido.cabina(null);
    this.rayoQueSuena.callar();
    this.cargaAjenaDesde.fill(Number.NaN);
    this.cargaAjenaDejo.fill(Number.NaN);
    this.cargaAjenaSoltada.fill(Number.NaN);
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
  cadaFotograma(ahora: number, lugar: LugarDeLaNoche | null): void {
    this.sonido.remanso(this.sistema.reloj.intensidad(ahora));
    /* Quién mira esta pantalla: su carga oscurece los bordes y su pleno da el fogonazo (`efectos/rayo.ts`). */
    this.sistema.rayos.yo = this.partida.sala.yo;
    this.lasCargasAjenas(ahora);
    if (lugar !== null) {
      const tic = this.partida.ticDeLosDurmientes();
      const tren = trenEnElLugar(lugar, tic);
      if (tren !== null && !this.trenPasando) {
        const t = trenDelLugar(lugar);
        const desde = t.eje === 'x' ? { x: t.sentido > 0 ? t.desde : t.hasta, y: t.alto, z: t.linea } : { x: t.linea, y: t.alto, z: t.sentido > 0 ? t.desde : t.hasta };
        const hasta = t.eje === 'x' ? { x: t.sentido > 0 ? t.hasta : t.desde, y: t.alto, z: t.linea } : { x: t.linea, y: t.alto, z: t.sentido > 0 ? t.hasta : t.desde };
        this.sonido.tren(desde, hasta, Math.abs(t.hasta - t.desde) / velocidadDelTren(lugar));
      }
      this.trenPasando = tren !== null;
    }
  }

  /**
   * LAS CARGAS AJENAS (CONTRATO §5.2): el estado de cargar de cada asiento que no soy yo (por la foto o por su suceso
   * `estado`) empieza su carga y la pone al día; si deja de verse sin que llegue su `bala`, pasada la gracia, se
   * cancela. La carga ajena no viaja: sale de lo que lleva en su estado, con la cuenta de su tiro (`cargaDe`). Sin
   * `sala.estados` (una partida de prueba que no los da), no hay cargas ajenas. No asigna por fotograma.
   */
  private lasCargasAjenas(ahora: number): void {
    const estados = (this.partida.sala as { readonly estados?: unknown }).estados;
    if (this.partida.lectura === null || !(estados instanceof Map)) return;
    this.ahoraDelFotograma = ahora;
    this.cargaAjenaVista.fill(0);
    (estados as Map<number, EstadoVisto>).forEach(this.verUnEstado);
    const rayo = this.sistema.rayo;
    for (let quien = 1; quien < PRIMER_NUMERO_DE_ENTIDAD; quien++) {
      const desde = this.cargaAjenaDesde[quien] as number;
      if (Number.isNaN(desde) || this.cargaAjenaVista[quien] === 1) continue;
      const dejo = this.cargaAjenaDejo[quien] as number;
      if (Number.isNaN(dejo)) this.cargaAjenaDejo[quien] = ahora;
      else if (ahora - dejo >= GRACIA_DE_LA_CARGA_AJENA_MS) {
        this.cargaAjenaDesde[quien] = Number.NaN;
        this.cargaAjenaDejo[quien] = Number.NaN;
        rayo.cancelarCarga(quien, ahora);
      }
    }
  }

  /** Un estado de la sala, en el fotograma de `ahoraDelFotograma`: si es un asiento ajeno que carga, su carga. */
  private readonly verUnEstado = (e: EstadoVisto, quien: number): void => {
    const ahora = this.ahoraDelFotograma;
    const l = this.partida.lectura;
    if (l === null || quien < 1 || quien >= PRIMER_NUMERO_DE_ENTIDAD || quien === this.partida.sala.yo) return;
    if (ahora >= e.hastaMs || l.sentidoDelEstado(e.est) !== 'cargando' || e.desdeMs === this.cargaAjenaSoltada[quien]) return;
    const tiro = l.tiroDelAsiento(quien);
    if (tiro === null) return;
    const rayo = this.sistema.rayo;
    if (Number.isNaN(this.cargaAjenaDesde[quien] as number) || (this.cargaAjenaDesde[quien] as number) !== e.desdeMs) {
      this.cargaAjenaDesde[quien] = e.desdeMs;
      rayo.empezarCarga(quien, e.desdeMs);
    }
    this.cargaAjenaVista[quien] = 1;
    this.cargaAjenaDejo[quien] = Number.NaN;
    let estado = this.estadoAjeno[quien];
    if (estado === undefined) {
      estado = estadoDelRayoApagado();
      this.estadoAjeno[quien] = estado;
    }
    const lleva = Math.max(0, ahora - e.desdeMs);
    const nivel = nivelDeLaCarga(tiro, lleva);
    estado.activo = true;
    estado.desdeMs = e.desdeMs;
    estado.c = cargaDe(tiro, lleva);
    estado.nivel = nivel.nivel;
    estado.blanco = 0;
    estado.area = nivel.area;
    estado.alcance = nivel.alcance;
    rayo.actualizarCarga(quien, estado, ahora);
  };

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
        /*
         * EL RAYO: la bala de un tiro de asiento (`de` es un asiento y `p` la bala de uno de sus niveles) no es una
         * bala del tirador. La propia ya la soltó MANDOS al soltar el dedo; la ajena se suelta aquí.
         */
        const tiro = l === null || b.de < 1 || b.de >= PRIMER_NUMERO_DE_ENTIDAD ? null : l.tiroDelAsiento(b.de);
        const nivel = tiro === null ? null : nivelDelProyectil(tiro, b.p);
        if (tiro !== null && nivel !== null) {
          if (b.de !== yo) this.soltarUnRayoAjeno(b, tiro, nivel);
          return;
        }
        const pr = l === null ? null : l.proyectil(b.p);
        const asa = this.sistema.balas.disparar({
          salida: b.salidaMs,
          x: b.x,
          y: 1.35,
          z: b.z,
          rumbo: b.r,
          fin: null,
          ...(pr === null ? {} : { velocidad: pr.velocidad / UNO, alcance: pr.alcance / UNO }),
        });
        this.balas.set(b.id, asa);
        this.sonido.sonar('disparo', { posicion: { x: b.x, y: 1.35, z: b.z }, enMs: b.salidaMs });
        return;
      }
      case 'apunta': {
        /* Otro `apunta` de la misma entidad sustituye al anterior; con `a` 0, lo deja sin disparar. */
        const antes = this.apuntados.get(s.de);
        if (antes !== undefined) {
          this.sistema.apuntados.retirar(antes);
          this.apuntados.delete(s.de);
        }
        const ap = n.apuntado;
        if (s.a === 0 || ap === null) return;
        this.apuntados.set(s.de, this.sistema.apuntados.apuntar({ inicio: ahora, fin: ap.finMs, desde: s.de, hacia: s.a }));
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
        /* Quien se va deja de apuntar. Si ya disparó, la línea se fue sola (se fija y se apaga). */
        const linea = this.apuntados.get(s.id);
        if (linea !== undefined) {
          this.sistema.apuntados.retirar(linea);
          this.apuntados.delete(s.id);
        }
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
        this.sonido.sonar('estampado', { material: materialDeLaCaja(p.lugar, s.caja), posicion: { x, y: 1.1, z }, enMs: ahora + 200 });
        this.sacudida = Math.max(this.sacudida, 0.8);
        return;
      }
      case 'estalla': {
        /* EL RAYO se para (el propio también): el estallido va donde lo dice la sala, con el área de su nivel. */
        const b = n.bala;
        const tiro = b === null || l === null ? null : l.tiroDelAsiento(b.de);
        const nivel = b === null || tiro === null ? null : nivelDelProyectil(tiro, b.p);
        this.sistema.rayo.estallar({
          quien: b?.de ?? 0,
          bala: s.bala,
          x: s.x / 100,
          y: ALTO_DE_LA_BOCA_SIN_MANO,
          z: s.z / 100,
          nivel: nivel?.nivel ?? 0,
          area: nivel?.area ?? 0,
          t: ahora,
        });
        /* Un rayo ajeno cargado que estalla cerca de mí me sacude (el propio lo sacude la cámara al soltar). */
        if (b !== null && b.de !== yo && tiro !== null && nivel !== null) {
          const c = cargaDelNivel(tiro, nivel);
          const mio = yo > 0 ? this.sitio(yo) : null;
          if (mio !== null && c >= 0.5) {
            const d = Math.hypot(s.x / 100 - mio.x, s.z / 100 - mio.z);
            if (d < SACUDE_EL_RAYO_AJENO_M) this.sacudida = Math.max(this.sacudida, 0.7 * c * (1 - d / SACUDE_EL_RAYO_AJENO_M));
          }
        }
        return;
      }
      default:
        return;
    }
  }

  /**
   * EL RAYO DE OTRO (`rayo/contrato.ts`): de su `bala`, un `DisparoDelRayo` —desde su boca, hacia su rumbo hasta
   * donde se para contra la estructura (la misma cuenta que la sala: `paradaDeLaBalaEn`), o hasta el alcance de su
   * nivel si esa cuenta no se puede hacer— que se suelta en el sistema. Contra un cuerpo lo para luego su `estalla`.
   */
  private soltarUnRayoAjeno(b: BalaVista, tiro: TiroLeido, nivel: NivelLeido): void {
    /* Sale: su carga ya no se cancela (la acaba `soltar`), ni vuelve a empezar si su estado de cargar tarda en irse. */
    if (b.de > 0 && b.de < PRIMER_NUMERO_DE_ENTIDAD) {
      this.cargaAjenaSoltada[b.de] = this.cargaAjenaDesde[b.de] as number;
      this.cargaAjenaDesde[b.de] = Number.NaN;
      this.cargaAjenaDejo[b.de] = Number.NaN;
    }
    const origen: PuntoDelRayo = { x: b.x, y: ALTO_DE_LA_BOCA_SIN_MANO, z: b.z };
    if (this.sistema.boca !== null) this.sistema.boca(b.de, origen);
    const rumbo = (b.r / 256) * Math.PI * 2;
    /* Hasta la estructura, o antes si se cruza un cuerpo (lo que diga luego su `estalla`, si cae en él, lo recorta). */
    const alcance = this.primerCuerpoEnElRayo(b.x, b.z, rumbo, this.paradaDelRayo(b, nivel));
    const destino: PuntoDelRayo = { x: origen.x + Math.sin(rumbo) * alcance, y: origen.y, z: origen.z - Math.cos(rumbo) * alcance };
    this.sistema.rayo.soltar({
      quien: b.de,
      bala: b.id,
      origen,
      destino,
      nivel: nivel.nivel,
      c: cargaDelNivel(tiro, nivel),
      area: nivel.area,
      dio: null,
      semilla: semillaDelRayo(b.de, b.id),
      t: b.salidaMs,
    });
  }

  /**
   * HASTA DÓNDE LLEGA EL RAYO DE OTRO, en metros: lo que su bala recorre antes de pararse contra la estructura o el
   * límite de la fase, con la cuenta de la sala (en Q16.16, desde donde salió la bala). Si la cuenta no se puede
   * hacer (una liza sin su proyectil, un número fuera de rango), el alcance entero de su nivel.
   */
  private paradaDelRayo(b: BalaVista, nivel: NivelLeido): number {
    const l = this.partida.lectura;
    const pr = l === null ? null : l.proyectil(b.p);
    if (l === null || pr === null) return nivel.alcance;
    try {
      const { parada } = paradaDeLaBalaEn(l.liza, l.arena, Math.round(b.x * UNO), Math.round(b.z * UNO), b.r, pr);
      const metros = parada / UNO;
      return Number.isFinite(metros) && metros > 0 ? Math.min(nivel.alcance, metros) : nivel.alcance;
    } catch {
      return nivel.alcance;
    }
  }

  /**
   * DÓNDE SE CRUZA UN CUERPO con el rayo de otro que sale de `(x, z)` hacia `rumbo`, en metros (o `hasta` si ninguno
   * antes): el primer enemigo pintado (una entidad: sin fuego amigo) cuyo corro toca la recta. Es una PREDICCIÓN, como
   * la del rayo propio: la sala lo dice con su `estalla` un tic después, y así el canal no se dibuja atravesando al
   * enemigo para luego saltar. Sin cuerpos que mirar (una partida de prueba que no los da), `hasta`.
   */
  private primerCuerpoEnElRayo(x: number, z: number, rumbo: number, hasta: number): number {
    const fuente = this.partida as { cuerpos?: () => readonly CuerpoPintado[] };
    const cuerpos = typeof fuente.cuerpos === 'function' ? fuente.cuerpos() : null;
    if (cuerpos === null) return hasta;
    const fx = Math.sin(rumbo);
    const fz = -Math.cos(rumbo);
    let primero = hasta;
    for (const c of cuerpos) {
      if (c.id < PRIMER_NUMERO_DE_ENTIDAD || c.gesto === 'desalojable' || c.gesto === 'imprimirse') continue;
      const ex = c.x - x;
      const ez = c.z - z;
      const a = ex * fx + ez * fz;
      const lado = ex * fz - ez * fx;
      if (a <= 0 || Math.abs(lado) >= CORRO_DEL_CUERPO_M) continue;
      /* Donde el rayo entra en su corro. */
      const d = a - Math.sqrt(CORRO_DEL_CUERPO_M * CORRO_DEL_CUERPO_M - lado * lado);
      if (d > 0.3 && d < primero) primero = d;
    }
    return primero;
  }

  /** El sitio de la cabina de la zona `id` de la Liza (el poste), en metros. */
  private cabinaDeLaZona(id: number): { x: number; z: number } | null {
    const l = this.partida.lectura;
    const z = l?.zona(id) ?? null;
    if (z === null) return null;
    const cx = (z.caja.x0 + z.caja.x1) / 2 / UNO;
    const cz = (z.caja.z0 + z.caja.z1) / 2 / UNO;
    const poste = posteDeLaZona(this.partida.lugar, id, cx, cz);
    return poste === null ? { x: cx, z: cz } : { x: poste.x, z: poste.z };
  }
}
