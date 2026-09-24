/**
 * LA CIUDAD ABIERTA, CONSTRUIDA: de la ciudad de una noche (la del contrato de la columna) y un nivel, todo
 * lo que se pinta —la ventana de celdas, lo lejano, el suelo entero, el borde de glifos, la luz por losetas
 * y lo que sigue a la ventana (tarjetas, halos, vapor, haces)— con sus renglones y su trabajo por fotograma.
 * Es a la ciudad de 540 m lo que `construir.ts` es al barrio de hoy, y conserva su aspecto: los mismos
 * materiales, los mismos retoques, la misma luz horneada y la misma paleta de las dos luces (madrugada y
 * alba), que salen de la hora de la noche como en el barrio.
 *
 * ═══ DE DÓNDE SALE LA CIUDAD ═══
 *
 * `ciudadParaPintar` pide la ciudad de verdad (`ciudadDeLaMesa` y `ciudadDeLaNoche` de la columna) y, sólo
 * mientras el frente Traza no la ha escrito (lanza `CiudadSinEscribir`), pinta la sintética de
 * `sintetica.ts`, con la misma forma. Lo dice en `origen`: el banco lo enseña y el comprobador lo apunta. En
 * cuanto la traza exista, el pintor la pinta sin tocar nada aquí.
 *
 * ═══ LAS LLAMADAS ═══
 *
 * Cinco de la ventana (fachadas, mobiliario, emisivo, cristal y neones), una de lo lejano, dos del suelo,
 * una del borde, el horizonte y la ciudad lejana, las tarjetas y los halos, el tren (dos) y el vapor, y en
 * N2+ los haces: 16 en N0, las mismas en cualquier sitio de la ciudad. El tráfico en marcha del barrio no
 * está: iba por las avenidas de fuera del barrio, y en la ciudad lo de fuera es el cerco (§2.5).
 *
 * ═══ LA BASE Y EL NIVEL ═══
 *
 * Construir una ciudad son unos 50-70 ms de PC, y casi todo NO depende del nivel: partirla en celdas (12 ms),
 * la geometría de lo lejano (11-17), el suelo, el borde y sus dos mapas (la oclusión sola, 25). Eso es la BASE
 * (`construirLaBase`), una por noche y compartida por los cuatro niveles (se cuenta quién la usa y la suelta
 * el último); la ciudad de un nivel (`construirLaCiudadAbierta`) son sus materiales, su ventana, lo que sigue
 * a la ventana y la luz: 5-15 ms sobre la base. La base de OTRA noche se construye a pasos de unos pocos
 * milisegundos (`construirLaBaseAPasos`), un paso por fotograma, mientras se sigue pintando la de antes.
 * Cuando el gobernador cambia de nivel a media noche, la ciudad nueva se hace sobre la base de la de antes y,
 * si su luz tiene el mismo téxel (N0 ↔ N1, N2 ↔ N3), la HEREDA (`losetas.ts`): sin rehacer lo que no cambia,
 * sin subir otra vez los mapas y sin volver a hornear la calle. Quién pasa de una ciudad a otra, cuándo, y
 * cuándo se suelta la vieja lo lleva `relevo.ts`.
 *
 * ═══ CALLADA ═══
 *
 * Los uniformes de la ciudad (la luz, los mapas, la ventana, el tiempo) son de TODOS los programas. Una ciudad
 * CALLADA (la que se prepara detrás mientras se pinta otra) trabaja igual, pero no los toca hasta `hablar`.
 */
