/**
 * LA PARTIDA EN EL APARATO: el canal, lo predicho, lo interpolado y lo guionizado, juntos en un bucle.
 *
 * ═══ QUÉ HACE, POR FOTOGRAMA ═══
 *
 *   1. Atiende las pulsaciones que dejaron los mandos (con el `timeStamp` de su evento) y las convierte
 *      en acciones del cable: qué es GOLPE ahora (la Entrada, el eslabón siguiente de la Tanda o la
 *      Réplica), a quién va (el enganche), qué hace USAR aquí (rematar, rescatar o descolgar).
 *   2. Da los tics que tocan en el reloj del canal: cada uno simula el paso propio (`prediccion.ts`) y
 *      manda su `aqui` con la acción de ese tic dentro. Uno por tic, aunque un fotograma se coma tres:
 *      la sala valida cada tramo en recta, y el tramo de tres tics puede cortar una esquina que los tres
 *      pasos rodearon.
 *   3. Aplica lo que llegó de la sala (`sala-vista.ts`) a lo que es del juego: mi estado, mis
 *      correcciones, mis empujones, los guiones de los demás, los durmientes que ahora son Prestados.
 *   4. Escribe los cuerpos de este fotograma para quien los pinta (`FuenteDeCuerpos` de `cuerpos.ts`).
 *
 * Las novedades que hay que VER y OÍR (un anillo, un golpe, una bala) las deja en `paraLaEscena`: las
 * recoge `escenificar.ts`, que habla con los efectos y el sonido. Esta clase no sabe de three ni de
 * WebAudio, y así se prueba en Node con un enchufe de mentira.
 *
 * ═══ LO QUE NO HACE ═══
 *
 * No juzga nada. Ningún golpe «da» aquí, ningún quiebro «es limpio» aquí: el aparato empieza la
 * animación al pulsar (el cuerpo responde en el mismo fotograma, diseño §7) y la sala dice lo que pasó.
 * Si la sala no concede lo que el aparato empezó —un quiebro pulsado en un estado que no lo deja—, el
 * paso que se dio de más vuelve con una corrección suave.
 */
import { RUMBOS, rumboDeRadianes, radianesDelRumbo } from '../../../../shared/mecanicas/andar';
import { UNO } from '../../../../shared/mecanicas/fijo';
import { sePuedeEstar } from '../../../../shared/mecanicas/mundo';
import { MS_POR_TIC, numeroDelAsiento } from '../../../../shared/mecanicas/liza/declaracion';
import type { AccionDeclarada, IdDeclarado, LizaDeclarada } from '../../../../shared/mecanicas/liza/declaracion';
import {
  AVISO_CADA_MS,
  CODIGO_DE_MODO,
  MOTIVO_DE_IRSE,
  PRIMER_NUMERO_DE_ENTIDAD,
  RESULTADO,
  RETRASO_DE_LOS_DEMAS_MS,
  TOPE_DE_AQUIS_DE_GOLPE,
} from '../../../../shared/mecanicas/liza/protocolo';
import type { AccionDelAparato, MensajeDeLaSala } from '../../../../shared/mecanicas/liza/protocolo';
import type { Barrio } from '../../../../shared/arcade/juegos/quiebro-barrio';
import { durmienteMasCercano } from '../../../../shared/arcade/juegos/quiebro-durmientes';
import { QUIEBRO_DEL_DESVELADO } from '../../../../shared/arcade/juegos/quiebro-reglas';
import type { ClaseDeCuerpo, CuerpoPintado, FuenteDeCuerpos, Gesto } from '../cuerpos';
import type { Boton, EstadoDeLosMandos } from '../mandos/estado';
import { direccionDeLaPalanca } from '../mandos/estado';
import { direccionHacia, elegirBlanco } from '../mandos/enganche';
import type { Candidato } from '../mandos/enganche';
import { CanalDeLaLiza } from './canal';
import type { EstadoDelCanal, FabricaDeEnchufes, Relojes } from './canal';
import { leerLaLiza } from './diccionario';
import type { LecturaDeLaLiza, SentidoDelEstado } from './diccionario';
import { EMPUJON_MS, LineaDelCuerpo, pintadoNuevo } from './guion';
import { muestraNueva } from './interpolacion';
import { PasoPropio } from './prediccion';
import type { RelojDelCanal } from './reloj';
import { SalaVista } from './sala-vista';
import type { AnuncioVisto, Novedad } from './sala-vista';

/** Los colores de asiento (contorno y forro): saturados, distintos del ámbar del jugador y del verde del código. */
export const COLORES_DE_ASIENTO: readonly string[] = ['#ff4d6d', '#46c8ff', '#b4ff4a', '#c38bff', '#ff9a3c', '#fff04d'];

/**
 * Cuántos tics se MANDAN de golpe como mucho tras una parada (una pestaña que vuelve de estar oculta no
 * manda 400 `aqui`). Es el `TOPE_DE_AQUIS_DE_GOLPE` del protocolo: la sala cuenta con que no pase de ahí
 * para distinguir una pestaña frenada (que se salta tics) de una despierta (ver `AQUIS_PARA_ESTAR`).
 */
const TICS_DE_GOLPE = TOPE_DE_AQUIS_DE_GOLPE;
/** Lo más atrás que se simula tras una parada larga: dos segundos. */
const TICS_QUE_SE_RECUPERAN = 40;
/** Para correr sin Mayúsculas: palanca a fondo 0,8 s y sin enemigos a menos de 8 m (diseño §4.2). */
const A_FONDO_PARA_CORRER_MS = 800;
const ENEMIGOS_QUE_IMPIDEN_CORRER_M = 8;
/** Enemigos a menos de esto abren la cámara (diseño §7). */
const ENEMIGOS_QUE_ABREN_LA_CAMARA_M = 5;
/** El gesto de un golpe propio dura hasta el impacto y esto más (la recuperación que se ve). */
const COLA_DEL_GOLPE_MS = 260;
/** Lo que dura el viaje de mi quiebro: los seis primeros tics (diseño §4.3). */
const TICS_DEL_VIAJE_DEL_QUIEBRO = 6;
/** Lo que la sala admite de más sobre el quiebro, en Q16.16: no se anda (ver `empezarElQuiebro`). */
const HOLGURA_DEL_QUIEBRO = Math.round(QUIEBRO_DEL_DESVELADO.holguraMetros * UNO);
/** Lo que tarda en llegar un empujón que recibo. */
const TICS_DEL_EMPUJON = Math.round(EMPUJON_MS / MS_POR_TIC);
/** En el Apagón, más allá de esto los enemigos no llevan contorno (diseño §6.3). */
const CONTORNO_EN_EL_APAGON_M = 15;
/** Los ms que se tarda en girar la cara hacia donde se va. */
const GIRO_DE_LA_CARA_S = 0.09;
/** Lo que dura el rótulo «de vuelta» tras dejar de estar ausente. */
export const ROTULO_DE_LA_VUELTA_MS = 2500;

/** Lo que USAR hace aquí y ahora (para el botón y para el cable). */
export interface UsoPosible {
  readonly que: 'rematar' | 'rescatar' | 'descolgar';
  readonly accion: IdDeclarado;
  readonly blanco: number;
  /** Cuánto hay que mantener, en ms. */
  readonly mantenerMs: number;
}

/** Mi gesto propio, empezado al pulsar (no espera a la sala). */
interface GestoPropio {
  gesto: Gesto;
  desdeMs: number;
  impactoMs: number | null;
  hastaMs: number;
  direccion: number | null;
  accion: IdDeclarado;
}

/** Mi último golpe anunciado: con él se encadena la Tanda. */
interface Eslabon {
  readonly accion: IdDeclarado;
  readonly impactoMs: number;
}

export interface OpcionesDeLaPartida {
  readonly direccion: string;
  readonly llave: string;
  readonly fabrica: FabricaDeEnchufes;
  readonly relojes: Relojes;
  readonly mandos: EstadoDeLosMandos;
}

/** Un botón pulsado y lo que se mandó por él, para la escena (el aire del golpe, el sonido del quiebro). */
export interface PulsacionAtendida {
  readonly boton: Boton;
  readonly accion: IdDeclarado;
  readonly t: number;
  readonly blanco: number;
}

