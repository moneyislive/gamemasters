/**
 * EL PARCHEADOR DEL QUIEBRO: la ÚNICA capa que toca los sombreadores de three por dentro.
 *
 * ═══ POR QUÉ UNA SOLA CAPA Y NO UN `onBeforeCompile` POR MATERIAL ═══
 *
 * La ciudad parchea `MeshStandardMaterial` para sacar de él las fachadas, el asfalto mojado y la
 * pintura de los coches (así heredan las luces, las sombras y el mapeo tonal de three sin rehacer
 * la GGX a mano); la atmósfera tiene que meter la niebla de altura en TODOS los materiales de la
 * escena, también en los de los personajes y los efectos que escriben otros frentes; y el día que
 * alguien meta un instanciador de fuera, ése parcheará también. `onBeforeCompile` es UNA función
 * por material: el segundo que la asigna borra al primero, sin error, y lo que se pierde es la
 * niebla de un material (se ve como un muñeco recortado contra la bruma) o el agua de un charco.
 *
 * Por eso aquí nadie asigna `onBeforeCompile`: se PIDE `parchear(material, retoque…)`. La primera
 * vez se guarda el `onBeforeCompile` que el material ya tuviera (el de otro frente, o el vacío de
 * three) y se envuelve: primero corre el ajeno, después los retoques en su orden. Un retoque es
 * DATOS —qué trozo buscar, dónde poner el texto, qué uniformes añade—, no una función que pueda
 * pisar a otra.
 *
 * ═══ LA LLAVE DE CACHÉ, QUE ES DONDE ESTO SE ROMPE SIN AVISAR ═══
 *
 * three reutiliza un programa compilado cuando dos materiales dan la misma llave, y la llave por
 * defecto es el TEXTO de `onBeforeCompile`. Envuelto, todos los materiales tendrían el mismo texto
 * —el del envoltorio— y dos fachadas de niveles distintos compartirían programa: la de N0 pintaría
 * interiores o la de N2 dejaría de pintarlos, según cuál se compilara antes. La llave de aquí es la
 * del parcheo ajeno MÁS los nombres de los retoques en orden, y cada retoque lleva en el nombre todo
 * lo que cambie su texto (el nivel, por ejemplo: `fachada-n2`).
 *
 * ═══ UN TROZO QUE NO SE ENCUENTRA NO SE CALLA ═══
 *
 * Si three cambia el nombre de un `#include` en una versión futura, `String.replace` no encuentra
 * nada y devuelve el texto igual: el material compila, se pinta, y la niebla o el charco no están.
 * Eso se apunta en `FALLOS_DEL_PARCHEO` —y en la consola una vez—, y el banco lo enseña en rojo.
 */
import * as THREE from 'three';

/** Dónde va el texto respecto del trozo buscado. */
export type ComoSeSustituye = 'antes' | 'despues' | 'en-lugar';

/** Una sustitución literal sobre el texto de un sombreador. */
export interface Sustitucion {
  /** El trozo que se busca, LITERAL (p. ej. `#include <fog_fragment>`). */
  readonly buscar: string;
  readonly como: ComoSeSustituye;
  readonly texto: string;
}

/** Un retoque: datos, nunca una función. Ver la cabecera. */
export interface Retoque {
  /** Único, y con todo lo que cambie el texto dentro (entra en la llave de caché). */
  readonly nombre: string;
  /**
   * Los retoques se aplican de menor a mayor. La niebla va la última (100) porque SUSTITUYE los
   * trozos `fog_*`: un retoque que quiera poner algo «antes de la niebla» tiene que encontrarlos.
   */
  readonly orden?: number;
  /** Uniformes que se añaden. Se pasan POR REFERENCIA: cambiar su `value` llega a todos. */
  readonly uniformes?: Readonly<Record<string, THREE.IUniform>>;
  /** Líneas `#define` que se anteponen a los dos sombreadores. */
  readonly defines?: Readonly<Record<string, string>>;
  readonly vertice?: readonly Sustitucion[];
  readonly fragmento?: readonly Sustitucion[];
}

/** Lo que se busca en el material. Guardado en `userData` para no pelear con propiedades de three. */
interface EstadoDelParcheo {
  readonly retoques: Retoque[];
}

type ParametrosDelSombreador = Parameters<THREE.Material['onBeforeCompile']>[0];

/** Los trozos que no se encontraron, uno por línea. Ver la cabecera. */
export const FALLOS_DEL_PARCHEO: string[] = [];

const LLAVE = 'parcheoDelQuiebro';

function estadoDe(material: THREE.Material): EstadoDelParcheo | undefined {
  const guardado: unknown = material.userData[LLAVE];
  return guardado !== undefined ? (guardado as EstadoDelParcheo) : undefined;
}

/** ¿Lleva ya este material el retoque de ese nombre? */
export function llevaElRetoque(material: THREE.Material, nombre: string): boolean {
  return estadoDe(material)?.retoques.some((r) => r.nombre === nombre) ?? false;
}

