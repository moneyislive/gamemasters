/**
 * LOS MATERIALES DE PRUEBA DE LA MATERIA: los cuatro de hoy (fachada, asfalto, acera, mobiliario) con la
 * materia cableada A MANO, como la cableó el prototipo del plan (`mat-analitico/banco/prototipo.ts`), y
 * uno de lo lejano. Los usan el banco (`banco-materia.tsx`) y el comprobador (`verify:quiebro-materia`).
 *
 * ═══ ESTO NO ES EL CABLEADO DE VERDAD ═══
 *
 * La ola 1 hace el sistema SIN cablearlo a la ciudad: lo cablean las familias en la ola 2 (PAREDES, SUELO,
 * MOBILIARIO), cada una en su fichero. Aquí se coge el material real de hoy y se le cambia texto en sus
 * retoques, sustitución a sustitución, sólo para enseñar y medir la materia sobre lo que hay. Nada de
 * esto llega al juego.
 *
 * Lo que el plan manda NO tocar tampoco se toca aquí: los charcos (`charcoQ`, `charcoDeLaAceraQ`) siguen
 * en hash (el prototipo los pasaba a la textura, y esa «fase 2 de charcos» está descartada).
 *
 * ═══ CUANDO EL MATERIAL DE VERDAD YA LA LLEVE ═══
 *
 * El día que PAREDES cablee la fachada (o MOBILIARIO el mobiliario), las sustituciones de abajo dejarán de
 * encontrar su texto. No es un fallo: si el material real YA lleva un retoque `materia-*`, no se cablea
 * nada a mano. Pero las opciones del banco SÍ se aplican: su retoque `materia-*` se SUSTITUYE por el mismo
 * con las opciones (`conLasOpcionesDelBanco`), como hace `cambiarLaMateria` en el comprobador. Antes se
 * devolvía tal cual, y el día que la ola 2 cableara el mobiliario, el banco habría pintado seis veces el
 * mismo coche: la vacuna de (g) sin cambiar un píxel, y (g) en rojo sin nada roto.
 *
 * Por eso lo que el banco fuerza vive en el retoque de la MATERIA y no en el cuerpo de nadie: el barniz
 * forzado se escribe en `recordarSuperficieQ` (que todo el que reparte familias tiene que llamar), la
 * vacuna del stub en el reparto, y «sin lóbulo» quita el lóbulo. Así vale igual para el cableado a mano
 * de aquí que para el de verdad de la ola 2. Si no la lleva y falta una sustitución, se dice en `faltan`
 * (el banco lo enseña y el comprobador lo cuenta).
 *
 * ═══ N0: NI fbmQ NI ruidoQ DE ADORNO ═══
 *
 * El plan (§7.4) quiere en N0 como mucho 4 lecturas de la materia y ningún ruido de hash de adorno (un
 * `fbmQ` son 4 `ruidoQ`, 16 `hashQ` y 48 `pcgQ`: el cuello de Adreno y Mali). La fachada de hoy tiene
 * nueve fuera de `muroQ` (el techo del soportal, la medianera, el tejado, el depósito, la chapa, el
 * parpadeo de la luz, el cierre y la pintada); aquí, en N0, se quedan en su media o en UNA lectura donde
 * el peor camino cabe (el techo, el parpadeo, la pintada), y de N1 arriba siguen como hoy (eso lo decide
 * PAREDES). Los charcos no se tocan: siguen en hash por el plan. Lo mide `verify:quiebro-materia` (b).
 */
import * as THREE from 'three';
import type { Retoque, Sustitucion } from '../../atmosfera/parcheo';
import { parchear } from '../../atmosfera/parcheo';
import { nieblaEn } from '../../atmosfera/niebla';
import { materialDeFachada } from '../fachadas';
import { materialDelMobiliario } from '../materiales';
import { RETOQUE_ENTORNO, RETOQUE_MUNDO, RETOQUE_SOLO_BRILLO } from '../retoques';
import { materialDeLaAcera, materialDelAsfalto } from '../suelo';
import type { NivelDeLaCiudad } from '../tipos';
import { ANCLA_DEL_BARNIZ, retoqueDeLaMateria } from './retoque';

/** Las superficies de prueba: las cuatro del prototipo y lo lejano. */
export type SuperficieDePrueba = 'fachada' | 'asfalto' | 'acera' | 'mobiliario' | 'lejos';
export const SUPERFICIES_DE_PRUEBA: readonly SuperficieDePrueba[] = ['fachada', 'asfalto', 'acera', 'mobiliario', 'lejos'];

/** Un material de prueba y las sustituciones que no encontraron su texto. */
export interface MaterialDePrueba {
  readonly material: THREE.MeshStandardMaterial;
  readonly faltan: readonly string[];
  /** El material real ya traía la materia: no se ha cableado nada a mano. */
  readonly yaLaLlevaba: boolean;
}

