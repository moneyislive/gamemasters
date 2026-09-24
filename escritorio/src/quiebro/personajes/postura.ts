/**
 * LA POSTURA DEL PARAGUAS: el brazo derecho recogido delante del pecho, el puño cerrado y el mástil
 * vertical, encima del clip que toque (andar, esperar en el bordillo, charlar en la esquina).
 *
 * ═══ POR QUÉ ENCIMA DEL CLIP Y NO UN CLIP MÁS ═══
 *
 * La forja no trae «andar con paraguas», y con el braceo de andar el paraguas iría barriendo la acera
 * como un péndulo. Sobreponer el brazo al clip vale para cualquier clip de la multitud sin hornear nada
 * en Blender: después de que el mezclador ponga la pose, se giran el brazo y el antebrazo hacia dos
 * direcciones del cuerpo (el brazo abajo y un poco adelante, el antebrazo hacia delante y arriba) con
 * el giro más corto, y la mano se orienta para que el eje del agarre (+Y, el lado del pulgar) apunte al
 * cielo. Lo usan los durmientes con esqueleto en cada fotograma y el horneado de la multitud una vez
 * por fotograma de clip (`huesos-en-textura.ts`), con la misma función: el paraguas se coge igual de
 * cerca que de lejos.
 *
 * Las direcciones van en el espacio del cuerpo (+Z delante, +X su izquierda: el brazo derecho está en
 * −X), así que el tronco puede balancearse con el paso y el brazo le acompaña.
 *
 * ═══ LO QUE SE ESCRIBE ENCIMA DEL MEZCLADOR SE BORRA ANTES DEL SIGUIENTE ═══
 *
 * `PropertyMixer.apply` de three sólo escribe un hueso si el valor que le toca es DISTINTO del que
 * escribió la vuelta anterior. Los dedos de `reposo`, `pasear` y `andar-paraguas` vienen quietos (una
 * pista de dos claves iguales), así que el mezclador no los volvía a poner nunca, y el cierre de los
 * dedos —un giro RELATIVO, `quaternion.multiply`— se sumaba al del fotograma anterior: 1,25 rad por
 * fotograma, el puño dando vueltas alrededor del mango, en los cuerpos con esqueleto y en la textura
 * horneada de la multitud (lo midió la revisión). Lo mismo le habría pasado al encorvado del Celador
 * mayor en cuanto un clip trajera la columna quieta. Cerrar la grafía (hacer absoluto el giro de los
 * dedos) dejaba abierta la puerta para el siguiente retoque; `PoseGuardada` la cierra: guarda la pose
 * que dejó el mezclador en los huesos que se retocan y la devuelve antes de la siguiente vuelta, de
 * modo que el mezclador siempre parte de SU pose y lo de encima se aplica una vez y sólo una.
 */
import * as THREE from 'three';

/**
 * LA POSE DEL MEZCLADOR de unos huesos: se guarda justo después de `mixer.update` y se devuelve justo
 * antes del siguiente (ver la cabecera). Sin asignaciones por fotograma.
 */
export class PoseGuardada {
  private readonly huesos: THREE.Object3D[] = [];
  private readonly q: THREE.Quaternion[] = [];
  private readonly p: THREE.Vector3[] = [];
  private guardada = false;

  /** Añade huesos a vigilar (los repetidos se ignoran). */
  vigilar(huesos: Iterable<THREE.Object3D | null | undefined>): void {
    for (const h of huesos) {
      if (h === null || h === undefined || this.huesos.includes(h)) continue;
      this.huesos.push(h);
      this.q.push(h.quaternion.clone());
      this.p.push(h.position.clone());
    }
  }

  get cuantos(): number {
    return this.huesos.length;
  }

  /** Guarda la pose que acaba de poner el mezclador. */
  guardar(): void {
    for (let i = 0; i < this.huesos.length; i++) {
      const h = this.huesos[i] as THREE.Object3D;
      (this.q[i] as THREE.Quaternion).copy(h.quaternion);
      (this.p[i] as THREE.Vector3).copy(h.position);
    }
    this.guardada = true;
  }

  /** Devuelve a los huesos la pose del mezclador (si se guardó alguna): lo de encima se borra. */
  restaurar(): void {
    if (!this.guardada) return;
    for (let i = 0; i < this.huesos.length; i++) {
      const h = this.huesos[i] as THREE.Object3D;
      h.quaternion.copy(this.q[i] as THREE.Quaternion);
      h.position.copy(this.p[i] as THREE.Vector3);
    }
  }
}

/** Los huesos que toca la postura, por nombre del manifiesto. */
export interface HuesosDelBrazo {
  readonly brazo: THREE.Object3D;
  readonly antebrazo: THREE.Object3D;
  readonly mano: THREE.Object3D;
  readonly agarre: THREE.Object3D;
  readonly dedos: readonly THREE.Object3D[];
}

/** Busca los huesos del brazo derecho por nombre. `null` si falta alguno (y entonces no hay postura). */
export function huesosDelBrazoDerecho(raiz: THREE.Object3D, agarre: string): HuesosDelBrazo | null {
  const h = (n: string): THREE.Object3D | undefined => raiz.getObjectByName(n) ?? undefined;
  const brazo = h('brazo_R');
  const antebrazo = h('antebrazo_R');
  const mano = h('mano_R');
  const a = h(agarre);
  if (brazo === undefined || antebrazo === undefined || mano === undefined || a === undefined) return null;
  const dedos = ['dedos_R', 'dedos2_R'].map(h).filter((x): x is THREE.Object3D => x !== undefined);
  return { brazo, antebrazo, mano, agarre: a, dedos };
}

