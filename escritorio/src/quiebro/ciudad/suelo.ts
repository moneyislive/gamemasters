/**
 * EL SUELO: la calzada de asfalto mojado y las «islas» de acera, bordillo y plaza.
 *
 * ═══ ISLAS Y CALZADA, SIN NADA SUPERPUESTO ═══
 *
 * Cada manzana, con sus aceras alrededor, es una ISLA levantada 15 cm (el bordillo): una losa con su
 * canto. La calzada es lo que queda entre islas, a cota 0. Así no hay dos superficies en el mismo
 * plano —ni cruces que se pisan con calles, ni aceras que se pisan con la plaza— y no puede haber
 * parpadeo de profundidad en ninguna esquina. La calzada se trocea por las líneas de las islas en
 * rectángulos que son, cada uno, un TRAMO de calle entre dos cruces o un cruce: el tramo lleva su
 * dirección y sus extremos en un atributo, y el sombreador pinta con eso la línea discontinua, los
 * pasos de cebra en las dos bocas y el bordillo mojado, sin una sola calcomanía (que a 80 m, a 1 cm
 * del asfalto, parpadearía).
 *
 * ═══ EL ASFALTO MOJADO ═══
 *
 * Albedo del asfalto seco ×0,5 por mojado y ×0,3 en los charcos; los charcos salen de `charcoQ`
 * (ruido de mundo) más la cuneta junto al bordillo, con F0 = 0,02 (agua) y rugosidad casi 0, y con
 * las ondas de las gotas desde N1. El reflejo de las luces lo ponen las TARJETAS (`reflejos.ts`),
 * que leen la misma máscara; el del cielo y del «cañón de la calle», el retoque `entorno`.
 */
import * as THREE from 'three';
import type { Retoque } from '../atmosfera/parcheo';
import { parchear } from '../atmosfera/parcheo';
import { nieblaEn } from '../atmosfera/niebla';
import { Molde } from './geometria';
import { GLSL_CHARCOS, GLSL_ONDAS, RETOQUE_ENTORNO, RETOQUE_MUNDO, RETOQUE_SOLO_BRILLO, UNIFORMES_DE_LA_CIUDAD } from './retoques';
import type { CajaXZ, CalleDelPlano, NivelDeLaCiudad } from './tipos';
import { ALTURA_DE_LA_ACERA, DETALLE_DEL_NIVEL } from './tipos';

/** Lo que es cada trozo de calzada, en `aTramo.x`. */
const TRAMO = { cruce: 0, correX: 1, correZ: 2, lejos: 3 } as const;
/** Lo que es cada cara de una isla, en `aIsla`… ver `ATRIBUTOS_DE_LAS_ISLAS`. */
const SUELO = { acera: 0, plaza: 1, patio: 2 } as const;

/* ═══════════════════════════════ LA CALZADA ═══════════════════════════════ */

/** La oclusión horneada del suelo (`mapaDeOclusion`), leída con la caja del mapa de alturas. */
const GLSL_OCLUSION_DEL_SUELO = /* glsl */ `
uniform sampler2D uOclusionSuelo;
uniform vec4 uOclusionCaja;
float oclusionDelSueloQ(vec2 xz) {
  vec2 uvO = (xz - uOclusionCaja.xy) * uOclusionCaja.zw;
  if (uvO.x < 0.0 || uvO.y < 0.0 || uvO.x > 1.0 || uvO.y > 1.0) return 1.0;
  return texture(uOclusionSuelo, uvO).r;
}
`;

const DECLARACIONES_DEL_ASFALTO = /* glsl */ `
varying vec4 vTramoQ;
varying vec4 vCalleQ;
${GLSL_OCLUSION_DEL_SUELO}
${GLSL_CHARCOS}
${GLSL_ONDAS}
float rayaQ(float x, float medio, float px) {
  return 1.0 - smoothstep(medio, medio + px, abs(x));
}
`;

