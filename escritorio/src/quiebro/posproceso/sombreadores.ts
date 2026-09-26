/**
 * LOS SOMBREADORES DEL POSPROCESO, como texto. Sin `three`: así el comprobador los lee en Node.
 *
 * ═══ QUÉ HAY ═══
 *
 *   · `UBER`: el pase propio de un solo sombreador. En orden: la distorsión radial y la aberración
 *     cromática del Remanso (que MUEVEN dónde se lee, así que van primero), el enfoque del Remanso, el
 *     paso a pantalla (sólo con entrada HDR: ACES y sRGB), el brillo propio de N1, la gradación con la
 *     LUT 3D, la desaturación del Remanso, la viñeta y el grano. Una sola lectura de la LUT y como
 *     mucho diez de la imagen: cabe en el móvil de gama media, que es donde corre en N1.
 *   · `EXTRAER` y `DESENFOCAR`: el brillo barato de N1, a un cuarto de resolución y en 8 bits.
 *   · `VELO`: lo único que N0 pinta encima de la escena, y sólo en el Remanso: una viñeta fría que
 *     MULTIPLICA el lienzo (N0 no lee la imagen, así que no puede desaturarla; oscurecer sí puede).
 *
 * ═══ LAS VARIANTES DEL UBER (defines) ═══
 *
 *   · `ENTRADA_HDR`: la entrada es lineal y puede pasar de 1 (N2-N3, blanco HalfFloat). Sin ella la
 *     entrada ya viene mapeada y en sRGB (N1: la copia del lienzo, que pintó los materiales con ACES).
 *   · `BRILLO_PROPIO`: suma el brillo barato de N1 con mezcla «trama» (1 − (1 − a)(1 − b)), que no
 *     quema a blanco lo que ya era claro. En N2-N3 el brillo va antes, en lineal (`UnrealBloomPass`).
 *   · `CON_PROFUNDIDAD`: el enfoque del Remanso mira la profundidad de la escena (N3). Sin ella, el
 *     enfoque sólo mira la distancia al centro de la pantalla, que con la cámara al hombro es donde
 *     están el desvelado y su blanco.
 *   · `CON_REFLEJOS`: el reflejo en pantalla del suelo mojado (N3, con `CON_PROFUNDIDAD`). Ver
 *     `GLSL_REFLEJO_EN_EL_SUELO` más abajo.
 *   · `CON_OCLUSION`: multiplica por la oclusión ambiental que el pase de oclusión dejó en su textura
 *     (N3). Se aplica AQUÍ y no en el pase de oclusión por una razón de WebGL, contada en
 *     `compositor.ts` (el bucle de realimentación con la textura de profundidad).
 *
 * ═══ LA REGLA DE LOS UNIFORMES ═══
 *
 * Cada lista `UNIFORMES_*` es EXACTAMENTE lo que su texto declara con `uniform` (salvo lo que meten
 * los `#include` de three, como `toneMappingExposure`). El compositor construye sus materiales con
 * esas listas como llaves (el compilador de TypeScript exige que estén todas) y el comprobador mira
 * que el texto no declare ni una más ni una menos: un uniforme que el material no da se queda a cero
 * sin avisar, que es la regla de la casa para los sombreadores propios (`escenas/scripts/verificar-escena.ts`).
 *
 * Todo se escribe para `ShaderMaterial` (three antepone `#version 300 es`, la precisión, y las
 * funciones de espacio de color como `sRGBTransferOETF`). Nada de `#include <colorspace_pars_fragment>`
 * aquí: three ya lo pone y repetirlo no compila.
 */
import { GLSL_CHARCOS, GLSL_RUIDO } from '../ciudad/glsl';

