/**
 * EL CLIP EN ESPEJO: el quiebro a la derecha a partir del de la izquierda, sin hornear otro.
 *
 * ═══ POR QUÉ NO BASTA CON CAMBIAR `_L` POR `_R` Y NEGAR DOS COMPONENTES ═══
 *
 * La receta de siempre —cambiar de lado el nombre del hueso y pasar el cuaternión (x, y, z, w) a
 * (x, −y, −z, w)— sólo vale si el hueso derecho es el reflejo exacto del izquierdo con su eje X
 * negado, que es como Blender simetriza. En la forja casi todos lo son, pero no todos: el informe lo
 * dice del pulgar («su X es el dorso de la mano: el giro que lo cruza sobre la palma es +X en el
 * izquierdo y −X en el derecho»), y el nodo de agarre tampoco. Con la receta de siempre el pulgar
 * derecho del quiebro en espejo saldría hacia fuera, el mismo «pulgar arriba» que la forja tardó una
 * vuelta en encontrar.
 *
 * Así que el espejo se DEDUCE del propio esqueleto en reposo. Con M la reflexión del eje X del
 * personaje (su izquierda es +X) y W la rotación de mundo de cada hueso en reposo, para cada hueso b y
 * su pareja m(b) (el mismo si es del centro) se calcula D_b = Wᵀ_b · M · W_m(b), que en un esqueleto
 * simétrico es diagonal con ±1. La pose reflejada de m(b) es entonces
 *
 *     Q'_m(b) = D_p · Q_b · D_b          (p el padre de b; rotación local, en matrices)
 *     t'_m(b) = D_p · t_b                 (traslación local)
 *
 * y sale para CUALQUIER convenio de ejes que haya dejado el exportador, pulgar incluido. Si un D no es
 * diagonal (un esqueleto que no es simétrico), se lanza: mejor no tener espejo que tener uno torcido.
 * El comprobador pone el clip y su espejo en el esqueleto y mira que cada hueso quede en el reflejo del
 * de su pareja, a menos de un milímetro.
 *
 * ═══ LOS FALDONES NO SON SIMÉTRICOS DEL TODO ═══
 *
 * Las cadenas de la gabardina salen de la simulación de tela de la forja, y en reposo los dos lados
 * difieren hasta 3° (lo vio el comprobador: la primera versión exigía menos de un grado a todos los
 * huesos y lanzaba en el primer quiebro a la derecha, que en el juego habría tumbado el fotograma). Los
 * huesos del cuerpo se siguen exigiendo casi exactos; a los de tela (`faldon*`) se les admiten
 * `DESVIO_DE_LA_TELA`, y su espejo queda aproximado en unos centímetros del bajo, que es tela al viento.
 * Lo que se desvía queda apuntado en `desvios`.
 */
import * as THREE from 'three';

/** La pareja de un hueso por nombre: `_L` ↔ `_R`; los del centro, ellos mismos. */
export function parejaDe(nombre: string): string {
  if (nombre.endsWith('_L')) return `${nombre.slice(0, -2)}_R`;
  if (nombre.endsWith('_R')) return `${nombre.slice(0, -2)}_L`;
  return nombre;
}

/** La reflexión del eje X del personaje. */
const M = new THREE.Matrix3().set(-1, 0, 0, 0, 1, 0, 0, 0, 1);

/** Las D de cada hueso (por nombre) y las de sus padres, deducidas del reposo. */
export interface EspejoDelEsqueleto {
  /** D_b de cada nodo animable, como matriz 3×3 diagonal. */
  readonly d: ReadonlyMap<string, THREE.Matrix3>;
  /** El padre de cada nodo (por nombre), o `null` si cuelga de fuera del esqueleto. */
  readonly padre: ReadonlyMap<string, string | null>;
  /** Lo que se aparta de la simetría cada hueso que no es exacto (por encima de `DESVIO_DEL_CUERPO`). */
  readonly desvios: ReadonlyMap<string, number>;
}

/** Lo que se admite que un hueso del cuerpo se aparte de la simetría (en el coseno de sus ejes). */
export const DESVIO_DEL_CUERPO = 0.02;
/** Lo que se admite a los huesos de tela: ver la cabecera. */
export const DESVIO_DE_LA_TELA = 0.1;

function esDeTela(nombre: string): boolean {
  return nombre.startsWith('faldon');
}

function rotacionDeMundo(o: THREE.Object3D, salida: THREE.Matrix3): THREE.Matrix3 {
  const m4 = o.matrixWorld;
  salida.setFromMatrix4(m4);
  /* Quitar la escala de las columnas (la mujer de la forja va escalada ×0,94 entera). */
  const e = salida.elements;
  for (let c = 0; c < 3; c++) {
    const l = Math.hypot(e[c * 3] as number, e[c * 3 + 1] as number, e[c * 3 + 2] as number) || 1;
    e[c * 3] = (e[c * 3] as number) / l;
    e[c * 3 + 1] = (e[c * 3 + 1] as number) / l;
    e[c * 3 + 2] = (e[c * 3 + 2] as number) / l;
  }
  return salida;
}

/**
 * DEDUCE EL ESPEJO de un esqueleto en reposo (`raiz`: el nodo que cuelga los huesos, en su pose de
 * reposo y con `matrixWorld` al día). Lanza si no es simétrico.
 */
