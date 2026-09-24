/**
 * EL LUGAR DE LA NOCHE: el barrio de hoy o la ciudad abierta de 540 m (`docs/quiebro/CIUDAD-ABIERTA.md`),
 * derivado de la vista de la mesa y del código igual que lo deriva la sala por el productor. Es lo único
 * que el cliente sabe de «dónde se juega» fuera de la Liza: la cámara choca con sus cajas, el sonido oye
 * su tren y su lluvia, la Bajada lee su rótulo, los personajes pintan su gente, el minimapa y el plano
 * pintan su ciudad. Puro, sin React ni three: se prueba en Node (`verify:quiebro-juego`).
 *
 * ═══ LA CIUDAD SI LA SALA JUEGA EN LA CIUDAD, Y NO ANTES ═══
 *
 * La vista trae `traza` (la ciudad de la mesa, 0-31) y `noche.fallos` (la plaza de la Bajada primero). Con
 * eso y el código sale la noche de la ciudad (`ciudadDeLaNoche`), la misma que usa el productor. Pero lo
 * que PARA al jugador no es esto: es el mundo de la liza que sale del productor (`lizaDeLaMesa`), con el
 * que el aparato predice cada paso. Si se pintara la ciudad mientras la sala sigue en el barrio —una vista
 * con traza y un productor que aún no la usa, a mitad de una obra—, el jugador chocaría con paredes que no
 * ve y atravesaría las que ve. Así que la ciudad se usa SÓLO si su mundo es el de la liza: el mismo objeto
 * (`mundoDeLaLizaDeLaCiudad` guarda uno por noche, así que el productor y el cliente lo comparten en el
 * mismo proceso) o, si no, las mismas cajas en el mismo orden. De paso, eso dice si la noche va con las
 * «Plazas despejadas» (la Memoria del Sistema) sin tener que adivinar el nombre de la contramedida. Si no
 * cuadra ninguna, el barrio de siempre, y `aviso` dice por qué (el HUD de desarrollo lo enseña).
 *
 * Sin liza (la reunión, el final) no hay nada que chocar: con traza se pinta la ciudad, sin más.
 */
import { NOMBRES_DEL_QUIEBRO, nombreDePlaza } from '../../../../shared/arcade/juegos/quiebro-nombres';
import type { VistaDelQuiebro } from '../../../../shared/arcade/juegos/quiebro-vista';
import type { Barrio, CajaDelBarrio } from '../../../../shared/arcade/juegos/quiebro-barrio';
import { NOMBRES_DE_GLORIETA, barrioDeLaNoche, despejarLaPlaza, trenEn } from '../../../../shared/arcade/juegos/quiebro-barrio';
import type { CajaDeLaCiudad, IdDeDistrito, NocheDeLaCiudad, PlazaDeLaCiudad } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import { MS_POR_TIC } from '../../../../shared/mecanicas/liza/declaracion';
import {
  LA_GLORIETA_DEL_RELOJERO,
  METROS_DEL_TREN_POR_TIC,
  ciudadDeLaMesa,
  ciudadDeLaNoche,
  despejarLasPlazas,
  mundoDeLaLizaDeLaCiudad,
  queZonaEs,
  trenEnLaCiudad,
} from '../../../../shared/arcade/juegos/quiebro-ciudad';
import type { LizaDeclarada, MundoDeLaLiza } from '../../../../shared/mecanicas/liza/declaracion';
import type { GenteDeLaNoche } from '../personajes/multitud';
import { genteDeLaCiudad, genteDelBarrio } from '../personajes/multitud';

/** EL LUGAR DE UNA NOCHE: el barrio de hoy, o una noche de la ciudad (ya despejada si lo está). */
export type LugarDeLaNoche =
  | { readonly tipo: 'barrio'; readonly barrio: Barrio }
  | {
      readonly tipo: 'ciudad';
      readonly noche: NocheDeLaCiudad;
      readonly traza: number;
      /** Las plazas de la noche tal como vienen en la vista (la de la Bajada primero). */
      readonly fallos: readonly number[];
      readonly despejadas: boolean;
    };