/**
 * EL REFLEJO EN PANTALLA DEL SUELO MOJADO (N3, diseño §8: «SSR sólo en la máscara de charcos»).
 *
 * El asfalto ya refleja un cielo falso y las tarjetas estiran bajo cada luz su brillo; lo que ninguna de
 * las dos puede es reflejar LO QUE HAY: la fachada de enfrente con sus ventanas, el neón, el Celador que
 * viene. Esto lo hace con lo que ya está pintado: para cada píxel de suelo (se reconoce reconstruyendo
 * de la profundidad su sitio en el mundo y la normal con dos vecinos: horizontal y a menos de 25 cm),
 * se refleja el rayo de la cámara en el plano del suelo y se recorre en el espacio de la vista con pasos
 * que crecen, hasta que pasa por detrás de lo pintado; entonces se afina con una bisección y se lee el
 * color de la imagen en ese punto. Cuánto se ve depende del Fresnel del agua (a ras, mucho; mirando al
 * suelo, casi nada) y de la MISMA máscara de charcos que el asfalto (`charcoQ`): en el charco es un
 * espejo; en el asfalto sólo mojado, un velo. Lo que se sale de la pantalla se funde, no se corta.
 *
 * Todo en lineal, antes del ACES: el reflejo de un neón brilla como el neón. Cuesta unas treinta
 * lecturas de profundidad por píxel de suelo; en una gráfica dedicada no se nota.
 */
export const GLSL_REFLEJO_EN_EL_SUELO = /* glsl */ `
uniform mat4 uProyeccion;
uniform mat4 uProyeccionInversa;
uniform mat4 uVistaInversa;
uniform float uReflejos;
${GLSL_RUIDO}
${GLSL_CHARCOS}
vec3 vistaEn( vec2 uv ) {
	float d = texture2D( tProfundidad, uv ).x;
	vec4 p = uProyeccionInversa * vec4( uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0 );
	return p.xyz / p.w;
}
vec2 pantallaDe( vec3 v ) {
	vec4 p = uProyeccion * vec4( v, 1.0 );
	return ( p.xy / p.w ) * 0.5 + 0.5;
}
vec3 reflejoEnElSuelo( vec2 uv, vec3 c ) {
	if ( uReflejos <= 0.0 || texture2D( tProfundidad, uv ).x >= 0.99999 ) return c;
	vec2 px = 1.0 / uResolucion;
	vec3 P = vistaEn( uv );
	vec3 W = ( uVistaInversa * vec4( P, 1.0 ) ).xyz;
	if ( W.y > 0.25 ) return c;
	vec3 Wx = ( uVistaInversa * vec4( vistaEn( uv + vec2( px.x, 0.0 ) ), 1.0 ) ).xyz;
	vec3 Wy = ( uVistaInversa * vec4( vistaEn( uv + vec2( 0.0, px.y ) ), 1.0 ) ).xyz;
	vec3 nW = cross( Wy - W, Wx - W );
	if ( abs( nW.y ) < 0.9 * length( nW ) ) return c;
	/* Cuánta agua: el charco es un espejo; el asfalto mojado, un velo. */
	float agua = W.y > 0.05 ? charcoDeLaAceraQ( W.xz ) : charcoQ( W.xz );
	agua = max( agua, 0.22 );
	vec3 arriba = normalize( transpose( mat3( uVistaInversa ) ) * vec3( 0.0, 1.0, 0.0 ) );
	vec3 V = normalize( P );
	vec3 R = reflect( V, arriba );
	float cosT = clamp( dot( -V, arriba ), 0.0, 1.0 );
	float F = 0.02 + 0.98 * pow( 1.0 - cosT, 5.0 );
	float t = 0.25;
	float antes = 0.0;
	vec2 dar = vec2( -1.0 );
	for ( int i = 0; i < 26; i ++ ) {
		vec3 Q = P + R * t;
		vec2 uq = pantallaDe( Q );
		if ( uq.x < 0.0 || uq.x > 1.0 || uq.y < 0.0 || uq.y > 1.0 || Q.z > -0.05 ) break;
		float zEscena = vistaEn( uq ).z;
		if ( Q.z < zEscena && zEscena - Q.z < 0.6 + t * 0.08 ) {
			/* Afinar: bisección entre el paso de antes y éste. */
			float a = antes;
			float b = t;
			for ( int k = 0; k < 5; k ++ ) {
				float m = 0.5 * ( a + b );
				vec3 Qm = P + R * m;
				if ( Qm.z < vistaEn( pantallaDe( Qm ) ).z ) b = m; else a = m;
			}
			dar = pantallaDe( P + R * b );
			break;
		}
		antes = t;
		t = t * 1.22 + 0.12;
	}
	if ( dar.x < 0.0 ) return c;
	/* Un temblor de agua, fijo en el mundo, para que el charco no sea un espejo de laboratorio. */
	dar += ( vec2( ruidoQ( W.xz * 7.0 ), ruidoQ( W.zx * 7.0 + 13.0 ) ) - 0.5 ) * 0.006 * agua;
	vec2 borde = smoothstep( vec2( 0.0 ), vec2( 0.08 ), dar ) * ( 1.0 - smoothstep( vec2( 0.92 ), vec2( 1.0 ), dar ) );
	float peso = F * agua * borde.x * borde.y * uReflejos * ( 1.0 - smoothstep( 25.0, 45.0, t ) );
	/* Lo reflejado más oscuro que el suelo sólo lo tapa en parte: el suelo ya lleva el brillo estirado de
	   las farolas (las tarjetas), que es un reflejo también, y borrarlo con el de una fachada oscura
	   apagaba las calles. Lo más claro (ventanas, neones, faros) entra entero. */
	vec3 visto = texture2D( tEntrada, dar ).rgb;
	float masClaro = step( dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ), dot( visto, vec3( 0.2126, 0.7152, 0.0722 ) ) );
	return mix( c, visto, clamp( peso * mix( 0.35, 1.0, masClaro ), 0.0, 1.0 ) );
}
`;

