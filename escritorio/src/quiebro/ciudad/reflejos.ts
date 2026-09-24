/**
 * LAS TARJETAS DE REFLEJO: el brillo de cada farola, neón, ventana y faro estirado en el suelo
 * mojado, con planos aditivos instanciados en UNA llamada.
 *
 * ═══ POR QUÉ TARJETAS Y NO UN REFLEJO DE VERDAD ═══
 *
 * Un reflejo planar pinta la escena otra vez (el doble de llamadas) y un reflejo en pantalla necesita
 * un compositor que N0 no tiene. Pero lo que hace que una calle mojada parezca mojada no es ver el
 * edificio de enfrente del revés: son las LUCES estiradas en vertical sobre el asfalto. Eso se hace
 * con geometría: por cada fuente, un plano sobre el suelo en el punto exacto donde el ojo vería su
 * imagen especular —la recta de la cámara a la fuente reflejada (y → −y) corta el suelo en
 * t = h_cámara / (h_cámara + h_fuente)—, estirado a lo largo de la dirección de la mirada. Con dos
 * lóbulos: el reflejo nítido, que sólo sale en los charcos (la misma `charcoQ` del asfalto), y la
 * estela larga y tenue del asfalto mojado. Con Fresnel: a ras de suelo, casi espejo.
 *
 * ═══ LO QUE NO SE VE NO SE REFLEJA ═══
 *
 * Una farola de la calle de atrás no puede brillar en el charco de delante: su imagen la tapa el
 * edificio. Cada pocos fotogramas se mira desde JavaScript si la recta en planta de la cámara a cada
 * fuente cruza alguna huella de edificio (muestras cada 2 m contra una rejilla), y las tapadas se
 * apagan. Lo que queda tapado por delante (un coche, un pilar) lo hace la prueba de profundidad.
 */
import * as THREE from 'three';
import { UNIFORMES_DE_LA_LUZ } from '../atmosfera/paleta';
import { nieblaEn } from '../atmosfera/niebla';
import { GLSL_CHARCOS, GLSL_RUIDO } from './glsl';
import { UNIFORMES_DE_LA_CIUDAD } from './retoques';
import type { CajaXZ } from './tipos';
import { rellenarInstancias } from './geometria';
import { ALTURA_DE_LA_ACERA } from './tipos';

/** Una fuente que se refleja en el suelo. */
export interface FuenteDeReflejo {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Radio aparente de la fuente, en metros. */
  readonly tamano: number;
  /** Color lineal ya multiplicado por la intensidad. */
  readonly color: readonly [number, number, number];
  /** Las farolas se apagan con el Apagón. */
  readonly farola: boolean;
}

const GLSL_ALTURA = /* glsl */ `
uniform sampler2D uAlturas;
uniform vec4 uAlturasCaja;
float alturaDelSueloQ(vec2 xz) {
  vec2 uvA = (xz - uAlturasCaja.xy) * uAlturasCaja.zw;
  if (uvA.x < 0.0 || uvA.y < 0.0 || uvA.x > 1.0 || uvA.y > 1.0) return 0.0;
  return texture(uAlturas, uvA).r * ${ALTURA_DE_LA_ACERA.toFixed(3)};
}
`;

export { GLSL_ALTURA };