/** Lo que sale de mirar la vista: el lugar, y por qué no es la ciudad si la vista la pedía. */
export interface LugarLeido {
  readonly lugar: LugarDeLaNoche | null;
  /** `null` si todo cuadra; si no, qué pasó (para la consola de desarrollo y el comprobador). */
  readonly aviso: string | null;
}

const SIN_FALLOS: readonly number[] = Object.freeze([]);

/** La contramedida que quita cajas de las plazas, se llame como se llame (la de la vista de hoy o la de la ciudad). */
function pideDespejar(vista: VistaDelQuiebro): boolean {
  const c: string = vista.reglamento.contramedida;
  return c === 'plaza-despejada' || c === 'plazas-despejadas';
}

/** ¿Es este mundo el de esta noche de la ciudad? El mismo objeto, o las mismas cajas en el mismo orden. */
function esElMundoDe(mundo: MundoDeLaLiza, noche: NocheDeLaCiudad, despejadas: boolean): boolean {
  let propio: MundoDeLaLiza;
  try {
    propio = mundoDeLaLizaDeLaCiudad(noche, despejadas);
  } catch {
    return false;
  }
  if (propio === mundo) return true;
  const a = mundo.suelo.cuerpos;
  const b = propio.suelo.cuerpos;
  /* El productor pone lo suyo encima (sitios de nacer, la clase de la cabina que suena) sin tocar el suelo. */
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    const q = b[i];
    if (p === undefined || q === undefined || p.x0 !== q.x0 || p.z0 !== q.z0 || p.x1 !== q.x1 || p.z1 !== q.z1) return false;
  }
  return true;
}

/**
 * EL LUGAR DE LA NOCHE DE ESTA MESA (ver la cabecera). `liza` es la que salió de la misma vista con el
 * productor (`lizaDeLaMesa`), o `null` si no la hay. Sin noche en la vista, sin lugar.
 */
export function lugarDeLaMesa(vista: VistaDelQuiebro | null, codigo: string, liza: LizaDeclarada | null): LugarLeido {
  const numero = vista?.noche?.numero ?? null;
  if (vista === null || numero === null) return { lugar: null, aviso: null };
  const traza = vista.traza;
  const barrio = (): LugarDeLaNoche => {
    const b = barrioDeLaNoche(codigo, numero);
    return { tipo: 'barrio', barrio: pideDespejar(vista) ? despejarLaPlaza(b) : b };
  };
  if (traza === null) return { lugar: barrio(), aviso: null };
  const fallos = vista.noche?.fallos ?? SIN_FALLOS;
  let noche: NocheDeLaCiudad;
  try {
    noche = ciudadDeLaNoche(ciudadDeLaMesa(traza, codigo), codigo, numero, fallos);
  } catch (e) {
    return { lugar: barrio(), aviso: `la ciudad de la traza ${String(traza)} no se deriva: ${e instanceof Error ? e.message : String(e)}` };
  }
  const ciudad = (despejadas: boolean): LugarDeLaNoche => ({ tipo: 'ciudad', noche: despejadas ? despejarLasPlazas(noche) : noche, traza, fallos, despejadas });
  if (liza === null) return { lugar: ciudad(pideDespejar(vista)), aviso: null };
  const pide = pideDespejar(vista);
  /* Primero lo que dice la vista; luego lo otro (una contramedida con otro nombre). */
  for (const despejadas of [pide, !pide]) if (esElMundoDe(liza.mundo, noche, despejadas)) return { lugar: ciudad(despejadas), aviso: null };
  return { lugar: barrio(), aviso: `la vista trae la traza ${String(traza)}, pero el mundo de la liza no es el de su ciudad (${String(liza.mundo.suelo.cuerpos.length)} cajas): se juega en el barrio` };
}

/* ═══════════════════════════════ LO QUE CADA PIEZA LE PREGUNTA ═══════════════════════════════ */

/** Una caja de la estructura como la leen la cámara y el sonido: metros, su tipo y su alto. */
export type CajaDelLugar = CajaDelBarrio | CajaDeLaCiudad;

/** Las cajas del lugar, en el orden del mundo de la liza (el índice de un `empuja` es el suyo más uno). */
export function cajasDelLugar(lugar: LugarDeLaNoche | null): readonly CajaDelLugar[] {
  if (lugar === null) return [];
  return lugar.tipo === 'barrio' ? lugar.barrio.cajas : lugar.noche.cajas;
}

