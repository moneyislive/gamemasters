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
import { parchear } from '../atmosfera/parcheo';
import { UNIFORMES_DE_LA_LUZ } from '../atmosfera/paleta';
import { GLSL_ALTURA } from '../ciudad/reflejos';
import { UNIFORMES_DE_LA_CIUDAD } from '../ciudad/retoques';

/**
 * La mancha se posa en el suelo que pisa: en la calzada a cota 0, en la acera y en la plaza 15 cm más
 * arriba. A cota fija quedaba DEBAJO de la losa de la acera y de la plaza, justo donde se pelea: no se
 * veía nunca. Lee el mismo mapa de alturas que las salpicaduras, en el centro de cada mancha.
 */
const SOBRE_EL_SUELO = /* glsl */ `
{
  vec3 origenQ = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  mvPosition.xyz += (viewMatrix * vec4(0.0, alturaDelSueloQ(origenQ.xz), 0.0, 0.0)).xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

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
    parchear(material, {
      nombre: 'sombra-sobre-el-suelo',
      orden: 10,
      uniformes: { uAlturas: UNIFORMES_DE_LA_CIUDAD.uAlturas, uAlturasCaja: UNIFORMES_DE_LA_CIUDAD.uAlturasCaja },
      vertice: [
        { buscar: '#include <common>', como: 'despues', texto: GLSL_ALTURA },
        { buscar: '#include <project_vertex>', como: 'despues', texto: SOBRE_EL_SUELO },
      ],
    });
    this.malla = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, capacidad);
    this.malla.name = 'sombras-de-contacto';
    this.malla.count = 0;
    this.malla.frustumCulled = false;
    this.malla.renderOrder = -1;
    this.malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    /* Lo oscura que es, de la luz del barrio: al alba, con todo iluminado por el cielo, una mancha al
       60 % no se veía. */
    this.malla.onBeforeRender = (): void => {
      material.opacity = Math.min(1, 0.6 * UNIFORMES_DE_LA_LUZ.uSombraDeContacto.value);
    };
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