/** El vértice común: el triángulo que cubre la pantalla de `FullScreenQuad`, sin matrices. */
export const VERTICE_DE_PANTALLA = /* glsl */ `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = vec4( position.xy, 0.0, 1.0 );
}`;

export const UNIFORMES_DEL_UBER = [
  'uProyeccion',
  'uProyeccionInversa',
  'uVistaInversa',
  'uReflejos',
  'uHumedad',
  'tEntrada',
  'tLut',
  'tBrillo',
  'tProfundidad',
  'uResolucion',
  'uSemilla',
  'uRemanso',
  'uVineta',
  'uGrano',
  'uAberracion',
  'uFuerzaDeLaLut',
  'uFuerzaDelBrillo',
  'uCerca',
  'uLejos',
  'uFoco',
  'uRangoDelFoco',
  'tOclusion',
  'uOclusion',
  'uFogonazo',
  'uGolpe',
  'uCargaDelRayo',
] as const;
export type UniformeDelUber = (typeof UNIFORMES_DEL_UBER)[number];

/** Lado de la LUT en el sombreador; tiene que ser el de `gradacion.ts` (lo mira el comprobador). */
export const LADO_DE_LA_LUT_EN_EL_UBER = 32;

export const UBER = /* glsl */ `
#ifdef ENTRADA_HDR
#include <tonemapping_pars_fragment>
#endif
#ifdef CON_PROFUNDIDAD
#include <packing>
#endif

uniform sampler2D tEntrada;
uniform sampler3D tLut;
uniform sampler2D tBrillo;
uniform sampler2D tProfundidad;
uniform vec2 uResolucion;
uniform float uSemilla;
uniform float uRemanso;
uniform float uVineta;
uniform float uGrano;
uniform float uAberracion;
uniform float uFuerzaDeLaLut;
uniform float uFuerzaDelBrillo;
uniform float uCerca;
uniform float uLejos;
uniform float uFoco;
uniform float uRangoDelFoco;
uniform sampler2D tOclusion;
uniform float uOclusion;
/* EL RAYO (docs/quiebro/EL-RAYO.md §3-§4): el fogonazo de pantalla (color lineal que se suma), el golpe (xy: dónde dio,
   en la pantalla; z: su fuerza) y la carga propia (0-1), que cierra la viñeta. Cero lecturas más. */
uniform vec3 uFogonazo;
uniform vec3 uGolpe;
uniform float uCargaDelRayo;

varying vec2 vUv;

#ifdef CON_REFLEJOS
${GLSL_REFLEJO_EN_EL_SUELO}
#endif

const float LADO = ${LADO_DE_LA_LUT_EN_EL_UBER}.0;
const vec3 PESOS_DE_LA_LUMA = vec3( 0.2126, 0.7152, 0.0722 );

/* Seis tomas en espiral de ángulo dorado dentro del círculo unidad: el enfoque del Remanso. */
const vec2 TOMAS[ 6 ] = vec2[ 6 ](
	vec2( 0.2887, 0.0000 ),
	vec2( -0.3687, 0.3377 ),
	vec2( 0.0564, -0.6430 ),
	vec2( 0.4647, 0.6061 ),
	vec2( -0.8528, -0.1508 ),
	vec2( 0.8078, -0.5139 )
);

/*
 * Azar por píxel y fotograma, entero. Mezcla «lowbias32» de Chris Wellons (dominio público). Sin
 * seno: el truco de fract(sin(x)·43758) pierde bits en la media precisión de muchos móviles y el
 * grano sale a rayas.
 */
float azar( uvec2 p, uint s ) {
	uint x = p.x * 1973u + p.y * 9277u + s * 26699u;
	x ^= x >> 16;
	x *= 0x7feb352du;
	x ^= x >> 15;
	x *= 0x846ca68bu;
	x ^= x >> 16;
	return float( x ) * ( 1.0 / 4294967296.0 );
}

vec3 leer( vec2 uv ) {
	return texture2D( tEntrada, uv ).rgb;
}

void main() {
	vec2 d = vUv - 0.5;
	float aspecto = uResolucion.x / uResolucion.y;
	/* Distancia al centro corregida por el aspecto: 0 en el centro y 1 en la esquina. */
	float r2 = ( d.x * d.x * aspecto * aspecto + d.y * d.y ) / ( 0.25 * aspecto * aspecto + 0.25 );

	/* El Remanso abomba un poco la imagen hacia fuera. */
	vec2 uv = 0.5 + d * ( 1.0 - 0.045 * uRemanso * r2 );

	/* EL GOLPE DEL RAYO: un abombado breve alrededor de donde dio, con su aberración (mueven dónde se lee; no leen más). */
	vec2 dg = uv - uGolpe.xy;
	vec2 dgA = dg * vec2( aspecto, 1.0 );
	float golpe = uGolpe.z * exp( -dot( dgA, dgA ) * 7.0 );
	uv -= dg * 0.03 * golpe;

	/* Aberración: el rojo hacia fuera y el azul hacia dentro; nada en el centro, más en el Remanso y en el golpe. */
	vec2 desvio = d * uAberracion * ( 1.0 + 2.5 * uRemanso ) * r2 + dg * 0.006 * golpe;
	vec3 c = vec3( leer( uv + desvio ).r, leer( uv ).g, leer( uv - desvio ).b );

	/* El enfoque del Remanso: lo de fuera del foco se desenfoca, y sólo mientras hay Remanso. */
	if ( uRemanso > 0.001 ) {
#ifdef CON_PROFUNDIDAD
		float z = -perspectiveDepthToViewZ( texture2D( tProfundidad, uv ).x, uCerca, uLejos );
		float fuera = max( clamp( abs( z - uFoco ) / uRangoDelFoco, 0.0, 1.0 ), 0.5 * smoothstep( 0.35, 1.0, r2 ) );
#else
		float fuera = smoothstep( 0.08, 0.7, r2 );
#endif
		float radio = uRemanso * fuera * 6.0;
		if ( radio > 0.5 ) {
			vec3 suma = c;
			for ( int i = 0; i < 6; i ++ ) suma += leer( uv + TOMAS[ i ] * radio / uResolucion );
			c = suma / 7.0;
		}
	}

#ifdef CON_REFLEJOS
	/* El suelo mojado refleja lo que hay (N3), en lineal y antes del mapeo tonal. */
	c = reflejoEnElSuelo( uv, c );
#endif

#ifdef CON_OCLUSION
	/* La oclusión (N3) se calcula a media resolución en su pase y se aplica aquí, en lineal. */
	c *= mix( 1.0, texture2D( tOclusion, uv ).r, uOclusion );
#endif

#ifdef ENTRADA_HDR
	/* El fogonazo del rayo, en lineal y antes del mapeo: MULTIPLICA la luz que hay (lo alumbrado se dispara y los
	   negros se quedan). Sumar, aunque fuera poco, levantaba los negros de toda la imagen: un velo, niebla. */
	c *= 1.0 + 6.0 * uFogonazo;
	/* Lineal y sin techo → pantalla: el mismo ACES que los materiales de N0 y N1, y la curva sRGB. */
	c = sRGBTransferOETF( vec4( ACESFilmicToneMapping( c ), 1.0 ) ).rgb;
#endif

#ifdef BRILLO_PROPIO
	vec3 brillo = clamp( texture2D( tBrillo, uv ).rgb * uFuerzaDelBrillo, 0.0, 1.0 );
	c = 1.0 - ( 1.0 - clamp( c, 0.0, 1.0 ) ) * ( 1.0 - brillo );
#endif

#ifndef ENTRADA_HDR
	/* Sin HDR (N1), el fogonazo en pantalla: multiplica lo que hay (como en el camino pleno, sin levantar los negros). */
	c = clamp( c * ( 1.0 + 4.0 * uFogonazo ), 0.0, 1.0 );
#endif

	/* La gradación: la LUT de 32³ leída en el centro de sus téxeles de los bordes. */
	c = clamp( c, 0.0, 1.0 );
	vec3 graduado = texture( tLut, c * ( ( LADO - 1.0 ) / LADO ) + 0.5 / LADO ).rgb;
	c = mix( c, graduado, uFuerzaDeLaLut );

	/* El Remanso quita el 70 % del color, y lo que queda se enfría: el tiempo parado es frío. */
	float l = dot( c, PESOS_DE_LA_LUMA );
	c = mix( c, vec3( l ), 0.7 * uRemanso );
	c *= mix( vec3( 1.0 ), vec3( 0.9, 1.0, 1.06 ), uRemanso );

	/* Viñeta, que se cierra un poco más en el Remanso y mientras se carga el rayo (el ojo se va a la mira). */
	c *= 1.0 - ( uVineta * ( 1.0 + 0.8 * uRemanso ) + 0.4 * uCargaDelRayo ) * smoothstep( 0.2, 1.1, r2 );

	/*
	 * EL REMANSO ES UN MOMENTO DE CINE: dos bandas negras entran desde arriba y desde abajo (hasta el
	 * 7,5 % de la altura cada una) y salen con él. Es la señal que el ojo lee como «esto es un plano», y
	 * no tapa nada que importe: los anillos y los contornos van en la capa nítida, encima.
	 */
	if ( uRemanso > 0.001 ) {
		float banda = 0.075 * uRemanso * uRemanso * ( 3.0 - 2.0 * uRemanso );
		float px = 1.0 / uResolucion.y;
		c *= smoothstep( banda - px, banda + px, vUv.y ) * smoothstep( banda - px, banda + px, 1.0 - vUv.y );
	}

	/*
	 * Grano de película, más en los medios tonos que en los negros y los blancos. Nunca menos de un
	 * escalón de 8 bits: es también el tramado que evita las bandas en los degradados de la niebla.
	 */
	uvec2 pixel = uvec2( gl_FragCoord.xy );
	uint semilla = uint( uSemilla );
	float ruido = azar( pixel, semilla ) + azar( pixel + uvec2( 7u, 3u ), semilla + 1u ) - 1.0;
	float medios = 1.0 - abs( 2.0 * l - 1.0 );
	c += ruido * max( uGrano * ( 0.35 + 0.65 * medios ), 1.0 / 255.0 );

	gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), 1.0 );
}`;

