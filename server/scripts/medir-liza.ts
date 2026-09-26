/**
 * CUÁNTO CUESTA UNA SALA DE LA LIZA: un banco en proceso, con robots que lidian.
 *
 *   npm run medir:liza                                  (llenas y solitarias, 1 y 10 salas de cada, 10 s)
 *   npm run medir:liza -- --salas 13 --asientos 6       (trece salas llenas)
 *   npm run medir:liza -- --salas 40 --asientos 1       (cuarenta solitarias)
 *   npm run medir:liza -- --juguete                     (con una liza de juguete en vez del juego de verdad)
 *   npm run medir:liza -- --segundos 20
 *   npm run medir:liza -- --ciudad                      (9 salas de 6 en la ciudad de 540 m: dispersos y agrupados)
 *   npm run medir:liza -- --ciudad --disposicion dispersos --salas 11
 *
 * No es un comprobador y no va en la batería: da CIFRAS para el modelo de coste de `lizas.ts`
 * (`COSTE_DE_UNA_SALA`, `PRESUPUESTO_DE_LAS_LIZAS`), que hoy son las estimaciones del §12 del diseño.
 *
 * ═══ QUÉ SE MONTA ═══
 *
 * El canal de VERDAD (`server/src/liza/canal.ts`), con la sala pura de verdad (`sala.ts`), el reloj del
 * proceso (el mismo metrónomo que en el servidor) y, por defecto, la MESA de verdad (`mesas.ts`, en una
 * carpeta temporal) de un juego del registro de lizas: se abre por la puerta de la mesa, se sientan
 * `--asientos`, se empieza jugando lo primero que ofrece al primer asiento —lo único que se sabe de un
 * juego sin nombrarlo— y a partir de ahí la mesa la mueven los veredictos de la propia sala, como en el
 * servidor. Con `--juguete`, una mesa de mentira que declara una liza de juguete con un encuentro de
 * entidades que no se acaba, para medir sin juego.
 *
 * Los aparatos son ROBOTS en el mismo proceso (`RobotDeLaLiza`, abajo) con enchufes que apuntan lo que
 * baja y contestan el ping en la vuelta siguiente del bucle: andan hacia la entidad más cercana, quiebran
 * cuando les anuncian un golpe y golpean lo que tienen a tiro. No hay `ws`: se mide la sala y la E/S,
 * no la pila de red (esa, `medir:botas -- --red` la midió para el canal hermano: unos 6 µs por envío).
 *
 * ═══ QUÉ SE MIDE, Y CUÁNDO ═══
 *
 * EN COMBATE. Una mesa de verdad empieza por su fase de entrada —la de El Quiebro, unos seis segundos
 * sin nadie a quien pegar— y una ventana que la pisa mide una sala vacía y la mezcla con la llena: la
 * mediana de «7.326 contra 7.080 declarados» de la primera pasada era media ventana de bajada (revisión
 * del frente, hallazgo 5). Así que antes de medir se espera, hasta `ESPERA_DEL_COMBATE_MS`, a que TODAS
 * las salas estén en un encuentro con alguna entidad nacida; y en la ventana, un segundo sólo cuenta si
 * todas siguen en encuentro (el que no, se dice aparte). Si no se llega al combate, se dice y se mide
 * lo que haya, que no es lo que se quería medir.
 *
 *   · EL COSTE MEDIDO por la propia E/S (`costeMedidoPorSala` del diagnóstico): los pasos de la sala —la
 *     sala, escribir y mandar—, atender los mensajes de sus canales y validar las declaraciones que le
 *     llegan, en µs de CPU por segundo. Es la cifra que se compara con la declarada (`costeDeLaLiza`), y
 *     con ella se dice cuántas salas así caben en el presupuesto por lo declarado y por lo medido.
 *   · EL HILO OCUPADO (`performance.eventLoopUtilization`), robots incluidos: el tiempo que el bucle de
 *     eventos no estuvo esperando. Es la COTA POR ARRIBA de lo que cuestan las salas juntas —todo lo que
 *     ellas hacen corre en ese hilo—, y si el coste medido la pasa, la medida del canal está mal.
 *   · LA CPU DEL PROCESO (`process.cpuUsage`), con la recogida de basura de sus hilos. No es una cota en
 *     Windows: allí se muestrea a golpes de 15,6 ms y, con poca carga, sale cero (la primera pasada la
 *     daba por cota y salía 0,0 en las solitarias); en Linux, que es donde corre de verdad, sí.
 *   · LO QUE BAJA por aparato y segundo, y el MONTÓN por sala.
 *   · Y cuánto se juega: entidades nacidas, anuncios, golpes que dan, esquivas limpias, correcciones.
 *
 * ═══ POR QUÉ EL ROBOT VIVE AQUÍ Y LO IMPORTA EL COMPROBADOR ═══
 *
 * `verify:sala-de-la-liza` baja robots por `ws` al servidor de verdad con la MISMA lógica. Un robot en
 * cada guion serían dos robots que un día juegan distinto; así que está aquí, exportado, y el cuerpo del
 * banco sólo corre si este fichero es el guion que se lanza (`esElGuion`).
 */
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import { UNO } from '../../shared/mecanicas/fijo';
import { sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Arena } from '../../shared/mecanicas/mundo';
import { arenaDeLaLiza, reglasDelNumero, TOPE_DE_CANTIDAD, TOPE_DE_TICS, VERSION_DE_LA_DECLARACION } from '../../shared/mecanicas/liza/declaracion';
import type {
  AccionDeclarada,
  EfectoDeclarado,
  EncuentroDeclarado,
  GrupoDeclarado,
  LizaDeclarada,
  MundoDeLaLiza,
  PuestaDeEstado,
  ReglasDeAsiento,
  SitioDeNacer,
} from '../../shared/mecanicas/liza/declaracion';
import { desplazado, rumboHacia } from '../../shared/mecanicas/liza/geometria';
import {
  deCentesimas,
  ECO_CADA_MS,
  leerMensajeDeLaSala,
  PRIMER_NUMERO_DE_ENTIDAD,
  RESULTADO,
  rutaDeLaLiza,
  textoDelAparato,
  VERSION_DE_LA_LIZA,
} from '../../shared/mecanicas/liza/protocolo';
import type { AccionDelAparato, MensajeDeLaSala } from '../../shared/mecanicas/liza/protocolo';

/* ═══════════════════════════════════════════════════════════════════════════
 * EL ROBOT
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Cuánto antes del impacto que le anuncian pulsa la esquiva el robot que lee: 80 ms, en su reloj. */
export const ANTICIPO_DE_LA_ESQUIVA_MS = 80;
/** A qué distancia de su blanco golpea (Q16.16): 1,6 unidades, dentro del alcance con su holgura. */
const A_TIRO = Math.round(1.6 * UNO);
/** Cuánto anda por tic cuando va a por algo: 0,25 unidades (5 u/s, un trote). */
const PASO = Math.round(0.25 * UNO);
/** Cada cuánto aporrea la esquiva el robot que aporrea. */
const APORREA_CADA_MS = 300;

export type FormaDeJugar = 'lee' | 'aporrea' | 'quieto';

export interface OpcionesDelRobot {
  readonly llave: string;
  /** Milisegundos monótonos: `performance.now()`, o el reloj de mentira de una prueba. */
  readonly reloj: () => number;
  /** La declaración que vale AHORA para su mesa: la misma función que usa el servidor. */
  readonly liza: () => LizaDeclarada | null;
  readonly mandar: (texto: string) => void;
  readonly forma?: FormaDeJugar;
  /** Si anda hacia lo que tiene más cerca (y si no hay nada, da vueltas). Por defecto, sí. */
  readonly anda?: boolean;
  /**
   * Si golpea lo que tiene a tiro. Por defecto, sí. Uno que no golpea sólo quiebra: sirve para mirar el
   * juicio de la esquiva sin que el autor del golpe caiga antes de su impacto (el anuncio saldría cortado).
   */
  readonly golpea?: boolean;
}