import * as THREE from 'three';
import type { NocheDeLaCiudad } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import { CiudadSinEscribir, ciudadDeLaMesa, ciudadDeLaNoche, despejarLasPlazas, trenEnLaCiudad } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import type { NivelDeLaCiudad } from './tipos';
import { DETALLE_DEL_NIVEL } from './tipos';
import type { CeldaConstruida, Familia, PartesDeLaCiudad } from './celdas';
import { FAMILIAS, fuentesDeLaCeldaAPasos, partirLaCiudad } from './celdas';
import type { CapacidadDeLaFamilia, FotogramaDeLaVentana, SitioDeLaVentana } from './ventana';
import { PRISA_DEL_PRINCIPIO, VentanaDeCeldas } from './ventana';
import type { FotogramaDeLaLuz, FuentesDeUnaCelda } from './losetas';
import { LuzPorLosetas, PRISA_DE_LA_PRIMERA_LUZ, TEXELES_DE_LA_LUZ_POR_NIVEL } from './losetas';
import type { GeometriaDeLoLejano, LoLejano, SueloDeLaCiudad } from './lejos';
import { RETOQUE_DEL_FUNDIDO, alturasDeLaCiudad, construirElSueloDeLaCiudad, geometriaDeLoLejanoAPasos, mallaDeLoLejano, materialDeLoLejano, oclusionDeLaCiudadAPasos, CAJA_DE_LOS_MAPAS } from './lejos';
import type { AnilloDeLaCiudad } from './anillo-de-la-ciudad';
import { anilloDeLaCiudad } from './anillo-de-la-ciudad';
import type { BordeConstruido } from './borde';
import { geometriaDelBorde, mallaDelBorde } from './borde';
import type { SalidaDeAvenida } from './sintetica';
import { ciudadSintetica, nocheSintetica, salidasDe, trenSinteticoEn } from './sintetica';
import { atlasDeGlifos, materialDeLosNeones } from './neones';
import { guardarLosProgramas } from '../calidad/precompilar';
import type { AtlasDeGlifos } from './neones';
import { materialDeFachada } from './fachadas';
import { materialDelCristal, materialDelMobiliario, materialEmisivo } from './materiales';
import { materialDeLaAcera, materialDelAsfalto } from './suelo';
import { texturaDeAlturas, texturaDeOclusion, uniformeDeLaCaja } from './luz-de-la-calle';
import type { FuenteHorneada } from './luz-de-la-calle';
import { TarjetasDeReflejo, materialDeLasTarjetas } from './reflejos';
import { datosDeLosHalos, mallaDeHalos, materialDeLosHalos } from './halos';
import { Vapor } from './vapor';
import { crearLosHaces, datosDeLosHaces } from './haces';
import { Tren } from './tren';
import { CAJAS_LEJANAS, crearElHorizonte, crearLaCiudadLejana } from './anillo';
import { parchear } from '../atmosfera/parcheo';
import { UNIFORMES_DE_LA_CIUDAD } from './retoques';
import { rellenarInstancias, triangulosDe } from './geometria';
import type { CabezaDeFarola } from './fuentes';
import type { RenglonDeLaCiudad } from './presupuesto';
import { hashDeTexto, mezclar } from './azar';

/* ═══════════════════════════════ LA CIUDAD QUE SE PINTA ═══════════════════════════════ */

export interface CiudadParaPintar {
  readonly noche: NocheDeLaCiudad;
  /** `traza` si la dio `quiebro-ciudad.ts`; `sintetica` mientras el frente Traza no la escribe. */
  readonly origen: 'traza' | 'sintetica';
  readonly codigo: string;
  /** Dónde va el tren del Elevado en un tic. */
  readonly trenEn: (tic: number) => { readonly cabeza: number; readonly cola: number } | null;
}

/**
 * LA CIUDAD DE UNA NOCHE PARA PINTARLA: la de verdad si ya está escrita, la sintética si no. `fallos` y
 * `despejadas` como en el contrato (el primero, la plaza de la Bajada).
 */
export function ciudadParaPintar(traza: number, codigo: string, noche: number, fallos: readonly number[] = [], despejadas = false): CiudadParaPintar {
  try {
    const mesa = ciudadDeLaMesa(traza, codigo);
    const deLaNoche = ciudadDeLaNoche(mesa, codigo, noche, fallos);
    const n = despejadas ? despejarLasPlazas(deLaNoche) : deLaNoche;
    return { noche: n, origen: 'traza', codigo, trenEn: (tic) => trenEnLaCiudad(n, tic) };
  } catch (e) {
    if (!(e instanceof CiudadSinEscribir)) throw e;
    const mesa = ciudadSintetica(traza, codigo);
    const n = nocheSintetica(mesa, noche, fallos);
    return { noche: n, origen: 'sintetica', codigo, trenEn: (tic) => trenSinteticoEn(n.tren, tic) };
  }
}

/* ═══════════════════════════════ LO QUE CABE ═══════════════════════════════ */

/**
 * LO QUE CABE DE SALIDA EN CADA FAMILIA DE LA VENTANA (vértices e índices por mitad), por nivel: el peor de
 * todas las ventanas de las 32 trazas, medido por `verify:quiebro-ciudad`, más un 25 %. Si una ventana no
 * cabe, su malla crece (y el comprobador lo dice: no tiene que pasar).
 */
export const CAPACIDAD_DE_LA_VENTANA: Readonly<Record<NivelDeLaCiudad, Readonly<Record<Familia, CapacidadDeLaFamilia>>>> = {
  0: {
    fachadas: { vertices: 2_000, indices: 3_000 },
    mobiliario: { vertices: 28_500, indices: 56_500 },
    emisivo: { vertices: 2_900, indices: 4_500 },
    cristal: { vertices: 850, indices: 1_300 },
    neones: { vertices: 5_500, indices: 8_300 },
  },
  1: {
    fachadas: { vertices: 23_500, indices: 35_000 },
    mobiliario: { vertices: 70_500, indices: 142_000 },
    emisivo: { vertices: 2_900, indices: 4_500 },
    cristal: { vertices: 850, indices: 1_300 },
    neones: { vertices: 5_500, indices: 8_300 },
  },
  2: {
    fachadas: { vertices: 191_000, indices: 287_000 },
    mobiliario: { vertices: 116_500, indices: 234_000 },
    emisivo: { vertices: 4_800, indices: 7_300 },
    cristal: { vertices: 1_400, indices: 2_100 },
    neones: { vertices: 9_100, indices: 13_600 },
  },
  3: {
    fachadas: { vertices: 268_000, indices: 403_000 },
    mobiliario: { vertices: 181_000, indices: 395_000 },
    emisivo: { vertices: 7_200, indices: 11_200 },
    cristal: { vertices: 1_950, indices: 2_900 },
    neones: { vertices: 14_300, indices: 21_400 },
  },
};