function apuntarFallo(material: THREE.Material, retoque: string, buscar: string): void {
  const linea = `${material.type} · ${retoque} · no está «${buscar}»`;
  if (FALLOS_DEL_PARCHEO.includes(linea)) return;
  FALLOS_DEL_PARCHEO.push(linea);
  console.warn(`[quiebro] parcheo: ${linea}`);
}

/** Aplica una lista de sustituciones a un texto. Devuelve el texto nuevo. */
export function sustituir(
  texto: string,
  sustituciones: readonly Sustitucion[],
  alFallar: (buscar: string) => void,
): string {
  let salida = texto;
  for (const s of sustituciones) {
    const donde = salida.indexOf(s.buscar);
    if (donde < 0) {
      alFallar(s.buscar);
      continue;
    }
    const nuevo =
      s.como === 'antes' ? `${s.texto}\n${s.buscar}` : s.como === 'despues' ? `${s.buscar}\n${s.texto}` : s.texto;
    /* Todas las apariciones: un `#include` puede estar dos veces (p. ej. en ramas de `#ifdef`). */
    salida = salida.split(s.buscar).join(nuevo);
  }
  return salida;
}

function porOrden(a: Retoque, b: Retoque): number {
  return (a.orden ?? 0) - (b.orden ?? 0);
}

function aplicar(material: THREE.Material, sombreador: ParametrosDelSombreador, retoques: readonly Retoque[]): void {
  const enOrden = [...retoques].sort(porOrden);
  for (const r of enOrden) {
    if (r.uniformes !== undefined) {
      for (const [nombre, uniforme] of Object.entries(r.uniformes)) sombreador.uniforms[nombre] = uniforme;
    }
    const defines =
      r.defines === undefined
        ? ''
        : Object.entries(r.defines)
            .map(([k, v]) => `#define ${k} ${v}`)
            .join('\n');
    const fallo = (buscar: string): void => apuntarFallo(material, r.nombre, buscar);
    if (r.vertice !== undefined) sombreador.vertexShader = sustituir(sombreador.vertexShader, r.vertice, fallo);
    if (r.fragmento !== undefined) sombreador.fragmentShader = sustituir(sombreador.fragmentShader, r.fragmento, fallo);
    if (defines !== '') {
      sombreador.vertexShader = `${defines}\n${sombreador.vertexShader}`;
      sombreador.fragmentShader = `${defines}\n${sombreador.fragmentShader}`;
    }
  }
}

/**
 * PIDE los retoques para un material. Idempotente por nombre: pedir dos veces el mismo no lo pone
 * dos veces. Marca el material para recompilar sólo si ha entrado algo nuevo.
 */
export function parchear(material: THREE.Material, ...retoques: readonly Retoque[]): void {
  let estado = estadoDe(material);
  if (estado === undefined) {
    const nuevo: EstadoDelParcheo = { retoques: [] };
    estado = nuevo;
    material.userData[LLAVE] = nuevo;
    const ajeno = material.onBeforeCompile;
    /*
     * La llave del parcheo ajeno: si el material traía la de fábrica (el texto de su
     * `onBeforeCompile`), hay que calcularla con el `onBeforeCompile` AJENO, no con el envoltorio.
     */
    const llaveAjena =
      material.customProgramCacheKey === THREE.Material.prototype.customProgramCacheKey
        ? (): string => ajeno.toString()
        : material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (sombreador, renderer): void => {
      ajeno.call(material, sombreador, renderer);
      aplicar(material, sombreador, nuevo.retoques);
    };
    material.customProgramCacheKey = (): string =>
      `${llaveAjena()}|quiebro:${[...nuevo.retoques].sort(porOrden).map((r) => r.nombre).join(',')}`;
  }
  let hayNuevos = false;
  for (const r of retoques) {
    if (estado.retoques.some((x) => x.nombre === r.nombre)) continue;
    estado.retoques.push(r);
    hayNuevos = true;
  }
  if (hayNuevos) material.needsUpdate = true;
}

/**
 * Quita un retoque por nombre (p. ej. al cambiar de nivel, el `fachada-n1` por el `fachada-n2`).
 * Devuelve si estaba.
 */
export function quitarElRetoque(material: THREE.Material, nombre: string): boolean {
  const estado = estadoDe(material);
  if (estado === undefined) return false;
  const i = estado.retoques.findIndex((r) => r.nombre === nombre);
  if (i < 0) return false;
  estado.retoques.splice(i, 1);
  material.needsUpdate = true;
  return true;
}

/** Los materiales de un objeto, sean uno o una lista. */
export function materialesDe(objeto: THREE.Object3D): THREE.Material[] {
  const conMaterial = objeto as THREE.Object3D & { material?: THREE.Material | THREE.Material[] };
  const m = conMaterial.material;
  if (m === undefined) return [];
  return Array.isArray(m) ? m : [m];
}