/**
 * El brazo: casi vertical, pegado al costado y apenas adelante. El antebrazo: más arriba que adelante,
 * un poco hacia dentro. Así el puño queda a la altura del pecho y a un palmo de él (la primera versión
 * lo llevaba medio metro por delante, con el antebrazo horizontal: parecía que ofrecía el paraguas a
 * otro; se vio en el banco).
 */
const DIRECCION_DEL_BRAZO = new THREE.Vector3(-0.1, -0.97, 0.2).normalize();
const DIRECCION_DEL_ANTEBRAZO = new THREE.Vector3(0.06, 0.78, 0.62).normalize();
/** El mástil se inclina hacia atrás para que la copa quede sobre la cabeza y no delante de la cara. */
const INCLINACION_DEL_MASTIL = 0.26;
/** Cuánto se cierran los dedos sobre el mástil (rad, en su bisagra +X). */
const CIERRE_DE_LOS_DEDOS = [1.25, 1.35];

const Y = new THREE.Vector3(0, 1, 0);
const tmp = {
  qCuerpo: new THREE.Quaternion(),
  qPadre: new THREE.Quaternion(),
  qHueso: new THREE.Quaternion(),
  qGiro: new THREE.Quaternion(),
  qDeseo: new THREE.Quaternion(),
  qLocal: new THREE.Quaternion(),
  eje: new THREE.Vector3(),
  destino: new THREE.Vector3(),
  m: new THREE.Matrix4(),
  x: new THREE.Vector3(),
  y: new THREE.Vector3(),
  z: new THREE.Vector3(),
};

/** Gira `hueso` (en mundo) para que su +Y apunte a `direccion` (en mundo), mezclado con `peso`. */
function apuntar(hueso: THREE.Object3D, direccion: THREE.Vector3, peso: number): void {
  const padre = hueso.parent;
  if (padre === null) return;
  padre.getWorldQuaternion(tmp.qPadre);
  hueso.getWorldQuaternion(tmp.qHueso);
  tmp.eje.copy(Y).applyQuaternion(tmp.qHueso);
  tmp.qGiro.setFromUnitVectors(tmp.eje, direccion);
  tmp.qDeseo.copy(tmp.qGiro).multiply(tmp.qHueso);
  tmp.qLocal.copy(tmp.qPadre).invert().multiply(tmp.qDeseo);
  hueso.quaternion.slerp(tmp.qLocal, peso);
  hueso.updateMatrixWorld(true);
}

/**
 * PONE LA POSTURA sobre la pose actual. `cuerpo` es el nodo que marca el espacio del cuerpo (el que se
 * gira con el rumbo). `peso` 1 es la postura entera; 0, nada (para fundirla al soltar el paraguas).
 */
export function posturaDelParaguas(cuerpo: THREE.Object3D, h: HuesosDelBrazo, peso: number): void {
  if (peso <= 0) return;
  cuerpo.updateWorldMatrix(true, false);
  h.brazo.parent?.updateWorldMatrix(true, false);
  h.brazo.updateMatrixWorld(true);
  cuerpo.getWorldQuaternion(tmp.qCuerpo);
  apuntar(h.brazo, tmp.destino.copy(DIRECCION_DEL_BRAZO).applyQuaternion(tmp.qCuerpo), peso);
  apuntar(h.antebrazo, tmp.destino.copy(DIRECCION_DEL_ANTEBRAZO).applyQuaternion(tmp.qCuerpo), peso);
  /*
   * La mano: el agarre con +Y hacia el cielo (inclinado hacia atrás, ver `INCLINACION_DEL_MASTIL`) y +X
   * (los nudillos) hacia delante del cuerpo. Se construye la orientación deseada del agarre y se pasa a
   * la mano con el giro fijo agarre→mano.
   */
  tmp.y.set(0, Math.cos(INCLINACION_DEL_MASTIL), -Math.sin(INCLINACION_DEL_MASTIL)).applyQuaternion(tmp.qCuerpo);
  tmp.x.set(0, 0, 1).applyQuaternion(tmp.qCuerpo);
  tmp.x.addScaledVector(tmp.y, -tmp.x.dot(tmp.y)).normalize();
  tmp.z.crossVectors(tmp.x, tmp.y).normalize();
  tmp.m.makeBasis(tmp.x, tmp.y, tmp.z);
  tmp.qDeseo.setFromRotationMatrix(tmp.m);
  /* mano_mundo = agarre_mundo · agarre_local⁻¹ */
  tmp.qGiro.copy(h.agarre.quaternion).invert();
  tmp.qDeseo.multiply(tmp.qGiro);
  h.antebrazo.getWorldQuaternion(tmp.qPadre);
  tmp.qLocal.copy(tmp.qPadre).invert().multiply(tmp.qDeseo);
  h.mano.quaternion.slerp(tmp.qLocal, peso);
  /*
   * Los dedos, cerrados sobre el mástil: un giro RELATIVO a la pose del clip, así que quien llama tiene
   * que devolverles esa pose antes de la siguiente vuelta del mezclador (`PoseGuardada`).
   */
  for (let i = 0; i < h.dedos.length; i++) {
    tmp.qGiro.setFromAxisAngle(tmp.eje.set(1, 0, 0), (CIERRE_DE_LOS_DEDOS[i] ?? 1.2) * peso);
    (h.dedos[i] as THREE.Object3D).quaternion.multiply(tmp.qGiro);
  }
  h.mano.updateMatrixWorld(true);
}

/** Los huesos que toca `posturaDelParaguas` (para vigilarlos con `PoseGuardada`). */
export function huesosQueTocaLaPostura(h: HuesosDelBrazo): THREE.Object3D[] {
  return [h.brazo, h.antebrazo, h.mano, ...h.dedos];
}