export class Partida implements FuenteDeCuerpos {
  readonly sala = new SalaVista();
  readonly canal: CanalDeLaLiza;
  readonly mandos: EstadoDeLosMandos;
  lectura: LecturaDeLaLiza | null = null;
  barrio: Barrio | null = null;
  paso: PasoPropio | null = null;
  /** La cámara mira hacia aquí (radianes, convenio de `andar.ts`): la palanca empuja relativa a ella. */
  giroDeLaCamara = 0;
  /** Lo que tiene que ver y oír la escena. Lo vacía `escenificar`. */
  readonly paraLaEscena: Novedad[] = [];
  readonly pulsacionesAtendidas: PulsacionAtendida[] = [];
  /** El estilo de cada asiento por número (para la figura): lo pone quien lee la vista. */
  estilos: readonly number[] = [];

  private relojActual: RelojDelCanal | null = null;
  private ultimoTicSimulado = -1;
  private ultimoEnviado = -1;
  /** Dónde estaba al empezar y al acabar el último tic simulado (Q16.16), para pintar entre los dos. */
  private antesX = 0;
  private antesZ = 0;
  private tengoCuerpo = true;
  private recolocarDesdeLaFoto = false;
  private readonly pendientes: AccionDelAparato[] = [];
  private sostenida: { accion: IdDeclarado; ms: number; blanco: number; desdeMs: number } | null = null;
  private gesto: GestoPropio | null = null;
  private eslabon: Eslabon | null = null;
  private ultimoAvisoMs = Number.NEGATIVE_INFINITY;
  private miraPropia = 0;
  private miraPintada = 0;
  private pintadoAntesX = Number.NaN;
  private pintadoAntesZ = Number.NaN;
  private velocidadPintada = 0;
  /** El blanco enganchado ahora (0 = ninguno). */
  blanco = 0;
  /** Quien falló el último golpe contra mi quiebro limpio: a quien va la Réplica. */
  private autorDelLimpio = 0;
  /**
   * LA ACOMETIDA A MEDIAS: tras el vuelo hacia el tirador, el avance de la acción que la sala lanzó con él
   * (la Réplica), si al acabar de volar aún no llego. La sala juzga el golpe con el vuelo y ese avance
   * juntos (`contraProyectil` en `declaracion.ts`): sin él, un tirador a más de diez metros y pico se
   * quedaba fuera de alcance.
   */
  private acometidaPendiente: { tirador: number; accion: IdDeclarado } | null = null;
  /** ¿Se ha dado ya algún paso en esta partida? (el rótulo «Muévete» de la primera noche). */
  seHaMovido = false;
  /**
   * AL FONDO (`mandos/fondo.ts`): la pestaña oculta, la página que se va o la app en segundo plano. Callado,
   * el aparato no da tics ni manda `aqui`, y la sala lo da por ausente a los 2 s; al volver, la parada se
   * recupera como cualquier otra (se simulan los tics perdidos y salen como mucho `TICS_DE_GOLPE`).
   */
  private callada = false;
  /** Desde cuándo la sala me tiene por ausente (ms de `performance.now()`), o `null`. */
  private ausenteDesdeMs: number | null = null;
  /** Cuándo volví de estar ausente (el primer estado que no lo es), para el rótulo de la vuelta. */
  private vueltaMs = Number.NEGATIVE_INFINITY;
  /**
   * La avería del Apagón (diseño §6.3): los enemigos pierden el contorno a más de 15 m, igual en todos
   * los aparatos. Lo pone quien lee la vista.
   */
  apagon = false;
  private readonly lineas = new Map<number, LineaDelCuerpo>();
  /** Entidad → durmiente del que salió (los Prestados). */
  private readonly prestadosPorEntidad = new Map<number, number>();
  private readonly conjuntoDePrestados = new Set<number>();
  private readonly cuerposPintados: CuerpoPintado[] = [];
  private readonly porNumero = new Map<number, CuerpoPintado>();
  private readonly muestra = muestraNueva();
  private readonly pintado = pintadoNuevo();
  /** El «ahora» del último fotograma (ms de `performance.now()`): para las preguntas que no lo reciben. */
  private ultimoAhora = 0;

  constructor(o: OpcionesDeLaPartida) {
    this.mandos = o.mandos;
    this.canal = new CanalDeLaLiza({
      direccion: o.direccion,
      llave: o.llave,
      fabrica: o.fabrica,
      relojes: o.relojes,
      alMensaje: (m, reloj) => this.alMensaje(m, reloj, o.relojes.ahora()),
      alAbrir: (reloj) => {
        this.relojActual = reloj;
        this.sala.nuevoCanal();
        this.olvidarLoDelReloj();
      },
    });
  }

  /* ─────────────────────────── La declaración ─────────────────────────── */

  /**
   * La vista de la mesa cambió: la liza que sale de ella (o `null` si no se lee), el barrio de la noche
   * y mi asiento. No abre ni cierra el canal: eso lo decide `asegurarElCanal`.
   */
  ponerLaDeclaracion(liza: LizaDeclarada | null, barrio: Barrio | null, asiento: string | null): void {
    this.barrio = barrio;
    if (liza === null) {
      this.lectura = null;
      return;
    }
    const numero = this.sala.yo > 0 ? this.sala.yo : asiento === null ? 0 : numeroDelAsiento(liza, asiento);
    this.lectura = leerLaLiza(liza, numero);
    const reglas = this.lectura.reglas;
    if (reglas === null) return;
    if (this.paso === null) this.paso = new PasoPropio(this.lectura.arena, reglas.cuerpo);
    else this.paso.cambiarDeReglas(this.lectura.arena, reglas.cuerpo);
  }

  /** Abre el canal si hay que jugar y cierra si no. */
  asegurarElCanal(hayQueJugar: boolean): void {
    if (hayQueJugar) this.canal.abrir();
    else if (this.canal.estado().tipo !== 'cerrado') this.canal.cerrar();
  }

  estadoDelCanal(): EstadoDelCanal {
    return this.canal.estado();
  }

  cerrar(): void {
    this.canal.cerrar();
  }

  /* ─────────────────────────── Lo que llega ─────────────────────────── */

  private olvidarLoDelReloj(): void {
    this.ultimoTicSimulado = -1;
    this.ultimoEnviado = -1;
    this.pendientes.length = 0;
    this.sostenida = null;
    this.eslabon = null;
    this.gesto = null;
    this.acometidaPendiente = null;
  }

  private alMensaje(m: MensajeDeLaSala, reloj: RelojDelCanal, ahora: number): void {
    this.sala.aplicar(m, ahora, reloj);
    /* Lo que es del juego se atiende en el acto: una corrección no espera al fotograma. */
    while (this.sala.novedades.length > 0) {
      const n = this.sala.novedades.shift() as Novedad;
      this.atender(n, ahora);
      this.paraLaEscena.push(n);
    }
  }