/** Opciones del banco para el lóbulo de barniz (la comprobación g). Todas tocan SÓLO el retoque de la materia. */
export interface OpcionesDePrueba {
  /**
   * Fuerza el barniz de toda superficie que se recuerde (`recordarSuperficieQ`): 0, el lóbulo no puede
   * cambiar nada; 1, la vacuna.
   */
  readonly barnizForzado?: 0 | 1;
  /** Quita el lóbulo de barniz del retoque de la materia (para comparar con y sin él). */
  readonly sinBarniz?: boolean;
  /**
   * LA VACUNA DEL STUB: el reparto de la materia devuelve la carrocería con barniz 1 aunque la pieza no
   * lleve la marca (lo que haría un stub roto). El banco la usa para ver que su comparación sin la marca
   * lo detecta. Sólo en el banco.
   */
  readonly familiaConBarnizDeVacuna?: boolean;
}

/** Lo que la vacuna del stub pone en el reparto en lugar de la llamada a la carrocería. */
const REPARTO_DE_LA_CARROCERIA = 'if (familia == 11) return superficieCarroceriaQ(e);';
const REPARTO_DE_LA_VACUNA = 'if (familia == 11) { SuperficieQ sV = superficieCarroceriaQ(e); sV.barniz = 1.0; sV.rugBarniz = 0.04; return sV; }';
/** Lo que guarda `recordarSuperficieQ` (`familias.ts`), y lo que pone en su lugar el barniz forzado. */
const RECORDAR_EL_BARNIZ = 'barnizQ = s.barniz;\n  rugBarnizQ = s.rugBarniz;';
const barnizDelBanco = (b: 0 | 1): string => `barnizQ = ${b.toFixed(1)};\n  rugBarnizQ = 0.04;`;

/*
 * Las fábricas de hoy cambian de firma en la ola 1 (PARTICION-CIUDAD les pone el nivel). Se llaman con el
 * nivel por una firma laxa: sobra un argumento a la de hoy y es el que pide la de mañana.
 */
type FabricaConNivel = (nivel: NivelDeLaCiudad) => THREE.MeshStandardMaterial;
const deLaAcera = materialDeLaAcera as unknown as FabricaConNivel;
const delMobiliario = materialDelMobiliario as unknown as FabricaConNivel;

/** El material real de hoy, sin tocar. */
export function materialDeHoy(s: SuperficieDePrueba, nivel: NivelDeLaCiudad): THREE.MeshStandardMaterial {
  switch (s) {
    case 'fachada':
      return materialDeFachada(nivel);
    case 'asfalto':
      return materialDelAsfalto(nivel);
    case 'acera':
      return deLaAcera(nivel);
    case 'mobiliario':
      return delMobiliario(nivel);
    case 'lejos':
      return materialDeLoLejanoDePrueba(nivel, false);
  }
}

function retoquesDe(m: THREE.Material): Retoque[] {
  return (m.userData.parcheoDelQuiebro as { retoques: Retoque[] }).retoques;
}

function yaLlevaMateria(m: THREE.Material): boolean {
  return retoquesDe(m).some((r) => r.nombre.startsWith('materia-'));
}

/** Sustituye en el texto de un retoque; lo que no encuentra lo apunta. */
function cambiar(r: Retoque, pares: readonly (readonly [string, string])[], nombre: string, faltan: string[]): Retoque {
  const esta = (a: string): boolean =>
    (r.fragmento ?? []).some((s) => s.texto.includes(a)) || (r.vertice ?? []).some((s) => s.texto.includes(a));
  for (const [a] of pares) if (!esta(a)) faltan.push(`${r.nombre}: no está «${a.slice(0, 70)}»`);
  const aplicar = (s: Sustitucion): Sustitucion => {
    let t = s.texto;
    for (const [a, b] of pares) if (t.includes(a)) t = t.split(a).join(b);
    return { ...s, texto: t };
  };
  return {
    ...r,
    nombre,
    ...(r.fragmento !== undefined ? { fragmento: r.fragmento.map(aplicar) } : {}),
    ...(r.vertice !== undefined ? { vertice: r.vertice.map(aplicar) } : {}),
  };
}

/** Cambia un texto en el fragmento de un retoque; si no está, lo apunta en `faltan`. */
function cambiarEnElFragmento(r: Retoque, de: string, a: string, sufijo: string, faltan: string[]): Retoque {
  if (!(r.fragmento ?? []).some((s) => s.texto.includes(de))) faltan.push(`${r.nombre}: no está «${de.replace(/\n\s*/g, ' ')}»`);
  return { ...r, nombre: `${r.nombre}-${sufijo}`, fragmento: (r.fragmento ?? []).map((s) => ({ ...s, texto: s.texto.split(de).join(a) })) };
}