/** Cuántas instancias caben de salida en lo que sigue a la ventana (tarjetas, halos, cabezas de farola). */
const INSTANCIAS_DE_SALIDA: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 600, 1: 700, 2: 1_100, 3: 1_600 };

/** Dónde empieza y acaba la ciudad lejana: pasadas las torres de detrás del cerco, y hasta el horizonte. */
const LEJANA_DESDE = 380;
const LEJANA_HASTA = 880;
/**
 * Cuántas cajas lejanas: la mitad que en el barrio. Allí la ciudad lejana empezaba a 190 m y llenaba la
 * primera imagen de la Bajada; aquí empieza a 380, detrás del cerco y de sus torres, casi toda en la niebla.
 */
const CAJAS_LEJANAS_DE_LA_CIUDAD: readonly [number, number, number, number] = [CAJAS_LEJANAS[0] / 2, CAJAS_LEJANAS[1] / 2, CAJAS_LEJANAS[2] / 2, CAJAS_LEJANAS[3] / 2];

/* ═══════════════════════════════ LA BASE: LO QUE NO DEPENDE DEL NIVEL ═══════════════════════════════ */

/**
 * LA BASE DE UNA CIUDAD: lo que comparten sus cuatro niveles (ver la cabecera). La usan las ciudades que se
 * hacen sobre ella (`usos`) y la suelta la última que la deja; `liberar` la suelta a la fuerza (una base que
 * no llegó a usar ninguna ciudad).
 */
export interface BaseDeLaCiudad {
  readonly fuente: CiudadParaPintar;
  readonly semilla: number;
  readonly salidas: readonly SalidaDeAvenida[];
  readonly anillo: AnilloDeLaCiudad;
  readonly atlas: AtlasDeGlifos;
  readonly partes: PartesDeLaCiudad;
  readonly lejos: GeometriaDeLoLejano;
  readonly suelo: SueloDeLaCiudad;
  readonly borde: { readonly geometria: THREE.BufferGeometry; readonly triangulos: number };
  readonly texturaAlturas: THREE.DataTexture;
  readonly texturaOclusion: THREE.DataTexture;
  readonly cajaDeLosMapas: THREE.Vector4;
  readonly humedad: number;
  readonly hora: string;
  /** Cuántas ciudades se han hecho sobre ella en total (el comprobador: un cambio de nivel no hace otra base). */
  ciudades: number;
  /** Cuántas ciudades vivas la usan. */
  usos: number;
  /** ¿Se soltó ya? */
  readonly liberada: boolean;
  liberar(): void;
}

/** LA BASE de la ciudad de una noche, de una vez (el banco, el comprobador, la primera ciudad). */
export function construirLaBase(fuente: CiudadParaPintar): BaseDeLaCiudad {
  const g = construirLaBaseAPasos(fuente);
  for (;;) {
    const r = g.next();
    if (r.done === true) return r.value;
  }
}

/**
 * LA BASE A PASOS: la misma base, con una pausa entre paso y paso (de 12 ms de PC como mucho, partir la
 * ciudad; lo demás en trozos de 2-5 ms). Quien la construye mientras se juega da un paso por fotograma (ver
 * `relevo.ts`). Hasta el último paso no se crea nada de la GPU que haya que soltar.
 */
