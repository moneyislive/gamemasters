/**
 * EL COMPOSITOR DEL QUIEBRO: tres caminos de pintado, uno por familia de niveles, con la misma cara.
 *
 * ═══ LOS TRES CAMINOS ═══
 *
 *   · DIRECTO (N0). La escena se pinta en el lienzo y ya está. El color de la noche va DENTRO de cada
 *     material: `renderer.toneMapping = CustomToneMapping` con el tono propio (`tono.ts`: ACES y la
 *     gradación). En el Remanso se pinta encima un velo que multiplica (viñeta fría), que es lo único
 *     que se puede hacer sin leer la imagen. Cero blancos, cero texturas nuevas.
 *
 *   · BARATO (N1). La escena se pinta en el lienzo exactamente como en N0, pero con ACES a secas
 *     (sin gradación en el material), y se COPIA el lienzo a una textura (`copyFramebufferToTexture`).
 *     Encima: brillo a un cuarto de resolución en 8 bits (extraer + dos pasadas de gaussiana en cruz)
 *     y el pase «uber» de vuelta al lienzo, con la LUT, la viñeta, el grano y el Remanso.
 *     ¿Por qué copiar el lienzo y no pintar la escena en un blanco de 8 bits? Porque un blanco de
 *     8 bits guarda el color LINEAL antes del mapeo tonal: recorta todo lo que pasa de 1 (los neones
 *     se quedan planos y cambian de tono) y deja sólo un puñado de escalones en los negros (la niebla
 *     de noche sale a bandas). El lienzo, en cambio, ya tiene el color mapeado y en sRGB, con el
 *     antidentado del propio lienzo, y es exactamente la imagen de N0: N1 es N0 más cosas, nunca otra
 *     imagen. Si el navegador no deja copiar el lienzo (un lienzo sin canal alfa, por ejemplo), se ve
 *     en el primer fotograma con `getError`, se dice en `aviso()` y el camino se queda en la escena
 *     sola, que sigue siendo jugable.
 *
 *   · PLENO (N2-N3), sólo si el sondeo CREÓ un blanco HalfFloat (`camino.ts`). El `EffectComposer` de
 *     three con blancos de media coma flotante: la escena en lineal y sin techo, [N3: oclusión a media
 *     resolución], `UnrealBloomPass` en lineal (a media resolución de más en N2), el uber con el ACES y
 *     la curva sRGB dentro (`ENTRADA_HDR`), y SMAA al final, ya sobre el color de pantalla. En N3 la
 *     escena se pinta con textura de profundidad, que usan la oclusión (reconstruye las normales desde
 *     ella: no se vuelve a pintar la escena) y el enfoque del Remanso.
 *
 *     ¡Ojo con el orden en N3! El compositor alterna dos blancos, y cada uno lleva SU textura de
 *     profundidad pegada. Si entre la escena y el uber hubiera un pase que intercambia blancos (el
 *     `GTAOPass` de fábrica compone la oclusión en el otro blanco e intercambia), el uber escribiría
 *     justo en el blanco cuya profundidad está leyendo: WebGL lo rechaza («Feedback loop formed
 *     between Framebuffer and active Texture») y el fotograma sale NEGRO, sin excepción en JS. Se vio
 *     así en el banco. Por eso la oclusión sólo CALCULA su textura (salida `Off`, sin intercambio) y
 *     la multiplica el uber: entre la escena y el uber no se intercambia nada, y el uber siempre
 *     escribe en el blanco que no está leyendo.
 *
 * ═══ LA CAPA NÍTIDA ═══
 *
 * Lo que está SÓLO en la capa `CAPA_NITIDA` (31) no se pinta con la escena: se pinta al final, encima
 * de todo, sin posproceso, sin mapeo tonal y sin luces de la escena. Es para lo que tiene que leerse igual en
 * todos los niveles y NO desaturarse en el Remanso ni desenfocarse: los anillos que avisan del golpe,
 * las líneas de apuntado, el contorno en glifos de los enemigos («desaturación del 70 % salvo los
 * enemigos, perfilados en glifos», §8). Va igual en los tres caminos (se limpia la profundidad antes),
 * así que una señal de juego no depende del nivel. Sus materiales no deben mirar luces ni niebla, y su
 * color es el de pantalla tal cual (entre 0 y 1: por encima no hay brillo que lo recoja).
 *
 * ═══ LA CUENTA ═══
 *
 * Cada camino cuenta su fotograma con `medida.ts`: la escena sola (lo que se compara con los topes) y
 * el total con los pases. Ver allí por qué hace falta.
 *
 * ═══ TAMAÑO ═══
 *
 * Todo se mide en píxeles del búfer de dibujo (`getDrawingBufferSize`), que ya lleva el DPR dentro, y
 * se mira en CADA fotograma (es comparar dos números): cuando el gobernador cambia el DPR o la ventana
 * cambia de tamaño, los blancos se rehacen en el mismo fotograma, sin esperar a un efecto de React.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { NivelDeCalidad } from '../calidad/niveles';
import type { CapacidadesDelAparato } from '../calidad/capacidades';
import { apuntarLaCuenta } from '../calidad/medida';
import type { CaminoDelPosproceso } from './camino';
import { caminoPara } from './camino';
import { LADO_DE_LA_LUT, tablaDeLaLut } from './gradacion';
import type { UniformeDeDesenfocar, UniformeDeExtraer, UniformeDelUber, UniformeDelVelo } from './sombreadores';
import { DESENFOCAR, EXTRAER, UBER, VELO, VERTICE_DE_PANTALLA } from './sombreadores';
import { falloDelTono, ponerElTonoPropio } from './tono';
import { UNIFORMES_DE_LA_CIUDAD } from '../ciudad/retoques';

/** La capa de lo que se pinta al final, nítido y sin posproceso. Ver la cabecera. */
export const CAPA_NITIDA = 31;