/** La gente de la noche: los 48 del barrio o los de la ciudad (ver `personajes/multitud.ts`). */
export function genteDelLugar(lugar: LugarDeLaNoche | null): GenteDeLaNoche | null {
  if (lugar === null) return null;
  return lugar.tipo === 'barrio' ? genteDelBarrio(lugar.barrio) : genteDeLaCiudad(lugar.noche);
}

/** El tiempo de la noche (llovizna, aguacero o niebla): el sonido de la lluvia. */
export function tiempoDelLugar(lugar: LugarDeLaNoche): 'llovizna' | 'aguacero' | 'niebla' {
  return lugar.tipo === 'barrio' ? lugar.barrio.adorno.tiempo : lugar.noche.tiempo;
}

/** El tren (el elevado del barrio o el del Elevado de la ciudad): por dónde pasa, para el sonido. */
export interface TrenDelLugar {
  readonly eje: 'x' | 'z';
  readonly linea: number;
  readonly desde: number;
  readonly hasta: number;
  readonly alto: number;
  readonly sentido: 1 | -1;
}

export function trenDelLugar(lugar: LugarDeLaNoche): TrenDelLugar {
  return lugar.tipo === 'barrio' ? lugar.barrio.tren : lugar.noche.tren;
}

/**
 * A cuántos m/s pasa el tren, para que su sonido cruce lo que tarda: el del Elevado de la ciudad va a
 * `METROS_DEL_TREN_POR_TIC` por tic (16 m/s, 34 s de canto a canto); el del barrio, con los 14 de siempre.
 */
export function velocidadDelTren(lugar: LugarDeLaNoche): number {
  return lugar.tipo === 'barrio' ? 14 : METROS_DEL_TREN_POR_TIC * (1000 / MS_POR_TIC);
}

/** Dónde va el tren en un tic, o `null` si no pasa: el mismo en todos los aparatos. */
export function trenEnElLugar(lugar: LugarDeLaNoche, tic: number): { readonly cabeza: number; readonly cola: number } | null {
  return lugar.tipo === 'barrio' ? trenEn(lugar.barrio, tic) : trenEnLaCiudad(lugar.noche, tic);
}

/** La plaza de la Bajada de la noche en la ciudad (la primera de sus plazas, o la Glorieta del Relojero). */
export function plazaDeLaBajada(lugar: LugarDeLaNoche): PlazaDeLaCiudad | null {
  if (lugar.tipo === 'barrio') return null;
  const numero = lugar.fallos[0] ?? LA_GLORIETA_DEL_RELOJERO;
  return lugar.noche.ciudad.plazas.find((p) => p.numero === numero) ?? null;
}

/** El centro de donde empieza la noche: el de la plaza de la Bajada (la glorieta, en el barrio: el origen). */
export function centroDeLaBajada(lugar: LugarDeLaNoche | null): { readonly x: number; readonly z: number } {
  if (lugar === null || lugar.tipo === 'barrio') return { x: 0, z: 0 };
  return plazaDeLaBajada(lugar)?.centro ?? { x: 0, z: 0 };
}

/**
 * EL POSTE DE UNA CABINA (o el sitio de un refugio) por la zona de la Liza que nombra el cable, en metros;
 * `null` si el lugar no la tiene. En el barrio, la cabina cuyo poste cae a menos de 6 m del centro de la
 * zona; en la ciudad, por la numeración de zonas de `quiebro-ciudad.ts`, sin buscar.
 */
export function posteDeLaZona(lugar: LugarDeLaNoche | null, zona: number, cx: number, cz: number): { readonly x: number; readonly z: number } | null {
  if (lugar === null) return null;
  if (lugar.tipo === 'barrio') {
    let mejor: { x: number; z: number } | null = null;
    let lejos = Number.POSITIVE_INFINITY;
    for (const c of [...lugar.barrio.cabinas, lugar.barrio.refugio]) {
      const d = Math.hypot(c.poste.x - cx, c.poste.z - cz);
      if (d < lejos) {
        lejos = d;
        mejor = { x: c.poste.x, z: c.poste.z };
      }
    }
    return mejor !== null && lejos < 6 ? mejor : null;
  }
  const que = queZonaEs(zona);
  if (que === null) return null;
  const ciudad = lugar.noche.ciudad;
  if (que.que === 'cabina') return ciudad.cabinas[que.k]?.poste ?? null;
  if (que.que === 'refugio') return ciudad.refugios[que.k]?.sitios[0] ?? null;
  return null;
}