const CUERPO_DEL_ASFALTO = /* glsl */ `
float charcoFinal = 0.0;
{
  vec3 P = vPosMundoQ;
  float tipo = vTramoQ.x;
  vec2 px2 = max(fwidth(P.xz), vec2(1e-4));
  float px = max(px2.x, px2.y);
  /* s a lo largo de la calle, t de través desde el eje. */
  float s = tipo > 1.5 ? P.z : P.x;
  float t = (tipo > 1.5 ? P.x : P.z) - vTramoQ.y;
  float medioAncho = vCalleQ.x * 0.5;
  bool esTramo = tipo > 0.5 && tipo < 2.5;

  /* En N0 el grano y los parches salen de un ruido de una octava: es el sombreador que más píxeles
     pinta, y en un teléfono modesto cada octava cuenta. */
  #if NIVEL_Q >= 1
  float grano = fbmQ(P.xz * 2.7);
  float parche = smoothstep(0.55, 0.62, fbmQ(P.xz * 0.09 + 5.0));
  #else
  float grano = ruidoQ(P.xz * 2.7);
  float parche = smoothstep(0.6, 0.7, ruidoQ(P.xz * 0.09 + 5.0));
  #endif
  vec3 seco = vec3(0.11, 0.11, 0.115) * (0.75 + 0.45 * grano) * mix(1.0, 0.7, parche);

  /* Charcos: los del ruido y la cuneta junto al bordillo; el lomo de la calle queda más seco. */
  float ch = charcoQ(P.xz);
  float rodada = 0.0;
  if (esTramo) {
    /* La cuneta: una lámina de agua pegada al bordillo, de orilla nítida y ancho que va y viene. */
    float anchoCuneta = 0.25 + 0.45 * fbmQ(vec2(s * 0.21, 3.0));
    float cuneta = step(medioAncho - anchoCuneta, abs(t)) * smoothstep(0.38, 0.46, fbmQ(vec2(s * 0.3, t * 0.5)));
    ch = max(ch * (0.55 + 0.45 * smoothstep(0.4, 2.2, abs(t))), cuneta);
    /* Las rodadas: donde pisan las ruedas el firme está gastado y liso, y brilla más (sin charco). */
    float carril = abs(abs(t) - medioAncho * 0.5);
    rodada = (1.0 - smoothstep(0.55, 0.95, abs(carril - 0.75) + 0.6)) * (0.6 + 0.4 * fbmQ(vec2(s * 0.15, t)));
  }
  charcoFinal = ch;

  /* La pintura: línea discontinua en el eje, pasos de cebra en las bocas del tramo. */
  float pintura = 0.0;
  if (esTramo) {
    float largo = vTramoQ.w - vTramoQ.z;
    float desdeA = s - vTramoQ.z;
    float desdeB = vTramoQ.w - s;
    float bocas = min(desdeA, desdeB);
    float eje = rayaQ(t, 0.06, px) * step(0.5, fract(s / 6.0)) * step(7.0, bocas);
    float cebra = rayaQ(fract((t + 0.25) / 1.0) - 0.5, 0.25, px) * step(abs(t), medioAncho - 0.35)
      * step(1.0, bocas) * step(bocas, 4.2) * step(10.0, largo);
    float stop = rayaQ(bocas - 4.9, 0.2, px) * step(0.0, t * sign(desdeA - desdeB)) * step(abs(t), medioAncho - 0.3) * step(10.0, largo);
    pintura = max(max(eje, cebra), stop);
    /* Gastada: se come a trozos. */
    pintura *= 0.55 + 0.45 * smoothstep(0.3, 0.6, fbmQ(P.xz * 1.9 + 3.0));
  }
  vec3 blanco = vec3(0.55, 0.55, 0.52);

  float mojado = 0.5;
  vec3 alb = mix(seco * mojado, seco * 0.3, ch);
  alb = mix(alb, blanco * mix(0.75, 0.55, ch), pintura);
  float rug = mix(0.34 + 0.18 * grano, 0.025, ch);
  rug = mix(rug, 0.2, rodada * (1.0 - ch));
  rug = mix(rug, mix(0.35, 0.03, ch), pintura);
  /* El pie de las fachadas, el hueco bajo los coches aparcados: la oclusión horneada. */
  alb *= oclusionDelSueloQ(P.xz);

  vec3 nW = vec3(0.0, 1.0, 0.0);
  #if NIVEL_Q >= 1
  /* Las ondas, sólo dentro del charco y sólo cerca: a más de 8-12 m un anillo de 15 cm es ruido. */
  float cerca = 1.0 - smoothstep(8.0, 12.0, length(cameraPosition - P));
  if (ch > 0.01 && cerca > 0.0) {
    vec2 g = ondasQ(P.xz, uTiempo) * ch * cerca;
    nW = normalize(vec3(-g.x, 1.0, -g.y));
  }
  #endif
  #if NIVEL_Q >= 1
  /* Un poco de relieve en el asfalto seco, sólo cerca (lejos es ruido que tiembla). */
  float relieve = (1.0 - ch) * (1.0 - smoothstep(0.01, 0.04, px));
  nW = normalize(nW + vec3(grano - 0.5, 0.0, fbmQ(P.zx * 2.7) - 0.5) * 0.25 * relieve);
  #endif

  diffuseColor.rgb = alb;
  roughnessFactor = rug;
  metalnessFactor = 0.0;
  normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
}
`;