/**
 * El retoque de la materia `base` (el de `retoqueDeLaMateria`, o el que ya traiga el material real) con
 * las opciones del banco: el barniz forzado, la vacuna del stub y sin el lóbulo. Sin opciones, `base`
 * tal cual (el mismo objeto). Lo que no encuentre se apunta en `faltan`.
 */
function materiaDelBanco(base: Retoque, opciones: OpcionesDePrueba, faltan: string[]): Retoque {
  let r = base;
  if (opciones.barnizForzado !== undefined) {
    r = cambiarEnElFragmento(r, RECORDAR_EL_BARNIZ, barnizDelBanco(opciones.barnizForzado), `barniz${String(opciones.barnizForzado)}`, faltan);
  }
  if (opciones.familiaConBarnizDeVacuna === true) {
    r = cambiarEnElFragmento(r, REPARTO_DE_LA_CARROCERIA, REPARTO_DE_LA_VACUNA, 'vacuna-familia-con-barniz', faltan);
  }
  if (opciones.sinBarniz === true) {
    const fragmento = (r.fragmento ?? []).filter((s) => s.buscar !== ANCLA_DEL_BARNIZ);
    if (fragmento.length === (r.fragmento ?? []).length) faltan.push(`${r.nombre}: no está el lóbulo («${ANCLA_DEL_BARNIZ}»)`);
    r = { ...r, nombre: `${r.nombre}-sin-barniz`, fragmento };
  }
  return r;
}

/**
 * EL CAMINO DE LA OLA 2: un material que YA lleva un retoque `materia-*` (el real, cuando su familia lo
 * cablee) con las opciones del banco. Se le SUSTITUYE ese retoque por el mismo con las opciones, en su
 * sitio de la lista; nada más cambia. Sin retoque de materia, lo dice en `faltan`. El comprobador lo
 * llama también sobre un material de prueba ya cableado, para ver este camino antes de que exista.
 */
export function conLasOpcionesDelBanco(m: THREE.MeshStandardMaterial, opciones: OpcionesDePrueba = {}): MaterialDePrueba {
  const lista = retoquesDe(m);
  const i = lista.findIndex((r) => r.nombre.startsWith('materia-'));
  if (i < 0) return { material: m, faltan: [`${m.name}: no lleva un retoque «materia-…»`], yaLaLlevaba: false };
  const faltan: string[] = [];
  const antes = lista[i] as Retoque;
  const despues = materiaDelBanco(antes, opciones, faltan);
  if (despues !== antes) {
    lista[i] = despues;
    m.needsUpdate = true;
  }
  return { material: m, faltan, yaLaLlevaba: true };
}

/* ═══════════════════════════════ LA FACHADA ═══════════════════════════════ */

/** El relieve y el envejecimiento del muro, escritos con la API de la materia (el prototipo, portado). */
const GLSL_MURO_DE_BANCO = /* glsl */ `
/* x, y: pendiente tangente; z: oclusión; w: varianza perdida (para la rugosidad). */
vec4 relieveDelMuroQ(int estilo, vec2 q, float semilla, float px) {
  vec4 r = vec4(0.0, 0.0, 1.0, 0.0);
  #if MATERIA_Q >= 1
  if (px > 0.08 || estilo == 3) return r;
  vec2 id = vec2(0.0);
  vec3 j = vec3(1.0, 0.0, 0.0);
  float escalaGrano = 6.0;
  float ampGrano = 0.12;
  if (estilo == 0) { j = juntaQ(q, vec2(1.1, 0.5), 0.55, id); r.xyz = relieveDeJuntaQ(j, 0.006, 0.02, 0.012, px); escalaGrano = 9.0; ampGrano = 0.18; }
  else if (estilo == 1) { j = juntaQ(q, vec2(0.25, 0.075), 0.125, id); r.xyz = relieveDeJuntaQ(j, 0.006, 0.006, 0.008, px); escalaGrano = 14.0; ampGrano = 0.25; }
  else if (estilo == 5) { j = juntaQ(q, vec2(0.6, 0.3), 0.3, id); r.xyz = relieveDeJuntaQ(j, 0.003, 0.004, 0.003, px); ampGrano = 0.0; }
  else if (estilo == 2) { ampGrano = 0.2; escalaGrano = 7.0; }
  /* Cada pieza, un pelo torcida: rompe el reflejo del cielo en el muro mojado. */
  if (estilo == 0 || estilo == 1 || estilo == 5) {
    vec2 h = hash2Q(id, semilla + 11.0) - 0.5;
    r.xy += h * (estilo == 5 ? 0.06 : 0.035) * (1.0 - smoothstep(0.02, 0.08, px));
  }
  #if MATERIA_Q >= 2
  if (ampGrano > 0.0) {
    float lod = lodQ(escalaGrano * 4.0);
    vec3 g = granoT(q * (escalaGrano * 4.0), lod);
    r.xy += g.yz * ampGrano;
    r.w = varianzaPerdidaQ(lod) * ampGrano * ampGrano;
  }
  #endif
  #endif
  return r;
}
/* La humedad del pie y su salitre, con la función de la materia. */
vec3 envejecerMuroQ(vec3 albedo, inout float rug, vec2 q, float y, float semilla) {
  vec2 h = humedadDelPieQ(q, y, semilla);
  albedo *= mix(1.0, 0.66, h.x);
  rug *= mix(1.0, 0.72, h.x);
  return mix(albedo, vec3(0.46, 0.45, 0.42), h.y * 0.45);
}
`;