/** Lo que se puede afinar de la imagen sin rehacer el compositor (se lee en cada fotograma). */
export interface AjustesDeLaImagen {
  /** Cuánto oscurece la viñeta en las esquinas (0-1). */
  readonly vineta: number;
  /** Amplitud del grano en pantalla (0-1; 0,03 ya se ve). */
  readonly grano: number;
  /** Aberración cromática en el borde, en fracción de la imagen. */
  readonly aberracion: number;
  /** Cuánto de la LUT se aplica (1 = toda). */
  readonly fuerzaDeLaLut: number;
  /** El brillo del camino pleno, en lineal: `UnrealBloomPass`. */
  readonly brillo: { readonly fuerza: number; readonly radio: number; readonly umbral: number };
  /** El brillo barato de N1, sobre el color de pantalla. */
  readonly brilloBarato: { readonly fuerza: number; readonly umbral: number; readonly rodilla: number };
  /** En N3, a cuántos metros del foco el enfoque del Remanso ya desenfoca del todo. */
  readonly rangoDelFocoM: number;
  /** En N3, cuánto oscurece la oclusión ambiental (0-1). */
  readonly oclusion: number;
  /** En N3, cuánto se ve el reflejo en pantalla del suelo mojado (0-1). */
  readonly reflejos: number;
}

/** El aspecto de la noche. Provisional hasta el banco en aparato; se afina AQUÍ o por `ajustes`. */
export const IMAGEN_DE_LA_NOCHE: AjustesDeLaImagen = {
  vineta: 0.32,
  grano: 0.03,
  aberracion: 0.0015,
  fuerzaDeLaLut: 1,
  /*
   * Afinados en el banco para que N1, N2 y N3 den un brillo parecido sobre la misma calle (media de
   * luma de la imagen: N0 13, N1 ~16, N2 ~17, N3 ~17). N0 no tiene brillo: es la sobria. El umbral
   * del barato no baja de 0,62 a propósito: en pantalla, un gris medio ya es 0,73, y con un umbral
   * más bajo una superficie clara grande (el cielo del Amanecer) se velaría entera.
   */
  brillo: { fuerza: 0.4, radio: 0.4, umbral: 1 },
  brilloBarato: { fuerza: 2, umbral: 0.62, rodilla: 0.2 },
  rangoDelFocoM: 6,
  oclusion: 0.8,
  reflejos: 0.85,
};

/** Lo que cambia en cada fotograma. */
export interface LoDeEsteFotograma {
  /** 0 fuera del Remanso, 1 en su pico. */
  readonly remanso: number;
  /** Distancia del foco en metros (N3). */
  readonly foco: number;
  /** Un entero que cambia en cada fotograma: mueve el grano. */
  readonly semilla: number;
  readonly capaNitida: boolean;
  readonly ajustes: AjustesDeLaImagen;
}

export interface Compositor {
  readonly camino: CaminoDelPosproceso;
  /** Qué no es como el nivel pedía, o null. Puede aparecer tras el primer fotograma (N1). */
  aviso(): string | null;
  pintar(escena: THREE.Scene, camara: THREE.Camera, fotograma: LoDeEsteFotograma): void;
  /** Suelta todo lo que reservó en la gráfica y deja el renderizador como lo encontró. */
  liberar(): void;
}

export function crearElCompositor(
  renderer: THREE.WebGLRenderer,
  nivel: NivelDeCalidad,
  capacidades: CapacidadesDelAparato,
): Compositor {
  const elegido = caminoPara(nivel, capacidades.mediaFlotante);
  if (elegido.camino === 'directo') return new CaminoDirecto(renderer);
  if (elegido.camino === 'barato') return new CaminoBarato(renderer, elegido.aviso);
  return new CaminoPleno(renderer, elegido.oclusion, elegido.enfoqueConProfundidad, elegido.brilloReducido, elegido.reflejos);
}