/** Lo que cuenta un robot de lo que le pasa. */
export interface CuentasDelRobot {
  dentros: number;
  fotos: number;
  tics: number;
  ilegibles: number;
  correcciones: number;
  /** Cada clase de suceso recibida. */
  sucesos: Record<string, number>;
  /** Anuncios de otros contra él, y cómo se resolvieron. */
  anunciosContraMi: number;
  limpias: number;
  esquivadas: number;
  meDieron: number;
  /** Anuncios contra él que salieron `fallada` (estaba lejos al impacto). */
  fallaronContraMi: number;
  /** Anuncios contra él que se cortaron (el autor cayó antes del impacto) o que la guardia paró. */
  cortadas: number;
  /**
   * Con cuánto tiempo le llegó cada anuncio contra él: el instante del impacto menos su reloj al
   * recibirlo, en ms. Si es poco o negativo, el anillo no se puede quebrar: es la red, o el desfase.
   */
  antelaciones: number[];
  /**
   * Lo mismo con quién lo lanzó y con qué acción: con la declaración se sabe cuánta antelación TENÍA que
   * traer (sus `anuncioTics`, más el `comp` si la liza alarga con la red), y la diferencia es el error del
   * desfase de la E/S. Es lo que mira `verify:sala-de-la-liza` de punta a punta. `trasDentro` es cuánto
   * llevaba dentro al recibirlo: los de la puesta al día (en el paso del `dentro`) son golpes ya en
   * vuelo, y llegan con menos.
   */
  anunciosRecibidos: { de: number; acc: number; antelacion: number; trasDentro: number }[];
  /** Esquivas que pulsó. */
  esquivasPulsadas: number;
  /** Sus golpes: lanzados (anunciados por la sala) y los que dieron. */
  golpesAnunciados: number;
  golpesQueDieron: number;
  pulsaciones: number;
  bytesBajados: number;
  ecos: number;
}

/**
 * UN APARATO SIN PANTALLA que habla el protocolo de la Liza. No sabe de qué juego es: todo lo saca de la
 * declaración (sus golpes, su esquiva, su radio, el mundo) y de lo que le cuenta la sala. Su reloj es el
 * de su canal —ms desde que lo abrió—, como el de un aparato de verdad.
 */
export class RobotDeLaLiza {
  yo = 0;
  x = 0;
  z = 0;
  mira = 0;
  dentro = false;
  fuera: string | null = null;
  fase = '';
  private readonly forma: FormaDeJugar;
  private readonly anda: boolean;
  private origen = 0;
  private ultimoTic = -1;
  private ultimoEco = Number.NEGATIVE_INFINITY;
  private ultimoAporreo = Number.NEGATIVE_INFINITY;
  private rumboDeVagar = 0;
  private readonly entidades = new Map<number, { x: number; z: number }>();
  /** Lo que tiene que pulsar, y desde cuándo (ms de su reloj). */
  private readonly pendientes: { cuando: number; accion: number; blanco: number }[] = [];
  private readonly anuncios = new Map<number, { de: number; a: number; acc: number }>();
  /** Su último impacto propio, en su reloj, para no abrir otro golpe encima. */
  private finDeSuGolpe = Number.NEGATIVE_INFINITY;
  /** Lo que le mandará en su próximo `aqui` además: un salto a propósito (para ver una corrección). */
  private salto: { dx: number; dz: number } | null = null;
  /** Hasta cuándo (su reloj) le tiene la sala en un estado que no deja andar. */
  private quietoHasta = 0;
  /** Hasta cuándo (su reloj) tiene un golpe anunciado encima: el que lee, mientras, sólo espera y quiebra. */
  private amenazaHasta = Number.NEGATIVE_INFINITY;
  /** Cuándo (su reloj) recibió su último `dentro`. */
  private dentroEn = 0;
  readonly idas: number[] = [];
  readonly cuentas: CuentasDelRobot = {
    dentros: 0,
    fotos: 0,
    tics: 0,
    ilegibles: 0,
    correcciones: 0,
    sucesos: {},
    anunciosContraMi: 0,
    limpias: 0,
    esquivadas: 0,
    meDieron: 0,
    fallaronContraMi: 0,
    cortadas: 0,
    antelaciones: [],
    anunciosRecibidos: [],
    esquivasPulsadas: 0,
    golpesAnunciados: 0,
    golpesQueDieron: 0,
    pulsaciones: 0,
    bytesBajados: 0,
    ecos: 0,
  };
  /** Las correcciones recibidas, con el `n` que corrigen. */
  readonly corregidos: { n: number; x: number; z: number }[] = [];
  /** Lo último que mandó en un `aqui` (para mirar una corrección contra ello). */
  ultimoAqui: { n: number; x: number; z: number } | null = null;
  /**
   * Dónde le puso la sala en su último `dentro` (Q16.16): donde nace quien entra o vuelve a entrar. Es
   * lo que mira `verify:sala-de-la-liza` para «quien vuelve nace junto al grupo».
   */
  ultimoDentro: { x: number; z: number } | null = null;

  constructor(private readonly o: OpcionesDelRobot) {
    this.forma = o.forma ?? 'lee';
    this.anda = o.anda ?? true;
  }

  /** Su reloj: ms enteros desde que abrió el canal. */
  ms(): number {
    return Math.max(0, Math.floor(this.o.reloj() - this.origen));
  }

  /**
   * El canal se ha abierto: `hola` y el primer `eco` justo detrás, como un aparato de verdad. Un canal
   * nuevo es un reloj nuevo (también si el robot vuelve a entrar tras un cierre): su tic vuelve a empezar.
   */
  abrir(): void {
    this.origen = this.o.reloj();
    this.ultimoTic = -1;
    this.dentro = false;
    this.fuera = null;
    this.o.mandar(textoDelAparato({ t: 'hola', v: VERSION_DE_LA_LIZA, llave: this.o.llave, c: this.ms() }));
    this.o.mandar(textoDelAparato({ t: 'eco', c: this.ms() }));
    this.ultimoEco = this.ms();
  }

  /** La próxima vez que ande, dará un salto de `(dx, dz)` de golpe: lo que la sala tiene que corregir. */
  saltar(dx: number, dz: number): void {
    this.salto = { dx, dz };
  }

  private arena(liza: LizaDeclarada): Arena {
    let a = ARENAS.get(liza);
    if (a === undefined) {
      a = arenaDeLaLiza(liza);
      ARENAS.set(liza, a);
    }
    return a;
  }

  recibir(texto: string): void {
    this.cuentas.bytesBajados += texto.length;
    const m = leerMensajeDeLaSala(texto);
    if (m === null) {
      this.cuentas.ilegibles++;
      return;
    }
    this.atender(m);
  }