const VERTICE = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec4 aFuente;
attribute vec4 aColor;
attribute float aVisible;
uniform float uFarolas;
uniform float uTarjetas;
${GLSL_ALTURA}
varying vec2 vQ;
varying vec3 vColor;
varying vec3 vPosQ;
varying float vSueloQ;
varying vec2 vMedidaQ;
void main() {
  vec3 L = aFuente.xyz;
  vec3 cam = cameraPosition;
  float camY = max(cam.y, 0.4);
  float t = camY / (camY + max(L.y, 0.1));
  vec2 p0 = cam.xz + (L.xz - cam.xz) * t;
  vec2 hacia = L.xz - cam.xz;
  float d = length(hacia);
  vec2 dir = d > 1e-3 ? hacia / d : vec2(0.0, 1.0);
  vec2 lado = vec2(-dir.y, dir.x);
  float dist0 = length(p0 - cam.xz);
  float ancho = aFuente.w * t * 0.9 + 0.04 + dist0 * 0.002;
  float largo = ancho * 1.5 + (L.y + camY) * 0.28 + dist0 * 0.22;
  vec2 xz = p0 + dir * position.y * 2.0 * largo + lado * position.x * 2.0 * ancho;
  float y = alturaDelSueloQ(xz) + 0.01;
  vec4 mvPosition = viewMatrix * vec4(xz.x, y, xz.y, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vQ = position.xy * 2.0;
  vColor = aColor.rgb * mix(1.0, uFarolas, aColor.w) * aVisible * uTarjetas;
  vPosQ = vec3(xz.x, y, xz.y);
  vSueloQ = y;
  vMedidaQ = vec2(ancho, largo);
  #include <fog_vertex>
}
`;

const FRAGMENTO = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uTiempo;
${GLSL_RUIDO}
${GLSL_CHARCOS}
varying vec2 vQ;
varying vec3 vColor;
varying vec3 vPosQ;
varying float vSueloQ;
varying vec2 vMedidaQ;
void main() {
  if (dot(vColor, vColor) < 1e-8) discard;
  float a = vQ.x * vMedidaQ.x;
  float l = vQ.y * vMedidaQ.y;
  float w2 = vMedidaQ.x * vMedidaQ.x;
  float nucleo = exp(-(a * a + l * l * 0.35) / (w2 * 0.45));
  /* La estela: fina de través y larga a lo largo, con la caída más lenta hacia la cámara. */
  float estela = exp(-a * a / (w2 * 0.35)) * exp(-abs(vQ.y) * (vQ.y < 0.0 ? 1.8 : 3.2));
  float ch = vSueloQ > 0.05 ? charcoDeLaAceraQ(vPosQ.xz) : charcoQ(vPosQ.xz);
  float brillo = (nucleo * ch * 0.7 + estela * mix(0.22, 0.1, ch)) * (vSueloQ > 0.05 ? 0.6 : 1.0);
  vec3 V = cameraPosition - vPosQ;
  float cosT = clamp(V.y / length(V), 0.0, 1.0);
  float F = 0.03 + 0.97 * pow(1.0 - cosT, 5.0);
  float temblor = 0.8 + 0.4 * ruidoQ(vPosQ.xz * 2.5 + vec2(uTiempo * 1.7, -uTiempo * 1.3));
  float borde = (1.0 - smoothstep(0.75, 1.0, abs(vQ.x))) * (1.0 - smoothstep(0.8, 1.0, abs(vQ.y)));
  gl_FragColor = vec4(vColor * brillo * F * temblor * borde, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function materialDeLasTarjetas(): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    name: 'quiebro-tarjetas',
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTiempo: UNIFORMES_DE_LA_CIUDAD.uTiempo,
      uHumedad: UNIFORMES_DE_LA_CIUDAD.uHumedad,
      uFarolas: UNIFORMES_DE_LA_CIUDAD.uFarolas,
      uTarjetas: UNIFORMES_DE_LA_LUZ.uTarjetas,
      uAlturas: UNIFORMES_DE_LA_CIUDAD.uAlturas,
      uAlturasCaja: UNIFORMES_DE_LA_CIUDAD.uAlturasCaja,
    },
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
  nieblaEn(m);
  return m;
}

/** Las huellas de lo que tapa, en una rejilla, para la prueba de visibilidad. */
export class RejillaDeHuellas {
  private readonly celda = 12;
  private readonly mapa = new Map<number, CajaXZ[]>();

  constructor(huellas: readonly CajaXZ[]) {
    for (const h of huellas) {
      for (let i = Math.floor(h.x0 / this.celda); i <= Math.floor(h.x1 / this.celda); i++) {
        for (let k = Math.floor(h.z0 / this.celda); k <= Math.floor(h.z1 / this.celda); k++) {
          const clave = this.clave(i, k);
          const lista = this.mapa.get(clave);
          if (lista === undefined) this.mapa.set(clave, [h]);
          else lista.push(h);
        }
      }
    }
  }

  private clave(i: number, k: number): number {
    return (i + 4096) * 8192 + (k + 4096);
  }

  /** ¿Está el punto dentro de alguna huella? */
  dentro(x: number, z: number): boolean {
    const lista = this.mapa.get(this.clave(Math.floor(x / this.celda), Math.floor(z / this.celda)));
    if (lista === undefined) return false;
    for (const h of lista) if (x > h.x0 && x < h.x1 && z > h.z0 && z < h.z1) return true;
    return false;
  }

  /** ¿Se ve en planta el punto B desde A? Muestras cada `paso` m, sin el último metro. */
  seVe(ax: number, az: number, bx: number, bz: number, paso = 2): boolean {
    /* `Math.sqrt` y no `Math.hypot`: ése empaqueta sus argumentos en el montón (ver `visibilidad`). */
    const d = Math.sqrt((bx - ax) * (bx - ax) + (bz - az) * (bz - az));
    const n = Math.floor((d - 0.8) / paso);
    for (let i = 1; i <= n; i++) {
      const f = (i * paso) / d;
      if (this.dentro(ax + (bx - ax) * f, az + (bz - az) * f)) return false;
    }
    return true;
  }

  /**
   * LA VISIBILIDAD DE TODAS LAS FUENTES desde `(ax, az)`, de una vez: en `visibles[i]`, 1 si la fuente `i` está a
   * menos de `alcance` y se ve (`seVe`, con muestras cada 2 m), 0 si no. Devuelve si cambió alguna. Es lo mismo
   * que `seVe` fuente a fuente, pero en UN bucle sin llamadas por fuente ni por muestra: pasar números con
   * decimales de una función a otra que no se funde con ella los empaqueta en el montón, y con cientos de
   * fuentes y decenas de muestras cada seis fotogramas eran 3-10 KiB de basura por fotograma con la cámara
   * QUIETA (revisión de rendimiento del 24-sep). Y sin `Math.hypot`, que también los empaqueta (en Node 20,
   * 32 KiB por llamada con 400 fuentes, contra 0,07 con `Math.sqrt`). El comprobador mira que dé lo mismo que
   * `seVe` y cuenta lo que asigna la ciudad quieta.
   */
  visibilidad(ax: number, az: number, fuentes: readonly FuenteDeReflejo[], alcance: number, visibles: Float32Array): boolean {
    const celda = this.celda;
    const mapa = this.mapa;
    let cambio = false;
    const n = Math.min(fuentes.length, visibles.length);
    for (let i = 0; i < n; i++) {
      const f = fuentes[i] as FuenteDeReflejo;
      const dx = f.x - ax;
      const dz = f.z - az;
      /* Con `Math.hypot` este bucle dejaba 30 KiB por llamada: empaqueta sus dos argumentos en el montón. */
      const d = Math.sqrt(dx * dx + dz * dz);
      let v = d < alcance ? 1 : 0;
      if (v === 1) {
        const muestras = Math.floor((d - 0.8) / 2);
        for (let k = 1; k <= muestras && v === 1; k++) {
          const t = (k * 2) / d;
          const x = ax + dx * t;
          const z = az + dz * t;
          const lista = mapa.get((Math.floor(x / celda) + 4096) * 8192 + (Math.floor(z / celda) + 4096));
          if (lista === undefined) continue;
          for (let h = 0; h < lista.length; h++) {
            const c = lista[h] as CajaXZ;
            if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) {
              v = 0;
              break;
            }
          }
        }
      }
      if (visibles[i] !== v) {
        visibles[i] = v;
        cambio = true;
      }
    }
    return cambio;
  }
}

/** Las listas instanciadas de unas fuentes, con sitio para `n` (lo que sobra, a cero). */
function datosDeLasTarjetas(fuentes: readonly FuenteDeReflejo[], n: number): { aFuente: Float32Array; aColor: Float32Array; aVisible: Float32Array } {
  const aFuente = new Float32Array(Math.max(1, n) * 4);
  const aColor = new Float32Array(Math.max(1, n) * 4);
  const aVisible = new Float32Array(Math.max(1, n));
  fuentes.forEach((f, i) => {
    aFuente.set([f.x, f.y, f.z, f.tamano], i * 4);
    aColor.set([f.color[0], f.color[1], f.color[2], f.farola ? 1 : 0], i * 4);
    aVisible[i] = 1;
  });
  return { aFuente, aColor, aVisible };
}

/** Hasta dónde se miran las fuentes: más lejos, la niebla ya se las ha comido. */
const ALCANCE_DE_LOS_REFLEJOS = 110;

export class TarjetasDeReflejo {
  readonly malla: THREE.InstancedMesh;
  private fuentes: readonly FuenteDeReflejo[];
  private rejilla: RejillaDeHuellas;
  private fotograma = 0;

  /**
   * `capacidad`: cuántas fuentes caben sin cambiar de atributo. El barrio las pone todas de una vez; la
   * ciudad abierta las cambia con la ventana de celdas (`poner`) y pide holgura.
   */
  constructor(fuentes: readonly FuenteDeReflejo[], tapan: readonly CajaXZ[], material: THREE.Material, capacidad = fuentes.length) {
    this.fuentes = fuentes;
    this.rejilla = new RejillaDeHuellas(tapan);
    const plano = new THREE.PlaneGeometry(1, 1);
    const n = Math.max(1, capacidad, fuentes.length);
    const d = datosDeLasTarjetas(fuentes, n);
    plano.setAttribute('aFuente', new THREE.InstancedBufferAttribute(d.aFuente, 4));
    plano.setAttribute('aColor', new THREE.InstancedBufferAttribute(d.aColor, 4));
    const visible = new THREE.InstancedBufferAttribute(d.aVisible, 1);
    visible.setUsage(THREE.DynamicDrawUsage);
    plano.setAttribute('aVisible', visible);
    this.malla = new THREE.InstancedMesh(plano, material, fuentes.length);
    this.malla.name = 'quiebro-tarjetas-de-reflejo';
    /* La posición la calcula el sombreador desde la cámara: la esfera de las instancias no dice nada. */
    this.malla.frustumCulled = false;
    this.malla.renderOrder = 2;
  }

  /** Cambia las fuentes y lo que las tapa (la ventana de celdas se movió). La visibilidad se rehace entera. */
  poner(fuentes: readonly FuenteDeReflejo[], tapan: readonly CajaXZ[], camara: THREE.Vector3): void {
    this.fuentes = fuentes;
    this.rejilla = new RejillaDeHuellas(tapan);
    rellenarInstancias(this.malla, datosDeLasTarjetas(fuentes, fuentes.length), fuentes.length);
    this.actualizar(camara, true);
  }

  private get visible(): THREE.InstancedBufferAttribute {
    return this.malla.geometry.getAttribute('aVisible') as THREE.InstancedBufferAttribute;
  }

  /** Cada pocos fotogramas: apaga las fuentes tapadas o lejanas (sin basura: ver `RejillaDeHuellas.visibilidad`). */
  actualizar(camara: THREE.Vector3, forzar = false): void {
    this.fotograma++;
    if (!forzar && this.fotograma % 6 !== 0) return;
    const datos = this.visible.array as Float32Array;
    const cambio = this.rejilla.visibilidad(camara.x, camara.z, this.fuentes, ALCANCE_DE_LOS_REFLEJOS, datos);
    if (cambio) {
      const v = this.visible;
      v.clearUpdateRanges();
      v.needsUpdate = true;
    }
  }

  get cuantas(): number {
    return this.fuentes.length;
  }
}
