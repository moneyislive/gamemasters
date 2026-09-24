/**
 * LAS LUCES DE LA NOCHE: hemisferio y una direccional tenue para todo, y un banco de luces
 * puntuales reales que se recolocan en las farolas más cercanas a la cámara (N2+).
 *
 * ═══ QUÉ ILUMINA CADA COSA ═══
 *
 *   · El HEMISFERIO pone el fondo: el cielo cubierto verdoso por arriba y el suelo mojado, pardo,
 *     por abajo. Es lo único que ve un muro sin farola delante.
 *   · La DIRECCIONAL es el resplandor difuso de las nubes, muy tenue y casi cenital; da volumen a
 *     los personajes y, desde N2, las sombras (sólo esta luz, sólo en 40 m alrededor de la cámara).
 *   · Las farolas NO son luces: están horneadas en el mapa de la luz de la calle. Las 4-6 más
 *     cercanas SÍ se encienden de verdad en N2+ para dar el brillo en el suelo mojado y la luz de
 *     lado a los personajes; en la ciudad sólo ponen brillo (retoque `solo-brillo`), así que no
 *     cuentan dos veces la difusa. Siempre el MISMO número de luces en un nivel: cambiarlo
 *     recompila todos los sombreadores de la escena, y eso es un tirón de un segundo.
 *
 * Nada de esto decide la partida: un personaje en una calle oscura en N0 tiene su contorno igual
 * (el frente de personajes lo pinta aparte).
 */
import * as THREE from 'three';

/** Una farola que puede encender una luz real. */
export interface FarolaEncendible {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** La intensidad de una farola (candelas, con caída física 1/d²). La misma que en el horneado. */
export const INTENSIDAD_DE_FAROLA = 140;
/** El color del sodio en sRGB (lo que se ve). */
export const COLOR_DE_SODIO = '#ff9a3c';

export interface OpcionesDeLasLuces {
  /** Cuántas luces puntuales reales (0 en N0-N1). */
  readonly reales: number;
  /** Lado del mapa de sombras de la direccional; 0 sin sombras. */
  readonly sombras: number;
}

export class LucesDeLaNoche {
  readonly grupo = new THREE.Group();
  readonly hemisferio: THREE.HemisphereLight;
  readonly direccional: THREE.DirectionalLight;
  private readonly reales: THREE.PointLight[] = [];
  private readonly destino: (FarolaEncendible | null)[] = [];
  private readonly farolas: readonly FarolaEncendible[];
  private encendido = 1;
  private reloj = 0;
  private readonly foco = new THREE.Vector3();
  private readonly adelante = new THREE.Vector3();

  constructor(farolas: readonly FarolaEncendible[], opciones: OpcionesDeLasLuces) {
    this.farolas = farolas;
    this.grupo.name = 'quiebro-luces';
    this.hemisferio = new THREE.HemisphereLight(new THREE.Color('#5d7f7a'), new THREE.Color('#3a2c22'), 0.22);
    this.grupo.add(this.hemisferio);
    this.direccional = new THREE.DirectionalLight(new THREE.Color('#9fb4c2'), 0.12);
    this.direccional.position.set(18, 60, 26);
    this.grupo.add(this.direccional);
    this.grupo.add(this.direccional.target);
    if (opciones.sombras > 0) {
      this.direccional.castShadow = true;
      this.direccional.shadow.mapSize.set(opciones.sombras, opciones.sombras);
      const c = this.direccional.shadow.camera;
      c.left = -20;
      c.right = 20;
      c.top = 20;
      c.bottom = -20;
      c.near = 1;
      c.far = 140;
      this.direccional.shadow.bias = -0.0004;
      this.direccional.shadow.normalBias = 0.03;
      this.direccional.shadow.intensity = 0.8;
    }
    for (let i = 0; i < opciones.reales; i++) {
      const luz = new THREE.PointLight(new THREE.Color(COLOR_DE_SODIO), 0, 26, 2);
      luz.name = `quiebro-farola-real-${String(i)}`;
      this.reales.push(luz);
      this.destino.push(null);
      this.grupo.add(luz);
    }
  }

  /** 1 farolas encendidas, 0 el Apagón. */
  set farolasEncendidas(v: number) {
    this.encendido = v;
  }

  /**
   * Por fotograma: la sombra sigue a la cámara (con el paso del téxel para que no nade), y cada
   * 0,3 s se eligen las farolas más cercanas a un punto 8 m por delante de la cámara. Una luz que
   * cambia de farola se apaga, salta y se enciende: el salto no se ve.
   */
  actualizar(camara: THREE.Camera, dt: number): void {
    camara.getWorldPosition(this.foco);
    camara.getWorldDirection(this.adelante);
    this.adelante.y = 0;
    if (this.adelante.lengthSq() > 1e-6) this.adelante.normalize();
    this.foco.addScaledVector(this.adelante, 8);
    this.foco.y = 0;

    if (this.direccional.castShadow) {
      const texel = 40 / this.direccional.shadow.mapSize.x;
      const x = Math.round(this.foco.x / texel) * texel;
      const z = Math.round(this.foco.z / texel) * texel;
      this.direccional.target.position.set(x, 0, z);
      this.direccional.position.set(x + 18, 60, z + 26);
      this.direccional.target.updateMatrixWorld();
    }

    if (this.reales.length === 0) return;
    this.reloj += dt;
    if (this.reloj >= 0.3) {
      this.reloj = 0;
      const cercanas = [...this.farolas]
        .map((f) => ({ f, d: (f.x - this.foco.x) ** 2 + (f.z - this.foco.z) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, this.reales.length)
        .map((c) => c.f);
      /* Las que ya están en una elegida se quedan; las demás toman las que falten. */
      const libres = cercanas.filter((f) => !this.destino.includes(f));
      for (let i = 0; i < this.reales.length; i++) {
        const d = this.destino[i];
        if (d !== null && d !== undefined && cercanas.includes(d)) continue;
        this.destino[i] = libres.shift() ?? null;
      }
    }
    const paso = Math.min(1, dt * 4);
    for (let i = 0; i < this.reales.length; i++) {
      const luz = this.reales[i] as THREE.PointLight;
      const d = this.destino[i] ?? null;
      const enSuSitio = d !== null && Math.abs(luz.position.x - d.x) < 0.01 && Math.abs(luz.position.z - d.z) < 0.01;
      const objetivo = d !== null && enSuSitio ? INTENSIDAD_DE_FAROLA * this.encendido : 0;
      luz.intensity += (objetivo - luz.intensity) * paso;
      if (d !== null && !enSuSitio && luz.intensity < 2) {
        luz.position.set(d.x, d.y - 0.35, d.z);
        luz.intensity = 0;
      }
    }
  }
}