/**
 * EL CANAL DEL RAYO, CON SU PESO PROPIO EN EL BRILLO (docs/quiebro/EL-RAYO.md §4: «un hilo blanco sobreexpuesto casi
 * sin grosor»). El brillo del posproceso (el barato de N1 y el `UnrealBloomPass` de N2-N3) recoge TODO lo que pasa de su
 * umbral y lo esparce. El núcleo del rayo pasa de sobra, y es una línea: esparcida, un halo mucho más ancho que ella.
 * De lado todavía se lee un hilo dentro de su aura, pero desde el hombro, que es como lo ve quien dispara, el canal de
 * ocho metros cabe en cincuenta píxeles y su halo era una cuña de luz blanda (en N3) o un tubo ámbar y blanco (en N1)
 * que se tragaba el hilo.
 *
 * Así que en la EXTRACCIÓN del brillo (antes de esparcir: el halo de lo demás sigue siendo suave y continuo) lo que cae
 * en una banda alrededor del canal en la pantalla entra con menos peso: `1 − bandaDelCanal(uv)`. La banda es la recta de
 * la mano a donde da (`uCanal`, en uv), con su medio ancho y el largo de sus puntas (`uCanalForma`, en altos de
 * pantalla; w, el aspecto); cerca de las dos puntas se abre, para que el fogonazo de la boca y el del blanco brillen
 * enteros. La forma la calcula `formaDeLaBandaDelCanal` cada fotograma (con el canal que se ve, `rayos.imagen`). Sin
 * canal, `uCanalForma.x` = 0: nada. Son uniformes: cero lecturas más.
 */