  private atender(m: MensajeDeLaSala): void {
    const ahora = this.ms();
    switch (m.t) {
      case 'dentro':
        /* Con cada `dentro` se tira todo lo que sabía: puede ser otra sala (ver `Bienvenida`). */
        this.yo = m.yo;
        this.x = m.x;
        this.z = m.z;
        this.ultimoDentro = { x: m.x, z: m.z };
        this.mira = m.r;
        this.dentro = true;
        this.entidades.clear();
        this.pendientes.length = 0;
        this.anuncios.clear();
        this.finDeSuGolpe = Number.NEGATIVE_INFINITY;
        this.quietoHasta = 0;
        this.amenazaHasta = Number.NEGATIVE_INFINITY;
        this.dentroEn = ahora;
        this.cuentas.dentros++;
        return;
      case 'foto':
        this.cuentas.fotos++;
        this.entidades.clear();
        for (const [n, x, z] of m.p) if (n >= PRIMER_NUMERO_DE_ENTIDAD) this.entidades.set(n, { x: deCentesimas(x), z: deCentesimas(z) });
        return;
      case 'corrige':
        this.cuentas.correcciones++;
        this.corregidos.push({ n: m.n, x: m.x, z: m.z });
        this.x = m.x;
        this.z = m.z;
        return;
      case 'eco':
        this.idas.push(ahora - m.c);
        return;
      case 'fuera':
        this.fuera = m.motivo;
        this.dentro = false;
        return;
      case 'tic':
        this.cuentas.tics++;
        for (const s of m.ev) {
          this.cuentas.sucesos[s.e] = (this.cuentas.sucesos[s.e] ?? 0) + 1;
          switch (s.e) {
            case 'fase':
              this.fase = s.clave;
              break;
            case 'nace':
              this.entidades.set(s.id, { x: deCentesimas(s.x), z: deCentesimas(s.z) });
              break;
            case 'seva':
              this.entidades.delete(s.id);
              break;
            case 'estado':
              /* Si la sala le pone en un estado que no deja andar, no anda: si no, cada paso sería una corrección. */
              if (s.a === this.yo) {
                const declarado = this.o.liza()?.estados.find((e) => e.id === s.est);
                this.quietoHasta = s.est !== 0 && declarado?.bloqueaPaso === true ? ahora + s.tics * 50 : 0;
              }
              break;
            case 'anuncio':
              this.anuncios.set(s.id, { de: s.de, a: s.a, acc: s.acc });
              if (s.a === this.yo && s.de !== this.yo) {
                this.cuentas.anunciosContraMi++;
                this.cuentas.antelaciones.push(s.t - ahora);
                this.cuentas.anunciosRecibidos.push({ de: s.de, acc: s.acc, antelacion: s.t - ahora, trasDentro: ahora - this.dentroEn });
                if (this.forma === 'lee') {
                  this.pulsarEsquiva(Math.max(ahora, s.t - ANTICIPO_DE_LA_ESQUIVA_MS));
                  /* El que lee, amenazado, no se mete en otro golpe ni se va: espera al anillo y quiebra. */
                  this.amenazaHasta = Math.max(this.amenazaHasta, s.t + 150);
                }
              } else if (s.de === this.yo) {
                this.cuentas.golpesAnunciados++;
                this.finDeSuGolpe = s.t;
                this.encadenar(s.acc, s.a, s.t + 40);
              }
              break;
            case 'resuelve': {
              const a = this.anuncios.get(s.id);
              if (a === undefined) break;
              this.anuncios.delete(s.id);
              if (a.a === this.yo && a.de !== this.yo) {
                if (s.r === RESULTADO.limpia) this.cuentas.limpias++;
                else if (s.r === RESULTADO.esquivada) this.cuentas.esquivadas++;
                else if (s.r === RESULTADO.da) this.cuentas.meDieron++;
                else if (s.r === RESULTADO.fallada) this.cuentas.fallaronContraMi++;
                else this.cuentas.cortadas++;
              } else if (a.de === this.yo && s.r === RESULTADO.da) {
                this.cuentas.golpesQueDieron++;
              }
              break;
            }
            case 'impacta':
              if (s.a === this.yo) {
                if (s.r === RESULTADO.limpia) this.cuentas.limpias++;
                else if (s.r === RESULTADO.da) this.cuentas.meDieron++;
              }
              break;
            default:
              break;
          }
        }
        return;
    }
  }

  private reglas(): { liza: LizaDeclarada; reglas: ReglasDeAsiento } | null {
    const liza = this.o.liza();
    if (liza === null || this.yo === 0) return null;
    const reglas = reglasDelNumero(liza, this.yo);
    return reglas === null ? null : { liza, reglas };
  }

  private pulsarEsquiva(cuando: number): void {
    const r = this.reglas();
    if (r === null) return;
    this.pendientes.push({ cuando, accion: r.reglas.esquiva.accion, blanco: 0 });
  }

  /** Tras el impacto de `acc`, lo que se encadena a él (si hay algo), contra el mismo blanco. */
  private encadenar(acc: number, blanco: number, cuando: number): void {
    const r = this.reglas();
    if (r === null) return;
    const sigue = r.reglas.acciones.find((a) => a.cadena !== null && a.cadena.tras.includes(acc) && a.soloEn.length === 0);
    if (sigue !== undefined) this.pendientes.push({ cuando, accion: sigue.id, blanco });
  }

  /** El golpe con que se abre: sin cadena, con blanco, que no pide estados y que se puede esquivar. */
  private golpeQueAbre(reglas: ReglasDeAsiento): AccionDeclarada | undefined {
    return reglas.acciones.find((a) => a.cadena === null && a.enganche !== null && a.soloEn.length === 0 && !a.imparable);
  }

  /**
   * UN LATIDO: como mucho un `aqui` por tic de su reloj. Anda (hacia lo más cercano, o vaga), pulsa lo
   * que le toca y, cada `ECO_CADA_MS`, su `eco`.
   */
  latir(): void {
    if (!this.dentro) return;
    const ahora = this.ms();
    const n = Math.floor(ahora / 50);
    if (n <= this.ultimoTic) return;
    this.ultimoTic = n;
    if (ahora - this.ultimoEco >= ECO_CADA_MS) {
      this.o.mandar(textoDelAparato({ t: 'eco', c: ahora }));
      this.ultimoEco = ahora;
      this.cuentas.ecos++;
    }
    const r = this.reglas();
    if (r === null) return;
    const { liza, reglas } = r;

    /* Lo más cercano. */
    let cerca: { n: number; x: number; z: number; d2: number } | null = null;
    for (const [num, e] of this.entidades) {
      const dx = (e.x - this.x) / UNO;
      const dz = (e.z - this.z) / UNO;
      const d2 = dx * dx + dz * dz;
      if (cerca === null || d2 < cerca.d2) cerca = { n: num, x: e.x, z: e.z, d2 };
    }

    /* Con un golpe anunciado encima, el que lee sólo espera su anillo: ni anda ni encadena ni abre otro. */
    const amenazado = this.forma === 'lee' && ahora < this.amenazaHasta;
    if (amenazado) {
      const esquiva = reglas.esquiva.accion;
      for (let i = this.pendientes.length - 1; i >= 0; i--) if ((this.pendientes[i] as { accion: number }).accion !== esquiva) this.pendientes.splice(i, 1);
    }

    /* Andar. */
    let marcha = 0;
    if (this.salto !== null) {
      this.x += this.salto.dx;
      this.z += this.salto.dz;
      this.salto = null;
      marcha = 3;
    } else if (this.anda && this.forma !== 'quieto' && !amenazado && ahora >= this.quietoHasta) {
      const arena = this.arena(liza);
      const limite = liza.mundo.limites.find((l) => l.id === liza.fase.limite);
      const dentroDelLimite = (x: number, z: number): boolean =>
        limite === undefined || (x >= limite.caja.x0 && x <= limite.caja.x1 && z >= limite.caja.z0 && z <= limite.caja.z1);
      let rumbo: number | null = null;
      if (cerca !== null) {
        if (cerca.d2 * UNO * UNO > A_TIRO * A_TIRO) rumbo = rumboHacia(cerca.x - this.x, cerca.z - this.z);
        else this.mira = rumboHacia(cerca.x - this.x, cerca.z - this.z);
      } else {
        rumbo = this.rumboDeVagar;
      }
      if (rumbo !== null) {
        for (let intento = 0; intento < 4; intento++) {
          const r2 = (rumbo + intento * 64) % 256;
          const p = desplazado(this.x, this.z, r2, PASO);
          if (sePuedeEstar(arena, p.x, p.z, reglas.cuerpo.radio) && dentroDelLimite(p.x, p.z)) {
            this.x = p.x;
            this.z = p.z;
            this.mira = r2;
            marcha = 2;
            if (cerca === null) this.rumboDeVagar = (r2 + (n % 7 === 0 ? 8 : 0)) % 256;
            break;
          }
          if (cerca === null) this.rumboDeVagar = (this.rumboDeVagar + 64) % 256;
        }
      }
    }

    /* Pulsar: lo que toca, o aporrear, o abrir un golpe contra lo que está a tiro. */
    let accion: AccionDelAparato | 0 = 0;
    this.pendientes.sort((a, b) => a.cuando - b.cuando);
    const toca = this.pendientes[0];
    if (toca !== undefined && toca.cuando <= ahora) {
      this.pendientes.shift();
      accion = [toca.accion, ahora, toca.blanco];
      if (toca.accion === reglas.esquiva.accion) this.cuentas.esquivasPulsadas++;
    } else if (this.forma === 'aporrea' && ahora - this.ultimoAporreo >= APORREA_CADA_MS) {
      this.ultimoAporreo = ahora;
      accion = [reglas.esquiva.accion, ahora, 0];
      this.cuentas.esquivasPulsadas++;
    } else if (this.o.golpea !== false && !amenazado && cerca !== null && cerca.d2 * UNO * UNO <= A_TIRO * A_TIRO && ahora > this.finDeSuGolpe + 100) {
      const golpe = this.golpeQueAbre(reglas);
      if (golpe !== undefined) {
        accion = [golpe.id, ahora, cerca.n];
        this.finDeSuGolpe = ahora + golpe.anuncioTics * 50 + 200;
      }
    }
    if (accion !== 0) this.cuentas.pulsaciones++;
    this.ultimoAqui = { n, x: this.x, z: this.z };
    this.o.mandar(textoDelAparato({ t: 'aqui', n, x: this.x, z: this.z, r: this.mira, m: marcha, a: accion }));
  }
}