/** Una semilla de 32 bits para el adorno (el cielo): la del barrio, o una de (código, noche) en la ciudad. */
export function semillaDelLugar(lugar: LugarDeLaNoche | null): number {
  if (lugar === null) return 1;
  if (lugar.tipo === 'barrio') return lugar.barrio.semilla;
  /* FNV-1a de «CÓDIGO#noche»: adorno, no juego, así que no tiene por qué ser el chorro de `shared/`. */
  const texto = `${lugar.noche.ciudad.codigo}#${String(lugar.noche.noche)}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h === 0 ? 1 : h;
}

/*
 * LOS NOMBRES DE LA CIUDAD, de `quiebro-nombres.ts` (§2.7 de CIUDAD-ABIERTA: «Plaza · Distrito · 3:12»): la
 * lista de plazas por el índice `nombre` de cada una (`nombreDePlaza`) y los distritos por su id
 * (`NOMBRES_DEL_QUIEBRO.ciudad.distritos`), LEÍDOS CON SU TIPO. Hasta el 24-sep se leían con un molde a
 * una forma supuesta (`.plazas` y `.distritos` en la raíz) de antes de que el frente de reglas los
 * escribiera; cuando los escribió en `.ciudad`, el molde siguió compilando, la búsqueda falló siempre y el
 * rótulo de la Bajada puso en cada plaza el nombre de una glorieta del barrio, sin distrito («Glorieta de la
 * Estrella» en el Patio de Carga de las Naves). Con el tipo, mover las listas de sitio no compila. El
 * respaldo sólo queda para un índice fuera de la lista: la Glorieta del Relojero por su nombre de siempre
 * y las demás con uno de glorieta del barrio.
 */

/** El nombre de una plaza de la ciudad. */
export function nombreDeLaPlaza(plaza: PlazaDeLaCiudad): string {
  const propio = nombreDePlaza(plaza.nombre);
  if (propio.length > 0) return propio;
  const glorieta = NOMBRES_DEL_QUIEBRO.lugares.glorieta;
  if (plaza.numero === LA_GLORIETA_DEL_RELOJERO) return `${glorieta} ${NOMBRES_DE_GLORIETA[0] ?? ''}`.trim();
  return `${glorieta} ${NOMBRES_DE_GLORIETA[(plaza.nombre + 1) % NOMBRES_DE_GLORIETA.length] ?? ''}`.trim();
}

/** El nombre de un distrito, o `null` si `quiebro-nombres.ts` no lo tiene. */
export function nombreDelDistrito(distrito: IdDeDistrito): string | null {
  const distritos: Readonly<Record<IdDeDistrito, string>> = NOMBRES_DEL_QUIEBRO.ciudad.distritos;
  const n = distritos[distrito];
  return typeof n === 'string' && n.length > 0 ? n : null;
}

/** EL RÓTULO DE LA BAJADA: «Glorieta del Relojero, 3:12» en el barrio; «Plaza · Distrito · 3:12» en la ciudad. */
export function rotuloDelLugar(lugar: LugarDeLaNoche | null): string | null {
  if (lugar === null) return null;
  if (lugar.tipo === 'barrio') return lugar.barrio.adorno.rotulo;
  const plaza = plazaDeLaBajada(lugar);
  const h = lugar.noche.hora;
  const hora = `${String(h.h)}:${h.m < 10 ? '0' : ''}${String(h.m)}`;
  if (plaza === null) return hora;
  const distrito = nombreDelDistrito(plaza.distrito);
  return distrito === null ? `${nombreDeLaPlaza(plaza)}, ${hora}` : `${nombreDeLaPlaza(plaza)} · ${distrito} · ${hora}`;
}