function retoqueDelAsfalto(nivel: NivelDeLaCiudad): Retoque {
  return {
    nombre: `asfalto-n${nivel}`,
    orden: 10,
    uniformes: {
      uHumedad: UNIFORMES_DE_LA_CIUDAD.uHumedad,
      uOclusionSuelo: UNIFORMES_DE_LA_CIUDAD.uOclusionSuelo,
      uOclusionCaja: UNIFORMES_DE_LA_CIUDAD.uOclusionCaja,
    },
    defines: { NIVEL_Q: String(DETALLE_DEL_NIVEL[nivel].ondas ? 1 : 0) },
    vertice: [
      {
        buscar: '#include <common>',
        como: 'despues',
        texto: 'attribute vec4 aTramo;\nattribute vec4 aCalle;\nvarying vec4 vTramoQ;\nvarying vec4 vCalleQ;',
      },
      { buscar: '#include <uv_vertex>', como: 'despues', texto: 'vTramoQ = aTramo;\nvCalleQ = aCalle;' },
    ],
    fragmento: [
      { buscar: '#include <lights_pars_begin>', como: 'antes', texto: DECLARACIONES_DEL_ASFALTO },
      { buscar: '#include <normal_fragment_maps>', como: 'despues', texto: CUERPO_DEL_ASFALTO },
      /* El agua tiene F0 = 0,02, no el 0,04 de fábrica de `MeshStandardMaterial`. */
      {
        buscar: '#include <lights_physical_fragment>',
        como: 'despues',
        texto: 'material.specularColor = mix(material.specularColor, vec3(0.02), charcoFinal);',
      },
    ],
  };
}

export function materialDelAsfalto(nivel: NivelDeLaCiudad): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0 });
  m.name = 'quiebro-asfalto';
  parchear(m, RETOQUE_MUNDO, RETOQUE_ENTORNO, RETOQUE_SOLO_BRILLO, retoqueDelAsfalto(nivel));
  nieblaEn(m);
  return m;
}

/* ═══════════════════════════════ LAS ISLAS ═══════════════════════════════ */

const DECLARACIONES_DE_LA_ACERA = /* glsl */ `
varying vec4 vIslaQ;
varying float vSueloQ;
${GLSL_OCLUSION_DEL_SUELO}
${GLSL_CHARCOS}
`;

