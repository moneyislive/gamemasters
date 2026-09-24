/**
 * LA NIEBLA DE ALTURA VERDE-CIAN: la que da profundidad a la madrugada, en TODOS los materiales.
 *
 * ═══ POR QUÉ DE ALTURA Y NO LA EXPONENCIAL DE three ═══
 *
 * La niebla de three depende sólo de la distancia: a 80 m todo es igual de gris, sea el pie de una
 * fachada o la azotea. En una calle de madrugada la bruma se acuesta en el suelo: los bajos de la
 * manzana de enfrente se pierden y las cornisas de los rascacielos asoman por encima, que es lo que
 * hace que la ciudad tenga escala. Aquí la densidad cae con la altura (ρ(y) = a·e^(−k·(y−y0))) y la
 * profundidad óptica a lo largo del rayo de la cámara al fragmento se integra en forma CERRADA —sin
 * pasos de rayo—, más un término plano muy pequeño para que el horizonte lejano también se apague.
 *
 * ═══ POR QUÉ SE CUELGA DE `fogColor` Y DE LOS TROZOS `fog_*` ═══
 *
 * El color sale del `fogColor` de three, que three ya convierte al espacio de salida que toque
 * (pantalla en sRGB, o lineal cuando el posproceso pinta en un render target). Hacer un uniforme
 * propio obligaría a repetir esa conversión y a equivocarse el día que el frente de imagen cambie
 * de compositor. Y se sustituyen los trozos `fog_*` porque los usan TODOS los materiales de three y
 * todos los `ShaderMaterial` de la casa: es el único punto por el que pasa todo lo que se pinta. La
 * posición de mundo se saca de `mvPosition` con la inversa de la vista (sirve con instancias, con
 * esqueletos y con cualquier `ShaderMaterial` que declare `mvPosition`, que es lo que `fog_vertex`
 * ya exige).
 *
 * ═══ LA NIEBLA NO DEPENDE DEL NIVEL ═══
 *
 * Es visibilidad, y la visibilidad decide la partida: una niebla más cerrada en N0 sería una
 * desventaja del que juega con el teléfono modesto. Los parámetros salen del TIEMPO de la noche
 * (llovizna, aguacero, niebla baja), que es igual en todos los aparatos.
 *
 * ═══ LOS MATERIALES ADITIVOS ═══
 *
 * Un halo o una tarjeta de reflejo que se SUMA a lo de detrás no puede mezclarse hacia el color de
 * la niebla (sumaría bruma encima de bruma y brillaría en la lejanía): se apaga hacia negro. El
 * parcheo lo decide solo mirando `blending`.
 */
import * as THREE from 'three';
import type { Retoque } from './parcheo';
import { llevaElRetoque, materialesDe, parchear } from './parcheo';

/** El tiempo de la noche, como lo declara el barrio. */
export type TiempoDeLaNoche = 'llovizna' | 'aguacero' | 'niebla';

/** Los números de la niebla para un tiempo. En metros. */
export interface ParametrosDeLaNiebla {
  /** Densidad a la altura base (1/m). */
  readonly densidad: number;
  /** Cuánto cae la densidad por metro de altura. */
  readonly caida: number;
  /** Altura a la que la densidad vale `densidad`. */
  readonly alturaBase: number;
  /** Densidad plana, sin altura: apaga el horizonte lejano. */
  readonly lejana: number;
  /** El color de la niebla, en sRGB (lo que se ve). */
  readonly color: string;
  /** Cuánto se oscurece la niebla al mirar hacia arriba (factor por canal). */
  readonly haciaArriba: readonly [number, number, number];
}

/**
 * Los tres tiempos. La llovizna deja ver la manzana de enfrente entera; el aguacero la vela a media
 * altura; la niebla baja se come los bajos a 60 m y deja las torres.
 */
export const NIEBLA_DEL_TIEMPO: Readonly<Record<TiempoDeLaNoche, ParametrosDeLaNiebla>> = {
  llovizna: {
    densidad: 0.015,
    caida: 0.045,
    alturaBase: 0,
    lejana: 0.0014,
    color: '#223a35',
    haciaArriba: [0.6, 0.7, 0.72],
  },
  aguacero: {
    densidad: 0.02,
    caida: 0.038,
    alturaBase: 0,
    lejana: 0.0019,
    color: '#243c37',
    haciaArriba: [0.58, 0.68, 0.7],
  },
  niebla: {
    densidad: 0.03,
    caida: 0.06,
    alturaBase: 0,
    lejana: 0.0016,
    color: '#2b423c',
    haciaArriba: [0.55, 0.66, 0.68],
  },
};

/** Los uniformes de la niebla, compartidos por TODOS los materiales parcheados. */
export const UNIFORMES_DE_LA_NIEBLA = {
  /** x densidad, y caída, z altura base, w densidad lejana. */
  uNiebla: { value: new THREE.Vector4(0.0105, 0.05, 0, 0.0011) },
  /** rgb: factor hacia arriba. */
  uNieblaArriba: { value: new THREE.Vector3(0.62, 0.72, 0.74) },
};