export const GLSL_BANDA_DEL_CANAL = /* glsl */ `
uniform vec4 uCanal;
uniform vec4 uCanalForma;
float bandaDelCanal( vec2 uv ) {
	if ( uCanalForma.x <= 0.0 ) return 0.0;
	vec2 escala = vec2( uCanalForma.w, 1.0 );
	vec2 a = uCanal.xy * escala;
	vec2 ab = uCanal.zw * escala - a;
	float largo = max( length( ab ), 1e-5 );
	vec2 eje = ab / largo;
	vec2 p = uv * escala - a;
	float k = dot( p, eje );
	float lado = abs( dot( p, vec2( -eje.y, eje.x ) ) );
	float dentro = 1.0 - smoothstep( uCanalForma.y * 0.55, uCanalForma.y, lado );
	float puntas = smoothstep( 0.0, uCanalForma.z, k ) * smoothstep( 0.0, uCanalForma.z, largo - k );
	return uCanalForma.x * dentro * puntas;
}
`;

/** La banda del canal en JavaScript, la misma cuenta que `bandaDelCanal` (para el comprobador). */
export function bandaDelCanal(
  u: number,
  v: number,
  canal: readonly [number, number, number, number],
  forma: readonly [number, number, number, number],
): number {
  const [quita, medio, punta, aspecto] = forma;
  if (!(quita > 0)) return 0;
  const ax = canal[0] * aspecto;
  const ay = canal[1];
  const bx = canal[2] * aspecto - ax;
  const by = canal[3] - ay;
  const largo = Math.max(Math.hypot(bx, by), 1e-5);
  const ex = bx / largo;
  const ey = by / largo;
  const px = u * aspecto - ax;
  const py = v - ay;
  const k = px * ex + py * ey;
  const lado = Math.abs(-px * ey + py * ex);
  const suave = (a: number, b: number, x: number): number => {
    const s = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return s * s * (3 - 2 * s);
  };
  return quita * (1 - suave(medio * 0.55, medio, lado)) * suave(0, punta, k) * suave(0, punta, largo - k);
}