/* ─────────────────────────────── Lo común ─────────────────────────────── */

type Uniformes<K extends string> = Record<K, THREE.IUniform>;

function uniformesDe<K extends string>(valores: Record<K, unknown>): Uniformes<K> {
  const salida = {} as Uniformes<K>;
  for (const llave of Object.keys(valores) as K[]) salida[llave] = { value: valores[llave] };
  return salida;
}

function materialDePantalla(nombre: string, fragmento: string, uniformes: Record<string, THREE.IUniform>, defines?: Record<string, string>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: nombre,
    defines: defines ?? {},
    uniforms: uniformes,
    vertexShader: VERTICE_DE_PANTALLA,
    fragmentShader: fragmento,
    depthTest: false,
    depthWrite: false,
    /* El mapeo tonal lo hace el uber a mano cuando toca: que three no lo meta por su cuenta. */
    toneMapped: false,
  });
}

/** La LUT de la noche como textura 3D. Los bytes se calculan una vez por página (32³, unos ms). */
let bytesDeLaLut: Uint8Array | null = null;
function texturaDeLaLut(): THREE.Data3DTexture {
  bytesDeLaLut ??= tablaDeLaLut(LADO_DE_LA_LUT);
  const lut = new THREE.Data3DTexture(bytesDeLaLut, LADO_DE_LA_LUT, LADO_DE_LA_LUT, LADO_DE_LA_LUT);
  lut.name = 'quiebro.lut';
  lut.format = THREE.RGBAFormat;
  lut.type = THREE.UnsignedByteType;
  lut.minFilter = THREE.LinearFilter;
  lut.magFilter = THREE.LinearFilter;
  lut.wrapS = THREE.ClampToEdgeWrapping;
  lut.wrapT = THREE.ClampToEdgeWrapping;
  lut.wrapR = THREE.ClampToEdgeWrapping;
  lut.generateMipmaps = false;
  lut.unpackAlignment = 1;
  lut.colorSpace = THREE.NoColorSpace;
  lut.needsUpdate = true;
  return lut;
}

/** El uber con sus uniformes, para los caminos barato y pleno. */
function crearElUber(lut: THREE.Data3DTexture, defines: Record<string, string>): {
  readonly material: THREE.ShaderMaterial;
  readonly u: Uniformes<UniformeDelUber>;
} {
  const u = uniformesDe<UniformeDelUber>({
    tEntrada: null,
    tLut: lut,
    tBrillo: null,
    tProfundidad: null,
    uResolucion: new THREE.Vector2(1, 1),
    uSemilla: 0,
    uRemanso: 0,
    uVineta: IMAGEN_DE_LA_NOCHE.vineta,
    uGrano: IMAGEN_DE_LA_NOCHE.grano,
    uAberracion: IMAGEN_DE_LA_NOCHE.aberracion,
    uFuerzaDeLaLut: IMAGEN_DE_LA_NOCHE.fuerzaDeLaLut,
    uFuerzaDelBrillo: IMAGEN_DE_LA_NOCHE.brilloBarato.fuerza,
    uCerca: 0.1,
    uLejos: 1000,
    uFoco: 4.5,
    uRangoDelFoco: IMAGEN_DE_LA_NOCHE.rangoDelFocoM,
    tOclusion: null,
    uOclusion: IMAGEN_DE_LA_NOCHE.oclusion,
    uProyeccion: new THREE.Matrix4(),
    uProyeccionInversa: new THREE.Matrix4(),
    uVistaInversa: new THREE.Matrix4(),
    uReflejos: 0,
    uHumedad: 0.5,
  });
  /* `toneMappingExposure` lo declara el trozo de three que el uber incluye con `ENTRADA_HDR`. */
  const material = materialDePantalla('quiebro.uber', UBER, { ...u, toneMappingExposure: { value: 1 } }, defines);
  return { material, u };
}

/**
 * La exposición del uber es la del renderizador: N0 y N1 la aplican en cada material (el ACES de three
 * la lee de `toneMappingExposure`) y el uber de N2-N3 la tenía fija en 1, así que N2 y N3 salían un 10 %
 * más oscuros que N0 y N1 con la misma escena (el juego pone 1,1). Ahora es la misma en los tres caminos.
 */
function exposicionDelUber(material: THREE.ShaderMaterial, renderer: THREE.WebGLRenderer): void {
  const u = material.uniforms['toneMappingExposure'];
  if (u !== undefined) u.value = renderer.toneMappingExposure;
}