export function* construirLaBaseAPasos(fuente: CiudadParaPintar): Generator<void, BaseDeLaCiudad, void> {
  const noche = fuente.noche;
  const mesa = noche.ciudad;
  const semilla = mezclar(hashDeTexto(fuente.codigo), mesa.traza, 0x0c1a);
  const salidas: SalidaDeAvenida[] = salidasDe(mesa);
  const anillo = anilloDeLaCiudad(salidas, semilla);
  yield;
  const partes = partirLaCiudadYa(noche, anillo, salidas, mesa.rotulos.map((r) => r.texto), semilla);
  yield;
  const lejos = yield* geometriaDeLoLejanoAPasos(partes.partes, anillo);
  yield;
  const suelo = construirElSueloDeLaCiudad(noche, partes.partes, anillo);
  const bordeG = geometriaDelBorde(salidas, (s) => mesa.avenidas.some((a) => a.id === 'elevado' && a.eje === s.eje && a.linea === s.linea));
  const alturas = alturasDeLaCiudad(suelo);
  yield;
  const oclusion = yield* oclusionDeLaCiudadAPasos(noche, anillo);
  const texturaAlturas = texturaDeAlturas(alturas);
  const texturaOclusion = texturaDeOclusion(oclusion);
  const atlas = partes.atlas;
  let liberada = false;
  return {
    fuente,
    semilla,
    salidas,
    anillo,
    atlas,
    partes: partes.partes,
    lejos,
    suelo,
    borde: { geometria: bordeG, triangulos: triangulosDe(bordeG) },
    texturaAlturas,
    texturaOclusion,
    cajaDeLosMapas: uniformeDeLaCaja(CAJA_DE_LOS_MAPAS),
    humedad: noche.tiempo === 'aguacero' ? 0.9 : noche.tiempo === 'niebla' ? 0.35 : 0.55,
    hora: `${String(noche.hora.h)}:${noche.hora.m < 10 ? '0' : ''}${String(noche.hora.m)}`,
    ciudades: 0,
    usos: 0,
    get liberada(): boolean {
      return liberada;
    },
    liberar(): void {
      if (liberada) return;
      liberada = true;
      atlas.liberar();
      lejos.geometria.dispose();
      suelo.asfalto.dispose();
      suelo.islas.dispose();
      bordeG.dispose();
      texturaAlturas.dispose();
      texturaOclusion.dispose();
    },
  };
}

/** Las letras de los rótulos y la ciudad partida (el atlas va con ella: sus rótulos lo leen). */
function partirLaCiudadYa(noche: NocheDeLaCiudad, anillo: AnilloDeLaCiudad, salidas: readonly SalidaDeAvenida[], textos: readonly string[], semilla: number): { readonly partes: PartesDeLaCiudad; readonly atlas: AtlasDeGlifos } {
  const atlas = atlasDeGlifos(textos);
  return { partes: partirLaCiudad(noche, anillo, salidas, atlas, semilla), atlas };
}

/* ═══════════════════════════════ LA CIUDAD ABIERTA ═══════════════════════════════ */

/** Un renglón de lo que se pinta, con su objeto. */
export interface PiezaDeLaCiudadAbierta extends RenglonDeLaCiudad {
  readonly objeto: THREE.Object3D;
}

export interface FotogramaDeLaCiudadAbierta {
  readonly ventana: FotogramaDeLaVentana;
  readonly luz: FotogramaDeLaLuz;
}

export interface OpcionesDeLaCiudadAbierta {
  /** Cuántas celdas construidas guarda la ventana (el comprobador, todas). */
  readonly celdasGuardadas?: number;
  /** La base de la noche, hecha antes (otro nivel de la misma noche, o construida a pasos): se usa, no se rehace. */
  readonly base?: BaseDeLaCiudad;
  /**
   * `'propia'` (por omisión): hace su luz. `'despues'`: no la hace, y la recibe al relevar a la ciudad que se
   * pinta (`recibirLaLuz`), que es de la misma noche y tiene su mismo téxel: la HEREDA (ver `losetas.ts`).
   */
  readonly luz?: 'propia' | 'despues';
  /**
   * Con prisa mientras no hay nada pintado (por omisión): el principio de la noche, que tapa la Bajada. Sin
   * ella, la ventana trabaja con sus topes de siempre y la luz con el doble: la ciudad de otro nivel, que se
   * prepara a media noche detrás de la que se pinta (ver `ventana.ts` y `relevo.ts`).
   */
  readonly prisa?: boolean;
  /** Nace callada: no toca ningún uniforme compartido hasta `hablar` (ver la cabecera). */
  readonly callada?: boolean;
}