  private atender(n: Novedad, ahora: number): void {
    const lectura = this.lectura;
    switch (n.tipo) {
      case 'dentro': {
        this.olvidarLoDelReloj();
        this.lineas.clear();
        this.prestadosPorEntidad.clear();
        this.conjuntoDePrestados.clear();
        this.tengoCuerpo = true;
        this.recolocarDesdeLaFoto = false;
        /* La puesta al día vuelve a mandar mi estado, ausente incluido, si lo estoy. */
        this.ausenteDesdeMs = null;
        this.miraPropia = radianesDelRumbo(n.r);
        this.miraPintada = this.miraPropia;
        this.paso?.colocar(n.x, n.z);
        this.antesX = n.x;
        this.antesZ = n.z;
        /* El número del cable manda sobre el que salía de la vista: es el que la sala usa. */
        if (lectura !== null && lectura.yo !== n.yo) this.lectura = leerLaLiza(lectura.liza, n.yo);
        return;
      }
      case 'corrige':
        if (this.paso !== null && this.paso.corregir(n.n, n.x, n.z, this.ultimoEnviado)) {
          this.antesX = this.paso.x;
          this.antesZ = this.paso.z;
          if (this.gesto !== null && (this.gesto.gesto === 'quiebro' || this.gesto.gesto === 'avance')) this.gesto = null;
          this.acometidaPendiente = null;
        }
        return;
      case 'fuera':
        return;
      case 'suceso':
        break;
    }
    const s = n.suceso;
    const yo = this.sala.yo;
    switch (s.e) {
      case 'anuncio': {
        const a = n.anuncio;
        if (a === null) return;
        if (s.de === yo) {
          /* LA ANTICIPACIÓN ELÁSTICA: mi gesto ya corría; ahora sabe el instante exacto del impacto. */
          const accion = lectura?.accion(s.acc) ?? null;
          if (this.gesto !== null && this.gesto.accion === s.acc) {
            this.gesto.impactoMs = a.impactoMs;
            this.gesto.hastaMs = a.impactoMs + COLA_DEL_GOLPE_MS;
          } else if (lectura !== null) {
            this.gesto = { gesto: lectura.gestoDeLaAccion(s.acc), desdeMs: ahora, impactoMs: a.impactoMs, hastaMs: a.impactoMs + COLA_DEL_GOLPE_MS, direccion: null, accion: s.acc };
          }
          if (accion !== null && (accion.cadena !== null || lectura?.siguienteEnLaTanda(s.acc) !== 0)) this.eslabon = { accion: s.acc, impactoMs: a.impactoMs };
          return;
        }
        if (s.de !== 0) this.guionDelGolpe(a, ahora);
        return;
      }
      case 'resuelve': {
        const a = n.anuncio;
        if (a === null) return;
        if (a.de !== yo && a.de !== 0 && s.r === RESULTADO.cortada) this.lineas.get(a.de)?.cortar(ahora);
        /* Quien falló contra mi quiebro limpio es el blanco natural de la Réplica (diseño §2.2, paso 3). */
        if (s.r === RESULTADO.limpia && a.a === yo && a.de >= PRIMER_NUMERO_DE_ENTIDAD) {
          this.autorDelLimpio = a.de;
          this.blanco = a.de;
        }
        return;
      }
      case 'estado': {
        if (s.a !== yo) return;
        const sentido = lectura?.sentidoDelEstado(s.est) ?? 'otro';
        /* La ausencia (el HUD la cuenta): desde cuándo, y cuándo se volvió de ella. */
        if (sentido === 'ausente') {
          if (this.ausenteDesdeMs === null) this.ausenteDesdeMs = ahora;
        } else if (this.ausenteDesdeMs !== null) {
          this.ausenteDesdeMs = null;
          this.vueltaMs = ahora;
        }
        if (sentido === 'sin-cuerpo') {
          this.tengoCuerpo = false;
          this.paso?.pararElDesplazamiento();
        } else if (!this.tengoCuerpo) {
          this.tengoCuerpo = true;
          this.recolocarDesdeLaFoto = true;
        }
        /* Un golpe recibido corta mi gesto de golpe (el cuerpo no puede estar pegando y encajando a la vez). */
        if (sentido === 'tocado' || sentido === 'derribado' || sentido === 'caido' || sentido === 'descolocado') {
          if (this.gesto !== null && this.gesto.gesto !== 'quiebro') this.gesto = null;
        }
        return;
      }
      case 'empuja': {
        const d = (s.d / 100) * UNO;
        if (s.a === yo) {
          this.paso?.desplazar(s.r, Math.round(d), TICS_DEL_EMPUJON, true);
          return;
        }
        const pintado = this.porNumero.get(s.a);
        if (pintado === undefined) return;
        const rumbo = radianesDelRumbo(s.r);
        const metros = s.d / 100;
        this.linea(s.a).empezar({
          gesto: 'tocado',
          desdeMs: ahora,
          finMs: ahora + EMPUJON_MS,
          impactoMs: null,
          destinoX: pintado.x + Math.sin(rumbo) * metros,
          destinoZ: pintado.z - Math.cos(rumbo) * metros,
          rumbo: null,
          direccion: rumbo,
        });
        return;
      }
      case 'nace': {
        if (lectura === null || this.barrio === null) return;
        if (lectura.cuerpoDeLaClase(s.clase) !== 'prestado') return;
        /*
         * EL CIVIL QUE SE VUELVE PRESTADO: el durmiente de guion más cercano al punto, en el tic en que la
         * sala lo hizo nacer, con la misma función pura en todos los aparatos (diseño §4.8). Los que ya son
         * Prestados no cuentan.
         */
        const excluidos = [...this.conjuntoDePrestados];
        let durmiente: number | null = null;
        try {
          durmiente = durmienteMasCercano(this.barrio, n.k, Math.round((s.x / 100) * UNO), Math.round((s.z / 100) * UNO), excluidos);
        } catch {
          durmiente = null;
        }
        const antes = this.prestadosPorEntidad.get(s.id);
        if (antes !== undefined) this.conjuntoDePrestados.delete(antes);
        if (durmiente !== null) {
          this.prestadosPorEntidad.set(s.id, durmiente);
          this.conjuntoDePrestados.add(durmiente);
        }
        return;
      }
      case 'seva': {
        if (s.por === MOTIVO_DE_IRSE.seDeshace) return;
        const durmiente = this.prestadosPorEntidad.get(s.id);
        if (durmiente !== undefined) {
          this.prestadosPorEntidad.delete(s.id);
          this.conjuntoDePrestados.delete(durmiente);
        }
        this.lineas.delete(s.id);
        return;
      }
      case 'sale':
        if (s.a === yo) {
          this.tengoCuerpo = false;
          this.paso?.pararElDesplazamiento();
        }
        return;
      case 'fase':
        /* Una fase nueva: todos tienen cuerpo, y quien no lo tenía aparece donde diga la foto. */
        if (!this.tengoCuerpo) {
          this.tengoCuerpo = true;
          this.recolocarDesdeLaFoto = true;
        }
        return;
      case 'impacta': {
        /* Una bala esquivada en limpio da la Acometida: se vuela hacia el tirador (diseño §4.4). */
        if (s.a !== yo || s.r !== RESULTADO.limpia || lectura === null || lectura.reglas === null || this.paso === null) return;
        const tirador = n.bala === null ? undefined : this.porNumero.get(n.bala.de);
        if (tirador === undefined) return;
        const contra = lectura.reglas.esquiva.contraProyectil;
        const x = this.paso.x / UNO;
        const z = this.paso.z / UNO;
        const lejos = Math.hypot(tirador.x - x, tirador.z - z);
        const accion = lectura.accion(contra.accion);
        const alcance = (accion?.alcance ?? UNO) / UNO;
        const vuelo = Math.max(0, Math.min(contra.distancia / UNO, lejos - alcance));
        /*
         * El impacto va detrás del vuelo y del anuncio de la acción. La sala lanza la Réplica en el mismo
         * tic de la limpia, y su `anuncio` viene en el mismo lote: si llegó delante, su instante manda (si
         * llega detrás, lo pone el `anuncio`, como a cualquier golpe mío).
         */
        let impactoMs = ahora + (contra.tics + (accion?.anuncioTics ?? 0)) * MS_POR_TIC;
        for (const an of this.sala.anuncios.values()) if (an.de === yo && an.acc === contra.accion && an.impactoMs > ahora) impactoMs = an.impactoMs;
        if (vuelo > 0.1) {
          const rumbo = rumboDeRadianes(direccionHacia(tirador.x - x, tirador.z - z));
          this.paso.desplazar(rumbo, Math.round(vuelo * UNO), Math.max(1, contra.tics), false);
          this.gesto = { gesto: 'avance', desdeMs: ahora, impactoMs, hastaMs: impactoMs + COLA_DEL_GOLPE_MS, direccion: radianesDelRumbo(rumbo), accion: contra.accion };
          /* Y al acabar de volar, el avance de la acción si aún no llego (ver `acometidaPendiente`). */
          if (accion !== null && accion.avance > 0) this.acometidaPendiente = { tirador: n.bala === null ? 0 : n.bala.de, accion: contra.accion };
        }
        return;
      }
      default:
        return;
    }
  }

  /**
   * EL AVANCE DE LA ACCIÓN TRAS EL VUELO DE LA ACOMETIDA: hacia el tirador, lo que le falte hasta su
   * alcance y no más que el avance de la acción, en los tics de su anuncio (como la acometida de un golpe
   * pulsado). Si ya llego, nada.
   */
  private seguirLaAcometida(): void {
    const pendiente = this.acometidaPendiente;
    this.acometidaPendiente = null;
    const l = this.lectura;
    if (pendiente === null || l === null || this.paso === null) return;
    const accion = l.accion(pendiente.accion);
    const tirador = this.porNumero.get(pendiente.tirador);
    if (accion === null || tirador === undefined) return;
    const x = this.paso.x / UNO;
    const z = this.paso.z / UNO;
    const avanza = Math.max(0, Math.min(accion.avance / UNO, Math.hypot(tirador.x - x, tirador.z - z) - accion.alcance / UNO));
    if (avanza <= 0.05) return;
    this.paso.desplazar(rumboDeRadianes(direccionHacia(tirador.x - x, tirador.z - z)), Math.round(avanza * UNO), Math.max(1, accion.anuncioTics), false);
  }

