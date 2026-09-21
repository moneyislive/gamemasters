/**
 * LAS LINDES, TRADUCIDAS PARA LA ESCENA: de la vista que manda la mesa a lo que el
 * tablero en tres dimensiones pinta, y de lo que se toca al movimiento que hay que
 * mandar.
 *
 * ═══ QUÉ ES ESTO Y QUÉ NO ═══
 *
 * La escena (`escenas/lindes/`) no sabe que existe Las Lindes: levanta un tablero
 * de losas cuadradas y devuelve toques. Todo lo que hay que saber del juego para
 * decirle qué levantar lo dice alguien, y ese alguien NO puede ser la pantalla de
 * cada cliente: habría dos traducciones —la de la app y la del escritorio— que un
 * día dirían cosas distintas. Aquí vive la traducción, UNA vez, sin `three` y sin
 * React, para que un comprobador de Node la pueda ejercitar con partidas de verdad.
 *
 * NO HAY NINGUNA REGLA AQUÍ. Dónde cabe la losa lo dice la vista, que lo trae ya
 * resuelto de `dondeCabe`; qué se puede tocar lo dice la lista de opciones que el
 * propio juego acaba de componer para ese observador. Este fichero sólo cambia de
 * forma lo que ya está decidido en otro sitio.
 *
 * ═══ POR QUÉ SÓLO SE IMPORTAN TIPOS DE `escenas/` ═══
 *
 * `shared/` lo compilan cuatro paquetes y dos de ellos no tienen `three`. Un
 * `import type` se borra al compilar, así que las formas de salida son las de la
 * escena de verdad sin arrastrar su código. Es lo mismo que hace
 * `riberas-en-tres.ts`, y por lo mismo.
 */
import type {
  HuecoDelTablero,
  LabriegoEnElTablero,
  LosaEnElTablero,
  TableroDeLasLindesEn3D,
} from '../../../escenas/lindes/tipos';
import type { AccionDeTablero, MovimientoDeclarado } from '../../mecanicas/tablero-declarado';
import { canonico } from '../../mecanicas/canonico';
import { LOSAS_EN_TOTAL, losaPorId } from './lindes-losas';
import type { ClaseDeCosa, Giro } from './lindes-losas';
import { PLANTAR, PASAR, PONER, puntoDeLaCosa } from './lindes';
import type { DondePlantar, VistaSinTablero } from './lindes';
import type { Opcion } from '../opciones';

/** La vista, si lo que llega tiene forma de vista de Las Lindes. */
function comoVista(vista: unknown): VistaSinTablero | null {
  if (typeof vista !== 'object' || vista === null) return null;
  const v = vista as Partial<VistaSinTablero>;
  if (typeof v.momento !== 'string') return null;
  if (!Array.isArray(v.losas) || !Array.isArray(v.plantados)) return null;
  if (!Array.isArray(v.colocaciones) || !Array.isArray(v.sitios)) return null;
  if (typeof v.claseEnMano !== 'string') return null;
  return v as VistaSinTablero;
}

/**
 * EL TABLERO QUE LEVANTA LA ESCENA, sacado de la vista.
 *
 * Devuelve `null` si lo que llega no es una vista de este juego, y NO un tablero
 * vacío: un tablero vacío se pinta como un valle sin nada y se lee como «todavía
 * no ha empezado», que es mentira cuando lo que pasa es que la vista es de otro
 * juego. Quien llama cae al tablero plano, que es lo correcto. Es la misma
 * decisión que tomó `riberas-en-tres.ts` y por el mismo motivo.
 */
export function tableroEnTres(vista: unknown): TableroDeLasLindesEn3D | null {
  const v = comoVista(vista);
  if (v === null) return null;

  const losas: LosaEnElTablero[] = v.losas.map((l) => ({
    casilla: l.casilla,
    x: l.x,
    y: l.y,
    losa: l.losa,
    giro: l.giro,
    ficha: l.ficha,
    ultima: l.casilla === v.ultima,
  }));

  const labriegos: LabriegoEnElTablero[] = [];
  for (const p of v.plantados) {
    const puesta = v.losas.find((l) => l.casilla === p.casilla);
    if (puesta === undefined) continue;
    const losa = losaPorId(puesta.losa);
    if (losa === null) continue;
    const donde = puntoDeLaCosa(losa, puesta.giro, p.clase, p.indice);
    labriegos.push({
      casilla: p.casilla,
      /*
       * De la convención del dibujo a la del mundo. En el tablero plano la `y`
       * crece al NORTE y el origen está en la esquina; en la escena la `z` crece
       * al SUR y el origen está en el CENTRO de la losa. Las dos cuentas van aquí
       * y en un solo sitio: si se hicieran en cada cliente, el día que uno se
       * dejara el signo los labriegos saldrían espejados en un móvil y nadie
       * sabría por qué.
       */
      enX: donde.x - 0.5,
      enZ: 0.5 - donde.y,
      color: p.color,
      asiento: p.asiento,
      clase: p.clase,
    });
  }

  const huecos: HuecoDelTablero[] = v.colocaciones.map((c) => ({ x: c.x, y: c.y, giro: c.giro }));

  return {
    losas,
    labriegos,
    huecos,
    enMano: v.claseEnMano,
    cobradas: [],
    /*
     * La bolsa, con su denominador. `LOSAS_EN_TOTAL` cuenta el reparto entero y la de
     * salida ya está puesta en la mesa desde el primer movimiento, así que lo que llegó a
     * caber en la bolsa es una menos. Se calcula aquí —una vez, en `shared/`— y no en cada
     * cliente: es la clase de cuenta que sale bien en uno y mal en el otro.
     */
    quedan: v.quedan,
    deLaBolsa: LOSAS_EN_TOTAL - 1,
  };
}

