/**
 * EL MAPA DE LA PARTIDA: la `FuenteDelMapa` y las `OrdenesDelMapa` de verdad (contrato en `../orientacion.ts`),
 * sacadas de lo que la partida ya sabe —la ciudad de la noche, mi cuerpo, los compañeros, la cabina que
 * suena— para que el minimapa, el plano y el rumbo estén VIVOS (`docs/quiebro/CIUDAD-ABIERTA.md` §5.9).
 * Sin React ni three: el HUD lo lee en su `requestAnimationFrame` y `verify:quiebro-juego` en Node.
 *
 * ═══ LAS MARCAS, Y POR QUÉ ESAS ═══
 *
 * Como mucho `MARCAS_DEL_MINIMAPA`, por este orden, y se rehacen `REFRESCOS_DEL_MINIMAPA` veces por
 * segundo como mucho (el minimapa y el plano las piden a la vez: la segunda pregunta es gratis):
 *   1. el «Aquí» propio (un nudo tocado en el plano), con el rumbo;
 *   2. las cabinas que suenan (la zona de acción de la sala: la Llamada), en ámbar;
 *   3. los compañeros caídos a `METROS_DEL_RESCATE` o menos por calles («Rescate»), y los demás compañeros,
 *      con el color de su asiento y sus metros por calles;
 *   4. al Vigía, los enemigos a `METROS_DE_LA_VIGIA` o menos de un compañero con cuerpo;
 *   5. si queda sitio, los refugios de la ciudad (donde se reaparece), sin metros salvo el del rumbo.
 * Los Fallos y los «Voy» de los demás llegan con la entrega 2 (ola C: `noche.fallos` más allá de la
 * Bajada, y la declaración L8 en el cable).
 *
 * ═══ LOS METROS SON LOS DE LA SALA ═══
 *
 * Los de un objetivo quieto (una cabina, un refugio, el nudo de un «Aquí») salen de SU campo
 * (`CamposPorMeta`, uno por meta, un Dijkstra por objetivo y noche) leído desde mi sitio con
 * `distanciaPorCalles`: lo mismo que mide la sala hacia esa meta. Los de una cabina o un refugio llegan
 * hasta su SITIO, no hasta el nudo de la calzada (`metrosHastaElSitio`): como los mide el productor al
 * elegir la cabina, y en el sitio, 0. Los de un compañero, que se mueve, de un
 * campo desde MI nudo, que se rehace sólo cuando mi nudo más cercano cambia (unas dos veces por segundo a
 * la carrera, ≈ 0,3 ms cada una), leído en el suyo: el grafo va en los dos sentidos, así que es la misma
 * distancia.
 *
 * ═══ «AQUÍ», HOY ═══
 *
 * Tocar un sitio del plano es «Aquí» sobre el nudo más cercano (L8). Mientras el cable no lleve L8 (ola
 * C), «Aquí» tiende MI rumbo a ese nudo: el hilo y los metros llevan a cualquier sitio de la ciudad, que
 * es lo que se pide para recorrerla. Tocarlo otra vez lo suelta.
 */
import type { CampoDeDistancias, GrafoDeLaCiudad, NocheDeLaCiudad } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import { campoHasta, nudoMasCercano } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import { PRIMER_NUMERO_DE_ENTIDAD } from '../../../../shared/mecanicas/liza/protocolo';
import type { FuenteDelMapa, MarcaDelMapa, ObjetivoDelRumbo, OrdenesDelMapa, PosicionEnElMapa, RumboTendido } from '../orientacion';
import { MARCAS_DEL_MINIMAPA, METROS_DE_LA_VIGIA, METROS_DEL_RESCATE, REFRESCOS_DEL_MINIMAPA } from '../orientacion';
import { CamposPorMeta, metrosDelRumbo, metrosHastaElSitio, metrosPorCalles, mismoObjetivo, nudoDelObjetivo, rumboHacia, tramoFinal } from '../hud/rumbo';
import type { Partida } from './partida';
import { COLORES_DE_ASIENTO } from './partida';