  /**
   * EL GUION DE UN GOLPE AJENO: sale de donde se pinta al sitio del anuncio y la acometida hacia su blanco.
   *
   * ═══ LA ACOMETIDA AJENA SE VUELA ENTERA ═══
   *
   * Contra una bala, el limpio de un compañero lanza su Réplica en el mismo tic (la sala la juzga con el
   * vuelo y el avance juntos: `contraProyectil`), así que lo que llega aquí es el anuncio de una Réplica
   * con un anuncio LARGO —el vuelo más el suyo— desde donde estaba al quebrar. Con sólo el avance de la
   * acción (unos 4 m) el guion lo dejaba a medio camino y la foto, al alcanzarlo, lo arrastraba por el
   * aire hasta el tirador: se veía un salto corto y luego un deslizamiento de diez metros. Así que si el
   * anuncio es de la acción `contraProyectil` de su asiento y le queda más que su anuncio y medio vuelo,
   * es una Acometida: el guion vuela el vuelo y el avance, y LLEGA AL IMPACTO (no a la cola del golpe:
   * catorce metros que llegan tarde son un puño que no toca).
   */
  private guionDelGolpe(a: AnuncioVisto, ahora: number): void {
    const lectura = this.lectura;
    if (lectura === null) return;
    const accion = lectura.accion(a.acc);
    const acometida = this.esUnaAcometida(a, accion, ahora);
    let destinoX = a.x;
    let destinoZ = a.z;
    let rumbo: number | null = null;
    const blanco = a.a > 0 ? this.porNumero.get(a.a) : undefined;
    if (blanco !== undefined) {
      const dx = blanco.x - a.x;
      const dz = blanco.z - a.z;
      rumbo = direccionHacia(dx, dz);
      const lejos = Math.hypot(dx, dz);
      const hasta = (accion?.avance ?? 0) + acometida;
      if (accion !== null && hasta > 0 && lejos > 0.01) {
        const avanza = Math.max(0, Math.min(hasta / UNO, lejos - accion.alcance / UNO));
        destinoX += (dx / lejos) * avanza;
        destinoZ += (dz / lejos) * avanza;
      }
    }
    const recuperacion = accion === null ? 0 : accion.recuperacionTics * MS_POR_TIC;
    this.linea(a.de).empezar({
      gesto: acometida > 0 ? 'avance' : lectura.gestoDeLaAccion(a.acc),
      desdeMs: ahora,
      finMs: acometida > 0 ? Math.max(ahora + 1, a.impactoMs) : Math.max(ahora + 1, a.impactoMs + Math.max(COLA_DEL_GOLPE_MS, recuperacion)),
      impactoMs: a.impactoMs,
      destinoX,
      destinoZ,
      rumbo,
      direccion: rumbo,
    });
  }

  /**
   * ¿ES EL ANUNCIO DE UNA ACOMETIDA? Lo que vuela (Q16.16) si lo es, 0 si no. Un asiento, la acción que
   * su reglamento lanza contra una bala, y un anuncio que tarda más que el suyo y medio vuelo: la misma
   * Réplica tras un quiebro cuerpo a cuerpo no vuela.
   */
  private esUnaAcometida(a: AnuncioVisto, accion: AccionDeclarada | null, ahora: number): number {
    const l = this.lectura;
    if (l === null || accion === null || a.de <= 0 || a.de >= PRIMER_NUMERO_DE_ENTIDAD) return 0;
    const contra = l.liza.asientos[a.de - 1]?.esquiva.contraProyectil;
    if (contra === undefined || contra.accion !== a.acc || contra.distancia <= 0) return 0;
    return a.impactoMs - ahora > (accion.anuncioTics + contra.tics / 2) * MS_POR_TIC ? contra.distancia : 0;
  }

  private linea(numero: number): LineaDelCuerpo {
    let l = this.lineas.get(numero);
    if (l === undefined) {
      l = new LineaDelCuerpo();
      this.lineas.set(numero, l);
    }
    return l;
  }

  /* ─────────────────────────── Mi estado ─────────────────────────── */

  /** Lo que significa mi estado ahora. */
  sentidoPropio(ahora: number): SentidoDelEstado {
    const l = this.lectura;
    if (l === null) return 'libre';
    if (!this.tengoCuerpo) return 'sin-cuerpo';
    return l.sentidoDelEstado(this.sala.estadoEn(this.sala.yo, ahora));
  }

  /** ¿Tengo cuerpo? (sin él, Vigía). */
  conCuerpo(): boolean {
    return this.tengoCuerpo;
  }

  /** Al fondo o de vuelta (ver `callada`). */
  callar(alFondo: boolean): void {
    this.callada = alFondo;
    if (alFondo) {
      this.sostenida = null;
      this.pendientes.length = 0;
    }
  }

  /** ¿Está callada por irse al fondo? */
  estaCallada(): boolean {
    return this.callada;
  }

  /**
   * MI AUSENCIA, para el HUD: `ausente` mientras la sala me tiene por ausente; `vuelta` los primeros
   * `ROTULO_DE_LA_VUELTA_MS` tras volver; `null` si nada.
   */
  ausencia(ahora: number): 'ausente' | 'vuelta' | null {
    if (this.lectura !== null && this.tengoCuerpo && this.sentidoPropio(ahora) === 'ausente') return 'ausente';
    return ahora - this.vueltaMs < ROTULO_DE_LA_VUELTA_MS ? 'vuelta' : null;
  }

  /** Lo que significa ahora el estado del cuerpo `numero` (un asiento o una entidad). */
  sentidoDe(numero: number, ahora: number): SentidoDelEstado {
    const l = this.lectura;
    return l === null ? 'libre' : l.sentidoDelEstado(this.sala.estadoEn(numero, ahora));
  }

  /** ¿Estoy jugando de verdad? (canal dentro, liza leída, un asiento en ella). */
  jugando(): boolean {
    return this.canal.dentro() && this.lectura !== null && this.lectura.reglas !== null && this.paso !== null && this.sala.yo > 0;
  }

  /** El reloj del canal abierto, o `null`. */
  reloj(): RelojDelCanal | null {
    return this.relojActual;
  }

  /** El tic de la sala estimado en `ahora` (con decimales), o `NaN`. */
  ticDeLaSala(ahora: number): number {
    const r = this.relojActual;
    return r === null ? Number.NaN : this.sala.red.ticDeLaSala(ahora - r.origen);
  }

  /* ─────────────────────────── Los mandos ─────────────────────────── */

  /** Enemigos (entidades vivas, no caídas) a menos de `m` metros de mí. */
  private hayEnemigosA(m: number): boolean {
    const yo = this.porNumero.get(this.sala.yo);
    if (yo === undefined) return false;
    for (const c of this.cuerposPintados) {
      if (c.id < PRIMER_NUMERO_DE_ENTIDAD || c.gesto === 'desalojable' || c.gesto === 'imprimirse') continue;
      if (Math.hypot(c.x - yo.x, c.z - yo.z) < m) return true;
    }
    return false;
  }

  /** ¿Hay enemigos a menos de 5 m? (la cámara se abre). */
  enemigosCerca(): boolean {
    return this.hayEnemigosA(ENEMIGOS_QUE_ABREN_LA_CAMARA_M);
  }

  /** Los blancos posibles de un golpe: las entidades vivas que no están caídas. */
  private *candidatos(): IterableIterator<Candidato> {
    const l = this.lectura;
    for (const c of this.cuerposPintados) {
      if (c.id < PRIMER_NUMERO_DE_ENTIDAD) continue;
      if (l !== null) {
        const sentido = l.sentidoDelEstado(this.sala.estadoEn(c.id, this.ultimoAhora));
        if (sentido === 'desalojable' || sentido === 'absorbiendo') continue;
      }
      yield { numero: c.id, x: c.x, z: c.z };
    }
  }

