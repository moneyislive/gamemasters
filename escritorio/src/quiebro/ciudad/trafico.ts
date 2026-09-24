/**
 * EL TRÁFICO DE FUERA: coches en marcha por la avenida que rodea el barrio, al otro lado de las
 * vallas. Adorno puro (diseño §8: dentro del límite jugable sólo hay coches aparcados, que son
 * estructura): no choca con nada ni lo ve la sala.
 *
 * ═══ POR QUÉ SE VE ═══
 *
 * Una ciudad de madrugada no está quieta: al fondo de cada calle cortada pasa de vez en cuando un
 * par de faros, y su brillo se estira en el asfalto mojado. Eso es lo que cuenta aquí: los coches
 * son cajas con cabina (a 60 m no se ve más), pero sus faros llevan halo y TARJETA DE REFLEJO
 * propia, que se recoloca cada fotograma con el coche.
 *
 * Los coches dan vueltas a la avenida cuadrada (por la derecha, como aquí), la mitad en cada sentido,
 * cada uno a su velocidad. El número es del nivel (4 / 8 / 16 / 30). Cuatro llamadas: carrocerías,
 * luces, halos y reflejos.
 */
import * as THREE from 'three';
import { Molde } from './geometria';
import { ACABADO, ATRIBUTOS_DE_LO_EMISIVO, ATRIBUTOS_DEL_MOBILIARIO } from './materiales';
import { mallaDeHalos, materialDeLosHalos } from './halos';
import { dadoDe } from './azar';

interface Avenida {
  readonly corre: 'x' | 'z';
  readonly en: number;
  readonly desde: number;
  readonly hasta: number;
}

interface CocheEnMarcha {
  s: number;
  readonly velocidad: number;
  readonly sentido: 1 | -1;
  readonly carril: number;
}

function geometriaDelCoche(): { cuerpo: THREE.BufferGeometry; luces: THREE.BufferGeometry } {
  const mo = new Molde(ATRIBUTOS_DEL_MOBILIARIO, true);
  mo.color(1, 1, 1);
  mo.poner('aAcabado', ACABADO.chapa[0], ACABADO.chapa[1]);
  mo.perfil(
    [
      [-2.2, 0.3],
      [2.2, 0.3],
      [2.2, 0.8],
      [0.9, 0.92],
      [0.2, 1.36],
      [-0.9, 1.38],
      [-1.5, 0.95],
      [-2.2, 0.9],
    ],
    -0.85,
    0.85,
  );
  mo.color(0.02, 0.02, 0.02);
  mo.caja(-1.6, 0, -0.8, -1.1, 0.32, 0.8, 'nseo');
  mo.caja(1.1, 0, -0.8, 1.6, 0.32, 0.8, 'nseo');
  const em = new Molde(ATRIBUTOS_DE_LO_EMISIVO, true);
  em.poner('aEmisor', 0, 0);
  em.color(6, 5.6, 4.8);
  for (const z of [-0.6, 0.6]) em.caja(2.2, 0.6, z - 0.13, 2.23, 0.72, z + 0.13, 'e');
  em.color(3, 0.08, 0.04);
  for (const z of [-0.65, 0.65]) em.caja(-2.23, 0.66, z - 0.12, -2.2, 0.78, z + 0.12, 'o');
  return { cuerpo: mo.geometria(), luces: em.geometria() };
}

export class Trafico {
  readonly mallas: THREE.Mesh[];
  private readonly coches: CocheEnMarcha[] = [];
  private readonly cuerpo: THREE.InstancedMesh;
  private readonly luces: THREE.InstancedMesh;
  private readonly halos: THREE.InstancedMesh;
  private readonly reflejos: THREE.InstancedMesh;
  private readonly lado: number;
  private readonly materialHalos: THREE.Material;
  private readonly m = new THREE.Matrix4();

