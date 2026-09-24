/**
 * LOS UNIFORMES DE LA CIUDAD Y LOS RETOQUES COMUNES a todos sus materiales iluminados.
 *
 * ═══ QUÉ SE LE AÑADE A UN `MeshStandardMaterial` Y POR QUÉ ═══
 *
 * La ciudad no tiene mapa de entorno (el HDR no se puede descargar y un cubo en tiempo real cuesta
 * seis pasadas), ni cien luces reales (cada farola sería una luz puntual y el sombreador de la acera
 * las recorrería todas por píxel). Con `MeshStandardMaterial` a pelo, de noche, todo lo que no toca
 * una de las cuatro luces cercanas es negro y todo lo metálico o mojado es mate. Dos retoques lo
 * arreglan sin cambiar de material:
 *
 *   · `mundo`: la posición y la normal de MUNDO en dos variantes (`vPosMundoQ`, `vNorMundoQ`), que
 *     los demás retoques necesitan y three sólo calcula a veces.
 *   · `entorno`: mete en el `radiance` de three el CIELO FALSO (`cieloReflejadoQ`), de modo que el
 *     Fresnel, la rugosidad y la energía los pone la BRDF de three —la misma que usa para un HDR—;
 *     y mete en el `irradiance` la LUZ DE LA CALLE horneada (farolas, neones, escaparates). Así el
 *     charco refleja con el Fresnel correcto y la acera bajo la farola se ilumina, sin una sola luz.
 *
 * Los uniformes son OBJETOS COMPARTIDOS: `UNIFORMES_DE_LA_CIUDAD.uTiempo.value = t` llega a todos
 * los materiales a la vez. Los que miran otros frentes (el Remanso transparenta las fachadas en su
 * rejilla de glifos, el Amanecer apaga las ventanas, el Apagón las farolas) están aquí con su nombre.
 */
import * as THREE from 'three';
import type { Retoque } from '../atmosfera/parcheo';
import { UNIFORMES_DE_LA_LUZ } from '../atmosfera/paleta';
import { GLSL_CHARCOS, GLSL_CIELO_REFLEJADO, GLSL_LUZ_DE_LA_CALLE, GLSL_ONDAS, GLSL_RUIDO } from './glsl';

/** Una textura de 1×1 negra para que ningún material se compile sin su mapa de luz. */
function texturaNegra(): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
  t.needsUpdate = true;
  return t;
}

/** Una textura de 1×1 blanca: sin oclusión horneada, el suelo no se oscurece. */
function texturaBlanca(): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
  t.needsUpdate = true;
  return t;
}

export const UNIFORMES_DE_LA_CIUDAD = {
  /** El tiempo del ADORNO en segundos (lluvia, ondas, parpadeos). El Remanso lo frena. */
  uTiempo: { value: 0 },
  /** El mapa horneado de la luz de la calle y la caja que cubre: (x0, z0, 1/ancho, 1/fondo). */
  uLuzCalle: { value: texturaNegra() as THREE.Texture },
  uLuzCalleCaja: { value: new THREE.Vector4(-1, -1, 0.5, 0.5) },
  /** El mapa de alturas del suelo (0 calzada, 1 isla) y su caja, para posar tarjetas y salpicaduras. */
  uAlturas: { value: texturaNegra() as THREE.Texture },
  uAlturasCaja: { value: new THREE.Vector4(-1, -1, 0.5, 0.5) },
  /**
   * La oclusión horneada del suelo (`mapaDeOclusion`): 1 a cielo abierto, menos al pie de las fachadas
   * y bajo coches, bancos y farolas. Su caja es la del mapa de alturas. Sin mapa, una textura blanca.
   */
  uOclusionSuelo: { value: texturaBlanca() as THREE.Texture },
  uOclusionCaja: { value: new THREE.Vector4(-1, -1, 0.5, 0.5) },
  /**
   * El color de la luz de las farolas EN LO QUE ILUMINAN (lineal): el canal de las farolas del mapa
   * horneado se multiplica por él. Es un sodio viejo, más blanco que el de la cabeza de la farola (la
   * cabeza, su halo y su reflejo siguen siendo ámbar puro): con el ámbar saturado en el suelo y en las
   * fachadas, la calle entera salía marrón, el verde-cian de la paleta no asomaba en ninguna parte y el
   * ámbar dejaba de ser «lo del jugador» (§1), porque lo era todo.
   */
  uColorDeSodio: { value: new THREE.Color(1.0, 0.6, 0.27) },
  /** 1 = farolas encendidas; 0 = la avería del Apagón. Llega al mapa, a los halos y a las tarjetas. */
  uFarolas: { value: 1 },
  /** Cuánto pesa la luz horneada (para comparar en el banco). */
  uLuzDeLaCalle: { value: 1 },
  /** Cuánto se encharca (0 llovizna, 1 aguacero). */
  uHumedad: { value: 0.5 },
  /** Multiplica la luz de todas las ventanas y escaparates (el Amanecer la baja). */
  uVentanas: { value: 1 },
  /** 0-1: la fachada se transparenta en su rejilla de glifos (el pico del Remanso; lo mueve efectos/). */
  uRejillaDeGlifos: { value: 0 },
};