/** Lo que cambia por fotograma en el uber, igual en los dos caminos que lo usan. */
function alimentarElUber(u: Uniformes<UniformeDelUber>, f: LoDeEsteFotograma): void {
  u.uRemanso.value = Math.min(1, Math.max(0, f.remanso));
  u.uSemilla.value = f.semilla;
  u.uVineta.value = f.ajustes.vineta;
  u.uGrano.value = f.ajustes.grano;
  u.uAberracion.value = f.ajustes.aberracion;
  u.uFuerzaDeLaLut.value = f.ajustes.fuerzaDeLaLut;
  u.uFuerzaDelBrillo.value = f.ajustes.brilloBarato.fuerza;
  u.uFoco.value = f.foco;
  u.uRangoDelFoco.value = Math.max(0.1, f.ajustes.rangoDelFocoM);
  u.uOclusion.value = Math.min(1, Math.max(0, f.ajustes.oclusion));
}

/**
 * Cuenta el fotograma entero: `autoReset` apagado SÓLO mientras pinta este compositor, la escena
 * apuntada cuando quien pinta llama a `apuntarLaEscena`, y el total al acabar. Al salir, `info.render`
 * se queda con el total (ver `calidad/medida.ts`).
 */
function contando(renderer: THREE.WebGLRenderer, pintar: (apuntarLaEscena: () => void) => void): void {
  const info = renderer.info;
  const antes = info.autoReset;
  info.autoReset = false;
  info.reset();
  let llamadasDeLaEscena = -1;
  let triangulosDeLaEscena = -1;
  try {
    pintar(() => {
      llamadasDeLaEscena = info.render.calls;
      triangulosDeLaEscena = info.render.triangles;
    });
    apuntarLaCuenta(renderer, {
      llamadasDeLaEscena: llamadasDeLaEscena < 0 ? info.render.calls : llamadasDeLaEscena,
      triangulosDeLaEscena: triangulosDeLaEscena < 0 ? info.render.triangles : triangulosDeLaEscena,
      llamadas: info.render.calls,
      triangulos: info.render.triangles,
      fotograma: info.render.frame,
    });
  } finally {
    info.autoReset = antes;
  }
}

/**
 * La capa nítida: encima de todo, sin posproceso, SIN mapeo tonal y sin fondo. Sin mapeo porque son
 * señales, no luz: el ACES lava un ámbar de (1; 0,55; 0,12) a un beis (230, 203, 129) que ya no se
 * lee como ámbar, y el color que el efecto pide tiene que ser el que sale, igual en los cuatro niveles.
 */
function pintarLaCapaNitida(renderer: THREE.WebGLRenderer, escena: THREE.Scene, camara: THREE.Camera): void {
  const mascara = camara.layers.mask;
  const fondo = escena.background;
  const limpiar = renderer.autoClear;
  const tono = renderer.toneMapping;
  try {
    camara.layers.set(CAPA_NITIDA);
    /* Un fondo de textura o de cubo se pinta como una malla más: taparía la imagen entera. */
    escena.background = null;
    renderer.autoClear = false;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setRenderTarget(null);
    renderer.clearDepth();
    renderer.render(escena, camara);
  } finally {
    camara.layers.mask = mascara;
    escena.background = fondo;
    renderer.autoClear = limpiar;
    renderer.toneMapping = tono;
  }
}

function aspectoDe(tamano: THREE.Vector2): number {
  return tamano.y > 0 ? tamano.x / tamano.y : 1;
}

/* ─────────────────────────────── N0: directo ─────────────────────────────── */

class CaminoDirecto implements Compositor {
  readonly camino = 'directo' as const;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly tonoAntes: THREE.ToneMapping;
  private readonly u: Uniformes<UniformeDelVelo>;
  private readonly velo: THREE.ShaderMaterial;
  private readonly cuadro: FullScreenQuad;
  private readonly tamano = new THREE.Vector2();
  private readonly elAviso: string | null;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.tonoAntes = renderer.toneMapping;
    const conTonoPropio = ponerElTonoPropio();
    renderer.toneMapping = conTonoPropio ? THREE.CustomToneMapping : THREE.ACESFilmicToneMapping;
    this.elAviso = conTonoPropio ? null : falloDelTono();
    this.u = uniformesDe<UniformeDelVelo>({ uRemanso: 0, uAspecto: 1 });
    this.velo = materialDePantalla('quiebro.velo', VELO, this.u);
    /* Lo que sale del velo MULTIPLICA el lienzo: destino × origen. */
    this.velo.blending = THREE.CustomBlending;
    this.velo.blendEquation = THREE.AddEquation;
    this.velo.blendSrc = THREE.ZeroFactor;
    this.velo.blendDst = THREE.SrcColorFactor;
    this.velo.transparent = true;
    this.cuadro = new FullScreenQuad(this.velo);
  }

  aviso(): string | null {
    return this.elAviso;
  }

  pintar(escena: THREE.Scene, camara: THREE.Camera, f: LoDeEsteFotograma): void {
    const r = this.renderer;
    contando(r, (apuntarLaEscena) => {
      r.setRenderTarget(null);
      r.render(escena, camara);
      apuntarLaEscena();
      if (f.remanso > 0.001) {
        r.getDrawingBufferSize(this.tamano);
        this.u.uRemanso.value = Math.min(1, f.remanso);
        this.u.uAspecto.value = aspectoDe(this.tamano);
        const limpiar = r.autoClear;
        r.autoClear = false;
        this.cuadro.render(r);
        r.autoClear = limpiar;
      }
      if (f.capaNitida) pintarLaCapaNitida(r, escena, camara);
    });
  }

  liberar(): void {
    this.renderer.toneMapping = this.tonoAntes;
    this.velo.dispose();
    this.cuadro.dispose();
  }
}

