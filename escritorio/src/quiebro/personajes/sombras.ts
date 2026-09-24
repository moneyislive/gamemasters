/**
 * LAS SOMBRAS DE CONTACTO: una mancha oscura y difusa bajo cada cuerpo y cada durmiente cercano, todas
 * en UNA llamada.
 *
 * ═══ POR QUÉ, SI N2+ YA TIENE SOMBRAS ═══
 *
 * Las sombras de verdad (§8) son de la luz principal y sólo en N2+; en N0 y N1 no hay ninguna, y de
 * noche, con la luz que viene de farolas altas, un cuerpo sin nada debajo parece pegado sobre el asfalto
 * mojado, flotando. Una mancha instanciada lo asienta en todos los niveles por 2 triángulos por cabeza.
 * Sin niebla (una mancha negra con niebla se volvería una mancha del color de la bruma) y sólo hasta
 * 35 m en la multitud: más lejos no se distingue.
 */
import * as THREE from 'three';

function texturaRadial(): THREE.DataTexture {
  const n = 32;
  const datos = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (x + 0.5) / n - 0.5;
      const dy = (y + 0.5) / n - 0.5;
      const r = Math.min(1, Math.hypot(dx, dy) * 2);
      /* Una campana: casi negra en el centro, nada en el borde. */
      const a = Math.max(0, 1 - r) ** 1.6;
      const k = (y * n + x) * 4;
      datos[k] = datos[k + 1] = datos[k + 2] = Math.round(a * 255);
      datos[k + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(datos, n, n, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

export class Sombras {
  readonly malla: THREE.InstancedMesh;
  private readonly textura: THREE.DataTexture;
  private n = 0;
  private readonly m = new THREE.Matrix4();
  private readonly p = new THREE.Vector3();
  private readonly q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  private readonly s = new THREE.Vector3();

  constructor(readonly capacidad: number) {
    this.textura = texturaRadial();
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      alphaMap: this.textura,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      fog: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    material.userData.sinNieblaDeAltura = true;
    material.name = 'sombra-de-contacto';
    this.malla = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, capacidad);
    this.malla.name = 'sombras-de-contacto';
    this.malla.count = 0;
    this.malla.frustumCulled = false;
    this.malla.renderOrder = -1;
    this.malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  empezar(): void {
    this.n = 0;
  }

  /** Una mancha en (`x`, `z`), de `tamano` (1 ≈ una persona de pie). */
  poner(x: number, z: number, tamano: number): void {
    if (this.n >= this.capacidad) return;
    this.p.set(x, 0.015, z);
    this.s.set(1.1 * tamano, 1.1 * tamano, 1);
    this.m.compose(this.p, this.q, this.s);
    this.malla.setMatrixAt(this.n, this.m);
    this.n++;
  }

  terminar(): void {
    this.malla.count = this.n;
    this.malla.visible = this.n > 0;
    if (this.n > 0) this.malla.instanceMatrix.needsUpdate = true;
  }

  get cuantas(): number {
    return this.n;
  }

  liberar(): void {
    (this.malla.material as THREE.Material).dispose();
    this.malla.geometry.dispose();
    this.textura.dispose();
    this.malla.dispose();
  }
}