  constructor(avenidas: readonly Avenida[], cuantos: number, semilla: number, materialCuerpo: THREE.Material, materialLuces: THREE.Material, materialTarjetas: THREE.Material) {
    /* La avenida es un cuadrado: se toma su semilado de la primera. */
    this.lado = Math.abs(avenidas[0]?.en ?? 120);
    const dado = dadoDe(semilla ^ 0x0ca5_5e11);
    const perimetro = 8 * this.lado;
    for (let i = 0; i < cuantos; i++) {
      const sentido: 1 | -1 = i % 2 === 0 ? 1 : -1;
      /* Por la derecha: el que va en sentido antihorario lleva el carril de fuera. */
      this.coches.push({ s: dado() * perimetro, velocidad: 10 + dado() * 6, sentido, carril: sentido > 0 ? -1.6 : 1.6 });
    }
    const g = geometriaDelCoche();
    this.cuerpo = new THREE.InstancedMesh(g.cuerpo, materialCuerpo, cuantos);
    this.cuerpo.name = 'carrocerías';
    this.luces = new THREE.InstancedMesh(g.luces, materialLuces, cuantos);
    this.luces.name = 'faros';
    const colores = [0x1b2436, 0x8c9096, 0x121314, 0x3a0f12, 0xd8d9d6, 0x2c3e5a];
    for (let i = 0; i < cuantos; i++) {
      this.cuerpo.setColorAt(i, new THREE.Color().setHex(colores[Math.floor(dado() * colores.length)] ?? 0x121314));
    }
    /* Halos y reflejos: dos por coche (los faros juntos y los pilotos juntos). */
    this.materialHalos = materialDeLosHalos();
    const fuentes = Array.from({ length: cuantos * 2 }, (_, k) => ({
      x: 0,
      y: 0.66,
      z: 0,
      radio: k % 2 === 0 ? 1.1 : 0.6,
      color: (k % 2 === 0 ? [2.2, 2.0, 1.7] : [1.4, 0.03, 0.02]) as [number, number, number],
      farola: false,
      parpadeo: 0,
    }));
    this.halos = mallaDeHalos(fuentes, this.materialHalos);
    this.halos.name = 'halos de los faros';
    const plano = new THREE.PlaneGeometry(1, 1);
    const n = Math.max(1, cuantos * 2);
    const fuente = new Float32Array(n * 4);
    const color = new Float32Array(n * 4);
    const visible = new Float32Array(n).fill(1);
    for (let k = 0; k < n; k++) color.set(k % 2 === 0 ? [7, 6.5, 5.5, 0] : [3, 0.06, 0.04, 0], k * 4);
    const aFuente = new THREE.InstancedBufferAttribute(fuente, 4);
    aFuente.setUsage(THREE.DynamicDrawUsage);
    plano.setAttribute('aFuente', aFuente);
    plano.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 4));
    plano.setAttribute('aVisible', new THREE.InstancedBufferAttribute(visible, 1));
    this.reflejos = new THREE.InstancedMesh(plano, materialTarjetas, cuantos * 2);
    this.reflejos.name = 'reflejos de los faros';
    this.reflejos.renderOrder = 2;
    for (const x of [this.cuerpo, this.luces, this.halos, this.reflejos]) x.frustumCulled = false;
    this.mallas = [this.cuerpo, this.luces, this.halos, this.reflejos];
    this.actualizar(0, 0);
  }

  /** Posición y rumbo en el perímetro del cuadrado (s en metros, antihorario visto desde arriba). */
  private enLaAvenida(s: number, carril: number): { x: number; z: number; rumbo: number } {
    const L = this.lado;
    const p = ((s % (8 * L)) + 8 * L) % (8 * L);
    const tramo = Math.floor(p / (2 * L));
    const a = p - tramo * 2 * L - L;
    /* Lado sur (z = L) hacia +x, este hacia −z, norte hacia −x, oeste hacia +z; el carril, hacia dentro. */
    if (tramo === 0) return { x: a, z: L - carril, rumbo: 0 };
    if (tramo === 1) return { x: L - carril, z: -a, rumbo: Math.PI / 2 };
    if (tramo === 2) return { x: -a, z: -L + carril, rumbo: Math.PI };
    return { x: -L + carril, z: a, rumbo: -Math.PI / 2 };
  }

  actualizar(_tiempo: number, dt: number): void {
    const fuentes = this.reflejos.geometry.getAttribute('aFuente') as THREE.InstancedBufferAttribute;
    const halos = this.halos.geometry.getAttribute('aFuente') as THREE.InstancedBufferAttribute;
    const datos = fuentes.array as Float32Array;
    const datosH = halos.array as Float32Array;
    this.coches.forEach((c, i) => {
      c.s += c.velocidad * dt * c.sentido;
      const { x, z, rumbo } = this.enLaAvenida(c.s, c.carril);
      /* El morro (+x local) mira al sentido de la marcha. */
      const giro = rumbo + (c.sentido < 0 ? Math.PI : 0);
      this.m.makeRotationY(giro).setPosition(x, 0, z);
      this.cuerpo.setMatrixAt(i, this.m);
      this.luces.setMatrixAt(i, this.m);
      const fx = Math.cos(giro);
      const fz = -Math.sin(giro);
      datos.set([x + fx * 2.4, 0.66, z + fz * 2.4, 0.35], i * 8);
      datos.set([x - fx * 2.4, 0.72, z - fz * 2.4, 0.25], i * 8 + 4);
      datosH.set([x + fx * 2.35, 0.66, z + fz * 2.35, 1.1], i * 8);
      datosH.set([x - fx * 2.35, 0.72, z - fz * 2.35, 0.6], i * 8 + 4);
    });
    this.cuerpo.instanceMatrix.needsUpdate = true;
    this.luces.instanceMatrix.needsUpdate = true;
    fuentes.needsUpdate = true;
    halos.needsUpdate = true;
  }

  liberar(): void {
    this.cuerpo.geometry.dispose();
    this.luces.geometry.dispose();
    this.halos.geometry.dispose();
    this.reflejos.geometry.dispose();
    this.materialHalos.dispose();
  }
}
