/**
 * EL DICCIONARIO DE LA LIZA: qué significa, para el cliente de El Quiebro, cada número que declara la
 * sala —qué acción es el GOLPE, qué estado es el Remanso, qué clase es un Celador—.
 *
 * ═══ POR QUÉ SE LEE DE LA DECLARACIÓN Y NO DE UNA TABLA DE IDS ═══
 *
 * La Liza nombra acciones, estados, clases y avisos con enteros de 1 a 255 (`IdDeclarado`) y no sabe
 * qué es cada uno: «Los NOMBRES que ve la gente no están aquí: son del juego» (`declaracion.ts`). El
 * productor del juego (`quiebro-liza.ts`, de otro frente) los elige. Si este cliente llevara su propia
 * tabla «el 3 es el Cierre», la primera vez que el productor renumerara, el botón GOLPE mandaría un
 * Empellón y nada daría error. Así que el cliente lee la ESTRUCTURA de lo declarado, que es contrato:
 *
 *   · el QUIEBRO es la esquiva del asiento (`reglas.esquiva.accion`), y su estado el de su puesta;
 *   · el REMANSO es lo que la esquiva limpia pone a quien quiebra (`esquiva.alAcertar.puesta`), y el
 *     DESCOLOCADO lo que le pone al autor que falló (`alAcertar.alAutor`) o a quien falla un golpe;
 *   · la TANDA es la cadena: la Entrada abre (`cadena: null`, con enganche, sin romper guardia), cada
 *     eslabón dice tras cuál va (`cadena.tras`), y el Cierre es el que no tiene nada detrás;
 *   · el EMPELLÓN es el que abre y rompe la guardia; la RÉPLICA, la que sólo se puede en un estado
 *     (`soloEn`, el Remanso) y no se esquiva (`imparable`);
 *   · un CELADOR tiene guardia, un TIRADOR tiene proyectil, un PRESTADO no tiene ni lo uno ni lo otro;
 *   · el derribo es el estado que deja el golpe que cierra la Tanda de un asiento (el Cierre) y la
 *     Réplica; el tocado, el que dejan los demás.
 *
 * Lo único que la estructura no distingue son las dos clases de aviso que apuntan a una entidad
 * («marcar» y «¡Desalójalo!»): se toman en el orden del diseño (§15: marcar, Rescate, Voy,
 * Desalójalo), y el informe del frente pide al productor que lo mantenga o que lo diga con nombre.
 *
 * Puro, sin three ni DOM: lo prueba `verify:quiebro-juego` con una liza de juguete y, si el productor
 * de verdad ya está en el registro, con la suya.
 */
import type {
  AccionDeclarada,
  ClaseDeEntidad,
  EstadoDeclarado,
  IdDeclarado,
  LizaDeclarada,
  ProyectilDeclarado,
  ReglasDeAsiento,
  CajaDeLaLiza,
  ZonaDelMundo,
} from '../../../../shared/mecanicas/liza/declaracion';
import { arenaDeLaLiza, reglasDelNumero } from '../../../../shared/mecanicas/liza/declaracion';
import type { Arena } from '../../../../shared/mecanicas/mundo';
import type { ClaseDeCuerpo, Gesto } from '../cuerpos';

/** Lo que un estado significa para quien lo pinta y para los mandos. */
export type SentidoDelEstado =
  | 'libre'
  | 'quiebro'
  | 'remanso'
  | 'ruptura'
  | 'tocado'
  | 'derribado'
  | 'descolocado'
  | 'caido'
  | 'reaparecido'
  | 'rescatando'
  | 'rematando'
  | 'descolgando'
  | 'desalojable'
  | 'absorbiendo'
  | 'sin-cuerpo'
  | 'ausente'
  | 'otro';

/** Qué hace cada botón en este momento, por id del cable (0 = ese botón no tiene acción). */
export interface BotonesDeLaLiza {
  /** La Entrada: abre la Tanda. */
  readonly entrada: IdDeclarado;
  /** La Réplica: el golpe del Remanso. */
  readonly replica: IdDeclarado;
  readonly empellon: IdDeclarado;
  readonly quiebro: IdDeclarado;
  readonly rescate: IdDeclarado;
}

/** Cómo se lee el aviso: por clase de lo que se pide. 0 = la liza no declara ese aviso. */
export interface AvisosDeLaLiza {
  readonly marcar: IdDeclarado;
  readonly rescate: IdDeclarado;
  readonly voy: IdDeclarado;
  readonly desalojalo: IdDeclarado;
}