/**
 * LA FORMA DE LA BANDA DEL CANAL para un canal que ocupa `largoPx` en una pantalla de `altoPx` de alto y está a
 * `presencia` (0-1: recién hecho 1, apagándose su estela hacia 0): [lo que quita del brillo, medio ancho, largo de las
 * puntas] (los dos últimos en altos de pantalla).
 *
 *   · LO QUE QUITA: un canal corto en la pantalla (visto casi de punta, el propio desde el hombro) es donde el halo se
 *     amontona y se come el hilo: le quita el 85 %. Uno largo (de lado, cruzando la calle) lleva su aura repartida en
 *     cientos de píxeles y se lee igual: el 45 %.
 *   · EL MEDIO ANCHO: lo que el hilo se aparta de la recta en la pantalla crece con su largo (el quiebro va en proporción
 *     a lo que ocupa: `aplanadoDelCanal`), así que la banda también: 10 px más la décima parte del largo, hasta 70.
 *   · LAS PUNTAS: hasta 14 px (o la quinta parte del largo) junto a la mano y al blanco, sin quitar nada.
 */
export function formaDeLaBandaDelCanal(largoPx: number, altoPx: number, presencia: number): [number, number, number] {
  if (!(largoPx >= 2) || !(altoPx > 0) || !(presencia > 0)) return [0, 0, 0];
  const s = Math.min(1, Math.max(0, (largoPx - 120) / 330));
  const quita = Math.min(1, presencia) * (0.85 - 0.4 * s * s * (3 - 2 * s));
  const medio = Math.min(70, 10 + 0.1 * largoPx) / altoPx;
  const punta = Math.min(14, 0.2 * largoPx) / altoPx;
  return [quita, medio, punta];
}