/** El retoque `mundo`: posición y normal de mundo como variantes. Ver la cabecera. */
export const RETOQUE_MUNDO: Retoque = {
  nombre: 'mundo',
  orden: -10,
  uniformes: { uTiempo: UNIFORMES_DE_LA_CIUDAD.uTiempo },
  vertice: [
    {
      buscar: '#include <common>',
      como: 'despues',
      texto: 'varying vec3 vPosMundoQ;\nvarying vec3 vNorMundoQ;',
    },
    {
      buscar: '#include <project_vertex>',
      como: 'despues',
      texto: [
        'vPosMundoQ = transpose(mat3(viewMatrix)) * (mvPosition.xyz - viewMatrix[3].xyz);',
        '#ifdef USE_NORMAL_Q',
        'vNorMundoQ = normalize(transpose(mat3(viewMatrix)) * transformedNormal);',
        '#else',
        'vNorMundoQ = vec3(0.0, 1.0, 0.0);',
        '#endif',
      ].join('\n'),
    },
  ],
  fragmento: [
    {
      buscar: '#include <common>',
      como: 'despues',
      texto: `varying vec3 vPosMundoQ;\nvarying vec3 vNorMundoQ;\nuniform float uTiempo;\n${GLSL_RUIDO}`,
    },
  ],
  defines: { USE_NORMAL_Q: '1' },
};

/** El retoque `entorno`: cielo falso en el `radiance` y luz de la calle en el `irradiance`. */
export const RETOQUE_ENTORNO: Retoque = {
  nombre: 'entorno',
  orden: 50,
  uniformes: {
    uTiempo: UNIFORMES_DE_LA_CIUDAD.uTiempo,
    uLuzCalle: UNIFORMES_DE_LA_CIUDAD.uLuzCalle,
    uLuzCalleCaja: UNIFORMES_DE_LA_CIUDAD.uLuzCalleCaja,
    uColorDeSodio: UNIFORMES_DE_LA_CIUDAD.uColorDeSodio,
    uFarolas: UNIFORMES_DE_LA_CIUDAD.uFarolas,
    uLuzDeLaCalle: UNIFORMES_DE_LA_CIUDAD.uLuzDeLaCalle,
    uReflejoCenit: UNIFORMES_DE_LA_LUZ.uReflejoCenit,
    uReflejoHorizonte: UNIFORMES_DE_LA_LUZ.uReflejoHorizonte,
    uReflejoMuro: UNIFORMES_DE_LA_LUZ.uReflejoMuro,
    uReflejoVentanas: UNIFORMES_DE_LA_LUZ.uReflejoVentanas,
    uReflejoMedia: UNIFORMES_DE_LA_LUZ.uReflejoMedia,
  },
  fragmento: [
    {
      buscar: '#include <lights_pars_begin>',
      como: 'despues',
      texto: `${GLSL_CIELO_REFLEJADO}\n${GLSL_LUZ_DE_LA_CALLE}`,
    },
    {
      buscar: '#include <lights_fragment_end>',
      como: 'antes',
      texto: `
{
  vec3 nMundoE = normalize(normal * mat3(viewMatrix));
  vec3 vMundoE = normalize(cameraPosition - vPosMundoQ);
  #if defined( RE_IndirectSpecular )
    radiance += cieloReflejadoQ(reflect(-vMundoE, nMundoE), material.roughness);
  #endif
  irradiance += luzDeLaCalleQ(vPosMundoQ, nMundoE);
}`,
    },
  ],
};