/** Lo que tarda en rehacerse la lista de marcas: la del minimapa. */
const MARCAS_CADA_MS = 1000 / REFRESCOS_DEL_MINIMAPA;

/** Lo que la orientación lee de la partida: sólo esto, para poder probarla con una partida de mentira. */
export type PartidaQueOrienta = Pick<Partida, 'nocheDeLaCiudad' | 'yo' | 'pintadoDe' | 'cuerpos' | 'conCuerpo' | 'jugando' | 'sentidoDe' | 'sala' | 'giroDeLaCamara'>;

export class OrientacionDeLaPartida implements FuenteDelMapa, OrdenesDelMapa {
  /** Los campos de los objetivos quietos, uno por (grafo, meta). */
  readonly campos = new CamposPorMeta();
  /** El campo desde MI nudo (para los compañeros): de qué grafo y nudo es, y cuántas veces se ha hecho. */
  private desdeMi: { grafo: GrafoDeLaCiudad; nudo: number; campo: CampoDeDistancias } | null = null;
  camposDesdeMi = 0;
  private objetivo: ObjetivoDelRumbo | null = null;
  private tendido: RumboTendido | null = null;
  /** La noche con que se tendió el rumbo: con otra (otra noche, otras obras) se vuelve a tender. */
  private nocheDelRumbo: NocheDeLaCiudad | null = null;
  private readonly posicion: PosicionEnElMapa = { x: 0, z: 0, mira: 0 };
  private readonly lista: MarcaDelMapa[] = [];
  private readonly reserva: MarcaDelMapa[] = [];
  private hechasMs = Number.NEGATIVE_INFINITY;
  private nocheDeLasMarcas: NocheDeLaCiudad | null = null;
  /** Cuántas veces se ha rehecho la lista de marcas (para el comprobador: se CUENTA, no se cronometra). */
  rehechas = 0;

  constructor(
    private readonly partida: PartidaQueOrienta,
    private readonly ahora: () => number = () => performance.now(),
  ) {}

  /* ─────────────────────────── FuenteDelMapa ─────────────────────────── */

  noche(): NocheDeLaCiudad | null {
    return this.partida.nocheDeLaCiudad();
  }

  yo(): PosicionEnElMapa | null {
    const n = this.partida.yo();
    if (n === null || !this.partida.conCuerpo()) return null;
    const c = this.partida.pintadoDe(n);
    if (c === null) return null;
    this.posicion.x = c.x;
    this.posicion.z = c.z;
    this.posicion.mira = c.rumbo;
    return this.posicion;
  }

  giroDeLaCamara(): number {
    return this.partida.giroDeLaCamara;
  }

  vigia(): boolean {
    return this.partida.jugando() && !this.partida.conCuerpo();
  }

  rumbo(): RumboTendido | null {
    const noche = this.noche();
    if (noche === null) return null;
    if (this.objetivo !== null && noche !== this.nocheDelRumbo) {
      /* Otra noche (u otras obras): el mismo objetivo con el campo de su grafo, si aún existe. */
      this.tendido = rumboHacia(noche, this.objetivo, this.partida.yo() ?? 0, this.campos);
      this.nocheDelRumbo = noche;
      if (this.tendido === null) this.objetivo = null;
    }
    return this.tendido;
  }

  marcas(): readonly MarcaDelMapa[] {
    const ahora = this.ahora();
    const noche = this.noche();
    if (noche === null) {
      this.lista.length = 0;
      return this.lista;
    }
    if (ahora - this.hechasMs < MARCAS_CADA_MS && noche === this.nocheDeLasMarcas) return this.lista;
    this.hechasMs = ahora;
    this.nocheDeLasMarcas = noche;
    this.rehacerLasMarcas(noche, ahora);
    return this.lista;
  }

