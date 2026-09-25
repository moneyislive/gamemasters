/**
 * LAS CAPAS DE LA CIUDAD ABIERTA: las mallas que no son de la ventana de celdas, ni el suelo, ni el borde (§3.5 del
 * plan del detalle). Cada una vive en `capas/<nombre>.ts`, con su dueño, y `abierta.ts` las monta todas de esta
 * lista fija (`CAPAS_DE_LA_CIUDAD`) sin saber qué llevan: quien escribe una capa no toca `abierta.ts`.
 *
 * ═══ LO QUE CUMPLE TODA CAPA ═══
 *
 *   · Se monta siempre que el nivel la lleve (si no la lleva, su fábrica devuelve `null`), con
 *     `frustumCulled = false`. Una malla instanciada lleva al menos una instancia: three no pinta ni cuenta un
 *     `InstancedMesh` con 0, y las llamadas cambiarían con la cámara (`verify:quiebro-ciudad` exige que no).
 *   · Tiene su renglón en el libro (`presupuesto.ts`): `nombre` es el renglón, o el primero si tiene varios.
 *   · Sus materiales pasan por `suyo` del contexto: se precompilan y se guardan con los de la ciudad.
 *   · Sus texturas las sube el relevo antes de enseñar la ciudad (`texturas`, ver `relevo.ts`).
 *   · Declara si estorba al paso (`estorbo`): por encima de 1,9 m, fuera de la ciudad, pegada al muro, o una
 *     función que mete sus triángulos en la franja de andar para que el comprobador los cruce con las cajas.
 *   · `actualizar` va en cada fotograma, con el MISMO `tic` que el tren (`abierta.ts`), y no asigna memoria.
 *
 * Hoy (ola 1) sólo `lejana` lleva algo: el horizonte y la ciudad lejana de siempre. Las demás son el sitio donde
 * irán, y devuelven `null`.
 */
import type * as THREE from 'three';
import type { DetalleDelNivel, NivelDeLaCiudad } from './tipos';
import type { RenglonDeLaCiudad } from './presupuesto';
import type { BaseDeLaCiudad } from './abierta';
import type { CeldaConstruida, Familia } from './celdas';
import type { SitioDeLaVentana, VentanaDeCeldas } from './ventana';
import type { UNIFORMES_DE_LA_VENTANA } from './ventana';
import type { UNIFORMES_DE_LA_CIUDAD } from './retoques';
import { capaLejana } from './capas/lejana';
import { capaDelSueloLejano } from './capas/suelo-lejano';
import { capaDeLasLucesLejanas } from './capas/luces-lejanas';
import { capaDeLosRematesLejanos } from './capas/remates-lejanos';
import { capaDeLosTubos } from './capas/tubos';
import { capaDeLaLuzPintada } from './capas/luz-pintada';
import { capaDelHorizonteLocal } from './capas/horizonte-local';
import { capaDeLosSemaforos } from './capas/semaforos';
import { capaDeLasSombrasCercanas } from './capas/sombras-cercanas';
import { capaDeLosCochesCercanos } from './capas/coches-cercanos';

/** Un triángulo en el mundo (el de la franja de andar del comprobador). */
export interface Tri {
  readonly a: THREE.Vector3;
  readonly b: THREE.Vector3;
  readonly c: THREE.Vector3;
}

/** Cómo estorba una capa al paso (ver la cabecera). */
export type EstorboDeLaCapa = 'por-encima-de-1,9' | 'fuera-de-la-ciudad' | 'pegado-al-muro' | ((salida: Tri[]) => void);

/** La ventana que se acaba de enseñar: su sitio y sus celdas. */
export interface EstadoDeLaVentana {
  readonly sitio: SitioDeLaVentana;
  readonly celdas: readonly CeldaConstruida[];
}

/** UNA CAPA DE LA CIUDAD (ver la cabecera). */
export interface CapaDeLaCiudad {
  /** El renglón del libro (o el primero, si tiene varios). */
  readonly nombre: string;
  /** Lo que se cuelga en la escena: siempre montado, `frustumCulled = false`, al menos un triángulo. */
  readonly objeto: THREE.Object3D;
  /** Lo que pinta ahora, renglón a renglón (una llamada por malla). */
  renglones(): RenglonDeLaCiudad[];
  /** Con cada ventana nueva, en el mismo fotograma en que se enseña. */
  alCambiarLaVentana?(v: EstadoDeLaVentana): void;
  /** Por fotograma: la cámara, el tiempo del adorno y el tic (el del tren). Sin asignar memoria. */
  actualizar?(camara: THREE.Camera, tiempo: number, tic: number): void;
  /** Las texturas que el relevo sube antes de enseñar la ciudad. */
  texturas?(): readonly THREE.Texture[];
  readonly estorbo: EstorboDeLaCapa;
  /** Suelta sus geometrías y texturas (los materiales los guarda la ciudad, ver `suyo`). */
  soltar(): void;
}

/** Los materiales de la ciudad que una capa puede usar tal cual (los de la ventana, lo lejano y el suelo). */
export interface MaterialesDeLaCiudad extends Readonly<Record<Familia, THREE.Material>> {
  readonly lejos: THREE.Material;
  readonly asfalto: THREE.Material;
  readonly aceras: THREE.Material;
}

/** Lo que sabe una capa al construirse. */
export interface ContextoDeLaCapa {
  readonly nivel: NivelDeLaCiudad;
  readonly detalle: DetalleDelNivel;
  /** La base de la noche: partes, noche (`base.fuente.noche`), anillo, lo lejano, el suelo, la semilla. */
  readonly base: BaseDeLaCiudad;
  readonly materiales: MaterialesDeLaCiudad;
  /** Registra un material de la capa con los de la ciudad (se precompila y se guarda con ellos). */
  suyo<M extends THREE.Material>(m: M): M;
  readonly uniformes: { readonly ciudad: typeof UNIFORMES_DE_LA_CIUDAD; readonly ventana: typeof UNIFORMES_DE_LA_VENTANA };
  readonly ventana: VentanaDeCeldas;
}

/** La fábrica de una capa: `null` si el nivel no la lleva. */
export type FabricaDeCapa = (c: ContextoDeLaCapa) => CapaDeLaCiudad | null;

/**
 * LAS CAPAS, en el orden en que se montan (y se crean sus objetos: de él sale el de pintar lo que empata). La
 * lejana va la primera, donde el horizonte y la ciudad lejana iban antes de ser capa.
 */
export const CAPAS_DE_LA_CIUDAD: readonly { readonly nombre: string; readonly fabrica: FabricaDeCapa }[] = [
  { nombre: 'lejana', fabrica: capaLejana },
  { nombre: 'suelo-lejano', fabrica: capaDelSueloLejano },
  { nombre: 'luces-lejanas', fabrica: capaDeLasLucesLejanas },
  { nombre: 'remates-lejanos', fabrica: capaDeLosRematesLejanos },
  { nombre: 'tubos', fabrica: capaDeLosTubos },
  { nombre: 'luz-pintada', fabrica: capaDeLaLuzPintada },
  { nombre: 'horizonte-local', fabrica: capaDelHorizonteLocal },
  { nombre: 'semaforos', fabrica: capaDeLosSemaforos },
  { nombre: 'sombras-cercanas', fabrica: capaDeLasSombrasCercanas },
  { nombre: 'coches-cercanos', fabrica: capaDeLosCochesCercanos },
];