  /** El blanco de una acción ahora, con su enganche (0 si no lleva blanco o no hay ninguno). */
  /**
   * EL BLANCO DE UNA ACCIÓN AHORA, con su enganche (0 si no lleva blanco o no hay ninguno), por este orden:
   *
   *   1. La RÉPLICA va a quien falló contra mi quiebro limpio, si sigue a tiro: es el golpe del Remanso,
   *      y a quien se busca es al que quedó clavado, esté hacia donde esté la palanca.
   *   2. El mejor en el cono de la palanca (o de la cámara), como dice el diseño (§4.5).
   *   3. Si en el cono no hay nadie, el más cercano A MANO —a su alcance más su holgura, en cualquier
   *      dirección y con línea de vista—: pegado a un Prestado que llega por el costado, un golpe al aire
   *      porque la cámara mira a otro lado es un fallo del mando, no del jugador. La sala acepta el
   *      blanco sin mirar el cono (sólo el radio y la vista), así que no se pide nada que no admita.
   */
  private blancoDe(accion: AccionDeclarada | null, palancaX = this.mandos.palancaX, palancaY = this.mandos.palancaY): number {
    const yo = this.porNumero.get(this.sala.yo);
    if (accion === null || accion.enganche === null || yo === undefined || this.lectura === null) return 0;
    const radio = accion.enganche.radio / UNO;
    if (accion.soloEn.length > 0 && this.autorDelLimpio !== 0) {
      const autor = this.porNumero.get(this.autorDelLimpio);
      if (autor !== undefined && Math.hypot(autor.x - yo.x, autor.z - yo.z) <= radio) return this.autorDelLimpio;
    }
    const palanca = direccionDeLaPalanca(palancaX, palancaY, this.giroDeLaCamara);
    const enElCono = elegirBlanco(
      {
        x: yo.x,
        z: yo.z,
        direccion: palanca ?? this.giroDeLaCamara,
        radio,
        medioCono: (accion.enganche.conoRumbos * 2 * Math.PI) / RUMBOS,
        anterior: this.blanco,
        cuerpos: this.lectura.arena.cuerpos,
      },
      this.candidatos(),
    );
    if (enElCono !== 0) return enElCono;
    return elegirBlanco(
      {
        x: yo.x,
        z: yo.z,
        direccion: 0,
        radio: Math.min(radio, (accion.alcance + accion.holgura) / UNO),
        medioCono: Math.PI,
        anterior: this.blanco,
        cuerpos: this.lectura.arena.cuerpos,
      },
      this.candidatos(),
    );
  }

  /** LO QUE USAR HARÍA AQUÍ Y AHORA, o `null` (el botón no aparece). */
  usoPosible(ahora: number): UsoPosible | null {
    const l = this.lectura;
    const r = l?.reglas ?? null;
    const yo = this.porNumero.get(this.sala.yo);
    if (l === null || r === null || yo === undefined || !this.tengoCuerpo) return null;
    /* Rescatar a un compañero caído. */
    const radioDeRescate = r.rescate.radio / UNO;
    for (const c of this.cuerposPintados) {
      if (c.id >= PRIMER_NUMERO_DE_ENTIDAD || c.id === this.sala.yo) continue;
      if (l.sentidoDelEstado(this.sala.estadoEn(c.id, ahora)) !== 'caido') continue;
      if (Math.hypot(c.x - yo.x, c.z - yo.z) <= radioDeRescate) {
        return { que: 'rescatar', accion: r.rescate.accion, blanco: c.id, mantenerMs: r.rescate.mantenerTics * MS_POR_TIC };
      }
    }
    /* Rematar (desalojar) a una entidad caída. */
    for (const [numero, e] of this.sala.entidades) {
      const clase = l.clase(e.clase);
      if (clase === null || clase.alCaer.tipo !== 'rematable') continue;
      if (l.sentidoDelEstado(this.sala.estadoEn(numero, ahora)) !== 'desalojable') continue;
      const c = this.porNumero.get(numero);
      if (c === undefined) continue;
      if (Math.hypot(c.x - yo.x, c.z - yo.z) <= clase.alCaer.remate.radio / UNO) {
        return { que: 'rematar', accion: clase.alCaer.remate.accion, blanco: numero, mantenerMs: clase.alCaer.remate.mantenerTics * MS_POR_TIC };
      }
    }
    /* Descolgar en la cabina que suena. */
    const zona = this.sala.zona;
    const encuentro = l.liza.fase.encuentro;
    if (zona !== null && ahora < zona.hastaMs && encuentro !== null && encuentro.fin.tipo === 'salida') {
      const z = l.zona(zona.id);
      if (z !== null) {
        const cx = (z.caja.x0 + z.caja.x1) / 2 / UNO;
        const cz = (z.caja.z0 + z.caja.z1) / 2 / UNO;
        if (Math.hypot(cx - yo.x, cz - yo.z) <= encuentro.fin.zona.radio / UNO) {
          return { que: 'descolgar', accion: encuentro.fin.zona.accion, blanco: 0, mantenerMs: encuentro.fin.zona.mantenerTics * MS_POR_TIC };
        }
      }
    }
    return null;
  }

  /** Cuánto lleva mantenido USAR, de 0 a 1 (para el anillo de progreso), o `null` si no se mantiene. */
  progresoDeUsar(ahora: number): number | null {
    const s = this.sostenida;
    if (s === null) return null;
    const uso = this.usoPosible(ahora);
    if (uso === null || uso.accion !== s.accion) return null;
    return Math.max(0, Math.min(1, (ahora - s.desdeMs) / Math.max(1, uso.mantenerMs)));
  }

  /** Un aviso a los demás, según lo que haya delante (diseño §7). */
  private avisar(ahora: number): void {
    const l = this.lectura;
    if (l === null || ahora - this.ultimoAvisoMs < AVISO_CADA_MS) return;
    const yo = this.porNumero.get(this.sala.yo);
    let clase = 0;
    let objetivo = 0;
    /* Un Celador de rodillas cerca: «¡Desalójalo!». */
    if (l.avisos.desalojalo !== 0 && yo !== undefined) {
      for (const [numero] of this.sala.entidades) {
        if (l.sentidoDelEstado(this.sala.estadoEn(numero, ahora)) !== 'desalojable') continue;
        clase = l.avisos.desalojalo;
        objetivo = numero;
        break;
      }
    }
    if (clase === 0 && this.blanco !== 0 && l.avisos.marcar !== 0) {
      clase = l.avisos.marcar;
      objetivo = this.blanco;
    }
    if (clase === 0 && l.avisos.rescate !== 0) {
      for (const c of this.cuerposPintados) {
        if (c.id < PRIMER_NUMERO_DE_ENTIDAD && c.id !== this.sala.yo && l.sentidoDelEstado(this.sala.estadoEn(c.id, ahora)) === 'caido') {
          clase = l.avisos.rescate;
          objetivo = c.id;
          break;
        }
      }
    }
    if (clase === 0 && l.avisos.voy !== 0 && this.sala.zona !== null) clase = l.avisos.voy;
    if (clase === 0 && l.avisos.marcar !== 0) {
      const b = this.blancoDe(l.accion(l.botones.entrada));
      if (b !== 0) {
        clase = l.avisos.marcar;
        objetivo = b;
      }
    }
    if (clase === 0) return;
    if (this.canal.enviar({ t: 'aviso', clase, objetivo })) this.ultimoAvisoMs = ahora;
  }