const ARENAS = new WeakMap<LizaDeclarada, Arena>();

/* ═══════════════════════════════════════════════════════════════════════════
 * UNA LIZA DE JUGUETE CON UN ENCUENTRO QUE NO SE ACABA
 * ═══════════════════════════════════════════════════════════════════════════ */

const u = (n: number): number => Math.round(n * UNO);

const puesta = (estado: number, tics: number, intocableTics = 0, distanciaExtra = 0, soltableDesdeTic = tics): PuestaDeEstado => ({
  estado,
  tics,
  intocableTics,
  distanciaExtra,
  soltableDesdeTic,
});

function efecto(dano: number, p: PuestaDeEstado | null): EfectoDeclarado {
  return { dano, danoAlRitmo: dano, puntos: 10, puntosAlRitmo: 10, puesta: p, empuje: 0, alChocar: { dano: 0, tics: 0 }, rompeGuardia: false };
}

function golpe(id: number, extra: Partial<AccionDeclarada>): AccionDeclarada {
  return {
    id,
    anuncioTics: 8,
    alcance: u(1.1),
    holgura: u(1.2),
    enganche: { radio: u(7), conoRumbos: 43, holgura: u(0.5) },
    avance: 0,
    cadena: null,
    efecto: efecto(10, puesta(2, 12)),
    imparable: false,
    recargaTics: 0,
    recuperacionTics: 0,
    soloEn: [],
    alFallar: puesta(8, 8),
    ...extra,
  };
}

function reglasDeJuguete(asiento: string): ReglasDeAsiento {
  return {
    asiento,
    cuerpo: {
      radio: u(0.35),
      marchas: [u(2), u(5), u(7)],
      aceleracionTics: 3,
      presupuestoCorto: { velocidad: u(8.75), acumulaTics: 20 },
      presupuestoLargo: { distancia: u(80), enTics: 200 },
      vidaTope: 100,
      vidaAlRematar: 10,
      firmeCadaTics: 0,
      guardaTics: 3,
    },
    acciones: [
      golpe(1, {}),
      golpe(2, { anuncioTics: 5, cadena: { tras: [1], antesMs: 100, despuesMs: 250, ritmoMs: 75, anuncioTicsAlRitmo: 4, soloSiDio: false } }),
    ],
    esquiva: {
      accion: 10,
      puesta: puesta(1, 9, 0, u(4), 6),
      ventanaMs: 200,
      esquivaHastaMs: 250,
      primeras: { cuantas: 0, ventanaMs: 200 },
      torpe: { cada: 3, enTics: 24 },
      alAcertar: { puesta: puesta(3, 20, 20), alAutor: puesta(8, 20) },
      contraProyectil: { distancia: u(10), tics: 8, accion: 1 },
      ruptura: { coste: 50, desde: [2], puesta: puesta(1, 9, 6, u(4), 6) },
    },
    rescate: { accion: 11, radio: u(1.5), mantenerTics: 30, puesta: puesta(5, 30), vidaAlVolver: 40, medidorAmbos: 0 },
    tiro: null,
    medidor: { tope: 100, porLimpia: 35, porRitmo: 5, porRemate: 20, porChoque: 10 },
    puntos: { factor: UNO, multiplicador: { paso: 6554, tope: 2 * UNO }, porLimpia: 50, porChoque: 30, porRemate: 100, porRescate: 75, porSalir: 150 },
    alEmpezar: { vida: 100, medidor: 0, lleva: [] },
  };
}

/**
 * UNA LIZA DE JUGUETE PARA MEDIR: un campo de 24×24 con una caja, un encuentro de una clase de entidad
 * que ataca cuerpo a cuerpo y otra que dispara, con tantas vivas como el aforo deja y sin fin práctico
 * (el reloj del encuentro en su tope). El aforo es el de una sala LLENA del diseño —14 entidades, 12
 * balas— tenga los asientos que tenga, y las vivas a la vez escalan con los presentes: 6 con uno, 14 con
 * seis, como en el §4.10.
 */