export interface CiudadAbiertaConstruida {
  readonly grupo: THREE.Group;
  readonly fuente: CiudadParaPintar;
  readonly nivel: NivelDeLaCiudad;
  readonly base: BaseDeLaCiudad;
  readonly partes: PartesDeLaCiudad;
  readonly anillo: AnilloDeLaCiudad;
  readonly ventana: VentanaDeCeldas;
  /** Su luz (lanza si aún espera la que heredará: ver `OpcionesDeLaCiudadAbierta.luz`). */
  readonly luz: LuzPorLosetas;
  /** ¿Tiene ya luz propia o heredada? */
  readonly conLuz: boolean;
  readonly lejos: LoLejano;
  readonly suelo: SueloDeLaCiudad;
  readonly borde: BordeConstruido;
  readonly atlas: AtlasDeGlifos;
  /** Lo que la atmósfera necesita: la semilla, la hora (la luz de la noche) y el tiempo. */
  readonly semilla: number;
  readonly hora: string;
  readonly tiempo: NocheDeLaCiudad['tiempo'];
  /** Las cabezas de farola de la ventana de ahora (para las luces de verdad de N2+). */
  readonly farolas: () => readonly CabezaDeFarola[];
  /**
   * ¿Puede enseñarse ya? Con una ventana entera y, si su luz es suya, con las cuatro losetas del centro ya
   * horneadas (lo de fuera se sigue horneando detrás). La que heredará la luz no espera a ninguna.
   */
  readonly lista: boolean;
  /** ¿Está callada (ver la cabecera)? */
  readonly callada: boolean;
  /** Los renglones de lo que se pinta AHORA (la ventana, con lo que tiene dentro). */
  piezas(): PiezaDeLaCiudadAbierta[];
  /** Monta la ventana y la luz de `(x, z)` de un tirón (al empezar la noche: la Bajada lo tapa). */
  montarYa(x: number, z: number): void;
  /**
   * Por fotograma: la cámara, el tiempo del adorno y el tic (el del tren). Con `trabajar: false` la ventana y
   * la luz se quedan como están (la ciudad que se va, mientras la que viene se prepara: ver `relevo.ts`).
   */
  actualizar(camara: THREE.Camera, tiempo: number, tic: number, trabajar?: boolean): FotogramaDeLaCiudadAbierta;
  /** Deja de estar callada y toma los uniformes compartidos. */
  hablar(): void;
  /** Entrega su luz a la ciudad que la sustituye: desde ahí no es suya y `liberar` no la toca. */
  soltarLaLuz(): LuzPorLosetas;
  /** Recibe y HEREDA la luz de la ciudad a la que sustituye (la misma noche, el mismo téxel). */
  recibirLaLuz(luz: LuzPorLosetas): void;
  /** Cómo subir ya una textura (en el navegador, `renderer.initTexture`): para la luz por losetas. */
  ponerElSubidor(subir: ((t: THREE.Texture) => void) | null): void;
  /** Suelta lo suyo (geometrías, texturas, materiales, su luz si aún es suya) y deja de usar la base. */
  liberar(): void;
}

function pieza(nombre: string, objeto: THREE.Mesh | THREE.InstancedMesh, triangulos?: number): PiezaDeLaCiudadAbierta {
  const t = triangulos ?? triangulosDe(objeto.geometry) * (objeto instanceof THREE.InstancedMesh ? objeto.count : 1);
  return { nombre, objeto, llamadas: 1, triangulos: t, sombra: objeto.castShadow };
}

/** Cuánto más trabaja por fotograma la luz de una ciudad que se prepara a media noche (ver `prisa`). */
export const PRISA_DE_LA_LUZ_A_MEDIA_NOCHE = 2;

/**
 * Cuántas ciudades soltadas de cada nivel guardan sus materiales con sus programas (ver `liberar`): dos, porque
 * la ciudad de un nivel se pinta con su estado y, mientras se prepara la siguiente, con el del nivel de al lado,
 * y con una sola se perdían los de un vecino al volver del otro (medido en el juego, 24-sep).
 */
export const JUEGOS_GUARDADOS_DE_LA_CIUDAD = 2;

/** Cuántas losetas del centro ha de tener la luz propia para que la ciudad pueda enseñarse (ver `lista`). */
export const LOSETAS_PARA_ENSENARSE = 4;

/** El trabajo de la luz de una ciudad que aún no tiene ninguna (espera la que heredará). */
const SIN_LUZ: FotogramaDeLaLuz = { texeles: 0, filas: 0, bytes: 0, cambio: false };


/**
 * CONSTRUYE LA CIUDAD ABIERTA de una noche para un nivel, sobre su base (la hace si no se la dan). No monta la
 * ventana: eso lo hace `montarYa` (o el primer fotograma de `actualizar`), porque depende de dónde esté la cámara.
 */