/* ─────────────────────────────── N1: barato ─────────────────────────────── */

class CaminoBarato implements Compositor {
  readonly camino = 'barato' as const;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly tonoAntes: THREE.ToneMapping;
  private readonly lut: THREE.Data3DTexture;
  private readonly uber: { readonly material: THREE.ShaderMaterial; readonly u: Uniformes<UniformeDelUber> };
  private readonly uExtraer: Uniformes<UniformeDeExtraer>;
  private readonly extraer: THREE.ShaderMaterial;
  private readonly uDesenfocar: Uniformes<UniformeDeDesenfocar>;
  private readonly desenfocar: THREE.ShaderMaterial;
  private readonly brilloA: THREE.WebGLRenderTarget;
  private readonly brilloB: THREE.WebGLRenderTarget;
  private readonly cuadro: FullScreenQuad;
  private copia: THREE.FramebufferTexture | null = null;
  private readonly tamano = new THREE.Vector2();
  private ancho = 0;
  private alto = 0;
  private comprobado = false;
  private roto: string | null = null;
  private readonly avisoDelCamino: string | null;

  constructor(renderer: THREE.WebGLRenderer, avisoDelCamino: string | null) {
    this.renderer = renderer;
    this.avisoDelCamino = avisoDelCamino;
    this.tonoAntes = renderer.toneMapping;
    /* La escena se mapea en el material, como en N0, pero sin gradación: la pone la LUT. */
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.lut = texturaDeLaLut();
    this.uber = crearElUber(this.lut, { BRILLO_PROPIO: '' });
    this.uExtraer = uniformesDe<UniformeDeExtraer>({
      tEntrada: null,
      uTexel: new THREE.Vector2(1, 1),
      uUmbral: IMAGEN_DE_LA_NOCHE.brilloBarato.umbral,
      uRodilla: IMAGEN_DE_LA_NOCHE.brilloBarato.rodilla,
    });
    this.extraer = materialDePantalla('quiebro.extraer', EXTRAER, this.uExtraer);
    this.uDesenfocar = uniformesDe<UniformeDeDesenfocar>({ tEntrada: null, uPaso: new THREE.Vector2(0, 0) });
    this.desenfocar = materialDePantalla('quiebro.desenfocar', DESENFOCAR, this.uDesenfocar);
    const opciones = { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.brilloA = new THREE.WebGLRenderTarget(1, 1, opciones);
    this.brilloB = new THREE.WebGLRenderTarget(1, 1, opciones);
    this.brilloA.texture.name = 'quiebro.brillo.a';
    this.brilloB.texture.name = 'quiebro.brillo.b';
    this.cuadro = new FullScreenQuad(this.extraer);
  }

  aviso(): string | null {
    if (this.roto !== null) return this.roto;
    return this.avisoDelCamino;
  }

  /** Rehace la copia y los blancos del brillo si el búfer de dibujo cambió de tamaño. */
  private medir(): THREE.FramebufferTexture {
    this.renderer.getDrawingBufferSize(this.tamano);
    const ancho = Math.max(1, this.tamano.x);
    const alto = Math.max(1, this.tamano.y);
    if (this.copia !== null && ancho === this.ancho && alto === this.alto) return this.copia;
    this.ancho = ancho;
    this.alto = alto;
    this.copia?.dispose();
    const copia = new THREE.FramebufferTexture(ancho, alto);
    copia.name = 'quiebro.copia-del-lienzo';
    /* Bilineal: la aberración y la distorsión leen entre píxeles. */
    copia.minFilter = THREE.LinearFilter;
    copia.magFilter = THREE.LinearFilter;
    this.copia = copia;
    const cuartoAncho = Math.max(1, Math.floor(ancho / 4));
    const cuartoAlto = Math.max(1, Math.floor(alto / 4));
    this.brilloA.setSize(cuartoAncho, cuartoAlto);
    this.brilloB.setSize(cuartoAncho, cuartoAlto);
    (this.uExtraer.uTexel.value as THREE.Vector2).set(1 / ancho, 1 / alto);
    (this.uber.u.uResolucion.value as THREE.Vector2).set(ancho, alto);
    return copia;
  }

  pintar(escena: THREE.Scene, camara: THREE.Camera, f: LoDeEsteFotograma): void {
    const r = this.renderer;
    const copia = this.medir();
    contando(r, (apuntarLaEscena) => {
      r.setRenderTarget(null);
      r.render(escena, camara);
      apuntarLaEscena();
      if (this.roto === null) this.copiarElLienzo(copia);
      if (this.roto === null) {
        this.pintarElBrillo(copia, f);
        alimentarElUber(this.uber.u, f);
        this.uber.u.tEntrada.value = copia;
        this.uber.u.tBrillo.value = this.brilloA.texture;
        this.cuadro.material = this.uber.material;
        r.setRenderTarget(null);
        this.cuadro.render(r);
      }
      if (f.capaNitida) pintarLaCapaNitida(r, escena, camara);
    });
  }

  private copiarElLienzo(copia: THREE.FramebufferTexture): void {
    const r = this.renderer;
    const gl = r.getContext();
    /*
     * LA UNIDAD DE TEXTURA ACTIVA, A MANO. `copyFramebufferToTexture` de three r185 liga la copia en
     * la unidad 0 con `setTexture2D(textura, 0)`, pero si la copia YA estaba ligada ahí (la caché de
     * three lo sabe) se salta también el `activeTexture`, y la unidad activa se queda en la última
     * que usó el uber (la 2). `copyTexSubImage2D` escribe en la textura ligada a la unidad ACTIVA: la
     * del brillo, de un cuarto de tamaño, y WebGL la rechaza con INVALID_VALUE. El primer fotograma
     * copiaba bien (la copia se subía entonces y quedaba activa la 0) y todos los siguientes no:
     * N1 se quedaba CONGELADO en su primer fotograma, con el anillo y el grano moviéndose encima.
     * Lo cazó `autoprueba.ts` con `getError`; a ojo no se veía.
     */
    r.state.activeTexture(gl.TEXTURE0);
    if (this.comprobado) {
      r.copyFramebufferToTexture(copia);
      return;
    }
    /*
     * La primera vez se mira si la copia funciona: `getError` obliga a esperar a la gráfica, así que
     * sólo se llama aquí. El primero limpia cualquier error anterior que no sea de la copia.
     */
    gl.getError();
    r.copyFramebufferToTexture(copia);
    const error = gl.getError();
    this.comprobado = true;
    if (error !== gl.NO_ERROR) {
      this.roto =
        `el lienzo no se deja copiar (error ${String(error)} de WebGL; ¿lienzo sin canal alfa?): ` +
        'N1 se queda en la escena sola, sin brillo ni gradación';
      console.warn(`[quiebro/posproceso] ${this.roto}`);
    }
  }

  private pintarElBrillo(copia: THREE.FramebufferTexture, f: LoDeEsteFotograma): void {
    const r = this.renderer;
    this.uExtraer.tEntrada.value = copia;
    this.uExtraer.uUmbral.value = f.ajustes.brilloBarato.umbral;
    this.uExtraer.uRodilla.value = Math.max(0.001, f.ajustes.brilloBarato.rodilla);
    this.cuadro.material = this.extraer;
    r.setRenderTarget(this.brilloA);
    this.cuadro.render(r);
    /* Dos rondas de gaussiana en cruz, la segunda con el paso más largo: un halo ancho por poco. */
    const paso = this.uDesenfocar.uPaso.value as THREE.Vector2;
    this.cuadro.material = this.desenfocar;
    for (const escala of [1, 2.5]) {
      this.uDesenfocar.tEntrada.value = this.brilloA.texture;
      paso.set(escala / this.brilloA.width, 0);
      r.setRenderTarget(this.brilloB);
      this.cuadro.render(r);
      this.uDesenfocar.tEntrada.value = this.brilloB.texture;
      paso.set(0, escala / this.brilloA.height);
      r.setRenderTarget(this.brilloA);
      this.cuadro.render(r);
    }
  }

  liberar(): void {
    this.renderer.toneMapping = this.tonoAntes;
    this.copia?.dispose();
    this.copia = null;
    this.brilloA.dispose();
    this.brilloB.dispose();
    this.extraer.dispose();
    this.desenfocar.dispose();
    this.uber.material.dispose();
    this.lut.dispose();
    this.cuadro.dispose();
  }
}

/* ─────────────────────────────── N2-N3: pleno ─────────────────────────────── */

/** El pase de la escena, que además avisa de cuándo acaba y recuerda dónde dejó la profundidad. */
class PaseDeEscena extends RenderPass {
  alPintar: (() => void) | null = null;
  profundidad: THREE.DepthTexture | null = null;

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean,
  ): void {
    /*
     * El compositor alterna sus dos blancos: la profundidad de ESTE fotograma está en el blanco en
     * el que se pinta ahora, y hay que apuntarla ahora (tras el pase siguiente ya no es el de lectura).
     */
    this.profundidad = readBuffer.depthTexture;
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    this.alPintar?.();
  }
}