const CUERPO_DE_LA_ACERA = /* glsl */ `
float charcoFinal = 0.0;
{
  vec3 P = vPosMundoQ;
  vec3 Ng = normalize(vNorMundoQ);
  vec2 px2 = max(fwidth(P.xz), vec2(1e-4));
  float px = max(px2.x, px2.y);
  float dx = min(P.x - vIslaQ.x, vIslaQ.z - P.x);
  float dz = min(P.z - vIslaQ.y, vIslaQ.w - P.z);
  float borde = min(dx, dz);
  float tipo = vSueloQ;
  vec3 alb;
  float rug;
  vec3 nW = Ng;
  /* El agua que se queda en las juntas (de la baldosa y del adoquín): más oscura y más lisa. */
  float enJunta = 0.0;
  if (Ng.y < 0.5 || borde < 0.3) {
    /* El bordillo: granito claro, con las juntas cada metro a lo largo del canto. */
    bool alLargoDeZ = Ng.y > 0.5 ? dx < dz : abs(Ng.x) > 0.5;
    float largo = alLargoDeZ ? P.z : P.x;
    float junta = 1.0 - smoothstep(0.006, 0.006 + px, abs(fract(largo + 0.5) - 0.5));
    alb = vec3(0.30, 0.29, 0.28) * (0.85 + 0.3 * fbmQ(P.xz * 3.0 + P.y)) * (1.0 - 0.4 * junta) * 0.7;
    rug = 0.45;
  } else if (tipo < 0.5) {
    /* Baldosa de tacos de 20 cm: nueve pastillas en relieve por pieza. */
    vec2 q = P.xz / 0.2;
    vec2 f = fract(q);
    float junta = max(1.0 - smoothstep(0.02, 0.02 + px * 5.0, min(f.x, 1.0 - f.x)), 1.0 - smoothstep(0.02, 0.02 + px * 5.0, min(f.y, 1.0 - f.y)));
    vec2 t3 = fract(f * 3.0) - 0.5;
    float taco = 1.0 - smoothstep(0.28, 0.34, length(t3));
    float cerca = 1.0 - smoothstep(0.006, 0.02, px);
    float pieza = hashQ(floor(q), 21.0);
    alb = vec3(0.26, 0.25, 0.235) * (0.85 + 0.25 * pieza) * (1.0 - 0.45 * junta);
    rug = 0.55;
    enJunta = junta * cerca;
    vec2 gt = t3 * taco * cerca * 1.2;
    nW = normalize(vec3(gt.x, 1.0, gt.y));
  } else if (tipo < 1.5) {
    /* La plaza: adoquín de granito de 0,6 × 0,4 m a matajuntas, gris frío, gastado. */
    float fila = floor(P.z / 0.4);
    float x = P.x + mod(fila, 2.0) * 0.3;
    float cerca = 1.0 - smoothstep(0.01, 0.04, px);
    float junta = max(1.0 - smoothstep(0.006, 0.006 + px, abs(fract(P.z / 0.4 + 0.5) - 0.5) * 0.4),
                      1.0 - smoothstep(0.006, 0.006 + px, abs(fract(x / 0.6 + 0.5) - 0.5) * 0.6)) * cerca;
    float pieza = hashQ(vec2(floor(x / 0.6), fila), 23.0);
    alb = vec3(0.17, 0.165, 0.16) * (0.75 + 0.4 * pieza * cerca + 0.2 * (1.0 - cerca)) * (1.0 - 0.35 * junta);
    alb *= 0.8 + 0.4 * fbmQ(P.xz * 0.3);
    rug = 0.5;
    enJunta = junta;
  } else {
    /* El patio de manzana: cemento viejo. */
    alb = vec3(0.12, 0.12, 0.115) * (0.7 + 0.6 * fbmQ(P.xz * 0.5));
    rug = 0.8;
  }
  /* Mojado: más oscuro, más liso, y charcos pequeños en los hundimientos. */
  float ch = Ng.y > 0.5 ? charcoDeLaAceraQ(P.xz) : 0.0;
  charcoFinal = ch;
  alb *= mix(0.62, 0.35, ch);
  /* Mojada, pero la piedra no es un espejo fuera del charco: con la rugosidad a dos tercios, al alba la
     plaza entera reflejaba el cielo claro y era la parte más luminosa de la imagen. */
  rug = mix(rug * 0.8, 0.03, ch);
  rug = mix(rug, 0.08, enJunta * 0.7);
  alb *= 1.0 - 0.25 * enJunta;
  alb *= oclusionDelSueloQ(P.xz);
  nW = normalize(mix(nW, Ng, ch));
  diffuseColor.rgb = alb;
  roughnessFactor = rug;
  metalnessFactor = 0.0;
  normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
}
`;

