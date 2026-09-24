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
 * (llovizna, aguacero, niebla baja) y de la LUZ (madrugada o alba), que son iguales en todos los
 * aparatos de una noche. La luz cambia cuánta bruma hay y DÓNDE EMPIEZA (16 m de madrugada, 28 al
 * alba, ver `paleta.ts`): de una noche a otra la visibilidad cambia, en una misma noche es la misma
 * para todos. Los contornos de los cuerpos van encima de la niebla (`personajes/material.ts`), así
 * que a quién se ve a 60 m no depende de ella.
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
import type { LuzDelBarrio } from './luz-del-barrio';
import { PALETAS } from './paleta';

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
    color: '#294339',
    haciaArriba: [0.6, 0.7, 0.72],
  },
  aguacero: {
    densidad: 0.02,
    caida: 0.038,
    alturaBase: 0,
    lejana: 0.0019,
    color: '#2a443d',
    haciaArriba: [0.58, 0.68, 0.7],
  },
  niebla: {
    densidad: 0.03,
    caida: 0.06,
    alturaBase: 0,
    lejana: 0.0016,
    color: '#314b43',
    haciaArriba: [0.55, 0.66, 0.68],
  },
};

/** Los uniformes de la niebla, compartidos por TODOS los materiales parcheados. */
export const UNIFORMES_DE_LA_NIEBLA = {
  /** x densidad, y caída, z altura base, w densidad lejana. */
  uNiebla: { value: new THREE.Vector4(0.0105, 0.05, 0, 0.0011) },
  /**
   * LA CAPA ALTA: x densidad, y caída, z altura base. Tenue y alta: no quita visibilidad en la calle
   * (a 60 m a ras de suelo suma menos de un 10 %) y es la que pone en silueta las torres del fondo y
   * separa los planos de la vista aérea, que es donde la niebla de una sola capa se veía como un velo
   * plano. Las dos capas se integran en forma cerrada, igual que la baja.
   *
   * Y w: la distancia a la que EMPIEZA la bruma (las dos capas y la lejana). El rayo se integra desde
   * ese punto, en la misma forma cerrada: lo de cerca queda limpio y con sus negros, y la bruma sigue
   * siendo continua (a esa distancia vale cero y crece desde ahí, sin escalón).
   */
  uNieblaAlta: { value: new THREE.Vector4(0.0016, 0.012, 0, 0) },
  /** rgb: factor hacia arriba. */
  uNieblaArriba: { value: new THREE.Vector3(0.62, 0.72, 0.74) },
};

/**
 * Pone los números de un tiempo y una luz en los uniformes y en la niebla de la escena. La luz cambia
 * el COLOR y las capas (el alba es más lechosa y más alta); la visibilidad a ras de calle la sigue
 * mandando el tiempo, que es igual en todos los aparatos.
 */