export function construirLaCiudadAbierta(fuente: CiudadParaPintar, nivel: NivelDeLaCiudad, opciones: OpcionesDeLaCiudadAbierta = {}): CiudadAbiertaConstruida {
  const noche = fuente.noche;
  const detalle = DETALLE_DEL_NIVEL[nivel];
  const baseDada = opciones.base;
  if (baseDada !== undefined && baseDada.fuente !== fuente) throw new Error('la base es de otra ciudad');
  if (baseDada !== undefined && baseDada.liberada) throw new Error('la base ya se soltó');
  const base = baseDada ?? construirLaBase(fuente);
  base.ciudades++;
  base.usos++;
  const { semilla, partes, anillo, atlas } = base;
  const prisa = opciones.prisa !== false;
  let callada = opciones.callada === true;
  const grupo = new THREE.Group();
  grupo.name = `quiebro-ciudad-abierta-n${String(nivel)}`;
  const soltar: (() => void)[] = [];
  const materiales: THREE.Material[] = [];
  const suyo = <M extends THREE.Material>(m: M): M => {
    materiales.push(m);
    return m;
  };

  /* ─── Los materiales: los del barrio, con el fundido del borde de la ventana desde N1 ─── */
  const fachadas = suyo(materialDeFachada(nivel));
  const mobiliario = suyo(materialDelMobiliario());
  if (detalle.fundido) {
    parchear(fachadas, RETOQUE_DEL_FUNDIDO);
    parchear(mobiliario, RETOQUE_DEL_FUNDIDO);
  }
  const emisivo = suyo(materialEmisivo());
  const cristal = suyo(materialDelCristal());
  const neones = suyo(materialDeLosNeones(atlas.textura));
  const familias: Record<Familia, THREE.Material> = { fachadas, mobiliario, emisivo, cristal, neones };

  /* ─── Lo que sigue a la ventana: tarjetas, halos, vapor y (N2+) haces ─── */
  const cap = INSTANCIAS_DE_SALIDA[nivel];
  const tarjetas = new TarjetasDeReflejo([], [], suyo(materialDeLasTarjetas()), cap);
  const halos = mallaDeHalos([], suyo(materialDeLosHalos()), cap);
  const vapor = new Vapor([], detalle.vapor, semilla);
  suyo(vapor.malla.material as THREE.Material);
  const haces = detalle.haces ? crearLosHaces([], Math.ceil(cap / 3)) : null;
  if (haces !== null) suyo(haces.material as THREE.Material);
  soltar.push(() => {
    tarjetas.malla.geometry.dispose();
    halos.geometry.dispose();
    vapor.malla.geometry.dispose();
    haces?.geometry.dispose();
  });
  let farolasDeLaVentana: readonly CabezaDeFarola[] = [];
  const camara = new THREE.Vector3();
  const alCambiar = (_sitio: SitioDeLaVentana, celdas: readonly CeldaConstruida[]): void => {
    const reflejos = celdas.flatMap((c) => c.fuentes.reflejos);
    const tapan = celdas.flatMap((c) => c.tapan);
    tarjetas.poner(reflejos, tapan, camara);
    const deHalos = celdas.flatMap((c) => c.fuentes.halos);
    rellenarInstancias(halos, datosDeLosHalos(deHalos), deHalos.length);
    vapor.poner(celdas.flatMap((c) => c.alcantarillas));
    farolasDeLaVentana = celdas.flatMap((c) => c.fuentes.cabezas);
    if (haces !== null) {
      const cabezas = farolasDeLaVentana.map((c) => ({ ...c, y: c.y - 0.1 }));
      rellenarInstancias(haces, datosDeLosHaces(cabezas), cabezas.length);
    }
  };

  /* ─── La ventana de celdas ─── */
  const ventana = new VentanaDeCeldas({
    partes,
    nivel,
    materiales: familias,
    capacidad: CAPACIDAD_DE_LA_VENTANA[nivel],
    fundido: detalle.fundido,
    alCambiar,
    prisa: prisa ? PRISA_DEL_PRINCIPIO : 1,
    callada,
    ...(opciones.celdasGuardadas !== undefined ? { celdasGuardadas: opciones.celdasGuardadas } : {}),
  });
  grupo.add(ventana.grupo);
  /*
   * Las sombras de la luz principal (N2+) las RECIBE la ventana y las PROYECTA lo lejano: los volúmenes de
   * todos los edificios (unos 12.000 triángulos). La pasada de sombra no pasa por el sombreador de lo lejano
   * (three usa su material de profundidad), así que ahí no se tira lo de dentro de la ventana y los edificios
   * cercanos proyectan su volumen. Con el detalle de la ventana proyectando, la sombra volvía a pintar
   * 140.000 triángulos en N2 y se salía del 50 %; se pierde la sombra de balcones y coches, que de noche,
   * con la luz del cielo tenue, apenas se ve.
   */
  const conSombras = detalle.sombras > 0;
  for (const f of FAMILIAS) ventana.mallas[f].malla.receiveShadow = conSombras && f !== 'neones' && f !== 'emisivo';
  soltar.push(() => ventana.liberar());

  /* ─── Lo lejano, el suelo entero y el borde: mallas suyas sobre geometrías de la base ─── */
  const materialLejos = suyo(materialDeLoLejano(nivel, detalle.fundido));
  const mallaLejos = mallaDeLoLejano(base.lejos.geometria, materialLejos);
  mallaLejos.castShadow = conSombras;
  mallaLejos.receiveShadow = conSombras;
  grupo.add(mallaLejos);
  const lejos: LoLejano = { malla: mallaLejos, triangulos: base.lejos.triangulos, liberar: () => undefined };
  const suelo = base.suelo;
  const asfalto = new THREE.Mesh(suelo.asfalto, suyo(materialDelAsfalto(nivel)));
  asfalto.name = 'quiebro-asfalto';
  const aceras = new THREE.Mesh(suelo.islas, suyo(materialDeLaAcera()));
  aceras.name = 'quiebro-aceras';
  for (const m of [asfalto, aceras]) {
    m.frustumCulled = false;
    m.matrixAutoUpdate = false;
    m.receiveShadow = detalle.sombras > 0;
    grupo.add(m);
  }
  const mallaBorde = mallaDelBorde(base.borde.geometria);
  suyo(mallaBorde.material as THREE.Material);
  grupo.add(mallaBorde);
  const borde: BordeConstruido = { malla: mallaBorde, triangulos: base.borde.triangulos, liberar: () => undefined };

  /* ─── El horizonte y la ciudad lejana ─── */
  const horizonte = crearElHorizonte();
  horizonte.matrixAutoUpdate = false;
  suyo(horizonte.material as THREE.Material);
  const lejana = crearLaCiudadLejana(semilla, CAJAS_LEJANAS_DE_LA_CIUDAD[nivel], LEJANA_DESDE, LEJANA_HASTA);
  suyo(lejana.material as THREE.Material);
  grupo.add(horizonte, lejana);
  soltar.push(() => {
    horizonte.geometry.dispose();
    lejana.geometry.dispose();
  });

  /* ─── Tarjetas, halos, vapor y haces, a la escena ─── */
  grupo.add(tarjetas.malla, halos, vapor.malla);
  if (haces !== null) grupo.add(haces);

  /* ─── El tren del Elevado ─── */
  const t = noche.tren;
  const tren = new Tren({ eje: t.eje, linea: t.linea, desde: t.desde, hasta: t.hasta, alto: t.alto, largo: t.largo, pilares: [], enTic: fuente.trenEn }, mobiliario, emisivo, detalle.sombras > 0);
  for (const m of tren.mallas) grupo.add(m);
  soltar.push(() => tren.liberar());

  /* ─── La luz por losetas: la suya, o la de la ciudad a la que releva, heredada (ver `losetas.ts`) ─── */
  const fuentesDe: FuentesDeUnaCelda = (k) => {
    const hecha = ventana.celdaGuardada(k);
    if (hecha !== undefined) return hecha.fuentes.horneadas;
    const parte = partes.celdas[k];
    return parte === undefined ? [] : fuentesDeLaCeldaAPasos(parte, partes, nivel);
  };
  let luz: LuzPorLosetas | null = opciones.luz === 'despues' ? null : new LuzPorLosetas(fuentesDe, nivel, { callada, prisa: prisa ? PRISA_DE_LA_PRIMERA_LUZ : PRISA_DE_LA_LUZ_A_MEDIA_NOCHE });
  let subidor: ((t: THREE.Texture) => void) | null = null;
  soltar.push(() => {
    luz?.liberar();
    luz = null;
  });

  /* Los uniformes son de todo el programa: se toman al construir y en cada fotograma (ver `construir.ts`). */
  const tomarLosUniformes = (): void => {
    if (callada) return;
    luz?.tomarLosUniformes();
    UNIFORMES_DE_LA_CIUDAD.uAlturas.value = base.texturaAlturas;
    UNIFORMES_DE_LA_CIUDAD.uAlturasCaja.value.copy(base.cajaDeLosMapas);
    UNIFORMES_DE_LA_CIUDAD.uOclusionSuelo.value = base.texturaOclusion;
    UNIFORMES_DE_LA_CIUDAD.uOclusionCaja.value.copy(base.cajaDeLosMapas);
    UNIFORMES_DE_LA_CIUDAD.uHumedad.value = base.humedad;
    ventana.ponerLosUniformes();
  };
  tomarLosUniformes();

  const piezas = (): PiezaDeLaCiudadAbierta[] => {
    const lista: PiezaDeLaCiudadAbierta[] = [];
    const tri = ventana.triangulos();
    for (const f of FAMILIAS) lista.push(pieza(`ventana · ${f}`, ventana.mallas[f].malla, tri[f]));
    lista.push(pieza('lejos', lejos.malla, lejos.triangulos));
    lista.push(pieza('suelo · asfalto', asfalto));
    lista.push(pieza('suelo · aceras', aceras));
    lista.push(pieza('borde', borde.malla, borde.triangulos));
    lista.push(pieza('horizonte', horizonte));
    lista.push(pieza('ciudad lejana', lejana));
    lista.push(pieza('tarjetas de reflejo', tarjetas.malla));
    lista.push(pieza('halos', halos));
    for (const m of tren.mallas) lista.push(pieza(`tren · ${m.name}`, m));
    lista.push(pieza('vapor', vapor.malla));
    if (haces !== null) lista.push(pieza('haces de luz', haces));
    return lista;
  };

  let primera = true;
  let liberada = false;
  /* El fotograma que se devuelve: el mismo objeto cada vez (ver `ventana.ts`). */
  const fotograma: { ventana: FotogramaDeLaVentana; luz: FotogramaDeLaLuz } = { ventana: { escritos: 0, trozoMayor: 0, subidos: 0, cambio: false }, luz: SIN_LUZ };
  return {
    grupo,
    fuente,
    nivel,
    base,
    partes,
    anillo,
    ventana,
    get luz(): LuzPorLosetas {
      if (luz === null) throw new Error('esta ciudad aún espera la luz que heredará');
      return luz;
    },
    get conLuz(): boolean {
      return luz !== null;
    },
    lejos,
    suelo,
    borde,
    atlas,
    semilla,
    hora: base.hora,
    tiempo: noche.tiempo,
    farolas: () => farolasDeLaVentana,
    get lista(): boolean {
      if (ventana.ahora === null) return false;
      return luz === null || luz.lista || luz.primerasVistas >= LOSETAS_PARA_ENSENARSE;
    },
    get callada(): boolean {
      return callada;
    },
    piezas,
    montarYa(x: number, z: number): void {
      camara.set(x, 1.7, z);
      ventana.montarYa(x, z);
      luz?.hornearYa(x, z);
      tomarLosUniformes();
    },
    actualizar(c: THREE.Camera, tiempo: number, tic: number, trabajar = true): FotogramaDeLaCiudadAbierta {
      c.getWorldPosition(camara);
      if (!callada) UNIFORMES_DE_LA_CIUDAD.uTiempo.value = tiempo;
      if (trabajar) {
        /*
         * La ventana va primero (lo que falta se VE) y la luz trabaja con su tope; el fotograma en que la
         * ventana no hace nada, la luz trabaja el doble. Con los dos a la vez un fotograma cuesta lo que suman
         * sus topes (medio milisegundo de PC en N0); turnándose del todo, la luz se quedaba atrás al trote y
         * quien corría se salía de la calle alumbrada.
         */
        const v = ventana.trabajar(camara.x, camara.z);
        const holgura = v.escritos === 0 && v.subidos === 0 ? 2 : 1;
        fotograma.ventana = v;
        fotograma.luz = luz === null ? SIN_LUZ : luz.trabajar(camara.x, camara.z, holgura);
      } else {
        fotograma.ventana = QUIETA;
        fotograma.luz = SIN_LUZ;
      }
      tomarLosUniformes();
      tarjetas.actualizar(camara, primera);
      tren.actualizar(tic);
      /* El horizonte está «en el infinito»: sigue a la cámara en planta. */
      horizonte.position.set(camara.x, 0, camara.z);
      horizonte.updateMatrix();
      primera = false;
      return fotograma;
    },
    hablar(): void {
      if (!callada) return;
      callada = false;
      ventana.callada = false;
      luz?.hablar();
      tomarLosUniformes();
    },
    soltarLaLuz(): LuzPorLosetas {
      const entregada = luz;
      if (entregada === null) throw new Error('esta ciudad no tiene luz que soltar');
      luz = null;
      entregada.subir = null;
      return entregada;
    },
    recibirLaLuz(dada: LuzPorLosetas): void {
      if (luz !== null) throw new Error('esta ciudad ya tiene su luz');
      dada.heredar(fuentesDe, nivel);
      dada.callada = callada;
      dada.subir = subidor;
      luz = dada;
      if (!callada) dada.hablar();
    },
    ponerElSubidor(subir: ((t: THREE.Texture) => void) | null): void {
      subidor = subir;
      if (luz !== null) luz.subir = subir;
    },
    liberar(): void {
      if (liberada) return;
      liberada = true;
      for (const l of soltar) l();
      /*
       * Los materiales no se sueltan: se GUARDAN, con los programas de todos los estados con que se pintaron, para
       * la próxima ciudad de este nivel (ver `guardarLosProgramas`). El atlas de los neones es de esta noche: lo
       * guardado no lo retiene.
       */
      neones.uniforms.uAtlas.value = null;
      guardarLosProgramas(`ciudad-n${String(nivel)}`, materiales, JUEGOS_GUARDADOS_DE_LA_CIUDAD);
      base.usos--;
      if (base.usos <= 0) base.liberar();
    },
  };
}

/** El trabajo de la ventana de una ciudad que no trabaja este fotograma. */
const QUIETA: FotogramaDeLaVentana = { escritos: 0, trozoMayor: 0, subidos: 0, cambio: false };

/** ¿Hereda la ciudad de nivel `a` la luz de la de nivel `de` (la misma noche)? Con el mismo téxel, sí. */
export function heredaLaLuz(de: NivelDeLaCiudad, a: NivelDeLaCiudad): boolean {
  return TEXELES_DE_LA_LUZ_POR_NIVEL[de] === TEXELES_DE_LA_LUZ_POR_NIVEL[a];
}