  /** ATIENDE UNA PULSACIÓN: decide la acción y la deja para el próximo `aqui`. */
  private atenderPulsacion(boton: Boton, timeStamp: number, ahora: number, palancaX: number, palancaY: number): void {
    const l = this.lectura;
    const r = l?.reglas ?? null;
    const reloj = this.relojActual;
    if (l === null || r === null || reloj === null || this.paso === null || !this.tengoCuerpo) return;
    if (boton === 'aviso') {
      this.avisar(ahora);
      return;
    }
    const ms = reloj.msDeLaPulsacion(timeStamp);
    if (ms === null) return;
    const sentido = this.sentidoPropio(ahora);
    let accion: IdDeclarado = 0;
    if (boton === 'quiebro') accion = l.botones.quiebro;
    else if (boton === 'empellon') accion = l.botones.empellon;
    else if (boton === 'golpe') {
      /*
       * GOLPE es, por este orden: el eslabón siguiente si la pulsación cae en la ventana del impacto
       * anterior (la Tanda, o el segundo golpe de la Réplica doble) y se puede en mi estado; si no, la
       * Réplica en el Remanso; si no, la Entrada. La ventana la juzga la sala con el `ms`: aquí sólo se
       * elige qué pedir.
       */
      const siguiente = this.eslabon === null ? 0 : l.siguienteEnLaTanda(this.eslabon.accion);
      const trasEl = siguiente === 0 ? null : l.accion(siguiente);
      const ventana = trasEl?.cadena?.despuesMs ?? 0;
      const encadena = this.eslabon !== null && trasEl !== null && timeStamp <= this.eslabon.impactoMs + ventana;
      const sePuede = trasEl !== null && (trasEl.soloEn.length === 0 || trasEl.soloEn.some((e) => l.sentidoDelEstado(e) === sentido));
      if (encadena && sePuede) accion = siguiente;
      else if (sentido === 'remanso' && l.botones.replica !== 0) accion = l.botones.replica;
      else accion = l.botones.entrada;
    }
    if (accion === 0) return;
    const declarada = l.accion(accion);
    /*
     * A MEDIA ANUNCIO SÓLO VALE ENCADENAR, como en la sala (`intentarGolpe` en `combate.ts`): con un golpe
     * mío anunciado y sin resolver, la sala tira toda pulsación que no sea el eslabón siguiente dentro de su
     * ventana. Aquí se tira igual, sin mandarla, sin mover el cuerpo y sin cambiar el gesto. Antes el
     * aparato la atendía: GOLPE a media Acometida (el estado es el Remanso, que no bloquea) sustituía el
     * vuelo por el avance de una Réplica que la sala nunca lanzó, y la Acometida se juzgaba con el cuerpo
     * parado a seis metros del tirador (medido en el juego el 24-sep: 15,9 m al empezar, 6,1 al acabar,
     * fallada; sin tocar nada, 2,1 m y dada). El QUIEBRO no pasa por aquí: en la sala va por otro camino
     * (`empezarEsquiva`), que no mira lo anunciado.
     */
    if (boton !== 'quiebro' && !this.cabeTrasMiGolpe(declarada, timeStamp)) return;
    const blanco = boton === 'quiebro' ? 0 : this.blancoDe(declarada, palancaX, palancaY);
    if (blanco !== 0) this.blanco = blanco;
    this.pendientes.push([accion, ms, blanco]);
    this.pulsacionesAtendidas.push({ boton, accion, t: timeStamp, blanco });

    /* EL CUERPO RESPONDE EN EL ACTO: el gesto empieza al pulsar, y el quiebro y la acometida, el viaje. */
    if (boton === 'quiebro') {
      this.empezarElQuiebro(timeStamp, sentido, palancaX, palancaY);
      return;
    }
    if (declarada === null) return;
    /*
     * ¿LA LANZA LA SALA YA? Libre, en un estado que no bloquea las acciones (el Remanso, el intocable de quien
     * reaparece o vuelve de estar ausente) o en mi quiebro desde su tic soltable. Entonces la acometida la
     * hago yo, entera: la sala sólo me da por andado lo que puede ir de camino en los `aqui` que aún no ha
     * visto, no lo que no anduve (`llegaConSuAvance` en `combate.ts`).
     */
    const est = this.sala.estadoEn(this.sala.yo, ahora);
    const declaradoEst = est === 0 ? null : l.estado(est);
    const miQuiebro = this.gesto !== null && this.gesto.gesto === 'quiebro' ? this.gesto : null;
    const saleYa =
      declaradoEst === null || !declaradoEst.bloqueaAccion || (sentido === 'quiebro' && miQuiebro !== null && timeStamp >= miQuiebro.desdeMs + r.esquiva.puesta.soltableDesdeTic * MS_POR_TIC);
    const impactoMs = timeStamp + declarada.anuncioTics * MS_POR_TIC;
    this.gesto = { gesto: l.gestoDeLaAccion(accion), desdeMs: timeStamp, impactoMs, hastaMs: impactoMs + COLA_DEL_GOLPE_MS, direccion: null, accion };
    const objetivo = blanco === 0 ? undefined : this.porNumero.get(blanco);
    if (objetivo !== undefined && declarada.avance > 0 && saleYa) {
      const x = this.paso.x / UNO;
      const z = this.paso.z / UNO;
      const lejos = Math.hypot(objetivo.x - x, objetivo.z - z);
      const avanza = Math.max(0, Math.min(declarada.avance / UNO, lejos - declarada.alcance / UNO));
      if (avanza > 0.05) {
        const rumbo = rumboDeRadianes(direccionHacia(objetivo.x - x, objetivo.z - z));
        this.paso.desplazar(rumbo, Math.round(avanza * UNO), declarada.anuncioTics, false);
        this.gesto.direccion = radianesDelRumbo(rumbo);
      }
    }
  }

  /**
   * MI GOLPE PENDIENTE en el instante `t`: el anuncio mío que la sala aún no ha resuelto y cuyo impacto no
   * ha llegado, o `null`. Es lo que mira la sala (`anuncioDelAutor`) con el reloj del aparato. La
   * Acometida entra por aquí sin más: el anuncio de su Réplica sale en el mismo tic que la limpia y llega
   * en el mismo lote, que se atiende entero antes de mirar ninguna pulsación. Una pulsación de DESPUÉS del
   * impacto no lo tiene pendiente aunque el `resuelve` aún no haya llegado: cuando su `aqui` llegue a la
   * sala, la sala ya lo habrá resuelto.
   */
  private golpePendiente(t: number): { readonly accion: IdDeclarado; readonly impactoMs: number } | null {
    const yo = this.sala.yo;
    let el: { accion: IdDeclarado; impactoMs: number } | null = null;
    for (const an of this.sala.anuncios.values()) {
      if (an.de === yo && an.impactoMs > t && (el === null || an.impactoMs > el.impactoMs)) el = { accion: an.acc, impactoMs: an.impactoMs };
    }
    return el;
  }

  /**
   * ¿La sala atendería ahora `accion`, pulsada en `t`, con lo que tengo anunciado? Sin golpe pendiente,
   * sí (lo demás lo juzga ella). Con él, sólo si es un eslabón que va tras él y cae en su ventana, de
   * `antesMs` antes del impacto a `despuesMs` después.
   */
  private cabeTrasMiGolpe(accion: AccionDeclarada | null, t: number): boolean {
    const pendiente = this.golpePendiente(t);
    if (pendiente === null) return true;
    const c = accion?.cadena ?? null;
    if (c === null || !c.tras.includes(pendiente.accion)) return false;
    const delta = t - pendiente.impactoMs;
    return delta >= -c.antesMs && delta <= c.despuesMs;
  }

  /** El quiebro: hacia la palanca o, suelta, de lado respecto a la amenaza más próxima (diseño §4.3). */
  private empezarElQuiebro(timeStamp: number, sentido: SentidoDelEstado, palancaX: number, palancaY: number): void {
    const l = this.lectura;
    const r = l?.reglas ?? null;
    if (l === null || r === null || this.paso === null) return;
    const puedeQuebrar = sentido === 'libre' || sentido === 'quiebro' || sentido === 'remanso';
    const esRuptura = !puedeQuebrar && r.esquiva.ruptura.desde.some((e) => l.sentidoDelEstado(e) === sentido);
    const medidor = this.sala.cuentas.get(this.sala.yo)?.medidor ?? 0;
    if (!puedeQuebrar && !(esRuptura && medidor >= r.esquiva.ruptura.coste)) return;
    const puesta = esRuptura ? r.esquiva.ruptura.puesta : r.esquiva.puesta;
    /* La palanca de CUANDO SE PULSÓ, no la de este fotograma: el pulgar ya puede haberse soltado. */
    let direccion = direccionDeLaPalanca(palancaX, palancaY, this.giroDeLaCamara);
    if (direccion === null) direccion = this.ladoDelQuiebro();
    const tics = Math.min(TICS_DEL_VIAJE_DEL_QUIEBRO, puesta.tics);
    /*
     * Lo que se quiebra es lo del estilo (3,5 m la Gabardina, diseño §4.3), no lo que la sala admite: la
     * puesta declara el quiebro MÁS la holgura del presupuesto (`QUIEBRO_DEL_DESVELADO.holguraMetros`), y el
     * aparato se comía esa holgura entera —quebraba 4 m— mientras las tarjetas, la tabla y el diseño
     * decían 3,5.
     */
    const distancia = Math.max(0, puesta.distanciaExtra - HOLGURA_DEL_QUIEBRO);
    if (distancia > 0) this.paso.desplazar(rumboDeRadianes(direccion), distancia, tics, false);
    this.gesto = { gesto: 'quiebro', desdeMs: timeStamp, impactoMs: null, hastaMs: timeStamp + puesta.tics * MS_POR_TIC, direccion, accion: r.esquiva.accion };
  }