/** El uber como pase del compositor. Lee la profundidad de la escena si se la dan. */
class PaseUber extends Pass {
  private readonly material: THREE.ShaderMaterial;
  private readonly u: Uniformes<UniformeDelUber>;
  private readonly cuadro: FullScreenQuad;
  private readonly profundidad: (() => THREE.Texture | null) | null;

  constructor(uber: { readonly material: THREE.ShaderMaterial; readonly u: Uniformes<UniformeDelUber> }, profundidad: (() => THREE.Texture | null) | null) {
    super();
    this.material = uber.material;
    this.u = uber.u;
    this.cuadro = new FullScreenQuad(this.material);
    this.profundidad = profundidad;
  }

  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    this.u.tEntrada.value = readBuffer.texture;
    if (this.profundidad !== null) this.u.tProfundidad.value = this.profundidad();
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.cuadro.render(renderer);
  }

  override setSize(ancho: number, alto: number): void {
    (this.u.uResolucion.value as THREE.Vector2).set(ancho, alto);
  }

  override dispose(): void {
    this.material.dispose();
    this.cuadro.dispose();
  }
}

/**
 * El brillo de three a la mitad de la resolución que le toca (N2): su primer nivel queda a ¼. Cada
 * nivel del brillo cubre así el doble de pantalla y el halo sale más ancho y más luminoso con la
 * misma fuerza; `COMPENSACION_DEL_BRILLO_REDUCIDO` lo devuelve a lo de N3 (medido en el banco).
 */