const SUSTITUCIONES_DE_LA_FACHADA: readonly (readonly [string, string])[] = [
  ['vec4 huecoQ(int estilo) {', `${GLSL_MURO_DE_BANCO}\nvec4 huecoQ(int estilo) {`],
  ['vec3 nLocal = vec3(0.0, 0.0, 1.0);', 'vec3 nLocal = vec3(0.0, 0.0, 1.0);\n  float varianzaM = 0.0;'],
  [
    'albedo = muroQ(estilo, q, tinte, semilla, vano, pb, hp, px, rug);',
    'albedo = muroQ(estilo, q, tinte, semilla, vano, pb, hp, px, rug);\n    vec4 relieveM = relieveDelMuroQ(estilo, q, semilla, pxm);\n    nLocal.xy += relieveM.xy;\n    albedo *= relieveM.z;\n    varianzaM = relieveM.w;',
  ],
  [
    'albedo = mix(albedo, albedo * 0.4, derrame);',
    'albedo = mix(albedo, albedo * 0.4, derrame);\n        { float dyC = l.y < -medio.y ? -medio.y - l.y : hp - medio.y - l.y; float chQ = chorretonQ(l.x, dyC, medio.x, q, semilla) * (1.0 - cristal); albedo *= 1.0 - 0.35 * chQ; rug = mix(rug, rug * 0.6, chQ); }',
  ],
  ['nLocal.xy += inclina * 0.05 * vidrio;', 'nLocal.xy *= 1.0 - vidrio;\n          nLocal.xy += inclina * 0.05 * vidrio;'],
  ['float franja = step(alto + 0.05, q.y);', 'nLocal.xy *= 1.0 - hueco;\n      float franja = step(alto + 0.05, q.y);'],
  [
    'float sucio = (1.0 - smoothstep(0.0, 2.5, P.y)) * 0.3;',
    'float sucio = (1.0 - smoothstep(0.0, 2.5, P.y)) * 0.3;\n      if (tipo < 1.5) albedo = envejecerMuroQ(albedo, rug, q, P.y, semilla);',
  ],
  ['diffuseColor.rgb = albedo;', 'rug = rugosidadFiltradaQ(rug, varianzaM);\n  diffuseColor.rgb = albedo;'],
  /* El ruido de las manchas y del revoco, con la textura (las mismas frecuencias). */
  ['float mancha = fbmQ(q * vec2(0.35, 0.18) + semilla * 0.01);', 'float mancha = fbmT(q * vec2(0.35, 0.18) + semilla * 0.01, lodQ(0.35));'],
  ['float mancha = ruidoQ(q * vec2(0.35, 0.18) + semilla * 0.01);', 'float mancha = ruidoT(q * vec2(0.35, 0.18) + semilla * 0.01, lodQ(0.35));'],
  ['float manchas = ruidoQ(q * vec2(0.09, 0.05) + semilla * 0.37);', 'float manchas = ruidoT(q * vec2(0.09, 0.05) + semilla * 0.37, lodQ(0.09));'],
  [
    'float reguero = smoothstep(0.6, 0.78, fbmQ(vec2(q.x * 2.2, q.y * 0.16) + semilla * 0.013)) * 0.3',
    'float reguero = smoothstep(0.6, 0.78, fbmT(vec2(q.x * 2.2, q.y * 0.16) + semilla * 0.013, lodQ(2.2))) * 0.3',
  ],
  ['base *= 0.82 + 0.3 * fbmQ(q * vec2(0.5, 0.09) + semilla * 0.01);', 'base *= 0.82 + 0.3 * fbmT(q * vec2(0.5, 0.09) + semilla * 0.01, lodQ(0.5));'],
  ['float n = fbmQ(P.xz * 0.35);', 'float n = fbmT(P.xz * 0.35, lodQ(0.35));'],
  ['float g = ruidoQ(P.xz * 5.0);', 'float g = ruidoT(P.xz * 5.0, lodQ(5.0));'],
  [
    'float charco = smoothstep(0.6, 0.66, fbmQ(P.xz * 0.23 + semilla * 0.01));',
    'float charco = smoothstep(0.6, 0.66, fbmT(P.xz * 0.23 + semilla * 0.01, lodQ(0.23)));',
  ],
  /*
   * N0 sin ruido de hash de adorno (ver la cabecera). De N1 arriba, lo de hoy. En N0: la media donde el
   * adorno va en el mismo camino que el muro (el peor camino ya lleva sus 3 lecturas), y UNA lectura
   * donde es otro camino (el techo del soportal, el parpadeo del escaparate) o la única del suyo (la
   * pintada del cierre: la mancha rellena, sin el trazo).
   */
  ...(
    [
      ['albedo = vec3(0.22, 0.21, 0.19) * (0.8 + 0.3 * fbmQ(P.xz * 0.8));', 'albedo = vec3(0.22, 0.21, 0.19) * (0.8 + 0.3 * ruidoT(P.xz * 0.8, lodQ(0.8)));'],
      ['albedo = mix(vec3(0.33, 0.31, 0.28), vec3(0.24, 0.22, 0.2), fbmQ(q * 0.12 + semilla * 0.01));', 'albedo = mix(vec3(0.33, 0.31, 0.28), vec3(0.24, 0.22, 0.2), 0.47);'],
      [
        'albedo = estilo == 3 ? vec3(0.35, 0.37, 0.4) : vec3(0.48, 0.45, 0.4) * (0.85 + 0.2 * fbmQ(q * 0.7));',
        'albedo = estilo == 3 ? vec3(0.35, 0.37, 0.4) : vec3(0.48, 0.45, 0.4) * 0.944;',
      ],
      ['albedo = vec3(0.2, 0.13, 0.08) * (0.8 + 0.3 * fbmQ(q * vec2(4.0, 0.3))) * (1.0 - 0.35 * duela);', 'albedo = vec3(0.2, 0.13, 0.08) * 0.941 * (1.0 - 0.35 * duela);'],
      ['albedo = vec3(0.34, 0.35, 0.35) * (0.8 + 0.3 * fbmQ(q * 1.7));', 'albedo = vec3(0.34, 0.35, 0.35) * 0.941;'],
      [
        'if (hc > 0.9) colorLuz *= 0.45 + 0.55 * ruidoQ(vec2(uTiempo * 5.0, celda + planta * 7.0));',
        'if (hc > 0.9) colorLuz *= 0.45 + 0.55 * ruidoT(vec2(uTiempo * 5.0, celda + planta * 7.0), 0.0);',
      ],
      ['vec3 chapa = vec3(0.19, 0.2, 0.2) * (0.8 + 0.4 * ruidoQ(q * vec2(0.8, 3.0)));', 'vec3 chapa = vec3(0.19, 0.2, 0.2);'],
      [
        `float zona = smoothstep(0.48, 0.56, fbmQ(qg * 0.45));
        float trazo = 1.0 - smoothstep(0.025, 0.05 + px.x * 2.0, abs(fbmQ(qg * vec2(1.7, 2.9)) - 0.5));
        float relleno = smoothstep(0.62, 0.66, fbmQ(qg * vec2(0.9, 1.4) + 5.0)) * 0.6;`,
        `float nPQ = ruidoT(qg * 0.45, lodQ(0.45));
        float zona = smoothstep(0.48, 0.56, nPQ);
        float trazo = 0.0;
        float relleno = smoothstep(0.62, 0.66, nPQ) * 0.6;`,
      ],
    ] as const
  ).map(([hoy, n0]): readonly [string, string] => [hoy, `#if MATERIA_Q >= 1\n${hoy}\n#else\n${n0}\n#endif`]),
];

