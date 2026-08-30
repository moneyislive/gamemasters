/**
 * Lo que la app de El Nudo de Valdehierro lee de `VistaJugador.estadoDelJuego`.
 *
 * ═══ POR QUÉ ESTE FICHERO EXISTE ═══
 *
 * `estadoDelJuego` está declarado `unknown` en el contrato, y tiene que estarlo:
 * el motor transporta el estado de un juego que no conoce, y si el tipo fuese
 * concreto el contrato general volvería a saber de qué se juega. Pero `unknown`
 * no se puede pintar. Alguien tiene que decir qué forma tiene, y ese alguien es
 * el juego por sus dos extremos: el servidor al proyectarlo
 * (`server/src/juegos/nudo-proyeccion.ts`) y la app al leerlo.
 *
 * ═══ POR QUÉ SE LEE A LA DEFENSIVA Y NO CON UN `as` ═══
 *
 * Porque un móvil puede tener una versión más vieja que el servidor, y un campo
 * que aún no existe tiene que dar una pantalla incompleta y no una pantalla
 * rota. En El Misterio de la Momia esto no fue una precaución teórica: las dos
 * mitades se escribieron en paralelo y no encajaron a la primera; con un `as`
 * habría sido un «undefined is not an object» en el móvil de doce personas en
 * mitad de una cena.
 *
 * ═══ LO QUE NUNCA PUEDE LLEGAR ═══
 *
 * El CUADRO VERDADERO no aparece por ningún campo, ni siquiera en el desenlace:
 * ahí lo enseña la plataforma, en `vista.desenlace.respuestas`, que es el camino
 * que ya existe y está probado. Los TELEGRAMAS AJENOS tampoco: `yo.telegramas`
 * son solo los tuyos. Y la SOLUCIÓN de un instrumento no viaja: llega el
 * planteamiento y nada más — la corrección la hace el servidor.
 */
import type { InstrumentoId, OficioId } from '../../../shared/juegos';

/** Un convoy tal y como lo ve quien juega. Todo esto es público. */
export interface ConvoyVisible {
  id: string;
  nombre: string;
  carga?: string;
}

/** Un puesto de la estación, con lo que se sabe de él esta franja. */
export interface PuestoVisible {
  id: string;
  nombre: string;
  oficio?: OficioId;
  oficioNombre?: string;
  /** ¿Alguien ha resuelto ya su instrumento esta franja? */
  rendido: boolean;
}

/** Una orden cursada, aceptada o rechazada. Es la crónica pública de la noche. */
export interface OrdenVisible {
  franja: number;
  convoy: string;
  nombre: string;
  aceptada: boolean;
}

/** Una tira de telegrama. SOLO llegan las tuyas. */
export interface TelegramaVisible {
  id: string;
  texto: string;
}

/** El instrumento que tienes delante, sin su solución. */
export interface InstrumentoVisible {
  puesto: string;
  franja: number;
  cual: InstrumentoId;
  nombre: string;
  planteamiento: unknown;
  cuantosLoHanResuelto: number;
  loHeResuelto: boolean;
}

/** Lo tuyo, que nadie más ve. */
export interface MiEstadoNudo {
  oficio: OficioId;
  oficioNombre: string;
  instrumentoNombre: string;
  mana: { nombre: string; texto: string };
  manaUsada: boolean;
  /** Los efectos de la maña armados y pendientes de gastar. */
  indulto: boolean;
  consultaGratis: boolean;
  sinConformidad: boolean;
  margen: number;
  consultas: number;
  instrumentosResueltos: number;
  telegramas: TelegramaVisible[];
  puesto?: string;
  puestoNombre?: string;
}

/** El parte del amanecer, cuando quien dirige lo ha dado. */
export interface AmanecerVisible {
  cruzaron: number;
  correoPaso: boolean;
  retrasoFinal: number;
  puertoCerrado: boolean;
  ganadores: string[];
  anuncio: string;
}

export interface EstadoNudoVisible {
  franja: number;
  franjas: number;
  hora: string;
  retraso: number;
  retrasoMaximo: number;
  conformidades: number;
  despachados: number;
  salidos: ConvoyVisible[];
  correo?: ConvoyVisible;
  porSalir: ConvoyVisible[];
  ordenes: OrdenVisible[];
  franjasPerdidas: number[];
  yo: MiEstadoNudo;
  instrumento?: InstrumentoVisible;
  puestos: PuestoVisible[];
  tarifa: { consulta: number; recuperar: number };
  amanecer?: AmanecerVisible;
}