export function espejoDelEsqueleto(raiz: THREE.Object3D): EspejoDelEsqueleto {
  raiz.updateWorldMatrix(true, true);
  const porNombre = new Map<string, THREE.Object3D>();
  raiz.traverse((o) => {
    if (o.name !== '') porNombre.set(o.name, o);
  });
  const d = new Map<string, THREE.Matrix3>();
  const padre = new Map<string, string | null>();
  const desvios = new Map<string, number>();
  const wb = new THREE.Matrix3();
  const wm = new THREE.Matrix3();
  const fallos: string[] = [];
  for (const [nombre, o] of porNombre) {
    const par = porNombre.get(parejaDe(nombre));
    if (par === undefined) {
      fallos.push(`${nombre} no tiene pareja`);
      continue;
    }
    rotacionDeMundo(o, wb);
    rotacionDeMundo(par, wm);
    const db = wb.clone().transpose().multiply(M).multiply(wm);
    /* Redondear a ±1 y comprobar que era diagonal. */
    const e = db.elements;
    let fuera = 0;
    for (let i = 0; i < 9; i++) {
      const diagonal = i === 0 || i === 4 || i === 8;
      const v = e[i] as number;
      if (diagonal) {
        fuera = Math.max(fuera, Math.abs(Math.abs(v) - 1));
        e[i] = v < 0 ? -1 : 1;
      } else {
        fuera = Math.max(fuera, Math.abs(v));
        e[i] = 0;
      }
    }
    if (fuera > DESVIO_DEL_CUERPO) desvios.set(nombre, fuera);
    if (fuera > (esDeTela(nombre) ? DESVIO_DE_LA_TELA : DESVIO_DEL_CUERPO)) fallos.push(`${nombre}: el reposo no es simétrico (desvío ${fuera.toFixed(3)})`);
    d.set(nombre, db);
    padre.set(nombre, o.parent !== null && o.parent !== raiz.parent && porNombre.has(o.parent.name) ? o.parent.name : null);
  }
  if (fallos.length > 0) throw new Error(`No se puede hacer espejo: ${fallos.slice(0, 4).join('; ')}`);
  return { d, padre, desvios };
}

const IDENTIDAD_REFLEJADA = M.clone();

/**
 * EL ESPEJO DE UN CLIP. Las pistas de rotación y de posición de cada hueso pasan a su pareja con la
 * fórmula de la cabecera; las de escala (la forja no las exporta) se copian. El clip devuelto se llama
 * `<nombre>~espejo` y comparte los tiempos con el original.
 */
export function clipEnEspejo(clip: THREE.AnimationClip, espejo: EspejoDelEsqueleto): THREE.AnimationClip {
  const pistas: THREE.KeyframeTrack[] = [];
  const q = new THREE.Quaternion();
  const r = new THREE.Matrix4();
  const r3 = new THREE.Matrix3();
  const v = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  for (const pista of clip.tracks) {
    const punto = pista.name.lastIndexOf('.');
    const nodo = pista.name.slice(0, punto);
    const propiedad = pista.name.slice(punto + 1);
    const destino = parejaDe(nodo);
    const db = espejo.d.get(nodo);
    const padre = espejo.padre.get(nodo) ?? null;
    const dp = padre !== null ? espejo.d.get(padre) : IDENTIDAD_REFLEJADA;
    if (db === undefined || dp === undefined) {
      pistas.push(pista.clone());
      continue;
    }
    const valores = Float32Array.from(pista.values);
    if (propiedad === 'quaternion') {
      for (let k = 0; k < valores.length; k += 4) {
        q.set(valores[k] as number, valores[k + 1] as number, valores[k + 2] as number, valores[k + 3] as number);
        r.makeRotationFromQuaternion(q);
        r3.setFromMatrix4(r);
        /* D_p · Q · D_b: con D diagonal, cambia el signo de filas y columnas. */
        const e = r3.elements;
        const ep = dp.elements;
        const eb = db.elements;
        for (let fila = 0; fila < 3; fila++) {
          for (let col = 0; col < 3; col++) {
            /* Matrix3 guarda por columnas: elemento (fila, col) en col*3+fila. */
            e[col * 3 + fila] = (ep[fila * 4] as number) * (e[col * 3 + fila] as number) * (eb[col * 4] as number);
          }
        }
        m4.setFromMatrix3(r3);
        q.setFromRotationMatrix(m4);
        valores[k] = q.x;
        valores[k + 1] = q.y;
        valores[k + 2] = q.z;
        valores[k + 3] = q.w;
      }
      pistas.push(new THREE.QuaternionKeyframeTrack(`${destino}.quaternion`, Float32Array.from(pista.times), valores));
    } else if (propiedad === 'position') {
      for (let k = 0; k < valores.length; k += 3) {
        v.set(valores[k] as number, valores[k + 1] as number, valores[k + 2] as number);
        const ep = dp.elements;
        valores[k] = (ep[0] as number) * v.x;
        valores[k + 1] = (ep[4] as number) * v.y;
        valores[k + 2] = (ep[8] as number) * v.z;
      }
      pistas.push(new THREE.VectorKeyframeTrack(`${destino}.position`, Float32Array.from(pista.times), valores));
    } else {
      const copia = pista.clone();
      copia.name = `${destino}.${propiedad}`;
      pistas.push(copia);
    }
  }
  /* Conservar la interpolación de cada pista (la forja deja STEP en los canales constantes). */
  clip.tracks.forEach((p, i) => {
    const nueva = pistas[i];
    if (nueva !== undefined) nueva.setInterpolation(p.getInterpolation());
  });
  return new THREE.AnimationClip(`${clip.name}~espejo`, clip.duration, pistas);
}
