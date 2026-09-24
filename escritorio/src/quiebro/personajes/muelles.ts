/**
 * LOS MUELLES DEL FALDÓN: la gabardina que se queda atrás al arrancar, se abre al girar y sigue de largo
 * al pararse. Movimiento secundario barato, sólo en N2+ y en los cuerpos cercanos.
 *
 * ═══ POR QUÉ ENCIMA DE LO HORNEADO ═══
 *
 * La forja hornea la tela del faldón en cada clip (24 huesos en 8 cadenas, con colisión contra las
 * piernas), y eso está bien para lo que el clip sabe: andar en línea recta, patear, caer. Lo que el clip
 * NO sabe es lo que hace el juego con el cuerpo: los clips van con la raíz en el sitio y es el juego
 * quien lo lleva de 0 a 5 m/s en tres tics, lo gira hacia el blanco o lo quiebra 3,5 m de lado en 300 ms.
 * Con sólo lo horneado, la gabardina de alguien que da un quiebro cuelga igual que si estuviera quieto.
 *
 * Aquí un muelle amortiguado en dos dimensiones (de lado y adelante-atrás, en el espacio del cuerpo)
 * recibe la aceleración del cuerpo al revés y la fuerza centrífuga del giro, y su desplazamiento se
 * convierte en un giro de las ocho cadenas desde arriba (y la mitad más en el segundo hueso de cada
 * una): el bajo se va hacia donde lo lleva la inercia. Cuesta dieciséis multiplicaciones de cuaternión
 * por cuerpo y fotograma. Si la figura no trae huesos de faldón, no hace nada.
 */
import * as THREE from 'three';

/** Rigidez y amortiguamiento del muelle (1/s² y 1/s): cerca del crítico, con un rebote pequeño. */
export const RIGIDEZ = 55;
export const AMORTIGUAMIENTO = 8.5;
/** Cuánto gira el faldón por metro de desplazamiento del muelle, y lo más que gira. */
const GIRO_POR_METRO = 1.4;
const GIRO_COMO_MUCHO = 0.55;

export class MuellesDelFaldon {
  private readonly arriba: THREE.Object3D[] = [];
  private readonly medio: THREE.Object3D[] = [];
  private readonly caderas: THREE.Object3D | null;
  private readonly raiz: THREE.Object3D | null;
  /** Desplazamiento y velocidad del muelle, en el espacio del cuerpo (x su izquierda, z delante). */
  private sx = 0;
  private sz = 0;
  private vx = 0;
  private vz = 0;
  private readonly q = new THREE.Quaternion();
  private readonly qRel = new THREE.Quaternion();
  private readonly qInv = new THREE.Quaternion();
  private readonly qGiro = new THREE.Quaternion();
  private readonly qPadre = new THREE.Quaternion();
  private readonly eje = new THREE.Vector3();
  private readonly Y = new THREE.Vector3(0, 1, 0);

  constructor(huesos: THREE.Object3D, raiz: string, caderas: string) {
    huesos.traverse((o) => {
      const m = /^faldon(\d)(\d)_[LR]$/.exec(o.name);
      if (m === null) return;
      if (m[2] === '1') this.arriba.push(o);
      else if (m[2] === '2') this.medio.push(o);
    });
    this.caderas = huesos.getObjectByName(caderas) ?? null;
    this.raiz = huesos.getObjectByName(raiz) ?? null;
  }

  /** Los huesos que mueve (para vigilarlos con `PoseGuardada`: el giro va encima del clip). */
  get huesos(): readonly THREE.Object3D[] {
    return [...this.arriba, ...this.medio];
  }

  /** ¿Hay faldón que mover? */
  get tiene(): boolean {
    return this.arriba.length > 0 && this.caderas !== null;
  }

  /** Vuelve al reposo (al cambiar de cuerpo o al volver a entrar en N2). */
  reiniciar(): void {
    this.sx = 0;
    this.sz = 0;
    this.vx = 0;
    this.vz = 0;
  }

  /**
   * UN PASO del muelle con la aceleración del cuerpo `ax`, `az` (m/s², en su espacio) y su giro `w`
   * (rad/s) a la velocidad hacia delante `v` (m/s). Pasos de 1/60 s como mucho, para que no explote.
   */
  paso(dtS: number, ax: number, az: number, w: number, v: number): void {
    let resto = Math.min(0.1, Math.max(0, dtS));
    while (resto > 1e-6) {
      const h = Math.min(1 / 60, resto);
      resto -= h;
      /* El bajo se queda atrás de la aceleración, y sale hacia fuera en la curva (centrífuga). */
      const fx = -ax + w * v;
      const fz = -az;
      this.vx += (-RIGIDEZ * this.sx - AMORTIGUAMIENTO * this.vx + fx * 0.08) * h;
      this.vz += (-RIGIDEZ * this.sz - AMORTIGUAMIENTO * this.vz + fz * 0.08) * h;
      this.sx += this.vx * h;
      this.sz += this.vz * h;
    }
  }

  /** Aplica el desplazamiento a los huesos, sobre la pose que ya puso el mezclador. */
  aplicar(peso: number): void {
    if (!this.tiene || peso <= 0) return;
    const largo = Math.sqrt(this.sx * this.sx + this.sz * this.sz);
    if (largo < 1e-4) return;
    const angulo = Math.min(GIRO_COMO_MUCHO, largo * GIRO_POR_METRO) * peso;
    /* El eje: el que lleva el bajo (que cuelga hacia −Y) hacia el desplazamiento: d × Y. */
    this.eje.set(this.sx / largo, 0, this.sz / largo).cross(this.Y).normalize();
    this.qGiro.setFromAxisAngle(this.eje, angulo);
    /* Del espacio del cuerpo al de las caderas (padre de las cadenas): la raíz y las caderas. */
    this.qRel.identity();
    if (this.raiz !== null) this.qRel.multiply(this.raiz.quaternion);
    if (this.caderas !== null) this.qRel.multiply(this.caderas.quaternion);
    this.qInv.copy(this.qRel).invert();
    this.q.copy(this.qInv).multiply(this.qGiro).multiply(this.qRel);
    for (const h of this.arriba) h.quaternion.premultiply(this.q);
    /* El segundo hueso, la mitad más, en el espacio de su padre (el primero, ya girado). */
    this.qGiro.setFromAxisAngle(this.eje, angulo * 0.5);
    for (const h of this.medio) {
      const padre = h.parent;
      if (padre === null) continue;
      /* q = P⁻¹ · giro · P, con P la rotación del padre en el espacio del cuerpo. */
      this.qPadre.copy(this.qRel).multiply(padre.quaternion);
      this.qInv.copy(this.qPadre).invert();
      this.q.copy(this.qInv).multiply(this.qGiro).multiply(this.qPadre);
      h.quaternion.premultiply(this.q);
    }
  }
}
