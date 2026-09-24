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

	/* Aberración: el rojo hacia fuera y el azul hacia dentro; nada en el centro, más en el Remanso. */
	vec2 desvio = d * uAberracion * ( 1.0 + 2.5 * uRemanso ) * r2;
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
	/* Lineal y sin techo → pantalla: el mismo ACES que los materiales de N0 y N1, y la curva sRGB. */
	c = sRGBTransferOETF( vec4( ACESFilmicToneMapping( c ), 1.0 ) ).rgb;
#endif

#ifdef BRILLO_PROPIO
	vec3 brillo = clamp( texture2D( tBrillo, uv ).rgb * uFuerzaDelBrillo, 0.0, 1.0 );
	c = 1.0 - ( 1.0 - clamp( c, 0.0, 1.0 ) ) * ( 1.0 - brillo );
#endif

	/* La gradación: la LUT de 32³ leída en el centro de sus téxeles de los bordes. */
	c = clamp( c, 0.0, 1.0 );
	vec3 graduado = texture( tLut, c * ( ( LADO - 1.0 ) / LADO ) + 0.5 / LADO ).rgb;
	c = mix( c, graduado, uFuerzaDeLaLut );

	/* El Remanso quita el 70 % del color, y lo que queda se enfría: el tiempo parado es frío. */
	float l = dot( c, PESOS_DE_LA_LUMA );
	c = mix( c, vec3( l ), 0.7 * uRemanso );
	c *= mix( vec3( 1.0 ), vec3( 0.9, 1.0, 1.06 ), uRemanso );

	/* Viñeta, que se cierra un poco más en el Remanso. */
	c *= 1.0 - uVineta * ( 1.0 + 0.8 * uRemanso ) * smoothstep( 0.2, 1.1, r2 );

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

export const UNIFORMES_DE_EXTRAER = ['tEntrada', 'uTexel', 'uUmbral', 'uRodilla'] as const;
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
 */
export const EXTRAER = /* glsl */ `
uniform sampler2D tEntrada;
uniform vec2 uTexel;
uniform float uUmbral;
uniform float uRodilla;
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

export const UNIFORMES_DEL_VELO = ['uRemanso', 'uAspecto'] as const;
export type UniformeDelVelo = (typeof UNIFORMES_DEL_VELO)[number];

/**
 * El velo del Remanso en N0: lo que sale MULTIPLICA el lienzo (mezcla `dst × src`). Un 1 no cambia
 * nada; los bordes bajan y se enfrían. Es todo el Remanso que N0 puede pintar sin leer la imagen: el
 * resto (la lluvia quieta, la cámara que orbita, el sonido) no depende del posproceso.
 */
export const VELO = /* glsl */ `
uniform float uRemanso;
uniform float uAspecto;
varying vec2 vUv;

void main() {
	vec2 d = vUv - 0.5;
	float r2 = ( d.x * d.x * uAspecto * uAspecto + d.y * d.y ) / ( 0.25 * uAspecto * uAspecto + 0.25 );
	float oscuro = 1.0 - 0.55 * uRemanso * smoothstep( 0.1, 1.0, r2 );
	vec3 frio = mix( vec3( 1.0 ), vec3( 0.86, 0.97, 1.0 ), 0.6 * uRemanso );
	/* Las bandas de cine, como en el uber: multiplicar por cero es lo único que N0 necesita para ellas. */
	float banda = 0.075 * uRemanso * uRemanso * ( 3.0 - 2.0 * uRemanso );
	float cine = step( banda, vUv.y ) * step( banda, 1.0 - vUv.y );
	gl_FragColor = vec4( frio * oscuro * cine, 1.0 );
}`;