const RETOQUE_DE_LA_ACERA: Retoque = {
  nombre: 'acera',
  orden: 10,
  uniformes: {
    uHumedad: UNIFORMES_DE_LA_CIUDAD.uHumedad,
    uOclusionSuelo: UNIFORMES_DE_LA_CIUDAD.uOclusionSuelo,
    uOclusionCaja: UNIFORMES_DE_LA_CIUDAD.uOclusionCaja,
  },
  vertice: [
    {
      buscar: '#include <common>',
      como: 'despues',
      texto: 'attribute vec4 aIsla;\nattribute float aSuelo;\nvarying vec4 vIslaQ;\nvarying float vSueloQ;',
    },
    { buscar: '#include <uv_vertex>', como: 'despues', texto: 'vIslaQ = aIsla;\nvSueloQ = aSuelo;' },
  ],
  fragmento: [
    { buscar: '#include <lights_pars_begin>', como: 'antes', texto: DECLARACIONES_DE_LA_ACERA },
    { buscar: '#include <normal_fragment_maps>', como: 'despues', texto: CUERPO_DE_LA_ACERA },
    {
      buscar: '#include <lights_physical_fragment>',
      como: 'despues',
      texto: 'material.specularColor = mix(material.specularColor, vec3(0.02), charcoFinal);',
    },
  ],
};

/** El material de la acera y la plaza de un nivel (el nivel no cambia nada todavía: lo usará la materia). */
export function materialDeLaAcera(_nivel: NivelDeLaCiudad): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0 });
  m.name = 'quiebro-acera';
  parchear(m, RETOQUE_MUNDO, RETOQUE_ENTORNO, RETOQUE_SOLO_BRILLO, RETOQUE_DE_LA_ACERA);
  nieblaEn(m);
  return m;
}

/* ═══════════════════════════════ LA GEOMETRÍA ═══════════════════════════════ */

export interface IslaDelSuelo {
  readonly caja: CajaXZ;
  readonly tipo: 'acera' | 'plaza';
  /** La manzana de dentro (el patio queda entre la acera y ella). */
  readonly manzana: CajaXZ;
}

export interface SueloConstruido {
  readonly asfalto: THREE.BufferGeometry;
  readonly islas: THREE.BufferGeometry;
}

/** Los ejes de todas las calles en x y en z, con su calzada. */
function tipoDelTrozo(cx: number, cz: number, calles: readonly CalleDelPlano[]): { tipo: number; calle: CalleDelPlano | null } {
  const enX = calles.find((c) => c.corre === 'x' && Math.abs(cz - c.en) < c.calzada / 2 + 0.01 && cx >= c.desde && cx <= c.hasta);
  const enZ = calles.find((c) => c.corre === 'z' && Math.abs(cx - c.en) < c.calzada / 2 + 0.01 && cz >= c.desde && cz <= c.hasta);
  if (enX !== undefined && enZ !== undefined) return { tipo: TRAMO.cruce, calle: enX };
  if (enX !== undefined) return { tipo: TRAMO.correX, calle: enX };
  if (enZ !== undefined) return { tipo: TRAMO.correZ, calle: enZ };
  return { tipo: TRAMO.lejos, calle: null };
}

/**
 * CONSTRUYE EL SUELO. `islas`: las manzanas con sus aceras. `calles`: todas (barrio y anillo).
 * `extension`: hasta dónde llega la calzada (más allá, el horizonte lo pone el anillo).
 */