/** Qué es el aviso de clase `id`, para rotularlo. */
export type SentidoDelAviso = 'marcar' | 'rescate' | 'voy' | 'desalojalo' | 'otro';

/** La amenaza de un anuncio, como la pinta el anillo (ver `efectos/cuentas.ts`). */
export type AmenazaDelAnuncio = 'prestado' | 'celador' | 'respuesta' | 'tirador';

/** LA LECTURA DE UNA LIZA para un asiento. Se rehace cuando cambia la declaración. */
export interface LecturaDeLaLiza {
  readonly liza: LizaDeclarada;
  readonly arena: Arena;
  /** Mi número en el cable (1-15), o 0 si no estoy en la liza. */
  readonly yo: number;
  readonly reglas: ReglasDeAsiento | null;
  readonly botones: BotonesDeLaLiza;
  readonly avisos: AvisosDeLaLiza;
  /** El eslabón de la Tanda que va tras cada acción de mi asiento (0 = no hay). */
  siguienteEnLaTanda(accion: IdDeclarado): IdDeclarado;
  /** Una acción de quien sea (asiento o clase), por id. */
  accion(id: IdDeclarado): AccionDeclarada | null;
  /** La clase de entidad que declara la acción `id`, o `null` si es de un asiento. */
  claseDeLaAccion(id: IdDeclarado): ClaseDeEntidad | null;
  clase(id: IdDeclarado): ClaseDeEntidad | null;
  proyectil(id: IdDeclarado): ProyectilDeclarado | null;
  estado(id: IdDeclarado): EstadoDeclarado | null;
  sentidoDelEstado(id: IdDeclarado): SentidoDelEstado;
  /** Cómo se pinta una clase de entidad. */
  cuerpoDeLaClase(id: IdDeclarado): ClaseDeCuerpo;
  /** El gesto de quien lanza la acción `id`. */
  gestoDeLaAccion(id: IdDeclarado): Gesto;
  /** El gesto de quien está en el estado `id` (sin acción en curso). */
  gestoDelEstado(id: IdDeclarado): Gesto | null;
  /** La amenaza que pinta el anillo de un anuncio de la acción `id`. */
  amenazaDeLaAccion(id: IdDeclarado): AmenazaDelAnuncio;
  sentidoDelAviso(id: IdDeclarado): SentidoDelAviso;
  limite(id: IdDeclarado): CajaDeLaLiza | null;
  zona(id: IdDeclarado): ZonaDelMundo | null;
  /** La acción de remate de la clase `id`, o 0 si no se remata. */
  remateDeLaClase(id: IdDeclarado): IdDeclarado;
}

/** Un mapa de id a cosa con `id`, en el orden de la lista (el primero gana si se repite). */
function porId<T extends { readonly id: number }>(lista: readonly T[]): Map<number, T> {
  const m = new Map<number, T>();
  for (const x of lista) if (!m.has(x.id)) m.set(x.id, x);
  return m;
}

/**
 * LEE UNA LIZA para el asiento de número `yo` (0 si no hay asiento propio: se lee igual, sin
 * botones). No lanza: una declaración rara da una lectura con ceros donde no entiende.
 */