/**
 * EL MOVIMIENTO DE PONER UNA LOSA EN UNA CASILLA CON UN GIRO.
 *
 * Se monta aquí y no en la escena porque la carga es del JUEGO: la escena manda
 * «han tocado la casilla tal con el giro cual» y quien sabe qué significa eso es
 * este fichero. Lo que sale tiene que coincidir, campo a campo, con lo que
 * `opcionesDeLasLindes` ofrece — y eso no se promete: lo comprueba
 * `verify:lindes-en-tres` contra partidas de verdad.
 */
export function movimientoDePoner(x: number, y: number, giro: Giro): MovimientoDeclarado {
  return { tipo: PONER, carga: { x, y, giro } };
}

/** El movimiento de plantar un labriego en una cosa de la losa recién puesta. */
export function movimientoDePlantar(clase: ClaseDeCosa, indice: number): MovimientoDeclarado {
  return { tipo: PLANTAR, carga: { clase, indice } };
}

/** El de no plantar y pasar. */
export function movimientoDePasar(): MovimientoDeclarado {
  return { tipo: PASAR, carga: null };
}

/**
 * LAS ACCIONES QUE NO ESTÁN YA EN LA TIRA DE SITIOS.
 *
 * ═══ POR QUÉ HACE FALTA, Y POR QUÉ LA RESPUESTA ESTÁ AQUÍ ═══
 *
 * Las dos pantallas de Las Lindes pintan DOS tiras: la de SITIOS —cada cosa de la losa
 * recién puesta donde cabe un labriego, con lo que valdría y si cierra— y la de ACCIONES,
 * que es «lo que no se toca en el tablero»: empezar, no plantar.
 *
 * Y salían DUPLICADAS. `acciones` trae todo lo que no sea `PONER`, o sea también los
 * plantados, así que cada sitio aparecía dos veces: una con su valor y otra sin él. Visto
 * en la app con seis chips donde había tres cosas.
 *
 * El tablero declarado tiene que seguir trayéndolos: un cliente que no tenga el pintor de
 * Las Lindes SÓLO tiene el tablero declarado, y sin los plantados en `acciones` no podría
 * plantar. O sea que quien filtra es quien pinta las dos tiras. Pero CUÁL filtrar es una
 * regla —hay que saber qué movimiento hay detrás de cada sitio—, y los clientes de esta
 * casa no saben reglas: preguntan.
 *
 * Se comparan por FORMA CANÓNICA y no por identidad: lo que llega al cliente son dos
 * objetos distintos construidos por dos caminos, y comparar referencias no encontraría
 * nada. La forma canónica ordena las llaves, así que `{tipo, carga}` casa aunque los
 * campos vengan al revés.
 */
export function accionesFueraDeLosSitios(
  tablero: { readonly acciones: readonly AccionDeTablero[] } | null,
  sitios: readonly { readonly movimiento: MovimientoDeclarado }[],
): AccionDeTablero[] {
  if (tablero === null) return [];
  const yaEstan = new Set(sitios.map((s) => canonico(s.movimiento)));
  return tablero.acciones.filter((a) => !yaEstan.has(canonico({ tipo: a.toque.tipo, carga: a.toque.carga ?? null })));
}

/**
 * LA ACCIÓN DE PASAR, SACADA DEL TABLERO DECLARADO — o `null` si ahora no se puede.
 *
 * ═══ POR QUÉ NO LA BUSCA CADA CLIENTE ═══
 *
 * Porque buscarla es saber una regla: hay que saber que el movimiento de pasar se llama
 * `PASAR`, y eso es exactamente lo que los clientes de esta casa NO saben —el §18 dice que
 * el escritorio elige por tabla y no por el nombre de un juego, y lo mismo vale aquí—. Los
 * dos clientes preguntan; el que contesta es `shared/`.
 *
 * Hace falta porque el reloj de arena de la escena es también el botón de pasar, igual que
 * en Riberas: tiene que saber si está encendido y qué mandar si lo tocan, y lo que manda
 * tiene que ser EL MISMO movimiento que manda el botón de la tira. Dos caminos al mismo
 * gesto que mandaran cosas distintas serían dos gestos, y uno de los dos acabaría roto.
 */