  /** De lado respecto a la amenaza más cercana, hacia donde la estructura deja más hueco. */
  private ladoDelQuiebro(): number {
    const yo = this.porNumero.get(this.sala.yo);
    const paso = this.paso;
    const l = this.lectura;
    if (yo === undefined || paso === null || l === null) return this.giroDeLaCamara + Math.PI / 2;
    let cerca: CuerpoPintado | null = null;
    let lejos = Number.POSITIVE_INFINITY;
    for (const c of this.cuerposPintados) {
      if (c.id < PRIMER_NUMERO_DE_ENTIDAD) continue;
      const d = Math.hypot(c.x - yo.x, c.z - yo.z);
      if (d < lejos) {
        lejos = d;
        cerca = c;
      }
    }
    const haciaLaAmenaza = cerca === null ? this.giroDeLaCamara : direccionHacia(cerca.x - yo.x, cerca.z - yo.z);
    const derecha = haciaLaAmenaza + Math.PI / 2;
    const izquierda = haciaLaAmenaza - Math.PI / 2;
    const hueco = (dir: number): number => {
      let libre = 0;
      for (let m = 0.5; m <= 3.5; m += 0.5) {
        const x = Math.round((yo.x + Math.sin(dir) * m) * UNO);
        const z = Math.round((yo.z - Math.cos(dir) * m) * UNO);
        if (!sePuedeEstar(l.arena, x, z, paso.radio)) break;
        libre = m;
      }
      return libre;
    };
    return hueco(izquierda) > hueco(derecha) ? izquierda : derecha;
  }

  /* ─────────────────────────── El bucle ─────────────────────────── */

  /** Los tics que tocan hasta `ahora`: paso, acción y `aqui`. */
  private alcanzar(ahora: number): void {
    const reloj = this.relojActual;
    const l = this.lectura;
    const paso = this.paso;
    if (reloj === null || l === null || paso === null || !this.canal.dentro() || this.sala.yo === 0) return;
    /* Al fondo, ni tics ni `aqui`: la parada se recupera al volver, como la de una pestaña frenada. */
    if (this.callada) return;
    const n = reloj.tic(ahora);
    if (this.ultimoTicSimulado < 0) this.ultimoTicSimulado = n - 1;
    if (n <= this.ultimoTicSimulado) return;
    const desde = Math.max(this.ultimoTicSimulado + 1, n - TICS_QUE_SE_RECUPERAN);
    for (let t = desde; t <= n; t++) this.unTic(t, ahora, t > n - TICS_DE_GOLPE);
    this.ultimoTicSimulado = n;
  }

  private unTic(t: number, ahora: number, enviar: boolean): void {
    const l = this.lectura as LecturaDeLaLiza;
    const paso = this.paso as PasoPropio;
    this.antesX = paso.x;
    this.antesZ = paso.z;
    const fase = this.sala.fase;
    if (!this.tengoCuerpo || fase === null || fase.modo === CODIGO_DE_MODO.quieta) return;
    /* La palanca, girada con la cámara, y correr (Mayúsculas, o a fondo 0,8 s sin nadie cerca). */
    const direccion = direccionDeLaPalanca(this.mandos.palancaX, this.mandos.palancaY, this.giroDeLaCamara);
    const aFondo = this.mandos.aFondoDesde !== null && ahora - this.mandos.aFondoDesde >= A_FONDO_PARA_CORRER_MS;
    const correr = this.mandos.correrPedido || (aFondo && !this.hayEnemigosA(ENEMIGOS_QUE_IMPIDEN_CORRER_M));
    const est = this.sala.estadoEn(this.sala.yo, ahora);
    const declarado = est === 0 ? null : l.estado(est);
    const bloqueado = declarado !== null && declarado.bloqueaPaso;
    if (this.acometidaPendiente !== null && !paso.desplazandose()) this.seguirLaAcometida();
    const dado = paso.paso(
      { rumbo: direccion === null ? null : rumboDeRadianes(direccion), fuerza: this.mandos.fuerza, correr },
      bloqueado,
      l.limite(fase.limite),
    );
    if (dado.marcha > 0) this.seHaMovido = true;
    /* Hacia dónde miro: a mi blanco si peleo con él, si no hacia donde ando. */
    const blanco = this.blanco === 0 ? undefined : this.porNumero.get(this.blanco);
    const yoPintado = this.porNumero.get(this.sala.yo);
    if (this.gesto !== null && blanco !== undefined && yoPintado !== undefined && ahora < this.gesto.hastaMs) {
      this.miraPropia = direccionHacia(blanco.x - yoPintado.x, blanco.z - yoPintado.z);
    } else if (dado.marcha > 0) {
      this.miraPropia = radianesDelRumbo(paso.rumboDelPaso);
    }
    /*
     * La acción de este tic: la pulsada más vieja; si no, la sostenida (se repite con su `ms`). Sólo en
     * un tic que SE MANDA: tras una parada larga se simulan tics que no salen, y una acción que se
     * pegara a uno de ésos se perdería sin que la sala la viera.
     */
    if (!enviar) return;
    let a: AccionDelAparato | 0 = 0;
    const pulsada = this.pendientes.shift();
    if (pulsada !== undefined) {
      a = pulsada;
      this.sostenida = null;
    } else if (this.sostenida !== null) a = [this.sostenida.accion, this.sostenida.ms, this.sostenida.blanco];
    if (
      this.canal.enviar({
        t: 'aqui',
        n: t,
        x: paso.x,
        z: paso.z,
        r: rumboDeRadianes(this.miraPropia),
        m: dado.marcha,
        a,
      })
    ) {
      this.ultimoEnviado = t;
    }
  }

  /** USAR: se empieza a mantener, o se suelta. */
  private atenderUsar(ahora: number): void {
    const reloj = this.relojActual;
    const desde = this.mandos.usarDesde;
    if (desde === null || reloj === null) {
      this.sostenida = null;
      return;
    }
    const uso = this.usoPosible(ahora);
    if (uso === null) {
      this.sostenida = null;
      return;
    }
    if (this.sostenida !== null && this.sostenida.accion === uso.accion && this.sostenida.blanco === uso.blanco) return;
    const ms = reloj.msDeLaPulsacion(Math.max(desde, reloj.origen));
    if (ms === null) return;
    this.sostenida = { accion: uso.accion, ms, blanco: uso.blanco, desdeMs: ahora };
  }

  /**
   * EL LATIDO DE LA RED: las pulsaciones pendientes y los tics que tocan, sin pintar nada. Lo llama cada
   * fotograma y, además, un temporizador de 25 ms (`Quiebro.tsx`): un fotograma que tarda (un teléfono
   * modesto, una compilación de sombreadores) no retrasa ni el `aqui` ni la pulsación que lleva dentro.
   */
  latir(ahora: number): void {
    this.ultimoAhora = ahora;
    for (const p of this.mandos.tomarPulsaciones()) this.atenderPulsacion(p.boton, p.timeStamp, ahora, p.palancaX, p.palancaY);
    this.atenderUsar(ahora);
    this.alcanzar(ahora);
  }

  /**
   * UN FOTOGRAMA. `ahora` en ms de `performance.now()`; `dt` en segundos. Devuelve nada: todo queda en
   * los cuerpos, en `paraLaEscena` y en lo que se lee con los métodos.
   */
  fotograma(ahora: number, dt: number): void {
    this.latir(ahora);
    this.paso?.fundir(dt);
    if (this.gesto !== null && ahora >= this.gesto.hastaMs) this.gesto = null;
    if (this.eslabon !== null && ahora > this.eslabon.impactoMs + 1500) this.eslabon = null;
    this.escribirLosCuerpos(ahora, dt);
    if (this.blanco !== 0 && !this.porNumero.has(this.blanco)) this.blanco = 0;
  }

  /* ─────────────────────────── Los cuerpos ─────────────────────────── */

  private claseDelNumero(numero: number): ClaseDeCuerpo {
    if (numero < PRIMER_NUMERO_DE_ENTIDAD) return 'desvelado';
    const e = this.sala.entidades.get(numero);
    return e === undefined || this.lectura === null ? 'prestado' : this.lectura.cuerpoDeLaClase(e.clase);
  }

  private cuerpo(numero: number): CuerpoPintado {
    let c = this.porNumero.get(numero);
    if (c === undefined) {
      c = {
        id: numero,
        clase: 'desvelado',
        variante: 0,
        color: null,
        x: 0,
        z: 0,
        rumbo: 0,
        velocidad: 0,
        gesto: 'reposo',
        gestoDesdeMs: 0,
        impactoMs: null,
        direccionDelGesto: null,
        contorno: true,
        tenue: false,
      };
      this.porNumero.set(numero, c);
    }
    return c;
  }

  /** El gesto de andar según lo que corre. */
  private static locomocion(velocidad: number, marcha: number): Gesto {
    if (marcha >= 3 || velocidad > 6) return 'correr';
    if (marcha === 2 || velocidad > 3) return 'trotar';
    if (marcha === 1 || velocidad > 0.3) return 'andar';
    return 'reposo';
  }