const COMPENSACION_DEL_BRILLO_REDUCIDO = 0.55;
class BrilloReducido extends UnrealBloomPass {
  override setSize(ancho: number, alto: number): void {
    super.setSize(Math.max(1, Math.floor(ancho / 2)), Math.max(1, Math.floor(alto / 2)));
  }
}

/**
 * La oclusión de three a media resolución y SIN volver a pintar la escena: lee la profundidad que ya
 * dejó el pase de la escena y reconstruye las normales desde ella. `GTAOPass` de r185 revienta si se
 * le da la profundidad en el constructor (usa su g-buffer propio, que entonces no existe), así que se
 * construye con el suyo en 1×1 y se le cambia en el primer fotograma; su g-buffer propio se queda en
 * un píxel, sin uso.
 *
 * Y NO compone: con la salida `Off` sólo deja la oclusión en `gtaoMap`, sin tocar los blancos del
 * compositor ni intercambiarlos, y el uber la multiplica. La cabecera cuenta por qué (el bucle de
 * realimentación con la profundidad que deja el fotograma en negro).
 */
class OclusionAMedia extends GTAOPass {
  private puesta: THREE.DepthTexture | null = null;

  constructor(escena: THREE.Scene, camara: THREE.Camera) {
    super(escena, camara, 1, 1);
    this.output = GTAOPass.OUTPUT.Off;
    this.needsSwap = false;
    this.updateGtaoMaterial({ radius: 0.6, samples: 12 });
  }

  override setSize(ancho: number, alto: number): void {
    super.setSize(Math.max(1, Math.floor(ancho / 2)), Math.max(1, Math.floor(alto / 2)));
    (this as unknown as { readonly normalRenderTarget?: THREE.WebGLRenderTarget }).normalRenderTarget?.setSize(1, 1);
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean,
  ): void {
    const profundidad = readBuffer.depthTexture;
    if (profundidad !== null && profundidad !== this.puesta) {
      const primera = this.puesta === null;
      this.setGBuffer(profundidad);
      /* La primera vez cambian los `defines` (normales desde la profundidad): hay que recompilar. */
      if (primera) {
        this.gtaoMaterial.needsUpdate = true;
        this.pdMaterial.needsUpdate = true;
      }
      this.puesta = profundidad;
    }
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  }
}

class CaminoPleno implements Compositor {
  readonly camino = 'pleno' as const;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly tonoAntes: THREE.ToneMapping;
  private readonly lut: THREE.Data3DTexture;
  private readonly compositor: EffectComposer;
  private readonly escena: PaseDeEscena;
  private readonly oclusion: OclusionAMedia | null;
  private readonly brillo: UnrealBloomPass;
  private readonly uber: { readonly material: THREE.ShaderMaterial; readonly u: Uniformes<UniformeDelUber> };
  private readonly paseUber: PaseUber;
  private readonly smaa: SMAAPass;
  private readonly tamano = new THREE.Vector2();
  private ancho = 0;
  private alto = 0;

  private readonly conReflejos: boolean;