// ---------------------------------------------------------------------------
// La lectura, a la defensiva
// ---------------------------------------------------------------------------

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown, porDefecto = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : porDefecto;
}

function cadena(v: unknown, porDefecto = ''): string {
  return typeof v === 'string' ? v : porDefecto;
}

function bool(v: unknown): boolean {
  return v === true;
}

function lista(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function convoy(v: unknown): ConvoyVisible | undefined {
  if (!esObjeto(v)) return undefined;
  const id = cadena(v.id);
  if (!id) return undefined;
  const carga = cadena(v.carga);
  return { id, nombre: cadena(v.nombre, id), ...(carga ? { carga } : {}) };
}

/**
 * Lee el estado, o devuelve `undefined` si esto no es una partida de este juego.
 *
 * ═══ LA GUARDA ES `franjas` Y NO CUALQUIER COSA ═══
 *
 * `leerEstadoMomia` solo exige que el estado sea un objeto con un `yo` dentro, y
 * eso resultó ser demasiado laxo: El Paso de las Sombras manda exactamente esa
 * forma, así que el lector de la Momia se creía su estado y pintaba un don donde
 * había un disfraz. Aquí se exige una clave que NINGÚN otro juego tiene —el
 * número de franjas de la noche— además del `yo`. Cuesta lo mismo y no se puede
 * confundir.
 */
export function leerEstadoNudo(crudo: unknown): EstadoNudoVisible | undefined {
  if (!esObjeto(crudo)) return undefined;
  if (typeof crudo.franjas !== 'number') return undefined;
  if (!esObjeto(crudo.yo)) return undefined;

  const yoCrudo = crudo.yo;
  const manaCrudo = esObjeto(yoCrudo.mana) ? yoCrudo.mana : {};

  const yo: MiEstadoNudo = {
    oficio: (cadena(yoCrudo.oficio, 'agujas') as OficioId),
    oficioNombre: cadena(yoCrudo.oficioNombre, 'ferroviario'),
    instrumentoNombre: cadena(yoCrudo.instrumentoNombre, 'Puesto'),
    mana: {
      nombre: cadena(manaCrudo.nombre, 'Tu maña'),
      texto: cadena(manaCrudo.texto),
    },
    manaUsada: bool(yoCrudo.manaUsada),
    indulto: bool(yoCrudo.indulto),
    consultaGratis: bool(yoCrudo.consultaGratis),
    sinConformidad: bool(yoCrudo.sinConformidad),
    margen: num(yoCrudo.margen),
    consultas: num(yoCrudo.consultas),
    instrumentosResueltos: num(yoCrudo.instrumentosResueltos),
    telegramas: lista(yoCrudo.telegramas)
      .map((t) => (esObjeto(t) ? { id: cadena(t.id), texto: cadena(t.texto) } : undefined))
      .filter((t): t is TelegramaVisible => t !== undefined && t.texto !== ''),
    ...(cadena(yoCrudo.puesto) ? { puesto: cadena(yoCrudo.puesto) } : {}),
    ...(cadena(yoCrudo.puestoNombre) ? { puestoNombre: cadena(yoCrudo.puestoNombre) } : {}),
  };

  const instrumentoCrudo = crudo.instrumento;
  const instrumento: InstrumentoVisible | undefined = esObjeto(instrumentoCrudo)
    ? {
        puesto: cadena(instrumentoCrudo.puesto),
        franja: num(instrumentoCrudo.franja, 1),
        cual: cadena(instrumentoCrudo.cual, 'agujas') as InstrumentoId,
        nombre: cadena(instrumentoCrudo.nombre, 'Instrumento'),
        planteamiento: instrumentoCrudo.planteamiento,
        cuantosLoHanResuelto: num(instrumentoCrudo.cuantosLoHanResuelto),
        loHeResuelto: bool(instrumentoCrudo.loHeResuelto),
      }
    : undefined;

  const amanecerCrudo = crudo.amanecer;
  const amanecer: AmanecerVisible | undefined = esObjeto(amanecerCrudo)
    ? {
        cruzaron: num(amanecerCrudo.cruzaron),
        correoPaso: bool(amanecerCrudo.correoPaso),
        retrasoFinal: num(amanecerCrudo.retrasoFinal),
        puertoCerrado: bool(amanecerCrudo.puertoCerrado),
        ganadores: lista(amanecerCrudo.ganadores).map((g) => cadena(g)).filter(Boolean),
        anuncio: cadena(amanecerCrudo.anuncio),
      }
    : undefined;

  const tarifaCrudo = esObjeto(crudo.tarifa) ? crudo.tarifa : {};

  return {
    franja: num(crudo.franja),
    franjas: num(crudo.franjas, 6),
    hora: cadena(crudo.hora),
    retraso: num(crudo.retraso),
    retrasoMaximo: num(crudo.retrasoMaximo, 10),
    conformidades: num(crudo.conformidades),
    despachados: num(crudo.despachados),
    salidos: lista(crudo.salidos).map(convoy).filter((c): c is ConvoyVisible => c !== undefined),
    correo: convoy(crudo.correo),
    porSalir: lista(crudo.porSalir).map(convoy).filter((c): c is ConvoyVisible => c !== undefined),
    ordenes: lista(crudo.ordenes)
      .map((o) =>
        esObjeto(o)
          ? {
              franja: num(o.franja),
              convoy: cadena(o.convoy),
              nombre: cadena(o.nombre),
              aceptada: bool(o.aceptada),
            }
          : undefined,
      )
      .filter((o): o is OrdenVisible => o !== undefined),
    franjasPerdidas: lista(crudo.franjasPerdidas).map((f) => num(f)).filter((f) => f > 0),
    yo,
    ...(instrumento ? { instrumento } : {}),
    puestos: lista(crudo.puestos)
      .map((p) =>
        esObjeto(p)
          ? {
              id: cadena(p.id),
              nombre: cadena(p.nombre),
              ...(cadena(p.oficio) ? { oficio: cadena(p.oficio) as OficioId } : {}),
              ...(cadena(p.oficioNombre) ? { oficioNombre: cadena(p.oficioNombre) } : {}),
              rendido: bool(p.rendido),
            }
          : undefined,
      )
      .filter((p): p is PuestoVisible => p !== undefined && p.id !== ''),
    tarifa: { consulta: num(tarifaCrudo.consulta, 2), recuperar: num(tarifaCrudo.recuperar, 3) },
    ...(amanecer ? { amanecer } : {}),
  };
}

// ---------------------------------------------------------------------------
// Cómo se codifica lo que se entrega
// ---------------------------------------------------------------------------

/**
 * La respuesta de un instrumento viaja como UNA CADENA por `eligeLibre`.
 *
 * ═══ POR QUÉ UNA CADENA Y NO UN OBJETO ═══
 *
 * Porque `eligeLibre` es lo único del motor que admite un valor que no es una
 * entidad de ninguna categoría, y admite cadenas. Un objeto habría exigido una
 * forma nueva en el contrato del motor —y con ella, que el motor supiera algo de
 * lo que transporta.
 *
 * El formato lo fija ESTE fichero y lo lee `nudo-instrumentos.ts`. Son cuatro
 * gramáticas de una línea cada una, y están las dos mitades escritas a la vez
 * para que no puedan separarse:
 *
 *   · maniobra:      `a1,p,s1,a2,...`  (a=apartar, s=sacar, p=pasar; 1 y 2 son las vías)
 *   · parte:         la palabra tal cual
 *   · enclavamiento: `1,3,7`  (las palancas que quedan bajadas)
 *   · cargue:        `b1:v2,b2:v1`  (bulto:vagón)
 */
export function codificarManiobra(
  movimientos: Array<{ hacer: 'apartar' | 'sacar' | 'pasar'; via?: 1 | 2 }>,
): string {
  return movimientos
    .map((m) => (m.hacer === 'pasar' ? 'p' : `${m.hacer === 'apartar' ? 'a' : 's'}${m.via ?? 1}`))
    .join(',');
}

export function codificarPalancas(bajadas: number[]): string {
  return [...bajadas].sort((a, b) => a - b).join(',');
}

export function codificarCargue(reparto: Record<string, string>): string {
  return Object.entries(reparto)
    .filter(([, vagon]) => Boolean(vagon))
    .map(([bulto, vagon]) => `${bulto}:${vagon}`)
    .join(',');
}