  private escribirLosCuerpos(ahora: number, dt: number): void {
    const l = this.lectura;
    const lista = this.cuerposPintados;
    lista.length = 0;
    const vivos = new Set<number>();
    const yo = this.sala.yo;
    const reloj = this.relojActual;

    /* ── Yo, predicho ── */
    if (yo > 0 && this.paso !== null && reloj !== null && l !== null) {
      if (this.recolocarDesdeLaFoto) {
        const t = this.sala.fotos.ultimaTupla(yo);
        if (t !== null) {
          this.paso.colocar(Math.round((t[1] / 100) * UNO), Math.round((t[2] / 100) * UNO));
          this.antesX = this.paso.x;
          this.antesZ = this.paso.z;
          this.recolocarDesdeLaFoto = false;
        }
      }
      const c = this.cuerpo(yo);
      const frac = Math.max(0, Math.min(1, (reloj.ms(ahora) - this.ultimoTicSimulado * MS_POR_TIC) / MS_POR_TIC));
      const x = (this.antesX + (this.paso.x - this.antesX) * frac) / UNO + this.paso.desvioX;
      const z = (this.antesZ + (this.paso.z - this.antesZ) * frac) / UNO + this.paso.desvioZ;
      if (!Number.isNaN(this.pintadoAntesX) && dt > 0) {
        const v = Math.hypot(x - this.pintadoAntesX, z - this.pintadoAntesZ) / dt;
        this.velocidadPintada += (v - this.velocidadPintada) * Math.min(1, dt * 12);
      }
      this.pintadoAntesX = x;
      this.pintadoAntesZ = z;
      c.clase = 'desvelado';
      c.variante = this.estilos[yo - 1] ?? 0;
      c.color = COLORES_DE_ASIENTO[(yo - 1) % COLORES_DE_ASIENTO.length] ?? null;
      c.x = x;
      c.z = z;
      /* La cara gira hacia donde mira, deprisa pero no de golpe. */
      const falta = normalizarAngulo(this.miraPropia - this.miraPintada);
      this.miraPintada = normalizarAngulo(this.miraPintada + falta * Math.min(1, dt / GIRO_DE_LA_CARA_S));
      c.rumbo = this.miraPintada;
      c.velocidad = this.velocidadPintada;
      const est = this.sala.estadoEn(yo, ahora);
      const delEstado = est === 0 ? null : l.gestoDelEstado(est);
      if (this.gesto !== null) {
        c.gesto = this.gesto.gesto;
        c.gestoDesdeMs = this.gesto.desdeMs;
        c.impactoMs = this.gesto.impactoMs;
        c.direccionDelGesto = this.gesto.direccion;
      } else if (delEstado !== null) {
        const e = this.sala.estados.get(yo);
        c.gesto = delEstado;
        c.gestoDesdeMs = e?.desdeMs ?? ahora;
        c.impactoMs = null;
        c.direccionDelGesto = null;
      } else {
        c.gesto = Partida.locomocion(this.velocidadPintada, 0);
        c.impactoMs = null;
        c.direccionDelGesto = null;
      }
      c.contorno = true;
      /* Ausente, mi cuerpo se ve tenue: la calle no me ve, y así lo sé también sin leer el rótulo. */
      c.tenue = !this.tengoCuerpo || l.sentidoDelEstado(est) === 'ausente';
      if (this.tengoCuerpo) {
        lista.push(c);
        vivos.add(yo);
      }
    }

    /* ── Los demás: la foto 150 ms atrás, con su guion encima ── */
    const tic = this.ticDeLaSala(ahora) - RETRASO_DE_LOS_DEMAS_MS / MS_POR_TIC;
    const numeros = new Set<number>(this.sala.fotos.numeros());
    for (const n of this.sala.entidades.keys()) numeros.add(n);
    for (const numero of numeros) {
      if (numero === yo) continue;
      const m = this.muestra;
      let hay = !Number.isNaN(tic) && this.sala.fotos.muestra(numero, tic, m);
      const entidad = this.sala.entidades.get(numero);
      if (numero >= PRIMER_NUMERO_DE_ENTIDAD && entidad === undefined) continue;
      if (!hay && entidad !== undefined) {
        m.x = entidad.x;
        m.z = entidad.z;
        m.mira = radianesDelRumbo(entidad.r);
        m.marcha = 0;
        m.estado = 0;
        m.velocidad = 0;
        hay = true;
      }
      if (!hay) continue;
      const estadoPresente = this.sala.estadoEn(numero, ahora);
      const sentido = l === null ? 'libre' : l.sentidoDelEstado(estadoPresente !== 0 ? estadoPresente : m.estado);
      if (sentido === 'sin-cuerpo' || this.sala.salidos.has(numero)) continue;
      const c = this.cuerpo(numero);
      const linea = this.lineas.get(numero);
      const p = this.pintado;
      if (linea !== undefined) linea.pintar(ahora, m.x, m.z, p);
      else {
        p.x = m.x;
        p.z = m.z;
        p.gesto = null;
      }
      c.clase = this.claseDelNumero(numero);
      c.variante =
        numero < PRIMER_NUMERO_DE_ENTIDAD
          ? (this.estilos[numero - 1] ?? 0)
          : (this.prestadosPorEntidad.get(numero) ?? numero % 4);
      c.color = numero < PRIMER_NUMERO_DE_ENTIDAD ? (COLORES_DE_ASIENTO[(numero - 1) % COLORES_DE_ASIENTO.length] ?? null) : null;
      c.x = p.x;
      c.z = p.z;
      c.rumbo = p.rumbo ?? m.mira;
      c.velocidad = m.velocidad;
      const delEstado = l === null ? null : l.gestoDelEstado(estadoPresente !== 0 ? estadoPresente : m.estado);
      const aparicion = entidad === undefined || l === null ? null : l.clase(entidad.clase)?.aparicion ?? null;
      if (p.gesto !== null) {
        c.gesto = p.gesto;
        c.gestoDesdeMs = p.gestoDesdeMs;
        c.impactoMs = p.impactoMs;
        c.direccionDelGesto = p.direccion;
      } else if (entidad !== undefined && aparicion !== null && aparicion.modo === 'imprimir' && ahora - entidad.nacioMs < aparicion.tics * MS_POR_TIC) {
        c.gesto = 'imprimirse';
        c.gestoDesdeMs = entidad.nacioMs;
        c.impactoMs = null;
        c.direccionDelGesto = null;
      } else if (delEstado !== null) {
        c.gesto = delEstado;
        c.gestoDesdeMs = this.sala.estados.get(numero)?.desdeMs ?? ahora;
        c.impactoMs = null;
        c.direccionDelGesto = null;
      } else {
        c.gesto = Partida.locomocion(m.velocidad, m.marcha);
        c.impactoMs = null;
        c.direccionDelGesto = null;
      }
      const mio = yo > 0 ? this.porNumero.get(yo) : undefined;
      c.contorno = !(this.apagon && numero >= PRIMER_NUMERO_DE_ENTIDAD && mio !== undefined && Math.hypot(c.x - mio.x, c.z - mio.z) > CONTORNO_EN_EL_APAGON_M);
      /* Un compañero ausente, en tenue: está, pero ni se le ve la calle ni la calle a él (ver el HUD). */
      c.tenue = numero < PRIMER_NUMERO_DE_ENTIDAD && sentido === 'ausente';
      lista.push(c);
      vivos.add(numero);
    }
    for (const n of this.porNumero.keys()) if (!vivos.has(n) && n !== yo) this.porNumero.delete(n);
  }

  /* ─────────────────────────── FuenteDeCuerpos ─────────────────────────── */

  cuerpos(): readonly CuerpoPintado[] {
    return this.cuerposPintados;
  }

  prestados(): ReadonlySet<number> {
    return this.conjuntoDePrestados;
  }

  ticDeLosDurmientes(): number {
    const t = this.ticDeLaSala(this.ultimoAhora);
    return Number.isNaN(t) ? 0 : Math.max(0, t);
  }

  yo(): number | null {
    return this.sala.yo > 0 ? this.sala.yo : null;
  }

  /** Dónde se pinta el cuerpo `numero` ahora (metros), para los efectos y la cámara. */
  sitioDe(numero: number): { readonly x: number; readonly z: number } | null {
    const c = this.porNumero.get(numero);
    return c === undefined ? null : c;
  }

  /** El cuerpo pintado `numero` (el objeto que se reutiliza), o `null`. */
  pintadoDe(numero: number): CuerpoPintado | null {
    return this.porNumero.get(numero) ?? null;
  }

}

function normalizarAngulo(a: number): number {
  let r = a % (2 * Math.PI);
  if (r <= -Math.PI) r += 2 * Math.PI;
  if (r > Math.PI) r -= 2 * Math.PI;
  return r;
}