export const UNIFORMES_DEL_BRILLO_HDR = ['tDiffuse', 'luminosityThreshold', 'smoothWidth', 'defaultColor', 'defaultOpacity', 'uCanal', 'uCanalForma'] as const;
export type UniformeDelBrilloHdr = (typeof UNIFORMES_DEL_BRILLO_HDR)[number];

/**
 * LA EXTRACCIÓN DEL BRILLO DE N2-N3: la de `UnrealBloomPass` (su `LuminosityHighPassShader`, los mismos uniformes y la
 * misma cuenta) más el peso propio del canal del rayo (`GLSL_BANDA_DEL_CANAL`). El compositor la pone en su lugar
 * (`BrilloDelQuiebro` en `compositor.ts`). Una lectura, como la de three.
 */
export const BRILLO_HDR = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec3 defaultColor;
uniform float defaultOpacity;
uniform float luminosityThreshold;
uniform float smoothWidth;
${GLSL_BANDA_DEL_CANAL}
varying vec2 vUv;

void main() {
	vec4 texel = texture2D( tDiffuse, vUv );
	float v = luminance( texel.xyz );
	vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );
	float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );
	alpha *= 1.0 - bandaDelCanal( vUv );
	gl_FragColor = mix( outputColor, texel, alpha );
}`;

export const UNIFORMES_DE_EXTRAER = ['tEntrada', 'uTexel', 'uUmbral', 'uRodilla', 'uCanal', 'uCanalForma'] as const;
export type UniformeDeExtraer = (typeof UNIFORMES_DE_EXTRAER)[number];

/**
 * El brillo barato, paso 1: de la copia del lienzo (pantalla, 8 bits) a un cuarto de resolución,
 * quedándose con lo que pasa del umbral. Cuatro lecturas bilineales en ±1 téxel promedian 4×4
 * píxeles. El umbral mira el canal MAYOR y no la luma: un magenta de neón tiene poca luma y tiene
 * que brillar igual. Rodilla blanda para que el borde del umbral no se vea.
 *
 * Y el peso se NORMALIZA al tramo que queda por encima del umbral: en la imagen de pantalla todo lo
 * que en lineal pasaba de 1 —una farola de 4, un neón de 3— ha quedado en 1, así que sin normalizar
 * lo más brillante de la escena sólo aportaría un tercio de su color y el halo no se vería. Con la
 * normalización, un blanco de pantalla entra entero y un 0,8 entra a medias.
 *
 * Y EL CANAL DEL RAYO entra con su peso propio (`GLSL_BANDA_DEL_CANAL`): en N1 era un tubo ámbar y blanco.
 */
export const EXTRAER = /* glsl */ `
uniform sampler2D tEntrada;
uniform vec2 uTexel;
uniform float uUmbral;
uniform float uRodilla;
${GLSL_BANDA_DEL_CANAL}
varying vec2 vUv;

void main() {
	vec3 c = texture2D( tEntrada, vUv + uTexel * vec2( -1.0, -1.0 ) ).rgb;
	c += texture2D( tEntrada, vUv + uTexel * vec2( 1.0, -1.0 ) ).rgb;
	c += texture2D( tEntrada, vUv + uTexel * vec2( -1.0, 1.0 ) ).rgb;
	c += texture2D( tEntrada, vUv + uTexel * vec2( 1.0, 1.0 ) ).rgb;
	c *= 0.25;
	float mayor = max( c.r, max( c.g, c.b ) );
	float blando = clamp( mayor - uUmbral + uRodilla, 0.0, 2.0 * uRodilla );
	blando = blando * blando / ( 4.0 * uRodilla + 0.00001 );
	float peso = min( 1.0, max( blando, mayor - uUmbral ) / max( mayor * ( 1.0 - uUmbral ), 0.00001 ) );
	peso *= 1.0 - bandaDelCanal( vUv );
	gl_FragColor = vec4( c * peso, 1.0 );
}`;

export const UNIFORMES_DE_DESENFOCAR = ['tEntrada', 'uPaso'] as const;
export type UniformeDeDesenfocar = (typeof UNIFORMES_DE_DESENFOCAR)[number];

/**
 * El brillo barato, paso 2: gaussiana de 9 tomas hecha con 5 lecturas bilineales (pesos y
 * desplazamientos de la gaussiana 9×9 repartidos entre pares de téxeles). `uPaso` es un téxel en la
 * dirección que toca, multiplicado por la escala de la pasada.
 */
export const DESENFOCAR = /* glsl */ `
uniform sampler2D tEntrada;
uniform vec2 uPaso;
varying vec2 vUv;