/* ═══════════════════════════════ EL ASFALTO ═══════════════════════════════ */

const SUSTITUCIONES_DEL_ASFALTO: readonly (readonly [string, string])[] = [
  [
    `  #if NIVEL_Q >= 1
  float grano = fbmQ(P.xz * 2.7);
  float parche = smoothstep(0.55, 0.62, fbmQ(P.xz * 0.09 + 5.0));
  #else
  float grano = ruidoQ(P.xz * 2.7);
  float parche = smoothstep(0.6, 0.7, ruidoQ(P.xz * 0.09 + 5.0));
  #endif`,
    `  float grano = fbmT(P.xz * 2.7, lodQ(2.7));
  float parche = smoothstep(0.55, 0.62, fbmT(P.xz * 0.09 + 5.0, lodQ(0.09)));
  #if MATERIA_Q >= 1
  /* Las serpientes de alquitrán: grietas selladas, negras y brillantes, donde el ruido cruza 0,5. */
  float cresta = abs(ruidoT(P.xz * 0.35 + 3.0, lodQ(0.35)) - 0.5);
  float alquitran = (1.0 - smoothstep(0.012, 0.012 + px * 0.35 + 0.004, cresta)) * step(0.45, ruidoT(P.xz * 0.05, lodQ(0.05)));
  #else
  float alquitran = 0.0;
  #endif`,
  ],
  /* En N0 el ancho de la cuneta y el gasto de la rodada van fijos: 4 lecturas como mucho (plan, §7.4). */
  [
    'float anchoCuneta = 0.25 + 0.45 * fbmQ(vec2(s * 0.21, 3.0));',
    '#if MATERIA_Q >= 1\n    float anchoCuneta = 0.25 + 0.45 * fbmT(vec2(s * 0.21, 3.0), lodQ(0.21));\n    #else\n    float anchoCuneta = 0.475;\n    #endif',
  ],
  [
    'float cuneta = step(medioAncho - anchoCuneta, abs(t)) * smoothstep(0.38, 0.46, fbmQ(vec2(s * 0.3, t * 0.5)));',
    'float cuneta = step(medioAncho - anchoCuneta, abs(t)) * smoothstep(0.38, 0.46, fbmT(vec2(s * 0.3, t * 0.5), lodQ(0.5)));',
  ],
  [
    'rodada = (1.0 - smoothstep(0.55, 0.95, abs(carril - 0.75) + 0.6)) * (0.6 + 0.4 * fbmQ(vec2(s * 0.15, t)));',
    '#if MATERIA_Q >= 1\n    rodada = (1.0 - smoothstep(0.55, 0.95, abs(carril - 0.75) + 0.6)) * (0.6 + 0.4 * fbmT(vec2(s * 0.15, t), lodQ(1.0)));\n    #else\n    rodada = (1.0 - smoothstep(0.55, 0.95, abs(carril - 0.75) + 0.6)) * 0.8;\n    #endif',
  ],
  [
    'pintura *= 0.55 + 0.45 * smoothstep(0.3, 0.6, fbmQ(P.xz * 1.9 + 3.0));',
    `pintura *= 0.55 + 0.45 * smoothstep(0.3, 0.6, fbmT(P.xz * 1.9 + 3.0, lodQ(1.9)));
    /* La pintura se gasta donde pisan las ruedas y se cuartea. */
    pintura *= 1.0 - 0.6 * rodada;
    #if MATERIA_Q >= 2
    pintura *= smoothstep(0.25, 0.3, granoT(P.xz * 24.0, lodQ(24.0)).x);
    #endif`,
  ],
  ['alb *= oclusionDelSueloQ(P.xz);', 'alb = mix(alb, vec3(0.012), alquitran);\n  rug = mix(rug, 0.12, alquitran);\n  alb *= oclusionDelSueloQ(P.xz);'],
  [
    `  float relieve = (1.0 - ch) * (1.0 - smoothstep(0.01, 0.04, px));
  nW = normalize(nW + vec3(grano - 0.5, 0.0, fbmQ(P.zx * 2.7) - 0.5) * 0.25 * relieve);`,
    `  /* El árido: el mapa de derivadas a 48 téxeles por metro (piedras de 1 cm), una lectura. */
  float lodA = lodQ(48.0);
  vec3 arido = granoT(P.xz * 48.0, lodA);
  float seco2 = 1.0 - ch;
  nW = normalize(nW + vec3(arido.y, 0.0, arido.z) * 0.45 * seco2);
  rug = rugosidadFiltradaQ(rug, varianzaPerdidaQ(lodA) * 0.2 * seco2);`,
  ],
];