  /* ─────────────────────────── OrdenesDelMapa ─────────────────────────── */

  aqui(nudo: number): void {
    const objetivo: ObjetivoDelRumbo = { tipo: 'nudo', nudo };
    if (mismoObjetivo(this.objetivo, objetivo)) {
      this.soltarElRumbo();
      return;
    }
    this.tenderElRumbo(objetivo);
  }

  tenderElRumbo(objetivo: ObjetivoDelRumbo): void {
    const noche = this.noche();
    if (noche === null) return;
    const tendido = rumboHacia(noche, objetivo, this.partida.yo() ?? 0, this.campos);
    if (tendido === null) return;
    this.objetivo = objetivo;
    this.tendido = tendido;
    this.nocheDelRumbo = noche;
    this.hechasMs = Number.NEGATIVE_INFINITY;
  }

  soltarElRumbo(): void {
    this.objetivo = null;
    this.tendido = null;
    this.nocheDelRumbo = null;
    this.hechasMs = Number.NEGATIVE_INFINITY;
  }

  /** El objetivo del rumbo propio, o `null`. */
  objetivoDelRumbo(): ObjetivoDelRumbo | null {
    return this.objetivo;
  }

  /* ─────────────────────────── Las marcas ─────────────────────────── */

  /** Una marca de la reserva (se reutilizan los objetos entre refrescos). */
  private marca(): MarcaDelMapa | null {
    if (this.lista.length >= MARCAS_DEL_MINIMAPA) return null;
    let m = this.reserva[this.lista.length];
    if (m === undefined) {
      m = { clase: 'companero', x: 0, z: 0, color: null, metros: -1, quien: 0, rumbo: false };
      this.reserva.push(m);
    }
    this.lista.push(m);
    return m;
  }

  private poner(clase: MarcaDelMapa['clase'], x: number, z: number, color: string | null, metros: number, quien: number, rumbo: boolean): void {
    const m = this.marca();
    if (m === null) return;
    m.clase = clase;
    m.x = x;
    m.z = z;
    m.color = color;
    m.metros = metros;
    m.quien = quien;
    m.rumbo = rumbo;
  }

  /** El campo desde mi nudo más cercano, rehecho sólo si cambió (ver la cabecera). */
  private campoDesdeMi(grafo: GrafoDeLaCiudad, x: number, z: number): CampoDeDistancias | null {
    const nudo = nudoMasCercano(grafo, x, z);
    if (nudo < 0) return null;
    const d = this.desdeMi;
    if (d !== null && d.grafo === grafo && d.nudo === nudo) return d.campo;
    const campo = campoHasta(grafo, nudo);
    this.camposDesdeMi++;
    this.desdeMi = { grafo, nudo, campo };
    return campo;
  }

  /**
   * Los metros por calles de mi sitio a un objetivo quieto (su campo guardado), o −1: hasta su SITIO si lo
   * tiene (una cabina, donde se descuelga; ver «El hilo acaba donde se descuelga» en `hud/rumbo.ts`).
   */
  private metrosHasta(noche: NocheDeLaCiudad, objetivo: ObjetivoDelRumbo, yo: PosicionEnElMapa | null): number {
    if (yo === null) return -1;
    const meta = nudoDelObjetivo(noche, objetivo);
    if (meta < 0) return -1;
    return metrosHastaElSitio(noche.grafo, this.campos.campo(noche.grafo, meta), tramoFinal(noche, objetivo), yo.x, yo.z);
  }