/**
 * EL RETOQUE `solo-brillo`: las luces PUNTUALES no aportan difusa a la ciudad, sólo el brillo.
 *
 * Las cuatro o seis luces reales que `atmosfera/luz.ts` recoloca junto a la cámara en N2+ son
 * farolas que YA están en el mapa horneado. Si también iluminaran en difusa, el charco de luz bajo
 * la farola más cercana brillaría el doble que el de la de al lado y «saltaría» al cambiar de farola
 * la luz real. En la ciudad sólo ponen lo que el mapa no puede: el brillo especular en el asfalto
 * mojado, en el cristal y en la pintura. Los personajes, que no llevan este retoque, sí reciben su
 * difusa: les da la farola de verdad.
 *
 * Se hace guardando la difusa directa antes del bucle de las puntuales y devolviéndola después: el
 * trozo `lights_fragment_begin` se copia de three y se le meten las dos líneas. Si three cambia el
 * trozo y no se encuentran las marcas, se apunta en `FALLOS_DEL_PARCHEO` y el material queda con la
 * difusa doble, que se ve pero no rompe.
 */
function retoqueSoloBrillo(): Retoque {
  const trozo = THREE.ShaderChunk.lights_fragment_begin;
  const antes = 'IncidentLight directLight;';
  const despues = '#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )';
  const bien = trozo.includes(antes) && trozo.includes(despues);
  /*
   * Y el brillo, templado (`uBrilloDeLasFarolas`, de la paleta de la luz): una farola de verdad es un
   * punto sin tamaño, y en una losa medio rugosa su brillo de GGX salía como una mancha naranja de dos
   * metros a cada lado del jugador (y al alba era lo único que se veía en la plaza).
   */
  const texto = bien
    ? trozo
        .replace(antes, `vec3 difusaAntesQ = reflectedLight.directDiffuse;\nvec3 brilloAntesQ = reflectedLight.directSpecular;\n${antes}`)
        .replace(
          despues,
          `reflectedLight.directDiffuse = difusaAntesQ;\nreflectedLight.directSpecular = brilloAntesQ + (reflectedLight.directSpecular - brilloAntesQ) * uBrilloDeLasFarolas;\n${despues}`,
        )
    : '#include <lights_fragment_begin>';
  return {
    nombre: 'solo-brillo',
    orden: 20,
    uniformes: { uBrilloDeLasFarolas: UNIFORMES_DE_LA_LUZ.uBrilloDeLasFarolas },
    fragmento: [
      { buscar: '#include <lights_pars_begin>', como: 'despues', texto: 'uniform float uBrilloDeLasFarolas;' },
      { buscar: '#include <lights_fragment_begin>', como: 'en-lugar', texto },
    ],
    ...(bien ? {} : { defines: { QUIEBRO_SIN_SOLO_BRILLO: '1' } }),
  };
}

export const RETOQUE_SOLO_BRILLO: Retoque = retoqueSoloBrillo();

/** ¿Encontró `solo-brillo` sus marcas en el trozo de three? (Lo mira el banco.) */
export const SOLO_BRILLO_EN_SU_SITIO = !('defines' in RETOQUE_SOLO_BRILLO);

/** Los uniformes de los charcos y las ondas, para quien los incluya. */
export const UNIFORMES_DEL_AGUA = {
  uHumedad: UNIFORMES_DE_LA_CIUDAD.uHumedad,
  uTiempo: UNIFORMES_DE_LA_CIUDAD.uTiempo,
};

export { GLSL_CHARCOS, GLSL_ONDAS };