/* ═══════════════════════════════ LA ACERA ═══════════════════════════════ */

const SUSTITUCIONES_DE_LA_ACERA: readonly (readonly [string, string])[] = [
  [
    'alb = vec3(0.30, 0.29, 0.28) * (0.85 + 0.3 * fbmQ(P.xz * 3.0 + P.y)) * (1.0 - 0.4 * junta) * 0.7;',
    `alb = vec3(0.30, 0.29, 0.28) * (0.85 + 0.3 * fbmT(P.xz * 3.0 + P.y, lodQ(3.0))) * (1.0 - 0.4 * junta) * 0.7;
    #if MATERIA_Q >= 1
    /* El canto redondeado del bordillo: 3 cm que se tuercen hacia fuera arriba y hacia arriba en el lado. */
    if (Ng.y > 0.5) {
      float c = 1.0 - smoothstep(0.0, 0.03, borde);
      vec2 fuera = dx < dz ? vec2(P.x - vIslaQ.x < vIslaQ.z - P.x ? -1.0 : 1.0, 0.0) : vec2(0.0, P.z - vIslaQ.y < vIslaQ.w - P.z ? -1.0 : 1.0);
      nW = normalize(vec3(fuera.x * c * 0.7, 1.0, fuera.y * c * 0.7));
    } else {
      float c = smoothstep(0.12, 0.15, P.y);
      nW = normalize(Ng + vec3(0.0, c * 0.7, 0.0));
    }
    /* Los golpes del canto: mellas oscuras. */
    alb *= 1.0 - 0.35 * step(0.72, ruidoT(vec2(largo * 3.0, P.y * 10.0), lodQ(10.0))) * (1.0 - smoothstep(0.0, 0.05, abs(P.y - 0.14)));
    #endif`,
  ],
  [
    'vec2 gt = t3 * taco * cerca * 1.2;',
    `vec2 gt = t3 * taco * cerca * 1.2;
    #if MATERIA_Q >= 1
    /* Cada losa, un pelo hundida o levantada: el reflejo se rompe en la acera mojada. */
    gt += (hash2Q(floor(q), 21.0) - 0.5) * 0.05 * (1.0 - smoothstep(0.01, 0.05, px));
    #endif`,
  ],
  [
    'alb = vec3(0.17, 0.165, 0.16) * (0.75 + 0.4 * pieza * cerca + 0.2 * (1.0 - cerca)) * (1.0 - 0.35 * junta);',
    `alb = vec3(0.17, 0.165, 0.16) * (0.75 + 0.4 * pieza * cerca + 0.2 * (1.0 - cerca)) * (1.0 - 0.35 * junta);
    #if MATERIA_Q >= 1
    /* El adoquín, con relieve: llaga hundida con chaflán, cada piedra torcida y con su rugosidad. */
    vec2 idA;
    vec3 jA = juntaQ(vec2(P.x, P.z), vec2(0.6, 0.4), 0.3, idA);
    vec3 rA = relieveDeJuntaQ(jA, 0.006, 0.015, 0.01, px);
    vec2 hA = hash2Q(idA, 23.0);
    vec2 tA = rA.xy + (hA - 0.5) * 0.06 * (1.0 - smoothstep(0.02, 0.08, px));
    nW = normalize(vec3(tA.x, 1.0, tA.y));
    alb *= rA.z;
    float rugPiedra = mix(0.4, 0.75, hA.y);
    #else
    float rugPiedra = 0.5;
    #endif
    #if MATERIA_Q >= 2
    vec3 gA = granoT(P.xz * 40.0, lodQ(40.0));
    nW = normalize(nW + vec3(gA.y, 0.0, gA.z) * 0.25);
    #endif`,
  ],
  ['alb *= 0.8 + 0.4 * fbmQ(P.xz * 0.3);\n    rug = 0.5;', 'alb *= 0.8 + 0.4 * fbmT(P.xz * 0.3, lodQ(0.3));\n    rug = rugPiedra;'],
  ['alb = vec3(0.12, 0.12, 0.115) * (0.7 + 0.6 * fbmQ(P.xz * 0.5));', 'alb = vec3(0.12, 0.12, 0.115) * (0.7 + 0.6 * fbmT(P.xz * 0.5, lodQ(0.5)));'],
];