export function laAccionDePasar(
  tablero: { readonly acciones: readonly AccionDeTablero[] } | null,
): AccionDeTablero | null {
  if (tablero === null) return null;
  for (const a of tablero.acciones) {
    if (a.toque.tipo === PASAR && a.disponible) return a;
  }
  return null;
}

/**
 * LOS GIROS CON LOS QUE CABE LA LOSA EN UNA CASILLA, en orden.
 *
 * Lo usa el botón de girar: se pulsa y pasa al siguiente que cabe, en vez de
 * pasar al siguiente a secas y quedarse en uno con el que no cabe. Un botón que a
 * veces no hace nada se lee como un botón roto.
 */
export function girosQueCaben(tablero: TableroDeLasLindesEn3D, x: number, y: number): Giro[] {
  const salida: Giro[] = [];
  for (const h of tablero.huecos) {
    if (h.x === x && h.y === y && salida.indexOf(h.giro) < 0) salida.push(h.giro);
  }
  return salida.sort((a, b) => a - b);
}

/**
 * EL SIGUIENTE GIRO DE LA LISTA, dando la vuelta.
 *
 * Con la lista vacía devuelve el que había: girar cuando no hay dónde poner no es
 * un error, es que todavía no se ha señalado ninguna casilla.
 */
export function elSiguienteGiro(giros: readonly Giro[], ahora: Giro): Giro {
  if (giros.length === 0) return ahora;
  const donde = giros.indexOf(ahora);
  return giros[(donde + 1) % giros.length] as Giro;
}

/** Lo que se puede plantar ahora mismo, con su rótulo ya escrito. */
export interface SitioQueSeOfrece {
  readonly clase: ClaseDeCosa;
  readonly indice: number;
  readonly rotulo: string;
  readonly ayuda: string;
  readonly movimiento: MovimientoDeclarado;
  readonly cerrada: boolean;
  readonly valdria: number;
}

/**
 * LOS SITIOS DONDE PLANTAR, sacados de las OPCIONES y no de la vista.
 *
 * ═══ POR QUÉ DE LAS OPCIONES, SI LA VISTA YA TRAE `sitios` ═══
 *
 * Porque `vista.sitios` dice dónde CABE un labriego —es un dato del tablero, y por
 * eso es público y lo ve todo el mundo— y las opciones dicen qué puede hacer ESTE
 * asiento AHORA. Las dos listas coinciden cuando te toca a ti y no coinciden en
 * ningún otro momento: mirando la vista, a un espectador se le pintarían botones.
 *
 * Es el mismo razonamiento por el que el tablero declarado sólo pone `toque` en
 * las caras cuyo movimiento está en la lista de opciones de quien mira.
 */
export function sitiosQueSeOfrecen(
  vista: unknown,
  opciones: readonly Opcion[],
): readonly SitioQueSeOfrece[] {
  const v = comoVista(vista);
  if (v === null) return [];
  const salida: SitioQueSeOfrece[] = [];
  for (const o of opciones) {
    if (o.tipo !== PLANTAR) continue;
    const carga = o.carga as { clase?: unknown; indice?: unknown } | null;
    if (carga === null || typeof carga !== 'object') continue;
    const clase = carga.clase;
    const indice = carga.indice;
    if (typeof clase !== 'string' || typeof indice !== 'number') continue;
    const sitio = v.sitios.find(
      (s: DondePlantar) => s.clase === clase && s.indice === indice,
    );
    salida.push({
      clase: clase as ClaseDeCosa,
      indice,
      rotulo: o.rotulo,
      ayuda: o.ayuda,
      movimiento: { tipo: o.tipo, carga: o.carga },
      cerrada: sitio?.cerrada ?? false,
      valdria: sitio?.valdria ?? 0,
    });
  }
  return salida;
}

/**
 * ¿SE PUEDE VER ESTA PARTIDA EN TRES DIMENSIONES?
 *
 * Hoy siempre que la vista sea de este juego: los labriegos son pieza propia y se
 * tiñen con cualquier color, así que no hay el límite de cuatro que Riberas
 * todavía tiene escrito. Existe igualmente porque el cliente necesita UNA pregunta
 * que hacer antes de montar la escena, y el día que haya un motivo para decir que
 * no —un tablero más grande de lo que cabe, un modelo que no llegó— la respuesta
 * cambia aquí y no en dos pantallas.
 */
export function seVeEnTres(vista: unknown): boolean {
  return comoVista(vista) !== null;
}