export function construirElSuelo(islas: readonly IslaDelSuelo[], calles: readonly CalleDelPlano[], extension: CajaXZ): SueloConstruido {
  /* ─── La calzada: la rejilla de las líneas de las islas, menos las islas. ─── */
  const xs = new Set<number>([extension.x0, extension.x1]);
  const zs = new Set<number>([extension.z0, extension.z1]);
  for (const i of islas) {
    xs.add(i.caja.x0);
    xs.add(i.caja.x1);
    zs.add(i.caja.z0);
    zs.add(i.caja.z1);
  }
  const X = [...xs].filter((x) => x >= extension.x0 && x <= extension.x1).sort((a, b) => a - b);
  const Z = [...zs].filter((z) => z >= extension.z0 && z <= extension.z1).sort((a, b) => a - b);
  const asfalto = new Molde({ aTramo: 4, aCalle: 4 });
  for (let i = 0; i < X.length - 1; i++) {
    for (let k = 0; k < Z.length - 1; k++) {
      const x0 = X[i] as number;
      const x1 = X[i + 1] as number;
      const z0 = Z[k] as number;
      const z1 = Z[k + 1] as number;
      if (x1 - x0 < 1e-3 || z1 - z0 < 1e-3) continue;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      if (islas.some((s) => cx > s.caja.x0 && cx < s.caja.x1 && cz > s.caja.z0 && cz < s.caja.z1)) continue;
      const { tipo, calle } = tipoDelTrozo(cx, cz, calles);
      const eje = calle?.en ?? 0;
      const [desde, hasta] = tipo === TRAMO.correX ? [x0, x1] : tipo === TRAMO.correZ ? [z0, z1] : [0, 0];
      asfalto.poner('aTramo', tipo, eje, desde, hasta);
      asfalto.poner('aCalle', calle?.calzada ?? 6, calle?.acera ?? 3, 0, 0);
      asfalto.losa(x0, z0, x1, z1, 0, true);
    }
  }

  /* ─── Las islas: losa arriba, canto de bordillo y, dentro, el patio más bajo no hace falta. ─── */
  const suelo = new Molde({ aIsla: 4, aSuelo: 1 });
  const h = ALTURA_DE_LA_ACERA;
  for (const s of islas) {
    const c = s.caja;
    suelo.poner('aIsla', c.x0, c.z0, c.x1, c.z1);
    /* Acera en anillo alrededor de la manzana y, dentro, el patio o la plaza: suelos que no se pisan. */
    const m = s.manzana;
    suelo.poner('aSuelo', SUELO.acera);
    suelo.losa(c.x0, c.z0, c.x1, m.z0, h, true);
    suelo.losa(c.x0, m.z1, c.x1, c.z1, h, true);
    suelo.losa(c.x0, m.z0, m.x0, m.z1, h, true);
    suelo.losa(m.x1, m.z0, c.x1, m.z1, h, true);
    suelo.poner('aSuelo', s.tipo === 'plaza' ? SUELO.plaza : SUELO.patio);
    suelo.losa(m.x0, m.z0, m.x1, m.z1, h, true);
    suelo.caja(c.x0, 0, c.z0, c.x1, h, c.z1, 'nseo');
  }
  return { asfalto: asfalto.geometria(), islas: suelo.geometria() };
}

/** Las islas del barrio a partir de sus manzanas y de la glorieta, con la acera de alrededor. */
export function islasDe(manzanas: readonly CajaXZ[], plaza: CajaXZ | null, acera: number): IslaDelSuelo[] {
  const crecer = (c: CajaXZ): CajaXZ => ({ x0: c.x0 - acera, z0: c.z0 - acera, x1: c.x1 + acera, z1: c.z1 + acera });
  const salida: IslaDelSuelo[] = manzanas.map((m) => ({ caja: crecer(m), tipo: 'acera' as const, manzana: m }));
  if (plaza !== null) salida.push({ caja: crecer(plaza), tipo: 'plaza', manzana: plaza });
  return salida;
}