/** Pone los números de un tiempo en los uniformes y en la niebla de la escena. */
export function ponerLaNiebla(escena: THREE.Scene, tiempo: TiempoDeLaNoche): void {
  const p = NIEBLA_DEL_TIEMPO[tiempo];
  UNIFORMES_DE_LA_NIEBLA.uNiebla.value.set(p.densidad, p.caida, p.alturaBase, p.lejana);
  UNIFORMES_DE_LA_NIEBLA.uNieblaArriba.value.set(p.haciaArriba[0], p.haciaArriba[1], p.haciaArriba[2]);
  /*
   * three sólo define `USE_FOG` si la escena tiene niebla: el objeto `Fog` está para eso y para
   * llevar el color. Sus `near`/`far` no los lee nadie (el trozo se sustituye), pero se dejan con
   * números razonables para el material que se pinte un fotograma antes de estar parcheado.
   */
  const color = new THREE.Color(p.color);
  if (escena.fog instanceof THREE.Fog) {
    escena.fog.color.copy(color);
  } else {
    escena.fog = new THREE.Fog(color, 30, 420);
  }
}

/** La función de la niebla, en GLSL. Compartida por el retoque y por quien la quiera fuera. */
export const GLSL_DE_LA_NIEBLA = /* glsl */ `
float factorDeNieblaQ(float camY, float dirY, float L) {
  float a = uNiebla.x * exp(-uNiebla.y * (camY - uNiebla.z));
  float kdy = clamp(uNiebla.y * dirY * L, -40.0, 40.0);
  float integral = abs(kdy) > 1e-3 ? (1.0 - exp(-kdy)) / kdy : 1.0 - 0.5 * kdy;
  float tau = a * L * integral + uNiebla.w * L;
  return 1.0 - exp(-max(tau, 0.0));
}
vec3 colorDeNieblaQ(vec3 dir) {
  return fogColor * mix(vec3(1.0), uNieblaArriba, smoothstep(0.0, 0.45, dir.y));
}
`;

/** El retoque de la niebla de altura. Ver la cabecera. */
export function retoqueDeLaNiebla(aditivo: boolean): Retoque {
  return {
    nombre: aditivo ? 'niebla-de-altura-aditiva' : 'niebla-de-altura',
    orden: 100,
    uniformes: UNIFORMES_DE_LA_NIEBLA,
    vertice: [
      {
        buscar: '#include <fog_pars_vertex>',
        como: 'en-lugar',
        texto: '#ifdef USE_FOG\n varying vec3 vNieblaMundoQ;\n#endif',
      },
      {
        buscar: '#include <fog_vertex>',
        como: 'en-lugar',
        texto:
          '#ifdef USE_FOG\n vNieblaMundoQ = transpose(mat3(viewMatrix)) * (mvPosition.xyz - viewMatrix[3].xyz);\n#endif',
      },
    ],
    fragmento: [
      {
        buscar: '#include <fog_pars_fragment>',
        como: 'en-lugar',
        texto: `#ifdef USE_FOG
 uniform vec3 fogColor;
 uniform vec4 uNiebla;
 uniform vec3 uNieblaArriba;
 varying vec3 vNieblaMundoQ;
 ${GLSL_DE_LA_NIEBLA}
#endif`,
      },
      {
        buscar: '#include <fog_fragment>',
        como: 'en-lugar',
        texto: `#ifdef USE_FOG
 {
  vec3 rayoQ = vNieblaMundoQ - cameraPosition;
  float largoQ = length(rayoQ);
  vec3 dirQ = rayoQ / max(largoQ, 1e-4);
  float fQ = factorDeNieblaQ(cameraPosition.y, dirQ.y, largoQ);
  ${aditivo ? 'gl_FragColor.rgb *= 1.0 - fQ;' : 'gl_FragColor.rgb = mix(gl_FragColor.rgb, colorDeNieblaQ(dirQ), fQ);'}
 }
#endif`,
      },
    ],
  };
}

/** ¿Suma este material a lo de detrás? */
function esAditivo(material: THREE.Material): boolean {
  return material.blending === THREE.AdditiveBlending;
}

/** Pone la niebla de altura en un material, si la usa. Idempotente. */
export function nieblaEn(material: THREE.Material): void {
  const conNiebla = material as THREE.Material & { fog?: boolean };
  if (conNiebla.fog !== true) return;
  if (material.userData.sinNieblaDeAltura === true) return;
  const aditivo = esAditivo(material);
  if (llevaElRetoque(material, aditivo ? 'niebla-de-altura-aditiva' : 'niebla-de-altura')) return;
  parchear(material, retoqueDeLaNiebla(aditivo));
}

/**
 * RECORRE LA ESCENA y pone la niebla a lo que no la lleve: los personajes, los efectos, lo que
 * monte cualquier otro frente. Se llama al montar y después cada medio segundo (ver `Atmosfera`):
 * un material nuevo se pinta, como mucho, medio segundo con la niebla de fábrica de three (lineal,
 * del mismo color), que no se distingue a esa distancia. Quien quiera evitar hasta eso llama a
 * `nieblaEn(material)` al crearlo.
 */
export function nieblaEnLaEscena(escena: THREE.Object3D): number {
  let parcheados = 0;
  escena.traverse((o) => {
    for (const m of materialesDe(o)) {
      const antes = m.version;
      nieblaEn(m);
      if (m.version !== antes) parcheados++;
    }
  });
  return parcheados;
}