void main() {
	vec3 c = texture2D( tEntrada, vUv ).rgb * 0.2270270270;
	c += texture2D( tEntrada, vUv + uPaso * 1.3846153846 ).rgb * 0.3162162162;
	c += texture2D( tEntrada, vUv - uPaso * 1.3846153846 ).rgb * 0.3162162162;
	c += texture2D( tEntrada, vUv + uPaso * 3.2307692308 ).rgb * 0.0702702703;
	c += texture2D( tEntrada, vUv - uPaso * 3.2307692308 ).rgb * 0.0702702703;
	gl_FragColor = vec4( c, 1.0 );
}`;

export const UNIFORMES_DEL_VELO = ['uRemanso', 'uAspecto', 'uCargaDelRayo'] as const;
export type UniformeDelVelo = (typeof UNIFORMES_DEL_VELO)[number];

/**
 * El velo del Remanso en N0: lo que sale MULTIPLICA el lienzo (mezcla `dst × src`). Un 1 no cambia
 * nada; los bordes bajan y se enfrían. Es todo el Remanso que N0 puede pintar sin leer la imagen: el
 * resto (la lluvia quieta, la cámara que orbita, el sonido) no depende del posproceso. También cierra
 * los bordes mientras se carga el rayo (`uCargaDelRayo`, como la viñeta del uber).
 */
export const VELO = /* glsl */ `
uniform float uRemanso;
uniform float uAspecto;
uniform float uCargaDelRayo;
varying vec2 vUv;

void main() {
	vec2 d = vUv - 0.5;
	float r2 = ( d.x * d.x * uAspecto * uAspecto + d.y * d.y ) / ( 0.25 * uAspecto * uAspecto + 0.25 );
	float oscuro = 1.0 - ( 0.55 * uRemanso + 0.4 * uCargaDelRayo ) * smoothstep( 0.1, 1.0, r2 );
	vec3 frio = mix( vec3( 1.0 ), vec3( 0.86, 0.97, 1.0 ), 0.6 * uRemanso );
	/* Las bandas de cine, como en el uber: multiplicar por cero es lo único que N0 necesita para ellas. */
	float banda = 0.075 * uRemanso * uRemanso * ( 3.0 - 2.0 * uRemanso );
	float cine = step( banda, vUv.y ) * step( banda, 1.0 - vUv.y );
	gl_FragColor = vec4( frio * oscuro * cine, 1.0 );
}`;

export const UNIFORMES_DEL_FOGONAZO = ['uFogonazo'] as const;
export type UniformeDelFogonazo = (typeof UNIFORMES_DEL_FOGONAZO)[number];

/**
 * EL FOGONAZO DEL RAYO EN N0 (EL-RAYO.md §4: «cuadro aditivo»): N0 no lee la imagen, así que el fogonazo de pantalla
 * es un cuadro que se mezcla con el lienzo como `dst × (1 + src)` (origen por el color de destino, más el destino
 * entero): lo alumbrado se dispara y los negros se quedan, como en el uber. Sólo en los fotogramas en que lo hay, y
 * acotado igual (fotosensibilidad: un destello, corto).
 */
export const FOGONAZO = /* glsl */ `
uniform vec3 uFogonazo;
varying vec2 vUv;

void main() {
	gl_FragColor = vec4( uFogonazo, 1.0 );
}`;