  private rehacerLasMarcas(noche: NocheDeLaCiudad, ahora: number): void {
    this.rehechas++;
    this.lista.length = 0;
    const p = this.partida;
    const yo = this.yo();
    const numeroPropio = p.yo();
    const grafo = noche.grafo;
    const rumbo = this.rumbo();
    const objetivo = rumbo === null ? null : this.objetivo;

    /* 1. El «Aquí» propio. */
    if (objetivo !== null && objetivo.tipo === 'nudo') {
      const n = grafo.nudos[objetivo.nudo];
      if (n !== undefined) {
        const metros = yo === null || rumbo === null ? -1 : metrosDelRumbo(noche, rumbo, yo.x, yo.z);
        const color = numeroPropio === null ? null : (COLORES_DE_ASIENTO[(numeroPropio - 1) % COLORES_DE_ASIENTO.length] ?? null);
        this.poner('aviso', n.x, n.z, color, metros, numeroPropio ?? 0, true);
      }
    }

    /* 2. La cabina que suena (la zona de acción de la sala, mientras suena). */
    const zona = p.sala.zona;
    if (zona !== null && ahora < zona.hastaMs) {
      const deLaZona: ObjetivoDelRumbo = { tipo: 'zona', zona: zona.id };
      const cabina = noche.ciudad.zonas.find((z) => z.id === zona.id);
      const que = cabina === undefined ? null : noche.ciudad.cabinas.find((c) => c.zona === zona.id);
      const x = que?.poste.x ?? (cabina === undefined ? Number.NaN : (cabina.caja.x0 + cabina.caja.x1) / 2);
      const z = que?.poste.z ?? (cabina === undefined ? Number.NaN : (cabina.caja.z0 + cabina.caja.z1) / 2);
      if (Number.isFinite(x) && Number.isFinite(z)) this.poner('cabina', x, z, null, this.metrosHasta(noche, deLaZona, yo), zona.id, mismoObjetivo(objetivo, deLaZona));
    }

    /* 3. Los compañeros (y los caídos a tiro de «Rescate»), con sus metros por calles desde mí. */
    const desdeMi = yo === null ? null : this.campoDesdeMi(grafo, yo.x, yo.z);
    const cuerpos = p.cuerpos();
    for (const c of cuerpos) {
      if (c.id >= PRIMER_NUMERO_DE_ENTIDAD || c.id === numeroPropio) continue;
      const metros = desdeMi === null ? -1 : metrosPorCalles(grafo, desdeMi, c.x, c.z);
      const caido = p.sentidoDe(c.id, ahora) === 'caido' && metros >= 0 && metros <= METROS_DEL_RESCATE;
      this.poner(caido ? 'caido' : 'companero', c.x, c.z, c.color, metros, c.id, false);
    }

    /* 4. Al Vigía, los enemigos cerca de algún compañero con cuerpo. */
    if (this.vigia()) {
      const lejos2 = METROS_DE_LA_VIGIA * METROS_DE_LA_VIGIA;
      for (const e of cuerpos) {
        if (e.id < PRIMER_NUMERO_DE_ENTIDAD) continue;
        let cerca = false;
        for (const c of cuerpos) {
          if (c.id >= PRIMER_NUMERO_DE_ENTIDAD || c.id === numeroPropio) continue;
          if ((c.x - e.x) * (c.x - e.x) + (c.z - e.z) * (c.z - e.z) <= lejos2) {
            cerca = true;
            break;
          }
        }
        if (cerca) this.poner('enemigo', e.x, e.z, null, -1, e.id, false);
      }
    }

    /* 5. Los refugios, si queda sitio: donde se reaparece. Sin metros, salvo el del rumbo. */
    for (const r of noche.ciudad.refugios) {
      const s = r.sitios[0];
      if (s === undefined) continue;
      const deEste: ObjetivoDelRumbo = { tipo: 'zona', zona: r.zona };
      const esElDelRumbo = mismoObjetivo(objetivo, deEste);
      const metros = esElDelRumbo && rumbo !== null && yo !== null ? metrosDelRumbo(noche, rumbo, yo.x, yo.z) : -1;
      this.poner('refugio', s.x, s.z, null, metros, r.zona, esElDelRumbo);
    }
  }
}