export function ponerLaNiebla(escena: THREE.Scene, tiempo: TiempoDeLaNoche, luz: LuzDelBarrio = 'madrugada'): void {
  const t = NIEBLA_DEL_TIEMPO[tiempo];
  const deLaLuz = PALETAS[luz].niebla;
  const p: ParametrosDeLaNiebla = {
    ...t,
    densidad: t.densidad * deLaLuz.densidad,
    lejana: t.lejana * deLaLuz.lejana,
    color: luz === 'madrugada' ? t.color : deLaLuz.color,
    haciaArriba: luz === 'madrugada' ? t.haciaArriba : deLaLuz.haciaArriba,
  };
  UNIFORMES_DE_LA_NIEBLA.uNiebla.value.set(p.densidad, p.caida, p.alturaBase, p.lejana);
  UNIFORMES_DE_LA_NIEBLA.uNieblaAlta.value.set(deLaLuz.alta.densidad, deLaLuz.alta.caida, 0, deLaLuz.inicio);
  UNIFORMES_DE_LA_NIEBLA.uNieblaArriba.value.set(p.haciaArriba[0], p.haciaArriba[1], p.haciaArriba[2]);
  /*
   * three sólo define `USE_FOG` si la escena tiene niebla: el objeto `Fog` está para eso y para
   * llevar el color. Sus `near`/`far` sólo los leen el material que se pinte un fotograma antes de
   * estar parcheado y los que no se pueden parchear (los efectos que calculan su propia profundidad
   * de niebla, ver `sePuedeParchear`): por eso son números razonables.
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
float capaDeNieblaQ(vec4 c, float camY, float dirY, float L) {
  float a = c.x * exp(-c.y * (camY - c.z));
  float kdy = clamp(c.y * dirY * L, -40.0, 40.0);
  float integral = abs(kdy) > 1e-3 ? (1.0 - exp(-kdy)) / kdy : 1.0 - 0.5 * kdy;
  return a * L * integral;
}
float factorDeNieblaQ(float camY, float dirY, float L) {
  /* La bruma empieza a uNieblaAlta.w metros: se integra desde ese punto del rayo. */
  float s0 = min(uNieblaAlta.w, L);
  float y0 = camY + dirY * s0;
  float L0 = L - s0;
  float tau = capaDeNieblaQ(uNiebla, y0, dirY, L0) + capaDeNieblaQ(uNieblaAlta, y0, dirY, L0) + uNiebla.w * L0;
  return 1.0 - exp(-max(tau, 0.0));
}
vec3 colorDeNieblaQ(vec3 dir) {
  return fogColor * mix(vec3(1.0), uNieblaArriba, smoothstep(0.0, 0.45, dir.y));
}
`;

/*
 * ═══ LA MEZCLA, IGUAL EN PANTALLA QUE EN LINEAL ═══
 *
 * En N0-N1 cada material se pinta al lienzo con su mapeo tonal dentro (`TONE_MAPPING` definido) y la
 * niebla se mezcla sobre el color de PANTALLA. En N2-N3 se pinta a un blanco lineal (three quita el
 * mapeo tonal: no hay `TONE_MAPPING`) y la niebla se mezclaba sobre el color LINEAL, que pesa mucho
 * más el color claro de la bruma: con el mismo factor, lo que en N0 era un 40 % de bruma en N3 parecía
 * un 70 %. La vista aérea del alba no bajaba de 56 sobre 255 en N3 y bajaba a 27 en N0; y, peor, en N3
 * se veía MENOS lejos que en N0, que es justo lo que la niebla no puede hacer (ver la cabecera). En el
 * blanco lineal se mezcla en raíz cuadrada (la curva de pantalla, aproximada), y la bruma se ve igual
 * en los cuatro niveles. En lo aditivo, el apagado se eleva al cuadrado por lo mismo.
 */
const MEZCLA_OPACA = /* glsl */ `
#ifdef TONE_MAPPING
  gl_FragColor.rgb = mix(gl_FragColor.rgb, colorDeNieblaQ(dirQ), fQ);
#else
  {
    vec3 raizQ = mix(sqrt(max(gl_FragColor.rgb, vec3(0.0))), sqrt(max(colorDeNieblaQ(dirQ), vec3(0.0))), fQ);
    gl_FragColor.rgb = raizQ * raizQ;
  }
#endif`;

const MEZCLA_ADITIVA = /* glsl */ `
#ifdef TONE_MAPPING
  gl_FragColor.rgb *= 1.0 - fQ;
#else
  gl_FragColor.rgb *= (1.0 - fQ) * (1.0 - fQ);
#endif`;

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
 uniform vec4 uNieblaAlta;
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
  ${aditivo ? MEZCLA_ADITIVA : MEZCLA_OPACA}
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

/**
 * ¿Se puede parchear este material? Un `ShaderMaterial` que declara la niebla de three
 * (`fog_pars_vertex`) pero calcula él mismo su profundidad (`vFogDepth = …`) en vez de incluir
 * `fog_vertex` NO: el retoque sustituye la declaración y su línea deja de compilar. Así estaban las
 * chispas y los trazos de los efectos: el programa no compilaba (`'vFogDepth' : undeclared identifier`)
 * y no se pintaban nunca, sin más aviso que un error en la consola. Esos se quedan con la niebla de
 * fábrica de three (lineal, del mismo color), que es lo que su propio sombreador espera.
 */
function sePuedeParchear(material: THREE.Material): boolean {
  if (!(material instanceof THREE.ShaderMaterial)) return true;
  return material.vertexShader.includes('#include <fog_vertex>');
}

/** Pone la niebla de altura en un material, si la usa. Idempotente. */
export function nieblaEn(material: THREE.Material): void {
  const conNiebla = material as THREE.Material & { fog?: boolean };
  if (conNiebla.fog !== true) return;
  if (material.userData.sinNieblaDeAltura === true) return;
  if (!sePuedeParchear(material)) {
    material.userData.sinNieblaDeAltura = true;
    return;
  }
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