/* ═══════════════════════════════ EL MOBILIARIO ═══════════════════════════════ */

/**
 * El cuerpo del mobiliario con la materia: acabado decodificado, familias y lo que se recuerda. En N0, la
 * receta barata de la cabecera de `glsl.ts`: ni struct ni reparto, `rugYMetalQ`.
 */
const CUERPO_DEL_MOBILIARIO_DE_BANCO = /* glsl */ `
{
  vec3 nM = normalize(normal * mat3(viewMatrix));
  #if MATERIA_Q >= 1
  AcabadoQ acab = decodificarAcabadoQ(vAcabadoQ);
  float rug = acab.rug;
  float met = acab.metal;
  #else
  vec2 rmQ = rugYMetalQ(vAcabadoQ);
  float rug = rmQ.x;
  float met = rmQ.y;
  #endif
  if (rug < 0.03) {
    /* Agua: un espejo con las ondas de las gotas. */
    vec2 g = ondasQ(vPosMundoQ.xz, uTiempo);
    nM = normalize(vec3(-g.x, 1.0, -g.y));
  } else {
    #if MATERIA_Q >= 1
    SuperficieQ s = superficieQ(acab.familia, EntradaQ(acab, diffuseColor.rgb, nM, vPosMundoQ, vUvMoQ));
    recordarSuperficieQ(s);
    diffuseColor.rgb = s.albedo;
    rug = s.rug;
    met = s.metal;
    nM = s.n;
    #endif
    /* Lo que mira al cielo está mojado: más liso. */
    rug = mix(rug, rug * 0.55, smoothstep(0.4, 0.9, nM.y));
  }
  normal = normalize((viewMatrix * vec4(nM, 0.0)).xyz);
  roughnessFactor = rug;
  metalnessFactor = met;
}`;