export function lizaDeEncuentro(asientos: readonly string[], semilla = 4242): LizaDeclarada {
  const n = asientos.length;
  const porPresentes = (uno: number, seis: number): number[] =>
    Array.from({ length: n }, (_, i) => Math.round(uno + ((seis - uno) * i) / Math.max(1, 5)));
  const pisables: { x: number; y: number }[] = [];
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) pisables.push({ x, y });
  const caja = (x0: number, z0: number, x1: number, z1: number): { x0: number; z0: number; x1: number; z1: number } => ({
    x0: u(x0),
    z0: u(z0),
    x1: u(x1),
    z1: u(z1),
  });
  const estado = (id: number, bloqueaPaso: boolean, bloqueaAccion: boolean, cancelaCon: number[], seCortaConDano = false) => ({
    id,
    bloqueaPaso,
    bloqueaAccion,
    cancelaCon,
    seCortaConDano,
  });
  return {
    version: VERSION_DE_LA_DECLARACION,
    mundo: {
      metrosPorUnidad: UNO,
      suelo: { lado: 2, pisables, vados: [], cuerpos: [{ x0: -1, z0: -1, x1: 1, z1: 1 }], nace: [] },
      clasesDeCaja: [1],
      zonas: [
        { id: 1, clase: 1, caja: caja(8, 8, 10, 10) },
        { id: 2, clase: 1, caja: caja(-10, 8, -8, 10) },
        { id: 3, clase: 1, caja: caja(-10, -10, -8, -8) },
      ],
      limites: [{ id: 1, caja: caja(-12, -12, 12, 12) }],
      grafo: { nudos: [{ x: u(-6), z: u(-6) }, { x: u(6), z: u(-6) }, { x: u(6), z: u(6) }, { x: u(-6), z: u(6) }], aristas: [[0, 1], [1, 2], [2, 3], [3, 0]] },
      nace: [
        { papel: 'asiento', x: u(-3), z: u(-3), rumbo: 32 },
        { papel: 'asiento', x: u(3), z: u(-3), rumbo: 224 },
        { papel: 'asiento', x: u(3), z: u(3), rumbo: 160 },
        { papel: 'asiento', x: u(-3), z: u(3), rumbo: 96 },
        { papel: 'reaparicion', x: 0, z: u(-8), rumbo: 0 },
      ],
    },
    fase: {
      clave: 'medir',
      modo: 'encuentro',
      limite: 1,
      semilla,
      reloj: null,
      encuentro: {
        ronda: 1,
        presentes: n,
        relojTics: 72000,
        vivasALaVez: porPresentes(6, 14),
        grupos: [
          { clase: 2, cuantos: porPresentes(100000, 100000), vivasALaVez: porPresentes(5, 12), claseDeZona: 1, desdeTic: 0, cadaTics: 10, eleccion: 'azar' },
          { clase: 1, cuantos: porPresentes(100000, 100000), vivasALaVez: porPresentes(1, 2), claseDeZona: 1, desdeTic: 40, cadaTics: 40, eleccion: 'azar' },
        ],
        fin: { tipo: 'vaciar' },
      },
    },
    asientos: asientos.map(reglasDeJuguete),
    estados: [
      estado(1, false, true, []),
      estado(2, true, true, [10]),
      estado(3, false, false, []),
      estado(4, true, true, []),
      estado(5, true, true, [], true),
      estado(6, true, true, []),
      estado(7, true, true, []),
      estado(8, true, true, []),
      estado(9, true, true, []),
      estado(10, false, false, []),
    ],
    clases: [
      {
        id: 1,
        vida: 70,
        radio: u(0.35),
        velocidad: u(4.5),
        acciones: [golpe(40, { anuncioTics: 11, enganche: null, alFallar: null })],
        proyectil: 1,
        guardia: null,
        cerebro: { distanciaMinima: u(8), distanciaMaxima: u(18), decideCadaTics: 4, costeCuerpoACuerpo: 2, costeDisparo: 1, sigueElGrafo: true },
        aparicion: { modo: 'imprimir', tics: 24 },
        alCaer: { tipo: 'irse' },
      },
      {
        id: 2,
        vida: 20,
        radio: u(0.35),
        velocidad: u(4),
        acciones: [golpe(42, { anuncioTics: 14, enganche: null, alFallar: null, efecto: efecto(8, null) })],
        proyectil: 0,
        guardia: null,
        cerebro: { distanciaMinima: 0, distanciaMaxima: u(1.1), decideCadaTics: 4, costeCuerpoACuerpo: 1, costeDisparo: 0, sigueElGrafo: false },
        aparicion: { modo: 'desdePunto', tics: 10 },
        alCaer: { tipo: 'irse' },
      },
    ],
    proyectiles: [{ id: 1, apuntarTics: 12, balas: 3, cadaTics: 3, velocidad: u(20), radio: u(0.2), alcance: u(30), efecto: efecto(12, puesta(2, 10)) }],
    turnos: { cuerpoACuerpo: 2, disparo: 1, anunciosALaVez: 3, excluyen: [3, 6, 7, 10], alargarConLaRed: true, repetirTrasTics: 0 },
    portables: [],
    equipo: { recurso: 1000, caida: puesta(4, 60), reaparicion: { coste: 1, esperaTics: 20, vida: 100, puesta: puesta(10, 40, 40) } },
    sinCuerpo: { estado: 6 },
    presencia: { ausenteTrasTics: 40, estadoAusente: 7, veredictoTrasTics: 1200 },
    avisos: { clases: [{ id: 1, vidaTics: 80, objetivo: 'entidad' }], cadaTics: 20 },
    red: { compBaseMs: 25, compTopeMs: 150, esperaDeSitiosMs: 250 },
    veredictos: { columnas: [{ que: 'puntos' }, { que: 'vida' }, { que: 'limpias' }] },
    aforo: { entidades: 14, balas: 12, montones: 0 },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * EL ESCENARIO «CIUDAD» (docs/quiebro/CIUDAD-ABIERTA.md §5.6)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La sala de El Quiebro cuando su mundo es la ciudad de 540 m —4.761 casillas, unas 1.300 cajas, más de
 * 3.000 nudos— en vez de una glorieta: lo que el diseño pide medir antes de dar la ciudad por buena («una
 * sala llena en 9 ms/s o menos en PC», con 9 salas a la vez, que es lo que cabe por lo declarado).
 *
 * Es lo ÚNICO de este fichero que nombra un juego, y a propósito: la ciudad es suya. Todo lo demás —la mesa,
 * el reductor, el productor, las reglas de cada asiento, las clases del Sistema, la sala, el canal— es de
 * verdad; sobre la declaración que da el productor se cambian tres cosas (y lo que las nombra), y nada más:
 *
 *   · EL MUNDO: el de la ciudad (`mundoDeLaLizaDeLaCiudad` de la columna, sin tocar) de la traza y la plaza
 *     de la Bajada que se le den a la mesa, el MISMO objeto en todas sus declaraciones, como lo guarda el
 *     productor. Con `dispersos`, además, el asiento `i` nace en la plaza `i` (un sitio de cada plaza
 *     delante) y las zonas de las seis plazas se juntan por su tipo (Fallo, impresión, boca), para que el
 *     Sistema salga de todas a la vez: lo peor de la entrega 2, seis frentes a la vez.
 *   · EL LÍMITE: `ciudad` en todas las fases. La Bajada con el suyo, la plaza, no se puede declarar con la
 *     ciudad tal como está —sus sitios de nacer de las otras plazas y de los refugios quedan fuera, y
 *     `problemasDeLaDeclaracion` lo exige—, y no es lo que se mide.
 *   · EL ENCUENTRO, si lo hay: uno SIN FIN con las vivas del aforo (las 20 del juego): Prestados por las
 *     bocas, Celadores impresos y dos tiradores, sin un número que se acabe y con el reloj en su tope, como
 *     el de juguete. Si no, la oleada se vacía a media ventana y se mide otra cosa. Y lo que nombra zonas
 *     del mundo de antes —dónde reaparece lo que nadie remata— pasa a las bocas de éste.
 *
 * Por qué no se espera a que el productor dé la ciudad él solo: porque medir no puede depender de que el
 * frente que lo escribe haya acabado, y porque «dispersos» y «20 vivas» no los da ninguna fase del juego de
 * hoy. Lo que sí es del productor —el mundo guardado y validado una vez— lo mira `verify:sala-de-la-liza`
 * con el de verdad.
 */

/** Cómo se reparten los asientos por la ciudad. */
export type DisposicionEnLaCiudad = 'dispersos' | 'agrupados';

/** El juego cuya ciudad es. */
export const ARCADE_DE_LA_CIUDAD = 'quiebro';

/** Lo que se hace con la liza de una mesa para medirla en la ciudad. Ver la cabecera del escenario. */
export interface CiudadDelBanco {
  readonly disposicion: DisposicionEnLaCiudad;
  /** La ciudad de la mesa `codigo`: la traza (0-31) y la plaza de la Bajada (1-6). Antes de su primera liza. */
  ponerLaMesa(codigo: string, traza: number, bajada: number): void;
  /** La liza de la mesa en su ciudad. Lanza si a la mesa no se le ha puesto ciudad. */
  enLaCiudad(liza: LizaDeclarada, codigo: string): LizaDeclarada;
  /** El mundo de la ciudad de la mesa (el mismo objeto siempre), o `null` si no se le ha puesto. */
  mundoDe(codigo: string): MundoDeLaLiza | null;
}

/** La puerta del diseño (§6.3): una sala llena de la ciudad cuesta esto o menos en PC, en µs de CPU por segundo. */
export const SALA_LLENA_EN_LA_CIUDAD_US = 9000;

/** Cuántas de las vivas del encuentro sin fin son Celadores y tiradores; el resto, Prestados. */
const CELADORES_SIN_FIN = 4;
const TIRADORES_SIN_FIN = 2;

/**
 * EL ESCENARIO «CIUDAD», listo para usar: carga la ciudad (la columna de `quiebro-ciudad.ts`) y las clases
 * del juego a la primera llamada, para que el banco de siempre y el robot no las carguen.
 */
export async function ciudadDelBanco(disposicion: DisposicionEnLaCiudad): Promise<CiudadDelBanco> {
  const C = await import('../../shared/arcade/juegos/quiebro-ciudad');
  const { CLASE_DEL_QUIEBRO } = await import('../../shared/arcade/juegos/quiebro-reglas');
  const TIPOS = ['fallo', 'impresion', 'boca'] as const;
  /* Con `dispersos`, la clase de cada zona de plaza pasa a la de su tipo (1-3), la misma en las seis. */
  const juntas = new Map<number, number>();
  for (let p = 1; p <= C.PLAZAS_POR_CIUDAD; p++) {
    for (let k = 0; k < TIPOS.length; k++) juntas.set(C.claseDeZonaDePlaza(p, TIPOS[k] as (typeof TIPOS)[number]), k + 1);
  }
  const mesas = new Map<string, { traza: number; bajada: number; mundo: MundoDeLaLiza | null }>();

  const dispersar = (base: MundoDeLaLiza): MundoDeLaLiza => {
    /* Los de asiento vienen de seis en seis por plaza, la de la Bajada delante: un sitio de cada plaza, delante. */
    const deAsiento = base.nace.filter((s) => s.papel === 'asiento');
    const delante: SitioDeNacer[] = [];
    for (let p = 0; p < C.PLAZAS_POR_CIUDAD; p++) {
      const s = deAsiento[p * C.SITIOS_DE_ASIENTO_POR_PLAZA];
      if (s === undefined) throw new Error(`El mundo de la ciudad no trae ${String(C.SITIOS_DE_ASIENTO_POR_PLAZA)} sitios de asiento por plaza.`);
      delante.push(s);
    }
    return {
      ...base,
      zonas: base.zonas.map((z) => {
        const tipo = juntas.get(z.clase);
        return tipo === undefined ? z : { ...z, clase: tipo };
      }),
      nace: [...delante, ...base.nace.filter((s) => !delante.includes(s))],
    };
  };

  const mundoDe = (codigo: string): MundoDeLaLiza | null => {
    const m = mesas.get(codigo);
    if (m === undefined) return null;
    if (m.mundo === null) {
      const ciudad = C.ciudadDeLaMesa(m.traza, codigo);
      const base = C.mundoDeLaLizaDeLaCiudad(C.ciudadDeLaNoche(ciudad, codigo, 1, [m.bajada]), false);
      m.mundo = disposicion === 'agrupados' ? base : dispersar(base);
    }
    return m.mundo;
  };

  /** De qué zonas sale cada tipo: las de la plaza de la Bajada, o las de todas con `dispersos`. */
  const zonaDe = (bajada: number, tipo: (typeof TIPOS)[number]): number =>
    disposicion === 'agrupados' ? C.claseDeZonaDePlaza(bajada, tipo) : TIPOS.indexOf(tipo) + 1;

  const sinFin = (en: EncuentroDeclarado, vivas: number, bajada: number): EncuentroDeclarado => {
    const plantilla = en.grupos[0];
    if (plantilla === undefined) throw new Error('El encuentro del productor no trae ningún grupo del que copiar la forma.');
    const porPresentes = (v: number): number[] => en.vivasALaVez.map(() => v);
    const grupo = (clase: number, claseDeZona: number, vivasDelGrupo: number, desdeTic: number, cadaTics: number): GrupoDeclarado => ({
      ...plantilla,
      clase,
      cuantos: porPresentes(TOPE_DE_CANTIDAD),
      vivasALaVez: porPresentes(vivasDelGrupo),
      claseDeZona,
      desdeTic,
      cadaTics,
      eleccion: 'azar',
    });
    return {
      ...en,
      relojTics: TOPE_DE_TICS,
      vivasALaVez: porPresentes(vivas),
      /* Sin fin de verdad: ni se vacía ni tiene salida (la de la Llamada nombra zonas de otro mundo). */
      fin: { tipo: 'vaciar' },
      grupos: [
        grupo(CLASE_DEL_QUIEBRO.prestado, zonaDe(bajada, 'boca'), vivas - CELADORES_SIN_FIN - TIRADORES_SIN_FIN, 0, 10),
        grupo(CLASE_DEL_QUIEBRO.celador, zonaDe(bajada, 'impresion'), CELADORES_SIN_FIN, 40, 40),
        grupo(CLASE_DEL_QUIEBRO.tirador, zonaDe(bajada, 'boca'), TIRADORES_SIN_FIN, 60, 60),
      ],
    };
  };

  return {
    disposicion,
    ponerLaMesa: (codigo, traza, bajada) => {
      C.partesDeLaTraza(traza);
      if (!Number.isInteger(bajada) || bajada < 1 || bajada > C.PLAZAS_POR_CIUDAD) throw new RangeError(`No hay plaza ${String(bajada)}.`);
      mesas.set(codigo, { traza, bajada, mundo: null });
    },
    enLaCiudad: (liza, codigo) => {
      const mundo = mundoDe(codigo);
      const m = mesas.get(codigo);
      if (mundo === null || m === undefined) throw new Error(`A la mesa ${codigo} no se le ha puesto ciudad (\`ponerLaMesa\`).`);
      const en = liza.fase.encuentro;
      /*
       * Lo que vuelve a aparecer si nadie lo remata lo hace en zonas de una clase: si el productor nombra una
       * que este mundo no tiene (la de su mundo de antes), sale por las bocas, como los Prestados.
       */
      const hay = new Set(mundo.zonas.map((z) => z.clase));
      const clases = liza.clases.map((c) =>
        c.alCaer.tipo === 'rematable' && !hay.has(c.alCaer.siNo.claseDeZona)
          ? { ...c, alCaer: { ...c.alCaer, siNo: { ...c.alCaer.siNo, claseDeZona: zonaDe(m.bajada, 'boca') } } }
          : c,
      );
      return {
        ...liza,
        mundo,
        clases,
        fase: {
          ...liza.fase,
          limite: C.ID_DEL_LIMITE_DE_LA_CIUDAD,
          encuentro: en === null ? null : sinFin(en, liza.aforo.entidades, m.bajada),
        },
      };
    },
    mundoDe,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * EL BANCO (sólo si este fichero es el guion que se corre)
 * ═══════════════════════════════════════════════════════════════════════════ */

const esElGuion = process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

/** Cuánto se espera, como mucho, a que todas las salas estén en combate antes de medir. */
const ESPERA_DEL_COMBATE_MS = 60_000;

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

if (esElGuion) await banco();

async function banco(): Promise<void> {
  const args = process.argv.slice(2);
  const opcion = (n: string, pd: string): string => {
    const i = args.indexOf(`--${n}`);
    const v = args[i + 1];
    return i >= 0 && v !== undefined ? v : pd;
  };
  const JUGUETE = args.includes('--juguete');
  const CIUDAD = args.includes('--ciudad');
  const RED = args.includes('--red');
  const { enchufarLaLiza } = await import('../src/liza/enchufe');
  const SEGUNDOS = Number(opcion('segundos', '10'));
  if (JUGUETE && CIUDAD) {
    console.error('`--juguete` y `--ciudad` son dos escenarios distintos: uno u otro.');
    process.exit(1);
  }
  /*
   * Con `--ciudad`, 9 salas de 6 por defecto —las que caben por lo declarado, que es como se miden: con una
   * sola, en Windows, la cifra sale inflada para todos— en las dos disposiciones, los dispersos primero.
   */
  const disposiciones: DisposicionEnLaCiudad[] = ((): DisposicionEnLaCiudad[] => {
    const d = opcion('disposicion', 'las-dos');
    if (d === 'dispersos' || d === 'agrupados') return [d];
    if (d !== 'las-dos') {
      console.error(`--disposicion ${d}: tiene que ser dispersos, agrupados o las-dos.`);
      process.exit(1);
    }
    return ['dispersos', 'agrupados'];
  })();
  const tandas: { salas: number; asientos: number; disposicion: DisposicionEnLaCiudad | null }[] = CIUDAD
    ? disposiciones.map((disposicion) => ({ salas: Number(opcion('salas', '9')), asientos: Number(opcion('asientos', '6')), disposicion }))
    : opcion('salas', '').length > 0
      ? [{ salas: Number(opcion('salas', '1')), asientos: Number(opcion('asientos', '6')), disposicion: null }]
      : [
          { salas: 1, asientos: 6, disposicion: null },
          { salas: 1, asientos: 1, disposicion: null },
          { salas: 10, asientos: 6, disposicion: null },
          { salas: 10, asientos: 1, disposicion: null },
        ];

  /* La carpeta de las mesas ANTES de cargar `mesas.ts`, que la lee al cargarse. */
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'medir-liza-'));
  process.env.MESAS_DIR = carpeta;
  const { CanalDeLaLiza } = await import('../src/liza/canal');
  const liza = await import('../src/liza/index');
  const lizas = await import('../../shared/arcade/juegos/lizas');
  await import('../../shared/arcade/juegos');
  const mesas = await import('../src/arcade/mesas');
  /* El canal de sondeo, como lo pone `index.ts`: sin él, avisar de un veredicto que entró lanza a propósito. */
  const { ponerCanal } = await import('../src/canal');
  const { canalDeSondeo } = await import('../src/canal/sondeo');
  ponerCanal(canalDeSondeo);
  const gc = (globalThis as { gc?: () => void }).gc;

  const arcade = JUGUETE ? null : CIUDAD ? ARCADE_DE_LA_CIUDAD : (lizas.arcadesQueSeLidian()[0] ?? null);
  if (!JUGUETE && arcade === null) {
    console.error('El registro de lizas está vacío: no hay juego de verdad que medir. Usa `--juguete`, o da de alta un juego en `lizas.ts`.');
    process.exit(1);
  }
  if (CIUDAD && !lizas.sePuedeLidiar(ARCADE_DE_LA_CIUDAD)) {
    console.error(`«${ARCADE_DE_LA_CIUDAD}» no está en el registro de lizas: no hay ciudad que medir.`);
    process.exit(1);
  }
  console.log(
    `\nMIDIENDO LA LIZA — ${
      JUGUETE
        ? 'liza de juguete (encuentro sin fin, aforo de sala llena)'
        : CIUDAD
          ? `el juego «${String(arcade)}» con su mesa de verdad, EN LA CIUDAD (encuentro sin fin con las vivas del aforo, límite ciudad)`
          : `el juego «${String(arcade)}» con su mesa de verdad`
    }, ${String(SEGUNDOS)} s por tanda\n`,
  );

  for (const tanda of tandas) {
    gc?.();
    const montonAntes = process.memoryUsage().heapUsed;
    /* El escenario «ciudad», si toca: la liza del productor, pasada a la ciudad (ver su cabecera). */
    const ciudad = tanda.disposicion === null ? null : await ciudadDelBanco(tanda.disposicion);
    const lizaDe = (a: string, v: unknown, codigo: string): LizaDeclarada | null => {
      const l = lizas.lizaDeLaMesa(a, v, codigo);
      return l === null || ciudad === null ? l : ciudad.enLaCiudad(l, codigo);
    };
    /** Cada robot con su mesa y el buzón de lo que le ha bajado y aún no ha leído. */
    const enElBanco: { robot: RobotDeLaLiza; codigo: string; buzon: string[] }[] = [];
    const lizasDeLaMesa = new Map<string, LizaDeclarada | null>();
    const vistasDeMentira = new Map<string, LizaDeclarada>();
    const registro: string[] = [];
    let veredictosDeJuguete = 0;

    /* La mesa de mentira del juguete: la llave es `código:asiento`, y los veredictos se cuentan. */
    const mesaDeJuguete = {
      quienEsLaLlave: async (codigo: string, llave: string) => (llave.startsWith(`${codigo}:`) ? llave.slice(codigo.length + 1) : null),
      revision: async () => ({ rev: 1, terminada: false }),
      vista: async (codigo: string) => {
        const l = vistasDeMentira.get(codigo);
        return l === undefined ? null : { arcade: 'juguete', rev: 1, terminada: false, vista: l };
      },
      meter: async () => {
        veredictosDeJuguete++;
        return { salida: 'sinEfecto' as const };
      },
    };
    const canal = new CanalDeLaLiza({
      reloj: liza.RELOJ_DE_LA_LIZA,
      mesa: JUGUETE ? mesaDeJuguete : liza.LA_MESA_DE_LA_LIZA,
      lizas: JUGUETE
        ? { sePuedeLidiar: (a) => a === 'juguete', lizaDeLaMesa: (_a, v) => v as LizaDeclarada }
        : ciudad !== null
          ? { sePuedeLidiar: liza.LAS_LIZAS_DE_VERDAD.sePuedeLidiar, lizaDeLaMesa: lizaDe }
          : liza.LAS_LIZAS_DE_VERDAD,
      motor: liza.EL_MOTOR_DE_VERDAD,
      /* Se guarda y se calla: sólo se dice si la tanda no llega al combate (una liza que no se abre, por ejemplo). */
      registrar: (l) => {
        registro.push(l);
        if (registro.length > 50) registro.shift();
      },
    });
    /* Con `--red`, el enchufe de verdad en un servidor HTTP de este proceso, en un puerto del sistema. */
    let red: { servidor: http.Server; puerto: number; clientes: WebSocket[] } | null = null;
    if (RED) {
      const servidor = http.createServer((_q, r) => {
        r.statusCode = 404;
        r.end();
      });
      enchufarLaLiza(servidor, canal, { produccion: false, extra: [] });
      await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', () => r()));
      red = { servidor, puerto: (servidor.address() as AddressInfo).port, clientes: [] };
    }

    /** La liza de una mesa de verdad, al día: la misma función que el servidor, sobre la vista de espectador. */
    const ponerAlDia = async (codigo: string): Promise<void> => {
      const v = await mesas.mirar(codigo, null);
      lizasDeLaMesa.set(codigo, lizaDe(v.arcade, v.vista, codigo));
    };

    for (let s = 0; s < tanda.salas; s++) {
      let codigo: string;
      const llaves: string[] = [];
      if (JUGUETE) {
        codigo = `M${String(s).padStart(4, '0')}`;
        const asientos = Array.from({ length: tanda.asientos }, (_, i) => `a${String(i + 1)}`);
        const declarada = lizaDeEncuentro(asientos, 4242 + s);
        vistasDeMentira.set(codigo, declarada);
        lizasDeLaMesa.set(codigo, declarada);
        for (const a of asientos) llaves.push(`${codigo}:${a}`);
      } else {
        const abierta = await mesas.abrir({ arcade: arcade as string, nombre: 'R1', plazoSegundos: 300 });
        codigo = abierta.mesa.codigo;
        /*
         * Su ciudad, antes de su primera liza: trazas repartidas por los cuatro dibujos y sus simetrías, y la
         * Bajada en cada una de las seis plazas por turno (tres plantillas: glorieta, porticada y patio).
         */
        ciudad?.ponerLaMesa(codigo, (s * 9) % 32, 1 + (s % 6));
        llaves.push(abierta.silla.llave);
        for (let i = 1; i < tanda.asientos; i++) llaves.push((await mesas.sentarse(codigo, `R${String(i + 1)}`)).llave);
        /* Se empieza con lo primero que la mesa le ofrece al primer asiento, hasta que esté empezada. */
        for (let i = 0; i < 5; i++) {
          const v = await mesas.mirar(codigo, llaves[0] as string);
          if (v.empezada) break;
          const primera = v.opciones[0];
          if (primera === undefined) break;
          await mesas.mover(codigo, llaves[0] as string, v.rev, { tipo: primera.tipo, carga: primera.carga ?? null });
        }
        await ponerAlDia(codigo);
      }
      for (const llave of llaves) {
        const buzon: string[] = [];
        if (red !== null) {
          /* Con `--red`, un cliente `ws` de verdad contra el enchufe de verdad, por el bucle local. */
          const ws = new WebSocket(`ws://127.0.0.1:${String(red.puerto)}${rutaDeLaLiza(codigo)}`);
          red.clientes.push(ws);
          const robot = new RobotDeLaLiza({
            llave,
            reloj: () => performance.now(),
            liza: () => lizasDeLaMesa.get(codigo) ?? null,
            mandar: (texto) => {
              if (ws.readyState === WebSocket.OPEN) ws.send(texto);
            },
          });
          ws.on('open', () => robot.abrir());
          ws.on('message', (d) => buzon.push(d.toString()));
          ws.on('close', () => {
            robot.dentro = false;
          });
          ws.on('error', () => {});
          enElBanco.push({ robot, codigo, buzon });
          continue;
        }
        let conexion: ReturnType<typeof canal.abrir> | null = null;
        const robot = new RobotDeLaLiza({
          llave,
          reloj: () => performance.now(),
          liza: () => lizasDeLaMesa.get(codigo) ?? null,
          mandar: (texto) => conexion?.recibir(texto),
        });
        /*
         * Lo que baja va al buzón y el robot lo lee en SU latido: si lo leyera dentro de `enviar`, su
         * trabajo caería dentro del paso de la sala y el coste medido sería el de los dos.
         */
        conexion = canal.abrir(codigo, {
          enviar: (texto) => buzon.push(texto),
          cerrar: () => {
            robot.dentro = false;
          },
          pendientes: () => 0,
          ping: (numero) => setImmediate(() => conexion?.pong(numero)),
        });
        robot.abrir();
        enElBanco.push({ robot, codigo, buzon });
      }
    }

    /* Un solo latido para todos los robots: leen lo que les bajó y mandan su `aqui`. */
    const latido = setInterval(() => {
      for (const { robot, buzon } of enElBanco) {
        for (const t of buzon.splice(0)) robot.recibir(t);
        robot.latir();
      }
    }, 25);
    const codigos = [...new Set(enElBanco.map((e) => e.codigo))];
    const alDia = JUGUETE ? null : setInterval(() => codigos.forEach((c) => void ponerAlDia(c)), 1000);

    /* A combate antes de medir (ver «qué se mide, y cuándo»), y un segundo más para que salgan. */
    const enEncuentro = (): boolean => codigos.every((c) => lizasDeLaMesa.get(c)?.fase.modo === 'encuentro');
    const nacidasEn = (c: string): number =>
      enElBanco.filter((e) => e.codigo === c).reduce((s, e) => s + (e.robot.cuentas.sucesos.nace ?? 0), 0);
    const enCombate = (): boolean => enEncuentro() && codigos.every((c) => nacidasEn(c) > 0);
    const tEspera = performance.now();
    while (!enCombate() && performance.now() - tEspera < ESPERA_DEL_COMBATE_MS) await dormir(250);
    const llegoAlCombate = enCombate();
    const esperado = (performance.now() - tEspera) / 1000;
    await dormir(1000);

    const robots = enElBanco.map((e) => e.robot);
    const cpu0 = process.cpuUsage();
    const elu0 = performance.eventLoopUtilization();
    const t0 = performance.now();
    const bajado0 = robots.reduce((s, r) => s + r.cuentas.bytesBajados, 0);
    const muestras: number[] = [];
    /* Lo que dicen costar TODAS las salas juntas, cada segundo: para ponerlo al lado del hilo ocupado. */
    const juntas: number[] = [];
    let segundosFuera = 0;
    const d0 = canal.diagnostico();
    for (let i = 0; i < SEGUNDOS; i++) {
      await dormir(1000);
      const d = canal.diagnostico();
      juntas.push(d.costeMedido);
      if (llegoAlCombate && !enEncuentro()) segundosFuera++;
      else muestras.push(...d.costeMedidoPorSala);
    }
    const cpu = process.cpuUsage(cpu0);
    const elu = performance.eventLoopUtilization(elu0);
    const segundos = (performance.now() - t0) / 1000;
    const d1 = canal.diagnostico();
    const bajado = robots.reduce((s, r) => s + r.cuentas.bytesBajados, 0) - bajado0;
    clearInterval(latido);
    if (alDia !== null) clearInterval(alDia);
    gc?.();
    const monton = process.memoryUsage().heapUsed - montonAntes;
    canal.apagar();
    if (red !== null) {
      for (const ws of red.clientes) ws.terminate();
      red.servidor.closeAllConnections();
      await new Promise<void>((r) => red?.servidor.close(() => r()) ?? r());
    }

    muestras.sort((a, b) => a - b);
    const mediana = muestras[Math.floor(muestras.length / 2)] ?? 0;
    const p90 = muestras[Math.floor(muestras.length * 0.9)] ?? 0;
    const declarado = d1.costeDeclarado / Math.max(1, d1.salas);
    const suma = (f: (r: RobotDeLaLiza) => number): number => robots.reduce((s, r) => s + f(r), 0);
    const hiloMsPorS = elu.active / segundos;
    const juntasMsPorS = juntas.reduce((s, x) => s + x, 0) / Math.max(1, juntas.length) / 1000;
    const presupuesto = lizas.PRESUPUESTO_DE_LAS_LIZAS;
    console.log(
      `· ${String(tanda.salas)} sala(s) de ${String(tanda.asientos)} asiento(s)${tanda.disposicion === null ? '' : ` en la ciudad, ${tanda.disposicion}`}, ${String(robots.length)} robots — ` +
        (llegoAlCombate
          ? `en combate a los ${esperado.toFixed(1)} s`
          : `SIN COMBATE en ${esperado.toFixed(0)} s: lo que sigue NO es el coste de una sala en combate`),
    );
    if (!llegoAlCombate && registro.length > 0) console.log(`    lo último que dijo el canal: ${registro.slice(-3).join(' · ')}`);
    if (ciudad !== null) {
      const mundos = codigos.map((c) => ciudad.mundoDe(c)).filter((m): m is MundoDeLaLiza => m !== null);
      const cuenta = (f: (m: MundoDeLaLiza) => number): string => {
        const v = mundos.map(f);
        return v.length === 0 ? '—' : `${String(Math.min(...v))}-${String(Math.max(...v))}`;
      };
      console.log(
        `    la ciudad de cada sala: ${cuenta((m) => m.suelo.pisables.length)} casillas, ${cuenta((m) => m.suelo.cuerpos.length)} cajas, ` +
          `${cuenta((m) => m.grafo.nudos.length)} nudos, ${cuenta((m) => m.grafo.aristas.length)} aristas, ${cuenta((m) => m.zonas.length)} zonas`,
      );
    }
    console.log(
      `    coste medido por sala: mediana ${String(Math.round(mediana))} µs/s, p90 ${String(Math.round(p90))} µs/s ` +
        `(declarado ${String(Math.round(declarado))} µs/s; salas vivas ${String(d1.salas)}; ` +
        `${String(SEGUNDOS - segundosFuera)} de ${String(SEGUNDOS)} s en encuentro${segundosFuera > 0 ? ', los demás fuera de la mediana' : ''})`,
    );
    console.log(
      `    en el presupuesto (${String(presupuesto)} µs/s) caben ${String(Math.floor(presupuesto / Math.max(1, declarado)))} salas así por lo declarado, ` +
        `y ${p90 > 0 ? String(Math.floor(presupuesto / p90)) : '—'} por lo medido (p90)`,
    );
    if (ciudad !== null) {
      const juicio = (v: number): string => (v <= SALA_LLENA_EN_LA_CIUDAD_US ? 'dentro' : 'FUERA');
      console.log(
        `    la puerta de la ciudad (una sala llena en ${String(SALA_LLENA_EN_LA_CIUDAD_US)} µs/s o menos, en PC): ` +
          `mediana ${juicio(mediana)}, p90 ${juicio(p90)}${tanda.salas < 9 ? ' — con menos de 9 salas la cifra no vale: en Windows sale inflada' : ''}`,
      );
    }
    console.log(
      `    hilo principal ocupado (robots incluidos): ${hiloMsPorS.toFixed(1)} ms/s, cota de lo que las salas dicen costar juntas: ` +
        `${juntasMsPorS.toFixed(1)} ms/s${juntasMsPorS > hiloMsPorS ? '  ← ¡MÁS QUE EL HILO ENTERO: la medida del canal está mal!' : ''}`,
    );
    console.log(
      `    CPU del proceso (robots y recogida de basura incluidos): ${((cpu.user + cpu.system) / 1000 / segundos).toFixed(1)} ms/s ` +
        `(en Windows, a golpes de 15,6 ms: no es cota); pasos: ${String(Math.round((d1.pasos - d0.pasos) / segundos))}/s; ` +
        `reanclajes: ${String(d1.reanclajes - d0.reanclajes)}; validaciones en la ventana: ${String(d1.validaciones.veces - d0.validaciones.veces)} ` +
        `(la más lenta de la tanda, contando al abrir las salas: ${d1.validaciones.msMasLenta.toFixed(1)} ms)`,
    );
    console.log(
      `    validaciones de la tanda: ${String(d1.validaciones.veces)}, ${d1.validaciones.ms.toFixed(1)} ms en total; ` +
        `mundos revisados de verdad: ${String(d1.validacionesDelMundo)}, de ${String(d1.mundosNuevos)} mundos nuevos para sus salas`,
    );
    console.log(
      `    bajada por aparato: ${(bajado / robots.length / segundos / 1024).toFixed(2)} kB/s; ` +
        `montón por sala: ${(monton / tanda.salas / 1024).toFixed(0)} kB`,
    );
    console.log(
      `    juego: ${String(suma((r) => r.cuentas.sucesos.nace ?? 0))} nacidas, ${String(suma((r) => r.cuentas.anunciosContraMi))} anuncios contra robots, ` +
        `${String(suma((r) => r.cuentas.esquivasPulsadas))} esquivas pulsadas, ${String(suma((r) => r.cuentas.limpias))} limpias, ` +
        `${String(suma((r) => r.cuentas.esquivadas))} esquivadas, ${String(suma((r) => r.cuentas.meDieron))} les dieron, ` +
        `${String(suma((r) => r.cuentas.fallaronContraMi))} fallaron, ${String(suma((r) => r.cuentas.golpesQueDieron))} golpes que dieron, ` +
        `${String(suma((r) => r.cuentas.correcciones))} correcciones, ${String(veredictosDeJuguete + d1.veredictos.entro)} veredictos, ` +
        `${String(suma((r) => r.cuentas.ilegibles))} ilegibles, ${String(robots.filter((r) => r.fuera !== null).length)} echados`,
    );
    const antelaciones = robots.flatMap((r) => r.cuentas.antelaciones).sort((a, b) => a - b);
    if (antelaciones.length > 0) {
      console.log(
        `    antelación de los anuncios contra robots: mínima ${String(Math.round(antelaciones[0] as number))} ms, ` +
          `mediana ${String(Math.round(antelaciones[antelaciones.length >> 1] as number))} ms; ` +
          `${String(suma((r) => r.cuentas.cortadas))} cortadas o paradas`,
      );
    }
  }
  try {
    fs.rmSync(carpeta, { recursive: true, force: true });
  } catch {
    /* en Windows un fichero recién cerrado a veces sigue tomado un instante */
  }
  process.exit(0);
}