  constructor(renderer: THREE.WebGLRenderer, conOclusion: boolean, conProfundidad: boolean, brilloReducido: boolean, conReflejos = false) {
    this.renderer = renderer;
    this.tonoAntes = renderer.toneMapping;
    /* La escena va a un blanco (sin mapeo en el material): el ACES lo pone el uber a mano. */
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.lut = texturaDeLaLut();

    /* El reflejo del suelo lee la profundidad: sin ella no hay reflejo (y no se pide). */
    this.conReflejos = conReflejos && conProfundidad;
    const quiereProfundidad = conOclusion || conProfundidad;
    const blanco = quiereProfundidad
      ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(1, 1) })
      : new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    blanco.texture.name = 'quiebro.escena';
    this.compositor = new EffectComposer(renderer, blanco);
    /* Se mide en píxeles del búfer de dibujo, que ya llevan el DPR: el compositor, a 1. */
    this.compositor.setPixelRatio(1);

    const escenaVacia = new THREE.Scene();
    const camaraVacia = new THREE.PerspectiveCamera();
    this.escena = new PaseDeEscena(escenaVacia, camaraVacia);
    this.compositor.addPass(this.escena);

    this.oclusion = conOclusion ? new OclusionAMedia(escenaVacia, camaraVacia) : null;
    if (this.oclusion !== null) this.compositor.addPass(this.oclusion);

    const b = IMAGEN_DE_LA_NOCHE.brillo;
    this.brillo = brilloReducido
      ? new BrilloReducido(new THREE.Vector2(256, 256), b.fuerza, b.radio, b.umbral)
      : new UnrealBloomPass(new THREE.Vector2(256, 256), b.fuerza, b.radio, b.umbral);
    this.compositor.addPass(this.brillo);

    const defines: Record<string, string> = { ENTRADA_HDR: '' };
    if (conProfundidad) defines['CON_PROFUNDIDAD'] = '';
    if (this.conReflejos) defines['CON_REFLEJOS'] = '';
    if (this.oclusion !== null) defines['CON_OCLUSION'] = '';
    this.uber = crearElUber(this.lut, defines);
    if (this.oclusion !== null) this.uber.u.tOclusion.value = this.oclusion.gtaoMap;
    this.paseUber = new PaseUber(this.uber, conProfundidad ? () => this.escena.profundidad : null);
    this.compositor.addPass(this.paseUber);

    this.smaa = new SMAAPass();
    this.compositor.addPass(this.smaa);
  }

  aviso(): string | null {
    return null;
  }

  private medir(): void {
    this.renderer.getDrawingBufferSize(this.tamano);
    const ancho = Math.max(1, this.tamano.x);
    const alto = Math.max(1, this.tamano.y);
    if (ancho === this.ancho && alto === this.alto) return;
    this.ancho = ancho;
    this.alto = alto;
    this.compositor.setSize(ancho, alto);
  }

  pintar(escena: THREE.Scene, camara: THREE.Camera, f: LoDeEsteFotograma): void {
    const r = this.renderer;
    this.medir();
    this.escena.scene = escena;
    this.escena.camera = camara;
    if (this.oclusion !== null) {
      this.oclusion.scene = escena;
      this.oclusion.camera = camara;
    }
    this.brillo.strength = f.ajustes.brillo.fuerza * (this.brillo instanceof BrilloReducido ? COMPENSACION_DEL_BRILLO_REDUCIDO : 1);
    this.brillo.radius = f.ajustes.brillo.radio;
    this.brillo.threshold = f.ajustes.brillo.umbral;
    const u = this.uber.u;
    alimentarElUber(u, f);
    exposicionDelUber(this.uber.material, r);
    if (camara instanceof THREE.PerspectiveCamera) {
      u.uCerca.value = camara.near;
      u.uLejos.value = camara.far;
    }
    if (this.conReflejos) {
      (u.uProyeccion.value as THREE.Matrix4).copy(camara.projectionMatrix);
      (u.uProyeccionInversa.value as THREE.Matrix4).copy(camara.projectionMatrixInverse);
      (u.uVistaInversa.value as THREE.Matrix4).copy(camara.matrixWorld);
      u.uHumedad.value = UNIFORMES_DE_LA_CIUDAD.uHumedad.value;
      u.uReflejos.value = f.ajustes.reflejos;
    }
    contando(r, (apuntarLaEscena) => {
      this.escena.alPintar = apuntarLaEscena;
      try {
        this.compositor.render();
      } finally {
        this.escena.alPintar = null;
      }
      if (f.capaNitida) pintarLaCapaNitida(r, escena, camara);
    });
  }

  liberar(): void {
    this.renderer.toneMapping = this.tonoAntes;
    this.compositor.dispose();
    this.escena.dispose();
    this.oclusion?.dispose();
    this.brillo.dispose();
    this.paseUber.dispose();
    this.smaa.dispose();
    /* Los blancos del compositor sueltan con ellos sus texturas de profundidad. */
    this.lut.dispose();
  }
}