function cablearElMobiliario(r: Retoque, nivel: NivelDeLaCiudad, faltan: string[]): Retoque {
  const fragmento = (r.fragmento ?? []).map((s): Sustitucion => {
    if (s.buscar === '#include <lights_pars_begin>') {
      return { ...s, texto: `${s.texto.replace('varying vec2 vAcabadoQ;', 'flat varying vec2 vAcabadoQ;')}\nvarying vec2 vUvMoQ;` };
    }
    if (s.buscar === '#include <normal_fragment_maps>') return { ...s, texto: CUERPO_DEL_MOBILIARIO_DE_BANCO };
    return s;
  });
  if (!fragmento.some((s) => s.texto === CUERPO_DEL_MOBILIARIO_DE_BANCO)) faltan.push(`${r.nombre}: no está «#include <normal_fragment_maps>»`);
  const vertice = (r.vertice ?? []).map((s): Sustitucion => ({ ...s, texto: s.texto.replace('varying vec2 vAcabadoQ;', 'flat varying vec2 vAcabadoQ;') }));
  vertice.push({ buscar: '#include <common>', como: 'despues', texto: 'varying vec2 vUvMoQ;' });
  vertice.push({ buscar: '#include <uv_vertex>', como: 'despues', texto: 'vUvMoQ = uv;' });
  return {
    ...r,
    nombre: `mobiliario-materia-n${String(nivel)}`,
    defines: { ...(r.defines ?? {}), MATERIA_UV_Q: 'vUvMoQ' },
    fragmento,
    vertice,
  };
}

/* ═══════════════════════════════ LO LEJANO ═══════════════════════════════ */

/**
 * Un material de lo lejano de prueba: `materia-lejos` (MATERIA_Q 0) y un cuerpo que lee el ruido como lo
 * haría la LOD1 (una mancha por edificio). Con `materia` falso, el mismo sin la materia (con hash).
 */
export function materialDeLoLejanoDePrueba(nivel: NivelDeLaCiudad, materia: boolean): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  m.name = 'quiebro-materia-prueba-lejos';
  const cuerpo = materia
    ? 'diffuseColor.rgb *= vec3(0.3, 0.28, 0.25) * (0.8 + 0.4 * fbmT(vPosMundoQ.xz * 0.35, lodQ(0.35)));'
    : 'diffuseColor.rgb *= vec3(0.3, 0.28, 0.25) * (0.8 + 0.4 * ruidoQ(vPosMundoQ.xz * 0.35));';
  const prueba: Retoque = {
    nombre: `lejos-de-prueba-${materia ? 'materia' : 'hoy'}`,
    orden: 10,
    fragmento: [{ buscar: '#include <normal_fragment_maps>', como: 'despues', texto: cuerpo }],
  };
  parchear(m, RETOQUE_MUNDO, RETOQUE_ENTORNO, RETOQUE_SOLO_BRILLO, prueba);
  if (materia) parchear(m, retoqueDeLaMateria(nivel, { lejos: true }));
  nieblaEn(m);
  return m;
}

/* ═══════════════════════════════ EL CABLEADO ═══════════════════════════════ */

/**
 * El material de hoy con la materia cableada a mano (ver la cabecera), y las opciones del banco. Si el
 * material real ya la lleva, no se cablea nada y las opciones se aplican a SU retoque de materia
 * (`conLasOpcionesDelBanco`). Cada llamada, un material nuevo.
 */
export function materialConMateria(s: SuperficieDePrueba, nivel: NivelDeLaCiudad, opciones: OpcionesDePrueba = {}): MaterialDePrueba {
  if (s === 'lejos') return { material: materialDeLoLejanoDePrueba(nivel, true), faltan: [], yaLaLlevaba: false };
  const m = materialDeHoy(s, nivel);
  if (yaLlevaMateria(m)) return conLasOpcionesDelBanco(m, opciones);
  const faltan: string[] = [];
  parchear(m, materiaDelBanco(retoqueDeLaMateria(nivel), opciones, faltan));
  const lista = retoquesDe(m);
  const prefijo = s === 'fachada' ? 'fachada-' : s === 'asfalto' ? 'asfalto-' : s === 'acera' ? 'acera' : 'mobiliario';
  const i = lista.findIndex((r) => r.nombre.startsWith(prefijo));
  if (i < 0) {
    faltan.push(`${s}: no está el retoque «${prefijo}…»`);
    return { material: m, faltan, yaLaLlevaba: false };
  }
  const r = lista[i] as Retoque;
  const nombre = `${s}-materia-n${String(nivel)}`;
  if (s === 'fachada') lista[i] = cambiar(r, SUSTITUCIONES_DE_LA_FACHADA, nombre, faltan);
  else if (s === 'asfalto') lista[i] = cambiar(r, SUSTITUCIONES_DEL_ASFALTO, nombre, faltan);
  else if (s === 'acera') lista[i] = cambiar(r, SUSTITUCIONES_DE_LA_ACERA, nombre, faltan);
  else lista[i] = cablearElMobiliario(r, nivel, faltan);
  m.needsUpdate = true;
  return { material: m, faltan, yaLaLlevaba: false };
}

/** El nombre del retoque de la materia que lleva un material de prueba (para el comprobador). */
export function materiaDe(m: THREE.Material): string | null {
  return retoquesDe(m).find((r) => r.nombre.startsWith('materia-'))?.nombre ?? null;
}