export function leerLaLiza(liza: LizaDeclarada, yo: number): LecturaDeLaLiza {
  const reglas = reglasDelNumero(liza, yo);
  const estados = porId(liza.estados);
  const clases = porId(liza.clases);
  const proyectiles = porId(liza.proyectiles);

  /* ─── Las acciones: las de todos los asientos y las de las clases ─── */
  const acciones = new Map<number, AccionDeclarada>();
  const deClase = new Map<number, ClaseDeEntidad>();
  for (const r of liza.asientos) for (const a of r.acciones) if (!acciones.has(a.id)) acciones.set(a.id, a);
  for (const c of liza.clases) {
    for (const a of c.acciones) {
      if (!acciones.has(a.id)) acciones.set(a.id, a);
      if (!deClase.has(a.id)) deClase.set(a.id, c);
    }
  }

  /* ─── La Tanda: quién va tras quién, y en qué eslabón ─── */
  /* `tras`: el eslabón que sigue a cada acción MÍA (el GOLPE encadena con esto). */
  const tras = new Map<number, number>();
  if (reglas !== null) {
    for (const a of reglas.acciones) {
      if (a.cadena === null) continue;
      for (const previa of a.cadena.tras) if (!tras.has(previa)) tras.set(previa, a.id);
    }
  }
  /* `tieneDetras`: las acciones de QUIEN SEA tras las que va otra (la que no tiene nada detrás, cierra). */
  const tieneDetras = new Set<number>();
  for (const a of acciones.values()) if (a.cadena !== null) for (const previa of a.cadena.tras) tieneDetras.add(previa);
  /** El eslabón (0 abre) de cada acción encadenada, siguiendo `tras` hacia atrás. */
  const eslabon = new Map<number, number>();
  const eslabonDe = (id: number, vistos: number): number => {
    const hecho = eslabon.get(id);
    if (hecho !== undefined) return hecho;
    const a = acciones.get(id);
    if (a === undefined || a.cadena === null || a.cadena.tras.length === 0 || vistos > 8) {
      eslabon.set(id, 0);
      return 0;
    }
    const e = 1 + eslabonDe(a.cadena.tras[0] as number, vistos + 1);
    eslabon.set(id, e);
    return e;
  };

  /* ─── Los botones de mi asiento ─── */
  let entrada = 0;
  let replica = 0;
  let empellon = 0;
  if (reglas !== null) {
    for (const a of reglas.acciones) {
      if (a.soloEn.length > 0 && replica === 0) replica = a.id;
      else if (a.cadena === null && a.efecto.rompeGuardia && empellon === 0) empellon = a.id;
      else if (a.cadena === null && !a.efecto.rompeGuardia && a.soloEn.length === 0 && entrada === 0) entrada = a.id;
    }
  }
  const botones: BotonesDeLaLiza = {
    entrada,
    replica,
    empellon,
    quiebro: reglas?.esquiva.accion ?? 0,
    rescate: reglas?.rescate.accion ?? 0,
  };

  /* ─── Los estados, con su sentido ─── */
  const sentido = new Map<number, SentidoDelEstado>();
  const poner = (id: number, s: SentidoDelEstado): void => {
    if (id > 0 && !sentido.has(id)) sentido.set(id, s);
  };
  poner(liza.sinCuerpo.estado, 'sin-cuerpo');
  poner(liza.presencia.estadoAusente, 'ausente');
  poner(liza.equipo.caida.estado, 'caido');
  poner(liza.equipo.reaparicion.puesta.estado, 'reaparecido');
  for (const r of liza.asientos) {
    poner(r.esquiva.puesta.estado, 'quiebro');
    poner(r.esquiva.alAcertar.puesta.estado, 'remanso');
    poner(r.esquiva.alAcertar.alAutor.estado, 'descolocado');
    poner(r.esquiva.ruptura.puesta.estado, 'ruptura');
    poner(r.rescate.puesta.estado, 'rescatando');
  }
  for (const c of liza.clases) {
    if (c.alCaer.tipo === 'rematable') {
      poner(c.alCaer.puesta.estado, 'desalojable');
      poner(c.alCaer.remate.puesta.estado, 'rematando');
      poner(c.alCaer.siNo.absorbiendo.estado, 'absorbiendo');
    }
    if (c.guardia !== null) poner(c.guardia.alParar.estado, 'descolocado');
  }
  const encuentro = liza.fase.encuentro;
  if (encuentro !== null && encuentro.fin.tipo === 'salida') poner(encuentro.fin.zona.puesta.estado, 'descolgando');
  for (const a of acciones.values()) if (a.alFallar !== null) poner(a.alFallar.estado, 'descolocado');
  /*
   * El derribo lo deja lo que cierra LA TANDA DE UN ASIENTO (el eslabón sin nada detrás) y la Réplica (lo
   * que sólo se puede en un estado). Sólo los golpes de asiento: la Tanda de dos del tirador también
   * «cierra» su cadena y deja un tocado, y leída así convertía el tocado en derribo.
   */
  for (const r of liza.asientos) {
    for (const a of r.acciones) {
      const p = a.efecto.puesta;
      if (p === null) continue;
      const cierra = (a.cadena !== null && !tieneDetras.has(a.id)) || a.soloEn.length > 0;
      if (cierra) poner(p.estado, 'derribado');
    }
  }
  for (const a of acciones.values()) if (a.efecto.puesta !== null) poner(a.efecto.puesta.estado, 'tocado');
  for (const p of liza.proyectiles) if (p.efecto.puesta !== null) poner(p.efecto.puesta.estado, 'tocado');

  /* ─── Las clases de entidad, con su cuerpo ─── */
  const cuerpoDeLaClase = (id: number): ClaseDeCuerpo => {
    const c = clases.get(id);
    if (c === undefined) return 'prestado';
    if (c.proyectil !== 0) return 'tirador';
    if (c.guardia !== null) return 'celador';
    return 'prestado';
  };
  const respuestas = new Set<number>();
  for (const c of liza.clases) if (c.guardia !== null && c.guardia.respuesta !== 0) respuestas.add(c.guardia.respuesta);

  /* ─── Los avisos ─── */
  let marcar = 0;
  let rescateAviso = 0;
  let voy = 0;
  let desalojalo = 0;
  for (const c of liza.avisos.clases) {
    if (c.objetivo === 'entidad') {
      if (marcar === 0) marcar = c.id;
      else if (desalojalo === 0) desalojalo = c.id;
    } else if (c.objetivo === 'asiento') {
      if (rescateAviso === 0) rescateAviso = c.id;
    } else if (voy === 0) voy = c.id;
  }
  const avisos: AvisosDeLaLiza = { marcar, rescate: rescateAviso, voy, desalojalo };

  const limites = porId(liza.mundo.limites);
  const zonas = porId(liza.mundo.zonas);

  const gestoDeLaAccion = (id: number): Gesto => {
    const a = acciones.get(id);
    if (a === undefined) return 'entrada';
    const clase = deClase.get(id) ?? null;
    if (respuestas.has(id)) return 'respuesta';
    if (clase !== null && cuerpoDeLaClase(clase.id) === 'prestado') return 'golpe-de-prestado';
    if (a.soloEn.length > 0) return 'replica';
    if (a.cadena === null && a.efecto.rompeGuardia) return 'empellon';
    if (a.cadena === null) return 'entrada';
    const e = eslabonDe(id, 0);
    if (!tieneDetras.has(id)) return 'cierre';
    return e <= 1 ? 'seguida-1' : 'seguida-2';
  };

  const GESTO_DEL_SENTIDO: Readonly<Record<SentidoDelEstado, Gesto | null>> = {
    libre: null,
    quiebro: 'quiebro',
    remanso: null,
    ruptura: 'quiebro',
    tocado: 'tocado',
    derribado: 'derribado',
    descolocado: 'descolocado',
    caido: 'desconectado',
    reaparecido: null,
    rescatando: 'rescatar',
    rematando: 'rematar',
    descolgando: 'descolgar',
    desalojable: 'desalojable',
    absorbiendo: 'absorber',
    'sin-cuerpo': null,
    ausente: null,
    otro: null,
  };

  return {
    liza,
    arena: arenaDeLaLiza(liza),
    yo: reglas === null ? 0 : yo,
    reglas,
    botones,
    avisos,
    siguienteEnLaTanda: (accion) => tras.get(accion) ?? 0,
    accion: (id) => acciones.get(id) ?? null,
    claseDeLaAccion: (id) => deClase.get(id) ?? null,
    clase: (id) => clases.get(id) ?? null,
    proyectil: (id) => proyectiles.get(id) ?? null,
    estado: (id) => estados.get(id) ?? null,
    sentidoDelEstado: (id) => (id === 0 ? 'libre' : (sentido.get(id) ?? 'otro')),
    cuerpoDeLaClase,
    gestoDeLaAccion,
    gestoDelEstado: (id) => GESTO_DEL_SENTIDO[id === 0 ? 'libre' : (sentido.get(id) ?? 'otro')],
    amenazaDeLaAccion: (id) => {
      if (respuestas.has(id)) return 'respuesta';
      const c = deClase.get(id);
      if (c === undefined) return 'celador';
      const cuerpo = cuerpoDeLaClase(c.id);
      return cuerpo === 'desvelado' ? 'celador' : cuerpo;
    },
    sentidoDelAviso: (id) =>
      id === 0 ? 'otro' : id === marcar ? 'marcar' : id === rescateAviso ? 'rescate' : id === voy ? 'voy' : id === desalojalo ? 'desalojalo' : 'otro',
    limite: (id) => limites.get(id)?.caja ?? null,
    zona: (id) => zonas.get(id) ?? null,
    remateDeLaClase: (id) => {
      const c = clases.get(id);
      return c !== undefined && c.alCaer.tipo === 'rematable' ? c.alCaer.remate.accion : 0;
    },
  };
}
